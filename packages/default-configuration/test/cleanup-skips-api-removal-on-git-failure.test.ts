/**
 * Tests for cleanupMergedBranches cleanup step ordering.
 *
 * After the "Branch deleted fix" (cbc496fd2), API record removal only runs when
 * `git branch -d` succeeds. If the local branch still exists, the API record is
 * preserved to keep local and remote state in sync. Worktree removal and branch
 * deletion failures are logged but do not abort the sweep for other branches.
 *
 * @summary Tests for cleanupMergedBranches cleanup step ordering
 */

import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import type { BranchInfo } from '@cards/sdk/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn()
}));

vi.mock('@cards/sdk/worktree', () => ({
  createWorktree: vi.fn(),
  checkWorktreeExists: vi.fn(),
  findGitRoots: vi.fn()
}));

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-1234')
}));

const originalFetch = globalThis.fetch;

beforeEach(async () => {
  vi.clearAllMocks();

  const { readFile } = await import('node:fs/promises');
  const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  vi.mocked(readFile).mockRejectedValue(enoent);

  const { createWorktree, checkWorktreeExists, findGitRoots } = await import('@cards/sdk/worktree');
  vi.mocked(findGitRoots).mockResolvedValue({ sourceRoot: '/test/workspace', repoRoot: '/test/workspace' });
  vi.mocked(checkWorktreeExists).mockResolvedValue(false);
  vi.mocked(createWorktree).mockResolvedValue({
    branch: 'cards/card-123/1',
    worktree: '/test/workspace/.worktrees/cards/card-123/1',
    baseSha: 'abc123'
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

describe('cleanupMergedBranches — cleanup steps run independently', () => {
  it('skips removeBranch when git branch -d fails', async () => {
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { CardsClient } = await import('@cards/sdk/client');
    const { execFile } = await import('node:child_process');

    const branch: BranchInfo = {
      name: 'cards/card-123/1',
      worktree: '/test/workspace/.worktrees/cards/card-123/1',
      parentBranch: 'main',
      addedAt: '2025-01-01T00:00:00Z',
      exists: true
    };

    // merge-base succeeds (branch is merged), worktree remove succeeds,
    // but git branch -d FAILS
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1];
      const cmd = args[0] as string;
      const cmdArgs = args[1] as string[];
      const key = `${cmd} ${cmdArgs.join(' ')}`;

      if (typeof cb === 'function') {
        if (key.includes('merge-base --is-ancestor')) {
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

    const fetchCalls: Array<{ url: string; method: string }> = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      const method = opts?.method ?? 'GET';
      fetchCalls.push({ url, method });

      if (typeof url === 'string' && url.includes('/branches') && method === 'GET') {
        return Promise.resolve(
          new Response(JSON.stringify({ branches: [branch], commits: [], defaultBranch: 'main' }), { status: 200 })
        );
      }
      if (typeof url === 'string' && url.includes('/branches') && method === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
    await cleanupMergedBranches(baseInput(), client, createMockLogger());

    // When git branch -d fails the branch still exists locally, so the API
    // record must be preserved to keep local and remote state in sync.
    const deleteCall = fetchCalls.find((c) => c.method === 'DELETE');
    expect(deleteCall).toBeUndefined();
  });

  it('skips removeBranch when both worktree remove and branch -d fail', async () => {
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { CardsClient } = await import('@cards/sdk/client');
    const { execFile } = await import('node:child_process');

    const branch: BranchInfo = {
      name: 'cards/card-123/1',
      worktree: '/test/workspace/.worktrees/cards/card-123/1',
      parentBranch: 'main',
      addedAt: '2025-01-01T00:00:00Z',
      exists: true
    };

    // merge-base succeeds, but BOTH worktree remove and branch -d fail
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1];
      const cmd = args[0] as string;
      const cmdArgs = args[1] as string[];
      const key = `${cmd} ${cmdArgs.join(' ')}`;

      if (typeof cb === 'function') {
        if (key.includes('merge-base --is-ancestor')) {
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

    const fetchCalls: Array<{ url: string; method: string }> = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      const method = opts?.method ?? 'GET';
      fetchCalls.push({ url, method });

      if (typeof url === 'string' && url.includes('/branches') && method === 'GET') {
        return Promise.resolve(
          new Response(JSON.stringify({ branches: [branch], commits: [], defaultBranch: 'main' }), { status: 200 })
        );
      }
      if (typeof url === 'string' && url.includes('/branches') && method === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
    await cleanupMergedBranches(baseInput(), client, createMockLogger());

    // When git branch -d fails the branch still exists locally, so the API
    // record must be preserved to keep local and remote state in sync.
    const deleteCall = fetchCalls.find((c) => c.method === 'DELETE');
    expect(deleteCall).toBeUndefined();
  });

  it('calls removeBranch when git branch -d succeeds', async () => {
    const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
    const { CardsClient } = await import('@cards/sdk/client');
    const { execFile } = await import('node:child_process');

    const branch: BranchInfo = {
      name: 'cards/card-123/1',
      worktree: '/test/workspace/.worktrees/cards/card-123/1',
      parentBranch: 'main',
      addedAt: '2025-01-01T00:00:00Z',
      exists: true
    };

    // Everything succeeds
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') {
        cb(null, { stdout: '', stderr: '' });
      }
      return {} as ReturnType<typeof execFile>;
    });

    const fetchCalls: Array<{ url: string; method: string }> = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      const method = opts?.method ?? 'GET';
      fetchCalls.push({ url, method });

      if (typeof url === 'string' && url.includes('/branches') && method === 'GET') {
        return Promise.resolve(
          new Response(JSON.stringify({ branches: [branch], commits: [], defaultBranch: 'main' }), { status: 200 })
        );
      }
      if (typeof url === 'string' && url.includes('/branches') && method === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
    await cleanupMergedBranches(baseInput(), client, createMockLogger());

    // When branch -d succeeds, removeBranch SHOULD be called
    const deleteCall = fetchCalls.find((c) => c.method === 'DELETE');
    expect(deleteCall).toBeDefined();
  });
});
