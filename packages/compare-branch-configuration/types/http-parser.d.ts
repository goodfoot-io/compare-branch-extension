/**
 * HTTP request parser for validation system.
 *
 * Provides binary-safe HTTP request parsing with support for reading
 * request line, headers, and body content based on Content-Length.
 * @module
 */
/**
 * Parsed HTTP request for validation.
 *
 * Contains all components of an HTTP request with convenience methods
 * for accessing the body as text or JSON.
 * @example
 * ```typescript
 * const result = parseHttpRequest(buffer);
 * if (result.success) {
 *   const req = result.request;
 *   console.log(`${req.method} ${req.path}`);
 *   const data = req.bodyJson<MyType>();
 * }
 * ```
 */
export interface ValidationRequest {
    /**
     * HTTP method (e.g., 'PUT', 'POST').
     */
    method: string;
    /**
     * Request path (e.g., '/contract/api-v2.json').
     */
    path: string;
    /**
     * HTTP version (e.g., 'HTTP/1.1').
     */
    httpVersion: string;
    /**
     * HTTP headers as key-value pairs.
     * Header names are normalized to lowercase.
     */
    headers: Record<string, string>;
    /**
     * Raw body content as a Buffer.
     * Binary-safe and limited to exactly Content-Length bytes.
     */
    body: Buffer;
    /**
     * Convenience getter for body as UTF-8 string.
     */
    bodyText: string;
    /**
     * Convenience getter for body parsed as JSON.
     * @throws {SyntaxError} If body is not valid JSON
     * @template T - The expected type of the parsed JSON
     */
    bodyJson: <T = unknown>() => T;
}
/**
 * Result of HTTP request parsing.
 *
 * Success case includes the parsed request, failure case includes error message.
 */
export type ParseResult = {
    success: true;
    request: ValidationRequest;
} | {
    success: false;
    error: string;
};
/**
 * Parses an HTTP request from a buffer.
 *
 * Reads request line (METHOD PATH HTTP/VERSION), headers until blank line,
 * and exactly Content-Length bytes of body. Returns error if Content-Length
 * header is missing.
 *
 * ## Supported Line Endings
 *
 * - CRLF (\\r\\n) - standard HTTP
 * - LF (\\n) - lenient parsing
 *
 * ## Binary Safety
 *
 * The body is read as raw bytes and stored in a Buffer. This allows
 * validation of binary content types without corruption.
 * @param input - The raw HTTP request as a Buffer
 * @returns ParseResult with either the parsed request or an error
 * @example
 * ```typescript
 * const httpRequest = Buffer.from(
 *   'PUT /file HTTP/1.1\\r\\n' +
 *   'Content-Type: application/json\\r\\n' +
 *   'Content-Length: 13\\r\\n' +
 *   '\\r\\n' +
 *   '{"key":"value"}'
 * );
 *
 * const result = parseHttpRequest(httpRequest);
 * if (result.success) {
 *   console.log(result.request.method); // 'PUT'
 *   console.log(result.request.bodyJson()); // { key: 'value' }
 * }
 * ```
 */
export declare function parseHttpRequest(input: Buffer): ParseResult;
//# sourceMappingURL=http-parser.d.ts.map