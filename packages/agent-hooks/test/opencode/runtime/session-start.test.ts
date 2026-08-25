/**
 * Tests for the OpenCode runtime session-start plugin: root-session
 * registration, transcript materialization (CONTRACT-C), manifest + watcher
 * wiring, identity injection via the stateless `shell.env`, and every-turn
 * card context through the system transform.
 *
 * @summary Tests for the OpenCode runtime session-start handler
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ActionInput } from '@cards.management/sdk/config';
import { addActiveSubagent } from '@cards.management/sessions/card-repo';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionStartPlugin } from '../../../src/opencode/internal/runtime-handlers.js';
import {
  type LogEntry,
  makeCardRepo,
  makeClient,
  makeDeps,
  makePluginInput,
  makeTempDir,
  messageUpdatedEvent,
  partUpdatedEvent,
  removeTempDir,
  sessionCreatedEvent,
  sessionDeletedEvent,
  sessionIdleEvent
} from '../helpers.js';

let tempDir: string;
let logEntries: LogEntry[];
const stderrWrites: string[] = [];
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  tempDir = makeTempDir('session-start');
  makeCardRepo(tempDir);
  logEntries = [];
  stderrWrites.length = 0;
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: unknown) => {
    stderrWrites.push(String(chunk));
    return true;
  }) as typeof process.stderr.write);
});

afterEach(() => {
  stderrSpy.mockRestore();
  removeTempDir(tempDir);
});

/**
 * Builds a Cards action input pointing at a readable card repo in `tempDir`.
 *
 * @param overrides - Field overrides merged last.
 * @returns The action input returned by injected `loadActionInput`.
 */
function actionInput(overrides: Partial<ActionInput> = {}): ActionInput {
  return {
    cardId: 'main-453',
    actionName: 'Launch Cards',
    environment: 'default',
    executionMode: 'interactive',
    exitWhenDone: false,
    codingAgent: 'opencode-cli',
    switchToInteractiveData: undefined,
    repoRoot: join(tempDir, 'repo-root'),
    cardRepoPath: join(tempDir, 'main-453'),
    configPath: '/tmp/config',
    extensionPath: '/tmp/extension',
    marketplacePath: '/tmp/extension/dist/marketplace',
    ...overrides
  };
}

/**
 * Reads the materialized transcript lines for a session.
 *
 * @param sessionId - Session whose transcript file is parsed.
 * @returns Parsed JSON objects, one per NDJSON line.
 */
