/**
 * Session boundary separator for the expanded transcript.
 *
 * Renders a centered horizontal rule with "Session started · N tools" text,
 * displayed when the system init message is received.
 *
 * @summary Session started separator with tool count
 * @module components/expanded/messages/SessionBoundary
 */

import type React from 'react';

interface SessionBoundaryProps {
  /** Number of tools available in this session. */
  toolCount: number;
}

/**
 * Horizontal separator marking session start with tool count.
 * @param root0 - The component props.
 * @param root0.toolCount - Number of tools available in this session.
 * @returns Rendered session start separator element.
 */
export function SessionBoundary({ toolCount }: SessionBoundaryProps): React.ReactElement {
  return (
    <div
      className="flex items-center gap-2 py-1.5 my-1 text-[0.8em] text-vscode-descriptionForeground"
      style={{
        ['--sep-color' as string]: 'var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))'
      }}
    >
      <span
        className="flex-1 h-px"
        style={{ background: 'var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))' }}
      />
      Session started · {toolCount} tool{toolCount !== 1 ? 's' : ''}
      <span
        className="flex-1 h-px"
        style={{ background: 'var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))' }}
      />
    </div>
  );
}
