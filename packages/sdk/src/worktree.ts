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
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { resolveWorktreeDir, resolveWorktreesRoot } from './cards-config.js';
import { applyWorktreeInclude } from './worktreeInclude.js';

const execFileAsync = promisify(execFile);

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
  return target.startsWith('../');
}

export interface CreateWorktreeResult {
  branch: string;
  worktree: string;
  baseSha: string;
  copiedFromInclude: number;
  reroutedSymlinks?: number;
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
 * @returns Early result with `path` available immediately and `settle` resolving when setup completes.
 */
export async function createWorktree(ref: string, options?: { cwd?: string }): Promise<EarlyWorktreeResult> {
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

    const [, baseSha] = await Promise.all([
      updateGitExclude({ worktreeDir, repoRoot, directories: ignored.directories, files: ignored.files }),
      resolveHead(worktreeDir)
    ]);

    const result: CreateWorktreeResult = {
      branch: ref,
      worktree: worktreeDir,
      baseSha,
      copiedFromInclude
    };

    if (reroutedCount > 0) {
      result.reroutedSymlinks = reroutedCount;
    }

    return result;
  })();

  return { path: worktreeDir, settle };
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
  while (currentDir !== '/') {
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
        const gitdirLine = gitFileContent.trim();
        const gitdirPath = gitdirLine.replace(/^gitdir:\s*/, '');
        const mainGitDir = gitdirPath.replace(/\/worktrees\/[^/]+$/, '');
        const repoRoot = mainGitDir.replace(/\/\.git$/, '');
        return {
          sourceRoot: currentDir,
          repoRoot
        };
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('Not in a git repository');
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
    if (line.startsWith('worktree ') && line.slice('worktree '.length) === worktreeDir) {
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
 * @param sourceRoot - Source checkout root containing `.cards`.
 * @param worktreeDir - Destination worktree root.
 */
async function copyCardsDirectory(sourceRoot: string, worktreeDir: string): Promise<void> {
  const sourcePath = path.join(sourceRoot, '.cards');
  try {
    await fs.cp(sourcePath, path.join(worktreeDir, '.cards'), { recursive: true });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
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
      await fs.symlink(sourcePath, destPath);
      return true;
    } catch (error: unknown) {
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
      await fs.symlink(sourcePath, destPath);
      return true;
    } catch (error: unknown) {
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

    await fs.symlink(sourceLinkPath, destPath);
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
          await fs.symlink(target, destPath);
          return 1;
        } else {
          await fs.symlink(sourcePath, destPath);
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
                await fs.symlink(target, scopeDestPath);
                return 1;
              } else {
                await fs.symlink(scopeSourcePath, scopeDestPath);
                return 0;
              }
            } else {
              await fs.symlink(scopeSourcePath, scopeDestPath);
              return 0;
            }
          })
        );
        return scopeCounts.reduce((sum, c) => sum + c, 0);
      } else {
        await fs.symlink(sourcePath, destPath);
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
  const { worktreeDir, repoRoot, directories, files } = opts;

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
