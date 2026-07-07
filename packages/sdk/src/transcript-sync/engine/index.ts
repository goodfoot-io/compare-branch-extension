/**
 * Public API for the transcript-sync engine: the runtime-agnostic sync
 * mechanics that turn a validated {@link SessionSyncManifest} into a running
 * watcher (tailing/copying, matching, restart recovery, lifecycle, status,
 * and close-time commit).
 *
 * @summary Transcript-sync engine barrel
 * @module
 */

export { commitSessionClose, removeSentinelFile, sentinelExists, sentinelPath } from './commit.js';
export { ensureGitignoreEntry } from './gitignore.js';
export {
  type LifecycleDeps,
  MAX_LIFETIME_MS,
  runWatcherLoop,
  STEADY_TICK_INTERVAL_MS,
  WATCH_INSTALL_RETRY_INTERVAL_MS
} from './lifecycle.js';
export { assertSupportedPatterns, matchSource, UnsupportedPatternError } from './matcher.js';
export { type FileSyncState, Reconciler } from './reconciler.js';
export {
  RECOVERY_VERIFY_TAIL_BYTES,
  type RecoveredCursor,
  type RecoveryFailure,
  recoverCursor
} from './recovery.js';
export {
  type SessionStatus,
  type SessionStatusFile,
  sessionStatusPath,
  writeSessionStatus
} from './session-status.js';
export {
  buildStatusHeartbeat,
  type FileStatus,
  MainFileInvariantChecker,
  type StatusHeartbeat
} from './status.js';
export { SyncChain } from './sync-chain.js';
export { type TailerCursor, tailAppend } from './tailer.js';
export { WatchInstaller, type WatchInstallerDeps } from './watch-installer.js';
