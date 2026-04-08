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
  const isLong = humanText.length > 500;

  return (
    <>
      {coordinationNodes}
      {humanParts.length > 0 && (
        <div className="flex flex-col items-start w-full max-w-full min-w-0 py-2 first:pt-0">
          <div
            className={`inline-block w-fit max-w-full rounded-md px-3.5 py-2 break-words overflow-wrap-anywhere${isLong ? ' cc-fade-clip block w-full max-h-40 overflow-hidden' : ''}`}
            style={{
              background: 'color-mix(in srgb, var(--vscode-focusBorder, #007fd4) 18%, transparent)',
              border: '1px solid color-mix(in srgb, var(--vscode-focusBorder, #007fd4) 40%, transparent)'
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
