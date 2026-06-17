/**
 * Unit tests for {@link withTimeout} and {@link createDebounce}.
 *
 * @summary Unit tests for timer utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebounce, type DebounceHandle, TimeoutError, withTimeout } from '../src/timer.js';

// ============================================================================
// withTimeout
// ============================================================================

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Normal settlement
  // --------------------------------------------------------------------------

  describe('normal settlement', () => {
    it('resolves with the promise value when it settles before the timeout', async () => {
      const promise = Promise.resolve(42);
      const result = withTimeout(promise, 1000);
      await vi.runAllTimersAsync();
      await expect(result).resolves.toBe(42);
    });

    it('rejects with the promise error when it rejects before the timeout', async () => {
      // Use real timers — fake timers can produce unhandled-rejection false
      // positives when a promise rejects synchronously inside a timer callback.
      vi.useRealTimers();
      try {
        const error = new Error('original error');
        const promise = Promise.reject(error);
        const result = withTimeout(promise, 1000);
        await expect(result).rejects.toBe(error);
      } finally {
        vi.useFakeTimers();
      }
    });

    it('clears the timeout timer when the promise settles first', async () => {
      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
      const promise = Promise.resolve(42);
      const result = withTimeout(promise, 1000);
      await vi.runAllTimersAsync();
      await result;
      // clearTimeout should have been called to cancel the deadline timer
      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });
  });

  // --------------------------------------------------------------------------
  // Timeout rejection
  // --------------------------------------------------------------------------

  describe('timeout rejection', () => {
    it('rejects with a TimeoutError when the deadline expires before settlement', async () => {
      const promise = new Promise(() => {}); // never settles
      const result = withTimeout(promise, 5000);
      vi.advanceTimersByTime(5000);
      await expect(result).rejects.toBeInstanceOf(TimeoutError);
    });

    it('rejects with a default message including the timeout duration', async () => {
      const promise = new Promise(() => {});
      const result = withTimeout(promise, 5000);
      vi.advanceTimersByTime(5000);
      await expect(result).rejects.toThrow('5000');
    });

    it('rejects with a TimeoutError whose name is "TimeoutError"', async () => {
      const promise = new Promise(() => {});
      const result = withTimeout(promise, 100);
      vi.advanceTimersByTime(100);
      try {
        await result;
        expect.fail('should have rejected');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as TimeoutError).name).toBe('TimeoutError');
      }
    });
  });

  // --------------------------------------------------------------------------
  // onTimeout cleanup
  // --------------------------------------------------------------------------

  describe('onTimeout callback', () => {
    it('calls onTimeout before rejecting with TimeoutError', async () => {
      const cleanup = vi.fn();
      const promise = new Promise(() => {});
      const result = withTimeout(promise, 5000, { onTimeout: cleanup });
      vi.advanceTimersByTime(5000);
      await expect(result).rejects.toBeInstanceOf(TimeoutError);
      expect(cleanup).toHaveBeenCalledOnce();
    });

    it('does NOT call onTimeout when the promise settles before the deadline', async () => {
      const cleanup = vi.fn();
      const promise = Promise.resolve(42);
      const result = withTimeout(promise, 5000, { onTimeout: cleanup });
      await vi.runAllTimersAsync();
      await result;
      expect(cleanup).not.toHaveBeenCalled();
    });

    it('calls onTimeout even when it throws (error is caught, timeout still rejects)', async () => {
      const cleanup = vi.fn(() => {
        throw new Error('cleanup failure');
      });
      const promise = new Promise(() => {});
      const result = withTimeout(promise, 1000, { onTimeout: cleanup });
      vi.advanceTimersByTime(1000);
      await expect(result).rejects.toBeInstanceOf(TimeoutError);
      expect(cleanup).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // resolveOnTimeout mode
  // --------------------------------------------------------------------------

  describe('resolveOnTimeout', () => {
    it('resolves with the sentinel value instead of rejecting when resolveOnTimeout is set', async () => {
      const promise = new Promise(() => {});
      const result = withTimeout(promise, 1000, {
        resolveOnTimeout: { error: 'timed out' }
      });
      vi.advanceTimersByTime(1000);
      await expect(result).resolves.toEqual({ error: 'timed out' });
    });

    it('calls onTimeout before resolving with the sentinel', async () => {
      const cleanup = vi.fn();
      const promise = new Promise(() => {});
      const result = withTimeout(promise, 1000, {
        resolveOnTimeout: undefined,
        onTimeout: cleanup
      });
      vi.advanceTimersByTime(1000);
      await expect(result).resolves.toBeUndefined();
      expect(cleanup).toHaveBeenCalledOnce();
    });

    it('still resolves normally when the promise settles before the deadline in resolveOnTimeout mode', async () => {
      const promise = Promise.resolve(42);
      const result = withTimeout(promise, 5000, {
        resolveOnTimeout: { error: 'timed out' }
      });
      await vi.runAllTimersAsync();
      await expect(result).resolves.toBe(42);
    });
  });

  // --------------------------------------------------------------------------
  // AbortSignal integration
  // --------------------------------------------------------------------------

  describe('AbortSignal', () => {
    it('clears the timeout timer when the signal is aborted, letting the promise settle naturally', async () => {
      const controller = new AbortController();
      const promise = new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      const result = withTimeout(promise, 5000, { signal: controller.signal });
      // Abort before the timeout fires
      controller.abort();
      await vi.runAllTimersAsync();
      await expect(result).resolves.toBeUndefined();
    });

    it('does NOT call onTimeout when the signal is aborted', async () => {
      const controller = new AbortController();
      const cleanup = vi.fn();
      const promise = new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      const result = withTimeout(promise, 5000, {
        signal: controller.signal,
        onTimeout: cleanup
      });
      controller.abort();
      await vi.runAllTimersAsync();
      await result;
      expect(cleanup).not.toHaveBeenCalled();
    });

    it('does not abort when the signal was never fired', async () => {
      const controller = new AbortController();
      const promise = new Promise(() => {});
      const result = withTimeout(promise, 1000, { signal: controller.signal });
      vi.advanceTimersByTime(1000);
      await expect(result).rejects.toBeInstanceOf(TimeoutError);
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles zero ms timeout (immediate rejection for unsettled promise)', async () => {
      const promise = new Promise(() => {});
      const result = withTimeout(promise, 0);
      vi.advanceTimersByTime(0);
      await expect(result).rejects.toBeInstanceOf(TimeoutError);
    });

    it('handles promise that resolves synchronously', async () => {
      const promise = Promise.resolve('sync');
      const result = withTimeout(promise, 1000);
      await vi.runAllTimersAsync();
      await expect(result).resolves.toBe('sync');
    });

    it('handles promise that rejects synchronously', async () => {
      // Use real timers — fake timers can produce unhandled-rejection false
      // positives when a promise rejects synchronously inside a timer callback.
      vi.useRealTimers();
      try {
        const error = new Error('sync error');
        const promise = Promise.reject(error);
        const result = withTimeout(promise, 1000);
        await expect(result).rejects.toBe(error);
      } finally {
        vi.useFakeTimers();
      }
    });

    it('accepts unref: true without throwing (unref is a no-op with fake timers)', async () => {
      const promise = new Promise(() => {});
      const result = withTimeout(promise, 5000, { unref: true });
      vi.advanceTimersByTime(5000);
      await expect(result).rejects.toBeInstanceOf(TimeoutError);
    });
  });
});

// ============================================================================
// createDebounce
// ============================================================================

describe('createDebounce', () => {
  let handle: DebounceHandle<(...args: unknown[]) => unknown>;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (handle && !handle.disposed) {
      handle.dispose();
    }
  });

  // --------------------------------------------------------------------------
  // Trailing-edge debounce (default)
  // --------------------------------------------------------------------------

  describe('trailing-edge (default)', () => {
    it('does not invoke fn immediately on first call', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      handle('a');
      expect(fn).not.toHaveBeenCalled();
    });

    it('invokes fn after the debounce window elapses with the latest arguments', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      handle('a');
      handle('b');
      handle('c');
      vi.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith('c');
    });

    it('resets the window on each call', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      handle('a');
      vi.advanceTimersByTime(200);
      handle('b'); // resets window
      vi.advanceTimersByTime(200); // 400ms total, but only 200 since last call
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100); // 500ms total, 300 since last call
      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith('b');
    });

    it('only invokes fn once across many rapid calls', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      for (let i = 0; i < 100; i++) {
        handle(i);
      }
      vi.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith(99);
    });
  });

  // --------------------------------------------------------------------------
  // Leading-edge debounce
  // --------------------------------------------------------------------------

  describe('leading-edge', () => {
    it('invokes fn immediately on first call', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300, { edge: 'leading' });
      handle('a');
      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith('a');
    });

    it('suppresses subsequent calls within the window', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300, { edge: 'leading' });
      handle('a');
      handle('b');
      handle('c');
      expect(fn).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('allows the next call after the window elapses', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300, { edge: 'leading' });
      handle('a');
      expect(fn).toHaveBeenCalledOnce();
      vi.advanceTimersByTime(300);
      handle('b');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('b');
    });
  });

  // --------------------------------------------------------------------------
  // cancel()
  // --------------------------------------------------------------------------

  describe('cancel()', () => {
    it('clears a pending invocation without disposing the handle', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      handle('a');
      handle.cancel();
      vi.advanceTimersByTime(300);
      expect(fn).not.toHaveBeenCalled();
    });

    it('allows the handle to be used after cancel', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      handle('a');
      handle.cancel();
      handle('b');
      vi.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith('b');
    });

    it('is a no-op when there is no pending invocation', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      expect(() => handle.cancel()).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // flush()
  // --------------------------------------------------------------------------

  describe('flush()', () => {
    it('fires a pending invocation immediately', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      handle('a');
      handle.flush();
      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith('a');
    });

    it('clears the pending timer after flush', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      handle('a');
      handle.flush();
      vi.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledOnce(); // no double-invoke
    });

    it('is a no-op when there is no pending invocation', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      expect(() => handle.flush()).not.toThrow();
      expect(fn).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // dispose()
  // --------------------------------------------------------------------------

  describe('dispose()', () => {
    it('cancels a pending invocation and marks the handle as disposed', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      handle('a');
      handle.dispose();
      expect(handle.disposed).toBe(true);
      vi.advanceTimersByTime(300);
      expect(fn).not.toHaveBeenCalled();
    });

    it('makes subsequent calls no-ops', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      handle.dispose();
      handle('a');
      vi.advanceTimersByTime(300);
      expect(fn).not.toHaveBeenCalled();
    });

    it('makes flush a no-op after disposal', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      handle('a');
      handle.dispose();
      handle.flush();
      expect(fn).not.toHaveBeenCalled();
    });

    it('double-dispose is safe', () => {
      handle = createDebounce(vi.fn(), 300);
      handle.dispose();
      expect(() => handle.dispose()).not.toThrow();
      expect(handle.disposed).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // AbortSignal integration
  // --------------------------------------------------------------------------

  describe('AbortSignal', () => {
    it('disposes the handle when the signal is aborted', () => {
      const controller = new AbortController();
      const fn = vi.fn();
      handle = createDebounce(fn, 300, { signal: controller.signal });
      handle('a');
      controller.abort();
      expect(handle.disposed).toBe(true);
      vi.advanceTimersByTime(300);
      expect(fn).not.toHaveBeenCalled();
    });

    it('removes the signal listener on manual dispose', () => {
      const controller = new AbortController();
      const removeListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');
      handle = createDebounce(vi.fn(), 300, { signal: controller.signal });
      handle.dispose();
      expect(removeListenerSpy).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles zero ms debounce', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 0);
      handle('a');
      vi.advanceTimersByTime(0);
      expect(fn).toHaveBeenCalledOnce();
    });

    it('handles fn that throws (error propagates to caller of flush)', () => {
      const error = new Error('fn error');
      const fn = vi.fn(() => {
        throw error;
      });
      handle = createDebounce(fn, 300);
      handle('a');
      expect(() => handle.flush()).toThrow(error);
    });

    it('handles fn that throws on trailing invocation (error does not propagate)', () => {
      // Trailing invocations are fire-and-forget (via setTimeout),
      // so thrown errors should not propagate to the handle caller.
      const error = new Error('fn error');
      const fn = vi.fn(() => {
        throw error;
      });
      handle = createDebounce(fn, 300);
      handle('a');
      // Should not throw when timer fires
      expect(() => vi.advanceTimersByTime(300)).not.toThrow();
      expect(fn).toHaveBeenCalledOnce();
    });

    it('passes multiple arguments to the wrapped function', () => {
      const fn = vi.fn();
      handle = createDebounce(fn, 300);
      handle(1, 'two', { three: true });
      vi.advanceTimersByTime(300);
      expect(fn).toHaveBeenCalledWith(1, 'two', { three: true });
    });
  });
});
