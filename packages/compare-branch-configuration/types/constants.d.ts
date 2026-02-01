/**
 * Shared constants for the CLI and scaffold modules.
 * @module
 */
import type { HookEventName } from './types.js';
/**
 * Maps hook factory function names to their event names.
 *
 * Used by the CLI to analyze TypeScript AST and determine which
 * hook type a file exports.
 */
export declare const HOOK_FACTORY_TO_EVENT: Record<string, HookEventName>;
//# sourceMappingURL=constants.d.ts.map