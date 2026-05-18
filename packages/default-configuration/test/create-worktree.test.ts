/**
 * Smoke tests for create-worktree stubs.
 *
 * @summary Smoke tests for create-worktree stubs
 */

import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { resolveWorktreeDir } from '@cards/sdk';
import { TestGitWorkspace } from '@cards/test-utils';
import * as fsExtra from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

// `fs.readlink` returns the link target with native separators, so a relative
// workspace link reads back as `..\x` on Windows. The invariant under test is
// relative-target preservation, not the separator — normalize to POSIX before
// comparing. (The native-separator link resolves correctly on Windows.)
const toPosix = (p: string): string => p.replace(/\\/g, '/');

import {
  addDetachedWorktree,
  addWorktree,
  checkBranchExists,
  checkWorktreeExists,
  copyExistingSymlinks,
  createWorktree,
  discoverIgnoredPaths,
  findGitRoots,
  isInternalSymlink,
  isNestedUnder,
  rerouteAllNodeModules,
  rerouteNodeModules,
  resolveHead,
  resolveRefType,
  symlinkIgnoredPaths,
  updateGitExclude,
  validateBranchName
} from '@cards/sdk/worktree';

describe('create-worktree stubs', () => {
  it('exports all expected functions', () => {
    expect(typeof createWorktree).toBe('function');
    expect(typeof validateBranchName).toBe('function');
    expect(typeof findGitRoots).toBe('function');
    expect(typeof resolveHead).toBe('function');
    expect(typeof resolveRefType).toBe('function');
    expect(typeof checkWorktreeExists).toBe('function');
    expect(typeof checkBranchExists).toBe('function');
    expect(typeof addWorktree).toBe('function');
    expect(typeof addDetachedWorktree).toBe('function');
    expect(typeof discoverIgnoredPaths).toBe('function');
    expect(typeof isNestedUnder).toBe('function');
    expect(typeof symlinkIgnoredPaths).toBe('function');
    expect(typeof copyExistingSymlinks).toBe('function');
    expect(typeof isInternalSymlink).toBe('function');
    expect(typeof rerouteNodeModules).toBe('function');
    expect(typeof rerouteAllNodeModules).toBe('function');
    expect(typeof updateGitExclude).toBe('function');
  });

  it('createWorktree rejects for an invalid ref', async () => {
    await expect(createWorktree('')).rejects.toThrow('Invalid branch name');
  });
});

describe('validateBranchName', () => {
  it('accepts alphanumeric names', () => {
    expect(() => validateBranchName('feature1')).not.toThrow();
    expect(() => validateBranchName('feature-1')).not.toThrow();
    expect(() => validateBranchName('Feature123')).not.toThrow();
  });

  it('accepts names with slashes and underscores', () => {
    expect(() => validateBranchName('feature/my_branch')).not.toThrow();
    expect(() => validateBranchName('feat/sub/deep')).not.toThrow();
    expect(() => validateBranchName('feature_name')).not.toThrow();
  });

  it('rejects names starting with hyphen', () => {
    expect(() => validateBranchName('-feature')).toThrow();
  });

  it('rejects empty strings', () => {
    expect(() => validateBranchName('')).toThrow();
  });

  it('rejects names with spaces', () => {
    expect(() => validateBranchName('feature branch')).toThrow();
  });

  it('rejects names with special characters', () => {
    expect(() => validateBranchName('feature@test')).toThrow();
    expect(() => validateBranchName('feature#test')).toThrow();
    expect(() => validateBranchName('feature$test')).toThrow();
    expect(() => validateBranchName('feature.test')).toThrow();
  });
});

describe('findGitRoots', () => {
  let workspace: TestGitWorkspace;
  let worktreePath: string;

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    await workspace.create();
  });

  afterAll(async () => {
    if (workspace) {
      await workspace.destroy();
    }
  });

  it('returns both roots pointing to the repo when given a path inside a git repo', async () => {
    const repoPath = workspace.getPath();
    const roots = await findGitRoots(repoPath);

    expect(roots.sourceRoot).toBe(repoPath);
    expect(roots.repoRoot).toBe(repoPath);
  });

  it('returns sourceRoot as worktree path and repoRoot as main repo when given a worktree', async () => {
    const git = workspace.getGit();
    const repoPath = workspace.getPath();
    worktreePath = path.join(repoPath, '..', 'test-worktree');

    await git.raw(['worktree', 'add', worktreePath, '-b', 'test-wt-branch']);

    const roots = await findGitRoots(worktreePath);

    expect(roots.sourceRoot).toBe(worktreePath);
    expect(roots.repoRoot).toBe(repoPath);

    // Clean up worktree
    await git.raw(['worktree', 'remove', worktreePath, '--force']);
  });

  it('walks up from subdirectory and finds the root', async () => {
    const repoPath = workspace.getPath();
    const subDir = path.join(repoPath, 'sub', 'nested');
    await fsExtra.ensureDir(subDir);

    const roots = await findGitRoots(subDir);

    expect(roots.sourceRoot).toBe(repoPath);
    expect(roots.repoRoot).toBe(repoPath);
  });

  it('throws when started from a path with no git ancestor', async () => {
    const tempDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'no-git-'));

    try {
      await expect(findGitRoots(tempDir)).rejects.toThrow();
    } finally {
      await fsExtra.remove(tempDir);
    }
  });
});

describe('resolveHead', () => {
  let workspace: TestGitWorkspace;

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    await workspace.create();
  });

  afterAll(async () => {
    if (workspace) {
      await workspace.destroy();
    }
  });

  it('returns a 40-char hex SHA from the test repo', async () => {
    const repoPath = workspace.getPath();
    const sha = await resolveHead(repoPath);

    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });

  it('rejects when given a non-repo path', async () => {
    const tempDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'non-repo-'));

    try {
      await expect(resolveHead(tempDir)).rejects.toThrow();
    } finally {
      await fsExtra.remove(tempDir);
    }
  });
});

