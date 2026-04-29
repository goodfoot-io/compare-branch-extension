/**
 * Exercises Codex branches of the consolidated action handlers (launch, chat,
 * interview) through end-to-end scenarios. Locks in staging, spawn argv, error
 * paths, cancellation, and branch-cleanup wiring for the Codex path so the
 * main-334 consolidation preserves the pre-refactor `codex.ts` / `codex-chat.ts`
 * contract byte-for-byte and adds a parallel `interview` Codex path.
 *
 * @summary Tests Codex branches of consolidated action handlers
 */

import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { Logger } from '@cards/sdk/config';
import { flushMicrotasks } from '@cards/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn(),
  execFileSync: vi.fn()
}));

vi.mock('node:fs', () => ({
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  cp: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn()
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
  process.env['MARKETPLACE_PATH'] = '/test/extension/dist/marketplace';
  process.env['API_TEST_MODE'] = '1';
  delete process.env['CODEX_HOME'];
  delete process.env['CARDS_HOME'];
  delete process.env['XDG_DATA_HOME'];
  delete process.env['XDG_CONFIG_HOME'];

  const { execFile } = await import('node:child_process');
  const { execFileSync } = await import('node:child_process');
  const fs = await import('node:fs/promises');
  const syncFs = await import('node:fs');
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
  vi.mocked(execFileSync).mockImplementation((command: string, args?: readonly string[], options?: unknown) => {
    const normalizedArgs = [...(args ?? [])];
    const cwd =
      options && typeof options === 'object' && options !== null && 'cwd' in options
        ? String((options as { cwd?: unknown }).cwd)
        : '';
    const key = `${command} ${normalizedArgs.join(' ')}`;

    if (cwd === '/test/repo' && key.startsWith('git log -5 --reverse --pretty=format:%h%x00%an%x00%s -- .')) {
      return '123abcd\0Test User\0Add card plan';
    }
    if (cwd === '/test/repo' && key === 'git rev-list --count HEAD') {
      return '3';
    }
    if (cwd === '/test/workspace' && key === 'git log --format=%H cards/card-123/1') {
      return 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    }
    if (cwd === '/test/workspace' && key === 'git log --format=%H main') {
      return ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'].join('\n');
    }
    if (
      cwd === '/test/workspace' &&
      key === 'git log --no-walk --pretty=format:%H%x00%h%x00%s aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    ) {
      return 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\0abcdef1\0Branch change';
    }
    if (
      cwd === '/test/workspace' &&
      key === 'git log --no-walk --pretty=format:%H%x00%h%x00%s bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    ) {
      return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\0bcdefg2\0Merged fix';
    }
    if (cwd === '/test/workspace' && key === 'git cat-file --batch-check') {
      return '';
    }

    throw new Error(`mock: unhandled execFileSync: ${key} cwd=${cwd}`);
  });

  const cardRepoDirents = [
    {
      name: 'CARD.md',
      isDirectory: () => false,
      isFile: () => true
    },
    {
      name: 'plan',
      isDirectory: () => true,
      isFile: () => false
    },
    {
      name: 'streams',
      isDirectory: () => true,
      isFile: () => false
    }
  ];
  const streamDirents = [
    {
      name: 'claude-code-session',
      isDirectory: () => true,
      isFile: () => false
    }
  ];
  const streamFileDirents = [
    {
      name: 'a.jsonl',
      isDirectory: () => false,
      isFile: () => true
    }
  ];

  vi.mocked(syncFs.readdirSync).mockImplementation((targetPath: string | Buffer | URL) => {
    if (String(targetPath) === '/test/repo') {
      return cardRepoDirents as ReturnType<typeof syncFs.readdirSync>;
    }
    if (String(targetPath) === '/test/repo/streams') {
      return streamDirents as ReturnType<typeof syncFs.readdirSync>;
    }
    if (String(targetPath) === '/test/repo/streams/claude-code-session') {
      return streamFileDirents as ReturnType<typeof syncFs.readdirSync>;
    }
    throw Object.assign(new Error(`mock: unhandled readdirSync: ${String(targetPath)}`), { code: 'ENOENT' });
  });
  vi.mocked(syncFs.statSync).mockImplementation((_targetPath: string | Buffer | URL) => {
    return {
      mtimeMs: new Date('2026-04-02T12:34:56Z').getTime()
    } as ReturnType<typeof syncFs.statSync>;
  });
  vi.mocked(syncFs.readFileSync).mockImplementation((filePath: string | Buffer | URL) => {
    if (String(filePath) === '/test/repo/CARD.meta.json') {
      return JSON.stringify({
        id: 'card-123',
        title: 'Test card',
        status: 'active',
        gates: {
          planRequired: true,
          planApproved: false,
          mergeRequestRequired: false,
          mergeApproved: false
        }
      });
    }
    if (String(filePath) === '/test/repo/branches.json') {
      return JSON.stringify({
        'cards/card-123/1': {
          parentBranch: 'main',
          addedAt: '2026-04-02T00:00:00.000Z'
        }
      });
    }
    if (String(filePath) === '/test/repo/commits.csv') {
      return ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'].join('\n');
    }
    throw Object.assign(new Error(`mock: unhandled readFileSync: ${String(filePath)}`), { code: 'ENOENT' });
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
  vi.mocked(fs.stat).mockImplementation(async (targetPath: string | URL) => {
    if (String(targetPath) === '/home/node/.codex') {
      return { isDirectory: () => true } as Awaited<ReturnType<typeof fs.stat>>;
    }
    throw Object.assign(new Error(`mock: unhandled stat: ${String(targetPath)}`), { code: 'ENOENT' });
  });
  vi.mocked(fs.readdir).mockImplementation(async (targetPath: string | URL) => {
    if (String(targetPath) === '/test/extension/dist/codex') {
      return ['.agents', 'cards', 'runtime'] as Awaited<ReturnType<typeof fs.readdir>>;
    }
    throw Object.assign(new Error(`mock: unhandled readdir: ${String(targetPath)}`), { code: 'ENOENT' });
  });
  vi.mocked(fs.readFile).mockImplementation(async (filePath: string | URL) => {
    if (String(filePath) === '/test/extension/dist/codex/cards/.codex-plugin/plugin.json') {
      return JSON.stringify({
        name: 'cards',
        description: 'Codex cards plugin for interacting with the Cards extension APIs'
      });
    }
    if (String(filePath) === '/test/extension/dist/codex/runtime/.codex-plugin/plugin.json') {
      return JSON.stringify({
        name: 'runtime',
        description: 'Codex runtime plugin for the Cards extension'
      });
    }
    if (String(filePath) === '/test/extension/dist/codex/.agents/plugins/marketplace.json') {
      return JSON.stringify({
        name: 'local',
        plugins: [
          {
            name: 'cards',
            source: {
              source: 'local',
              path: './cards'
            }
          },
          {
            name: 'runtime',
            source: {
              source: 'local',
              path: './runtime'
            }
          }
        ]
      });
    }
    if (String(filePath) === '/test/extension/dist/marketplace/plugins/runtime/claude/CLAUDE.md') {
      return '# Claude Instructions\nUse runtime workflows.';
    }
    if (String(filePath) === '/test/extension/dist/marketplace/plugins/runtime/claude/COMMIT_MESSAGE_STYLE.md') {
      return '# Commit Style\nKeep commits small.';
    }
    if (String(filePath) === '/home/node/.cards/codex/config.toml') {
      return ['model = "gpt-5"', '', '[tools]', 'web_search = true'].join('\n');
    }
    throw Object.assign(new Error(`mock: unhandled readFile: ${String(filePath)}`), { code: 'ENOENT' });
  });
  vi.mocked(fs.rm).mockResolvedValue(undefined);
  vi.mocked(fs.mkdir).mockResolvedValue(undefined);
  vi.mocked(fs.cp).mockResolvedValue(undefined);
  vi.mocked(fs.rename).mockResolvedValue(undefined);
  vi.mocked(fs.writeFile).mockResolvedValue(undefined);
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

function createMockAppServerChild(): ChildProcess {
  const child = new EventEmitter() as ChildProcess;
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();
  let initialized = false;

  stdin.setEncoding('utf-8');
  stdin.on('data', (chunk: string) => {
    for (const line of chunk.split('\n').filter((entry) => entry.length > 0)) {
      const message = JSON.parse(line) as {
        id?: number;
        method?: string;
        params?: { pluginName?: string };
      };

      if (message.method === 'initialize') {
        stdout.write(
          `${JSON.stringify({
            id: message.id,
            result: {
              userAgent: 'cards-test/0.1.0',
              codexHome: '/home/node/.cards/codex.tmp-test',
              platformFamily: 'unix',
              platformOs: 'linux'
            }
          })}\n`
        );
        stdout.write(
          `${JSON.stringify({
            method: 'configWarning',
            params: {
              summary: 'warning',
              details: null
            }
          })}\n`
        );
        continue;
      }

      if (message.method === 'initialized') {
        initialized = true;
        continue;
      }

      if (message.method === 'plugin/install') {
        if (!initialized) {
          stdout.write(
            `${JSON.stringify({
              id: message.id,
              error: {
                message: 'not initialized'
              }
            })}\n`
          );
          continue;
        }

        stdout.write(
          `${JSON.stringify({
            id: message.id,
            result: {
              authPolicy: 'ON_INSTALL',
              appsNeedingAuth: []
            }
          })}\n`
        );
      }
    }
  });

  child.pid = 23456;
  child.stdin = stdin;
  child.stdout = stdout;
  child.stderr = stderr;
  child.kill = vi.fn(() => {
    child.emit('close', 0, null);
    return true;
  }) as ChildProcess['kill'];
  child.on = child.addListener.bind(child) as ChildProcess['on'];

  return child;
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
    codingAgent: 'codex-cli',
    ...overrides
  };
}

describe('launch action — codex branch', () => {
  it('stages codex home, overlays the bundled marketplace, and spawns codex with staged CODEX_HOME', async () => {
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
    const appServerChild = createMockAppServerChild();
    const child = createMockChild();
    vi.mocked(spawn).mockImplementation((command, args) => {
      if (command === 'codex' && Array.isArray(args) && args[0] === 'app-server') {
        return appServerChild;
      }
      return child;
    });

    const action = (await import('../src/actions/launch.js')).default;
    const promise = action(baseInput(), createMockContext());
    await flushMicrotasks();

    expect(fs.cp).toHaveBeenCalledWith(
      '/home/node/.codex',
      expect.stringMatching(/\/home\/node\/\.cards\/codex\.tmp-/),
      {
        recursive: true
      }
    );
    expect(fs.cp).toHaveBeenCalledWith(
      '/test/extension/dist/codex/.agents',
      expect.stringMatching(/\/home\/node\/\.cards\/codex\.tmp-.*\/\.agents$/),
      {
        force: true,
        recursive: true
      }
    );
    expect(fs.cp).toHaveBeenCalledWith(
      '/test/extension/dist/codex/cards',
      expect.stringMatching(/\/home\/node\/\.cards\/codex\.tmp-.*\/cards$/),
      {
        force: true,
        recursive: true
      }
    );
    expect(fs.cp).toHaveBeenCalledWith(
      '/test/extension/dist/codex/runtime',
      expect.stringMatching(/\/home\/node\/\.cards\/codex\.tmp-.*\/runtime$/),
      {
        force: true,
        recursive: true
      }
    );
    expect(fs.readFile).toHaveBeenCalledWith(
      expect.stringMatching(/\/home\/node\/\.cards\/codex\.tmp-.*\/config\.toml$/),
      'utf-8'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/\/home\/node\/\.cards\/codex\.tmp-.*\/config\.toml$/),
      expect.stringContaining('[plugins."cards@local"]')
    );
    expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('[plugins."runtime@local"]'));
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/\/home\/node\/\.cards\/codex\.tmp-.*\/AGENTS\.md$/),
      expect.stringContaining('# Claude Instructions')
    );
    expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('# Commit Style'));
    expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('plugins = true'));
    expect(fs.rename).not.toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledWith(
      'codex',
      ['app-server'],
      expect.objectContaining({
        cwd: expect.stringMatching(/\/home\/node\/\.cards\/codex\.tmp-/),
        env: expect.objectContaining({
          CODEX_HOME: expect.stringMatching(/\/home\/node\/\.cards\/codex\.tmp-/)
        }),
        stdio: ['pipe', 'pipe', 'pipe']
      })
    );

    expect(spawn).toHaveBeenCalledWith(
      'codex',
      expect.arrayContaining(['--dangerously-bypass-approvals-and-sandbox']),
      expect.objectContaining({
        cwd: '/test/workspace/.worktrees/cards/card-123/1',
        stdio: 'inherit',
        env: expect.objectContaining({
          CODEX_HOME: expect.stringMatching(/\/home\/node\/\.cards\/codex\.tmp-/),
          WORKSPACE_PATH: '/test/workspace/.worktrees/cards/card-123/1',
          BASE_BRANCH: 'main',
          PARENT_BRANCH: 'main',
          WORKSPACE_BRANCH: 'cards/card-123/1'
        })
      })
    );

    const args = vi.mocked(spawn).mock.calls[1][1] as string[];
    expect(args).toContain('--cd');
    expect(args).toContain('/test/workspace/.worktrees/cards/card-123/1');
    expect(args).toContain('--add-dir');
    expect(args).toContain('/test/repo');
    expect(args).not.toContain('--config');
    expect(args[args.length - 1]).toContain('Follow the routing `<instructions>`.');
    expect(args[args.length - 1]).toContain('<routing-constraints>');
    expect(args[args.length - 1]).not.toContain('<card-repo-commit-style>');

    child.emit('close', 0);
    await promise;
  });

  it('stages codex home from CODEX_HOME when provided', async () => {
    process.env['CODEX_HOME'] = '/custom/codex-home';
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
    const appServerChild = createMockAppServerChild();
    const child = createMockChild();
    vi.mocked(spawn).mockImplementation((command, args) => {
      if (command === 'codex' && Array.isArray(args) && args[0] === 'app-server') {
        return appServerChild;
      }
      return child;
    });
    vi.mocked(fs.stat).mockImplementation(async (targetPath: string | URL) => {
      if (String(targetPath) === '/custom/codex-home') {
        return { isDirectory: () => true } as Awaited<ReturnType<typeof fs.stat>>;
      }
      throw Object.assign(new Error(`mock: unhandled stat: ${String(targetPath)}`), { code: 'ENOENT' });
    });

    const action = (await import('../src/actions/launch.js')).default;
    const promise = action(baseInput(), createMockContext());
    await flushMicrotasks();

    expect(fs.cp).toHaveBeenCalledWith('/custom/codex-home', expect.stringMatching(/\/codex\.tmp-/), {
      recursive: true
    });

    child.emit('close', 0);
    await promise;
  });

  it('creates the staged home from scratch when the source home does not exist', async () => {
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
    const appServerChild = createMockAppServerChild();
    const child = createMockChild();
    vi.mocked(spawn).mockImplementation((command, args) => {
      if (command === 'codex' && Array.isArray(args) && args[0] === 'app-server') {
        return appServerChild;
      }
      return child;
    });
    vi.mocked(fs.stat).mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }));
    vi.mocked(fs.readFile).mockImplementation(async (filePath: string | URL) => {
      if (String(filePath) === '/test/extension/dist/codex/cards/.codex-plugin/plugin.json') {
        return JSON.stringify({ name: 'cards' });
      }
      if (String(filePath) === '/test/extension/dist/codex/runtime/.codex-plugin/plugin.json') {
        return JSON.stringify({ name: 'runtime' });
      }
      if (String(filePath) === '/test/extension/dist/codex/.agents/plugins/marketplace.json') {
        return JSON.stringify({ name: 'local', plugins: [{ name: 'cards' }, { name: 'runtime' }] });
      }
      if (String(filePath) === '/test/extension/dist/marketplace/plugins/runtime/claude/CLAUDE.md') {
        return '# Claude Instructions\nUse runtime workflows.';
      }
      if (String(filePath) === '/test/extension/dist/marketplace/plugins/runtime/claude/COMMIT_MESSAGE_STYLE.md') {
        return '# Commit Style\nKeep commits small.';
      }
      throw Object.assign(new Error(`mock: unhandled readFile: ${String(filePath)}`), { code: 'ENOENT' });
    });

    const action = (await import('../src/actions/launch.js')).default;
    const promise = action(baseInput(), createMockContext());
    await flushMicrotasks();

    expect(fs.mkdir).toHaveBeenCalledWith(expect.stringMatching(/\/home\/node\/\.cards\/codex\.tmp-/), {
      recursive: true
    });
    expect(fs.cp).not.toHaveBeenCalledWith('/home/node/.codex', expect.any(String), expect.anything());

    child.emit('close', 0);
    await promise;
  });

  it('fails closed when the bundled marketplace manifest is missing', async () => {
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
    vi.mocked(fs.access).mockImplementation(async (targetPath: string | URL) => {
      if (String(targetPath) === '/test/extension/dist/codex/.agents/plugins/marketplace.json') {
        throw Object.assign(new Error('marketplace missing'), { code: 'ENOENT' });
      }
    });

    const action = (await import('../src/actions/launch.js')).default;

    await expect(action(baseInput(), createMockContext())).rejects.toThrow('marketplace missing');
    expect(spawn).not.toHaveBeenCalled();
  });

  it('fails closed when copied config.toml is malformed', async () => {
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockImplementation(async (filePath: string | URL) => {
      if (String(filePath) === '/test/extension/dist/codex/cards/.codex-plugin/plugin.json') {
        return JSON.stringify({ name: 'cards' });
      }
      if (String(filePath) === '/test/extension/dist/codex/runtime/.codex-plugin/plugin.json') {
        return JSON.stringify({ name: 'runtime' });
      }
      if (String(filePath) === '/test/extension/dist/codex/.agents/plugins/marketplace.json') {
        return JSON.stringify({ name: 'local', plugins: [{ name: 'cards' }, { name: 'runtime' }] });
      }
      if (/\/home\/node\/\.cards\/codex\.tmp-.*\/config\.toml$/.test(String(filePath))) {
        return '[broken';
      }
      throw Object.assign(new Error(`mock: unhandled readFile: ${String(filePath)}`), { code: 'ENOENT' });
    });

    const action = (await import('../src/actions/launch.js')).default;

    await expect(action(baseInput(), createMockContext())).rejects.toThrow();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('fails closed when staging directory creation fails', async () => {
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
    vi.mocked(fs.stat).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    vi.mocked(fs.mkdir).mockImplementation(async (dirPath: unknown) => {
      if (/codex\.tmp-/.test(String(dirPath))) {
        throw new Error('mkdir failed');
      }
      return undefined;
    });

    const action = (await import('../src/actions/launch.js')).default;

    await expect(action(baseInput(), createMockContext())).rejects.toThrow('mkdir failed');
    expect(spawn).not.toHaveBeenCalled();
  });

  it('registers onCancel that kills the child process', async () => {
    const { spawn } = await import('node:child_process');
    const appServerChild = createMockAppServerChild();
    const child = createMockChild();
    vi.mocked(spawn).mockImplementation((command, args) => {
      if (command === 'codex' && Array.isArray(args) && args[0] === 'app-server') {
        return appServerChild;
      }
      return child;
    });

    const context = createMockContext();
    const action = (await import('../src/actions/launch.js')).default;
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
    const appServerChild = createMockAppServerChild();
    const child = createMockChild();
    vi.mocked(spawn).mockImplementation((command, args) => {
      if (command === 'codex' && Array.isArray(args) && args[0] === 'app-server') {
        return appServerChild;
      }
      return child;
    });

    const action = (await import('../src/actions/launch.js')).default;
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

    const execCalls = vi.mocked(execFile).mock.calls;
    const mergeBaseCall = execCalls.find((call) => (call[1] as string[])?.includes('merge-base'));
    expect(mergeBaseCall).toBeUndefined();
  });

  it('rejects background-mode launch with a codingAgent-specific error and does not spawn', async () => {
    const { spawn } = await import('node:child_process');

    const action = (await import('../src/actions/launch.js')).default;

    await expect(action(baseInput({ executionMode: 'background' }), createMockContext())).rejects.toThrow(
      /does not support background-mode/
    );
    expect(spawn).not.toHaveBeenCalled();
  });
});

