/**
 * OpenCode runtime adapter for {@link SessionSyncManifest} construction.
 *
 * OpenCode v1.18.21 stores sessions in SQLite and has no tailable native
 * transcript, so the Cards runtime plugin materializes one as NDJSON at
 * `~/.cards/opencode-transcripts/<sessionId>.jsonl`. This adapter translates
 * that fixed layout into a manifest the runtime-agnostic transcript-sync
 * engine can consume.
 *
 * @summary Builds a SessionSyncManifest for an OpenCode session
 * @module
 */

import { basename, dirname } from 'node:path';
import type { SessionSyncManifest } from '../manifest.js';

/** Input required to build an OpenCode {@link SessionSyncManifest}. */
export interface OpencodeManifestInput {
  /** Session identifier for stream file naming. */
  sessionId: string;
  /** Card identifier for sidecar metadata. */
  cardId: string;
  /** Absolute path to the session's materialized NDJSON transcript file. */
  transcriptPath: string;
  /** PID of the agent process to monitor. */
  monitorPid: number;
  /** Absolute path to the card repository. */
  cardRepoPath: string;
}

/**
 * Builds a {@link SessionSyncManifest} for an OpenCode session.
 *
 * Fails closed: `transcriptPath`'s basename must be exactly
 * `<sessionId>.jsonl` — a caller supplying a transcript path that disagrees
 * with the session ID indicates a wiring bug upstream and must not be
 * silently reconciled.
 *
 * @param input - Session identifiers and paths supplied by the runtime plugin.
 * @returns A manifest describing the session's materialized NDJSON transcript source.
 * @throws {Error} When `transcriptPath`'s basename does not equal `<sessionId>.jsonl`.
 */
export function buildOpencodeManifest(input: OpencodeManifestInput): SessionSyncManifest {
  const { sessionId, cardId, transcriptPath, monitorPid, cardRepoPath } = input;

  const expectedBasename = `${sessionId}.jsonl`;
  const actualBasename = basename(transcriptPath);
  if (actualBasename !== expectedBasename) {
    throw new Error(
      `OpenCode transcriptPath basename "${actualBasename}" does not match expected "${expectedBasename}" for sessionId "${sessionId}"`
    );
  }

  return {
    version: 1,
    sessionId,
    cardId,
    runtime: 'opencode',
    streamType: 'opencode-session',
    watchRoot: dirname(transcriptPath),
    sources: [{ pattern: expectedBasename, role: 'main', mode: 'jsonl-tail' }],
    monitorPid,
    cardRepoPath
  };
}
