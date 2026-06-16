/**
 * Integration tests for the removeWorktree SDK helper.
 *
 * Each test creates a real git worktree via createWorktree, then exercises
 * removeWorktree against it. No mocks — real git operations, real filesystem.
 *
 * @summary removeWorktree integration tests
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveWorktreesRoot } from '../src/cards-config.js';
import { Logger } from '../src/config/logger.js';
import { createWorktree, removeWorktree, WorktreeScopeError } from '../src/worktree.js';

const CARDS_WORKTREES_DIR_KEY = 'CARDS_WORKTREES_DIR';

/**
 * Initialises a minimal git repo at `dir` with a commit so worktree operations work.
 *
 * @param dir - Absolute path to the directory to initialise.
 */
function initGitRepo(dir: string): void {
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  execFileSync('bash', ['-c', `echo '# test' > README.md`], { cwd: dir });
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
}

/**
 * Returns the list of worktree paths from `git worktree list --porcelain`.
 *
 * @param repoDir - Repository root to query.
 * @returns Array of absolute worktree paths.
 */
function listWorktrees(repoDir: string): string[] {
  const out = execFileSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: repoDir,
    encoding: 'utf8'
  });
  return out
    .split('\n')
    .filter((l) => l.startsWith('worktree '))
    .map((l) => l.slice('worktree '.length));
}

