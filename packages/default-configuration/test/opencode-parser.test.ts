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

import { type ComponentProps, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EditedFilesPart } from '../src/streams/opencode-session/www/components/expanded/OpencodeDataParts.js';
import { type OpencodeLine, parseOpencodeLine } from '../src/streams/opencode-session/www/lib/parser.js';
import { renderOpencodeTranscript } from '../src/streams/opencode-session/www/lib/render-transcript.js';
import {
  deriveStatus,
  type OpencodeEditedFilesData
} from '../src/streams/opencode-session/www/lib/to-thread-messages.js';

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
  // Live v1.18.22 shape: patch parts carry the edited file list as absolute paths.
  const PATCH_PART = envelope(
    'part',
    { id: 'p7', messageID: 'msg-a', type: 'patch', hash: 'abc123', files: ['/w/src/one.ts', '/w/src/two.ts'] },
    8
  );
  // Reconstructed v1.18.22 shape: file parts are prompt attachments; fields may be absent.
  const FILE_PART = envelope(
    'part',
    {
      id: 'p8',
      messageID: 'msg-u',
      type: 'file',
      filename: 'notes.txt',
      mime: 'text/plain',
      url: 'data:text/plain;base64,aGk='
    },
    9
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

  it('renders a patch part as an edited_files item preserving the full absolute paths', () => {
    const items = renderOpencodeTranscript(lines(ASSISTANT_MESSAGE, PATCH_PART));

    expect(items).toContainEqual({
      kind: 'edited_files',
      files: ['/w/src/one.ts', '/w/src/two.ts'],
      timestamp: expect.any(String)
    });
    expect(items.every((item) => item.kind !== 'unknown_item')).toBe(true);
  });

  it('renders a file part as an attachment item with filename and optional mime/url', () => {
    const items = renderOpencodeTranscript(lines(USER_MESSAGE, FILE_PART));

    expect(items).toContainEqual({
      kind: 'attachment',
      filename: 'notes.txt',
      mime: 'text/plain',
      url: 'data:text/plain;base64,aGk=',
      timestamp: expect.any(String)
    });
  });

  it('renders an attachment item even when mime and url are absent (defensive file shape)', () => {
    const bareFile = envelope('part', { id: 'p8b', messageID: 'msg-u', type: 'file', filename: 'bare.bin' }, 10);

    const items = renderOpencodeTranscript(lines(USER_MESSAGE, bareFile));

    expect(items).toContainEqual({ kind: 'attachment', filename: 'bare.bin', timestamp: expect.any(String) });
  });

  it('falls back to unknown_item for malformed or empty patch/file parts without dropping neighbors', () => {
    const emptyPatch = envelope('part', { id: 'p10', messageID: 'msg-a', type: 'patch', hash: 'h', files: [] }, 11);
    const malformedPatch = envelope('part', { id: 'p11', messageID: 'msg-a', type: 'patch', files: '/w/one.ts' }, 12);
    const nonStringFiles = envelope(
      'part',
      { id: 'p11b', messageID: 'msg-a', type: 'patch', files: ['/w/one.ts', 42] },
      13
    );
    const noFilenameFile = envelope(
      'part',
      { id: 'p12', messageID: 'msg-u', type: 'file', url: 'data:text/plain,aGk=' },
      14
    );

    const items = renderOpencodeTranscript(
      lines(ASSISTANT_MESSAGE, emptyPatch, malformedPatch, nonStringFiles, noFilenameFile)
    );

    expect(items.filter((item) => item.kind === 'unknown_item')).toHaveLength(4);
    expect(items.some((item) => item.kind === 'session_header')).toBe(true);
  });

  it('replaces a file part in place when its update re-fires with the same stable id', () => {
    const updatedFile = envelope(
      'part',
      { id: 'p8', messageID: 'msg-u', type: 'file', filename: 'renamed.txt', mime: 'application/json' },
      10
    );

    const items = renderOpencodeTranscript(lines(USER_MESSAGE, FILE_PART, updatedFile));

    const attachments = items.filter((item) => item.kind === 'attachment');
    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({ kind: 'attachment', filename: 'renamed.txt', mime: 'application/json' });
  });

  it('merges a second meta line into the existing header instead of pushing a duplicate', () => {
    const assistantWithCwd = envelope(
      'message',
      { id: 'msg-a', role: 'assistant', modelID: 'claude-x', providerID: 'anthropic', path: { cwd: '/w' } },
      2
    );

    const items = renderOpencodeTranscript([
      META,
      assistantWithCwd,
      envelope('meta', { runtime: 'opencode', opencodeVersion: '1.18.22' }, 3)
    ]);

    const headers = items.filter((item) => item.kind === 'session_header');
    expect(headers).toHaveLength(1);
    // Identity fields patch from the later meta…
    expect(headers[0]).toMatchObject({ sessionId: 'ses-123', opencodeVersion: '1.18.22' });
    // …while accumulated model/provider/cwd survive.
    expect(headers[0]).toMatchObject({ model: 'claude-x', provider: 'anthropic', cwd: '/w' });
  });

  it('back-patches the header from a nested user-message model shape when flat fields are absent', () => {
    const nestedModelUser = envelope(
      'message',
      { id: 'msg-u2', role: 'user', model: { providerID: 'openai', modelID: 'gpt-5' } },
      2
    );

    const items = renderOpencodeTranscript([META, nestedModelUser]);

    const header = items.find(
      (item): item is Extract<typeof item, { kind: 'session_header' }> => item.kind === 'session_header'
    );
    expect(header).toMatchObject({ model: 'gpt-5', provider: 'openai' });
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

describe('opencode idle surfacing (R-2)', () => {
  const IDLE_META = envelope('meta', { runtime: 'opencode', opencodeVersion: '1.18.21' }, 1);
  const IDLE_ASSISTANT = envelope(
    'message',
    { id: 'msg-a', role: 'assistant', modelID: 'claude-x', providerID: 'anthropic' },
    2
  );

  it('parses an idle envelope to kind idle carrying envelope fields', () => {
    const line = parseOpencodeLine(envelope('idle', {}, 9));

    expect(line.kind).toBe('idle');
    if (line.kind === 'idle') {
      expect(line.seq).toBe(9);
      expect(line.sessionId).toBe('ses-123');
    }
  });

  it('marks the existing header with idleAt and a later meta merge preserves it', () => {
    const items = renderOpencodeTranscript([
      IDLE_META,
      IDLE_ASSISTANT,
      envelope('part', { id: 'p20', messageID: 'msg-a', type: 'text', text: 'done' }, 4),
      envelope('idle', {}, 5),
      envelope('meta', { runtime: 'opencode', opencodeVersion: '1.18.22' }, 6)
    ]);

    const headers = items.filter((item) => item.kind === 'session_header');
    expect(headers).toHaveLength(1);
    // The idle marker survives the later resume-meta merge…
    expect(headers[0]).toMatchObject({ idleAt: '2026-06-04T12:00:00.000Z' });
    // …and the merge still patches identity fields.
    expect(headers[0]).toMatchObject({ opencodeVersion: '1.18.22' });
    // An idle marker is not a transcript row.
    expect(items.every((item) => item.kind !== 'unknown_item')).toBe(true);
  });

  it('drops an idle line silently when no header exists yet', () => {
    const items = renderOpencodeTranscript([envelope('idle', {}, 1)]);

    expect(items).toEqual([]);
  });

  it('derives not-running from active + idle, with error still winning', () => {
    const idleHeader = { kind: 'session_header' as const, idleAt: '2026-06-04T12:00:00.000Z' };
    const plainHeader = { kind: 'session_header' as const };
    const erroredTool = {
      kind: 'tool_call' as const,
      name: 'bash',
      callId: 'call-1',
      argumentsText: '',
      prettyPrinted: false,
      hasOutput: false,
      severity: 'error' as const
    };

    // Active stream without an idle marker still reads running…
    expect(deriveStatus([plainHeader], true)).toBe('running');
    // …while active + idle means the turn loop ended (file liveness lags).
    expect(deriveStatus([idleHeader], true)).toBe('success');
    // An errored tool call escalates even past idle.
    expect(deriveStatus([idleHeader, erroredTool], true)).toBe('error');
    // Inactive behavior unchanged by the marker.
    expect(deriveStatus([plainHeader], false)).toBe('success');
  });

  it('derives success end-to-end from a rendered transcript that ended idle while the file reads live', () => {
    const items = renderOpencodeTranscript([
      IDLE_META,
      IDLE_ASSISTANT,
      envelope('part', { id: 'p21', messageID: 'msg-a', type: 'text', text: 'ok' }, 4),
      envelope('idle', {}, 5)
    ]);

    expect(deriveStatus(items, true)).toBe('success');
  });
});

describe('positional idle supersession (round-1 fix)', () => {
  const M = envelope('meta', { runtime: 'opencode', opencodeVersion: '1.18.21' }, 1);
  const msgLine = (id: string, seq: number): string =>
    envelope('message', { id, role: 'user', time: { created: 1 } }, seq);
  const textPart = (partId: string, messageId: string, text: string, seq: number): string =>
    envelope('part', { id: partId, messageID: messageId, type: 'text', text }, seq);

  it('witness (a): a post-idle turn reads running even while the stream is live', () => {
    const items = renderOpencodeTranscript([
      M,
      msgLine('msg-a', 2),
      textPart('p1', 'msg-a', 'turn one', 3),
      envelope('idle', {}, 4),
      msgLine('msg-b', 5),
      textPart('p2', 'msg-b', 'turn two', 6),
      textPart('p3', 'msg-b', 'still going', 7)
    ]);

    expect(deriveStatus(items, true)).toBe('running');
  });

  it('witness (b): the identical stream without the idle also reads running', () => {
    const items = renderOpencodeTranscript([
      M,
      msgLine('msg-a', 2),
      textPart('p1', 'msg-a', 'turn one', 3),
      msgLine('msg-b', 5),
      textPart('p2', 'msg-b', 'turn two', 6),
      textPart('p3', 'msg-b', 'still going', 7)
    ]);

    expect(deriveStatus(items, true)).toBe('running');
  });

  it('witness (c): full lifecycle — idle completes turn one, turn two runs, next idle completes', () => {
    const turn1 = [M, msgLine('msg-a', 2), textPart('p1', 'msg-a', 'turn one', 3)];

    let items = renderOpencodeTranscript([...turn1, envelope('idle', {}, 4)]);
    expect(deriveStatus(items, true)).toBe('success');

    items = renderOpencodeTranscript([
      ...turn1,
      envelope('idle', {}, 4),
      msgLine('msg-b', 5),
      textPart('p2', 'msg-b', 'turn two', 6)
    ]);
    expect(deriveStatus(items, true)).toBe('running');

    items = renderOpencodeTranscript([
      ...turn1,
      envelope('idle', {}, 4),
      msgLine('msg-b', 5),
      textPart('p2', 'msg-b', 'turn two', 6),
      envelope('idle', {}, 7)
    ]);
    expect(deriveStatus(items, true)).toBe('success');
  });

  it('witness (d): an errored tool call after idle escalates to error regardless of liveness', () => {
    const erroredTool = envelope(
      'part',
      {
        id: 'p9',
        messageID: 'msg-b',
        type: 'tool',
        callID: 'call-1',
        tool: 'bash',
        state: { status: 'error', input: { command: 'ls' }, error: { message: 'boom' } }
      },
      6
    );
    const items = renderOpencodeTranscript([
      M,
      msgLine('msg-a', 2),
      textPart('p1', 'msg-a', 'go', 3),
      envelope('idle', {}, 4),
      msgLine('msg-b', 5),
      erroredTool
    ]);

    expect(deriveStatus(items, true)).toBe('error');
    expect(deriveStatus(items, false)).toBe('error');
  });

  it('witness (f): a re-fired part update post-idle counts as content and clears the mark in place', () => {
    const base = [M, msgLine('msg-a', 2), textPart('p1', 'msg-a', 'draft', 3), envelope('idle', {}, 4)];

    const items = renderOpencodeTranscript([...base, textPart('p1', 'msg-a', 'draft v2', 5)]);

    expect(deriveStatus(items, true)).toBe('running');
    // The update replaced in place rather than stacking.
    expect(items.filter((item) => item.kind === 'user_message')).toHaveLength(1);
    expect(items).toContainEqual({ kind: 'user_message', text: 'draft v2', timestamp: expect.any(String) });
  });
});

describe('OpencodeDataParts basename derivation (round-1 fix)', () => {
  /**
   * Builds minimal props for a registered data-part component: the runtime
   * supplies the `MessagePartState` side; only `data` matters here.
   * @param data - The data-part payload.
   * @returns Props shaped for `EditedFilesPart`.
   */
  function partProps<T>(data: T): ComponentProps<typeof EditedFilesPart> {
    return { data } as unknown as ComponentProps<typeof EditedFilesPart>;
  }

  it('witness: windows and posix paths both render as `<basename> edited` leaf rows', () => {
    const posix = renderToStaticMarkup(
      createElement(EditedFilesPart, partProps<OpencodeEditedFilesData>({ files: ['/w/src/one.ts'] }))
    );
    expect(posix).toContain('one.ts edited');

    const windows = renderToStaticMarkup(
      createElement(EditedFilesPart, partProps<OpencodeEditedFilesData>({ files: ['C:\\Users\\dev\\proj\\one.ts'] }))
    );
    expect(windows).toContain('one.ts edited');
    // No directory segments leak into the row.
    expect(windows).not.toContain('Users');
    expect(windows).not.toContain('proj');
  });

  it('derives basenames separator-agnostically in the multi-file disclosure body', () => {
    const html = renderToStaticMarkup(
      createElement(
        EditedFilesPart,
        partProps<OpencodeEditedFilesData>({ files: ['/w/src/two.ts', 'D:\\repo\\lib\\three.ts'] })
      )
    );
    expect(html).toContain('Edited 2 file(s)');
    expect(html).toContain('two.ts');
    expect(html).toContain('three.ts');
    expect(html).not.toContain('repo');
  });
});
