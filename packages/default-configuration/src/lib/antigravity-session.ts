/**
 * Shared session utilities for Antigravity action workflows.
 *
 * Mirrors the launch mechanics of {@link ./codex-session.js} and
 * {@link ./opencode-session.js} for the `agy` CLI: worktree resolution,
 * pre-spawn launch-grant validation, process-group ownership, cancel/shutdown
 * drain wiring, status settle, and mode-dependent post-exit branch cleanup.
 *
 * Invocation contract (notes/antigravity-host-contract.md, verified launch
 * surface): interactive launches run terminal-owned `agy -i <prompt>`;
 * background launches run child-owned `agy -p <prompt> --output-format
 * stream-json` and parse the final result record from the owned stdout. Cards
 * never passes `--dangerously-skip-permissions`.
 *
 * @summary Shared session utilities for Antigravity action workflows
 * @module
 */

import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createCardsClient } from '@cards.management/sdk/client/discovery';
import { type ActionContext, type ActionInput, CARDS_ENV_VARS } from '@cards.management/sdk/config';
import { createAntigravityTerminationController } from './antigravity-termination.js';
import { spawnBranchCleanupWatcher } from './branch-cleanup-watcher.js';
import {
  cleanupMergedBranches,
  errorMessage,
  resolveBaseBranch,
  resolveOrCreateWorktree,
  settleCardStatusForCleanup
} from './claude-session.js';
import { CARDS_AGENT_LAUNCH_GRANT_ENV_VAR, validateAgentLaunchGrant } from './launch-grant.js';
import { spawnAgentCli } from './spawn-cli.js';

/**
 * Options for {@link spawnAntigravitySession}.
 */
export interface AntigravitySessionOptions {
  /** Prompt string passed to the Antigravity CLI. */
  prompt?: string;
  /**
   * When true, overrides `EXIT_WHEN_DONE` to `'false'` in the child process
   * environment so the runtime's exit-when-done handler never nudges toward
   * `cards shutdown` for interaction-only actions.
   */
  suppressExitWhenDone?: boolean;
}

/**
 * Structured final result record parsed from the child-owned `stream-json`
 * stdout of a background launch. The field set is pinned by the live
 * authentication-probe witness (`conversation_id`/`status`/`response`); the
 * surrounding stream-json event records are unpinned and tolerated.
 */
export interface AntigravityFinalRecord {
  /** Conversation identity attributed to the child. */
  conversationId: string;
  /** Host-reported final status (success is exactly `"SUCCESS"`). */
  status: string;
  /** Final assistant response text when the record carries it. */
  response?: string;
}

/**
 * Error thrown when the child-owned stream-json stdout cannot be trusted:
 * a non-JSON, non-blank line is a stream parse error and fails the action.
 */
export class AntigravityStreamError extends Error {
  override readonly name = 'AntigravityStreamError';
}

/**
 * Named failure reasons for a completed-but-unsuccessful Antigravity launch.
 * Exit zero without the expected final record is failure, per the action
 * matrix lifecycle.
 */
export type AntigravitySessionFailureReason =
  | 'spawn-failure'
  | 'nonzero-exit'
  | 'signal-termination'
  | 'missing-final-record'
  | 'unsuccessful-final-record';

/**
 * Error thrown when a launched Antigravity session ends without a successful
 * structured outcome. The {@link AntigravitySessionFailureError.reason} field
 * names the failure mode.
 */
export class AntigravitySessionFailureError extends Error {
  override readonly name = 'AntigravitySessionFailureError';

  /**
   * Creates the named-failure error.
   *
   * @param reason - Named failure mode.
   * @param message - Human-readable failure description.
   */
  constructor(
    public readonly reason: AntigravitySessionFailureReason,
    message: string
  ) {
    super(message);
  }
}

