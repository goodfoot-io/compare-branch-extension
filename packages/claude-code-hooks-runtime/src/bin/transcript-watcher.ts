/**
 * Detached transcript watcher process.
 *
 * Spawned by session-start to monitor a Claude PID and upload the transcript
 * if the process exits without the session-end hook having run (crash/SIGKILL).
 * Uses `kill(pid, 0)` polling and checks for the stream file in the card repo
 * to avoid duplicate uploads.
 *
 * @summary Detached transcript watcher for crash-resilient uploads
 */

import { access, readFile } from 'node:fs/promises';
import * as net from 'node:net';
import { join } from 'node:path';
import { createCardsClient } from '../lib/api-discovery.js';

/** Polling interval for PID liveness checks (5 seconds). */
export const POLL_INTERVAL_MS = 5_000;

/** Maximum watcher lifetime before forced exit (24 hours). */
export const MAX_LIFETIME_MS = 24 * 60 * 60 * 1_000;

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
  } catch {
    // Fail-open: logging failures must not affect watcher operation
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
 * Polls until the given PID exits or the maximum lifetime is exceeded.
 *
 * @param pid - Process ID to wait for.
 */
export async function waitForProcessExit(pid: number): Promise<void> {
  const startTime = Date.now();
  while (isProcessAlive(pid)) {
    if (Date.now() - startTime >= MAX_LIFETIME_MS) {
      logViaSocket('warn', `Watcher exceeded maximum lifetime (${MAX_LIFETIME_MS}ms), exiting`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Checks whether the stream file already exists in the card repo.
 *
 * The presence of the stream file indicates that the session-end hook
 * already uploaded the transcript, so the watcher should skip upload.
 *
 * @param cardRepoPath - Path to the card repository.
 * @param sessionId - Session ID used to construct the expected filename.
 * @returns True if the stream file exists.
 */
export async function streamFileExists(cardRepoPath: string, sessionId: string): Promise<boolean> {
  try {
    await access(join(cardRepoPath, 'streams', 'claude-code-session', `${sessionId}.jsonl`));
    return true;
  } catch {
    return false;
  }
}

/**
 * Uploads the transcript file to the card repo via the Cards API.
 *
 * Skips upload when the stream file already exists (session-end already uploaded).
 * Handles missing transcript file, API discovery failure, and stream errors gracefully.
 *
 * @param args - Watcher arguments containing paths and identifiers.
 */
export async function uploadTranscript(args: TranscriptWatcherArgs): Promise<void> {
  // Check if session-end already uploaded
  if (await streamFileExists(args.cardRepoPath, args.sessionId)) {
    logViaSocket('info', `Stream file already exists for session ${args.sessionId}, skipping upload`);
    return;
  }

  // Read transcript file
  let content: string;
  try {
    content = await readFile(args.transcriptPath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logViaSocket('warn', `Transcript file not found: ${args.transcriptPath}`);
      return;
    }
    throw error;
  }

  // Create API client
  const client = await createCardsClient();
  if (!client) {
    logViaSocket('warn', 'API discovery failed, cannot upload transcript');
    return;
  }

  // Open stream and write lines
  try {
    const stream = client.openStream(args.cardId, 'claude-code-session', `${args.sessionId}.jsonl`, {
      title: `Claude session for ${args.cardId}`,
      sessionId: args.sessionId
    });

    const lines = content.split('\n');
    for (const line of lines) {
      if (line.length > 0) {
        stream.write(line);
      }
    }

    await stream.close();
  } catch (error) {
    logViaSocket('error', `Failed to upload transcript: ${String(error)}`);
  }
}

/**
 * Main entry point for the detached watcher process.
 *
 * Connects to the log socket, parses arguments, waits for the monitored
 * PID to exit, then attempts transcript upload.
 */
export async function main(): Promise<void> {
  const socketPath = process.env['SOCKET_PATH'];
  if (socketPath) {
    try {
      await connectLogSocket(socketPath);
    } catch {
      // Continue without logging — socket may not be available
    }
  }

  const args = parseArgs(process.argv);
  logViaSocket('info', `Watcher started for PID ${String(args.pid)}, session ${args.sessionId}`);

  await waitForProcessExit(args.pid);
  logViaSocket('info', `PID ${String(args.pid)} exited, checking transcript upload`);

  await uploadTranscript(args);
  logViaSocket('info', `Watcher completed for session ${args.sessionId}`);
}

if (process.argv[1]?.endsWith('transcript-watcher.mjs') || process.argv[1]?.endsWith('transcript-watcher.ts')) {
  main().catch((error) => {
    logViaSocket('error', `Watcher fatal error: ${String(error)}`);
    process.exitCode = 1;
  });
}
