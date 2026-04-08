/**
 * Message type router for the expanded transcript.
 *
 * Dispatches each parsed session message to the appropriate display component:
 * SystemRouter, UserTurn, AssistantTurn, ToolAccordion, ResultBoundary,
 * SessionBoundary, or AuthStatus.
 *
 * Manages pending tool_use block registration so that tool results in
 * subsequent user messages can be paired with their input accordions.
 *
 * @summary Top-level message type switch for the expanded transcript
 * @module components/expanded/messages/MessageRouter
 */

import type React from 'react';
import type { ContentBlock, SessionMsg } from '../../../lib/parse-session';
import { ToolAccordion } from '../../accordions/ToolAccordion';
import { AssistantTurn } from './AssistantTurn';
import { AuthStatus } from './AuthStatus';
import { ResultBoundary } from './ResultBoundary';
import { SystemRouter } from './system/SystemRouter';
import { UserTurn } from './UserTurn';

/** Pending tool_use entry awaiting its result. */
interface PendingToolUse {
  name: string;
  input: Record<string, unknown>;
}

interface MessageRouterProps {
  /** All parsed session messages. */
  messages: SessionMsg[];
  /** Callback when session init data is parsed (for SessionHeader). */
  onInit?: (model: string, cwd: string) => void;
  /** Callback when session result is parsed (for SessionHeader status). */
  onResult?: (status: 'success' | 'error') => void;
}

/**
 * Renders all session messages into transcript nodes, maintaining tool_use
 * pending state for accordion pairing.
 * @param root0 - The component props.
 * @param root0.messages - All parsed session messages.
 * @param root0.onInit - Callback when session init data is parsed (for SessionHeader).
 * @param root0.onResult - Callback when session result is parsed (for SessionHeader status).
 * @returns React fragment containing all rendered transcript nodes.
 */
