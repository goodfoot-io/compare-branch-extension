/**
 * Guards a teardown-time `AbortController.abort()` against unhandled rejections.
 *
 * Why: `simple-git`'s abort plugin reacts to `controller.abort()` by killing any
 * git child still spawned at that moment (`spawned.kill('SIGINT')`), which
 * *rejects* the task promise owned by whatever called `git.raw()/commit()/
 * merge()`. When that operation was abandoned (a mocha timeout) or never awaited
 * (fire-and-forget), the rejection has no handler and becomes an UNHANDLED
 * promise rejection — escaping the synchronous `try/catch` around `abort()` and,
 * in the extension runner, failing the entire test process via its
 * `process.on('unhandledRejection')` trap.
 *
 * The rejection does NOT surface synchronously: the abort plugin sends SIGINT and
 * the task promise rejects only when the git child's asynchronous `close` event
 * fires. A child that takes longer than an event-loop tick to die after SIGINT —
 * a `commit`/`merge` running hooks, a `checkout` touching many files, gc, or
 * jitter under parallel CI load — surfaces its rejection an arbitrary amount of
 * wall-clock time later. There is no safe fixed delay that brackets an arbitrary
 * SIGINT'd child's `close`, so containment must outlive any child, not race it.
 *
 * Behavior: installs exactly ONE process-lifetime `unhandledRejection` listener
 * (idempotent across all loaded copies of this guard via a `globalThis` symbol
 * flag) and never removes it. The listener swallows ONLY a `GitPluginError` whose
 * `plugin === 'abort'` (the exact error our own `abort()` produces). Any other
 * rejection is re-raised on the next tick as a bare `throw`, becoming a fatal
 * `uncaughtException` that stays visible to the environment's own trap (vitest,
 * mocha, the extension runner). A bare `throw` does not re-enter
 * `unhandledRejection`, so there is no re-entrancy loop, and the singleton
 * guarantees a non-abort rejection is re-raised exactly once. This preserves the
 * real SIGINT cancellation and the fail-soft contract (teardown never throws and
 * never fails a passing test).
 *
 * @summary Swallow only abort-plugin unhandled rejections produced by teardown
 * @module test-utils/git/abortGuard
 */
import { GitPluginError } from 'simple-git';

/**
 * Process-global flag key under which the singleton guard records that it is
 * installed. Shared by `Symbol.for` so the shared module and the inlined copies
 * (tree, extension) resolve the SAME symbol and never install duplicate
 * listeners when loaded in one process.
 */
const GUARD_INSTALLED_KEY = Symbol.for('cards.test-utils.abortRejectionGuard');

/**
 * Installs the process-lifetime `unhandledRejection` guard exactly once.
 *
 * Idempotent: subsequent calls (including from the inlined tree/extension copies)
 * observe the `globalThis` flag and return without adding another listener.
 */
function ensureRejectionGuardInstalled(): void {
  const globalScope = globalThis as Record<symbol, unknown>;
  if (globalScope[GUARD_INSTALLED_KEY]) {
    return;
  }
  globalScope[GUARD_INSTALLED_KEY] = true;

  process.on('unhandledRejection', (reason: unknown): void => {
    // Swallow ONLY the abort-plugin rejection our own abort() produces:
    // observing it here keeps Node from treating it as fatal.
    if (reason instanceof GitPluginError && reason.plugin === 'abort') {
      return;
    }
    // Anything else is not ours to suppress. Re-raise it on the next tick as a
    // bare throw so it becomes a fatal `uncaughtException` (still caught by the
    // runner's trap and by vitest/mocha) and stays attributable. A bare throw
    // does not re-enter `unhandledRejection`, so there is no re-entrancy loop.
    process.nextTick(() => {
      throw reason;
    });
  });
}

/**
 * Calls `controller.abort()` after ensuring the process-lifetime abort-rejection
 * guard is installed, so the abort-plugin's own unhandled rejection can never
 * fail the surrounding test process — no matter how long the SIGINT'd child takes
 * to close.
 *
 * @param controller The teardown's AbortController, or null when none exists.
 */
export function abortWithRejectionGuard(controller: AbortController | null): void {
  if (!controller) {
    return;
  }

  ensureRejectionGuardInstalled();
  // `abort()` does not throw; the guard installed above contains the
  // asynchronous abort-plugin rejection it provokes.
  controller.abort();
}
