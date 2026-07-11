/**
 * Claude-specific `data` part renderers registered under `StreamThread`'s
 * `dataComponents`, alongside the four shared parts
 * (../../../../lib/aui/DataParts.tsx).
 *
 * Each part is a thin adapter reusing an existing renderer-local component
 * unchanged: `HookRow` for an orphan hook, `AttachmentRouter` (plus
 * `AmbientGroup`/`AmbientRow`) for attachments, `AwaySummaryBoundary` for the
 * away-summary system event, `SupplementalContentRow` for orphaned isMeta
 * injection content, and `CcSessionStartPart` (a `RawFallback`-style
 * collapsed disclosure, but rendering its grouped rows through the same
 * per-name dispatch as this file, not raw JSON) for the grouped session
 * preamble. `to-thread-messages.ts` is the only producer of these part names
 * (`cc-hook`, `cc-attachment`, `cc-ambient-group`, `cc-away-summary`,
 * `cc-supplemental`, `cc-session-start`).
 *
 * @summary Claude-specific data parts: hook, attachment, ambient group, away summary, supplemental, session start
 * @module components/aui/CcDataParts
 */

import type { DataMessagePartComponent } from '@assistant-ui/react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { RawFallback } from '../../../../lib/RawFallback';
import { StatusLine } from '../../../../lib/status-line';
import type {
  CcAmbientGroupData,
  CcAttachmentData,
  CcAwaySummaryData,
  CcHookData,
  CcSessionStartData,
  CcSessionStartEntry,
  CcSupplementalData
} from '../../lib/to-thread-messages';
import { HookRow } from '../accordions/HookRow';
import { AmbientGroup, AmbientRow } from '../expanded/messages/AmbientGroup';
import { AttachmentRouter } from '../expanded/messages/attachment/AttachmentRouter';
import { SupplementalContentRow } from '../expanded/messages/SupplementalContentRow';
import { AwaySummaryBoundary } from '../expanded/messages/system/AwaySummaryBoundary';

/**
 * Renders the `cc-hook` data part: a standalone orphan hook row.
 * @param root0 - The component props.
 * @param root0.data - The orphan hook payload.
 * @returns Rendered hook row element.
 */
export const CcHookPart: DataMessagePartComponent<CcHookData> = ({ data }) => <HookRow hook={data.hook} />;

/**
 * Renders the `cc-attachment` data part: a single non-ambient attachment,
 * dispatched through the shared classifier-driven `AttachmentRouter`.
 * @param root0 - The component props.
 * @param root0.data - The attachment payload.
 * @returns Rendered attachment element, or null when the classifier hides it.
 */
export const CcAttachmentPart: DataMessagePartComponent<CcAttachmentData> = ({ data }) => (
  <AttachmentRouter attachment={data.attachment} />
);

/**
 * Renders the `cc-ambient-group` data part: a run of consecutive ambient-tier
 * attachments folded into one zone (or a single summary line when large),
 * mirroring the retired `MessageRouter`'s `AmbientGroup` collapse.
 * @param root0 - The component props.
 * @param root0.data - The consecutive ambient attachments.
 * @returns Rendered ambient group element.
 */
export const CcAmbientGroupPart: DataMessagePartComponent<CcAmbientGroupData> = ({ data }): React.ReactElement => (
  <AmbientGroup
    rows={data.attachments.map((attachment: CcAmbientGroupData['attachments'][number]) => (
      <AmbientRow key={JSON.stringify(attachment)}>
        <AttachmentRouter attachment={attachment} />
      </AmbientRow>
    ))}
  />
);

/**
 * Renders the `cc-away-summary` data part via the shared `AwaySummaryBoundary`.
 * @param root0 - The component props.
 * @param root0.data - The away-summary payload.
 * @returns Rendered away-summary boundary element.
 */
export const CcAwaySummaryPart: DataMessagePartComponent<CcAwaySummaryData> = ({ data }) => (
  <AwaySummaryBoundary content={data.content} />
);

/**
 * Renders the `cc-supplemental` data part via the shared `SupplementalContentRow`.
 * @param root0 - The component props.
 * @param root0.data - The supplemental-content payload.
 * @returns Rendered supplemental-content disclosure row.
 */
