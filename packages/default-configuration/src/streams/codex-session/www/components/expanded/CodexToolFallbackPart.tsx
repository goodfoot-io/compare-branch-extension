/**
 * Codex `tools.Fallback` component for `StreamThread` — restores the domain
 * tool-call previews (`summarizeCodexTool`, ../../lib/tool-summary) that the
 * generic JSON-preview {@link ToolFallbackPart} default replaced.
 *
 * Codex tool names are dynamic (`exec_command`, `apply_patch`, MCP tool
 * names…), so a per-name `toolComponents` registry (as claude-code-session
 * uses) isn't feasible; this is registered instead via `StreamThread`'s
 * `toolFallback` prop, which every tool-call part with no `toolComponents`
 * entry reaches. Built from the shared {@link createToolFallbackComponent}
 * factory rather than duplicating the `ToolAccordion` wiring.
 *
 * @summary Codex tool-call fallback: domain summary over the shared ToolAccordion
 * @module streams/codex-session/www/components/expanded/CodexToolFallbackPart
 */

import type { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { createToolFallbackComponent } from '../../../../lib/aui';
import { argsPreviewText, summarizeCodexTool } from '../../lib/tool-summary';

/**
 * Computes the collapsed-header preview for a Codex tool-call part by
 * reconstructing an `argumentsText`-equivalent from its `args` object (see
 * {@link argsPreviewText}) and running it through {@link summarizeCodexTool}.
 * @param toolName - The tool_call's resolved `name` field.
 * @param args - The tool-call part's `args` object.
 * @returns A short, human-readable preview string.
 */
function summarize(toolName: string, args: Record<string, unknown>): string {
  return summarizeCodexTool(toolName, argsPreviewText(args));
}

/** Codex-specific override for `StreamThread`'s `toolFallback` prop. */
export const CodexToolFallbackPart: ToolCallMessagePartComponent = createToolFallbackComponent(summarize);
