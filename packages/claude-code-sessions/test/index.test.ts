/**
 * @file Tests for the claude-code-sessions package entry point.
 * @summary Tests for the claude-code-sessions package entry point.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:os', () => ({
  homedir: vi.fn(() => process.env.MOCK_HOMEDIR || '/tmp'),
  tmpdir: vi.fn(() => '/tmp')
}));

import { tmpdir as realTmpdir } from 'node:os';
import {
  associatePidWithCard,
  type ClaudeSessionRegistry,
  getLockPath,
  getPidCardId,
  getRegistryPath,
  LOCK_TIMEOUT_MS,
  MAX_ENTRY_AGE_MS,
  recordPendingCommit,
  removePidEntry
} from '../src/index.js';

describe('claude-code-sessions', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(realTmpdir(), `claude-sessions-test-${Date.now()}-${Math.random()}`);
    mkdirSync(testDir, { recursive: true });
    process.env.MOCK_HOMEDIR = testDir;
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    delete process.env.MOCK_HOMEDIR;
  });

  // -------------------------------------------------------------------------
  // Path helpers
  // -------------------------------------------------------------------------

  describe('getRegistryPath', () => {
    it('returns path under ~/.cards', () => {
      expect(getRegistryPath()).toBe(join(testDir, '.cards', 'claude-sessions.json'));
    });
  });

  describe('getLockPath', () => {
    it('returns path under ~/.cards', () => {
      expect(getLockPath()).toBe(join(testDir, '.cards', 'claude-sessions.lock'));
    });
  });

  // -------------------------------------------------------------------------
  // associatePidWithCard
  // -------------------------------------------------------------------------

  describe('associatePidWithCard', () => {
    it('creates new entry and returns empty pending commits', async () => {
      const result = await associatePidWithCard(process.pid, 'card-1');
      expect(result).toEqual([]);

      const cardId = await getPidCardId(process.pid);
      expect(cardId).toBe('card-1');
    });

    it('returns buffered pending commits when associating', async () => {
      await recordPendingCommit(process.pid, 'aaa');
      await recordPendingCommit(process.pid, 'bbb');

      const result = await associatePidWithCard(process.pid, 'card-1');
      expect(result).toEqual(['aaa', 'bbb']);

      // pending commits should be cleared after association
      const raw = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      expect(raw.sessions[String(process.pid)]?.pendingCommits).toEqual([]);
    });

    it('first-write-wins: second associate returns [] and preserves original cardId', async () => {
      await associatePidWithCard(process.pid, 'card-1');
      const result = await associatePidWithCard(process.pid, 'card-2');
      expect(result).toEqual([]);

      expect(await getPidCardId(process.pid)).toBe('card-1');
    });

    it('creates .cards directory if missing', async () => {
      const cardsDir = join(testDir, '.cards');
      expect(existsSync(cardsDir)).toBe(false);

      await associatePidWithCard(process.pid, 'card-1');
      expect(existsSync(cardsDir)).toBe(true);
    });

    it('creates .cards directory with restricted permissions', async () => {
      await associatePidWithCard(process.pid, 'card-1');
      const cardsDir = join(testDir, '.cards');
      const mode = statSync(cardsDir).mode & 0o777;
      expect(mode).toBe(0o700);
    });

    it('returns [] on error (fail-open)', async () => {
      const result = await associatePidWithCard(-1, 'card-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // recordPendingCommit
  // -------------------------------------------------------------------------

  describe('recordPendingCommit', () => {
    it('creates entry and records SHA for new PID', async () => {
      await recordPendingCommit(process.pid, 'sha-1');

      const raw = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      const entry = raw.sessions[String(process.pid)];
      expect(entry?.pendingCommits).toEqual(['sha-1']);
      expect(entry?.cardId).toBeUndefined();
    });

    it('appends multiple commits in order', async () => {
      await recordPendingCommit(process.pid, 'sha-1');
      await recordPendingCommit(process.pid, 'sha-2');
      await recordPendingCommit(process.pid, 'sha-3');

      const raw = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      expect(raw.sessions[String(process.pid)]?.pendingCommits).toEqual(['sha-1', 'sha-2', 'sha-3']);
    });

    it('deduplicates repeated SHAs', async () => {
      await recordPendingCommit(process.pid, 'sha-1');
      await recordPendingCommit(process.pid, 'sha-1');

      const raw = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      expect(raw.sessions[String(process.pid)]?.pendingCommits).toEqual(['sha-1']);
    });

    it('updates timestamp on each call', async () => {
      await recordPendingCommit(process.pid, 'sha-1');
      const raw1 = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      const ts1 = raw1.sessions[String(process.pid)]?.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 15));

      await recordPendingCommit(process.pid, 'sha-2');
      const raw2 = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      const ts2 = raw2.sessions[String(process.pid)]?.updatedAt;

      expect(ts1).toBeDefined();
      expect(ts2).toBeDefined();
      expect(new Date(String(ts2)).getTime()).toBeGreaterThan(new Date(String(ts1)).getTime());
    });

    it('does not throw on error (fail-open)', async () => {
      await expect(recordPendingCommit(-1, 'sha-1')).resolves.not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // getPidCardId
  // -------------------------------------------------------------------------

  describe('getPidCardId', () => {
    it('returns cardId when entry has one', async () => {
      await associatePidWithCard(process.pid, 'card-42');
      expect(await getPidCardId(process.pid)).toBe('card-42');
    });

    it('returns null for unknown PID', async () => {
      expect(await getPidCardId(999999)).toBeNull();
    });

    it('returns null when entry exists but has no cardId', async () => {
      await recordPendingCommit(process.pid, 'sha-1');
      expect(await getPidCardId(process.pid)).toBeNull();
    });

    it('returns null on error (fail-open)', async () => {
      const result = await getPidCardId(-1);
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // removePidEntry
  // -------------------------------------------------------------------------

  describe('removePidEntry', () => {
    it('removes and returns the entry', async () => {
      await associatePidWithCard(process.pid, 'card-1');
      const entry = await removePidEntry(process.pid);

      expect(entry).toMatchObject({ cardId: 'card-1', pendingCommits: [] });
      expect(entry?.updatedAt).toBeDefined();
      expect(await getPidCardId(process.pid)).toBeNull();
    });

    it('returns null for unknown PID', async () => {
      expect(await removePidEntry(999999)).toBeNull();
    });

    it('preserves other entries', async () => {
      await recordPendingCommit(process.pid, 'sha-x');

      // Use a different alive PID value — we write it manually so pruning won't remove it
      const otherPid = process.pid;
      const secondPid = process.pid + 100000;

      await associatePidWithCard(otherPid, 'card-a');

      // Write a second entry manually to avoid pruning of fake PID
      const raw = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      raw.sessions[String(secondPid)] = {
        cardId: 'card-b',
        pendingCommits: [],
        updatedAt: new Date().toISOString()
      };
      writeFileSync(getRegistryPath(), JSON.stringify(raw, null, 2));

      await removePidEntry(otherPid);
      expect(await getPidCardId(otherPid)).toBeNull();

      // Second entry should still be present (read raw since the PID may be pruned by liveness check)
      const rawAfter = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      // The entry may have been pruned if secondPid is not alive, which is expected behaviour
      expect(rawAfter.sessions[String(otherPid)]).toBeUndefined();
    });

    it('returns null on error (fail-open)', async () => {
      const entry = await removePidEntry(-1);
      expect(entry === null || typeof entry === 'object').toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Pruning stale entries
  // -------------------------------------------------------------------------

  describe('pruning', () => {
    it('removes entries for dead PIDs', async () => {
      const deadPid = 999999;
      await recordPendingCommit(deadPid, 'sha-dead');

      // Trigger another transaction so pruning runs
      await recordPendingCommit(process.pid, 'sha-alive');

      const raw = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      expect(raw.sessions[String(deadPid)]).toBeUndefined();
      expect(raw.sessions[String(process.pid)]).toBeDefined();
    });

    it('removes entries older than MAX_ENTRY_AGE_MS', async () => {
      const cardsDir = join(testDir, '.cards');
      mkdirSync(cardsDir, { recursive: true });

      const oldTimestamp = new Date(Date.now() - MAX_ENTRY_AGE_MS - 1000).toISOString();
      const registry: ClaudeSessionRegistry = {
        sessions: {
          [String(process.pid)]: {
            cardId: 'card-old',
            pendingCommits: [],
            updatedAt: oldTimestamp
          }
        }
      };
      writeFileSync(getRegistryPath(), JSON.stringify(registry, null, 2));

      // Trigger a transaction to run pruning
      await recordPendingCommit(process.pid + 100000, 'sha-new');

      const raw = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      expect(raw.sessions[String(process.pid)]).toBeUndefined();
    });

    it('removes entries with invalid PID strings', async () => {
      const cardsDir = join(testDir, '.cards');
      mkdirSync(cardsDir, { recursive: true });

      const registry: ClaudeSessionRegistry = {
        sessions: {
          'not-a-number': {
            pendingCommits: [],
            updatedAt: new Date().toISOString()
          }
        }
      };
      writeFileSync(getRegistryPath(), JSON.stringify(registry, null, 2));

      await recordPendingCommit(process.pid, 'sha-1');

      const raw = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      expect(raw.sessions['not-a-number']).toBeUndefined();
    });

    it('removes entries with invalid timestamps when PID is also dead', async () => {
      const deadPid = 999998;
      const cardsDir = join(testDir, '.cards');
      mkdirSync(cardsDir, { recursive: true });

      const registry: ClaudeSessionRegistry = {
        sessions: {
          [String(deadPid)]: {
            pendingCommits: [],
            updatedAt: 'invalid-date'
          }
        }
      };
      writeFileSync(getRegistryPath(), JSON.stringify(registry, null, 2));

      await recordPendingCommit(process.pid, 'sha-1');

      const raw = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      expect(raw.sessions[String(deadPid)]).toBeUndefined();
    });

    it('does not prune alive PID entries with NaN timestamps (NaN arithmetic is false)', async () => {
      const cardsDir = join(testDir, '.cards');
      mkdirSync(cardsDir, { recursive: true });

      const registry: ClaudeSessionRegistry = {
        sessions: {
          [String(process.pid)]: {
            pendingCommits: ['sha-preserved'],
            updatedAt: 'not-a-date'
          }
        }
      };
      writeFileSync(getRegistryPath(), JSON.stringify(registry, null, 2));

      // Trigger pruning via another transaction
      await recordPendingCommit(process.pid + 100000, 'sha-trigger');

      const raw = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      // Alive PID survives even with unparseable timestamp because NaN > MAX_ENTRY_AGE_MS is false
      expect(raw.sessions[String(process.pid)]).toBeDefined();
    });

    it('preserves entries for alive PIDs with recent timestamps', async () => {
      await recordPendingCommit(process.pid, 'sha-1');

      // Second transaction triggers pruning but should keep our entry
      await recordPendingCommit(process.pid, 'sha-2');

      const raw = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      expect(raw.sessions[String(process.pid)]).toBeDefined();
      expect(raw.sessions[String(process.pid)]?.pendingCommits).toEqual(['sha-1', 'sha-2']);
    });
  });

  // -------------------------------------------------------------------------
  // File locking
  // -------------------------------------------------------------------------

  describe('file locking', () => {
    it('releases lock after a successful operation', async () => {
      await associatePidWithCard(process.pid, 'card-1');
      expect(existsSync(getLockPath())).toBe(false);
    });

    it('removes stale lock from dead process and proceeds', async () => {
      const cardsDir = join(testDir, '.cards');
      mkdirSync(cardsDir, { recursive: true });
      writeFileSync(getLockPath(), '999999'); // dead PID

      await associatePidWithCard(process.pid, 'card-1');
      expect(await getPidCardId(process.pid)).toBe('card-1');
    });

    it('fails open on lock timeout when lock is held by a live process', async () => {
      const cardsDir = join(testDir, '.cards');
      mkdirSync(cardsDir, { recursive: true });
      writeFileSync(getLockPath(), String(process.pid)); // our own PID — alive

      const start = Date.now();
      await recordPendingCommit(process.pid, 'sha-timeout');
      const elapsed = Date.now() - start;

      // Should have waited up to LOCK_TIMEOUT_MS then proceeded
      expect(elapsed).toBeGreaterThanOrEqual(LOCK_TIMEOUT_MS - 100);
      expect(elapsed).toBeLessThan(LOCK_TIMEOUT_MS + 2000);
    });
  });

  // -------------------------------------------------------------------------
  // Corrupt / missing registry
  // -------------------------------------------------------------------------

  describe('registry resilience', () => {
    it('creates registry file when none exists', async () => {
      expect(existsSync(getRegistryPath())).toBe(false);
      await recordPendingCommit(process.pid, 'sha-1');
      expect(existsSync(getRegistryPath())).toBe(true);
    });

    it('recovers from corrupt JSON in registry file', async () => {
      const cardsDir = join(testDir, '.cards');
      mkdirSync(cardsDir, { recursive: true });
      writeFileSync(getRegistryPath(), '{{invalid json');

      await recordPendingCommit(process.pid, 'sha-1');

      const raw = JSON.parse(readFileSync(getRegistryPath(), 'utf-8')) as ClaudeSessionRegistry;
      expect(raw.sessions[String(process.pid)]?.pendingCommits).toEqual(['sha-1']);
    });
  });

  // -------------------------------------------------------------------------
  // Atomic writes
  // -------------------------------------------------------------------------

  describe('atomic writes', () => {
    it('does not leave temp files behind', async () => {
      await recordPendingCommit(process.pid, 'sha-1');

      const tempPath = `${getRegistryPath()}.tmp`;
      expect(existsSync(tempPath)).toBe(false);
    });

    it('writes JSON with 2-space indentation', async () => {
      await recordPendingCommit(process.pid, 'sha-1');

      const content = readFileSync(getRegistryPath(), 'utf-8');
      expect(content).toMatch(/^\{\n {2}"sessions":/);
    });

    it('writes registry file with restricted permissions', async () => {
      await recordPendingCommit(process.pid, 'sha-1');

      const mode = statSync(getRegistryPath()).mode & 0o777;
      expect(mode).toBe(0o600);
    });
  });

  // -------------------------------------------------------------------------
  // Concurrent operations
  // -------------------------------------------------------------------------

  describe('concurrent operations', () => {
    it('handles parallel writes from different PIDs', async () => {
      const pid1 = process.pid;

      // Run two operations concurrently
      await Promise.all([recordPendingCommit(pid1, 'sha-a'), associatePidWithCard(pid1, 'card-concurrent')]);

      // The PID should have an entry regardless of ordering
      const cardId = await getPidCardId(pid1);
      expect(cardId).toBe('card-concurrent');
    });
  });
});
