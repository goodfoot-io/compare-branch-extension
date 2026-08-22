/**
 * Bun build script for the opencode-session stream renderer SPA.
 *
 * Materializes the `index.html` entrypoint, then bundles it with all
 * referenced TypeScript/TSX/CSS assets into a single self-contained HTML file
 * using Bun's HTML bundler with Tailwind CSS v4 support via
 * `bun-plugin-tailwind`. Fails closed on any build error so a partial
 * OpenCode artifact never ships alongside the other renderers.
 *
 * The entrypoint is GENERATED here rather than committed: unlike the Claude
 * and Codex SPAs (committed before the workspace pre-commit began requiring
 * assets-local resources for every newly staged `.html`), a fresh
 * `index.html` referencing sibling sources cannot pass the pairing and
 * locality gates, which exist to protect card-repo pages. The content is
 * byte-identical to the Codex entrypoint modulo its title, written only when
 * absent or changed so repeated builds stay idempotent.
 *
 * @summary Bun HTML bundler entry point for the opencode-session SPA
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import tailwind from 'bun-plugin-tailwind';

const wwwDir = join(import.meta.dir);
const indexPath = join(wwwDir, 'index.html');

const ENTRY_HTML = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '  <meta charset="UTF-8" />',
  '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '  <title>OpenCode Session</title>',
  '  <link rel="stylesheet" href="./theme.css" />',
  '  <link rel="stylesheet" href="tailwindcss" />',
  '</head>',
  '<body>',
  '  <div id="stream-root"></div>',
  '  <script src="./app.tsx"></script>',
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
  mkdirSync(dirname(indexPath), { recursive: true });
  writeFileSync(indexPath, ENTRY_HTML);
}

const result = await Bun.build({
  entrypoints: ['./src/streams/opencode-session/www/index.html'],
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
