/**
 * Materializes the generated `index.html` entrypoint for the antigravity-session
 * stream renderer under `dist/www-entry/antigravity-session/`.
 *
 * The entrypoint is GENERATED rather than committed, and it MUST live outside
 * the watched input tree — for the same two reasons as the OpenCode sibling
 * (see `generate-opencode-entry.mjs`): the package build runs under
 * `build-unchanged`, which watches `--input src`; writing a file into `src/`
 * mid-build fires the watcher and restarts the whole build (cleaning `dist/`
 * underneath the still-running Bun processes), and the Cards integration hook
 * treats newly staged `.html` files as published pages whose asset references
 * must resolve under a repository-root `assets/` directory — which a renderer
 * entrypoint referencing sibling sources can never satisfy. The generated
 * file references its sources by relative paths back into `src/` from the
 * un-watched output location instead. Content is written only when changed so
 * repeated builds stay idempotent.
 *
 * Two consumers call this:
 * - `scripts/build.mjs`, BEFORE `cards-sdk build`: the settings build fails
 *   closed on a missing wwwRoot entrypoint, and this stream's configured
 *   wwwRoot is the generated directory.
 * - `src/streams/antigravity-session/www/build.ts`, before bundling: keeps
 *   the standalone `build:www` invocation self-sufficient.
 *
 * @summary Generates the antigravity-session renderer's HTML entrypoint
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC_WWW = 'src/streams/antigravity-session/www';

const ENTRY_HTML = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '  <meta charset="UTF-8" />',
  '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '  <title>Antigravity Session</title>',
  `  <link rel="stylesheet" href="../../../${SRC_WWW}/theme.css" />`,
  '  <link rel="stylesheet" href="tailwindcss" />',
  '</head>',
  '<body>',
  '  <div id="stream-root"></div>',
  `  <script src="../../../${SRC_WWW}/app.tsx"></script>`,
  '</body>',
  '</html>',
  ''
].join('\n');

/**
 * Writes the entrypoint into `<pkgRoot>/dist/www-entry/antigravity-session/`,
 * skipping the write when the on-disk content already matches.
 *
 * @param {string} pkgRoot - Absolute path to the default-configuration package root.
 * @returns {string} Absolute path to the generated `index.html`.
 */
export function generateAntigravityEntry(pkgRoot) {
  const entryDir = join(pkgRoot, 'dist', 'www-entry', 'antigravity-session');
  const indexPath = join(entryDir, 'index.html');

  let existing = null;
  try {
    existing = readFileSync(indexPath, 'utf-8');
  } catch {
    existing = null;
  }
  if (existing !== ENTRY_HTML) {
    mkdirSync(entryDir, { recursive: true });
    writeFileSync(indexPath, ENTRY_HTML);
  }
  return indexPath;
}
