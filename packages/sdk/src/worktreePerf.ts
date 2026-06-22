/**
 * Opt-in performance instrumentation for {@link createWorktree}.
 *
 * `createWorktree` runs on every action launch (see the `action` glossary
 * entry), so its latency is felt directly by a contributor pressing an action
 * button. To optimize it without guessing, this module provides a recorder that
 * times the synchronous prelude, the early-return boundary (the moment a usable
 * directory is handed back), and each settle-phase step.
 *
 * The recorder is gated on the `CARDS_WORKTREE_PERF` environment variable and is
 * a near-zero-overhead no-op when unset: {@link WorktreePerf.measure} simply
 * awaits the wrapped operation and {@link WorktreePerf.mark} returns immediately,
 * with no clock reads and no allocation. When enabled, every span and mark is
 * written to stderr as it happens — never stdout, which carries the CLI's
 * machine-readable JSON payload — so the timeline is visible even for the
 * settle work that completes after the function has already returned.
 *
 * @summary Env-gated phase timing for worktree creation
 * @module worktreePerf
 */

import { performance } from 'node:perf_hooks';

/** Values of `CARDS_WORKTREE_PERF` that keep instrumentation off despite being set. */
const OFF_VALUES = new Set(['', '0', 'false', 'off', 'no']);

/**
 * A single timed span recorded by {@link WorktreePerf.measure}, or a zero-width
 * mark recorded by {@link WorktreePerf.mark}.
 */
export interface WorktreePerfSpan {
  /** Human-readable label, e.g. `'git worktree add'` or `'settle:wave1'`. */
  label: string;
  /** Milliseconds from recorder construction (t0) to the start of this span. */
  startOffsetMs: number;
  /** Span duration in milliseconds. `0` for a {@link WorktreePerf.mark}. */
  durationMs: number;
}

/**
 * Phase-timing recorder for a single {@link createWorktree} invocation.
 *
 * Obtain one via {@link createWorktreePerf}. When `enabled` is false every
 * method is a no-op fast path; calling code does not branch on `enabled`.
 */
export interface WorktreePerf {
  /** Whether timing is active (the `CARDS_WORKTREE_PERF` env var is truthy). */
  readonly enabled: boolean;

  /**
   * Times an async operation, recording its duration and start offset.
   *
   * When disabled, returns `op()` directly with no clock read. When enabled,
   * records a span and emits it to stderr the moment `op` settles. The operation
   * is always awaited and its result returned unchanged; a rejection propagates
   * after the span is recorded with its (partial) duration.
   *
   * @param label - Span label.
   * @param op - The async operation to time.
   * @returns The resolved value of `op`.
   */
  measure<T>(label: string, op: () => Promise<T>): Promise<T>;

  /**
   * Records a zero-width mark at the current offset from t0 and emits it to
   * stderr. Used for instants like the early-return boundary. No-op when disabled.
   *
   * @param label - Mark label.
   */
  mark(label: string): void;

  /**
   * All spans and marks recorded so far, in completion order. Empty when
   * disabled. Exposed for tests and for callers that want to emit a summary.
   */
  spans(): readonly WorktreePerfSpan[];
}

/**
 * Reads the `CARDS_WORKTREE_PERF` flag from an environment bag.
 *
 * Truthy means present and not one of the explicit off-values `''`, `'0'`,
 * `'false'`, `'off'`, `'no'` (case-insensitive). This lets `CARDS_WORKTREE_PERF=1`
 * or `CARDS_WORKTREE_PERF=stderr` enable it while `CARDS_WORKTREE_PERF=0` keeps it
 * off without unsetting the variable.
 *
 * @param env - Environment bag to read (defaults to `process.env`).
 * @returns True when instrumentation should be active.
 */
export function isWorktreePerfEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env['CARDS_WORKTREE_PERF'];
  if (raw === undefined) {
    return false;
  }
  return !OFF_VALUES.has(raw.trim().toLowerCase());
}

/**
 * Constructs a {@link WorktreePerf} recorder for one worktree creation.
 *
 * The recorder's t0 is captured at construction, so start offsets are relative
 * to the call site that creates it (typically the top of {@link createWorktree}).
 *
 * @param options - Optional overrides.
 * @param options.env - Environment bag used to resolve the enable flag.
 * @param options.write - Sink for emitted lines (defaults to `process.stderr.write`). Injectable for tests.
 * @returns A recorder; a no-op fast path when disabled.
 */
export function createWorktreePerf(options?: {
  env?: NodeJS.ProcessEnv;
  write?: (line: string) => void;
}): WorktreePerf {
  const enabled = isWorktreePerfEnabled(options?.env);

  if (!enabled) {
    return DISABLED_PERF;
  }

  const write = options?.write ?? ((line: string) => void process.stderr.write(line));
  const t0 = performance.now();
  const recorded: WorktreePerfSpan[] = [];

  const emit = (span: WorktreePerfSpan): void => {
    recorded.push(span);
    const offset = span.startOffsetMs.toFixed(1);
    if (span.durationMs === 0) {
      write(`[worktree-perf] mark ${span.label} @ +${offset}ms\n`);
    } else {
      write(`[worktree-perf] ${span.label}: ${span.durationMs.toFixed(1)}ms (@ +${offset}ms)\n`);
    }
  };

  return {
    enabled: true,
    async measure<T>(label: string, op: () => Promise<T>): Promise<T> {
      const start = performance.now();
      try {
        return await op();
      } finally {
        const end = performance.now();
        emit({ label, startOffsetMs: start - t0, durationMs: end - start });
      }
    },
    mark(label: string): void {
      emit({ label, startOffsetMs: performance.now() - t0, durationMs: 0 });
    },
    spans(): readonly WorktreePerfSpan[] {
      return recorded;
    }
  };
}

/**
 * Shared singleton no-op recorder returned when instrumentation is disabled, so
 * the common (unset) path allocates nothing per worktree creation.
 */
const DISABLED_PERF: WorktreePerf = {
  enabled: false,
  measure: <T>(_label: string, op: () => Promise<T>): Promise<T> => op(),
  mark: (): void => undefined,
  spans: (): readonly WorktreePerfSpan[] => EMPTY_SPANS
};

/** Frozen empty span list shared by every disabled recorder. */
const EMPTY_SPANS: readonly WorktreePerfSpan[] = Object.freeze([]);
