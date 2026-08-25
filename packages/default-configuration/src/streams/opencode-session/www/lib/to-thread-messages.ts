/**
 * Pure transform: flat OpenCode `TranscriptItem[]` → assistant-ui
 * `ThreadMessageLike[]`.
 *
 * Groups the flat, source-ordered item list from {@link renderOpencodeTranscript}
 * into role-labeled messages for the shared `StreamThread` (../../../../lib/aui).
 * Only `user_message` starts a new message; every other item kind contributes
 * to one of two alternating "assistant"-role run kinds:
 *
 * - **Content runs** carry `text`/`reasoning`/`tool-call` parts.
 * - **Service runs** carry the structural `data` parts (`raw`) and are marked
 *   `metadata: { custom: { service: true } }` so the shared `AssistantMessage`
 *   renders them header-less and full-width.
 *
 * Everything folds into an assistant-role run (never a `system`-role message)
 * because assistant-ui rejects any system message whose content is not exactly
 * one text part — the same hard constraint the codex converter documents.
 *
 * @summary OpenCode TranscriptItem[] → ThreadMessageLike[] converter for the shared StreamThread
 * @module streams/opencode-session/www/lib/to-thread-messages
 */

import { STREAM_DATA_PART_NAME, type ThreadMessageLike } from '../../../lib/aui/types';
import type { SessionStatus } from '../../../lib/SessionHeader';
import type { TranscriptItem } from './render-transcript';

/** Data payload for the `edited-files` data part (a `patch` part's change set). */
export interface OpencodeEditedFilesData {
  /** Full absolute paths of the files changed by this step. */
  files: string[];
}

/** Data payload for the `attachment` data part (a `file` part prompt attachment). */
export interface OpencodeAttachmentData {
  /** Display filename. */
  filename: string;
  /** MIME type, when OpenCode reports one. */
  mime?: string;
  /** `data:`/`file:` URL carrying or locating the content — never rendered raw. */
  url?: string;
}

/** The exact `data` part names this converter emits for OpenCode-specific rows. */
const OPENCODE_DATA_PART_NAME = {
  editedFiles: 'edited-files',
  attachment: 'attachment'
} as const;

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
 * Derives the sticky `SessionHeader`'s live status from stream liveness,
 * idle markers, and whether the rendered transcript contains any error signal.
 * While the stream is active and no `idle` line has arrived the status reads
 * `running`; an idle marker means the session's turn loop ended even if the
 * stream file has not been committed as inactive yet. An errored tool call
 * escalates to `error` regardless of liveness or idleness.
 * @param items - The rendered transcript items.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The session status for the header's indicator dot.
 */
export function deriveStatus(items: TranscriptItem[], isActive: boolean): SessionStatus {
  const isIdle = items.some((item) => item.kind === 'session_header' && item.idleAt !== undefined);
  if (isActive && !isIdle) {
    return 'running';
  }
  const hasError = items.some((item) => item.kind === 'tool_call' && item.severity === 'error');
  return hasError ? 'error' : 'success';
}

/**
 * Builds a tool-call part's `args` object from a `tool_call` item's
 * already-resolved `argumentsText`. Pretty-printed JSON-object text is parsed
 * back into a real object; anything else is wrapped under an `input` key so it
 * renders as one labeled row.
 * @param item - The tool_call transcript item.
 * @returns A plain object suitable for the tool-call part's `args`.
 */
function buildToolArgs(item: Extract<TranscriptItem, { kind: 'tool_call' }>): Record<string, unknown> {
  if (item.argumentsText.length === 0) {
    return {};
  }
  if (item.prettyPrinted) {
    try {
      const parsed: unknown = JSON.parse(item.argumentsText);
      return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : { input: parsed };
    } catch {
      // prettyPrinted text is valid JSON by construction, but stay defensive.
      return { input: item.argumentsText };
    }
  }
  return { input: item.argumentsText };
}

/** `data` part names classified as "service" (structural/system) content. */
const SERVICE_DATA_PART_NAMES = new Set<string>([
  STREAM_DATA_PART_NAME.raw,
  OPENCODE_DATA_PART_NAME.editedFiles,
  OPENCODE_DATA_PART_NAME.attachment
]);

/**
 * Categorizes a part for the content/service run split.
 * @param part - The part to categorize.
 * @returns The part's run category.
 */
