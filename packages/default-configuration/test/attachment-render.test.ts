/**
 * Integration tests for the MessageRouter attachment glue.
 *
 * The two BLOCKING regressions in this card lived in the untested seam between
 * `MessageRouter`'s pre-passes and its `case 'attachment'` arm: order-dependent
 * orphan detection (a hook double-rendering) and ambient grouping swallowing the
 * session-scoped `date_change` marker. The classifier itself is covered by
 * `attachment-classify.test.ts`; this file exercises node *emission and
 * grouping* with realistic stream ordering.
 *
 * `MessageRouter` is a pure render function (no React state hooks of its own),
 * so it is called directly and the returned fragment's `props.children` tree is
 * traversed structurally — React elements are plain `{ type, props }` objects,
 * so node identity is asserted by comparing `element.type` against the imported
 * component references. No DOM is rendered (the package has no jsdom, per
 * `notes/test-coverage.md`); only the element tree is inspected.
 *
 * Fixtures use the same producer-accurate shapes as `attachment-classify.test.ts`.
 *
 * @summary Integration tests for MessageRouter attachment node emission and grouping
 */

import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ToolAccordion } from '../src/streams/claude-code-session/www/components/accordions/ToolAccordion.js';
import { AmbientGroup } from '../src/streams/claude-code-session/www/components/expanded/messages/AmbientGroup.js';
import { AttachmentRouter } from '../src/streams/claude-code-session/www/components/expanded/messages/attachment/AttachmentRouter.js';
import { MessageRouter } from '../src/streams/claude-code-session/www/components/expanded/messages/MessageRouter.js';
import { SubagentActivityLine } from '../src/streams/claude-code-session/www/components/expanded/messages/SubagentActivityLine.js';
import { SupplementalContentRow } from '../src/streams/claude-code-session/www/components/expanded/messages/SupplementalContentRow.js';
import { classifyAttachment } from '../src/streams/claude-code-session/www/lib/classify-attachment.js';
import type { AttachmentPayload, SessionMsg } from '../src/streams/claude-code-session/www/lib/parse-session.js';
import { ToolGroup } from '../src/streams/lib/accordions/ToolGroup.js';

// ============================================================================
// Element-tree traversal helpers
// ============================================================================

/** A React element shape after construction: `{ type, props, key }`. */
type Element = ReactElement<{ children?: unknown }>;

/**
 * Returns true when a value is a React element (has a `type` and `props`).
 * @param value - Any traversed node.
 * @returns Whether the value is a React element object.
 */
function isElement(value: unknown): value is Element {
  return (
    typeof value === 'object' && value !== null && 'type' in value && 'props' in (value as Record<string, unknown>)
  );
}

/**
 * Reads `props.children` as a flat array, normalizing single children and
 * fragments (whose children live one level deeper).
 * @param element - A React element.
 * @returns The element's children as a flat array.
 */
function childrenOf(element: Element): unknown[] {
  const kids = element.props?.children;
  if (kids === undefined || kids === null) return [];
  return Array.isArray(kids) ? kids.flat(Infinity) : [kids];
}

/**
 * Walks the element tree rooted at `root`, collecting every element whose
 * `type` matches `componentType` (a component function reference).
 * @param root - Root element (e.g. the MessageRouter fragment).
 * @param componentType - The component reference to match by identity.
 * @returns All matching elements in document order.
 */
function findAll(root: unknown, componentType: unknown): Element[] {
  const found: Element[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node.flat(Infinity)) visit(child);
      return;
    }
    if (!isElement(node)) return;
    if (node.type === componentType) found.push(node);
    visit(node.props?.children);
  };
  visit(root);
  return found;
}

/**
 * Collects the top-level grouped nodes the MessageRouter fragment renders
 * (its direct children), each a ToolGroup, AmbientGroup, AttachmentRouter,
 * AssistantTurn, etc.
 * @param fragment - The element returned by MessageRouter.
 * @returns The fragment's direct child elements.
 */
function topLevelNodes(fragment: Element): Element[] {
  return childrenOf(fragment).filter(isElement);
}

// ============================================================================
// Fixtures (producer-accurate shapes, mirroring attachment-classify.test.ts)
// ============================================================================

