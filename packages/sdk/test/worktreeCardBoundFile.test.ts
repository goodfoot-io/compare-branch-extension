/**
 * Unit tests for the writeCardBoundFile and clearCardBoundFile helpers.
 *
 * These helpers only require a real filesystem — no git operations needed.
 * Each test gets its own temp directory, cleaned up in afterEach.
 *
 * @summary writeCardBoundFile / clearCardBoundFile unit tests
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearCardBoundFile, writeCardBoundFile } from '../src/worktree.js';

describe('writeCardBoundFile', () => {
  let tmpDir = '';

  beforeEach(async () => {
    tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'wcbf-test-')));
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      tmpDir = '';
    }
  });

  it('writes <worktreeDir>/.cards/CARD_ID with a trailing newline', async () => {
    await writeCardBoundFile(tmpDir, 'main-42');

    const content = await fs.readFile(path.join(tmpDir, '.cards', 'CARD_ID'), 'utf8');
    expect(content).toBe('main-42\n');
  });

  it('mkdir-p creates the .cards directory when it does not yet exist', async () => {
    // tmpDir exists but .cards does not
    await expect(fs.access(path.join(tmpDir, '.cards'))).rejects.toMatchObject({ code: 'ENOENT' });

    await writeCardBoundFile(tmpDir, 'main-99');

    await expect(fs.access(path.join(tmpDir, '.cards'))).resolves.toBeUndefined();
  });

  it('overwrites an existing CARD_ID file without error', async () => {
    await writeCardBoundFile(tmpDir, 'main-1');
    await writeCardBoundFile(tmpDir, 'main-2');

    const content = await fs.readFile(path.join(tmpDir, '.cards', 'CARD_ID'), 'utf8');
    expect(content).toBe('main-2\n');
  });
});

describe('clearCardBoundFile', () => {
  let tmpDir = '';

  beforeEach(async () => {
    tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'ccbf-test-')));
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      tmpDir = '';
    }
  });

  it('removes <worktreeDir>/.cards/CARD_ID when it exists', async () => {
    await writeCardBoundFile(tmpDir, 'main-55');
    const cardIdPath = path.join(tmpDir, '.cards', 'CARD_ID');
    await expect(fs.access(cardIdPath)).resolves.toBeUndefined();

    await clearCardBoundFile(tmpDir);

    await expect(fs.access(cardIdPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('is a no-op (ENOENT-tolerant) when CARD_ID does not exist', async () => {
    // No .cards directory at all
    await expect(clearCardBoundFile(tmpDir)).resolves.toBeUndefined();
  });

  it('is a no-op when .cards exists but CARD_ID is already absent', async () => {
    await fs.mkdir(path.join(tmpDir, '.cards'));

    await expect(clearCardBoundFile(tmpDir)).resolves.toBeUndefined();
  });
});
