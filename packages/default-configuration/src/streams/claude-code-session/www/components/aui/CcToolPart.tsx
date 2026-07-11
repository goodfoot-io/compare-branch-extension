/**
 * Claude tool-call part renderer for `StreamThread`'s `toolComponents` registry.
 *
 * Unlike the shared `ToolFallbackPart` (../../../../lib/aui/ToolFallbackPart.tsx),
 * this renders through the Claude-specific `ToolAccordion` wrapper
 * (../accordions/ToolAccordion.tsx) so hook nesting, the isMeta supplemental
 * result, and the Skill input-hiding rule all survive the assistant-ui move.
 * `to-thread-messages.ts` carries those extras inside the part's structured
 * `result` (a `CcToolResult`), which this component unpacks.
 *
 * `ExpandedView` registers this under every tool name observed in the
 * transcript (assistant-ui has no wildcard `toolComponents` entry), so it is
 * the de facto renderer for all Claude tool calls, not just one.
 *
 * @summary Claude tool-call part: unpacks CcToolResult, delegates to ToolAccordion
 * @module components/aui/CcToolPart
 */

import type { ToolCallMessagePartComponent } from '@assistant-ui/react';
import type React from 'react';
import type { CcToolResult } from '../../lib/to-thread-messages';
import { ToolAccordion } from '../accordions/ToolAccordion';

/**
 * Renders a Claude tool-call part via the shared `ToolAccordion`, unpacking
 * the structured `CcToolResult` the converter attaches once the tool
 * resolves.
 * @param root0 - The component props.
 * @param root0.toolName - Name of the tool that was called.
 * @param root0.args - Arguments supplied to the tool.
 * @param root0.result - The structured `CcToolResult`, or undefined while pending.
 * @returns Rendered tool accordion element.
 */
export const CcToolPart: ToolCallMessagePartComponent = ({ toolName, args, result }): React.ReactElement => {
  const r = result as CcToolResult | undefined;
  return (
    <ToolAccordion
      toolName={toolName}
      input={(args ?? {}) as Record<string, unknown>}
      result={r?.output ?? null}
      supplementalResult={r?.supplementalResult ?? null}
      hooks={r?.hooks}
    />
  );
};
