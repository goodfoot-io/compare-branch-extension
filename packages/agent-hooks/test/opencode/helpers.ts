/**
 * Shared helpers for the OpenCode hook tests.
 *
 * Real implementations over temporary filesystems and in-memory stores —
 * per the card-developer no-mocks rule — plus event builders typed against
 * the installed `@opencode-ai/plugin` surface.
 *
 * @summary Test harness for the OpenCode handler factories
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SessionSyncManifest } from '@cards.management/sdk/transcript-sync';
import type { Plugin } from '@opencode-ai/plugin';
import type { OpencodeHandlerDeps } from '../../src/opencode/internal/deps.js';
import { defaultOpencodeStateIo } from '../../src/opencode/opencode-state.js';

// ---------------------------------------------------------------------------
// Client sink
// ---------------------------------------------------------------------------

/** One captured `client.app.log` body. */
export interface LogEntry {
  service: string;
  level: string;
  message: string;
  extra?: Record<string, unknown>;
}

/**
 * Builds a plain-object client whose `app.log` records bodies.
 *
 * @param entries - Array the bodies are pushed into.
 * @returns A client-shaped object backed by a real function.
 */
export function makeClient(entries: LogEntry[]): Parameters<Plugin>[0]['client'] {
  return {
    app: {
      log: async ({ body }: { body?: Partial<LogEntry> }) => {
        entries.push({
          service: String(body?.service),
          level: String(body?.level),
          message: String(body?.message),
          ...(body?.extra === undefined ? {} : { extra: body.extra as Record<string, unknown> })
        });
        return undefined;
      }
    }
  } as unknown as Parameters<Plugin>[0]['client'];
}

/**
 * Builds the plugin-init input OpenCode would hand a factory.
 *
 * @param directory - Working directory reported to the plugin.
 * @param client - Client sink for log assertions.
 * @returns An input shaped like {@link Plugin}'s parameter.
 */
export function makePluginInput(directory: string, client: Parameters<Plugin>[0]['client']): Parameters<Plugin>[0] {
  return {
    client,
    project: { id: 'proj-test', name: 'test', worktree: directory, vcs: 'git' },
    directory,
    worktree: directory,
    serverUrl: new URL('http://127.0.0.1:4096'),
    experimental_workspace: { register: () => undefined },
    $: () => {
      throw new Error('shell not available in tests');
    }
  } as unknown as Parameters<Plugin>[0];
}

// ---------------------------------------------------------------------------
// Dependency factory
// ---------------------------------------------------------------------------

/** In-memory marker store backing the fake {@link OpencodeHandlerDeps.markers}. */
export class MemoryMarkers {
  /** Skill-load markers keyed `<sessionId>::<skillName>`. */
  readonly skills = new Set<string>();
  /** Sessions whose route nudge fired. */
  readonly routeNudged = new Set<string>();
  /** Sessions whose exit-when-done nudge fired. */
  readonly exitNudged = new Set<string>();
  /** Parent session → active child ids. */
  readonly subagents = new Map<string, string[]>();
  /** Number of removeActiveSubagent calls, for leak assertions. */
  removalCalls = 0;

  /**
   * Adds a child to a parent's active set (real card-repo parity).
   *
   * @param parentId - Parent root session id.
   * @param childId - Child subagent session id.
   */
  async addSubagent(parentId: string, childId: string): Promise<void> {
    const list = this.subagents.get(parentId) ?? [];
    if (!list.includes(childId)) {
      list.push(childId);
    }
    this.subagents.set(parentId, list);
  }

  /**
   * Removes a child from a parent's active set.
   *
   * @param parentId - Parent root session id.
   * @param childId - Child subagent session id that went idle or was deleted.
   */
  async removeSubagent(parentId: string, childId: string): Promise<void> {
    this.removalCalls += 1;
    const list = this.subagents.get(parentId) ?? [];
    const next = list.filter((id) => id !== childId);
    this.subagents.set(parentId, next);
  }

