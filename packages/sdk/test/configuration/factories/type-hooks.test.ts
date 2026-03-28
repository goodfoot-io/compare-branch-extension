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
  defineTypeValidator,
  type TypeConfig,
  type TypeHandler,
  type TypeValidatorHandler
} from '../../../src/config/factories/type-hooks.js';
import type {
  TypeHookContext,
  TypeHookInput,
  TypeValidatorContext,
  ValidatorFileRequest
} from '../../../src/config/inputs.js';
import type { ILogger } from '../../../src/config/logger.js';
import type { ValidationResult } from '../../../src/protocol/index.js';

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

// Mock validator request and context
const createMockValidatorRequest = (): ValidatorFileRequest => ({
  filePath: '/test-type/test.json',
  metadata: undefined
});

const createMockValidatorContext = (): TypeValidatorContext => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn()
  } satisfies ILogger,
  cwd: '/workspace',
  typeName: 'test-type',
  typeVersion: '1.0.0',
  fileName: 'test.json',
  cardId: 'card-123',
  environment: 'dev',
  client: null
});

describe('defineTypeValidator', () => {
  describe('behavioral tests', () => {
    it('should return callable function that invokes handler', async () => {
      const handler = vi.fn(async (): Promise<ValidationResult> => ({ valid: true }));
      const command = defineTypeValidator(
        { typeName: 'adaptive-card', schema: 'Test schema', description: 'Test description' },
        handler
      );
      const request = createMockValidatorRequest();
      const context = createMockValidatorContext();

      await command(request, context);

      expect(handler).toHaveBeenCalledWith(request, context);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should return validation result from handler', async () => {
      const expectedResult: ValidationResult = { valid: true, metadata: { version: '1.0' } };
      const handler = vi.fn(async (): Promise<ValidationResult> => expectedResult);
      const command = defineTypeValidator(
        { typeName: 'adaptive-card', schema: 'Test schema', description: 'Test description' },
        handler
      );
      const request = createMockValidatorRequest();
      const context = createMockValidatorContext();

      const result = await command(request, context);

      expect(result).toEqual(expectedResult);
    });

    it('should attach factoryType metadata', () => {
      const handler = vi.fn(async (): Promise<ValidationResult> => ({ valid: true }));
      const command = defineTypeValidator(
        { typeName: 'adaptive-card', schema: 'Test schema', description: 'Test description' },
        handler
      );

      expect(command.factoryType).toBe('typeValidator');
    });

    it('should attach typeName from config', () => {
      const handler = vi.fn(async (): Promise<ValidationResult> => ({ valid: true }));
      const command = defineTypeValidator(
        { typeName: 'adaptive-card', schema: 'Test schema', description: 'Test description' },
        handler
      );

      expect(command.typeName).toBe('adaptive-card');
    });

    it('should attach optional timeout', () => {
      const handler = vi.fn(async (): Promise<ValidationResult> => ({ valid: true }));
      const command = defineTypeValidator(
        { typeName: 'adaptive-card', schema: 'Test schema', description: 'Test description', timeout: 5000 },
        handler
      );

      expect(command.timeout).toBe(5000);
    });

    it('should not attach timeout when not provided', () => {
      const handler = vi.fn(async (): Promise<ValidationResult> => ({ valid: true }));
      const command = defineTypeValidator(
        { typeName: 'adaptive-card', schema: 'Test schema', description: 'Test description' },
        handler
      );

      expect(command.timeout).toBeUndefined();
    });

    it('should propagate handler errors', async () => {
      const error = new Error('Validation failed');
      const handler = vi.fn(async (): Promise<ValidationResult> => {
        throw error;
      });
      const command = defineTypeValidator(
        { typeName: 'adaptive-card', schema: 'Test schema', description: 'Test description' },
        handler
      );
      const request = createMockValidatorRequest();
      const context = createMockValidatorContext();

      await expect(command(request, context)).rejects.toThrow('Validation failed');
    });

    it('should work with synchronous handlers', async () => {
      const handler = vi.fn((): ValidationResult => ({ valid: true }));
      const command = defineTypeValidator(
        { typeName: 'adaptive-card', schema: 'Test schema', description: 'Test description' },
        handler
      );
      const request = createMockValidatorRequest();
      const context = createMockValidatorContext();

      const result = await command(request, context);

      expect(handler).toHaveBeenCalledWith(request, context);
      expect(result).toEqual({ valid: true });
    });

    it('should attach schema metadata', () => {
      const handler = vi.fn(async (): Promise<ValidationResult> => ({ valid: true }));
      const command = defineTypeValidator(
        { typeName: 'adaptive-card', schema: 'JSON with type, body, actions', description: 'Adaptive Card' },
        handler
      );
      expect(command.schema).toBe('JSON with type, body, actions');
    });

    it('should attach description metadata', () => {
      const handler = vi.fn(async (): Promise<ValidationResult> => ({ valid: true }));
      const command = defineTypeValidator(
        { typeName: 'adaptive-card', schema: 'JSON structure', description: 'Interactive card format' },
        handler
      );
      expect(command.description).toBe('Interactive card format');
    });
  });

  describe('type-level tests', () => {
    it('should preserve type name as literal type', () => {
      const handler: TypeValidatorHandler = async () => ({ valid: true });
      const command = defineTypeValidator(
        { typeName: 'adaptive-card', schema: 'test schema', description: 'test desc' } as const,
        handler
      );

      expectTypeOf(command.typeName).toEqualTypeOf<'adaptive-card'>();
    });

    it('should infer type name from config', () => {
      const handler: TypeValidatorHandler = async () => ({ valid: true });
      const config = { typeName: 'task-spec', schema: 'test schema', description: 'test desc' } as const;
      const command = defineTypeValidator(config, handler);

      expectTypeOf(command.typeName).toEqualTypeOf<'task-spec'>();
    });

    it('should preserve schema and description types via SameShape', () => {
      const handler: TypeValidatorHandler = async () => ({ valid: true });
      const command = defineTypeValidator(
        { typeName: 'test', schema: 'test schema', description: 'test desc' } as const,
        handler
      );
      expectTypeOf(command.schema).toBeString();
      expectTypeOf(command.description).toBeString();
    });
  });
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
    const validatorHandler: TypeValidatorHandler = async () => ({ valid: true });

    const validator = defineTypeValidator(
      { typeName: 'adaptive-card', schema: 'test schema', description: 'test desc' } as const,
      validatorHandler
    );
    const create = defineTypeCreate({ typeName: 'adaptive-card' } as const, handler);
    const update = defineTypeUpdate({ typeName: 'adaptive-card' } as const, handler);
    const deleteCmd = defineTypeDelete({ typeName: 'adaptive-card' } as const, handler);

    expectTypeOf(validator.typeName).toEqualTypeOf<'adaptive-card'>();
    expectTypeOf(create.typeName).toEqualTypeOf<'adaptive-card'>();
    expectTypeOf(update.typeName).toEqualTypeOf<'adaptive-card'>();
    expectTypeOf(deleteCmd.typeName).toEqualTypeOf<'adaptive-card'>();

    // They should all have the same type
    expectTypeOf(validator.typeName).toEqualTypeOf(create.typeName);
    expectTypeOf(validator.typeName).toEqualTypeOf(update.typeName);
    expectTypeOf(validator.typeName).toEqualTypeOf(deleteCmd.typeName);
  });
});
