/**
 * Timer utilities: `withTimeout` and `createDebounce`.
 *
 * `withTimeout` races a promise against a deadline, rejecting with a
 * `TimeoutError` (or resolving with a sentinel value when `resolveOnTimeout`
 * is set). An optional `onTimeout` callback runs for cleanup before settlement.
 *
 * `createDebounce` wraps a function so rapid successive calls are collapsed
 * into a single trailing (or leading) invocation. The returned handle is
 * callable, cancelable, flushable, and disposable.
 *
 * Both utilities are environment-agnostic — they use global `setTimeout` /
 * `clearTimeout` and work in Node.js and browser contexts without polyfills.
 *
 * @summary Promise timeout and debounce utilities
 * @module
 */

// ============================================================================
// TimeoutError
// ============================================================================

/** Error thrown by `withTimeout` when the deadline expires. */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ============================================================================
// withTimeout
// ============================================================================

/** Options for {@link withTimeout}. */
export interface WithTimeoutOptions {
  /**
   * Called before the timeout settles (reject or resolve).
   * Use for cleanup: kill a subprocess, remove an event listener, delete a
   * map entry, clear an interval, dispose a subscription.
   */
  onTimeout?: () => void;

  /**
   * When set, `withTimeout` resolves with this value on timeout instead of
   * rejecting. The returned promise type widens to include this sentinel.
   * Used by sites that signal timeout via a resolve-value rather than an error.
   */
  resolveOnTimeout?: unknown;

  /**
   * An `AbortSignal` that, when aborted, causes the timeout timer to be
   * cleared and the underlying promise to settle naturally (without the
   * timeout forcing an early resolution).
   */
  signal?: AbortSignal;
}

/**
 * Race `promise` against a deadline.
 *
 * If `promise` settles before `ms` milliseconds elapse the result is
 * forwarded unchanged and the timer is cleared.  If the deadline fires
 * first and `resolveOnTimeout` is unset the returned promise rejects with a
 * `TimeoutError`.  If `resolveOnTimeout` is set the promise resolves with
 * that value instead.
 *
 * The timer is always cleaned up when the returned promise settles,
 * regardless of which path wins.
 *
 * @param promise  - The promise to race against the deadline.
 * @param ms       - Timeout in milliseconds.
 * @param opts     - Optional callbacks and configuration.
 * @returns A promise that settles with `promise`'s value, rejects with a
 *          `TimeoutError`, or resolves with `opts.resolveOnTimeout`.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, opts?: WithTimeoutOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const { onTimeout, resolveOnTimeout, signal } = opts ?? {};

    // Check if the signal is already aborted — if so, forward the promise
    // without arming a timeout.
    if (signal?.aborted) {
      promise.then(resolve, reject);
      return;
    }

    let timerId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      timerId = null;

      // Run the onTimeout cleanup callback before settling.
      // If cleanup throws, catch it so we can still settle; the throw
      // happened during a fire-and-forget cleanup path.
      if (onTimeout) {
        try {
          onTimeout();
        } catch (cleanupError) {
          // Log the cleanup failure but still settle the returned promise.
          if (typeof console !== 'undefined') {
            console.warn('[withTimeout] onTimeout callback threw during timeout cleanup:', cleanupError);
          }
        }
      }

      if (resolveOnTimeout !== undefined || 'resolveOnTimeout' in (opts ?? {})) {
        resolve(resolveOnTimeout as T);
      } else {
        reject(new TimeoutError(`Operation timed out after ${ms}ms`));
      }
    }, ms);

    // If the timeout is zero or negative, we want the timer to fire
    // in the same microtask-scheduling order as `setTimeout(fn, 0)`
    // would.  Vitest fake timers treat `setTimeout(fn, 0)` as
    // pending — which is what existing code expects.

    // AbortSignal listener: clear the timer when aborted so the
    // underlying promise can settle naturally without the deadline.
    const onAbort = (): void => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    // Settle handler: always clear the timer (whichever path wins)
    // and remove the abort listener.
    const settle = (): void => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      signal?.removeEventListener('abort', onAbort);
    };

    promise.then(
      (value) => {
        settle();
        resolve(value);
      },
      (error) => {
        settle();
        reject(error);
      }
    );
  });
}

// ============================================================================
// createDebounce
// ============================================================================

/**
 * A callable, disposable handle returned by {@link createDebounce}.
 *
 * Calling the handle resets the debounce window.  Methods control the
 * lifecycle of a pending invocation.
 */
