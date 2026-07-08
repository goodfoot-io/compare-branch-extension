/**
 * Context compact boundary line for the expanded transcript.
 *
 * Renders the trigger type and token count when the session's context window
 * was compacted, via the shared {@link Boundary} so it reads as the same kind
 * of structural marker as the turn-start and result boundaries.
 *
 * @summary Context compacted separator with trigger and token count
 * @module components/expanded/messages/system/CompactBoundaryLine
 */

import type React from 'react';
import { Boundary } from '../../../../../../lib/Boundary';

interface CompactBoundaryLineProps {
  /** Compaction trigger (e.g. "auto", "manual"). */
  trigger: string;
  /** Number of tokens before compaction. */
  preTokens: number;
}

/**
 * Separator marking a context compaction event.
 * @param root0 - The component props.
 * @param root0.trigger - Compaction trigger (e.g. "auto", "manual").
 * @param root0.preTokens - Number of tokens before compaction.
 * @returns Rendered separator element with trigger and token count.
 */
export function CompactBoundaryLine({ trigger, preTokens }: CompactBoundaryLineProps): React.ReactElement {
  return <Boundary kind="compaction" label={`Context compacted (${trigger}) · ${preTokens.toLocaleString()} tokens`} />;
}
