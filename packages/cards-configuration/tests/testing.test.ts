import { describe, expect, it } from 'vitest';
import { createTestRequest, testValidation } from '../src/testing.js';
import type { ValidationRequest } from '../src/validation.js';
import { typeValidation, validationCreated, validationError } from '../src/validation.js';

describe('Testing Utilities', () => {
  describe('createTestRequest', () => {
    it('creates request with defaults', () => {
      const request = createTestRequest();
      expect(request.method).toBe('PUT');
      expect(request.path).toBe('/test');
      expect(request.httpVersion).toBe('HTTP/1.1');
      expect(request.body).toEqual(Buffer.alloc(0));
    });

    it('creates request with custom method and path', () => {
      const request = createTestRequest({
        method: 'POST',
        path: '/custom/path'
      });
      expect(request.method).toBe('POST');
      expect(request.path).toBe('/custom/path');
    });

    it('handles string body', () => {
      const request = createTestRequest({ body: 'test content' });
      expect(request.bodyText).toBe('test content');
      expect(request.headers['content-length']).toBe('12');
    });

    it('handles Buffer body', () => {
      const buffer = Buffer.from([0x00, 0x01, 0x02]);
      const request = createTestRequest({ body: buffer });
      expect(request.body).toEqual(buffer);
      expect(request.headers['content-length']).toBe('3');
    });

    it('handles object body as JSON', () => {
      const request = createTestRequest({ body: { key: 'value' } });
      expect(request.bodyJson()).toEqual({ key: 'value' });
      expect(request.headers['content-type']).toBe('application/json');
    });

    it('preserves custom content-type for object body', () => {
      const request = createTestRequest({
        body: { key: 'value' },
        headers: { 'content-type': 'application/vnd.custom+json' }
      });
      expect(request.headers['content-type']).toBe('application/vnd.custom+json');
    });

    it('includes custom headers', () => {
      const request = createTestRequest({
        headers: {
          'x-custom-header': 'custom-value',
          authorization: 'Bearer token'
        }
      });
      expect(request.headers['x-custom-header']).toBe('custom-value');
      expect(request.headers['authorization']).toBe('Bearer token');
    });
  });

  describe('testValidation', () => {
    it('invokes validator with request and context', async () => {
      let receivedRequest: ValidationRequest | undefined;

      const validator = typeValidation({}, async (request) => {
        receivedRequest = request;
        return validationCreated();
      });

      await testValidation(validator, { body: 'test' });

      expect(receivedRequest).toBeDefined();
      expect(receivedRequest!.bodyText).toBe('test');
    });

    it('returns response from validator', async () => {
      const validator = typeValidation({}, async () => {
        return validationCreated({ processed: true });
      });

      const result = await testValidation(validator, {});

      expect(result.response.status).toBe(201);
      expect(result.response.metadata).toEqual({ processed: true });
    });

    it('handles validation errors', async () => {
      const validator = typeValidation({}, async () => {
        return validationError(400, [{ code: 'INVALID', message: 'Invalid input' }]);
      });

      const result = await testValidation(validator, {});

      expect(result.response.status).toBe(400);
      const body = JSON.parse(result.response.body as string);
      expect(body.errors).toHaveLength(1);
    });

    it('accepts TestRequestOptions directly', async () => {
      const validator = typeValidation({}, async (request) => {
        return validationCreated({ path: request.path });
      });

      const result = await testValidation(validator, {
        path: '/contract.json'
      });

      expect(result.response.metadata).toEqual({ path: '/contract.json' });
    });

    it('accepts ValidationRequest directly', async () => {
      const request = createTestRequest({ body: { id: 1 } });

      const validator = typeValidation({}, async (req) => {
        return validationCreated({ id: req.bodyJson<{ id: number }>().id });
      });

      const result = await testValidation(validator, request);

      expect(result.response.metadata).toEqual({ id: 1 });
    });

    it('provides context to validator', async () => {
      let receivedContext: unknown;

      const validator = typeValidation({}, async (_request, context) => {
        receivedContext = context;
        return validationCreated();
      });

      const result = await testValidation(validator, {});

      expect(receivedContext).toBe(result.context);
      expect(result.context.logger).toBeDefined();
    });
  });
});
