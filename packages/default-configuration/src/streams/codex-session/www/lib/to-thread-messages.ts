/**
 * Pure transform: flat Codex `TranscriptItem[]` → assistant-ui `ThreadMessageLike[]`.
 *
 * Groups the flat, source-ordered item list from {@link renderCodexTranscript}
 * into role-labeled messages for the shared `StreamThread` (../../../../lib/aui).
 * Only `user_message` starts a new message; every other item kind — including
 * structural markers (turn boundaries, compaction, task lifecycle) and
 * unrecognized/error content — appends a content part to the enclosing
 * assistant run.
 *
 * That "everything folds into the assistant run" design is forced by a hard
 * assistant-ui runtime constraint, not a stylistic choice: `fromThreadMessageLike`
 * (`@assistant-ui/core`) throws `"System messages must have exactly one text
 * message part."` for any `role: 'system'` message whose content is not
 * exactly one `text` part — so a `data` part (boundary/raw/status-line/
 * error-line) can never live in a `system`-role message. `assistant` and
 * `user` messages both accept `data` parts freely; `assistant` is used here
 * since none of this content is user-authored. See this module's test file
 * for the runtime reproduction. This is a foundation gap, not something fixed
 * here (out of scope — see the migration report).
 *
 * `session_header` produces no message — it is rendered once, above the
 * scrolling transcript, as the sticky shared `SessionHeader` (see
 * `CodexExpandedView`), exactly as it was before this migration.
 *
 * Nothing is silently dropped: every `TranscriptItem` kind maps to at least
 * one part somewhere in the output (see the per-kind cases below for exactly
 * where each field lands).
 *
 * @summary Codex TranscriptItem[] → ThreadMessageLike[] converter for the shared StreamThread
 * @module streams/codex-session/www/lib/to-thread-messages
 */

import { STREAM_DATA_PART_NAME, type ThreadMessageLike } from '../../../lib/aui/types';
import { formatDuration } from '../../../lib/compact-facts';
import { truncate } from '../../../lib/markdown';
import type { SessionStatus } from '../../../lib/SessionHeader';
import type { TranscriptItem } from './render-transcript';

/** One content part of a ThreadMessageLike message being assembled by this converter. */
type ThreadPart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | {
      type: 'tool-call';
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
      result?: unknown;
      isError?: boolean;
    }
  | { type: 'data'; name: string; data: unknown };

/** Result of {@link toThreadMessages}: the grouped messages plus the thread-level running flag. */
export interface ToThreadMessagesResult {
  /** The full transcript as `ThreadMessageLike` messages, in display order. */
  messages: ThreadMessageLike[];
  /** Whether the session is still actively producing content. */
  isRunning: boolean;
}

/**
 * Derives the sticky `SessionHeader`'s live status from stream liveness and
 * whether the rendered transcript contains any error signal (a session-level
 * `error` event or a `tool_call` escalated by a shell/patch failure). While
 * the stream is still active the status always reads `running` — an interim
 * failure the session might still recover from should not flash the header
 * red before the stream has actually ended.
 * @param items - The rendered transcript items.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The session status for the header's indicator dot.
 */
export function deriveStatus(items: TranscriptItem[], isActive: boolean): SessionStatus {
  if (isActive) {
    return 'running';
  }
  const hasError = items.some(
    (item) => item.kind === 'error' || (item.kind === 'tool_call' && item.severity === 'error')
  );
  return hasError ? 'error' : 'success';
}

/**
 * Builds the visible placeholder note text for a dropped-image count (see
 * `../components/expanded/CodexDataParts`'s `image-note` data part).
 * @param count - The number of images to note (always ≥ 1).
 * @returns "Image" for a single image, "N Images" otherwise.
 */
function imageNoteText(count: number): string {
  return count === 1 ? 'Image' : `${count} Images`;
}

