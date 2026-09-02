/**
 * Barrel re-exporting all runtime adapters for {@link SessionSyncManifest} construction.
 *
 * @summary Runtime adapters barrel
 * @module
 */

import type { SessionSyncManifest } from '../manifest.js';
import type { StepDecodeResult, StepRow } from '../records.js';
import { buildAntigravityManifest, decodeStepPayload } from './antigravity.js';
import { buildClaudeCodeManifest } from './claude-code.js';
import { buildCodexManifest } from './codex.js';
import { buildOpencodeManifest } from './opencode.js';

export {
  ANTIGRAVITY_SCHEMA_DDL,
  ANTIGRAVITY_STREAM_TYPE,
  ANTIGRAVITY_TERMINAL_STATUS,
  type AntigravityManifestInput,
  buildAntigravityManifest,
  computeSchemaFingerprint,
  decodeStepPayload
} from './antigravity.js';
export { buildClaudeCodeManifest, type ClaudeCodeManifestInput } from './claude-code.js';
export { buildCodexManifest, type CodexManifestInput } from './codex.js';
export { buildOpencodeManifest, type OpencodeManifestInput } from './opencode.js';

/**
 * Thrown by {@link buildManifestForRuntime} when asked to build a manifest for
 * a `runtime` string with no known adapter — fail closed rather than guess.
 */
export class UnsupportedRuntimeError extends Error {
  constructor(runtime: string) {
    super(`No SessionSyncManifest adapter for runtime: ${runtime}`);
    this.name = 'UnsupportedRuntimeError';
  }
}

/** Input shared by every runtime adapter, keyed by the session's transcript/rollout file. */
export interface RuntimeManifestInput {
  /** Session identifier for stream file naming. */
  sessionId: string;
  /** Card identifier for sidecar metadata. */
  cardId: string;
  /** Absolute path to the session's main transcript/rollout file. */
  transcriptPath: string;
  /** PID of the agent process to monitor. */
  monitorPid: number;
  /** Absolute path to the card repository. */
  cardRepoPath: string;
}

/**
 * Dispatches to the correct runtime adapter by name, for callers that only
 * know the runtime as a string (e.g. `spawnAdhocAttribution`, which serves
 * both Claude Code and Codex ad-hoc attach paths through one code path).
 *
 * Fail-closed: an unrecognized `runtime` throws {@link UnsupportedRuntimeError}
 * rather than silently guessing at a layout — callers that know their runtime
 * statically (the SessionStart hooks) call `buildClaudeCodeManifest` /
 * `buildCodexManifest` directly instead of going through this dispatcher.
 *
 * @param runtime - The runtime identifier, e.g. `'claude-code'`, `'codex'`, or `'opencode'`.
 * @param input - Session identifiers and paths shared by every adapter.
 * @returns The manifest built by the matching adapter.
 * @throws {UnsupportedRuntimeError} When `runtime` has no known adapter.
 * @throws {Error} Any error thrown by the underlying adapter (e.g. a
 *   transcriptPath/rolloutPath that disagrees with `sessionId`).
 */
export function buildManifestForRuntime(runtime: string, input: RuntimeManifestInput): SessionSyncManifest {
  switch (runtime) {
    case 'claude-code':
      return buildClaudeCodeManifest(input);
    case 'codex':
      return buildCodexManifest({ ...input, rolloutPath: input.transcriptPath });
    case 'opencode':
      return buildOpencodeManifest(input);
    case 'antigravity':
      return buildAntigravityManifest(input);
    default:
      throw new UnsupportedRuntimeError(runtime);
  }
}

/**
 * Dispatches one source `steps` row to the correct runtime's payload decoder
 * by name — the sqlite-poll engine's single touchpoint for runtime-specific
 * payload knowledge.
 *
 * Fail-closed: an unrecognized `runtime` throws rather than guessing — the
 * engine surfaces it as permanent unavailability, never decoder garbage.
 *
 * @param runtime - The runtime identifier owning the payload format.
 * @param row - The source row to decode.
 * @returns The decoded content, or a named anomaly with detail.
 * @throws {Error} When `runtime` has no known payload decoder.
 */
export function decodeStepForRuntime(runtime: string, row: StepRow): StepDecodeResult {
  switch (runtime) {
    case 'antigravity':
      return decodeStepPayload(row.stepType, row.format, row.payload);
    default:
      throw new Error(`No step-payload decoder for runtime: ${runtime}`);
  }
}
