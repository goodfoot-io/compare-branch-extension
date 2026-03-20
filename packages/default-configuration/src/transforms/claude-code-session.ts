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
  SDKToolUseSummaryMessage,
  SDKUserMessage
} from '@anthropic-ai/claude-agent-sdk';
import type { StreamInitContext, TransformContext } from '@cards/sdk/config';
import { defineStreamTransform } from '@cards/sdk/config/factories/stream-transform';
import { marked, Renderer } from 'marked';

// -- Types -------------------------------------------------------------------

/** Buffered tool_use block stored in transform state until its summary arrives. */
interface PendingToolUse {
  name: string;
  input: Record<string, unknown>;
}

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

/** Renderer that escapes raw HTML instead of passing it through verbatim. */
const safeRenderer = new Renderer();
safeRenderer.html = ({ text }: { text: string }) => escapeHtml(text);

// -- Formatting helpers ------------------------------------------------------

const VALUE_TRUNCATE_LENGTH = 120;

/**
 * Truncates a string value for display in the tool input table.
 *
 * @param value Raw string value from tool input.
 * @returns Truncated string with ellipsis if over the limit.
 */
function truncateValue(value: string): string {
  if (value.length > VALUE_TRUNCATE_LENGTH) {
    return `${value.slice(0, VALUE_TRUNCATE_LENGTH)}...`;
  }
  return value;
}

/**
 * Formats a tool input value as an escaped, truncated string for display.
 * Non-string values are serialized to JSON first.
 *
 * @param value Raw value from tool input.
 * @returns Escaped HTML string safe for table cell content.
 */
function formatInputValue(value: unknown): string {
  if (typeof value === 'string') {
    return escapeHtml(truncateValue(value));
  }
  if (value === null || value === undefined) {
    return '<em>null</em>';
  }
  return escapeHtml(truncateValue(JSON.stringify(value)));
}

/**
 * Renders tool input parameters as a minimal two-column table.
 * Parameter names are right-aligned; values are left-aligned.
 *
 * @param name Tool name for the badge.
 * @param input Tool input parameters.
 * @returns HTML string containing the tool badge and input table.
 */
function formatToolInputTable(name: string, input: Record<string, unknown>): string {
  const nameEscaped = escapeHtml(name);
  const entries = Object.entries(input);

  let rows = '';
  for (const [key, value] of entries) {
    const keyEscaped = escapeHtml(key);
    rows += `<tr><td class="cc-tool-input-key">${keyEscaped}</td><td class="cc-tool-input-val">${formatInputValue(value)}</td></tr>`;
  }

  const table = rows.length > 0 ? `<table class="cc-tool-input">${rows}</table>` : '';
  return `<div class="cc-tool-pair" data-tool="${nameEscaped}"><span class="cc-tool-badge">${nameEscaped}</span>${table}</div>`;
}

/**
 * Renders a markdown string to HTML using GFM, falling back to escaped text on error.
 *
 * @param text Raw markdown text.
 * @returns Rendered HTML string.
 */
function renderMarkdown(text: string): string {
  try {
    return marked.parse(text, { gfm: true, renderer: safeRenderer }) as string;
  } catch {
    return escapeHtml(text);
  }
}

// -- Content block formatting ------------------------------------------------

/**
 * Formats a single assistant content block (text or thinking only).
 * tool_use blocks are handled separately via buffering.
 *
 * @param block Content block from an assistant message.
 * @param block.type Discriminator for the content block kind.
 * @returns Formatted HTML string, or empty string for non-renderable blocks.
 */
function formatContentBlock(block: { type: string; [key: string]: unknown }): string {
  switch (block.type) {
    case 'text': {
      const text = (block as unknown as { text: string }).text;
      return `<div class="cc-text">${renderMarkdown(text)}</div>`;
    }
    case 'thinking': {
      const thinking = escapeHtml((block as unknown as { thinking: string }).thinking);
      return `<div class="cc-thinking"><div class="cc-thinking-label">Thinking</div>${thinking}</div>`;
    }
    default:
      return '';
  }
}

/**
 * Formats an assistant message, buffering tool_use blocks into state.
 * Only text and thinking blocks are rendered inline in the assistant turn.
 *
 * @param message Parsed assistant message from the SDK.
 * @param pendingToolUses Map to buffer tool_use blocks into.
 * @returns HTML string for the assistant turn (may be empty if only tool_use blocks).
 */
function formatAssistant(message: SDKAssistantMessage, pendingToolUses: Map<string, PendingToolUse>): string {
  if (message.error) {
    const errorEscaped = escapeHtml(String(message.error));
    return `<div class="cc-turn cc-assistant"><div class="cc-system"><strong>API Error</strong> (${errorEscaped})</div></div>`;
  }

  const blocks = (message.message?.content || []) as unknown as Array<{ type: string; [key: string]: unknown }>;

  // Buffer tool_use blocks into state
  for (const block of blocks) {
    if (block.type === 'tool_use') {
      const b = block as unknown as { id: string; name: string; input: unknown };
      pendingToolUses.set(b.id, {
        name: b.name,
        input: (b.input as Record<string, unknown>) ?? {}
      });
    }
  }

  // Render non-tool blocks
  const nonToolBlocks = blocks.filter((b) => b.type !== 'tool_use');
  if (nonToolBlocks.length === 0) {
    return '';
  }

  const inner = nonToolBlocks.map(formatContentBlock).filter(Boolean).join('');
  if (!inner) {
    return '';
  }

  return `<div class="cc-turn cc-assistant">${inner}</div>`;
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

/**
 * Formats a tool_use_summary message by pairing it with its buffered tool_use block.
 * Renders the tool input table above the summary text.
 *
 * @param message Parsed tool_use_summary message.
 * @param pendingToolUses Map of buffered tool_use blocks.
 * @returns HTML string containing the paired tool call and result.
 */
function formatToolUseSummary(message: SDKToolUseSummaryMessage, pendingToolUses: Map<string, PendingToolUse>): string {
  const summary = escapeHtml(message.summary || '');
  const ids = message.preceding_tool_use_ids ?? [];

  let toolHeader = '';
  for (const id of ids) {
    const pending = pendingToolUses.get(id);
    if (pending) {
      toolHeader += formatToolInputTable(pending.name, pending.input);
      pendingToolUses.delete(id);
    }
  }

  return `${toolHeader}<div class="cc-tool-result">${summary}</div>`;
}

// -- User message helpers ----------------------------------------------------

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
  return `<div class="cc-turn cc-user"><div class="cc-text">${text}</div></div>`;
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
  context.state.set('pendingToolUses', new Map<string, PendingToolUse>());
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
    const pendingToolUses =
      (context.state.get('pendingToolUses') as Map<string, PendingToolUse> | undefined) ??
      new Map<string, PendingToolUse>();

    if (message.type === 'assistant') {
      const currentTurn = (context.state.get('turn') as number) || 0;
      context.state.set('turn', currentTurn + 1);
    }

    switch (message.type) {
      case 'assistant':
        return formatAssistant(message, pendingToolUses);
      case 'user':
        return formatUser(message as SDKUserMessage);
      case 'system':
        return formatSystem(message as { type: 'system'; subtype?: string; [key: string]: unknown });
      case 'result':
        return formatResult(message);
      case 'tool_use_summary':
        return formatToolUseSummary(message, pendingToolUses);
      case 'tool_progress':
        return '';
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