/**
 * Builds a tool-call part's `args` object from a `tool_call` item's already-
 * resolved `argumentsText`. Pretty-printed JSON-object text is parsed back
 * into a real object (so `ToolInputTable` renders it as key/value rows); any
 * other shape (raw shell command, patch text, non-object JSON) is wrapped
 * under its `argsLabel` key so it still renders as one labeled row rather
 * than being spread across the object as character indices.
 * @param item - The tool_call transcript item.
 * @returns A plain object suitable for the tool-call part's `args`.
 */
function buildToolArgs(item: Extract<TranscriptItem, { kind: 'tool_call' }>): Record<string, unknown> {
  if (item.argumentsText.length === 0) {
    return {};
  }
  const label = item.argsLabel ?? 'arguments';
  if (item.prettyPrinted) {
    try {
      const parsed: unknown = JSON.parse(item.argumentsText);
      return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : { [label]: parsed };
    } catch {
      // parseArguments already guarantees prettyPrinted text is valid JSON,
      // but this stays defensive rather than assuming that invariant holds.
      return { [label]: item.argumentsText };
    }
  }
  return { [label]: item.argumentsText };
}

/**
 * Builds a tool-call part's `result` from a `tool_call` item's paired output.
 * When the row is escalated (`severity === 'error'`), the concise
 * `errorLabel` (e.g. `'✗ exit 1'`) is prefixed to the full output text so it
 * stays visible in `ToolFallbackPart`'s collapsed-header preview (which shows
 * the full result text, not a separate error label, when `isError` is set).
 * @param item - The tool_call transcript item.
 * @returns The result string, or `undefined` when no output has arrived yet.
 */
function buildToolResult(item: Extract<TranscriptItem, { kind: 'tool_call' }>): string | undefined {
  if (!item.hasOutput || item.outputText === undefined) {
    return undefined;
  }
  if (item.severity === 'error' && item.errorLabel !== undefined) {
    return `${item.errorLabel}\n${item.outputText}`;
  }
  return item.outputText;
}

/**
 * Converts the flat, source-ordered `TranscriptItem[]` from
 * `renderCodexTranscript` into `ThreadMessageLike[]` for the shared
 * `StreamThread`.
 * @param items - The flat transcript items.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The grouped messages and the thread-level running flag.
 */
