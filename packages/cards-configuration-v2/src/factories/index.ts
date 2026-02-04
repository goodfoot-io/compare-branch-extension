/**
 * @cards/configuration-v2/factories
 *
 * Factory functions for creating action handlers and type hooks.
 *
 * @module
 */

export {
  type ActionEndConfig,
  type ActionEndHandler,
  defineActionEnd
} from './action-end.js';
export {
  type ActionHandler,
  type ActionStartConfig,
  defineActionStart
} from './action-start.js';
export {
  defineTypeCreate,
  defineTypeDelete,
  defineTypeUpdate,
  defineTypeValidator,
  type TypeConfig,
  type TypeHandler
} from './type-hooks.js';
