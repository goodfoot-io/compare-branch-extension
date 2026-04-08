/**
 * Unit tests for runtime execution orchestration.
 *
 * @summary Unit tests for runtime execution orchestration
 */

import * as fs from 'node:fs';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionCommand, CardsAssistantCommand } from '../../src/config/command-types.js';
import { CARDS_ENV_VARS } from '../../src/config/env.js';
import { EXIT_CODES } from '../../src/config/exit-codes.js';
import { logger } from '../../src/config/logger.js';
import { executeCommand } from '../../src/config/runtime.js';

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
    process.env[CARDS_ENV_VARS.WORKSPACE_PATH] = '/workspace';
    process.env[CARDS_ENV_VARS.REPO_ROOT] = '/workspace';
    process.env[CARDS_ENV_VARS.CARD_REPO_PATH] = '/workspace/cards';
    process.env[CARDS_ENV_VARS.CONFIG_PATH] = '/workspace/.cards/config';
    process.env[CARDS_ENV_VARS.EXTENSION_PATH] = '/extension/path';
    process.env[CARDS_ENV_VARS.MARKETPLACE_PATH] = '/test/marketplace';
  });

  afterEach(() => {
    // Restore original state
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    process.chdir(originalCwd);
  });

  describe('executeCommand', () => {
    describe('action commands', () => {
      it('should execute action command with extracted input', async () => {
        const handler = vi.fn().mockResolvedValue(undefined);
        const command: ActionCommand = Object.assign(handler, {
          factoryType: 'action' as const,
          actionName: 'Test Action'
        });

        await executeCommand(command);

        // Should extract action input
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            cardId: 'card-123',
            environment: 'default',
            executionMode: 'interactive'
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

        await executeCommand(command);

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

        await executeCommand(command);

        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            codingAgent: 'claude'
          }),
          expect.any(Object)
        );
      });
    });

    describe('cards-assistant commands', () => {
      function makeCardsAssistantCommand(handler: ReturnType<typeof vi.fn>): CardsAssistantCommand {
        return Object.assign(handler, {
          factoryType: 'cards-assistant' as const
        }) as unknown as CardsAssistantCommand;
      }

      it('should execute cards-assistant command without action env vars', async () => {
        // Remove action-specific env vars that would cause extractActionInput to throw
        delete process.env[CARDS_ENV_VARS.CARD_ID];
        delete process.env[CARDS_ENV_VARS.ACTION_NAME];
        delete process.env[CARDS_ENV_VARS.ENVIRONMENT];
        delete process.env[CARDS_ENV_VARS.EXECUTION_MODE];

        const handler = vi.fn().mockResolvedValue(undefined);
        const command = makeCardsAssistantCommand(handler);

        await executeCommand(command);

        // Should call handler with cards-assistant input (no cardId, no actionName)
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            marketplacePath: '/test/marketplace',
            extensionPath: '/extension/path',
            repoRoot: '/workspace'
          }),
          expect.objectContaining({
            logger: expect.any(Object),
            cwd: expect.any(String)
          })
        );

        // Context should NOT have onCancel or onSwitchToInteractive
        const context = handler.mock.calls[0]![1] as Record<string, unknown>;
        expect(context['onCancel']).toBeUndefined();
        expect(context['onSwitchToInteractive']).toBeUndefined();

        // Should set logger context with cards-assistant type
        expect(loggerSetContextSpy).toHaveBeenCalledWith('cards-assistant', {});

        // Should exit successfully
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
      });

      it('should handle handler errors in cards-assistant', async () => {
        delete process.env[CARDS_ENV_VARS.CARD_ID];
        delete process.env[CARDS_ENV_VARS.ACTION_NAME];
        delete process.env[CARDS_ENV_VARS.ENVIRONMENT];
        delete process.env[CARDS_ENV_VARS.EXECUTION_MODE];

        const error = new Error('Assistant handler failed');
        const handler = vi.fn().mockRejectedValue(error);
        const command = makeCardsAssistantCommand(handler);

        await executeCommand(command);

        // Should write error to stderr
        expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Assistant handler failed'));

        // Should exit with error
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
      });

      it('should handle missing env vars for cards-assistant', async () => {
        // Remove all env vars including those needed by cards-assistant
        delete process.env[CARDS_ENV_VARS.CARD_ID];
        delete process.env[CARDS_ENV_VARS.ACTION_NAME];
        delete process.env[CARDS_ENV_VARS.ENVIRONMENT];
        delete process.env[CARDS_ENV_VARS.EXECUTION_MODE];
        delete process.env[CARDS_ENV_VARS.MARKETPLACE_PATH];

        const handler = vi.fn().mockResolvedValue(undefined);
        const command = makeCardsAssistantCommand(handler);

        await executeCommand(command);

        // Should not call handler
        expect(handler).not.toHaveBeenCalled();

        // Should log extraction error
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to extract input from environment')
        );

        // Should exit with error
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

        await executeCommand(command);

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

        await executeCommand(command);

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

        await executeCommand(command);

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

        await executeCommand(command);

        expect(handler).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            cwd: process.cwd()
          })
        );
      });
    });

    // Note: Log file configuration is handled by the compiled wrapper preamble
    // which sets process.env.CARDS_HOOKS_LOG_FILE before any Logger is constructed.
    // See compiler.test.ts for tests covering log file embedding.

    describe('non-Error throw values', () => {
      it('should handle string throws', async () => {
        const handler = vi.fn().mockRejectedValue('String error');
        const command: ActionCommand = Object.assign(handler, {
          factoryType: 'action' as const,
          actionName: 'Test Action'
        });

        await executeCommand(command);

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

        await executeCommand(command);

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
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
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

        await executeCommand(command);

        expect(handler).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
      });

      it('should continue when socket connection fails (fail-open)', async () => {
        // Point to non-existent socket
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = '/tmp/nonexistent-runtime-socket.sock';

        const handler = vi.fn().mockResolvedValue(undefined);
        const command = makeCommand(handler);

        await executeCommand(command);

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
        let resolveHandler!: () => void;
        const handlerDone = new Promise<void>((resolve) => {
          resolveHandler = resolve;
        });
        const handler = vi
          .fn()
          .mockImplementation(async (_input: unknown, context: { onCancel: (cb: () => void) => void }) => {
            context.onCancel(cancelFn);
            await handlerDone;
          });
        const command = makeCommand(handler);

        const executePromise = executeCommand(command);

        const conn = await waitForServerConnection();

        // Send cancel command
        conn.write('{"type":"cancel"}\n');

        // Wait for cancel to be dispatched, then let handler complete
        await vi.waitFor(() => {
          expect(cancelFn).toHaveBeenCalledOnce();
        });
        resolveHandler();

        await executePromise;

        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
      });

      it('should invoke onSwitchToInteractive callback and send response', async () => {
        await startServer();
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = socketPath;

        const switchCallback = vi.fn().mockReturnValue({ sessionId: 'abc123' });
        let resolveHandler!: () => void;
        const handlerDone = new Promise<void>((resolve) => {
          resolveHandler = resolve;
        });
        const handler = vi
          .fn()
          .mockImplementation(
            async (_input: unknown, context: { onSwitchToInteractive: (cb: () => unknown) => void }) => {
              context.onSwitchToInteractive(switchCallback);
              await handlerDone;
            }
          );
        const command = makeCommand(handler);

        // Collect data received by server
        const serverReceived: string[] = [];

        const executePromise = executeCommand(command);

        const conn = await waitForServerConnection();
        conn.on('data', (chunk) => serverReceived.push(chunk.toString()));

        // Send switchToInteractive command
        conn.write('{"type":"switchToInteractive"}\n');

        // Wait for callback to be invoked, then let handler complete
        await vi.waitFor(() => {
          expect(switchCallback).toHaveBeenCalledOnce();
        });
        resolveHandler();

        await executePromise;

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
        let resolveHandler!: () => void;
        const handlerDone = new Promise<void>((resolve) => {
          resolveHandler = resolve;
        });
        const handler = vi
          .fn()
          .mockImplementation(
            async (
              _input: unknown,
              context: { onCancel: (cb: () => void) => void; onSwitchToInteractive: (cb: () => unknown) => void }
            ) => {
              context.onCancel(cancelFn);
              context.onSwitchToInteractive(switchFn);
              await handlerDone;
            }
          );
        const command = makeCommand(handler);

        const executePromise = executeCommand(command);

        const conn = await waitForServerConnection();

        // Send cancel first, then switchToInteractive
        conn.write('{"type":"cancel"}\n{"type":"switchToInteractive"}\n');

        // Wait for cancel to be dispatched, then let handler complete
        await vi.waitFor(() => {
          expect(cancelFn).toHaveBeenCalledOnce();
        });
        resolveHandler();

        await executePromise;

        // Only the first command (cancel) should be processed
        expect(switchFn).not.toHaveBeenCalled();
      });

      it('should ignore switchToInteractive when no callback registered', async () => {
        await startServer();
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = socketPath;

        let resolveHandler!: () => void;
        const handlerDone = new Promise<void>((resolve) => {
          resolveHandler = resolve;
        });
        const handler = vi.fn().mockImplementation(async () => {
          // Do NOT register onSwitchToInteractive callback
          await handlerDone;
        });
        const command = makeCommand(handler);

        const executePromise = executeCommand(command);

        const conn = await waitForServerConnection();

        // Send switchToInteractive - should be no-op
        conn.write('{"type":"switchToInteractive"}\n');

        // Allow event loop to process the command, then complete the handler
        await vi.waitFor(() => {
          expect(handler).toHaveBeenCalled();
        });
        resolveHandler();

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

        await executeCommand(command);

        expect(handler).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.SUCCESS);
      });

      it('should handle cancel with no callback by sending SIGTERM', async () => {
        await startServer();
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = socketPath;

        let resolveHandler!: () => void;
        const handlerDone = new Promise<void>((resolve) => {
          resolveHandler = resolve;
        });
        const handler = vi.fn().mockImplementation(async () => {
          // Do NOT register onCancel callback
          await handlerDone;
        });
        const command = makeCommand(handler);

        const executePromise = executeCommand(command);

        const conn = await waitForServerConnection();

        // Send cancel command without registering a callback
        conn.write('{"type":"cancel"}\n');

        // Wait for SIGTERM to be sent, then complete the handler
        await vi.waitFor(() => {
          expect(killSpy).toHaveBeenCalledWith(process.pid, 'SIGTERM');
        });
        resolveHandler();

        await executePromise;
      });

      it('should handle async onSwitchToInteractive callback', async () => {
        await startServer();
        process.env[CARDS_ENV_VARS.SOCKET_PATH] = socketPath;

        const switchCallback = vi.fn().mockResolvedValue({ asyncData: true });
        let resolveHandler!: () => void;
        const handlerDone = new Promise<void>((resolve) => {
          resolveHandler = resolve;
        });
        const handler = vi
          .fn()
          .mockImplementation(
            async (_input: unknown, context: { onSwitchToInteractive: (cb: () => Promise<unknown>) => void }) => {
              context.onSwitchToInteractive(switchCallback);
              await handlerDone;
            }
          );
        const command = makeCommand(handler);

        const serverReceived: string[] = [];

        const executePromise = executeCommand(command);

        const conn = await waitForServerConnection();
        conn.on('data', (chunk) => serverReceived.push(chunk.toString()));

        conn.write('{"type":"switchToInteractive"}\n');

        // Wait for callback to be invoked, then let handler complete
        await vi.waitFor(() => {
          expect(switchCallback).toHaveBeenCalledOnce();
        });
        resolveHandler();

        await executePromise;

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
        let resolveHandler!: () => void;
        const handlerDone = new Promise<void>((resolve) => {
          resolveHandler = resolve;
        });
        const handler = vi
          .fn()
          .mockImplementation(async (_input: unknown, context: { onCancel: (cb: () => Promise<void>) => void }) => {
            context.onCancel(cancelFn);
            await handlerDone;
          });
        const command = makeCommand(handler);

        const executePromise = executeCommand(command);

        const conn = await waitForServerConnection();

        conn.write('{"type":"cancel"}\n');

        // Wait for cancel to be dispatched, then let handler complete
        await vi.waitFor(() => {
          expect(cancelFn).toHaveBeenCalledOnce();
        });
        resolveHandler();

        await executePromise;

        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ERROR);
      });
    });
  });
});
