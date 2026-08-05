/**
 * Loads the authoritative worktree path policy for one worktree creation.
 *
 * Reads `.worktreeignore` and `.worktreeinclude` from the source root — both
 * gitignore syntax, parsed with the `ignore` library — and classifies every
 * git-ignored path into one of three decisions made before any ignored path is
 * provisioned into the worktree:
 *
 * - `omit` — matched by `.worktreeignore`; never provisioned.
 * - `copy` — matched by `.worktreeinclude`; copied as a real file into the
 *   worktree, and any ignored ancestor directory is prevented from being
 *   symlinked.
 * - `share` — the default for unmatched ignored paths; symlinked into the
 *   worktree.
 *
 * Omit wins over copy. Matching sees through symlinked directories: the
 * descendants of git-ignored symlink entries (the workspaces node_modules
 * shape) AND of TRACKED symlink entries under node_modules subtrees (links
 * committed with `git add -f`, which the git-ignored enumeration never
 * reports) are synthesized so rules addressing a package's interior match
 * and the rerouter materializes the package instead of recreating the link.
 * The policy fails closed: a readable-but-invalid, unreadable, or otherwise
 * unprocessable config file — or an enumeration phase that outlives its
 * shared fail-closed deadline — surfaces as a {@link WorktreeIncludeError}
 * before any matching source path can be linked into the destination.
 * Repository-relative paths stay normalized to POSIX form (forward slashes)
 * at the boundary.
 *
 * @summary `.worktreeignore`/`.worktreeinclude` path policy for worktree creation
 * @module worktreePathPolicy
 */

