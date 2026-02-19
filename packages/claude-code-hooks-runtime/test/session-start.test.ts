/**
 * Tests for the SessionStart hook.
 *
 * @summary Tests for the SessionStart hook
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findClaudePid, registerSession } from '@cards/claude-code-sessions';
import { writeSessionHeadSha } from '@cards/claude-code-sessions/card-repo';
import { TestGitWorkspace } from '@cards/test-utils';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import hook, {
  buildCardRepoListing,
  buildRuntimeContext,
  CardRepoAccessError,
  resolveHeadSha
} from '../src/session-start.js';

const mockFindClaudePid = vi.mocked(findClaudePid);
const mockRegisterSession = vi.mocked(registerSession);
const mockWriteSessionHeadSha = vi.mocked(writeSessionHeadSha);

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn()
}));

vi.mock('@cards/claude-code-sessions', () => ({
  findClaudePid: vi.fn(),
  registerSession: vi.fn()
}));

vi.mock('@cards/claude-code-sessions/card-repo', () => ({
  writeSessionHeadSha: vi.fn()
}));

const logger = new Logger();

let testRepo: TestGitWorkspace;
let repoPath: string;

beforeAll(async () => {
  testRepo = new TestGitWorkspace();
  repoPath = await testRepo.create();
});

afterAll(() => {
  testRepo.destroy();
});

describe('resolveHeadSha', () => {
  let realExecFileSync: typeof execFileSync;

  beforeAll(async () => {
    const real = await vi.importActual<typeof import('node:child_process')>('node:child_process');
    realExecFileSync = real.execFileSync;
  });

  beforeEach(() => {
    vi.mocked(execFileSync).mockImplementation(realExecFileSync as typeof execFileSync);
  });

  afterEach(() => {
    vi.mocked(execFileSync).mockReset();
  });

  it('returns trimmed sha on success', async () => {
    const sha = resolveHeadSha(repoPath);
    const expectedSha = (await testRepo.getGit().revparse(['HEAD'])).trim();

    expect(sha).toBe(expectedSha);
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });

  it('returns null when git command fails', () => {
    expect(resolveHeadSha('/tmp/not-a-repo')).toBeNull();
  });
});

describe('buildCardRepoListing', () => {
  const TEST_CARD_ID = 'test-card';
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(repoPath, '..', `listing-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  it('lists files with relative paths', () => {
    writeFileSync(join(tmpDir, 'README.md'), '# Hello');
    writeFileSync(join(tmpDir, 'index.ts'), 'export {}');

    const listing = buildCardRepoListing(TEST_CARD_ID, tmpDir);
    const lines = listing.split('\n');

    expect(lines).toContain('README.md');
    expect(lines).toContain('index.ts');
  });

  it('lists directories with trailing slash and recurses into them', () => {
    mkdirSync(join(tmpDir, 'sub'), { recursive: true });
    writeFileSync(join(tmpDir, 'sub', 'file.txt'), 'content');

    const listing = buildCardRepoListing(TEST_CARD_ID, tmpDir);
    const lines = listing.split('\n');

    expect(lines).toContain('sub/');
    expect(lines).toContain('sub/file.txt');
  });

  it('replaces .meta.json files with their content in fenced blocks', () => {
    const meta = JSON.stringify({ title: 'Test Card' }, null, 2);
    writeFileSync(join(tmpDir, 'card.meta.json'), meta);

    const listing = buildCardRepoListing(TEST_CARD_ID, tmpDir);

    expect(listing).toContain('card.meta.json:');
    expect(listing).toContain('```json');
    expect(listing).toContain(meta);
    expect(listing).toContain('```');
    // Should NOT contain a bare line with just the filename
    const lines = listing.split('\n');
    expect(lines).not.toContain('card.meta.json');
  });

  it('handles nested .meta.json files', () => {
    mkdirSync(join(tmpDir, 'actions'), { recursive: true });
    const meta = JSON.stringify({ name: 'deploy' });
    writeFileSync(join(tmpDir, 'actions', 'deploy.meta.json'), meta);
    writeFileSync(join(tmpDir, 'actions', 'deploy.sh'), '#!/bin/sh');

    const listing = buildCardRepoListing(TEST_CARD_ID, tmpDir);

    expect(listing).toContain('actions/deploy.meta.json:');
    expect(listing).toContain(meta);
    expect(listing).toContain('actions/deploy.sh');
  });

  it('throws CardRepoAccessError for non-existent path', () => {
    const badPath = '/tmp/does-not-exist-xyz-123';

    expect(() => buildCardRepoListing(TEST_CARD_ID, badPath)).toThrow(CardRepoAccessError);
    expect(() => buildCardRepoListing(TEST_CARD_ID, badPath)).toThrow(/Cannot read card repository/);

    try {
      buildCardRepoListing(TEST_CARD_ID, badPath);
    } catch (error) {
      expect(error).toBeInstanceOf(CardRepoAccessError);
      expect((error as CardRepoAccessError).repoPath).toBe(badPath);
      expect((error as CardRepoAccessError).cause).toBeInstanceOf(Error);
    }
  });

  it('excludes .git directory from listing', () => {
    mkdirSync(join(tmpDir, '.git', 'objects'), { recursive: true });
    writeFileSync(join(tmpDir, '.git', 'HEAD'), 'ref: refs/heads/main');
    writeFileSync(join(tmpDir, 'README.md'), '# Hello');

    const listing = buildCardRepoListing(TEST_CARD_ID, tmpDir);
    const lines = listing.split('\n');

    expect(lines).toContain('README.md');
    expect(lines).not.toContain('.git/');
    expect(lines).not.toContain('.git/HEAD');
    expect(lines).not.toContain('.git/objects/');
    expect(listing).not.toContain('.git');
  });

  it('returns only the intro line for empty directory', () => {
    const listing = buildCardRepoListing(TEST_CARD_ID, tmpDir);

    expect(listing).toBe(`The card \`${TEST_CARD_ID}\` repository at ${tmpDir} contains the following files:`);
  });
});

describe('buildRuntimeContext', () => {
  const baseInput = {
    cardId: 'card-123',
    actionName: 'Launch',
    environment: 'default',
    executionMode: 'interactive' as const,
    apiBaseUrl: 'http://localhost:3000',
    apiAccessToken: 'test-token',
    workspacePath: '/workspace',
    cardRepoPath: '/tmp/card-repos/card-123',
    switchToInteractiveData: undefined,
    codingAgent: undefined
  };

  afterEach(() => {
    delete process.env['WORKSPACE_BRANCH'];
    delete process.env['BASE_BRANCH'];
  });

  it('includes action name, execution mode, and card repo path', () => {
    const result = buildRuntimeContext(baseInput);

    expect(result).toContain('Launch action');
    expect(result).toContain('interactive mode');
    expect(result).toContain('/tmp/card-repos/card-123');
  });

  it('includes workspace branch and base branch when set', () => {
    process.env['WORKSPACE_BRANCH'] = 'cards/card-123/1';
    process.env['BASE_BRANCH'] = 'main';

    const result = buildRuntimeContext(baseInput);

    expect(result).toContain('`cards/card-123/1`');
    expect(result).toContain('`main`');
  });

  it('includes workspace branch without base branch', () => {
    process.env['WORKSPACE_BRANCH'] = 'cards/card-123/1';

    const result = buildRuntimeContext(baseInput);

    expect(result).toContain('`cards/card-123/1`');
    expect(result).not.toContain('merging into');
  });

  it('omits branch info when WORKSPACE_BRANCH is not set', () => {
    const result = buildRuntimeContext(baseInput);

    expect(result).not.toContain('on branch');
    expect(result).not.toContain('merging into');
  });
});

describe('SessionStart Hook', () => {
  it('exports a valid hook function', () => {
    expect(hook).toBeDefined();
    expect(typeof hook).toBe('function');
  });

  it('has correct hookEventName metadata', () => {
    expect(hook.hookEventName).toBe('SessionStart');
  });

  describe('inside an action subprocess', () => {
    /** Minimal set of env vars required by extractActionInput. */
    let ACTION_ENV: Record<string, string>;

    beforeEach(async () => {
      // Get the real HEAD SHA for assertions
      ACTION_ENV = {
        CARD_ID: 'card-123',
        ACTION_NAME: 'Launch Claude',
        ENVIRONMENT: 'default',
        EXECUTION_MODE: 'background',
        API_BASE_URL: 'http://localhost:3000',
        API_ACCESS_TOKEN: 'test-token',
        WORKSPACE_PATH: '/workspace',
        CARD_REPO_PATH: repoPath
      };
      for (const [key, value] of Object.entries(ACTION_ENV)) {
        process.env[key] = value;
      }
    });

    afterEach(() => {
      for (const key of Object.keys(ACTION_ENV)) {
        delete process.env[key];
      }
      vi.mocked(execFileSync).mockReset();
      mockFindClaudePid.mockReset();
      mockRegisterSession.mockReset();
      mockWriteSessionHeadSha.mockReset();
    });

    it('returns card repo directory listing in additionalContext', async () => {
      const realSha = (await testRepo.getGit().revparse(['HEAD'])).trim();
      vi.mocked(execFileSync).mockReturnValue(`${realSha}\n`);
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      expect(result).toHaveProperty('stdout');

      const stdout = result.stdout as { systemMessage?: string; hookSpecificOutput?: { additionalContext?: string } };
      // systemMessage starts with runtime context paragraph
      expect(stdout.systemMessage).toContain('Launch Claude action');
      expect(stdout.systemMessage).toContain('background mode');
      expect(stdout.systemMessage).toContain(repoPath);

      // followed by card repo listing
      expect(stdout.systemMessage).toContain('The card `card-123` repository at');
      expect(stdout.systemMessage).toContain('contains the following files:');

      // additionalContext mirrors systemMessage
      const additional = stdout.hookSpecificOutput!.additionalContext!;
      expect(additional).toBe(stdout.systemMessage);
    });

    it('persists git HEAD sha via writeSessionHeadSha', async () => {
      const expectedSha = (await testRepo.getGit().revparse(['HEAD'])).trim();
      vi.mocked(execFileSync).mockReturnValue(`${expectedSha}\n`);
      const mockInput = { session_id: 'sess-sha' } as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      expect(mockWriteSessionHeadSha).toHaveBeenCalledWith('sess-sha', expectedSha);
    });

    it('does not call writeSessionHeadSha when git fails', async () => {
      // Use a real directory that exists but is not a git repo
      const tmpDir = join(repoPath, '..', `no-git-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      process.env['CARD_REPO_PATH'] = tmpDir;
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      const result = await hook(mockInput, context);

      expect(mockWriteSessionHeadSha).not.toHaveBeenCalled();
      const stdout = result.stdout as { systemMessage?: string };
      expect(stdout.systemMessage).not.toContain('HEAD:');
    });

    it('calls findClaudePid and registerSession with correct args when inside action subprocess', async () => {
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
      expect(mockRegisterSession).toHaveBeenCalledWith(42, 'sess-123', '/tmp/transcript.jsonl');
    });

    it('does not call registerSession when findClaudePid returns null (logs warning)', async () => {
      mockFindClaudePid.mockReturnValue(null);
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
      expect(mockRegisterSession).not.toHaveBeenCalled();
    });

    it('returns continue:false with stopReason when registerSession throws', async () => {
      mockFindClaudePid.mockReturnValue(42);
      mockRegisterSession.mockRejectedValue(new Error('disk full'));
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123', transcript_path: '/tmp/transcript.jsonl' } as Parameters<
        typeof hook
      >[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      const stdout = result.stdout as {
        continue?: boolean;
        systemMessage?: string;
        stopReason?: string;
      };
      expect(stdout.continue).toBe(false);
      expect(stdout.stopReason).toMatch(/Session registration failed/);
      expect(stdout.stopReason).toContain('disk full');
      expect(stdout.systemMessage).toContain('PID 42');
      expect(stdout.systemMessage).toContain('sess-123');
      expect(stdout.systemMessage).toContain('To resolve:');
    });

    it('returns continue:false with stopReason when card repo is inaccessible', async () => {
      process.env['CARD_REPO_PATH'] = '/tmp/does-not-exist-xyz-123';
      vi.mocked(execFileSync).mockReturnValue('abc123\n');
      const mockInput = { session_id: 'sess-123' } as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      const stdout = result.stdout as {
        continue?: boolean;
        systemMessage?: string;
        stopReason?: string;
      };
      expect(stdout.continue).toBe(false);
      expect(stdout.stopReason).toMatch(/Card repository inaccessible/);
      expect(stdout.stopReason).toContain('/tmp/does-not-exist-xyz-123');
      expect(stdout.systemMessage).toContain('not accessible');
      expect(stdout.systemMessage).toContain('To resolve:');
      expect(stdout.systemMessage).toContain('CARD_REPO_PATH');
    });
  });

  describe('outside an action subprocess', () => {
    afterEach(() => {
      mockFindClaudePid.mockReset();
      mockRegisterSession.mockReset();
    });

    it('returns an error message when action env vars are missing', async () => {
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      const stdout = result.stdout as { systemMessage?: string };
      expect(stdout.systemMessage).toContain('not running inside an action subprocess');
    });

    it('does not call findClaudePid or registerSession when outside action subprocess', async () => {
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: vi.fn(), persistEnvVars: vi.fn() };

      await hook(mockInput, context);

      expect(mockFindClaudePid).not.toHaveBeenCalled();
      expect(mockRegisterSession).not.toHaveBeenCalled();
    });
  });
});
