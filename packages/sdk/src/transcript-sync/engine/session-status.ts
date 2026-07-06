/**
 * Session status file for the transcript-sync engine.
 *
 * Writes `<cardRepoPath>/streams/<streamType>/<sessionId>.session.json`: a
 * snapshot of the manifest plus lifecycle status flags. This file carries no
 * sync-state (no cursors/offsets) — those live only in memory for the
 * lifetime of the watcher process (see `./recovery.ts` for why that's safe).
 * It is updated on state transitions only (started/failed/closed), not once
 * per tick, so it is cheap to write eagerly.
 *
 * @summary Session lifecycle snapshot, no sync-state
 * @module
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SessionSyncManifest } from '../manifest.js';

/** Lifecycle status flags tracked alongside the manifest snapshot. */
export interface SessionStatus {
  /** ISO 8601 timestamp when the watcher began syncing this session. */
  startedAt: string;
  /** ISO 8601 timestamp when the watcher hit a fatal error, if any. */
  failedAt?: string;
  /** ISO 8601 timestamp when the session was closed, if any. */
  closedAt?: string;
  /** Per-file failure reasons, keyed by relPath. */
  fileFailures: Record<string, string>;
}

/** The full persisted shape of the session status file. */
export interface SessionStatusFile {
  version: 1;
  manifest: SessionSyncManifest;
  status: SessionStatus;
}

/**
 * Returns the absolute path to a session's status file.
 *
 * @param manifest - Supplies `cardRepoPath`, `streamType`, and `sessionId` for the file path.
 * @returns The absolute session status file path.
 */
export function sessionStatusPath(manifest: SessionSyncManifest): string {
  return join(manifest.cardRepoPath, 'streams', manifest.streamType, `${manifest.sessionId}.session.json`);
}

/**
 * Writes the session status file, creating parent directories as needed.
 *
 * @param manifest - The session's manifest, snapshotted verbatim into the file.
 * @param status - The current lifecycle status flags.
 * @returns Resolves once the file has been written.
 */
export async function writeSessionStatus(manifest: SessionSyncManifest, status: SessionStatus): Promise<void> {
  const path = sessionStatusPath(manifest);
  const file: SessionStatusFile = { version: 1, manifest, status };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(file, null, 2));
}
