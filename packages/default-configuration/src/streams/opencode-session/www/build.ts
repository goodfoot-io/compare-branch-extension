/**
 * Bun build script for the opencode-session stream renderer SPA.
 *
 * Materializes the `index.html` entrypoint under `dist/www-entry/`, then
 * bundles it with all referenced TypeScript/TSX/CSS assets into a single
 * self-contained HTML file using Bun's HTML bundler with Tailwind CSS v4
 * support via `bun-plugin-tailwind`. Fails closed on any build error so a
 * partial OpenCode artifact never ships alongside the other renderers.
 *
 * The entrypoint is GENERATED rather than committed, and it MUST live outside
 * the watched input tree: the package build runs under `build-unchanged`,
 * which watches `--input src`; writing a file into `src/` mid-build fires the
 * watcher and restarts the whole build (cleaning `dist/` underneath the still-
 * running Bun processes). Unlike the Claude and Codex SPAs, whose entrypoints
 * were committed before the workspace pre-commit began requiring assets-local
 * resources for every newly staged `.html`, a fresh `index.html` referencing
 * sibling sources cannot pass those card-page gates — so the generated file
 * references its sources by relative paths back into `src/` from the
 * un-watched output location instead. Content is written only when changed so
 * repeated builds stay idempotent.
 *
 * @summary Bun HTML bundler entry point for the opencode-session SPA
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import tailwind from 'bun-plugin-tailwind';

const pkgRoot = join(import.meta.dir, '..', '..', '..', '..', '..');
const srcWww = 'src/streams/opencode-session/www';

// dist/ is un-watched output space; the entrypoint is regenerated after every
// clean, so staleness across invocations is impossible.
const entryDir = join(pkgRoot, 'dist', 'www-entry', 'opencode-session');
const indexPath = join(entryDir, 'index.html');

const ENTRY_HTML = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '  <meta charset="UTF-8" />',
  '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '  <title>OpenCode Session</title>',
  `  <link rel="stylesheet" href="../../../${srcWww}/theme.css" />`,
  '  <link rel="stylesheet" href="tailwindcss" />',
  '</head>',
  '<body>',
  '  <div id="stream-root"></div>',
  `  <script src="../../../${srcWww}/app.tsx"></script>`,
  '</body>',
  '</html>',
  ''
].join('\n');

let existing: string | null = null;
try {
  existing = readFileSync(indexPath, 'utf-8');
} catch {
  existing = null;
}
if (existing !== ENTRY_HTML) {
  mkdirSync(entryDir, { recursive: true });
  writeFileSync(indexPath, ENTRY_HTML);
}

const result = await Bun.build({
  entrypoints: [indexPath],
  outdir: './dist/www/opencode-session',
  minify: true,
  plugins: [tailwind],
  target: 'browser',
  compile: true
});

if (!result.success) {
  console.error('Build failed:', result.logs);
  process.exit(1);
}
