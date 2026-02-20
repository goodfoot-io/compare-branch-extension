/**
 * Tests for the SessionEnd hook.
 *
 * @summary Tests for the SessionEnd hook
 */

import { readFile } from 'node:fs/promises';
import { extractActionInput } from '@cards/sdk/config';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCardsClient } from '../src/lib/api-discovery.js';
import hook, { TranscriptUploadError } from '../src/session-end.js';

vi.mock('@cards/sdk/config', () => ({
  extractActionInput: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn()
}));

vi.mock('../src/lib/api-discovery.js', () => ({
  createCardsClient: vi.fn()
}));

const mockExtractActionInput = vi.mocked(extractActionInput);
const mockReadFile = vi.mocked(readFile);
const mockCreateCardsClient = vi.mocked(createCardsClient);

const mockWrite = vi.fn();
const mockClose = vi.fn().mockResolvedValue({ lineCount: 5, status: 'completed' });
const mockOpenStream = vi.fn().mockReturnValue({ write: mockWrite, close: mockClose });
const mockClient = { openStream: mockOpenStream };

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
  transcript_path: '/tmp/transcript-abc.jsonl',
  cwd: '/workspace',
  hook_event_name: 'SessionEnd' as const,
  reason: 'other' as const
};

const context = { logger };

beforeEach(() => {
  vi.clearAllMocks();
  mockClose.mockResolvedValue({ lineCount: 5, status: 'completed' });
  mockOpenStream.mockReturnValue({ write: mockWrite, close: mockClose });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('TranscriptUploadError', () => {
  it('has correct name and message with Error cause', () => {
    const cause = new Error('network timeout');
    const err = new TranscriptUploadError('sess-xyz', cause);

    expect(err.name).toBe('TranscriptUploadError');
    expect(err.sessionId).toBe('sess-xyz');
    expect(err.message).toContain('sess-xyz');
    expect(err.message).toContain('network timeout');
    expect(err.cause).toBe(cause);
  });

  it('has correct name and message with string cause', () => {
    const err = new TranscriptUploadError('sess-xyz', 'raw error');

    expect(err.name).toBe('TranscriptUploadError');
    expect(err.message).toContain('raw error');
  });
});

describe('SessionEnd Hook', () => {
  it('exports a valid hook function', () => {
    expect(hook).toBeDefined();
    expect(typeof hook).toBe('function');
  });

  it('has correct hookEventName metadata', () => {
    expect(hook.hookEventName).toBe('SessionEnd');
  });

  describe('inside an action subprocess', () => {
    beforeEach(() => {
      mockExtractActionInput.mockReturnValue(baseActionInput);
      mockCreateCardsClient.mockResolvedValue(mockClient as never);
    });

    it('uploads transcript on graceful exit', async () => {
      const transcript = '{"type":"init"}\n{"type":"result"}\n';
      mockReadFile.mockResolvedValue(transcript as never);

      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SessionEnd');
      expect(mockOpenStream).toHaveBeenCalledWith('card-123', 'claude-code-session', 'sess-abc.jsonl', {
        title: 'Claude session for card-123',
        sessionId: 'sess-abc'
      });
      expect(mockClose).toHaveBeenCalled();
    });

    it('writes each non-empty transcript line to stream', async () => {
      const transcript = '{"type":"init"}\n\n{"type":"result"}\n  \n{"type":"end"}\n';
      mockReadFile.mockResolvedValue(transcript as never);

      await hook(baseInput, context);

      expect(mockWrite).toHaveBeenCalledTimes(3);
      expect(mockWrite).toHaveBeenCalledWith('{"type":"init"}');
      expect(mockWrite).toHaveBeenCalledWith('{"type":"result"}');
      expect(mockWrite).toHaveBeenCalledWith('{"type":"end"}');
    });

    it('handles empty transcript file gracefully (zero lines written)', async () => {
      mockReadFile.mockResolvedValue('' as never);

      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SessionEnd');
      expect(mockWrite).not.toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });

    it('passes correct stream metadata (cardId, sessionId, title)', async () => {
      mockReadFile.mockResolvedValue('{"type":"init"}\n' as never);

      await hook(baseInput, context);

      expect(mockOpenStream).toHaveBeenCalledWith('card-123', 'claude-code-session', 'sess-abc.jsonl', {
        title: 'Claude session for card-123',
        sessionId: 'sess-abc'
      });
    });

    it('reads from input.transcript_path', async () => {
      mockReadFile.mockResolvedValue('line1\n' as never);

      await hook(baseInput, context);

      expect(mockReadFile).toHaveBeenCalledWith('/tmp/transcript-abc.jsonl', 'utf-8');
    });

    it('handles missing transcript file (ENOENT) — logs warning, returns sessionEndOutput', async () => {
      const enoentError = Object.assign(new Error('no such file'), { code: 'ENOENT' });
      mockReadFile.mockRejectedValue(enoentError);

      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SessionEnd');
      expect(mockOpenStream).not.toHaveBeenCalled();
    });

    it('handles API discovery failure (null client) — logs warning, returns sessionEndOutput', async () => {
      mockReadFile.mockResolvedValue('{"type":"init"}\n' as never);
      mockCreateCardsClient.mockResolvedValue(null);

      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SessionEnd');
      expect(mockOpenStream).not.toHaveBeenCalled();
    });

    it('handles openStream close failure — logs TranscriptUploadError, returns sessionEndOutput (non-fatal)', async () => {
      mockReadFile.mockResolvedValue('{"type":"init"}\n' as never);
      mockClose.mockRejectedValue(new Error('stream write failed'));

      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SessionEnd');
    });
  });

  describe('outside an action subprocess', () => {
    beforeEach(() => {
      mockExtractActionInput.mockImplementation(() => {
        throw new Error('Not in action subprocess');
      });
    });

    it('returns empty sessionEndOutput when not in action subprocess', async () => {
      const result = await hook(baseInput, context);

      expect(result).toHaveProperty('_type', 'SessionEnd');
      expect(mockReadFile).not.toHaveBeenCalled();
      expect(mockOpenStream).not.toHaveBeenCalled();
    });
  });
});
