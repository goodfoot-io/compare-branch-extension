/**
 * User turn message bubble for the expanded transcript.
 *
 * Human prose is rendered right-justified in a tinted chat bubble. Coordination
 * blocks (JSON/XML injections) render as compact dimmed lines above the bubble
 * via {@link classifyCoordination} instead of being dropped (`idle_notification`
 * pings remain suppressed, per that classifier).
 *
 * @summary Right-justified user chat bubble with markdown, plus coordination lines
 * @module components/expanded/messages/UserTurn
 */

import type React from 'react';
import { renderMarkdownNodes } from '../../../../../lib/markdown';
import { classifyCoordination, isCoordinationContent } from './CoordinationLine';

interface UserTurnProps {
  /** Text content blocks from the user message. */
  textBlocks: string[];
}

/**
 * Renders a user turn as coordination lines (if any) followed by a
 * right-justified chat bubble for the genuine human prose (if any).
 * @param root0 - The component props.
 * @param root0.textBlocks - Text content blocks from the user message.
 * @returns Rendered user turn fragment, or null when all blocks are empty.
 */
export function UserTurn({ textBlocks }: UserTurnProps): React.ReactElement | null {
  const humanParts: string[] = [];
  const coordinationNodes: React.ReactElement[] = [];

  textBlocks.forEach((raw, i) => {
    if (isCoordinationContent(raw)) {
      coordinationNodes.push(...classifyCoordination(raw, `coord-${i}`));
    } else {
      humanParts.push(raw);
    }
  });

  if (humanParts.length === 0 && coordinationNodes.length === 0) return null;

  const humanText = humanParts.join('\n\n');

  return (
    <>
      {coordinationNodes.length > 0 && <div className="w-full max-w-full min-w-0">{coordinationNodes}</div>}
      {humanParts.length > 0 && (
        <div className="stream-turn stream-turn--user break-words overflow-wrap-anywhere" data-turn="user">
          <div className="stream-role-label">User</div>
          <div className="cc-text break-words overflow-wrap-anywhere min-w-0 max-w-full">
            {renderMarkdownNodes(humanText, 'user-text')}
          </div>
        </div>
      )}
    </>
  );
}
