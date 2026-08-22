/**
 * Tests for the Cards OpenCode transcript NDJSON parser and transcript
 * renderer.
 *
 * Fixtures mirror the exporter contract implemented by the runtime plugin:
 * one normalized `{v, ts, seq, sessionId, type, data}` envelope per line with
 * OpenCode's own message/part records as `data` payloads.
 *
 * @summary Unit tests for the opencode-session NDJSON parser + renderer
 */

import { describe, expect, it } from 'vitest';
import { type OpencodeLine, parseOpencodeLine } from '../src/streams/opencode-session/www/lib/parser.js';
import { renderOpencodeTranscript } from '../src/streams/opencode-session/www/lib/render-transcript.js';

/**
 * Wraps a payload in the exporter's envelope.
 * @param type - The envelope type discriminator (`meta` | `message` | `part`).
 * @param data - The payload object.
 * @param seq - Monotonic sequence number.
 * @returns Serialized NDJSON line.
 */
function envelope(type: string, data: unknown, seq = 1): string {
  return JSON.stringify({ v: 1, ts: '2026-06-04T12:00:00.000Z', seq, sessionId: 'ses-123', type, data });
}

describe('opencode parser', () => {
  it('parses a meta line', () => {
    const line = parseOpencodeLine(envelope('meta', { runtime: 'opencode', opencodeVersion: '1.18.21' }));

    expect(line.kind).toBe('meta');
    if (line.kind === 'meta') {
      expect(line.sessionId).toBe('ses-123');
      expect(line.data.opencodeVersion).toBe('1.18.21');
    }
  });

  it('parses an assistant message info record', () => {
    const line = parseOpencodeLine(
      envelope('message', {
        id: 'msg-1',
        role: 'assistant',
        modelID: 'claude-x',
        providerID: 'anthropic',
        path: { cwd: '/w' }
      })
    );

    expect(line.kind).toBe('message');
    if (line.kind === 'message') {
      expect(line.data.role).toBe('assistant');
      expect(line.data.modelID).toBe('claude-x');
      expect(line.data.path?.cwd).toBe('/w');
    }
  });

  it('preserves unknown root types and malformed lines without throwing', () => {
    const unknownLine = parseOpencodeLine(envelope('hologram', { any: true }));
    expect(unknownLine.kind).toBe('unknown');

    const torn = parseOpencodeLine('{"v":1,"ts":"2026-06-04T12:00:0');
    expect(torn.kind).toBe('malformed');

    const scalar = parseOpencodeLine('"just a string"');
    expect(scalar.kind).toBe('malformed');
  });
});

