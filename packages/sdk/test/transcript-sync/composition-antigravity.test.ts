/**
 * End-to-end composition fixture for the Antigravity session-identity
 * carrier, per plan Phase 5 step 2c: env export → hook registration (real
 * unbound-candidate store) → all three resolvers → parseManifest on the
 * produced manifest → watcher attach against a fixture conversation DB →
 * records emitted. Uses the real contract surfaces throughout; only the
 * detached watcher process boundary is composed as the engine the watcher
 * drives (the control-socket process itself is covered by the watcher's own
 * suites).
 *
 * @summary Antigravity carrier composition tests
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveRuntime, resolveSessionId, resolveTranscriptPath } from '../../src/session-resolver.js';
import { buildManifestForRuntime } from '../../src/transcript-sync/adapters/index.js';
import { SqlitePollEngine } from '../../src/transcript-sync/engine/sqlite-poll.js';
import type { SourceSpec, SqlitePollSourceSpec } from '../../src/transcript-sync/manifest.js';
import { parseManifest } from '../../src/transcript-sync/manifest.js';
import type { EmissionRecord } from '../../src/transcript-sync/records.js';
import { addUnboundCandidate } from '../../src/unboundWorktreeCandidates.js';
import {
  buildAssistantPayload,
  buildUserPayload,
  createConversationDb,
  type FixtureConversationDb
} from './fixtures/antigravity-db.js';

const CONVERSATION_ID = '8724cd98-6b07-4080-82d3-1c617be236bf';
const SESSION_ID = 'antigravity-session-019f-e2e';

/**
 * Every identity-bearing variable the resolver chain consults. The runtime
 * vars of OTHER agents must be cleared too: the suite may itself run inside a
 * Claude Code / Codex / OpenCode session whose variable precedes
 * `ANTIGRAVITY_SESSION_ID` in the chain and would otherwise win.
 */
const ENV_VARS = [
  'ANTIGRAVITY_SESSION_ID',
  'CARDS_SESSION_ID',
  'CARDS_TRANSCRIPT_PATH',
  'CLAUDE_CODE_SESSION_ID',
  'CODEX_THREAD_ID',
  'OPENCODE_RUN_ID',
  'CURSOR_TRACE_ID'
] as const;

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

