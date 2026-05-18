/**
 * Tests for the relocated transcript watcher.
 *
 * Covers the pure helpers (path translation, sidecar metadata, sentinel file
 * handling, .gitignore maintenance, process-alive check) with real filesystem
 * operations. End-to-end handler behavior (createWatcher handshake, stop
 * control, sentinel exit, PID-death exit) is exercised via the Phase-4
 * createWatcher tests plus the existing sentinel-coordination integration
 * test in the hooks-runtime package.
 *
 * @summary Regression tests for the SDK-hosted transcript watcher helpers
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// execFileSync is non-configurable on the node:child_process namespace object,
// so it cannot be spied via vi.spyOn — mock the module instead. The Windows
// branch of isProcessAlive calls execFileSync('tasklist', ...).
const mockExecFileSync = vi.fn();
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, execFileSync: (...args: unknown[]) => mockExecFileSync(...args) };
});

import {
  buildSidecarMeta,
  ensureGitignoreEntry,
  isProcessAlive,
  MAX_LIFETIME_MS,
  PERIODIC_CHECK_INTERVAL_MS,
  parseArgs,
  removeSentinelFile,
  sentinelFileExists,
  translatePath
} from '../../src/bin/transcript-watcher.js';

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
    expect(parseArgs(argv)).toEqual({
      pid: 12345,
      sessionId: 'sess-abc',
      transcriptPath: '/tmp/transcript.jsonl',
      cardId: 'card-42',
      cardRepoPath: '/tmp/card-repo'
    });
  });
});

describe('isProcessAlive', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockExecFileSync.mockReset();
  });

  it('returns true for the current process PID', () => {
    // On Windows, exercise the real tasklist mechanism by faking a row that
    // includes the current PID; on POSIX, process.kill(pid, 0) is real.
    if (process.platform === 'win32') {
      mockExecFileSync.mockReturnValue(`node.exe ${process.pid} Console 1 8 K`);
    }
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  // isProcessAlive uses a different real mechanism per platform: `tasklist`
  // on Windows, `process.kill(pid, 0)` on POSIX. Each test exercises the
  // mechanism the production code actually invokes on the host platform.
  const isWindows = process.platform === 'win32';

  it('returns false when the process does not exist', () => {
    if (isWindows) {
      // Windows path: tasklist prints no matching PID row (its "no tasks"
      // message goes to stdout/stderr without the PID).
      mockExecFileSync.mockReturnValue('INFO: No tasks are running which match the specified criteria.');
    } else {
      vi.spyOn(process, 'kill').mockImplementation(() => {
        const err = new Error('kill ESRCH') as NodeJS.ErrnoException;
        err.code = 'ESRCH';
        throw err;
      });
    }
    expect(isProcessAlive(2147483647)).toBe(false);
  });

  it('returns true when the process exists but is not owned by us', () => {
    if (isWindows) {
      // Windows path: tasklist still lists the PID even for processes the
      // current user cannot signal — the PID appears in the output row.
      mockExecFileSync.mockReturnValue('System Idle Process               1 Services                   0          8 K');
    } else {
      vi.spyOn(process, 'kill').mockImplementation(() => {
        const err = new Error('kill EPERM') as NodeJS.ErrnoException;
        err.code = 'EPERM';
        throw err;
      });
    }
    expect(isProcessAlive(1)).toBe(true);
  });
});

describe('translatePath', () => {
  const sessionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  it('root session JSONL maps to flat destination', () => {
    expect(translatePath(`${sessionId}.jsonl`, sessionId)).toBe(`${sessionId}.jsonl`);
  });

  it('subagents/agent-{hash}.jsonl maps flat', () => {
    expect(translatePath(`${sessionId}/subagents/agent-deadbeef.jsonl`, sessionId)).toBe(
      `${sessionId}-agent-deadbeef.jsonl`
    );
  });

  it('subagents/agent-{hash}.meta.json maps flat', () => {
    expect(translatePath(`${sessionId}/subagents/agent-deadbeef.meta.json`, sessionId)).toBe(
      `${sessionId}-agent-deadbeef.meta.json`
    );
  });

  it('sibling session UUID is ignored', () => {
    const other = 'ffffffff-0000-0000-0000-000000000001';
    expect(translatePath(`${other}.jsonl`, sessionId)).toBeNull();
  });

  it('tool-results paths return null', () => {
    expect(translatePath(`${sessionId}/tool-results/call-abc.txt`, sessionId)).toBeNull();
  });

  it('nested subagents subdirectories return null', () => {
    expect(translatePath(`${sessionId}/subagents/nested/file.jsonl`, sessionId)).toBeNull();
  });
});

describe('buildSidecarMeta', () => {
  const sessionId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  it('returns correct metadata for root session file', () => {
    expect(buildSidecarMeta(`${sessionId}.jsonl`, sessionId, 'card-42')).toEqual({
      filename: `${sessionId}.jsonl`,
      streamType: 'claude-code-session',
      title: 'Claude session for card-42',
      sessionId
    });
  });

  it('returns correct metadata for subagent file including agentId', () => {
    const destFilename = `${sessionId}-agent-deadbeef.jsonl`;
    expect(buildSidecarMeta(destFilename, sessionId, 'card-42')).toEqual({
      filename: destFilename,
      streamType: 'claude-code-session',
      title: 'Subagent transcript for card-42',
      sessionId,
      agentId: 'agent-deadbeef'
    });
  });
});

describe('sentinelFileExists / removeSentinelFile / ensureGitignoreEntry', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `tw-helpers-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('detects sentinel file and removes it idempotently', async () => {
    const dir = join(testDir, 'streams', 'claude-code-session');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'sess-abc.flush'), '');
    expect(await sentinelFileExists(testDir, 'sess-abc')).toBe(true);
    await removeSentinelFile(testDir, 'sess-abc');
    expect(await sentinelFileExists(testDir, 'sess-abc')).toBe(false);
    await expect(removeSentinelFile(testDir, 'sess-abc')).resolves.toBeUndefined();
  });

  it('ensureGitignoreEntry creates and dedupes the flush pattern', async () => {
    await ensureGitignoreEntry(testDir);
    const first = readFileSync(join(testDir, '.gitignore'), 'utf-8');
    expect(first).toContain('streams/**/*.flush');
    await ensureGitignoreEntry(testDir);
    const second = readFileSync(join(testDir, '.gitignore'), 'utf-8');
    const occurrences = (second.match(/streams\/\*\*\/\*\.flush/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it('ensureGitignoreEntry preserves existing content when appending', async () => {
    writeFileSync(join(testDir, '.gitignore'), '*.log\n');
    await ensureGitignoreEntry(testDir);
    const content = readFileSync(join(testDir, '.gitignore'), 'utf-8');
    expect(content).toContain('*.log');
    expect(content).toContain('streams/**/*.flush');
  });
});

describe('MAX_LIFETIME_MS / PERIODIC_CHECK_INTERVAL_MS ordering', () => {
  it('MAX_LIFETIME_MS is larger than PERIODIC_CHECK_INTERVAL_MS', () => {
    // Guards against accidental swap of the two constants — a swap would make
    // the watcher exit in ~24ms instead of 24h, or poll every 24h.
    expect(MAX_LIFETIME_MS).toBeGreaterThan(PERIODIC_CHECK_INTERVAL_MS);
  });
});
