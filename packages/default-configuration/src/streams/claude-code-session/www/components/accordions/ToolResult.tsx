/**
 * Tool result section inside a tool accordion body.
 *
 * Shows a "RESULT" label followed by the result text with gradient-fade
 * clipping for long outputs.
 *
 * @summary Tool result label and clipped content display
 * @module components/accordions/ToolResult
 */

import type React from 'react';

interface ToolResultProps {
  /** Result string to display. */
  result: string;
}

/**
 * Renders the result section of a tool accordion with optional gradient fade.
 * @param root0 - The component props.
 * @param root0.result - Result string to display.
 * @returns Rendered tool result section element.
 */
export function ToolResult({ result }: ToolResultProps): React.ReactElement {
  const isShort = result.length < 200 && result.split('\n').length <= 4;

  return (
    <div
      className="relative"
      style={{
        borderTop: '0.5px solid var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))',
        background: 'color-mix(in srgb, var(--vscode-foreground, #cccccc) 3%, transparent)'
      }}
    >
      <div
        className="text-[0.75em] text-vscode-descriptionForeground opacity-60 font-vscode-editor px-2 pt-1 pb-0.5"
        style={{ letterSpacing: '0.05em' }}
      >
        RESULT
      </div>
      <div
        className={`text-[0.85em] text-vscode-foreground font-vscode-editor whitespace-pre-wrap break-words px-2 pb-1.5${isShort ? '' : ' cc-result-clip'}`}
        style={isShort ? undefined : { maxHeight: '80px', overflow: 'hidden' }}
      >
        {result}
      </div>
    </div>
  );
}
