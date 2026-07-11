/**
 * Converts parsed claude-code-session `SessionMsg[]` into the shared
 * assistant-ui `ThreadMessageLike[]` contract (`../../../lib/aui`).
 *
 * Replaces the former `MessageRouter`/`AssistantTurn`/`UserTurn`/`SystemRouter`
 * render-tree with a pure data transform. **No `role: 'system'` message is
 * ever produced.** `@assistant-ui/core`'s `fromThreadMessageLike` throws
 * ("System messages must have exactly one text message part.") for any
 * `role: 'system'` message whose content isn't exactly one `text` part —
 * every structural/status row here (`boundary`, `status-line`, `error-line`,
 * `raw`, plus the renderer-local `cc-hook`/`cc-attachment`/`cc-ambient-group`/
 * `cc-away-summary`/`cc-supplemental`/`cc-session-start` parts) is a `data`
 * part, so none of them can ever be a system message's content. Instead,
 * only `user` messages
 * start a new `ThreadMessageLike`; every other message contributes to one of
 * two alternating "run" kinds, both `role: 'assistant'`:
 *
 * - **Content runs** carry `text`/`reasoning`/`tool-call` parts — genuine
 *   assistant output, rendered under the avatar header (`../../../lib/aui`'s
 *   `AssistantMessage`).
 * - **Service runs** carry every `data` part (`boundary`/`status-line`/
 *   `error-line`/`raw`/`cc-hook`/`cc-attachment`/`cc-ambient-group`/
 *   `cc-away-summary`/`cc-supplemental`/`cc-session-start`) — structural/system
 *   content — marked `metadata: { custom: { service: true } }` so the shared
 *   `AssistantMessage` renders it header-less and full-width instead of under
 *   a captioned "Assistant" turn.
 *
 * **Session-preamble gathering.** Every real transcript opens with a run of
 * service/structural debris — orphan `SessionStart` hooks, a `skill_listing`
 * content row, `Mode:`/`Title:` coordination lines — that used to render as
 * scattered top-level rows before the first real exchange. This converter
 * instead buffers every such part (see `gatheringSessionStart` / `emit` /
 * `closeSessionStartGathering`) until the first genuine content part arrives
 * (a real user turn's prose, or an assistant `text`/`reasoning`/`tool-call`),
 * then flushes the buffer as one `cc-session-start` disclosure — collapsed by
 * default, expanding to every original row unchanged — immediately before
 * that first content. `boundary` parts (the "Session started · N tools" turn
 * marker, plus `compaction`/`result`) and `cc-away-summary` are deliberately
 * excluded from this grouping and keep rendering exactly as before, even
 * while gathering is open; everything after the first content part is
 * likewise ungrouped, rendered exactly as it always was.
 *
 * Appending a part whose category differs from the currently-open run flushes
 * that run and starts a new one of the new category, preserving source order
 * exactly — every `data` part in this converter is service (there is no
 * content-adjacent data part here, unlike codex's `image-note`), so the
 * split is a simple binary check per part. `assistant` and `user` roles both
 * accept mixed `data`/`text`/`reasoning`/`tool-call` content freely at the
 * `ThreadMessageLike` type level; a real `user` turn's own content (prose
 * plus any coordination status-lines from the same source message) is built
 * as one message directly, since it never renders an avatar header anyway.
 *
 * Tool calls become `tool-call` parts on the owning content run; a
 * `tool_result` (or `tool_use_summary`) arriving later mutates that same part
 * object in place (`result`/`isError`) rather than emitting a new one — the
 * mutation works regardless of whether the run has flushed yet, since the
 * part object reference is shared. An orphan result (no matching `tool_use`
 * was ever registered) still renders, as its own resolved `tool-call` part
 * appended to the current content run.
 *
 * Every pre-pass below (`computeWillNestToolUseIds`, `computeToolResultCarrierIds`,
 * `buildSupplementalResultMap`, `buildToolAttachmentsMap`) is a direct port of
 * the equivalent computation in the retired `MessageRouter.tsx`, preserving
 * its order-independent orphan-vs-nested hook detection and isMeta
 * supplemental-content nesting rules exactly.
 *
 * @summary SessionMsg[] → ThreadMessageLike[] converter for the expanded transcript
 * @module lib/to-thread-messages
 */

import type { BoundaryData, ErrorLineData, RawData, StatusLineData, ThreadMessageLike } from '../../../lib/aui';
import { STREAM_DATA_PART_NAME } from '../../../lib/aui';
import { stripMarkup, truncate } from '../../../lib/markdown';
import { classifyAttachment } from './classify-attachment';
import { classifyCoordinationText, isCoordinationContent } from './classify-coordination';
import type {
  AssistantMsg,
  AttachmentPayload,
  AuthStatusMsg,
  ContentBlock,
  ProgressMsg,
  SessionMsg,
  SessionResultMsg,
  SystemAwaySummaryMsg,
  SystemCompactBoundaryMsg,
  SystemFilesPersistedMsg,
  SystemInitMsg,
  SystemMsg,
  SystemStatusMsg,
  SystemTaskNotificationMsg,
  ToolUseSummaryMsg,
  UserMsg
} from './parse-session';
import { summarizeTool } from './tool-summary';

