/**
 * Detached transcript watcher process.
 *
 * Spawned by session-start to monitor an agent PID and sync transcript files
 * from the Claude Code session directory directly into the card repository.
 * Uses fs.watch (recursive) on the source directory; on session close (sentinel
 * detection or PID death) performs a final copy pass and commits. Exits on
 * sentinel file detection (graceful shutdown), PID death (crash), or max
 * lifetime timeout.
 *
 * @summary Detached transcript watcher — filesystem-event-driven directory syncer
 */

import { execFile, execFileSync } from 'node:child_process';
import type { FSWatcher } from 'node:fs';
import { watch } from 'node:fs';
import { access, appendFile, copyFile, mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import * as net from 'node:net';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Maximum watcher lifetime before forced exit (24 hours). */
export const MAX_LIFETIME_MS = 24 * 60 * 60 * 1_000;

/** Interval for periodic sentinel/PID liveness checks (5 seconds). */
export const PERIODIC_CHECK_INTERVAL_MS = 5_000;

let logSocket: net.Socket | null = null;

/**
 * Connects to the wrapper log socket at the given path.
 *
 * @param socketPath - Unix socket path for the logging server.
 */
export function connectLogSocket(socketPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath, () => {
      logSocket = socket;
      socket.unref();
      socket.on('error', () => {
        logSocket = null;
      });
      resolve();
    });
    socket.on('error', (err) => {
      logSocket = null;
      reject(err);
    });
  });
}

/**
 * Sends a structured log entry over the socket.
 *
 * Fails silently when the socket is unavailable since logging failures
 * must not affect watcher operation.
 *
 * @param level - Log level (e.g. 'info', 'warn', 'error').
 * @param message - Human-readable log message.
 */
export function logViaSocket(level: string, message: string): void {
  if (!logSocket || logSocket.destroyed) return;
  try {
    const entry = { type: 'log', level, message };
    logSocket.write(`${JSON.stringify(entry)}\n`);
  } catch {
    logSocket = null; // Reset so future writes don't attempt a broken socket
  }
}

/**
 * Arguments parsed from process.argv for the transcript watcher.
 */
export interface TranscriptWatcherArgs {
  /** PID of the agent process to monitor. */
  pid: number;
  /** Session identifier for stream file naming. */
  sessionId: string;
  /** Filesystem path to the transcript JSONL file. */
  transcriptPath: string;
  /** Card identifier for sidecar metadata. */
  cardId: string;
  /** Filesystem path to the card repository. */
  cardRepoPath: string;
  /**
   * Optional emitter for loop lifecycle events ('ready', 'iterationEnd', 'done').
   * Used by tests to synchronize with the watcher loop without arbitrary timing delays.
   * 'ready' fires after startup I/O completes and just before the periodic interval starts.
   */
  emitter?: { emit(event: string): boolean; once(event: string, listener: () => void): unknown };
}

/**
 * Parses watcher arguments from process.argv.
 *
 * Expects argv in the format:
 * `[node, script, pid, sessionId, transcriptPath, cardId, cardRepoPath]`
 *
 * @param argv - The process.argv array.
 * @returns Parsed watcher arguments.
 */
export function parseArgs(argv: string[]): TranscriptWatcherArgs {
  return {
    pid: Number(argv[2]),
    sessionId: argv[3]!,
    transcriptPath: argv[4]!,
    cardId: argv[5]!,
    cardRepoPath: argv[6]!
  };
}

/**
 * Checks whether a process with the given PID is still alive.
 *
 * Uses `process.kill(pid, 0)` which sends no signal but checks existence.
 * Returns true when the process exists (including EPERM), false on ESRCH.
 *
 * @param pid - Process ID to check.
 * @returns True if the process is alive, false otherwise.
 */
export function isProcessAlive(pid: number): boolean {
  if (process.platform === 'win32') {
    try {
      const output = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/NH'], {
        encoding: 'utf-8'
      });
      return output.includes(String(pid));
    } catch {
      return false;
    }
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
      return false;
    }
    // EPERM means the process exists but we cannot signal it
    return true;
  }
}

/**
 * Checks whether the sentinel flush file exists for this session.
 *
 * The sentinel file is written by the session-end hook to signal the watcher
 * to flush remaining files and close the stream gracefully.
 *
 * @param cardRepoPath - Path to the card repository.
 * @param sessionId - Session ID used to construct the sentinel path.
 * @returns True if the sentinel file exists.
 */
