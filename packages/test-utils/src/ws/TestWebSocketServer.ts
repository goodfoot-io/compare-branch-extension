/**
 * Test utility for WebSocket server testing.
 *
 * Why: WebSocket flows are timing- and protocol-sensitive, so integration
 * tests need a real server rather than a stub.
 *
 * Behavior: spins up an HTTP server with `ws` to model real connections,
 * message framing, and close codes.
 *
 * Constraint: uses actual network sockets; ensure `stop()` is called to avoid
 * port leaks across tests.
 *
 *
 * @summary Test utility for WebSocket server testing
 * @module test-utils/ws/TestWebSocketServer
 */

import type { IncomingMessage } from 'node:http';
import * as http from 'node:http';
import * as net from 'node:net';
import type { RawData, WebSocket as WsWebSocketType } from 'ws';
import { WebSocket, WebSocketServer } from 'ws';

/**
 * Options for starting the WebSocket server.
 */
export interface StartOptions {
  /** Optional port to use (default: random available port). */
  port?: number;
  /**
   * Optional authentication token to validate.
   * When set, clients must provide `?token=<value>` in the URL.
   */
  authToken?: string;
}

/**
 * Test WebSocket server for integration testing.
 *
 * Why: validate event subscription and reconnection logic against a real
 * WebSocket implementation.
 *
 * Behavior:
 * - Accepts connections on a random or specified port.
 * - Optionally enforces a query-string auth token.
 * - Records incoming messages for later inspection.
 *
 * Constraint: messages are captured as parsed JSON when possible, otherwise
 * stored as raw strings.
 *
 * @example
 * ```typescript
 * const server = new TestWebSocketServer();
 * const port = await server.start();
 *
 * // Connect a client
 * const client = new WebSocket(`ws://localhost:${port}`);
 *
 * // Broadcast messages
 * await server.broadcast({ type: 'test', data: {} });
 *
 * // Get connected clients
 * const clients = server.getClients();
 *
 * await server.stop();
 * ```
 */
export class TestWebSocketServer {
  private httpServer: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private port: number | null = null;
  private authToken: string | null = null;
  private receivedMessages: Array<{ client: WsWebSocketType; data: unknown }> = [];

