/**
 * Tests for the card-repo PID registry module.
 *
 * @summary Tests for card-repo PID registry
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:os', () => ({
  homedir: vi.fn(() => process.env.MOCK_HOMEDIR || '/tmp'),
  tmpdir: vi.fn(() => '/tmp')
}));

import { tmpdir as realTmpdir } from 'node:os';
import {
  appendCommitToSession,
  getSessionCommits,
  readSessionHeadSha,
  removeSessionCsv,
  removeSessionHeadSha,
  writeSessionHeadSha
} from '../src/card-repo.js';

describe('card-repo', () => {
  let testDir: string;
  let cardRepoCommitsDir: string;
  const sessionId = 'test-session-abc123';

  beforeEach(() => {
    testDir = join(realTmpdir(), `card-repo-test-${Date.now()}-${Math.random()}`);
    mkdirSync(testDir, { recursive: true });
    process.env.MOCK_HOMEDIR = testDir;
    cardRepoCommitsDir = join(testDir, '.cards', 'card-repo-commits');
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    delete process.env.MOCK_HOMEDIR;
  });

  // -------------------------------------------------------------------------
  // appendCommitToSession
  // -------------------------------------------------------------------------

  describe('appendCommitToSession', () => {
    it('creates directory and CSV file with SHA', async () => {
      const sha = 'abc123def456';
      await appendCommitToSession(sessionId, sha);

      const csvPath = join(cardRepoCommitsDir, `${sessionId}.csv`);
      expect(existsSync(csvPath)).toBe(true);
      const content = readFileSync(csvPath, 'utf-8');
      expect(content).toBe(`${sha}\n`);
    });

    it('creates ~/.cards/card-repo-commits/ directory', async () => {
      await appendCommitToSession(sessionId, 'sha1');
      expect(existsSync(cardRepoCommitsDir)).toBe(true);
    });

    it('deduplicates SHAs — does not append duplicate', async () => {
      const sha = 'deadbeef1234';
      await appendCommitToSession(sessionId, sha);
      await appendCommitToSession(sessionId, sha);

      const csvPath = join(cardRepoCommitsDir, `${sessionId}.csv`);
      const content = readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.length > 0);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe(sha);
    });

    it('appends multiple distinct SHAs', async () => {
      const sha1 = 'aaa111';
      const sha2 = 'bbb222';
      await appendCommitToSession(sessionId, sha1);
      await appendCommitToSession(sessionId, sha2);

      const commits = getSessionCommits(sessionId);
      expect(commits).toEqual([sha1, sha2]);
    });

    it('acquires per-session lock file during operation (lock file cleaned up)', async () => {
      const sha = 'locktest111';
      await appendCommitToSession(sessionId, sha);

      // Lock should be released after operation
      const lockPath = join(cardRepoCommitsDir, `${sessionId}.csv.lock`);
      expect(existsSync(lockPath)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getSessionCommits
  // -------------------------------------------------------------------------

  describe('getSessionCommits', () => {
    it('returns SHAs from existing CSV file', async () => {
      const sha1 = 'sha1abc';
      const sha2 = 'sha2def';
      await appendCommitToSession(sessionId, sha1);
      await appendCommitToSession(sessionId, sha2);

      const commits = getSessionCommits(sessionId);
      expect(commits).toEqual([sha1, sha2]);
    });

    it('returns empty array when CSV is absent', () => {
      const commits = getSessionCommits('nonexistent-session');
      expect(commits).toEqual([]);
    });

    it('throws on read error that is not ENOENT', () => {
      // Create CSV as a directory so reading it as a file fails
      mkdirSync(join(cardRepoCommitsDir, `${sessionId}.csv`), { recursive: true });

      expect(() => getSessionCommits(sessionId)).toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // removeSessionCsv
  // -------------------------------------------------------------------------

  describe('removeSessionCsv', () => {
    it('deletes CSV and lock files', async () => {
      await appendCommitToSession(sessionId, 'sha-to-delete');

      const csvPath = join(cardRepoCommitsDir, `${sessionId}.csv`);
      // Create a lock file to test deletion
      writeFileSync(join(cardRepoCommitsDir, `${sessionId}.csv.lock`), '12345');

      expect(existsSync(csvPath)).toBe(true);

      removeSessionCsv(sessionId);

      expect(existsSync(csvPath)).toBe(false);
      expect(existsSync(join(cardRepoCommitsDir, `${sessionId}.csv.lock`))).toBe(false);
    });

    it('no-ops when CSV and lock files are absent', () => {
      // Should not throw
      expect(() => removeSessionCsv('nonexistent-session')).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // writeSessionHeadSha
  // -------------------------------------------------------------------------

  describe('writeSessionHeadSha', () => {
    it('creates ~/.cards/card-repo-commits/{sessionId}.head with SHA content', () => {
      const sha = 'headsha1234567890abcdef';
      writeSessionHeadSha(sessionId, sha);

      const headPath = join(cardRepoCommitsDir, `${sessionId}.head`);
      expect(existsSync(headPath)).toBe(true);
      const content = readFileSync(headPath, 'utf-8');
      expect(content).toBe(sha);
    });

    it('creates directory if not present', () => {
      writeSessionHeadSha(sessionId, 'anysha');
      expect(existsSync(cardRepoCommitsDir)).toBe(true);
    });

    it('overwrites existing .head file', () => {
      writeSessionHeadSha(sessionId, 'oldsha');
      writeSessionHeadSha(sessionId, 'newsha');

      const headPath = join(cardRepoCommitsDir, `${sessionId}.head`);
      const content = readFileSync(headPath, 'utf-8');
      expect(content).toBe('newsha');
    });
  });

  // -------------------------------------------------------------------------
  // readSessionHeadSha
  // -------------------------------------------------------------------------

  describe('readSessionHeadSha', () => {
    it('reads and trims .head file content', () => {
      const sha = 'trimmedsha1234';
      mkdirSync(cardRepoCommitsDir, { recursive: true });
      writeFileSync(join(cardRepoCommitsDir, `${sessionId}.head`), `  ${sha}  \n`);

      const result = readSessionHeadSha(sessionId);
      expect(result).toBe(sha);
    });

    it('returns null when .head file is absent', () => {
      const result = readSessionHeadSha('nonexistent-session');
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // removeSessionHeadSha
  // -------------------------------------------------------------------------

  describe('removeSessionHeadSha', () => {
    it('deletes .head file', () => {
      writeSessionHeadSha(sessionId, 'sha-for-removal');

      const headPath = join(cardRepoCommitsDir, `${sessionId}.head`);
      expect(existsSync(headPath)).toBe(true);

      removeSessionHeadSha(sessionId);
      expect(existsSync(headPath)).toBe(false);
    });

    it('no-ops when .head file is absent', () => {
      expect(() => removeSessionHeadSha('nonexistent-session')).not.toThrow();
    });
  });
});
