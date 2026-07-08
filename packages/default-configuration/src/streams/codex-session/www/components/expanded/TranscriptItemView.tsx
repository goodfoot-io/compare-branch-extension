/**
 * Pure, store-free rendering for the codex-session expanded transcript.
 *
 * Split out of `CodexExpandedView` so this module carries no
 * `@cards.management/sdk/stream-store` import — that module reads
 * `window.__STREAM_INIT__` at import time and throws outside a browser/host
 * context, which would make every function here untestable via
 * `react-dom/server` (this package has no jsdom). `CodexExpandedView` composes
 * these with the store subscription; everything in this file is plain
 * `TranscriptItem[]` in, React nodes out.
 *
 * @summary Store-free transcript item rendering and grouping for codex-session
 * @module streams/codex-session/www/components/expanded/TranscriptItemView
 */

import type React from 'react';
import { ToolAccordion, ToolGroup } from '../../../../lib/accordions';
import { Boundary } from '../../../../lib/Boundary';
import { formatDuration } from '../../../../lib/compact-facts';
import { looksLikeMarkdown, renderMarkdownNodes, truncate } from '../../../../lib/markdown';
import { RawFallback } from '../../../../lib/RawFallback';
import { ReasoningAccordion } from '../../../../lib/ReasoningAccordion';
import type { SessionStatus } from '../../../../lib/SessionHeader';
import { groupToolCalls } from '../../lib/group-tool-calls';
import type { TranscriptItem } from '../../lib/render-transcript';
import { summarizeCodexTool } from '../../lib/tool-summary';

/**
 * Derives the sticky `SessionHeader`'s live status from stream liveness and
 * whether the rendered transcript contains any error signal (a session-level
 * `error` event or a `tool_call` escalated by a shell/patch failure). While
 * the stream is still active the status always reads `running` — an interim
 * failure the session might still recover from should not flash the header
 * red before the stream has actually ended.
 * @param items - The rendered transcript items.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The session status for the header's indicator dot.
 */
export function deriveStatus(items: TranscriptItem[], isActive: boolean): SessionStatus {
  if (isActive) {
    return 'running';
  }
  const hasError = items.some(
    (item) => item.kind === 'error' || (item.kind === 'tool_call' && item.severity === 'error')
  );
  return hasError ? 'error' : 'success';
}

/**
 * Renders the flat transcript items, coalescing consecutive `tool_call` runs
 * into a single shared {@link ToolGroup} (see {@link groupToolCalls}). A
 * running counter reproduces each item's original array index for
 * {@link itemKey} — `groupToolCalls` neither drops nor reorders items, so the
 * counter advances in lockstep with the source array as groups are unpacked.
 * @param items - The flat transcript items from `renderCodexTranscript`.
 * @returns The rendered transcript nodes, tool_call runs wrapped in ToolGroup.
 */
export function renderTranscriptGroups(items: TranscriptItem[]): React.ReactElement[] {
  const nodes: React.ReactElement[] = [];
  let index = 0;
  let toolGroupKey = 0;

  for (const group of groupToolCalls(items)) {
    if (group.kind === 'tool_run') {
      const children = group.items.map((item) => {
        const el = <TranscriptItemView key={itemKey(item, index)} item={item} />;
        index += 1;
        return el;
      });
      nodes.push(<ToolGroup key={`tool-group-${toolGroupKey++}`}>{children}</ToolGroup>);
    } else {
      nodes.push(<TranscriptItemView key={itemKey(group.item, index)} item={group.item} />);
      index += 1;
    }
  }

  return nodes;
}

/**
 * Derives a stable-enough React key for a transcript item from its kind and a
 * discriminating field, suffixed with its index so duplicates stay distinct.
 * @param item - The transcript item.
 * @param index - The item's position in the list.
 * @returns A string key.
 */
function itemKey(item: TranscriptItem, index: number): string {
  switch (item.kind) {
    case 'tool_call':
    case 'orphan_output':
      return `${index}:${item.kind}:${item.callId}`;
    case 'session_header':
      return `${index}:session_header`;
    default:
      return `${index}:${item.kind}`;
  }
}

/**
 * Renders a single {@link TranscriptItem} per its discriminated kind.
 * @param root0 - The component props.
 * @param root0.item - The transcript item to render.
 * @returns The rendered item, or null for a kind with nothing to show.
 */
