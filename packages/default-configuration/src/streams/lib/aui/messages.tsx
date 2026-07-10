/**
 * Role-labeled message shell components for `ThreadPrimitive.Messages`.
 *
 * Each factory closes over one shared `MessagePrimitive.Content` components
 * registry (built once by {@link StreamThread}, ./StreamThread.tsx) and
 * returns a message component with no external props, as
 * `ThreadPrimitive.Messages` requires. All three reuse the existing turn
 * anatomy from ../turns.css: `.stream-turn`/`.stream-role-label`, plus
 * `--user`/`--assistant` variants already defined there. The `--system`
 * variant is new (aui.css) since no existing renderer has a "system role"
 * message shell today.
 *
 * @summary Factories for role-labeled User/Assistant/System message shells
 * @module streams/lib/aui/messages
 */

import { MessagePrimitive } from '@assistant-ui/react';
import type { ComponentProps, ComponentType } from 'react';

/**
 * The shared `MessagePrimitive.Content` components registry built by
 * `StreamThread`, derived from the component's own prop type rather than an
 * internal `@assistant-ui/core` namespace (not re-exported at the top level).
 */
export type StreamContentComponents = ComponentProps<typeof MessagePrimitive.Content>['components'];

/**
 * Builds the read-only "User" message shell: right-shifted, tinted turn.
 * @param components - Shared `MessagePrimitive.Content` components registry.
 * @returns A message component with no external props.
 */
export function createUserMessage(components: StreamContentComponents): ComponentType {
  return function UserMessage() {
    return (
      <MessagePrimitive.Root className="stream-turn stream-turn--user" data-turn="user">
        <div className="stream-role-label">User</div>
        <MessagePrimitive.Content components={components} />
      </MessagePrimitive.Root>
    );
  };
}

/**
 * Builds the read-only "Assistant" message shell: transparent, full-width turn.
 * @param components - Shared `MessagePrimitive.Content` components registry.
 * @returns A message component with no external props.
 */
export function createAssistantMessage(components: StreamContentComponents): ComponentType {
  return function AssistantMessage() {
    return (
      <MessagePrimitive.Root className="stream-turn stream-turn--assistant" data-turn="assistant">
        <div className="stream-role-label">Assistant</div>
        <MessagePrimitive.Content components={components} />
      </MessagePrimitive.Root>
    );
  };
}

/**
 * Builds the read-only "System" message shell: muted, full-width turn.
 * @param components - Shared `MessagePrimitive.Content` components registry.
 * @returns A message component with no external props.
 */
export function createSystemMessage(components: StreamContentComponents): ComponentType {
  return function SystemMessage() {
    return (
      <MessagePrimitive.Root className="stream-turn stream-turn--system" data-turn="system">
        <div className="stream-role-label">System</div>
        <MessagePrimitive.Content components={components} />
      </MessagePrimitive.Root>
    );
  };
}
