/**
 * Tests for the detached transcript watcher process.
 *
 * Covers the filesystem-sync implementation: path translation, append-based
 * JSONL sync, sidecar writes, sentinel detection, PID-death exit, and git commit.
 *
 * @summary Tests for transcript-watcher filesystem-sync implementation
 */

import { EventEmitter } from 'node:events';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import * as net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock node:child_process at module scope so the watcher's execFile calls are
// intercepted without spawning real git processes.
// ---------------------------------------------------------------------------

const execFileCalls: Array<{ cmd: string; args: string[]; cwd: string }> = [];

vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return {
    ...original,
    execFile: (
      cmd: string,
      args: string[],
      opts: { cwd?: string },
      callback: (err: Error | null, stdout: string, stderr: string) => void
    ) => {
      execFileCalls.push({ cmd, args: Array.isArray(args) ? args : [], cwd: (opts as { cwd?: string })?.cwd ?? '' });
      // Use Promise microtask instead of setImmediate so the callback fires
      // naturally during `await loop` without requiring fake-timer advancement.
      Promise.resolve().then(() => callback(null, '', ''));
      return { unref: () => undefined };
    }
  };
});

import {
  buildSidecarMeta,
  connectLogSocket,
  ensureGitignoreEntry,
  isProcessAlive,
  logViaSocket,
  parseArgs,
  removeSentinelFile,
  runSyncLoop,
  sentinelFileExists,
  type TranscriptWatcherArgs,
  translatePath
} from '../../src/bin/transcript-watcher.js';

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

describe('parseArgs', () => {
  it('extracts correct values from process.argv', () => {
    const argv = [
      'node',
      'transcript-watcher.mjs',
      '12345',
      'sess-abc',
      '/tmp/transcript.jsonl',
      'card-42',
      '/tmp/card-repo'
    ];
    const result = parseArgs(argv);

    expect(result).toEqual({
      pid: 12345,
      sessionId: 'sess-abc',
      transcriptPath: '/tmp/transcript.jsonl',
      cardId: 'card-42',
      cardRepoPath: '/tmp/card-repo'
    });
  });
});

// ---------------------------------------------------------------------------
// isProcessAlive
// ---------------------------------------------------------------------------

