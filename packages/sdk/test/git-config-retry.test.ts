/**
 * Tests for gitConfigWithRetry — the config-lock-contention retry helper.
 *
 * Reproduces the production race deterministically by holding a real
 * `.git/config.lock` file: git fails immediately with "could not lock config
 * file ... File exists" while the lock is present, so the helper must retry
 * until the lock is released and propagate the error when it never is.
 *
 * @summary Unit tests for git-config write retry on lock contention
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gitConfigWithRetry } from '../src/worktree.js';

describe('gitConfigWithRetry', () => {
  let repo: string;
  let lockPath: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'git-config-retry-'));
    execFileSync('git', ['init', '-q', repo]);
    lockPath = join(repo, '.git', 'config.lock');
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('writes the value once a contended config lock is released', async () => {
    writeFileSync(lockPath, '');
    // Release the lock while the helper is mid-retry.
    const release = setTimeout(() => unlinkSync(lockPath), 40);
    try {
      await gitConfigWithRetry(['-C', repo, 'config', 'extensions.worktreeConfig', 'true']);
    } finally {
      clearTimeout(release);
    }
    const value = execFileSync('git', ['-C', repo, 'config', 'extensions.worktreeConfig'], {
      encoding: 'utf8'
    }).trim();
    expect(value).toBe('true');
  });

  it('propagates the lock error when the lock is never released', async () => {
    writeFileSync(lockPath, '');
    await expect(gitConfigWithRetry(['-C', repo, 'config', 'extensions.worktreeConfig', 'true'], 2)).rejects.toThrow(
      /could not lock config file/
    );
  });

  it('propagates non-lock git errors immediately', async () => {
    await expect(gitConfigWithRetry(['-C', join(repo, 'nope'), 'config', 'x.y', 'z'], 5)).rejects.toThrow();
  });
});
