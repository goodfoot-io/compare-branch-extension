/**
 * Tests for the Codex deduplication helpers.
 *
 * `extractMessageText` and `createTurnDedupMatcher` work together to suppress
 * the later of a mirrored `event_msg`/`response_item` message pair within a
 * turn. The matcher is bidirectional (order-independent), consumable (one-shot
 * per pair), and turn-scoped — the matching window resets at each
 * `turn_context` boundary so identical text in different turns is never
 * cross-suppressed.
 *
 * @summary Unit tests for the Codex dedup helpers
 */

import { describe, expect, it } from 'vitest';
import { createTurnDedupMatcher, extractMessageText } from '../src/streams/codex-session/www/lib/dedup.js';
import type { ContentItem, EventMsgPayload, ResponseItemPayload } from '../src/streams/codex-session/www/lib/parser.js';

// ============================================================================
// Fixture helpers
// ============================================================================

function inputText(text: string): ContentItem {
  return { type: 'input_text', text };
}

function outputText(text: string): ContentItem {
  return { type: 'output_text', text };
}

function imageItem(): ContentItem {
  return { type: 'input_image', image_url: 'https://example.com/img.png' };
}

function responseMessage(role: string, ...items: ContentItem[]): ResponseItemPayload {
  return { type: 'message', role, content: items };
}

function agentMessageEvent(message: string): EventMsgPayload {
  return { type: 'agent_message', message };
}

function userMessageEvent(message: string): EventMsgPayload {
  return { type: 'user_message', message };
}

function tokenCountEvent(): EventMsgPayload {
  return {
    type: 'token_count',
    info: {
      total_token_usage: {
        input_tokens: 100,
        cached_input_tokens: 0,
        output_tokens: 50,
        reasoning_output_tokens: 0,
        total_tokens: 150
      }
    }
  };
}

function taskStartedEvent(): EventMsgPayload {
  return { type: 'task_started' };
}

// ============================================================================
// extractMessageText tests
// ============================================================================

describe('extractMessageText', () => {
  it('returns empty string for an empty content array', () => {
    expect(extractMessageText([])).toBe('');
  });

  it('concatenates a single input_text item', () => {
    expect(extractMessageText([inputText('Hello world')])).toBe('Hello world');
  });

  it('concatenates a single output_text item', () => {
    expect(extractMessageText([outputText('Assistant reply')])).toBe('Assistant reply');
  });

  it('concatenates multiple text items in source order', () => {
    const result = extractMessageText([outputText('Part one'), outputText(' and part two')]);
    expect(result).toBe('Part one and part two');
  });

  it('skips non-text items (input_image) without throwing', () => {
    const result = extractMessageText([inputText('Before image'), imageItem(), inputText(' after image')]);
    expect(result).toBe('Before image after image');
  });

  it('handles mixed input_text and output_text in order', () => {
    const result = extractMessageText([inputText('User said: '), outputText('assistant replied')]);
    expect(result).toBe('User said: assistant replied');
  });

  it('does not normalize internal whitespace', () => {
    // Exact comparison after trimming only; internal whitespace is preserved
    const result = extractMessageText([outputText('  spaces  inside  ')]);
    expect(result).toBe('  spaces  inside  ');
  });
});

// ============================================================================
// createTurnDedupMatcher — bidirectional, order-independent suppression
// ============================================================================

describe('createTurnDedupMatcher — response_item before event_msg (prior test order)', () => {
  it('suppresses the event_msg when response_item arrives first (assistant pair)', () => {
    const dedup = createTurnDedupMatcher();
    const suppressed = dedup.processResponseItem(responseMessage('assistant', outputText('Task done.')));
    expect(suppressed).toBe(false); // response_item emitted

    const suppressed2 = dedup.processEventMsg(agentMessageEvent('Task done.'));
    expect(suppressed2).toBe(true); // event_msg suppressed
  });

  it('suppresses the event_msg when response_item arrives first (user pair)', () => {
    const dedup = createTurnDedupMatcher();
    expect(dedup.processResponseItem(responseMessage('user', inputText('Hello')))).toBe(false);
    expect(dedup.processEventMsg(userMessageEvent('Hello'))).toBe(true);
  });
});

describe('createTurnDedupMatcher — event_msg before response_item (real Codex order)', () => {
  it('suppresses the response_item when event_msg arrives first (assistant pair)', () => {
    const dedup = createTurnDedupMatcher();
    const suppressed = dedup.processEventMsg(agentMessageEvent('Task done.'));
    expect(suppressed).toBe(false); // event_msg emitted

    const suppressed2 = dedup.processResponseItem(responseMessage('assistant', outputText('Task done.')));
    expect(suppressed2).toBe(true); // response_item suppressed
  });

  it('suppresses the response_item when event_msg arrives first (user pair)', () => {
    const dedup = createTurnDedupMatcher();
    expect(dedup.processEventMsg(userMessageEvent('Hello there'))).toBe(false);
    expect(dedup.processResponseItem(responseMessage('user', inputText('Hello there')))).toBe(true);
  });

  it('suppresses when text matches after trimming (event_msg first)', () => {
    const dedup = createTurnDedupMatcher();
    expect(dedup.processEventMsg(agentMessageEvent('  Done.  '))).toBe(false);
    expect(dedup.processResponseItem(responseMessage('assistant', outputText('Done.')))).toBe(true);
  });
});

