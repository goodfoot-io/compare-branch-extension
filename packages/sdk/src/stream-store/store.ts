/**
 * Vanilla Zustand store for iframe-based stream renderers.
 *
 * Initializes from `window.__STREAM_INIT__` (set by the host before the
 * iframe loads) and listens for `postMessage` events to keep state in sync.
 *
 * @summary Zustand vanilla store for stream renderer state
 * @module stream-store/store
 */

import { createStore } from 'zustand/vanilla';
import { subscribe } from './actions.js';
import type { HostToIframeMessage, StreamFile, StreamInitData, StreamStoreState } from './types.js';

declare global {
  interface Window {
    __STREAM_INIT__?: StreamInitData;
  }
}

/**
 * Builds the initial store state from host-provided initialization data.
 *
 * @param init - Initialization data set on `window.__STREAM_INIT__` by the host.
 * @returns Fully populated store state ready for Zustand.
 */
function buildInitialState(init: StreamInitData): StreamStoreState {
  const files = new Map<string, StreamFile>();
  for (const [filename, data] of Object.entries(init.files)) {
    files.set(filename, {
      filename,
      meta: data.meta,
      lines: [...data.lines],
      isSubscribed: filename === init.primary,
      isLoading: false,
      error: null
    });
  }
  return {
    primary: init.primary,
    files,
    availableFiles: [...init.availableFiles],
    connected: true,
    mode: init.mode
  };
}

/**
 * Applies a host message to the current store state, returning the next state.
 *
 * @param state - Current store state.
 * @param msg - Host-to-iframe message to apply.
 * @returns Updated store state, or the same reference if no change is needed.
 */
function applyMessage(state: StreamStoreState, msg: HostToIframeMessage): Partial<StreamStoreState> | null {
  switch (msg.type) {
    case 'stream:line': {
      const file = state.files.get(msg.filename);
      if (!file) return null;
      const updated = new Map(state.files);
      updated.set(msg.filename, {
        ...file,
        lines: [...file.lines, msg.line],
        meta: { ...file.meta, lineCount: file.meta.lineCount + 1 }
      });
      return { files: updated };
    }

    case 'stream:started': {
      const file = state.files.get(msg.filename);
      const updated = new Map(state.files);
      updated.set(msg.filename, {
        filename: msg.filename,
        meta: msg.meta,
        lines: file?.lines ?? [],
        isSubscribed: file?.isSubscribed ?? false,
        isLoading: file?.isLoading ?? false,
        error: file?.error ?? null
      });
      return { files: updated };
    }

    case 'stream:ended': {
      const file = state.files.get(msg.filename);
      if (!file) return null;
      const updated = new Map(state.files);
      updated.set(msg.filename, {
        ...file,
        meta: msg.meta
      });
      return { files: updated };
    }

    case 'availableFiles:update': {
      return { availableFiles: [...msg.files] };
    }

    case 'subscribe:response': {
      const updated = new Map(state.files);
      if (msg.error) {
        const existing = state.files.get(msg.filename);
        updated.set(msg.filename, {
          filename: msg.filename,
          meta: existing?.meta ?? msg.meta,
          lines: existing?.lines ?? [],
          isSubscribed: false,
          isLoading: false,
          error: msg.error
        });
      } else {
        const existing = state.files.get(msg.filename);
        const existingLines = existing?.lines ?? [];
        // Historical lines from the response are authoritative.
        // If live events accumulated before the response arrived, they will
        // be at indices >= msg.lines.length in the existing store.
        const merged =
          msg.lines.length >= existingLines.length
            ? [...msg.lines]
            : [...msg.lines, ...existingLines.slice(msg.lines.length)];
        updated.set(msg.filename, {
          filename: msg.filename,
          meta: msg.meta,
          lines: merged,
          isSubscribed: true,
          isLoading: false,
          error: null
        });
      }
      return { files: updated };
    }

    case 'theme:change':
      // Handled as a DOM side effect in the message listener — not store state.
      return null;

    default:
      return null;
  }
}

// Create the store from window.__STREAM_INIT__
const init = window.__STREAM_INIT__;
if (!init) {
  throw new Error('Stream store requires window.__STREAM_INIT__ to be set by the host');
}

/** Vanilla Zustand store for stream renderer state. */
export const streamStore = createStore<StreamStoreState>()(() => buildInitialState(init));

// Auto-subscribe for empty primary file (all statuses: active, completed, error).
// Timing is safe: the iframe is gated on listenerReady in StreamIframeHost so the
// parent listener is always registered before this code runs.
const primaryFile = streamStore.getState().files.get(init.primary);
if (primaryFile && primaryFile.lines.length === 0) {
  subscribe(init.primary);
}

/** Maps VS Code theme kind enum to the attribute value used in CSS selectors. */
const THEME_KIND_MAP: Record<1 | 2 | 3, string> = {
  1: 'light',
  2: 'dark',
  3: 'high-contrast'
};

/**
 * Applies theme data to the iframe document.
 *
 * Sets `--vscode-*` CSS custom properties on `:root` and updates
 * the `data-vscode-theme-kind` attribute so Tailwind theme utilities
 * pick the correct palette.
 *
 * @param themeKind - VS Code theme kind (1=Light, 2=Dark, 3=High Contrast).
 * @param cssVariables - Map of CSS custom property names to values.
 */
function applyTheme(themeKind: 1 | 2 | 3, cssVariables: Record<string, string>): void {
  const root = document.documentElement;
  root.setAttribute('data-vscode-theme-kind', THEME_KIND_MAP[themeKind]);
  for (const [name, value] of Object.entries(cssVariables)) {
    root.style.setProperty(name, value);
  }
}

// Listen for host messages and update the store
window.addEventListener('message', (event: MessageEvent<HostToIframeMessage>) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

  // Theme changes are DOM side effects, not store state.
  if (msg.type === 'theme:change') {
    applyTheme(msg.themeKind, msg.cssVariables);
    return;
  }

  const patch = applyMessage(streamStore.getState(), msg);
  if (patch) {
    streamStore.setState(patch);
  }
});
