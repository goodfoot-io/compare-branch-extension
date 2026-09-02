/**
 * Crash recovery and ownership checks for the transcript finalization lock.
 *
 * @summary Finalization lock stale/live/unknown/token ownership tests
 * @module
 */

import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readProcessStartTime } from '../../../src/bin/process-utils.js';
import { acquireFinalizationLock } from '../../../src/transcript-sync/engine/finalization-lock.js';

const roots: string[] = [];

async function makeLockPath(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'finalization-lock-'));
  roots.push(root);
  return join(root, 'session.finalize.lock');
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('transcript finalization lock', () => {
  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it('recovers a crash-stale owner only after positive process-death evidence', async () => {
    const lockPath = await makeLockPath();
    await writeFile(
      lockPath,
      JSON.stringify({ v: 1, pid: 2_147_483_646, startTime: 'definitely-dead', token: 'crashed-owner' })
    );

    const release = await acquireFinalizationLock(lockPath);
    expect(release).not.toBeNull();
    expect(JSON.parse(await readFile(lockPath, 'utf8'))).not.toMatchObject({ token: 'crashed-owner' });
    await release?.();
    expect(await exists(lockPath)).toBe(false);
  });

  it('refuses to reclaim a lock whose PID/start-time owner is alive', async () => {
    const lockPath = await makeLockPath();
    const liveOwner = {
      v: 1,
      pid: process.pid,
      startTime: readProcessStartTime(process.pid),
      token: 'live-owner'
    };
    await writeFile(lockPath, JSON.stringify(liveOwner));

    expect(await acquireFinalizationLock(lockPath)).toBeNull();
    expect(JSON.parse(await readFile(lockPath, 'utf8'))).toEqual(liveOwner);
  });

  it('fails closed on a malformed or unknown owner instead of deleting it', async () => {
    const lockPath = await makeLockPath();
    await writeFile(lockPath, '{"pid":"unknown"}');

    expect(await acquireFinalizationLock(lockPath)).toBeNull();
    expect(await readFile(lockPath, 'utf8')).toBe('{"pid":"unknown"}');
  });

  it('releases only while the published owner token still matches', async () => {
    const lockPath = await makeLockPath();
    const release = await acquireFinalizationLock(lockPath);
    expect(release).not.toBeNull();
    const replacement = {
      v: 1,
      pid: process.pid,
      startTime: readProcessStartTime(process.pid),
      token: 'replacement-owner'
    };
    await writeFile(lockPath, JSON.stringify(replacement));

    await release?.();
    expect(JSON.parse(await readFile(lockPath, 'utf8'))).toEqual(replacement);
  });
});
