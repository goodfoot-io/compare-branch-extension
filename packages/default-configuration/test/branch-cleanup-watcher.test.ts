import type { ChildProcess } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import type { ActionContext } from '@cards.management/sdk/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for the detached branch-cleanup watcher: the parent-side spawn helper
 * (`spawnBranchCleanupWatcher`) and the detached entry point
 * (`runDetachedCleanup`).
 *
 * Covers the observability gaps this card closes: every step between "spawn
 * attempted" and "cleanup confirmed done or failed" must land a log line,
 * including the previously-silent stdin-timeout and JSON-parse-failure paths.
 * One test reads an actual temp log file back (rather than only spying on the
 * `Logger` instance) to confirm the `CARDS_HOOKS_LOG_FILE` env-plumbing
 * actually produces a queryable trail, not just calls a mock.
 *
 * @summary Tests for the branch-cleanup watcher's spawn and detached-entry-point paths
 */

vi.mock('node:child_process', () => ({
  spawn: vi.fn()
}));

vi.mock('@cards.management/sdk/client/discovery', () => ({
  createCardsClient: vi.fn()
}));

vi.mock('../src/lib/claude-session.js', () => ({
  cleanupMergedBranches: vi.fn(),
  errorMessage: (error: unknown) => (error instanceof Error ? error.message : String(error))
}));

// Wraps the real `resolveLogFilePath` in a spy (default behavior unchanged) so
// individual tests can force its "file logging disabled" (`null`) return via
// `mockReturnValueOnce` without disturbing the real `Logger` class, which
// `runDetachedCleanup`'s tests below rely on for actual file output.
vi.mock('@cards.management/sdk/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards.management/sdk/config')>();
  return { ...actual, resolveLogFilePath: vi.fn(actual.resolveLogFilePath) };
});

/**
 * Builds a fake logger conforming to `ActionContext['logger']` with spy-able
 * methods, for tests that only need to assert calls (not real file output).
 * @returns A logger whose methods are `vi.fn()` spies.
 */
function createSpyLogger(): ActionContext['logger'] {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn()
  };
}

/**
 * Builds a fake `ChildProcess` with an event-emitting `stdin` and `.on`/`.unref`
 * spies, matching the shape `spawnBranchCleanupWatcher` interacts with.
 * @param overrides - Partial `ChildProcess` fields to override the defaults with.
 * @returns A fake `ChildProcess` with a working `emit`/`on` pair for both itself and its `stdin`.
 */
function createMockChild(overrides?: Partial<ChildProcess>): ChildProcess {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const stdinHandlers = new Map<string, (...args: unknown[]) => void>();
  return {
    pid: 54321,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers.set(event, cb);
    }),
    emit(event: string, ...args: unknown[]) {
      handlers.get(event)?.(...args);
      return true;
    },
    stdin: {
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        stdinHandlers.set(event, cb);
      }),
      write: vi.fn(),
      end: vi.fn(),
      emit(event: string, ...args: unknown[]) {
        stdinHandlers.get(event)?.(...args);
        return true;
      }
    },
    unref: vi.fn(),
    ...overrides
  } as unknown as ChildProcess;
}

/**
 * Reads back a JSON-Lines log file written by the real `Logger` and parses
 * each line, for tests asserting on-disk content rather than mock calls.
 *
 * @param logFilePath - Absolute path to the log file.
 * @returns Parsed log events, one per line.
 */
