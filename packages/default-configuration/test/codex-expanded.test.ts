/**
 * Tests for the Codex expanded transcript renderer.
 *
 * These tests target `renderCodexTranscript` — a pure transform function that
 * converts raw rollout JSONL lines into a flat list of `TranscriptItem` values.
 * This mirrors the Claude renderer's architecture where `parseLines` is tested
 * as a pure transform before the component wraps it.
 *
 * All tests are skipped (Phase 2 TDD). Phase 3 unskips them by implementing
 * `renderCodexTranscript`, `parseArguments`, and `extractOutputText` in
 * `lib/render-transcript.ts`.
 *
 * @summary Skipped unit tests for the Codex expanded transcript renderer
 */

import { describe, expect, it } from 'vitest';
import {
  extractOutputText,
  parseArguments,
  renderCodexTranscript
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

// ============================================================================
// Source-order rendering
// ============================================================================

describe.skip('renderCodexTranscript — source-order rendering', () => {
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

describe.skip('renderCodexTranscript — call/output pairing by call_id', () => {
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

describe.skip('parseArguments — raw string and pretty-print fallback', () => {
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

describe.skip('renderCodexTranscript — non-JSON arguments in function_call', () => {
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

describe.skip('extractOutputText — output union branches', () => {
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

describe.skip('renderCodexTranscript — function_call_output with plain string', () => {
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

describe.skip('renderCodexTranscript — function_call_output with ContentItem[] output', () => {
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

describe.skip('renderCodexTranscript — orphan function_call_output', () => {
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

describe.skip('renderCodexTranscript — unknown item → raw block', () => {
  it('renders an unknown response_item variant as a raw JSON block', () => {
    const lines = [envelope('response_item', { type: 'future_unknown_variant', data: 'something' })];
    const items = renderCodexTranscript(lines);
    const unknown = items.find((i) => i.kind === 'unknown_item');
    expect(unknown).toBeDefined();
  });
});

describe.skip('renderCodexTranscript — malformed line isolation', () => {
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

describe.skip('renderCodexTranscript — incremental append', () => {
  it('appending new lines produces items for the new lines', () => {
    const initial = [userMsgLine('Hello'), assistantMsgLine('Hi there.')];
    const appended = [...initial, functionCallLine('read_file', 'call-new', '{}')];

    const itemsBefore = renderCodexTranscript(initial);
    const itemsAfter = renderCodexTranscript(appended);

    expect(itemsAfter.length).toBeGreaterThan(itemsBefore.length);
    expect(itemsAfter.some((i) => i.kind === 'tool_call')).toBe(true);
  });
});

describe.skip('renderCodexTranscript — reset rebuild', () => {
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
// Build verification — covered as a skipped test
// ============================================================================

describe.skip('build verification — both renderer bundles emitted', () => {
  it('yarn build emits dist/www/claude-code-session/index.html and dist/www/codex-session/index.html', async () => {
    // Phase 3 makes this pass once the SPA + build scripts land.
    // This test is intentionally skipped; it documents the Phase-3 build contract.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const distRoot = path.resolve(process.cwd(), 'dist/www');
    const claudeIndex = path.join(distRoot, 'claude-code-session', 'index.html');
    const codexIndex = path.join(distRoot, 'codex-session', 'index.html');
    await expect(fs.access(claudeIndex)).resolves.toBeUndefined();
    await expect(fs.access(codexIndex)).resolves.toBeUndefined();
  });
});
