/**
 * Unit tests for runtime execution orchestration.
 */

import * as fs from 'node:fs';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionCommand, TypeCreateCommand, TypeDeleteCommand, TypeUpdateCommand } from '../src/command-types.js';
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
    process.env[CARDS_ENV_VARS.ACTION_NAME] = 'Test Action';
    process.env[CARDS_ENV_VARS.ENVIRONMENT] = 'default';
    process.env[CARDS_ENV_VARS.EXECUTION_MODE] = 'interactive';
    process.env[CARDS_ENV_VARS.API_BASE_URL] = 'https://api.example.com';
    process.env[CARDS_ENV_VARS.API_ACCESS_TOKEN] = 'token-456';
    process.env[CARDS_ENV_VARS.WORKSPACE_PATH] = '/workspace';
    process.env[CARDS_ENV_VARS.CARD_REPO_PATH] = '/workspace/cards';
  });

  afterEach(() => {
    // Restore original state
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.chdir(originalCwd);
  });

  describe('execute', () => {
    describe('action commands', () => {
      it('should execute action command with extracted input', async () => {
        const handler = vi.fn().mockResolvedValue(undefined);
        const command: ActionCommand = Object.assign(handler, {
          factoryType: 'action' as const,
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
            cwd: expect.any(String),
            onCancel: expect.any(Function),
            onSwitchToInteractive: expect.any(Function)
          })
        );

        // Should set logger context
        expect(loggerSetContextSpy).toHaveBeenCalledWith('action', expect.objectContaining({ cardId: 'card-123' }));

        // Should exit successfully
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
        expect(loggerClearContextSpy).toHaveBeenCalled();
        expect(loggerCloseSpy).toHaveBeenCalled();
      });

      it('should handle handler errors in action', async () => {
        const error = new Error('Handler failed');
        const handler = vi.fn().mockRejectedValue(error);
        const command: ActionCommand = Object.assign(handler, {
          factoryType: 'action' as const,
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
        const command: ActionCommand = Object.assign(handler, {
          factoryType: 'action' as const,
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
        const command: ActionCommand = Object.assign(handler, {
          factoryType: 'action' as const,
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
        const command: ActionCommand = Object.assign(handler, {
          factoryType: 'action' as const,
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
        const command: ActionCommand = Object.assign(handler, {
          factoryType: 'action' as const,
          actionName: 'Test Action'
        });

        await execute(command);

        // Should still clear context
        expect(loggerClearContextSpy).toHaveBeenCalled();
        expect(loggerCloseSpy).toHaveBeenCalled();
      });

      it('should provide cwd in action context', async () => {
        const handler = vi.fn().mockResolvedValue(undefined);
        const command: ActionCommand = Object.assign(handler, {
          factoryType: 'action' as const,
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
        const command: ActionCommand = Object.assign(handler, {
          factoryType: 'action' as const,
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
        const command: ActionCommand = Object.assign(handler, {
          factoryType: 'action' as const,
          actionName: 'Test Action'
        });

        await execute(command);

        // Should convert object to string
        expect(stderrSpy).toHaveBeenCalledWith(expect.any(String));

        // Should exit with error
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
      });
    });

    describe('socket integration', () => {
      let server: net.Server;
      let socketPath: string;
      let serverConnection: net.Socket | undefined;
      let loggerWarnSpy: ReturnType<typeof vi.spyOn>;
      let killSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        socketPath = path.join(os.tmpdir(), `test-runtime-socket-${process.pid}-${Date.now()}.sock`);
        serverConnection = undefined;
        loggerWarnSpy = vi.spyOn(logger, 'warn');
        killSpy = vi.spyOn(process, 'kill').mockImplementation((() => {}) as never);
      });

      afterEach(async () => {
        serverConnection?.destroy();
        if (server?.listening) {
          await new Promise<void>((resolve) => {
            server.close(() => resolve());
          });
        }
        try {
          fs.unlinkSync(socketPath);
        } catch {
          // Ignore
        }
      });

      function startServer(): Promise<void> {
        return new Promise((resolve) => {
          server = net.createServer((socket) => {
            serverConnection = socket;
          });
          server.listen(socketPath, () => resolve());
        });
      }

      function waitForServerConnection(): Promise<net.Socket> {
        return new Promise((resolve) => {
          if (serverConnection) {
            resolve(serverConnection);
            return;
          }
          server.once('connection', (socket) => {
            serverConnection = socket;
            resolve(socket);
          });
        });
      }

      function makeCommand(handler: ReturnType<typeof vi.fn>): ActionCommand {
        return Object.assign(handler, {
          factoryType: 'action' as const,
          actionName: 'Test Action'
        }) as unknown as ActionCommand;
      }

      it('should skip socket connection when SOCKET_PATH not set', async () => {
        // Ensure SOCKET_PATH is not set
        delete process.env[CARDS_ENV_VARS.SOCKET_PATH];

        const handler = vi.fn().mockResolvedValue(undefined);
        const command = makeCommand(handler);

        await execute(command);

        expect(handler).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
      });

      it('should continue when socket connection fails (fail-open)', async () => {
        // Point to non-existent socket
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = '/tmp/nonexistent-runtime-socket.sock';

        const handler = vi.fn().mockResolvedValue(undefined);
        const command = makeCommand(handler);

        await execute(command);

        // Should warn about connection failure
        expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to connect to socket'));

        // Should still execute handler and exit successfully
        expect(handler).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
      });

      it('should invoke onCancel callback on cancel command', async () => {
        await startServer();
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = socketPath;

        const cancelFn = vi.fn();
        const handler = vi
          .fn()
          .mockImplementation(async (_input: unknown, context: { onCancel: (cb: () => void) => void }) => {
            context.onCancel(cancelFn);
            // Wait to give socket time to dispatch the cancel
            await new Promise((resolve) => setTimeout(resolve, 200));
          });
        const command = makeCommand(handler);

        const executePromise = execute(command);

        // Wait for handler to register callback and server to accept connection
        await new Promise((resolve) => setTimeout(resolve, 50));
        const conn = await waitForServerConnection();

        // Send cancel command
        conn.write('{"type":"cancel"}\n');

        await executePromise;

        expect(cancelFn).toHaveBeenCalledOnce();
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
      });

      it('should invoke onSwitchToInteractive callback and send response', async () => {
        await startServer();
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = socketPath;

        const switchCallback = vi.fn().mockReturnValue({ sessionId: 'abc123' });
        const handler = vi
          .fn()
          .mockImplementation(
            async (_input: unknown, context: { onSwitchToInteractive: (cb: () => unknown) => void }) => {
              context.onSwitchToInteractive(switchCallback);
              // Wait to give socket time to dispatch the command
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          );
        const command = makeCommand(handler);

        // Collect data received by server
        const serverReceived: string[] = [];

        const executePromise = execute(command);

        await new Promise((resolve) => setTimeout(resolve, 50));
        const conn = await waitForServerConnection();
        conn.on('data', (chunk) => serverReceived.push(chunk.toString()));

        // Send switchToInteractive command
        conn.write('{"type":"switchToInteractive"}\n');

        await executePromise;

        expect(switchCallback).toHaveBeenCalledOnce();

        // Verify response was sent on socket
        const combined = serverReceived.join('');
        const parsed = JSON.parse(combined.trim());
        expect(parsed).toEqual({
          type: 'switchToInteractiveResponse',
          data: { sessionId: 'abc123' }
        });

        // Should exit with SWITCH_TO_INTERACTIVE code
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SWITCH_TO_INTERACTIVE);
      });

      it('should ignore second command (first-wins semantics)', async () => {
        await startServer();
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = socketPath;

        const cancelFn = vi.fn();
        const switchFn = vi.fn().mockReturnValue({ data: 'test' });
        const handler = vi
          .fn()
          .mockImplementation(
            async (
              _input: unknown,
              context: { onCancel: (cb: () => void) => void; onSwitchToInteractive: (cb: () => unknown) => void }
            ) => {
              context.onCancel(cancelFn);
              context.onSwitchToInteractive(switchFn);
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          );
        const command = makeCommand(handler);

        const executePromise = execute(command);

        await new Promise((resolve) => setTimeout(resolve, 50));
        const conn = await waitForServerConnection();

        // Send cancel first, then switchToInteractive
        conn.write('{"type":"cancel"}\n{"type":"switchToInteractive"}\n');

        await executePromise;

        // Only the first command (cancel) should be processed
        expect(cancelFn).toHaveBeenCalledOnce();
        expect(switchFn).not.toHaveBeenCalled();
      });

      it('should ignore switchToInteractive when no callback registered', async () => {
        await startServer();
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = socketPath;

        const handler = vi.fn().mockImplementation(async () => {
          // Do NOT register onSwitchToInteractive callback
          await new Promise((resolve) => setTimeout(resolve, 200));
        });
        const command = makeCommand(handler);

        const executePromise = execute(command);

        await new Promise((resolve) => setTimeout(resolve, 50));
        const conn = await waitForServerConnection();

        // Send switchToInteractive - should be no-op
        conn.write('{"type":"switchToInteractive"}\n');

        // Wait for the handler to complete naturally
        await executePromise;

        // Should exit successfully (command was ignored, handler completed)
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
      });

      it('should complete normally when no socket commands received', async () => {
        await startServer();
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = socketPath;

        const handler = vi.fn().mockResolvedValue(undefined);
        const command = makeCommand(handler);

        await execute(command);

        expect(handler).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
      });

      it('should handle cancel with no callback by sending SIGTERM', async () => {
        await startServer();
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = socketPath;

        const handler = vi.fn().mockImplementation(async () => {
          // Do NOT register onCancel callback
          await new Promise((resolve) => setTimeout(resolve, 200));
        });
        const command = makeCommand(handler);

        const executePromise = execute(command);

        await new Promise((resolve) => setTimeout(resolve, 50));
        const conn = await waitForServerConnection();

        // Send cancel command without registering a callback
        conn.write('{"type":"cancel"}\n');

        await executePromise;

        // Should send SIGTERM to self
        expect(killSpy).toHaveBeenCalledWith(process.pid, 'SIGTERM');
      });

      it('should handle async onSwitchToInteractive callback', async () => {
        await startServer();
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = socketPath;

        const switchCallback = vi.fn().mockResolvedValue({ asyncData: true });
        const handler = vi
          .fn()
          .mockImplementation(
            async (_input: unknown, context: { onSwitchToInteractive: (cb: () => Promise<unknown>) => void }) => {
              context.onSwitchToInteractive(switchCallback);
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          );
        const command = makeCommand(handler);

        const serverReceived: string[] = [];

        const executePromise = execute(command);

        await new Promise((resolve) => setTimeout(resolve, 50));
        const conn = await waitForServerConnection();
        conn.on('data', (chunk) => serverReceived.push(chunk.toString()));

        conn.write('{"type":"switchToInteractive"}\n');

        await executePromise;

        expect(switchCallback).toHaveBeenCalledOnce();

        const combined = serverReceived.join('');
        const parsed = JSON.parse(combined.trim());
        expect(parsed).toEqual({
          type: 'switchToInteractiveResponse',
          data: { asyncData: true }
        });

        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SWITCH_TO_INTERACTIVE);
      });

      it('should handle async onCancel callback', async () => {
        await startServer();
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = socketPath;

        const cancelFn = vi.fn().mockResolvedValue(undefined);
        const handler = vi
          .fn()
          .mockImplementation(async (_input: unknown, context: { onCancel: (cb: () => Promise<void>) => void }) => {
            context.onCancel(cancelFn);
            await new Promise((resolve) => setTimeout(resolve, 200));
          });
        const command = makeCommand(handler);

        const executePromise = execute(command);

        await new Promise((resolve) => setTimeout(resolve, 50));
        const conn = await waitForServerConnection();

        conn.write('{"type":"cancel"}\n');

        await executePromise;

        expect(cancelFn).toHaveBeenCalledOnce();
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
      });
    });
  });
});
