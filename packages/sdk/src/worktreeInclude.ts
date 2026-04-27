/**
 * Applies `.worktreeinclude` copy rules after the symlink-reroute pass.
 *
 * Reads a gitignore-syntax file at `<sourceRoot>/.worktreeinclude`, intersects
 * its patterns with paths already gitignored (via `git check-ignore --stdin`),
 * and copies matching files/symlinks into the worktree, preserving mode bits
 * and symlinks-as-symlinks.
 *
 * @summary `.worktreeinclude` copy step for worktree creation
 * @module worktreeInclude
 */

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
 * Applies `.worktreeinclude` copy rules to a freshly-created worktree.
 *
 * The final implementation will:
 * 1. Read `<sourceRoot>/.worktreeinclude` (gitignore syntax) using the `ignore` library.
 * 2. Walk the source tree and collect paths that match the include patterns.
 * 3. Intersect with gitignored paths by piping candidates through `git check-ignore --stdin`.
 * 4. Copy each matched path into `worktreeDir`, preserving mode bits and
 *    representing symlinks as symlinks rather than dereferencing them.
 *
 * Returns the count of files copied. Throws {@link WorktreeIncludeError} on
 * parse, walk, or copy failure.
 *
 * @param opts - Options for the include step.
 * @param opts.sourceRoot - Source checkout root containing `.worktreeinclude`.
 * @param opts.worktreeDir - Destination worktree root.
 * @returns Count of files copied from the include list.
 */
export async function applyWorktreeInclude(opts: { sourceRoot: string; worktreeDir: string }): Promise<number> {
  void opts;
  throw new Error('not implemented');
}
