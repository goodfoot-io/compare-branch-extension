/**
 * Expanded session transcript view for the antigravity-session renderer.
 *
 * Mirrors the codex-session expanded view's lifecycle: it parses the primary
 * file's initial history, subscribes to the stream store for appends, and
 * rebuilds on a file reset (`subscribe:response`).
 *
 * The render model comes from {@link renderAntigravityTranscript}, a pure
 * transform that rebuilds the full item list from the line array — ordering
 * by source `idx`, `(idx, hash)` idempotence, and deterministic anomaly
 * collation are all re-derived identically on every update, so appends
 * preserve prior items and a reset discards stale ones.
 *
 * This file owns only the stream-store subscription and the sticky
 * `SessionHeader` composition; grouping the flat item list into
 * `ThreadMessageLike[]` messages (and `deriveStatus`) lives in the store-free
 * {@link ../../lib/to-thread-messages} module. The messages render through
 * the shared `StreamThread` (../../../../lib/aui), with the `agy-anomaly`
 * named-anomaly part registered via `dataComponents`
 * (./AntigravityDataParts). The sticky header shows only liveness — the
 * destination-record contract carries no model/cwd/thread identity.
 *
 * @summary Expanded Antigravity session view: status header + shared StreamThread
 * @module streams/antigravity-session/www/components/expanded/AntigravityExpandedView
 */

import { streamStore } from '@cards.management/sdk/stream-store';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { StreamThread } from '../../../../lib/aui';
import { SessionHeader } from '../../../../lib/SessionHeader';
import type { TranscriptItem } from '../../lib/render-transcript';
import { renderAntigravityTranscript } from '../../lib/render-transcript';
import { deriveStatus, toThreadMessages } from '../../lib/to-thread-messages';
import { AnomalyDataPart } from './AntigravityDataParts';

/** Antigravity-specific `data` part renderers, merged over the shared four in `StreamThread`. */
const ANTIGRAVITY_DATA_COMPONENTS = {
  'agy-anomaly': AnomalyDataPart
};

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
 * Renders the idx-ordered transcript items for an Antigravity session, with a
 * sticky {@link SessionHeader} (liveness status only) above the scrolling
 * transcript body.
 * @returns Rendered expanded transcript view element.
 */
export function AntigravityExpandedView(): React.ReactElement {
  const [items, setItems] = useState<TranscriptItem[]>(() => renderAntigravityTranscript(readPrimary().lines));
  const [isActive, setIsActive] = useState<boolean>(() => readPrimary().isActive);

  // Bootstrap-then-subscribe. Rebuilding from the full line array on every
  // update keeps append and reset both correct: appends re-derive prior items
  // identically (so they are preserved) and a reset's shorter array yields a
  // strictly smaller list (so stale items are discarded).
  useEffect(() => {
    const sync = (): void => {
      const primary = readPrimary();
      setItems(renderAntigravityTranscript(primary.lines));
      setIsActive(primary.isActive);
    };
    sync();
    return streamStore.subscribe(sync);
  }, []);

  const status = deriveStatus(items, isActive);
  const { messages, isRunning } = useMemo(() => toThreadMessages(items, isActive), [items, isActive]);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Destination records carry no model/cwd/thread identity — the header
          is a liveness strip only. */}
      <SessionHeader model="" cwd="" status={status} />
      <div className="font-vscode-editor flex-1 min-h-0">
        {items.length === 0 ? (
          <div className="agy-empty">No Antigravity session activity yet.</div>
        ) : (
          <StreamThread
            messages={messages}
            isRunning={isRunning}
            dataComponents={ANTIGRAVITY_DATA_COMPONENTS}
            assistantName="Antigravity"
            assistantIcon="sparkle"
          />
        )}
      </div>
    </div>
  );
}