async function readLogEvents(logFilePath: string): Promise<Array<{ message: string; [key: string]: unknown }>> {
  const content = await fs.readFile(logFilePath, 'utf-8');
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as { message: string; [key: string]: unknown });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('spawnBranchCleanupWatcher', () => {
  const baseParams = {
    cardId: 'card-123',
    repoRoot: '/test/workspace',
    cardRepoPath: '/test/repo',
    sessionId: 'session-abc'
  };

  afterEach(() => {
    vi.useRealTimers();
    delete process.env['CARDS_LOG_DIR'];
  });

  it('derives CARDS_HOOKS_LOG_FILE via the same resolveLogFilePath the parent logger uses', async () => {
    const { spawn } = await import('node:child_process');
    const { spawnBranchCleanupWatcher } = await import('../src/lib/branch-cleanup-watcher.js');
    const { resolveLogFilePath } = await import('@cards.management/sdk/config');

    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const logger = createSpyLogger();
    const promise = spawnBranchCleanupWatcher(baseParams, logger);
    child.emit('exit', 0, null);
    await promise;

    expect(spawn).toHaveBeenCalledTimes(1);
    const spawnOpts = vi.mocked(spawn).mock.calls[0]![2] as { env: Record<string, string> };
    // Asserting parity against the actual resolveLogFilePath() output (rather
    // than a hardcoded path) is the regression guard: if the implementation
    // ever reverts to recomputing its own path, this stops matching.
    expect(spawnOpts.env['CARDS_HOOKS_LOG_FILE']).toBe(
      resolveLogFilePath({ subsystem: 'cards-default-configuration-hooks' })
    );
  });

  it('honors a CARDS_LOG_DIR override, so parent and child agree on the same log file', async () => {
    // Same harness caveat as above: CARDS_HOOKS_LOG_FILE (tier 2) outranks
    // CARDS_LOG_DIR (tier 3) in resolveLogFilePath()'s precedence, and the
    // vitest harness sets CARDS_HOOKS_LOG_FILE globally, so it must be
    // cleared to actually exercise the CARDS_LOG_DIR tier.
    const originalEnvValue = process.env['CARDS_HOOKS_LOG_FILE'];
    delete process.env['CARDS_HOOKS_LOG_FILE'];
    const tmpLogDir = await fs.mkdtemp(path.join(os.tmpdir(), 'branch-cleanup-log-dir-'));
    process.env['CARDS_LOG_DIR'] = tmpLogDir;

    try {
      const { spawn } = await import('node:child_process');
      const { spawnBranchCleanupWatcher } = await import('../src/lib/branch-cleanup-watcher.js');

      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const logger = createSpyLogger();
      const promise = spawnBranchCleanupWatcher(baseParams, logger);
      child.emit('exit', 0, null);
      await promise;

      const spawnOpts = vi.mocked(spawn).mock.calls[0]![2] as { env: Record<string, string> };
      expect(spawnOpts.env['CARDS_HOOKS_LOG_FILE']).toBe(path.join(tmpLogDir, 'cards-default-configuration-hooks.log'));
    } finally {
      if (originalEnvValue !== undefined) {
        process.env['CARDS_HOOKS_LOG_FILE'] = originalEnvValue;
      }
    }
  });

  it('omits CARDS_HOOKS_LOG_FILE from the child env when resolveLogFilePath returns null', async () => {
    // The vitest harness itself sets CARDS_HOOKS_LOG_FILE=/dev/null on
    // process.env for every test in this suite (see vitest.config.ts), so it
    // must be cleared here too — otherwise the child would inherit it from
    // `...process.env` even though the (mocked) resolution says file logging
    // is disabled, masking the behavior this test exists to check.
    const originalEnvValue = process.env['CARDS_HOOKS_LOG_FILE'];
    delete process.env['CARDS_HOOKS_LOG_FILE'];
    try {
      const { spawn } = await import('node:child_process');
      const { resolveLogFilePath } = await import('@cards.management/sdk/config');
      vi.mocked(resolveLogFilePath).mockReturnValueOnce(null);
      const { spawnBranchCleanupWatcher } = await import('../src/lib/branch-cleanup-watcher.js');

      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const logger = createSpyLogger();
      const promise = spawnBranchCleanupWatcher(baseParams, logger);
      child.emit('exit', 0, null);
      await promise;

      const spawnOpts = vi.mocked(spawn).mock.calls[0]![2] as { env: Record<string, string> };
      expect(spawnOpts.env['CARDS_HOOKS_LOG_FILE']).toBeUndefined();
    } finally {
      if (originalEnvValue !== undefined) {
        process.env['CARDS_HOOKS_LOG_FILE'] = originalEnvValue;
      }
    }
  });

  it('logs pid on successful spawn', async () => {
    const { spawn } = await import('node:child_process');
    const { spawnBranchCleanupWatcher } = await import('../src/lib/branch-cleanup-watcher.js');

    const child = createMockChild({ pid: 999 });
    vi.mocked(spawn).mockReturnValue(child);

    const logger = createSpyLogger();
    const promise = spawnBranchCleanupWatcher(baseParams, logger);
    child.emit('exit', 0, null);
    await promise;

    expect(logger.info).toHaveBeenCalledWith(
      'Branch-cleanup watcher spawned',
      expect.objectContaining({ pid: 999, cardId: 'card-123', sessionId: 'session-abc' })
    );
  });

  it('logs an error when spawn() throws, and does not touch stdin', async () => {
    const { spawn } = await import('node:child_process');
    const { spawnBranchCleanupWatcher } = await import('../src/lib/branch-cleanup-watcher.js');

    vi.mocked(spawn).mockImplementation(() => {
      throw new Error('EMFILE: too many open files');
    });

    const logger = createSpyLogger();
    await expect(spawnBranchCleanupWatcher(baseParams, logger)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'Branch-cleanup watcher failed to spawn',
      expect.objectContaining({
        error: 'EMFILE: too many open files',
        cardId: 'card-123',
        sessionId: 'session-abc'
      })
    );
  });

  it('logs when the spawned child emits exit', async () => {
    const { spawn } = await import('node:child_process');
    const { spawnBranchCleanupWatcher } = await import('../src/lib/branch-cleanup-watcher.js');

    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const logger = createSpyLogger();
    const promise = spawnBranchCleanupWatcher(baseParams, logger);

    (child as unknown as { emit: (event: string, ...args: unknown[]) => void }).emit('exit', 0, null);
    await promise;

    expect(logger.info).toHaveBeenCalledWith(
      'Branch-cleanup watcher process exited',
      expect.objectContaining({ pid: child.pid, code: 0, signal: null, cardId: 'card-123', sessionId: 'session-abc' })
    );
  });

  it('warns (not throws) on a stdin pipe error', async () => {
    const { spawn } = await import('node:child_process');
    const { spawnBranchCleanupWatcher } = await import('../src/lib/branch-cleanup-watcher.js');

    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const logger = createSpyLogger();
    const promise = spawnBranchCleanupWatcher(baseParams, logger);

    (child.stdin as unknown as { emit: (event: string, ...args: unknown[]) => void }).emit('error', new Error('EPIPE'));
    child.emit('exit', 0, null);
    await promise;

    expect(logger.warn).toHaveBeenCalledWith(
      'Branch-cleanup watcher stdin pipe error',
      expect.objectContaining({ error: 'EPIPE', cardId: 'card-123', sessionId: 'session-abc' })
    );
  });

  it('resolves via the child exit event without waiting for the grace-period timer', async () => {
    vi.useFakeTimers();
    const { spawn } = await import('node:child_process');
    const { spawnBranchCleanupWatcher } = await import('../src/lib/branch-cleanup-watcher.js');

    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const logger = createSpyLogger();
    const promise = spawnBranchCleanupWatcher(baseParams, logger);
    child.emit('exit', 0, null);

    // The promise must resolve purely from the exit event — the fake timer is
    // never advanced, so this would hang (and fail on the suite's timeout) if
    // the race were implemented as "always wait out the grace period."
    await expect(promise).resolves.toBeUndefined();
  });

  it('resolves via the grace-period timer when the child never exits', async () => {
    vi.useFakeTimers();
    const { spawn } = await import('node:child_process');
    const { spawnBranchCleanupWatcher } = await import('../src/lib/branch-cleanup-watcher.js');

    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const logger = createSpyLogger();
    let resolved = false;
    const promise = spawnBranchCleanupWatcher(baseParams, logger).then(() => {
      resolved = true;
    });

    // EXIT_GRACE_MS is 500ms; confirm the race is still pending just short of
    // it, then resolves once the grace period elapses.
    await vi.advanceTimersByTimeAsync(499);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);

    await promise;
  });
});

