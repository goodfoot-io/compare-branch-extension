/**
 * Tests for the SessionStart hook.
 */

import { execSync } from 'node:child_process';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import hook, { resolveHeadSha } from '../src/session-start.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn()
}));

const logger = new Logger();

/** Minimal set of env vars required by extractActionInput. */
const ACTION_ENV = {
  CARD_ID: 'card-123',
  ACTION_NAME: 'Launch Claude',
  ENVIRONMENT: 'default',
  EXECUTION_MODE: 'background',
  API_BASE_URL: 'http://localhost:3000',
  API_ACCESS_TOKEN: 'test-token',
  WORKSPACE_PATH: '/workspace',
  CARD_REPO_PATH: '/workspace/.cards/repo'
} as const;

describe('resolveHeadSha', () => {
  afterEach(() => {
    vi.mocked(execSync).mockReset();
  });

  it('returns trimmed sha on success', () => {
    vi.mocked(execSync).mockReturnValue('abc123def456\n');
    const sha = resolveHeadSha('/some/repo');

    expect(sha).toBe('abc123def456');
    expect(execSync).toHaveBeenCalledWith('git rev-parse HEAD', {
      cwd: '/some/repo',
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  });

  it('returns null when git command fails', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not a git repository');
    });
    expect(resolveHeadSha('/not/a/repo')).toBeNull();
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
    beforeEach(() => {
      for (const [key, value] of Object.entries(ACTION_ENV)) {
        process.env[key] = value;
      }
    });

    afterEach(() => {
      for (const key of Object.keys(ACTION_ENV)) {
        delete process.env[key];
      }
      vi.mocked(execSync).mockReset();
    });

    it('returns action context in additionalContext', async () => {
      vi.mocked(execSync).mockReturnValue('abc123\n');
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
      expect(stdout.systemMessage).toContain('HEAD: abc123');

      const parsed = JSON.parse(stdout.hookSpecificOutput!.additionalContext!);
      expect(parsed.cardId).toBe('card-123');
      expect(parsed.actionName).toBe('Launch Claude');
      expect(parsed.environment).toBe('default');
      expect(parsed.executionMode).toBe('background');
      expect(parsed.apiBaseUrl).toBe('http://localhost:3000');
      expect(parsed.apiAccessToken).toBe('test-token');
    });

    it('persists git HEAD sha via persistEnvVar', async () => {
      vi.mocked(execSync).mockReturnValue('abc123def456\n');
      const persistEnvVar = vi.fn();
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar, persistEnvVars: () => {} };

      await hook(mockInput, context);

      expect(persistEnvVar).toHaveBeenCalledWith('SESSION_GIT_HEAD_SHA', 'abc123def456');
    });

    it('does not call persistEnvVar or include HEAD in systemMessage when git fails', async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('not a git repository');
      });
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
