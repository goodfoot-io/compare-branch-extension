/**
 * JSONL line parsing for claude-code-session stream data.
 *
 * Converts raw JSONL lines into typed event and message objects consumed by
 * both the compact state machine and the expanded transcript renderer.
 *
 * @summary JSONL-to-typed-event parsing for compact and expanded views
 * @module lib/parse-session
 */

import { sanitizeHeadline } from './sanitize';
import { INFRASTRUCTURE_TOOLS, summarizeTool } from './tool-summary';

// ============================================================================
// Compact event types
// ============================================================================

/** A tool call event from an assistant or subagent turn. */
export interface ToolCallEvent {
  kind: 'tool-call' | 'subagent-tool-call';
  toolName: string;
  summary: string;
  isInfrastructure: boolean;
}

/** A text excerpt from an assistant or genuine user turn. */
export interface TextEvent {
  kind: 'text';
  /** Speaker of the text, so the tail can label and tint it by source. */
  role: 'assistant' | 'user';
  text: string;
}

/** An error event from a failed assistant turn. */
export interface ErrorEvent {
  kind: 'error';
  message: string;
}

/** Token usage from an assistant turn. */
export interface UsageEvent {
  kind: 'usage';
  outputTokens: number;
  /** Input tokens for the turn, when `message.usage.input_tokens` is present. */
  inputTokens?: number;
  /**
   * The producing assistant API message id (`message.id`). The producer splits
   * one message across one JSONL line per content block, repeating `usage`
   * verbatim on each — so the consumer de-duplicates by this id to count a
   * message's tokens exactly once. Absent only on legacy lines without an id.
   */
  messageId?: string;
}

/** Duration of a completed turn. */
export interface TurnDurationEvent {
  kind: 'turn-duration';
  durationMs: number;
}

/** Final session result. */
export interface ResultEvent {
  kind: 'result';
  status: 'success' | 'error';
  turns: number;
  durationS: number;
}

/** Union of all compact stream events. */
export type CompactEvent = ToolCallEvent | TextEvent | ErrorEvent | UsageEvent | TurnDurationEvent | ResultEvent;

// ============================================================================
// Expanded message types (parsed from raw JSONL lines)
// ============================================================================

/** A content block within a message. */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string | Array<{ type: string; text?: string }> };

/** System init message. */
export interface SystemInitMsg {
  type: 'system';
  subtype: 'init';
  model: string;
  cwd: string;
  tools: unknown[];
}

/** System status message (e.g. compacting). */
export interface SystemStatusMsg {
  type: 'system';
  subtype: 'status';
  status: string;
}

/** System compact_boundary message. */
export interface SystemCompactBoundaryMsg {
  type: 'system';
  subtype: 'compact_boundary';
  compact_metadata?: { trigger?: string; pre_tokens?: number };
}

/** System hook_started message. */
export interface SystemHookStartedMsg {
  type: 'system';
  subtype: 'hook_started';
  hook_name?: string;
  hook_event?: string;
}

/** System hook_progress message. */
export interface SystemHookProgressMsg {
  type: 'system';
  subtype: 'hook_progress';
  hook_name?: string;
  output?: string;
  stdout?: string;
}

/** System hook_response message. */
export interface SystemHookResponseMsg {
  type: 'system';
  subtype: 'hook_response';
  hook_name?: string;
  outcome?: string;
}

/** System files_persisted message. */
export interface SystemFilesPersistedMsg {
  type: 'system';
  subtype: 'files_persisted';
  files?: unknown[];
  failed?: unknown[];
}

/** System task_notification message. */
export interface SystemTaskNotificationMsg {
  type: 'system';
  subtype: 'task_notification';
  task_id?: string;
  status?: string;
  summary?: string;
}

/** System away_summary message — written when Claude exits mid-session. */
export interface SystemAwaySummaryMsg {
  type: 'system';
  subtype: 'away_summary';
  content: string;
}

/** Union of system messages. */
export type SystemMsg =
  | SystemInitMsg
  | SystemStatusMsg
  | SystemCompactBoundaryMsg
  | SystemHookStartedMsg
  | SystemHookProgressMsg
  | SystemHookResponseMsg
  | SystemFilesPersistedMsg
  | SystemTaskNotificationMsg
  | SystemAwaySummaryMsg
  | { type: 'system'; subtype: string };

