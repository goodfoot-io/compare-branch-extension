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
 * scattered top-level rows before (and even after, straddling) the first
 * real exchange. This converter instead buffers every such part (see
 * `TranscriptBuilder`'s preamble-gathering state and its `emit`) until the
 * first genuine assistant content part arrives (`text`/`reasoning`/
 * `tool-call`), then flushes the buffer as one `cc-session-start` disclosure
 * — collapsed by default, expanding to every original row unchanged.
 * A genuine user turn never closes gathering (it renders in place, as its
 * own ungrouped message, but service parts arriving after it keep buffering
 * into the same eventual group) and the flushed disclosure is always
 * spliced in at the position of the very first user turn seen while
 * gathering was open (captured by `TranscriptBuilder.startUserTurn`) — or
 * appended normally when no user turn ever preceded the close — so
 * session-setup material always reads as one block at the very top of the transcript, never at the
 * point where gathering happened to close. `boundary` parts (the "Session
 * started · N tools" turn marker, plus `compaction`/`result`) and
 * `cc-away-summary` are deliberately excluded from this grouping and keep
 * rendering exactly as before, even while gathering is open; everything
 * after the first assistant content part is likewise ungrouped, rendered
 * exactly as it always was.
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
 * Conversion itself dispatches per message subtype through the
 * `MESSAGE_HANDLERS` lookup table (and `SYSTEM_SUBTYPE_HANDLERS` under
 * `system`), each small handler reading its message and driving the shared
 * {@link TranscriptBuilder} — the state machine owning id allocation, run
 * buffering, preamble gathering, ambient grouping, and coordination dedupe.
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
 * session's mode), a `Title: "…"` status-line (surfaced verbatim — a session
 * title is high-value orientation, so it's quoted directly rather than
 * reduced to a generic "title" placeholder), a `skill_listing` attachment's
 * `skillCount`, and a count of `cc-hook` entries; each is appended only when
 * present, so a session with no hooks (say) doesn't show a stray "0 hooks".
 * @param entries - The buffered leading-run entries (see {@link toThreadMessages}'s gathering logic).
 * @returns The derived summary line, always starting with "Session started".
 */
function summarizeSessionStart(entries: CcSessionStartEntry[]): string {
  let mode: string | undefined;
  let title: string | undefined;
  let skillCount: number | undefined;
  let hookCount = 0;
  for (const entry of entries) {
    if (entry.name === STREAM_DATA_PART_NAME.statusLine) {
      const text = (entry.data as StatusLineData).text;
      const modeMatch = /^Mode: (.+)$/.exec(text);
      if (modeMatch?.[1]) mode = modeMatch[1];
      const titleMatch = /^Title: "(.+)"$/.exec(text);
      if (titleMatch?.[1]) title = titleMatch[1];
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
  if (title) segments.push(`"${title}"`);
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
// Output state machine (run + session-preamble buffering)
// ============================================================================

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
 * The converter's entire output side as one small state machine, replacing
 * the former twelve closure-captured mutable locals: sequential id
 * allocation, the alternating content/service runs, session-preamble
 * gathering, the ambient-attachment buffer, and coordination-line dedupe.
 *
 * **Runs** (see module doc): every part reaches the open run through
 * {@link emit}, which appends via {@link appendToRun} — flushing and
 * restarting the run whenever a part's category (content vs. service)
 * differs from the run open at that moment. {@link flush} drains the ambient
 * buffer and then the run; `final` marks the transcript's terminal flush,
 * whose run status reflects overall `isRunning` (interior flushes are always
 * `complete`, since more content follows).
 *
 * **Session-preamble gathering** (see module doc): while gathering is open,
 * {@link emit} buffers every service/structural data part other than a
 * `boundary` or `cc-away-summary` instead of appending it; the first genuine
 * content part closes gathering ({@link closeGathering}), flushing the
 * buffer as one `cc-session-start` disclosure spliced at
 * {@link sessionStartInsertIndex} — captured once by {@link startUserTurn},
 * the first time a real user turn is pushed while gathering is still open,
 * so the disclosure lands immediately before that turn rather than wherever
 * gathering actually closed (a user turn itself never closes gathering).
 */
class TranscriptBuilder {
  /** Messages flushed so far, in display order (becomes `ConvertedSession.messages`). */
  readonly messages: ThreadMessageLike[] = [];

  private readonly running: boolean;
  private idCounter = 0;
  private msgTimestamp: Date | undefined;

  // The currently-open run (content or service — see class doc) and its
  // accumulated parts/createdAt.
  private runParts: ThreadMessagePart[] = [];
  private runIsService = false;
  private runCreatedAt: Date | undefined;

  // Session-preamble gathering state (see class doc).
  private gatheringSessionStart = true;
  private sessionStartBuffer: ThreadMessagePart[] = [];
  private sessionStartInsertIndex: number | undefined;

  // Turn-scoped ambient attachments awaiting collapse into one cc-ambient-group.
  private ambientBuffer: AttachmentPayload[] = [];

  // Coordination status-lines ("Mode: …", "Title: …") repeat around nearly
  // every exchange; dedupe state is keyed by the text before ':'.
  private readonly lastCoordinationValue = new Map<string, string>();

  constructor(running: boolean) {
    this.running = running;
  }

  /**
   * Records the source timestamp of the message currently being converted —
   * stamped onto whatever run or user turn that message opens.
   * @param timestamp - The message's source timestamp, if any.
   */
  beginMessage(timestamp: Date | undefined): void {
    this.msgTimestamp = timestamp;
  }

  /**
   * Allocates the transcript's sequential message ids (`cc-msg-0`, `cc-msg-1`, …).
   * @returns The next sequential message id.
   */
  nextId(): string {
    return `cc-msg-${this.idCounter++}`;
  }
  /**
   * Reduces a coordination line to its display text, or `null` when it's an
   * exact repeat of the last value seen for its kind — always rendering the
   * first occurrence and any changed value.
   * @param line - The rendered coordination line text.
   * @returns The line, or `null` if it's a suppressed duplicate.
   */
  dedupeCoordinationLine(line: string): string | null {
    const colonIdx = line.indexOf(':');
    const key = colonIdx >= 0 ? line.slice(0, colonIdx) : line;
    if (this.lastCoordinationValue.get(key) === line) return null;
    this.lastCoordinationValue.set(key, line);
    return line;
  }

  /**
   * Buffers a turn-scoped ambient attachment until the next flush collapses
   * consecutive ones into a single `cc-ambient-group` part.
   * @param attachment - The ambient-tier attachment to buffer.
   */
  bufferAmbient(attachment: AttachmentPayload): void {
    this.ambientBuffer.push(attachment);
  }

  /**
   * Emits any buffered ambient attachments as one `cc-ambient-group` data
   * part. While session-preamble gathering is open the group itself is
   * buffered (via {@link emit}) rather than appended to a run directly.
   */
  flushAmbient(): void {
    if (this.ambientBuffer.length === 0) return;
    this.emit(ambientGroupPart(this.ambientBuffer));
    this.ambientBuffer = [];
  }

  /**
   * The single entry point every per-subtype handler uses in place of
   * appending to a run directly, so session-preamble grouping (see class
   * doc) is transparent to them: once gathering has closed (or for the
   * ungrouped boundary/away-summary kinds), behaves exactly like
   * {@link appendToRun}; while gathering is still open, every other data
   * part is buffered instead, and the first content part flushes that buffer
   * before itself being appended.
   * @param parts - Parts to emit, in order.
   */
  emit(...parts: ThreadMessagePart[]): void {
    for (const part of parts) {
      if (!this.gatheringSessionStart || isUngroupedStructuralPart(part)) {
        this.appendToRun(part);
        continue;
      }
      if (part.type !== 'data') {
        // Genuine content (text/reasoning/tool-call): the session preamble is over.
        this.closeGathering();
        this.appendToRun(part);
        continue;
      }
      this.sessionStartBuffer.push(part);
    }
  }

  /**
   * Pushes a real user turn built from `parts`: closes out whatever run
   * preceded it (user/assistant turns alternate as distinct messages; only
   * structural/status content folds into runs) and appends the turn as its
   * own ungrouped message. Unlike the closing rule for assistant content, a
   * user turn never closes session-preamble gathering — but the first user
   * turn pushed while gathering is still open marks where the eventual
   * `cc-session-start` disclosure belongs, captured *after* the flush so it
   * points just before this user message, not before whatever run that
   * flush just pushed ahead of it.
   * @param parts - The turn's parts, already coordination-deduped and joined.
   */
  startUserTurn(parts: ThreadMessagePart[]): void {
    this.flush(false);
    if (this.gatheringSessionStart && this.sessionStartInsertIndex === undefined) {
      this.sessionStartInsertIndex = this.messages.length;
    }
    this.messages.push({
      id: this.nextId(),
      role: 'user',
      content: asContent(parts),
      ...(this.msgTimestamp ? { createdAt: this.msgTimestamp } : {})
    });
  }

  /**
   * Flushes both the ambient buffer and the currently-open run.
   * @param final - Whether this is the transcript's terminal flush (see the class doc).
   */
  flush(final: boolean): void {
    this.flushAmbient();
    this.flushRun(final);
  }

  /**
   * Terminal flush: ambient first (while preamble gathering is open its
   * group becomes one more buffered entry), then the buffered preamble rows
   * drain into their `cc-session-start` disclosure, then whatever run either
   * left open finalizes.
   */
  finish(): void {
    this.flushAmbient();
    this.flushSessionStartBuffer();
    this.flushRun(true);
  }

  /**
   * Appends parts to the currently-open run, splitting into a new run
   * whenever a part's category (content vs. service — every `data` part is
   * service, everything else is content) differs from the run currently
   * open, so structural/system content never shares a message with genuine
   * assistant output (see module doc).
   * @param parts - Parts to append, in order.
   */
  private appendToRun(...parts: ThreadMessagePart[]): void {
    for (const part of parts) {
      const service = part.type === 'data';
      if (this.runParts.length > 0 && service !== this.runIsService) {
        this.flushRun(false);
      }
      if (this.runParts.length === 0) {
        this.runIsService = service;
        this.runCreatedAt = this.msgTimestamp;
      }
      this.runParts.push(part);
    }
  }

  /**
   * Flushes the currently-open run into a `ThreadMessageLike`, if it has any content.
   * @param final - Whether this is the transcript's terminal flush, whose
   *   status reflects overall `isRunning`.
   */
  private flushRun(final: boolean): void {
    if (this.runParts.length === 0) {
      this.runCreatedAt = undefined;
      return;
    }
    this.messages.push({
      id: this.nextId(),
      role: 'assistant',
      content: asContent(this.runParts),
      status: final && this.running ? { type: 'running' } : { type: 'complete', reason: 'stop' },
      ...(this.runCreatedAt ? { createdAt: this.runCreatedAt } : {}),
      ...(this.runIsService ? { metadata: { custom: { service: true } } } : {})
    });
    this.runParts = [];
    this.runCreatedAt = undefined;
  }

  /**
   * Ends session-preamble gathering (idempotent), flushing whatever was
   * buffered first. Only ever called by {@link emit}, for a genuine
   * assistant content part (`text`/`reasoning`/`tool-call`) — a real user
   * turn is built and pushed via {@link startUserTurn}, which deliberately
   * never closes gathering.
   */
  private closeGathering(): void {
    if (!this.gatheringSessionStart) return;
    this.flushSessionStartBuffer();
    this.gatheringSessionStart = false;
  }

  /**
   * Flushes the buffered leading-run parts into one standalone
   * `cc-session-start` disclosure message, deriving its summary from what it
   * contains. No-op when nothing was buffered. Built and spliced directly
   * rather than routed through {@link appendToRun}/{@link flushRun} — the
   * disclosure must land at {@link sessionStartInsertIndex} (the first user
   * turn's position), which is very likely earlier than wherever the
   * currently-open run (if any) would otherwise flush to.
   */
  private flushSessionStartBuffer(): void {
    if (this.sessionStartBuffer.length === 0) return;
    const entries: CcSessionStartEntry[] = this.sessionStartBuffer.map((part) => {
      // Every buffered part is a `data` part — `isUngroupedStructuralPart`
      // and the content check in `emit` route anything else away before it
      // ever reaches this buffer.
      const dataPart = part as Extract<ThreadMessagePart, { type: 'data' }>;
      return { name: dataPart.name, data: dataPart.data };
    });
    const summary = summarizeSessionStart(entries);
    this.sessionStartBuffer = [];
    const message: ThreadMessageLike = {
      id: this.nextId(),
      role: 'assistant',
      content: asContent([sessionStartPart(summary, entries)]),
      status: { type: 'complete', reason: 'stop' },
      metadata: { custom: { service: true } }
    };
    this.messages.splice(this.sessionStartInsertIndex ?? this.messages.length, 0, message);
  }
}

// ============================================================================
// Shared handler context and helpers
// ============================================================================

/** Mutable session-level metadata derived while converting. */
interface SessionMeta {
  /** Model id from the `system init` message, or '' until seen. */
  model: string;
  /** Working directory from the `system init` message, or '' until seen. */
  cwd: string;
  /** Overall session status, flipped by `result` messages. */
  status: SessionStatus;
}

/** Everything a per-subtype handler reads or drives: pre-passes plus output state. */
interface ConverterContext {
  /** Output-side state machine (runs, preamble gathering, ids, buffers). */
  builder: TranscriptBuilder;
  /** Session-level metadata handlers mutate (model/cwd/status). */
  meta: SessionMeta;
  /** Unresolved tool-call parts by tool_use id, awaiting their results. */
  pendingToolCalls: Map<string, MutableToolCallPart>;
  /** isMeta injection text keyed by source tool_use id (see {@link buildSupplementalResultMap}). */
  supplementalResultMap: Map<string, string>;
  /** tool_use_ids carried by a real (non-isMeta) `tool_result` block. */
  toolResultCarrierIds: Set<string>;
  /** Hook attachments keyed by owning tool_use id. */
  toolAttachmentsMap: Map<string, AttachmentPayload[]>;
  /** tool_use_ids that pair into a resolved tool-call part. */
  willNestToolUseIds: Set<string>;
}

/** One per-message-subtype conversion step. */
type MessageHandler = (msg: SessionMsg, context: ConverterContext) => void;

/**
 * Resolves a pending tool-call by mutating its part in place, or — when no
 * tool_use was ever registered for this id — appends a standalone resolved
 * tool-call to the current assistant run (an "orphan" result).
 * @param toolUseId - The tool_use id (or preceding_tool_use_id) this result pairs with.
 * @param resultText - The result/summary text to attach.
 * @param context - Shared conversion context.
 */
function finalizeToolResult(toolUseId: string, resultText: string, context: ConverterContext): void {
  const supplemental = context.supplementalResultMap.get(toolUseId) ?? null;
  const hooks = context.toolAttachmentsMap.get(toolUseId);
  const pending = context.pendingToolCalls.get(toolUseId);
  const result: CcToolResult = { output: resultText, supplementalResult: supplemental, hooks };
  if (pending) {
    pending.result = result;
    pending.isError = hasBlockingHook(hooks);
    context.pendingToolCalls.delete(toolUseId);
    return;
  }
  context.builder.emit({
    type: 'tool-call',
    toolCallId: `orphan-${toolUseId}`,
    toolName: 'tool',
    args: {},
    result,
    isError: hasBlockingHook(hooks)
  });
}

/**
 * Renders a coordination text block into its (deduped) status-line parts.
 * @param text - The candidate coordination text.
 * @param builder - Output state machine supplying the dedupe memory.
 * @returns One status-line part per non-suppressed classified line, in order.
 */
function coordinationStatusLines(text: string, builder: TranscriptBuilder): ThreadMessagePart[] {
  const lines: ThreadMessagePart[] = [];
  for (const line of classifyCoordinationText(text)) {
    const deduped = builder.dedupeCoordinationLine(line);
    if (deduped) lines.push(statusLinePart(deduped));
  }
  return lines;
}

// ============================================================================
// Per-message-subtype handlers
// ============================================================================

function handleAssistant(msg: SessionMsg, context: ConverterContext): void {
  const aMsg = msg as AssistantMsg;
  const builder = context.builder;
  if (aMsg.error) {
    builder.flushAmbient();
    builder.emit(errorLinePart(`API Error: ${String(aMsg.error)}`));
    return;
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
      context.pendingToolCalls.set(b.id, part);
    } else if (b.type === 'text' && b.text) {
      if (isCoordinationContent(b.text)) {
        parts.push(...coordinationStatusLines(b.text, builder));
      } else {
        parts.push({ type: 'text', text: b.text });
      }
    } else if (b.type === 'thinking' && b.thinking) {
      parts.push({ type: 'reasoning', text: b.thinking });
    }
  }

  // Folds into the current assistant run rather than starting a new message —
  // consecutive assistant SessionMsgs (and any structural content between
  // them) share one ThreadMessageLike (see module doc).
  if (parts.length > 0) {
    builder.flushAmbient();
    builder.emit(...parts);
  }
}

function handleAttachment(msg: SessionMsg, context: ConverterContext): void {
  const attachment = (msg as Extract<SessionMsg, { type: 'attachment' }>).attachment;
  const builder = context.builder;

  if (HOOK_ATTACHMENT_TYPES.has(attachment.type)) {
    const toolUseID = (attachment as { toolUseID?: string }).toolUseID;
    if (toolUseID && context.willNestToolUseIds.has(toolUseID)) return;
    builder.flushAmbient();
    builder.emit(hookPart(attachment));
    return;
  }

  const descriptor = classifyAttachment(attachment);
  if (descriptor.hidden) return;

  if (descriptor.scope === 'turn' && descriptor.tier === 'ambient') {
    builder.bufferAmbient(attachment);
    return;
  }

  builder.flushAmbient();
  builder.emit(attachmentPart(attachment));
}

function handleAuthStatus(msg: SessionMsg, context: ConverterContext): void {
  const authMsg = msg as AuthStatusMsg;
  context.builder.flushAmbient();
  if (authMsg.error) context.builder.emit(errorLinePart(`Auth error: ${authMsg.error}`));
  else if (authMsg.isAuthenticating) context.builder.emit(statusLinePart('Authenticating…'));
}

function handleMode(msg: SessionMsg, context: ConverterContext): void {
  const modeMsg = msg as { mode?: string };
  if (!modeMsg.mode) return;
  const line = context.builder.dedupeCoordinationLine(`Mode: ${modeMsg.mode}`);
  if (!line) return;
  context.builder.flushAmbient();
  context.builder.emit(statusLinePart(line));
}

function handleAiTitle(msg: SessionMsg, context: ConverterContext): void {
  const titleMsg = msg as { aiTitle?: string };
  if (!titleMsg.aiTitle) return;
  const line = context.builder.dedupeCoordinationLine(`Title: "${titleMsg.aiTitle}"`);
  if (!line) return;
  context.builder.flushAmbient();
  context.builder.emit(statusLinePart(line));
}

function handleProgress(msg: SessionMsg, context: ConverterContext): void {
  const pMsg = msg as ProgressMsg;
  if (pMsg.data?.type !== 'agent_progress') return;
  const content = pMsg.data.content ?? [];
  const lines: ThreadMessagePart[] = [];
  for (const block of content) {
    if (block.type !== 'tool_use') continue;
    const name = block.name || 'tool';
    const summary = summarizeTool(name, block.input);
    lines.push(statusLinePart(summary ? `↳ ${name} ${summary}` : `↳ ${name}`));
  }
  if (lines.length > 0) {
    context.builder.flushAmbient();
    context.builder.emit(...lines);
  }
}

function handleQueueOperation(msg: SessionMsg, context: ConverterContext): void {
  const queueMsg = msg as { operation?: string; content?: string };
  const builder = context.builder;
  builder.flushAmbient();
  if (queueMsg.operation === 'enqueue') {
    const preview = truncate(stripMarkup(queueMsg.content ?? '').trim(), 60);
    builder.emit(statusLinePart(preview ? `Queued: ${preview}` : 'Queued'));
  } else if (queueMsg.operation === 'remove' || queueMsg.operation === 'dequeue') {
    builder.emit(statusLinePart(`Queue: ${queueMsg.operation}`));
  } else {
    builder.emit(rawPart(msg, `Unrecognized queue operation · ${String(queueMsg.operation)}`));
  }
}

function handleResult(msg: SessionMsg, context: ConverterContext): void {
  const rMsg = msg as SessionResultMsg;
  const isSuccess = rMsg.subtype === 'success';
  context.meta.status = isSuccess ? 'success' : 'error';
  const durationS = Math.round((rMsg.duration_ms ?? 0) / 1000);
  const costStr = rMsg.total_cost_usd != null ? ` · $${Number(rMsg.total_cost_usd).toFixed(4)}` : '';
  const label = isSuccess
    ? `Session complete · ${rMsg.num_turns ?? 0} turns · ${durationS}s${costStr}`
    : `Session error (${rMsg.subtype ?? 'unknown'}) · ${rMsg.num_turns ?? 0} turns · ${durationS}s`;
  context.builder.flushAmbient();
  context.builder.emit(boundaryPart('result', label));
}

function handleBridgeSession(msg: SessionMsg, context: ConverterContext): void {
  const bridgeMsg = msg as { bridgeSessionId?: string };
  context.builder.flushAmbient();
  context.builder.emit(
    statusLinePart(bridgeMsg.bridgeSessionId ? `Bridge session ${bridgeMsg.bridgeSessionId}` : 'Bridge session')
  );
}

function handleWorktreeState(msg: SessionMsg, context: ConverterContext): void {
  const worktreeMsg = msg as { worktreeSession?: { worktreeName?: string; worktreePath?: string } };
  const name = worktreeMsg.worktreeSession?.worktreeName;
  context.builder.flushAmbient();
  context.builder.emit(statusLinePart(name ? `Worktree: ${name}` : 'Worktree state'));
}

function handleToolUseSummary(msg: SessionMsg, context: ConverterContext): void {
  const tusMsg = msg as ToolUseSummaryMsg;
  const summary = tusMsg.summary ?? '';
  let rendered = false;
  for (const id of tusMsg.preceding_tool_use_ids ?? []) {
    if (context.pendingToolCalls.has(id)) {
      finalizeToolResult(id, summary, context);
      rendered = true;
    }
  }
  if (!rendered && summary) {
    context.builder.emit({
      type: 'tool-call',
      toolCallId: `tus-${context.builder.nextId()}`,
      toolName: 'tool',
      args: {},
      result: { output: summary }
    });
  }
}

function handleUser(msg: SessionMsg, context: ConverterContext): void {
  const raw = msg as Record<string, unknown>;
  if (raw['isMeta'] === true) {
    const sourceToolUseID = raw['sourceToolUseID'];
    const willBeNested = typeof sourceToolUseID === 'string' && context.toolResultCarrierIds.has(sourceToolUseID);
    if (!willBeNested) {
      const text = extractIsMetaText(raw);
      if (text) {
        context.builder.flushAmbient();
        context.builder.emit(supplementalPart(text));
      }
    }
    return;
  }

  const userMsg = msg as UserMsg;
  const content = userMsg.message?.content;

  if (Array.isArray(content)) {
    for (const block of content) {
      const b = block as ContentBlock;
      if (b.type === 'tool_result' && b.tool_use_id) {
        finalizeToolResult(b.tool_use_id, resultTextOf(b), context);
      }
    }
  }

  const hasToolResults = Array.isArray(content) && content.some((b) => (b as ContentBlock).type === 'tool_result');
  if (hasToolResults) return;

  const textBlocks: string[] =
    typeof content === 'string'
      ? [content]
      : Array.isArray(content)
        ? content
            .filter(
              (b): b is Extract<ContentBlock, { type: 'text' }> =>
                (b as ContentBlock).type === 'text' && typeof (b as ContentBlock & { text?: string }).text === 'string'
            )
            .map((b) => b.text)
        : [];

  const parts: ThreadMessagePart[] = [];
  const humanParts: string[] = [];
  for (const text of textBlocks) {
    if (isCoordinationContent(text)) {
      parts.push(...coordinationStatusLines(text, context.builder));
    } else {
      humanParts.push(text);
    }
  }
  if (humanParts.length > 0) parts.push({ type: 'text', text: humanParts.join('\n\n') });

  if (parts.length > 0) context.builder.startUserTurn(parts);
}

// ============================================================================
// system-subtype handlers
// ============================================================================

/** One per-system-subtype conversion step. */
type SystemSubtypeHandler = (msg: SystemMsg, context: ConverterContext) => void;

/**
 * Internal hook-lifecycle noise, suppressed outright (mirrors the retired
 * MessageRouter's top-level filter before these subtypes ever reached SystemRouter).
 */
const SUPPRESSED_SYSTEM_SUBTYPES = new Set<string>(['hook_started', 'hook_progress', 'hook_response']);

function handleSystemInit(msg: SystemMsg, context: ConverterContext): void {
  const initMsg = msg as SystemInitMsg;
  context.meta.model = initMsg.model ?? '';
  context.meta.cwd = initMsg.cwd ?? '';
  const toolCount = initMsg.tools?.length ?? 0;
  context.builder.flushAmbient();
  context.builder.emit(boundaryPart('turn', `Session started · ${toolCount} tool${toolCount !== 1 ? 's' : ''}`));
}

function handleSystemStatus(msg: SystemMsg, context: ConverterContext): void {
  const statusMsg = msg as SystemStatusMsg;
  if (statusMsg.status === 'compacting') {
    context.builder.flushAmbient();
    context.builder.emit(statusLinePart('Compacting context…'));
  }
}

function handleSystemCompactBoundary(msg: SystemMsg, context: ConverterContext): void {
  const cbMsg = msg as SystemCompactBoundaryMsg;
  const trigger = cbMsg.compact_metadata?.trigger ?? 'auto';
  const preTokens = cbMsg.compact_metadata?.pre_tokens ?? 0;
  context.builder.flushAmbient();
  context.builder.emit(
    boundaryPart('compaction', `Context compacted (${trigger}) · ${preTokens.toLocaleString()} tokens`)
  );
}

function handleSystemFilesPersisted(msg: SystemMsg, context: ConverterContext): void {
  const fpMsg = msg as SystemFilesPersistedMsg;
  const saved = fpMsg.files?.length ?? 0;
  const failed = fpMsg.failed?.length ?? 0;
  const text = failed > 0 ? `Files persisted: ${saved} saved, ${failed} failed` : `Files persisted: ${saved} saved`;
  context.builder.flushAmbient();
  context.builder.emit(statusLinePart(text));
}

function handleSystemTaskNotification(msg: SystemMsg, context: ConverterContext): void {
  const tnMsg = msg as SystemTaskNotificationMsg;
  context.builder.flushAmbient();
  context.builder.emit(statusLinePart(`Task ${tnMsg.task_id ?? ''}: ${tnMsg.status ?? ''} — ${tnMsg.summary ?? ''}`));
}

function handleSystemAwaySummary(msg: SystemMsg, context: ConverterContext): void {
  const awayMsg = msg as SystemAwaySummaryMsg;
  context.builder.flushAmbient();
  context.builder.emit(awaySummaryPart(awayMsg.content));
}

function handleSystemTurnDuration(msg: SystemMsg, context: ConverterContext): void {
  // The expanded converter has no dedicated type for this subtype, so its
  // extra fields are read defensively here, matching the `mode`/`ai-title`
  // top-level handlers.
  const tdMsg = msg as { durationMs?: number; messageCount?: number };
  const seconds = ((tdMsg.durationMs ?? 0) / 1000).toFixed(1);
  const count = tdMsg.messageCount ?? 0;
  context.builder.flushAmbient();
  context.builder.emit(statusLinePart(`Turn · ${seconds}s · ${count} message${count === 1 ? '' : 's'}`));
}

/** Per-subtype dispatch under `system`; unrecognized subtypes fall through to the shared `raw` data part. */
const SYSTEM_SUBTYPE_HANDLERS: Record<string, SystemSubtypeHandler> = {
  away_summary: handleSystemAwaySummary,
  compact_boundary: handleSystemCompactBoundary,
  files_persisted: handleSystemFilesPersisted,
  init: handleSystemInit,
  status: handleSystemStatus,
  task_notification: handleSystemTaskNotification,
  turn_duration: handleSystemTurnDuration
};

function handleSystem(msg: SessionMsg, context: ConverterContext): void {
  const sysMsg = msg as SystemMsg;
  if (SUPPRESSED_SYSTEM_SUBTYPES.has(sysMsg.subtype)) return;
  const handler = SYSTEM_SUBTYPE_HANDLERS[sysMsg.subtype];
  if (handler) {
    handler(sysMsg, context);
    return;
  }
  context.builder.flushAmbient();
  context.builder.emit(rawPart(sysMsg, `Unrecognized system event · ${sysMsg.subtype}`));
}

// ============================================================================
// Dispatch tables and entry point
// ============================================================================

function handleUnrecognizedMessage(msg: SessionMsg, context: ConverterContext): void {
  context.builder.flushAmbient();
  context.builder.emit(rawPart(msg, `Unrecognized message · ${msg.type}`));
}

/** Per-message-type dispatch; unrecognized types fall through to the shared `raw` data part. */
const MESSAGE_HANDLERS: Record<string, MessageHandler> = {
  'ai-title': handleAiTitle,
  assistant: handleAssistant,
  attachment: handleAttachment,
  auth_status: handleAuthStatus,
  'bridge-session': handleBridgeSession,
  mode: handleMode,
  progress: handleProgress,
  'queue-operation': handleQueueOperation,
  result: handleResult,
  system: handleSystem,
  tool_use_summary: handleToolUseSummary,
  user: handleUser,
  'worktree-state': handleWorktreeState
};

/**
 * Converts parsed claude-code-session messages into `ThreadMessageLike[]` for
 * the shared `StreamThread`. Nothing is silently dropped: unrecognized shapes
 * fall through to the shared `raw` data part with a labeled severity.
 * @param messages - Parsed (optionally already `mergeConsecutiveMessages`-folded) session messages.
 * @returns The converted thread messages plus derived session status/model/cwd.
 */
export function toThreadMessages(messages: SessionMsg[]): ConvertedSession {
  const isRunning = !messages.some((m) => m.type === 'result');
  const builder = new TranscriptBuilder(isRunning);
  const context: ConverterContext = {
    builder,
    meta: { model: '', cwd: '', status: 'running' },
    pendingToolCalls: new Map(),
    supplementalResultMap: buildSupplementalResultMap(messages),
    toolResultCarrierIds: computeToolResultCarrierIds(messages),
    toolAttachmentsMap: buildToolAttachmentsMap(messages),
    willNestToolUseIds: computeWillNestToolUseIds(messages)
  };

  for (const msg of messages) {
    builder.beginMessage(extractTimestamp(msg));
    (MESSAGE_HANDLERS[msg.type] ?? handleUnrecognizedMessage)(msg, context);
  }

  builder.finish();

  return {
    messages: builder.messages,
    isRunning,
    model: context.meta.model,
    cwd: context.meta.cwd,
    status: context.meta.status
  };
}
