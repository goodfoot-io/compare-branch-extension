/**
 * Footer row for the compact micro-card view.
 *
 * Displays turn count, token count, error count, and session status label.
 *
 * @summary Compact view footer: turns, tokens, errors, status label
 * @module components/compact/CompactFooter
 */

import type React from 'react';

interface CompactFooterProps {
  /** Number of completed turns (0 = hidden). */
  turnCount: number;
  /** Formatted token string (e.g. "1.2k"), or empty string if none. */
  tokenStr: string;
  /** Number of errors (0 = hidden). */
  errorCount: number;
  /** Session status: 'running' | 'success' | 'error'. */
  sessionStatus: string;
}

/**
 * Footer row with turn/token/error counts and a status label.
 * @param root0 - The component props.
 * @param root0.turnCount - Number of completed turns (0 = hidden).
 * @param root0.tokenStr - Formatted token string (e.g. "1.2k"), or empty string if none.
 * @param root0.errorCount - Number of errors (0 = hidden).
 * @param root0.sessionStatus - Session status: 'running' | 'success' | 'error'.
 * @returns Rendered footer row element.
 */
export function CompactFooter({
  turnCount,
  tokenStr,
  errorCount,
  sessionStatus
}: CompactFooterProps): React.ReactElement {
  const statusLabel = sessionStatus === 'success' ? 'done' : sessionStatus === 'error' ? 'error' : 'running';

  return (
    <div className="flex items-center gap-1.5 text-[0.75em] text-vscode-descriptionForeground">
      {turnCount > 0 && <span>{turnCount} turns</span>}
      {tokenStr && <span>{tokenStr}</span>}
      {errorCount > 0 && (
        <span className="text-vscode-errorForeground">
          {errorCount} error{errorCount !== 1 ? 's' : ''}
        </span>
      )}
      <span className="ml-auto">{statusLabel}</span>
    </div>
  );
}
