/**
 * Integration tests for the transcript watcher filesystem-sync loop.
 *
 * Uses a real temporary git repository as the card repo. Appends lines to the
 * source directory, touches the sentinel file, and asserts the committed HEAD
 * contains the expected files under `streams/claude-code-session/`.
 *
 * git operations run for real — no mocks. The emitter pattern is used to
 * synchronize with the watcher loop without arbitrary timing delays.
 *
 * @summary End-to-end integration tests for transcript-watcher filesystem sync
 */

import { execFile } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runSyncLoop, sentinelFileExists, type TranscriptWatcherArgs } from '../../src/bin/transcript-watcher.js';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Initialises a bare git repo at the given path with an empty initial commit.
 *
 * @param repoPath - Absolute path to the directory to initialise as a git repo.
 */
async function initGitRepo(repoPath: string): Promise<void> {
  await execFileAsync('git', ['init', '-b', 'main', repoPath]);
  await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoPath });
  await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: repoPath });
  await execFileAsync('git', ['config', 'commit.gpgsign', 'false'], { cwd: repoPath });
  // Create an empty initial commit so HEAD exists
  await execFileAsync('git', ['commit', '--allow-empty', '-m', 'init'], { cwd: repoPath });
}

/**
 * Returns the list of files present in the committed HEAD tree of the repo.
 *
 * @param repoPath - Absolute path to the git repository.
 * @returns Array of relative file paths tracked in the current HEAD commit.
 */
async function listHeadFiles(repoPath: string): Promise<string[]> {
  const { stdout } = await execFileAsync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], { cwd: repoPath });
  return stdout
    .trim()
    .split('\n')
    .filter((line) => line.length > 0);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('transcript-watcher integration', () => {
  let cardRepoPath: string;
  let sourceDir: string;
  let sessionId: string;
  let emitter: EventEmitter;

  beforeEach(async () => {
    sessionId = `sess-integ-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const base = join(tmpdir(), `tw-integ-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    cardRepoPath = join(base, 'card-repo');
    sourceDir = join(base, 'source');

    mkdirSync(cardRepoPath, { recursive: true });
    mkdirSync(sourceDir, { recursive: true });

    await initGitRepo(cardRepoPath);

    emitter = new EventEmitter();

    vi.useFakeTimers();
    vi.spyOn(process, 'kill').mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    const base = join(cardRepoPath, '..');
    rmSync(base, { recursive: true, force: true });
  });

  function makeArgs(overrides?: Partial<TranscriptWatcherArgs>): TranscriptWatcherArgs {
    return {
      pid: process.pid,
      sessionId,
      transcriptPath: join(sourceDir, `${sessionId}.jsonl`),
      cardId: 'card-integ',
      cardRepoPath,
      emitter,
      ...overrides
    };
  }

  function writeSentinelNow(): void {
    const sentinelDir = join(cardRepoPath, 'streams', 'claude-code-session');
    mkdirSync(sentinelDir, { recursive: true });
    writeFileSync(join(sentinelDir, `${sessionId}.flush`), '');
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

  // -------------------------------------------------------------------------
  // Full lifecycle: write lines, touch sentinel, assert committed HEAD
  // -------------------------------------------------------------------------
  it('appends lines to source, touches sentinel, asserts committed HEAD contains session files', async () => {
    const srcPath = join(sourceDir, `${sessionId}.jsonl`);
    writeFileSync(srcPath, '{"type":"init"}\n{"type":"message","content":"hello"}\n');

    const args = makeArgs();
    const { loop: loopPromise } = await startLoop(args);

    // Advance past first periodic check to trigger sentinel detection
    writeSentinelNow();
    await vi.advanceTimersByTimeAsync(6_000);

    await loopPromise;

    // Sentinel must be gone
    expect(await sentinelFileExists(cardRepoPath, sessionId)).toBe(false);

    // Assert HEAD contains the session JSONL and its sidecar
    const headFiles = await listHeadFiles(cardRepoPath);
    expect(headFiles).toContain(`streams/claude-code-session/${sessionId}.jsonl`);
    expect(headFiles).toContain(`streams/claude-code-session/${sessionId}.jsonl.meta.json`);

    // Sentinel flush file must NOT be committed
    const flushFiles = headFiles.filter((f) => f.endsWith('.flush'));
    expect(flushFiles).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Subagent transcript lands flat in committed HEAD
  // -------------------------------------------------------------------------
  it('subagent transcript lands flat as {uuid}-agent-{hash}.jsonl in committed HEAD', async () => {
    const subagentDir = join(sourceDir, sessionId, 'subagents');
    mkdirSync(subagentDir, { recursive: true });
    writeFileSync(join(subagentDir, 'agent-cafebabe.jsonl'), '{"type":"sub-init"}\n');

    const args = makeArgs();
    const { loop: loopPromise } = await startLoop(args);

    writeSentinelNow();
    await vi.advanceTimersByTimeAsync(6_000);

    await loopPromise;

    const headFiles = await listHeadFiles(cardRepoPath);
    expect(headFiles).toContain(`streams/claude-code-session/${sessionId}-agent-cafebabe.jsonl`);
  });

  // -------------------------------------------------------------------------
  // PID death triggers commit
  // -------------------------------------------------------------------------
  it('PID death triggers final copy and commit to HEAD', async () => {
    const srcPath = join(sourceDir, `${sessionId}.jsonl`);
    writeFileSync(srcPath, '{"type":"before-death"}\n');

    // Kill PID to trigger exit
    setTimeout(() => {
      vi.spyOn(process, 'kill').mockImplementation(() => {
        const err = new Error('kill ESRCH') as NodeJS.ErrnoException;
        err.code = 'ESRCH';
        throw err;
      });
    }, 100);

    const args = makeArgs();
    const { loop: loopPromise } = await startLoop(args);
    await vi.advanceTimersByTimeAsync(6_000);
    await loopPromise;

    const headFiles = await listHeadFiles(cardRepoPath);
    expect(headFiles).toContain(`streams/claude-code-session/${sessionId}.jsonl`);
  });

  // -------------------------------------------------------------------------
  // Sentinel flush file is not in .gitignore-exempt committed tree
  // -------------------------------------------------------------------------
  it('.gitignore contains streams/**/*.flush after watcher initialises', async () => {
    // Touch sentinel immediately so the loop exits quickly
    writeSentinelNow();

    const args = makeArgs();
    const { loop: loopPromise } = await startLoop(args);
    await vi.advanceTimersByTimeAsync(6_000);
    await loopPromise;

    // .gitignore is written to disk by ensureGitignoreEntry; check disk directly
    const { readFileSync } = await import('node:fs');
    const gitignoreContent = readFileSync(join(cardRepoPath, '.gitignore'), 'utf-8');
    expect(gitignoreContent).toContain('streams/**/*.flush');
  });
});
