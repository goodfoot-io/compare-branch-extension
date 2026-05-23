/**
 * Shared process utilities for detached bin scripts.
 *
 * Extracts `isProcessAlive` from transcript-watcher so both transcript-watcher
 * and adhoc-cleanup can use it without circular imports. Also provides
 * `transitionCardStatus` (filesystem fallback for setting needs_review) and
 * `isKnownAgentComm` (comm-check gate for PID validation).
 *
 * @summary Shared process utilities for detached bin scripts
 * @module
 */

import { execFile, execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Known comm values that identify Claude agent processes.
 *
 * `comm` is the kernel command name (15-char truncated). Claude Code runs as
 * `claude` (native build) or `node` (dev / older builds). Recent Node releases
 * rename their main thread, so `/proc/<pid>/comm` reports `MainThread` for a
 * node process — accepted here as an equivalent agent comm. Anything else
 * (shells, `sleep`, unrelated binaries) fails closed.
 */
const KNOWN_AGENT_COMMS = new Set(['claude', 'node', 'MainThread']);

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
 * Minimal logger interface accepted by process utilities.
 */
export interface ProcessUtilsLogger {
  warn(message: string, data?: Record<string, unknown>): void;
}

/**
 * Validates that the given PID belongs to a known Claude agent process.
 *
 * Reads `/proc/<pid>/comm` on Linux or `ps -p <pid> -o comm=` on macOS.
 * Verifies that the comm is a known agent comm (`claude`, `node`, or the
 * `MainThread` name a node process exposes). Returns false (fail closed) on
 * any error or unexpected comm value.
 *
 * @param pid - Process ID to check.
 * @param logger - Logger for warn output when comm is unexpected.
 * @returns True if the comm is a known agent comm, false otherwise.
 */
export function isKnownAgentComm(pid: number, logger?: ProcessUtilsLogger): boolean {
  try {
    let comm: string;
    if (process.platform === 'linux') {
      comm = execFileSync('cat', [`/proc/${pid}/comm`], { encoding: 'utf-8' }).trim();
    } else {
      comm = execFileSync('ps', ['-p', String(pid), '-o', 'comm='], { encoding: 'utf-8' }).trim();
    }

    if (KNOWN_AGENT_COMMS.has(comm)) {
      return true;
    }

    logger?.warn('isKnownAgentComm: unexpected comm value — failing closed', { pid, comm });
    return false;
  } catch (error) {
    logger?.warn('isKnownAgentComm: failed to read comm — failing closed', {
      pid,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Transitions a card's status from `active` to `needs_review` via direct
 * filesystem operations on the card repository.
 *
 * Reads and modifies `CARD.meta.json` directly, then stages and commits the
 * change. This is the fallback path used when the API server is unreachable.
 * Guards against writing `needs_review` when the card is not currently `active`.
 *
 * Commit failure is logged but non-fatal — the status write still took place
 * and the post-commit hook will eventually propagate the change.
 *
 * @param cardRepoPath - Absolute path to the card's git repository.
 * @param logger - Optional logger for warn output on commit failure.
 */
export async function transitionCardStatus(cardRepoPath: string, logger?: ProcessUtilsLogger): Promise<void> {
  const metaPath = join(cardRepoPath, 'CARD.meta.json');

  let content: string;
  try {
    content = await readFile(metaPath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  const meta = JSON.parse(content) as { status?: string };
  if (meta.status !== 'active') return;

  meta.status = 'needs_review';
  await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');

  try {
    await execFileAsync('git', ['add', 'CARD.meta.json'], { cwd: cardRepoPath });
    await execFileAsync(
      'git',
      [
        'commit',
        '--no-gpg-sign',
        '-m',
        'Changed status from active to needs_review.',
        '--author',
        'system <system@cards.local>'
      ],
      { cwd: cardRepoPath }
    );
  } catch (error) {
    logger?.warn('transitionCardStatus: git commit failed', {
      cardRepoPath,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
