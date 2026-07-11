/**
 * Pure transform: flat Codex `TranscriptItem[]` → assistant-ui `ThreadMessageLike[]`.
 *
 * Groups the flat, source-ordered item list from {@link renderCodexTranscript}
 * into role-labeled messages for the shared `StreamThread` (../../../../lib/aui).
 * Only `user_message` starts a new message; every other item kind contributes
 * to one of two alternating "run" kinds, both `role: 'assistant'`:
 *
 * - **Content runs** carry `text`/`reasoning`/`tool-call` parts (assistant
 *   replies, reasoning, tool calls) plus the content-adjacent `image-note`
 *   data part — `image-note` is a "passthrough" part that never triggers a
 *   run split on its own; it simply joins whatever run is already open
 *   (typically the tool-call or orphan-output part it annotates).
 * - **Service runs** carry every other `data` part (`boundary`/`status-line`/
 *   `error-line`/`raw`/`event-activity`/`turn-time`/`cx-session-start`) —
 *   structural/system content — marked `metadata: { custom: { service: true } }`
 *   so the shared `AssistantMessage` renders it header-less and full-width
 *   instead of under a captioned "Assistant" turn.
 *
 * **Session-preamble gathering.** Codex injects a leading run of instructions
 * content ahead of the user's own first prompt — a developer-role
 * `<permissions instructions>` blob, a user-role AGENTS.md instructions block
 * concatenated with an `<environment_context>` block, and any plugin-injected
 * developer instructions in between — that used to render as full-weight
 * turns (a giant assistant bubble, a giant user bubble) dominating the first
 * screens. This converter instead buffers every such item (see
 * `gatheringPreamble` / `closeSessionStartGathering` inside
 * {@link toThreadMessages}) until the first genuine content arrives — a real
 * user prompt (`looksLikeUserPreambleText` returning `false`), a non-developer
 * `assistant_message`, any `reasoning` carrying a summary/content, or any
 * `tool_call` — then flushes the buffer as one `cx-session-start` disclosure
 * (collapsed by default, expanding to every original block unchanged)
 * immediately before that first content. `session_header` and every
 * boundary/lifecycle kind (`turn_boundary`, `compaction`, `task_started`,
 * `task_complete`) are never gathered and keep rendering exactly as they
 * always have, even while gathering is open; everything after the first
 * content item is likewise ungrouped, rendered exactly as it always was.
 *
 * That everything (besides `user_message`) folds into one of these two
 * `role: 'assistant'` run kinds — rather than a `system`-role message for the
 * service half — is forced by a hard assistant-ui runtime constraint, not a
 * stylistic choice: `fromThreadMessageLike` (`@assistant-ui/core`) throws
 * `"System messages must have exactly one text message part."` for any
 * `role: 'system'` message whose content is not exactly one `text` part — so
 * a `data` part (boundary/raw/status-line/error-line/etc.) can never live in
 * a `system`-role message. See this module's test file for the runtime
 * reproduction. This is a foundation gap, not something fixed here (out of
 * scope — see the migration report).
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
import { stripMarkup, truncate } from '../../../lib/markdown';
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

/** `data` part names classified as "service" (structural/system) content — everything else `data`-typed is content-adjacent (`image-note`) or handled per-kind below. */
const SERVICE_DATA_PART_NAMES = new Set<string>([
  STREAM_DATA_PART_NAME.boundary,
  STREAM_DATA_PART_NAME.statusLine,
  STREAM_DATA_PART_NAME.errorLine,
  STREAM_DATA_PART_NAME.raw,
  'event-activity',
  'turn-time',
  'cx-session-start'
]);

/**
 * One grouped entry inside a `cx-session-start` disclosure (see
 * {@link toThreadMessages}'s session-preamble gathering) — a labeled
 * preamble text block, unchanged from the source item's full text.
 */
export interface CxSessionStartEntry {
  /** Human label for this block (e.g. "Instructions", "Developer instructions"). */
  label: string;
  /** The original item's full text, unchanged (still rendered as markdown). */
  text: string;
  /** Count of images the source item carried, if any (rendered as an image-note line). */
  imageCount?: number;
}

