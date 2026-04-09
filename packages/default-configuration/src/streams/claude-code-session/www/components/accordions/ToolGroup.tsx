/**
 * Container that groups consecutive tool call accordions.
 *
 * Wraps a run of ToolAccordions in a subtly tinted zone with top/bottom
 * separators so tool activity reads as a discrete block, visually recessed
 * from the conversation flow.
 *
 * @summary Visual grouping container for consecutive tool calls
 * @module components/accordions/ToolGroup
 */

import type React from 'react';

interface ToolGroupProps {
  /** The ToolAccordion elements to wrap. */
  children: React.ReactNode;
}

/**
 * Wraps consecutive tool calls in a recessed activity zone.
 * @param root0 - The component props.
 * @param root0.children - ToolAccordion elements to group.
 * @returns Rendered tool activity zone container.
 */
export function ToolGroup({ children }: ToolGroupProps): React.ReactElement {
  return (
    <div
      className="cc-tool-group my-1 rounded-sm"
      style={{
        background: 'color-mix(in srgb, var(--vscode-foreground, #cccccc) 2%, transparent)',
        borderTop: '1px solid color-mix(in srgb, var(--vscode-panel-border, #3c3c3c) 40%, transparent)',
        borderBottom: '1px solid color-mix(in srgb, var(--vscode-panel-border, #3c3c3c) 40%, transparent)'
      }}
    >
      {children}
    </div>
  );
}
