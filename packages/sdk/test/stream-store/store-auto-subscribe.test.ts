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
import type { StreamInitData } from '../../src/stream-store/types.js';

/**
 * Builds a minimal StreamInitData for testing.
 *
 * @param primaryLines - Lines for the primary file.
 * @returns StreamInitData with a single primary file.
 */
function buildInitData(primaryLines: string[]): StreamInitData {
  return {
    primary: 'session.jsonl',
    files: {
      'session.jsonl': {
        meta: { lineCount: primaryLines.length, isActive: true },
        lines: primaryLines
      }
    },
    availableFiles: ['session.jsonl'],
    mode: 'compact'
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
});
