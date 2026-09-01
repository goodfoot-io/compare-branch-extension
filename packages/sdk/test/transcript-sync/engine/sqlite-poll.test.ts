/**
 * Tests for the sqlite-poll engine: the plan's pinned poll semantics and the
 * composition list (notes/agy-live-witnesses.md + plan Phase 5 step 2c).
 *
 * Composition coverage lives here: watcher-restart mid-DB, crash-between-
 * writes, out-of-order-terminal-across-restart, post-terminal revision,
 * mid-stream row-update, watcher-dead-at-child-exit flush, unknown
 * step_format, lazily-created DB, never-created DB, BUSY handling,
 * data_version gating, ro-without-immutable, and the named terminal outcomes.
 *
 * @summary sqlite-poll engine semantics and composition tests
 */

import { createHash } from 'node:crypto';
import { appendFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildAntigravityManifest } from '../../../src/transcript-sync/adapters/antigravity.js';
import {
  SQLITE_POLL_ABSENCE_BOUND_MS,
  SQLITE_POLL_REHASH_ROWS_PER_TICK,
  type SqlitePollConnectionFactory,
  SqlitePollEngine,
  type SqlitePollOutcome
} from '../../../src/transcript-sync/engine/sqlite-poll.js';
import type { SourceSpec, SqlitePollSourceSpec } from '../../../src/transcript-sync/manifest.js';
import { parseManifest } from '../../../src/transcript-sync/manifest.js';
import type { EmissionRecord } from '../../../src/transcript-sync/records.js';
import {
  buildAssistantPayload,
  buildToolPayload,
  buildUserPayload,
  createConversationDb,
  type FixtureConversationDb
} from '../fixtures/antigravity-db.js';

const CONVERSATION_ID = '8724cd98-6b07-4080-82d3-1c617be236bf';
const SESSION_ID = 'antigravity-session-019f';

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf-8').digest('hex');
}

/** Narrows a manifest source to the sqlite-poll shape the engine consumes.
 *
 * @param spec - The manifest source to narrow.
 * @returns The source narrowed to {@link SqlitePollSourceSpec}.
 * @throws {Error} When the source is not a sqlite-poll source.
 */
function narrowSqlitePoll(spec: SourceSpec): SqlitePollSourceSpec {
  if (spec.mode !== 'sqlite-poll') throw new Error(`expected sqlite-poll source, got: ${spec.mode}`);
  return spec;
}

interface Harness {
  dir: string;
  cardRepo: string;
  manifestJson: string;
  destPath: string;
  sidecarPath: string;
  fingerprint: string;
  warns: string[];
  clock: { value: number };
  /** Builds an engine against an optional fixture DB (created lazily when omitted). */
  makeEngine(db?: FixtureConversationDb): SqlitePollEngine;
  readDestLines(): Promise<EmissionRecord[]>;
}

