/**
 * Configures vitest behavior for the package package.
 * Settings are centralized here so tooling and runtime assumptions remain consistent across
 * environments.
 *
 * @summary Vitest logic for package
 */

import { readFileSync } from 'node:fs';
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
    env: {
      CARDS_HOOKS_LOG_FILE: '/dev/null'
    }
  }
});
