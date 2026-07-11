/**
 * Expanded session transcript view for the claude-code-session renderer.
 *
 * Subscribes to the stream store, parses all JSONL lines, converts them to
 * `ThreadMessageLike[]` (../../lib/to-thread-messages.ts), and renders the
 * SessionHeader + shared assistant-ui `StreamThread`. Appends new lines
 * incrementally as they arrive via store subscription. Re-renders from
 * scratch on mode transition.
 *
 * @summary Expanded session view: header + shared assistant-ui transcript
 * @module components/expanded/ExpandedView
 */

import type { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { streamStore } from '@cards.management/sdk/stream-store';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StreamThread } from '../../../../lib/aui';
import type { SessionStatus } from '../../../../lib/SessionHeader';
import { SessionHeader } from '../../../../lib/SessionHeader';
import { mergeConsecutiveMessages, parseLines, type SessionMsg } from '../../lib/parse-session';
import { toThreadMessages } from '../../lib/to-thread-messages';
import {
  CcAmbientGroupPart,
  CcAttachmentPart,
  CcAwaySummaryPart,
  CcHookPart,
  CcSessionStartPart,
  CcSupplementalPart,
  CcToolPart
} from '../aui';

/** The Claude-specific data parts, merged over the four shared ones by `StreamThread`. */
const CC_DATA_COMPONENTS = {
  'cc-hook': CcHookPart,
  'cc-attachment': CcAttachmentPart,
  'cc-ambient-group': CcAmbientGroupPart,
  'cc-away-summary': CcAwaySummaryPart,
  'cc-session-start': CcSessionStartPart,
  'cc-supplemental': CcSupplementalPart
};

interface ExpandedState {
  messages: SessionMsg[];
  model: string;
  cwd: string;
  status: SessionStatus;
}

function buildExpandedState(lines: string[]): ExpandedState {
  return {
    messages: mergeConsecutiveMessages(parseLines(lines)),
    model: '',
    cwd: '',
    status: 'running'
  };
}

/**
 * Reads the primary stream file's sidecar `agentId`, present only for subagent/auxiliary streams.
 * @returns The sidecar `agentId`, or `undefined` for a main stream or before meta is known.
 */
function readPrimaryAgentId(): string | undefined {
  const storeState = streamStore.getState();
  const file = storeState.files.get(storeState.primary);
  return file?.meta.role === 'subagent' || file?.meta.role === 'auxiliary' ? file.meta.agentId : undefined;
}

/**
 * Expanded view that renders the full session transcript with a sticky header.
 * @returns Rendered expanded transcript view element.
 */
export function ExpandedView(): React.ReactElement {
  const [state, setState] = useState<ExpandedState>(() => {
    const storeState = streamStore.getState();
    const file = storeState.files.get(storeState.primary);
    return buildExpandedState(file ? file.lines : []);
  });
  const [agentId, setAgentId] = useState<string | undefined>(() => readPrimaryAgentId());

  const lastLineCountRef = useRef<number>(0);

  // Bootstrap-then-subscribe. Reconcile against the current store before
  // subscribing so lines that arrived between the initial useState and this
  // effect are not dropped — the empty-on-boot primary's subscribe:response
  // delivers the full transcript and can land in exactly this window.
  useEffect(() => {
    const sync = (): void => {
      const storeState = streamStore.getState();
      const file = storeState.files.get(storeState.primary);
      const lines = file ? file.lines : [];
      lastLineCountRef.current = lines.length;
      setState(buildExpandedState(lines));
      setAgentId(readPrimaryAgentId());
    };
    sync();
    return streamStore.subscribe((newState) => {
      const file = newState.files.get(newState.primary);
      const lines = file ? file.lines : [];
      const newLineCount = lines.length;
      setAgentId(readPrimaryAgentId());

      if (newLineCount > lastLineCountRef.current) {
        const newLines = lines.slice(lastLineCountRef.current);
        lastLineCountRef.current = newLineCount;
        const newMessages = parseLines(newLines);
        setState((prev) => ({
          ...prev,
          // Re-merge across the boundary: the last accumulated message may
          // need to absorb the first new message if they share an author.
          messages: mergeConsecutiveMessages([...prev.messages, ...newMessages])
        }));
      } else if (newLineCount < lastLineCountRef.current) {
        // File reset: rebuild from scratch
        lastLineCountRef.current = newLineCount;
        setState(buildExpandedState(lines));
      }
    });
  }, []);

  const converted = useMemo(() => toThreadMessages(state.messages), [state.messages]);

  // assistant-ui has no wildcard `toolComponents` entry, so every tool name
  // observed in the transcript is registered against the same CcToolPart —
  // it, not the shared ToolFallbackPart, is what carries hook nesting and the
  // isMeta supplemental result (see CcToolPart.tsx).
  const toolComponents = useMemo<Record<string, ToolCallMessagePartComponent>>(() => {
    const names = new Set<string>();
    for (const message of converted.messages) {
      if (typeof message.content === 'string') continue;
      for (const part of message.content) {
        if (part.type === 'tool-call') names.add(part.toolName);
      }
    }
    return Object.fromEntries(Array.from(names, (name) => [name, CcToolPart]));
  }, [converted.messages]);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <SessionHeader
        model={converted.model || state.model}
        cwd={converted.cwd || state.cwd}
        status={converted.status}
        agentId={agentId}
      />
      <div className="flex-1 min-h-0">
        {converted.messages.length === 0 ? (
          <div className="text-vscode-descriptionForeground italic text-[0.9em] px-3.5 py-4">No output yet.</div>
        ) : (
          <StreamThread
            messages={converted.messages}
            isRunning={converted.isRunning}
            toolComponents={toolComponents}
            dataComponents={CC_DATA_COMPONENTS}
            assistantName="Claude Code"
          />
        )}
      </div>
    </div>
  );
}