/** User turn message. */
export interface UserMsg {
  type: 'user';
  message?: { content?: string | ContentBlock[] };
  tool_use_result?: boolean;
}

/** Assistant turn message. */
export interface AssistantMsg {
  type: 'assistant';
  error?: string;
  message?: { id?: string; content?: ContentBlock[]; usage?: { output_tokens?: number; input_tokens?: number } };
}

/** Tool use summary (compact result). */
export interface ToolUseSummaryMsg {
  type: 'tool_use_summary';
  summary?: string;
  preceding_tool_use_ids?: string[];
}

/** Final session result message. */
export interface SessionResultMsg {
  type: 'result';
  subtype?: string;
  num_turns?: number;
  duration_ms?: number;
  total_cost_usd?: number;
}

/** Auth status message. */
export interface AuthStatusMsg {
  type: 'auth_status';
  error?: string;
  isAuthenticating?: boolean;
}

// ============================================================================
// Attachment payload types (discriminated union over 22 known subtypes)
// ============================================================================

/**
 * Base fields shared by all hook attachment subtypes.
 * Real payloads carry additive fields beyond those listed here; the index
 * signature keeps TypeScript permissive so callers are not broken by new fields.
 */
interface HookAttachmentBase {
  /** @ignore index signature — permits additive fields from real JSONL lines */
  [key: string]: unknown;
  hookName: string;
  toolUseID: string;
  hookEvent: string;
  /**
   * Structured `hookSpecificOutput` object a hook script returned on stdout
   * (e.g. `{hookEventName, permissionDecision, permissionDecisionReason}`).
   * Rendered as a key/value table rather than folded into the free-text body.
   */
  hookSpecificOutput?: Record<string, unknown>;
}

/** hook_success — tool lifecycle hook ran successfully. */
export interface HookSuccessAttachment extends HookAttachmentBase {
  type: 'hook_success';
  content?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  command?: string;
  durationMs?: number;
}

/** hook_additional_context — hook injected additional context. */
export interface HookAdditionalContextAttachment extends HookAttachmentBase {
  type: 'hook_additional_context';
  content?: string[];
}

/** hook_system_message — hook injected a system message. */
export interface HookSystemMessageAttachment extends HookAttachmentBase {
  type: 'hook_system_message';
  content?: string;
}

/** hook_non_blocking_error — hook failed but did not block the tool. Carries full run fields. */
export interface HookNonBlockingErrorAttachment extends HookAttachmentBase {
  type: 'hook_non_blocking_error';
  stderr?: string;
  stdout?: string;
  exitCode?: number;
  command?: string;
  durationMs?: number;
}

/** hook_blocking_error — hook failed and blocked the tool. */
export interface HookBlockingErrorAttachment extends HookAttachmentBase {
  type: 'hook_blocking_error';
  blockingError?: { blockingError?: string; command?: string };
}

/** hook_cancelled — hook was cancelled before completion. */
export interface HookCancelledAttachment extends HookAttachmentBase {
  type: 'hook_cancelled';
}

/** team_context — subagent team membership context. */
export interface TeamContextAttachment {
  type: 'team_context';
  agentId?: string;
  agentName?: string;
  teamName?: string;
  teamConfigPath?: string;
  taskListPath?: string;
  [key: string]: unknown;
}

/** command_permissions — allowed tool set for the turn. */
export interface CommandPermissionsAttachment {
  type: 'command_permissions';
  allowedTools: string[];
  [key: string]: unknown;
}

/** deferred_tools_delta — MCP tool availability changes. */
export interface DeferredToolsDeltaAttachment {
  type: 'deferred_tools_delta';
  addedNames?: string[];
  addedLines?: string[];
  removedNames?: string[];
  readdedNames?: string[];
  pendingMcpServers?: string[];
  [key: string]: unknown;
}

/** mcp_instructions_delta — MCP server instruction changes. */
export interface McpInstructionsDeltaAttachment {
  type: 'mcp_instructions_delta';
  addedNames?: string[];
  addedBlocks?: string[];
  removedNames?: string[];
  [key: string]: unknown;
}

/** agent_listing_delta — available subagent-type roster changes. */
export interface AgentListingDeltaAttachment {
  type: 'agent_listing_delta';
  addedTypes?: string[];
  addedLines?: string[];
  removedTypes?: string[];
  isInitial?: boolean;
  showConcurrencyNote?: boolean;
  [key: string]: unknown;
}

