/**
 * Negative assertion helpers for verifying that events do NOT occur.
 *
 * Uses real timers, making it safe for tests that involve real filesystem
 * watchers, real git operations, or any real async I/O.
 *
 * @summary Negative assertion helpers for verifying that events do NOT occur
 */

/**
 * Options for `expectNoEventsRealTime`.
 */
export interface ExpectNoEventsOptions {
  /**
   * How many milliseconds to wait before asserting the spy was not called.
   * Should be set to at least the debounce/poll window of the code under test
   * so that any pending timer-based events would have fired.
   */
  advanceMs: number;
}

/** Minimal shape of a Vitest spy needed by `expectNoEventsRealTime`. */
export interface SpyLike {
  /** Mock metadata provided by Vitest. */
  mock: {
    /** Array of argument lists for each invocation. */
    calls: unknown[][];
  };
}

/**
 * Asserts that a spy/mock is not called after waiting real time.
 *
 * Uses a real `setTimeout` delay, making it safe for use in tests that involve
 * real filesystem watchers, real git operations, or any real async I/O that
 * would be disrupted by fake timers.
 *
 * Use this when tests interact with real filesystem watchers or other real I/O:
 * ```typescript
 * // Tests with real git repos and filesystem watchers:
 * await expectNoEventsRealTime(spy, { advanceMs: 1000 });
 * expect(spy).not.toHaveBeenCalled();
 * ```
 *
 * @summary Assert a spy is not called after waiting real time
 * @param spy - Vitest spy or mock function to assert against.
 * @param options - Configuration including how long to wait.
 */
export async function expectNoEventsRealTime(spy: SpyLike, options: ExpectNoEventsOptions): Promise<void> {
  const callsBefore = spy.mock.calls.length;

  await new Promise<void>((resolve) => setTimeout(resolve, options.advanceMs));

  const callsAfter = spy.mock.calls.length;
  if (callsAfter !== callsBefore) {
    throw new Error(
      `expectNoEventsRealTime: spy was called ${callsAfter - callsBefore} time(s) after waiting ${options.advanceMs}ms`
    );
  }
}
