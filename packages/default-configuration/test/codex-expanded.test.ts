/**
 * Tests for the Codex expanded transcript renderer.
 *
 * These tests target `renderCodexTranscript` — a pure transform function that
 * converts raw rollout JSONL lines into a flat list of `TranscriptItem` values.
 * This mirrors the Claude renderer's architecture where `parseLines` is tested
 * as a pure transform before the component wraps it.
 *
 * @summary Unit tests for the Codex expanded transcript renderer
 */

import { describe, expect, it } from 'vitest';
import type { TranscriptItem } from '../src/streams/codex-session/www/lib/render-transcript.js';
import {
  extractOutputText,
  parseArguments,
  renderCodexTranscript,
  shellExitSeverity
} from '../src/streams/codex-session/www/lib/render-transcript.js';

// ============================================================================
// Fixture helpers — real tag-137 rollout envelope shapes
// ============================================================================

/**
 * Wraps a payload in the flat `{ timestamp, type, payload }` rollout envelope.
 * @param type - The rollout item type discriminator.
 * @param payload - The item payload object.
 * @param timestamp - ISO 8601 UTC timestamp for the envelope.
 * @returns Serialized JSONL line.
 */
function envelope(type: string, payload: unknown, timestamp = '2026-06-04T12:00:00.000Z'): string {
  return JSON.stringify({ timestamp, type, payload });
}

function sessionMetaLine(model = 'gpt-4o', ts = '2026-06-04T10:00:00.000Z'): string {
  return envelope('session_meta', { id: 'thread-001', model, cwd: '/project' }, ts);
}

function turnContextLine(ts = '2026-06-04T10:01:00.000Z'): string {
  return envelope('turn_context', { turn_id: 'turn-001', cwd: '/project' }, ts);
}

function userMsgLine(text: string, ts = '2026-06-04T10:02:00.000Z'): string {
  return envelope(
    'response_item',
    {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text }]
    },
    ts
  );
}

function assistantMsgLine(text: string, ts = '2026-06-04T10:03:00.000Z'): string {
  return envelope(
    'response_item',
    {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text }]
    },
    ts
  );
}

function reasoningLine(summaryText: string, ts = '2026-06-04T10:04:00.000Z'): string {
  return envelope(
    'response_item',
    {
      type: 'reasoning',
      summary: [{ type: 'summary_text', text: summaryText }]
    },
    ts
  );
}

function functionCallLine(name: string, callId: string, args: string, ts = '2026-06-04T10:05:00.000Z'): string {
  return envelope(
    'response_item',
    {
      type: 'function_call',
      name,
      call_id: callId,
      arguments: args
    },
    ts
  );
}

function functionCallOutputLine(callId: string, output: string | unknown[], ts = '2026-06-04T10:06:00.000Z'): string {
  return envelope(
    'response_item',
    {
      type: 'function_call_output',
      call_id: callId,
      output
    },
    ts
  );
}

function malformedLine(): string {
  return '{"timestamp":"2026-06-04T12:00:00.000Z","type":"response_item","payload":{';
}

function customToolCallLine(name: string, callId: string, input: string, ts = '2026-06-04T10:05:00.000Z'): string {
  return envelope(
    'response_item',
    {
      type: 'custom_tool_call',
      call_id: callId,
      name,
      input
    },
    ts
  );
}

function patchApplyEndLine(
  callId: string,
  success: boolean,
  stdout = '',
  stderr = '',
  ts = '2026-06-04T10:06:00.000Z'
): string {
  return envelope('event_msg', { type: 'patch_apply_end', call_id: callId, stdout, stderr, success }, ts);
}

function eventMsgAgentLine(text: string, ts = '2026-06-04T10:07:00.000Z'): string {
  return envelope('event_msg', { type: 'agent_message', message: text }, ts);
}

function eventMsgUserLine(text: string, ts = '2026-06-04T10:07:00.000Z'): string {
  return envelope('event_msg', { type: 'user_message', message: text }, ts);
}

/**
 * Finds the first tool_call item in a rendered transcript.
 * @param items - The rendered transcript items.
 * @returns The first `tool_call` item, or undefined.
 */
function firstToolCall(items: TranscriptItem[]): Extract<TranscriptItem, { kind: 'tool_call' }> | undefined {
  const found = items.find((i) => i.kind === 'tool_call');
  return found?.kind === 'tool_call' ? found : undefined;
}

// ============================================================================
// Source-order rendering
// ============================================================================

describe('renderCodexTranscript — source-order rendering', () => {
  it('renders session metadata, messages, and tool calls in source order', () => {
    const lines = [
      sessionMetaLine(),
      turnContextLine(),
      userMsgLine('Fix the bug.'),
      assistantMsgLine('I will fix it.'),
      functionCallLine('read_file', 'call-001', '{"path": "/src/index.ts"}')
    ];
    const items = renderCodexTranscript(lines);
    // session_header first, then messages in order
    const kinds = items.map((i) => i.kind);
    expect(kinds.indexOf('session_header')).toBeLessThan(kinds.indexOf('user_message'));
    expect(kinds.indexOf('user_message')).toBeLessThan(kinds.indexOf('assistant_message'));
    expect(kinds.indexOf('assistant_message')).toBeLessThan(kinds.indexOf('tool_call'));
  });

  it('renders reasoning items', () => {
    const lines = [reasoningLine('Step by step analysis')];
    const items = renderCodexTranscript(lines);
    const reasoning = items.find((i) => i.kind === 'reasoning');
    expect(reasoning).toBeDefined();
    if (reasoning?.kind === 'reasoning') {
      expect(reasoning.summaryText).toContain('Step by step analysis');
    }
  });
});

