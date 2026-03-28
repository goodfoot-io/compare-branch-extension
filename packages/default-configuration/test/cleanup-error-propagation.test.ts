/**
 * Regression test: post-session cleanup error propagation.
 *
 * When claude exits cleanly (code 0) in background mode, `spawnClaudeSession`
 * calls `cleanupMergedBranches` inline. If the card repo is inaccessible
 * (e.g. disk error reading workspace-branches.json), the error must not
 * propagate — cleanup is triple-redundant and should not be fatal.
 *
 * This test asserts that `spawnClaudeSession` resolves successfully even when
 * `cleanupMergedBranches` throws due to a filesystem error.
 *
 * @summary Regression test for post-session cleanup error propagation
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

  // Default: no existing branches (API still used for addBranch in spawnClaudeSession)
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

  // readFile: reject with EACCES to simulate inaccessible card repo for cleanupMergedBranches
  const { readFile } = await import('node:fs/promises');
  vi.mocked(readFile).mockImplementation((filePath: unknown) => {
    const p = String(filePath);
    if (p.endsWith('workspace-branches.json')) {
      return Promise.reject(Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }));
    }
    // Other reads (e.g. marketplace registration) return ENOENT
    return Promise.reject(Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' }));
  });

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
    // cleanupMergedBranches throws due to EACCES on workspace-branches.json.
    await expect(promise).resolves.toBeUndefined();
  });
});
