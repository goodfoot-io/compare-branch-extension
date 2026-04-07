/**
 * Tests for the PostToolUse hook.
 *
 * @summary Tests for the PostToolUse hook
 */

import { execFileSync } from 'node:child_process';
import { appendCommitToSession, getSessionCommits, readSessionHeadSha } from '@cards/claude-code-sessions/card-repo';
import { getCommitsSince } from '@cards/sdk/card-repo';
import { getUnattributedCommits } from '@cards/sdk/client';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import hook from '../src/post-tool-use.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn()
}));

vi.mock('@cards/claude-code-sessions/card-repo', () => ({
  getSessionCommits: vi.fn(),
  appendCommitToSession: vi.fn(),
  readSessionHeadSha: vi.fn()
}));

vi.mock('@cards/sdk/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cards/sdk/client')>();
  return {
    ...actual,
    getUnattributedCommits: vi.fn()
  };
});

vi.mock('@cards/sdk/card-repo', () => ({
  getCommitsSince: vi.fn()
}));

vi.mock('../src/lib/resolve-head.js', () => ({
  resolveHeadFromFiles: vi.fn()
}));

const mockExecFileSync = vi.mocked(execFileSync);
const mockGetSessionCommits = vi.mocked(getSessionCommits);
const mockAppendCommitToSession = vi.mocked(appendCommitToSession);
const mockReadSessionHeadSha = vi.mocked(readSessionHeadSha);
const mockGetCommitsSince = vi.mocked(getCommitsSince);
const mockGetUnattributedCommits = vi.mocked(getUnattributedCommits);

// Import after mock declaration so the mock is in place
const { resolveHeadFromFiles } = await import('../src/lib/resolve-head.js');
const mockResolveHeadFromFiles = vi.mocked(resolveHeadFromFiles);

const logger = new Logger();
const START_SHA = 'a'.repeat(40);
const SHA_1 = '1'.repeat(40);
const SHA_2 = '2'.repeat(40);
const SHA_EXT = 'e'.repeat(40);

/** Minimal set of env vars required by extractActionInput. */
const ACTION_ENV = {
  CARD_ID: 'card-456',
  ACTION_NAME: 'Launch Claude',
  ENVIRONMENT: 'staging',
  EXECUTION_MODE: 'interactive',
  REPO_ROOT: '/workspace',
  CARD_REPO_PATH: '/workspace/.cards/repo',
  CONFIG_PATH: '/tmp/config',
  EXTENSION_PATH: '/tmp/extension',
  MARKETPLACE_PATH: '/tmp/extension/dist/marketplace'
} as const;

