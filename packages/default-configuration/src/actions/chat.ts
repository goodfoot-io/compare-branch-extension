/**
 * Chat action for Cards workflows.
 *
 * Branches on `input.codingAgent` via {@link resolveCodingAgent}:
 * - Claude: spawns the `claude` CLI with the `runtime:chat-routing` skill for
 *   the current card.
 * - Codex: spawns the `codex` CLI with no seeded prompt or system prompt.
 *
 * The process always runs interactively — stdio is inherited so the user gets
 * direct terminal control. Background mode is not supported because chat
 * requires active user participation.
 *
 * The action awaits process exit before resolving, so the terminal closes
 * only after the underlying CLI finishes and cleanup is complete.
 *
 * @summary Chat action for Cards workflows
 * @module
 * @see {@link defineAction} for factory behavior and metadata attachment
 */

import { randomUUID } from 'node:crypto';
import { type ActionContext, type ActionInput, defineAction } from '@cards/sdk/config';
import chatRoutingSkill from '../../../../claude/runtime/skills/chat-routing/SKILL.md';
import { spawnClaudeSession } from '../lib/claude-session.js';
import { spawnCodexSession } from '../lib/codex-session.js';
import { resolveCodingAgent } from '../lib/coding-agent.js';

/**
 * Strips YAML frontmatter (`---` delimited block at the start) from a markdown string.
 * @param md - Markdown string potentially containing frontmatter.
 * @returns The markdown content without frontmatter.
 */
function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n*/, '');
}

const CHAT_ROUTING_SKILL: string = stripFrontmatter(chatRoutingSkill).trim();

/**
 * Chat action handler.
 *
 * Spawns either the `claude` or `codex` CLI as a child process, selected by
 * `input.codingAgent`. The process lifecycle is tied to the action:
 * cancellation sends SIGTERM. Session resume is not supported — each chat
 * always starts fresh.
 */
export default defineAction(
  {
    actionName: 'Chat',
    description: 'Start a chat session for the card',
    supportsBackgroundMode: false,
    timeout: 3600000
  },
  async (input: ActionInput, context: ActionContext) => {
    const agent = resolveCodingAgent(input);

    if (agent === 'codex-cli') {
      await spawnCodexSession(input, context, {});
      return;
    }

    await spawnClaudeSession(input, context, {
      sessionId: randomUUID(),
      resume: false,
      supportsSwitchToInteractive: false,
      appendSystemPrompt: CHAT_ROUTING_SKILL
    });
  }
);
