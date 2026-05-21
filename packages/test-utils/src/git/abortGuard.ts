/**
 * Guards a teardown-time `AbortController.abort()` against unhandled rejections.
 *
 * Why: `simple-git`'s abort plugin reacts to `controller.abort()` by killing any
 * git child still spawned at that moment, which *rejects* the task promise owned
 * by whatever called `git.raw()/commit()/merge()`. When that operation was
 * abandoned (a mocha timeout) or never awaited (fire-and-forget), the rejection
 * has no handler and becomes an UNHANDLED promise rejection — escaping the
 * synchronous `try/catch` around `abort()` and, in the extension runner, failing
 * the entire test process via its `process.on('unhandledRejection')` trap.
 *
 * Behavior: installs a narrowly-scoped, temporary `unhandledRejection` listener
 * that swallows ONLY a `GitPluginError` whose `plugin === 'abort'` (the exact
 * error our own `abort()` produces), calls `abort()`, then removes the listener
 * on a later macrotask once the abort-induced rejection has had a chance to
 * surface. Any unrelated rejection seen during the window is re-thrown on a fresh
 * unhandled rejection after the guard is removed, so it stays visible to the
 * environment's own trap. This preserves the real SIGKILL cancellation and the
 * fail-soft contract (teardown never throws and never fails a passing test).
 *
 * @summary Swallow only abort-plugin unhandled rejections produced by teardown
 * @module test-utils/git/abortGuard
 */
import { GitPluginError } from 'simple-git';

/**
 * Calls `controller.abort()` while temporarily trapping the abort-plugin's own
 * unhandled rejection so it can never fail the surrounding test process.
 *
 * @param controller The teardown's AbortController, or null when none exists.
 */
export function abortWithRejectionGuard(controller: AbortController | null): void {
  if (!controller) {
    return;
  }

  const onUnhandledRejection = (reason: unknown): void => {
    // Swallow ONLY the abort-plugin rejection our own abort() just produced:
    // observing it here keeps Node from treating it as fatal.
    if (reason instanceof GitPluginError && reason.plugin === 'abort') {
      return;
    }
    // Anything else is not ours to suppress. Re-surface it as a fresh unhandled
    // rejection on the next macrotask (after this guard is removed) so the
    // environment's own trap still sees it and stays attributable.
    setTimeout(() => {
      void Promise.reject(reason);
    }, 0).unref?.();
  };

  process.on('unhandledRejection', onUnhandledRejection);
  try {
    controller.abort();
  } finally {
    // The abort-induced rejection surfaces on a later turn of the event loop, so
    // keep the guard installed until after pending microtasks drain, then remove
    // it so it can never mask a later unrelated rejection.
    setTimeout(() => {
      process.removeListener('unhandledRejection', onUnhandledRejection);
    }, 0).unref?.();
  }
}
