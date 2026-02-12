/**
 * Tests for the Stop hook.
 */

import { execFileSync } from 'node:child_process';
import {
  appendCommitToSession,
  getSessionCommits,
  removeSessionCsv,
  removeSessionPid
} from '@cards/git-hooks/lib/card-repo-sessions';
import { findClaudePid } from '@cards/git-hooks/lib/process-tree';
import { Logger } from '@goodfoot/claude-code-hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import hook, { getCommitsSince, getDiffForCommits, getUnattributedCommits } from '../src/stop.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn()
}));

vi.mock('@cards/git-hooks/lib/card-repo-sessions', () => ({
  getSessionCommits: vi.fn(),
  appendCommitToSession: vi.fn(),
  removeSessionPid: vi.fn(),
  removeSessionCsv: vi.fn()
}));

vi.mock('@cards/git-hooks/lib/process-tree', () => ({
  findClaudePid: vi.fn()
}));

const mockExecFileSync = vi.mocked(execFileSync);
const mockGetSessionCommits = vi.mocked(getSessionCommits);
const mockAppendCommitToSession = vi.mocked(appendCommitToSession);
const mockRemoveSessionPid = vi.mocked(removeSessionPid);
const mockRemoveSessionCsv = vi.mocked(removeSessionCsv);
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
      delete process.env['SESSION_GIT_HEAD_SHA'];
      delete process.env['SESSION_CLAUDE_PID'];
      mockExecFileSync.mockReset();
      mockGetSessionCommits.mockReset();
      mockAppendCommitToSession.mockReset();
      mockRemoveSessionPid.mockReset();
      mockRemoveSessionCsv.mockReset();
      mockFindClaudePid.mockReset();
    });

    it('approves when no SESSION_GIT_HEAD_SHA set', async () => {
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result.stdout as { decision?: string; systemMessage?: string };
      expect(stdout.decision).toBe('approve');
      expect(stdout.systemMessage).toContain('no HEAD SHA');
    });

    it('approves when no commits since HEAD SHA', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = START_SHA;
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
      process.env['SESSION_GIT_HEAD_SHA'] = START_SHA;
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
      process.env['SESSION_GIT_HEAD_SHA'] = START_SHA;
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[0] === 'log') return `${SHA_2}\n${SHA_1}\n`;
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
      process.env['SESSION_GIT_HEAD_SHA'] = START_SHA;
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[0] === 'log') return `${SHA_2}\n${SHA_1}\n`;
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
      process.env['SESSION_GIT_HEAD_SHA'] = START_SHA;
      mockExecFileSync.mockReturnValue('');
      mockFindClaudePid.mockReturnValue(42);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
      expect(mockRemoveSessionPid).toHaveBeenCalledWith(42);
    });

    it('blocks with error message when git log fails', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = START_SHA;
      mockExecFileSync.mockImplementation(() => {
        throw new Error('git log failed: not a git repo');
      });
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result.stdout as { decision?: string; reason?: string };
      expect(stdout.decision).toBe('block');
      expect(stdout.reason).toContain('git log failed');
    });

    it('blocks with error message when CSV read fails', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = START_SHA;
      mockExecFileSync.mockReturnValue(`${SHA_1}\n`);
      mockGetSessionCommits.mockImplementation(() => {
        throw new Error('permission denied');
      });
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result.stdout as { decision?: string; reason?: string };
      expect(stdout.decision).toBe('block');
      expect(stdout.reason).toContain('CSV read failed');
    });

    it('treats all commits as unattributed when CSV is missing (empty array from getSessionCommits)', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = START_SHA;
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[0] === 'log') return `${SHA_1}\n${SHA_2}\n`;
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

    it('uses SESSION_CLAUDE_PID for removeSessionPid when env var is set', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = START_SHA;
      process.env['SESSION_CLAUDE_PID'] = '99';
      mockExecFileSync.mockReturnValue('');
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockRemoveSessionPid).toHaveBeenCalledWith(99);
      expect(mockFindClaudePid).not.toHaveBeenCalled();
    });

    it('falls back to findClaudePid when SESSION_CLAUDE_PID not set', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = START_SHA;
      mockExecFileSync.mockReturnValue('');
      mockFindClaudePid.mockReturnValue(42);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
      expect(mockRemoveSessionPid).toHaveBeenCalledWith(42);
    });

    it('calls removeSessionCsv during cleanup', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = START_SHA;
      mockExecFileSync.mockReturnValue('');
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockRemoveSessionCsv).toHaveBeenCalledWith('sess-1');
    });

    it('gracefully handles removeSessionCsv throwing', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = START_SHA;
      mockExecFileSync.mockReturnValue('');
      mockRemoveSessionCsv.mockImplementation(() => {
        throw new Error('unlink failed');
      });
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);
      const stdout = result.stdout as { decision?: string };
      expect(stdout.decision).toBe('approve');
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
        ['log', '--format=%H', `${START_SHA}..HEAD`],
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
      mockExecFileSync.mockReturnValue('diff output');
      const result = getDiffForCommits('/repo', [SHA_3, SHA_2, SHA_1]);

      expect(result).toBe('diff output');
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'git',
        ['diff', `${SHA_1}~1..HEAD`],
        expect.objectContaining({ cwd: '/repo' })
      );
    });

    it('getDiffForCommits falls back to empty tree SHA when oldest~1 fails (initial commit)', () => {
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[1]?.includes('~1')) {
          throw new Error('unknown revision');
        }
        if (args?.[1]?.includes('4b825dc642cb6eb9a060e54bf899d15363d7aa09')) {
          return 'initial commit diff';
        }
        return '';
      });

      const result = getDiffForCommits('/repo', [SHA_1]);

      expect(result).toBe('initial commit diff');
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'git',
        ['diff', `${SHA_1}~1..HEAD`],
        expect.objectContaining({ cwd: '/repo' })
      );
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'git',
        ['diff', '4b825dc642cb6eb9a060e54bf899d15363d7aa09..HEAD'],
        expect.objectContaining({ cwd: '/repo' })
      );
    });

    it('getDiffForCommits handles single initial commit SHA', () => {
      mockExecFileSync.mockImplementation((_file: string, args?: readonly string[]) => {
        if (args?.[1]?.includes('~1')) {
          throw new Error('unknown revision');
        }
        return 'single commit diff';
      });

      const result = getDiffForCommits('/repo', [SHA_4]);

      expect(result).toBe('single commit diff');
    });
  });
});
