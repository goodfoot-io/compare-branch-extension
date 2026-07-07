// @vitest-environment jsdom

/**
 * Regression test: the compact session view must not close a LIVE stream whose
 * primary file is momentarily empty.
 *
 * A live (uncommitted) session's `stream:started` is broadcast by the server
 * with `meta.lineCount: 0` — the cursor sits at offset 0 and the backlog is
 * delivered afterwards, out of band, via an asynchronous `subscribe:response`
 * (the host boots the compact iframe with `lines: []`). CompactView's
 * empty-check effect fires on mount, before that backfill lands, and asks the
 * host to `close()` the renderer whenever `meta.lineCount === 0`.
 *
 * That check is meant to hide genuinely-empty *committed* streams (blank boxes
 * in the timeline), but for a live stream it collapses the pane the moment it
 * opens — the "iframe opens but renders empty mid-session" defect. An active
 * stream is never genuinely empty: it is mid-flight and its lines are still
 * arriving, so it must never be closed for emptiness.
 *
 * These tests assert the CORRECT behavior (a live empty stream stays open and
 * shows its running card), so they MUST FAIL against the unfixed code where
 * `checkEmpty` closes on `lineCount === 0` without regard to liveness.
 *
 * @summary Minimal reproduction: compact view closes a live empty stream
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

// React requires this flag to flush effects synchronously under act() outside a
// browser test runner (jsdom).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Hoisted so the mock factory can reference these identifiers.
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
  meta: { lineCount: number; isActive: boolean; role?: string; agentId?: string };
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
 * Store state for a LIVE stream whose backlog has not been backfilled yet:
 * active, zero lines, `meta.lineCount === 0` (the server's first-encounter seed).
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
 * Store state for a genuinely-empty COMMITTED stream: not active, zero lines.
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

describe('CompactView — live stream must not self-close while empty', () => {
  it('does not ask the host to close a live (active) stream whose backlog has not arrived', async () => {
    mockClose.mockClear();
    mockGetState.mockReturnValue(liveEmptyStoreState());

    const { CompactView } = await import('../src/streams/claude-code-session/www/components/compact/CompactView.js');

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(CompactView));
    });

    // A live stream is mid-flight — its lines arrive via an async
    // subscribe:response. Closing it on the seed's lineCount:0 is the empty-pane
    // bug. The renderer must stay open and show its running card.
    expect(mockClose).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Running');
  });

  it('still closes a genuinely-empty committed (ended) stream', async () => {
    mockClose.mockClear();
    mockGetState.mockReturnValue(committedEmptyStoreState());

    const { CompactView } = await import('../src/streams/claude-code-session/www/components/compact/CompactView.js');

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(CompactView));
    });

    // A settled stream with no lines is a blank box in the timeline — closing it
    // is correct and must be preserved by the fix.
    expect(mockClose).toHaveBeenCalled();
  });
});
