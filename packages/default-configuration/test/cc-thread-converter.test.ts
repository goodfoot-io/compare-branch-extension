/**
 * Tests for `toThreadMessages` — the claude-code-session `SessionMsg[]` →
 * `ThreadMessageLike[]` converter that replaced the retired
 * `MessageRouter`/`AssistantTurn`/`UserTurn`/`SystemRouter` render tree when
 * the expanded transcript moved to assistant-ui.
 *
 * Migrates and extends the coverage from the retired `attachment-render.test.ts`
 * (MessageRouter attachment-glue integration: hook nesting vs. orphan
 * order-independence, date_change vs. ambient grouping, isMeta supplemental
 * nesting, progress/subagent activity, unrecognized message fallback) and
 * `system-router.test.ts` (unrecognized system subtype fallback) — this time
 * asserting directly on the returned `ThreadMessageLike[]`/part structure
 * rather than a React element tree, since the converter is a pure data
 * transform with no React dependency of its own.
 *
 * @summary Unit tests for the SessionMsg[] → ThreadMessageLike[] converter
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AttachmentPayload, SessionMsg } from '../src/streams/claude-code-session/www/lib/parse-session.js';
import { parseLines } from '../src/streams/claude-code-session/www/lib/parse-session.js';
import type {
  CcAmbientGroupData,
  CcAttachmentData,
  CcHookData,
  CcSupplementalData,
  CcToolResult
} from '../src/streams/claude-code-session/www/lib/to-thread-messages.js';
import { toThreadMessages } from '../src/streams/claude-code-session/www/lib/to-thread-messages.js';
import { StreamThread } from '../src/streams/lib/aui/index.js';

// ============================================================================
// Fixtures (mirroring the retired attachment-render.test.ts / attachment-classify.test.ts)
// ============================================================================

function assistantToolUse(id: string, name = 'Bash'): SessionMsg {
  return {
    type: 'assistant',
    message: { content: [{ type: 'tool_use', id, name, input: {} }] }
  } as SessionMsg;
}

function userToolResult(toolUseId: string): SessionMsg {
  return {
    type: 'user',
    message: { content: [{ type: 'tool_result', tool_use_id: toolUseId, content: 'ok' }] }
  } as SessionMsg;
}

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

/**
 * Finds every part named `name` across a set of ThreadMessageLike messages, with its owning message role.
 * @param messages - Converted thread messages to search.
 * @param name - The data part `name` to match.
 * @returns Matching parts' `data`, alongside their owning message's `role`.
 */
function findDataParts(
  messages: ReturnType<typeof toThreadMessages>['messages'],
  name: string
): { role: string; data: unknown }[] {
  const found: { role: string; data: unknown }[] = [];
  for (const message of messages) {
    if (typeof message.content === 'string') continue;
    for (const part of message.content) {
      if (part.type === 'data' && part.name === name) found.push({ role: message.role, data: part.data });
    }
  }
  return found;
}

/**
 * Finds every tool-call part across a set of messages.
 * @param messages - Converted thread messages to search.
 * @returns All `tool-call` parts found, in document order.
 */
function findToolCalls(
  messages: ReturnType<typeof toThreadMessages>['messages']
): Extract<(typeof messages)[number]['content'][number], { type: 'tool-call' }>[] {
  const found: Extract<(typeof messages)[number]['content'][number], { type: 'tool-call' }>[] = [];
  for (const message of messages) {
    if (typeof message.content === 'string') continue;
    for (const part of message.content) {
      if (part.type === 'tool-call') found.push(part as (typeof found)[number]);
    }
  }
  return found;
}

// ============================================================================
// Hook nesting vs. orphan (order-independent) — BLOCKING regression coverage
// ============================================================================

