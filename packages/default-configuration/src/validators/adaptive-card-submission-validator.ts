/**
 * Adaptive Card submission validator for custom types validation system.
 *
 * Validates Adaptive Card submission structure for the 'adaptive-card-submission' custom type.
 * Adaptive Card submissions track when a user submits a response to an Adaptive Card.
 *
 * NOTE: This validator validates the structure only. Verification that the
 * referenced Adaptive Card exists is handled at the HybridStore level when writing the file.
 */

import { readFileSync } from 'node:fs';
import { defineTypeValidator, validationError, validationSuccess } from '@cards/sdk/config';

/**
 * Adaptive Card submission input structure
 */
interface AdaptiveCardSubmissionInput {
  cardId?: unknown;
  actionId?: unknown;
  data?: unknown;
  [key: string]: unknown;
}

/**
 * Validation error type alias.
 */
type ValError = { code: string; message: string; field?: string };

/**
 * Checks if a value is a non-null, non-array object.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates required string field.
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
 * Type validator for adaptive-card-submission files.
 *
 * Validates JSON structure including required fields (cardId, actionId, data).
 * Does not validate that the referenced card exists - that's handled at the store level.
 */
export default defineTypeValidator(
  { typeName: 'adaptive-card-submission', timeout: 30000 },
  async (request, context) => {
    const errors: ValError[] = [];

    context.logger.info('Validating adaptive card submission', { fileName: context.fileName });

    // Parse JSON from file
    let submission: AdaptiveCardSubmissionInput;
    try {
      const content = readFileSync(request.filePath, 'utf-8');
      submission = JSON.parse(content) as AdaptiveCardSubmissionInput;
    } catch {
      return validationError(['File must contain valid JSON']);
    }

    // Validate cardId field
    validateRequiredString(submission, 'cardId', errors);

    // Validate actionId field
    validateRequiredString(submission, 'actionId', errors);

    // Validate data field
    if (submission.data === undefined || submission.data === null) {
      errors.push({ code: 'REQUIRED', message: 'data is required', field: 'data' });
    } else if (!isObject(submission.data)) {
      errors.push({ code: 'INVALID_TYPE', message: 'data must be an object', field: 'data' });
    }

    if (errors.length > 0) {
      return validationError(errors.map((e) => (e.field ? `**${e.field}**: ${e.message}` : e.message)));
    }

    context.logger.info('Adaptive card submission validation succeeded', {
      cardId: submission.cardId as string,
      actionId: submission.actionId as string
    });

    return validationSuccess({ cardId: submission.cardId as string });
  }
);