describe('chat action — codex branch', () => {
  it('spawns codex chat without a seeded guidance prompt', async () => {
    const { spawn } = await import('node:child_process');
    const appServerChild = createMockAppServerChild();
    const child = createMockChild();
    vi.mocked(spawn).mockImplementation((command, args) => {
      if (command === 'codex' && Array.isArray(args) && args[0] === 'app-server') {
        return appServerChild;
      }
      return child;
    });

    const action = (await import('../src/actions/chat.js')).default;
    const promise = action(baseInput({ actionName: 'Chat' }), createMockContext());
    await flushMicrotasks();

    const args = vi.mocked(spawn).mock.calls[1][1] as string[];
    expect(args).toEqual(
      expect.arrayContaining([
        '--dangerously-bypass-approvals-and-sandbox',
        '--cd',
        '/test/workspace/.worktrees/cards/card-123/1',
        '--add-dir',
        '/test/repo'
      ])
    );
    expect(args).toHaveLength(5);

    child.emit('close', 0);
    await promise;
  });
});

describe('interview action — codex branch', () => {
  it('spawns codex with an interview-routing prompt and routing trailer', async () => {
    const { spawn } = await import('node:child_process');
    const appServerChild = createMockAppServerChild();
    const child = createMockChild();
    vi.mocked(spawn).mockImplementation((command, args) => {
      if (command === 'codex' && Array.isArray(args) && args[0] === 'app-server') {
        return appServerChild;
      }
      return child;
    });

    const action = (await import('../src/actions/interview.js')).default;
    const promise = action(baseInput({ actionName: 'Interview' }), createMockContext());
    await flushMicrotasks();

    const args = vi.mocked(spawn).mock.calls[1][1] as string[];
    expect(args).toContain('--cd');
    expect(args).toContain('/test/workspace/.worktrees/cards/card-123/1');
    expect(args).toContain('--add-dir');
    expect(args).toContain('/test/repo');
    expect(args[args.length - 1]).toContain('Follow the routing `<instructions>`.');
    expect(args[args.length - 1]).toContain('<routing-constraints>');

    child.emit('close', 0);
    await promise;
  });
});
