/**
 * Adapts opencode-session {@link OpencodeCompactState} into the provider-neutral
 * {@link CompactCardModel} the shared `CompactCard` component renders.
 *
 * Mirrors the codex-session adapter's shape with OpenCode's signal set, plus
 * claude-code-session's subagent labeling: a stream whose sidecar `role`
 * marks it a child transcript surfaces its sidecar `agentId` as the card's
 * subagent label. Tail severity is derived from the compact state's error
 * detection: failed tool calls map to `'error'`; everything else is
 * `'neutral'`.
 *
 * @summary OpencodeCompactState → CompactCardModel adapter (OpenCode)
 * @module streams/opencode-session/www/lib/adapt-compact-model
 */

import type { CompactCardModel, FactModel, TailLineModel } from '../../../lib/compact-card-model';
import { countFact, formatDuration, plainFact, tokenFact } from '../../../lib/compact-facts';
import type { OpencodeCompactState } from './compact-state';

/**
 * Builds the provider-neutral {@link CompactCardModel} from opencode-session's
 * {@link OpencodeCompactState}.
 * @param state - The folded compact state to adapt.
 * @param isActive - Whether the stream is live.
 * @returns The provider-neutral compact-card model.
 */
export function opencodeToCompactCardModel(state: OpencodeCompactState, isActive: boolean): CompactCardModel {
  const statusWord = isActive ? 'Running' : 'Ended';
  const dotClass = state.hasErrors ? 'error' : isActive ? 'running' : 'ended';

  // OpenCode shows the same duration string in both the stacked and split meta
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

  // Claude parity: the label surfaces only when the sidecar marks the stream
  // a child transcript AND carries an agentId.
  const subagentLabel = state.isSubagent && state.agentId ? state.agentId : undefined;

  return {
    dotClass,
    statusWord,
    subagentLabel,
    metaStacked: meta,
    metaSplit: meta,
    headline: state.headlineText,
    stackedFacts,
    splitFacts,
    tail
  };
}
