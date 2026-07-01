/**
 * Reproduction tests for the spawnAdhocAttribution outcome contract.
 *
 * Callers (e.g. `card <id> bind`) must be able to distinguish a successful
 * activation from a skipped one. A non-activatable card status is the only
 * skip; a held session de-dupe lock de-dupes only the transcript-watcher and
 * still activates the card.
 *
 * @summary Outcome-contract reproduction tests for spawnAdhocAttribution
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

// ─── Module mocks ────────────────────────────────────────────────────────────
// Same collaborator mocks as spawnAdhocAttribution.test.ts; vitest hoists
// vi.mock calls above imports automatically.

vi.mock('@cards.management/sdk/bin/process-utils', () => ({
  readCardStatus: vi.fn(),
  isAdhocActivatableStatus: vi.fn()
}));

vi.mock('@cards.management/sdk/adhoc-attribution', () => ({
  acquireLock: vi.fn()
}));

vi.mock('@cards.management/sdk/bin/spawn-transcript-watcher', () => ({
  spawnTranscriptWatcher: vi.fn(),
  transcriptWatcherWrapperName: vi.fn(() => 'transcript-watcher')
}));

vi.mock('@cards.management/sdk/bin/spawn-adhoc-cleanup', () => ({
  spawnAdhocCleanup: vi.fn()
}));

import { acquireLock } from '@cards.management/sdk/adhoc-attribution';
import { isAdhocActivatableStatus, readCardStatus } from '@cards.management/sdk/bin/process-utils';
import { spawnTranscriptWatcher } from '@cards.management/sdk/bin/spawn-transcript-watcher';
import { type SpawnAdhocAttributionParams, spawnAdhocAttribution } from '../../src/bin/spawnAdhocAttribution.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeParams(overrides: Partial<SpawnAdhocAttributionParams> = {}): SpawnAdhocAttributionParams {
  return {
    agentPid: 42000,
    sessionId: 'sess-abc-123',
    transcriptPath: '/tmp/transcript.jsonl',
    cardId: 'main-99',
    cardRepoPath: '/tmp/card-repos/main-99',
    lockPath: '/tmp/adhoc-sessions/sess-abc-123.lock',
    ...overrides
  };
}

function makeLogger() {
  return {
    warn: vi.fn(),
    error: vi.fn()
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('spawnAdhocAttribution outcome contract', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('resolves { activated: true } when the de-dupe lock is not acquired — the lock gates only the watcher', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('active');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
    vi.mocked(acquireLock).mockResolvedValue(false);

    const outcome = await spawnAdhocAttribution(makeParams(), makeLogger());

    expect(outcome).toBeDefined();
    expect(outcome).toMatchObject({ activated: true });
    // The per-card cleanup still spawns for the second card in the session;
    // only the session-scoped transcript-watcher is de-duped.
    expect(spawnTranscriptWatcher).not.toHaveBeenCalled();
  });

  it('resolves { activated: false, reason: "not-activatable" } when the card status guard rejects', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('done');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(false);

    const outcome = await spawnAdhocAttribution(makeParams(), makeLogger());

    expect(outcome).toBeDefined();
    expect(outcome).toMatchObject({ activated: false, reason: 'not-activatable' });
  });

  it('resolves { activated: true } on the happy path (activatable status + lock acquired)', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('todo');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
    vi.mocked(acquireLock).mockResolvedValue(true);
    vi.mocked(spawnTranscriptWatcher).mockReturnValue(true);

    const outcome = await spawnAdhocAttribution(makeParams(), makeLogger());

    expect(outcome).toBeDefined();
    expect(outcome).toMatchObject({ activated: true });
  });
});
