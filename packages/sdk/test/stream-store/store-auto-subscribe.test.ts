// @vitest-environment jsdom

/**
 * Tests for the auto-subscribe side effect in the stream store.
 *
 * The store fires a `subscribe` postMessage during module initialization
 * when the primary file has empty lines. Because the side effect runs at
 * module scope (not inside a function), each test must import a fresh
 * module instance to observe the correct behavior.
 *
 * @summary Auto-subscribe behavior tests for stream store module init
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StreamDisplayMode, StreamInitData } from '../../src/stream-store/types.js';
import { COMPACT_TAIL_LINES } from '../../src/stream-store/types.js';

/**
 * Builds a minimal StreamInitData for testing.
 *
 * @param primaryLines - Lines for the primary file.
 * @param mode - Display mode for the iframe (defaults to compact).
 * @returns StreamInitData with a single primary file.
 */
function buildInitData(primaryLines: string[], mode: StreamDisplayMode = 'compact'): StreamInitData {
  return {
    primary: 'session.jsonl',
    files: {
      'session.jsonl': {
        meta: { lineCount: primaryLines.length, isActive: true },
        lines: primaryLines
      }
    },
    availableFiles: ['session.jsonl'],
    mode
  };
}

beforeEach(() => {
  vi.resetModules();
});

describe('stream store auto-subscribe', () => {
  it('should post a subscribe message for the primary file when primary lines are empty', async () => {
    window.__STREAM_INIT__ = buildInitData([]);

    // In jsdom, window.parent === window, so spy on window.postMessage
    const spy = vi.spyOn(window, 'postMessage');

    await import('../../src/stream-store/store.js');

    const subscribeCalls = spy.mock.calls.filter(
      (call) =>
        call[0] !== null &&
        typeof call[0] === 'object' &&
        (call[0] as { type?: string }).type === 'subscribe' &&
        (call[0] as { filename?: string }).filename === 'session.jsonl'
    );

    expect(subscribeCalls).toHaveLength(1);

    spy.mockRestore();
  });

  it('should not post a subscribe message for the primary file when primary lines are non-empty', async () => {
    window.__STREAM_INIT__ = buildInitData(['existing-line']);

    const spy = vi.spyOn(window, 'postMessage');

    await import('../../src/stream-store/store.js');

    const subscribeCalls = spy.mock.calls.filter(
      (call) =>
        call[0] !== null &&
        typeof call[0] === 'object' &&
        (call[0] as { type?: string }).type === 'subscribe' &&
        (call[0] as { filename?: string }).filename === 'session.jsonl'
    );

    expect(subscribeCalls).toHaveLength(0);

    spy.mockRestore();
  });

  it('should request only the trailing tail in compact mode', async () => {
    window.__STREAM_INIT__ = buildInitData([], 'compact');

    const spy = vi.spyOn(window, 'postMessage');

    await import('../../src/stream-store/store.js');

    const subscribeCall = spy.mock.calls.find((call) => (call[0] as { type?: string })?.type === 'subscribe')?.[0] as {
      tail?: number;
    };

    expect(subscribeCall).toBeDefined();
    expect(subscribeCall.tail).toBe(COMPACT_TAIL_LINES);

    spy.mockRestore();
  });

  it('should request the full transcript (no tail) in expanded mode', async () => {
    window.__STREAM_INIT__ = buildInitData([], 'expanded');

    const spy = vi.spyOn(window, 'postMessage');

    await import('../../src/stream-store/store.js');

    const subscribeCall = spy.mock.calls.find(
      (call) => (call[0] as { type?: string })?.type === 'subscribe'
    )?.[0] as Record<string, unknown>;

    expect(subscribeCall).toBeDefined();
    expect(subscribeCall).not.toHaveProperty('tail');

    spy.mockRestore();
  });
});
