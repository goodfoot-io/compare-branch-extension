/**
 * Tests for the attachment classifier pure transform.
 *
 * Targets `classifyAttachment` — a pure function that converts a parsed
 * `AttachmentPayload` into an `AttachmentDescriptor` encoding the
 * render-or-hide decision, scope, tier, glyph, summary, and linkPath.
 *
 * Mirrors the house pattern from `codex-expanded.test.ts`: fixture-driven,
 * no React/DOM, all `it.skip` (Phase 2 TDD). Phase 3 unskips by implementing
 * `classifyAttachment` in `lib/classify-attachment.ts`.
 *
 * All fixtures are real attachment objects sampled from `~/.claude/projects`
 * JSONL files so the classifier is exercised against producer-accurate shapes.
 *
 * @summary Skipped unit tests for the attachment classifier pure transform
 */

import { describe, expect, it } from 'vitest';
import { classifyAttachment } from '../src/streams/claude-code-session/www/lib/classify-attachment.js';
import type {
  AttachmentPayload,
  CommandPermissionsAttachment,
  CompactFileReferenceAttachment,
  DateChangeAttachment,
  DeferredToolsDeltaAttachment,
  DynamicSkillAttachment,
  EditedTextFileAttachment,
  FileAttachment,
  HookAdditionalContextAttachment,
  HookBlockingErrorAttachment,
  HookCancelledAttachment,
  HookNonBlockingErrorAttachment,
  HookSuccessAttachment,
  HookSystemMessageAttachment,
  InvokedSkillsAttachment,
  McpInstructionsDeltaAttachment,
  NestedMemoryAttachment,
  OpenedFileInIdeAttachment,
  QueuedCommandAttachment,
  SelectedLinesInIdeAttachment,
  SkillListingAttachment,
  TaskReminderAttachment,
  TeamContextAttachment
} from '../src/streams/claude-code-session/www/lib/parse-session.js';

// ============================================================================
// Real-corpus fixtures (one sample per attachment.type from ~/.claude/projects)
// ============================================================================

const hookSuccessFixture: HookSuccessAttachment = {
  type: 'hook_success',
  hookName: 'SessionStart:startup',
  toolUseID: '4c9e488d-447c-413b-804a-ea1f0a650d8f',
  hookEvent: 'SessionStart',
  content: '',
  stdout: '{"systemMessage":"context injected"}',
  stderr: '',
  exitCode: 0,
  command: '"$(cat $HOME/.cards/VSCODE_NODE 2>/dev/null || echo node)" $CLAUDE_PLUGIN_ROOT/hooks/bin/session-start.mjs',
  durationMs: 549
};

const hookSystemMessageFixture: HookSystemMessageAttachment = {
  type: 'hook_system_message',
  content: 'CARD_ID=main-110\nCARD_REPO_PATH=/home/node/.cards/cards-repos/main-110',
  hookName: 'SessionStart:startup',
  toolUseID: '4c9e488d-447c-413b-804a-ea1f0a650d8f',
  hookEvent: 'SessionStart'
};

const hookAdditionalContextFixture: HookAdditionalContextAttachment = {
  type: 'hook_additional_context',
  content: ['CARD_ID=main-110\nCARD_REPO_PATH=/home/node/.cards/cards-repos/main-110'],
  hookName: 'SessionStart',
  toolUseID: 'SessionStart',
  hookEvent: 'SessionStart'
};

const hookNonBlockingErrorFixture: HookNonBlockingErrorAttachment = {
  type: 'hook_non_blocking_error',
  hookName: 'Stop',
  toolUseID: '1faad081-dafa-4ce9-a8e6-02eeec201742',
  hookEvent: 'Stop',
  stderr: 'Failed with non-blocking status code: Error: Cannot find module\n    at Module._resolveFilename',
  stdout: '',
  exitCode: 1,
  command: 'node $CLAUDE_PLUGIN_ROOT/hooks/bin/stop.41712f95.mjs',
  durationMs: 24
};

