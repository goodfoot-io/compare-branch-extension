/**
 * Assistant turn bubble for the expanded transcript.
 *
 * Renders text blocks (with coordination detection), thinking accordions, and
 * registers tool_use blocks for later pairing with tool results in UserTurn.
 *
 * Tool_use blocks are not rendered here — they are rendered as ToolAccordions
 * in the following user turn when the result arrives.
 *
 * @summary Assistant bubble with text, thinking accordion, coordination detection
 * @module components/expanded/messages/AssistantTurn
 */

import type React from 'react';
import { renderMarkdown } from '../../../lib/markdown';
import type { ContentBlock } from '../../../lib/parse-session';
import { ThinkingAccordion } from '../../accordions/ThinkingAccordion';
import { classifyCoordination, isCoordinationContent } from './CoordinationLine';

interface AssistantTurnProps {
  /** Non-tool content blocks from the assistant message. */
  blocks: ContentBlock[];
}

/**
 * Renders an assistant turn: coordination lines outside the bubble,
 * text and thinking blocks inside.
 * @param root0 - The component props.
 * @param root0.blocks - Non-tool content blocks from the assistant message.
 * @returns Rendered assistant turn fragment, or null when all blocks are empty.
 */
export function AssistantTurn({ blocks }: AssistantTurnProps): React.ReactElement | null {
  const bubbleChildren: React.ReactElement[] = [];
  const coordinationNodes: React.ReactElement[] = [];

  blocks.forEach((block, i) => {
    if (block.type === 'text' && block.text) {
      if (isCoordinationContent(block.text)) {
        const nodes = classifyCoordination(block.text, `asst-coord-${i}`);
        coordinationNodes.push(...nodes);
      } else {
        bubbleChildren.push(
          <div
            key={`text-${i}`}
            className="cc-text break-words overflow-wrap-anywhere min-w-0 max-w-full"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text) }}
          />
        );
      }
    } else if (block.type === 'thinking' && block.thinking) {
      bubbleChildren.push(<ThinkingAccordion key={`think-${i}`} thinking={block.thinking} />);
    }
  });

  if (bubbleChildren.length === 0 && coordinationNodes.length === 0) return null;

  return (
    <>
      {coordinationNodes}
      {bubbleChildren.length > 0 && (
        <div className="flex flex-col items-start w-full max-w-full min-w-0 py-2 first:pt-0">
          <div className="w-full break-words overflow-wrap-anywhere">{bubbleChildren}</div>
        </div>
      )}
    </>
  );
}
