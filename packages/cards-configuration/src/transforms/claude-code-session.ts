import type { StreamInitContext, TransformContext } from '../command-types.js';
import { defineStreamTransform } from '../factories/stream-transform.js';

// ============================================================================
// State Key Constants
// ============================================================================

const STATE_TURN = 'turn' as const;
const STATE_MODEL = 'model' as const;

// ============================================================================
// Local TypeScript Interfaces (NO SDK import)
// ============================================================================

interface TextBlock {
  type: 'text';
  text: string;
}

interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock;

interface ErrorInfo {
  type: string;
  message: string;
}

interface AssistantMessage {
  type: 'assistant';
  message: {
    content: ContentBlock[];
    stop_reason?: string;
  };
  error?: ErrorInfo;
}

interface SystemMessage {
  type: 'system';
  subtype: string;
  // Init-specific fields
  model?: string;
  available_tools?: Array<{ name: string }>;
  cwd?: string;
}

interface ResultSuccessMessage {
  type: 'result';
  subtype: 'success';
  turn_count: number;
  duration_seconds: number;
  total_cost_usd: number;
}

interface ResultErrorMessage {
  type: 'result';
  subtype: string; // 'error_during_execution', etc.
  turn_count: number;
  duration_seconds: number;
  total_cost_usd: number;
}

type ResultMessage = ResultSuccessMessage | ResultErrorMessage;

interface ToolUseSummaryMessage {
  type: 'tool_use_summary';
  summary: string;
}

interface ToolProgressMessage {
  type: 'tool_progress';
  tool_name: string;
  elapsed_time_seconds: number;
}

type SDKMessage = AssistantMessage | SystemMessage | ResultMessage | ToolUseSummaryMessage | ToolProgressMessage;

// ============================================================================
// Internal Formatting Helper Functions
// ============================================================================

function formatTextBlock(block: TextBlock): string {
  return block.text;
}

function formatThinkingBlock(block: ThinkingBlock): string {
  return `> *thinking:* ${block.thinking}`;
}

function formatToolUseBlock(block: ToolUseBlock): string {
  const toolName = block.name;
  const input = block.input;

  // Extract specific parameter based on tool name
  let paramValue: string | undefined;

  switch (toolName) {
    case 'Read':
    case 'Write':
    case 'Edit':
      paramValue = typeof input?.file_path === 'string' ? input.file_path : undefined;
      break;
    case 'Bash':
      paramValue = typeof input?.command === 'string' ? input.command : undefined;
      // Truncate command to ~80 chars
      if (paramValue && paramValue.length > 80) {
        paramValue = `${paramValue.slice(0, 80)}...`;
      }
      break;
    case 'Grep':
      paramValue = typeof input?.pattern === 'string' ? input.pattern : undefined;
      break;
    case 'Glob':
      paramValue = typeof input?.pattern === 'string' ? input.pattern : undefined;
      break;
    case 'Task':
      paramValue = typeof input?.description === 'string' ? input.description : undefined;
      break;
    default:
      // Unknown tool - just render tool name
      paramValue = undefined;
  }

  if (paramValue) {
    return `**${toolName}** ${paramValue}`;
  }
  return `**${toolName}**`;
}

function formatContentBlocks(blocks: ContentBlock[]): string {
  if (!blocks || blocks.length === 0) {
    return '*(empty response)*';
  }

  const formatted = blocks
    .map((block) => {
      switch (block.type) {
        case 'text':
          return formatTextBlock(block);
        case 'thinking':
          return formatThinkingBlock(block);
        case 'tool_use':
          return formatToolUseBlock(block);
        default:
          return '';
      }
    })
    .filter(Boolean);

  return formatted.join('\n\n');
}

function formatAssistantMessage(message: AssistantMessage): string {
  // Check for error first
  if (message.error) {
    const errorType = message.error.type || 'unknown';
    const errorMessage = message.error.message || '';
    return `**API Error** (${errorType})\n\n${errorMessage}`;
  }

  return formatContentBlocks(message.message?.content || []);
}

function formatSystemMessage(message: SystemMessage): string {
  if (message.subtype === 'init') {
    const model = message.model || '';
    const toolsCount = message.available_tools?.length || 0;
    const cwd = message.cwd || '';
    return `**Session Started** | ${model} | ${toolsCount} tools | ${cwd}`;
  }

  // Unhandled subtype - return empty to trigger fallthrough
  return '';
}

function formatResultMessage(message: ResultMessage): string {
  const turns = message.turn_count ?? 0;
  const duration = message.duration_seconds ?? 0;
  const cost = message.total_cost_usd ?? 0;

  if (message.subtype === 'success') {
    return `**Session Complete** | ${turns} turns | ${duration}s | $${cost}`;
  }

  // Error result
  return `**Session Error** (${message.subtype}) | ${turns} turns | ${duration}s | $${cost}`;
}

function formatToolUseSummary(message: ToolUseSummaryMessage): string {
  return `**Tool Output:** ${message.summary || ''}`;
}

function formatToolProgress(message: ToolProgressMessage): string {
  const toolName = message.tool_name || '';
  const elapsed = message.elapsed_time_seconds ?? 0;
  return `*${toolName} running... (${elapsed}s)*`;
}

// ============================================================================
// Init Handler
// ============================================================================

function handleInit(context: StreamInitContext): void {
  context.state.set(STATE_TURN, 0);
  context.state.set(STATE_MODEL, '');
}

// ============================================================================
// Transform Handler
// ============================================================================

function handleTransform(line: string, context: TransformContext): string {
  // Return empty/whitespace lines unchanged
  if (!line || line.trim().length === 0) {
    return line;
  }

  try {
    const message = JSON.parse(line) as SDKMessage;

    // Increment turn counter for assistant messages (if state exists)
    if (message.type === 'assistant' && context.state) {
      const currentTurn = (context.state.get(STATE_TURN) as number) || 0;
      context.state.set(STATE_TURN, currentTurn + 1);
    }

    // Format based on message type
    switch (message.type) {
      case 'assistant':
        return formatAssistantMessage(message);
      case 'system': {
        const formatted = formatSystemMessage(message);
        return formatted || line; // Fallthrough if unhandled subtype
      }
      case 'result':
        return formatResultMessage(message);
      case 'tool_use_summary':
        return formatToolUseSummary(message);
      case 'tool_progress':
        return formatToolProgress(message);
      default:
        // Unknown type - return raw line
        return line;
    }
  } catch {
    // Malformed JSON - return raw line
    return line;
  }
}

// ============================================================================
// Export Transform
// ============================================================================

export const claudeCodeSessionTransform = defineStreamTransform(
  {
    streamType: 'claude-code-session',
    sourcePath: import.meta.filename,
    maxLineLength: 1_048_576
  },
  handleTransform,
  handleInit
);

export default claudeCodeSessionTransform;
