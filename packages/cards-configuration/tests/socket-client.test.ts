/**
 * Unit tests for SocketClient.
 */

import * as fs from 'node:fs';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SwitchToInteractiveResponse } from '../src/socket-client.js';
import { SocketClient } from '../src/socket-client.js';

describe('SocketClient', () => {
  let server: net.Server;
  let socketPath: string;
  let serverConnection: net.Socket | undefined;

  beforeEach(() => {
    // Create a unique socket path in the temp directory
    socketPath = path.join(os.tmpdir(), `test-socket-${process.pid}-${Date.now()}.sock`);
    serverConnection = undefined;
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
      // Ignore - file may not exist
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
      await expect(SocketClient.connect('/tmp/nonexistent-socket-path.sock')).rejects.toThrow();
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

      // Allow event loop to process the data
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(received).toEqual([{ type: 'cancel' }]);
      client.close();
    });

    it('should deliver multiple commands on same connection', async () => {
      await startServer();
      const client = await SocketClient.connect(socketPath);
      const conn = await waitForServerConnection();

      const received: unknown[] = [];
      client.onCommand((cmd) => received.push(cmd));

      conn.write('{"type":"cancel"}\n{"type":"switchToInteractive"}\n');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(received).toEqual([{ type: 'cancel' }, { type: 'switchToInteractive' }]);
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

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(received).toEqual([]);

      // Complete the line
      conn.write('cel"}\n');

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(received).toEqual([{ type: 'cancel' }]);
      client.close();
    });

    it('should ignore malformed JSON on socket', async () => {
      await startServer();
      const client = await SocketClient.connect(socketPath);
      const conn = await waitForServerConnection();

      const received: unknown[] = [];
      client.onCommand((cmd) => received.push(cmd));

      conn.write('not valid json\n{"type":"cancel"}\n');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should only receive the valid command
      expect(received).toEqual([{ type: 'cancel' }]);
      client.close();
    });

    it('should ignore empty lines', async () => {
      await startServer();
      const client = await SocketClient.connect(socketPath);
      const conn = await waitForServerConnection();

      const received: unknown[] = [];
      client.onCommand((cmd) => received.push(cmd));

      conn.write('\n\n{"type":"cancel"}\n\n');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(received).toEqual([{ type: 'cancel' }]);
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

      await new Promise((resolve) => setTimeout(resolve, 50));

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
      const _conn = await waitForServerConnection();

      const callbackFn = vi.fn();

      const response: SwitchToInteractiveResponse = {
        type: 'switchToInteractiveResponse',
        data: { sessionId: 'xyz' }
      };
      client.sendResponseThen(response, callbackFn);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(callbackFn).toHaveBeenCalledOnce();
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

      // Allow time for data to arrive at the server side
      await new Promise((resolve) => setTimeout(resolve, 50));

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
      // Wait a bit to allow close to propagate
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });
});
