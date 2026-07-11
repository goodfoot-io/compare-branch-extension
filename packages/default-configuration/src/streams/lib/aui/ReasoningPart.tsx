/**
 * Reasoning/thinking part renderer for `MessagePrimitive.Content`'s
 * `Reasoning` slot.
 *
 * Visually matches the existing `ReasoningAccordion` (../ReasoningAccordion.tsx)
 * — codicon chevron, muted "Thinking…" header, `textBlockQuote` aside styling,
 * shared `.cc-chevron`/`.cc-accordion-body` open/close mechanics — but the
 * open state additionally tracks the part's streaming status instead of
 * defaulting to closed: auto-expanded while `status.type === 'running'`,
 * collapsed once complete, unless the user has manually toggled it, in which
 * case their choice is respected from then on (status changes no longer
 * override it). `ReasoningAccordion` itself does not react to a changing
 * status, so this is a dedicated component rather than a reuse of it.
 *
 * While collapsed, the header also shows a muted one-line preview of the
 * text's first non-empty line (truncated ~80 chars) next to "Thinking…", so a
 * collapsed reasoning block stays scannable without a per-provider "summary"
 * contract on the part itself — a provider whose reasoning text opens with a
 * short label (e.g. Codex's `summary_text`, prepended by its converter ahead
 * of the full content) gets that label as the preview for free.
 *
 * @summary Collapsible reasoning part: auto-expand while running, then user-controlled
 * @module streams/lib/aui/ReasoningPart
 */

import type { ReasoningMessagePartComponent } from '@assistant-ui/react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { renderMarkdownNodes, stripMarkup, truncate } from '../markdown';

/**
 * Extracts a short preview of a reasoning text's first non-empty line, for
 * the collapsed header. The line is run through {@link stripMarkup} so the
 * preview reads as plain text (no literal `**bold**`/backtick/link syntax) —
 * the expanded body still renders the same text as full markdown.
 * @param text - The full reasoning/thinking text.
 * @returns The truncated, markup-stripped first non-empty line, or `''` when the text is blank.
 */
export function firstLinePreview(text: string): string {
  const line = text.split('\n').find((candidate) => candidate.trim().length > 0);
  return line === undefined ? '' : truncate(stripMarkup(line), 80);
}

/**
 * Collapsible reasoning/thinking block whose open state follows the part's
 * streaming status until the user overrides it by toggling.
 * @param root0 - The component props.
 * @param root0.text - Raw thinking/reasoning text to display when expanded.
 * @param root0.status - The part's streaming status; `running` drives the auto-expand.
 * @returns Rendered collapsible reasoning part element.
 */
export const ReasoningPart: ReasoningMessagePartComponent = ({ text, status }): React.ReactElement => {
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const isRunning = status.type === 'running';
  const open = userOpen ?? isRunning;
  const preview = open ? '' : firstLinePreview(text);

  const handleToggle = useCallback(() => {
    setUserOpen((prevUserOpen) => {
      const currentOpen = prevUserOpen ?? isRunning;
      const next = !currentOpen;
      if (next && bodyRef.current) {
        const el = bodyRef.current;
        el.style.opacity = '0';
        requestAnimationFrame(() => {
          el.style.opacity = '1';
        });
      }
      return next;
    });
  }, [isRunning]);

  return (
    <div className="aui-reasoning" data-status={status.type}>
      <button type="button" aria-expanded={open} onClick={handleToggle} className="aui-reasoning__toggle">
        <span
          className="codicon codicon-chevron-right cc-chevron aui-reasoning__chevron"
          style={{ transform: open ? 'rotate(90deg)' : undefined }}
        />
        <span className="aui-reasoning__label">Thinking…</span>
        {preview.length > 0 && <span className="aui-reasoning__preview">{preview}</span>}
      </button>
      <div
        ref={bodyRef}
        className="cc-accordion-body aui-reasoning__body"
        style={{ display: open ? 'block' : 'none', opacity: open ? 1 : 0 }}
      >
        {renderMarkdownNodes(text, 'reasoning')}
      </div>
    </div>
  );
};
