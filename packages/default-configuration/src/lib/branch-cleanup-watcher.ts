/**
 * Detached branch-cleanup watcher for interactive sessions.
 *
 * Provides a fire-and-forget mechanism for running branch cleanup after the
 * interactive CLI exits. The watcher spawns itself as a detached Node.js
 * process, receives cleanup parameters via stdin, calls
 * {@link cleanupMergedBranches}, then exits.
 *
 * @summary Detached branch-cleanup watcher for interactive sessions
 * @module
 */

import { type ChildProcess, spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCardsClient } from '@cards.management/sdk/client/discovery';
import type { ActionContext } from '@cards.management/sdk/config';
import { Logger } from '@cards.management/sdk/config';
import { cleanupMergedBranches, errorMessage } from './claude-session.js';

/**
 * Parameters required to run branch cleanup in a detached process.
 */
export interface BranchCleanupParams {
  /** The card ID for the session being cleaned up. */
  cardId: string;
  /** Absolute path to the repository root. */
  repoRoot: string;
  /** Absolute path to the card's git repository. */
  cardRepoPath: string;
  /** Optional session ID for log correlation. */
  sessionId?: string;
}

/**
 * Spawns a detached Node.js process that calls {@link cleanupMergedBranches}
 * after receiving serialized parameters via stdin.
 *
 * The spawned process is fully detached (`detached: true`, `child.unref()`)
 * and survives parent exit. Stdout and stderr are discarded; errors and
 * lifecycle events are written via the supplied `logger`. The child is also
 * handed a `CARDS_HOOKS_LOG_FILE` env var pointing at the same log file so it
 * can construct its own working `Logger` before it has parsed anything off
 * stdin.
 *
 * @param params - Parameters for the cleanup run.
 * @param logger - Logger used for spawn/exit lifecycle diagnostics.
 */
export function spawnBranchCleanupWatcher(params: BranchCleanupParams, logger: ActionContext['logger']): void {
  // `fileURLToPath` (not `new URL(...).pathname`) so the path is a real OS path
  // on win32: `new URL(import.meta.url).pathname` yields `/C:/Users/…`, which is
  // not a spawnable script path. Mirrors wrapper.ts's spawnDetachedCleanup.
  const selfPath = fileURLToPath(import.meta.url);
  const nodeBin = process.execPath;

  const logFilePath = path.join(params.repoRoot, '.cards', 'logs', 'cards-default-configuration-hooks.log');

  let child: ChildProcess;
  try {
    child = spawn(nodeBin, [selfPath, '--branch-cleanup'], {
      detached: true,
      stdio: ['pipe', 'ignore', 'ignore'],
      // Detached, console-less root. On win32 the interpreter is now a stock
      // console-subsystem `node.exe` which does not hide windows by default, so
      // without `windowsHide: true` the detached child (and its `git`
      // descendants) would pop console windows. No stdio fd is inherited here, so
      // libuv honors CREATE_NO_WINDOW. No-op on POSIX.
      windowsHide: true,
      // Give the detached child a working Logger target before it has even
      // parsed stdin — see resolveLogFilePath() in the SDK's Logger, which
      // checks this env var before falling back to repo-root discovery.
      env: { ...process.env, CARDS_HOOKS_LOG_FILE: logFilePath }
    });
  } catch (error) {
    // Fail-open: log and return; cleanup will not run this session
    logger.error('Branch-cleanup watcher failed to spawn', {
      error: errorMessage(error),
      cardId: params.cardId,
      sessionId: params.sessionId
    });
    return;
  }

  logger.info('Branch-cleanup watcher spawned', {
    pid: child.pid,
    cardId: params.cardId,
    sessionId: params.sessionId
  });

  child.on('exit', (code, signal) => {
    logger.info('Branch-cleanup watcher process exited', {
      pid: child.pid,
      code,
      signal,
      cardId: params.cardId,
      sessionId: params.sessionId
    });
  });

  child.stdin!.on('error', (err) => {
    // The parent may exit before stdin is fully drained; this is expected
    logger.warn('Branch-cleanup watcher stdin pipe error', {
      error: errorMessage(err),
      cardId: params.cardId,
      sessionId: params.sessionId
    });
  });

  child.stdin!.write(`${JSON.stringify(params)}\n`);
  child.stdin!.end();

  child.unref();
}

// ============================================================================
// Detached entry point
// ============================================================================

// How long the detached process waits for params on stdin before giving up.
const STDIN_TIMEOUT_MS = 10_000;

/**
 * Writes a marker file recording that a cleanup attempt started for this
 * card/session, so an external observer can distinguish "cleanup never
 * started" from "cleanup started but the process was killed before it could
 * log completion." Degrades gracefully: a failure to create the marker is
 * logged and swallowed, matching this file's fail-open posture.
 *
 * @param cardId - The card ID for the session being cleaned up.
 * @param sessionId - Optional session ID for correlation.
 * @param logger - Logger for diagnostic output.
 * @returns The absolute marker path on success, or `undefined` if it could not be written.
 */
