import type { ChildProcess } from 'node:child_process';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import { flushMicrotasks } from '@cards/test-utils';
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

  // Enable discovery test mode so createCardsClient() returns a client without
  // a real cards-api.json file on disk.
  process.env['API_TEST_MODE'] = '1';

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
      return Promise.resolve(
        new Response(JSON.stringify({ branches: [], commits: [], defaultBranch: 'main' }), { status: 200 })
      );
    }
    if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'POST') {
      return Promise.resolve(new Response(JSON.stringify({}), { status: 201 }));
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  });

  const { createWorktree, checkWorktreeExists, findGitRoots } = await import('@cards/sdk/worktree');
  vi.mocked(findGitRoots).mockResolvedValue({ sourceRoot: '/test/workspace', repoRoot: '/test/workspace' });
  vi.mocked(checkWorktreeExists).mockResolvedValue(false);
  vi.mocked(createWorktree).mockResolvedValue({
    path: '/test/workspace/.worktrees/cards/card-123/1',
    settle: Promise.resolve({
      branch: 'cards/card-123/1',
      worktree: '/test/workspace/.worktrees/cards/card-123/1',
      baseSha: 'abc123'
    })
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env['API_TEST_MODE'];
});

function createMockLogger(): ActionContext['logger'] {
  return new Logger();
}

function createMockContext(): ActionContext {
  return {
    logger: new Logger(),
    cwd: process.cwd(),
    onCancel: vi.fn(),
    onSwitchToInteractive: vi.fn()
  };
}

function createMockChild(overrides?: Partial<ChildProcess>): ChildProcess {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    pid: 12345,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers.set(event, cb);
    }),
    kill: vi.fn(),
    stdout: null,
    stderr: null,
    emit(event: string, ...args: unknown[]) {
      handlers.get(event)?.(...args);
      return true;
    },
    ...overrides
  } as unknown as ChildProcess;
}