// ============================================================================
// function_call / function_call_output pairing by call_id
// ============================================================================

describe('renderCodexTranscript — call/output pairing by call_id', () => {
  it('pairs function_call and function_call_output by call_id', () => {
    const lines = [
      functionCallLine('read_file', 'call-abc', '{"path": "/src/index.ts"}'),
      functionCallOutputLine('call-abc', 'export function main() {}')
    ];
    const items = renderCodexTranscript(lines);
    const toolCall = items.find((i) => i.kind === 'tool_call');
    expect(toolCall).toBeDefined();
    if (toolCall?.kind === 'tool_call') {
      expect(toolCall.callId).toBe('call-abc');
      expect(toolCall.hasOutput).toBe(true);
      expect(toolCall.outputText).toContain('export function main');
    }
  });

  it('renders unpaired function_call (no output) without crashing', () => {
    const lines = [functionCallLine('write_file', 'call-no-output', '{"path": "/out.ts"}')];
    expect(() => renderCodexTranscript(lines)).not.toThrow();
    const items = renderCodexTranscript(lines);
    const toolCall = items.find((i) => i.kind === 'tool_call');
    expect(toolCall).toBeDefined();
    if (toolCall?.kind === 'tool_call') {
      expect(toolCall.hasOutput).toBe(false);
    }
  });
});

// ============================================================================
// Defensive contracts on arguments and output
// ============================================================================

describe('parseArguments — raw string and pretty-print fallback', () => {
  it('returns raw text unchanged for a non-JSON arguments string', () => {
    const raw = 'not valid json at all!!!';
    const { text, prettyPrinted } = parseArguments(raw);
    expect(text).toBe(raw);
    expect(prettyPrinted).toBe(false);
  });

  it('does not throw for non-JSON arguments', () => {
    expect(() => parseArguments('not json')).not.toThrow();
    expect(() => parseArguments('')).not.toThrow();
    expect(() => parseArguments('{broken: json')).not.toThrow();
  });

  it('pretty-prints valid JSON arguments', () => {
    const args = '{"path":"/src/index.ts","line":42}';
    const { text, prettyPrinted } = parseArguments(args);
    expect(prettyPrinted).toBe(true);
    // Pretty-printed output should contain newlines or be indented
    expect(text).toContain('path');
    expect(text.length).toBeGreaterThan(args.length);
  });

  it('falls back to raw string when JSON.parse fails (not pretty-printed)', () => {
    const badJson = '{"key": value_without_quotes}';
    const { text, prettyPrinted } = parseArguments(badJson);
    expect(text).toBe(badJson);
    expect(prettyPrinted).toBe(false);
  });
});

describe('renderCodexTranscript — non-JSON arguments in function_call', () => {
  it('displays non-JSON arguments as raw text, no throw, surrounding transcript intact', () => {
    const lines = [
      assistantMsgLine('Starting tool...'),
      functionCallLine('exec', 'call-raw', 'not valid json!!!'),
      assistantMsgLine('Tool done.')
    ];
    expect(() => renderCodexTranscript(lines)).not.toThrow();
    const items = renderCodexTranscript(lines);
    const toolCall = items.find((i) => i.kind === 'tool_call');
    expect(toolCall).toBeDefined();
    if (toolCall?.kind === 'tool_call') {
      expect(toolCall.argumentsText).toBe('not valid json!!!');
      expect(toolCall.prettyPrinted).toBe(false);
    }
    // Surrounding messages are still rendered
    expect(items.filter((i) => i.kind === 'assistant_message')).toHaveLength(2);
  });
});

// ============================================================================
// output as plain string vs ContentItem[]
// ============================================================================

describe('extractOutputText — output union branches', () => {
  it('returns a plain string output as-is', () => {
    expect(extractOutputText('file contents here')).toBe('file contents here');
  });

  it('extracts text from a ContentItem[] output', () => {
    const output = [
      { type: 'output_text', text: 'Line one' },
      { type: 'output_text', text: ' and line two' }
    ];
    expect(extractOutputText(output)).toBe('Line one and line two');
  });

  it('does not throw when passed a string instead of array', () => {
    expect(() => extractOutputText('plain string')).not.toThrow();
  });

  it('does not throw when passed an array instead of string', () => {
    expect(() => extractOutputText([{ type: 'output_text', text: 'hi' }])).not.toThrow();
  });
});

describe('renderCodexTranscript — function_call_output with plain string', () => {
  it('renders plain string output correctly', () => {
    const lines = [
      functionCallLine('get_file', 'call-str', '{}'),
      functionCallOutputLine('call-str', 'File content here')
    ];
    const items = renderCodexTranscript(lines);
    const toolCall = items.find((i) => i.kind === 'tool_call');
    expect(toolCall?.kind === 'tool_call' && toolCall.outputText).toBe('File content here');
  });
});

