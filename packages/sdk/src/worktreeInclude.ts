/**
 * Applies `.worktreeinclude` copy rules after the symlink-reroute pass.
 *
 * Reads a gitignore-syntax file at `<sourceRoot>/.worktreeinclude`, intersects
 * its patterns with paths already gitignored (via `git ls-files --ignored`),
 * and copies matching files/symlinks into the worktree, preserving mode bits
 * and symlinks-as-symlinks.
 *
 * @summary `.worktreeinclude` copy step for worktree creation
 * @module worktreeInclude
 */

import { spawn } from 'node:child_process';
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
 * Runs `git ls-files` and returns null-delimited stdout entries.
 *
 * @param cwd - Directory to run the command from.
 * @param args - Arguments passed after `ls-files`.
 * @returns Array of relative paths (no trailing NUL).
 */
function gitLsFiles(cwd: string, args: string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['ls-files', ...args], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

    child.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      if (code === 0) {
        resolve(stdout ? stdout.split('\0').filter(Boolean) : []);
      } else {
        const stderr = Buffer.concat(stderrChunks).toString('utf8');
        reject(new WorktreeIncludeError(`git ls-files failed (exit ${String(code)}): ${stderr}`));
      }
    });

    child.on('error', (err) => {
      reject(new WorktreeIncludeError(`git ls-files spawn failed: ${err.message}`, { cause: err }));
    });
  });
}

/**
 * Enumerates gitignored files within a directory that match include patterns.
 *
 * Runs `git ls-files --ignored --exclude-standard --others` scoped to `dir`
 * and returns the subset of paths that match the ignore instance.
 *
 * @param sourceRoot - Source checkout root.
 * @param dir - Relative directory path to enumerate within.
 * @param ig - Configured ignore instance for `.worktreeinclude` patterns.
 * @returns Array of relative paths to copy.
 */
async function enumerateIgnoredFiles(
  sourceRoot: string,
  dir: string,
  ig: ReturnType<typeof ignore>
): Promise<string[]> {
  const entries = await gitLsFiles(sourceRoot, ['--ignored', '--exclude-standard', '--others', '-z', '--', dir]);

  return entries.filter((p) => {
    try {
      return ig.ignores(p);
    } catch {
      return false;
    }
  });
}

/**
 * Applies `.worktreeinclude` copy rules to a freshly-created worktree.
 *
 * 1. Reads `<sourceRoot>/.worktreeinclude` (gitignore syntax) using the `ignore` library.
 * 2. Queries gitignored paths via `git ls-files --ignored --exclude-standard
 *    --directory --others`. Directory entries that match the include patterns are
 *    enumerated further to collect individual files. Directory entries that don't
 *    match (e.g. `node_modules/`) are skipped entirely.
 * 3. Copies each matched path into `worktreeDir`, preserving mode bits and
 *    representing symlinks as symlinks rather than dereferencing them.
 *
 * Returns the count of files copied. Throws {@link WorktreeIncludeError} on
 * parse, git, or copy failure.
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

  // Step 3: Query gitignored paths (top-level, collapsing ignored directories)
  const ignoredEntries = await gitLsFiles(sourceRoot, [
    '--ignored',
    '--exclude-standard',
    '--directory',
    '--others',
    '-z'
  ]);

  const files = ignoredEntries.filter((e) => !e.endsWith('/'));
  const dirs = ignoredEntries.filter((e) => e.endsWith('/'));

  // Step 4: Collect matching paths
  // Directly matching files
  const matchedFiles = files.filter((p) => {
    try {
      return ig.ignores(p);
    } catch {
      return false;
    }
  });

  // For directories that match a pattern, enumerate individual files within
  const nestedResults = await Promise.all(
    dirs
      .filter((d) => {
        try {
          return ig.ignores(d);
        } catch {
          return false;
        }
      })
      .map((d) => enumerateIgnoredFiles(sourceRoot, d, ig))
  );

  const copySet = [...matchedFiles, ...nestedResults.flat()];

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
