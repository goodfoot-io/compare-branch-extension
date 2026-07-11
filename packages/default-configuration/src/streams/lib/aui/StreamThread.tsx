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
 * text, {@link ReasoningPart} for reasoning, a caller-supplied
 * `toolComponents[toolName]` (falling back to a caller-supplied
 * `toolFallback`, then {@link ToolFallbackPart}) for tool calls, and the four
 * shared data parts (./DataParts.tsx) plus any caller-supplied
 * `dataComponents` for `data` parts. `ThreadPrimitive.Viewport`'s default
 * `autoScroll` (true, bottom-anchored) keeps the transcript pinned to the
 * latest turn as new messages arrive. `Messages` renders inside an
 * `.aui-thread-content` div (aui.css) that caps and centers the readable
 * column while the viewport itself stays full width, so its scrollbar sits at
 * the pane edge rather than beside the text.
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
  /** Provider-specific tool-name renderers, tried before `toolFallback`/{@link ToolFallbackPart}. */
  toolComponents?: Record<string, ToolCallMessagePartComponent>;
  /**
   * Overrides the default {@link ToolFallbackPart} for any tool-call part
   * whose `toolName` has no entry in `toolComponents` — for a provider whose
   * tool names are dynamic (e.g. Codex's `exec_command`/`apply_patch`/MCP
   * tool names), so a per-name `toolComponents` registry isn't feasible.
   */
  toolFallback?: ToolCallMessagePartComponent;
  /** Provider-specific data-part renderers, merged over (never replacing) the four shared parts in ./DataParts.tsx. */
  dataComponents?: Record<string, DataMessagePartComponent>;
  /** Provider display name shown in the assistant turn's avatar header (e.g. "Claude Code", "Codex"). Defaults to "Assistant". */
  assistantName?: string;
  /** Codicon name for the assistant turn's avatar header chip. Defaults to "robot". */
  assistantIcon?: string;
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
 * @param root0.toolFallback - Overrides the default {@link ToolFallbackPart} for tool calls with no `toolComponents` entry.
 * @param root0.dataComponents - Provider-specific data-part renderers.
 * @param root0.assistantName - Provider display name shown in the assistant turn's avatar header.
 * @param root0.assistantIcon - Codicon name for the assistant turn's avatar header chip.
 * @returns Rendered read-only thread element.
 */
export function StreamThread({
  messages,
  isRunning,
  toolComponents,
  toolFallback,
  dataComponents,
  assistantName = 'Assistant',
  assistantIcon = 'robot'
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
      tools: { by_name: toolComponents, Fallback: toolFallback ?? ToolFallbackPart },
      data: { by_name: { ...SHARED_DATA_COMPONENTS, ...dataComponents }, Fallback: UnregisteredDataPart }
    }),
    [toolComponents, toolFallback, dataComponents]
  );

  const UserMessage = useMemo(() => createUserMessage(contentComponents), [contentComponents]);
  const AssistantMessage = useMemo(
    () => createAssistantMessage(contentComponents, assistantName, assistantIcon),
    [contentComponents, assistantName, assistantIcon]
  );
  const SystemMessage = useMemo(() => createSystemMessage(contentComponents), [contentComponents]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="aui-thread-root">
        <ThreadPrimitive.Viewport className="aui-thread-viewport">
          <div className="aui-thread-content">
            <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage, SystemMessage }} />
          </div>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
