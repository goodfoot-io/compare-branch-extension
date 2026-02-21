/**
 * Test utility for IPC communication testing with real Unix sockets.
 *
 * Why: IPC code is sensitive to framing and authentication, so tests benefit
 * from using a real socket instead of mocks.
 *
 * Behavior: exposes a Unix socket server that accepts NDJSON messages and
 * filters them by a nonce.
 *
 * Constraint: Unix socket paths are created in the OS temp directory and must
 * be cleaned up with `stop()`.
 *
 *
 * @summary Test utility for IPC communication testing with real Unix sockets
 * @module test-utils/ipc/TestIpcServer
 */
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IpcMessage } from '@cards/sdk/protocol';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test IPC server for integration testing.
 *
 * Why: validate NDJSON framing and nonce authentication end-to-end.
 *
 * Behavior:
 * - Accepts newline-delimited JSON messages.
 * - Filters messages by `nonce` and requires a string `type` field.
 * - Stores messages in arrival order for inspection.
 *
 * Constraint: `awaitMessage()` only resolves for messages that arrive after
 * it is called; use `getReceivedMessages()` to inspect earlier traffic.
 *
 * @example
 * ```typescript
 * const server = new TestIpcServer();
 * const socketPath = await server.start();
 *
 * // Connect client and send messages...
 *
 * const message = await server.awaitMessage();
 * console.log(message.type);
 *
 * await server.stop();
 * ```
 */
export class TestIpcServer {
  private server: net.Server | null = null;
  private socketPath: string | null = null;
  private nonce: string;
  private messages: IpcMessage[] = [];
  private pendingResolvers: Array<(msg: IpcMessage) => void> = [];
  private connections: net.Socket[] = [];
  private buffer: string = '';

  constructor() {
    this.nonce = uuidv4();
  }

  /**
   * Starts the IPC server and returns the socket path.
   *
   * Behavior: creates a UUID-based socket file in the system temp directory
   * and listens for connections.
   *
   * @returns The socket path for clients to connect to
   */
  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      const tempDir = os.tmpdir();
      this.socketPath = path.join(tempDir, `test-ipc-${uuidv4()}.sock`);
      this.server = net.createServer((socket: net.Socket) => {
        this.connections.push(socket);
        this.handleConnection(socket);
      });

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && this.socketPath) {
          // Retry with a new UUID
          this.socketPath = path.join(tempDir, `test-ipc-${uuidv4()}.sock`);
          this.server?.listen(this.socketPath);
        } else {
          reject(err);
        }
      });

      this.server.listen(this.socketPath, () => {
        resolve(this.socketPath!);
      });
    });
  }

  /**
   * Gets the nonce used for authentication.
   *
   * @returns The nonce string
   */
  getNonce(): string {
    return this.nonce;
  }

  /**
   * Gets the socket path.
   *
   * @returns The socket path or null if not started
   */
  getSocketPath(): string | null {
    return this.socketPath;
  }

  /**
   * Gets all messages received by the server.
   *
   * Behavior: returns a copy so callers can mutate without affecting internal
   * state.
   *
   * @returns Array of parsed IPC messages
   */
  getReceivedMessages(): IpcMessage[] {
    return [...this.messages];
  }

  /**
   * Clears all received messages.
   */
  clearReceivedMessages(): void {
    this.messages = [];
  }

  /**
   * Waits for the next message to arrive.
   *
   * Behavior: resolves with the next message that passes nonce/type validation.
   *
   * @param timeout - Maximum time to wait in ms (default 5000)
   * @returns The next received message
   * @throws Error if timeout exceeded
   */
  awaitMessage(timeout: number = 5000): Promise<IpcMessage> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.pendingResolvers.indexOf(wrappedResolve);
        if (index !== -1) {
          this.pendingResolvers.splice(index, 1);
        }
        reject(new Error(`Timeout waiting for IPC message after ${timeout}ms`));
      }, timeout);

      const wrappedResolve = (msg: IpcMessage) => {
        clearTimeout(timeoutId);
        resolve(msg);
      };

      this.pendingResolvers.push(wrappedResolve);
    });
  }

  /**
   * Gets the number of connected clients.
   *
   * @returns Number of connected clients
   */
  getConnectionCount(): number {
    return this.connections.length;
  }

  /**
   * Stops the server and cleans up resources.
   *
   * Behavior: destroys connections, closes the server, removes the socket file,
   * and clears all in-memory state.
   */
  async stop(): Promise<void> {
    // Close all active connections
    for (const connection of this.connections) {
      connection.destroy();
    }
    this.connections = [];

    // Close the server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          resolve();
        });
      });
      this.server = null;
    }

    // Clean up socket file
    if (this.socketPath && fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }
    this.socketPath = null;

    // Clear state
    this.messages = [];
    this.pendingResolvers = [];
    this.buffer = '';
  }

  /**
   * Handles incoming data from a connection.
   *
   * Behavior: buffers data until newline boundaries, then parses each line as
   * JSON before applying nonce validation.
   *
   * @param socket Active client socket whose events should be tracked
   */
  private handleConnection(socket: net.Socket): void {
    socket.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    socket.on('close', () => {
      const index = this.connections.indexOf(socket);
      if (index !== -1) {
        this.connections.splice(index, 1);
      }
    });

    socket.on('error', () => {
      // Connection errors are expected during cleanup
      const index = this.connections.indexOf(socket);
      if (index !== -1) {
        this.connections.splice(index, 1);
      }
    });
  }

  /**
   * Processes the buffer for complete NDJSON lines.
   *
   * Constraint: invalid JSON, missing `type`, or nonce mismatches are silently
   * ignored to match real IPC behavior.
   */
  private processBuffer(): void {
    const lines = this.buffer.split('\n');

    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.trim() === '') {
        continue;
      }

      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;

        // Validate nonce
        if (parsed['nonce'] !== this.nonce) {
          // Invalid nonce - ignore message
          continue;
        }

        // Validate it's a valid IpcMessage
        if (typeof parsed['type'] !== 'string') {
          continue;
        }

        const message = parsed as unknown as IpcMessage;
        this.messages.push(message);

        // Resolve any pending awaitMessage calls
        const resolver = this.pendingResolvers.shift();
        if (resolver) {
          resolver(message);
        }
      } catch {
        // Invalid JSON - ignore line
      }
    }
  }
}
