/**
 * Pure transform: Codex rollout JSONL lines → rendered transcript items.
 *
 * This module converts an array of raw rollout JSONL strings into a list of
 * {@link TranscriptItem} values that the `CodexExpandedView` renders. The
 * transform is stateless and rebuilds from scratch on every call, so an
 * incremental append or a file reset produces correct output from the
 * replacement lines alone.
 *
 * Three defensive contracts hold throughout:
 * 1. `function_call.arguments` is a raw string — pretty-print is attempted
 *    inside a try/catch and falls back to the raw string on failure.
 * 2. `function_call_output.output` is `string | ContentItem[]` — both shapes
 *    are handled without throwing on the other.
 * 3. Orphan `function_call_output` (no preceding `function_call` with a
 *    matching `call_id`) is rendered standalone in source order, not dropped.
 *
 * @summary Pure transform from raw Codex rollout lines to rendered transcript items
 * @module streams/codex-session/www/lib/render-transcript
 */

import { createTurnDedupMatcher, extractMessageText } from './dedup.js';
import type { ContentItem, EventMsgPayload, ResponseItemPayload } from './parser.js';
import { type CodexRolloutLine, parseCodexLine } from './parser.js';

/**
 * A rendered transcript item produced by {@link renderCodexTranscript}.
 */
export type TranscriptItem =
  | { kind: 'session_header'; model?: string; cwd?: string; timestamp?: string }
  | { kind: 'user_message'; text: string; timestamp?: string }
  | { kind: 'assistant_message'; text: string; timestamp?: string }
  | { kind: 'reasoning'; summaryText: string; timestamp?: string }
  | {
      kind: 'tool_call';
      name: string;
      callId: string;
      argumentsText: string;
      prettyPrinted: boolean;
      outputText?: string;
      hasOutput: boolean;
      timestamp?: string;
    }
  | { kind: 'orphan_output'; callId: string; outputText: string; timestamp?: string }
  | { kind: 'unknown_item'; rawJson: string; timestamp?: string }
  | { kind: 'malformed'; rawLine: string };

/**
 * Converts raw rollout JSONL lines into a flat list of transcript items.
 *
 * Source order is preserved. `function_call` and `function_call_output` are
 * paired by `call_id` when available; unpaired calls render without an output
 * block; orphan outputs render standalone in source order. Malformed lines
 * produce an isolated error block so the rest of the transcript is unaffected.
 *
 * @param lines - Raw rollout JSONL lines from the stream store.
 * @returns Flat list of transcript items in display order.
 */
export function renderCodexTranscript(lines: string[]): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  // Tracks the index in `items` of each emitted tool_call so a later output can
  // be attached to its originating call in place, preserving source order.
  const callItemIndex = new Map<string, number>();
  // Bidirectional, order-independent turn-scoped dedup matcher.
  // Works regardless of whether response_item or event_msg arrives first.
  const dedup = createTurnDedupMatcher();

  for (const raw of lines) {
    const line = parseCodexLine(raw);

    // Maintain the turn-scoped window for deduplication.
    if (line.kind === 'turn_context') {
      dedup.reset();
    } else if (line.kind === 'response_item') {
      // Suppress response_item messages that mirror an already-seen event_msg.
      if (dedup.processResponseItem(line.payload)) {
        continue;
      }
    } else if (line.kind === 'event_msg') {
      // Suppress event_msg messages that mirror a same-turn response_item message.
      if (dedup.processEventMsg(line.payload)) {
        continue;
      }
    }

    const produced = lineToItems(line);

    for (const item of produced) {
      if (item.kind === 'tool_call') {
        callItemIndex.set(item.callId, items.length);
        items.push(item);
      } else if (item.kind === 'orphan_output') {
        // Attach to a preceding call when one exists; otherwise render standalone.
        const callIdx = callItemIndex.get(item.callId);
        if (callIdx !== undefined) {
          const target = items[callIdx];
          if (target !== undefined && target.kind === 'tool_call') {
            target.outputText = item.outputText;
            target.hasOutput = true;
            continue;
          }
        }
        items.push(item);
      } else {
        items.push(item);
      }
    }
  }

  return items;
}

/**
 * Parses a `function_call.arguments` raw string for display.
 *
 * Attempts `JSON.parse` and pretty-prints on success. Falls back to the raw
 * string on failure — no throw, no blank output. This is the only place that
 * wraps `JSON.parse` for arguments; callers never call `JSON.parse` directly
 * on this value.
 *
 * @param raw - The raw arguments string from the `function_call` payload.
 * @returns `{ text, prettyPrinted }` — the display string and whether it was pretty-printed.
 */
export function parseArguments(raw: string): { text: string; prettyPrinted: boolean } {
  try {
    const parsed: unknown = JSON.parse(raw);
    return { text: JSON.stringify(parsed, null, 2), prettyPrinted: true };
  } catch {
    return { text: raw, prettyPrinted: false };
  }
}

/**
 * Extracts a flat display string from a `function_call_output` or
 * `custom_tool_call_output` output value (`string | ContentItem[]`).
 *
 * A plain string is returned as-is. A `ContentItem[]` has its `input_text`
 * and `output_text` items concatenated in source order. Neither shape throws
 * on the other.
 *
 * @param output - The output value from the function call output payload.
 * @returns The flat display string.
 */
export function extractOutputText(output: unknown): string {
  if (typeof output === 'string') {
    return output;
  }
  if (Array.isArray(output)) {
    return extractMessageText(output as ContentItem[]);
  }
  return '';
}

