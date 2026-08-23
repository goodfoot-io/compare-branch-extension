/**
 * Tests for incremental folding of the OpenCode compact state.
 *
 * {@link reconcileFolded} carries a line watermark inside the folded value so
 * steady-state appends parse and fold only the new lines, while a shrink
 * (truncation or stream replacement) rebuilds fully from the replacement
 * lines. These tests pin that behavior with a `JSON.parse` spy — every fold of
 * a transcript line costs exactly one envelope parse, so parse counts are a
 * direct proxy for work done.
 *
 * @summary Unit tests for the OpenCode compact state's watermark reconciliation
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildFoldedState,
  buildOpencodeCompactState,
  reconcileFolded
} from '../src/streams/opencode-session/www/lib/compact-state.js';

// ============================================================================
// Fixture helpers — exporter envelope shapes (mirrors opencode-parser)
// ============================================================================

/**
 * Wraps a payload in the exporter's envelope.
 * @param type - The envelope type discriminator (`meta` | `message` | `part`).
 * @param data - The payload object.
 * @param ts - ISO 8601 UTC timestamp for the envelope.
 * @returns Serialized NDJSON line.
 */
function envelope(type: string, data: unknown, ts = '2026-06-04T12:00:00.000Z'): string {
  return JSON.stringify({ v: 1, ts, seq: 1, sessionId: 'ses-123', type, data });
}

function metaLine(): string {
  return envelope('meta', { runtime: 'opencode', opencodeVersion: '1.18.21' }, '2026-06-04T10:00:00.000Z');
}

function userMessageLine(id: string): string {
  return envelope('message', { id, role: 'user', time: { created: 1 } }, '2026-06-04T10:01:00.000Z');
}

function assistantMessageLine(id: string, modelID = 'claude-x'): string {
  return envelope('message', { id, role: 'assistant', modelID, providerID: 'anthropic' }, '2026-06-04T10:02:00.000Z');
}

function textPartLine(messageId: string, partId: string, text: string, ts = '2026-06-04T10:03:00.000Z'): string {
  return envelope('part', { id: partId, messageID: messageId, type: 'text', text }, ts);
}

function completedToolPartLine(
  messageId: string,
  partId: string,
  callId: string,
  command: string,
  result: string,
  ts = '2026-06-04T10:04:00.000Z'
): string {
  return envelope(
    'part',
    {
      id: partId,
      messageID: messageId,
      type: 'tool',
      callID: callId,
      tool: 'bash',
      state: { status: 'completed', input: { command }, result }
    },
    ts
  );
}

/**
 * Spies on `JSON.parse`, returning a spy whose call count measures fold work.
 * @returns A fresh `JSON.parse` spy.
 */
function makeParseSpy(): ReturnType<typeof vi.spyOn<JSON, 'parse'>> {
  return vi.spyOn(JSON, 'parse');
}

let parseSpy: ReturnType<typeof makeParseSpy> | undefined;

afterEach(() => {
  parseSpy?.mockRestore();
  parseSpy = undefined;
});

/**
 * Measures the number of `JSON.parse` calls made while running `fn`.
 * @param fn - The function to measure.
 * @returns The number of `JSON.parse` calls during `fn`.
 */
function countParses(fn: () => void): number {
  parseSpy ??= makeParseSpy();
  parseSpy.mockClear();
  fn();
  return parseSpy.mock.calls.length;
}

describe('buildFoldedState / reconcileFolded — incremental append cost', () => {
  it('parses each source line exactly once on the initial fold', () => {
    const lines = [
      metaLine(),
      userMessageLine('msg-u'),
      textPartLine('msg-u', 'p1', 'please look'),
      assistantMessageLine('msg-a'),
      textPartLine('msg-a', 'p2', 'looking now')
    ];
    expect(countParses(() => buildFoldedState(lines, true))).toBe(lines.length);
  });

  it('parses only the newly appended lines on a steady-state append', () => {
    const base = [metaLine(), userMessageLine('msg-u'), textPartLine('msg-u', 'p1', 'hello')];
    const appended = [assistantMessageLine('msg-a'), textPartLine('msg-a', 'p2', 'hi back')];

    const folded = buildFoldedState(base, true);
    expect(countParses(() => reconcileFolded(folded, [...base, ...appended], true))).toBe(appended.length);
  });

  it('returns the previous folded value by reference and parses nothing when lines and liveness are unchanged', () => {
    const lines = [metaLine(), textPartLine('msg-u', 'p1', 'steady')];
    const folded = buildFoldedState(lines, false);
    let again: ReturnType<typeof buildFoldedState> | undefined;
    expect(
      countParses(() => {
        again = reconcileFolded(folded, lines, false);
      })
    ).toBe(0);
    expect(again).toBe(folded);
  });
});

