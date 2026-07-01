/**
 * Compact micro-card view for the codex-session stream renderer.
 *
 * Mirrors the claude-code-session {@link CompactView} lifecycle: it bootstraps
 * from `streamStore.getState()` before subscribing, folds the primary file's
 * lines via {@link buildCodexCompactState} on each update, observes
 * `meta.isActive` for liveness, and asks the host to `close()` a stream whose
 * primary file has zero lines so no blank box shows in the card detail.
 *
 * Status is liveness-only — `RUNNING` or `ENDED` — and never an asserted
 * outcome: the Codex rollout carries no honest success signal, so this view
 * fabricates none. The live elapsed timer only ticks while active; the interval
 * is cleared the moment the stream ends.
 *
 * @summary Compact Codex session card: liveness dot + headline + metrics + tail
 * @module streams/codex-session/www/components/compact/CodexCompactView
 */

import { close, streamStore } from '@cards.management/sdk/stream-store';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { CodexCompactState, CodexTailEvent } from '../../lib/compact-state';
import { buildCodexCompactState } from '../../lib/compact-state';

/** Number of trailing tail events the split right panel displays. */
const VISIBLE_TAIL = 3;

/**
 * Reads the primary stream file's lines and liveness from the store.
 * @returns The primary file's lines and `isActive` flag.
 */
function readPrimary(): { lines: string[]; isActive: boolean } {
  const s = streamStore.getState();
  const file = s.files.get(s.primary);
  return { lines: file ? file.lines : [], isActive: file?.meta.isActive ?? false };
}

/**
 * Folds the primary file into {@link CodexCompactState}. Because
 * {@link buildCodexCompactState} is a pure rebuild from the full line array, a
 * stream shrink/reset produces correct state with no stale carryover — no
 * watermark is tracked here.
 * @returns The freshly folded compact state plus the source liveness flag.
 */
function foldPrimary(): { state: CodexCompactState; isActive: boolean } {
  const { lines, isActive } = readPrimary();
  return { state: buildCodexCompactState(lines, isActive), isActive };
}

/**
 * Formats a duration in milliseconds as a compact `h m s` / `m s` / `s` string.
 * @param ms - The duration in milliseconds.
 * @returns The compact duration string, or the empty string for a zero/absent duration.
 */
function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms <= 0) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Formats a token total compactly (e.g. `12.3k`).
 * @param total - The token total.
 * @returns The compact string.
 */
function formatCount(total: number): string {
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`;
  return String(total);
}

/** One metric fact: a stable key plus its rendered node. */
interface Fact {
  key: string;
  node: React.ReactNode;
}

/**
 * Builds a count fact (`<b>{count}</b> noun[s]`), or null when the count is
 * zero so zero-valued counts drop out of the row entirely.
 * @param count - The tally to render.
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
 * Builds a token fact (`<b>{formatted}</b> label`), or null when the total is zero.
 * @param total - The summed token count.
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
 * Interleaves present facts with `·` separators; null facts are dropped so the
 * row never carries a leading, trailing, or doubled separator.
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
 * Derives a stable-enough React key for a tail event from its kind and content,
 * suffixed with its position so two identical lines remain distinct.
 * @param event - The bounded recent-activity entry to key.
 * @param index - The event's index within the visible window.
 * @returns A string key.
 */
function tailKey(event: CodexTailEvent, index: number): string {
  return `${index}:${event.kind}:${event.text}`;
}

/**
 * Renders the latest (up to {@link VISIBLE_TAIL}) tail events as labelled lines.
 * @param root0 - The component props.
 * @param root0.events - Rolling tail buffer (newest last).
 * @returns Rendered latest-lines list.
 */
function Tail({ events }: { events: CodexTailEvent[] }): React.ReactElement {
  const visible = events.slice(-VISIBLE_TAIL);
  return (
    <>
      {visible.map((event, i) => (
        <div className="line" key={tailKey(event, i)}>
          <span className={`lbl ${event.kind}`}>{event.kind}</span>
          <span className="txt">{event.text}</span>
        </div>
      ))}
    </>
  );
}

/**
 * Compact Codex session card. Folds the primary stream into
 * {@link CodexCompactState}, derives the headline and metrics, and ticks a live
 * elapsed timer while the stream is active. Closes the renderer when the primary
 * file has zero lines.
 * @returns Rendered compact card.
 */
export function CodexCompactView(): React.ReactElement {
  const [state, setState] = useState<CodexCompactState>(() => foldPrimary().state);
  const [isActive, setIsActive] = useState<boolean>(() => readPrimary().isActive);

  // Bootstrap-then-subscribe: fold once for lines that arrived between the
  // initial render and this effect (the empty-on-boot primary's
  // subscribe:response can land in exactly this window), then keep folding on
  // every store update. buildCodexCompactState is a full rebuild, so this is
  // correct for append, no-op, and shrink/reset alike.
  useEffect(() => {
    const sync = (): void => {
      const { state: next, isActive: active } = foldPrimary();
      setIsActive(active);
      setState(next);
    };
    sync();
    return streamStore.subscribe(sync);
  }, []);

  // Close a stream whose primary file has zero lines so the host doesn't render
  // a blank box for it.
  useEffect(() => {
    const checkEmpty = (): void => {
      const s = streamStore.getState();
      const file = s.files.get(s.primary);
      if (file && file.meta.lineCount === 0) close();
    };
    checkEmpty();
    return streamStore.subscribe(checkEmpty);
  }, []);

  // Re-fold on a ~1s tick while the stream is active so the duration the lib
  // derives from the first/last line timestamps stays current as new lines
  // arrive. The interval is cleared on unmount and whenever `isActive` flips to
  // false, so an ended card never churns re-renders on a timer.
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setState(foldPrimary().state), 1000);
    return () => clearInterval(id);
  }, [isActive]);

  // Duration is the first/last-timestamp span the lib derived — honest for both
  // a running and an ended session, with no fabricated wall-clock projection.
  const durationStr = formatDuration(state.durationMs);
  const statusWord = isActive ? 'Running' : 'Ended';
  const dotClass = isActive ? 'running' : 'ended';
  const stackedMetaStr = durationStr;

  const tokens = state.tokenCount;

  // Duration is surfaced top-right (meta-right), so the metrics row does not
  // repeat it.
  const stackedFacts: Array<Fact | null> = [
    tokens ? tokenFact(tokens.output, 'out') : null,
    tokens ? tokenFact(tokens.input, 'in') : null,
    countFact(state.toolCallCount, 'tool'),
    state.model ? { key: 'model', node: state.model } : null
  ];

  const splitFacts: Array<Fact | null> = [
    countFact(state.turnCount, 'turn'),
    countFact(state.toolCallCount, 'tool'),
    tokens ? tokenFact(tokens.output, 'out') : null,
    state.model ? { key: 'model', node: state.model } : null
  ];

  return (
    <div className="compact-container">
      <div className="split-row font-vscode-editor">
        <div className="panel panel-left">
          <div className="body">
            <div className="row-head">
              <span className={`dot ${dotClass}`} />
              <span className="status">{statusWord}</span>
              <span className="meta-right">
                <span className="meta-stacked">{stackedMetaStr}</span>
                <span className="meta-split">{durationStr}</span>
              </span>
            </div>
            <div className="headline">{state.headlineText}</div>
            <div className="metrics metrics-stacked">{joinFacts(stackedFacts)}</div>
            <div className="metrics metrics-split">{joinFacts(splitFacts)}</div>
          </div>
        </div>
        <div className="panel panel-right">
          <Tail events={state.tail} />
        </div>
      </div>
    </div>
  );
}
