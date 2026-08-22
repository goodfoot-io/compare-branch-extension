/**
 * Shared session utilities for OpenCode action workflows.
 *
 * Mirrors {@link ./codex-session.js} launch-for-launch: it populates a
 * content-addressed plugin cache from the bundled `opencode` payload tree,
 * writes per-plugin-set staged config documents, and spawns the `opencode`
 * CLI with card context, worktree lifecycle, cancel handling, status settle,
 * and the branch-cleanup watcher.
 *
 * Isolation model (verified against the installed binary, v1.18.21): the child
 * is pointed at one staged config document via the `OPENCODE_CONFIG` env var,
 * which adds a config layer **between** the user's global config dir and the
 * project layer (`OPENCODE_CONFIG_DIR` is deliberately NOT overridden — the
 * user's provider/model config keeps loading, and their plain `opencode`
 * sessions never see ours because the staged document never enters their
 * config dir). Arrays concat across layers (spiked), so the user's own plugins
 * keep loading alongside the Cards set. The cache itself nests under
 * `<configDir>/plugins/cache/cards/<plugin>/<version>/`, which the single-level
 * `{plugin,plugins}/*.{ts,js}` auto-scan glob never enumerates.
 *
 * Staged config schema (verified against the installed binary's embedded
 * Config v2 schema strings): `plugins` accepts absolute `.mjs` file specs;
 * `permissions` is an ordered ruleset of `{action, resource, effect}` rules;
 * `skills` registers additional skill discovery directories. The legacy v1
 * document shape (`plugin`, nested `permission` records) is deliberately NOT
 * used: a document containing any v1 key is migrated wholesale, and the v1→v2
 * migration would silently drop our array-shaped `skills` entries.
 *
 * @summary Shared session utilities for OpenCode action workflows
 * @module
 */

import type { ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import type { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { resolveGlobalCardsConfigDir } from '@cards.management/sdk';
import { execFileNoWindowAsync } from '@cards.management/sdk/bin/child-process';
import { createCardsClient } from '@cards.management/sdk/client/discovery';
import type { ActionContext, ActionInput } from '@cards.management/sdk/config';
import { CARDS_ENV_VARS } from '@cards.management/sdk/config';
import { spawnBranchCleanupWatcher } from './branch-cleanup-watcher.js';
import {
  errorMessage,
  resolveBaseBranch,
  resolveMarketplacePath,
  resolveOrCreateWorktree,
  settleCardStatusForCleanup
} from './claude-session.js';
import {
  CODEX_PLUGIN_CONTENT_STAMP,
  composeDeveloperInstructions,
  readCardRepoAgentsMd,
  readSlotContentStamp
} from './codex-session.js';
import { spawnAgentCli } from './spawn-cli.js';

/**
 * Computes the content digest of a bundled plugin source directory, following
 * directory symlinks.
 *
 * Differs deliberately from {@link computePluginContentHash} in codex-session:
 * the OpenCode payload tree ships out-of-package relative symlinks (e.g.
 * `skills/debug -> ../../../skills/debug`), which the codex walker's
 * `withFileTypes` directory check EISDIRs on when hashing source-as-shipped.
 * Every entry is resolved with {@link module:fs/promises.stat} — which follows
 * symlinks — so linked directories are walked and linked files are hashed by
 * content, mirroring exactly what `fs.cp(..., { dereference: true })` lands in
 * the cache slot. The stamp file is skipped, and repo-relative POSIX paths are
 * folded into one SHA-256 in sorted order for cross-platform determinism.
 *
 * @param sourceDir - Absolute path to the packaged plugin source directory.
 * @returns Lowercase hex SHA-256 digest of the directory's dereferenced contents.
 */
async function computeDereferencedContentHash(sourceDir: string): Promise<string> {
  const files: Array<{ rel: string; abs: string }> = [];

  async function walk(dir: string, relBase: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === CODEX_PLUGIN_CONTENT_STAMP) continue;
      const abs = path.join(dir, entry.name);
      const rel = relBase === '' ? entry.name : `${relBase}/${entry.name}`;
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) {
        await walk(abs, rel);
      } else if (stat.isFile()) {
        files.push({ rel, abs });
      }
    }
  }

  await walk(sourceDir, '');
  files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));

  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file.rel, 'utf-8');
    hash.update('\0');
    hash.update(await fs.readFile(file.abs));
    hash.update('\0');
  }
  return hash.digest('hex');
}

/**
 * Options for {@link spawnOpencodeSession}.
 */
export interface OpencodeSessionOptions {
  /** Prompt passed to the OpenCode CLI as positional arguments. */
  prompt?: string;
  /**
   * Session guidance prepended to the prompt positionals. This is the
   * OpenCode analog of Claude's `--append-system-prompt`: `opencode run` has
   * no system-prompt override flag, so caller guidance rides the opening user
   * turn instead of a dedicated channel. Card context itself is injected by
   * the runtime plugin's `experimental.chat.system.transform` hook, not here.
   */
  appendSystemPrompt?: string;
  /**
   * When true, overrides `EXIT_WHEN_DONE` to `'false'` in the child process
   * environment. The runtime plugin's exit-when-done handler degrades to
   * notify-only under OpenCode (a plugin cannot cleanly terminate its host),
   * so this suppresses that path exactly as the sibling agents do.
   */
  suppressExitWhenDone?: boolean;
}

