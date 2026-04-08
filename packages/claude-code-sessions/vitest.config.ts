/**
 * @file Vitest configuration for sessions.
 * @summary Vitest configuration for sessions.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globals: false,
    env: {
      CARDS_HOOKS_LOG_FILE: '/dev/null'
    }
  }
});
