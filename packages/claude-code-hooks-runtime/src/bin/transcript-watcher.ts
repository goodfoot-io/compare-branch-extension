/**
 * Detached transcript watcher process.
 *
 * Spawned by session-start to monitor a Claude PID and stream the transcript
 * to the Cards API in real-time. Tails the transcript JSONL file, streaming
 * lines as they appear with idle-timeout-based stream lifecycle. Exits on
 * sentinel file detection (graceful shutdown), PID death (crash), or max
 * lifetime timeout.
 *
 * @summary Detached transcript watcher for real-time transcript streaming
 */

import type { FileHandle } from 'node:fs/promises';
import { access, open, unlink } from 'node:fs/promises';
import * as net from 'node:net';
import { join } from 'node:path';
import type { StreamWriter } from '@cards/sdk/client';
import { createCardsClient } from '../lib/api-discovery.js';

/** Polling interval for transcript tailing and PID liveness checks (1 second). */
export const POLL_INTERVAL_MS = 1_000;

/** Idle timeout before closing the stream connection (30 seconds). */
export const IDLE_TIMEOUT_MS = 30_000;

/** Maximum watcher lifetime before forced exit (24 hours). */
export const MAX_LIFETIME_MS = 24 * 60 * 60 * 1_000;

/** Buffer size for positional reads from the transcript file. */
const READ_BUFFER_SIZE = 64 * 1024;

/**
 * Arguments parsed from process.argv for the transcript watcher.
 */
export interface TranscriptWatcherArgs {
  /** PID of the Claude process to monitor. */
  pid: number;
  /** Session identifier for stream file naming. */
  sessionId: string;
  /** Filesystem path to the transcript JSONL file. */
  transcriptPath: string;
  /** Card identifier for the openStream API call. */
  cardId: string;
  /** Filesystem path to the card repository. */
  cardRepoPath: string;
  /**
   * Optional agent identifier for subagent watchers.
   *
   * When present, the sentinel file and stream filename use the stem
   * `{sessionId}-{agentId}` instead of `{sessionId}` alone. This
   * distinguishes subagent watchers from the session-level watcher and
   * from each other.
   */
  agentId?: string;
}

/**
 * Computes the stem used for sentinel files and stream filenames.
 *
 * Returns `{sessionId}-{agentId}` when `agentId` is present, otherwise
 * returns `{sessionId}` alone.
 *
 * @param args - Watcher arguments containing sessionId and optional agentId.
 * @returns The sentinel/stream stem string.
 */
export function computeSentinelStem(args: Pick<TranscriptWatcherArgs, 'sessionId' | 'agentId'>): string {
  return args.agentId ? `${args.sessionId}-${args.agentId}` : args.sessionId;
}

/**
 * Builds the absolute path to a sentinel flush file.
 *
 * @param cardRepoPath - Path to the card repository.
 * @param sessionId - Claude session identifier used as the filename stem.
 * @param agentId - When provided, scopes the sentinel to a specific subagent.
 * @returns Absolute path to the sentinel file.
 */
export function sentinelFilePath(cardRepoPath: string, sessionId: string, agentId?: string): string {
  const stem = computeSentinelStem({ sessionId, agentId });
  return join(cardRepoPath, 'streams', 'claude-code-session', `${stem}.flush`);
}

/**
 * Result from reading new lines from the transcript file.
 */
export interface ReadNewLinesResult {
  /** The file handle (opened on first successful read, or null if file not yet created). */
  fileHandle: FileHandle | null;
  /** Number of bytes read so far from the file. */
  bytesRead: number;
  /** Incomplete line fragment carried over to the next read. */
  lineBuffer: string;
  /** Complete lines read in this call. */
  lines: string[];
}

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
  } catch (_) {
    // Intentionally suppressed: this IS the logging function, so there is
    // no higher-level logger to report to. The watcher must not crash
    // because a log write failed.
  }
}

/**
 * Parses watcher arguments from process.argv.
 *
 * Expects argv in the format:
 * `[node, script, pid, sessionId, transcriptPath, cardId, cardRepoPath, agentId?]`
 *
 * The `agentId` at `argv[7]` is optional. When present it scopes the sentinel
 * file and stream filename to `{sessionId}-{agentId}`.
 *
 * @param argv - The process.argv array.
 * @returns Parsed watcher arguments.
 */