describe('renderCodexTranscript — function_call_output with ContentItem[] output', () => {
  it('renders ContentItem[] output by extracting text items', () => {
    const contentOutput = [
      { type: 'output_text', text: 'First chunk' },
      { type: 'output_text', text: ' second chunk' }
    ];
    const lines = [functionCallLine('list_files', 'call-arr', '{}'), functionCallOutputLine('call-arr', contentOutput)];
    expect(() => renderCodexTranscript(lines)).not.toThrow();
    const items = renderCodexTranscript(lines);
    const toolCall = items.find((i) => i.kind === 'tool_call');
    expect(toolCall).toBeDefined();
    if (toolCall?.kind === 'tool_call') {
      expect(toolCall.hasOutput).toBe(true);
      expect(toolCall.outputText).toContain('First chunk');
    }
  });
});

// ============================================================================
// Orphan function_call_output
// ============================================================================

describe('renderCodexTranscript — orphan function_call_output', () => {
  it('renders orphan output standalone in source order, not dropped, no throw', () => {
    // An output whose call_id matches no preceding call — due to persistence-policy
    // filtering or order inversion. Must be rendered, not dropped.
    const lines = [
      assistantMsgLine('Preparing result...'),
      functionCallOutputLine('orphan-call-id', 'Orphan output text'),
      assistantMsgLine('All done.')
    ];
    expect(() => renderCodexTranscript(lines)).not.toThrow();
    const items = renderCodexTranscript(lines);
    const orphan = items.find((i) => i.kind === 'orphan_output');
    expect(orphan).toBeDefined();
    if (orphan?.kind === 'orphan_output') {
      expect(orphan.callId).toBe('orphan-call-id');
      expect(orphan.outputText).toContain('Orphan output text');
    }
    // Surrounding assistant messages are still present
    expect(items.filter((i) => i.kind === 'assistant_message')).toHaveLength(2);
  });
});

// ============================================================================
// Unknown item and malformed line isolation
// ============================================================================

describe('renderCodexTranscript — unknown item → raw block', () => {
  it('renders an unknown response_item variant as a raw JSON block', () => {
    const lines = [envelope('response_item', { type: 'future_unknown_variant', data: 'something' })];
    const items = renderCodexTranscript(lines);
    const unknown = items.find((i) => i.kind === 'unknown_item');
    expect(unknown).toBeDefined();
  });
});

describe('renderCodexTranscript — malformed line isolation', () => {
  it('renders malformed line as isolated error block, remainder of transcript intact', () => {
    const lines = [assistantMsgLine('Before malformed.'), malformedLine(), assistantMsgLine('After malformed.')];
    expect(() => renderCodexTranscript(lines)).not.toThrow();
    const items = renderCodexTranscript(lines);
    expect(items.some((i) => i.kind === 'malformed')).toBe(true);
    expect(items.filter((i) => i.kind === 'assistant_message')).toHaveLength(2);
  });
});

// ============================================================================
// Incremental append and reset rebuild
// ============================================================================

describe('renderCodexTranscript — incremental append', () => {
  it('appending new lines produces items for the new lines', () => {
    const initial = [userMsgLine('Hello'), assistantMsgLine('Hi there.')];
    const appended = [...initial, functionCallLine('read_file', 'call-new', '{}')];

    const itemsBefore = renderCodexTranscript(initial);
    const itemsAfter = renderCodexTranscript(appended);

    expect(itemsAfter.length).toBeGreaterThan(itemsBefore.length);
    expect(itemsAfter.some((i) => i.kind === 'tool_call')).toBe(true);
  });
});

describe('renderCodexTranscript — reset rebuild', () => {
  it('full rebuild from replacement lines discards stale items', () => {
    const many = [
      assistantMsgLine('Message A.'),
      assistantMsgLine('Message B.'),
      functionCallLine('tool_a', 'c1', '{}')
    ];
    const many_items = renderCodexTranscript(many);
    expect(many_items.filter((i) => i.kind === 'assistant_message')).toHaveLength(2);

    // Simulate a reset: replace with a single-line stream
    const reset = [assistantMsgLine('Only message after reset.')];
    const reset_items = renderCodexTranscript(reset);
    expect(reset_items.filter((i) => i.kind === 'assistant_message')).toHaveLength(1);
    expect(reset_items.some((i) => i.kind === 'tool_call')).toBe(false);
  });
});

// ============================================================================
// Deduplication — same-turn event_msg suppressed; cross-turn preserved
// ============================================================================

describe('renderCodexTranscript — same-turn dedup: event_msg mirrors response_item', () => {
  it('suppresses a mirrored assistant event_msg in the same turn, keeping exactly one assistant_message', () => {
    const lines = [sessionMetaLine(), turnContextLine(), assistantMsgLine('Hi! Done.'), eventMsgAgentLine('Hi! Done.')];
    const items = renderCodexTranscript(lines);
    const assistantMessages = items.filter((i) => i.kind === 'assistant_message');
    expect(assistantMessages).toHaveLength(1);
    if (assistantMessages[0]?.kind === 'assistant_message') {
      expect(assistantMessages[0].text).toBe('Hi! Done.');
    }
  });

  it('suppresses a mirrored user event_msg in the same turn, keeping exactly one user_message', () => {
    const lines = [sessionMetaLine(), turnContextLine(), userMsgLine('Hello there'), eventMsgUserLine('Hello there')];
    const items = renderCodexTranscript(lines);
    const userMessages = items.filter((i) => i.kind === 'user_message');
    expect(userMessages).toHaveLength(1);
    if (userMessages[0]?.kind === 'user_message') {
      expect(userMessages[0].text).toBe('Hello there');
    }
  });
});

