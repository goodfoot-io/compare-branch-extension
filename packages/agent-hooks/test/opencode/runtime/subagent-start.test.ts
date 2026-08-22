/**
 * Tests for the OpenCode subagent-start tracking plugin (child-session
 * linkage from session.created).
 *
 * @summary Tests for the OpenCode subagent-start handler
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSubagentStartPlugin } from '../../../src/opencode/internal/runtime-handlers.js';
import {
  type LogEntry,
  makeCardRepo,
  makeClient,
  makeDeps,
  makePluginInput,
  makeTempDir,
  removeTempDir,
  sessionCreatedEvent
} from '../helpers.js';

let tempDir: string;
let logEntries: LogEntry[];
const stderrWrites: string[] = [];
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  tempDir = makeTempDir('subagent-start');
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

describe('CardsSubagentStart (runtime)', () => {
  it('records a child session against its tracked root parent', async () => {
    const { deps, recorders } = makeDeps(tempDir);
    const plugin = createSubagentStartPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-root'));
    await hooks.event?.(sessionCreatedEvent('ses-child-1', { parentID: 'ses-root' }));

    expect(recorders.markers.subagents.get('ses-root')).toEqual(['ses-child-1']);
  });

  it('records multiple children in order', async () => {
    const { deps, recorders } = makeDeps(tempDir);
    const plugin = createSubagentStartPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-root'));
    await hooks.event?.(sessionCreatedEvent('ses-child-2', { parentID: 'ses-root' }));
    await hooks.event?.(sessionCreatedEvent('ses-child-1', { parentID: 'ses-root' }));

    expect(recorders.markers.subagents.get('ses-root')).toEqual(['ses-child-2', 'ses-child-1']);
  });

  it('ignores children of sessions it never saw as roots', async () => {
    const { deps, recorders } = makeDeps(tempDir);
    const plugin = createSubagentStartPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-orphan-child', { parentID: 'ses-unseen' }));

    expect(recorders.markers.subagents.size).toBe(0);
  });

  it('ignores root session creations (no parent linkage to act on)', async () => {
    const { deps, recorders } = makeDeps(tempDir);
    const plugin = createSubagentStartPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-root'));

    expect(recorders.markers.subagents.size).toBe(0);
  });

  it('degrades with a warning when recording fails, without throwing', async () => {
    const { deps } = makeDeps(tempDir, {
      markers: {
        hasSkillLoaded: () => false,
        markSkillLoaded: () => undefined,
        hasRouteNudgeFired: () => false,
        markRouteNudgeFired: () => undefined,
        hasExitWhenDoneFired: () => false,
        markExitWhenDoneFired: () => undefined,
        addActiveSubagent: async () => {
          throw new Error('disk full');
        },
        removeActiveSubagent: async () => undefined
      }
    });
    const plugin = createSubagentStartPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-root'));
    // Must not throw across the plugin boundary.
    await expect(hooks.event?.(sessionCreatedEvent('ses-child-1', { parentID: 'ses-root' }))).resolves.toBeUndefined();
    expect(stderrWrites.join('')).toContain('Failed to record active subagent');
  });
});
