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
 * cleanupSessionArtifacts is also covered here: all three removeSession*
 * functions are invoked on completion, and a failure in one does not prevent
 * the others from running or throw out of the cleanup path.
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

// Mock @cards/sessions/card-repo so the cleanup tests remain unit-level and
// do not touch the real ~/.cards/card-repo-commits directory.
const mockRemoveSessionHeadSha = vi.fn<(sessionId: string) => void>();
const mockRemoveSessionCsv = vi.fn<(sessionId: string) => void>();
const mockRemoveSessionRouteNudge = vi.fn<(sessionId: string) => void>();
vi.mock('@cards/sessions/card-repo', () => ({
  removeSessionHeadSha: (sessionId: string) => mockRemoveSessionHeadSha(sessionId),
  removeSessionCsv: (sessionId: string) => mockRemoveSessionCsv(sessionId),
  removeSessionRouteNudge: (sessionId: string) => mockRemoveSessionRouteNudge(sessionId),
  // Pass-through for any other exports used by the module under test.
  appendCommitToSession: vi.fn(),
  getSessionCommits: vi.fn(() => []),
  readSessionHeadSha: vi.fn(() => null),
  writeSessionHeadSha: vi.fn(),
  markSessionRouteNudgeFired: vi.fn(),
  hasSessionRouteNudgeFired: vi.fn(() => false)
}));

