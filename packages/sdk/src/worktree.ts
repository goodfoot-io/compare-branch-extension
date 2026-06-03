/**
 * Git worktree lifecycle management for monorepo workspaces.
 *
 * Creates worktrees with symlinked node_modules, ignored paths, and
 * per-worktree git excludes so the worktree is immediately usable for
 * builds and tests without a separate `yarn install`.
 *
 * Supports both branch-based worktrees (for implementation work) and
 * detached worktrees (for verifying state at a tag or commit).
 *
 * @summary Git worktree creation with monorepo symlink wiring
 * @module worktree
 */

import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { resolveWorktreeDir, resolveWorktreesRoot } from './cards-config.js';
import { applyWorktreeInclude } from './worktreeInclude.js';

/**
 * Thrown when a path argument falls outside the Cards worktrees root.
 *
 * This is a programmer error — the caller supplied a path that would allow
 * destructive operations outside the managed worktrees directory.
 */
export class WorktreeScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorktreeScopeError';
  }
}

const execFileAsync = promisify(execFile);

/**
 * Thrown when a symlink cannot be created because the OS denies the privilege.
 *
 * On Windows, `fs.symlink` fails with `EPERM` (or `EINVAL`) when the session
 * lacks the symlink-creation privilege — i.e. Developer Mode is off and the
 * process is not elevated. Worktrees rely on symlinks to share `node_modules`
 * and ignored paths with the source checkout; falling back to a copy would
 * diverge worktree semantics from macOS/Linux, so this fails closed with an
 * actionable message instead.
 */
export class SymlinkPrivilegeError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SymlinkPrivilegeError';
  }
}

/**
 * Creates a symlink, translating a Windows privilege failure into an actionable
 * {@link SymlinkPrivilegeError}.
 *
 * `fs.symlink` rejects with `EPERM` or `EINVAL` on Windows when the session
 * cannot create symlinks (Developer Mode off and not elevated). Those two codes
 * are re-thrown as a {@link SymlinkPrivilegeError} that tells the user how to
 * enable Developer Mode. Every other error — including `EEXIST` and `ENOENT` —
 * propagates unchanged so existing per-call-site handling is preserved.
 *
 * @param target - Symlink target (passed through to `fs.symlink`).
 * @param linkPath - Path at which to create the symlink.
 * @throws {SymlinkPrivilegeError} When the OS denies symlink creation (EPERM/EINVAL).
 */
async function createSymlink(target: string, linkPath: string): Promise<void> {
  try {
    await fs.symlink(target, linkPath);
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EPERM' || code === 'EINVAL') {
      throw new SymlinkPrivilegeError(
        `Failed to create symlink at ${linkPath}: Windows requires Developer Mode (or an elevated/Administrator session) to create symlinks. Enable it via Settings > System > For developers > Developer Mode, then retry.`,
        { cause: error }
      );
    }
    throw error;
  }
}

/**
 * Validates a branch name against the CLI's safe subset.
 *
 * The name must start with an alphanumeric character and may then include
 * alphanumerics, slashes, underscores, or dashes.
 *
 * @param name - Candidate branch name supplied by the caller.
 * @throws {Error} When the branch name does not match the supported format.
 * @returns No value. Throws on invalid input.
 */
export function validateBranchName(name: string): void {
  const branchNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/;
  if (!branchNameRegex.test(name)) {
    throw new Error('Error: Invalid branch name format.');
  }
}

/**
 * Determines whether a relative path is nested under any known parent path.
 *
 * The check walks ancestor segments of `dir` and returns true on the first
 * match in `parentSet`.
 *
 * @param dir - Relative path to test.
 * @param parentSet - Candidate parent directories represented as relative paths.
 * @returns True when `dir` is nested under a path in `parentSet`.
 */
