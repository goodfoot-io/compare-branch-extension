/**
 * Public API for the transcript-sync manifest system: the runtime-agnostic
 * {@link SessionSyncManifest} contract plus the runtime adapters that build
 * one for Claude Code and Codex sessions.
 *
 * @summary Transcript-sync manifest and adapters barrel
 * @module
 */

export {
  buildClaudeCodeManifest,
  buildCodexManifest,
  type ClaudeCodeManifestInput,
  type CodexManifestInput
} from './adapters/index.js';
export {
  ManifestValidationError,
  parseManifest,
  type SessionSyncManifest,
  type SourceSpec,
  serializeManifest
} from './manifest.js';
