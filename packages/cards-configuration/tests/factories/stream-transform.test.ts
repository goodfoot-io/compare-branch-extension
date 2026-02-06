/**
 * Tests for stream transform factory.
 *
 * These tests verify the behavioral aspects of the defineStreamTransform factory:
 * - Function invocation and handler execution
 * - Metadata attachment (factoryType, streamType, timeout, maxLineLength, maxStreamSize, sourcePath)
 * - Type-level preservation of literal stream type names
 * - Return value propagation
 * - Error propagation
 * - Sync/async handler support
 */

import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { StreamInitContext, TransformContext } from '../../src/command-types.js';
import {
  defineStreamTransform,
  type StreamTransformConfig,
  type StreamTransformHandler
} from '../../src/factories/stream-transform.js';

// Mock context for testing
const createMockContext = (lineNumber: number = 1, streamType: string = 'jsonl'): TransformContext => ({
  lineNumber,
  streamType,
  state: new Map()
});

// Mock init context for testing
const createMockInitContext = (streamType: string = 'jsonl', filename: string = 'test.jsonl'): StreamInitContext => ({
  streamType,
  filename,
  headers: { 'content-type': 'application/json' },
  card: {
    id: 'card-123',
    title: 'Test Card',
    metadata: {}
  },
  state: new Map()
});

