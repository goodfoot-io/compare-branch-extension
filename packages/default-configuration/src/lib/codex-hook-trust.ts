/**
 * Pure helpers that replicate the hook trust hash + key algorithm Codex uses to
 * decide whether a discovered plugin hook is already trusted.
 *
 * ### Why this exists
 * A Cards-launched Codex session bundles its own plugin hooks. By default Codex
 * shows a `/hooks` review interstitial and refuses to run an untrusted hook
 * unless the broad `--dangerously-bypass-hook-trust` flag is set. Instead of
 * that flag, the generated profile carries `[hooks.state."<key>"]` entries whose
 * `trusted_hash` exactly matches the `current_hash` Codex computes for each
 * bundled hook — so those hooks are reported as Trusted at discovery, scoped to
 * the installed bundle version, while every other hook keeps the normal review
 * flow.
 *
 * ### Mirrored algorithm (verified against Codex 0.137.0 by spike)
 * The trusted hash is the compact, recursively key-sorted JSON of a normalized
 * hook identity, SHA-256'd and prefixed `sha256:`. Codex builds the identity via
 * a `toml::Value` round-trip, which omits `Option::None` fields rather than
 * emitting `null`; an unset timeout normalizes to `600` and `async` is always a
 * plain bool. Reproducing those exact bytes needs no TOML library — only a plain
 * object with absent optionals dropped, keys sorted, and `JSON.stringify`.
 *
 * The `command` string is hashed RAW (with `${PLUGIN_ROOT}` left literal) — Codex
 * substitutes the install path only after hashing, so the hash is install-path
 * independent.
 *
 * All functions here are pure (no I/O). The caller reads `hooks.json` and merges
 * the returned trust entries into the generated profile.
 *
 * @summary Pure Codex hook trust hash + key helpers
 * @module lib/codex-hook-trust
 */

import { createHash } from 'node:crypto';

/**
 * The bundled `hooks.json` shape: a single `hooks` table keyed by PascalCase
 * event name, each holding an ordered list of matcher groups.
 */
export interface HooksJson {
  hooks?: Record<string, HookMatcherGroup[]>;
}

/** One matcher group within an event: an optional matcher plus ordered handlers. */
export interface HookMatcherGroup {
  /** Matcher pattern for the group, or absent for an unconditional group. */
  matcher?: string | null;
  /** Ordered handlers fired when the group matches. */
  hooks: HookHandler[];
}

/** A single hook handler. Only `command` handlers are trust-seedable. */
export interface HookHandler {
  /** Handler kind; non-`command` handlers (`prompt`/`agent`) are skipped. */
  type: string;
  /** Raw command string (`${PLUGIN_ROOT}` left literal) for `command` handlers. */
  command?: string;
}

/** A single trust entry as it appears under `[hooks.state."<key>"]`. */
export interface HookTrustEntry {
  /** The `sha256:<hex>` hash Codex must compute to consider the hook trusted. */
  trusted_hash: string;
}

/**
 * Fixed order in which Codex iterates events when assigning positional group and
 * handler indices to hook keys. The PascalCase `hooks.json` keys are visited in
 * this order regardless of their order in the source file.
 */
const HOOK_EVENT_ORDER = [
  'PreToolUse',
  'PermissionRequest',
  'PostToolUse',
  'PreCompact',
  'PostCompact',
  'SessionStart',
  'UserPromptSubmit',
  'SubagentStart',
  'SubagentStop',
  'Stop'
] as const;

/** Maps each PascalCase `hooks.json` event key to Codex's snake_case label. */
const HOOK_EVENT_KEY_LABELS: Record<string, string> = {
  PreToolUse: 'pre_tool_use',
  PermissionRequest: 'permission_request',
  PostToolUse: 'post_tool_use',
  PreCompact: 'pre_compact',
  PostCompact: 'post_compact',
  SessionStart: 'session_start',
  UserPromptSubmit: 'user_prompt_submit',
  SubagentStart: 'subagent_start',
  SubagentStop: 'subagent_stop',
  Stop: 'stop'
};

/** Events for which Codex forces the matcher to `None` before hashing. */
const MATCHER_FORCED_NULL_EVENTS = new Set(['UserPromptSubmit', 'Stop']);

