/**
 * Integration tests for the `remove-worktree` CLI binary.
 *
 * Spawns the CLI via `tsx` against `src/bin/remove-worktree.ts`, mirroring the
 * pattern used in `createWorktreeCli.test.ts`.
 *
 * @summary CLI integration specs for remove-worktree
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const removeWorktreeBinPath = new URL('../../src/bin/remove-worktree.ts', import.meta.url).pathname;

/**
 * Spawns the remove-worktree CLI and returns stdout, stderr, and exit code.
 *
 * @param args - CLI arguments.
 * @param cwd - Working directory for the process.
 * @param env - Additional environment variables.
 * @returns stdout, stderr, and exit code.
 */
function runRemoveWorktree(
  args: string[],
  cwd: string,
  env?: Record<string, string>
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('tsx', [removeWorktreeBinPath, ...args], {
      encoding: 'utf8',
      cwd,
      env: { ...process.env, ...env }
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
 * Initialises a minimal git repo at `dir` with a commit.
 *
 * @param dir - Absolute path to initialise as a git repo.
 */
function initGitRepo(dir: string): void {
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  execFileSync('bash', ['-c', `echo '# test' > README.md`], { cwd: dir });
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
}

describe('remove-worktree CLI', () => {
  let tmpBase = '';

  afterEach(async () => {
    if (tmpBase) {
      await fs.rm(tmpBase, { recursive: true, force: true });
      tmpBase = '';
    }
  });

  it('exits 2 when invoked without arguments', () => {
    const result = runRemoveWorktree([], os.tmpdir());
    expect(result.exitCode).toBe(2);
  });

  it('exits 2 when given extra arguments', () => {
    const result = runRemoveWorktree(['/some/path', 'extra'], os.tmpdir());
    expect(result.exitCode).toBe(2);
  });

  it('exits 0 when removing an existing worktree', async () => {
    tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'rwt-cli-'));
    const repoDir = path.join(tmpBase, 'repo');
    const worktreesDir = path.join(tmpBase, 'worktrees');
    await fs.mkdir(repoDir);
    await fs.mkdir(worktreesDir);
    initGitRepo(repoDir);

    const { execFileSync: exec } = await import('node:child_process');
    const createBin = new URL('../../src/bin/create-worktree.ts', import.meta.url).pathname;
    const createOut = exec('tsx', [createBin, 'feature/cli-remove-test'], {
      encoding: 'utf8',
      cwd: repoDir,
      env: { ...process.env, CARDS_WORKTREES_DIR: worktreesDir }
    });
    const parsed = JSON.parse(createOut.trim()) as { worktree: string };
    const worktreePath = parsed['worktree'];

    const result = runRemoveWorktree([worktreePath], repoDir, { CARDS_WORKTREES_DIR: worktreesDir });
    expect(result.exitCode).toBe(0);

    await expect(fs.access(worktreePath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('exits 2 when path is outside the worktrees root', async () => {
    tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'rwt-cli-'));
    const worktreesDir = path.join(tmpBase, 'worktrees');
    await fs.mkdir(worktreesDir);
    const outsidePath = path.join(tmpBase, 'outside');
    await fs.mkdir(outsidePath);

    const result = runRemoveWorktree([outsidePath], os.tmpdir(), { CARDS_WORKTREES_DIR: worktreesDir });
    expect(result.exitCode).toBe(2);
  });
});
