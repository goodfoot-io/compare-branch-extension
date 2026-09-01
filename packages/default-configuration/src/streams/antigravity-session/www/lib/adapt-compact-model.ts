/**
 * Adapts the antigravity-session {@link AntigravityCompactState} into the
 * provider-neutral {@link CompactCardModel} the shared `CompactCard`
 * component renders.
 *
 * Mirrors the claude/codex adapters' shape with Antigravity's simpler signal
 * set: no subagent concept, no model/token/duration signal on destination
 * records (the pinned record shape carries none), so the meta slots stay
 * empty and the facts row tallies steps and named anomalies. Tail severity
 * maps anomalies and corruption to `'error'`; clean steps are `'neutral'`.
 *
 * @summary AntigravityCompactState → CompactCardModel adapter
 * @module streams/antigravity-session/www/lib/adapt-compact-model
 */

import type { CompactCardModel, FactModel, TailLineModel } from '../../../lib/compact-card-model';
import { countFact } from '../../../lib/compact-facts';
import type { AntigravityCompactState } from './compact-state';

/**
 * Builds the provider-neutral {@link CompactCardModel} from the
 * antigravity-session compact state.
 *
 * @param state - The folded compact state to adapt.
 * @param isActive - Whether the stream is live.
 * @returns The provider-neutral compact-card model.
 */
export function antigravityToCompactCardModel(state: AntigravityCompactState, isActive: boolean): CompactCardModel {
  const statusWord = isActive ? 'Running' : 'Ended';
  const dotClass = state.hasErrors ? 'error' : isActive ? 'running' : 'ended';

  const stepFact = countFact(state.stepCount, 'steps');
  const anomalyFact = countFact(state.anomalyCount, 'anomalies');
  const facts: FactModel[] = [stepFact, anomalyFact].filter((fact): fact is FactModel => fact !== null);

  const tail: TailLineModel[] = state.tail.map((event) => ({
    label: event.kind,
    text: event.text,
    severity: event.severity === 'error' ? 'error' : 'neutral'
  }));

  return {
    dotClass,
    statusWord,
    subagentLabel: undefined,
    // Destination records carry no timestamps, so there is no duration or
    // date to show in either meta slot.
    metaStacked: '',
    metaSplit: '',
    headline: state.headlineText,
    stackedFacts: facts,
    splitFacts: facts,
    tail
  };
}
