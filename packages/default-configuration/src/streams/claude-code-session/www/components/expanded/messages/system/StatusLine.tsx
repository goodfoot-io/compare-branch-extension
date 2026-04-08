/**
 * System status line for the expanded transcript.
 *
 * Renders italic dimmed status messages such as "Compacting context…".
 *
 * @summary System status line (italic, dimmed)
 * @module components/expanded/messages/system/StatusLine
 */

import type React from 'react';

interface StatusLineProps {
  /** Status text to display. */
  text: string;
}

/**
 * Italic dimmed system status line.
 * @param root0 - The component props.
 * @param root0.text - Status text to display.
 * @returns Rendered italic dimmed status line element.
 */
export function StatusLine({ text }: StatusLineProps): React.ReactElement {
  return <div className="text-[0.8em] text-vscode-descriptionForeground italic py-0.5">{text}</div>;
}