describe('toThreadMessages — hook nesting vs. orphan (order-independent)', () => {
  it('nests a hook into its tool-call result and emits no orphan cc-hook, even when the hook line precedes the tool_result', () => {
    // Regression ordering: assistant tool_use → hook attachment → user tool_result.
    const messages: SessionMsg[] = [assistantToolUse('T1'), attachmentMsg(hookSuccessFor('T1')), userToolResult('T1')];

    const { messages: threadMessages } = toThreadMessages(messages);

    const toolCalls = findToolCalls(threadMessages);
    expect(toolCalls).toHaveLength(1);
    const result = toolCalls[0]?.result as CcToolResult | undefined;
    expect(result?.hooks).toHaveLength(1);
    expect(result?.hooks?.[0]?.type).toBe('hook_success');

    expect(findDataParts(threadMessages, 'cc-hook')).toHaveLength(0);
  });
});

describe('toThreadMessages — genuine orphan hooks', () => {
  it('renders an orphan hook (toolUseID matches no tool) exactly once, as a cc-hook data part', () => {
    const { messages } = toThreadMessages([attachmentMsg(orphanHookSuccess)]);

    expect(findToolCalls(messages)).toHaveLength(0);
    const hookParts = findDataParts(messages, 'cc-hook');
    expect(hookParts).toHaveLength(1);
    expect((hookParts[0]?.data as CcHookData).hook.type).toBe('hook_success');
  });

  it('renders an orphan hook_blocking_error as a standalone cc-hook data part', () => {
    const { messages } = toThreadMessages([attachmentMsg(orphanHookBlockingError)]);

    const hookParts = findDataParts(messages, 'cc-hook');
    expect(hookParts).toHaveLength(1);
    expect((hookParts[0]?.data as CcHookData).hook.type).toBe('hook_blocking_error');
  });
});

// ============================================================================
// date_change is a standalone marker, never folded into cc-ambient-group
// ============================================================================

describe('toThreadMessages — date_change session marker', () => {
  it('renders date_change as a standalone cc-attachment part, not inside cc-ambient-group', () => {
    const { messages } = toThreadMessages([attachmentMsg(dateChange)]);

    expect(findDataParts(messages, 'cc-ambient-group')).toHaveLength(0);
    const attachmentParts = findDataParts(messages, 'cc-attachment');
    expect(attachmentParts).toHaveLength(1);
    expect((attachmentParts[0]?.data as CcAttachmentData).attachment.type).toBe('date_change');
  });

  it('does not absorb a date_change into an adjacent run of turn-scoped ambient rows', () => {
    // Six turn-scoped ambient rows (collapses to summary) immediately followed
    // by a session-scoped date_change. The date marker must stay outside the group.
    const messages: SessionMsg[] = [
      ...Array.from({ length: 6 }, () => attachmentMsg(teamContext)),
      attachmentMsg(dateChange)
    ];

    const { messages: threadMessages } = toThreadMessages(messages);

    const ambientParts = findDataParts(threadMessages, 'cc-ambient-group');
    expect(ambientParts).toHaveLength(1);
    expect((ambientParts[0]?.data as CcAmbientGroupData).attachments).toHaveLength(6);
    expect((ambientParts[0]?.data as CcAmbientGroupData).attachments.every((a) => a.type === 'team_context')).toBe(
      true
    );

    const attachmentParts = findDataParts(threadMessages, 'cc-attachment');
    expect(attachmentParts).toHaveLength(1);
    expect((attachmentParts[0]?.data as CcAttachmentData).attachment.type).toBe('date_change');
  });
});

// ============================================================================
// Ambient grouping (collapse preserved) + tool-call pairing across turns
// ============================================================================

describe('toThreadMessages — ambient grouping and tool-call pairing', () => {
  it('collapses a run of turn-scoped ambient rows into a single cc-ambient-group', () => {
    const messages: SessionMsg[] = Array.from({ length: 6 }, () => attachmentMsg(teamContext));

    const { messages: threadMessages } = toThreadMessages(messages);

    const ambientParts = findDataParts(threadMessages, 'cc-ambient-group');
    expect(ambientParts).toHaveLength(1);
    expect((ambientParts[0]?.data as CcAmbientGroupData).attachments).toHaveLength(6);
  });

  it('pairs each tool_use with its later tool_result across two separate turns', () => {
    const messages: SessionMsg[] = [
      assistantToolUse('A'),
      userToolResult('A'),
      assistantToolUse('B'),
      userToolResult('B')
    ];

    const { messages: threadMessages } = toThreadMessages(messages);

    const toolCalls = findToolCalls(threadMessages);
    expect(toolCalls).toHaveLength(2);
    expect(toolCalls.every((tc) => (tc.result as CcToolResult).output === 'ok')).toBe(true);
  });
});