/**
 * Builds the CLI argument list for the `agy` process.
 *
 * Interactive actions run terminal-owned `agy -i <prompt>`. Background actions
 * run the one-shot `agy -p <prompt> --output-format stream-json`, whose stdout
 * the launcher owns and parses. Never includes
 * `--dangerously-skip-permissions`.
 *
 * @param prompt - Prompt passed to Antigravity.
 * @param executionMode - Dispatch mode: `'interactive'` uses `-i`, `'background'` uses `-p` with stream-json output.
 * @returns Array of CLI arguments.
 * @throws {Error} When a background launch has no prompt (nothing to run one-shot).
 */
export function buildAntigravityArgs(
  prompt: string | undefined,
  executionMode: 'interactive' | 'background'
): string[] {
  if (executionMode === 'interactive') {
    return prompt === undefined ? ['-i'] : ['-i', prompt];
  }

  if (prompt === undefined) {
    throw new Error(
      'Cannot launch Antigravity in background mode without a prompt: `agy -p` runs exactly one prompt and exits.'
    );
  }
  return ['-p', prompt, '--output-format', 'stream-json'];
}

/**
 * Parses the final result record out of a completed background launch's
 * `stream-json` stdout.
 *
 * Every non-blank line must be JSON — anything else is a stream parse error.
 * Event records without the pinned result field set (`status` plus a
 * non-empty `conversation_id`) are tolerated and skipped; the LAST record
 * carrying the pinned field set wins.
 *
 * @param stdout - Full stdout captured from the child.
 * @returns The final result record, or `null` when the stream carried none.
 * @throws {AntigravityStreamError} When stdout contains a non-JSON, non-blank line.
 */
export function parseAntigravityFinalRecord(stdout: string): AntigravityFinalRecord | null {
  let final: AntigravityFinalRecord | null = null;
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      const excerpt = trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;
      throw new AntigravityStreamError(`agy stream-json contained a non-JSON line: "${excerpt}"`, { cause: error });
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) continue;
    const record = parsed as Record<string, unknown>;
    const status = record['status'];
    const conversationId = record['conversation_id'];
    if (typeof status !== 'string' || typeof conversationId !== 'string' || conversationId.length === 0) continue;

    final = {
      conversationId,
      status,
      ...(typeof record['response'] === 'string' ? { response: record['response'] as string } : {})
    };
  }
  return final;
}

/**
 * Spawns an `agy` CLI session with worktree lifecycle, launch-grant gating,
 * and prompt-based skill guidance.
 *
 * Stage order mirrors {@link ./codex-session.js}: launch-grant validation →
 * API client → base branch → worktree → CLI spawn with card env vars →
 * cancel/shutdown drain wiring → exit → status settle → mode-dependent
 * branch cleanup. Background launches additionally parse the child-owned
 * stream-json stdout and fail the action on nonzero exit, signal
 * termination, stream parse errors, or a missing/unsuccessful final record.
 *
 * @param input - Parsed action input from the environment.
 * @param context - Action context providing logger and lifecycle hooks.
 * @param options - Session-specific parameters.
 * @returns Resolves after the child exits and post-exit settle/cleanup ran.
 * @throws {LaunchGrantRefusalError} When `CARDS_AGENT_LAUNCH_GRANT` is absent, malformed, wrong-versioned, agent-mismatched, or expired — before any client, worktree, or session state is created.
 * @throws {AntigravitySessionFailureError} When a background launch ends without a successful structured outcome (spawn failure, nonzero exit, signal termination, missing final record, unsuccessful final record) or an interactive launch fails to spawn.
 * @throws {AntigravityStreamError} When the background stdout stream carries a non-JSON, non-blank line.
 * @throws {Error} When Cards API discovery fails or the worktree settle phase rejected.
 */
