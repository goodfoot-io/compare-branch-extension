/**
 * Vitest configuration for the cards-configuration-v2 package.
 *
 * Limits tests to the local tests/ directory and keeps globals disabled to
 * avoid cross-test pollution.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: false,
    reporters: ['dot']
  }
});
