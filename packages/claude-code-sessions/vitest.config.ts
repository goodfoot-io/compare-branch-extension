/**
 * @file Vitest configuration for claude-code-sessions.
 * @summary Vitest configuration for claude-code-sessions.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globals: false
  }
});