/** Data payload for the `cc-hook` data part (an orphan hook row). */
export interface CcHookData {
  /** The orphan hook attachment to render standalone. */
  hook: AttachmentPayload;
}

/** Data payload for the `cc-attachment` data part (a single non-ambient attachment). */
export interface CcAttachmentData {
  /** The attachment payload to render. */
  attachment: AttachmentPayload;
}

/** Data payload for the `cc-ambient-group` data part (a run of ambient-tier attachments). */
export interface CcAmbientGroupData {
  /** The consecutive ambient attachments, in arrival order. */
  attachments: AttachmentPayload[];
}

/** Data payload for the `cc-away-summary` data part. */
export interface CcAwaySummaryData {
  /** Full away-summary content. */
  content: string;
}

/** Data payload for the `cc-supplemental` data part (orphaned isMeta injection content). */
export interface CcSupplementalData {
  /** The injected text content to disclose. */
  text: string;
}

/** One grouped part inside a `cc-session-start` disclosure — a data part's `name`/`data`, stripped of its `type` wrapper. */
export interface CcSessionStartEntry {
  /** The original data part's `name` (e.g. `status-line`, `cc-hook`, `cc-attachment`). */
  name: string;
  /** The original data part's payload. */
  data: unknown;
}

/**
 * Data payload for the `cc-session-start` data part — the collapsed-by-default
 * disclosure grouping every service/structural row that precedes the first
 * real conversation content (see {@link summarizeSessionStart} and the
 * gathering logic in {@link toThreadMessages}).
 */
export interface CcSessionStartData {
  /** Short derived summary shown in the collapsed header (e.g. "Session started · normal · 57 skills"). */
  summary: string;
  /** Every grouped row, in original arrival order, unchanged. */
  entries: CcSessionStartEntry[];
}

/** Structured `result` payload a `tool-call` part carries once resolved. */
export interface CcToolResult {
  /** Tool result text (or the tool_use_summary's summary), or null while unresolved. */
  output: string | null;
  /** Supplemental result from an isMeta injection (e.g. full skill instructions), replacing `output` when present. */
  supplementalResult?: string | null;
  /** Hook attachments that fired for this tool, nested via the shared HookSection. */
  hooks?: AttachmentPayload[];
}

/** Mutable shape of a `tool-call` content part, kept so later pairing can mutate it in place. */
interface MutableToolCallPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  // `unknown` here (not assistant-ui's stricter `ReadonlyJSONObject`) because tool
  // inputs flow straight from parsed JSONL as `Record<string, unknown>`; the one
  // cast this forces lives in `asContent` below, at the message-construction boundary.
  args: Record<string, unknown>;
  result?: CcToolResult;
  isError?: boolean;
}

/**
 * Explicit part union this converter constructs. Deliberately not derived via
 * indexed access on `ThreadMessageLike['content']` — that field's declared
 * type is `string | readonly Part[]`, and indexing a union distributes over
 * both branches, silently reintroducing plain `string` (iterated as
 * characters) as a spurious part type.
 */
type ThreadMessagePart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'data'; name: string; data: unknown }
  | MutableToolCallPart;

/** The six `hook_*` attachment subtypes that nest inside their owning tool (mirrors MessageRouter). */
const HOOK_ATTACHMENT_TYPES = new Set<string>([
  'hook_success',
  'hook_additional_context',
  'hook_system_message',
  'hook_non_blocking_error',
  'hook_blocking_error',
  'hook_cancelled'
]);

/** Overall session status, driving both `isRunning` and the SessionHeader badge. */
export type SessionStatus = 'running' | 'success' | 'error';

/** Result of converting a parsed session transcript to assistant-ui messages. */
export interface ConvertedSession {
  /** The full transcript as ThreadMessageLike messages, in display order. */
  messages: ThreadMessageLike[];
  /** Whether the session is still actively producing content (no `result` message seen). */
  isRunning: boolean;
  /** Model id from the `system init` message, or '' if not yet seen. */
  model: string;
  /** Working directory from the `system init` message, or '' if not yet seen. */
  cwd: string;
  /** Overall session status. */
  status: SessionStatus;
}

// ============================================================================
// Data-part construction helpers
// ============================================================================

function boundaryPart(kind: BoundaryData['kind'], label: string): ThreadMessagePart {
  return { type: 'data', name: STREAM_DATA_PART_NAME.boundary, data: { kind, label } satisfies BoundaryData };
}

function statusLinePart(text: string): ThreadMessagePart {
  return { type: 'data', name: STREAM_DATA_PART_NAME.statusLine, data: { text } satisfies StatusLineData };
}

function errorLinePart(message: string, detail?: unknown): ThreadMessagePart {
  return { type: 'data', name: STREAM_DATA_PART_NAME.errorLine, data: { message, detail } satisfies ErrorLineData };
}

function rawPart(data: unknown, label: string, severity?: RawData['severity']): ThreadMessagePart {
  return { type: 'data', name: STREAM_DATA_PART_NAME.raw, data: { data, label, severity } satisfies RawData };
}

