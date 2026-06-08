/**
 * Exercises Codex session library helpers through focused scenarios.
 * The cases lock in context assembly, config merging, Codex-skill translation,
 * and AGENTS.md composition so refactors do not drift the packaged Codex
 * runtime contract.
 *
 * @summary Tests Codex session library helpers
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// Bundled hook definitions, imported as JSON modules (not via the mocked
// `node:fs`) so the trust-seeding tests below feed production code the real
// command strings the ground-truth hashes were captured from.
import assistantHooksJson from '../../../codex/cards-assistant/hooks/hooks.json';
import runtimeHooksJson from '../../../codex/runtime/hooks/hooks.json';

/**
 * Production code builds paths with node:path, so on Windows the values passed
 * to fs mocks use backslash separators. Normalize to forward slashes so the
 * POSIX-keyed mock lookups below match regardless of platform.
 *
 * @param p - Path-like value (string, Buffer, or URL) to normalize.
 * @returns The value stringified with backslashes converted to forward slashes.
 */
function toPosix(p: unknown): string {
  return String(p).replace(/\\/g, '/');
}

const TEST_CODEX_PLUGIN_VERSIONS = {
  cards: 'cards-test-version',
  runtime: 'runtime-test-version'
} as const;

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
  mkdtemp: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn()
}));

beforeEach(async () => {
  vi.clearAllMocks();
  process.env['EXTENSION_PATH'] = '/test/extension';
  process.env['MARKETPLACE_PATH'] = '/test/extension/dist/marketplace';
  process.env['API_TEST_MODE'] = '1';
  delete process.env['CODEX_HOME'];
  delete process.env['CARDS_HOME'];
  delete process.env['XDG_DATA_HOME'];
  delete process.env['XDG_CONFIG_HOME'];

  const fs = await import('node:fs/promises');
  vi.mocked(fs.writeFile).mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env['API_TEST_MODE'];
});