describe('checkWorktreeExists', () => {
  let workspace: TestGitWorkspace;
  let worktreePath: string;

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    await workspace.create();
  });

  afterAll(async () => {
    if (workspace) {
      const git = workspace.getGit();
      if (worktreePath) {
        try {
          await git.raw(['worktree', 'remove', worktreePath, '--force']);
        } catch {
          // Ignore errors during cleanup
        }
      }
      await workspace.destroy();
    }
  });

  it('resolves false on a fresh repo (no worktrees created yet)', async () => {
    const repoPath = workspace.getPath();
    const testPath = path.join(repoPath, '..', 'non-existent-worktree');

    const exists = await checkWorktreeExists(repoPath, testPath);

    expect(exists).toBe(false);
  });

  it('resolves true after creating a worktree at the checked path', async () => {
    const git = workspace.getGit();
    const repoPath = workspace.getPath();
    worktreePath = path.join(repoPath, '..', `test-worktree-${Date.now()}`);

    await git.raw(['worktree', 'add', worktreePath, '-b', 'test-branch']);

    const exists = await checkWorktreeExists(repoPath, worktreePath);

    expect(exists).toBe(true);
  });

  it('does not treat substring matches as existing worktrees', async () => {
    const git = workspace.getGit();
    const repoPath = workspace.getPath();
    const parentDir = path.join(repoPath, '..');
    const existingWorktreePath = path.join(parentDir, `test-worktree-${Date.now()}`);
    const substringPath = `${existingWorktreePath}-suffix`;

    await git.raw(['worktree', 'add', existingWorktreePath, '-b', `test-branch-${Date.now()}`]);

    const exists = await checkWorktreeExists(repoPath, substringPath);

    expect(exists).toBe(false);

    await git.raw(['worktree', 'remove', existingWorktreePath, '--force']);
  });
});

describe('checkBranchExists', () => {
  let workspace: TestGitWorkspace;

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    await workspace.create();
  });

  afterAll(async () => {
    if (workspace) {
      await workspace.destroy();
    }
  });

  it('resolves false for a non-existent branch name', async () => {
    const repoPath = workspace.getPath();

    const exists = await checkBranchExists(repoPath, 'non-existent-branch');

    expect(exists).toBe(false);
  });

  it('resolves true for main (the default branch)', async () => {
    const repoPath = workspace.getPath();

    const exists = await checkBranchExists(repoPath, 'main');

    expect(exists).toBe(true);
  });
});

describe('addWorktree', () => {
  let workspace: TestGitWorkspace;
  const worktreePaths: string[] = [];

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    await workspace.create();
  });

  afterAll(async () => {
    if (workspace) {
      const git = workspace.getGit();
      for (const wt of worktreePaths) {
        try {
          await git.raw(['worktree', 'remove', wt, '--force']);
        } catch {
          // Ignore errors during cleanup
        }
      }
      await workspace.destroy();
    }
  });

  it('creates a worktree directory on disk when branchExists is false (new branch)', async () => {
    const repoPath = workspace.getPath();
    const worktreePath = path.join(repoPath, '..', `test-worktree-new-${Date.now()}`);
    worktreePaths.push(worktreePath);

    const headSha = await resolveHead(repoPath);

    await addWorktree({
      repoRoot: repoPath,
      worktreeDir: worktreePath,
      branchName: 'new-test-branch',
      branchExists: false,
      startPoint: headSha
    });

    const stats = await fs.stat(worktreePath);
    expect(stats.isDirectory()).toBe(true);
  });

  it('creates a worktree for an existing branch when branchExists is true', async () => {
    const git = workspace.getGit();
    const repoPath = workspace.getPath();

    // Create a branch first
    await git.branch(['existing-branch']);

    const worktreePath = path.join(repoPath, '..', `test-worktree-existing-${Date.now()}`);
    worktreePaths.push(worktreePath);

    await addWorktree({
      repoRoot: repoPath,
      worktreeDir: worktreePath,
      branchName: 'existing-branch',
      branchExists: true,
      startPoint: ''
    });

    const stats = await fs.stat(worktreePath);
    expect(stats.isDirectory()).toBe(true);
  });

  it('the created directory contains a .git file (not directory)', async () => {
    const repoPath = workspace.getPath();
    const worktreePath = path.join(repoPath, '..', `test-worktree-gitfile-${Date.now()}`);
    worktreePaths.push(worktreePath);

    const headSha = await resolveHead(repoPath);

    await addWorktree({
      repoRoot: repoPath,
      worktreeDir: worktreePath,
      branchName: 'gitfile-test-branch',
      branchExists: false,
      startPoint: headSha
    });

    const gitPath = path.join(worktreePath, '.git');
    const stats = await fs.stat(gitPath);
    expect(stats.isFile()).toBe(true);
  });

  it('rejects when the worktree path already exists', async () => {
    const repoPath = workspace.getPath();
    const worktreePath = path.join(repoPath, '..', `test-worktree-duplicate-${Date.now()}`);
    worktreePaths.push(worktreePath);

    const headSha = await resolveHead(repoPath);

    // Create the worktree first
    await addWorktree({
      repoRoot: repoPath,
      worktreeDir: worktreePath,
      branchName: 'duplicate-test-branch',
      branchExists: false,
      startPoint: headSha
    });

    // Try to create it again
    await expect(
      addWorktree({
        repoRoot: repoPath,
        worktreeDir: worktreePath,
        branchName: 'duplicate-test-branch-2',
        branchExists: false,
        startPoint: headSha
      })
    ).rejects.toThrow();
  });
});

describe('isNestedUnder', () => {
  it('returns true for a/b/c when a/b is in set', () => {
    const parentSet = new Set(['a/b']);
    expect(isNestedUnder('a/b/c', parentSet)).toBe(true);
  });

  it('returns true for a/b when a is in set', () => {
    const parentSet = new Set(['a']);
    expect(isNestedUnder('a/b', parentSet)).toBe(true);
  });

  it('returns false for top-level dirs with no slash in path', () => {
    const parentSet = new Set(['a', 'b']);
    expect(isNestedUnder('c', parentSet)).toBe(false);
  });

  it('returns false when no parent matches', () => {
    const parentSet = new Set(['x/y', 'p/q']);
    expect(isNestedUnder('a/b/c', parentSet)).toBe(false);
  });

  it('returns true for deeply nested paths', () => {
    const parentSet = new Set(['packages/pkg-a']);
    expect(isNestedUnder('packages/pkg-a/dist/nested/deep', parentSet)).toBe(true);
  });

  it('returns false for sibling paths', () => {
    const parentSet = new Set(['packages/pkg-a/dist']);
    expect(isNestedUnder('packages/pkg-b/dist', parentSet)).toBe(false);
  });
});

