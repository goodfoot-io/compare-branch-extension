/**
 * Tests for manifest schema version 2: the sqlite-poll source shape, the
 * homogeneous single-source rule, and explicit version/mode handling.
 *
 * @summary Manifest v2 (sqlite-poll) validation tests
 */

import { describe, expect, it } from 'vitest';
import { ManifestValidationError, parseManifest, serializeManifest } from '../../src/transcript-sync/manifest.js';

const CONVERSATION_ID = '8724cd98-6b07-4080-82d3-1c617be236bf';
const FINGERPRINT = 'a'.repeat(64);

function v2Manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 2,
    sessionId: 'antigravity-session-019f',
    cardId: 'card-123',
    runtime: 'antigravity',
    streamType: 'antigravity-session',
    watchRoot: '/home/user/.gemini/antigravity-cli/conversations',
    sources: [
      {
        pattern: `${CONVERSATION_ID}.db`,
        role: 'main',
        mode: 'sqlite-poll',
        conversationId: CONVERSATION_ID,
        schemaFingerprint: FINGERPRINT,
        sidecarPath: '/home/user/cards/repo/streams/antigravity-session/main.emission-state.json'
      }
    ],
    monitorPid: 12345,
    cardRepoPath: '/home/user/cards/repo',
    ...overrides
  };
}

describe('manifest v2 (sqlite-poll)', () => {
  it('round-trips a valid v2 manifest', () => {
    const json = JSON.stringify(v2Manifest());
    expect(parseManifest(json)).toEqual(JSON.parse(json));
  });

  it('parses a v2 manifest through serializeManifest round-trip', () => {
    const manifest = parseManifest(JSON.stringify(v2Manifest()));
    expect(parseManifest(serializeManifest(manifest))).toEqual(manifest);
  });

  it('rejects a v2 manifest mixing a sqlite-poll source with file sources', () => {
    const manifest = v2Manifest();
    manifest['sources'] = [
      (manifest['sources'] as unknown[])[0],
      { pattern: 'extra.jsonl', role: 'subagent', mode: 'jsonl-tail' }
    ];
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(/sqlite-poll/);
  });

  it('rejects a v2 manifest whose sqlite-poll source is not the main role', () => {
    const manifest = v2Manifest();
    (manifest['sources'] as Array<Record<string, unknown>>)[0]!['role'] = 'subagent';
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(/exactly one 'main'/);
  });

  it.each([
    ['conversationId', { conversationId: '' }],
    ['schemaFingerprint', { schemaFingerprint: 'not-a-fingerprint' }],
    ['schemaFingerprint uppercase', { schemaFingerprint: 'A'.repeat(64) }],
    ['sidecarPath relative', { sidecarPath: 'streams/antigravity-session/x.json' }]
  ])('rejects a v2 sqlite-poll source with invalid %s', (_label, override) => {
    const manifest = v2Manifest();
    manifest['sources'] = [{ ...(manifest['sources'] as Array<Record<string, unknown>>)[0]!, ...override }];
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(ManifestValidationError);
  });

  it('rejects a v2 sqlite-poll source with unknown fields', () => {
    const manifest = v2Manifest();
    manifest['sources'] = [{ ...(manifest['sources'] as Array<Record<string, unknown>>)[0]!, dbPath: 'sneaky.db' }];
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow(/unknown field: dbPath/);
  });
});
