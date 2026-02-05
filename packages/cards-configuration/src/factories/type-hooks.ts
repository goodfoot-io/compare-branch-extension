/**
 * Type lifecycle hook factories.
 *
 * These factories create type-specific hooks for validation and lifecycle events.
 * They use SameShape for compile-time typo detection and preserve the type name
 * as a generic parameter.
 *
 * @module factories/type-hooks
 */

import type {
  TypeCreateCommand,
  TypeDeleteCommand,
  TypeUpdateCommand,
  TypeValidatorCommand
} from '../command-types.js';
import type { ActionContext, TypeHookInput, TypeValidatorContext, TypeValidatorRequest } from '../inputs.js';
import type { SameShape } from '../type-utils.js';
import type { ValidationResponse } from '../validation.js';

/**
 * Configuration for type lifecycle hooks.
 */
export interface TypeConfig {
  /** The type name (e.g., 'adaptive-card'). */
  typeName: string;
  /** Optional timeout in milliseconds. */
  timeout?: number;
  /**
   * Path to the handler source file for CLI compilation.
   *
   * When provided, the CLI will compile this file into a standalone bundle.
   * Use `import.meta.filename` or `import.meta.url` for the current file.
   */
  sourcePath?: string;
}

/**
 * Handler function for type lifecycle events (create, update, delete).
 *
 * @param input - Type hook input containing file metadata
 * @param context - Action context with logger and utilities
 */
export type TypeHandler = (input: TypeHookInput, context: ActionContext) => void | Promise<void>;

/**
 * Handler function for type validators.
 *
 * Receives an HTTP request with the file content in the body.
 * The file is NOT saved to disk until validation passes.
 *
 * @param request - HTTP request with headers and body
 * @param context - Validator context with type metadata
 * @returns Validation response indicating success or failure
 */
export type TypeValidatorHandler = (
  request: TypeValidatorRequest,
  context: TypeValidatorContext
) => ValidationResponse | Promise<ValidationResponse>;

/**
 * Creates a type validator hook for file validation.
 *
 * Validators receive the HTTP request with file content in the body.
 * The file is NOT saved to disk until validation passes. Return a
 * validation response to indicate success (2xx) or failure (4xx/5xx).
 *
 * @template T - Config type (inferred)
 * @param config - Type metadata including the type name
 * @param handler - Function that validates the content and returns a response
 * @returns A command wrapper suitable for default export
 *
 * @example
 * ```typescript
 * // validators/adaptive-card-validator.ts
 * import { defineTypeValidator, validationCreated, validationError } from '@cards/configuration';
 *
 * export default defineTypeValidator(
 *   { typeName: 'adaptive-card', sourcePath: fileURLToPath(import.meta.url) },
 *   async (request, context) => {
 *     // Parse the request body (file not yet saved to disk)
 *     const card = request.bodyJson<AdaptiveCard>();
 *
 *     // Access HTTP headers if needed
 *     const contentType = request.headers['content-type'];
 *
 *     // Validate
 *     const errors = validateAdaptiveCard(card);
 *     if (errors.length > 0) {
 *       return validationError(400, errors);
 *     }
 *
 *     context.logger.info('Validation passed', { file: context.fileName });
 *     return validationCreated({ cardId: card.id });
 *   }
 * );
 * ```
 */
export function defineTypeValidator<T extends TypeConfig>(
  config: SameShape<TypeConfig, T>,
  handler: TypeValidatorHandler
): TypeValidatorCommand<T['typeName']> {
  const fn = async (request: TypeValidatorRequest, context: TypeValidatorContext): Promise<ValidationResponse> => {
    return await Promise.resolve(handler(request, context));
  };

  fn.factoryType = 'typeValidator' as const;
  fn.typeName = config.typeName;
  fn.timeout = config.timeout;
  fn.sourcePath = config.sourcePath;

  return fn as unknown as TypeValidatorCommand<T['typeName']>;
}

