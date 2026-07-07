/**
 * Public API for the watcher primitive.
 *
 * @summary Watcher primitive exports
 * @module
 */

export type { WatcherContext } from './context.js';
export {
  createWatcher,
  type DialedWatcherSocket,
  dialWatcherSocket,
  type WatcherHandle,
  type WatcherHandler,
  type WatcherRegistration
} from './createWatcher.js';
export { WatcherHandshakeError, WatcherRegistrationError } from './errors.js';
export type {
  ServerControlMessage,
  ServerHelloAckMessage,
  ServerToWatcherMessage,
  WatcherEventMessage,
  WatcherHelloMessage,
  WatcherLogMessage,
  WatcherStopAckMessage,
  WatcherToServerMessage
} from './protocol.js';
export {
  createReconnectingWatcher,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
  type ReconnectingWatcherHandle
} from './reconnectingWatcher.js';
export { socketEndpoint } from './socketEndpoint.js';
