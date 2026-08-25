/**
 * Tests for the OpenCode silent skill-load recorder (`tool.execute.after`).
 *
 * @summary Tests for the OpenCode post-tool-use-skill handler
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPostToolUseSkillPlugin } from '../../../src/opencode/internal/core-handlers.js';
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
  tempDir = makeTempDir('skill');
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
 * Builds and drives one plugin instance with a single tool event.
 *
 * @param tool - Tool name reported in the hook input.
 * @param args - Tool arguments object handed to the hook.
 * @param sessionId - Session the tool call belongs to.
 * @param parentID - When set, the session registers as a child of this root.
 * @returns The in-memory marker store the plugin recorded into.
 */
async function runTool(tool: string, args: unknown, sessionId = 'ses-root', parentID?: string) {
  const { deps, recorders } = makeDeps(tempDir);
  const plugin = createPostToolUseSkillPlugin(deps);
  const hooks = await plugin(makePluginInput(tempDir, makeClient(logEntries)));
  if (parentID) {
    await hooks.event?.(sessionCreatedEvent('ses-root'));
    await hooks.event?.(sessionCreatedEvent(sessionId, { parentID }));
  }
  const input = { tool, sessionID: sessionId, callID: 'call-1', args };
  await (hooks as { 'tool.execute.after'?: (i: unknown, o: unknown) => Promise<void> })['tool.execute.after']?.(
    input,
    {}
  );
  return recorders.markers;
}

describe('CardsPostToolUseSkill (core)', () => {
  it.each([
    ['skill', { skill: 'cards' }],
    ['Skill', { skill: 'cards:cards' }],
    ['skill', { skill: 'cards:cards-create' }]
  ])('records the marker when %s loads %j', async (tool, args) => {
    const markers = await runTool(tool, args);
    expect(markers.skills.has('ses-root::cards:cards')).toBe(true);
  });

  it('logs the recorded load', async () => {
    await runTool('skill', { skill: 'cards' });
    expect(
      logEntries.some((entry) => entry.level === 'info' && entry.message.includes('Recorded cards skill load'))
    ).toBe(true);
  });

  it('ignores non-skill tools and unrelated skills', async () => {
    let markers = await runTool('bash', { command: 'ls' });
    markers = await runTool('skill', { skill: 'some-other-skill' }, 'ses-root');
    expect(markers.skills.size).toBe(0);
  });

  it('records the marker for a resumed session with no prior created event (I5 correction)', async () => {
    // Resumed sessions never re-emit session.created — rule (b) classifies
    // from the tool event itself.
    const markers = await runTool('skill', { skill: 'cards' }, 'ses-resumed');
    expect(markers.skills.has('ses-resumed::cards:cards')).toBe(true);
  });

  it('skips child sessions entirely', async () => {
    const markers = await runTool('skill', { skill: 'cards' }, 'ses-child', 'ses-root');
    expect(markers.skills.size).toBe(0);
  });

  it('tolerates malformed tool args without recording anything', async () => {
    const markers = await runTool('skill', { nonsense: true });
    expect(markers.skills.size).toBe(0);
    expect(stderrWrites.join('')).not.toContain('failed');
  });
});
