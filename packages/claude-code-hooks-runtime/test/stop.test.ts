/**
 * Tests for the Stop hook.
 *
 * @summary Tests for the Stop hook
 */

import { execFileSync } from 'node:child_process';
import { findClaudePid, removeSessionPid } from '@cards/claude-code-sessions';
import {
  appendCommitToSession,
  getSessionCommits,
  readSessionHeadSha,
  removeSessionCsv,
  removeSessionHeadSha
} from '@cards/claude-code-sessions/card-repo';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import hook, {
  CommitDiffError,
  CommitLogError,
  getCommitsSince,
  getDiffForCommits,
  getUnattributedCommits
} from '../src/stop.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn()
}));

vi.mock('@cards/claude-code-sessions', () => ({
  findClaudePid: vi.fn(),
  removeSessionPid: vi.fn()
}));

vi.mock('@cards/claude-code-sessions/card-repo', () => ({
  getSessionCommits: vi.fn(),
  appendCommitToSession: vi.fn(),
  readSessionHeadSha: vi.fn(),
  removeSessionCsv: vi.fn(),
  removeSessionHeadSha: vi.fn()
}));

const mockExecFileSync = vi.mocked(execFileSync);
const mockGetSessionCommits = vi.mocked(getSessionCommits);
const mockAppendCommitToSession = vi.mocked(appendCommitToSession);
const mockReadSessionHeadSha = vi.mocked(readSessionHeadSha);
const mockRemoveSessionCsv = vi.mocked(removeSessionCsv);
const mockRemoveSessionHeadSha = vi.mocked(removeSessionHeadSha);
const mockRemoveSessionPid = vi.mocked(removeSessionPid);
const mockFindClaudePid = vi.mocked(findClaudePid);

const logger = new Logger();
const START_SHA = 'a'.repeat(40);
const SHA_1 = '1'.repeat(40);
const SHA_2 = '2'.repeat(40);
const SHA_3 = '3'.repeat(40);
const SHA_4 = '4'.repeat(40);