describe('PostToolUse Hook', () => {
  it('has correct hookEventName metadata', () => {
    expect(hook.hookEventName).toBe('PostToolUse');
  });

  describe('outside an action subprocess', () => {
    it('returns empty output when action env vars are missing', async () => {
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'PostToolUse');
      const stdout = result.stdout as { hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.hookSpecificOutput).toBeUndefined();
    });
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
      mockExecFileSync.mockReset();
      mockGetSessionCommits.mockReset();
      mockAppendCommitToSession.mockReset();
      mockReadSessionHeadSha.mockReset();
      mockGetCommitsSince.mockReset();
      mockGetUnattributedCommits.mockReset();
      mockResolveHeadFromFiles.mockReset();
    });

    it('returns empty output when no HEAD SHA stored for session', async () => {
      mockReadSessionHeadSha.mockReturnValue(null);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'PostToolUse');
      const stdout = result.stdout as { hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.hookSpecificOutput).toBeUndefined();
    });

    it('returns additionalContext with diagnostic when readSessionHeadSha throws', async () => {
      mockReadSessionHeadSha.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'PostToolUse');
      const stdout = result.stdout as { hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('Could not read session HEAD SHA');
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('sess-1');
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('EACCES: permission denied');
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('To investigate:');
    });

    it('returns additionalContext with diagnostic when HEAD resolution fails', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockResolveHeadFromFiles.mockReturnValue(null);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'PostToolUse');
      const stdout = result.stdout as { hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('Could not resolve HEAD');
      expect(stdout.hookSpecificOutput?.additionalContext).toContain(ACTION_ENV.CARD_REPO_PATH);
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('To investigate:');
    });

    it('returns empty output when current HEAD equals baseline (fast path)', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockResolveHeadFromFiles.mockReturnValue(START_SHA);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'PostToolUse');
      const stdout = result.stdout as { hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.hookSpecificOutput).toBeUndefined();
      // Verify no subprocess was spawned
      expect(mockGetCommitsSince).not.toHaveBeenCalled();
    });

    it('returns empty output when HEAD advanced but all commits attributed', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockResolveHeadFromFiles.mockReturnValue(SHA_1);
      mockGetSessionCommits.mockReturnValue([SHA_1]);
      mockGetCommitsSince.mockReturnValue([SHA_1]);
      mockGetUnattributedCommits.mockReturnValue([]);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'PostToolUse');
      const stdout = result.stdout as { hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.hookSpecificOutput).toBeUndefined();
    });

    it('returns additionalContext when unattributed commits found', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockResolveHeadFromFiles.mockReturnValue(SHA_2);
      mockGetSessionCommits.mockReturnValue([SHA_1]);
      mockGetCommitsSince.mockReturnValue([SHA_2, SHA_1]);
      mockGetUnattributedCommits.mockReturnValue([SHA_2]);
      mockExecFileSync.mockReturnValue('abc1234 - External Author: Add feature\nfile.ts');

      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };
      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'PostToolUse');
      const stdout = result.stdout as { hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('1 unattributed commit');
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('External changes detected');
    });

    it('detects intermediate unattributed commit when HEAD is attributed', async () => {
      // External SHA_EXT then Claude SHA_1: HEAD=SHA_1 is in CSV but SHA_EXT is not
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockResolveHeadFromFiles.mockReturnValue(SHA_1);
      mockGetSessionCommits.mockReturnValue([SHA_1]);
      mockGetCommitsSince.mockReturnValue([SHA_1, SHA_EXT]);
      mockGetUnattributedCommits.mockReturnValue([SHA_EXT]);
      mockExecFileSync.mockReturnValue('eee1234 - External: Change\nsome-file.ts');

      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };
      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'PostToolUse');
      const stdout = result.stdout as { hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('1 unattributed commit');
      // Verify full diff was used (getCommitsSince called, not just HEAD check)
      expect(mockGetCommitsSince).toHaveBeenCalledWith(ACTION_ENV.CARD_REPO_PATH, START_SHA);
    });

    it('records unattributed SHAs after surfacing them', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockResolveHeadFromFiles.mockReturnValue(SHA_2);
      mockGetSessionCommits.mockReturnValue([SHA_1]);
      mockGetCommitsSince.mockReturnValue([SHA_2, SHA_1]);
      mockGetUnattributedCommits.mockReturnValue([SHA_2]);
      mockExecFileSync.mockReturnValue('stat content');

      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };
      await hook(mockInput, context);

      expect(mockAppendCommitToSession).toHaveBeenCalledWith('sess-1', SHA_2);
      expect(mockAppendCommitToSession).not.toHaveBeenCalledWith('sess-1', SHA_1);
    });

    it('includes warning in output but still surfaces commits when recording fails', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockResolveHeadFromFiles.mockReturnValue(SHA_2);
      mockGetSessionCommits.mockReturnValue([SHA_1]);
      mockGetCommitsSince.mockReturnValue([SHA_2, SHA_1]);
      mockGetUnattributedCommits.mockReturnValue([SHA_2]);
      mockExecFileSync.mockReturnValue('stat content');
      mockAppendCommitToSession.mockRejectedValue(new Error('disk full'));

      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };
      const result = await hook(mockInput, context);

      const stdout = result.stdout as { hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('External changes detected');
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('Warnings:');
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('Commit recording failed');
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('disk full');
    });

    it('returns additionalContext with diagnostic when CSV read fails', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockResolveHeadFromFiles.mockReturnValue(SHA_1);
      mockGetSessionCommits.mockImplementation(() => {
        throw new Error('permission denied');
      });
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'PostToolUse');
      const stdout = result.stdout as { hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('Could not read session commit records');
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('To investigate:');
    });

    it('returns additionalContext with diagnostic when getCommitsSince fails', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockResolveHeadFromFiles.mockReturnValue(SHA_1);
      mockGetSessionCommits.mockReturnValue([]);
      mockGetCommitsSince.mockImplementation(() => {
        throw new Error('not a git repo');
      });
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'PostToolUse');
      const stdout = result.stdout as { hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('Could not list commits');
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('To investigate:');
      expect(stdout.hookSpecificOutput?.additionalContext).toContain(START_SHA);
    });

    it('returns fallback text when git log formatting fails', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockResolveHeadFromFiles.mockReturnValue(SHA_2);
      mockGetSessionCommits.mockReturnValue([SHA_1]);
      mockGetCommitsSince.mockReturnValue([SHA_2, SHA_1]);
      mockGetUnattributedCommits.mockReturnValue([SHA_2]);
      mockExecFileSync.mockImplementation(() => {
        throw new Error('repository corrupted');
      });

      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };
      const result = await hook(mockInput, context);

      const stdout = result.stdout as { hookSpecificOutput?: { additionalContext?: string } };
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('External changes detected');
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('Could not generate log --name-only');
      expect(stdout.hookSpecificOutput?.additionalContext).toContain('To view manually');
    });
  });
});