export function MessageRouter({ messages, onInit, onResult }: MessageRouterProps): React.ReactElement {
  // Pending tool_use map is rebuilt on each render from the messages array.
  // This is intentional: the component re-renders on mode switch with a full
  // messages array, so state must be derived, not accumulated imperatively.
  const pendingToolUses = new Map<string, PendingToolUse>();

  const nodes: React.ReactElement[] = [];

  messages.forEach((msg, idx) => {
    const key = `msg-${idx}`;

    switch (msg.type) {
      case 'system': {
        const sysMsg = msg as Extract<SessionMsg, { type: 'system' }>;
        nodes.push(
          <SystemRouter
            key={key}
            msg={sysMsg}
            onInit={(model, cwd, toolCount) => {
              onInit?.(model, cwd);
              // SessionBoundary rendered by SystemRouter directly for 'init'
              void toolCount;
            }}
          />
        );
        break;
      }

      case 'user': {
        const userMsg = msg as Extract<SessionMsg, { type: 'user' }>;
        const content = userMsg.message?.content;
        const toolKeys = new Map<string, number>();

        // First pass: render tool results as ToolAccordions
        if (Array.isArray(content)) {
          content.forEach((block) => {
            const b = block as ContentBlock;
            if (b.type !== 'tool_result' || !b.tool_use_id) return;
            const resultContent =
              typeof b.content === 'string'
                ? b.content
                : Array.isArray(b.content)
                  ? b.content
                      .filter((rb) => (rb as { type: string }).type === 'text')
                      .map((rb) => (rb as { text?: string }).text ?? '')
                      .join('\n')
                  : '';
            const pending = pendingToolUses.get(b.tool_use_id);
            const toolKey = nextStableKey(
              toolKeys,
              pending ? `${pending.name}:${b.tool_use_id}` : `tool:${b.tool_use_id}:${resultContent}`
            );
            if (pending) {
              nodes.push(
                <ToolAccordion
                  key={`${key}-${toolKey}`}
                  toolName={pending.name}
                  input={pending.input}
                  result={resultContent}
                />
              );
              pendingToolUses.delete(b.tool_use_id);
            } else {
              nodes.push(<ToolAccordion key={`${key}-${toolKey}`} toolName="tool" input={{}} result={resultContent} />);
            }
          });
        }

        // Second pass: collect text blocks for UserTurn
        const textBlocks: string[] = [];
        if (typeof content === 'string') {
          textBlocks.push(content);
        } else if (Array.isArray(content)) {
          for (const block of content) {
            const b = block as ContentBlock;
            if (b.type === 'text' && typeof b.text === 'string') {
              textBlocks.push(b.text);
            }
          }
        }

        if (textBlocks.length > 0) {
          nodes.push(<UserTurn key={`${key}-user`} textBlocks={textBlocks} />);
        }
        break;
      }

      case 'assistant': {
        const aMsg = msg as Extract<SessionMsg, { type: 'assistant' }>;

        if (aMsg.error) {
          nodes.push(
            <div
              key={key}
              className="text-[0.85em] py-1 px-2 font-vscode-editor"
              style={{
                color: 'var(--vscode-charts-red, #f48771)',
                borderLeft: '2px solid var(--vscode-charts-red, #f48771)'
              }}
            >
              API Error: {String(aMsg.error)}
            </div>
          );
          break;
        }

        const blocks = aMsg.message?.content ?? [];

        // Register tool_use blocks for later pairing
        for (const block of blocks) {
          const b = block as ContentBlock;
          if (b.type === 'tool_use') {
            pendingToolUses.set(b.id, { name: b.name, input: b.input ?? {} });
          }
        }

        // Render non-tool blocks
        const nonToolBlocks = blocks.filter((b) => (b as ContentBlock).type !== 'tool_use') as ContentBlock[];
        if (nonToolBlocks.length > 0) {
          const el = <AssistantTurn key={key} blocks={nonToolBlocks} />;
          if (el !== null) nodes.push(el);
        }
        break;
      }

      case 'tool_use_summary': {
        const tusMsg = msg as Extract<SessionMsg, { type: 'tool_use_summary' }>;
        const summary = tusMsg.summary ?? '';
        const ids = tusMsg.preceding_tool_use_ids ?? [];
        let rendered = false;
        for (const id of ids) {
          const pending = pendingToolUses.get(id);
          if (pending) {
            nodes.push(
              <ToolAccordion key={`${key}-tus-${id}`} toolName={pending.name} input={pending.input} result={summary} />
            );
            pendingToolUses.delete(id);
            rendered = true;
          }
        }
        if (!rendered && summary) {
          nodes.push(<ToolAccordion key={`${key}-tus-fallback`} toolName="tool" input={{}} result={summary} />);
        }
        break;
      }

      case 'result': {
        const rMsg = msg as Extract<SessionMsg, { type: 'result' }>;
        const isSuccess = rMsg.subtype === 'success';
        const newStatus = isSuccess ? 'success' : 'error';
        onResult?.(newStatus);
        nodes.push(
          <ResultBoundary
            key={key}
            isSuccess={isSuccess}
            subtype={rMsg.subtype ?? 'unknown'}
            turns={rMsg.num_turns ?? 0}
            durationS={Math.round((rMsg.duration_ms ?? 0) / 1000)}
            totalCostUsd={rMsg.total_cost_usd != null ? Number(rMsg.total_cost_usd) : null}
          />
        );
        break;
      }

      case 'auth_status': {
        const authMsg = msg as Extract<SessionMsg, { type: 'auth_status' }>;
        const el = <AuthStatus key={key} error={authMsg.error} isAuthenticating={authMsg.isAuthenticating} />;
        if (el !== null) nodes.push(el);
        break;
      }

      default:
        break;
    }
  });

  return <>{nodes}</>;
}

function nextStableKey(counts: Map<string, number>, base: string): string {
  const next = (counts.get(base) ?? 0) + 1;
  counts.set(base, next);
  return `${base}:${next}`;
}