/**
 * Minimal manifest shape required from each bundled OpenCode plugin package.
 *
 * The package.json manifest is the governance anchor for the OpenCode payload
 * tree (the counterpart of Codex's `.codex-plugin/plugin.json`).
 */
interface OpencodePluginManifest {
  /** Package name; must be exactly `cards-opencode-<plugin directory name>`. */
  name: string;
  /** Plugin version; used as the cache version segment `<plugin>/<version>`. */
  version: string;
}

/** All plugin names that may appear in an OpenCode plugin set managed by Cards. */
export type OpencodePluginName = 'cards' | 'runtime' | 'cards-assistant';

/** Plugin set used for the standard Cards launch session (cards + runtime). */
export const OPENCODE_LAUNCH_PLUGIN_NAMES = ['cards', 'runtime'] as const satisfies readonly OpencodePluginName[];

/** Plugin set used for the Cards Assistant session (cards + cards-assistant, no runtime). */
export const OPENCODE_ASSISTANT_PLUGIN_NAMES = [
  'cards',
  'cards-assistant'
] as const satisfies readonly OpencodePluginName[];

/** Which per-plugin-set staged config {@link writeCardsLaunchConfig} writes. */
export type OpencodeLaunchConfigSet = 'launch' | 'assistant';

// ============================================================================
// OpenCode bundle + staging utilities
// ============================================================================

/**
 * Resolves the packaged OpenCode bundle directory bundled alongside the
 * extension marketplace.
 *
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @returns Absolute path to the bundled OpenCode root directory.
 */
function resolveOpencodeBundlePath(marketplacePath: string): string {
  return path.join(path.dirname(marketplacePath), 'opencode');
}

/**
 * Resolves the packaged OpenCode plugin bundled in the extension installation.
 *
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @param pluginName - Bundled OpenCode plugin name to resolve.
 * @returns Absolute path to the packaged OpenCode plugin directory.
 */
function resolveOpencodePluginPath(marketplacePath: string, pluginName: OpencodePluginName): string {
  return path.join(resolveOpencodeBundlePath(marketplacePath), pluginName);
}

/**
 * Resolves the default OpenCode global config directory whose plugin cache we
 * stage into. Mirrors the binary's own resolution: `$XDG_CONFIG_HOME` when set,
 * otherwise `~/.config`, plus `/opencode`. Only the deeply-nested cache below
 * this directory is written — the user's own `opencode.json` is never touched.
 *
 * @returns Absolute path to the OpenCode config directory.
 */
export function resolveDefaultOpencodeConfigDir(): string {
  return `${process.env['XDG_CONFIG_HOME'] ?? path.join(homedir(), '.config')}/opencode`;
}

/**
 * Resolves the Cards-managed staging directory holding the per-plugin-set
 * config documents passed to spawned sessions via `OPENCODE_CONFIG`. Lives
 * under the Cards home (honoring `$CARDS_HOME`) so it never collides with the
 * user's own OpenCode files.
 *
 * @returns Absolute path to the Cards OpenCode staging directory.
 */
export function resolveCardsOpencodeStagingDir(): string {
  return path.join(resolveGlobalCardsConfigDir(), 'opencode');
}

/**
 * Reads and validates the packaged OpenCode plugin manifest. Fails closed: a
 * manifest whose name disagrees with the requested plugin directory indicates a
 * mis-assembled bundle and must not be staged.
 *
 * @param pluginPath - Absolute path to the packaged OpenCode plugin directory.
 * @param expectedName - Expected plugin name from the bundle layout.
 * @returns Parsed plugin manifest.
 */
async function readOpencodePluginManifest(
  pluginPath: string,
  expectedName: OpencodePluginName
): Promise<OpencodePluginManifest> {
  const manifestPath = path.join(pluginPath, 'package.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as Partial<OpencodePluginManifest>;

  const expectedPackageName = `cards-opencode-${expectedName}`;
  if (manifest.name !== expectedPackageName) {
    throw new Error(`Invalid OpenCode plugin manifest name at ${manifestPath}: expected "${expectedPackageName}"`);
  }

  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new Error(`OpenCode plugin manifest at ${manifestPath} is missing a non-empty string "version"`);
  }
  validatePluginVersionSegment(manifest.version, manifestPath);

  return {
    name: manifest.name,
    version: manifest.version
  };
}

/**
 * Validates that a plugin version is usable as a single cache path segment
 * `<plugin>/<version>`. Mirrors the codex launcher's segment validation so a
 * bundle with an unsafe version fails closed here rather than producing an
 * unusable or path-traversing cache entry.
 *
 * @param version - Version string from the plugin manifest.
 * @param sourceLabel - Manifest path, for the error message.
 * @throws {Error} When the version is not a single safe path segment.
 */
function validatePluginVersionSegment(version: string, sourceLabel: string): void {
  if (version === '.' || version === '..' || !/^[A-Za-z0-9._+-]+$/.test(version)) {
    throw new Error(
      `Invalid OpenCode plugin version segment "${version}" at ${sourceLabel}: ` +
        `only ASCII letters, digits, '.', '+', '_', and '-' are allowed`
    );
  }
}