export function parseArgs(argv: string[]): TranscriptWatcherArgs {
  const result: TranscriptWatcherArgs = {
    pid: Number(argv[2]),
    sessionId: argv[3]!,
    transcriptPath: argv[4]!,
    cardId: argv[5]!,
    cardRepoPath: argv[6]!
  };
  if (argv[7] !== undefined) {
    result.agentId = argv[7];
  }
  return result;
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
 * Reads new bytes from the transcript file using positional reads.
 *
 * Opens the file handle on first successful access. Uses a persistent file
 * handle and byte offset to efficiently tail the file. Handles multi-byte
 * UTF-8 characters split across read boundaries via TextDecoder streaming mode.
 *
 * @param fileHandle - Existing file handle, or null if not yet opened.
 * @param bytesRead - Number of bytes already read from the file.
 * @param lineBuffer - Incomplete line fragment from the previous read.
 * @param transcriptPath - Path to the transcript JSONL file.
 * @returns Updated state and any complete lines read.
 */
export async function readNewLines(
  fileHandle: FileHandle | null,
  bytesRead: number,
  lineBuffer: string,
  transcriptPath: string
): Promise<ReadNewLinesResult> {
  // Open file handle if not yet opened
  if (!fileHandle) {
    try {
      fileHandle = await open(transcriptPath, 'r');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { fileHandle: null, bytesRead, lineBuffer, lines: [] };
      }
      throw error;
    }
  }

  const decoder = new TextDecoder('utf-8', { fatal: false });
  let currentOffset = bytesRead;
  let accumulated = lineBuffer;
  const lines: string[] = [];

  // Read in chunks until no more data
  let hasMoreData = true;
  while (hasMoreData) {
    const buffer = Buffer.alloc(READ_BUFFER_SIZE);
    const { bytesRead: chunkSize } = await fileHandle.read(buffer, 0, READ_BUFFER_SIZE, currentOffset);

    if (chunkSize === 0) {
      hasMoreData = false;
    } else {
      const chunk = decoder.decode(buffer.subarray(0, chunkSize), { stream: true });
      accumulated += chunk;
      currentOffset += chunkSize;
    }
  }

  // Flush any remaining bytes from the decoder
  const remaining = decoder.decode(new Uint8Array(0), { stream: false });
  accumulated += remaining;

  // Split on newlines, keeping the last fragment as lineBuffer
  const parts = accumulated.split('\n');
  const newLineBuffer = parts.pop()!;
  for (const part of parts) {
    lines.push(part);
  }

  return {
    fileHandle,
    bytesRead: currentOffset,
    lineBuffer: newLineBuffer,
    lines
  };
}

/**
 * Checks whether the sentinel flush file exists for this session (or subagent).
 *
 * The sentinel file is written by the session-end hook to signal the watcher
 * to flush remaining lines and close the stream gracefully. When `agentId` is
 * provided the stem is `{sessionId}-{agentId}`; otherwise it is `{sessionId}`.
 *
 * @param cardRepoPath - Path to the card repository.
 * @param sessionId - Session ID used to construct the sentinel path.
 * @param agentId - Optional agent ID for subagent-scoped sentinel files.
 * @returns True if the sentinel file exists.
 */
