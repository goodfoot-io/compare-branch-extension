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
  // Stacked top-right: a RUNNING card shows the live elapsed timer (per the
  // spec's running mockup); an ENDED card shows the start date and surfaces the
  // total duration in the metrics row instead.
  const stackedMetaStr = isActive ? elapsedStr : dateStr;

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
                {/* Stacked card: live timer while running, start date once ended.
                    The split left panel shows elapsed · date (toggled by CSS). */}
                <span className="meta-stacked">{stackedMetaStr}</span>
                <span className="meta-split">
                  {elapsedStr}
                  {elapsedStr && dateStr ? ' · ' : ''}
                  {dateStr}
                </span>
              </span>
            </div>
            <div className="headline">{headlineText}</div>
            <Metrics state={compactState} elapsedStr={elapsedStr} isActive={isActive} />
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
  /** Whether the session is live; a RUNNING card shows the timer top-right, so
   *  its stacked metrics row does not repeat the duration. */
  isActive: boolean;
}

/** One metric fact: a stable key plus its rendered node (bold value + label). */
interface Fact {
  /** Stable React key, unique within a row (the fact's noun/role). */
  key: string;
  /** The rendered fact node. */
  node: React.ReactNode;
}

/**
 * Builds a count fact (`<b>{count}</b> noun[s]`), or null when the count is
 * zero so zero-valued counts drop out of the row entirely. The noun pluralizes
 * for any count other than 1.
 * @param count - The tally to render (e.g. turns, tool calls, files touched).
 * @param noun - The singular noun for the tally.
 * @returns The fact, or null when `count` is zero.
 */
function countFact(count: number, noun: string): Fact | null {
  if (count <= 0) return null;
  return {
    key: noun,
    node: (
      <>
        <b>{count}</b> {count === 1 ? noun : `${noun}s`}
      </>
    )
  };
}

/**
 * Builds a token fact (`<b>{formatted}</b> label`), or null when the total is
 * zero so an empty session shows no `0 out` / `0 in`.
 * @param total - The summed token count to format compactly.
 * @param label - The trailing label (`out` / `in`).
 * @returns The fact, or null when `total` is zero.
 */
function tokenFact(total: number, label: string): Fact | null {
  if (total <= 0) return null;
  return {
    key: label,
    node: (
      <>
        <b>{formatCount(total)}</b> {label}
      </>
    )
  };
}

/**
 * Interleaves present facts with `·` separators. A null fact is dropped, so the
 * row never carries a leading, trailing, or doubled separator around an omitted
 * fact.
 * @param facts - Facts, with nulls for omitted entries.
 * @returns The separator-joined row content.
 */
function joinFacts(facts: Array<Fact | null>): React.ReactElement {
  const present = facts.filter((f): f is Fact => f !== null);
  return (
    <>
      {present.map((fact, i) => (
        <span key={fact.key}>
          {i > 0 && <span className="sep">·</span>}
          {fact.node}
        </span>
      ))}
    </>
  );
}

/**
 * Renders both metrics variants — the stacked-card row and the split left-panel
 * row — letting CSS show exactly one per layout. Counts pluralize correctly and
 * zero-valued counts are omitted so the row stays a quiet line of real facts;
 * the model is always kept when present, and token facts appear when non-zero. A
 * RUNNING stacked row omits the duration (shown live top-right); an ENDED
 * stacked row leads with the total duration.
 * @param root0 - The component props.
 * @param root0.state - The compact state to read tallies from.
 * @param root0.elapsedStr - Pre-formatted elapsed/total duration string.
 * @param root0.isActive - Whether the session is live.
 * @returns The two metrics rows.
 */
function Metrics({ state, elapsedStr, isActive }: MetricsProps): React.ReactElement {
  const modelFact: Fact | null = state.model ? { key: 'model', node: state.model } : null;
  // ENDED leads with the total duration; RUNNING shows it live top-right.
  const durationFact: Fact | null = !isActive && elapsedStr ? { key: 'duration', node: <b>{elapsedStr}</b> } : null;

  const stackedFacts: Array<Fact | null> = [
    durationFact,
    tokenFact(state.outputTokensTotal, 'out'),
    tokenFact(state.inputTokensTotal, 'in'),
    countFact(state.subagentCount, 'agent'),
    modelFact
  ];

  const splitFacts: Array<Fact | null> = [
    countFact(state.turnCount, 'turn'),
    countFact(state.toolCallCount, 'tool'),
    countFact(state.subagentCount, 'agent'),
    countFact(state.filesTouched.size, 'file'),
    modelFact
  ];

  return (
    <>
      <div className="metrics metrics-stacked">{joinFacts(stackedFacts)}</div>
      <div className="metrics metrics-split">{joinFacts(splitFacts)}</div>
    </>
  );
}
