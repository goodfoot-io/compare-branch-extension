import type { ChildProcess } from 'node:child_process';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import type { BranchInfo } from '@cards/sdk/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Exercises the interview action behavior through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve
 * expected state transitions and output.
 *
 * @summary Tests interview action behavior
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

  // Default: worktree setup succeeds so all tests can call the action.
  // resolveBaseBranch → 'main', getBranches → [] (empty), createWorktree → default path.
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

  // Default: no existing branches → createWorktree is called
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
    /**
     * Emits a registered child-process event for test control flow.
     *
     * @param event Event name to emit.
     * @param args Event payload arguments.
     * @returns True to match EventEmitter-style emit behavior.
     */
    emit(event: string, ...args: unknown[]) {
      handlers.get(event)?.(...args);
      return true;
    },
    ...overrides
  } as unknown as ChildProcess;
}

/**
 * Flushes the microtask queue so that async operations (like worktree
 * setup) complete before test assertions run.
 */
async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function baseInput(overrides?: Partial<ActionInput>): ActionInput {
  return {
    cardId: 'card-123',
    actionName: 'Interview',
    environment: 'default',
    executionMode: 'interactive',
    apiBaseUrl: 'http://localhost:3000',
    apiAccessToken: 'test-token',
    workspacePath: '/test/workspace',
    cardRepoPath: '/test/repo',
    configPath: '/test/config',
    extensionPath: '/test/extension',
    ...overrides
  };
}

