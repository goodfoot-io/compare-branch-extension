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
import { marked } from 'marked';

// -- HTML helpers ------------------------------------------------------------

/**
 * Escapes HTML special characters in user-supplied text to prevent XSS.
 *
 * @param text Raw text that may contain HTML special characters.
 * @returns Escaped text safe for use in HTML attributes and content.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
    case 'text': {
      const text = (block as unknown as { text: string }).text;
      return `<div class="cc-text">${renderMarkdown(text)}</div>`;
    }
    case 'thinking': {
      const thinking = escapeHtml((block as unknown as { thinking: string }).thinking);
      return `<details class="cc-thinking"><summary>Thinking</summary>${thinking}</details>`;
    }
    case 'tool_use': {
      const b = block as unknown as { name: string; input: unknown };
      const param = extractToolParam(b.name, b.input);
      const nameEscaped = escapeHtml(b.name);
      if (param) {
        const paramEscaped = escapeHtml(param);
        return `<div class="cc-tool" data-tool="${nameEscaped}"><span class="cc-tool-badge">${nameEscaped}</span><code class="cc-tool-param">${paramEscaped}</code></div>`;
      }
      return `<div class="cc-tool" data-tool="${nameEscaped}"><span class="cc-tool-badge">${nameEscaped}</span></div>`;
    }
    default:
      return '';
  }
}

function formatContentBlocks(blocks: Array<{ type: string; [key: string]: unknown }>): string {
  if (!blocks || blocks.length === 0) {
    return '<div class="cc-turn cc-assistant"><em>(empty response)</em></div>';
  }

  const inner = blocks.map(formatContentBlock).filter(Boolean).join('');
  return `<div class="cc-turn cc-assistant">${inner}</div>`;
}

function formatAssistant(message: SDKAssistantMessage): string {
  if (message.error) {
    const errorEscaped = escapeHtml(String(message.error));
    return `<div class="cc-turn cc-assistant"><div class="cc-system"><strong>API Error</strong> (${errorEscaped})</div></div>`;
  }

  return formatContentBlocks(
    (message.message?.content || []) as unknown as Array<{ type: string; [key: string]: unknown }>
  );
}

function formatSystemInit(message: SDKSystemMessage): string {
  const model = escapeHtml(message.model || '');
  const toolsCount = message.tools?.length || 0;
  const cwd = escapeHtml(message.cwd || '');
  return `<div class="cc-system cc-session-start"><strong>Session Started</strong> | ${model} | ${toolsCount} tools | ${cwd}</div>`;
}

function formatResult(message: SDKResultMessage): string {
  const turns = message.num_turns ?? 0;
  const durationMs = message.duration_ms ?? 0;
  const durationS = Math.round(durationMs / 1000);
  const cost = message.total_cost_usd ?? 0;
  const stats = `${turns} turns | ${durationS}s | $${cost}`;

  if (message.subtype === 'success') {
    return `<div class="cc-system cc-session-end"><strong>Session Complete</strong> | ${stats}</div>`;
  }
  const subtype = escapeHtml(message.subtype ?? '');
  return `<div class="cc-system cc-session-end"><strong>Session Error</strong> (${subtype}) | ${stats}</div>`;
}

function formatToolUseSummary(message: SDKToolUseSummaryMessage): string {
  const summary = escapeHtml(message.summary || '');
  return `<div class="cc-tool-result"><strong>Tool Output:</strong> ${summary}</div>`;
}

function formatToolProgress(message: SDKToolProgressMessage): string {
  const toolName = escapeHtml(message.tool_name || '');
  const elapsed = message.elapsed_time_seconds ?? 0;
  return `<div class="cc-system cc-tool-progress"><em>${toolName} running... (${elapsed}s)</em></div>`;
}

// -- User message helpers ----------------------------------------------------

/**
 * Renders a markdown string to HTML using GFM, falling back to escaped text on error.
 *
 * @param text Raw markdown text.
 * @returns Rendered HTML string.
 */
function renderMarkdown(text: string): string {
  try {
    return marked.parse(escapeHtml(text), { gfm: true }) as string;
  } catch {
    return escapeHtml(text);
  }
}

/**
 * Extracts text from a `MessageParam.content` value which can be either a
 * plain string or an array of content blocks.
 *
 * @param content Raw content field from an SDK user message.
 * @returns Extracted HTML string, or an empty string when no text content is found.
 */