describe('removeWorktree', () => {
  let tmpBase = '';
  let repoDir = '';
  let worktreesDir = '';
  const originalEnv = process.env;

  beforeEach(async () => {
    tmpBase = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'rwt-test-')));
    repoDir = path.join(tmpBase, 'repo');
    worktreesDir = path.join(tmpBase, 'worktrees');
    await fs.mkdir(repoDir);
    await fs.mkdir(worktreesDir);
    initGitRepo(repoDir);
    process.env = { ...originalEnv, [CARDS_WORKTREES_DIR_KEY]: worktreesDir };
  });

  afterEach(async () => {
    process.env = originalEnv;
    if (tmpBase) {
      await fs.rm(tmpBase, { recursive: true, force: true });
      tmpBase = '';
    }
  });

  it('removes a worktree created by createWorktree end-to-end; directory is gone afterwards', async () => {
    const { path: wPath, settle } = await createWorktree('feature/remove-test', { cwd: repoDir });
    await settle;

    await removeWorktree(wPath);

    await expect(fs.access(wPath)).rejects.toMatchObject({ code: 'ENOENT' });
    const worktrees = listWorktrees(repoDir);
    expect(worktrees.every((w) => w !== wPath)).toBe(true);
  });

  it('is idempotent when worktree directory is already gone', async () => {
    const { path: wPath, settle } = await createWorktree('feature/idempotent-test', { cwd: repoDir });
    await settle;

    await removeWorktree(wPath);
    await expect(removeWorktree(wPath)).resolves.toBeUndefined();
  });

  it('refuses paths outside resolveWorktreesRoot()', async () => {
    const outsidePath = path.join(tmpBase, 'outside');
    await fs.mkdir(outsidePath);

    await expect(removeWorktree(outsidePath)).rejects.toThrow();
  });

  it('force-removes a worktree containing a .cards copy', async () => {
    const { path: wPath, settle } = await createWorktree('feature/force-test', { cwd: repoDir });
    await settle;

    await fs.mkdir(path.join(wPath, '.cards'), { recursive: true });
    await fs.writeFile(path.join(wPath, '.cards', 'CARD_ID'), 'test-card\n');

    await expect(removeWorktree(wPath)).resolves.toBeUndefined();
    await expect(fs.access(wPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('copies .cards into a new worktree but prunes the entire .cards/logs subtree', async () => {
    // Seed the source repo's .cards with a normal file plus a logs subtree
    // holding a stale log and a non-.log file. The whole subtree is pruned, so
    // neither the directory nor any of its contents reach the worktree.
    await fs.mkdir(path.join(repoDir, '.cards', 'logs'), { recursive: true });
    await fs.writeFile(path.join(repoDir, '.cards', 'config.json'), '{"seed":true}\n');
    await fs.writeFile(path.join(repoDir, '.cards', 'logs', 'git-workspace-repo-hooks.log'), '{"stale":true}\n');
    await fs.writeFile(path.join(repoDir, '.cards', 'logs', 'not-a-log.json'), '{"stale":true}\n');

    const { path: wPath, settle } = await createWorktree('feature/log-exclusion', { cwd: repoDir });
    await settle;

    // Non-log, non-marker .cards content is copied.
    await expect(fs.readFile(path.join(wPath, '.cards', 'config.json'), 'utf8')).resolves.toBe('{"seed":true}\n');

    // The logs directory is pruned entirely — neither the directory nor any
    // file under it (stale log or otherwise) is copied.
    await expect(fs.access(path.join(wPath, '.cards', 'logs'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('excludes the source .cards/CARD_ID and CARD_ORIGINAL_HOOK_PATH markers from the copy', async () => {
    // A card-bound source checkout carries CARD_ID and CARD_ORIGINAL_HOOK_PATH.
    // Copying them into a child worktree would bleed the source's card identity
    // and original-hooks snapshot in, causing wrong-card attribution and broken
    // hook chaining. Both markers must be excluded; the child's are written
    // authoritatively by outfitWorktreeForCard, never inherited here.
    await fs.mkdir(path.join(repoDir, '.cards'), { recursive: true });
    await fs.writeFile(path.join(repoDir, '.cards', 'CARD_ID'), 'source-card\n');
    await fs.writeFile(path.join(repoDir, '.cards', 'CARD_ORIGINAL_HOOK_PATH'), '/source/hooks\n');
    await fs.writeFile(path.join(repoDir, '.cards', 'config.json'), '{"seed":true}\n');

    const { path: wPath, settle } = await createWorktree('feature/marker-exclusion', { cwd: repoDir });
    await settle;

    // Markers are NOT copied.
    await expect(fs.access(path.join(wPath, '.cards', 'CARD_ID'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.access(path.join(wPath, '.cards', 'CARD_ORIGINAL_HOOK_PATH'))).rejects.toMatchObject({
      code: 'ENOENT'
    });
    // Other .cards content is still copied.
    await expect(fs.readFile(path.join(wPath, '.cards', 'config.json'), 'utf8')).resolves.toBe('{"seed":true}\n');
  });

  it('throws WorktreeScopeError when path equals the worktrees root (not a child)', async () => {
    const root = path.resolve(resolveWorktreesRoot());
    await expect(removeWorktree(root)).rejects.toBeInstanceOf(WorktreeScopeError);
  });

  it('throws WorktreeScopeError when path is a symlink pointing outside the worktrees root', async () => {
    const outsideTarget = path.join(tmpBase, 'outside-target');
    await fs.mkdir(outsideTarget);
    const symlinkPath = path.join(worktreesDir, 'escape');
    await fs.symlink(outsideTarget, symlinkPath);

    await expect(removeWorktree(symlinkPath)).rejects.toBeInstanceOf(WorktreeScopeError);
    // The symlink itself must not have been deleted
    await expect(fs.lstat(symlinkPath)).resolves.toBeDefined();
  });

  it('throws WorktreeScopeError for empty worktreePath', async () => {
    await expect(removeWorktree('')).rejects.toBeInstanceOf(WorktreeScopeError);
  });

  it('Logger constructed from inside a linked worktree resolves log path to main repo root, not the worktree', async () => {
    // Create a linked worktree from the main repo.
    const { path: wPath, settle } = await createWorktree('feature/logger-collapse-test', { cwd: repoDir });
    await settle;

    // Unset all env vars that would short-circuit git resolution.
    const savedEnv: Record<string, string | undefined> = {};
    for (const key of ['REPO_ROOT', 'CARDS_LOG_DIR', 'CARDS_HOOKS_LOG_FILE']) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    const savedCwd = process.cwd();

    try {
      // Run from inside the linked worktree.
      process.chdir(wPath);

      const logger = new Logger({ subsystem: 'git-workspace-repo-hooks' });
      // hasDestinations() is true only when the path resolved successfully.
      expect(logger.hasDestinations()).toBe(true);

      // Write a message so we can verify the destination file path.
      logger.info('collapse-test');
      logger.close();

      // The log file must be under the MAIN repo root, not the worktree path.
      const expectedLog = path.join(repoDir, '.cards', 'logs', 'git-workspace-repo-hooks.log');
      const content = await fs.readFile(expectedLog, 'utf8');
      expect(content).toContain('collapse-test');

      // Nothing written under the worktree path.
      const worktreeLog = path.join(wPath, '.cards', 'logs', 'git-workspace-repo-hooks.log');
      await expect(fs.access(worktreeLog)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      process.chdir(savedCwd);
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  it('runs git worktree prune afterwards so the registry stays clean', async () => {
    const { path: wPath, settle } = await createWorktree('feature/prune-test', { cwd: repoDir });
    await settle;

    await removeWorktree(wPath);

    const worktrees = listWorktrees(repoDir);
    expect(worktrees.every((w) => w !== wPath)).toBe(true);
  });

  it('applyWorktreeInclude ordering: settle resolves and worktree is correct when gitignored paths overlap with .worktreeinclude', async () => {
    // This test guards the Wave 2 → Wave 3 ordering contract:
    // symlinkIgnoredPaths (Wave 2) must complete before applyWorktreeInclude (Wave 3) starts.
    //
    // Scenario:
    // - `.link` is a root-level symlink (not gitignored) → copyExistingSymlinks (Wave 1) copies
    //   it to the worktree; symlinkIgnoredPaths and applyWorktreeInclude do not touch it.
    // - `dist/` is a gitignored directory → symlinkIgnoredPaths (Wave 2) creates
    //   worktreeDir/dist as a symlink to sourceRoot/dist; applyWorktreeInclude (Wave 3)
    //   enumerates dist/bundle.js and copies it — safe because fs.copyFile resolves through
    //   the symlink (same inode, succeeds without EEXIST).
    //
    // The Wave 1 barrier ensures copyExistingSymlinks completes before applyWorktreeInclude
    // starts (Wave 3). The Wave 2 barrier ensures symlinkIgnoredPaths completes before
    // applyWorktreeInclude starts. If those barriers were removed and all steps ran concurrently,
    // applyWorktreeInclude could race copyExistingSymlinks on a gitignored root-level symlink
    // (F2) or race symlinkIgnoredPaths on a gitignored file in .worktreeinclude, producing
    // EEXIST (applyWorktreeInclude has no EEXIST guard) and rejecting the settle promise.
    await fs.writeFile(path.join(repoDir, '.gitignore'), 'dist/\n');
    execFileSync('git', ['add', '.gitignore'], { cwd: repoDir });
    execFileSync('git', ['commit', '-q', '-m', 'add gitignore'], { cwd: repoDir });

    // Root-level symlink (copied by copyExistingSymlinks in Wave 1; not gitignored so
    // symlinkIgnoredPaths and applyWorktreeInclude do not touch it)
    await fs.writeFile(path.join(repoDir, 'target.txt'), 'target content');
    await fs.symlink('target.txt', path.join(repoDir, '.link'));

    // Gitignored directory with a regular file (symlinkIgnoredPaths symlinks the dir in Wave 2;
    // applyWorktreeInclude copies the file through the symlink in Wave 3 — safe)
    await fs.mkdir(path.join(repoDir, 'dist'), { recursive: true });
    await fs.writeFile(path.join(repoDir, 'dist', 'bundle.js'), 'console.log(1);');

    // .worktreeinclude re-includes the dist directory's contents
    await fs.writeFile(path.join(repoDir, '.worktreeinclude'), 'dist/\n');

    const { path: wPath, settle } = await createWorktree('feature/include-ordering', { cwd: repoDir });

    // settle must resolve — a wrong ordering that produces EEXIST would reject it
    const result = await settle;
    expect(result).toBeDefined();

    // copyExistingSymlinks (Wave 1) placed the root symlink; it must be a symlink in the worktree.
    // copyExistingSymlinks creates a symlink pointing to the source entry (absolute path), not
    // to the original link target — that is the correct sequential result for this step.
    const linkLstat = await fs.lstat(path.join(wPath, '.link'));
    expect(linkLstat.isSymbolicLink()).toBe(true);
    // The symlink resolves to the source .link, which in turn resolves to target.txt
    const resolvedLink = await fs.realpath(path.join(wPath, '.link'));
    expect(resolvedLink).toBe(await fs.realpath(path.join(repoDir, '.link')));

    // dist/bundle.js is accessible in the worktree (symlinkIgnoredPaths created worktreeDir/dist
    // as a symlink; applyWorktreeInclude's copy resolves through it to the source file)
    const bundleStat = await fs.stat(path.join(wPath, 'dist', 'bundle.js'));
    expect(bundleStat.isFile()).toBe(true);
    const bundleContent = await fs.readFile(path.join(wPath, 'dist', 'bundle.js'), 'utf8');
    expect(bundleContent).toBe('console.log(1);');

    await removeWorktree(wPath);
  });
});
