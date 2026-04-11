/**
 * Tests for mergeConsecutiveMessages.
 *
 * Verifies that consecutive same-author messages are merged into a single
 * message with a concatenated content array, and that boundaries are respected.
 *
 * @summary Unit tests for mergeConsecutiveMessages
 */

import { describe, expect, it } from 'vitest';
import type {
  AssistantMsg,
  ContentBlock,
  SessionMsg,
  UserMsg
} from '../src/streams/claude-code-session/www/lib/parse-session';
import { mergeConsecutiveMessages } from '../src/streams/claude-code-session/www/lib/parse-session';

const textBlock = (text: string): ContentBlock => ({ type: 'text', text });
const toolUseBlock = (id: string): ContentBlock => ({ type: 'tool_use', id, name: 'Bash', input: {} });
const toolResultBlock = (id: string): ContentBlock => ({ type: 'tool_result', tool_use_id: id, content: 'ok' });

const assistant = (blocks: ContentBlock[]): AssistantMsg => ({
  type: 'assistant',
  message: { content: blocks }
});

const user = (content: ContentBlock[] | string): UserMsg => ({
  type: 'user',
  message: { content }
});

const systemMsg = (): SessionMsg => ({ type: 'system', subtype: 'status', status: 'compacting' }) as SessionMsg;
const resultMsg = (): SessionMsg => ({ type: 'result', subtype: 'success' }) as SessionMsg;

describe('mergeConsecutiveMessages', () => {
  it('passes through a single message unchanged', () => {
    const msgs: SessionMsg[] = [assistant([textBlock('hello')])];
    const out = mergeConsecutiveMessages(msgs);
    expect(out).toHaveLength(1);
    expect((out[0] as AssistantMsg).message?.content).toEqual([textBlock('hello')]);
  });

  it('merges consecutive assistant messages into one', () => {
    const msgs: SessionMsg[] = [assistant([textBlock('part 1')]), assistant([textBlock('part 2')])];
    const out = mergeConsecutiveMessages(msgs);
    expect(out).toHaveLength(1);
    expect((out[0] as AssistantMsg).message?.content).toEqual([textBlock('part 1'), textBlock('part 2')]);
  });

  it('merges three consecutive assistant messages', () => {
    const msgs: SessionMsg[] = [assistant([textBlock('a')]), assistant([textBlock('b')]), assistant([textBlock('c')])];
    const out = mergeConsecutiveMessages(msgs);
    expect(out).toHaveLength(1);
    expect((out[0] as AssistantMsg).message?.content).toEqual([textBlock('a'), textBlock('b'), textBlock('c')]);
  });

  it('does not merge assistant messages across a system message', () => {
    const msgs: SessionMsg[] = [assistant([textBlock('before')]), systemMsg(), assistant([textBlock('after')])];
    const out = mergeConsecutiveMessages(msgs);
    expect(out).toHaveLength(3);
  });

  it('does not merge an assistant error message with an adjacent assistant message', () => {
    const error: AssistantMsg = { type: 'assistant', error: 'rate limit' };
    const msgs: SessionMsg[] = [assistant([textBlock('ok')]), error, assistant([textBlock('retry')])];
    const out = mergeConsecutiveMessages(msgs);
    expect(out).toHaveLength(3);
  });

  it('merges consecutive user text messages into one', () => {
    const msgs: SessionMsg[] = [user([textBlock('hello')]), user([textBlock('world')])];
    const out = mergeConsecutiveMessages(msgs);
    expect(out).toHaveLength(1);
    expect((out[0] as UserMsg).message?.content).toEqual([textBlock('hello'), textBlock('world')]);
  });

  it('normalizes string user content to a text block when merging', () => {
    const msgs: SessionMsg[] = [user('first'), user([textBlock('second')])];
    const out = mergeConsecutiveMessages(msgs);
    expect(out).toHaveLength(1);
    expect((out[0] as UserMsg).message?.content).toEqual([textBlock('first'), textBlock('second')]);
  });

  it('does not merge an isMeta user message with a regular user message', () => {
    const metaMsg = {
      type: 'user',
      isMeta: true,
      sourceToolUseID: 'x',
      message: { content: [textBlock('meta')] }
    } as unknown as SessionMsg;
    const msgs: SessionMsg[] = [user([textBlock('human')]), metaMsg];
    const out = mergeConsecutiveMessages(msgs);
    expect(out).toHaveLength(2);
  });

  it('does not merge a regular user message into an isMeta message', () => {
    const metaMsg = {
      type: 'user',
      isMeta: true,
      sourceToolUseID: 'x',
      message: { content: [textBlock('meta')] }
    } as unknown as SessionMsg;
    const msgs: SessionMsg[] = [metaMsg, user([textBlock('human')])];
    const out = mergeConsecutiveMessages(msgs);
    expect(out).toHaveLength(2);
  });

  it('merges consecutive tool-result user messages', () => {
    const msgs: SessionMsg[] = [user([toolResultBlock('tool-1')]), user([toolResultBlock('tool-2')])];
    const out = mergeConsecutiveMessages(msgs);
    expect(out).toHaveLength(1);
    expect((out[0] as UserMsg).message?.content).toEqual([toolResultBlock('tool-1'), toolResultBlock('tool-2')]);
  });

  it('preserves alternating assistant / user boundaries', () => {
    const msgs: SessionMsg[] = [
      assistant([textBlock('hi')]),
      user([textBlock('hello')]),
      assistant([textBlock('bye')])
    ];
    const out = mergeConsecutiveMessages(msgs);
    expect(out).toHaveLength(3);
  });

  it('preserves tool_use blocks inside merged assistant messages', () => {
    const msgs: SessionMsg[] = [
      assistant([textBlock('thinking...'), toolUseBlock('id-1')]),
      assistant([textBlock('also')])
    ];
    const out = mergeConsecutiveMessages(msgs);
    expect(out).toHaveLength(1);
    expect((out[0] as AssistantMsg).message?.content).toEqual([
      textBlock('thinking...'),
      toolUseBlock('id-1'),
      textBlock('also')
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(mergeConsecutiveMessages([])).toEqual([]);
  });

  it('does not merge across a result message', () => {
    const msgs: SessionMsg[] = [assistant([textBlock('done')]), resultMsg(), assistant([textBlock('new session')])];
    const out = mergeConsecutiveMessages(msgs);
    expect(out).toHaveLength(3);
  });
});
