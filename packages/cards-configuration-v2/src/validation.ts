/**
 * Validation factory and output builders for custom type validators.
 *
 * Validators run as a stdin/stdout protocol: they receive an HTTP request on
 * stdin and emit a JSON response on stdout. This module provides the handler
 * types, response helpers, and the runtime executor.
 * @module
 */

import type { TypeValidatorCommand } from './command-types.js';
import { CARDS_ENV_VARS } from './env.js';
import { parseHttpRequest } from './http-parser.js';
import type { TypeValidatorContext, TypeValidatorRequest } from './inputs.js';
import { Logger } from './logger.js';

// ============================================================================
// Re-export ValidationRequest from http-parser
// ============================================================================

export type { ValidationRequest } from './http-parser.js';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for a type validator.
 *
 * @example
 * ```typescript
 * const config: ValidationConfig = {
 *   timeout: 30000 // 30 seconds
 * };
 * ```
 */
export interface ValidationConfig {
  /**
   * Maximum time in milliseconds for validation to complete.
   *
   * This value is attached as metadata on the validation function. The SDK
   * does not enforce timeouts itself.
   */
  timeout?: number;
}

/**
 * Context provided to validation handlers.
 *
 * Contains utilities and services available during validation execution.
 * The logger is a fresh instance (silent unless configured with handlers
 * or a log file).
 * @example
 * ```typescript
 * function handler(request: ValidationRequest, context: ValidationContext) {
 *   context.logger.info('Validating request');
 * }
 * ```
 */
export interface ValidationContext {
  /**
   * Logger for structured logging during validation.
   */
  logger: Logger;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Structured validation error.
 *
 * Used to report specific validation failures with context.
 * @example
 * ```typescript
 * const error: ValidationError = {
 *   code: 'ERR_REQUIRED',
 *   message: 'Field is required',
 *   field: 'name'
 * };
 * ```
 */
export interface ValidationError {
  /**
   * Machine-readable error code.
   */
  code: string;

  /**
   * Human-readable error message.
   */
  message: string;

  /**
   * Optional field name that caused the error.
   */
  field?: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Response from a validation handler.
 *
 * Contains HTTP status, headers, body, and optional metadata.
 * Use output builder functions to construct responses.
 * @example
 * ```typescript
 * const response: ValidationResponse = {
 *   status: 201,
 *   metadata: { checksum: 'abc123' }
 * };
 * ```
 */
export interface ValidationResponse {
  /**
   * HTTP status code (e.g., 200, 201, 400, 422, 500).
   */
  status?: number;

  /**
   * HTTP response headers.
   */
  headers?: Record<string, string>;

  /**
   * Response body as string or Buffer.
   */
  body?: string | Buffer;

