/**
 * Tests for the bounded-retry `git config` wrapper: happy path,
 * retry-past-transient-lock, exhaustion, and non-contention passthrough.
 *
 * @summary Tests for the bounded-retry git config write wrapper
 */
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gitConfigWithRetry, isRetryableConfigLock } from '../src/worktree.js';

describe('gitConfigWithRetry', () => {
  let repoDir = '';
  let lockPath = '';

  beforeEach(async () => {
    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-config-write-'));
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    lockPath = path.join(repoDir, '.git', 'config.lock');
  });

  afterEach(async () => {
    await fs.rm(repoDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('writes the config value on the happy path', async () => {
    await gitConfigWithRetry(['-C', repoDir, 'config', 'extensions.worktreeConfig', 'true']);
    const value = execFileSync('git', ['-C', repoDir, 'config', 'extensions.worktreeConfig'], {
      encoding: 'utf8'
    }).trim();
    expect(value).toBe('true');
  });

  it('retries past transient config.lock contention and succeeds once the lock clears', async () => {
    await fs.writeFile(lockPath, '');
    // Release the lock while the first backoff sleeps, simulating a concurrent
    // writer finishing its own `git config` invocation.
    const release = (async (): Promise<void> => {
      await new Promise<void>((resolve) => setTimeout(resolve, 30));
      await fs.unlink(lockPath);
    })();

    await gitConfigWithRetry(['-C', repoDir, 'config', 'extensions.worktreeConfig', 'true']);
    await release;

    const value = execFileSync('git', ['-C', repoDir, 'config', 'extensions.worktreeConfig'], {
      encoding: 'utf8'
    }).trim();
    expect(value).toBe('true');
  });

  it('propagates lock contention after attempts are exhausted', async () => {
    await fs.writeFile(lockPath, '');
    await expect(gitConfigWithRetry(['-C', repoDir, 'config', 'extensions.worktreeConfig', 'true'], 2)).rejects.toThrow(
      /could not lock config file/
    );
  });

  it('propagates non-contention failures immediately without retrying', async () => {
    await expect(
      gitConfigWithRetry(['-C', path.join(repoDir, 'does-not-exist'), 'config', 'a.b', 'c'])
    ).rejects.toThrow();
  });
});

describe('isRetryableConfigLock', () => {
  it("matches git's own config.lock contention message", () => {
    expect(isRetryableConfigLock('error: could not lock config file .git/config: File exists')).toBe(true);
  });

  it('matches the Windows sharing-violation on .git/config', () => {
    // The exact stderr a `git config --worktree` write emits on Windows when a
    // watcher/AV holds .git/config open: a permission-denied access warning
    // cascading into the worktreeConfig fatal.
    const windowsMessage =
      "warning: unable to access 'C:/Users/x/AppData/Local/Temp/ws/.git/config': Permission denied\n" +
      'fatal: --worktree cannot be used with multiple working trees unless the config\n' +
      'extension worktreeConfig is enabled.';
    expect(isRetryableConfigLock(windowsMessage)).toBe(true);
  });

  it('matches a bare worktreeConfig-not-enabled fatal (locked config could not be read)', () => {
    expect(
      isRetryableConfigLock(
        'fatal: --worktree cannot be used with multiple working trees unless the config extension worktreeConfig is enabled.'
      )
    ).toBe(true);
  });

  it('does not match an unrelated permission-denied error on a non-config path', () => {
    expect(isRetryableConfigLock("fatal: unable to access 'objects/pack': Permission denied")).toBe(false);
  });

  it('does not match a generic non-contention failure', () => {
    expect(isRetryableConfigLock('fatal: not a git repository (or any of the parent directories): .git')).toBe(false);
  });
});
