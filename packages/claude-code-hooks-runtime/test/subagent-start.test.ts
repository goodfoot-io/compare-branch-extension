/**
 * Tests for the SubagentStart hook.
 *
 * @summary Tests for the SubagentStart hook
 */

import { extractActionInput } from '@cards/sdk/config';
import { TestGitWorkspace } from '@cards/test-utils';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import hook from '../src/subagent-start.js';

vi.mock('@cards/sdk/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards/sdk/config')>();
  return {
    ...actual,
    extractActionInput: vi.fn()
  };
});

const mockExtractActionInput = vi.mocked(extractActionInput);

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

const baseInput = {
  agent_id: 'agent-xyz',
  agent_type: 'general-purpose',
  session_id: 'sess-abc',
  transcript_path: '/tmp/transcript-abc.jsonl',
  cwd: '/workspace',
  hook_event_name: 'SubagentStart' as const
};

const context = { logger };

describe('SubagentStart Hook', () => {
  it('exports a valid hook with hookEventName SubagentStart', () => {
    expect(hook).toBeDefined();
    expect(typeof hook).toBe('function');
    expect(hook.hookEventName).toBe('SubagentStart');
  });

  describe('inside an action subprocess', () => {
    /** Minimal set of env vars required by extractActionInput. */
    let ACTION_ENV: Record<string, string>;

    beforeEach(() => {
      ACTION_ENV = {
        CARD_ID: 'card-123',
        ACTION_NAME: 'Launch Claude',
        ENVIRONMENT: 'default',
        EXECUTION_MODE: 'background',
        API_BASE_URL: 'http://localhost:3000',
        API_ACCESS_TOKEN: 'test-token',
        WORKSPACE_PATH: '/workspace',
        CARD_REPO_PATH: repoPath,
        CONFIG_PATH: '/tmp/config',
        EXTENSION_PATH: '/tmp/extension'
      };
      for (const [key, value] of Object.entries(ACTION_ENV)) {
        process.env[key] = value;
      }
      mockExtractActionInput.mockReturnValue({
        cardId: 'card-123',
        actionName: 'Launch Claude',
        environment: 'default',
        executionMode: 'background',
        apiBaseUrl: 'http://localhost:3000',
        apiAccessToken: 'test-token',
        repoRoot: '/workspace',
        cardRepoPath: repoPath,
        configPath: '/tmp/config',
        extensionPath: '/tmp/extension',
        switchToInteractiveData: undefined,
        codingAgent: undefined
      });
    });

    afterEach(() => {
      for (const key of Object.keys(ACTION_ENV)) {
        delete process.env[key];
      }
      mockExtractActionInput.mockReset();
    });

    it('returns additionalContext with XML context blocks', async () => {
      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SubagentStart');
      expect(result).toHaveProperty('stdout');

      const stdout = result.stdout as { systemMessage?: string; hookSpecificOutput?: { additionalContext?: string } };

      // <card> block with identity and env vars
      expect(stdout.systemMessage).toContain('<card ');
      expect(stdout.systemMessage).toContain('id="card-123"');
      expect(stdout.systemMessage).toContain('mode="background"');

      // <card-repo> block
      expect(stdout.systemMessage).toContain('<card-repo>');
      expect(stdout.systemMessage).toContain('</card-repo>');

      // additionalContext mirrors systemMessage
      expect(stdout.hookSpecificOutput?.additionalContext).toBe(stdout.systemMessage);
    });

    it('returns continue:false when card repo is inaccessible', async () => {
      mockExtractActionInput.mockReturnValue({
        cardId: 'card-123',
        actionName: 'Launch Claude',
        environment: 'default',
        executionMode: 'background',
        apiBaseUrl: 'http://localhost:3000',
        apiAccessToken: 'test-token',
        repoRoot: '/workspace',
        cardRepoPath: '/tmp/does-not-exist-xyz-123',
        configPath: '/tmp/config',
        extensionPath: '/tmp/extension',
        switchToInteractiveData: undefined,
        codingAgent: undefined
      });

      const result = await hook(baseInput, context);

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
    beforeEach(() => {
      mockExtractActionInput.mockImplementation(() => {
        throw new Error('Not in action subprocess');
      });
    });

    afterEach(() => {
      mockExtractActionInput.mockReset();
    });

    it('returns informational message when outside action subprocess', async () => {
      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SubagentStart');
      const stdout = result.stdout as { systemMessage?: string };
      expect(stdout.systemMessage).toContain('not running inside an action subprocess');
    });
  });
});
