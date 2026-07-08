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
  /** Label text shown between the two divider lines (e.g. "Session complete · 4 turns · 12s"). */
  label: string;
}

/**
 * Centered "line – label – line" separator shared by turn, result, and
 * compaction boundaries.
 * @param root0 - The component props.
 * @param root0.kind - Which kind of structural marker this separator represents.
 * @param root0.label - Label text shown between the two divider lines.
 * @returns Rendered boundary separator element.
 */
export function Boundary({ kind, label }: BoundaryProps): React.ReactElement {
  return (
    <div className="stream-boundary" data-boundary-kind={kind}>
      <span className="stream-boundary__line" />
      <span className="stream-boundary__label">{label}</span>
      <span className="stream-boundary__line" />
    </div>
  );
}