describe('discoverIgnoredPaths', () => {
  let workspace: TestGitWorkspace;

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    await workspace.create();

    const repoPath = workspace.getPath();
    const git = workspace.getGit();

    await fsExtra.writeFile(path.join(repoPath, '.gitignore'), 'node_modules/\ndist/\n.env\n');
    await fsExtra.ensureDir(path.join(repoPath, 'node_modules'));
    await fsExtra.ensureDir(path.join(repoPath, 'dist'));
    await fsExtra.ensureDir(path.join(repoPath, 'packages', 'pkg-a', 'dist'));
    await fsExtra.writeFile(path.join(repoPath, '.env'), 'SECRET=value');
    await fsExtra.writeFile(path.join(repoPath, 'tracked.txt'), 'tracked');

    await git.add('.gitignore');
    await git.add('tracked.txt');
    await git.commit('Add gitignore and tracked file');
  });

  afterAll(async () => {
    if (workspace) {
      await workspace.destroy();
    }
  });

  it('discovers node_modules, dist, packages/pkg-a/dist as directories', async () => {
    const repoPath = workspace.getPath();
    const ignored = await discoverIgnoredPaths(repoPath);

    expect(ignored.directories).toContain('node_modules');
    expect(ignored.directories).toContain('dist');
    expect(ignored.directories).toContain('packages/pkg-a/dist');
  });

  it('discovers .env as a file', async () => {
    const repoPath = workspace.getPath();
    const ignored = await discoverIgnoredPaths(repoPath);

    expect(ignored.files).toContain('.env');
  });

  it('does not include .worktrees entries', async () => {
    const repoPath = workspace.getPath();
    await fsExtra.ensureDir(path.join(repoPath, '.worktrees', 'test'));

    const ignored = await discoverIgnoredPaths(repoPath);

    const hasWorktrees = ignored.directories.some((d) => d.startsWith('.worktrees'));
    expect(hasWorktrees).toBe(false);
  });

  it('does not include CARDS_WORKTREES_DIR entries when the override root is nested inside the repo', async () => {
    const repoPath = workspace.getPath();
    const originalOverride = process.env['CARDS_WORKTREES_DIR'];
    process.env['CARDS_WORKTREES_DIR'] = path.join(repoPath, 'nested-worktrees');
    await fsExtra.ensureDir(path.join(repoPath, 'nested-worktrees', 'test'));

    try {
      const ignored = await discoverIgnoredPaths(repoPath);
      const hasNestedWorktrees = ignored.directories.some((d) => d.startsWith('nested-worktrees'));
      expect(hasNestedWorktrees).toBe(false);
    } finally {
      if (originalOverride === undefined) {
        delete process.env['CARDS_WORKTREES_DIR'];
      } else {
        process.env['CARDS_WORKTREES_DIR'] = originalOverride;
      }
    }
  });

  it('does not include tracked files', async () => {
    const repoPath = workspace.getPath();
    const ignored = await discoverIgnoredPaths(repoPath);

    expect(ignored.files).not.toContain('tracked.txt');
    expect(ignored.files).not.toContain('.gitignore');
  });
});

describe('symlinkIgnoredPaths', () => {
  let workspace: TestGitWorkspace;
  let sourceDir: string;
  let worktreeDir: string;

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    await workspace.create();
    sourceDir = workspace.getPath();
    worktreeDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'worktree-'));

    await fsExtra.ensureDir(path.join(sourceDir, 'node_modules'));
    await fsExtra.ensureDir(path.join(sourceDir, 'dist'));
    await fsExtra.ensureDir(path.join(sourceDir, 'packages', 'pkg-a', 'dist'));
    await fsExtra.writeFile(path.join(sourceDir, '.env'), 'SECRET=value');
  });

  afterAll(async () => {
    if (workspace) {
      await workspace.destroy();
    }
    if (worktreeDir) {
      await fsExtra.remove(worktreeDir);
    }
  });

  it('creates symlinks in worktree for non-nested ignored dirs', async () => {
    const ignored = {
      directories: ['node_modules', 'dist', 'packages/pkg-a/dist'],
      files: []
    };

    const result = await symlinkIgnoredPaths({ sourceRoot: sourceDir, worktreeDir, ignored });

    expect(result.dirCount).toBe(3);

    const nodeModulesLink = await fsExtra.readlink(path.join(worktreeDir, 'node_modules'));
    expect(nodeModulesLink).toBe(path.join(sourceDir, 'node_modules'));

    const distLink = await fsExtra.readlink(path.join(worktreeDir, 'dist'));
    expect(distLink).toBe(path.join(sourceDir, 'dist'));

    const nestedDistLink = await fsExtra.readlink(path.join(worktreeDir, 'packages', 'pkg-a', 'dist'));
    expect(nestedDistLink).toBe(path.join(sourceDir, 'packages', 'pkg-a', 'dist'));
  });

  it('creates parent directories when needed', async () => {
    const ignored = {
      directories: ['packages/pkg-a/dist'],
      files: []
    };

    await symlinkIgnoredPaths({ sourceRoot: sourceDir, worktreeDir, ignored });

    const parentExists = await fsExtra.pathExists(path.join(worktreeDir, 'packages', 'pkg-a'));
    expect(parentExists).toBe(true);
  });

  it('symlinks ignored files', async () => {
    const ignored = {
      directories: [],
      files: ['.env']
    };

    const result = await symlinkIgnoredPaths({ sourceRoot: sourceDir, worktreeDir, ignored });

    expect(result.fileCount).toBe(1);

    const envLink = await fsExtra.readlink(path.join(worktreeDir, '.env'));
    expect(envLink).toBe(path.join(sourceDir, '.env'));
  });

  it('skips entries that do not exist on disk', async () => {
    const tempWorktreeDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'test-worktree-'));
    const ignored = {
      directories: ['totally-nonexistent-dir-12345'],
      files: ['totally-missing-file-67890.txt']
    };

    const result = await symlinkIgnoredPaths({ sourceRoot: sourceDir, worktreeDir: tempWorktreeDir, ignored });

    expect(result.dirCount).toBe(0);
    expect(result.fileCount).toBe(0);

    await fsExtra.remove(tempWorktreeDir);
  });

  it('returns correct counts', async () => {
    const tempWorktreeDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'test-worktree-'));
    const ignored = {
      directories: ['node_modules', 'dist'],
      files: ['.env']
    };

    const result = await symlinkIgnoredPaths({ sourceRoot: sourceDir, worktreeDir: tempWorktreeDir, ignored });

    expect(result.dirCount).toBe(2);
    expect(result.fileCount).toBe(1);

    await fsExtra.remove(tempWorktreeDir);
  });
});

