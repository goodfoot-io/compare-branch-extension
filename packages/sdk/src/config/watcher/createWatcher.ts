/**
 * Factory for creating a watcher that connects to the extension-hosted control
 * socket, runs the provided handler, and manages the full watcher lifecycle.
 *
 * @summary createWatcher factory and associated types
 * @module
 */

import * as net from 'node:net';
import { discoverApiInfo } from '../../client/api-discovery.js';
import type { ILogger, LogLevel } from '../logger.js';
import { Logger } from '../logger.js';
import type { WatcherContext } from './context.js';
import { WatcherHandshakeError, WatcherRegistrationError } from './errors.js';
import type {
  ServerToWatcherMessage,
  WatcherEventMessage,
  WatcherLogMessage,
  WatcherToServerMessage
} from './protocol.js';

export interface WatcherRegistration {
  watcherId: string;
  cardId: string;
  metadata: Record<string, unknown>;
}

export interface WatcherHandle {
  run(): Promise<void>;
}

export type WatcherHandler = (ctx: WatcherContext) => Promise<void> | void;

function writeMessage(socket: net.Socket, msg: WatcherToServerMessage): void {
  socket.write(`${JSON.stringify(msg)}\n`);
}

/**
 * Creates a watcher that registers with the extension and runs the provided
 * handler with a {@link WatcherContext}.
 * @param registration - Identifies the watcher and attaches metadata
 * @param handler - Called once the handshake completes; runs for the watcher lifetime
 * @returns A handle whose `run()` method resolves when the watcher exits cleanly
 */
