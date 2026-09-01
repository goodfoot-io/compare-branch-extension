/**
 * Pure transform: `antigravity-session` destination JSONL lines → rendered
 * transcript items.
 *
 * Three contract duties (orchestrator-pinned destination-record contract):
 *
 * 1. **Ordering by source `idx`.** Arrival order is not the contract — the
 *    engine's out-of-order finalization is a designed-for behavior — so
 *    accepted records are sorted by `idx` with a stable sort. Same-`idx`
 *    records keep their arrival order, which is what makes the collation
 *    rules below deterministic: the original record always arrives before
 *    its re-emissions.
 * 2. **Consumer-side idempotence keyed on `(idx, hash)`.** A record whose
 *    `(idx, hash)` pair was already accepted collapses silently — the
 *    engine's re-reads re-emit the identical terminal record.
 * 3. **Anomaly collation.** A `host-drift` record (an idx already rendered,
 *    revised content) survives dedupe (its hash differs) and renders as a
 *    visible named anomaly event collated directly after the original. A
 *    `flush-partial` record renders as named-partial evidence. A
 *    `format-unknown` record renders as named-unreadable content — the
 *    undecodable payload is withheld (byte count only), never rendered as
 *    garbage text.
 * 4. **Schema-fingerprint sentinel.** The engine's mid-stream schema drift
 *    rides the reserved `idx: -1` sentinel (anomaly-class, host-drift). It is
 *    excluded from the idx-ordered step sequence — its reserved index must
 *    never sort against real step indices — and renders in a dedicated
 *    trailing drift section in arrival order.
 *
 * Malformed lines (parser failures) have no `idx` anchor, so they cannot take
 * part in idx ordering; they render after the ordered steps (and the drift
 * section) in arrival order as named fail-closed evidence. Nothing is ever
 * dropped silently.
 *
 * The transform is stateless and rebuilds from scratch on every call, so an
 * incremental append or a file reset produces correct output from the
 * replacement lines alone.
 *
 * @summary Pure transform from destination records to rendered transcript items
 * @module streams/antigravity-session/www/lib/render-transcript
 */

import type { AntigravityRecord } from './parser.js';
import { parseAntigravityLine, SCHEMA_DRIFT_SENTINEL_IDX } from './parser.js';

/**
 * A rendered transcript item produced by {@link renderAntigravityTranscript}.
 */
export type TranscriptItem =
  | { kind: 'step'; idx: number; stepType: number; status: number; content: string }
  | {
      /** Named-partial evidence: the row was flushed before reaching terminal state. */
      kind: 'partial';
      idx: number;
      stepType: number;
      status: number;
      content: string;
      detail: string;
    }
  | {
      /** Visible named anomaly event: the source row was revised after its terminal emission. */
      kind: 'drift';
      idx: number;
      stepType: number;
      status: number;
      content: string;
      detail: string;
    }
  | {
      /** Named-unreadable content: the payload's format is unknown; content is withheld. */
      kind: 'unreadable';
      idx: number;
      stepType: number;
      status: number;
      withheldBytes: number;
      detail: string;
    }
  | {
      /** Session-level schema-fingerprint drift sentinel (idx -1); host-drift-class, never a step. */
      kind: 'schema_drift';
      content: string;
      detail: string;
    }
  | { kind: 'malformed'; rawLine: string; reason: string };

/**
 * Builds the transcript item for one accepted step record (idx >= 0),
 * applying the anomaly-specific treatment (see module doc).
 *
 * @param record - An accepted (deduped) destination record for a real step.
 * @returns The transcript item for this record.
 */
function stepRecordToItem(record: AntigravityRecord): TranscriptItem {
  const { idx, stepType, status, content, anomaly } = record;
  if (anomaly === null) {
    return { kind: 'step', idx, stepType, status, content };
  }
  switch (anomaly.kind) {
    case 'flush-partial':
      return { kind: 'partial', idx, stepType, status, content, detail: anomaly.detail };
    case 'host-drift':
      return { kind: 'drift', idx, stepType, status, content, detail: anomaly.detail };
    case 'format-unknown':
      // The payload is undecodable bytes: render the named-unreadable block
      // with the withheld byte count only — never the content itself.
      return { kind: 'unreadable', idx, stepType, status, withheldBytes: content.length, detail: anomaly.detail };
    default: {
      // Parser validation makes this unreachable; kept exhaustive for the union.
      return { kind: 'step', idx, stepType, status, content };
    }
  }
}

/**
 * Converts the engine's mid-stream schema-fingerprint drift sentinel
 * (`idx: -1`, host-drift anomaly, content = the human-readable drift detail)
 * into its transcript item.
 *
 * @param record - An accepted sentinel record.
 * @returns The session-level drift event item.
 */
function sentinelToItem(record: AntigravityRecord): TranscriptItem {
  return {
    kind: 'schema_drift',
    content: record.content,
    detail: record.anomaly?.detail ?? record.content
  };
}

/**
 * Converts raw destination-stream JSONL lines into a flat list of transcript
 * items.
 *
 * Accepted step records (idx >= 0) render idx-ordered (stable; see module doc
 * for the same-`idx` collation guarantees). Identical `(idx, hash)` duplicates
 * collapse — including re-emitted drift sentinels, whose hash is the SHA-256
 * of their detail, so distinct schema-fingerprint changes never collapse while
 * an identical re-emission does. The engine's mid-stream schema-fingerprint
 * sentinel (`idx: -1`) is an anomaly-class record, never a step: it is
 * excluded from the idx-ordered sequence entirely and renders in a dedicated
 * trailing drift section in arrival order, ahead of the malformed section.
 * Malformed lines render in arrival order as named fail-closed evidence;
 * blank lines are skipped. Nothing is ever dropped silently.
 *
 * @param lines - Raw destination-stream JSONL lines from the stream store.
 * @returns Flat list of transcript items in display order.
 */
export function renderAntigravityTranscript(lines: string[]): TranscriptItem[] {
  const malformed: TranscriptItem[] = [];
  const sentinels: TranscriptItem[] = [];
  const accepted: AntigravityRecord[] = [];
  // Consumer-side idempotence: every accepted (idx, hash) pair, so an
  // identical re-emission collapses regardless of arrival position.
  const seen = new Set<string>();
  for (const raw of lines) {
    const line = parseAntigravityLine(raw);
    if (line.kind === 'blank') {
      continue;
    }
    if (line.kind === 'malformed') {
      malformed.push({ kind: 'malformed', rawLine: line.rawLine, reason: line.reason });
      continue;
    }
    const key = `${line.record.idx}:${line.record.hash}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (line.record.idx === SCHEMA_DRIFT_SENTINEL_IDX) {
      sentinels.push(sentinelToItem(line.record));
      continue;
    }
    accepted.push(line.record);
  }

  // Stable sort by the source idx: same-idx records keep arrival order, so an
  // original always renders before a same-idx re-emission (drift collates
  // deterministically after the original) and a partial flush renders before
  // the terminal record that later supersedes it. Array#sort is stable in
  // every runtime this bundle targets (ES2019+ semantics). Sentinels never
  // enter this sort — their reserved -1 idx must never sort against real
  // step indices.
  const ordered = [...accepted].sort((a, b) => a.idx - b.idx);

  return [...ordered.map(stepRecordToItem), ...sentinels, ...malformed];
}
