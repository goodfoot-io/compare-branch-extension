/**
 * Tool name summarization for compact and expanded views.
 *
 * Provides `summarizeTool` to generate a short preview string from a tool
 * call's name and input, and `INFRASTRUCTURE_TOOLS` to identify coordination
 * tools that should be deprioritized in the compact tail display.
 *
 * @summary Tool preview generation and infrastructure tool classification
 * @module lib/tool-summary
 */

import { truncate } from './markdown';

/** Tool names that are coordination infrastructure, not user-visible work. */
export const INFRASTRUCTURE_TOOLS = new Set([
  'TaskUpdate',
  'TaskCreate',
  'TaskGet',
  'TaskList',
  'TaskOutput',
  'TaskStop',
  'ToolSearch',
  'TeamCreate',
  'TeamDelete',
  'Skill',
  'CronCreate',
  'CronDelete',
  'CronList',
  'RemoteTrigger'
]);

/** Tool names that actively change state or run code (shown with amber tint). */
export const WRITE_TOOLS = new Set([
  'Bash',
  'Write',
  'Edit',
  'MultiEdit',
  'Agent',
  'mcp__plugin_vscode_vscode__execute_command'
]);

/**
 * Returns a short, human-readable preview string for a tool call.
 * Extracts the most meaningful part of the input for each known tool type.
 *
 * @param toolName - Name of the tool being called
 * @param input - Tool input object (may be null or undefined)
 * @returns Short human-readable preview string, or empty string if no meaningful value.
 */
export function summarizeTool(toolName: string, input: Record<string, unknown> | null | undefined): string {
  if (!input) return '';
  switch (toolName) {
    case 'Bash': {
      const desc = input['description'];
      const cmd = input['command'];
      return typeof desc === 'string' && desc ? desc : truncate(typeof cmd === 'string' ? cmd : '', 80);
    }
    case 'Read':
    case 'Edit':
    case 'Write':
    case 'MultiEdit': {
      const fp = typeof input['file_path'] === 'string' ? input['file_path'] : '';
      const parts = fp.split('/');
      return parts.slice(-2).join('/');
    }
    case 'Grep': {
      const pattern = input['pattern'];
      return typeof pattern === 'string' ? `/${pattern}/` : '';
    }
    case 'Glob': {
      const pattern = input['pattern'];
      return typeof pattern === 'string' ? pattern : '';
    }
    case 'WebFetch':
    case 'WebSearch': {
      const url = input['url'];
      const query = input['query'];
      const val = typeof url === 'string' ? url : typeof query === 'string' ? query : '';
      return truncate(val, 80);
    }
    case 'Agent': {
      const desc = input['description'];
      return typeof desc === 'string' ? desc : '';
    }
    case 'SendMessage': {
      const summary = input['summary'];
      return typeof summary === 'string' && summary ? summary : '';
    }
    default: {
      const skill = input['skill'];
      return typeof skill === 'string' ? skill : '';
    }
  }
}
