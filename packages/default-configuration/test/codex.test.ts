/**
 * Exercises Codex action behavior through focused scenarios.
 * The cases lock in process wiring so the packaged Codex configuration and
 * runtime skill loading do not drift during refactors.
 *
 * @summary Tests Codex action behavior
 */

import type { ChildProcess } from 'node:child_process';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn()
}));

vi.mock('../src/lib/create-worktree.js', () => ({
  createWorktree: vi.fn(),
  checkWorktreeExists: vi.fn(),
  findGitRoots: vi.fn()
}));

const originalFetch = globalThis.fetch;

beforeEach(async () => {
  vi.clearAllMocks();
  process.env['EXTENSION_PATH'] = '/test/extension';

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
        new Response(JSON.stringify({ branches: [], commits: [], defaultBranch: 'main' }), { status: 200 })
      );
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

function createMockChild(): ChildProcess {
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
    }
  } as unknown as ChildProcess;
}

async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function baseInput(overrides?: Partial<ActionInput>): ActionInput {
  return {
    cardId: 'card-123',
    actionName: 'Codex',
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

describe('codex action', () => {
  it('exports an action command', async () => {
    const action = (await import('../src/actions/codex.js')).default;
    expect(action.factoryType).toBe('action');
    expect(action.actionName).toBe('Codex');
  });

  it('spawns codex with the packaged marketplace config', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/codex.js')).default;
    const promise = action(baseInput(), createMockContext());
    await flushMicrotasks();

    expect(spawn).toHaveBeenCalledWith(
      'codex',
      expect.arrayContaining(['--dangerously-bypass-approvals-and-sandbox']),
      expect.objectContaining({
        cwd: '/test/workspace/.worktrees/cards/card-123/1',
        stdio: 'inherit',
        env: expect.objectContaining({
          CODEX_CONFIG: '/test/extension/dist/marketplace/.codex/config.toml',
          WORKSPACE_PATH: '/test/workspace/.worktrees/cards/card-123/1',
          BASE_BRANCH: 'main',
          PARENT_BRANCH: 'main',
          WORKSPACE_BRANCH: 'cards/card-123/1'
        })
      })
    );

    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    expect(args).toContain('--cd');
    expect(args).toContain('/test/workspace/.worktrees/cards/card-123/1');
    expect(args).toContain('--add-dir');
    expect(args).toContain('/test/repo');
    expect(args[args.length - 1]).toBe('Load the `cards-runtime` skill and continue work on the card');

    child.emit('close', 0);
    await promise;
  });

  it('registers onCancel that kills the child process', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const context = createMockContext();
    const action = (await import('../src/actions/codex.js')).default;
    const promise = action(baseInput(), context);
    await flushMicrotasks();

    const onCancel = vi.mocked(context.onCancel).mock.calls[0][0] as () => void;
    onCancel();

    expect(child.kill).toHaveBeenCalledWith('SIGTERM');

    child.emit('close', 0);
    await promise;
  });
});
