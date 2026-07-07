/**
 * Adapts claude-code-session {@link CompactState} into the provider-neutral
 * {@link CompactCardModel} the shared `CompactCard` component renders.
 *
 * Reproduces `CompactView`'s former inline derivations verbatim — dot/status,
 * the two meta-right strings, the metrics rows, and the resolved tail lines —
 * so switching to the shared component is behavior-preserving: Claude's
 * rendered compact card is unchanged.
 *
 * @summary CompactState → CompactCardModel adapter (Claude)
 * @module components/compact/adapt-compact-model
 */

import type { CompactCardModel, FactModel, TailLineModel } from '../../../../lib/compact-card-model';
import { countFact, plainFact, tokenFact } from '../../../../lib/compact-facts';
import type { CompactEvent } from '../../lib/parse-session';
import type { CompactState } from './compact-state';
import { headline } from './compact-state';

/** Tool names that read as milestones rather than low-level plumbing. */
const MILESTONE_TOOLS = new Set(['Agent', 'SendMessage']);

/**
 * Resolves the label, label color, severity, and content for one tail event,
 * or null when the event has no renderable form (a `CompactState.tail` entry
 * is always one of tool-call/subagent-tool-call/text/error in practice, but
 * the {@link CompactEvent} union is wider, so the fallthrough stays typed).
 * @param event - The compact event to classify.
 * @returns The resolved tail line model, or null when not renderable.
 */
function resolveLine(event: CompactEvent): TailLineModel | null {
  switch (event.kind) {
    case 'tool-call':
    case 'subagent-tool-call':
      return {
        label: event.toolName,
        labelClass: 'tool',
        severity: MILESTONE_TOOLS.has(event.toolName) ? 'milestone' : 'plumbing',
        text: event.summary
      };
    case 'text':
      return {
        label: event.role === 'user' ? 'User' : 'Assistant',
        labelClass: event.role === 'user' ? 'user' : 'asst',
        severity: 'milestone',
        text: event.text
      };
    case 'error':
      return { label: 'Error', labelClass: 'tool', severity: 'error', text: event.message };
    default:
      return null;
  }
}

/**
 * Builds the provider-neutral {@link CompactCardModel} from claude-code-session's
 * {@link CompactState}, reproducing `CompactView`'s former inline derivations
 * verbatim so the rendered card is unchanged.
 * @param state - The folded compact state to adapt.
 * @param isActive - Whether the stream is live.
 * @param elapsedStr - Pre-formatted elapsed/total duration string (`''` when unset).
 * @param dateStr - Pre-formatted start date string (`''` when unset).
 * @returns The provider-neutral compact-card model.
 */
export function claudeToCompactCardModel(
  state: CompactState,
  isActive: boolean,
  elapsedStr: string,
  dateStr: string
): CompactCardModel {
  const statusWord = isActive ? 'Running' : 'Ended';
  const dotClass = state.hasErrors ? 'error' : isActive ? 'running' : 'ended';
  const subagentLabel = state.isSubagent && state.agentId ? state.agentId : undefined;

  // Stacked top-right: a RUNNING card shows the live elapsed timer; an ENDED
  // card shows the start date and surfaces the total duration in the metrics
  // row instead. The split left panel shows elapsed · date.
  const metaStacked = isActive ? elapsedStr : dateStr;
  const metaSplit = `${elapsedStr}${elapsedStr && dateStr ? ' · ' : ''}${dateStr}`;

  const modelFact = plainFact('model', state.model);
  // ENDED leads with the total duration (bold, no label); RUNNING shows it
  // live top-right instead, so the metrics row omits it.
  const durationFact: FactModel | null =
    !isActive && elapsedStr ? { key: 'duration', kind: 'value', bold: elapsedStr, label: '' } : null;

  const stackedFacts: FactModel[] = [
    durationFact,
    tokenFact(state.outputTokensTotal, 'out'),
    tokenFact(state.inputTokensTotal, 'in'),
    countFact(state.subagentCount, 'agent'),
    modelFact
  ].filter((fact): fact is FactModel => fact !== null);

  const splitFacts: FactModel[] = [
    countFact(state.turnCount, 'turn'),
    countFact(state.toolCallCount, 'tool'),
    countFact(state.subagentCount, 'agent'),
    countFact(state.filesTouched.size, 'file'),
    modelFact
  ].filter((fact): fact is FactModel => fact !== null);

  const tail: TailLineModel[] = state.tail.map(resolveLine).filter((line): line is TailLineModel => line !== null);

  return {
    dotClass,
    statusWord,
    subagentLabel,
    metaStacked,
    metaSplit,
    headline: headline(state),
    stackedFacts,
    splitFacts,
    tail
  };
}