describe('renderCodexTranscript — same-turn dedup: event_msg BEFORE response_item (real Codex order)', () => {
  it('suppresses a mirrored assistant response_item when event_msg arrives first, keeping exactly one assistant_message', () => {
    // Real Codex persistence order: turn_context → event_msg (agent_message) → response_item (assistant message)
    const lines = [sessionMetaLine(), turnContextLine(), eventMsgAgentLine('Hi! Done.'), assistantMsgLine('Hi! Done.')];
    const items = renderCodexTranscript(lines);
    const assistantMessages = items.filter((i) => i.kind === 'assistant_message');
    expect(assistantMessages).toHaveLength(1);
    if (assistantMessages[0]?.kind === 'assistant_message') {
      expect(assistantMessages[0].text).toBe('Hi! Done.');
    }
  });

  it('suppresses a mirrored user response_item when event_msg arrives first, keeping exactly one user_message', () => {
    // Real Codex persistence order: turn_context → event_msg (user_message) → response_item (user message)
    const lines = [sessionMetaLine(), turnContextLine(), eventMsgUserLine('Hello there'), userMsgLine('Hello there')];
    const items = renderCodexTranscript(lines);
    const userMessages = items.filter((i) => i.kind === 'user_message');
    expect(userMessages).toHaveLength(1);
    if (userMessages[0]?.kind === 'user_message') {
      expect(userMessages[0].text).toBe('Hello there');
    }
  });
});

describe('renderCodexTranscript — cross-turn identical text is not suppressed', () => {
  it('keeps both assistant messages when the same text appears in two separate turns', () => {
    // Turn 1: response_item "Done." + event_msg "Done." → 1 item (deduped)
    // Turn 2: response_item "Done." + event_msg "Done." → 1 item (deduped within turn 2)
    // Total: 2 assistant_message items
    const lines = [
      sessionMetaLine(),
      turnContextLine('2026-06-04T10:01:00.000Z'),
      assistantMsgLine('Done.', '2026-06-04T10:02:00.000Z'),
      eventMsgAgentLine('Done.', '2026-06-04T10:03:00.000Z'),
      turnContextLine('2026-06-04T10:04:00.000Z'),
      assistantMsgLine('Done.', '2026-06-04T10:05:00.000Z'),
      eventMsgAgentLine('Done.', '2026-06-04T10:06:00.000Z')
    ];
    const items = renderCodexTranscript(lines);
    const assistantMessages = items.filter((i) => i.kind === 'assistant_message');
    expect(assistantMessages).toHaveLength(2);
  });
});

// ============================================================================
// Per-variant tool-call field reads (protocol fidelity)
// ============================================================================

describe('renderCodexTranscript — custom_tool_call surfaces input', () => {
  it('renders the custom_tool_call input text (read from input, not arguments)', () => {
    const line = envelope('response_item', {
      type: 'custom_tool_call',
      call_id: 'ct-1',
      name: 'apply_patch',
      input: '*** Begin Patch\n*** End Patch'
    });
    const items = renderCodexTranscript([line]);
    const tc = firstToolCall(items);
    expect(tc).toBeDefined();
    expect(tc?.argumentsText).toContain('Begin Patch');
    expect(tc?.argsLabel).toBe('input');
  });
});

describe('renderCodexTranscript — local_shell_call surfaces command', () => {
  it('renders the joined exec command from action.command', () => {
    const line = envelope('response_item', {
      type: 'local_shell_call',
      call_id: 'sh-1',
      status: 'completed',
      action: { type: 'exec', command: ['ls', '-la'] }
    });
    const items = renderCodexTranscript([line]);
    const tc = firstToolCall(items);
    expect(tc).toBeDefined();
    expect(tc?.argumentsText).toContain('ls -la');
    expect(tc?.argsLabel).toBe('command');
  });
});

describe('renderCodexTranscript — web_search_call and image_generation_call surface detail', () => {
  it('renders the web_search_call query from action.search', () => {
    const line = envelope('response_item', {
      type: 'web_search_call',
      status: 'completed',
      action: { type: 'search', query: 'rust lifetimes' }
    });
    const items = renderCodexTranscript([line]);
    const tc = firstToolCall(items);
    expect(tc).toBeDefined();
    expect(tc?.argumentsText).toContain('rust lifetimes');
  });

  it('renders image_generation_call revised_prompt and result', () => {
    const line = envelope('response_item', {
      type: 'image_generation_call',
      id: 'ig-1',
      status: 'completed',
      revised_prompt: 'A gray tabby cat hugging an otter',
      result: 'data:image/png;base64,AAAA'
    });
    const items = renderCodexTranscript([line]);
    const tc = firstToolCall(items);
    expect(tc).toBeDefined();
    expect(tc?.argumentsText).toContain('gray tabby cat');
  });
});

describe('renderCodexTranscript — tool_search_call surfaces object arguments + execution', () => {
  it('renders non-empty detail from object arguments and execution', () => {
    const line = envelope('response_item', {
      type: 'tool_search_call',
      call_id: 'ts-1',
      status: 'completed',
      execution: 'remote',
      arguments: { query: 'list files', limit: 10 }
    });
    const items = renderCodexTranscript([line]);
    const tc = firstToolCall(items);
    expect(tc).toBeDefined();
    expect(tc?.argumentsText.length ?? 0).toBeGreaterThan(0);
    expect(tc?.argumentsText).toContain('list files');
  });
});

