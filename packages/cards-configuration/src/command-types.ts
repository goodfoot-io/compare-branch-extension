/**
 * Command type definitions for action and type lifecycle handlers.
 *
 * These types define the callable command interfaces returned by factory
 * functions. Each command preserves metadata for CLI extraction and settings.json
 * generation while remaining executable by the runtime.
 *
 * The generic parameter `N` preserves the action/type name as a literal type,
 * enabling compile-time validation of action start/end pairing.
 *
 * @module
 */

import type {
  ActionContext,
  ActionEndInput,
  ActionStartInput,
  TypeHookInput,
  TypeValidatorContext,
  TypeValidatorRequest
} from './inputs.js';
import type { ValidationResponse } from './validation.js';

// ============================================================================
// Command Types
// ============================================================================

/**
 * Callable command returned by action start factory.
 *
 * This interface combines the callable signature with metadata properties
 * that the CLI and runtime use. The function is what the runtime invokes;
 * the properties are what the CLI extracts for settings.json generation.
 *
 * The generic parameter `N` preserves the action name as a literal type,
 * enabling type-safe pairing with corresponding end commands.
 *
 * @template N - The literal action name type (e.g., 'Launch Claude')
 *
 * @example
 * ```typescript
 * // The command can be called directly (by the runtime)
 * await command(input, context);
 *
 * // And inspected for metadata (by the CLI)
 * console.log(command.factoryType); // 'actionStart'
 * console.log(command.actionName);  // 'Launch Claude'
 *
 * // Type is preserved for pairing validation
 * const start: ActionStartCommand<'Launch'> = defineActionStart(...);
 * const end: ActionEndCommand<'Launch'> = defineActionEnd(...); // Must match!
 * ```
 */
export interface ActionStartCommand<N extends string = string> {
  /**
   * Invokes the wrapped handler with the provided input and context.
   * @param input - Action input payload from environment variables
   * @param context - Runtime context with logger and cwd
   * @returns Resolves when the handler completes
   */
  (input: ActionStartInput, context: ActionContext): Promise<void>;

  /** Discriminant for the CLI's AST analyzer. */
  factoryType: 'actionStart';

  /** Action name from config - preserved as literal type. */
  actionName: N;

  /** Description from config, if provided. */
  description?: string;

  /** Icon path from config, if provided. */
  icon?: string;

  /** Background mode flag from config, if provided. */
  supportsBackgroundMode?: boolean;

  /** Concurrent execution flag from config, if provided. */
  allowConcurrent?: boolean;

  /** Timeout from config, if provided. */
  timeout?: number;

  /**
   * Path to the handler source file for CLI compilation.
   *
   * When provided, the CLI will compile this file into a standalone bundle
   * and generate proper command paths in settings.json. If omitted, the
   * CLI will generate placeholder command strings.
   */
  sourcePath?: string;
}

/**
 * Callable command returned by action end factory.
 *
 * End handlers run after the corresponding start handler exits with code 0.
 * The generic parameter `N` must match the corresponding start command's
 * action name for proper pairing validation.
 *
 * @template N - The literal action name type (must match start command)
 *
 * @see {@link ActionStartCommand} for usage pattern
 *
 * @example
 * ```typescript
 * // Type-safe pairing
 * const start: ActionStartCommand<'Deploy'> = defineActionStart(...);
 * const end: ActionEndCommand<'Deploy'> = defineActionEnd(...);
 *
 * // This would be a type error:
 * const wrongEnd: ActionEndCommand<'Build'> = defineActionEnd(...);
 * const pair = { start, end: wrongEnd }; // Error!
 * ```
 */
export interface ActionEndCommand<N extends string = string> {
  (input: ActionEndInput, context: ActionContext): Promise<void>;
  factoryType: 'actionEnd';
  /** Action name - must match corresponding start command. */
  actionName: N;
  timeout?: number;
  /**
   * Path to the handler source file for CLI compilation.
   */
  sourcePath?: string;
}

/**
 * Callable command returned by type validator factory.
 *
 * Validators receive the HTTP request with file content in the body.
 * The file is NOT saved to disk until validation passes. Return a
 * validation response to indicate success (2xx) or failure (4xx/5xx).
 *
 * @template T - The literal type name (e.g., 'adaptive-card')
 */
export interface TypeValidatorCommand<T extends string = string> {
  (request: TypeValidatorRequest, context: TypeValidatorContext): Promise<ValidationResponse>;
  factoryType: 'typeValidator';
  /** Type name from config - preserved as literal type. */
  typeName: T;
  timeout?: number;
  /**
   * Path to the handler source file for CLI compilation.
   */
  sourcePath?: string;
}

/**
 * Callable command returned by type create factory.
 *
 * Runs after a new typed file passes validation.
 *
 * @template T - The literal type name (e.g., 'adaptive-card')
 */
export interface TypeCreateCommand<T extends string = string> {
  (input: TypeHookInput, context: ActionContext): Promise<void>;
  factoryType: 'typeCreate';
  /** Type name from config - preserved as literal type. */
  typeName: T;
  timeout?: number;
  /**
   * Path to the handler source file for CLI compilation.
   */
  sourcePath?: string;
}

/**
 * Callable command returned by type update factory.
 *
 * Runs after an existing typed file is modified and passes validation.
 *
 * @template T - The literal type name (e.g., 'adaptive-card')
 */
export interface TypeUpdateCommand<T extends string = string> {
  (input: TypeHookInput, context: ActionContext): Promise<void>;
  factoryType: 'typeUpdate';
  /** Type name from config - preserved as literal type. */
  typeName: T;
  timeout?: number;
  /**
   * Path to the handler source file for CLI compilation.
   */
  sourcePath?: string;
}

/**
 * Callable command returned by type delete factory.
 *
 * Runs when a typed file is deleted. The file may already be gone from disk
 * by the time this hook runs; use the metadata in input rather than reading
 * the file.
 *
 * @template T - The literal type name (e.g., 'adaptive-card')
 */
export interface TypeDeleteCommand<T extends string = string> {
  (input: TypeHookInput, context: ActionContext): Promise<void>;
  factoryType: 'typeDelete';
  /** Type name from config - preserved as literal type. */
  typeName: T;
  timeout?: number;
  /**
   * Path to the handler source file for CLI compilation.
   */
  sourcePath?: string;
}
