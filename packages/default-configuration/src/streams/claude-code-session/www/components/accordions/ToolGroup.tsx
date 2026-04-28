/**
 * Container that groups consecutive tool call accordions.
 *
 * Wraps a run of ToolAccordions with top and bottom borders so the zone
 * reads as a discrete block in the conversation flow.
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
 * Wraps consecutive tool calls in a bordered zone.
 * @param root0 - The component props.
 * @param root0.children - ToolAccordion elements to group.
 * @returns Rendered tool activity zone container.
 */
export function ToolGroup({ children }: ToolGroupProps): React.ReactElement {
  return (
    <div
      className="cc-tool-group my-1"
      style={{
        borderTop: '1px solid var(--vscode-panel-border)',
        borderBottom: '1px solid var(--vscode-panel-border)'
      }}
    >
      {children}
    </div>
  );
}
