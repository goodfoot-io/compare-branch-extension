import * as path from 'node:path';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import type { BranchInfo } from '@cards/sdk/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for the shared claude-session utilities.
 *
 * Covers plugin settings construction, CLI arg building, worktree lifecycle
 * management, and branch cleanup. Uses the same mocking patterns as the
 * existing action tests.
 *
 * @summary Tests for shared claude-session utilities
 */

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn()
}));

vi.mock('../src/lib/create-worktree.js', () => ({
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

  // Default: resolveBaseBranch → 'main'
  const { execFile } = await import('node:child_process');
  vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
    const cb = args[args.length - 1];
    const cmd = args[0] as string;
    const cmdArgs = args[1] as string[];
    const key = `${cmd} ${cmdArgs.join(' ')}`;

    if (typeof cb === 'function') {
      if (key.startsWith('git rev-parse --abbrev-ref HEAD')) {
        cb(null, { stdout: 'main\n', stderr: '' });
      } else {
        cb(new Error(`mock: unhandled command: ${key}`));
      }
    }
    return {} as ReturnType<typeof execFile>;
  });

  // Default: no existing branches
  globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
      return Promise.resolve(new Response(JSON.stringify({ branches: [] }), { status: 200 }));
    }
    if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'POST') {
      return Promise.resolve(new Response(JSON.stringify({}), { status: 201 }));
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  });

  const { createWorktree, checkWorktreeExists, findGitRoots } = await import('../src/lib/create-worktree.js');
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
    workspacePath: '/test/workspace',
    cardRepoPath: '/test/repo',
    ...overrides
  };
}

/**
 * Configures execFile mock to handle specific git commands.
 * @param handlers - Map of command strings to their mock stdout/stderr responses.
 */
async function configureExecFile(handlers: Record<string, { stdout: string; stderr?: string }>): Promise<void> {
  const { execFile } = await import('node:child_process');
  vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
    const cb = args[args.length - 1];
    const cmd = args[0] as string;
    const cmdArgs = args[1] as string[];
    const key = `${cmd} ${cmdArgs.join(' ')}`;

    if (typeof cb === 'function') {
      for (const [pattern, result] of Object.entries(handlers)) {
        if (key.startsWith(pattern) || key.includes(pattern)) {
          cb(null, { stdout: result.stdout, stderr: result.stderr ?? '' });
          return {} as ReturnType<typeof execFile>;
        }
      }
      cb(new Error(`mock: unhandled command: ${key}`));
    }
    return {} as ReturnType<typeof execFile>;
  });
}

function configureBranchesResponse(branches: BranchInfo[]): void {
  globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
      return Promise.resolve(new Response(JSON.stringify({ branches }), { status: 200 }));
    }
    if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'POST') {
      return Promise.resolve(new Response(JSON.stringify({}), { status: 201 }));
    }
    if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'DELETE') {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  });
}

