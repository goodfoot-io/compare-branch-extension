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
 * Reports the iframe's content height to the host for auto-sizing.
 *
 * @param px - Content height in pixels.
 */
export function setHeight(px: number): void {
  postToHost({ type: 'setHeight', height: px });
}

/**
 * Observes the document body's height via ResizeObserver and reports
 * changes to the host automatically.
 *
 * In Electron srcdoc iframes, `document.body.scrollHeight` returns 0
 * when read synchronously because layout has not yet been computed.
 * This function defers height reporting until the browser has actually
 * laid out the content, and continues to report whenever the body's
 * dimensions change (e.g., new content appended).
 *
 * @returns A cleanup function that disconnects the observer.
 */
export function observeHeight(): () => void {
  let lastHeight = 0;

  const report = (): void => {
    const h = document.body.scrollHeight;
    if (h !== lastHeight) {
      lastHeight = h;
      setHeight(h);
    }
  };

  const observer = new ResizeObserver(report);
  observer.observe(document.body);

  return () => observer.disconnect();
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
