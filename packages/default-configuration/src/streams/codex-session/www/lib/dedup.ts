/**
 * Turn-scoped deduplication of semantically equivalent message content.
 *
 * Equivalent user/assistant text can appear on both the `event_msg` side
 * (`AgentMessageEvent.message` / `UserMessageEvent.message`, flat strings) and
 * the `response_item` side (`ResponseItem::Message.content`, a `ContentItem[]`).
 * The two sides share no identifier and `MessagePhase` is not emitted
 * consistently, so suppression is structural and conservative:
 *
 * 1. **Turn-scoped window** — the matching window resets at every `turn_context`,
 *    so identical text in different turns is never cross-suppressed.
 * 2. **Bidirectional / order-independent** — the dedup matcher works regardless
 *    of which side (response_item or event_msg) arrives first. In the real
 *    Codex persistence order `event_msg` is written before its mirroring
 *    `response_item`; the matcher handles both orderings transparently.
 * 3. **Consumable (one-shot)** — each message suppresses at most ONE mirror.
 *    Two same-side messages with identical text and only one mirror leave exactly
 *    two items: one pairing is consumed, the second same-side occurrence survives.
 * 4. **First-seen wins** — whichever side arrives first in source order is emitted;
 *    the later mirror is suppressed. Source order is therefore preserved.
 * 5. **Structured text extraction** — {@link extractMessageText} concatenates
 *    the `input_text`/`output_text` items of a message in source order into one
 *    flat string, compared exactly (after trimming) against the `event_msg`
 *    string. Whitespace inside content is not normalized away.
 *
 * @summary Bidirectional, order-independent turn-scoped dedup for Codex messages
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
 * A signature key used to pair a `response_item` message with its mirroring
 * `event_msg`. Composed as `role:trimmed-text` for unambiguous matching.
 */
type MessageSig = string;

/**
 * Stateful, turn-scoped deduplication matcher for Codex message pairs.
 *
 * Maintains two consumable pending-signature maps — one for each side of the
 * mirror pair — so that suppression works regardless of which side arrives
 * first within a turn. Call {@link reset} at each `turn_context` boundary.
 *
 * ### Usage pattern
 * ```ts
 * const dedup = createTurnDedupMatcher();
 * for (const line of lines) {
 *   if (line.kind === 'turn_context') { dedup.reset(); ... }
 *   else if (line.kind === 'response_item') {
 *     if (dedup.processResponseItem(line.payload)) continue; // suppressed
 *   } else if (line.kind === 'event_msg') {
 *     if (dedup.processEventMsg(line.payload)) continue;     // suppressed
 *   }
 *   // emit line
 * }
 * ```
 */
export interface TurnDedupMatcher {
  /**
   * Processes a `response_item` message payload.
   *
   * If a matching `event_msg` signature is pending (from an earlier `event_msg`
   * in the same turn), consumes that pending entry and returns `true` (suppress
   * this `response_item`). Otherwise registers this message's signature as a
   * pending `response_item` and returns `false` (emit normally).
   *
   * Non-message response_item types always return `false`.
   *
   * @param payload - The `response_item` payload.
   * @returns `true` when the response_item should be suppressed as a duplicate.
   */
  processResponseItem(payload: ResponseItemPayload): boolean;

  /**
   * Processes an `event_msg` payload.
   *
   * If a matching `response_item` signature is pending (from an earlier
   * `response_item` in the same turn), consumes that pending entry and returns
   * `true` (suppress this `event_msg`). Otherwise registers this message's
   * signature as a pending `event_msg` and returns `false` (emit normally).
   *
   * Non-message event types (token_count, lifecycle events, etc.) always
   * return `false`.
   *
   * @param payload - The `event_msg` payload.
   * @returns `true` when the event_msg should be suppressed as a duplicate.
   */
  processEventMsg(payload: EventMsgPayload): boolean;

  /**
   * Resets both pending-signature maps.
   *
   * Must be called at each `turn_context` boundary so that identical text in
   * different turns is never cross-suppressed.
   */
  reset(): void;
}

/**
 * Creates a fresh {@link TurnDedupMatcher} with empty pending collections.
 *
 * @returns A new stateful turn-scoped deduplication matcher.
 */
export function createTurnDedupMatcher(): TurnDedupMatcher {
  // Each map stores how many times a given signature is pending on that side.
  // Using counts rather than a Set supports the one-shot / consumable contract
  // when the same text legitimately appears multiple times on one side.
  const pendingResponseItems = new Map<MessageSig, number>();
  const pendingEventMsgs = new Map<MessageSig, number>();

  function consume(map: Map<MessageSig, number>, sig: MessageSig): boolean {
    const count = map.get(sig);
    if (count === undefined || count === 0) {
      return false;
    }
    if (count === 1) {
      map.delete(sig);
    } else {
      map.set(sig, count - 1);
    }
    return true;
  }

  function add(map: Map<MessageSig, number>, sig: MessageSig): void {
    map.set(sig, (map.get(sig) ?? 0) + 1);
  }

  return {
    processResponseItem(payload: ResponseItemPayload): boolean {
      const item = payload as Record<string, unknown> & { type: string };
      if (item.type !== 'message') {
        return false;
      }
      const role = item['role'];
      if (role !== 'assistant' && role !== 'user') {
        return false;
      }
      const content = Array.isArray(item['content']) ? (item['content'] as ContentItem[]) : [];
      const sig: MessageSig = `${role}:${extractMessageText(content).trim()}`;

      // If the opposite side (event_msg) saw this first, consume and suppress.
      if (consume(pendingEventMsgs, sig)) {
        return true;
      }
      // Otherwise register as pending on the response_item side.
      add(pendingResponseItems, sig);
      return false;
    },

    processEventMsg(payload: EventMsgPayload): boolean {
      const p = payload as Record<string, unknown> & { type: string };
      let role: string;
      if (p.type === 'agent_message') {
        role = 'assistant';
      } else if (p.type === 'user_message') {
        role = 'user';
      } else {
        return false;
      }
      const message = typeof p['message'] === 'string' ? (p['message'] as string) : '';
      const sig: MessageSig = `${role}:${message.trim()}`;

      // If the opposite side (response_item) saw this first, consume and suppress.
      if (consume(pendingResponseItems, sig)) {
        return true;
      }
      // Otherwise register as pending on the event_msg side.
      add(pendingEventMsgs, sig);
      return false;
    },

    reset(): void {
      pendingResponseItems.clear();
      pendingEventMsgs.clear();
    }
  };
}
