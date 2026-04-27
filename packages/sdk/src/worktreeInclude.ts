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

import { spawn } from 'node:child_process';
import type { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import ignore from 'ignore';

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
 * Recursively walks a directory and returns relative paths of all non-directory
 * entries, excluding `.git` and `.worktrees` directories.
 *
 * @param rootDir - Absolute path to the root directory to walk.
 * @param relDir - Relative path from rootDir to current directory (used in recursion).
 * @returns Array of relative paths to files and symlinks.
 */
async function walkDir(rootDir: string, relDir = ''): Promise<string[]> {
  const absDir = relDir ? path.join(rootDir, relDir) : rootDir;
  let entries: Dirent[];
  try {
    entries = (await fs.readdir(absDir, { withFileTypes: true, encoding: 'utf8' })) as unknown as Dirent[];
  } catch {
    return [];
  }

  const results: string[] = [];
  for (const entry of entries) {
    const name = entry.name as unknown as string;
    const relPath = relDir ? `${relDir}/${name}` : name;
    if (entry.isDirectory()) {
      if (name === '.git' || name === '.worktrees') continue;
      const children = await walkDir(rootDir, relPath);
      results.push(...children);
    } else {
      results.push(relPath);
    }
  }
  return results;
}

/**
 * Runs `git check-ignore --stdin -z` for a batch of paths in `cwd`.
 *
 * Returns the subset of `candidates` that are gitignored.
 * Exit code 1 with empty stdout means nothing matched — not an error.
 * Any other non-zero code throws `WorktreeIncludeError`.
 *
 * @param cwd - Directory to run git check-ignore from.
 * @param candidates - Relative paths to check.
 * @returns Array of gitignored relative paths.
 */
async function gitIgnoredPaths(cwd: string, candidates: string[]): Promise<string[]> {
  if (candidates.length === 0) return [];

  return new Promise((resolve, reject) => {
    const child = spawn('git', ['check-ignore', '--stdin', '-z'], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

    child.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');
      if (code === 0) {
        resolve(stdout ? stdout.split('\0').filter(Boolean) : []);
      } else if (code === 1) {
        // No paths matched — not an error
        resolve([]);
      } else {
        reject(new WorktreeIncludeError(`git check-ignore failed (exit ${String(code)}): ${stderr}`));
      }
    });

    child.on('error', (err) => {
      reject(new WorktreeIncludeError(`git check-ignore spawn failed: ${err.message}`, { cause: err }));
    });

    const stdinData = candidates.join('\0');
    child.stdin.write(stdinData, 'utf8');
    child.stdin.end();
  });
}

/**
 * Applies `.worktreeinclude` copy rules to a freshly-created worktree.
 *
 * 1. Reads `<sourceRoot>/.worktreeinclude` (gitignore syntax) using the `ignore` library.
 * 2. Walks the source tree and collects paths that match the include patterns.
 * 3. Intersects with gitignored paths by piping candidates through `git check-ignore --stdin`.
 * 4. Copies each matched path into `worktreeDir`, preserving mode bits and
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
  const { sourceRoot, worktreeDir } = opts;

  // Step 1: Read .worktreeinclude
  let includeContent: string;
  try {
    includeContent = await fs.readFile(path.join(sourceRoot, '.worktreeinclude'), 'utf8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') return 0;
    throw new WorktreeIncludeError(`Failed to read .worktreeinclude: ${err.message}`, { cause: error });
  }

  // Step 2: Parse with ignore library
  const ig = ignore().add(includeContent);

  // Step 3: Walk source tree
  const allPaths = await walkDir(sourceRoot);

  // Filter to paths matching the include patterns
  const includedPaths = allPaths.filter((p) => {
    try {
      return ig.ignores(p);
    } catch {
      return false;
    }
  });

  if (includedPaths.length === 0) return 0;

  // Step 4: Intersect with gitignored paths
  const gitIgnored = await gitIgnoredPaths(sourceRoot, includedPaths);
  const gitIgnoredSet = new Set(gitIgnored);

  const copySet = includedPaths.filter((p) => gitIgnoredSet.has(p));

  if (copySet.length === 0) return 0;

  // Step 5: Copy each path
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
