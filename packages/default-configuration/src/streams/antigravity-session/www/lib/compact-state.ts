/**
 * Folds an `antigravity-session` destination stream into the bounded state
 * the compact timeline view shows.
 *
 * The compact view bootstraps from the stream store and reconciles
 * incrementally via {@link reconcileFolded}: lines past a
 * {@link FoldedState.lineCount} watermark are folded onto the prior
 * {@link AntigravityFoldState}, so appending costs work proportional to the
 * new lines rather than the whole session history. A shrink — `lines`
 * shorter than the watermark (truncation or stream replacement) — rebuilds
 * fully from the replacement lines alone.
 *
 * The fold applies the same `(idx, hash)` idempotence as the expanded
 * transcript (a re-emitted identical record neither re-tallies nor re-enters
 * the tail), so incremental appends stay equivalent to a full rebuild:
 * dedupe is a set, which is order-independent by construction.
 *
 * @summary Builds bounded compact-view state from destination records
 * @module streams/antigravity-session/www/lib/compact-state
 */

import { parseAntigravityLine } from './parser.js';

/**
 * One bounded entry in the compact view's recent-activity tail.
 */
export interface AntigravityTailEvent {
  kind: 'step' | 'anomaly' | 'malformed';
  text: string;
  /** Escalation level — present only for anomaly/corruption entries. */
  severity?: 'error';
}

/**
 * Bounded summary state for the Antigravity compact timeline view. The tail
 * is capped at roughly five items with the newest last.
 */
export interface AntigravityCompactState {
  isActive: boolean;
  headlineText: string;
  /** Unique accepted terminal steps (post `(idx, hash)` idempotence). */
  stepCount: number;
  /** Named anomaly events rendered (host-drift, flush-partial, format-unknown). */
  anomalyCount: number;
  /** Lines that failed the pinned record shape. */
  malformedCount: number;
  tail: AntigravityTailEvent[];
  /** `true` when at least one line failed the pinned record shape. */
  hasErrors: boolean;
}

/**
 * Mutable fold accumulator: every piece of state that carries across lines.
 * Carried forward across incremental appends by {@link reconcileFolded}.
 */
export interface AntigravityFoldState {
  stepCount: number;
  anomalyCount: number;
  malformedCount: number;
  latestStepText: string | undefined;
  tail: AntigravityTailEvent[];
  /** Every accepted `(idx, hash)` pair — the idempotence key set. */
  seen: Set<string>;
}

/**
 * A folded {@link AntigravityCompactState} paired with the count of source
 * lines folded into it.
 */
export interface FoldedState {
  /** Bounded summary snapshot for rendering, fresh per reconcile/build. */
  state: AntigravityCompactState;
  /** Mutable accumulator every folded line has contributed to. */
  fold: AntigravityFoldState;
  /** Number of `lines` already folded into {@link FoldedState.fold}. */
  lineCount: number;
}

/** Maximum number of items retained in the bounded recent-activity tail. */
const MAX_TAIL = 5;

/** Display cap for one tail entry's text (single clipped line downstream). */
const MAX_TAIL_TEXT = 200;

/**
 * Creates a fresh fold accumulator with all fields at their initial defaults.
 * @returns Initial fold accumulator.
 */
function makeFold(): AntigravityFoldState {
  return {
    stepCount: 0,
    anomalyCount: 0,
    malformedCount: 0,
    latestStepText: undefined,
    tail: [],
    seen: new Set<string>()
  };
}

/**
 * Appends one entry to the bounded tail, dropping the oldest past the cap.
 *
 * @param fold - The mutable fold accumulator to append to.
 * @param event - The entry to append.
 */
function pushTail(fold: AntigravityFoldState, event: AntigravityTailEvent): void {
  fold.tail.push(event);
  if (fold.tail.length > MAX_TAIL) {
    fold.tail.shift();
  }
}

/**
 * Truncates one tail entry's text to the display cap, marking a clip.
 *
 * @param text - The raw text to clip.
 * @returns The clipped single-line text.
 */
function clip(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > MAX_TAIL_TEXT ? `${flat.slice(0, MAX_TAIL_TEXT)}…` : flat;
}

