/**
 * Tests for the claude-code-session `CompactState` → `CompactCardModel` adapter.
 *
 * Pins the dot/status derivation (including the error tint), the subagent
 * label's present/omitted conditional, and a tail line's resolved severity —
 * the pieces `CompactView` used to compute inline before the shared
 * `CompactCard` component took over rendering.
 *
 * @summary Unit tests for the claude-code-session compact-card adapter
 */

import { describe, expect, it } from 'vitest';
import { claudeToCompactCardModel } from '../src/streams/claude-code-session/www/components/compact/adapt-compact-model';
import { makeInitialState } from '../src/streams/claude-code-session/www/components/compact/compact-state';
import type { CompactEvent } from '../src/streams/claude-code-session/www/lib/parse-session';

describe('claudeToCompactCardModel', () => {
  it('renders the running dot/status and omits the subagent label when absent', () => {
    const state = makeInitialState();
    state.isSubagent = false;

    const model = claudeToCompactCardModel(state, true, '1m 2s', '');

    expect(model.dotClass).toBe('running');
    expect(model.statusWord).toBe('Running');
    expect(model.subagentLabel).toBeUndefined();
    expect(model.metaStacked).toBe('1m 2s');
  });

  it('tints the dot red when the state has errors, even while ended', () => {
    const state = makeInitialState();
    state.hasErrors = true;

    const model = claudeToCompactCardModel(state, false, '', 'Jun 1');

    expect(model.dotClass).toBe('error');
    expect(model.statusWord).toBe('Ended');
  });

  it('surfaces the subagent label only when isSubagent and agentId are both set', () => {
    const state = makeInitialState();
    state.isSubagent = true;
    state.agentId = 'agent-42';

    const model = claudeToCompactCardModel(state, true, '', '');

    expect(model.subagentLabel).toBe('agent-42');
  });

  it('builds the ended-only duration fact as a bold value with no label', () => {
    const state = makeInitialState();

    const model = claudeToCompactCardModel(state, false, '7h 33m', 'Jun 1');

    const durationFact = model.stackedFacts.find((f) => f.key === 'duration');
    expect(durationFact).toEqual({ key: 'duration', kind: 'value', bold: '7h 33m', label: '' });
  });

  it('resolves a milestone tail line for an Agent tool call', () => {
    const state = makeInitialState();
    const event: CompactEvent = {
      kind: 'tool-call',
      toolName: 'Agent',
      summary: 'Plan review',
      isInfrastructure: false
    };
    state.tail = [event];

    const model = claudeToCompactCardModel(state, true, '', '');

    expect(model.tail).toEqual([{ label: 'Agent', labelClass: 'tool', severity: 'milestone', text: 'Plan review' }]);
  });

  it('resolves a plumbing tail line for an ordinary tool call', () => {
    const state = makeInitialState();
    const event: CompactEvent = { kind: 'tool-call', toolName: 'Bash', summary: 'ls -la', isInfrastructure: false };
    state.tail = [event];

    const model = claudeToCompactCardModel(state, true, '', '');

    expect(model.tail).toEqual([{ label: 'Bash', labelClass: 'tool', severity: 'plumbing', text: 'ls -la' }]);
  });

  it('resolves an error tail line', () => {
    const state = makeInitialState();
    const event: CompactEvent = { kind: 'error', message: 'boom' };
    state.tail = [event];

    const model = claudeToCompactCardModel(state, true, '', '');

    expect(model.tail).toEqual([{ label: 'Error', labelClass: 'tool', severity: 'error', text: 'boom' }]);
  });
});
