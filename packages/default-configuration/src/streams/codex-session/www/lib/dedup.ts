/**
 * Turn-scoped deduplication of semantically equivalent message content.
 *
 * Equivalent user/assistant text can appear on both the `event_msg` side
 * (`AgentMessageEvent.message` / `UserMessageEvent.message`, flat strings) and
 * the `response_item` side (`ResponseItem::Message.content`, a `ContentItem[]`).
 * The two sides share no identifier and `MessagePhase` is not emitted
 * consistently, so suppression is structural and conservative:
 *
 * 1. **Turn-scoped window** — an `event_msg` is suppressed only when it matches
 *    a `response_item` message seen since the most recent `turn_context` line.
 *    The caller resets `currentTurnResponseItems` at each `turn_context`
 *    boundary, so identical text in different turns is never cross-suppressed.
 * 2. **Structured text extraction** — {@link extractMessageText} concatenates
 *    the `input_text`/`output_text` items of a message in source order into one
 *    flat string, compared exactly (after trimming) against the `event_msg`
 *    string. Whitespace inside content is not normalized away.
 *
 * @summary Suppresses event_msg lines duplicated by a same-turn response_item
 * @module streams/codex-session/www/lib/dedup
 */

import type { ContentItem, EventMsgPayload, ResponseItemPayload } from './parser.js';

/**
 * Concatenates the textual content of a message's content items into one string.
 *
 * Walks `content` in source order, appending the `text` of each `input_text`
 * and `output_text` item; non-text items (e.g. `input_image`) are skipped. An
 * empty array yields the empty string.
 *
 * @param content - The `ContentItem[]` of a `ResponseItem::Message`.
 * @returns The concatenated flat text.
 */
export function extractMessageText(content: ContentItem[]): string {
  let text = '';
  for (const item of content) {
    if (item.type === 'input_text' || item.type === 'output_text') {
      const value = (item as { text?: unknown }).text;
      if (typeof value === 'string') {
        text += value;
      }
    }
  }
  return text;
}

/**
 * Decides whether an `event_msg` duplicates a same-turn `response_item` message.
 *
 * Returns `true` only when `candidate` is a user/assistant message whose trimmed
 * `message` string equals the {@link extractMessageText} output of a same-role
 * message in `currentTurnResponseItems` (the window since the last
 * `turn_context`). Token counts, lifecycle events, and any non-message event
 * are never suppressed.
 *
 * @param currentTurnResponseItems - Response-item payloads seen since the last
 *   `turn_context` boundary; the caller resets this list at each boundary.
 * @param candidate - The `event_msg` payload under consideration.
 * @returns `true` when the event_msg should be suppressed as a duplicate.
 */
export function isDuplicateEventMsg(
  currentTurnResponseItems: ResponseItemPayload[],
  candidate: EventMsgPayload
): boolean {
  // Only user/assistant message events are candidates for suppression; token
  // counts, lifecycle events, and every other variant are never suppressed.
  let candidateRole: string;
  if (candidate.type === 'agent_message') {
    candidateRole = 'assistant';
  } else if (candidate.type === 'user_message') {
    candidateRole = 'user';
  } else {
    return false;
  }

  const message = (candidate as { message?: unknown }).message;
  const candidateText = (typeof message === 'string' ? message : '').trim();

  for (const rawItem of currentTurnResponseItems) {
    const item = rawItem as Record<string, unknown> & { type: string };
    if (item.type !== 'message' || item['role'] !== candidateRole) {
      continue;
    }
    const content = Array.isArray(item['content']) ? (item['content'] as ContentItem[]) : [];
    if (extractMessageText(content).trim() === candidateText) {
      return true;
    }
  }
  return false;
}
