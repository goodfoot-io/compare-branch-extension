import path from 'node:path';
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
    setupFiles: ['./test/setup.ts'],
    env: {
      CARDS_HOOKS_LOG_FILE: '/dev/null'
    }
  },
  resolve: {
    // Suites that load the logger pull in `@cards/vscode-logging`, whose
    // `import { window } from 'vscode'` has no runtime module outside VS Code.
    // Alias `vscode` to the shared shim so these tests load — mirroring the
    // cards server/git-hooks/hybrid-store configs.
    alias: {
      vscode: path.resolve(__dirname, '../../../packages/vscode-logging/src/vscode-shim.ts')
    }
  }
});
