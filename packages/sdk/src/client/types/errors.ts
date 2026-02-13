/**
 * Error classes for the Cards V2 SDK.
 *
 * These errors normalize server responses and network failures so callers can
 * distinguish API validation problems from transport issues.
 *
 *
 * @summary Error classes for the Cards V2 SDK
 * @module types/errors
 */

import type { FieldError } from '../../protocol/index.js';

/**
 * Error thrown when an API request fails with an error response.
 *
 * @example
 * ```typescript
 * try {
 *   await client.createCard(data);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error(`API error [${error.code}]: ${error.message}`);
 *     if (error.fields) {
 *       error.fields.forEach(f => console.error(`  ${f.field}: ${f.message}`));
 *     }
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /**
   * Creates a new ApiError instance.
   *
   * @param message - Human-readable error message
   * @param code - Machine-readable error code
   * @param fields - Optional array of field-specific validation errors
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly fields?: FieldError[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Error thrown when a network request fails due to connectivity issues.
 *
 * @example
 * ```typescript
 * try {
 *   await client.listCards();
 * } catch (error) {
 *   if (error instanceof NetworkError) {
 *     console.error(`Network error: ${error.message}`);
 *     if (error.cause) {
 *       console.error(`Caused by: ${error.cause.message}`);
 *     }
 *   }
 * }
 * ```
 */
export class NetworkError extends Error {
  /**
   * Creates a new NetworkError instance.
   *
   * @param message - Human-readable error message
   * @param cause - Optional underlying error that caused this network failure
   */
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}
