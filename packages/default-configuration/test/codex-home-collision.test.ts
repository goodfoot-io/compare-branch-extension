/**
 * Reproduces the CODEX_HOME collision bug where concurrent calls to
 * `prepareStagedCodexHome` race on a shared staging path.
 *
 * @summary Tests concurrent prepareStagedCodexHome collision
 */

import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@cards/sdk', () => ({
  resolveGlobalCardsConfigDir: vi.fn(() => '/mock/cards-config')
}));

vi.mock('@cards/sdk/worktree', () => ({
  createWorktree: vi.fn(),
  checkWorktreeExists: vi.fn(),
  findGitRoots: vi.fn()
}));

vi.mock('../src/lib/branch-cleanup-watcher.js', () => ({
  spawnBranchCleanupWatcher: vi.fn()
}));

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env['CODEX_HOME'];
  delete process.env['CARDS_HOME'];
  delete process.env['XDG_DATA_HOME'];
  delete process.env['XDG_CONFIG_HOME'];
});

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
      };

      if (message.method === 'initialize') {
        stdout.write(
          `${JSON.stringify({
            id: message.id,
            result: {
              userAgent: 'collision-test/0.1.0',
              codexHome: '/mock/cards-config/codex.tmp-test',
              platformFamily: 'unix',
              platformOs: 'linux'
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
        stdout.write(
          `${JSON.stringify(
            initialized
              ? {
                  id: message.id,
                  result: {
                    authPolicy: 'ON_INSTALL',
                    appsNeedingAuth: []
                  }
                }
              : {
                  id: message.id,
                  error: {
                    message: 'not initialized'
                  }
                }
          )}\n`
        );
      }
    }
  });

  child.pid = 45678;
  child.stdin = stdin;
  child.stdout = stdout;
  child.stderr = stderr;
  child.kill = vi.fn(() => {
    child.emit('close', 0, null);
    return true;
  }) as ChildProcess['kill'];
  child.on = child.addListener.bind(child) as ChildProcess['on'];
  child.once = child.once.bind(child) as ChildProcess['once'];

  return child;
}

describe('prepareStagedCodexHome concurrent collision', () => {
  it('concurrent calls should produce isolated staging directories', async () => {
    const fs = await import('node:fs/promises');
    const { spawn } = await import('node:child_process');

    vi.mocked(spawn).mockImplementation((command, args) => {
      if (command === 'codex' && Array.isArray(args) && args[0] === 'app-server') {
        return createMockAppServerChild();
      }
      throw new Error(`mock: unexpected spawn ${command} ${(args ?? []).join(' ')}`);
    });

    // Mock fs.access to succeed (bundle/plugin paths exist)
    vi.mocked(fs.access).mockResolvedValue(undefined);

    // Mock fs.readFile to return valid manifests for both bundled plugins.
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('/cards/.codex-plugin/plugin.json')) {
        return JSON.stringify({ name: 'cards' });
      }
      if (p.endsWith('/runtime/.codex-plugin/plugin.json')) {
        return JSON.stringify({ name: 'runtime' });
      }
      if (p.endsWith('marketplace.json')) {
        return JSON.stringify({ name: 'local' });
      }
      if (p.endsWith('config.toml')) {
        return '';
      }
      if (p.endsWith('agents.md') || p.endsWith('AGENTS.md')) {
        return '';
      }
      return '';
    });

    // Mock fs.readdir to return empty dirs (no entries to copy)
    vi.mocked(fs.readdir).mockResolvedValue([]);

    // Mock fs.mkdir, fs.rm, fs.cp, fs.writeFile to succeed
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.rm).mockResolvedValue(undefined);
    vi.mocked(fs.cp).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);

    // Mock fs.stat to make resolveExistingDirectory return false (no source home)
    vi.mocked(fs.stat).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    vi.mocked(fs.rename).mockResolvedValue(undefined);

    const { prepareStagedCodexHome } = await import('../src/lib/codex-session.js');

    // Run two concurrent calls
    const [result1, result2] = await Promise.all([
      prepareStagedCodexHome('/test/marketplace'),
      prepareStagedCodexHome('/test/marketplace')
    ]);

    // Both calls should succeed
    expect(result1.stagedCodexHome).toBeDefined();
    expect(result2.stagedCodexHome).toBeDefined();

    // The bug: both calls rename to the SAME destination path, causing a collision.
    // A correct implementation would give each call an isolated staging directory
    // so concurrent calls don't race on the same destination.
    expect(result1.stagedCodexHome).not.toBe(result2.stagedCodexHome);
  });

  it('does not depend on fs.rename when concurrent calls stage isolated directories', async () => {
    const fs = await import('node:fs/promises');
    const { spawn } = await import('node:child_process');

    vi.mocked(spawn).mockImplementation((command, args) => {
      if (command === 'codex' && Array.isArray(args) && args[0] === 'app-server') {
        return createMockAppServerChild();
      }
      throw new Error(`mock: unexpected spawn ${command} ${(args ?? []).join(' ')}`);
    });

    vi.mocked(fs.access).mockResolvedValue(undefined);

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('/cards/.codex-plugin/plugin.json')) {
        return JSON.stringify({ name: 'cards' });
      }
      if (p.endsWith('/runtime/.codex-plugin/plugin.json')) {
        return JSON.stringify({ name: 'runtime' });
      }
      if (p.endsWith('marketplace.json')) {
        return JSON.stringify({ name: 'local' });
      }
      if (p.endsWith('config.toml')) {
        return '';
      }
      return '';
    });

    vi.mocked(fs.readdir).mockResolvedValue([]);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.rm).mockResolvedValue(undefined);
    vi.mocked(fs.cp).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.stat).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    vi.mocked(fs.rename).mockRejectedValue(
      Object.assign(new Error('rename should not be used'), { code: 'ENOTEMPTY' })
    );

    const { prepareStagedCodexHome } = await import('../src/lib/codex-session.js');

    const results = await Promise.allSettled([
      prepareStagedCodexHome('/test/marketplace'),
      prepareStagedCodexHome('/test/marketplace')
    ]);

    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');
    expect(fs.rename).not.toHaveBeenCalled();
  });
});
