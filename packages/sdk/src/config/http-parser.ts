/**
 * HTTP request parser for the validation system.
 *
 * Parses a single HTTP request from a complete Buffer. It is intentionally
 * strict: Content-Length is required and chunked encoding is not supported.
 *
 *
 * @summary HTTP request parser for the validation system
 * @deprecated This module is no longer used by the validation system.
 * Validators now use the file-path protocol via `ValidatorFileRequest`
 * instead of parsing HTTP requests from stdin.
 * @module
 */

// ============================================================================
// Types
// ============================================================================

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
   * Header names are normalized to lowercase; duplicate headers overwrite.
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
   *
   * The body is parsed as UTF-8. Throws if the content is not valid JSON.
   * @throws {SyntaxError} If body is not valid JSON
   * @template T - The expected type of the parsed JSON
   */
  bodyJson: <T = unknown>() => T;
}

/**
 * Result of HTTP request parsing.
 *
 * Success case includes the parsed request, failure case includes an error message.
 */
export type ParseResult =
  | {
      success: true;
      request: ValidationRequest;
    }
  | {
      success: false;
      error: string;
    };

// ============================================================================
// Parser Implementation
// ============================================================================

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
 *
 * This parser operates on a single in-memory Buffer. It does not support
 * streaming or chunked transfer encoding.
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
export function parseHttpRequest(input: Buffer): ParseResult {
  let position = 0;

  // Helper to find next line ending (CRLF or LF)
  const findLineEnd = (start: number): number => {
    for (let i = start; i < input.length; i++) {
      if (input[i] === 0x0a) {
        // LF
        return i;
      }
    }
    return -1;
  };

  // Helper to extract line and advance position
  const readLine = (): string | null => {
    const lineEnd = findLineEnd(position);
    if (lineEnd === -1) {
      return null;
    }

    let lineContent: string;
    if (lineEnd > 0 && input[lineEnd - 1] === 0x0d) {
      // CRLF - exclude both CR and LF
      lineContent = input.subarray(position, lineEnd - 1).toString('utf-8');
    } else {
      // LF only - exclude just LF
      lineContent = input.subarray(position, lineEnd).toString('utf-8');
    }

    position = lineEnd + 1; // Move past LF
    return lineContent;
  };

  // Read request line
  const requestLine = readLine();
  if (!requestLine) {
    return { success: false, error: 'Missing request line' };
  }

  const requestParts = requestLine.split(' ');
  if (requestParts.length !== 3) {
    return { success: false, error: 'Invalid request line format' };
  }

  const [method, path, httpVersion] = requestParts as [string, string, string];

  // Read headers until blank line
  const headers: Record<string, string> = {};
  while (true) {
    const line = readLine();
    if (line === null) {
      return { success: false, error: 'Unexpected end of headers' };
    }

    // Blank line indicates end of headers
    if (line === '') {
      break;
    }

    // Parse header: "Name: Value"
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return { success: false, error: `Invalid header format: ${line}` };
    }

    const headerName = line.substring(0, colonIndex).trim().toLowerCase();
    const headerValue = line.substring(colonIndex + 1).trim();
    headers[headerName] = headerValue;
  }

  // Verify Content-Length is present
  const contentLengthStr = headers['content-length'];
  if (!contentLengthStr) {
    return { success: false, error: 'Missing Content-Length header' };
  }

  const contentLength = parseInt(contentLengthStr, 10);
  if (Number.isNaN(contentLength) || contentLength < 0) {
    return { success: false, error: 'Invalid Content-Length value' };
  }

  // Read exactly Content-Length bytes for body
  if (position + contentLength > input.length) {
    return {
      success: false,
      error: `Body too short: expected ${contentLength} bytes, got ${input.length - position}`
    };
  }

  const body = input.subarray(position, position + contentLength);

  // Create request object with convenience getters
  const request: ValidationRequest = {
    method,
    path,
    httpVersion,
    headers,
    body,
    get bodyText(): string {
      return body.toString('utf-8');
    },
    bodyJson<T = unknown>(): T {
      return JSON.parse(body.toString('utf-8')) as T;
    }
  };

  return { success: true, request };
}
