/**
 * Exercises Codex action behavior through focused scenarios.
 * The cases lock in staged-home preparation so runtime plugin loading does not
 * drift during refactors.
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

    if (cwd === '/test/repo' && key.startsWith('git log -5 --pretty=format:%x00%h - %an: %s --name-only -- .')) {
      return '\u0000123abcd - Test User: Add card plan\nPLAN.md\nCARD.md';
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
      key === 'git log --no-walk --pretty=format:%H %h - %s --name-only aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    ) {
      return ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa abcdef1 - Branch change', '', 'src/feature.ts'].join('\n');
    }
    if (
      cwd === '/test/workspace' &&
      key === 'git log --no-walk --pretty=format:%H %h - %s --name-only bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    ) {
      return ['bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb bcdefg2 - Merged fix', '', 'src/fix.ts'].join('\n');
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
      name: 'PLAN.md',
      isDirectory: () => false,
      isFile: () => true
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

  it('exports a codex chat action command', async () => {
    const action = (await import('../src/actions/codex-chat.js')).default;
    expect(action.factoryType).toBe('action');
    expect(action.actionName).toBe('Codex Chat');
  });

  it('stages codex home from the default source, overlays the bundled marketplace, and spawns codex with staged CODEX_HOME', async () => {
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/codex.js')).default;
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
      expect.stringContaining('[plugins."runtime@local"]')
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/\/home\/node\/\.cards\/codex\.tmp-.*\/AGENTS\.md$/),
      expect.stringContaining('# Claude Instructions')
    );
    expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('# Commit Style'));
    expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('plugins = true'));
    expect(fs.rename).not.toHaveBeenCalled();

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

    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    expect(args).toContain('--cd');
    expect(args).toContain('/test/workspace/.worktrees/cards/card-123/1');
    expect(args).toContain('--add-dir');
    expect(args).toContain('/test/repo');
    expect(args).not.toContain('--config');
    expect(args[args.length - 1]).toContain('<card id="card-123" status="active" mode="interactive">');
    expect(args[args.length - 1]).toContain('<card-repo>');
    expect(args[args.length - 1]).toContain('<card-repo-log count="3">');
    expect(args[args.length - 1]).toContain(
      '<workspace-repo-log branch="cards/card-123/1" parentBranch="main" count="1">'
    );
    expect(args[args.length - 1]).toContain('<workspace-repo-log branch="main" count="1">');
    expect(args[args.length - 1]).toContain('CARD_REPO_PATH=/test/repo');
    expect(args[args.length - 1]).toContain('WORKSPACE_PATH=/test/workspace/.worktrees/cards/card-123/1');
    expect(args[args.length - 1]).toContain('BASE_BRANCH=main');
    expect(args[args.length - 1]).toContain('WORKSPACE_BRANCH=cards/card-123/1');
    expect(args[args.length - 1]).toContain('Continue work on the card.');

    child.emit('close', 0);
    await promise;
  });

  it('spawns codex chat without an initial prompt', async () => {
    const { spawn } = await import('node:child_process');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);

    const action = (await import('../src/actions/codex-chat.js')).default;
    const promise = action(baseInput({ actionName: 'Codex Chat' }), createMockContext());
    await flushMicrotasks();

    const args = vi.mocked(spawn).mock.calls[0][1] as string[];
    expect(args).toEqual([
      '--dangerously-bypass-approvals-and-sandbox',
      '--cd',
      '/test/workspace/.worktrees/cards/card-123/1',
      '--add-dir',
      '/test/repo'
    ]);

    child.emit('close', 0);
    await promise;
  });

  it('prepends additional context only when a prompt is provided', async () => {
    const { buildAdditionalContext, buildCodexPrompt } = await import('../src/lib/codex-session.js');

    const additionalContext = buildAdditionalContext(
      baseInput(),
      '/test/workspace/.worktrees/cards/card-123/1',
      'main',
      'cards/card-123/1'
    );

    expect(additionalContext).toContain('<card id="card-123" status="active" mode="interactive">');
    expect(additionalContext).toContain('title: Test card');
    expect(additionalContext).toContain('<card-repo>');
    expect(additionalContext).toContain('CARD.md');
    expect(additionalContext).toContain('<card-repo-log count="3">');
    expect(additionalContext).toContain('123abcd - Test User: Add card plan');
    expect(additionalContext).toContain('<workspace-repo-log branch="cards/card-123/1" parentBranch="main" count="1">');
    expect(additionalContext).toContain('abcdef1 - Branch change [merged]');
    expect(additionalContext).toContain('<workspace-repo-log branch="main" count="1">');
    expect(additionalContext).toContain('bcdefg2 - Merged fix');

    expect(buildCodexPrompt('Continue work on the card.', additionalContext)).toBe(
      `${additionalContext}\n\nContinue work on the card.`
    );
    expect(buildCodexPrompt(undefined, additionalContext)).toBeUndefined();
  });

  it('stages codex home from CODEX_HOME when provided', async () => {
    process.env['CODEX_HOME'] = '/custom/codex-home';
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);
    vi.mocked(fs.stat).mockImplementation(async (targetPath: string | URL) => {
      if (String(targetPath) === '/custom/codex-home') {
        return { isDirectory: () => true } as Awaited<ReturnType<typeof fs.stat>>;
      }
      throw Object.assign(new Error(`mock: unhandled stat: ${String(targetPath)}`), { code: 'ENOENT' });
    });

    const action = (await import('../src/actions/codex.js')).default;
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
    const child = createMockChild();
    vi.mocked(spawn).mockReturnValue(child);
    vi.mocked(fs.stat).mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }));
    vi.mocked(fs.readFile).mockImplementation(async (filePath: string | URL) => {
      if (String(filePath) === '/test/extension/dist/codex/runtime/.codex-plugin/plugin.json') {
        return JSON.stringify({ name: 'runtime' });
      }
      if (String(filePath) === '/test/extension/dist/codex/.agents/plugins/marketplace.json') {
        return JSON.stringify({ name: 'local', plugins: [] });
      }
      if (String(filePath) === '/test/extension/dist/marketplace/plugins/runtime/claude/CLAUDE.md') {
        return '# Claude Instructions\nUse runtime workflows.';
      }
      if (String(filePath) === '/test/extension/dist/marketplace/plugins/runtime/claude/COMMIT_MESSAGE_STYLE.md') {
        return '# Commit Style\nKeep commits small.';
      }
      throw Object.assign(new Error(`mock: unhandled readFile: ${String(filePath)}`), { code: 'ENOENT' });
    });

    const action = (await import('../src/actions/codex.js')).default;
    const promise = action(baseInput(), createMockContext());
    await flushMicrotasks();

    expect(fs.mkdir).toHaveBeenCalledWith(expect.stringMatching(/\/home\/node\/\.cards\/codex\.tmp-/), {
      recursive: true
    });
    expect(fs.cp).not.toHaveBeenCalledWith('/home/node/.codex', expect.any(String), expect.anything());

    child.emit('close', 0);
    await promise;
  });

  it('preserves unrelated config settings while enabling the runtime plugin', async () => {
    const { mergeCodexRuntimeConfig } = await import('../src/lib/codex-session.js');
    const fs = await import('node:fs/promises');

    await mergeCodexRuntimeConfig('/home/node/.cards/codex');

    const writtenConfig = vi.mocked(fs.writeFile).mock.calls[0]?.[1];
    expect(typeof writtenConfig).toBe('string');
    expect(writtenConfig).toContain('model = "gpt-5"');
    expect(writtenConfig).toContain('[tools]');
    expect(writtenConfig).toContain('web_search = true');
    expect(writtenConfig).toContain('[features]');
    expect(writtenConfig).toContain('plugins = true');
    expect(writtenConfig).toContain('[plugins."runtime@local"]');
    expect(writtenConfig).toContain('enabled = true');
  });

  it('creates AGENTS.md from packaged Claude instructions when none exists', async () => {
    const { mergeCodexAgentsInstructions } = await import('../src/lib/codex-session.js');
    const fs = await import('node:fs/promises');

    await mergeCodexAgentsInstructions('/home/node/.cards/codex', '/test/extension/dist/marketplace');

    expect(fs.writeFile).toHaveBeenCalledWith(
      '/home/node/.cards/codex/AGENTS.md',
      '# Claude Instructions\nUse runtime workflows.\n\n# Commit Style\nKeep commits small.\n'
    );
  });

  it('appends packaged Claude instructions to an existing AGENTS.md file', async () => {
    const { mergeCodexAgentsInstructions } = await import('../src/lib/codex-session.js');
    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockImplementation(async (filePath: string | URL) => {
      if (String(filePath) === '/test/extension/dist/marketplace/plugins/runtime/claude/CLAUDE.md') {
        return '# Claude Instructions\nUse runtime workflows.';
      }
      if (String(filePath) === '/test/extension/dist/marketplace/plugins/runtime/claude/COMMIT_MESSAGE_STYLE.md') {
        return '# Commit Style\nKeep commits small.';
      }
      if (String(filePath) === '/home/node/.cards/codex/AGENTS.md') {
        return '# Existing Agents\nPrior instructions.';
      }
      throw Object.assign(new Error(`mock: unhandled readFile: ${String(filePath)}`), { code: 'ENOENT' });
    });

    await mergeCodexAgentsInstructions('/home/node/.cards/codex', '/test/extension/dist/marketplace');

    expect(fs.writeFile).toHaveBeenCalledWith(
      '/home/node/.cards/codex/AGENTS.md',
      '# Existing Agents\nPrior instructions.\n\n# Claude Instructions\nUse runtime workflows.\n\n# Commit Style\nKeep commits small.\n'
    );
  });

  it('fails closed when the bundled marketplace manifest is missing', async () => {
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
    vi.mocked(fs.access).mockImplementation(async (targetPath: string | URL) => {
      if (String(targetPath) === '/test/extension/dist/codex/.agents/plugins/marketplace.json') {
        throw Object.assign(new Error('marketplace missing'), { code: 'ENOENT' });
      }
    });

    const action = (await import('../src/actions/codex.js')).default;

    await expect(action(baseInput(), createMockContext())).rejects.toThrow('marketplace missing');
    expect(spawn).not.toHaveBeenCalled();
  });

  it('fails closed when copied config.toml is malformed', async () => {
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockImplementation(async (filePath: string | URL) => {
      if (String(filePath) === '/test/extension/dist/codex/runtime/.codex-plugin/plugin.json') {
        return JSON.stringify({ name: 'runtime' });
      }
      if (String(filePath) === '/test/extension/dist/codex/.agents/plugins/marketplace.json') {
        return JSON.stringify({ name: 'local', plugins: [] });
      }
      if (/\/home\/node\/\.cards\/codex\.tmp-.*\/config\.toml$/.test(String(filePath))) {
        return '[broken';
      }
      throw Object.assign(new Error(`mock: unhandled readFile: ${String(filePath)}`), { code: 'ENOENT' });
    });

    const action = (await import('../src/actions/codex.js')).default;

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

    const action = (await import('../src/actions/codex.js')).default;

    await expect(action(baseInput(), createMockContext())).rejects.toThrow('mkdir failed');
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

    const execCalls = vi.mocked(execFile).mock.calls;
    const mergeBaseCall = execCalls.find((call) => (call[1] as string[])?.includes('merge-base'));
    expect(mergeBaseCall).toBeUndefined();
  });
});
