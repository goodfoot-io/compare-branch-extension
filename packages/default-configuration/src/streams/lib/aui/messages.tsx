/**
 * Role-labeled message shell components for `ThreadPrimitive.Messages`.
 *
 * Each factory closes over one shared `MessagePrimitive.Content` components
 * registry (built once by {@link StreamThread}, ./StreamThread.tsx) and
 * returns a message component with no external props, as
 * `ThreadPrimitive.Messages` requires. All three reuse the existing turn
 * anatomy from ../turns.css: `.stream-turn` plus `--user`/`--assistant`/
 * `--system` variants.
 *
 * Role presentation follows mainstream chat idioms (ChatGPT/Claude.ai/VS Code
 * Chat) rather than an explicit text label per turn:
 * - User turns drop the "User" caption entirely — the right-aligned tint
 *   already conveys the role.
 * - Assistant turns get a compact avatar-style header (codicon chip + provider
 *   name + time), read via `useAuiState` (the current, non-deprecated
 *   assistant-ui state hook — `useMessage` is deprecated in favor of it) on
 *   the per-message scope `MessagePrimitive.Root` establishes. The header is
 *   suppressed for "service" messages — structural/system content a converter
 *   marks via `metadata.custom.service` (see each converter's module doc for
 *   the content/service run-splitting rationale) — with a defensive fallback
 *   that also suppresses it whenever a message carries no text/reasoning/
 *   tool-call part at all, regardless of whether the flag was set.
 * - System turns (never actually produced by either converter — see their
 *   module docs — but kept as a defensive shell) still show a plain label.
 *
 * @summary Factories for User/Assistant/System message shells
 * @module streams/lib/aui/messages
 */

import { MessagePrimitive, useAuiState } from '@assistant-ui/react';
import type { ComponentProps, ComponentType } from 'react';

/**
 * The shared `MessagePrimitive.Content` components registry built by
 * `StreamThread`, derived from the component's own prop type rather than an
 * internal `@assistant-ui/core` namespace (not re-exported at the top level).
 */
export type StreamContentComponents = ComponentProps<typeof MessagePrimitive.Content>['components'];

/** Message content part `type`s that count as "real" assistant content — anything else is structural/service. */
const RENDERABLE_PART_TYPES = new Set(['text', 'reasoning', 'tool-call']);

/**
 * Zero-pads a number to two digits (locale-free, unlike `toLocaleTimeString`).
 * @param n - The number to pad (expected 0–59).
 * @returns The two-digit zero-padded string.
 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Formats a turn's `createdAt` as a locale-free zero-padded `HH:MM`, matching
 * the muted iMessage-timestamp register used throughout the transcript.
 * @param date - The message's `createdAt`.
 * @returns The formatted `HH:MM` time.
 */
function formatTurnTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/**
 * Builds the read-only "User" message shell: right-shifted, tinted turn, with
 * no role caption (the tint alone conveys the role) and a tiny muted
 * timestamp when the message carries a `createdAt`.
 * @param components - Shared `MessagePrimitive.Content` components registry.
 * @returns A message component with no external props.
 */
export function createUserMessage(components: StreamContentComponents): ComponentType {
  return function UserMessage() {
    const createdAt = useAuiState((s) => s.message.createdAt);
    return (
      <MessagePrimitive.Root className="stream-turn stream-turn--user" data-turn="user">
        {createdAt !== undefined && <div className="stream-turn__time">{formatTurnTime(createdAt)}</div>}
        <MessagePrimitive.Content components={components} />
      </MessagePrimitive.Root>
    );
  };
}

/**
 * Builds the read-only "Assistant" message shell: transparent, full-width
 * turn with a compact avatar-style header (codicon chip + provider name +
 * time) — shown only for genuine content messages, never for structural/
 * service ones (see module doc).
 * @param components - Shared `MessagePrimitive.Content` components registry.
 * @param assistantName - Provider display name shown in the header (e.g. "Claude Code", "Codex").
 * @param assistantIcon - Codicon name for the header's chip glyph (e.g. "robot").
 * @returns A message component with no external props.
 */
export function createAssistantMessage(
  components: StreamContentComponents,
  assistantName: string,
  assistantIcon: string
): ComponentType {
  return function AssistantMessage() {
    const isServiceFlag = useAuiState((s) => s.message.metadata.custom['service'] === true);
    const content = useAuiState((s) => s.message.content);
    const createdAt = useAuiState((s) => s.message.createdAt);

    const hasRenderableContent = content.some((part) => RENDERABLE_PART_TYPES.has(part.type));
    const showHeader = !isServiceFlag && hasRenderableContent;

    return (
      <MessagePrimitive.Root
        className={`stream-turn stream-turn--assistant${showHeader ? '' : ' stream-turn--service'}`}
        data-turn="assistant"
      >
        {showHeader && (
          <div className="stream-assistant-header">
            <span className="stream-assistant-header__chip">
              <span className={`codicon codicon-${assistantIcon}`} aria-hidden="true" />
            </span>
            <span className="stream-assistant-header__name">{assistantName}</span>
            {createdAt !== undefined && (
              <span className="stream-assistant-header__time">{formatTurnTime(createdAt)}</span>
            )}
          </div>
        )}
        <MessagePrimitive.Content components={components} />
      </MessagePrimitive.Root>
    );
  };
}

/**
 * Builds the read-only "System" message shell: muted, full-width turn.
 * Defensive only — neither stream converter ever produces a `role: 'system'`
 * message (see their module docs for the runtime constraint that forces
 * every structural row into a `role: 'assistant'` message instead).
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
