import { describe, expect, it } from 'vitest';
import type { StreamInitContext, TransformContext } from '../../src/command-types.js';
import { claudeCodeSessionTransform } from '../../src/transforms/claude-code-session.js';

const createTestContext = (overrides?: Partial<TransformContext>): TransformContext => ({
  lineNumber: 1,
  streamType: 'claude-code-session',
  state: new Map(),
  ...overrides
});

const createTestInitContext = (overrides?: Partial<StreamInitContext>): StreamInitContext => ({
  streamType: 'claude-code-session',
  filename: 'test.jsonl',
  headers: { 'content-type': 'application/x-ndjson' },
  card: { id: 'card-123', title: 'Claude Code Session', metadata: {} },
  state: new Map(),
  ...overrides
});

/** Build a JSON line containing a single tool_use content block. */
const toolUseLine = (name: string, input: Record<string, unknown>): string =>
  JSON.stringify({
    type: 'assistant',
    message: {
      content: [{ type: 'tool_use', id: `tool_${name}`, name, input }]
    }
  });

describe('claudeCodeSessionTransform', () => {
  describe('init handler', () => {
    it('seeds state with turn counter (0) and model ("")', () => {
      const context = createTestInitContext();

      claudeCodeSessionTransform.init?.(context);

      expect(context.state.get('turn')).toBe(0);
      expect(context.state.get('model')).toBe('');
    });
  });

  describe('assistant messages', () => {
    it('assistant text block renders the text content', async () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Hello, world!' }]
        }
      });
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toContain('Hello, world!');
    });

    it('tool_use Read renders **Read** with file_path', async () => {
      const result = await claudeCodeSessionTransform(
        toolUseLine('Read', { file_path: '/src/main.ts' }),
        createTestContext()
      );

      expect(result).toContain('**Read**');
      expect(result).toContain('/src/main.ts');
    });

    it('tool_use Write renders **Write** with file_path', async () => {
      const result = await claudeCodeSessionTransform(
        toolUseLine('Write', { file_path: '/src/new-file.ts' }),
        createTestContext()
      );

      expect(result).toContain('**Write**');
      expect(result).toContain('/src/new-file.ts');
    });

    it('tool_use Edit renders **Edit** with file_path', async () => {
      const result = await claudeCodeSessionTransform(
        toolUseLine('Edit', { file_path: '/src/main.ts' }),
        createTestContext()
      );

      expect(result).toContain('**Edit**');
      expect(result).toContain('/src/main.ts');
    });

    it('tool_use Bash renders **Bash** with truncated command', async () => {
      const longCommand = 'yarn test tests/very/long/path/to/some/test/file/that/exceeds/eighty/characters.test.ts';
      const result = await claudeCodeSessionTransform(
        toolUseLine('Bash', { command: longCommand }),
        createTestContext()
      );

      expect(result).toContain('**Bash**');
      expect(result).toContain('yarn test');
      expect(result.length).toBeLessThan(longCommand.length + 50);
    });

    it('tool_use Grep renders **Grep** with pattern', async () => {
      const result = await claudeCodeSessionTransform(
        toolUseLine('Grep', { pattern: 'defineStreamTransform' }),
        createTestContext()
      );

      expect(result).toContain('**Grep**');
      expect(result).toContain('defineStreamTransform');
    });

    it('tool_use Glob renders **Glob** with pattern', async () => {
      const result = await claudeCodeSessionTransform(
        toolUseLine('Glob', { pattern: '**/*.test.ts' }),
        createTestContext()
      );

      expect(result).toContain('**Glob**');
      expect(result).toContain('**/*.test.ts');
    });

    it('tool_use Task renders **Task** with description', async () => {
      const result = await claudeCodeSessionTransform(
        toolUseLine('Task', { description: 'Search for stream transform patterns' }),
        createTestContext()
      );

      expect(result).toContain('**Task**');
      expect(result).toContain('Search for stream transform patterns');
    });

    it('tool_use with unrecognized tool renders only **ToolName**', async () => {
      const result = await claudeCodeSessionTransform(
        toolUseLine('UnknownTool', { some_param: 'value' }),
        createTestContext()
      );

      expect(result).toContain('**UnknownTool**');
      expect(result).not.toContain('some_param');
      expect(result).not.toContain('value');
    });

    it('assistant thinking block renders > *thinking:* prefix with thinking content', async () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'thinking',
              thinking: 'Let me analyze this problem...'
            }
          ]
        }
      });
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toContain('> *thinking:*');
      expect(result).toContain('Let me analyze this problem...');
    });

    it('assistant message with mixed content blocks renders all joined by newlines', async () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'First, I will read the file.' },
            {
              type: 'tool_use',
              id: 'tool_9',
              name: 'Read',
              input: { file_path: '/src/example.ts' }
            },
            {
              type: 'thinking',
              thinking: 'Now I need to process this...'
            }
          ]
        }
      });
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toContain('First, I will read the file.');
      expect(result).toContain('**Read**');
      expect(result).toContain('/src/example.ts');
      expect(result).toContain('> *thinking:*');
      expect(result).toContain('Now I need to process this...');
      // Verify blocks are separated by double newlines
      expect(result.split('\n\n').length).toBeGreaterThanOrEqual(2);
    });

    it('assistant message with empty content array renders *(empty response)*', async () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: []
        }
      });
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toContain('*(empty response)*');
    });

    it('assistant message with error field renders **API Error** with error type', async () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Some content' }]
        },
        error: {
          type: 'overloaded_error',
          message: 'The service is temporarily overloaded'
        }
      });
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toContain('**API Error**');
      expect(result).toContain('overloaded_error');
      expect(result).toContain('The service is temporarily overloaded');
    });
  });

  describe('system messages', () => {
    it('system + subtype: "init" renders **Session Started** with model, tools count, cwd', async () => {
      const line = JSON.stringify({
        type: 'system',
        subtype: 'init',
        model: 'claude-opus-4-6',
        available_tools: [{ name: 'Read' }, { name: 'Write' }, { name: 'Bash' }],
        cwd: '/workspace/project'
      });
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toContain('**Session Started**');
      expect(result).toContain('claude-opus-4-6');
      expect(result).toContain('3 tools');
      expect(result).toContain('/workspace/project');
    });

    it('system + unhandled subtype returns raw line unchanged', async () => {
      const line = JSON.stringify({
        type: 'system',
        subtype: 'unknown_subtype'
      });
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toBe(line);
    });
  });

  describe('result messages', () => {
    it('result + subtype: "success" renders **Session Complete** with turns, duration, cost', async () => {
      const line = JSON.stringify({
        type: 'result',
        subtype: 'success',
        turn_count: 5,
        duration_seconds: 42.5,
        total_cost_usd: 0.123
      });
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toContain('**Session Complete**');
      expect(result).toContain('5 turns');
      expect(result).toContain('42.5s');
      expect(result).toContain('$0.123');
    });

    it('result + subtype: "error_during_execution" renders **Session Error** with subtype', async () => {
      const line = JSON.stringify({
        type: 'result',
        subtype: 'error_during_execution',
        turn_count: 3,
        duration_seconds: 15.2,
        total_cost_usd: 0.045
      });
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toContain('**Session Error**');
      expect(result).toContain('error_during_execution');
      expect(result).toContain('3 turns');
      expect(result).toContain('15.2s');
      expect(result).toContain('$0.045');
    });
  });

  describe('tool messages', () => {
    it('tool_use_summary renders **Tool Output:** with summary text', async () => {
      const line = JSON.stringify({
        type: 'tool_use_summary',
        summary: 'File read successfully with 42 lines'
      });
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toContain('**Tool Output:**');
      expect(result).toContain('File read successfully with 42 lines');
    });

    it('tool_progress renders tool name and elapsed seconds in italics', async () => {
      const line = JSON.stringify({
        type: 'tool_progress',
        tool_name: 'Bash',
        elapsed_time_seconds: 3.5
      });
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toContain('*Bash running... (3.5s)*');
    });
  });

  describe('edge cases', () => {
    it('unknown type returns raw line unchanged', async () => {
      const line = JSON.stringify({
        type: 'unknown_type',
        some_field: 'value'
      });
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toBe(line);
    });

    it('malformed JSON returns raw line unchanged', async () => {
      const line = '{ invalid json }';
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toBe(line);
    });

    it('empty/whitespace-only line returns raw line unchanged', async () => {
      const line = '   ';
      const context = createTestContext();

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toBe(line);
    });
  });

  describe('state management', () => {
    it('turn counter increments per assistant message', async () => {
      const context = createTestContext();
      context.state?.set('turn', 0);

      const line1 = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'First message' }] }
      });
      await claudeCodeSessionTransform(line1, context);
      expect(context.state?.get('turn')).toBe(1);

      const line2 = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Second message' }] }
      });
      await claudeCodeSessionTransform(line2, context);
      expect(context.state?.get('turn')).toBe(2);
    });

    it('init-to-transform state continuity', async () => {
      const initContext = createTestInitContext();
      claudeCodeSessionTransform.init?.(initContext);

      // Use the same state map in transform context
      const transformContext = createTestContext({ state: initContext.state });

      expect(transformContext.state?.get('turn')).toBe(0);
      expect(transformContext.state?.get('model')).toBe('');

      const line = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Hello' }] }
      });
      await claudeCodeSessionTransform(line, transformContext);

      expect(transformContext.state?.get('turn')).toBe(1);
    });

    it('transform works without state (context.state is undefined)', async () => {
      const context = createTestContext({ state: undefined });

      const line = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Hello, world!' }] }
      });

      const result = await claudeCodeSessionTransform(line, context);

      expect(result).toContain('Hello, world!');
    });
  });
});
