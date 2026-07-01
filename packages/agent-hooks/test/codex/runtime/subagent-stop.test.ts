/**
 * Tests for the SubagentStop hook.
 *
 * @summary Tests for the SubagentStop hook
 */

import { readFile } from 'node:fs/promises';
import { extractActionInput } from '@cards.management/sdk/config';
import { Logger } from '@goodfoot/codex-hooks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import hook from '../../../src/codex/runtime/subagent-stop.js';

vi.mock('@cards.management/sdk/config', () => ({
  extractActionInput: vi.fn()
}));

vi.mock('@cards.management/sdk/client/discovery', () => ({
  createCardsClient: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn()
}));

import { createCardsClient } from '@cards.management/sdk/client/discovery';

const mockExtractActionInput = vi.mocked(extractActionInput);
const mockCreateCardsClient = vi.mocked(createCardsClient);
const mockReadFile = vi.mocked(readFile);

const logger = new Logger();

const baseActionInput = {
  cardId: 'card-123',
  actionName: 'Launch',
  environment: 'default',
  executionMode: 'interactive' as const,
  exitWhenDone: false,
  repoRoot: '/workspace',
  cardRepoPath: '/tmp/card-repos/card-123',
  configPath: '/tmp/config',
  extensionPath: '/tmp/extension',
  switchToInteractiveData: undefined,
  codingAgent: undefined,
  marketplacePath: '/test/marketplace'
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
} as Parameters<typeof hook>[0];

const context = { logger };

function makeStreamWriter() {
  return {
    write: vi.fn(),
    close: vi.fn().mockResolvedValue({ success: true })
  };
}

/**
 * Sets up mock Cards client with a stream writer and configures transcript content.
 *
 * @param transcriptContent - Content returned by readFile mock.
 * @returns The stream writer mock for assertion.
 */
function setupTranscriptUpload(transcriptContent: string) {
  const streamWriter = makeStreamWriter();
  const mockClient = { openStream: vi.fn().mockReturnValue(streamWriter) };
  mockCreateCardsClient.mockResolvedValue(mockClient as never);
  mockReadFile.mockResolvedValue(transcriptContent as never);
  return { streamWriter, mockClient };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SubagentStop Hook', () => {
  it('exports valid hook with hookEventName SubagentStop', () => {
    expect(hook).toBeDefined();
    expect(typeof hook).toBe('function');
    expect(hook.hookEventName).toBe('SubagentStop');
  });

  describe('inside an action subprocess', () => {
    beforeEach(() => {
      mockExtractActionInput.mockReturnValue(baseActionInput);
    });

    it('uploads transcript via openStream with correct stream name {sessionId}-{agentId}.jsonl', async () => {
      const { mockClient } = setupTranscriptUpload('{"event":"start"}\n{"event":"end"}\n');

      await hook(baseInput, context);

      expect(mockClient.openStream).toHaveBeenCalledWith(
        'card-123',
        'claude-code-session',
        'sess-abc-agent-xyz.jsonl',
        { title: 'Subagent transcript for card-123', sessionId: 'sess-abc' }
      );
    });

    it('writes each non-empty line from transcript to stream', async () => {
      const { streamWriter } = setupTranscriptUpload('{"event":"start"}\n\n{"event":"end"}\n');

      await hook(baseInput, context);

      expect(streamWriter.write).toHaveBeenCalledTimes(2);
      expect(streamWriter.write).toHaveBeenCalledWith('{"event":"start"}');
      expect(streamWriter.write).toHaveBeenCalledWith('{"event":"end"}');
    });

    it('closes stream after writing all lines', async () => {
      const { streamWriter } = setupTranscriptUpload('{"event":"start"}\n');

      await hook(baseInput, context);

      expect(streamWriter.close).toHaveBeenCalledOnce();
    });

    it('returns undefined unconditionally on upload success', async () => {
      setupTranscriptUpload('{"event":"start"}\n');

      const result = await hook(baseInput, context);

      expect(result).toBeUndefined();
    });

    it('returns undefined unconditionally when upload fails (logs warning)', async () => {
      const { streamWriter } = setupTranscriptUpload('{"event":"start"}\n');
      streamWriter.close.mockRejectedValue(new Error('network error'));

      const result = await hook(baseInput, context);

      expect(result).toBeUndefined();
    });

    it('returns undefined when transcript file does not exist (logs warning)', async () => {
      const mockClient = { openStream: vi.fn() };
      mockCreateCardsClient.mockResolvedValue(mockClient as never);
      const enoentError = Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' });
      mockReadFile.mockRejectedValue(enoentError);

      const result = await hook(baseInput, context);

      expect(result).toBeUndefined();
    });

    it('returns undefined when createCardsClient returns null (API unavailable, no upload attempted)', async () => {
      mockCreateCardsClient.mockResolvedValue(null);

      const result = await hook(baseInput, context);

      expect(result).toBeUndefined();
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('handles empty transcript file (no lines written, stream still opened and closed)', async () => {
      const { streamWriter, mockClient } = setupTranscriptUpload('');

      await hook(baseInput, context);

      expect(mockClient.openStream).toHaveBeenCalled();
      expect(streamWriter.write).not.toHaveBeenCalled();
      expect(streamWriter.close).toHaveBeenCalledOnce();
    });

    it('returns undefined and skips upload when agent_transcript_path is null', async () => {
      const warnSpy = vi.spyOn(logger, 'warn');
      const nullPathInput = { ...baseInput, agent_transcript_path: null } as Parameters<typeof hook>[0];

      const result = await hook(nullPathInput, context);

      expect(result).toBeUndefined();
      expect(mockCreateCardsClient).not.toHaveBeenCalled();
      expect(mockReadFile).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('No agent transcript path provided; skipping upload', {
        sessionId: 'sess-abc',
        agentId: 'agent-xyz'
      });
      warnSpy.mockRestore();
    });
  });

  describe('outside an action subprocess', () => {
    beforeEach(() => {
      mockExtractActionInput.mockImplementation(() => {
        throw new Error('Not in action subprocess');
      });
    });

    it('returns undefined unconditionally when not in action subprocess (no upload attempted)', async () => {
      const errorSpy = vi.spyOn(logger, 'error');
      const result = await hook(baseInput, context);

      expect(result).toBeUndefined();
      expect(errorSpy).toHaveBeenCalledWith('Not running inside an action subprocess', {
        error: 'Not in action subprocess'
      });
      expect(mockCreateCardsClient).not.toHaveBeenCalled();
      expect(mockReadFile).not.toHaveBeenCalled();
    });
  });
});
