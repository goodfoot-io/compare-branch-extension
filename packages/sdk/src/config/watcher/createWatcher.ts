/**
 * Factory for creating a watcher that connects to the extension-hosted control
 * socket, runs the provided handler, and manages the full watcher lifecycle.
 *
 * @summary createWatcher factory and associated types
 * @module
 */

import type { WatcherContext } from './context.js';

export interface WatcherRegistration {
  watcherId: string;
  cardId: string;
  metadata: Record<string, unknown>;
}

export interface WatcherHandle {
  run(): Promise<void>;
}

export type WatcherHandler = (ctx: WatcherContext) => Promise<void> | void;

/**
 * Creates a watcher that registers with the extension and runs the provided
 * handler with a {@link WatcherContext}.
 * @param _registration - Identifies the watcher and attaches metadata
 * @param _handler - Called once the handshake completes; runs for the watcher lifetime
 * @returns A handle whose `run()` method resolves when the watcher exits cleanly
 */
export async function createWatcher(
  _registration: WatcherRegistration,
  _handler: WatcherHandler
): Promise<WatcherHandle> {
  throw new Error('createWatcher: not implemented (Phase 4)');
}