function categorizePart(part: ThreadPart): 'content' | 'service' {
  if (part.type !== 'data') return 'content';
  return SERVICE_DATA_PART_NAMES.has(part.name) ? 'service' : 'content';
}

/**
 * Extracts a `TranscriptItem`'s `timestamp` field, when present, as a `Date`.
 * @param item - The transcript item.
 * @returns The item's timestamp, or `undefined` when absent.
 */
function itemTimestamp(item: TranscriptItem): Date | undefined {
  const ts = 'timestamp' in item ? item.timestamp : undefined;
  return ts !== undefined ? new Date(ts) : undefined;
}

/**
 * Converts the flat, source-ordered `TranscriptItem[]` from
 * `renderOpencodeTranscript` into `ThreadMessageLike[]` for the shared
 * `StreamThread`.
 * @param items - The flat transcript items.
 * @param isActive - Whether the underlying stream is still live.
 * @returns The grouped messages and the thread-level running flag.
 */
export function toThreadMessages(items: TranscriptItem[], isActive: boolean): ToThreadMessagesResult {
  const messages: ThreadMessageLike[] = [];
  let seq = 0;
  let anonToolSeq = 0;

  // The currently-open run (content or service) and its accumulated parts.
  let runParts: ThreadPart[] = [];
  let runIsService = false;
  let runCreatedAt: Date | undefined;
  let currentItemTimestamp: Date | undefined;

  /**
   * Ends the currently-open run, emitting one assembled message when non-empty.
   */
  const flushRun = (): void => {
    if (runParts.length === 0) {
      runCreatedAt = undefined;
      return;
    }
    seq += 1;
    messages.push({
      id: `assistant-${seq}`,
      role: 'assistant',
      status: { type: 'complete', reason: 'stop' },
      content: runParts,
      ...(runCreatedAt ? { createdAt: runCreatedAt } : {}),
      ...(runIsService ? { metadata: { custom: { service: true } } } : {})
    } as ThreadMessageLike);
    runParts = [];
    runCreatedAt = undefined;
  };

  /**
   * Appends a part to the currently-open run, splitting into a new run whenever
   * a part's category differs from the run currently open.
   * @param part - The part to append.
   */
  const pushPart = (part: ThreadPart): void => {
    const service = categorizePart(part) === 'service';
    if (runParts.length > 0 && service !== runIsService) {
      flushRun();
    }
    if (runParts.length === 0) {
      runIsService = service;
      runCreatedAt = currentItemTimestamp;
    }
    runParts.push(part);
  };

  for (const item of items) {
    currentItemTimestamp = itemTimestamp(item);
    switch (item.kind) {
      case 'session_header':
        // Rendered once, above the scrolling transcript, as the sticky shared
        // SessionHeader — not a thread message.
        break;

      case 'user_message': {
        flushRun();
        seq += 1;
        messages.push({
          id: `user-${seq}`,
          role: 'user',
          content: [{ type: 'text', text: item.text }],
          ...(currentItemTimestamp ? { createdAt: currentItemTimestamp } : {})
        } as ThreadMessageLike);
        break;
      }

      case 'assistant_message':
        pushPart({ type: 'text', text: item.text });
        break;

      case 'reasoning':
        pushPart({ type: 'reasoning', text: item.summaryText });
        break;

      case 'tool_call': {
        // Some payloads carry no call id; assistant-ui keys tool-call parts by
        // toolCallId and rejects duplicates, so synthesize a unique fallback.
        anonToolSeq += 1;
        pushPart({
          type: 'tool-call',
          toolCallId: item.callId.length > 0 ? item.callId : `anon-tool-${anonToolSeq}`,
          toolName: item.name,
          args: buildToolArgs(item),
          result: item.outputText,
          isError: item.severity === 'error'
        });
        break;
      }

      case 'edited_files':
        pushPart({
          type: 'data',
          name: OPENCODE_DATA_PART_NAME.editedFiles,
          data: { files: item.files } satisfies OpencodeEditedFilesData
        });
        break;

      case 'attachment':
        pushPart({
          type: 'data',
          name: OPENCODE_DATA_PART_NAME.attachment,
          data: { filename: item.filename, mime: item.mime, url: item.url } satisfies OpencodeAttachmentData
        });
        break;

      case 'unknown_item':
        pushPart({
          type: 'data',
          name: STREAM_DATA_PART_NAME.raw,
          data: { data: item.raw, label: 'Unrecognized item', severity: 'info' }
        });
        break;

      default:
        break;
    }
  }
  flushRun();

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
