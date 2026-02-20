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
 * Expects argv in the format `[node, script, pid, sessionId, transcriptPath, cardId, cardRepoPath]`.
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
  } catch {
    return false;
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

  return client.openStream(args.cardId, 'claude-code-session', `${args.sessionId}.jsonl`, {
    title: `Claude session for ${args.cardId}`,
    sessionId: args.sessionId
  });
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
  let stream: StreamWriter | null = null;
  let fileHandle: FileHandle | null = null;
  let bytesRead = 0;
  let lineBuffer = '';
  let idleIterations = 0;
  let streamFailed = false;
  let sentinelDetected = false;

  const startTime = Date.now();
  let running = true;

  // Main polling loop
  while (running) {
    // 1. Read new lines from transcript
    let lines: string[];
    try {
      const result = await readNewLines(fileHandle, bytesRead, lineBuffer, args.transcriptPath);
      fileHandle = result.fileHandle;
      bytesRead = result.bytesRead;
      lineBuffer = result.lineBuffer;
      lines = result.lines;
    } catch (error) {
      logViaSocket('error', `Failed to read transcript: ${String(error)}`);
      lines = [];
    }

    // Filter to non-empty lines for writing
    const nonEmptyLines = lines.filter((line) => line.trim() !== '');

    // 2. If new lines available AND NOT streamFailed, write them
    if (nonEmptyLines.length > 0 && !streamFailed) {
      // Open stream lazily on first data
      if (!stream) {
        try {
          stream = await openOrResumeStream(args);
          if (!stream) {
            logViaSocket('warn', 'Failed to open stream (API unavailable), continuing to poll');
            streamFailed = true;
          }
        } catch (error) {
          logViaSocket('warn', `Failed to open stream: ${String(error)}`);
          streamFailed = true;
        }
      }

      if (stream && !streamFailed) {
        for (const line of nonEmptyLines) {
          try {
            stream.write(line);
          } catch (error) {
            logViaSocket('error', `Stream write failed: ${String(error)}`);
            streamFailed = true;
            break;
          }
        }
      }

      idleIterations = 0;
    } else if (nonEmptyLines.length === 0) {
      // 3. No new lines — increment idle counter
      idleIterations++;

      // Close stream after idle timeout
      if (stream && idleIterations * POLL_INTERVAL_MS >= IDLE_TIMEOUT_MS) {
        try {
          await stream.close();
        } catch (error) {
          logViaSocket('error', `Stream close failed during idle timeout: ${String(error)}`);
        }
        stream = null;
        idleIterations = 0;
      }
    }

    // 4. Check exit conditions
    if (await sentinelFileExists(args.cardRepoPath, args.sessionId)) {
      sentinelDetected = true;
      running = false;
    } else if (!isProcessAlive(args.pid)) {
      running = false;
    } else if (Date.now() - startTime >= MAX_LIFETIME_MS) {
      logViaSocket('warn', `Watcher exceeded maximum lifetime (${MAX_LIFETIME_MS}ms), exiting`);
      running = false;
    }

    // 5. Sleep (only if still running)
    if (running) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  // Post-loop: Final flush
  // Read any remaining data from the transcript
  if (fileHandle) {
    try {
      const result = await readNewLines(fileHandle, bytesRead, lineBuffer, args.transcriptPath);
      lineBuffer = result.lineBuffer;
      const finalLines = result.lines;

      // Collect all remaining lines (including lineBuffer content)
      const allRemainingLines = [...finalLines];
      if (lineBuffer.trim() !== '') {
        allRemainingLines.push(lineBuffer);
      }

      const nonEmptyFinalLines = allRemainingLines.filter((line) => line.trim() !== '');

      // Write remaining lines if stream is available
      if (nonEmptyFinalLines.length > 0 && !streamFailed) {
        if (!stream) {
          try {
            stream = await openOrResumeStream(args);
            if (!stream) {
              logViaSocket('warn', 'Failed to open stream for final flush');
            }
          } catch (error) {
            logViaSocket('warn', `Failed to open stream for final flush: ${String(error)}`);
          }
        }

        if (stream) {
          for (const line of nonEmptyFinalLines) {
            try {
              stream.write(line);
            } catch (error) {
              logViaSocket('error', `Stream write failed during final flush: ${String(error)}`);
              break;
            }
          }
        }
      }
    } catch (error) {
      logViaSocket('error', `Failed to read transcript during final flush: ${String(error)}`);
    }
  }

  // Close stream if open
  if (stream) {
    try {
      await stream.close();
    } catch (error) {
      logViaSocket('error', `Stream close failed during exit: ${String(error)}`);
    }
  }

  // Remove sentinel file if detected
  if (sentinelDetected) {
    try {
      await removeSentinelFile(args.cardRepoPath, args.sessionId);
    } catch (error) {
      logViaSocket('error', `Failed to remove sentinel file: ${String(error)}`);
    }
  }

  // Close file handle
  if (fileHandle) {
    try {
      await fileHandle.close();
    } catch (error) {
      logViaSocket('error', `Failed to close file handle: ${String(error)}`);
    }
  }
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
