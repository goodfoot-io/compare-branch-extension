/**
 * Per-record parser for the `antigravity-session` destination stream.
 *
 * The sqlite-poll transcript engine emits one normalized JSON record per line
 * (the orchestrator-pinned destination contract):
 *
 * `{"v":1,"idx":<number>,"stepType":<number>,"status":<number>,"content":<string>,"hash":"<sha256-of-content-hex>","anomaly":null|{"kind":"host-drift"|"flush-partial"|"format-unknown","detail":"<string>"}}`
 *
 * Parsing is fail-closed: every field is validated against the pinned shape
 * and any deviation yields a named {@link AntigravityMalformedLine} instead of
 * a best-effort record — a malformed record renders as visible named evidence
 * and never contributes transcript content.
 *
 * @summary Antigravity destination-record parser
 * @module streams/antigravity-session/www/lib/parser
 */

/** Record format version accepted by this renderer; anything else is malformed. */
export const ANTIGRAVITY_RECORD_VERSION = 1;

/**
 * Named anomaly kinds the engine may attach to a record.
 *
 * - `host-drift`: the source `steps` row was revised after its terminal
 *   emission; the record re-emits the revised content for an idx already
 *   rendered.
 * - `flush-partial`: the row was flushed before reaching terminal state; the
 *   content is named partial evidence, not a final transcript step.
 * - `format-unknown`: the row's payload used a `step_format` this engine
 *   build cannot decode; the content is undecodable bytes and must never
 *   render as text.
 */
export type AntigravityAnomalyKind = 'host-drift' | 'flush-partial' | 'format-unknown';

/**
 * The anomaly block a record may carry.
 */
export interface AntigravityAnomaly {
  /** Which named anomaly this is. */
  kind: AntigravityAnomalyKind;
  /** Engine-provided human-readable detail. */
  detail: string;
}

/**
 * One validated destination-stream record.
 */
export interface AntigravityRecord {
  /** Record format version; exactly {@link ANTIGRAVITY_RECORD_VERSION}. */
  v: 1;
  /** Source `steps` row index; the transcript's ordering key. */
  idx: number;
  /** Source row's `step_type` value (opaque number; semantics unpinned). */
  stepType: number;
  /** Source row's terminal `status` value (opaque number; semantics unpinned). */
  status: number;
  /** Decoded step content. */
  content: string;
  /** Lowercase hex SHA-256 of `content`, as emitted by the engine. */
  hash: string;
  /** Attached anomaly, or `null` for a clean terminal record. */
  anomaly: AntigravityAnomaly | null;
}

/** Outcome of parsing one stream line. */
export type ParsedAntigravityLine =
  | { kind: 'record'; record: AntigravityRecord }
  | { kind: 'blank' }
  | { kind: 'malformed'; rawLine: string; reason: string };

/** SHA-256 lowercase-hex shape the contract pins for `hash`. */
const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

/** The three anomaly kinds, as a lookup set for validation. */
const ANOMALY_KINDS: ReadonlySet<string> = new Set(['host-drift', 'flush-partial', 'format-unknown']);

/**
 * Validates that `value` is a finite integer.
 *
 * @param value - The value to check.
 * @returns True when the value is a finite integer.
 */
function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value);
}

/**
 * The source `idx` the engine reserves for the mid-stream schema-fingerprint
 * drift sentinel — an anomaly-class record, never a step index. Real `steps`
 * rows are non-negative, so `-1` cannot collide.
 */
export const SCHEMA_DRIFT_SENTINEL_IDX = -1;

/**
 * Parses one destination-stream line into a validated record.
 *
 * Blank lines yield `{ kind: 'blank' }` (nothing to render — the store's
 * trailing newline is not evidence). Every other deviation from the pinned
 * record shape — non-JSON, non-object, wrong version, non-integer field,
 * non-hex hash, unknown anomaly kind, missing anomaly detail — yields a
 * `{ kind: 'malformed' }` outcome naming the reason; no partial record is
 * ever produced.
 *
 * The engine's mid-stream schema-fingerprint drift rides the reserved
 * `idx: -1` sentinel (stepType/status also `-1`, `content` the human-readable
 * drift detail, `hash` the SHA-256 of that detail, `anomaly.kind`
 * `'host-drift'`). The sentinel is valid only as an anomaly-class record:
 * non-empty content and a `'host-drift'` anomaly with non-empty detail are
 * required. Negative indices other than the sentinel remain malformed.
 *
 * @param line - One raw JSONL line from the stream store.
 * @returns The parse outcome for this line.
 */
