/**
 * Configuration file loader for settings.config.ts files.
 *
 * Loads and validates TypeScript configuration files using jiti for runtime
 * TypeScript execution. Validates that the loaded module exports a valid
 * SettingsConfig with the required 'environments' property.
 *
 * @module
 *
 * @example
 * ```typescript
 * const result = await loadConfig('./settings.config.ts');
 * if (result.success) {
 *   console.log('Loaded config from:', result.configPath);
 *   console.log('Environments:', Object.keys(result.config.environments));
 * } else {
 *   console.error('Failed to load config:', result.error);
 * }
 * ```
 */

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SettingsConfig } from '../config.js';

// Use createRequire to import jiti, which is more reliable in nested jiti contexts
const require = createRequire(import.meta.url);
const createJiti = require('jiti') as JitiFunction;

/**
 * JITI function type for creating a module loader.
 */
type JitiFunction = (
  filename: string,
  opts?: {
    interopDefault?: boolean;
    requireCache?: boolean;
    cache?: boolean | string;
    esmResolve?: boolean;
  }
) => {
  import: (id: string, importOptions: Record<string, unknown>) => Promise<unknown>;
};

/**
 * Successful configuration load result.
 */
export interface LoadSuccess {
  /**
   * Indicates successful load.
   */
  success: true;

  /**
   * The loaded and validated configuration.
   */
  config: SettingsConfig;

  /**
   * Absolute path to the loaded configuration file.
   */
  configPath: string;
}

/**
 * Failed configuration load result.
 */
export interface LoadFailure {
  /**
   * Indicates failed load.
   */
  success: false;

  /**
   * Human-readable error message describing why the load failed.
   */
  error: string;
}

/**
 * Result of loading a configuration file.
 *
 * This is a discriminated union that can be checked using the `success`
 * property to determine if the load succeeded or failed.
 */
export type LoadResult = LoadSuccess | LoadFailure;

/**
 * Load and validate a settings configuration file.
 *
 * Loads a TypeScript or JavaScript configuration file using jiti for runtime
 * TypeScript execution. The file must have a default export containing a
 * valid SettingsConfig object with an 'environments' property.
 *
 * @param configPath - Path to the configuration file (relative or absolute)
 * @returns Promise resolving to a LoadResult indicating success or failure
 *
 * @example
 * ```typescript
 * // Load from relative path
 * const result = await loadConfig('./settings.config.ts');
 *
 * if (result.success) {
 *   console.log('Config loaded from:', result.configPath);
 *   const environments = Object.keys(result.config.environments);
 *   console.log('Available environments:', environments);
 * } else {
 *   console.error('Failed to load:', result.error);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Handle different error cases
 * const result = await loadConfig('/path/to/config.ts');
 *
 * if (!result.success) {
 *   if (result.error.includes('does not exist')) {
 *     console.error('Config file not found');
 *   } else if (result.error.includes('no default export')) {
 *     console.error('Config must export default');
 *   } else if (result.error.includes('invalid structure')) {
 *     console.error('Config missing environments');
 *   }
 * }
 * ```
 */
export async function loadConfig(configPath: string): Promise<LoadResult> {
  // Resolve to absolute path
  const absolutePath = resolve(configPath);

  // Check if file exists
  if (!existsSync(absolutePath)) {
    return {
      success: false,
      error: `Configuration file does not exist: ${absolutePath}`
    };
  }

  try {
    // Get the current file path for jiti
    // In ESM, we need to convert import.meta.url to a file path
    const currentFile = fileURLToPath(import.meta.url);

    // Create jiti instance for TypeScript execution
    const jiti = createJiti(currentFile, {
      interopDefault: true,
      requireCache: false
    });

    // Import the configuration file
    const module = (await jiti.import(absolutePath, {})) as unknown;

    // Check for default export
    if (!module || typeof module !== 'object') {
      return {
        success: false,
        error: `Configuration file has no default export: ${absolutePath}`
      };
    }

    const maybeConfig = module as Record<string, unknown>;

    // Validate basic structure (must have environments property)
    if (!maybeConfig.environments || typeof maybeConfig.environments !== 'object') {
      return {
        success: false,
        error: `Configuration has invalid structure: missing 'environments' property in ${absolutePath}`
      };
    }

    // Return successful result
    return {
      success: true,
      config: maybeConfig as unknown as SettingsConfig,
      configPath: absolutePath
    };
  } catch (error) {
    // Handle import errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to load configuration file: ${errorMessage}`
    };
  }
}
