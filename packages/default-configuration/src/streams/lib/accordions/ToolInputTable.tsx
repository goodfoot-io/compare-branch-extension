/**
 * Key-value input table for tool accordions.
 *
 * Renders tool input fields as a table with key (dimmed) and value (clipped
 * for long entries). An object/array-valued input renders through the shared
 * {@link JsonBlock} (pretty-printed, 2-space) instead of a single-line
 * `JSON.stringify` blob. Skips keys in `skipKeys` and omits the table entirely
 * when `hidden` is set.
 *
 * @summary Tool input key-value table with gradient-fade clipping
 * @module streams/lib/accordions/ToolInputTable
 */

import type React from 'react';
import { JsonBlock } from '../JsonBlock';

interface ToolInputTableProps {
  /** Tool input object. */
  input: Record<string, unknown>;
  /** When true, the table is omitted entirely (e.g. a provider's Skill tool). */
  hidden?: boolean;
  /** Input keys to skip (shown elsewhere or redundant). */
  skipKeys?: Set<string>;
}

/**
 * Renders tool inputs as a bordered key-value table.
 * Returns null when there are no displayable entries.
 * @param root0 - The component props.
 * @param root0.input - Tool input object.
 * @param root0.hidden - When true, the table is omitted entirely.
 * @param root0.skipKeys - Input keys to skip.
 * @returns Rendered key-value table, or null when nothing to display.
 */
export function ToolInputTable({
  input,
  hidden = false,
  skipKeys = new Set()
}: ToolInputTableProps): React.ReactElement | null {
  if (hidden) return null;

  const entries = Object.entries(input).filter(([k]) => !skipKeys.has(k));
  if (entries.length === 0) return null;

  return (
    <table
      className="border-collapse font-vscode-editor w-full"
      style={{ borderCollapse: 'collapse', fontSize: 'var(--stream-text-dense)' }}
    >
      <tbody>
        {entries.map(([key, value]) => {
          // Object/array values get the pretty-printed JsonBlock treatment
          // rather than a dense single-line JSON.stringify blob — never
          // clipped, since JsonBlock's own wrapping handles long content.
          const isStructured = value !== null && typeof value === 'object';
          const valStr = isStructured ? '' : stringifyValue(value);
          const isShort = !isStructured && valStr.length < 120 && valStr.split('\n').length <= 2;
          const valueNode = isStructured ? (
            <JsonBlock value={value} />
          ) : value === null || value === undefined ? (
            <em>null</em>
          ) : (
            truncateValue(valStr)
          );
          return (
            <tr key={key}>
              <td
                className="text-vscode-descriptionForeground opacity-50 text-left whitespace-nowrap w-px pr-3 align-top py-1.5"
                style={{
                  borderTop: '0.5px solid var(--stream-border-subtle)'
                }}
              >
                {key}
              </td>
              <td
                className={`text-vscode-foreground break-words whitespace-pre-wrap align-top py-1.5${isShort ? '' : ' cc-tool-val-clip'}`}
                style={{
                  borderTop: '0.5px solid var(--stream-border-subtle)',
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
