/**
 * Atomically publish a freshly built `dist/` bundle into `<workspaceRoot>/.cards/`.
 *
 * The naive publish — `rmSync` the live `bin/`, `settings.json`, and `www/`,
 * then `cpSync` `dist/` over the top — tears the directory for the entire
 * (seconds-long) duration of the copy: a concurrent reader (the extension's
 * settings watcher reloading, an action handler spawning from `.cards/bin/`)
 * sees `settings.json` absent or `bin/` half-populated and fails with ENOENT.
 * The package already refuses to publish a partial renderer bundle; this step
 * is the one that violated that doctrine.
 *
 * The fix splits publish into two phases:
 *
 *   1. **Stage** — copy each managed entry into a sibling temp path inside the
 *      same `.cards/` directory. This is where the slow, failure-prone work
 *      happens; the live bundle is never touched. If any copy throws, the live
 *      directory is still the complete previous bundle (fail-closed).
 *   2. **Swap** — replace each live entry with its staged temp using
 *      `renameSync`, which is atomic on the same filesystem. `settings.json`
 *      (the file the extension's `fs.watch` is bound to) swaps in a single
 *      atomic rename, so the watcher only ever observes old-or-new. Directory
 *      entries can't be renamed over a non-empty target, so the old directory
 *      is moved aside and removed after the new one is in place — a window of
 *      two adjacent metadata operations rather than a whole recursive copy.
 *
 * A reader at any instant therefore sees either the complete previous bundle or
 * the complete new one, never neither.
 *
 * @module publishBundle
 */
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
} from 'node:fs';
import { join } from 'node:path';

// Entry-by-entry copy rather than recursive `cpSync`: node's directory copy
// creates files write-only (0200) before chmod, which virtiofs workspace
// mounts reject with EACCES.
function copyEntry(src, dest) {
  const stat = lstatSync(src);
  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src)) {
      copyEntry(join(src, entry), join(dest, entry));
    }
  } else if (stat.isSymbolicLink()) {
    symlinkSync(readlinkSync(src), dest);
  } else {
    copyFileSync(src, dest);
  }
}

/** Entries under `.cards/` that the build owns and republishes. */
export const MANAGED_ENTRIES = ['bin', 'settings.json', 'www'];

/**
 * Publish the built bundle into `.cards/` without ever exposing a torn state.
 *
 * @param dist - Absolute path to the freshly built `dist/` directory.
 * @param cardsDir - Absolute path to the live `<workspaceRoot>/.cards/` directory.
 */
export function publishBundle(dist, cardsDir) {
  mkdirSync(cardsDir, { recursive: true });

  // Phase 1 — stage every entry beside its live counterpart. Any failure here
  // throws before a single live entry is touched, leaving the previous bundle
  // intact.
  const staged = [];
  try {
    for (const name of MANAGED_ENTRIES) {
      const src = join(dist, name);
      if (!existsSync(src)) {
        throw new Error(`[build] missing bundle entry: ${src} — refusing to publish a partial bundle`);
      }
      const tmp = join(cardsDir, `.${name}.tmp-publish`);
      rmSync(tmp, { recursive: true, force: true });
      copyEntry(src, tmp);
      staged.push({ name, tmp });
    }
  } catch (error) {
    for (const { tmp } of staged) {
      rmSync(tmp, { recursive: true, force: true });
    }
    throw error;
  }

  // Phase 2 — swap each staged entry into place. Each swap is atomic
  // (`settings.json`) or a pair of adjacent renames (directories), never a
  // long-running copy.
  for (const { name, tmp } of staged) {
    const dest = join(cardsDir, name);
    // A file overwrites atomically in a single rename — critical for
    // `settings.json`, the path the extension's `fs.watch` is bound to.
    if (!existsSync(dest) || statSync(dest).isFile()) {
      renameSync(tmp, dest);
      continue;
    }
    // A directory can't be renamed over a non-empty target, so move the old
    // one aside and remove it after the new one is in place.
    const backup = join(cardsDir, `.${name}.old-publish`);
    rmSync(backup, { recursive: true, force: true });
    renameSync(dest, backup);
    renameSync(tmp, dest);
    rmSync(backup, { recursive: true, force: true });
  }
}
