/**
 * Tests for process-utils: comm-check (isKnownAgentComm) and the filesystem
 * fallback status transition (transitionCardStatus).
 *
 * Real implementations only — no mocks. The comm-check runs against the
 * current process (a real `node`/`claude` process) and a guaranteed-dead PID.
 * transitionCardStatus runs against a real git repository in a tmp dir.
 *
 * @summary process-utils comm-check + filesystem transition tests
 */

import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  isAdhocActivatableStatus,
  isKnownAgentComm,
  isProcessAliveWithStartTime,
  readCardStatus,
  readProcessStartTime,
  transitionCardStatus
} from '../src/bin/process-utils.js';

/**
 * Spawns a real long-lived process so the test can read its PID and kill it.
 *
 * The process must outlive the synchronous comm read, so callers pass a
 * long-running command.
 *
 * @param cmd - Executable to spawn.
 * @param args - Arguments for the executable.
 * @returns The spawned child process.
 */
function spawnLongLived(cmd: string, args: string[]): ChildProcess {
  const child = spawn(cmd, args, { stdio: 'ignore', detached: false });
  return child;
}

async function waitForComm(pid: number): Promise<void> {
  // Give the kernel a beat to expose /proc/<pid>/comm with the exec'd name.
  for (let i = 0; i < 50; i++) {
    try {
      execFileSync('cat', [`/proc/${pid}/comm`], { encoding: 'utf-8' });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 20));
    }
  }
}

describe('isKnownAgentComm', () => {
  it('returns true for a real node process', async () => {
    const child = spawnLongLived(process.execPath, ['-e', 'setTimeout(()=>{}, 10000)']);
    const pid = child.pid!;
    try {
      await waitForComm(pid);
      expect(isKnownAgentComm(pid)).toBe(true);
    } finally {
      child.kill('SIGKILL');
    }
  });

  it('fails closed for a non-existent PID', () => {
    const warnings: string[] = [];
    const logger = { warn: (msg: string) => warnings.push(msg) };
    // PID 2^31 - 1 is effectively guaranteed not to exist.
    expect(isKnownAgentComm(2147483646, logger)).toBe(false);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('fails closed for an unrelated process comm', async () => {
    const child = spawnLongLived('sleep', ['30']);
    const pid = child.pid!;
    try {
      await waitForComm(pid);
      const warnings: string[] = [];
      const logger = { warn: (msg: string) => warnings.push(msg) };
      expect(isKnownAgentComm(pid, logger)).toBe(false);
      expect(warnings.length).toBeGreaterThan(0);
    } finally {
      child.kill('SIGKILL');
    }
  });
});

describe('transitionCardStatus', () => {
  let repoDir: string;

  beforeEach(async () => {
    repoDir = await mkdtemp(join(tmpdir(), 'adhoc-card-'));
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    execFileSync('git', ['config', 'user.email', 'test@test.local'], { cwd: repoDir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoDir });
  });

  afterEach(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  it('flips active to needs_review and commits', async () => {
    await writeFile(join(repoDir, 'CARD.meta.json'), JSON.stringify({ id: 'main-1', status: 'active' }, null, 2));
    execFileSync('git', ['add', 'CARD.meta.json'], { cwd: repoDir });
    execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: repoDir });

    await transitionCardStatus(repoDir);

    const meta = JSON.parse(await readFile(join(repoDir, 'CARD.meta.json'), 'utf-8')) as { status?: string };
    expect(meta.status).toBe('needs_review');

    const log = execFileSync('git', ['log', '--oneline'], { cwd: repoDir, encoding: 'utf-8' });
    expect(log).toContain('Changed status from active to needs_review');
  });

  it('is a no-op when the card is not active', async () => {
    await writeFile(join(repoDir, 'CARD.meta.json'), JSON.stringify({ id: 'main-1', status: 'done' }, null, 2));

    await transitionCardStatus(repoDir);

    const meta = JSON.parse(await readFile(join(repoDir, 'CARD.meta.json'), 'utf-8')) as { status?: string };
    expect(meta.status).toBe('done');
  });

  it('is a no-op when CARD.meta.json is absent', async () => {
    await expect(transitionCardStatus(repoDir)).resolves.toBeUndefined();
  });

  it('commits with an explicit identity even when the repo has no user.name/email', async () => {
    // Fresh repo with NO committer identity configured.
    const bareRepo = await mkdtemp(join(tmpdir(), 'adhoc-noident-'));
    try {
      execFileSync('git', ['init', '-q'], { cwd: bareRepo });
      // Allow the initial commit to land via the explicit-identity env too.
      const env = {
        ...process.env,
        GIT_AUTHOR_NAME: 'seed',
        GIT_AUTHOR_EMAIL: 'seed@x',
        GIT_COMMITTER_NAME: 'seed',
        GIT_COMMITTER_EMAIL: 'seed@x'
      };
      await writeFile(join(bareRepo, 'CARD.meta.json'), JSON.stringify({ id: 'main-1', status: 'active' }, null, 2));
      execFileSync('git', ['add', 'CARD.meta.json'], { cwd: bareRepo });
      execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: bareRepo, env });

      // No user.name/email set on the repo — transitionCardStatus must still commit.
      await transitionCardStatus(bareRepo);

      const meta = JSON.parse(await readFile(join(bareRepo, 'CARD.meta.json'), 'utf-8')) as { status?: string };
      expect(meta.status).toBe('needs_review');
      const log = execFileSync('git', ['log', '--oneline'], { cwd: bareRepo, encoding: 'utf-8' });
      expect(log).toContain('Changed status from active to needs_review');
    } finally {
      await rm(bareRepo, { recursive: true, force: true });
    }
  });

  it('reverts the meta write and throws when the commit fails', async () => {
    await writeFile(join(repoDir, 'CARD.meta.json'), JSON.stringify({ id: 'main-1', status: 'active' }, null, 2));
    execFileSync('git', ['add', 'CARD.meta.json'], { cwd: repoDir });
    execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: repoDir });

    // A pre-commit hook that always rejects forces the commit to fail.
    const hooksDir = join(repoDir, '.git', 'hooks');
    await writeFile(join(hooksDir, 'pre-commit'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });

    const warnings: string[] = [];
    const logger = { warn: (msg: string) => warnings.push(msg) };

    await expect(transitionCardStatus(repoDir, logger)).rejects.toBeInstanceOf(Error);

    // Working tree must be restored to the committed `active` contents — not
    // left dirty claiming needs_review.
    const meta = JSON.parse(await readFile(join(repoDir, 'CARD.meta.json'), 'utf-8')) as { status?: string };
    expect(meta.status).toBe('active');
    expect(warnings.some((w) => w.includes('reverting'))).toBe(true);
  });
});

