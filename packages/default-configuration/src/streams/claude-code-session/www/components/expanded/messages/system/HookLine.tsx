/**
 * Hook lifecycle line for the expanded transcript.
 *
 * Renders compact monospace lines for hook_started, hook_progress, and
 * hook_response subtypes with appropriate prefix text.
 *
 * @summary Hook started/progress/response display line
 * @module components/expanded/messages/system/HookLine
 */

import type React from 'react';

/** Supported hook line subtypes. */
export type HookSubtype = 'hook_started' | 'hook_progress' | 'hook_response';

interface HookLineProps {
  /** Which hook lifecycle event this line represents. */
  subtype: HookSubtype;
  /** Hook name. */
  hookName: string;
  /** Event name (for hook_started). */
  hookEvent?: string;
  /** Output text (for hook_progress). */
  output?: string;
  /** Outcome value (for hook_response). */
  outcome?: string;
}

/**
 * Monospace hook lifecycle line.
 * @param root0 - The component props.
 * @param root0.subtype - Which hook lifecycle event this line represents.
 * @param root0.hookName - Identifier of the hook that triggered this lifecycle event.
 * @param root0.hookEvent - Event name (for hook_started).
 * @param root0.output - Output text (for hook_progress).
 * @param root0.outcome - Outcome value (for hook_response).
 * @returns Rendered monospace hook lifecycle line element.
 */
export function HookLine({ subtype, hookName, hookEvent, output, outcome }: HookLineProps): React.ReactElement {
  let text: string;
  if (subtype === 'hook_started') {
    text = `↳ hook ${hookName} (${hookEvent ?? ''})`;
  } else if (subtype === 'hook_progress') {
    text = `  ${hookName}: ${output ?? ''}`;
  } else {
    const outcomeChar = outcome === 'success' ? '✓' : outcome === 'error' ? '✗' : '○';
    text = `  ${outcomeChar} ${hookName} ${outcome ?? ''}`;
  }

  return (
    <div
      className="stream-status-line py-px font-vscode-editor"
      style={{ fontSize: '0.78em', color: 'var(--stream-fg-muted)' }}
    >
      {text}
    </div>
  );
}
