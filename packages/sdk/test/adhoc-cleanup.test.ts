/**
 * Tests for the ad-hoc cleanup ref-counter teardown ordering.
 *
 * Exercises `liveRefsRemain` against a real per-card reference directory under
 * a CARDS_HOME-isolated tmp dir. Verifies that: a live other-session ref blocks
 * teardown; a dead other-session ref is unlinked and does not block; and the
 * dying session's own ref is excluded from the scan.
 *
 * @summary ad-hoc cleanup ref-counter teardown tests
 */

import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { adhocActiveDir, liveRefsRemain, performTeardown, type TeardownClient } from '../src/bin/adhoc-cleanup.js';
import type { CardUpdateData } from '../src/client/types/client.js';

const noopLogger = { warn: () => {} };

function spawnSleep(): ChildProcess {
  return spawn('sleep', ['30'], { stdio: 'ignore' });
}

/**
 * Real in-test {@link TeardownClient} that records the updates it receives, and
 * can be configured to throw (simulating an API-down `needs_review` write).
 */
class RecordingClient implements TeardownClient {
  readonly updates: Array<{ cardId: string; data: CardUpdateData }> = [];
  constructor(private readonly throwOnUpdate = false) {}
  async updateCard(cardId: string, data: CardUpdateData): Promise<unknown> {
    this.updates.push({ cardId, data });
    if (this.throwOnUpdate) throw new Error('API down');
    return undefined;
  }
}

