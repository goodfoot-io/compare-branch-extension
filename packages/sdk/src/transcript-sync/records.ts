/**
 * Normalized emission-record contract for the sqlite-poll transcript mode.
 *
 * Every record is one JSON line in the destination stream named by the
 * manifest (the durable emission authority for a polled SQLite conversation
 * source). The renderer's dedup/idempotence keys on the `(idx, hash)` pair;
 * this module owns the shape and (de)serialization only — emission decisions
 * live in `./engine/sqlite-poll.ts`, payload decoding in `./adapters/`.
 *
 * @summary sqlite-poll destination record schema and line (de)serialization
 * @module
 */

import { createHash } from 'node:crypto';

/** Record schema version, pinned by the card contract. Bumped only by contract change. */
export const EMISSION_RECORD_VERSION = 1;

/**
 * Computes the lowercase hex SHA-256 of record content — the `hash` half of
 * the renderer's `(idx, hash)` idempotence key.
 *
 * @param content - The record content text.
 * @returns Lowercase hex SHA-256 of the UTF-8 encoding of `content`.
 */
export function contentHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

const ANOMALY_KINDS = new Set<EmissionAnomaly['kind']>(['host-drift', 'flush-partial', 'format-unknown']);

/**
 * Validates the record invariants pinned by the contract: `v` equals the
 * pinned version, the integer fields are safe integers, and `hash` equals the
 * SHA-256 of `content`.
 *
 * @param record - The record to validate.
 * @throws {Error} When any invariant is violated — a corrupt record must
 *   never reach the destination stream or the renderer.
 */
function assertRecordInvariants(record: EmissionRecord): void {
  if (record.v !== EMISSION_RECORD_VERSION) {
    throw new Error(`emission record v must be ${String(EMISSION_RECORD_VERSION)}, got: ${String(record.v)}`);
  }
  for (const field of ['idx', 'stepType', 'status'] as const) {
    if (!Number.isSafeInteger(record[field])) {
      throw new Error(`emission record ${field} must be a safe integer, got: ${String(record[field])}`);
    }
  }
  if (typeof record.content !== 'string') {
    throw new Error('emission record content must be a string');
  }
  if (record.hash !== contentHash(record.content)) {
    throw new Error(`emission record hash must be the SHA-256 of content, got: ${record.hash}`);
  }
  if (record.anomaly !== null) {
    const anomaly = record.anomaly;
    if (
      typeof anomaly !== 'object' ||
      typeof anomaly.kind !== 'string' ||
      !ANOMALY_KINDS.has(anomaly.kind) ||
      typeof anomaly.detail !== 'string'
    ) {
      throw new Error(`emission record anomaly is malformed: ${JSON.stringify(record.anomaly)}`);
    }
  }
}

/**
 * Named anomaly kinds carried on a record whose emission is not a plain
 * terminal emission:
 *
 * - `'host-drift'` — an already-emitted row's content hash changed on re-read
 *   (post-terminal revision), or the host diverged from the witnessed
 *   contract (mid-stream `step_format`/schema change). The record carries the
 *   newly-observed content; the renderer collates it after the original.
 * - `'flush-partial'` — a termination-flush record for a row that never
 *   reached terminal status; content is partial, `status` is the observed
 *   non-terminal status. The renderer collates it before any later terminal
 *   record for the same `idx`.
 * - `'format-unknown'` — the payload could not be decoded under the witnessed
 *   formats (unknown `step_format`, unwitnessed `step_type`, malformed wire
 *   bytes, invalid UTF-8). Content is empty; the decoder never guesses.
 */
export type EmissionAnomalyKind = 'host-drift' | 'flush-partial' | 'format-unknown';

/** Structured, named explanation attached to a non-plain emission. */
export interface EmissionAnomaly {
  /** Which named anomaly class this record belongs to. */
  kind: EmissionAnomalyKind;
  /** Human-readable, deterministic detail (stable for fixtures and logs). */
  detail: string;
}

