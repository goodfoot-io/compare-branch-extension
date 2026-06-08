/**
 * Date-change marker for the expanded transcript.
 *
 * Renders the `date_change` attachment as a thin, right-aligned timestamp that
 * reads *below* the weight of {@link CompactBoundaryLine} and
 * {@link SessionBoundary} — smaller and quieter, with no rule, so the eye
 * registers it as an aside rather than a section break. The text is the
 * descriptor's summary (`{newDate}`).
 *
 * @summary Quiet right-aligned date-change marker, below boundary weight
 * @module components/expanded/messages/attachment/DateMarker
 */

import type React from 'react';
import type { AttachmentDescriptor } from '../../../../lib/classify-attachment';

interface DateMarkerProps {
  /** The classifier descriptor for the date_change attachment. */
  descriptor: AttachmentDescriptor;
}

/**
 * Renders the date-change marker.
 * @param root0 - The component props.
 * @param root0.descriptor - The classifier descriptor for the date_change attachment.
 * @returns Rendered date marker element.
 */
export function DateMarker({ descriptor }: DateMarkerProps): React.ReactElement {
  return (
    <div
      className="flex justify-end py-0.5 text-[0.7em] italic"
      style={{ color: 'var(--vscode-descriptionForeground)' }}
    >
      {descriptor.summary}
    </div>
  );
}
