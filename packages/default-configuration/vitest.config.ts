import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Configures vitest behavior for the package package.
 * Settings are centralized here so tooling and runtime assumptions remain consistent across
 * environments.
 *
 * @summary Vitest logic for package
 */

const textAssetPlugin = {
  name: 'text-asset-loader',
  enforce: 'pre' as const,
  resolveId(source: string, importer: string | undefined) {
    if (!source.endsWith('.md')) {
      return null;
    }
    if (importer) {
      return resolve(dirname(importer), source);
    }
    return null;
  },
  load(id: string) {
    if (!id.endsWith('.md')) {
      return null;
    }

    // Vite may prefix absolute paths with /@fs for files outside the project root
    const filePath = id.startsWith('/@fs') ? id.slice(4) : id;
    return `export default ${JSON.stringify(readFileSync(filePath, 'utf-8'))};`;
  }
};

export default defineConfig({
  plugins: [textAssetPlugin],
  test: {
    include: ['test/**/*.test.ts'],
    globals: false,
    reporters: ['dot'],
    testTimeout: 30000,
    env: {
      CARDS_HOOKS_LOG_FILE: '/dev/null'
    }
  }
});
