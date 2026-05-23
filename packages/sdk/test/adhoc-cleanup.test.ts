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

import { type ChildProcess, spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { adhocActiveDir, liveRefsRemain } from '../src/bin/adhoc-cleanup.js';

const noopLogger = { warn: () => {} };

function spawnSleep(): ChildProcess {
  return spawn('sleep', ['30'], { stdio: 'ignore' });
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
