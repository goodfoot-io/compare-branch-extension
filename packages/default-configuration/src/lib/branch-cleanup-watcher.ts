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
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCardsClient } from '@cards/sdk/client/discovery';
import { Logger } from '@cards/sdk/config';
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
 * and survives parent exit. Stdout and stderr are discarded; errors are
 * written to the shared action-handler log file in the repo root.
 *
 * @param params - Parameters for the cleanup run.
 */
export function spawnBranchCleanupWatcher(params: BranchCleanupParams): void {
  // `fileURLToPath` (not `new URL(...).pathname`) so the path is a real OS path
  // on win32: `new URL(import.meta.url).pathname` yields `/C:/Users/…`, which is
  // not a spawnable script path. Mirrors wrapper.ts's spawnDetachedCleanup.
  const selfPath = fileURLToPath(import.meta.url);
  const nodeBin = process.execPath;

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
      windowsHide: true
    });
  } catch (error) {
    // Fail-open: log and return; cleanup will not run this session
    console.error(`[branch-cleanup-watcher] Failed to spawn watcher: ${errorMessage(error)}`);
    return;
  }

  child.stdin!.on('error', (err) => {
    // The parent may exit before stdin is fully drained; this is expected
    console.error(`[branch-cleanup-watcher] Stdin pipe error: ${errorMessage(err)}`);
  });

  child.stdin!.write(`${JSON.stringify(params)}\n`);
  child.stdin!.end();

  child.unref();
}

// ============================================================================
// Detached entry point
// ============================================================================

if (process.argv.includes('--branch-cleanup')) {
  const chunks: Buffer[] = [];

  process.stdin.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  process.stdin.on('end', () => {
    void (async () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      let params: BranchCleanupParams;
      try {
        params = JSON.parse(raw) as BranchCleanupParams;
      } catch (error) {
        console.error(`[branch-cleanup-watcher] Failed to parse params: ${errorMessage(error)}`);
        process.exit(1);
      }

      const { cardId, repoRoot, cardRepoPath, sessionId } = params;

      const input = { cardId, repoRoot };

      const client = await createCardsClient();
      if (!client) {
        throw new Error('Cards API discovery failed — cannot run branch cleanup');
      }

      const logger = new Logger({
        logFilePath: path.join(repoRoot, '.cards', 'logs', 'cards-default-configuration-hooks.log')
      });

      try {
        await cleanupMergedBranches(input, cardRepoPath, logger, sessionId);
      } catch (error) {
        const message = errorMessage(error);
        logger.error('Branch cleanup watcher failed', { error: message, sessionId });
      } finally {
        logger.close();
      }
    })();
  });
}