// ============================================================================
// Session header — model from turn_context, provider + threadId from session_meta
// ============================================================================

describe('renderCodexTranscript — session header exposes model, provider, thread id', () => {
  it('back-patches model from the first turn_context and reads provider/id from session_meta', () => {
    const lines = [
      envelope('session_meta', { id: 'thread-xyz', model_provider: 'openai', cwd: '/project' }),
      envelope('turn_context', { turn_id: 'turn-1', model: 'gpt-5-codex', cwd: '/project' })
    ];
    const items = renderCodexTranscript(lines);
    const header = items.find((i) => i.kind === 'session_header');
    expect(header?.kind).toBe('session_header');
    if (header?.kind === 'session_header') {
      expect(header.model).toBe('gpt-5-codex');
      expect(header.provider).toBe('openai');
      expect(header.threadId).toBe('thread-xyz');
    }
  });
});

// ============================================================================
// Reasoning content (alongside summary)
// ============================================================================

describe('renderCodexTranscript — reasoning surfaces content alongside summary', () => {
  it('renders reasoning content from content[].reasoning_text', () => {
    const line = envelope('response_item', {
      type: 'reasoning',
      summary: [{ type: 'summary_text', text: 'Short summary.' }],
      content: [{ type: 'reasoning_text', text: 'Detailed chain of thought.' }]
    });
    const items = renderCodexTranscript([line]);
    const reasoning = items.find((i) => i.kind === 'reasoning');
    expect(reasoning?.kind).toBe('reasoning');
    if (reasoning?.kind === 'reasoning') {
      expect(reasoning.summaryText).toContain('Short summary.');
      expect(reasoning.contentText).toContain('Detailed chain of thought.');
    }
  });
});

// ============================================================================
// Turn boundary and compaction markers
// ============================================================================

describe('renderCodexTranscript — turn_context and compacted produce display items', () => {
  it('emits a turn_boundary for turn_context carrying the turn id', () => {
    const items = renderCodexTranscript([envelope('turn_context', { turn_id: 'turn-7', model: 'gpt-5-codex' })]);
    const boundary = items.find((i) => i.kind === 'turn_boundary');
    expect(boundary?.kind).toBe('turn_boundary');
    if (boundary?.kind === 'turn_boundary') {
      expect(boundary.turnId).toBe('turn-7');
    }
  });

  it('emits a compaction item carrying the message', () => {
    const items = renderCodexTranscript([envelope('compacted', { message: 'Context compacted after 10 turns.' })]);
    const compaction = items.find((i) => i.kind === 'compaction');
    expect(compaction?.kind).toBe('compaction');
    if (compaction?.kind === 'compaction') {
      expect(compaction.message).toContain('Context compacted');
    }
  });
});

// ============================================================================
// Persisted high-level events → event_activity
// ============================================================================

describe('renderCodexTranscript — persisted events render as event_activity', () => {
  it('renders mcp_tool_call_end as an event_activity with server.tool label', () => {
    const line = envelope('event_msg', {
      type: 'mcp_tool_call_end',
      call_id: 'mcp-1',
      invocation: { server: 'github', tool: 'list_prs', arguments: { state: 'open' } },
      result: { ok: true }
    });
    const items = renderCodexTranscript([line]);
    const activity = items.find((i) => i.kind === 'event_activity');
    expect(activity?.kind).toBe('event_activity');
    if (activity?.kind === 'event_activity') {
      expect(activity.label).toContain('github');
      expect(activity.label).toContain('list_prs');
    }
  });

  it('renders web_search_end as an event_activity carrying the query', () => {
    const line = envelope('event_msg', {
      type: 'web_search_end',
      call_id: 'ws-1',
      query: 'codex rollout protocol',
      action: { type: 'search', query: 'codex rollout protocol' }
    });
    const items = renderCodexTranscript([line]);
    const activity = items.find((i) => i.kind === 'event_activity');
    expect(activity?.kind).toBe('event_activity');
    if (activity?.kind === 'event_activity') {
      expect(activity.detailText).toContain('codex rollout protocol');
    }
  });

  it('renders image_generation_end as an event_activity with revised_prompt and result', () => {
    const line = envelope('event_msg', {
      type: 'image_generation_end',
      call_id: 'img-1',
      status: 'completed',
      revised_prompt: 'a gray tabby cat',
      result: 'https://img/result.png'
    });
    const items = renderCodexTranscript([line]);
    const activity = items.find((i) => i.kind === 'event_activity' && i.label === 'image_generation');
    expect(activity?.kind).toBe('event_activity');
    if (activity?.kind === 'event_activity') {
      expect(activity.label).toBe('image_generation');
      expect(activity.detailText).toContain('a gray tabby cat');
      expect(activity.detailText).toContain('https://img/result.png');
    }
  });

  it('renders patch_apply_end as an event_activity with success flag and stdout', () => {
    const line = envelope('event_msg', {
      type: 'patch_apply_end',
      call_id: 'patch-1',
      stdout: 'Applied patch to foo.ts',
      stderr: '',
      success: true,
      status: 'completed'
    });
    const items = renderCodexTranscript([line]);
    const activity = items.find((i) => i.kind === 'event_activity' && i.label === 'patch_apply');
    expect(activity?.kind).toBe('event_activity');
    if (activity?.kind === 'event_activity') {
      expect(activity.label).toBe('patch_apply');
      expect(activity.detailText).toContain('success: true');
      expect(activity.detailText).toContain('Applied patch to foo.ts');
    }
  });
});