describe('codex-session library', () => {
  /**
   * Wires the fs mocks needed for a successful `populateCodexPluginCache` run:
   * bundle/plugin paths resolve, manifests parse, and all writes succeed.
   *
   * @returns The mocked `node:fs/promises` module for per-test assertions.
   */
  async function mockSuccessfulCacheFs(): Promise<typeof import('node:fs/promises')> {
    const fs = await import('node:fs/promises');
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      const p = toPosix(filePath);
      // Plugin manifests resolve for bundle, staged, and published load paths.
      if (
        p.endsWith('.codex-plugin/plugin.json') &&
        (/(^|\/)cards\//.test(p) || p.includes(`/${TEST_CODEX_PLUGIN_VERSIONS.cards}/`))
      ) {
        return JSON.stringify({ name: 'cards', version: TEST_CODEX_PLUGIN_VERSIONS.cards });
      }
      if (
        p.endsWith('.codex-plugin/plugin.json') &&
        (/(^|\/)runtime\//.test(p) || p.includes(`/${TEST_CODEX_PLUGIN_VERSIONS.runtime}/`))
      ) {
        return JSON.stringify({ name: 'runtime', version: TEST_CODEX_PLUGIN_VERSIONS.runtime });
      }
      if (p.endsWith('marketplace.json')) {
        return JSON.stringify({ name: 'local' });
      }
      throw Object.assign(new Error(`mock: unhandled readFile: ${String(filePath)}`), { code: 'ENOENT' });
    });
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    // mkdtemp returns the staging dir the install renames its version child out of.
    vi.mocked(fs.mkdtemp).mockImplementation(async (prefix: unknown) => `${toPosix(prefix)}XXXXXX`);
    vi.mocked(fs.cp).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);
    vi.mocked(fs.rm).mockResolvedValue(undefined);
    // No sibling version dirs to prune in the unit fixture.
    vi.mocked(fs.readdir).mockResolvedValue([]);
    return fs;
  }

  it('buildCodexArgs enables plugins via --profile, not -c plugin flags', async () => {
    const { buildCodexArgs } = await import('../src/lib/codex-session.js');

    const args = buildCodexArgs('do the thing', '/test/workspace', '/test/repo', 'be helpful');

    // Enablement is supplied by the Cards profile-v2 layer, selected here.
    expect(args[args.indexOf('--profile') + 1]).toBe('cards');

    // The retired runtime per-plugin / features -c flags must be gone — they
    // landed in the SessionFlags layer and never enabled the plugins.
    const cFlagValues = args.filter((_arg, index) => args[index - 1] === '-c');
    expect(cFlagValues).not.toContain('features.plugins=true');
    expect(cFlagValues.some((value) => value.startsWith('plugins.'))).toBe(false);

    // Existing args are preserved.
    expect(args).toContain('--dangerously-bypass-approvals-and-sandbox');
    expect(args[args.indexOf('--cd') + 1]).toBe('/test/workspace');
    expect(args[args.indexOf('--add-dir') + 1]).toBe('/test/repo');
    // developer_instructions is still injected via -c.
    expect(cFlagValues.some((value) => value.startsWith('developer_instructions'))).toBe(true);
    expect(args[args.length - 1]).toBe('do the thing');
  });

  it('readCardRepoAgentsMd returns the trimmed AGENTS.md contents', async () => {
    const syncFs = await import('node:fs');
    vi.mocked(syncFs.readFileSync).mockImplementation((filePath: string | Buffer | URL) => {
      if (toPosix(filePath) === '/test/repo/AGENTS.md') {
        return '\n\n# Card Repository Reference\n\nCommit everything that must persist.\n\n';
      }
      throw Object.assign(new Error(`mock: unhandled readFileSync: ${String(filePath)}`), { code: 'ENOENT' });
    });
    const { readCardRepoAgentsMd } = await import('../src/lib/codex-session.js');

    expect(readCardRepoAgentsMd('/test/repo')).toBe(
      '# Card Repository Reference\n\nCommit everything that must persist.'
    );
  });

  it('readCardRepoAgentsMd fails closed when AGENTS.md is unreadable', async () => {
    const syncFs = await import('node:fs');
    vi.mocked(syncFs.readFileSync).mockImplementation((filePath: string | Buffer | URL) => {
      throw Object.assign(new Error(`ENOENT: ${String(filePath)}`), { code: 'ENOENT' });
    });
    const { readCardRepoAgentsMd, CardRepoAccessError } = await import('../src/lib/codex-session.js');

    expect(() => readCardRepoAgentsMd('/test/repo')).toThrow(CardRepoAccessError);
  });

  it('composeDeveloperInstructions orders fragments and drops empty ones', async () => {
    const { composeDeveloperInstructions } = await import('../src/lib/codex-session.js');

    // Card-repo AGENTS.md leads; caller guidance follows.
    expect(composeDeveloperInstructions(['AGENTS', 'SKILL'])).toBe('AGENTS\n\nSKILL');
    // Whitespace is trimmed and blank/undefined fragments are skipped.
    expect(composeDeveloperInstructions(['  AGENTS  ', undefined, '', '   ', 'SKILL'])).toBe('AGENTS\n\nSKILL');
    // A single surviving fragment is returned without a separator.
    expect(composeDeveloperInstructions([undefined, 'AGENTS'])).toBe('AGENTS');
    // All-empty input collapses to undefined so no -c flag is emitted.
    expect(composeDeveloperInstructions([undefined, '   '])).toBeUndefined();
    expect(composeDeveloperInstructions([])).toBeUndefined();
  });

  it('writeCodexProfileConfig writes the enablement profile without touching config.toml', async () => {
    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    const { writeCodexProfileConfig } = await import('../src/lib/codex-session.js');

    const profilePath = await writeCodexProfileConfig('/test/codexhome');

    expect(toPosix(profilePath)).toBe('/test/codexhome/cards.config.toml');
    const writes = vi.mocked(fs.writeFile).mock.calls.map((call) => toPosix(call[0]));
    expect(writes).toEqual(['/test/codexhome/cards.config.toml']);
    // The user's own config.toml is never written.
    expect(writes).not.toContain('/test/codexhome/config.toml');
    const written = String(vi.mocked(fs.writeFile).mock.calls[0]![1]);
    expect(written).toContain('[features]');
    expect(written).toContain('plugins = true');
    expect(written).toContain('[plugins."cards@local"]');
    expect(written).toContain('[plugins."runtime@local"]');
    expect(written).toContain('enabled = true');
  });

  it('writeCodexProfileConfig fails closed on a legacy profile collision', async () => {
    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockResolvedValue('[profiles.cards]\nmodel = "x"\n');
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    const { writeCodexProfileConfig } = await import('../src/lib/codex-session.js');

    await expect(writeCodexProfileConfig('/test/codexhome')).rejects.toThrow(/legacy/i);
    // It must not write the profile when codex would reject the launch.
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('writeCodexProfileConfig writes the assistant profile enabling cards + cards-assistant, not runtime', async () => {
    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    const { writeCodexProfileConfig } = await import('../src/lib/codex-session.js');

    const profilePath = await writeCodexProfileConfig('/test/codexhome', {
      profileName: 'cards-assistant',
      pluginNames: ['cards', 'cards-assistant']
    });

    // The assistant profile lands in its own <home>/cards-assistant.config.toml file.
    expect(toPosix(profilePath)).toBe('/test/codexhome/cards-assistant.config.toml');
    const writes = vi.mocked(fs.writeFile).mock.calls.map((call) => toPosix(call[0]));
    expect(writes).toEqual(['/test/codexhome/cards-assistant.config.toml']);

    const written = String(vi.mocked(fs.writeFile).mock.calls[0]![1]);
    expect(written).toContain('[features]');
    expect(written).toContain('plugins = true');
    expect(written).toContain('[plugins."cards@local"]');
    expect(written).toContain('[plugins."cards-assistant@local"]');
    expect(written).toContain('enabled = true');
    // The assistant session must NOT enable the runtime plugin.
    expect(written).not.toContain('runtime@local');
  });

  it('writeCodexProfileConfig seeds hooks.state from the runtime bundle hooks.json', async () => {
    const runtimeHooks = JSON.stringify(runtimeHooksJson);
    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      const p = toPosix(filePath);
      if (p.endsWith('/config.toml')) {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      }
      if (p === '/cache/runtime/hooks/hooks.json') {
        return runtimeHooks;
      }
      throw Object.assign(new Error(`mock: unhandled readFile: ${p}`), { code: 'ENOENT' });
    });
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    const { writeCodexProfileConfig } = await import('../src/lib/codex-session.js');

    await writeCodexProfileConfig('/test/codexhome', {
      pluginCachePaths: { cards: '/cache/cards', runtime: '/cache/runtime' }
    });

    const written = String(vi.mocked(fs.writeFile).mock.calls[0]![1]);
    // All five runtime keys/hashes land as top-level [hooks.state."…"] tables.
    expect(written).toContain(
      '[hooks.state."runtime@local:hooks/hooks.json:session_start:0:0"]\ntrusted_hash = "sha256:21d730d0414d7091677bd53ef201c488c18439fc3ac718785df55646241eaae8"'
    );
    expect(written).toContain('"runtime@local:hooks/hooks.json:session_start:1:0"');
    expect(written).toContain('sha256:6146bc10073c31e58aa110b6221c8876f1111120ff014cb6382dc556e27e38a9');
    expect(written).toContain('"runtime@local:hooks/hooks.json:subagent_start:0:0"');
    expect(written).toContain('sha256:0bd046db0832f7f396d80a6c048087a24b2d17ed59c9d6113ef07c02f3bf8fdd');
    expect(written).toContain('"runtime@local:hooks/hooks.json:subagent_stop:0:0"');
    expect(written).toContain('sha256:66e82567070ae6fb22862a19bcdb46ef3bd4517dca31c385705baf6e9aa56c99');
    expect(written).toContain('"runtime@local:hooks/hooks.json:stop:0:0"');
    expect(written).toContain('sha256:295405e4ed87f8b94dbe4959dd53247b1f0de243566a5926292fd56de2ba4f23');
    // No bypass flag is involved — trust comes entirely from the profile.
    expect(written).not.toContain('bypass');
  });

  it('writeCodexProfileConfig seeds only the assistant bundle, never runtime, for the assistant profile', async () => {
    const assistantHooks = JSON.stringify(assistantHooksJson);
    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      const p = toPosix(filePath);
      if (p.endsWith('/config.toml')) {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      }
      if (p === '/cache/cards-assistant/hooks/hooks.json') {
        return assistantHooks;
      }
      throw Object.assign(new Error(`mock: unhandled readFile: ${p}`), { code: 'ENOENT' });
    });
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    const { writeCodexProfileConfig } = await import('../src/lib/codex-session.js');

    await writeCodexProfileConfig('/test/codexhome', {
      profileName: 'cards-assistant',
      pluginNames: ['cards', 'cards-assistant'],
      pluginCachePaths: { cards: '/cache/cards', 'cards-assistant': '/cache/cards-assistant' }
    });

    const written = String(vi.mocked(fs.writeFile).mock.calls[0]![1]);
    expect(written).toContain(
      '[hooks.state."cards-assistant@local:hooks/hooks.json:session_start:0:0"]\ntrusted_hash = "sha256:21d730d0414d7091677bd53ef201c488c18439fc3ac718785df55646241eaae8"'
    );
    // The assistant profile must never carry runtime trust entries.
    expect(written).not.toContain('runtime@local');
  });

  it('writeCodexProfileConfig writes no hooks.state when no enabled plugin ships hooks.json', async () => {
    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      const p = toPosix(filePath);
      if (p.endsWith('/config.toml')) {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      }
      // No hooks.json on disk for the enabled plugin → fall through to ENOENT.
      throw Object.assign(new Error(`ENOENT: ${p}`), { code: 'ENOENT' });
    });
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    const { writeCodexProfileConfig } = await import('../src/lib/codex-session.js');

    await writeCodexProfileConfig('/test/codexhome', {
      pluginNames: ['cards'],
      pluginCachePaths: { cards: '/cache/cards' }
    });

    const written = String(vi.mocked(fs.writeFile).mock.calls[0]![1]);
    expect(written).not.toContain('hooks.state');
  });

  it('writeCodexProfileConfig fails closed with a path-named error on a malformed bundle hooks.json', async () => {
    const fs = await import('node:fs/promises');
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      const p = toPosix(filePath);
      if (p.endsWith('/config.toml')) {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      }
      // The bundle hooks.json is present but corrupt (truncated JSON).
      if (p === '/cache/runtime/hooks/hooks.json') {
        return '{ "hooks": ';
      }
      throw Object.assign(new Error(`mock: unhandled readFile: ${p}`), { code: 'ENOENT' });
    });
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    const { writeCodexProfileConfig } = await import('../src/lib/codex-session.js');

    const promise = writeCodexProfileConfig('/test/codexhome', {
      pluginCachePaths: { cards: '/cache/cards', runtime: '/cache/runtime' }
    });
    // The error names the offending path and identifies a bundle-integrity failure.
    await expect(promise).rejects.toThrow(/\/cache\/runtime\/hooks\/hooks\.json/);
    await expect(promise).rejects.toThrow(/Corrupt Cards bundle/i);
    // A corrupt bundle must abort the launch, not write a profile.
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('writeCodexProfileConfig fails closed on a legacy collision with the assistant profile name', async () => {
    const fs = await import('node:fs/promises');
    // A legacy [profiles.cards-assistant] table is present, but no [profiles.cards].
    vi.mocked(fs.readFile).mockResolvedValue('[profiles.cards-assistant]\nmodel = "x"\n');
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    const { writeCodexProfileConfig } = await import('../src/lib/codex-session.js');

    await expect(
      writeCodexProfileConfig('/test/codexhome', {
        profileName: 'cards-assistant',
        pluginNames: ['cards', 'cards-assistant']
      })
    ).rejects.toThrow(/cards-assistant/);
    // It must not write the profile when codex would reject the launch.
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('populateCodexPluginCache respects CODEX_HOME env override', async () => {
    process.env['CODEX_HOME'] = '/alt/home';
    const fs = await mockSuccessfulCacheFs();
    const { populateCodexPluginCache, resolveDefaultCodexHome } = await import('../src/lib/codex-session.js');

    await populateCodexPluginCache(resolveDefaultCodexHome(), '/test/extension/dist/marketplace');

    const cpDestinations = vi.mocked(fs.cp).mock.calls.map((call) => toPosix(call[1]));
    expect(cpDestinations.length).toBeGreaterThan(0);
    expect(cpDestinations.every((dest) => dest.startsWith('/alt/home/plugins/cache/local/'))).toBe(true);
  });

  it('populateCodexPluginCache does not touch config.toml', async () => {
    const fs = await mockSuccessfulCacheFs();
    const { populateCodexPluginCache } = await import('../src/lib/codex-session.js');

    await populateCodexPluginCache('/test/codexhome', '/test/extension/dist/marketplace');

    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('populateCodexPluginCache propagates cache-write errors (fail closed)', async () => {
    const fs = await mockSuccessfulCacheFs();
    vi.mocked(fs.mkdir).mockRejectedValue(Object.assign(new Error('EACCES'), { code: 'EACCES' }));
    const { populateCodexPluginCache } = await import('../src/lib/codex-session.js');

    await expect(populateCodexPluginCache('/test/codexhome', '/test/extension/dist/marketplace')).rejects.toMatchObject(
      {
        code: 'EACCES'
      }
    );
  });

  it('uses translated Codex skills instead of Claude CLI env vars', async () => {
    const cardsApiSkill = (await import('../../../codex/cards/skills/management/SKILL.md')).default;
    const notesSkill = (await import('../../../codex/cards/skills/notes/SKILL.md')).default;
    const implementationSkill = (await import('../../../codex/runtime/skills/card/references/implementation.md'))
      .default;
    const blockedSkill = (await import('../../../codex/runtime/skills/card/references/blocked.md')).default;

    expect(cardsApiSkill).not.toContain('$CARD_CLI');
    expect(cardsApiSkill).not.toContain('$NOTIFICATION_CLI');
    expect(cardsApiSkill).not.toContain('$COMPARE_CLI');
    expect(notesSkill).not.toContain('$CARD_CLI');
    expect(implementationSkill).not.toContain('$CREATE_WORKTREE_CLI');
    expect(blockedSkill).not.toContain('$CARD_CLI');
  });
});
