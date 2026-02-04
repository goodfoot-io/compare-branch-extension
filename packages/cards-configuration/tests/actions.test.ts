/**
 * Tests for action factory functions.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  type ActionContext,
  type ActionStartInput,
  actionEnd,
  actionStart,
  type TypeHookInput,
  typeCreate,
  typeDelete,
  typeUpdate,
  typeValidator
} from '../src/actions.js';
import { Logger } from '../src/logger.js';

// Create a mock context
const createMockContext = (): ActionContext => ({
  logger: new Logger(),
  cwd: '/workspace'
});

// Create mock action input
const createMockActionInput = (): ActionStartInput => ({
  cardId: 'card-123',
  environment: 'default',
  executionMode: 'interactive',
  apiBaseUrl: 'http://localhost:3000',
  apiAccessToken: 'token-abc'
});

// Create mock type hook input
const createMockTypeInput = (): TypeHookInput => ({
  cardId: 'card-123',
  environment: 'default',
  typeName: 'adaptive-card',
  typeVersion: '1.0.0',
  fileName: 'card.json',
  filePath: '/workspace/cards/card.json',
  fileSize: 1024,
  fileSha256: 'abc123def456',
  contentType: 'application/json',
  apiBaseUrl: 'http://localhost:3000',
  apiAccessToken: 'token-abc'
});

describe('Action Factories', () => {
  describe('actionStart', () => {
    it('creates a command with correct factoryType', () => {
      const command = actionStart({ actionName: 'Launch Claude' }, () => {});
      expect(command.factoryType).toBe('actionStart');
    });

    it('attaches actionName from config', () => {
      const command = actionStart({ actionName: 'Launch Claude' }, () => {});
      expect(command.actionName).toBe('Launch Claude');
    });

    it('attaches description from config', () => {
      const command = actionStart({ actionName: 'Launch Claude', description: 'Start a Claude session' }, () => {});
      expect(command.description).toBe('Start a Claude session');
    });

    it('attaches icon from config', () => {
      const command = actionStart({ actionName: 'Launch Claude', icon: './images/claude.svg' }, () => {});
      expect(command.icon).toBe('./images/claude.svg');
    });

    it('attaches supportsBackgroundMode from config', () => {
      const command = actionStart({ actionName: 'Launch Claude', supportsBackgroundMode: true }, () => {});
      expect(command.supportsBackgroundMode).toBe(true);
    });

    it('attaches allowConcurrent from config', () => {
      const command = actionStart({ actionName: 'Launch Claude', allowConcurrent: false }, () => {});
      expect(command.allowConcurrent).toBe(false);
    });

    it('attaches timeout from config', () => {
      const command = actionStart({ actionName: 'Launch Claude', timeout: 5000 }, () => {});
      expect(command.timeout).toBe(5000);
    });

    it('has undefined optional fields when not configured', () => {
      const command = actionStart({ actionName: 'Launch Claude' }, () => {});
      expect(command.description).toBeUndefined();
      expect(command.icon).toBeUndefined();
      expect(command.supportsBackgroundMode).toBeUndefined();
      expect(command.allowConcurrent).toBeUndefined();
      expect(command.timeout).toBeUndefined();
    });

    it('calls handler with input and context', async () => {
      const handler = vi.fn();
      const command = actionStart({ actionName: 'Launch Claude' }, handler);
      const input = createMockActionInput();
      const context = createMockContext();

      await command(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
    });

    it('awaits async handlers', async () => {
      let completed = false;
      const command = actionStart({ actionName: 'Launch Claude' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        completed = true;
      });

      await command(createMockActionInput(), createMockContext());
      expect(completed).toBe(true);
    });

    it('propagates handler errors', async () => {
      const command = actionStart({ actionName: 'Launch Claude' }, async () => {
        throw new Error('Handler failed');
      });

      await expect(command(createMockActionInput(), createMockContext())).rejects.toThrow('Handler failed');
    });
  });

  describe('actionEnd', () => {
    it('creates a command with correct factoryType', () => {
      const command = actionEnd({ actionName: 'Launch Claude' }, () => {});
      expect(command.factoryType).toBe('actionEnd');
    });

    it('attaches actionName from config', () => {
      const command = actionEnd({ actionName: 'Launch Claude' }, () => {});
      expect(command.actionName).toBe('Launch Claude');
    });

    it('attaches timeout from config', () => {
      const command = actionEnd({ actionName: 'Launch Claude', timeout: 3000 }, () => {});
      expect(command.timeout).toBe(3000);
    });

    it('has undefined timeout when not configured', () => {
      const command = actionEnd({ actionName: 'Launch Claude' }, () => {});
      expect(command.timeout).toBeUndefined();
    });

    it('calls handler with input and context', async () => {
      const handler = vi.fn();
      const command = actionEnd({ actionName: 'Launch Claude' }, handler);
      const input = createMockActionInput();
      const context = createMockContext();

      await command(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
    });

    it('awaits async handlers', async () => {
      let completed = false;
      const command = actionEnd({ actionName: 'Launch Claude' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        completed = true;
      });

      await command(createMockActionInput(), createMockContext());
      expect(completed).toBe(true);
    });
  });

  describe('typeValidator', () => {
    it('creates a command with correct factoryType', () => {
      const command = typeValidator({ typeName: 'adaptive-card' }, () => {});
      expect(command.factoryType).toBe('typeValidator');
    });

    it('attaches typeName from config', () => {
      const command = typeValidator({ typeName: 'adaptive-card' }, () => {});
      expect(command.typeName).toBe('adaptive-card');
    });

    it('attaches timeout from config', () => {
      const command = typeValidator({ typeName: 'adaptive-card', timeout: 5000 }, () => {});
      expect(command.timeout).toBe(5000);
    });

    it('has undefined timeout when not configured', () => {
      const command = typeValidator({ typeName: 'adaptive-card' }, () => {});
      expect(command.timeout).toBeUndefined();
    });

    it('calls handler with input and context', async () => {
      const handler = vi.fn();
      const command = typeValidator({ typeName: 'adaptive-card' }, handler);
      const input = createMockTypeInput();
      const context = createMockContext();

      await command(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
    });

    it('awaits async handlers', async () => {
      let completed = false;
      const command = typeValidator({ typeName: 'adaptive-card' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        completed = true;
      });

      await command(createMockTypeInput(), createMockContext());
      expect(completed).toBe(true);
    });
  });

  describe('typeCreate', () => {
    it('creates a command with correct factoryType', () => {
      const command = typeCreate({ typeName: 'adaptive-card' }, () => {});
      expect(command.factoryType).toBe('typeCreate');
    });

    it('attaches typeName from config', () => {
      const command = typeCreate({ typeName: 'adaptive-card' }, () => {});
      expect(command.typeName).toBe('adaptive-card');
    });

    it('attaches timeout from config', () => {
      const command = typeCreate({ typeName: 'adaptive-card', timeout: 5000 }, () => {});
      expect(command.timeout).toBe(5000);
    });

    it('has undefined timeout when not configured', () => {
      const command = typeCreate({ typeName: 'adaptive-card' }, () => {});
      expect(command.timeout).toBeUndefined();
    });

    it('calls handler with input and context', async () => {
      const handler = vi.fn();
      const command = typeCreate({ typeName: 'adaptive-card' }, handler);
      const input = createMockTypeInput();
      const context = createMockContext();

      await command(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
    });
  });

  describe('typeUpdate', () => {
    it('creates a command with correct factoryType', () => {
      const command = typeUpdate({ typeName: 'adaptive-card' }, () => {});
      expect(command.factoryType).toBe('typeUpdate');
    });

    it('attaches typeName from config', () => {
      const command = typeUpdate({ typeName: 'adaptive-card' }, () => {});
      expect(command.typeName).toBe('adaptive-card');
    });

    it('attaches timeout from config', () => {
      const command = typeUpdate({ typeName: 'adaptive-card', timeout: 5000 }, () => {});
      expect(command.timeout).toBe(5000);
    });

    it('has undefined timeout when not configured', () => {
      const command = typeUpdate({ typeName: 'adaptive-card' }, () => {});
      expect(command.timeout).toBeUndefined();
    });

    it('calls handler with input and context', async () => {
      const handler = vi.fn();
      const command = typeUpdate({ typeName: 'adaptive-card' }, handler);
      const input = createMockTypeInput();
      const context = createMockContext();

      await command(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
    });
  });

  describe('typeDelete', () => {
    it('creates a command with correct factoryType', () => {
      const command = typeDelete({ typeName: 'adaptive-card' }, () => {});
      expect(command.factoryType).toBe('typeDelete');
    });

    it('attaches typeName from config', () => {
      const command = typeDelete({ typeName: 'adaptive-card' }, () => {});
      expect(command.typeName).toBe('adaptive-card');
    });

    it('attaches timeout from config', () => {
      const command = typeDelete({ typeName: 'adaptive-card', timeout: 5000 }, () => {});
      expect(command.timeout).toBe(5000);
    });

    it('has undefined timeout when not configured', () => {
      const command = typeDelete({ typeName: 'adaptive-card' }, () => {});
      expect(command.timeout).toBeUndefined();
    });

    it('calls handler with input and context', async () => {
      const handler = vi.fn();
      const command = typeDelete({ typeName: 'adaptive-card' }, handler);
      const input = createMockTypeInput();
      const context = createMockContext();

      await command(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
    });
  });

  describe('Command types', () => {
    it('ActionStartCommand is callable', () => {
      const command = actionStart({ actionName: 'Test' }, () => {});
      expect(typeof command).toBe('function');
    });

    it('ActionEndCommand is callable', () => {
      const command = actionEnd({ actionName: 'Test' }, () => {});
      expect(typeof command).toBe('function');
    });

    it('TypeValidatorCommand is callable', () => {
      const command = typeValidator({ typeName: 'test' }, () => {});
      expect(typeof command).toBe('function');
    });

    it('TypeCreateCommand is callable', () => {
      const command = typeCreate({ typeName: 'test' }, () => {});
      expect(typeof command).toBe('function');
    });

    it('TypeUpdateCommand is callable', () => {
      const command = typeUpdate({ typeName: 'test' }, () => {});
      expect(typeof command).toBe('function');
    });

    it('TypeDeleteCommand is callable', () => {
      const command = typeDelete({ typeName: 'test' }, () => {});
      expect(typeof command).toBe('function');
    });
  });
});
