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
