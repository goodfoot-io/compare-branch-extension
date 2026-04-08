import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { flushMicrotasks } from '@cards/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Exercises claude sessions behavior in the lib area through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve expected state
 * transitions and output.
 *
 * @summary Tests claude sessions behavior in lib
 */

vi.mock('node:os', () => {
  return {
    tmpdir: vi.fn(() => '/tmp'),
    homedir: vi.fn(() => process.env['MOCK_HOMEDIR'] || '/tmp')
  };
});

import { tmpdir as realTmpdir } from 'node:os';
import {
  associatePidWithCard,
  getLockPath,
  getPidCardId,
  getRegistryPath,
  MAX_ENTRY_AGE_MS,
  recordPendingCommit,
  removePidEntry,
  type SessionRegistry
} from '@cards/sessions';

describe('claude-sessions', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(realTmpdir(), `sessions-test-${Date.now()}-${Math.random()}`);
    mkdirSync(testDir, { recursive: true });
    process.env['MOCK_HOMEDIR'] = testDir;
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    delete process.env['MOCK_HOMEDIR'];
  });

  describe('associatePidWithCard', () => {
    it('should associate a PID with a card ID when entry does not exist', async () => {
      const testPid = process.pid;
      const result = await associatePidWithCard(testPid, 'card-123');
      expect(result).toEqual([]);

      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-123');
    });

    it('should associate a PID with a card ID when entry exists without cardId', async () => {
      const testPid = process.pid;
      await recordPendingCommit(testPid, 'sha1');
      await recordPendingCommit(testPid, 'sha2');

      const result = await associatePidWithCard(testPid, 'card-123');
      expect(result).toEqual(['sha1', 'sha2']);

      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-123');

      const registryContent = readFileSync(getRegistryPath(), 'utf-8');
      const registry: SessionRegistry = JSON.parse(registryContent);
      expect(registry.sessions[String(testPid)]?.pendingCommits).toEqual([]);
    });

    it('should return empty array if entry already has a cardId (first-write-wins)', async () => {
      const testPid = process.pid;
      await associatePidWithCard(testPid, 'card-123');

      const result = await associatePidWithCard(testPid, 'card-456');
      expect(result).toEqual([]);

      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-123');
    });

    it('should create .cards directory with 0o700 permissions if it does not exist', async () => {
      const cardsDir = join(testDir, '.cards');
      expect(existsSync(cardsDir)).toBe(false);

      await associatePidWithCard(12345, 'card-123');

      expect(existsSync(cardsDir)).toBe(true);
    });

    it('should handle concurrent writes with file locking', async () => {
      const testPid1 = process.pid;
      const testPid2 = process.pid + 100000;

      const results = await Promise.all([
        associatePidWithCard(testPid1, 'card-123'),
        recordPendingCommit(testPid2, 'sha1').then(() => associatePidWithCard(testPid2, 'card-456'))
      ]);

      expect(results[0]).toEqual([]);

      const cardId1 = await getPidCardId(testPid1);
      expect(cardId1).toBe('card-123');
    });
  });

  describe('recordPendingCommit', () => {
    it('should record a pending commit for a PID', async () => {
      const testPid = process.pid;
      await recordPendingCommit(testPid, 'sha1');

      const registryContent = readFileSync(getRegistryPath(), 'utf-8');
      const registry: SessionRegistry = JSON.parse(registryContent);
      expect(registry.sessions[String(testPid)]?.pendingCommits).toEqual(['sha1']);
    });

    it('should append multiple commits and deduplicate', async () => {
      const testPid = process.pid;
      await recordPendingCommit(testPid, 'sha1');
      await recordPendingCommit(testPid, 'sha2');
      await recordPendingCommit(testPid, 'sha1');

      const registryContent = readFileSync(getRegistryPath(), 'utf-8');
      const registry: SessionRegistry = JSON.parse(registryContent);
      expect(registry.sessions[String(testPid)]?.pendingCommits).toEqual(['sha1', 'sha2']);
    });

    it('should update timestamp on each commit', async () => {
      const testPid = process.pid;
      await recordPendingCommit(testPid, 'sha1');

      const registryContent1 = readFileSync(getRegistryPath(), 'utf-8');
      const registry1: SessionRegistry = JSON.parse(registryContent1);
      const timestamp1 = registry1.sessions[String(testPid)]?.updatedAt;

      await flushMicrotasks();

      await recordPendingCommit(testPid, 'sha2');

      const registryContent2 = readFileSync(getRegistryPath(), 'utf-8');
      const registry2: SessionRegistry = JSON.parse(registryContent2);
      const timestamp2 = registry2.sessions[String(testPid)]?.updatedAt;

      expect(timestamp2).toBeDefined();
      expect(timestamp1).toBeDefined();
      expect(timestamp2).not.toBe(timestamp1);
      expect(new Date(String(timestamp2)).getTime()).toBeGreaterThan(new Date(String(timestamp1)).getTime());
    });

    it('should create entry if it does not exist', async () => {
      const testPid = process.pid;
      await recordPendingCommit(testPid, 'sha1');

      const registryContent = readFileSync(getRegistryPath(), 'utf-8');
      const registry: SessionRegistry = JSON.parse(registryContent);
      expect(registry.sessions[String(testPid)]).toBeDefined();
      expect(registry.sessions[String(testPid)]?.cardId).toBeUndefined();
      expect(registry.sessions[String(testPid)]?.pendingCommits).toEqual(['sha1']);
    });
  });

  describe('getPidCardId', () => {
    it('should return cardId if entry exists with cardId', async () => {
      const testPid = process.pid;
      await associatePidWithCard(testPid, 'card-123');

      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-123');
    });

    it('should return null if entry does not exist', async () => {
      const cardId = await getPidCardId(999999);
      expect(cardId).toBeNull();
    });

    it('should return null if entry exists but has no cardId', async () => {
      const testPid = process.pid;
      await recordPendingCommit(testPid, 'sha1');

      const cardId = await getPidCardId(testPid);
      expect(cardId).toBeNull();
    });
  });

  describe('removePidEntry', () => {
    it('should remove and return the entry for a PID', async () => {
      const testPid = process.pid;
      await associatePidWithCard(testPid, 'card-123');
      await recordPendingCommit(testPid, 'sha1');

      const entry = await removePidEntry(testPid);
      expect(entry).toMatchObject({
        cardId: 'card-123',
        pendingCommits: ['sha1']
      });
      expect(entry?.updatedAt).toBeDefined();

      const cardId = await getPidCardId(testPid);
      expect(cardId).toBeNull();
    });

    it('should return null if entry does not exist', async () => {
      const entry = await removePidEntry(999999);
      expect(entry).toBeNull();
    });

    it('should not affect other entries', async () => {
      const testPid = process.pid;
      await associatePidWithCard(testPid, 'card-123');

      await removePidEntry(testPid);

      const cardId1 = await getPidCardId(testPid);
      expect(cardId1).toBeNull();

      await associatePidWithCard(testPid, 'card-456');
      const cardId2 = await getPidCardId(testPid);
      expect(cardId2).toBe('card-456');
    });
  });

  describe('pruning stale entries', () => {
    it('should remove entries for dead PIDs during operations', async () => {
      const deadPid = 999999;
      await recordPendingCommit(deadPid, 'sha1');

      await recordPendingCommit(12345, 'sha2');

      const registryContent = readFileSync(getRegistryPath(), 'utf-8');
      const registry: SessionRegistry = JSON.parse(registryContent);
      expect(registry.sessions[String(deadPid)]).toBeUndefined();
      expect(registry.sessions['12345']).toBeDefined();
    });

    it('should remove entries older than 24 hours during operations', async () => {
      const cardsDir = join(testDir, '.cards');
      mkdirSync(cardsDir, { recursive: true });

      const oldTimestamp = new Date(Date.now() - MAX_ENTRY_AGE_MS - 1000).toISOString();
      const registry: SessionRegistry = {
        sessions: {
          '12345': {
            cardId: 'card-old',
            pendingCommits: [],
            updatedAt: oldTimestamp
          }
        }
      };
      writeFileSync(getRegistryPath(), JSON.stringify(registry, null, 2));

      await recordPendingCommit(67890, 'sha1');

      const registryContent = readFileSync(getRegistryPath(), 'utf-8');
      const newRegistry: SessionRegistry = JSON.parse(registryContent);
      expect(newRegistry.sessions['12345']).toBeUndefined();
      expect(newRegistry.sessions['67890']).toBeDefined();
    });

    it('should preserve entries for alive PIDs', async () => {
      const alivePid = process.pid;
      await recordPendingCommit(alivePid, 'sha1');

      await recordPendingCommit(12345, 'sha2');

      const registryContent = readFileSync(getRegistryPath(), 'utf-8');
      const registry: SessionRegistry = JSON.parse(registryContent);
      expect(registry.sessions[String(alivePid)]).toBeDefined();
      expect(registry.sessions['12345']).toBeDefined();
    });
  });

  describe('file locking', () => {
    it('should acquire and release lock during operations', async () => {
      await associatePidWithCard(12345, 'card-123');

      expect(existsSync(getLockPath())).toBe(false);
    });

    it('should detect and remove stale lock from dead process', async () => {
      const testPid = process.pid;
      const cardsDir = join(testDir, '.cards');
      mkdirSync(cardsDir, { recursive: true });
      writeFileSync(getLockPath(), '999999');

      await associatePidWithCard(testPid, 'card-123');

      const cardId = await getPidCardId(testPid);
      expect(cardId).toBe('card-123');
    });

    it('should throw on corrupt JSON in registry file (fail-closed)', async () => {
      expect(existsSync(getRegistryPath())).toBe(false);

      await recordPendingCommit(12345, 'sha1');
      expect(existsSync(getRegistryPath())).toBe(true);

      writeFileSync(getRegistryPath(), 'invalid json');

      await expect(recordPendingCommit(67890, 'sha2')).rejects.toThrow();
    });

    it('should throw on lock timeout (fail-closed)', async () => {
      const cardsDir = join(testDir, '.cards');
      mkdirSync(cardsDir, { recursive: true });
      writeFileSync(getLockPath(), String(process.pid));

      await expect(recordPendingCommit(12345, 'sha1')).rejects.toThrow('Lock acquisition timeout');
    });
  });

  describe('atomic writes', () => {
    it('should write registry atomically using temp file and rename', async () => {
      await recordPendingCommit(12345, 'sha1');

      expect(existsSync(getRegistryPath())).toBe(true);

      const tempPath = `${getRegistryPath()}.tmp`;
      expect(existsSync(tempPath)).toBe(false);
    });

    it('should format JSON with 2-space indentation', async () => {
      await recordPendingCommit(12345, 'sha1');

      const registryContent = readFileSync(getRegistryPath(), 'utf-8');

      expect(registryContent).toContain('\n');
      expect(registryContent).toMatch(/^\{\n {2}"sessions":/);
    });
  });

  describe('error handling (fail-closed)', () => {
    it('should throw on corrupt registry JSON', async () => {
      const cardsDir = join(testDir, '.cards');
      mkdirSync(cardsDir, { recursive: true });
      writeFileSync(getRegistryPath(), '{{invalid');

      await expect(associatePidWithCard(process.pid, 'card-123')).rejects.toThrow();
      await expect(getPidCardId(process.pid)).rejects.toThrow();
      await expect(removePidEntry(process.pid)).rejects.toThrow();
      await expect(recordPendingCommit(process.pid, 'sha1')).rejects.toThrow();
    });
  });
});
