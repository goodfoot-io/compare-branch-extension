/**
 * Tests for defineActionStart factory function.
 *
 * These tests verify the factory creates proper command objects with correct
 * metadata attachment and callable behavior.
 */

import { describe, expect, it, vi } from 'vitest';
import { defineActionStart } from '../../src/factories/action-start.js';
import type { ActionContext, ActionStartInput } from '../../src/inputs.js';
import type { ILogger } from '../../src/logger.js';

describe('defineActionStart', () => {
  // Sample input and context for testing
  const mockInput: ActionStartInput = {
    cardId: 'card-123',
    environment: 'default',
    executionMode: 'interactive',
    apiBaseUrl: 'https://api.example.com',
    apiAccessToken: 'token-abc',
    codingAgent: 'claude'
  };

  const mockLogger: ILogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn()
  };

  const mockContext: ActionContext = {
    logger: mockLogger,
    cwd: '/workspace'
  };

  describe('basic functionality', () => {
    it('returns a callable function', async () => {
      const handler = vi.fn();
      const command = defineActionStart({ actionName: 'Test Action' }, handler);

      expect(typeof command).toBe('function');
      await command(mockInput, mockContext);
      expect(handler).toHaveBeenCalledWith(mockInput, mockContext);
    });

    it('invokes handler with correct arguments', async () => {
      const handler = vi.fn();
      const command = defineActionStart({ actionName: 'Launch' }, handler);

      await command(mockInput, mockContext);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(mockInput, mockContext);
    });

    it('returns a promise that resolves when handler completes', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const command = defineActionStart({ actionName: 'Deploy' }, handler);

      const result = command(mockInput, mockContext);

      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('metadata attachment', () => {
    it('attaches factoryType as "actionStart"', () => {
      const handler = vi.fn();
      const command = defineActionStart({ actionName: 'Test' }, handler);

      expect(command.factoryType).toBe('actionStart');
    });

    it('attaches actionName from config', () => {
      const handler = vi.fn();
      const command = defineActionStart({ actionName: 'Launch Claude' }, handler);

      expect(command.actionName).toBe('Launch Claude');
    });

    it('attaches description when provided', () => {
      const handler = vi.fn();
      const command = defineActionStart(
        {
          actionName: 'Deploy',
          description: 'Deploy to production'
        },
        handler
      );

      expect(command.description).toBe('Deploy to production');
    });

    it('leaves description undefined when not provided', () => {
      const handler = vi.fn();
      const command = defineActionStart({ actionName: 'Launch' }, handler);

      expect(command.description).toBeUndefined();
    });

    it('attaches icon when provided', () => {
      const handler = vi.fn();
      const command = defineActionStart(
        {
          actionName: 'Launch',
          icon: '$CARDS_PLUGIN_ROOT/icons/launch.svg'
        },
        handler
      );

      expect(command.icon).toBe('$CARDS_PLUGIN_ROOT/icons/launch.svg');
    });

    it('leaves icon undefined when not provided', () => {
      const handler = vi.fn();
      const command = defineActionStart({ actionName: 'Launch' }, handler);

      expect(command.icon).toBeUndefined();
    });

    it('attaches supportsBackgroundMode when provided', () => {
      const handler = vi.fn();
      const command = defineActionStart(
        {
          actionName: 'Deploy',
          supportsBackgroundMode: true
        },
        handler
      );

      expect(command.supportsBackgroundMode).toBe(true);
    });

    it('leaves supportsBackgroundMode undefined when not provided', () => {
      const handler = vi.fn();
      const command = defineActionStart({ actionName: 'Launch' }, handler);

      expect(command.supportsBackgroundMode).toBeUndefined();
    });

    it('attaches allowConcurrent when provided', () => {
      const handler = vi.fn();
      const command = defineActionStart(
        {
          actionName: 'Monitor',
          allowConcurrent: true
        },
        handler
      );

      expect(command.allowConcurrent).toBe(true);
    });

    it('leaves allowConcurrent undefined when not provided', () => {
      const handler = vi.fn();
      const command = defineActionStart({ actionName: 'Launch' }, handler);

      expect(command.allowConcurrent).toBeUndefined();
    });

    it('attaches timeout when provided', () => {
      const handler = vi.fn();
      const command = defineActionStart(
        {
          actionName: 'Deploy',
          timeout: 60000
        },
        handler
      );

      expect(command.timeout).toBe(60000);
    });

    it('leaves timeout undefined when not provided', () => {
      const handler = vi.fn();
      const command = defineActionStart({ actionName: 'Launch' }, handler);

      expect(command.timeout).toBeUndefined();
    });

    it('attaches all optional fields when provided', () => {
      const handler = vi.fn();
      const command = defineActionStart(
        {
          actionName: 'Deploy Application',
          description: 'Deploy to production',
          icon: '$CARDS_PLUGIN_ROOT/icons/deploy.svg',
          supportsBackgroundMode: true,
          allowConcurrent: false,
          timeout: 120000
        },
        handler
      );

      expect(command.factoryType).toBe('actionStart');
      expect(command.actionName).toBe('Deploy Application');
      expect(command.description).toBe('Deploy to production');
      expect(command.icon).toBe('$CARDS_PLUGIN_ROOT/icons/deploy.svg');
      expect(command.supportsBackgroundMode).toBe(true);
      expect(command.allowConcurrent).toBe(false);
      expect(command.timeout).toBe(120000);
    });
  });

  describe('handler execution', () => {
    it('awaits async handlers', async () => {
      let executed = false;
      const handler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        executed = true;
      };

      const command = defineActionStart({ actionName: 'Async Action' }, handler);

      await command(mockInput, mockContext);
      expect(executed).toBe(true);
    });

    it('supports synchronous handlers', async () => {
      let executed = false;
      const handler = () => {
        executed = true;
      };

      const command = defineActionStart({ actionName: 'Sync Action' }, handler);

      await command(mockInput, mockContext);
      expect(executed).toBe(true);
    });

    it('propagates handler errors', async () => {
      const error = new Error('Handler failed');
      const handler = vi.fn().mockRejectedValue(error);

      const command = defineActionStart({ actionName: 'Failing Action' }, handler);

      await expect(command(mockInput, mockContext)).rejects.toThrow('Handler failed');
    });

    it('propagates synchronous handler errors', async () => {
      const handler = () => {
        throw new Error('Sync error');
      };

      const command = defineActionStart({ actionName: 'Sync Failing Action' }, handler);

      await expect(command(mockInput, mockContext)).rejects.toThrow('Sync error');
    });
  });

  describe('type preservation', () => {
    it('preserves action name as literal type', () => {
      const handler = vi.fn();

      // Type preservation test: the return type should be ActionStartCommand<'Launch'>
      // not ActionStartCommand<string>. This is verified at compile time by TypeScript.
      const command = defineActionStart({ actionName: 'Launch' }, handler);

      // Runtime verification that the action name is correct
      expect(command.actionName).toBe('Launch');
    });
  });
});
