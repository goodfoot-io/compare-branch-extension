/**
 * Compact micro-card view for the opencode-session stream renderer.
 *
 * Mirrors the codex-session {@link CodexCompactView} lifecycle: it bootstraps
 * from `streamStore.getState()` before subscribing, folds the primary file's
 * lines via {@link reconcileFolded} on each update, observes `meta.isActive`
 * for liveness, and asks the host to `close()` a stream whose primary file has
 * zero lines so no blank box shows in the card detail. Folding is incremental:
 * lines past a watermark are appended onto the prior fold, so each store
 * update only parses what is new; a shrink rebuilds fully. The folded state is
 * adapted into a provider-neutral `CompactCardModel` via
 * {@link opencodeToCompactCardModel} and rendered through the shared
 * `CompactCard` component — the DOM/CSS for the card live there, not here.
 *
 * Status is liveness-only — `RUNNING` or `ENDED` — plus an honest error dot
 * when a tool call failed. The live elapsed timer only ticks while active; the
 * interval is cleared the moment the stream ends.
 *
 * @summary Compact OpenCode session card: folds state, adapts it, renders the shared CompactCard
 * @module streams/opencode-session/www/components/compact/OpencodeCompactView
 */

import { close, streamStore } from '@cards.management/sdk/stream-store';
import type React from 'react';
import { useEffect, useState } from 'react';
import { CompactCard } from '../../../../lib/CompactCard';
import { opencodeToCompactCardModel } from '../../lib/adapt-compact-model';
import type { FoldedState } from '../../lib/compact-state';
import { buildFoldedState, reconcileFolded } from '../../lib/compact-state';

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
 * Compact OpenCode session card. Folds the primary stream into a
 * {@link FoldedState}, adapts its snapshot into a `CompactCardModel`, and ticks
 * while the stream is active. Closes the renderer when the primary file has
 * zero lines.
 * @returns Rendered compact card.
 */
export function OpencodeCompactView(): React.ReactElement {
  const [folded, setFolded] = useState<FoldedState>(() => {
    const { lines, isActive } = readPrimary();
    return buildFoldedState(lines, isActive);
  });
  const [isActive, setIsActive] = useState<boolean>(() => readPrimary().isActive);

  // Bootstrap-then-subscribe: fold once for lines that arrived between the
  // initial render and this effect (the empty-on-boot primary's
  // subscribe:response can land in exactly this window), then keep folding on
  // every store update. reconcileFolded appends only lines past its watermark,
  // so steady-state updates parse just the new lines; shrink/reset rebuilds.
  useEffect(() => {
    const sync = (): void => {
      const { lines, isActive: active } = readPrimary();
      setIsActive(active);
      setFolded((prev) => reconcileFolded(prev, lines, active));
    };
    sync();
    return streamStore.subscribe(sync);
  }, []);

  // Close a settled stream whose primary file has zero lines so the host doesn't
  // render a blank box for it. A live (active) stream is never closed for
  // emptiness: it is mid-flight and its backlog is still arriving out of band via
  // the async `subscribe:response` backfill.
  useEffect(() => {
    const checkEmpty = (): void => {
      const s = streamStore.getState();
      const file = s.files.get(s.primary);
      if (file && file.meta.lineCount === 0 && !file.meta.isActive) close();
    };
    checkEmpty();
    return streamStore.subscribe(checkEmpty);
  }, []);

  // Reconcile on a ~1s tick while the stream is active as a safety net for
  // updates that bypass the subscription. A tick with no new lines returns the
  // prior folded value by reference, so React bails out instead of re-rendering.
  // The interval is cleared on unmount and whenever `isActive` flips to false,
  // so an ended card never churns re-renders on a timer.
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      const { lines, isActive: active } = readPrimary();
      setFolded((prev) => reconcileFolded(prev, lines, active));
    }, 1000);
    return () => clearInterval(id);
  }, [isActive]);

  const model = opencodeToCompactCardModel(folded.state, isActive);
  return <CompactCard model={model} />;
}