describe('Default Actions', () => {
  describe('interview', () => {
    it('exports action command with correct metadata', async () => {
      const action = (await import('../src/actions/interview.js')).default;
      expect(action.factoryType).toBe('action');
      expect(action.actionName).toBe('Interview');
    });

    it('spawns claude with stdio: inherit', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/interview.js')).default;
      const promise = action(baseInput(), createMockContext());
      await flushMicrotasks();

      const spawnOpts = vi.mocked(spawn).mock.calls[0][2] as { stdio: unknown };
      expect(spawnOpts.stdio).toBe('inherit');

      child.emit('close', 0);
      await promise;
    });

    it('prompt includes both runtime:card-repo and runtime:interview-routing', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/interview.js')).default;
      const promise = action(baseInput(), createMockContext());
      await flushMicrotasks();

      const args = vi.mocked(spawn).mock.calls[0][1] as string[];
      const prompt = args[0];
      expect(prompt).toContain('runtime:card-repo');
      expect(prompt).toContain('runtime:interview-routing');

      child.emit('close', 0);
      await promise;
    });

    it('does not include --print', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/interview.js')).default;
      const promise = action(baseInput(), createMockContext());
      await flushMicrotasks();

      const args = vi.mocked(spawn).mock.calls[0][1] as string[];
      expect(args).not.toContain('--print');

      child.emit('close', 0);
      await promise;
    });

    it('includes --plugin-dir pointing to extension bundled runtime plugin', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/interview.js')).default;
      const promise = action(baseInput(), createMockContext());
      await flushMicrotasks();

      const args = vi.mocked(spawn).mock.calls[0][1] as string[];
      expect(args).toContain('--plugin-dir');
      expect(args).toContain('/test/extension/dist/plugins/runtime');
      expect(args).not.toContain('--settings');

      child.emit('close', 0);
      await promise;
    });

    it('includes --add-dir with card repo path', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/interview.js')).default;
      const promise = action(baseInput(), createMockContext());
      await flushMicrotasks();

      const args = vi.mocked(spawn).mock.calls[0][1] as string[];
      const addDirIdx = args.indexOf('--add-dir');
      expect(addDirIdx).toBeGreaterThan(-1);
      expect(args[addDirIdx + 1]).toBe('/test/repo');

      child.emit('close', 0);
      await promise;
    });

    it('sets env vars', async () => {
      const { spawn } = await import('node:child_process');
      const { access } = await import('node:fs/promises');

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

      globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                branches: [
                  {
                    name: 'cards/card-123/1',
                    worktree: '/test/workspace/.worktrees/cards/card-123/1',
                    parentBranch: 'main',
                    addedAt: '2025-01-01T00:00:00Z',
                    exists: true
                  }
                ]
              }),
              { status: 200 }
            )
          );
        }
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      });

      vi.mocked(access).mockResolvedValue(undefined);

      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/interview.js')).default;
      const promise = action(baseInput(), createMockContext());
      await flushMicrotasks();

      const spawnOpts = vi.mocked(spawn).mock.calls[0][2] as { env: Record<string, string> };
      expect(spawnOpts.env.CLAUDE_CODE_TASK_LIST_ID).toBe('cards-extension-card-123');
      expect(spawnOpts.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
      expect(spawnOpts.env.BASE_BRANCH).toBe('main');
      expect(spawnOpts.env.PARENT_BRANCH).toBe('main');
      expect(spawnOpts.env.WORKSPACE_BRANCH).toBe('cards/card-123/1');

      child.emit('close', 0);
      await promise;
    });

    it('registers onCancel that kills child with SIGTERM', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/interview.js')).default;
      const context = createMockContext();
      const promise = action(baseInput(), context);
      await flushMicrotasks();

      expect(context.onCancel).toHaveBeenCalledWith(expect.any(Function));

      // Invoke the registered cancel callback
      const cancelCallback = vi.mocked(context.onCancel).mock.calls[0][0] as () => void;
      cancelCallback();
      expect(child.kill).toHaveBeenCalledWith('SIGTERM');

      child.emit('close', null);
      await promise;
    });

    it('does NOT register onSwitchToInteractive', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/interview.js')).default;
      const context = createMockContext();
      const promise = action(baseInput(), context);
      await flushMicrotasks();

      expect(context.onSwitchToInteractive).not.toHaveBeenCalled();

      child.emit('close', 0);
      await promise;
    });

    it('always generates fresh session ID', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/interview.js')).default;
      // Pass switchToInteractiveData to verify it is ignored
      const promise = action(
        baseInput({ switchToInteractiveData: { sessionId: 'existing-session-456' } }),
        createMockContext()
      );
      await flushMicrotasks();

      const args = vi.mocked(spawn).mock.calls[0][1] as string[];
      // Should use randomUUID result, not the existing session ID
      expect(args).toContain('--session-id');
      expect(args).toContain('test-uuid-1234');
      expect(args).not.toContain('--resume');
      expect(args).not.toContain('existing-session-456');

      child.emit('close', 0);
      await promise;
    });

    it('resolves only after child process exits', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/interview.js')).default;
      let resolved = false;
      const promise = action(baseInput(), createMockContext()).then(() => {
        resolved = true;
      });

      // Flush microtasks so worktree setup completes and spawn is called
      await flushMicrotasks();

      // Should not resolve before close event
      await Promise.resolve();
      expect(resolved).toBe(false);

      child.emit('close', 0);
      await promise;
      expect(resolved).toBe(true);
    });

    describe('worktree lifecycle', () => {
      /**
       * Configures execFile mock to handle specific git commands.
       * Commands not matched fall through to a default error callback.
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
            // Match against registered handlers by prefix
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
          return Promise.resolve(
            new Response(
              JSON.stringify({
                filename: 'test.jsonl',
                streamType: 'claude-code-session',
                lineCount: 0,
                status: 'completed'
              }),
              { status: 200 }
            )
          );
        });
      }

      it('creates worktree when no branches exist', async () => {
        const { spawn } = await import('node:child_process');
        const { createWorktree } = await import('../src/lib/create-worktree.js');

        await configureExecFile({
          'git rev-parse --abbrev-ref HEAD': { stdout: 'main\n' }
        });

        configureBranchesResponse([]);

        vi.mocked(createWorktree).mockResolvedValue({
          branch: 'cards/card-123/1',
          worktree: '/test/workspace/.worktrees/cards/card-123/1',
          baseSha: 'abc123'
        });

        const child = createMockChild();
        vi.mocked(spawn).mockReturnValue(child);

        const action = (await import('../src/actions/interview.js')).default;
        const promise = action(baseInput(), createMockContext());
        await flushMicrotasks();

        expect(createWorktree).toHaveBeenCalledWith('cards/card-123/1', {
          cwd: '/test/workspace'
        });

        const spawnOpts = vi.mocked(spawn).mock.calls[0][2] as { cwd: string };
        expect(spawnOpts.cwd).toBe('/test/workspace/.worktrees/cards/card-123/1');

        child.emit('close', 0);
        await promise;
      });

      it('reuses existing worktree when branch exists on disk', async () => {
        const { spawn } = await import('node:child_process');
        const { access } = await import('node:fs/promises');
        const { createWorktree } = await import('../src/lib/create-worktree.js');

        await configureExecFile({
          'git rev-parse --abbrev-ref HEAD': { stdout: 'main\n' }
        });

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

        const child = createMockChild();
        vi.mocked(spawn).mockReturnValue(child);

        const action = (await import('../src/actions/interview.js')).default;
        const promise = action(baseInput(), createMockContext());
        await flushMicrotasks();

        // Should NOT create a new worktree
        expect(createWorktree).not.toHaveBeenCalled();

        const spawnOpts = vi.mocked(spawn).mock.calls[0][2] as { cwd: string };
        expect(spawnOpts.cwd).toBe('/test/workspace/.worktrees/cards/card-123/1');

        child.emit('close', 0);
        await promise;
      });

      it('cleans up merged branches after exit', async () => {
        const { spawn, execFile } = await import('node:child_process');
        const { access } = await import('node:fs/promises');

        const mergeBaseKey = 'git merge-base --is-ancestor cards/card-123/1 main';
        const worktreeRemoveKey = 'git worktree remove';
        const branchDeleteKey = 'git branch -d cards/card-123/1';

        await configureExecFile({
          'git rev-parse --abbrev-ref HEAD': { stdout: 'main\n' },
          [mergeBaseKey]: { stdout: '' },
          [worktreeRemoveKey]: { stdout: '' },
          [branchDeleteKey]: { stdout: '' }
        });

        const branch: BranchInfo = {
          name: 'cards/card-123/1',
          worktree: '/test/workspace/.worktrees/cards/card-123/1',
          parentBranch: 'main',
          addedAt: '2025-01-01T00:00:00Z',
          exists: true
        };

        globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
          if (typeof url === 'string' && url.includes('/branches')) {
            if (!opts?.method || opts.method === 'GET') {
              return Promise.resolve(new Response(JSON.stringify({ branches: [branch] }), { status: 200 }));
            }
            if (opts?.method === 'DELETE') {
              return Promise.resolve(new Response(null, { status: 204 }));
            }
          }
          return Promise.resolve(
            new Response(JSON.stringify({ status: 'completed', lineCount: 0, filename: 'x' }), {
              status: 200
            })
          );
        });

        vi.mocked(access).mockResolvedValue(undefined);

        const child = createMockChild();
        vi.mocked(spawn).mockReturnValue(child);

        const action = (await import('../src/actions/interview.js')).default;
        const promise = action(baseInput(), createMockContext());
        await flushMicrotasks();

        child.emit('close', 0);
        await promise;

        // Verify cleanup was attempted: worktree remove, branch delete, API remove
        const execCalls = vi.mocked(execFile).mock.calls;
        const worktreeRemoveCall = execCalls.find(
          (c) => (c[1] as string[])?.includes('worktree') && (c[1] as string[])?.includes('remove')
        );
        expect(worktreeRemoveCall).toBeDefined();

        const branchDeleteCall = execCalls.find(
          (c) => (c[1] as string[])?.includes('branch') && (c[1] as string[])?.includes('-d')
        );
        expect(branchDeleteCall).toBeDefined();

        const fetchCalls = vi.mocked(globalThis.fetch).mock.calls;
        const deleteCall = fetchCalls.find(
          (c) => (c[1] as RequestInit)?.method === 'DELETE' && (c[0] as string).includes('/branches/')
        );
        expect(deleteCall).toBeDefined();
      });

      it('throws when resolveBaseBranch fails', async () => {
        const { execFile } = await import('node:child_process');
        vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
          const cb = args[args.length - 1];
          if (typeof cb === 'function') cb(new Error('not a git repo'));
          return {} as ReturnType<typeof execFile>;
        });

        const action = (await import('../src/actions/interview.js')).default;
        await expect(action(baseInput(), createMockContext())).rejects.toThrow('not a git repo');
      });

      it('throws when createWorktree fails', async () => {
        const { createWorktree } = await import('../src/lib/create-worktree.js');
        vi.mocked(createWorktree).mockRejectedValue(new Error('disk full'));

        const action = (await import('../src/actions/interview.js')).default;
        await expect(action(baseInput(), createMockContext())).rejects.toThrow('disk full');
      });
    });
  });
});
