/**
 * Host-detected module contract shared by Cards OpenCode hook entries.
 *
 * @summary OpenCode plugin module-shape helper
 * @module opencode/internal/plugin-module
 */

import type { Plugin } from '@opencode-ai/plugin';

/** OpenCode's detected v1 module shape. */
export interface CardsOpencodePluginModule {
  /** Stable identifier used by the host for attribution. */
  id: string;
  /** Factory that constructs this module's hooks. */
  server: Plugin;
}

/**
 * Wraps a Cards hook factory in the module shape OpenCode detects before its
 * legacy scan of every named export.
 *
 * @param id - Stable lowercase module identifier.
 * @param server - Hook factory for this module.
 * @returns A host-detectable OpenCode plugin module.
 */
export function defineOpencodePluginModule(id: string, server: Plugin): CardsOpencodePluginModule {
  return { id, server };
}