const hookBlockingErrorFixture: HookBlockingErrorAttachment = {
  type: 'hook_blocking_error',
  hookName: 'Stop',
  toolUseID: 'a29516e6-9f9c-44db-a5ca-3f439344292b',
  hookEvent: 'Stop',
  blockingError: {
    blockingError:
      'Workspace branch `cards/main-110/1` has 14 commit(s) not merged into `main`. Read `merge.md` and follow its instructions.',
    command:
      '"$(cat $HOME/.cards/VSCODE_NODE 2>/dev/null || echo node)" $CLAUDE_PLUGIN_ROOT/hooks/bin/stop-route-nudge.mjs'
  }
};

const hookCancelledFixture: HookCancelledAttachment = {
  type: 'hook_cancelled',
  hookName: 'PostToolUse:Bash',
  toolUseID: 'call_00_jqazKnJHYHJ8DVFu9qeU8012',
  hookEvent: 'PostToolUse'
};

const teamContextFixture: TeamContextAttachment = {
  type: 'team_context',
  agentId: 'planner-1@card-plan-main-110',
  agentName: 'planner-1',
  teamName: 'card-plan-main-110',
  teamConfigPath: '/home/node/.claude/teams/card-plan-main-110/config.json',
  taskListPath: '/home/node/.claude/tasks/card-plan-main-110/'
};

const commandPermissionsEmptyFixture: CommandPermissionsAttachment = {
  type: 'command_permissions',
  allowedTools: []
};

const commandPermissionsPopulatedFixture: CommandPermissionsAttachment = {
  type: 'command_permissions',
  allowedTools: ['Bash', 'Read', 'Edit']
};

const deferredToolsDeltaPopulatedFixture: DeferredToolsDeltaAttachment = {
  type: 'deferred_tools_delta',
  addedNames: ['Monitor', 'PushNotification', 'RemoteTrigger', 'SendMessage', 'TaskCreate'],
  addedLines: ['Monitor', 'PushNotification', 'RemoteTrigger', 'SendMessage', 'TaskCreate'],
  removedNames: [],
  readdedNames: [],
  pendingMcpServers: []
};

const deferredToolsDeltaEmptyFixture: DeferredToolsDeltaAttachment = {
  type: 'deferred_tools_delta',
  addedNames: [],
  addedLines: [],
  removedNames: [],
  readdedNames: [],
  pendingMcpServers: []
};

const mcpInstructionsDeltaFixture: McpInstructionsDeltaAttachment = {
  type: 'mcp_instructions_delta',
  addedNames: ['plugin:voice:voice'],
  addedBlocks: [
    '## plugin:voice:voice\nThe voice server is already running on port 3000 (another Claude Code session owns it).'
  ],
  removedNames: []
};

const taskReminderEmptyFixture: TaskReminderAttachment = {
  type: 'task_reminder',
  content: [],
  itemCount: 0
};

const taskReminderPopulatedFixture: TaskReminderAttachment = {
  type: 'task_reminder',
  content: [{ id: 'task-1', title: 'Write tests', status: 'pending' }],
  itemCount: 1
};

const nestedMemoryFixture: NestedMemoryAttachment = {
  type: 'nested_memory',
  path: '/home/node/.cards/worktrees/workspace-c52ddf65/cards/main-110/1/packages/extension/CLAUDE.md',
  content: {
    path: '/home/node/.cards/worktrees/workspace-c52ddf65/cards/main-110/1/packages/extension/CLAUDE.md',
    type: 'Project',
    content: '<tests>\nSpecify a single test file with `yarn test test/suite/example.test.ts`\n</tests>',
    contentDiffersFromDisk: false
  },
  displayPath: 'packages/extension/CLAUDE.md'
};

const skillListingFixture: SkillListingAttachment = {
  type: 'skill_listing',
  content: '- copywriting: Use when drafting copy\n- css-animations\n- design-taste-frontend',
  skillCount: 66,
  isInitial: true,
  names: ['copywriting', 'css-animations', 'design-taste-frontend']
};

