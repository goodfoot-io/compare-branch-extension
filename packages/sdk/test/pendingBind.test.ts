/**
 * Unit tests for the pendingBind owner module.
 *
 * All tests use a real temporary directory — no mocks. Each test gets its own
 * isolated tmpdir created in beforeEach and cleaned up in afterEach.
 *
 * @summary readPendingBind / writePendingBind / clearPendingBind unit tests
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearPendingBind, readPendingBind, writePendingBind } from '../src/pendingBind.js';

describe('pendingBind', () => {
  let tmpDir = '';

  beforeEach(async () => {
    tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'pending-bind-test-')));
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
      tmpDir = '';
    }
  });

  // ---------------------------------------------------------------------------
  // readPendingBind
  // ---------------------------------------------------------------------------

  describe('readPendingBind', () => {
    it('returns null when the marker file does not exist (ENOENT)', async () => {
      const result = await readPendingBind(tmpDir);
      expect(result).toBeNull();
    });

    it('returns null when the file contains malformed JSON', async () => {
      await fs.mkdir(path.join(tmpDir, '.cards'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, '.cards', 'PENDING_BIND'), 'not-valid-json', 'utf8');

      const result = await readPendingBind(tmpDir);
      expect(result).toBeNull();
    });

    it('returns null when version is missing', async () => {
      await fs.mkdir(path.join(tmpDir, '.cards'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, '.cards', 'PENDING_BIND'), JSON.stringify({ parentBranch: 'main' }), 'utf8');

      const result = await readPendingBind(tmpDir);
      expect(result).toBeNull();
    });

    it('returns null when version is not 1', async () => {
      await fs.mkdir(path.join(tmpDir, '.cards'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, '.cards', 'PENDING_BIND'),
        JSON.stringify({ version: 2, parentBranch: 'main' }),
        'utf8'
      );

      const result = await readPendingBind(tmpDir);
      expect(result).toBeNull();
    });

    it('returns null when parentBranch is missing', async () => {
      await fs.mkdir(path.join(tmpDir, '.cards'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, '.cards', 'PENDING_BIND'), JSON.stringify({ version: 1 }), 'utf8');

      const result = await readPendingBind(tmpDir);
      expect(result).toBeNull();
    });

    it('returns null when parentBranch is an empty string', async () => {
      await fs.mkdir(path.join(tmpDir, '.cards'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, '.cards', 'PENDING_BIND'),
        JSON.stringify({ version: 1, parentBranch: '' }),
        'utf8'
      );

      const result = await readPendingBind(tmpDir);
      expect(result).toBeNull();
    });

    it('round-trips a minimal marker (version + parentBranch only)', async () => {
      const marker = { version: 1 as const, parentBranch: 'main' };
      await writePendingBind(tmpDir, marker);

      const result = await readPendingBind(tmpDir);
      expect(result).toEqual(marker);
    });

    it('round-trips a full marker with all optional fields', async () => {
      const marker = {
        version: 1 as const,
        parentBranch: 'feature/foo',
        transcriptPath: '/home/user/.claude/projects/proj/transcript.jsonl',
        sessionId: 'sess-abc-123'
      };
      await writePendingBind(tmpDir, marker);

      const result = await readPendingBind(tmpDir);
      expect(result).toEqual(marker);
    });
  });

  // ---------------------------------------------------------------------------
  // writePendingBind
  // ---------------------------------------------------------------------------

  describe('writePendingBind', () => {
    it('creates .cards/ when it does not exist', async () => {
      const marker = { version: 1 as const, parentBranch: 'main' };
      await writePendingBind(tmpDir, marker);

      const cardsDir = path.join(tmpDir, '.cards');
      await expect(fs.access(cardsDir)).resolves.toBeUndefined();
    });

    it('writes the marker to .cards/PENDING_BIND', async () => {
      const marker = { version: 1 as const, parentBranch: 'main' };
      await writePendingBind(tmpDir, marker);

      const markerFile = path.join(tmpDir, '.cards', 'PENDING_BIND');
      const raw = await fs.readFile(markerFile, 'utf8');
      expect(JSON.parse(raw)).toEqual(marker);
    });

    it('overwrites an existing marker', async () => {
      const first = { version: 1 as const, parentBranch: 'main' };
      const second = {
        version: 1 as const,
        parentBranch: 'main',
        transcriptPath: '/tmp/transcript.jsonl',
        sessionId: 'sess-xyz'
      };

      await writePendingBind(tmpDir, first);
      await writePendingBind(tmpDir, second);

      const result = await readPendingBind(tmpDir);
      expect(result).toEqual(second);
    });

    it('leaves no temp files behind after a successful write', async () => {
      const marker = { version: 1 as const, parentBranch: 'main' };
      await writePendingBind(tmpDir, marker);

      const cardsDir = path.join(tmpDir, '.cards');
      const files = await fs.readdir(cardsDir);
      const tmpFiles = files.filter((f) => f.endsWith('.tmp'));
      expect(tmpFiles).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // clearPendingBind
  // ---------------------------------------------------------------------------

  describe('clearPendingBind', () => {
    it('removes the marker file when it exists', async () => {
      const marker = { version: 1 as const, parentBranch: 'main' };
      await writePendingBind(tmpDir, marker);

      await clearPendingBind(tmpDir);

      const markerFile = path.join(tmpDir, '.cards', 'PENDING_BIND');
      await expect(fs.access(markerFile)).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('is ENOENT-tolerant when the marker does not exist', async () => {
      // No marker written — should not throw.
      await expect(clearPendingBind(tmpDir)).resolves.toBeUndefined();
    });

    it('is ENOENT-tolerant when called twice (idempotent)', async () => {
      const marker = { version: 1 as const, parentBranch: 'main' };
      await writePendingBind(tmpDir, marker);

      await clearPendingBind(tmpDir);
      await expect(clearPendingBind(tmpDir)).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // RMW interleave regression
  // ---------------------------------------------------------------------------

  describe('read-modify-write interleave', () => {
    it('write-then-clear leaves no marker: clear wins the final state', async () => {
      const marker = { version: 1 as const, parentBranch: 'main' };

      // Simulate EnterWorktree RMW adding transcriptPath, then card create clearing.
      await writePendingBind(tmpDir, marker);
      const read = await readPendingBind(tmpDir);
      expect(read).not.toBeNull();

      // EnterWorktree writes back with transcriptPath added.
      const updated = { ...read!, transcriptPath: '/tmp/transcript.jsonl', sessionId: 'sess-1' };
      await writePendingBind(tmpDir, updated);

      // card create clears immediately after.
      await clearPendingBind(tmpDir);

      // After clear, no marker should be observable — not partial, not torn.
      const afterClear = await readPendingBind(tmpDir);
      expect(afterClear).toBeNull();
    });

    it('clear-then-read returns null: no partial state visible', async () => {
      const marker = {
        version: 1 as const,
        parentBranch: 'main',
        transcriptPath: '/tmp/transcript.jsonl',
        sessionId: 'sess-2'
      };
      await writePendingBind(tmpDir, marker);

      // Clear first.
      await clearPendingBind(tmpDir);

      // Subsequent read must return null — no torn/partial file.
      const result = await readPendingBind(tmpDir);
      expect(result).toBeNull();
    });
  });
});