// ============================================================================
// progress messages — subagent tool activity rendered as status lines
// ============================================================================

describe('toThreadMessages — progress (subagent activity)', () => {
  it('renders a status-line part for each tool_use block in an agent_progress message', () => {
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

    const { messages: threadMessages } = toThreadMessages(messages);

    const statusLines = findDataParts(threadMessages, 'status-line');
    expect(statusLines.map((p) => (p.data as { text: string }).text)).toEqual(['↳ Bash ls', '↳ Read tmp/x.ts']);
  });

  it('renders nothing for a progress message whose data.type is not agent_progress', () => {
    const { messages } = toThreadMessages([
      { type: 'progress', data: { type: 'something_else', content: [] } } as SessionMsg
    ]);

    expect(messages).toHaveLength(0);
  });
});

// ============================================================================
// isMeta supplemental content — nested when its tool_result arrives, rendered
// standalone (never dropped) when it doesn't
// ============================================================================

describe('toThreadMessages — isMeta supplemental content', () => {
  it('attaches isMeta content to the owning tool-call as supplementalResult when its sourceToolUseID carries a real tool_result', () => {
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

    const { messages: threadMessages } = toThreadMessages(messages);

    expect(findDataParts(threadMessages, 'cc-supplemental')).toHaveLength(0);
    const toolCalls = findToolCalls(threadMessages);
    expect(toolCalls).toHaveLength(1);
    expect((toolCalls[0]?.result as CcToolResult).supplementalResult).toBe('full skill instructions');
  });

  it('renders isMeta content standalone via cc-supplemental when its tool_result never arrives (orphan)', () => {
    const messages: SessionMsg[] = [
      {
        type: 'user',
        isMeta: true,
        sourceToolUseID: 'no-such-tool',
        message: { content: [{ type: 'text', text: 'orphaned instructions' }] }
      } as unknown as SessionMsg
    ];

    const { messages: threadMessages } = toThreadMessages(messages);

    const supplementalParts = findDataParts(threadMessages, 'cc-supplemental');
    expect(supplementalParts).toHaveLength(1);
    expect((supplementalParts[0]?.data as CcSupplementalData).text).toBe('orphaned instructions');
  });

  it('renders isMeta content standalone when it carries no sourceToolUseID at all', () => {
    const messages: SessionMsg[] = [
      {
        type: 'user',
        isMeta: true,
        message: { content: [{ type: 'text', text: 'untethered isMeta text' }] }
      } as unknown as SessionMsg
    ];

    const { messages: threadMessages } = toThreadMessages(messages);

    const supplementalParts = findDataParts(threadMessages, 'cc-supplemental');
    expect(supplementalParts).toHaveLength(1);
    expect((supplementalParts[0]?.data as CcSupplementalData).text).toBe('untethered isMeta text');
  });
});

// ============================================================================
// Boundaries — session start, compaction, result
// ============================================================================