function readLines(sessionId: string): Array<Record<string, unknown>> {
  const path = join(tempDir, 'transcripts', `${sessionId}.jsonl`);
  if (!existsSync(path)) {
    return [];
  }
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe('runtime session-start plugin', () => {
  it('registers event, shell.env, and system.transform hooks', async () => {
    const plugin = createSessionStartPlugin(makeDeps(tempDir).deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    expect(typeof hooks.event).toBe('function');
    expect(typeof (hooks as Record<string, unknown>)['shell.env']).toBe('function');
    expect(typeof (hooks as Record<string, unknown>)['experimental.chat.system.transform']).toBe('function');
  });

  it('keeps user sessions inert when no Cards action env is present', async () => {
    const { deps, recorders } = makeDeps(tempDir);
    const plugin = createSessionStartPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

    await hooks.event?.(sessionCreatedEvent('ses-user'));

    expect(existsSync(join(tempDir, 'transcripts'))).toBe(false);
    expect(recorders.manifests).toHaveLength(0);
    expect(recorders.watcherSpawns).toHaveLength(0);
    expect(logEntries.some((e) => e.message.includes('not a Cards action'))).toBe(true);
  });

  it('entry exports an inert plugin (no hooks at all) outside Cards-action sessions', async () => {
    const previous = process.env['CARD_ID'];
    delete process.env['CARD_ID'];
    try {
      vi.resetModules();
      const entry = await import('../../../src/opencode/runtime/session-start.js');
      const plugin = entry.CardsRuntimeSessionStart;
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
      // No hook surface whatsoever: accidental global registration is silent.
      expect(hooks).toEqual({});
      expect(hooks.event).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env['CARD_ID'];
      else process.env['CARD_ID'] = previous;
      vi.resetModules();
    }
  });

  it('entry exports the live factory when spawned by a Cards action', async () => {
    const previous = process.env['CARD_ID'];
    process.env['CARD_ID'] = 'ope-age-sup-1';
    try {
      vi.resetModules();
      const entry = await import('../../../src/opencode/runtime/session-start.js');
      const hooks = await entry.CardsRuntimeSessionStart(makePluginInput(tempDir, makeClient(logEntries)));
      expect(typeof hooks.event).toBe('function');
    } finally {
      if (previous === undefined) delete process.env['CARD_ID'];
      else process.env['CARD_ID'] = previous;
      vi.resetModules();
    }
  });

  it('materializes the transcript with a meta line and spawns the watcher for an action session', async () => {
    const { deps, recorders } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
    const plugin = createSessionStartPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

    await hooks.event?.(sessionCreatedEvent('ses-card', { version: '1.18.21' }));

    const lines = readLines('ses-card');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      v: 1,
      seq: 1,
      sessionId: 'ses-card',
      type: 'meta',
      data: { runtime: 'opencode', opencodeVersion: '1.18.21' }
    });

    expect(recorders.manifests).toHaveLength(1);
    expect(recorders.manifests[0]).toMatchObject({
      version: 1,
      sessionId: 'ses-card',
      cardId: 'main-453',
      runtime: 'opencode',
      streamType: 'opencode-session',
      monitorPid: 4242,
      cardRepoPath: join(tempDir, 'main-453')
    });
    expect(recorders.manifests[0]?.sources).toEqual([{ pattern: 'ses-card.jsonl', role: 'main', mode: 'jsonl-tail' }]);
    expect(recorders.watcherSpawns[0]?.extensionPath).toBe('/tmp/extension');

    // The manifest contract requires filename↔sessionId agreement; assert the
    // transcript path handed to the adapter satisfies it.
    const transcriptPath = recorders.manifests[0]?.sources?.[0]?.pattern;
    expect(transcriptPath).toBe('ses-card.jsonl');
  });

  it('ignores child sessions even inside an action', async () => {
    const { deps, recorders } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
    const plugin = createSessionStartPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

    await hooks.event?.(sessionCreatedEvent('ses-child', { parentID: 'ses-card' }));

    expect(readLines('ses-child')).toHaveLength(0);
    expect(recorders.watcherSpawns).toHaveLength(0);
  });

  describe('resumed sessions (I5 correction): never re-emit session.created', () => {
    it('starts the Cards integration from the first message.part.updated event', async () => {
      const { deps, recorders } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
      const plugin = createSessionStartPlugin(deps);
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

      // No session.created ever arrives for a resumed session.
      await hooks.event?.(partUpdatedEvent('ses-resumed', 'continuing work'));

      // Startup ran once: meta line first, then the triggering part.
      const lines = readLines('ses-resumed');
      expect(lines.map((line) => line['type'])).toEqual(['meta', 'part']);
      expect(lines[0]).toMatchObject({ data: { runtime: 'opencode', opencodeVersion: 'unknown' } });

      expect(recorders.manifests).toHaveLength(1);
      expect(recorders.manifests[0]).toMatchObject({
        sessionId: 'ses-resumed',
        cardId: 'main-453',
        monitorPid: 4242
      });
      expect(recorders.watcherSpawns).toHaveLength(1);
    });

    it('starts at most once despite repeated activity events', async () => {
      const { deps, recorders } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
      const plugin = createSessionStartPlugin(deps);
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

      await hooks.event?.(partUpdatedEvent('ses-resumed', 'first'));
      await hooks.event?.(messageUpdatedEvent('ses-resumed'));
      await hooks.event?.(partUpdatedEvent('ses-resumed', 'third'));

      const types = readLines('ses-resumed').map((line) => line['type']);
      expect(types).toEqual(['meta', 'part', 'message', 'part']);
      expect(recorders.manifests).toHaveLength(1);
      expect(recorders.watcherSpawns).toHaveLength(1);
    });

    it('injects identity when shell.env is the first observation of a resumed session', async () => {
      const { deps } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
      const plugin = createSessionStartPlugin(deps);
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

      const output = { env: {} as Record<string, string> };
      await (hooks as { 'shell.env'?: (i: unknown, o: unknown) => Promise<void> })['shell.env']?.(
        { cwd: tempDir, sessionID: 'ses-resumed' },
        output
      );

      expect(output.env['CARDS_SESSION_ID']).toBe('ses-resumed');
      expect(output.env['CARDS_TRANSCRIPT_PATH']).toBe(join(tempDir, 'transcripts', 'ses-resumed.jsonl'));
      // The startup sequence ran, so the injected transcript file exists.
      expect(readLines('ses-resumed')).toHaveLength(1);
    });

    it('injects context when system.transform is the first observation', async () => {
      const { deps } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
      const plugin = createSessionStartPlugin(deps);
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

      const output = { system: [] as string[] };
      await (hooks as { 'experimental.chat.system.transform'?: (i: unknown, o: unknown) => Promise<void> })[
        'experimental.chat.system.transform'
      ]?.({ sessionID: 'ses-resumed' }, output);

      expect(output.system).toHaveLength(1);
      expect(output.system[0]).toContain('CARD_ID=main-453');
    });

    it('keeps child sessions skipped even when their activity arrives first in this bundle', async () => {
      const { deps, recorders } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
      const plugin = createSessionStartPlugin(deps);
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

      // Child announces created(parentID); its activity must stay ignored.
      await hooks.event?.(sessionCreatedEvent('ses-child', { parentID: 'ses-root' }));
      await hooks.event?.(partUpdatedEvent('ses-child', 'subagent work'));

      const output = { env: {} as Record<string, string> };
      await (hooks as { 'shell.env'?: (i: unknown, o: unknown) => Promise<void> })['shell.env']?.(
        { cwd: tempDir, sessionID: 'ses-child' },
        output
      );

      expect(readLines('ses-child')).toHaveLength(0);
      expect(recorders.watcherSpawns).toHaveLength(0);
      expect(Object.keys(output.env)).toHaveLength(0);
    });

    it('stays inert for a non-action session first observed via activity', async () => {
      const { deps, recorders } = makeDeps(tempDir);
      const plugin = createSessionStartPlugin(deps);
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

      await hooks.event?.(partUpdatedEvent('ses-user-resumed', 'hello'));
      await hooks.event?.(partUpdatedEvent('ses-user-resumed', 'again'));

      expect(readLines('ses-user-resumed')).toHaveLength(0);
      expect(recorders.manifests).toHaveLength(0);
      // The decline is logged once, not per event.
      const declines = logEntries.filter((e) => e.message.includes('not a Cards action'));
      expect(declines).toHaveLength(1);
    });
  });

  it('appends part and message lines only for tracked sessions', async () => {
    const { deps } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
    const plugin = createSessionStartPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-card'));
    await hooks.event?.(partUpdatedEvent('ses-card', 'hello'));
    await hooks.event?.(messageUpdatedEvent('ses-card'));
    await hooks.event?.(partUpdatedEvent('ses-unknown', 'ignored'));

    const lines = readLines('ses-card');
    expect(lines.map((line) => line['type'])).toEqual(['meta', 'part', 'message']);
    expect((lines[1]?.['data'] as Record<string, unknown>)['text']).toBe('hello');
  });

  it('closes the exporter on session.deleted and stops appending', async () => {
    const { deps } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
    const plugin = createSessionStartPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-card'));
    await hooks.event?.(partUpdatedEvent('ses-card', 'before delete'));
    await hooks.event?.(sessionDeletedEvent('ses-card'));
    await hooks.event?.(partUpdatedEvent('ses-card', 'after delete'));

    const types = readLines('ses-card').map((line) => line['type']);
    expect(types).toEqual(['meta', 'part']);
  });

  describe('session.idle export', () => {
    it('writes an idle line for a tracked root session', async () => {
      const { deps } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
      const plugin = createSessionStartPlugin(deps);
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

      await hooks.event?.(sessionCreatedEvent('ses-card'));
      await hooks.event?.(partUpdatedEvent('ses-card', 'working'));
      await hooks.event?.(sessionIdleEvent('ses-card'));

      const lines = readLines('ses-card');
      expect(lines.map((line) => line['type'])).toEqual(['meta', 'part', 'idle']);
      expect(lines[2]).toMatchObject({
        v: 1,
        seq: 3,
        sessionId: 'ses-card',
        type: 'idle',
        data: {}
      });
    });

    it('drops idle events for sessions never classified in this bundle', async () => {
      const { deps } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
      const plugin = createSessionStartPlugin(deps);
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

      // Idle is deliberately NOT a classifying observation (no noteObserved):
      // an untracked session's idles drop benignly without starting startup.
      await hooks.event?.(sessionIdleEvent('ses-unknown'));

      expect(existsSync(join(tempDir, 'transcripts'))).toBe(false);
    });

    it('drops idle events for child sessions of a tracked root', async () => {
      const { deps } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
      const plugin = createSessionStartPlugin(deps);
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

      await hooks.event?.(sessionCreatedEvent('ses-root'));
      await hooks.event?.(sessionCreatedEvent('ses-child', { parentID: 'ses-root' }));
      await hooks.event?.(sessionIdleEvent('ses-child'));

      expect(readLines('ses-child')).toHaveLength(0);
      expect(readLines('ses-root').map((line) => line['type'])).toEqual(['meta']);
    });

    it('still writes the idle line while subagents are active (no marker-file coupling)', async () => {
      const { deps, recorders } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
      // Seed the deps marker seam as createSubagentStartPlugin would.
      recorders.markers.addSubagent('ses-card', 'ses-child');
      // Seed the REAL active-subagent state isSessionIdle() reads, so a
      // regression that adds that gate here would suppress the line and fail
      // this pin. HOME redirected → real leaf files land under tempDir.
      const originalHome = process.env['HOME'];
      process.env['HOME'] = tempDir;
      try {
        await addActiveSubagent('ses-card', 'ses-child');

        const plugin = createSessionStartPlugin(deps);
        const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
        await hooks.event?.(sessionCreatedEvent('ses-card'));
        await hooks.event?.(sessionIdleEvent('ses-card'));
      } finally {
        if (originalHome === undefined) {
          delete process.env['HOME'];
        } else {
          process.env['HOME'] = originalHome;
        }
      }

      expect(recorders.markers.count('ses-card')).toBe(1);
      expect(readLines('ses-card').map((line) => line['type'])).toEqual(['meta', 'idle']);
    });

    it('tolerates repeated idle events by appending one line each', async () => {
      const { deps } = makeDeps(tempDir, { loadActionInput: () => actionInput() });
      const plugin = createSessionStartPlugin(deps);
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

      await hooks.event?.(sessionCreatedEvent('ses-card'));
      await hooks.event?.(sessionIdleEvent('ses-card'));
      await hooks.event?.(partUpdatedEvent('ses-card', 'second turn'));
      await hooks.event?.(sessionIdleEvent('ses-card'));

      expect(readLines('ses-card').map((line) => line['type'])).toEqual(['meta', 'idle', 'part', 'idle']);
    });
  });

  describe('shell.env identity injection', () => {
    async function shellEnvFor(
      sessionId?: string,
      options: { roots?: string[]; children?: string[]; noAction?: boolean } = {}
    ) {
      const { deps } = makeDeps(tempDir, {
        loadActionInput: () => (options.noAction ? null : actionInput())
      });
      const plugin = createSessionStartPlugin(deps);
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
      for (const id of options.roots ?? ['ses-card']) {
        await hooks.event?.(sessionCreatedEvent(id));
      }
      for (const [index, id] of (options.children ?? []).entries()) {
        await hooks.event?.(sessionCreatedEvent(id, { parentID: `ses-parent-${index}` }));
      }
      const output = { env: {} as Record<string, string> };
      await (hooks as { 'shell.env'?: (i: unknown, o: unknown) => Promise<void> })['shell.env']?.(
        sessionId === undefined ? { cwd: tempDir } : { cwd: tempDir, sessionID: sessionId },
        output
      );
      return output.env;
    }

    it('injects CARDS_SESSION_ID, OPENCODE_RUN_ID, and CARDS_TRANSCRIPT_PATH for the root', async () => {
      const env = await shellEnvFor('ses-card');
      expect(env['CARDS_SESSION_ID']).toBe('ses-card');
      expect(env['OPENCODE_RUN_ID']).toBe('ses-card');
      expect(env['CARDS_TRANSCRIPT_PATH']).toBe(join(tempDir, 'transcripts', 'ses-card.jsonl'));
    });

    it('skips child sessions', async () => {
      const env = await shellEnvFor('ses-child', { roots: [], children: ['ses-child'] });
      expect(Object.keys(env)).toHaveLength(0);
    });

    it('attributes absent-sessionID calls to the sole live root session', async () => {
      const env = await shellEnvFor(undefined, { roots: ['ses-card'] });
      expect(env['CARDS_SESSION_ID']).toBe('ses-card');
    });

    it('declines to guess when several root sessions are live', async () => {
      const env = await shellEnvFor(undefined, { roots: ['ses-a', 'ses-b'] });
      expect(Object.keys(env)).toHaveLength(0);
    });

    it('stays empty for sessions without Cards state', async () => {
      // Not spawned by a Cards action — classification happens but startup
      // declines, so there is no transcript path to inject.
      const env = await shellEnvFor('ses-user', { roots: [], noAction: true });
      expect(Object.keys(env)).toHaveLength(0);
    });
  });

  describe('system transform context injection', () => {
    async function transformFor(
      input: { sessionID?: string },
      options: { action?: Partial<ActionInput>; noAction?: boolean } = {}
    ) {
      const { deps } = makeDeps(tempDir, {
        loadActionInput: () => (options.noAction ? null : actionInput(options.action))
      });
      const plugin = createSessionStartPlugin(deps);
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
      await hooks.event?.(sessionCreatedEvent('ses-card'));
      const output = { system: [] as string[] };
      await (hooks as { 'experimental.chat.system.transform'?: (i: unknown, o: unknown) => Promise<void> })[
        'experimental.chat.system.transform'
      ]?.(input, output);
      return output.system;
    }

    it('appends the cached context fragment on every turn', async () => {
      const system = await transformFor({ sessionID: 'ses-card' });
      expect(system).toHaveLength(1);
      expect(system[0]).toContain('CARD_ID=main-453');
      expect(system[0]).toContain(`CARD_REPO_PATH=${join(tempDir, 'main-453')}`);

      const again = await transformFor({ sessionID: 'ses-card' });
      expect(again).toHaveLength(1);
    });

    it('injects nothing before the Cards action is confirmed', async () => {
      const system = await transformFor({ sessionID: 'ses-card' }, { noAction: true });
      expect(system).toHaveLength(0);
    });

    it('warns by name when the transform fires without a sessionID', async () => {
      await transformFor({});
      expect(stderrWrites.join('')).toContain('without a sessionID');
    });

    it('degrades with a named error when the card repo is inaccessible', async () => {
      const missing = join(tempDir, 'does-not-exist');
      const system = await transformFor({ sessionID: 'ses-card' }, { action: { cardRepoPath: missing } });
      expect(system).toHaveLength(0);
      expect(stderrWrites.join('')).not.toContain('failed (fail-open)');
      expect(logEntries.some((e) => e.level === 'error' && e.message.includes(missing))).toBe(true);
      // The session still streams despite the degraded context.
      expect(readLines('ses-card')).toHaveLength(1);
    });
  });

  it('warns instead of throwing when the manifest builder fails', async () => {
    const { deps, recorders } = makeDeps(tempDir, {
      loadActionInput: () => actionInput(),
      buildManifest: () => {
        throw new Error('transcript path disagrees with sessionId');
      }
    });
    const plugin = createSessionStartPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

    await expect(hooks.event?.(sessionCreatedEvent('ses-card'))).resolves.toBeUndefined();

    expect(recorders.watcherSpawns).toHaveLength(0);
    expect(stderrWrites.join('')).toContain('stream-sync-watcher spawn failed');
  });

  it('warns and keeps streaming when no monitor PID resolves', async () => {
    const { deps, recorders } = makeDeps(tempDir, {
      loadActionInput: () => actionInput(),
      findMonitorPid: () => null
    });
    const plugin = createSessionStartPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));

    await hooks.event?.(sessionCreatedEvent('ses-card'));

    expect(recorders.watcherSpawns).toHaveLength(0);
    expect(logEntries.some((e) => e.level === 'warn' && e.message.includes('transcript watcher disabled'))).toBe(true);
    expect(readLines('ses-card')).toHaveLength(1);
  });
});
