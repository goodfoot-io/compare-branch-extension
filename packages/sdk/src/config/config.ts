/**
 * Settings configuration types for defineConfig().
 *
 * These types define the input format for `defineConfig()` - what users write
 * in their settings.config.ts files.
 *
 *
 * @summary Settings configuration types for defineConfig()
 * @module
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@cards/sdk/config';
 * import { defineAction } from '@cards/sdk/config/factories';
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

import type { ActionCommand, TypeCreateCommand, TypeDeleteCommand, TypeUpdateCommand } from './command-types.js';

// ============================================================================
// Stream Configuration
// ============================================================================

/**
 * Stream definition for settings configuration.
 *
 * Defines an iframe-based renderer for a stream type. The `wwwRoot` directory
 * contains static assets (HTML, JS, CSS) that render stream content inside
 * an iframe in the extension UI.
 *
 * This is the input format for stream definitions in settings.config.ts files.
 *
 * @example
 * ```typescript
 * const claudeSession: StreamConfigDefinition = {
 *   version: 1,
 *   wwwRoot: './renderers/claude-session',
 *   entrypoint: 'index.html',
 *   maxLineLength: 1048576,
 *   maxStreamSize: 104857600
 * };
 * ```
 */
export interface StreamConfigDefinition {
  /**
   * Stream schema version.
   *
   * Identifies the version of the stream definition. Must be a positive integer.
   */
  version: number;

  /**
   * Path to the directory containing the iframe renderer's static assets.
   *
   * Resolved relative to the config file during the build.
   */
  wwwRoot: string;

  /**
   * Entry point HTML file within the wwwRoot directory.
   *
   * Defaults to `"index.html"` when omitted.
   */
  entrypoint?: string;

  /** Maximum bytes per line before truncation (default 1 MB). */
  maxLineLength?: number;

  /** Maximum cumulative bytes per stream file before auto-close (default 100 MB). */
  maxStreamSize?: number;
}

// ============================================================================
// Type Configuration
// ============================================================================

/**
 * Type definition with lifecycle hooks for settings configuration.
 *
 * Defines lifecycle handlers for a specific card type. Lifecycle hooks
 * (create, update, delete) run when typed files are created, modified,
 * or removed.
 *
 * This is the input format for type definitions in settings.config.ts files.
 * It uses direct imports of command objects created by factory functions.
 *
 * @example
 * ```typescript
 * const adaptiveCardType: TypeConfigDefinition = {
 *   version: '1.0.0',
 *   create: defineTypeCreate({ typeName: 'adaptive-card' }, createHandler),
 *   update: defineTypeUpdate({ typeName: 'adaptive-card' }, updateHandler),
 *   delete: defineTypeDelete({ typeName: 'adaptive-card' }, deleteHandler)
 * };
 * ```
 */
export interface TypeConfigDefinition {
  /**
   * Type schema version.
   *
   * Identifies the version of the type definition. Should follow semantic
   * versioning (e.g., '1.0.0').
   */
  version: string;

  /**
   * Optional create hook command.
   *
   * Runs after a new typed file passes validation.
   */
  create?: TypeCreateCommand;

  /**
   * Optional update hook command.
   *
   * Runs after an existing typed file is modified and passes validation.
   */
  update?: TypeUpdateCommand;

  /**
   * Optional delete hook command.
   *
   * Runs when a typed file is deleted. The file may already be gone from
   * disk by the time this hook runs; use the metadata in input rather than
   * reading the file.
   */
  delete?: TypeDeleteCommand;
}

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Environment configuration.
 *
 * An environment groups actions and types together. Multiple environments can
 * be defined (e.g., 'development', 'production') and the active environment
 * is selected at runtime.
 *
 * @example
 * ```typescript
 * const devEnvironment: EnvironmentConfig = {
 *   version: 1,
 *   description: 'Development environment with debug actions',
 *   actions: [launch, deploy],
 *   types: {
 *     'adaptive-card': adaptiveCardTypeConfig
 *   }
 * };
 * ```
 */
export interface EnvironmentConfig {
  /**
   * Environment version.
   *
   * Optional version number for the environment configuration. Defaults to 1.
   */
  version?: number;

  /**
   * Optional environment description.
   *
   * Human-readable description of what this environment is for.
   */
  description?: string;

  /**
   * Actions available in this environment.
   *
   * Array of action commands created by the defineAction factory.
   */
  actions: ActionCommand[];

  /**
   * Optional type definitions.
   *
   * Maps type names to their configurations (lifecycle hooks).
   * Type names should match the type discriminant in typed files.
   */
  types?: Record<string, TypeConfigDefinition>;

  /**
   * Optional stream definitions.
   *
   * Maps stream type names to their configurations (iframe renderer).
   * Stream types identify different kinds of streaming endpoints (e.g., 'claude-session').
   */
  streams?: Record<string, StreamConfigDefinition>;
}

// ============================================================================
// Root Configuration
// ============================================================================

/**
 * Root settings configuration.
 *
 * The top-level configuration object that defines all environments, actions,
 * and types. This is the type that `defineConfig()` accepts.
 *
 * @example
 * ```typescript
 * const config: SettingsConfig = {
 *   environments: {
 *     default: {
 *       version: 1,
 *       actions: [launch, deploy]
 *     },
 *     production: {
 *       version: 1,
 *       actions: [deploy]
 *     }
 *   }
 * };
 * ```
 */
export interface SettingsConfig {
  /**
   * Environment configurations.
   *
   * Maps environment names to their configurations. At least one environment
   * (typically 'default') should be defined.
   */
  environments: Record<string, EnvironmentConfig>;
}
