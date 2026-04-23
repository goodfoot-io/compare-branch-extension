/**
 * Actions for communicating from the iframe renderer to the host.
 *
 * Each function posts a typed message to `window.parent` via `postMessage`.
 * The host extension listens for these messages and acts accordingly.
 *
 * @summary Iframe-to-host action functions
 * @module stream-store/actions
 */

import type { IframeToHostMessage } from './types.js';

/**
 * Posts a typed message to the host window.
 *
 * @param message - Message to send to the parent frame.
 */
function postToHost(message: IframeToHostMessage): void {
  window.parent.postMessage(message, '*');
}

/**
 * Requests subscription to a stream file's updates.
 *
 * The host will respond with a `subscribe:response` message containing
 * the file's current lines and metadata.
 *
 * @param filename - Stream filename to subscribe to.
 */
export function subscribe(filename: string): void {
  postToHost({ type: 'subscribe', filename });
}

/**
 * Requests the host to close this stream renderer.
 */
export function close(): void {
  postToHost({ type: 'close' });
}

/**
 * Requests the host to open a file in the editor.
 *
 * @param path - File path to open.
 * @param line - Optional line number to navigate to.
 */
export function openFile(path: string, line?: number): void {
  postToHost({ type: 'openFile', path, line });
}

/**
 * Requests the host to show a diff view.
 *
 * @param sha - Commit SHA to diff.
 * @param filePath - Optional file path to scope the diff.
 */
export function showDiff(sha: string, filePath?: string): void {
  postToHost({ type: 'showDiff', sha, filePath });
}
