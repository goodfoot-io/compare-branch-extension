/**
 * Typed Zustand selector hook for the antigravity-session stream store.
 *
 * Wraps `useStore` from `zustand` with the `streamStore` instance so
 * components can subscribe to store slices without importing the store
 * directly. This re-export mirrors the claude-code-session and codex-session
 * renderers' hooks exactly; the SDK stream store is shared across renderers
 * through the module system.
 *
 * @summary Typed Zustand selector hook for streamStore
 * @module streams/antigravity-session/www/hooks/useStreamStore
 */

import type { StreamStoreState } from '@cards.management/sdk/stream-store';
import { streamStore } from '@cards.management/sdk/stream-store';
import { useStore } from 'zustand';

/**
 * Subscribe to a slice of the stream store state.
 * @param selector - Selector function that extracts the desired slice
 * @returns The selected slice of stream store state, updated on change.
 */
export function useStreamStore<T>(selector: (state: StreamStoreState) => T): T {
  return useStore(streamStore, selector);
}
