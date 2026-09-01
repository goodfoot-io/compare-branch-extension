/**
 * Compact micro-card view for the antigravity-session stream renderer.
 *
 * Mirrors the opencode-session compact view's lifecycle: it bootstraps from
 * `streamStore.getState()` before subscribing, folds the primary file's lines
 * via {@link reconcileFolded} on each update, observes `meta.isActive` for
 * liveness, and asks the host to `close()` a stream whose primary file has
 * zero lines so no blank box shows in the card detail. Folding is
 * incremental: lines past a watermark are appended onto the prior fold, so
 * each store update only parses what is new; a shrink rebuilds fully. The
 * folded state is adapted into a provider-neutral `CompactCardModel` via
 * {@link antigravityToCompactCardModel} and rendered through the shared
 * `CompactCard` component — the DOM/CSS for the card live there, not here.
 *
 * Status is liveness-only — `Running` or `Ended` — plus an honest error dot
 * when a destination line failed the pinned record shape. There is no live
 * elapsed timer: destination records carry no timestamps to derive one from.
 *
 * @summary Compact Antigravity session card: folds state, adapts it, renders the shared CompactCard
 * @module streams/antigravity-session/www/components/compact/AntigravityCompactView
 */

import { close, streamStore } from '@cards.management/sdk/stream-store';
import type React from 'react';
import { useEffect, useState } from 'react';
import { CompactCard } from '../../../../lib/CompactCard';
import { antigravityToCompactCardModel } from '../../lib/adapt-compact-model';
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
 * Compact Antigravity session card. Folds the primary stream into a
 * {@link FoldedState}, adapts its snapshot into a `CompactCardModel`, and
 * reconciles on every store update. Closes the renderer when the primary
 * file has zero lines and the stream has settled.
 * @returns Rendered compact card.
 */
export function AntigravityCompactView(): React.ReactElement {
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

  // Close a settled stream whose primary file has zero lines so the host
  // doesn't render a blank box for it. A live (active) stream is never closed
  // for emptiness: it is mid-flight and its backlog is still arriving out of
  // band via the async `subscribe:response` backfill.
  useEffect(() => {
    const checkEmpty = (): void => {
      const s = streamStore.getState();
      const file = s.files.get(s.primary);
      if (file && file.meta.lineCount === 0 && !file.meta.isActive) close();
    };
    checkEmpty();
    return streamStore.subscribe(checkEmpty);
  }, []);

  const model = antigravityToCompactCardModel(folded.state, isActive);
  return <CompactCard model={model} />;
}
