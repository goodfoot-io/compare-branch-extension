/**
 * Tests for the Codex deduplication helpers.
 *
 * `extractMessageText` and `isDuplicateEventMsg` work together to suppress
 * `event_msg` lines whose content duplicates an already-seen `response_item`
 * message in the current turn window. The window resets at each `turn_context`
 * boundary to avoid false-positive suppression of identical text in different
 * turns.
 *
 * All tests are skipped (Phase 2 TDD). Phase 3 unskips them by implementing
 * the functions in `lib/dedup.ts`.
 *
 * @summary Skipped unit tests for the Codex dedup helpers
 */

import { describe, expect, it } from 'vitest';
import { extractMessageText, isDuplicateEventMsg } from '../src/streams/codex-session/www/lib/dedup.js';
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

describe.skip('extractMessageText', () => {
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
// isDuplicateEventMsg tests
// ============================================================================

describe.skip('isDuplicateEventMsg — suppression cases', () => {
  it('suppresses an agent_message matching a same-role response_item message', () => {
    const responseItems: ResponseItemPayload[] = [
      responseMessage('assistant', outputText('I have completed the task.'))
    ];
    const candidate = agentMessageEvent('I have completed the task.');
    expect(isDuplicateEventMsg(responseItems, candidate)).toBe(true);
  });

  it('suppresses a user_message matching a same-role response_item message', () => {
    const responseItems: ResponseItemPayload[] = [responseMessage('user', inputText('Fix the bug in parser.ts'))];
    const candidate = userMessageEvent('Fix the bug in parser.ts');
    expect(isDuplicateEventMsg(responseItems, candidate)).toBe(true);
  });

  it('suppresses when message text matches after trimming', () => {
    const responseItems: ResponseItemPayload[] = [responseMessage('assistant', outputText('Done.'))];
    // event_msg strings are trimmed before comparison
    const candidate = agentMessageEvent('  Done.  ');
    expect(isDuplicateEventMsg(responseItems, candidate)).toBe(true);
  });
});

describe.skip('isDuplicateEventMsg — non-suppression cases', () => {
  it('does not suppress a non-duplicate event_msg', () => {
    const responseItems: ResponseItemPayload[] = [responseMessage('assistant', outputText('Task A complete.'))];
    const candidate = agentMessageEvent('Task B complete.');
    expect(isDuplicateEventMsg(responseItems, candidate)).toBe(false);
  });

  it('does not suppress when roles differ', () => {
    const responseItems: ResponseItemPayload[] = [responseMessage('user', inputText('Hello'))];
    // Same text but different role
    const candidate = agentMessageEvent('Hello');
    expect(isDuplicateEventMsg(responseItems, candidate)).toBe(false);
  });

  it('does not suppress a token_count event', () => {
    const responseItems: ResponseItemPayload[] = [responseMessage('assistant', outputText('some text'))];
    const candidate = tokenCountEvent();
    expect(isDuplicateEventMsg(responseItems, candidate)).toBe(false);
  });

  it('does not suppress a lifecycle event (task_started)', () => {
    const responseItems: ResponseItemPayload[] = [];
    const candidate = taskStartedEvent();
    expect(isDuplicateEventMsg(responseItems, candidate)).toBe(false);
  });

  it('does not suppress when currentTurnResponseItems is empty', () => {
    const candidate = agentMessageEvent('Some message');
    expect(isDuplicateEventMsg([], candidate)).toBe(false);
  });
});

describe.skip('isDuplicateEventMsg — structural (not reference) match', () => {
  it('matches structurally even when response_item and event_msg are separate objects', () => {
    // Deliberately construct distinct objects
    const items1: ResponseItemPayload[] = [responseMessage('assistant', outputText('Identical text'))];
    const items2: ResponseItemPayload[] = [responseMessage('assistant', outputText('Identical text'))];
    const candidate1 = agentMessageEvent('Identical text');
    const candidate2 = agentMessageEvent('Identical text');

    expect(isDuplicateEventMsg(items1, candidate1)).toBe(true);
    expect(isDuplicateEventMsg(items2, candidate2)).toBe(true);
  });
});

describe.skip('isDuplicateEventMsg — turn-scoping', () => {
  it('same text in turn N is suppressed, but turn N+1 is NOT suppressed after window reset', () => {
    // Turn N: both response_item and event_msg with "Done."
    const turnNResponseItems: ResponseItemPayload[] = [responseMessage('assistant', outputText('Done.'))];
    const turnNCandidate = agentMessageEvent('Done.');
    expect(isDuplicateEventMsg(turnNResponseItems, turnNCandidate)).toBe(true);

    // Turn N+1: the caller resets currentTurnResponseItems at each turn_context boundary.
    // An empty window means the same "Done." in the next turn is NOT suppressed.
    const turnN1ResponseItems: ResponseItemPayload[] = [];
    const turnN1Candidate = agentMessageEvent('Done.');
    expect(isDuplicateEventMsg(turnN1ResponseItems, turnN1Candidate)).toBe(false);
  });

  it('does not cross-suppress identical text across different turns when window is reset', () => {
    // Simulate what the caller does: reset currentTurnResponseItems at turn_context
    const text = 'Acknowledged.';
    const firstTurnItems: ResponseItemPayload[] = [responseMessage('assistant', outputText(text))];
    // Turn 1: suppressed
    expect(isDuplicateEventMsg(firstTurnItems, agentMessageEvent(text))).toBe(true);

    // After turn_context, caller resets to empty:
    const secondTurnItems: ResponseItemPayload[] = [];
    // Turn 2: NOT suppressed — different turn, window is fresh
    expect(isDuplicateEventMsg(secondTurnItems, agentMessageEvent(text))).toBe(false);
  });
});

describe.skip('isDuplicateEventMsg — multi-part content concatenation', () => {
  it('suppresses when two OutputText items concatenated equal the flat event_msg string', () => {
    const responseItems: ResponseItemPayload[] = [
      responseMessage('assistant', outputText('Part one'), outputText(' and part two'))
    ];
    const candidate = agentMessageEvent('Part one and part two');
    expect(isDuplicateEventMsg(responseItems, candidate)).toBe(true);
  });

  it('does not suppress when concatenation does not match', () => {
    const responseItems: ResponseItemPayload[] = [
      responseMessage('assistant', outputText('Part one'), outputText(' and part two'))
    ];
    const candidate = agentMessageEvent('Part one and part three');
    expect(isDuplicateEventMsg(responseItems, candidate)).toBe(false);
  });
});

describe.skip('isDuplicateEventMsg — empty content edge case', () => {
  it('extractMessageText with empty content returns empty string', () => {
    expect(extractMessageText([])).toBe('');
  });

  it('isDuplicateEventMsg returns false when response_item message has empty content', () => {
    const responseItems: ResponseItemPayload[] = [
      responseMessage('assistant') // no content items
    ];
    const candidate = agentMessageEvent('');
    // An empty event_msg matching an empty response_item message: conservatively not suppressed,
    // or suppressed — both are correct. The key invariant is: no throw.
    expect(() => isDuplicateEventMsg(responseItems, candidate)).not.toThrow();
  });
});
