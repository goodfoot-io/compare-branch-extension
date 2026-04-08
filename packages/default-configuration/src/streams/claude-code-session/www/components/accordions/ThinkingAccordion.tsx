/**
 * Collapsible thinking block accordion for the expanded transcript.
 *
 * Shows "Thinking…" toggle button with chevron rotation and a lazy-fade
 * body reveal on expand. Collapsed by default.
 *
 * @summary Collapsible thinking block with chevron toggle
 * @module components/accordions/ThinkingAccordion
 */

import type React from 'react';
import { useCallback, useRef, useState } from 'react';

interface ThinkingAccordionProps {
  /** Raw thinking text to display when expanded. */
  thinking: string;
}

/**
 * Collapsible accordion for assistant thinking blocks.
 * @param root0 - The component props.
 * @param root0.thinking - Raw thinking text to display when expanded.
 * @returns Rendered collapsible thinking accordion element.
 */
export function ThinkingAccordion({ thinking }: ThinkingAccordionProps): React.ReactElement {
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
        background: 'var(--vscode-textBlockQuote-background, rgba(127,127,127,0.1))',
        borderLeft: '3px solid var(--vscode-textBlockQuote-border, rgba(0,122,204,0.5))'
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={handleToggle}
        className="inline-flex items-center gap-1 px-2 py-1 w-full text-left bg-transparent border-none text-vscode-descriptionForeground font-vscode text-[0.85em] italic cursor-pointer opacity-80 hover:opacity-100 hover:text-vscode-foreground"
      >
        <span className="cc-chevron text-[0.75em] not-italic" style={{ transform: open ? 'rotate(90deg)' : undefined }}>
          ▶
        </span>
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
