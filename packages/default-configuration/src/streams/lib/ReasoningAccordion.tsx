/**
 * Shared collapsible reasoning/thinking block accordion for expanded transcripts.
 *
 * Shows a "Thinking…" toggle button with a codicon chevron that rotates on
 * open, and a lazy-fade body reveal on expand. Collapsed by default —
 * matching the VS Code Chat panel idiom of collapsed-by-default disclosures
 * for secondary, skimmable-when-wanted content.
 *
 * @summary Collapsible reasoning/thinking block with chevron toggle
 * @module streams/lib/ReasoningAccordion
 */

import type React from 'react';
import { useCallback, useRef, useState } from 'react';

interface ReasoningAccordionProps {
  /** Raw thinking/reasoning text to display when expanded. */
  thinking: string;
}

/**
 * Collapsible accordion for assistant thinking/reasoning blocks.
 * @param root0 - The component props.
 * @param root0.thinking - Raw thinking/reasoning text to display when expanded.
 * @returns Rendered collapsible reasoning accordion element.
 */
export function ReasoningAccordion({ thinking }: ReasoningAccordionProps): React.ReactElement {
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
    <div
      className="my-1 rounded-r"
      style={{
        background: 'var(--stream-aside-bg)',
        borderLeft: '3px solid var(--stream-aside-border)'
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={handleToggle}
        className="inline-flex items-center gap-1 px-2 py-1 w-full text-left bg-transparent border-none text-vscode-descriptionForeground font-vscode text-[0.85em] italic cursor-pointer opacity-80 hover:opacity-100 hover:text-vscode-foreground"
      >
        <span
          className="codicon codicon-chevron-right cc-chevron not-italic"
          style={{ fontSize: '0.75em', transform: open ? 'rotate(90deg)' : undefined }}
        />
        <span>Thinking…</span>
      </button>
      <div
        ref={bodyRef}
        className="cc-accordion-body px-2 pb-2 text-[0.85em] text-vscode-descriptionForeground whitespace-pre-wrap break-words font-normal"
        style={{ display: open ? 'block' : 'none', opacity: open ? 1 : 0, transition: 'opacity 0.1s ease' }}
      >
        {thinking}
      </div>
    </div>
  );
}
