/**
 * Slice action for Cards workflows.
 *
 * Spawns the `claude` CLI seeded to load the `runtime:slice` skill, which
 * routes the card straight into the slicing orchestrator — bypassing the
 * planning tiers used by `launch`. The slicing orchestrator dispatches
 * sequential general-purpose subagents to implement public API boundaries
 * (types, signatures) and behavioral expectations (skipped integration
 * tests) in bounded, validated slices.
 *
 * Codex is rejected explicitly: there is no `codex/runtime/skills/slice`
 * counterpart yet, and failing closed is preferable to silently running
 * Codex with no seeded prompt.
 *
 * @summary Slice action for Cards workflows
 * @module
 * @see {@link defineAction} for factory behavior and metadata attachment
 */

import { randomUUID } from 'node:crypto';
import { type ActionContext, type ActionInput, defineAction } from '@cards/sdk/config';
import commitMessageStyle from '../../../../claude/runtime/claude/COMMIT_MESSAGE_STYLE.md';
import { spawnClaudeSession } from '../lib/claude-session.js';
import { resolveCodingAgent } from '../lib/coding-agent.js';

const COMMIT_MESSAGE_STYLE: string = commitMessageStyle.trim();

export default defineAction(
  {
    actionName: 'Slice',
    description: 'Start a slicing session for the card',
    supportsBackgroundMode: true,
    timeout: 3600000
  },
  async (input: ActionInput, context: ActionContext) => {
    const agent = resolveCodingAgent(input);

    if (agent === 'codex-cli') {
      throw new Error(
        `cards.defaultCodingAgent='codex-cli' does not support the Slice action. ` +
          `Switch cards.defaultCodingAgent to 'claude-code-cli' to slice this card.`
      );
    }

    const switchData = input.switchToInteractiveData as { sessionId?: string } | undefined;
    const [sessionId, resume] = [switchData?.sessionId ?? randomUUID(), !!switchData?.sessionId];

    await spawnClaudeSession(input, context, {
      prompt: 'Load the `runtime:slice` skill and follow the `<routing-instructions>`.',
      sessionId,
      resume,
      supportsSwitchToInteractive: true,
      appendSystemPrompt: COMMIT_MESSAGE_STYLE
    });
  }
);
