import type { ChildProcess } from 'node:child_process';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Reproduces a bug where `resolveOrCreateWorktree` crashes with
 * "Worktree already exists" when a git worktree is registered in git but
 * not tracked by the Cards API.
 *
 * The function uses `client.getBranches()` as the sole source of truth for
 * existing worktrees when computing the next branch number, but
 * `createWorktree` validates against git's actual state. When these disagree
 * (API has no record, git has the worktree registered), the code picks a
 * branch name git already has, and `createWorktree` throws an unrecoverable
 * error.
 *
 * @summary Regression test for worktree-API desync bug in resolveOrCreateWorktree
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

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-1234')
}));

const originalFetch = globalThis.fetch;

beforeEach(async () => {
  vi.clearAllMocks();

  // Set EXTENSION_PATH so resolveMarketplacePath() succeeds
  process.env['EXTENSION_PATH'] = '/test/extension';

  // Default: updateMarketplaceRegistration reads known_marketplaces.json — return
  // ENOENT so it exits early. Tests that need marketplace behaviour override explicitly.
  const fsPromises = await import('node:fs/promises');
  const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  vi.mocked(fsPromises.readFile).mockRejectedValue(enoent);

  // resolveBaseBranch → 'main'
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

  // Default fetch: getBranches → [], addBranch → 201
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

  // Default: findGitRoots returns workspace as both roots, checkWorktreeExists returns false (no conflict)
  const { createWorktree, checkWorktreeExists, findGitRoots } = await import('../src/lib/create-worktree.js');
  vi.mocked(findGitRoots).mockResolvedValue({ sourceRoot: '/test/workspace', repoRoot: '/test/workspace' });
  vi.mocked(checkWorktreeExists).mockResolvedValue(false);

  // Default createWorktree succeeds (overridden per-test below)
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
    emit(event: string, ...args: unknown[]) {
      handlers.get(event)?.(...args);
      return true;
    },
    ...overrides
  } as unknown as ChildProcess;
}

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
    repoRoot: '/test/workspace',
    cardRepoPath: '/test/repo',
    configPath: '/test/config',
    extensionPath: '/test/extension',
    ...overrides
  };
}

describe('worktree-API desync', () => {
  it('skips occupied slot and creates worktree at next available number', async () => {
    const { spawn } = await import('node:child_process');
    const { createWorktree, checkWorktreeExists } = await import('../src/lib/create-worktree.js');

    // API returns NO branches — it has no record of any worktree.
    // But git has cards/card-123/1 registered (checkWorktreeExists returns true for slot 1).
    vi.mocked(checkWorktreeExists)
      .mockResolvedValueOnce(true) // slot 1 occupied in git
      .mockResolvedValueOnce(false); // slot 2 free

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

    // createWorktree should be called once with slot 2 (skipping occupied slot 1)
    expect(createWorktree).toHaveBeenCalledTimes(1);
    expect(createWorktree).toHaveBeenCalledWith('cards/card-123/2', {
      cwd: '/test/workspace'
    });

    child.emit('close', 0);
    await promise;
  });

  it('skips multiple occupied slots to find the first free one', async () => {
    const { spawn } = await import('node:child_process');
    const { createWorktree, checkWorktreeExists } = await import('../src/lib/create-worktree.js');

    // Git has slots 1-15 registered but the API knows nothing about them.
    const occupied = 15;
    for (let i = 0; i < occupied; i++) {
      vi.mocked(checkWorktreeExists).mockResolvedValueOnce(true);
    }
    vi.mocked(checkWorktreeExists).mockResolvedValueOnce(false); // slot 16 free

    vi.mocked(createWorktree).mockResolvedValue({
      branch: 'cards/card-123/16',
      worktree: '/test/workspace/.worktrees/cards/card-123/16',
      baseSha: 'abc123'
    });

    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/launch.js')).default;
    const promise = action(baseInput(), createMockContext());
    await flushMicrotasks();

    // Should skip slots 1-15 and create at 16
    expect(createWorktree).toHaveBeenCalledTimes(1);
    expect(createWorktree).toHaveBeenCalledWith('cards/card-123/16', {
      cwd: '/test/workspace'
    });

    child.emit('close', 0);
    await promise;
  });
});
