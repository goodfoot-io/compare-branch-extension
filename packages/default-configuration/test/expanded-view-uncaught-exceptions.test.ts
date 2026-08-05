// @vitest-environment jsdom

/**
 * Reproduction for the uncaught exceptions that expanded-view-bootstrap-race.test.ts
 * intermittently leaks.
 *
 * Mounting ExpandedView starts assistant-ui's useThreadViewportAutoScroll, which
 * schedules a requestAnimationFrame callback that calls `div.scrollTo(...)` on the
 * thread viewport element. jsdom does not implement Element#scrollTo, so when the
 * frame fires the callback throws `TypeError: div.scrollTo is not a function` —
 * outside any test assertion, surfacing only as a vitest "Unhandled Error" while
 * the test itself still passes. Whether the frame fires before the worker tears
 * down is a timing race, which is why the existing test only leaks intermittently
 * (and why a second, narrower race — a React scheduler tick touching `window`
 * after jsdom teardown — has also been observed).
 *
 * This test forces the race deterministically: it mounts the view exactly like
 * the bootstrap-race test, then keeps the jsdom window alive long enough for the
 * animation-frame timer to fire, capturing every uncaught exception and window
 * error raised in that span. It MUST FAIL against the unfixed environment.
 *
 * @summary Reproduction: ExpandedView mount leaks uncaught exceptions from async callbacks
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

// jsdom has no ResizeObserver; assistant-ui's ThreadPrimitive.Viewport observes
// its own size via one (useOnResizeContent), so a real DOM mount needs a stub
// or the mount throws before any assertion runs.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// Hoisted so the mock factory can reference these identifiers.
const { mockGetState, mockSubscribe } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
  mockSubscribe: vi.fn()
}));

/** A valid assistant JSONL line that parseLines converts to a SessionMsg. */
const ASSISTANT_LINE = JSON.stringify({
  type: 'assistant',
  message: { content: [{ type: 'text', text: 'Hello from assistant.' }] }
});

/**
 * Store state with a populated primary file so the transcript renders content
 * and the auto-scroll effect has a scroll target to act on.
 * @returns A store state whose primary file contains three assistant lines.
 */
function populatedStoreState() {
  return {
    primary: 'session.jsonl',
    files: new Map([
      [
        'session.jsonl',
        {
          filename: 'session.jsonl',
          meta: { lineCount: 3, isActive: false },
          lines: [ASSISTANT_LINE, ASSISTANT_LINE, ASSISTANT_LINE],
          isSubscribed: true,
          isLoading: false,
          error: null
        }
      ]
    ]),
    availableFiles: ['session.jsonl'],
    connected: true,
    mode: 'expanded' as const
  };
}

vi.mock('@cards.management/sdk/stream-store', () => ({
  streamStore: {
    getState: mockGetState,
    subscribe: mockSubscribe.mockImplementation(() => () => {})
  },
  close: vi.fn()
}));

describe('ExpandedView async callbacks', () => {
  it('raises no uncaught exceptions when animation frames fire after mount', async () => {
    const captured: unknown[] = [];
    const onUncaught = (error: unknown): void => {
      captured.push(error);
    };
    const onWindowError = (event: ErrorEvent): void => {
      captured.push(event.error ?? event.message);
      event.preventDefault();
    };
    // The auto-scroll callback throws from inside a jsdom timer, so it reaches
    // Node as a process-level uncaught exception rather than a test failure —
    // capture it there, and on the window for errors jsdom reports itself.
    process.prependListener('uncaughtException', onUncaught);
    window.addEventListener('error', onWindowError);

    try {
      mockGetState.mockReturnValue(populatedStoreState());

      // Dynamic import so vi.mock is in place before the component module loads.
      const { ExpandedView } = await import(
        '../src/streams/claude-code-session/www/components/expanded/ExpandedView.js'
      );

      const container = document.createElement('div');
      const root = createRoot(container);

      await act(async () => {
        root.render(React.createElement(ExpandedView));
      });

      // Keep the jsdom window alive across several animation-frame intervals
      // (jsdom drives requestAnimationFrame off a ~16ms timer) so the
      // auto-scroll callback fires while the environment still exists —
      // deterministically forcing what the bootstrap-race test only hits when
      // the worker happens to tear down slowly.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await act(async () => {
        root.unmount();
      });

      // Drain anything still scheduled after unmount (pending frames, React
      // scheduler ticks) while the window is alive, so nothing is left to fire
      // against a torn-down environment.
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      process.removeListener('uncaughtException', onUncaught);
      window.removeEventListener('error', onWindowError);
    }

    expect(captured).toEqual([]);
  });
});
