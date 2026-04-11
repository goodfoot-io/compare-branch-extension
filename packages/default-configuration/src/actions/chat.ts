/**
 * Chat action for Claude Code workflows.
 *
 * Spawns the `claude` CLI with the `runtime:chat` skill for the current card.
 * The process always runs interactively — stdio is inherited so the user gets
 * direct terminal control. Background mode is not supported because chat
 * requires active user participation.
 *
 * The action awaits process exit before resolving, so the terminal closes
 * only after Claude finishes and cleanup is complete.
 *
 * @summary Chat action for Claude Code workflows
 * @module
 * @see {@link defineAction} for factory behavior and metadata attachment
 */

import { randomUUID } from 'node:crypto';
import { type ActionContext, type ActionInput, defineAction } from '@cards/sdk/config';
import commitMessageStyle from '../../../../plugins/runtime/claude/COMMIT_MESSAGE_STYLE.md';
import chatRoutingSkill from '../../../../plugins/runtime/skills/chat-routing/SKILL.md';
import { spawnClaudeSession } from '../lib/claude-session.js';

/**
 * Strips YAML frontmatter (`---` delimited block at the start) from a markdown string.
 * @param md - Markdown string potentially containing frontmatter.
 * @returns The markdown content without frontmatter.
 */
function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n*/, '');
}

const COMMIT_MESSAGE_STYLE: string = commitMessageStyle.trim();
const CHAT_ROUTING_SKILL: string = stripFrontmatter(chatRoutingSkill).trim();

/**
 * Chat action handler.
 *
 * Spawns the `claude` CLI as a child process using the chat skill.
 * The process lifecycle is tied to the action: cancellation sends SIGTERM.
 * Session resume is not supported — each chat always starts fresh.
 */
export default defineAction(
  {
    actionName: 'Chat',
    description: 'Start a chat session for the card',
    supportsBackgroundMode: false,
    timeout: 3600000
  },
  async (input: ActionInput, context: ActionContext) => {
    await spawnClaudeSession(input, context, {
      sessionId: randomUUID(),
      resume: false,
      supportsSwitchToInteractive: false,
      appendSystemPrompt: `${COMMIT_MESSAGE_STYLE}\n\n${CHAT_ROUTING_SKILL}`
    });
  }
);
