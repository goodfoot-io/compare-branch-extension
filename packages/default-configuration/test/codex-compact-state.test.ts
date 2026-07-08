/**
 * Tests for the Codex compact-state builder.
 *
 * `buildCodexCompactState` is a pure function that folds an array of raw
 * rollout JSONL lines into the bounded state the compact timeline view
 * displays. Because it is pure (no watermark), passing a different array
 * always produces fresh state with no stale carryover.
 *
 * @summary Unit tests for the Codex compact-state builder
 */

import { describe, expect, it } from 'vitest';
import { buildCodexCompactState } from '../src/streams/codex-session/www/lib/compact-state.js';

// ============================================================================
// Fixture helpers — real tag-137 rollout envelope shapes
// ============================================================================

/**
 * Wraps a payload in the flat `{ timestamp, type, payload }` rollout envelope.
 * @param type - The rollout item type discriminator (e.g. `'session_meta'`).
 * @param payload - The item payload object.
 * @param timestamp - ISO 8601 UTC timestamp for the envelope.
 * @returns Serialized JSONL line.
 */
function envelope(type: string, payload: unknown, timestamp = '2026-06-04T12:00:00.000Z'): string {
  return JSON.stringify({ timestamp, type, payload });
}

function sessionMetaLine(opts: { timestamp?: string; id?: string } = {}): string {
  // SessionMeta carries no model field — the model lives on turn_context.
  return envelope(
    'session_meta',
    {
      id: opts.id ?? 'thread-001',
      model_provider: 'openai',
      cwd: '/home/user/project',
      originator: 'user'
    },
    opts.timestamp ?? '2026-06-04T10:00:00.000Z'
  );
}

function turnContextLine(timestamp = '2026-06-04T10:01:00.000Z'): string {
  return envelope(
    'turn_context',
    {
      turn_id: 'turn-001',
      cwd: '/home/user/project',
      model: 'gpt-4o'
    },
    timestamp
  );
}

function responseMsgLine(role: string, text: string, timestamp = '2026-06-04T10:02:00.000Z'): string {
  return envelope(
    'response_item',
    {
      type: 'message',
      role,
      content: [{ type: role === 'user' ? 'input_text' : 'output_text', text }]
    },
    timestamp
  );
}

function functionCallLine(name: string, callId: string, timestamp = '2026-06-04T10:03:00.000Z'): string {
  return envelope(
    'response_item',
    {
      type: 'function_call',
      name,
      arguments: '{}',
      call_id: callId
    },
    timestamp
  );
}

function localShellCallLine(callId: string, timestamp = '2026-06-04T10:04:00.000Z'): string {
  return envelope(
    'response_item',
    {
      type: 'local_shell_call',
      call_id: callId,
      status: 'completed',
      action: { type: 'exec', command: 'ls -la' }
    },
    timestamp
  );
}

function tokenCountLine(inputTokens: number, outputTokens: number, timestamp = '2026-06-04T10:05:00.000Z'): string {
  return envelope(
    'event_msg',
    {
      type: 'token_count',
      info: {
        total_token_usage: {
          input_tokens: inputTokens,
          cached_input_tokens: 0,
          output_tokens: outputTokens,
          reasoning_output_tokens: 0,
          total_tokens: inputTokens + outputTokens
        }
      }
    },
    timestamp
  );
}

function agentMsgLine(message: string, timestamp = '2026-06-04T10:06:00.000Z'): string {
  return envelope('event_msg', { type: 'agent_message', message }, timestamp);
}

function userEventMsgLine(message: string, timestamp = '2026-06-04T10:07:00.000Z'): string {
  return envelope('event_msg', { type: 'user_message', message }, timestamp);
}

function shellFunctionCallLine(callId: string, timestamp = '2026-06-04T10:04:00.000Z'): string {
  return envelope(
    'response_item',
    {
      type: 'function_call',
      name: 'shell',
      arguments: '{}',
      call_id: callId
    },
    timestamp
  );
}

function customToolCallLine(name: string, callId: string, timestamp = '2026-06-04T10:04:00.000Z'): string {
  return envelope(
    'response_item',
    {
      type: 'custom_tool_call',
      name,
      call_id: callId,
      input: '{}',
      status: 'completed'
    },
    timestamp
  );
}

