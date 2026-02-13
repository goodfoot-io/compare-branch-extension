/**
 * Callback contracts for IPC message handling.
 *
 * These types make message dispatch explicit without coupling to any particular
 * IPC transport implementation.
 *
 *
 * @summary Callback contracts for IPC message handling
 * @module types/callbacks
 */

import type { IpcMessage } from './ipc.js';

/**
 * Invoked whenever an IPC message is received.
 */
export type IpcMessageCallback = (message: IpcMessage) => void;
