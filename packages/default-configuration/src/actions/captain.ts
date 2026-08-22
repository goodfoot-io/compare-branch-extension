/**
 * Captain action for Cards workflows.
 *
 * Branches on `input.codingAgent` via {@link resolveCodingAgent}:
 * - Claude: spawns the `claude` CLI with a prompt that instructs Claude to
 *   load the `runtime:captain` skill and follow its `<routing-instructions>`.
 *   In interactive mode, the process inherits stdio so the user gets direct
 *   terminal control. In background mode, Claude runs with `--print` so it
 *   executes non-interactively (takes a prompt, runs, and exits). The watcher
 *   handles all transcript streaming.
 * - Codex: spawns the `codex` CLI interactively with a short prompt that
 *   instructs Codex to load the `$runtime:captain` skill and follow its
 *   `<routing-instructions>`. The skill itself is provided by the bundled
 *   `runtime` plugin staged into the per-launch `CODEX_HOME`. Background mode
 *   is rejected explicitly.
 * - OpenCode: spawns the `opencode run` CLI interactively with a short prompt
 *   that instructs it to load the `captain` skill and follow its
 *   `<routing-instructions>`. The skill itself is provided by the bundled
 *   `runtime` plugin staged into the per-launch cache and registered through
 *   the staged `OPENCODE_CONFIG` document. Background mode is rejected
 *   explicitly.
 *
 * The action awaits process exit before resolving, so the terminal closes
 * only after the underlying CLI finishes and cleanup is complete.
 *
 * @summary Captain action for Cards workflows
 * @module
 * @see {@link defineAction} for factory behavior and metadata attachment
 */

import { randomUUID } from 'node:crypto';
import { type ActionContext, type ActionInput, defineAction } from '@cards.management/sdk/config';
import { spawnClaudeSession } from '../lib/claude-session.js';
import { spawnCodexSession } from '../lib/codex-session.js';
import { resolveCodingAgent } from '../lib/coding-agent.js';
import { spawnOpencodeSession } from '../lib/opencode-session.js';
/**
 * Captain action handler.
 *
 * Spawns the `claude`, `codex`, or `opencode` CLI as a child process, selected
 * by `input.codingAgent`. The process lifecycle is tied to the action:
 * cancellation sends SIGTERM. In the Claude branch, switching to interactive
 * mode preserves the session ID for resumption.
 *
 * Codex + background mode is rejected explicitly: background launch is a
 * Claude-only capability until `spawnCodexSession` grows a background-mode
 * implementation. The same holds for OpenCode.
 */
export default defineAction(
  {
    actionName: 'Captain',
    description: 'Delegates work to free-form subagents',
    supportsBackgroundMode: true,
    timeout: 3600000
  },
  async (input: ActionInput, context: ActionContext) => {
    const agent = resolveCodingAgent(input);

    if (agent === 'codex-cli') {
      if (input.executionMode === 'background') {
        throw new Error(
          `cards.defaultCodingAgent='codex-cli' does not support background-mode launch. ` +
            `Run the Captain action in interactive mode, or switch cards.defaultCodingAgent to 'claude-code-cli'.`
        );
      }
      await spawnCodexSession(input, context, {
        prompt: 'Load the `$runtime:captain` skill and follow the `<routing-instructions>`.'
      });
      return;
    }

    if (agent === 'opencode-cli') {
      if (input.executionMode === 'background') {
        throw new Error(
          `cards.defaultCodingAgent='opencode-cli' does not support background-mode launch. ` +
            `Run the Captain action in interactive mode, or switch cards.defaultCodingAgent to 'claude-code-cli'.`
        );
      }
      await spawnOpencodeSession(input, context, {
        prompt: 'Load the `captain` skill and follow the `<routing-instructions>`.'
      });
      return;
    }

    const switchData = input.switchToInteractiveData as { sessionId?: string } | undefined;
    const [sessionId, resume] = [switchData?.sessionId ?? randomUUID(), !!switchData?.sessionId];

    await spawnClaudeSession(input, context, {
      prompt: 'Load the `runtime:captain` skill and follow the `<routing-instructions>`.',
      sessionId,
      resume,
      supportsSwitchToInteractive: true
    });
  }
);
