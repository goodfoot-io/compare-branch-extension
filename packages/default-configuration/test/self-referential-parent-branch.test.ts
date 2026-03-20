import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import type { BranchInfo } from '@cards/sdk/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Reproduction tests for the self-referential parentBranch bug.
 *
 * When `parentBranch` equals the branch name itself (e.g., `cards/main-25/1`
 * with parentBranch `cards/main-25/1`), `cleanupMergedBranches` incorrectly
 * treats the branch as merged because `git merge-base --is-ancestor X X`
 * always succeeds — a branch is trivially an ancestor of itself.
 *
 * This causes worktrees and API records to be removed for branches with
 * unmerged work.
 *
 * @summary Reproduction tests for self-referential parentBranch bug
 */

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn()
}));

vi.mock('../src/lib/create-worktree.js', () => ({
  createWorktree: vi.fn(),
  checkWorktreeExists: vi.fn(),
  findGitRoots: vi.fn()
}));

const originalFetch = globalThis.fetch;

beforeEach(async () => {
  vi.clearAllMocks();

  const { execFile } = await import('node:child_process');
  vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
    const cb = args[args.length - 1];
    if (typeof cb === 'function') {
      cb(new Error('mock: unhandled command'));
    }
    return {} as ReturnType<typeof execFile>;
  });

  globalThis.fetch = vi.fn().mockImplementation(() => {
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
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
    apiBaseUrl: 'http://localhost:3000',
    apiAccessToken: 'test-token',
    repoRoot: '/test/workspace',
    cardRepoPath: '/test/repo',
    configPath: '/test/config',
    extensionPath: '/test/extension',
    ...overrides
  };
}

function configureBranchesResponse(branches: BranchInfo[]): void {
  globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
      return Promise.resolve(
        new Response(JSON.stringify({ branches, commits: [], defaultBranch: 'main' }), { status: 200 })
      );
    }
    if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'DELETE') {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  });
}

describe('cleanupMergedBranches — self-referential parentBranch bug', () => {
  it('must throw when a branch has self-referential parentBranch', async () => {
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { CardsClient } = await import('@cards/sdk/client');

    const selfRefBranch: BranchInfo = {
      name: 'cards/main-25/1',
      worktree: '/test/workspace/.worktrees/cards/main-25/1',
      parentBranch: 'cards/main-25/1',
      addedAt: '2025-01-01T00:00:00Z',
      exists: true
    };

    configureBranchesResponse([selfRefBranch]);

    const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
    await expect(cleanupMergedBranches(baseInput(), client, createMockLogger())).rejects.toThrow(
      'self-referential parentBranch'
    );
  });

  it('must throw on corrupt branch even when valid siblings exist', async () => {
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { CardsClient } = await import('@cards/sdk/client');
    const { execFile } = await import('node:child_process');

    const validBranch: BranchInfo = {
      name: 'cards/card-123/1',
      worktree: '/test/workspace/.worktrees/cards/card-123/1',
      parentBranch: 'main',
      addedAt: '2025-01-01T00:00:00Z',
      exists: true
    };
    const corruptBranch: BranchInfo = {
      name: 'cards/card-456/1',
      worktree: '/test/workspace/.worktrees/cards/card-456/1',
      parentBranch: 'cards/card-456/1',
      addedAt: '2025-01-01T00:00:00Z',
      exists: true
    };

    configureBranchesResponse([validBranch, corruptBranch]);

    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1];
      const cmdArgs = args[1] as string[];

      if (typeof cb === 'function') {
        if (cmdArgs?.includes('merge-base') && cmdArgs?.includes('--is-ancestor')) {
          // Valid branch: not merged into main
          cb(new Error('exit code 1'));
        } else {
          cb(null, { stdout: '', stderr: '' });
        }
      }
      return {} as ReturnType<typeof execFile>;
    });

    const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
    await expect(cleanupMergedBranches(baseInput(), client, createMockLogger())).rejects.toThrow(
      'self-referential parentBranch'
    );
  });
});
