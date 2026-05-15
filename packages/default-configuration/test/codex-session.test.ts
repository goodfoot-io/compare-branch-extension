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

  vi.mocked(fs.readFile).mockImplementation(async (filePath: string | URL) => {
    if (String(filePath) === '/test/extension/dist/marketplace/claude/runtime/claude/CLAUDE.md') {
      return '# Claude Instructions\nUse runtime workflows.';
    }
    if (String(filePath) === '/test/extension/dist/marketplace/claude/runtime/claude/COMMIT_MESSAGE_STYLE.md') {
      return '# Commit Style\nKeep commits small.';
    }
    if (String(filePath) === '/home/node/.cards/codex/config.toml') {
      return ['model = "gpt-5"', '', '[tools]', 'web_search = true'].join('\n');
    }
    throw Object.assign(new Error(`mock: unhandled readFile: ${String(filePath)}`), { code: 'ENOENT' });
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

  it('preserves unrelated config settings while enabling the bundled plugins', async () => {
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
    expect(writtenConfig).toContain('[plugins."cards@local"]');
    expect(writtenConfig).toContain('[plugins."runtime@local"]');
    expect(writtenConfig).toContain('enabled = true');
  });

  it('uses translated Codex skills instead of Claude CLI env vars', async () => {
    const cardsApiSkill = (await import('../../../codex/cards/skills/api/SKILL.md')).default;
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
      if (String(filePath) === '/test/extension/dist/marketplace/claude/runtime/claude/CLAUDE.md') {
        return '# Claude Instructions\nUse runtime workflows.';
      }
      if (String(filePath) === '/test/extension/dist/marketplace/claude/runtime/claude/COMMIT_MESSAGE_STYLE.md') {
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
});
