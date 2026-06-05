/**
 * Folds a Codex rollout into the bounded state the compact timeline view shows.
 *
 * The compact view bootstraps from the stream store, then folds the full line
 * array on each update. {@link buildCodexCompactState} is therefore a pure
 * rebuild from `lines` — it holds no watermark, so a stream shrink/reset
 * produces correct state from the replacement lines alone.
 *
 * @summary Builds bounded compact-view state from Codex rollout lines
 * @module streams/codex-session/www/lib/compact-state
 */

/**
 * A single bounded entry in the compact view's recent-activity tail.
 *
 * `kind` distinguishes an assistant/user message from a tool call from a
 * lifecycle/metric event; `text` is the already-trimmed display string.
 */
export interface CodexTailEvent {
  kind: 'message' | 'tool' | 'event';
  text: string;
}

/**
 * Bounded summary state for the Codex compact timeline view.
 *
 * `durationMs` is derived from the first and most recent line timestamps rather
 * than a lifecycle event, so it is available even for sessions that ended
 * abnormally. `tail` is capped at roughly five items with the newest last.
 */
export interface CodexCompactState {
  isActive: boolean;
  headlineText: string;
  turnCount: number;
  toolCallCount: number;
  tokenCount: { input: number; output: number } | undefined;
  model: string | undefined;
  durationMs: number | undefined;
  tail: CodexTailEvent[];
}

/**
 * Rebuilds {@link CodexCompactState} from the full rollout line array.
 *
 * Pure with respect to `lines`: counts, headline, token totals, duration, and
 * the bounded tail are all recomputed from scratch, so passing a shorter
 * replacement array after a reset yields fresh state with no stale carryover.
 *
 * @param _lines - The authoritative accumulated rollout JSONL lines.
 * @param _isActive - Whether the underlying stream is still live.
 * @returns The bounded compact-view state.
 * @throws Error 'not implemented' — Phase 1 stub.
 */
export function buildCodexCompactState(_lines: string[], _isActive: boolean): CodexCompactState {
  throw new Error('not implemented');
}