export const CcSupplementalPart: DataMessagePartComponent<CcSupplementalData> = ({ data }) => (
  <SupplementalContentRow text={data.text} />
);

/**
 * Renders one grouped row inside a `cc-session-start` disclosure, dispatching
 * on the original data part's `name` — the same per-name mapping this file
 * uses for top-level parts, since a buffered entry is exactly a stripped-down
 * `{ name, data }` data part (see `to-thread-messages.ts`'s
 * `flushSessionStartBuffer`). Falls back to `RawFallback` for a name this
 * dispatch doesn't recognize, so nothing inside the group is ever silently
 * dropped.
 * @param entry - The grouped entry to render.
 * @param key - Stable React key for this row.
 * @returns The rendered row element.
 */
function renderSessionStartEntry(entry: CcSessionStartEntry, key: string): React.ReactElement {
  switch (entry.name) {
    case 'status-line':
      return <StatusLine key={key} text={(entry.data as { text: string }).text} />;
    case 'error-line': {
      const errorData = entry.data as { message: string; detail?: unknown };
      return (
        <div className="aui-error-line" key={key}>
          <span className="codicon codicon-error aui-error-line__icon" aria-hidden="true" />
          <span>{errorData.message}</span>
        </div>
      );
    }
    case 'cc-hook':
      return <HookRow key={key} hook={(entry.data as CcHookData).hook} />;
    case 'cc-attachment':
      return <AttachmentRouter key={key} attachment={(entry.data as CcAttachmentData).attachment} />;
    case 'cc-ambient-group':
      return (
        <AmbientGroup
          key={key}
          rows={(entry.data as CcAmbientGroupData).attachments.map((attachment) => (
            <AmbientRow key={JSON.stringify(attachment)}>
              <AttachmentRouter attachment={attachment} />
            </AmbientRow>
          ))}
        />
      );
    case 'raw': {
      const rawData = entry.data as { data: unknown; label?: string; severity?: 'info' | 'warning' | 'error' };
      return <RawFallback key={key} data={rawData.data} label={rawData.label} severity={rawData.severity} />;
    }
    default:
      return (
        <RawFallback key={key} data={entry.data} label={`Unrecognized data part: ${entry.name}`} severity="warning" />
      );
  }
}

/**
 * Renders the `cc-session-start` data part: a collapsed-by-default disclosure
 * folding every service/structural row that preceded the transcript's first
 * real content into one row (see `to-thread-messages.ts`'s session-preamble
 * gathering). Mirrors `RawFallback`'s chevron/toggle mechanics exactly (same
 * classes, so it looks and behaves like every other collapsed disclosure in
 * the transcript) but the expanded body renders each original row through its
 * own presenter via {@link renderSessionStartEntry}, not raw JSON.
 * @param root0 - The component props.
 * @param root0.data - The session-start group payload (summary + entries).
 * @returns Rendered session-start disclosure element.
 */
export const CcSessionStartPart: DataMessagePartComponent<CcSessionStartData> = ({ data }): React.ReactElement => {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next && bodyRef.current) {
        const el = bodyRef.current;
        el.style.opacity = '0';
        requestAnimationFrame(() => {
          el.style.opacity = '1';
        });
      }
      return next;
    });
  }, []);

  return (
    <div className="aui-raw-fallback">
      <button
        type="button"
        aria-expanded={open}
        onClick={handleToggle}
        className="aui-raw-fallback__toggle"
        style={{ color: 'var(--stream-fg-muted)' }}
      >
        <span
          className="codicon codicon-chevron-right cc-chevron aui-raw-fallback__chevron"
          style={{ transform: open ? 'rotate(90deg)' : undefined }}
        />
        <span className="codicon codicon-info aui-raw-fallback__icon" />
        <span className="aui-raw-fallback__label">{data.summary}</span>
      </button>
      <div
        ref={bodyRef}
        className="cc-accordion-body aui-raw-fallback__body"
        style={{ display: open ? 'block' : 'none', opacity: open ? 1 : 0 }}
      >
        {data.entries.map((entry: CcSessionStartEntry, index: number) =>
          renderSessionStartEntry(entry, `cc-session-start-${index}`)
        )}
      </div>
    </div>
  );
};
