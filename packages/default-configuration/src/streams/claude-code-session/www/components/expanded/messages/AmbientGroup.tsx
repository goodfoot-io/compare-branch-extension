/**
 * Ambient attachment grouping for the expanded transcript.
 *
 * A run of consecutive ambient-tier attachment rows reads as background state,
 * not conversation. {@link AmbientGroup} folds such a run into one bordered zone
 * — mirroring {@link ToolGroup}'s top/bottom rule — so the muted rows cohere
 * into a single block instead of scattering. When the run is large (more rows
 * than {@link AMBIENT_SUMMARY_THRESHOLD}), the zone collapses to a single
 * `context updated · N changes` summary line rather than listing every row.
 *
 * {@link AmbientRow} is the referential marker the {@link MessageRouter}
 * grouping sweep matches on (`node.type === AmbientRow`) to identify which nodes
 * are ambient — analogous to how the tool sweep matches `ToolAccordion`. It is a
 * transparent pass-through wrapper that carries no styling of its own, so the
 * tool-grouping invariant (which keys off `ToolAccordion`) is untouched.
 *
 * @summary Container folding consecutive ambient attachment rows into one zone
 * @module components/expanded/messages/AmbientGroup
 */

import type React from 'react';

/**
 * Row count past which an AmbientGroup collapses to a single summary line
 * instead of rendering every ambient row.
 */
export const AMBIENT_SUMMARY_THRESHOLD = 5;

interface AmbientRowProps {
  /** The ambient-tier presenter element this marker wraps. */
  children: React.ReactNode;
}

/**
 * Transparent marker wrapping a single ambient-tier attachment row so the
 * MessageRouter grouping sweep can identify it by referential type.
 * @param root0 - The component props.
 * @param root0.children - The ambient-tier presenter element to wrap.
 * @returns The wrapped child as a fragment (no added DOM or styling).
 */
export function AmbientRow({ children }: AmbientRowProps): React.ReactElement {
  return <>{children}</>;
}

interface AmbientGroupProps {
  /** The consecutive AmbientRow elements to fold into one zone. */
  rows: React.ReactElement[];
}

/**
 * Folds a run of consecutive ambient rows into one bordered zone, or a single
 * `context updated · N changes` summary line when the run is large.
 * @param root0 - The component props.
 * @param root0.rows - The consecutive AmbientRow elements to fold.
 * @returns Rendered ambient grouping zone.
 */
export function AmbientGroup({ rows }: AmbientGroupProps): React.ReactElement {
  const isLarge = rows.length > AMBIENT_SUMMARY_THRESHOLD;
  return (
    <div
      className="cc-ambient-group my-1"
      style={{
        borderTop: '1px solid var(--stream-border)',
        borderBottom: '1px solid var(--stream-border)'
      }}
    >
      {isLarge ? (
        <div className="py-1 px-2 text-[0.78em] italic" style={{ color: 'var(--stream-fg-muted)' }}>
          context updated · {rows.length} changes
        </div>
      ) : (
        rows
      )}
    </div>
  );
}
