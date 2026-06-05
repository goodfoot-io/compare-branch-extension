/**
 * Exercises Codex session library helpers through focused scenarios.
 * The cases lock in context assembly, config merging, Codex-skill translation,
 * and AGENTS.md composition so refactors do not drift the packaged Codex
 * runtime contract.
 *
 * @summary Tests Codex session library helpers
 */

import type { ActionInput } from '@cards/sdk/config';
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

  const { execFileSync } = await import('node:child_process');
  const fs = await import('node:fs/promises');
  const syncFs = await import('node:fs');

  vi.mocked(execFileSync).mockImplementation((command: string, args?: readonly string[], options?: unknown) => {
    const normalizedArgs = [...(args ?? [])];
    const cwd =
      options && typeof options === 'object' && options !== null && 'cwd' in options
        ? String((options as { cwd?: unknown }).cwd)
        : '';
    const key = `${command} ${normalizedArgs.join(' ')}`;

    if (
      cwd === '/test/repo' &&
      key.startsWith('git log -5 --reverse --name-only --pretty=format:%x1e%h%x00%an%x00%s -- .')
    ) {
      return '\x1e123abcd\0Test User\0Add card plan\nplan/file1.md\nCARD.md\n';
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
    if (toPosix(targetPath) === '/test/repo') {
      return cardRepoDirents as ReturnType<typeof syncFs.readdirSync>;
    }
    if (toPosix(targetPath) === '/test/repo/streams') {
      return streamDirents as ReturnType<typeof syncFs.readdirSync>;
    }
    if (toPosix(targetPath) === '/test/repo/streams/claude-code-session') {
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
    if (toPosix(filePath) === '/test/repo/CARD.meta.json') {
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
    if (toPosix(filePath) === '/test/repo/branches.json') {
      return JSON.stringify({
        'cards/card-123/1': {
          parentBranch: 'main',
          addedAt: '2026-04-02T00:00:00.000Z'
        }
      });
    }
    if (toPosix(filePath) === '/test/repo/commits.csv') {
      return ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'].join('\n');
    }
    throw Object.assign(new Error(`mock: unhandled readFileSync: ${String(filePath)}`), { code: 'ENOENT' });
  });

  vi.mocked(fs.writeFile).mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env['API_TEST_MODE'];
});

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
    ...overrides
  };
}

describe('codex-session library', () => {
  it('prepends additional context only when a prompt is provided', async () => {
    const { buildAdditionalContext, buildCodexPrompt } = await import('../src/lib/codex-session.js');

    const additionalContext = buildAdditionalContext(
      baseInput(),
      '/test/workspace/.worktrees/cards/card-123/1',
      'main',
      'cards/card-123/1'
    );

    expect(additionalContext).toContain('```bash');
    expect(additionalContext).toContain('EXECUTION_MODE=interactive');
    expect(additionalContext).toContain('<card type="yaml">');
    expect(additionalContext).toContain('title: Test card');
    expect(additionalContext).toContain('<card-repo type="yaml">');
    expect(additionalContext).toContain('CARD.md');
    expect(additionalContext).toContain('<card-repo-log type="yaml" count="3" order="oldest-first">');
    expect(additionalContext).toContain('subject: Add card plan');
    expect(additionalContext).toContain('files:');
    expect(additionalContext).toContain('- plan/file1.md');
    expect(additionalContext).toContain('- CARD.md');
    expect(additionalContext).toContain(
      '<workspace-repo-log type="yaml" branch="cards/card-123/1" parentBranch="main" count="1">'
    );
    expect(additionalContext).toContain('subject: Branch change');
    expect(additionalContext).toContain('merged: true');
    expect(additionalContext).toContain('<workspace-repo-log type="yaml" branch="main" count="1">');
    expect(additionalContext).toContain('subject: Merged fix');

    expect(buildCodexPrompt('Continue work on the card.', additionalContext)).toBe(
      `${additionalContext}\n\nContinue work on the card.`
    );
    expect(buildCodexPrompt(undefined, additionalContext)).toBeUndefined();
  });

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
      '[hooks.state."runtime@local:hooks/hooks.json:session_start:0:0"]\ntrusted_hash = "sha256:bd9f38f124866b8b62da60248953eaef2feecf1f9ec493dcd62fea72f4527f73"'
    );
    expect(written).toContain('"runtime@local:hooks/hooks.json:session_start:1:0"');
    expect(written).toContain('sha256:f3768ee10f2ba13e29d615d8ca9b9809a3fb45213d671ed4fbf22fabae7bf0b6');
    expect(written).toContain('"runtime@local:hooks/hooks.json:subagent_start:0:0"');
    expect(written).toContain('sha256:23736d1765dc7b9f8974956f352f99cd561eb98dc710cdb3fd1942fe1c8a66e7');
    expect(written).toContain('"runtime@local:hooks/hooks.json:subagent_stop:0:0"');
    expect(written).toContain('sha256:7f94d390a4a20896e8957bec354b720eb2a522f78a632f00c6a03f1f705c19b2');
    expect(written).toContain('"runtime@local:hooks/hooks.json:stop:0:0"');
    expect(written).toContain('sha256:ea8f27e5d8ecbdd2e1ed0677fa4037a85b5887719b8eb634892094a3413ea66a');
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
      '[hooks.state."cards-assistant@local:hooks/hooks.json:session_start:0:0"]\ntrusted_hash = "sha256:bd9f38f124866b8b62da60248953eaef2feecf1f9ec493dcd62fea72f4527f73"'
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