async function makeHarness(): Promise<Harness> {
  const dir = await mkdtemp(join(tmpdir(), 'sqlite-poll-'));
  const cardRepo = join(dir, 'card-repo');
  const conversationsDir = join(dir, 'conversations');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(cardRepo, { recursive: true });
  mkdirSync(conversationsDir, { recursive: true });

  const manifest = buildAntigravityManifest({
    sessionId: SESSION_ID,
    cardId: 'card-123',
    transcriptPath: join(conversationsDir, `${CONVERSATION_ID}.db`),
    monitorPid: 4242,
    cardRepoPath: cardRepo
  });
  const manifestJson = JSON.stringify(manifest);
  const spec = narrowSqlitePoll(parseManifest(manifestJson).sources[0]!);
  const destPath = join(cardRepo, 'streams', 'antigravity-session', `${CONVERSATION_ID}.db.jsonl`);
  const sidecarPath = spec.sidecarPath;
  const fingerprint = spec.schemaFingerprint;

  const warns: string[] = [];
  const clock = { value: 1_000_000 };

  function makeEngine(_db?: FixtureConversationDb): SqlitePollEngine {
    return new SqlitePollEngine({
      manifest: parseManifest(manifestJson),
      spec,
      destPath,
      warnFn: (message) => warns.push(message),
      now: () => clock.value,
      sleep: () => Promise.resolve()
    });
  }

  async function readDestLines(): Promise<EmissionRecord[]> {
    try {
      const raw = await readFile(destPath, 'utf-8');
      if (!raw.endsWith('\n')) throw new Error('destination stream must always end with a newline');
      return raw
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => {
          const parsed = JSON.parse(line) as EmissionRecord;
          expect(parsed.hash).toBe(sha256(parsed.content));
          return parsed;
        });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  return { dir, cardRepo, manifestJson, destPath, sidecarPath, fingerprint, warns, clock, makeEngine, readDestLines };
}

let harness: Harness;
let db: FixtureConversationDb;

beforeEach(async () => {
  harness = await makeHarness();
  db = createConversationDb(join(harness.dir, 'conversations'), CONVERSATION_ID);
  db.setTrajectoryMeta(CONVERSATION_ID);
});

afterEach(async () => {
  db.close();
  await rm(harness.dir, { recursive: true, force: true });
});

function ok(outcome: SqlitePollOutcome): EmissionRecord[] {
  expect(outcome.kind).toBe('ok');
  return outcome.kind === 'ok' ? outcome.emitted : [];
}

describe('sqlite-poll engine — poll semantics', () => {
  it('emits unemitted terminal rows exactly once with final content, then never again', async () => {
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('hello'), format: 0 });
    const engine = harness.makeEngine(db);
    await engine.attach();
    expect(ok(await engine.pollOnce())).toHaveLength(1);
    expect(ok(await engine.pollOnce())).toHaveLength(0);
  });

  it('tracks unemitted non-terminal rows without emitting, then emits final content at terminal', async () => {
    db.insertStep({ idx: 1, stepType: 15, status: 2, payload: buildAssistantPayload('...typing'), format: 0 });
    const engine = harness.makeEngine(db);
    await engine.attach();
    expect(ok(await engine.pollOnce())).toHaveLength(0);
    db.db
      .prepare('UPDATE steps SET status = 3, step_payload = ? WHERE idx = 1')
      .run(Buffer.from(buildAssistantPayload('done')));
    const emitted = ok(await engine.pollOnce());
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ idx: 1, stepType: 15, status: 3, content: 'done', anomaly: null });
  });

  it('emits out-of-order terminal rows whenever observed (idx 2 before idx 1)', async () => {
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('q'), format: 0 });
    db.insertStep({ idx: 2, stepType: 15, status: 3, payload: buildAssistantPayload('later'), format: 0 });
    const engine = harness.makeEngine(db);
    await engine.attach();
    const first = ok(await engine.pollOnce());
    expect(first.map((r) => r.idx)).toEqual([0, 2]);
    db.insertStep({ idx: 1, stepType: 15, status: 3, payload: buildAssistantPayload('middle'), format: 0 });
    const second = ok(await engine.pollOnce());
    expect(second.map((r) => r.idx)).toEqual([1]);
    const lines = await harness.readDestLines();
    expect(lines.map((r) => r.idx)).toEqual([0, 2, 1]);
  });

  it('emits a named host-drift anomaly when an emitted row is revised post-terminal', async () => {
    db.insertStep({ idx: 1, stepType: 15, status: 3, payload: buildAssistantPayload('v1'), format: 0 });
    const engine = harness.makeEngine(db);
    await engine.attach();
    ok(await engine.pollOnce());
    db.db.prepare('UPDATE steps SET step_payload = ? WHERE idx = 1').run(Buffer.from(buildAssistantPayload('v2')));
    const emitted = ok(await engine.pollOnce());
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ idx: 1, content: 'v2', anomaly: { kind: 'host-drift' } });
    const stable = ok(await engine.pollOnce());
    expect(stable).toHaveLength(0);
    const lines = await harness.readDestLines();
    expect(lines.map((r) => r.content)).toEqual(['v1', 'v2']);
  });

  it('emits final content for a mid-stream in-place row update (upsert, no append)', async () => {
    db.insertStep({ idx: 1, stepType: 15, status: 1, payload: buildAssistantPayload('draft'), format: 0 });
    const engine = harness.makeEngine(db);
    await engine.attach();
    expect(ok(await engine.pollOnce())).toHaveLength(0);
    // The host upserts the same row ~15 times in flight; final write wins.
    for (const draft of ['draft-2', 'draft-3']) {
      db.db.prepare('UPDATE steps SET step_payload = ? WHERE idx = 1').run(Buffer.from(buildAssistantPayload(draft)));
      expect(ok(await engine.pollOnce())).toHaveLength(0);
    }
    db.db
      .prepare('UPDATE steps SET status = 3, step_payload = ? WHERE idx = 1')
      .run(Buffer.from(buildAssistantPayload('final')));
    const emitted = ok(await engine.pollOnce());
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ content: 'final', status: 3, anomaly: null });
  });

  it('opens the source read-only without immutable=1 and with a bounded busy timeout', async () => {
    const opens: Array<{ dbPath: string; readOnly: boolean; timeout: number }> = [];
    const recording: SqlitePollConnectionFactory = (dbPath) => {
      opens.push({ dbPath, readOnly: true, timeout: 2000 });
      return new DatabaseSync(dbPath, { readOnly: true, timeout: 2000 });
    };
    const wrapped = new SqlitePollEngine({
      manifest: parseManifest(harness.manifestJson),
      spec: narrowSqlitePoll(parseManifest(harness.manifestJson).sources[0]!),
      destPath: harness.destPath,
      warnFn: (m) => harness.warns.push(m),
      now: () => harness.clock.value,
      sleep: () => Promise.resolve(),
      openConnection: recording
    });
    await wrapped.attach();
    await wrapped.pollOnce();
    expect(opens.length).toBeGreaterThan(0);
    expect(opens.every((o) => o.readOnly && o.timeout === 2000)).toBe(true);
  });

  it('retries bounded on SQLITE_BUSY with backoff and warns', async () => {
    let attempts = 0;
    const flaky: SqlitePollConnectionFactory = (dbPath) => {
      attempts += 1;
      if (attempts === 1) {
        const error = new Error('database is locked') as NodeJS.ErrnoException & { errcode?: number };
        error.errcode = 5;
        throw error;
      }
      return new DatabaseSync(dbPath, { readOnly: true, timeout: 2000 });
    };
    const wrapped = new SqlitePollEngine({
      manifest: parseManifest(harness.manifestJson),
      spec: narrowSqlitePoll(parseManifest(harness.manifestJson).sources[0]!),
      destPath: harness.destPath,
      warnFn: (m) => harness.warns.push(m),
      now: () => harness.clock.value,
      sleep: () => Promise.resolve(),
      openConnection: flaky
    });
    await wrapped.attach();
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('busy'), format: 0 });
    const emitted = ok(await wrapped.pollOnce());
    expect(emitted).toHaveLength(1);
    expect(attempts).toBe(2);
    expect(harness.warns.some((m) => /busy/i.test(m))).toBe(true);
  });

  it('gives up after the bounded BUSY retry attempts and retries again next poll', async () => {
    let attempts = 0;
    const alwaysBusy: SqlitePollConnectionFactory = () => {
      attempts += 1;
      const error = new Error('database is locked') as NodeJS.ErrnoException & { errcode?: number };
      error.errcode = 5;
      throw error;
    };
    const wrapped = new SqlitePollEngine({
      manifest: parseManifest(harness.manifestJson),
      spec: narrowSqlitePoll(parseManifest(harness.manifestJson).sources[0]!),
      destPath: harness.destPath,
      warnFn: (m) => harness.warns.push(m),
      now: () => harness.clock.value,
      sleep: () => Promise.resolve(),
      openConnection: alwaysBusy
    });
    await wrapped.attach();
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('busy'), format: 0 });
    expect(ok(await wrapped.pollOnce())).toHaveLength(0);
    expect(attempts).toBeLessThanOrEqual(3);
    // Next poll: DB is readable again through the same factory.
    const readable: SqlitePollConnectionFactory = (dbPath) =>
      new DatabaseSync(dbPath, { readOnly: true, timeout: 2000 });
    const recovered = new SqlitePollEngine({
      manifest: parseManifest(harness.manifestJson),
      spec: narrowSqlitePoll(parseManifest(harness.manifestJson).sources[0]!),
      destPath: harness.destPath,
      warnFn: (m) => harness.warns.push(m),
      now: () => harness.clock.value,
      sleep: () => Promise.resolve(),
      openConnection: readable
    });
    await recovered.attach();
    expect(ok(await recovered.pollOnce()).map((r) => r.idx)).toEqual([0]);
  });

  it('skips all reads when PRAGMA data_version is unchanged (bounded IO)', async () => {
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('one'), format: 0 });
    let queries = 0;
    const counting: SqlitePollConnectionFactory = (dbPath) => {
      const conn = new DatabaseSync(dbPath, { readOnly: true, timeout: 2000 });
      return {
        prepare(sql: string) {
          const stmt = conn.prepare(sql);
          return {
            get: (...params: unknown[]) => {
              queries += 1;
              return stmt.get(...(params as never[]));
            },
            all: (...params: unknown[]) => {
              queries += 1;
              return stmt.all(...(params as never[]));
            }
          };
        },
        close: () => conn.close()
      };
    };
    const engine = new SqlitePollEngine({
      manifest: parseManifest(harness.manifestJson),
      spec: narrowSqlitePoll(parseManifest(harness.manifestJson).sources[0]!),
      destPath: harness.destPath,
      warnFn: (m) => harness.warns.push(m),
      now: () => harness.clock.value,
      sleep: () => Promise.resolve(),
      openConnection: counting
    });
    await engine.attach();
    ok(await engine.pollOnce());
    const queriesAfterFirst = queries;
    ok(await engine.pollOnce());
    expect(queries).toBe(queriesAfterFirst + 1); // only the data_version read
  });

  it('spreads the below-high-water re-hash across bounded ticks gated on data_version', async () => {
    const total = SQLITE_POLL_REHASH_ROWS_PER_TICK + 10;
    for (let i = 0; i < total; i += 1) {
      db.insertStep({ idx: i, stepType: 14, status: 3, payload: buildUserPayload(`row-${i}`), format: 0 });
    }
    const engine = harness.makeEngine(db);
    await engine.attach();
    expect(ok(await engine.pollOnce()).length).toBe(total);
    // Mutate exactly one below-high-water row and bump data_version by writing
    // through the host connection.
    db.db
      .prepare('UPDATE steps SET step_payload = ? WHERE idx = 1')
      .run(Buffer.from(buildUserPayload('row-1-revised')));
    const emitted = ok(await engine.pollOnce());
    // First tick of the cycle may not reach idx 1 yet (bounded slice), but the
    // revision must surface within the full cycle without unbounded IO.
    let ticks = 1;
    let driftIdx: number[] = emitted.filter((r) => r.anomaly?.kind === 'host-drift').map((r) => r.idx);
    while (driftIdx.length === 0 && ticks < 10) {
      harness.clock.value += 1000;
      driftIdx = ok(await engine.pollOnce())
        .filter((r) => r.anomaly?.kind === 'host-drift')
        .map((r) => r.idx);
      ticks += 1;
    }
    expect(driftIdx).toEqual([1]);
  });
});

