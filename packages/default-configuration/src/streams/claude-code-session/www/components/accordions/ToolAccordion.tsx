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
import { summarizeTool, WRITE_TOOLS } from '../../lib/tool-summary';
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

  const isWriteTool = WRITE_TOOLS.has(toolName);

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
        className="flex items-center gap-1.5 px-2 py-1.5 w-full text-left bg-transparent border-none text-vscode-foreground font-vscode text-[0.85em] cursor-pointer hover:bg-[var(--vscode-list-hoverBackground,rgba(90,93,94,0.31))]"
      >
        <span
          className="font-vscode-editor text-[12px] font-semibold shrink-0"
          style={
            isWriteTool
              ? { color: 'var(--vscode-terminal-ansiYellow, #ddb700)' }
              : { color: 'var(--vscode-foreground, #cccccc)' }
          }
        >
          {toolName}
        </span>
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-vscode-editor text-[11px] opacity-55">
          {previewStr}
        </span>
        <span
          className="cc-chevron text-[0.85em] shrink-0 opacity-65"
          style={{ transform: open ? 'rotate(90deg)' : undefined }}
        >
          ▶
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
