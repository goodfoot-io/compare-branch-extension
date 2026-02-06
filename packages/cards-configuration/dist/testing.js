/**
 * Testing utilities for validation handlers.
 *
 * Provides a test harness that executes validators without stdin/stdout,
 * making it suitable for unit tests and fast feedback loops.
 * @module
 */
import { Logger } from './logger.js';
/**
 * Creates a test ValidationRequest from options.
 *
 * This helper normalizes headers, sets Content-Length, and JSON-stringifies
 * object bodies. It mirrors the runtime's ValidationRequest shape without
 * going through stdin parsing.
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
export function createTestRequest(options = {}) {
    const { method = 'PUT', path = '/test', httpVersion = 'HTTP/1.1', headers = {}, body } = options;
    let bodyBuffer;
    let contentType = headers['content-type'] || headers['Content-Type'];
    if (body === undefined) {
        bodyBuffer = Buffer.alloc(0);
    }
    else if (Buffer.isBuffer(body)) {
        bodyBuffer = body;
    }
    else if (typeof body === 'string') {
        bodyBuffer = Buffer.from(body, 'utf-8');
    }
    else {
        // Object - stringify as JSON
        bodyBuffer = Buffer.from(JSON.stringify(body), 'utf-8');
        if (!contentType) {
            contentType = 'application/json';
        }
    }
    const finalHeaders = {
        ...headers,
        'content-length': String(bodyBuffer.length)
    };
    if (contentType) {
        finalHeaders['content-type'] = contentType;
    }
    return {
        method,
        path,
        httpVersion,
        headers: finalHeaders,
        body: bodyBuffer,
        get bodyText() {
            return bodyBuffer.toString('utf-8');
        },
        bodyJson() {
            return JSON.parse(bodyBuffer.toString('utf-8'));
        }
    };
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
 * import { testValidation, createTestRequest, typeValidation, validationCreated } from '@cards/configuration';
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
export async function testValidation(validation, request, options = {}) {
    const { logger = new Logger() } = options;
    // Convert options to request if needed
    const validationRequest = 'bodyText' in request && 'bodyJson' in request ? request : createTestRequest(request);
    const context = { logger };
    const response = await validation(validationRequest, context);
    return { response, context };
}