describe('claude-session shared utilities', () => {
  describe('buildPluginSettings', () => {
    it('returns JSON with enabledPlugins[runtime@cards.management] set to true', async () => {
      const { buildPluginSettings } = await import('../src/lib/claude-session.js');
      const result = JSON.parse(buildPluginSettings('/some/worktree'));
      expect(result.enabledPlugins['runtime@cards.management']).toBe(true);
    });

    it('includes marketplace source path as path.join(worktreePath, public)', async () => {
      const { buildPluginSettings } = await import('../src/lib/claude-session.js');
      const worktreePath = '/some/worktree';
      const result = JSON.parse(buildPluginSettings(worktreePath));
      expect(result.extraKnownMarketplaces['cards.management'].source).toEqual({
        source: 'directory',
        path: path.join(worktreePath, 'public')
      });
    });
  });

  describe('buildArgs', () => {
    it('includes --session-id for new sessions', async () => {
      const { buildArgs } = await import('../src/lib/claude-session.js');
      const args = buildArgs('my prompt', 'session-abc', false, 'interactive', '/card/repo', '/worktree');
      expect(args).toContain('--session-id');
      expect(args).toContain('session-abc');
    });

    it('includes --resume for resumed sessions and omits --session-id', async () => {
      const { buildArgs } = await import('../src/lib/claude-session.js');
      const args = buildArgs('my prompt', 'session-abc', true, 'interactive', '/card/repo', '/worktree');
      expect(args).toContain('--resume');
      expect(args).toContain('session-abc');
      expect(args).not.toContain('--session-id');
    });

    it('excludes --print in interactive mode', async () => {
      const { buildArgs } = await import('../src/lib/claude-session.js');
      const args = buildArgs('my prompt', 'session-abc', false, 'interactive', '/card/repo', '/worktree');
      expect(args).not.toContain('--print');
    });

    it('includes --print in background mode', async () => {
      const { buildArgs } = await import('../src/lib/claude-session.js');
      const args = buildArgs('my prompt', 'session-abc', false, 'background', '/card/repo', '/worktree');
      expect(args).toContain('--print');
    });

    it('includes --settings and --add-dir', async () => {
      const { buildArgs } = await import('../src/lib/claude-session.js');
      const args = buildArgs('my prompt', 'session-abc', false, 'interactive', '/card/repo', '/worktree');
      expect(args).toContain('--settings');
      expect(args).toContain('--add-dir');
      expect(args).toContain('/card/repo');
    });
  });

  describe('resolveBaseBranch', () => {
    it('returns trimmed branch name', async () => {
      const { resolveBaseBranch } = await import('../src/lib/claude-session.js');
      await configureExecFile({
        'git rev-parse --abbrev-ref HEAD': { stdout: 'main\n' }
      });
      const result = await resolveBaseBranch('/test/workspace');
      expect(result).toBe('main');
    });

    it('propagates git errors', async () => {
      const { resolveBaseBranch } = await import('../src/lib/claude-session.js');
      const { execFile } = await import('node:child_process');
      vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        const cb = args[args.length - 1];
        if (typeof cb === 'function') cb(new Error('not a git repo'));
        return {} as ReturnType<typeof execFile>;
      });
      await expect(resolveBaseBranch('/not/a/repo')).rejects.toThrow('not a git repo');
    });
  });

  describe('resolveOrCreateWorktree', () => {
    it('reuses existing branch with valid worktree on disk', async () => {
      const { resolveOrCreateWorktree } = await import('../src/lib/claude-session.js');
      const { CardsClient } = await import('@cards/sdk/client');
      const { access } = await import('node:fs/promises');
      const { createWorktree } = await import('../src/lib/create-worktree.js');

      configureBranchesResponse([
        {
          name: 'cards/card-123/1',
          worktree: '/test/workspace/.worktrees/cards/card-123/1',
          parentBranch: 'main',
          addedAt: '2025-01-01T00:00:00Z',
          exists: true
        }
      ]);

      vi.mocked(access).mockResolvedValue(undefined);

      const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
      const result = await resolveOrCreateWorktree(baseInput(), client, 'main', createMockLogger());

      expect(result.worktreePath).toBe('/test/workspace/.worktrees/cards/card-123/1');
      expect(result.branchName).toBe('cards/card-123/1');
      expect(result.parentBranch).toBe('main');
      expect(createWorktree).not.toHaveBeenCalled();
    });

    it('creates new worktree when no branches exist', async () => {
      const { resolveOrCreateWorktree } = await import('../src/lib/claude-session.js');
      const { CardsClient } = await import('@cards/sdk/client');
      const { createWorktree } = await import('../src/lib/create-worktree.js');

      configureBranchesResponse([]);

      const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
      const result = await resolveOrCreateWorktree(baseInput(), client, 'main', createMockLogger());

      expect(createWorktree).toHaveBeenCalledWith('cards/card-123/1', { cwd: '/test/workspace' });
      expect(result.worktreePath).toBe('/test/workspace/.worktrees/cards/card-123/1');
      expect(result.branchName).toBe('cards/card-123/1');
      expect(result.parentBranch).toBe('main');
    });

    it('skips occupied git slots when API and git are out of sync', async () => {
      const { resolveOrCreateWorktree } = await import('../src/lib/claude-session.js');
      const { CardsClient } = await import('@cards/sdk/client');
      const { createWorktree, checkWorktreeExists } = await import('../src/lib/create-worktree.js');

      configureBranchesResponse([]);

      // Git has slot 1 occupied; slot 2 is free
      vi.mocked(checkWorktreeExists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      vi.mocked(createWorktree).mockResolvedValue({
        branch: 'cards/card-123/2',
        worktree: '/test/workspace/.worktrees/cards/card-123/2',
        baseSha: 'abc123'
      });

      const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
      const result = await resolveOrCreateWorktree(baseInput(), client, 'main', createMockLogger());

      expect(createWorktree).toHaveBeenCalledWith('cards/card-123/2', { cwd: '/test/workspace' });
      expect(result.branchName).toBe('cards/card-123/2');
    });

    it('creates new worktree when existing path is missing from disk', async () => {
      const { resolveOrCreateWorktree } = await import('../src/lib/claude-session.js');
      const { CardsClient } = await import('@cards/sdk/client');
      const { createWorktree } = await import('../src/lib/create-worktree.js');
      const { access } = await import('node:fs/promises');

      configureBranchesResponse([
        {
          name: 'cards/card-123/1',
          worktree: '/nonexistent/worktree',
          parentBranch: 'main',
          addedAt: '2025-01-01T00:00:00Z',
          exists: true
        }
      ]);

      // fs.access rejects — path doesn't exist on disk
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

      vi.mocked(createWorktree).mockResolvedValue({
        branch: 'cards/card-123/2',
        worktree: '/test/workspace/.worktrees/cards/card-123/2',
        baseSha: 'abc123'
      });

      const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
      const result = await resolveOrCreateWorktree(baseInput(), client, 'main', createMockLogger());

      expect(createWorktree).toHaveBeenCalledWith('cards/card-123/2', { cwd: '/test/workspace' });
      expect(result.worktreePath).toBe('/test/workspace/.worktrees/cards/card-123/2');
    });
  });

  describe('cleanupMergedBranches', () => {
    it('removes fully merged branches (worktree, ref, and API record)', async () => {
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

      configureBranchesResponse([branch]);

      // merge-base succeeds (branch IS merged), worktree remove and branch delete succeed
      vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        const cb = args[args.length - 1];
        if (typeof cb === 'function') cb(null, { stdout: '', stderr: '' });
        return {} as ReturnType<typeof execFile>;
      });

      const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
          return Promise.resolve(new Response(JSON.stringify({ branches: [branch] }), { status: 200 }));
        }
        if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'DELETE') {
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      });
      globalThis.fetch = fetchMock;

      const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
      await cleanupMergedBranches(baseInput(), client, 'main', createMockLogger());

      const execCalls = vi.mocked(execFile).mock.calls;
      const worktreeRemoveCall = execCalls.find(
        (c) => (c[1] as string[])?.includes('worktree') && (c[1] as string[])?.includes('remove')
      );
      expect(worktreeRemoveCall).toBeDefined();

      const branchDeleteCall = execCalls.find(
        (c) => (c[1] as string[])?.includes('branch') && (c[1] as string[])?.includes('-d')
      );
      expect(branchDeleteCall).toBeDefined();

      const deleteCall = fetchMock.mock.calls.find(
        (c: unknown[]) => (c[1] as RequestInit)?.method === 'DELETE' && (c[0] as string).includes('/branches/')
      );
      expect(deleteCall).toBeDefined();
    });

    it('skips unmerged branches', async () => {
      const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
      const { CardsClient } = await import('@cards/sdk/client');
      const { execFile } = await import('node:child_process');

      configureBranchesResponse([
        {
          name: 'cards/card-123/1',
          worktree: '/test/workspace/.worktrees/cards/card-123/1',
          parentBranch: 'main',
          addedAt: '2025-01-01T00:00:00Z',
          exists: true
        }
      ]);

      // merge-base fails → branch not merged
      vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        const cb = args[args.length - 1];
        if (typeof cb === 'function') cb(new Error('exit code 1'));
        return {} as ReturnType<typeof execFile>;
      });

      const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
      await cleanupMergedBranches(baseInput(), client, 'main', createMockLogger());

      const execCalls = vi.mocked(execFile).mock.calls;
      const worktreeRemoveCall = execCalls.find(
        (c) => (c[1] as string[])?.includes('worktree') && (c[1] as string[])?.includes('remove')
      );
      expect(worktreeRemoveCall).toBeUndefined();

      const branchDeleteCall = execCalls.find(
        (c) => (c[1] as string[])?.includes('branch') && (c[1] as string[])?.includes('-d')
      );
      expect(branchDeleteCall).toBeUndefined();
    });

    it('continues cleanup when individual operations fail (partial failure)', async () => {
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

      configureBranchesResponse([branch]);

      // merge-base succeeds but worktree remove fails; branch delete succeeds
      vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        const cb = args[args.length - 1];
        const cmd = args[0] as string;
        const cmdArgs = args[1] as string[];
        const key = `${cmd} ${cmdArgs.join(' ')}`;

        if (typeof cb === 'function') {
          if (key.includes('merge-base --is-ancestor')) {
            cb(null, { stdout: '', stderr: '' }); // merged
          } else if (key.includes('worktree remove')) {
            cb(new Error('cannot remove worktree'));
          } else {
            cb(null, { stdout: '', stderr: '' }); // branch -d and others succeed
          }
        }
        return {} as ReturnType<typeof execFile>;
      });

      const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
          return Promise.resolve(new Response(JSON.stringify({ branches: [branch] }), { status: 200 }));
        }
        if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'DELETE') {
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      });
      globalThis.fetch = fetchMock;

      const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });

      // Should not throw even though worktree remove failed
      await expect(cleanupMergedBranches(baseInput(), client, 'main', createMockLogger())).resolves.toBeUndefined();

      // branch -d should still have been called despite worktree remove failure
      const execCalls = vi.mocked(execFile).mock.calls;
      const branchDeleteCall = execCalls.find(
        (c) => (c[1] as string[])?.includes('branch') && (c[1] as string[])?.includes('-d')
      );
      expect(branchDeleteCall).toBeDefined();
    });
  });

  describe('errorMessage', () => {
    it('extracts Error.message', async () => {
      const { errorMessage } = await import('../src/lib/claude-session.js');
      const err = new Error('something failed');
      expect(errorMessage(err)).toBe('something failed');
    });

    it('stringifies non-Error values', async () => {
      const { errorMessage } = await import('../src/lib/claude-session.js');
      expect(errorMessage('plain string')).toBe('plain string');
      expect(errorMessage(42)).toBe('42');
      expect(errorMessage(null)).toBe('null');
    });
  });
});
