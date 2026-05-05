/**
 * JSONL line parsing for claude-code-session stream data.
 *
 * Converts raw JSONL lines into typed event and message objects consumed by
 * both the compact state machine and the expanded transcript renderer.
 *
 * @summary JSONL-to-typed-event parsing for compact and expanded views
 * @module lib/parse-session
 */

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

/** A text excerpt from an assistant turn. */
export interface TextEvent {
  kind: 'text';
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
  message?: { content?: ContentBlock[]; usage?: { output_tokens?: number } };
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

/** Union of all parsed session messages. */
export type SessionMsg =
  | SystemMsg
  | UserMsg
  | AssistantMsg
  | ToolUseSummaryMsg
  | SessionResultMsg
  | AuthStatusMsg
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
          events.push({ kind: 'text', text: cleaned });
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
    const outputTokens = (message?.['usage'] as Record<string, unknown> | undefined)?.['output_tokens'];
    if (outputTokens != null) {
      events.push({ kind: 'usage', outputTokens: Number(outputTokens) });
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
  for (const line of lines) {
    const msg = parseLine(line);
    if (msg !== null) result.push(msg);
  }
  return result;
}
