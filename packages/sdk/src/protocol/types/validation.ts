/**
 * Validation error codes used for structured error handling.
 *
 * These codes are serialized across API boundaries and should remain stable.
 *
 *
 * @summary Validation error codes used for structured error handling
 * @module types/validation
 */

/**
 * Validation error codes for programmatic error handling.
 *
 * `warning_*` codes indicate non-blocking issues, while the rest are treated as
 * validation failures. Use `'unknown'` as a fallback for gradual migration.
 *
 * @example
 * ```typescript
 * interface FieldValidationError {
 *   field: string;
 *   message: string;
 *   code: ValidationErrorCode;
 * }
 *
 * function handleError(error: FieldValidationError): void {
 *   switch (error.code) {
 *     case 'missing_field':
 *       console.log(`Required field missing: ${error.field}`);
 *       break;
 *     case 'invalid_status':
 *       console.log(`Invalid status for field: ${error.field}`);
 *       break;
 *     case 'unknown':
 *       console.log(`Unrecognized error: ${error.message}`);
 *       break;
 *     default:
 *       break;
 *   }
 * }
 * ```
 */
export type ValidationErrorCode =
  | 'missing_field'
  | 'invalid_type'
  | 'invalid_status'
  | 'invalid_format'
  | 'length_exceeded'
  | 'pattern_mismatch'
  | 'cyclic_dependency'
  | 'missing_reference'
  | 'duplicate_id'
  | 'invalid_gate'
  | 'invalid_gate_logic'
  | 'malformed_json'
  | 'metadata_missing'
  | 'encoding_error'
  | 'file_not_found'
  | 'attachment_not_found'
  | 'invalid_attachment_id'
  | 'blocked_without_dependencies'
  | 'warning_completed_without_output'
  | 'warning_active_without_actions'
  | 'unknown';