/**
 * Builds an assistant message carrying one `tool_use` block.
 * @param id - The tool_use block id.
 * @param name - Tool name shown on the resulting accordion.
 * @returns An assistant SessionMsg.
 */
function assistantToolUse(id: string, name = 'Bash'): SessionMsg {
  return {
    type: 'assistant',
    message: { content: [{ type: 'tool_use', id, name, input: {} }] }
  } as SessionMsg;
}

/**
 * Builds a user message carrying one `tool_result` block for `toolUseId`.
 * @param toolUseId - The id this result pairs with.
 * @returns A user SessionMsg.
 */
function userToolResult(toolUseId: string): SessionMsg {
  return {
    type: 'user',
    message: { content: [{ type: 'tool_result', tool_use_id: toolUseId, content: 'ok' }] }
  } as SessionMsg;
}

/**
 * Wraps an attachment payload as an attachment SessionMsg.
 * @param attachment - The raw attachment payload.
 * @returns An attachment SessionMsg.
 */
function attachmentMsg(attachment: AttachmentPayload): SessionMsg {
  return { type: 'attachment', attachment } as SessionMsg;
}

const hookSuccessFor = (toolUseID: string): AttachmentPayload =>
  ({
    type: 'hook_success',
    hookName: 'PostToolUse:Bash',
    toolUseID,
    hookEvent: 'PostToolUse',
    content: '',
    stdout: 'hook ran',
    stderr: '',
    exitCode: 0
  }) as AttachmentPayload;

const orphanHookBlockingError: AttachmentPayload = {
  type: 'hook_blocking_error',
  hookName: 'Stop',
  toolUseID: 'no-such-tool-id',
  hookEvent: 'Stop',
  blockingError: {
    blockingError: 'Workspace branch has 14 commits not merged into main.',
    command: 'node stop-route-nudge.mjs'
  }
} as AttachmentPayload;

const orphanHookSuccess: AttachmentPayload = hookSuccessFor('also-no-such-tool');

const dateChange: AttachmentPayload = { type: 'date_change', newDate: '2026-06-03' } as AttachmentPayload;

const teamContext: AttachmentPayload = {
  type: 'team_context',
  agentName: 'planner-1',
  teamName: 'card-plan-main-134'
} as AttachmentPayload;

// ============================================================================
// BLOCKING 1 — order-independent orphan detection (no double-render)
// ============================================================================

describe('MessageRouter — hook nesting vs. orphan (order-independent)', () => {
  it('nests a hook in its ToolAccordion and emits no orphan, even when the hook line precedes the tool_result', () => {
    // Regression ordering: assistant tool_use → hook attachment → user tool_result.
    // The hook precedes its own result, the dominant real ordering.
    const messages: SessionMsg[] = [assistantToolUse('T1'), attachmentMsg(hookSuccessFor('T1')), userToolResult('T1')];

    const fragment = MessageRouter({ messages });

    // Exactly one ToolAccordion, and it carries the hook via its `hooks` prop.
    const accordions = findAll(fragment, ToolAccordion);
    expect(accordions).toHaveLength(1);
    const hooks = (accordions[0]?.props as { hooks?: AttachmentPayload[] }).hooks;
    expect(hooks).toBeDefined();
    expect(hooks).toHaveLength(1);
    expect(hooks?.[0]?.type).toBe('hook_success');

    // No standalone orphan node: the hook does not reach an AttachmentRouter.
    // (The nested HookRow lives inside ToolAccordion's body, which only
    // materializes when ToolAccordion renders — not in this unrendered tree —
    // so its single appearance is asserted via the `hooks` prop above.)
    const attachmentRouters = findAll(fragment, AttachmentRouter);
    expect(attachmentRouters).toHaveLength(0);
  });
});

