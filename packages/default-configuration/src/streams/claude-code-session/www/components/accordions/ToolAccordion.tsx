/**
 * Collapsible tool call accordion for the expanded transcript.
 *
 * Renders as a timeline row (no box, no background fill) with a tool name,
 * input preview, and chevron. Expands to reveal the full input table and
 * result section.
 *
 * @summary Tool timeline row: name + preview + chevron, expands to input/result
 * @module components/accordions/ToolAccordion
 */

import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { truncate } from '../../lib/markdown';
import { summarizeTool } from '../../lib/tool-summary';
import { ToolInputTable } from './ToolInputTable';
import { ToolResult } from './ToolResult';

interface ToolAccordionProps {
  /** Name of the tool that was called. */
  toolName: string;
  /** Tool input object (may be empty). */
  input: Record<string, unknown>;
  /** Tool result string (may be null if no result yet). */
  result: string | null;
  /** Supplemental result from isMeta injection (e.g. skill content). Replaces result when present. */
  supplementalResult?: string | null;
}

/**
 * Collapsible accordion for a tool use + result pair.
 * @param root0 - The component props.
 * @param root0.toolName - Name of the tool that was called.
 * @param root0.input - Tool input object (may be empty).
 * @param root0.result - Tool result string (may be null if no result yet).
 * @param root0.supplementalResult - Supplemental result from isMeta injection (e.g. skill content). Replaces result when present.
 * @returns Rendered collapsible tool accordion element.
 */
export function ToolAccordion({ toolName, input, result, supplementalResult }: ToolAccordionProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const displayResult = supplementalResult ?? result;

  // Build preview string from summarizeTool or first input value
  let previewStr = summarizeTool(toolName, input);
  if (!previewStr) {
    const entries = Object.entries(input);
    if (entries.length > 0) {
      const [, firstVal] = entries[0] as [string, unknown];
      const valStr = typeof firstVal === 'string' ? firstVal : JSON.stringify(firstVal);
      previewStr = truncate(valStr, 60);
    }
  }

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
    <div className="cc-tool-row overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={handleToggle}
        className="flex items-center gap-2 w-full text-left bg-transparent border-none font-vscode text-[11px] cursor-pointer"
        style={{ color: 'var(--vscode-foreground)' }}
      >
        <span
          className="shrink-0 pr-2"
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingTop: '6px',
            paddingBottom: '6px',
            color: 'var(--vscode-disabledForeground)',
            borderRight: '1px solid var(--vscode-panel-border)'
          }}
        >
          <span
            title={toolName}
            style={{
              display: 'inline-block',
              width: '8rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {toolName}
          </span>
        </span>
        <span
          className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ color: 'var(--vscode-disabledForeground)' }}
        >
          {previewStr}
        </span>
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
        <ToolInputTable toolName={toolName} input={input} />
        {displayResult !== null && displayResult !== undefined && <ToolResult result={displayResult} />}
      </div>
    </div>
  );
}