// ============================================================================
// item_completed → plan_update event_activity
// ============================================================================

describe('renderCodexTranscript — item_completed renders plan text', () => {
  it('emits an event_activity with label plan_update and detailText from Plan item text', () => {
    // Real persisted shape: TurnItem::Plan serializes as { type: "Plan", id: "...", text: "..." }
    const line = envelope('event_msg', {
      type: 'item_completed',
      item: { type: 'Plan', id: 'plan-1', text: '1. do X\n2. do Y' }
    });
    const items = renderCodexTranscript([line]);
    const activity = items.find((i) => i.kind === 'event_activity');
    expect(activity?.kind).toBe('event_activity');
    if (activity?.kind === 'event_activity') {
      expect(activity.label).toBe('plan_update');
      expect(activity.detailText).toContain('1. do X');
      expect(activity.detailText).toContain('2. do Y');
    }
  });

  it('does NOT emit an event_activity for the old plan/steps array shape (regression guard)', () => {
    // The old implementation read item.plan / item.steps as arrays of {step,status} objects.
    // That shape was never written by the Codex protocol. Confirm it produces nothing.
    const line = envelope('event_msg', {
      type: 'item_completed',
      item: {
        plan: [
          { step: 'do X', status: 'pending' },
          { step: 'do Y', status: 'done' }
        ]
      }
    });
    const items = renderCodexTranscript([line]);
    const activity = items.find((i) => i.kind === 'event_activity');
    expect(activity).toBeUndefined();
  });

  it('skips item_completed when item.type is not Plan', () => {
    const line = envelope('event_msg', {
      type: 'item_completed',
      item: { type: 'Message', id: 'msg-1', text: 'some text' }
    });
    const items = renderCodexTranscript([line]);
    const activity = items.find((i) => i.kind === 'event_activity');
    expect(activity).toBeUndefined();
  });

  it('skips item_completed when item.text is empty', () => {
    const line = envelope('event_msg', {
      type: 'item_completed',
      item: { type: 'Plan', id: 'plan-empty', text: '' }
    });
    const items = renderCodexTranscript([line]);
    const activity = items.find((i) => i.kind === 'event_activity');
    expect(activity).toBeUndefined();
  });
});

// ============================================================================
// shellExitSeverity — pure helper
// ============================================================================

describe('shellExitSeverity — exit-code extraction from shell outputText', () => {
  it('flags a nonzero "Exit code: N" as error with the exit code in the label', () => {
    const outcome = shellExitSeverity('some command output\nExit code: 1');
    expect(outcome.severity).toBe('error');
    expect(outcome.errorLabel).toBe('✗ exit 1');
  });

  it('flags a nonzero "Process exited with code N" phrasing as error', () => {
    const outcome = shellExitSeverity('build failed\nProcess exited with code 2');
    expect(outcome.severity).toBe('error');
    expect(outcome.errorLabel).toBe('✗ exit 2');
  });

  it('treats exit code 0 as normal (no errorLabel)', () => {
    const outcome = shellExitSeverity('all good\nExit code: 0');
    expect(outcome.severity).toBe('normal');
    expect(outcome.errorLabel).toBeUndefined();
  });

  it('treats a negative exit code as error, preserving the sign in the label', () => {
    const outcome = shellExitSeverity('killed\nExit code: -1');
    expect(outcome.severity).toBe('error');
    expect(outcome.errorLabel).toBe('✗ exit -1');
  });

  it('treats output with no exit-code line as normal', () => {
    const outcome = shellExitSeverity('just some plain stdout, no exit marker');
    expect(outcome.severity).toBe('normal');
    expect(outcome.errorLabel).toBeUndefined();
  });

  it('treats undefined outputText (no output yet) as normal', () => {
    const outcome = shellExitSeverity(undefined);
    expect(outcome.severity).toBe('normal');
    expect(outcome.errorLabel).toBeUndefined();
  });
});

// ============================================================================
// Failure severity on the tool_call row — shell exit code and patch failure
// ============================================================================

describe('renderCodexTranscript — shell tool_call escalates on nonzero exit code', () => {
  it('marks a shell tool_call row as error when the paired output reports a nonzero exit code', () => {
    const lines = [
      functionCallLine('shell', 'sh-err', '{"command":["false"]}'),
      functionCallOutputLine('sh-err', 'command failed\nExit code: 1')
    ];
    const items = renderCodexTranscript(lines);
    const tc = firstToolCall(items);
    expect(tc).toBeDefined();
    if (tc !== undefined) {
      expect(tc.severity).toBe('error');
      expect(tc.errorLabel).toBe('✗ exit 1');
    }
  });

  it('leaves a local_shell_call tool_call row normal when the paired output reports exit code 0', () => {
    const lines = [
      envelope('response_item', {
        type: 'local_shell_call',
        call_id: 'sh-ok',
        status: 'completed',
        action: { type: 'exec', command: ['true'] }
      }),
      functionCallOutputLine('sh-ok', 'done\nExit code: 0')
    ];
    const items = renderCodexTranscript(lines);
    const tc = firstToolCall(items);
    expect(tc).toBeDefined();
    if (tc !== undefined) {
      expect(tc.severity).toBe('normal');
      expect(tc.errorLabel).toBeUndefined();
    }
  });

  it('leaves a non-shell tool_call row untouched by exit-code text in its output', () => {
    const lines = [
      functionCallLine('read_file', 'call-nonshell', '{"path":"/src/index.ts"}'),
      functionCallOutputLine('call-nonshell', 'file contents mentioning Exit code: 1 in a log line')
    ];
    const items = renderCodexTranscript(lines);
    const tc = firstToolCall(items);
    expect(tc).toBeDefined();
    if (tc !== undefined) {
      expect(tc.severity).toBeUndefined();
      expect(tc.errorLabel).toBeUndefined();
    }
  });
});

