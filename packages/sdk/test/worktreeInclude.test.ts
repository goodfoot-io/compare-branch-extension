/**
 * Focused copy-semantics specs for `applyWorktreeInclude`.
 *
 * The copy executor consumes a precomputed copy set — pattern parsing,
 * gitignored-path intersection, and ignored-descendant expansion are covered
 * by the worktree path policy specs in `worktreePathPolicy.test.ts`. These
 * specs pin the copy mechanics only: mode preservation, symlinks-as-symlinks,
 * absent-file tolerance, and the fail-closed copy error behavior.
 *
 * @summary copy-semantics specs for applyWorktreeInclude
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyWorktreeInclude, WorktreeIncludeError } from '../src/worktreeInclude.js';

// The read-only-destination spec depends on POSIX permission enforcement
// (chmod 0o500 must actually deny the copy). Two environments cannot provide
// that: Windows does not implement POSIX file modes, and the superuser
// (uid 0) bypasses POSIX DAC permission checks entirely. Skip honestly in
// both; the POSIX path itself is unchanged.
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
    const base = path.dirname(sourceRoot);
    await fs.rm(base, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('returns 0 and copies no files for an empty copy set', async () => {
    ({ sourceRoot, worktreeDir } = await makeTmpPair('empty-set'));
    await fs.writeFile(path.join(sourceRoot, '.env'), 'SECRET=hunter2');

    const count = await applyWorktreeInclude({ sourceRoot, worktreeDir, copySet: [] });

    expect(count).toBe(0);
    const destEntries = await fs.readdir(worktreeDir);
    expect(destEntries).toHaveLength(0);
  });

  it('copies a file preserving content and mode bits and returns 1', async () => {
    ({ sourceRoot, worktreeDir } = await makeTmpPair('single-file'));

    const envPath = path.join(sourceRoot, '.env');
    await fs.writeFile(envPath, 'SECRET=hunter2');
    await fs.chmod(envPath, 0o600);

    const count = await applyWorktreeInclude({ sourceRoot, worktreeDir, copySet: ['.env'] });

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

  it('returns 0 and produces no dest entry when a copy-set file is absent on disk', async () => {
    ({ sourceRoot, worktreeDir } = await makeTmpPair('absent-file'));
    // .env.local is listed in the copy set but not present in the source
    await fs.writeFile(path.join(sourceRoot, 'README.md'), 'hi');

    const count = await applyWorktreeInclude({ sourceRoot, worktreeDir, copySet: ['.env.local'] });

    expect(count).toBe(0);
    const destEntries = await fs.readdir(worktreeDir);
    expect(destEntries).toHaveLength(0);
  });

  it('copies only the listed file from a directory with mixed contents', async () => {
    ({ sourceRoot, worktreeDir } = await makeTmpPair('mixed-dir'));

    await fs.mkdir(path.join(sourceRoot, 'config'), { recursive: true });
    await fs.writeFile(path.join(sourceRoot, 'config', 'secrets.json'), '{"pw":"s3cr3t"}');
    await fs.writeFile(path.join(sourceRoot, 'config', 'default.json'), '{"x":1}');

    const count = await applyWorktreeInclude({ sourceRoot, worktreeDir, copySet: ['config/secrets.json'] });

    expect(count).toBe(1);

    // secrets.json must be present
    const secretsDest = path.join(worktreeDir, 'config', 'secrets.json');
    await expect(fs.access(secretsDest)).resolves.toBeUndefined();

    // default.json (not in the copy set) must NOT be present
    const defaultDest = path.join(worktreeDir, 'config', 'default.json');
    await expect(fs.access(defaultDest)).rejects.toThrow();
  });

  it('reproduces a symlink in dest rather than copying the target bytes', async () => {
    ({ sourceRoot, worktreeDir } = await makeTmpPair('symlink'));

    // Create a real target and a symlink pointing at it
    await fs.writeFile(path.join(sourceRoot, '.env.real'), 'REAL=1');
    await fs.symlink('.env.real', path.join(sourceRoot, '.env'));

    const count = await applyWorktreeInclude({ sourceRoot, worktreeDir, copySet: ['.env'] });

    expect(count).toBe(1);

    const destEnv = path.join(worktreeDir, '.env');
    const lstat = await fs.lstat(destEnv);
    expect(lstat.isSymbolicLink()).toBe(true);
    const linkTarget = await fs.readlink(destEnv);
    expect(linkTarget).toBe('.env.real');
  });

  // Depends on POSIX permission enforcement; skipped where it cannot be enforced
  // (Windows or root — see cannotEnforcePosixPermissions). `fs.chmod(worktreeDir,
  // 0o500)` does not deny the copy there, so the expected rejection never occurs.
  it.skipIf(cannotEnforcePosixPermissions)(
    'throws WorktreeIncludeError when copying into a read-only destination fails',
    async () => {
      ({ sourceRoot, worktreeDir } = await makeTmpPair('readonly-dest'));

      await fs.writeFile(path.join(sourceRoot, '.env'), 'SECRET=1');
      await fs.chmod(worktreeDir, 0o500);

      await expect(applyWorktreeInclude({ sourceRoot, worktreeDir, copySet: ['.env'] })).rejects.toThrow(
        WorktreeIncludeError
      );
    }
  );
});
