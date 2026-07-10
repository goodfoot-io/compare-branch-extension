/**
 * Read-only assistant-ui thread shell shared by both stream renderers.
 *
 * Wires a `ThreadMessageLike[]` array into `useExternalStoreRuntime` with an
 * identity `convertMessage` (messages arrive already in `ThreadMessageLike`
 * shape) and a no-op `onNew` — no composer is ever mounted, so `onNew` is
 * never invoked; this is display-only, with no edit/branch/retry affordances.
 * Renders `ThreadPrimitive.Root`/`Viewport`/`Messages` with role-labeled
 * user/assistant/system message shells (./messages.tsx) sharing one
 * `MessagePrimitive.Content` components registry: {@link MarkdownText} for
 * text, {@link ReasoningPart} for reasoning, {@link ToolFallbackPart} (or a
 * caller-supplied `toolComponents[toolName]`) for tool calls, and the four
 * shared data parts (./DataParts.tsx) plus any caller-supplied
 * `dataComponents` for `data` parts. `ThreadPrimitive.Viewport`'s default
 * `autoScroll` (true, bottom-anchored) keeps the transcript pinned to the
 * latest turn as new messages arrive.
 *
 * @summary Read-only assistant-ui thread shell shared by both stream renderers
 * @module streams/lib/aui/StreamThread
 */

import type { DataMessagePartComponent, ThreadMessageLike, ToolCallMessagePartComponent } from '@assistant-ui/react';
import { AssistantRuntimeProvider, ThreadPrimitive, useExternalStoreRuntime } from '@assistant-ui/react';
import type React from 'react';
import { useMemo } from 'react';
import {
  BoundaryDataPart,
  ErrorLineDataPart,
  RawDataPart,
  StatusLineDataPart,
  UnregisteredDataPart
} from './DataParts';
import { MarkdownText } from './MarkdownText';
import {
  createAssistantMessage,
  createSystemMessage,
  createUserMessage,
  type StreamContentComponents
} from './messages';
import { ReasoningPart } from './ReasoningPart';
import { ToolFallbackPart } from './ToolFallbackPart';

interface StreamThreadProps {
  /** The full transcript as `ThreadMessageLike` messages, in display order. */
  messages: readonly ThreadMessageLike[];
  /** Whether the session is still actively producing content. */
  isRunning: boolean;
  /** Provider-specific tool-name renderers, tried before {@link ToolFallbackPart}. */
  toolComponents?: Record<string, ToolCallMessagePartComponent>;
  /** Provider-specific data-part renderers, merged over (never replacing) the four shared parts in ./DataParts.tsx. */
  dataComponents?: Record<string, DataMessagePartComponent>;
}

/** The four shared `data` part renderers every converter can rely on out of the box. */
const SHARED_DATA_COMPONENTS: Record<string, DataMessagePartComponent> = {
  boundary: BoundaryDataPart,
  raw: RawDataPart,
  'status-line': StatusLineDataPart,
  'error-line': ErrorLineDataPart
};

/**
 * Identity conversion — the runtime's external store already speaks
 * `ThreadMessageLike`, so no per-message transform is needed.
 * @param message - The message as provided by the caller's store.
 * @returns The same message, unchanged.
 */
function identityConvertMessage(message: ThreadMessageLike): ThreadMessageLike {
  return message;
}

/**
 * No-op `onNew` handler. The thread renders no composer, so the runtime never
 * invokes this — it exists only to satisfy `useExternalStoreRuntime`'s
 * required shape.
 * @returns A resolved promise.
 */
async function noopOnNew(): Promise<void> {
  // Read-only thread: no composer is mounted, so onNew is never invoked.
}

/**
 * Renders a read-only assistant-ui thread over a fixed `ThreadMessageLike[]`
 * transcript.
 * @param root0 - The component props.
 * @param root0.messages - The full transcript, in display order.
 * @param root0.isRunning - Whether the session is still actively producing content.
 * @param root0.toolComponents - Provider-specific tool-name renderers.
 * @param root0.dataComponents - Provider-specific data-part renderers.
 * @returns Rendered read-only thread element.
 */
export function StreamThread({
  messages,
  isRunning,
  toolComponents,
  dataComponents
}: StreamThreadProps): React.ReactElement {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    isRunning,
    convertMessage: identityConvertMessage,
    onNew: noopOnNew
  });

  const contentComponents = useMemo<StreamContentComponents>(
    () => ({
      Text: MarkdownText,
      Reasoning: ReasoningPart,
      tools: { by_name: toolComponents, Fallback: ToolFallbackPart },
      data: { by_name: { ...SHARED_DATA_COMPONENTS, ...dataComponents }, Fallback: UnregisteredDataPart }
    }),
    [toolComponents, dataComponents]
  );

  const UserMessage = useMemo(() => createUserMessage(contentComponents), [contentComponents]);
  const AssistantMessage = useMemo(() => createAssistantMessage(contentComponents), [contentComponents]);
  const SystemMessage = useMemo(() => createSystemMessage(contentComponents), [contentComponents]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="aui-thread-root">
        <ThreadPrimitive.Viewport className="aui-thread-viewport">
          <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage, SystemMessage }} />
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
