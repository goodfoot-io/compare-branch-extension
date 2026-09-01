/**
 * Injectable dependency seam shared by the Antigravity runtime handlers.
 *
 * Following the OpenCode `internal/deps` pattern: every edge that would
 * otherwise need a module mock — action-env extraction, session-identity
 * resolution, agent-PID lookup, manifest building, watcher spawning, session
 * registration, session marker files, git counting, shutdown handshake,
 * process-tree drain — is an overridable member of
 * {@link AntigravityHandlerDeps}. The defaults wire the real SDK
 * implementations; tests construct handlers against real temporary
 * filesystems and plain objects.
 *
 * The adapter wraps the same shared internals the Claude/Codex one-shot hooks
 * and the OpenCode in-process plugins use; nothing here reimplements a shared
 * behavior.
 *
 * @summary Dependency seam and defaults for Antigravity runtime handlers
 * @module internal/deps
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveGlobalCardsConfigDir } from '@cards.management/sdk';
import { runReconciliationSweep } from '@cards.management/sdk/bin/adhoc-refs';
import { spawnStreamSyncWatcher } from '@cards.management/sdk/bin/spawn-stream-sync-watcher';
import {
  type ActionInput,
  clearPendingShutdownRequest,
  extractActionInput,
  type PendingShutdownRequest,
  readPendingShutdownRequest,
  type ShutdownReadyMessage,
  sendShutdownReady
} from '@cards.management/sdk/config';
import { findAgentPid, isAgentProcessTreeDrained } from '@cards.management/sdk/process-tree';
import type { SessionSyncManifest } from '@cards.management/sdk/transcript-sync';
import { addUnboundCandidate } from '@cards.management/sdk/unbound-worktree-candidates';
import {
  getActiveSubagentCount,
  hasSessionExitWhenDoneNudgeFired,
  hasSessionRouteNudgeFired,
  markSessionExitWhenDoneNudgeFired,
  markSessionRouteNudgeFired,
  removeSessionCsv,
  removeSessionExitWhenDoneNudge,
  removeSessionHeadSha,
  removeSessionRouteNudge
} from '@cards.management/sessions/card-repo';
import { canonicalConversationDbPath, resolveCardsSessionId } from './inputs.js';
import type { AntigravityIo } from './io.js';
import { defaultAntigravityIo } from './io.js';

/** Shape of CARD.meta.json fields the route decision consults. */
export interface AntigravityCardMeta {
  /** Tags set on the card; a `blocked` tag suppresses the merge route. */
  tags?: string[];
  /** Merge gating state of the card. */
  gates?: {
    mergeRequestRequired?: boolean;
    mergeApproved?: boolean;
  };
}

/** Session marker operations persisted under `~/.cards/card-repo-commits/`. */
export interface AntigravitySessionMarkers {
  /** `true` when the merge route nudge already fired for the session. */
  hasRouteNudgeFired(sessionId: string): boolean;
  /** Records that the merge route nudge fired. */
  markRouteNudgeFired(sessionId: string): void;
  /** `true` when the exit-when-done nudge already fired for the session. */
  hasExitWhenDoneFired(sessionId: string): boolean;
  /** Records that the exit-when-done nudge fired. */
  markExitWhenDoneFired(sessionId: string): void;
  /** Number of subagents currently tracked as active for the session. */
  getActiveSubagentCount(sessionId: string): number;
}

/** The transcript-sync `streamType` the Antigravity adapter owns. */
export const ANTIGRAVITY_STREAM_TYPE = 'antigravity-conversation';

/** Input for building the session's transcript-sync manifest. */
export interface AntigravityManifestInput {
  /** Cards session id for stream file naming. */
  sessionId: string;
  /** Card identifier for sidecar metadata. */
  cardId: string;
  /** Absolute path of the transcript the launcher materializes. */
  transcriptPath: string;
  /** PID of the agent process to monitor. */
  monitorPid: number;
  /** Absolute path of the card repository. */
  cardRepoPath: string;
}

/**
 * Everything an Antigravity runtime handler needs from the world outside its
 * arguments.
 *
 * @summary Overridable edges for Antigravity runtime handlers
 */
