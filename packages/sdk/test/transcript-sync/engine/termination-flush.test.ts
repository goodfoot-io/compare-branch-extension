/**
 * Composition tests for launcher-owned sqlite-poll finalization after the
 * detached watcher is no longer available.
 *
 * @summary Watcher-dead and partial-evidence final drain compositions
 * @module
 */

import { access, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildAntigravityManifest } from '../../../src/transcript-sync/adapters/antigravity.js';
import { acquireFinalizationLock } from '../../../src/transcript-sync/engine/finalization-lock.js';
import { writeSessionStatus } from '../../../src/transcript-sync/engine/session-status.js';
import { SqlitePollEngine } from '../../../src/transcript-sync/engine/sqlite-poll.js';
import {
  finalizePersistedSqlitePollSession,
  finalizeSqlitePollSession
} from '../../../src/transcript-sync/engine/termination-flush.js';
import type { SqlitePollSourceSpec } from '../../../src/transcript-sync/manifest.js';
import type { EmissionRecord } from '../../../src/transcript-sync/records.js';
import {
  buildAssistantPayload,
  buildUserPayload,
  createConversationDb,
  type FixtureConversationDb
} from '../fixtures/antigravity-db.js';

const SESSION_ID = 'agy-final-drain-session';
const CONVERSATION_ID = '8724cd98-6b07-4080-82d3-1c617be236bf';

describe('sqlite-poll termination finalization', () => {
  let root: string;
  let cardRepoPath: string;
  let db: FixtureConversationDb;
  let manifest: ReturnType<typeof buildAntigravityManifest>;
  let destination: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'sqlite-termination-'));
    cardRepoPath = join(root, 'card-repo');
    const conversations = join(root, 'conversations');
    await mkdir(cardRepoPath, { recursive: true });
    await mkdir(conversations, { recursive: true });
    db = createConversationDb(conversations, CONVERSATION_ID);
    db.setTrajectoryMeta(CONVERSATION_ID);
    manifest = buildAntigravityManifest({
      sessionId: SESSION_ID,
      cardId: 'main-645',
      transcriptPath: join(conversations, `${CONVERSATION_ID}.db`),
      monitorPid: 4242,
      cardRepoPath
    });
    destination = join(cardRepoPath, 'streams', 'antigravity-session', `${CONVERSATION_ID}.db.jsonl`);
    await writeSessionStatus(manifest, { startedAt: '2026-09-01T00:00:00.000Z', fileFailures: {} });
  });

  afterEach(async () => {
    db.close();
    await rm(root, { recursive: true, force: true });
  });

  async function records(): Promise<EmissionRecord[]> {
    const raw = await readFile(destination, 'utf8');
    return raw
      .trimEnd()
      .split('\n')
      .map((line) => JSON.parse(line) as EmissionRecord);
  }

  it('drains terminal rows through the persisted manifest when the watcher died before child exit', async () => {
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('late terminal'), format: 0 });

    const result = await finalizePersistedSqlitePollSession({
      cardRepoPath,
      sessionId: SESSION_ID,
      warnFn: () => {},
      errorFn: () => {},
      watcherGraceMs: 0
    });

    expect(result).toEqual({ kind: 'flushed', emitted: 1, partial: 0 });
    expect(await records()).toMatchObject([{ idx: 0, status: 3, content: 'late terminal', anomaly: null }]);
  });

  it('flushes observed non-terminal rows as named partial evidence without duplicates on reattach', async () => {
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('question'), format: 0 });
    const spec = manifest.sources[0] as SqlitePollSourceSpec;
    const watcher = new SqlitePollEngine({
      manifest,
      spec,
      destPath: destination,
      warnFn: () => {},
      now: () => Date.now(),
      sleep: () => Promise.resolve()
    });
    await watcher.attach();
    await watcher.pollOnce();
    db.insertStep({ idx: 1, stepType: 15, status: 2, payload: buildAssistantPayload('in flight'), format: 0 });

    const first = await finalizeSqlitePollSession({
      manifest,
      startedAt: '2026-09-01T00:00:00.000Z',
      warnFn: () => {},
      errorFn: () => {}
    });
    const second = await finalizePersistedSqlitePollSession({
      cardRepoPath,
      sessionId: SESSION_ID,
      warnFn: () => {},
      errorFn: () => {},
      watcherGraceMs: 0
    });

    expect(first).toEqual({ kind: 'flushed', emitted: 1, partial: 1 });
    expect(second).toEqual({ kind: 'flushed', emitted: 0, partial: 0 });
    expect(await records()).toMatchObject([
      { idx: 0, status: 3, anomaly: null },
      { idx: 1, status: 2, content: 'in flight', anomaly: { kind: 'flush-partial' } }
    ]);
  });

  it('serializes a blocked ordinary poll with launcher takeover without duplicate records or sidecar temp races', async () => {
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('serialized'), format: 0 });
    const spec = manifest.sources[0] as SqlitePollSourceSpec;
    const warnings: string[] = [];
    let releaseBusyRetry: (() => void) | undefined;
    let busyRetryStarted: (() => void) | undefined;
    const busyRetry = new Promise<void>((resolve) => {
      busyRetryStarted = resolve;
    });
    let firstOpen = true;
    const watcher = new SqlitePollEngine({
      manifest,
      spec,
      destPath: destination,
      warnFn: (message) => warnings.push(message),
      now: () => Date.now(),
      sleep: () =>
        new Promise<void>((resolve) => {
          releaseBusyRetry = resolve;
          busyRetryStarted?.();
        }),
      openConnection: (path) => {
        if (firstOpen) {
          firstOpen = false;
          const error = new Error('database is locked') as Error & { errcode: number };
          error.errcode = 5;
          throw error;
        }
        return new DatabaseSync(path, { readOnly: true, timeout: 2_000 });
      }
    });
    await watcher.attach();

    const lockPath = `${spec.sidecarPath}.finalize.lock`;
    const releasePollLock = await acquireFinalizationLock(lockPath);
    expect(releasePollLock).not.toBeNull();
    const ordinaryPoll = watcher.pollOnce().finally(async () => releasePollLock?.());
    await busyRetry;
    const takeover = finalizeSqlitePollSession({
      manifest,
      startedAt: '2026-09-01T00:00:00.000Z',
      warnFn: (message) => warnings.push(message),
      errorFn: (message) => warnings.push(message)
    });
    releaseBusyRetry?.();

    await expect(ordinaryPoll).resolves.toMatchObject({ kind: 'ok' });
    await expect(takeover).resolves.toEqual({ kind: 'flushed', emitted: 0, partial: 0 });
    expect(await records()).toHaveLength(1);
    expect(warnings.join('\n')).not.toMatch(/ENOENT|\.tmp/i);
    await expect(access(`${spec.sidecarPath}.tmp`)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
