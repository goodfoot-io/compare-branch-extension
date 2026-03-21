/**
 * Shared utility for flushing microtasks and the next turn of the event loop.
 *
 * @summary Flush pending microtasks and one turn of the event loop
 */

/**
 * Yields to the event loop so that all pending microtasks and any callbacks
 * scheduled with `setTimeout(fn, 0)` have a chance to run.
 *
 * Replaces the repeated inline pattern:
 * ```typescript
 * await new Promise<void>((resolve) => setTimeout(resolve, 0));
 * ```
 *
 * @summary Flush pending microtasks and one turn of the event loop
 */
export async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}
