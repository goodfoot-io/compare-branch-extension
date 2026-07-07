// @vitest-environment jsdom

/**
 * Tests for the stream store initialization and postMessage handling.
 *
 * Tests the `buildInitialState` and `applyMessage` functions by exercising
 * the store module directly. Since the store initializes at import time,
 * we test the exported store after setting up `window.__STREAM_INIT__`
 * and use the message event listener that the module registers.
 *
 * @summary Tests for stream store initialization and message handling
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import type { HostToIframeMessage, StreamStoreState } from '../../src/stream-store/types.js';
import { COMPACT_TAIL_LINES } from '../../src/stream-store/types.js';

let store: StoreApi<StreamStoreState>;

/**
 * Dispatches a host-to-iframe message event on window.
 *
 * @param msg - The message to dispatch.
 */
function dispatchHostMessage(msg: HostToIframeMessage): void {
  window.dispatchEvent(new MessageEvent('message', { data: msg }));
}

// Set up __STREAM_INIT__ before importing the store module.
// All tests share one store instance — order matters.
beforeAll(async () => {
  window.__STREAM_INIT__ = {
    primary: 'session.jsonl',
    files: {
      'session.jsonl': {
        meta: { lineCount: 2, sessionId: 's1', isActive: true },
        lines: ['line1', 'line2']
      },
      'other.jsonl': {
        meta: { lineCount: 5, isActive: false },
        lines: ['a', 'b', 'c', 'd', 'e']
      }
    },
    availableFiles: ['session.jsonl', 'other.jsonl'],
    mode: 'compact'
  };
  const mod = await import('../../src/stream-store/store.js');
  store = mod.streamStore;
});

