/**
 * Latest-lines panel for the wide-viewport split of the compact card.
 *
 * Renders the most recent (up to three) renderable tail events as source-
 * labelled, role-emphasized lines via {@link TailLine}.
 *
 * @summary Compact latest-lines panel: the last three labelled tail events
 * @module components/compact/Tail
 */

import type React from 'react';
import type { CompactEvent } from '../../lib/parse-session';
import { TailLine } from './TailLine';

/** Number of trailing tail events the split right panel displays. */
const VISIBLE_LINES = 3;

interface TailProps {
  /** Rolling tail buffer (newest last); only the last {@link VISIBLE_LINES} show. */
  events: CompactEvent[];
}

/**
 * Derives a stable-enough React key for a tail event from its kind and content,
 * suffixed with its position so two identical lines remain distinct.
 * @param event - The tail event.
 * @param index - The event's index within the visible window.
 * @returns A string key.
 */
function lineKey(event: CompactEvent, index: number): string {
  let content = '';
  if (event.kind === 'tool-call' || event.kind === 'subagent-tool-call') content = `${event.toolName}:${event.summary}`;
  else if (event.kind === 'text') content = `${event.role}:${event.text}`;
  else if (event.kind === 'error') content = event.message;
  return `${index}:${event.kind}:${content}`;
}

/**
 * Renders the latest (up to three) tail events as labelled lines.
 * @param root0 - The component props.
 * @param root0.events - Rolling tail buffer (newest last).
 * @returns Rendered latest-lines list.
 */
export function Tail({ events }: TailProps): React.ReactElement {
  const visible = events.slice(-VISIBLE_LINES);
  return (
    <>
      {visible.map((event, i) => (
        <TailLine key={lineKey(event, i)} event={event} />
      ))}
    </>
  );
}
