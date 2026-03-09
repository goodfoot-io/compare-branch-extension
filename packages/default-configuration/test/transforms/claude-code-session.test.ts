import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TestStreamTransformHarness } from '@cards/test-utils';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * Exercises claude code session behavior in the transforms area through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve expected state
 * transitions and output.
 *
 * @summary Tests claude code session behavior in transforms
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distBin = path.resolve(__dirname, '../../dist/bin');

let transformCode: string;

beforeAll(() => {
  const files = fs.readdirSync(distBin);
  const mjsFile = files.find((f) => f.startsWith('claude-code-session.') && f.endsWith('.mjs'));
  if (!mjsFile) {
    throw new Error('Compiled .mjs not found in dist/bin/. Run yarn build first.');
  }
  transformCode = fs.readFileSync(path.join(distBin, mjsFile), 'utf-8');
});

let harness: TestStreamTransformHarness;

beforeEach(async () => {
  harness = new TestStreamTransformHarness();
  await harness.start(transformCode);
});

afterEach(async () => {
  if (harness?.isStarted) {
    await harness.stop();
  }
});

/**
 * Stringifies an SDK-like message object and runs it through the harness.
 *
 * @param obj Message payload to serialize into NDJSON line format.
 * @returns Harness transform result containing either output or error.
 */
async function transformJson(obj: Record<string, unknown>): Promise<{ result?: string; error?: string }> {
  return harness.transform(JSON.stringify(obj));
}

describe('Init & State', () => {
  it('initializes state with turn=0', async () => {
    const { result, error } = await transformJson({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'First message' }] }
    });

    expect(error).toBeUndefined();
    expect(result).toBe('First message');
  });

  it('turn counter increments on each assistant message', async () => {
    for (let i = 1; i <= 3; i++) {
      const { result, error } = await transformJson({
        type: 'assistant',
        message: { content: [{ type: 'text', text: `Message ${i}` }] }
      });

      expect(error).toBeUndefined();
      expect(result).toBe(`Message ${i}`);
    }
  });

  it('state persists between init and transform calls', async () => {
    const { result, error } = await transformJson({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'Test persistence' }] }
    });

    expect(error).toBeUndefined();
    expect(result).toBe('Test persistence');
  });
});

describe('Assistant Messages', () => {
  it('formats text content block', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'Hello world' }] }
    });

    expect(result).toBe('Hello world');
  });

  it('formats thinking block with > *thinking:* prefix', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: { content: [{ type: 'thinking', thinking: 'I am thinking' }] }
    });

    expect(result).toBe('> *thinking:* I am thinking');
  });

  it('formats tool_use Read with file_path', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: '1', name: 'Read', input: { file_path: '/src/index.ts' } }]
      }
    });

    expect(result).toBe('**Read** /src/index.ts');
  });

  it('formats tool_use Write with file_path', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: '2', name: 'Write', input: { file_path: '/src/output.ts' } }]
      }
    });

    expect(result).toBe('**Write** /src/output.ts');
  });

  it('formats tool_use Edit with file_path', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: '3', name: 'Edit', input: { file_path: '/src/config.json' } }]
      }
    });

    expect(result).toBe('**Edit** /src/config.json');
  });

  it('formats tool_use Bash with truncated command', async () => {
    const longCommand = 'a'.repeat(100);
    const { result } = await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: '4', name: 'Bash', input: { command: longCommand } }]
      }
    });

    expect(result).toBe(`**Bash** ${'a'.repeat(80)}...`);
  });

  it('formats tool_use Grep with pattern', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: '5', name: 'Grep', input: { pattern: 'searchTerm' } }]
      }
    });

    expect(result).toBe('**Grep** searchTerm');
  });

  it('formats tool_use Glob with pattern', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: '6', name: 'Glob', input: { pattern: '*.ts' } }]
      }
    });

    expect(result).toBe('**Glob** *.ts');
  });

  it('formats tool_use Agent with description', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: '7', name: 'Agent', input: { description: 'do something' } }]
      }
    });

    expect(result).toBe('**Agent** do something');
  });

  it('formats unknown tool with just bold name', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: '8', name: 'WebSearch', input: { query: 'something' } }]
      }
    });

    expect(result).toBe('**WebSearch**');
  });

  it('formats mixed content blocks joined by double newlines', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'First block' },
          { type: 'thinking', thinking: 'Some thought' },
          { type: 'tool_use', id: '9', name: 'Read', input: { file_path: '/test.ts' } }
        ]
      }
    });

    expect(result).toBe('First block\n\n> *thinking:* Some thought\n\n**Read** /test.ts');
  });

  it('formats empty content as *(empty response)*', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: { content: [] }
    });

    expect(result).toBe('*(empty response)*');
  });

  it('formats API error with error type', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: { content: [] },
      error: 'server_error'
    });

    expect(result).toBe('**API Error** (server_error)');
  });
});

