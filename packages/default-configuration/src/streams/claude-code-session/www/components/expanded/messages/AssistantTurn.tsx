/**
 * Assistant turn bubble for the expanded transcript.
 *
 * Renders text blocks and thinking accordions. Coordination blocks (JSON/XML
 * injections, task IDs, tool IDs) are silently skipped — they are internal
 * orchestration data with no value to the reader.
 *
 * Tool_use blocks are not rendered here — they are rendered as ToolAccordions
 * in the following user turn when the result arrives.
 *
 * @summary Assistant bubble with text and thinking accordion
 * @module components/expanded/messages/AssistantTurn
 */

import type React from 'react';
import { renderMarkdown } from '../../../lib/markdown';
import type { ContentBlock } from '../../../lib/parse-session';
import { ThinkingAccordion } from '../../accordions/ThinkingAccordion';
import { isCoordinationContent } from './CoordinationLine';

interface AssistantTurnProps {
  /** Non-tool content blocks from the assistant message. */
  blocks: ContentBlock[];
}

/**
 * Renders an assistant turn: text blocks and thinking accordions.
 * Coordination blocks are skipped.
 * @param root0 - The component props.
 * @param root0.blocks - Non-tool content blocks from the assistant message.
 * @returns Rendered assistant turn fragment, or null when all blocks are empty.
 */
export function AssistantTurn({ blocks }: AssistantTurnProps): React.ReactElement | null {
  const bubbleChildren: React.ReactElement[] = [];

  blocks.forEach((block, i) => {
    if (block.type === 'text' && block.text) {
      if (isCoordinationContent(block.text)) return; // skip internal orchestration noise
      bubbleChildren.push(
        <div
          key={`text-${i}`}
          className="cc-text break-words overflow-wrap-anywhere min-w-0 max-w-full"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text) }}
        />
      );
    } else if (block.type === 'thinking' && block.thinking) {
      bubbleChildren.push(<ThinkingAccordion key={`think-${i}`} thinking={block.thinking} />);
    }
  });

  if (bubbleChildren.length === 0) return null;

  return (
    <div className="flex flex-col items-start w-full max-w-full min-w-0 py-2 first:pt-0">
      <div
        className="max-w-[85%] break-words overflow-wrap-anywhere px-3 py-2 rounded rounded-bl-none border bg-blue-600/10 border-blue-600/40"
      >
        {bubbleChildren}
      </div>
    </div>
  );
}
