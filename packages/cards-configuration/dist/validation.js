/**
 * Validation factory and output builders for custom type validators.
 *
 * Validators run as a stdin/stdout protocol: they receive an HTTP request on
 * stdin and emit a JSON response on stdout. This module provides the handler
 * types, response helpers, and the runtime executor.
 * @module
 */
import { CARDS_ENV_VARS } from './env.js';
import { parseHttpRequest } from './http-parser.js';
import { Logger } from './logger.js';
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
export function typeValidation(config, handler) {
  const fn = (request, context) => {
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
export function validationCreated(metadata) {
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
export function validationUpdated(metadata) {
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
export function validationError(status, errors, message) {
  const body = { errors };
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
export function validationResponse(response) {
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
 * import { defineTypeValidator, executeValidation, validationCreated } from '@cards/configuration';
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
export async function executeValidation(validation) {
  const logger = new Logger();
  try {
    // Read all of stdin
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
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
    const context = {
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
    const request = {
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
