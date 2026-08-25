/**
 * Injectable dependency seam shared by the OpenCode handler factories.
 *
 * The card-developer rules forbid module mocks: instead, every edge that would
 * otherwise need one — action-env extraction, PID lookup, manifest building,
 * watcher spawning, session marker files, git counting, runbook paths — is an
 * overridable member of {@link OpencodeHandlerDeps}. The defaults wire the real
 * SDK implementations; tests construct handlers against real temporary
 * filesystems and plain objects.
 *
 * @summary Dependency seam and defaults for OpenCode handler factories
 * @module internal/deps
 */

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnStreamSyncWatcher } from '@cards.management/sdk/bin/spawn-stream-sync-watcher';
import { type ActionInput, extractActionInput } from '@cards.management/sdk/config';
import type { SessionSyncManifest } from '@cards.management/sdk/transcript-sync';
import { buildOpencodeManifest, type OpencodeManifestInput } from '@cards.management/sdk/transcript-sync/adapters';
import {
  addActiveSubagent,
  hasSessionExitWhenDoneNudgeFired,
  hasSessionRouteNudgeFired,
  hasSessionSkillLoaded,
  markSessionExitWhenDoneNudgeFired,
  markSessionRouteNudgeFired,
  markSessionSkillLoaded,
  removeActiveSubagent
} from '@cards.management/sessions/card-repo';
import type { Plugin } from '@opencode-ai/plugin';
import { defaultOpencodeStateIo, type OpencodeStateIo } from '../opencode-state.js';

/**
 * One stored message with its parts, shaped like the session messages API
 * payload (`GET /session/{id}/message` → `Array<{info, parts[]}>`).
 *
 * @summary History entry for resume backfill
 */
export interface OpencodeSessionHistoryEntry {
  /** Message record (`info.time.created` orders the backfill). */
  info: Record<string, unknown>;
  /** Parts belonging to this message; exported riding their message. */
  parts: Array<Record<string, unknown>>;
}

/** Loads the stored history of one session, any order (callers normalize). */
export type LoadSessionHistory = (sessionId: string) => Promise<Array<OpencodeSessionHistoryEntry>>;

/**
 * Sorts history entries ascending by `info.time.created ?? 0`, with a stable
 * tiebreak on input order. The API is observed pre-sorted (spike S1); this is
 * the plan's safety net against ordering regressions.
 *
 * @param entries - Entries in any order.
 * @returns A new array in export order.
 */
export function sortSessionHistory(entries: Array<OpencodeSessionHistoryEntry>): Array<OpencodeSessionHistoryEntry> {
  const createdOf = (info: Record<string, unknown>): number => {
    const time = info['time'] as { created?: unknown } | undefined;
    return typeof time?.created === 'number' ? time.created : 0;
  };
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => createdOf(a.entry.info) - createdOf(b.entry.info) || a.index - b.index)
    .map((wrapped) => wrapped.entry);
}

/**
 * Builds the default session-history loader over the plugin's captured
 * OpenCode client (loopback into the co-located server).
 *
 * @param client - Live SDK client handed to the plugin at init.
 * @returns A loader resolving the full sorted history for one session.
 */
export function createSdkSessionHistory(client: Parameters<Plugin>[0]['client']): LoadSessionHistory {
  return async (sessionId) => {
    const result = await client.session.messages({ path: { id: sessionId } });
    if (!result.data) {
      const detail = (() => {
        try {
          return JSON.stringify(result.error);
        } catch {
          return 'unserializable error';
        }
      })();
      throw new Error(`opencode session messages failed: ${detail}`);
    }
    return sortSessionHistory(result.data as unknown as Array<OpencodeSessionHistoryEntry>);
  };
}

/** Session marker operations persisted under `~/.cards/card-repo-commits/`. */
export interface OpencodeMarkerDeps {
  hasSkillLoaded(sessionId: string, skillName: string): boolean;
  /** Records the skill-load marker. */
  markSkillLoaded(sessionId: string, skillName: string): void;
  /** `true` when the merge route nudge already fired for the session. */
  hasRouteNudgeFired(sessionId: string): boolean;
  /** Records that the merge route nudge fired. */
  markRouteNudgeFired(sessionId: string): void;
  /** `true` when the exit-when-done nudge already fired for the session. */
  hasExitWhenDoneFired(sessionId: string): boolean;
  /** Records that the exit-when-done nudge fired. */
  markExitWhenDoneFired(sessionId: string): void;
  /** Adds a child session to the parent's active-subagent tracking. */
  addActiveSubagent(parentSessionId: string, childSessionId: string): Promise<void>;
  /** Removes a child session from the parent's active-subagent tracking. */
  removeActiveSubagent(parentSessionId: string, childSessionId: string): Promise<void>;
}

/**
 * Everything a handler factory needs from the world outside its arguments.
 *
 * @summary Overridable edges for OpenCode handler factories
 */
