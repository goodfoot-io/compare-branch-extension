/**
 * HTTP request parser for the validation system.
 *
 * Parses a single HTTP request from a complete Buffer. It is intentionally
 * strict: Content-Length is required and chunked encoding is not supported.
 * @module
 */
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
export function parseHttpRequest(input) {
  let position = 0;
  // Helper to find next line ending (CRLF or LF)
  const findLineEnd = (start) => {
    for (let i = start; i < input.length; i++) {
      if (input[i] === 0x0a) {
        // LF
        return i;
      }
    }
    return -1;
  };
  // Helper to extract line and advance position
  const readLine = () => {
    const lineEnd = findLineEnd(position);
    if (lineEnd === -1) {
      return null;
    }
    let lineContent;
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
  const [method, path, httpVersion] = requestParts;
  // Read headers until blank line
  const headers = {};
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
  const request = {
    method,
    path,
    httpVersion,
    headers,
    body,
    get bodyText() {
      return body.toString('utf-8');
    },
    bodyJson() {
      return JSON.parse(body.toString('utf-8'));
    }
  };
  return { success: true, request };
}
