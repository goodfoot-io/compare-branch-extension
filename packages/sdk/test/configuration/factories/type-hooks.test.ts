/**
 * Tests for type lifecycle hook factories.
 *
 * These tests verify the behavioral aspects of the factory functions:
 * - Function invocation and handler execution
 * - Metadata attachment (factoryType, typeName, timeout)
 * - Type-level preservation of literal type names
 *
 * @summary Tests for type lifecycle hook factories
 */

import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  defineTypeCreate,
  defineTypeDelete,
  defineTypeUpdate,
  type TypeConfig,
  type TypeHandler
} from '../../../src/config/factories/type-hooks.js';
import type { TypeHookContext, TypeHookInput } from '../../../src/config/inputs.js';
import type { ILogger } from '../../../src/config/logger.js';

// Mock input and context for testing
const createMockInput = (): TypeHookInput => ({
  cardId: 'card-123',
  environment: 'dev',
  typeName: 'test-type',
  typeVersion: '1.0.0',
  fileName: 'test.json',
  filePath: '/test/test.json',
  fileSize: 100,
  fileSha256: 'abc123',
  contentType: 'application/json'
});

const createMockContext = (): TypeHookContext => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn()
  } satisfies ILogger,
  cwd: '/workspace'
});

describe('defineTypeCreate', () => {
  describe('behavioral tests', () => {
    it('should return callable function that invokes handler', async () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'adaptive-card' };

      const command = defineTypeCreate(config, handler);
      const input = createMockInput();
      const context = createMockContext();

      await command(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should attach factoryType metadata', () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'adaptive-card' };

      const command = defineTypeCreate(config, handler);

      expect(command.factoryType).toBe('typeCreate');
    });

    it('should attach typeName from config', () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'note' };

      const command = defineTypeCreate(config, handler);

      expect(command.typeName).toBe('note');
    });

    it('should attach optional timeout', () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'note', timeout: 3000 };

      const command = defineTypeCreate(config, handler);

      expect(command.timeout).toBe(3000);
    });

    it('should not attach timeout when not provided', () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'note' };

      const command = defineTypeCreate(config, handler);

      expect(command.timeout).toBeUndefined();
    });

    it('should propagate handler errors', async () => {
      const error = new Error('Create failed');
      const handler = vi.fn(async () => {
        throw error;
      });
      const config: TypeConfig = { typeName: 'note' };

      const command = defineTypeCreate(config, handler);
      const input = createMockInput();
      const context = createMockContext();

      await expect(command(input, context)).rejects.toThrow('Create failed');
    });
  });

  describe('type-level tests', () => {
    it('should preserve type name as literal type', () => {
      const handler: TypeHandler = async () => {};
      const command = defineTypeCreate({ typeName: 'note' } as const, handler);

      expectTypeOf(command.typeName).toEqualTypeOf<'note'>();
    });
  });
});

describe('defineTypeUpdate', () => {
  describe('behavioral tests', () => {
    it('should return callable function that invokes handler', async () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'task-spec' };

      const command = defineTypeUpdate(config, handler);
      const input = createMockInput();
      const context = createMockContext();

      await command(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should attach factoryType metadata', () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'task-spec' };

      const command = defineTypeUpdate(config, handler);

      expect(command.factoryType).toBe('typeUpdate');
    });

    it('should attach typeName from config', () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'config' };

      const command = defineTypeUpdate(config, handler);

      expect(command.typeName).toBe('config');
    });

    it('should attach optional timeout', () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'config', timeout: 10000 };

      const command = defineTypeUpdate(config, handler);

      expect(command.timeout).toBe(10000);
    });

    it('should not attach timeout when not provided', () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'config' };

      const command = defineTypeUpdate(config, handler);

      expect(command.timeout).toBeUndefined();
    });

    it('should propagate handler errors', async () => {
      const error = new Error('Update failed');
      const handler = vi.fn(async () => {
        throw error;
      });
      const config: TypeConfig = { typeName: 'config' };

      const command = defineTypeUpdate(config, handler);
      const input = createMockInput();
      const context = createMockContext();

      await expect(command(input, context)).rejects.toThrow('Update failed');
    });
  });

  describe('type-level tests', () => {
    it('should preserve type name as literal type', () => {
      const handler: TypeHandler = async () => {};
      const command = defineTypeUpdate({ typeName: 'config' } as const, handler);

      expectTypeOf(command.typeName).toEqualTypeOf<'config'>();
    });
  });
});

describe('defineTypeDelete', () => {
  describe('behavioral tests', () => {
    it('should return callable function that invokes handler', async () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'schema' };

      const command = defineTypeDelete(config, handler);
      const input = createMockInput();
      const context = createMockContext();

      await command(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should attach factoryType metadata', () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'schema' };

      const command = defineTypeDelete(config, handler);

      expect(command.factoryType).toBe('typeDelete');
    });

    it('should attach typeName from config', () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'adaptive-card' };

      const command = defineTypeDelete(config, handler);

      expect(command.typeName).toBe('adaptive-card');
    });

    it('should attach optional timeout', () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'adaptive-card', timeout: 2000 };

      const command = defineTypeDelete(config, handler);

      expect(command.timeout).toBe(2000);
    });

    it('should not attach timeout when not provided', () => {
      const handler = vi.fn(async () => {});
      const config: TypeConfig = { typeName: 'adaptive-card' };

      const command = defineTypeDelete(config, handler);

      expect(command.timeout).toBeUndefined();
    });

    it('should propagate handler errors', async () => {
      const error = new Error('Delete failed');
      const handler = vi.fn(async () => {
        throw error;
      });
      const config: TypeConfig = { typeName: 'adaptive-card' };

      const command = defineTypeDelete(config, handler);
      const input = createMockInput();
      const context = createMockContext();

      await expect(command(input, context)).rejects.toThrow('Delete failed');
    });
  });

  describe('type-level tests', () => {
    it('should preserve type name as literal type', () => {
      const handler: TypeHandler = async () => {};
      const command = defineTypeDelete({ typeName: 'schema' } as const, handler);

      expectTypeOf(command.typeName).toEqualTypeOf<'schema'>();
    });
  });
});

describe('Cross-factory type preservation', () => {
  it('should preserve same type name across all factories', () => {
    const handler: TypeHandler = async () => {};

    const create = defineTypeCreate({ typeName: 'adaptive-card' } as const, handler);
    const update = defineTypeUpdate({ typeName: 'adaptive-card' } as const, handler);
    const deleteCmd = defineTypeDelete({ typeName: 'adaptive-card' } as const, handler);

    expectTypeOf(create.typeName).toEqualTypeOf<'adaptive-card'>();
    expectTypeOf(update.typeName).toEqualTypeOf<'adaptive-card'>();
    expectTypeOf(deleteCmd.typeName).toEqualTypeOf<'adaptive-card'>();

    // They should all have the same type
    expectTypeOf(create.typeName).toEqualTypeOf(update.typeName);
    expectTypeOf(create.typeName).toEqualTypeOf(deleteCmd.typeName);
  });
});
