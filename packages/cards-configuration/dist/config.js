/**
 * Settings configuration types with compile-time action pairing validation.
 *
 * These types define the input format for `defineConfig()` - what users write
 * in their settings.config.ts files. The key innovation is `ActionPair<N>`
 * which enforces that start and end commands have matching action names at
 * compile time using generic constraints.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@cards/configuration';
 * import { defineActionStart, defineActionEnd } from '@cards/configuration/factories';
 *
 * const launchStart = defineActionStart({ actionName: 'Launch' }, async () => {});
 * const launchEnd = defineActionEnd({ actionName: 'Launch' }, async () => {});
 *
 * export default defineConfig({
 *   environments: {
 *     default: {
 *       version: 1,
 *       actions: [
 *         { start: launchStart, end: launchEnd } // Type-safe: names match
 *       ]
 *     }
 *   }
 * });
 * ```
 */
export {};
