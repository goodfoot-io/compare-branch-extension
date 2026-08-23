/**
 * Folds a Codex rollout into the bounded state the compact timeline view shows.
 *
 * The compact view bootstraps from the stream store and reconciles incrementally
 * via {@link reconcileFolded}: lines past a {@link FoldedState.lineCount}
 * watermark are folded onto the prior {@link CodexFoldState}, so appending costs
 * work proportional to the new lines rather than the whole session history. A
 * shrink — `lines` shorter than the watermark (truncation or stream
 * replacement) — rebuilds fully from the replacement lines alone.
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
  /** Escalation level — present only when the entry represents an error, driving a red tail line and the error dot. */
  severity?: 'error';
  /**
   * The `call_id` of the originating tool call, when `kind` is `'tool'`.
   * Enables back-patching severity after output/error events are processed.
   */
  callId?: string;
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
  /** `true` when at least one tool call in the session produced an error. */
  hasErrors: boolean;
}

import { createTurnDedupMatcher, extractMessageText, type TurnDedupMatcher } from './dedup.js';
import { type CodexRolloutLine, type ContentItem, parseCodexLine } from './parser.js';
import { extractOutputText, shellExitSeverity } from './render-transcript.js';

/**
 * Defensively reads `total_token_usage` from an `event_msg` `token_count` info object.
 *
 * @param info - The `info` field of a `token_count` payload (shape is not guaranteed).
 * @returns The input/output token totals, or `undefined` when absent or malformed.
 */
function readTotalTokenUsage(info: unknown): { input_tokens: number; output_tokens: number } | undefined {
  if (info === null || typeof info !== 'object') {
    return undefined;
  }
  const usage = (info as { total_token_usage?: unknown }).total_token_usage;
  if (usage === null || typeof usage !== 'object') {
    return undefined;
  }
  const { input_tokens: input, output_tokens: output } = usage as {
    input_tokens?: unknown;
    output_tokens?: unknown;
  };
  if (typeof input !== 'number' || typeof output !== 'number') {
    return undefined;
  }
  return { input_tokens: input, output_tokens: output };
}

/** Maximum number of items retained in the bounded recent-activity tail. */
const MAX_TAIL = 5;

/** Tool-call response-item variants counted toward {@link CodexCompactState.toolCallCount}. */
const TOOL_CALL_TYPES = new Set([
  'function_call',
  'local_shell_call',
  'custom_tool_call',
  'tool_search_call',
  'web_search_call',
  'image_generation_call'
]);

/**
 * Parses the elapsed milliseconds between two ISO timestamps.
 *
 * @param first - The earliest line timestamp.
 * @param last - The most recent line timestamp.
 * @returns The non-negative duration, or `undefined` when either timestamp is unusable.
 */
function durationBetween(first: string | undefined, last: string | undefined): number | undefined {
  if (first === undefined || last === undefined) {
    return undefined;
  }
  const start = Date.parse(first);
  const end = Date.parse(last);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return undefined;
  }
  const delta = end - start;
  return delta >= 0 ? delta : undefined;
}

/**
 * Mutable fold accumulator: every piece of state that carries across lines
 * (tallies, bounded tail, turn-scoped de-dup matcher, error-tracking sets).
 * Carried forward across incremental appends by {@link reconcileFolded}.
 */
export interface CodexFoldState {
  turnCount: number;
  toolCallCount: number;
  /** Latest `total_token_usage` seen; later counts win. */
  tokenCount: { input: number; output: number } | undefined;
  model: string | undefined;

  latestAssistantText: string | undefined;
  latestToolName: string | undefined;
  tail: CodexTailEvent[];
  firstTimestamp: string | undefined;
  lastTimestamp: string | undefined;
  /** Bidirectional, order-independent turn-scoped message de-dup; reset per `turn_context`. */
  dedup: TurnDedupMatcher;
  /** Call_ids whose patch failed, shell exited non-zero, or whose deferred error resolved. */
  erroredCallIds: Set<string>;
  /** Call_ids known to be shell invocations, so paired outputs can be classified. */
  shellCallIds: Set<string>;
  /**
   * Errored output call_ids that arrived before their tool call (reverse
   * persistence order); resolved once the call arrives and is classified.
   */
  unmatchedErroredOutputIds: Set<string>;
  /** Set when a session-level `event_msg` type:'error' is seen. */
  sessionHasError: boolean;
}

/**
 * A folded {@link CodexCompactState} paired with the count of source lines
 * folded into it.
 */