  /**
   * Optional metadata to store in .meta.json file.
   */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Validation handler function.
 *
 * Receives an HTTP request and context, returns a validation response.
 * Can be sync or async. If the handler throws, {@link executeValidation}
 * converts the failure into a 500 response.
 * @template TRequest - The request type (defaults to ValidationRequest)
 * @example
 * ```typescript
 * const handler: ValidationHandler = (request, context) => {
 *   const data = request.bodyJson<MyType>();
 *   if (!data.name) {
 *     return validationError(400, [
 *       { code: 'ERR_REQUIRED', message: 'Name is required', field: 'name' }
 *     ]);
 *   }
 *   return validationCreated({ version: '1.0' });
 * };
 * ```
 */
export type ValidationHandler<TRequest = import('./http-parser.js').ValidationRequest> = (
  request: TRequest,
  context: ValidationContext
) => ValidationResponse | Promise<ValidationResponse>;

/**
 * Validation function created by the factory.
 *
 * A callable function with attached metadata (timeout).
 * The timeout is informational unless enforced by the execution environment.
 * @example
 * ```typescript
 * const validate: ValidationFunction = typeValidation(
 *   { timeout: 5000 },
 *   (request, context) => validationCreated()
 * );
 *
 * console.log(validate.timeout); // 5000
 * ```
 */
export interface ValidationFunction {
  (request: import('./http-parser.js').ValidationRequest, context: ValidationContext): Promise<ValidationResponse>;
  timeout?: number;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a type validation function.
 *
 * Factory that wraps a validation handler with configuration metadata.
 * The returned function can be executed directly or passed to executeValidation.
 * The timeout is attached as metadata for external tooling.
 * @param config - Validation configuration (timeout, etc.)
 * @param handler - The validation handler function
 * @returns A ValidationFunction with attached metadata
 * @example
 * ```typescript
 * const validate = typeValidation(
 *   { timeout: 30000 },
 *   (request, context) => {
 *     const data = request.bodyJson<Contract>();
 *     if (!isValidContract(data)) {
 *       return validationError(422, [
 *         { code: 'ERR_INVALID_CONTRACT', message: 'Contract validation failed' }
 *       ]);
 *     }
 *     return validationCreated({ version: data.version });
 *   }
 * );
 * ```
 */
export function typeValidation(config: ValidationConfig, handler: ValidationHandler): ValidationFunction {
  const fn = (
    request: import('./http-parser.js').ValidationRequest,
    context: ValidationContext
  ): Promise<ValidationResponse> => {
    return Promise.resolve(handler(request, context));
  };

  fn.timeout = config.timeout;
  return fn;
}

// ============================================================================
// Output Builders
// ============================================================================

/**
 * Creates a 201 Created response.
 *
 * Use when validation succeeds for a new resource.
 * This helper only sets status and metadata; use {@link validationResponse}
 * if you need headers or a body.
 * @param metadata - Optional metadata to store in .meta.json
 * @returns ValidationResponse with status 201
 * @example
 * ```typescript
 * return validationCreated({ version: '1.0', checksum: 'abc123' });
 * ```
 */
export function validationCreated(metadata?: Record<string, unknown>): ValidationResponse {
  return { status: 201, metadata };
}

/**
 * Creates a 200 OK response.
 *
 * Use when validation succeeds for updating an existing resource.
 * This helper only sets status and metadata; use {@link validationResponse}
 * if you need headers or a body.
 * @param metadata - Optional metadata to store in .meta.json
 * @returns ValidationResponse with status 200
 * @example
 * ```typescript
 * return validationUpdated({ version: '1.1', lastModified: Date.now() });
 * ```
 */
export function validationUpdated(metadata?: Record<string, unknown>): ValidationResponse {
  return { status: 200, metadata };
}

/**
 * Creates an error response.
 *
 * Use when validation fails. Automatically sets Content-Type to application/json
 * and formats errors in the response body. Metadata is omitted for errors.
 * @param status - HTTP status code (typically 400, 422, or 500)
 * @param errors - Array of validation errors
 * @param message - Optional human-readable error message
 * @returns ValidationResponse with structured error body
 * @example
 * ```typescript
 * return validationError(422, [
 *   { code: 'ERR_REQUIRED', message: 'Name is required', field: 'name' },
 *   { code: 'ERR_TYPE', message: 'Age must be a number', field: 'age' }
 * ], 'Validation failed');
 * ```
 */
export function validationError(status: number, errors: ValidationError[], message?: string): ValidationResponse {
  const body: { errors: ValidationError[]; message?: string } = { errors };
  if (message !== undefined) {
    body.message = message;
  }

  return {
    status,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  };
}

/**
 * Passes through a custom validation response.
 *
 * Use when you need full control over the response structure.
 * @param response - The validation response to return
 * @returns The same ValidationResponse
 * @example
 * ```typescript
 * return validationResponse({
 *   status: 418,
 *   headers: { 'X-Custom': 'teapot' },
 *   body: 'I am a teapot'
 * });
 * ```
 */
export function validationResponse(response: ValidationResponse): ValidationResponse {
  return response;
}

// ============================================================================
// Runtime Execution
// ============================================================================

/**
 * Executes a type validator command with stdin/stdout protocol.
 *
 * Reads an HTTP request from stdin, extracts type context from environment
 * variables, invokes the validation handler, and writes the JSON response
 * to stdout. Always exits with code 0 for handled cases (including validation
 * errors). Non-zero exit codes indicate unhandled crashes or process-level failures.
 *
 * ## Protocol
 *
 * - **Input**: HTTP request on stdin (request line, headers, body)
 * - **Environment**: Type metadata from environment variables
 * - **Output**: JSON response on stdout
 * - **Exit Code**: 0 for all handled cases (2xx, 4xx, 5xx), non-zero for crashes
 *
 * ## Error Handling
 *
 * | Error Type | Status | Exit Code |
 * |------------|--------|-----------|
 * | Parse error | 400 | 0 |
 * | Validation error | 4xx | 0 |
 * | Handler exception | 500 | 0 |
 * | Unhandled crash | - | non-zero |
 *
 * This function reads all of stdin into memory before parsing. The request
 * must include a valid Content-Length header; chunked encoding is unsupported.
 * @param validation - The type validator command to execute
 * @returns A promise that resolves only if process.exit is mocked
 * @example
 * ```typescript
 * // validator.mjs
 * import { defineTypeValidator, executeValidation, validationCreated } from '@cards/configuration-v2';
 *
 * const validate = defineTypeValidator(
 *   { typeName: 'note', timeout: 30000 },
 *   (request, context) => {
 *     context.logger.info('Validating request');
 *     const data = request.bodyJson();
 *     // ... validation logic
 *     return validationCreated();
 *   }
 * );
 *
 * executeValidation(validate);
 * ```
 */
export async function executeValidation(validation: TypeValidatorCommand): Promise<void> {
  const logger = new Logger();

  try {
    // Read all of stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    const input = Buffer.concat(chunks);

    // Parse HTTP request
    const parseResult = parseHttpRequest(input);
    if (!parseResult.success) {
      const errorResponse = {
        status: 400,
        body: JSON.stringify({ error: parseResult.error }),
        headers: { 'Content-Type': 'application/json' }
      };
      process.stdout.write(JSON.stringify(errorResponse));
      process.exit(0); // Exit 0 even for validation errors
    }

    // Extract type context from environment variables
    const context: TypeValidatorContext = {
      logger,
      cwd: process.cwd(),
      typeName: process.env[CARDS_ENV_VARS.TYPE_NAME] ?? '',
      typeVersion: process.env[CARDS_ENV_VARS.TYPE_VERSION] ?? '',
      fileName: process.env[CARDS_ENV_VARS.FILE_NAME] ?? '',
      cardId: process.env[CARDS_ENV_VARS.CARD_ID] ?? '',
      environment: process.env[CARDS_ENV_VARS.ENVIRONMENT] ?? '',
      apiBaseUrl: process.env[CARDS_ENV_VARS.API_BASE_URL] ?? '',
      apiAccessToken: process.env[CARDS_ENV_VARS.API_ACCESS_TOKEN] ?? ''
    };

    // Create TypeValidatorRequest from parsed HTTP request
    const request: TypeValidatorRequest = {
      method: parseResult.request.method,
      path: parseResult.request.path,
      httpVersion: parseResult.request.httpVersion,
      headers: parseResult.request.headers,
      body: parseResult.request.body,
      bodyText: parseResult.request.bodyText,
      bodyJson: parseResult.request.bodyJson
    };

    // Execute handler
    const response = await validation(request, context);

    // Write response
    process.stdout.write(JSON.stringify(response));
    process.exit(0);
  } catch (error) {
    // Unhandled error - return 500
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Validation error', { error: errorMessage });
    const errorResponse = {
      status: 500,
      body: JSON.stringify({ error: 'Internal validation error', message: errorMessage }),
      headers: { 'Content-Type': 'application/json' }
    };
    process.stdout.write(JSON.stringify(errorResponse));
    process.exit(0); // Exit 0 - non-zero only for crashes
  }
}
