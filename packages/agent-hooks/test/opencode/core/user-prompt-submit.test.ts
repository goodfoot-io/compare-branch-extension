/**
 * Tests for the OpenCode card-mention nudge plugin (`chat.message`
 * parts-append) and the silent skill-load recorder (`tool.execute.after`).
 *
 * @summary Tests for the OpenCode core handlers
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUserPromptSubmitPlugin } from '../../../src/opencode/internal/core-handlers.js';
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
  tempDir = makeTempDir('core');
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
 * Builds a `chat.message` hook invocation pair.
 *
 * @param sessionId - Owning session id.
 * @param promptText - Text of the outgoing user message part.
 * @returns Input/output objects shaped like the hook invocation.
 */
function chatMessageCall(
  sessionId: string,
  promptText: string
): {
  input: { sessionID: string; messageID?: string };
  output: { message: { id: string }; parts: Array<{ id: string; type: string; text?: string; synthetic?: boolean }> };
} {
  return {
    input: { sessionID: sessionId },
    output: {
      message: { id: 'msg-1' },
      parts: [{ id: 'p-0', type: 'text', text: promptText }]
    }
  };
}

describe('CardsUserPromptSubmit (core)', () => {
  async function runNudge(prompt: string, sessionId = 'ses-root') {
    const { deps } = makeDeps(tempDir);
    const plugin = createUserPromptSubmitPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent(sessionId));
    const call = chatMessageCall(sessionId, prompt);
    await (hooks as { 'chat.message'?: (i: unknown, o: unknown) => Promise<void> })['chat.message']?.(
      call.input,
      call.output
    );
    return call.output.parts;
  }

  it('appends a synthetic cards-extension nudge part when a card term is detected', async () => {
    const parts = await runNudge('please look into this card tracking issue');
    expect(parts).toHaveLength(2);
    const nudge = parts[1] as { id: string; type: string; text?: string; synthetic?: boolean };
    expect(nudge).toMatchObject({ type: 'text', synthetic: true });
    expect(nudge?.text).toContain('<cards-extension>');
    expect(nudge?.text).toContain('Load the `cards:cards` skill.');
    expect(nudge?.text).toContain('</cards-extension>');
  });

  it('does not nudge prompts without card signals', async () => {
    const parts = await runNudge('fix the login button styling');
    expect(parts).toHaveLength(1);
  });

  it('does not nudge child sessions', async () => {
    const { deps } = makeDeps(tempDir);
    const plugin = createUserPromptSubmitPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-root'));
    // A child session of that root, as OpenCode reports subagents.
    await hooks.event?.(sessionCreatedEvent('ses-child', { parentID: 'ses-root' }));
    const call = chatMessageCall('ses-child', 'please look into this card');
    await (hooks as { 'chat.message'?: (i: unknown, o: unknown) => Promise<void> })['chat.message']?.(
      call.input,
      call.output
    );
    expect(call.output.parts).toHaveLength(1);
  });

  it('short-circuits when the skill-load marker exists', async () => {
    const { deps } = makeDeps(tempDir);
    deps.markers.markSkillLoaded('ses-root', 'cards:cards');
    const plugin = createUserPromptSubmitPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-root'));
    const call = chatMessageCall('ses-root', 'another card mention');
    await (hooks as { 'chat.message'?: (i: unknown, o: unknown) => Promise<void> })['chat.message']?.(
      call.input,
      call.output
    );
    expect(call.output.parts).toHaveLength(1);
  });

  it('suppresses the nudge when CARD_ID already matches a confirmed card', async () => {
    process.env['CARD_ID'] = 'main-453';
    try {
      // main-453's repo exists via makeCardRepo in beforeEach.
      const parts = await runNudge('continue with main-453 card');
      expect(parts).toHaveLength(1);
    } finally {
      delete process.env['CARD_ID'];
    }
  });

  it('fails open when detection throws', async () => {
    const { deps } = makeDeps(tempDir, {
      markers: {
        hasSkillLoaded: () => {
          throw new Error('boom');
        },
        markSkillLoaded: () => undefined,
        hasRouteNudgeFired: () => false,
        markRouteNudgeFired: () => undefined,
        hasExitWhenDoneFired: () => false,
        markExitWhenDoneFired: () => undefined,
        addActiveSubagent: async () => undefined,
        removeActiveSubagent: async () => undefined
      }
    });
    const plugin = createUserPromptSubmitPlugin(deps);
    const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
    await hooks.event?.(sessionCreatedEvent('ses-root'));
    const call = chatMessageCall('ses-root', 'card mention');
    await (hooks as { 'chat.message'?: (i: unknown, o: unknown) => Promise<void> })['chat.message']?.(
      call.input,
      call.output
    );
    expect(call.output.parts).toHaveLength(1);
    expect(stderrWrites.join('')).toContain('chat.message card nudge failed (fail-open)');
  });
});
