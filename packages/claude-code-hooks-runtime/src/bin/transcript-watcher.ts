/**
 * Detached transcript watcher process.
 *
 * Spawned by session-start to monitor a Claude PID and stream the transcript
 * to the Cards API in real-time. Tails the transcript JSONL file, streaming
 * lines as they appear with WebSocket-backed session lifecycle. Exits on
 * sentinel file detection (graceful shutdown), PID death (crash), or max
 * lifetime timeout.
 *
 * @summary Detached transcript watcher for real-time transcript streaming
 */

import type { FileHandle } from 'node:fs/promises';
import { access, open, unlink } from 'node:fs/promises';
import * as net from 'node:net';
import { join } from 'node:path';
import type { WsStreamSession } from '@cards/sdk/client';
import { createCardsClient } from '../lib/api-discovery.js';

/** Polling interval for transcript tailing and PID liveness checks (1 second). */
export const POLL_INTERVAL_MS = 1_000;

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

  for (;;) {
    const buffer = Buffer.alloc(READ_BUFFER_SIZE);
    const { bytesRead: chunkSize } = await fileHandle.read(buffer, 0, READ_BUFFER_SIZE, currentOffset);
    if (chunkSize === 0) break;

    accumulated += decoder.decode(buffer.subarray(0, chunkSize), { stream: true });
    currentOffset += chunkSize;
  }

  // Flush any remaining bytes from the decoder
  accumulated += decoder.decode(new Uint8Array(0), { stream: false });

  // Split on newlines, keeping the last fragment as lineBuffer
  const parts = accumulated.split('\n');
  const newLineBuffer = parts.pop()!;

  return {
    fileHandle,
    bytesRead: currentOffset,
    lineBuffer: newLineBuffer,
    lines: parts
  };
}

/**
 * Checks whether the sentinel flush file exists for this session.
 *
 * The sentinel file is written by the session-end hook to signal the watcher
 * to flush remaining lines and close the stream gracefully.
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
 * Reads the transcript file from byte 0, counting newlines until `lineCount` lines
 * have been passed. Returns the byte offset immediately after the Nth newline.
 *
 * Used on reconnect when the server is behind the watcher's current file position.
 *
 * @param transcriptPath - Path to the transcript JSONL file.
 * @param lineCount - Number of complete lines to skip.
 * @returns Byte offset after the Nth newline in the file.
 */
export async function seekToLine(transcriptPath: string, lineCount: number): Promise<{ bytesRead: number }> {
  if (lineCount === 0) return { bytesRead: 0 };

  const handle = await open(transcriptPath, 'r');
  try {
    let offset = 0;
    let linesFound = 0;
    const buffer = Buffer.alloc(READ_BUFFER_SIZE);
    for (;;) {
      const { bytesRead: chunkSize } = await handle.read(buffer, 0, READ_BUFFER_SIZE, offset);
      if (chunkSize === 0) break;

      for (let i = 0; i < chunkSize; i++) {
        if (buffer[i] === 0x0a) {
          // newline byte
          linesFound++;
          if (linesFound >= lineCount) {
            return { bytesRead: offset + i + 1 };
          }
        }
      }
      offset += chunkSize;
    }
    return { bytesRead: offset };
  } finally {
    await handle.close();
  }
}

/**
 * Opens a WebSocket stream session for the given session.
 *
 * Creates a Cards API client and opens a WebSocket stream session. The session
 * already knows the server's current line count (resumeFrom) when returned.
 *
 * @param args - Watcher arguments containing card ID and session info.
 * @returns A WsStreamSession, or null if API discovery or client creation fails.
 */
export async function openOrResumeWebSocketSession(args: TranscriptWatcherArgs): Promise<WsStreamSession | null> {
  const client = await createCardsClient();
  if (!client) {
    return null;
  }

  return client.openStreamWebSocket(args.cardId, 'claude-code-session', `${args.sessionId}.jsonl`, {
    title: `Claude session for ${args.cardId}`,
    sessionId: args.sessionId
  });
}

/**
 * Mutable state for the streaming loop, threaded through helper functions.
 */
interface StreamingState {
  wsSession: WsStreamSession | null;
  localLineCount: number; // lines counted so far in this watcher instance
  fileHandle: FileHandle | null;
  bytesRead: number;
  lineBuffer: string;
  consecutiveFailures: number;
  sentinelDetected: boolean;
}

/**
 * Result returned by `pollTranscript` — new read position without mutating state.
 * The caller advances state only after a successful write.
 */