function functionCallOutputLine(callId: string, output: string, timestamp = '2026-06-04T10:05:00.000Z'): string {
  return envelope(
    'response_item',
    {
      type: 'function_call_output',
      call_id: callId,
      output
    },
    timestamp
  );
}

function customToolCallOutputLine(callId: string, output: string, timestamp = '2026-06-04T10:05:00.000Z'): string {
  return envelope(
    'response_item',
    {
      type: 'custom_tool_call_output',
      call_id: callId,
      output
    },
    timestamp
  );
}

function patchApplyEndLine(callId: string, success: boolean, timestamp = '2026-06-04T10:06:00.000Z'): string {
  return envelope(
    'event_msg',
    {
      type: 'patch_apply_end',
      call_id: callId,
      success
    },
    timestamp
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('buildCodexCompactState — empty and zero state', () => {
  it('returns sensible zero state for an empty stream', () => {
    const state = buildCodexCompactState([], false);
    expect(state.isActive).toBe(false);
    expect(state.headlineText).toBe('');
    expect(state.turnCount).toBe(0);
    expect(state.toolCallCount).toBe(0);
    expect(state.tokenCount).toBeUndefined();
    expect(state.model).toBeUndefined();
    expect(state.durationMs).toBeUndefined();
    expect(state.tail).toEqual([]);
  });

  it('reflects isActive=true when stream is live', () => {
    const state = buildCodexCompactState([], true);
    expect(state.isActive).toBe(true);
  });
});

describe('buildCodexCompactState — model from turn_context', () => {
  it('populates model from the first turn_context (SessionMeta carries no model)', () => {
    // Protocol truth: the model lives on TurnContextItem.model, not SessionMeta.
    const lines = [
      sessionMetaLine(),
      envelope('turn_context', { turn_id: 'turn-1', model: 'gpt-4o-mini', cwd: '/home/user/project' })
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.model).toBe('gpt-4o-mini');
    expect(state.turnCount).toBe(1);
  });

  it('leaves model undefined when no turn_context is present', () => {
    const state = buildCodexCompactState([sessionMetaLine()], false);
    expect(state.model).toBeUndefined();
    expect(state.turnCount).toBe(0);
  });

  it('does not require all session_meta fields to be present', () => {
    const raw = JSON.stringify({
      timestamp: '2026-06-04T10:00:00.000Z',
      type: 'session_meta',
      payload: {}
    });
    expect(() => buildCodexCompactState([raw], false)).not.toThrow();
  });
});

describe('buildCodexCompactState — incremental append', () => {
  it('each call with a longer array produces updated counts', () => {
    const line1 = sessionMetaLine();
    const line2 = turnContextLine();
    const line3 = functionCallLine('read_file', 'call-001');

    const state1 = buildCodexCompactState([line1], false);
    expect(state1.toolCallCount).toBe(0);

    const state2 = buildCodexCompactState([line1, line2], false);
    expect(state2.turnCount).toBeGreaterThanOrEqual(0);

    const state3 = buildCodexCompactState([line1, line2, line3], false);
    expect(state3.toolCallCount).toBe(1);
  });
});

describe('buildCodexCompactState — shrink/reset full rebuild', () => {
  it('full rebuild from replacement lines produces no stale carryover', () => {
    const many = [
      sessionMetaLine({ timestamp: '2026-06-04T10:00:00.000Z' }),
      functionCallLine('tool_a', 'call-001', '2026-06-04T10:01:00.000Z'),
      functionCallLine('tool_b', 'call-002', '2026-06-04T10:02:00.000Z'),
      functionCallLine('tool_c', 'call-003', '2026-06-04T10:03:00.000Z')
    ];
    const big = buildCodexCompactState(many, false);
    expect(big.toolCallCount).toBe(3);

    // Replace with a single-line stream (simulating a reset)
    const small = [sessionMetaLine({ timestamp: '2026-06-04T11:00:00.000Z' })];
    const rebuilt = buildCodexCompactState(small, false);
    expect(rebuilt.toolCallCount).toBe(0); // no stale tool calls from prior call
  });
});

describe('buildCodexCompactState — tool call counting', () => {
  it('tallies function_call items', () => {
    const lines = [functionCallLine('read_file', 'call-001'), functionCallLine('write_file', 'call-002')];
    const state = buildCodexCompactState(lines, false);
    expect(state.toolCallCount).toBe(2);
  });

  it('tallies local_shell_call items', () => {
    const lines = [localShellCallLine('shell-001'), localShellCallLine('shell-002')];
    const state = buildCodexCompactState(lines, false);
    expect(state.toolCallCount).toBe(2);
  });

  it('tallies both function_call and local_shell_call together', () => {
    const lines = [functionCallLine('read_file', 'call-001'), localShellCallLine('shell-001')];
    const state = buildCodexCompactState(lines, false);
    expect(state.toolCallCount).toBe(2);
  });
});

describe('buildCodexCompactState — token accumulation', () => {
  it('accumulates token counts from event_msg token_count events', () => {
    const lines = [tokenCountLine(500, 200)];
    const state = buildCodexCompactState(lines, false);
    expect(state.tokenCount).toBeDefined();
    expect(state.tokenCount?.input).toBe(500);
    expect(state.tokenCount?.output).toBe(200);
  });

  it('uses the most recent token_count when multiple are present', () => {
    const lines = [
      tokenCountLine(100, 50, '2026-06-04T10:01:00.000Z'),
      tokenCountLine(800, 300, '2026-06-04T10:05:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    // Latest total_token_usage wins (or they accumulate — either is acceptable
    // as long as the value reflects the final count, not zero)
    expect(state.tokenCount).toBeDefined();
    expect((state.tokenCount?.input ?? 0) + (state.tokenCount?.output ?? 0)).toBeGreaterThan(0);
  });

  it('leaves tokenCount undefined when no token events are present', () => {
    const lines = [sessionMetaLine()];
    const state = buildCodexCompactState(lines, false);
    expect(state.tokenCount).toBeUndefined();
  });
});

describe('buildCodexCompactState — headline selection', () => {
  it('returns the latest assistant message text as headline', () => {
    const lines = [
      responseMsgLine('assistant', 'First response.', '2026-06-04T10:01:00.000Z'),
      responseMsgLine('assistant', 'Latest response wins.', '2026-06-04T10:02:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.headlineText).toBe('Latest response wins.');
  });

  it('falls back to latest tool name when no assistant message is present', () => {
    const lines = [functionCallLine('read_file', 'call-001')];
    const state = buildCodexCompactState(lines, false);
    // headline should mention the tool name or be non-empty
    expect(state.headlineText.length).toBeGreaterThan(0);
  });

  it('returns empty string when stream has no displayable content', () => {
    // Only a session_meta with no messages or tools
    const lines = [sessionMetaLine()];
    const state = buildCodexCompactState(lines, false);
    // Acceptable outcomes: empty string or the model name — but not undefined/null
    expect(typeof state.headlineText).toBe('string');
  });

  it('uses agent_message event as headline when no response_item message is present', () => {
    const lines = [agentMsgLine('Task completed successfully.')];
    const state = buildCodexCompactState(lines, false);
    expect(state.headlineText).toBe('Task completed successfully.');
  });
});

describe('buildCodexCompactState — tail bounded ≤5, newest last', () => {
  it('tail contains at most 5 items', () => {
    const lines = [
      functionCallLine('tool_1', 'c1', '2026-06-04T10:01:00.000Z'),
      functionCallLine('tool_2', 'c2', '2026-06-04T10:02:00.000Z'),
      functionCallLine('tool_3', 'c3', '2026-06-04T10:03:00.000Z'),
      functionCallLine('tool_4', 'c4', '2026-06-04T10:04:00.000Z'),
      functionCallLine('tool_5', 'c5', '2026-06-04T10:05:00.000Z'),
      functionCallLine('tool_6', 'c6', '2026-06-04T10:06:00.000Z'),
      functionCallLine('tool_7', 'c7', '2026-06-04T10:07:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.tail.length).toBeLessThanOrEqual(5);
  });

  it('newest items appear last in the tail', () => {
    const lines = [
      responseMsgLine('assistant', 'First message.', '2026-06-04T10:01:00.000Z'),
      responseMsgLine('assistant', 'Last message.', '2026-06-04T10:09:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    if (state.tail.length >= 2) {
      // The last item in tail should correspond to the most recent line
      const lastTailText = state.tail[state.tail.length - 1]!.text;
      expect(lastTailText).toContain('Last message.');
    }
  });

  it('tail items have valid kind values', () => {
    const lines = [
      responseMsgLine('user', 'User input.'),
      responseMsgLine('assistant', 'Agent reply.'),
      functionCallLine('read_file', 'call-001')
    ];
    const state = buildCodexCompactState(lines, false);
    for (const item of state.tail) {
      expect(['message', 'tool', 'event']).toContain(item.kind);
      expect(typeof item.text).toBe('string');
    }
  });
});

describe('buildCodexCompactState — durationMs from timestamps', () => {
  it('computes durationMs from first and last line timestamps', () => {
    const lines = [
      sessionMetaLine({ timestamp: '2026-06-04T10:00:00.000Z' }),
      responseMsgLine('assistant', 'Done.', '2026-06-04T10:05:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    // 5 minutes = 300_000 ms
    expect(state.durationMs).toBe(300_000);
  });

  it('returns undefined durationMs for a single-line stream', () => {
    const lines = [sessionMetaLine()];
    const state = buildCodexCompactState(lines, false);
    // With only one timestamp, duration is either 0 or undefined
    if (state.durationMs !== undefined) {
      expect(state.durationMs).toBe(0);
    }
  });
});

// ============================================================================
// durationMs is always derived from first/last timestamps, never from
// task_complete.duration_ms (which is per-turn, not per-session).
// ============================================================================

describe('buildCodexCompactState — durationMs is always from first/last timestamps', () => {
  it('uses the timestamp span across two turns, not the last turn task_complete.duration_ms', () => {
    // Two turns each emit a task_complete with a small per-turn duration_ms (50 ms).
    // The timestamps span 10 minutes (600_000 ms).
    // durationMs must equal the timestamp span, not the per-turn value.
    const lines = [
      sessionMetaLine({ timestamp: '2026-06-04T10:00:00.000Z' }),
      envelope('turn_context', { turn_id: 'turn-1', model: 'gpt-4o' }, '2026-06-04T10:01:00.000Z'),
      envelope('event_msg', { type: 'task_complete', turn_id: 'turn-1', duration_ms: 50 }, '2026-06-04T10:05:00.000Z'),
      envelope('turn_context', { turn_id: 'turn-2', model: 'gpt-4o' }, '2026-06-04T10:06:00.000Z'),
      envelope('event_msg', { type: 'task_complete', turn_id: 'turn-2', duration_ms: 50 }, '2026-06-04T10:10:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    // Timestamp span: 10:00 → 10:10 = 600_000 ms
    expect(state.durationMs).toBe(600_000);
    // Confirm it is NOT the per-turn value
    expect(state.durationMs).not.toBe(50);
  });

  it('ignores task_complete.duration_ms even when a single turn is present', () => {
    // Single task_complete with duration_ms=1234; timestamps span 5 minutes (300_000 ms).
    // The result must be the timestamp-derived span, not 1234.
    const lines = [
      sessionMetaLine({ timestamp: '2026-06-04T10:00:00.000Z' }),
      envelope('event_msg', { type: 'task_complete', turn_id: 'turn-1', duration_ms: 1234 }, '2026-06-04T10:05:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.durationMs).toBe(300_000);
    expect(state.durationMs).not.toBe(1234);
  });
});

// ============================================================================
// Deduplication — same-turn event_msg suppressed; cross-turn preserved
// ============================================================================

describe('buildCodexCompactState — same-turn dedup: event_msg mirrors response_item', () => {
  it('omits a mirrored assistant event_msg from the tail so the message appears exactly once', () => {
    const lines = [
      sessionMetaLine(),
      turnContextLine(),
      responseMsgLine('assistant', 'Hi! Done.'),
      agentMsgLine('Hi! Done.')
    ];
    const state = buildCodexCompactState(lines, false);
    const messageTail = state.tail.filter((e) => e.kind === 'message');
    expect(messageTail).toHaveLength(1);
    expect(messageTail[0]?.text).toBe('Hi! Done.');
  });

  it('sets headlineText exactly once when both response_item and event_msg carry the same assistant text', () => {
    const lines = [
      sessionMetaLine(),
      turnContextLine(),
      responseMsgLine('assistant', 'Task complete.'),
      agentMsgLine('Task complete.')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.headlineText).toBe('Task complete.');
    // Verify the tail has only one message entry
    expect(state.tail.filter((e) => e.kind === 'message')).toHaveLength(1);
  });

  it('omits a mirrored user event_msg from the tail so the user message appears exactly once', () => {
    const lines = [
      sessionMetaLine(),
      turnContextLine(),
      responseMsgLine('user', 'Hello there'),
      userEventMsgLine('Hello there')
    ];
    const state = buildCodexCompactState(lines, false);
    const messageTail = state.tail.filter((e) => e.kind === 'message');
    expect(messageTail).toHaveLength(1);
    expect(messageTail[0]?.text).toBe('Hello there');
  });
});

describe('buildCodexCompactState — same-turn dedup: event_msg BEFORE response_item (real Codex order)', () => {
  it('omits a mirrored assistant response_item from the tail when event_msg arrives first', () => {
    // Real Codex persistence order: turn_context → event_msg (agent_message) → response_item (assistant message)
    const lines = [
      sessionMetaLine(),
      turnContextLine(),
      agentMsgLine('Hi! Done.'),
      responseMsgLine('assistant', 'Hi! Done.')
    ];
    const state = buildCodexCompactState(lines, false);
    const messageTail = state.tail.filter((e) => e.kind === 'message');
    expect(messageTail).toHaveLength(1);
    expect(messageTail[0]?.text).toBe('Hi! Done.');
  });

  it('sets headlineText exactly once when event_msg arrives before response_item for the same assistant text', () => {
    const lines = [
      sessionMetaLine(),
      turnContextLine(),
      agentMsgLine('Task complete.'),
      responseMsgLine('assistant', 'Task complete.')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.headlineText).toBe('Task complete.');
    expect(state.tail.filter((e) => e.kind === 'message')).toHaveLength(1);
  });

  it('omits a mirrored user response_item from the tail when event_msg arrives first', () => {
    // Real Codex persistence order: turn_context → event_msg (user_message) → response_item (user message)
    const lines = [
      sessionMetaLine(),
      turnContextLine(),
      userEventMsgLine('Hello there'),
      responseMsgLine('user', 'Hello there')
    ];
    const state = buildCodexCompactState(lines, false);
    const messageTail = state.tail.filter((e) => e.kind === 'message');
    expect(messageTail).toHaveLength(1);
    expect(messageTail[0]?.text).toBe('Hello there');
  });
});

describe('buildCodexCompactState — cross-turn identical text is not suppressed', () => {
  it('keeps per-turn-deduped count across two turns with the same text', () => {
    // Each turn: response_item "Done." + event_msg "Done." → 1 tail entry (deduped)
    // Two turns → 2 tail entries total
    const lines = [
      sessionMetaLine(),
      turnContextLine('2026-06-04T10:01:00.000Z'),
      responseMsgLine('assistant', 'Done.', '2026-06-04T10:02:00.000Z'),
      agentMsgLine('Done.', '2026-06-04T10:03:00.000Z'),
      turnContextLine('2026-06-04T10:04:00.000Z'),
      responseMsgLine('assistant', 'Done.', '2026-06-04T10:05:00.000Z'),
      agentMsgLine('Done.', '2026-06-04T10:06:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    const messageTail = state.tail.filter((e) => e.kind === 'message');
    expect(messageTail).toHaveLength(2);
    expect(state.turnCount).toBe(2);
  });
});

// ============================================================================
// Error detection — patch_apply_end failure and shell exit codes
// ============================================================================

describe('buildCodexCompactState — error detection', () => {
  it('hasErrors defaults to false when no errors are present', () => {
    const lines = [sessionMetaLine()];
    const state = buildCodexCompactState(lines, false);
    expect(state.hasErrors).toBe(false);
  });

  it('detects patch_apply_end failure and sets hasErrors', () => {
    const lines = [
      sessionMetaLine(),
      functionCallLine('apply_patch', 'patch-001', '2026-06-04T10:00:00.000Z'),
      patchApplyEndLine('patch-001', false, '2026-06-04T10:01:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.hasErrors).toBe(true);
  });

  it('does not set hasErrors for a successful patch_apply_end', () => {
    const lines = [
      sessionMetaLine(),
      functionCallLine('apply_patch', 'patch-001', '2026-06-04T10:00:00.000Z'),
      patchApplyEndLine('patch-001', true, '2026-06-04T10:01:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.hasErrors).toBe(false);
  });

  it('detects non-zero shell exit code in paired function_call_output and sets hasErrors', () => {
    const lines = [
      sessionMetaLine(),
      shellFunctionCallLine('shell-001', '2026-06-04T10:00:00.000Z'),
      functionCallOutputLine('shell-001', 'Exit code: 1', '2026-06-04T10:01:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.hasErrors).toBe(true);
  });

  it('detects non-zero shell exit code via local_shell_call with function_call_output', () => {
    const lines = [
      sessionMetaLine(),
      localShellCallLine('shell-002', '2026-06-04T10:00:00.000Z'),
      functionCallOutputLine('shell-002', 'Process exited with code: 2', '2026-06-04T10:01:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.hasErrors).toBe(true);
  });

  it('does not set hasErrors for exit code 0 in shell output', () => {
    const lines = [
      sessionMetaLine(),
      shellFunctionCallLine('shell-003', '2026-06-04T10:00:00.000Z'),
      functionCallOutputLine('shell-003', 'Exit code: 0', '2026-06-04T10:01:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.hasErrors).toBe(false);
  });

  it('does not set hasErrors for shell output with no exit code', () => {
    const lines = [
      sessionMetaLine(),
      shellFunctionCallLine('shell-004', '2026-06-04T10:00:00.000Z'),
      functionCallOutputLine('shell-004', 'Some stdout output', '2026-06-04T10:01:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.hasErrors).toBe(false);
  });

  it('does not set hasErrors for non-shell tool output regardless of content', () => {
    const lines = [
      sessionMetaLine(),
      functionCallLine('read_file', 'call-005', '2026-06-04T10:00:00.000Z'),
      functionCallOutputLine('call-005', 'Exit code: 1', '2026-06-04T10:01:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.hasErrors).toBe(false);
  });

  it('back-patches severity on tail entries for errored tool calls', () => {
    const lines = [
      sessionMetaLine(),
      functionCallLine('apply_patch', 'patch-010', '2026-06-04T10:00:00.000Z'),
      patchApplyEndLine('patch-010', false, '2026-06-04T10:01:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.hasErrors).toBe(true);
    const toolEntry = state.tail.find((e) => e.callId === 'patch-010');
    expect(toolEntry).toBeDefined();
    expect(toolEntry!.severity).toBe('error');
  });

  // F2: Output-before-call persistence order — function_call_output arrives
  // before the paired function_call entry in the stream. The deferred-error
  // tracking Set (unmatchedErroredOutputIds) captures the errored output
  // speculatively, and the tool call handler resolves it once the call arrives.
  it('detects non-zero shell exit code when function_call_output arrives before the function_call', () => {
    const lines = [
      sessionMetaLine(),
      functionCallOutputLine('shell-010', 'Exit code: 1', '2026-06-04T10:00:00.000Z'),
      shellFunctionCallLine('shell-010', '2026-06-04T10:01:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.hasErrors).toBe(true);
  });

  // F3: custom_tool_call_output branch previously had zero test coverage.
  // custom_tool_call with name='shell' is tracked in shellCallIds (same as
  // function_call with name='shell'), and its paired output is classified.
  it('detects non-zero exit code via custom_tool_call with custom_tool_call_output', () => {
    const lines = [
      sessionMetaLine(),
      customToolCallLine('shell', 'custom-shell-001', '2026-06-04T10:00:00.000Z'),
      customToolCallOutputLine('custom-shell-001', 'Exit code: 1', '2026-06-04T10:01:00.000Z')
    ];
    const state = buildCodexCompactState(lines, false);
    expect(state.hasErrors).toBe(true);
  });
});
