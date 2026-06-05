/**
 * Vitest configuration for the default-configuration package.
 *
 * @summary Vitest config — allows serving `.md` assets from the repo root
 * @module vitest.config
 */

import { readFileSync } from 'node:fs';
import { devNull } from 'node:os';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Repo root — the `.md` assets live at `<root>/public/claude/...`, outside this
// package. Vite must be allowed to serve them, otherwise it rewrites the import
// to a `/@fs/` URL that resolves to a broken `C:\@fs\C:\...` path on Windows.
const repoRoot = resolve(__dirname, '../../..');

/**
 * Configures vitest behavior for the package package.
 * Settings are centralized here so tooling and runtime assumptions remain consistent across
 * environments.
 *
 * @summary Vitest logic for package
 */

// Mirror the working `@cards/agent-hooks` plugin: no custom
// `resolveId` (returning a raw absolute path there is what makes Vite
// synthesize the broken `C:\@fs\C:\...` URL on Windows). Vite's default
// resolver hands `load` the resolved id; normalize a `/@fs/` prefix and a
// leading-slash-before-drive (`/C:/...`) so `readFileSync` gets a valid path
// on every platform.
const textAssetPlugin = {
  name: 'text-asset-loader',
  enforce: 'pre' as const,
  load(id: string) {
    if (!id.endsWith('.md')) {
      return null;
    }
    let filePath = id.replace(/^\/?@fs/, '');
    if (/^\/[A-Za-z]:\//.test(filePath)) {
      filePath = filePath.slice(1);
    }
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
    server: { fs: { allow: [repoRoot] } },
    env: {
      // `os.devNull` is `/dev/null` on POSIX and `\\.\nul` on Windows.
      CARDS_HOOKS_LOG_FILE: devNull
    }
  },
  resolve: {
    // Suites that load the logger (transitively via `@cards/sdk`) pull in
    // `@cards/vscode-logging`, whose `import { window } from 'vscode'` has no
    // runtime module outside VS Code. Alias `vscode` to the shared shim so
    // these tests load — mirroring the cards server/git-hooks/hybrid-store configs.
    alias: {
      vscode: resolve(repoRoot, 'packages/vscode-logging/src/vscode-shim.ts')
    }
  }
});
