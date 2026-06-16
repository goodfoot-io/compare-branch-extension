// Single-pass build for @cards/sdk.
//
// Bundles all 8 bin entry points in 3 grouped esbuild.build() calls,
// copies the scaffold, and copies shell shims with correct exec bits —
// replacing the ~17 serial &&-chained npm scripts.
//
// Plain Node ESM, consistent with @cards/agent-hooks/scripts/build.mjs.

import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, rmSync, chmodSync, cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..');

const binDir = path.resolve(packageRoot, '../../claude/cards/bin');
const distDir = path.resolve(packageRoot, 'dist');
const scaffoldDir = path.resolve(packageRoot, '../../claude/cards/scaffold');
const srcScaffoldDir = path.resolve(packageRoot, 'src/scaffold');
const srcBinDir = path.resolve(packageRoot, 'src/bin');

const isWindows = process.platform === 'win32';

// Single source of truth for what `build()` emits into binDir. The build loops
// over these lists to produce artifacts; the extension's copyMarketplace
// verification imports EXPECTED_CARDS_BIN_FILES (below) to confirm every one is
// present, so a build interrupted at any point fails closed instead of shipping
// a partial bin directory silently.

// Standard bin entries (esbuild Profile B), `<name>: <src filename>` — each emits
// `<name>.mjs` and has a matching shell shim pair in SHIM_FILES.
const STANDARD_BIN_ENTRIES = {
  card: 'card.ts',
  'create-worktree': 'create-worktree.ts',
  'remove-worktree': 'remove-worktree.ts',
  'cards-extension': 'cards-extension.ts',
  'transcript-watcher': 'transcript-watcher.ts',
  'adhoc-cleanup': 'adhoc-cleanup.ts',
};

// createRequire bin entry (esbuild Profile C) — emits `<name>.mjs`, invoked
// through the `cards-dev-cli` shim.
const REQUIRE_BIN_ENTRY = 'cards-dev';

// Shell shims copied verbatim into binDir: [source filename, destination name].
const SHIM_FILES = [
  ['card.sh', 'card'],
  ['card.cmd', 'card.cmd'],
  ['create-worktree.sh', 'create-worktree'],
  ['create-worktree.cmd', 'create-worktree.cmd'],
  ['remove-worktree.sh', 'remove-worktree'],
  ['remove-worktree.cmd', 'remove-worktree.cmd'],
  ['cards-extension-cli.sh', 'cards-extension'],
  ['cards-extension-cli.cmd', 'cards-extension.cmd'],
  ['cards-dev-cli.sh', 'cards-dev-cli'],
  ['cards-dev-cli.cmd', 'cards-dev-cli.cmd'],
  ['transcript-watcher.sh', 'transcript-watcher'],
  ['transcript-watcher.cmd', 'transcript-watcher.cmd'],
  ['adhoc-cleanup.sh', 'adhoc-cleanup'],
  ['adhoc-cleanup.cmd', 'adhoc-cleanup.cmd'],
];

/**
 * Every filename `build()` writes into binDir — the shell shims, their `.cmd`
 * variants, and the esbuild `.mjs` bundles — derived from the same lists the
 * build iterates over. Consumers (copyMarketplace) verify each name exists so a
 * build interrupted at any point fails closed instead of shipping a partial bin.
 */
export const EXPECTED_CARDS_BIN_FILES = [
  ...SHIM_FILES.map(([, dest]) => dest),
  ...Object.keys(STANDARD_BIN_ENTRIES).map((name) => `${name}.mjs`),
  `${REQUIRE_BIN_ENTRY}.mjs`,
].sort();

async function build() {
  const esbuild = require('esbuild');
  // 1. Clean output dirs
  rmSync(binDir, { recursive: true, force: true });
  rmSync(distDir, { recursive: true, force: true });
  rmSync(scaffoldDir, { recursive: true, force: true });

  // 2. Copy scaffold
  mkdirSync(scaffoldDir, { recursive: true });
  cpSync(srcScaffoldDir, scaffoldDir, { recursive: true, dereference: true });

  // 3. Bundle via esbuild.build() — 3 calls grouped by option profile

  // Profile A — CLI shebang (1 entry)
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

  // Profile B — Standard bin (6 entries)
  // Flags: --bundle --platform=node --format=esm --tree-shaking=true --external:node:*
  await esbuild.build({
    entryPoints: Object.fromEntries(
      Object.entries(STANDARD_BIN_ENTRIES).map(([name, src]) => [name, path.resolve(srcBinDir, src)])
    ),
    bundle: true,
    platform: 'node',
    format: 'esm',
    treeShaking: true,
    external: ['node:*'],
    outdir: binDir,
    outExtension: { '.js': '.mjs' },
  });

  // Profile C — createRequire bin (1 entry)
  // Same flags as B plus createRequire banner
  await esbuild.build({
    entryPoints: [path.resolve(srcBinDir, `${REQUIRE_BIN_ENTRY}.ts`)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    treeShaking: true,
    external: ['node:*'],
    outfile: path.resolve(binDir, `${REQUIRE_BIN_ENTRY}.mjs`),
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
  });

  // 4. Copy shell shims
  for (const [src, dest] of SHIM_FILES) {
    copyFileSync(path.resolve(srcBinDir, src), path.resolve(binDir, dest));
    if (!isWindows && src.endsWith('.sh')) {
      chmodSync(path.resolve(binDir, dest), 0o755);
    }
  }
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
