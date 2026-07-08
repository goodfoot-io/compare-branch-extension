/**
 * System status line shared across the stream renderers.
 *
 * Renders italic dimmed status messages such as "Compacting context…".
 *
 * @summary System status line (italic, dimmed)
 * @module streams/lib/status-line
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
  return (
    <div
      className="stream-status-line text-vscode-descriptionForeground italic py-0.5"
      style={{ fontSize: 'var(--stream-text-label)' }}
    >
      {text}
    </div>
  );
}
