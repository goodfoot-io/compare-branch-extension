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
 * createWorktree and assert the rerouter leaves non-shareable descendants to
 * the policy: omitted paths stay absent, copied files are materialized real
 * by the include step, share files inside a copied package keep their
 * symlinks, and a package whose interior holds a matcher-matched omitted path
 * is materialized as a real tree (never symlinked wholesale) so worktree-side
 * writes cannot reach the source.
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
    // The unmatched sibling directory under the copied parent is share-
    // classified, so the rerouter symlinks it wholesale and y.js resolves
    // through it — node_modules entries default to share even under a
    // copied parent.
    await expect(fs.readlink(path.join(wPath, 'node_modules', '.vite', 'cache'))).resolves.toBe(
      path.join(repoDir, 'node_modules', '.vite', 'cache')
    );
    await expect(fs.readFile(path.join(wPath, 'node_modules', '.vite', 'cache', 'y.js'), 'utf8')).resolves.toBe('y');
    // Share siblings still resolve to the source.
    await expect(fs.readlink(path.join(wPath, 'node_modules', 'left-pad'))).resolves.toBe(
      path.join(repoDir, 'node_modules', 'left-pad')
    );

    await removeWorktree(wPath);
  });

  it('keeps a copied @scoped package usable: share files and scope sibling symlinked', async () => {
    // A copy rule under @scope/pkgA classifies the whole @scope directory as
    // 'copy' via the policy's copyAncestors set, and pkgA itself as 'copy'
    // too. The rerouter must descend into the scope AND into the copied
    // package: the package's real share files (index.js, package.json) keep
    // their symlinks, the copied cache file is real, and the share sibling
    // @scope/pkgB stays symlinked — otherwise the package could not be
    // resolved when building in the worktree.
    await makeNodeModulesRerouted();
    const nm = path.join(repoDir, 'node_modules');
    await fs.mkdir(path.join(nm, '@scope', 'pkgA', '.cache'), { recursive: true });
    await fs.writeFile(path.join(nm, '@scope', 'pkgA', '.cache', 'x.js'), 'export {};\n');
    await fs.writeFile(path.join(nm, '@scope', 'pkgA', 'index.js'), 'module.exports = 1;');
    await fs.writeFile(path.join(nm, '@scope', 'pkgA', 'package.json'), JSON.stringify({ name: 'pkgA' }));
    await fs.mkdir(path.join(nm, '@scope', 'pkgB'), { recursive: true });
    await fs.writeFile(path.join(nm, '@scope', 'pkgB', 'index.js'), 'module.exports = 2;');
    await fs.writeFile(path.join(repoDir, '.worktreeinclude'), 'node_modules/@scope/pkgA/.cache/x.js\n');

    const { path: wPath, settle } = await createWorktree('feature/reroute-scope-copy', { cwd: repoDir });
    await expect(settle).resolves.toBeDefined();

    // The @scope directory is real, never a symlink, so both members coexist.
    const scopeLstat = await fs.lstat(path.join(wPath, 'node_modules', '@scope'));
    expect(scopeLstat.isDirectory()).toBe(true);
    expect(scopeLstat.isSymbolicLink()).toBe(false);
    // The copied package directory is real too — the copy rule prevents it
    // from being symlinked wholesale.
    const pkgALstat = await fs.lstat(path.join(wPath, 'node_modules', '@scope', 'pkgA'));
    expect(pkgALstat.isDirectory()).toBe(true);
    expect(pkgALstat.isSymbolicLink()).toBe(false);
    // The copied descendant is a real file with the source content.
    const copied = await fs.lstat(path.join(wPath, 'node_modules', '@scope', 'pkgA', '.cache', 'x.js'));
    expect(copied.isSymbolicLink()).toBe(false);
    expect(copied.isFile()).toBe(true);
    await expect(
      fs.readFile(path.join(wPath, 'node_modules', '@scope', 'pkgA', '.cache', 'x.js'), 'utf8')
    ).resolves.toBe('export {};\n');
    // The package's share files are symlinked to the source and readable.
    await expect(fs.readlink(path.join(wPath, 'node_modules', '@scope', 'pkgA', 'index.js'))).resolves.toBe(
      path.join(repoDir, 'node_modules', '@scope', 'pkgA', 'index.js')
    );
    await expect(fs.readFile(path.join(wPath, 'node_modules', '@scope', 'pkgA', 'index.js'), 'utf8')).resolves.toBe(
      'module.exports = 1;'
    );
    await expect(fs.readlink(path.join(wPath, 'node_modules', '@scope', 'pkgA', 'package.json'))).resolves.toBe(
      path.join(repoDir, 'node_modules', '@scope', 'pkgA', 'package.json')
    );
    // The source checkout is unchanged.
    await expect(fs.readFile(path.join(repoDir, 'node_modules', '@scope', 'pkgA', 'index.js'), 'utf8')).resolves.toBe(
      'module.exports = 1;'
    );
    // The share sibling inside the same scope is still symlinked to the source.
    await expect(fs.readlink(path.join(wPath, 'node_modules', '@scope', 'pkgB'))).resolves.toBe(
      path.join(repoDir, 'node_modules', '@scope', 'pkgB')
    );

    await removeWorktree(wPath);
  });

  it('keeps a copied top-level package usable: share files symlinked alongside the copied cache file', async () => {
    // A copy rule inside a top-level package (node_modules/pkgA/.cache/x.js)
    // classifies pkgA 'copy' via the policy's copyAncestors set. The rerouter
    // must materialize pkgA as a real directory and descend into it: the
    // copied cache file is real (owned by the include copy executor) while
    // the package's share files (index.js, package.json) keep their symlinks
    // — otherwise the package could not be resolved when building in the
    // worktree.
    await makeNodeModulesRerouted();
    const nm = path.join(repoDir, 'node_modules');
    await fs.mkdir(path.join(nm, 'pkgA', '.cache'), { recursive: true });
    await fs.writeFile(path.join(nm, 'pkgA', '.cache', 'x.js'), 'export {};\n');
    await fs.writeFile(path.join(nm, 'pkgA', 'index.js'), 'module.exports = 1;');
    await fs.writeFile(path.join(nm, 'pkgA', 'package.json'), JSON.stringify({ name: 'pkgA' }));
    await fs.writeFile(path.join(repoDir, '.worktreeinclude'), 'node_modules/pkgA/.cache/x.js\n');

    const { path: wPath, settle } = await createWorktree('feature/reroute-pkg-copy', { cwd: repoDir });
    await expect(settle).resolves.toBeDefined();

    // The package directory is real, never a symlink — the copy rule prevents
    // it from being linked wholesale.
    const pkgLstat = await fs.lstat(path.join(wPath, 'node_modules', 'pkgA'));
    expect(pkgLstat.isDirectory()).toBe(true);
    expect(pkgLstat.isSymbolicLink()).toBe(false);
    // The copied cache file is a real file, independent of the source copy.
    const copied = await fs.lstat(path.join(wPath, 'node_modules', 'pkgA', '.cache', 'x.js'));
    expect(copied.isSymbolicLink()).toBe(false);
    expect(copied.isFile()).toBe(true);
    await expect(fs.readFile(path.join(wPath, 'node_modules', 'pkgA', '.cache', 'x.js'), 'utf8')).resolves.toBe(
      'export {};\n'
    );
    const srcCopiedStat = await fs.stat(path.join(repoDir, 'node_modules', 'pkgA', '.cache', 'x.js'));
    expect(copied.ino).not.toBe(srcCopiedStat.ino);
    // The package's share files are symlinked to the source and readable.
    await expect(fs.readlink(path.join(wPath, 'node_modules', 'pkgA', 'index.js'))).resolves.toBe(
      path.join(repoDir, 'node_modules', 'pkgA', 'index.js')
    );
    await expect(fs.readFile(path.join(wPath, 'node_modules', 'pkgA', 'index.js'), 'utf8')).resolves.toBe(
      'module.exports = 1;'
    );
    await expect(fs.readlink(path.join(wPath, 'node_modules', 'pkgA', 'package.json'))).resolves.toBe(
      path.join(repoDir, 'node_modules', 'pkgA', 'package.json')
    );
    // The source checkout is unchanged.
    await expect(fs.readFile(path.join(repoDir, 'node_modules', 'pkgA', 'index.js'), 'utf8')).resolves.toBe(
      'module.exports = 1;'
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

  it('materializes a package with an interior omit rule: ruled path absent, share files symlinked, writes cannot reach the source', async () => {
    // A file-level .worktreeignore rule inside a top-level package
    // (node_modules/pkgA/.cache/x.js) matches neither node_modules nor pkgA
    // itself, so classify leaves both 'share'. The rerouter must detect that
    // pkgA is an ANCESTOR of the matcher-matched omitted path and materialize
    // it as a real tree: the ruled file stays absent, the package's share
    // files keep their symlinks, and a worktree-side write at the ruled path
    // cannot reach the source checkout.
    await makeNodeModulesRerouted();
    const nm = path.join(repoDir, 'node_modules');
    await fs.mkdir(path.join(nm, 'pkgA', '.cache'), { recursive: true });
    await fs.writeFile(path.join(nm, 'pkgA', '.cache', 'x.js'), 'export {};\n');
    await fs.writeFile(path.join(nm, 'pkgA', 'index.js'), 'module.exports = 1;');
    await fs.writeFile(path.join(nm, 'pkgA', 'package.json'), JSON.stringify({ name: 'pkgA' }));
    await fs.writeFile(path.join(repoDir, '.worktreeignore'), 'node_modules/pkgA/.cache/x.js\n');

    const { path: wPath, settle } = await createWorktree('feature/reroute-pkg-omit', { cwd: repoDir });
    await expect(settle).resolves.toBeDefined();

    // The package is a real directory, never a wholesale symlink to the source.
    const pkgLstat = await fs.lstat(path.join(wPath, 'node_modules', 'pkgA'));
    expect(pkgLstat.isDirectory()).toBe(true);
    expect(pkgLstat.isSymbolicLink()).toBe(false);
    // The .cache directory is real too, so the ruled path stays absent.
    const cacheLstat = await fs.lstat(path.join(wPath, 'node_modules', 'pkgA', '.cache'));
    expect(cacheLstat.isDirectory()).toBe(true);
    expect(cacheLstat.isSymbolicLink()).toBe(false);
    await expect(fs.lstat(path.join(wPath, 'node_modules', 'pkgA', '.cache', 'x.js'))).rejects.toMatchObject({
      code: 'ENOENT'
    });
    // The package's share files are symlinked to the source and readable.
    await expect(fs.readlink(path.join(wPath, 'node_modules', 'pkgA', 'index.js'))).resolves.toBe(
      path.join(repoDir, 'node_modules', 'pkgA', 'index.js')
    );
    await expect(fs.readFile(path.join(wPath, 'node_modules', 'pkgA', 'index.js'), 'utf8')).resolves.toBe(
      'module.exports = 1;'
    );
    // The source copy of the ruled file is untouched by the settle.
    await expect(fs.readFile(path.join(repoDir, 'node_modules', 'pkgA', '.cache', 'x.js'), 'utf8')).resolves.toBe(
      'export {};\n'
    );
    // A worktree-side write at the ruled path lands in the worktree's own
    // directory — the real .cache tree — and never reaches the source.
    await fs.writeFile(path.join(wPath, 'node_modules', 'pkgA', '.cache', 'x.js'), 'worktree-write\n');
    await expect(fs.readFile(path.join(repoDir, 'node_modules', 'pkgA', '.cache', 'x.js'), 'utf8')).resolves.toBe(
      'export {};\n'
    );

    await removeWorktree(wPath);
  });

  it('materializes an @scoped package with an interior omit rule and keeps its scope sibling symlinked', async () => {
    // Same ancestor trigger as the top-level case, inside an @scope: the rule
    // targets node_modules/@scope/a/.cache/tmp, so the rerouter must descend
    // through the always-real @scope into a — materialized as a real tree
    // with tmp absent and the package's share files symlinked — while the
    // sibling @scope/b stays symlinked wholesale.
    await makeNodeModulesRerouted();
    const nm = path.join(repoDir, 'node_modules');
    await fs.mkdir(path.join(nm, '@scope', 'a', '.cache'), { recursive: true });
    await fs.writeFile(path.join(nm, '@scope', 'a', '.cache', 'tmp'), 'x');
    await fs.writeFile(path.join(nm, '@scope', 'a', 'index.js'), 'module.exports = 1;');
    await fs.mkdir(path.join(nm, '@scope', 'b'), { recursive: true });
    await fs.writeFile(path.join(nm, '@scope', 'b', 'index.js'), 'module.exports = 2;');
    await fs.writeFile(path.join(repoDir, '.worktreeignore'), 'node_modules/@scope/a/.cache/tmp\n');

    const { path: wPath, settle } = await createWorktree('feature/reroute-scope-omit', { cwd: repoDir });
    await expect(settle).resolves.toBeDefined();

    // The scoped package is a real directory, never a wholesale symlink.
    const pkgALstat = await fs.lstat(path.join(wPath, 'node_modules', '@scope', 'a'));
    expect(pkgALstat.isDirectory()).toBe(true);
    expect(pkgALstat.isSymbolicLink()).toBe(false);
    // The ruled path is absent.
    await expect(fs.lstat(path.join(wPath, 'node_modules', '@scope', 'a', '.cache', 'tmp'))).rejects.toMatchObject({
      code: 'ENOENT'
    });
    // The package's share files are symlinked to the source and readable.
    await expect(fs.readlink(path.join(wPath, 'node_modules', '@scope', 'a', 'index.js'))).resolves.toBe(
      path.join(repoDir, 'node_modules', '@scope', 'a', 'index.js')
    );
    await expect(fs.readFile(path.join(wPath, 'node_modules', '@scope', 'a', 'index.js'), 'utf8')).resolves.toBe(
      'module.exports = 1;'
    );
    // The sibling package inside the same scope is still symlinked wholesale.
    await expect(fs.readlink(path.join(wPath, 'node_modules', '@scope', 'b'))).resolves.toBe(
      path.join(repoDir, 'node_modules', '@scope', 'b')
    );

    await removeWorktree(wPath);
  });

  it('applies an interior omit rule inside the copy descent: copied file real, omitted sibling absent', async () => {
    // A copy rule (.worktreeinclude: node_modules/pkgA/.cache/x.js) already
    // materializes pkgA via the copy descent. An omit rule for a DIFFERENT
    // interior path (node_modules/pkgA/logs/tmp) must trigger inside that
    // descent: `logs` classifies share — it is not an ancestor of any copied
    // path — but it hides a matcher-matched omitted path, so it must be
    // materialized real instead of symlinked wholesale, or tmp would be
    // exposed to worktree-side writes that mutate the source.
    await makeNodeModulesRerouted();
    const nm = path.join(repoDir, 'node_modules');
    await fs.mkdir(path.join(nm, 'pkgA', '.cache'), { recursive: true });
    await fs.writeFile(path.join(nm, 'pkgA', '.cache', 'x.js'), 'export {};\n');
    await fs.mkdir(path.join(nm, 'pkgA', 'logs'), { recursive: true });
    await fs.writeFile(path.join(nm, 'pkgA', 'logs', 'tmp'), 'x');
    await fs.writeFile(path.join(nm, 'pkgA', 'index.js'), 'module.exports = 1;');
    await fs.writeFile(path.join(repoDir, '.worktreeinclude'), 'node_modules/pkgA/.cache/x.js\n');
    await fs.writeFile(path.join(repoDir, '.worktreeignore'), 'node_modules/pkgA/logs/tmp\n');

    const { path: wPath, settle } = await createWorktree('feature/reroute-pkg-mixed', { cwd: repoDir });
    await expect(settle).resolves.toBeDefined();

    // The package is a real directory, never a wholesale symlink.
    const pkgLstat = await fs.lstat(path.join(wPath, 'node_modules', 'pkgA'));
    expect(pkgLstat.isDirectory()).toBe(true);
    expect(pkgLstat.isSymbolicLink()).toBe(false);
    // The copied cache file is a real file with the source content.
    const copied = await fs.lstat(path.join(wPath, 'node_modules', 'pkgA', '.cache', 'x.js'));
    expect(copied.isSymbolicLink()).toBe(false);
    expect(copied.isFile()).toBe(true);
    await expect(fs.readFile(path.join(wPath, 'node_modules', 'pkgA', '.cache', 'x.js'), 'utf8')).resolves.toBe(
      'export {};\n'
    );
    // The omit-triggered sibling directory is real and the ruled path absent.
    const logsLstat = await fs.lstat(path.join(wPath, 'node_modules', 'pkgA', 'logs'));
    expect(logsLstat.isDirectory()).toBe(true);
    expect(logsLstat.isSymbolicLink()).toBe(false);
    await expect(fs.lstat(path.join(wPath, 'node_modules', 'pkgA', 'logs', 'tmp'))).rejects.toMatchObject({
      code: 'ENOENT'
    });
    // The package's share files are symlinked to the source and readable.
    await expect(fs.readlink(path.join(wPath, 'node_modules', 'pkgA', 'index.js'))).resolves.toBe(
      path.join(repoDir, 'node_modules', 'pkgA', 'index.js')
    );
    // The source copy of the ruled file is untouched.
    await expect(fs.readFile(path.join(repoDir, 'node_modules', 'pkgA', 'logs', 'tmp'), 'utf8')).resolves.toBe('x');

    await removeWorktree(wPath);
  });

  it('omits an entire package entry matched by a direct directory .worktreeignore pattern', async () => {
    // A directory-level pattern (`node_modules/pkgA/`) matches the package
    // itself, so classify returns 'omit' for the entry and the rerouter skips
    // it wholesale — the omit-ancestor trigger must not change this.
    await makeNodeModulesRerouted();
    const nm = path.join(repoDir, 'node_modules');
    await fs.mkdir(path.join(nm, 'pkgA', '.cache'), { recursive: true });
    await fs.writeFile(path.join(nm, 'pkgA', '.cache', 'x.js'), 'export {};\n');
    await fs.writeFile(path.join(nm, 'pkgA', 'index.js'), 'module.exports = 1;');
    await fs.mkdir(path.join(nm, 'left-pad'), { recursive: true });
    await fs.writeFile(path.join(nm, 'left-pad', 'index.js'), 'module.exports = 0;');
    await fs.writeFile(path.join(repoDir, '.worktreeignore'), 'node_modules/pkgA/\n');

    const { path: wPath, settle } = await createWorktree('feature/reroute-pkg-omit-all', { cwd: repoDir });
    await expect(settle).resolves.toBeDefined();

    // The omitted package is entirely absent.
    await expect(fs.lstat(path.join(wPath, 'node_modules', 'pkgA'))).rejects.toMatchObject({ code: 'ENOENT' });
    // Share siblings still resolve to the source.
    await expect(fs.readlink(path.join(wPath, 'node_modules', 'left-pad'))).resolves.toBe(
      path.join(repoDir, 'node_modules', 'left-pad')
    );

    await removeWorktree(wPath);
  });

  it('materializes a .vite-style cache dir matched by a deep .worktreeignore pattern', async () => {
    // A directory-level pattern INSIDE node_modules (`node_modules/.vite/cache/`)
    // matches only paths under the cache dir — neither node_modules nor .vite
    // itself. The rerouter must materialize .vite as a real tree so the ruled
    // cache content stays absent instead of being exposed through a wholesale
    // .vite symlink, while sibling packages keep their symlinks. The cache dir
    // itself matches the pattern directly and is omitted wholesale, exactly
    // like a direct directory pattern.
    await makeNodeModulesRerouted();
    const nm = path.join(repoDir, 'node_modules');
    await fs.mkdir(path.join(nm, '.vite', 'cache'), { recursive: true });
    await fs.writeFile(path.join(nm, '.vite', 'cache', 'deadbeef'), 'x');
    await fs.mkdir(path.join(nm, 'left-pad'), { recursive: true });
    await fs.writeFile(path.join(nm, 'left-pad', 'index.js'), 'module.exports = 0;');
    await fs.writeFile(path.join(repoDir, '.worktreeignore'), 'node_modules/.vite/cache/\n');

    const { path: wPath, settle } = await createWorktree('feature/reroute-vite-deep-omit', { cwd: repoDir });
    await expect(settle).resolves.toBeDefined();

    // .vite is a real directory, never a wholesale symlink to the source.
    const viteLstat = await fs.lstat(path.join(wPath, 'node_modules', '.vite'));
    expect(viteLstat.isDirectory()).toBe(true);
    expect(viteLstat.isSymbolicLink()).toBe(false);
    // The cache dir matches the pattern directly and is omitted wholesale.
    await expect(fs.lstat(path.join(wPath, 'node_modules', '.vite', 'cache'))).rejects.toMatchObject({
      code: 'ENOENT'
    });
    // Share siblings still resolve to the source.
    await expect(fs.readlink(path.join(wPath, 'node_modules', 'left-pad'))).resolves.toBe(
      path.join(repoDir, 'node_modules', 'left-pad')
    );

    await removeWorktree(wPath);
  });
});