interface PollResult {
  lines: string[];
  newBytesRead: number;
  newLineBuffer: string;
}

/** After this many consecutive failures, log only every Nth failure to avoid flooding. */
const LOG_SUPPRESSION_THRESHOLD = 10;

/**
 * Returns true if this failure should be logged (below threshold or every Nth above it).
 *
 * @param state - Mutable streaming state.
 * @returns True when the failure should be logged; false when suppressed.
 */
function shouldLogFailure(state: StreamingState): boolean {
  return (
    state.consecutiveFailures < LOG_SUPPRESSION_THRESHOLD || state.consecutiveFailures % LOG_SUPPRESSION_THRESHOLD === 0
  );
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
 * Opens or resumes a WebSocket session, adjusting read position based on server's resumeFrom.
 *
 * Returns the opened session, or null if the open failed. On failure,
 * increments `state.consecutiveFailures` so the watcher can track and log
 * persistent outages without giving up permanently.
 *
 * @param state - Mutable streaming state.
 * @param args - Watcher arguments for API client creation.
 * @param context - Human-readable context for log messages (e.g. "for final flush").
 * @returns The opened WsStreamSession, or null on failure.
 */
async function tryOpenSession(
  state: StreamingState,
  args: TranscriptWatcherArgs,
  context: string
): Promise<WsStreamSession | null> {
  try {
    const session = await openOrResumeWebSocketSession(args);
    if (!session) {
      state.consecutiveFailures++;
      if (shouldLogFailure(state)) {
        logViaSocket('warn', `Failed to open WS session ${context}(API unavailable)`);
      }
      return null;
    }

    // Adjust read position based on server's resumeFrom
    const resumeFrom = session.resumeFrom;
    if (resumeFrom >= state.localLineCount) {
      // Server is caught up or ahead — continue from current bytesRead
      state.localLineCount = resumeFrom;
    } else {
      // Server is behind — seek to resumeFrom position in transcript file
      try {
        const { bytesRead: newOffset } = await seekToLine(args.transcriptPath, resumeFrom);
        state.bytesRead = newOffset;
        state.lineBuffer = '';
        state.localLineCount = resumeFrom;
      } catch (error) {
        logViaSocket('warn', `seekToLine failed for line ${String(resumeFrom)}: ${String(error)}`);
        // Continue anyway — server-side deduplication handles any duplicates
      }
    }

    return session;
  } catch (error) {
    state.consecutiveFailures++;
    if (shouldLogFailure(state)) {
      logViaSocket('warn', `Failed to open WS session ${context}: ${String(error)}`);
    }
    return null;
  }
}

/**
 * Writes lines to an open WebSocket session. On the first write failure, increments
 * `state.consecutiveFailures`, nulls the session, and stops writing further lines.
 *
 * @param session - The WebSocket session to write to.
 * @param lines - Non-empty lines to write.
 * @param state - Mutable streaming state.
 * @param context - Human-readable context for log messages.
 */
function writeLinesToStream(session: WsStreamSession, lines: string[], state: StreamingState, context: string): void {
  for (const line of lines) {
    try {
      session.write(line);
      state.localLineCount++;
    } catch (error) {
      state.consecutiveFailures++;
      if (shouldLogFailure(state)) {
        logViaSocket('error', `Stream write failed ${context}: ${String(error)}`);
      }
      state.wsSession = null;
      break;
    }
  }
}

/**
 * Ensures a WebSocket session is open (opening lazily if needed) and writes lines to it.
 *
 * Handles the full open-then-write sequence: if no session exists, opens one;
 * if the open fails, increments consecutiveFailures. Then writes all lines if
 * a session is available. Resets consecutiveFailures to 0 after a successful
 * write batch (confirmed by state.wsSession still being non-null after the write).
 *
 * @param state - Mutable streaming state.
 * @param args - Watcher arguments for session opening.
 * @param lines - Non-empty lines to write.
 * @param context - Human-readable context for log messages.
 */
async function ensureStreamAndWriteLines(
  state: StreamingState,
  args: TranscriptWatcherArgs,
  lines: string[],
  context: string
): Promise<void> {
  if (!state.wsSession) {
    state.wsSession = await tryOpenSession(state, args, context);
  }
  if (state.wsSession) {
    const sessionBeforeWrite = state.wsSession;
    writeLinesToStream(state.wsSession, lines, state, context);
    if (state.wsSession) {
      // Write batch succeeded — confirmed end-to-end health
      state.consecutiveFailures = 0;
    } else {
      // Write failed — session was nulled; attempt best-effort close
      try {
        await sessionBeforeWrite.close();
      } catch (_) {
        // Intentionally suppressed: the session is already broken; close is best-effort
      }
    }
  }
}

/**
 * Reads new transcript lines without mutating bytesRead or lineBuffer on state.
 *
 * Returns a PollResult so the caller can advance state only after a successful
 * write — enabling bytesRead rollback on write failure. state.fileHandle IS
 * mutated because the handle is opened on first access and stays open.
 *
 * On read failure, logs the error and returns an empty result preserving the
 * current read position so the next poll retries from the same offset.
 *
 * @param state - Mutable streaming state (fileHandle updated in place; bytesRead/lineBuffer are NOT mutated).
 * @param transcriptPath - Path to the transcript JSONL file.
 * @returns PollResult with filtered lines and new read position.
 */
async function pollTranscript(state: StreamingState, transcriptPath: string): Promise<PollResult> {
  try {
    const result = await readNewLines(state.fileHandle, state.bytesRead, state.lineBuffer, transcriptPath);
    state.fileHandle = result.fileHandle;
    return {
      lines: filterNonEmptyLines(result.lines),
      newBytesRead: result.bytesRead,
      newLineBuffer: result.lineBuffer
    };
  } catch (error) {
    logViaSocket('error', `Failed to read transcript: ${String(error)}`);
    return {
      lines: [],
      newBytesRead: state.bytesRead,
      newLineBuffer: state.lineBuffer
    };
  }
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
    state.bytesRead = result.bytesRead;
    state.lineBuffer = result.lineBuffer;
    const allRemainingLines = [...result.lines];
    if (result.lineBuffer.trim() !== '') {
      allRemainingLines.push(result.lineBuffer);
    }

    const nonEmptyFinalLines = filterNonEmptyLines(allRemainingLines);
    if (nonEmptyFinalLines.length > 0) {
      await ensureStreamAndWriteLines(state, args, nonEmptyFinalLines, 'for final flush ');
    }
  } catch (error) {
    logViaSocket('error', `Failed to read transcript during final flush: ${String(error)}`);
  }
}