import {
  buildSidecarMeta,
  cleanupSessionArtifacts,
  ensureGitignoreEntry,
  isProcessAlive,
  MAX_LIFETIME_MS,
  PERIODIC_CHECK_INTERVAL_MS,
  parseArgs,
  removeSentinelFile,
  runWatcherLoop,
  sentinelFileExists,
  translatePath,
  WATCHER_INSTALL_RETRY_INTERVAL_MS
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

describe('cleanupSessionArtifacts', () => {
  const SESSION_ID = 'cleanup-test-session-id';

  beforeEach(() => {
    mockRemoveSessionHeadSha.mockReset();
    mockRemoveSessionCsv.mockReset();
    mockRemoveSessionRouteNudge.mockReset();
  });

  it('invokes all three removeSession* functions with the session id', async () => {
    const warnings: string[] = [];
    await cleanupSessionArtifacts(SESSION_ID, (msg) => warnings.push(msg));

    expect(mockRemoveSessionHeadSha).toHaveBeenCalledOnce();
    expect(mockRemoveSessionHeadSha).toHaveBeenCalledWith(SESSION_ID);
    expect(mockRemoveSessionCsv).toHaveBeenCalledOnce();
    expect(mockRemoveSessionCsv).toHaveBeenCalledWith(SESSION_ID);
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledOnce();
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledWith(SESSION_ID);
    expect(warnings).toHaveLength(0);
  });

  it('continues and calls remaining removals when one throws', async () => {
    const boom = new Error('disk full');
    mockRemoveSessionHeadSha.mockImplementation(() => {
      throw boom;
    });

    const warnings: string[] = [];
    // Must not throw even though removeSessionHeadSha throws.
    await expect(cleanupSessionArtifacts(SESSION_ID, (msg) => warnings.push(msg))).resolves.toBeUndefined();

    // The failing call is warned, the other two still fire.
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('removeSessionHeadSha');
    expect(mockRemoveSessionCsv).toHaveBeenCalledOnce();
    expect(mockRemoveSessionCsv).toHaveBeenCalledWith(SESSION_ID);
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledOnce();
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledWith(SESSION_ID);
  });

  it('warns for each individual failure independently', async () => {
    const err1 = new Error('head-sha error');
    const err2 = new Error('csv error');
    mockRemoveSessionHeadSha.mockImplementation(() => {
      throw err1;
    });
    mockRemoveSessionCsv.mockImplementation(() => {
      throw err2;
    });

    const warnings: string[] = [];
    await expect(cleanupSessionArtifacts(SESSION_ID, (msg) => warnings.push(msg))).resolves.toBeUndefined();

    // Two warnings, one per failing call; the third still fires.
    expect(warnings).toHaveLength(2);
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledOnce();
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledWith(SESSION_ID);
  });
});

describe('runWatcherLoop — cleanup gate wiring', () => {
  interface DepsOverrides {
    signal?: { stopped: boolean };
    checkSentinel?: () => Promise<boolean>;
    checkAlive?: () => boolean;
    onTick?: () => Promise<number>;
    onMaxLifetime?: () => void;
    maxLifetimeMs?: number;
  }

  // Builds a WatcherLoopDeps where the clock starts at 0 and each call to
  // `sleep` advances it by the sleep duration. `checkSentinel` and `checkAlive`
  // default to "session still running" so individual tests can override them to
  // trigger a specific exit path. `onTick`/`onMaxLifetime` carry the same
  // injection points main() uses (fsWatcher install cadence, max-lifetime warn).
  function makeDeps(overrides: DepsOverrides = {}) {
    let clock = 0;
    const signal = overrides.signal ?? { stopped: false };
    return {
      signal,
      checkSentinel: overrides.checkSentinel ?? (() => Promise.resolve(false)),
      checkAlive: overrides.checkAlive ?? (() => true),
      now: () => clock,
      sleep: (ms: number): Promise<void> => {
        clock += ms;
        return Promise.resolve();
      },
      onTick: overrides.onTick,
      onMaxLifetime: overrides.onMaxLifetime,
      maxLifetimeMs: overrides.maxLifetimeMs ?? MAX_LIFETIME_MS
    };
  }

  it('returns maxLifetimeExceeded=true when the loop exits via the max-lifetime timeout', async () => {
    // One tick: sentinel=false, alive=true, then clock advances past the limit.
    // maxLifetimeMs=0 so any sleep immediately exceeds the limit.
    const deps = makeDeps({ maxLifetimeMs: 0 });
    const result = await runWatcherLoop(deps);
    expect(result.maxLifetimeExceeded).toBe(true);
    expect(result.stopRequested).toBe(false);
  });

  it('returns maxLifetimeExceeded=false when the loop exits because the process died', async () => {
    // checkAlive returns false immediately — process-death exit.
    const deps = makeDeps({ checkAlive: () => false });
    const result = await runWatcherLoop(deps);
    expect(result.maxLifetimeExceeded).toBe(false);
    expect(result.stopRequested).toBe(false);
  });

  it('returns stopRequested=true and maxLifetimeExceeded=false when the loop exits via the stop-control path', async () => {
    // Set signal.stopped=true before the loop even checks — simulates the
    // stop-control handler firing before the first iteration.
    const signal = { stopped: true };
    const deps = makeDeps({ signal });
    const result = await runWatcherLoop(deps);
    expect(result.stopRequested).toBe(true);
    expect(result.maxLifetimeExceeded).toBe(false);
  });

  it('cleanup is skipped (mocks not called) when maxLifetimeExceeded is true', async () => {
    mockRemoveSessionHeadSha.mockReset();
    mockRemoveSessionCsv.mockReset();
    mockRemoveSessionRouteNudge.mockReset();

    const deps = makeDeps({ maxLifetimeMs: 0 });
    const { maxLifetimeExceeded } = await runWatcherLoop(deps);

    // Caller (main) guards cleanup with this flag — verify the guard works.
    if (!maxLifetimeExceeded) {
      await cleanupSessionArtifacts('sess', () => {});
    }

    expect(mockRemoveSessionHeadSha).not.toHaveBeenCalled();
    expect(mockRemoveSessionCsv).not.toHaveBeenCalled();
    expect(mockRemoveSessionRouteNudge).not.toHaveBeenCalled();
  });

  it('cleanup runs when the loop exits via the process-death path', async () => {
    mockRemoveSessionHeadSha.mockReset();
    mockRemoveSessionCsv.mockReset();
    mockRemoveSessionRouteNudge.mockReset();

    const deps = makeDeps({ checkAlive: () => false });
    const { maxLifetimeExceeded } = await runWatcherLoop(deps);

    if (!maxLifetimeExceeded) {
      await cleanupSessionArtifacts('sess', () => {});
    }

    expect(mockRemoveSessionHeadSha).toHaveBeenCalledOnce();
    expect(mockRemoveSessionCsv).toHaveBeenCalledOnce();
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledOnce();
  });

  it('cleanup runs when the loop exits via the stop-control path', async () => {
    mockRemoveSessionHeadSha.mockReset();
    mockRemoveSessionCsv.mockReset();
    mockRemoveSessionRouteNudge.mockReset();

    const signal = { stopped: true };
    const deps = makeDeps({ signal });
    const { maxLifetimeExceeded } = await runWatcherLoop(deps);

    if (!maxLifetimeExceeded) {
      await cleanupSessionArtifacts('sess', () => {});
    }

    expect(mockRemoveSessionHeadSha).toHaveBeenCalledOnce();
    expect(mockRemoveSessionCsv).toHaveBeenCalledOnce();
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledOnce();
  });

  it('runs onTick each surviving iteration and sleeps the interval it returns', async () => {
    // Mirrors main()'s install-retry cadence: onTick reports the fast retry
    // interval until the (simulated) watcher attaches, then the periodic one.
    // The liveness check counts iterations and reports dead on the third, so
    // the loop survives two full iterations (each reaching onTick + sleep).
    let aliveChecks = 0;
    let ticks = 0;
    const sleepCalls: number[] = [];
    let clock = 0;
    const result = await runWatcherLoop({
      signal: { stopped: false },
      checkSentinel: () => Promise.resolve(false),
      checkAlive: () => {
        aliveChecks += 1;
        return aliveChecks < 3;
      },
      now: () => clock,
      sleep: (ms: number): Promise<void> => {
        sleepCalls.push(ms);
        clock += ms;
        return Promise.resolve();
      },
      onTick: () => {
        ticks += 1;
        // First tick: not yet installed → fast retry; afterwards: periodic.
        return Promise.resolve(ticks === 1 ? WATCHER_INSTALL_RETRY_INTERVAL_MS : PERIODIC_CHECK_INTERVAL_MS);
      }
    });

    // onTick ran on the two surviving iterations; the third broke at the
    // liveness check before reaching onTick. Sleep used the interval onTick
    // returned each time — fast retry first, then periodic.
    expect(ticks).toBe(2);
    expect(sleepCalls).toEqual([WATCHER_INSTALL_RETRY_INTERVAL_MS, PERIODIC_CHECK_INTERVAL_MS]);
    expect(result.maxLifetimeExceeded).toBe(false);
    expect(result.stopRequested).toBe(false);
  });

  it('invokes onMaxLifetime exactly once on the timeout exit and not on other exits', async () => {
    const timedOut = vi.fn();
    const timeoutResult = await runWatcherLoop(makeDeps({ maxLifetimeMs: 0, onMaxLifetime: timedOut }));
    expect(timeoutResult.maxLifetimeExceeded).toBe(true);
    expect(timedOut).toHaveBeenCalledOnce();

    const notTimedOut = vi.fn();
    const deathResult = await runWatcherLoop(makeDeps({ checkAlive: () => false, onMaxLifetime: notTimedOut }));
    expect(deathResult.maxLifetimeExceeded).toBe(false);
    expect(notTimedOut).not.toHaveBeenCalled();
  });
});
