/**
 * Single event line in the compact tail display.
 *
 * Shows a colored gutter bar on the left and a truncated text description
 * of the most recent tool call, text excerpt, or error.
 *
 * @summary Compact tail event line: colored gutter dot + text
 * @module components/compact/TailLine
 */

import type React from 'react';
import type { CompactEvent } from '../../lib/parse-session';

/** Gutter color variant for each event kind. */
export type GutterColor = 'blue' | 'green' | 'teal' | 'red';

interface TailLineProps {
  /** The event to display, or null to render nothing. */
  event: CompactEvent | null;
  /** Whether to apply the highlight flash animation class. */
  highlight: boolean;
}

/**
 * Maps event kind to gutter color.
 * @param evt - The compact event to classify.
 * @returns The gutter color variant for this event kind.
 */
function gutterColor(evt: CompactEvent): GutterColor {
  switch (evt.kind) {
    case 'tool-call':
      return 'blue';
    case 'text':
      return 'green';
    case 'subagent-tool-call':
      return 'teal';
    case 'error':
      return 'red';
    default:
      return 'blue';
  }
}

/**
 * Returns inline style for a gutter color since terminal ansi vars aren't in theme.
 * @param color - The gutter color variant.
 * @returns React CSS properties object for the gutter bar.
 */
function gutterStyle(color: GutterColor): React.CSSProperties {
  switch (color) {
    case 'blue':
      return { background: 'var(--vscode-terminal-ansiBlue, #2563eb)' };
    case 'green':
      return { background: 'var(--vscode-terminal-ansiGreen, #16a34a)' };
    case 'teal':
      return { background: 'var(--vscode-terminal-ansiGreen, #16a34a)', opacity: 0.5 };
    case 'red':
      return { background: 'var(--vscode-errorForeground, #f48771)' };
  }
}

/**
 * Truncates text to 120 chars with ellipsis.
 * @param text - The text to truncate.
 * @returns Truncated string with ellipsis appended if needed.
 */
function truncate120(text: string): string {
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

/**
 * Renders a single tail event line with colored gutter and event text.
 * Returns null when event is null.
 * @param root0 - The component props.
 * @param root0.event - The event to display, or null to render nothing.
 * @param root0.highlight - Whether to apply the highlight flash animation class.
 * @returns Rendered tail event row, or null when event is null or unrenderable.
 */
export function TailLine({ event, highlight }: TailLineProps): React.ReactElement | null {
  if (!event) return null;

  const color = gutterColor(event);

  let text: React.ReactNode;
  if (event.kind === 'tool-call' || event.kind === 'subagent-tool-call') {
    text = (
      <>
        <strong>{event.toolName}</strong>
        {event.summary ? ` ${event.summary}` : ''}
      </>
    );
  } else if (event.kind === 'text') {
    text = truncate120(event.text);
  } else if (event.kind === 'error') {
    text = truncate120(event.message);
  } else {
    return null;
  }

  return (
    <div
      className="flex items-center gap-1 min-h-4 text-[0.8em] px-0.5 rounded-sm transition-colors duration-300"
      style={
        highlight
          ? { backgroundColor: 'color-mix(in srgb, var(--vscode-focusBorder, #007fd4) 12%, transparent)' }
          : undefined
      }
    >
      <div className="w-0.5 self-stretch rounded-sm shrink-0" style={gutterStyle(color)} />
      <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-vscode-foreground font-vscode-editor">
        {text}
      </span>
    </div>
  );
}
