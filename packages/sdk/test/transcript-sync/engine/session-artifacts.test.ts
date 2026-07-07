/**
 * Tests for cleanupSessionArtifacts.
 *
 * Ported from `test/bin/transcript-watcher.test.ts` alongside the relocation
 * of `cleanupSessionArtifacts` into the engine: all four removeSession*
 * functions are invoked on completion, and a failure in one does not prevent
 * the others from running or throw out of the cleanup path.
 *
 * @summary Regression tests for the relocated session-artifact cleanup helper
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @cards.management/sessions/card-repo so the tests remain unit-level and
// do not touch the real ~/.cards/card-repo-commits directory.
const mockRemoveSessionHeadSha = vi.fn<(sessionId: string) => void>();
const mockRemoveSessionCsv = vi.fn<(sessionId: string) => void>();
const mockRemoveSessionRouteNudge = vi.fn<(sessionId: string) => void>();
const mockRemoveSessionExitWhenDoneNudge = vi.fn<(sessionId: string) => void>();
vi.mock('@cards.management/sessions/card-repo', () => ({
  removeSessionHeadSha: (sessionId: string) => mockRemoveSessionHeadSha(sessionId),
  removeSessionCsv: (sessionId: string) => mockRemoveSessionCsv(sessionId),
  removeSessionRouteNudge: (sessionId: string) => mockRemoveSessionRouteNudge(sessionId),
  removeSessionExitWhenDoneNudge: (sessionId: string) => mockRemoveSessionExitWhenDoneNudge(sessionId),
  // Pass-through for any other exports used by the module under test.
  appendCommitToSession: vi.fn(),
  getSessionCommits: vi.fn(() => []),
  readSessionHeadSha: vi.fn(() => null),
  writeSessionHeadSha: vi.fn(),
  markSessionRouteNudgeFired: vi.fn(),
  hasSessionRouteNudgeFired: vi.fn(() => false)
}));

import { cleanupSessionArtifacts } from '../../../src/transcript-sync/engine/session-artifacts.js';

describe('cleanupSessionArtifacts', () => {
  const SESSION_ID = 'cleanup-test-session-id';

  beforeEach(() => {
    mockRemoveSessionHeadSha.mockReset();
    mockRemoveSessionCsv.mockReset();
    mockRemoveSessionRouteNudge.mockReset();
    mockRemoveSessionExitWhenDoneNudge.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('invokes all four removeSession* functions with the session id', async () => {
    const warnings: string[] = [];
    await cleanupSessionArtifacts(SESSION_ID, (msg) => warnings.push(msg));

    expect(mockRemoveSessionHeadSha).toHaveBeenCalledOnce();
    expect(mockRemoveSessionHeadSha).toHaveBeenCalledWith(SESSION_ID);
    expect(mockRemoveSessionCsv).toHaveBeenCalledOnce();
    expect(mockRemoveSessionCsv).toHaveBeenCalledWith(SESSION_ID);
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledOnce();
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledWith(SESSION_ID);
    expect(mockRemoveSessionExitWhenDoneNudge).toHaveBeenCalledOnce();
    expect(mockRemoveSessionExitWhenDoneNudge).toHaveBeenCalledWith(SESSION_ID);
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

    // The failing call is warned, the other three still fire.
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('removeSessionHeadSha');
    expect(mockRemoveSessionCsv).toHaveBeenCalledOnce();
    expect(mockRemoveSessionCsv).toHaveBeenCalledWith(SESSION_ID);
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledOnce();
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledWith(SESSION_ID);
    expect(mockRemoveSessionExitWhenDoneNudge).toHaveBeenCalledOnce();
    expect(mockRemoveSessionExitWhenDoneNudge).toHaveBeenCalledWith(SESSION_ID);
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

    // Two warnings, one per failing call; the remaining two still fire.
    expect(warnings).toHaveLength(2);
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledOnce();
    expect(mockRemoveSessionRouteNudge).toHaveBeenCalledWith(SESSION_ID);
    expect(mockRemoveSessionExitWhenDoneNudge).toHaveBeenCalledOnce();
    expect(mockRemoveSessionExitWhenDoneNudge).toHaveBeenCalledWith(SESSION_ID);
  });
});