describe('copyExistingSymlinks', () => {
  let workspace: TestGitWorkspace;
  let sourceDir: string;
  let worktreeDir: string;

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    await workspace.create();
    sourceDir = workspace.getPath();
    worktreeDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'worktree-symlinks-'));

    const targetDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'symlink-target-'));
    await fsExtra.writeFile(path.join(targetDir, 'file.txt'), 'content');
    await fsExtra.symlink(targetDir, path.join(sourceDir, 'my-link'));
    await fsExtra.symlink(path.join(sourceDir, 'some-other-path'), path.join(sourceDir, 'another-link'));
  });

  afterAll(async () => {
    if (workspace) {
      await workspace.destroy();
    }
    if (worktreeDir) {
      await fsExtra.remove(worktreeDir);
    }
  });

  it('copies pre-existing top-level symlinks to the worktree dir', async () => {
    const count = await copyExistingSymlinks(sourceDir, worktreeDir);

    expect(count).toBeGreaterThan(0);

    const linkExists = await fsExtra.pathExists(path.join(worktreeDir, 'my-link'));
    expect(linkExists).toBe(true);

    const linkTarget = await fsExtra.readlink(path.join(worktreeDir, 'my-link'));
    expect(linkTarget).toBe(path.join(sourceDir, 'my-link'));
  });

  it('does not copy .git or .worktrees symlinks', async () => {
    const tempSourceDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'temp-source-'));
    const tempWorktreeDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'temp-worktree-'));
    const targetDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'link-target-'));

    await fsExtra.writeFile(path.join(targetDir, 'file.txt'), 'content');
    await fsExtra.symlink(targetDir, path.join(tempSourceDir, '.git'));
    await fsExtra.symlink(targetDir, path.join(tempSourceDir, '.worktrees'));
    await fsExtra.symlink(targetDir, path.join(tempSourceDir, 'regular-link'));

    await copyExistingSymlinks(tempSourceDir, tempWorktreeDir);

    const gitLinkExists = await fsExtra.pathExists(path.join(tempWorktreeDir, '.git'));
    const worktreesLinkExists = await fsExtra.pathExists(path.join(tempWorktreeDir, '.worktrees'));
    const regularLinkExists = await fsExtra.pathExists(path.join(tempWorktreeDir, 'regular-link'));

    expect(gitLinkExists).toBe(false);
    expect(worktreesLinkExists).toBe(false);
    expect(regularLinkExists).toBe(true);

    await fsExtra.remove(tempSourceDir);
    await fsExtra.remove(tempWorktreeDir);
    await fsExtra.remove(targetDir);
  });

  it('does not copy a root-level symlink that matches a nested CARDS_WORKTREES_DIR override', async () => {
    const tempSourceDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'temp-source-'));
    const tempWorktreeDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'temp-worktree-'));
    const targetDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'link-target-'));
    const originalOverride = process.env['CARDS_WORKTREES_DIR'];

    process.env['CARDS_WORKTREES_DIR'] = path.join(tempSourceDir, 'nested-worktrees', 'cache');
    await fsExtra.symlink(targetDir, path.join(tempSourceDir, 'nested-worktrees'));

    try {
      await copyExistingSymlinks(tempSourceDir, tempWorktreeDir);

      const nestedWorktreesLinkExists = await fsExtra.pathExists(path.join(tempWorktreeDir, 'nested-worktrees'));
      expect(nestedWorktreesLinkExists).toBe(false);
    } finally {
      if (originalOverride === undefined) {
        delete process.env['CARDS_WORKTREES_DIR'];
      } else {
        process.env['CARDS_WORKTREES_DIR'] = originalOverride;
      }

      await fsExtra.remove(tempSourceDir);
      await fsExtra.remove(tempWorktreeDir);
      await fsExtra.remove(targetDir);
    }
  });

  it('skips symlinks that already exist in the worktree', async () => {
    const tempWorktreeDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'temp-worktree-'));
    // Use a native absolute path so readlink round-trips identically on every OS.
    const existingTarget = path.join(os.tmpdir(), 'existing');
    await fsExtra.symlink(existingTarget, path.join(tempWorktreeDir, 'my-link'));

    await copyExistingSymlinks(sourceDir, tempWorktreeDir);

    const linkTarget = await fsExtra.readlink(path.join(tempWorktreeDir, 'my-link'));
    expect(linkTarget).toBe(existingTarget);

    await fsExtra.remove(tempWorktreeDir);
  });

  it('the created symlink points to sourceRoot/linkName', async () => {
    const freshWorktreeDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'fresh-worktree-'));

    await copyExistingSymlinks(sourceDir, freshWorktreeDir);

    const linkTarget = await fsExtra.readlink(path.join(freshWorktreeDir, 'my-link'));
    expect(linkTarget).toBe(path.join(sourceDir, 'my-link'));

    await fsExtra.remove(freshWorktreeDir);
  });
});

describe('isInternalSymlink', () => {
  it('returns true for ../../../packages/foo', () => {
    expect(isInternalSymlink('../../../packages/foo')).toBe(true);
  });

  it('returns true for ../../packages/foo', () => {
    expect(isInternalSymlink('../../packages/foo')).toBe(true);
  });

  it('returns true for ../packages/foo', () => {
    expect(isInternalSymlink('../packages/foo')).toBe(true);
  });

  it('returns true for ../../../.yarn/cache', () => {
    expect(isInternalSymlink('../../../.yarn/cache')).toBe(true);
  });

  it('returns true for ../../.yarn/cache', () => {
    expect(isInternalSymlink('../../.yarn/cache')).toBe(true);
  });

  it('returns true for ../.yarn/cache', () => {
    expect(isInternalSymlink('../.yarn/cache')).toBe(true);
  });

  it('returns true for ../../../apps/web', () => {
    expect(isInternalSymlink('../../../apps/web')).toBe(true);
  });

  it('returns true for ../../apps/web', () => {
    expect(isInternalSymlink('../../apps/web')).toBe(true);
  });

  it('returns true for ../apps/web', () => {
    expect(isInternalSymlink('../apps/web')).toBe(true);
  });

  it('returns true for ../../../libs/shared', () => {
    expect(isInternalSymlink('../../../libs/shared')).toBe(true);
  });

  it('returns true for ../../libs/shared', () => {
    expect(isInternalSymlink('../../libs/shared')).toBe(true);
  });

  it('returns true for ../libs/shared', () => {
    expect(isInternalSymlink('../libs/shared')).toBe(true);
  });

  it('returns true for ../../node_modules/.cache', () => {
    expect(isInternalSymlink('../../node_modules/.cache')).toBe(true);
  });

  it('returns true for ../some-external-path', () => {
    expect(isInternalSymlink('../some-external-path')).toBe(true);
  });

  it('returns false for absolute paths', () => {
    expect(isInternalSymlink('/absolute/path')).toBe(false);
  });
});

