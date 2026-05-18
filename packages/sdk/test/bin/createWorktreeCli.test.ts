/**
 * Skipped CLI integration tests for the `create-worktree` binary.
 *
 * These tests verify exit-code mapping and JSON output shape. They are skipped in
 * Phase 2 and will be unskipped in Phase 3 once `applyWorktreeInclude` is implemented.
 *
 * Spawns the CLI via `tsx` against `src/bin/create-worktree.ts`, mirroring the
 * pattern used in `card.test.ts`.
 *
 * @summary Phase 2 skipped CLI integration specs for create-worktree
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const createWorktreeBinPath = fileURLToPath(new URL('../../src/bin/create-worktree.ts', import.meta.url));
/** tsx CLI entrypoint, spawned via node for cross-platform support. */
const tsxCli = createRequire(import.meta.url).resolve('tsx/cli');

/**
 * Spawns the create-worktree CLI and returns stdout, stderr, and exit code.
 *
 * @param args - CLI arguments.
 * @param cwd - Working directory for the process.
 * @param env - Optional extra environment variables merged over `process.env`.
 * @returns stdout, stderr, and exit code.
 */
function runCreateWorktree(
  args: string[],
  cwd: string,
  env?: Record<string, string>
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync(process.execPath, [tsxCli, createWorktreeBinPath, ...args], {
      encoding: 'utf8',
      cwd,
      ...(env ? { env: { ...process.env, ...env } } : {})
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exitCode: err.status ?? 1
    };
  }
}

/**
 * Initialises a minimal git repo at `dir` with a README tracked, so
 * `git worktree add` can operate against it.
 *
 * @param dir - Absolute path to initialise as a git repo.
 */
async function initGitRepo(dir: string): Promise<void> {
  const { execFileSync: exec } = await import('node:child_process');
  exec('git', ['init', '-q'], { cwd: dir });
  exec('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  exec('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await fs.writeFile(path.join(dir, 'README.md'), '# test\n');
  exec('git', ['add', '.'], { cwd: dir });
  exec('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
}

describe('create-worktree CLI', () => {
  let tmpBase = '';

  afterEach(async () => {
    if (tmpBase) {
      await fs.rm(tmpBase, { recursive: true, force: true });
      tmpBase = '';
    }
  });

  it('exits 0 and JSON output includes copiedFromInclude:0 when no .worktreeinclude exists', async () => {
    tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'cwt-cli-'));
    const repoDir = path.join(tmpBase, 'repo');
    await fs.mkdir(repoDir);
    await initGitRepo(repoDir);

    const result = runCreateWorktree(['test-branch'], repoDir);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    expect(parsed['copiedFromInclude']).toBe(0);
    expect(typeof parsed['reroutedSymlinks']).toBe('number');
  });

  it('exits 0 and copiedFromInclude is 1 when include file matches one gitignored file', async () => {
    tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'cwt-cli-'));
    const repoDir = path.join(tmpBase, 'repo');
    await fs.mkdir(repoDir);
    await initGitRepo(repoDir);

    // Add .gitignore and .worktreeinclude after initial commit
    await fs.writeFile(path.join(repoDir, '.gitignore'), '.env\n');
    await fs.writeFile(path.join(repoDir, '.worktreeinclude'), '.env\n');
    await fs.writeFile(path.join(repoDir, '.env'), 'SECRET=1');

    const { execFileSync } = await import('node:child_process');
    execFileSync('git', ['add', '.gitignore', '.worktreeinclude'], { cwd: repoDir });
    execFileSync('git', ['commit', '-q', '-m', 'add include'], { cwd: repoDir });

    const result = runCreateWorktree(['test-branch-include'], repoDir);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    expect(parsed['copiedFromInclude']).toBe(1);
  });

  // Relies on POSIX file-mode unreadability (chmod 0o000). Windows has no
  // equivalent — chmod cannot remove read access — so this guarantee is
  // genuinely POSIX-semantic and is skipped there rather than faked.
  it.skipIf(process.platform === 'win32')(
    'exits 3 and writes an error message to stderr when .worktreeinclude is unreadable',
    async () => {
      tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'cwt-cli-'));
      const repoDir = path.join(tmpBase, 'repo');
      await fs.mkdir(repoDir);
      await initGitRepo(repoDir);

      const includePath = path.join(repoDir, '.worktreeinclude');
      await fs.writeFile(includePath, '.env\n');
      await fs.chmod(includePath, 0o000);

      try {
        const result = runCreateWorktree(['test-branch-err'], repoDir);

        expect(result.exitCode).toBe(3);
        expect(result.stdout).not.toContain('"copiedFromInclude"');
        expect(result.stderr.length).toBeGreaterThan(0);
      } finally {
        await fs.chmod(includePath, 0o644);
      }
    }
  );

  it('exits 2 when invoked without arguments (missing argument regression)', () => {
    const result = runCreateWorktree([], os.tmpdir());
    expect(result.exitCode).toBe(2);
  });

  it('provisions card-bound worktree with compiledScriptPaths from EXTENSION_PATH', async () => {
    tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'cwt-cli-'));
    const repoDir = path.join(tmpBase, 'repo');
    await fs.mkdir(repoDir);
    await initGitRepo(repoDir);

    // Fake extension install with compiled git-hook artifacts.
    const extDir = path.join(tmpBase, 'ext');
    const gitHooksDir = path.join(extDir, 'dist', 'git-hooks');
    await fs.mkdir(gitHooksDir, { recursive: true });
    for (const name of ['pre-commit', 'post-commit', 'post-rewrite']) {
      await fs.writeFile(path.join(gitHooksDir, `${name}.mjs`), `// ${name} stub\n`);
    }

    const homeDir = path.join(tmpBase, 'home');
    await fs.mkdir(homeDir, { recursive: true });

    const result = runCreateWorktree(['--card-id', 'main-77', 'card-branch'], repoDir, {
      EXTENSION_PATH: extDir,
      HOME: homeDir
    });

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout.trim()) as Record<string, unknown>;
    const worktreePath = parsed['worktree'] as string;

    // Attribution marker written.
    const cardId = await fs.readFile(path.join(worktreePath, '.cards', 'CARD_ID'), 'utf-8');
    expect(cardId.trim()).toBe('main-77');

    // Per-worktree core.hooksPath points at the global shared dispatcher dir,
    // and the compiled .mjs were copied there from the fake extension install.
    const hooksPath = execFileSync('git', ['-C', worktreePath, 'config', '--worktree', 'core.hooksPath'], {
      encoding: 'utf8'
    }).trim();
    expect(hooksPath).toBe(path.join(homeDir, '.cards', 'workspace-hooks'));
    const copied = await fs.readFile(path.join(hooksPath, 'post-commit.mjs'), 'utf-8');
    expect(copied).toBe('// post-commit stub\n');
  });

  it('exits 2 with actionable error when --card-id given but extension path unresolvable', async () => {
    tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'cwt-cli-'));
    const repoDir = path.join(tmpBase, 'repo');
    await fs.mkdir(repoDir);
    await initGitRepo(repoDir);

    // EXTENSION_PATH empty and HOME pointed at a dir with no .cards/EXTENSION_PATH.
    const fakeHome = path.join(tmpBase, 'home');
    await fs.mkdir(fakeHome, { recursive: true });

    const result = runCreateWorktree(['--card-id', 'main-77', 'card-branch'], repoDir, {
      EXTENSION_PATH: '',
      HOME: fakeHome
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Cannot resolve extension path');
  });
});
