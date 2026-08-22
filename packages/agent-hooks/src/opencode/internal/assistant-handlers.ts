/**
 * Factory for the OpenCode `cards-assistant` plugin handler.
 *
 * Announces the assistant's capabilities once at session start. The Codex
 * sibling delivers the announcement through SessionStart's `systemMessage`
 * exactly once per startup; OpenCode has no such channel, so this plugin
 * appends the menu as an `experimental.chat.system.transform` fragment on the
 * root session's **first** transform call — the closest surface analog, and
 * the same mutate-in-place trigger site the context injection spike verified.
 *
 * @summary Factory implementation for the OpenCode cards-assistant handler
 * @module internal/assistant-handlers
 */

import type { Plugin } from '@opencode-ai/plugin';
import { createOpencodeLog, type OpencodeLog } from '../hook-log.js';
import { createRootSessionRegistry } from '../opencode-state.js';
import { defaultOpencodeHandlerDeps, type OpencodeHandlerDeps } from './deps.js';

/** Capability menu shown once at session start (Codex parity). */
export const ASSISTANT_ANNOUNCEMENT = `I can help you:
- create or update a card
- start work on an existing card
- use the extension
- send feedback or file a bug report`;

/**
 * Builds the bundle-wide logger for a plugin factory.
 *
 * @param directory - Session working directory supplied at plugin init.
 * @param deps - Handler dependencies supplying the IO seam.
 * @param client - Live SDK client, or `null`.
 * @returns The structured logger.
 */
function buildLogger(
  directory: string,
  deps: OpencodeHandlerDeps,
  client: Parameters<Plugin>[0]['client']
): OpencodeLog {
  return createOpencodeLog({ client, cwd: directory, io: deps.io });
}

/**
 * Creates the assistant announcement plugin.
 *
 * The menu is injected once per root session. A resumed OpenCode session is a
 * new process with no memory of the prior announcement, so it announces once
 * again — a named limitation of the first-transform delivery model.
 *
 * @param deps - Injectable edges; defaults wire the real SDK.
 * @returns An OpenCode plugin registering `event` (registry feed) and
 *   `experimental.chat.system.transform` hooks.
 */
export function createAssistantSessionStartPlugin(deps: OpencodeHandlerDeps = defaultOpencodeHandlerDeps()): Plugin {
  const registry = createRootSessionRegistry();
  /** Root sessions that have already received the announcement. */
  const announced = new Set<string>();

  return async ({ client, directory }) => {
    const log = buildLogger(directory, deps, client);

    return {
      event: async ({ event }) => {
        try {
          if (event.type === 'session.created') {
            registry.observe({ id: event.properties.info.id, parentID: event.properties.info.parentID });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          process.stderr.write(
            `[opencode-cards-hooks] warn: assistant registry event failed (fail-open): ${message}\n`
          );
        }
      },

      'experimental.chat.system.transform': async (input, output) => {
        try {
          if (!input.sessionID) {
            // Verified platform behavior: transform input carries an optional
            // session id — skip with a named warning rather than guessing.
            await log.warn('assistant system.transform fired without a sessionID; announcement skipped');
            return;
          }
          // Resumed sessions never re-emit `created`; their first transform
          // classifies them as roots under registry rule (b).
          registry.noteObserved(input.sessionID);
          if (!registry.isRoot(input.sessionID) || announced.has(input.sessionID)) {
            return;
          }
          announced.add(input.sessionID);
          output.system.push(ASSISTANT_ANNOUNCEMENT);
          // Observability parity: one anchored log line proves the menu was
          // injected (the system fragment itself is invisible in server logs).
          await log.info('Assistant capability menu injected', { sessionId: input.sessionID });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await log.warn(`assistant announcement failed (fail-open): ${message}`);
        }
      }
    };
  };
}
