/**
 * Claude Code runtime adapter for {@link SessionSyncManifest} construction.
 *
 * Claude Code writes a session's main transcript to `<sessionId>.jsonl` and
 * any subagent transcripts under `<sessionId>/subagents/*.jsonl`, both inside
 * a per-project session directory. This adapter translates that fixed layout
 * into a manifest the runtime-agnostic transcript-sync engine can consume.
 *
 * @summary Builds a SessionSyncManifest for a Claude Code session
 * @module
 */

import { basename, dirname } from 'node:path';
import type { SessionSyncManifest } from '../manifest.js';

/** Input required to build a Claude Code {@link SessionSyncManifest}. */
export interface ClaudeCodeManifestInput {
  /** Session identifier for stream file naming. */
  sessionId: string;
  /** Card identifier for sidecar metadata. */
  cardId: string;
  /** Absolute path to the session's main transcript JSONL file. */
  transcriptPath: string;
  /** PID of the agent process to monitor. */
  monitorPid: number;
  /** Absolute path to the card repository. */
  cardRepoPath: string;
}

/**
 * Builds a {@link SessionSyncManifest} for a Claude Code session.
 *
 * Fails closed: `transcriptPath`'s basename must be exactly
 * `<sessionId>.jsonl` — a caller supplying a transcript path that disagrees
 * with the session ID indicates a wiring bug upstream and must not be
 * silently reconciled.
 *
 * @param input - Session identifiers and paths supplied by the session-start hook.
 * @returns A manifest describing the session's main transcript and subagent glob.
 * @throws {Error} When `transcriptPath`'s basename does not equal `<sessionId>.jsonl`.
 */
export function buildClaudeCodeManifest(input: ClaudeCodeManifestInput): SessionSyncManifest {
  const { sessionId, cardId, transcriptPath, monitorPid, cardRepoPath } = input;

  const expectedBasename = `${sessionId}.jsonl`;
  const actualBasename = basename(transcriptPath);
  if (actualBasename !== expectedBasename) {
    throw new Error(
      `Claude Code transcriptPath basename "${actualBasename}" does not match expected "${expectedBasename}" for sessionId "${sessionId}"`
    );
  }

  return {
    version: 1,
    sessionId,
    cardId,
    runtime: 'claude-code',
    streamType: 'claude-code-session',
    watchRoot: dirname(transcriptPath),
    sources: [
      { pattern: expectedBasename, role: 'main', mode: 'jsonl-tail' },
      { pattern: `${sessionId}/subagents/*.jsonl`, role: 'subagent', mode: 'jsonl-tail' }
    ],
    monitorPid,
    cardRepoPath
  };
}
