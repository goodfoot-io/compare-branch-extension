/**
 * Tests for the SessionStart hook.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { registerSessionPid } from '@cards/git-hooks/lib/card-repo-sessions';
import { findClaudePid } from '@cards/git-hooks/lib/process-tree';
import { TestGitWorkspace } from '@cards/test-utils';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import hook, { buildCardRepoListing, CardRepoAccessError, resolveHeadSha } from '../src/session-start.js';

const mockFindClaudePid = vi.mocked(findClaudePid);
const mockRegisterSessionPid = vi.mocked(registerSessionPid);

vi.mock('node:child_process', () => ({
  execSync: vi.fn()
}));

vi.mock('@cards/git-hooks/lib/process-tree', () => ({
  findClaudePid: vi.fn()
}));

vi.mock('@cards/git-hooks/lib/card-repo-sessions', () => ({
  registerSessionPid: vi.fn()
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
  let realExecSync: typeof execSync;

  beforeAll(async () => {
    const real = await vi.importActual<typeof import('node:child_process')>('node:child_process');
    realExecSync = real.execSync;
  });

  beforeEach(() => {
    vi.mocked(execSync).mockImplementation(realExecSync as typeof execSync);
  });

  afterEach(() => {
    vi.mocked(execSync).mockReset();
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
    tmpDir = join(repoPath, '..', `listing-test-${Date.now()}`);
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
    expect(listing).toContain('```card.meta.json');
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

  it('returns only the intro line for empty directory', () => {
    const listing = buildCardRepoListing(TEST_CARD_ID, tmpDir);

    expect(listing).toBe(`The card \`${TEST_CARD_ID}\` repository at ${tmpDir} contains the following files:`);
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
      vi.mocked(execSync).mockReset();
      mockFindClaudePid.mockReset();
      mockRegisterSessionPid.mockReset();
    });

    it('returns card repo directory listing in additionalContext', async () => {
      const realSha = (await testRepo.getGit().revparse(['HEAD'])).trim();
      vi.mocked(execSync).mockReturnValue(`${realSha}\n`);
      const persistEnvVar = vi.fn();
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar, persistEnvVars: () => {} };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      expect(result).toHaveProperty('stdout');

      const stdout = result.stdout as { systemMessage?: string; hookSpecificOutput?: { additionalContext?: string } };
      // systemMessage is the card repo listing with card ID and path
      expect(stdout.systemMessage).toContain('The card `card-123` repository at');
      expect(stdout.systemMessage).toContain('contains the following files:');

      // additionalContext mirrors systemMessage
      const listing = stdout.hookSpecificOutput!.additionalContext!;
      expect(listing).toBe(stdout.systemMessage);
    });

    it('persists git HEAD sha via persistEnvVar', async () => {
      const expectedSha = (await testRepo.getGit().revparse(['HEAD'])).trim();
      vi.mocked(execSync).mockReturnValue(`${expectedSha}\n`);
      const persistEnvVar = vi.fn();
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar, persistEnvVars: () => {} };

      await hook(mockInput, context);

      expect(persistEnvVar).toHaveBeenCalledWith('SESSION_GIT_HEAD_SHA', expectedSha);
    });

    it('does not call persistEnvVar or include HEAD in systemMessage when git fails', async () => {
      // Use a real directory that exists but is not a git repo
      const tmpDir = join(repoPath, '..', `no-git-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      process.env.CARD_REPO_PATH = tmpDir;
      const persistEnvVar = vi.fn();
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar, persistEnvVars: () => {} };

      const result = await hook(mockInput, context);

      expect(persistEnvVar).not.toHaveBeenCalled();
      const stdout = result.stdout as { systemMessage?: string };
      expect(stdout.systemMessage).not.toContain('HEAD:');
    });

    it('calls findClaudePid and registerSessionPid with correct args when inside action subprocess', async () => {
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execSync).mockReturnValue('abc123\n');
      const persistEnvVar = vi.fn();
      const mockInput = { session_id: 'sess-123' } as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar, persistEnvVars: () => {} };

      await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
      expect(mockRegisterSessionPid).toHaveBeenCalledWith(42, 'sess-123');
    });

    it('does not call registerSessionPid when findClaudePid returns null (logs warning)', async () => {
      mockFindClaudePid.mockReturnValue(null);
      vi.mocked(execSync).mockReturnValue('abc123\n');
      const persistEnvVar = vi.fn();
      const mockInput = { session_id: 'sess-123' } as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar, persistEnvVars: () => {} };

      await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
      expect(mockRegisterSessionPid).not.toHaveBeenCalled();
    });

    it('returns continue:false with stopReason when registerSessionPid throws', async () => {
      mockFindClaudePid.mockReturnValue(42);
      mockRegisterSessionPid.mockRejectedValue(new Error('disk full'));
      vi.mocked(execSync).mockReturnValue('abc123\n');
      const persistEnvVar = vi.fn();
      const mockInput = { session_id: 'sess-123' } as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar, persistEnvVars: () => {} };

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
      process.env.CARD_REPO_PATH = '/tmp/does-not-exist-xyz-123';
      vi.mocked(execSync).mockReturnValue('abc123\n');
      const persistEnvVar = vi.fn();
      const mockInput = { session_id: 'sess-123' } as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar, persistEnvVars: () => {} };

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

    it('persists SESSION_CLAUDE_PID via persistEnvVar after successful registration', async () => {
      mockFindClaudePid.mockReturnValue(42);
      vi.mocked(execSync).mockReturnValue('abc123\n');
      const persistEnvVar = vi.fn();
      const mockInput = { session_id: 'sess-123' } as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar, persistEnvVars: () => {} };

      await hook(mockInput, context);

      expect(persistEnvVar).toHaveBeenCalledWith('SESSION_CLAUDE_PID', '42');
    });
  });

  describe('outside an action subprocess', () => {
    afterEach(() => {
      mockFindClaudePid.mockReset();
      mockRegisterSessionPid.mockReset();
    });

    it('returns an error message when action env vars are missing', async () => {
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: () => {}, persistEnvVars: () => {} };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      const stdout = result.stdout as { systemMessage?: string };
      expect(stdout.systemMessage).toContain('not running inside an action subprocess');
    });

    it('does not call findClaudePid or registerSessionPid when outside action subprocess', async () => {
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: () => {}, persistEnvVars: () => {} };

      await hook(mockInput, context);

      expect(mockFindClaudePid).not.toHaveBeenCalled();
      expect(mockRegisterSessionPid).not.toHaveBeenCalled();
    });
  });
});
