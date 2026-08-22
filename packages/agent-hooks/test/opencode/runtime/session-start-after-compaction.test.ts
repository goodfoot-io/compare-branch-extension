/**
 * Tests for the OpenCode post-compaction reminder plugin.
 *
 * @summary Tests for the OpenCode session-start-after-compaction handler
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionStartAfterCompactionPlugin } from '../../../src/opencode/internal/runtime-handlers.js';
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
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  tempDir = makeTempDir('compaction');
  makeCardRepo(tempDir);
  logEntries = [];
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation((() => true) as typeof process.stderr.write);
});

afterEach(() => {
  stderrSpy.mockRestore();
  removeTempDir(tempDir);
});

/**
 * Builds a compacting hook invocation pair.
 *
 * @param sessionId - Session being compacted.
 * @returns Input/output objects shaped like the hook invocation.
 */
function compactingCall(sessionId: string): {
  input: { sessionID: string };
  output: { context: string[] };
} {
  return { input: { sessionID: sessionId }, output: { context: [] } };
}

describe('CardsSessionStartAfterCompaction (runtime)', () => {
  async function runCompacting(sessionId: string, registerFirst = true) {
    const plugin = createSessionStartAfterCompactionPlugin(makeDeps(tempDir).deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    if (registerFirst) {
      await hooks.event?.(sessionCreatedEvent('ses-root'));
    }
    const call = compactingCall(sessionId);
    await (hooks as { 'experimental.session.compacting'?: (i: unknown, o: unknown) => Promise<void> })[
      'experimental.session.compacting'
    ]?.(call.input, call.output);
    return call.output.context;
  }

  it('pushes the routing reminder into the compaction context for root sessions', async () => {
    const context = await runCompacting('ses-root');
    expect(context).toHaveLength(1);
    expect(context[0]).toContain('<routing-instructions>');
    expect(context[0]).toContain('Immediately load skills');
  });

  it('skips child sessions', async () => {
    // One instance: the child's created(parentID) record must exist in the
    // same registry the compacting hook consults.
    const plugin = createSessionStartAfterCompactionPlugin(makeDeps(tempDir).deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-root'));
    await hooks.event?.(sessionCreatedEvent('ses-child', { parentID: 'ses-root' }));
    const call = compactingCall('ses-child');
    await (hooks as { 'experimental.session.compacting'?: (i: unknown, o: unknown) => Promise<void> })[
      'experimental.session.compacting'
    ]?.(call.input, call.output);
    expect(call.output.context).toHaveLength(0);
  });

  it('reminds a resumed session first observed via compaction (I5 correction)', async () => {
    // Resumed sessions never re-emit session.created — rule (b) classifies.
    const context = await runCompacting('ses-resumed', false);
    expect(context).toHaveLength(1);
    expect(context[0]).toContain('<routing-instructions>');
  });

  it('fails open when the hook body throws', async () => {
    const plugin = createSessionStartAfterCompactionPlugin(
      makeDeps(tempDir, {
        markers: {
          hasSkillLoaded: () => false,
          markSkillLoaded: () => undefined,
          hasRouteNudgeFired: () => false,
          markRouteNudgeFired: () => undefined,
          hasExitWhenDoneFired: () => false,
          markExitWhenDoneFired: () => undefined,
          addActiveSubagent: async () => undefined,
          removeActiveSubagent: async () => undefined
        }
      }).deps
    );
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    // A malformed event must not escape the guarded event handler.
    await expect(
      hooks.event?.({ event: null } as unknown as Parameters<NonNullable<typeof hooks.event>>[0])
    ).resolves.toBeUndefined();
  });
});
