/**
 * Core polling loop for the transcript-sync engine's composition root.
 *
 * Ports `runWatcherLoop` from `bin/transcript-watcher.ts` verbatim, generalized
 * to be runtime-agnostic (no dependency on the old fixed
 * `claude-code-session`/`sessionId.jsonl` layout — the sentinel path, tick
 * behavior, and monitored PID are all supplied by the caller via
 * {@link LifecycleDeps}).
 *
 * @summary Injectable four-exit-condition polling loop
 * @module
 */

/** Maximum watcher lifetime before forced exit (24 hours). */
export const MAX_LIFETIME_MS = 24 * 60 * 60 * 1_000;

/** Interval for periodic sentinel/PID liveness checks (5 seconds). */
export const STEADY_TICK_INTERVAL_MS = 5_000;

/**
 * Poll interval used while the watch install has not yet succeeded (the
 * watchRoot has not been created by the runtime yet). Decoupled from the
 * steady-tick cadence so the watcher attaches promptly once the directory
 * appears.
 */
export const WATCH_INSTALL_RETRY_INTERVAL_MS = 250;

/**
 * Dependencies injected into {@link runWatcherLoop}. The single loop body
 * lives here; the composition root supplies real filesystem/PID/clock
 * implementations, while tests supply deterministic fakes.
 */
export interface LifecycleDeps {
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
   * Runs once per surviving tick after the three break checks pass. Returns
   * the next sleep interval (fast retry while the watch is not yet
   * installed, steady cadence once it is). Defaults to the steady interval
   * when omitted.
   */
  onTick?: () => Promise<number>;
  /** Invoked when the max-lifetime timeout fires, before the loop breaks. */
  onMaxLifetime?: () => void;
  /** Maximum watcher lifetime before forced exit. Defaults to {@link MAX_LIFETIME_MS}. */
  maxLifetimeMs?: number;
}

/**
 * Runs the core polling loop shared by the composition root and its tests.
 *
 * The loop exits when any of the four terminal conditions is reached:
 * - `deps.signal.stopped` is set to `true` (stop-control path)
 * - The sentinel file is detected (graceful session end)
 * - The monitored PID is no longer alive (process death)
 * - The elapsed time exceeds `maxLifetimeMs` (forced timeout)
 *
 * @param deps - Injectable dependencies for deterministic testing.
 * @returns An object indicating which exit path was taken. `maxLifetimeExceeded`
 *   is `true` only for the timeout path — callers must skip cleanup in that case.
 *   `stopRequested` is `true` only for the stop-control path.
 */
export async function runWatcherLoop(
  deps: LifecycleDeps
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
    const interval = onTick ? await onTick() : STEADY_TICK_INTERVAL_MS;
    await sleep(interval);
  }

  return { maxLifetimeExceeded, stopRequested: signal.stopped };
}
