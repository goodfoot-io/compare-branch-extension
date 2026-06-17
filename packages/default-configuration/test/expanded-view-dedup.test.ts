/**
 * Tests for uuid de-duplication on the expanded-view parse path.
 *
 * The claude-code-session transcript is double-written: every line `uuid`
 * arrives twice. The expanded view builds its state via
 * `mergeConsecutiveMessages(parseLines(lines))` (ExpandedView buildExpandedState),
 * so it must fold each unique `uuid` once, exactly as the compact view does.
 *
 * @summary Unit tests for uuid de-duplication on the expanded parse path
 */

import { describe, expect, it } from 'vitest';
import type { AssistantMsg, ContentBlock, SessionMsg } from '../src/streams/claude-code-session/www/lib/parse-session';
import { mergeConsecutiveMessages, parseLines } from '../src/streams/claude-code-session/www/lib/parse-session';

// Mirror ExpandedView.buildExpandedState — the real expanded parse path.
function buildExpandedMessages(lines: string[]): SessionMsg[] {
  return mergeConsecutiveMessages(parseLines(lines));
}

function countToolUses(messages: SessionMsg[]): number {
  let n = 0;
  for (const msg of messages) {
    if (msg.type !== 'assistant') continue;
    const content = (msg as AssistantMsg).message?.content ?? [];
    for (const block of content as ContentBlock[]) {
      if (block.type === 'tool_use') n++;
    }
  }
  return n;
}

describe('expanded view uuid de-duplication', () => {
  it('does not double non-adjacent messages when the transcript double-writes each uuid', () => {
    // A realistic double-written transcript: one user turn and one assistant
    // turn, with each line emitted twice (its `uuid` appearing twice). The two
    // copies of the assistant line are non-adjacent (the user line sits between
    // the dupes), so they render as two separate turns unless de-duplicated.
    const userLine = JSON.stringify({
      uuid: 'u-1',
      type: 'user',
      message: { content: [{ type: 'text', text: 'run the build' }] }
    });
    const assistantLine = JSON.stringify({
      uuid: 'a-1',
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'building now' },
          { type: 'tool_use', id: 'tool-1', name: 'Bash', input: {} }
        ]
      }
    });

    const lines = [userLine, assistantLine, userLine, assistantLine];

    const messages = buildExpandedMessages(lines);

    // Unique uuids: one user turn, one assistant turn.
    expect(messages).toHaveLength(2);
    // Exactly one tool_use block — not a doubled tool accordion.
    expect(countToolUses(messages)).toBe(1);
  });

  it('does not concatenate duplicated content when adjacent same-author dupes share a uuid', () => {
    // Two adjacent copies of the same assistant line (same uuid). Without
    // de-duplication, mergeConsecutiveMessages concatenates the identical
    // content arrays, rendering the same text/tool blocks twice in one turn.
    const assistantLine = JSON.stringify({
      uuid: 'a-1',
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'building now' },
          { type: 'tool_use', id: 'tool-1', name: 'Bash', input: {} }
        ]
      }
    });

    const messages = buildExpandedMessages([assistantLine, assistantLine]);

    expect(messages).toHaveLength(1);
    const content = (messages[0] as AssistantMsg).message?.content ?? [];
    // Original block count is 2 (text + tool_use); duplication would make 4.
    expect(content).toHaveLength(2);
    expect(countToolUses(messages)).toBe(1);
  });
});
