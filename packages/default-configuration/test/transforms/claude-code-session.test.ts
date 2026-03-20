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
    expect(result).toContain('class="cc-turn cc-assistant"');
    expect(result).toContain('First message');
  });

  it('turn counter increments on each assistant message', async () => {
    for (let i = 1; i <= 3; i++) {
      const { result, error } = await transformJson({
        type: 'assistant',
        message: { content: [{ type: 'text', text: `Message ${i}` }] }
      });

      expect(error).toBeUndefined();
      expect(result).toContain(`Message ${i}`);
      expect(result).toContain('class="cc-turn cc-assistant"');
    }
  });

  it('state persists between init and transform calls', async () => {
    const { result, error } = await transformJson({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'Test persistence' }] }
    });

    expect(error).toBeUndefined();
    expect(result).toContain('Test persistence');
  });
});

describe('Assistant Messages', () => {
  it('formats text content block wrapped in cc-turn cc-assistant and cc-text', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'Hello world' }] }
    });

    expect(result).toContain('class="cc-turn cc-assistant"');
    expect(result).toContain('class="cc-text"');
    expect(result).toContain('Hello world');
  });

  it('formats text block through marked (markdown to HTML)', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: { content: [{ type: 'text', text: '**bold text**' }] }
    });

    expect(result).toContain('<strong>bold text</strong>');
    expect(result).toContain('class="cc-text"');
  });

  it('formats code fence through marked', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: { content: [{ type: 'text', text: '```js\nconsole.log("hi")\n```' }] }
    });

    expect(result).toContain('<code');
    expect(result).toContain('console.log');
    expect(result).toContain('class="cc-text"');
  });

  it('formats thinking block as div with cc-thinking class', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: { content: [{ type: 'thinking', thinking: 'I am thinking' }] }
    });

    expect(result).toContain('class="cc-turn cc-assistant"');
    expect(result).toContain('<div class="cc-thinking">');
    expect(result).toContain('class="cc-thinking-label"');
    expect(result).toContain('I am thinking');
  });

  it('buffers tool_use blocks and returns empty when assistant has only tool_use', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: '1', name: 'Read', input: { file_path: '/src/index.ts' } }]
      }
    });

    // Tool-only assistant messages produce no output (tool renders with its summary)
    expect(result).toBe('');
  });

  it('renders tool_use input table when tool_use_summary arrives', async () => {
    // Send assistant with tool_use
    await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 'tu-1', name: 'Read', input: { file_path: '/src/index.ts' } }]
      }
    });

    // Send matching tool_use_summary
    const { result } = await transformJson({
      type: 'tool_use_summary',
      summary: 'Read 45 lines from /src/index.ts',
      preceding_tool_use_ids: ['tu-1']
    });

    expect(result).toContain('class="cc-tool-pair"');
    expect(result).toContain('data-tool="Read"');
    expect(result).toContain('class="cc-tool-badge"');
    expect(result).toContain('Read');
    expect(result).toContain('class="cc-tool-input"');
    expect(result).toContain('class="cc-tool-input-key"');
    expect(result).toContain('file_path');
    expect(result).toContain('class="cc-tool-input-val"');
    expect(result).toContain('/src/index.ts');
    expect(result).toContain('class="cc-tool-result"');
    expect(result).toContain('Read 45 lines from /src/index.ts');
  });

  it('renders all input parameters in tool input table', async () => {
    await transformJson({
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            id: 'tu-edit',
            name: 'Edit',
            input: { file_path: '/src/config.json', old_string: 'foo', new_string: 'bar' }
          }
        ]
      }
    });

    const { result } = await transformJson({
      type: 'tool_use_summary',
      summary: 'Edited file',
      preceding_tool_use_ids: ['tu-edit']
    });

    expect(result).toContain('file_path');
    expect(result).toContain('/src/config.json');
    expect(result).toContain('old_string');
    expect(result).toContain('foo');
    expect(result).toContain('new_string');
    expect(result).toContain('bar');
  });

  it('formats tool_use Bash with truncated command in input table', async () => {
    const longCommand = 'a'.repeat(150);
    await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 'tu-bash', name: 'Bash', input: { command: longCommand } }]
      }
    });

    const { result } = await transformJson({
      type: 'tool_use_summary',
      summary: 'Command completed',
      preceding_tool_use_ids: ['tu-bash']
    });

    expect(result).toContain('data-tool="Bash"');
    expect(result).toContain(`${'a'.repeat(120)}...`);
  });

  it('formats unknown tool with badge and input table', async () => {
    await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 'tu-ws', name: 'WebSearch', input: { query: 'something' } }]
      }
    });

    const { result } = await transformJson({
      type: 'tool_use_summary',
      summary: 'Found results',
      preceding_tool_use_ids: ['tu-ws']
    });

    expect(result).toContain('data-tool="WebSearch"');
    expect(result).toContain('class="cc-tool-badge"');
    expect(result).toContain('WebSearch');
    expect(result).toContain('query');
    expect(result).toContain('something');
  });

  it('formats mixed text and tool_use: text renders in turn, tool buffered', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'First block' },
          { type: 'thinking', thinking: 'Some thought' },
          { type: 'tool_use', id: 'tu-mix', name: 'Read', input: { file_path: '/test.ts' } }
        ]
      }
    });

    expect(result).toContain('class="cc-turn cc-assistant"');
    expect(result).toContain('class="cc-text"');
    expect(result).toContain('First block');
    expect(result).toContain('class="cc-thinking"');
    expect(result).toContain('Some thought');
    // Tool_use is buffered, not rendered inline
    expect(result).not.toContain('data-tool="Read"');
    expect(result).not.toContain('/test.ts');
    // All non-tool content wrapped in single cc-turn div
    expect(result?.match(/cc-turn cc-assistant/g)?.length).toBe(1);
  });

  it('returns empty for assistant with empty content array', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: { content: [] }
    });

    // Empty content produces no output
    expect(result).toBe('');
  });

  it('formats API error wrapped in cc-turn cc-assistant with cc-system', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: { content: [] },
      error: 'server_error'
    });

    expect(result).toContain('class="cc-turn cc-assistant"');
    expect(result).toContain('class="cc-system"');
    expect(result).toContain('<strong>API Error</strong>');
    expect(result).toContain('server_error');
  });

  it('isolates marked parse error: sibling blocks still render when text block throws', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'Normal text' },
          { type: 'tool_use', id: '10', name: 'Read', input: { file_path: '/file.ts' } }
        ]
      }
    });

    // Text renders in the turn; tool_use is buffered
    expect(result).toContain('Normal text');
    expect(result).not.toContain('data-tool="Read"');
  });
});

