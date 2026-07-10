/**
 * Expanded session transcript view for the codex-session renderer.
 *
 * Mirrors the claude-code-session {@link ExpandedView} lifecycle: it parses the
 * primary file's initial `history`, subscribes to the stream store for
 * `stream:line` appends, and rebuilds on a file reset (`subscribe:response`).
 *
 * The render model comes from {@link renderCodexTranscript}, a pure transform
 * that rebuilds the full item list from the line array. Because it is stateless,
 * an append preserves prior items (they re-derive identically) and a reset
 * discards stale ones (the shorter replacement array produces fewer items). The
 * transform itself upholds the three Codex defensive contracts — raw/pretty
 * `arguments`, `string | ContentItem[]` output, and standalone orphan outputs.
 *
 * This file owns only the stream-store subscription and the sticky
 * `SessionHeader` composition; grouping the flat item list into
 * `ThreadMessageLike[]` messages (and the `deriveStatus` status derivation)
 * lives in the store-free {@link ../../lib/to-thread-messages} module so it
 * stays unit-testable without a live `window.__STREAM_INIT__` host context.
 * The messages render through the shared `StreamThread` (../../../../lib/aui),
 * with `image-note`/`event-activity` provider-specific data parts registered
 * via `dataComponents` (./CodexDataParts).
 *
 * @summary Expanded Codex session view: sticky header + shared StreamThread
 * @module streams/codex-session/www/components/expanded/CodexExpandedView
 */

import { streamStore } from '@cards.management/sdk/stream-store';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { StreamThread } from '../../../../lib/aui';
import { SessionHeader } from '../../../../lib/SessionHeader';
import type { TranscriptItem } from '../../lib/render-transcript';
import { renderCodexTranscript } from '../../lib/render-transcript';
import { deriveStatus, toThreadMessages } from '../../lib/to-thread-messages';
import { EventActivityDataPart, ImageNoteDataPart } from './CodexDataParts';

/** Codex-specific `data` part renderers, merged over the shared four in `StreamThread`. */
const CODEX_DATA_COMPONENTS = {
  'image-note': ImageNoteDataPart,
  'event-activity': EventActivityDataPart
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
 * Renders the ordered transcript items for a Codex session, with a sticky
 * {@link SessionHeader} above the scrolling transcript body.
 * @returns Rendered expanded transcript view element.
 */
export function CodexExpandedView(): React.ReactElement {
  const [items, setItems] = useState<TranscriptItem[]>(() => renderCodexTranscript(readPrimary().lines));
  const [isActive, setIsActive] = useState<boolean>(() => readPrimary().isActive);

  // Bootstrap-then-subscribe. Rebuilding from the full line array on every
  // update keeps append and reset both correct: appends re-derive prior items
  // identically (so they are preserved) and a reset's shorter array yields a
  // strictly smaller list (so stale items are discarded).
  useEffect(() => {
    const sync = (): void => {
      const primary = readPrimary();
      setItems(renderCodexTranscript(primary.lines));
      setIsActive(primary.isActive);
    };
    sync();
    return streamStore.subscribe(sync);
  }, []);

  const header = items.find(
    (item): item is Extract<TranscriptItem, { kind: 'session_header' }> => item.kind === 'session_header'
  );
  const status = deriveStatus(items, isActive);
  const { messages, isRunning } = useMemo(() => toThreadMessages(items, isActive), [items, isActive]);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <SessionHeader
        model={header?.model ?? ''}
        cwd={header?.cwd ?? ''}
        status={status}
        provider={header?.provider}
        threadId={header?.threadId}
      />
      <div className="cx-transcript font-vscode-editor flex-1 min-h-0 overflow-y-auto">
        {items.length === 0 ? (
          <div className="cx-empty">No Codex session activity yet.</div>
        ) : (
          <StreamThread messages={messages} isRunning={isRunning} dataComponents={CODEX_DATA_COMPONENTS} />
        )}
      </div>
    </div>
  );
}
