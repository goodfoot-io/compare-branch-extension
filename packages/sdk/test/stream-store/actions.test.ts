// @vitest-environment jsdom

/**
 * Tests for stream store action functions.
 *
 * Verifies that each action posts the correct typed message to window.parent.
 *
 * @summary Tests for iframe-to-host action functions
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { close, openFile, requestCollapse, setHeight, showDiff, subscribe } from '../../src/stream-store/actions.js';

describe('stream store actions', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>;
  let originalParent: typeof window.parent;

  beforeEach(() => {
    postMessageSpy = vi.fn();
    originalParent = window.parent;
    // Replace window.parent with a mock that captures postMessage calls
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessageSpy },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'parent', {
      value: originalParent,
      writable: true,
      configurable: true
    });
  });

  describe('subscribe', () => {
    it('should post subscribe message with filename', () => {
      subscribe('session.jsonl');

      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'subscribe', filename: 'session.jsonl' }, '*');
    });
  });

  describe('close', () => {
    it('should post close message', () => {
      close();

      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'close' }, '*');
    });
  });

  describe('setHeight', () => {
    it('should post setHeight message with pixel value', () => {
      setHeight(500);

      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'setHeight', height: 500 }, '*');
    });
  });

  describe('openFile', () => {
    it('should post openFile message with path', () => {
      openFile('/src/main.ts');

      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'openFile', path: '/src/main.ts' }, '*');
    });

    it('should include line number when provided', () => {
      openFile('/src/main.ts', 42);

      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'openFile', path: '/src/main.ts', line: 42 }, '*');
    });
  });

  describe('showDiff', () => {
    it('should post showDiff message with sha', () => {
      showDiff('abc123');

      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'showDiff', sha: 'abc123' }, '*');
    });

    it('should include filePath when provided', () => {
      showDiff('abc123', '/src/main.ts');

      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'showDiff', sha: 'abc123', filePath: '/src/main.ts' }, '*');
    });
  });

  describe('requestCollapse', () => {
    it('should post requestCollapse message', () => {
      requestCollapse();

      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'requestCollapse' }, '*');
    });
  });
});
