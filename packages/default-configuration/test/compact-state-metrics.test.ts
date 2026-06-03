/**
 * Tests for the de-duplicated metrics, headline fallback chain, and headline
 * sanitizer added to the compact session state machine.
 *
 * The transcript is double-written (every `uuid` appears twice), so every tally
 * must de-duplicate by line `uuid`. These tests pin that contract along with the
 * tool/sub-agent/file/model/token/timestamp tallies, the
 * away_summary → assistant → tail headline chain, and the `sanitizeHeadline`
 * rejection rules that keep slash-command markup and control traffic out.
 *
 * @summary Unit tests for compact-state de-dup, tallies, headline, and sanitizer
 */

import { describe, expect, it } from 'vitest';
import { buildState, headline } from '../src/streams/claude-code-session/www/components/compact/compact-state';
import { sanitizeHeadline } from '../src/streams/claude-code-session/www/lib/sanitize';

let uuidCounter = 0;
/**
 * Generates a stable, unique uuid string for fixtures.
 * @returns A unique `uuid-N` string.
 */
function nextUuid(): string {
  uuidCounter += 1;
  return `uuid-${uuidCounter}`;
}

/**
 * Builds an assistant JSONL line carrying optional text, tool_use, and usage blocks.
 * @param opts - Fixture options.
 * @param opts.uuid - Top-level line uuid (defaults to a fresh unique value).
 * @param opts.timestamp - ISO timestamp for the line.
 * @param opts.model - `message.model` value.
 * @param opts.text - Assistant text block content.
 * @param opts.toolUses - Tool_use blocks to embed, each with a name and input.
 * @param opts.outputTokens - `message.usage.output_tokens` value.
 * @param opts.inputTokens - `message.usage.input_tokens` value.
 * @returns The serialized JSONL line.
 */
function assistantLine(opts: {
  uuid?: string;
  timestamp?: string;
  model?: string;
  text?: string;
  toolUses?: Array<{ name: string; input?: Record<string, unknown> }>;
  outputTokens?: number;
  inputTokens?: number;
}): string {
  const content: unknown[] = [];
  if (opts.text != null) content.push({ type: 'text', text: opts.text });
  for (const tool of opts.toolUses ?? []) {
    content.push({ type: 'tool_use', id: nextUuid(), name: tool.name, input: tool.input ?? {} });
  }
  const usage: Record<string, number> = {};
  if (opts.outputTokens != null) usage.output_tokens = opts.outputTokens;
  if (opts.inputTokens != null) usage.input_tokens = opts.inputTokens;
  const message: Record<string, unknown> = { content };
  if (opts.model != null) message.model = opts.model;
  if (Object.keys(usage).length > 0) message.usage = usage;
  return JSON.stringify({
    type: 'assistant',
    uuid: opts.uuid ?? nextUuid(),
    timestamp: opts.timestamp,
    message
  });
}

/**
 * Builds a `turn_duration` system JSONL line.
 * @param uuid - Top-level line uuid.
 * @param durationMs - Turn duration in milliseconds.
 * @param timestamp - Optional ISO timestamp for the line.
 * @returns The serialized JSONL line.
 */
function turnDurationLine(uuid: string, durationMs = 1000, timestamp?: string): string {
  return JSON.stringify({ type: 'system', subtype: 'turn_duration', uuid, durationMs, timestamp });
}

/**
 * Builds a user JSONL line whose message content is a single text block.
 * @param text - The user text content.
 * @param uuid - Top-level line uuid (defaults to a fresh unique value).
 * @returns The serialized JSONL line.
 */
function userLine(text: string, uuid = nextUuid()): string {
  return JSON.stringify({ type: 'user', uuid, message: { content: [{ type: 'text', text }] } });
}

function awaySummaryLine(content: string): string {
  return JSON.stringify({ type: 'system', subtype: 'away_summary', uuid: nextUuid(), content });
}

