/**
 * IPC message payloads exchanged between Cards V2 processes.
 *
 * Messages use a `type` discriminator so consumers can safely narrow the union
 * and handle unknown message types without crashing older clients.
 *
 *
 * @summary IPC message payloads exchanged between Cards V2 processes
 * @module types/ipc
 */

// --- Base IPC Message ---

/**
 * Base shape for all IPC messages.
 *
 * The nonce correlates request/response pairs across the IPC transport.
 */
export interface IpcMessageBase {
  /** Message type discriminator. */
  type: string;
  /** Unique identifier for request/response correlation. */
  nonce: string;
}

// --- Session Started Message ---

/**
 * IPC message emitted when a new session begins.
 */
export interface SessionStartedMessage extends IpcMessageBase {
  /** Discriminator for session started messages. */
  type: 'session_started';
  /** Unique identifier for the started session. */
  sessionId: string;
}

// --- IPC Message Union ---

/**
 * Discriminated union of all IPC message types.
 *
 * Use the `type` field to narrow the message type and keep a default case for
 * forward compatibility.
 *
 * @example
 * ```typescript
 * function handleMessage(msg: IpcMessage) {
 *   switch (msg.type) {
 *     case 'session_started':
 *       console.log(msg.sessionId);
 *       break;
 *     default:
 *       // Ignore future message types gracefully.
 *       break;
 *   }
 * }
 * ```
 */
export type IpcMessage = SessionStartedMessage;