export interface FoldedState {
  /** Bounded summary snapshot for rendering, fresh per reconcile/build. */
  state: CodexCompactState;
  /** Mutable accumulator every folded line has contributed to. */
  fold: CodexFoldState;
  /** Number of `lines` already folded into {@link FoldedState.fold}. */
  lineCount: number;
}

/**
 * Creates a fresh fold accumulator with all fields at their initial defaults.
 * @returns Initial fold accumulator.
 */
function makeFold(): CodexFoldState {
  return {
    turnCount: 0,
    toolCallCount: 0,
    tokenCount: undefined,
    model: undefined,
    latestAssistantText: undefined,
    latestToolName: undefined,
    tail: [],
    firstTimestamp: undefined,
    lastTimestamp: undefined,
    dedup: createTurnDedupMatcher(),
    erroredCallIds: new Set<string>(),
    shellCallIds: new Set<string>(),
    unmatchedErroredOutputIds: new Set<string>(),
    sessionHasError: false
  };
}

/**
 * Appends one entry to the bounded tail, dropping the oldest past the cap.
 *
 * @param fold - The mutable fold accumulator to append to.
 * @param event - The entry to append.
 */
function pushTail(fold: CodexFoldState, event: CodexTailEvent): void {
  fold.tail.push(event);
  if (fold.tail.length > MAX_TAIL) {
    fold.tail.shift();
  }
}

/**
 * Marks a call_id errored and immediately back-patches severity onto matching
 * tail entries. Patching at mark-time keeps incremental appends equivalent to
 * a full rebuild: any entry still in the bounded tail is patched exactly when
 * the error signal arrives, whether or not the signal shares the append batch
 * with its tool call.
 *
 * @param fold - The mutable fold accumulator to update.
 * @param callId - The errored tool call's `call_id`.
 */
function markErrored(fold: CodexFoldState, callId: string): void {
  fold.erroredCallIds.add(callId);
  for (const entry of fold.tail) {
    if (entry.callId !== undefined && entry.callId === callId) {
      entry.severity = 'error';
    }
  }
}

/**
 * Processes a single JSONL rollout line into the mutable fold accumulator.
 * @param fold - The mutable fold accumulator to update in place.
 * @param raw - Raw rollout JSONL line to process.
 */
function processLine(fold: CodexFoldState, raw: string): void {
  const line: CodexRolloutLine = parseCodexLine(raw);

  const ts = 'timestamp' in line ? line.timestamp : undefined;
  if (ts !== undefined && ts !== '') {
    if (fold.firstTimestamp === undefined) {
      fold.firstTimestamp = ts;
    }
    fold.lastTimestamp = ts;
  }

  switch (line.kind) {
    case 'turn_context': {
      fold.turnCount += 1;
      fold.dedup.reset();
      // SessionMeta carries no model; the turn's model is the source of truth.
      if (fold.model === undefined && typeof line.payload.model === 'string') {
        fold.model = line.payload.model;
      }
      break;
    }
    case 'response_item': {
      // Suppress response_item messages that mirror an already-seen event_msg.
      if (fold.dedup.processResponseItem(line.payload)) {
        break;
      }
      const payload = line.payload as Record<string, unknown> & { type: string };
      if (payload.type === 'message') {
        const content = Array.isArray(payload['content']) ? (payload['content'] as ContentItem[]) : [];
        const text = extractMessageText(content).trim();
        if (payload['role'] === 'assistant' && text.length > 0) {
          fold.latestAssistantText = text;
        }
        if (text.length > 0) {
          pushTail(fold, { kind: 'message', text });
        }
      } else if (TOOL_CALL_TYPES.has(payload.type)) {
        fold.toolCallCount += 1;
        const name = typeof payload['name'] === 'string' ? payload['name'] : payload.type;
        fold.latestToolName = name;
        const callId = typeof payload['call_id'] === 'string' ? payload['call_id'] : undefined;
        // Track shell calls so their output can be classified for exit-code errors.
        // custom_tool_call can also carry name='shell' (same as function_call).
        if (
          payload.type === 'local_shell_call' ||
          ((payload.type === 'function_call' || payload.type === 'custom_tool_call') && name === 'shell')
        ) {
          if (callId !== undefined) {
            fold.shellCallIds.add(callId);
            // Resolve deferred reverse-path errors: if output arrived before
            // this call and was classified as errored, promote it now that
            // we know the call is a shell invocation.
            if (fold.unmatchedErroredOutputIds.has(callId)) {
              fold.unmatchedErroredOutputIds.delete(callId);
              markErrored(fold, callId);
            }
          }
        }
        pushTail(fold, { kind: 'tool', text: name, callId });
      } else if (payload.type === 'function_call_output' || payload.type === 'custom_tool_call_output') {
        // Classify shell exit codes from paired output.
        const outputCallId = typeof payload['call_id'] === 'string' ? payload['call_id'] : undefined;
        if (outputCallId !== undefined) {
          const outputText = extractOutputText(payload['output']);
          if (fold.shellCallIds.has(outputCallId)) {
            // Forward path: the tool call was already seen, so we can
            // classify the output directly against the known shell call.
            const outcome = shellExitSeverity(outputText);
            if (outcome.severity === 'error') {
              markErrored(fold, outputCallId);
            }
          } else {
            // Reverse path: the output arrived before the tool call, so
            // shellCallIds doesn't contain the callId yet. Classify the
            // output speculatively and defer to unmatchedErroredOutputIds;
            // when the tool call later arrives, it will resolve from there.
            const outcome = shellExitSeverity(outputText);
            if (outcome.severity === 'error') {
              fold.unmatchedErroredOutputIds.add(outputCallId);
            }
          }
        }
      }
      break;
    }
    case 'event_msg': {
      const payload = line.payload as Record<string, unknown> & { type: string };
      if (payload.type === 'token_count') {
        const usage = readTotalTokenUsage(payload['info']);
        if (usage !== undefined) {
          fold.tokenCount = { input: usage.input_tokens, output: usage.output_tokens };
        }
      } else if (payload.type === 'patch_apply_end') {
        if (payload['success'] === false && typeof payload['call_id'] === 'string') {
          markErrored(fold, payload['call_id']);
        }
      } else if (payload.type === 'agent_message' || payload.type === 'user_message') {
        // Suppress event_msg messages that mirror a same-turn response_item message.
        if (fold.dedup.processEventMsg(line.payload)) {
          break;
        }
        const message = typeof payload['message'] === 'string' ? payload['message'] : '';
        const text = message.trim();
        if (text.length > 0) {
          if (payload.type === 'agent_message') {
            fold.latestAssistantText = text;
          }
          pushTail(fold, { kind: 'message', text });
        }
      } else if (payload.type === 'error') {
        fold.sessionHasError = true;
        const message = typeof payload['message'] === 'string' ? payload['message'].trim() : '';
        if (message.length > 0) {
          pushTail(fold, { kind: 'event', text: message, severity: 'error' });
        }
      }
      break;
    }
    default:
      break;
  }
}

