#!/usr/bin/env node
/**
 * Cross-platform build for @cards.management/default-configuration.
 *
 * Replaces the bash one-liner that was the package's `build` script so it runs
 * on native Windows as well as macOS/Linux (PowerShell/CMD have no `rm -rf`,
 * `mkdir -p`, `cp -r`, `find … -delete`, or `WS_ROOT=$(…)` env-prefix). The
 * steps, in order, are identical to the former shell pipeline:
 *
 *   1. rm -rf dist (then regenerate dist/www-entry/opencode-session/index.html,
 *      which the settings build's fail-closed wwwRoot check requires)
 *   2. cards-sdk build -c settings.config.ts -o dist --loader .md=text
 *      (regenerates settings.json incl. the per-platform action command strings)
 *   3. yarn build:www                          (bun-built stream webview)
 *   4. prune dist/www/claude-code-session to just index.html
 *   5. copy dist/* into <workspaceRoot>/.cards/ (after clearing bin/settings.json/www)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateAntigravityEntry } from './generate-antigravity-entry.mjs';
import { generateOpencodeEntry } from './generate-opencode-entry.mjs';
import { publishBundle } from './publishBundle.mjs';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Run a command with bounded retries.
 *
 * On this container's overlay filesystem, a Bun child's recursive
 * `mkdir dist/www/<renderer>` intermittently ENOENTs when the parent walk
 * loses a lookup race under process churn — the failure alternates between
 * renderers and disappears under instrumentation or in isolation, so it is
 * transient by observation. Pre-creating the output tree (below) removes the
 * common case; this retry absorbs whatever residual transients remain instead
 * of failing an otherwise-green build.
 *
 * @param command - Full command line to run from the package root.
 * @param attempts - Total attempts (first run plus retries).
 */
function runWithRetry(command, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = spawnSync(command, { cwd: pkgRoot, shell: true, stdio: 'inherit' });
    if (result.status === 0) return;
    if (attempt === attempts) {
      process.stderr.write(`[build] command failed after ${attempts} attempts (exit ${result.status}): ${command}\n`);
      process.exit(result.status ?? 1);
    }
    process.stderr.write(`[build] transient failure (attempt ${attempt}/${attempts}, exit ${result.status}): ${command}\n`);
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

// 1b. Materialize the generated renderer entrypoints. The opencode-session
//     and antigravity-session wwwRoots point at generated directories (their
//     entrypoints cannot be committed under src/ — see
//     generate-opencode-entry.mjs / generate-antigravity-entry.mjs), and the
//     settings build below fails closed when a stream's wwwRoot entrypoint is
//     missing, so both must exist before cards-sdk runs.
generateOpencodeEntry(pkgRoot);
generateAntigravityEntry(pkgRoot);

// 2. Generate the configuration bundle (settings.json + compiled handlers).
//
// Retry-wrapped for the same overlayfs reason as {@link runWithRetry}: this
// step materializes dist/www/<renderer> itself, and its recursive mkdirs are
// the ones that lose the lookup race on a freshly cleaned tree. Empirically
// the first pass on a fresh dist burns the race and the immediate second
// pass succeeds.
runWithRetry('cards-sdk build -c settings.config.ts -o dist --loader .md=text');

// 3. Build the stream webviews (bun).
//
// Pre-create each renderer's output directory first: Bun.build creates its
// outdir recursively internally, and on this container's overlay filesystem
// that parent walk intermittently ENOENTs under process churn (see
// {@link runWithRetry} — the failure alternates between renderers and
// disappears under instrumentation or in isolation). Creating the tree here,
// before any Bun process starts, removes the racy window for every renderer.
const RENDERER_TYPES = ['claude-code-session', 'codex-session', 'opencode-session', 'antigravity-session'];
const wwwDir = join(dist, 'www');
for (const type of RENDERER_TYPES) {
  mkdirSync(join(wwwDir, type), { recursive: true });
}
runWithRetry('yarn build:www');

// 4. Prune each registered renderer's output to just index.html, drop any
//    unexpected sibling directories, and fail closed if any renderer's
//    entry point is missing — a failed OpenCode build must not ship a partial
//    artifact alongside the Claude renderer.
for (const type of RENDERER_TYPES) {
  const streamDir = join(wwwDir, type);
  if (!existsSync(streamDir)) continue;
  for (const entry of readdirSync(streamDir)) {
    if (entry !== 'index.html') {
      rmSync(join(streamDir, entry), { recursive: true, force: true });
    }
  }
}

// Prune any sibling directory under dist/www that is not a registered renderer.
if (existsSync(wwwDir)) {
  for (const entry of readdirSync(wwwDir, { withFileTypes: true })) {
    if (entry.isDirectory() && !RENDERER_TYPES.includes(entry.name)) {
      rmSync(join(wwwDir, entry.name), { recursive: true, force: true });
    }
  }
}

// Verify every registered renderer emitted its entry point.
for (const type of RENDERER_TYPES) {
  const indexHtml = join(wwwDir, type, 'index.html');
  if (!existsSync(indexHtml)) {
    throw new Error(`[build] missing renderer artifact: ${indexHtml} — refusing to publish a partial bundle`);
  }
}

// 5. Publish the bundle into <workspaceRoot>/.cards/ atomically, so a live
//    extension host never observes a half-published bundle.
const wsRoot = capture('git rev-parse --show-toplevel');
const cardsDir = join(wsRoot, '.cards');
publishBundle(dist, cardsDir);
