/**
 * Locks the Codex hook trust hash + key algorithm against ground-truth fixtures
 * captured from Codex 0.137.0 (see the card's spike note). The runtime and
 * assistant bundle hashes are install-path independent, so a drift in the
 * serialization pipeline — key order, omitted optionals, the `async`/`timeout`
 * normalization, or the event-label mapping — surfaces here rather than as a
 * silent review prompt at launch.
 *
 * @summary Tests the Codex hook trust hash + key helpers
 */

import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildPluginHooksState,
  commandHookHash,
  type HooksJson,
  hookEventKeyLabel
} from '../src/lib/codex-hook-trust.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const codexRoot = path.resolve(here, '../../../codex');

/**
 * Reads and parses a bundled `hooks.json` from the repo's packaged Codex tree.
 *
 * @param relative - Path under `public/codex` (e.g. `runtime/hooks/hooks.json`).
 * @returns The parsed hooks object.
 */
function readBundleHooks(relative: string): HooksJson {
  return JSON.parse(readFileSync(path.join(codexRoot, relative), 'utf-8')) as HooksJson;
}

describe('codex-hook-trust', () => {
  it('hookEventKeyLabel maps every PascalCase event to its snake_case label', () => {
    expect(hookEventKeyLabel('PreToolUse')).toBe('pre_tool_use');
    expect(hookEventKeyLabel('PermissionRequest')).toBe('permission_request');
    expect(hookEventKeyLabel('PostToolUse')).toBe('post_tool_use');
    expect(hookEventKeyLabel('PreCompact')).toBe('pre_compact');
    expect(hookEventKeyLabel('PostCompact')).toBe('post_compact');
    expect(hookEventKeyLabel('SessionStart')).toBe('session_start');
    expect(hookEventKeyLabel('UserPromptSubmit')).toBe('user_prompt_submit');
    expect(hookEventKeyLabel('SubagentStart')).toBe('subagent_start');
    expect(hookEventKeyLabel('SubagentStop')).toBe('subagent_stop');
    expect(hookEventKeyLabel('Stop')).toBe('stop');
  });

  it('hookEventKeyLabel fails closed on an unknown event key', () => {
    expect(() => hookEventKeyLabel('Notification')).toThrow(/Unknown Codex hook event key/);
  });

  it('buildPluginHooksState reproduces the runtime bundle ground-truth keys + hashes', () => {
    const json = readBundleHooks('runtime/hooks/hooks.json');
    const state = buildPluginHooksState('runtime@local', 'hooks/hooks.json', json);

    expect(state).toEqual({
      'runtime@local:hooks/hooks.json:session_start:0:0': {
        trusted_hash: 'sha256:bd9f38f124866b8b62da60248953eaef2feecf1f9ec493dcd62fea72f4527f73'
      },
      'runtime@local:hooks/hooks.json:session_start:1:0': {
        trusted_hash: 'sha256:f3768ee10f2ba13e29d615d8ca9b9809a3fb45213d671ed4fbf22fabae7bf0b6'
      },
      'runtime@local:hooks/hooks.json:subagent_start:0:0': {
        trusted_hash: 'sha256:23736d1765dc7b9f8974956f352f99cd561eb98dc710cdb3fd1942fe1c8a66e7'
      },
      'runtime@local:hooks/hooks.json:subagent_stop:0:0': {
        trusted_hash: 'sha256:7f94d390a4a20896e8957bec354b720eb2a522f78a632f00c6a03f1f705c19b2'
      },
      'runtime@local:hooks/hooks.json:stop:0:0': {
        trusted_hash: 'sha256:ea8f27e5d8ecbdd2e1ed0677fa4037a85b5887719b8eb634892094a3413ea66a'
      }
    });
  });

  it('buildPluginHooksState reproduces the assistant bundle ground-truth key + hash', () => {
    const json = readBundleHooks('cards-assistant/hooks/hooks.json');
    const state = buildPluginHooksState('cards-assistant@local', 'hooks/hooks.json', json);

    expect(state).toEqual({
      'cards-assistant@local:hooks/hooks.json:session_start:0:0': {
        // Identical normalized command to runtime session_start:0:0 — same hash,
        // key differs only by plugin id.
        trusted_hash: 'sha256:bd9f38f124866b8b62da60248953eaef2feecf1f9ec493dcd62fea72f4527f73'
      }
    });
  });

  it('forces the matcher to null for Stop even when the group declares one', () => {
    // A synthetic Stop group WITH a matcher must hash as if it had none.
    const withMatcher: HooksJson = {
      hooks: {
        Stop: [{ matcher: 'ignored', hooks: [{ type: 'command', command: 'CMD' }] }]
      }
    };
    const state = buildPluginHooksState('p@local', 'hooks/hooks.json', withMatcher);
    const hash = state['p@local:hooks/hooks.json:stop:0:0']!.trusted_hash;

    // Equals the hash of a Stop hook with no matcher (matcher dropped from JSON).
    expect(hash).toBe(commandHookHash('stop', null, 'CMD'));
    // And differs from the would-be hash if the matcher had been kept.
    expect(hash).not.toBe(commandHookHash('stop', 'ignored', 'CMD'));
  });

  it('keeps a SessionStart matcher (compact) — matches the known compact hash', () => {
    const compact: HooksJson = {
      hooks: {
        SessionStart: [
          {
            matcher: 'compact',
            hooks: [
              {
                type: 'command',
                command:
                  '"$(cat $HOME/.cards/VSCODE_NODE 2>/dev/null || echo node)" "${PLUGIN_ROOT}/hooks/session-start-after-compaction.mjs"'
              }
            ]
          }
        ]
      }
    };
    const state = buildPluginHooksState('runtime@local', 'hooks/hooks.json', compact);

    expect(state['runtime@local:hooks/hooks.json:session_start:0:0']!.trusted_hash).toBe(
      'sha256:f3768ee10f2ba13e29d615d8ca9b9809a3fb45213d671ed4fbf22fabae7bf0b6'
    );
  });

  it('skips prompt/agent handlers while keeping positional indices', () => {
    const mixed: HooksJson = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: 'prompt', command: 'IGNORED-PROMPT' },
              { type: 'command', command: 'CMD-A' },
              { type: 'agent', command: 'IGNORED-AGENT' },
              { type: 'command', command: 'CMD-B' }
            ]
          }
        ]
      }
    };
    const state = buildPluginHooksState('p@local', 'hooks/hooks.json', mixed);

    // Only the two command handlers are seeded, at their original positions 1 and 3.
    expect(Object.keys(state)).toEqual([
      'p@local:hooks/hooks.json:session_start:0:1',
      'p@local:hooks/hooks.json:session_start:0:3'
    ]);
    expect(state['p@local:hooks/hooks.json:session_start:0:1']!.trusted_hash).toBe(
      commandHookHash('session_start', null, 'CMD-A')
    );
    expect(state['p@local:hooks/hooks.json:session_start:0:3']!.trusted_hash).toBe(
      commandHookHash('session_start', null, 'CMD-B')
    );
  });
});