/**
 * Derives the bounded {@link CodexCompactState} snapshot from a fold
 * accumulator. Derived values (headline, duration, error flag) stay computed
 * here so appending never needs a post-pass over already-folded history.
 *
 * @param fold - The fold accumulator to snapshot.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The bounded compact-view state snapshot.
 */
function snapshot(fold: CodexFoldState, isActive: boolean): CodexCompactState {
  return {
    isActive,
    headlineText: fold.latestAssistantText ?? fold.latestToolName ?? '',
    turnCount: fold.turnCount,
    toolCallCount: fold.toolCallCount,
    tokenCount: fold.tokenCount,
    model: fold.model,
    durationMs: durationBetween(fold.firstTimestamp, fold.lastTimestamp),
    // Fresh array reference so React sees a changed snapshot; entries may be
    // shared with the accumulator's tail and back-patched in place later.
    tail: [...fold.tail],
    hasErrors: fold.erroredCallIds.size > 0 || fold.sessionHasError
  };
}

/**
 * Rebuilds {@link CodexCompactState} from the full rollout line array.
 *
 * Pure with respect to `lines`: counts, headline, token totals, duration, and
 * the bounded tail are all recomputed from scratch, so passing a shorter
 * replacement array after a reset yields fresh state with no stale carryover.
 *
 * @param lines - The authoritative accumulated rollout JSONL lines.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The bounded compact-view state.
 */
export function buildCodexCompactState(lines: string[], isActive: boolean): CodexCompactState {
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
 * @param lines - The authoritative accumulated rollout JSONL lines.
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
 * Reconciles a previously folded {@link FoldedState} against the authoritative
 * current `lines`.
 *
 * Carrying the folded line count inside the returned value keeps the watermark
 * from ever drifting from the lines the state was actually built from: the host
 * boots the iframe with no lines and the store delivers the history via an
 * asynchronous `subscribe:response`, which is reconciled here whenever it lands.
 *
 * New trailing lines (the common append, and the initial history fold) are
 * folded incrementally onto the prior accumulator; a shrink — `lines` shorter
 * than what was folded — triggers a full rebuild so no stale tally survives.
 * When the line count and liveness are unchanged the previous folded value is
 * returned by reference so React can bail out of a re-render.
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
