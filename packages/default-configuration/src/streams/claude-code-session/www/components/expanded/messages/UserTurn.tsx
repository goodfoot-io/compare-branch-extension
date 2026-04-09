/**
 * User turn message bubble for the expanded transcript.
 *
 * Classifies each text block as coordination content (JSON/XML) or human
 * prose. Coordination blocks are rendered as dimmed system lines; prose
 * blocks are rendered in a focus-tinted bubble with markdown.
 *
 * @summary User message bubble with coordination classification
 * @module components/expanded/messages/UserTurn
 */

import type React from 'react';
import { renderMarkdown } from '../../../lib/markdown';
import { classifyCoordination, isCoordinationContent } from './CoordinationLine';

interface UserTurnProps {
  /** Text content blocks from the user message. */
  textBlocks: string[];
}

/**
 * Renders a user turn: coordination lines for JSON/XML blocks and a
 * focus-tinted bubble for human prose.
 * @param root0 - The component props.
 * @param root0.textBlocks - Text content blocks from the user message.
 * @returns Rendered user turn fragment with coordination lines and prose bubble.
 */
export function UserTurn({ textBlocks }: UserTurnProps): React.ReactElement {
  const coordinationNodes: React.ReactElement[] = [];
  const humanParts: string[] = [];

  textBlocks.forEach((raw, i) => {
    if (isCoordinationContent(raw)) {
      const nodes = classifyCoordination(raw, `user-coord-${i}`);
      coordinationNodes.push(...nodes);
    } else {
      humanParts.push(raw);
    }
  });

  const humanText = humanParts.join('\n\n');

  return (
    <>
      {coordinationNodes}
      {humanParts.length > 0 && (
        <div className="flex flex-col items-start w-full max-w-full min-w-0 py-2 first:pt-0" data-turn="user">
          <div
            className="w-full break-words overflow-wrap-anywhere px-3 py-2"
            style={{
              borderLeft: '3px solid color-mix(in srgb, var(--vscode-focusBorder, #007fd4) 60%, transparent)'
            }}
          >
            <div
              className="cc-text break-words overflow-wrap-anywhere min-w-0 max-w-full"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(humanText) }}
            />
          </div>
        </div>
      )}
    </>
  );
}
