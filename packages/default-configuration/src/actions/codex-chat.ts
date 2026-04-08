/**
 * Codex chat action for Cards workflows.
 *
 * Spawns the `codex` CLI for the current card with the same guidance payload
 * used by the Claude chat action, while remaining interactive-only.
 *
 * @summary Codex chat action for Cards workflows
 * @module
 */

import { type ActionContext, type ActionInput, defineAction } from '@cards/sdk/config';
import markdownGuidelines from '../../../../codex/cards/skills/markdown/SKILL.md';
import workspaceCommitStyle from '../../../../codex/runtime/skills/workspace-commit-style/SKILL.md';
import commitMessageStyle from '../../../../plugins/runtime/claude/COMMIT_MESSAGE_STYLE.md';
import { spawnCodexSession } from '../lib/codex-session.js';

function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n*/, '');
}

const COMMIT_MESSAGE_STYLE = commitMessageStyle.trim();
const WORKSPACE_COMMIT_STYLE = stripFrontmatter(workspaceCommitStyle).trim();
const MARKDOWN_GUIDELINES = stripFrontmatter(markdownGuidelines).trim();

/**
 * Codex chat action handler.
 *
 * Starts an interactive Codex session rooted at the card worktree with the
 * packaged cards/runtime plugins enabled and an initial guidance prompt.
 */
export default defineAction(
  {
    actionName: 'Codex Chat',
    description: 'Start a Codex chat session for the card',
    supportsBackgroundMode: false,
    timeout: 3600000
  },
  async (input: ActionInput, context: ActionContext) => {
    await spawnCodexSession(input, context, {
      prompt: [
        'Start an interactive card session.',
        COMMIT_MESSAGE_STYLE,
        WORKSPACE_COMMIT_STYLE,
        MARKDOWN_GUIDELINES
      ].join('\n\n')
    });
  }
);
