/**
 * Tests for the sqlite-poll emission-record contract: serialization, line
 * parsing, and the torn/invalid-line tolerance the sidecar rebuild relies on.
 *
 * @summary Emission-record (de)serialization tests
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  EMISSION_RECORD_VERSION,
  type EmissionRecord,
  parseEmissionRecordLine,
  serializeEmissionRecord
} from '../../src/transcript-sync/records.js';

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf-8').digest('hex');
}

function record(overrides: Partial<EmissionRecord> = {}): EmissionRecord {
  const content = overrides.content ?? 'PONG';
  return {
    v: EMISSION_RECORD_VERSION,
    idx: 1,
    stepType: 15,
    status: 3,
    content,
    hash: overrides.hash ?? sha256(content),
    anomaly: null,
    ...overrides
  };
}

describe('emission records', () => {
  it('serializes to one newline-terminated JSON line with contract field order', () => {
    const line = serializeEmissionRecord(record());
    expect(line.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(['v', 'idx', 'stepType', 'status', 'content', 'hash', 'anomaly']);
    expect(parsed['v']).toBe(1);
    expect(parsed['idx']).toBe(1);
    expect(parsed['hash']).toBe(sha256('PONG'));
    expect(parsed['anomaly']).toBeNull();
  });

  it('round-trips a record with a host-drift anomaly', () => {
    const drifted = record({ anomaly: { kind: 'host-drift', detail: 'content hash changed for idx 1' } });
    const line = serializeEmissionRecord(drifted);
    expect(parseEmissionRecordLine(line.slice(0, -1))).toEqual(drifted);
  });

  it('rejects a record whose hash does not match its content', () => {
    expect(() => serializeEmissionRecord(record({ hash: sha256('other') }))).toThrow(/hash/i);
  });

  it('parse returns null for torn or invalid lines and never throws', () => {
    expect(parseEmissionRecordLine('{"v":1,"idx":')).toBeNull();
    expect(parseEmissionRecordLine('not json at all')).toBeNull();
    expect(parseEmissionRecordLine('')).toBeNull();
    expect(parseEmissionRecordLine(JSON.stringify({ v: 2, idx: 1 }))).toBeNull();
  });

  it('parse rejects a line whose hash does not match its content', () => {
    const bad = JSON.stringify({ ...record(), hash: sha256('mismatch') });
    expect(parseEmissionRecordLine(bad)).toBeNull();
  });

  it('format-unknown records carry empty content and the hash of the empty string', () => {
    const unknown = record({
      content: '',
      hash: sha256(''),
      anomaly: { kind: 'format-unknown', detail: 'unwitnessed step_format 7' }
    });
    const line = serializeEmissionRecord(unknown);
    expect(parseEmissionRecordLine(line.slice(0, -1))).toEqual(unknown);
  });
});
