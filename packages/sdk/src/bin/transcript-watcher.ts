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
 * Registered with the extension via createWatcher so it receives a dedicated
 * control channel. A `stop` command triggers final flush and clean exit.
 *
 * @summary Detached transcript watcher — filesystem-event-driven directory syncer
 */

import type { FSWatcher } from 'node:fs';
import { watch } from 'node:fs';
import { access, appendFile, copyFile, mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { removeSessionCsv, removeSessionHeadSha, removeSessionRouteNudge } from '@cards/sessions/card-repo';
import { createWatcher } from '../config/watcher/createWatcher.js';
import { execFileNoWindowAsync } from './childProcess.js';
import { isProcessAlive } from './process-utils.js';

export { isProcessAlive } from './process-utils.js';

// This watcher runs as a detached, console-less subprocess on win32; its `git`
// commit calls force `windowsHide: true` via the SDK no-window helper so no
// per-call console window appears under stock node.
const execFileAsync = execFileNoWindowAsync;

/** Maximum watcher lifetime before forced exit (24 hours). */
export const MAX_LIFETIME_MS = 24 * 60 * 60 * 1_000;

/** Interval for periodic sentinel/PID liveness checks (5 seconds). */
export const PERIODIC_CHECK_INTERVAL_MS = 5_000;

/**
 * Poll interval used while the fs.watch watcher is not yet installed (the
 * source directory has not been created by Claude Code yet). Decoupled from
 * the 5s liveness cadence so the watcher attaches promptly once the directory
 * appears — without this, live tailing could lag by up to a full liveness
 * interval, which is flaky under load on slower filesystems (e.g. Windows).
 */
export const WATCHER_INSTALL_RETRY_INTERVAL_MS = 250;

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
 * Checks whether the sentinel flush file exists for this session.
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
 * Translates a source-relative path to a flat destination filename.
 * Returns null for paths that should be skipped.
 *
 * @param relPath - Relative path from source directory root.
 * @param sessionId - Session UUID prefix to filter on.
 * @returns Flat destination filename, or null to skip.
 */
export function translatePath(relPath: string, sessionId: string): string | null {
  const normalized = relPath.replace(/\\/g, '/');

  if (normalized === `${sessionId}.jsonl`) {
    return `${sessionId}.jsonl`;
  }

  const subagentsPrefix = `${sessionId}/subagents/`;
  if (normalized.startsWith(subagentsPrefix)) {
    const name = normalized.slice(subagentsPrefix.length);
    if (name.includes('/')) {
      return null;
    }
    return `${sessionId}-${name}`;
  }

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
 * @param destFilename - Flat destination filename.
 * @param sessionId - Session UUID.
 * @param cardId - Card identifier.
 * @returns Sidecar metadata object.
 */
export function buildSidecarMeta(destFilename: string, sessionId: string, cardId: string): SidecarMeta {
  const isSubagent = destFilename.startsWith(`${sessionId}-`);

  if (isSubagent) {
    const withoutUuidPrefix = destFilename.slice(sessionId.length + 1);
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

async function writeSidecarIfAbsent(
  destDir: string,
  destFilename: string,
  sessionId: string,
  cardId: string
): Promise<void> {
  const sidecarPath = join(destDir, `${destFilename}.meta.json`);
  try {
    await access(sidecarPath);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const meta = buildSidecarMeta(destFilename, sessionId, cardId);
  await writeFile(sidecarPath, JSON.stringify(meta, null, 2));
}

interface FileState {
  bytesWritten: number;
  pendingFragment: string;
}

async function appendSyncJsonl(srcPath: string, destPath: string, state: FileState): Promise<void> {
  let srcContent: Buffer;
  try {
    srcContent = await readFile(srcPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  const totalSrcBytes = srcContent.length;
  if (totalSrcBytes <= state.bytesWritten) {
    return;
  }

  const newBytes = srcContent.subarray(state.bytesWritten);
  const text = state.pendingFragment + newBytes.toString('utf-8');

  const lastNl = text.lastIndexOf('\n');
  if (lastNl < 0) {
    state.pendingFragment = text;
    return;
  }

  const completeLines = text.slice(0, lastNl + 1);
  const newFragment = text.slice(lastNl + 1);

  await appendFile(destPath, completeLines, { flag: 'a' });

  const consumed = Buffer.byteLength(completeLines, 'utf-8') - Buffer.byteLength(state.pendingFragment, 'utf-8');
  state.bytesWritten = state.bytesWritten + consumed;
  state.pendingFragment = newFragment;
}

/**
 * Ensures the `streams/**\/*.flush` pattern is in the card repo's .gitignore.
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
  }

  const lines = existing.split('\n');
  if (lines.some((line) => line.trim() === entry)) {
    return;
  }

  const newContent = existing.endsWith('\n') || existing === '' ? `${existing}${entry}\n` : `${existing}\n${entry}\n`;

  await writeFile(gitignorePath, newContent);
}

async function enumerateSessionFiles(sourceDir: string, sessionId: string): Promise<string[]> {
  const result: string[] = [];

  const rootFile = `${sessionId}.jsonl`;
  try {
    await access(join(sourceDir, rootFile));
    result.push(rootFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const sessionDir = join(sourceDir, sessionId);
  try {
    await walkDir(sessionDir, sessionId, result);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return result;
}

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
    return;
  }

  const srcPath = join(sourceDir, relPath.replace(/\//g, '/'));
  const destPath = join(destDir, destFilename);

  if (destFilename.endsWith('.jsonl')) {
    let state = fileStates.get(relPath);
    if (!state) {
      state = { bytesWritten: 0, pendingFragment: '' };
      fileStates.set(relPath, state);
    }

    await appendSyncJsonl(srcPath, destPath, state);
    await writeSidecarIfAbsent(destDir, destFilename, sessionId, cardId);
  } else {
    try {
      await copyFile(srcPath, destPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }
}

async function fullCopyPass(
  sourceDir: string,
  destDir: string,
  sessionId: string,
  cardId: string,
  fileStates: Map<string, FileState>,
  warnFn: (msg: string) => void
): Promise<void> {
  const relPaths = await enumerateSessionFiles(sourceDir, sessionId);
  for (const relPath of relPaths) {
    try {
      await syncFile(relPath, sourceDir, destDir, sessionId, cardId, fileStates);
    } catch (error) {
      warnFn(`fullCopyPass: error syncing ${relPath}: ${String(error)}`);
    }
  }
}

async function commitSessionClose(
  cardRepoPath: string,
  sessionId: string,
  warnFn: (msg: string) => void,
  errorFn: (msg: string) => void
): Promise<void> {
  try {
    await removeSentinelFile(cardRepoPath, sessionId);
  } catch (error) {
    warnFn(`removeSentinelFile failed: ${String(error)}`);
  }

  try {
    await execFileAsync('git', ['add', 'streams/claude-code-session/'], { cwd: cardRepoPath });
    await execFileAsync('git', ['commit', '--no-gpg-sign', '-m', `Close session ${sessionId}.`], {
      cwd: cardRepoPath
    });
  } catch (error) {
    errorFn(`git commit failed for session ${sessionId}: ${String(error)}`);
  }
}

/**
 * Dependencies injected into {@link runWatcherLoop}. The single loop body lives
 * in `runWatcherLoop`; `main()` supplies the real filesystem/PID/clock
 * implementations, while tests supply deterministic fakes. The per-tick
 * `onTick` callback carries the fsWatcher install-retry behavior so that the
 * loop itself stays free of watcher-specific state.
 */
export interface WatcherLoopDeps {
  /** Mutable signal object — set `signal.stopped = true` to trigger the stop-control exit path. */
  signal: { stopped: boolean };
  /** Returns true when the sentinel flush file is present. */
  checkSentinel: () => Promise<boolean>;
  /** Returns true when the monitored process is still alive. */
  checkAlive: () => boolean;
  /** Returns the current epoch timestamp in milliseconds. */
  now: () => number;
  /** Waits for the given number of milliseconds. */
  sleep: (ms: number) => Promise<void>;
  /**
   * Runs once per surviving tick after the three break checks pass. In
   * production this attempts the fsWatcher install and returns the next sleep
   * interval (fast retry while uninstalled, periodic cadence once installed).
   * Defaults to the periodic interval when omitted.
   */
  onTick?: () => Promise<number>;
  /** Invoked when the max-lifetime timeout fires, before the loop breaks. */
  onMaxLifetime?: () => void;
  /** Maximum watcher lifetime before forced exit. Defaults to {@link MAX_LIFETIME_MS}. */
  maxLifetimeMs?: number;
}

/**
 * Runs the core polling loop used by the transcript watcher — the single loop
 * implementation shared by {@link main} and the tests.
 *
 * The loop exits when any of the four terminal conditions is reached:
 * - `deps.signal.stopped` is set to `true` (stop-control path)
 * - The sentinel file is detected (graceful Claude session end)
 * - The monitored PID is no longer alive (process death)
 * - The elapsed time exceeds `maxLifetimeMs` (forced timeout)
 *
 * @param deps - Injectable dependencies for deterministic testing.
 * @returns An object indicating which exit path was taken. `maxLifetimeExceeded`
 *   is `true` only for the timeout path — callers must skip cleanup in that case.
 *   `stopRequested` is `true` only for the stop-control path.
 */
export async function runWatcherLoop(
  deps: WatcherLoopDeps
): Promise<{ maxLifetimeExceeded: boolean; stopRequested: boolean }> {
  const { signal, checkSentinel, checkAlive, now, sleep, onTick, onMaxLifetime } = deps;
  const maxLifetimeMs = deps.maxLifetimeMs ?? MAX_LIFETIME_MS;

  let maxLifetimeExceeded = false;

  const started = now();
  while (!signal.stopped) {
    if (await checkSentinel()) break;
    if (!checkAlive()) break;
    if (now() - started > maxLifetimeMs) {
      maxLifetimeExceeded = true;
      onMaxLifetime?.();
      break;
    }
    const interval = onTick ? await onTick() : PERIODIC_CHECK_INTERVAL_MS;
    await sleep(interval);
  }

  return { maxLifetimeExceeded, stopRequested: signal.stopped };
}

/**
 * Main entry point for the detached watcher process.
 *
 * Parses arguments from process.argv and uses createWatcher to register with
 * the extension control channel, then runs the sync loop.
 */
export async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const { pid, sessionId, transcriptPath, cardId, cardRepoPath } = args;
  const sourceDir = dirname(transcriptPath);
  const destDir = join(cardRepoPath, 'streams', 'claude-code-session');

  await createWatcher({ watcherId: sessionId, cardId, metadata: { pid, sessionId, transcriptPath } }, async (ctx) => {
    const warnFn = (msg: string) => ctx.logger.warn(msg);
    const errorFn = (msg: string) => ctx.logger.error(msg);

    await mkdir(destDir, { recursive: true });
    await ensureGitignoreEntry(cardRepoPath);

    const fileStates = new Map<string, FileState>();

    const syncOnce = async (): Promise<void> => {
      await fullCopyPass(sourceDir, destDir, sessionId, cardId, fileStates, warnFn);
      await commitSessionClose(cardRepoPath, sessionId, warnFn, errorFn);
    };

    // Initial full copy pass (without commit)
    await fullCopyPass(sourceDir, destDir, sessionId, cardId, fileStates, warnFn);

    let fsWatcher: FSWatcher | null = null;
    let exitSignaled = false;
    let syncChain: Promise<void> = Promise.resolve();

    const scheduleSync = (relPath: string): void => {
      syncChain = syncChain.then(async () => {
        try {
          await syncFile(relPath, sourceDir, destDir, sessionId, cardId, fileStates);
        } catch (error) {
          warnFn(`syncFile error for ${relPath}: ${String(error)}`);
        }
      });
    };

    const tryInstallWatcher = async (): Promise<FSWatcher | null> => {
      try {
        await access(sourceDir);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
      // Source dir now exists; capture anything written during the wait, then install fs.watch.
      await fullCopyPass(sourceDir, destDir, sessionId, cardId, fileStates, warnFn);
      try {
        const w = watch(sourceDir, { recursive: true }, (_eventType, filename) => {
          if (exitSignaled || !filename) return;
          const relPath = (filename as string).replace(/\\/g, '/');
          if (!relPath.startsWith(sessionId)) return;
          scheduleSync(relPath);
        });
        w.on('error', (error) => {
          if (!exitSignaled) {
            warnFn(`fs.watch error: ${String(error)}`);
          }
        });
        return w;
      } catch (error) {
        warnFn(`Failed to start fs.watch: ${String(error)}`);
        return null;
      }
    };

    fsWatcher = await tryInstallWatcher();

    ctx.logger.info(
      `Watcher started: pid=${String(pid)} session=${sessionId} node=${process.version} watcherPid=${String(process.pid)} transcriptPath=${transcriptPath} cardId=${cardId}`
    );

    const signal = { stopped: false };
    ctx.onControl('stop', async () => {
      signal.stopped = true;
      exitSignaled = true;
      if (fsWatcher) {
        try {
          fsWatcher.close();
        } catch (error) {
          warnFn(`fsWatcher.close() error: ${String(error)}`);
        }
      }
      await syncChain;
      await syncOnce();
    });

    ctx.emit({ type: 'watching', data: null });

    const { maxLifetimeExceeded, stopRequested } = await runWatcherLoop({
      signal,
      checkSentinel: () => sentinelFileExists(cardRepoPath, sessionId),
      checkAlive: () => isProcessAlive(pid),
      now: () => Date.now(),
      sleep: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
      onMaxLifetime: () => warnFn(`Watcher exceeded maximum lifetime (${MAX_LIFETIME_MS}ms), exiting`),
      onTick: async () => {
        if (!fsWatcher && !exitSignaled) {
          fsWatcher = await tryInstallWatcher();
        }
        // Poll quickly until the watcher attaches, then fall back to the slower
        // liveness cadence once it is installed.
        return fsWatcher ? PERIODIC_CHECK_INTERVAL_MS : WATCHER_INSTALL_RETRY_INTERVAL_MS;
      }
    });

    if (!stopRequested) {
      exitSignaled = true;
      if (fsWatcher) {
        try {
          fsWatcher.close();
        } catch (error) {
          warnFn(`fsWatcher.close() error: ${String(error)}`);
        }
      }
      await syncChain;
      await syncOnce();
    }

    ctx.logger.info(`Watcher completed for session ${sessionId}`);
    if (!maxLifetimeExceeded) {
      await cleanupSessionArtifacts(sessionId, warnFn);
    }
  }).then((w) => w.run());
}

/**
 * Removes per-session artifact files written during the session lifecycle.
 *
 * Called at the end of a watcher run on a genuine session-end exit (graceful
 * stop, flush sentinel, or process death), so that both Claude (which also
 * removes these in session-end.ts) and Codex (which has no SessionEnd hook)
 * clean up. It is intentionally skipped on the max-lifetime exit — see the
 * `maxLifetimeExceeded` gate in {@link main}/{@link runWatcherLoop}, where the
 * watched session may still be alive. Each removal is independent and best-effort:
 * a failure in one does not prevent the others, and errors are surfaced as
 * warnings rather than thrown.
 *
 * @param sessionId - Session whose artifacts should be removed.
 * @param warnFn - Warning logger used to surface individual removal failures.
 */
export async function cleanupSessionArtifacts(sessionId: string, warnFn: (msg: string) => void): Promise<void> {
  try {
    removeSessionHeadSha(sessionId);
  } catch (error) {
    warnFn(`cleanupSessionArtifacts: removeSessionHeadSha failed: ${String(error)}`);
  }

  try {
    removeSessionCsv(sessionId);
  } catch (error) {
    warnFn(`cleanupSessionArtifacts: removeSessionCsv failed: ${String(error)}`);
  }

  try {
    removeSessionRouteNudge(sessionId);
  } catch (error) {
    warnFn(`cleanupSessionArtifacts: removeSessionRouteNudge failed: ${String(error)}`);
  }
}

if (process.argv[1]?.endsWith('transcript-watcher.mjs') || process.argv[1]?.endsWith('transcript-watcher.ts')) {
  main().catch((error) => {
    process.stderr.write(`transcript-watcher: fatal error: ${String(error)}\n`);
    process.exitCode = 1;
  });
}