describe('MessageRouter — genuine orphan hooks', () => {
  it('renders an orphan hook (toolUseID matches no tool) exactly once, as a standalone expandable row carrying its body', () => {
    const messages: SessionMsg[] = [attachmentMsg(orphanHookSuccess)];

    const fragment = MessageRouter({ messages });

    // No tool was rendered, so the hook falls through to a standalone AttachmentRouter.
    const accordions = findAll(fragment, ToolAccordion);
    expect(accordions).toHaveLength(0);
    const attachmentRouters = findAll(fragment, AttachmentRouter);
    expect(attachmentRouters).toHaveLength(1);

    // The orphan carries an expandable body (stdout), confirmed via the shared
    // classifier and the AttachmentRouter → HookRow path being the orphan presenter.
    const descriptor = classifyAttachment(orphanHookSuccess);
    expect(descriptor.expandable).toBe(true);
    expect(attachmentRouters[0]?.props).toMatchObject({ attachment: { type: 'hook_success' } });
  });

  it('renders an orphan hook_blocking_error as a standalone row whose classifier body is its blocking reason', () => {
    const messages: SessionMsg[] = [attachmentMsg(orphanHookBlockingError)];

    const fragment = MessageRouter({ messages });

    const attachmentRouters = findAll(fragment, AttachmentRouter);
    expect(attachmentRouters).toHaveLength(1);
    expect(attachmentRouters[0]?.props).toMatchObject({
      attachment: { type: 'hook_blocking_error' }
    });

    // The blocking error is expandable and its descriptor escalates to error
    // severity; the body (reason + command) is surfaced by the shared HookRow.
    const descriptor = classifyAttachment(orphanHookBlockingError);
    expect(descriptor.expandable).toBe(true);
    expect(descriptor.glyphSeverity).toBe('error');
  });
});

// ============================================================================
// MEDIUM — date_change is a standalone marker, never folded into AmbientGroup
// ============================================================================

describe('MessageRouter — date_change session marker', () => {
  it('renders date_change as a standalone node, not inside an AmbientGroup', () => {
    const messages: SessionMsg[] = [attachmentMsg(dateChange)];

    const fragment = MessageRouter({ messages });

    // No AmbientGroup is created for a lone session-scoped marker.
    expect(findAll(fragment, AmbientGroup)).toHaveLength(0);

    // The top-level node is a standalone AttachmentRouter for date_change.
    const top = topLevelNodes(fragment);
    const dateNodes = top.filter(
      (n) =>
        n.type === AttachmentRouter &&
        (n.props as { attachment?: AttachmentPayload }).attachment?.type === 'date_change'
    );
    expect(dateNodes).toHaveLength(1);
  });

  it('does not absorb a date_change into an adjacent run of turn-scoped ambient rows', () => {
    // Six turn-scoped ambient rows (collapses to summary) immediately followed
    // by a session-scoped date_change. The date marker must stay outside the group.
    const messages: SessionMsg[] = [
      ...Array.from({ length: 6 }, () => attachmentMsg(teamContext)),
      attachmentMsg(dateChange)
    ];

    const fragment = MessageRouter({ messages });

    const ambientGroups = findAll(fragment, AmbientGroup);
    expect(ambientGroups).toHaveLength(1);

    // The date_change is NOT among the AmbientGroup's rows.
    const groupedDateChange = findAll(ambientGroups[0], AttachmentRouter).filter(
      (n) => (n.props as { attachment?: AttachmentPayload }).attachment?.type === 'date_change'
    );
    expect(groupedDateChange).toHaveLength(0);

    // It is a standalone top-level node instead.
    const top = topLevelNodes(fragment);
    const dateNodes = top.filter(
      (n) =>
        n.type === AttachmentRouter &&
        (n.props as { attachment?: AttachmentPayload }).attachment?.type === 'date_change'
    );
    expect(dateNodes).toHaveLength(1);
  });
});

// ============================================================================
// Intended collapse — a run of ≥6 turn-scoped ambient rows still summarizes
// ============================================================================

