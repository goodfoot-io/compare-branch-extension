/**
 * Testing utilities for validation handlers.
 *
 * Provides a test harness for validators that allows testing without
 * process I/O operations.
 * @module
 */
import { Logger } from './logger.js';
import type { ValidationContext, ValidationFunction, ValidationRequest, ValidationResponse } from './validation.js';
/**
 * Options for creating a test request.
 */
export interface TestRequestOptions {
    /** HTTP method (default: 'PUT') */
    method?: string;
    /** Request path (default: '/test') */
    path?: string;
    /** HTTP version (default: 'HTTP/1.1') */
    httpVersion?: string;
    /** Request headers */
    headers?: Record<string, string>;
    /** Request body as string, Buffer, or object (object will be JSON-stringified) */
    body?: string | Buffer | object;
}
/**
 * Creates a test ValidationRequest from options.
 *
 * @param options - Request options
 * @returns A ValidationRequest suitable for testing
 * @example
 * ```typescript
 * const request = createTestRequest({
 *   method: 'PUT',
 *   path: '/contract/api.json',
 *   body: { openapi: '3.0.0' }
 * });
 * ```
 */
export declare function createTestRequest(options?: TestRequestOptions): ValidationRequest;
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
    /** The response returned by the validator */
    response: ValidationResponse;
    /** The context that was passed to the validator */
    context: ValidationContext;
}
/**
 * Test harness for validators.
 *
 * Invokes a validation function with a test request and returns the result.
 * Does not involve process I/O - suitable for unit testing.
 *
 * @param validation - The validation function to test
 * @param request - Test request (or options to create one)
 * @param options - Test options
 * @returns The validation result
 * @example
 * ```typescript
 * import { testValidation, createTestRequest, typeValidation, validationCreated } from '@goodfoot/compare-branch-configuration';
 *
 * const validator = typeValidation({}, async (request) => {
 *   const data = request.bodyJson<{ name: string }>();
 *   return validationCreated({ name: data.name });
 * });
 *
 * const result = await testValidation(validator, {
 *   body: { name: 'test' }
 * });
 *
 * expect(result.response.status).toBe(201);
 * expect(result.response.metadata).toEqual({ name: 'test' });
 * ```
 */
export declare function testValidation(validation: ValidationFunction, request: ValidationRequest | TestRequestOptions, options?: TestValidationOptions): Promise<TestValidationResult>;
//# sourceMappingURL=testing.d.ts.map