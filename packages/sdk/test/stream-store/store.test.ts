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

import { beforeAll, describe, expect, it } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import type { HostToIframeMessage, StreamStoreState } from '../../src/stream-store/types.js';

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
        meta: { status: 'active', lineCount: 2, sessionId: 's1' },
        lines: ['line1', 'line2']
      },
      'other.jsonl': {
        meta: { status: 'completed', lineCount: 5 },
        lines: ['a', 'b', 'c', 'd', 'e']
      }
    },
    availableFiles: ['session.jsonl', 'other.jsonl'],
    mode: 'hidden'
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
      expect(file!.meta.status).toBe('active');
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
      expect(store.getState().mode).toBe('hidden');
    });
  });

  describe('message handling', () => {
    it('should append line on stream:line message', () => {
      const linesBefore = store.getState().files.get('session.jsonl')!.lines.length;

      dispatchHostMessage({
        type: 'stream:line',
        filename: 'session.jsonl',
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
        line: 'should be ignored'
      });

      // files Map reference should be unchanged
      expect(store.getState().files).toBe(stateBefore.files);
    });

    it('should update meta on stream:started for new file', () => {
      dispatchHostMessage({
        type: 'stream:started',
        filename: 'new-stream.jsonl',
        meta: { status: 'active', lineCount: 0, title: 'New Stream' }
      });

      const file = store.getState().files.get('new-stream.jsonl')!;
      expect(file.meta.status).toBe('active');
      expect(file.meta.title).toBe('New Stream');
      expect(file.lines).toEqual([]);
    });

    it('should update meta on stream:ended preserving lines', () => {
      dispatchHostMessage({
        type: 'stream:ended',
        filename: 'session.jsonl',
        meta: { status: 'completed', lineCount: 99, closedAt: '2026-01-01T00:00:00Z' }
      });

      const file = store.getState().files.get('session.jsonl')!;
      expect(file.meta.status).toBe('completed');
      expect(file.meta.closedAt).toBe('2026-01-01T00:00:00Z');
      expect(file.lines.length).toBeGreaterThan(0);
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
        meta: { status: 'completed', lineCount: 2 }
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
        meta: { status: 'error', lineCount: 0 },
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

    it('should update mode on mode:change message', () => {
      dispatchHostMessage({ type: 'mode:change', mode: 'compact' });
      expect(store.getState().mode).toBe('compact');

      dispatchHostMessage({ type: 'mode:change', mode: 'expanded' });
      expect(store.getState().mode).toBe('expanded');

      dispatchHostMessage({ type: 'mode:change', mode: 'hidden' });
      expect(store.getState().mode).toBe('hidden');
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
          meta: { status: 'active', lineCount: 2 }
        });
        expect(store.getState().files.get('merge-test.jsonl')!.lines).toEqual(['base1', 'base2']);

        // Now dispatch a subscribe:response with more lines — should replace entirely
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'merge-test.jsonl',
          lines: ['r1', 'r2', 'r3', 'r4'],
          meta: { status: 'active', lineCount: 4 }
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
          meta: { status: 'active', lineCount: 3 }
        });

        // Simulate two live events arriving before the next subscribe:response
        dispatchHostMessage({ type: 'stream:line', filename: 'live-test.jsonl', line: 'live4' });
        dispatchHostMessage({ type: 'stream:line', filename: 'live-test.jsonl', line: 'live5' });
        expect(store.getState().files.get('live-test.jsonl')!.lines).toHaveLength(5);

        // subscribe:response arrives with only 3 lines (fetch completed before live events)
        dispatchHostMessage({
          type: 'subscribe:response',
          filename: 'live-test.jsonl',
          lines: ['hist1', 'hist2', 'hist3'],
          meta: { status: 'active', lineCount: 3 }
        });

        const lines = store.getState().files.get('live-test.jsonl')!.lines;
        // Response had fewer lines than store — historical lines plus live tail preserved
        expect(lines).toEqual(['hist1', 'hist2', 'hist3', 'live4', 'live5']);
      });
    });
  });
});
