/**
 * Compact micro-card view for the claude-code-session stream renderer.
 *
 * Subscribes to the stream store, processes all JSONL lines through the
 * compact state machine, and renders the badge/header/tail/footer layout.
 * Manages a short highlight flash on the newest tail line when new events
 * arrive via store subscription.
 *
 * @summary Compact session card: badge, title, two-line tail, footer
 * @module components/compact/CompactView
 */

import { streamStore } from '@cards/sdk/stream-store';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompactEvent } from '../../lib/parse-session';
import type { BadgeVariant } from './Badge';
import { CompactFooter } from './CompactFooter';
import { CompactHeader } from './CompactHeader';
import type { CompactState } from './compact-state';
import { buildState, processLine } from './compact-state';
import { Tail } from './Tail';

/**
 * Formats output token count as a compact string.
 * @param total - Total output token count.
 * @returns Formatted token string (e.g. "1.2k") or empty string if zero.
 */
function formatTokens(total: number): string {
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`;
  if (total > 0) return String(total);
  return '';
}

/**
 * Formats duration as seconds string.
 * @param durationS - Session duration in seconds from the result message.
 * @param totalDurationMs - Accumulated turn duration in milliseconds.
 * @returns Formatted duration string (e.g. "42s") or empty string if unknown.
 */
function formatDuration(durationS: number, totalDurationMs: number): string {
  if (durationS > 0) return `${durationS}s`;
  if (totalDurationMs > 0) return `${Math.round(totalDurationMs / 1000)}s`;
  return '';
}

/**
 * Compact session micro-card. Processes all stream lines and renders a
 * badge/title/tail/footer summary. Highlights the newest tail line briefly
 * when new events arrive.
 * @returns Rendered compact session card element.
 */
export function CompactView(): React.ReactElement {
  const [compactState, setCompactState] = useState<CompactState>(() => {
    const storeState = streamStore.getState();
    const file = storeState.files.get(storeState.primary);
    return buildState(file ? file.lines : [], storeState.primary, file?.meta.isActive ?? false);
  });

  const [metaTitle, setMetaTitle] = useState<string>(() => {
    const storeState = streamStore.getState();
    const file = storeState.files.get(storeState.primary);
    return file?.meta.title ?? '';
  });

  const [highlight, setHighlight] = useState(false);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLineCountRef = useRef<number>(0);

  // Initialize line count tracking
  useEffect(() => {
    const storeState = streamStore.getState();
    const file = storeState.files.get(storeState.primary);
    lastLineCountRef.current = file ? file.lines.length : 0;
  }, []);

  const triggerHighlight = useCallback(() => {
    setHighlight(true);
    if (highlightTimerRef.current !== null) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlight(false);
      highlightTimerRef.current = null;
    }, 300);
  }, []);

  useEffect(() => {
    const unsubscribe = streamStore.subscribe((newState) => {
      const file = newState.files.get(newState.primary);
      const lines = file ? file.lines : [];
      const newLineCount = lines.length;

      if (newLineCount > lastLineCountRef.current) {
        // Incremental update: process only new lines
        const newLines = lines.slice(lastLineCountRef.current);
        lastLineCountRef.current = newLineCount;

        setCompactState((prev) => {
          // Clone the state for mutation
          const next: CompactState = {
            ...prev,
            tail: [...prev.tail] as [CompactEvent | null, CompactEvent | null]
          };
          for (const line of newLines) {
            processLine(next, line);
          }
          return next;
        });
        triggerHighlight();
      } else if (newLineCount < lastLineCountRef.current) {
        // File reset: rebuild from scratch
        lastLineCountRef.current = newLineCount;
        setCompactState(buildState(lines, newState.primary, file?.meta.isActive ?? false));
        setMetaTitle(file?.meta.title ?? '');
      }
    });

    return unsubscribe;
  }, [triggerHighlight]);

  // Clean up highlight timer on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const s = compactState;
  const title = s.promptText || metaTitle || 'Claude Code session';
  const durationStr = formatDuration(s.durationS, s.totalDurationMs);
  const tokenStr = formatTokens(s.outputTokensTotal);

  const variant: BadgeVariant = s.hasErrors ? 'error' : s.isSubagent ? 'agent' : 'orchestrator';

  return (
    <div className="px-2 pt-0.5 pb-1 font-vscode-editor text-[0.85em] overflow-hidden">
      <CompactHeader variant={variant} title={title} durationStr={durationStr} />
      {s.awaySummary && (
        <div className="text-[0.8em] text-vscode-descriptionForeground italic truncate mb-0.5 pl-[calc(theme(spacing.4)+theme(spacing.1.5))]">
          {s.awaySummary}
        </div>
      )}
      <Tail prev={s.tail[0]} curr={s.tail[1]} highlight={highlight} />
      <CompactFooter
        turnCount={s.turnCount}
        tokenStr={tokenStr}
        errorCount={s.errorCount}
        sessionStatus={s.sessionStatus}
      />
    </div>
  );
}
