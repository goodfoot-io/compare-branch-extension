/**
 * Codex-specific `data` part renderers registered on `StreamThread`'s
 * `dataComponents` prop — provider-specific rows the shared four
 * (`boundary`/`raw`/`status-line`/`error-line`, ../../../lib/aui/DataParts)
 * have no dedicated shape for.
 *
 * `image-note`: the visible placeholder for `input_image` content items
 * dropped from text extraction (see `render-transcript.ts`'s `outputImageCount`/
 * `imageCount` fields) — mirrors the pre-migration `ImageNote` component.
 *
 * `event-activity`: persisted high-level tool activity (mcp/web_search/image/
 * patch/plan) — mirrors the pre-migration `event_activity` case's labeled box,
 * including the plan_update markdown-detail special case.
 *
 * `turn-time`: the quiet right-aligned muted duration line the converter
 * emits for `task_complete` (../../lib/to-thread-messages.ts), replacing the
 * old "TURN COMPLETE · 32S"-style result boundary.
 *
 * `cx-session-start`: the collapsed-by-default disclosure grouping the
 * leading run of Codex-injected preamble content (permissions/AGENTS.md/
 * environment-context/plugin instructions) — mirrors the claude-code-session
 * `CcSessionStartPart`'s chevron/toggle mechanics exactly (same
 * `aui-raw-fallback__*`/`cc-chevron`/`cc-accordion-body` classes), but each
 * grouped entry renders as full markdown (via the shared `renderMarkdownNodes`)
 * rather than a per-name dispatch, since every Codex preamble entry is a plain
 * labeled text block (see ../../lib/to-thread-messages.ts's `CxSessionStartEntry`).
 *
 * @summary Codex-specific data parts: image-note, event-activity, turn-time, cx-session-start
 * @module streams/codex-session/www/components/expanded/CodexDataParts
 */

import type { DataMessagePartComponent } from '@assistant-ui/react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { looksLikeMarkdown, renderMarkdownNodes } from '../../../../lib/markdown';
import type { CxSessionStartData, CxSessionStartEntry } from '../../lib/to-thread-messages';

/** Payload for the `image-note` data part. */
interface ImageNoteData {
  /** Precomputed note text ("Image" or "N Images"). */
  text: string;
}

/**
 * Visible placeholder for images dropped from a message/tool-output's flat
 * text extraction, so an attached image is never silently lost — only its
 * pixels are (this renderer has no image viewer).
 * @param root0 - The component props.
 * @param root0.data - The image-note payload.
 * @returns Rendered muted image note line.
 */
export const ImageNoteDataPart: DataMessagePartComponent<ImageNoteData> = ({ data }): React.ReactElement => (
  <div className="cx-image-note stream-status-line">
    <span className="codicon codicon-file-media" />
    {data.text}
  </div>
);

/** Payload for the `event-activity` data part. */
interface EventActivityData {
  /** Short label identifying the activity (e.g. `mcp: github.list_prs`, `plan_update`). */
  label: string;
  /** Optional detail text; rendered as markdown for `plan_update` when it looks like markdown, plain `<pre>` otherwise. */
  detailText?: string;
}

/**
 * Renders persisted high-level Codex tool activity (mcp/web_search/image/
 * patch/plan) as a labeled box, matching the pre-migration `event_activity`
 * presentation exactly, including the plan_update markdown-detail case.
 * @param root0 - The component props.
 * @param root0.data - The event-activity payload.
 * @returns Rendered event activity box element.
 */
export const EventActivityDataPart: DataMessagePartComponent<EventActivityData> = ({ data }): React.ReactElement => (
  <div className="cx-event">
    <div className="cx-event-label">{data.label}</div>
    {data.detailText !== undefined &&
      data.detailText.length > 0 &&
      (data.label === 'plan_update' && looksLikeMarkdown(data.detailText) ? (
        <div className="aui-markdown cx-event-detail">{renderMarkdownNodes(data.detailText, 'plan-update')}</div>
      ) : (
        <pre className="cx-pre">{data.detailText}</pre>
      ))}
  </div>
);

/** Payload for the `turn-time` data part. */
interface TurnTimeData {
  /** Precomputed duration text (e.g. "1m 8s"), or "Turn complete" when no duration is known. */
  text: string;
}

/**
 * Quiet right-aligned muted duration line for a completed turn — the
 * iMessage-timestamp register, replacing the old "TURN COMPLETE · 32S"-style
 * result boundary.
 * @param root0 - The component props.
 * @param root0.data - The turn-time payload.
 * @returns Rendered muted duration line element.
 */
export const TurnTimeDataPart: DataMessagePartComponent<TurnTimeData> = ({ data }): React.ReactElement => (
  <div className="stream-turn-time">{data.text}</div>
);

/**
 * Renders one grouped entry inside a `cx-session-start` disclosure: a labeled
 * heading (e.g. "Instructions", "Developer instructions") followed by the
 * entry's full original text as markdown, plus an image-note line when the
 * source item carried images — nothing about the original block is altered.
 * @param entry - The grouped entry to render.
 * @param key - Stable React key for this entry.
 * @returns The rendered entry element.
 */
function renderCxSessionStartEntry(entry: CxSessionStartEntry, key: string): React.ReactElement {
  return (
    <div className="aui-markdown" key={key}>
      <div className="cx-event-label">{entry.label}</div>
      {renderMarkdownNodes(entry.text, key)}
      {entry.imageCount !== undefined && (
        <div className="cx-image-note stream-status-line">
          <span className="codicon codicon-file-media" />
          {entry.imageCount === 1 ? 'Image' : `${entry.imageCount} Images`}
        </div>
      )}
    </div>
  );
}

/**
 * Renders the `cx-session-start` data part: a collapsed-by-default disclosure
 * folding the leading run of Codex-injected preamble content (permissions/
 * AGENTS.md/environment-context/plugin instructions) that preceded the
 * transcript's first real content into one row (see
 * `../../lib/to-thread-messages.ts`'s session-preamble gathering). Mirrors
 * claude-code-session's `CcSessionStartPart` chevron/toggle mechanics exactly
 * (same classes, so it looks and behaves like every other collapsed
 * disclosure in the transcript), but the expanded body renders each grouped
 * entry as full markdown via {@link renderCxSessionStartEntry}, not raw JSON.
 * @param root0 - The component props.
 * @param root0.data - The session-start group payload (summary + entries).
 * @returns Rendered session-start disclosure element.
 */
export const CxSessionStartPart: DataMessagePartComponent<CxSessionStartData> = ({ data }): React.ReactElement => {
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
        {data.entries.map((entry: CxSessionStartEntry, index: number) =>
          renderCxSessionStartEntry(entry, `cx-session-start-${index}`)
        )}
      </div>
    </div>
  );
};