describe('reconcileFolded — shrink triggers full rebuild', () => {
  it('drops stale tallies and reparses every replacement line', () => {
    const wide = [
      metaLine(),
      assistantMessageLine('msg-a'),
      textPartLine('msg-a', 'p1', 'one'),
      completedToolPartLine('msg-a', 'p2', 'call-1', 'ls', 'file.txt')
    ];
    const folded = buildFoldedState(wide, false);
    expect(folded.state.toolCallCount).toBe(1);

    const narrower = [metaLine()];
    let rebuilt: ReturnType<typeof buildFoldedState> | undefined;
    expect(
      countParses(() => {
        rebuilt = reconcileFolded(folded, narrower, false);
      })
    ).toBe(narrower.length);
    expect(rebuilt!.lineCount).toBe(1);
    expect(rebuilt!.state.toolCallCount).toBe(0);
    expect(rebuilt!.state.headlineText).toBe('');
    expect(rebuilt!.fold).not.toBe(folded.fold);
  });
});

describe('reconcileFolded — incremental equivalence', () => {
  it('matches a one-shot rebuild when the transcript arrives in batches', () => {
    const batch1 = [metaLine(), userMessageLine('msg-u')];
    const batch2 = [textPartLine('msg-u', 'p1', 'please look'), assistantMessageLine('msg-a')];
    const batch3 = [
      textPartLine('msg-a', 'p2', 'working…', '2026-06-04T10:05:00.000Z'),
      textPartLine('msg-a', 'p2', 'working… done', '2026-06-04T10:06:00.000Z'),
      completedToolPartLine('msg-a', 'p3', 'call-1', 'ls', 'file.txt', '2026-06-04T10:07:00.000Z')
    ];

    const all = [...batch1, ...batch2, ...batch3];
    let folded = buildFoldedState(batch1, true);
    folded = reconcileFolded(folded, [...batch1, ...batch2], true);
    folded = reconcileFolded(folded, all, true);

    expect(folded.state).toEqual(buildOpencodeCompactState(all, true));
    expect(folded.lineCount).toBe(all.length);
  });
});

describe('reconcileFolded — cross-batch state carried forward', () => {
  it('mutates the existing tail entry when a streaming text update lands in a later batch', () => {
    const base = [metaLine(), assistantMessageLine('msg-a'), textPartLine('msg-a', 'p1', 'Hello')];
    const folded = buildFoldedState(base, false);
    expect(folded.state.tail.filter((e) => e.kind === 'message')).toHaveLength(1);

    const updated = reconcileFolded(folded, [...base, textPartLine('msg-a', 'p1', 'Hello world')], false);
    const messageTail = updated.state.tail.filter((e) => e.kind === 'message');
    expect(messageTail).toHaveLength(1);
    expect(messageTail[0]?.text).toBe('Hello world');
    expect(updated.state.headlineText).toBe('Hello world');
  });

  it('does not double-count a re-fired tool part that lands in a later batch', () => {
    const base = [
      metaLine(),
      assistantMessageLine('msg-a'),
      completedToolPartLine('msg-a', 'p1', 'call-1', 'ls', 'a.txt')
    ];
    const folded = buildFoldedState(base, false);
    expect(folded.state.toolCallCount).toBe(1);

    // The same tool part re-fires (same message + part identity) with fresh state.
    const refired = reconcileFolded(
      folded,
      [...base, completedToolPartLine('msg-a', 'p1', 'call-1', 'ls', 'a.txt')],
      false
    );
    expect(refired.lineCount).toBe(base.length + 1);
    expect(refired.state.toolCallCount).toBe(1);
    expect(refired.state.tail.filter((e) => e.kind === 'tool')).toHaveLength(1);
  });

  it('does not double-count a re-emitted user message record in a later batch', () => {
    const base = [metaLine(), userMessageLine('msg-u')];
    const folded = buildFoldedState(base, false);
    expect(folded.state.turnCount).toBe(1);

    const again = reconcileFolded(folded, [...base, userMessageLine('msg-u')], false);
    expect(again.lineCount).toBe(base.length + 1);
    expect(again.state.turnCount).toBe(1);
  });
});
