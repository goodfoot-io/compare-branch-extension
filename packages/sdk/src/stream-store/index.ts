/**
 * Stream store SDK for iframe-based stream renderers.
 *
 * Provides a vanilla Zustand store initialized from `window.__STREAM_INIT__`
 * and action functions for communicating with the host extension via postMessage.
 *
 * @summary Stream store barrel export
 * @module stream-store
 */

export { close, observeHeight, openFile, setHeight, showDiff, subscribe } from './actions.js';
export { streamStore } from './store.js';
export type {
  HostToIframeMessage,
  IframeToHostMessage,
  StreamFile,
  StreamInitData,
  StreamMeta,
  StreamStoreState
} from './types.js';
