/**
 * Tests for close-only session commit.
 *
 * @summary Covers sentinel path/exists/remove and a real git commit against a temp repo.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  commitSessionClose,
  removeSentinelFile,
  sentinelExists,
  sentinelPath
} from '../../../src/transcript-sync/engine/commit.js';
import type { SessionSyncManifest } from '../../../src/transcript-sync/manifest.js';

describe('commit', () => {
  let cardRepoPath: string;
  let manifest: SessionSyncManifest;

  beforeEach(() => {
    cardRepoPath = join(tmpdir(), `commit-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(cardRepoPath, { recursive: true });
    execFileSync('git', ['init'], { cwd: cardRepoPath });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: cardRepoPath });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: cardRepoPath });

    manifest = {
      version: 1,
      sessionId: 'sess-1',
      cardId: 'card-1',
      runtime: 'claude-code',
      streamType: 'claude-code-session',
      watchRoot: '/dev/null/unused',
      sources: [{ pattern: 'sess-1.jsonl', role: 'main', mode: 'jsonl-tail' }],
      monitorPid: process.pid,
      cardRepoPath
    };
  });

  afterEach(() => {
    rmSync(cardRepoPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  describe('sentinelPath / sentinelExists / removeSentinelFile', () => {
    it('builds a path scoped by streamType and sessionId', () => {
      expect(sentinelPath(manifest)).toBe(join(cardRepoPath, 'streams', 'claude-code-session', 'sess-1.flush'));
    });

    it('reports existence accurately and removal is idempotent', async () => {
      expect(await sentinelExists(manifest)).toBe(false);
      mkdirSync(join(cardRepoPath, 'streams', 'claude-code-session'), { recursive: true });
      writeFileSync(sentinelPath(manifest), '');
      expect(await sentinelExists(manifest)).toBe(true);

      await removeSentinelFile(manifest);
      expect(await sentinelExists(manifest)).toBe(false);
      // Idempotent: removing again does not throw.
      await expect(removeSentinelFile(manifest)).resolves.toBeUndefined();
    });
  });

  describe('commitSessionClose', () => {
    it('removes the sentinel and commits the streams directory with a close message', async () => {
      const streamsDir = join(cardRepoPath, 'streams', 'claude-code-session');
      mkdirSync(streamsDir, { recursive: true });
      writeFileSync(join(streamsDir, 'sess-1.jsonl'), 'line1\n');
      writeFileSync(sentinelPath(manifest), '');

      const errors: string[] = [];
      await commitSessionClose(
        manifest,
        () => {},
        (msg) => errors.push(msg)
      );

      expect(errors).toHaveLength(0);
      expect(existsSync(sentinelPath(manifest))).toBe(false);

      const log = execFileSync('git', ['log', '--format=%s'], { cwd: cardRepoPath, encoding: 'utf-8' });
      expect(log).toContain('Close session sess-1.');

      const tracked = execFileSync('git', ['ls-files'], { cwd: cardRepoPath, encoding: 'utf-8' });
      expect(tracked).toContain('streams/claude-code-session/sess-1.jsonl');
    });

    it('surfaces a git commit failure via errorFn rather than throwing', async () => {
      // No files at all under streams/ — git commit with nothing staged fails
      // ("nothing to commit"), which must be reported, not thrown.
      const errors: string[] = [];
      await expect(
        commitSessionClose(
          manifest,
          () => {},
          (msg) => errors.push(msg)
        )
      ).resolves.toBeUndefined();
      expect(errors.some((e) => e.includes('git commit failed'))).toBe(true);
    });

    it('warns (does not throw) when sentinel removal fails for a reason other than ENOENT', async () => {
      const streamsDir = join(cardRepoPath, 'streams', 'claude-code-session');
      mkdirSync(streamsDir, { recursive: true });
      writeFileSync(join(streamsDir, 'sess-1.jsonl'), 'line1\n');
      // Make the sentinel path itself a directory so unlink fails with EISDIR, not ENOENT.
      mkdirSync(sentinelPath(manifest), { recursive: true });

      const warnings: string[] = [];
      await expect(
        commitSessionClose(
          manifest,
          (msg) => warnings.push(msg),
          () => {}
        )
      ).resolves.toBeUndefined();
      expect(warnings.some((w) => w.includes('removeSentinelFile'))).toBe(true);
    });
  });
});