/** Minimal set of env vars required by extractActionInput. */
const ACTION_ENV = {
  CARD_ID: 'card-456',
  ACTION_NAME: 'Launch Claude',
  ENVIRONMENT: 'staging',
  EXECUTION_MODE: 'interactive',
  API_BASE_URL: 'http://localhost:3000',
  API_ACCESS_TOKEN: 'test-token',
  WORKSPACE_PATH: '/workspace',
  CARD_REPO_PATH: '/workspace/.cards/repo',
  CONFIG_PATH: '/tmp/config',
  EXTENSION_PATH: '/tmp/extension'
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
      mockExecFileSync.mockReset();
      mockGetSessionCommits.mockReset();
      mockAppendCommitToSession.mockReset();
      mockReadSessionHeadSha.mockReset();
      mockRemoveSessionCsv.mockReset();
      mockRemoveSessionHeadSha.mockReset();
      mockRemoveSessionPid.mockReset();
      mockFindClaudePid.mockReset();
    });

    it('approves when no HEAD SHA stored for session', async () => {
      mockReadSessionHeadSha.mockReturnValue(null);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result.stdout as { decision?: string; systemMessage?: string };
      expect(stdout.decision).toBe('approve');
      expect(stdout.systemMessage).toContain('no HEAD SHA');
    });

    it('approves when no commits since HEAD SHA', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockReturnValue('');
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result.stdout as { decision?: string; systemMessage?: string };
      expect(stdout.decision).toBe('approve');
      expect(stdout.systemMessage).toContain('no commits since session start');
    });

    it('approves when all commits are attributed to session', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockReturnValue(`${SHA_1}\n${SHA_2}\n`);
      mockGetSessionCommits.mockReturnValue([SHA_1, SHA_2]);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result.stdout as { decision?: string; systemMessage?: string };
      expect(stdout.decision).toBe('approve');
      expect(stdout.systemMessage).toContain('all 2 commits attributed');
    });

    it('blocks with diff content when unattributed commits exist', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[0] === 'log') return `${SHA_2}\n${SHA_1}\n`;
        if (args?.[0] === 'rev-list') return `${SHA_2} parentsha`;
        if (args?.[0] === 'diff') return 'diff content here';
        return '';
      });
      mockGetSessionCommits.mockReturnValue([SHA_1]);

      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };
      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result.stdout as { decision?: string; reason?: string };
      expect(stdout.decision).toBe('block');
      expect(stdout.reason).toContain('diff content here');
      expect(stdout.reason).toContain('1 unattributed commit');
    });

    it('appends unattributed SHAs to CSV after blocking', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[0] === 'log') return `${SHA_2}\n${SHA_1}\n`;
        if (args?.[0] === 'rev-list') return `${SHA_2} parentsha`;
        if (args?.[0] === 'diff') return 'diff content';
        return '';
      });
      mockGetSessionCommits.mockReturnValue([SHA_1]);

      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };
      await hook(mockInput, context);

      expect(mockAppendCommitToSession).toHaveBeenCalledWith('sess-1', SHA_2);
      expect(mockAppendCommitToSession).not.toHaveBeenCalledWith('sess-1', SHA_1);
    });

    it('calls removeSessionPid(findClaudePid()) on cleanup', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockReturnValue('');
      mockFindClaudePid.mockReturnValue(42);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
      expect(mockRemoveSessionPid).toHaveBeenCalledWith(42);
    });

    it('approves with actionable error when git log fails', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockImplementation(() => {
        throw new Error('not a git repo');
      });
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result.stdout as { decision?: string; systemMessage?: string; reason?: string };
      expect(stdout.decision).toBe('approve');
      expect(stdout.systemMessage).toContain('Could not list commits');
      expect(stdout.systemMessage).toContain('To investigate:');
      expect(stdout.systemMessage).toContain(START_SHA);
      expect(stdout.reason).toContain('Commit log failed');
    });

    it('approves with actionable error when CSV read fails', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockReturnValue(`${SHA_1}\n`);
      mockGetSessionCommits.mockImplementation(() => {
        throw new Error('permission denied');
      });
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result.stdout as { decision?: string; systemMessage?: string; reason?: string };
      expect(stdout.decision).toBe('approve');
      expect(stdout.systemMessage).toContain('Could not read session commit records');
      expect(stdout.systemMessage).toContain('To investigate:');
      expect(stdout.reason).toContain('Session CSV read failed');
    });

    it('treats all commits as unattributed when CSV is missing (empty array from getSessionCommits)', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[0] === 'log') return `${SHA_1}\n${SHA_2}\n`;
        if (args?.[0] === 'rev-list') return `${SHA_2} parentsha`;
        if (args?.[0] === 'diff') return 'all changes diff';
        return '';
      });
      mockGetSessionCommits.mockReturnValue([]);

      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };
      const result = await hook(mockInput, context);

      const stdout = result.stdout as { decision?: string; reason?: string };
      expect(stdout.decision).toBe('block');
      expect(stdout.reason).toContain('2 unattributed commits');
      expect(mockAppendCommitToSession).toHaveBeenCalledWith('sess-1', SHA_1);
      expect(mockAppendCommitToSession).toHaveBeenCalledWith('sess-1', SHA_2);
    });

    it('uses findClaudePid for PID resolution', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockReturnValue('');
      mockFindClaudePid.mockReturnValue(42);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
      expect(mockRemoveSessionPid).toHaveBeenCalledWith(42);
    });

    it('calls removeSessionCsv during cleanup', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockReturnValue('');
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockRemoveSessionCsv).toHaveBeenCalledWith('sess-1');
    });

    it('calls removeSessionHeadSha during cleanup', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockReturnValue('');
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockRemoveSessionHeadSha).toHaveBeenCalledWith('sess-1');
    });

    it('approves with cleanup warning when removeSessionCsv throws', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockReturnValue('');
      mockRemoveSessionCsv.mockImplementation(() => {
        throw new Error('unlink failed');
      });
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);
      const stdout = result.stdout as { decision?: string; systemMessage?: string; reason?: string };
      expect(stdout.decision).toBe('approve');
      expect(stdout.systemMessage).toContain('no commits since session start');
      expect(stdout.systemMessage).toContain('Warning:');
      expect(stdout.systemMessage).toContain('unlink failed');
      expect(stdout.systemMessage).toContain('clean up manually');
      expect(stdout.reason).toContain('Cleanup failed');
    });

    it('includes warnings in block reason when diff generation fails', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[0] === 'log') return `${SHA_2}\n${SHA_1}\n`;
        // Both rev-list and diff fail
        throw new Error('repository corrupted');
      });
      mockGetSessionCommits.mockReturnValue([SHA_1]);

      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };
      const result = await hook(mockInput, context);

      const stdout = result.stdout as { decision?: string; reason?: string };
      expect(stdout.decision).toBe('block');
      expect(stdout.reason).toContain('1 unattributed commit');
      expect(stdout.reason).toContain('Could not generate diff');
      expect(stdout.reason).toContain('To view the diff manually');
      expect(stdout.reason).toContain('Warnings:');
      expect(stdout.reason).toContain('Diff generation failed');
    });

    it('includes warnings when recordUnattributedCommits fails', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[0] === 'log') return `${SHA_2}\n${SHA_1}\n`;
        if (args?.[0] === 'rev-list') return `${SHA_2} parentsha`;
        if (args?.[0] === 'diff') return 'diff content';
        return '';
      });
      mockGetSessionCommits.mockReturnValue([SHA_1]);
      mockAppendCommitToSession.mockRejectedValue(new Error('disk full'));

      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };
      const result = await hook(mockInput, context);

      const stdout = result.stdout as { decision?: string; reason?: string };
      expect(stdout.decision).toBe('block');
      expect(stdout.reason).toContain('diff content');
      expect(stdout.reason).toContain('Warnings:');
      expect(stdout.reason).toContain('Commit recording failed');
      expect(stdout.reason).toContain('disk full');
      expect(stdout.reason).toContain('session CSV is writable');
    });

    it('includes warnings when cleanupSession fails in the block path', async () => {
      mockReadSessionHeadSha.mockReturnValue(START_SHA);
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[0] === 'log') return `${SHA_2}\n${SHA_1}\n`;
        if (args?.[0] === 'rev-list') return `${SHA_2} parentsha`;
        if (args?.[0] === 'diff') return 'diff content';
        return '';
      });
      mockGetSessionCommits.mockReturnValue([SHA_1]);
      mockRemoveSessionCsv.mockImplementation(() => {
        throw new Error('unlink failed');
      });

      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };
      const result = await hook(mockInput, context);

      const stdout = result.stdout as { decision?: string; reason?: string };
      expect(stdout.decision).toBe('block');
      expect(stdout.reason).toContain('diff content');
      expect(stdout.reason).toContain('Warnings:');
      expect(stdout.reason).toContain('Session cleanup failed');
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

  describe('helper functions', () => {
    afterEach(() => {
      mockExecFileSync.mockReset();
    });

    it('getCommitsSince returns commit SHAs from git log output', () => {
      mockExecFileSync.mockReturnValue(`${SHA_1}\n${SHA_2}\n`);
      const result = getCommitsSince('/repo', START_SHA);

      expect(result).toEqual([SHA_1, SHA_2]);
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'git',
        ['log', '--format=%H', `${START_SHA}..HEAD`, '--', '.', ':!streams/claude-code-session/'],
        expect.objectContaining({ cwd: '/repo' })
      );
    });

    it('getCommitsSince returns empty array when no commits', () => {
      mockExecFileSync.mockReturnValue('');
      const result = getCommitsSince('/repo', START_SHA);

      expect(result).toEqual([]);
    });

    it('getCommitsSince throws for invalid baseline SHA', () => {
      expect(() => getCommitsSince('/repo', 'not-a-sha')).toThrow('Invalid since SHA');
      expect(mockExecFileSync).not.toHaveBeenCalled();
    });

    it('getUnattributedCommits filters out session commits', () => {
      const all = [SHA_1, SHA_2, SHA_3];
      const session = [SHA_1, SHA_3];

      const result = getUnattributedCommits(all, session);

      expect(result).toEqual([SHA_2]);
    });

    it('getDiffForCommits runs git diff on oldest commit parent to HEAD', () => {
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[0] === 'rev-list') return `${SHA_1} parentsha`;
        if (args?.[0] === 'diff') return 'diff output';
        return '';
      });
      const result = getDiffForCommits('/repo', [SHA_3, SHA_2, SHA_1]);

      expect(result).toBe('diff output');
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'git',
        ['rev-list', '--parents', '-n', '1', SHA_1],
        expect.objectContaining({ cwd: '/repo' })
      );
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'git',
        ['diff', `${SHA_1}~1..HEAD`, '--', '.', ':!streams/claude-code-session/'],
        expect.objectContaining({ cwd: '/repo' })
      );
    });

    it('getDiffForCommits uses empty tree SHA when oldest commit has no parent (initial commit)', () => {
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        // rev-list returns just the SHA (no parent) for initial commits
        if (args?.[0] === 'rev-list') return SHA_1;
        if (args?.[0] === 'diff') return 'initial commit diff';
        return '';
      });

      const result = getDiffForCommits('/repo', [SHA_1]);

      expect(result).toBe('initial commit diff');
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'git',
        ['rev-list', '--parents', '-n', '1', SHA_1],
        expect.objectContaining({ cwd: '/repo' })
      );
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'git',
        ['diff', '4b825dc642cb6eb9a060e54bf899d15363d7aa09..HEAD', '--', '.', ':!streams/claude-code-session/'],
        expect.objectContaining({ cwd: '/repo' })
      );
    });

    it('getDiffForCommits handles single initial commit SHA', () => {
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[0] === 'rev-list') return SHA_4;
        if (args?.[0] === 'diff') return 'single commit diff';
        return '';
      });

      const result = getDiffForCommits('/repo', [SHA_4]);

      expect(result).toBe('single commit diff');
    });

    it('getDiffForCommits throws CommitDiffError when git diff fails', () => {
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[0] === 'rev-list') return `${SHA_1} parentsha`;
        if (args?.[0] === 'diff') throw new Error('repository corrupted');
        return '';
      });

      expect(() => getDiffForCommits('/repo', [SHA_1])).toThrow(CommitDiffError);

      try {
        getDiffForCommits('/repo', [SHA_1]);
      } catch (error) {
        expect(error).toBeInstanceOf(CommitDiffError);
        expect((error as CommitDiffError).repoPath).toBe('/repo');
        expect((error as CommitDiffError).shas).toEqual([SHA_1]);
        expect((error as CommitDiffError).message).toContain('repository corrupted');
      }
    });

    it('getCommitsSince throws CommitLogError when git log fails', () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error('not a git repo');
      });

      expect(() => getCommitsSince('/repo', START_SHA)).toThrow(CommitLogError);

      try {
        getCommitsSince('/repo', START_SHA);
      } catch (error) {
        expect(error).toBeInstanceOf(CommitLogError);
        expect((error as CommitLogError).repoPath).toBe('/repo');
        expect((error as CommitLogError).sinceSha).toBe(START_SHA);
        expect((error as CommitLogError).message).toContain('not a git repo');
      }
    });
  });
});
