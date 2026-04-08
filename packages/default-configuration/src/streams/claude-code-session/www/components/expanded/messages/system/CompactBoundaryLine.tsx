/**
 * Context compact boundary line for the expanded transcript.
 *
 * Renders a dashed horizontal rule with trigger type and token count when
 * the session's context window was compacted.
 *
 * @summary Context compacted separator with trigger and token count
 * @module components/expanded/messages/system/CompactBoundaryLine
 */

import type React from 'react';

interface CompactBoundaryLineProps {
  /** Compaction trigger (e.g. "auto", "manual"). */
  trigger: string;
  /** Number of tokens before compaction. */
  preTokens: number;
}

/**
 * Dashed separator line for context compaction events.
 * @param root0 - The component props.
 * @param root0.trigger - Compaction trigger (e.g. "auto", "manual").
 * @param root0.preTokens - Number of tokens before compaction.
 * @returns Rendered dashed separator element with trigger and token count.
 */
export function CompactBoundaryLine({ trigger, preTokens }: CompactBoundaryLineProps): React.ReactElement {
  return (
    <div
      className="flex items-center gap-2 py-1 text-[0.8em] text-vscode-descriptionForeground italic"
      style={{
        ['--border-color' as string]: 'var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))'
      }}
    >
      <span
        className="flex-1 h-px"
        style={{
          borderTop: '1px dashed var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))'
        }}
      />
      <span>
        Context compacted ({trigger}) · {preTokens.toLocaleString()} tokens
      </span>
      <span
        className="flex-1 h-px"
        style={{
          borderTop: '1px dashed var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))'
        }}
      />
    </div>
  );
}
