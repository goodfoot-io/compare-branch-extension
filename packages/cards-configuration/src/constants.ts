/**
 * Shared constants that keep CLI hook discovery and scaffolding in sync.
 *
 * The CLI's AST analyzer and the scaffold generator both rely on the same
 * factory-name vocabulary, so this module is the single source of truth.
 * @module
 */

import type { HookEventName } from './types.js';

/**
 * Hook factory names recognized by the CLI and scaffolder.
 *
 * A hook file is only treated as a Cards hook if its default export calls
 * one of these factory names. Add new factory names here when introducing
 * new hook event types to keep discovery and scaffolding aligned.
 */
export const HOOK_FACTORY_TO_EVENT: Record<string, HookEventName> = {
  startCardHook: 'StartCard',
  endCardHook: 'EndCard',
  startInterviewHook: 'StartInterview',
  endInterviewHook: 'EndInterview'
};
