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
import { classifyAttachment } from '../../../lib/classify-attachment';
import type { AttachmentPayload, ContentBlock, SessionMsg } from '../../../lib/parse-session';
import { ToolAccordion } from '../../accordions/ToolAccordion';
import { ToolGroup } from '../../accordions/ToolGroup';
import { AmbientGroup, AmbientRow } from './AmbientGroup';
import { AssistantTurn } from './AssistantTurn';
import { AuthStatus } from './AuthStatus';
import { AttachmentRouter } from './attachment/AttachmentRouter';
import { RawJsonFallback } from './RawJsonFallback';
import { ResultBoundary } from './ResultBoundary';
import { SystemRouter } from './system/SystemRouter';
import { UserTurn } from './UserTurn';

/** Pending tool_use entry awaiting its result. */
interface PendingToolUse {
  name: string;
  input: Record<string, unknown>;
}

/** The six `hook_*` attachment subtypes that nest inside their owning tool. */
const HOOK_ATTACHMENT_TYPES = new Set<string>([
  'hook_success',
  'hook_additional_context',
  'hook_system_message',
  'hook_non_blocking_error',
  'hook_blocking_error',
  'hook_cancelled'
]);

/**
 * Pre-pass: collect every `toolUseID` that WILL reach a ToolAccordion render
 * site, so orphan-vs-nested hook detection is independent of stream ordering.
 *
 * Mirrors exactly the two render arms that emit a ToolAccordion:
 * - the `user` arm renders a ToolAccordion for **every** `tool_result` block's
 *   `tool_use_id` (paired or not), so each such id will nest its hooks;
 * - the `tool_use_summary` arm renders a ToolAccordion for each
 *   `preceding_tool_use_ids` entry that matches a registered assistant
 *   `tool_use` block id.
 *
 * The hook attachment line for a tool usually precedes that tool's
 * `tool_result` in the real stream, so a set populated only when the tool
 * renders would still be empty at the hook's position — making the orphan
 * guard order-dependent and double-rendering the hook. Walking the whole list
 * up front removes that dependence.
 * @param messages - All parsed session messages.
 * @returns Set of toolUseIDs that pair into a rendered ToolAccordion.
 */