describe('toThreadMessages — boundaries', () => {
  it('renders a turn boundary for system init, capturing model/cwd', () => {
    const { messages, model, cwd } = toThreadMessages([
      { type: 'system', subtype: 'init', model: 'claude-x', cwd: '/work', tools: ['a', 'b'] } as SessionMsg
    ]);

    expect(model).toBe('claude-x');
    expect(cwd).toBe('/work');
    const boundaries = findDataParts(messages, 'boundary');
    expect(boundaries).toEqual([{ role: 'assistant', data: { kind: 'turn', label: 'Session started · 2 tools' } }]);
  });

  it('renders a compaction boundary with trigger and token count', () => {
    const { messages } = toThreadMessages([
      {
        type: 'system',
        subtype: 'compact_boundary',
        compact_metadata: { trigger: 'manual', pre_tokens: 12345 }
      } as SessionMsg
    ]);

    const boundaries = findDataParts(messages, 'boundary');
    expect(boundaries).toEqual([
      { role: 'assistant', data: { kind: 'compaction', label: 'Context compacted (manual) · 12,345 tokens' } }
    ]);
  });

  it('renders a success result boundary and reports isRunning false / status success', () => {
    const { messages, isRunning, status } = toThreadMessages([
      { type: 'result', subtype: 'success', num_turns: 4, duration_ms: 12000 } as SessionMsg
    ]);

    expect(isRunning).toBe(false);
    expect(status).toBe('success');
    const boundaries = findDataParts(messages, 'boundary');
    expect(boundaries).toEqual([
      { role: 'assistant', data: { kind: 'result', label: 'Session complete · 4 turns · 12s' } }
    ]);
  });

  it('renders an error result boundary and reports status error', () => {
    const { messages, status } = toThreadMessages([
      { type: 'result', subtype: 'error_max_turns', num_turns: 2, duration_ms: 3000 } as SessionMsg
    ]);

    expect(status).toBe('error');
    const boundaries = findDataParts(messages, 'boundary');
    expect(boundaries).toEqual([
      { role: 'assistant', data: { kind: 'result', label: 'Session error (error_max_turns) · 2 turns · 3s' } }
    ]);
  });
});

// ============================================================================
// Coordination content and reasoning inside user/assistant turns
// ============================================================================

describe('toThreadMessages — coordination content and reasoning', () => {
  it('renders a coordination status-line for an assistant JSON text block, and a text part for genuine prose', () => {
    const messages: SessionMsg[] = [
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: '{"from":"reviewer","type":"approval"}' },
            { type: 'text', text: 'Looks good to merge.' }
          ]
        }
      } as SessionMsg
    ];

    const { messages: threadMessages } = toThreadMessages(messages);

    expect(threadMessages).toHaveLength(1);
    expect(threadMessages[0]?.role).toBe('assistant');
    const statusLines = findDataParts(threadMessages, 'status-line');
    expect(statusLines).toHaveLength(1);
    expect((statusLines[0]?.data as { text: string }).text).toBe('reviewer: approval');
    expect(threadMessages[0]?.content).toContainEqual({ type: 'text', text: 'Looks good to merge.' });
  });

  it('produces no message for an assistant turn whose only text block is a suppressed idle_notification', () => {
    const { messages } = toThreadMessages([
      {
        type: 'assistant',
        message: { content: [{ type: 'text', text: '{"type":"idle_notification"}' }] }
      } as SessionMsg
    ]);

    expect(messages).toHaveLength(0);
  });

  it('renders a coordination status-line for a user JSON text block', () => {
    const { messages } = toThreadMessages([
      {
        type: 'user',
        message: { content: [{ type: 'text', text: '{"from":"user","type":"task_id"}' }] }
      } as SessionMsg
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe('user');
    const statusLines = findDataParts(messages, 'status-line');
    expect((statusLines[0]?.data as { text: string }).text).toBe('user: task id');
  });

  it('renders a reasoning part for a thinking block', () => {
    const { messages } = toThreadMessages([
      {
        type: 'assistant',
        message: { content: [{ type: 'thinking', thinking: 'Weighing options.' }] }
      } as SessionMsg
    ]);

    expect(messages[0]?.content).toContainEqual({ type: 'reasoning', text: 'Weighing options.' });
  });
});

// ============================================================================
// Unrecognized shapes — never silently dropped
// ============================================================================

describe('toThreadMessages — unrecognized shapes fall through to `raw`', () => {
  it('renders the shared raw data part for an unrecognized system subtype', () => {
    const { messages } = toThreadMessages([
      { type: 'system', subtype: 'some_future_subtype', extra: 'payload' } as SessionMsg
    ]);

    const rawParts = findDataParts(messages, 'raw');
    expect(rawParts).toHaveLength(1);
    expect((rawParts[0]?.data as { label?: string }).label).toBe('Unrecognized system event · some_future_subtype');
  });

  it('renders the shared raw data part for an unrecognized top-level message type', () => {
    const { messages } = toThreadMessages([
      { type: 'some_future_message_type', payload: 'x' } as unknown as SessionMsg
    ]);

    const rawParts = findDataParts(messages, 'raw');
    expect(rawParts).toHaveLength(1);
    expect((rawParts[0]?.data as { label?: string }).label).toBe('Unrecognized message · some_future_message_type');
  });
});

