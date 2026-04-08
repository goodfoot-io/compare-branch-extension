/**
 * Status badge for the compact micro-card view.
 *
 * Renders a small colored square with a single character indicating session
 * type: O for orchestrator, A for agent, ! for error.
 *
 * @summary Compact view status badge: O/A/! with color class
 * @module components/compact/Badge
 */

import type React from 'react';

/** Badge variant determines color and character. */
export type BadgeVariant = 'orchestrator' | 'agent' | 'error';

interface BadgeProps {
  /** Badge visual variant. */
  variant: BadgeVariant;
}

/** Character displayed for each badge variant. */
const BADGE_CHAR: Record<BadgeVariant, string> = {
  orchestrator: 'O',
  agent: 'A',
  error: '!'
};

/**
 * Small colored square badge indicating session type or error state.
 * @param root0 - The component props.
 * @param root0.variant - Badge visual variant.
 * @returns Rendered badge span element.
 */
export function Badge({ variant }: BadgeProps): React.ReactElement {
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-sm text-[10px] font-bold text-white shrink-0 font-vscode-editor"
      style={{
        background:
          variant === 'error'
            ? 'var(--vscode-errorForeground, #f48771)'
            : variant === 'agent'
              ? 'var(--vscode-terminal-ansiGreen, #16a34a)'
              : 'var(--vscode-terminal-ansiBlue, #2563eb)'
      }}
    >
      {BADGE_CHAR[variant]}
    </span>
  );
}
