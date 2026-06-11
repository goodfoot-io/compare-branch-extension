/**
 * Tests for the per-session unbound-worktree candidate set.
 *
 * All operations run against a real temp dir rooted under CARDS_HOME. No mocks.
 *
 * @summary unboundWorktreeCandidates — add/read/remove/clear, idempotency, session gate
 * @module unboundWorktreeCandidates.test
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addUnboundCandidate,
  clearUnboundCandidates,
  readUnboundCandidates,
  removeUnboundCandidate
} from '../src/unboundWorktreeCandidates.js';

describe('unboundWorktreeCandidates', () => {
  let tmpBase: string;
  let cardsHome: string;
  let savedCardsHome: string | undefined;
  // A real directory on disk to simulate a live worktree.
  let liveWorktreeDir: string;

  beforeEach(async () => {
    tmpBase = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'unbound-cand-test-')));
    cardsHome = path.join(tmpBase, '.cards');
    await fs.mkdir(cardsHome, { recursive: true });
    savedCardsHome = process.env['CARDS_HOME'];
    process.env['CARDS_HOME'] = cardsHome;

    // A real directory that exists so readUnboundCandidates does not filter it.
    liveWorktreeDir = path.join(tmpBase, 'live-worktree');
    await fs.mkdir(liveWorktreeDir, { recursive: true });
  });

  afterEach(async () => {
    if (savedCardsHome === undefined) {
      delete process.env['CARDS_HOME'];
    } else {
      process.env['CARDS_HOME'] = savedCardsHome;
    }
    await fs.rm(tmpBase, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // addUnboundCandidate / readUnboundCandidates
  // ---------------------------------------------------------------------------

  it('readUnboundCandidates returns empty array for a session with no entries', async () => {
    const entries = await readUnboundCandidates('sess-empty');
    expect(entries).toEqual([]);
  });

  it('readUnboundCandidates returns empty array when the candidates dir does not exist', async () => {
    // ENOENT on the session subdir must be treated as empty, not thrown.
    const entries = await readUnboundCandidates('sess-never-written');
    expect(entries).toHaveLength(0);
  });

  it('addUnboundCandidate persists an entry that readUnboundCandidates returns', async () => {
    await addUnboundCandidate('sess-add', liveWorktreeDir, '/tmp/t.jsonl');
    const entries = await readUnboundCandidates('sess-add');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ worktreeDir: liveWorktreeDir, sessionId: 'sess-add', transcriptPath: '/tmp/t.jsonl' });
  });

  it('addUnboundCandidate is idempotent: re-adding the same worktree overwrites without creating duplicates', async () => {
    await addUnboundCandidate('sess-idem', liveWorktreeDir, '/tmp/first.jsonl');
    await addUnboundCandidate('sess-idem', liveWorktreeDir, '/tmp/second.jsonl');
    const entries = await readUnboundCandidates('sess-idem');
    expect(entries).toHaveLength(1);
    // The second write wins.
    expect(entries[0]!.transcriptPath).toBe('/tmp/second.jsonl');
  });

  it('multiple distinct worktrees in the same session each get their own entry', async () => {
    const wtA = path.join(tmpBase, 'wt-a');
    const wtB = path.join(tmpBase, 'wt-b');
    await fs.mkdir(wtA);
    await fs.mkdir(wtB);

    await addUnboundCandidate('sess-multi', wtA, '/tmp/ta.jsonl');
    await addUnboundCandidate('sess-multi', wtB, '/tmp/tb.jsonl');

    const entries = await readUnboundCandidates('sess-multi');
    expect(entries).toHaveLength(2);
    const dirs = entries.map((e) => e.worktreeDir).sort();
    expect(dirs).toEqual([wtA, wtB].sort());
  });

  // ---------------------------------------------------------------------------
  // readUnboundCandidates — stale-entry filtering
  // ---------------------------------------------------------------------------

  it('readUnboundCandidates filters out entries whose worktreeDir no longer exists on disk', async () => {
    const gone = path.join(tmpBase, 'removed-worktree');
    await fs.mkdir(gone);
    // Write the entry while the directory exists.
    await addUnboundCandidate('sess-stale', gone, '/tmp/t.jsonl');
    // Remove the directory to simulate an unbound worktree that was deleted.
    await fs.rm(gone, { recursive: true, force: true });

    const entries = await readUnboundCandidates('sess-stale');
    expect(entries).toHaveLength(0);
  });

  it('live entries survive next to stale ones', async () => {
    const gone = path.join(tmpBase, 'gone');
    await fs.mkdir(gone);
    await addUnboundCandidate('sess-mixed', gone, '/tmp/gone.jsonl');
    await fs.rm(gone, { recursive: true, force: true });

    await addUnboundCandidate('sess-mixed', liveWorktreeDir, '/tmp/live.jsonl');

    const entries = await readUnboundCandidates('sess-mixed');
    expect(entries).toHaveLength(1);
    expect(entries[0]!.worktreeDir).toBe(liveWorktreeDir);
  });

  // ---------------------------------------------------------------------------
  // removeUnboundCandidate
  // ---------------------------------------------------------------------------

  it('removeUnboundCandidate removes the entry so it no longer appears in read', async () => {
    await addUnboundCandidate('sess-remove', liveWorktreeDir, '/tmp/t.jsonl');
    await removeUnboundCandidate('sess-remove', liveWorktreeDir);
    const entries = await readUnboundCandidates('sess-remove');
    expect(entries).toHaveLength(0);
  });

  it('removeUnboundCandidate is ENOENT-tolerant (no error when entry is absent)', async () => {
    // Must not throw even if the file was never written.
    await expect(removeUnboundCandidate('sess-noent', '/no/such/worktree')).resolves.toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // clearUnboundCandidates
  // ---------------------------------------------------------------------------

  it('clearUnboundCandidates removes all entries for a session', async () => {
    const wtA = path.join(tmpBase, 'wt-clear-a');
    const wtB = path.join(tmpBase, 'wt-clear-b');
    await fs.mkdir(wtA);
    await fs.mkdir(wtB);
    await addUnboundCandidate('sess-clear', wtA, '/tmp/ta.jsonl');
    await addUnboundCandidate('sess-clear', wtB, '/tmp/tb.jsonl');

    await clearUnboundCandidates('sess-clear');

    const entries = await readUnboundCandidates('sess-clear');
    expect(entries).toHaveLength(0);
  });

  it('clearUnboundCandidates is ENOENT-tolerant (no error when session dir is absent)', async () => {
    await expect(clearUnboundCandidates('sess-clear-noent')).resolves.toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Session gate — entries carry their owning sessionId
  // ---------------------------------------------------------------------------

  it('entries carry the sessionId they were written with', async () => {
    await addUnboundCandidate('sess-owner', liveWorktreeDir, '/tmp/t.jsonl');
    const entries = await readUnboundCandidates('sess-owner');
    expect(entries[0]!.sessionId).toBe('sess-owner');
  });

  it('sessions are isolated: entries for sess-A do not appear in sess-B reads', async () => {
    await addUnboundCandidate('sess-A', liveWorktreeDir, '/tmp/t.jsonl');
    const entriesB = await readUnboundCandidates('sess-B');
    expect(entriesB).toHaveLength(0);
  });
});
