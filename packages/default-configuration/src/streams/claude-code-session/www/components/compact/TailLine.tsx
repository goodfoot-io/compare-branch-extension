/**
 * Single labelled event line in the compact latest-lines panel.
 *
 * Each line carries a source label (tool name, `Assistant`, `User`, or `Error`)
 * whose color encodes the source, and content whose brightness encodes role:
 * milestones (messages + `Agent`/`SendMessage` dispatches) render bright, plumbing
 * (Bash/Read/…) dim, and errors red. A single clipped line — never wraps.
 *
 * @summary Compact latest-line: source label + role-emphasized content
 * @module components/compact/TailLine
 */

import type React from 'react';
import type { CompactEvent } from '../../lib/parse-session';

/** Tool names that read as milestones rather than low-level plumbing. */
const MILESTONE_TOOLS = new Set(['Agent', 'SendMessage']);

interface TailLineProps {
  /** The event to display. */
  event: CompactEvent;
}

/** Resolved label text, label-color class, and role class for a tail event. */
interface LineParts {
  /** Source label text (tool name, `Assistant`, `User`, `Error`). */
  label: string;
  /** Label color class — `tool` blue, `asst` green, `user` purple. */
  labelClass: 'tool' | 'asst' | 'user';
  /** Role class driving content brightness — milestone / plumbing / error. */
  roleClass: 'milestone' | 'plumbing' | 'error';
  /** The line's content text. */
  text: string;
}

/**
 * Resolves the label, colors, and content for a tail event, or null when the
 * event has no renderable form (e.g. usage/turn-duration/result).
 * @param event - The compact event to classify.
 * @returns Resolved line parts, or null when the event is not renderable.
 */
function resolveLine(event: CompactEvent): LineParts | null {
  switch (event.kind) {
    case 'tool-call':
    case 'subagent-tool-call':
      return {
        label: event.toolName,
        labelClass: 'tool',
        roleClass: MILESTONE_TOOLS.has(event.toolName) ? 'milestone' : 'plumbing',
        text: event.summary
      };
    case 'text':
      return {
        label: event.role === 'user' ? 'User' : 'Assistant',
        labelClass: event.role === 'user' ? 'user' : 'asst',
        roleClass: 'milestone',
        text: event.text
      };
    case 'error':
      return { label: 'Error', labelClass: 'tool', roleClass: 'error', text: event.message };
    default:
      return null;
  }
}

/**
 * Renders one labelled latest-line. Returns null for non-renderable events.
 * @param root0 - The component props.
 * @param root0.event - The event to display.
 * @returns Rendered latest-line row, or null when the event is not renderable.
 */
export function TailLine({ event }: TailLineProps): React.ReactElement | null {
  const parts = resolveLine(event);
  if (!parts) return null;
  return (
    <div className={`line ${parts.roleClass}`}>
      <span className={`lbl ${parts.labelClass}`}>{parts.label}</span>
      <span className="txt">{parts.text}</span>
    </div>
  );
}