export function toThreadMessages(items: TranscriptItem[], isActive: boolean): ToThreadMessagesResult {
  const messages: ThreadMessageLike[] = [];
  let pendingAssistant: ThreadPart[] | null = null;
  let seq = 0;

  const flushAssistant = (): void => {
    if (pendingAssistant === null || pendingAssistant.length === 0) {
      pendingAssistant = null;
      return;
    }
    seq += 1;
    messages.push({
      id: `assistant-${seq}`,
      role: 'assistant',
      status: { type: 'complete', reason: 'stop' },
      content: pendingAssistant
    } as ThreadMessageLike);
    pendingAssistant = null;
  };

  const pushPart = (part: ThreadPart): void => {
    pendingAssistant ??= [];
    pendingAssistant.push(part);
  };

  for (const item of items) {
    switch (item.kind) {
      case 'session_header':
        // Rendered once, above the scrolling transcript, as the sticky shared
        // SessionHeader (see CodexExpandedView) — not a thread message.
        break;

      case 'user_message': {
        flushAssistant();
        seq += 1;
        const parts: ThreadPart[] = [{ type: 'text', text: item.text }];
        if (item.imageCount !== undefined) {
          parts.push({ type: 'data', name: 'image-note', data: { text: imageNoteText(item.imageCount) } });
        }
        messages.push({ id: `user-${seq}`, role: 'user', content: parts } as ThreadMessageLike);
        break;
      }

      case 'assistant_message': {
        pushPart({ type: 'text', text: item.text });
        if (item.imageCount !== undefined) {
          pushPart({ type: 'data', name: 'image-note', data: { text: imageNoteText(item.imageCount) } });
        }
        break;
      }

      case 'reasoning': {
        const hasContent = item.contentText !== undefined && item.contentText.length > 0;
        if (hasContent) {
          // Both summary and content are kept — nothing is dropped — but the
          // shared ReasoningPart has one fixed "Thinking…" header (no room for
          // a distinct summary preview like the old ReasoningAccordion), so
          // the summary (when present) becomes a lead-in line inside the body.
          const text =
            item.summaryText.length > 0 ? `${item.summaryText}\n\n${item.contentText as string}` : item.contentText;
          pushPart({ type: 'reasoning', text: text as string });
        } else if (item.summaryText.length > 0) {
          // Summary-only reasoning: one short line is not worth an accordion —
          // matches the old non-collapsible muted line via the shared status-line part.
          pushPart({ type: 'data', name: STREAM_DATA_PART_NAME.statusLine, data: { text: item.summaryText } });
        }
        break;
      }

      case 'tool_call': {
        pushPart({
          type: 'tool-call',
          toolCallId: item.callId,
          toolName: item.name,
          args: buildToolArgs(item),
          result: buildToolResult(item),
          isError: item.severity === 'error'
        });
        if (item.outputImageCount !== undefined) {
          pushPart({ type: 'data', name: 'image-note', data: { text: imageNoteText(item.outputImageCount) } });
        }
        break;
      }

      case 'orphan_output': {
        pushPart({
          type: 'data',
          name: STREAM_DATA_PART_NAME.raw,
          data: { data: item.outputText, label: `output (call ${item.callId})` }
        });
        if (item.imageCount !== undefined) {
          pushPart({ type: 'data', name: 'image-note', data: { text: imageNoteText(item.imageCount) } });
        }
        break;
      }

      case 'turn_boundary': {
        const label = item.turnId !== undefined ? `Turn ${item.turnId}` : 'Turn';
        pushPart({ type: 'data', name: STREAM_DATA_PART_NAME.boundary, data: { kind: 'turn', label } });
        break;
      }

      case 'compaction': {
        pushPart({
          type: 'data',
          name: STREAM_DATA_PART_NAME.boundary,
          data: { kind: 'compaction', label: 'Context compacted' }
        });
        if (item.message.length > 0) {
          pushPart({ type: 'text', text: item.message });
        }
        break;
      }

      case 'error':
        pushPart({ type: 'data', name: STREAM_DATA_PART_NAME.errorLine, data: { message: item.message } });
        break;

      case 'task_started':
        pushPart({ type: 'data', name: STREAM_DATA_PART_NAME.statusLine, data: { text: 'Task started' } });
        break;

      case 'task_complete': {
        const label =
          item.durationMs !== undefined ? `Turn complete · ${formatDuration(item.durationMs)}` : 'Turn complete';
        pushPart({ type: 'data', name: STREAM_DATA_PART_NAME.boundary, data: { kind: 'result', label } });
        if (item.lastAgentMessage !== undefined && item.lastAgentMessage.length > 0) {
          pushPart({
            type: 'data',
            name: STREAM_DATA_PART_NAME.statusLine,
            data: { text: truncate(item.lastAgentMessage, 140) }
          });
        }
        break;
      }

      case 'event_activity':
        pushPart({ type: 'data', name: 'event-activity', data: { label: item.label, detailText: item.detailText } });
        break;

      case 'unknown_item':
        pushPart({
          type: 'data',
          name: STREAM_DATA_PART_NAME.raw,
          data: { data: item.raw, label: 'Unrecognized item', severity: 'info' }
        });
        break;

      case 'malformed':
        pushPart({
          type: 'data',
          name: STREAM_DATA_PART_NAME.raw,
          data: { data: item.rawLine, label: 'Malformed line', severity: 'warning' }
        });
        break;

      default:
        break;
    }
  }
  flushAssistant();

  // The last assistant message reflects live stream status (drives the
  // shared ReasoningPart's auto-expand-while-running); every earlier
  // assistant message is complete.
  let lastAssistantIndex = -1;
  messages.forEach((message, index) => {
    if (message.role === 'assistant') {
      lastAssistantIndex = index;
    }
  });
  if (lastAssistantIndex !== -1 && isActive) {
    (messages[lastAssistantIndex] as { status?: unknown }).status = { type: 'running' };
  }

  return { messages, isRunning: isActive };
}
