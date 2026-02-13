/**
 * Launch action for Claude Code workflows.
 *
 * Spawns the `claude` CLI for the current card. In interactive mode, the
 * process inherits stdio so the user gets direct terminal control. In
 * background mode, Claude runs with `--print --output-format stream-json`
 * and each stdout line is streamed to the server's `claude-code-session`
 * stream endpoint via {@link CardsClient.openStream}.
 *
 * The action awaits process exit before resolving, so the terminal closes
 * only after Claude finishes and cleanup is complete.
 *
 * @summary Launch action for Claude Code workflows
 * @module
 * @see {@link defineAction} for factory behavior and metadata attachment
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { CardsClient } from '@cards/sdk/client';
import { type ActionContext, type ActionInput, defineAction } from '@cards/sdk/config';

/**
 * Build the argument list for the `claude` CLI.
 *
 * Interactive mode inherits stdio and passes the prompt as an initial
 * argument. Background mode adds `--print` and `--output-format stream-json`
 * for non-interactive, streaming execution.
 */
/**
 * Settings JSON that enables the `claude-code-cli-v2` plugin and includes
 * the `cards.management` marketplace source so the spawned `claude` process
 * can resolve the plugin independently of the parent session's settings.
 */
const PLUGIN_SETTINGS = JSON.stringify({
  enabledPlugins: { 'runtime@cards.management': true },
  extraKnownMarketplaces: {
    'cards.management': {
      //      source: { source: 'github', repo: 'goodfoot-io/compare-branch-extension' }
      source: { source: 'directory', path: 'public' }
    }
  }
});

function buildArgs(
  prompt: string,
  sessionId: string,
  resume: boolean,
  mode: ActionInput['executionMode'],
  cardRepoPath: string
): string[] {
  const args: string[] = [];

  if (resume) {
    args.push('--resume', sessionId);
  } else {
    args.push(prompt);
    args.push('--session-id', sessionId);
  }
  args.push('--agent', 'runtime:router');
  args.push('--settings', PLUGIN_SETTINGS);
  args.push('--add-dir', cardRepoPath);
  if (mode === 'background') {
    args.push('--print', '--output-format', 'stream-json');
  }

  return args;
}

/**
 * Launch action handler.
 *
 * Spawns the `claude` CLI as a child process, providing the card ID and
 * repository path as prompt context. The process lifecycle is tied to the
 * action: cancellation sends SIGTERM, and switching to interactive mode
 * preserves the session ID for resumption.
 */
export default defineAction(
  {
    actionName: 'Launch',
    description: 'Start a Claude session for the card',
    supportsBackgroundMode: true,
    timeout: 3600000
  },
  async (input: ActionInput, context: ActionContext) => {
    const switchData = input.switchToInteractiveData as { sessionId?: string } | undefined;
    const [sessionId, resume] = [switchData?.sessionId ?? randomUUID(), !!switchData?.sessionId];

    const prompt = `Review the card repo and stop.`;

    context.logger.info('Launch action started', {
      cardId: input.cardId,
      environment: input.environment,
      executionMode: input.executionMode,
      sessionId
    });

    const args = buildArgs(prompt, sessionId, resume, input.executionMode, input.cardRepoPath);
    const isInteractive = input.executionMode === 'interactive';

    const child: ChildProcess = spawn('claude', args, {
      cwd: input.workspacePath,
      stdio: isInteractive ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CLAUDE_CODE_TASK_LIST_ID: `cards-extension-${input.cardId}`,
        CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1'
      }
    });

    context.onCancel(() => {
      context.logger.info('Launch action cancelled, terminating claude', { sessionId });
      child.kill('SIGTERM');
    });

    context.onSwitchToInteractive(() => {
      context.logger.info('Switching to interactive mode', { sessionId });
      child.kill('SIGTERM');
      return { sessionId };
    });

    if (!isInteractive) {
      const client = new CardsClient({
        baseUrl: input.apiBaseUrl,
        accessToken: input.apiAccessToken
      });

      const stream = client.openStream(input.cardId, 'claude-code-session', `${sessionId}.jsonl`, {
        title: `Claude session for ${input.cardId}`,
        sessionId
      });

      child.stdout?.on('data', (chunk: Buffer) => {
        for (const line of chunk.toString().split('\n')) {
          if (line.trim()) {
            stream.write(line);
          }
        }
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString().trim();
        if (text) {
          context.logger.warn(text);
        }
      });

      const exitCode = await new Promise<number | null>((resolve) => {
        child.on('close', resolve);
      });

      const result = await stream.close();
      context.logger.info('Launch action completed', { sessionId, exitCode, ...result });
      return;
    }

    const exitCode = await new Promise<number | null>((resolve) => {
      child.on('close', resolve);
    });

    context.logger.info('Launch action completed', { sessionId, exitCode });
  }
);
