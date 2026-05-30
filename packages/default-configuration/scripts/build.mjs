#!/usr/bin/env node
/**
 * Cross-platform build for @cards/default-configuration.
 *
 * Replaces the bash one-liner that was the package's `build` script so it runs
 * on native Windows as well as macOS/Linux (PowerShell/CMD have no `rm -rf`,
 * `mkdir -p`, `cp -r`, `find … -delete`, or `WS_ROOT=$(…)` env-prefix). The
 * steps, in order, are identical to the former shell pipeline:
 *
 *   1. rm -rf dist
 *   2. cards-sdk build -c settings.config.ts -o dist --loader .md=text
 *      (regenerates settings.json incl. the per-platform action command strings)
 *   3. yarn build:www                          (bun-built stream webview)
 *   4. prune dist/www/claude-code-session to just index.html
 *   5. copy dist/* into <workspaceRoot>/.cards/ (after clearing bin/settings.json/www)
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Run a command, inheriting stdio, failing closed on a non-zero exit.
 *
 * `shell: true` lets Windows resolve the workspace-bin shims (`cards-sdk.cmd`,
 * `yarn.cmd`, `git`) via PATHEXT; on POSIX it uses /bin/sh. Arguments here are
 * fixed literals with no untrusted interpolation.
 *
 * @param command - Full command line to run from the package root.
 */
function run(command) {
  const result = spawnSync(command, { cwd: pkgRoot, shell: true, stdio: 'inherit' });
  if (result.status !== 0) {
    process.stderr.write(`[build] command failed (exit ${result.status}): ${command}\n`);
    process.exit(result.status ?? 1);
  }
}

/**
 * Capture trimmed stdout of a command, failing closed on a non-zero exit.
 *
 * @param command - Full command line to run from the package root.
 * @returns The command's trimmed stdout.
 */
function capture(command) {
  const result = spawnSync(command, { cwd: pkgRoot, shell: true, encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(`[build] command failed (exit ${result.status}): ${command}\n${result.stderr ?? ''}`);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}

const dist = join(pkgRoot, 'dist');

// 1. Clean dist.
rmSync(dist, { recursive: true, force: true });

// 2. Generate the configuration bundle (settings.json + compiled handlers).
run('cards-sdk build -c settings.config.ts -o dist --loader .md=text');

// 3. Build the stream webview (bun).
run('yarn build:www');

// 4. Prune the generated stream webview to just index.html.
const streamDir = join(dist, 'www', 'claude-code-session');
for (const entry of readdirSync(streamDir)) {
  if (entry !== 'index.html') {
    rmSync(join(streamDir, entry), { recursive: true, force: true });
  }
}

// 5. Publish the bundle into <workspaceRoot>/.cards/.
const wsRoot = capture('git rev-parse --show-toplevel');
const cardsDir = join(wsRoot, '.cards');
for (const stale of ['bin', 'settings.json', 'www']) {
  rmSync(join(cardsDir, stale), { recursive: true, force: true });
}
mkdirSync(cardsDir, { recursive: true });
cpSync(dist, cardsDir, { recursive: true });
