/**
 * Skipped unit specs for `applyWorktreeInclude`.
 *
 * These tests document the full contract of the function. They are skipped in Phase 2
 * and will be unskipped one-by-one in Phase 3 as the implementation is built out.
 *
 * @summary Phase 2 skipped specs for applyWorktreeInclude
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyWorktreeInclude, WorktreeIncludeError } from '../src/worktreeInclude.js';

// Some specs depend on POSIX permission enforcement (chmod 0o000 / 0o500 must
// actually deny access). Two environments cannot provide that: Windows does not
// implement POSIX file modes, and the superuser (uid 0) bypasses POSIX DAC
// permission checks entirely — root can read a 0o000 file and write into a 0o500
// directory, so the expected rejection never occurs. Skip honestly in both; the
// POSIX path itself is unchanged.
const cannotEnforcePosixPermissions = process.platform === 'win32' || process.getuid?.() === 0;

/**
 * Creates an isolated tmp directory pair: sourceRoot and worktreeDir.
 *
 * @param prefix - Short label appended to the tmp dir name for diagnostics.
 * @returns Object with `sourceRoot` and `worktreeDir` absolute paths.
 */
async function makeTmpPair(prefix: string): Promise<{ sourceRoot: string; worktreeDir: string }> {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), `wi-${prefix}-`));
  const sourceRoot = path.join(base, 'source');
  const worktreeDir = path.join(base, 'dest');
  await fs.mkdir(sourceRoot, { recursive: true });
  await fs.mkdir(worktreeDir, { recursive: true });
  return { sourceRoot, worktreeDir };
}

/**
 * Initialises a minimal git repo in `dir`. Writes a `.gitignore` with the given
 * patterns, creates any tracked files listed in `trackedFiles`, then makes an
 * initial commit so `git check-ignore` works correctly.
 *
 * @param dir - Absolute path to the directory to initialise as a git repo.
 * @param gitignorePatterns - Lines to write into `.gitignore`.
 * @param trackedFiles - Files to create and commit (relative path + content).
 */
async function initGitRepo(
  dir: string,
  gitignorePatterns: string[],
  trackedFiles: Array<{ rel: string; content: string }>
): Promise<void> {
  const { execFileSync } = await import('node:child_process');

  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });

  if (gitignorePatterns.length > 0) {
    await fs.writeFile(path.join(dir, '.gitignore'), `${gitignorePatterns.join('\n')}\n`);
  }

  for (const { rel, content } of trackedFiles) {
    const abs = path.join(dir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content);
  }

  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
}

