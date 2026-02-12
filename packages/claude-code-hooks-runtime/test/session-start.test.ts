/**
 * Tests for the SessionStart hook.
 */

import { TestGitWorkspace } from '@cards/test-utils';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import hook, { resolveHeadSha } from '../src/session-start.js';

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
    });

    it('returns action context in additionalContext', async () => {
      const persistEnvVar = vi.fn();
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar, persistEnvVars: () => {} };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      expect(result).toHaveProperty('stdout');

      const stdout = result.stdout as { systemMessage?: string; hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.systemMessage).toContain('Launch Claude');
      expect(stdout.systemMessage).toContain('card-123');
      expect(stdout.systemMessage).toContain('default');
      expect(stdout.systemMessage).toContain('background');
      expect(stdout.systemMessage).toContain('HEAD:');

      const parsed = JSON.parse(stdout.hookSpecificOutput!.additionalContext!);
      expect(parsed.cardId).toBe('card-123');
      expect(parsed.actionName).toBe('Launch Claude');
      expect(parsed.environment).toBe('default');
      expect(parsed.executionMode).toBe('background');
      expect(parsed.apiBaseUrl).toBe('http://localhost:3000');
      expect(parsed.apiAccessToken).toBe('test-token');
    });

    it('persists git HEAD sha via persistEnvVar', async () => {
      const expectedSha = (await testRepo.getGit().revparse(['HEAD'])).trim();
      const persistEnvVar = vi.fn();
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar, persistEnvVars: () => {} };

      await hook(mockInput, context);

      expect(persistEnvVar).toHaveBeenCalledWith('SESSION_GIT_HEAD_SHA', expectedSha);
    });

    it('does not call persistEnvVar or include HEAD in systemMessage when git fails', async () => {
      process.env.CARD_REPO_PATH = '/tmp/not-a-git-repo';
      const persistEnvVar = vi.fn();
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar, persistEnvVars: () => {} };

      const result = await hook(mockInput, context);

      expect(persistEnvVar).not.toHaveBeenCalled();
      const stdout = result.stdout as { systemMessage?: string };
      expect(stdout.systemMessage).not.toContain('HEAD:');
    });
  });

  describe('outside an action subprocess', () => {
    it('returns an error message when action env vars are missing', async () => {
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: () => {}, persistEnvVars: () => {} };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      const stdout = result.stdout as { systemMessage?: string };
      expect(stdout.systemMessage).toContain('not running inside an action subprocess');
    });
  });
});
