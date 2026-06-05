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
import { type AttachmentGlyphSeverity, classifyAttachment } from '../../../../lib/classify-attachment';
import type { AttachmentPayload } from '../../../../lib/parse-session';
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

/**
 * Maps a classifier glyph severity to its VS Code theme color token, mirroring
 * the hook-row coloring inside a tool accordion. Only `warning` and `error`
 * carry color; neutral glyphs inherit the muted foreground.
 * @param severity - Glyph severity from the classifier descriptor.
 * @returns A CSS color value, or undefined for neutral.
 */
function glyphColor(severity: AttachmentGlyphSeverity): string | undefined {
  if (severity === 'warning') return 'var(--vscode-editorWarning-foreground, #cca700)';
  if (severity === 'error') return 'var(--vscode-errorForeground)';
  return undefined;
}

interface OrphanHookRowProps {
  /** The classifier descriptor for the orphan hook. */
  descriptor: ReturnType<typeof classifyAttachment>;
}

/**
 * Renders an orphan hook (a `hook_*` whose tool was never rendered) as a
 * standalone top-level row, reusing the hook-row look: glyph + summary at
 * content weight. A `hook_blocking_error` escalates to the `errorForeground`
 * variant with a left border, not the muted default.
 * @param root0 - The component props.
 * @param root0.descriptor - The classifier descriptor for the orphan hook.
 * @returns Rendered standalone hook row element.
 */
function OrphanHookRow({ descriptor }: OrphanHookRowProps): React.ReactElement {
  const color = glyphColor(descriptor.glyphSeverity);
  const isBlocking = descriptor.kind === 'hook_blocking_error';
  return (
    <div
      className="flex items-center gap-2 w-full font-vscode text-[11px] py-0.5 px-2"
      style={
        isBlocking
          ? { color: 'var(--vscode-errorForeground)', borderLeft: '2px solid var(--vscode-errorForeground)' }
          : { color: 'var(--vscode-foreground)' }
      }
    >
      {descriptor.glyph ? (
        <span className="shrink-0" style={color ? { color } : undefined}>
          {descriptor.glyph}
        </span>
      ) : null}
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{descriptor.summary}</span>
    </div>
  );
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

  if (HOOK_TYPES.has(kind)) return <OrphanHookRow descriptor={descriptor} />;
  if (CONTEXT_STATE_TYPES.has(kind)) return <ContextStateRow descriptor={descriptor} attachment={attachment} />;
  if (DISCLOSURE_TYPES.has(kind)) return <DisclosureRow descriptor={descriptor} attachment={attachment} />;
  if (FILE_TYPES.has(kind)) return <FileRow descriptor={descriptor} attachment={attachment} />;
  if (kind === 'date_change') return <DateMarker descriptor={descriptor} />;

  // Unreachable for known types — every classifier `kind` is handled above.
  // Preserved as the fail-closed safety net should a new kind slip through.
  return <RawJsonFallback data={attachment} />;
}
