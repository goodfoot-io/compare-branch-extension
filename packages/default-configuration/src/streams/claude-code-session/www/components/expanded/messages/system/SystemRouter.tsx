/**
 * Router for system message subtypes in the expanded transcript.
 *
 * Dispatches each `system` subtype to the appropriate display component.
 * Returns null for unknown or rendering-free subtypes.
 *
 * @summary System message subtype switch → StatusLine, CompactBoundaryLine, HookLine, etc.
 * @module components/expanded/messages/system/SystemRouter
 */

import type React from 'react';
import type { SystemMsg } from '../../../../lib/parse-session';
import { RawJsonFallback } from '../RawJsonFallback';
import { AwaySummaryBoundary } from './AwaySummaryBoundary';
import { CompactBoundaryLine } from './CompactBoundaryLine';
import { FilesPersisted } from './FilesPersisted';
import { HookLine } from './HookLine';
import { StatusLine } from './StatusLine';
import { TaskNotification } from './TaskNotification';

interface SystemRouterProps {
  /** Parsed system message. */
  msg: SystemMsg;
  /** Callback invoked when the system init message sets model/cwd. */
  onInit?: (model: string, cwd: string, toolCount: number) => void;
}

/**
 * Dispatches a system message to the appropriate child component.
 * @param root0 - The component props.
 * @param root0.msg - Parsed system message.
 * @param root0.onInit - Callback invoked when the system init message sets model/cwd.
 * @returns Rendered system message component, or null for unknown subtypes.
 */
export function SystemRouter({ msg, onInit }: SystemRouterProps): React.ReactElement | null {
  switch (msg.subtype) {
    case 'init': {
      const initMsg = msg as Extract<SystemMsg, { subtype: 'init' }>;
      const toolCount = initMsg.tools?.length ?? 0;
      // Notify parent about init data
      onInit?.(initMsg.model ?? '', initMsg.cwd ?? '', toolCount);
      return (
        <div
          className="flex items-center gap-2 py-1.5 my-1 text-[0.8em] text-vscode-descriptionForeground"
          style={{
            borderTop: '1px solid var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))',
            borderBottom: '1px solid var(--vscode-inlineChatInput-border, var(--vscode-editorWidget-border, #454545))'
          }}
        >
          Session started · {toolCount} tool{toolCount !== 1 ? 's' : ''}
        </div>
      );
    }
    case 'status': {
      const statusMsg = msg as Extract<SystemMsg, { subtype: 'status' }>;
      if (statusMsg.status === 'compacting') {
        return <StatusLine text="Compacting context…" />;
      }
      return null;
    }
    case 'compact_boundary': {
      const cbMsg = msg as Extract<SystemMsg, { subtype: 'compact_boundary' }>;
      const trigger = cbMsg.compact_metadata?.trigger ?? 'auto';
      const preTokens = cbMsg.compact_metadata?.pre_tokens ?? 0;
      return <CompactBoundaryLine trigger={trigger} preTokens={preTokens} />;
    }
    case 'hook_started': {
      const hMsg = msg as Extract<SystemMsg, { subtype: 'hook_started' }>;
      return <HookLine subtype="hook_started" hookName={hMsg.hook_name ?? ''} hookEvent={hMsg.hook_event} />;
    }
    case 'hook_progress': {
      const hMsg = msg as Extract<SystemMsg, { subtype: 'hook_progress' }>;
      return <HookLine subtype="hook_progress" hookName={hMsg.hook_name ?? ''} output={hMsg.output ?? hMsg.stdout} />;
    }
    case 'hook_response': {
      const hMsg = msg as Extract<SystemMsg, { subtype: 'hook_response' }>;
      return <HookLine subtype="hook_response" hookName={hMsg.hook_name ?? ''} outcome={hMsg.outcome} />;
    }
    case 'files_persisted': {
      const fpMsg = msg as Extract<SystemMsg, { subtype: 'files_persisted' }>;
      return <FilesPersisted saved={fpMsg.files?.length ?? 0} failed={fpMsg.failed?.length ?? 0} />;
    }
    case 'task_notification': {
      const tnMsg = msg as Extract<SystemMsg, { subtype: 'task_notification' }>;
      return (
        <TaskNotification taskId={tnMsg.task_id ?? ''} status={tnMsg.status ?? ''} summary={tnMsg.summary ?? ''} />
      );
    }
    case 'away_summary': {
      const awayMsg = msg as Extract<SystemMsg, { subtype: 'away_summary' }>;
      return <AwaySummaryBoundary content={awayMsg.content} />;
    }
    default:
      return <RawJsonFallback data={msg} />;
  }
}