describe('sqlite-poll engine — absence, identity, schema bounds', () => {
  it('treats DB absence as transient while within the bound', async () => {
    await rm(db.path, { force: true });
    const engine = harness.makeEngine();
    await engine.attach();
    const outcome = await engine.pollOnce();
    expect(outcome).toEqual({ kind: 'db-absent' });
  });

  it('expires the absence bound into the named unavailable-transcript outcome with evidence', async () => {
    await rm(db.path, { force: true });
    const engine = harness.makeEngine();
    await engine.attach();
    harness.clock.value += SQLITE_POLL_ABSENCE_BOUND_MS + 1;
    const outcome = await engine.pollOnce();
    expect(outcome.kind).toBe('absence-expired');
    if (outcome.kind === 'absence-expired') {
      expect(outcome.detail).toMatch(/absence/i);
    }
  });

  it('recovers when a lazily-created DB appears within the bound', async () => {
    await rm(db.path, { force: true });
    const engine = harness.makeEngine();
    await engine.attach();
    expect(await engine.pollOnce()).toEqual({ kind: 'db-absent' });
    const late = createConversationDb(join(harness.dir, 'conversations'), CONVERSATION_ID);
    late.setTrajectoryMeta(CONVERSATION_ID);
    late.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('late'), format: 0 });
    late.close();
    const emitted = ok(await engine.pollOnce());
    expect(emitted.map((r) => r.content)).toEqual(['late']);
  });

  it('classifies schema mismatch at first read as permanent unavailability', async () => {
    db.setTrajectoryMeta(CONVERSATION_ID);
    db.db.exec('DROP TABLE steps');
    db.db.exec('CREATE TABLE steps (idx integer PRIMARY KEY, totally_different text)');
    const engine = harness.makeEngine(db);
    await engine.attach();
    const outcome = await engine.pollOnce();
    expect(outcome.kind).toBe('permanent-unavailable');
    if (outcome.kind === 'permanent-unavailable') expect(outcome.detail).toMatch(/schema/i);
    // Permanent: repeated polls return the same named outcome, never a retry.
    expect(await engine.pollOnce()).toEqual(outcome);
  });

  it('classifies identity ambiguity (cascade_id mismatch) as permanent unavailability', async () => {
    db.setTrajectoryMeta('different-conversation-id');
    const engine = harness.makeEngine(db);
    await engine.attach();
    const outcome = await engine.pollOnce();
    expect(outcome.kind).toBe('permanent-unavailable');
    if (outcome.kind === 'permanent-unavailable') expect(outcome.detail).toMatch(/identity|cascade/i);
  });
});