/**
 * One normalized conversation step on the destination stream, one JSON line
 * each. `hash` is the lowercase hex SHA-256 of `content` exactly as emitted —
 * the renderer's idempotence key is `(idx, hash)`.
 */
export interface EmissionRecord {
  /** Record schema version. Currently always `1`. */
  v: typeof EMISSION_RECORD_VERSION;
  /** Source `steps.idx` — the renderer's ordering key. */
  idx: number;
  /** Source `steps.step_type`. */
  stepType: number;
  /** Source `steps.status` as observed at emission time. */
  status: number;
  /** Decoded text content (empty for records that carry no decodable content). */
  content: string;
  /** Lowercase hex SHA-256 of `content`. */
  hash: string;
  /** `null` for a plain terminal emission; otherwise the named anomaly. */
  anomaly: EmissionAnomaly | null;
}

/** One source row as read from the polled `steps` table, decoder-facing shape. */
export interface StepRow {
  /** Source `steps.idx`. */
  idx: number;
  /** Source `steps.step_type`. */
  stepType: number;
  /** Source `steps.status`. */
  status: number;
  /** Source `steps.step_payload` bytes, or `null` when the column is NULL. */
  payload: Uint8Array | null;
  /** Source `steps.step_format` selector. */
  format: number;
}

/**
 * The outcome of decoding one step payload: either validated content for the
 * record, or a named `format-unknown` anomaly (detail explains what was
 * outside the witnessed contract). There is no third state — the decoder
 * never guesses.
 */
export type StepDecodeResult = { kind: 'ok'; content: string } | { kind: 'anomaly'; detail: string };

/**
 * Serializes one record as a single newline-terminated destination-stream
 * line. Field order follows the contract pin (`v,idx,stepType,status,
 * content,hash,anomaly`) so rendered bytes are deterministic across versions.
 *
 * @param record - The record to serialize. Must satisfy the record invariants
 *   (`hash` equals the SHA-256 of `content`, `v` equals
 *   {@link EMISSION_RECORD_VERSION}); violation throws rather than emitting a
 *   corrupt line.
 * @returns The JSON line including its trailing newline, ready to append.
 * @throws {Error} When the record violates the contract invariants.
 */
export function serializeEmissionRecord(record: EmissionRecord): string {
  assertRecordInvariants(record);
  return `${JSON.stringify({
    v: record.v,
    idx: record.idx,
    stepType: record.stepType,
    status: record.status,
    content: record.content,
    hash: record.hash,
    anomaly: record.anomaly
  })}\n`;
}

/**
 * Parses one destination-stream line into a record.
 *
 * Returns `null` for any line that is not a complete, well-formed record
 * (torn trailing bytes, invalid JSON, schema mismatch) — torn bytes are never
 * surfaced to the renderer; the row stays eligible for re-emit.
 *
 * @param line - One line from the destination stream, without its newline.
 * @returns The parsed record, or `null` when the line is not a valid record.
 */
export function parseEmissionRecordLine(line: string): EmissionRecord | null {
  if (line.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  const anomalyRaw = obj['anomaly'];
  let anomaly: EmissionRecord['anomaly'];
  if (anomalyRaw === null) {
    anomaly = null;
  } else if (typeof anomalyRaw === 'object' && anomalyRaw !== null) {
    const kind = (anomalyRaw as Record<string, unknown>)['kind'];
    const detail = (anomalyRaw as Record<string, unknown>)['detail'];
    if (typeof kind !== 'string' || !ANOMALY_KINDS.has(kind as EmissionAnomaly['kind'])) return null;
    if (typeof detail !== 'string') return null;
    anomaly = { kind: kind as EmissionAnomaly['kind'], detail };
  } else {
    return null;
  }
  const record: EmissionRecord = {
    v: obj['v'] as EmissionRecord['v'],
    idx: obj['idx'] as number,
    stepType: obj['stepType'] as number,
    status: obj['status'] as number,
    content: obj['content'] as string,
    hash: obj['hash'] as string,
    anomaly
  };
  try {
    assertRecordInvariants(record);
  } catch {
    return null;
  }
  return record;
}