describe('rerouteNodeModules', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'reroute-test-'));
  });

  afterAll(async () => {
    if (tempDir) {
      await fsExtra.remove(tempDir);
    }
  });

  it('returns 0 when source node_modules does not exist', async () => {
    const sourceNM = path.join(tempDir, 'non-existent-source', 'node_modules');
    const destNM = path.join(tempDir, 'dest1', 'node_modules');

    const count = await rerouteNodeModules({
      sourceNodeModules: sourceNM,
      destNodeModules: destNM
    });

    expect(count).toBe(0);
  });

  it('removes existing symlink at destination and replaces with real directory', async () => {
    const sourceNM = path.join(tempDir, 'source2', 'node_modules');
    const destNM = path.join(tempDir, 'dest2', 'node_modules');

    await fsExtra.ensureDir(sourceNM);
    await fsExtra.ensureDir(path.join(tempDir, 'dest2'));
    await fs.symlink(sourceNM, destNM);

    const beforeStats = await fs.lstat(destNM);
    expect(beforeStats.isSymbolicLink()).toBe(true);

    await rerouteNodeModules({
      sourceNodeModules: sourceNM,
      destNodeModules: destNM
    });

    const afterStats = await fs.lstat(destNM);
    expect(afterStats.isSymbolicLink()).toBe(false);
    expect(afterStats.isDirectory()).toBe(true);
  });

  it('internal symlinks are recreated preserving the relative target', async () => {
    const sourceNM = path.join(tempDir, 'source3', 'node_modules');
    const destNM = path.join(tempDir, 'dest3', 'node_modules');

    await fsExtra.ensureDir(sourceNM);
    await fs.symlink('../../packages/internal', path.join(sourceNM, 'internal-pkg'));

    const count = await rerouteNodeModules({
      sourceNodeModules: sourceNM,
      destNodeModules: destNM
    });

    expect(count).toBe(1);

    const target = await fs.readlink(path.join(destNM, 'internal-pkg'));
    expect(toPosix(target)).toBe('../../packages/internal');
  });

  it('external symlinks are linked to the source entry', async () => {
    const sourceNM = path.join(tempDir, 'source4', 'node_modules');
    const destNM = path.join(tempDir, 'dest4', 'node_modules');
    const externalTarget = path.join(tempDir, 'external-location');

    await fsExtra.ensureDir(sourceNM);
    await fsExtra.ensureDir(externalTarget);
    await fs.symlink(externalTarget, path.join(sourceNM, 'external-pkg'));

    const count = await rerouteNodeModules({
      sourceNodeModules: sourceNM,
      destNodeModules: destNM
    });

    expect(count).toBe(0);

    const target = await fs.readlink(path.join(destNM, 'external-pkg'));
    expect(target).toBe(path.join(sourceNM, 'external-pkg'));
  });

  it('real directories inside @scope are linked to source', async () => {
    const sourceNM = path.join(tempDir, 'source5', 'node_modules');
    const destNM = path.join(tempDir, 'dest5', 'node_modules');

    await fsExtra.ensureDir(path.join(sourceNM, '@scope', 'pkg1'));
    await fsExtra.ensureDir(path.join(sourceNM, '@scope', 'pkg2'));

    await rerouteNodeModules({
      sourceNodeModules: sourceNM,
      destNodeModules: destNM
    });

    const target1 = await fs.readlink(path.join(destNM, '@scope', 'pkg1'));
    const target2 = await fs.readlink(path.join(destNM, '@scope', 'pkg2'));

    expect(target1).toBe(path.join(sourceNM, '@scope', 'pkg1'));
    expect(target2).toBe(path.join(sourceNM, '@scope', 'pkg2'));
  });

  it('scoped internal symlinks are recreated preserving relative target', async () => {
    const sourceNM = path.join(tempDir, 'source6', 'node_modules');
    const destNM = path.join(tempDir, 'dest6', 'node_modules');

    await fsExtra.ensureDir(path.join(sourceNM, '@scope'));
    await fs.symlink('../../packages/internal', path.join(sourceNM, '@scope', 'internal-pkg'));

    const count = await rerouteNodeModules({
      sourceNodeModules: sourceNM,
      destNodeModules: destNM
    });

    expect(count).toBe(1);

    const target = await fs.readlink(path.join(destNM, '@scope', 'internal-pkg'));
    expect(toPosix(target)).toBe('../../packages/internal');
  });

  it('files are linked to source', async () => {
    const sourceNM = path.join(tempDir, 'source7', 'node_modules');
    const destNM = path.join(tempDir, 'dest7', 'node_modules');

    await fsExtra.ensureDir(sourceNM);
    await fs.writeFile(path.join(sourceNM, '.package-lock.json'), '{}');

    await rerouteNodeModules({
      sourceNodeModules: sourceNM,
      destNodeModules: destNM
    });

    const target = await fs.readlink(path.join(destNM, '.package-lock.json'));
    expect(target).toBe(path.join(sourceNM, '.package-lock.json'));
  });
});