describe('User Messages', () => {
  it('formats user prompt with string content', async () => {
    const { result } = await transformJson({
      type: 'user',
      message: { role: 'user', content: 'Hello Claude' },
      parent_tool_use_id: null,
      session_id: 'sess-1'
    });

    expect(result).toBe('**User:** Hello Claude');
  });

  it('formats user prompt with content block array', async () => {
    const { result } = await transformJson({
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'Please help me with this' }]
      },
      parent_tool_use_id: null,
      session_id: 'sess-1'
    });

    expect(result).toBe('**User:** Please help me with this');
  });

  it('marks synthetic user messages', async () => {
    const { result } = await transformJson({
      type: 'user',
      message: { role: 'user', content: 'Auto-generated prompt' },
      parent_tool_use_id: null,
      isSynthetic: true,
      session_id: 'sess-1'
    });

    expect(result).toBe('**User** *(auto)*: Auto-generated prompt');
  });

  it('suppresses tool result turns', async () => {
    const { result } = await transformJson({
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'tu-1', content: 'file contents' }]
      },
      parent_tool_use_id: null,
      tool_use_result: { content: 'file contents' },
      session_id: 'sess-1'
    });

    expect(result).toBe('');
  });

  it('renders tool error blocks in user messages', async () => {
    const { result } = await transformJson({
      type: 'user',
      message: {
        role: 'user',
        content: [
          { type: 'text', text: 'Here is the context' },
          { type: 'tool_result', tool_use_id: 'tu-1', content: 'error output', is_error: true }
        ]
      },
      parent_tool_use_id: null,
      session_id: 'sess-1'
    });

    expect(result).toBe('**User:** Here is the context\n\n**Tool error** (tu-1)');
  });

  it('suppresses replay messages', async () => {
    const { result } = await transformJson({
      type: 'user',
      message: { role: 'user', content: 'Original prompt' },
      parent_tool_use_id: null,
      isReplay: true,
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    // Replay messages are user type — formatUser checks tool_use_result, not isReplay.
    // They still render as user prompts (they carry the original prompt text).
    expect(result).toBe('**User:** Original prompt');
  });
});

describe('System Messages', () => {
  it('formats init subtype with model, tools count, cwd', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'init',
      model: 'claude-3',
      tools: ['Read', 'Write', 'Edit', 'Bash', 'Grep'],
      cwd: '/home'
    });

    expect(result).toBe('**Session Started** | claude-3 | 5 tools | /home');
  });

  it('formats status compacting', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'status',
      status: 'compacting',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('*Compacting context...*');
  });

  it('suppresses status null (compaction finished)', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'status',
      status: null,
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('');
  });

  it('formats compact_boundary with trigger and tokens', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'compact_boundary',
      compact_metadata: { trigger: 'manual', pre_tokens: 50000 },
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('---\n*Context compacted* (manual) — 50000 tokens before\n\n---');
  });

  it('formats compact_boundary with auto trigger', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'compact_boundary',
      compact_metadata: { trigger: 'auto', pre_tokens: 120000 },
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('---\n*Context compacted* (auto) — 120000 tokens before\n\n---');
  });

  it('formats hook_started', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'hook_started',
      hook_id: 'h-1',
      hook_name: 'lint-check',
      hook_event: 'PreToolUse',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('<small>Hook <b>lint-check</b> (PreToolUse) started</small>');
  });

  it('formats hook_progress with output', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'hook_progress',
      hook_id: 'h-1',
      hook_name: 'lint-check',
      hook_event: 'PreToolUse',
      output: 'Running eslint...',
      stdout: '',
      stderr: '',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('<small>Hook <b>lint-check</b>: Running eslint...</small>');
  });

  it('formats hook_progress falls back to stdout when output is empty', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'hook_progress',
      hook_id: 'h-1',
      hook_name: 'lint-check',
      hook_event: 'PreToolUse',
      output: '',
      stdout: 'stdout output',
      stderr: '',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('<small>Hook <b>lint-check</b>: stdout output</small>');
  });

  it('formats hook_response success', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'hook_response',
      hook_id: 'h-1',
      hook_name: 'lint-check',
      hook_event: 'PreToolUse',
      output: '',
      stdout: '',
      stderr: '',
      exit_code: 0,
      outcome: 'success',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('<small>Hook <b>lint-check</b> completed</small>');
  });

  it('formats hook_response error with exit code', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'hook_response',
      hook_id: 'h-1',
      hook_name: 'lint-check',
      hook_event: 'PreToolUse',
      output: 'lint failed',
      stdout: '',
      stderr: '',
      exit_code: 1,
      outcome: 'error',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('<small>Hook <b>lint-check</b> failed (exit 1)</small>');
  });

  it('formats hook_response cancelled', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'hook_response',
      hook_id: 'h-1',
      hook_name: 'lint-check',
      hook_event: 'PreToolUse',
      output: '',
      stdout: '',
      stderr: '',
      outcome: 'cancelled',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('<small>Hook <b>lint-check</b> cancelled</small>');
  });

  it('formats files_persisted with failures', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'files_persisted',
      files: [{ filename: 'a.ts', file_id: 'f-1' }],
      failed: [{ filename: 'b.ts', error: 'disk full' }],
      processed_at: '2026-01-01T00:00:00Z',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('<small>Files persisted: 1 saved, 1 failed</small>');
  });

  it('formats files_persisted without failures', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'files_persisted',
      files: [
        { filename: 'a.ts', file_id: 'f-1' },
        { filename: 'b.ts', file_id: 'f-2' }
      ],
      failed: [],
      processed_at: '2026-01-01T00:00:00Z',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('<small>Files persisted: 2 saved</small>');
  });

  it('formats task_notification', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'task_notification',
      task_id: 'task-42',
      status: 'completed',
      output_file: '/tmp/out.txt',
      summary: 'All tests passed',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('**Task** *task-42* — completed: All tests passed');
  });

  it('formats task_notification with failed status', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'task_notification',
      task_id: 'task-99',
      status: 'failed',
      output_file: '/tmp/err.txt',
      summary: 'Build failed',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('**Task** *task-99* — failed: Build failed');
  });

  it('returns empty string for unknown system subtypes', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'unknown_future_subtype',
      data: 'something'
    });

    expect(result).toBe('');
  });
});

