/**
 * Adapts codex-session {@link CodexCompactState} into the provider-neutral
 * {@link CompactCardModel} the shared `CompactCard` component renders.
 *
 * Mirrors the claude-code-session adapter's shape but with Codex's simpler
 * signal set: no subagent concept, one shared duration string for both the
 * stacked and split meta slots. Tail severity is derived from the compact
 * state's error detection: tool calls with patch failures or non-zero shell
 * exit codes map to `'error'`; everything else is `'neutral'`.
 *
 * @summary CodexCompactState → CompactCardModel adapter (Codex)
 * @module streams/codex-session/www/lib/adapt-compact-model
 */

import type { CompactCardModel, FactModel, TailLineModel } from '../../../lib/compact-card-model';
import { countFact, formatDuration, plainFact, tokenFact } from '../../../lib/compact-facts';
import type { CodexCompactState } from './compact-state';

/**
 * Builds the provider-neutral {@link CompactCardModel} from codex-session's
 * {@link CodexCompactState}.
 * @param state - The folded compact state to adapt.
 * @param isActive - Whether the stream is live.
 * @returns The provider-neutral compact-card model.
 */
export function codexToCompactCardModel(state: CodexCompactState, isActive: boolean): CompactCardModel {
  const statusWord = isActive ? 'Running' : 'Ended';
  const dotClass = state.hasErrors ? 'error' : isActive ? 'running' : 'ended';

  // Codex shows the same duration string in both the stacked and split meta
  // slots today (no separate live-timer-vs-date distinction, unlike Claude).
  const meta = state.durationMs !== undefined && state.durationMs > 0 ? formatDuration(state.durationMs) : '';

  const tokens = state.tokenCount;
  const modelFact = plainFact('model', state.model ?? '');

  const stackedFacts: FactModel[] = [
    tokens ? tokenFact(tokens.output, 'out') : null,
    tokens ? tokenFact(tokens.input, 'in') : null,
    countFact(state.toolCallCount, 'tool'),
    modelFact
  ].filter((fact): fact is FactModel => fact !== null);

  const splitFacts: FactModel[] = [
    countFact(state.turnCount, 'turn'),
    countFact(state.toolCallCount, 'tool'),
    tokens ? tokenFact(tokens.output, 'out') : null,
    modelFact
  ].filter((fact): fact is FactModel => fact !== null);

  const tail: TailLineModel[] = state.tail.map((event) => ({
    label: event.kind,
    text: event.text,
    severity: event.severity === 'error' ? 'error' : 'neutral'
  }));

  return {
    dotClass,
    statusWord,
    subagentLabel: undefined,
    metaStacked: meta,
    metaSplit: meta,
    headline: state.headlineText,
    stackedFacts,
    splitFacts,
    tail
  };
}