function baseInput(overrides?: Partial<ActionInput>): ActionInput {
  return {
    cardId: 'card-123',
    actionName: 'Launch',
    environment: 'default',
    executionMode: 'interactive',
    repoRoot: '/test/workspace',
    cardRepoPath: '/test/repo',
    configPath: '/test/config',
    extensionPath: '/test/extension',
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

function configureBranchesResponse(
  branches: Array<{ name: string; worktree?: string; parentBranch: string; addedAt: string; exists?: boolean }>
): void {
  globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
      return Promise.resolve(
        new Response(JSON.stringify({ branches, commits: [], defaultBranch: 'main' }), { status: 200 })
      );
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
  describe('buildArgs', () => {
    it('includes --session-id for new sessions', async () => {
      const { buildArgs } = await import('../src/lib/claude-session.js');
      const args = buildArgs('my prompt', 'session-abc', false, 'interactive', '/card/repo', '/ext/path');
      expect(args).toContain('--session-id');
      expect(args).toContain('session-abc');
    });

    it('includes --resume for resumed sessions and omits --session-id', async () => {
      const { buildArgs } = await import('../src/lib/claude-session.js');
      const args = buildArgs('my prompt', 'session-abc', true, 'interactive', '/card/repo', '/ext/path');
      expect(args).toContain('--resume');
      expect(args).toContain('session-abc');
      expect(args).not.toContain('--session-id');
    });

    it('excludes --print in interactive mode', async () => {
      const { buildArgs } = await import('../src/lib/claude-session.js');
      const args = buildArgs('my prompt', 'session-abc', false, 'interactive', '/card/repo', '/ext/path');
      expect(args).not.toContain('--print');
    });

    it('includes --print in background mode', async () => {
      const { buildArgs } = await import('../src/lib/claude-session.js');
      const args = buildArgs('my prompt', 'session-abc', false, 'background', '/card/repo', '/ext/path');
      expect(args).toContain('--print');
    });

    it('omits prompt from args when undefined', async () => {
      const { buildArgs } = await import('../src/lib/claude-session.js');
      const args = buildArgs(undefined, 'session-abc', false, 'interactive', '/card/repo', '/ext/path');
      expect(args).toContain('--session-id');
      expect(args).toContain('session-abc');
      // First arg should be a flag, not a prompt string
      expect(args[0]).toBe('--session-id');
    });

    it('includes --settings, --add-dir, and --channels', async () => {
      const { buildArgs, buildPluginSettings } = await import('../src/lib/claude-session.js');
      const args = buildArgs('my prompt', 'session-abc', false, 'interactive', '/card/repo', '/ext/marketplace');
      expect(args).toContain('--settings');
      expect(args).toContain(buildPluginSettings('/ext/marketplace'));
      expect(args).not.toContain('--plugin-dir');
      expect(args).toContain('--add-dir');
      expect(args).toContain('/card/repo');
      // expect(args).toContain('--dangerously-load-development-channels');
      // expect(args).toContain('plugin:runtime@cards.management');
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

    it('falls back to card-level parentBranch when branch records are absent', async () => {
      const { resolveBaseBranch } = await import('../src/lib/claude-session.js');
      const { CardsClient } = await import('@cards/sdk/client');

      await configureExecFile({
        'git rev-parse --abbrev-ref HEAD': { stdout: 'cards/card-123/1\n' }
      });

      // getBranches returns no records for this branch
      globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
          return Promise.resolve(
            new Response(JSON.stringify({ branches: [], commits: [], defaultBranch: 'main' }), { status: 200 })
          );
        }
        if (typeof url === 'string' && url.includes('/cards/card-123') && (!opts?.method || opts.method === 'GET')) {
          return Promise.resolve(
            new Response(JSON.stringify({ id: 'card-123', title: 'Test', parentBranch: 'main' }), { status: 200 })
          );
        }
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      });

      const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
      const result = await resolveBaseBranch('/test/workspace', client);
      expect(result).toBe('main');
    });

    it('rejects card-level parentBranch that is itself a cards/* branch', async () => {
      const { resolveBaseBranch } = await import('../src/lib/claude-session.js');
      const { CardsClient } = await import('@cards/sdk/client');

      await configureExecFile({
        'git rev-parse --abbrev-ref HEAD': { stdout: 'cards/card-123/1\n' }
      });

      globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
          return Promise.resolve(
            new Response(JSON.stringify({ branches: [], commits: [], defaultBranch: 'main' }), { status: 200 })
          );
        }
        if (typeof url === 'string' && url.includes('/cards/card-123') && (!opts?.method || opts.method === 'GET')) {
          return Promise.resolve(
            new Response(JSON.stringify({ id: 'card-123', title: 'Test', parentBranch: 'cards/other-card/1' }), {
              status: 200
            })
          );
        }
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      });

      const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
      await expect(resolveBaseBranch('/test/workspace', client)).rejects.toThrow(
        'Card branch "cards/card-123/1" has no parentBranch record.'
      );
    });

    it('throws when getCard API call fails and branch records are absent', async () => {
      const { resolveBaseBranch } = await import('../src/lib/claude-session.js');
      const { CardsClient } = await import('@cards/sdk/client');

      await configureExecFile({
        'git rev-parse --abbrev-ref HEAD': { stdout: 'cards/card-123/1\n' }
      });

      globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
          return Promise.resolve(
            new Response(JSON.stringify({ branches: [], commits: [], defaultBranch: 'main' }), { status: 200 })
          );
        }
        if (typeof url === 'string' && url.includes('/cards/card-123') && (!opts?.method || opts.method === 'GET')) {
          return Promise.resolve(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }));
        }
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      });

      const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
      await expect(resolveBaseBranch('/test/workspace', client)).rejects.toThrow(
        'Card branch "cards/card-123/1" has no parentBranch record.'
      );
    });
  });

  describe('resolveOrCreateWorktree', () => {
    it('reuses existing branch with valid worktree on disk', async () => {
      const { resolveOrCreateWorktree } = await import('../src/lib/claude-session.js');
      const { CardsClient } = await import('@cards/sdk/client');
      const { access } = await import('node:fs/promises');
      const { createWorktree } = await import('@cards/sdk/worktree');

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
      const { createWorktree } = await import('@cards/sdk/worktree');

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
      const { createWorktree, checkWorktreeExists } = await import('@cards/sdk/worktree');

      configureBranchesResponse([]);

      // Git has slot 1 occupied; slot 2 is free
      vi.mocked(checkWorktreeExists).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      vi.mocked(createWorktree).mockResolvedValue({
        path: '/test/workspace/.worktrees/cards/card-123/2',
        settle: Promise.resolve({
          branch: 'cards/card-123/2',
          worktree: '/test/workspace/.worktrees/cards/card-123/2',
          baseSha: 'abc123'
        })
      });

      const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
      const result = await resolveOrCreateWorktree(baseInput(), client, 'main', createMockLogger());

      expect(createWorktree).toHaveBeenCalledWith('cards/card-123/2', { cwd: '/test/workspace' });
      expect(result.branchName).toBe('cards/card-123/2');
    });

    it('reattaches worktree for existing branch when worktree is missing from disk', async () => {
      const { resolveOrCreateWorktree } = await import('../src/lib/claude-session.js');
      const { CardsClient } = await import('@cards/sdk/client');
      const { createWorktree } = await import('@cards/sdk/worktree');
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

      // fs.access rejects — worktree path doesn't exist on disk
      vi.mocked(access).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      vi.mocked(createWorktree).mockResolvedValue({
        path: '/test/workspace/.worktrees/cards/card-123/1',
        settle: Promise.resolve({
          branch: 'cards/card-123/1',
          worktree: '/test/workspace/.worktrees/cards/card-123/1',
          baseSha: 'abc123'
        })
      });

      const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'test-token' });
      const result = await resolveOrCreateWorktree(baseInput(), client, 'main', createMockLogger());

      // Should reattach the existing branch, not create a new one
      expect(createWorktree).toHaveBeenCalledWith('cards/card-123/1', { cwd: '/test/workspace' });
      expect(result.worktreePath).toBe('/test/workspace/.worktrees/cards/card-123/1');
      expect(result.branchName).toBe('cards/card-123/1');
      expect(result.parentBranch).toBe('main');
    });
  });

  describe('cleanupMergedBranches', () => {
    async function configureBranchesFile(
      branches: Record<string, { worktree?: string; parentBranch: string; addedAt: string }>
    ): Promise<void> {
      const { readFile } = await import('node:fs/promises');
      vi.mocked(readFile).mockImplementation((filePath: unknown) => {
        const p = String(filePath);
        if (p.endsWith('workspace-branches.json')) {
          return Promise.resolve(JSON.stringify(branches, null, 2));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });
    }

    it('removes fully merged branches (worktree, ref, and branch record)', async () => {
      const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
      const { execFile } = await import('node:child_process');
      const { writeFile } = await import('node:fs/promises');

      await configureBranchesFile({
        'cards/card-123/1': {
          worktree: '/test/workspace/.worktrees/cards/card-123/1',
          parentBranch: 'main',
          addedAt: '2025-01-01T00:00:00Z'
        }
      });

      // All git commands succeed; branch --list returns the branch
      vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        const cb = args[args.length - 1];
        const cmdArgs = args[1] as string[];
        if (typeof cb === 'function') {
          if (cmdArgs?.includes('--list')) {
            cb(null, { stdout: '  cards/card-123/1\n', stderr: '' });
          } else {
            cb(null, { stdout: '', stderr: '' });
          }
        }
        return {} as ReturnType<typeof execFile>;
      });

      await cleanupMergedBranches(baseInput(), '/test/repo', createMockLogger());

      const execCalls = vi.mocked(execFile).mock.calls;

      // Verify merge-base check uses the branch's parentBranch
      const mergeBaseCall = execCalls.find(
        (c) => (c[1] as string[])?.includes('merge-base') && (c[1] as string[])?.includes('--is-ancestor')
      );
      expect(mergeBaseCall).toBeDefined();
      expect(mergeBaseCall![1] as string[]).toContain('main');
      expect(mergeBaseCall![1] as string[]).toContain('cards/card-123/1');

      const worktreeRemoveCall = execCalls.find(
        (c) => (c[1] as string[])?.includes('worktree') && (c[1] as string[])?.includes('remove')
      );
      expect(worktreeRemoveCall).toBeDefined();

      const branchDeleteCall = execCalls.find(
        (c) => (c[1] as string[])?.includes('branch') && (c[1] as string[])?.includes('-d')
      );
      expect(branchDeleteCall).toBeDefined();

      // Verify workspace-branches.json was written without the branch
      expect(vi.mocked(writeFile)).toHaveBeenCalled();
    });

    it('checks each branch against its own parentBranch, not workspace HEAD', async () => {
      const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
      const { execFile } = await import('node:child_process');

      await configureBranchesFile({
        'cards/card-123/1': {
          worktree: '/test/workspace/.worktrees/cards/card-123/1',
          parentBranch: 'develop',
          addedAt: '2025-01-01T00:00:00Z'
        }
      });

      vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        const cb = args[args.length - 1];
        const cmdArgs = args[1] as string[];
        if (typeof cb === 'function') {
          if (cmdArgs?.includes('--list')) {
            cb(null, { stdout: '  cards/card-123/1\n', stderr: '' });
          } else if (cmdArgs?.includes('merge-base')) {
            cb(new Error('exit code 1'));
          } else {
            cb(null, { stdout: '', stderr: '' });
          }
        }
        return {} as ReturnType<typeof execFile>;
      });

      await cleanupMergedBranches(baseInput(), '/test/repo', createMockLogger());

      const execCalls = vi.mocked(execFile).mock.calls;
      const mergeBaseCall = execCalls.find(
        (c) => (c[1] as string[])?.includes('merge-base') && (c[1] as string[])?.includes('--is-ancestor')
      );
      expect(mergeBaseCall).toBeDefined();
      expect(mergeBaseCall![1] as string[]).toContain('develop');
    });

    it('skips unmerged branches', async () => {
      const { cleanupMergedBranches } = await import('../src/lib/claude-session.js');
      const { execFile } = await import('node:child_process');

      await configureBranchesFile({
        'cards/card-123/1': {
          worktree: '/test/workspace/.worktrees/cards/card-123/1',
          parentBranch: 'main',
          addedAt: '2025-01-01T00:00:00Z'
        }
      });

      vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        const cb = args[args.length - 1];
        const cmdArgs = args[1] as string[];
        if (typeof cb === 'function') {
          if (cmdArgs?.includes('--list')) {
            cb(null, { stdout: '  cards/card-123/1\n', stderr: '' });
          } else {
            cb(new Error('exit code 1'));
          }
        }
        return {} as ReturnType<typeof execFile>;
      });

      await cleanupMergedBranches(baseInput(), '/test/repo', createMockLogger());

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
      const { execFile } = await import('node:child_process');

      await configureBranchesFile({
        'cards/card-123/1': {
          worktree: '/test/workspace/.worktrees/cards/card-123/1',
          parentBranch: 'main',
          addedAt: '2025-01-01T00:00:00Z'
        }
      });

      // merge-base succeeds but worktree remove fails; branch delete succeeds
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
            cb(new Error('cannot remove worktree'));
          } else {
            cb(null, { stdout: '', stderr: '' });
          }
        }
        return {} as ReturnType<typeof execFile>;
      });

      await expect(cleanupMergedBranches(baseInput(), '/test/repo', createMockLogger())).resolves.toBeUndefined();

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

  describe('resolveMarketplacePath', () => {
    it('returns marketplace path from EXTENSION_PATH', async () => {
      const { resolveMarketplacePath } = await import('../src/lib/claude-session.js');
      process.env['EXTENSION_PATH'] = '/home/user/.vscode/extensions/cards-1.0.0';
      try {
        expect(resolveMarketplacePath()).toBe('/home/user/.vscode/extensions/cards-1.0.0/dist/marketplace');
      } finally {
        delete process.env['EXTENSION_PATH'];
      }
    });

    it('throws when EXTENSION_PATH is not set', async () => {
      const { resolveMarketplacePath } = await import('../src/lib/claude-session.js');
      const saved = process.env['EXTENSION_PATH'];
      delete process.env['EXTENSION_PATH'];
      try {
        expect(() => resolveMarketplacePath()).toThrow('Missing required environment variable');
      } finally {
        if (saved !== undefined) process.env['EXTENSION_PATH'] = saved;
      }
    });
  });

  describe('buildPluginSettings', () => {
    it('produces JSON with marketplace directory source', async () => {
      const { buildPluginSettings } = await import('../src/lib/claude-session.js');
      const settings = JSON.parse(buildPluginSettings('/ext/dist/marketplace'));
      expect(settings.enabledPlugins).toEqual({ 'runtime@cards.management': true });
      expect(settings.extraKnownMarketplaces['cards.management'].source).toEqual({
        source: 'directory',
        path: '/ext/dist/marketplace'
      });
    });
  });

  describe('resolveClaudeConfigDir', () => {
    it('returns CLAUDE_CONFIG_DIR when set and has plugins/', async () => {
      const { resolveClaudeConfigDir } = await import('../src/lib/claude-session.js');
      const { access } = await import('node:fs/promises');
      vi.mocked(access).mockResolvedValueOnce(undefined);

      const saved = process.env['CLAUDE_CONFIG_DIR'];
      process.env['CLAUDE_CONFIG_DIR'] = '/custom/claude';
      try {
        const result = await resolveClaudeConfigDir();
        expect(result).toBe('/custom/claude');
        expect(access).toHaveBeenCalledWith('/custom/claude/plugins');
      } finally {
        if (saved !== undefined) process.env['CLAUDE_CONFIG_DIR'] = saved;
        else delete process.env['CLAUDE_CONFIG_DIR'];
      }
    });

    it('falls through to ~/.claude when earlier candidates lack plugins/', async () => {
      const { resolveClaudeConfigDir } = await import('../src/lib/claude-session.js');
      const { access } = await import('node:fs/promises');
      // Reject all candidates until the last one
      const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      vi.mocked(access).mockRejectedValue(enoent);
      // Allow the last candidate (~/.claude/plugins)
      vi.mocked(access).mockRejectedValueOnce(enoent); // ~/.config/claude/plugins
      vi.mocked(access).mockResolvedValueOnce(undefined); // ~/.claude/plugins

      const saved = process.env['CLAUDE_CONFIG_DIR'];
      delete process.env['CLAUDE_CONFIG_DIR'];
      const savedXdg = process.env['XDG_DATA_HOME'];
      delete process.env['XDG_DATA_HOME'];
      const savedXdgConfig = process.env['XDG_CONFIG_HOME'];
      delete process.env['XDG_CONFIG_HOME'];
      try {
        const result = await resolveClaudeConfigDir();
        expect(result).toMatch(/\.claude$/);
      } finally {
        if (saved !== undefined) process.env['CLAUDE_CONFIG_DIR'] = saved;
        if (savedXdg !== undefined) process.env['XDG_DATA_HOME'] = savedXdg;
        if (savedXdgConfig !== undefined) process.env['XDG_CONFIG_HOME'] = savedXdgConfig;
      }
    });

    it('returns null when no candidates exist', async () => {
      const { resolveClaudeConfigDir } = await import('../src/lib/claude-session.js');
      const { access } = await import('node:fs/promises');
      vi.mocked(access).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const saved = process.env['CLAUDE_CONFIG_DIR'];
      delete process.env['CLAUDE_CONFIG_DIR'];
      const savedXdg = process.env['XDG_DATA_HOME'];
      delete process.env['XDG_DATA_HOME'];
      const savedXdgConfig = process.env['XDG_CONFIG_HOME'];
      delete process.env['XDG_CONFIG_HOME'];
      try {
        const result = await resolveClaudeConfigDir();
        expect(result).toBeNull();
      } finally {
        if (saved !== undefined) process.env['CLAUDE_CONFIG_DIR'] = saved;
        if (savedXdg !== undefined) process.env['XDG_DATA_HOME'] = savedXdg;
        if (savedXdgConfig !== undefined) process.env['XDG_CONFIG_HOME'] = savedXdgConfig;
      }
    });
  });

  describe('updateMarketplaceRegistration', () => {
    it('updates known_marketplaces.json when cards.management has stale path', async () => {
      const { updateMarketplaceRegistration } = await import('../src/lib/claude-session.js');
      const fsPromises = await import('node:fs/promises');

      const existing = {
        'cards.management': {
          source: { source: 'directory', path: 'public' },
          installLocation: 'public',
          lastUpdated: '2025-01-01T00:00:00Z'
        }
      };

      vi.mocked(fsPromises.access).mockResolvedValueOnce(undefined);
      vi.mocked(fsPromises.readFile).mockResolvedValueOnce(JSON.stringify(existing));
      vi.mocked(fsPromises.writeFile).mockResolvedValueOnce(undefined);

      const saved = process.env['CLAUDE_CONFIG_DIR'];
      process.env['CLAUDE_CONFIG_DIR'] = '/home/node/.claude';
      try {
        await updateMarketplaceRegistration('/ext/dist/marketplace', createMockLogger());
        expect(fsPromises.writeFile).toHaveBeenCalledTimes(1);
        const written = JSON.parse(vi.mocked(fsPromises.writeFile).mock.calls[0][1] as string);
        expect(written['cards.management'].source.path).toBe('/ext/dist/marketplace');
        expect(written['cards.management'].installLocation).toBe('/ext/dist/marketplace');
      } finally {
        if (saved !== undefined) process.env['CLAUDE_CONFIG_DIR'] = saved;
        else delete process.env['CLAUDE_CONFIG_DIR'];
      }
    });

    it('skips write when path already matches', async () => {
      const { updateMarketplaceRegistration } = await import('../src/lib/claude-session.js');
      const fsPromises = await import('node:fs/promises');

      const existing = {
        'cards.management': {
          source: { source: 'directory', path: '/ext/dist/marketplace' },
          installLocation: '/ext/dist/marketplace',
          lastUpdated: '2025-01-01T00:00:00Z'
        }
      };

      vi.mocked(fsPromises.access).mockResolvedValueOnce(undefined);
      vi.mocked(fsPromises.readFile).mockResolvedValueOnce(JSON.stringify(existing));

      const saved = process.env['CLAUDE_CONFIG_DIR'];
      process.env['CLAUDE_CONFIG_DIR'] = '/home/node/.claude';
      try {
        await updateMarketplaceRegistration('/ext/dist/marketplace', createMockLogger());
        expect(fsPromises.writeFile).not.toHaveBeenCalled();
      } finally {
        if (saved !== undefined) process.env['CLAUDE_CONFIG_DIR'] = saved;
        else delete process.env['CLAUDE_CONFIG_DIR'];
      }
    });

    it('skips when known_marketplaces.json does not exist', async () => {
      const { updateMarketplaceRegistration } = await import('../src/lib/claude-session.js');
      const fsPromises = await import('node:fs/promises');

      vi.mocked(fsPromises.access).mockResolvedValueOnce(undefined);
      const enoent = new Error('ENOENT') as Error & { code: string };
      enoent.code = 'ENOENT';
      vi.mocked(fsPromises.readFile).mockRejectedValueOnce(enoent);

      const saved = process.env['CLAUDE_CONFIG_DIR'];
      process.env['CLAUDE_CONFIG_DIR'] = '/home/node/.claude';
      try {
        await updateMarketplaceRegistration('/ext/dist/marketplace', createMockLogger());
        expect(fsPromises.writeFile).not.toHaveBeenCalled();
      } finally {
        if (saved !== undefined) process.env['CLAUDE_CONFIG_DIR'] = saved;
        else delete process.env['CLAUDE_CONFIG_DIR'];
      }
    });

    it('skips when cards.management entry uses non-directory source', async () => {
      const { updateMarketplaceRegistration } = await import('../src/lib/claude-session.js');
      const fsPromises = await import('node:fs/promises');

      const existing = {
        'cards.management': {
          source: { source: 'github', repo: 'some/repo' },
          installLocation: '/some/path'
        }
      };

      vi.mocked(fsPromises.access).mockResolvedValueOnce(undefined);
      vi.mocked(fsPromises.readFile).mockResolvedValueOnce(JSON.stringify(existing));

      const saved = process.env['CLAUDE_CONFIG_DIR'];
      process.env['CLAUDE_CONFIG_DIR'] = '/home/node/.claude';
      try {
        await updateMarketplaceRegistration('/ext/dist/marketplace', createMockLogger());
        expect(fsPromises.writeFile).not.toHaveBeenCalled();
      } finally {
        if (saved !== undefined) process.env['CLAUDE_CONFIG_DIR'] = saved;
        else delete process.env['CLAUDE_CONFIG_DIR'];
      }
    });
  });

  describe('spawnClaudeSession', () => {
    it('sets WORKSPACE_PATH to the worktree path, not the original workspace', async () => {
      const { spawn } = await import('node:child_process');
      const { spawnClaudeSession } = await import('../src/lib/claude-session.js');

      // Set EXTENSION_PATH for resolveMarketplacePath
      process.env['EXTENSION_PATH'] = '/test/extension';

      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const context = createMockContext();
      const promise = spawnClaudeSession(baseInput(), context, {
        prompt: 'test prompt',
        sessionId: 'session-123',
        resume: false,
        supportsSwitchToInteractive: false
      });
      await flushMicrotasks();

      const spawnOpts = vi.mocked(spawn).mock.calls[0]![2] as { env: Record<string, string>; cwd: string };
      // cwd and WORKSPACE_PATH must both be the worktree, not the original workspace
      expect(spawnOpts.cwd).toBe('/test/workspace/.worktrees/cards/card-123/1');
      expect(spawnOpts.env.WORKSPACE_PATH).toBe('/test/workspace/.worktrees/cards/card-123/1');

      child.emit('close', 0);
      await promise;
    });

    it('sets BASE_BRANCH, PARENT_BRANCH, and WORKSPACE_BRANCH', async () => {
      const { spawn } = await import('node:child_process');
      const { spawnClaudeSession } = await import('../src/lib/claude-session.js');

      process.env['EXTENSION_PATH'] = '/test/extension';

      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const context = createMockContext();
      const promise = spawnClaudeSession(baseInput(), context, {
        prompt: 'test prompt',
        sessionId: 'session-123',
        resume: false,
        supportsSwitchToInteractive: false
      });
      await flushMicrotasks();

      const spawnOpts = vi.mocked(spawn).mock.calls[0]![2] as { env: Record<string, string> };
      expect(spawnOpts.env.BASE_BRANCH).toBe('main');
      expect(spawnOpts.env.PARENT_BRANCH).toBe('main');
      expect(spawnOpts.env.WORKSPACE_BRANCH).toBe('cards/card-123/1');

      child.emit('close', 0);
      await promise;
    });

    it('registers onSwitchToInteractive when supportsSwitchToInteractive is true', async () => {
      const { spawn } = await import('node:child_process');
      const { spawnClaudeSession } = await import('../src/lib/claude-session.js');

      process.env['EXTENSION_PATH'] = '/test/extension';

      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const context = createMockContext();
      const promise = spawnClaudeSession(baseInput(), context, {
        prompt: 'test prompt',
        sessionId: 'session-123',
        resume: false,
        supportsSwitchToInteractive: true
      });
      await flushMicrotasks();

      expect(context.onSwitchToInteractive).toHaveBeenCalledWith(expect.any(Function));

      const switchCallback = vi.mocked(context.onSwitchToInteractive).mock.calls[0]![0] as () => unknown;
      const result = switchCallback();
      expect(result).toEqual({ sessionId: 'session-123' });

      child.emit('close', null);
      await promise;
    });

    it('does not register onSwitchToInteractive when supportsSwitchToInteractive is false', async () => {
      const { spawn } = await import('node:child_process');
      const { spawnClaudeSession } = await import('../src/lib/claude-session.js');

      process.env['EXTENSION_PATH'] = '/test/extension';

      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const context = createMockContext();
      const promise = spawnClaudeSession(baseInput(), context, {
        prompt: 'test prompt',
        sessionId: 'session-123',
        resume: false,
        supportsSwitchToInteractive: false
      });
      await flushMicrotasks();

      expect(context.onSwitchToInteractive).not.toHaveBeenCalled();

      child.emit('close', 0);
      await promise;
    });

    it('registers onCancel that kills the child process', async () => {
      const { spawn } = await import('node:child_process');
      const { spawnClaudeSession } = await import('../src/lib/claude-session.js');

      process.env['EXTENSION_PATH'] = '/test/extension';

      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const context = createMockContext();
      const promise = spawnClaudeSession(baseInput(), context, {
        prompt: 'test prompt',
        sessionId: 'session-123',
        resume: false,
        supportsSwitchToInteractive: false
      });
      await flushMicrotasks();

      expect(context.onCancel).toHaveBeenCalledWith(expect.any(Function));

      const cancelCallback = vi.mocked(context.onCancel).mock.calls[0]![0] as () => void;
      cancelCallback();
      expect(child.kill).toHaveBeenCalledWith('SIGTERM');

      child.emit('close', null);
      await promise;
    });
  });
});
