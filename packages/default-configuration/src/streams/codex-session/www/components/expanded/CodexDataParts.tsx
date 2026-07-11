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
 * @summary Codex-specific data parts: image-note, event-activity, turn-time
 * @module streams/codex-session/www/components/expanded/CodexDataParts
 */

import type { DataMessagePartComponent } from '@assistant-ui/react';
import type React from 'react';
import { looksLikeMarkdown, renderMarkdownNodes } from '../../../../lib/markdown';

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
        <div className="cx-message-text cx-event-detail">{renderMarkdownNodes(data.detailText, 'plan-update')}</div>
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