describe('stream store', () => {
  describe('initialization', () => {
    it('should initialize primary from __STREAM_INIT__', () => {
      expect(store.getState().primary).toBe('session.jsonl');
    });

    it('should set connected to true', () => {
      expect(store.getState().connected).toBe(true);
    });

    it('should populate availableFiles', () => {
      expect(store.getState().availableFiles).toEqual(['session.jsonl', 'other.jsonl']);
    });

    it('should create file entries with correct metadata', () => {
      const file = store.getState().files.get('session.jsonl');
      expect(file).toBeDefined();
      expect(file!.filename).toBe('session.jsonl');
      expect(file!.meta.isActive).toBe(true);
      expect(file!.meta.lineCount).toBe(2);
      expect(file!.meta.sessionId).toBe('s1');
      expect(file!.lines).toEqual(['line1', 'line2']);
    });

    it('should mark primary file as subscribed', () => {
      expect(store.getState().files.get('session.jsonl')!.isSubscribed).toBe(true);
    });

    it('should mark non-primary files as not subscribed', () => {
      expect(store.getState().files.get('other.jsonl')!.isSubscribed).toBe(false);
    });

    it('should initialize isLoading as false and error as null', () => {
      const file = store.getState().files.get('session.jsonl')!;
      expect(file.isLoading).toBe(false);
      expect(file.error).toBeNull();
    });

    it('should initialize mode from __STREAM_INIT__', () => {
      expect(store.getState().mode).toBe('compact');
    });
  });

  describe('message handling', () => {
    it('should append line on stream:line message', () => {
      const file0 = store.getState().files.get('session.jsonl')!;
      const linesBefore = file0.lines.length;
      // The expected next line number is headLineNumber + current length.
      const nextLineNumber = file0.headLineNumber + linesBefore;

      dispatchHostMessage({
        type: 'stream:line',
        filename: 'session.jsonl',
        lineNumber: nextLineNumber,
        line: 'appended-line'
      });

      const file = store.getState().files.get('session.jsonl')!;
      expect(file.lines).toHaveLength(linesBefore + 1);
      expect(file.lines[file.lines.length - 1]).toBe('appended-line');
      expect(file.meta.lineCount).toBe(linesBefore + 1);
    });

    it('should ignore stream:line for unknown files', () => {
      const stateBefore = store.getState();

      dispatchHostMessage({
        type: 'stream:line',
        filename: 'unknown.jsonl',
        lineNumber: 1,
        line: 'should be ignored'
      });

      // files Map reference should be unchanged
      expect(store.getState().files).toBe(stateBefore.files);
    });

    it('should update meta on stream:started for new file', () => {
      dispatchHostMessage({
        type: 'stream:started',
        filename: 'new-stream.jsonl',
        meta: { lineCount: 0, title: 'New Stream', isActive: true }
      });

      const file = store.getState().files.get('new-stream.jsonl')!;
      expect(file.meta.isActive).toBe(true);
      expect(file.meta.title).toBe('New Stream');
      expect(file.lines).toEqual([]);
    });

    it('should update meta on stream:ended preserving lines', () => {
      dispatchHostMessage({
        type: 'stream:ended',
        filename: 'session.jsonl',
        meta: { lineCount: 99, isActive: false }
      });

      const file = store.getState().files.get('session.jsonl')!;
      expect(file.meta.isActive).toBe(false);
      expect(file.lines.length).toBeGreaterThan(0);
    });

    it('should preserve sidecar role/agentId across stream:ended, which only carries lineCount/isActive', () => {
      dispatchHostMessage({
        type: 'stream:started',
        filename: 'subagent.jsonl',
        meta: { lineCount: 3, isActive: true, role: 'subagent', agentId: 'agent-9' }
      });
      dispatchHostMessage({
        type: 'stream:ended',
        filename: 'subagent.jsonl',
        meta: { lineCount: 3, isActive: false }
      });

      const file = store.getState().files.get('subagent.jsonl')!;
      expect(file.meta.isActive).toBe(false);
      expect(file.meta.role).toBe('subagent');
      expect(file.meta.agentId).toBe('agent-9');
    });

    it('should update availableFiles', () => {
      dispatchHostMessage({
        type: 'availableFiles:update',
        files: ['session.jsonl', 'other.jsonl', 'third.jsonl']
      });

      expect(store.getState().availableFiles).toEqual(['session.jsonl', 'other.jsonl', 'third.jsonl']);
    });

    it('should populate file on successful subscribe:response', () => {
      dispatchHostMessage({
        type: 'subscribe:response',
        filename: 'subscribed.jsonl',
        lines: ['sub1', 'sub2'],
        meta: { lineCount: 2, isActive: false }
      });

      const file = store.getState().files.get('subscribed.jsonl')!;
      expect(file.isSubscribed).toBe(true);
      expect(file.isLoading).toBe(false);
      expect(file.error).toBeNull();
      expect(file.lines).toEqual(['sub1', 'sub2']);
      expect(file.meta.lineCount).toBe(2);
    });

    it('should set error on failed subscribe:response', () => {
      dispatchHostMessage({
        type: 'subscribe:response',
        filename: 'error-file.jsonl',
        lines: [],
        meta: { lineCount: 0, isActive: true },
        error: 'File not found'
      });

      const file = store.getState().files.get('error-file.jsonl')!;
      expect(file.isSubscribed).toBe(false);
      expect(file.isLoading).toBe(false);
      expect(file.error).toBe('File not found');
    });

    it('should ignore non-object messages', () => {
      const stateBefore = store.getState();
      window.dispatchEvent(new MessageEvent('message', { data: 'not an object' }));
      window.dispatchEvent(new MessageEvent('message', { data: null }));
      window.dispatchEvent(new MessageEvent('message', { data: 42 }));
      expect(store.getState()).toBe(stateBefore);
    });

    it('should ignore messages without type field', () => {
      const stateBefore = store.getState();
      window.dispatchEvent(new MessageEvent('message', { data: { foo: 'bar' } }));
      expect(store.getState()).toBe(stateBefore);
    });

    it('should apply CSS variables and theme attribute on theme:change', () => {
      dispatchHostMessage({
        type: 'theme:change',
        themeKind: 1,
        cssVariables: {
          '--vscode-editor-background': '#ffffff',
          '--vscode-editor-foreground': '#000000'
        }
      });

      expect(document.documentElement.getAttribute('data-vscode-theme-kind')).toBe('light');
      expect(document.documentElement.style.getPropertyValue('--vscode-editor-background')).toBe('#ffffff');
      expect(document.documentElement.style.getPropertyValue('--vscode-editor-foreground')).toBe('#000000');
    });

    it('should update theme attribute when theme kind changes', () => {
      dispatchHostMessage({
        type: 'theme:change',
        themeKind: 2,
        cssVariables: { '--vscode-editor-background': '#1e1e1e' }
      });
      expect(document.documentElement.getAttribute('data-vscode-theme-kind')).toBe('dark');

      dispatchHostMessage({
        type: 'theme:change',
        themeKind: 3,
        cssVariables: { '--vscode-editor-background': '#000000' }
      });
      expect(document.documentElement.getAttribute('data-vscode-theme-kind')).toBe('high-contrast');
    });

    it('should not change store state on theme:change', () => {
      const stateBefore = store.getState();
      dispatchHostMessage({
        type: 'theme:change',
        themeKind: 1,
        cssVariables: { '--vscode-editor-background': '#fff' }
      });
      expect(store.getState()).toBe(stateBefore);
    });

    describe('subscribe:response merge', () => {
      it('should use response lines directly when response has more lines than store', () => {
        // Establish a known baseline: subscribe a fresh file with 2 lines
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'merge-test.jsonl',
          lines: ['base1', 'base2'],
          meta: { lineCount: 2, isActive: true }
        });
        expect(store.getState().files.get('merge-test.jsonl')!.lines).toEqual(['base1', 'base2']);

        // Now dispatch a subscribe:response with more lines — should replace entirely
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'merge-test.jsonl',
          lines: ['r1', 'r2', 'r3', 'r4'],
          meta: { lineCount: 4, isActive: true }
        });

        const lines = store.getState().files.get('merge-test.jsonl')!.lines;
        // Response had more lines than store — result is exactly the response lines
        expect(lines).toEqual(['r1', 'r2', 'r3', 'r4']);
      });

      it('should append store tail when store has more lines than response (live-event accumulation)', () => {
        // Start with a known 3-line state via subscribe:response
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'live-test.jsonl',
          lines: ['hist1', 'hist2', 'hist3'],
          meta: { lineCount: 3, isActive: true }
        });

        // Simulate two live events arriving before the next subscribe:response
        dispatchHostMessage({ type: 'stream:line', filename: 'live-test.jsonl', lineNumber: 4, line: 'live4' });
        dispatchHostMessage({ type: 'stream:line', filename: 'live-test.jsonl', lineNumber: 5, line: 'live5' });
        expect(store.getState().files.get('live-test.jsonl')!.lines).toHaveLength(5);

        // subscribe:response arrives with only 3 lines (fetch completed before live events)
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'live-test.jsonl',
          lines: ['hist1', 'hist2', 'hist3'],
          meta: { lineCount: 3, isActive: true }
        });

        const lines = store.getState().files.get('live-test.jsonl')!.lines;
        // Response had fewer lines than store — historical lines plus live tail preserved
        expect(lines).toEqual(['hist1', 'hist2', 'hist3', 'live4', 'live5']);
      });
    });

    describe('offset-aware merge (absolute line numbers)', () => {
      it('appends a stream:line whose lineNumber is exactly the expected next', () => {
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'append-test.jsonl',
          lines: ['a1', 'a2', 'a3'],
          meta: { lineCount: 3, isActive: true }
        });
        // headLineNumber=1, length=3 → expected next is 4.
        dispatchHostMessage({ type: 'stream:line', filename: 'append-test.jsonl', lineNumber: 4, line: 'a4' });

        const file = store.getState().files.get('append-test.jsonl')!;
        expect(file.lines).toEqual(['a1', 'a2', 'a3', 'a4']);
        expect(file.headLineNumber).toBe(1);
        expect(file.meta.lineCount).toBe(4);
      });

      it('drops a stream:line that repeats an already-known line number (duplicate re-delivery)', () => {
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'dup-test.jsonl',
          lines: ['d1', 'd2', 'd3'],
          meta: { lineCount: 3, isActive: true }
        });
        const before = store.getState().files.get('dup-test.jsonl')!;

        // lineNumber 3 was already delivered — drop it, leaving state untouched.
        dispatchHostMessage({ type: 'stream:line', filename: 'dup-test.jsonl', lineNumber: 3, line: 'dup' });

        const after = store.getState().files.get('dup-test.jsonl')!;
        expect(after.lines).toEqual(['d1', 'd2', 'd3']);
        expect(after.headLineNumber).toBe(before.headLineNumber);
      });

      it('drops a stream:line that skips ahead of the expected next (a gap)', () => {
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'gap-test.jsonl',
          lines: ['g1', 'g2', 'g3'],
          meta: { lineCount: 3, isActive: true }
        });

        // Expected next is 4; a jump to 6 leaves a hole — drop and wait for a
        // resubscribe to backfill rather than corrupting the offset.
        dispatchHostMessage({ type: 'stream:line', filename: 'gap-test.jsonl', lineNumber: 6, line: 'g6' });

        const file = store.getState().files.get('gap-test.jsonl')!;
        expect(file.lines).toEqual(['g1', 'g2', 'g3']);
      });

      it('re-issues subscribe with the compact tail on connection:restored (no reset)', () => {
        // Subscribe a fresh file so it is marked isSubscribed for the resubscribe pass.
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'reconnect-test.jsonl',
          lines: ['x1', 'x2'],
          meta: { lineCount: 2, isActive: true }
        });
        const before = store.getState().files.get('reconnect-test.jsonl')!;

        // In jsdom window.parent === window, so subscribe() posts via window.postMessage.
        const spy = vi.spyOn(window, 'postMessage');
        dispatchHostMessage({ type: 'connection:restored' });

        const resubscribe = spy.mock.calls
          .map((call) => call[0])
          .find(
            (m) =>
              m !== null &&
              typeof m === 'object' &&
              (m as { type?: string }).type === 'subscribe' &&
              (m as { filename?: string }).filename === 'reconnect-test.jsonl'
          ) as { tail?: number } | undefined;

        expect(resubscribe).toBeDefined();
        // compact mode (the shared store's mode) requests only the trailing window.
        expect(resubscribe!.tail).toBe(COMPACT_TAIL_LINES);
        // No upfront reset — local lines are left in place until the response merges.
        expect(store.getState().files.get('reconnect-test.jsonl')!.lines).toEqual(before.lines);

        spy.mockRestore();
      });

      it('keeps live lines 41 and 42 when a stale 40-line subscribe:response races behind them', () => {
        // Seed 40 lines (numbered 1..40) via a subscribe:response.
        const first40 = Array.from({ length: 40 }, (_, i) => `L${i + 1}`);
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'race-test.jsonl',
          lines: first40,
          meta: { lineCount: 40, isActive: true }
        });

        // Two live lines (41, 42) arrive over the fast WebSocket.
        dispatchHostMessage({ type: 'stream:line', filename: 'race-test.jsonl', lineNumber: 41, line: 'L41' });
        dispatchHostMessage({ type: 'stream:line', filename: 'race-test.jsonl', lineNumber: 42, line: 'L42' });
        expect(store.getState().files.get('race-test.jsonl')!.lines).toHaveLength(42);

        // A subscribe:response built from an earlier disk read (only 40 lines)
        // lands AFTER the live events — a positional merge would drop 41/42.
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'race-test.jsonl',
          lines: first40,
          meta: { lineCount: 40, isActive: true }
        });

        const file = store.getState().files.get('race-test.jsonl')!;
        expect(file.lines).toHaveLength(42);
        expect(file.lines[40]).toBe('L41');
        expect(file.lines[41]).toBe('L42');
        expect(file.meta.lineCount).toBe(42);
      });

      it('drops a server-restart renumbered-from-1 burst up to known and appends only the new tail', () => {
        // Known state: lines 1..3.
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'restart-test.jsonl',
          lines: ['s1', 's2', 's3'],
          meta: { lineCount: 3, isActive: true }
        });

        // Server restarts and reseeds its cursor to 0, rebroadcasting the whole
        // file renumbered from 1. Lines 1..3 fail the expected-next check (they
        // repeat known numbers) and are dropped; line 4 is the genuinely-new tail.
        for (const [i, line] of ['s1', 's2', 's3', 's4-new'].entries()) {
          dispatchHostMessage({
            type: 'stream:line',
            filename: 'restart-test.jsonl',
            lineNumber: i + 1,
            line
          });
        }

        const file = store.getState().files.get('restart-test.jsonl')!;
        expect(file.lines).toEqual(['s1', 's2', 's3', 's4-new']);
        expect(file.meta.lineCount).toBe(4);
      });

      it('caps compact-mode lines to COMPACT_TAIL_LINES and advances headLineNumber', () => {
        // Seed the first line, then append sequentially past the compact cap.
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'cap-test.jsonl',
          lines: ['c1'],
          meta: { lineCount: 1, isActive: true }
        });
        const total = COMPACT_TAIL_LINES + 10;
        for (let n = 2; n <= total; n++) {
          dispatchHostMessage({ type: 'stream:line', filename: 'cap-test.jsonl', lineNumber: n, line: `c${n}` });
        }

        const file = store.getState().files.get('cap-test.jsonl')!;
        expect(file.lines).toHaveLength(COMPACT_TAIL_LINES);
        // The retained window is the trailing COMPACT_TAIL_LINES lines...
        expect(file.lines[file.lines.length - 1]).toBe(`c${total}`);
        // ...and headLineNumber points at the absolute number of lines[0].
        expect(file.headLineNumber).toBe(total - COMPACT_TAIL_LINES + 1);
        expect(file.lines[0]).toBe(`c${file.headLineNumber}`);
        // meta.lineCount still reflects the full stream length, not the window.
        expect(file.meta.lineCount).toBe(total);
      });
    });
  });
});
