/**
 * Vitest configuration for the Cards MCP server package.
 *
 * Tests reach `@cards/vscode-logging` transitively through `@cards/test-utils`,
 * which would otherwise pull in the real `vscode` module that only exists in
 * the extension host. Alias `vscode` to the shared shim, matching the other
 * packages whose test chains reach `vscode-logging`.
 *
 * @summary Vitest configuration for the Cards MCP server package
 */
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globals: false,
    reporters: ['dot'],
    env: {
      CARDS_HOOKS_LOG_FILE: '/dev/null'
    }
  },
  resolve: {
    alias: {
      vscode: path.resolve(__dirname, '../../../packages/vscode-logging/src/vscode-shim.ts')
    }
  }
});
