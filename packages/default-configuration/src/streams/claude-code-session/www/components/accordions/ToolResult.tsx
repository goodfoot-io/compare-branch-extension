/**
 * Tool result section inside a tool accordion body.
 *
 * Shows a "RESULT" label followed by the result content. Markdown results
 * (e.g. skill instructions) are rendered as formatted HTML; plain text results
 * are shown as pre-wrapped text. No clipping — full content is always visible
 * when the accordion is open.
 *
 * @summary Tool result label with markdown-aware full content display
 * @module components/accordions/ToolResult
 */

import type React from 'react';
import { renderMarkdown } from '../../lib/markdown';

interface ToolResultProps {
  /** Result string to display. */
  result: string;
}

/**
 * Heuristic: treat result as markdown if it has heading, list, or table markers.
 * @param text - The result string to test.
 * @returns True if the text appears to contain markdown formatting.
 */
function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s|^\s*[-*]\s|^\s*\d+\.\s|^\|.+\|/m.test(text);
}

/**
 * Renders the result section of a tool accordion.
 * @param root0 - The component props.
 * @param root0.result - Result string to display.
 * @returns Rendered tool result section element.
 */
export function ToolResult({ result }: ToolResultProps): React.ReactElement {
  const isMarkdown = looksLikeMarkdown(result);

  return (
    <div
      style={{
        borderTop: '0.5px solid var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))',
        background: 'color-mix(in srgb, var(--vscode-foreground, #cccccc) 3%, transparent)'
      }}
    >
      <div className="text-[10px] text-vscode-descriptionForeground opacity-60 font-vscode-editor px-2 pt-1 pb-0.5 uppercase tracking-wider">
        Result
      </div>
      {isMarkdown ? (
        <div
          className="cc-text text-[11px] px-2 pb-2 break-words overflow-wrap-anywhere min-w-0 max-w-full"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }}
        />
      ) : (
        <div className="text-[11px] text-vscode-foreground font-vscode-editor whitespace-pre-wrap break-words px-2 pb-1.5">
          {result}
        </div>
      )}
    </div>
  );
}
