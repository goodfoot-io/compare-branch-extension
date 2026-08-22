/**
 * Tests for the OpenCode assistant announcement plugin.
 *
 * @summary Tests for the OpenCode cards-assistant session-start handler
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ASSISTANT_ANNOUNCEMENT,
  createAssistantSessionStartPlugin
} from '../../../src/opencode/internal/assistant-handlers.js';
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
  tempDir = makeTempDir('assistant');
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

describe('CardsAssistantSessionStart (assistant)', () => {
  async function transformFor(sessionId: string | undefined, options: { child?: boolean; twice?: boolean } = {}) {
    const plugin = createAssistantSessionStartPlugin(makeDeps(tempDir).deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(
      sessionCreatedEvent(options.child ? 'ses-child' : 'ses-root', options.child ? { parentID: 'ses-root' } : {})
    );
    const output = { system: [] as string[] };
    const transform = (hooks as { 'experimental.chat.system.transform'?: (i: unknown, o: unknown) => Promise<void> })[
      'experimental.chat.system.transform'
    ];
    const input = sessionId === undefined ? {} : { sessionID: sessionId };
    await transform?.(input, output);
    if (options.twice) {
      await transform?.(input, output);
    }
    return output.system;
  }

  it('announces the capability menu once on the first turn of a root session', async () => {
    const system = await transformFor('ses-root', { twice: true });
    expect(system).toEqual([ASSISTANT_ANNOUNCEMENT]);
    expect(ASSISTANT_ANNOUNCEMENT).toContain('create or update a card');
    expect(ASSISTANT_ANNOUNCEMENT).toContain('send feedback or file a bug report');
  });

  it('does not announce for child sessions', async () => {
    const system = await transformFor('ses-child', { child: true });
    expect(system).toHaveLength(0);
  });

  it('warns by name when the transform fires without a sessionID', async () => {
    const system = await transformFor(undefined);
    expect(system).toHaveLength(0);
    expect(stderrWrites.join('')).toContain('without a sessionID');
  });

  it('fails open when the hook body throws', async () => {
    const plugin = createAssistantSessionStartPlugin(
      makeDeps(tempDir, {
        io: {
          ...makeDeps(tempDir).deps.io,
          gitRoots: () => null
        }
      }).deps
    );
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    // Malformed event payloads must not escape the guarded handler.
    await expect(
      hooks.event?.({ event: undefined } as unknown as Parameters<NonNullable<typeof hooks.event>>[0])
    ).resolves.toBeUndefined();
  });
});
