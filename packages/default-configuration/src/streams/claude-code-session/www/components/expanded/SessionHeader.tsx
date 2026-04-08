/**
 * Session header bar for the expanded transcript view.
 *
 * Shows model name, working directory, and a status indicator dot that
 * updates as the session progresses (running/success/error).
 *
 * @summary Session header: model · cwd · status dot
 * @module components/expanded/SessionHeader
 */

import type React from 'react';

/** Session running/completion status. */
export type SessionStatus = 'running' | 'success' | 'error';

interface SessionHeaderProps {
  /** Model name (e.g. "claude-opus-4-5"). */
  model: string;
  /** Current working directory of the session. */
  cwd: string;
  /** Session status for the indicator dot color. */
  status: SessionStatus;
}

/** Status dot color per session state. */
const STATUS_COLOR: Record<SessionStatus, string> = {
  running: 'var(--vscode-charts-yellow, #cca700)',
  success: 'var(--vscode-charts-green, #89d185)',
  error: 'var(--vscode-charts-red, #f48771)'
};

/**
 * Sticky header bar showing model, cwd, and live status dot.
 * Hidden when both model and cwd are empty.
 * @param root0 - The component props.
 * @param root0.model - Model name (e.g. "claude-opus-4-5").
 * @param root0.cwd - Current working directory of the session.
 * @param root0.status - Session status for the indicator dot color.
 * @returns Rendered sticky header bar, or null when model and cwd are both empty.
 */
export function SessionHeader({ model, cwd, status }: SessionHeaderProps): React.ReactElement | null {
  if (!model && !cwd) return null;

  return (
    <div
      className="flex items-center gap-2 px-3.5 py-2 text-[0.82em] text-vscode-descriptionForeground shrink-0"
      style={{
        borderBottom: '1px solid var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))',
        background: 'var(--vscode-editor-background, #1e1e1e)'
      }}
    >
      {model && <span className="font-vscode-editor text-vscode-foreground">{model}</span>}
      {model && cwd && <span style={{ color: 'var(--vscode-panel-border, #3c3c3c)' }}>·</span>}
      {cwd && (
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-vscode-editor" title={cwd}>
          {cwd}
        </span>
      )}
      <span className="shrink-0 w-[7px] h-[7px] rounded-full ml-auto" style={{ background: STATUS_COLOR[status] }} />
    </div>
  );
}