export async function createWatcher(
  registration: WatcherRegistration,
  handler: WatcherHandler
): Promise<WatcherHandle> {
  const { watcherId, cardId, metadata } = registration;

  // 1. Discover server base URL
  const info = await discoverApiInfo();
  if (!info) {
    throw new WatcherRegistrationError('Cards server is not running or not discoverable');
  }

  const baseUrl = `http://${info.host}:${info.port}`;

  // 2. POST to /internal/watchers
  let socketPath: string;
  try {
    const response = await fetch(`${baseUrl}/internal/watchers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${info.accessToken}`
      },
      body: JSON.stringify({ watcherId, cardId, metadata })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new WatcherRegistrationError(`POST /internal/watchers failed with status ${response.status}: ${body}`);
    }

    const json = (await response.json()) as { socketPath: string };
    socketPath = json.socketPath;
  } catch (error) {
    if (error instanceof WatcherRegistrationError) throw error;
    throw new WatcherRegistrationError(`Failed to register watcher: ${String(error)}`);
  }

  // 3. Connect to the Unix socket
  const socket = net.createConnection(socketPath);

  // 4. Perform the hello handshake
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new WatcherHandshakeError('Handshake timeout: no hello-ack received within 2s'));
    }, 2000);

    socket.once('connect', () => {
      writeMessage(socket, { type: 'hello', watcherId });
    });

    let lineBuffer = '';

    const onData = (chunk: Buffer) => {
      lineBuffer += chunk.toString();
      const newlineIdx = lineBuffer.indexOf('\n');
      if (newlineIdx === -1) return;

      const line = lineBuffer.slice(0, newlineIdx);
      lineBuffer = lineBuffer.slice(newlineIdx + 1);
      socket.removeListener('data', onData);

      let msg: ServerToWatcherMessage;
      try {
        msg = JSON.parse(line) as ServerToWatcherMessage;
      } catch {
        clearTimeout(timeout);
        socket.destroy();
        reject(new WatcherHandshakeError(`Handshake failed: invalid JSON in first message`));
        return;
      }

      if (msg.type !== 'hello-ack') {
        clearTimeout(timeout);
        socket.destroy();
        reject(new WatcherHandshakeError(`Handshake failed: expected hello-ack, got ${msg.type}`));
        return;
      }

      clearTimeout(timeout);
      resolve();
    };

    socket.on('data', onData);

    socket.once('error', (err) => {
      clearTimeout(timeout);
      reject(new WatcherRegistrationError(`Socket connection failed: ${String(err)}`));
    });
  });

  // 5 & 6. Build WatcherContext
  let handshakeComplete = false;
  let stopAckSent = false;
  const preHandshakeQueue: WatcherEventMessage[] = [];
  let stopControlHandler: (() => Promise<void> | void) | undefined;

  // Logger whose events are forwarded to the socket
  const watcherLogger = new Logger();
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  for (const level of levels) {
    watcherLogger.on(level, (event) => {
      const msg: WatcherLogMessage = { type: 'log', level: event.level, message: event.message };
      writeMessage(socket, msg);
    });
  }

  const context: WatcherContext = {
    logger: watcherLogger as ILogger,
    cwd: process.cwd(),
    emit(event) {
      if (stopAckSent) return;
      const msg: WatcherEventMessage = { type: 'event', event };
      if (!handshakeComplete) {
        preHandshakeQueue.push(msg);
        return;
      }
      writeMessage(socket, msg);
    },
    onControl(_commandType, cb) {
      stopControlHandler = cb;
    }
  };

  // Mark handshake complete and flush pre-handshake queue
  handshakeComplete = true;
  for (const msg of preHandshakeQueue) {
    writeMessage(socket, msg);
  }
  preHandshakeQueue.length = 0;

  // 7. Return handle
  return {
    run(): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        let runComplete = false;
        let socketClosed = false;
        // Set when a stop control arrives; prevents handler exit from resolving run()
        let stopInProgress = false;

        const cleanup = () => {
          if (!socket.destroyed) {
            socket.destroy();
          }
        };

        // Listen for incoming control messages from server
        let lineBuffer = '';
        socket.on('data', (chunk: Buffer) => {
          lineBuffer += chunk.toString();
          for (;;) {
            const newlineIdx = lineBuffer.indexOf('\n');
            if (newlineIdx === -1) break;
            const line = lineBuffer.slice(0, newlineIdx);
            lineBuffer = lineBuffer.slice(newlineIdx + 1);
            if (!line.trim()) continue;

            let msg: ServerToWatcherMessage;
            try {
              msg = JSON.parse(line) as ServerToWatcherMessage;
            } catch {
              // Ignore malformed lines
              continue;
            }

            if (msg.type === 'control') {
              const command = msg.command;
              if (command.type === 'stop') {
                stopInProgress = true;
                const cb = stopControlHandler;
                const doStop = async () => {
                  if (cb) {
                    try {
                      await cb();
                    } catch (err) {
                      reject(err);
                      cleanup();
                      return;
                    }
                  }
                  if (!stopAckSent) {
                    stopAckSent = true;
                    writeMessage(socket, { type: 'stop-ack' });
                  }
                  socket.end(() => {
                    if (!runComplete) {
                      runComplete = true;
                      resolve();
                    }
                  });
                };
                void doStop();
              } else {
                watcherLogger.warn(`Unregistered control command type: ${command.type}`);
              }
            }
          }
        });

        socket.on('close', () => {
          socketClosed = true;
          if (!runComplete && !stopAckSent) {
            runComplete = true;
            reject(new Error('Watcher socket closed unexpectedly by server'));
          }
        });

        socket.on('error', (err) => {
          if (!runComplete) {
            runComplete = true;
            reject(err);
          }
        });

        // Run the handler
        const handlerResult = (() => {
          try {
            return Promise.resolve(handler(context));
          } catch (err) {
            return Promise.reject(err as Error);
          }
        })();

        handlerResult.then(
          () => {
            // If a stop control is in progress, let the stop flow resolve run()
            if (!runComplete && !stopInProgress) {
              // Handler completed normally — close socket and resolve
              if (!socketClosed) {
                socket.end(() => {
                  if (!runComplete) {
                    runComplete = true;
                    resolve();
                  }
                });
              } else {
                runComplete = true;
                resolve();
              }
            }
          },
          (err: unknown) => {
            if (!runComplete) {
              runComplete = true;
              cleanup();
              reject(err);
            }
          }
        );
      });
    }
  };
}
