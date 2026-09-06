import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWorktree, removeWorktree } from '../src/worktree.js';

/**
 * Reproduction test for worktree removal when worktrees root is a symlink.
 *
 * @summary Reproduction test for removeWorktree with symlinked worktrees root
 */

const CARDS_WORKTREES_DIR_KEY = 'CARDS_WORKTREES_DIR';

function initGitRepo(dir: string): void {
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  writeFileSync(path.join(dir, 'README.md'), '# test\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
}

describe('removeWorktree with symlinked worktrees root', () => {
  let tmpBase = '';
  let repoDir = '';
  let realWorktreesDir = '';
  let symlinkWorktreesDir = '';
  const originalEnv = process.env;

  beforeEach(async () => {
    tmpBase = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'symlink-wt-test-')));
    repoDir = path.join(tmpBase, 'repo');
    realWorktreesDir = path.join(tmpBase, 'real-worktrees');
    symlinkWorktreesDir = path.join(tmpBase, 'symlink-worktrees');

    await fs.mkdir(repoDir);
    await fs.mkdir(realWorktreesDir);
    await fs.symlink(realWorktreesDir, symlinkWorktreesDir, 'dir');

    initGitRepo(repoDir);
    process.env = { ...originalEnv, [CARDS_WORKTREES_DIR_KEY]: symlinkWorktreesDir };
  });

  afterEach(async () => {
    process.env = originalEnv;
    if (tmpBase) {
      await fs.rm(tmpBase, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      tmpBase = '';
    }
  });

  it('removes a worktree created under a symlinked worktrees root', async () => {
    const { path: wPath, settle } = await createWorktree('feature/symlink-remove', { cwd: repoDir });
    await settle;

    // Calling removeWorktree should successfully remove the worktree without throwing WorktreeScopeError
    await expect(removeWorktree(wPath)).resolves.toBeUndefined();

    // Verify directory is removed
    await expect(fs.access(wPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