/** task_reminder — pending task list reminder. */
export interface TaskReminderAttachment {
  type: 'task_reminder';
  content?: unknown[];
  itemCount?: number;
  [key: string]: unknown;
}

/** nested_memory — a CLAUDE.md memory file loaded into context. */
export interface NestedMemoryAttachment {
  type: 'nested_memory';
  path?: string;
  displayPath?: string;
  content?: { path?: string; type?: string; content?: string; contentDiffersFromDisk?: boolean };
  [key: string]: unknown;
}

/** skill_listing — available skills enumerated. */
export interface SkillListingAttachment {
  type: 'skill_listing';
  content?: string;
  skillCount?: number;
  isInitial?: boolean;
  names?: string[];
  [key: string]: unknown;
}

/** invoked_skills — skills loaded for this turn. */
export interface InvokedSkillsAttachment {
  type: 'invoked_skills';
  skills?: Array<{ name?: string; path?: string; content?: string }>;
  [key: string]: unknown;
}

/** dynamic_skill — a skills directory loaded from the workspace. */
export interface DynamicSkillAttachment {
  type: 'dynamic_skill';
  skillDir?: string;
  skillNames?: string[];
  displayPath?: string;
  [key: string]: unknown;
}

/** file — a file read into context. */
export interface FileAttachment {
  type: 'file';
  filename?: string;
  displayPath?: string;
  content?: {
    type?: string;
    file?: { filePath?: string; content?: string; numLines?: number; startLine?: number; totalLines?: number };
  };
  [key: string]: unknown;
}

/** edited_text_file — a file was edited during the turn. */
export interface EditedTextFileAttachment {
  type: 'edited_text_file';
  filename?: string;
  snippet?: string;
  [key: string]: unknown;
}

/** queued_command — a command queued for the next turn. */
export interface QueuedCommandAttachment {
  type: 'queued_command';
  prompt?: string;
  commandMode?: string;
  [key: string]: unknown;
}

/** compact_file_reference — a file referenced in compact mode. */
export interface CompactFileReferenceAttachment {
  type: 'compact_file_reference';
  filename?: string;
  displayPath?: string;
  [key: string]: unknown;
}

/** opened_file_in_ide — a file was opened in the IDE. Always hidden. */
export interface OpenedFileInIdeAttachment {
  type: 'opened_file_in_ide';
  filename?: string;
  [key: string]: unknown;
}

/** selected_lines_in_ide — lines were selected in the IDE. */
export interface SelectedLinesInIdeAttachment {
  type: 'selected_lines_in_ide';
  ideName?: string;
  lineStart?: number;
  lineEnd?: number;
  filename?: string;
  displayPath?: string;
  content?: string;
  [key: string]: unknown;
}

/** date_change — the calendar date changed during the session. */
export interface DateChangeAttachment {
  type: 'date_change';
  newDate?: string;
  [key: string]: unknown;
}

/**
 * Discriminated union of all 23 known attachment subtypes, plus a catch-all for
 * future/unknown types.  Modeled permissively so additive fields on real JSONL
 * lines do not fail typecheck.
 *
 * @summary Discriminated union of all known attachment payload subtypes
 */
export type AttachmentPayload =
  | HookSuccessAttachment
  | HookAdditionalContextAttachment
  | HookSystemMessageAttachment
  | HookNonBlockingErrorAttachment
  | HookBlockingErrorAttachment
  | HookCancelledAttachment
  | TeamContextAttachment
  | CommandPermissionsAttachment
  | DeferredToolsDeltaAttachment
  | McpInstructionsDeltaAttachment
  | AgentListingDeltaAttachment
  | TaskReminderAttachment
  | NestedMemoryAttachment
  | SkillListingAttachment
  | InvokedSkillsAttachment
  | DynamicSkillAttachment
  | FileAttachment
  | EditedTextFileAttachment
  | QueuedCommandAttachment
  | CompactFileReferenceAttachment
  | OpenedFileInIdeAttachment
  | SelectedLinesInIdeAttachment
  | DateChangeAttachment
  | { type: string; [key: string]: unknown };

/** A parsed attachment line from the JSONL stream. */
export interface AttachmentMsg {
  type: 'attachment';
  attachment: AttachmentPayload;
}

