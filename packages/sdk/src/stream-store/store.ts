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
import type { HostToIframeMessage, StreamDisplayMode, StreamFile, StreamInitData, StreamStoreState } from './types.js';
import { COMPACT_TAIL_LINES } from './types.js';

/**
 * Bounds a compact-mode file's retained lines to the trailing
 * {@link COMPACT_TAIL_LINES} window as a pure memory bound.
 *
 * A compact card renders only a handful of lines, so retaining the full
 * transcript in memory is wasteful. When the line array grows past the cap,
 * drop the excess from the head and advance `headLineNumber` by the same amount
 * so the file's absolute coordinate stays correct. Because the merge reasons
 * about absolute line numbers, this capping can never cause the line-dropping
 * corruption a positional merge would — it is bookkeeping, not a correctness
 * step. Expanded mode retains the whole transcript unchanged.
 *
 * @param file - The file to bound.
 * @param mode - The iframe's current display mode.
 * @returns The same reference when no capping is needed, or a capped copy.
 */
function capIfCompact(file: StreamFile, mode: StreamDisplayMode): StreamFile {
  if (mode !== 'compact' || file.lines.length <= COMPACT_TAIL_LINES) return file;
  const drop = file.lines.length - COMPACT_TAIL_LINES;
  return {
    ...file,
    lines: file.lines.slice(drop),
    headLineNumber: file.headLineNumber + drop
  };
}

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
      // Absolute line number of lines[0]. The host may seed a trailing window
      // (compact tail) whose first line is not line 1, so derive the head from
      // the full lineCount minus the number of lines actually seeded.
      headLineNumber: data.meta.lineCount - data.lines.length + 1,
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

      // Offset-aware append: only accept the line that is exactly the expected
      // next one (seeding `headLineNumber` when the file is empty). Anything
      // else — a duplicate re-delivery after a reconnect, or a line past a gap
      // the disconnect opened — is dropped. The resubscribe (not ad hoc
      // patching) is the backfill path, so this one rule also absorbs a server
      // restart's renumbered-from-1 rebroadcast: every already-known line fails
      // the expected-next check and is dropped until the genuinely-new tail.
      let next: StreamFile;
      if (file.lines.length === 0) {
        next = {
          ...file,
          lines: [msg.line],
          headLineNumber: msg.lineNumber,
          meta: { ...file.meta, lineCount: Math.max(file.meta.lineCount, msg.lineNumber) }
        };
      } else if (msg.lineNumber === file.headLineNumber + file.lines.length) {
        next = {
          ...file,
          lines: [...file.lines, msg.line],
          meta: { ...file.meta, lineCount: Math.max(file.meta.lineCount, msg.lineNumber) }
        };
      } else {
        return null;
      }

      const updated = new Map(state.files);
      updated.set(msg.filename, capIfCompact(next, state.mode));
      return { files: updated };
    }

    case 'stream:started': {
      const file = state.files.get(msg.filename);
      const updated = new Map(state.files);
      updated.set(msg.filename, {
        filename: msg.filename,
        meta: msg.meta,
        lines: file?.lines ?? [],
        headLineNumber: file?.headLineNumber ?? 0,
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
        // Merge rather than replace: `stream:ended` only carries the fields
        // that change at end-of-stream (lineCount/isActive) — merging keeps
        // sidecar-derived fields (role, agentId, sessionId, title) that were
        // already known for this file.
        meta: { ...file.meta, ...msg.meta }
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
          headLineNumber: existing?.headLineNumber ?? 0,
          isSubscribed: false,
          isLoading: false,
          error: msg.error
        });
      } else {
        const existing = state.files.get(msg.filename);
        const existingLines = existing?.lines ?? [];
        // Reconcile by absolute line number, never by array position. The
        // response covers the (possibly tail) range [responseHead, responseLast].
        const responseHead = msg.meta.lineCount - msg.lines.length + 1;
        const responseLast = msg.meta.lineCount;
        const localHead = existing?.headLineNumber ?? 0;
        const localLast = existingLines.length > 0 ? localHead + existingLines.length - 1 : 0;

        let mergedLines: string[];
        let mergedHead: number;
        if (existingLines.length === 0 || responseLast >= localLast) {
          // The response reaches at least as far as local knowledge — take it as
          // the new base. There is no local tail beyond it to preserve; a live
          // tail that raced ahead of the fetch lands in the else branch (where
          // responseLast < localLast), so the response lines stand alone here.
          mergedHead = responseHead;
          mergedLines = [...msg.lines];
        } else {
          // The response is behind local knowledge — a live tail raced ahead of
          // the fetch (or a stale disk read landed late). Preserve that
          // raced-ahead tail by keeping local lines untouched; never shrink to
          // the stale response.
          mergedHead = localHead;
          mergedLines = existingLines;
        }

        // `meta.lineCount` must reflect the true stream length, which is the
        // last line number now known — never shrink it to a stale response.
        const mergedLast = mergedLines.length > 0 ? mergedHead + mergedLines.length - 1 : responseLast;
        const merged: StreamFile = {
          filename: msg.filename,
          meta: { ...msg.meta, lineCount: Math.max(msg.meta.lineCount, mergedLast) },
          lines: mergedLines,
          headLineNumber: mergedHead,
          isSubscribed: true,
          isLoading: false,
          error: null
        };
        updated.set(msg.filename, capIfCompact(merged, state.mode));
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
//
// Compact previews only render a handful of trailing lines, so they request a
// tail rather than the full transcript — the host fetches just the last
// COMPACT_TAIL_LINES lines and `meta.lineCount` still reports the full length.
// The expanded panel omits the tail and receives the whole transcript.
const primaryFile = streamStore.getState().files.get(init.primary);
if (primaryFile && primaryFile.lines.length === 0) {
  subscribe(init.primary, init.mode === 'compact' ? COMPACT_TAIL_LINES : undefined);
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

/**
 * Files with a gap-backfill resubscribe currently in flight.
 *
 * A forward gap in the live `stream:line` feed (a line past the expected next)
 * means lines were missed — the offset-aware merge cannot append past the hole,
 * so without intervention every later line is dropped for the rest of the
 * session and the pane freezes. Instead we resubscribe to backfill the gap. This
 * set is the storm guard: at most one backfill per file is outstanding, so a
 * burst of gapped lines triggers exactly one resubscribe. The entry clears when
 * that file's `subscribe:response` lands (below), re-arming the mechanism.
 */
const backfillsInFlight = new Set<string>();

/**
 * Triggers a resubscribe to backfill a forward gap, guarded against storms.
 *
 * @param filename - Stream file whose live feed skipped past the expected next line.
 */
function requestGapBackfill(filename: string): void {
  if (backfillsInFlight.has(filename)) return;
  backfillsInFlight.add(filename);
  const mode = streamStore.getState().mode;
  subscribe(filename, mode === 'compact' ? COMPACT_TAIL_LINES : undefined);
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

  // A reconnect is a resubscribe side effect, not a state mutation: re-issue the
  // mode-appropriate `subscribe` for every subscribed file so lines broadcast
  // while the socket was down are backfilled. No upfront reset — the offset-aware
  // merge tolerates stale, fresh, overlapping, or gapped local state by
  // reconciling on absolute line numbers when the response lands.
  if (msg.type === 'connection:restored') {
    const state = streamStore.getState();
    for (const file of state.files.values()) {
      if (file.isSubscribed) {
        subscribe(file.filename, state.mode === 'compact' ? COMPACT_TAIL_LINES : undefined);
      }
    }
    return;
  }

  // A forward gap in the live feed (a line past the expected next) means lines
  // were missed — resubscribe to backfill rather than silently dropping the rest
  // of the session. Only a genuine forward gap qualifies: a seed (empty file) or
  // an in-order append is handled by the merge below, and a duplicate/behind line
  // (lineNumber <= expected) is dropped there without a backfill. This one path
  // heals both the compact card and the standalone panel, whose non-empty seed
  // means its first missed live line is the gap that arms this backfill.
  if (msg.type === 'stream:line') {
    const file = streamStore.getState().files.get(msg.filename);
    if (file && file.lines.length > 0 && msg.lineNumber > file.headLineNumber + file.lines.length) {
      requestGapBackfill(msg.filename);
      return;
    }
  }

  // A landed subscribe:response is the backfill completing — re-arm the gap
  // guard so a later gap can trigger a fresh resubscribe.
  if (msg.type === 'subscribe:response') {
    backfillsInFlight.delete(msg.filename);
  }

  const patch = applyMessage(streamStore.getState(), msg);
  if (patch) {
    streamStore.setState(patch);
  }
});
