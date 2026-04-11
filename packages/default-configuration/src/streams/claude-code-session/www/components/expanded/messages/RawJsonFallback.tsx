/**
 * Fallback renderer for stream messages with no dedicated component.
 *
 * Displays the raw JSON of an unrecognized message in a compact, readable
 * block so that unhandled message types are visible rather than silently
 * dropped.
 *
 * @summary Raw JSON block for unrecognized stream messages
 * @module components/expanded/messages/RawJsonFallback
 */

import type React from 'react';

interface RawJsonFallbackProps {
  /** The message object to display as pretty-printed JSON. */
  data: unknown;
}

/**
 * Renders an unrecognized message as an indented JSON block.
 * @param root0 - The component props.
 * @param root0.data - The message object to display.
 * @returns A preformatted JSON block with muted styling.
 */
export function RawJsonFallback({ data }: RawJsonFallbackProps): React.ReactElement {
  return (
    <pre
      className="text-[0.75em] font-vscode-editor opacity-50 px-2 py-1 my-0.5 overflow-x-auto whitespace-pre-wrap break-all"
      style={{ borderLeft: '2px solid var(--vscode-editorWidget-border, #454545)' }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