/**
 * Subagent progress message — carries a subagent's live tool activity, emitted
 * on the *parent's* stream while the subagent's own tool call is in flight (it
 * has no paired `tool_result` here; the subagent's own transcript carries that).
 */
export interface ProgressMsg {
  type: 'progress';
  data?: {
    type?: string;
    content?: ContentBlock[];
  };
}

/** Union of all parsed session messages. */
export type SessionMsg =
  | SystemMsg
  | UserMsg
  | AssistantMsg
  | ToolUseSummaryMsg
  | SessionResultMsg
  | AuthStatusMsg
  | AttachmentMsg
  | ProgressMsg
  | { type: string };

// ============================================================================
// Parsing functions
// ============================================================================

// ============================================================================
// Message merging
// ============================================================================

/**
 * Normalizes user message content to a `ContentBlock[]` for uniform merging.
 * String content is wrapped in a text block.
 * @param content - Raw user message content, either a plain string or an array of content blocks.
 * @returns Normalized array of content blocks.
 */
function normalizeUserContent(content: string | ContentBlock[] | undefined): ContentBlock[] {
  if (!content) return [];
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  return content;
}

/**
 * Merges consecutive same-author messages into single messages by concatenating
 * their content arrays. This eliminates visual discontinuity when the same
 * author produces multiple JSONL lines in a row.
 *
 * - Consecutive assistant messages (without errors) are merged.
 * - Consecutive user messages (excluding `isMeta` messages) are merged.
 * - Any other message type, an error assistant message, or an `isMeta` user
 *   message breaks the run and starts a new entry.
 *
 * @param messages - Parsed session messages in order.
 * @returns New array with consecutive same-author messages merged.
 */
export function mergeConsecutiveMessages(messages: SessionMsg[]): SessionMsg[] {
  const result: SessionMsg[] = [];

  for (const msg of messages) {
    const last = result.length > 0 ? result[result.length - 1] : undefined;

    if (msg.type === 'assistant') {
      const aMsg = msg as AssistantMsg;
      const lastA = last?.type === 'assistant' ? (last as AssistantMsg) : undefined;

      if (lastA && !lastA.error && !aMsg.error) {
        result[result.length - 1] = {
          ...lastA,
          message: {
            ...lastA.message,
            content: [...(lastA.message?.content ?? []), ...(aMsg.message?.content ?? [])]
          }
        };
        continue;
      }
    } else if (msg.type === 'user') {
      const raw = msg as Record<string, unknown>;
      const lastRaw = last as Record<string, unknown> | undefined;

      if (last?.type === 'user' && raw['isMeta'] !== true && lastRaw?.['isMeta'] !== true) {
        const lastU = last as UserMsg;
        const userMsg = msg as UserMsg;
        result[result.length - 1] = {
          ...lastU,
          message: {
            ...lastU.message,
            content: [
              ...normalizeUserContent(lastU.message?.content),
              ...normalizeUserContent(userMsg.message?.content)
            ]
          }
        };
        continue;
      }
    }

    result.push(msg);
  }

  return result;
}

/**
 * Parses a single JSONL line into zero or more compact events.
 * Returns an empty array for blank lines or parse errors.
 *
 * @param line - Raw JSONL line string
 * @returns Array of compact events parsed from the line, empty for blank or unparseable lines.
 */
