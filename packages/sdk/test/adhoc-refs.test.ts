/**
 * Tests for ad-hoc reference handling, the reconciliation sweep, and live
 * action detection.
 *
 * Real filesystem and real processes only — no mocks. A CARDS_HOME-isolated
 * tmp dir holds the `adhoc-active/` refs; real git repos back the sweep's
 * status transition; real `sleep`/dead PIDs drive liveness checks.
 *
 * @summary adhoc-refs sweep + action-presence + ref liveness tests
 */

import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  adhocActiveDir,
  liveActionPresent,
  liveRefsRemain,
  reconcileStrandedActiveCards,
  serializeRef,
  writeRef
} from '../src/bin/adhoc-refs.js';

const noopLogger = { warn: () => {} };

function spawnSleep(): ChildProcess {
  return spawn('sleep', ['30'], { stdio: 'ignore' });
}

function initCardRepo(repoDir: string): void {
  execFileSync('git', ['init', '-q'], { cwd: repoDir });
  execFileSync('git', ['config', 'user.email', 'test@test.local'], { cwd: repoDir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoDir });
  execFileSync('git', ['add', '-A'], { cwd: repoDir });
}

describe('adhoc-refs CARDS_HOME-isolated suite', () => {
  let cardsHome: string;
  let originalCardsHome: string | undefined;

  beforeEach(async () => {
    cardsHome = await mkdtemp(join(tmpdir(), 'adhoc-refs-home-'));
    originalCardsHome = process.env['CARDS_HOME'];
    process.env['CARDS_HOME'] = cardsHome;
  });

  afterEach(async () => {
    if (originalCardsHome === undefined) {
      delete process.env['CARDS_HOME'];
    } else {
      process.env['CARDS_HOME'] = originalCardsHome;
    }
    await rm(cardsHome, { recursive: true, force: true });
  });

  describe('writeRef + liveRefsRemain start-time reuse', () => {
    it('treats a ref whose start-time no longer matches as dead', async () => {
      const cardId = 'main-1';
      await mkdir(adhocActiveDir(cardId), { recursive: true });

      const child = spawnSleep();
      const livePid = child.pid!;
      try {
        // Write a ref for the live PID but with a deliberately wrong start-time.
        await writeFile(join(adhocActiveDir(cardId), 'other-session.ref'), serializeRef(livePid, 'WRONG-START-TIME'));
        // PID is alive but identity mismatches → treated as dead, ref unlinked.
        expect(await liveRefsRemain(cardId, 'dying', noopLogger)).toBe(false);
        await expect(access(join(adhocActiveDir(cardId), 'other-session.ref'))).rejects.toMatchObject({
          code: 'ENOENT'
        });
      } finally {
        child.kill('SIGKILL');
      }
    });

    it('keeps a ref whose PID and start-time both match', async () => {
      const cardId = 'main-1';
      await mkdir(adhocActiveDir(cardId), { recursive: true });
      const child = spawnSleep();
      const livePid = child.pid!;
      try {
        await writeRef(cardId, 'other-session', livePid);
        expect(await liveRefsRemain(cardId, 'dying', noopLogger)).toBe(true);
      } finally {
        child.kill('SIGKILL');
      }
    });
  });

  describe('liveActionPresent', () => {
    it('returns false when no action socket files exist', async () => {
      expect(await liveActionPresent(noopLogger)).toBe(false);
    });

    it('returns true when a live action socket is present', async () => {
      const child = spawnSleep();
      const livePid = child.pid!;
      try {
        // Socket filename encodes the owning (live) PID.
        await writeFile(join(cardsHome, `a-${livePid}-deadbeef.sock`), '');
        expect(await liveActionPresent(noopLogger)).toBe(true);
      } finally {
        child.kill('SIGKILL');
      }
    });

    it('ignores an action socket whose owning PID is dead', async () => {
      await writeFile(join(cardsHome, 'a-2147483646-deadbeef.sock'), '');
      expect(await liveActionPresent(noopLogger)).toBe(false);
    });
  });

  describe('reconcileStrandedActiveCards', () => {
    let reposRoot: string;

    beforeEach(async () => {
      reposRoot = await mkdtemp(join(tmpdir(), 'adhoc-repos-'));
    });

    afterEach(async () => {
      await rm(reposRoot, { recursive: true, force: true });
    });

    async function seedCardRepo(cardId: string, status: string): Promise<string> {
      const repoDir = join(reposRoot, cardId);
      await mkdir(repoDir, { recursive: true });
      await writeFile(join(repoDir, 'CARD.meta.json'), JSON.stringify({ id: cardId, status }, null, 2));
      initCardRepo(repoDir);
      execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: repoDir });
      return repoDir;
    }

    it('settles a card whose only ref is a dead monitor', async () => {
      const cardId = 'main-1';
      const repoDir = await seedCardRepo(cardId, 'active');
      await mkdir(adhocActiveDir(cardId), { recursive: true });
      // Dead-PID ref (guaranteed-dead high PID).
      await writeFile(join(adhocActiveDir(cardId), 'dead-session.ref'), serializeRef(2147483646, '12345'));

      await reconcileStrandedActiveCards(reposRoot, noopLogger);

      const meta = JSON.parse(await readFile(join(repoDir, 'CARD.meta.json'), 'utf-8')) as { status?: string };
      expect(meta.status).toBe('needs_review');
      // Stale ref removed.
      await expect(access(join(adhocActiveDir(cardId), 'dead-session.ref'))).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('leaves a card with a live monitor untouched', async () => {
      const cardId = 'main-1';
      const repoDir = await seedCardRepo(cardId, 'active');
      await mkdir(adhocActiveDir(cardId), { recursive: true });
      const child = spawnSleep();
      const livePid = child.pid!;
      try {
        await writeRef(cardId, 'live-session', livePid);
        await reconcileStrandedActiveCards(reposRoot, noopLogger);

        const meta = JSON.parse(await readFile(join(repoDir, 'CARD.meta.json'), 'utf-8')) as { status?: string };
        // Healthy card — left active, ref intact.
        expect(meta.status).toBe('active');
        await expect(access(join(adhocActiveDir(cardId), 'live-session.ref'))).resolves.toBeUndefined();
      } finally {
        child.kill('SIGKILL');
      }
    });

    it('does not flip a card that is not active (guarded by transitionCardStatus)', async () => {
      const cardId = 'main-1';
      const repoDir = await seedCardRepo(cardId, 'done');
      await mkdir(adhocActiveDir(cardId), { recursive: true });
      await writeFile(join(adhocActiveDir(cardId), 'dead-session.ref'), serializeRef(2147483646, '12345'));

      await reconcileStrandedActiveCards(reposRoot, noopLogger);

      const meta = JSON.parse(await readFile(join(repoDir, 'CARD.meta.json'), 'utf-8')) as { status?: string };
      expect(meta.status).toBe('done');
    });

    it('no-ops when reposRoot is null', async () => {
      await expect(reconcileStrandedActiveCards(null, noopLogger)).resolves.toBeUndefined();
    });
  });
});