describe('buildState — uuid de-duplication', () => {
  it('counts each uuid once even when every line is written twice', () => {
    const turnA = turnDurationLine('turn-a');
    const turnB = turnDurationLine('turn-b');
    const toolLine = assistantLine({
      uuid: 'asst-a',
      toolUses: [
        { name: 'Read', input: { file_path: '/a.ts' } },
        { name: 'Agent', input: { description: 'sub' } }
      ]
    });
    // Each line appears twice — the flush-artifact double-write.
    const lines = [turnA, turnA, turnB, turnB, toolLine, toolLine];
    const state = buildState(lines, 'session.jsonl', undefined);

    expect(state.turnCount).toBe(2); // 2 turns from 4 turn_duration lines
    expect(state.toolCallCount).toBe(2); // Read + Agent, not 4
    expect(state.subagentCount).toBe(1); // one Agent, not 2
  });

  it('counts a line without a uuid once (never skipped)', () => {
    const noUuid = JSON.stringify({ type: 'system', subtype: 'turn_duration', durationMs: 500 });
    const state = buildState([noUuid], 'session.jsonl', undefined);
    expect(state.turnCount).toBe(1);
  });

  it('does not skip distinct uuids that share other fields', () => {
    const lines = [turnDurationLine('t1'), turnDurationLine('t2'), turnDurationLine('t3')];
    const state = buildState(lines, 'session.jsonl', undefined);
    expect(state.turnCount).toBe(3);
  });
});

describe('buildState — tallies', () => {
  it('counts only Agent tool calls as sub-agents, not subagent-tool-call progress lines', () => {
    const agentDispatch = assistantLine({
      uuid: 'a1',
      toolUses: [{ name: 'Agent', input: { description: 'do work' } }]
    });
    // A progress line emits `subagent-tool-call` events — they count as tool
    // calls but NEVER as sub-agents, even when the inner tool is itself `Agent`.
    const progress = JSON.stringify({
      type: 'progress',
      uuid: 'p1',
      data: {
        type: 'agent_progress',
        content: [
          { type: 'tool_use', id: 'x', name: 'Bash', input: {} },
          { type: 'tool_use', id: 'y', name: 'Agent', input: { description: 'nested' } }
        ]
      }
    });
    const state = buildState([agentDispatch, progress], 'session.jsonl', undefined);
    expect(state.subagentCount).toBe(1); // only the top-level Agent dispatch
    expect(state.toolCallCount).toBe(3); // top Agent + subagent Bash + subagent Agent
  });

  it('collects distinct Edit/Write/MultiEdit file paths', () => {
    const lines = [
      assistantLine({ uuid: 'e1', toolUses: [{ name: 'Edit', input: { file_path: '/types.ts' } }] }),
      assistantLine({ uuid: 'e2', toolUses: [{ name: 'Write', input: { file_path: '/host.ts' } }] }),
      // Duplicate path via a different tool — still one distinct path.
      assistantLine({ uuid: 'e3', toolUses: [{ name: 'MultiEdit', input: { file_path: '/types.ts' } }] }),
      // Read is not a write — must not be counted as a touched file.
      assistantLine({ uuid: 'e4', toolUses: [{ name: 'Read', input: { file_path: '/ignored.ts' } }] })
    ];
    const state = buildState(lines, 'session.jsonl', undefined);
    expect([...state.filesTouched].sort()).toEqual(['/host.ts', '/types.ts']);
  });

  it('stores the model with the claude- prefix stripped (latest wins)', () => {
    const lines = [
      assistantLine({ uuid: 'm1', model: 'claude-sonnet-4-5', text: 'hi' }),
      assistantLine({ uuid: 'm2', model: 'claude-opus-4-8', text: 'later' })
    ];
    const state = buildState(lines, 'session.jsonl', undefined);
    expect(state.model).toBe('opus-4-8');
  });

  it('tracks firstTimestamp/lastTimestamp as the min/max of line timestamps', () => {
    const lines = [
      turnDurationLine('t1', 1000, '2026-06-01T20:10:15.000Z'),
      turnDurationLine('t2', 1000, '2026-06-01T03:43:36.000Z'), // earlier clock time, same day
      turnDurationLine('t3', 1000, '2026-06-02T03:43:36.000Z') // latest
    ];
    const state = buildState(lines, 'session.jsonl', undefined);
    expect(state.firstTimestamp).toBe(Date.parse('2026-06-01T03:43:36.000Z'));
    expect(state.lastTimestamp).toBe(Date.parse('2026-06-02T03:43:36.000Z'));
  });

  it('sums input tokens alongside output tokens', () => {
    const lines = [
      assistantLine({ uuid: 'u1', text: 'a', outputTokens: 100, inputTokens: 40 }),
      assistantLine({ uuid: 'u2', text: 'b', outputTokens: 200, inputTokens: 60 })
    ];
    const state = buildState(lines, 'session.jsonl', undefined);
    expect(state.outputTokensTotal).toBe(300);
    expect(state.inputTokensTotal).toBe(100);
  });
});

