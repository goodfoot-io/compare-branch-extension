/**
 * Socket client for runtime-to-dispatcher communication.
 *
 * Connects to a Unix domain socket created by ActionDispatcher and handles
 * NDJSON (newline-delimited JSON) protocol for receiving commands and sending
 * responses.
 *
 *
 * @summary Socket client for runtime-to-dispatcher communication
 * @module
 */

import * as net from 'node:net';

// ============================================================================
// Types
// ============================================================================

/**
 * Commands that can be received from the ActionDispatcher via socket.
 *
 * Uses NDJSON (newline-delimited JSON) protocol.
 */
export type SocketCommand = { type: 'cancel' } | { type: 'switchToInteractive' };

/**
 * Response sent back to the ActionDispatcher when switchToInteractive is handled.
 */
export interface SwitchToInteractiveResponse {
  type: 'switchToInteractiveResponse';
  data: unknown;
}

// ============================================================================
// SocketClient
// ============================================================================

/**
 * Client for the NDJSON socket protocol between the action runtime and
 * ActionDispatcher.
 *
 * Receives commands (cancel, switchToInteractive) and sends responses
 * (switchToInteractiveResponse) over a Unix domain socket.
 *
 * @example
 * ```typescript
 * const client = await SocketClient.connect('/path/to/socket');
 * client.onCommand((command) => {
 *   if (command.type === 'cancel') { ... }
 * });
 * ```
 */
export class SocketClient {
  private socket: net.Socket;
  private buffer = '';
  private commandHandler?: (command: SocketCommand) => void;

  private constructor(socket: net.Socket) {
    this.socket = socket;

    socket.on('data', (chunk) => {
      this.buffer += chunk.toString();
      // Parse NDJSON - split by newlines
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          const parsed = JSON.parse(line) as SocketCommand;
          this.commandHandler?.(parsed);
        } catch {
          // Malformed JSON on socket is ignored (per plan)
        }
      }
    });
  }

  /**
   * Connect to a Unix domain socket at the given path.
   *
   * @param socketPath - Path to the Unix domain socket
   * @returns A connected SocketClient instance
   * @throws Error if the connection fails
   */
  static connect(socketPath: string): Promise<SocketClient> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(socketPath, () => {
        resolve(new SocketClient(socket));
      });
      socket.on('error', reject);
    });
  }

  /**
   * Register a handler for incoming socket commands.
   *
   * Only one handler can be registered at a time. Subsequent calls replace
   * the previous handler.
   *
   * @param handler - Function to call when a command is received
   */
  onCommand(handler: (command: SocketCommand) => void): void {
    this.commandHandler = handler;
  }

  /**
   * Send a response back to the ActionDispatcher.
   *
   * @param response - The response to send as NDJSON
   */
  sendResponse(response: SwitchToInteractiveResponse): void {
    this.socket.write(`${JSON.stringify(response)}\n`);
  }

  /**
   * Send a response and call callback when flushed.
   *
   * Used to guarantee flush before process.exit.
   *
   * @param response - The response to send as NDJSON
   * @param callback - Called after the data is flushed to the socket
   */
  sendResponseThen(response: SwitchToInteractiveResponse, callback: () => void): void {
    this.socket.write(`${JSON.stringify(response)}\n`, callback);
  }

  /**
   * Close the socket connection.
   */
  close(): void {
    this.socket.destroy();
  }
}