describe('applyWorktreeInclude', () => {
  let sourceRoot = '';
  let worktreeDir = '';

  afterEach(async () => {
    // Best-effort cleanup: restore permissions before removal so rm can succeed.
    try {
      await fs.chmod(worktreeDir, 0o755);
    } catch (err) {
      console.warn('afterEach: could not restore worktreeDir mode:', err);
    }
    try {
      await fs.chmod(path.join(sourceRoot, '.worktreeinclude'), 0o644);
    } catch (err) {
      console.warn('afterEach: could not restore .worktreeinclude mode:', err);
    }
    const base = path.dirname(sourceRoot);
    await fs.rm(base, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('returns 0 and copies no files when no .worktreeinclude file exists', async () => {
    ({ sourceRoot, worktreeDir } = await makeTmpPair('no-include'));
    await initGitRepo(sourceRoot, ['.env'], [{ rel: 'README.md', content: 'hi' }]);

    const count = await applyWorktreeInclude({ sourceRoot, worktreeDir });

    expect(count).toBe(0);
    const destEntries = await fs.readdir(worktreeDir);
    expect(destEntries).toHaveLength(0);
  });

  it('returns 0 and copies no files when .worktreeinclude is empty', async () => {
    ({ sourceRoot, worktreeDir } = await makeTmpPair('empty-include'));
    await initGitRepo(sourceRoot, ['.env'], [{ rel: 'README.md', content: 'hi' }]);
    await fs.writeFile(path.join(sourceRoot, '.worktreeinclude'), '   \n  \n');

    const count = await applyWorktreeInclude({ sourceRoot, worktreeDir });

    expect(count).toBe(0);
    const destEntries = await fs.readdir(worktreeDir);
    expect(destEntries).toHaveLength(0);
  });

  it('copies a gitignored file matching a pattern and returns 1', async () => {
    ({ sourceRoot, worktreeDir } = await makeTmpPair('single-file'));
    await initGitRepo(sourceRoot, ['.env'], [{ rel: 'README.md', content: 'hi' }]);

    const envPath = path.join(sourceRoot, '.env');
    await fs.writeFile(envPath, 'SECRET=hunter2');
    await fs.chmod(envPath, 0o600);

    await fs.writeFile(path.join(sourceRoot, '.worktreeinclude'), '.env\n');

    const count = await applyWorktreeInclude({ sourceRoot, worktreeDir });

    expect(count).toBe(1);

    const destEnv = path.join(worktreeDir, '.env');
    const srcContent = await fs.readFile(envPath);
    const dstContent = await fs.readFile(destEnv);
    expect(dstContent).toEqual(srcContent);

    // POSIX-permission assertion only: Windows does not implement POSIX mode
    // bits (chmod 0o600 is largely a no-op; stat reports a synthetic mode), so
    // the lower-9-bit preservation cannot be verified there. The portable
    // behavior above (file copied, content identical, count === 1) still runs
    // on Windows; only this mode-bit check is skipped. Not weakened on POSIX.
    if (process.platform !== 'win32') {
      const dstStat = await fs.stat(destEnv);
      // Mode bits (lower 9 bits) must be preserved
      expect(dstStat.mode & 0o777).toBe(0o600);
    }
  });

  it('returns 0 and produces no dest entry when include lists a gitignored file absent on disk', async () => {
    ({ sourceRoot, worktreeDir } = await makeTmpPair('absent-file'));
    await initGitRepo(sourceRoot, ['.env.local'], [{ rel: 'README.md', content: 'hi' }]);
    // .env.local is ignored but not present
    await fs.writeFile(path.join(sourceRoot, '.worktreeinclude'), '.env.local\n');

    const count = await applyWorktreeInclude({ sourceRoot, worktreeDir });

    expect(count).toBe(0);
    const destEntries = await fs.readdir(worktreeDir);
    expect(destEntries).toHaveLength(0);
  });

  it('returns 0 and does not copy a tracked file even when listed in .worktreeinclude', async () => {
    ({ sourceRoot, worktreeDir } = await makeTmpPair('tracked-file'));
    await initGitRepo(sourceRoot, [], [{ rel: 'package.json', content: '{}' }]);
    await fs.writeFile(path.join(sourceRoot, '.worktreeinclude'), 'package.json\n');

    const count = await applyWorktreeInclude({ sourceRoot, worktreeDir });

    expect(count).toBe(0);
    const destEntries = await fs.readdir(worktreeDir);
    expect(destEntries).toHaveLength(0);
  });

  it('copies only the gitignored file from a directory with mixed tracked and ignored contents', async () => {
    ({ sourceRoot, worktreeDir } = await makeTmpPair('mixed-dir'));
    await initGitRepo(sourceRoot, ['config/secrets.json'], [{ rel: 'config/default.json', content: '{"x":1}' }]);

    // Create the ignored file
    await fs.writeFile(path.join(sourceRoot, 'config', 'secrets.json'), '{"pw":"s3cr3t"}');

    await fs.writeFile(path.join(sourceRoot, '.worktreeinclude'), 'config/\n');

    const count = await applyWorktreeInclude({ sourceRoot, worktreeDir });

    expect(count).toBe(1);

    // secrets.json must be present
    const secretsDest = path.join(worktreeDir, 'config', 'secrets.json');
    await expect(fs.access(secretsDest)).resolves.toBeUndefined();

    // default.json (tracked) must NOT be present
    const defaultDest = path.join(worktreeDir, 'config', 'default.json');
    await expect(fs.access(defaultDest)).rejects.toThrow();
  });

  it('applies negation patterns and copies only non-negated gitignored files', async () => {
    ({ sourceRoot, worktreeDir } = await makeTmpPair('negation'));
    await initGitRepo(sourceRoot, ['.env', '.env.local', '.env.public'], [{ rel: 'README.md', content: 'hi' }]);

    await fs.writeFile(path.join(sourceRoot, '.env'), 'A=1');
    await fs.writeFile(path.join(sourceRoot, '.env.local'), 'B=2');
    await fs.writeFile(path.join(sourceRoot, '.env.public'), 'C=3');

    await fs.writeFile(path.join(sourceRoot, '.worktreeinclude'), '.env*\n!.env.public\n');

    const count = await applyWorktreeInclude({ sourceRoot, worktreeDir });

    expect(count).toBe(2);

    await expect(fs.access(path.join(worktreeDir, '.env'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(worktreeDir, '.env.local'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(worktreeDir, '.env.public'))).rejects.toThrow();
  });

  it('reproduces a symlink in dest rather than copying the target bytes', async () => {
    ({ sourceRoot, worktreeDir } = await makeTmpPair('symlink'));
    await initGitRepo(sourceRoot, ['.env'], [{ rel: 'README.md', content: 'hi' }]);

    // Create a real target and a symlink pointing at it
    await fs.writeFile(path.join(sourceRoot, '.env.real'), 'REAL=1');
    await fs.symlink('.env.real', path.join(sourceRoot, '.env'));

    await fs.writeFile(path.join(sourceRoot, '.worktreeinclude'), '.env\n');

    const count = await applyWorktreeInclude({ sourceRoot, worktreeDir });

    expect(count).toBe(1);

    const destEnv = path.join(worktreeDir, '.env');
    const lstat = await fs.lstat(destEnv);
    expect(lstat.isSymbolicLink()).toBe(true);
    const linkTarget = await fs.readlink(destEnv);
    expect(linkTarget).toBe('.env.real');
  });

  // Depends on POSIX permission enforcement; skipped where it cannot be enforced
  // (Windows or root — see cannotEnforcePosixPermissions). `fs.chmod(path, 0o000)`
  // does not deny the subsequent read there, so the expected rejection never occurs.
  it.skipIf(cannotEnforcePosixPermissions)(
    'throws WorktreeIncludeError when .worktreeinclude is unreadable',
    async () => {
      ({ sourceRoot, worktreeDir } = await makeTmpPair('unreadable'));
      await initGitRepo(sourceRoot, ['.env'], [{ rel: 'README.md', content: 'hi' }]);

      const includePath = path.join(sourceRoot, '.worktreeinclude');
      await fs.writeFile(includePath, '.env\n');
      await fs.chmod(includePath, 0o000);

      await expect(applyWorktreeInclude({ sourceRoot, worktreeDir })).rejects.toThrow(WorktreeIncludeError);
    }
  );

  // Depends on POSIX permission enforcement; skipped where it cannot be enforced
  // (Windows or root — see cannotEnforcePosixPermissions). `fs.chmod(worktreeDir,
  // 0o500)` does not deny the copy there, so the expected rejection never occurs.
  it.skipIf(cannotEnforcePosixPermissions)(
    'throws WorktreeIncludeError when copying into a read-only destination fails',
    async () => {
      ({ sourceRoot, worktreeDir } = await makeTmpPair('readonly-dest'));
      await initGitRepo(sourceRoot, ['.env'], [{ rel: 'README.md', content: 'hi' }]);

      await fs.writeFile(path.join(sourceRoot, '.env'), 'SECRET=1');
      await fs.writeFile(path.join(sourceRoot, '.worktreeinclude'), '.env\n');
      await fs.chmod(worktreeDir, 0o500);

      await expect(applyWorktreeInclude({ sourceRoot, worktreeDir })).rejects.toThrow(WorktreeIncludeError);
    }
  );
});