/**
 * Verifies the bundled OpenCode payload tree is present and every requested
 * plugin carries a valid manifest.
 *
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @param pluginNames - Plugin set to verify.
 * @returns Bundle path, source plugin paths, and their validated versions.
 */
async function ensureOpencodeBundleAvailable(
  marketplacePath: string,
  pluginNames: readonly OpencodePluginName[]
): Promise<{
  bundlePath: string;
  pluginPaths: Record<string, string>;
  pluginVersions: Record<string, string>;
}> {
  const bundlePath = resolveOpencodeBundlePath(marketplacePath);
  const pluginPaths: Record<string, string> = Object.fromEntries(
    pluginNames.map((pluginName) => [pluginName, resolveOpencodePluginPath(marketplacePath, pluginName)])
  );
  const pluginVersions: Record<string, string> = {};

  await fs.access(bundlePath);
  for (const pluginName of pluginNames) {
    const pluginPath = pluginPaths[pluginName]!;
    await fs.access(pluginPath);
    const manifest = await readOpencodePluginManifest(pluginPath, pluginName);
    pluginVersions[pluginName] = manifest.version;
  }

  return { bundlePath, pluginPaths, pluginVersions };
}

/** Cache root below the OpenCode config dir; deep enough to never be auto-scanned. */
const OPENCODE_PLUGINS_CACHE_DIR = 'plugins/cache/cards';

/**
 * Resolves whether `directoryPath` exists and is a directory.
 *
 * @param directoryPath - Absolute path to probe.
 * @returns `true` when the path exists and is a directory; `false` on ENOENT.
 * @throws Rethrows non-ENOENT stat errors so genuine failures propagate.
 */