const invokedSkillsFixture: InvokedSkillsAttachment = {
  type: 'invoked_skills',
  skills: [
    {
      name: 'cards:notes',
      path: 'plugin:cards:notes',
      content: 'Base directory for this skill: /home/node/.vscode-server/...'
    },
    {
      name: 'cards:markdown',
      path: 'plugin:cards:markdown',
      content: 'Base directory for this skill: /home/node/.vscode-server/...'
    }
  ]
};

const dynamicSkillFixture: DynamicSkillAttachment = {
  type: 'dynamic_skill',
  skillDir:
    '/home/node/.cards/worktrees/workspace-c52ddf65/cards/main-84/1/third_party/reference/vscode/.claude/skills',
  skillNames: ['launch'],
  displayPath: 'third_party/reference/vscode/.claude/skills'
};

const fileFixture: FileAttachment = {
  type: 'file',
  filename: '/home/node/.cards/cards-repos/main-110/plan/planner-1.md.meta.json',
  content: {
    type: 'text',
    file: {
      filePath: '/home/node/.cards/cards-repos/main-110/plan/planner-1.md.meta.json',
      content: '{"title": "Plan: Reactive service, layout module, per-action picker"}\n',
      numLines: 2,
      startLine: 1,
      totalLines: 2
    }
  },
  displayPath: '../../../../../cards-repos/main-110/plan/planner-1.md.meta.json'
};

const editedTextFileFixture: EditedTextFileAttachment = {
  type: 'edited_text_file',
  filename:
    '/home/node/.cards/worktrees/workspace-c52ddf65/cards/main-110/1/packages/extension/src/webviews/cards-detail/vscodeDetailHost.ts',
  snippet: '1\t/**\n2\t * Implements vscode detail host behavior.\n3\t */\n'
};

const queuedCommandFixture: QueuedCommandAttachment = {
  type: 'queued_command',
  prompt: '<task-notification><task-id>bn830qkoa</task-id><status>completed</status></task-notification>',
  commandMode: 'task-notification'
};

const compactFileReferenceFixture: CompactFileReferenceAttachment = {
  type: 'compact_file_reference',
  filename: '/home/node/.cards/cards-repos/main-110/plan/planner-1.md',
  displayPath: '../../../../../cards-repos/main-110/plan/planner-1.md'
};

const openedFileInIdeFixture: OpenedFileInIdeAttachment = {
  type: 'opened_file_in_ide',
  filename: '/workspace/public/packages/sdk/src/worktree.ts'
};

const selectedLinesInIdeFixture: SelectedLinesInIdeAttachment = {
  type: 'selected_lines_in_ide',
  ideName: 'Visual Studio Code',
  lineStart: 0,
  lineEnd: 91,
  filename: '/workspace/marketing/cards/formula-notes/introduction.md',
  content: '---\ntitle: How agents actually produce useful work\n---\n',
  displayPath: '../../../../../../../../workspace/marketing/cards/formula-notes/introduction.md'
};

const dateChangeFixture: DateChangeAttachment = {
  type: 'date_change',
  newDate: '2026-06-03'
};

const unknownTypeFixture: AttachmentPayload = {
  type: 'future_attachment_type_v99',
  someField: 'some value'
};

// ============================================================================
// Hook type tests — scope: 'tool', toolUseID populated
// ============================================================================