describe('User Messages', () => {
  it('formats user prompt with string content in cc-turn cc-user without role label', async () => {
    const { result } = await transformJson({
      type: 'user',
      message: { role: 'user', content: 'Hello Claude' },
      parent_tool_use_id: null,
      session_id: 'sess-1'
    });

    expect(result).toContain('class="cc-turn cc-user"');
    expect(result).not.toContain('class="cc-role"');
    expect(result).not.toContain('>User<');
    expect(result).toContain('Hello Claude');
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

    expect(result).toContain('class="cc-turn cc-user"');
    expect(result).toContain('Please help me with this');
  });

  it('does not include role label for synthetic user messages', async () => {
    const { result } = await transformJson({
      type: 'user',
      message: { role: 'user', content: 'Auto-generated prompt' },
      parent_tool_use_id: null,
      isSynthetic: true,
      session_id: 'sess-1'
    });

    expect(result).toContain('class="cc-turn cc-user"');
    expect(result).not.toContain('class="cc-role"');
    expect(result).toContain('Auto-generated prompt');
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

  it('renders tool error blocks in user messages using strong tag', async () => {
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

    expect(result).toContain('class="cc-turn cc-user"');
    expect(result).toContain('Here is the context');
    expect(result).toContain('<strong>Tool error</strong>');
    expect(result).toContain('tu-1');
  });

  it('suppresses replay messages (tool_use_result absent, renders as user)', async () => {
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
    expect(result).toContain('class="cc-turn cc-user"');
    expect(result).toContain('Original prompt');
  });

  it('escapes HTML in user text', async () => {
    const { result } = await transformJson({
      type: 'user',
      message: { role: 'user', content: '<script>alert("xss")</script>' },
      parent_tool_use_id: null,
      session_id: 'sess-1'
    });

    expect(result).toContain('&lt;script&gt;');
    expect(result).not.toContain('<script>');
  });
});

describe('System Messages', () => {
  it('formats init subtype with cc-system cc-session-start', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'init',
      model: 'claude-3',
      tools: ['Read', 'Write', 'Edit', 'Bash', 'Grep'],
      cwd: '/home'
    });

    expect(result).toContain('class="cc-system cc-session-start"');
    expect(result).toContain('<strong>Session Started</strong>');
    expect(result).toContain('claude-3');
    expect(result).toContain('5 tools');
    expect(result).toContain('/home');
  });

  it('formats status compacting with cc-system', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'status',
      status: 'compacting',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toContain('class="cc-system"');
    expect(result).toContain('<em>Compacting context...</em>');
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

  it('formats compact_boundary with cc-system cc-compact-boundary, hr, and token info', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'compact_boundary',
      compact_metadata: { trigger: 'manual', pre_tokens: 50000 },
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toContain('class="cc-system cc-compact-boundary"');
    expect(result).toContain('<hr>');
    expect(result).toContain('<em>Context compacted</em>');
    expect(result).toContain('(manual)');
    expect(result).toContain('50000 tokens before');
  });

  it('formats compact_boundary with auto trigger', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'compact_boundary',
      compact_metadata: { trigger: 'auto', pre_tokens: 120000 },
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toContain('class="cc-system cc-compact-boundary"');
    expect(result).toContain('(auto)');
    expect(result).toContain('120000 tokens before');
  });

  it('formats hook_started with cc-system cc-hook', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'hook_started',
      hook_id: 'h-1',
      hook_name: 'lint-check',
      hook_event: 'PreToolUse',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toContain('class="cc-system cc-hook"');
    expect(result).toContain('Hook');
    expect(result).toContain('<strong>lint-check</strong>');
    expect(result).toContain('(PreToolUse)');
    expect(result).toContain('started');
  });

  it('formats hook_progress with output in cc-system cc-hook', async () => {
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

    expect(result).toContain('class="cc-system cc-hook"');
    expect(result).toContain('<strong>lint-check</strong>');
    expect(result).toContain('Running eslint...');
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

    expect(result).toContain('class="cc-system cc-hook"');
    expect(result).toContain('stdout output');
  });

  it('formats hook_response success in cc-system cc-hook', async () => {
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

    expect(result).toContain('class="cc-system cc-hook"');
    expect(result).toContain('<strong>lint-check</strong>');
    expect(result).toContain('completed');
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

    expect(result).toContain('class="cc-system cc-hook"');
    expect(result).toContain('failed');
    expect(result).toContain('exit 1');
  });

  it('formats hook_response cancelled in cc-system cc-hook', async () => {
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

    expect(result).toContain('class="cc-system cc-hook"');
    expect(result).toContain('cancelled');
  });

  it('formats files_persisted with failures in cc-system', async () => {
    const { result } = await transformJson({
      type: 'system',
      subtype: 'files_persisted',
      files: [{ filename: 'a.ts', file_id: 'f-1' }],
      failed: [{ filename: 'b.ts', error: 'disk full' }],
      processed_at: '2026-01-01T00:00:00Z',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toContain('class="cc-system"');
    expect(result).toContain('1 saved, 1 failed');
  });

  it('formats files_persisted without failures in cc-system', async () => {
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

    expect(result).toContain('class="cc-system"');
    expect(result).toContain('2 saved');
    expect(result).not.toContain('failed');
  });

  it('formats task_notification with strong and em in cc-system', async () => {
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

    expect(result).toContain('class="cc-system"');
    expect(result).toContain('<strong>Task</strong>');
    expect(result).toContain('<em>task-42</em>');
    expect(result).toContain('completed');
    expect(result).toContain('All tests passed');
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

    expect(result).toContain('class="cc-system"');
    expect(result).toContain('<em>task-99</em>');
    expect(result).toContain('failed');
    expect(result).toContain('Build failed');
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
  it('formats authenticating state with cc-system and em', async () => {
    const { result } = await transformJson({
      type: 'auth_status',
      isAuthenticating: true,
      output: [],
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toContain('class="cc-system"');
    expect(result).toContain('<em>Authenticating...</em>');
  });

  it('formats auth error with cc-system and strong', async () => {
    const { result } = await transformJson({
      type: 'auth_status',
      isAuthenticating: false,
      output: [],
      error: 'Token expired',
      uuid: 'uuid-1',
      session_id: 'sess-1'
    });

    expect(result).toContain('class="cc-system"');
    expect(result).toContain('<strong>Auth error:</strong>');
    expect(result).toContain('Token expired');
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
  it('formats success result with cc-system cc-session-end', async () => {
    const { result } = await transformJson({
      type: 'result',
      subtype: 'success',
      num_turns: 5,
      duration_ms: 120000,
      total_cost_usd: 0.05
    });

    expect(result).toContain('class="cc-system cc-session-end"');
    expect(result).toContain('<strong>Session Complete</strong>');
    expect(result).toContain('5 turns');
    expect(result).toContain('120s');
    expect(result).toContain('$0.05');
  });

  it('formats error result with Session Error in cc-system cc-session-end', async () => {
    const { result } = await transformJson({
      type: 'result',
      subtype: 'error_during_execution',
      num_turns: 3,
      duration_ms: 60000,
      total_cost_usd: 0.02
    });

    expect(result).toContain('class="cc-system cc-session-end"');
    expect(result).toContain('<strong>Session Error</strong>');
    expect(result).toContain('error_during_execution');
    expect(result).toContain('3 turns');
    expect(result).toContain('60s');
  });
});

describe('Tool Messages', () => {
  it('pairs tool_use_summary with buffered tool_use via preceding_tool_use_ids', async () => {
    await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 'tu-1', name: 'Write', input: { file_path: '/out.ts', content: 'hello' } }]
      }
    });

    const { result } = await transformJson({
      type: 'tool_use_summary',
      summary: 'File written',
      preceding_tool_use_ids: ['tu-1']
    });

    expect(result).toContain('class="cc-tool-pair"');
    expect(result).toContain('data-tool="Write"');
    expect(result).toContain('file_path');
    expect(result).toContain('/out.ts');
    expect(result).toContain('class="cc-tool-result"');
    expect(result).toContain('File written');
  });

  it('renders tool_use_summary without tool header when no pending tool_use matches', async () => {
    const { result } = await transformJson({
      type: 'tool_use_summary',
      summary: 'Orphaned summary',
      preceding_tool_use_ids: ['nonexistent']
    });

    expect(result).toContain('class="cc-tool-result"');
    expect(result).toContain('Orphaned summary');
    expect(result).not.toContain('cc-tool-pair');
  });

  it('suppresses tool_progress messages', async () => {
    const { result } = await transformJson({
      type: 'tool_progress',
      tool_name: 'Bash',
      elapsed_time_seconds: 5
    });

    expect(result).toBe('');
  });

  it('handles multiple tool_use blocks paired with their summaries', async () => {
    // Assistant sends two tool_use blocks
    await transformJson({
      type: 'assistant',
      message: {
        content: [
          { type: 'tool_use', id: 'tu-a', name: 'Read', input: { file_path: '/a.ts' } },
          { type: 'tool_use', id: 'tu-b', name: 'Grep', input: { pattern: 'TODO', path: '/src' } }
        ]
      }
    });

    // First summary
    const { result: result1 } = await transformJson({
      type: 'tool_use_summary',
      summary: 'Read a.ts',
      preceding_tool_use_ids: ['tu-a']
    });

    expect(result1).toContain('data-tool="Read"');
    expect(result1).toContain('/a.ts');

    // Second summary
    const { result: result2 } = await transformJson({
      type: 'tool_use_summary',
      summary: 'Found TODOs',
      preceding_tool_use_ids: ['tu-b']
    });

    expect(result2).toContain('data-tool="Grep"');
    expect(result2).toContain('TODO');
    expect(result2).toContain('/src');
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

  it('escapes HTML entities in tool input values', async () => {
    await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 'tu-xss', name: 'Read', input: { file_path: '/path/<evil>.ts' } }]
      }
    });

    const { result } = await transformJson({
      type: 'tool_use_summary',
      summary: 'Read file',
      preceding_tool_use_ids: ['tu-xss']
    });

    expect(result).toContain('&lt;evil&gt;');
    expect(result).not.toContain('<evil>');
  });
});
