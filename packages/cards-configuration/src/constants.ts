/**
 * Shared constants for CLI discovery and action scaffolding.
 *
 * The CLI's AST analyzer and the scaffold generator both rely on the same
 * factory-name vocabulary, so this module is the single source of truth for
 * which factory function names are recognized and how they map to settings.json
 * structures.
 *
 * When adding a new factory type, update both the type definitions and the
 * corresponding constant arrays to maintain consistency.
 *
 * @module
 * @see {@link ALL_FACTORY_NAMES} for the complete list of recognized factories
 */

import type { HookEventName } from './types.js';

// ============================================================================
// Action Factory Types
// ============================================================================

/**
 * Factory types for card-level actions.
 *
 * These map to the settings.json `actions` array structure, where each action
 * has a `start` command and optional `end` command.
 */
export type ActionFactoryType = 'actionStart' | 'actionEnd';

/**
 * Factory types for typed file lifecycle hooks.
 *
 * These map to the settings.json `types` object structure, where each type
 * can have validator, create, update, and delete commands.
 */
export type TypeFactoryType = 'typeValidator' | 'typeCreate' | 'typeUpdate' | 'typeDelete';

/**
 * Union of all factory types recognized by the CLI.
 *
 * The CLI's AST analyzer looks for default exports that call one of these
 * factory functions and extracts metadata from the config argument.
 */
export type FactoryType = ActionFactoryType | TypeFactoryType;

/**
 * Action factory names as a readonly tuple.
 *
 * Used by the CLI for AST pattern matching. The values must exactly match
 * the exported function names from the actions module.
 */
export const ACTION_FACTORY_NAMES = ['actionStart', 'actionEnd'] as const;

/**
 * Type factory names as a readonly tuple.
 *
 * Used by the CLI for AST pattern matching. The values must exactly match
 * the exported function names from the actions module.
 */
export const TYPE_FACTORY_NAMES = ['typeValidator', 'typeCreate', 'typeUpdate', 'typeDelete'] as const;

/**
 * All recognized factory names for CLI AST analysis.
 *
 * The CLI scans TypeScript files for default exports that call one of these
 * functions. When found, it extracts the config object's properties as
 * metadata for settings.json generation.
 *
 * @example
 * ```typescript
 * // CLI uses this for pattern matching
 * if (ALL_FACTORY_NAMES.includes(calledFunctionName)) {
 *   // Extract metadata from the call expression
 * }
 * ```
 */
export const ALL_FACTORY_NAMES = [...ACTION_FACTORY_NAMES, ...TYPE_FACTORY_NAMES] as const;

// ============================================================================
// Deprecated Hook Factory Mapping
// ============================================================================

/**
 * Maps legacy hook factory names to their event names.
 *
 * This mapping exists for backward compatibility during migration from the
 * old hooks.json format to the new settings.json actions architecture. The
 * CLI recognizes these factory names and generates appropriate hooks.json
 * entries when encountered.
 *
 * New code should use {@link ACTION_FACTORY_NAMES} and {@link TYPE_FACTORY_NAMES}
 * instead. Legacy hooks will continue to work but are not recommended for new
 * development.
 *
 * @deprecated Use the new action factories (actionStart, actionEnd) instead.
 *   Migration path: replace `startCardHook` with `actionStart`,
 *   `endCardHook` with `actionEnd`, etc.
 *
 * @example
 * ```typescript
 * // Legacy (deprecated)
 * export default startCardHook({ timeout: 5000 }, handler);
 *
 * // New (recommended)
 * export default actionStart({ actionName: 'My Action', timeout: 5000 }, handler);
 * ```
 */
export const HOOK_FACTORY_TO_EVENT: Record<string, HookEventName> = {
  startCardHook: 'StartCard',
  endCardHook: 'EndCard',
  startInterviewHook: 'StartInterview',
  endInterviewHook: 'EndInterview'
};
