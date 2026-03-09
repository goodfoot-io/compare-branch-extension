/**
 * Implements claude code session behavior for the transforms area.
 * The module captures domain rules in one place so callers can compose workflows without
 * duplicating edge-case handling.
 *
 * @summary Claude Code Session logic for transforms
 */

import type {
  SDKAssistantMessage,
  SDKAuthStatusMessage,
  SDKCompactBoundaryMessage,
  SDKFilesPersistedEvent,
  SDKHookProgressMessage,
  SDKHookResponseMessage,
  SDKHookStartedMessage,
  SDKMessage,
  SDKResultMessage,
  SDKStatusMessage,
  SDKSystemMessage,
  SDKTaskNotificationMessage,
  SDKToolProgressMessage,
  SDKToolUseSummaryMessage,
  SDKUserMessage
} from '@anthropic-ai/claude-agent-sdk';
import type { StreamInitContext, TransformContext } from '@cards/sdk/config';
import { defineStreamTransform } from '@cards/sdk/config/factories/stream-transform';

// -- Formatting helpers ------------------------------------------------------

/** Maps known tool names to the input field that should be displayed. */
const TOOL_PARAM_KEY: Record<string, string> = {
  Read: 'file_path',
  Write: 'file_path',
  Edit: 'file_path',
  Bash: 'command',
  Grep: 'pattern',
  Glob: 'pattern',
  Task: 'description',
  Agent: 'description'
};

const BASH_TRUNCATE_LENGTH = 80;

function extractToolParam(name: string, input: unknown): string | undefined {
  const key = TOOL_PARAM_KEY[name];
  if (!key) {
    return undefined;
  }

  const record = input as Record<string, unknown> | undefined;
  const value = record?.[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  if (name === 'Bash' && value.length > BASH_TRUNCATE_LENGTH) {
    return `${value.slice(0, BASH_TRUNCATE_LENGTH)}...`;
  }

  return value;
}

function formatContentBlock(block: { type: string; [key: string]: unknown }): string {
  switch (block.type) {
    case 'text':
      return (block as unknown as { text: string }).text;
    case 'thinking':
      return `> *thinking:* ${(block as unknown as { thinking: string }).thinking}`;
    case 'tool_use': {
      const b = block as unknown as { name: string; input: unknown };
      const param = extractToolParam(b.name, b.input);
      return param ? `**${b.name}** ${param}` : `**${b.name}**`;
    }
    default:
      return '';
  }
}

function formatContentBlocks(blocks: Array<{ type: string; [key: string]: unknown }>): string {
  if (!blocks || blocks.length === 0) {
    return '*(empty response)*';
  }

  return blocks.map(formatContentBlock).filter(Boolean).join('\n\n');
}

function formatAssistant(message: SDKAssistantMessage): string {
  if (message.error) {
    return `**API Error** (${message.error})`;
  }

  return formatContentBlocks(
    (message.message?.content || []) as unknown as Array<{ type: string; [key: string]: unknown }>
  );
}

function formatSystemInit(message: SDKSystemMessage): string {
  const model = message.model || '';
  const toolsCount = message.tools?.length || 0;
  const cwd = message.cwd || '';
  return `**Session Started** | ${model} | ${toolsCount} tools | ${cwd}`;
}

function formatResult(message: SDKResultMessage): string {
  const turns = message.num_turns ?? 0;
  const durationMs = message.duration_ms ?? 0;
  const durationS = Math.round(durationMs / 1000);
  const cost = message.total_cost_usd ?? 0;
  const stats = `${turns} turns | ${durationS}s | $${cost}`;

  if (message.subtype === 'success') {
    return `**Session Complete** | ${stats}`;
  }
  return `**Session Error** (${message.subtype}) | ${stats}`;
}

function formatToolUseSummary(message: SDKToolUseSummaryMessage): string {
  return `**Tool Output:** ${message.summary || ''}`;
}

function formatToolProgress(message: SDKToolProgressMessage): string {
  const toolName = message.tool_name || '';
  const elapsed = message.elapsed_time_seconds ?? 0;
  return `*${toolName} running... (${elapsed}s)*`;
}

// -- User message helpers ----------------------------------------------------

/**
 * Extracts text from a `MessageParam.content` value which can be either a
 * plain string or an array of content blocks.
 *
 * @param content Raw content field from an SDK user message.
 * @returns Extracted text, or an empty string when no text content is found.
 */
function extractUserText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue;
    const b = block as Record<string, unknown>;
    if (b['type'] === 'text' && typeof b['text'] === 'string') {
      parts.push(b['text']);
    } else if (b['type'] === 'tool_result') {
      // Tool results are rendered by tool_use_summary; skip content but note the block.
      const toolId = typeof b['tool_use_id'] === 'string' ? b['tool_use_id'] : '';
      if (b['is_error']) {
        parts.push(`**Tool error** (${toolId})`);
      }
    }
  }
  return parts.join('\n\n');
}

function formatUser(message: SDKUserMessage): string {
  if (message.tool_use_result !== undefined && message.tool_use_result !== null) {
    // Tool result turn — already covered by tool_use_summary
    return '';
  }
  const text = extractUserText(message.message?.content);
  if (!text) return '';
  const prefix = message.isSynthetic ? '**User** *(auto)*: ' : '**User:** ';
  return `${prefix}${text}`;
}

// -- System subtype helpers --------------------------------------------------

