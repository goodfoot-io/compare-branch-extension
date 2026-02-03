/**
 * Shared constants for CLI discovery and action scaffolding.
 *
 * The CLI's AST analyzer and the scaffold generator both rely on the same
 * factory-name vocabulary, so this module is the single source of truth.
 * @module
 */

import type { HookEventName } from './types.js';

// ============================================================================
// Action Factory Types
// ============================================================================

/**
 * Action factory types recognized by the CLI.
 */
export type ActionFactoryType = 'actionStart' | 'actionEnd';

/**
 * Type factory types recognized by the CLI.
 */
export type TypeFactoryType = 'typeValidator' | 'typeCreate' | 'typeUpdate' | 'typeDelete';

/**
 * All factory types for AST analysis.
 */
export type FactoryType = ActionFactoryType | TypeFactoryType;

/**
 * Action factory names recognized by the CLI.
 */
export const ACTION_FACTORY_NAMES = ['actionStart', 'actionEnd'] as const;

/**
 * Type factory names recognized by the CLI.
 */
export const TYPE_FACTORY_NAMES = ['typeValidator', 'typeCreate', 'typeUpdate', 'typeDelete'] as const;

/**
 * All factory names for AST analysis.
 */
export const ALL_FACTORY_NAMES = [...ACTION_FACTORY_NAMES, ...TYPE_FACTORY_NAMES] as const;

// ============================================================================
// Deprecated Hook Factory Mapping
// ============================================================================

/**
 * Hook factory names recognized by the CLI and scaffolder.
 *
 * @deprecated Use ACTION_FACTORY_NAMES and TYPE_FACTORY_NAMES instead.
 * This mapping is kept for backward compatibility during migration.
 */
export const HOOK_FACTORY_TO_EVENT: Record<string, HookEventName> = {
  startCardHook: 'StartCard',
  endCardHook: 'EndCard',
  startInterviewHook: 'StartInterview',
  endInterviewHook: 'EndInterview'
};
