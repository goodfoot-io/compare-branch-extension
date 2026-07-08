/**
 * Subagent tool-activity line for the expanded transcript.
 *
 * Renders one tool call taken from a `progress`/`agent_progress` message — a
 * subagent's live tool activity, reported on the *parent* stream while the
 * subagent's own tool call is in flight (its `tool_result` lives in the
 * subagent's own transcript, not here). Rendered as a quiet, non-interactive
 * line rather than a full `ToolAccordion` since there is no paired result to
 * expand.
 *
 * @summary Quiet subagent tool-activity line (no paired result to expand)
 * @module components/expanded/messages/SubagentActivityLine
 */

import type React from 'react';

interface SubagentActivityLineProps {
  /** Name of the tool the subagent is calling. */
  toolName: string;
  /** Precomputed preview string for the call (from `summarizeTool`). */
  summary: string;
}

/**
 * Renders a single subagent tool-activity line: `↳ {toolName} {summary}`.
 * @param root0 - The component props.
 * @param root0.toolName - Name of the tool the subagent is calling.
 * @param root0.summary - Precomputed preview string for the call.
 * @returns Rendered subagent activity line element.
 */
export function SubagentActivityLine({ toolName, summary }: SubagentActivityLineProps): React.ReactElement {
  return (
    <div
      className="flex items-center gap-2 py-0.5 px-2 font-vscode-editor overflow-hidden text-ellipsis whitespace-nowrap"
      style={{ color: 'var(--stream-fg-muted)', fontSize: 'var(--stream-text-label)' }}
    >
      <span className="codicon codicon-arrow-right shrink-0" style={{ fontSize: 'var(--stream-text-micro)' }} />
      <span className="shrink-0">{toolName}</span>
      {summary && <span className="overflow-hidden text-ellipsis whitespace-nowrap opacity-80">{summary}</span>}
    </div>
  );
}
