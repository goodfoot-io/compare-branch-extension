/**
 * Tests for input type definitions.
 *
 * These are type-level tests that verify the structure and properties of
 * input types used by action and type lifecycle handlers.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type { ActionContext, ActionInput, TypeHookInput } from '../src/inputs.js';
import type { ILogger } from '../src/logger.js';

describe('inputs', () => {
  describe('ActionInput', () => {
    it('should have all required fields with correct types', () => {
      expectTypeOf<ActionInput>().toMatchTypeOf<{
        cardId: string;
        actionName: string;
        environment: string;
        executionMode: 'interactive' | 'background';
        apiBaseUrl: string;
        apiAccessToken: string;
        workspacePath: string;
        cardRepoPath: string;
      }>();
    });

    it('should have optional codingAgent field', () => {
      expectTypeOf<ActionInput>().toMatchTypeOf<{
        codingAgent?: string;
      }>();
    });

    it('should have optional switchToInteractiveData field', () => {
      expectTypeOf<ActionInput>().toMatchTypeOf<{
        switchToInteractiveData?: unknown;
      }>();
    });

    it('should allow interactive execution mode', () => {
      const input: ActionInput = {
        cardId: 'card-123',
        actionName: 'Test Action',
        environment: 'default',
        executionMode: 'interactive',
        apiBaseUrl: 'https://api.example.com',
        apiAccessToken: 'token-abc',
        workspacePath: '/workspace',
        cardRepoPath: '/workspace/.cards/card-123'
      };

      expectTypeOf(input.executionMode).toEqualTypeOf<'interactive' | 'background'>();
    });

    it('should allow background execution mode', () => {
      const input: ActionInput = {
        cardId: 'card-123',
        actionName: 'Test Action',
        environment: 'default',
        executionMode: 'background',
        apiBaseUrl: 'https://api.example.com',
        apiAccessToken: 'token-abc',
        workspacePath: '/workspace',
        cardRepoPath: '/workspace/.cards/card-123'
      };

      expectTypeOf(input.executionMode).toEqualTypeOf<'interactive' | 'background'>();
    });

    it('should allow optional codingAgent', () => {
      const inputWithAgent: ActionInput = {
        cardId: 'card-123',
        actionName: 'Test Action',
        environment: 'default',
        executionMode: 'interactive',
        apiBaseUrl: 'https://api.example.com',
        apiAccessToken: 'token-abc',
        codingAgent: 'claude',
        workspacePath: '/workspace',
        cardRepoPath: '/workspace/.cards/card-123'
      };

      const inputWithoutAgent: ActionInput = {
        cardId: 'card-123',
        actionName: 'Test Action',
        environment: 'default',
        executionMode: 'interactive',
        apiBaseUrl: 'https://api.example.com',
        apiAccessToken: 'token-abc',
        workspacePath: '/workspace',
        cardRepoPath: '/workspace/.cards/card-123'
      };

      expectTypeOf(inputWithAgent.codingAgent).toEqualTypeOf<string | undefined>();
      expectTypeOf(inputWithoutAgent.codingAgent).toEqualTypeOf<string | undefined>();
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

    it('should have onCancel method', () => {
      expectTypeOf<ActionContext>().toHaveProperty('onCancel');
      expectTypeOf<ActionContext['onCancel']>().toBeFunction();
    });

    it('should have onSwitchToInteractive method', () => {
      expectTypeOf<ActionContext>().toHaveProperty('onSwitchToInteractive');
      expectTypeOf<ActionContext['onSwitchToInteractive']>().toBeFunction();
    });

    it('should be usable in handler signature', () => {
      const handler = async (input: ActionInput, context: ActionContext): Promise<void> => {
        context.logger.info('test', { cardId: input.cardId });
        context.onCancel(() => {});
        context.onSwitchToInteractive(() => ({ sessionId: 'abc' }));
        const configPath = `${context.cwd}/config.json`;
        expectTypeOf(configPath).toEqualTypeOf<string>();
      };

      expectTypeOf(handler).toMatchTypeOf<(input: ActionInput, context: ActionContext) => Promise<void>>();
    });

    it('should allow destructuring in handler', () => {
      const handler = async (
        _input: ActionInput,
        { logger, cwd, onCancel, onSwitchToInteractive }: ActionContext
      ): Promise<void> => {
        logger.info('test');
        onCancel(() => {});
        onSwitchToInteractive(() => ({}));
        expectTypeOf(logger).toEqualTypeOf<ILogger>();
        expectTypeOf(cwd).toEqualTypeOf<string>();
      };

      expectTypeOf(handler).parameters.toMatchTypeOf<[ActionInput, ActionContext]>();
    });
  });
});
