/**
 * Tests for defineActionEnd factory function.
 *
 * These tests verify that the factory correctly creates callable action end
 * commands with proper metadata attachment and type preservation.
 */

import { describe, expect, it, vi } from 'vitest';
import { defineActionEnd } from '../../src/factories/action-end.js';
import type { ActionContext, ActionEndInput } from '../../src/inputs.js';
import type { Logger } from '../../src/logger.js';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a minimal ActionEndInput for testing.
 */
function createTestInput(): ActionEndInput {
  return {
    cardId: 'test-card-123',
    environment: 'default',
    executionMode: 'interactive',
    apiBaseUrl: 'https://api.example.com',
    apiAccessToken: 'test-token'
  };
}

/**
 * Creates a minimal ActionContext for testing.
 */
function createTestContext(): ActionContext {
  return {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    } as unknown as Logger,
    cwd: '/test/workspace'
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('defineActionEnd', () => {
  describe('callable function behavior', () => {
    it('should return a callable function that invokes the handler', async () => {
      const mockHandler = vi.fn().mockResolvedValue(undefined);
      const input = createTestInput();
      const context = createTestContext();

      const command = defineActionEnd({ actionName: 'Test Action' }, mockHandler);

      await command(input, context);

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(input, context);
    });

    it('should handle synchronous handlers', async () => {
      let called = false;
      const syncHandler = () => {
        called = true;
      };

      const command = defineActionEnd({ actionName: 'Sync Action' }, syncHandler);

      await command(createTestInput(), createTestContext());

      expect(called).toBe(true);
    });

    it('should propagate handler errors', async () => {
      const error = new Error('Handler failed');
      const failingHandler = vi.fn().mockRejectedValue(error);

      const command = defineActionEnd({ actionName: 'Failing Action' }, failingHandler);

      await expect(command(createTestInput(), createTestContext())).rejects.toThrow('Handler failed');
    });
  });

  describe('metadata attachment', () => {
    it('should attach factoryType: "actionEnd"', () => {
      const handler = vi.fn();
      const command = defineActionEnd({ actionName: 'Test' }, handler);

      expect(command.factoryType).toBe('actionEnd');
    });

    it('should attach actionName from config', () => {
      const handler = vi.fn();
      const command = defineActionEnd({ actionName: 'Launch Claude' }, handler);

      expect(command.actionName).toBe('Launch Claude');
    });

    it('should attach timeout when provided', () => {
      const handler = vi.fn();
      const command = defineActionEnd({ actionName: 'Test', timeout: 30000 }, handler);

      expect(command.timeout).toBe(30000);
    });

    it('should leave timeout undefined when not provided', () => {
      const handler = vi.fn();
      const command = defineActionEnd({ actionName: 'Test' }, handler);

      expect(command.timeout).toBeUndefined();
    });
  });

  describe('type preservation', () => {
    it('should preserve action name as literal type', () => {
      const handler = vi.fn();
      const command = defineActionEnd({ actionName: 'Deploy' }, handler);

      // Runtime check that action name is preserved
      expect(command.actionName).toBe('Deploy');

      // Type-level check (compile-time only, but we can verify shape)
      type ExpectedType = typeof command;
      type ActionName = ExpectedType['actionName'];

      // This is a runtime placeholder for the compile-time check
      // In actual usage, TypeScript would enforce: ActionEndCommand<'Deploy'>
      const _typeCheck: ActionName = 'Deploy';
      expect(_typeCheck).toBe('Deploy');
    });
  });

  describe('SameShape typo detection', () => {
    it('should accept valid configurations', () => {
      const handler = vi.fn();

      // These should all compile and work
      expect(() => defineActionEnd({ actionName: 'Test' }, handler)).not.toThrow();

      expect(() => defineActionEnd({ actionName: 'Test', timeout: 5000 }, handler)).not.toThrow();
    });

    // Note: The following are compile-time tests that would fail at
    // TypeScript compilation, not runtime. They're documented here
    // for completeness but cannot be tested in Jest/Vitest.
    //
    // These WOULD cause TypeScript errors:
    // defineActionEnd({ actionNme: 'Test' }, handler);  // typo
    // defineActionEnd({ actionName: 'Test', extra: true }, handler);  // extra prop
  });

  describe('edge cases', () => {
    it('should handle empty action names', async () => {
      const handler = vi.fn();
      const command = defineActionEnd({ actionName: '' }, handler);

      expect(command.actionName).toBe('');
      await command(createTestInput(), createTestContext());
      expect(handler).toHaveBeenCalled();
    });

    it('should handle action names with special characters', async () => {
      const handler = vi.fn();
      const actionName = 'Test: Action (v2) [special]';
      const command = defineActionEnd({ actionName }, handler);

      expect(command.actionName).toBe(actionName);
      await command(createTestInput(), createTestContext());
      expect(handler).toHaveBeenCalled();
    });

    it('should handle zero timeout', () => {
      const handler = vi.fn();
      const command = defineActionEnd({ actionName: 'Test', timeout: 0 }, handler);

      expect(command.timeout).toBe(0);
    });
  });
});