  /**
   * Active subagent count for a parent session.
   *
   * @param parentId - Parent root session id.
   * @returns Number of children still marked active.
   */
  count(parentId: string): number {
    return this.subagents.get(parentId)?.length ?? 0;
  }
}

/** Recorder handles attached to every fake deps instance. */
export interface DepsRecorders {
  manifests: SessionSyncManifest[];
  watcherSpawns: Array<{ manifest: SessionSyncManifest; extensionPath?: string }>;
  markers: MemoryMarkers;
}

/**
 * Builds handler dependencies backed by real implementations and recorders.
 *
 * @param root - Temporary directory anchoring transcripts.
 * @param overrides - Per-test edge overrides merged last.
 * @returns Deps plus the recorder handles.
 */
export function makeDeps(
  root: string,
  overrides: Partial<OpencodeHandlerDeps> = {}
): { deps: OpencodeHandlerDeps; recorders: DepsRecorders } {
  const markers = new MemoryMarkers();
  const manifests: SessionSyncManifest[] = [];
  const watcherSpawns: Array<{ manifest: SessionSyncManifest; extensionPath?: string }> = [];

  const deps: OpencodeHandlerDeps = {
    io: defaultOpencodeStateIo,
    loadActionInput: () => null,
    findMonitorPid: () => 4242,
    buildManifest: (input): SessionSyncManifest => {
      // CONTRACT-B shape, produced locally so tests never depend on the SDK
      // implementation's completion state.
      const manifest: SessionSyncManifest = {
        version: 1,
        sessionId: input.sessionId,
        cardId: input.cardId,
        runtime: 'opencode',
        streamType: 'opencode-session',
        watchRoot: input.transcriptPath.slice(0, input.transcriptPath.lastIndexOf('/')),
        monitorPid: input.monitorPid,
        cardRepoPath: input.cardRepoPath,
        sources: [{ pattern: `${input.sessionId}.jsonl`, role: 'main', mode: 'jsonl-tail' }]
      };
      manifests.push(manifest);
      return manifest;
    },
    spawnWatcher: (options) => {
      watcherSpawns.push(options);
      return true;
    },
    markers: {
      hasSkillLoaded: (sessionId, skillName) => markers.skills.has(`${sessionId}::${skillName}`),
      markSkillLoaded: (sessionId, skillName) => void markers.skills.add(`${sessionId}::${skillName}`),
      hasRouteNudgeFired: (sessionId) => markers.routeNudged.has(sessionId),
      markRouteNudgeFired: (sessionId) => void markers.routeNudged.add(sessionId),
      hasExitWhenDoneFired: (sessionId) => markers.exitNudged.has(sessionId),
      markExitWhenDoneFired: (sessionId) => void markers.exitNudged.add(sessionId),
      addActiveSubagent: async (parentId, childId) => markers.addSubagent(parentId, childId),
      removeActiveSubagent: async (parentId, childId) => markers.removeSubagent(parentId, childId)
    },
    unmergedCommitCount: () => 0,
    mergeRunbookPath: () => join(root, 'skills', 'card', 'references', 'merge.md'),
    shutdownRunbookPath: () => join(root, 'skills', 'card', 'references', 'shutdown.md'),
    transcriptsRoot: () => join(root, 'transcripts'),
    // Resume backfill baseline: no stored history. Backfill tests override.
    loadSessionHistory: async () => [],
    ...overrides
  };

  return { deps, recorders: { manifests, watcherSpawns, markers } };
}

// ---------------------------------------------------------------------------
// Temp directories and card repos
// ---------------------------------------------------------------------------

/**
 * Creates a unique temporary directory tree.
 *
 * @param label - Subdirectory name under the OS temp dir.
 * @returns Absolute path of the created directory.
 */
export function makeTempDir(label: string): string {
  return mkdtempSync(join(tmpdir(), `opencode-hooks-${label}-`));
}

/**
 * Removes a temporary directory tree created by {@link makeTempDir}.
 *
 * @param dir - Directory to remove.
 */