describe('renderCodexTranscript — apply_patch tool_call escalates on patch_apply_end failure', () => {
  it('marks the originating apply_patch tool_call row as error when patch_apply_end reports failure', () => {
    const lines = [
      customToolCallLine('apply_patch', 'patch-1', '*** Begin Patch\n*** Update File: src/a.ts\n*** End Patch'),
      patchApplyEndLine('patch-1', false, '', 'patch does not apply')
    ];
    const items = renderCodexTranscript(lines);
    const tc = firstToolCall(items);
    expect(tc).toBeDefined();
    if (tc !== undefined) {
      expect(tc.severity).toBe('error');
      expect(tc.errorLabel).toBe('patch failed');
    }
    // The standalone event_activity rendering for patch_apply_end is preserved.
    const activity = items.find((i) => i.kind === 'event_activity' && i.label === 'patch_apply');
    expect(activity).toBeDefined();
  });

  it('leaves the apply_patch tool_call row normal when patch_apply_end reports success', () => {
    const lines = [
      customToolCallLine('apply_patch', 'patch-2', '*** Begin Patch\n*** Update File: src/a.ts\n*** End Patch'),
      patchApplyEndLine('patch-2', true, 'Applied patch to src/a.ts')
    ];
    const items = renderCodexTranscript(lines);
    const tc = firstToolCall(items);
    expect(tc).toBeDefined();
    if (tc !== undefined) {
      expect(tc.severity).toBeUndefined();
      expect(tc.errorLabel).toBeUndefined();
    }
  });
});

// ============================================================================
// Session-level error events (event_msg type:'error')
// ============================================================================

describe('renderCodexTranscript — event_msg type:error renders an error item', () => {
  it('emits an error transcript item carrying the message, never dropped', () => {
    const line = envelope('event_msg', { type: 'error', message: 'context window exceeded' });
    const items = renderCodexTranscript([line]);
    const error = items.find((i) => i.kind === 'error');
    expect(error?.kind).toBe('error');
    if (error?.kind === 'error') {
      expect(error.message).toBe('context window exceeded');
    }
  });

  it('keeps surrounding messages intact around a session error', () => {
    const lines = [
      assistantMsgLine('Before error.'),
      envelope('event_msg', { type: 'error', message: 'boom' }),
      assistantMsgLine('After error.')
    ];
    const items = renderCodexTranscript(lines);
    expect(items.some((i) => i.kind === 'error')).toBe(true);
    expect(items.filter((i) => i.kind === 'assistant_message')).toHaveLength(2);
  });
});

// ============================================================================
// task_started / task_complete lifecycle events
// ============================================================================

describe('renderCodexTranscript — task_started and task_complete render as event_activity', () => {
  it('renders task_started as an event_activity', () => {
    const line = envelope('event_msg', { type: 'task_started', turn_id: 'turn-1' });
    const items = renderCodexTranscript([line]);
    const activity = items.find((i) => i.kind === 'event_activity' && i.label === 'task_started');
    expect(activity).toBeDefined();
  });

  it('renders task_complete with a formatted duration when duration_ms is present', () => {
    const line = envelope('event_msg', { type: 'task_complete', turn_id: 'turn-1', duration_ms: 65000 });
    const items = renderCodexTranscript([line]);
    const activity = items.find((i) => i.kind === 'event_activity' && i.label === 'task_complete');
    expect(activity?.kind).toBe('event_activity');
    if (activity?.kind === 'event_activity') {
      expect(activity.detailText).toContain('1m 5s');
    }
  });

  it('renders task_complete with no detailText when duration_ms is absent', () => {
    const line = envelope('event_msg', { type: 'task_complete', turn_id: 'turn-1' });
    const items = renderCodexTranscript([line]);
    const activity = items.find((i) => i.kind === 'event_activity' && i.label === 'task_complete');
    expect(activity?.kind).toBe('event_activity');
    if (activity?.kind === 'event_activity') {
      expect(activity.detailText).toBeUndefined();
    }
  });
});

// ============================================================================
// Nested compaction response_item variants route to the compaction UI
// ============================================================================

