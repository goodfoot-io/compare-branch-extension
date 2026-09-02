/**
 * Launcher-owned final drain for sqlite-poll transcript sessions.
 *
 * @summary Persisted-manifest finalization for sqlite-poll sessions
 * @module
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ANTIGRAVITY_STREAM_TYPE } from '../adapters/antigravity.js';
import { parseManifest, type SessionSyncManifest, type SqlitePollSourceSpec } from '../manifest.js';
import { commitSessionClose, sentinelPath } from './commit.js';
import { acquireFinalizationLock } from './finalization-lock.js';
import { type SessionStatusFile, sessionStatusPath, writeSessionStatus } from './session-status.js';
import { SqlitePollEngine } from './sqlite-poll.js';

/** Named reasons why a launcher-owned final transcript drain degraded. */
export type SqlitePollFinalizationDegradation =
  | 'status-unavailable'
  | 'status-invalid'
  | 'identity-mismatch'
  | 'db-absent'
  | 'absence-expired'
  | 'permanent-unavailable'
  | 'poll-failed'
  | 'finalization-busy';

/** Result of a launcher- or watcher-owned final sqlite-poll drain. */
export type SqlitePollFinalizationOutcome =
  | { kind: 'flushed'; emitted: number; partial: number }
  | { kind: 'degraded'; reason: SqlitePollFinalizationDegradation; detail: string };

/** Inputs shared by the live watcher and launcher-owned final drain. */
export interface FinalizeSqlitePollSessionOptions {
  /** Validated sqlite-poll manifest. */
  manifest: SessionSyncManifest;
  /** Original watcher start timestamp retained in the lifecycle snapshot. */
  startedAt: string;
  /** Recoverable diagnostic sink. */
  warnFn: (message: string) => void;
  /** Terminal diagnostic sink. */
  errorFn: (message: string) => void;
}

/** Locates a persisted session manifest for launcher-owned finalization. */
export interface FinalizePersistedSqlitePollSessionOptions {
  /** Card repository containing the session lifecycle snapshot. */
  cardRepoPath: string;
  /** Cards-owned Antigravity session identity. */
  sessionId: string;
  /** Recoverable diagnostic sink. */
  warnFn: (message: string) => void;
  /** Terminal diagnostic sink. */
  errorFn: (message: string) => void;
  /** Test seam; production allows the live watcher one steady tick to close. */
  watcherGraceMs?: number;
}

const WATCHER_FINALIZATION_GRACE_MS = 1_500;
const FINALIZATION_LOCK_RETRY_MS = 25;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

/**
 * Performs the shared watcher/launcher final drain.
 *
 * @param options - Validated manifest and lifecycle dependencies.
 * @returns The final drain outcome.
 */
export async function finalizeSqlitePollSession(
  options: FinalizeSqlitePollSessionOptions
): Promise<SqlitePollFinalizationOutcome> {
  const spec = options.manifest.sources[0];
  if (options.manifest.version !== 2 || spec?.mode !== 'sqlite-poll') {
    return {
      kind: 'degraded',
      reason: 'status-invalid',
      detail: 'persisted session manifest is not a version-2 sqlite-poll manifest'
    };
  }

  const lockPath = `${(spec as SqlitePollSourceSpec).sidecarPath}.finalize.lock`;
  const releaseLock = await acquireFinalizationLock(lockPath);
  if (releaseLock === null) {
    return {
      kind: 'degraded',
      reason: 'finalization-busy',
      detail: `final transcript drain did not acquire ${lockPath} within the bounded wait`
    };
  }

  try {
    const destPath = `${resolve(options.manifest.cardRepoPath, 'streams', options.manifest.streamType, spec.pattern)}.jsonl`;
    const engine = new SqlitePollEngine({
      manifest: options.manifest,
      spec: spec as SqlitePollSourceSpec,
      destPath,
      warnFn: options.warnFn,
      now: () => Date.now(),
      sleep: delay
    });
    await engine.attach();
    const flush = await engine.flushTrackedDetailed();
    if (flush.kind === 'degraded') return flush;

    await commitSessionClose(options.manifest, options.warnFn, options.errorFn);
    await writeSessionStatus(options.manifest, {
      startedAt: options.startedAt,
      closedAt: new Date().toISOString(),
      fileFailures: {}
    });
    return { kind: 'flushed', emitted: flush.records.length, partial: flush.partial };
  } catch (error) {
    return {
      kind: 'degraded',
      reason: 'poll-failed',
      detail: `final transcript drain failed: ${error instanceof Error ? error.message : String(error)}`
    };
  } finally {
    await releaseLock();
  }
}

/**
 * Loads the persisted manifest and performs the launcher-owned final drain.
 *
 * @param options - Card/session identity and diagnostic sinks.
 * @returns The final drain outcome.
 */
export async function finalizePersistedSqlitePollSession(
  options: FinalizePersistedSqlitePollSessionOptions
): Promise<SqlitePollFinalizationOutcome> {
  const expectedStatusPath = resolve(
    options.cardRepoPath,
    'streams',
    ANTIGRAVITY_STREAM_TYPE,
    `${options.sessionId}.session.json`
  );
  let statusFile: SessionStatusFile;
  try {
    statusFile = JSON.parse(await readFile(expectedStatusPath, 'utf8')) as SessionStatusFile;
  } catch (error) {
    return {
      kind: 'degraded',
      reason: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'status-unavailable' : 'status-invalid',
      detail: `cannot load persisted transcript session status at ${expectedStatusPath}: ${error instanceof Error ? error.message : String(error)}`
    };
  }

  let manifest: SessionSyncManifest;
  try {
    if (statusFile.version !== 1 || typeof statusFile.status?.startedAt !== 'string') {
      throw new Error('session status version/start timestamp is invalid');
    }
    manifest = parseManifest(JSON.stringify(statusFile.manifest));
  } catch (error) {
    return {
      kind: 'degraded',
      reason: 'status-invalid',
      detail: `persisted transcript session status is invalid: ${error instanceof Error ? error.message : String(error)}`
    };
  }

  if (
    manifest.runtime !== 'antigravity' ||
    manifest.streamType !== ANTIGRAVITY_STREAM_TYPE ||
    manifest.sessionId !== options.sessionId ||
    resolve(manifest.cardRepoPath) !== resolve(options.cardRepoPath) ||
    resolve(sessionStatusPath(manifest)) !== expectedStatusPath
  ) {
    return {
      kind: 'degraded',
      reason: 'identity-mismatch',
      detail: 'persisted transcript manifest does not match the requested Antigravity card/session identity'
    };
  }

  // Ask a live watcher to close first. It owns the same finalizer and lock;
  // if it is dead, the bounded grace expires and the launcher drains itself.
  const graceMs = options.watcherGraceMs ?? WATCHER_FINALIZATION_GRACE_MS;
  await writeFile(sentinelPath(manifest), '', { flag: 'a' });
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline) {
    await delay(Math.min(FINALIZATION_LOCK_RETRY_MS, deadline - Date.now()));
    try {
      const latest = JSON.parse(await readFile(expectedStatusPath, 'utf8')) as SessionStatusFile;
      if (typeof latest.status?.closedAt === 'string') {
        return { kind: 'flushed', emitted: 0, partial: 0 };
      }
    } catch {
      // The validated snapshot above remains authoritative for takeover.
    }
  }

  return finalizeSqlitePollSession({
    manifest,
    startedAt: statusFile.status.startedAt,
    warnFn: options.warnFn,
    errorFn: options.errorFn
  });
}
