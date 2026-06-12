/**
 * Repro for: batch-bound cards after the first stay in `todo`.
 *
 * When two cards bind in the same agent session, the session-scoped O_EXCL
 * de-dupe lock (created when card A bound) causes `acquireLock` to return
 * false for card B's bind, and `spawnAdhocAttribution` returns before spawning
 * adhoc-cleanup — the process that performs the `updateCard(cardId,
 * { status: 'active' })` write and ref registration for card B. Card B is
 * therefore never activated.
 *
 * Uses the REAL `acquireLock` against a real lock file held by a live process
 * (this test process) bound to card A, and asserts the DESIRED behavior: card
 * B's bind still spawns adhoc-cleanup for card B so its status activation
 * happens. This test FAILS against the unfixed code and passes once
 * second-card activation is decoupled from the session-scoped watcher lock.
 *
 * @summary Failing repro: second card bound in a session is never activated
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock only the spawns and the status guard; the lock logic under test
// (acquireLock + the gate in spawnAdhocAttribution) runs for real.
vi.mock('@cards/sdk/bin/process-utils', () => ({
  readCardStatus: vi.fn(),
  isAdhocActivatableStatus: vi.fn(),
  // acquireLock consults this to decide whether the lock owner is alive. The
  // lock is owned by this test process (a live PID), so return true.
  isProcessAlive: vi.fn(() => true)
}));

vi.mock('@cards/sdk/bin/spawn-transcript-watcher', () => ({
  spawnTranscriptWatcher: vi.fn(() => true),
  transcriptWatcherWrapperName: vi.fn(() => 'transcript-watcher')
}));

vi.mock('@cards/sdk/bin/spawn-adhoc-cleanup', () => ({
  spawnAdhocCleanup: vi.fn()
}));

import { isAdhocActivatableStatus, readCardStatus } from '@cards/sdk/bin/process-utils';
import { spawnAdhocCleanup } from '@cards/sdk/bin/spawn-adhoc-cleanup';
import { spawnAdhocAttribution } from '../../src/bin/spawnAdhocAttribution.js';

describe('spawnAdhocAttribution — second card bound in the same session', () => {
  let sessionDir: string;
  let lockPath: string;

  const sessionId = 'sess-shared-parent';
  const agentPid = process.pid; // a genuinely live PID owns the session lock

  beforeEach(async () => {
    sessionDir = await mkdtemp(join(tmpdir(), 'adhoc-sessions-'));
    lockPath = join(sessionDir, `${sessionId}.lock`);

    vi.mocked(readCardStatus).mockResolvedValue('todo');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await rm(sessionDir, { recursive: true, force: true });
  });

  it('activates card B (spawns adhoc-cleanup for B) even when the session lock is held for card A', async () => {
    // Card A already bound in this session: a live process holds the
    // session-scoped lock, recording card A as the bound card.
    await writeFile(lockPath, `${agentPid}\nmain-A`, { flag: 'wx' });

    const logger = { warn: vi.fn(), error: vi.fn() };

    // Card B binds in the same session (e.g. an orchestrator dispatching a
    // second worktree subagent under the same parent session).
    await spawnAdhocAttribution(
      {
        agentPid,
        sessionId,
        transcriptPath: '/tmp/transcript.jsonl',
        cardId: 'main-B',
        cardRepoPath: '/tmp/card-repos/main-B',
        lockPath
      },
      logger
    );

    // DESIRED behavior: card B's status activation must still happen — the
    // adhoc-cleanup spawn (which performs updateCard(cardId, { status:
    // 'active' }) and ref registration) must be issued for card B. Today the
    // session-scoped de-dupe lock short-circuits the whole spawn path, so
    // this assertion fails against the unfixed code.
    expect(spawnAdhocCleanup).toHaveBeenCalledWith(
      agentPid,
      sessionId,
      'main-B',
      '/tmp/card-repos/main-B',
      expect.any(String),
      logger
    );
  });
});
