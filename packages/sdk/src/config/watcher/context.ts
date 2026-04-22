/**
 * Watcher execution context passed to WatcherHandler callbacks.
 *
 * Provides structured logging, working directory, event emission, and
 * control-command subscription to watcher handler implementations.
 *
 * @summary Watcher execution context interface
 * @module
 */

import type { ILogger } from '../logger.js';

export interface WatcherContext {
  logger: ILogger;
  cwd: string;
  emit(event: { type: string; data: unknown }): void;
  onControl(commandType: 'stop', handler: () => Promise<void> | void): void;
}