export interface DebounceHandle<T extends (...args: unknown[]) => unknown> {
  /** Reset the debounce window with new arguments. */
  (...args: Parameters<T>): void;

  /** Clear a pending invocation without disposing the handle. */
  cancel(): void;

  /** Fire a pending invocation immediately and clear the timer. */
  flush(): void;

  /** Cancel any pending invocation and permanently disable the handle. */
  dispose(): void;

  /** Whether `dispose()` has been called. */
  readonly disposed: boolean;
}

/** Options for {@link createDebounce}. */
export interface CreateDebounceOptions {
  /**
   * When `'leading'`, the function fires immediately on the first call and
   * suppresses subsequent calls within the window.  Defaults to `'trailing'`
   * (fire after the window elapses with the latest arguments).
   */
  edge?: 'leading' | 'trailing';

  /**
   * An `AbortSignal` that, when aborted, calls `dispose()` on the handle.
   * After disposal the handle is a no-op.
   */
  signal?: AbortSignal;
}

/**
 * Create a debounced version of `fn`.
 *
 * Returns a callable handle.  Each call resets the debounce window; `fn` is
 * only invoked after `ms` milliseconds of inactivity (trailing edge, the
 * default) or immediately on the first call (leading edge).
 *
 * The handle is also an `AbortSignal` listener — passing `{ signal }` ties
 * the handle's lifetime to that signal.
 *
 * @param fn   - The function to debounce.
 * @param ms   - Debounce window in milliseconds.
 * @param opts - Optional configuration.
 * @returns A debounced callable handle with lifecycle methods.
 */
export function createDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
  opts?: CreateDebounceOptions
): DebounceHandle<T> {
  const edge = opts?.edge ?? 'trailing';
  const signal = opts?.signal;
  let disposed = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;
  let leadingLocked = false;

  const clearTimer = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  const invoke = (args: Parameters<T>): void => {
    pendingArgs = null;
    fn(...args);
  };

  const invokeSafe = (args: Parameters<T>): void => {
    try {
      invoke(args);
    } catch (error) {
      // Trailing invocations are fire-and-forget (via setTimeout),
      // so thrown errors cannot propagate to the handle caller.
      if (typeof console !== 'undefined') {
        console.warn('[createDebounce] debounced function threw:', error);
      }
    }
  };

  const onAbort = (): void => {
    dispose();
  };

  signal?.addEventListener('abort', onAbort, { once: true });

  function handle(this: unknown, ...args: Parameters<T>): void {
    if (disposed) return;

    if (edge === 'leading') {
      if (!leadingLocked) {
        leadingLocked = true;
        invoke(args);
        timerId = setTimeout(() => {
          leadingLocked = false;
          timerId = null;
        }, ms);
      }
      return;
    }

    // Trailing edge: store latest args, reset window.
    pendingArgs = args;
    clearTimer();
    timerId = setTimeout(() => {
      timerId = null;
      if (pendingArgs !== null) {
        invokeSafe(pendingArgs);
      }
    }, ms);
  }

  function cancel(): void {
    clearTimer();
    pendingArgs = null;
  }

  function flush(): void {
    if (disposed) return;
    if (edge === 'leading') return; // nothing pending for leading edge
    if (pendingArgs !== null) {
      clearTimer();
      invoke(pendingArgs);
    }
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    clearTimer();
    pendingArgs = null;
    signal?.removeEventListener('abort', onAbort);
  }

  handle.cancel = cancel;
  handle.flush = flush;
  handle.dispose = dispose;
  Object.defineProperty(handle, 'disposed', {
    get: () => disposed,
    enumerable: true,
    configurable: false
  });

  return handle as DebounceHandle<T>;
}