describe('antigravity carrier composition', () => {
  let dir: string;
  let cardsHome: string;
  let worktreeDir: string;
  let db: FixtureConversationDb;
  let savedEnv: Partial<Record<string, string | undefined>>;
  let savedCardsHome: string | undefined;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agy-composition-'));
    cardsHome = join(dir, 'cards-home');
    worktreeDir = join(dir, 'worktree');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(cardsHome, { recursive: true });
    mkdirSync(worktreeDir, { recursive: true });
    mkdirSync(join(dir, 'conversations'), { recursive: true });
    savedEnv = {};
    for (const name of ENV_VARS) {
      savedEnv[name] = process.env[name];
      delete process.env[name];
    }
    savedCardsHome = process.env['CARDS_HOME'];
    process.env['CARDS_HOME'] = cardsHome;
    process.env['ANTIGRAVITY_SESSION_ID'] = SESSION_ID;
    db = createConversationDb(join(dir, 'conversations'), CONVERSATION_ID);
    db.setTrajectoryMeta(CONVERSATION_ID);

    // (a) env export happened pre-spawn (simulated above); (b) the PreInvocation
    // hook registers the mapping in the real on-disk store; the transcript path
    // is the canonical conversation DB path even though the file may not exist
    // yet at registration time.
    await addUnboundCandidate(SESSION_ID, worktreeDir, db.path);
  });

  afterEach(async () => {
    db.close();
    for (const name of ENV_VARS) {
      if (savedEnv[name] === undefined) delete process.env[name];
      else process.env[name] = savedEnv[name]!;
    }
    if (savedCardsHome === undefined) delete process.env['CARDS_HOME'];
    else process.env['CARDS_HOME'] = savedCardsHome;
    await rm(dir, { recursive: true, force: true });
  });

  it('resolves identity, manifest, and records through the real contract chain', async () => {
    // All three resolvers, against real env + real store.
    expect(await resolveSessionId()).toBe(SESSION_ID);
    expect(await resolveRuntime()).toBe('antigravity');
    const transcriptPath = await resolveTranscriptPath(SESSION_ID, worktreeDir);
    expect(transcriptPath).toBe(db.path);

    // The adapter the watcher attach path builds, parsed through the real
    // validator (fails under the broken hypothesis rather than passing on a
    // hand-constructed manifest object).
    const manifest = buildManifestForRuntime((await resolveRuntime()) ?? '', {
      sessionId: (await resolveSessionId())!,
      cardId: 'card-123',
      transcriptPath,
      monitorPid: 4242,
      cardRepoPath: join(dir, 'card-repo')
    });
    const parsed = parseManifest(JSON.stringify(manifest));
    expect(parsed.version).toBe(2);
    expect(parsed.sources[0]).toMatchObject({ mode: 'sqlite-poll', conversationId: CONVERSATION_ID });

    // Watcher attach against the fixture DB: attach, poll, records emitted.
    const destPath = join(dir, 'card-repo', 'streams', 'antigravity-session', `${CONVERSATION_ID}.db.jsonl`);
    const engine = new SqlitePollEngine({
      manifest: parsed,
      spec: narrowSqlitePoll(parsed.sources[0]!),
      destPath,
      warnFn: () => {},
      now: () => Date.now(),
      sleep: () => Promise.resolve()
    });
    await engine.attach();
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('compose me'), format: 0 });
    db.insertStep({ idx: 1, stepType: 15, status: 3, payload: buildAssistantPayload('composed'), format: 0 });
    const outcome = await engine.pollOnce();
    expect(outcome.kind).toBe('ok');
    const emitted = outcome.kind === 'ok' ? outcome.emitted : [];
    expect(emitted.map((r) => r.content)).toEqual(['compose me', 'composed']);

    const destination = await import('node:fs/promises').then((fs) => fs.readFile(destPath, 'utf-8'));
    const lines = destination
      .split('\n')
      .filter((l) => l.length > 0)
      .map((l) => JSON.parse(l) as EmissionRecord);
    expect(lines.map((r) => r.idx)).toEqual([0, 1]);
  });

  it('flushes through the termination path when the watcher is dead at child exit', async () => {
    const transcriptPath = await resolveTranscriptPath(SESSION_ID, worktreeDir);
    const manifest = buildManifestForRuntime('antigravity', {
      sessionId: SESSION_ID,
      cardId: 'card-123',
      transcriptPath,
      monitorPid: 4242,
      cardRepoPath: join(dir, 'card-repo')
    });
    const parsed = parseManifest(JSON.stringify(manifest));
    const destPath = join(dir, 'card-repo', 'streams', 'antigravity-session', `${CONVERSATION_ID}.db.jsonl`);
    const engine = new SqlitePollEngine({
      manifest: parsed,
      spec: narrowSqlitePoll(parsed.sources[0]!),
      destPath,
      warnFn: () => {},
      now: () => Date.now(),
      sleep: () => Promise.resolve()
    });
    await engine.attach();
    db.insertStep({ idx: 0, stepType: 14, status: 3, payload: buildUserPayload('q'), format: 0 });
    await engine.pollOnce();
    db.insertStep({ idx: 1, stepType: 15, status: 2, payload: buildAssistantPayload('in flight'), format: 0 });

    // The watcher died before seeing idx 1; a fresh engine attaches for the
    // final drain (termination module path) and flushes the partial row.
    const fresh = new SqlitePollEngine({
      manifest: parsed,
      spec: narrowSqlitePoll(parsed.sources[0]!),
      destPath,
      warnFn: () => {},
      now: () => Date.now(),
      sleep: () => Promise.resolve()
    });
    await fresh.attach();
    const flushed = await fresh.flushTracked();
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toMatchObject({ idx: 1, status: 2, anomaly: { kind: 'flush-partial' } });
  });
});
