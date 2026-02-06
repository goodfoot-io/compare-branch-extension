/**
 * @cards/configuration
 *
 * Type-safe configuration library v2 for the Cards Extension with hooks,
 * validators, and type configurations.
 *
 * This module provides action factories, type hook factories, configuration
 * utilities, environment helpers, logging, validation tools, and runtime
 * execution capabilities for Cards Extension integration.
 *
 * @module
 */
// ============================================================================
// Action Factories
// ============================================================================
export { defineActionEnd } from './factories/action-end.js';
export { defineActionStart } from './factories/action-start.js';
// ============================================================================
// Type Hook Factories
// ============================================================================
export { defineTypeCreate, defineTypeDelete, defineTypeUpdate, defineTypeValidator } from './factories/type-hooks.js';
// ============================================================================
// Stream Transform Factories
// ============================================================================
export { defineStreamTransform } from './factories/stream-transform.js';
export { defineConfig, serializeSettings } from './define-config.js';
// ============================================================================
// Environment Variables
// ============================================================================
export { CARDS_ENV_VARS, extractActionInput, extractTypeInput, getApiAccessToken, getApiBaseUrl, getCardId, getCodingAgent, getContentType, getEnvironment, getExecutionMode, getFileName, getFilePath, getFileSize, getSha256, getTypeName, getTypeVersion } from './env.js';
// ============================================================================
// Exit Codes
// ============================================================================
export { EXIT_CODES, exitWithError, writeError } from './exit-codes.js';
// ============================================================================
// Logger
// ============================================================================
export { LOG_LEVELS, Logger, logger } from './logger.js';
// ============================================================================
// Runtime
// ============================================================================
export { execute } from './runtime.js';
// ============================================================================
// Validation
// ============================================================================
export { parseHttpRequest } from './http-parser.js';
export { executeValidation, validationCreated, validationError, validationResponse, validationUpdated } from './validation.js';
export { createTestRequest, testValidation } from './testing.js';