/**
 * Creates a type create hook for new file events.
 *
 * Runs after a new typed file passes validation. Use this for side effects
 * like indexing, notifications, or syncing with external systems.
 *
 * @template T - Config type (inferred)
 * @param config - Type metadata including the type name
 * @param handler - Async function that handles the create event
 * @returns A command wrapper suitable for default export
 *
 * @example
 * ```typescript
 * // types/adaptive-card/create.ts
 * import { defineTypeCreate } from '@cards/configuration';
 *
 * export default defineTypeCreate(
 *   { typeName: 'adaptive-card' },
 *   async (input, { logger }) => {
 *     logger.info('New adaptive card created', {
 *       file: input.fileName,
 *       size: input.fileSize
 *     });
 *
 *     // Index for search
 *     await searchIndex.add({
 *       id: input.fileSha256,
 *       path: input.filePath,
 *       type: input.typeName
 *     });
 *   }
 * );
 * ```
 */
export function defineTypeCreate<T extends TypeConfig>(
  config: SameShape<TypeConfig, T>,
  handler: TypeHandler
): TypeCreateCommand<T['typeName']> {
  const fn = async (input: TypeHookInput, context: ActionContext): Promise<void> => {
    await handler(input, context);
  };

  fn.factoryType = 'typeCreate' as const;
  fn.typeName = config.typeName;
  fn.timeout = config.timeout;
  fn.sourcePath = config.sourcePath;

  return fn as TypeCreateCommand<T['typeName']>;
}

/**
 * Creates a type update hook for modified file events.
 *
 * Runs after an existing typed file is modified and passes validation.
 * The input includes the new file hash, enabling efficient change detection.
 *
 * @template T - Config type (inferred)
 * @param config - Type metadata including the type name
 * @param handler - Async function that handles the update event
 * @returns A command wrapper suitable for default export
 *
 * @example
 * ```typescript
 * // types/adaptive-card/update.ts
 * import { defineTypeUpdate } from '@cards/configuration';
 *
 * export default defineTypeUpdate(
 *   { typeName: 'adaptive-card' },
 *   async (input, { logger }) => {
 *     logger.info('Adaptive card updated', {
 *       file: input.fileName,
 *       newHash: input.fileSha256.slice(0, 8)
 *     });
 *
 *     // Update search index
 *     await searchIndex.update(input.filePath, {
 *       hash: input.fileSha256,
 *       updatedAt: new Date().toISOString()
 *     });
 *   }
 * );
 * ```
 */
export function defineTypeUpdate<T extends TypeConfig>(
  config: SameShape<TypeConfig, T>,
  handler: TypeHandler
): TypeUpdateCommand<T['typeName']> {
  const fn = async (input: TypeHookInput, context: ActionContext): Promise<void> => {
    await handler(input, context);
  };

  fn.factoryType = 'typeUpdate' as const;
  fn.typeName = config.typeName;
  fn.timeout = config.timeout;
  fn.sourcePath = config.sourcePath;

  return fn as TypeUpdateCommand<T['typeName']>;
}

/**
 * Creates a type delete hook for file removal events.
 *
 * Runs when a typed file is deleted. The file may already be removed from
 * disk when this hook executes, so use the metadata in input rather than
 * attempting to read the file.
 *
 * @template T - Config type (inferred)
 * @param config - Type metadata including the type name
 * @param handler - Async function that handles the delete event
 * @returns A command wrapper suitable for default export
 *
 * @example
 * ```typescript
 * // types/adaptive-card/delete.ts
 * import { defineTypeDelete } from '@cards/configuration';
 *
 * export default defineTypeDelete(
 *   { typeName: 'adaptive-card' },
 *   async (input, { logger }) => {
 *     logger.info('Adaptive card deleted', { file: input.fileName });
 *
 *     // Remove from search index
 *     await searchIndex.remove(input.filePath);
 *
 *     // Clean up any cached renders
 *     await renderCache.invalidate(input.fileSha256);
 *   }
 * );
 * ```
 */
export function defineTypeDelete<T extends TypeConfig>(
  config: SameShape<TypeConfig, T>,
  handler: TypeHandler
): TypeDeleteCommand<T['typeName']> {
  const fn = async (input: TypeHookInput, context: ActionContext): Promise<void> => {
    await handler(input, context);
  };

  fn.factoryType = 'typeDelete' as const;
  fn.typeName = config.typeName;
  fn.timeout = config.timeout;
  fn.sourcePath = config.sourcePath;

  return fn as TypeDeleteCommand<T['typeName']>;
}
