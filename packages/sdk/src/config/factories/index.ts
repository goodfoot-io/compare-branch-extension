/**
 * Factory functions for declaring type-safe action handlers and type lifecycle
 * hooks (create, update, delete, validate). Each factory captures handler
 * metadata and wires up validation helpers for consistent error reporting.
 *
 * @summary Factories for defining actions and type hooks
 * @module
 */

// Re-export validation helpers for convenience when creating validators
export {
  validationError,
  validationSuccess
} from '../validation.js';
export {
  type ActionConfig,
  type ActionHandler,
  defineAction
} from './action.js';
export {
  defineTypeCreate,
  defineTypeDelete,
  defineTypeUpdate,
  defineTypeValidator,
  type TypeConfig,
  type TypeHandler,
  type TypeValidatorConfig
} from './type-hooks.js';
