/**
 * Crash-recoverable cross-process ownership lock for transcript finalization.
 *
 * @summary PID/start-time/token lock with serialized stale-owner recovery
 * @module
 */

import { randomUUID } from 'node:crypto';
import { link, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { isProcessAliveWithStartTime, readProcessStartTime } from '../../bin/process-utils.js';

const LOCK_VERSION = 1;
const RETRY_DELAY_MS = 25;
const DEFAULT_ACQUIRE_TIMEOUT_MS = 1_000;
const CURRENT_PROCESS_START_TIME = readProcessStartTime(process.pid);

interface LockOwner {
  v: typeof LOCK_VERSION;
  pid: number;
  startTime: string | null;
  token: string;
}

type OwnerRead = { kind: 'owner'; owner: LockOwner } | { kind: 'absent' } | { kind: 'unknown' };

interface RecoveryClaim {
  name: string;
  path: string;
  owner: LockOwner | null;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function newOwner(): LockOwner {
  return { v: LOCK_VERSION, pid: process.pid, startTime: CURRENT_PROCESS_START_TIME, token: randomUUID() };
}

async function readOwner(path: string): Promise<OwnerRead> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { kind: 'absent' };
    return { kind: 'unknown' };
  }

  try {
    const value = JSON.parse(raw) as Partial<LockOwner>;
    if (
      value.v !== LOCK_VERSION ||
      !Number.isSafeInteger(value.pid) ||
      (value.pid ?? 0) <= 0 ||
      (value.startTime !== null && typeof value.startTime !== 'string') ||
      typeof value.token !== 'string' ||
      value.token.length === 0
    ) {
      return { kind: 'unknown' };
    }
    return { kind: 'owner', owner: value as LockOwner };
  } catch {
    return { kind: 'unknown' };
  }
}

async function publishOwnerFile(path: string, owner: LockOwner): Promise<boolean> {
  const candidate = `${path}.candidate-${owner.pid}-${owner.token}`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(candidate, JSON.stringify(owner), { flag: 'wx' });
  try {
    await link(candidate, path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  } finally {
    await rm(candidate, { force: true });
  }
}

async function releaseOwnedFile(path: string, token: string): Promise<void> {
  const current = await readOwner(path);
  if (current.kind === 'owner' && current.owner.token === token) {
    await rm(path, { force: true });
  }
}

function ownerIsAlive(owner: LockOwner): boolean {
  return isProcessAliveWithStartTime(owner.pid, owner.startTime);
}

async function recoveryClaims(lockPath: string): Promise<RecoveryClaim[]> {
  const parent = dirname(lockPath);
  const prefix = `${basename(lockPath)}.recovery-`;
  let names: string[];
  try {
    names = await readdir(parent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const claims: RecoveryClaim[] = [];
  for (const name of names.filter((entry) => entry.startsWith(prefix)).sort()) {
    const path = join(parent, name);
    const read = await readOwner(path);
    if (read.kind === 'absent') continue;
    if (read.kind === 'unknown') {
      claims.push({ name, path, owner: null });
      continue;
    }
    if (ownerIsAlive(read.owner)) {
      claims.push({ name, path, owner: read.owner });
    } else {
      await releaseOwnedFile(path, read.owner.token);
    }
  }
  return claims;
}

async function recoverAbandonedLock(lockPath: string, claimant: LockOwner): Promise<boolean> {
  const claimName = `${basename(lockPath)}.recovery-${claimant.pid}-${claimant.token}`;
  const claimPath = join(dirname(lockPath), claimName);
  if (!(await publishOwnerFile(claimPath, claimant))) return false;

  try {
    const claims = await recoveryClaims(lockPath);
    if (claims.some((claim) => claim.owner === null)) return false;
    if (claims[0]?.name !== claimName) return false;

    const first = await readOwner(lockPath);
    if (first.kind === 'absent') return true;
    if (first.kind === 'unknown' || ownerIsAlive(first.owner)) return false;

    // Re-read immediately before removal. A token change means ownership
    // changed while recovery was being elected; never remove that owner.
    const confirmed = await readOwner(lockPath);
    if (confirmed.kind !== 'owner' || confirmed.owner.token !== first.owner.token) return false;
    await rm(lockPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true;
    throw error;
  } finally {
    await releaseOwnedFile(claimPath, claimant.token);
  }
}

/**
 * Acquires the finalization lock or returns null after the bounded wait.
 *
 * Published lock and recovery-claim files are complete owner records: a hard
 * link makes each record visible atomically, eliminating the mkdir/write
 * initialization gap. Stale locks are removed only after PID/start-time
 * death evidence and serialized recovery-claim election.
 *
 * @param lockPath - Absolute lock-file path.
 * @param timeoutMs - Bounded ownership/recovery wait.
 * @returns A token-checking release callback, or null when ownership remains live or unknown.
 */
export async function acquireFinalizationLock(
  lockPath: string,
  timeoutMs = DEFAULT_ACQUIRE_TIMEOUT_MS
): Promise<(() => Promise<void>) | null> {
  const owner = newOwner();
  const deadline = Date.now() + timeoutMs;
  do {
    if ((await recoveryClaims(lockPath)).length === 0) {
      if (await publishOwnerFile(lockPath, owner)) {
        return () => releaseOwnedFile(lockPath, owner.token);
      }
      await recoverAbandonedLock(lockPath, owner);
    }
    await delay(RETRY_DELAY_MS);
  } while (Date.now() < deadline);
  return null;
}
