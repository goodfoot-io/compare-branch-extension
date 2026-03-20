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
  it('must NOT remove a branch whose parentBranch equals its own name', async () => {
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { CardsClient } = await import('@cards/sdk/client');
    const { execFile } = await import('node:child_process');

    // This is the corrupted state: parentBranch === branch name
    const selfRefBranch: BranchInfo = {
      name: 'cards/main-25/1',
      worktree: '/test/workspace/.worktrees/cards/main-25/1',
      parentBranch: 'cards/main-25/1', // BUG: should be 'main', not itself
      addedAt: '2025-01-01T00:00:00Z',
      exists: true
    };

    configureBranchesResponse([selfRefBranch]);

    // `git merge-base --is-ancestor X X` always exits 0 (success) because
    // a commit is always an ancestor of itself. This is the crux of the bug:
    // the merge check passes, so cleanup proceeds on unmerged work.
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1];
      const cmdArgs = args[1] as string[];

      if (typeof cb === 'function') {
        if (cmdArgs?.includes('merge-base') && cmdArgs?.includes('--is-ancestor')) {
          // Self-referential check: always succeeds
          cb(null, { stdout: '', stderr: '' });
        } else {
          // worktree remove, branch -d, etc. all succeed
          cb(null, { stdout: '', stderr: '' });
        }
      }
      return {} as ReturnType<typeof execFile>;
    });

    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ branches: [selfRefBranch], commits: [], defaultBranch: 'main' }),
            { status: 200 }
          )
        );
      }
      if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });
    globalThis.fetch = fetchMock;

    const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
    await cleanupMergedBranches(baseInput(), client, createMockLogger());

    const execCalls = vi.mocked(execFile).mock.calls;

    // The branch should NOT have been cleaned up — its work is not actually merged.
    // A self-referential parentBranch is a corrupt state; cleanup must not act on it.
    const worktreeRemoveCall = execCalls.find(
      (c) => (c[1] as string[])?.includes('worktree') && (c[1] as string[])?.includes('remove')
    );
    expect(worktreeRemoveCall).toBeUndefined();

    const branchDeleteCall = execCalls.find(
      (c) => (c[1] as string[])?.includes('branch') && (c[1] as string[])?.includes('-d')
    );
    expect(branchDeleteCall).toBeUndefined();

    const deleteCall = fetchMock.mock.calls.find(
      (c: unknown[]) => (c[1] as RequestInit)?.method === 'DELETE'
    );
    expect(deleteCall).toBeUndefined();
  });

  it('must NOT remove any branch whose parentBranch matches its own name, even among valid siblings', async () => {
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { CardsClient } = await import('@cards/sdk/client');
    const { execFile } = await import('node:child_process');

    // Mix of valid and corrupted branches
    const validBranch: BranchInfo = {
      name: 'cards/card-123/1',
      worktree: '/test/workspace/.worktrees/cards/card-123/1',
      parentBranch: 'main', // correct
      addedAt: '2025-01-01T00:00:00Z',
      exists: true
    };
    const corruptBranch: BranchInfo = {
      name: 'cards/card-456/1',
      worktree: '/test/workspace/.worktrees/cards/card-456/1',
      parentBranch: 'cards/card-456/1', // self-referential — corrupt
      addedAt: '2025-01-01T00:00:00Z',
      exists: true
    };

    configureBranchesResponse([validBranch, corruptBranch]);

    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1];
      const cmdArgs = args[1] as string[];

      if (typeof cb === 'function') {
        if (cmdArgs?.includes('merge-base') && cmdArgs?.includes('--is-ancestor')) {
          const branchArg = cmdArgs[cmdArgs.indexOf('--is-ancestor') + 1];
          if (branchArg === 'cards/card-123/1') {
            // Valid branch: not merged into main
            cb(new Error('exit code 1'));
          } else {
            // Self-referential: always succeeds
            cb(null, { stdout: '', stderr: '' });
          }
        } else {
          cb(null, { stdout: '', stderr: '' });
        }
      }
      return {} as ReturnType<typeof execFile>;
    });

    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ branches: [validBranch, corruptBranch], commits: [], defaultBranch: 'main' }),
            { status: 200 }
          )
        );
      }
      if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });
    globalThis.fetch = fetchMock;

    const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
    await cleanupMergedBranches(baseInput(), client, createMockLogger());

    const execCalls = vi.mocked(execFile).mock.calls;

    // The corrupt branch (cards/card-456/1) must NOT be removed
    const worktreeRemoveCalls = execCalls.filter(
      (c) => (c[1] as string[])?.includes('worktree') && (c[1] as string[])?.includes('remove')
    );
    expect(worktreeRemoveCalls).toHaveLength(0);

    const branchDeleteCalls = execCalls.filter(
      (c) => (c[1] as string[])?.includes('branch') && (c[1] as string[])?.includes('-d')
    );
    expect(branchDeleteCalls).toHaveLength(0);

    const deleteCalls = fetchMock.mock.calls.filter(
      (c: unknown[]) => (c[1] as RequestInit)?.method === 'DELETE'
    );
    expect(deleteCalls).toHaveLength(0);
  });
});
