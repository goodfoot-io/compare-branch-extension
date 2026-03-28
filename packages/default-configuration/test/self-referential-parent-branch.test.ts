import * as fsSyncNs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Reproduction tests for the self-referential parentBranch bug.
 *
 * When `parentBranch` equals the branch name itself (e.g., `cards/main-25/1`
 * with parentBranch `cards/main-25/1`), `cleanupMergedBranches` incorrectly
 * treats the branch as merged because `git merge-base --is-ancestor X X`
 * always succeeds — a branch is trivially an ancestor of itself.
 *
 * This causes worktrees and branch records to be removed for branches with
 * unmerged work.
 *
 * @summary Reproduction tests for self-referential parentBranch bug
 */

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn()
}));

vi.mock('@cards/sdk/worktree', () => ({
  createWorktree: vi.fn(),
  checkWorktreeExists: vi.fn(),
  findGitRoots: vi.fn()
}));

let tempCardRepo: string;

beforeEach(async () => {
  vi.clearAllMocks();
  tempCardRepo = fsSyncNs.mkdtempSync(path.join(os.tmpdir(), 'self-ref-test-'));

  // Enable discovery test mode so createCardsClient() returns a client without
  // a real cards-api.json file on disk.
  process.env['API_TEST_MODE'] = '1';

  const { execFile } = await import('node:child_process');
  vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
    const cb = args[args.length - 1];
    if (typeof cb === 'function') {
      cb(new Error('mock: unhandled command'));
    }
    return {} as ReturnType<typeof execFile>;
  });
});

afterEach(() => {
  fsSyncNs.rmSync(tempCardRepo, { recursive: true, force: true });
  globalThis.fetch = originalFetch;
  delete process.env['API_TEST_MODE'];
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
  fsSyncNs.writeFileSync(path.join(tempCardRepo, 'workspace-branches.json'), JSON.stringify(branches, null, 2));
}

describe('cleanupMergedBranches — self-referential parentBranch bug', () => {
  it('must throw when a branch has self-referential parentBranch', async () => {
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { execFile } = await import('node:child_process');

    writeBranchesJson({
      'cards/main-25/1': {
        worktree: '/test/workspace/.worktrees/cards/main-25/1',
        parentBranch: 'cards/main-25/1',
        addedAt: '2025-01-01T00:00:00Z'
      }
    });

    // git branch --list returns the branch (it exists)
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1];
      const cmdArgs = args[1] as string[];

      if (typeof cb === 'function') {
        if (cmdArgs?.includes('--list')) {
          cb(null, { stdout: '  cards/main-25/1\n', stderr: '' });
        } else {
          cb(new Error('mock: unhandled command'));
        }
      }
      return {} as ReturnType<typeof execFile>;
    });

    await expect(cleanupMergedBranches(baseInput(), tempCardRepo, createMockLogger())).rejects.toThrow(
      'self-referential parentBranch'
    );
  });

  it('must throw on corrupt branch even when valid siblings exist', async () => {
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { execFile } = await import('node:child_process');

    writeBranchesJson({
      'cards/card-123/1': {
        worktree: '/test/workspace/.worktrees/cards/card-123/1',
        parentBranch: 'main',
        addedAt: '2025-01-01T00:00:00Z'
      },
      'cards/card-456/1': {
        worktree: '/test/workspace/.worktrees/cards/card-456/1',
        parentBranch: 'cards/card-456/1',
        addedAt: '2025-01-01T00:00:00Z'
      }
    });

    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1];
      const cmdArgs = args[1] as string[];

      if (typeof cb === 'function') {
        if (cmdArgs?.includes('--list')) {
          // Both branches exist
          const branchName = cmdArgs[cmdArgs.length - 1];
          cb(null, { stdout: `  ${branchName}\n`, stderr: '' });
        } else if (cmdArgs?.includes('merge-base') && cmdArgs?.includes('--is-ancestor')) {
          // Valid branch: not merged into main
          cb(new Error('exit code 1'));
        } else {
          cb(null, { stdout: '', stderr: '' });
        }
      }
      return {} as ReturnType<typeof execFile>;
    });

    await expect(cleanupMergedBranches(baseInput(), tempCardRepo, createMockLogger())).rejects.toThrow(
      'self-referential parentBranch'
    );
  });
});
