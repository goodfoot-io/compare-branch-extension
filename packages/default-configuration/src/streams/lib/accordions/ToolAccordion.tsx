/**
 * Provider-neutral collapsible tool call accordion for expanded transcripts.
 *
 * Renders as a timeline row (no box, no background fill) with a tool name,
 * a precomputed preview/summary, and a chevron. Expands to reveal the full
 * input table and result section. Carries no provider-specific concepts
 * (hooks, attachments, tool-name-based summarization) — callers precompute
 * `summary`, `severity`, and `errorLabel` and pass them in as plain props.
 *
 * @summary Tool timeline row: name + preview + chevron, expands to input/result
 * @module streams/lib/accordions/ToolAccordion
 */

import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import { ToolInputTable } from './ToolInputTable';
import { ToolResult } from './ToolResult';

/** Escalation state for a tool accordion's collapsed-header styling. */
export type ToolSeverity = 'normal' | 'error';

interface ToolAccordionProps {
  /** Name of the tool that was called. */
  toolName: string;
  /** Precomputed preview string shown in the collapsed header (when not escalated). */
  summary: string;
  /** Tool input object (may be empty). */
  input: Record<string, unknown>;
  /** Input keys to skip in the input table. */
  inputSkipKeys?: Set<string>;
  /** When true, the input table is omitted entirely. */
  hideInput?: boolean;
  /** Tool result string (may be null if no result yet). */
  result: string | null;
  /**
   * Long free-text tool arguments rendered as a labeled `<pre>` block before the
   * result (e.g. Codex's joined shell command or raw `apply_patch` text) — a poor
   * fit for the key/value `ToolInputTable`. Claude never passes this; when absent
   * the accordion body is unchanged.
   */
  rawArgs?: { label: string; text: string };
  /** Collapsed-header escalation: 'error' tints the row and shows `errorLabel`. */
  severity?: ToolSeverity;
  /** Preview text shown in red when `severity` is 'error' (e.g. "✗ blocked by pre-commit"). */
  errorLabel?: string;
  /** Whether the accordion starts open. Defaults to false. */
  defaultOpen?: boolean;
  /** Extra content rendered after the result section (e.g. a provider's hooks section). */
  footer?: React.ReactNode;
}

/**
 * Collapsible accordion for a tool use + result pair.
 * @param root0 - The component props.
 * @param root0.toolName - Name of the tool that was called.
 * @param root0.summary - Precomputed preview string shown in the collapsed header.
 * @param root0.input - Tool input object (may be empty).
 * @param root0.inputSkipKeys - Input keys to skip in the input table.
 * @param root0.hideInput - When true, the input table is omitted entirely.
 * @param root0.result - Tool result string (may be null if no result yet).
 * @param root0.rawArgs - Long free-text tool arguments rendered as a labeled `<pre>` block before the result.
 * @param root0.severity - Collapsed-header escalation state.
 * @param root0.errorLabel - Preview text shown in red when `severity` is 'error'.
 * @param root0.defaultOpen - Whether the accordion starts open.
 * @param root0.footer - Extra content rendered after the result section.
 * @returns Rendered collapsible tool accordion element.
 */
export function ToolAccordion({
  toolName,
  summary,
  input,
  inputSkipKeys,
  hideInput = false,
  result,
  rawArgs,
  severity = 'normal',
  errorLabel,
  defaultOpen = false,
  footer
}: ToolAccordionProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef<HTMLDivElement>(null);
  const escalated = severity === 'error';

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
      className="cc-tool-row overflow-hidden"
      style={escalated ? { borderLeft: '2px solid var(--stream-severity-error-fg)' } : undefined}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={handleToggle}
        className="flex items-center gap-2 w-full text-left bg-transparent border-none font-vscode cursor-pointer"
        style={{ color: 'var(--stream-fg)', fontSize: 'var(--stream-text-label)' }}
      >
        <span
          className="shrink-0 pr-2"
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingTop: '6px',
            paddingBottom: '6px',
            color: 'var(--stream-fg-muted)',
            borderRight: '1px solid var(--stream-border-subtle)'
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
          style={{ color: escalated ? 'var(--stream-severity-error-fg)' : 'var(--stream-fg-muted)' }}
        >
          {escalated ? (errorLabel ?? '') : summary}
        </span>
        {escalated ? (
          <span
            className="codicon codicon-error shrink-0"
            style={{ color: 'var(--stream-severity-error-fg)', fontSize: 'var(--stream-text-label)' }}
          />
        ) : (
          result !== null && (
            <span
              className="codicon codicon-check shrink-0"
              style={{ color: 'var(--stream-severity-success-fg)', fontSize: 'var(--stream-text-label)' }}
            />
          )
        )}
        <span
          className="codicon codicon-chevron-right cc-chevron shrink-0"
          style={{
            color: 'var(--stream-fg-muted)',
            fontSize: 'var(--stream-text-label)',
            transform: open ? 'rotate(90deg)' : undefined
          }}
        />
      </button>
      <div
        ref={bodyRef}
        className="cc-accordion-body"
        style={{ display: open ? 'block' : 'none', opacity: open ? 1 : 0, transition: 'opacity 0.1s ease' }}
      >
        <ToolInputTable input={input} hidden={hideInput} skipKeys={inputSkipKeys} />
        {rawArgs !== undefined && (
          <div className="cc-raw-args">
            <div className="stream-block-label font-vscode-editor">{rawArgs.label}</div>
            <pre
              className="cc-raw-args-pre m-0 whitespace-pre-wrap break-words font-vscode-editor text-vscode-foreground"
              style={{ fontSize: 'var(--stream-text-code)' }}
            >
              {rawArgs.text}
            </pre>
          </div>
        )}
        {result !== null && <ToolResult result={result} />}
        {footer}
      </div>
    </div>
  );
}
