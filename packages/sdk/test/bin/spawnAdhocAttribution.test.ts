/**
 * Tests for the spawnAdhocAttribution shared helper.
 *
 * Mocks the four collaborators (readCardStatus, acquireLock,
 * spawnTranscriptWatcher, spawnAdhocCleanup) via vitest module mocks so the
 * tests exercise only the helper's guard+lock+spawn sequencing logic.
 *
 * @summary Unit tests for the spawnAdhocAttribution shared helper
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

// ─── Module mocks ────────────────────────────────────────────────────────────
// All four collaborators are mocked at the module level before the SUT is
// imported. vitest hoists vi.mock calls above imports automatically.

vi.mock('@cards/sdk/bin/process-utils', () => ({
  readCardStatus: vi.fn(),
  isAdhocActivatableStatus: vi.fn()
}));

vi.mock('@cards/sdk/adhoc-attribution', () => ({
  acquireLock: vi.fn()
}));

vi.mock('@cards/sdk/bin/spawn-transcript-watcher', () => ({
  spawnTranscriptWatcher: vi.fn(),
  transcriptWatcherWrapperName: vi.fn(() => 'transcript-watcher')
}));

vi.mock('@cards/sdk/bin/spawn-adhoc-cleanup', () => ({
  spawnAdhocCleanup: vi.fn()
}));

import { acquireLock } from '@cards/sdk/adhoc-attribution';
import { isAdhocActivatableStatus, readCardStatus } from '@cards/sdk/bin/process-utils';
import { spawnAdhocCleanup } from '@cards/sdk/bin/spawn-adhoc-cleanup';
import { spawnTranscriptWatcher, transcriptWatcherWrapperName } from '@cards/sdk/bin/spawn-transcript-watcher';
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

describe('spawnAdhocAttribution', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns without locking or spawning when the card is not in an activatable status', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('done');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(false);

    const logger = makeLogger();
    await spawnAdhocAttribution(makeParams(), logger);

    expect(acquireLock).not.toHaveBeenCalled();
    expect(spawnTranscriptWatcher).not.toHaveBeenCalled();
    expect(spawnAdhocCleanup).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('not in an activatable state'),
      expect.objectContaining({ cardId: 'main-99', status: 'done' })
    );
  });

  it('returns without locking or spawning when the status is null (missing meta)', async () => {
    vi.mocked(readCardStatus).mockResolvedValue(null);
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(false);

    const logger = makeLogger();
    await spawnAdhocAttribution(makeParams(), logger);

    expect(acquireLock).not.toHaveBeenCalled();
    expect(spawnTranscriptWatcher).not.toHaveBeenCalled();
    expect(spawnAdhocCleanup).not.toHaveBeenCalled();
  });

  it('skips the watcher but still spawns adhoc-cleanup (with an empty lock path) when the lock is not acquired', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('active');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
    vi.mocked(acquireLock).mockResolvedValue(false);

    const logger = makeLogger();
    const params = makeParams();
    await spawnAdhocAttribution(params, logger);

    // The session lock gates only the transcript-watcher (one per session).
    expect(spawnTranscriptWatcher).not.toHaveBeenCalled();
    // The per-card cleanup must still run so this card is activated; the empty
    // lock path marks it a non-owner so teardown never releases another
    // bind's session lock.
    expect(spawnAdhocCleanup).toHaveBeenCalledWith(
      params.agentPid,
      params.sessionId,
      params.cardId,
      params.cardRepoPath,
      '',
      logger
    );
  });

  it('invokes both spawns on the happy path (activatable status + lock acquired)', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('todo');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
    vi.mocked(acquireLock).mockResolvedValue(true);
    vi.mocked(spawnTranscriptWatcher).mockReturnValue(true);

    const logger = makeLogger();
    const params = makeParams();
    await spawnAdhocAttribution(params, logger);

    expect(spawnTranscriptWatcher).toHaveBeenCalledOnce();
    expect(spawnAdhocCleanup).toHaveBeenCalledOnce();
  });

  it('records the agent PID (not the node process PID) in the lock', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('needs_review');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
    vi.mocked(acquireLock).mockResolvedValue(true);
    vi.mocked(spawnTranscriptWatcher).mockReturnValue(true);

    const logger = makeLogger();
    const agentPid = 99999;
    await spawnAdhocAttribution(makeParams({ agentPid }), logger);

    expect(acquireLock).toHaveBeenCalledWith(
      expect.any(String), // lockPath
      agentPid, // must be the agent PID
      expect.any(String), // cardId
      logger
    );
    // Sanity-check: the agent PID is not the node process PID.
    expect(agentPid).not.toBe(process.pid);
  });

  it('passes all spawn args from params to spawnTranscriptWatcher', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('active');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
    vi.mocked(acquireLock).mockResolvedValue(true);
    vi.mocked(spawnTranscriptWatcher).mockReturnValue(true);
    vi.mocked(transcriptWatcherWrapperName).mockReturnValue('transcript-watcher');

    const logger = makeLogger();
    const params = makeParams();
    await spawnAdhocAttribution(params, logger);

    expect(spawnTranscriptWatcher).toHaveBeenCalledWith(
      'transcript-watcher',
      params.agentPid,
      params.sessionId,
      params.transcriptPath,
      params.cardId,
      params.cardRepoPath,
      logger
    );
  });

  it('passes all cleanup args from params to spawnAdhocCleanup', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('active');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
    vi.mocked(acquireLock).mockResolvedValue(true);
    vi.mocked(spawnTranscriptWatcher).mockReturnValue(true);

    const logger = makeLogger();
    const params = makeParams();
    await spawnAdhocAttribution(params, logger);

    expect(spawnAdhocCleanup).toHaveBeenCalledWith(
      params.agentPid,
      params.sessionId,
      params.cardId,
      params.cardRepoPath,
      params.lockPath,
      logger
    );
  });
});