// ============================================================================
// Previously-unrecognized message types now classified as status-lines
// ============================================================================

describe('toThreadMessages — turn_duration, queue-operation, worktree-state, bridge-session', () => {
  it('renders a system turn_duration message as a duration + message-count status-line', () => {
    const { messages } = toThreadMessages([
      { type: 'system', subtype: 'turn_duration', durationMs: 1600, messageCount: 80 } as SessionMsg
    ]);

    const statusLines = findDataParts(messages, 'status-line');
    expect(statusLines).toHaveLength(1);
    expect((statusLines[0]?.data as { text: string }).text).toBe('Turn · 1.6s · 80 messages');
    expect(findDataParts(messages, 'raw')).toHaveLength(0);
  });

  it('singularizes the message count for a turn_duration of exactly one message', () => {
    const { messages } = toThreadMessages([
      { type: 'system', subtype: 'turn_duration', durationMs: 500, messageCount: 1 } as SessionMsg
    ]);

    const statusLines = findDataParts(messages, 'status-line');
    expect((statusLines[0]?.data as { text: string }).text).toBe('Turn · 0.5s · 1 message');
  });

  it('renders an enqueue queue-operation as a "Queued:" status-line with a stripped, truncated preview', () => {
    const { messages } = toThreadMessages([
      { type: 'queue-operation', operation: 'enqueue', content: '<task>Fix the flaky test</task>' } as SessionMsg
    ]);

    const statusLines = findDataParts(messages, 'status-line');
    expect(statusLines).toHaveLength(1);
    expect((statusLines[0]?.data as { text: string }).text).toBe('Queued: Fix the flaky test');
  });

  it('truncates a long enqueue preview to ~60 chars', () => {
    const content = 'x'.repeat(200);
    const { messages } = toThreadMessages([{ type: 'queue-operation', operation: 'enqueue', content } as SessionMsg]);

    const statusLines = findDataParts(messages, 'status-line');
    expect((statusLines[0]?.data as { text: string }).text).toBe(`Queued: ${'x'.repeat(60)}…`);
  });

  it.each(['remove', 'dequeue'] as const)('renders a %s queue-operation as "Queue: %s"', (operation) => {
    const { messages } = toThreadMessages([{ type: 'queue-operation', operation } as SessionMsg]);

    const statusLines = findDataParts(messages, 'status-line');
    expect((statusLines[0]?.data as { text: string }).text).toBe(`Queue: ${operation}`);
  });

  it('falls through to the raw fallback for an unrecognized queue-operation operation', () => {
    const { messages } = toThreadMessages([
      { type: 'queue-operation', operation: 'some_future_op' } as unknown as SessionMsg
    ]);

    const rawParts = findDataParts(messages, 'raw');
    expect(rawParts).toHaveLength(1);
    expect((rawParts[0]?.data as { label?: string }).label).toBe('Unrecognized queue operation · some_future_op');
  });

  it('renders a worktree-state message as a "Worktree:" status-line naming the worktree', () => {
    const { messages } = toThreadMessages([
      {
        type: 'worktree-state',
        worktreeSession: { worktreeName: 'workspace-c52ddf65', worktreePath: '/home/node/.cards/worktrees/x' }
      } as SessionMsg
    ]);

    const statusLines = findDataParts(messages, 'status-line');
    expect(statusLines).toHaveLength(1);
    expect((statusLines[0]?.data as { text: string }).text).toBe('Worktree: workspace-c52ddf65');
  });

  it('renders a bridge-session message as a "Bridge session" status-line naming the session id', () => {
    const { messages } = toThreadMessages([{ type: 'bridge-session', bridgeSessionId: 'bridge-42' } as SessionMsg]);

    const statusLines = findDataParts(messages, 'status-line');
    expect(statusLines).toHaveLength(1);
    expect((statusLines[0]?.data as { text: string }).text).toBe('Bridge session bridge-42');
  });
});

// ============================================================================
// Overall running/isRunning derivation
// ============================================================================

