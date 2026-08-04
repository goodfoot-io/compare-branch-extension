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
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { resolveWorktreeDir, resolveWorktreesRoot } from './cards-config.js';
import { atomicWriteHookFile, RESOLVE_NODE_BASH } from './git-hooks.js';
import { applyWorktreeInclude } from './worktreeInclude.js';
import { loadWorktreePathPolicy, type WorktreePathQuery } from './worktreePathPolicy.js';
import { createWorktreePerf } from './worktreePerf.js';

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
 * True when a failed `git config` invocation lost a race for `.git/config`
 * and should simply be retried.
 *
 * Two distinct manifestations of the same contention:
 *
 * - POSIX / git's own lock: git takes an exclusive `config.lock` for every
 *   config write and fails immediately with
 *   `error: could not lock config file ...: File exists` when another writer
 *   holds it.
 * - Windows file lock: another process (a file watcher, an antivirus scan,
 *   the cards server) holds `.git/config` open with a sharing violation, so
 *   git cannot read or write it and prints
 *   `warning: unable to access '<...>/config': Permission denied`. For a
 *   `--worktree` write this then cascades into
 *   `fatal: --worktree cannot be used with multiple working trees unless the
 *   config extension worktreeConfig is enabled` — not because the extension is
 *   actually unset (outfit enables it first), but because git could not READ
 *   the locked config to confirm it. Both clear once the holder releases.
 *
 * @param message - The error message from the failed git invocation.
 * @returns True when the failure is transient lock contention worth retrying.
 */
export function isRetryableConfigLock(message: string): boolean {
  if (message.includes('could not lock config file')) return true;
  // Windows sharing-violation on .git/config (and the worktreeConfig cascade).
  const deniedConfigAccess = /unable to access[^\n]*config/i.test(message) && /permission denied/i.test(message);
  return deniedConfigAccess || /worktreeConfig is enabled/i.test(message);
}

/**
 * Runs `git config <args>` and retries on `.git/config` lock contention.
 *
 * Two writers race on the same repo config by design here:
 * {@link createWorktree}'s `settle` phase (via `updateGitExclude`) and
 * `outfitWorktreeForCard` both set `extensions.worktreeConfig` on the repo
 * root, and outfit deliberately runs before `settle` resolves (the A2 early
 * path). The write is idempotent, so the loser of the lock race only needs to
 * retry, not fail. See {@link isRetryableConfigLock} for the POSIX and Windows
 * forms of the contention.
 *
 * @param args - Full git argument list (e.g. `['-C', repo, 'config', key, value]`).
 * @param attempts - Maximum tries before the lock error propagates.
 */
export async function gitConfigWithRetry(args: string[], attempts = 8): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await execFileAsync('git', args, { timeout: 5_000 });
      return;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt < attempts && isRetryableConfigLock(message)) {
        // Linear backoff. A Windows file lock from a watcher/AV scan can hold
        // longer than git's own sub-millisecond config.lock, so allow up to
        // ~1.8s total across the default 8 attempts.
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
        continue;
      }
      throw error;
    }
  }
}

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
 * Creates a symlink at `linkPath`, first removing a pre-existing symlink so the
 * operation is idempotent across re-runs.
 *
 * {@link rerouteNodeModules} can run more than once against the same worktree —
 * a re-fired WorktreeCreate hook, worktree re-entry, or a retried launch. The
 * first run turns `destNodeModules` into a real directory populated with
 * per-entry symlinks, so the symlink-only unlink guard on `destNodeModules`
 * itself no longer fires on a second run and each per-entry `fs.symlink` would
 * reject with `EEXIST`. Unlinking a pre-existing symlink first makes every
 * per-entry link safe to recreate. A non-symlink at `linkPath` is left
 * untouched — the function returns early without error, so genuine on-disk data
 * is never clobbered.
 *
 * @param target - Symlink target (passed through to {@link createSymlink}).
 * @param linkPath - Path at which to create the symlink.
 * @throws {SymlinkPrivilegeError} When the OS denies symlink creation (EPERM/EINVAL).
 */
