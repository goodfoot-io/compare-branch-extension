/**
 * Renders a {@link CompactEvent} as a single human-readable line of prose.
 *
 * Shared by the headline fallback (when there is no `away_summary` and no
 * genuine assistant text, the latest tail event becomes the recap) and as the
 * source of the label/text split the latest-lines panel shows. Tool calls read
 * as `<ToolName> <summary>` (e.g. `Agent Implement Phase 3`, `Bash Run the test
 * suite`), text events as their prose, and errors as their message.
 *
 * @summary Event → one-line prose for the headline fallback and tail panel
 * @module lib/describe-event
 */

import type { CompactEvent } from './parse-session';

/**
 * Describes a tail event as a single line of prose, or `''` when the event has
 * no renderable form (usage / turn-duration / result).
 *
 * @param event - The compact event to describe.
 * @returns A one-line description, or `''` when the event is not renderable.
 */
export function describeEvent(event: CompactEvent): string {
  switch (event.kind) {
    case 'tool-call':
    case 'subagent-tool-call': {
      const summary = event.summary.trim();
      return summary ? `${event.toolName} ${summary}` : event.toolName;
    }
    case 'text':
      return event.text.trim();
    case 'error':
      return event.message.trim();
    default:
      return '';
  }
}
