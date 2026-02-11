/**
 * Output builders and runtime executor for custom type validators.
 *
 * Validators run as a file-path protocol: they read FILE_PATH from the
 * environment, optionally load a `.meta.json` sidecar, and write a
 * `ValidationResult` JSON object to stdout. This module provides
 * result helpers and the runtime executor.
 * @module
 */

import { readFileSync } from 'node:fs';
import type { ValidationResult } from '../protocol/index.js';
import type { TypeValidatorCommand } from './command-types.js';
import {
  CARDS_ENV_VARS,
  getApiAccessToken,
  getApiBaseUrl,
  getCardId,
  getEnvironment,
  getFileName,
  getTypeName,
  getTypeVersion
} from './env.js';
import type { TypeValidatorContext, ValidatorFileRequest } from './inputs.js';
import { Logger } from './logger.js';

// ============================================================================
// Output Builders
// ============================================================================

/**
 * Creates a successful validation result.
 *
 * Use when validation passes. Optionally include metadata to store in the
 * `.meta.json` sidecar file.
 * @param metadata - Optional metadata to store in .meta.json
 * @returns ValidationResult with `valid: true`
 * @example
 * ```typescript
 * return validationSuccess({ version: '1.0', checksum: 'abc123' });
 * ```
 */
export function validationSuccess(metadata?: Record<string, unknown>): ValidationResult {
  if (metadata !== undefined) {
    return { valid: true, metadata };
  }
  return { valid: true };
}

/**
 * Creates a failed validation result.
 *
 * Use when validation fails. Errors are markdown-formatted strings surfaced
 * to the git client.
 * @param errors - Array of markdown-formatted error messages
 * @returns ValidationResult with `valid: false`
 * @example
 * ```typescript
 * return validationError([
 *   '**name** field is required',
 *   '`age` must be a positive number'
 * ]);
 * ```
 */
export function validationError(errors: string[]): ValidationResult {
  return { valid: false, errors };
}

// ============================================================================
// Runtime Execution
// ============================================================================

/**
 * Executes a type validator command with file-path protocol.
 *
 * Reads the file path from the `FILE_PATH` environment variable, loads the
 * `.meta.json` sidecar if present, extracts type context from environment
 * variables, invokes the validation handler, and writes the JSON result
 * to stdout. Always exits with code 0 for all cases.
 *
 * ## Protocol
 *
 * - **Input**: `FILE_PATH` environment variable pointing to the file
 * - **Sidecar**: `{FILE_PATH}.meta.json` parsed as metadata if present
 * - **Environment**: Type metadata from environment variables
 * - **Output**: `ValidationResult` JSON on stdout
 * - **Exit Code**: 0 for all cases
 *
 * ## Error Handling
 *
 * | Error Type | Output | Exit Code |
 * |------------|--------|-----------|
 * | Missing FILE_PATH | `{ valid: false, errors: [...] }` | 0 |
 * | Validation failure | `{ valid: false, errors: [...] }` | 0 |
 * | Handler exception | `{ valid: false, errors: [...] }` | 0 |
 * | Validation success | `{ valid: true, ... }` | 0 |
 *
 * @param validation - The type validator command to execute
 * @returns A promise that resolves only if process.exit is mocked
 * @example
 * ```typescript
 * // validator.mjs
 * import { readFileSync } from 'node:fs';
 * import { defineTypeValidator, executeValidation, validationSuccess } from '@cards/sdk/config';
 *
 * const validate = defineTypeValidator(
 *   { typeName: 'note', timeout: 30000 },
 *   (request, context) => {
 *     context.logger.info('Validating file', { path: request.filePath });
 *     const content = readFileSync(request.filePath, 'utf-8');
 *     // ... validation logic
 *     return validationSuccess();
 *   }
 * );
 *
 * executeValidation(validate);
 * ```
 */
export async function executeValidation(validation: TypeValidatorCommand): Promise<void> {
  const logger = new Logger();

  try {
    // Read FILE_PATH from environment
    const filePath = process.env[CARDS_ENV_VARS.FILE_PATH];
    if (!filePath) {
      process.stdout.write(JSON.stringify({ valid: false, errors: ['FILE_PATH environment variable is not set'] }));
      return process.exit(0);
    }

    // Look for .meta.json sidecar
    let metadata: Record<string, unknown> | undefined;
    try {
      const sidecarContent = readFileSync(`${filePath}.meta.json`, 'utf-8');
      metadata = JSON.parse(sidecarContent) as Record<string, unknown>;
    } catch {
      // Sidecar doesn't exist or is invalid - metadata stays undefined
    }

    // Build ValidatorFileRequest
    const request: ValidatorFileRequest = {
      filePath,
      metadata
    };

    // Extract type context from environment variables
    const context: TypeValidatorContext = {
      logger,
      cwd: process.cwd(),
      typeName: getTypeName(),
      typeVersion: getTypeVersion(),
      fileName: getFileName(),
      cardId: getCardId(),
      environment: getEnvironment(),
      apiBaseUrl: getApiBaseUrl(),
      apiAccessToken: getApiAccessToken()
    };

    // Execute handler
    const result = await validation(request, context);

    // Write result
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  } catch (error) {
    // Unhandled error - return failure result
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Validation error', { error: errorMessage });
    process.stdout.write(JSON.stringify({ valid: false, errors: [errorMessage] }));
    process.exit(0);
  }
}
