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
 * Omit wins over copy. The policy fails closed: a readable-but-invalid,
 * unreadable, or otherwise unprocessable config file surfaces as a
 * {@link WorktreeIncludeError} before any matching source path can be linked
 * into the destination. Repository-relative paths stay normalized to POSIX
 * form (forward slashes) at the boundary.
 *
 * @summary `.worktreeignore`/`.worktreeinclude` path policy for worktree creation
 * @module worktreePathPolicy
 */

import { spawn } from 'node:child_process';
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
   * per-entry decisions instead of symlinking them wholesale. Backslashes are
   * normalized to forward slashes.
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
   * `.worktreeinclude` and not omitted). Any ignored ancestor directory of a
   * copied path is prevented from being symlinked.
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
 * Upper bound for one `git ls-files` enumeration, matching the 30s timeout
 * `discoverIgnoredPaths` uses for the same full-tree scan. A hung git (network
 * filesystem, stuck index) must fail closed rather than hang worktree settle
 * forever.
 */
const GIT_LS_FILES_TIMEOUT_MS = 30_000;

/**
 * Runs `git ls-files` and returns null-delimited stdout entries.
 *
 * `--literal-pathspecs` precedes the subcommand so pathspec arguments such as
 * a `:`-prefixed directory name are taken literally instead of being parsed as
 * pathspec magic (which makes the enumeration silently return nothing).
 *
 * @param cwd - Directory to run the command from.
 * @param args - Arguments passed after `ls-files`.
 * @returns Array of relative paths (no trailing NUL).
 * @throws {WorktreeIncludeError} When git fails, cannot be spawned, or does
 *   not finish within {@link GIT_LS_FILES_TIMEOUT_MS}.
 */
function gitLsFiles(cwd: string, args: string[]): Promise<string[]> {
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
 * Enumerates gitignored files within a directory.
 *
 * Runs `git ls-files --ignored --exclude-standard --others` scoped to `dir`.
 * All reported entries are returned unfiltered; the omit and include matchers
 * are applied by the caller so one enumeration feeds both the copy selection
 * and the omit descendant matching.
 *
 * @param sourceRoot - Source checkout root.
 * @param dir - Relative directory path to enumerate within.
 * @returns Array of repository-relative paths to git-ignored files under `dir`.
 */
async function enumerateIgnoredFiles(sourceRoot: string, dir: string): Promise<string[]> {
  return gitLsFiles(sourceRoot, ['--ignored', '--exclude-standard', '--others', '-z', '--', dir]);
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
 * matching — and computes the final omit/copy/share classification. A
 * collapsed ignored directory is omitted wholesale when any of its
 * descendants matches `.worktreeignore` (unless a descendant is selected for
 * copy), because a symlinked directory cannot expose only part of its
 * contents. The query also exposes {@link WorktreePathQuery.isOmitAncestor},
 * which the node_modules rerouter uses to materialize a matcher-matched
 * omitted path's ancestor directories as real trees instead of symlinking
 * them wholesale.
 *
 * @param opts - Options for the policy load.
 * @param opts.sourceRoot - Source checkout root containing the config files.
 * @param opts.ignored - Collapsed ignored paths from `discoverIgnoredPaths`.
 * @returns The immutable policy for this worktree creation.
 * @throws {WorktreeIncludeError} When a config file is unreadable or otherwise
 *   unprocessable, or the ignored-descendant enumeration fails — before any
 *   matching source path can be provisioned.
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
  const nestedByDir = needsEnumeration
    ? await Promise.all(
        ignored.directories.map(async (dir) => {
          const entries = await enumerateIgnoredFiles(sourceRoot, dir);
          const omitMatches = entries.filter((p) => omitMatcher.ignores(p));
          const copyMatches = entries.filter((p) => !omitMatcher.ignores(p) && includeMatcher.ignores(p));
          return { dir, omitMatches, copyMatches };
        })
      )
    : [];

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
  const copy = [...matchedFiles, ...nestedByDir.flatMap((e) => e.copyMatches)];
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
  // paths — the direct file matches plus every enumerated omitted descendant.
  // classify's omit branch is matcher-direct (a file-level pattern matches
  // only the path itself), so these ancestors classify 'share'; the node_modules
  // rerouter consults this set to materialize them as real trees with per-entry
  // decisions instead of symlinking them wholesale and exposing the omitted
  // path to worktree-side writes.
  const omitAncestors = new Set<string>();
  for (const omitted of [...omitFiles, ...nestedByDir.flatMap((e) => e.omitMatches)]) {
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