describe('Auth Status Messages', () => {
  it('formats authenticating state', async () => {
    const { result } = await transformJson({
      type: 'auth_status',
      isAuthenticating: true,
      output: [],
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('*Authenticating...*');
  });

  it('formats auth error', async () => {
    const { result } = await transformJson({
      type: 'auth_status',
      isAuthenticating: false,
      output: [],
      error: 'Token expired',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('**Auth error:** Token expired');
  });

  it('suppresses successful auth completion', async () => {
    const { result } = await transformJson({
      type: 'auth_status',
      isAuthenticating: false,
      output: ['Authenticated as user@example.com'],
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('');
  });
});

describe('Stream Event Messages', () => {
  it('suppresses stream_event (partial assistant deltas)', async () => {
    const { result } = await transformJson({
      type: 'stream_event',
      event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'partial' } },
      parent_tool_use_id: null,
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toBe('');
  });
});

describe('Result Messages', () => {
  it('formats success result with turns, duration, cost', async () => {
    const { result } = await transformJson({
      type: 'result',
      subtype: 'success',
      num_turns: 5,
      duration_ms: 120000,
      total_cost_usd: 0.05
    });

    expect(result).toBe('**Session Complete** | 5 turns | 120s | $0.05');
  });

  it('formats error result with subtype', async () => {
    const { result } = await transformJson({
      type: 'result',
      subtype: 'error_during_execution',
      num_turns: 3,
      duration_ms: 60000,
      total_cost_usd: 0.02
    });

    expect(result).toBe('**Session Error** (error_during_execution) | 3 turns | 60s | $0.02');
  });
});

describe('Tool Messages', () => {
  it('formats tool_use_summary', async () => {
    const { result } = await transformJson({
      type: 'tool_use_summary',
      summary: 'File written'
    });

    expect(result).toBe('**Tool Output:** File written');
  });

  it('formats tool_progress with elapsed time', async () => {
    const { result } = await transformJson({
      type: 'tool_progress',
      tool_name: 'Bash',
      elapsed_time_seconds: 5
    });

    expect(result).toBe('*Bash running... (5s)*');
  });
});

describe('Edge Cases', () => {
  it('returns empty string for unknown message types', async () => {
    const { result } = await transformJson({
      type: 'unknown_type',
      data: 'foo'
    });

    expect(result).toBe('');
  });

  it('passes through malformed JSON unchanged', async () => {
    const { result } = await harness.transform('not json at all');
    expect(result).toBe('not json at all');
  });

  it('passes through empty/whitespace lines unchanged', async () => {
    const { result: emptyResult } = await harness.transform('');
    expect(emptyResult).toBe('');

    const { result: whitespaceResult } = await harness.transform('   ');
    expect(whitespaceResult).toBe('   ');
  });
});
