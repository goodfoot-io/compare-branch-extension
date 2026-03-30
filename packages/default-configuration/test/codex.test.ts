/**
 * Exercises Codex action behavior through focused scenarios.
 * The cases lock in process wiring so prompt-based runtime skill loading does
 * not drift during refactors.
 *
 * @summary Tests Codex action behavior
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
  rm: vi.fn(),
  mkdir: vi.fn(),
  symlink: vi.fn()
}));

vi.mock('@cards/sdk/worktree', () => ({
  createWorktree: vi.fn(),
  checkWorktreeExists: vi.fn(),
  findGitRoots: vi.fn()
}));

vi.mock('../src/lib/branch-cleanup-watcher.js', () => ({
  spawnBranchCleanupWatcher: vi.fn()
}));

const originalFetch = globalThis.fetch;

beforeEach(async () => {
  vi.clearAllMocks();
  process.env['EXTENSION_PATH'] = '/test/extension';
  process.env['API_TEST_MODE'] = '1';
  delete process.env['CODEX_HOME'];

  const { execFile } = await import('node:child_process');
  const fs = await import('node:fs/promises');
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

  vi.mocked(fs.access).mockResolvedValue(undefined);
  vi.mocked(fs.readFile).mockImplementation(async (filePath: string | URL) => {
    if (String(filePath) === '/test/extension/dist/marketplace/plugins/codex-runtime/.codex-plugin/plugin.json') {
      return JSON.stringify({
        name: 'codex-runtime',
        version: '1.0.0',
        description: 'Codex runtime plugin for the Cards extension'
      });
    }
    throw Object.assign(new Error(`mock: unhandled readFile: ${String(filePath)}`), { code: 'ENOENT' });
  });
  vi.mocked(fs.rm).mockResolvedValue(undefined);
  vi.mocked(fs.mkdir).mockResolvedValue(undefined);
  vi.mocked(fs.symlink).mockResolvedValue(undefined);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env['API_TEST_MODE'];
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

function baseInput(overrides?: Partial<ActionInput>): ActionInput {
  return {
    cardId: 'card-123',
    actionName: 'Codex',
    environment: 'default',
    executionMode: 'interactive',
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

  it('installs the packaged codex plugin and spawns codex with plugin config overrides', async () => {
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
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
    expect(args).toContain('--config');
    expect(args).toContain('features.plugins=true');
    expect(args).toContain('plugins.codex-runtime@local.enabled=true');
    expect(args[args.length - 1]).toBe(
      'Use the `cards-runtime` skill for card repository conventions, then continue work on the card.'
    );

    expect(fs.access).toHaveBeenCalledWith('/test/extension/dist/marketplace/plugins/codex-runtime');
    expect(fs.access).toHaveBeenCalledWith(
      '/test/extension/dist/marketplace/plugins/codex-runtime/skills/cards-runtime'
    );
    expect(fs.readFile).toHaveBeenCalledWith(
      '/test/extension/dist/marketplace/plugins/codex-runtime/.codex-plugin/plugin.json',
      'utf-8'
    );
    expect(fs.rm).toHaveBeenCalledWith('/home/node/.codex/plugins/cache/local/codex-runtime', {
      recursive: true,
      force: true
    });
    expect(fs.mkdir).toHaveBeenCalledWith('/home/node/.codex/plugins/cache/local/codex-runtime', {
      recursive: true
    });
    expect(fs.symlink).toHaveBeenCalledWith(
      '/test/extension/dist/marketplace/plugins/codex-runtime',
      '/home/node/.codex/plugins/cache/local/codex-runtime/1.0.0',
      'junction'
    );

    child.emit('close', 0);
    await promise;
  });

  it('fails closed when the packaged plugin manifest is missing', async () => {
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockRejectedValueOnce(Object.assign(new Error('manifest missing'), { code: 'ENOENT' }));

    const action = (await import('../src/actions/codex.js')).default;

    await expect(action(baseInput(), createMockContext())).rejects.toThrow('manifest missing');
    expect(spawn).not.toHaveBeenCalled();
  });

  it('fails closed when the packaged cards-runtime skill directory is missing', async () => {
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
    vi.mocked(fs.access).mockImplementation(async (targetPath: string | URL) => {
      if (String(targetPath) === '/test/extension/dist/marketplace/plugins/codex-runtime/skills/cards-runtime') {
        throw Object.assign(new Error('skill missing'), { code: 'ENOENT' });
      }
    });

    const action = (await import('../src/actions/codex.js')).default;

    await expect(action(baseInput(), createMockContext())).rejects.toThrow('skill missing');
    expect(spawn).not.toHaveBeenCalled();
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

  it('calls spawnBranchCleanupWatcher after session exits', async () => {
    const { spawn, execFile } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/codex.js')).default;
    const promise = action(baseInput(), createMockContext());
    await flushMicrotasks();

    child.emit('close', 0);
    await promise;

    const { spawnBranchCleanupWatcher } = await import('../src/lib/branch-cleanup-watcher.js');
    expect(spawnBranchCleanupWatcher).toHaveBeenCalledWith({
      cardId: 'card-123',
      repoRoot: '/test/workspace',
      cardRepoPath: '/test/repo'
    });

    // Verify no inline cleanup (no merge-base calls)
    const execCalls = vi.mocked(execFile).mock.calls;
    const mergeBaseCall = execCalls.find((c) => (c[1] as string[])?.includes('merge-base'));
    expect(mergeBaseCall).toBeUndefined();
  });
});
