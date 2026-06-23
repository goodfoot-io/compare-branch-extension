/**
 * Vitest test setup file.
 *
 * Suppresses console and stderr output during tests to prevent stdout/stderr pollution.
 * Individual tests can still spy on specific methods to assert logging behavior;
 * vi.spyOn on an already-spied method replaces the mock within that test's scope.
 *
 * @summary Test setup for claude-code-hooks-api package
 */

import { afterEach, beforeEach, vi } from 'vitest';

// Node's test runtime exposes `WebSocket`, `Event`, and `MessageEvent` as
// globals but not `CloseEvent` (added to browsers/undici but not promoted to a
// Node global as of Node 22). The WebSocket client tests construct
// `new CloseEvent('close', { code, reason })` in their MockWebSocket, so provide
// a minimal spec-shaped polyfill when the global is absent. Production code does
// not depend on `CloseEvent`; this only restores the standard web global the
// tests legitimately assume.
if (typeof (globalThis as { CloseEvent?: unknown }).CloseEvent === 'undefined') {
  class CloseEventPolyfill extends Event {
    readonly code: number;
    readonly reason: string;
    readonly wasClean: boolean;
    constructor(type: string, init: { code?: number; reason?: string; wasClean?: boolean } = {}) {
      super(type);
      this.code = init.code ?? 0;
      this.reason = init.reason ?? '';
      this.wasClean = init.wasClean ?? false;
    }
  }
  (globalThis as { CloseEvent?: unknown }).CloseEvent = CloseEventPolyfill;
}

const suppressedMethods = ['log', 'warn', 'error', 'info', 'debug'] as const;
beforeEach(() => {
  for (const method of suppressedMethods) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});
