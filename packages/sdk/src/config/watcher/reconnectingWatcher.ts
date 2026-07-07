/**
 * Reconnecting variant of the watcher control channel.
 *
 * {@link createWatcher} treats an unexpected socket close as fatal — the right
 * behavior for the old transcript watcher, whose handler is a single
 * long-lived callback tightly coupled to `run()`'s lifetime. The transcript-
 * sync engine's composition root needs different behavior: sync work must
 * keep running across an extension restart (which drops the control socket)
 * rather than dying and losing sync progress. This module re-registers with
 * capped exponential backoff (1s, 2s, 4s, ... capped at 60s) instead of
 * failing, and exposes a `ctx` that transparently forwards `emit`/log traffic
 * to whichever socket is currently connected. Heartbeats are stateless, so an
 * emit that lands while disconnected is simply dropped — nothing is buffered
 * across a reconnect.
 *
 * Built on {@link dialWatcherSocket} (the connect-and-handshake portion of
 * `createWatcher`) so both modules share the exact registration/handshake
 * logic and error types.
 *
 * @summary Control channel that survives control-socket loss via reconnect-with-backoff
 * @module
 */

import type * as net from 'node:net';
import type { ILogger, LogLevel } from '../logger.js';
import { Logger } from '../logger.js';
import type { WatcherContext } from './context.js';
import { dialWatcherSocket, type WatcherRegistration } from './createWatcher.js';
import type {
  ServerToWatcherMessage,
  WatcherEventMessage,
  WatcherLogMessage,
  WatcherToServerMessage
} from './protocol.js';

/** Initial reconnect delay. */
export const RECONNECT_BASE_DELAY_MS = 1_000;
/** Reconnect delay cap. */
export const RECONNECT_MAX_DELAY_MS = 60_000;

function writeMessage(socket: net.Socket, msg: WatcherToServerMessage): void {
  socket.write(`${JSON.stringify(msg)}\n`);
}

/** Handle returned by {@link createReconnectingWatcher}. */
export interface ReconnectingWatcherHandle {
  /** Stable context whose emit/log/onControl work across reconnects. */
  ctx: WatcherContext;
  /**
   * Resolves once a stop control has been received, its handler has run, and
   * the stop has been acknowledged. Rejects if the stop handler itself throws.
   */
  waitForStop(): Promise<void>;
  /**
   * Stops all reconnect attempts and closes the current socket without
   * running the stop handshake. Used for shutdown paths other than the
   * stop-control path (sentinel detection, PID death, max lifetime).
   */
  shutdown(): void;
}

/**
 * Establishes a reconnecting watcher control channel.
 *
 * The initial connection must succeed — callers that need fail-closed
 * startup behavior (nothing else is possible before a control channel
 * exists) should let a failure here propagate and exit. Once connected, any
 * later unexpected disconnect triggers capped-exponential-backoff
 * re-registration instead of throwing; `ctx` remains valid and usable across
 * every reconnect.
 *
 * @param registration - Identifies the watcher and attaches metadata.
 * @returns A handle whose `ctx` is stable for the process lifetime.
 */
export async function createReconnectingWatcher(registration: WatcherRegistration): Promise<ReconnectingWatcherHandle> {
  let socket: net.Socket | undefined;
  let generation = 0;
  let reconnectAttempt = 0;
  let stopControlHandler: (() => Promise<void> | void) | undefined;
  let stopAckSent = false;
  let stopInProgress = false;
  let shuttingDown = false;
  let reconnectTimer: NodeJS.Timeout | undefined;

  let resolveStop!: () => void;
  let rejectStop!: (error: unknown) => void;
  const stopWaitPromise = new Promise<void>((resolve, reject) => {
    resolveStop = resolve;
    rejectStop = reject;
  });

  const watcherLogger = new Logger();
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  for (const level of levels) {
    watcherLogger.on(level, (event) => {
      if (!socket || socket.destroyed) return;
      const msg: WatcherLogMessage = { type: 'log', level: event.level, message: event.message };
      writeMessage(socket, msg);
    });
  }

  const ctx: WatcherContext = {
    logger: watcherLogger as ILogger,
    cwd: process.cwd(),
    emit(event) {
      // Stateless heartbeats: silently drop while disconnected or post-stop-ack.
      if (stopAckSent || !socket || socket.destroyed) return;
      const msg: WatcherEventMessage = { type: 'event', event };
      writeMessage(socket, msg);
    },
    onControl(_commandType, cb) {
      stopControlHandler = cb;
    }
  };

  function scheduleReconnect(): void {
    if (shuttingDown || stopInProgress) return;
    const delay = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      attachConnection().catch((error: unknown) => {
        watcherLogger.warn(`reconnectingWatcher: reconnect attempt failed: ${String(error)}`);
        scheduleReconnect();
      });
    }, delay);
    reconnectTimer.unref?.();
  }

  async function attachConnection(): Promise<void> {
    const myGeneration = ++generation;
    const dialed = await dialWatcherSocket(registration);
    if (shuttingDown) {
      dialed.socket.destroy();
      return;
    }

    socket = dialed.socket;
    reconnectAttempt = 0;

    let lineBuffer = dialed.handshakeRemainder;
    const processBuffer = () => {
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
          continue;
        }

        if (msg.type !== 'control') continue;

        if (msg.command.type !== 'stop') {
          watcherLogger.warn(`Unregistered control command type: ${(msg.command as { type: string }).type}`);
          continue;
        }

        stopInProgress = true;
        const currentSocket = dialed.socket;
        const cb = stopControlHandler;
        void (async () => {
          try {
            if (cb) await cb();
          } catch (error) {
            rejectStop(error);
            currentSocket.destroy();
            return;
          }
          if (!stopAckSent) {
            stopAckSent = true;
            writeMessage(currentSocket, { type: 'stop-ack' });
          }
          currentSocket.end(() => resolveStop());
        })();
      }
    };

    dialed.socket.on('data', (chunk: Buffer) => {
      lineBuffer += chunk.toString();
      processBuffer();
    });

    dialed.socket.on('close', () => {
      // A superseded (already-replaced) socket's close is expected — ignore it.
      if (myGeneration !== generation) return;
      if (stopInProgress || shuttingDown) return;
      watcherLogger.warn('reconnectingWatcher: control socket closed unexpectedly — reconnecting');
      scheduleReconnect();
    });

    dialed.socket.on('error', (error) => {
      if (myGeneration !== generation) return;
      watcherLogger.warn(`reconnectingWatcher: control socket error: ${String(error)}`);
    });

    if (lineBuffer.length > 0) {
      setImmediate(processBuffer);
    }
  }

  await attachConnection();

  return {
    ctx,
    waitForStop: () => stopWaitPromise,
    shutdown() {
      shuttingDown = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket && !socket.destroyed) socket.destroy();
    }
  };
}
