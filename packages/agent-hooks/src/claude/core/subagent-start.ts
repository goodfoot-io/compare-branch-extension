/**
 * SubagentStart hook for ad-hoc attribution of worktree-isolated subagents.
 *
 * A subagent dispatched through the `Agent` tool with `isolation: "worktree"`
 * never calls `EnterWorktree` — the harness provisions the worktree up front and
 * launches the subagent with its `cwd` already pointed at it. Such a subagent
 * therefore slips past the {@link ../enter-worktree EnterWorktree} nudge. This
 * hook closes that gap by applying enter-worktree's **UNBOUND** path on the
 * `SubagentStart` event:
 *
 * - If `input.cwd` is a *bindable linked worktree* (a linked git worktree,
 *   `--git-dir` ≠ `--git-common-dir`, with no `.cards/CARD_ID`) → add the
 *   worktree to the per-session unbound-candidate set (carrying this session's
 *   `transcript_path`) then emit a one-time nudge instructing the agent to bind
 *   an existing card or create a new one. The candidate write is idempotent on
 *   re-entry.
 *
 * - Otherwise (main repository, non-git cwd, or an already-bound worktree where
 *   `.cards/CARD_ID` is present) → no-op.
 *
 * This deliberately does **not** handle the BOUND (`CARD_ID`) re-attach path —
 * that remains {@link ../enter-worktree EnterWorktree}'s responsibility. The
 * bindable-worktree detection is shared with that hook via
 * {@link resolveBindableWorktreeDir} so the two cannot drift.
 *
 * @summary SubagentStart hook nudging worktree-isolated subagents to bind/create a card
 * @see https://code.claude.com/docs/en/hooks#subagentstart
 * @module subagent-start
 */

import { addUnboundCandidate } from '@cards.management/sdk/unbound-worktree-candidates';
import { subagentStartHook, subagentStartOutput } from '@goodfoot/agent-hooks/claude-code';
import { resolveBindableWorktreeDir } from '../../shared/bindable-worktree.js';
import { applyDefaultLogFile } from '../../shared/default-log-file.js';

export default subagentStartHook({}, async (input) => {
  // Point hook file logging at <mainRepoRoot>/.cards/logs/claude-code-cards-api-hooks.log,
  // computed from the payload cwd. No-op under an explicit CLAUDE_CODE_HOOKS_LOG_FILE.
  applyDefaultLogFile(input.cwd);

  // Is the subagent's cwd a bindable linked worktree (linked, no CARD_ID)? This
  // catches worktree-isolated subagents the EnterWorktree nudge never sees. The
  // main repository and already-bound worktrees are never bind targets.
  const worktreeDir = await resolveBindableWorktreeDir(input.cwd);
  if (!worktreeDir) return null;

  // Feed the per-session unbound-candidate set so `cards create` (run from inside
  // or outside this worktree) can discover and bind it. Idempotent on re-enter:
  // the hash-keyed entry is simply overwritten with the same data.
  await addUnboundCandidate(input.session_id, worktreeDir, input.transcript_path);

  const nudge = `If you know the id of an existing card this work belongs to, run \`cards <id> bind\` to attach it. Otherwise, load the \`cards:cards\` skill to create a new card for these changes.`;

  // Emit the one-time nudge: systemMessage surfaces to the user, additionalContext
  // is injected into the subagent's context.
  return subagentStartOutput({
    systemMessage: nudge,
    hookSpecificOutput: {
      additionalContext: nudge
    }
  });
});