export async function spawnAntigravitySession(
  input: ActionInput,
  context: ActionContext,
  options: AntigravitySessionOptions
): Promise<void> {
  const { prompt, suppressExitWhenDone } = options;
  const isInteractive = input.executionMode === 'interactive';

  // Consume the extension's pre-spawn health/auth probe FIRST: a named grant
  // refusal must happen before any client, worktree, or session state exists.
  validateAgentLaunchGrant(process.env[CARDS_AGENT_LAUNCH_GRANT_ENV_VAR], 'antigravity-cli', Date.now());

  context.logger.info(`${input.actionName} action started`, {
    cardId: input.cardId,
    environment: input.environment,
    executionMode: input.executionMode
  });

  // Session identity is minted pre-spawn and exported into the agy child
  // environment (ANTIGRAVITY_SESSION_ID) so every in-session `cards` CLI
  // inherits it — the witnessed session-identity carrier (plan Phase 5).
  const sessionId = randomUUID();

  const client = await createCardsClient(context.logger);
  if (!client) {
    throw new Error('Cards API discovery failed — cannot start session');
  }

  const baseBranch = await resolveBaseBranch(input.repoRoot, client);
  const {
    worktreePath: cwd,
    branchName,
    parentBranch,
    settle
  } = await resolveOrCreateWorktree(input, client, baseBranch, context.logger, sessionId);

  context.logger.info('Using worktree', { cwd, branch: branchName, baseBranch, parentBranch });

  const args = buildAntigravityArgs(prompt, input.executionMode);

  const child: ChildProcess = spawnAgentCli('agy', args, {
    cwd,
    // Detached on POSIX (matching the other launchers) so `agy` roots its own
    // process group instead of sharing the extension host's: the drain below
    // signals -pid, which must stay inside a launcher-owned group or it would
    // sweep sibling actions sharing the host's group.
    detached: process.platform !== 'win32',
    // Interactive actions inherit stdio so the user gets direct terminal
    // control (terminal-owned `-i`). Background runs are console-less and own
    // the stream-json stdout for final-result parsing; stderr is piped for
    // diagnostic capture. windowsHide keeps the cross-spawn cmd.exe hop
    // invisible on win32 — libuv ignores it when any fd is inherited, so the
    // interactive path must not set it.
    stdio: isInteractive ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    ...(isInteractive ? {} : { windowsHide: true }),
    env: {
      ...process.env,
      WORKSPACE_PATH: cwd,
      BASE_BRANCH: baseBranch,
      PARENT_BRANCH: parentBranch,
      WORKSPACE_BRANCH: branchName,
      ANTIGRAVITY_SESSION_ID: sessionId,
      ...(suppressExitWhenDone ? { [CARDS_ENV_VARS.EXIT_WHEN_DONE]: 'false' } : {})
    }
  });

  // A settle rejection means createWorktree tore the worktree down (the
  // settle-failure cleanup removed it) — the agent must never run in a missing
  // or unprovisioned worktree. Fail the launch loudly: kill the spawned agent
  // and surface the settle error below instead of logging and continuing.
  let settleError: unknown;
  if (settle) {
    settle.catch((error: unknown) => {
      settleError = error;
      context.logger.error('Worktree settle failed — aborting launch', { error: errorMessage(error) });
      child.kill('SIGTERM');
    });
  }

  const termination = createAntigravityTerminationController(child, {
    gracefulTimeoutMs: 5_000,
    forceTimeoutMs: 5_000
  });

  context.onCancel(async () => {
    context.logger.info(`${input.actionName} action cancelled, terminating agy`, { sessionId });
    const result = await termination.terminate('cancel');
    context.logger.info(`${input.actionName} cancellation termination completed`, { sessionId, result });
  });

  context.onAgentShutdown(async () => {
    context.logger.info(`${input.actionName} agent signalled shutdown, terminating agy`, { sessionId });
    const result = await termination.terminate('shutdown');
    context.logger.info(`${input.actionName} shutdown termination completed`, { sessionId, result });
    return result;
  });

  // Background mode: own the stream-json stdout for final-result parsing and
  // capture stderr for diagnostic logging.
  let stdoutText = '';
  if (!isInteractive) {
    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutText += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) {
        context.logger.warn(text);
      }
    });
  }

  const outcome = await new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null; spawnError?: Error }>(
    (resolve) => {
      // Fail closed: a spawn failure (e.g. ENOENT) emits `error` but never
      // `close`, which would leave this promise hung forever. Mirrors the
      // cards-assistant launch guard.
      child.on('error', (error) => {
        context.logger.error('Failed to spawn agy', {
          error: error instanceof Error ? error.message : String(error)
        });
        resolve({
          exitCode: null,
          signal: null,
          spawnError: error instanceof Error ? error : new Error(String(error))
        });
      });
      child.on('close', (exitCode, signal) => {
        resolve({ exitCode, signal });
      });
    }
  );

  // Fail the launch loudly when the settle phase rejected: the agent was
  // killed and the worktree is gone, so the action must not report a normal
  // completion (post-exit cleanup has nothing meaningful to do either — the
  // settle-failure cleanup already removed the worktree).
  if (settleError !== undefined) {
    throw settleError instanceof Error ? settleError : new Error(String(settleError));
  }

  if (isInteractive && outcome.spawnError !== undefined) {
    throw new AntigravitySessionFailureError(
      'spawn-failure',
      `${input.actionName} action failed: the agy process could not be launched (${outcome.spawnError.message})`
    );
  }

  context.logger.info(`${input.actionName} action completed`, { sessionId, exitCode: outcome.exitCode });

  // Settle the card's status (active → needs_review) before cleanup can read
  // it: the sweep's first gate is the on-disk status, which otherwise races
  // this exit path from a separate process. See {@link settleCardStatusForCleanup}.
  await settleCardStatusForCleanup(input.cardRepoPath, context.logger);

  if (!isInteractive) {
    // Exit zero without the expected final record is failure, per the action
    // matrix lifecycle — a clean exit alone never settles a background launch.
    if (outcome.spawnError !== undefined) {
      throw new AntigravitySessionFailureError(
        'spawn-failure',
        `${input.actionName} action failed: the agy process could not be launched (${outcome.spawnError.message})`
      );
    }
    if (outcome.signal) {
      throw new AntigravitySessionFailureError(
        'signal-termination',
        `${input.actionName} action failed: agy terminated on signal ${outcome.signal}`
      );
    }
    if (outcome.exitCode !== 0) {
      throw new AntigravitySessionFailureError(
        'nonzero-exit',
        `${input.actionName} action failed: agy exited with code ${outcome.exitCode}`
      );
    }

    let final: AntigravityFinalRecord | null;
    try {
      final = parseAntigravityFinalRecord(stdoutText);
    } catch (error) {
      context.logger.error(`${input.actionName} action failed: unparseable agy stream-json output`, {
        error: errorMessage(error)
      });
      throw error;
    }

    if (final === null) {
      throw new AntigravitySessionFailureError(
        'missing-final-record',
        `${input.actionName} action failed: agy exited 0 without the expected final stream-json record ` +
          '(exit zero without the final result record is failure)'
      );
    }
    if (final.status !== 'SUCCESS') {
      throw new AntigravitySessionFailureError(
        'unsuccessful-final-record',
        `${input.actionName} action failed: agy final record status is '${final.status}' (expected 'SUCCESS')`
      );
    }

    context.logger.info(`${input.actionName} background launch settled`, {
      sessionId,
      conversationId: final.conversationId
    });

    // Post-exit cleanup: remove fully-merged branches inline — there is no
    // terminal to keep open in background mode.
    try {
      await cleanupMergedBranches(input, input.cardRepoPath, context.logger, sessionId);
    } catch (error) {
      const message = errorMessage(error);
      if (message.includes('self-referential parentBranch') || message.includes('data corruption')) {
        throw error;
      }
      context.logger.warn('Post-exit cleanup failed (non-fatal)', { error: message, sessionId });
    }
    return;
  }

  // Interactive mode: hand post-exit cleanup to the detached watcher so the
  // terminal closes immediately (the watcher calls the same
  // {@link cleanupMergedBranches} function).
  try {
    await spawnBranchCleanupWatcher(
      {
        cardId: input.cardId,
        repoRoot: input.repoRoot,
        cardRepoPath: input.cardRepoPath,
        sessionId
      },
      context.logger
    );
  } catch (error) {
    context.logger.warn('Failed to spawn branch-cleanup watcher (non-fatal)', {
      error: errorMessage(error),
      sessionId
    });
  }
}
