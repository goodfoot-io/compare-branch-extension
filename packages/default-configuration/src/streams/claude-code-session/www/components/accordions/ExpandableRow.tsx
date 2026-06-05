/**
 * Shared expand primitive for the expanded transcript.
 *
 * Lifts the open affordance from ToolAccordion verbatim: a `▷` chevron that
 * rotates 90° on open, a `cc-accordion-body` whose `display` toggles between
 * `block` and `none`, and a `requestAnimationFrame` opacity fade-in (0.1s)
 * applied on each open. The header content (summary, glyph) is supplied by the
 * caller; this component owns only the open state and the motion so every
 * expandable row shares byte-identical behavior.
 *
 * A non-expandable (leaf) mode renders a static `·` bullet in the chevron's
 * place, emits no toggle button, and shows no body — satisfying the plan's
 * rule-6 affordance for leaf rows.
 *
 * @summary Expand primitive: rotating chevron + opacity-fade body, with a leaf mode
 * @module components/accordions/ExpandableRow
 */

import type React from 'react';
import { useCallback, useRef, useState } from 'react';

interface ExpandableRowProps {
  /** Header content (summary + glyph) shown on the toggle row. */
  header: React.ReactNode;
  /** Body content revealed when open. Ignored in leaf mode. */
  children?: React.ReactNode;
  /**
   * When `false`, render a static `·` bullet leaf row with no toggle and no
   * body (rule-6 affordance). Defaults to `true`.
   */
  expandable?: boolean;
  /** Optional className applied to the row wrapper (e.g. escalation). */
  className?: string;
  /** Optional inline style merged onto the row wrapper (e.g. escalation border/color). */
  style?: React.CSSProperties;
}

/**
 * Renders an expandable disclosure row with the shared chevron/fade affordance,
 * or a static leaf row when `expandable` is `false`.
 * @param root0 - The component props.
 * @param root0.header - Header content (summary + glyph) shown on the toggle row.
 * @param root0.children - Body content revealed when open.
 * @param root0.expandable - When `false`, render a static leaf row with no toggle.
 * @param root0.className - Optional className applied to the row wrapper.
 * @param root0.style - Optional inline style merged onto the row wrapper.
 * @returns Rendered expandable (or leaf) row element.
 */
export function ExpandableRow({
  header,
  children,
  expandable = true,
  className,
  style
}: ExpandableRowProps): React.ReactElement {
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

  if (!expandable) {
    return (
      <div className={className} style={style}>
        <div
          className="flex items-center gap-2 w-full text-left font-vscode text-[11px]"
          style={{ color: 'var(--vscode-foreground)' }}
        >
          <span className="cc-chevron shrink-0" style={{ color: 'var(--vscode-disabledForeground)' }}>
            ·
          </span>
          <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{header}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <button
        type="button"
        aria-expanded={open}
        onClick={handleToggle}
        className="flex items-center gap-2 w-full text-left bg-transparent border-none font-vscode text-[11px] cursor-pointer"
        style={{ color: 'var(--vscode-foreground)' }}
      >
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{header}</span>
        <span
          className="cc-chevron shrink-0"
          style={{ color: 'var(--vscode-disabledForeground)', transform: open ? 'rotate(90deg)' : undefined }}
        >
          ▷
        </span>
      </button>
      <div
        ref={bodyRef}
        className="cc-accordion-body"
        style={{ display: open ? 'block' : 'none', opacity: open ? 1 : 0, transition: 'opacity 0.1s ease' }}
      >
        {children}
      </div>
    </div>
  );
}