export interface OpencodeHandlerDeps {
  /** Filesystem/git/home seam backing exporter and anchor behavior. */
  io: OpencodeStateIo;
  /**
   * Parses the Cards action environment, or returns `null` when the session
   * was not spawned by a Cards action (including user-scope installs firing
   * in ordinary terminal sessions).
   */
  loadActionInput(): ActionInput | null;
  /**
   * PID of the agent process the stream watcher monitors — the OpenCode
   * server process itself, since plugins run in-process.
   */
  findMonitorPid(): number | null;
  /** Builds the transcript-sync manifest (CONTRACT-B adapter). */
  buildManifest(input: OpencodeManifestInput): SessionSyncManifest;
  /** Spawns the detached stream-sync-watcher for a manifest. */
  spawnWatcher(options: { manifest: SessionSyncManifest; extensionPath?: string }): boolean;
  /** Session marker store. */
  markers: OpencodeMarkerDeps;
  /** Counts commits on `workspaceBranch` missing from `baseBranch`. */
  unmergedCommitCount(workspacePath: string, baseBranch: string, workspaceBranch: string): number;
  /** Absolute path of the installed merge runbook (`runtime:card` references). */
  mergeRunbookPath(): string;
  /** Absolute path of the installed shutdown runbook (`runtime:card` references). */
  shutdownRunbookPath(): string;
  /** Directory root for materialized transcripts. */
  transcriptsRoot(): string;
  /**
   * Loads the stored history of one session for resume backfill.
   *
   * Optional: when absent, the session-start plugin builds the SDK-backed
   * default ({@link createSdkSessionHistory}) over its captured OpenCode
   * client — full `{info, parts[]}` history sorted ascending by
   * `info.time.created ?? 0` with a stable input-order tiebreak.
   */
  loadSessionHistory?(sessionId: string): Promise<Array<OpencodeSessionHistoryEntry>>;
}

/**
 * Resolves a runbook shipped beside the emitted plugin bundle, from any
 * module URL.
 *
 * Every build target compiles handlers to `<outBase>/plugin/<name>.mjs` with
 * skills shipped as a **sibling of `plugin/`** at `<outBase>/skills/…` — one
 * level up from the bundle file in every install layout (repo/dist payloads
 * and content-addressed cache slots alike). Resolving from the bundle's
 * `import.meta.url` therefore needs exactly one `..`; repo-root-relative
 * strings only work when the agent's cwd happens to be this monorepo, which
 * is never true for installed payloads.
 *
 * @param fromUrl - `file://` URL (typically `import.meta.url`) of a module
 *   inside the installed `<pkg>/plugin/` directory.
 * @param relative - Skill-relative fragment below `<pkg>/skills/card/references`.
 * @returns Absolute path of the referenced runbook.
 */
export function resolveRunbookFrom(fromUrl: string, relative: string): string {
  return fileURLToPath(new URL(`../skills/card/references/${relative}`, fromUrl));
}

/**
 * Resolves this bundle's installed runbook paths.
 *
 * @param relative - Skill-relative fragment below `<pkg>/skills/card/references`.
 * @returns Absolute path of the referenced runbook.
 */
function resolveRunbook(relative: string): string {
  return resolveRunbookFrom(import.meta.url, relative);
}

/**
 * Builds the real dependency wiring.
 *
 * @returns Dependencies backed entirely by SDK implementations.
 */
export function defaultOpencodeHandlerDeps(): OpencodeHandlerDeps {
  return {
    io: defaultOpencodeStateIo,
    loadActionInput: () => {
      try {
        return extractActionInput();
      } catch {
        return null;
      }
    },
    // Plugins execute inside the OpenCode server process, so the agent PID the
    // watcher must outlive is this process's own PID — the subprocess-era
    // ppid walk (`findAgentPid`) does not apply.
    findMonitorPid: () => process.pid,
    buildManifest: (input) => buildOpencodeManifest(input),
    spawnWatcher: ({ manifest, extensionPath }) =>
      spawnStreamSyncWatcher({
        manifest,
        ...(extensionPath === undefined ? {} : { extensionPath }),
        logger: {
          error: (message, data) => stderrLine(`${message} ${stringify(data)}`),
          warn: (message, data) => stderrLine(`${message} ${stringify(data)}`)
        }
      }),
    markers: {
      hasSkillLoaded: (sessionId, skillName) => hasSessionSkillLoaded(sessionId, skillName),
      markSkillLoaded: (sessionId, skillName) => markSessionSkillLoaded(sessionId, skillName),
      hasRouteNudgeFired: (sessionId) => hasSessionRouteNudgeFired(sessionId),
      markRouteNudgeFired: (sessionId) => markSessionRouteNudgeFired(sessionId),
      hasExitWhenDoneFired: (sessionId) => hasSessionExitWhenDoneNudgeFired(sessionId),
      markExitWhenDoneFired: (sessionId) => markSessionExitWhenDoneNudgeFired(sessionId),
      addActiveSubagent: async (parentSessionId, childSessionId) => {
        await addActiveSubagent(parentSessionId, childSessionId);
      },
      removeActiveSubagent: async (parentSessionId, childSessionId) => {
        await removeActiveSubagent(parentSessionId, childSessionId);
      }
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
    mergeRunbookPath: () => resolveRunbook('merge.md'),
    shutdownRunbookPath: () => resolveRunbook('shutdown.md'),
    transcriptsRoot: () => join(defaultOpencodeStateIo.homedir(), '.cards', 'opencode-transcripts')
  };
}

/**
 * Writes one line to stderr without ever throwing.
 *
 * @param line - Preformatted diagnostic line.
 */
function stderrLine(line: string): void {
  try {
    process.stderr.write(`[opencode-cards-hooks] ${line}\n`);
  } catch {
    // A dead stderr must not kill the host session.
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