describe('headline — fallback chain', () => {
  it('prefers away_summary over assistant text and tail', () => {
    const lines = [
      assistantLine({ uuid: 'h1', text: 'Assistant said something.' }),
      awaySummaryLine('The session merged the change into main.')
    ];
    const state = buildState(lines, 'session.jsonl', undefined);
    expect(headline(state)).toBe('The session merged the change into main.');
  });

  it('falls back to the last assistant text when there is no away_summary', () => {
    const lines = [
      assistantLine({ uuid: 'h1', text: 'First assistant message.' }),
      assistantLine({ uuid: 'h2', text: 'Latest assistant message wins.' })
    ];
    const state = buildState(lines, 'session.jsonl', undefined);
    expect(headline(state)).toBe('Latest assistant message wins.');
  });

  it('falls back to the latest tail text event when there is neither summary nor assistant text', () => {
    // A genuine user line produces a role:'user' text event that lands in the tail
    // but is NOT recorded as lastAssistantText.
    const state = buildState([userLine('A genuine human prompt.')], 'session.jsonl', undefined);
    expect(state.lastAssistantText).toBe('');
    expect(headline(state)).toBe('A genuine human prompt.');
  });

  it('never surfaces a slash-command-markup user line (markup-leak regression lock)', () => {
    const markup =
      '<command-message>runtime:card-developer</command-message><command-name>runtime:card-developer</command-name><skill-format>true</skill-format>Base directory for this skill: /home/node/foo';
    const state = buildState([userLine(markup)], 'session.jsonl', undefined);
    expect(headline(state)).toBe('');
    // The leak text must not even enter the rolling tail.
    expect(state.tail).toEqual([]);
  });
});

describe('sanitizeHeadline', () => {
  it('rejects <command-*> and <skill-format> wrapper markup wholesale', () => {
    // A command/skill wrapper means the whole line is a slash-command
    // expansion — stripping the tags would leak its machine inner text.
    expect(sanitizeHeadline('<command-name>do-thing</command-name>Refactor the parser.')).toBe('');
    expect(sanitizeHeadline('<command-message>runtime:foo</command-message>')).toBe('');
    expect(sanitizeHeadline('<skill-format>true</skill-format>Base directory: /x')).toBe('');
  });

  it('strips benign inline tags while keeping the surrounding prose', () => {
    expect(sanitizeHeadline('Refactored the <em>parser</em> into modules.')).toBe(
      'Refactored the parser into modules.'
    );
  });

  it('returns empty for whitespace-only and empty input', () => {
    expect(sanitizeHeadline('   ')).toBe('');
    expect(sanitizeHeadline('')).toBe('');
  });

  it('rejects JSON-ish content', () => {
    expect(sanitizeHeadline('{"type":"system"}')).toBe('');
    expect(sanitizeHeadline('[1, 2, 3]')).toBe('');
  });

  it('rejects each named control-traffic prefix', () => {
    expect(sanitizeHeadline('Load the extension-dev skill now.')).toBe('');
    expect(sanitizeHeadline('Base directory for this skill: /home/node/foo')).toBe('');
    expect(sanitizeHeadline('Stop hook feedback: you forgot to lint.')).toBe('');
  });

  it('rejects teammate-message control markers', () => {
    expect(sanitizeHeadline('<teammate-message from="planner">go</teammate-message>')).toBe('');
  });

  it('keeps ordinary human/assistant prose intact', () => {
    expect(sanitizeHeadline('  Implemented the de-dup guard and tallies.  ')).toBe(
      'Implemented the de-dup guard and tallies.'
    );
  });
});
