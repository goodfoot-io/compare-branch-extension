/**
 * Compact micro-card view for the claude-code-session stream renderer.
 *
 * Renders either the session's `away_summary` or, failing that, the
 * most recent user message, as markdown clamped to the compact area.
 * Streams whose primary file has no lines at all ask the host to close
 * the renderer so blank boxes don't show up in the card detail.
 *
 * @summary Compact session card: away-summary-or-latest-prompt, as markdown
 * @module components/compact/CompactView
 */

import { close, streamStore } from '@cards/sdk/stream-store';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { renderMarkdownNodes } from '../../lib/markdown';
import type { CompactEvent } from '../../lib/parse-session';
import type { CompactState } from './compact-state';
import { buildState, processLine } from './compact-state';

/**
 * Compact session card. Shows `away_summary` if present, otherwise the
 * most recent user prompt, rendered as markdown and clamped to the
 * iframe's height. Closes the renderer when the primary stream file has
 * no lines at all.
 * @returns Rendered compact card, or null when there is nothing to show.
 */
export function CompactView(): React.ReactElement | null {
  const [compactState, setCompactState] = useState<CompactState>(() => {
    const s = streamStore.getState();
    const file = s.files.get(s.primary);
    return buildState(file ? file.lines : [], s.primary, file?.meta.isActive ?? false);
  });

  const lastLineCountRef = useRef<number>(0);

  useEffect(() => {
    const s = streamStore.getState();
    const file = s.files.get(s.primary);
    lastLineCountRef.current = file ? file.lines.length : 0;
  }, []);

  useEffect(() => {
    return streamStore.subscribe((newState) => {
      const file = newState.files.get(newState.primary);
      const lines = file ? file.lines : [];
      const n = lines.length;
      if (n > lastLineCountRef.current) {
        const newLines = lines.slice(lastLineCountRef.current);
        lastLineCountRef.current = n;
        setCompactState((prev) => {
          const next: CompactState = {
            ...prev,
            tail: [...prev.tail] as [CompactEvent | null, CompactEvent | null]
          };
          for (const line of newLines) processLine(next, line);
          return next;
        });
      } else if (n < lastLineCountRef.current) {
        lastLineCountRef.current = n;
        setCompactState(buildState(lines, newState.primary, file?.meta.isActive ?? false));
      }
    });
  }, []);

  // Close a stream whose primary file has zero lines so the host doesn't
  // render a blank box for it.
  useEffect(() => {
    const checkEmpty = (): void => {
      const state = streamStore.getState();
      const file = state.files.get(state.primary);
      if (file && file.meta.lineCount === 0) close();
    };
    checkEmpty();
    return streamStore.subscribe(checkEmpty);
  }, []);

  const content = compactState.awaySummary || compactState.promptText;

  return (
    <div className="compact-container">
      <div className="compact-content font-vscode-editor text-[0.85em]">
        {content ? renderMarkdownNodes(content, 'compact') : null}
      </div>
    </div>
  );
}
