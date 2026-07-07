/**
 * Tests for {@link buildManifestForRuntime}, the runtime-string dispatcher
 * used by callers (e.g. `spawnAdhocAttribution`) that only know their
 * runtime as a string rather than statically.
 *
 * @summary buildManifestForRuntime dispatch tests
 */

import { describe, expect, it } from 'vitest';
import { buildManifestForRuntime, UnsupportedRuntimeError } from '../../../src/transcript-sync/adapters/index.js';

describe('buildManifestForRuntime', () => {
  it('dispatches to the Claude Code adapter', () => {
    const manifest = buildManifestForRuntime('claude-code', {
      sessionId: 'sess-1',
      cardId: 'card-1',
      transcriptPath: '/home/user/.claude/projects/proj/sess-1.jsonl',
      monitorPid: 4242,
      cardRepoPath: '/home/user/cards/repo'
    });

    expect(manifest.runtime).toBe('claude-code');
    expect(manifest.streamType).toBe('claude-code-session');
    expect(manifest.sources).toEqual([
      { pattern: 'sess-1.jsonl', role: 'main', mode: 'jsonl-tail' },
      { pattern: 'sess-1/subagents/*.jsonl', role: 'subagent', mode: 'jsonl-tail' }
    ]);
  });

  it('dispatches to the Codex adapter, forwarding transcriptPath as rolloutPath', () => {
    const sessionId = '019f38d0-20eb-7a10-b566-666001ec2821';
    const manifest = buildManifestForRuntime('codex', {
      sessionId,
      cardId: 'card-1',
      transcriptPath: `/home/user/.codex/sessions/rollout-2026-07-06T15-03-11-${sessionId}.jsonl`,
      monitorPid: 4242,
      cardRepoPath: '/home/user/cards/repo'
    });

    expect(manifest.runtime).toBe('codex');
    expect(manifest.streamType).toBe('codex-session');
  });

  it('propagates the underlying adapter error for a mismatched sessionId', () => {
    expect(() =>
      buildManifestForRuntime('claude-code', {
        sessionId: 'sess-1',
        cardId: 'card-1',
        transcriptPath: '/home/user/.claude/projects/proj/some-other-session.jsonl',
        monitorPid: 4242,
        cardRepoPath: '/home/user/cards/repo'
      })
    ).toThrow(/does not match expected/);
  });

  it('throws UnsupportedRuntimeError for an unrecognized runtime — fail closed, never guesses', () => {
    expect(() =>
      buildManifestForRuntime('opencode', {
        sessionId: 'sess-1',
        cardId: 'card-1',
        transcriptPath: '/home/user/.opencode/sess-1.jsonl',
        monitorPid: 4242,
        cardRepoPath: '/home/user/cards/repo'
      })
    ).toThrow(UnsupportedRuntimeError);
  });
});