async function writeCleanupMarker(
  cardId: string,
  sessionId: string | undefined,
  logger: Logger
): Promise<string | undefined> {
  const markerDir = path.join(os.homedir(), '.cards', 'branch-cleanup-markers');
  const markerPath = path.join(markerDir, `${cardId}-${sessionId ?? 'unknown'}.json`);
  try {
    await fs.mkdir(markerDir, { recursive: true });
    await fs.writeFile(markerPath, JSON.stringify({ startedAt: new Date().toISOString() }));
    return markerPath;
  } catch (error) {
    logger.warn('Branch-cleanup watcher failed to write cleanup-attempt marker', {
      error: errorMessage(error),
      cardId,
      sessionId
    });
    return undefined;
  }
}

/**
 * Removes a cleanup-attempt marker written by {@link writeCleanupMarker}.
 * Failures are logged and swallowed — a marker that fails to delete is a
 * stale-but-harmless leftover, not a reason to fail the cleanup run.
 *
 * @param markerPath - Absolute path to the marker file.
 * @param logger - Logger for diagnostic output.
 */
async function removeCleanupMarker(markerPath: string, logger: Logger): Promise<void> {
  try {
    await fs.rm(markerPath, { force: true });
  } catch (error) {
    logger.warn('Branch-cleanup watcher failed to remove cleanup-attempt marker', {
      error: errorMessage(error),
      markerPath
    });
  }
}

/**
 * Runs the detached branch-cleanup entry point: reads serialized
 * {@link BranchCleanupParams} from `stdin`, then calls
 * {@link cleanupMergedBranches}.
 *
 * Constructs its `Logger` immediately — before touching `stdin` at all — so
 * every failure mode between process start and cleanup completion leaves a
 * trace, including the stdin-timeout and JSON-parse-failure paths that
 * previously exited silently. The `Logger` resolves its target file via the
 * `CARDS_HOOKS_LOG_FILE` env var the parent sets in
 * {@link spawnBranchCleanupWatcher}.
 *
 * @param stdin - Readable stream to read serialized params from. Defaults to
 *   `process.stdin`; overridable so tests can inject a fake stream.
 * @returns `0` on success, `1` on any failure (stdin timeout, parse failure,
 *   or cleanup failure).
 */
export async function runDetachedCleanup(stdin: NodeJS.ReadableStream = process.stdin): Promise<number> {
  const logger = new Logger();
  logger.info('Branch-cleanup watcher process started', { pid: process.pid });

  // Mirrors executeCommand()'s parent-process SIGHUP handler (runtime.ts) —
  // the detached child gets its own process group via `detached: true`, but
  // nothing guarantees it can't still receive SIGHUP (e.g. if it inherits a
  // group before unref). This only logs receipt; it does not change exit
  // behavior.
  process.on('SIGHUP', () => {
    logger.info('Branch-cleanup watcher received SIGHUP');
  });

  return new Promise<number>((resolve) => {
    const chunks: Buffer[] = [];

    // Fail-safe: if the parent dies before writing params, don't hang forever.
    const stdinTimer: ReturnType<typeof setTimeout> = setTimeout(() => {
      logger.error('Branch-cleanup watcher timed out waiting for stdin params', { timeoutMs: STDIN_TIMEOUT_MS });
      logger.close();
      process.exitCode = 1;
      resolve(1);
      process.exit(1);
    }, STDIN_TIMEOUT_MS);

    stdin.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    stdin.on('end', () => {
      clearTimeout(stdinTimer);

      void (async () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let params: BranchCleanupParams | undefined;
        try {
          params = JSON.parse(raw) as BranchCleanupParams;
        } catch (_error) {
          // Fatal: can't parse params. Unlike the pre-refactor version, the
          // logger already exists (it resolved via CARDS_HOOKS_LOG_FILE, set
          // by the parent before spawn), so this failure is no longer silent.
          logger.error('Branch-cleanup watcher failed to parse stdin params', { rawLength: raw.length });
          logger.close();
          process.exitCode = 1;
          resolve(1);
          process.exit(1);
        }

        // `process.exit()` above is `never`-typed and always terminates the
        // real process; this guard only matters in tests where it's stubbed,
        // so execution doesn't fall through into the destructure below with
        // an unset `params`.
        if (params === undefined) return;

        const { cardId, repoRoot, cardRepoPath, sessionId } = params;
        const input = { cardId, repoRoot };
        logger.info('Branch-cleanup watcher started', { cardId, sessionId });

        let markerPath: string | undefined;
        try {
          const client = await createCardsClient();
          if (!client) {
            throw new Error('Cards API discovery failed — cannot run branch cleanup');
          }

          markerPath = await writeCleanupMarker(cardId, sessionId, logger);

          const startedAt = performance.now();
          await cleanupMergedBranches(input, cardRepoPath, logger, sessionId);
          logger.info('Branch-cleanup watcher completed successfully', {
            cardId,
            sessionId,
            elapsedMs: Math.round(performance.now() - startedAt)
          });
          resolve(0);
        } catch (error) {
          const message = errorMessage(error);
          logger.error('Branch-cleanup watcher failed', { error: message, cardId, sessionId });
          resolve(1);
        } finally {
          if (markerPath) await removeCleanupMarker(markerPath, logger);
          logger.close();
        }
      })();
    });
  });
}

if (process.argv.includes('--branch-cleanup')) {
  void runDetachedCleanup().then((code) => {
    process.exitCode = code;
  });
}
