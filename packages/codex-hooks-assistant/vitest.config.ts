/**
 * Configures vitest behavior for the codex-hooks-assistant package.
 * Settings are centralized here so tooling and runtime assumptions remain consistent across
 * environments.
 *
 * @summary Vitest logic for codex-hooks-assistant
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
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      // `os.devNull` is `/dev/null` on POSIX and `\\.\nul` on Windows.
      CARDS_HOOKS_LOG_FILE: devNull
    }
  }
});
