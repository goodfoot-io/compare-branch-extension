/**
 * Two-line tail section for the compact micro-card view.
 *
 * Renders the two most recent events, with the newest line highlighted
 * briefly when new events arrive.
 *
 * @summary Compact tail: two TailLines with highlight animation
 * @module components/compact/Tail
 */

import type React from 'react';
import type { CompactEvent } from '../../lib/parse-session';
import { TailLine } from './TailLine';

interface TailProps {
  /** Older of the two visible events (may be null). */
  prev: CompactEvent | null;
  /** Newest of the two visible events (may be null). */
  curr: CompactEvent | null;
  /** Whether to highlight the newest line. */
  highlight: boolean;
}

/**
 * Two-line tail display: prev (no highlight) + curr (highlighted when new).
 * Returns null when both events are null.
 * @param root0 - The component props.
 * @param root0.prev - Older of the two visible events (may be null).
 * @param root0.curr - Newest of the two visible events (may be null).
 * @param root0.highlight - Whether to highlight the newest line.
 * @returns Rendered tail container, or null when both events are null.
 */
export function Tail({ prev, curr, highlight }: TailProps): React.ReactElement | null {
  if (!prev && !curr) return null;
  return (
    <div className="flex flex-col gap-px mb-0.5">
      <TailLine event={prev} highlight={false} />
      <TailLine event={curr} highlight={highlight} />
    </div>
  );
}