export async function sentinelFileExists(cardRepoPath: string, sessionId: string): Promise<boolean> {
  try {
    await access(join(cardRepoPath, 'streams', 'claude-code-session', `${sessionId}.flush`));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Removes the sentinel file after detection. Idempotent — handles ENOENT.
 *
 * @param cardRepoPath - Path to the card repository.
 * @param sessionId - Session ID used to construct the sentinel path.
 */
export async function removeSentinelFile(cardRepoPath: string, sessionId: string): Promise<void> {
  try {
    await unlink(join(cardRepoPath, 'streams', 'claude-code-session', `${sessionId}.flush`));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

/**
 * Translates a source-relative path (under the session UUID root) to a flat
 * destination filename. Returns null for paths that should be skipped.
 *
 * Translation table:
 * - `{session-uuid}.jsonl`                            → `{session-uuid}.jsonl`
 * - `{session-uuid}/subagents/agent-{hash}.jsonl`     → `{session-uuid}-agent-{hash}.jsonl`
 * - `{session-uuid}/subagents/agent-{hash}.meta.json` → `{session-uuid}-agent-{hash}.meta.json`
 * - `{session-uuid}/subagents/agent-acompact-{hash}.jsonl` → `{session-uuid}-agent-acompact-{hash}.jsonl`
 * - `{session-uuid}/tool-results/**`                  → null (skipped)
 * - anything else under `{session-uuid}/`             → null (skipped)
 *
 * @param relPath - Relative path from source directory root.
 * @param sessionId - Session UUID prefix to filter on.
 * @returns Flat destination filename, or null to skip.
 */
export function translatePath(relPath: string, sessionId: string): string | null {
  // Normalize separators to forward slash for consistent matching
  const normalized = relPath.replace(/\\/g, '/');

  // Root session file: {session-uuid}.jsonl
  if (normalized === `${sessionId}.jsonl`) {
    return `${sessionId}.jsonl`;
  }

  // Subagents directory: {session-uuid}/subagents/{name}
  const subagentsPrefix = `${sessionId}/subagents/`;
  if (normalized.startsWith(subagentsPrefix)) {
    const name = normalized.slice(subagentsPrefix.length);
    // Only allow bare filenames (no further subdirectories)
    if (name.includes('/')) {
      return null;
    }
    return `${sessionId}-${name}`;
  }

  // tool-results and anything else under session dir: skip
  return null;
}

/**
 * Sidecar metadata for a stream file.
 */
interface SidecarMeta {
  filename: string;
  streamType: string;
  title: string;
  sessionId: string;
  agentId?: string;
}

/**
 * Builds the sidecar metadata object for a given flat destination filename.
 *
 * @param destFilename - Flat destination filename (e.g. `{uuid}.jsonl`).
 * @param sessionId - Session UUID.
 * @param cardId - Card identifier.
 * @returns Sidecar metadata object.
 */
export function buildSidecarMeta(destFilename: string, sessionId: string, cardId: string): SidecarMeta {
  // Determine whether this is a subagent file by checking for the agent suffix
  const isSubagent = destFilename.startsWith(`${sessionId}-`);

  if (isSubagent) {
    // Extract agentId: everything between "{sessionId}-" and the extension
    // e.g. "{uuid}-agent-{hash}.jsonl" → agentId = "agent-{hash}"
    const withoutUuidPrefix = destFilename.slice(sessionId.length + 1); // strip "{uuid}-"
    const dotIdx = withoutUuidPrefix.lastIndexOf('.');
    const agentId = dotIdx >= 0 ? withoutUuidPrefix.slice(0, dotIdx) : withoutUuidPrefix;

    return {
      filename: destFilename,
      streamType: 'claude-code-session',
      title: `Subagent transcript for ${cardId}`,
      sessionId,
      agentId
    };
  }

  return {
    filename: destFilename,
    streamType: 'claude-code-session',
    title: `Claude session for ${cardId}`,
    sessionId
  };
}

/**
 * Writes a sidecar meta.json file for a destination file, if it does not
 * already exist. Written once on first copy; never updated on subsequent events.
 *
 * @param destDir - Destination directory path.
 * @param destFilename - Flat destination filename.
 * @param sessionId - Session UUID.
 * @param cardId - Card identifier.
 */
async function writeSidecarIfAbsent(
  destDir: string,
  destFilename: string,
  sessionId: string,
  cardId: string
): Promise<void> {
  const sidecarPath = join(destDir, `${destFilename}.meta.json`);
  try {
    await access(sidecarPath);
    // Already exists — do not overwrite
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const meta = buildSidecarMeta(destFilename, sessionId, cardId);
  await writeFile(sidecarPath, JSON.stringify(meta, null, 2));
}

/**
 * Per-source-file state for append-based JSONL sync.
 *
 * Tracks the last byte offset that has been successfully appended to the
 * destination, and any partial line fragment deferred to the next event.
 */
interface FileState {
  /** Number of bytes from the source file that have been appended to dest. */
  bytesWritten: number;
  /** Incomplete line fragment from the last read, deferred to next event. */
  pendingFragment: string;
}

/**
 * Syncs new content from a JSONL source file to a flat destination file using
 * append-based sync. Reads from the last-written byte offset, truncates at
 * the last complete newline, and appends via fs.appendFile with O_APPEND.
 *
 * Partial lines (no trailing newline) are deferred to the next event.
 * The in-memory offset advances only after the appendFile call resolves.
 *
 * @param srcPath - Absolute source file path.
 * @param destPath - Absolute destination file path.
 * @param state - Mutable per-file state (mutated in place on success).
 */
async function appendSyncJsonl(srcPath: string, destPath: string, state: FileState): Promise<void> {
  let srcContent: Buffer;
  try {
    srcContent = await readFile(srcPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return; // Source not yet written; defer to next event
    }
    throw error;
  }

  const totalSrcBytes = srcContent.length;
  if (totalSrcBytes <= state.bytesWritten) {
    return; // No new bytes
  }

  const newBytes = srcContent.subarray(state.bytesWritten);
  const text = state.pendingFragment + newBytes.toString('utf-8');

  // Truncate at last complete newline
  const lastNl = text.lastIndexOf('\n');
  if (lastNl < 0) {
    // No complete line yet — accumulate fragment
    state.pendingFragment = text;
    return;
  }

  const completeLines = text.slice(0, lastNl + 1); // includes trailing \n
  const newFragment = text.slice(lastNl + 1);

  await appendFile(destPath, completeLines, { flag: 'a' });

  // Advance offset only after successful write.
  // completeLines = pendingFragment + consumed_new_bytes, so:
  // consumed_new_bytes (bytes) = byteLength(completeLines) - byteLength(pendingFragment)
  const consumed = Buffer.byteLength(completeLines, 'utf-8') - Buffer.byteLength(state.pendingFragment, 'utf-8');
  state.bytesWritten = state.bytesWritten + consumed;
  state.pendingFragment = newFragment;
}

/**
 * Ensures the `streams/**\/*.flush` pattern is in the card repo's .gitignore.
 * Appends the entry if not already present.
 *
 * @param cardRepoPath - Absolute path to the card repository root.
 */
export async function ensureGitignoreEntry(cardRepoPath: string): Promise<void> {
  const gitignorePath = join(cardRepoPath, '.gitignore');
  const entry = 'streams/**/*.flush';

  let existing = '';
  try {
    existing = (await readFile(gitignorePath, 'utf-8')) as string;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    // File does not exist — will be created
  }

  const lines = existing.split('\n');
  if (lines.some((line) => line.trim() === entry)) {
    return; // Already present
  }

  const newContent = existing.endsWith('\n') || existing === '' ? `${existing}${entry}\n` : `${existing}\n${entry}\n`;

  await writeFile(gitignorePath, newContent);
}

/**
 * Walks the source directory to find all files under the session UUID prefix,
 * returning their relative paths.
 *
 * @param sourceDir - Absolute path to the source directory.
 * @param sessionId - Session UUID prefix to enumerate.
 * @returns Array of relative source paths under the session prefix.
 */
async function enumerateSessionFiles(sourceDir: string, sessionId: string): Promise<string[]> {
  const result: string[] = [];

  // Check for root session file
  const rootFile = `${sessionId}.jsonl`;
  try {
    await access(join(sourceDir, rootFile));
    result.push(rootFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    // ENOENT: root session file not yet created; skip silently
  }

  // Walk session subdirectory
  const sessionDir = join(sourceDir, sessionId);
  try {
    await walkDir(sessionDir, sessionId, result);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    // Session subdirectory not yet created
  }

  return result;
}

/**
 * Recursively walks a directory, collecting relative paths from the source root.
 *
 * @param dir - Absolute path to the current directory being walked.
 * @param relPrefix - Relative prefix from the source root to this directory.
 * @param result - Array to append results to.
 */
async function walkDir(dir: string, relPrefix: string, result: string[]): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const absPath = join(dir, entry);
    const relPath = `${relPrefix}/${entry}`;

    let isDir: boolean;
    try {
      const s = await stat(absPath);
      isDir = s.isDirectory();
    } catch {
      continue;
    }

    if (isDir) {
      await walkDir(absPath, relPath, result);
    } else {
      result.push(relPath);
    }
  }
}

/**
 * Performs a single file copy/sync operation for a source-relative path.
 *
 * - JSONL files: append-based sync using fileStates.
 * - Non-JSONL files (e.g. .meta.json sidecars from Claude Code): full copyFile.
 * - For each JSONL file copied, writes a `.jsonl.meta.json` sidecar if absent.
 * - Skips tool-results paths and paths outside the session UUID prefix.
 *
 * @param relPath - Source-relative path from the source directory root.
 * @param sourceDir - Absolute source directory path.
 * @param destDir - Absolute destination directory path.
 * @param sessionId - Session UUID prefix.
 * @param cardId - Card identifier.
 * @param fileStates - Per-source-file state map (mutated in place).
 */
async function syncFile(
  relPath: string,
  sourceDir: string,
  destDir: string,
  sessionId: string,
  cardId: string,
  fileStates: Map<string, FileState>
): Promise<void> {
  const destFilename = translatePath(relPath, sessionId);
  if (destFilename === null) {
    return; // Skip
  }

  const srcPath = join(sourceDir, relPath.replace(/\//g, '/'));
  const destPath = join(destDir, destFilename);

  if (destFilename.endsWith('.jsonl')) {
    // Append-based sync
    let state = fileStates.get(relPath);
    if (!state) {
      state = { bytesWritten: 0, pendingFragment: '' };
      fileStates.set(relPath, state);
    }

    await appendSyncJsonl(srcPath, destPath, state);

    // Write sidecar once on first copy
    await writeSidecarIfAbsent(destDir, destFilename, sessionId, cardId);
  } else {
    // Non-JSONL files (Claude Code-authored sidecars like agent-*.meta.json):
    // copy as-is; overwrite is safe since Claude Code writes these atomically.
    try {
      await copyFile(srcPath, destPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return; // Source gone before we could copy it
      }
      throw error;
    }
  }
}

/**
 * Performs a full copy pass for all files currently present under the session
 * UUID prefix in the source directory.
 *
 * @param sourceDir - Absolute source directory path.
 * @param destDir - Absolute destination directory path.
 * @param sessionId - Session UUID.
 * @param cardId - Card identifier.
 * @param fileStates - Per-source-file state map (mutated in place).
 */
async function fullCopyPass(
  sourceDir: string,
  destDir: string,
  sessionId: string,
  cardId: string,
  fileStates: Map<string, FileState>
): Promise<void> {
  const relPaths = await enumerateSessionFiles(sourceDir, sessionId);
  for (const relPath of relPaths) {
    try {
      await syncFile(relPath, sourceDir, destDir, sessionId, cardId, fileStates);
    } catch (error) {
      logViaSocket('warn', `fullCopyPass: error syncing ${relPath}: ${String(error)}`);
    }
  }
}

/**
 * Runs git add + git commit in the card repository to close the session.
 *
 * Calls removeSentinelFile() before staging to ensure the sentinel is never
 * committed. Uses execFile (async, non-blocking) per codebase patterns.
 *
 * @param cardRepoPath - Absolute path to the card repository.
 * @param sessionId - Session UUID used in the commit message.
 */
async function commitSessionClose(cardRepoPath: string, sessionId: string): Promise<void> {
  try {
    await removeSentinelFile(cardRepoPath, sessionId);
  } catch (error) {
    logViaSocket('warn', `removeSentinelFile failed: ${String(error)}`);
  }

  try {
    await execFileAsync('git', ['add', 'streams/claude-code-session/'], { cwd: cardRepoPath });
    await execFileAsync('git', ['commit', '--no-gpg-sign', '-m', `Close session ${sessionId}.`], {
      cwd: cardRepoPath
    });
  } catch (error) {
    logViaSocket('error', `git commit failed for session ${sessionId}: ${String(error)}`);
  }
}

/**
 * Runs the main filesystem-event-driven sync loop.
 *
 * Sets up fs.watch on the source directory, performs an initial full copy,
 * then processes events filtered to the session UUID prefix. A periodic timer
 * checks sentinel file existence and PID liveness every PERIODIC_CHECK_INTERVAL_MS.
 * On exit condition (sentinel, PID death, or max lifetime), closes the watcher,
 * performs a final full copy pass, and commits.
 *
 * @param args - Watcher arguments.
 */
export async function runSyncLoop(args: TranscriptWatcherArgs): Promise<void> {
  const { sessionId, cardId, cardRepoPath, transcriptPath } = args;
  const sourceDir = dirname(transcriptPath);
  const destDir = join(cardRepoPath, 'streams', 'claude-code-session');

  // Ensure destination directory and .gitignore entry exist
  await mkdir(destDir, { recursive: true });
  await ensureGitignoreEntry(cardRepoPath);

  const fileStates = new Map<string, FileState>();
  const startTime = Date.now();

  // Initial full copy pass
  await fullCopyPass(sourceDir, destDir, sessionId, cardId, fileStates);

  // Set up fs.watch on the source directory
  let fsWatcher: FSWatcher | null = null;
  let exitSignaled = false;

  // Queue of pending sync operations to serialize event handling
  let syncChain: Promise<void> = Promise.resolve();

  const scheduleSync = (relPath: string): void => {
    syncChain = syncChain.then(async () => {
      try {
        await syncFile(relPath, sourceDir, destDir, sessionId, cardId, fileStates);
      } catch (error) {
        logViaSocket('warn', `syncFile error for ${relPath}: ${String(error)}`);
      }
    });
  };

  try {
    fsWatcher = watch(sourceDir, { recursive: true }, (_eventType, filename) => {
      if (exitSignaled || !filename) return;
      const relPath = (filename as string).replace(/\\/g, '/');
      // Only process events for the current session
      if (!relPath.startsWith(sessionId)) return;
      scheduleSync(relPath);
    });
    fsWatcher.on('error', (error) => {
      if (!exitSignaled) {
        logViaSocket('warn', `fs.watch error: ${String(error)}`);
      }
    });
  } catch (error) {
    logViaSocket('warn', `Failed to start fs.watch: ${String(error)}`);
  }

  // Signal that startup I/O is complete and the interval loop is about to begin.
  // Tests use this to synchronize fake-timer advancement with the real async startup.
  args.emitter?.emit('ready');

  // Periodic sentinel/PID check
  const checkExit = async (): Promise<boolean> => {
    if (await sentinelFileExists(cardRepoPath, sessionId)) {
      return true;
    }
    if (!isProcessAlive(args.pid)) {
      return true;
    }
    if (Date.now() - startTime >= MAX_LIFETIME_MS) {
      logViaSocket('warn', `Watcher exceeded maximum lifetime (${MAX_LIFETIME_MS}ms), exiting`);
      return true;
    }
    return false;
  };

  // Wait for exit condition via periodic polling
  await new Promise<void>((resolve) => {
    const interval = setInterval(async () => {
      try {
        const shouldExit = await checkExit();
        if (shouldExit) {
          clearInterval(interval);
          resolve();
        } else {
          args.emitter?.emit('iterationEnd');
        }
      } catch (error) {
        logViaSocket('warn', `Periodic check error: ${String(error)}`);
      }
    }, PERIODIC_CHECK_INTERVAL_MS);
  });

  exitSignaled = true;

  // Stop the fs.watch watcher
  if (fsWatcher) {
    try {
      fsWatcher.close();
    } catch (error) {
      logViaSocket('warn', `fsWatcher.close() error: ${String(error)}`);
    }
  }

  // Wait for any in-flight syncs to complete
  await syncChain;

  // Final full copy pass to catch any missed events
  await fullCopyPass(sourceDir, destDir, sessionId, cardId, fileStates);

  // Commit the session
  await commitSessionClose(cardRepoPath, sessionId);

  args.emitter?.emit('done');
}

/**
 * Main entry point for the detached watcher process.
 *
 * Connects to the log socket, parses arguments, and enters the sync loop
 * that watches the source directory and copies files to the card repository.
 */
export async function main(): Promise<void> {
  const socketPath = process.env['SOCKET_PATH'];
  if (socketPath) {
    try {
      await connectLogSocket(socketPath);
    } catch (error) {
      // Log socket is optional — watcher operates correctly without it.
      // The socket may have already closed before we connect. Write to stderr
      // so the failure is visible if the process has a controlling terminal.
      process.stderr.write(`transcript-watcher: log socket unavailable: ${String(error)}\n`);
    }
  }

  const args = parseArgs(process.argv);
  logViaSocket(
    'info',
    `Watcher started: pid=${String(args.pid)} session=${args.sessionId} node=${process.version} watcherPid=${String(process.pid)} transcriptPath=${args.transcriptPath} cardId=${args.cardId}`
  );

  await runSyncLoop(args);
  logViaSocket('info', `Watcher completed for session ${args.sessionId}`);
}

if (process.argv[1]?.endsWith('transcript-watcher.mjs') || process.argv[1]?.endsWith('transcript-watcher.ts')) {
  main().catch((error) => {
    logViaSocket('error', `Watcher fatal error: ${String(error)}`);
    process.exitCode = 1;
  });
}
