// Single-pass build for @cards/sdk.
//
// Bundles the `cards-sdk` CLI entry (esbuild Profile A → dist/cli.js) and
// copies the scaffold. The cards CLI bin tree (the `.mjs` bundles and shell
// shims) is no longer produced here — the extension build owns it and emits it
// to `packages/extension/dist/bin` (see scripts/build/cards-bin.js).
//
// Plain Node ESM, consistent with @cards/agent-hooks/scripts/build.mjs.

import { createRequire } from 'node:module';
import { mkdirSync, rmSync, cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..');

const distDir = path.resolve(packageRoot, 'dist');
const scaffoldDir = path.resolve(packageRoot, '../../claude/cards/scaffold');
const srcScaffoldDir = path.resolve(packageRoot, 'src/scaffold');

async function build() {
  const esbuild = require('esbuild');
  // 1. Clean output dirs
  rmSync(distDir, { recursive: true, force: true });
  rmSync(scaffoldDir, { recursive: true, force: true });

  // 2. Copy scaffold
  mkdirSync(scaffoldDir, { recursive: true });
  cpSync(srcScaffoldDir, scaffoldDir, { recursive: true, dereference: true });

  // 3. Bundle the `cards-sdk` npm CLI shebang entry (Profile A)
  // Flags: --bundle --platform=node --format=esm --packages=external --banner:js='#!/usr/bin/env node'
  await esbuild.build({
    entryPoints: [path.resolve(packageRoot, 'src/config/cli.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outfile: path.resolve(distDir, 'cli.js'),
    banner: { js: '#!/usr/bin/env node' },
  });
}

// Exported for consumers that import the module (e.g. tests).
export { build };

// Only run the build when executed directly (not when imported as a module).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
