/**
 * Tests for the spawnAdhocAttribution shared helper.
 *
 * Mocks the collaborators (readCardStatus, acquireLock, buildManifestForRuntime,
 * spawnStreamSyncWatcher, spawnAdhocCleanup) via vitest module mocks so the
 * tests exercise only the helper's guard+lock+spawn sequencing logic.
 *
 * @summary Unit tests for the spawnAdhocAttribution shared helper
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionSyncManifest } from '../../src/transcript-sync/manifest.js';

// ─── Module mocks ────────────────────────────────────────────────────────────
// All collaborators are mocked at the module level before the SUT is
// imported. vitest hoists vi.mock calls above imports automatically.

vi.mock('@cards.management/sdk/bin/process-utils', () => ({
  readCardStatus: vi.fn(),
  isAdhocActivatableStatus: vi.fn()
}));

vi.mock('@cards.management/sdk/adhoc-attribution', () => ({
  acquireLock: vi.fn()
}));

vi.mock('@cards.management/sdk/bin/spawn-stream-sync-watcher', () => ({
  spawnStreamSyncWatcher: vi.fn()
}));

vi.mock('../../src/transcript-sync/adapters/index.js', () => ({
  buildManifestForRuntime: vi.fn()
}));

vi.mock('@cards.management/sdk/bin/spawn-adhoc-cleanup', () => ({
  spawnAdhocCleanup: vi.fn()
}));

import { acquireLock } from '@cards.management/sdk/adhoc-attribution';
import { isAdhocActivatableStatus, readCardStatus } from '@cards.management/sdk/bin/process-utils';
import { spawnAdhocCleanup } from '@cards.management/sdk/bin/spawn-adhoc-cleanup';
import { spawnStreamSyncWatcher } from '@cards.management/sdk/bin/spawn-stream-sync-watcher';
import { type SpawnAdhocAttributionParams, spawnAdhocAttribution } from '../../src/bin/spawnAdhocAttribution.js';
import { buildManifestForRuntime } from '../../src/transcript-sync/adapters/index.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeParams(overrides: Partial<SpawnAdhocAttributionParams> = {}): SpawnAdhocAttributionParams {
  return {
    agentPid: 42000,
    sessionId: 'sess-abc-123',
    transcriptPath: '/tmp/transcript.jsonl',
    cardId: 'main-99',
    cardRepoPath: '/tmp/card-repos/main-99',
    lockPath: '/tmp/adhoc-sessions/sess-abc-123.lock',
    runtime: 'claude-code',
    ...overrides
  };
}

const FAKE_MANIFEST: SessionSyncManifest = {
  version: 1,
  sessionId: 'sess-abc-123',
  cardId: 'main-99',
  runtime: 'claude-code',
  streamType: 'claude-code-session',
  watchRoot: '/tmp',
  sources: [{ pattern: 'sess-abc-123.jsonl', role: 'main', mode: 'jsonl-tail' }],
  monitorPid: 42000,
  cardRepoPath: '/tmp/card-repos/main-99'
};

function makeLogger() {
  return {
    warn: vi.fn(),
    error: vi.fn()
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('spawnAdhocAttribution', () => {
  let savedCardsBinPath: string | undefined;

  beforeEach(() => {
    savedCardsBinPath = process.env['CARDS_BIN_PATH'];
    delete process.env['CARDS_BIN_PATH'];
    vi.mocked(buildManifestForRuntime).mockReturnValue(FAKE_MANIFEST);
  });

  afterEach(() => {
    if (savedCardsBinPath !== undefined) {
      process.env['CARDS_BIN_PATH'] = savedCardsBinPath;
    }
    vi.resetAllMocks();
  });

  it('returns without locking or spawning when the card is not in an activatable status', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('done');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(false);

    const logger = makeLogger();
    await spawnAdhocAttribution(makeParams(), logger);

    expect(acquireLock).not.toHaveBeenCalled();
    expect(spawnStreamSyncWatcher).not.toHaveBeenCalled();
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
    expect(spawnStreamSyncWatcher).not.toHaveBeenCalled();
    expect(spawnAdhocCleanup).not.toHaveBeenCalled();
  });

  it('skips the watcher but still spawns adhoc-cleanup (with an empty lock path) when the lock is not acquired', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('active');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
    vi.mocked(acquireLock).mockResolvedValue(false);

    const logger = makeLogger();
    const params = makeParams();
    await spawnAdhocAttribution(params, logger);

    // The session lock gates only the stream-sync-watcher (one per session).
    expect(spawnStreamSyncWatcher).not.toHaveBeenCalled();
    // The per-card cleanup must still run so this card is activated; the empty
    // lock path marks it a non-owner so teardown never releases another
    // bind's session lock.
    expect(spawnAdhocCleanup).toHaveBeenCalledWith(
      '',
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
    vi.mocked(spawnStreamSyncWatcher).mockReturnValue(true);

    const logger = makeLogger();
    const params = makeParams();
    await spawnAdhocAttribution(params, logger);

    expect(spawnStreamSyncWatcher).toHaveBeenCalledOnce();
    expect(spawnAdhocCleanup).toHaveBeenCalledOnce();
  });

  it('records the agent PID (not the node process PID) in the lock', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('needs_review');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
    vi.mocked(acquireLock).mockResolvedValue(true);
    vi.mocked(spawnStreamSyncWatcher).mockReturnValue(true);

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

  it('builds the manifest for the given runtime and passes it to spawnStreamSyncWatcher', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('active');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
    vi.mocked(acquireLock).mockResolvedValue(true);
    vi.mocked(spawnStreamSyncWatcher).mockReturnValue(true);

    const logger = makeLogger();
    const params = makeParams({ runtime: 'codex' });
    await spawnAdhocAttribution(params, logger);

    expect(buildManifestForRuntime).toHaveBeenCalledWith('codex', {
      sessionId: params.sessionId,
      cardId: params.cardId,
      transcriptPath: params.transcriptPath,
      monitorPid: params.agentPid,
      cardRepoPath: params.cardRepoPath
    });
    expect(spawnStreamSyncWatcher).toHaveBeenCalledWith({ manifest: FAKE_MANIFEST, logger });
  });

  it('logs and skips the watcher spawn (without touching adhoc-cleanup) when the runtime is unsupported', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('active');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
    vi.mocked(acquireLock).mockResolvedValue(true);
    vi.mocked(buildManifestForRuntime).mockImplementation(() => {
      throw new Error('No SessionSyncManifest adapter for runtime: opencode');
    });

    const logger = makeLogger();
    const params = makeParams({ runtime: 'opencode' });
    const outcome = await spawnAdhocAttribution(params, logger);

    expect(spawnStreamSyncWatcher).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('failed to build sync manifest'),
      expect.objectContaining({ runtime: 'opencode' })
    );
    // Per-card activation is decoupled from the watcher — it still runs.
    expect(spawnAdhocCleanup).toHaveBeenCalledOnce();
    expect(outcome).toMatchObject({ activated: true });
  });

  it('passes all cleanup args from params to spawnAdhocCleanup', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('active');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
    vi.mocked(acquireLock).mockResolvedValue(true);
    vi.mocked(spawnStreamSyncWatcher).mockReturnValue(true);

    const logger = makeLogger();
    const params = makeParams();
    await spawnAdhocAttribution(params, logger);

    expect(spawnAdhocCleanup).toHaveBeenCalledWith(
      '',
      params.agentPid,
      params.sessionId,
      params.cardId,
      params.cardRepoPath,
      params.lockPath,
      logger
    );
  });

  it('forwards CARDS_BIN_PATH as the binPath cleanup arg when set', async () => {
    vi.mocked(readCardStatus).mockResolvedValue('active');
    vi.mocked(isAdhocActivatableStatus).mockReturnValue(true);
    vi.mocked(acquireLock).mockResolvedValue(true);
    vi.mocked(spawnStreamSyncWatcher).mockReturnValue(true);

    const previous = process.env['CARDS_BIN_PATH'];
    process.env['CARDS_BIN_PATH'] = '/tmp/ext/dist/bin';
    try {
      const logger = makeLogger();
      const params = makeParams();
      await spawnAdhocAttribution(params, logger);

      expect(spawnAdhocCleanup).toHaveBeenCalledWith(
        '/tmp/ext/dist/bin',
        params.agentPid,
        params.sessionId,
        params.cardId,
        params.cardRepoPath,
        params.lockPath,
        logger
      );
    } finally {
      if (previous === undefined) delete process.env['CARDS_BIN_PATH'];
      else process.env['CARDS_BIN_PATH'] = previous;
    }
  });
});
