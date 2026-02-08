import { describe, expect, it } from 'vitest';
import type { ValidatorFileRequest } from '../src/inputs.js';
import { createTestRequest, testValidation } from '../src/testing.js';
import { typeValidation, validationError, validationSuccess } from '../src/validation.js';

describe('Testing Utilities', () => {
  describe('createTestRequest', () => {
    it('creates request with defaults', () => {
      const request = createTestRequest();
      expect(request.filePath).toBe('/test/file.json');
      expect(request.metadata).toBeUndefined();
    });

    it('creates request with custom filePath', () => {
      const request = createTestRequest({
        filePath: '/custom/path/data.json'
      });
      expect(request.filePath).toBe('/custom/path/data.json');
    });

    it('creates request with metadata', () => {
      const request = createTestRequest({
        filePath: '/test/file.json',
        metadata: { version: '1.0', custom: true }
      });
      expect(request.metadata).toEqual({ version: '1.0', custom: true });
    });

    it('creates request without metadata', () => {
      const request = createTestRequest({ filePath: '/test/file.json' });
      expect(request.metadata).toBeUndefined();
    });
  });

  describe('testValidation', () => {
    it('invokes validator with request and context', async () => {
      let receivedRequest: ValidatorFileRequest | undefined;

      const validator = typeValidation({}, async (request) => {
        receivedRequest = request;
        return validationSuccess();
      });

      await testValidation(validator, { filePath: '/test/data.json' });

      expect(receivedRequest).toBeDefined();
      expect(receivedRequest!.filePath).toBe('/test/data.json');
    });

    it('returns result from validator', async () => {
      const validator = typeValidation({}, async () => {
        return validationSuccess({ processed: true });
      });

      const { result } = await testValidation(validator, {});

      expect(result.valid).toBe(true);
      expect((result as { valid: true; metadata?: Record<string, unknown> }).metadata).toEqual({ processed: true });
    });

    it('handles validation errors', async () => {
      const validator = typeValidation({}, async () => {
        return validationError(['Invalid input']);
      });

      const { result } = await testValidation(validator, {});

      expect(result.valid).toBe(false);
      expect((result as { valid: false; errors: string[] }).errors).toHaveLength(1);
    });

    it('accepts TestRequestOptions directly', async () => {
      const validator = typeValidation({}, async (request) => {
        return validationSuccess({ path: request.filePath });
      });

      const { result } = await testValidation(validator, {
        filePath: '/contract.json'
      });

      expect((result as { valid: true; metadata?: Record<string, unknown> }).metadata).toEqual({
        path: '/contract.json'
      });
    });

    it('accepts ValidatorFileRequest directly', async () => {
      const request = createTestRequest({ filePath: '/test/data.json', metadata: { id: 1 } });

      const validator = typeValidation({}, async (req) => {
        return validationSuccess({ id: req.metadata?.id });
      });

      const { result } = await testValidation(validator, request);

      expect((result as { valid: true; metadata?: Record<string, unknown> }).metadata).toEqual({ id: 1 });
    });

    it('provides context to validator', async () => {
      let receivedContext: unknown;

      const validator = typeValidation({}, async (_request, context) => {
        receivedContext = context;
        return validationSuccess();
      });

      const { context } = await testValidation(validator, {});

      expect(receivedContext).toBe(context);
      expect(context.logger).toBeDefined();
    });
  });
});
