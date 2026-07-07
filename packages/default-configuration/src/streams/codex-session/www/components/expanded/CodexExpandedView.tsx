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
 * @summary Expanded Codex session view: header + ordered transcript items
 * @module streams/codex-session/www/components/expanded/CodexExpandedView
 */

import { streamStore } from '@cards.management/sdk/stream-store';
import type React from 'react';
import { useEffect, useState } from 'react';
import { renderMarkdownNodes } from '../../lib/markdown';
import type { TranscriptItem } from '../../lib/render-transcript';
import { renderCodexTranscript } from '../../lib/render-transcript';

/**
 * Reads the primary stream file's lines from the store.
 * @returns The primary file's lines.
 */
function readPrimaryLines(): string[] {
  const s = streamStore.getState();
  const file = s.files.get(s.primary);
  return file ? file.lines : [];
}

/**
 * Renders the ordered transcript items for a Codex session.
 * @returns Rendered expanded transcript view element.
 */
export function CodexExpandedView(): React.ReactElement {
  const [items, setItems] = useState<TranscriptItem[]>(() => renderCodexTranscript(readPrimaryLines()));

  // Bootstrap-then-subscribe. Rebuilding from the full line array on every
  // update keeps append and reset both correct: appends re-derive prior items
  // identically (so they are preserved) and a reset's shorter array yields a
  // strictly smaller list (so stale items are discarded).
  useEffect(() => {
    const sync = (): void => {
      setItems(renderCodexTranscript(readPrimaryLines()));
    };
    sync();
    return streamStore.subscribe(sync);
  }, []);

  if (items.length === 0) {
    return <div className="cx-empty">No Codex session activity yet.</div>;
  }

  return (
    <div className="cx-transcript font-vscode-editor">
      {items.map((item, i) => (
        <TranscriptItemView key={itemKey(item, i)} item={item} />
      ))}
    </div>
  );
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
function TranscriptItemView({ item }: { item: TranscriptItem }): React.ReactElement | null {
  switch (item.kind) {
    case 'session_header':
      return (
        <div className="cx-header">
          {item.model !== undefined && (
            <span>
              <span className="cx-header-key">model</span> {item.model}
            </span>
          )}
          {item.provider !== undefined && (
            <span>
              <span className="cx-header-key">provider</span> {item.provider}
            </span>
          )}
          {item.threadId !== undefined && (
            <span>
              <span className="cx-header-key">thread</span> {item.threadId}
            </span>
          )}
          {item.cwd !== undefined && (
            <span>
              <span className="cx-header-key">cwd</span> {item.cwd}
            </span>
          )}
          {item.timestamp !== undefined && (
            <span>
              <span className="cx-header-key">started</span> {item.timestamp}
            </span>
          )}
        </div>
      );

    case 'user_message':
      return (
        <div className="cx-item cx-user">
          <div className="cx-role-label">User</div>
          <div className="cx-message-text">{renderMarkdownNodes(item.text, 'user')}</div>
        </div>
      );

    case 'assistant_message':
      return (
        <div className="cx-item cx-assistant">
          <div className="cx-role-label">Assistant</div>
          <div className="cx-message-text">{renderMarkdownNodes(item.text, 'assistant')}</div>
        </div>
      );

    case 'reasoning':
      return (
        <div className="cx-item cx-reasoning">
          <div className="cx-role-label">Reasoning</div>
          {item.summaryText.length > 0 && (
            <div className="cx-message-text">{renderMarkdownNodes(item.summaryText, 'reasoning-summary')}</div>
          )}
          {item.contentText !== undefined && item.contentText.length > 0 && (
            <div className="cx-message-text cx-reasoning-content">
              {renderMarkdownNodes(item.contentText, 'reasoning-content')}
            </div>
          )}
        </div>
      );

    case 'tool_call':
      return (
        <div className="cx-tool">
          <div className="cx-tool-head">
            <span className="cx-tool-badge">{item.name}</span>
            <span className="cx-tool-callid">{item.callId}</span>
          </div>
          {item.argumentsText.length > 0 && (
            <div className="cx-tool-args">
              <div className="cx-section-label">
                {item.argsLabel ?? 'arguments'}
                {item.prettyPrinted ? '' : ' (raw)'}
              </div>
              <pre className="cx-pre">{item.argumentsText}</pre>
            </div>
          )}
          {item.hasOutput && item.outputText !== undefined && (
            <div className="cx-tool-output">
              <div className="cx-tool-output-label">output</div>
              <pre className="cx-pre">{item.outputText}</pre>
            </div>
          )}
        </div>
      );

    case 'orphan_output':
      return (
        <div className="cx-orphan">
          <div className="cx-tool-output-label">output (call {item.callId})</div>
          <pre className="cx-pre">{item.outputText}</pre>
        </div>
      );

    case 'turn_boundary':
      return (
        <div className="cx-turn-boundary">
          <span className="cx-turn-boundary-label">turn{item.turnId !== undefined ? ` ${item.turnId}` : ''}</span>
        </div>
      );

    case 'compaction':
      return (
        <div className="cx-compaction">
          <div className="cx-compaction-label">context compacted</div>
          {item.message.length > 0 && (
            <div className="cx-message-text">{renderMarkdownNodes(item.message, 'compaction')}</div>
          )}
        </div>
      );

    case 'event_activity':
      return (
        <div className="cx-event">
          <div className="cx-event-label">{item.label}</div>
          {item.detailText !== undefined && item.detailText.length > 0 && (
            <pre className="cx-pre">{item.detailText}</pre>
          )}
        </div>
      );

    case 'unknown_item':
      return (
        <div className="cx-raw">
          <div className="cx-raw-label">unknown item</div>
          <pre className="cx-pre">{item.rawJson}</pre>
        </div>
      );

    case 'malformed':
      return (
        <div className="cx-raw">
          <div className="cx-raw-label">malformed line</div>
          <pre className="cx-pre">{item.rawLine}</pre>
        </div>
      );

    default:
      return null;
  }
}
