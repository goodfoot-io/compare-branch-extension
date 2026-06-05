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

/** A single hook handler. Only synchronous `command` handlers are trust-seedable. */
export interface HookHandler {
  /** Handler kind; non-`command` handlers (`prompt`/`agent`) are skipped. */
  type: string;
  /** Raw command string (`${PLUGIN_ROOT}` left literal) for `command` handlers. */
  command?: string;
  /**
   * Windows-specific command override. On a `win32` host Codex hashes this in
   * place of {@link command} (when present); on every other host it is ignored
   * and never appears in the hashed identity.
   */
  commandWindows?: string;
  /**
   * Declared timeout in seconds. Codex normalizes an unset/zero timeout to its
   * `Math.max(1, timeout ?? 600)` default before hashing.
   */
  timeout?: number;
  /**
   * Status message Codex surfaces while the hook runs. Included in the hashed
   * identity only when declared (None-omitted otherwise).
   */
  statusMessage?: string;
  /**
   * Whether the handler runs asynchronously. Codex does not yet support async
   * hooks: it skips them at discovery (never trusts or runs them), so an
   * `async: true` handler is skipped here and seeds no trust entry — while still
   * consuming its positional handler index.
   */
  async?: boolean;
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
 * The complete set of command-handler keys the trust hash models. `type` selects
 * the handler kind; the rest are exactly the fields {@link selectHashedCommand}
 * (`command`, `commandWindows`) and {@link commandHookHash} (`timeout`,
 * `statusMessage`) consume, plus `async` (which gates whether a handler is
 * seeded). A command handler carrying any key outside this set would be seeded
 * with a hash that silently omits the unmodeled field — so {@link
 * buildPluginHooksState} fails closed on it. When a new Codex hook field is added
 * to the hash, add it here in the same change.
 */
const MODELED_COMMAND_HANDLER_KEYS = new Set<string>([
  'type',
  'command',
  'commandWindows',
  'timeout',
  'statusMessage',
  'async'
]);

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
 * The normalized command-handler fields that feed Codex's hashed hook identity,
 * after Codex's discovery-time normalization (commandWindows selected away,
 * timeout defaulted, statusMessage preserved when present).
 */
export interface NormalizedCommandHandler {
  /**
   * The command Codex hashes, already platform-selected: `commandWindows ??
   * command` on a `win32` host, the plain `command` everywhere else.
   */
  command: string;
  /** The declared timeout in seconds, or `undefined` to take Codex's default. */
  timeout?: number;
  /** The status message, included in the identity only when present. */
  statusMessage?: string;
}

/**
 * Selects the command Codex hashes for a handler on the current host. Codex
 * substitutes `command_windows.unwrap_or(command)` only under `cfg!(windows)`
 * (discovery.rs#L463-467); the launcher generates the profile on the same host
 * that runs `codex`, so the host platform is the authoritative selector.
 *
 * @param handler - The declared handler.
 * @param platform - The host platform (defaults to `process.platform`).
 * @returns The command string Codex will fold into the hashed identity.
 * @throws {Error} When the selected command is absent for the host platform.
 */
export function selectHashedCommand(
  handler: Pick<HookHandler, 'command' | 'commandWindows'>,
  platform: NodeJS.Platform = process.platform
): string {
  const command = platform === 'win32' ? (handler.commandWindows ?? handler.command) : handler.command;
  if (command === undefined) {
    throw new Error('Command hook missing "command"');
  }
  return command;
}

/**
 * Computes the trusted hash Codex stores for a single command hook handler.
 *
 * Reproduces Codex's `command_hook_hash` pipeline exactly (discovery.rs): build
 * the normalized identity object, recursively sort every object's keys,
 * serialize compact, and SHA-256 the UTF-8 bytes. The `matcher` field is
 * included only when non-null. `async` is always the literal `false` — async
 * handlers are skipped upstream and never reach this function. `timeout`
 * normalizes to `Math.max(1, timeout ?? 600)` (discovery.rs#L482). `statusMessage`
 * is preserved in the identity only when present (None-omitted otherwise,
 * discovery.rs#L488). `commandWindows` is always dropped from the normalized
 * identity (discovery.rs#L485) — the host-platform selection happens before
 * hashing, in {@link selectHashedCommand}.
 *
 * @param eventLabel - The snake_case event label (e.g. `session_start`).
 * @param matcher - The normalized matcher, or `null` when the event/group has none.
 * @param handler - The platform-selected command, timeout, and optional status message.
 * @returns The `sha256:<lowercase-hex>` trusted hash.
 */
