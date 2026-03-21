import { defineConfig } from 'vitest/config';

/**
 * Configures vitest behavior for the package package.
 * Settings are centralized here so tooling and runtime assumptions remain consistent across
 * environments.
 *
 * @summary Vitest logic for package
 */

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globals: false,
    reporters: ['dot'],
    env: {
      CARDS_HOOKS_LOG_FILE: '/dev/null'
    }
  }
});