describe('defineStreamTransform', () => {
  describe('behavioral tests', () => {
    it('should return callable function that invokes handler', async () => {
      const handler = vi.fn(async (line: string) => line.toUpperCase());
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);
      const context = createMockContext();

      await command('test line', context);

      expect(handler).toHaveBeenCalledWith('test line', context);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should return transformed line from handler', async () => {
      const handler = vi.fn(async (line: string) => line.toUpperCase());
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);
      const context = createMockContext();

      const result = await command('test line', context);

      expect(result).toBe('TEST LINE');
    });

    it('should pass line content to handler', async () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);
      const context = createMockContext(5, 'jsonl');

      await command('{"key":"value"}', context);

      expect(handler).toHaveBeenCalledWith('{"key":"value"}', context);
    });

    it('should pass context with line number to handler', async () => {
      const handler = vi.fn(async (line: string, ctx: TransformContext) => {
        expect(ctx.lineNumber).toBe(10);
        return line;
      });
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);
      const context = createMockContext(10, 'jsonl');

      await command('test', context);

      expect(handler).toHaveBeenCalledWith('test', context);
    });

    it('should pass context with stream type to handler', async () => {
      const handler = vi.fn(async (line: string, ctx: TransformContext) => {
        expect(ctx.streamType).toBe('logs');
        return line;
      });
      const config: StreamTransformConfig = { streamType: 'logs' };

      const command = defineStreamTransform(config, handler);
      const context = createMockContext(1, 'logs');

      await command('log line', context);

      expect(handler).toHaveBeenCalledWith('log line', context);
    });

    it('should attach factoryType metadata', () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);

      expect(command.factoryType).toBe('streamTransform');
    });

    it('should attach streamType from config', () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);

      expect(command.streamType).toBe('jsonl');
    });

    it('should attach optional timeout', () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl', timeout: 5000 };

      const command = defineStreamTransform(config, handler);

      expect(command.timeout).toBe(5000);
    });

    it('should not attach timeout when not provided', () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);

      expect(command.timeout).toBeUndefined();
    });

    it('should attach optional maxLineLength', () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl', maxLineLength: 1024 };

      const command = defineStreamTransform(config, handler);

      expect(command.maxLineLength).toBe(1024);
    });

    it('should not attach maxLineLength when not provided', () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);

      expect(command.maxLineLength).toBeUndefined();
    });

    it('should attach optional maxStreamSize', () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl', maxStreamSize: 10485760 };

      const command = defineStreamTransform(config, handler);

      expect(command.maxStreamSize).toBe(10485760);
    });

    it('should not attach maxStreamSize when not provided', () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);

      expect(command.maxStreamSize).toBeUndefined();
    });

    it('should attach optional sourcePath', () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl', sourcePath: '/path/to/handler.ts' };

      const command = defineStreamTransform(config, handler);

      expect(command.sourcePath).toBe('/path/to/handler.ts');
    });

    it('should not attach sourcePath when not provided', () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);

      expect(command.sourcePath).toBeUndefined();
    });

    it('should attach all optional metadata when provided', () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = {
        streamType: 'jsonl',
        timeout: 3000,
        maxLineLength: 2048,
        maxStreamSize: 20971520,
        sourcePath: '/handlers/transform.ts'
      };

      const command = defineStreamTransform(config, handler);

      expect(command.factoryType).toBe('streamTransform');
      expect(command.streamType).toBe('jsonl');
      expect(command.timeout).toBe(3000);
      expect(command.maxLineLength).toBe(2048);
      expect(command.maxStreamSize).toBe(20971520);
      expect(command.sourcePath).toBe('/handlers/transform.ts');
    });

    it('should propagate handler errors', async () => {
      const error = new Error('Transform failed');
      const handler = vi.fn(async (): Promise<string> => {
        throw error;
      });
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);
      const context = createMockContext();

      await expect(command('test', context)).rejects.toThrow('Transform failed');
    });

    it('should work with synchronous handlers', async () => {
      const handler = vi.fn((line: string): string => line.toLowerCase());
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);
      const context = createMockContext();

      const result = await command('TEST LINE', context);

      expect(handler).toHaveBeenCalledWith('TEST LINE', context);
      expect(result).toBe('test line');
    });

    it('should handle empty lines', async () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);
      const context = createMockContext();

      const result = await command('', context);

      expect(handler).toHaveBeenCalledWith('', context);
      expect(result).toBe('');
    });

    it('should handle lines with special characters', async () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);
      const context = createMockContext();

      const specialLine = '{"unicode":"\\u0041","emoji":"😀","newline":"\\n"}';
      const result = await command(specialLine, context);

      expect(result).toBe(specialLine);
    });

    it('should handle multiple sequential calls', async () => {
      const handler = vi.fn(async (line: string, ctx: TransformContext) => {
        return `[Line ${ctx.lineNumber}] ${line}`;
      });
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);

      const result1 = await command('first', createMockContext(1));
      const result2 = await command('second', createMockContext(2));
      const result3 = await command('third', createMockContext(3));

      expect(result1).toBe('[Line 1] first');
      expect(result2).toBe('[Line 2] second');
      expect(result3).toBe('[Line 3] third');
      expect(handler).toHaveBeenCalledTimes(3);
    });

    // Init handler tests
    it('should accept init handler as third parameter', () => {
      const handler = vi.fn(async (line: string) => line);
      const init = vi.fn(async (ctx: StreamInitContext) => {
        ctx.state.set('initialized', true);
      });
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler, init);

      expect(command.init).toBe(init);
    });

    it('should work without init handler (backward compatible)', async () => {
      const handler = vi.fn(async (line: string) => line.toUpperCase());
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);
      const context = createMockContext();

      const result = await command('test', context);

      expect(result).toBe('TEST');
      expect(handler).toHaveBeenCalledWith('test', context);
      expect(command.init).toBeUndefined();
    });

    it('should include init property when provided', () => {
      const handler = vi.fn(async (line: string) => line);
      const init = vi.fn(async (ctx: StreamInitContext) => {
        ctx.state.set('key', 'value');
      });
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler, init);

      expect(command.init).toBeDefined();
      expect(typeof command.init).toBe('function');
    });

    it('should exclude init property when not provided', () => {
      const handler = vi.fn(async (line: string) => line);
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler);

      expect(command.init).toBeUndefined();
    });

    it('should pass StreamInitContext type to init handler', async () => {
      const handler = vi.fn(async (line: string) => line);
      const init = vi.fn(async (ctx: StreamInitContext) => {
        // Verify we can access all expected properties
        expect(ctx.streamType).toBeDefined();
        expect(ctx.filename).toBeDefined();
        expect(ctx.headers).toBeDefined();
        expect(ctx.card).toBeDefined();
        expect(ctx.card.id).toBeDefined();
        expect(ctx.state).toBeInstanceOf(Map);
      });
      const config: StreamTransformConfig = { streamType: 'jsonl' };

      const command = defineStreamTransform(config, handler, init);

      // Manually invoke init to verify it receives the correct context
      if (command.init) {
        const initContext = createMockInitContext();
        await command.init(initContext);
        expect(init).toHaveBeenCalledWith(initContext);
      }
    });
  });

  describe('type-level tests', () => {
    it('should preserve stream type as literal type', () => {
      const handler: StreamTransformHandler = async (line) => line;
      const command = defineStreamTransform({ streamType: 'jsonl' } as const, handler);

      expectTypeOf(command.streamType).toEqualTypeOf<'jsonl'>();
    });

    it('should infer stream type from config', () => {
      const handler: StreamTransformHandler = async (line) => line;
      const config = { streamType: 'logs' } as const;
      const command = defineStreamTransform(config, handler);

      expectTypeOf(command.streamType).toEqualTypeOf<'logs'>();
    });

    it('should preserve different stream type literals', () => {
      const handler: StreamTransformHandler = async (line) => line;

      const jsonlCommand = defineStreamTransform({ streamType: 'jsonl' } as const, handler);
      const logsCommand = defineStreamTransform({ streamType: 'logs' } as const, handler);
      const csvCommand = defineStreamTransform({ streamType: 'csv' } as const, handler);

      expectTypeOf(jsonlCommand.streamType).toEqualTypeOf<'jsonl'>();
      expectTypeOf(logsCommand.streamType).toEqualTypeOf<'logs'>();
      expectTypeOf(csvCommand.streamType).toEqualTypeOf<'csv'>();
    });
  });
});
