/**
 * Compact micro-card view for the codex-session stream renderer.
 *
 * Mirrors the claude-code-session {@link CompactView} lifecycle: it bootstraps
 * from `streamStore.getState()` before subscribing, folds the primary file's
 * lines via {@link buildCodexCompactState} on each update, observes
 * `meta.isActive` for liveness, and asks the host to `close()` a stream whose
 * primary file has zero lines so no blank box shows in the card detail. The
 * folded state is adapted into a provider-neutral `CompactCardModel` via
 * {@link codexToCompactCardModel} and rendered through the shared `CompactCard`
 * component — the DOM/CSS for the card live there, not here.
 *
 * Status is liveness-only — `RUNNING` or `ENDED` — and never an asserted
 * outcome: the Codex rollout carries no honest success signal, so this view
 * fabricates none. The live elapsed timer only ticks while active; the interval
 * is cleared the moment the stream ends.
 *
 * @summary Compact Codex session card: folds state, adapts it, renders the shared CompactCard
 * @module streams/codex-session/www/components/compact/CodexCompactView
 */

import { close, streamStore } from '@cards.management/sdk/stream-store';
import type React from 'react';
import { useEffect, useState } from 'react';
import { CompactCard } from '../../../../lib/CompactCard';
import { codexToCompactCardModel } from '../../lib/adapt-compact-model';
import type { CodexCompactState } from '../../lib/compact-state';
import { buildCodexCompactState } from '../../lib/compact-state';

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
 * Compact Codex session card. Folds the primary stream into
 * {@link CodexCompactState}, adapts it into a `CompactCardModel`, and ticks a
 * live elapsed timer while the stream is active. Closes the renderer when the
 * primary file has zero lines.
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

  // Close a settled stream whose primary file has zero lines so the host doesn't
  // render a blank box for it. A live (active) stream is never closed for
  // emptiness: it is mid-flight and its backlog is still arriving out of band via
  // the async `subscribe:response` backfill (the host boots the iframe with no
  // lines and the server seeds `stream:started` with lineCount:0), so closing on
  // the seed would collapse the live transcript pane the instant it opens.
  useEffect(() => {
    const checkEmpty = (): void => {
      const s = streamStore.getState();
      const file = s.files.get(s.primary);
      if (file && file.meta.lineCount === 0 && !file.meta.isActive) close();
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

  const model = codexToCompactCardModel(state, isActive);
  return <CompactCard model={model} />;
}