async function isExistingDirectory(directoryPath: string): Promise<boolean> {
  try {
    return (await fs.stat(directoryPath)).isDirectory();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Installs one bundled plugin into the cache under its own version segment
 * `<cacheRoot>/<plugin>/<version>` and returns that load path.
 *
 * Clones the codex launcher's stamp/mktemp/rename/prune discipline: fully-built
 * content is staged in an OS-unique mkdtemp dir under the cache root (a
 * sibling of the versioned slots, so the binary's single-level auto-scan never
 * enumerates it), stamped with the bundle's content digest, validated, then
 * published into the version slot by rename. A slot whose stamp already
 * matches the current bundle digest is byte-for-byte current and left
 * untouched, so launches under one extension build converge on the fast path
 * without racing.
 *
 * @param pluginName - Bundled plugin name.
 * @param cacheRoot - `<configDir>/plugins/cache/cards`.
 * @param sourceDir - Packaged plugin source directory.
 * @param version - Validated manifest version used as the cache segment.
 * @returns The load path `<cacheRoot>/<plugin>/<version>`.
 */
async function installPluginToCache(
  pluginName: OpencodePluginName,
  cacheRoot: string,
  sourceDir: string,
  version: string
): Promise<string> {
  const baseRoot = path.join(cacheRoot, pluginName);
  const destVersionDir = path.join(baseRoot, version);
  const contentHash = await computeDereferencedContentHash(sourceDir);

  // Fast path: an existing slot whose stamp matches the current bundle is
  // byte-identical — leave it untouched. No writes, so any number of concurrent
  // launches under the same build converge here without racing.
  if ((await readSlotContentStamp(destVersionDir)) === contentHash) {
    return destVersionDir;
  }

  const staging = await fs.mkdtemp(path.join(cacheRoot, '.plugin-install-'));
  try {
    const stagedVersionDir = path.join(staging, version);
    // dereference: the payload ships relative skill symlinks that must land
    // as real files in the cache slot (see {@link computeDereferencedContentHash}).
    await fs.cp(sourceDir, stagedVersionDir, { recursive: true, force: true, dereference: true });

    // Validate the staged bundle BEFORE publishing — fail closed on a bad bundle.
    await readOpencodePluginManifest(stagedVersionDir, pluginName);
    // Stamp the staged copy so a future launch can recognize this exact bundle.
    await fs.writeFile(path.join(stagedVersionDir, CODEX_PLUGIN_CONTENT_STAMP), contentHash, 'utf-8');

    await fs.mkdir(baseRoot, { recursive: true });
    await publishVersionSlot(stagedVersionDir, destVersionDir, cacheRoot, contentHash);
  } finally {
    // Remove the staging dir (the publish either consumed its version child via
    // rename or lost the race and left it behind). Never touches a live slot.
    await fs.rm(staging, { recursive: true, force: true }).catch(() => undefined);
  }

  await pruneSupersededPluginVersions(baseRoot, version);
  return destVersionDir;
}

/**
 * Publishes a fully-built, stamped staging directory into its version slot.
 *
 * Fast path is a single atomic rename into an absent slot. When the slot already
 * exists, the current bundle's content decides: a stamp match means a concurrent
 * or previous publish already placed byte-identical content (idempotent success,
 * leave it), while a mismatch means the slot is stale — {@link replaceVersionSlot}
 * swaps the fresh content in. Any error that is neither an atomic-rename success
 * nor a recognized slot-exists condition propagates (fail closed).
 *
 * @param stagedVersionDir - Fully-built, stamped source in the staging dir.
 * @param destVersionDir - Target version slot `<baseRoot>/<version>`.
 * @param cacheRoot - `<configDir>/plugins/cache/cards`, for the eviction temp dir.
 * @param contentHash - Digest the staged copy is stamped with.
 */
async function publishVersionSlot(
  stagedVersionDir: string,
  destVersionDir: string,
  cacheRoot: string,
  contentHash: string
): Promise<void> {
  try {
    // Publish with a single atomic rename into the (absent) version slot.
    await fs.rename(stagedVersionDir, destVersionDir);
    return;
  } catch (error) {
    if (!(await isSlotExistsError(error, destVersionDir))) {
      throw error;
    }
  }

  // The slot exists. If it already holds our exact bytes, a concurrent or prior
  // publish won — idempotent success. Otherwise it is stale and must be replaced.
  if ((await readSlotContentStamp(destVersionDir)) === contentHash) {
    return;
  }
  await replaceVersionSlot(stagedVersionDir, destVersionDir, cacheRoot, contentHash);
}

/**
 * Replaces a stale version slot with fresh, stamped content by evicting the old
 * slot and renaming the new one in.
 *
 * Eviction moves the stale slot to an OS-unique temp dir (never a live sibling
 * slot) then deletes it; the install rename then lands the fresh content. If a
 * concurrent replacer evicted first, the eviction ENOENT is tolerated; if one
 * re-published first, the install's slot-exists error is accepted only when the
 * now-present slot already holds our exact bytes (fail closed otherwise).
 *
 * @param stagedVersionDir - Fully-built, stamped source in the staging dir.
 * @param destVersionDir - Stale version slot to replace.
 * @param cacheRoot - `<configDir>/plugins/cache/cards`, parent of the temp dir.
 * @param contentHash - Digest the staged copy is stamped with.
 */
async function replaceVersionSlot(
  stagedVersionDir: string,
  destVersionDir: string,
  cacheRoot: string,
  contentHash: string
): Promise<void> {
  const evictDir = await fs.mkdtemp(path.join(cacheRoot, '.plugin-evict-'));
  try {
    try {
      await fs.rename(destVersionDir, path.join(evictDir, 'stale'));
    } catch (error) {
      // A concurrent replacer already evicted the stale slot — proceed to install.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    try {
      await fs.rename(stagedVersionDir, destVersionDir);
    } catch (error) {
      // A concurrent replacer re-published first. Accept only if the now-present
      // slot already holds our exact bytes; otherwise surface the failure.
      if (
        !(await isSlotExistsError(error, destVersionDir)) ||
        (await readSlotContentStamp(destVersionDir)) !== contentHash
      ) {
        throw error;
      }
    }
  } finally {
    await fs.rm(evictDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Classifies a `fs.rename` failure as "the destination version slot already
 * exists". POSIX surfaces this as `EEXIST`/`ENOTEMPTY`; Windows `MoveFile`
 * refuses to overwrite an existing directory with `EPERM`/`EACCES` instead, so
 * for those codes the slot's presence is confirmed before treating the error as
 * benign — a genuine permission failure still propagates (fail closed).
 *
 * @param error - The error thrown by `fs.rename`.
 * @param destVersionDir - The target version slot.
 * @returns `true` when the error means the slot is already present.
 */
async function isSlotExistsError(error: unknown, destVersionDir: string): Promise<boolean> {
  const code = (error as NodeJS.ErrnoException).code;
  return (
    code === 'EEXIST' ||
    code === 'ENOTEMPTY' ||
    ((code === 'EPERM' || code === 'EACCES') && (await isExistingDirectory(destVersionDir)))
  );
}

/**
 * Best-effort removal of version slots strictly older than `keepVersion` under a
 * plugin base root, keeping the cache bounded across upgrades. Never fatal, and
 * never removes `keepVersion` or any equal-or-higher version — so it cannot race
 * a concurrent launch into deleting the slot that launch resolved to.
 *
 * @param baseRoot - `<cacheRoot>/<plugin>`.
 * @param keepVersion - The version just installed; this and any higher are kept.
 */
async function pruneSupersededPluginVersions(baseRoot: string, keepVersion: string): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(baseRoot, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isDirectory() || entry.name === keepVersion) {
        return;
      }
      if (comparePluginVersions(entry.name, keepVersion) >= 0) {
        return;
      }
      await fs.rm(path.join(baseRoot, entry.name), { recursive: true, force: true }).catch(() => undefined);
    })
  );
}

/**
 * Orders two plugin version segments. Parses `major.minor.patch` numerically
 * (build/pre-release suffix ignored) and falls back to lexicographic comparison
 * when either side is not a semver triple, matching the intent of the codex
 * launcher's ordering for our bundle versions.
 *
 * @param a - First version segment.
 * @param b - Second version segment.
 * @returns Negative when `a < b`, positive when `a > b`, zero when equal.
 */
function comparePluginVersions(a: string, b: string): number {
  const pa = parseSemverTriple(a);
  const pb = parseSemverTriple(b);
  if (pa && pb) {
    for (let i = 0; i < 3; i++) {
      const av = pa[i] ?? 0;
      const bv = pb[i] ?? 0;
      if (av !== bv) {
        return av < bv ? -1 : 1;
      }
    }
    return 0;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Parses a `major.minor.patch[-+suffix]` version into its numeric triple.
 *
 * @param version - Version segment to parse.
 * @returns The triple, or `null` when the segment is not a semver-style triple.
 */
function parseSemverTriple(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version);
  if (match === null) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Materializes each bundled plugin into the OpenCode plugin cache under the
 * resolved config dir, then verifies the load path — without touching the
 * user's own OpenCode configuration. Enablement is supplied separately by
 * {@link writeCardsLaunchConfig} through the staged `OPENCODE_CONFIG` document.
 *
 * Each plugin is installed under its own manifest version segment:
 * `<configDir>/plugins/cache/cards/<plugin>/<version>/`. The nested depth is
 * load-bearing: the binary's local plugin scan globs a single level
 * (`{plugin,plugins}/*.{ts,js}`) across the config dir, so cached slots are
 * never auto-loaded — they load only through the explicit absolute paths in the
 * staged config document.
 *
 * Errors from staging, copy, manifest validation, or the publish rename
 * propagate — fail closed.
 *
 * @param configDir - Resolved OpenCode config dir (`$XDG_CONFIG_HOME ?? ~/.config` + `/opencode`).
 * @param marketplacePath - Absolute path to the packaged marketplace directory.
 * @param pluginNames - Plugin set to stage into the cache. Defaults to
 *   `OPENCODE_LAUNCH_PLUGIN_NAMES` (`cards` + `runtime`), preserving launch behavior.
 * @returns Bundle path, source plugin paths, and the on-disk cache load paths.
 */
export async function populateOpencodePluginCache(
  configDir: string,
  marketplacePath: string,
  pluginNames: readonly OpencodePluginName[] = OPENCODE_LAUNCH_PLUGIN_NAMES
): Promise<{
  bundlePath: string;
  pluginPaths: Record<string, string>;
  pluginCachePaths: Record<string, string>;
}> {
  const { bundlePath, pluginPaths, pluginVersions } = await ensureOpencodeBundleAvailable(marketplacePath, pluginNames);
  const pluginCachePaths: Record<string, string> = {};
  const cacheRoot = path.join(configDir, OPENCODE_PLUGINS_CACHE_DIR);
  await fs.mkdir(cacheRoot, { recursive: true });

  for (const pluginName of pluginNames) {
    const destDir = await installPluginToCache(
      pluginName,
      cacheRoot,
      pluginPaths[pluginName]!,
      pluginVersions[pluginName]!
    );

    // Verify the manifest at the exact load path — fail closed. An off-by-one in
    // destDir (missing/wrong version segment) produces a concrete error here
    // rather than a silent "plugin not loaded" at session startup. Race-free:
    // installPluginToCache never moves or removes a live version slot, so no
    // concurrent launch can move this path out from under the read.
    await readOpencodePluginManifest(destDir, pluginName);
    pluginCachePaths[pluginName] = destDir;
  }

  return { bundlePath, pluginPaths, pluginCachePaths };
}

// ============================================================================
// Per-set staged launch configs
// ============================================================================

/**
 * Serializes a staged-config document deterministically: object keys are sorted
 * recursively, arrays keep their (caller-sorted) element order, output is
 * pretty-printed with two-space indent and a trailing newline. Two calls with
 * identical inputs therefore produce identical bytes regardless of property
 * insertion order.
 *
 * @param value - The document to serialize.
 * @returns The deterministic serialization, newline-terminated.
 */
function stableSerialize(value: unknown): string {
  const sortValue = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map(sortValue);
    }
    if (input !== null && typeof input === 'object') {
      const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      return Object.fromEntries(entries.map(([key, entry]) => [key, sortValue(entry)]));
    }
    return input;
  };
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

/**
 * Collects every built hook module (each `*.mjs`) under the enabled plugins'
 * `plugin/` directories, in sorted order.
 *
 * Fail-closed: an enabled plugin whose `plugin/` directory cannot be read
 * aborts the launch — silently enabling a plugin without its hook modules
 * would degrade session behavior invisibly.
 *
 * @param pluginNames - Enabled plugin names.
 * @param pluginCachePaths - Map of plugin name → installed cache dir.
 * @returns Absolute `.mjs` paths, sorted lexicographically.
 */
async function collectPluginEntryPaths(
  pluginNames: readonly OpencodePluginName[],
  pluginCachePaths: Record<string, string>
): Promise<string[]> {
  const entries: string[] = [];
  for (const pluginName of pluginNames) {
    const cacheDir = pluginCachePaths[pluginName];
    if (cacheDir === undefined) {
      throw new Error(`No cache path was populated for enabled OpenCode plugin "${pluginName}"`);
    }
    const pluginDir = path.join(cacheDir, 'plugin');
    const dirents = await fs.readdir(pluginDir, { withFileTypes: true });
    for (const dirent of dirents) {
      if (dirent.isFile() && dirent.name.endsWith('.mjs')) {
        entries.push(path.join(pluginDir, dirent.name));
      }
    }
  }
  return entries.sort();
}

/**
 * Collects each enabled plugin's skills directory that exists on disk, in
 * sorted order. Plugins legitimately ship zero skills directories, so absence
 * contributes nothing; any other stat error propagates.
 *
 * @param pluginNames - Enabled plugin names.
 * @param pluginCachePaths - Map of plugin name → installed cache dir.
 * @returns Absolute existing skills directories, sorted lexicographically.
 */
async function collectSkillDirs(
  pluginNames: readonly OpencodePluginName[],
  pluginCachePaths: Record<string, string>
): Promise<string[]> {
  const dirs: string[] = [];
  for (const pluginName of pluginNames) {
    const cacheDir = pluginCachePaths[pluginName];
    if (cacheDir === undefined || !(await isExistingDirectory(path.join(cacheDir, 'skills')))) {
      continue;
    }
    dirs.push(path.join(cacheDir, 'skills'));
  }
  return dirs.sort();
}

/**
 * Writes the per-plugin-set Cards launch config document consumed by spawned
 * OpenCode sessions via the `OPENCODE_CONFIG` env var.
 *
 * One file PER SET (`cards-launch.config.json` / `cards-assistant.config.json`)
 * — never one per launch — closing the concurrent-launch clobber race: the
 * document holds only set-scoped inputs (enabled plugin hook modules, allow-all
 * tool permissions, skill discovery dirs), so every launch of the same set
 * under the same extension build computes byte-identical content. Concurrent
 * launches hit the stamp-match fast path (current bytes on disk → no write);
 * the rare post-upgrade rewrite lands through a sibling mkdtemp + atomic
 * rename, so a concurrent reader sees either the old or the new complete
 * document, never a partial one.
 *
 * Document shape (live-probed against the installed v1.18.21 binary — the
 * earlier "Config v2 schema" reading was wrong: those schema strings exist but
 * the plugin/skills consumers decode legacy keys):
 *
 * - `"plugin"` (singular) — absolute `.mjs` file specs; the plural form is
 *   silently ignored (`onExcessProperty: "ignore"`), producing dead sessions
 *   with no Cards hooks and exit 0.
 * - `"permission"` — nested allow-all records (`{"*":{"*":"allow"}}`); the key
 *   the running binary itself consumes (workspace-root opencode.json precedent).
 * - `"skills": {"paths": [...]}` — object form only; array-shaped skills
 *   hard-rejects startup (`Expected object | undefined`). Probed live: with
 *   this shape a staged SKILL.md was discoverable by the model; without it,
 *   not. Omitted entirely when a set ships no skill directories.
 *
 * Any v1 key (`plugin`) trips the binary's v1 detection, which then migrates
 * the whole document — so the document is pure v1 throughout. `extras` entries
 * are merged last and win over the base keys; they participate in the
 * determinism contract — callers passing per-card values would break
 * cross-launch byte-stability and must not.
 *
 * Deliberately omitted: per-card `references` (Config v2 record mapping a name
 * to a local path or Git repository) and inline `agents` definitions — see
 * {@link spawnOpencodeSession} for the named degradations.
 *
 * @param stagingDir - Directory receiving the config document.
 * @param set - Which plugin set this document enables; also the file stem.
 * @param pluginNames - Enabled plugin names for this set.
 * @param pluginCachePaths - Map of plugin name → installed cache dir (as
 *   returned by {@link populateOpencodePluginCache}). Every enabled plugin must
 *   have an entry — fail closed otherwise.
 * @param extras - Additional top-level config keys merged over the base document.
 * @returns Absolute path to the staged config document.
 * @throws {Error} When an enabled plugin has no cache path, or a plugin's
 *   `plugin/` directory cannot be read.
 */
export async function writeCardsLaunchConfig(
  stagingDir: string,
  set: OpencodeLaunchConfigSet,
  pluginNames: readonly OpencodePluginName[],
  pluginCachePaths: Record<string, string>,
  extras?: Record<string, unknown>
): Promise<string> {
  const skillDirs = await collectSkillDirs(pluginNames, pluginCachePaths);
  const document: Record<string, unknown> = {
    $schema: 'https://opencode.ai/config.json',
    plugin: await collectPluginEntryPaths(pluginNames, pluginCachePaths),
    permission: { '*': { '*': 'allow' } }
  };
  if (skillDirs.length > 0) {
    // Object form is required — array-shaped skills hard-rejects the document.
    document['skills'] = { paths: skillDirs };
  }
  Object.assign(document, extras ?? {});
  const serialized = stableSerialize(document);

  const stem = set === 'launch' ? 'cards-launch' : 'cards-assistant';
  const configPath = path.join(stagingDir, `${stem}.config.json`);

  // Stamp-match skip: current bytes on disk → leave untouched, so the common
  // concurrent-launch case performs no write at all.
  let current: string | null = null;
  try {
    current = await fs.readFile(configPath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  if (current === serialized) {
    return configPath;
  }

  await fs.mkdir(stagingDir, { recursive: true });
  const staging = await fs.mkdtemp(path.join(stagingDir, '.config-write-'));
  try {
    const stagedPath = path.join(staging, `${stem}.config.json`);
    await fs.writeFile(stagedPath, serialized, 'utf-8');
    await fs.rename(stagedPath, configPath);
  } finally {
    await fs.rm(staging, { recursive: true, force: true }).catch(() => undefined);
  }
  return configPath;
}

// ============================================================================
// Launch
// ============================================================================

/**
 * Builds the CLI argument list for the `opencode` process.
 *
 * Pins the headless run contract verified against the installed binary:
 * `opencode run --dir <worktree> --title <cardId> [message…]` — the prompt is
 * passed as positional arguments, there is no `--add-dir` analog, and there is
 * no system-prompt override flag, so session guidance rides the opening
 * positional turn ahead of the prompt.
 *
 * @param prompt - Prompt passed to OpenCode. Omit for prompt-less sessions.
 * @param workspacePath - Card worktree path used as the session working directory.
 * @param cardId - Card identifier carried on `--title` so the transcript and UI label the session.
 * @param appendSystemPrompt - Session guidance prepended ahead of `prompt` in the positionals.
 * @returns Array of CLI arguments.
 */
export function buildOpencodeArgs(
  prompt: string | undefined,
  workspacePath: string,
  cardId: string,
  appendSystemPrompt?: string
): string[] {
  const args = ['run', '--dir', workspacePath, '--title', cardId];

  const fragments = [appendSystemPrompt?.trim(), prompt?.trim()].filter(
    (fragment): fragment is string => fragment !== undefined && fragment.length > 0
  );
  if (fragments.length > 0) {
    args.push(fragments.join('\n\n'));
  }

  return args;
}

/**
 * Well-known OpenCode install locations probed when the PATH probe fails.
 *
 * The official installer (`curl -fsSL https://opencode.ai/install | bash`)
 * installs to `<home>/.opencode/bin`, which users typically put on PATH from an
 * interactive-shell rc file (`.zshrc`) — a file VS Code's extension host never
 * sources (it resolves its environment through login shells), so a bare-PATH
 * probe misses otherwise-working installs. Mirrors the detection-side fallback
 * in `packages/extension/src/agents/agentDetection.ts`.
 *
 * @returns Absolute candidate paths, best-first.
 */
function wellKnownOpencodeBinaryCandidates(): string[] {
  return [path.join(homedir(), '.opencode', 'bin', process.platform === 'win32' ? 'opencode.exe' : 'opencode')];
}

/**
 * Resolves the `opencode` CLI to an absolute path.
 *
 * Probes PATH via `which`/`where` first; when that fails, probes the well-known
 * installer locations ({@link wellKnownOpencodeBinaryCandidates}) so installs
 * reachable only through interactive-shell PATH edits are found.
 *
 * @returns Absolute binary path, or null when nothing resolves.
 */
export async function resolveOpencodeBinary(): Promise<string | null> {
  try {
    const { stdout } = await execFileNoWindowAsync(process.platform === 'win32' ? 'where' : 'which', ['opencode']);
    const firstLine = stdout.trim().split('\n')[0]?.trim();
    if (firstLine) {
      return firstLine;
    }
  } catch {
    // Not on PATH (or the probe itself failed) — fall through to the
    // well-known locations rather than declaring the CLI absent.
  }

  for (const candidate of wellKnownOpencodeBinaryCandidates()) {
    try {
      await fs.access(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Candidate missing or not executable — try the next one.
    }
  }

  return null;
}

/**
 * Probes for the `opencode` binary before any staging work, failing closed
 * with an actionable message. Mirrors the claude-session launcher's
 * `where`/`which` probe (win32 has no `which`; `where` exits non-zero when the
 * executable is absent).
 *
 * @returns Absolute path to the resolved binary — pass it to {@link spawnAgentCli}
 *          instead of the bare name so a PATH-less extension-host environment
 *          cannot turn an already-verified install into a spawn ENOENT.
 * @throws {Error} When no `opencode` executable resolves on PATH or at the
 *         well-known installer locations.
 */
export async function assertOpencodeBinaryAvailable(): Promise<string> {
  const binaryPath = await resolveOpencodeBinary();
  if (binaryPath === null) {
    throw new Error(
      'The `opencode` CLI was not found on PATH or at ~/.opencode/bin. Install OpenCode and make sure `opencode` ' +
        'resolves on PATH, or switch cards.defaultCodingAgent to another coding agent.'
    );
  }
  return binaryPath;
}

/**
 * Spawns an `opencode` CLI session with worktree lifecycle and prompt-based skill guidance.
 *
 * Stage order mirrors {@link ./codex-session.js} launch-for-launch: pre-spawn
 * binary probe → marketplace resolution → API client → base branch → worktree →
 * plugin-cache staging → per-set staged config → CLI spawn with card env vars →
 * cancel handling → exit settle → card status settle → branch-cleanup watcher.
 *
 * Named degradations (documented plan decisions):
 * - **Per-card `references`**: the Config v2 shape is verified (a record
 *   mapping a name to a local path or Git repository — the `--add-dir` analog),
 *   but folding a per-card path into the shared per-set config document would
 *   break cross-launch byte-determinism and reintroduce the concurrent-launch
 *   clobber race the one-file-per-set design closes. Omitted with this named
 *   note; tool-level access stays governed by the staged allow-all permission
 *   ruleset, and the `CARD_REPO_PATH` env var still reaches every child.
 * - **Inline `agents`**: shipped only when the runtime agents' markdown
 *   frontmatter maps trivially onto Config v2 `agents` entries. It does not —
 *   the frontmatter carries fields with no Config v2 counterpart (`tools`)
 *   alongside out-of-schema color literals — and a rejected inline mapping
 *   would invalidate the whole staged document, silently dropping every other
 *   key with it. Omitted with a warning.
 *
 * @param input - Parsed action input from the environment.
 * @param context - Action context providing logger and lifecycle hooks.
 * @param options - Session-specific parameters.
 */
export async function spawnOpencodeSession(
  input: ActionInput,
  context: ActionContext,
  options: OpencodeSessionOptions
): Promise<void> {
  const { prompt: rawPrompt, appendSystemPrompt } = options;

  const opencodeBinary = await assertOpencodeBinaryAvailable();
  const marketplacePath = resolveMarketplacePath();

  context.logger.info(`${input.actionName} action started`, {
    cardId: input.cardId,
    environment: input.environment,
    executionMode: input.executionMode
  });

  const client = await createCardsClient(context.logger);
  if (!client) {
    throw new Error('Cards API discovery failed — cannot start session');
  }

  const baseBranch = await resolveBaseBranch(input.repoRoot, client);
  const {
    worktreePath: cwd,
    branchName,
    parentBranch
  } = await resolveOrCreateWorktree(input, client, baseBranch, context.logger);

  context.logger.info('Using worktree', { cwd, branch: branchName, baseBranch, parentBranch });

  const configDir = resolveDefaultOpencodeConfigDir();
  const { bundlePath, pluginPaths, pluginCachePaths } = await populateOpencodePluginCache(configDir, marketplacePath);
  context.logger.info('Populated OpenCode plugin cache', { configDir, bundlePath, pluginPaths, pluginCachePaths });

  const stagingDir = resolveCardsOpencodeStagingDir();
  const configPath = await writeCardsLaunchConfig(stagingDir, 'launch', OPENCODE_LAUNCH_PLUGIN_NAMES, pluginCachePaths);
  context.logger.info('Wrote staged Cards launch config', { stagingDir, configPath });

  // See the JSDoc above: these omissions are deliberate, documented degradations.
  context.logger.info('Staged config omits per-card references registration', {
    reason: 'per-card values would break the shared per-set config byte-determinism'
  });
  context.logger.warn(
    'Staged config omits inline agent definitions: shipped agents/*.md frontmatter is not trivially mappable to OpenCode Config v2 agent entries'
  );

  // Card/workspace context (env, card metadata, repo log, workspace log) is
  // injected by the runtime plugin's system.transform hook, so the prompt is
  // passed through unmodified here. The card-repo AGENTS.md, however, sits
  // outside the session's project-discovery path (--dir worktree), so it is
  // folded ahead of any caller-supplied session guidance into the opening
  // positional turn — the same additive composition the codex launcher feeds
  // its developer_instructions channel.
  const cardRepoAgentsMd = readCardRepoAgentsMd(input.cardRepoPath);
  const guidance = composeDeveloperInstructions([cardRepoAgentsMd, appendSystemPrompt]);
  const args = buildOpencodeArgs(rawPrompt, cwd, input.cardId, guidance);

  const child: ChildProcess = spawnAgentCli(opencodeBinary, args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      // Staged activation: ONE extra config layer between the user's global
      // config dir and the project layer. Never OPENCODE_CONFIG_DIR — replacing
      // the config dir would cut the user's provider/model config off.
      OPENCODE_CONFIG: configPath,
      WORKSPACE_PATH: cwd,
      BASE_BRANCH: baseBranch,
      PARENT_BRANCH: parentBranch,
      WORKSPACE_BRANCH: branchName,
      ...(options.suppressExitWhenDone ? { [CARDS_ENV_VARS.EXIT_WHEN_DONE]: 'false' } : {})
    }
  });

  context.onCancel(() => {
    context.logger.info(`${input.actionName} action cancelled, terminating opencode`);
    child.kill('SIGTERM');
  });

  const exitCode = await new Promise<number | null>((resolve) => {
    // Fail closed: a spawn failure (e.g. ENOENT) emits `error` but never
    // `close`, which would leave this promise hung forever. Mirrors the
    // cards-assistant launch guard.
    child.on('error', (error) => {
      context.logger.error('Failed to spawn opencode', {
        error: error instanceof Error ? error.message : String(error)
      });
      resolve(null);
    });
    child.on('close', resolve);
  });

  context.logger.info(`${input.actionName} action completed`, { exitCode });

  // Settle the card's status (active → needs_review) before the watcher can
  // read it: the sweep's first gate is the on-disk status, which otherwise
  // races this exit path from a separate process. See
  // {@link settleCardStatusForCleanup}.
  await settleCardStatusForCleanup(input.cardRepoPath, context.logger);

  try {
    await spawnBranchCleanupWatcher(
      {
        cardId: input.cardId,
        repoRoot: input.repoRoot,
        cardRepoPath: input.cardRepoPath
      },
      context.logger
    );
  } catch (error) {
    context.logger.warn('Failed to spawn branch-cleanup watcher (non-fatal)', {
      error: errorMessage(error)
    });
  }
}
