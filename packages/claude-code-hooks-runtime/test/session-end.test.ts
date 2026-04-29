/**
 * Tests for the SessionEnd hook.
 *
 * @summary Tests for the SessionEnd hook
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { extractActionInput } from '@cards/sdk/config';
import { findAgentPid, removeSessionPid } from '@cards/sessions';
import { removeSessionCsv, removeSessionHeadSha, removeSessionRouteNudge } from '@cards/sessions/card-repo';
import { Logger } from '@goodfoot/claude-code-hooks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import hook from '../src/session-end.js';

vi.mock('@cards/sdk/config', () => ({
  extractActionInput: vi.fn()
}));

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn()
}));

vi.mock('@cards/sessions', () => ({
  findAgentPid: vi.fn(),
  removeSessionPid: vi.fn()
}));

vi.mock('@cards/sessions/card-repo', () => ({
  removeSessionCsv: vi.fn(),
  removeSessionHeadSha: vi.fn(),
  removeSessionRouteNudge: vi.fn()
}));

const mockExtractActionInput = vi.mocked(extractActionInput);
const mockMkdir = vi.mocked(mkdir);
const mockWriteFile = vi.mocked(writeFile);
const mockFindClaudePid = vi.mocked(findAgentPid);
const mockRemoveSessionPid = vi.mocked(removeSessionPid);
const mockRemoveSessionCsv = vi.mocked(removeSessionCsv);
const mockRemoveSessionHeadSha = vi.mocked(removeSessionHeadSha);
const mockRemoveSessionRouteNudge = vi.mocked(removeSessionRouteNudge);

const logger = new Logger();

const baseActionInput = {
  cardId: 'card-123',
  actionName: 'Launch',
  environment: 'default',
  executionMode: 'interactive' as const,
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
  transcript_path: '/tmp/transcript-abc.jsonl',
  cwd: '/workspace',
  hook_event_name: 'SessionEnd' as const,
  reason: 'other' as const
};

const context = { logger };

beforeEach(() => {
  vi.resetAllMocks();
  mockMkdir.mockResolvedValue(undefined as never);
  mockWriteFile.mockResolvedValue(undefined as never);
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
    });

    it('writes empty sentinel file at {cardRepoPath}/streams/claude-code-session/{sessionId}.flush', async () => {
      await hook(baseInput, context);

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/tmp/card-repos/card-123/streams/claude-code-session/sess-abc.flush',
        ''
      );
    });

    it('creates parent directories if missing', async () => {
      await hook(baseInput, context);

      expect(mockMkdir).toHaveBeenCalledWith('/tmp/card-repos/card-123/streams/claude-code-session', {
        recursive: true
      });
    });

    it('returns null on success', async () => {
      const result = await hook(baseInput, context);

      expect(result).toBeNull();
    });

    it('handles write failure gracefully — logs warning, still returns null', async () => {
      mockWriteFile.mockRejectedValue(new Error('disk full'));

      const result = await hook(baseInput, context);

      expect(result).toBeNull();
    });

    it('does not call createCardsClient or openStream', async () => {
      // Verify the module does not import or use createCardsClient
      // The mock for api-discovery is not set up — if it were called, it would throw
      const result = await hook(baseInput, context);

      expect(result).toBeNull();
      // writeFile and mkdir are the only fs operations
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
    });

    describe('session artifact cleanup', () => {
      it('calls removeSessionPid with resolved PID from findAgentPid', async () => {
        mockFindClaudePid.mockReturnValue(42);

        await hook(baseInput, context);

        expect(mockFindClaudePid).toHaveBeenCalled();
        expect(mockRemoveSessionPid).toHaveBeenCalledWith(42);
      });

      it('skips PID removal when findAgentPid returns null', async () => {
        mockFindClaudePid.mockReturnValue(null);

        await hook(baseInput, context);

        expect(mockFindClaudePid).toHaveBeenCalled();
        expect(mockRemoveSessionPid).not.toHaveBeenCalled();
      });

      it('calls removeSessionHeadSha with session ID', async () => {
        await hook(baseInput, context);

        expect(mockRemoveSessionHeadSha).toHaveBeenCalledWith('sess-abc');
      });

      it('calls removeSessionCsv with session ID', async () => {
        await hook(baseInput, context);

        expect(mockRemoveSessionCsv).toHaveBeenCalledWith('sess-abc');
      });

      it('calls removeSessionRouteNudge with session ID', async () => {
        await hook(baseInput, context);

        expect(mockRemoveSessionRouteNudge).toHaveBeenCalledWith('sess-abc');
      });

      it('handles cleanup failure gracefully — still returns null', async () => {
        mockRemoveSessionCsv.mockImplementation(() => {
          throw new Error('unlink failed');
        });

        const result = await hook(baseInput, context);

        expect(result).toBeNull();
      });

      it('handles removeSessionPid failure gracefully', async () => {
        mockFindClaudePid.mockReturnValue(42);
        mockRemoveSessionPid.mockRejectedValue(new Error('permission denied'));

        const result = await hook(baseInput, context);

        expect(result).toBeNull();
      });

      it('runs cleanup even when sentinel write fails', async () => {
        mockWriteFile.mockRejectedValue(new Error('disk full'));

        await hook(baseInput, context);

        expect(mockRemoveSessionHeadSha).toHaveBeenCalledWith('sess-abc');
        expect(mockRemoveSessionCsv).toHaveBeenCalledWith('sess-abc');
      });
    });
  });

  describe('outside an action subprocess', () => {
    beforeEach(() => {
      mockExtractActionInput.mockImplementation(() => {
        throw new Error('Not in action subprocess');
      });
    });

    it('returns null when not in action subprocess', async () => {
      const result = await hook(baseInput, context);

      expect(result).toBeNull();
      expect(mockMkdir).not.toHaveBeenCalled();
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('does not attempt cleanup when not in action subprocess', async () => {
      await hook(baseInput, context);

      expect(mockFindClaudePid).not.toHaveBeenCalled();
      expect(mockRemoveSessionPid).not.toHaveBeenCalled();
      expect(mockRemoveSessionCsv).not.toHaveBeenCalled();
      expect(mockRemoveSessionHeadSha).not.toHaveBeenCalled();
    });
  });
});