function computeWillNestToolUseIds(messages: SessionMsg[]): Set<string> {
  const willNest = new Set<string>();
  const registeredToolUseIds = new Set<string>();

  for (const msg of messages) {
    switch (msg.type) {
      case 'assistant': {
        const aMsg = msg as Extract<SessionMsg, { type: 'assistant' }>;
        const blocks = aMsg.message?.content ?? [];
        for (const block of blocks) {
          const b = block as ContentBlock;
          if (b.type === 'tool_use') registeredToolUseIds.add(b.id);
        }
        break;
      }
      case 'user': {
        if ((msg as Record<string, unknown>)['isMeta'] === true) break;
        const userMsg = msg as Extract<SessionMsg, { type: 'user' }>;
        const content = userMsg.message?.content;
        if (!Array.isArray(content)) break;
        for (const block of content) {
          const b = block as ContentBlock;
          if (b.type === 'tool_result' && b.tool_use_id) willNest.add(b.tool_use_id);
        }
        break;
      }
      case 'tool_use_summary': {
        const tusMsg = msg as Extract<SessionMsg, { type: 'tool_use_summary' }>;
        for (const id of tusMsg.preceding_tool_use_ids ?? []) {
          if (registeredToolUseIds.has(id)) willNest.add(id);
        }
        break;
      }
      default:
        break;
    }
  }

  return willNest;
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

  // Pre-pass: collect isMeta injection messages (e.g. skill content) keyed by sourceToolUseID.
  // These are separate JSONL lines with isMeta=true that carry supplemental result content
  // (like full skill instructions) that should render inside the matching tool accordion.
  const supplementalResultMap = new Map<string, string>();
  for (const msg of messages) {
    const raw = msg as Record<string, unknown>;
    if (raw['isMeta'] === true && raw['type'] === 'user' && raw['sourceToolUseID']) {
      const toolUseId = String(raw['sourceToolUseID']);
      const msgContent = (raw['message'] as { content?: unknown } | undefined)?.content;
      const textParts: string[] = [];
      if (typeof msgContent === 'string') {
        textParts.push(msgContent);
      } else if (Array.isArray(msgContent)) {
        for (const block of msgContent) {
          const b = block as ContentBlock;
          if (b.type === 'text' && typeof b.text === 'string') textParts.push(b.text);
        }
      }
      if (textParts.length > 0) supplementalResultMap.set(toolUseId, textParts.join('\n\n'));
    }
  }

  // Pre-pass: collect hook_* attachment messages keyed by their toolUseID, so each
  // tool's hooks can nest inside its ToolAccordion body. Mirrors the
  // supplementalResultMap precedent above (a Map<toolUseID, …> built before render).
  const toolAttachmentsMap = new Map<string, AttachmentPayload[]>();
  for (const msg of messages) {
    if (msg.type !== 'attachment') continue;
    const attachment = (msg as Extract<SessionMsg, { type: 'attachment' }>).attachment;
    if (!HOOK_ATTACHMENT_TYPES.has(attachment.type)) continue;
    const toolUseID = (attachment as { toolUseID?: string }).toolUseID;
    if (!toolUseID) continue;
    const existing = toolAttachmentsMap.get(toolUseID);
    if (existing) {
      existing.push(attachment);
    } else {
      toolAttachmentsMap.set(toolUseID, [attachment]);
    }
  }

  // Pre-pass: compute the set of toolUseIDs that WILL reach a ToolAccordion
  // render site, so the `case 'attachment'` arm can decide orphan-vs-nested
  // order-independently. A hook attachment line usually precedes its own
  // tool_result in the real stream, so a mid-loop "consumed" set populated only
  // when the tool renders would still be empty at the hook's position and the
  // hook would double-render (once standalone, once nested). Walking the whole
  // message list up front removes that ordering dependence: an assistant
  // tool_use block id "will nest" iff a later tool_result carries it, or a
  // tool_use_summary lists it among preceding_tool_use_ids — exactly the ids
  // that pair into a ToolAccordion below.
  const willNestToolUseIds = computeWillNestToolUseIds(messages);

  const nodes: React.ReactElement[] = [];

  messages.forEach((msg, idx) => {
    const key = `msg-${idx}`;

    switch (msg.type) {
      case 'system': {
        const sysMsg = msg as Extract<SessionMsg, { type: 'system' }>;
        // Skip hook lifecycle events — internal infrastructure noise that appears between
        // every tool call and would fragment otherwise-consecutive ToolGroup runs.
        if (
          sysMsg.subtype === 'hook_started' ||
          sysMsg.subtype === 'hook_progress' ||
          sysMsg.subtype === 'hook_response'
        ) {
          break;
        }
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
        // Skip isMeta injection messages — their content is merged into tool accordions via supplementalResultMap
        if ((msg as Record<string, unknown>)['isMeta'] === true) break;

        const userMsg = msg as Extract<SessionMsg, { type: 'user' }>;
        const content = userMsg.message?.content;

        // First pass: render tool results as ToolAccordions
        if (Array.isArray(content)) {
          content.forEach((block, bi) => {
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
            const supplemental = supplementalResultMap.get(b.tool_use_id) ?? null;
            const hooks = toolAttachmentsMap.get(b.tool_use_id);
            if (pending) {
              nodes.push(
                <ToolAccordion
                  key={`${key}-tool-${bi}`}
                  toolName={pending.name}
                  input={pending.input}
                  result={resultContent}
                  supplementalResult={supplemental}
                  hooks={hooks}
                />
              );
              pendingToolUses.delete(b.tool_use_id);
            } else {
              nodes.push(
                <ToolAccordion
                  key={`${key}-tool-${bi}`}
                  toolName="tool"
                  input={{}}
                  result={resultContent}
                  supplementalResult={supplemental}
                  hooks={hooks}
                />
              );
            }
          });
        }

        // Second pass: collect text blocks for UserTurn.
        // Skip if this message also contained tool_result blocks — those messages
        // are system/hook injections, not human turns.
        const hasToolResults =
          Array.isArray(content) && content.some((b) => (b as ContentBlock).type === 'tool_result');
        if (!hasToolResults) {
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
            const hooks = toolAttachmentsMap.get(id);
            nodes.push(
              <ToolAccordion
                key={`${key}-tus-${id}`}
                toolName={pending.name}
                input={pending.input}
                result={summary}
                hooks={hooks}
              />
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

      case 'attachment': {
        const attachment = (msg as Extract<SessionMsg, { type: 'attachment' }>).attachment;

        // A hook whose tool reaches a ToolAccordion render site is already nested
        // inside that accordion (via the toolAttachmentsMap `hooks` prop); skip it
        // here so it does not render twice. Orphan detection is order-independent:
        // it consults the pre-computed willNestToolUseIds set rather than a set
        // populated mid-loop, because the hook attachment line usually precedes
        // its own tool_result. A hook whose toolUseID is NOT in the will-nest set
        // is a true orphan and falls through to AttachmentRouter as a standalone
        // row.
        if (HOOK_ATTACHMENT_TYPES.has(attachment.type)) {
          const toolUseID = (attachment as { toolUseID?: string }).toolUseID;
          if (toolUseID && willNestToolUseIds.has(toolUseID)) break;
        }

        // Classify once here only to decide whether the row is wrapped in the
        // AmbientRow marker the grouping sweep keys off. AttachmentRouter
        // classifies again to render — both reads of the same pure function.
        // Hidden rows render nothing and produce no marker, so they never create
        // an empty group artifact. Only turn-scoped ambient rows are grouped:
        // a session-scoped ambient marker (date_change) must stay standalone so
        // it is never folded into — or erased by — the AmbientGroup collapse.
        const descriptor = classifyAttachment(attachment);
        if (descriptor.hidden) break;

        const rendered = <AttachmentRouter key={`${key}-att`} attachment={attachment} />;
        if (descriptor.scope === 'turn' && descriptor.tier === 'ambient') {
          nodes.push(<AmbientRow key={`${key}-ambient`}>{rendered}</AmbientRow>);
        } else {
          nodes.push(rendered);
        }
        break;
      }

      default:
        nodes.push(<RawJsonFallback key={key} data={msg} />);
        break;
    }
  });

  // Group consecutive ToolAccordion nodes into ToolGroup containers, and — in the
  // same pass — coalesce consecutive ambient attachment rows (AmbientRow markers)
  // into AmbientGroup zones.
  //
  // Two runs are buffered independently and ordered with each other:
  //   - `toolRun`     — consecutive ToolAccordion nodes (matched by referential
  //                     type so the existing tool-grouping invariant is intact;
  //                     AmbientRow is a distinct type and never enters it).
  //   - `ambientRun`  — consecutive AmbientRow nodes folded into an AmbientGroup.
  // Non-conversational system events (files_persisted, compact_boundary, etc.)
  // are buffered while a tool run is open — they flush after the group closes.
  // Conversational boundaries (AssistantTurn, UserTurn) always close both runs.
  const grouped: React.ReactElement[] = [];
  let toolRun: React.ReactElement[] = [];
  let ambientRun: React.ReactElement[] = [];
  let systemBuffer: React.ReactElement[] = [];
  let toolRunKey = 0;
  let ambientRunKey = 0;

  const flushAmbientRun = () => {
    if (ambientRun.length === 0) return;
    grouped.push(<AmbientGroup key={`ag-${ambientRunKey++}`} rows={ambientRun} />);
    ambientRun = [];
  };

  const flushToolRun = () => {
    if (toolRun.length === 0) {
      grouped.push(...systemBuffer);
      systemBuffer = [];
      return;
    }
    grouped.push(<ToolGroup key={`tg-${toolRunKey++}`}>{toolRun}</ToolGroup>);
    toolRun = [];
    grouped.push(...systemBuffer);
    systemBuffer = [];
  };

  for (const node of nodes) {
    if (node.type === ToolAccordion) {
      // A tool run opening closes any pending ambient run first so the two zones
      // stay ordered and never interleave.
      flushAmbientRun();
      toolRun.push(node);
    } else if (node.type === AmbientRow) {
      // Ambient rows only coalesce when truly adjacent; an open tool run closes
      // first so an AmbientGroup never lands inside a ToolGroup.
      flushToolRun();
      ambientRun.push(node);
    } else if (node.type === AssistantTurn || node.type === UserTurn) {
      flushToolRun();
      flushAmbientRun();
      grouped.push(node);
    } else {
      flushAmbientRun();
      // Non-conversational node: buffer it if a tool run is in progress so it
      // doesn't break the group; otherwise emit immediately.
      if (toolRun.length > 0) {
        systemBuffer.push(node);
      } else {
        grouped.push(...systemBuffer);
        systemBuffer = [];
        grouped.push(node);
      }
    }
  }
  flushToolRun();
  flushAmbientRun();
  grouped.push(...systemBuffer);

  return <>{grouped}</>;
}
