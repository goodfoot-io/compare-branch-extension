/**
 * Tests for the OpenCode subagent-stop tracking plugin (idle child sessions
 * removed from their parent's active-subagent tracking).
 *
 * @summary Tests for the OpenCode subagent-stop handler
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSubagentStartPlugin,
  createSubagentStopPlugin
} from '../../../src/opencode/internal/runtime-handlers.js';
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
let logEntries: LogEntry[];
const stderrWrites: string[] = [];
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  tempDir = makeTempDir('subagent-stop');
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
 * Builds start+stop plugin hooks sharing one deps instance.
 *
 * @param deps - Handler dependencies both plugins close over.
 * @returns The two plugins' hooks objects.
 */
async function buildHooks(deps: ReturnType<typeof makeDeps>['deps']) {
  const input = makePluginInput(tempDir, makeClient(logEntries));
  const startHooks = await createSubagentStartPlugin(deps)(input);
  const stopHooks = await createSubagentStopPlugin(deps)(input);
  return { startHooks, stopHooks };
}

describe('CardsSubagentStop (runtime)', () => {
  it('removes an idle child session from the parent tracking', async () => {
    const { deps, recorders } = makeDeps(tempDir);
    const { startHooks, stopHooks } = await buildHooks(deps);

    // Both bundles observe the same event stream in production; each keeps
    // its own registry, so both are fed here.
    for (const hooks of [startHooks, stopHooks]) {
      await hooks.event?.(sessionCreatedEvent('ses-root'));
      await hooks.event?.(sessionCreatedEvent('ses-child-1', { parentID: 'ses-root' }));
    }
    await stopHooks.event?.(sessionIdleEvent('ses-child-1'));

    expect(recorders.markers.subagents.get('ses-root')).toEqual([]);
  });

  it('keeps sibling children that have not gone idle', async () => {
    const { deps, recorders } = makeDeps(tempDir);
    const { startHooks, stopHooks } = await buildHooks(deps);

    for (const hooks of [startHooks, stopHooks]) {
      await hooks.event?.(sessionCreatedEvent('ses-root'));
      await hooks.event?.(sessionCreatedEvent('ses-child-1', { parentID: 'ses-root' }));
      await hooks.event?.(sessionCreatedEvent('ses-child-2', { parentID: 'ses-root' }));
    }
    await stopHooks.event?.(sessionIdleEvent('ses-child-1'));

    expect(recorders.markers.subagents.get('ses-root')).toEqual(['ses-child-2']);
  });

  it('warns but survives when removal fails', async () => {
    const { deps } = makeDeps(tempDir, {
      markers: {
        hasSkillLoaded: () => false,
        markSkillLoaded: () => undefined,
        hasRouteNudgeFired: () => false,
        markRouteNudgeFired: () => undefined,
        hasExitWhenDoneFired: () => false,
        markExitWhenDoneFired: () => undefined,
        addActiveSubagent: async () => undefined,
        removeActiveSubagent: async () => {
          throw new Error('lock timeout');
        }
      }
    });
    const plugin = createSubagentStopPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-root'));
    await hooks.event?.(sessionCreatedEvent('ses-child-1', { parentID: 'ses-root' }));
    // Must not throw across the plugin boundary.
    await expect(hooks.event?.(sessionIdleEvent('ses-child-1'))).resolves.toBeUndefined();
    expect(stderrWrites.join('')).toContain('Failed to remove active subagent');
  });

  it('ignores idle events for root and unknown sessions', async () => {
    const { deps, recorders } = makeDeps(tempDir);
    const plugin = createSubagentStopPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-root'));
    await hooks.event?.(sessionIdleEvent('ses-root'));
    await hooks.event?.(sessionIdleEvent('ses-untracked'));

    expect(recorders.markers.subagents.size).toBe(0);
    expect(stderrWrites.join('')).not.toContain('Failed');
  });
});