/**
 * Converts a {@link CodexRolloutLine} into zero or more transcript items.
 *
 * Accepts a pre-parsed line so callers can reuse a single parse pass.
 * Returns an empty array for lines that do not produce visible output
 * (e.g. `turn_context`, `compacted` markers); returns a single-element
 * array for most visible lines; may return more than one item only for
 * `response_item` lines that carry both a message and embedded reasoning.
 *
 * Deduplication (suppressing the later of a mirrored event_msg/response_item
 * message pair within a turn) is the caller's responsibility — callers should
 * filter through a {@link createTurnDedupMatcher} instance before passing the
 * line here.
 *
 * @param line - A pre-parsed Codex rollout line.
 * @returns Zero or more transcript items derived from this line.
 */
export function lineToItems(line: CodexRolloutLine): TranscriptItem[] {
  switch (line.kind) {
    case 'malformed':
      return [{ kind: 'malformed', rawLine: line.raw }];

    case 'unknown':
      return [{ kind: 'unknown_item', rawJson: JSON.stringify(line.raw, null, 2), timestamp: line.timestamp }];

    case 'session_meta':
      return [
        {
          kind: 'session_header',
          model: line.payload.model,
          cwd: line.payload.cwd,
          timestamp: line.timestamp === '' ? undefined : line.timestamp
        }
      ];

    case 'turn_context':
    case 'compacted':
      // No directly visible transcript item; turn boundaries and compaction
      // markers do not render as standalone entries.
      return [];

    case 'event_msg':
      return eventMsgToItems(line.payload, line.timestamp);

    case 'response_item':
      return responseItemToItems(line.payload, line.timestamp);

    default:
      return [];
  }
}

/**
 * Converts an `event_msg` payload into zero or one transcript item.
 *
 * Only user/assistant message events render; token counts and lifecycle events
 * produce no standalone transcript entry here.
 *
 * @param rawPayload - The `event_msg` payload.
 * @param timestamp - The envelope timestamp (empty string when absent).
 * @returns Zero or one transcript item.
 */
function eventMsgToItems(rawPayload: EventMsgPayload, timestamp: string): TranscriptItem[] {
  const ts = timestamp === '' ? undefined : timestamp;
  const payload = rawPayload as Record<string, unknown> & { type: string };
  const message = typeof payload['message'] === 'string' ? payload['message'] : '';
  if (payload.type === 'agent_message') {
    return [{ kind: 'assistant_message', text: message, timestamp: ts }];
  }
  if (payload.type === 'user_message') {
    return [{ kind: 'user_message', text: message, timestamp: ts }];
  }
  return [];
}

/**
 * Concatenates the `text` of `summary_text` items in a reasoning summary array.
 *
 * @param summary - The reasoning `summary` array.
 * @returns The concatenated summary text.
 */
function extractReasoningSummary(summary: unknown[]): string {
  let text = '';
  for (const item of summary) {
    if (item !== null && typeof item === 'object') {
      const candidate = item as { text?: unknown };
      if (typeof candidate.text === 'string') {
        text += candidate.text;
      }
    }
  }
  return text;
}

/**
 * Converts a `response_item` payload into zero or more transcript items.
 *
 * Tool calls are emitted as `tool_call`; outputs are emitted as `orphan_output`
 * for the caller to pair by `call_id` or render standalone. Unknown nested
 * variants become a readable raw block.
 *
 * @param rawPayload - The `response_item` payload.
 * @param timestamp - The envelope timestamp (empty string when absent).
 * @returns Zero or more transcript items.
 */
function responseItemToItems(rawPayload: ResponseItemPayload, timestamp: string): TranscriptItem[] {
  const ts = timestamp === '' ? undefined : timestamp;
  const payload = rawPayload as Record<string, unknown> & { type: string };

  switch (payload.type) {
    case 'message': {
      const content = Array.isArray(payload['content']) ? (payload['content'] as ContentItem[]) : [];
      const text = extractMessageText(content);
      if (payload['role'] === 'user') {
        return [{ kind: 'user_message', text, timestamp: ts }];
      }
      return [{ kind: 'assistant_message', text, timestamp: ts }];
    }

    case 'reasoning': {
      const summary = Array.isArray(payload['summary']) ? payload['summary'] : [];
      return [{ kind: 'reasoning', summaryText: extractReasoningSummary(summary), timestamp: ts }];
    }

    case 'function_call':
    case 'local_shell_call':
    case 'custom_tool_call':
    case 'tool_search_call':
    case 'web_search_call':
    case 'image_generation_call': {
      const callId = typeof payload['call_id'] === 'string' ? payload['call_id'] : '';
      const name = typeof payload['name'] === 'string' ? payload['name'] : payload.type;
      const rawArgs = typeof payload['arguments'] === 'string' ? payload['arguments'] : '';
      const { text: argumentsText, prettyPrinted } = parseArguments(rawArgs);
      return [
        {
          kind: 'tool_call',
          name,
          callId,
          argumentsText,
          prettyPrinted,
          hasOutput: false,
          timestamp: ts
        }
      ];
    }

    case 'function_call_output':
    case 'custom_tool_call_output':
    case 'tool_search_output': {
      const callId = typeof payload['call_id'] === 'string' ? payload['call_id'] : '';
      const outputText = extractOutputText(payload['output']);
      return [{ kind: 'orphan_output', callId, outputText, timestamp: ts }];
    }

    default:
      return [{ kind: 'unknown_item', rawJson: JSON.stringify(payload, null, 2), timestamp: ts }];
  }
}
