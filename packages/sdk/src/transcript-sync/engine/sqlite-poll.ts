/**
 * Read-only polling engine for SQLite conversation sources (`mode:
 * 'sqlite-poll'`).
 *
 * The host agent owns the database (WAL mode, written live); this engine only
 * ever opens it read-only (`node:sqlite`, same-user `mode=ro`, never
 * `immutable=1`) and derives emission records from row state — the
 * destination stream is the durable emission authority, the sidecar is a
 * rebuildable cache re-derived by scanning the destination on attach. The
 * full semantics (per-row emission state, bounded BUSY handling, the
 * `data_version`-gated re-hash cycle, absence/identity/schema bounds, named
 * anomalies) are pinned by the card plan, Phase 5 step 2c, and witnessed in
 * notes/agy-live-witnesses.md.
 *
 * @summary sqlite-poll engine contract (read-only row-state emission)
 * @module
 */

import { appendFile, mkdir, open, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { computeSchemaFingerprint } from '../adapters/antigravity.js';
import { decodeStepForRuntime } from '../adapters/index.js';
import type { SessionSyncManifest, SqlitePollSourceSpec } from '../manifest.js';
import {
  contentHash,
  EMISSION_RECORD_VERSION,
  type EmissionAnomaly,
  type EmissionRecord,
  parseEmissionRecordLine,
  type StepRow,
  serializeEmissionRecord
} from '../records.js';

/** Poll cadence once the DB is attached (bounded; every tick is a cheap ro read). */
export const SQLITE_POLL_STEADY_INTERVAL_MS = 1_000;

/**
 * How long the engine keeps polling for the conversation DB to appear before
 * declaring the named `unavailable-transcript` (absence-expiry) outcome. The
 * live witness shows the DB is created within the child's first turn;
 * interactive attach timing is unverified, so absence is transient until this
 * bound expires.
 */
export const SQLITE_POLL_ABSENCE_BOUND_MS = 10 * 60_000;

/** SQLite busy timeout passed to every read-only connection, in milliseconds. */
export const SQLITE_POLL_BUSY_TIMEOUT_MS = 2_000;

/** Bounded retry attempts (with backoff) around a poll whose reads hit SQLITE_BUSY. */
export const SQLITE_POLL_BUSY_RETRY_ATTEMPTS = 3;

/**
 * Maximum number of below-high-water rows re-hashed per tick in the
 * `data_version`-gated re-hash cycle, bounding IO against the live WAL writer
 * while still completing a full drift re-check within a bounded period.
 */
export const SQLITE_POLL_REHASH_ROWS_PER_TICK = 64;

/**
 * The `steps.status` value that marks a row terminal (witnessed: completed
 * rows reach status 3; observed non-terminal values 6/7 and any unseen value
 * are treated as non-terminal — tracked, then flushed as named-partial at
 * termination, never emitted as final content).
 */
export const SQLITE_POLL_TERMINAL_STATUS = 3;

/** Minimal read-only connection surface the engine needs. */
export interface SqlitePollConnection {
  /** Prepares a statement; positional params only. */
  prepare(sql: string): {
    /** Returns the first row (null-prototype object or null). */
    get(...params: unknown[]): unknown;
    /** Returns all rows. */
    all(...params: unknown[]): unknown[];
  };
  /** Closes the connection. */
  close(): void;
}

/**
 * Opens a read-only connection to the conversation DB. The default
 * implementation uses `node:sqlite` with `{ readOnly: true }` and a bounded
 * busy timeout — same-user `mode=ro`, never `immutable=1`. Tests inject
 * fakes/counts through this seam.
 */
export type SqlitePollConnectionFactory = (dbPath: string) => SqlitePollConnection;

/** Per-idx emission state, as persisted in the sidecar and held in memory. */
interface EmissionEntry {
  /** Hash of the content at last emission (terminal, drift, partial, or anomaly). */
  hash: string;
  /** Status observed at last emission. */
  status: number;
}

/** Sidecar file shape. Presence of an entry means that (idx, hash) was emitted. */
interface EmissionSidecar {
  v: 1;
  entries: Record<string, EmissionEntry>;
}

/**
 * Default read-only connection factory: `node:sqlite` opened `readOnly` with
 * the bounded busy timeout — same-user `mode=ro`, never `immutable=1` (the
 * DB is WAL-mode and written live by the host; `immutable` on a changed file
 * is undefined behavior that can hide appended rows forever).
 *
 * @param dbPath - Absolute path of the conversation DB.
 * @returns The read-only connection.
 */
function openReadOnly(dbPath: string): SqlitePollConnection {
  const db = new DatabaseSync(dbPath, { readOnly: true, timeout: SQLITE_POLL_BUSY_TIMEOUT_MS });
  return {
    prepare(sql: string) {
      const stmt = db.prepare(sql);
      return {
        get: (...params: unknown[]) => stmt.get(...(params as never[])),
        all: (...params: unknown[]) => stmt.all(...(params as never[]))
      };
    },
    close: () => db.close()
  };
}

function isBusyError(error: unknown): boolean {
  const err = error as { errcode?: number; message?: string };
  return err.errcode === 5 || /database is locked|database table is locked/i.test(err.message ?? '');
}

const SELECT_ALL_COLUMNS = 'idx, step_type, status, step_payload, step_format';

function rowToStepRow(row: unknown): StepRow {
  const r = row as Record<string, unknown>;
  return {
    idx: r['idx'] as number,
    stepType: r['step_type'] as number,
    status: r['status'] as number,
    payload: r['step_payload'] === null ? null : new Uint8Array(r['step_payload'] as Buffer),
    format: r['step_format'] as number
  };
}

/**
 * Dependencies for the sqlite-poll engine. The composition root (the
 * detached watcher) supplies real filesystem/clock implementations; tests
 * supply deterministic fakes.
 */
export interface SqlitePollDeps {
  /** The session manifest this engine polls for. */
  manifest: SessionSyncManifest;
  /** The manifest's single `sqlite-poll` main source. */
  spec: SqlitePollSourceSpec;
  /** Absolute path of the destination stream file (one JSON record per line). */
  destPath: string;
  /**
   * Called with a message for recoverable (non-terminal) conditions — busy
   * retries, transient absence ticks.
   */
  warnFn: (message: string) => void;
  /** Epoch clock, injectable for deterministic bounds in tests. */
  now: () => number;
  /** Sleeper, injectable for deterministic backoff in tests. */
  sleep: (ms: number) => Promise<void>;
  /** Read-only connection factory; defaults to the `node:sqlite` implementation. */
  openConnection?: SqlitePollConnectionFactory;
}

/**
 * The outcome of one engine operation. `pollOnce` produces one of these per
 * tick; the composition root maps them onto watcher events:
 *
 * - `ok` — the poll ran; `emitted` records were appended (possibly none).
 * - `db-absent` — transient: the DB does not exist yet; keep polling until
 *   {@link SQLITE_POLL_ABSENCE_BOUND_MS} expires since attach.
 * - `absence-expired` — named terminal outcome: the DB never appeared within
 *   the bound (PreInvocation never registered, child died before first turn).
 *   Never a hang or silent vanish.
 * - `permanent-unavailable` — named terminal outcome: schema mismatch or
 *   identity ambiguity at first read. Never retried.
 */
export type SqlitePollOutcome =
  | { kind: 'ok'; emitted: EmissionRecord[] }
  | { kind: 'db-absent' }
  | { kind: 'absence-expired'; detail: string }
  | { kind: 'permanent-unavailable'; detail: string };

/** Named result of the single final poll plus non-terminal evidence flush. */
export type SqlitePollFlushOutcome =
  | { kind: 'flushed'; records: EmissionRecord[]; partial: number }
  | {
      kind: 'degraded';
      reason: 'db-absent' | 'absence-expired' | 'permanent-unavailable' | 'poll-failed';
      detail: string;
    };

/**
 * The sqlite-poll engine for one session's conversation DB.
 *
 * Lifecycle: {@link attach} once (rebuilds the emission sidecar from the
 * destination stream, truncating any torn trailing record so torn bytes are
 * never surfaced), then {@link pollOnce} per tick, then {@link flushTracked}
 * once at termination (Stop-drain/session cleanup — the termination module
 * calls this even when the watcher process itself died and a fresh instance
 * was attached for the final drain).
 */
export class SqlitePollEngine {
  private readonly entries = new Map<number, EmissionEntry>();
  private readonly dbPath: string;
  private highWater = -1;
  private attachedAt = 0;
  private absenceSince: number | null = null;
  private lastDataVersion: number | null = null;
  private identityVerified = false;
  /** Ordinal SQL OFFSET into the current idx-ordered rehash cycle. */
  private rehashOffset = 0;
  private cycleComplete = true;
  private permanentDetail: string | null = null;
  private lastEmittedSchemaFingerprint: string | null = null;
  private connection: SqlitePollConnection | null = null;

  constructor(private readonly deps: SqlitePollDeps) {
    this.dbPath = join(deps.manifest.watchRoot, deps.spec.pattern);
  }

  /**
   * Attaches to the destination: rebuilds the per-idx emission state by
   * scanning the destination stream (last record per `idx` wins), truncating
   * a torn trailing record (no trailing newline / unparseable tail) so it is
   * treated absent and its row stays eligible for re-emit. Does not touch the
   * source DB — the DB may not exist yet.
   */
  async attach(): Promise<void> {
    this.attachedAt = this.deps.now();
    this.entries.clear();
    this.highWater = -1;
    this.absenceSince = null;
    this.lastDataVersion = null;
    this.identityVerified = false;
    this.rehashOffset = 0;
    this.cycleComplete = true;
    this.permanentDetail = null;
    this.lastEmittedSchemaFingerprint = null;
    this.connection = null;

    // Rebuild the sidecar from the destination stream: last record per idx
    // wins. A torn trailing record (no trailing newline / unparseable tail)
    // is truncated away first — treated absent, never surfaced, its row stays
    // eligible for re-emit.
    let raw: string;
    try {
      raw = await readFile(this.deps.destPath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.writeSidecar();
        return;
      }
      throw error;
    }

    const complete = raw.endsWith('\n') ? raw : raw.slice(0, raw.lastIndexOf('\n') + 1);
    if (complete.length !== raw.length) {
      const handle = await open(this.deps.destPath, 'r+');
      try {
        await handle.truncate(complete.length);
      } finally {
        await handle.close();
      }
    }

    for (const line of complete.split('\n')) {
      if (line.length === 0) continue;
      const record = parseEmissionRecordLine(line);
      if (record === null) continue;
      this.entries.set(record.idx, { hash: record.hash, status: record.status });
    }
    for (const idx of this.entries.keys()) {
      if (idx > this.highWater) this.highWater = idx;
    }
    await this.writeSidecar();
  }

  /**
   * Runs one bounded poll: opens the DB read-only (same-user `mode=ro`,
   * bounded busy timeout, bounded retry/backoff), verifies the schema
   * fingerprint and conversation identity (first read), reads new rows above
   * the high-water `idx`, plus the bounded `data_version`-gated slice of the
   * below-high-water re-hash cycle, and appends derived emission records —
   * single newline-complete record append before any sidecar write.
   *
   * DB absence is transient (`db-absent`) until the attach-time bound expires
   * (`absence-expired`); schema mismatch or identity ambiguity is
   * `permanent-unavailable`.
   *
   * @returns The poll outcome — emitted records or the named terminal state.
   */
  async pollOnce(): Promise<SqlitePollOutcome> {
    if (this.permanentDetail !== null) {
      return { kind: 'permanent-unavailable', detail: this.permanentDetail };
    }

    let dbSize: number;
    try {
      dbSize = (await stat(this.dbPath)).size;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      // The absence window starts at attach — the engine has been looking
      // for the DB since it attached, so bound expiry is measured from there.
      if (this.absenceSince === null) this.absenceSince = this.attachedAt;
      const elapsed = this.deps.now() - this.absenceSince;
      if (elapsed > SQLITE_POLL_ABSENCE_BOUND_MS) {
        return {
          kind: 'absence-expired',
          detail: `unavailable-transcript: conversation DB "${this.dbPath}" never appeared within the ${String(SQLITE_POLL_ABSENCE_BOUND_MS)}ms bound (absence window ${String(elapsed)}ms, attach at epoch ${String(this.attachedAt)}; PreInvocation may never have registered or the child died before its first turn)`
        };
      }
      return { kind: 'db-absent' };
    }
    void dbSize;
    this.absenceSince = null;

    // One persistent read-only connection serves every poll: PRAGMA
    // data_version only advances across commits when the READER persists, so
    // the change signal requires holding the connection open. The connection
    // is discarded on any non-busy error — e.g. the DB file being replaced —
    // and re-opened on the next poll.
    let lastBusyError: unknown = null;
    for (let attempt = 0; attempt < SQLITE_POLL_BUSY_RETRY_ATTEMPTS; attempt += 1) {
      if (attempt > 0) {
        this.deps.warnFn(
          `sqlite-poll: busy on ${this.dbPath} (attempt ${String(attempt + 1)}/${String(SQLITE_POLL_BUSY_RETRY_ATTEMPTS)}), backing off`
        );
        await this.deps.sleep(50 * 2 ** (attempt - 1));
      }
      try {
        if (this.connection === null) {
          this.connection = (this.deps.openConnection ?? openReadOnly)(this.dbPath);
        }
        const emitted = await this.pollWithConnection(this.connection);
        return { kind: 'ok', emitted };
      } catch (error) {
        if (this.permanentDetail !== null) {
          return { kind: 'permanent-unavailable', detail: this.permanentDetail };
        }
        if (isBusyError(error)) {
          lastBusyError = error;
          continue;
        }
        this.closeConnection();
        this.deps.warnFn(
          `sqlite-poll: read pass failed transiently: ${error instanceof Error ? error.message : String(error)}`
        );
        return { kind: 'ok', emitted: [] };
      }
    }
    void lastBusyError;
    return { kind: 'ok', emitted: [] };
  }

  /** Closes and forgets the persistent read-only connection, if open. */
  private closeConnection(): void {
    try {
      this.connection?.close();
    } catch {
      // Closing a broken connection must not mask the original error.
    }
    this.connection = null;
  }

  private async pollWithConnection(connection: SqlitePollConnection): Promise<EmissionRecord[]> {
    // Cost bound: the DB's change signal gates every read beyond the probe.
    // Each data_version advance (re)starts the below-high-water re-hash cycle
    // from the lowest idx; the started cycle then completes across ticks even
    // if no further advance occurs, so the final content of a quiet session
    // is always re-verified. A poll with no advance and a completed cycle is
    // a single-query no-op.
    const dataVersion = this.readDataVersion(connection);
    if (this.lastDataVersion !== null && dataVersion === this.lastDataVersion && this.cycleComplete) {
      return [];
    }
    if (dataVersion !== this.lastDataVersion) {
      this.rehashOffset = 0;
      this.cycleComplete = false;
    }
    this.lastDataVersion = dataVersion;

    // Schema fingerprint + identity verification. First read: mismatch is
    // permanent unavailability. Later reads: a changed fingerprint is a named
    // host-drift anomaly record (the DB mutated mid-stream).
    const fingerprint = this.computeDbFingerprint(connection);
    if (!this.identityVerified) {
      if (fingerprint === null) {
        this.permanentDetail = `permanent-unavailable: required tables missing at first read for "${this.dbPath}" (expected the pinned steps/trajectory_meta schema)`;
        throw new Error(this.permanentDetail);
      }
      if (fingerprint !== this.deps.spec.schemaFingerprint) {
        this.permanentDetail = `permanent-unavailable: schema fingerprint mismatch at first read for "${this.dbPath}" (expected ${this.deps.spec.schemaFingerprint.slice(0, 12)}…, got ${fingerprint.slice(0, 12)}…)`;
        throw new Error(this.permanentDetail);
      }
      const cascades = connection.prepare('SELECT DISTINCT cascade_id FROM trajectory_meta').all() as Array<
        Record<string, unknown>
      >;
      const cascadeIds = new Set(cascades.map((row) => String(row['cascade_id'])));
      if (cascadeIds.size !== 1 || !cascadeIds.has(this.deps.spec.conversationId)) {
        this.permanentDetail = `permanent-unavailable: identity ambiguity for "${this.dbPath}" (expected cascade_id ${this.deps.spec.conversationId}, found [${[...cascadeIds].join(', ')}])`;
        throw new Error(this.permanentDetail);
      }
      this.identityVerified = true;
      this.lastEmittedSchemaFingerprint = fingerprint;
    } else if (fingerprint === null || fingerprint !== this.deps.spec.schemaFingerprint) {
      const emitted = await this.emitSchemaDrift(
        this.lastEmittedSchemaFingerprint ?? 'unknown',
        fingerprint ?? 'missing-tables'
      );
      this.lastEmittedSchemaFingerprint = fingerprint;
      if (emitted.length > 0) return emitted;
    }

    const emitted: EmissionRecord[] = [];

    // New rows above the high-water idx.
    const newRows = (
      connection
        .prepare(`SELECT ${SELECT_ALL_COLUMNS} FROM steps WHERE idx > ? ORDER BY idx`)
        .all(this.highWater) as unknown[]
    ).map(rowToStepRow);
    for (const row of newRows) {
      if (row.idx > this.highWater) this.highWater = row.idx;
      const record = this.deriveRecord(row);
      if (record !== null) {
        emitted.push(record);
      }
    }

    // Bounded tick slice of the below-high-water re-hash cycle — the
    // post-terminal-drift guarantee is structurally reachable only through
    // this re-read.
    if (this.highWater >= 0 && !this.cycleComplete) {
      const slice = (
        connection
          .prepare(`SELECT ${SELECT_ALL_COLUMNS} FROM steps WHERE idx <= ? ORDER BY idx LIMIT ? OFFSET ?`)
          .all(this.highWater, SQLITE_POLL_REHASH_ROWS_PER_TICK, this.rehashOffset) as unknown[]
      ).map(rowToStepRow);
      for (const row of slice) {
        const record = this.deriveRecord(row);
        if (record !== null) {
          emitted.push(record);
        }
      }
      if (slice.length === 0) {
        this.cycleComplete = true;
      } else {
        const lastIdx = slice[slice.length - 1]!.idx;
        if (lastIdx >= this.highWater) {
          this.cycleComplete = true;
          this.rehashOffset = 0;
        } else {
          this.rehashOffset += slice.length;
        }
      }
    }

    if (emitted.length > 0) {
      await this.appendRecords(emitted);
    }
    return emitted;
  }

  /**
   * Reads `PRAGMA data_version` — the DB's change signal.
   *
   * @param connection - The open read-only connection.
   * @returns The current data_version counter value.
   */
  private readDataVersion(connection: SqlitePollConnection): number {
    const row = connection.prepare('PRAGMA data_version').get() as Record<string, unknown> | null;
    return Number(row?.['data_version'] ?? 0);
  }

  /**
   * Computes the DB's actual schema fingerprint over the required tables.
   *
   * @param connection - The open read-only connection.
   * @returns The lowercase hex SHA-256 of the normalized DDL, or `null` when a
   *   required table is missing (schema mismatch).
   */
  private computeDbFingerprint(connection: SqlitePollConnection): string | null {
    const rows = connection
      .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name IN ('steps', 'trajectory_meta')")
      .all() as Array<Record<string, unknown>>;
    const byName = new Map(rows.map((row) => [String(row['name']), String(row['sql'] ?? '')]));
    const steps = byName.get('steps');
    const trajectoryMeta = byName.get('trajectory_meta');
    if (steps === undefined || trajectoryMeta === undefined) {
      return null;
    }
    return computeSchemaFingerprint([steps, trajectoryMeta]);
  }

  /**
   * Per-row emission state machine. Returns the record to emit for this row,
   * or `null` when nothing is due (tracked, or already emitted unchanged).
   *
   * @param row - The source row to derive emission state from.
   * @returns The record to append, or `null` when nothing is due.
   */
  private deriveRecord(row: StepRow): EmissionRecord | null {
    const entry = this.entries.get(row.idx);
    const decode = decodeStepForRuntime(this.deps.manifest.runtime, row);
    if (decode.kind === 'anomaly') {
      if (entry !== undefined) return null;
      const record = this.buildRecord(row, '', { kind: 'format-unknown', detail: decode.detail });
      this.entries.set(row.idx, { hash: record.hash, status: record.status });
      return record;
    }
    const hash = contentHash(decode.content);
    if (row.status === SQLITE_POLL_TERMINAL_STATUS) {
      if (entry !== undefined && entry.hash === hash) return null;
      const anomaly: EmissionAnomaly | null =
        entry !== undefined
          ? {
              kind: 'host-drift',
              detail: `content hash changed for idx ${String(row.idx)} (was ${entry.hash.slice(0, 12)}…, now ${hash.slice(0, 12)}…)`
            }
          : null;
      const record = this.buildRecord(row, decode.content, anomaly);
      this.entries.set(row.idx, { hash: record.hash, status: record.status });
      return record;
    }
    // Non-terminal: tracked (durable-sidecar-derived — an unemitted
    // non-terminal row has no entry, so a restart re-derives it); emit nothing.
    return null;
  }

  private buildRecord(row: StepRow, content: string, anomaly: EmissionAnomaly | null): EmissionRecord {
    return {
      v: EMISSION_RECORD_VERSION,
      idx: row.idx,
      stepType: row.stepType,
      status: row.status,
      content,
      hash: contentHash(content),
      anomaly
    };
  }

  private async emitSchemaDrift(previous: string, current: string): Promise<EmissionRecord[]> {
    if (previous === current) return [];
    const detail = `schema fingerprint changed mid-stream for "${this.dbPath}" (was ${previous.slice(0, 12)}…, now ${current.slice(0, 12)}…) — host drift, decoding continues only while the witnessed columns persist`;
    const record: EmissionRecord = {
      v: EMISSION_RECORD_VERSION,
      idx: -1,
      stepType: -1,
      status: -1,
      content: detail,
      hash: contentHash(detail),
      anomaly: { kind: 'host-drift', detail }
    };
    await this.appendRecords([record]);
    return [record];
  }

  /**
   * Single newline-complete record appends (destination first), then sidecar.
   *
   * @param records - The records to append, in emission order.
   */
  private async appendRecords(records: EmissionRecord[]): Promise<void> {
    for (const record of records) {
      await appendFile(this.deps.destPath, serializeEmissionRecord(record), { flag: 'a' });
      this.entries.set(record.idx, { hash: record.hash, status: record.status });
    }
    await this.writeSidecar();
  }

  /**
   * Writes the sidecar atomically (temp file + rename).
   */
  private async writeSidecar(): Promise<void> {
    const entries: Record<string, EmissionEntry> = {};
    for (const idx of [...this.entries.keys()].sort((a, b) => a - b)) {
      entries[String(idx)] = this.entries.get(idx)!;
    }
    const sidecar: EmissionSidecar = { v: 1, entries };
    const body = JSON.stringify(sidecar, null, 2);
    const tmp = `${this.deps.spec.sidecarPath}.tmp`;
    await mkdir(dirname(this.deps.spec.sidecarPath), { recursive: true });
    await writeFile(tmp, body, 'utf-8');
    await rename(tmp, this.deps.spec.sidecarPath);
  }

  /**
   * Final bounded poll + flush at termination: emits every remaining tracked
   * non-terminal row with its observed status as a named `flush-partial`
   * record (partial content, observed status), through the same adapter code
   * path as ordinary polls. Idempotent with respect to the sidecar.
   *
   * @returns The flush-partial (or format-unknown) records appended, if any.
   */
  async flushTracked(): Promise<EmissionRecord[]> {
    const outcome = await this.flushTrackedDetailed();
    if (outcome.kind !== 'flushed') return [];
    // Preserve the pre-existing method contract: callers of flushTracked()
    // receive only records produced by the non-terminal flush pass. The
    // detailed finalizer additionally owns terminal rows emitted by its poll.
    return outcome.records.filter(
      (record) =>
        record.anomaly?.kind === 'flush-partial' ||
        (record.anomaly?.kind === 'format-unknown' && record.anomaly.detail.startsWith('flush:'))
    );
  }

  /**
   * Performs the final bounded poll while preserving its named degradation.
   *
   * @returns Terminal and partial records emitted by the final pass, or a
   * named degradation when the source cannot be drained safely.
   */
  async flushTrackedDetailed(): Promise<SqlitePollFlushOutcome> {
    // Final bounded poll: terminal rows drain as ordinary records first, then
    // every remaining tracked non-terminal row flushes with its observed
    // status as a named flush-partial record. Same adapter code path, no
    // DB writes.
    const outcome = await this.pollOnce();
    if (outcome.kind === 'db-absent') {
      return {
        kind: 'degraded',
        reason: 'db-absent',
        detail: `conversation DB "${this.dbPath}" is absent at final drain`
      };
    }
    if (outcome.kind === 'absence-expired') {
      return { kind: 'degraded', reason: 'absence-expired', detail: outcome.detail };
    }
    if (outcome.kind === 'permanent-unavailable') {
      return { kind: 'degraded', reason: 'permanent-unavailable', detail: outcome.detail };
    }
    const emitted = [...outcome.emitted];
    const flushed: EmissionRecord[] = [];

    let connection: SqlitePollConnection;
    try {
      connection = this.connection ?? (this.deps.openConnection ?? openReadOnly)(this.dbPath);
      const rows = (connection.prepare(`SELECT ${SELECT_ALL_COLUMNS} FROM steps ORDER BY idx`).all() as unknown[]).map(
        rowToStepRow
      );
      for (const row of rows) {
        if (row.status === SQLITE_POLL_TERMINAL_STATUS) continue;
        if (this.entries.has(row.idx)) continue;
        const decode = decodeStepForRuntime(this.deps.manifest.runtime, row);
        if (decode.kind === 'anomaly') {
          const record = this.buildRecord(row, '', { kind: 'format-unknown', detail: `flush: ${decode.detail}` });
          flushed.push(record);
          continue;
        }
        const record = this.buildRecord(row, decode.content, {
          kind: 'flush-partial',
          detail: `termination flush of non-terminal row idx ${String(row.idx)} with observed status ${String(row.status)}; content is possibly partial`
        });
        flushed.push(record);
      }
      if (this.connection === null) {
        connection.close();
      }
    } catch (error) {
      if (this.permanentDetail !== null) {
        return { kind: 'degraded', reason: 'permanent-unavailable', detail: this.permanentDetail };
      }
      this.closeConnection();
      this.deps.warnFn(
        `sqlite-poll: flush read pass failed transiently: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        kind: 'degraded',
        reason: 'poll-failed',
        detail: `sqlite-poll final read pass failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
    if (flushed.length > 0) {
      await this.appendRecords(flushed);
    }
    return {
      kind: 'flushed',
      records: [...emitted, ...flushed],
      partial: flushed.filter((record) => record.anomaly?.kind === 'flush-partial').length
    };
  }
}
