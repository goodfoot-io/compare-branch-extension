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
import { extractMessageText, isDuplicateEventMsg } from './dedup.js';
import { type CodexRolloutLine, type ContentItem, parseCodexLine, type ResponseItemPayload } from './parser.js';

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
  let turnCount = 0;
  let toolCallCount = 0;
  let tokenCount: { input: number; output: number } | undefined;
  let model: string | undefined;

  let latestAssistantText: string | undefined;
  let latestToolName: string | undefined;

  const tail: CodexTailEvent[] = [];
  let firstTimestamp: string | undefined;
  let lastTimestamp: string | undefined;
  // Turn-scoped response_item accumulator; reset at each turn_context boundary.
  let currentTurnResponseItems: ResponseItemPayload[] = [];

  const pushTail = (event: CodexTailEvent): void => {
    tail.push(event);
    if (tail.length > MAX_TAIL) {
      tail.shift();
    }
  };

  for (const raw of lines) {
    const line: CodexRolloutLine = parseCodexLine(raw);

    const ts = 'timestamp' in line ? line.timestamp : undefined;
    if (ts !== undefined && ts !== '') {
      if (firstTimestamp === undefined) {
        firstTimestamp = ts;
      }
      lastTimestamp = ts;
    }

    switch (line.kind) {
      case 'session_meta': {
        if (typeof line.payload.model === 'string') {
          model = line.payload.model;
        }
        break;
      }
      case 'turn_context': {
        turnCount += 1;
        currentTurnResponseItems = [];
        if (model === undefined && typeof line.payload.model === 'string') {
          model = line.payload.model;
        }
        break;
      }
      case 'response_item': {
        currentTurnResponseItems.push(line.payload);
        const payload = line.payload as Record<string, unknown> & { type: string };
        if (payload.type === 'message') {
          const content = Array.isArray(payload['content']) ? (payload['content'] as ContentItem[]) : [];
          const text = extractMessageText(content).trim();
          if (payload['role'] === 'assistant' && text.length > 0) {
            latestAssistantText = text;
          }
          if (text.length > 0) {
            pushTail({ kind: 'message', text });
          }
        } else if (TOOL_CALL_TYPES.has(payload.type)) {
          toolCallCount += 1;
          const name = typeof payload['name'] === 'string' ? payload['name'] : payload.type;
          latestToolName = name;
          pushTail({ kind: 'tool', text: name });
        }
        break;
      }
      case 'event_msg': {
        const payload = line.payload as Record<string, unknown> & { type: string };
        if (payload.type === 'token_count') {
          const usage = readTotalTokenUsage(payload['info']);
          if (usage !== undefined) {
            tokenCount = { input: usage.input_tokens, output: usage.output_tokens };
          }
        } else if (payload.type === 'agent_message' || payload.type === 'user_message') {
          // Suppress event_msg messages that mirror a same-turn response_item message.
          if (isDuplicateEventMsg(currentTurnResponseItems, line.payload)) {
            break;
          }
          const message = typeof payload['message'] === 'string' ? payload['message'] : '';
          const text = message.trim();
          if (text.length > 0) {
            if (payload.type === 'agent_message') {
              latestAssistantText = text;
            }
            pushTail({ kind: 'message', text });
          }
        }
        break;
      }
      default:
        break;
    }
  }

  const headlineText = latestAssistantText ?? latestToolName ?? '';

  return {
    isActive,
    headlineText,
    turnCount,
    toolCallCount,
    tokenCount,
    model,
    durationMs: durationBetween(firstTimestamp, lastTimestamp),
    tail
  };
}