describe('isAdhocActivatableStatus', () => {
  it('permits working/pre-work states', () => {
    expect(isAdhocActivatableStatus('todo')).toBe(true);
    expect(isAdhocActivatableStatus('active')).toBe(true);
    expect(isAdhocActivatableStatus('needs_review')).toBe(true);
  });

  it('rejects terminal/review-exit states and undefined', () => {
    expect(isAdhocActivatableStatus('done')).toBe(false);
    expect(isAdhocActivatableStatus('archived')).toBe(false);
    expect(isAdhocActivatableStatus(undefined)).toBe(false);
    expect(isAdhocActivatableStatus('bogus')).toBe(false);
  });
});

describe('readCardStatus', () => {
  let repoDir: string;

  beforeEach(async () => {
    repoDir = await mkdtemp(join(tmpdir(), 'adhoc-status-'));
  });

  afterEach(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  it('reads the status field from CARD.meta.json', async () => {
    await writeFile(join(repoDir, 'CARD.meta.json'), JSON.stringify({ id: 'main-1', status: 'done' }));
    expect(await readCardStatus(repoDir)).toBe('done');
  });

  it('returns null when CARD.meta.json is absent', async () => {
    expect(await readCardStatus(repoDir)).toBeNull();
  });

  it('returns null when the file is malformed', async () => {
    await writeFile(join(repoDir, 'CARD.meta.json'), 'not json');
    expect(await readCardStatus(repoDir)).toBeNull();
  });
});

describe('readProcessStartTime / isProcessAliveWithStartTime', () => {
  it('reads a non-empty start-time for a live process', async () => {
    const child = spawnLongLived(process.execPath, ['-e', 'setTimeout(()=>{}, 10000)']);
    const pid = child.pid!;
    try {
      await waitForComm(pid);
      const startTime = readProcessStartTime(pid);
      expect(startTime).not.toBeNull();
      expect(startTime!.length).toBeGreaterThan(0);
      // Matching start-time → alive.
      expect(isProcessAliveWithStartTime(pid, startTime)).toBe(true);
    } finally {
      child.kill('SIGKILL');
    }
  });

  it('treats a PID as dead when the start-time no longer matches (PID reuse)', async () => {
    const child = spawnLongLived(process.execPath, ['-e', 'setTimeout(()=>{}, 10000)']);
    const pid = child.pid!;
    try {
      await waitForComm(pid);
      // A stale token that cannot match the live process's real start-time.
      expect(isProcessAliveWithStartTime(pid, 'definitely-not-the-start-time')).toBe(false);
      // Without a token, falls back to plain liveness.
      expect(isProcessAliveWithStartTime(pid)).toBe(true);
    } finally {
      child.kill('SIGKILL');
    }
  });

  it('returns null start-time and reads dead for a non-existent PID', () => {
    expect(readProcessStartTime(2147483646)).toBeNull();
    expect(isProcessAliveWithStartTime(2147483646, 'anything')).toBe(false);
  });
});