describe('classifyAttachment — hook types (scope: tool)', () => {
  it('hook_success: scope=tool, tier=content, glyph=✓, glyphSeverity=neutral, summary includes hookName and hookEvent, toolUseID propagated, expandable=true', () => {
    const d = classifyAttachment(hookSuccessFixture);
    expect(d.kind).toBe('hook_success');
    expect(d.scope).toBe('tool');
    expect(d.tier).toBe('content');
    expect(d.glyph).toBe('✓');
    expect(d.glyphSeverity).toBe('neutral');
    expect(d.summary).toContain('SessionStart:startup');
    expect(d.summary).toContain('SessionStart');
    expect(d.toolUseID).toBe('4c9e488d-447c-413b-804a-ea1f0a650d8f');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(true);
  });

  it('hook_additional_context: scope=tool, tier=content, glyph=context tag, summary includes hookName, toolUseID propagated, expandable=true', () => {
    const d = classifyAttachment(hookAdditionalContextFixture);
    expect(d.kind).toBe('hook_additional_context');
    expect(d.scope).toBe('tool');
    expect(d.tier).toBe('content');
    expect(d.glyph).toBe('context');
    expect(d.glyphSeverity).toBe('neutral');
    expect(d.summary).toContain('context');
    expect(d.summary).toContain('SessionStart');
    expect(d.toolUseID).toBe('SessionStart');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(true);
  });

  it('hook_system_message: scope=tool, tier=content, glyph=message tag, summary includes hookName, toolUseID propagated, expandable=true', () => {
    const d = classifyAttachment(hookSystemMessageFixture);
    expect(d.kind).toBe('hook_system_message');
    expect(d.scope).toBe('tool');
    expect(d.tier).toBe('content');
    expect(d.glyph).toBe('message');
    expect(d.glyphSeverity).toBe('neutral');
    expect(d.summary).toContain('message');
    expect(d.summary).toContain('SessionStart:startup');
    expect(d.toolUseID).toBe('4c9e488d-447c-413b-804a-ea1f0a650d8f');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(true);
  });

  it('hook_non_blocking_error: scope=tool, tier=content, glyph=!, glyphSeverity=warning, summary includes (non-blocking), toolUseID propagated, expandable=true', () => {
    const d = classifyAttachment(hookNonBlockingErrorFixture);
    expect(d.kind).toBe('hook_non_blocking_error');
    expect(d.scope).toBe('tool');
    expect(d.tier).toBe('content');
    expect(d.glyph).toBe('!');
    expect(d.glyphSeverity).toBe('warning');
    expect(d.summary).toContain('Stop');
    expect(d.summary).toContain('non-blocking');
    expect(d.toolUseID).toBe('1faad081-dafa-4ce9-a8e6-02eeec201742');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(true);
  });

  it('hook_blocking_error: scope=tool, tier=content, glyph=✗, glyphSeverity=error, summary includes "blocked", toolUseID propagated, expandable=true', () => {
    const d = classifyAttachment(hookBlockingErrorFixture);
    expect(d.kind).toBe('hook_blocking_error');
    expect(d.scope).toBe('tool');
    expect(d.tier).toBe('content');
    expect(d.glyph).toBe('✗');
    expect(d.glyphSeverity).toBe('error');
    expect(d.summary).toContain('Stop');
    expect(d.summary).toContain('blocked');
    expect(d.toolUseID).toBe('a29516e6-9f9c-44db-a5ca-3f439344292b');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(true);
  });

  it('hook_cancelled: scope=tool, tier=content, glyph=○, glyphSeverity=neutral, summary includes hookName, toolUseID propagated, expandable=false (leaf)', () => {
    const d = classifyAttachment(hookCancelledFixture);
    expect(d.kind).toBe('hook_cancelled');
    expect(d.scope).toBe('tool');
    expect(d.tier).toBe('content');
    expect(d.glyph).toBe('○');
    expect(d.glyphSeverity).toBe('neutral');
    expect(d.summary).toContain('PostToolUse:Bash');
    expect(d.summary).toContain('cancelled');
    expect(d.toolUseID).toBe('call_00_jqazKnJHYHJ8DVFu9qeU8012');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(false);
  });
});

// ============================================================================
// Ambient turn-scoped types
// ============================================================================