function hookPart(hook: AttachmentPayload): ThreadMessagePart {
  return { type: 'data', name: 'cc-hook', data: { hook } satisfies CcHookData };
}

function attachmentPart(attachment: AttachmentPayload): ThreadMessagePart {
  return { type: 'data', name: 'cc-attachment', data: { attachment } satisfies CcAttachmentData };
}

function ambientGroupPart(attachments: AttachmentPayload[]): ThreadMessagePart {
  return { type: 'data', name: 'cc-ambient-group', data: { attachments } satisfies CcAmbientGroupData };
}

function awaySummaryPart(content: string): ThreadMessagePart {
  return { type: 'data', name: 'cc-away-summary', data: { content } satisfies CcAwaySummaryData };
}

function supplementalPart(text: string): ThreadMessagePart {
  return { type: 'data', name: 'cc-supplemental', data: { text } satisfies CcSupplementalData };
}

function sessionStartPart(summary: string, entries: CcSessionStartEntry[]): ThreadMessagePart {
  return { type: 'data', name: 'cc-session-start', data: { summary, entries } satisfies CcSessionStartData };
}

/**
 * Derives the collapsed `cc-session-start` disclosure's one-line summary from
 * what it actually contains — short and honest rather than a generic "Session
 * setup" label. Reads the buffered entries for a `Mode: …` status-line (the
 * session's mode), a `skill_listing` attachment's `skillCount`, and a count of
 * `cc-hook` entries; each is appended only when present, so a session with no
 * hooks (say) doesn't show a stray "0 hooks".
 * @param entries - The buffered leading-run entries (see {@link toThreadMessages}'s gathering logic).
 * @returns The derived summary line, always starting with "Session started".
 */
function summarizeSessionStart(entries: CcSessionStartEntry[]): string {
  let mode: string | undefined;
  let skillCount: number | undefined;
  let hookCount = 0;
  for (const entry of entries) {
    if (entry.name === STREAM_DATA_PART_NAME.statusLine) {
      const match = /^Mode: (.+)$/.exec((entry.data as StatusLineData).text);
      if (match?.[1]) mode = match[1];
    } else if (entry.name === 'cc-hook') {
      hookCount += 1;
    } else if (entry.name === 'cc-attachment') {
      const attachment = (entry.data as CcAttachmentData).attachment;
      if (attachment.type === 'skill_listing') {
        const count = (attachment as Extract<AttachmentPayload, { type: 'skill_listing' }>).skillCount;
        if (typeof count === 'number') skillCount = count;
      }
    }
  }
  const segments = ['Session started'];
  if (mode) segments.push(mode);
  if (skillCount !== undefined) segments.push(`${skillCount} skill${skillCount === 1 ? '' : 's'}`);
  if (hookCount > 0) segments.push(`${hookCount} hook${hookCount === 1 ? '' : 's'}`);
  return segments.join(' · ');
}

/**
 * Extracts a message's source `timestamp` field, when present, as a `Date`.
 * Not modeled on any `SessionMsg` interface (the raw JSONL carries it on
 * every line, but it is orthogonal to each message kind's own shape) — read
 * defensively via the same `Record<string, unknown>` cast the converter
 * already uses for other loosely-typed fields (`isMeta`, `sourceToolUseID`).
 * @param msg - The parsed session message.
 * @returns The message's timestamp, or `undefined` when absent/malformed.
 */
function extractTimestamp(msg: SessionMsg): Date | undefined {
  const raw = msg as Record<string, unknown>;
  const ts = raw['timestamp'];
  return typeof ts === 'string' ? new Date(ts) : undefined;
}

/**
 * True when any of a tool's hooks is a blocking error, escalating the tool-call to error severity.
 * @param hooks - Hook attachments that fired for the tool, if any.
 * @returns Whether one of the hooks is a `hook_blocking_error`.
 */
function hasBlockingHook(hooks: AttachmentPayload[] | undefined): boolean {
  return hooks?.some((h) => h.type === 'hook_blocking_error') ?? false;
}

/**
 * Casts our locally-typed part array/tuple to `ThreadMessageLike['content']`.
 * Every element structurally matches assistant-ui's expected part shapes; the
 * one true mismatch is a tool-call's `args` (`Record<string, unknown>`
 * against the stricter `ReadonlyJSONObject`) — an intentional, narrow escape
 * hatch rather than a structural one.
 * @param parts - The parts to attach as a message's `content`.
 * @returns The same array, typed as `ThreadMessageLike['content']`.
 */
function asContent(parts: ThreadMessagePart[]): ThreadMessageLike['content'] {
  return parts as unknown as ThreadMessageLike['content'];
}

// ============================================================================
// Pre-passes (ported from the retired MessageRouter.tsx)
// ============================================================================

/**
 * See `computeWillNestToolUseIds` in the retired MessageRouter.tsx for full rationale.
 * @param messages - All parsed session messages.
 * @returns Set of toolUseIDs that pair into a resolved tool-call part.
 */