export interface AntigravityHandlerDeps {
  /** Filesystem seam backing the marker store and cleanup steps. */
  io: AntigravityIo;
  /** Cards global configuration directory (honors `$CARDS_HOME`). */
  cardsConfigDir(): string;
  /**
   * Parses the Cards action environment, or returns `null` when the session
   * was not spawned by a Cards action.
   */
  loadActionInput(): ActionInput | null;
  /** Resolves the Cards session identity from the launcher's pre-spawn env. */
  resolveSessionId(): string | null;
  /** PID of the `agy` agent process, or `null` when it cannot be identified. */
  findMonitorPid(): Promise<number | null>;
  /** Builds the transcript-sync manifest (CONTRACT-B adapter). */
  buildManifest(input: AntigravityManifestInput): SessionSyncManifest;
  /** Spawns the detached stream-sync-watcher for a manifest. */
  spawnWatcher(options: { manifest: SessionSyncManifest; extensionPath?: string }): boolean;
  /**
   * Registers the session → worktree/transcript mapping in the on-disk store
   * `resolveTranscriptPath()` reads, so in-session `cards` CLI processes can
   * recover the transcript. The transcript path MUST be the canonical
   * conversation DB path ({@link AntigravityHandlerDeps.conversationDbPath}).
   */
  registerSession(sessionId: string, worktreeDir: string, transcriptPath: string): Promise<void>;
  /**
   * Resolves the canonical Antigravity conversation DB path for a
   * conversation id —
   * `<home>/.gemini/antigravity-cli/conversations/<conversationId>.db` —
   * even when the DB file does not exist yet.
   */
  conversationDbPath(conversationId: string): string;
  /** Session marker store (route/exit-when-done nudges, subagent tracking). */
  sessionMarkers: AntigravitySessionMarkers;
  /** Counts commits on `workspaceBranch` missing from `baseBranch`. */
  unmergedCommitCount(workspacePath: string, baseBranch: string, workspaceBranch: string): number;
  /** Reads and parses CARD.meta.json for the route decision. */
  readCardMeta(cardRepoPath: string): AntigravityCardMeta;
  /** Loads the session's pending shutdown request, when one exists. */
  readPendingShutdownRequest(sessionId: string): PendingShutdownRequest | undefined;
  /** Sends the shutdown-ready acknowledgement over the action socket. */
  sendShutdownReady(socketPath: string, message: ShutdownReadyMessage): Promise<void>;
  /** Clears the session's pending shutdown request after acknowledgement. */
  clearPendingShutdownRequest(sessionId: string, requestId: string): void;
  /** Runs the bounded dead-ad-hoc-monitor reconciliation sweep (best-effort). */
  runReconciliationSweep(logger: { warn(message: string, data?: Record<string, unknown>): void }): Promise<void>;
  /** Proves the agent's process tree holds no work outside the hook branch. */
  isAgentProcessTreeDrained(agentPid: number): Promise<boolean | null>;
  /** Absolute path of the installed merge runbook (`card` skill references). */
  mergeRunbookPath(): string;
  /** Absolute path of the installed shutdown runbook (`card` skill references). */
  shutdownRunbookPath(): string;
  /**
   * Removes the session's per-session artifacts (commit CSV, HEAD SHA,
   * route-nudge and exit-when-done markers). Idempotent; throws an
   * aggregate error when any removal fails for a non-ENOENT reason.
   */
  cleanupSessionArtifacts(sessionId: string): void;
}

/**
 * Resolves a runbook shipped beside the emitted handler bundle, from any
 * module URL.
 *
 * The Antigravity build compiles handlers to `<pluginRoot>/bin/<name>.mjs`
 * with the `runtime` plugin's skills shipped as a sibling of `bin/` at
 * `<pluginRoot>/skills/…`. Resolving from the bundle's `import.meta.url`
 * needs exactly one `..`; repo-root-relative strings only work when the
 * agent's cwd happens to be this monorepo, which is never true for installed
 * payloads (the host resolves hook commands with the `hooks.json` directory
 * as the working directory).
 *
 * @param fromUrl - `file://` URL (typically `import.meta.url`) of a module
 *   inside the installed `<pluginRoot>/bin/` directory.
 * @param relative - Skill-relative fragment below `<pluginRoot>/skills/card/references`.
 * @returns Absolute path of the referenced runbook.
 */
export function resolveRunbookFrom(fromUrl: string, relative: string): string {
  return fileURLToPath(new URL(`../skills/card/references/${relative}`, fromUrl));
}

/**
 * Builds the real dependency wiring.
 *
 * @returns Dependencies backed entirely by SDK implementations.
 */
