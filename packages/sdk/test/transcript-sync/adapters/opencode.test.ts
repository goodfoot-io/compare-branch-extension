/**
 * Tests for {@link buildOpencodeManifest}.
 *
 * @summary OpenCode adapter tests
 */

import { describe, expect, it } from 'vitest';
import { buildOpencodeManifest } from '../../../src/transcript-sync/adapters/opencode.js';

const SESSION_ID = 'b7e6c2a1-9d34-4f8e-a1c2-3d5b7f9e0a12';

describe('buildOpencodeManifest', () => {
  it('builds a manifest over the plugin-materialized NDJSON transcript', () => {
    const manifest = buildOpencodeManifest({
      sessionId: SESSION_ID,
      cardId: 'card-123',
      transcriptPath: `/home/user/.cards/opencode-transcripts/${SESSION_ID}.jsonl`,
      monitorPid: 4242,
      cardRepoPath: '/home/user/cards/repo'
    });

    expect(manifest).toEqual({
      version: 1,
      sessionId: SESSION_ID,
      cardId: 'card-123',
      runtime: 'opencode',
      streamType: 'opencode-session',
      watchRoot: '/home/user/.cards/opencode-transcripts',
      sources: [{ pattern: `${SESSION_ID}.jsonl`, role: 'main', mode: 'jsonl-tail' }],
      monitorPid: 4242,
      cardRepoPath: '/home/user/cards/repo'
    });
  });

  it('throws when the transcriptPath basename is not <sessionId>.jsonl', () => {
    expect(() =>
      buildOpencodeManifest({
        sessionId: SESSION_ID,
        cardId: 'card-123',
        transcriptPath: `/home/user/.cards/opencode-transcripts/${SESSION_ID}.ndjson`,
        monitorPid: 4242,
        cardRepoPath: '/home/user/cards/repo'
      })
    ).toThrow(/does not match expected/);
  });

  it('throws when the transcriptPath basename names another sessionId', () => {
    expect(() =>
      buildOpencodeManifest({
        sessionId: SESSION_ID,
        cardId: 'card-123',
        transcriptPath: '/home/user/.cards/opencode-transcripts/some-other-id.jsonl',
        monitorPid: 4242,
        cardRepoPath: '/home/user/cards/repo'
      })
    ).toThrow(/does not match expected/);
  });
});