function extractUserText(content: unknown): string {
  if (typeof content === 'string') return renderMarkdown(content);
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue;
    const b = block as Record<string, unknown>;
    if (b['type'] === 'text' && typeof b['text'] === 'string') {
      parts.push(renderMarkdown(b['text']));
    } else if (b['type'] === 'tool_result') {
      // Tool results are rendered by tool_use_summary; skip content but note the block.
      const toolId = typeof b['tool_use_id'] === 'string' ? escapeHtml(b['tool_use_id']) : '';
      if (b['is_error']) {
        parts.push(`<strong>Tool error</strong> (${toolId})`);
      }
    }
  }
  return parts.join('');
}

function formatUser(message: SDKUserMessage): string {
  if (message.tool_use_result !== undefined && message.tool_use_result !== null) {
    // Tool result turn — already covered by tool_use_summary
    return '';
  }
  const text = extractUserText(message.message?.content);
  if (!text) return '';
  const roleLabel = message.isSynthetic ? 'User (auto)' : 'User';
  return `<div class="cc-turn cc-user"><div class="cc-role">${roleLabel}</div><div class="cc-text">${text}</div></div>`;
}

// -- System subtype helpers --------------------------------------------------

function formatStatus(message: SDKStatusMessage): string {
  if (message.status === 'compacting') {
    return '<div class="cc-system"><em>Compacting context...</em></div>';
  }
  return '';
}

function formatCompactBoundary(message: SDKCompactBoundaryMessage): string {
  const trigger = escapeHtml(message.compact_metadata?.trigger ?? 'auto');
  const preTokens = message.compact_metadata?.pre_tokens ?? 0;
  return `<div class="cc-system cc-compact-boundary"><hr><em>Context compacted</em> (${trigger}) — ${preTokens} tokens before<hr></div>`;
}

function formatHookStarted(message: SDKHookStartedMessage): string {
  const name = escapeHtml(message.hook_name);
  const event = escapeHtml(message.hook_event);
  return `<div class="cc-system cc-hook">Hook <strong>${name}</strong> (${event}) started</div>`;
}

function formatHookProgress(message: SDKHookProgressMessage): string {
  const name = escapeHtml(message.hook_name);
  const output = escapeHtml(message.output || message.stdout || '');
  return `<div class="cc-system cc-hook">Hook <strong>${name}</strong>: ${output}</div>`;
}

function formatHookResponse(message: SDKHookResponseMessage): string {
  const name = escapeHtml(message.hook_name);
  switch (message.outcome) {
    case 'success':
      return `<div class="cc-system cc-hook">Hook <strong>${name}</strong> completed</div>`;
    case 'error': {
      const exitCode = message.exit_code ?? '?';
      return `<div class="cc-system cc-hook">Hook <strong>${name}</strong> failed (exit ${exitCode})</div>`;
    }
    case 'cancelled':
      return `<div class="cc-system cc-hook">Hook <strong>${name}</strong> cancelled</div>`;
    default: {
      const outcome = escapeHtml(String(message.outcome));
      return `<div class="cc-system cc-hook">Hook <strong>${name}</strong> ${outcome}</div>`;
    }
  }
}

function formatFilesPersisted(message: SDKFilesPersistedEvent): string {
  const saved = message.files?.length ?? 0;
  const failed = message.failed?.length ?? 0;
  if (failed > 0) {
    return `<div class="cc-system">Files persisted: ${saved} saved, ${failed} failed</div>`;
  }
  return `<div class="cc-system">Files persisted: ${saved} saved</div>`;
}

function formatTaskNotification(message: SDKTaskNotificationMessage): string {
  const status = escapeHtml(message.status || 'unknown');
  const summary = escapeHtml(message.summary || '');
  const taskId = escapeHtml(message.task_id);
  return `<div class="cc-system"><strong>Task</strong> <em>${taskId}</em> — ${status}: ${summary}</div>`;
}

// -- Top-level type helpers --------------------------------------------------

function formatAuthStatus(message: SDKAuthStatusMessage): string {
  if (message.error) {
    const error = escapeHtml(message.error);
    return `<div class="cc-system"><strong>Auth error:</strong> ${error}</div>`;
  }
  if (message.isAuthenticating) {
    return '<div class="cc-system"><em>Authenticating...</em></div>';
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
 * @returns Formatted HTML string, or empty string for suppressed subtypes.
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
 * Transforms one NDJSON Claude SDK message line into display-friendly HTML.
 *
 * @param line Raw line read from the stream.
 * @param context Transform context that stores per-session state.
 * @returns Formatted HTML output for known message types, or empty string for unknown types.
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