function computeWillNestToolUseIds(messages: SessionMsg[]): Set<string> {
  const willNest = new Set<string>();
  const registeredToolUseIds = new Set<string>();

  for (const msg of messages) {
    if (msg.type === 'assistant') {
      const aMsg = msg as AssistantMsg;
      for (const block of aMsg.message?.content ?? []) {
        const b = block as ContentBlock;
        if (b.type === 'tool_use') registeredToolUseIds.add(b.id);
      }
    } else if (msg.type === 'user') {
      if ((msg as Record<string, unknown>)['isMeta'] === true) continue;
      const content = (msg as UserMsg).message?.content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        const b = block as ContentBlock;
        if (b.type === 'tool_result' && b.tool_use_id) willNest.add(b.tool_use_id);
      }
    } else if (msg.type === 'tool_use_summary') {
      const tusMsg = msg as ToolUseSummaryMsg;
      for (const id of tusMsg.preceding_tool_use_ids ?? []) {
        if (registeredToolUseIds.has(id)) willNest.add(id);
      }
    }
  }

  return willNest;
}

/**
 * See `computeToolResultCarrierIds` in the retired MessageRouter.tsx for full rationale.
 * @param messages - All parsed session messages.
 * @returns Set of tool_use_ids carried by a real (non-isMeta) `tool_result` block.
 */
function computeToolResultCarrierIds(messages: SessionMsg[]): Set<string> {
  const carriers = new Set<string>();
  for (const msg of messages) {
    if (msg.type !== 'user') continue;
    if ((msg as unknown as Record<string, unknown>)['isMeta'] === true) continue;
    const content = (msg as UserMsg).message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      const b = block as ContentBlock;
      if (b.type === 'tool_result' && b.tool_use_id) carriers.add(b.tool_use_id);
    }
  }
  return carriers;
}

/**
 * Extracts the joined text content of an `isMeta` user message.
 * @param raw - The raw message object.
 * @returns Joined text content, or `''` when none.
 */
function extractIsMetaText(raw: Record<string, unknown>): string {
  const msgContent = (raw['message'] as { content?: unknown } | undefined)?.content;
  const textParts: string[] = [];
  if (typeof msgContent === 'string') {
    textParts.push(msgContent);
  } else if (Array.isArray(msgContent)) {
    for (const block of msgContent) {
      const b = block as ContentBlock;
      if (b.type === 'text' && typeof b.text === 'string') textParts.push(b.text);
    }
  }
  return textParts.join('\n\n');
}

function buildSupplementalResultMap(messages: SessionMsg[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const msg of messages) {
    const raw = msg as Record<string, unknown>;
    if (raw['isMeta'] === true && raw['type'] === 'user' && raw['sourceToolUseID']) {
      const toolUseId = String(raw['sourceToolUseID']);
      const text = extractIsMetaText(raw);
      if (text) map.set(toolUseId, text);
    }
  }
  return map;
}

function buildToolAttachmentsMap(messages: SessionMsg[]): Map<string, AttachmentPayload[]> {
  const map = new Map<string, AttachmentPayload[]>();
  for (const msg of messages) {
    if (msg.type !== 'attachment') continue;
    const attachment = (msg as Extract<SessionMsg, { type: 'attachment' }>).attachment;
    if (!HOOK_ATTACHMENT_TYPES.has(attachment.type)) continue;
    const toolUseID = (attachment as { toolUseID?: string }).toolUseID;
    if (!toolUseID) continue;
    const existing = map.get(toolUseID);
    if (existing) existing.push(attachment);
    else map.set(toolUseID, [attachment]);
  }
  return map;
}

/**
 * Joins a `tool_result` block's content (string or content-block array) into display text.
 * @param block - The `tool_result` content block.
 * @returns Joined display text for the result.
 */
function resultTextOf(block: Extract<ContentBlock, { type: 'tool_result' }>): string {
  if (typeof block.content === 'string') return block.content;
  if (Array.isArray(block.content)) {
    return block.content
      .filter((rb) => (rb as { type: string }).type === 'text')
      .map((rb) => (rb as { text?: string }).text ?? '')
      .join('\n');
  }
  return '';
}

// ============================================================================
// Converter
// ============================================================================

/**
 * Converts parsed claude-code-session messages into `ThreadMessageLike[]` for
 * the shared `StreamThread`. Nothing is silently dropped: unrecognized shapes
 * fall through to the shared `raw` data part with a labeled severity.
 * @param messages - Parsed (optionally already `mergeConsecutiveMessages`-folded) session messages.
 * @returns The converted thread messages plus derived session status/model/cwd.
 */