export function defaultAntigravityHandlerDeps(): AntigravityHandlerDeps {
  return {
    io: defaultAntigravityIo,
    cardsConfigDir: () => resolveGlobalCardsConfigDir(),
    loadActionInput: () => {
      try {
        return extractActionInput();
      } catch {
        return null;
      }
    },
    resolveSessionId: () => resolveCardsSessionId(),
    findMonitorPid: () => findAgentPid(),
    buildManifest: (input) => buildAntigravityManifest(input),
    spawnWatcher: ({ manifest, extensionPath }) =>
      spawnStreamSyncWatcher({
        manifest,
        ...(extensionPath === undefined ? {} : { extensionPath }),
        logger: {
          error: (message, data) => stderrLine(`${message} ${stringify(data)}`),
          warn: (message, data) => stderrLine(`${message} ${stringify(data)}`)
        }
      }),
    registerSession: async (sessionId, worktreeDir, transcriptPath) => {
      await addUnboundCandidate(sessionId, worktreeDir, transcriptPath);
    },
    conversationDbPath: (conversationId) => canonicalConversationDbPath(conversationId),
    sessionMarkers: {
      hasRouteNudgeFired: (sessionId) => hasSessionRouteNudgeFired(sessionId),
      markRouteNudgeFired: (sessionId) => markSessionRouteNudgeFired(sessionId),
      hasExitWhenDoneFired: (sessionId) => hasSessionExitWhenDoneNudgeFired(sessionId),
      markExitWhenDoneFired: (sessionId) => markSessionExitWhenDoneNudgeFired(sessionId),
      getActiveSubagentCount: (sessionId) => getActiveSubagentCount(sessionId)
    },
    unmergedCommitCount: (workspacePath, baseBranch, workspaceBranch) => {
      const output = execFileSync('git', ['rev-list', '--count', `${baseBranch}..${workspaceBranch}`], {
        cwd: workspacePath,
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return Number.parseInt(output.trim(), 10);
    },
    readCardMeta: (cardRepoPath) => JSON.parse(readFileSync(join(cardRepoPath, 'CARD.meta.json'), 'utf-8')),
    readPendingShutdownRequest: (sessionId) => readPendingShutdownRequest(sessionId),
    sendShutdownReady: async (socketPath, message) => {
      await sendShutdownReady(socketPath, message);
    },
    clearPendingShutdownRequest: (sessionId, requestId) => {
      clearPendingShutdownRequest(sessionId, requestId);
    },
    runReconciliationSweep: async (logger) => {
      await runReconciliationSweep(logger);
    },
    isAgentProcessTreeDrained: async (agentPid) => isAgentProcessTreeDrained(agentPid),
    mergeRunbookPath: () => resolveRunbook('merge.md'),
    shutdownRunbookPath: () => resolveRunbook('shutdown.md'),
    cleanupSessionArtifacts: (sessionId) => cleanupSessionArtifacts(sessionId)
  };
}

/**
 * Removes the session's per-session artifacts, each step independent and
 * ENOENT-tolerant (mirrors the Claude SessionEnd cleanup).
 *
 * @param sessionId - Session whose artifacts should be removed.
 * @throws {AggregateError} When one or more removals fail for a non-ENOENT
 *   reason; every step is attempted regardless.
 */
function cleanupSessionArtifacts(sessionId: string): void {
  const errors: Error[] = [];
  const steps: Array<{ label: string; remove: () => void }> = [
    { label: 'commit CSV', remove: () => removeSessionCsv(sessionId) },
    { label: 'HEAD SHA', remove: () => removeSessionHeadSha(sessionId) },
    { label: 'route-nudge marker', remove: () => removeSessionRouteNudge(sessionId) },
    { label: 'exit-when-done marker', remove: () => removeSessionExitWhenDoneNudge(sessionId) }
  ];
  for (const step of steps) {
    try {
      step.remove();
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, `Session cleanup had ${errors.length} failure(s)`);
  }
}

/**
 * Resolves this bundle's installed runbook paths.
 *
 * @param relative - Skill-relative fragment below `<pluginRoot>/skills/card/references`.
 * @returns Absolute path of the referenced runbook.
 */
function resolveRunbook(relative: string): string {
  return resolveRunbookFrom(import.meta.url, relative);
}

/**
 * Writes one line to stderr without ever throwing.
 *
 * @param line - Preformatted diagnostic line.
 */
function stderrLine(line: string): void {
  try {
    process.stderr.write(`[antigravity-cards-hooks] ${line}\n`);
  } catch {
    // A dead stderr must not kill the hook before its marker is written.
  }
}

/**
 * Renders optional structured detail for stderr lines.
 *
 * @param data - Structured detail, when present.
 * @returns JSON text, or the empty string when absent/unrenderable.
 */
function stringify(data?: Record<string, unknown>): string {
  if (data === undefined) {
    return '';
  }
  try {
    return JSON.stringify(data);
  } catch {
    return '';
  }
}

/**
 * Builds the transcript-sync manifest for an Antigravity session.
 *
 * The launcher materializes the conversation's stream-json transcript and
 * passes its path in the hook input, so the manifest tails exactly that file
 * — mirroring the Claude/Codex native-transcript adapters. Fails closed when
 * the transcript basename cannot name a stream file.
 *
 * @param input - Session identifiers and paths supplied by the PreInvocation
 *   handler.
 * @returns A manifest describing the session's transcript source.
 * @throws {Error} When the transcript path basename is empty.
 */
function buildAntigravityManifest(input: AntigravityManifestInput): SessionSyncManifest {
  const basename = input.transcriptPath.split(/[\\/]/).pop() ?? '';
  if (basename.length === 0) {
    throw new Error(`Antigravity transcriptPath does not name a file: "${input.transcriptPath}"`);
  }
  const watchRoot = input.transcriptPath.slice(0, input.transcriptPath.length - basename.length - 1);

  return {
    version: 1,
    sessionId: input.sessionId,
    cardId: input.cardId,
    runtime: 'antigravity',
    streamType: ANTIGRAVITY_STREAM_TYPE,
    watchRoot,
    sources: [{ pattern: basename, role: 'main', mode: 'jsonl-tail' }],
    monitorPid: input.monitorPid,
    cardRepoPath: input.cardRepoPath
  };
}
