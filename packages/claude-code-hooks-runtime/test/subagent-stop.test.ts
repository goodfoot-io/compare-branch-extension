/**
 * Tests for the SubagentStop hook.
 *
 * @summary Tests for the SubagentStop hook
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { extractActionInput } from '@cards/sdk/config';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import hook from '../src/subagent-stop.js';

vi.mock('@cards/sdk/config', () => ({
  extractActionInput: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn()
}));

const mockExtractActionInput = vi.mocked(extractActionInput);
const mockMkdir = vi.mocked(mkdir);
const mockWriteFile = vi.mocked(writeFile);

const logger = new Logger();

const baseActionInput = {
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

const baseInput = {
  session_id: 'sess-abc',
  agent_id: 'agent-xyz',
  agent_type: 'general-purpose',
  agent_transcript_path: '/tmp/agent-transcript-xyz.jsonl',
  stop_hook_active: false,
  transcript_path: '/tmp/transcript-abc.jsonl',
  cwd: '/workspace',
  hook_event_name: 'SubagentStop' as const
};

const context = { logger };

beforeEach(() => {
  vi.clearAllMocks();
  mockMkdir.mockResolvedValue(undefined as never);
  mockWriteFile.mockResolvedValue(undefined as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SubagentStop Hook', () => {
  it('exports a valid hook function', () => {
    expect(hook).toBeDefined();
    expect(typeof hook).toBe('function');
  });

  it('has correct hookEventName metadata', () => {
    expect(hook.hookEventName).toBe('SubagentStop');
  });

  describe('inside an action subprocess', () => {
    beforeEach(() => {
      mockExtractActionInput.mockReturnValue(baseActionInput);
    });

    it('writes sentinel file at {cardRepoPath}/streams/claude-code-session/{sessionId}-{agentId}.flush', async () => {
      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SubagentStop');
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/tmp/card-repos/card-123/streams/claude-code-session/sess-abc-agent-xyz.flush',
        ''
      );
    });

    it('creates parent directories if missing', async () => {
      await hook(baseInput, context);

      expect(mockMkdir).toHaveBeenCalledWith('/tmp/card-repos/card-123/streams/claude-code-session', {
        recursive: true
      });
    });

    it('approves unconditionally on success', async () => {
      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SubagentStop');
      const stdout = result.stdout as { decision?: string };
      expect(stdout.decision).toBe('approve');
    });

    it('handles write failure gracefully — logs warning, still approves', async () => {
      mockWriteFile.mockRejectedValue(new Error('disk full'));

      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SubagentStop');
      const stdout = result.stdout as { decision?: string };
      expect(stdout.decision).toBe('approve');
    });
  });

  describe('outside an action subprocess', () => {
    beforeEach(() => {
      mockExtractActionInput.mockImplementation(() => {
        throw new Error('Not in action subprocess');
      });
    });

    it('approves unconditionally when not in action subprocess', async () => {
      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SubagentStop');
      const stdout = result.stdout as { decision?: string };
      expect(stdout.decision).toBe('approve');
      expect(mockMkdir).not.toHaveBeenCalled();
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
