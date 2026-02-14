/**
 * Adaptive Card validator for custom types validation system.
 *
 * Validates Adaptive Card structure for the 'adaptive-card' custom type.
 * Reuses validation logic patterns from @cards/validator.
 *
 * IMPORTANT: Status is NOT stored in the file - it's derived at read time from
 * adaptive-card-submission existence. The validator does NOT validate status field.
 *
 * @summary Adaptive Card validator for custom types validation system
 */

import { readFileSync } from 'node:fs';
import { defineTypeValidator, validationError, validationSuccess } from '@cards/sdk/config';

/**
 * Adaptive Card input structure (without status - it's derived, not stored)
 */
interface AdaptiveCardInput {
  id?: unknown;
  summary?: unknown;
  author?: unknown;
  payload?: unknown;
  [key: string]: unknown;
}

const MAX_SUMMARY_LENGTH = 200;

/**
 * Checks if a value is a non-null, non-array object.
 *
 * @param value Value to test as a plain object.
 * @returns True when the value is an object record.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validation error type alias.
 */
type ValError = { code: string; message: string; field?: string };

/**
 * Validates required string field.
 *
 * @param obj Object being validated.
 * @param field Field name that must be a non-empty string.
 * @param errors Collection where validation errors are accumulated.
 */
function validateRequiredString(obj: Record<string, unknown>, field: string, errors: ValError[]): void {
  const value = obj[field];
  if (value === undefined || value === null) {
    errors.push({ code: 'REQUIRED', message: `${field} is required`, field });
  } else if (typeof value !== 'string') {
    errors.push({ code: 'INVALID_TYPE', message: `${field} must be a string`, field });
  } else if (value.trim().length === 0) {
    errors.push({ code: 'EMPTY', message: `${field} must not be empty`, field });
  }
}

/**
 * Validates that an optional field is an array if present.
 *
 * @param obj Object being validated.
 * @param field Field name that may contain an array.
 * @param path Error field path used in messages.
 * @param errors Collection where validation errors are accumulated.
 */
function validateOptionalArray(obj: Record<string, unknown>, field: string, path: string, errors: ValError[]): void {
  const value = obj[field];
  if (value !== undefined && value !== null && !Array.isArray(value)) {
    errors.push({ code: 'INVALID_TYPE', message: `${path} must be an array`, field: path });
  }
}

/**
 * Validates the Adaptive Card schema.
 *
 * @param adaptiveCard Payload object expected to match Adaptive Card schema.
 * @param errors Collection where schema validation errors are accumulated.
 */
function validateAdaptiveCardSchema(adaptiveCard: Record<string, unknown>, errors: ValError[]): void {
  // type is required and must be 'AdaptiveCard'
  if (adaptiveCard['type'] === undefined || adaptiveCard['type'] === null) {
    errors.push({ code: 'REQUIRED', message: 'payload.type is required', field: 'payload.type' });
  } else if (adaptiveCard['type'] !== 'AdaptiveCard') {
    errors.push({ code: 'INVALID_VALUE', message: "payload.type must be 'AdaptiveCard'", field: 'payload.type' });
  }

  // body is optional but must be an array if present
  validateOptionalArray(adaptiveCard, 'body', 'payload.body', errors);

  // actions is optional but must be an array if present
  validateOptionalArray(adaptiveCard, 'actions', 'payload.actions', errors);
}

/**
 * Type validator for adaptive-card files.
 *
 * Validates JSON structure including required fields (id, summary, author, payload)
 * and the Adaptive Card schema within the payload.
 */
export default defineTypeValidator(
  {
    typeName: 'adaptive-card',
    schema: 'JSON object with id, summary, author, and payload (Adaptive Card schema with type, body, actions)',
    description: 'Interactive Adaptive Card definitions for user-facing UI components',
    timeout: 30000
  },
  async (request, context) => {
    const errors: ValError[] = [];

    context.logger.info('Validating adaptive card', { fileName: context.fileName });

    // Parse JSON from file
    let data: AdaptiveCardInput;
    try {
      const content = readFileSync(request.filePath, 'utf-8');
      data = JSON.parse(content) as AdaptiveCardInput;
    } catch {
      return validationError(['File must contain valid JSON']);
    }

    // Validate id field
    validateRequiredString(data, 'id', errors);

    // Validate summary field with length constraint
    validateRequiredString(data, 'summary', errors);
    if (typeof data.summary === 'string' && data.summary.length > MAX_SUMMARY_LENGTH) {
      errors.push({
        code: 'SUMMARY_TOO_LONG',
        message: `summary must not exceed ${MAX_SUMMARY_LENGTH} characters`,
        field: 'summary'
      });
    }

    // Validate author field
    validateRequiredString(data, 'author', errors);

    // Validate payload field (required object with Adaptive Card schema)
    if (data.payload === undefined || data.payload === null) {
      errors.push({ code: 'REQUIRED', message: 'payload is required', field: 'payload' });
    } else if (!isObject(data.payload)) {
      errors.push({ code: 'INVALID_TYPE', message: 'payload must be an object', field: 'payload' });
    } else {
      validateAdaptiveCardSchema(data.payload, errors);
    }

    if (errors.length > 0) {
      return validationError(errors.map((e) => (e.field ? `**${e.field}**: ${e.message}` : e.message)));
    }

    context.logger.info('Adaptive card validation succeeded', {
      cardId: data.id as string,
      author: data.author as string
    });

    return validationSuccess({ cardId: data.id as string });
  }
);