describe('opencode render-transcript', () => {
  const META = envelope('meta', { runtime: 'opencode', opencodeVersion: '1.18.21' }, 1);
  const USER_MESSAGE = envelope('message', { id: 'msg-u', role: 'user', time: { created: 1 } }, 2);
  const ASSISTANT_MESSAGE = envelope(
    'message',
    { id: 'msg-a', role: 'assistant', modelID: 'claude-x', providerID: 'anthropic' },
    3
  );
  const USER_TEXT_PART = envelope('part', { id: 'p1', messageID: 'msg-u', type: 'text', text: 'hello there' }, 4);
  const ASSISTANT_TEXT_PART = envelope('part', { id: 'p2', messageID: 'msg-a', type: 'text', text: 'hi back' }, 5);
  const REASONING_PART = envelope('part', { id: 'p3', messageID: 'msg-a', type: 'reasoning', text: 'thinking…' }, 6);
  const TOOL_COMPLETED_PART = envelope(
    'part',
    {
      id: 'p4',
      messageID: 'msg-a',
      type: 'tool',
      callID: 'call-1',
      tool: 'bash',
      state: { status: 'completed', input: { command: 'ls' }, result: 'file.txt' }
    },
    7
  );

  function lines(...bodies: string[]): string[] {
    return [META, ...bodies];
  }

  it('renders user and assistant messages attributed through the role map', () => {
    const items = renderOpencodeTranscript(lines(USER_MESSAGE, ASSISTANT_MESSAGE, USER_TEXT_PART, ASSISTANT_TEXT_PART));

    expect(items[0]).toMatchObject({ kind: 'session_header', sessionId: 'ses-123', opencodeVersion: '1.18.21' });
    // The header is back-patched in place once the assistant record arrives.
    expect(items[0]).toMatchObject({ model: 'claude-x', provider: 'anthropic' });
    expect(items).toContainEqual({ kind: 'user_message', text: 'hello there', timestamp: expect.any(String) });
    expect(items).toContainEqual({ kind: 'assistant_message', text: 'hi back', timestamp: expect.any(String) });
  });

  it('renders reasoning and paired tool output', () => {
    const items = renderOpencodeTranscript(lines(ASSISTANT_MESSAGE, REASONING_PART, TOOL_COMPLETED_PART));

    expect(items).toContainEqual({ kind: 'reasoning', summaryText: 'thinking…', timestamp: expect.any(String) });
    const tool = items.find((item): item is Extract<typeof item, { kind: 'tool_call' }> => item.kind === 'tool_call');
    expect(tool).toMatchObject({
      name: 'bash',
      callId: 'call-1',
      prettyPrinted: true,
      hasOutput: true,
      outputText: 'file.txt',
      severity: 'normal'
    });
  });

  it('replaces a part in place when its update re-fires instead of stacking duplicates', () => {
    const runningPart = envelope(
      'part',
      {
        id: 'p4',
        messageID: 'msg-a',
        type: 'tool',
        callID: 'call-1',
        tool: 'bash',
        state: { status: 'running', input: { command: 'ls' } }
      },
      7
    );
    const erroredPart = envelope(
      'part',
      {
        id: 'p4',
        messageID: 'msg-a',
        type: 'tool',
        callID: 'call-1',
        tool: 'bash',
        state: { status: 'error', input: { command: 'ls' }, error: { message: 'boom' } }
      },
      8
    );

    const items = renderOpencodeTranscript(lines(ASSISTANT_MESSAGE, runningPart, erroredPart));

    const tools = items.filter((item) => item.kind === 'tool_call');
    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({ severity: 'error', errorLabel: '✗ tool error' });
  });

  it('tolerates a torn trailing line and unknown parts without dropping neighbors', () => {
    const unknownPart = envelope('part', { id: 'p9', messageID: 'msg-a', type: 'hologram', payload: { x: 1 } }, 9);

    const items = renderOpencodeTranscript([
      ...lines(ASSISTANT_MESSAGE, ASSISTANT_TEXT_PART),
      '{"v":1,"ts":"2026-06-04T12:00:0', // torn trailing fragment
      unknownPart
    ]);

    expect(items.some((item) => item.kind === 'assistant_message')).toBe(true);
    expect(items.filter((item) => item.kind === 'unknown_item')).toHaveLength(1);
  });

  it('skips structural step markers silently', () => {
    const stepStart = envelope('part', { id: 'p5', messageID: 'msg-a', type: 'step-start' }, 8);
    const stepFinish = envelope('part', { id: 'p6', messageID: 'msg-a', type: 'step-finish' }, 9);

    const items = renderOpencodeTranscript(lines(ASSISTANT_MESSAGE, stepStart, stepFinish));

    expect(items.every((item) => item.kind !== 'unknown_item')).toBe(true);
    expect(items).toHaveLength(1); // header only — step markers render nothing
  });
});

describe('opencode line type narrowing', () => {
  it('exposes discriminated kinds for downstream switches', () => {
    const parsed: OpencodeLine = parseOpencodeLine(envelope('meta', {}));
    switch (parsed.kind) {
      case 'meta':
        expect(parsed.seq).toBe(1);
        break;
      default:
        throw new Error(`unexpected kind: ${parsed.kind}`);
    }
  });
});
