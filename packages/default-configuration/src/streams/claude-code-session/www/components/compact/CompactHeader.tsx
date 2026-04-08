/**
 * Header row for the compact micro-card view.
 *
 * Displays the status badge, session title (truncated), and elapsed duration.
 *
 * @summary Compact view header: badge + title + duration
 * @module components/compact/CompactHeader
 */

import type React from 'react';
import type { BadgeVariant } from './Badge';
import { Badge } from './Badge';

interface CompactHeaderProps {
  /** Badge variant to show. */
  variant: BadgeVariant;
  /** Session title or prompt text. */
  title: string;
  /** Formatted duration string (e.g. "42s"), or empty string if unknown. */
  durationStr: string;
}

/**
 * Header row: badge + title + optional duration.
 * @param root0 - The component props.
 * @param root0.variant - Badge variant to show.
 * @param root0.title - Session title or prompt text.
 * @param root0.durationStr - Formatted duration string (e.g. "42s"), or empty string if unknown.
 * @returns Rendered header row element.
 */
export function CompactHeader({ variant, title, durationStr }: CompactHeaderProps): React.ReactElement {
  return (
    <div className="flex items-center gap-1.5 mb-0.5">
      <Badge variant={variant} />
      <span className="font-vscode-editor text-[0.85em] overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0 text-vscode-foreground">
        {title}
      </span>
      {durationStr && (
        <span className="text-[0.8em] text-vscode-descriptionForeground whitespace-nowrap">{durationStr}</span>
      )}
    </div>
  );
}