export function parseLineEvents(line: string): CompactEvent[] {
  if (!line?.trim()) return [];
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return [];
  }

  const events: CompactEvent[] = [];

  // Error path (assistant with error field)
  if (msg['type'] === 'assistant' && msg['error']) {
    events.push({ kind: 'error', message: String(msg['error']) });
    return events;
  }

  // Assistant message
  if (msg['type'] === 'assistant') {
    const message = msg['message'] as Record<string, unknown> | undefined;
    const blocks = (message?.['content'] as ContentBlock[] | undefined) ?? [];
    for (const block of blocks) {
      if (block.type === 'text' && typeof block.text === 'string') {
        const cleaned = block.text.trim();
        if (cleaned && !/^\s*[{[<]/.test(cleaned)) {
          events.push({ kind: 'text', role: 'assistant', text: cleaned });
        }
      }
      if (block.type === 'tool_use') {
        const name = block.name || 'tool';
        events.push({
          kind: 'tool-call',
          toolName: name,
          summary: summarizeTool(name, block.input),
          isInfrastructure: INFRASTRUCTURE_TOOLS.has(name)
        });
      }
    }
    const usage = message?.['usage'] as Record<string, unknown> | undefined;
    const outputTokens = usage?.['output_tokens'];
    if (outputTokens != null) {
      const inputTokens = usage?.['input_tokens'];
      const event: UsageEvent = { kind: 'usage', outputTokens: Number(outputTokens) };
      if (inputTokens != null) event.inputTokens = Number(inputTokens);
      // Carry the message id so the consumer counts a message's tokens once even
      // though `usage` repeats verbatim across its per-content-block lines.
      const messageId = message?.['id'];
      if (typeof messageId === 'string' && messageId) event.messageId = messageId;
      events.push(event);
    }
    return events;
  }

  // User message — emit a text event only for genuine human/assistant prose.
  // The same rejection logic that guards the headline (empty, JSON-ish, or
  // control traffic) is reused here so machine/markup lines never reach the tail.
  if (msg['type'] === 'user' && !msg['tool_use_result']) {
    const content = (msg['message'] as Record<string, unknown> | undefined)?.['content'];
    let text = '';
    if (typeof content === 'string') {
      text = content;
    } else if (Array.isArray(content)) {
      for (const block of content as ContentBlock[]) {
        if (block?.type === 'text' && typeof block.text === 'string') text += block.text;
      }
    }
    const sanitized = sanitizeHeadline(text);
    if (sanitized) {
      events.push({ kind: 'text', role: 'user', text: sanitized });
    }
    return events;
  }

  // Subagent progress
  if (msg['type'] === 'progress') {
    const data = msg['data'] as Record<string, unknown> | undefined;
    if (data?.['type'] === 'agent_progress') {
      const content = (data['content'] as ContentBlock[] | undefined) ?? [];
      for (const block of content) {
        if (block.type === 'tool_use') {
          const name = block.name || 'tool';
          events.push({
            kind: 'subagent-tool-call',
            toolName: name,
            summary: summarizeTool(name, block.input),
            isInfrastructure: INFRASTRUCTURE_TOOLS.has(name)
          });
        }
      }
    }
    return events;
  }

  // Turn duration
  if (msg['type'] === 'system') {
    const subtype = msg['subtype'];
    if (subtype === 'turn_duration') {
      events.push({ kind: 'turn-duration', durationMs: Number(msg['durationMs'] ?? 0) });
      return events;
    }
  }

  // Result
  if (msg['type'] === 'result') {
    events.push({
      kind: 'result',
      status: msg['subtype'] === 'success' ? 'success' : 'error',
      turns: Number(msg['num_turns'] ?? 0),
      durationS: Math.round(Number(msg['duration_ms'] ?? 0) / 1000)
    });
    return events;
  }

  return [];
}

/**
 * Parses a raw JSONL line into a typed `SessionMsg`, or returns null if the
 * line is blank or unparseable.
 *
 * @param line - Raw JSONL line string
 * @returns Parsed session message, or null for blank or unparseable lines.
 */
export function parseLine(line: string): SessionMsg | null {
  if (!line?.trim()) return null;
  try {
    const parsed = JSON.parse(line) as SessionMsg;
    // Suppress internal orchestration events with no value to the reader.
    const t = (parsed as { type?: string }).type;
    if (t === 'permission-mode' || t === 'last-prompt') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Parses all JSONL lines into typed session messages, skipping blank lines
 * and parse errors.
 *
 * @param lines - Array of raw JSONL lines
 * @returns Array of parsed session messages, with blank lines and errors skipped.
 */
export function parseLines(lines: string[]): SessionMsg[] {
  const result: SessionMsg[] = [];
  // De-dup by `uuid`: the transcript is double-written, so every `uuid` arrives
  // twice. Fold each unique `uuid` once, mirroring the compact view, so the
  // expanded transcript does not render every message twice. Lines without a
  // `uuid` (e.g. some system/result lines) are never skipped.
  const seenUuids = new Set<string>();
  for (const line of lines) {
    const msg = parseLine(line);
    if (msg === null) continue;
    const uuid = (msg as { uuid?: unknown }).uuid;
    if (typeof uuid === 'string' && uuid) {
      if (seenUuids.has(uuid)) continue;
      seenUuids.add(uuid);
    }
    result.push(msg);
  }
  return result;
}
