/**
 * Tests for Adaptive Card validator - validates Adaptive Card structure for custom types system.
 *
 * IMPORTANT: Status is NOT stored in the file - it's derived at read time.
 * The validator should NOT validate status field.
 *
 * @summary Tests for Adaptive Card validator - validates Adaptive Card structure for custom types
 * system
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TypeValidatorContext, ValidatorFileRequest } from '@cards/sdk/config';
import type { ValidationResult } from '@cards/sdk/protocol';
import { afterEach, describe, expect, it } from 'vitest';
import validateAdaptiveCard from '../../src/validators/adaptive-card-validator.js';

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
    typeName: 'adaptive-card',
    typeVersion: '1.0.0',
    fileName: 'test.json',
    cardId: 'test-card',
    environment: 'default',
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

describe('adaptive-card-validator', () => {
  describe('valid cards', () => {
    it('passes for valid card with all required fields', async () => {
      const cardData = {
        id: 'card-1',
        summary: 'Test card summary',
        author: 'user@example.com',
        payload: {
          type: 'AdaptiveCard',
          version: '1.5',
          body: []
        }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(true);
    });

    it('passes for card with body and actions', async () => {
      const cardData = {
        id: 'card-2',
        summary: 'Card with content',
        author: 'test-user',
        payload: {
          type: 'AdaptiveCard',
          version: '1.5',
          body: [{ type: 'TextBlock', text: 'Hello World' }],
          actions: [{ type: 'Action.Submit', title: 'Submit' }]
        }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(true);
    });

    it('passes for minimal valid card', async () => {
      const cardData = {
        id: 'card-minimal',
        summary: 'Minimal card',
        author: 'user',
        payload: {
          type: 'AdaptiveCard'
        }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(true);
    });

    it('passes for card with exactly max summary length', async () => {
      const cardData = {
        id: 'card-max-summary',
        summary: 'x'.repeat(200),
        author: 'user',
        payload: { type: 'AdaptiveCard' }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid JSON', () => {
    it('returns error for invalid JSON in file', async () => {
      const result = await validateAdaptiveCard(createRequestFile('{ not valid json }'), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('valid JSON'))).toBe(true);
    });

    it('returns error for empty file', async () => {
      const result = await validateAdaptiveCard(createRequestFile(''), createContext());
      expect(result.valid).toBe(false);
    });
  });

  describe('missing required fields', () => {
    it('returns error for missing id', async () => {
      const cardData = {
        summary: 'Card without id',
        author: 'user',
        payload: { type: 'AdaptiveCard' }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('id is required'))).toBe(true);
    });

    it('returns error for missing summary', async () => {
      const cardData = {
        id: 'card-no-summary',
        author: 'user',
        payload: { type: 'AdaptiveCard' }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('summary is required'))).toBe(true);
    });

    it('returns error for missing author', async () => {
      const cardData = {
        id: 'card-no-author',
        summary: 'Test',
        payload: { type: 'AdaptiveCard' }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('author is required'))).toBe(true);
    });

    it('returns error for missing payload', async () => {
      const cardData = {
        id: 'card-no-payload',
        summary: 'Test',
        author: 'user'
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('payload is required'))).toBe(true);
    });

    it('returns error for multiple missing fields', async () => {
      const cardData = {
        summary: 'Only summary'
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).length).toBeGreaterThan(1);
    });
  });

  describe('empty field values', () => {
    it('returns error for empty id', async () => {
      const cardData = {
        id: '',
        summary: 'Test',
        author: 'user',
        payload: { type: 'AdaptiveCard' }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('id must not be empty'))).toBe(true);
    });

    it('returns error for whitespace-only id', async () => {
      const cardData = {
        id: '   ',
        summary: 'Test',
        author: 'user',
        payload: { type: 'AdaptiveCard' }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('id must not be empty'))).toBe(true);
    });
  });

  describe('invalid field types', () => {
    it('returns error for non-string id', async () => {
      const cardData = {
        id: 123,
        summary: 'Test',
        author: 'user',
        payload: { type: 'AdaptiveCard' }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('id must be a string'))).toBe(true);
    });

    it('returns error for null id', async () => {
      const cardData = {
        id: null,
        summary: 'Test',
        author: 'user',
        payload: { type: 'AdaptiveCard' }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('id is required'))).toBe(true);
    });
  });

  describe('summary length validation', () => {
    it('returns error for summary exceeding max length', async () => {
      const cardData = {
        id: 'card-long-summary',
        summary: 'x'.repeat(201),
        author: 'user',
        payload: { type: 'AdaptiveCard' }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('summary must not exceed 200 characters'))).toBe(true);
    });
  });

  describe('payload validation', () => {
    it('returns error for non-object payload', async () => {
      const cardData = {
        id: 'card-bad-payload',
        summary: 'Test',
        author: 'user',
        payload: 'not an object'
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('payload must be an object'))).toBe(true);
    });

    it('returns error for array payload', async () => {
      const cardData = {
        id: 'card-array-payload',
        summary: 'Test',
        author: 'user',
        payload: ['not', 'an', 'object']
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('payload must be an object'))).toBe(true);
    });

    it('returns error for missing payload.type', async () => {
      const cardData = {
        id: 'card-no-type',
        summary: 'Test',
        author: 'user',
        payload: {}
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('payload.type is required'))).toBe(true);
    });

    it('returns error for wrong payload.type', async () => {
      const cardData = {
        id: 'card-wrong-type',
        summary: 'Test',
        author: 'user',
        payload: { type: 'NotAdaptiveCard' }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes("payload.type must be 'AdaptiveCard'"))).toBe(true);
    });

    it('returns error for non-array body', async () => {
      const cardData = {
        id: 'card-bad-body',
        summary: 'Test',
        author: 'user',
        payload: {
          type: 'AdaptiveCard',
          body: 'not an array'
        }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('payload.body must be an array'))).toBe(true);
    });

    it('returns error for non-array actions', async () => {
      const cardData = {
        id: 'card-bad-actions',
        summary: 'Test',
        author: 'user',
        payload: {
          type: 'AdaptiveCard',
          actions: { submit: true }
        }
      };

      const result = await validateAdaptiveCard(createRequestFile(cardData), createContext());
      expect(result.valid).toBe(false);
      expect(getErrors(result).some((e) => e.includes('payload.actions must be an array'))).toBe(true);
    });
  });
});
