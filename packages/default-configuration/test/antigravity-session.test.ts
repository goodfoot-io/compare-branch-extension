/**
 * Contract checks for the Antigravity session lib: CLI argument construction
 * (interactive `-i` / background `-p --output-format stream-json`, never
 * `--dangerously-skip-permissions`) and structured final-result parsing from
 * the child-owned stream-json stdout.
 *
 * @summary Antigravity session-lib argv and stream-parsing contract
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { AntigravityFinalRecord } from '../src/lib/antigravity-session.js';

/**
 * The pinned one-shot result tuple captured by the live authentication-probe
 * witness (notes/agy-live-witnesses.md) — the final stream-json record shape
 * the parser keys on.
 */
const PINNED_FINAL_RECORD = {
  conversation_id: '8724cd98-6b07-4080-82d3-1c617be236bf',
  status: 'SUCCESS',
  response: 'PONG\n',
  duration_seconds: 2.019906168,
  num_turns: 1,
  usage: { input_tokens: 13901, output_tokens: 2, thinking_tokens: 0, cache_read_tokens: 0, total_tokens: 13903 }
};

describe('buildAntigravityArgs', () => {
  it('builds terminal-owned interactive argv from -i plus the prompt', async () => {
    const { buildAntigravityArgs } = await import('../src/lib/antigravity-session.js');

    expect(buildAntigravityArgs('Load the `cards:card` skill.', 'interactive')).toEqual([
      '-i',
      'Load the `cards:card` skill.'
    ]);
  });

  it('builds child-owned background argv from -p plus the prompt with stream-json output', async () => {
    const { buildAntigravityArgs } = await import('../src/lib/antigravity-session.js');

    expect(buildAntigravityArgs('Run the launch routing.', 'background')).toEqual([
      '-p',
      'Run the launch routing.',
      '--output-format',
      'stream-json'
    ]);
  });

  it('passes no prompt argument for a prompt-less interactive launch', async () => {
    const { buildAntigravityArgs } = await import('../src/lib/antigravity-session.js');

    expect(buildAntigravityArgs(undefined, 'interactive')).toEqual(['-i']);
  });

  it('refuses a background launch without a prompt (nothing to run one-shot)', async () => {
    const { buildAntigravityArgs } = await import('../src/lib/antigravity-session.js');

    expect(() => buildAntigravityArgs(undefined, 'background')).toThrow(/prompt/i);
  });

  it('never passes --dangerously-skip-permissions in either mode', async () => {
    const { buildAntigravityArgs } = await import('../src/lib/antigravity-session.js');

    for (const executionMode of ['interactive', 'background'] as const) {
      const args = buildAntigravityArgs('prompt', executionMode);
      expect(args).not.toContain('--dangerously-skip-permissions');
    }
  });
});

describe('parseAntigravityFinalRecord', () => {
  it('parses the pinned result tuple into conversationId/status/response', async () => {
    const { parseAntigravityFinalRecord } = await import('../src/lib/antigravity-session.js');

    const record: AntigravityFinalRecord | null = parseAntigravityFinalRecord(
      `${JSON.stringify(PINNED_FINAL_RECORD)}\n`
    );
    expect(record).toEqual({
      conversationId: '8724cd98-6b07-4080-82d3-1c617be236bf',
      status: 'SUCCESS',
      response: 'PONG\n'
    });
  });

  it('skips unpinned event records and keeps the last record carrying the pinned field set', async () => {
    const { parseAntigravityFinalRecord } = await import('../src/lib/antigravity-session.js');

    const event = { type: 'turn.started' };
    const statusOnly = { status: 'RUNNING' };
    const final = { ...PINNED_FINAL_RECORD, response: 'done' };
    const stdout = [event, statusOnly, final].map((line) => JSON.stringify(line)).join('\n');

    expect(parseAntigravityFinalRecord(stdout)).toEqual({
      conversationId: '8724cd98-6b07-4080-82d3-1c617be236bf',
      status: 'SUCCESS',
      response: 'done'
    });
  });

  it('tolerates blank lines between records', async () => {
    const { parseAntigravityFinalRecord } = await import('../src/lib/antigravity-session.js');

    const stdout = `\n${JSON.stringify(PINNED_FINAL_RECORD)}\n\n`;
    expect(parseAntigravityFinalRecord(stdout)?.status).toBe('SUCCESS');
  });

  it('returns null when the stream carries no pinned final record', async () => {
    const { parseAntigravityFinalRecord } = await import('../src/lib/antigravity-session.js');

    expect(parseAntigravityFinalRecord('')).toBeNull();
    expect(parseAntigravityFinalRecord('\n\n')).toBeNull();
    expect(parseAntigravityFinalRecord(JSON.stringify({ type: 'turn.started' }))).toBeNull();
  });

  it('fails the stream on a non-JSON, non-blank line', async () => {
    const { AntigravityStreamError, parseAntigravityFinalRecord } = await import('../src/lib/antigravity-session.js');

    expect(() => parseAntigravityFinalRecord('not json\n')).toThrow(AntigravityStreamError);
    expect(() => parseAntigravityFinalRecord(`${JSON.stringify(PINNED_FINAL_RECORD)}\ntrailing garbage\n`)).toThrow(
      AntigravityStreamError
    );
  });
});
