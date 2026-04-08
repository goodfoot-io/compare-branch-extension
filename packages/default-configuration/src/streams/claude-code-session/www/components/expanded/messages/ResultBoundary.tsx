/**
 * Session result boundary for the expanded transcript.
 *
 * Renders a "Session complete · N turns · Ns · $cost" or
 * "Session error (subtype) · N turns · Ns" separator at the end of a session.
 *
 * @summary Session complete/error result boundary separator
 * @module components/expanded/messages/ResultBoundary
 */

import type React from 'react';

interface ResultBoundaryProps {
  /** Whether the session completed successfully. */
  isSuccess: boolean;
  /** Error subtype string (used when not success). */
  subtype: string;
  /** Number of turns in the session. */
  turns: number;
  /** Total session duration in seconds. */
  durationS: number;
  /** Total cost in USD, or null if unknown. */
  totalCostUsd: number | null;
}

/**
 * Centered horizontal separator marking session completion or error.
 * @param root0 - The component props.
 * @param root0.isSuccess - Whether the session completed successfully.
 * @param root0.subtype - Error subtype string (used when not success).
 * @param root0.turns - Number of turns in the session.
 * @param root0.durationS - Total session duration in seconds.
 * @param root0.totalCostUsd - Total cost in USD, or null if unknown.
 * @returns Rendered result boundary separator element.
 */
export function ResultBoundary({
  isSuccess,
  subtype,
  turns,
  durationS,
  totalCostUsd
}: ResultBoundaryProps): React.ReactElement {
  const costStr = totalCostUsd != null ? ` · $${totalCostUsd.toFixed(4)}` : '';
  const text = isSuccess
    ? `Session complete · ${turns} turns · ${durationS}s${costStr}`
    : `Session error (${subtype}) · ${turns} turns · ${durationS}s`;

  return (
    <div className="flex items-center gap-2 py-1.5 my-1 text-[0.8em] text-vscode-descriptionForeground">
      <span
        className="flex-1 h-px"
        style={{ background: 'var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))' }}
      />
      {text}
      <span
        className="flex-1 h-px"
        style={{ background: 'var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))' }}
      />
    </div>
  );
}
