/**
 * Public API for the transcript-sync system: the runtime-agnostic
 * {@link SessionSyncManifest} contract, the runtime adapters that build one
 * for Claude Code, Codex, and OpenCode sessions, and the engine that syncs a
 * session's files per that manifest (see `./engine/`).
 *
 * @summary Transcript-sync manifest, adapters, and engine barrel
 * @module
 */

export {
  type AntigravityManifestInput,
  buildClaudeCodeManifest,
  buildCodexManifest,
  buildManifestForRuntime,
  buildOpencodeManifest,
  type ClaudeCodeManifestInput,
  type CodexManifestInput,
  decodeStepForRuntime,
  type OpencodeManifestInput,
  type RuntimeManifestInput,
  UnsupportedRuntimeError
} from './adapters/index.js';
export * from './engine/index.js';
export {
  ManifestValidationError,
  parseManifest,
  type SessionSyncManifest,
  type SourceSpec,
  serializeManifest
} from './manifest.js';
export {
  EMISSION_RECORD_VERSION,
  type EmissionAnomaly,
  type EmissionAnomalyKind,
  type EmissionRecord,
  parseEmissionRecordLine,
  type StepDecodeResult,
  type StepRow,
  serializeEmissionRecord
} from './records.js';
