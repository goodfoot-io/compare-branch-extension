/**
 * Assistant turn bubble for the expanded transcript.
 *
 * Renders text blocks and thinking accordions. Coordination blocks (JSON/XML
 * injections, task IDs, tool IDs) render as compact dimmed lines via
 * {@link classifyCoordination} instead of being dropped — internal
 * orchestration data still has *some* value to a reader auditing the
 * session, so it stays visible rather than vanishing without a trace
 * (`idle_notification` pings remain suppressed, per that classifier).
 *
 * Tool_use blocks are not rendered here — they are rendered as ToolAccordions
 * in the following user turn when the result arrives.
 *
 * @summary Assistant bubble with text, thinking accordion, and coordination lines
 * @module components/expanded/messages/AssistantTurn
 */

import type React from 'react';
import { renderMarkdownNodes } from '../../../../../lib/markdown';
import { ReasoningAccordion } from '../../../../../lib/ReasoningAccordion';
import type { ContentBlock } from '../../../lib/parse-session';
import { classifyCoordination, isCoordinationContent } from './CoordinationLine';

interface AssistantTurnProps {
  /** Non-tool content blocks from the assistant message. */
  blocks: ContentBlock[];
}

/**
 * Renders an assistant turn: text blocks, thinking accordions, and
 * coordination lines.
 * @param root0 - The component props.
 * @param root0.blocks - Non-tool content blocks from the assistant message.
 * @returns Rendered assistant turn fragment, or null when all blocks are empty.
 */
export function AssistantTurn({ blocks }: AssistantTurnProps): React.ReactElement | null {
  const bubbleChildren: React.ReactElement[] = [];

  blocks.forEach((block, i) => {
    if (block.type === 'text' && block.text) {
      if (isCoordinationContent(block.text)) {
        bubbleChildren.push(...classifyCoordination(block.text, `coord-${i}`));
        return;
      }
      bubbleChildren.push(
        <div key={`text-${i}`} className="cc-text break-words overflow-wrap-anywhere min-w-0 max-w-full">
          {renderMarkdownNodes(block.text, `text-${i}`)}
        </div>
      );
    } else if (block.type === 'thinking' && block.thinking) {
      bubbleChildren.push(<ReasoningAccordion key={`think-${i}`} thinking={block.thinking} />);
    }
  });

  if (bubbleChildren.length === 0) {
    // Redacted/empty thinking blocks (API returns thinking="" with a signature)
    // produce no rendered content. Surface them as a centered placeholder so
    // the gap they create between tool runs is explained instead of mysterious.
    const hadThinking = blocks.some((b) => b.type === 'thinking');
    if (hadThinking) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5em',
            minHeight: '64px',
            color: 'var(--stream-fg-muted)',
            fontSize: '10px'
          }}
        >
          <span className="codicon codicon-lightbulb" aria-hidden="true" style={{ fontSize: '12px' }} />
          <span>Thinking</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="stream-turn stream-turn--assistant break-words overflow-wrap-anywhere" data-turn="assistant">
      <div className="stream-role-label">Assistant</div>
      {bubbleChildren}
    </div>
  );
}
