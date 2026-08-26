/**
 * OpenCode must detect every Cards hook entry through its `{ id, server }`
 * default export before considering the legacy scan of named exports.
 *
 * @summary OpenCode plugin module-shape contract
 */

import { describe, expect, it } from 'vitest';
import assistantSessionStart from '../../src/opencode/assistant/session-start.js';
import postToolUseSkill from '../../src/opencode/core/post-tool-use-skill.js';
import userPromptSubmit from '../../src/opencode/core/user-prompt-submit.js';
import runtimeSessionStart from '../../src/opencode/runtime/session-start.js';
import sessionStartAfterCompaction from '../../src/opencode/runtime/session-start-after-compaction.js';
import stopExitWhenDone from '../../src/opencode/runtime/stop-exit-when-done.js';
import stopRouteNudge from '../../src/opencode/runtime/stop-route-nudge.js';
import subagentStart from '../../src/opencode/runtime/subagent-start.js';
import subagentStop from '../../src/opencode/runtime/subagent-stop.js';

const modules = [
  assistantSessionStart,
  postToolUseSkill,
  userPromptSubmit,
  sessionStartAfterCompaction,
  runtimeSessionStart,
  stopExitWhenDone,
  stopRouteNudge,
  subagentStart,
  subagentStop
];

describe('OpenCode plugin module shape', () => {
  it('gives every entry a unique stable id and server factory', () => {
    const ids = modules.map((module) => module.id);

    expect(new Set(ids).size).toBe(modules.length);
    for (const module of modules) {
      expect(module.id).toMatch(/^[a-z0-9-]+$/);
      expect(module.server).toBeTypeOf('function');
    }
  });
});