export function TranscriptItemView({ item }: { item: TranscriptItem }): React.ReactElement | null {
  switch (item.kind) {
    case 'session_header':
      // Rendered once, above the scrolling transcript, as the sticky shared
      // SessionHeader (see CodexExpandedView) — not inline in item order.
      return null;

    case 'user_message':
      return (
        <div className="stream-turn stream-turn--user">
          <div className="stream-role-label">User</div>
          <div className="cx-message-text">{renderMarkdownNodes(item.text, 'user')}</div>
          {item.imageCount !== undefined && <ImageNote count={item.imageCount} />}
        </div>
      );

    case 'assistant_message':
      return (
        <div className="stream-turn stream-turn--assistant">
          <div className="stream-role-label">Assistant</div>
          <div className="cx-message-text">{renderMarkdownNodes(item.text, 'assistant')}</div>
          {item.imageCount !== undefined && <ImageNote count={item.imageCount} />}
        </div>
      );

    case 'reasoning': {
      // contentText (the detailed chain-of-thought) is the accordion body when
      // present, with summaryText as its truncated header label. When Codex
      // sends only a summary (the common case — content is rare additive
      // detail), a full collapsible accordion for one short line is not worth
      // the toggle chrome: it renders as a non-collapsible muted line instead,
      // matching the other single-line status markers (task_started, the
      // task_complete recap).
      const hasContent = item.contentText !== undefined && item.contentText.length > 0;
      if (hasContent) {
        const summary = item.summaryText.length > 0 ? item.summaryText : undefined;
        return <ReasoningAccordion thinking={item.contentText as string} summary={summary} />;
      }
      if (item.summaryText.length === 0) {
        return null;
      }
      return (
        <div className="cx-reasoning-summary stream-status-line">
          {renderMarkdownNodes(item.summaryText, 'reasoning-summary')}
        </div>
      );
    }

    case 'tool_call':
      return (
        <ToolAccordion
          toolName={item.name}
          summary={summarizeCodexTool(item.name, item.argumentsText)}
          input={{}}
          result={item.hasOutput && item.outputText !== undefined ? item.outputText : null}
          severity={item.severity}
          errorLabel={item.errorLabel}
          rawArgs={
            item.argumentsText.length > 0
              ? {
                  label: (item.argsLabel ?? 'arguments') + (item.prettyPrinted ? '' : ' (raw)'),
                  text: item.argumentsText
                }
              : undefined
          }
          footer={item.outputImageCount !== undefined ? <ImageNote count={item.outputImageCount} /> : undefined}
        />
      );

    case 'orphan_output':
      return (
        <div className="cx-orphan">
          <div className="cx-tool-output-label">output (call {item.callId})</div>
          {looksLikeMarkdown(item.outputText) ? (
            <div className="cx-message-text cx-orphan-text">
              {renderMarkdownNodes(item.outputText, `orphan-${item.callId}`)}
            </div>
          ) : (
            <pre className="cx-pre">{item.outputText}</pre>
          )}
          {item.imageCount !== undefined && <ImageNote count={item.imageCount} />}
        </div>
      );

    case 'turn_boundary':
      return <Boundary kind="turn" label={item.turnId !== undefined ? `Turn ${item.turnId}` : 'Turn'} />;

    case 'compaction':
      return (
        <>
          <Boundary kind="compaction" label="Context compacted" />
          {item.message.length > 0 && (
            <div className="cx-message-text cx-compaction-detail">
              {renderMarkdownNodes(item.message, 'compaction')}
            </div>
          )}
        </>
      );

    case 'error':
      return (
        <div className="cx-error-block">
          <div className="cx-error-label">
            <span className="codicon codicon-error" />
            Error
          </div>
          <div className="cx-message-text">{renderMarkdownNodes(item.message, 'error')}</div>
        </div>
      );

    case 'task_started':
      return <div className="cx-status-line stream-status-line">Task started</div>;

    case 'task_complete': {
      const label =
        item.durationMs !== undefined ? `Turn complete · ${formatDuration(item.durationMs)}` : 'Turn complete';
      return (
        <>
          <Boundary kind="result" label={label} />
          {item.lastAgentMessage !== undefined && item.lastAgentMessage.length > 0 && (
            <div className="cx-status-line stream-status-line">{truncate(item.lastAgentMessage, 140)}</div>
          )}
        </>
      );
    }

    case 'event_activity':
      return (
        <div className="cx-event">
          <div className="cx-event-label">{item.label}</div>
          {item.detailText !== undefined &&
            item.detailText.length > 0 &&
            (item.label === 'plan_update' && looksLikeMarkdown(item.detailText) ? (
              <div className="cx-message-text cx-event-detail">
                {renderMarkdownNodes(item.detailText, 'plan-update')}
              </div>
            ) : (
              <pre className="cx-pre">{item.detailText}</pre>
            ))}
        </div>
      );

    case 'unknown_item':
      return <RawFallback data={item.raw} label="Unrecognized item" severity="info" />;

    case 'malformed':
      return <RawFallback data={item.rawLine} label="Malformed line" severity="warning" />;

    default:
      return null;
  }
}

/**
 * Visible placeholder for `input_image` content items that
 * `extractMessageText`/`extractOutputText` drop from their flat text
 * extraction, so an image attached to a message or tool output is never
 * silently lost — only its pixels are (this renderer has no image viewer).
 * @param root0 - The component props.
 * @param root0.count - The number of images to note (always ≥ 1; callers omit this component entirely at 0).
 * @returns Rendered muted image note line.
 */
function ImageNote({ count }: { count: number }): React.ReactElement {
  return (
    <div className="cx-image-note stream-status-line">
      <span className="codicon codicon-file-media" />
      {count === 1 ? 'Image' : `${count} Images`}
    </div>
  );
}