export function parseAntigravityLine(line: string): ParsedAntigravityLine {
  if (line.trim().length === 0) {
    return { kind: 'blank' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return { kind: 'malformed', rawLine: line, reason: 'line is not valid JSON' };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { kind: 'malformed', rawLine: line, reason: 'record is not a JSON object' };
  }

  const record = parsed as Record<string, unknown>;

  if (record['v'] !== ANTIGRAVITY_RECORD_VERSION) {
    return {
      kind: 'malformed',
      rawLine: line,
      reason: `unsupported record version ${String(record['v'])} (expected ${ANTIGRAVITY_RECORD_VERSION})`
    };
  }

  if (!isFiniteInteger(record['idx']) || (record['idx'] as number) < SCHEMA_DRIFT_SENTINEL_IDX) {
    return {
      kind: 'malformed',
      rawLine: line,
      reason: 'idx is not a non-negative step index or the -1 schema-drift sentinel'
    };
  }
  if (!isFiniteInteger(record['stepType'])) {
    return { kind: 'malformed', rawLine: line, reason: 'stepType is not an integer' };
  }
  if (!isFiniteInteger(record['status'])) {
    return { kind: 'malformed', rawLine: line, reason: 'status is not an integer' };
  }
  if (typeof record['content'] !== 'string') {
    return { kind: 'malformed', rawLine: line, reason: 'content is not a string' };
  }
  if (typeof record['hash'] !== 'string' || !SHA256_HEX_RE.test(record['hash'])) {
    return { kind: 'malformed', rawLine: line, reason: 'hash is not a lowercase sha-256 hex digest' };
  }

  const rawAnomaly = record['anomaly'];
  if (rawAnomaly !== null && rawAnomaly !== undefined) {
    if (typeof rawAnomaly !== 'object' || Array.isArray(rawAnomaly)) {
      return { kind: 'malformed', rawLine: line, reason: 'anomaly is neither null nor an object' };
    }
    const anomaly = rawAnomaly as Record<string, unknown>;
    if (typeof anomaly['kind'] !== 'string' || !ANOMALY_KINDS.has(anomaly['kind'])) {
      return { kind: 'malformed', rawLine: line, reason: 'anomaly.kind is not a known anomaly kind' };
    }
    if (typeof anomaly['detail'] !== 'string' || anomaly['detail'].length === 0) {
      return { kind: 'malformed', rawLine: line, reason: 'anomaly.detail is not a non-empty string' };
    }
  }

  const idx = record['idx'] as number;
  if (idx === SCHEMA_DRIFT_SENTINEL_IDX) {
    // Sentinel validity: non-empty content (the human-readable drift detail)
    // and a host-drift anomaly (non-empty detail is already enforced above).
    if (record['content'].length === 0) {
      return { kind: 'malformed', rawLine: line, reason: 'schema-drift sentinel requires non-empty content' };
    }
    if (rawAnomaly === null || rawAnomaly === undefined) {
      return {
        kind: 'malformed',
        rawLine: line,
        reason: 'schema-drift sentinel requires a host-drift anomaly'
      };
    }
    if ((rawAnomaly as { kind: string }).kind !== 'host-drift') {
      return {
        kind: 'malformed',
        rawLine: line,
        reason: 'schema-drift sentinel anomaly kind must be host-drift'
      };
    }
  }

  return {
    kind: 'record',
    record: {
      v: 1,
      idx,
      stepType: record['stepType'] as number,
      status: record['status'] as number,
      content: record['content'],
      hash: record['hash'],
      anomaly:
        rawAnomaly === null || rawAnomaly === undefined
          ? null
          : {
              kind: (rawAnomaly as { kind: AntigravityAnomalyKind }).kind,
              detail: (rawAnomaly as { detail: string }).detail
            }
    }
  };
}
