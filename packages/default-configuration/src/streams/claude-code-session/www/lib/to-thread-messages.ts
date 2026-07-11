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
 * `cc-away-summary`/`cc-supplemental` parts) is a `data` part, so none of
 * them can ever be a system message's content. Instead, only `user` messages
 * start a new `ThreadMessageLike`; every other message folds its parts into
 * one open "assistant run" accumulator (`assistantParts`, flushed by
 * `flushAssistant`), which becomes a single `role: 'assistant'` message once
 * a `user` message (or the end of the transcript) closes it — `assistant`
 * and `user` roles both accept mixed `data`/`text`/`reasoning`/`tool-call`
 * content freely. Net visual effect: one "Assistant" role caption per
 * turn-group instead of one per structural row, with boundaries/status-lines/
 * errors/hooks/attachments interleaved inline inside it.
 *
 * Tool calls become `tool-call` parts on the owning assistant run; a
 * `tool_result` (or `tool_use_summary`) arriving later mutates that same part
 * object in place (`result`/`isError`) rather than emitting a new one — the
 * mutation works regardless of whether the run has flushed yet, since the
 * part object reference is shared. An orphan result (no matching `tool_use`
 * was ever registered) still renders, as its own resolved `tool-call` part
 * appended to the current run.
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
  let assistantParts: ThreadMessagePart[] = [];
  let idCounter = 0;

  const nextId = (): string => `cc-msg-${idCounter++}`;

  /**
   * Appends parts to the currently-open assistant run (see module doc for why no part is ever a system message).
   * @param parts - Parts to append, in order.
   */
  const appendAssistant = (...parts: ThreadMessagePart[]): void => {
    assistantParts.push(...parts);
  };

  const flushAmbient = (): void => {
    if (ambientBuffer.length === 0) return;
    appendAssistant(ambientGroupPart(ambientBuffer));
    ambientBuffer = [];
  };

  /**
   * Flushes the accumulated assistant run into a `ThreadMessageLike`, if it
   * has any content.
   * @param final - Whether this is the transcript's terminal flush, whose
   *   status reflects overall `isRunning`. Every interior flush (triggered by
   *   an upcoming `user` message) is always `complete`, since more content follows it.
   */
  const flushAssistant = (final: boolean): void => {
    flushAmbient();
    if (assistantParts.length === 0) return;
    threadMessages.push({
      id: nextId(),
      role: 'assistant',
      content: asContent(assistantParts),
      status: final && isRunning ? { type: 'running' } : { type: 'complete', reason: 'stop' }
    });
    assistantParts = [];
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
    appendAssistant({
      type: 'tool-call',
      toolCallId: `orphan-${toolUseId}`,
      toolName: 'tool',
      args: {},
      result,
      isError: hasBlockingHook(hooks)
    });
  };

  for (const msg of messages) {
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
            appendAssistant(boundaryPart('turn', `Session started · ${toolCount} tool${toolCount !== 1 ? 's' : ''}`));
            break;
          }
          case 'status': {
            const statusMsg = sysMsg as SystemStatusMsg;
            if (statusMsg.status === 'compacting') {
              flushAmbient();
              appendAssistant(statusLinePart('Compacting context…'));
            }
            break;
          }
          case 'compact_boundary': {
            const cbMsg = sysMsg as SystemCompactBoundaryMsg;
            const trigger = cbMsg.compact_metadata?.trigger ?? 'auto';
            const preTokens = cbMsg.compact_metadata?.pre_tokens ?? 0;
            flushAmbient();
            appendAssistant(
              boundaryPart('compaction', `Context compacted (${trigger}) · ${preTokens.toLocaleString()} tokens`)
            );
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
            appendAssistant(statusLinePart(text));
            break;
          }
          case 'task_notification': {
            const tnMsg = sysMsg as SystemTaskNotificationMsg;
            flushAmbient();
            appendAssistant(
              statusLinePart(`Task ${tnMsg.task_id ?? ''}: ${tnMsg.status ?? ''} — ${tnMsg.summary ?? ''}`)
            );
            break;
          }
          case 'away_summary': {
            const awayMsg = sysMsg as SystemAwaySummaryMsg;
            flushAmbient();
            appendAssistant(awaySummaryPart(awayMsg.content));
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
            appendAssistant(statusLinePart(`Turn · ${seconds}s · ${count} message${count === 1 ? '' : 's'}`));
            break;
          }
          default:
            flushAmbient();
            appendAssistant(rawPart(sysMsg, `Unrecognized system event · ${sysMsg.subtype}`));
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
              appendAssistant(supplementalPart(text));
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
              for (const line of classifyCoordinationText(raw2)) parts.push(statusLinePart(line));
            } else {
              humanParts.push(raw2);
            }
          }
          if (humanParts.length > 0) parts.push({ type: 'text', text: humanParts.join('\n\n') });

          if (parts.length > 0) {
            // A real user turn closes out whatever assistant run preceded it —
            // user/assistant messages alternate as distinct ThreadMessageLikes;
            // only the structural/status content in between folds into one run.
            flushAssistant(false);
            threadMessages.push({ id: nextId(), role: 'user', content: asContent(parts) });
          }
        }
        break;
      }

      case 'assistant': {
        const aMsg = msg as AssistantMsg;
        if (aMsg.error) {
          flushAmbient();
          appendAssistant(errorLinePart(`API Error: ${String(aMsg.error)}`));
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
              for (const line of classifyCoordinationText(b.text)) parts.push(statusLinePart(line));
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
          appendAssistant(...parts);
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
          appendAssistant({
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
        appendAssistant(boundaryPart('result', label));
        break;
      }

      case 'auth_status': {
        const authMsg = msg as AuthStatusMsg;
        flushAmbient();
        if (authMsg.error) appendAssistant(errorLinePart(`Auth error: ${authMsg.error}`));
        else if (authMsg.isAuthenticating) appendAssistant(statusLinePart('Authenticating…'));
        break;
      }

      case 'attachment': {
        const attachment = (msg as Extract<SessionMsg, { type: 'attachment' }>).attachment;

        if (HOOK_ATTACHMENT_TYPES.has(attachment.type)) {
          const toolUseID = (attachment as { toolUseID?: string }).toolUseID;
          if (toolUseID && willNestToolUseIds.has(toolUseID)) break;
          flushAmbient();
          appendAssistant(hookPart(attachment));
          break;
        }

        const descriptor = classifyAttachment(attachment);
        if (descriptor.hidden) break;

        if (descriptor.scope === 'turn' && descriptor.tier === 'ambient') {
          ambientBuffer.push(attachment);
          break;
        }

        flushAmbient();
        appendAssistant(attachmentPart(attachment));
        break;
      }

      case 'mode': {
        const modeMsg = msg as { mode?: string };
        if (modeMsg.mode) {
          flushAmbient();
          appendAssistant(statusLinePart(`Mode: ${modeMsg.mode}`));
        }
        break;
      }

      case 'ai-title': {
        const titleMsg = msg as { aiTitle?: string };
        if (titleMsg.aiTitle) {
          flushAmbient();
          appendAssistant(statusLinePart(`Title: "${titleMsg.aiTitle}"`));
        }
        break;
      }

      case 'queue-operation': {
        const queueMsg = msg as { operation?: string; content?: string };
        flushAmbient();
        if (queueMsg.operation === 'enqueue') {
          const preview = truncate(stripMarkup(queueMsg.content ?? '').trim(), 60);
          appendAssistant(statusLinePart(preview ? `Queued: ${preview}` : 'Queued'));
        } else if (queueMsg.operation === 'remove' || queueMsg.operation === 'dequeue') {
          appendAssistant(statusLinePart(`Queue: ${queueMsg.operation}`));
        } else {
          appendAssistant(rawPart(msg, `Unrecognized queue operation · ${String(queueMsg.operation)}`));
        }
        break;
      }

      case 'worktree-state': {
        const worktreeMsg = msg as { worktreeSession?: { worktreeName?: string; worktreePath?: string } };
        const name = worktreeMsg.worktreeSession?.worktreeName;
        flushAmbient();
        appendAssistant(statusLinePart(name ? `Worktree: ${name}` : 'Worktree state'));
        break;
      }

      case 'bridge-session': {
        const bridgeMsg = msg as { bridgeSessionId?: string };
        flushAmbient();
        appendAssistant(
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
          appendAssistant(...lines);
        }
        break;
      }

      default:
        flushAmbient();
        appendAssistant(rawPart(msg, `Unrecognized message · ${msg.type}`));
    }
  }

  flushAssistant(true);

  return { messages: threadMessages, isRunning, model, cwd, status };
}
