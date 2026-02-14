/**
 * Testing utilities for validation handlers.
 *
 * Provides a test harness that executes validators without stdin/stdout,
 * making it suitable for unit tests and fast feedback loops.
 *
 * @summary Testing utilities for validation handlers
 * @module
 */

import type { ValidationResult } from '../protocol/index.js';
import type { TypeValidatorCommand } from './command-types.js';
import type { TypeValidatorContext, ValidatorFileRequest } from './inputs.js';
import { Logger } from './logger.js';

// ============================================================================
// Test Request Builder
// ============================================================================

/**
 * Options for creating a test request.
 */
export interface TestRequestOptions {
  /** Absolute file path (default: '/test/file.json') */
  filePath?: string;
  /** Parsed .meta.json sidecar content */
  metadata?: Record<string, unknown>;
}

/**
 * Creates a test ValidatorFileRequest from options.
 *
 * This helper builds a file request for testing validators without
 * actually reading files from disk.
 * @param options - Optional overrides for file path and parsed metadata payload.
 * @returns A ValidatorFileRequest suitable for testing
 * @example
 * ```typescript
 * const request = createTestRequest({
 *   filePath: '/path/to/contract.json',
 *   metadata: { version: '1.0' }
 * });
 * ```
 */
export function createTestRequest(options: TestRequestOptions = {}): ValidatorFileRequest {
  const { filePath = '/test/file.json', metadata } = options;
  return { filePath, metadata };
}

// ============================================================================
// Test Harness
// ============================================================================

/**
 * Options for testValidation.
 */
export interface TestValidationOptions {
  /** Custom logger (default: creates new Logger) */
  logger?: Logger;
  /** Optional context overrides (default: empty strings for all fields) */
  context?: Partial<Omit<TypeValidatorContext, 'logger'>>;
}

/**
 * Test harness result.
 */
export interface TestValidationResult {
  /** The result returned by the validator */
  result: ValidationResult;
  /** The context that was passed to the validator */
  context: TypeValidatorContext;
}

/**
 * Test harness for validators.
 *
 * Invokes a validation function with a test request and returns the result.
 * Does not involve process I/O - suitable for unit testing. Errors thrown
 * by the validation function will reject the promise.
 *
 * @param validation - The type validator command to test
 * @param request - Test request (or options to create one)
 * @param options - Optional logger and context overrides for the test invocation.
 * @returns The validation result
 * @example
 * ```typescript
 * import { testValidation, createTestRequest, defineTypeValidator, validationSuccess } from '@cards/sdk/config';
 *
 * const validator = defineTypeValidator({ typeName: 'test' }, async (request) => {
 *   // read file at request.filePath and validate...
 *   return validationSuccess({ name: 'test' });
 * });
 *
 * const { result } = await testValidation(validator, {
 *   filePath: '/path/to/file.json'
 * });
 *
 * expect(result.valid).toBe(true);
 * ```
 */
export async function testValidation(
  validation: TypeValidatorCommand,
  request: ValidatorFileRequest | TestRequestOptions,
  options: TestValidationOptions = {}
): Promise<TestValidationResult> {
  const { logger = new Logger(), context: contextOverrides = {} } = options;

  // Convert options to request if needed
  const validationRequest: ValidatorFileRequest =
    'filePath' in request && typeof request.filePath === 'string'
      ? (request as ValidatorFileRequest)
      : createTestRequest(request);

  const context: TypeValidatorContext = {
    logger,
    cwd: process.cwd(),
    typeName: '',
    typeVersion: '',
    fileName: '',
    cardId: '',
    environment: '',
    apiBaseUrl: '',
    apiAccessToken: '',
    ...contextOverrides
  };
  const result = await validation(validationRequest, context);

  return { result, context };
}
