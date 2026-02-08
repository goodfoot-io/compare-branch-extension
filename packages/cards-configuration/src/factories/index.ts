/**
 * @cards/configuration/factories
 *
 * Factory functions for creating action handlers and type hooks.
 *
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
  defineStreamTransform,
  type StreamInitHandler,
  type StreamTransformConfig,
  type StreamTransformHandler
} from './stream-transform.js';
export {
  defineTypeCreate,
  defineTypeDelete,
  defineTypeUpdate,
  defineTypeValidator,
  type TypeConfig,
  type TypeHandler
} from './type-hooks.js';
