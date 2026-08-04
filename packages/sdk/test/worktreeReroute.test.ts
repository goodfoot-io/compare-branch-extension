/**
 * Regression tests for the WorktreeCreate EEXIST failure on node_modules reroute,
 * plus policy-aware rerouting.
 *
 * Mirrors the real scenario: a repo whose `node_modules/` is git-ignored and
 * contains a `.experimental-vitest-cache` directory. createWorktree's settle
 * must complete without throwing EEXIST while symlinking node_modules entries,
 * and rerouteNodeModules must be safe to run more than once against the same
 * worktree (a re-fired hook, re-entry, or retried launch) without EEXIST.
 *
 * The policy-aware tests drive `.worktreeignore` and `.worktreeinclude` rules
 * under `node_modules` (including a `.vite`-style cache path) through
 * createWorktree and assert the rerouter skips non-shareable descendants
 * instead of symlinking them.
 *
 * @summary rerouteNodeModules idempotency regression and policy awareness
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWorktree, removeWorktree, rerouteNodeModules } from '../src/worktree.js';

const CARDS_WORKTREES_DIR_KEY = 'CARDS_WORKTREES_DIR';

function initGitRepo(dir: string): void {
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  writeFileSync(path.join(dir, 'README.md'), '# test\n');
  writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
}

let tmpBase = '';
let repoDir = '';
let worktreesDir = '';
const originalEnv = process.env;

beforeEach(async () => {
  tmpBase = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'rwt-repro-')));
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
    await fs.rm(tmpBase, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    tmpBase = '';
  }
});

describe('rerouteNodeModules idempotency', () => {
  it('settles without EEXIST when node_modules is git-ignored and holds a cache dir', async () => {
    // Source node_modules (git-ignored as a whole) with a real cache directory.
    const nm = path.join(repoDir, 'node_modules');
    await fs.mkdir(path.join(nm, '.experimental-vitest-cache'), { recursive: true });
    await fs.writeFile(path.join(nm, '.experimental-vitest-cache', 'deadbeef'), 'x');
    await fs.mkdir(path.join(nm, 'left-pad'), { recursive: true });
    await fs.writeFile(path.join(nm, 'left-pad', 'index.js'), 'module.exports = 0;');

    const { path: wPath, settle } = await createWorktree('feature/reroute-repro', { cwd: repoDir });
    await expect(settle).resolves.toBeDefined();

    // The cache dir is mirrored into the worktree node_modules.
    const linked = path.join(wPath, 'node_modules', '.experimental-vitest-cache');
    await expect(fs.stat(linked)).resolves.toBeDefined();

    await removeWorktree(wPath);
  });

  it('rerouteNodeModules is idempotent: a second run does not throw EEXIST', async () => {
    const sourceNodeModules = path.join(repoDir, 'node_modules');
    await fs.mkdir(path.join(sourceNodeModules, '.experimental-vitest-cache'), { recursive: true });
    await fs.writeFile(path.join(sourceNodeModules, '.experimental-vitest-cache', 'deadbeef'), 'x');
    await fs.mkdir(path.join(sourceNodeModules, 'left-pad'), { recursive: true });
    await fs.writeFile(path.join(sourceNodeModules, 'left-pad', 'index.js'), 'module.exports = 0;');
    await fs.mkdir(path.join(sourceNodeModules, '@scope', 'pkg'), { recursive: true });
    await fs.writeFile(path.join(sourceNodeModules, '@scope', 'pkg', 'index.js'), 'module.exports = 1;');

    const destNodeModules = path.join(tmpBase, 'dest', 'node_modules');

    // First run mirrors the tree (leaving dest as a real dir full of symlinks).
    await rerouteNodeModules({ sourceNodeModules, destNodeModules });

    // Second run (retried/re-fired hook, or re-entry) must not throw EEXIST.
    await expect(rerouteNodeModules({ sourceNodeModules, destNodeModules })).resolves.toBeGreaterThanOrEqual(0);

    // The entries still resolve to the source.
    const resolved = await fs.readlink(path.join(destNodeModules, '.experimental-vitest-cache'));
    expect(resolved).toBe(path.join(sourceNodeModules, '.experimental-vitest-cache'));
    const scoped = await fs.readlink(path.join(destNodeModules, '@scope', 'pkg'));
    expect(scoped).toBe(path.join(sourceNodeModules, '@scope', 'pkg'));
  });
});

describe('policy-aware node_modules rerouting', () => {
  /**
   * Makes the fixture a yarn-workspaces repo so enumerateReroutedNodeModules
   * owns the root node_modules and the rerouter rebuilds it as a real directory
   * of per-entry symlinks. Without this, the fixture's git-ignored node_modules
   * is symlinked wholesale by symlinkIgnoredPaths instead — which would mask
   * the per-descendant policy decisions this suite asserts.
   */
  async function makeNodeModulesRerouted(): Promise<void> {
    await fs.writeFile(path.join(repoDir, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }));
  }

  it('omits a .worktreeignore-matched node_modules descendant: no symlink is created for it', async () => {
    await makeNodeModulesRerouted();
    const nm = path.join(repoDir, 'node_modules');
    await fs.mkdir(path.join(nm, '.vite', 'cache'), { recursive: true });
    await fs.writeFile(path.join(nm, '.vite', 'cache', 'deadbeef'), 'x');
    await fs.mkdir(path.join(nm, 'left-pad'), { recursive: true });
    await fs.writeFile(path.join(nm, 'left-pad', 'index.js'), 'module.exports = 0;');
    await fs.writeFile(path.join(repoDir, '.worktreeignore'), 'node_modules/.vite\n');

    const { path: wPath, settle } = await createWorktree('feature/reroute-omit', { cwd: repoDir });
    await expect(settle).resolves.toBeDefined();

    // The omitted descendant is absent — no symlink, no directory.
    await expect(fs.lstat(path.join(wPath, 'node_modules', '.vite'))).rejects.toMatchObject({ code: 'ENOENT' });
    // Share siblings still resolve to the source.
    await expect(fs.readlink(path.join(wPath, 'node_modules', 'left-pad'))).resolves.toBe(
      path.join(repoDir, 'node_modules', 'left-pad')
    );

    await removeWorktree(wPath);
  });

  it('copies a .worktreeinclude-matched node_modules descendant instead of symlinking it', async () => {
    await makeNodeModulesRerouted();
    const nm = path.join(repoDir, 'node_modules');
    await fs.mkdir(path.join(nm, '.vite', 'deps'), { recursive: true });
    await fs.writeFile(path.join(nm, '.vite', 'deps', 'x.js'), 'export {};\n');
    await fs.mkdir(path.join(nm, '.vite', 'cache'), { recursive: true });
    await fs.writeFile(path.join(nm, '.vite', 'cache', 'y.js'), 'y');
    await fs.mkdir(path.join(nm, 'left-pad'), { recursive: true });
    await fs.writeFile(path.join(nm, 'left-pad', 'index.js'), 'module.exports = 0;');
    await fs.writeFile(path.join(repoDir, '.worktreeinclude'), 'node_modules/.vite/deps/x.js\n');

    const { path: wPath, settle } = await createWorktree('feature/reroute-copy', { cwd: repoDir });
    await expect(settle).resolves.toBeDefined();

    // The copied descendant is a real file in the worktree, not a symlink.
    const copied = await fs.lstat(path.join(wPath, 'node_modules', '.vite', 'deps', 'x.js'));
    expect(copied.isSymbolicLink()).toBe(false);
    expect(copied.isFile()).toBe(true);
    expect(await fs.readFile(path.join(wPath, 'node_modules', '.vite', 'deps', 'x.js'), 'utf8')).toBe('export {};\n');
    // The copied parent is a real directory, never a symlink.
    const viteLstat = await fs.lstat(path.join(wPath, 'node_modules', '.vite'));
    expect(viteLstat.isSymbolicLink()).toBe(false);
    expect(viteLstat.isDirectory()).toBe(true);
    // Unmatched ignored siblings under the copied parent stay absent.
    await expect(fs.lstat(path.join(wPath, 'node_modules', '.vite', 'cache', 'y.js'))).rejects.toMatchObject({
      code: 'ENOENT'
    });
    // Share siblings still resolve to the source.
    await expect(fs.readlink(path.join(wPath, 'node_modules', 'left-pad'))).resolves.toBe(
      path.join(repoDir, 'node_modules', 'left-pad')
    );

    await removeWorktree(wPath);
  });

  it('omits an entire node_modules entry matched by .worktreeignore', async () => {
    await makeNodeModulesRerouted();
    const nm = path.join(repoDir, 'node_modules');
    await fs.mkdir(path.join(nm, 'left-pad'), { recursive: true });
    await fs.writeFile(path.join(nm, 'left-pad', 'index.js'), 'module.exports = 0;');
    await fs.writeFile(path.join(repoDir, '.worktreeignore'), 'node_modules/\n');

    const { path: wPath, settle } = await createWorktree('feature/reroute-omit-all', { cwd: repoDir });
    await expect(settle).resolves.toBeDefined();

    // The omitted node_modules dir is not rebuilt at all.
    await expect(fs.lstat(path.join(wPath, 'node_modules'))).rejects.toMatchObject({ code: 'ENOENT' });

    await removeWorktree(wPath);
  });
});
