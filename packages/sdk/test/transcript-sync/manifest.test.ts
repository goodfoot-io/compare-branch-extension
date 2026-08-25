/**
 * Tests for {@link parseManifest} / {@link serializeManifest} fail-closed
 * validation of {@link SessionSyncManifest}.
 *
 * @summary Manifest validation and round-trip tests
 */

import { describe, expect, it } from 'vitest';
import { buildClaudeCodeManifest } from '../../src/transcript-sync/adapters/claude-code.js';
import { buildCodexManifest } from '../../src/transcript-sync/adapters/codex.js';
import { buildOpencodeManifest } from '../../src/transcript-sync/adapters/opencode.js';
import type { SessionSyncManifest } from '../../src/transcript-sync/manifest.js';
import { ManifestValidationError, parseManifest, serializeManifest } from '../../src/transcript-sync/manifest.js';

function validManifest(): SessionSyncManifest {
  return {
    version: 1,
    sessionId: 'a1ad5eb8-752f-4739-b02d-c587ae7134d0',
    cardId: 'card-123',
    runtime: 'claude-code',
    streamType: 'claude-code-session',
    watchRoot: '/home/user/.claude/projects/foo',
    sources: [
      { pattern: 'a1ad5eb8-752f-4739-b02d-c587ae7134d0.jsonl', role: 'main', mode: 'jsonl-tail' },
      { pattern: 'a1ad5eb8-752f-4739-b02d-c587ae7134d0/subagents/*.jsonl', role: 'subagent', mode: 'jsonl-tail' }
    ],
    monitorPid: 12345,
    cardRepoPath: '/home/user/cards/repo'
  };
}

describe('parseManifest / serializeManifest', () => {
  it('round-trips a valid manifest', () => {
    const manifest = validManifest();
    const roundTripped = parseManifest(serializeManifest(manifest));
    expect(roundTripped).toEqual(manifest);
  });

  it('round-trips a manifest built by buildClaudeCodeManifest', () => {
    const manifest = buildClaudeCodeManifest({
      sessionId: 'a1ad5eb8-752f-4739-b02d-c587ae7134d0',
      cardId: 'card-123',
      transcriptPath: '/home/user/.claude/projects/foo/a1ad5eb8-752f-4739-b02d-c587ae7134d0.jsonl',
      monitorPid: 12345,
      cardRepoPath: '/home/user/cards/repo'
    });
    expect(parseManifest(serializeManifest(manifest))).toEqual(manifest);
  });

  it('round-trips a manifest built by buildOpencodeManifest', () => {
    const manifest = buildOpencodeManifest({
      sessionId: 'b7e6c2a1-9d34-4f8e-a1c2-3d5b7f9e0a12',
      cardId: 'card-123',
      transcriptPath: '/home/user/.cards/opencode-transcripts/b7e6c2a1-9d34-4f8e-a1c2-3d5b7f9e0a12.jsonl',
      monitorPid: 12345,
      cardRepoPath: '/home/user/cards/repo'
    });
    expect(parseManifest(serializeManifest(manifest))).toEqual(manifest);
  });

  it('round-trips a manifest built by buildCodexManifest', () => {
    const manifest = buildCodexManifest({
      sessionId: '019f38d0-20eb-7a10-b566-666001ec2821',
      cardId: 'card-123',
      rolloutPath: '/home/user/.codex/sessions/rollout-2026-07-06T15-03-11-019f38d0-20eb-7a10-b566-666001ec2821.jsonl',
      monitorPid: 12345,
      cardRepoPath: '/home/user/cards/repo'
    });
    expect(parseManifest(serializeManifest(manifest))).toEqual(manifest);
  });

  it('throws ManifestValidationError on invalid JSON', () => {
    expect(() => parseManifest('{not json')).toThrow(ManifestValidationError);
  });

  it('throws on a non-object top-level value', () => {
    expect(() => parseManifest('[]')).toThrow(ManifestValidationError);
    expect(() => parseManifest('"string"')).toThrow(ManifestValidationError);
  });

  it('throws on an unknown top-level field', () => {
    const manifest = { ...validManifest(), extra: 'field' };
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('throws when version is not 1', () => {
    const manifest = { ...validManifest(), version: 2 };
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('throws when there are zero main sources', () => {
    const manifest = validManifest();
    manifest.sources = manifest.sources.filter((s) => s.role !== 'main');
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('throws when there are more than one main sources', () => {
    const manifest = validManifest();
    manifest.sources = [...manifest.sources, { pattern: 'other.jsonl', role: 'main', mode: 'jsonl-tail' }];
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('throws when a main source pattern contains glob metacharacters', () => {
    const manifest = validManifest();
    manifest.sources = [{ pattern: '*.jsonl', role: 'main', mode: 'jsonl-tail' }];
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('throws when watchRoot is not absolute', () => {
    const manifest = { ...validManifest(), watchRoot: 'relative/path' };
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('throws when cardRepoPath is not absolute', () => {
    const manifest = { ...validManifest(), cardRepoPath: 'relative/path' };
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('throws when a source pattern is absolute', () => {
    const manifest = validManifest();
    manifest.sources = [{ pattern: '/abs/path.jsonl', role: 'main', mode: 'jsonl-tail' }];
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('throws when a source pattern contains ".." segments', () => {
    const manifest = validManifest();
    manifest.sources = [{ pattern: '../escape.jsonl', role: 'main', mode: 'jsonl-tail' }];
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('throws when a source pattern contains backslashes', () => {
    const manifest = validManifest();
    manifest.sources = [{ pattern: 'sub\\path.jsonl', role: 'main', mode: 'jsonl-tail' }];
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('throws when monitorPid is not a positive integer', () => {
    expect(() => parseManifest(JSON.stringify({ ...validManifest(), monitorPid: 0 }))).toThrow(ManifestValidationError);
    expect(() => parseManifest(JSON.stringify({ ...validManifest(), monitorPid: -5 }))).toThrow(
      ManifestValidationError
    );
    expect(() => parseManifest(JSON.stringify({ ...validManifest(), monitorPid: 1.5 }))).toThrow(
      ManifestValidationError
    );
  });

  it.each(['sessionId', 'cardId', 'runtime', 'streamType'] as const)('throws when %s is empty', (field) => {
    const manifest = { ...validManifest(), [field]: '' };
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('throws when a source has an unknown field', () => {
    const manifest = validManifest();
    manifest.sources = [{ ...manifest.sources[0]!, extra: true } as never];
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('throws when a source role is invalid', () => {
    const manifest = validManifest();
    manifest.sources = [{ ...manifest.sources[0]!, role: 'bogus' as never }];
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('throws when a source mode is invalid', () => {
    const manifest = validManifest();
    manifest.sources = [{ ...manifest.sources[0]!, mode: 'bogus' as never }];
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });
});
