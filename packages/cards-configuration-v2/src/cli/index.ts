#!/usr/bin/env node

/**
 * CLI main entry point for Cards Configuration v2.
 *
 * This module orchestrates the build process:
 * 1. Parses command-line arguments
 * 2. Loads the configuration file
 * 3. Serializes settings to JSON format
 * 4. Writes settings.json to the specified directory
 *
 * ## Handler Compilation
 *
 * Unlike v1, the v2 CLI does not compile handler files. In v2, handlers are
 * imported directly in settings.config.ts, so they should be pre-compiled
 * or bundled as part of your build pipeline (e.g., using tsc, esbuild, etc.).
 *
 * The CLI's responsibility is only to generate settings.json from the config
 * file. This simplifies the CLI and gives you full control over how handlers
 * are built and bundled.
 *
 * @module cli/index
 *
 * @example
 * ```typescript
 * import { build } from '@cards/configuration-v2/cli';
 *
 * const result = await build({
 *   config: './settings.config.ts',
 *   outdir: './dist'
 * });
 *
 * if (result.success) {
 *   console.log('Build successful!');
 *   console.log('Settings:', result.settingsPath);
 * } else {
 *   console.error('Build failed:', result.error);
 * }
 * ```
 */

import type { Settings } from '../schema.js';
import type { BuildArgs } from './args.js';

/**
 * Successful build result.
 */
export interface BuildSuccess {
  /**
   * Indicates the build succeeded.
   */
  success: true;

  /**
   * Path to the written settings.json file.
   */
  settingsPath: string;

  /**
   * Paths to all compiled handler files.
   *
   * Note: In v2, handler compilation is not performed by the CLI.
   * This array is always empty. Handlers should be pre-compiled as
   * part of your build pipeline before running the CLI.
   *
   * @deprecated This field exists for backwards compatibility but is
   * not used in v2. Will be removed in v3.
   */
  compiledHandlers: string[];
}

/**
 * Failed build result.
 */
export interface BuildFailure {
  /**
   * Indicates the build failed.
   */
  success: false;

  /**
   * Human-readable error message describing why the build failed.
   */
  error: string;
}

/**
 * Result of a build operation.
 *
 * This is a discriminated union that can be checked using the `success`
 * property to determine if the build succeeded or failed.
 */
export type BuildResult = BuildSuccess | BuildFailure;

/**
 * Execute a build from the provided configuration.
 *
 * This function orchestrates the entire build process:
 * 1. Loads and validates the configuration file
 * 2. Serializes the configuration to settings.json format
 * 3. Writes settings.json to the output directory
 *
 * The output directory structure:
 * ```
 * outdir/
 * └── settings.json       # Serialized settings
 * ```
 *
 * ## Handler Compilation
 *
 * Unlike v1, the v2 CLI does NOT compile handler files. In v2:
 * - Handlers are imported directly in settings.config.ts
 * - The CLI only extracts metadata and generates settings.json
 * - Handler compilation should happen in your build pipeline (tsc, esbuild, etc.)
 *
 * This design keeps the CLI simple and focused on configuration serialization,
 * as per the v2 design goal of "no AST analysis needed" - handlers are just
 * plain imports.
 *
 * ## Error Handling
 *
 * Returns a BuildFailure result if:
 * - The configuration file doesn't exist or is invalid
 * - The configuration has structural errors (missing required fields)
 * - File system operations fail (permissions, disk space, etc.)
 *
 * @param args - Build arguments including config path and output directory
 * @returns A promise that resolves to a BuildResult indicating success or failure
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await build({
 *   config: './settings.config.ts',
 *   outdir: './dist'
 * });
 *
 * if (!result.success) {
 *   console.error(result.error);
 *   process.exit(1);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Full build pipeline with handler compilation
 * import { build as buildHandlers } from 'esbuild';
 * import { build as buildSettings } from '@cards/configuration-v2/cli';
 *
 * // First: compile handlers
 * await buildHandlers({
 *   entryPoints: ['./actions/*.ts'],
 *   outdir: './dist/bin',
 *   format: 'esm'
 * });
 *
 * // Then: generate settings.json
 * await buildSettings({
 *   config: './settings.config.ts',
 *   outdir: './dist'
 * });
 * ```
 */
export async function build(args: BuildArgs): Promise<BuildResult> {
  try {
    // 1. Load configuration file
    const { loadConfig } = await import('./config-loader.js');
    const loadResult = await loadConfig(args.config);

    if (!loadResult.success) {
      return {
        success: false,
        error: loadResult.error
      };
    }

    const { config } = loadResult;

    // 2. Serialize settings to JSON format
    const { serializeSettings } = await import('../define-config.js');
    let settings: Settings;
    try {
      settings = serializeSettings(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to serialize settings: ${errorMessage}`
      };
    }

    // 3. Create output directory if it doesn't exist
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const { join } = await import('node:path');

    try {
      mkdirSync(args.outdir, { recursive: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to create output directory: ${errorMessage}`
      };
    }

    // 4. Write settings.json
    const settingsPath = join(args.outdir, 'settings.json');
    try {
      const settingsJson = JSON.stringify(settings, null, 2);
      writeFileSync(settingsPath, settingsJson, 'utf-8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to write settings.json: ${errorMessage}`
      };
    }

    // 5. Handler compilation is intentionally NOT performed by the CLI in v2.
    //
    // Design rationale:
    // - In v2, handlers are imported directly in settings.config.ts (not discovered via AST)
    // - The CLI's job is to serialize the config to settings.json
    // - Handler compilation should be part of the user's build pipeline (tsc, esbuild, etc.)
    // - This keeps the CLI simple and focused, as per v2 design goals
    //
    // Users should compile handlers separately before or after running this CLI.
    // See the build() function documentation for an example build pipeline.
    const compiledHandlers: string[] = [];

    return {
      success: true,
      settingsPath,
      compiledHandlers
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Build failed: ${errorMessage}`
    };
  }
}

/**
 * CLI entry point.
 *
 * Parses command-line arguments from process.argv and executes the build.
 * Exits with code 0 on success, code 1 on error.
 *
 * This function is designed to be called from the CLI script defined in
 * package.json bin field.
 *
 * @example
 * ```bash
 * # From command line
 * cards-configuration-v2 build -c settings.config.ts -o dist/
 * cards-configuration-v2 build --config settings.config.ts --outdir dist/ --log build.log
 * ```
 */
export async function main(): Promise<void> {
  // Parse command-line arguments
  const { parseArgs } = await import('./args.js');
  const parseResult = parseArgs(process.argv.slice(2));

  if (!parseResult.success) {
    console.error('Error:', parseResult.error);
    console.error('\nUsage: cards-configuration-v2 build -c <config> -o <outdir> [--log <logfile>]');
    process.exit(1);
  }

  // Execute build
  const buildResult = await build(parseResult.args);

  if (!buildResult.success) {
    console.error('Build failed:', buildResult.error);
    process.exit(1);
  }

  // Report success
  console.log('Build successful!');
  console.log('Settings written to:', buildResult.settingsPath);
  if (buildResult.compiledHandlers.length > 0) {
    console.log('Compiled handlers:', buildResult.compiledHandlers.length);
  }
  process.exit(0);
}
