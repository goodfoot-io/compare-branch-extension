/**
 * Tests for the codex-session `CodexCompactState` → `CompactCardModel` adapter.
 *
 * Pins the token-facts-omitted-when-undefined contract (as opposed to
 * rendering fabricated `0 out`/`0 in` facts), the shared stacked/split
 * duration string, and the tail's `neutral` severity mapping (Codex has no
 * milestone/plumbing/error classification yet).
 *
 * @summary Unit tests for the codex-session compact-card adapter
 */

import { describe, expect, it } from 'vitest';
import { codexToCompactCardModel } from '../src/streams/codex-session/www/lib/adapt-compact-model';
import type { CodexCompactState } from '../src/streams/codex-session/www/lib/compact-state';

function baseState(overrides: Partial<CodexCompactState> = {}): CodexCompactState {
  return {
    isActive: true,
    headlineText: '',
    turnCount: 0,
    toolCallCount: 0,
    tokenCount: undefined,
    model: undefined,
    durationMs: undefined,
    tail: [],
    ...overrides
  };
}

describe('codexToCompactCardModel', () => {
  it('never reports the error dot class, even for a settled session', () => {
    const model = codexToCompactCardModel(baseState(), false);

    expect(model.dotClass).toBe('ended');
    expect(model.statusWord).toBe('Ended');
    expect(model.subagentLabel).toBeUndefined();
  });

  it('omits token facts entirely when tokenCount is undefined', () => {
    const state = baseState({ tokenCount: undefined, toolCallCount: 2 });

    const model = codexToCompactCardModel(state, true);

    expect(model.stackedFacts.some((f) => f.key === 'out' || f.key === 'in')).toBe(false);
    expect(model.splitFacts.some((f) => f.key === 'out')).toBe(false);
  });

  it('includes token facts when tokenCount is present and non-zero', () => {
    const state = baseState({ tokenCount: { input: 200, output: 1500 } });

    const model = codexToCompactCardModel(state, true);

    expect(model.stackedFacts).toContainEqual({ key: 'out', kind: 'value', bold: '2K', label: 'out' });
    expect(model.stackedFacts).toContainEqual({ key: 'in', kind: 'value', bold: '200', label: 'in' });
    expect(model.splitFacts).toContainEqual({ key: 'out', kind: 'value', bold: '2K', label: 'out' });
  });

  it('shows the same formatted duration in both the stacked and split meta slots', () => {
    const state = baseState({ durationMs: 27_180_000 });

    const model = codexToCompactCardModel(state, false);

    expect(model.metaStacked).toBe('7h 33m');
    expect(model.metaSplit).toBe('7h 33m');
  });

  it('maps every tail event to the neutral severity', () => {
    const state = baseState({ tail: [{ kind: 'tool', text: 'shell: ls' }] });

    const model = codexToCompactCardModel(state, true);

    expect(model.tail).toEqual([{ label: 'tool', text: 'shell: ls', severity: 'neutral' }]);
  });
});
