/**
 * Tests for `groupToolCalls` — the pure run-length pass that coalesces
 * consecutive Codex `tool_call` transcript items into `tool_run` groups for
 * the expanded view's shared `ToolGroup` wrapper.
 *
 * @summary Unit tests for Codex tool_call run-length grouping
 */

import { describe, expect, it } from 'vitest';
import { groupToolCalls } from '../src/streams/codex-session/www/lib/group-tool-calls.js';
import type { TranscriptItem } from '../src/streams/codex-session/www/lib/render-transcript.js';

function toolCall(callId: string, name = 'shell'): Extract<TranscriptItem, { kind: 'tool_call' }> {
  return {
    kind: 'tool_call',
    name,
    callId,
    argumentsText: `arguments for ${callId}`,
    prettyPrinted: false,
    hasOutput: false
  };
}

function assistantMessage(text: string): Extract<TranscriptItem, { kind: 'assistant_message' }> {
  return { kind: 'assistant_message', text };
}

function turnBoundary(): Extract<TranscriptItem, { kind: 'turn_boundary' }> {
  return { kind: 'turn_boundary' };
}

describe('groupToolCalls — empty and no-tool-call input', () => {
  it('returns an empty array for an empty item list', () => {
    expect(groupToolCalls([])).toEqual([]);
  });

  it('wraps every non-tool_call item as its own single group, in order', () => {
    const items: TranscriptItem[] = [assistantMessage('Hello'), turnBoundary(), assistantMessage('Bye')];
    const groups = groupToolCalls(items);
    expect(groups).toEqual([
      { kind: 'single', item: items[0] },
      { kind: 'single', item: items[1] },
      { kind: 'single', item: items[2] }
    ]);
  });
});

describe('groupToolCalls — consecutive tool_call runs', () => {
  it('coalesces a run of two consecutive tool_call items into one tool_run group', () => {
    const a = toolCall('call-1');
    const b = toolCall('call-2');
    const groups = groupToolCalls([a, b]);
    expect(groups).toEqual([{ kind: 'tool_run', items: [a, b] }]);
  });

  it('wraps a single isolated tool_call in its own tool_run group', () => {
    const a = toolCall('call-1');
    const before = assistantMessage('before');
    const after = assistantMessage('after');
    const groups = groupToolCalls([before, a, after]);
    expect(groups).toEqual([
      { kind: 'single', item: before },
      { kind: 'tool_run', items: [a] },
      { kind: 'single', item: after }
    ]);
  });

  it('flushes the run when a non-tool_call item interrupts it, starting a new run after', () => {
    const a = toolCall('call-1');
    const b = toolCall('call-2');
    const mid = assistantMessage('interrupting message');
    const c = toolCall('call-3');
    const groups = groupToolCalls([a, b, mid, c]);
    expect(groups).toEqual([
      { kind: 'tool_run', items: [a, b] },
      { kind: 'single', item: mid },
      { kind: 'tool_run', items: [c] }
    ]);
  });

  it('preserves every item exactly once across mixed runs and singles', () => {
    const items: TranscriptItem[] = [
      assistantMessage('start'),
      toolCall('call-1'),
      toolCall('call-2'),
      toolCall('call-3'),
      turnBoundary(),
      toolCall('call-4'),
      assistantMessage('end')
    ];
    const groups = groupToolCalls(items);
    const flattened = groups.flatMap((g) => (g.kind === 'tool_run' ? g.items : [g.item]));
    expect(flattened).toEqual(items);
    // single(start), tool_run[1,2,3], single(turnBoundary), tool_run[4], single(end)
    expect(groups).toHaveLength(5);
  });
});