import { spawn } from 'node:child_process';
import type { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import ignore from 'ignore';
import { WorktreeIncludeError } from './worktreeInclude.js';

/**
 * The three-way decision every git-ignored path receives before worktree
 * provisioning:
 *
 * - `omit` — never provisioned (matched by `.worktreeignore`).
 * - `copy` — copied as a real file into the worktree (matched by
 *   `.worktreeinclude`).
 * - `share` — symlinked into the worktree (the default for unmatched ignored
 *   paths).
 */
export type WorktreePathDecision = 'omit' | 'copy' | 'share';

/**
 * Pattern lines configured in `.worktreeignore` (gitignore syntax).
 *
 * Omitted paths are never provisioned into the worktree. Directory patterns
 * cover their descendants, and negation (`!` lines) re-includes paths exactly
 * as the `ignore` library applies gitignore precedence.
 */
export type WorktreeIgnorePatterns = string[];

/**
 * Pattern lines configured in `.worktreeinclude` (gitignore syntax).
 *
 * Matching git-ignored paths are copied into the worktree as real files rather
 * than shared via symlink.
 */
export type WorktreeIncludePatterns = string[];

/**
 * Repository-relative ignored paths normalized to POSIX form, split by
 * collapsed directory versus standalone file entries.
 *
 * Mirrors the output shape of `discoverIgnoredPaths`: fully-ignored
 * directories appear once as `directories` entries (no trailing slash) with
 * their descendants elided, and `files` holds the ignored files not nested
 * under a collapsed directory entry.
 */
export interface WorktreeIgnoredPaths {
  /** Fully-ignored directory entries (no trailing slash). */
  readonly directories: string[];
  /** Ignored files not nested under a collapsed directory entry. */
  readonly files: string[];
}

/**
 * The narrow per-path decision query that provisioning steps consume instead
 * of re-implementing pattern matching.
 *
 * The node_modules rerouter accepts this query object — or the full
 * {@link WorktreePathPolicy}, which satisfies it — so specialized provisioning
 * cannot bypass the repository policy.
 */
export interface WorktreePathQuery {
  /**
   * Classifies any repository-relative POSIX path as omit, copy, or share.
   *
   * The decision is pattern-based: a path is `omit` when it (or any ancestor)
   * matches `.worktreeignore`, `copy` when it is a copied path or an ancestor
   * of one, and `share` otherwise. Rerouting and symlink producers consult
   * this query instead of re-implementing pattern matching, so a descendant
   * such as `node_modules/.vite` that the policy omits or copies is never
   * symlinked. Backslashes are normalized to forward slashes.
   */
  readonly classify: (relativePath: string) => WorktreePathDecision;
  /**
   * Whether `relativePath` is a strict ancestor directory of a
   * matcher-matched omitted path.
   *
   * `classify`'s omit branch is matcher-direct: a file-level pattern such as
   * `node_modules/pkgA/.cache/x.js` matches only the path itself, so its
   * ancestor directories classify `share`. Steps that must never expose an
   * omitted path to worktree-side writes — the node_modules rerouter —
   * consult this to materialize such ancestors as real directories with
   * per-entry decisions instead of symlinking them wholesale. The ancestor
   * set covers omitted interiors of TRACKED symlink entries too (committed
   * node_modules links), so the rerouter materializes those packages as well
   * instead of recreating the checkout's link. Backslashes are normalized to
   * forward slashes.
   */
  readonly isOmitAncestor: (relativePath: string) => boolean;
}

/**
 * The immutable path policy for one worktree creation.
 *
 * Built once from the authoritative collapsed ignored-path input and handed to
 * every downstream provisioning step — symlink creation, include copying,
 * exclude-file writing, and node_modules rerouting — so all of them make the
 * same path decision. Matching is deterministic with omit before copy before
 * share.
 */
export interface WorktreePathPolicy extends WorktreePathQuery {
  /** Pattern lines configured in `.worktreeignore`. */
  readonly ignorePatterns: WorktreeIgnorePatterns;
  /** Pattern lines configured in `.worktreeinclude`. */
  readonly includePatterns: WorktreeIncludePatterns;
  /**
   * Ignored paths omitted from the worktree (matched by `.worktreeignore`).
   * A collapsed ignored directory appears here wholesale when any of its
   * descendants match — a symlink cannot expose part of a directory — unless
   * a descendant is selected for copy, which materializes the directory as a
   * real tree where per-file omission applies. Omit wins over copy for paths
   * matching both config files.
   */
  readonly omit: string[];
  /**
   * Ignored paths copied into the worktree as real files (matched by
   * `.worktreeinclude` and not omitted), including interior paths of
   * symlinked node_modules packages — both git-ignored links and TRACKED
   * links (committed with `git add -f`), whose interiors the git-ignored
   * enumeration never reports. Any ignored ancestor directory of a copied
   * path is prevented from being symlinked.
   */
  readonly copy: string[];
  /**
   * Ignored paths shared into the worktree as symlinks: the collapsed
   * ignored-path input minus omitted paths, copied paths, and every collapsed
   * directory that contains a copied descendant. Unmatched ignored siblings
   * under a copied-parent directory remain absent.
   */
  readonly share: WorktreeIgnoredPaths;
}

/**
 * Upper bound for one `git ls-files` call and the shared fail-closed budget
 * for the policy's whole enumeration phase.
 *
 * Each individual `git ls-files` call gets this much time before it is killed
 * (a hung git — network filesystem, stuck index — must fail closed rather
 * than hang worktree settle forever, matching the 30s timeout
 * `discoverIgnoredPaths` uses for the same full-tree scan). The same window,
 * measured from the start of the enumeration phase, is the single deadline
 * that bounds every phase of that phase — the per-directory scans, the
 * tracked-symlink scan, and the see-through synthesis walks all share it, so
 * "30s bounds the overall enumeration" is actually true. Expiry throws
 * {@link WorktreeIncludeError}; the policy fails closed and never truncates,
 * which would silently drop omit entries.
 */
const GIT_LS_FILES_TIMEOUT_MS = 30_000;

/**
 * Fails closed when the shared enumeration deadline has passed.
 *
 * The deadline is one epoch-ms budget created at the start of the
 * enumeration phase and threaded through every git call and every synthesis
 * walk. Any phase that outlives it rejects with {@link WorktreeIncludeError}
 * — consistent with the per-call `git ls-files` timeout's fail-closed
 * contract — instead of truncating, which would silently drop omit entries
 * for large trees.
 *
 * @param deadline - Epoch-ms deadline from the start of the enumeration phase.
 * @throws {WorktreeIncludeError} When `Date.now()` exceeds `deadline`.
 */
function assertBeforeDeadline(deadline: number): void {
  if (Date.now() > deadline) {
    throw new WorktreeIncludeError(`Worktree path policy enumeration timed out after ${GIT_LS_FILES_TIMEOUT_MS}ms`);
  }
}

/**
 * Runs `git ls-files` and returns null-delimited stdout entries.
 *
 * `--literal-pathspecs` precedes the subcommand so pathspec arguments such as
 * a `:`-prefixed directory name are taken literally instead of being parsed as
 * pathspec magic (which makes the enumeration silently return nothing).
 *
 * The call shares the enumeration phase's fail-closed deadline: a call that
 * would start after the deadline expired is rejected immediately instead of
 * running, so the git phases and the synthesis walks draw from the same
 * budget.
 *
 * @param cwd - Directory to run the command from.
 * @param args - Arguments passed after `ls-files`.
 * @param deadline - Shared enumeration deadline (epoch ms).
 * @returns Array of relative paths (no trailing NUL).
 * @throws {WorktreeIncludeError} When git fails, cannot be spawned, does not
 *   finish within {@link GIT_LS_FILES_TIMEOUT_MS}, or starts after the
 *   shared enumeration `deadline`.
 */
function gitLsFiles(cwd: string, args: string[], deadline: number): Promise<string[]> {
  assertBeforeDeadline(deadline);
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['--literal-pathspecs', 'ls-files', ...args], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new WorktreeIncludeError(`git ls-files timed out after ${GIT_LS_FILES_TIMEOUT_MS}ms`));
    }, GIT_LS_FILES_TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      if (code === 0) {
        resolve(stdout ? stdout.split('\0').filter(Boolean) : []);
      } else {
        const stderr = Buffer.concat(stderrChunks).toString('utf8');
        reject(new WorktreeIncludeError(`git ls-files failed (exit ${String(code)}): ${stderr}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new WorktreeIncludeError(`git ls-files spawn failed: ${err.message}`, { cause: err }));
    });
  });
}

/**
 * Enumerates gitignored files within a directory, seeing through symlinked
 * directories.
 *
 * Runs `git ls-files --ignored --exclude-standard --others` scoped to `dir`,
 * then synthesizes the descendants of any symlink entry whose target resolves
 * to a directory — git reports a symlink entry itself but never descends
 * through it. All reported and synthesized entries are returned unfiltered;
 * the omit and include matchers are applied by the caller so one enumeration
 * feeds both the copy selection and the omit descendant matching.
 *
 * @param sourceRoot - Source checkout root.
 * @param dir - Relative directory path to enumerate within.
 * @param deadline - Shared enumeration deadline (fail-closed).
 * @returns Array of repository-relative paths to git-ignored files under `dir`,
 *   including the synthesized descendants of symlinked directories.
 */
async function enumerateIgnoredFiles(sourceRoot: string, dir: string, deadline: number): Promise<string[]> {
  const entries = await gitLsFiles(
    sourceRoot,
    ['--ignored', '--exclude-standard', '--others', '-z', '--', dir],
    deadline
  );
  const synthesized = await synthesizeSymlinkedDescendants(sourceRoot, entries, deadline);
  return [...entries, ...synthesized];
}

/**
 * Recursively appends the repo-relative descendants of a directory to `out`,
 * seeing through symlinked children whose target resolves to a directory.
 *
 * Every child path is appended in checkout form (`<prefix>/<name>`), whether
 * or not it is descended into, because the path exists in the checkout either
 * way. Directories are never revisited: each entered directory's realpath is
 * recorded before its children are walked, so a symlink cycle (a link that
 * resolves back to an ancestor) terminates on the second encounter and a
 * diamond-shaped link topology synthesizes each subtree once.
 *
 * The walk is bounded by the shared enumeration deadline: the deadline is
 * checked before each directory is entered and before each child is appended,
 * so a walk that outlives the budget rejects fail-closed instead of running
 * unbounded. The per-call `git ls-files` timeout cannot interrupt this
 * recursion — it already resolved before the walk starts — so the deadline
 * is the walk's only bound.
 *
 * @param absDir - Absolute directory whose children are appended.
 * @param prefix - Repo-relative POSIX path of `absDir` in the checkout.
 * @param visited - Realpaths of directories already entered on this walk.
 * @param out - Accumulated repo-relative descendant paths.
 * @param deadline - Shared enumeration deadline (fail-closed).
 */
async function walkSymlinkedDirectory(
  absDir: string,
  prefix: string,
  visited: Set<string>,
  out: string[],
  deadline: number
): Promise<void> {
  assertBeforeDeadline(deadline);
  let realDir: string;
  try {
    realDir = await fs.realpath(absDir);
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;
    // A dangling link or vanished directory contributes nothing, matching
    // git's own tolerance for unreadable ignored content.
    if (code === 'ENOENT' || code === 'ENOTDIR') return;
    throw error;
  }
  if (visited.has(realDir)) return;
  visited.add(realDir);

  let children: Dirent[];
  try {
    children = await fs.readdir(absDir, { withFileTypes: true });
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return;
    throw error;
  }

  await Promise.all(
    children.map(async (child): Promise<void> => {
      assertBeforeDeadline(deadline);
      const childRel = `${prefix}/${child.name}`;
      out.push(childRel);
      if (child.isSymbolicLink()) {
        const childAbs = path.join(absDir, child.name);
        let childTarget: string;
        try {
          childTarget = await fs.readlink(childAbs);
        } catch (error: unknown) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
          throw error;
        }
        await walkSymlinkedDirectory(path.resolve(absDir, childTarget), childRel, visited, out, deadline);
      } else if (child.isDirectory()) {
        await walkSymlinkedDirectory(path.join(absDir, child.name), childRel, visited, out, deadline);
      }
    })
  );
}

/**
 * Synthesizes the repo-relative descendants of symlinked directories among an
 * enumerated entry list.
 *
 * `git ls-files` never descends through a symlinked directory: for the
 * workspaces shape — node_modules entries are links into packages/ — it
 * reports `node_modules/pkgA` but nothing under it, so a policy rule
 * addressing `node_modules/pkgA/.cache/x.js` would otherwise match nothing and
 * the omit/copy decisions for the package's interior would silently no-op. For
 * each entry that is a symlink (decided by lstat, which does not follow links)
 * whose resolved target is a directory, the target is walked recursively with
 * `walkSymlinkedDirectory`, appending the descendants as `<entry>/<child>`
 * paths — exactly the paths as seen in the checkout. The cycle guard bounds
 * the walk on pathological link topologies, and the shared enumeration
 * deadline — one fail-closed budget of {@link GIT_LS_FILES_TIMEOUT_MS}
 * measured from the start of the enumeration phase, covering every `git
 * ls-files` scan and every synthesis walk — bounds the overall enumeration.
 * The `git ls-files` timeout itself cannot bound this walk: it only guards
 * the git subprocess, which resolves before the walk begins. Expiry throws
 * {@link WorktreeIncludeError} (fail closed, never truncating — truncation
 * would silently drop omit entries for large trees).
 *
 * @param sourceRoot - Source checkout root.
 * @param entries - Repo-relative paths reported by `git ls-files`.
 * @param deadline - Shared enumeration deadline (fail-closed).
 * @returns The synthesized repo-relative descendant paths.
 */
async function synthesizeSymlinkedDescendants(
  sourceRoot: string,
  entries: string[],
  deadline: number
): Promise<string[]> {
  const synthesized: string[] = [];
  await Promise.all(
    entries.map(async (entry): Promise<void> => {
      assertBeforeDeadline(deadline);
      const linkAbs = path.join(sourceRoot, entry);
      let linkStats: Awaited<ReturnType<typeof fs.lstat>>;
      try {
        linkStats = await fs.lstat(linkAbs);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw error;
      }
      if (!linkStats.isSymbolicLink()) return;

      let target: string;
      try {
        target = await fs.readlink(linkAbs);
      } catch (error: unknown) {
        // Deleted between lstat and readlink.
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw error;
      }

      const resolvedTarget = path.resolve(path.dirname(linkAbs), target);
      let targetStats: Awaited<ReturnType<typeof fs.stat>>;
      try {
        targetStats = await fs.stat(resolvedTarget);
      } catch (error: unknown) {
        // Dangling link or vanished target: nothing to synthesize.
        if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'ENOTDIR') {
          return;
        }
        throw error;
      }
      if (!targetStats.isDirectory()) return;

      // One walk per entry: two links to the same realpath are two distinct
      // checkout paths, each of which the user's patterns may address.
      const visited = new Set<string>();
      await walkSymlinkedDirectory(resolvedTarget, entry, visited, synthesized, deadline);
    })
  );
  return synthesized;
}

/**
 * Matches the policy patterns against the interiors of TRACKED symlinked
 * node_modules entries.
 *
 * The ignored-only enumeration never reports tracked files, so a committed
 * node_modules link — the workspaces shape force-added, or any committed
 * symlinked directory under a node_modules path — is invisible to it and
 * rules addressing the package's interior silently no-op. Worse, when the
 * package interior is gitignored, a worktree-side write at the ruled path
 * resolves through the recreated link into the source checkout. This phase
 * lists every tracked file's index mode (`git ls-files -s`), keeps the
 * symlink entries (mode 120000) under node_modules subtrees — the only
 * tracked links the rerouter's materialization walk can act on — and feeds
 * them through the same see-through synthesis the ignored enumeration uses,
 * so matcher matches and the omit-ancestor materialization cover tracked
 * package interiors too. The entry paths themselves are matched as well
 * (mirroring the ignored enumeration, where git reports the link), so a
 * directly matched tracked entry is handled as a directly copied path instead
 * of being materialized. Scoping to node_modules keeps the phase honest: a
 * tracked symlink elsewhere has no materialization mechanism, and a copy rule
 * addressing its interior would write through the checkout's link.
 *
 * @param sourceRoot - Source checkout root.
 * @param omitMatcher - `.worktreeignore` matcher.
 * @param includeMatcher - `.worktreeinclude` matcher.
 * @param deadline - Shared enumeration deadline (fail-closed).
 * @returns The matched omit and copy paths among tracked symlink entries and
 *   their synthesized descendants.
 */
async function enumerateTrackedSymlinkInteriors(
  sourceRoot: string,
  omitMatcher: ReturnType<typeof ignore>,
  includeMatcher: ReturnType<typeof ignore>,
  deadline: number
): Promise<{ omitMatches: string[]; copyMatches: string[] }> {
  const tracked = await gitLsFiles(sourceRoot, ['-s', '-z'], deadline);
  const trackedSymlinkEntries = tracked
    .map((line): string | undefined => {
      const tab = line.indexOf('\t');
      if (tab === -1) return undefined;
      // `git ls-files -s` emits `<mode> <object> <stage>\t<path>` per entry;
      // mode 120000 is the symlink mode.
      const mode = line.slice(0, tab).split(' ')[0];
      if (mode !== '120000') return undefined;
      const rel = line.slice(tab + 1);
      return rel.split('/').includes('node_modules') ? rel : undefined;
    })
    .filter((rel): rel is string => rel !== undefined);
  const matched = [
    ...trackedSymlinkEntries,
    ...(await synthesizeSymlinkedDescendants(sourceRoot, trackedSymlinkEntries, deadline))
  ];
  return {
    omitMatches: matched.filter((p) => omitMatcher.ignores(p)),
    copyMatches: matched.filter((p) => !omitMatcher.ignores(p) && includeMatcher.ignores(p))
  };
}

/**
 * Reads one policy config file, treating absence as no patterns.
 *
 * Presence is decided with `lstat`, which does not follow symlinks, so a
 * dangling symlink at the config path still counts as present: its missing
 * target surfaces as a {@link WorktreeIncludeError} naming the config file
 * rather than being silently treated as no patterns. Every other read
 * failure (unreadable file, a directory at the path, an I/O error) fails
 * closed the same way, so worktree creation stops before a matching source
 * path can be linked.
 *
 * @param sourceRoot - Source checkout root.
 * @param name - Which policy config file to read.
 * @returns File contents, or an empty string when the file is absent.
 */
async function readConfigFile(sourceRoot: string, name: '.worktreeignore' | '.worktreeinclude'): Promise<string> {
  const configPath = path.join(sourceRoot, name);
  try {
    await fs.lstat(configPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') return '';
    throw new WorktreeIncludeError(`Failed to stat ${name}: ${err.message}`, { cause: error });
  }
  try {
    return await fs.readFile(configPath, 'utf8');
  } catch (error) {
    throw new WorktreeIncludeError(`Failed to read ${name}: ${(error as Error).message}`, { cause: error });
  }
}

/**
 * Splits config contents into pattern lines, dropping blank lines and
 * comments (the same lines the `ignore` matcher skips).
 *
 * @param content - Raw config file contents.
 * @returns The configured pattern lines as written.
 */
function parsePatterns(content: string): string[] {
  return content.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return trimmed !== '' && !trimmed.startsWith('#');
  });
}

/**
 * Normalizes a repository-relative path to POSIX form.
 *
 * @param relativePath - Repository-relative path, possibly Windows-form.
 * @returns The path with forward-slash separators.
 */
function posixNormalize(relativePath: string): string {
  return relativePath.replace(/\\/g, '/');
}

/**
 * Loads and matches the worktree path policy for one worktree creation.
 *
 * Reads `.worktreeignore` and `.worktreeinclude` from `sourceRoot` (absent
 * files contribute no patterns), intersects `.worktreeignore` matches and
 * `.worktreeinclude` copy selections with the authoritative collapsed
 * ignored-path input, enumerates the ignored descendants of collapsed ignored
 * directories — once, feeding both copy selection and omit descendant
 * matching — plus the synthesized interiors of TRACKED symlink entries under
 * node_modules subtrees (see {@link enumerateTrackedSymlinkInteriors}) — and
 * computes the final omit/copy/share classification. A collapsed ignored
 * directory is omitted wholesale when any of its descendants matches
 * `.worktreeignore` (unless a descendant is selected for copy), because a
 * symlinked directory cannot expose only part of its contents. The query
 * also exposes {@link WorktreePathQuery.isOmitAncestor}, which the
 * node_modules rerouter uses to materialize a matcher-matched omitted path's
 * ancestor directories as real trees instead of symlinking them wholesale.
 *
 * When either config file has patterns, the whole enumeration phase — every
 * per-directory `git ls-files` scan, the tracked-symlink scan, and every
 * see-through synthesis walk — shares one fail-closed deadline of
 * {@link GIT_LS_FILES_TIMEOUT_MS}; expiry rejects with
 * {@link WorktreeIncludeError}, never truncating.
 *
 * @param opts - Options for the policy load.
 * @param opts.sourceRoot - Source checkout root containing the config files.
 * @param opts.ignored - Collapsed ignored paths from `discoverIgnoredPaths`.
 * @returns The immutable policy for this worktree creation.
 * @throws {WorktreeIncludeError} When a config file is unreadable or otherwise
 *   unprocessable, or the enumeration phase (including its deadline) fails —
 *   before any matching source path can be provisioned.
 */
export async function loadWorktreePathPolicy(opts: {
  sourceRoot: string;
  ignored: WorktreeIgnoredPaths;
}): Promise<WorktreePathPolicy> {
  const { sourceRoot, ignored } = opts;

  const ignorePatterns = parsePatterns(await readConfigFile(sourceRoot, '.worktreeignore'));
  const includePatterns = parsePatterns(await readConfigFile(sourceRoot, '.worktreeinclude'));

  const omitMatcher = ignore().add(ignorePatterns);
  const includeMatcher = ignore().add(includePatterns);

  // Omit: collapsed ignored paths matched by .worktreeignore. Collapsed
  // directory entries are tested bare and with a trailing slash so both `dist`
  // and `dist/` patterns match a collapsed `dist` entry. Patterns that address
  // paths INSIDE a collapsed directory (`dist/**`, `dist/*`, `dist/bundle.js`)
  // cannot match the collapsed entry itself; the descendant enumeration below
  // surfaces those and omits the whole directory.
  const omitDirectories = ignored.directories.filter((d) => omitMatcher.ignores(d) || omitMatcher.ignores(`${d}/`));
  const omitFiles = ignored.files.filter((f) => omitMatcher.ignores(f));

  // Copy: ignored files matched by .worktreeinclude, minus anything omitted
  // (omit wins over copy).
  const matchedFiles = ignored.files.filter((f) => includeMatcher.ignores(f) && !omitMatcher.ignores(f));

  // Enumerate each collapsed ignored directory's descendants once. The single
  // enumeration feeds both sides: include patterns select descendants for
  // copy, and omit patterns can only be tested against descendants here — a
  // collapsed `dist` entry never matches `dist/**` or `dist/bundle.js`.
  // Skipped entirely when neither config file has patterns, so the common
  // no-config path pays no per-directory `git ls-files` scan.
  const needsEnumeration = ignorePatterns.length > 0 || includePatterns.length > 0;
  // One shared fail-closed budget for the whole enumeration phase: every
  // per-directory `git ls-files` scan, the tracked-symlink scan, and every
  // see-through synthesis walk must finish within GIT_LS_FILES_TIMEOUT_MS of
  // enumeration start. Expiry throws — the policy fails closed (never
  // truncates, which would silently drop omit entries), matching the
  // per-call git timeout's fail-closed contract.
  const enumerationDeadline = Date.now() + GIT_LS_FILES_TIMEOUT_MS;
  const [nestedByDir, trackedSymlinkMatches] = needsEnumeration
    ? await Promise.all([
        Promise.all(
          ignored.directories.map(async (dir) => {
            const entries = await enumerateIgnoredFiles(sourceRoot, dir, enumerationDeadline);
            const omitMatches = entries.filter((p) => omitMatcher.ignores(p));
            const copyMatches = entries.filter((p) => !omitMatcher.ignores(p) && includeMatcher.ignores(p));
            return { dir, omitMatches, copyMatches };
          })
        ),
        enumerateTrackedSymlinkInteriors(sourceRoot, omitMatcher, includeMatcher, enumerationDeadline)
      ])
    : [[], { omitMatches: [], copyMatches: [] }];

  // A collapsed directory with an omitted descendant cannot be shared: the
  // symlink would expose the omitted path to worktree-side writes that mutate
  // the source. Omit the whole directory — unless a descendant is selected for
  // copy, which materializes the directory as a real tree where per-file
  // omission applies (the omitted sibling simply stays absent).
  const copyParentDirs = new Set(nestedByDir.filter((e) => e.copyMatches.length > 0).map((e) => e.dir));
  for (const e of nestedByDir) {
    if (
      e.omitMatches.length > 0 &&
      !copyParentDirs.has(e.dir) &&
      // Already omitted by a direct match on the collapsed entry itself.
      !omitDirectories.includes(e.dir)
    ) {
      omitDirectories.push(e.dir);
    }
  }

  const omit = [...omitDirectories, ...omitFiles];
  const omitSet = new Set(omit);
  // Tracked symlink interiors join the copy set like enumerated ignored
  // descendants: the include executor reads the source through the tracked
  // link, and the copy ancestors materialize the package in the reroute walk.
  const copy = [...matchedFiles, ...nestedByDir.flatMap((e) => e.copyMatches), ...trackedSymlinkMatches.copyMatches];
  const copySet = new Set(copy);

  // Share: collapsed ignored paths minus omitted paths, copied paths, and
  // every collapsed directory containing a copied descendant. Copy prevents
  // any ancestor ignored directory from being linked, and unmatched ignored
  // siblings under a copied-parent directory remain absent.
  const share: WorktreeIgnoredPaths = {
    directories: ignored.directories.filter((d) => !omitSet.has(d) && !copyParentDirs.has(d)),
    files: ignored.files.filter((f) => !omitSet.has(f) && !copySet.has(f))
  };

  // classify: pattern-based three-way decision. Omit covers ancestors via the
  // gitignore matcher; copy covers the copied paths and their ancestor
  // directories (no symlink may stand above a copied descendant).
  const copyAncestors = new Set<string>();
  for (const copied of copy) {
    const parts = copied.split('/');
    for (let i = 1; i < parts.length; i++) {
      copyAncestors.add(parts.slice(0, i).join('/'));
    }
  }

  // omitAncestors: strict ancestor directories of matcher-matched omitted
  // paths — the direct file matches plus every enumerated omitted descendant,
  // including the synthesized interiors of tracked symlinked node_modules
  // entries, which the ignored enumeration never reports. classify's omit
  // branch is matcher-direct (a file-level pattern matches only the path
  // itself), so these ancestors classify 'share'; the node_modules rerouter
  // consults this set to materialize them as real trees with per-entry
  // decisions instead of symlinking them wholesale and exposing the omitted
  // path to worktree-side writes.
  const omitAncestors = new Set<string>();
  for (const omitted of [
    ...omitFiles,
    ...nestedByDir.flatMap((e) => e.omitMatches),
    ...trackedSymlinkMatches.omitMatches
  ]) {
    const parts = omitted.split('/');
    for (let i = 1; i < parts.length; i++) {
      omitAncestors.add(parts.slice(0, i).join('/'));
    }
  }

  const classify = (relativePath: string): WorktreePathDecision => {
    const normalized = posixNormalize(relativePath);
    if (omitMatcher.ignores(normalized) || omitMatcher.ignores(`${normalized}/`)) {
      return 'omit';
    }
    if (copySet.has(normalized) || copyAncestors.has(normalized)) {
      return 'copy';
    }
    return 'share';
  };

  const isOmitAncestor = (relativePath: string): boolean => omitAncestors.has(posixNormalize(relativePath));

  return { ignorePatterns, includePatterns, omit, copy, share, classify, isOmitAncestor };
}
