import type {
  SDKAssistantMessage,
  SDKMessage,
  SDKResultMessage,
  SDKSystemMessage,
  SDKToolProgressMessage,
  SDKToolUseSummaryMessage
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
  Task: 'description'
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

  return formatContentBlocks(message.message?.content || []);
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

// -- Init & Transform --------------------------------------------------------

export function handleInit(context: StreamInitContext): void {
  context.state.set('turn', 0);
}

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

export default defineStreamTransform(
  {
    streamType: 'claude-code-session',
    maxLineLength: 1_048_576
  },
  handleTransform,
  handleInit
);
