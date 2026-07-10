/**
 * Default tool-call part renderer for `MessagePrimitive.Content`'s
 * `tools.Fallback` slot — used whenever a converter emits a `tool-call` part
 * whose `toolName` has no caller-supplied entry in `tools.by_name`.
 *
 * Thin adapter over the existing `ToolAccordion` (../accordions/ToolAccordion.tsx):
 * a timeline row with the tool name, a one-line JSON preview of `args`, and a
 * chevron that expands to the full `ToolInputTable`/`JsonBlock` input and the
 * result. `isError` escalates the row to the error severity treatment.
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
function resultToText(result: unknown): string | null {
  if (result === undefined) return null;
  if (typeof result === 'string') return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

/**
 * Default renderer for a tool-call message part with no dedicated component.
 * @param root0 - The component props.
 * @param root0.toolName - Name of the tool that was called.
 * @param root0.args - Arguments supplied to the tool.
 * @param root0.result - Result returned by the tool, if completed.
 * @param root0.isError - Whether the result represents a tool execution error.
 * @returns Rendered tool accordion element.
 */
export const ToolFallbackPart: ToolCallMessagePartComponent = ({
  toolName,
  args,
  result,
  isError
}): React.ReactElement => {
  const resultText = resultToText(result);
  return (
    <ToolAccordion
      toolName={toolName}
      summary={summarizeArgs(args)}
      input={(args ?? {}) as Record<string, unknown>}
      result={resultText}
      severity={isError ? 'error' : 'normal'}
      errorLabel={isError ? (resultText ?? 'Tool call failed') : undefined}
    />
  );
};
