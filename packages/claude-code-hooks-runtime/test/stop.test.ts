/**
 * Tests for the Stop hook.
 */

import { execSync } from 'node:child_process';
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
  execSync: vi.fn()
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

const mockExecSync = vi.mocked(execSync);
const mockGetSessionCommits = vi.mocked(getSessionCommits);
const mockAppendCommitToSession = vi.mocked(appendCommitToSession);
const mockRemoveSessionPid = vi.mocked(removeSessionPid);
const mockRemoveSessionCsv = vi.mocked(removeSessionCsv);
const mockFindClaudePid = vi.mocked(findClaudePid);

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
      delete process.env['SESSION_GIT_HEAD_SHA'];
      delete process.env['SESSION_CLAUDE_PID'];
      mockExecSync.mockReset();
      mockGetSessionCommits.mockReset();
      mockAppendCommitToSession.mockReset();
      mockRemoveSessionPid.mockReset();
      mockRemoveSessionCsv.mockReset();
      mockFindClaudePid.mockReset();
    });

    it('approves when no SESSION_GIT_HEAD_SHA set', async () => {
      // SESSION_GIT_HEAD_SHA is not set
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result.stdout as { decision?: string; systemMessage?: string };
      expect(stdout.decision).toBe('approve');
      expect(stdout.systemMessage).toContain('no HEAD SHA');
    });

    it('approves when no commits since HEAD SHA', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = 'abc123';
      mockExecSync.mockReturnValue('');
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result.stdout as { decision?: string; systemMessage?: string };
      expect(stdout.decision).toBe('approve');
      expect(stdout.systemMessage).toContain('no commits since session start');
    });

    it('approves when all commits are attributed to session', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = 'abc123';
      mockExecSync.mockReturnValue('sha1\nsha2\n');
      mockGetSessionCommits.mockReturnValue(['sha1', 'sha2']);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      expect(result).toHaveProperty('_type', 'Stop');
      const stdout = result.stdout as { decision?: string; systemMessage?: string };
      expect(stdout.decision).toBe('approve');
      expect(stdout.systemMessage).toContain('all 2 commits attributed');
    });

    it('blocks with diff content when unattributed commits exist', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = 'abc123';
      // git log returns two commits (newest first)
      mockExecSync.mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.startsWith('git log')) {
          return 'sha2\nsha1\n';
        }
        if (typeof cmd === 'string' && cmd.startsWith('git diff')) {
          return 'diff content here';
        }
        return '';
      });
      // Only sha1 is attributed
      mockGetSessionCommits.mockReturnValue(['sha1']);
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
      process.env['SESSION_GIT_HEAD_SHA'] = 'abc123';
      mockExecSync.mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.startsWith('git log')) {
          return 'sha2\nsha1\n';
        }
        if (typeof cmd === 'string' && cmd.startsWith('git diff')) {
          return 'diff content';
        }
        return '';
      });
      // Only sha1 is attributed, sha2 is not
      mockGetSessionCommits.mockReturnValue(['sha1']);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockAppendCommitToSession).toHaveBeenCalledWith('sess-1', 'sha2');
      expect(mockAppendCommitToSession).not.toHaveBeenCalledWith('sess-1', 'sha1');
    });

    it('calls removeSessionPid(findClaudePid()) on cleanup', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = 'abc123';
      mockExecSync.mockReturnValue('');
      mockFindClaudePid.mockReturnValue(42);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
      expect(mockRemoveSessionPid).toHaveBeenCalledWith(42);
    });

    it('blocks with error message when git log fails', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = 'abc123';
      mockExecSync.mockImplementation(() => {
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
      process.env['SESSION_GIT_HEAD_SHA'] = 'abc123';
      mockExecSync.mockReturnValue('sha1\n');
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
      process.env['SESSION_GIT_HEAD_SHA'] = 'abc123';
      mockExecSync.mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.startsWith('git log')) {
          return 'sha1\nsha2\n';
        }
        if (typeof cmd === 'string' && cmd.startsWith('git diff')) {
          return 'all changes diff';
        }
        return '';
      });
      // Empty array = no CSV / no attributed commits
      mockGetSessionCommits.mockReturnValue([]);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      const result = await hook(mockInput, context);

      const stdout = result.stdout as { decision?: string; reason?: string };
      expect(stdout.decision).toBe('block');
      expect(stdout.reason).toContain('2 unattributed commits');
      // Both should be appended
      expect(mockAppendCommitToSession).toHaveBeenCalledWith('sess-1', 'sha1');
      expect(mockAppendCommitToSession).toHaveBeenCalledWith('sess-1', 'sha2');
    });

    it('uses SESSION_CLAUDE_PID for removeSessionPid when env var is set', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = 'abc123';
      process.env['SESSION_CLAUDE_PID'] = '99';
      mockExecSync.mockReturnValue('');
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockRemoveSessionPid).toHaveBeenCalledWith(99);
      expect(mockFindClaudePid).not.toHaveBeenCalled();
    });

    it('falls back to findClaudePid when SESSION_CLAUDE_PID not set', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = 'abc123';
      // SESSION_CLAUDE_PID not set
      mockExecSync.mockReturnValue('');
      mockFindClaudePid.mockReturnValue(42);
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockFindClaudePid).toHaveBeenCalled();
      expect(mockRemoveSessionPid).toHaveBeenCalledWith(42);
    });

    it('calls removeSessionCsv during cleanup', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = 'abc123';
      mockExecSync.mockReturnValue('');
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      await hook(mockInput, context);

      expect(mockRemoveSessionCsv).toHaveBeenCalledWith('sess-1');
    });

    it('gracefully handles removeSessionCsv throwing', async () => {
      process.env['SESSION_GIT_HEAD_SHA'] = 'abc123';
      mockExecSync.mockReturnValue('');
      mockRemoveSessionCsv.mockImplementation(() => {
        throw new Error('unlink failed');
      });
      const mockInput = { session_id: 'sess-1' } as Parameters<typeof hook>[0];
      const context = { logger };

      // Should not throw
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
      mockExecSync.mockReset();
    });

    it('getCommitsSince returns commit SHAs from git log output', () => {
      mockExecSync.mockReturnValue('abc123\ndef456\n');
      const result = getCommitsSince('/repo', 'startsha');

      expect(result).toEqual(['abc123', 'def456']);
      expect(mockExecSync).toHaveBeenCalledWith(
        'git log --format=%H startsha..HEAD',
        expect.objectContaining({ cwd: '/repo' })
      );
    });

    it('getCommitsSince returns empty array when no commits', () => {
      mockExecSync.mockReturnValue('');
      const result = getCommitsSince('/repo', 'startsha');

      expect(result).toEqual([]);
    });

    it('getUnattributedCommits filters out session commits', () => {
      const all = ['sha1', 'sha2', 'sha3'];
      const session = ['sha1', 'sha3'];

      const result = getUnattributedCommits(all, session);

      expect(result).toEqual(['sha2']);
    });

    it('getDiffForCommits runs git diff on oldest commit parent to HEAD', () => {
      mockExecSync.mockReturnValue('diff output');
      // shas are in reverse chronological order (newest first)
      const result = getDiffForCommits('/repo', ['sha3', 'sha2', 'sha1']);

      expect(result).toBe('diff output');
      expect(mockExecSync).toHaveBeenCalledWith('git diff sha1~1..HEAD', expect.objectContaining({ cwd: '/repo' }));
    });

    it('getDiffForCommits falls back to empty tree SHA when oldest~1 fails (initial commit)', () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('~1')) {
          throw new Error('unknown revision');
        }
        if (typeof cmd === 'string' && cmd.includes('4b825dc642cb6eb9a060e54bf899d15363d7aa09')) {
          return 'initial commit diff';
        }
        return '';
      });

      const result = getDiffForCommits('/repo', ['sha1']);

      expect(result).toBe('initial commit diff');
      // Verify it tried the parent first, then fell back to empty tree
      expect(mockExecSync).toHaveBeenCalledWith('git diff sha1~1..HEAD', expect.objectContaining({ cwd: '/repo' }));
      expect(mockExecSync).toHaveBeenCalledWith(
        'git diff 4b825dc642cb6eb9a060e54bf899d15363d7aa09..HEAD',
        expect.objectContaining({ cwd: '/repo' })
      );
    });

    it('getDiffForCommits handles single initial commit SHA', () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('~1')) {
          throw new Error('unknown revision');
        }
        return 'single commit diff';
      });

      const result = getDiffForCommits('/repo', ['initial-sha']);

      expect(result).toBe('single commit diff');
    });
  });
});