describe('classifyAttachment — ambient turn-scoped types', () => {
  it('team_context: scope=turn, tier=ambient, no glyph, summary includes teamName and agentName, hidden=false, expandable=false', () => {
    const d = classifyAttachment(teamContextFixture);
    expect(d.kind).toBe('team_context');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('ambient');
    expect(d.glyphSeverity).toBe('neutral');
    expect(d.summary).toContain('card-plan-main-110');
    expect(d.summary).toContain('planner-1');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(false);
  });

  it('command_permissions: hidden when allowedTools is empty', () => {
    const d = classifyAttachment(commandPermissionsEmptyFixture);
    expect(d.kind).toBe('command_permissions');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('ambient');
    expect(d.hidden).toBe(true);
  });

  it('command_permissions: rendered (hidden=false) when allowedTools is populated', () => {
    const d = classifyAttachment(commandPermissionsPopulatedFixture);
    expect(d.kind).toBe('command_permissions');
    expect(d.hidden).toBe(false);
    expect(d.summary).toContain('3');
  });

  it('deferred_tools_delta: hidden when added/readded/removed all empty', () => {
    const d = classifyAttachment(deferredToolsDeltaEmptyFixture);
    expect(d.kind).toBe('deferred_tools_delta');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('ambient');
    expect(d.hidden).toBe(true);
  });

  it('deferred_tools_delta: rendered (hidden=false) when addedNames is populated', () => {
    const d = classifyAttachment(deferredToolsDeltaPopulatedFixture);
    expect(d.kind).toBe('deferred_tools_delta');
    expect(d.hidden).toBe(false);
    expect(d.summary).toContain('5');
  });

  it('mcp_instructions_delta: scope=turn, tier=ambient, hidden=false, summary includes addedNames, expandable=true', () => {
    const d = classifyAttachment(mcpInstructionsDeltaFixture);
    expect(d.kind).toBe('mcp_instructions_delta');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('ambient');
    expect(d.hidden).toBe(false);
    expect(d.summary).toContain('plugin:voice:voice');
    expect(d.expandable).toBe(true);
  });

  it('task_reminder: hidden when itemCount is 0', () => {
    const d = classifyAttachment(taskReminderEmptyFixture);
    expect(d.kind).toBe('task_reminder');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('ambient');
    expect(d.hidden).toBe(true);
  });

  it('task_reminder: rendered (hidden=false) when itemCount > 0', () => {
    const d = classifyAttachment(taskReminderPopulatedFixture);
    expect(d.kind).toBe('task_reminder');
    expect(d.hidden).toBe(false);
    expect(d.summary).toContain('1');
  });

  it('compact_file_reference: scope=turn, tier=ambient, glyph=·, glyphSeverity=neutral, summary=displayPath, linkPath=displayPath, expandable=false', () => {
    const d = classifyAttachment(compactFileReferenceFixture);
    expect(d.kind).toBe('compact_file_reference');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('ambient');
    expect(d.glyph).toBe('·');
    expect(d.glyphSeverity).toBe('neutral');
    expect(d.linkPath).toBe('../../../../../cards-repos/main-110/plan/planner-1.md');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(false);
  });

  it('opened_file_in_ide: always hidden', () => {
    const d = classifyAttachment(openedFileInIdeFixture);
    expect(d.kind).toBe('opened_file_in_ide');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('ambient');
    expect(d.hidden).toBe(true);
  });

  it('selected_lines_in_ide: scope=turn, tier=ambient, glyph=·, summary includes basename and line range, linkPath=displayPath, expandable=true (opens to content)', () => {
    const d = classifyAttachment(selectedLinesInIdeFixture);
    expect(d.kind).toBe('selected_lines_in_ide');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('ambient');
    expect(d.glyph).toBe('·');
    expect(d.glyphSeverity).toBe('neutral');
    expect(d.summary).toContain('introduction.md');
    expect(d.summary).toContain('0');
    expect(d.summary).toContain('91');
    expect(d.linkPath).toBeDefined();
    expect(d.hidden).toBe(false);
    // The payload carries the selected source text in `content`, so the row
    // expands to it (FileRow renders that body) rather than being a bodyless leaf.
    expect(d.expandable).toBe(true);
  });
});