export function isNestedUnder(dir: string, parentSet: Set<string>): boolean {
  let current = dir;
  while (current.includes('/')) {
    current = current.substring(0, current.lastIndexOf('/'));
    if (parentSet.has(current)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a symlink target points to known monorepo-internal locations.
 *
 * Internal targets are preserved as relative links during node_modules reroute
 * so workspace links keep working inside a worktree.
 *
 * @param target - Symlink target read from the source node_modules entry.
 * @returns True when the target starts with an internal prefix.
 */
export function isInternalSymlink(target: string): boolean {
  // `fs.readlink` returns the target with native separators, so a relative
  // workspace link reads back as `../x` on POSIX and `..\x` on Windows.
  return /^\.\.[/\\]/.test(target);
}

/**
 * Derives the primary repository root from the contents of a worktree's `.git`
 * file (`gitdir: <path-to>/.git/worktrees/<name>`).
 *
 * Git writes this path POSIX-style even on Windows, but accept either separator
 * defensively, then return a path normalized to the host's native separators so
 * it compares equal to `path.resolve`-derived paths.
 *
 * @param content - Raw contents of the `.git` file.
 * @returns The primary repository root in native-separator form.
 */
function repoRootFromGitFile(content: string): string {
  const gitdirPath = content.trim().replace(/^gitdir:\s*/, '');
  const mainGitDir = gitdirPath.replace(/[/\\]worktrees[/\\][^/\\]+$/, '');
  return path.resolve(mainGitDir.replace(/[/\\]\.git$/, ''));
}

/**
 * Compares two filesystem paths for equality, tolerating separator and (on
 * Windows) case differences. Both inputs are resolved to absolute native form.
 *
 * @param a - First path.
 * @param b - Second path.
 * @returns True when the paths refer to the same location.
 */
function pathsEqual(a: string, b: string): boolean {
  const ra = path.resolve(a);
  const rb = path.resolve(b);
  return process.platform === 'win32' ? ra.toLowerCase() === rb.toLowerCase() : ra === rb;
}

export interface CreateWorktreeOptions {
  /** Working directory used when locating git roots. Defaults to `process.cwd()`. */
  cwd?: string;
  /** When set, makes the worktree card-bound (writes `.cards/CARD_ID` and installs hooks). */
  cardId?: string;
  /**
   * Required when `cardId` is provided — map of git hook name to the absolute path of the
   * compiled `.mjs` script. Omitting it while `cardId` is set installs dispatchers with no
   * `.mjs` files, re-creating the D10a silent-attribution-loss risk.
   */
  compiledScriptPaths?: Record<string, string>;
}

export interface CreateWorktreeResult {
  branch: string;
  worktree: string;
  baseSha: string;
  copiedFromInclude: number;
  reroutedSymlinks: number;
}

/**
 * Early return from {@link createWorktree} available as soon as `git worktree add` completes.
 *
 * `path` is the worktree directory, usable immediately (e.g. as a `cwd` for spawning processes).
 * `settle` resolves when the remaining setup (symlinks, node_modules rerouting, git excludes)
 * finishes. Errors in the settle phase reject the promise — they are never silently swallowed.
 */
export interface EarlyWorktreeResult {
  path: string;
  settle: Promise<CreateWorktreeResult>;
}

/**
 * Creates and configures a new git worktree.
 *
 * The workflow validates the ref, creates the worktree, mirrors existing root
 * symlinks, symlinks ignored paths, reroutes node_modules links, and updates
 * per-worktree git excludes.
 *
 * When `ref` is a branch name, the worktree checks out that branch (creating
 * it if needed). When `ref` is a tag or commit SHA, the worktree is created
 * in detached HEAD mode.
 *
 * @param ref - Branch name, tag name, or commit SHA.
 * @param options - Optional configuration.
 * @param options.cwd - Working directory to use when locating git roots. Defaults to `process.cwd()`.
 * @param options.cardId - When provided, makes the worktree card-bound: writes `<worktree>/.cards/CARD_ID`
 *   so workspace git hooks can attribute commits without an inherited env var, and excludes the file
 *   from `git status` via the per-worktree `info/exclude`. Omitting this option leaves the worktree
 *   unbound — no Cards hooks are installed and no commits are attributed.
 * @param options.compiledScriptPaths - Required when `cardId` is provided. Map of hook name to the
 *   absolute path of the compiled `.mjs` script. Omitting it while `cardId` is set installs
 *   dispatchers with no `.mjs` files, re-creating the D10a silent-attribution-loss risk, so it is
 *   rejected.
 * @returns Early result with `path` available immediately and `settle` resolving when setup completes.
 */
export async function createWorktree(ref: string, options?: CreateWorktreeOptions): Promise<EarlyWorktreeResult> {
  const { sourceRoot, repoRoot } = await findGitRoots(options?.cwd ?? process.cwd());

  // Determine whether this is an existing ref or a new branch name.
  // resolveRefType throws for unknown refs; a valid branch name that
  // doesn't exist yet is treated as a new branch to create.
  let refType: 'branch' | 'tag' | 'commit';
  try {
    refType = await resolveRefType(repoRoot, ref);
  } catch {
    validateBranchName(ref);
    refType = 'branch';
  }

  if (refType === 'branch') {
    validateBranchName(ref);
  }

  const worktreeDir = resolveWorktreeDir(repoRoot, ref);

  const worktreeExists = await checkWorktreeExists(repoRoot, worktreeDir);
  if (worktreeExists) {
    throw new Error(`Error: Worktree already exists at ${worktreeDir}`);
  }

  await cleanStaleWorktreeDir(repoRoot, worktreeDir);

  if (refType === 'branch') {
    const startPoint = await resolveHead(sourceRoot);
    const branchExists = await checkBranchExists(repoRoot, ref);
    await addWorktree({ repoRoot, worktreeDir, branchName: ref, branchExists, startPoint });
  } else {
    await addDetachedWorktree(repoRoot, worktreeDir, ref);
  }

  // Attribution-critical pre-settle block (A2 race fix). `claude-session.ts`
  // does NOT await `settle` — it spawns the agent immediately with
  // `cwd=worktreeDir`, so the agent can `git commit` before `settle` resolves.
  // The marker and hook config must therefore be in place BEFORE the early
  // return, on the synchronous path. This runs after `addWorktree` so the
  // worktree dir exists on disk.
  if (options?.cardId !== undefined) {
    if (options.cardId.length === 0) {
      throw new Error('createWorktree: cardId must be a non-empty string');
    }
    // D10a guard: dispatchers without .mjs files silently lose attribution.
    if (!options.compiledScriptPaths || Object.keys(options.compiledScriptPaths).length === 0) {
      throw new Error('createWorktree: compiledScriptPaths required when cardId is set');
    }

    // 1. Write .cards/CARD_ID (writeCardBoundFile mkdir -p's .cards itself).
    await writeCardBoundFile(worktreeDir, options.cardId);

    // 2. Snapshot the pre-existing hooks dir so the dispatcher can chain to it.
    const originalHooksDir = await captureOriginalHooksPath(repoRoot);

    // 3. Record it for the dispatcher to read at hook runtime.
    await fs.writeFile(path.join(worktreeDir, '.cards', 'CARD_ORIGINAL_HOOK_PATH'), originalHooksDir);

    // 4. Provision the shared dispatcher dir (idempotent). It lives at a
    //    global, flat location (`~/.cards/workspace-hooks`) — the provisioned
    //    scripts and `.mjs` payloads are byte-identical across all repos and
    //    worktrees (every repo/worktree-specific value is resolved at runtime),
    //    so a single global dir is correct and keeps it out of any working tree.
    //    `$HOME` is the same anchor the dispatcher uses for `$HOME/.cards/VSCODE_NODE`.
    const sharedHooksDir = path.join(resolveHomeDir(), '.cards', 'workspace-hooks');
    await provisionSharedHooksDir(sharedHooksDir, options.compiledScriptPaths);

    // 5. Enable per-worktree config — MUST precede the --worktree write (D9).
    await execFileAsync('git', ['-C', repoRoot, 'config', 'extensions.worktreeConfig', 'true'], {
      timeout: 5_000
    });

    // 6. Point this worktree at the shared dispatcher dir (D9: after step 5).
    await execFileAsync('git', ['-C', worktreeDir, 'config', '--worktree', 'core.hooksPath', sharedHooksDir], {
      timeout: 5_000
    });
  }

  // The worktree directory exists on disk — return early so callers can use
  // the path (e.g. as cwd for spawning processes) while the remaining setup
  // (symlinks, node_modules rerouting, git excludes) runs concurrently.
  const settle = (async (): Promise<CreateWorktreeResult> => {
    const ignored = await discoverIgnoredPaths(sourceRoot);
    await copyExistingSymlinks(sourceRoot, worktreeDir);

    // .cards is copied rather than symlinked so each worktree gets an independent copy
    const filteredIgnored: IgnoredPaths = {
      directories: ignored.directories.filter((d) => d !== '.cards' && !d.startsWith('.cards/')),
      files: ignored.files.filter((f) => !f.startsWith('.cards/'))
    };
    await symlinkIgnoredPaths({ sourceRoot, worktreeDir, ignored: filteredIgnored });
    await copyCardsDirectory(sourceRoot, worktreeDir);

    const reroutedCount = await rerouteAllNodeModules({ sourceRoot, worktreeDir, repoRoot });
    const copiedFromInclude = await applyWorktreeInclude({ sourceRoot, worktreeDir });

    // Git-excludes are not attribution-critical (display only) so they stay in settle.
    const additionalExcludes =
      options?.cardId !== undefined ? ['.cards/CARD_ID', '.cards/CARD_ORIGINAL_HOOK_PATH'] : [];
    const [, baseSha] = await Promise.all([
      updateGitExclude({
        worktreeDir,
        repoRoot,
        directories: ignored.directories,
        files: ignored.files,
        additionalExcludes
      }),
      resolveHead(worktreeDir)
    ]);

    const result: CreateWorktreeResult = {
      branch: ref,
      worktree: worktreeDir,
      baseSha,
      copiedFromInclude,
      reroutedSymlinks: reroutedCount
    };

    return result;
  })();

  return { path: worktreeDir, settle };
}

/**
 * Removes a Cards-managed worktree and cleans up its git registration.
 *
 * Steps:
 * 1. Scope guard: rejects paths outside `resolveWorktreesRoot()`.
 * 2. Locates `repoRoot` by reading `<worktreePath>/.git` (a worktree file).
 *    Returns immediately when the directory is already gone (idempotent).
 * 3. `git worktree remove --force <path>` from `repoRoot`.
 * 4. Sweeps any leftover directory with `fs.rm`.
 * 5. `git worktree prune` to keep the registry clean.
 *
 * @param worktreePath - Absolute path to the worktree directory to remove.
 * @throws {Error} When `worktreePath` is outside the Cards worktrees root or git operations fail.
 */
export async function removeWorktree(worktreePath: string): Promise<void> {
  if (typeof worktreePath !== 'string' || worktreePath.length === 0) {
    throw new WorktreeScopeError('removeWorktree: worktreePath must be a non-empty string');
  }

  const worktreesRoot = path.resolve(resolveWorktreesRoot());
  const resolved = path.resolve(worktreePath);

  // Canonicalize to follow symlinks before the prefix check.
  // If the path does not exist yet (ENOENT from realpath), fall through to the
  // idempotent no-op at the .git lstat step below.
  let canonical: string;
  try {
    canonical = await fs.realpath(resolved);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      canonical = resolved;
    } else {
      throw error;
    }
  }

  if (!canonical.startsWith(worktreesRoot + path.sep)) {
    throw new WorktreeScopeError(`removeWorktree: path is outside the Cards worktrees root: ${canonical}`);
  }

  const gitFilePath = path.join(resolved, '.git');
  let repoRoot: string;
  try {
    const stats = await fs.lstat(gitFilePath);
    if (stats.isFile()) {
      const content = await fs.readFile(gitFilePath, 'utf-8');
      repoRoot = repoRootFromGitFile(content);
    } else if (stats.isDirectory()) {
      repoRoot = resolved;
    } else {
      throw new Error(`removeWorktree: unexpected .git entry type at ${gitFilePath}`);
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  await execFileAsync('git', ['worktree', 'remove', '--force', resolved], {
    cwd: repoRoot,
    timeout: 30_000
  });

  await fs.rm(resolved, { recursive: true, force: true });

  await execFileAsync('git', ['worktree', 'prune'], { cwd: repoRoot, timeout: 30_000 });
}

/**
 * Removes stale directory remnants left by a crashed previous session.
 *
 * Git doesn't track the worktree, but the directory may still exist on disk,
 * which causes `git worktree add` to fail with "already exists".
 *
 * @param repoRoot - Primary repository root where git commands run.
 * @param worktreeDir - Absolute worktree path being created.
 */
async function cleanStaleWorktreeDir(repoRoot: string, worktreeDir: string): Promise<void> {
  try {
    await fs.access(worktreeDir);
    await fs.rm(worktreeDir, { recursive: true });
    await execFileAsync('git', ['worktree', 'prune'], { cwd: repoRoot, timeout: 30_000 });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

interface GitRoots {
  sourceRoot: string;
  repoRoot: string;
}

/**
 * Locates the current git source root and primary repository root.
 *
 * Supports both standard checkouts (`.git` directory) and worktree checkouts
 * (`.git` file pointing into `.git/worktrees/...`).
 *
 * @param startDir - Directory where upward search begins.
 * @throws {Error} When no git repository marker is found.
 * @returns Paths for the current checkout root and the primary repo root.
 */
export async function findGitRoots(startDir: string): Promise<GitRoots> {
  let currentDir = path.resolve(startDir);
  // Walk up until the filesystem root. `path.dirname(root) === root` on every
  // platform (`/` on POSIX, `C:\` on Windows) — comparing against the literal
  // `'/'` never terminates on Windows.
  for (;;) {
    const gitPath = path.join(currentDir, '.git');
    try {
      const stats = await fs.lstat(gitPath);
      if (stats.isDirectory()) {
        return {
          sourceRoot: currentDir,
          repoRoot: currentDir
        };
      }
      if (stats.isFile()) {
        const gitFileContent = await fs.readFile(gitPath, 'utf-8');
        return {
          sourceRoot: currentDir,
          repoRoot: repoRootFromGitFile(gitFileContent)
        };
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error('Not in a git repository');
    }
    currentDir = parentDir;
  }
}

/**
 * Resolves the HEAD commit SHA for a repository directory.
 *
 * @param cwd - Repository directory passed to `git rev-parse HEAD`.
 * @returns Trimmed commit SHA string.
 */
export async function resolveHead(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd, timeout: 5_000 });
  return stdout.trim();
}

/**
 * Checks whether a worktree path is already registered with git.
 *
 * @param repoRoot - Primary repository root where git commands run.
 * @param worktreeDir - Absolute worktree path being created.
 * @returns True when `git worktree list` already contains `worktreeDir`.
 */
export async function checkWorktreeExists(repoRoot: string, worktreeDir: string): Promise<boolean> {
  const { stdout } = await execFileAsync('git', ['worktree', 'list', '--porcelain'], {
    cwd: repoRoot,
    timeout: 30_000
  });
  for (const line of stdout.split('\n')) {
    if (!line.startsWith('worktree ')) {
      continue;
    }
    // `git worktree list --porcelain` emits forward slashes on Windows and the
    // line may carry a trailing CR; compare separator- and case-tolerantly.
    const listed = line.slice('worktree '.length).trim();
    if (pathsEqual(listed, worktreeDir)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a branch already exists in the repository.
 *
 * @param repoRoot - Primary repository root where git commands run.
 * @param branchName - Branch name to query.
 * @returns True when at least one matching local branch is listed.
 */
export async function checkBranchExists(repoRoot: string, branchName: string): Promise<boolean> {
  const { stdout } = await execFileAsync('git', ['branch', '--list', branchName], {
    cwd: repoRoot,
    timeout: 30_000
  });
  return stdout.trim().length > 0;
}

/**
 * Determines whether a git ref is a branch, tag, or commit SHA.
 *
 * Checks local branches first, then tags, then falls back to verifying
 * the ref resolves as a commit.
 *
 * @param repoRoot - Primary repository root where git commands run.
 * @param ref - The ref to classify.
 * @throws {Error} When the ref does not resolve to any known git object.
 * @returns The ref type: `'branch'`, `'tag'`, or `'commit'`.
 */
export async function resolveRefType(repoRoot: string, ref: string): Promise<'branch' | 'tag' | 'commit'> {
  const branchExists = await checkBranchExists(repoRoot, ref);
  if (branchExists) return 'branch';

  const { stdout: tagOutput } = await execFileAsync('git', ['tag', '--list', ref], {
    cwd: repoRoot,
    timeout: 30_000
  });
  if (tagOutput.trim().length > 0) return 'tag';

  try {
    await execFileAsync('git', ['rev-parse', '--verify', `${ref}^{commit}`], {
      cwd: repoRoot,
      timeout: 5_000
    });
    return 'commit';
  } catch {
    throw new Error(`Error: '${ref}' does not resolve to a branch, tag, or commit.`);
  }
}

interface AddWorktreeOptions {
  repoRoot: string;
  worktreeDir: string;
  branchName: string;
  branchExists: boolean;
  startPoint: string;
}

/**
 * Adds a git worktree, creating the branch when needed.
 *
 * Uses `git worktree add -b` for new branches and plain `git worktree add`
 * when attaching to an existing branch.
 *
 * @param opts - Worktree creation options and branch existence state.
 * @returns No value.
 */
export async function addWorktree(opts: AddWorktreeOptions): Promise<void> {
  const args = opts.branchExists
    ? ['worktree', 'add', opts.worktreeDir, opts.branchName]
    : ['worktree', 'add', '-b', opts.branchName, opts.worktreeDir, opts.startPoint];
  await execFileAsync('git', args, { cwd: opts.repoRoot, timeout: 30_000 });
}

/**
 * Adds a git worktree in detached HEAD mode at the given ref.
 *
 * Used for tags and commit SHAs where no branch association is needed.
 *
 * @param repoRoot - Primary repository root where git commands run.
 * @param worktreeDir - Absolute path for the new worktree.
 * @param ref - Tag name or commit SHA to check out.
 */
export async function addDetachedWorktree(repoRoot: string, worktreeDir: string, ref: string): Promise<void> {
  await execFileAsync('git', ['worktree', 'add', '--detach', worktreeDir, ref], {
    cwd: repoRoot,
    timeout: 30_000
  });
}

interface IgnoredPaths {
  directories: string[];
  files: string[];
}

/**
 * Discovers ignored files and directories under a source root.
 *
 * Paths are returned relative to `sourceRoot` and `.worktrees` content is
 * filtered out to avoid self-referential symlinking.
 *
 * @param sourceRoot - Source checkout root used for git discovery.
 * @returns Separate lists of ignored directories and ignored files.
 */
export async function discoverIgnoredPaths(sourceRoot: string): Promise<IgnoredPaths> {
  const { stdout } = await execFileAsync(
    'git',
    ['-C', sourceRoot, 'ls-files', '--ignored', '--exclude-standard', '--directory', '--others'],
    { cwd: sourceRoot, timeout: 30_000 }
  );

  const ignoredPrefixes = getIgnoredWorktreePrefixes(sourceRoot);
  const lines = stdout.split('\n').filter((line) => line.length > 0 && !isIgnoredWorktreePath(line, ignoredPrefixes));
  const directories = lines.filter((l) => l.endsWith('/')).map((l) => l.slice(0, -1));
  const files = lines.filter((l) => !l.endsWith('/'));

  return { directories, files };
}

/**
 * Copies the `.cards` directory from the source root into the worktree.
 *
 * `.cards` needs an independent copy per worktree rather than a symlink
 * so each worktree can modify its cards state without affecting others.
 *
 * Stale `*.log` files under `.cards/logs/` are excluded so a freshly created
 * worktree never inherits another worktree's (or the main repo's) logs. Logs
 * resolve at runtime to the durable main-repo-root path, so copying them would
 * only produce confusing dead copies.
 *
 * @param sourceRoot - Source checkout root containing `.cards`.
 * @param worktreeDir - Destination worktree root.
 */
async function copyCardsDirectory(sourceRoot: string, worktreeDir: string): Promise<void> {
  const sourcePath = path.join(sourceRoot, '.cards');
  const logsDir = path.join(sourcePath, 'logs');
  try {
    await fs.cp(sourcePath, path.join(worktreeDir, '.cards'), {
      recursive: true,
      filter: (src) => !(src.startsWith(logsDir + path.sep) && src.endsWith('.log'))
    });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Writes the per-worktree `.cards/CARD_ID` marker.
 *
 * Workspace git hooks read this file (via `git rev-parse --show-toplevel` then
 * `<root>/.cards/CARD_ID`) to attribute commits to a card without inheriting
 * the legacy `CARD_ID` environment variable. The trailing newline is intentional
 * — text-mode tools and `git diff` expect a newline-terminated file.
 *
 * @param worktreeDir - Absolute worktree root.
 * @param cardId - Card identifier to record.
 */
export async function writeCardBoundFile(worktreeDir: string, cardId: string): Promise<void> {
  const cardsDir = path.join(worktreeDir, '.cards');
  await fs.mkdir(cardsDir, { recursive: true });
  await fs.writeFile(path.join(cardsDir, 'CARD_ID'), `${cardId}\n`);
}

/**
 * Removes the per-worktree `.cards/CARD_ID` marker.
 *
 * ENOENT-tolerant: if the file does not exist the call is a no-op. Any other
 * error is re-thrown so genuine failures (permission denied, I/O errors) remain
 * visible to the caller.
 *
 * @param worktreeDir - Absolute worktree root.
 */
export async function clearCardBoundFile(worktreeDir: string): Promise<void> {
  try {
    await fs.unlink(path.join(worktreeDir, '.cards', 'CARD_ID'));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Resolves the user's home directory.
 *
 * Prefers `$HOME` so the resolution matches the dispatcher's own
 * `$HOME/.cards/VSCODE_NODE` anchor (and stays overridable in tests), falling
 * back to `os.homedir()` when `$HOME` is unset.
 *
 * @returns Absolute path to the home directory.
 */
function resolveHomeDir(): string {
  const home = process.env['HOME'];
  if (home !== undefined && home.length > 0) {
    return home;
  }
  return os.homedir();
}

/**
 * Resolves the repository's pre-existing hooks directory.
 *
 * Reads `git -C <repoRoot> config core.hooksPath`. When unset or empty, returns
 * the default `<repoRoot>/.git/hooks`. The dispatcher reads this path at hook
 * runtime to chain to the developer's own hooks (D8).
 *
 * @param repoRoot - Primary repository root.
 * @returns Absolute path to the original hooks directory.
 */
async function captureOriginalHooksPath(repoRoot: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', repoRoot, 'config', 'core.hooksPath'], {
      timeout: 5_000
    });
    const value = stdout.trim();
    if (value.length > 0) {
      return path.isAbsolute(value) ? value : path.join(repoRoot, value);
    }
  } catch (error: unknown) {
    // `git config <key>` exits 1 when the key is unset — not an error here.
    if ((error as { code?: unknown }).code === undefined) {
      throw error;
    }
  }
  return path.join(repoRoot, '.git', 'hooks');
}

/**
 * All client-side git hook types the per-worktree dispatcher must cover (D1).
 */
const CLIENT_SIDE_HOOK_TYPES = [
  'applypatch-msg',
  'pre-applypatch',
  'post-applypatch',
  'pre-commit',
  'prepare-commit-msg',
  'commit-msg',
  'post-commit',
  'pre-rebase',
  'post-checkout',
  'post-merge',
  'pre-push',
  'post-rewrite',
  'reference-transaction',
  'post-index-change',
  'pre-merge-commit',
  'sendemail-validate',
  'push-to-checkout'
] as const;

/**
 * Shared prologue for every dispatcher: locate the worktree, the Cards `.mjs`
 * (if any for this type), the recorded original hooks dir, and the original
 * hook path. `git rev-parse --show-toplevel` returns the correct worktree root
 * even though this script lives in a shared dir, because git sets `GIT_DIR`
 * per-worktree at hook invocation (D8).
 *
 * @param hookType - Git hook name this dispatcher serves.
 * @returns The shared bash prologue for that hook type.
 */
function dispatcherPrologue(hookType: string): string {
  return `#!/bin/bash
# cards-workspace-dispatcher: ${hookType}
WORKTREE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
CARDS_HOOK="$(dirname "$0")/${hookType}.mjs"
ORIGINAL_HOOKS_DIR=$(cat "$WORKTREE_ROOT/.cards/CARD_ORIGINAL_HOOK_PATH" 2>/dev/null)
ORIGINAL_HOOK="$ORIGINAL_HOOKS_DIR/${hookType}"
`;
}

/**
 * Resolves the Node interpreter into `$NODE_RUN`. Prefers the extension's
 * bundled interpreter (`~/.cards/VSCODE_NODE`), falls back to `node` on PATH.
 */
const RESOLVE_NODE = `NODE_BIN=$(cat "$HOME/.cards/VSCODE_NODE" 2>/dev/null)
if [ -n "$NODE_BIN" ] && [ -x "$NODE_BIN" ]; then
  NODE_RUN="$NODE_BIN"
elif command -v node >/dev/null 2>&1; then
  NODE_RUN="node"
else
  NODE_RUN=""
fi
`;

/**
 * Builds the dispatcher script for a single hook type.
 *
 * Per-category templates (D2/D3/D5/D11/`<fail-closed>`):
 * - `post-commit`: Cards `.mjs` runs first (non-blocking), then chains the
 *   original hook with exec for exit-code propagation. No stdin read (D11).
 * - `pre-commit`: Cards `.mjs` runs first; `rc=$?` captured before any `[`
 *   test; non-zero blocks the commit fail-closed; then chains the original.
 *   No stdin read (D11).
 * - `post-rewrite`: stdin captured byte-exact to a temp file so both the
 *   Cards `.mjs` and the original hook read the same stream.
 * - `pre-push`/`reference-transaction`: no Cards `.mjs`; pass-through `exec`
 *   with stdin inherited directly (no capture).
 * - `commit-msg`/`prepare-commit-msg`: file-arg, no stdin; forward `"$@"`.
 * - everything else: pass-through-only `exec` with stdin inherited.
 *
 * @param hookType - Git hook name.
 * @param hasCardsHook - Whether a compiled `.mjs` is provisioned for this type.
 * @returns Bash script content.
 */
function buildDispatcherScript(hookType: string, hasCardsHook: boolean): string {
  const prologue = dispatcherPrologue(hookType);

  if (hookType === 'post-commit') {
    return `${prologue}
# Cards post-commit: non-blocking, runs first
if [ -f "$CARDS_HOOK" ]; then
${RESOLVE_NODE}  if [ -n "$NODE_RUN" ]; then
    "$NODE_RUN" "$CARDS_HOOK"
  fi
fi

# Forward to original hook with exit-code propagation (D3)
if [ -x "$ORIGINAL_HOOK" ]; then
  exec "$ORIGINAL_HOOK" "$@"
fi
exit 0
`;
  }

  if (hookType === 'pre-commit') {
    return `${prologue}
# Cards pre-commit runs first — capture rc before any test consumes $? (fail-closed)
if [ -f "$CARDS_HOOK" ]; then
${RESOLVE_NODE}  if [ -n "$NODE_RUN" ]; then
    "$NODE_RUN" "$CARDS_HOOK"
    rc=$?
    if [ "$rc" -ne 0 ]; then exit "$rc"; fi
  fi
fi

# Then original
if [ -x "$ORIGINAL_HOOK" ]; then
  exec "$ORIGINAL_HOOK" "$@"
fi
exit 0
`;
  }

  if (hookType === 'post-rewrite') {
    return `${prologue}
# Byte-exact stdin capture so both consumers read the identical stream
STDIN_TMPFILE=$(mktemp)
cat > "$STDIN_TMPFILE"

if [ -f "$CARDS_HOOK" ]; then
${RESOLVE_NODE}  if [ -n "$NODE_RUN" ]; then
    "$NODE_RUN" "$CARDS_HOOK" "$@" < "$STDIN_TMPFILE"
  fi
fi
if [ -x "$ORIGINAL_HOOK" ]; then
  "$ORIGINAL_HOOK" "$@" < "$STDIN_TMPFILE"
  EXIT_CODE=$?
  rm -f "$STDIN_TMPFILE"
  exit $EXIT_CODE
fi
rm -f "$STDIN_TMPFILE"
exit 0
`;
  }

  if (hookType === 'commit-msg' || hookType === 'prepare-commit-msg') {
    // File-arg hooks: git passes a file path as $1, no stdin involved.
    const cardsBlock = hasCardsHook
      ? `if [ -f "$CARDS_HOOK" ]; then
${RESOLVE_NODE}  if [ -n "$NODE_RUN" ]; then
    "$NODE_RUN" "$CARDS_HOOK" "$@"
  fi
fi
`
      : '';
    return `${prologue}
${cardsBlock}if [ -x "$ORIGINAL_HOOK" ]; then
  exec "$ORIGINAL_HOOK" "$@"
fi
exit 0
`;
  }

  // pre-push, reference-transaction, and all remaining types: pass-through
  // only. `exec` inherits the shell's stdin fd directly — no $(cat), no
  // pipeline, no buffering — so stdin-driven hooks work and non-stdin hooks
  // never block (D11). The original hook's exit code becomes ours (D3).
  return `${prologue}
if [ -x "$ORIGINAL_HOOK" ]; then
  exec "$ORIGINAL_HOOK" "$@"
fi
exit 0
`;
}

/**
 * Provisions the shared per-worktree dispatcher directory.
 *
 * Writes one bash dispatcher script per client-side git hook type and copies
 * the compiled Cards `.mjs` for each entry in `compiledScriptPaths`. Idempotent
 * and safe under concurrency — safe to call for every worktree that shares the
 * global `sharedHooksDir` (`~/.cards/workspace-hooks`).
 *
 * Each file is written to a uniquely-named temp file in the same directory and
 * `rename(2)`d into place. `rename(2)` within a directory is atomic, so a
 * concurrent `createWorktree` writing byte-identical content can never expose a
 * half-written script to a hook invocation.
 *
 * @param sharedHooksDir - Absolute path to the shared hooks directory.
 * @param compiledScriptPaths - Map of hook name to compiled `.mjs` source path.
 */
async function provisionSharedHooksDir(
  sharedHooksDir: string,
  compiledScriptPaths: Record<string, string>
): Promise<void> {
  await fs.mkdir(sharedHooksDir, { recursive: true });

  const atomicWrite = async (destName: string, content: string, mode: number): Promise<void> => {
    const destPath = path.join(sharedHooksDir, destName);
    const tmpPath = path.join(sharedHooksDir, `.${destName}.${process.pid}.${randomUUID()}.tmp`);
    try {
      await fs.writeFile(tmpPath, content, { mode });
      // `writeFile` honors `mode` only when it creates the file; enforce it
      // explicitly so a pre-existing umask cannot leave the script non-exec.
      await fs.chmod(tmpPath, mode);
      await fs.rename(tmpPath, destPath);
    } catch (error: unknown) {
      await fs.rm(tmpPath, { force: true });
      throw error;
    }
  };

  await Promise.all(
    CLIENT_SIDE_HOOK_TYPES.map(async (hookType) => {
      const hasCardsHook = compiledScriptPaths[hookType] !== undefined;
      const script = buildDispatcherScript(hookType, hasCardsHook);
      await atomicWrite(hookType, script, 0o755);
    })
  );

  await Promise.all(
    Object.entries(compiledScriptPaths).map(async ([hookType, sourcePath]) => {
      const content = await fs.readFile(sourcePath, 'utf-8');
      await atomicWrite(`${hookType}.mjs`, content, 0o644);
    })
  );
}

interface SymlinkIgnoredPathsOptions {
  sourceRoot: string;
  worktreeDir: string;
  ignored: IgnoredPaths;
}

interface SymlinkIgnoredPathsResult {
  dirCount: number;
  fileCount: number;
}

/**
 * Symlinks ignored directories and files from source checkout into a worktree.
 *
 * Nested ignored directories are collapsed so only top-level ignored directory
 * links are created.
 *
 * @param opts - Source root, destination worktree, and ignored path lists.
 * @returns Counts of successfully created directory and file symlinks.
 */
export async function symlinkIgnoredPaths(opts: SymlinkIgnoredPathsOptions): Promise<SymlinkIgnoredPathsResult> {
  const { sourceRoot, worktreeDir, ignored } = opts;
  const dirSet = new Set(ignored.directories);
  const nonNestedDirs = ignored.directories.filter((dir) => !isNestedUnder(dir, dirSet));

  const createDirSymlink = async (dir: string): Promise<boolean> => {
    try {
      const sourcePath = path.join(sourceRoot, dir);
      try {
        await fs.lstat(sourcePath);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return false;
        }
        process.stderr.write(
          `create-worktree: unexpected error in lstat: ${error instanceof Error ? error.message : String(error)}\n`
        );
        return false;
      }
      const destPath = path.join(worktreeDir, dir);
      const parentDir = path.dirname(dir);
      if (parentDir !== '.') {
        await fs.mkdir(path.join(worktreeDir, parentDir), { recursive: true });
      }
      await createSymlink(sourcePath, destPath);
      return true;
    } catch (error: unknown) {
      // A privilege failure must fail closed — never degrade to a silent skip.
      if (error instanceof SymlinkPrivilegeError) {
        throw error;
      }
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EEXIST' || code === 'ENOENT') {
        return false;
      }
      process.stderr.write(
        `create-worktree: unexpected error in symlink: ${error instanceof Error ? error.message : String(error)}\n`
      );
      return false;
    }
  };

  const createFileSymlink = async (file: string): Promise<boolean> => {
    try {
      const sourcePath = path.join(sourceRoot, file);
      try {
        await fs.lstat(sourcePath);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return false;
        }
        process.stderr.write(
          `create-worktree: unexpected error in lstat: ${error instanceof Error ? error.message : String(error)}\n`
        );
        return false;
      }
      const destPath = path.join(worktreeDir, file);
      const parentDir = path.dirname(file);
      if (parentDir !== '.') {
        await fs.mkdir(path.join(worktreeDir, parentDir), { recursive: true });
      }
      await createSymlink(sourcePath, destPath);
      return true;
    } catch (error: unknown) {
      // A privilege failure must fail closed — never degrade to a silent skip.
      if (error instanceof SymlinkPrivilegeError) {
        throw error;
      }
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'EEXIST' || code === 'ENOENT') {
        return false;
      }
      process.stderr.write(
        `create-worktree: unexpected error in symlink: ${error instanceof Error ? error.message : String(error)}\n`
      );
      return false;
    }
  };

  const dirResults = await Promise.all(nonNestedDirs.map(createDirSymlink));
  const nonNestedFiles = ignored.files.filter((file) => !isNestedUnder(file, dirSet));
  const fileResults = await Promise.all(nonNestedFiles.map(createFileSymlink));

  const dirCount = dirResults.filter((r) => r).length;
  const fileCount = fileResults.filter((r) => r).length;

  return { dirCount, fileCount };
}

/**
 * Replicates root-level symlinks from the source checkout into the worktree.
 *
 * Existing destination entries are left untouched.
 *
 * @param sourceRoot - Source checkout root.
 * @param worktreeDir - Destination worktree root.
 * @returns Number of symlinks created in the destination root.
 */
export async function copyExistingSymlinks(sourceRoot: string, worktreeDir: string): Promise<number> {
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
  const ignoredRootEntries = getIgnoredWorktreeRootEntries(sourceRoot);
  const symlinks = entries.filter(
    (entry) => entry.isSymbolicLink() && entry.name !== '.git' && !ignoredRootEntries.has(entry.name)
  );

  const copySymlink = async (name: string): Promise<boolean> => {
    const destPath = path.join(worktreeDir, name);
    try {
      await fs.lstat(destPath);
      return false; // Destination already exists
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    const sourceLinkPath = path.join(sourceRoot, name);

    // Skip self-referencing symlinks (target resolves back to the symlink itself)
    const target = await fs.readlink(sourceLinkPath);
    const resolvedTarget = path.resolve(sourceRoot, target);
    if (resolvedTarget === sourceLinkPath) {
      return false;
    }

    await createSymlink(sourceLinkPath, destPath);
    return true;
  };

  const results = await Promise.all(symlinks.map((e) => copySymlink(e.name)));
  return results.filter((r) => r).length;
}

function getIgnoredWorktreePrefixes(sourceRoot: string): string[] {
  const prefixes = new Set<string>(['.worktrees']);
  const worktreesRoot = path.resolve(resolveWorktreesRoot());
  const relativeRoot = path.relative(sourceRoot, worktreesRoot);

  if (!relativeRoot.startsWith('..') && !path.isAbsolute(relativeRoot)) {
    const normalized = normalizeRelativePath(relativeRoot);
    if (normalized.length > 0) {
      prefixes.add(normalized);
    }
  }

  return [...prefixes];
}

function getIgnoredWorktreeRootEntries(sourceRoot: string): Set<string> {
  const entries = new Set<string>(['.worktrees']);

  for (const prefix of getIgnoredWorktreePrefixes(sourceRoot)) {
    const [rootEntry] = prefix.split('/');
    if (rootEntry) {
      entries.add(rootEntry);
    }
  }

  return entries;
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath
    .split(path.sep)
    .filter((segment) => segment.length > 0 && segment !== '.')
    .join('/');
}

function isIgnoredWorktreePath(candidate: string, ignoredPrefixes: string[]): boolean {
  const normalizedCandidate = candidate.replace(/\/$/, '');
  return ignoredPrefixes.some(
    (prefix) => normalizedCandidate === prefix || normalizedCandidate.startsWith(`${prefix}/`)
  );
}

interface RerouteNodeModulesOptions {
  sourceNodeModules: string;
  destNodeModules: string;
}

/**
 * Mirrors a node_modules tree into the worktree using symlinks.
 *
 * Internal workspace links keep their original relative targets while external
 * links and non-link entries are represented as symlinks to source paths.
 *
 * @param opts - Source and destination node_modules directories.
 * @returns Count of internal workspace symlinks recreated by target path.
 */
export async function rerouteNodeModules(opts: RerouteNodeModulesOptions): Promise<number> {
  const { sourceNodeModules, destNodeModules } = opts;

  try {
    await fs.lstat(sourceNodeModules);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0;
    }
    throw error;
  }

  try {
    const destStats = await fs.lstat(destNodeModules);
    if (destStats.isSymbolicLink()) {
      await fs.unlink(destNodeModules);
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  await fs.mkdir(destNodeModules, { recursive: true });

  const entries = await fs.readdir(sourceNodeModules, { withFileTypes: true });
  const counts = await Promise.all(
    entries.map(async (entry): Promise<number> => {
      const sourcePath = path.join(sourceNodeModules, entry.name);
      const destPath = path.join(destNodeModules, entry.name);

      if (entry.isSymbolicLink()) {
        const target = await fs.readlink(sourcePath);
        if (isInternalSymlink(target)) {
          await createSymlink(target, destPath);
          return 1;
        } else {
          await createSymlink(sourcePath, destPath);
          return 0;
        }
      } else if (entry.isDirectory() && entry.name.startsWith('@')) {
        await fs.mkdir(destPath, { recursive: true });
        const scopeEntries = await fs.readdir(sourcePath, { withFileTypes: true });
        const scopeCounts = await Promise.all(
          scopeEntries.map(async (scopeEntry): Promise<number> => {
            const scopeSourcePath = path.join(sourcePath, scopeEntry.name);
            const scopeDestPath = path.join(destPath, scopeEntry.name);

            if (scopeEntry.isSymbolicLink()) {
              const target = await fs.readlink(scopeSourcePath);
              if (isInternalSymlink(target)) {
                await createSymlink(target, scopeDestPath);
                return 1;
              } else {
                await createSymlink(scopeSourcePath, scopeDestPath);
                return 0;
              }
            } else {
              await createSymlink(scopeSourcePath, scopeDestPath);
              return 0;
            }
          })
        );
        return scopeCounts.reduce((sum, c) => sum + c, 0);
      } else {
        await createSymlink(sourcePath, destPath);
        return 0;
      }
    })
  );

  return counts.reduce((sum, c) => sum + c, 0);
}

interface RerouteAllNodeModulesOptions {
  sourceRoot: string;
  worktreeDir: string;
  repoRoot: string;
}

/**
 * Reroutes root and per-package node_modules directories into the worktree.
 *
 * The operation is skipped when the repository has no workspace configuration.
 *
 * @param opts - Source root, destination worktree root, and repo root.
 * @returns Total number of recreated internal workspace symlinks.
 */
export async function rerouteAllNodeModules(opts: RerouteAllNodeModulesOptions): Promise<number> {
  const { sourceRoot, worktreeDir, repoRoot } = opts;

  let packageJson: { workspaces?: string[] };
  try {
    const packageJsonContent = await fs.readFile(path.join(repoRoot, 'package.json'), 'utf-8');
    packageJson = JSON.parse(packageJsonContent);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0;
    }
    throw error;
  }

  if (!packageJson.workspaces) {
    return 0;
  }

  let totalCount = 0;

  totalCount += await rerouteNodeModules({
    sourceNodeModules: path.join(sourceRoot, 'node_modules'),
    destNodeModules: path.join(worktreeDir, 'node_modules')
  });

  const packagesDir = path.join(sourceRoot, 'packages');
  try {
    const packageEntries = await fs.readdir(packagesDir, { withFileTypes: true });
    for (const entry of packageEntries) {
      if (entry.isDirectory()) {
        const pkgNodeModules = path.join(packagesDir, entry.name, 'node_modules');
        let nodeModulesExists = false;
        try {
          await fs.lstat(pkgNodeModules);
          nodeModulesExists = true;
        } catch (error: unknown) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
        if (nodeModulesExists) {
          const destPackageDir = path.join(worktreeDir, 'packages', entry.name);
          await fs.mkdir(destPackageDir, { recursive: true });
          totalCount += await rerouteNodeModules({
            sourceNodeModules: pkgNodeModules,
            destNodeModules: path.join(destPackageDir, 'node_modules')
          });
        }
      }
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return totalCount;
}

interface UpdateGitExcludeOptions {
  worktreeDir: string;
  repoRoot: string;
  directories: string[];
  files: string[];
  additionalExcludes?: string[];
}

/**
 * Appends symlinked ignored paths to the worktree-specific git exclude file.
 *
 * Also enables `extensions.worktreeConfig` and sets worktree-local
 * `core.excludesFile` so git status in the worktree ignores injected links.
 *
 * @param opts - Worktree path, repo root, and ignored path candidates.
 * @returns No value.
 */
export async function updateGitExclude(opts: UpdateGitExcludeOptions): Promise<void> {
  const { worktreeDir, repoRoot, directories, files, additionalExcludes } = opts;

  const { stdout: gitDir } = await execFileAsync('git', ['-C', worktreeDir, 'rev-parse', '--git-dir'], {
    timeout: 5_000
  });
  const excludePath = path.join(gitDir.trim(), 'info', 'exclude');
  await fs.mkdir(path.dirname(excludePath), { recursive: true });

  const lines = ['# Symlinks created by instant-worktree'];

  for (const dir of directories) {
    if (!dir) continue;
    try {
      const stats = await fs.lstat(path.join(worktreeDir, dir));
      if (stats.isSymbolicLink()) lines.push(dir);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  for (const file of files) {
    if (!file) continue;
    try {
      const stats = await fs.lstat(path.join(worktreeDir, file));
      if (stats.isSymbolicLink()) lines.push(file);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  if (additionalExcludes) {
    for (const entry of additionalExcludes) {
      if (entry) lines.push(entry);
    }
  }

  await fs.appendFile(excludePath, `${lines.join('\n')}\n`);

  try {
    await execFileAsync('git', ['-C', repoRoot, 'config', 'extensions.worktreeConfig', 'true'], { timeout: 5_000 });
  } catch (error: unknown) {
    process.stderr.write(
      `create-worktree: failed to set worktreeConfig extension: ${error instanceof Error ? error.message : String(error)}\n`
    );
  }

  try {
    await execFileAsync('git', ['-C', worktreeDir, 'config', '--worktree', 'core.excludesFile', excludePath], {
      timeout: 5_000
    });
  } catch (error: unknown) {
    process.stderr.write(
      `create-worktree: failed to set core.excludesFile: ${error instanceof Error ? error.message : String(error)}\n`
    );
  }
}
