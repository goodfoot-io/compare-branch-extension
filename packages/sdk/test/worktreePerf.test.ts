/**
 * Unit tests for the env-gated worktree performance recorder.
 *
 * Exercises the enable-flag parsing, the no-op fast path when disabled, and the
 * span/mark recording plus stderr emission when enabled.
 *
 * @summary worktreePerf recorder tests
 */

import { describe, expect, it } from 'vitest';
import { createWorktreePerf, isWorktreePerfEnabled } from '../src/worktreePerf.js';

describe('isWorktreePerfEnabled', () => {
  it('is false when the variable is unset', () => {
    expect(isWorktreePerfEnabled({})).toBe(false);
  });

  it('is false for explicit off-values', () => {
    for (const value of ['', '0', 'false', 'FALSE', 'off', 'No']) {
      expect(isWorktreePerfEnabled({ CARDS_WORKTREE_PERF: value })).toBe(false);
    }
  });

  it('is true for truthy values', () => {
    for (const value of ['1', 'true', 'stderr', 'yes']) {
      expect(isWorktreePerfEnabled({ CARDS_WORKTREE_PERF: value })).toBe(true);
    }
  });
});

describe('createWorktreePerf (disabled)', () => {
  it('reports disabled and records nothing', async () => {
    const lines: string[] = [];
    const perf = createWorktreePerf({ env: {}, write: (l) => lines.push(l) });

    expect(perf.enabled).toBe(false);
    const result = await perf.measure('step', async () => 42);
    perf.mark('boundary');

    expect(result).toBe(42);
    expect(perf.spans()).toHaveLength(0);
    expect(lines).toHaveLength(0);
  });

  it('still returns the operation result and propagates rejection', async () => {
    const perf = createWorktreePerf({ env: {}, write: () => undefined });
    await expect(perf.measure('boom', async () => Promise.reject(new Error('x')))).rejects.toThrow('x');
  });
});

describe('createWorktreePerf (enabled)', () => {
  it('records a span with a non-negative duration and emits to the sink', async () => {
    const lines: string[] = [];
    const perf = createWorktreePerf({ env: { CARDS_WORKTREE_PERF: '1' }, write: (l) => lines.push(l) });

    expect(perf.enabled).toBe(true);
    const result = await perf.measure('work', async () => {
      await new Promise((r) => setTimeout(r, 5));
      return 'done';
    });

    expect(result).toBe('done');
    const spans = perf.spans();
    expect(spans).toHaveLength(1);
    expect(spans[0]!.label).toBe('work');
    expect(spans[0]!.durationMs).toBeGreaterThanOrEqual(0);
    expect(spans[0]!.startOffsetMs).toBeGreaterThanOrEqual(0);
    expect(lines.some((l) => l.includes('work'))).toBe(true);
  });

  it('records a mark with zero duration', () => {
    const lines: string[] = [];
    const perf = createWorktreePerf({ env: { CARDS_WORKTREE_PERF: '1' }, write: (l) => lines.push(l) });

    perf.mark('usable-directory');
    const spans = perf.spans();
    expect(spans).toHaveLength(1);
    expect(spans[0]!.label).toBe('usable-directory');
    expect(spans[0]!.durationMs).toBe(0);
    expect(lines.some((l) => l.includes('usable-directory'))).toBe(true);
  });

  it('still records a span and re-throws when the timed op rejects', async () => {
    const lines: string[] = [];
    const perf = createWorktreePerf({ env: { CARDS_WORKTREE_PERF: '1' }, write: (l) => lines.push(l) });

    await expect(perf.measure('failing', async () => Promise.reject(new Error('nope')))).rejects.toThrow('nope');
    expect(perf.spans()).toHaveLength(1);
    expect(perf.spans()[0]!.label).toBe('failing');
  });

  it('preserves recording order across multiple measures and marks', async () => {
    const perf = createWorktreePerf({ env: { CARDS_WORKTREE_PERF: '1' }, write: () => undefined });
    await perf.measure('a', async () => undefined);
    perf.mark('b');
    await perf.measure('c', async () => undefined);
    expect(perf.spans().map((s) => s.label)).toEqual(['a', 'b', 'c']);
  });
});
