/**
 * Codex runtime adapter for {@link SessionSyncManifest} construction.
 *
 * Codex writes a session's transcript to a single rollout file named
 * `rollout-<timestamp>-<sessionId>.jsonl` (e.g.
 * `rollout-2026-07-06T15-03-11-019f38d0-20eb-7a10-b566-666001ec2821.jsonl`).
 * Unlike Claude Code, Codex has no subagent transcripts and a session resume
 * spawns a brand-new watcher via its own SessionStart hook rather than this
 * adapter promoting anything — so the manifest carries exactly one `main`
 * source and no glob.
 *
 * @summary Builds a SessionSyncManifest for a Codex session
 * @module
 */

import { basename, dirname } from 'node:path';
import type { SessionSyncManifest } from '../manifest.js';

/** Input required to build a Codex {@link SessionSyncManifest}. */
export interface CodexManifestInput {
  /** Session identifier for stream file naming. */
  sessionId: string;
  /** Card identifier for sidecar metadata. */
  cardId: string;
  /** Absolute path to the session's rollout JSONL file. */
  rolloutPath: string;
  /** PID of the agent process to monitor. */
  monitorPid: number;
  /** Absolute path to the card repository. */
  cardRepoPath: string;
}

// Matches Codex's real rollout naming convention, e.g.
// `rollout-2026-07-06T15-03-11-019f38d0-20eb-7a10-b566-666001ec2821.jsonl`.
// The timestamp uses `-` in place of `:` (filesystem-safe), and the trailing
// segment is the session ID verbatim.
const ROLLOUT_FILENAME_PATTERN = /^rollout-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-(.+)\.jsonl$/;

/**
 * Builds a {@link SessionSyncManifest} for a Codex session.
 *
 * Fails closed: `rolloutPath`'s basename must match Codex's real rollout
 * naming convention (`rollout-<timestamp>-<sessionId>.jsonl`) with the
 * embedded session ID equal to `sessionId` — anything else indicates a
 * wiring bug upstream and must not be silently reconciled.
 *
 * @param input - Session identifiers and paths supplied by the session-start hook.
 * @returns A manifest describing the session's single rollout source.
 * @throws {Error} When `rolloutPath`'s basename does not match the rollout naming
 *   convention, or its embedded session ID does not equal `sessionId`.
 */
export function buildCodexManifest(input: CodexManifestInput): SessionSyncManifest {
  const { sessionId, cardId, rolloutPath, monitorPid, cardRepoPath } = input;

  const rolloutBasename = basename(rolloutPath);
  const match = ROLLOUT_FILENAME_PATTERN.exec(rolloutBasename);
  if (!match) {
    throw new Error(
      `Codex rolloutPath basename "${rolloutBasename}" does not match the expected rollout-<timestamp>-<sessionId>.jsonl convention`
    );
  }
  const embeddedSessionId = match[1];
  if (embeddedSessionId !== sessionId) {
    throw new Error(
      `Codex rolloutPath basename "${rolloutBasename}" embeds sessionId "${String(embeddedSessionId)}", which does not match expected sessionId "${sessionId}"`
    );
  }

  return {
    version: 1,
    sessionId,
    cardId,
    runtime: 'codex',
    streamType: 'codex-session',
    watchRoot: dirname(rolloutPath),
    sources: [{ pattern: rolloutBasename, role: 'main', mode: 'jsonl-tail' }],
    monitorPid,
    cardRepoPath
  };
}