/**
 * Closes open resources after the streaming loop exits.
 *
 * Closes the WebSocket session, removes the sentinel file if it was detected,
 * and closes the transcript file handle. Each step is independent and
 * logs on failure without propagating.
 *
 * @param state - Mutable streaming state.
 * @param args - Watcher arguments for sentinel file path.
 */
async function cleanupResources(state: StreamingState, args: TranscriptWatcherArgs): Promise<void> {
  if (state.wsSession) {
    try {
      await state.wsSession.close();
    } catch (error) {
      logViaSocket('error', `Stream close failed during exit: ${String(error)}`);
    }
  }

  if (state.sentinelDetected) {
    try {
      await removeSentinelFile(args.cardRepoPath, args.sessionId);
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
 * lines to the Cards API via WebSocket in real-time.
 *
 * The loop:
 * 1. Reads new lines from the transcript file
 * 2. Opens a WebSocket session lazily on first data and writes lines
 * 3. Server ping/pong handles connection keepalive
 * 4. Reconnects on write failure via lazy session re-open
 * 5. Exits on sentinel file, PID death, or max lifetime
 *
 * @param args - Watcher arguments.
 */
export async function runStreamingLoop(args: TranscriptWatcherArgs): Promise<void> {
  const state: StreamingState = {
    wsSession: null,
    localLineCount: 0,
    fileHandle: null,
    bytesRead: 0,
    lineBuffer: '',
    consecutiveFailures: 0,
    sentinelDetected: false
  };

  const startTime = Date.now();

  for (;;) {
    const poll = await pollTranscript(state, args.transcriptPath);

    if (poll.lines.length > 0) {
      await ensureStreamAndWriteLines(state, args, poll.lines, '');
      if (state.wsSession) {
        // Write succeeded — commit the read position
        state.bytesRead = poll.newBytesRead;
        state.lineBuffer = poll.newLineBuffer;
      }
      // else: write failed, read position stays at pre-read value for retry
    } else {
      // No complete lines to write — always safe to advance position
      state.bytesRead = poll.newBytesRead;
      state.lineBuffer = poll.newLineBuffer;
      // Note: idle timeout removed — server ping/pong handles connection keepalive
    }

    if (await sentinelFileExists(args.cardRepoPath, args.sessionId)) {
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
