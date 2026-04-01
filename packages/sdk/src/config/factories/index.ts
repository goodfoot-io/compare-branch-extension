/**
 * Factory functions for declaring type-safe action handlers and type lifecycle
 * hooks (create, update, delete).
 *
 * @summary Factories for defining actions and type hooks
 * @module
 */

export {
  type ActionConfig,
  type ActionHandler,
  defineAction
} from './action.js';
export {
  defineTypeCreate,
  defineTypeDelete,
  defineTypeUpdate,
  type TypeConfig,
  type TypeHandler
} from './type-hooks.js';