describe('toThreadMessages — isRunning derivation', () => {
  it('reports isRunning true and marks the last assistant message running when no result message is present', () => {
    const { messages, isRunning } = toThreadMessages([
      { type: 'assistant', message: { content: [{ type: 'text', text: 'Working on it.' }] } } as SessionMsg
    ]);

    expect(isRunning).toBe(true);
    expect(messages[0]?.status).toEqual({ type: 'running' });
  });

  it('marks assistant messages complete once a result message has been seen', () => {
    const { messages, isRunning } = toThreadMessages([
      { type: 'assistant', message: { content: [{ type: 'text', text: 'Done.' }] } } as SessionMsg,
      { type: 'result', subtype: 'success', num_turns: 1, duration_ms: 100 } as SessionMsg
    ]);

    expect(isRunning).toBe(false);
    const assistantMessage = messages.find((m) => m.role === 'assistant');
    expect(assistantMessage?.status).toEqual({ type: 'complete', reason: 'stop' });
  });
});

// ============================================================================
// No `role: 'system'` message is ever produced
// ============================================================================

describe('toThreadMessages — no system-role messages (runtime constraint)', () => {
  // @assistant-ui/core's fromThreadMessageLike throws "System messages must
  // have exactly one text message part." for any role:'system' message whose
  // content isn't exactly one text part. Every structural/status row this
  // converter emits (boundary/status-line/error-line/raw/cc-*) is a `data`
  // part, so a `system` role would always violate that constraint. This test
  // asserts the converter never produces one, across every kind of content —
  // structural, ambient, hook, coordination, tool-call, and user turns.
  it('never emits a role:"system" message across a transcript exercising every part kind', () => {
    const messages: SessionMsg[] = [
      { type: 'system', subtype: 'init', model: 'x', cwd: '/w', tools: [] } as SessionMsg,
      { type: 'system', subtype: 'status', status: 'compacting' } as SessionMsg,
      attachmentMsg(teamContext),
      attachmentMsg(dateChange),
      assistantToolUse('T1'),
      attachmentMsg(hookSuccessFor('T1')),
      {
        type: 'assistant',
        message: { content: [{ type: 'text', text: '{"from":"a","type":"note"}' }] }
      } as SessionMsg,
      userToolResult('T1'),
      attachmentMsg(orphanHookSuccess),
      {
        type: 'user',
        message: { content: [{ type: 'text', text: 'thanks' }] }
      } as SessionMsg,
      { type: 'auth_status', error: 'boom' } as SessionMsg,
      { type: 'system', subtype: 'unknown_future' } as SessionMsg,
      { type: 'result', subtype: 'success', num_turns: 1, duration_ms: 10 } as SessionMsg
    ];

    const { messages: threadMessages } = toThreadMessages(messages);

    expect(threadMessages.some((m) => m.role === 'system')).toBe(false);
    for (const message of threadMessages) {
      if (message.role !== 'system') continue;
      // Defensive: even if a future change reintroduces a system message, it
      // must satisfy assistant-ui's one-text-part constraint.
      expect(message.content).toEqual([{ type: 'text', text: expect.any(String) }]);
    }
  });

  it('renders a real session/init JSONL line through parseLines → toThreadMessages → StreamThread without throwing', () => {
    // The exact regression case: every real session starts with a system/init
    // line, which used to become a role:'system' message carrying a `boundary`
    // data part — the precise shape fromThreadMessageLike rejects. Routing it
    // through the real StreamThread (not just inspecting the converter's
    // output) is what actually catches the throw.
    const initLine = JSON.stringify({
      type: 'system',
      subtype: 'init',
      cwd: '/workspace',
      session_id: 's1',
      tools: ['Bash', 'Read'],
      model: 'claude-fable-5',
      uuid: 'u-1'
    });

    const parsed = parseLines([initLine]);
    const { messages, isRunning } = toThreadMessages(parsed);

    expect(messages.every((m) => m.role !== 'system')).toBe(true);

    const html = renderToStaticMarkup(createElement(StreamThread, { messages, isRunning }));
    expect(html).toContain('Session started');
  });
});