describe('isProcessAlive', () => {
  it('returns true for the current process PID', () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it('returns false when kill throws ESRCH', () => {
    vi.spyOn(process, 'kill').mockImplementation(() => {
      const err = new Error('kill ESRCH') as NodeJS.ErrnoException;
      err.code = 'ESRCH';
      throw err;
    });

    expect(isProcessAlive(2147483647)).toBe(false);

    vi.restoreAllMocks();
  });

  it('returns true when kill throws EPERM (process exists but not owned)', () => {
    vi.spyOn(process, 'kill').mockImplementation(() => {
      const err = new Error('kill EPERM') as NodeJS.ErrnoException;
      err.code = 'EPERM';
      throw err;
    });

    expect(isProcessAlive(1)).toBe(true);

    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// translatePath
// ---------------------------------------------------------------------------

describe('translatePath', () => {
  const sessionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  it('(a) root session JSONL maps to flat destination', () => {
    const result = translatePath(`${sessionId}.jsonl`, sessionId);
    expect(result).toBe(`${sessionId}.jsonl`);
  });

  it('(b) subagents/agent-{hash}.jsonl maps flat as {uuid}-agent-{hash}.jsonl', () => {
    const result = translatePath(`${sessionId}/subagents/agent-deadbeef.jsonl`, sessionId);
    expect(result).toBe(`${sessionId}-agent-deadbeef.jsonl`);
  });

  it('(b) subagents/agent-acompact-{hash}.jsonl maps flat', () => {
    const result = translatePath(`${sessionId}/subagents/agent-acompact-cafebabe.jsonl`, sessionId);
    expect(result).toBe(`${sessionId}-agent-acompact-cafebabe.jsonl`);
  });

  it('(b) subagents/agent-{hash}.meta.json maps flat', () => {
    const result = translatePath(`${sessionId}/subagents/agent-deadbeef.meta.json`, sessionId);
    expect(result).toBe(`${sessionId}-agent-deadbeef.meta.json`);
  });

  it('(c) sibling session UUID prefix is ignored (prefix filter)', () => {
    const otherSession = 'ffffffff-0000-0000-0000-000000000001';
    expect(translatePath(`${otherSession}.jsonl`, sessionId)).toBeNull();
    expect(translatePath(`${otherSession}/subagents/agent-abc.jsonl`, sessionId)).toBeNull();
  });

  it('(f) tool-results paths return null (not copied)', () => {
    expect(translatePath(`${sessionId}/tool-results/call-abc.txt`, sessionId)).toBeNull();
  });

  it('paths with nested subdirectories inside subagents return null', () => {
    expect(translatePath(`${sessionId}/subagents/nested/file.jsonl`, sessionId)).toBeNull();
  });

  it('unknown session subdirectory returns null', () => {
    expect(translatePath(`${sessionId}/unknown-dir/file.txt`, sessionId)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildSidecarMeta
// ---------------------------------------------------------------------------

describe('buildSidecarMeta', () => {
  const sessionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  it('returns correct metadata for root session file', () => {
    const meta = buildSidecarMeta(`${sessionId}.jsonl`, sessionId, 'card-42');
    expect(meta).toEqual({
      filename: `${sessionId}.jsonl`,
      streamType: 'claude-code-session',
      title: 'Claude session for card-42',
      sessionId
    });
  });

  it('returns correct metadata for subagent file including agentId', () => {
    const destFilename = `${sessionId}-agent-deadbeef.jsonl`;
    const meta = buildSidecarMeta(destFilename, sessionId, 'card-42');
    expect(meta).toEqual({
      filename: destFilename,
      streamType: 'claude-code-session',
      title: 'Subagent transcript for card-42',
      sessionId,
      agentId: 'agent-deadbeef'
    });
  });
});

// ---------------------------------------------------------------------------
// sentinelFileExists
// ---------------------------------------------------------------------------

describe('sentinelFileExists', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `watcher-sentinel-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('detects sentinel file at correct path', async () => {
    const sentinelDir = join(testDir, 'streams', 'claude-code-session');
    mkdirSync(sentinelDir, { recursive: true });
    writeFileSync(join(sentinelDir, 'sess-abc.flush'), '');

    expect(await sentinelFileExists(testDir, 'sess-abc')).toBe(true);
  });

  it('returns false when sentinel file is absent', async () => {
    expect(await sentinelFileExists(testDir, 'sess-missing')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// removeSentinelFile
// ---------------------------------------------------------------------------

describe('removeSentinelFile', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `watcher-remove-sentinel-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('removes sentinel file after detection', async () => {
    const sentinelDir = join(testDir, 'streams', 'claude-code-session');
    mkdirSync(sentinelDir, { recursive: true });
    writeFileSync(join(sentinelDir, 'sess-abc.flush'), '');

    await removeSentinelFile(testDir, 'sess-abc');

    expect(await sentinelFileExists(testDir, 'sess-abc')).toBe(false);
  });

  it('sentinel removal is idempotent (handles ENOENT on unlink)', async () => {
    await expect(removeSentinelFile(testDir, 'nonexistent')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ensureGitignoreEntry
// ---------------------------------------------------------------------------

describe('ensureGitignoreEntry', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `watcher-gitignore-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('(i) creates .gitignore with streams/**/*.flush when file is absent', async () => {
    await ensureGitignoreEntry(testDir);
    const content = readFileSync(join(testDir, '.gitignore'), 'utf-8');
    expect(content).toContain('streams/**/*.flush');
  });

  it('appends entry to existing .gitignore that does not have it', async () => {
    writeFileSync(join(testDir, '.gitignore'), '*.log\n');
    await ensureGitignoreEntry(testDir);
    const content = readFileSync(join(testDir, '.gitignore'), 'utf-8');
    expect(content).toContain('*.log');
    expect(content).toContain('streams/**/*.flush');
  });

  it('does not duplicate the entry if already present', async () => {
    writeFileSync(join(testDir, '.gitignore'), 'streams/**/*.flush\n');
    await ensureGitignoreEntry(testDir);
    const content = readFileSync(join(testDir, '.gitignore'), 'utf-8');
    const occurrences = (content.match(/streams\/\*\*\/\*\.flush/g) ?? []).length;
    expect(occurrences).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// connectLogSocket / logViaSocket
// ---------------------------------------------------------------------------

describe('connectLogSocket', () => {
  it('connects to log socket and logViaSocket sends structured entries', async () => {
    const socketDir = join(tmpdir(), `watcher-socket-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(socketDir, { recursive: true });
    const socketPath = join(socketDir, 'test.sock');

    const receivedMessages: string[] = [];
    const server = net.createServer((conn) => {
      conn.on('data', (data) => {
        receivedMessages.push(data.toString());
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(socketPath, resolve);
    });

    try {
      await connectLogSocket(socketPath);

      logViaSocket('info', 'test message');

      await vi.waitFor(() => {
        expect(receivedMessages.length).toBeGreaterThan(0);
      });
      const parsed = JSON.parse(receivedMessages[0]!.trim()) as unknown;
      expect(parsed).toEqual({
        type: 'log',
        level: 'info',
        message: 'test message'
      });
    } finally {
      server.close();
      rmSync(socketDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// runSyncLoop — unit tests with mocked execFile (intercepted at module scope above)
// ---------------------------------------------------------------------------

describe('runSyncLoop', () => {
  let testDir: string;
  let sourceDir: string;
  let sessionId: string;

  beforeEach(() => {
    sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    testDir = join(tmpdir(), `watcher-sync-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sourceDir = join(testDir, 'source');
    mkdirSync(sourceDir, { recursive: true });

    // Clear captured calls before each test
    execFileCalls.splice(0);

    vi.useFakeTimers();
    vi.spyOn(process, 'kill').mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    rmSync(testDir, { recursive: true, force: true });
  });

  function makeArgs(overrides?: Partial<TranscriptWatcherArgs>): TranscriptWatcherArgs {
    return {
      pid: process.pid,
      sessionId,
      transcriptPath: join(sourceDir, `${sessionId}.jsonl`),
      cardId: 'card-42',
      cardRepoPath: testDir,
      emitter: new EventEmitter(),
      ...overrides
    };
  }

  /**
   * Starts runSyncLoop and waits for the 'ready' event before returning.
   * 'ready' fires after all startup I/O completes and just before setInterval
   * is registered — so fake-timer advancement is safe after this call.
   *
   * Returns { loop } where loop is the runSyncLoop promise. Using a wrapper
   * object prevents Promise.resolve() from unwrapping the inner promise.
   *
   * @param args - Watcher arguments passed to runSyncLoop.
   * @returns Promise resolving to an object with the loop promise once ready.
   */
  function startLoop(args: TranscriptWatcherArgs): Promise<{ loop: Promise<void> }> {
    const readyPromise = new Promise<void>((resolve) => {
      args.emitter!.once('ready', resolve);
    });
    const loop = runSyncLoop(args);
    return readyPromise.then(() => ({ loop }));
  }

  function killPidNow(): void {
    vi.spyOn(process, 'kill').mockImplementation(() => {
      const err = new Error('kill ESRCH') as NodeJS.ErrnoException;
      err.code = 'ESRCH';
      throw err;
    });
  }

  function writeSentinelNow(): void {
    const sentinelDir = join(testDir, 'streams', 'claude-code-session');
    mkdirSync(sentinelDir, { recursive: true });
    writeFileSync(join(sentinelDir, `${sessionId}.flush`), '');
  }

  // (a) root session JSONL write produces matching destination file
  it('(a) source root {uuid}.jsonl → matching flat destination file', async () => {
    writeFileSync(join(sourceDir, `${sessionId}.jsonl`), 'line1\nline2\n');

    const args = makeArgs();
    // Kill PID so the loop exits on first periodic check
    setTimeout(() => killPidNow(), 100);

    const { loop } = await startLoop(args);
    await vi.advanceTimersByTimeAsync(6_000);
    await loop;

    const destDir = join(testDir, 'streams', 'claude-code-session');
    const content = readFileSync(join(destDir, `${sessionId}.jsonl`), 'utf-8');
    expect(content).toBe('line1\nline2\n');
  });

  // (b) subagent JSONL file lands flat as {uuid}-agent-{hash}.jsonl
  it('(b) {uuid}/subagents/agent-{hash}.jsonl → lands flat as {uuid}-agent-{hash}.jsonl', async () => {
    const subagentDir = join(sourceDir, sessionId, 'subagents');
    mkdirSync(subagentDir, { recursive: true });
    writeFileSync(join(subagentDir, 'agent-deadbeef.jsonl'), '{"type":"sub"}\n');

    const args = makeArgs();
    setTimeout(() => killPidNow(), 100);

    const { loop } = await startLoop(args);
    await vi.advanceTimersByTimeAsync(6_000);
    await loop;

    const destDir = join(testDir, 'streams', 'claude-code-session');
    const content = readFileSync(join(destDir, `${sessionId}-agent-deadbeef.jsonl`), 'utf-8');
    expect(content).toBe('{"type":"sub"}\n');
  });

  // (c) sibling session under another UUID → ignored
  it('(c) sibling-session write under another UUID is ignored', async () => {
    const otherSession = 'ffffffff-0000-0000-0000-000000000001';
    writeFileSync(join(sourceDir, `${otherSession}.jsonl`), 'other-session-line\n');
    writeFileSync(join(sourceDir, `${sessionId}.jsonl`), 'my-line\n');

    const args = makeArgs();
    setTimeout(() => killPidNow(), 100);

    const { loop } = await startLoop(args);
    await vi.advanceTimersByTimeAsync(6_000);
    await loop;

    const destDir = join(testDir, 'streams', 'claude-code-session');
    // Other session file must not appear in destination
    const entries = readdirSync(destDir);
    const otherFiles = entries.filter((f) => f.startsWith(otherSession));
    expect(otherFiles).toHaveLength(0);
    // Our session file must be present
    const ownContent = readFileSync(join(destDir, `${sessionId}.jsonl`), 'utf-8');
    expect(ownContent).toBe('my-line\n');
  });

  // (f) tool-results paths are NOT copied
  it('(f) {uuid}/tool-results/{id}.txt is NOT copied', async () => {
    const toolResultsDir = join(sourceDir, sessionId, 'tool-results');
    mkdirSync(toolResultsDir, { recursive: true });
    writeFileSync(join(toolResultsDir, 'call-abc.txt'), 'tool output');

    const args = makeArgs();
    setTimeout(() => killPidNow(), 100);

    const { loop } = await startLoop(args);
    await vi.advanceTimersByTimeAsync(6_000);
    await loop;

    const destDir = join(testDir, 'streams', 'claude-code-session');
    const entries = readdirSync(destDir);
    const toolResultFiles = entries.filter((f) => f.includes('tool-results') || f.endsWith('.txt'));
    expect(toolResultFiles).toHaveLength(0);
  });

  // (g) partial line (no trailing \n) is not appended until newline arrives
  it('(g) partial line without trailing \\n is not copied; destination is line-complete', async () => {
    const srcPath = join(sourceDir, `${sessionId}.jsonl`);
    // Write a complete line followed by a partial line (no newline at end)
    writeFileSync(srcPath, 'complete-line\npartial-no-newline');

    const args = makeArgs();
    setTimeout(() => killPidNow(), 100);

    const { loop } = await startLoop(args);
    await vi.advanceTimersByTimeAsync(6_000);
    await loop;

    const destDir = join(testDir, 'streams', 'claude-code-session');
    const content = readFileSync(join(destDir, `${sessionId}.jsonl`), 'utf-8');
    // Destination must only contain the complete line
    expect(content).toBe('complete-line\n');
    expect(content).not.toContain('partial-no-newline');
  });

  // (d) sentinel flush → final copy pass + git commit with correct message
  it('(d) sentinel flush → final copy pass + git commit "Close session {sessionId}."', async () => {
    writeFileSync(join(sourceDir, `${sessionId}.jsonl`), 'sentinel-line\n');
    writeSentinelNow();

    const args = makeArgs();
    const { loop } = await startLoop(args);
    await vi.advanceTimersByTimeAsync(6_000);
    await loop;

    const gitCommands = execFileCalls.filter((c) => c.cmd === 'git');
    expect(gitCommands.length).toBeGreaterThanOrEqual(2);

    const addCall = gitCommands.find((c) => c.args[0] === 'add');
    expect(addCall).toBeDefined();
    expect(addCall?.args).toContain('streams/claude-code-session/');

    const commitCall = gitCommands.find((c) => c.args[0] === 'commit');
    expect(commitCall).toBeDefined();
    expect(commitCall?.args).toContain(`Close session ${sessionId}.`);
    expect(commitCall?.cwd).toBe(testDir);

    // Verify content was copied in final pass
    const destDir = join(testDir, 'streams', 'claude-code-session');
    const content = readFileSync(join(destDir, `${sessionId}.jsonl`), 'utf-8');
    expect(content).toBe('sentinel-line\n');
  });

  // (e) PID death → same behavior as sentinel (final copy + commit)
  it('(e) PID death → final copy pass + git commit', async () => {
    writeFileSync(join(sourceDir, `${sessionId}.jsonl`), 'pid-death-line\n');

    const args = makeArgs();
    setTimeout(() => killPidNow(), 100);

    const { loop } = await startLoop(args);
    await vi.advanceTimersByTimeAsync(6_000);
    await loop;

    const gitCommands = execFileCalls.filter((c) => c.cmd === 'git');
    expect(gitCommands.length).toBeGreaterThanOrEqual(2);

    const commitCall = gitCommands.find((c) => c.args[0] === 'commit');
    expect(commitCall).toBeDefined();
    expect(commitCall?.args).toContain(`Close session ${sessionId}.`);

    const destDir = join(testDir, 'streams', 'claude-code-session');
    const content = readFileSync(join(destDir, `${sessionId}.jsonl`), 'utf-8');
    expect(content).toBe('pid-death-line\n');
  });

  // (h) sentinel file is removed before git commit (not staged into repo)
  it('(h) sentinel file is removed before git commit', async () => {
    writeFileSync(join(sourceDir, `${sessionId}.jsonl`), 'h-line\n');
    writeSentinelNow();

    const args = makeArgs();
    const { loop } = await startLoop(args);
    await vi.advanceTimersByTimeAsync(6_000);
    await loop;

    // Sentinel must be gone from disk after the loop completes
    expect(await sentinelFileExists(testDir, sessionId)).toBe(false);

    // git add must have been called (loop committed)
    const addCall = execFileCalls.find((c) => c.cmd === 'git' && c.args[0] === 'add');
    expect(addCall).toBeDefined();
  });
});
