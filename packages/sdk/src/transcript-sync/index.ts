/**
 * Public API for the transcript-sync system: the runtime-agnostic
 * {@link SessionSyncManifest} contract, the runtime adapters that build one
 * for Claude Code and Codex sessions, and the engine that syncs a session's
 * files per that manifest (see `./engine/`).
 *
 * @summary Transcript-sync manifest, adapters, and engine barrel
 * @module
 */

export {
  buildClaudeCodeManifest,
  buildCodexManifest,
  type ClaudeCodeManifestInput,
  type CodexManifestInput
} from './adapters/index.js';
export * from './engine/index.js';
export {
  ManifestValidationError,
  parseManifest,
  type SessionSyncManifest,
  type SourceSpec,
  serializeManifest
} from './manifest.js';
