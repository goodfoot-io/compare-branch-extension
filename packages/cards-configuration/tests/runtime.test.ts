/**
 * Unit tests for runtime execution orchestration.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ActionEndCommand,
  ActionStartCommand,
  TypeCreateCommand,
  TypeDeleteCommand,
  TypeUpdateCommand
} from '../src/command-types.js';
import { CARDS_ENV_VARS } from '../src/env.js';
import { EXIT_CODES } from '../src/exit-codes.js';
import { logger } from '../src/logger.js';
import { execute } from '../src/runtime.js';

describe('runtime', () => {
  // Store original env vars
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd();

  // Mock process.exit and process.stderr.write
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let loggerClearContextSpy: ReturnType<typeof vi.spyOn>;
  let loggerCloseSpy: ReturnType<typeof vi.spyOn>;
  let loggerSetContextSpy: ReturnType<typeof vi.spyOn>;
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock process methods
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    // Mock logger methods
    loggerClearContextSpy = vi.spyOn(logger, 'clearContext');
    loggerCloseSpy = vi.spyOn(logger, 'close');
    loggerSetContextSpy = vi.spyOn(logger, 'setContext');
    loggerErrorSpy = vi.spyOn(logger, 'error');

    // Setup action environment variables
    process.env[CARDS_ENV_VARS.CARD_ID] = 'card-123';
    process.env[CARDS_ENV_VARS.ENVIRONMENT] = 'default';
    process.env[CARDS_ENV_VARS.EXECUTION_MODE] = 'interactive';
    process.env[CARDS_ENV_VARS.API_BASE_URL] = 'https://api.example.com';
    process.env[CARDS_ENV_VARS.API_ACCESS_TOKEN] = 'token-456';
  });

  afterEach(() => {
    // Restore original state
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.chdir(originalCwd);
  });

  describe('execute', () => {
    describe('action start commands', () => {
      it('should execute action start command with extracted input', async () => {
        const handler = vi.fn().mockResolvedValue(undefined);
        const command: ActionStartCommand = Object.assign(handler, {
          factoryType: 'actionStart' as const,
          actionName: 'Test Action'
        });

        await execute(command);

        // Should extract action input
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            cardId: 'card-123',
            environment: 'default',
            executionMode: 'interactive',
            apiBaseUrl: 'https://api.example.com',
            apiAccessToken: 'token-456'
          }),
          expect.objectContaining({
            logger: expect.any(Object),
            cwd: expect.any(String)
          })
        );

        // Should set logger context
        expect(loggerSetContextSpy).toHaveBeenCalledWith(
          'actionStart',
          expect.objectContaining({ cardId: 'card-123' })
        );

        // Should exit successfully
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
        expect(loggerClearContextSpy).toHaveBeenCalled();
        expect(loggerCloseSpy).toHaveBeenCalled();
      });

      it('should handle handler errors in action start', async () => {
        const error = new Error('Handler failed');
        const handler = vi.fn().mockRejectedValue(error);
        const command: ActionStartCommand = Object.assign(handler, {
          factoryType: 'actionStart' as const,
          actionName: 'Test Action'
        });

        await execute(command);

        // Should write error to stderr
        expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Handler failed'));

        // Should log error
        expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Handler error'));

        // Should exit with error
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
        expect(loggerClearContextSpy).toHaveBeenCalled();
        expect(loggerCloseSpy).toHaveBeenCalled();
      });

      it('should include coding agent when present', async () => {
        process.env[CARDS_ENV_VARS.CODING_AGENT] = 'claude';

        const handler = vi.fn().mockResolvedValue(undefined);
        const command: ActionStartCommand = Object.assign(handler, {
          factoryType: 'actionStart' as const,
          actionName: 'Test Action'
        });

        await execute(command);

        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            codingAgent: 'claude'
          }),
          expect.any(Object)
        );
      });
    });

    describe('action end commands', () => {
      it('should execute action end command with extracted input', async () => {
        const handler = vi.fn().mockResolvedValue(undefined);
        const command: ActionEndCommand = Object.assign(handler, {
          factoryType: 'actionEnd' as const,
          actionName: 'Test Action'
        });

        await execute(command);

        // Should extract action input (same as start)
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            cardId: 'card-123',
            environment: 'default',
            executionMode: 'interactive'
          }),
          expect.objectContaining({
            logger: expect.any(Object),
            cwd: expect.any(String)
          })
        );

        // Should set logger context
        expect(loggerSetContextSpy).toHaveBeenCalledWith('actionEnd', expect.objectContaining({ cardId: 'card-123' }));

        // Should exit successfully
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
      });

      it('should handle handler errors in action end', async () => {
        const error = new Error('End handler failed');
        const handler = vi.fn().mockRejectedValue(error);
        const command: ActionEndCommand = Object.assign(handler, {
          factoryType: 'actionEnd' as const,
          actionName: 'Test Action'
        });

        await execute(command);

        // Should write error to stderr
        expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('End handler failed'));

        // Should exit with error
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
      });
    });

    // Note: Type validator commands are not tested here because they use
    // executeValidation (HTTP stdin/stdout protocol) instead of execute

    describe('type create commands', () => {
      beforeEach(() => {
        // Setup type environment variables
        process.env[CARDS_ENV_VARS.TYPE_NAME] = 'adaptive-card';
        process.env[CARDS_ENV_VARS.TYPE_VERSION] = '1.0.0';
        process.env[CARDS_ENV_VARS.FILE_NAME] = 'card.json';
        process.env[CARDS_ENV_VARS.FILE_PATH] = '/path/to/card.json';
        process.env[CARDS_ENV_VARS.FILE_SIZE] = '1024';
        process.env[CARDS_ENV_VARS.SHA256] = 'abc123';
        process.env[CARDS_ENV_VARS.CONTENT_TYPE] = 'application/json';
      });

      it('should execute type create command with extracted input', async () => {
        const handler = vi.fn().mockResolvedValue(undefined);
        const command: TypeCreateCommand = Object.assign(handler, {
          factoryType: 'typeCreate' as const,
          typeName: 'adaptive-card'
        });

        await execute(command);

        // Should extract type input
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            typeName: 'adaptive-card',
            fileName: 'card.json'
          }),
          expect.any(Object)
        );

        // Should set logger context
        expect(loggerSetContextSpy).toHaveBeenCalledWith(
          'typeCreate',
          expect.objectContaining({ typeName: 'adaptive-card' })
        );

        // Should exit successfully
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
      });

      it('should handle create handler errors', async () => {
        const error = new Error('Create failed');
        const handler = vi.fn().mockRejectedValue(error);
        const command: TypeCreateCommand = Object.assign(handler, {
          factoryType: 'typeCreate' as const,
          typeName: 'adaptive-card'
        });

        await execute(command);

        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
      });
    });

    describe('type update commands', () => {
      beforeEach(() => {
        // Setup type environment variables
        process.env[CARDS_ENV_VARS.TYPE_NAME] = 'adaptive-card';
        process.env[CARDS_ENV_VARS.TYPE_VERSION] = '1.0.0';
        process.env[CARDS_ENV_VARS.FILE_NAME] = 'card.json';
        process.env[CARDS_ENV_VARS.FILE_PATH] = '/path/to/card.json';
        process.env[CARDS_ENV_VARS.FILE_SIZE] = '1024';
        process.env[CARDS_ENV_VARS.SHA256] = 'abc123';
        process.env[CARDS_ENV_VARS.CONTENT_TYPE] = 'application/json';
      });

      it('should execute type update command with extracted input', async () => {
        const handler = vi.fn().mockResolvedValue(undefined);
        const command: TypeUpdateCommand = Object.assign(handler, {
          factoryType: 'typeUpdate' as const,
          typeName: 'adaptive-card'
        });

        await execute(command);

        // Should extract type input
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            typeName: 'adaptive-card',
            fileName: 'card.json'
          }),
          expect.any(Object)
        );

        // Should set logger context
        expect(loggerSetContextSpy).toHaveBeenCalledWith(
          'typeUpdate',
          expect.objectContaining({ typeName: 'adaptive-card' })
        );

        // Should exit successfully
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
      });

      it('should handle update handler errors', async () => {
        const error = new Error('Update failed');
        const handler = vi.fn().mockRejectedValue(error);
        const command: TypeUpdateCommand = Object.assign(handler, {
          factoryType: 'typeUpdate' as const,
          typeName: 'adaptive-card'
        });

        await execute(command);

        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
      });
    });

    describe('type delete commands', () => {
      beforeEach(() => {
        // Setup type environment variables
        process.env[CARDS_ENV_VARS.TYPE_NAME] = 'adaptive-card';
        process.env[CARDS_ENV_VARS.TYPE_VERSION] = '1.0.0';
        process.env[CARDS_ENV_VARS.FILE_NAME] = 'card.json';
        process.env[CARDS_ENV_VARS.FILE_PATH] = '/path/to/card.json';
        process.env[CARDS_ENV_VARS.FILE_SIZE] = '1024';
        process.env[CARDS_ENV_VARS.SHA256] = 'abc123';
        process.env[CARDS_ENV_VARS.CONTENT_TYPE] = 'application/json';
      });

      it('should execute type delete command with extracted input', async () => {
        const handler = vi.fn().mockResolvedValue(undefined);
        const command: TypeDeleteCommand = Object.assign(handler, {
          factoryType: 'typeDelete' as const,
          typeName: 'adaptive-card'
        });

        await execute(command);

        // Should extract type input
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            typeName: 'adaptive-card',
            fileName: 'card.json'
          }),
          expect.any(Object)
        );

        // Should set logger context
        expect(loggerSetContextSpy).toHaveBeenCalledWith(
          'typeDelete',
          expect.objectContaining({ typeName: 'adaptive-card' })
        );

        // Should exit successfully
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
      });

      it('should handle delete handler errors', async () => {
        const error = new Error('Delete failed');
        const handler = vi.fn().mockRejectedValue(error);
        const command: TypeDeleteCommand = Object.assign(handler, {
          factoryType: 'typeDelete' as const,
          typeName: 'adaptive-card'
        });

        await execute(command);

        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
      });
    });

    describe('environment extraction errors', () => {
      it('should handle missing required environment variables', async () => {
        // Remove required env var
        delete process.env[CARDS_ENV_VARS.CARD_ID];

        const handler = vi.fn().mockResolvedValue(undefined);
        const command: ActionStartCommand = Object.assign(handler, {
          factoryType: 'actionStart' as const,
          actionName: 'Test Action'
        });

        await execute(command);

        // Should not call handler
        expect(handler).not.toHaveBeenCalled();

        // Should log extraction error
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to extract input from environment')
        );

        // Should write error to stderr
        expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Handler failed'));

        // Should exit with error
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
      });
    });

    describe('context management', () => {
      it('should set and clear logger context', async () => {
        const handler = vi.fn().mockResolvedValue(undefined);
        const command: ActionStartCommand = Object.assign(handler, {
          factoryType: 'actionStart' as const,
          actionName: 'Test Action'
        });

        await execute(command);

        // Should set context before handler
        expect(loggerSetContextSpy).toHaveBeenCalled();

        // Should clear context after handler
        expect(loggerClearContextSpy).toHaveBeenCalled();
      });

      it('should clear context even when handler throws', async () => {
        const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
        const command: ActionStartCommand = Object.assign(handler, {
          factoryType: 'actionStart' as const,
          actionName: 'Test Action'
        });

        await execute(command);

        // Should still clear context
        expect(loggerClearContextSpy).toHaveBeenCalled();
        expect(loggerCloseSpy).toHaveBeenCalled();
      });

      it('should provide cwd in action context', async () => {
        const handler = vi.fn().mockResolvedValue(undefined);
        const command: ActionStartCommand = Object.assign(handler, {
          factoryType: 'actionStart' as const,
          actionName: 'Test Action'
        });

        await execute(command);

        expect(handler).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            cwd: process.cwd()
          })
        );
      });
    });

    describe('non-Error throw values', () => {
      it('should handle string throws', async () => {
        const handler = vi.fn().mockRejectedValue('String error');
        const command: ActionStartCommand = Object.assign(handler, {
          factoryType: 'actionStart' as const,
          actionName: 'Test Action'
        });

        await execute(command);

        // Should write string to stderr
        expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('String error'));

        // Should exit with error
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
      });

      it('should handle object throws', async () => {
        const handler = vi.fn().mockRejectedValue({ code: 'ERR_CUSTOM' });
        const command: ActionStartCommand = Object.assign(handler, {
          factoryType: 'actionStart' as const,
          actionName: 'Test Action'
        });

        await execute(command);

        // Should convert object to string
        expect(stderrSpy).toHaveBeenCalledWith(expect.any(String));

        // Should exit with error
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
      });
    });
  });
});
