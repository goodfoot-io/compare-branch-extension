/**
 * Configures vitest behavior for the package package.
 * Settings are centralized here so tooling and runtime assumptions remain consistent across
 * environments.
 *
 * @summary Vitest logic for package
 */

import { readFileSync } from 'node:fs';
import { devNull } from 'node:os';
import { defineConfig } from 'vitest/config';

const textAssetPlugin = {
  name: 'text-asset-loader',
  enforce: 'pre' as const,
  load(id: string) {
    if (!id.endsWith('.md') && !id.endsWith('.txt')) {
      return null;
    }

    return `export default ${JSON.stringify(readFileSync(id, 'utf-8'))};`;
  }
};

export default defineConfig({
  plugins: [textAssetPlugin],
  test: {
    include: ['test/**/*.test.ts'],
    globals: false,
    // Several suites spin up real git workspaces (TestGitWorkspace). git
    // subprocess overhead on Windows pushes setup past the 5s/10s defaults;
    // these allowances are ample on Linux/macOS where the work finishes fast.
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      // `os.devNull` is `/dev/null` on POSIX and `\\.\nul` on Windows.
      CARDS_HOOKS_LOG_FILE: devNull
    }
  }
});
