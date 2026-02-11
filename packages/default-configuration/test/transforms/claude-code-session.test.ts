import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TestStreamTransformHarness } from '@cards/test-utils';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

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

/** Stringify an object and transform it through the harness. */
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

  it('formats tool_use Task with description', async () => {
    const { result } = await transformJson({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: '7', name: 'Task', input: { description: 'do something' } }]
      }
    });

    expect(result).toBe('**Task** do something');
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

  it('passes through non-init system messages unchanged', async () => {
    const input = JSON.stringify({
      type: 'system',
      subtype: 'other',
      data: 'something'
    });

    const { result } = await harness.transform(input);
    expect(result).toBe(input);
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
  it('passes through unknown message types unchanged', async () => {
    const input = JSON.stringify({
      type: 'unknown_type',
      data: 'foo'
    });

    const { result } = await harness.transform(input);
    expect(result).toBe(input);
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
