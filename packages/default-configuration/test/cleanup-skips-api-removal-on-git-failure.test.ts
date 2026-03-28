/**
 * Tests for cleanupMergedBranches cleanup step ordering.
 *
 * After the "Branch deleted fix" (cbc496fd2), branch record removal only runs
 * when `git branch -d` succeeds. If the local branch still exists, the record
 * is preserved to keep local and card repo state in sync. Worktree removal
 * and branch deletion failures are logged but do not abort the sweep for
 * other branches.
 *
 * @summary Tests for cleanupMergedBranches cleanup step ordering
 */

import { execFileSync } from 'node:child_process';
import * as fsSyncNs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn(),
  execFileSync: vi.fn()
}));

vi.mock('@cards/sdk/worktree', () => ({
  createWorktree: vi.fn(),
  checkWorktreeExists: vi.fn(),
  findGitRoots: vi.fn()
}));

let tempCardRepo: string;

beforeEach(async () => {
  vi.clearAllMocks();
  tempCardRepo = fsSyncNs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-order-test-'));
});

afterEach(() => {
  fsSyncNs.rmSync(tempCardRepo, { recursive: true, force: true });
});

function createMockLogger(): ActionContext['logger'] {
  return new Logger();
}

function baseInput(overrides?: Partial<ActionInput>): ActionInput {
  return {
    cardId: 'card-123',
    actionName: 'Launch',
    environment: 'default',
    executionMode: 'interactive',
    apiBaseUrl: '',
    apiAccessToken: '',
    repoRoot: '/test/workspace',
    cardRepoPath: tempCardRepo,
    configPath: '/test/config',
    extensionPath: '/test/extension',
    ...overrides
  };
}

function writeBranchesJson(
  branches: Record<string, { worktree?: string; parentBranch: string; addedAt: string }>
): void {
  fsSyncNs.writeFileSync(path.join(tempCardRepo, 'workspace-branches.json'), `${JSON.stringify(branches, null, 2)}\n`);
}

describe('cleanupMergedBranches — cleanup steps run independently', () => {
  it('skips branch record removal when git branch -d fails', async () => {
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { execFile } = await import('node:child_process');

    writeBranchesJson({
      'cards/card-123/1': {
        worktree: '/test/workspace/.worktrees/cards/card-123/1',
        parentBranch: 'main',
        addedAt: '2025-01-01T00:00:00Z'
      }
    });

    // merge-base succeeds (branch is merged), worktree remove succeeds,
    // but git branch -d FAILS
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1];
      const cmd = args[0] as string;
      const cmdArgs = args[1] as string[];
      const key = `${cmd} ${cmdArgs.join(' ')}`;

      if (typeof cb === 'function') {
        if (key.includes('branch --list')) {
          cb(null, { stdout: '  cards/card-123/1\n', stderr: '' });
        } else if (key.includes('merge-base --is-ancestor')) {
          cb(null, { stdout: '', stderr: '' }); // merged
        } else if (key.includes('worktree remove')) {
          cb(null, { stdout: '', stderr: '' }); // worktree removal succeeds
        } else if (key.includes('branch') && key.includes('-d')) {
          cb(new Error('error: branch is not fully merged')); // git branch -d FAILS
        } else {
          cb(null, { stdout: '', stderr: '' });
        }
      }
      return {} as ReturnType<typeof execFile>;
    });

    await cleanupMergedBranches(baseInput(), tempCardRepo, createMockLogger());

    // workspace-branches.json should still contain the branch
    const branches = JSON.parse(fsSyncNs.readFileSync(path.join(tempCardRepo, 'workspace-branches.json'), 'utf-8'));
    expect(branches['cards/card-123/1']).toBeDefined();
  });

  it('skips branch record removal when both worktree remove and branch -d fail', async () => {
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { execFile } = await import('node:child_process');

    writeBranchesJson({
      'cards/card-123/1': {
        worktree: '/test/workspace/.worktrees/cards/card-123/1',
        parentBranch: 'main',
        addedAt: '2025-01-01T00:00:00Z'
      }
    });

    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1];
      const cmd = args[0] as string;
      const cmdArgs = args[1] as string[];
      const key = `${cmd} ${cmdArgs.join(' ')}`;

      if (typeof cb === 'function') {
        if (key.includes('branch --list')) {
          cb(null, { stdout: '  cards/card-123/1\n', stderr: '' });
        } else if (key.includes('merge-base --is-ancestor')) {
          cb(null, { stdout: '', stderr: '' });
        } else if (key.includes('worktree remove')) {
          cb(new Error('cannot remove worktree: still checked out'));
        } else if (key.includes('branch') && key.includes('-d')) {
          cb(new Error('error: branch is not fully merged'));
        } else {
          cb(null, { stdout: '', stderr: '' });
        }
      }
      return {} as ReturnType<typeof execFile>;
    });

    await cleanupMergedBranches(baseInput(), tempCardRepo, createMockLogger());

    // workspace-branches.json should still contain the branch
    const branches = JSON.parse(fsSyncNs.readFileSync(path.join(tempCardRepo, 'workspace-branches.json'), 'utf-8'));
    expect(branches['cards/card-123/1']).toBeDefined();
  });

  it('removes branch record when git branch -d succeeds', async () => {
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { execFile } = await import('node:child_process');

    writeBranchesJson({
      'cards/card-123/1': {
        worktree: '/test/workspace/.worktrees/cards/card-123/1',
        parentBranch: 'main',
        addedAt: '2025-01-01T00:00:00Z'
      }
    });

    // Everything succeeds
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1];
      const cmd = args[0] as string;
      const cmdArgs = args[1] as string[];
      const key = `${cmd} ${cmdArgs.join(' ')}`;

      if (typeof cb === 'function') {
        if (key.includes('branch --list')) {
          cb(null, { stdout: '  cards/card-123/1\n', stderr: '' });
        } else {
          cb(null, { stdout: '', stderr: '' });
        }
      }
      return {} as ReturnType<typeof execFile>;
    });

    await cleanupMergedBranches(baseInput(), tempCardRepo, createMockLogger());

    // workspace-branches.json should no longer contain the branch
    const branches = JSON.parse(fsSyncNs.readFileSync(path.join(tempCardRepo, 'workspace-branches.json'), 'utf-8'));
    expect(branches['cards/card-123/1']).toBeUndefined();
  });
});
