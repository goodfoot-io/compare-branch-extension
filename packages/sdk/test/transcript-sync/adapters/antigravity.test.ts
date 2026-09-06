/**
 * Tests for the Antigravity adapter: manifest construction, schema
 * fingerprinting, and payload decoding against builder-produced payloads and
 * the real captured witness bytes.
 *
 * @summary Antigravity adapter and decoder tests
 */

import { describe, expect, it } from 'vitest';
import {
  ANTIGRAVITY_SCHEMA_DDL,
  buildAntigravityManifest,
  computeSchemaFingerprint,
  decodeStepPayload
} from '../../../src/transcript-sync/adapters/antigravity.js';
import { buildManifestForRuntime } from '../../../src/transcript-sync/adapters/index.js';
import {
  buildAssistantPayload,
  buildToolPayload,
  buildUserPayload,
  REAL_PAYLOADS
} from '../fixtures/antigravity-db.js';

const CONVERSATION_ID = '8724cd98-6b07-4080-82d3-1c617be236bf';

function input(transcriptPath = `/home/user/.gemini/antigravity-cli/conversations/${CONVERSATION_ID}.db`) {
  return {
    sessionId: 'antigravity-session-019f',
    cardId: 'card-123',
    transcriptPath,
    monitorPid: 4242,
    cardRepoPath: '/home/user/cards/repo'
  };
}

describe('antigravity adapter', () => {
  it('builds a v2 sqlite-poll manifest from the conversation DB path', () => {
    const manifest = buildAntigravityManifest(input());
    expect(manifest.version).toBe(2);
    expect(manifest.runtime).toBe('antigravity');
    expect(manifest.streamType).toBe('antigravity-session');
    expect(manifest.watchRoot).toBe('/home/user/.gemini/antigravity-cli/conversations');
    expect(manifest.sources).toHaveLength(1);
    const source = manifest.sources[0]!;
    expect(source).toEqual({
      pattern: `${CONVERSATION_ID}.db`,
      role: 'main',
      mode: 'sqlite-poll',
      conversationId: CONVERSATION_ID,
      schemaFingerprint: computeSchemaFingerprint(ANTIGRAVITY_SCHEMA_DDL),
      sidecarPath:
        '/home/user/cards/repo/streams/antigravity-session/8724cd98-6b07-4080-82d3-1c617be236bf.db.emission-state.json'
    });
  });

  it('fails closed when the transcript basename is not <conversationId>.db', () => {
    expect(() =>
      buildAntigravityManifest(input('/home/user/.gemini/antigravity-cli/conversations/other.jsonl'))
    ).toThrow(/\.db/);
    expect(() => buildAntigravityManifest(input('/home/user/.gemini/antigravity-cli/conversations/.db'))).toThrow(/\S/);
  });

  it('is reachable through buildManifestForRuntime', () => {
    const manifest = buildManifestForRuntime('antigravity', input());
    expect(manifest.version).toBe(2);
    expect(manifest.runtime).toBe('antigravity');
  });

  it('computes a stable, whitespace-insensitive fingerprint that changes with the schema', () => {
    const base = computeSchemaFingerprint(ANTIGRAVITY_SCHEMA_DDL);
    expect(base).toMatch(/^[0-9a-f]{64}$/);
    const padded = computeSchemaFingerprint(ANTIGRAVITY_SCHEMA_DDL.map((ddl) => ddl.replace(/,/g, ',  ')));
    expect(padded).toBe(base);
    const mutated = computeSchemaFingerprint([...ANTIGRAVITY_SCHEMA_DDL, 'CREATE TABLE extra (a integer)']);
    expect(mutated).not.toBe(base);
  });
});