describe('createTurnDedupMatcher — cross-side only: no same-side suppression', () => {
  it('does not suppress two same-side response_item messages with identical text', () => {
    const dedup = createTurnDedupMatcher();
    expect(dedup.processResponseItem(responseMessage('assistant', outputText('Done.')))).toBe(false);
    expect(dedup.processResponseItem(responseMessage('assistant', outputText('Done.')))).toBe(false);
  });

  it('does not suppress two same-side event_msg messages with identical text', () => {
    const dedup = createTurnDedupMatcher();
    expect(dedup.processEventMsg(agentMessageEvent('Done.'))).toBe(false);
    expect(dedup.processEventMsg(agentMessageEvent('Done.'))).toBe(false);
  });
});

describe('createTurnDedupMatcher — one-shot / consumable semantics', () => {
  it('two same-text response_items and one event_msg mirror: both response_items emitted, event_msg suppressed', () => {
    const dedup = createTurnDedupMatcher();
    // Two response_items first — both emitted (no event_msg pending yet)
    expect(dedup.processResponseItem(responseMessage('assistant', outputText('Done.')))).toBe(false);
    expect(dedup.processResponseItem(responseMessage('assistant', outputText('Done.')))).toBe(false);
    // One event_msg — suppressed because a pending response_item matches (one-shot: one pairing consumed)
    expect(dedup.processEventMsg(agentMessageEvent('Done.'))).toBe(true);
    // Result: 2 items emitted (both response_items), 1 suppressed (event_msg). Net 2 items.
  });

  it('one event_msg and two same-text response_items: event_msg emitted, first response_item suppressed, second emitted', () => {
    const dedup = createTurnDedupMatcher();
    expect(dedup.processEventMsg(agentMessageEvent('Done.'))).toBe(false); // emitted
    expect(dedup.processResponseItem(responseMessage('assistant', outputText('Done.')))).toBe(true); // suppressed (consumed the pending event_msg)
    expect(dedup.processResponseItem(responseMessage('assistant', outputText('Done.')))).toBe(false); // emitted (no pending event_msg left)
  });
});

describe('createTurnDedupMatcher — turn-scoping and reset', () => {
  it('matching window resets at turn_context; same text in next turn is not suppressed', () => {
    const dedup = createTurnDedupMatcher();
    // Turn 1
    expect(dedup.processEventMsg(agentMessageEvent('Done.'))).toBe(false);
    expect(dedup.processResponseItem(responseMessage('assistant', outputText('Done.')))).toBe(true);
    // Turn 2: reset
    dedup.reset();
    expect(dedup.processEventMsg(agentMessageEvent('Done.'))).toBe(false); // not suppressed — new turn
    expect(dedup.processResponseItem(responseMessage('assistant', outputText('Done.')))).toBe(true); // suppressed within turn 2
  });

  it('pending entries from turn N do not survive into turn N+1 after reset', () => {
    const dedup = createTurnDedupMatcher();
    // Turn 1: register a pending event_msg but never match it
    expect(dedup.processEventMsg(agentMessageEvent('Unmatched.'))).toBe(false);
    // Reset (new turn)
    dedup.reset();
    // Turn 2: a response_item with matching text should NOT be suppressed — turn 1 pending was cleared
    expect(dedup.processResponseItem(responseMessage('assistant', outputText('Unmatched.')))).toBe(false);
  });
});

describe('createTurnDedupMatcher — role cross-suppression prevention', () => {
  it('does not suppress assistant event_msg against a user response_item (role mismatch)', () => {
    const dedup = createTurnDedupMatcher();
    expect(dedup.processResponseItem(responseMessage('user', inputText('Hello')))).toBe(false);
    expect(dedup.processEventMsg(agentMessageEvent('Hello'))).toBe(false); // different role
  });

  it('does not suppress user event_msg against an assistant response_item (role mismatch)', () => {
    const dedup = createTurnDedupMatcher();
    expect(dedup.processResponseItem(responseMessage('assistant', outputText('Hello')))).toBe(false);
    expect(dedup.processEventMsg(userMessageEvent('Hello'))).toBe(false); // different role
  });
});

describe('createTurnDedupMatcher — non-message types are never suppressed', () => {
  it('processEventMsg returns false for token_count events', () => {
    const dedup = createTurnDedupMatcher();
    expect(dedup.processEventMsg(tokenCountEvent())).toBe(false);
  });

  it('processEventMsg returns false for lifecycle events (task_started)', () => {
    const dedup = createTurnDedupMatcher();
    expect(dedup.processEventMsg(taskStartedEvent())).toBe(false);
  });

  it('processResponseItem returns false for non-message response_item types', () => {
    const dedup = createTurnDedupMatcher();
    const toolCall: ResponseItemPayload = {
      type: 'function_call',
      call_id: 'c1',
      name: 'read_file',
      arguments: '{}'
    } as unknown as ResponseItemPayload;
    expect(dedup.processResponseItem(toolCall)).toBe(false);
  });
});