describe('MessageRouter — ambient grouping (intended collapse preserved)', () => {
  it('collapses a run of more than five turn-scoped ambient rows into a single AmbientGroup', () => {
    const messages: SessionMsg[] = Array.from({ length: 6 }, () => attachmentMsg(teamContext));

    const fragment = MessageRouter({ messages });

    const ambientGroups = findAll(fragment, AmbientGroup);
    expect(ambientGroups).toHaveLength(1);
    // All six ambient rows route through the single group (AMBIENT_SUMMARY_THRESHOLD = 5).
    const rows = (ambientGroups[0]?.props as { rows?: unknown[] }).rows;
    expect(rows).toHaveLength(6);
  });

  it('keeps consecutive tool runs folding into a single ToolGroup (grouping invariant intact)', () => {
    const messages: SessionMsg[] = [
      assistantToolUse('A'),
      userToolResult('A'),
      assistantToolUse('B'),
      userToolResult('B')
    ];

    const fragment = MessageRouter({ messages });

    expect(findAll(fragment, ToolGroup)).toHaveLength(1);
    expect(findAll(fragment, ToolAccordion)).toHaveLength(2);
  });
});

// ============================================================================
// `progress` messages — subagent tool activity, no paired tool_result here
// ============================================================================

describe('MessageRouter — progress (subagent activity)', () => {
  it('renders a SubagentActivityLine for each tool_use block in an agent_progress message', () => {
    const messages: SessionMsg[] = [
      {
        type: 'progress',
        data: {
          type: 'agent_progress',
          content: [
            { type: 'tool_use', name: 'Bash', input: { command: 'ls' } },
            { type: 'tool_use', name: 'Read', input: { file_path: '/tmp/x.ts' } }
          ]
        }
      } as SessionMsg
    ];

    const fragment = MessageRouter({ messages });

    const lines = findAll(fragment, SubagentActivityLine);
    expect(lines).toHaveLength(2);
    expect((lines[0]?.props as { toolName?: string }).toolName).toBe('Bash');
    expect((lines[1]?.props as { toolName?: string }).toolName).toBe('Read');
  });

  it('renders nothing for a progress message whose data.type is not agent_progress', () => {
    const messages: SessionMsg[] = [{ type: 'progress', data: { type: 'something_else', content: [] } } as SessionMsg];

    const fragment = MessageRouter({ messages });

    expect(findAll(fragment, SubagentActivityLine)).toHaveLength(0);
  });
});

// ============================================================================
// isMeta supplemental content — nested when its tool_result arrives, rendered
// standalone (never dropped) when it doesn't
// ============================================================================

describe('MessageRouter — isMeta supplemental content', () => {
  it('nests isMeta content into the owning ToolAccordion when its sourceToolUseID carries a real tool_result', () => {
    const messages: SessionMsg[] = [
      assistantToolUse('T1', 'Skill'),
      {
        type: 'user',
        isMeta: true,
        sourceToolUseID: 'T1',
        message: { content: [{ type: 'text', text: 'full skill instructions' }] }
      } as unknown as SessionMsg,
      userToolResult('T1')
    ];

    const fragment = MessageRouter({ messages });

    expect(findAll(fragment, SupplementalContentRow)).toHaveLength(0);
    const accordions = findAll(fragment, ToolAccordion);
    expect(accordions).toHaveLength(1);
    expect((accordions[0]?.props as { supplementalResult?: string }).supplementalResult).toBe(
      'full skill instructions'
    );
  });

  it('renders isMeta content standalone via SupplementalContentRow when its tool_result never arrives (orphan)', () => {
    const messages: SessionMsg[] = [
      {
        type: 'user',
        isMeta: true,
        sourceToolUseID: 'no-such-tool',
        message: { content: [{ type: 'text', text: 'orphaned instructions' }] }
      } as unknown as SessionMsg
    ];

    const fragment = MessageRouter({ messages });

    const rows = findAll(fragment, SupplementalContentRow);
    expect(rows).toHaveLength(1);
    expect((rows[0]?.props as { text?: string }).text).toBe('orphaned instructions');
  });

  it('renders isMeta content standalone when it carries no sourceToolUseID at all', () => {
    const messages: SessionMsg[] = [
      {
        type: 'user',
        isMeta: true,
        message: { content: [{ type: 'text', text: 'untethered isMeta text' }] }
      } as unknown as SessionMsg
    ];

    const fragment = MessageRouter({ messages });

    const rows = findAll(fragment, SupplementalContentRow);
    expect(rows).toHaveLength(1);
    expect((rows[0]?.props as { text?: string }).text).toBe('untethered isMeta text');
  });
});
