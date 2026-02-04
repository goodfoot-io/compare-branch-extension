/**
 * Tests for input type definitions.
 *
 * These are type-level tests that verify the structure and properties of
 * input types used by action and type lifecycle handlers.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type { ActionContext, ActionEndInput, ActionStartInput, TypeHookInput } from '../src/inputs.js';
import type { ILogger } from '../src/logger.js';

describe('inputs', () => {
  describe('ActionStartInput', () => {
    it('should have all required fields with correct types', () => {
      expectTypeOf<ActionStartInput>().toMatchTypeOf<{
        cardId: string;
        environment: string;
        executionMode: 'interactive' | 'background';
        apiBaseUrl: string;
        apiAccessToken: string;
      }>();
    });

    it('should have optional codingAgent field', () => {
      expectTypeOf<ActionStartInput>().toMatchTypeOf<{
        codingAgent?: string;
      }>();
    });

    it('should allow interactive execution mode', () => {
      const input: ActionStartInput = {
        cardId: 'card-123',
        environment: 'default',
        executionMode: 'interactive',
        apiBaseUrl: 'https://api.example.com',
        apiAccessToken: 'token-abc'
      };

      expectTypeOf(input.executionMode).toEqualTypeOf<'interactive' | 'background'>();
    });

    it('should allow background execution mode', () => {
      const input: ActionStartInput = {
        cardId: 'card-123',
        environment: 'default',
        executionMode: 'background',
        apiBaseUrl: 'https://api.example.com',
        apiAccessToken: 'token-abc'
      };

      expectTypeOf(input.executionMode).toEqualTypeOf<'interactive' | 'background'>();
    });

    it('should allow optional codingAgent', () => {
      const inputWithAgent: ActionStartInput = {
        cardId: 'card-123',
        environment: 'default',
        executionMode: 'interactive',
        apiBaseUrl: 'https://api.example.com',
        apiAccessToken: 'token-abc',
        codingAgent: 'claude'
      };

      const inputWithoutAgent: ActionStartInput = {
        cardId: 'card-123',
        environment: 'default',
        executionMode: 'interactive',
        apiBaseUrl: 'https://api.example.com',
        apiAccessToken: 'token-abc'
      };

      expectTypeOf(inputWithAgent.codingAgent).toEqualTypeOf<string | undefined>();
      expectTypeOf(inputWithoutAgent.codingAgent).toEqualTypeOf<string | undefined>();
    });
  });

  describe('ActionEndInput', () => {
    it('should be identical to ActionStartInput', () => {
      expectTypeOf<ActionEndInput>().toEqualTypeOf<ActionStartInput>();
    });

    it('should have all the same fields as ActionStartInput', () => {
      expectTypeOf<ActionEndInput>().toMatchTypeOf<{
        cardId: string;
        environment: string;
        executionMode: 'interactive' | 'background';
        apiBaseUrl: string;
        apiAccessToken: string;
        codingAgent?: string;
      }>();
    });

    it('should be assignable to ActionStartInput', () => {
      const endInput: ActionEndInput = {
        cardId: 'card-123',
        environment: 'default',
        executionMode: 'interactive',
        apiBaseUrl: 'https://api.example.com',
        apiAccessToken: 'token-abc'
      };

      const startInput: ActionStartInput = endInput;
      expectTypeOf(startInput).toEqualTypeOf<ActionStartInput>();
    });
  });

  describe('TypeHookInput', () => {
    it('should have all required fields with correct types', () => {
      expectTypeOf<TypeHookInput>().toMatchTypeOf<{
        cardId: string;
        environment: string;
        typeName: string;
        typeVersion: string;
        fileName: string;
        filePath: string;
        fileSize: number;
        fileSha256: string;
        contentType: string;
        apiBaseUrl: string;
        apiAccessToken: string;
      }>();
    });

    it('should require all fields (no optional fields)', () => {
      const input: TypeHookInput = {
        cardId: 'card-123',
        environment: 'default',
        typeName: 'adaptive-card',
        typeVersion: '1.0.0',
        fileName: 'card.json',
        filePath: '/path/to/card.json',
        fileSize: 1024,
        fileSha256: 'abc123',
        contentType: 'application/json',
        apiBaseUrl: 'https://api.example.com',
        apiAccessToken: 'token-abc'
      };

      expectTypeOf(input).toMatchTypeOf<TypeHookInput>();
    });

    it('should have numeric fileSize', () => {
      expectTypeOf<TypeHookInput['fileSize']>().toEqualTypeOf<number>();
    });

    it('should have string fields for file metadata', () => {
      expectTypeOf<TypeHookInput['fileName']>().toEqualTypeOf<string>();
      expectTypeOf<TypeHookInput['filePath']>().toEqualTypeOf<string>();
      expectTypeOf<TypeHookInput['fileSha256']>().toEqualTypeOf<string>();
      expectTypeOf<TypeHookInput['contentType']>().toEqualTypeOf<string>();
    });

    it('should have type-related fields', () => {
      expectTypeOf<TypeHookInput['typeName']>().toEqualTypeOf<string>();
      expectTypeOf<TypeHookInput['typeVersion']>().toEqualTypeOf<string>();
    });

    it('should have API access fields', () => {
      expectTypeOf<TypeHookInput['apiBaseUrl']>().toEqualTypeOf<string>();
      expectTypeOf<TypeHookInput['apiAccessToken']>().toEqualTypeOf<string>();
    });
  });

  describe('ActionContext', () => {
    it('should have logger and cwd fields', () => {
      expectTypeOf<ActionContext>().toMatchTypeOf<{
        logger: ILogger;
        cwd: string;
      }>();
    });

    it('should have ILogger type for logger field', () => {
      expectTypeOf<ActionContext['logger']>().toEqualTypeOf<ILogger>();
    });

    it('should have string type for cwd field', () => {
      expectTypeOf<ActionContext['cwd']>().toEqualTypeOf<string>();
    });

    it('should be usable in handler signature', () => {
      const handler = async (input: ActionStartInput, context: ActionContext): Promise<void> => {
        context.logger.info('test', { cardId: input.cardId });
        const configPath = `${context.cwd}/config.json`;
        expectTypeOf(configPath).toEqualTypeOf<string>();
      };

      expectTypeOf(handler).toMatchTypeOf<(input: ActionStartInput, context: ActionContext) => Promise<void>>();
    });

    it('should allow destructuring in handler', () => {
      const handler = async (_input: ActionStartInput, { logger, cwd }: ActionContext): Promise<void> => {
        logger.info('test');
        expectTypeOf(logger).toEqualTypeOf<ILogger>();
        expectTypeOf(cwd).toEqualTypeOf<string>();
      };

      expectTypeOf(handler).parameters.toMatchTypeOf<[ActionStartInput, ActionContext]>();
    });
  });
});
