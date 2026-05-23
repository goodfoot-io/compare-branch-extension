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

  it('acquires a fresh lock and records the agent PID and cardId', async () => {
    expect(await acquireLock(lockPath, 4242, 'main-1', noopLogger)).toBe(true);
    const lines = (await readFile(lockPath, 'utf-8')).split('\n');
    expect(lines[0]!.trim()).toBe('4242');
    expect(lines[1]!.trim()).toBe('main-1');
  });

  it('refuses when a live owner holds the lock', async () => {
    const child = spawn('sleep', ['30'], { stdio: 'ignore' });
    const livePid = child.pid!;
    try {
      await mkdir(join(dir, 'adhoc-sessions'), { recursive: true });
      await writeFile(lockPath, `${livePid}\nmain-1`);
      expect(await acquireLock(lockPath, 4242, 'main-1', noopLogger)).toBe(false);
      // Owner PID unchanged.
      expect((await readFile(lockPath, 'utf-8')).split('\n')[0]!.trim()).toBe(String(livePid));
    } finally {
      child.kill('SIGKILL');
    }
  });

  it('refuses and warns when the same live session enters a different card worktree', async () => {
    const child = spawn('sleep', ['30'], { stdio: 'ignore' });
    const livePid = child.pid!;
    const warnings: { msg: string; data?: Record<string, unknown> }[] = [];
    const logger = { warn: (msg: string, data?: Record<string, unknown>) => warnings.push({ msg, data }) };
    try {
      await mkdir(join(dir, 'adhoc-sessions'), { recursive: true });
      // Session already bound to main-1.
      await writeFile(lockPath, `${livePid}\nmain-1`);
      // Same session now enters main-2's worktree.
      expect(await acquireLock(lockPath, livePid, 'main-2', logger)).toBe(false);
      // Original binding preserved.
      expect((await readFile(lockPath, 'utf-8')).split('\n')[1]!.trim()).toBe('main-1');
      expect(
        warnings.some((w) => w.data?.['boundCardId'] === 'main-1' && w.data?.['attemptedCardId'] === 'main-2')
      ).toBe(true);
    } finally {
      child.kill('SIGKILL');
    }
  });

  it('no-ops silently when the same live session re-enters the same worktree', async () => {
    const child = spawn('sleep', ['30'], { stdio: 'ignore' });
    const livePid = child.pid!;
    const warnings: string[] = [];
    const logger = { warn: (msg: string) => warnings.push(msg) };
    try {
      await mkdir(join(dir, 'adhoc-sessions'), { recursive: true });
      await writeFile(lockPath, `${livePid}\nmain-1`);
      expect(await acquireLock(lockPath, livePid, 'main-1', logger)).toBe(false);
      // Re-entering the same worktree is a clean no-op — no different-card warning.
      expect(warnings.length).toBe(0);
    } finally {
      child.kill('SIGKILL');
    }
  });

  it('recovers a stale lock whose owner PID is dead', async () => {
    await mkdir(join(dir, 'adhoc-sessions'), { recursive: true });
    await writeFile(lockPath, '2147483646\nmain-1');
    expect(await acquireLock(lockPath, 4242, 'main-2', noopLogger)).toBe(true);
    const lines = (await readFile(lockPath, 'utf-8')).split('\n');
    expect(lines[0]!.trim()).toBe('4242');
    expect(lines[1]!.trim()).toBe('main-2');
  });

  it('leaves no lock unacquired path observable when fresh dir is missing', async () => {
    // Lock dir does not yet exist; acquireLock must create it.
    await expect(access(join(dir, 'adhoc-sessions'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await acquireLock(lockPath, 99, 'main-1', noopLogger)).toBe(true);
  });
});
