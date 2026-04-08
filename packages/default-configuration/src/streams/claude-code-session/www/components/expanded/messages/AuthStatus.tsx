/**
 * Authentication status line for the expanded transcript.
 *
 * Renders auth errors as red error lines and auth-in-progress as dimmed
 * italic text.
 *
 * @summary Auth error / authenticating system line
 * @module components/expanded/messages/AuthStatus
 */

import type React from 'react';

interface AuthStatusProps {
  /** Auth error message, or null if no error. */
  error?: string;
  /** Whether authentication is currently in progress. */
  isAuthenticating?: boolean;
}

/**
 * Renders authentication state as an error line or status line.
 * Returns null when there is nothing to display.
 * @param root0 - The component props.
 * @param root0.error - Auth error message, or null if no error.
 * @param root0.isAuthenticating - Whether authentication is currently in progress.
 * @returns Rendered auth error or status line, or null when nothing to display.
 */
export function AuthStatus({ error, isAuthenticating }: AuthStatusProps): React.ReactElement | null {
  if (error) {
    return (
      <div
        className="text-[0.85em] py-1 px-2 font-vscode-editor"
        style={{
          color: 'var(--vscode-charts-red, #f48771)',
          borderLeft: '2px solid var(--vscode-charts-red, #f48771)'
        }}
      >
        Auth error: {error}
      </div>
    );
  }
  if (isAuthenticating) {
    return <div className="text-[0.8em] text-vscode-descriptionForeground italic py-0.5">Authenticating…</div>;
  }
  return null;
}
