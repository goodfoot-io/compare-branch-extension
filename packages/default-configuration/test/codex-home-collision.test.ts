/**
 * Reproduces the CODEX_HOME collision bug where concurrent calls to
 * `prepareStagedCodexHome` race on a shared staging path.
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
