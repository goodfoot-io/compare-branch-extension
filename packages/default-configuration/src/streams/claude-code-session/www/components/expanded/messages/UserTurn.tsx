/**
 * User turn message bubble for the expanded transcript.
 *
 * Human prose is rendered right-justified in a tinted chat bubble. Coordination
 * blocks (JSON/XML injections) are silently skipped — they are internal
 * orchestration data with no value to the reader.
 *
 * @summary Right-justified user chat bubble with markdown
 * @module components/expanded/messages/UserTurn
 */

import type React from 'react';
import { renderMarkdown } from '../../../../../lib/markdown';
import { isCoordinationContent } from './CoordinationLine';

interface UserTurnProps {
  /** Text content blocks from the user message. */
  textBlocks: string[];
}

/**
 * Renders a user turn as a right-justified chat bubble.
 * Coordination content is skipped.
 * @param root0 - The component props.
 * @param root0.textBlocks - Text content blocks from the user message.
 * @returns Rendered user turn bubble, or null when all blocks are empty.
 */
export function UserTurn({ textBlocks }: UserTurnProps): React.ReactElement | null {
  const humanParts: string[] = [];

  for (const raw of textBlocks) {
    if (!isCoordinationContent(raw)) {
      humanParts.push(raw);
    }
  }

  if (humanParts.length === 0) return null;

  const humanText = humanParts.join('\n\n');

  return (
    <div className="flex flex-col items-end w-full max-w-full min-w-0 py-2 first:pt-0" data-turn="user">
      <div className="max-w-[85%] break-words overflow-wrap-anywhere px-3 py-2 rounded rounded-br-none border bg-green-600/10 border-green-600/40">
        <div
          className="cc-text break-words overflow-wrap-anywhere min-w-0 max-w-full"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(humanText) }}
        />
      </div>
    </div>
  );
}
