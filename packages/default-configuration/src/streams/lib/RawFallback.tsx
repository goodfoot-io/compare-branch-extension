/**
 * Shared fallback renderer for stream content with no dedicated component.
 *
 * Displays the raw JSON of unrecognized/unparseable content via the shared
 * `JsonBlock`, prefixed by a severity-aware icon + label so unhandled
 * content stays visible (never silently dropped) and its severity is
 * conveyed honestly: most unrecognized content is merely unclassified, not
 * an error, so `info` is the default — only genuine tool/session errors
 * should pass `severity="error"`.
 *
 * @summary Severity-aware raw/unknown-content fallback block
 * @module streams/lib/RawFallback
 */

import type React from 'react';
import { JsonBlock } from './JsonBlock';

/** Severity of the unrecognized/fallback content — drives icon + color only. */
export type RawFallbackSeverity = 'info' | 'warning' | 'error';

interface RawFallbackProps {
  /** The value to display as pretty-printed JSON (or a raw string). */
  data: unknown;
  /** Optional label shown before the payload (e.g. "Unrecognized message", "Malformed line"). */
  label?: string;
  /** Severity of the fallback content. Defaults to `info` — unrecognized is not the same as erroneous. */
  severity?: RawFallbackSeverity;
}

const SEVERITY_ICON: Record<RawFallbackSeverity, string> = {
  info: 'codicon-info',
  warning: 'codicon-warning',
  error: 'codicon-error'
};

const SEVERITY_COLOR: Record<RawFallbackSeverity, string> = {
  info: 'var(--stream-fg-muted)',
  warning: 'var(--stream-severity-warning-fg)',
  error: 'var(--stream-severity-error-fg)'
};

/**
 * Renders unrecognized/fallback content as a severity-aware labeled JSON block.
 * @param root0 - The component props.
 * @param root0.data - The value to display.
 * @param root0.label - Optional label shown before the payload.
 * @param root0.severity - Severity of the fallback content.
 * @returns Rendered fallback block element.
 */
export function RawFallback({ data, label, severity = 'info' }: RawFallbackProps): React.ReactElement {
  const color = SEVERITY_COLOR[severity];
  return (
    <div className="my-0.5" style={{ borderLeft: `2px solid ${color}` }}>
      {label !== undefined && (
        <div className="stream-block-label flex items-center gap-1" style={{ color }}>
          <span className={`codicon ${SEVERITY_ICON[severity]}`} />
          {label}
        </div>
      )}
      <JsonBlock value={data} />
    </div>
  );
}
