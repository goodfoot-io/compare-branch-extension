/**
 * Attachment router for the expanded transcript.
 *
 * Classifies a single attachment payload via the pure {@link classifyAttachment}
 * and dispatches it to a purpose-built presenter — or to nothing — so that no
 * known `attachment.type` reaches {@link RawJsonFallback}:
 *
 * - `descriptor.hidden` → render nothing.
 * - `descriptor.kind === '__unknown__'` → {@link RawJsonFallback} (the preserved
 *   safety net for genuinely unknown / future types).
 * - otherwise → the presenter for the type's scope/tier:
 *   {@link ContextStateRow}, {@link DisclosureRow}, {@link FileRow},
 *   {@link DateMarker}, or a standalone hook row (for an orphan hook whose tool
 *   was not rendered).
 *
 * Presenters receive the descriptor plus the raw payload; the descriptor is
 * authoritative for tier/glyph/summary/hidden/linkPath and presenters only
 * style.
 *
 * @summary Per-attachment presenter dispatch; unknown types fall to RawJsonFallback
 * @module components/expanded/messages/attachment/AttachmentRouter
 */

import type React from 'react';
import { classifyAttachment } from '../../../../lib/classify-attachment';
import type { AttachmentPayload } from '../../../../lib/parse-session';
import { HookRow } from '../../../accordions/HookRow';
import { RawJsonFallback } from '../RawJsonFallback';
import { ContextStateRow } from './ContextStateRow';
import { DateMarker } from './DateMarker';
import { DisclosureRow } from './DisclosureRow';
import { FileRow } from './FileRow';

/** Content-tier turn attachments that open to a disclosed body. */
const DISCLOSURE_TYPES = new Set<string>(['nested_memory', 'skill_listing', 'invoked_skills', 'dynamic_skill']);

/**
 * Ambient turn-state attachments rendered as ContextStateRow.
 *
 * `mcp_instructions_delta` belongs here: it is ambient-tier and its disclosed
 * body (addedBlocks / addedNames) is assembled by ContextStateRow, so it groups
 * uniformly with the other ambient rows rather than splitting across presenters.
 */
const CONTEXT_STATE_TYPES = new Set<string>([
  'team_context',
  'command_permissions',
  'deferred_tools_delta',
  'task_reminder',
  'mcp_instructions_delta'
]);

/** File-lifecycle attachments rendered as FileRow (expandable or leaf). */
const FILE_TYPES = new Set<string>([
  'file',
  'edited_text_file',
  'queued_command',
  'compact_file_reference',
  'opened_file_in_ide',
  'selected_lines_in_ide'
]);

/** The six `hook_*` subtypes; reached here only as orphans (tool not rendered). */
const HOOK_TYPES = new Set<string>([
  'hook_success',
  'hook_additional_context',
  'hook_system_message',
  'hook_non_blocking_error',
  'hook_blocking_error',
  'hook_cancelled'
]);

interface AttachmentRouterProps {
  /** The raw attachment payload to classify and present. */
  attachment: AttachmentPayload;
}

interface OrphanHookRowProps {
  /** The raw attachment payload for the orphan hook. */
  attachment: AttachmentPayload;
}

/**
 * Renders an orphan hook (a `hook_*` whose tool was never rendered) as a
 * standalone top-level row via the shared {@link HookRow}, so it is at full
 * parity with the nested hook row: glyph + summary AND the same in-place
 * expandable body. A `hook_blocking_error` keeps the `errorForeground`
 * escalation and now expands to its blocking reason + command, which would
 * otherwise be lost (in the real corpus every blocking error is an orphan).
 * @param root0 - The component props.
 * @param root0.attachment - The raw orphan hook attachment payload.
 * @returns Rendered standalone hook row element.
 */
function OrphanHookRow({ attachment }: OrphanHookRowProps): React.ReactElement {
  return <HookRow hook={attachment} />;
}

/**
 * Classifies and renders a single attachment, or nothing when hidden.
 * @param root0 - The component props.
 * @param root0.attachment - The raw attachment payload.
 * @returns The presenter element, RawJsonFallback for unknown types, or null.
 */
export function AttachmentRouter({ attachment }: AttachmentRouterProps): React.ReactElement | null {
  const descriptor = classifyAttachment(attachment);

  if (descriptor.hidden) return null;
  if (descriptor.kind === '__unknown__') return <RawJsonFallback data={attachment} />;

  const kind = descriptor.kind;

  if (HOOK_TYPES.has(kind)) return <OrphanHookRow attachment={attachment} />;
  if (CONTEXT_STATE_TYPES.has(kind)) return <ContextStateRow descriptor={descriptor} attachment={attachment} />;
  if (DISCLOSURE_TYPES.has(kind)) return <DisclosureRow descriptor={descriptor} attachment={attachment} />;
  if (FILE_TYPES.has(kind)) return <FileRow descriptor={descriptor} attachment={attachment} />;
  if (kind === 'date_change') return <DateMarker descriptor={descriptor} />;

  // Unreachable for known types — every classifier `kind` is handled above.
  // Preserved as the fail-closed safety net should a new kind slip through.
  return <RawJsonFallback data={attachment} />;
}