  /**
   * Starts the WebSocket server.
   *
   * Behavior: creates a new HTTP server and attaches a WebSocketServer to it.
   *
   * @param options Optional configuration
   * @returns The port number the server is listening on
   */
  async start(options: StartOptions = {}): Promise<number> {
    return new Promise((resolve, reject) => {
      this.authToken = options.authToken ?? null;

      this.httpServer = http.createServer();
      this.wss = new WebSocketServer({ server: this.httpServer });

      this.wss.on('connection', (ws: WsWebSocketType, req: IncomingMessage) => {
        // Validate auth token if required
        if (this.authToken) {
          const url = new URL(req.url ?? '', `http://localhost`);
          const token = url.searchParams.get('token');
          if (token !== this.authToken) {
            ws.close(4001, 'Unauthorized');
            return;
          }
        }

        ws.on('message', (data: RawData) => {
          try {
            const parsed = JSON.parse(data.toString()) as unknown;
            this.receivedMessages.push({ client: ws, data: parsed });
          } catch {
            this.receivedMessages.push({ client: ws, data: data.toString() });
          }
        });

        ws.on('error', () => {
          // Connection errors are expected during cleanup
        });
      });

      this.wss.on('error', (err: Error) => {
        reject(err);
      });

      const requestedPort = options.port ?? 0; // 0 means random available port
      this.httpServer.listen(requestedPort, () => {
        const address = this.httpServer?.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
          resolve(this.port);
        } else {
          reject(new Error('Failed to get server address'));
        }
      });

      this.httpServer.on('error', (err: Error) => {
        reject(err);
      });
    });
  }

  /**
   * Gets the port the server is listening on.
   *
   * @returns The port number
   * @throws If server not started
   */
  getPort(): number {
    if (this.port === null) {
      throw new Error('Server not started');
    }
    return this.port;
  }

  /**
   * Gets the WebSocket URL for connecting to the server.
   *
   * Behavior: appends `?token=` when requested and an auth token is configured.
   *
   * @param includeAuthToken Set to `true` to append the configured token as a query param
   * @returns `ws://localhost:<port>` with optional `?token=<encoded>` query suffix
   */
  getUrl(includeAuthToken = false): string {
    const port = this.getPort();
    let url = `ws://localhost:${port}`;
    if (includeAuthToken && this.authToken) {
      url += `?token=${encodeURIComponent(this.authToken)}`;
    }
    return url;
  }

  /**
   * Gets all connected clients.
   *
   * @returns Set of connected WebSocket clients
   */
  getClients(): Set<WsWebSocketType> {
    if (!this.wss) {
      return new Set();
    }
    return this.wss.clients;
  }

  /**
   * Gets the number of connected clients.
   *
   * @returns Number of connected clients
   */
  getClientCount(): number {
    return this.getClients().size;
  }

  /**
   * Gets all received messages from clients.
   *
   * Behavior: returns a shallow copy so callers can mutate safely.
   *
   * @returns Array of received messages with their client
   */
  getReceivedMessages(): Array<{ client: WsWebSocketType; data: unknown }> {
    return [...this.receivedMessages];
  }

  /**
   * Clears all received messages.
   */
  clearReceivedMessages(): void {
    this.receivedMessages = [];
  }

  /**
   * Broadcasts a message to all connected clients.
   *
   * Behavior: JSON stringifies the message before sending.
   *
   * @param message Serializable payload delivered to each currently open client
   * @throws If the server has not been started
   */
  broadcast(message: unknown): void {
    if (!this.wss) {
      throw new Error('Server not started');
    }

    const data = JSON.stringify(message);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  /**
   * Sends a message to a specific client.
   *
   * Behavior: sends only if the client is in OPEN state.
   *
   * @param client Connection instance returned by `getClients()` or `awaitConnection()`
   * @param message Serializable payload sent when the client socket is open
   */
  sendTo(client: WsWebSocketType, message: unknown): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  /**
   * Simulates a server-sent event by broadcasting a typed event payload.
   *
   * @param eventType Discriminator written into the outbound event object's `type` field
   * @param payload Event fields merged into the outbound object alongside `type`
   */
  simulateEvent<T extends { type: string }>(eventType: T['type'], payload: Omit<T, 'type'>): void {
    this.broadcast({ type: eventType, ...payload });
  }

  /**
   * Waits for a client to connect.
   *
   * @param timeout Maximum time to wait in ms (default 5000)
   * @returns The connected client
   * @throws If timeout exceeded
   */
  awaitConnection(timeout = 5000): Promise<WsWebSocketType> {
    return new Promise((resolve, reject) => {
      if (!this.wss) {
        reject(new Error('Server not started'));
        return;
      }

      const wss = this.wss;
      const timeoutId = setTimeout(() => {
        wss.off('connection', onConnection);
        reject(new Error(`Timeout waiting for connection after ${timeout}ms`));
      }, timeout);

      const onConnection = (ws: WsWebSocketType) => {
        clearTimeout(timeoutId);
        resolve(ws);
      };

      wss.once('connection', onConnection);
    });
  }

  /**
   * Waits for a message from any client.
   *
   * Behavior: resolves with the earliest buffered message and removes it from
   * the internal queue.
   *
   * @param timeout Maximum time to wait in ms (default 5000)
   * @returns The received message data
   * @throws If timeout exceeded
   */
  awaitMessage(timeout = 5000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.wss) {
        reject(new Error('Server not started'));
        return;
      }

      const clients = Array.from(this.wss.clients);

      const timeoutId = setTimeout(() => {
        clearInterval(checkMessages);
        cleanup();
        reject(new Error(`Timeout waiting for message after ${timeout}ms`));
      }, timeout);

      const checkMessages = setInterval(() => {
        if (this.receivedMessages.length > 0) {
          clearInterval(checkMessages);
          clearTimeout(timeoutId);
          cleanup();
          const message = this.receivedMessages.shift();
          resolve(message?.data);
        }
      }, 10);

      const onMessage = () => {
        if (this.receivedMessages.length > 0) {
          clearInterval(checkMessages);
          clearTimeout(timeoutId);
          cleanup();
          const message = this.receivedMessages.shift();
          resolve(message?.data);
        }
      };

      for (const client of clients) {
        client.once('message', onMessage);
      }

      function cleanup(): void {
        for (const client of clients) {
          client.off('message', onMessage);
        }
      }
    });
  }

  /**
   * Stops the server and cleans up resources.
   *
   * Behavior: terminates client sockets, closes the WebSocket and HTTP servers,
   * and clears internal state.
   */
  async stop(): Promise<void> {
    // Close all client connections
    if (this.wss) {
      for (const client of this.wss.clients) {
        client.terminate();
      }

      await new Promise<void>((resolve) => {
        this.wss!.close(() => {
          resolve();
        });
      });
      this.wss = null;
    }

    // Close the HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => {
          resolve();
        });
      });
      this.httpServer = null;
    }

    this.port = null;
    this.authToken = null;
    this.receivedMessages = [];
  }
}

// Re-export the WebSocket type for consumers
export type { WsWebSocketType as WsWebSocket };

/**
 * Helper function to get a random available port.
 *
 * Behavior: creates a temporary server, reads the assigned port, then closes
 * the server before returning.
 *
 * Constraint: the port is only guaranteed to be free at the time it is
 * returned; other processes may claim it immediately after.
 *
 * @returns A random available port
 */
export async function getRandomPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        server.close(() => {
          resolve(port);
        });
      } else {
        server.close();
        reject(new Error('Failed to get port'));
      }
    });
    server.on('error', reject);
  });
}