describe('rerouteAllNodeModules', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), 'reroute-all-test-'));
  });

  afterAll(async () => {
    if (tempDir) {
      await fsExtra.remove(tempDir);
    }
  });

  it('returns 0 when package.json does not exist', async () => {
    const repoRoot = path.join(tempDir, 'no-package-json');
    await fsExtra.ensureDir(repoRoot);

    const count = await rerouteAllNodeModules({
      sourceRoot: repoRoot,
      worktreeDir: path.join(tempDir, 'worktree1'),
      repoRoot
    });

    expect(count).toBe(0);
  });

  it('returns 0 when package.json has no workspaces', async () => {
    const repoRoot = path.join(tempDir, 'no-workspaces');
    await fsExtra.ensureDir(repoRoot);
    await fs.writeFile(path.join(repoRoot, 'package.json'), JSON.stringify({ name: 'test' }));

    const count = await rerouteAllNodeModules({
      sourceRoot: repoRoot,
      worktreeDir: path.join(tempDir, 'worktree2'),
      repoRoot
    });

    expect(count).toBe(0);
  });

  it('reroutes root node_modules', async () => {
    const repoRoot = path.join(tempDir, 'with-root-nm');
    const sourceRoot = repoRoot;
    const worktreeDir = path.join(tempDir, 'worktree3');

    await fsExtra.ensureDir(repoRoot);
    await fs.writeFile(path.join(repoRoot, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }));

    const rootNM = path.join(sourceRoot, 'node_modules');
    await fsExtra.ensureDir(rootNM);
    await fs.symlink('../../packages/pkg1', path.join(rootNM, 'pkg1'));

    const count = await rerouteAllNodeModules({
      sourceRoot,
      worktreeDir,
      repoRoot
    });

    expect(count).toBeGreaterThanOrEqual(1);

    const target = await fs.readlink(path.join(worktreeDir, 'node_modules', 'pkg1'));
    expect(toPosix(target)).toBe('../../packages/pkg1');
  });

  it('reroutes per-package node_modules under packages/', async () => {
    const repoRoot = path.join(tempDir, 'with-pkg-nm');
    const sourceRoot = repoRoot;
    const worktreeDir = path.join(tempDir, 'worktree4');

    await fsExtra.ensureDir(repoRoot);
    await fs.writeFile(path.join(repoRoot, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }));

    const pkg1NM = path.join(sourceRoot, 'packages', 'pkg1', 'node_modules');
    await fsExtra.ensureDir(pkg1NM);
    await fs.symlink('../../../packages/shared', path.join(pkg1NM, 'shared'));

    const rootNM = path.join(sourceRoot, 'node_modules');
    await fsExtra.ensureDir(rootNM);

    const count = await rerouteAllNodeModules({
      sourceRoot,
      worktreeDir,
      repoRoot
    });

    expect(count).toBeGreaterThanOrEqual(1);

    const target = await fs.readlink(path.join(worktreeDir, 'packages', 'pkg1', 'node_modules', 'shared'));
    expect(toPosix(target)).toBe('../../../packages/shared');
  });

  it('returns total count of internal rerouted symlinks', async () => {
    const repoRoot = path.join(tempDir, 'count-test');
    const sourceRoot = repoRoot;
    const worktreeDir = path.join(tempDir, 'worktree5');

    await fsExtra.ensureDir(repoRoot);
    await fs.writeFile(path.join(repoRoot, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }));

    const rootNM = path.join(sourceRoot, 'node_modules');
    await fsExtra.ensureDir(rootNM);
    await fs.symlink('../../packages/internal1', path.join(rootNM, 'internal1'));
    await fs.symlink('../../packages/internal2', path.join(rootNM, 'internal2'));

    const pkg1NM = path.join(sourceRoot, 'packages', 'pkg1', 'node_modules');
    await fsExtra.ensureDir(pkg1NM);
    await fs.symlink('../../../packages/shared', path.join(pkg1NM, 'shared'));

    const count = await rerouteAllNodeModules({
      sourceRoot,
      worktreeDir,
      repoRoot
    });

    expect(count).toBe(3);
  });
});

describe('updateGitExclude', () => {
  let workspace: TestGitWorkspace;
  let worktreePath: string;
  let repoPath: string;

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    await workspace.create();
    repoPath = workspace.getPath();
    const git = workspace.getGit();

    // Create a real worktree
    worktreePath = path.join(repoPath, '..', `exclude-test-worktree-${Date.now()}`);
    await git.raw(['worktree', 'add', worktreePath, '-b', 'exclude-test-branch']);

    // Create some symlinks in the worktree to simulate ignored paths
    const symlinkTarget = path.join(repoPath, 'node_modules');
    await fsExtra.ensureDir(symlinkTarget);
    await fs.symlink(symlinkTarget, path.join(worktreePath, 'node_modules'));

    const distTarget = path.join(repoPath, 'dist');
    await fsExtra.ensureDir(distTarget);
    await fs.symlink(distTarget, path.join(worktreePath, 'dist'));

    // Create a real file (not a symlink) to test filtering
    await fs.writeFile(path.join(worktreePath, 'real-file.txt'), 'not a symlink');

    // Create a symlinked file
    const envTarget = path.join(repoPath, '.env');
    await fs.writeFile(envTarget, 'SECRET=value');
    await fs.symlink(envTarget, path.join(worktreePath, '.env'));
  });

  afterAll(async () => {
    if (workspace) {
      const git = workspace.getGit();
      if (worktreePath) {
        try {
          await git.raw(['worktree', 'remove', worktreePath, '--force']);
        } catch {
          // Ignore errors during cleanup
        }
      }
      await workspace.destroy();
    }
  });

  it('writes an exclude file at the worktree git dir info/exclude path', async () => {
    await updateGitExclude({
      worktreeDir: worktreePath,
      repoRoot: repoPath,
      directories: ['node_modules', 'dist'],
      files: ['.env', 'real-file.txt']
    });

    const { stdout: gitDir } = await execFileAsync('git', ['-C', worktreePath, 'rev-parse', '--git-dir'], {
      timeout: 5000
    });
    const excludePath = path.join(gitDir.trim(), 'info', 'exclude');

    const stat = await fs.lstat(excludePath);
    expect(stat.isFile()).toBe(true);
  });

  it('exclude file contains header comment and only paths that are symlinks', async () => {
    const { stdout: gitDir } = await execFileAsync('git', ['-C', worktreePath, 'rev-parse', '--git-dir'], {
      timeout: 5000
    });
    const excludePath = path.join(gitDir.trim(), 'info', 'exclude');

    const content = await fs.readFile(excludePath, 'utf-8');

    // Should contain header
    expect(content).toContain('# Symlinks created by instant-worktree');

    // Should contain symlinked directories
    expect(content).toContain('node_modules');
    expect(content).toContain('dist');

    // Should contain symlinked file
    expect(content).toContain('.env');

    // Should NOT contain non-symlinked file
    expect(content).not.toContain('real-file.txt');
  });

  it('sets extensions.worktreeConfig true on the repo', async () => {
    const { stdout } = await execFileAsync('git', ['-C', repoPath, 'config', 'extensions.worktreeConfig'], {
      timeout: 5000
    });
    expect(stdout.trim()).toBe('true');
  });

  it('sets core.excludesFile on the worktree with --worktree scope', async () => {
    const { stdout: gitDir } = await execFileAsync('git', ['-C', worktreePath, 'rev-parse', '--git-dir'], {
      timeout: 5000
    });
    const excludePath = path.join(gitDir.trim(), 'info', 'exclude');

    const { stdout } = await execFileAsync('git', ['-C', worktreePath, 'config', '--worktree', 'core.excludesFile'], {
      timeout: 5000
    });
    expect(stdout.trim()).toBe(excludePath);
  });
});

