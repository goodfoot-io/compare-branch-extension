/**
 * Command type definitions for action and type lifecycle handlers.
 *
 * These types define the callable command interfaces returned by factory
 * functions. Each command preserves metadata for CLI extraction and settings.json
 * generation while remaining executable by the runtime.
 *
 * The generic parameter `N` preserves the action/type name as a literal type,
 * enabling compile-time validation of action references.
 *
 *
 * @summary Command type definitions for action and type lifecycle handlers
 * @module
 */

import type { ValidationResult } from '../protocol/index.js';
import type {
  ActionContext,
  ActionInput,
  TypeHookContext,
  TypeHookInput,
  TypeValidatorContext,
  ValidatorFileRequest
} from './inputs.js';

// ============================================================================
// Command Types
// ============================================================================

/**
 * Callable command returned by action factory.
 *
 * This interface combines the callable signature with metadata properties
 * that the CLI and runtime use. The function is what the runtime invokes;
 * the properties are what the CLI extracts for settings.json generation.
 *
 * The generic parameter `N` preserves the action name as a literal type.
 *
 * @template N - The literal action name type (e.g., 'Launch Claude')
 *
 * @example
 * ```typescript
 * // The command can be called directly (by the runtime)
 * await command(input, context);
 *
 * // And inspected for metadata (by the CLI)
 * console.log(command.factoryType); // 'action'
 * console.log(command.actionName);  // 'Launch Claude'
 * ```
 */
export interface ActionCommand<N extends string = string> {
  /**
   * Invokes the wrapped handler with the provided input and context.
   * @param input - Action input payload from environment variables
   * @param context - Runtime context with logger, cwd, and callback methods
   * @returns Resolves when the handler completes
   */
  (input: ActionInput, context: ActionContext): Promise<void>;

  /** Discriminant for the CLI's AST analyzer. */
  factoryType: 'action';

  /** Explicit action ID from config, if provided. */
  id?: string;

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
 * Callable command returned by type validator factory.
 *
 * Validators receive the file path and optional sidecar metadata.
 * The file is already on disk; validators read it themselves. Return a
 * `ValidationResult` to indicate success or failure.
 *
 * @template T - The literal type name (e.g., 'adaptive-card')
 */
export interface TypeValidatorCommand<T extends string = string> {
  (request: ValidatorFileRequest, context: TypeValidatorContext): Promise<ValidationResult>;
  factoryType: 'typeValidator';
  /** Type name from config - preserved as literal type. */
  typeName: T;
  timeout?: number;
  /**
   * Path to the handler source file for CLI compilation.
   */
  sourcePath?: string;
  /** Human-readable schema describing the expected file format. */
  schema: string;
  /** Description of the type's purpose. */
  description: string;
}

/**
 * Callable command returned by type create factory.
 *
 * Runs after a new typed file passes validation.
 *
 * @template T - The literal type name (e.g., 'adaptive-card')
 */
export interface TypeCreateCommand<T extends string = string> {
  (input: TypeHookInput, context: TypeHookContext): Promise<void>;
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
  (input: TypeHookInput, context: TypeHookContext): Promise<void>;
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
  (input: TypeHookInput, context: TypeHookContext): Promise<void>;
  factoryType: 'typeDelete';
  /** Type name from config - preserved as literal type. */
  typeName: T;
  timeout?: number;
  /**
   * Path to the handler source file for CLI compilation.
   */
  sourcePath?: string;
}
