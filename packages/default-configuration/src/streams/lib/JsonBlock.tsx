/**
 * Shared JSON display block.
 *
 * Renders structured JSON (an already-parsed value, or a JSON string) as
 * pretty-printed (2-space), theme-consistent code — the same visual
 * treatment as a markdown fenced code block, so JSON reads consistently
 * wherever a renderer shows structured tool input/output instead of falling
 * back to a raw, unformatted string.
 *
 * @summary Shared pretty-printed JSON block component
 * @module streams/lib/JsonBlock
 */

import type React from 'react';

interface JsonBlockProps {
  /** The value to display: a parsed value, or a JSON string to parse. */
  value: unknown;
}

/**
 * Renders a value as a pretty-printed (2-space) JSON block. String values
 * are parsed as JSON first; a value that is a string but not valid JSON is
 * common (e.g. a tool error message) rather than exceptional, so it falls
 * back to showing the raw string as-is instead of being dropped.
 * @param root0 - The component props.
 * @param root0.value - The value to display.
 * @returns The rendered JSON block element.
 */
export function JsonBlock({ value }: JsonBlockProps): React.ReactElement {
  return (
    <pre className="json-block">
      <code>{stringify(value)}</code>
    </pre>
  );
}

function stringify(value: unknown): string {
  if (typeof value === 'string') {
    // Not every string handed to JsonBlock is JSON (e.g. a plain error
    // message) — parse failure is an expected outcome here, not a bug, so it
    // falls back to the raw string rather than logging.
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  if (value === undefined) return 'undefined';
  try {
    const pretty = JSON.stringify(value, null, 2);
    return pretty ?? String(value);
  } catch (error) {
    console.warn('JsonBlock: JSON.stringify failed, using String() fallback', error);
    return String(value);
  }
}