export async function sentinelFileExists(cardRepoPath: string, sessionId: string, agentId?: string): Promise<boolean> {
  try {
    await access(sentinelFilePath(cardRepoPath, sessionId, agentId));
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes the sentinel file after detection. Idempotent — handles ENOENT.
 *
 * When `agentId` is provided the stem is `{sessionId}-{agentId}`; otherwise
 * it is `{sessionId}`.
 *
 * @param cardRepoPath - Path to the card repository.
 * @param sessionId - Session ID used to construct the sentinel path.
 * @param agentId - Optional agent ID for subagent-scoped sentinel files.
 */
export async function removeSentinelFile(cardRepoPath: string, sessionId: string, agentId?: string): Promise<void> {
  try {
    await unlink(sentinelFilePath(cardRepoPath, sessionId, agentId));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

/**
 * Opens or resumes a stream for the given session.
 *
 * Creates a Cards API client and opens a stream writer. When called with
 * the same filename on a completed stream, the server appends with
 * lineNumber continuation.
 *
 * @param args - Watcher arguments containing card ID and session info.
 * @returns A StreamWriter, or null if API discovery or client creation fails.
 */
export async function openOrResumeStream(args: TranscriptWatcherArgs): Promise<StreamWriter | null> {
  const client = await createCardsClient();
  if (!client) {
    return null;
  }

  const stem = computeSentinelStem(args);
  return client.openStream(args.cardId, 'claude-code-session', `${stem}.jsonl`, {
    title: `Claude session for ${args.cardId}`,
    sessionId: args.sessionId
  });
}

/**
 * Mutable state for the streaming loop, threaded through helper functions.
 */
interface StreamingState {
  stream: StreamWriter | null;
  fileHandle: FileHandle | null;
  bytesRead: number;
  lineBuffer: string;
  idleIterations: number;
  streamFailed: boolean;
  sentinelDetected: boolean;
}

/**
 * Filters lines to non-empty content suitable for streaming.
 *
 * @param lines - Raw lines from the transcript file.
 * @returns Lines with non-empty trimmed content.
 */
function filterNonEmptyLines(lines: string[]): string[] {
  return lines.filter((line) => line.trim() !== '');
}

/**
 * Opens or resumes a stream, setting `streamFailed` on failure.
 *
 * Returns the opened stream, or null if the open failed. On failure,
 * `state.streamFailed` is set to true so callers skip future write attempts.
 *
 * @param state - Mutable streaming state.
 * @param args - Watcher arguments for API client creation.
 * @param context - Human-readable context for log messages (e.g. "for final flush").
 * @returns The opened StreamWriter, or null on failure.
 */
async function tryOpenStream(
  state: StreamingState,
  args: TranscriptWatcherArgs,
  context: string
): Promise<StreamWriter | null> {
  try {
    const stream = await openOrResumeStream(args);
    if (!stream) {
      logViaSocket('warn', `Failed to open stream ${context}(API unavailable), continuing to poll`);
      state.streamFailed = true;
      return null;
    }
    return stream;
  } catch (error) {
    logViaSocket('warn', `Failed to open stream ${context}: ${String(error)}`);
    state.streamFailed = true;
    return null;
  }
}

/**
 * Writes lines to an open stream. On the first write failure, sets
 * `state.streamFailed` and stops writing further lines.
 *
 * @param stream - The stream writer to write to.
 * @param lines - Non-empty lines to write.
 * @param state - Mutable streaming state (for setting streamFailed).
 * @param context - Human-readable context for log messages.
 */
function writeLinesToStream(stream: StreamWriter, lines: string[], state: StreamingState, context: string): void {
  for (const line of lines) {
    try {
      stream.write(line);
    } catch (error) {
      logViaSocket('error', `Stream write failed ${context}: ${String(error)}`);
      state.streamFailed = true;
      break;
    }
  }
}

/**
 * Ensures a stream is open (opening lazily if needed) and writes lines to it.
 *
 * Handles the full open-then-write sequence: if no stream exists, opens one;
 * if the open fails, sets streamFailed. Then writes all lines if a stream is
 * available.
 *
 * @param state - Mutable streaming state.
 * @param args - Watcher arguments for stream opening.
 * @param lines - Non-empty lines to write.
 * @param context - Human-readable context for log messages.
 */
async function ensureStreamAndWriteLines(
  state: StreamingState,
  args: TranscriptWatcherArgs,
  lines: string[],
  context: string
): Promise<void> {
  if (!state.stream) {
    state.stream = await tryOpenStream(state, args, context);
  }
  if (state.stream && !state.streamFailed) {
    writeLinesToStream(state.stream, lines, state, context);
  }
}

/**
 * Reads new transcript lines and updates the streaming state.
 *
 * On read failure, logs the error and returns an empty array so the polling
 * loop can continue. Transcript read errors are transient (e.g. file rotation)
 * and retried on the next poll.
 *
 * @param state - Mutable streaming state (fileHandle, bytesRead, lineBuffer updated in place).
 * @param transcriptPath - Path to the transcript JSONL file.
 * @returns Non-empty lines read from the transcript.
 */
async function pollTranscript(state: StreamingState, transcriptPath: string): Promise<string[]> {
  let lines: string[];
  try {
    const result = await readNewLines(state.fileHandle, state.bytesRead, state.lineBuffer, transcriptPath);
    state.fileHandle = result.fileHandle;
    state.bytesRead = result.bytesRead;
    state.lineBuffer = result.lineBuffer;
    lines = result.lines;
  } catch (error) {
    logViaSocket('error', `Failed to read transcript: ${String(error)}`);
    lines = [];
  }
  return filterNonEmptyLines(lines);
}

/**
 * Closes the stream when the idle timeout has elapsed with no new data.
 *
 * Increments the idle counter and, once cumulative idle time reaches
 * {@link IDLE_TIMEOUT_MS}, closes the current stream so the server
 * can finalize the segment. The stream is reopened lazily if data arrives later.
 *
 * @param state - Mutable streaming state.
 */
async function closeStreamOnIdleTimeout(state: StreamingState): Promise<void> {
  state.idleIterations++;

  if (!state.stream || state.idleIterations * POLL_INTERVAL_MS < IDLE_TIMEOUT_MS) {
    return;
  }

  try {
    await state.stream.close();
  } catch (error) {
    logViaSocket('error', `Stream close failed during idle timeout: ${String(error)}`);
  }
  state.stream = null;
  state.idleIterations = 0;
}

/**
 * Reads remaining transcript data and flushes it to the stream.
 *
 * Performs a final read from the transcript file, collects any remaining
 * complete lines plus the lineBuffer contents, and writes them to the stream.
 *
 * @param state - Mutable streaming state.
 * @param args - Watcher arguments.
 */
async function flushRemainingLines(state: StreamingState, args: TranscriptWatcherArgs): Promise<void> {
  if (!state.fileHandle) return;

  try {
    const result = await readNewLines(state.fileHandle, state.bytesRead, state.lineBuffer, args.transcriptPath);
    const allRemainingLines = [...result.lines];
    if (result.lineBuffer.trim() !== '') {
      allRemainingLines.push(result.lineBuffer);
    }

    const nonEmptyFinalLines = filterNonEmptyLines(allRemainingLines);
    if (nonEmptyFinalLines.length > 0 && !state.streamFailed) {
      await ensureStreamAndWriteLines(state, args, nonEmptyFinalLines, 'for final flush ');
    }
  } catch (error) {
    logViaSocket('error', `Failed to read transcript during final flush: ${String(error)}`);
  }
}

/**
 * Closes open resources after the streaming loop exits.
 *
 * Closes the stream writer, removes the sentinel file if it was detected,
 * and closes the transcript file handle. Each step is independent and
 * logs on failure without propagating.
 *
 * @param state - Mutable streaming state.
 * @param args - Watcher arguments for sentinel file path.
 */
async function cleanupResources(state: StreamingState, args: TranscriptWatcherArgs): Promise<void> {
  if (state.stream) {
    try {
      await state.stream.close();
    } catch (error) {
      logViaSocket('error', `Stream close failed during exit: ${String(error)}`);
    }
  }

  if (state.sentinelDetected) {
    try {
      await removeSentinelFile(args.cardRepoPath, args.sessionId, args.agentId);
    } catch (error) {
      logViaSocket('error', `Failed to remove sentinel file: ${String(error)}`);
    }
  }

  if (state.fileHandle) {
    try {
      await state.fileHandle.close();
    } catch (error) {
      logViaSocket('error', `Failed to close file handle: ${String(error)}`);
    }
  }
}

/**
 * Runs the main streaming loop that tails the transcript file and streams
 * lines to the Cards API in real-time.
 *
 * The loop:
 * 1. Reads new lines from the transcript file
 * 2. Opens a stream lazily on first data and writes lines
 * 3. Closes the stream after IDLE_TIMEOUT_MS of inactivity
 * 4. Resumes the stream when new data arrives
 * 5. Exits on sentinel file, PID death, or max lifetime
 *
 * @param args - Watcher arguments.
 */
export async function runStreamingLoop(args: TranscriptWatcherArgs): Promise<void> {
  const state: StreamingState = {
    stream: null,
    fileHandle: null,
    bytesRead: 0,
    lineBuffer: '',
    idleIterations: 0,
    streamFailed: false,
    sentinelDetected: false
  };

  const startTime = Date.now();

  for (;;) {
    const nonEmptyLines = await pollTranscript(state, args.transcriptPath);

    if (nonEmptyLines.length > 0 && !state.streamFailed) {
      await ensureStreamAndWriteLines(state, args, nonEmptyLines, '');
      state.idleIterations = 0;
    } else if (nonEmptyLines.length === 0) {
      await closeStreamOnIdleTimeout(state);
    }

    if (await sentinelFileExists(args.cardRepoPath, args.sessionId, args.agentId)) {
      state.sentinelDetected = true;
      break;
    }
    if (!isProcessAlive(args.pid)) break;
    if (Date.now() - startTime >= MAX_LIFETIME_MS) {
      logViaSocket('warn', `Watcher exceeded maximum lifetime (${MAX_LIFETIME_MS}ms), exiting`);
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  // Post-loop: flush remaining data and clean up
  await flushRemainingLines(state, args);
  await cleanupResources(state, args);
}

/**
 * Main entry point for the detached watcher process.
 *
 * Connects to the log socket, parses arguments, and enters the streaming
 * loop that tails the transcript and streams lines to the Cards API.
 */
export async function main(): Promise<void> {
  const socketPath = process.env['SOCKET_PATH'];
  if (socketPath) {
    try {
      await connectLogSocket(socketPath);
    } catch (_) {
      // Intentionally suppressed: the socket is provided by the wrapper
      // ancestor process and may have already closed. The watcher operates
      // correctly without logging.
    }
  }

  const args = parseArgs(process.argv);
  logViaSocket('info', `Watcher started for PID ${String(args.pid)}, session ${args.sessionId}`);

  await runStreamingLoop(args);
  logViaSocket('info', `Watcher completed for session ${args.sessionId}`);
}

if (process.argv[1]?.endsWith('transcript-watcher.mjs') || process.argv[1]?.endsWith('transcript-watcher.ts')) {
  main().catch((error) => {
    logViaSocket('error', `Watcher fatal error: ${String(error)}`);
    process.exitCode = 1;
  });
}