// ============================================================================
// Content turn-scoped types
// ============================================================================

describe('classifyAttachment — content turn-scoped types', () => {
  it('nested_memory: scope=turn, tier=content, summary=Memory · basename(displayPath), linkPath=displayPath, expandable=true', () => {
    const d = classifyAttachment(nestedMemoryFixture);
    expect(d.kind).toBe('nested_memory');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('content');
    expect(d.summary).toBe('Memory · CLAUDE.md');
    expect(d.linkPath).toBe('packages/extension/CLAUDE.md');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(true);
  });

  it('skill_listing: scope=turn, tier=content, summary includes skillCount, hidden=false, expandable=true', () => {
    const d = classifyAttachment(skillListingFixture);
    expect(d.kind).toBe('skill_listing');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('content');
    expect(d.summary).toContain('66');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(true);
  });

  it('invoked_skills: scope=turn, tier=content, summary includes skills.length, hidden=false, expandable=true', () => {
    const d = classifyAttachment(invokedSkillsFixture);
    expect(d.kind).toBe('invoked_skills');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('content');
    expect(d.summary).toContain('2');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(true);
  });

  it('dynamic_skill: scope=turn, tier=content, summary includes displayPath, hidden=false, expandable=false', () => {
    const d = classifyAttachment(dynamicSkillFixture);
    expect(d.kind).toBe('dynamic_skill');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('content');
    expect(d.summary).toContain('third_party/reference/vscode/.claude/skills');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(false);
  });

  it('file: scope=turn, tier=content, summary=basename(displayPath), linkPath=displayPath, hidden=false, expandable=true', () => {
    const d = classifyAttachment(fileFixture);
    expect(d.kind).toBe('file');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('content');
    expect(d.summary).toContain('planner-1.md.meta.json');
    expect(d.linkPath).toBe('../../../../../cards-repos/main-110/plan/planner-1.md.meta.json');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(true);
  });

  it('edited_text_file: scope=turn, tier=content, summary includes basename(filename) and "edited", hidden=false, expandable=true', () => {
    const d = classifyAttachment(editedTextFileFixture);
    expect(d.kind).toBe('edited_text_file');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('content');
    expect(d.summary).toContain('vscodeDetailHost.ts');
    expect(d.summary).toContain('edited');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(true);
  });

  it('queued_command: scope=turn, tier=content (UserTurn vocab), glyph=⏎, summary includes truncated prompt, hidden=false, expandable=false', () => {
    const d = classifyAttachment(queuedCommandFixture);
    expect(d.kind).toBe('queued_command');
    expect(d.scope).toBe('turn');
    expect(d.tier).toBe('content');
    expect(d.glyph).toBe('⏎');
    expect(d.glyphSeverity).toBe('neutral');
    expect(d.summary).toContain('queued:');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(false);
  });
});

// ============================================================================
// Session-scoped type
// ============================================================================

describe('classifyAttachment — session-scoped types', () => {
  it('date_change: scope=session, tier=ambient, summary=newDate, hidden=false, expandable=false', () => {
    const d = classifyAttachment(dateChangeFixture);
    expect(d.kind).toBe('date_change');
    expect(d.scope).toBe('session');
    expect(d.tier).toBe('ambient');
    expect(d.summary).toBe('2026-06-03');
    expect(d.hidden).toBe(false);
    expect(d.expandable).toBe(false);
  });
});

// ============================================================================
// Unknown / future type sentinel
// ============================================================================

describe('classifyAttachment — unknown type sentinel', () => {
  it('unknown attachment.type returns kind: __unknown__ sentinel', () => {
    const d = classifyAttachment(unknownTypeFixture);
    expect(d.kind).toBe('__unknown__');
    expect(d.hidden).toBe(false);
  });
});
