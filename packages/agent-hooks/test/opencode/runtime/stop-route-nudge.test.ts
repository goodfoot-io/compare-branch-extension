/**
 * Tests for the OpenCode merge route-nudge plugin (notify-only degradation).
 *
 * @summary Tests for the OpenCode stop-route-nudge handler
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { addActiveSubagent } from '@cards.management/sessions/card-repo';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStopRouteNudgePlugin } from '../../../src/opencode/internal/runtime-handlers.js';
import {
  type LogEntry,
  makeCardRepo,
  makeClient,
  makeDeps,
  makePluginInput,
  makeTempDir,
  removeTempDir,
  sessionCreatedEvent,
  sessionIdleEvent
} from '../helpers.js';

let tempDir: string;
let cardRepoPath: string;
let logEntries: LogEntry[];
const stderrWrites: string[] = [];
let stderrSpy: ReturnType<typeof vi.spyOn>;

/** Saved CARD_* / WORKSPACE_* env entries restored after each test. */
let savedEnv: Array<[string, string | undefined]>;
const ENV_KEYS = ['CARD_REPO_PATH', 'WORKSPACE_PATH', 'BASE_BRANCH', 'WORKSPACE_BRANCH'];

beforeEach(() => {
  tempDir = makeTempDir('route-nudge');
  cardRepoPath = makeCardRepo(tempDir);
  logEntries = [];
  stderrWrites.length = 0;
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: unknown) => {
    stderrWrites.push(String(chunk));
    return true;
  }) as typeof process.stderr.write);
  savedEnv = ENV_KEYS.map((key) => [key, process.env[key]] as [string, string | undefined]);
  // The SDK env getters read these directly (same pattern as the Codex hook).
  process.env['CARD_REPO_PATH'] = cardRepoPath;
  process.env['WORKSPACE_PATH'] = join(tempDir, 'workspace');
  process.env['BASE_BRANCH'] = 'main';
  process.env['WORKSPACE_BRANCH'] = 'cards/main-453/1';
});

afterEach(() => {
  for (const [key, value] of savedEnv) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  stderrSpy.mockRestore();
  removeTempDir(tempDir);
});

/**
 * Drives one root session through registration and a single idle event.
 *
 * @param unmergedCount - Commit count the injected git counter reports.
 * @param sessionId - Root session id to register and idle.
 * @returns The recorder handles attached to the plugin's deps.
 */
async function runIdle(unmergedCount: number, sessionId = 'ses-root') {
  const { deps, recorders } = makeDeps(tempDir, { unmergedCommitCount: () => unmergedCount });
  const plugin = createStopRouteNudgePlugin(deps);
  const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
  await hooks.event?.(sessionCreatedEvent(sessionId));
  await hooks.event?.(sessionIdleEvent(sessionId));
  return recorders;
}

describe('CardsStopRouteNudge (runtime)', () => {
  it('announces the merge nudge once when the workspace has unmerged commits', async () => {
    const { markers } = await runIdle(3);

    expect(markers.routeNudged.has('ses-root')).toBe(true);
    const warning = logEntries.find((e) => e.level === 'warn' && e.message.includes('merge nudge'));
    expect(warning).toBeDefined();
    expect(warning?.message).toContain('3 commit(s) not merged into `main`');
    expect(warning?.message).toContain('cannot block a turn');
    expect(warning?.message).toContain(join(tempDir, 'skills', 'card', 'references', 'merge.md'));
    // Named degradation mirrors to stderr as well.
    expect(stderrWrites.join('')).toContain('merge nudge');
  });

  it('does not fire twice for one session', async () => {
    const { deps } = makeDeps(tempDir, { unmergedCommitCount: () => 1 });
    const plugin = createStopRouteNudgePlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-root'));
    await hooks.event?.(sessionIdleEvent('ses-root'));
    await hooks.event?.(sessionIdleEvent('ses-root'));

    const fires = logEntries.filter((e) => e.message.includes('merge nudge'));
    expect(fires).toHaveLength(1);
  });

  it('stays silent with zero unmerged commits', async () => {
    const { markers } = await runIdle(0);
    expect(markers.routeNudged.size).toBe(0);
    expect(logEntries.some((e) => e.message.includes('merge nudge'))).toBe(false);
  });

  it('skips child sessions', async () => {
    const { deps, recorders } = makeDeps(tempDir, { unmergedCommitCount: () => 5 });
    const plugin = createStopRouteNudgePlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-child', { parentID: 'ses-root' }));
    await hooks.event?.(sessionIdleEvent('ses-child'));
    expect(recorders.markers.routeNudged.size).toBe(0);
  });

  it('skips blocked cards', async () => {
    writeFileSync(
      join(cardRepoPath, 'CARD.meta.json'),
      JSON.stringify({ id: 'main-453', tags: ['blocked'], gates: {} })
    );
    const { markers } = await runIdle(4);
    expect(markers.routeNudged.size).toBe(0);
  });

  it('skips cards awaiting merge approval', async () => {
    writeFileSync(
      join(cardRepoPath, 'CARD.meta.json'),
      JSON.stringify({ id: 'main-453', gates: { mergeRequestRequired: true, mergeApproved: false } })
    );
    const { markers } = await runIdle(4);
    expect(markers.routeNudged.size).toBe(0);
  });

  it('notifies when merge was requested and approved', async () => {
    writeFileSync(
      join(cardRepoPath, 'CARD.meta.json'),
      JSON.stringify({ id: 'main-453', gates: { mergeRequestRequired: true, mergeApproved: true } })
    );
    const { markers } = await runIdle(2);
    expect(markers.routeNudged.has('ses-root')).toBe(true);
  });

  it('warns and stands down when CARD.meta.json is unreadable', async () => {
    // Point CARD_REPO_PATH at a directory without CARD.meta.json.
    process.env['CARD_REPO_PATH'] = join(tempDir, 'empty-repo');
    const { markers } = await runIdle(4);
    expect(markers.routeNudged.size).toBe(0);
    expect(stderrWrites.join('')).toContain('failed to read CARD.meta.json');
  });

  it('stands down silently outside a Cards action subprocess', async () => {
    delete process.env['CARD_REPO_PATH'];
    const { markers } = await runIdle(4);
    expect(markers.routeNudged.size).toBe(0);
  });

  it('notifies a resumed root whose first observation is its own idle event (I5 correction)', async () => {
    // Resumed sessions never re-emit session.created — rule (b) classifies
    // the root from the idle event itself.
    const { deps } = makeDeps(tempDir, { unmergedCommitCount: () => 6 });
    const plugin = createStopRouteNudgePlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionIdleEvent('ses-untracked'));

    expect(deps.markers.hasRouteNudgeFired('ses-untracked')).toBe(true);
  });

  it('waits while active subagents keep the session busy', async () => {
    const { deps } = makeDeps(tempDir, { unmergedCommitCount: () => 4 });
    // Real shared leaf against real files: HOME redirected so
    // addActiveSubagent/getActiveSubagentCount operate on the temp tree.
    const originalHome = process.env['HOME'];
    process.env['HOME'] = tempDir;
    try {
      await addActiveSubagent('ses-root', 'ses-child-1');
      const plugin = createStopRouteNudgePlugin(deps);
      const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
      await hooks.event?.(sessionCreatedEvent('ses-root'));
      await hooks.event?.(sessionIdleEvent('ses-root'));

      expect(deps.markers.hasRouteNudgeFired('ses-root')).toBe(false);
    } finally {
      if (originalHome === undefined) {
        delete process.env['HOME'];
      } else {
        process.env['HOME'] = originalHome;
      }
    }
  });
});
