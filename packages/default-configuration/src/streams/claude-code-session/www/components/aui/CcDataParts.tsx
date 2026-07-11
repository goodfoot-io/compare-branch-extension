/**
 * Claude-specific `data` part renderers registered under `StreamThread`'s
 * `dataComponents`, alongside the four shared parts
 * (../../../../lib/aui/DataParts.tsx).
 *
 * Each part is a thin adapter reusing an existing renderer-local component
 * unchanged: `HookRow` for an orphan hook, `AttachmentRouter` (plus
 * `AmbientGroup`/`AmbientRow`) for attachments, `AwaySummaryBoundary` for the
 * away-summary system event, and `SupplementalContentRow` for orphaned isMeta
 * injection content. `to-thread-messages.ts` is the only producer of these
 * part names (`cc-hook`, `cc-attachment`, `cc-ambient-group`,
 * `cc-away-summary`, `cc-supplemental`).
 *
 * @summary Claude-specific data parts: hook, attachment, ambient group, away summary, supplemental
 * @module components/aui/CcDataParts
 */

import type { DataMessagePartComponent } from '@assistant-ui/react';
import type React from 'react';
import type {
  CcAmbientGroupData,
  CcAttachmentData,
  CcAwaySummaryData,
  CcHookData,
  CcSupplementalData
} from '../../lib/to-thread-messages';
import { HookRow } from '../accordions/HookRow';
import { AmbientGroup, AmbientRow } from '../expanded/messages/AmbientGroup';
import { AttachmentRouter } from '../expanded/messages/attachment/AttachmentRouter';
import { SupplementalContentRow } from '../expanded/messages/SupplementalContentRow';
import { AwaySummaryBoundary } from '../expanded/messages/system/AwaySummaryBoundary';

/**
 * Renders the `cc-hook` data part: a standalone orphan hook row.
 * @param root0 - The component props.
 * @param root0.data - The orphan hook payload.
 * @returns Rendered hook row element.
 */
export const CcHookPart: DataMessagePartComponent<CcHookData> = ({ data }) => <HookRow hook={data.hook} />;

/**
 * Renders the `cc-attachment` data part: a single non-ambient attachment,
 * dispatched through the shared classifier-driven `AttachmentRouter`.
 * @param root0 - The component props.
 * @param root0.data - The attachment payload.
 * @returns Rendered attachment element, or null when the classifier hides it.
 */
export const CcAttachmentPart: DataMessagePartComponent<CcAttachmentData> = ({ data }) => (
  <AttachmentRouter attachment={data.attachment} />
);

/**
 * Renders the `cc-ambient-group` data part: a run of consecutive ambient-tier
 * attachments folded into one zone (or a single summary line when large),
 * mirroring the retired `MessageRouter`'s `AmbientGroup` collapse.
 * @param root0 - The component props.
 * @param root0.data - The consecutive ambient attachments.
 * @returns Rendered ambient group element.
 */
export const CcAmbientGroupPart: DataMessagePartComponent<CcAmbientGroupData> = ({ data }): React.ReactElement => (
  <AmbientGroup
    rows={data.attachments.map((attachment: CcAmbientGroupData['attachments'][number]) => (
      <AmbientRow key={JSON.stringify(attachment)}>
        <AttachmentRouter attachment={attachment} />
      </AmbientRow>
    ))}
  />
);

/**
 * Renders the `cc-away-summary` data part via the shared `AwaySummaryBoundary`.
 * @param root0 - The component props.
 * @param root0.data - The away-summary payload.
 * @returns Rendered away-summary boundary element.
 */
export const CcAwaySummaryPart: DataMessagePartComponent<CcAwaySummaryData> = ({ data }) => (
  <AwaySummaryBoundary content={data.content} />
);

/**
 * Renders the `cc-supplemental` data part via the shared `SupplementalContentRow`.
 * @param root0 - The component props.
 * @param root0.data - The supplemental-content payload.
 * @returns Rendered supplemental-content disclosure row.
 */
export const CcSupplementalPart: DataMessagePartComponent<CcSupplementalData> = ({ data }) => (
  <SupplementalContentRow text={data.text} />
);
