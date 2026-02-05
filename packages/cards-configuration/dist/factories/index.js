/**
 * @cards/configuration/factories
 *
 * Factory functions for creating action handlers and type hooks.
 *
 * @module
 */
// Re-export validation helpers for convenience when creating validators
export { validationCreated, validationError, validationResponse, validationUpdated } from '../validation.js';
export { defineActionEnd } from './action-end.js';
export { defineActionStart } from './action-start.js';
export { defineTypeCreate, defineTypeDelete, defineTypeUpdate, defineTypeValidator } from './type-hooks.js';
