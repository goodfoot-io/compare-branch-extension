/**
 * Tests for the SubagentStart hook.
 *
 * @summary Tests for the SubagentStart hook
 */

import { spawn } from 'node:child_process';
import { findClaudePid } from '@cards/claude-code-sessions';
import { TestGitWorkspace } from '@cards/test-utils';
import { extractActionInput } from '@cards/sdk/config';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import hook from '../src/subagent-start.js';

vi.mock('@cards/claude-code-sessions', () => ({
  findClaudePid: vi.fn()
}));

vi.mock('@cards/sdk/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards/sdk/config')>();
  return {
    ...actual,
    extractActionInput: vi.fn()
  };
});

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => ({ unref: vi.fn() }))
}));

const mockFindClaudePid = vi.mocked(findClaudePid);
const mockExtractActionInput = vi.mocked(extractActionInput);
const mockSpawn = vi.mocked(spawn);

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
        CARD_REPO_PATH: repoPath
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
        workspacePath: '/workspace',
        cardRepoPath: repoPath,
        switchToInteractiveData: undefined,
        codingAgent: undefined
      });
    });

    afterEach(() => {
      for (const key of Object.keys(ACTION_ENV)) {
        delete process.env[key];
      }
      mockFindClaudePid.mockReset();
      mockExtractActionInput.mockReset();
      mockSpawn.mockReset();
      mockSpawn.mockReturnValue({ unref: vi.fn() } as unknown as ReturnType<typeof spawn>);
    });

    it('returns additionalContext with runtime context and card repo listing', async () => {
      mockFindClaudePid.mockReturnValue(42);

      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SubagentStart');
      expect(result).toHaveProperty('stdout');

      const stdout = result.stdout as { systemMessage?: string; hookSpecificOutput?: { additionalContext?: string } };

      // systemMessage includes action name and execution mode
      expect(stdout.systemMessage).toContain('Launch Claude action');
      expect(stdout.systemMessage).toContain('background mode');

      // systemMessage includes card repo listing
      expect(stdout.systemMessage).toContain('The card `card-123` repository at');
      expect(stdout.systemMessage).toContain('contains the following files:');

      // additionalContext mirrors systemMessage
      expect(stdout.hookSpecificOutput?.additionalContext).toBe(stdout.systemMessage);
    });

    it('returns continue:false when findClaudePid returns null', async () => {
      mockFindClaudePid.mockReturnValue(null);

      const result = await hook(baseInput, context);

      const stdout = result.stdout as {
        continue?: boolean;
        systemMessage?: string;
        stopReason?: string;
      };
      expect(stdout.continue).toBe(false);
      expect(stdout.stopReason).toContain('Could not find Claude PID');
      expect(stdout.stopReason).toContain('sess-abc');
      expect(stdout.systemMessage).toContain('Could not locate the Claude Code process');
      expect(stdout.systemMessage).toContain('sess-abc');
      expect(stdout.systemMessage).toContain('agent-xyz');
      expect(stdout.systemMessage).toContain('To resolve:');
    });

    it('spawns transcript watcher with agentId from input.agent_id', async () => {
      mockFindClaudePid.mockReturnValue(42);

      await hook(baseInput, context);

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['agent-xyz']),
        expect.objectContaining({ detached: true, stdio: 'ignore' })
      );
      // agentId must be the last element of the args array
      const spawnArgs = mockSpawn.mock.calls[0]?.[1] as string[];
      expect(spawnArgs?.[spawnArgs.length - 1]).toBe('agent-xyz');
    });

    it('continues when watcher spawn fails (non-fatal)', async () => {
      mockFindClaudePid.mockReturnValue(42);
      mockSpawn.mockImplementation(() => {
        throw new Error('spawn failed');
      });

      // Should not throw — watcher spawn is best-effort
      const result = await hook(baseInput, context);
      expect(result).toHaveProperty('_type', 'SubagentStart');
      const stdout = result.stdout as { continue?: boolean };
      // continue should not be false due to spawn failure
      expect(stdout.continue).not.toBe(false);
    });

    it('returns continue:false when card repo is inaccessible', async () => {
      mockFindClaudePid.mockReturnValue(42);
      mockExtractActionInput.mockReturnValue({
        cardId: 'card-123',
        actionName: 'Launch Claude',
        environment: 'default',
        executionMode: 'background',
        apiBaseUrl: 'http://localhost:3000',
        apiAccessToken: 'test-token',
        workspacePath: '/workspace',
        cardRepoPath: '/tmp/does-not-exist-xyz-123',
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
      mockFindClaudePid.mockReset();
      mockExtractActionInput.mockReset();
      mockSpawn.mockReset();
      mockSpawn.mockReturnValue({ unref: vi.fn() } as unknown as ReturnType<typeof spawn>);
    });

    it('returns informational message when outside action subprocess', async () => {
      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SubagentStart');
      const stdout = result.stdout as { systemMessage?: string };
      expect(stdout.systemMessage).toContain('not running inside an action subprocess');
    });
  });
});