/**
 * Processes a single destination-stream line into the mutable fold
 * accumulator.
 *
 * @param fold - The mutable fold accumulator to update in place.
 * @param raw - Raw destination-stream JSONL line to process.
 */
function processLine(fold: AntigravityFoldState, raw: string): void {
  const line = parseAntigravityLine(raw);
  if (line.kind === 'blank') {
    return;
  }
  if (line.kind === 'malformed') {
    fold.malformedCount += 1;
    pushTail(fold, { kind: 'malformed', text: clip(line.reason), severity: 'error' });
    return;
  }

  const record = line.record;
  const key = `${record.idx}:${record.hash}`;
  if (fold.seen.has(key)) {
    return;
  }
  fold.seen.add(key);

  if (record.anomaly === null) {
    fold.stepCount += 1;
    fold.latestStepText = record.content;
    pushTail(fold, { kind: 'step', text: clip(record.content) });
    return;
  }

  fold.anomalyCount += 1;
  pushTail(fold, {
    kind: 'anomaly',
    text: clip(`${record.anomaly.kind} · ${record.anomaly.detail}`),
    severity: 'error'
  });
}

/**
 * Derives the bounded {@link AntigravityCompactState} snapshot from a fold
 * accumulator.
 *
 * @param fold - The fold accumulator to snapshot.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The bounded compact-view state snapshot.
 */
function snapshot(fold: AntigravityFoldState, isActive: boolean): AntigravityCompactState {
  return {
    isActive,
    headlineText: fold.latestStepText ?? '',
    stepCount: fold.stepCount,
    anomalyCount: fold.anomalyCount,
    malformedCount: fold.malformedCount,
    // Fresh array reference so React sees a changed snapshot.
    tail: [...fold.tail],
    hasErrors: fold.malformedCount > 0
  };
}

/**
 * Rebuilds {@link AntigravityCompactState} from the full line array.
 *
 * Pure with respect to `lines`: counts, headline, and the bounded tail are
 * all recomputed from scratch, so passing a shorter replacement array after
 * a reset yields fresh state with no stale carryover.
 *
 * @param lines - The authoritative accumulated destination-stream lines.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The bounded compact-view state.
 */
export function buildAntigravityCompactState(lines: string[], isActive: boolean): AntigravityCompactState {
  const fold = makeFold();
  for (const raw of lines) {
    processLine(fold, raw);
  }
  return snapshot(fold, isActive);
}

/**
 * Folds `lines` from scratch into a {@link FoldedState} ready for
 * {@link reconcileFolded}. This is the view's boot value.
 *
 * @param lines - The authoritative accumulated destination-stream lines.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The folded state with its line watermark.
 */
export function buildFoldedState(lines: string[], isActive: boolean): FoldedState {
  const fold = makeFold();
  for (const raw of lines) {
    processLine(fold, raw);
  }
  return { state: snapshot(fold, isActive), fold, lineCount: lines.length };
}

/**
 * Reconciles a previously folded {@link FoldedState} against the
 * authoritative current `lines`.
 *
 * Carrying the folded line count inside the returned value keeps the
 * watermark from ever drifting from the lines the state was actually built
 * from: the host boots the iframe with no lines and the store delivers the
 * history via an asynchronous `subscribe:response`, which is reconciled here
 * whenever it lands.
 *
 * New trailing lines (the common append, and the initial history fold) are
 * folded incrementally onto the prior accumulator; a shrink — `lines`
 * shorter than what was folded — triggers a full rebuild so no stale tally
 * survives. When the line count and liveness are unchanged the previous
 * folded value is returned by reference so React can bail out of a
 * re-render.
 *
 * @param prev - The previously folded state and its line watermark.
 * @param lines - The authoritative current lines from the store.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The reconciled folded state; `prev` by reference when nothing changed.
 */
export function reconcileFolded(prev: FoldedState, lines: string[], isActive: boolean): FoldedState {
  const n = lines.length;
  if (n === prev.lineCount && isActive === prev.state.isActive) return prev;
  if (n < prev.lineCount) return buildFoldedState(lines, isActive);
  const fold = prev.fold;
  for (let i = prev.lineCount; i < n; i++) {
    const line = lines[i];
    if (line !== undefined) processLine(fold, line);
  }
  return { state: snapshot(fold, isActive), fold, lineCount: n };
}
