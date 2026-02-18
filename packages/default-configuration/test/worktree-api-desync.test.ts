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
      return Promise.resolve(new Response(JSON.stringify({ branches: [] }), { status: 200 }));
    }
    if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'POST') {
      return Promise.resolve(new Response(JSON.stringify({}), { status: 201 }));
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  });

  // Default createWorktree succeeds (overridden per-test below)
  const { createWorktree } = await import('../src/lib/create-worktree.js');
  vi.mocked(createWorktree).mockResolvedValue({
    branch: 'cards/card-123/1',
    worktree: '/test/workspace/.worktrees/cards/card-123/1',
    baseSha: 'abc123'
  });

  // Default transcript/readFile mocks for post-spawn lifecycle
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
    workspacePath: '/test/workspace',
    cardRepoPath: '/test/repo',
    ...overrides
  };
}

describe('worktree-API desync', () => {
  it('handles worktree that exists in git but not in API', async () => {
    const { spawn } = await import('node:child_process');
    const { createWorktree } = await import('../src/lib/create-worktree.js');

    // API returns NO branches — it has no record of any worktree.
    // This simulates the desync: git has cards/card-123/1 registered,
    // but the API doesn't know about it.
    globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
        return Promise.resolve(new Response(JSON.stringify({ branches: [] }), { status: 200 }));
      }
      if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({}), { status: 201 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    // createWorktree rejects because git already has this worktree registered.
    // The numbering logic (which only consults the API) picks "cards/card-123/1",
    // but git's `worktree list` already contains it.
    vi.mocked(createWorktree).mockRejectedValue(
      new Error('Error: Worktree already exists at /test/workspace/.worktrees/cards/card-123/1')
    );

    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/launch.js')).default;

    // The action should NOT throw — it should handle the desync gracefully
    // (e.g., by incrementing the branch number and retrying, or by reusing
    // the existing git worktree).
    //
    // With the current buggy code, resolveOrCreateWorktree lets the
    // "Worktree already exists" error propagate unhandled, so the action
    // rejects. This assertion therefore FAILS, demonstrating the bug.
    const promise = action(baseInput(), createMockContext());
    await flushMicrotasks();

    await expect(promise).resolves.not.toThrow();

    child.emit('close', 0);
  });

  it('calls createWorktree with a conflicting branch name derived solely from API state', async () => {
    const { createWorktree } = await import('../src/lib/create-worktree.js');

    // API returns NO branches — same desync scenario.
    globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
        return Promise.resolve(new Response(JSON.stringify({ branches: [] }), { status: 200 }));
      }
      if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({}), { status: 201 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    // First call rejects (git already has cards/card-123/1),
    // second call would succeed with an incremented name.
    vi.mocked(createWorktree)
      .mockRejectedValueOnce(new Error('Error: Worktree already exists at /test/workspace/.worktrees/cards/card-123/1'))
      .mockResolvedValueOnce({
        branch: 'cards/card-123/2',
        worktree: '/test/workspace/.worktrees/cards/card-123/2',
        baseSha: 'abc123'
      });

    const action = (await import('../src/actions/launch.js')).default;

    // The action should recover from the first "already exists" error by
    // retrying with the next branch number. With the current buggy code,
    // createWorktree is called exactly once with the conflicting name and
    // then the error propagates — no retry happens.
    //
    // This assertion FAILS with the current code, demonstrating that
    // createWorktree is never called with the non-conflicting name.
    try {
      const { spawn } = await import('node:child_process');
      const child = createMockChild();
      vi.mocked(spawn).mockReturnValue(child);

      const promise = action(baseInput(), createMockContext());
      await flushMicrotasks();

      child.emit('close', 0);
      await promise;
    } catch {
      // The action throws with current code; that's the bug.
      // We still assert that a retry was attempted.
    }

    // After the fix, createWorktree should be called twice:
    // 1st with 'cards/card-123/1' (fails), 2nd with 'cards/card-123/2' (succeeds).
    // With the current buggy code, it's only called once — this assertion FAILS.
    expect(createWorktree).toHaveBeenCalledWith('cards/card-123/2', {
      cwd: '/test/workspace'
    });
  });
});
