/**
 * Tests for {@link buildClaudeCodeManifest}.
 *
 * @summary Claude Code adapter tests
 */

import { describe, expect, it } from 'vitest';
import { buildClaudeCodeManifest } from '../../../src/transcript-sync/adapters/claude-code.js';

const SESSION_ID = 'a1ad5eb8-752f-4739-b02d-c587ae7134d0';

describe('buildClaudeCodeManifest', () => {
  it('builds a manifest for a real captured transcript filename', () => {
    const manifest = buildClaudeCodeManifest({
      sessionId: SESSION_ID,
      cardId: 'card-123',
      transcriptPath: `/home/user/.claude/projects/foo/${SESSION_ID}.jsonl`,
      monitorPid: 4242,
      cardRepoPath: '/home/user/cards/repo'
    });

    expect(manifest).toEqual({
      version: 1,
      sessionId: SESSION_ID,
      cardId: 'card-123',
      runtime: 'claude-code',
      streamType: 'claude-code-session',
      watchRoot: '/home/user/.claude/projects/foo',
      sources: [
        { pattern: `${SESSION_ID}.jsonl`, role: 'main', mode: 'jsonl-tail' },
        { pattern: `${SESSION_ID}/subagents/*.jsonl`, role: 'subagent', mode: 'jsonl-tail' }
      ],
      monitorPid: 4242,
      cardRepoPath: '/home/user/cards/repo'
    });
  });

  it('throws when the transcriptPath basename does not match the sessionId', () => {
    expect(() =>
      buildClaudeCodeManifest({
        sessionId: SESSION_ID,
        cardId: 'card-123',
        transcriptPath: '/home/user/.claude/projects/foo/some-other-id.jsonl',
        monitorPid: 4242,
        cardRepoPath: '/home/user/cards/repo'
      })
    ).toThrow(/does not match expected/);
  });
});
