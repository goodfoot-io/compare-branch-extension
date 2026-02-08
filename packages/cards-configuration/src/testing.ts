/**
 * Testing utilities for validation handlers.
 *
 * Provides a test harness that executes validators without stdin/stdout,
 * making it suitable for unit tests and fast feedback loops.
 * @module
 */

import type { ValidationResult } from '@cards/protocol';
import type { ValidatorFileRequest } from './inputs.js';
import { Logger } from './logger.js';
import type { ValidationContext, ValidationFunction } from './validation.js';

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
 * @param options - Request options
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
}

/**
 * Test harness result.
 */
export interface TestValidationResult {
  /** The result returned by the validator */
  result: ValidationResult;
  /** The context that was passed to the validator */
  context: ValidationContext;
}

/**
 * Test harness for validators.
 *
 * Invokes a validation function with a test request and returns the result.
 * Does not involve process I/O - suitable for unit testing. Errors thrown
 * by the validation function will reject the promise.
 *
 * @param validation - The validation function to test
 * @param request - Test request (or options to create one)
 * @param options - Test options
 * @returns The validation result
 * @example
 * ```typescript
 * import { testValidation, createTestRequest, typeValidation, validationSuccess } from '@cards/configuration';
 *
 * const validator = typeValidation({}, async (request) => {
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
  validation: ValidationFunction,
  request: ValidatorFileRequest | TestRequestOptions,
  options: TestValidationOptions = {}
): Promise<TestValidationResult> {
  const { logger = new Logger() } = options;

  // Convert options to request if needed
  const validationRequest: ValidatorFileRequest =
    'filePath' in request && typeof request.filePath === 'string'
      ? (request as ValidatorFileRequest)
      : createTestRequest(request);

  const context: ValidationContext = { logger };
  const result = await validation(validationRequest, context);

  return { result, context };
}
