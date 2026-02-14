/**
 * Tests for Adaptive Card submission validator.
 *
 * Adaptive Card submissions track when a user submits a response to an Adaptive Card.
 * They reference the Adaptive Card ID and contain the action data.
 *
 * @summary Tests for Adaptive Card submission validator
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TypeValidatorContext, ValidatorFileRequest } from '@cards/sdk/config';
import type { ValidationResult } from '@cards/sdk/protocol';
import { afterEach, describe, expect, it } from 'vitest';
import validateSubmission from '../../src/validators/adaptive-card-submission-validator.js';

/**
 * Temp directories created during tests, cleaned up in afterEach.
 */
const tempDirs: string[] = [];

/**
 * Creates a temp file with the given content and returns a ValidatorFileRequest.
 *
 * @param content JSON payload string or object to persist.
 * @param fileName File name to create in the temp directory.
 * @returns Validator file request pointing to the generated temp file.
 */
function createRequestFile(content: string | object, fileName = 'test.json'): ValidatorFileRequest {
  const dir = mkdtempSync(join(tmpdir(), 'validator-test-'));
  tempDirs.push(dir);
  const filePath = join(dir, fileName);
  const bodyText = typeof content === 'string' ? content : JSON.stringify(content);
  writeFileSync(filePath, bodyText);
  return { filePath };
}

/**
 * Creates a mock TypeValidatorContext.
 *
 * @param overrides Optional context field overrides for a test case.
 * @returns A complete validator context with defaults plus overrides.
 */
function createContext(overrides: Partial<TypeValidatorContext> = {}): TypeValidatorContext {
  return {
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      logError: () => {}
    } as TypeValidatorContext['logger'],
    cwd: '/tmp/test',
    typeName: 'adaptive-card-submission',
    typeVersion: '1.0.0',
    fileName: 'test.json',
    cardId: 'test-card',
    environment: 'default',
    apiBaseUrl: 'http://localhost:3000',
    apiAccessToken: 'test-token',
    ...overrides
  };
}

/**
 * Helper to get error messages from a failed ValidationResult.
 *
 * @param result Validation result returned by the validator.
 * @returns Error messages when invalid; otherwise an empty array.
 */
function getErrors(result: ValidationResult): string[] {
  if (!result.valid) {
    return result.errors;
  }
  return [];
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe('adaptive-card-submission-validator', () => {
  describe('valid submissions', () => {
    it('passes for valid submission with all required fields', async () => {
      const submissionData = {
        cardId: 'card-123',
        actionId: 'submit-button',
        data: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(true);
    });

    it('passes for valid submission with empty data object', async () => {
      const submissionData = {
        cardId: 'card-456',
        actionId: 'action-1',
        data: {}
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(true);
    });

    it('passes for submission with complex nested data', async () => {
      const submissionData = {
        cardId: 'card-789',
        actionId: 'complex-action',
        data: {
          user: {
            name: 'Jane',
            preferences: {
              notifications: true,
              theme: 'dark'
            }
          },
          items: ['item1', 'item2']
        }
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid JSON', () => {
    it('returns error for invalid JSON in file', async () => {
      const result = await validateSubmission(createRequestFile('{ not valid json }'), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('valid JSON'))).toBe(true);
    });

    it('returns error for empty file', async () => {
      const result = await validateSubmission(createRequestFile(''), createContext());
      expect(result.valid).toBe(false);
    });
  });

  describe('missing required fields', () => {
    it('returns error for missing cardId', async () => {
      const submissionData = {
        actionId: 'action-1',
        data: {}
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('cardId is required'))).toBe(true);
    });

    it('returns error for missing actionId', async () => {
      const submissionData = {
        cardId: 'card-123',
        data: {}
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('actionId is required'))).toBe(true);
    });

    it('returns error for missing data', async () => {
      const submissionData = {
        cardId: 'card-123',
        actionId: 'action-1'
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('data is required'))).toBe(true);
    });

    it('returns error for multiple missing fields', async () => {
      const submissionData = {
        cardId: 'card-only'
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).length).toBeGreaterThan(1);
    });
  });

  describe('empty field values', () => {
    it('returns error for empty cardId', async () => {
      const submissionData = {
        cardId: '',
        actionId: 'action-1',
        data: {}
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('cardId must not be empty'))).toBe(true);
    });

    it('returns error for whitespace-only cardId', async () => {
      const submissionData = {
        cardId: '   ',
        actionId: 'action-1',
        data: {}
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('cardId must not be empty'))).toBe(true);
    });

    it('returns error for empty actionId', async () => {
      const submissionData = {
        cardId: 'card-123',
        actionId: '',
        data: {}
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('actionId must not be empty'))).toBe(true);
    });
  });

  describe('invalid field types', () => {
    it('returns error for non-string cardId', async () => {
      const submissionData = {
        cardId: 123,
        actionId: 'action-1',
        data: {}
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('cardId must be a string'))).toBe(true);
    });

    it('returns error for null cardId', async () => {
      const submissionData = {
        cardId: null,
        actionId: 'action-1',
        data: {}
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('cardId is required'))).toBe(true);
    });

    it('returns error for non-string actionId', async () => {
      const submissionData = {
        cardId: 'card-123',
        actionId: { id: 1 },
        data: {}
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('actionId must be a string'))).toBe(true);
    });

    it('returns error for non-object data', async () => {
      const submissionData = {
        cardId: 'card-123',
        actionId: 'action-1',
        data: 'not an object'
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('data must be an object'))).toBe(true);
    });

    it('returns error for array data', async () => {
      const submissionData = {
        cardId: 'card-123',
        actionId: 'action-1',
        data: ['not', 'an', 'object']
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('data must be an object'))).toBe(true);
    });

    it('returns error for null data', async () => {
      const submissionData = {
        cardId: 'card-123',
        actionId: 'action-1',
        data: null
      };

      const result = await validateSubmission(createRequestFile(submissionData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('data is required'))).toBe(true);
    });
  });
});
