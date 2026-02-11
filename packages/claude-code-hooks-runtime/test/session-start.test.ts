/**
 * Tests for the SessionStart hook.
 */

import { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import hook from '../src/session-start.js';

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
    });

    it('returns action context in additionalContext', async () => {
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger, persistEnvVar: () => {}, persistEnvVars: () => {} };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'SessionStart');
      expect(result).toHaveProperty('stdout');

      const stdout = result.stdout as { systemMessage?: string; hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.systemMessage).toContain('Launch Claude');
      expect(stdout.systemMessage).toContain('card-123');
      expect(stdout.systemMessage).toContain('default');
      expect(stdout.systemMessage).toContain('background');

      const parsed = JSON.parse(stdout.hookSpecificOutput!.additionalContext!);
      expect(parsed.cardId).toBe('card-123');
      expect(parsed.actionName).toBe('Launch Claude');
      expect(parsed.environment).toBe('default');
      expect(parsed.executionMode).toBe('background');
      expect(parsed.apiBaseUrl).toBe('http://localhost:3000');
      expect(parsed.apiAccessToken).toBe('test-token');
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
