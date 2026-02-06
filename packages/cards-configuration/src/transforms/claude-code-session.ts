import type { StreamInitContext, TransformContext } from '../command-types.js';
import { defineStreamTransform } from '../factories/stream-transform.js';

// State key constants
const STATE_TURN = 'turn' as const;
const STATE_MODEL = 'model' as const;

// -- Local interfaces for parsed JSON shapes (no SDK import) -----------------

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

interface AssistantMessage {
  type: 'assistant';
  message: {
    content: ContentBlock[];
    stop_reason?: string;
  };
  error?: { type: string; message: string };
}

interface SystemMessage {
  type: 'system';
  subtype: string;
  model?: string;
  available_tools?: Array<{ name: string }>;
  cwd?: string;
}

interface ResultMessage {
  type: 'result';
  subtype: string;
  turn_count: number;
  duration_seconds: number;
  total_cost_usd: number;
}

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

// -- Formatting helpers ------------------------------------------------------

/** Maps known tool names to the input field that should be displayed. */
const TOOL_PARAM_KEY: Record<string, string> = {
  Read: 'file_path',
  Write: 'file_path',
  Edit: 'file_path',
  Bash: 'command',
  Grep: 'pattern',
  Glob: 'pattern',
  Task: 'description'
};

const BASH_TRUNCATE_LENGTH = 80;

function extractToolParam(block: ToolUseBlock): string | undefined {
  const key = TOOL_PARAM_KEY[block.name];
  if (!key) {
    return undefined;
  }

  const value = block.input?.[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  if (block.name === 'Bash' && value.length > BASH_TRUNCATE_LENGTH) {
    return `${value.slice(0, BASH_TRUNCATE_LENGTH)}...`;
  }

  return value;
}

function formatContentBlock(block: ContentBlock): string {
  switch (block.type) {
    case 'text':
      return block.text;
    case 'thinking':
      return `> *thinking:* ${block.thinking}`;
    case 'tool_use': {
      const param = extractToolParam(block);
      return param ? `**${block.name}** ${param}` : `**${block.name}**`;
    }
    default:
      return '';
  }
}

function formatContentBlocks(blocks: ContentBlock[]): string {
  if (!blocks || blocks.length === 0) {
    return '*(empty response)*';
  }

  return blocks.map(formatContentBlock).filter(Boolean).join('\n\n');
}

function formatAssistant(message: AssistantMessage): string {
  if (message.error) {
    const errorType = message.error.type || 'unknown';
    const parts = [`**API Error** (${errorType})`];
    if (message.error.message) {
      parts.push(message.error.message);
    }
    return parts.join('\n\n');
  }

  return formatContentBlocks(message.message?.content || []);
}

function formatSystemInit(message: SystemMessage): string {
  const model = message.model || '';
  const toolsCount = message.available_tools?.length || 0;
  const cwd = message.cwd || '';
  return `**Session Started** | ${model} | ${toolsCount} tools | ${cwd}`;
}

function formatResult(message: ResultMessage): string {
  const turns = message.turn_count ?? 0;
  const duration = message.duration_seconds ?? 0;
  const cost = message.total_cost_usd ?? 0;
  const stats = `${turns} turns | ${duration}s | $${cost}`;

  if (message.subtype === 'success') {
    return `**Session Complete** | ${stats}`;
  }
  return `**Session Error** (${message.subtype}) | ${stats}`;
}

function formatToolUseSummary(message: ToolUseSummaryMessage): string {
  return `**Tool Output:** ${message.summary || ''}`;
}

function formatToolProgress(message: ToolProgressMessage): string {
  const toolName = message.tool_name || '';
  const elapsed = message.elapsed_time_seconds ?? 0;
  return `*${toolName} running... (${elapsed}s)*`;
}

// -- Init & Transform --------------------------------------------------------

function handleInit(context: StreamInitContext): void {
  context.state.set(STATE_TURN, 0);
  context.state.set(STATE_MODEL, '');
}

function handleTransform(line: string, context: TransformContext): string {
  if (!line || line.trim().length === 0) {
    return line;
  }

  try {
    const message = JSON.parse(line) as SDKMessage;

    if (message.type === 'assistant' && context.state) {
      const currentTurn = (context.state.get(STATE_TURN) as number) || 0;
      context.state.set(STATE_TURN, currentTurn + 1);
    }

    switch (message.type) {
      case 'assistant':
        return formatAssistant(message);
      case 'system':
        if (message.subtype === 'init') {
          return formatSystemInit(message);
        }
        return line;
      case 'result':
        return formatResult(message);
      case 'tool_use_summary':
        return formatToolUseSummary(message);
      case 'tool_progress':
        return formatToolProgress(message);
      default:
        return line;
    }
  } catch {
    return line;
  }
}

// -- Export ------------------------------------------------------------------

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