/**
 * Maps a PascalCase `hooks.json` event key to the snake_case label Codex uses in
 * a hook key. Fails closed on an unknown key rather than guessing a label.
 *
 * @param jsonEventKey - The PascalCase event key (e.g. `SessionStart`).
 * @returns The snake_case label (e.g. `session_start`).
 * @throws {Error} When the key is not a recognized Codex hook event.
 */
export function hookEventKeyLabel(jsonEventKey: string): string {
  const label = HOOK_EVENT_KEY_LABELS[jsonEventKey];
  if (label === undefined) {
    throw new Error(`Unknown Codex hook event key: ${jsonEventKey}`);
  }
  return label;
}

/**
 * Computes the trusted hash Codex stores for a single command hook handler.
 *
 * Reproduces Codex's `command_hook_hash` pipeline exactly: build the normalized
 * identity object, recursively sort every object's keys, serialize compact, and
 * SHA-256 the UTF-8 bytes. The `matcher` field is included only when non-null,
 * `async` is always the literal `false`, and `timeout` is always `600` (Codex
 * normalizes an unset timeout to 600 for the bundled hooks). `commandWindows`
 * and `statusMessage` are `None` for bundled hooks and so are omitted.
 *
 * @param eventLabel - The snake_case event label (e.g. `session_start`).
 * @param matcher - The normalized matcher, or `null` when the event/group has none.
 * @param command - The raw command string (`${PLUGIN_ROOT}` left literal).
 * @returns The `sha256:<lowercase-hex>` trusted hash.
 */
export function commandHookHash(eventLabel: string, matcher: string | null, command: string): string {
  const identity: Record<string, unknown> = {
    event_name: eventLabel,
    hooks: [{ type: 'command', command, async: false, timeout: 600 }]
  };
  if (matcher !== null) {
    identity['matcher'] = matcher;
  }

  const canonical = JSON.stringify(sortKeysRecursive(identity));
  const hex = createHash('sha256').update(canonical, 'utf-8').digest('hex');
  return `sha256:${hex}`;
}

/**
 * Builds the `hooks.state` trust entries for one plugin's bundled `hooks.json`.
 *
 * Iterates events in {@link HOOK_EVENT_ORDER}, then each event's matcher groups
 * and each group's handlers positionally. Non-`command` handlers (`prompt` /
 * `agent`) are skipped (they are not trust-seedable) but do not shift the
 * positional handler indices of surrounding command handlers. The matcher is
 * forced to `null` for `UserPromptSubmit` and `Stop`; every other event uses the
 * group's declared matcher (or `null` when absent).
 *
 * @param pluginId - The plugin id (`<name>@<marketplace>`) for the key prefix.
 * @param sourceRelativePath - The source-relative path (`hooks/hooks.json`).
 * @param hooksJson - The parsed `hooks.json` object.
 * @returns A map of `<hook_key>` → `{ trusted_hash }` for every command handler.
 */
export function buildPluginHooksState(
  pluginId: string,
  sourceRelativePath: string,
  hooksJson: HooksJson
): Record<string, HookTrustEntry> {
  const state: Record<string, HookTrustEntry> = {};
  const events = hooksJson.hooks ?? {};

  for (const event of HOOK_EVENT_ORDER) {
    const groups = events[event];
    if (groups === undefined) {
      continue;
    }

    const label = hookEventKeyLabel(event);
    const forceNullMatcher = MATCHER_FORCED_NULL_EVENTS.has(event);

    groups.forEach((group, gi) => {
      const matcher = forceNullMatcher ? null : (group.matcher ?? null);

      group.hooks.forEach((handler, hi) => {
        if (handler.type !== 'command') {
          return;
        }
        if (handler.command === undefined) {
          throw new Error(`Command hook missing "command" at ${event}:${gi}:${hi}`);
        }

        const key = `${pluginId}:${sourceRelativePath}:${label}:${gi}:${hi}`;
        state[key] = { trusted_hash: commandHookHash(label, matcher, handler.command) };
      });
    });
  }

  return state;
}

/**
 * Recursively returns a copy of `value` with every object's keys sorted
 * alphabetically. Arrays keep their order; scalars are returned as-is. This
 * mirrors Codex's `canonical_json` so the serialized bytes match exactly.
 *
 * @param value - The value to canonicalize.
 * @returns A key-sorted copy of `value`.
 */
function sortKeysRecursive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysRecursive);
  }
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysRecursive((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}
