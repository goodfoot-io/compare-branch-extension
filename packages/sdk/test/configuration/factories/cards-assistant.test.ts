/**
 * Tests for defineCardsAssistant factory function.
 *
 * These tests verify the factory creates proper command objects with correct
 * metadata attachment and callable behavior.
 *
 * @summary Tests for defineCardsAssistant factory function
 */

import { flushMicrotasks } from '@cards/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineCardsAssistant } from '../../../src/config/factories/cards-assistant.js';
import type { CardsAssistantContext, CardsAssistantInput } from '../../../src/config/inputs.js';
import type { ILogger } from '../../../src/config/logger.js';

describe('defineCardsAssistant', () => {
  const sampleInput: CardsAssistantInput = {
    marketplacePath: '/test/marketplace',
    extensionPath: '/ext',
    codingAgent: 'claude-code-cli',
    repoRoot: '/workspace'
  };

  const sampleLogger: ILogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn()
  };

  const sampleContext: CardsAssistantContext = {
    logger: sampleLogger,
    cwd: '/workspace'
  };

  describe('basic functionality', () => {
    it('returns a callable function that invokes the handler', async () => {
      const handler = vi.fn();
      const command = defineCardsAssistant({}, handler);

      expect(typeof command).toBe('function');
      await command(sampleInput, sampleContext);
      expect(handler).toHaveBeenCalledWith(sampleInput, sampleContext);
    });

    it('returns a promise that resolves when handler completes', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const command = defineCardsAssistant({}, handler);

      const result = command(sampleInput, sampleContext);

      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('metadata attachment', () => {
    it('attaches factoryType as "cards-assistant"', () => {
      const command = defineCardsAssistant({}, vi.fn());
      expect(command.factoryType).toBe('cards-assistant');
    });

    it('attaches sourcePath when provided', () => {
      const command = defineCardsAssistant({ sourcePath: '/path/to/handler.ts' }, vi.fn());
      expect(command.sourcePath).toBe('/path/to/handler.ts');
    });

    it('leaves sourcePath undefined when not provided', () => {
      const command = defineCardsAssistant({}, vi.fn());
      expect(command.sourcePath).toBeUndefined();
    });
  });

  describe('handler execution', () => {
    it('awaits async handlers', async () => {
      let executed = false;
      const handler = async () => {
        await flushMicrotasks();
        executed = true;
      };

      const command = defineCardsAssistant({}, handler);
      await command(sampleInput, sampleContext);
      expect(executed).toBe(true);
    });

    it('supports synchronous handlers', async () => {
      let executed = false;
      const handler = () => {
        executed = true;
      };

      const command = defineCardsAssistant({}, handler);
      await command(sampleInput, sampleContext);
      expect(executed).toBe(true);
    });

    it('propagates handler errors', async () => {
      const error = new Error('Handler failed');
      const handler = vi.fn().mockRejectedValue(error);

      const command = defineCardsAssistant({}, handler);
      await expect(command(sampleInput, sampleContext)).rejects.toThrow('Handler failed');
    });

    it('propagates synchronous handler errors', async () => {
      const handler = () => {
        throw new Error('Sync error');
      };

      const command = defineCardsAssistant({}, handler);
      await expect(command(sampleInput, sampleContext)).rejects.toThrow('Sync error');
    });
  });
});
