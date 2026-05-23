/**
 * Tests for the CwdChanged hook helpers.
 *
 * Real filesystem only — no mocks. Covers the upward walk for `.cards/CARD_ID`,
 * discovery-based cardRepoPath resolution, and the O_EXCL de-dupe lock with
 * stale-lock recovery.
 *
 * @summary CwdChanged hook helper tests
 */

import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { acquireLock, resolveCardRepoPath, resolveWorktreeCardId } from '../src/cwd-changed.js';

const noopLogger = { warn: () => {} };

describe('resolveWorktreeCardId', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cwd-walk-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('finds CARD_ID in the worktree root', async () => {
    await mkdir(join(root, '.cards'), { recursive: true });
    await writeFile(join(root, '.cards', 'CARD_ID'), 'main-96\n');
    expect(await resolveWorktreeCardId(root)).toBe('main-96');
  });

  it('walks up from a nested subdirectory', async () => {
    await mkdir(join(root, '.cards'), { recursive: true });
    await writeFile(join(root, '.cards', 'CARD_ID'), 'main-96');
    const nested = join(root, 'a', 'b', 'c');
    await mkdir(nested, { recursive: true });
    expect(await resolveWorktreeCardId(nested)).toBe('main-96');
  });

  it('returns null when no CARD_ID exists in any ancestor', async () => {
    const nested = join(root, 'x', 'y');
    await mkdir(nested, { recursive: true });
    expect(await resolveWorktreeCardId(nested)).toBeNull();
  });
});

describe('resolveCardRepoPath', () => {
  let home: string;
  let originalDiscovery: string | undefined;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), 'cwd-disc-'));
    originalDiscovery = process.env['CARDS_DISCOVERY_PATH'];
    process.env['CARDS_DISCOVERY_PATH'] = join(home, 'cards-api.json');
  });

  afterEach(async () => {
    if (originalDiscovery === undefined) {
      delete process.env['CARDS_DISCOVERY_PATH'];
    } else {
      process.env['CARDS_DISCOVERY_PATH'] = originalDiscovery;
    }
    await rm(home, { recursive: true, force: true });
  });

  it('joins reposPath with the cardId', async () => {
    await writeFile(join(home, 'cards-api.json'), JSON.stringify({ reposPath: '/srv/cards-repos' }));
    expect(await resolveCardRepoPath('main-96', noopLogger)).toBe('/srv/cards-repos/main-96');
  });

  it('returns null when the discovery file is absent', async () => {
    expect(await resolveCardRepoPath('main-96', noopLogger)).toBeNull();
  });

  it('returns null when reposPath is missing', async () => {
    await writeFile(join(home, 'cards-api.json'), JSON.stringify({ host: 'localhost', port: 1 }));
    expect(await resolveCardRepoPath('main-96', noopLogger)).toBeNull();
  });
});

describe('acquireLock', () => {
  let dir: string;
  let lockPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cwd-lock-'));
    lockPath = join(dir, 'adhoc-sessions', 'session-1.lock');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('acquires a fresh lock and records the agent PID', async () => {
    expect(await acquireLock(lockPath, 4242, noopLogger)).toBe(true);
    expect((await readFile(lockPath, 'utf-8')).trim()).toBe('4242');
  });

  it('refuses when a live owner holds the lock', async () => {
    const child = spawn('sleep', ['30'], { stdio: 'ignore' });
    const livePid = child.pid!;
    try {
      await mkdir(join(dir, 'adhoc-sessions'), { recursive: true });
      await writeFile(lockPath, String(livePid));
      expect(await acquireLock(lockPath, 4242, noopLogger)).toBe(false);
      // Owner PID unchanged.
      expect((await readFile(lockPath, 'utf-8')).trim()).toBe(String(livePid));
    } finally {
      child.kill('SIGKILL');
    }
  });

  it('recovers a stale lock whose owner PID is dead', async () => {
    await mkdir(join(dir, 'adhoc-sessions'), { recursive: true });
    await writeFile(lockPath, '2147483646');
    expect(await acquireLock(lockPath, 4242, noopLogger)).toBe(true);
    expect((await readFile(lockPath, 'utf-8')).trim()).toBe('4242');
  });

  it('leaves no lock unacquired path observable when fresh dir is missing', async () => {
    // Lock dir does not yet exist; acquireLock must create it.
    await expect(access(join(dir, 'adhoc-sessions'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await acquireLock(lockPath, 99, noopLogger)).toBe(true);
  });
});
