/**
 * Reproduction test for: transcript-watcher WebSocket fails because cardsClient.ts
 * uses `await import('ws')` (inline dynamic import) inside createDefaultWsFactory().
 *
 * When esbuild bundles transcript-watcher.mjs with --format=esm, it inlines ws and
 * wraps its CJS require() calls in a shim that throws in ESM context. The fix moves
 * ws import responsibility to transcript-watcher.ts (a static top-level import) and
 * passes the factory explicitly to openStreamWebSocket.
 *
 * This test verifies that openOrResumeWebSocketSession passes a wsFactory function
 * as the 5th argument to client.openStreamWebSocket. Before the fix, only 4 arguments
 * are passed (no factory), leaving openStreamWebSocket to fall back to the broken
 * createDefaultWsFactory() dynamic import at runtime.
 *
 * @summary Reproduction test: wsFactory must be passed explicitly from transcript-watcher
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@cards/sdk/client/discovery', () => ({
  createCardsClient: vi.fn()
}));

import { createCardsClient } from '@cards/sdk/client/discovery';
import { openOrResumeWebSocketSession, type TranscriptWatcherArgs } from '../../src/bin/transcript-watcher.js';

const mockCreateCardsClient = vi.mocked(createCardsClient);

describe('openOrResumeWebSocketSession — wsFactory injection', () => {
  const args: TranscriptWatcherArgs = {
    pid: 12345,
    sessionId: 'sess-abc',
    transcriptPath: '/tmp/transcript.jsonl',
    cardId: 'card-42',
    cardRepoPath: '/tmp/card-repo'
  };

  let mockOpenStreamWebSocket: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOpenStreamWebSocket = vi.fn().mockResolvedValue({
      write: vi.fn(),
      close: vi.fn().mockResolvedValue({}),
      resumeFrom: 0,
      linesSent: 0
    });
    mockCreateCardsClient.mockResolvedValue({ openStreamWebSocket: mockOpenStreamWebSocket } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('passes a wsFactory function as the 5th argument to openStreamWebSocket', async () => {
    await openOrResumeWebSocketSession(args);

    expect(mockOpenStreamWebSocket).toHaveBeenCalledOnce();
    const callArgs = mockOpenStreamWebSocket.mock.calls[0] as unknown[];
    // Before fix: only 4 args are passed (no wsFactory), so callArgs[4] is undefined.
    // After fix:  a wsFactory function is passed as the 5th arg.
    expect(typeof callArgs[4]).toBe('function');
  });
});