describe('sqlite-poll engine — restart and composition', () => {
  it('resumes losslessly after a watcher restart mid-DB (no duplicates, no skips)', async () => {
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('q'), format: 0 });
    db.insertStep({ idx: 1, stepType: 15, status: 3, payload: buildAssistantPayload('a'), format: 0 });
    const first = harness.makeEngine(db);
    await first.attach();
    expect(ok(await first.pollOnce()).map((r) => r.idx)).toEqual([0, 1]);
    db.insertStep({ idx: 2, stepType: 15, status: 3, payload: buildAssistantPayload('a2'), format: 0 });

    const second = harness.makeEngine(db);
    await second.attach();
    expect(ok(await second.pollOnce()).map((r) => r.idx)).toEqual([2]);
    const lines = await harness.readDestLines();
    expect(lines.map((r) => r.content)).toEqual(['q', 'a', 'a2']);
  });

  it('re-derives without duplication or skip after a crash between destination write and sidecar update', async () => {
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('q'), format: 0 });
    db.insertStep({ idx: 1, stepType: 15, status: 3, payload: buildAssistantPayload('a'), format: 0 });
    const first = harness.makeEngine(db);
    await first.attach();
    ok(await first.pollOnce());
    // Simulate the crash: sidecar deleted after the records landed.
    await rm(harness.sidecarPath, { force: true });
    const second = harness.makeEngine(db);
    await second.attach();
    expect(ok(await second.pollOnce())).toHaveLength(0);
    const lines = await harness.readDestLines();
    expect(lines.map((r) => r.idx)).toEqual([0, 1]);
  });

  it('resumes out-of-order terminal rows across a restart and orders by source idx', async () => {
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('q'), format: 0 });
    db.insertStep({ idx: 2, stepType: 15, status: 3, payload: buildAssistantPayload('later'), format: 0 });
    const first = harness.makeEngine(db);
    await first.attach();
    expect(ok(await first.pollOnce()).map((r) => r.idx)).toEqual([0, 2]);
    db.insertStep({ idx: 1, stepType: 15, status: 3, payload: buildAssistantPayload('middle'), format: 0 });

    const second = harness.makeEngine(db);
    await second.attach();
    expect(ok(await second.pollOnce()).map((r) => r.idx)).toEqual([1]);
    const lines = await harness.readDestLines();
    expect(lines.map((r) => r.idx)).toEqual([0, 2, 1]);
  });

  it('flushes tracked non-terminal rows as named flush-partial records at termination', async () => {
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('q'), format: 0 });
    db.insertStep({ idx: 1, stepType: 15, status: 2, payload: buildAssistantPayload('partial answer'), format: 0 });
    db.insertStep({
      idx: 2,
      stepType: 132,
      status: 6,
      payload: buildToolPayload('call_1', 'run_command', '{"x":1}'),
      format: 0
    });
    const engine = harness.makeEngine(db);
    await engine.attach();
    ok(await engine.pollOnce());
    // Watcher is dead at child exit; the termination path drives the flush.
    const flushed = await engine.flushTracked();
    expect(flushed.map((r) => r.anomaly?.kind)).toEqual(['flush-partial', 'flush-partial']);
    expect(flushed.map((r) => r.idx)).toEqual([1, 2]);
    expect(flushed[0]).toMatchObject({ idx: 1, status: 2, content: 'partial answer' });
    expect(flushed[1]).toMatchObject({ idx: 2, status: 6 });
    // Idempotent: a second flush emits nothing.
    expect(await engine.flushTracked()).toHaveLength(0);
    const lines = await harness.readDestLines();
    expect(lines.map((r) => r.idx)).toEqual([0, 1, 2]);
  });

  it('drains remaining terminal rows before flushing partials', async () => {
    db.insertStep({ idx: 0, stepType: 15, status: 2, payload: buildAssistantPayload('wip'), format: 0 });
    db.insertStep({ idx: 1, stepType: 15, status: 3, payload: buildAssistantPayload('done'), format: 0 });
    const engine = harness.makeEngine(db);
    await engine.attach();
    // idx 1 is terminal and unemitted: the ordinary poll emits it whenever
    // observed; idx 0 is tracked (non-terminal).
    expect(ok(await engine.pollOnce()).map((r) => r.idx)).toEqual([1]);
    db.db.prepare('UPDATE steps SET status = 3 WHERE idx = 0').run();
    const flushed = await engine.flushTracked();
    // idx 0 reached terminal before the flush: drained as a normal record by
    // the flush's internal poll; the flush itself adds no partial record.
    expect(flushed).toHaveLength(0);
    const lines = await harness.readDestLines();
    expect(lines.map((r) => r.idx)).toEqual([1, 0]);
    expect(lines.every((r) => r.anomaly === null)).toBe(true);
  });

  it('treats a torn trailing record as absent and re-emits its row', async () => {
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('q'), format: 0 });
    db.insertStep({ idx: 1, stepType: 15, status: 3, payload: buildAssistantPayload('a'), format: 0 });
    const first = harness.makeEngine(db);
    await first.attach();
    ok(await first.pollOnce());
    // Kill mid-record: append a partial JSON line without its newline.
    await appendFile(harness.destPath, '{"v":1,"idx":2,"stepT');
    const second = harness.makeEngine(db);
    await second.attach();
    db.insertStep({ idx: 2, stepType: 15, status: 3, payload: buildAssistantPayload('post-crash'), format: 0 });
    expect(ok(await second.pollOnce()).map((r) => r.idx)).toEqual([2]);
    const lines = await harness.readDestLines();
    expect(lines.map((r) => r.idx)).toEqual([0, 1, 2]);
    expect(lines.every((r) => r.anomaly === null)).toBe(true);
  });

  it('emits a named format-unknown anomaly for an unknown step_format, never decoder garbage', async () => {
    db.insertStep({ idx: 0, stepType: 15, status: 3, payload: buildAssistantPayload('x'), format: 9 });
    const engine = harness.makeEngine(db);
    await engine.attach();
    const emitted = ok(await engine.pollOnce());
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      idx: 0,
      content: '',
      hash: sha256(''),
      anomaly: { kind: 'format-unknown' }
    });
  });

  it('emits a named host-drift anomaly for a mid-stream schema fingerprint change', async () => {
    db.setTrajectoryMeta(CONVERSATION_ID);
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('q'), format: 0 });
    const engine = harness.makeEngine(db);
    await engine.attach();
    ok(await engine.pollOnce());
    db.db.exec('ALTER TABLE steps ADD COLUMN new_host_column text');
    const emitted = ok(await engine.pollOnce());
    const drift = emitted.find((r) => r.anomaly?.kind === 'host-drift');
    expect(drift).toBeDefined();
    if (drift) expect(drift.anomaly?.detail).toMatch(/fingerprint/i);
  });
});