describe('antigravity payload decoder', () => {
  it('decodes a type-14 user row through outer field 19 / inner field 2', () => {
    const result = decodeStepPayload(14, 0, buildUserPayload('hello world'));
    expect(result).toEqual({ kind: 'ok', content: 'hello world' });
  });

  it('decodes a type-15 assistant row through outer field 20 / inner field 1', () => {
    const result = decodeStepPayload(15, 0, buildAssistantPayload('final answer'));
    expect(result).toEqual({ kind: 'ok', content: 'final answer' });
  });

  it('decodes a type-132 tool row into canonical tool JSON', () => {
    const args = JSON.stringify({ CommandLine: 'printenv X', Cwd: '/tmp' });
    const result = decodeStepPayload(132, 0, buildToolPayload('call_226020', 'run_command', args));
    expect(result).toEqual({
      kind: 'ok',
      content: JSON.stringify({ tool: 'run_command', arguments: JSON.parse(args) })
    });
  });

  it('decodes the real captured user payload (PONG probe idx 0)', () => {
    const bytes = Buffer.from(REAL_PAYLOADS.userPong, 'base64');
    const result = decodeStepPayload(14, 0, bytes);
    expect(result).toEqual({ kind: 'ok', content: 'Reply with exactly: PONG' });
  });

  it('decodes the real captured assistant payload (PONG probe idx 1)', () => {
    const bytes = Buffer.from(REAL_PAYLOADS.assistantPong, 'base64');
    const result = decodeStepPayload(15, 0, bytes);
    expect(result).toEqual({ kind: 'ok', content: 'PONG' });
  });

  it('decodes the real captured tool payload (printenv run_command)', () => {
    const bytes = Buffer.from(REAL_PAYLOADS.toolPrintenv, 'base64');
    const result = decodeStepPayload(132, 0, bytes);
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    const parsed = JSON.parse(result.content) as { tool: string; arguments: Record<string, unknown> };
    expect(parsed.tool).toBe('run_command');
    expect(parsed.arguments['CommandLine']).toBe('printenv ANTIGRAVITY_SESSION_ID');
  });

  it('returns a format-unknown anomaly for an unwitnessed step_format', () => {
    const result = decodeStepPayload(15, 7, buildAssistantPayload('x'));
    expect(result.kind).toBe('anomaly');
    if (result.kind === 'anomaly') expect(result.detail).toMatch(/step_format 7/);
  });

  it('returns a format-unknown anomaly for an unwitnessed step_type', () => {
    const result = decodeStepPayload(98, 0, buildAssistantPayload('x'));
    expect(result.kind).toBe('anomaly');
    if (result.kind === 'anomaly') expect(result.detail).toMatch(/step_type 98/);
  });

  it('returns a format-unknown anomaly for malformed wire bytes instead of guessing', () => {
    const garbage = Buffer.from([0x0a, 0xff, 0xff, 0xff]);
    const result = decodeStepPayload(14, 0, garbage);
    expect(result).toEqual({ kind: 'anomaly', detail: expect.stringMatching(/.+/) });
  });

  it('returns a format-unknown anomaly for invalid UTF-8 text in a witnessed field', () => {
    const bad = Buffer.concat([encodeRawText(2, Buffer.from([0xff, 0xfe, 0xc0]))]);
    const result = decodeStepPayload(14, 0, bad);
    expect(result.kind).toBe('anomaly');
  });

  it('returns a format-unknown anomaly for a null payload on a witnessed type', () => {
    const result = decodeStepPayload(14, 0, null);
    expect(result.kind).toBe('anomaly');
  });
});

/**
 * Raw length-delimited field with arbitrary (possibly invalid UTF-8) bytes.
 *
 * @param fieldNumber - Proto field number.
 * @param bytes - Raw field bytes, written verbatim.
 * @returns The encoded field (tag, length, bytes).
 */
function encodeRawText(fieldNumber: number, bytes: Buffer): Buffer {
  const varint: number[] = [];
  let v = (fieldNumber << 3) | 2;
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v > 0) byte |= 0x80;
    varint.push(byte);
  } while (v > 0);
  const len: number[] = [];
  let l = bytes.length;
  do {
    let byte = l & 0x7f;
    l >>>= 7;
    if (l > 0) byte |= 0x80;
    len.push(byte);
  } while (l > 0);
  return Buffer.concat([Buffer.from(varint), Buffer.from(len), bytes]);
}

describe('step decoder dispatch', () => {
  it('routes antigravity rows through decodeStepForRuntime', async () => {
    const { decodeStepForRuntime } = await import('../../../src/transcript-sync/adapters/index.js');
    const result = decodeStepForRuntime('antigravity', {
      idx: 0,
      stepType: 14,
      status: 3,
      payload: buildUserPayload('hi'),
      format: 0
    });
    expect(result).toEqual({ kind: 'ok', content: 'hi' });
  });

  it('throws for a runtime with no decoder', async () => {
    const { decodeStepForRuntime } = await import('../../../src/transcript-sync/adapters/index.js');
    expect(() =>
      decodeStepForRuntime('claude-code', { idx: 0, stepType: 14, status: 3, payload: null, format: 0 })
    ).toThrow(/No step-payload decoder for runtime: claude-code/);
  });
});