describe('runDetachedCleanup', () => {
  let logFilePath: string;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    logFilePath = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'branch-cleanup-watcher-test-')), 'hooks.log');
    process.env['CARDS_HOOKS_LOG_FILE'] = logFilePath;
    // The timeout/parse-failure paths call process.exit(1) directly (by
    // design — they must not wait on anything else). Stub it so the test
    // process survives; the function still resolves its promise with the
    // correct code before the exit call.
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    delete process.env['CARDS_HOOKS_LOG_FILE'];
    exitSpy.mockRestore();
    vi.useRealTimers();
  });

  it('returns 0 and logs a full success trail, readable back from the log file', async () => {
    const { createCardsClient } = await import('@cards.management/sdk/client/discovery');
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { runDetachedCleanup } = await import('../src/lib/branch-cleanup-watcher.js');

    vi.mocked(createCardsClient).mockResolvedValue({} as never);
    vi.mocked(cleanupMergedBranches).mockResolvedValue(undefined);

    const stdin = new Readable({ read() {} });
    const resultPromise = runDetachedCleanup(stdin);
    stdin.push(JSON.stringify({ cardId: 'card-123', repoRoot: '/test/workspace', cardRepoPath: '/test/repo' }));
    stdin.push(null);

    const result = await resultPromise;
    expect(result).toBe(0);
    expect(cleanupMergedBranches).toHaveBeenCalledWith(
      { cardId: 'card-123', repoRoot: '/test/workspace' },
      '/test/repo',
      expect.anything(),
      undefined
    );

    const events = await readLogEvents(logFilePath);
    expect(events.map((e) => e.message)).toEqual(
      expect.arrayContaining([
        'Branch-cleanup watcher process started',
        'Branch-cleanup watcher started',
        'Branch-cleanup watcher completed successfully'
      ])
    );
  });

  it('logs a parse failure and returns 1 when stdin ends with invalid JSON', async () => {
    const { runDetachedCleanup } = await import('../src/lib/branch-cleanup-watcher.js');

    const stdin = new Readable({ read() {} });
    const resultPromise = runDetachedCleanup(stdin);
    stdin.push('not valid json{{{');
    stdin.push(null);

    const result = await resultPromise;
    expect(result).toBe(1);
    expect(exitSpy).toHaveBeenCalledWith(1);

    const events = await readLogEvents(logFilePath);
    const messages = events.map((e) => e.message);
    expect(messages).toContain('Branch-cleanup watcher process started');
    expect(messages).toContain('Branch-cleanup watcher failed to parse stdin params');
  });

  it('logs a timeout and returns 1 when stdin never ends', async () => {
    vi.useFakeTimers();
    const { runDetachedCleanup } = await import('../src/lib/branch-cleanup-watcher.js');

    const stdin = new Readable({ read() {} });
    const resultPromise = runDetachedCleanup(stdin);

    await vi.advanceTimersByTimeAsync(10_000);

    const result = await resultPromise;
    expect(result).toBe(1);
    expect(exitSpy).toHaveBeenCalledWith(1);

    const events = await readLogEvents(logFilePath);
    const messages = events.map((e) => e.message);
    expect(messages).toContain('Branch-cleanup watcher process started');
    expect(messages).toContain('Branch-cleanup watcher timed out waiting for stdin params');
  });

  it('logs failure and returns 1 when cleanupMergedBranches rejects', async () => {
    const { createCardsClient } = await import('@cards.management/sdk/client/discovery');
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { runDetachedCleanup } = await import('../src/lib/branch-cleanup-watcher.js');

    vi.mocked(createCardsClient).mockResolvedValue({} as never);
    vi.mocked(cleanupMergedBranches).mockRejectedValue(new Error('git worktree remove failed'));

    const stdin = new Readable({ read() {} });
    const resultPromise = runDetachedCleanup(stdin);
    stdin.push(
      JSON.stringify({ cardId: 'card-123', repoRoot: '/test/workspace', cardRepoPath: '/test/repo', sessionId: 's1' })
    );
    stdin.push(null);

    const result = await resultPromise;
    expect(result).toBe(1);

    const events = await readLogEvents(logFilePath);
    const failure = events.find((e) => e.message === 'Branch-cleanup watcher failed');
    expect(failure).toMatchObject({
      context: { error: 'git worktree remove failed', cardId: 'card-123', sessionId: 's1' }
    });
  });
});
