/**
 * Reproduction test for exit-code-1 bug: post-session cleanup error propagation.
 *
 * When claude exits cleanly (code 0), `spawnClaudeSession` calls
 * `cleanupMergedBranches` with `await`. If the Cards API is unreachable
 * (e.g. server restarted during a long session), `client.getBranches()` throws.
 * The error propagates through spawnClaudeSession → the action handler →
 * executeCommand → handleHandlerError → process.exit(1).
 *
 * The watcher already catches its own `cleanupMergedBranches` errors
 * (wrapper.ts:748-750), and the extension's `handleTerminalClose` has fallback
 * cleanup (ActionDispatcher.ts:566-571). The handler's cleanup is
 * triple-redundant and should not be fatal.
 *
 * This test asserts that `spawnClaudeSession` resolves successfully even when
 * `cleanupMergedBranches` throws. It MUST FAIL against the current (unfixed)
 * code, which propagates the error.
 *
 * @summary Reproduction test for post-session cleanup error propagation bug
 */

import type { ChildProcess } from 'node:child_process';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import { flushMicrotasks } from '@cards/test-utils';
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

  // readFile: reject with ENOENT so updateMarketplaceRegistration skips cleanly
  const { readFile } = await import('node:fs/promises');
  const enoent = Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' });
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

function createMockContext(): ActionContext {
  return {
    logger: new Logger(),
    cwd: process.cwd(),
    onCancel: vi.fn(),
    onSwitchToInteractive: vi.fn()
  };
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

describe('spawnClaudeSession post-exit cleanup error propagation', () => {
  it('should resolve successfully when cleanupMergedBranches throws after clean claude exit', async () => {
    const { spawn } = await import('node:child_process');
    const { spawnClaudeSession } = await import('../src/lib/claude-session.js');

    process.env['EXTENSION_PATH'] = '/test/extension';

    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    // Track fetch call count so we can make cleanup's getBranches fail
    let branchGetCallCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (typeof url === 'string' && url.includes('/branches') && (!opts?.method || opts.method === 'GET')) {
        branchGetCallCount++;
        if (branchGetCallCount > 1) {
          // Second GET /branches call is from cleanupMergedBranches (post-exit).
          // Simulate API unreachable — server restarted on a different port.
          return Promise.reject(new Error('fetch failed: ECONNREFUSED'));
        }
        return Promise.resolve(
          new Response(JSON.stringify({ branches: [], commits: [], defaultBranch: 'main' }), { status: 200 })
        );
      }
      if (typeof url === 'string' && url.includes('/branches') && opts?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({}), { status: 201 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const context = createMockContext();
    const promise = spawnClaudeSession(baseInput(), context, {
      prompt: 'test prompt',
      sessionId: 'session-123',
      resume: false,
      supportsSwitchToInteractive: false
    });
    await flushMicrotasks();

    // Claude exits cleanly with code 0
    child.emit('close', 0);

    // spawnClaudeSession should resolve without error even though
    // cleanupMergedBranches throws due to API being unreachable.
    // Current (unfixed) code: this rejects with "fetch failed: ECONNREFUSED"
    await expect(promise).resolves.toBeUndefined();
  });
});