/**
 * Data payload for the `cx-session-start` data part — the collapsed-by-default
 * disclosure grouping the leading run of Codex-injected preamble content
 * (permissions/AGENTS.md/environment-context/plugin instructions) that
 * precedes the first real conversation content (see {@link summarizeCxSessionStart}
 * and the gathering logic in {@link toThreadMessages}).
 */
export interface CxSessionStartData {
  /** Short derived summary shown in the collapsed header (e.g. "Session started · gpt-5.5 · instructions · environment"). */
  summary: string;
  /** Every grouped entry, in original arrival order, unchanged. */
  entries: CxSessionStartEntry[];
}

/**
 * Detects a Codex-injected preamble text blob carried by a `user_message`
 * item — the combined AGENTS.md "user instructions" + `<environment_context>`
 * block Codex always sends as an early `user`-role `response_item`, ahead of
 * the user's own first real prompt. A `user_message` item is otherwise
 * indistinguishable from a genuine user turn, so this is the only mechanical
 * signal available for it (unlike `assistant_message`, whose source `role`
 * survives onto the item — see {@link TranscriptItem}'s `assistant_message.role`).
 * @param text - The `user_message` item's text.
 * @returns Whether this looks like an injected instructions/environment blob rather than genuine user prose.
 */
function looksLikeUserPreambleText(text: string): boolean {
  return /^# AGENTS\.md instructions for /.test(text) || text.includes('<environment_context>');
}

/**
 * Derives the collapsed `cx-session-start` disclosure's one-line summary from
 * what it actually contains — short and honest rather than a generic "Session
 * setup" label. Each segment is appended only when present, so a session with
 * no developer-authored blocks (say) doesn't show a stray "0 developer notes".
 * @param entries - The buffered leading-run entries (see {@link toThreadMessages}'s gathering logic).
 * @param model - The session's model, when already known (from `session_header`), or `undefined`.
 * @returns The derived summary line, always starting with "Session started".
 */
