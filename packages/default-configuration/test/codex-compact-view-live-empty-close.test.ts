// @vitest-environment jsdom

/**
 * Regression test: the codex compact view must not close a LIVE stream whose
 * primary file is momentarily empty.
 *
 * Identical defect to the claude-code-session compact view: a live
 * (uncommitted) session's `stream:started` seeds the iframe with
 * `meta.lineCount: 0`, the backlog arrives later via an async
 * `subscribe:response`, and CodexCompactView's empty-check effect asks the host
 * to `close()` on `meta.lineCount === 0` before the backfill lands — collapsing
 * the live pane. An active stream is mid-flight and must never be closed for
 * emptiness.
 *
 * These tests assert the CORRECT behavior, so the live-stream case MUST FAIL
 * against the unfixed code.
 *
 * @summary Minimal reproduction: codex compact view closes a live empty stream
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

// React requires this flag to flush effects synchronously under act() outside a
// browser test runner (jsdom).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { mockGetState, mockSubscribe, mockClose } = vi.hoisted(() => ({
  mockGetState: vi.fn(),
  mockSubscribe: vi.fn(),
  mockClose: vi.fn()
}));

/**
 * Builds a StreamFile-like entry for the files Map.
 * @param overrides - Optional overrides.
 * @param overrides.lineCount - Line count reported in the file metadata.
 * @param overrides.lines - Lines array for the file.
 * @param overrides.isActive - Whether the stream is live (uncommitted).
 * @returns A file entry compatible with the store's files Map shape.
 */
function makeFileEntry(overrides: { lineCount?: number; lines?: string[]; isActive?: boolean } = {}): {
  filename: string;
  meta: { lineCount: number; isActive: boolean };
  lines: string[];
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
} {
  return {
    filename: 'session.jsonl',
    meta: { lineCount: overrides.lineCount ?? 0, isActive: overrides.isActive ?? false },
    lines: overrides.lines ?? [],
    isSubscribed: false,
    isLoading: false,
    error: null
  };
}

/**
 * Store state for a LIVE stream whose backlog has not been backfilled yet.
 * @returns A store state with an active, empty primary file.
 */
function liveEmptyStoreState() {
  return {
    primary: 'session.jsonl',
    files: new Map([['session.jsonl', makeFileEntry({ lineCount: 0, lines: [], isActive: true })]]),
    availableFiles: ['session.jsonl'],
    connected: true,
    mode: 'compact' as const
  };
}

/**
 * Store state for a genuinely-empty COMMITTED stream.
 * @returns A store state with a settled, empty primary file.
 */
function committedEmptyStoreState() {
  return {
    primary: 'session.jsonl',
    files: new Map([['session.jsonl', makeFileEntry({ lineCount: 0, lines: [], isActive: false })]]),
    availableFiles: ['session.jsonl'],
    connected: true,
    mode: 'compact' as const
  };
}

vi.mock('@cards.management/sdk/stream-store', () => ({
  streamStore: {
    getState: mockGetState,
    subscribe: mockSubscribe.mockImplementation(() => () => {})
  },
  close: mockClose
}));

describe('CodexCompactView — live stream must not self-close while empty', () => {
  it('does not ask the host to close a live (active) stream whose backlog has not arrived', async () => {
    mockClose.mockClear();
    mockGetState.mockReturnValue(liveEmptyStoreState());

    const { CodexCompactView } = await import(
      '../src/streams/codex-session/www/components/compact/CodexCompactView.js'
    );

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(CodexCompactView));
    });

    expect(mockClose).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Running');
  });

  it('still closes a genuinely-empty committed (ended) stream', async () => {
    mockClose.mockClear();
    mockGetState.mockReturnValue(committedEmptyStoreState());

    const { CodexCompactView } = await import(
      '../src/streams/codex-session/www/components/compact/CodexCompactView.js'
    );

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(CodexCompactView));
    });

    expect(mockClose).toHaveBeenCalled();
  });
});