describe('renderCodexTranscript — nested compaction variants route to compaction item', () => {
  it('routes a response_item compaction payload to a compaction item, not unknown_item', () => {
    const line = envelope('response_item', { type: 'compaction', encrypted_content: 'opaque' });
    const items = renderCodexTranscript([line]);
    expect(items.some((i) => i.kind === 'compaction')).toBe(true);
    expect(items.some((i) => i.kind === 'unknown_item')).toBe(false);
  });

  it('routes a response_item compaction_trigger payload to a compaction item', () => {
    const line = envelope('response_item', { type: 'compaction_trigger' });
    const items = renderCodexTranscript([line]);
    expect(items.some((i) => i.kind === 'compaction')).toBe(true);
  });

  it('routes a response_item context_compaction payload to a compaction item', () => {
    const line = envelope('response_item', { type: 'context_compaction', encrypted_content: 'opaque' });
    const items = renderCodexTranscript([line]);
    expect(items.some((i) => i.kind === 'compaction')).toBe(true);
  });

  it('still routes a truly unknown response_item variant to unknown_item (regression guard)', () => {
    const line = envelope('response_item', { type: 'future_unknown_variant', data: 'something' });
    const items = renderCodexTranscript([line]);
    expect(items.some((i) => i.kind === 'unknown_item')).toBe(true);
    expect(items.some((i) => i.kind === 'compaction')).toBe(false);
  });
});

// ============================================================================
// Image content placeholders
// ============================================================================

describe('renderCodexTranscript — input_image content surfaces a visible placeholder', () => {
  it('appends an image-count placeholder to a user message containing an image', () => {
    const line = envelope('response_item', {
      type: 'message',
      role: 'user',
      content: [
        { type: 'input_text', text: 'Look at this screenshot.' },
        { type: 'input_image', image_url: 'data:image/png;base64,AAAA' }
      ]
    });
    const items = renderCodexTranscript([line]);
    const user = items.find((i) => i.kind === 'user_message');
    expect(user?.kind).toBe('user_message');
    if (user?.kind === 'user_message') {
      expect(user.text).toContain('Look at this screenshot.');
      expect(user.text).toContain('1 image attached');
    }
  });

  it('renders only the placeholder when a message has images and no text', () => {
    const line = envelope('response_item', {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_image', image_url: 'data:image/png;base64,AAAA' }]
    });
    const items = renderCodexTranscript([line]);
    const user = items.find((i) => i.kind === 'user_message');
    expect(user?.kind).toBe('user_message');
    if (user?.kind === 'user_message') {
      expect(user.text).toContain('1 image attached');
    }
  });

  it('pluralizes the placeholder for multiple images', () => {
    const line = envelope('response_item', {
      type: 'message',
      role: 'user',
      content: [
        { type: 'input_image', image_url: 'data:image/png;base64,AAAA' },
        { type: 'input_image', image_url: 'data:image/png;base64,BBBB' }
      ]
    });
    const items = renderCodexTranscript([line]);
    const user = items.find((i) => i.kind === 'user_message');
    expect(user?.kind).toBe('user_message');
    if (user?.kind === 'user_message') {
      expect(user.text).toContain('2 images attached');
    }
  });

  it('adds no placeholder for a message with no images', () => {
    const items = renderCodexTranscript([userMsgLine('No images here.')]);
    const user = items.find((i) => i.kind === 'user_message');
    expect(user?.kind).toBe('user_message');
    if (user?.kind === 'user_message') {
      expect(user.text).not.toContain('attached');
    }
  });

  it('appends an image-count placeholder to a ContentItem[] tool output', () => {
    const contentOutput = [
      { type: 'output_text', text: 'Screenshot captured.' },
      { type: 'input_image', image_url: 'data:image/png;base64,AAAA' }
    ];
    const lines = [functionCallLine('screenshot', 'call-img', '{}'), functionCallOutputLine('call-img', contentOutput)];
    const items = renderCodexTranscript(lines);
    const toolCall = items.find((i) => i.kind === 'tool_call');
    expect(toolCall?.kind).toBe('tool_call');
    if (toolCall?.kind === 'tool_call') {
      expect(toolCall.outputText).toContain('Screenshot captured.');
      expect(toolCall.outputText).toContain('1 image attached');
    }
  });
});

// ============================================================================
// custom_tool_call pretty-prints JSON input, leaving non-JSON (patch) raw
// ============================================================================

describe('renderCodexTranscript — custom_tool_call pretty-prints JSON input', () => {
  it('pretty-prints custom_tool_call input that is valid JSON', () => {
    const line = envelope('response_item', {
      type: 'custom_tool_call',
      call_id: 'ct-json',
      name: 'my_json_tool',
      input: '{"path":"/src/index.ts","limit":10}'
    });
    const items = renderCodexTranscript([line]);
    const tc = firstToolCall(items);
    expect(tc).toBeDefined();
    expect(tc?.prettyPrinted).toBe(true);
    expect(tc?.argumentsText).toContain('\n');
  });

  it('leaves apply_patch (non-JSON) custom_tool_call input raw, unaffected by the pretty-print attempt', () => {
    const line = envelope('response_item', {
      type: 'custom_tool_call',
      call_id: 'ct-patch',
      name: 'apply_patch',
      input: '*** Begin Patch\n*** Update File: src/a.ts\n*** End Patch'
    });
    const items = renderCodexTranscript([line]);
    const tc = firstToolCall(items);
    expect(tc).toBeDefined();
    expect(tc?.prettyPrinted).toBe(false);
    expect(tc?.argumentsText).toBe('*** Begin Patch\n*** Update File: src/a.ts\n*** End Patch');
  });
});