export function toThreadMessages(messages: SessionMsg[]): ConvertedSession {
  const supplementalResultMap = buildSupplementalResultMap(messages);
  const toolResultCarrierIds = computeToolResultCarrierIds(messages);
  const toolAttachmentsMap = buildToolAttachmentsMap(messages);
  const willNestToolUseIds = computeWillNestToolUseIds(messages);
  const isRunning = !messages.some((m) => m.type === 'result');

  const threadMessages: ThreadMessageLike[] = [];
  const pendingToolCalls = new Map<string, MutableToolCallPart>();
  let model = '';
  let cwd = '';
  let status: SessionStatus = 'running';
  let ambientBuffer: AttachmentPayload[] = [];
  let idCounter = 0;

  // The currently-open run (content or service — see module doc) and its
  // accumulated parts/createdAt, plus the triggering message's timestamp for
  // the loop iteration currently in progress.
  let runParts: ThreadMessagePart[] = [];
  let runIsService = false;
  let runCreatedAt: Date | undefined;
  let currentMsgTimestamp: Date | undefined;

  // Session-preamble gathering (issue: scattered orphan rows at the top of
  // every transcript). While `gatheringSessionStart` is true, every
  // service/structural data part *other than* a `boundary` or
  // `cc-away-summary` (both excluded from grouping — see module doc) is
  // buffered here instead of emitted directly. The first genuine content part
  // (text/reasoning/tool-call, from either a real user turn or assistant
  // output) flushes the buffer as one `cc-session-start` disclosure and
  // permanently closes gathering, so nothing after real content starts is
  // ever grouped.
  let gatheringSessionStart = true;
  let sessionStartBuffer: ThreadMessagePart[] = [];

  // Coordination status-lines ("Mode: …", "Title: …", and classifyCoordinationText
  // output) repeat around nearly every exchange; suppress an exact-duplicate
  // consecutive value per coordination kind (keyed by the text before ':'),
  // always rendering the first occurrence and any changed value.
  const lastCoordinationValue = new Map<string, string>();

  const nextId = (): string => `cc-msg-${idCounter++}`;

  /**
   * Reduces a coordination line to its display text, or `null` when it's an
   * exact repeat of the last value seen for its kind (see module-level dedupe map).
   * @param line - The rendered coordination line text.
   * @returns The line, or `null` if it's a suppressed duplicate.
   */
  function dedupeCoordinationLine(line: string): string | null {
    const colonIdx = line.indexOf(':');
    const key = colonIdx >= 0 ? line.slice(0, colonIdx) : line;
    if (lastCoordinationValue.get(key) === line) return null;
    lastCoordinationValue.set(key, line);
    return line;
  }

  /**
   * Flushes the currently-open run into a `ThreadMessageLike`, if it has any content.
   * @param final - Whether this is the transcript's terminal flush, whose
   *   status reflects overall `isRunning`. Every interior flush (triggered by
   *   an upcoming `user` message, or a run-category switch) is always
   *   `complete`, since more content follows it.
   */
  const flushRun = (final: boolean): void => {
    if (runParts.length === 0) {
      runCreatedAt = undefined;
      return;
    }
    threadMessages.push({
      id: nextId(),
      role: 'assistant',
      content: asContent(runParts),
      status: final && isRunning ? { type: 'running' } : { type: 'complete', reason: 'stop' },
      ...(runCreatedAt ? { createdAt: runCreatedAt } : {}),
      ...(runIsService ? { metadata: { custom: { service: true } } } : {})
    });
    runParts = [];
    runCreatedAt = undefined;
  };

  /**
   * Appends parts to the currently-open run, splitting into a new run
   * whenever a part's category (content vs. service — every `data` part is
   * service, everything else is content) differs from the run currently
   * open, so structural/system content never shares a message with genuine
   * assistant output (see module doc).
   * @param parts - Parts to append, in order.
   */
  const appendAssistant = (...parts: ThreadMessagePart[]): void => {
    for (const part of parts) {
      const service = part.type === 'data';
      if (runParts.length > 0 && service !== runIsService) {
        flushRun(false);
      }
      if (runParts.length === 0) {
        runIsService = service;
        runCreatedAt = currentMsgTimestamp;
      }
      runParts.push(part);
    }
  };

  /**
   * True for a `boundary` or `cc-away-summary` data part — the two kinds of
   * structural marker explicitly excluded from session-preamble grouping (see
   * module doc): they keep rendering exactly as they do today, even while
   * gathering is open.
   * @param part - The part to test.
   * @returns Whether this part is a boundary or away-summary marker.
   */
  function isUngroupedStructuralPart(part: ThreadMessagePart): boolean {
    return part.type === 'data' && (part.name === STREAM_DATA_PART_NAME.boundary || part.name === 'cc-away-summary');
  }

  /**
   * Flushes the buffered leading-run parts (see {@link gatheringSessionStart})
   * into one `cc-session-start` disclosure part, deriving its summary from
   * what it contains. No-op when nothing was buffered.
   */
  const flushSessionStartBuffer = (): void => {
    if (sessionStartBuffer.length === 0) return;
    const entries: CcSessionStartEntry[] = sessionStartBuffer.map((part) => {
      // Every buffered part is a `data` part — `isUngroupedStructuralPart`
      // and the content check in `emit` route anything else away before it
      // ever reaches this buffer.
      const dataPart = part as Extract<ThreadMessagePart, { type: 'data' }>;
      return { name: dataPart.name, data: dataPart.data };
    });
    const summary = summarizeSessionStart(entries);
    sessionStartBuffer = [];
    appendAssistant(sessionStartPart(summary, entries));
  };

  /**
   * The single entry point every message-processing branch below uses in
   * place of `appendAssistant` directly, so the session-preamble grouping
   * (see module doc) is transparent to the rest of the converter: once
   * gathering has closed (or for the ungrouped boundary/away-summary kinds),
   * this behaves exactly like `appendAssistant`; while gathering is still
   * open, every other data part is buffered instead, and the first content
   * part flushes that buffer before itself being appended.
   * @param parts - Parts to emit, in order.
   */
  /**
   * Ends session-preamble gathering (idempotent), flushing whatever was
   * buffered first. Called both by `emit` (for a genuine content part on an
   * assistant run) and directly by the `user` case (whose real-turn message
   * is built and pushed to `threadMessages` without going through `emit` at
   * all — see module doc on user turns being built directly).
   */
  const closeSessionStartGathering = (): void => {
    if (!gatheringSessionStart) return;
    flushSessionStartBuffer();
    gatheringSessionStart = false;
  };

  const emit = (...parts: ThreadMessagePart[]): void => {
    for (const part of parts) {
      if (!gatheringSessionStart || isUngroupedStructuralPart(part)) {
        appendAssistant(part);
        continue;
      }
      if (part.type !== 'data') {
        // Genuine content (text/reasoning/tool-call): the session preamble is over.
        closeSessionStartGathering();
        appendAssistant(part);
        continue;
      }
      sessionStartBuffer.push(part);
    }
  };

  const flushAmbient = (): void => {
    if (ambientBuffer.length === 0) return;
    emit(ambientGroupPart(ambientBuffer));
    ambientBuffer = [];
  };

  /**
   * Flushes both the ambient buffer and the currently-open run.
   * @param final - Whether this is the transcript's terminal flush (see {@link flushRun}).
   */
  const flushAssistant = (final: boolean): void => {
    flushAmbient();
    flushRun(final);
  };

  /**
   * Resolves a pending tool-call by mutating its part in place, or — when no
   * tool_use was ever registered for this id — appends a standalone resolved
   * tool-call to the current assistant run (an "orphan" result).
   * @param toolUseId - The tool_use id (or preceding_tool_use_id) this result pairs with.
   * @param resultText - The result/summary text to attach.
   */
  const finalizeToolResult = (toolUseId: string, resultText: string): void => {
    const supplemental = supplementalResultMap.get(toolUseId) ?? null;
    const hooks = toolAttachmentsMap.get(toolUseId);
    const pending = pendingToolCalls.get(toolUseId);
    const result: CcToolResult = { output: resultText, supplementalResult: supplemental, hooks };
    if (pending) {
      pending.result = result;
      pending.isError = hasBlockingHook(hooks);
      pendingToolCalls.delete(toolUseId);
      return;
    }
    emit({
      type: 'tool-call',
      toolCallId: `orphan-${toolUseId}`,
      toolName: 'tool',
      args: {},
      result,
      isError: hasBlockingHook(hooks)
    });
  };

  for (const msg of messages) {
    currentMsgTimestamp = extractTimestamp(msg);
    switch (msg.type) {
      case 'system': {
        const sysMsg = msg as SystemMsg;
        switch (sysMsg.subtype) {
          case 'init': {
            const initMsg = sysMsg as SystemInitMsg;
            model = initMsg.model ?? '';
            cwd = initMsg.cwd ?? '';
            const toolCount = initMsg.tools?.length ?? 0;
            flushAmbient();
            emit(boundaryPart('turn', `Session started · ${toolCount} tool${toolCount !== 1 ? 's' : ''}`));
            break;
          }
          case 'status': {
            const statusMsg = sysMsg as SystemStatusMsg;
            if (statusMsg.status === 'compacting') {
              flushAmbient();
              emit(statusLinePart('Compacting context…'));
            }
            break;
          }
          case 'compact_boundary': {
            const cbMsg = sysMsg as SystemCompactBoundaryMsg;
            const trigger = cbMsg.compact_metadata?.trigger ?? 'auto';
            const preTokens = cbMsg.compact_metadata?.pre_tokens ?? 0;
            flushAmbient();
            emit(boundaryPart('compaction', `Context compacted (${trigger}) · ${preTokens.toLocaleString()} tokens`));
            break;
          }
          case 'hook_started':
          case 'hook_progress':
          case 'hook_response':
            // Internal hook-lifecycle noise, suppressed today (mirrors the
            // retired MessageRouter's top-level filter before these subtypes
            // ever reached SystemRouter).
            break;
          case 'files_persisted': {
            const fpMsg = sysMsg as SystemFilesPersistedMsg;
            const saved = fpMsg.files?.length ?? 0;
            const failed = fpMsg.failed?.length ?? 0;
            const text =
              failed > 0 ? `Files persisted: ${saved} saved, ${failed} failed` : `Files persisted: ${saved} saved`;
            flushAmbient();
            emit(statusLinePart(text));
            break;
          }
          case 'task_notification': {
            const tnMsg = sysMsg as SystemTaskNotificationMsg;
            flushAmbient();
            emit(statusLinePart(`Task ${tnMsg.task_id ?? ''}: ${tnMsg.status ?? ''} — ${tnMsg.summary ?? ''}`));
            break;
          }
          case 'away_summary': {
            const awayMsg = sysMsg as SystemAwaySummaryMsg;
            flushAmbient();
            emit(awaySummaryPart(awayMsg.content));
            break;
          }
          case 'turn_duration': {
            // Parsed for the compact path as TurnDurationEvent (parse-session.ts);
            // the expanded/converter path has no dedicated type for it, so its
            // extra fields are read defensively here, matching the `mode`/
            // `ai-title` top-level cases below.
            const tdMsg = sysMsg as { durationMs?: number; messageCount?: number };
            const seconds = ((tdMsg.durationMs ?? 0) / 1000).toFixed(1);
            const count = tdMsg.messageCount ?? 0;
            flushAmbient();
            emit(statusLinePart(`Turn · ${seconds}s · ${count} message${count === 1 ? '' : 's'}`));
            break;
          }
          default:
            flushAmbient();
            emit(rawPart(sysMsg, `Unrecognized system event · ${sysMsg.subtype}`));
        }
        break;
      }

      case 'user': {
        const raw = msg as Record<string, unknown>;
        if (raw['isMeta'] === true) {
          const sourceToolUseID = raw['sourceToolUseID'];
          const willBeNested = typeof sourceToolUseID === 'string' && toolResultCarrierIds.has(sourceToolUseID);
          if (!willBeNested) {
            const text = extractIsMetaText(raw);
            if (text) {
              flushAmbient();
              emit(supplementalPart(text));
            }
          }
          break;
        }

        const userMsg = msg as UserMsg;
        const content = userMsg.message?.content;

        if (Array.isArray(content)) {
          for (const block of content) {
            const b = block as ContentBlock;
            if (b.type === 'tool_result' && b.tool_use_id) {
              finalizeToolResult(b.tool_use_id, resultTextOf(b));
            }
          }
        }

        const hasToolResults =
          Array.isArray(content) && content.some((b) => (b as ContentBlock).type === 'tool_result');
        if (!hasToolResults) {
          const textBlocks: string[] =
            typeof content === 'string'
              ? [content]
              : Array.isArray(content)
                ? content
                    .filter(
                      (b): b is Extract<ContentBlock, { type: 'text' }> =>
                        (b as ContentBlock).type === 'text' &&
                        typeof (b as ContentBlock & { text?: string }).text === 'string'
                    )
                    .map((b) => b.text)
                : [];

          const parts: ThreadMessagePart[] = [];
          const humanParts: string[] = [];
          for (const raw2 of textBlocks) {
            if (isCoordinationContent(raw2)) {
              for (const line of classifyCoordinationText(raw2)) {
                const deduped = dedupeCoordinationLine(line);
                if (deduped) parts.push(statusLinePart(deduped));
              }
            } else {
              humanParts.push(raw2);
            }
          }
          if (humanParts.length > 0) parts.push({ type: 'text', text: humanParts.join('\n\n') });

          if (parts.length > 0) {
            // A real user turn closes out whatever run preceded it —
            // user/assistant messages alternate as distinct ThreadMessageLikes;
            // only the structural/status content in between folds into runs.
            // A user turn carrying genuine human prose is exactly the "first
            // real conversation content" the session-preamble gathering waits
            // for (see module doc) — a coordination-only user turn (no
            // humanParts) is not, so it doesn't close gathering.
            if (humanParts.length > 0) closeSessionStartGathering();
            flushAssistant(false);
            threadMessages.push({
              id: nextId(),
              role: 'user',
              content: asContent(parts),
              ...(currentMsgTimestamp ? { createdAt: currentMsgTimestamp } : {})
            });
          }
        }
        break;
      }

      case 'assistant': {
        const aMsg = msg as AssistantMsg;
        if (aMsg.error) {
          flushAmbient();
          emit(errorLinePart(`API Error: ${String(aMsg.error)}`));
          break;
        }

        const blocks = aMsg.message?.content ?? [];
        const parts: ThreadMessagePart[] = [];
        for (const block of blocks) {
          const b = block as ContentBlock;
          if (b.type === 'tool_use') {
            const part: MutableToolCallPart = {
              type: 'tool-call',
              toolCallId: b.id,
              toolName: b.name || 'tool',
              args: b.input ?? {}
            };
            parts.push(part);
            pendingToolCalls.set(b.id, part);
          } else if (b.type === 'text' && b.text) {
            if (isCoordinationContent(b.text)) {
              for (const line of classifyCoordinationText(b.text)) {
                const deduped = dedupeCoordinationLine(line);
                if (deduped) parts.push(statusLinePart(deduped));
              }
            } else {
              parts.push({ type: 'text', text: b.text });
            }
          } else if (b.type === 'thinking' && b.thinking) {
            parts.push({ type: 'reasoning', text: b.thinking });
          }
        }

        if (parts.length > 0) {
          // Folds into the current assistant run rather than starting a new
          // message — consecutive assistant SessionMsgs (and any structural
          // content between them) share one ThreadMessageLike (see module doc).
          flushAmbient();
          emit(...parts);
        }
        break;
      }

      case 'tool_use_summary': {
        const tusMsg = msg as ToolUseSummaryMsg;
        const summary = tusMsg.summary ?? '';
        const ids = tusMsg.preceding_tool_use_ids ?? [];
        let rendered = false;
        for (const id of ids) {
          if (pendingToolCalls.has(id)) {
            finalizeToolResult(id, summary);
            rendered = true;
          }
        }
        if (!rendered && summary) {
          emit({
            type: 'tool-call',
            toolCallId: `tus-${nextId()}`,
            toolName: 'tool',
            args: {},
            result: { output: summary }
          });
        }
        break;
      }

      case 'result': {
        const rMsg = msg as SessionResultMsg;
        const isSuccess = rMsg.subtype === 'success';
        status = isSuccess ? 'success' : 'error';
        const durationS = Math.round((rMsg.duration_ms ?? 0) / 1000);
        const costStr = rMsg.total_cost_usd != null ? ` · $${Number(rMsg.total_cost_usd).toFixed(4)}` : '';
        const label = isSuccess
          ? `Session complete · ${rMsg.num_turns ?? 0} turns · ${durationS}s${costStr}`
          : `Session error (${rMsg.subtype ?? 'unknown'}) · ${rMsg.num_turns ?? 0} turns · ${durationS}s`;
        flushAmbient();
        emit(boundaryPart('result', label));
        break;
      }

      case 'auth_status': {
        const authMsg = msg as AuthStatusMsg;
        flushAmbient();
        if (authMsg.error) emit(errorLinePart(`Auth error: ${authMsg.error}`));
        else if (authMsg.isAuthenticating) emit(statusLinePart('Authenticating…'));
        break;
      }

      case 'attachment': {
        const attachment = (msg as Extract<SessionMsg, { type: 'attachment' }>).attachment;

        if (HOOK_ATTACHMENT_TYPES.has(attachment.type)) {
          const toolUseID = (attachment as { toolUseID?: string }).toolUseID;
          if (toolUseID && willNestToolUseIds.has(toolUseID)) break;
          flushAmbient();
          emit(hookPart(attachment));
          break;
        }

        const descriptor = classifyAttachment(attachment);
        if (descriptor.hidden) break;

        if (descriptor.scope === 'turn' && descriptor.tier === 'ambient') {
          ambientBuffer.push(attachment);
          break;
        }

        flushAmbient();
        emit(attachmentPart(attachment));
        break;
      }

      case 'mode': {
        const modeMsg = msg as { mode?: string };
        if (modeMsg.mode) {
          const line = dedupeCoordinationLine(`Mode: ${modeMsg.mode}`);
          if (line) {
            flushAmbient();
            emit(statusLinePart(line));
          }
        }
        break;
      }

      case 'ai-title': {
        const titleMsg = msg as { aiTitle?: string };
        if (titleMsg.aiTitle) {
          const line = dedupeCoordinationLine(`Title: "${titleMsg.aiTitle}"`);
          if (line) {
            flushAmbient();
            emit(statusLinePart(line));
          }
        }
        break;
      }

      case 'queue-operation': {
        const queueMsg = msg as { operation?: string; content?: string };
        flushAmbient();
        if (queueMsg.operation === 'enqueue') {
          const preview = truncate(stripMarkup(queueMsg.content ?? '').trim(), 60);
          emit(statusLinePart(preview ? `Queued: ${preview}` : 'Queued'));
        } else if (queueMsg.operation === 'remove' || queueMsg.operation === 'dequeue') {
          emit(statusLinePart(`Queue: ${queueMsg.operation}`));
        } else {
          emit(rawPart(msg, `Unrecognized queue operation · ${String(queueMsg.operation)}`));
        }
        break;
      }

      case 'worktree-state': {
        const worktreeMsg = msg as { worktreeSession?: { worktreeName?: string; worktreePath?: string } };
        const name = worktreeMsg.worktreeSession?.worktreeName;
        flushAmbient();
        emit(statusLinePart(name ? `Worktree: ${name}` : 'Worktree state'));
        break;
      }

      case 'bridge-session': {
        const bridgeMsg = msg as { bridgeSessionId?: string };
        flushAmbient();
        emit(
          statusLinePart(bridgeMsg.bridgeSessionId ? `Bridge session ${bridgeMsg.bridgeSessionId}` : 'Bridge session')
        );
        break;
      }

      case 'progress': {
        const pMsg = msg as ProgressMsg;
        if (pMsg.data?.type !== 'agent_progress') break;
        const content = pMsg.data.content ?? [];
        const lines: ThreadMessagePart[] = [];
        for (const block of content) {
          if (block.type !== 'tool_use') continue;
          const name = block.name || 'tool';
          const summary = summarizeTool(name, block.input);
          lines.push(statusLinePart(summary ? `↳ ${name} ${summary}` : `↳ ${name}`));
        }
        if (lines.length > 0) {
          flushAmbient();
          emit(...lines);
        }
        break;
      }

      default:
        flushAmbient();
        emit(rawPart(msg, `Unrecognized message · ${msg.type}`));
    }
  }

  // A transcript that is nothing but preamble (no real content ever arrives)
  // still must not drop its buffered rows. `flushAmbient` must run first —
  // any still-pending ambient buffer becomes (via `emit`) one more buffered
  // entry — before `flushSessionStartBuffer` drains the buffer for good;
  // `flushRun` last finalizes whatever run either flush left open.
  flushAmbient();
  flushSessionStartBuffer();
  flushRun(true);

  return { messages: threadMessages, isRunning, model, cwd, status };
}
