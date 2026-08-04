/**
 * Applies `.worktreeinclude` copy rules after the symlink-reroute pass.
 *
 * Consumes the precomputed copy set from the worktree path policy (see
 * `worktreePathPolicy`) and copies each listed path into the worktree,
 * preserving mode bits and symlinks-as-symlinks. Parsing `.worktreeinclude`
 * and expanding its patterns against gitignored paths is the policy loader's
 * job; this function only executes the copies.
 *
 * @summary `.worktreeinclude` copy step for worktree creation
 * @module worktreeInclude
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Thrown when the `.worktreeinclude` processing step fails.
 *
 * The CLI maps this class to exit code 3 so callers can distinguish include-file
 * failures from general worktree-creation failures (exit code 2).
 */
export class WorktreeIncludeError extends Error {
  override name = 'WorktreeIncludeError';
}

/**
 * Copies the precomputed `.worktreeinclude` copy set into a freshly-created
 * worktree.
 *
 * Each repository-relative path in `copySet` is copied from `sourceRoot` into
 * `worktreeDir`, preserving mode bits and representing symlinks as symlinks
 * rather than dereferencing them. Missing paths are tolerated (a file that
 * disappeared between enumeration and copy is skipped); parent directories are
 * created on demand.
 *
 * Returns the count of files copied. Throws {@link WorktreeIncludeError} on
 * stat or copy failure.
 *
 * @param opts - Options for the include step.
 * @param opts.sourceRoot - Source checkout root containing the files to copy.
 * @param opts.worktreeDir - Destination worktree root.
 * @param opts.copySet - Precomputed repository-relative paths to copy (from
 *   `loadWorktreePathPolicy`).
 * @returns Count of files copied from the include list.
 */
export async function applyWorktreeInclude(opts: {
  sourceRoot: string;
  worktreeDir: string;
  copySet: string[];
}): Promise<number> {
  const { sourceRoot, worktreeDir, copySet } = opts;

  if (copySet.length === 0) return 0;

  // Copy each path
  let count = 0;
  for (const relPath of copySet) {
    const srcAbs = path.join(sourceRoot, relPath);
    const destAbs = path.join(worktreeDir, relPath);

    let stat: Awaited<ReturnType<typeof fs.lstat>>;
    try {
      stat = await fs.lstat(srcAbs);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') continue;
      throw new WorktreeIncludeError(`Failed to stat ${relPath}: ${err.message}`, { cause: error });
    }

    if (stat.isDirectory()) continue;

    try {
      await fs.mkdir(path.dirname(destAbs), { recursive: true });
    } catch (error) {
      throw new WorktreeIncludeError(`Failed to create parent directory for ${relPath}: ${(error as Error).message}`, {
        cause: error
      });
    }

    if (stat.isSymbolicLink()) {
      try {
        const target = await fs.readlink(srcAbs);
        await fs.symlink(target, destAbs);
      } catch (error) {
        // On Windows, symlink creation fails with EPERM/EINVAL when the session
        // lacks the privilege (Developer Mode off and not elevated). Fail closed
        // with an actionable message rather than degrading to a copy, which
        // would diverge worktree semantics from macOS/Linux.
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'EPERM' || code === 'EINVAL') {
          throw new WorktreeIncludeError(
            `Failed to create symlink at ${destAbs}: Windows requires Developer Mode (or an elevated/Administrator session) to create symlinks. Enable it via Settings > System > For developers > Developer Mode, then retry.`,
            { cause: error }
          );
        }
        throw new WorktreeIncludeError(`Failed to recreate symlink ${relPath}: ${(error as Error).message}`, {
          cause: error
        });
      }
    } else {
      try {
        await fs.copyFile(srcAbs, destAbs);
        await fs.chmod(destAbs, stat.mode & 0o7777);
      } catch (error) {
        throw new WorktreeIncludeError(`Failed to copy ${relPath}: ${(error as Error).message}`, { cause: error });
      }
    }

    count++;
  }

  return count;
}