describe('createWorktree end-to-end', () => {
  let workspace: TestGitWorkspace;
  let repoPath: string;
  let originalCwd: string;

  beforeAll(async () => {
    originalCwd = process.cwd();

    workspace = new TestGitWorkspace();
    await workspace.create();
    repoPath = workspace.getPath();

    // Keep worktrees inside the test workspace
    process.env['CARDS_WORKTREES_DIR'] = path.join(repoPath, '.worktrees');

    const git = workspace.getGit();

    // Set up .gitignore
    await fs.writeFile(path.join(repoPath, '.gitignore'), 'node_modules/\ndist/\n.env\n');

    // Set up package.json with workspaces
    await fs.writeFile(path.join(repoPath, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }));

    // Set up node_modules with external and internal symlinks
    await fsExtra.ensureDir(path.join(repoPath, 'node_modules', 'external-pkg'));
    await fsExtra.ensureDir(path.join(repoPath, 'node_modules', '@scope'));
    await fsExtra.ensureDir(path.join(repoPath, 'packages', 'internal-pkg'));
    await fs.symlink('../../packages/internal-pkg', path.join(repoPath, 'node_modules', '@scope', 'internal-pkg'));
    await fsExtra.ensureDir(path.join(repoPath, 'node_modules', '@scope', 'external-pkg'));
    await fs.writeFile(path.join(repoPath, 'node_modules', '.package-lock.json'), '{}');

    // Set up packages
    await fsExtra.ensureDir(path.join(repoPath, 'packages', 'pkg-a', 'src'));
    await fs.writeFile(path.join(repoPath, 'packages', 'pkg-a', 'src', 'index.ts'), 'export {}');
    await fsExtra.ensureDir(path.join(repoPath, 'packages', 'pkg-a', 'node_modules', '@scope'));
    await fs.symlink('../../shared', path.join(repoPath, 'packages', 'pkg-a', 'node_modules', '@scope', 'shared'));
    await fsExtra.ensureDir(path.join(repoPath, 'packages', 'pkg-b', 'src'));
    await fs.writeFile(path.join(repoPath, 'packages', 'pkg-b', 'src', 'index.ts'), 'export {}');
    await fsExtra.ensureDir(path.join(repoPath, 'packages', 'shared'));

    // Set up ignored directory
    await fsExtra.ensureDir(path.join(repoPath, 'dist'));

    // Set up ignored file
    await fs.writeFile(path.join(repoPath, '.env'), 'SECRET=value');

    // Set up existing top-level symlink
    await fs.symlink('/some/target', path.join(repoPath, 'existing-link'));

    // Commit tracked files
    await git.add(['.gitignore', 'package.json', 'packages/pkg-a/src/index.ts', 'packages/pkg-b/src/index.ts']);
    await git.commit('Add project structure');

    // Change to repo directory so createWorktree can find git roots
    process.chdir(repoPath);
  });

  afterAll(async () => {
    // Restore original cwd
    process.chdir(originalCwd);
    delete process.env['CARDS_WORKTREES_DIR'];

    if (workspace) {
      const git = workspace.getGit();
      // Clean up any worktrees we created
      const worktreeDir = resolveWorktreeDir(repoPath, 'e2e-test-branch');
      try {
        await git.raw(['worktree', 'remove', worktreeDir, '--force']);
      } catch {
        // Ignore errors during cleanup
      }
      await workspace.destroy();
    }
  });

  it('resolves with correct branch, worktree path, 40-char baseSha, and reroutedSymlinks > 0', async () => {
    const result = await createWorktree('e2e-test-branch');

    expect(result.path).toBe(resolveWorktreeDir(repoPath, 'e2e-test-branch'));
    const settled = await result.settle;
    expect(settled.branch).toBe('e2e-test-branch');
    expect(settled.worktree).toBe(resolveWorktreeDir(repoPath, 'e2e-test-branch'));
    expect(settled.baseSha).toMatch(/^[0-9a-f]{40}$/);
    expect(settled.reroutedSymlinks).toBeGreaterThan(0);
  });

  it('the worktree directory exists on disk with .git as a file', async () => {
    const worktreeDir = resolveWorktreeDir(repoPath, 'e2e-test-branch');
    const stats = await fs.stat(worktreeDir);
    expect(stats.isDirectory()).toBe(true);

    const gitStats = await fs.lstat(path.join(worktreeDir, '.git'));
    expect(gitStats.isFile()).toBe(true);
  });

  it('ignored dirs (dist) are symlinks pointing to source', async () => {
    const worktreeDir = resolveWorktreeDir(repoPath, 'e2e-test-branch');

    const distStats = await fs.lstat(path.join(worktreeDir, 'dist'));
    expect(distStats.isSymbolicLink()).toBe(true);

    const distTarget = await fs.readlink(path.join(worktreeDir, 'dist'));
    expect(distTarget).toBe(path.join(repoPath, 'dist'));
  });

  it('.env is a symlink pointing to source', async () => {
    const worktreeDir = resolveWorktreeDir(repoPath, 'e2e-test-branch');

    const envStats = await fs.lstat(path.join(worktreeDir, '.env'));
    expect(envStats.isSymbolicLink()).toBe(true);

    const envTarget = await fs.readlink(path.join(worktreeDir, '.env'));
    expect(envTarget).toBe(path.join(repoPath, '.env'));
  });

  it('existing top-level symlinks are copied', async () => {
    const worktreeDir = resolveWorktreeDir(repoPath, 'e2e-test-branch');

    const linkStats = await fs.lstat(path.join(worktreeDir, 'existing-link'));
    expect(linkStats.isSymbolicLink()).toBe(true);

    const linkTarget = await fs.readlink(path.join(worktreeDir, 'existing-link'));
    expect(linkTarget).toBe(path.join(repoPath, 'existing-link'));
  });

  it('node_modules/ in worktree is a real directory (rerouted, not a symlink)', async () => {
    const worktreeDir = resolveWorktreeDir(repoPath, 'e2e-test-branch');

    const nmStats = await fs.lstat(path.join(worktreeDir, 'node_modules'));
    expect(nmStats.isSymbolicLink()).toBe(false);
    expect(nmStats.isDirectory()).toBe(true);
  });

  it('internal workspace symlinks inside rerouted node_modules preserve relative targets', async () => {
    const worktreeDir = resolveWorktreeDir(repoPath, 'e2e-test-branch');

    const internalTarget = await fs.readlink(path.join(worktreeDir, 'node_modules', '@scope', 'internal-pkg'));
    expect(toPosix(internalTarget)).toBe('../../packages/internal-pkg');
  });

  it('git exclude file exists with symlinked paths', async () => {
    const worktreeDir = resolveWorktreeDir(repoPath, 'e2e-test-branch');
    const { stdout: gitDir } = await execFileAsync('git', ['-C', worktreeDir, 'rev-parse', '--git-dir'], {
      timeout: 5000
    });
    const excludePath = path.join(gitDir.trim(), 'info', 'exclude');

    const content = await fs.readFile(excludePath, 'utf-8');
    expect(content).toContain('# Symlinks created by instant-worktree');
    // dist should be in exclude (it remains a symlink)
    expect(content).toContain('dist');
    // .env should be in exclude (it remains a symlink)
    expect(content).toContain('.env');
  });

  it('a second call with the same ref rejects', async () => {
    await expect(createWorktree('e2e-test-branch')).rejects.toThrow('Worktree already exists');
  });

  it('accepts explicit cwd option instead of process.cwd()', async () => {
    // This test uses a second temp repo while process.cwd() points elsewhere
    // Create a fresh workspace
    const workspace2 = new TestGitWorkspace();
    await workspace2.create();
    const repoPath2 = workspace2.getPath();
    const git2 = workspace2.getGit();

    // Set up minimal git content
    await fs.writeFile(path.join(repoPath2, '.gitignore'), 'node_modules/\n');
    await git2.add('.gitignore');
    await git2.commit('init');

    // process.cwd() points to the original repoPath (from beforeAll), NOT repoPath2
    // So this proves cwd option is used instead of process.cwd()
    const result = await createWorktree('cwd-test-branch', { cwd: repoPath2 });

    expect(result.path).toBe(resolveWorktreeDir(repoPath2, 'cwd-test-branch'));
    const settled = await result.settle;
    expect(settled.branch).toBe('cwd-test-branch');
    expect(settled.worktree).toBe(resolveWorktreeDir(repoPath2, 'cwd-test-branch'));
    expect(settled.baseSha).toMatch(/^[0-9a-f]{40}$/);

    // Cleanup
    await git2.raw(['worktree', 'remove', settled.worktree, '--force']);
    await workspace2.destroy();
  });
});

