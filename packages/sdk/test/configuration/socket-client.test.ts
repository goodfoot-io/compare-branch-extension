/**
 * Unit tests for SocketClient.
 *
 * @summary Unit tests for SocketClient
 */

import * as fs from 'node:fs';
import * as net from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createIpcEndpoint, createNonexistentIpcEndpoint } from '../../src/config/ipc-endpoint.js';
import type { SwitchToInteractiveResponse } from '../../src/config/socket-client.js';
import { SocketClient } from '../../src/config/socket-client.js';

describe('SocketClient', () => {
  let server: net.Server;
  let socketPath: string;
  let serverConnection: net.Socket | undefined;

  beforeEach(() => {
    // Platform-correct IPC endpoint: Unix socket path on POSIX, named pipe on
    // Windows. Routed through the single portability layer.
    socketPath = createIpcEndpoint(`test-socket-${process.pid}-${Date.now()}`);
    serverConnection = undefined;
  });

  afterEach(async () => {
    serverConnection?.destroy();
    if (server?.listening) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    // Unix domain sockets are filesystem entries that need cleanup; Windows
    // named pipes are not and are removed by the OS when unreferenced.
    if (process.platform !== 'win32') {
      try {
        fs.unlinkSync(socketPath);
      } catch {
        // Ignore - file may not exist
      }
    }
  });

  /**
   * Helper to start a mock server and wait for it to be listening.
   */
  function startServer(): Promise<void> {
    return new Promise((resolve) => {
      server = net.createServer((socket) => {
        serverConnection = socket;
      });
      server.listen(socketPath, () => resolve());
    });
  }

  /**
   * Helper to wait for the server to accept a connection.
   *
   * @returns Promise resolving with the accepted server-side socket connection.
   */
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

  describe('static connect()', () => {
    it('should connect to a Unix socket', async () => {
      await startServer();
      const client = await SocketClient.connect(socketPath);
      expect(client).toBeInstanceOf(SocketClient);
      client.close();
    });

    it('should reject when socket path does not exist', async () => {
      await expect(
        SocketClient.connect(createNonexistentIpcEndpoint(`nonexistent-socket-${process.pid}-${Date.now()}`))
      ).rejects.toThrow();
    });
  });

  describe('onCommand()', () => {
    it('should receive parsed NDJSON commands', async () => {
      await startServer();
      const client = await SocketClient.connect(socketPath);
      const conn = await waitForServerConnection();

      const received: unknown[] = [];
      client.onCommand((cmd) => received.push(cmd));

      conn.write('{"type":"cancel"}\n');

      await vi.waitFor(() => {
        expect(received).toEqual([{ type: 'cancel' }]);
      });
      client.close();
    });

    it('should deliver multiple commands on same connection', async () => {
      await startServer();
      const client = await SocketClient.connect(socketPath);
      const conn = await waitForServerConnection();

      const received: unknown[] = [];
      client.onCommand((cmd) => received.push(cmd));

      conn.write('{"type":"cancel"}\n{"type":"switchToInteractive"}\n');

      await vi.waitFor(() => {
        expect(received).toEqual([{ type: 'cancel' }, { type: 'switchToInteractive' }]);
      });
      client.close();
    });

    it('should buffer partial lines until newline received', async () => {
      await startServer();
      const client = await SocketClient.connect(socketPath);
      const conn = await waitForServerConnection();

      const received: unknown[] = [];
      client.onCommand((cmd) => received.push(cmd));

      // Send partial data
      conn.write('{"type":"can');

      // Partial line should not produce a command yet — allow one event-loop tick
      await Promise.resolve();
      expect(received).toEqual([]);

      // Complete the line
      conn.write('cel"}\n');

      await vi.waitFor(() => {
        expect(received).toEqual([{ type: 'cancel' }]);
      });
      client.close();
    });

    it('should ignore malformed JSON on socket', async () => {
      await startServer();
      const client = await SocketClient.connect(socketPath);
      const conn = await waitForServerConnection();

      const received: unknown[] = [];
      client.onCommand((cmd) => received.push(cmd));

      conn.write('not valid json\n{"type":"cancel"}\n');

      // Should only receive the valid command
      await vi.waitFor(() => {
        expect(received).toEqual([{ type: 'cancel' }]);
      });
      client.close();
    });

    it('should ignore empty lines', async () => {
      await startServer();
      const client = await SocketClient.connect(socketPath);
      const conn = await waitForServerConnection();

      const received: unknown[] = [];
      client.onCommand((cmd) => received.push(cmd));

      conn.write('\n\n{"type":"cancel"}\n\n');

      await vi.waitFor(() => {
        expect(received).toEqual([{ type: 'cancel' }]);
      });
      client.close();
    });
  });

  describe('sendResponse()', () => {
    it('should send NDJSON response to server', async () => {
      await startServer();
      const client = await SocketClient.connect(socketPath);
      const conn = await waitForServerConnection();

      const serverReceived: string[] = [];
      conn.on('data', (chunk) => serverReceived.push(chunk.toString()));

      const response: SwitchToInteractiveResponse = {
        type: 'switchToInteractiveResponse',
        data: { sessionId: 'abc123' }
      };
      client.sendResponse(response);

      await vi.waitFor(() => {
        expect(serverReceived.join('')).toContain('switchToInteractiveResponse');
      });

      const combined = serverReceived.join('');
      const parsed = JSON.parse(combined.trim());
      expect(parsed).toEqual({
        type: 'switchToInteractiveResponse',
        data: { sessionId: 'abc123' }
      });
      client.close();
    });
  });

  describe('sendResponseThen()', () => {
    it('should call callback after flush', async () => {
      await startServer();
      const client = await SocketClient.connect(socketPath);
      await waitForServerConnection();

      const callbackFn = vi.fn();

      const response: SwitchToInteractiveResponse = {
        type: 'switchToInteractiveResponse',
        data: { sessionId: 'xyz' }
      };
      client.sendResponseThen(response, callbackFn);

      await vi.waitFor(() => {
        expect(callbackFn).toHaveBeenCalledOnce();
      });
      client.close();
    });

    it('should send NDJSON data before calling callback', async () => {
      await startServer();
      const client = await SocketClient.connect(socketPath);
      const conn = await waitForServerConnection();

      const serverReceived: string[] = [];
      conn.on('data', (chunk) => serverReceived.push(chunk.toString()));

      const response: SwitchToInteractiveResponse = {
        type: 'switchToInteractiveResponse',
        data: { key: 'value' }
      };

      await new Promise<void>((resolve) => {
        client.sendResponseThen(response, () => {
          resolve();
        });
      });

      await vi.waitFor(() => {
        expect(serverReceived.join('')).toContain('switchToInteractiveResponse');
      });

      const combined = serverReceived.join('');
      const parsed = JSON.parse(combined.trim());
      expect(parsed).toEqual({
        type: 'switchToInteractiveResponse',
        data: { key: 'value' }
      });
      client.close();
    });
  });

  describe('close()', () => {
    it('should destroy the socket', async () => {
      await startServer();
      const client = await SocketClient.connect(socketPath);

      client.close();

      // Sending data after close should not throw, but the connection is dead
      // Allow one event-loop tick for close to propagate
      await Promise.resolve();
    });
  });
});
