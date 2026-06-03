/**
 * Compact micro-card view for the claude-code-session stream renderer.
 *
 * Renders the redesigned three-row card — a liveness dot + status + timing row,
 * the sanitized {@link headline} recap, and a de-duplicated metrics row — inside
 * the host's fixed-height box. At a wide viewport the same content reflows (via
 * CSS) into two rounded panels: recap + metrics on the left, the latest tail
 * lines on the right. Status is liveness-only (`RUNNING`/`ENDED`, with an error
 * tint) — never an asserted outcome. Streams whose primary file has no lines ask
 * the host to close the renderer so blank boxes don't show in the card detail.
 *
 * @summary Compact session card: liveness dot + headline + metrics + wide split
 * @module components/compact/CompactView
 */

import { close, streamStore } from '@cards/sdk/stream-store';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { CompactState } from './compact-state';
import { buildState, headline, processLine } from './compact-state';
import { formatCount, formatDate, formatDuration } from './format';
import { Tail } from './Tail';

/**
 * Reads the primary stream file's lines, filename, and liveness from the store.
 * @returns The primary file's lines, filename, and `isActive` flag.
 */
function readPrimary(): { lines: string[]; primary: string; isActive: boolean } {
  const s = streamStore.getState();
  const file = s.files.get(s.primary);
  return { lines: file ? file.lines : [], primary: s.primary, isActive: file?.meta.isActive ?? false };
}

/**
 * Compact session card. Folds the primary stream into {@link CompactState},
 * derives the headline and metrics, and ticks a live elapsed timer while the
 * stream is active. Closes the renderer when the primary file has zero lines.
 * @returns Rendered compact card, or null when there is nothing to show.
 */
export function CompactView(): React.ReactElement | null {
  const [compactState, setCompactState] = useState<CompactState>(() => {
    const { lines, primary, isActive } = readPrimary();
    return buildState(lines, primary, isActive);
  });
  const [isActive, setIsActive] = useState<boolean>(() => readPrimary().isActive);
  // `now` drives the live elapsed timer; it only advances while the stream is
  // active (the interval below is cleared once ended), so an ended card never
  // re-renders on a timer.
  const [now, setNow] = useState<number>(() => Date.now());

  const lastLineCountRef = useRef<number>(0);

  useEffect(() => {
    const { lines } = readPrimary();
    lastLineCountRef.current = lines.length;
  }, []);

  useEffect(() => {
    return streamStore.subscribe((newState) => {
      const file = newState.files.get(newState.primary);
      const lines = file ? file.lines : [];
      const n = lines.length;
      setIsActive(file?.meta.isActive ?? false);
      if (n > lastLineCountRef.current) {
        const newLines = lines.slice(lastLineCountRef.current);
        lastLineCountRef.current = n;
        setCompactState((prev) => {
          const next: CompactState = { ...prev, tail: [...prev.tail] };
          for (const line of newLines) processLine(next, line);
          return next;
        });
      } else if (n < lastLineCountRef.current) {
        lastLineCountRef.current = n;
        setCompactState(buildState(lines, newState.primary, file?.meta.isActive ?? false));
      }
    });
  }, []);

  // Tick the live elapsed timer ~1s, but only while the stream is active. The
  // interval is cleared on unmount and whenever `isActive` flips to false, so an
  // ended card never churns re-renders.
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isActive]);

  // Close a stream whose primary file has zero lines so the host doesn't render
  // a blank box for it.
  useEffect(() => {
    const checkEmpty = (): void => {
      const state = streamStore.getState();
      const file = state.files.get(state.primary);
      if (file && file.meta.lineCount === 0) close();
    };
    checkEmpty();
    return streamStore.subscribe(checkEmpty);
  }, []);

  const { firstTimestamp, lastTimestamp, hasErrors } = compactState;
  const elapsedMs = isActive ? Math.max(0, now - firstTimestamp) : Math.max(0, lastTimestamp - firstTimestamp);
  const elapsedStr = firstTimestamp > 0 ? formatDuration(elapsedMs) : '';
  const dateStr = formatDate(firstTimestamp);
  const statusWord = isActive ? 'Running' : 'Ended';
  const dotClass = hasErrors ? 'error' : isActive ? 'running' : 'ended';

  const headlineText = headline(compactState);

  return (
    <div className="compact-container">
      <div className="split-row font-vscode-editor">
        <div className="panel panel-left">
          <div className="body">
            <div className="row-head">
              <span className={`dot ${dotClass}`} />
              <span className="status">{statusWord}</span>
              <span className="meta-right">
                {/* Stacked card shows the date alone; the split left panel shows
                    elapsed · date (toggled by CSS at the breakpoint). */}
                <span className="meta-stacked">{dateStr}</span>
                <span className="meta-split">
                  {elapsedStr}
                  {elapsedStr && dateStr ? ' · ' : ''}
                  {dateStr}
                </span>
              </span>
            </div>
            <div className="headline">{headlineText}</div>
            <Metrics state={compactState} elapsedStr={elapsedStr} />
          </div>
        </div>
        <div className="panel panel-right">
          <Tail events={compactState.tail} />
        </div>
      </div>
    </div>
  );
}

interface MetricsProps {
  /** The compact state to read tallies from. */
  state: CompactState;
  /** Pre-formatted elapsed/total duration string. */
  elapsedStr: string;
}

/**
 * Renders both metrics variants — the stacked-card row (duration · tokens ·
 * agents · model) and the split left-panel row (turns · tools · agents · files ·
 * model) — letting CSS show exactly one per layout. Numbers are bold; the rest
 * is dimmed and separator-joined.
 * @param root0 - The component props.
 * @param root0.state - The compact state to read tallies from.
 * @param root0.elapsedStr - Pre-formatted elapsed/total duration string.
 * @returns The two metrics rows.
 */
function Metrics({ state, elapsedStr }: MetricsProps): React.ReactElement {
  const sep = <span className="sep">·</span>;
  const model = state.model;
  return (
    <>
      <div className="metrics metrics-stacked">
        {elapsedStr && (
          <>
            <b>{elapsedStr}</b>
            {sep}
          </>
        )}
        <b>{formatCount(state.outputTokensTotal)}</b> out{sep}
        <b>{formatCount(state.inputTokensTotal)}</b> in{sep}
        <b>{state.subagentCount}</b> agents
        {model && (
          <>
            {sep}
            {model}
          </>
        )}
      </div>
      <div className="metrics metrics-split">
        <b>{state.turnCount}</b> turns{sep}
        <b>{state.toolCallCount}</b> tools{sep}
        <b>{state.subagentCount}</b> agents{sep}
        <b>{state.filesTouched.size}</b> files
        {model && (
          <>
            {sep}
            {model}
          </>
        )}
      </div>
    </>
  );
}