function formatStatus(message: SDKStatusMessage): string {
  if (message.status === 'compacting') return '*Compacting context...*';
  return '';
}

function formatCompactBoundary(message: SDKCompactBoundaryMessage): string {
  const trigger = message.compact_metadata?.trigger ?? 'auto';
  const preTokens = message.compact_metadata?.pre_tokens ?? 0;
  return `---\n*Context compacted* (${trigger}) — ${preTokens} tokens before\n\n---`;
}

function formatHookStarted(message: SDKHookStartedMessage): string {
  return `<small>Hook <b>${message.hook_name}</b> (${message.hook_event}) started</small>`;
}

function formatHookProgress(message: SDKHookProgressMessage): string {
  const output = message.output || message.stdout || '';
  return `<small>Hook <b>${message.hook_name}</b>: ${output}</small>`;
}

function formatHookResponse(message: SDKHookResponseMessage): string {
  switch (message.outcome) {
    case 'success':
      return `<small>Hook <b>${message.hook_name}</b> completed</small>`;
    case 'error':
      return `<small>Hook <b>${message.hook_name}</b> failed (exit ${message.exit_code ?? '?'})</small>`;
    case 'cancelled':
      return `<small>Hook <b>${message.hook_name}</b> cancelled</small>`;
    default:
      return `<small>Hook <b>${message.hook_name}</b> ${String(message.outcome)}</small>`;
  }
}

function formatFilesPersisted(message: SDKFilesPersistedEvent): string {
  const saved = message.files?.length ?? 0;
  const failed = message.failed?.length ?? 0;
  if (failed > 0) {
    return `<small>Files persisted: ${saved} saved, ${failed} failed</small>`;
  }
  return `<small>Files persisted: ${saved} saved</small>`;
}

function formatTaskNotification(message: SDKTaskNotificationMessage): string {
  const status = message.status || 'unknown';
  const summary = message.summary || '';
  return `**Task** *${message.task_id}* — ${status}: ${summary}`;
}

// -- Top-level type helpers --------------------------------------------------

function formatAuthStatus(message: SDKAuthStatusMessage): string {
  if (message.error) {
    return `**Auth error:** ${message.error}`;
  }
  if (message.isAuthenticating) {
    return '*Authenticating...*';
  }
  // Auth completed successfully
  return '';
}

/**
 * Routes `type: 'system'` messages to the appropriate subtype formatter.
 *
 * @param message - Parsed system message with a subtype discriminator.
 * @param message.type - Always `'system'`.
 * @param message.subtype - System message subtype discriminator (e.g. `'init'`, `'status'`).
 * @returns Formatted markdown string, or empty string for suppressed subtypes.
 */
function formatSystem(message: { type: 'system'; subtype?: string; [key: string]: unknown }): string {
  switch (message.subtype) {
    case 'init':
      return formatSystemInit(message as unknown as SDKSystemMessage);
    case 'status':
      return formatStatus(message as unknown as SDKStatusMessage);
    case 'compact_boundary':
      return formatCompactBoundary(message as unknown as SDKCompactBoundaryMessage);
    case 'hook_started':
      return formatHookStarted(message as unknown as SDKHookStartedMessage);
    case 'hook_progress':
      return formatHookProgress(message as unknown as SDKHookProgressMessage);
    case 'hook_response':
      return formatHookResponse(message as unknown as SDKHookResponseMessage);
    case 'files_persisted':
      return formatFilesPersisted(message as unknown as SDKFilesPersistedEvent);
    case 'task_notification':
      return formatTaskNotification(message as unknown as SDKTaskNotificationMessage);
    default:
      return '';
  }
}

// -- Init & Transform --------------------------------------------------------

/**
 * Initializes stream state for a new Claude Code session transform.
 *
 * @param context Transform initialization context with mutable state storage.
 * @returns Nothing. The function seeds state in place.
 */
export function handleInit(context: StreamInitContext): void {
  context.state.set('turn', 0);
}

/**
 * Transforms one NDJSON Claude SDK message line into display-friendly text.
 *
 * @param line Raw line read from the stream.
 * @param context Transform context that stores per-session state.
 * @returns Formatted output for known message types, or empty string for unknown types.
 */
export function handleTransform(line: string, context: TransformContext): string {
  if (!line || line.trim().length === 0) {
    return line;
  }

  try {
    const message = JSON.parse(line) as SDKMessage;

    if (message.type === 'assistant') {
      const currentTurn = (context.state.get('turn') as number) || 0;
      context.state.set('turn', currentTurn + 1);
    }

    switch (message.type) {
      case 'assistant':
        return formatAssistant(message);
      case 'user':
        return formatUser(message as SDKUserMessage);
      case 'system':
        return formatSystem(message as { type: 'system'; subtype?: string; [key: string]: unknown });
      case 'result':
        return formatResult(message);
      case 'tool_use_summary':
        return formatToolUseSummary(message);
      case 'tool_progress':
        return formatToolProgress(message);
      case 'auth_status':
        return formatAuthStatus(message as unknown as SDKAuthStatusMessage);
      case 'stream_event':
        // Streaming deltas — the final `assistant` message is the canonical render
        return '';
      default:
        return '';
    }
  } catch {
    return line;
  }
}

// -- Export ------------------------------------------------------------------

export default defineStreamTransform(
  {
    streamType: 'claude-code-session',
    maxLineLength: 1_048_576
  },
  handleTransform,
  handleInit
);
