/**
 * Transcript area for the expanded view.
 *
 * Wraps the MessageRouter in a scrollable padded container, or renders an
 * empty placeholder when no messages are available.
 *
 * @summary Expanded transcript container with empty placeholder
 * @module components/expanded/Transcript
 */

import type React from 'react';
import type { SessionMsg } from '../../lib/parse-session';
import { MessageRouter } from './messages/MessageRouter';

interface TranscriptProps {
  /** Parsed session messages to render. */
  messages: SessionMsg[];
  /** Callback when init data is parsed. */
  onInit?: (model: string, cwd: string) => void;
  /** Callback when session result is parsed. */
  onResult?: (status: 'success' | 'error') => void;
}

/**
 * Renders the message list or an empty placeholder.
 * @param root0 - The component props.
 * @param root0.messages - Parsed session messages to render.
 * @param root0.onInit - Callback when init data is parsed.
 * @param root0.onResult - Callback when session result is parsed.
 * @returns Rendered scrollable transcript container or empty placeholder.
 */
export function Transcript({ messages, onInit, onResult }: TranscriptProps): React.ReactElement {
  if (messages.length === 0) {
    return <div className="text-vscode-descriptionForeground italic text-[0.9em] px-3.5 py-4">No output yet.</div>;
  }

  return (
    <div className="cc-transcript px-4 pt-4 pb-10 flex flex-col gap-2 overflow-visible" style={{ fontSize: '13px' }}>
      <MessageRouter messages={messages} onInit={onInit} onResult={onResult} />
    </div>
  );
}
