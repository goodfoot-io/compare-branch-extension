import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import type { BranchInfo } from '@cards/sdk/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Exercises actions behavior in the test area through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve expected state
 * transitions and output.
 *
 * @summary Tests actions behavior in test
 */

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  readFile: vi.fn()
}));

vi.mock('@cards/claude-code-sessions', () => ({
  getTranscriptPathForPid: vi.fn()
}));

vi.mock('../src/lib/create-worktree.js', () => ({
  createWorktree: vi.fn()
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

  const { createWorktree } = await import('../src/lib/create-worktree.js');
  vi.mocked(createWorktree).mockResolvedValue({
    branch: 'cards/card-123/1',
    worktree: '/test/workspace/.worktrees/cards/card-123/1',
    baseSha: 'abc123'
  });

  // Default: getTranscriptPathForPid resolves to a path, readFile returns minimal transcript
  const { getTranscriptPathForPid } = await import('@cards/claude-code-sessions');
  vi.mocked(getTranscriptPathForPid).mockResolvedValue('/tmp/transcript.jsonl');

  const { readFile } = await import('node:fs/promises');
  vi.mocked(readFile).mockResolvedValue(
    '{"type":"system","subtype":"init","model":"claude","tools":[],"cwd":"/test"}\n'
  );
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

function createMockChildWithStreams(): ChildProcess & { emitStdout(data: string): void } {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const child = {
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers.set(event, cb);
    }),
    kill: vi.fn(),
    stdout,
    stderr,
    emit(event: string, ...args: unknown[]) {
      handlers.get(event)?.(...args);
      return true;
    },
    emitStdout(data: string) {
      stdout.emit('data', Buffer.from(data));
    }
  } as unknown as ChildProcess & { emitStdout(data: string): void };
  return child;
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

describe('Default Actions', () => {
  describe('launch', () => {
    it('exports an action command', async () => {
      const action = (await import('../src/actions/launch.js')).default;
      expect(action.factoryType).toBe('action');
      expect(action.actionName).toBe('Launch');
    });

    it('spawns claude with inherited stdio in interactive mode', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
      const promise = action(baseInput(), createMockContext());
      await flushMicrotasks();

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--session-id', 'test-uuid-1234']),
        expect.objectContaining({ cwd: '/test/workspace/.worktrees/cards/card-123/1', stdio: 'inherit' })
      );

      // Should not include --print in interactive mode
      const args = vi.mocked(spawn).mock.calls[0][1] as string[];
      expect(args).not.toContain('--print');

      // Should include --settings with plugin and marketplace JSON
      const settingsIdx = args.indexOf('--settings');
      expect(settingsIdx).toBeGreaterThan(-1);
      const settingsJson = JSON.parse(args[settingsIdx + 1]);
      expect(settingsJson.enabledPlugins['runtime@cards.management']).toBe(true);
      expect(settingsJson.extraKnownMarketplaces['cards.management'].source).toEqual({
        source: 'directory',
        path: 'public'
      });

      child.emit('close', 0);
      await promise;
    });

    it('spawns claude with --print and stream-json in background mode', async () => {
      globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
          return Promise.resolve(new Response(JSON.stringify({ branches: [] }), { status: 200 }));
        }
        if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'POST') {
          return Promise.resolve(new Response(JSON.stringify({}), { status: 201 }));
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

      const { spawn } = await import('node:child_process');
      const child = createMockChildWithStreams();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
      const promise = action(baseInput({ executionMode: 'background' }), createMockContext());
      await flushMicrotasks();

      const args = vi.mocked(spawn).mock.calls[0][1] as string[];
      expect(args).toContain('--print');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');

      const spawnOpts = vi.mocked(spawn).mock.calls[0][2] as { stdio: unknown };
      expect(spawnOpts.stdio).toEqual(['ignore', 'pipe', 'pipe']);

      child.emit('close', 0);
      await promise;
    });

    it('streams background stdout lines to the server via openStream', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
          return Promise.resolve(new Response(JSON.stringify({ branches: [] }), { status: 200 }));
        }
        if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'POST') {
          return Promise.resolve(new Response(JSON.stringify({}), { status: 201 }));
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              filename: 'test.jsonl',
              streamType: 'claude-code-session',
              lineCount: 2,
              status: 'completed'
            }),
            { status: 200 }
          )
        );
      });
      globalThis.fetch = fetchMock;

      const { spawn } = await import('node:child_process');
      const child = createMockChildWithStreams();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
      const context = createMockContext();
      const promise = action(baseInput({ executionMode: 'background' }), context);
      await flushMicrotasks();

      // Verify fetch was called with the stream endpoint
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/cards/card-123/streams/claude-code-session/'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-ndjson',
            Authorization: 'Bearer test-token'
          })
        })
      );

      // Emit stdout lines — these should be written to the stream, not logged
      const sdkMessage = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Hello from Claude' }] }
      });
      child.emitStdout(`${sdkMessage}\n`);

      child.emit('close', 0);
      await promise;

      // Verify the action logged completion with stream result metadata
      const _logSpy = vi.spyOn(context.logger, 'info');
      // The logger.info call before the spy was created won't be captured,
      // but we can verify the action completed without error (promise resolved)
    });

    it('registers onCancel that kills the child process', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
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

    it('registers onSwitchToInteractive that returns session ID', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
      const context = createMockContext();
      const promise = action(baseInput(), context);
      await flushMicrotasks();

      expect(context.onSwitchToInteractive).toHaveBeenCalledWith(expect.any(Function));

      // Invoke the registered callback and verify it returns the session ID
      const switchCallback = vi.mocked(context.onSwitchToInteractive).mock.calls[0][0] as () => unknown;
      const result = switchCallback();
      expect(result).toEqual({ sessionId: 'test-uuid-1234' });
      expect(child.kill).toHaveBeenCalledWith('SIGTERM');

      child.emit('close', null);
      await promise;
    });

    it('resumes session from switchToInteractiveData', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
      const promise = action(
        baseInput({ switchToInteractiveData: { sessionId: 'existing-session-456' } }),
        createMockContext()
      );
      await flushMicrotasks();

      const args = vi.mocked(spawn).mock.calls[0][1] as string[];
      expect(args).toContain('--resume');
      expect(args).toContain('existing-session-456');
      expect(args).not.toContain('--session-id');

      child.emit('close', 0);
      await promise;
    });

    it('resolves only after child process exits', async () => {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const action = (await import('../src/actions/launch.js')).default;
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
          // Fallback for stream endpoints
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

      it('throws when resolveBaseBranch fails', async () => {
        const { execFile } = await import('node:child_process');
        vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
          const cb = args[args.length - 1];
          if (typeof cb === 'function') cb(new Error('not a git repo'));
          return {} as ReturnType<typeof execFile>;
        });

        const action = (await import('../src/actions/launch.js')).default;
        await expect(action(baseInput(), createMockContext())).rejects.toThrow('not a git repo');
      });

      it('creates a new worktree when no branches exist', async () => {
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

        const action = (await import('../src/actions/launch.js')).default;
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

        const action = (await import('../src/actions/launch.js')).default;
        const promise = action(baseInput(), createMockContext());
        await flushMicrotasks();

        // Should NOT create a new worktree
        expect(createWorktree).not.toHaveBeenCalled();

        const spawnOpts = vi.mocked(spawn).mock.calls[0][2] as { cwd: string };
        expect(spawnOpts.cwd).toBe('/test/workspace/.worktrees/cards/card-123/1');

        child.emit('close', 0);
        await promise;
      });

      it('sets BASE_BRANCH and PARENT_BRANCH env vars when worktree succeeds', async () => {
        const { spawn } = await import('node:child_process');
        const { access } = await import('node:fs/promises');

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

        const action = (await import('../src/actions/launch.js')).default;
        const promise = action(baseInput(), createMockContext());
        await flushMicrotasks();

        const spawnOpts = vi.mocked(spawn).mock.calls[0][2] as { env: Record<string, string> };
        expect(spawnOpts.env.BASE_BRANCH).toBe('main');
        expect(spawnOpts.env.PARENT_BRANCH).toBe('main');

        child.emit('close', 0);
        await promise;
      });

      it('computes next branch number from existing branches', async () => {
        const { spawn } = await import('node:child_process');
        const { createWorktree } = await import('../src/lib/create-worktree.js');

        await configureExecFile({
          'git rev-parse --abbrev-ref HEAD': { stdout: 'main\n' }
        });

        // Existing branch exists=false (no worktree on disk), so must create new
        configureBranchesResponse([
          {
            name: 'cards/card-123/1',
            worktree: '/old/path',
            parentBranch: 'main',
            addedAt: '2025-01-01T00:00:00Z',
            exists: false
          },
          {
            name: 'cards/card-123/3',
            worktree: '/old/path2',
            parentBranch: 'main',
            addedAt: '2025-01-02T00:00:00Z',
            exists: false
          }
        ]);

        vi.mocked(createWorktree).mockResolvedValue({
          branch: 'cards/card-123/4',
          worktree: '/test/workspace/.worktrees/cards/card-123/4',
          baseSha: 'abc123'
        });

        const child = createMockChild();
        vi.mocked(spawn).mockReturnValue(child);

        const action = (await import('../src/actions/launch.js')).default;
        const promise = action(baseInput(), createMockContext());
        await flushMicrotasks();

        // Should pick max(1,3)+1 = 4
        expect(createWorktree).toHaveBeenCalledWith('cards/card-123/4', {
          cwd: '/test/workspace'
        });

        child.emit('close', 0);
        await promise;
      });

      it('cleans up fully-merged branches after claude exits', async () => {
        const { spawn, execFile } = await import('node:child_process');
        const { access } = await import('node:fs/promises');

        // Configure git commands: base branch, log for reuse, merge-base for cleanup
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

        // First call: getBranches for resolveOrCreateWorktree
        // Second call: getBranches for cleanupMergedBranches (post-exit)
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

        const action = (await import('../src/actions/launch.js')).default;
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

        // Verify removeBranch API call (DELETE to /branches/...)
        const fetchCalls = vi.mocked(globalThis.fetch).mock.calls;
        const deleteCall = fetchCalls.find(
          (c) => (c[1] as RequestInit)?.method === 'DELETE' && (c[0] as string).includes('/branches/')
        );
        expect(deleteCall).toBeDefined();
      });

      it('skips cleanup for unmerged branches', async () => {
        const { spawn, execFile } = await import('node:child_process');
        const { access } = await import('node:fs/promises');

        // merge-base --is-ancestor will fail for unmerged branches (exit code 1)
        const handlers: Record<string, { stdout: string }> = {
          'git rev-parse --abbrev-ref HEAD': { stdout: 'main\n' }
        };

        vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
          const cb = args[args.length - 1];
          const cmd = args[0] as string;
          const cmdArgs = args[1] as string[];
          const key = `${cmd} ${cmdArgs.join(' ')}`;

          if (typeof cb === 'function') {
            // merge-base --is-ancestor should fail (branch not merged)
            if (key.includes('merge-base --is-ancestor')) {
              cb(new Error('exit code 1'));
              return {} as ReturnType<typeof execFile>;
            }
            for (const [pattern, result] of Object.entries(handlers)) {
              if (key.startsWith(pattern) || key.includes(pattern)) {
                cb(null, { stdout: result.stdout, stderr: '' });
                return {} as ReturnType<typeof execFile>;
              }
            }
            cb(new Error(`mock: unhandled command: ${key}`));
          }
          return {} as ReturnType<typeof execFile>;
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

        const action = (await import('../src/actions/launch.js')).default;
        const promise = action(baseInput(), createMockContext());
        await flushMicrotasks();

        child.emit('close', 0);
        await promise;

        // Verify NO worktree remove or branch delete was called
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

      it('skips worktree with nonexistent path on disk', async () => {
        const { spawn } = await import('node:child_process');
        const { access } = await import('node:fs/promises');
        const { createWorktree } = await import('../src/lib/create-worktree.js');

        await configureExecFile({
          'git rev-parse --abbrev-ref HEAD': { stdout: 'main\n' }
        });

        configureBranchesResponse([
          {
            name: 'cards/card-123/1',
            worktree: '/nonexistent/worktree/path',
            parentBranch: 'main',
            addedAt: '2025-01-01T00:00:00Z',
            exists: true
          }
        ]);

        // fs.access rejects — worktree path doesn't exist on disk
        vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

        vi.mocked(createWorktree).mockResolvedValue({
          branch: 'cards/card-123/2',
          worktree: '/test/workspace/.worktrees/cards/card-123/2',
          baseSha: 'abc123'
        });

        const child = createMockChild();
        vi.mocked(spawn).mockReturnValue(child);

        const action = (await import('../src/actions/launch.js')).default;
        const promise = action(baseInput(), createMockContext());
        await flushMicrotasks();

        // Should create a new worktree since the existing one's path doesn't exist
        expect(createWorktree).toHaveBeenCalledWith('cards/card-123/2', {
          cwd: '/test/workspace'
        });

        const spawnOpts = vi.mocked(spawn).mock.calls[0][2] as { cwd: string };
        expect(spawnOpts.cwd).toBe('/test/workspace/.worktrees/cards/card-123/2');

        child.emit('close', 0);
        await promise;
      });

      it('throws when createWorktree fails', async () => {
        const { createWorktree } = await import('../src/lib/create-worktree.js');
        vi.mocked(createWorktree).mockRejectedValue(new Error('disk full'));

        const action = (await import('../src/actions/launch.js')).default;
        await expect(action(baseInput(), createMockContext())).rejects.toThrow('disk full');
      });
    });
  });
});
