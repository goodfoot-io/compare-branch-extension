/**
 * Ambient turn-state attachment row.
 *
 * Renders the quiet, ambient-tier turn-context attachments — `team_context`,
 * `command_permissions`, `deferred_tools_delta`, `mcp_instructions_delta`, and
 * `task_reminder` — as a muted one-line summary. Types whose payload carries a
 * body (the descriptor's `expandable` flag) reveal that body in place via the
 * shared {@link ExpandableRow} primitive; the rest render as static leaf lines.
 *
 * Styling follows the ambient tier from the plan: `descriptionForeground`
 * text at ~0.78em. The presenter reads the descriptor for its summary and
 * expandability and never re-derives meaning; it only assembles the body text
 * from the raw payload for the disclosure.
 *
 * @summary Ambient turn-state row (team/permissions/tools/mcp/task-reminder)
 * @module components/expanded/messages/attachment/ContextStateRow
 */

import type React from 'react';
import { ExpandableRow } from '../../../../../../lib/accordions';
import type { AttachmentDescriptor } from '../../../../lib/classify-attachment';
import type {
  AttachmentPayload,
  CommandPermissionsAttachment,
  DeferredToolsDeltaAttachment,
  McpInstructionsDeltaAttachment,
  TaskReminderAttachment,
  TeamContextAttachment
} from '../../../../lib/parse-session';

interface ContextStateRowProps {
  /** The classifier descriptor for this attachment. */
  descriptor: AttachmentDescriptor;
  /** The raw attachment payload, read only for body assembly. */
  attachment: AttachmentPayload;
}

/**
 * Assembles the expandable body lines for an ambient turn-state attachment.
 * Reads only the fields relevant per subtype; returns null when the payload
 * carries no body worth disclosing.
 * @param attachment - The raw attachment payload.
 * @returns The body text, or null when there is nothing to expand.
 */
function bodyText(attachment: AttachmentPayload): string | null {
  switch (attachment.type) {
    case 'team_context': {
      const a = attachment as TeamContextAttachment;
      const parts = [
        a.teamConfigPath ? `config: ${a.teamConfigPath}` : null,
        a.taskListPath ? `tasks: ${a.taskListPath}` : null
      ].filter((p): p is string => p !== null);
      return parts.length > 0 ? parts.join('\n') : null;
    }
    case 'command_permissions': {
      const a = attachment as CommandPermissionsAttachment;
      return a.allowedTools.length > 0 ? a.allowedTools.join('\n') : null;
    }
    case 'deferred_tools_delta': {
      const a = attachment as DeferredToolsDeltaAttachment;
      const lines = [
        ...(a.addedNames ?? []).map((n) => `+ ${n}`),
        ...(a.readdedNames ?? []).map((n) => `+ ${n}`),
        ...(a.removedNames ?? []).map((n) => `− ${n}`)
      ];
      return lines.length > 0 ? lines.join('\n') : null;
    }
    case 'mcp_instructions_delta': {
      const a = attachment as McpInstructionsDeltaAttachment;
      const blocks = a.addedBlocks ?? [];
      if (blocks.length > 0) return blocks.join('\n\n');
      const names = a.addedNames ?? [];
      return names.length > 0 ? names.join('\n') : null;
    }
    case 'task_reminder': {
      const a = attachment as TaskReminderAttachment;
      const items = a.content ?? [];
      return items.length > 0 ? items.map((item) => String(item)).join('\n') : null;
    }
    default:
      return null;
  }
}

/**
 * Renders an ambient turn-state attachment row.
 * @param root0 - The component props.
 * @param root0.descriptor - The classifier descriptor for this attachment.
 * @param root0.attachment - The raw attachment payload, read for body assembly.
 * @returns Rendered ambient row element.
 */
export function ContextStateRow({ descriptor, attachment }: ContextStateRowProps): React.ReactElement {
  const body = descriptor.expandable ? bodyText(attachment) : null;
  const header = (
    <span
      className="overflow-hidden text-ellipsis whitespace-nowrap"
      style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '0.78em' }}
    >
      {descriptor.summary}
    </span>
  );

  if (body === null) {
    return <ExpandableRow header={header} expandable={false} />;
  }

  return (
    <ExpandableRow header={header}>
      <div className="text-[11px] text-vscode-foreground font-vscode-editor whitespace-pre-wrap break-words pb-1.5">
        {body}
      </div>
    </ExpandableRow>
  );
}
