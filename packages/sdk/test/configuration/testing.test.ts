import { describe, expect, it } from 'vitest';
import { defineTypeValidator } from '../../src/config/factories/type-hooks.js';
import type { ValidatorFileRequest } from '../../src/config/inputs.js';
import { createTestRequest, testValidation } from '../../src/config/testing.js';
import { validationError, validationSuccess } from '../../src/config/validation.js';

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

      const validator = defineTypeValidator({ typeName: 'test' }, async (request) => {
        receivedRequest = request;
        return validationSuccess();
      });

      await testValidation(validator, { filePath: '/test/data.json' });

      expect(receivedRequest).toBeDefined();
      expect(receivedRequest!.filePath).toBe('/test/data.json');
    });

    it('returns result from validator', async () => {
      const validator = defineTypeValidator({ typeName: 'test' }, async () => {
        return validationSuccess({ processed: true });
      });

      const { result } = await testValidation(validator, {});

      expect(result.valid).toBe(true);
      expect((result as { valid: true; metadata?: Record<string, unknown> }).metadata).toEqual({ processed: true });
    });

    it('handles validation errors', async () => {
      const validator = defineTypeValidator({ typeName: 'test' }, async () => {
        return validationError(['Invalid input']);
      });

      const { result } = await testValidation(validator, {});

      expect(result.valid).toBe(false);
      expect((result as { valid: false; errors: string[] }).errors).toHaveLength(1);
    });

    it('accepts TestRequestOptions directly', async () => {
      const validator = defineTypeValidator({ typeName: 'test' }, async (request) => {
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

      const validator = defineTypeValidator({ typeName: 'test' }, async (req) => {
        return validationSuccess({ id: req.metadata?.['id'] });
      });

      const { result } = await testValidation(validator, request);

      expect((result as { valid: true; metadata?: Record<string, unknown> }).metadata).toEqual({ id: 1 });
    });

    it('provides context to validator', async () => {
      let receivedContext: unknown;

      const validator = defineTypeValidator({ typeName: 'test' }, async (_request, context) => {
        receivedContext = context;
        return validationSuccess();
      });

      const { context } = await testValidation(validator, {});

      expect(receivedContext).toBe(context);
      expect(context.logger).toBeDefined();
      expect(context.typeName).toBeDefined();
      expect(context.cwd).toBeDefined();
    });

    it('testValidation accepts TypeValidatorCommand directly', async () => {
      const validator = defineTypeValidator({ typeName: 'my-type' }, async () => {
        return validationSuccess();
      });

      const { result } = await testValidation(validator, {});

      expect(result.valid).toBe(true);
    });

    it('TestValidationResult.context is TypeValidatorContext', async () => {
      const validator = defineTypeValidator({ typeName: 'test' }, async () => {
        return validationSuccess();
      });

      const { context } = await testValidation(validator, {});

      expect(context).toHaveProperty('logger');
      expect(context).toHaveProperty('cwd');
      expect(context).toHaveProperty('typeName');
      expect(context).toHaveProperty('typeVersion');
      expect(context).toHaveProperty('fileName');
      expect(context).toHaveProperty('cardId');
      expect(context).toHaveProperty('environment');
      expect(context).toHaveProperty('apiBaseUrl');
      expect(context).toHaveProperty('apiAccessToken');
    });

    it('testValidation uses default context values', async () => {
      const validator = defineTypeValidator({ typeName: 'test' }, async (_request, context) => {
        expect(context.typeName).toBe('');
        expect(context.typeVersion).toBe('');
        expect(context.fileName).toBe('');
        expect(context.cardId).toBe('');
        expect(context.environment).toBe('');
        expect(context.apiBaseUrl).toBe('');
        expect(context.apiAccessToken).toBe('');
        expect(context.cwd).toBe(process.cwd());
        return validationSuccess();
      });

      await testValidation(validator, {});
    });

    it('testValidation accepts context overrides via options', async () => {
      const validator = defineTypeValidator({ typeName: 'test' }, async (_request, context) => {
        expect(context.typeName).toBe('custom-type');
        expect(context.typeVersion).toBe('2.0');
        expect(context.fileName).toBe('custom.json');
        expect(context.cardId).toBe('card-123');
        expect(context.environment).toBe('staging');
        expect(context.apiBaseUrl).toBe('https://api.example.com');
        expect(context.apiAccessToken).toBe('token-abc');
        expect(context.cwd).toBe('/custom/cwd');
        return validationSuccess();
      });

      await testValidation(
        validator,
        {},
        {
          context: {
            typeName: 'custom-type',
            typeVersion: '2.0',
            fileName: 'custom.json',
            cardId: 'card-123',
            environment: 'staging',
            apiBaseUrl: 'https://api.example.com',
            apiAccessToken: 'token-abc',
            cwd: '/custom/cwd'
          }
        }
      );
    });
  });
});
