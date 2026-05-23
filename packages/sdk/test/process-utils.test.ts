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
import { isKnownAgentComm, transitionCardStatus } from '../src/bin/process-utils.js';

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
});