export function commandHookHash(eventLabel: string, matcher: string | null, handler: NormalizedCommandHandler): string {
  const normalized: Record<string, unknown> = {
    type: 'command',
    command: handler.command,
    async: false,
    timeout: Math.max(1, handler.timeout ?? 600)
  };
  if (handler.statusMessage !== undefined) {
    normalized['statusMessage'] = handler.statusMessage;
  }

  const identity: Record<string, unknown> = {
    event_name: eventLabel,
    hooks: [normalized]
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
 * `agent`) and `async: true` command handlers are skipped — the former are not
 * trust-seedable, the latter Codex never trusts or runs (it skips them at
 * discovery, discovery.rs#L468) — but neither shifts the positional handler
 * indices of surrounding command handlers, mirroring Codex's `enumerate`. Each
 * seeded handler's declared `timeout`, `statusMessage`, and (on a `win32` host)
 * `commandWindows` flow into the hashed identity. The matcher is forced to
 * `null` for `UserPromptSubmit` and `Stop`; every other event uses the group's
 * declared matcher (or `null` when absent).
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
        // Non-command handlers (`prompt` / `agent`) are not trust-seedable and
        // carry no hashed fields, so they are skipped without validation. Every
        // `command`-type handler — including async ones skipped before seeding —
        // is checked for unmodeled fields first: a field the hash does not model
        // would otherwise be silently mis-hashed. The positional index advances
        // over skipped handlers regardless, mirroring Codex's `enumerate`.
        if (handler.type !== 'command') {
          return;
        }

        assertHandlerFieldsModeled(handler, pluginId, sourceRelativePath, event, gi, hi);

        if (handler.async === true) {
          return;
        }

        let command: string;
        try {
          command = selectHashedCommand(handler);
        } catch {
          throw new Error(`Command hook missing "command" at ${event}:${gi}:${hi}`);
        }

        const key = `${pluginId}:${sourceRelativePath}:${label}:${gi}:${hi}`;
        state[key] = {
          trusted_hash: commandHookHash(label, matcher, {
            command,
            timeout: handler.timeout,
            statusMessage: handler.statusMessage
          })
        };
      });
    });
  }

  return state;
}

/**
 * Fails closed when a `command`-type handler carries any own-enumerable key the
 * trust hash does not model ({@link MODELED_COMMAND_HANDLER_KEYS}). Such a field
 * would be silently dropped from the hashed identity, seeding a valid-but-wrong
 * `trusted_hash` — that one hook would quietly fall back to Untrusted at the
 * user's next session start. Aborting the launch loudly is the fail-closed
 * choice: a future Codex hook field must be modeled in the hash before it can be
 * trusted, not seeded blind.
 *
 * @param handler - The command handler being seeded.
 * @param pluginId - The plugin id (`<name>@<marketplace>`), for the message.
 * @param sourceRelativePath - The source-relative `hooks.json` path, for the message.
 * @param event - The PascalCase event key, for the positional location.
 * @param gi - The group index, for the positional location.
 * @param hi - The handler index, for the positional location.
 * @throws {Error} When the handler has any key outside the modeled set.
 */
function assertHandlerFieldsModeled(
  handler: HookHandler,
  pluginId: string,
  sourceRelativePath: string,
  event: string,
  gi: number,
  hi: number
): void {
  const unmodeled = Object.keys(handler).filter((key) => !MODELED_COMMAND_HANDLER_KEYS.has(key));
  if (unmodeled.length === 0) {
    return;
  }

  const keyList = unmodeled.map((key) => `"${key}"`).join(', ');
  throw new Error(
    `Unmodeled Codex hook field(s) ${keyList} on command handler ${event}:${gi}:${hi} ` +
      `in ${pluginId} (${sourceRelativePath}): this field is not modeled by the trust hash, ` +
      `so the launch is aborted to avoid silently seeding an incorrect trust hash.`
  );
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
