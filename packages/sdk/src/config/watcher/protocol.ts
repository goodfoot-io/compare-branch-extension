/**
 * NDJSON protocol types for the watcher control socket.
 *
 * Defines the discriminated union message types sent between a watcher process
 * and the extension-hosted control socket in both directions.
 *
 * @summary Watcher control socket protocol types
 * @module
 */

import type { LogLevel } from '../logger.js';

// ============================================================================
// Watcher → Server Messages
// ============================================================================

export interface WatcherHelloMessage {
  type: 'hello';
  watcherId: string;
}

export interface WatcherEventMessage {
  type: 'event';
  event: { type: string; data: unknown };
}

export interface WatcherLogMessage {
  type: 'log';
  level: LogLevel;
  message: string;
}

export interface WatcherStopAckMessage {
  type: 'stop-ack';
}

export type WatcherToServerMessage =
  | WatcherHelloMessage
  | WatcherEventMessage
  | WatcherLogMessage
  | WatcherStopAckMessage;

// ============================================================================
// Server → Watcher Messages
// ============================================================================

export interface ServerHelloAckMessage {
  type: 'hello-ack';
}

export interface ServerControlMessage {
  type: 'control';
  command: { type: 'stop' };
}

export type ServerToWatcherMessage = ServerHelloAckMessage | ServerControlMessage;
