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
import type { ActionContext, TypeHookInput } from '../inputs.js';
import type { SameShape } from '../type-utils.js';

/**
 * Configuration for type lifecycle hooks.
 */
export interface TypeConfig {
  /** The type name (e.g., 'adaptive-card'). */
  typeName: string;
  /** Optional timeout in milliseconds. */
  timeout?: number;
}

/**
 * Handler function for type lifecycle events.
 *
 * @param input - Type hook input containing file metadata
 * @param context - Action context with logger and utilities
 */
export type TypeHandler = (input: TypeHookInput, context: ActionContext) => void | Promise<void>;

/**
 * Creates a type validator hook for file validation.
 *
 * Validators run before create/update hooks and can reject invalid content
 * by throwing an error. Use this for schema validation, business rules, or
 * structural checks.
 *
 * @template T - Config type (inferred)
 * @param config - Type metadata including the type name
 * @param handler - Async function that validates the file content
 * @returns A command wrapper suitable for default export
 *
 * @example
 * ```typescript
 * // types/adaptive-card/validator.ts
 * import { defineTypeValidator } from '@cards/configuration-v2';
 *
 * export default defineTypeValidator(
 *   { typeName: 'adaptive-card' },
 *   async (input, { logger }) => {
 *     const card = JSON.parse(input.fileContent);
 *     const errors = validateAdaptiveCard(card);
 *
 *     if (errors.length > 0) {
 *       throw new Error(`Invalid adaptive card: ${errors}`);
 *     }
 *
 *     logger.debug('Validation passed', { file: input.fileName });
 *   }
 * );
 * ```
 */
export function defineTypeValidator<T extends TypeConfig>(
  config: SameShape<TypeConfig, T>,
  handler: TypeHandler
): TypeValidatorCommand<T['typeName']> {
  const fn = async (input: TypeHookInput, context: ActionContext): Promise<void> => {
    await handler(input, context);
  };

  fn.factoryType = 'typeValidator' as const;
  fn.typeName = config.typeName;
  fn.timeout = config.timeout;

  return fn as TypeValidatorCommand<T['typeName']>;
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
 * import { defineTypeCreate } from '@cards/configuration-v2';
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
 * import { defineTypeUpdate } from '@cards/configuration-v2';
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
 * import { defineTypeDelete } from '@cards/configuration-v2';
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

  return fn as TypeDeleteCommand<T['typeName']>;
}
