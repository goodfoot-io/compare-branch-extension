/**
 * Tests for the Stop hook.
 */

import { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import hook from '../src/stop.js';

const logger = new Logger();

/** Minimal set of env vars required by extractActionInput. */
const ACTION_ENV = {
  CARD_ID: 'card-456',
  ACTION_NAME: 'Launch Claude',
  ENVIRONMENT: 'staging',
  EXECUTION_MODE: 'interactive',
  API_BASE_URL: 'http://localhost:3000',
  API_ACCESS_TOKEN: 'test-token',
  WORKSPACE_PATH: '/workspace',
  CARD_REPO_PATH: '/workspace/.cards/repo'
} as const;

describe('Stop Hook', () => {
  it('exports a valid hook function', () => {
    expect(hook).toBeDefined();
    expect(typeof hook).toBe('function');
  });

  it('has correct hookEventName metadata', () => {
    expect(hook.hookEventName).toBe('Stop');
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

    it('approves stop with action context in systemMessage', async () => {
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      expect(result).toHaveProperty('stdout');

      const stdout = result.stdout as { systemMessage?: string };
      expect(stdout.systemMessage).toContain('Launch Claude');
      expect(stdout.systemMessage).toContain('card-456');
      expect(stdout.systemMessage).toContain('interactive');
    });
  });

  describe('outside an action subprocess', () => {
    it('approves stop with an error message when action env vars are missing', async () => {
      const mockInput = {} as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result.stdout as { systemMessage?: string };
      expect(stdout.systemMessage).toContain('not running inside an action subprocess');
    });
  });
});
