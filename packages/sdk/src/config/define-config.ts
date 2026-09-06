/**
 * Configuration utilities for Cards settings.
 *
 * This module provides `defineConfig()`, an IDE intellisense helper
 * (identity function) for authoring `settings.config.ts` files.
 *
 * @summary Configuration utilities for Cards settings
 * @module define-config
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@cards.management/sdk/config';
 * import { defineAction } from '@cards.management/sdk/config/factories';
 *
 * const launch = defineAction({ actionName: 'Launch' }, async () => {});
 *
 * export default defineConfig({
 *   environments: {
 *     default: {
 *       version: 1,
 *       actions: [launch]
 *     }
 *   }
 * });
 * ```
 */

import type { SettingsConfig } from './config.js';

/**
 * Converts a string to a URL-safe slug.
 *
 * @param name - The string to slugify
 * @returns A lowercase string with non-alphanumeric characters replaced by hyphens
 *
 * @internal
 */
/**
 * Helper function for IDE intellisense in settings.config.ts files.
 *
 * This is an identity function that returns the config object unchanged.
 * Its purpose is to provide TypeScript type checking and autocomplete in
 * user configuration files.
 *
 * @param config - The settings configuration object
 * @returns The same config object (identity function)
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@cards.management/sdk/config';
 *
 * export default defineConfig({
 *   environments: {
 *     default: {
 *       version: 1,
 *       actions: []
 *     }
 *   }
 * });
 * ```
 */
export function defineConfig(config: SettingsConfig): SettingsConfig {
  return config;
}
