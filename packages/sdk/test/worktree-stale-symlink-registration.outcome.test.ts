/**
 * Outcome reproduction for stale worktree registrations whose recorded path
 * uses the real spelling of a configured symlinked worktree root.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveWorktreeDir } from '../src/cards-config.js';
import { createWorktree } from '../src/worktree.js';

const CARDS_WORKTREES_DIR_KEY = 'CARDS_WORKTREES_DIR';

describe.runIf(process.platform !== 'win32')('createWorktree stale symlink registration repair', () => {
  let tmpBase = '';
  let repoDir = '';
  let realWorktreesRoot = '';
  let linkedWorktreesRoot = '';
  const originalEnv = process.env;

  beforeEach(async () => {
    tmpBase = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'worktree-stale-symlink-')));
    repoDir = path.join(tmpBase, 'repo');
    realWorktreesRoot = path.join(tmpBase, 'real-worktrees');
    linkedWorktreesRoot = path.join(tmpBase, 'linked-worktrees');
    await fs.mkdir(repoDir);
    await fs.mkdir(realWorktreesRoot);
    await fs.symlink(realWorktreesRoot, linkedWorktreesRoot, 'dir');

    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoDir });
    writeFileSync(path.join(repoDir, 'README.md'), '# test\n');
    execFileSync('git', ['add', '.'], { cwd: repoDir });
    execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: repoDir });

    process.env = { ...originalEnv, [CARDS_WORKTREES_DIR_KEY]: linkedWorktreesRoot };
  });

  afterEach(async () => {
    process.env = originalEnv;
    if (repoDir) {
      execFileSync('git', ['worktree', 'prune', '--expire', 'now'], { cwd: repoDir });
    }
    if (tmpBase) {
      await fs.rm(tmpBase, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('recreates a missing worktree when git registered the equivalent real path', async () => {
    const branch = 'feature/stale-real-path';
    const linkedWorktreeDir = resolveWorktreeDir(repoDir, branch);
    const realWorktreeDir = path.join(realWorktreesRoot, path.relative(linkedWorktreesRoot, linkedWorktreeDir));

    await fs.mkdir(path.dirname(realWorktreeDir), { recursive: true });
    execFileSync('git', ['worktree', 'add', '-b', branch, realWorktreeDir], { cwd: repoDir });
    await fs.rm(realWorktreeDir, { recursive: true, force: true });

    const registration = execFileSync('git', ['worktree', 'list', '--porcelain'], {
      cwd: repoDir,
      encoding: 'utf8'
    });
    expect(registration).toContain(`worktree ${realWorktreeDir}\n`);
    expect(realWorktreeDir).not.toBe(linkedWorktreeDir);
    await expect(fs.access(linkedWorktreeDir)).rejects.toMatchObject({ code: 'ENOENT' });

    const created = await createWorktree(branch, { cwd: repoDir });
    await expect(created.settle).resolves.toMatchObject({ branch, worktree: linkedWorktreeDir });
  });
});
