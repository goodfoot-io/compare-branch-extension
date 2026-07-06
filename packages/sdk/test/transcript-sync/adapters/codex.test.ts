/**
 * Tests for {@link buildCodexManifest}.
 *
 * @summary Codex adapter tests
 */

import { describe, expect, it } from 'vitest';
import { buildCodexManifest } from '../../../src/transcript-sync/adapters/codex.js';

const SESSION_ID = '019f38d0-20eb-7a10-b566-666001ec2821';
const ROLLOUT_BASENAME = `rollout-2026-07-06T15-03-11-${SESSION_ID}.jsonl`;

describe('buildCodexManifest', () => {
  it('builds a manifest for a real captured rollout filename', () => {
    const manifest = buildCodexManifest({
      sessionId: SESSION_ID,
      cardId: 'card-123',
      rolloutPath: `/home/user/.codex/sessions/${ROLLOUT_BASENAME}`,
      monitorPid: 4242,
      cardRepoPath: '/home/user/cards/repo'
    });

    expect(manifest).toEqual({
      version: 1,
      sessionId: SESSION_ID,
      cardId: 'card-123',
      runtime: 'codex',
      streamType: 'codex-session',
      watchRoot: '/home/user/.codex/sessions',
      sources: [{ pattern: ROLLOUT_BASENAME, role: 'main', mode: 'jsonl-tail' }],
      monitorPid: 4242,
      cardRepoPath: '/home/user/cards/repo'
    });
  });

  it('throws when the rollout basename does not match the naming convention', () => {
    expect(() =>
      buildCodexManifest({
        sessionId: SESSION_ID,
        cardId: 'card-123',
        rolloutPath: `/home/user/.codex/sessions/${SESSION_ID}.jsonl`,
        monitorPid: 4242,
        cardRepoPath: '/home/user/cards/repo'
      })
    ).toThrow(/does not match the expected/);
  });

  it('throws when the embedded sessionId does not match the given sessionId', () => {
    expect(() =>
      buildCodexManifest({
        sessionId: SESSION_ID,
        cardId: 'card-123',
        rolloutPath: '/home/user/.codex/sessions/rollout-2026-07-06T15-03-11-some-other-id.jsonl',
        monitorPid: 4242,
        cardRepoPath: '/home/user/cards/repo'
      })
    ).toThrow(/does not match expected sessionId/);
  });
});
