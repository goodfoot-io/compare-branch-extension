/**
 * Type utilities for building type-safe configuration APIs.
 *
 * These utilities help catch common mistakes at compile time, particularly
 * typos in configuration objects.
 *
 * @summary Type utilities for building type-safe configuration APIs
 */

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Ensures In has exactly the shape of Out with no extra properties.
 *
 * This is esbuild's pattern for catching typos at compile time. Any
 * property in In that is not in Out will map to `never`, causing a
 * type error when you try to pass an object with extra properties.
 *
 * The type works by:
 * 1. Requiring In to extend Out (must have all required properties)
 * 2. Intersecting In with an object where all excess keys map to `never`
 * 3. TypeScript rejects objects that have properties typed as `never`
 *
 * @template Out - The expected shape (interface/type)
 * @template In - The actual shape being checked (must extend Out)
 *
 * @example
 * ```typescript
 * interface Config {
 *   actionName: string;
 *   timeout?: number;
 * }
 *
 * // OK: Exact match
 * function define<T extends Config>(config: SameShape<Config, T>): void {}
 * define({ actionName: 'Launch' }); // Works
 * define({ actionName: 'Launch', timeout: 5000 }); // Works
 *
 * // Error: Typo detected
 * define({ actionNme: 'Launch' }); // Error: 'actionNme' does not exist
 * define({ actionName: 'Launch', extra: true }); // Error: 'extra' is never
 * ```
 *
 * @example
 * ```typescript
 * // Use in factory functions to catch typos
 * interface ActionConfig {
 *   id: string;
 *   label: string;
 *   command?: string;
 * }
 *
 * export function defineAction<T extends ActionConfig>(
 *   config: SameShape<ActionConfig, T>
 * ): ActionConfig {
 *   return config;
 * }
 *
 * // This works
 * defineAction({ id: 'launch', label: 'Launch Application' });
 *
 * // This catches the typo at compile time
 * defineAction({ id: 'launch', lable: 'Launch Application' }); // Error!
 * ```
 */
export type SameShape<Out, In extends Out> = In & {
  [Key in Exclude<keyof In, keyof Out>]: never;
};