describe('liveRefsRemain', () => {
  let cardsHome: string;
  const cardId = 'main-1';
  const dyingSession = 'dying-session';
  let originalCardsHome: string | undefined;

  beforeEach(async () => {
    cardsHome = await mkdtemp(join(tmpdir(), 'adhoc-home-'));
    originalCardsHome = process.env['CARDS_HOME'];
    process.env['CARDS_HOME'] = cardsHome;
    await mkdir(adhocActiveDir(cardId), { recursive: true });
  });

  afterEach(async () => {
    if (originalCardsHome === undefined) {
      delete process.env['CARDS_HOME'];
    } else {
      process.env['CARDS_HOME'] = originalCardsHome;
    }
    await rm(cardsHome, { recursive: true, force: true });
  });

  it('returns false when only the dying session ref remains', async () => {
    await writeFile(join(adhocActiveDir(cardId), `${dyingSession}.ref`), String(process.pid));
    expect(await liveRefsRemain(cardId, dyingSession, noopLogger)).toBe(false);
  });

  it('returns true when another session ref has a live PID', async () => {
    const child = spawnSleep();
    try {
      await writeFile(join(adhocActiveDir(cardId), 'other-session.ref'), String(child.pid));
      expect(await liveRefsRemain(cardId, dyingSession, noopLogger)).toBe(true);
    } finally {
      child.kill('SIGKILL');
    }
  });

  it('unlinks a stale dead-PID ref and returns false', async () => {
    const staleRef = join(adhocActiveDir(cardId), 'stale-session.ref');
    await writeFile(staleRef, '2147483646');

    expect(await liveRefsRemain(cardId, dyingSession, noopLogger)).toBe(false);

    await expect(access(staleRef)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('returns false when the reference directory is absent', async () => {
    await rm(adhocActiveDir(cardId), { recursive: true, force: true });
    expect(await liveRefsRemain(cardId, dyingSession, noopLogger)).toBe(false);
  });
});

describe('performTeardown', () => {
  let cardsHome: string;
  let repoDir: string;
  const cardId = 'main-1';
  const sessionId = 'dying-session';
  let lockPath: string;
  let originalCardsHome: string | undefined;

  beforeEach(async () => {
    cardsHome = await mkdtemp(join(tmpdir(), 'adhoc-teardown-home-'));
    originalCardsHome = process.env['CARDS_HOME'];
    process.env['CARDS_HOME'] = cardsHome;
    await mkdir(adhocActiveDir(cardId), { recursive: true });

    // Real card repo backing the filesystem fallback.
    repoDir = await mkdtemp(join(tmpdir(), 'adhoc-teardown-repo-'));
    await writeFile(join(repoDir, 'CARD.meta.json'), JSON.stringify({ id: cardId, status: 'active' }, null, 2));
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    execFileSync('git', ['config', 'user.email', 'test@test.local'], { cwd: repoDir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoDir });
    execFileSync('git', ['add', '-A'], { cwd: repoDir });
    execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: repoDir });

    // De-dupe lock present on disk; teardown must always release it.
    lockPath = join(cardsHome, `${sessionId}.lock`);
    await writeFile(lockPath, String(process.pid));
  });

  afterEach(async () => {
    if (originalCardsHome === undefined) {
      delete process.env['CARDS_HOME'];
    } else {
      process.env['CARDS_HOME'] = originalCardsHome;
    }
    await rm(cardsHome, { recursive: true, force: true });
    await rm(repoDir, { recursive: true, force: true });
  });

  function teardownArgs() {
    return { sessionId, cardId, cardRepoPath: repoDir, lockPath };
  }

  async function status(): Promise<string | undefined> {
    return (JSON.parse(await readFile(join(repoDir, 'CARD.meta.json'), 'utf-8')) as { status?: string }).status;
  }

  it("retains this session's ref when the flip is deferred to a live action", async () => {
    const ownRef = join(adhocActiveDir(cardId), `${sessionId}.ref`);
    await writeFile(ownRef, String(process.pid));

    const action = spawnSleep();
    const client = new RecordingClient();
    try {
      await writeFile(join(cardsHome, `a-${action.pid}-deadbeef.sock`), '');

      await performTeardown(client, teardownArgs(), noopLogger);

      // Deferred: no needs_review write, ref retained so the sweep can settle.
      expect(client.updates).toHaveLength(0);
      await expect(access(ownRef)).resolves.toBeUndefined();
      // Lock always released.
      await expect(access(lockPath)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      action.kill('SIGKILL');
    }
  });

  it('flips to needs_review and removes the ref when nothing else owns the card', async () => {
    const ownRef = join(adhocActiveDir(cardId), `${sessionId}.ref`);
    await writeFile(ownRef, String(process.pid));
    const client = new RecordingClient();

    await performTeardown(client, teardownArgs(), noopLogger);

    expect(client.updates).toEqual([
      { cardId, data: { status: 'needs_review', author: 'system <system@cards.local>' } }
    ]);
    await expect(access(ownRef)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(lockPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('releases the lock even when the API write throws and the filesystem fallback runs', async () => {
    const ownRef = join(adhocActiveDir(cardId), `${sessionId}.ref`);
    await writeFile(ownRef, String(process.pid));
    // Client throws on the needs_review write → filesystem fallback transitions
    // the real repo; the lock must still be released via the finally.
    const client = new RecordingClient(true);

    await performTeardown(client, teardownArgs(), noopLogger);

    expect(await status()).toBe('needs_review');
    await expect(access(lockPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('releases the lock on the transitionCardStatus rethrow path', async () => {
    const ownRef = join(adhocActiveDir(cardId), `${sessionId}.ref`);
    await writeFile(ownRef, String(process.pid));

    // Point the fallback at a non-git directory with an `active` card so
    // `git add`/`commit` fail and transitionCardStatus rethrows; the lock must
    // still be released via the finally (it would otherwise leak).
    const badRepo = await mkdtemp(join(tmpdir(), 'adhoc-teardown-badrepo-'));
    await writeFile(join(badRepo, 'CARD.meta.json'), JSON.stringify({ id: cardId, status: 'active' }, null, 2));
    const client = new RecordingClient(true);

    try {
      await expect(
        performTeardown(client, { sessionId, cardId, cardRepoPath: badRepo, lockPath }, noopLogger)
      ).rejects.toThrow();
      await expect(access(lockPath)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(badRepo, { recursive: true, force: true });
    }
  });
});