export function removeTempDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/**
 * Creates a minimal readable card repository (CARD.meta.json present).
 *
 * @param root - Parent directory.
 * @param cardId - Card identifier used as the directory name.
 * @returns Absolute path of the card repository.
 */
export function makeCardRepo(root: string, cardId = 'main-453'): string {
  const repoPath = join(root, cardId);
  mkdirSync(repoPath, { recursive: true });
  writeFileSync(
    join(repoPath, 'CARD.meta.json'),
    JSON.stringify({
      id: cardId,
      title: 'Test card',
      status: 'active',
      gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false }
    })
  );
  return repoPath;
}

// ---------------------------------------------------------------------------
// Event builders (typed against the plugin Hooks surface)
// ---------------------------------------------------------------------------

type Hooks = Awaited<ReturnType<Plugin>>;
type EventHookInput = Parameters<NonNullable<Hooks['event']>>[0];

/**
 * Builds a full `session.created` event payload.
 *
 * @param sessionId - Root or child session id.
 * @param options - Optional overrides for the payload.
 * @param options.parentID - When present, marks the session as a child of this parent id.
 * @param options.version - Runtime version embedded in the session record.
 * @returns The event input handed to an `event` hook.
 */
export function sessionCreatedEvent(
  sessionId: string,
  options: { parentID?: string; version?: string } = {}
): EventHookInput {
  return {
    event: {
      type: 'session.created',
      properties: {
        info: {
          id: sessionId,
          ...(options.parentID ? { parentID: options.parentID } : {}),
          projectID: 'proj-test',
          directory: '/tmp',
          title: `session ${sessionId}`,
          version: options.version ?? '1.18.21',
          time: { created: Date.now(), updated: Date.now() }
        }
      }
    }
  } as unknown as EventHookInput;
}

/**
 * Builds a `session.idle` event payload.
 *
 * @param sessionId - Identifier of the session whose turn just finished.
 * @returns The event input handed to an `event` hook.
 */
export function sessionIdleEvent(sessionId: string): EventHookInput {
  return { event: { type: 'session.idle', properties: { sessionID: sessionId } } } as unknown as EventHookInput;
}

/**
 * Builds a `session.deleted` event payload.
 *
 * @param sessionId - Identifier of the session removed from the runtime.
 * @returns The event input handed to an `event` hook.
 */
export function sessionDeletedEvent(sessionId: string): EventHookInput {
  return {
    event: {
      type: 'session.deleted',
      properties: {
        info: {
          id: sessionId,
          projectID: 'proj-test',
          directory: '/tmp',
          title: `session ${sessionId}`,
          version: '1.18.21',
          time: { created: Date.now(), updated: Date.now() }
        }
      }
    }
  } as unknown as EventHookInput;
}

/**
 * Builds a `message.part.updated` event carrying a text part.
 *
 * @param sessionId - Identifier of the session streaming the part.
 * @param text - Plain text carried by the synthetic text part.
 * @returns The event input handed to an `event` hook.
 */
export function partUpdatedEvent(sessionId: string, text: string): EventHookInput {
  return {
    event: {
      type: 'message.part.updated',
      properties: {
        part: {
          id: 'prt-1',
          sessionID: sessionId,
          messageID: 'msg-1',
          type: 'text',
          text
        }
      }
    }
  } as unknown as EventHookInput;
}

/**
 * Builds a `message.updated` event carrying a user message.
 *
 * @param sessionId - Owning session id.
 * @returns The event input handed to an `event` hook.
 */
export function messageUpdatedEvent(sessionId: string): EventHookInput {
  return {
    event: {
      type: 'message.updated',
      properties: {
        info: {
          id: 'msg-1',
          sessionID: sessionId,
          role: 'user',
          time: { created: Date.now() },
          agent: 'build',
          model: { providerID: 'test', modelID: 'test' }
        }
      }
    }
  } as unknown as EventHookInput;
}
