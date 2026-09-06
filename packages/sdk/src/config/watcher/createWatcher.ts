/**
 * Connect-and-handshake primitive for the watcher control socket.
 *
 * @summary dialWatcherSocket primitive and associated types
 * @module
 */

import * as net from 'node:net';
import { discoverApiInfo } from '../../client/api-discovery.js';
import type { WatcherContext } from './context.js';
import { WatcherHandshakeError, WatcherRegistrationError } from './errors.js';
import type { ServerToWatcherMessage, WatcherToServerMessage } from './protocol.js';
import { socketEndpoint } from './socketEndpoint.js';

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
 * A dialed and handshake-complete watcher control socket.
 *
 * `handshakeRemainder` carries any bytes that arrived after the `hello-ack`
 * line but were read in the same chunk during the handshake — a stream socket
 * does not preserve message boundaries, so these must be fed to whatever
 * parses subsequent traffic on the socket instead of being discarded.
 */
export interface DialedWatcherSocket {
  socket: net.Socket;
  handshakeRemainder: string;
}

/**
 * Registers a watcher with the extension (POST `/internal/watchers`), dials
 * the returned control socket, and completes the `hello`/`hello-ack`
 * handshake.
 *
 * A caller that needs to re-establish the control channel after an
 * unexpected disconnect — see `../../transcript-sync/engine/` composition
 * root's reconnect-with-backoff requirement — can redo exactly this sequence
 * without re-running a handler.
 *
 * @param registration - Identifies the watcher and attaches metadata.
 * @returns The connected, handshake-complete socket and any batched trailing bytes.
 * @throws {WatcherRegistrationError} When discovery, registration, or the socket connection fails.
 * @throws {WatcherHandshakeError} When the handshake times out or the server's first message is malformed/unexpected.
 */
export async function dialWatcherSocket(registration: WatcherRegistration): Promise<DialedWatcherSocket> {
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

  // 3. Connect to the Unix socket (named pipe on Windows — see socketEndpoint).
  const socket = net.createConnection(socketEndpoint(socketPath));

  // 4. Perform the hello handshake.
  //
  // A stream socket does not preserve message boundaries: the server may write
  // (or the OS may coalesce) `hello-ack\n` and a subsequent message such as an
  // immediate `control: stop` into a single read. Any bytes that arrive after
  // the first newline must be carried over to the caller's parser instead of
  // being discarded, otherwise the batched message is silently lost.
  let handshakeRemainder = '';
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
      handshakeRemainder = lineBuffer.slice(newlineIdx + 1);
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

  return { socket, handshakeRemainder };
}
