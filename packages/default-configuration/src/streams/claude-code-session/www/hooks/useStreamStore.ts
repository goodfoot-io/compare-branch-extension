/**
 * Typed Zustand selector hook for the claude-code-session stream store.
 *
 * Wraps `useStore` from `zustand` with the `streamStore` instance so
 * components can subscribe to store slices without importing the store directly.
 *
 * @summary Typed Zustand selector hook for streamStore
 * @module hooks/useStreamStore
 */

import type { StreamStoreState } from '@cards/sdk/stream-store';
import { streamStore } from '@cards/sdk/stream-store';
import { useStore } from 'zustand';

/**
 * Subscribe to a slice of the stream store state.
 * @param selector - Selector function that extracts the desired slice
 * @returns The selected slice of stream store state, updated on change.
 */
export function useStreamStore<T>(selector: (state: StreamStoreState) => T): T {
  return useStore(streamStore, selector);
}
