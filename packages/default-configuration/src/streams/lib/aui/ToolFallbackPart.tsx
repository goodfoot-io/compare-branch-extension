/**
 * Default tool-call part renderer for `MessagePrimitive.Content`'s
 * `tools.Fallback` slot — used whenever a converter emits a `tool-call` part
 * whose `toolName` has no caller-supplied entry in `tools.by_name`.
 *
 * Thin adapter over the existing `ToolAccordion` (../accordions/ToolAccordion.tsx):
 * a timeline row with the tool name, a one-line preview, and a chevron that
 * expands to the full `ToolInputTable`/`JsonBlock` input and the result.
 * `isError` escalates the row to the error severity treatment.
 *
 * The preview is pluggable: {@link createToolFallbackComponent} builds a
 * fallback component from a caller-supplied `(toolName, args) => string`
 * summarizer, and {@link ToolFallbackPart} is just that factory applied to
 * the generic JSON-preview default ({@link summarizeArgs}) — a provider whose
 * tool names carry a richer domain summary (e.g. Codex's shell/apply_patch/
 * mcp previews) can pass its own summarizer instead of duplicating the
 * `ToolAccordion` wiring (see `StreamThread`'s `toolFallback` prop).
 *
 * @summary Default tool-call renderer: accordion row over the shared ToolAccordion
 * @module streams/lib/aui/ToolFallbackPart
 */

import type { ToolCallMessagePartComponent } from '@assistant-ui/react';
import type React from 'react';
import { ToolAccordion } from '../accordions/ToolAccordion';
import { truncate } from '../markdown';

/**
 * Renders a one-line JSON preview of tool arguments for the accordion's
 * collapsed-header summary. Falls back to an empty string for empty/absent
 * args (nothing useful to preview) or non-serializable input.
 * @param args - Tool call arguments.
 * @returns Truncated one-line JSON preview, or empty string.
 */
function summarizeArgs(args: unknown): string {
  if (args === null || args === undefined) return '';
  if (typeof args === 'object' && Object.keys(args as Record<string, unknown>).length === 0) return '';
  try {
    return truncate(JSON.stringify(args) ?? '', 120);
  } catch {
    // Non-serializable args (e.g. a circular reference) are unexpected but
    // not fatal to the transcript — an empty preview is preferable to
    // crashing the render.
    return '';
  }
}

/**
 * Converts an arbitrary tool result value to the string `ToolAccordion`
 * expects, pretty-printing structured results as JSON.
 * @param result - Tool result value (may be undefined if no result yet).
 * @returns String representation of the result, or null when absent.
 */
export function resultToText(result: unknown): string | null {
  if (result === undefined) return null;
  if (typeof result === 'string') return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

/**
 * Builds a `tools.Fallback` component that renders the shared `ToolAccordion`
 * with a caller-supplied collapsed-header preview, instead of the generic
 * JSON-preview {@link summarizeArgs} default.
 * @param summarize - Computes the one-line collapsed-header preview from the tool name and its (possibly empty) args object.
 * @returns A tool-call part component suitable for `tools.Fallback` or a `tools.by_name` entry.
 */
export function createToolFallbackComponent(
  summarize: (toolName: string, args: Record<string, unknown>) => string
): ToolCallMessagePartComponent {
  return function ToolFallback({ toolName, args, result, isError }): React.ReactElement {
    const resultText = resultToText(result);
    const argsObj = (args ?? {}) as Record<string, unknown>;
    return (
      <ToolAccordion
        toolName={toolName}
        summary={summarize(toolName, argsObj)}
        input={argsObj}
        result={resultText}
        severity={isError ? 'error' : 'normal'}
        errorLabel={isError ? (resultText ?? 'Tool call failed') : undefined}
      />
    );
  };
}

/**
 * Default renderer for a tool-call message part with no dedicated component:
 * {@link createToolFallbackComponent} applied to the generic JSON-preview
 * {@link summarizeArgs}.
 */
export const ToolFallbackPart: ToolCallMessagePartComponent = createToolFallbackComponent((_toolName, args) =>
  summarizeArgs(args)
);
