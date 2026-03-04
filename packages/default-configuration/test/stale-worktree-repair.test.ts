/**
 * Reproduces a bug where `createWorktree` fails when a stale directory
 * already exists at the expected worktree path on disk, even though
 * git does not track it as a worktree.
 *
 * A previous session may crash and leave behind a directory (e.g.
 * containing only a `.keep` file) at `.worktrees/cards/<id>/<slot>`.
 * Because git's `worktree add` cannot create into a non-empty directory,
 * the call fails with an error rather than cleaning up the stale remnant
 * and retrying.
 *
 * @summary Regression test for stale worktree directory blocking createWorktree
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { TestGitWorkspace } from '@cards/test-utils';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createWorktree } from '../src/lib/create-worktree.js';

describe('stale worktree directory repair', () => {
  let workspace: TestGitWorkspace;

  beforeAll(async () => {
    workspace = new TestGitWorkspace();
    await workspace.create();
  });

  afterAll(() => {
    if (workspace) {
      workspace.destroy();
    }
  });

  it('succeeds when a stale directory with a .keep file exists at the worktree path', async () => {
    const repoRoot = workspace.getPath();
    const branchName = 'cards/test-card/1';
    const staleDir = path.join(repoRoot, '.worktrees', branchName);

    // Simulate a crashed previous session that left a stale directory
    await fs.mkdir(staleDir, { recursive: true });
    await fs.writeFile(path.join(staleDir, '.keep'), '');

    // createWorktree should handle the stale directory and succeed.
    // Currently this fails because `git worktree add` cannot create
    // into a non-empty directory.
    const result = await createWorktree(branchName, { cwd: repoRoot });

    expect(result.branch).toBe(branchName);
    expect(result.worktree).toBe(staleDir);

    // Verify the worktree was properly created
    const stat = await fs.stat(result.worktree);
    expect(stat.isDirectory()).toBe(true);

    // Verify a .git file exists (marker for a valid worktree checkout)
    const gitMarker = path.join(result.worktree, '.git');
    const gitStat = await fs.stat(gitMarker);
    expect(gitStat.isFile() || gitStat.isDirectory()).toBe(true);
  });
});