function summarizeCxSessionStart(entries: CxSessionStartEntry[], model: string | undefined): string {
  const segments = ['Session started'];
  if (model) segments.push(model);
  if (entries.some((entry) => /^# AGENTS\.md instructions for /.test(entry.text))) segments.push('instructions');
  if (entries.some((entry) => entry.text.includes('<environment_context>'))) segments.push('environment');
  const developerCount = entries.filter((entry) => entry.label === 'Developer instructions').length;
  if (developerCount > 0) segments.push(`${developerCount} developer note${developerCount === 1 ? '' : 's'}`);
  return segments.join(' · ');
}

/**
 * Categorizes a part for the content/service run split (see module doc).
 * `image-note` is "passthrough": it never triggers a run split on its own,
 * it just joins whichever run is already open (the tool-call/orphan-output
 * part it annotates).
 * @param part - The part to categorize.
 * @returns The part's run category.
 */
function categorizePart(part: ThreadPart): 'content' | 'service' | 'passthrough' {
  if (part.type !== 'data') return 'content';
  if (part.name === 'image-note') return 'passthrough';
  return SERVICE_DATA_PART_NAMES.has(part.name) ? 'service' : 'content';
}

/**
 * Extracts a `TranscriptItem`'s `timestamp` field, when present, as a `Date`.
 * Not every variant carries `timestamp` (`malformed` does not), hence the `in` guard.
 * @param item - The transcript item.
 * @returns The item's timestamp, or `undefined` when absent.
 */
function itemTimestamp(item: TranscriptItem): Date | undefined {
  const ts = 'timestamp' in item ? item.timestamp : undefined;
  return ts !== undefined ? new Date(ts) : undefined;
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
  let seq = 0;
  let anonToolSeq = 0;

  // The currently-open run (content or service — see module doc) and its
  // accumulated parts/createdAt, plus the triggering item's timestamp for the
  // loop iteration currently in progress.
  let runParts: ThreadPart[] = [];
  let runIsService = false;
  let runCreatedAt: Date | undefined;
  let currentItemTimestamp: Date | undefined;

  // Session-preamble gathering (issue: the leading `<permissions
  // instructions>`/AGENTS.md/environment-context/plugin-instructions blobs
  // Codex injects ahead of the user's own first prompt used to render as
  // full-weight turns dominating the first screens). While
  // `gatheringPreamble` is true, every developer-authored `assistant_message`
  // (see `TranscriptItem`'s `assistant_message.role`) and every
  // instructions/environment-flavored `user_message` (see
  // `looksLikeUserPreambleText`) is buffered here instead of emitted. The
  // first genuine content — a real user prompt, any `reasoning` carrying a
  // summary/content, any `tool_call`, or a non-developer `assistant_message`
  // — flushes the buffer as one `cx-session-start` disclosure and
  // permanently closes gathering. `session_header` (rendered separately, see
  // `CodexExpandedView`) and every boundary/lifecycle kind (`turn_boundary`,
  // `compaction`, `task_started`, `task_complete`) are never gathered and
  // keep rendering exactly as they always have, even while gathering is open.
  let gatheringPreamble = true;
  let preambleBuffer: CxSessionStartEntry[] = [];
  let preambleModel: string | undefined;

  /**
   * Ends session-preamble gathering (idempotent), flushing whatever was
   * buffered first as one `cx-session-start` data part on the currently-open
   * run (via `pushPart`, so it participates in the normal content/service run
   * split like any other data part).
   */
  const closeSessionStartGathering = (): void => {
    if (!gatheringPreamble) return;
    gatheringPreamble = false;
    if (preambleBuffer.length === 0) return;
    const summary = summarizeCxSessionStart(preambleBuffer, preambleModel);
    const entries = preambleBuffer;
    preambleBuffer = [];
    pushPart({ type: 'data', name: 'cx-session-start', data: { summary, entries } satisfies CxSessionStartData });
  };

  const flushAssistant = (): void => {
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
   * Appends a part to the currently-open run, splitting into a new run
   * whenever a content/service part's category differs from the run
   * currently open (see module doc); a `passthrough` part (`image-note`)
   * never triggers a split — it just joins whatever run is already open.
   * @param part - The part to append.
   */
  const pushPart = (part: ThreadPart): void => {
    const category = categorizePart(part);
    if (category !== 'passthrough' && runParts.length > 0) {
      const service = category === 'service';
      if (service !== runIsService) flushAssistant();
    }
    if (runParts.length === 0) {
      runIsService = category === 'service';
      runCreatedAt = currentItemTimestamp;
    }
    runParts.push(part);
  };

  for (const item of items) {
    currentItemTimestamp = itemTimestamp(item);
    switch (item.kind) {
      case 'session_header':
        // Rendered once, above the scrolling transcript, as the sticky shared
        // SessionHeader (see CodexExpandedView) — not a thread message. Its
        // model (once back-patched by renderCodexTranscript) doubles as the
        // cx-session-start disclosure's summary model segment.
        preambleModel = item.model;
        break;

      case 'user_message': {
        if (gatheringPreamble) {
          if (looksLikeUserPreambleText(item.text)) {
            preambleBuffer.push({ label: 'Instructions', text: item.text, imageCount: item.imageCount });
            break;
          }
          // A genuine user prompt is exactly the "first real conversation
          // content" gathering waits for (see module doc) — close it before
          // this turn's own flush/push so the disclosure lands immediately
          // ahead of it, in source order.
          closeSessionStartGathering();
        }
        flushAssistant();
        seq += 1;
        const parts: ThreadPart[] = [{ type: 'text', text: item.text }];
        if (item.imageCount !== undefined) {
          parts.push({ type: 'data', name: 'image-note', data: { text: imageNoteText(item.imageCount) } });
        }
        messages.push({
          id: `user-${seq}`,
          role: 'user',
          content: parts,
          ...(currentItemTimestamp ? { createdAt: currentItemTimestamp } : {})
        } as ThreadMessageLike);
        break;
      }

      case 'assistant_message': {
        if (gatheringPreamble && item.role === 'developer') {
          preambleBuffer.push({ label: 'Developer instructions', text: item.text, imageCount: item.imageCount });
          break;
        }
        if (gatheringPreamble) closeSessionStartGathering();
        pushPart({ type: 'text', text: item.text });
        if (item.imageCount !== undefined) {
          pushPart({ type: 'data', name: 'image-note', data: { text: imageNoteText(item.imageCount) } });
        }
        break;
      }

      case 'reasoning': {
        const hasContent = item.contentText !== undefined && item.contentText.length > 0;
        if (gatheringPreamble && (hasContent || item.summaryText.length > 0)) {
          // Real reasoning never precedes the preamble in practice, but is
          // unambiguously genuine assistant content when it does occur — closes
          // gathering exactly like a real user prompt or non-developer reply.
          closeSessionStartGathering();
        }
        if (hasContent) {
          // Both summary and content are kept — nothing is dropped. The
          // shared ReasoningPart shows a muted preview of the text's first
          // line while collapsed (its header stays a fixed "Thinking…"), so
          // prepending the summary here doubles as that preview's source —
          // deliberately not deduplicated against contentText's own first
          // line (a `summary === firstLine` check is its own source of
          // fragility for a value that's already free-text), and the
          // fallback of "summary, blank line, then content" reads fine even
          // on the rare turn where the two happen to echo each other.
          const text =
            item.summaryText.length > 0 ? `${item.summaryText}\n\n${item.contentText as string}` : item.contentText;
          pushPart({ type: 'reasoning', text: text as string });
        } else if (item.summaryText.length > 0) {
          // Summary-only reasoning: one short line is not worth an accordion —
          // matches the old non-collapsible muted line via the shared status-line part.
          // `StatusLine` renders its text as plain, unparsed text (no markdown
          // engine) — stripMarkup (the same helper ReasoningPart's collapsed
          // preview uses) keeps a summary written with markdown emphasis from
          // showing its literal `**bold**`/backtick syntax here.
          pushPart({
            type: 'data',
            name: STREAM_DATA_PART_NAME.statusLine,
            data: { text: stripMarkup(item.summaryText) }
          });
        }
        break;
      }

      case 'tool_call': {
        if (gatheringPreamble) closeSessionStartGathering();
        // Some rollout payloads (e.g. web-search calls) carry no call_id, which
        // render-transcript surfaces as ''. assistant-ui keys tool-call parts by
        // toolCallId and rejects duplicates, so synthesize a unique fallback.
        anonToolSeq += 1;
        pushPart({
          type: 'tool-call',
          toolCallId: item.callId.length > 0 ? item.callId : `anon-tool-${anonToolSeq}`,
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
        // A quiet bare hairline (no visible label) rather than a "Turn
        // 019e467f"-style caption — the full UUID (e.g.
        // `019e467f-e069-7250-bd28-0cb46c0b5778`) is still available via the
        // boundary's hover tooltip.
        pushPart({
          type: 'data',
          name: STREAM_DATA_PART_NAME.boundary,
          data: { kind: 'turn', label: '', tooltip: item.turnId }
        });
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
        // A quiet bare hairline (matches the turn_boundary idiom — see that
        // case above) rather than a loud uppercase-labeled divider: a task
        // starts on every user submission, so a full section boundary here
        // repeats once per turn. The full "Task started" label (plus the
        // task/turn id, when present) is still available via the boundary's
        // hover tooltip.
        pushPart({
          type: 'data',
          name: STREAM_DATA_PART_NAME.boundary,
          data: { kind: 'turn', label: '', tooltip: item.turnId ? `Task started · ${item.turnId}` : 'Task started' }
        });
        break;

      case 'task_complete': {
        // A quiet right-aligned muted duration line (iMessage-timestamp
        // register) replaces the old "TURN COMPLETE · 32S"-style result boundary.
        const text = item.durationMs !== undefined ? formatDuration(item.durationMs) : 'Turn complete';
        pushPart({ type: 'data', name: 'turn-time', data: { text } });
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
  // A transcript that is nothing but preamble (gathering never closed because
  // no genuine content ever arrived) still must not drop its buffered rows.
  closeSessionStartGathering();
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
