/**
 * Shared structural separator for the expanded transcript.
 *
 * Renders a single "line – label – line" shape for every kind of transcript
 * boundary — turn, result, and compaction — so all three read as "the same
 * kind of thing happened" instead of each renderer inventing its own shape
 * (a bordered box for one, a bare `<hr>` for another). Only the label text
 * varies; the shape is fixed.
 *
 * @summary Shared line–label–line boundary separator (turn/result/compaction)
 * @module streams/lib/Boundary
 */

import type React from 'react';

interface BoundaryProps {
  /** Which kind of structural marker this separator represents. Drives no styling — only documents intent at call sites. */
  kind: 'turn' | 'result' | 'compaction';
  /** Label text shown between the two divider lines (e.g. "Session complete · 4 turns · 12s"). Empty renders a bare hairline with no label, for quieter structural markers. */
  label: string;
  /** Full detail shown as a hover tooltip (e.g. a full turn id) — used when the visible label is abbreviated or omitted entirely. */
  tooltip?: string;
}

/**
 * Centered "line – label – line" separator shared by turn, result, and
 * compaction boundaries. An empty `label` renders a bare hairline (no label
 * span, no gap) instead of the line-label-line shape — for structural markers
 * quiet enough that a visible label would dominate the line (see the codex
 * `turn_boundary` converter case).
 * @param root0 - The component props.
 * @param root0.kind - Which kind of structural marker this separator represents.
 * @param root0.label - Label text shown between the two divider lines. Empty renders a bare hairline.
 * @param root0.tooltip - Full detail shown as a hover tooltip.
 * @returns Rendered boundary separator element.
 */
export function Boundary({ kind, label, tooltip }: BoundaryProps): React.ReactElement {
  const hasLabel = label.length > 0;
  return (
    <div
      className={`stream-boundary${hasLabel ? '' : ' stream-boundary--bare'}`}
      data-boundary-kind={kind}
      title={tooltip}
    >
      <span className="stream-boundary__line" />
      {hasLabel && <span className="stream-boundary__label">{label}</span>}
      <span className="stream-boundary__line" />
    </div>
  );
}