async function replaceSymlink(target: string, linkPath: string): Promise<void> {
  try {
    const stats = await fs.lstat(linkPath);
    if (stats.isSymbolicLink()) {
      await fs.unlink(linkPath);
    } else {
      return;
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  await createSymlink(target, linkPath);
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
 * This is a pure git primitive — it creates and wires the worktree on disk but
 * knows nothing about cards. Card binding (the `.cards/CARD_ID` marker, hook
 * installation, branch registration, attribution) is layered on top by
 * {@link outfitWorktreeForCard} via `createWorktreeForCard`.
 *
 * @param ref - Branch name, tag name, or commit SHA.
 * @param options - Optional configuration.
 * @param options.cwd - Working directory to use when locating git roots. Defaults to `process.cwd()`.
 * @returns Early result with `path` available immediately and `settle` resolving when setup completes.
 */
export async function createWorktree(ref: string, options?: CreateWorktreeOptions): Promise<EarlyWorktreeResult> {
  // Opt-in phase timing (CARDS_WORKTREE_PERF). A no-op fast path when unset, so
  // the common case allocates nothing and reads no clock. t0 is captured here,
  // so every offset is measured from the start of the call the contributor waits on.
  const perf = createWorktreePerf();

  const { sourceRoot, repoRoot } = await perf.measure('findGitRoots', () =>
    findGitRoots(options?.cwd ?? process.cwd())
  );

  const worktreeDir = resolveWorktreeDir(repoRoot, ref);

  // Run the independent read-only git probes concurrently rather than serially.
  // Previously the worktree-existence guard, ref classification, the branch
  // start point, and a (duplicate) branch-existence check ran one after another
  // (~330ms total). They share no state and git permits concurrent reads, so the
  // prelude collapses to the cost of the slowest probe. Classification is also
  // inlined here so branch existence is checked once, not once here and again
  // inside resolveRefType. resolveHead(sourceRoot) is always valid (HEAD exists)
  // and only consumed on the branch path, so computing it eagerly is safe waste
  // hidden behind the slower probes.
  const [worktreeExists, branchExists, tagExists, commitResolves, startPoint] = await perf.measure(
    'prelude:probes',
    () =>
      Promise.all([
        perf.measure('checkWorktreeExists', () => checkWorktreeExists(repoRoot, worktreeDir)),
        perf.measure('checkBranchExists', () => checkBranchExists(repoRoot, ref)),
        perf.measure('checkTagExists', () => checkTagExists(repoRoot, ref)),
        perf.measure('checkCommitResolves', () => checkCommitResolves(repoRoot, ref)),
        perf.measure('resolveHead(start)', () => resolveHead(sourceRoot))
      ])
  );

  if (worktreeExists) {
    throw new Error(`Error: Worktree already exists at ${worktreeDir}`);
  }

  // Classify with branch > tag > commit precedence, matching resolveRefType. A
  // ref that resolves to none of these is treated as a new branch to create.
  let refType: 'branch' | 'tag' | 'commit';
  if (branchExists) {
    refType = 'branch';
  } else if (tagExists) {
    refType = 'tag';
  } else if (commitResolves) {
    refType = 'commit';
  } else {
    validateBranchName(ref);
    refType = 'branch';
  }

  if (refType === 'branch') {
    validateBranchName(ref);
  }

  // Start the source-only settle discovery now, so it overlaps the expensive
  // `git worktree add` checkout instead of running after it. discoverIgnoredPaths
  // (a full-tree `git ls-files`, ~440ms) and enumerateReroutedNodeModules read
  // only sourceRoot/repoRoot — neither touches the not-yet-created worktree — so
  // hoisting them here hides their cost under the multi-second checkout and
  // shortens total settle time without affecting time-to-usable. A noop catch
  // prevents an unhandled rejection during the checkout window before settle
  // awaits them; settle still awaits each promise and surfaces any real error.
  const ignoredPromise = perf.measure('settle:discoverIgnoredPaths', () => discoverIgnoredPaths(sourceRoot));
  const reroutedPromise = perf.measure('settle:enumerateReroutedNodeModules', () =>
    enumerateReroutedNodeModules({ sourceRoot, repoRoot })
  );
  ignoredPromise.catch(() => undefined);
  reroutedPromise.catch(() => undefined);

  await perf.measure('cleanStaleWorktreeDir', () => cleanStaleWorktreeDir(repoRoot, worktreeDir));

  if (refType === 'branch') {
    await perf.measure('git worktree add', () =>
      addWorktree({ repoRoot, worktreeDir, branchName: ref, branchExists, startPoint })
    );
  } else {
    await perf.measure('git worktree add (detached)', () => addDetachedWorktree(repoRoot, worktreeDir, ref));
  }

  // The worktree directory exists on disk — return early so callers can use
  // the path (e.g. as cwd for spawning processes) while the remaining setup
  // (symlinks, node_modules rerouting, git excludes) runs concurrently. This
  // mark is the time-to-usable boundary the contributor's launch waits on.
  perf.mark('usable-directory');

  const settle = perf.measure('settle:total', async (): Promise<CreateWorktreeResult> => {
    // resolveHead(base) reads only the worktree HEAD (valid the moment the
    // checkout completed) and is independent of every symlink/copy step, so start
    // it at settle entry to overlap all three waves rather than paying for it in
    // the wave-3 tail. A noop catch guards the window before it is awaited below.
    const basePromise = perf.measure('settle:resolveHead(base)', () => resolveHead(worktreeDir));
    basePromise.catch(() => undefined);

    // Enable the worktree-local git config (rev-parse --git-dir + two ordered
    // `git config` writes) now, overlapping the symlink/copy waves. These three
    // subprocesses depend only on the worktree existing, not on any symlink, so
    // running them here instead of in the wave-3 tail hides ~200ms of subprocess
    // latency. The exclude-file *content* still waits for symlinks (wave 2).
    const excludePathPromise = perf.measure('settle:prepareWorktreeExcludes', () =>
      prepareWorktreeExcludes(worktreeDir, repoRoot)
    );
    excludePathPromise.catch(() => undefined);

    // Build the authoritative omit/copy/share policy once, as soon as
    // ignored-path discovery resolves. Discovery started before `git worktree
    // add`, so the policy load — config reads plus the git ls-files enumeration
    // of ignored directories — typically completes during the checkout and
    // overlaps the settle waves below. Every downstream step awaits this same
    // promise so all of them make one path decision: the rerouter skips
    // non-shareable node_modules descendants, the share-candidate join excludes
    // omitted and copied paths from symlinking, and the include copy executor
    // gets the precomputed copy set. A noop catch prevents an unhandled
    // rejection during the checkout window before settle awaits it; settle
    // still awaits it and surfaces any real error (fail-closed before a
    // matching source path can be linked).
    const policyPromise = perf.measure('settle:loadWorktreePathPolicy', async () =>
      loadWorktreePathPolicy({ sourceRoot, ignored: await ignoredPromise })
    );
    policyPromise.catch(() => undefined);

    // Mirror node_modules now, overlapping wave 1 and the exclude-config writes.
    // It writes only the worktree's node_modules trees — disjoint from the root
    // symlinks, .cards copy, and the (node_modules-excluded) ignored-path symlinks
    // — so it is safe to start at settle entry rather than waiting for wave 2. It
    // reuses the enumeration already in flight (reroutedPromise) instead of
    // re-reading package.json and re-lstat-ing every package, and applies the
    // policy (policyPromise) so omitted or copied descendants — e.g.
    // node_modules/.vite — are never symlinked.
    const reroutePromise = perf.measure('settle:rerouteAllNodeModules', async () =>
      rerouteAllNodeModules({
        sourceRoot,
        worktreeDir,
        repoRoot,
        entries: await reroutedPromise,
        policy: await policyPromise
      })
    );
    reroutePromise.catch(() => undefined);

    // True when this call created the branch (`git worktree add -b`). The
    // settle-failure cleanup deletes only the branch it created — a
    // pre-existing branch must survive a failed settle.
    const createdBranch = refType === 'branch' && !branchExists;

    try {
      try {
        // Wave 1: run the worktree-writing copies that needed the worktree to
        // exist. discoverIgnoredPaths / enumerateReroutedNodeModules (started
        // before `git worktree add`) are consumed by the policy and reroute
        // promises above and typically resolve during the checkout, so this wave
        // is bounded by the copies.
        const [reroutedNodeModules] = await perf.measure('settle:wave1', () =>
          Promise.all([
            reroutedPromise,
            perf.measure('settle:copyExistingSymlinks', async () =>
              copyExistingSymlinks(sourceRoot, worktreeDir, await policyPromise)
            ),
            perf.measure('settle:copyCardsDirectory', () => copyCardsDirectory(sourceRoot, worktreeDir))
          ])
        );

        // Synchronization: join the policy with the rerouter's ownership list once
        // both are in hand. Share candidates are the policy's shareable ignored
        // paths minus the directories the rerouter owns (node_modules is rebuilt
        // as a real directory of per-entry symlinks; symlinking first and then
        // unlinking wastes syscalls and creates an ordering dependency between the
        // two steps) and minus .cards, which is copied rather than symlinked so
        // each worktree gets an independent copy. Omitted and copied paths never
        // reach this set — the policy already subtracted them from share.
        const { policy, shareCandidates } = await perf.measure('settle:matchShareCandidates', async () => {
          const policy = await policyPromise;
          const ownedNodeModules = new Set(reroutedNodeModules.map((e) => e.relativePath));
          const shareCandidates: IgnoredPaths = {
            directories: policy.share.directories.filter(
              (d) => d !== '.cards' && !d.startsWith('.cards/') && !ownedNodeModules.has(d)
            ),
            files: policy.share.files.filter((f) => !f.startsWith('.cards/'))
          };
          return { policy, shareCandidates };
        });

        // Wave 2: symlink the share-only ignored paths (node_modules excluded
        // above and rerouted concurrently, .cards copied in wave 1).
        await perf.measure('settle:symlinkIgnoredPaths', () =>
          symlinkIgnoredPaths({ sourceRoot, worktreeDir, ignored: shareCandidates })
        );

        // Wave 3: applyWorktreeInclude runs after symlinkIgnoredPaths — the copy
        // and share sets are disjoint (the policy prevents any ignored ancestor
        // symlink above a copied descendant), and the exclude-file content write
        // needs the wave-2 symlinks in place. The git config was already enabled
        // above (excludePathPromise), so only the cheap filesystem append remains
        // in the tail.
        const [copiedFromInclude] = await perf.measure('settle:wave3', () =>
          Promise.all([
            perf.measure('settle:applyWorktreeInclude', () =>
              applyWorktreeInclude({ sourceRoot, worktreeDir, copySet: policy.copy })
            ),
            perf.measure('settle:writeWorktreeExcludeFile', async () =>
              writeWorktreeExcludeFile(
                await excludePathPromise,
                worktreeDir,
                shareCandidates.directories,
                shareCandidates.files
              )
            )
          ])
        );

        const [baseSha, reroutedCount] = await Promise.all([basePromise, reroutePromise]);

        const result: CreateWorktreeResult = {
          branch: ref,
          worktree: worktreeDir,
          baseSha,
          copiedFromInclude,
          reroutedSymlinks: reroutedCount
        };

        return result;
      } finally {
        // No spawned work may outlive settle. When a wave rejects early, the hoisted
        // promises (resolveHead, the policy load, node_modules reroute, and the
        // prepareWorktreeExcludes git-config subprocesses) are still in flight;
        // awaiting their settlement here guarantees no background git/fs operation
        // races worktree teardown or the consumer's use of the directory. allSettled
        // because their failures, if any, are already surfaced on the success path —
        // here we only need them quiescent.
        await Promise.allSettled([
          ignoredPromise,
          reroutedPromise,
          basePromise,
          excludePathPromise,
          reroutePromise,
          policyPromise
        ]);
      }
    } catch (error) {
      // Fail-closed recovery: the settle phase owns the worktree from the
      // moment `git worktree add` completed. When a wave fails — a fail-closed
      // path-policy error, a symlink-privilege denial, or an unexpected I/O
      // failure — the worktree, its git registration, and (when this call
      // created it) its branch must not be left behind, or every re-run dies
      // with "Worktree already exists" before the user's fix is even
      // evaluated. Cleanup is best-effort: a cleanup failure is logged and
      // must never mask the original settle error rethrown here.
      await cleanupFailedWorktree(repoRoot, worktreeDir, createdBranch ? ref : undefined);
      throw error;
    }
  });

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

  // On Windows a just-exited `git worktree remove` subprocess (or a watcher/AV
  // indexer) can briefly retain a handle into the worktree directory, so the
  // sweep can hit a transient EPERM/EBUSY. fs.rm({recursive:true}) retries
  // EBUSY/EMFILE/ENFILE/ENOTEMPTY/EPERM with linear backoff only when
  // maxRetries > 0. POSIX is unaffected: the first attempt succeeds.
  await fs.rm(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });

  await execFileAsync('git', ['worktree', 'prune'], { cwd: repoRoot, timeout: 30_000 });
}

/**
 * Removes a worktree whose settle phase failed, restoring the pre-creation
 * state so a re-run against the same ref can succeed.
 *
 * The settle phase owns the worktree from the moment `git worktree add`
 * completes: when a wave fails — a fail-closed path-policy error, a
 * symlink-privilege denial, or an unexpected I/O failure — the worktree, its
 * git registration, and (when this call created it) its branch must not be
 * left behind, or every re-run dies with "Worktree already exists" before the
 * user's fix is even evaluated. The branch is deleted only when this call
 * created it (`git worktree add -b`): a pre-existing branch is never deleted
 * by a failed creation.
 *
 * Idempotent and best-effort: a cleanup failure is logged to stderr and
 * swallowed so it can never mask the original settle error, which the caller
 * rethrows.
 *
 * @param repoRoot - Primary repository root where git commands run.
 * @param worktreeDir - Absolute worktree path to remove.
 * @param branchToDelete - Branch name to delete when this call created it.
 */
async function cleanupFailedWorktree(repoRoot: string, worktreeDir: string, branchToDelete?: string): Promise<void> {
  try {
    await removeWorktree(worktreeDir);
    if (branchToDelete !== undefined) {
      await execFileAsync('git', ['branch', '-D', branchToDelete], { cwd: repoRoot, timeout: 30_000 });
    }
  } catch (error: unknown) {
    process.stderr.write(
      `create-worktree: settle failed and cleanup of ${worktreeDir} also failed: ${
        error instanceof Error ? error.message : String(error)
      }\n`
    );
  }
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
 * Checks whether a tag with the given name exists in the repository.
 *
 * @param repoRoot - Primary repository root where git commands run.
 * @param ref - Tag name to query.
 * @returns True when `git tag --list` returns a matching tag.
 */
export async function checkTagExists(repoRoot: string, ref: string): Promise<boolean> {
  const { stdout } = await execFileAsync('git', ['tag', '--list', ref], {
    cwd: repoRoot,
    timeout: 30_000
  });
  return stdout.trim().length > 0;
}

/**
 * Checks whether a ref resolves to a commit object (`<ref>^{commit}`).
 *
 * @param repoRoot - Primary repository root where git commands run.
 * @param ref - Candidate commit-ish to verify.
 * @returns True when `git rev-parse --verify <ref>^{commit}` succeeds.
 */
export async function checkCommitResolves(repoRoot: string, ref: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--verify', `${ref}^{commit}`], {
      cwd: repoRoot,
      timeout: 5_000
    });
    return true;
  } catch {
    return false;
  }
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
  if (await checkBranchExists(repoRoot, ref)) return 'branch';
  if (await checkTagExists(repoRoot, ref)) return 'tag';
  if (await checkCommitResolves(repoRoot, ref)) return 'commit';
  throw new Error(`Error: '${ref}' does not resolve to a branch, tag, or commit.`);
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
  // `worktree add` materializes the entire working tree on disk, so its runtime
  // scales with repo size and host load. A short cap kills the checkout mid-way
  // (SIGTERM) under load, leaving a partial worktree; allow up to 10 minutes.
  await execFileAsync('git', args, { cwd: opts.repoRoot, timeout: 600_000 });
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

/** .cards subtrees whose contents are byte-identical across worktrees and never written per-worktree. */
const STATIC_CARDS_SUBTREES = ['bin', 'www'] as const;

/**
 * Provisions a static `.cards` subtree as a real directory populated with per-entry symlinks to the
 * corresponding source files, recursing so every nested directory is also a real directory.
 *
 * This is the mechanism that structurally enforces write isolation for {@link STATIC_CARDS_SUBTREES}:
 * the destination directory is owned by the worktree, so writing a new file into
 * `worktreeDir/.cards/bin/` (or any depth within `www/`) creates it in the worktree's own directory
 * and never reaches `sourceRoot/.cards`. A directory symlink at any level would defeat this — every
 * write through it would land in the source — so directories are recreated, not linked.
 *
 * The operation is idempotent: per-file links go through {@link replaceSymlink}, which unlinks a
 * pre-existing symlink before recreating it and leaves a real file untouched. Symlink entries in
 * the source are mirrored by reading their target and creating a matching symlink in the
 * destination. ENOENT-tolerant: an absent source subtree is skipped, and a source subtree that
 * disappears mid-operation is caught gracefully (no dangling links, no throw). Non-file,
 * non-directory, non-symlink entries (sockets, devices) are skipped with a stderr warning,
 * matching the error-handling idiom used throughout this file.
 *
 * @param sourcePath - Absolute path to the source subtree (e.g. `sourceRoot/.cards/bin`).
 * @param destPath - Absolute path to the destination subtree (e.g. `worktreeDir/.cards/bin`).
 * @throws {SymlinkPrivilegeError} When the OS denies symlink creation (EPERM/EINVAL).
 */
export async function provisionStaticCardsSubtree(sourcePath: string, destPath: string): Promise<void> {
  try {
    await fs.lstat(sourcePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  // Create the real destination directory only once the source is known to exist,
  // so an absent source never leaves an empty directory behind.
  try {
    await fs.mkdir(destPath, { recursive: true });

    const entries = await fs.readdir(sourcePath, { withFileTypes: true });
    for (const entry of entries) {
      const entrySource = path.join(sourcePath, entry.name);
      const entryDest = path.join(destPath, entry.name);
      if (entry.isDirectory()) {
        await provisionStaticCardsSubtree(entrySource, entryDest);
      } else if (entry.isFile()) {
        await replaceSymlink(entrySource, entryDest);
      } else if (entry.isSymbolicLink()) {
        const symlinkTarget = await fs.readlink(entrySource);
        await replaceSymlink(symlinkTarget, entryDest);
      } else {
        process.stderr.write(
          `create-worktree: skipping non-file, non-directory, non-symlink entry while provisioning static .cards subtree: ${entrySource}\n`
        );
      }
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Copies the `.cards` directory from the source root into the worktree.
 *
 * `.cards` needs an independent copy per worktree rather than a symlink
 * so each worktree can modify its cards state without affecting others.
 *
 * The entire `.cards/logs/` subtree is excluded so a freshly created worktree
 * never inherits another worktree's (or the main repo's) logs. Logs resolve at
 * runtime to the durable main-repo-root path, so copying them would only produce
 * confusing dead copies. The exclusion prunes the directory itself rather than
 * filtering its files one by one — returning `false` for the directory entry
 * stops `fs.cp` from descending into it at all, so provisioning never pays to
 * `stat` and traverse a subtree whose contents are discarded anyway.
 *
 * The static {@link STATIC_CARDS_SUBTREES} (`bin/` and `www/`) are excluded from
 * the copy with the same directory-pruning pattern, then provisioned separately
 * by {@link provisionStaticCardsSubtree} as real directories populated with
 * per-entry symlinks rather than byte-copied. These subtrees are compiled output
 * deployed alongside the extension — byte-identical across worktrees and never
 * written by any per-worktree code path. Per-entry symlinks inside a real
 * directory structurally enforce write isolation: a write through
 * `worktreeDir/.cards/bin/` lands in the worktree's own directory and can never
 * reach `sourceRoot/.cards/bin`. The only permitted writer to the source subtrees
 * is the Cards extension build (which writes to `outdir/bin` and `outdir/www`),
 * not any worktree.
 *
 * The card-binding marker files `.cards/CARD_ID` and
 * `.cards/CARD_ORIGINAL_HOOK_PATH` are also excluded. When the source checkout
 * is itself card-bound, copying these markers would bleed the SOURCE worktree's
 * card identity and original-hooks snapshot into the child worktree — causing
 * wrong-card commit attribution and breaking hook chaining. The child's own
 * markers are written authoritatively by `outfitWorktreeForCard`, so the
 * source's must never be copied in.
 *
 * @param sourceRoot - Source checkout root containing `.cards`.
 * @param worktreeDir - Destination worktree root.
 */
async function copyCardsDirectory(sourceRoot: string, worktreeDir: string): Promise<void> {
  const sourcePath = path.join(sourceRoot, '.cards');
  const destPath = path.join(worktreeDir, '.cards');
  const logsDir = path.join(sourcePath, 'logs');
  const cardIdMarker = path.join(sourcePath, 'CARD_ID');
  const originalHookPathMarker = path.join(sourcePath, 'CARD_ORIGINAL_HOOK_PATH');
  const staticSubtreeDirs = STATIC_CARDS_SUBTREES.map((name) => path.join(sourcePath, name));
  try {
    await fs.cp(sourcePath, destPath, {
      recursive: true,
      filter: (src) =>
        // Prune the logs directory itself: returning false for the directory
        // entry stops fs.cp from recursing into it, so its contents are never
        // stat-ed or traversed. The startsWith guard is defense-in-depth in case
        // the directory entry is ever visited differently across platforms. The
        // static subtrees (bin/, www/) are pruned the same way — they are
        // provisioned as per-entry symlinks below instead of copied.
        src !== logsDir &&
        !src.startsWith(logsDir + path.sep) &&
        src !== cardIdMarker &&
        src !== originalHookPathMarker &&
        !staticSubtreeDirs.some((dir) => src === dir || src.startsWith(dir + path.sep))
    });
  } catch (error: unknown) {
    // ENOENT: source .cards/ does not exist (nothing to copy).
    // EEXIST: destination .cards/ already exists — outfitWorktreeForCard runs
    //   before the settle phase and creates it via writeCardBoundFile. When it
    //   wins the race, fs.cp's internal mkdir sees the existing directory and
    //   throws. The destination already contains the authoritative markers
    //   (CARD_ID, CARD_ORIGINAL_HOOK_PATH), so skipping the copy is safe.
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT' && code !== 'EEXIST') {
      throw error;
    }
  }

  for (const name of STATIC_CARDS_SUBTREES) {
    await provisionStaticCardsSubtree(path.join(sourcePath, name), path.join(destPath, name));
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
 * Appends entries to a worktree's git `info/exclude` so they are hidden from
 * `git status` and never staged.
 *
 * Resolves the worktree's git-dir via `git -C <worktreeDir> rev-parse
 * --git-dir`, ensures `<git-dir>/info/` exists, and appends each entry on its
 * own line. Used to exclude per-worktree binding markers (e.g.
 * `.cards/CARD_ID`) written after worktree creation. Fail-closed: a git-dir
 * resolution failure propagates.
 *
 * @param worktreeDir - Absolute worktree root.
 * @param entries - Exclude patterns to append (each on its own line).
 */
export async function appendWorktreeGitExcludes(worktreeDir: string, entries: readonly string[]): Promise<void> {
  if (entries.length === 0) return;

  const { stdout: gitDir } = await execFileAsync('git', ['-C', worktreeDir, 'rev-parse', '--git-dir'], {
    timeout: 5_000
  });
  const excludePath = path.join(gitDir.trim(), 'info', 'exclude');
  await fs.mkdir(path.dirname(excludePath), { recursive: true });
  await fs.appendFile(excludePath, `${entries.join('\n')}\n`);
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
export function resolveHomeDir(): string {
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
export async function captureOriginalHooksPath(repoRoot: string): Promise<string> {
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

# Skip if CARDS_SKIP_HOOK is set — consistent with the card-repo wrapper
# guard so a single env var suppresses both hook layers.
if [ "$CARDS_SKIP_HOOK" = "1" ]; then
  exit 0
fi
`;
}

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
${RESOLVE_NODE_BASH}
NODE_RUN="$NODE_BIN"
  if [ -n "$NODE_RUN" ]; then
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
${RESOLVE_NODE_BASH}
NODE_RUN="$NODE_BIN"
  if [ -z "$NODE_RUN" ]; then
    echo "cards-hook: no Node.js interpreter available for pre-commit validation" >&2
    exit 1
  fi
  if [ -n "$NODE_RUN" ]; then
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
${RESOLVE_NODE_BASH}
NODE_RUN="$NODE_BIN"
  if [ -n "$NODE_RUN" ]; then
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
${RESOLVE_NODE_BASH}
NODE_RUN="$NODE_BIN"
  if [ -n "$NODE_RUN" ]; then
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
export async function provisionSharedHooksDir(
  sharedHooksDir: string,
  compiledScriptPaths: Record<string, string>
): Promise<void> {
  await fs.mkdir(sharedHooksDir, { recursive: true });

  // Content-addressed skip: the provisioned files are a pure function of the
  // dispatcher template (versioned by DISPATCHER_SCHEMA_VERSION) and the compiled
  // `.mjs` inputs. Key on the version plus each source's size+mtime (a stat, no
  // read) and record it in a marker written last. A matching marker means the dir
  // already holds byte-identical output, so the writes are skipped. This needs
  // no invalidation: a rebuilt `.mjs` changes its stat → a different key → a
  // natural miss; a stale key is simply never matched, never expired. Fail-closed:
  // the marker is written only after every file lands, so a crash mid-provision
  // leaves no marker and the next call re-provisions.
  const markerPath = path.join(sharedHooksDir, MARKER_NAME);
  const provisionKey = await computeHooksProvisionKey(compiledScriptPaths);
  try {
    const existing = await fs.readFile(markerPath, 'utf-8');
    if (existing === provisionKey) {
      return;
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  await Promise.all(
    CLIENT_SIDE_HOOK_TYPES.map(async (hookType) => {
      const hasCardsHook = compiledScriptPaths[hookType] !== undefined;
      const script = buildDispatcherScript(hookType, hasCardsHook);
      await atomicWriteHookFile(fs, sharedHooksDir, hookType, script, 0o755);
    })
  );

  await Promise.all(
    Object.entries(compiledScriptPaths).map(async ([hookType, sourcePath]) => {
      const content = await fs.readFile(sourcePath, 'utf-8');
      await atomicWriteHookFile(fs, sharedHooksDir, `${hookType}.mjs`, content, 0o644);
    })
  );

  // Marker written LAST so its presence proves a complete provision (fail-closed).
  await atomicWriteHookFile(fs, sharedHooksDir, MARKER_NAME, provisionKey, 0o644);
}

/**
 * Filename of the {@link provisionSharedHooksDir} content-addressed marker.
 * Dot-prefixed so it never collides with a hook-type dispatcher script.
 */
const MARKER_NAME = '.provisioned';

/**
 * Bump whenever {@link buildDispatcherScript}, {@link CLIENT_SIDE_HOOK_TYPES},
 * or {@link RESOLVE_NODE_BASH} change so a stale shared-hooks dir is re-provisioned
 * even when the compiled `.mjs` inputs are unchanged. The dispatcher script
 * content is otherwise invisible to the stat-based key.
 */
const DISPATCHER_SCHEMA_VERSION = 1;

/**
 * Computes the content-addressed provisioning key for {@link provisionSharedHooksDir}.
 *
 * The key identifies the exact byte output the dir should hold: the dispatcher
 * schema version, the full ordered hook-type list, and — for each compiled
 * `.mjs` input — its size and mtime (a `stat`, never a content read). A rebuilt
 * `.mjs` changes its mtime/size and so the key, which is what makes the cache
 * invalidation-free: a changed input yields a different key rather than needing
 * an explicit expiry.
 *
 * @param compiledScriptPaths - Map of hook name to compiled `.mjs` source path.
 * @returns Hex sha-256 digest over the version and per-input stat metadata.
 * @throws When a compiled `.mjs` source cannot be stat-ed (fail-closed; the same
 *   missing input would also break the read in the provisioning body).
 */
async function computeHooksProvisionKey(compiledScriptPaths: Record<string, string>): Promise<string> {
  const hash = createHash('sha256');
  hash.update(`v${DISPATCHER_SCHEMA_VERSION}\n`);
  hash.update(`${CLIENT_SIDE_HOOK_TYPES.join(',')}\n`);
  for (const [hookType, sourcePath] of Object.entries(compiledScriptPaths).sort((a, b) => a[0].localeCompare(b[0]))) {
    const stats = await fs.stat(sourcePath);
    hash.update(`${hookType}:${stats.size}:${stats.mtimeMs}\n`);
  }
  return hash.digest('hex');
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
 * Existing destination entries are left untouched. When a
 * {@link WorktreePathQuery} policy is supplied, root symlinks the policy does
 * not classify as share are not mirrored here: omitted ones are never
 * provisioned, and copied ones are owned by the include copy executor
 * ({@link applyWorktreeInclude}), which recreates the symlink at the same
 * path in a later wave — mirroring them first would collide with that copy
 * and fail the settle with EEXIST. A root entry has no ancestor directories,
 * so `classify` returning 'copy' exactly identifies the paths the copy
 * executor will provision.
 *
 * @param sourceRoot - Source checkout root.
 * @param worktreeDir - Destination worktree root.
 * @param policy - Path policy query for omit/copy/share classification.
 * @returns Number of symlinks created in the destination root.
 */
export async function copyExistingSymlinks(
  sourceRoot: string,
  worktreeDir: string,
  policy?: WorktreePathQuery
): Promise<number> {
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
  const ignoredRootEntries = getIgnoredWorktreeRootEntries(sourceRoot);
  const symlinks = entries.filter(
    (entry) =>
      entry.isSymbolicLink() &&
      entry.name !== '.git' &&
      !ignoredRootEntries.has(entry.name) &&
      // Policy-driven skip: an omitted or copied root symlink is not mirrored
      // here. Omitted paths must never be provisioned; copied paths are owned
      // by the include copy executor (applyWorktreeInclude), which recreates
      // the symlink at the same path in wave 3 — mirroring it first would
      // collide with that copy (EEXIST) and abort the settle. A root entry
      // has no ancestor directories, so classify `copy` exactly means the
      // path is in the policy's copy set.
      !(policy !== undefined && policy.classify(entry.name) !== 'share')
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
  /**
   * Repository-relative POSIX path of this node_modules directory (e.g.
   * `node_modules` or `packages/foo/node_modules`), used to build the
   * repository-relative path of each entry for policy classification.
   */
  relativePath?: string;
  /**
   * Path policy query. Entries classified omit or copy — e.g. a
   * `.worktreeignore`-matched `node_modules/.vite` cache — are skipped instead
   * of symlinked: copied descendants are materialized as real files by the
   * include copy step, and omitted ones stay absent. Requires `relativePath`.
   */
  policy?: WorktreePathQuery;
}

/**
 * Mirrors a node_modules tree into the worktree using symlinks.
 *
 * Internal workspace links keep their original relative targets while external
 * links and non-link entries are represented as symlinks to source paths.
 *
 * When a {@link WorktreePathQuery} policy is supplied (with `relativePath`),
 * entries the policy does not classify as share — omitted or copied paths such
 * as `node_modules/.vite` — are skipped at both the top level and inside
 * `@`-scopes, so specialized provisioning never bypasses the repository policy.
 *
 * @param opts - Source and destination node_modules directories, plus optional
 *   policy query and repository-relative path for policy classification.
 * @returns Count of internal workspace symlinks recreated by target path.
 */
export async function rerouteNodeModules(opts: RerouteNodeModulesOptions): Promise<number> {
  const { sourceNodeModules, destNodeModules, relativePath, policy } = opts;

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

  // Policy-driven skip: an entry must be left unlinked when the policy does
  // not classify it share — omitted entries stay absent, and copied
  // descendants are materialized as real files by the include copy executor.
  // Entries inside an @-scope are classified again with their own relative
  // path.
  const policySkips = (entryRel: string | undefined): boolean =>
    entryRel !== undefined && policy !== undefined && policy.classify(entryRel) !== 'share';

  const entries = await fs.readdir(sourceNodeModules, { withFileTypes: true });
  const counts = await Promise.all(
    entries.map(async (entry): Promise<number> => {
      const sourcePath = path.join(sourceNodeModules, entry.name);
      const destPath = path.join(destNodeModules, entry.name);
      const entryRelativePath = relativePath !== undefined ? `${relativePath}/${entry.name}` : undefined;

      // Policy-driven skip: an entry the policy omits outright is never
      // provisioned. Copy-classified entries are still processed — a copied
      // path under @scope/pkgA classifies the whole @scope directory as
      // 'copy', and descending lets the per-entry checks below leave copied
      // descendants unlinked while share siblings keep their symlinks.
      if (entryRelativePath !== undefined && policy !== undefined && policy.classify(entryRelativePath) === 'omit') {
        return 0;
      }

      if (entry.isSymbolicLink()) {
        if (policySkips(entryRelativePath)) {
          return 0;
        }
        const target = await fs.readlink(sourcePath);
        if (isInternalSymlink(target)) {
          await replaceSymlink(target, destPath);
          return 1;
        } else {
          await replaceSymlink(sourcePath, destPath);
          return 0;
        }
      } else if (entry.isDirectory() && entry.name.startsWith('@')) {
        await fs.mkdir(destPath, { recursive: true });
        const scopeEntries = await fs.readdir(sourcePath, { withFileTypes: true });
        const scopeCounts = await Promise.all(
          scopeEntries.map(async (scopeEntry): Promise<number> => {
            const scopeSourcePath = path.join(sourcePath, scopeEntry.name);
            const scopeDestPath = path.join(destPath, scopeEntry.name);
            const scopeRelativePath =
              entryRelativePath !== undefined ? `${entryRelativePath}/${scopeEntry.name}` : undefined;

            if (policySkips(scopeRelativePath)) {
              return 0;
            }

            if (scopeEntry.isSymbolicLink()) {
              const target = await fs.readlink(scopeSourcePath);
              if (isInternalSymlink(target)) {
                await replaceSymlink(target, scopeDestPath);
                return 1;
              } else {
                await replaceSymlink(scopeSourcePath, scopeDestPath);
                return 0;
              }
            } else {
              await replaceSymlink(scopeSourcePath, scopeDestPath);
              return 0;
            }
          })
        );
        return scopeCounts.reduce((sum, c) => sum + c, 0);
      } else {
        if (policySkips(entryRelativePath)) {
          return 0;
        }
        await replaceSymlink(sourcePath, destPath);
        return 0;
      }
    })
  );

  return counts.reduce((sum, c) => sum + c, 0);
}

/**
 * A single node_modules directory that `rerouteAllNodeModules` owns.
 */
export interface ReroutedNodeModulesEntry {
  /**
   * Path relative to the repo root in git/POSIX form ("node_modules",
   * "packages/foo/node_modules"). Used to match against the git-discovered
   * ignored-directory list, so it must use forward slashes.
   */
  relativePath: string;
  /** Absolute source node_modules directory to mirror. */
  sourceNodeModules: string;
}

/**
 * Enumerates the node_modules directories that the rerouter will own.
 *
 * Returns `[]` when `repoRoot/package.json` is absent or has no `workspaces`
 * field — mirroring the early-return behaviour of `rerouteAllNodeModules`.
 *
 * Always includes the root entry. Per-package entries are only included when
 * their source `node_modules` directory exists (matching the `lstat` check in
 * `rerouteAllNodeModules`).
 *
 * @param opts - Options bag.
 * @param opts.sourceRoot - Absolute path to the source checkout root.
 * @param opts.repoRoot - Absolute path to the repository root containing `package.json`.
 * @returns Owned entries in root-first order.
 */
export async function enumerateReroutedNodeModules(opts: {
  sourceRoot: string;
  repoRoot: string;
}): Promise<ReroutedNodeModulesEntry[]> {
  const { sourceRoot, repoRoot } = opts;

  let packageJson: { workspaces?: string[] };
  try {
    const packageJsonContent = await fs.readFile(path.join(repoRoot, 'package.json'), 'utf-8');
    packageJson = JSON.parse(packageJsonContent);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  if (!packageJson.workspaces) {
    return [];
  }

  const entries: ReroutedNodeModulesEntry[] = [
    { relativePath: 'node_modules', sourceNodeModules: path.join(sourceRoot, 'node_modules') }
  ];

  const packagesDir = path.join(sourceRoot, 'packages');
  try {
    const packageEntries = await fs.readdir(packagesDir, { withFileTypes: true });
    for (const entry of packageEntries) {
      if (entry.isDirectory()) {
        const pkgNodeModules = path.join(packagesDir, entry.name, 'node_modules');
        try {
          await fs.lstat(pkgNodeModules);
          entries.push({
            relativePath: `packages/${entry.name}/node_modules`,
            sourceNodeModules: pkgNodeModules
          });
        } catch (error: unknown) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      }
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return entries;
}

interface RerouteAllNodeModulesOptions {
  sourceRoot: string;
  worktreeDir: string;
  repoRoot: string;
  /**
   * Pre-enumerated entries from {@link enumerateReroutedNodeModules}. When
   * supplied, the redundant internal enumeration is skipped — {@link createWorktree}
   * already enumerates once (concurrently with the checkout) and reuses the result
   * here so the same `package.json` read and per-package `lstat`s do not run twice.
   */
  entries?: ReroutedNodeModulesEntry[];
  /**
   * Path policy query (the full {@link WorktreePathPolicy} satisfies this).
   * Entries the policy omits outright (e.g. `.worktreeignore` matches
   * `node_modules/`) are not rebuilt at all; the per-entry skip inside
   * {@link rerouteNodeModules} leaves omitted or copied descendants unlinked.
   */
  policy?: WorktreePathQuery;
}

/**
 * Reroutes root and per-package node_modules directories into the worktree.
 *
 * The operation is skipped when the repository has no workspace configuration.
 *
 * @param opts - Source root, destination worktree root, repo root, optional
 *   pre-enumerated entries, and optional path policy query.
 * @returns Total number of recreated internal workspace symlinks.
 */
export async function rerouteAllNodeModules(opts: RerouteAllNodeModulesOptions): Promise<number> {
  const { sourceRoot, worktreeDir, repoRoot, entries, policy } = opts;

  const reroutedEntries = entries ?? (await enumerateReroutedNodeModules({ sourceRoot, repoRoot }));
  if (reroutedEntries.length === 0) {
    return 0;
  }

  // Each entry mirrors into a distinct destination node_modules tree (the root
  // and one per workspace package), so they write disjoint paths and run
  // concurrently rather than one-after-another. Previously the big root tree
  // blocked the small per-package trees behind it; now they overlap.
  const counts = await Promise.all(
    reroutedEntries.map(async (entry) => {
      // An entry the policy omits outright is not rebuilt at all. Entries
      // classified `copy` are still processed: classify marks the node_modules
      // directory itself `copy` when any descendant is copied, and the
      // per-child skip below leaves copied (and omitted) descendants unlinked
      // while share siblings keep their symlinks.
      if (policy !== undefined && policy.classify(entry.relativePath) === 'omit') {
        return 0;
      }
      const destNodeModules = path.join(worktreeDir, entry.relativePath);
      const destParent = path.dirname(destNodeModules);
      await fs.mkdir(destParent, { recursive: true });
      return rerouteNodeModules({
        sourceNodeModules: entry.sourceNodeModules,
        destNodeModules,
        relativePath: entry.relativePath,
        policy
      });
    })
  );

  return counts.reduce((sum, c) => sum + c, 0);
}

interface UpdateGitExcludeOptions {
  worktreeDir: string;
  repoRoot: string;
  directories: string[];
  files: string[];
  additionalExcludes?: string[];
}

/**
 * Resolves the worktree's `info/exclude` path and enables the worktree-local
 * git config needed for injected symlinks to be ignored by `git status`.
 *
 * This is the subprocess-heavy half of {@link updateGitExclude} — a
 * `rev-parse --git-dir` plus two ordered `git config` writes — and it depends
 * only on the worktree existing, not on any symlink being in place. Splitting it
 * out lets {@link createWorktree} start it at settle entry so the three git
 * subprocesses overlap the symlink/copy waves instead of running in the tail.
 *
 * `extensions.worktreeConfig` MUST be enabled before the `--worktree
 * core.excludesFile` write (D9); both are idempotent and retried on config-lock
 * contention against `outfitWorktreeForCard`, which sets the same repo key.
 *
 * @param worktreeDir - Absolute worktree root.
 * @param repoRoot - Primary repository root.
 * @returns Absolute path to the worktree's `info/exclude` file.
 */
export async function prepareWorktreeExcludes(worktreeDir: string, repoRoot: string): Promise<string> {
  const { stdout: gitDir } = await execFileAsync('git', ['-C', worktreeDir, 'rev-parse', '--git-dir'], {
    timeout: 5_000
  });
  const excludePath = path.join(gitDir.trim(), 'info', 'exclude');
  await fs.mkdir(path.dirname(excludePath), { recursive: true });

  try {
    await gitConfigWithRetry(['-C', repoRoot, 'config', 'extensions.worktreeConfig', 'true']);
  } catch (error: unknown) {
    process.stderr.write(
      `create-worktree: failed to set worktreeConfig extension: ${error instanceof Error ? error.message : String(error)}\n`
    );
  }

  try {
    await gitConfigWithRetry(['-C', worktreeDir, 'config', '--worktree', 'core.excludesFile', excludePath]);
  } catch (error: unknown) {
    process.stderr.write(
      `create-worktree: failed to set core.excludesFile: ${error instanceof Error ? error.message : String(error)}\n`
    );
  }

  return excludePath;
}

/**
 * Appends the symlinked ignored paths to the worktree's `info/exclude` file.
 *
 * This is the symlink-dependent half of {@link updateGitExclude}: it `lstat`s
 * each candidate and lists only the entries that are actually symlinks (the ones
 * the settle phase injected), so it must run after the symlink wave. No git
 * subprocess — pure filesystem — so it is cheap to run in the tail.
 *
 * @param excludePath - Path returned by {@link prepareWorktreeExcludes}.
 * @param worktreeDir - Absolute worktree root.
 * @param directories - Candidate ignored directories (relative to the worktree).
 * @param files - Candidate ignored files (relative to the worktree).
 * @param additionalExcludes - Extra literal exclude lines to append unconditionally.
 */
export async function writeWorktreeExcludeFile(
  excludePath: string,
  worktreeDir: string,
  directories: string[],
  files: string[],
  additionalExcludes?: string[]
): Promise<void> {
  const lines = ['# Symlinks created by instant-worktree'];

  const pushIfSymlink = async (entry: string): Promise<void> => {
    if (!entry) return;
    try {
      const stats = await fs.lstat(path.join(worktreeDir, entry));
      if (stats.isSymbolicLink()) lines.push(entry);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  };

  for (const dir of directories) {
    await pushIfSymlink(dir);
  }
  for (const file of files) {
    await pushIfSymlink(file);
  }

  if (additionalExcludes) {
    for (const entry of additionalExcludes) {
      if (entry) lines.push(entry);
    }
  }

  await fs.appendFile(excludePath, `${lines.join('\n')}\n`);
}

/**
 * Appends symlinked ignored paths to the worktree-specific git exclude file.
 *
 * Also enables `extensions.worktreeConfig` and sets worktree-local
 * `core.excludesFile` so git status in the worktree ignores injected links.
 * Thin wrapper composing {@link prepareWorktreeExcludes} and
 * {@link writeWorktreeExcludeFile}; {@link createWorktree} calls the two halves
 * separately so the config writes overlap the settle waves.
 *
 * @param opts - Worktree path, repo root, and ignored path candidates.
 * @returns No value.
 */
export async function updateGitExclude(opts: UpdateGitExcludeOptions): Promise<void> {
  const { worktreeDir, repoRoot, directories, files, additionalExcludes } = opts;
  const excludePath = await prepareWorktreeExcludes(worktreeDir, repoRoot);
  await writeWorktreeExcludeFile(excludePath, worktreeDir, directories, files, additionalExcludes);
}