describe('resolveRefType', () => {
  let workspace: TestGitWorkspace;
  let repoPath: string;

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    await workspace.create();
    repoPath = workspace.getPath();
    const git = workspace.getGit();

    await git.raw(['tag', 'v1.0.0']);
  });

  afterAll(async () => {
    if (workspace) {
      await workspace.destroy();
    }
  });

  it('returns "branch" for an existing branch', async () => {
    const refType = await resolveRefType(repoPath, 'main');
    expect(refType).toBe('branch');
  });

  it('returns "tag" for an existing tag', async () => {
    const refType = await resolveRefType(repoPath, 'v1.0.0');
    expect(refType).toBe('tag');
  });

  it('returns "commit" for a full SHA', async () => {
    const sha = await resolveHead(repoPath);
    const refType = await resolveRefType(repoPath, sha);
    expect(refType).toBe('commit');
  });

  it('throws for a non-existent ref', async () => {
    await expect(resolveRefType(repoPath, 'nonexistent-ref-abc123')).rejects.toThrow('does not resolve');
  });
});

describe('addDetachedWorktree', () => {
  let workspace: TestGitWorkspace;
  let repoPath: string;
  const worktreePaths: string[] = [];

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    await workspace.create();
    repoPath = workspace.getPath();
    const git = workspace.getGit();

    await git.raw(['tag', 'baseline-tag']);
  });

  afterAll(async () => {
    if (workspace) {
      const git = workspace.getGit();
      for (const wt of worktreePaths) {
        try {
          await git.raw(['worktree', 'remove', wt, '--force']);
        } catch {
          // Ignore errors during cleanup
        }
      }
      await workspace.destroy();
    }
  });

  it('creates a detached worktree from a tag', async () => {
    const worktreePath = path.join(repoPath, '..', `detached-tag-${Date.now()}`);
    worktreePaths.push(worktreePath);

    await addDetachedWorktree(repoPath, worktreePath, 'baseline-tag');

    const stats = await fs.stat(worktreePath);
    expect(stats.isDirectory()).toBe(true);

    const gitPath = path.join(worktreePath, '.git');
    const gitStats = await fs.stat(gitPath);
    expect(gitStats.isFile()).toBe(true);
  });

  it('creates a detached worktree from a commit SHA', async () => {
    const sha = await resolveHead(repoPath);
    const worktreePath = path.join(repoPath, '..', `detached-sha-${Date.now()}`);
    worktreePaths.push(worktreePath);

    await addDetachedWorktree(repoPath, worktreePath, sha);

    const stats = await fs.stat(worktreePath);
    expect(stats.isDirectory()).toBe(true);
  });
});

describe('createWorktree with tag (detached)', () => {
  let workspace: TestGitWorkspace;
  let repoPath: string;
  let originalCwd: string;

  beforeAll(async () => {
    originalCwd = process.cwd();

    workspace = new TestGitWorkspace();
    await workspace.create();
    repoPath = workspace.getPath();

    // Keep worktrees inside the test workspace
    process.env['CARDS_WORKTREES_DIR'] = path.join(repoPath, '.worktrees');

    const git = workspace.getGit();

    await fs.writeFile(path.join(repoPath, '.gitignore'), 'node_modules/\n');
    await git.add('.gitignore');
    await git.commit('Add gitignore');
    await git.raw(['tag', 'implement/test-card/baseline']);

    process.chdir(repoPath);
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    delete process.env['CARDS_WORKTREES_DIR'];

    if (workspace) {
      const git = workspace.getGit();
      const worktreeDir = resolveWorktreeDir(repoPath, 'implement/test-card/baseline');
      try {
        await git.raw(['worktree', 'remove', worktreeDir, '--force']);
      } catch {
        // Ignore errors during cleanup
      }
      await workspace.destroy();
    }
  });

  it('creates a detached worktree for a tag ref', async () => {
    const result = await createWorktree('implement/test-card/baseline');

    expect(result.path).toBe(resolveWorktreeDir(repoPath, 'implement/test-card/baseline'));
    const settled = await result.settle;
    expect(settled.branch).toBe('implement/test-card/baseline');
    expect(settled.worktree).toBe(resolveWorktreeDir(repoPath, 'implement/test-card/baseline'));
    expect(settled.baseSha).toMatch(/^[0-9a-f]{40}$/);
  });
});
