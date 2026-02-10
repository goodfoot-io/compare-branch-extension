/**
 * API response envelopes shared across Cards V2 services.
 *
 * These wrappers keep success and error payloads consistent across endpoints
 * without dictating the shape of the actual data payloads.
 *
 * @module types/response
 */

// --- Field Error ---

/**
 * Represents a validation error tied to a specific request field.
 */
export interface FieldError {
  /** Field name or path that failed validation. */
  field: string;
  /** Human-readable error message suitable for display. */
  message: string;
}

// --- API Success ---

/**
 * Successful API response envelope.
 *
 * @typeParam T - Response payload type for the endpoint.
 */
export interface ApiSuccess<T> {
  /** Response payload returned by the endpoint. */
  data: T;
}

// --- API Error ---

/**
 * Error response envelope returned for failed requests.
 */
export interface ApiError {
  /** Human-readable error summary. */
  error: string;
  /** Machine-readable error code for programmatic handling. */
  code: string;
  /** Optional list of field-specific validation errors. */
  fields?: FieldError[];
}
