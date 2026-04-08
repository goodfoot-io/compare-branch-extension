/**
 * Key-value input table for tool accordions.
 *
 * Renders tool input fields as a table with key (dimmed) and value (clipped
 * for long entries). Skips keys in SKIP_INPUT_KEYS and all entries for Skill.
 *
 * @summary Tool input key-value table with gradient-fade clipping
 * @module components/accordions/ToolInputTable
 */

import type React from 'react';

/** Input keys skipped in the tool input table (shown elsewhere or redundant). */
const SKIP_INPUT_KEYS = new Set([
  'description',
  'timeout',
  'dangerouslyDisableSandbox',
  'run_in_background',
  'saveAllEditors',
  'summary'
]);

interface ToolInputTableProps {
  /** Tool name — if "Skill", the table is omitted entirely. */
  toolName: string;
  /** Tool input object. */
  input: Record<string, unknown>;
}

/**
 * Renders tool inputs as a bordered key-value table.
 * Returns null when there are no displayable entries.
 * @param root0 - The component props.
 * @param root0.toolName - Tool name — if "Skill", the table is omitted entirely.
 * @param root0.input - Tool input object.
 * @returns Rendered key-value table, or null when nothing to display.
 */
export function ToolInputTable({ toolName, input }: ToolInputTableProps): React.ReactElement | null {
  if (toolName === 'Skill') return null;

  const entries = Object.entries(input).filter(([k]) => !SKIP_INPUT_KEYS.has(k));
  if (entries.length === 0) return null;

  return (
    <table className="border-collapse text-[0.85em] font-vscode-editor w-full" style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {entries.map(([key, value]) => {
          const valStr = stringifyValue(value);
          const isShort = valStr.length < 120 && valStr.split('\n').length <= 2;
          const valueNode = value === null || value === undefined ? <em>null</em> : truncateValue(valStr);
          return (
            <tr key={key}>
              <td
                className="text-vscode-descriptionForeground opacity-50 text-left whitespace-nowrap w-px pr-3 align-top py-1.5 pl-1"
                style={{
                  borderTop: '0.5px solid var(--vscode-inlineChatInput-border, var(--vscode-panel-border, #3c3c3c))'
                }}
              >
                {key}
              </td>
              <td
                className={`text-vscode-foreground break-words whitespace-pre-wrap align-top py-1.5 pr-2${isShort ? '' : ' cc-tool-val-clip'}`}
                style={{
                  borderTop: '0.5px solid var(--vscode-inlineChatInput-border, var(--vscode-panel-border, #3c3c3c))',
                  maxHeight: isShort ? undefined : '60px',
                  overflow: isShort ? undefined : 'hidden'
                }}
              >
                {valueNode}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return 'null';
  return JSON.stringify(value) ?? 'null';
}

function truncateValue(value: string): string {
  return value.length > 200 ? `${value.slice(0, 200)}…` : value;
}
