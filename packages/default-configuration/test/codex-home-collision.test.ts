/**
 * Reproduces the CODEX_HOME collision bug where concurrent calls to
 * `prepareStagedCodexHome` race on a shared staging path, causing
 * ENOTEMPTY errors from `fs.rename`.
 *
 * @summary Tests concurrent prepareStagedCodexHome collision
 */

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

describe('prepareStagedCodexHome concurrent collision', () => {
  it('concurrent calls should produce isolated staging directories', async () => {
    const fs = await import('node:fs/promises');

    // Mock fs.access to succeed (bundle/plugin paths exist)
    vi.mocked(fs.access).mockResolvedValue(undefined);

    // Mock fs.readFile to return valid manifests
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('plugin.json')) {
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

    // Track all paths passed to fs.rename
    const renameCalls: Array<{ from: string; to: string }> = [];
    vi.mocked(fs.rename).mockImplementation(async (oldPath: unknown, newPath: unknown) => {
      renameCalls.push({ from: String(oldPath), to: String(newPath) });
    });

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

  it('fs.rename fails with ENOTEMPTY when another process occupies the staging path', async () => {
    const fs = await import('node:fs/promises');

    vi.mocked(fs.access).mockResolvedValue(undefined);

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      const p = String(filePath);
      if (p.endsWith('plugin.json')) {
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

    // Simulate the race: first rename succeeds, second fails with ENOTEMPTY
    // because another concurrent call already placed a directory at the destination.
    let renameCallCount = 0;
    vi.mocked(fs.rename).mockImplementation(async () => {
      renameCallCount++;
      if (renameCallCount > 1) {
        throw Object.assign(new Error('ENOTEMPTY: directory not empty, rmdir'), {
          code: 'ENOTEMPTY'
        });
      }
    });

    const { prepareStagedCodexHome } = await import('../src/lib/codex-session.js');

    // Both calls should succeed — the function should handle the collision gracefully.
    // Currently, the second call will throw ENOTEMPTY because the shared destination
    // was already populated by the first call.
    const results = await Promise.allSettled([
      prepareStagedCodexHome('/test/marketplace'),
      prepareStagedCodexHome('/test/marketplace')
    ]);

    // Assert both calls succeeded (this will fail because the second one throws)
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');
  });
});
