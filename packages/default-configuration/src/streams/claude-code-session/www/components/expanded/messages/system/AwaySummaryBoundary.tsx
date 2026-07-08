/**
 * Away-summary boundary for the expanded transcript.
 *
 * Renders the `away_summary` system subtype — written when Claude exits
 * mid-session — as a {@link SessionBoundary}-style separator (a centered rule
 * with a label) that expands to the full away `content` in place. The
 * disclosure rides the shared {@link ExpandableRow} primitive so its motion
 * matches every other expandable row, with the summary content rendered
 * markdown-aware.
 *
 * @summary Away-summary separator that expands to the full away content
 * @module components/expanded/messages/system/AwaySummaryBoundary
 */

import type React from 'react';
import { ExpandableRow } from '../../../../../../lib/accordions';
import { renderMarkdown } from '../../../../../../lib/markdown';

interface AwaySummaryBoundaryProps {
  /** The full away-summary content shown when expanded. */
  content: string;
}

/**
 * Renders the away-summary boundary separator and its expandable content.
 * @param root0 - The component props.
 * @param root0.content - The full away-summary content shown when expanded.
 * @returns Rendered away-summary boundary element.
 */
export function AwaySummaryBoundary({ content }: AwaySummaryBoundaryProps): React.ReactElement {
  const header = (
    <span className="flex items-center gap-2 flex-1 text-[0.8em] text-vscode-descriptionForeground">
      <span
        className="flex-1 h-px"
        style={{ background: 'var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))' }}
      />
      <span className="shrink-0">Away summary</span>
      <span
        className="flex-1 h-px"
        style={{ background: 'var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))' }}
      />
    </span>
  );

  return (
    <div className="my-1">
      <ExpandableRow header={header}>
        <div
          className="cc-text text-[11px] pb-2 break-words overflow-wrap-anywhere min-w-0 max-w-full"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      </ExpandableRow>
    </div>
  );
}
