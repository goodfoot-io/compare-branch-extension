/**
 * Tests for validation factory and HTTP parser.
 */

import { describe, expect, it, vi } from 'vitest';
import { parseHttpRequest } from '../src/http-parser.js';
import { Logger } from '../src/logger.js';
import {
  executeValidation,
  typeValidation,
  type ValidationContext,
  type ValidationError,
  type ValidationFunction,
  type ValidationRequest,
  validationCreated,
  validationError,
  validationResponse,
  validationUpdated
} from '../src/validation.js';

// Create a mock context
const createMockContext = (): ValidationContext => ({
  logger: new Logger()
});

describe('HTTP Parser', () => {
  describe('parseHttpRequest', () => {
    it('parses valid HTTP request with headers and body', () => {
      const input = Buffer.from(
        'PUT /contract/api-v2.json HTTP/1.1\r\n' +
          'Content-Type: application/json\r\n' +
          'Content-Length: 15\r\n' +
          '\r\n' +
          '{"key":"value"}'
      );

      const result = parseHttpRequest(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.request.method).toBe('PUT');
        expect(result.request.path).toBe('/contract/api-v2.json');
        expect(result.request.httpVersion).toBe('HTTP/1.1');
        expect(result.request.headers['content-type']).toBe('application/json');
        expect(result.request.headers['content-length']).toBe('15');
        expect(result.request.body.toString()).toBe('{"key":"value"}');
      }
    });

    it('parses request with LF line endings', () => {
      const input = Buffer.from(
        'PUT /file HTTP/1.1\n' + 'Content-Type: text/plain\n' + 'Content-Length: 5\n' + '\n' + 'hello'
      );

      const result = parseHttpRequest(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.request.method).toBe('PUT');
        expect(result.request.path).toBe('/file');
        expect(result.request.body.toString()).toBe('hello');
      }
    });

    it('handles binary body correctly', () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);
      const headers =
        'PUT /binary HTTP/1.1\r\n' +
        'Content-Type: application/octet-stream\r\n' +
        `Content-Length: ${binaryData.length}\r\n` +
        '\r\n';
      const input = Buffer.concat([Buffer.from(headers), binaryData]);

      const result = parseHttpRequest(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.request.body).toEqual(binaryData);
      }
    });

    it('returns error when Content-Length is missing', () => {
      const input = Buffer.from('PUT /file HTTP/1.1\r\n' + 'Content-Type: text/plain\r\n' + '\r\n' + 'body');

      const result = parseHttpRequest(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Content-Length');
      }
    });

    it('reads exactly Content-Length bytes', () => {
      const input = Buffer.from(
        'PUT /file HTTP/1.1\r\n' + 'Content-Length: 5\r\n' + '\r\n' + 'helloEXTRA_DATA_IGNORED'
      );

      const result = parseHttpRequest(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.request.body.toString()).toBe('hello');
        expect(result.request.body.length).toBe(5);
      }
    });

    it('provides bodyText convenience getter', () => {
      const input = Buffer.from('PUT /file HTTP/1.1\r\n' + 'Content-Length: 5\r\n' + '\r\n' + 'hello');

      const result = parseHttpRequest(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.request.bodyText).toBe('hello');
      }
    });

    it('provides bodyJson convenience method', () => {
      const input = Buffer.from('PUT /file HTTP/1.1\r\n' + 'Content-Length: 15\r\n' + '\r\n' + '{"key":"value"}');

      const result = parseHttpRequest(input);

      expect(result.success).toBe(true);
      if (result.success) {
        const json = result.request.bodyJson<{ key: string }>();
        expect(json.key).toBe('value');
      }
    });

    it('bodyJson throws on invalid JSON', () => {
      const input = Buffer.from('PUT /file HTTP/1.1\r\n' + 'Content-Length: 12\r\n' + '\r\n' + 'not-valid-json');

      const result = parseHttpRequest(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(() => result.request.bodyJson()).toThrow();
      }
    });

    it('normalizes header names to lowercase', () => {
      const input = Buffer.from(
        'PUT /file HTTP/1.1\r\n' +
          'Content-Type: text/plain\r\n' +
          'X-Custom-Header: value\r\n' +
          'Content-Length: 0\r\n' +
          '\r\n'
      );

      const result = parseHttpRequest(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.request.headers['content-type']).toBe('text/plain');
        expect(result.request.headers['x-custom-header']).toBe('value');
      }
    });
  });
});

describe('Validation Factory', () => {
  describe('typeValidation', () => {
    it('creates a validation function with timeout', () => {
      const validation = typeValidation({ timeout: 5000 }, () => validationCreated());
      expect(validation.timeout).toBe(5000);
    });

    it('has undefined timeout when not configured', () => {
      const validation = typeValidation({}, () => validationCreated());
      expect(validation.timeout).toBeUndefined();
    });

    it('calls handler with request and context', async () => {
      const handler = vi.fn(() => validationCreated());
      const validation = typeValidation({}, handler);

      const request: ValidationRequest = {
        method: 'PUT',
        path: '/file',
        httpVersion: 'HTTP/1.1',
        headers: {},
        body: Buffer.from('test'),
        bodyText: 'test',
        bodyJson: <T = unknown>() => JSON.parse('test') as T
      };
      const context = createMockContext();

      await validation(request, context);

      expect(handler).toHaveBeenCalledWith(request, context);
    });

    it('awaits async handlers', async () => {
      let completed = false;
      const validation = typeValidation({}, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        completed = true;
        return validationCreated();
      });

      const request: ValidationRequest = {
        method: 'PUT',
        path: '/file',
        httpVersion: 'HTTP/1.1',
        headers: {},
        body: Buffer.from('test'),
        bodyText: 'test',
        bodyJson: <T = unknown>() => JSON.parse('test') as T
      };

      await validation(request, createMockContext());
      expect(completed).toBe(true);
    });

    it('returns handler result', async () => {
      const expectedResponse = validationCreated({ customField: 'value' });
      const validation = typeValidation({}, () => expectedResponse);

      const request: ValidationRequest = {
        method: 'PUT',
        path: '/file',
        httpVersion: 'HTTP/1.1',
        headers: {},
        body: Buffer.from('test'),
        bodyText: 'test',
        bodyJson: <T = unknown>() => JSON.parse('test') as T
      };

      const result = await validation(request, createMockContext());
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('ValidationFunction type', () => {
    it('is callable', async () => {
      const validation: ValidationFunction = typeValidation({}, () => validationCreated());
      expect(typeof validation).toBe('function');
    });

    it('has required metadata properties', () => {
      const validation = typeValidation({ timeout: 10000 }, () => validationCreated());
      expect(validation).toHaveProperty('timeout');
    });
  });
});

describe('Output Builders', () => {
  describe('validationCreated', () => {
    it('returns 201 status', () => {
      const response = validationCreated();
      expect(response.status).toBe(201);
    });

    it('includes metadata when provided', () => {
      const metadata = { key: 'value', count: 42 };
      const response = validationCreated(metadata);
      expect(response.status).toBe(201);
      expect(response.metadata).toEqual(metadata);
    });

    it('works without metadata', () => {
      const response = validationCreated();
      expect(response.status).toBe(201);
      expect(response.metadata).toBeUndefined();
    });
  });

  describe('validationUpdated', () => {
    it('returns 200 status', () => {
      const response = validationUpdated();
      expect(response.status).toBe(200);
    });

    it('includes metadata when provided', () => {
      const metadata = { updated: true };
      const response = validationUpdated(metadata);
      expect(response.status).toBe(200);
      expect(response.metadata).toEqual(metadata);
    });

    it('works without metadata', () => {
      const response = validationUpdated();
      expect(response.status).toBe(200);
      expect(response.metadata).toBeUndefined();
    });
  });

  describe('validationError', () => {
    it('returns specified status code', () => {
      const errors: ValidationError[] = [{ code: 'ERR_TEST', message: 'Test error' }];
      const response = validationError(422, errors);
      expect(response.status).toBe(422);
    });

    it('includes errors in JSON body', () => {
      const errors: ValidationError[] = [
        { code: 'ERR_REQUIRED', message: 'Field is required', field: 'name' },
        { code: 'ERR_TYPE', message: 'Invalid type' }
      ];
      const response = validationError(400, errors);
      expect(response.body).toBeDefined();
      expect(response.headers?.['Content-Type']).toBe('application/json');

      const parsed = JSON.parse(response.body as string);
      expect(parsed.errors).toEqual(errors);
    });

    it('includes message when provided', () => {
      const errors: ValidationError[] = [{ code: 'ERR_TEST', message: 'Test' }];
      const response = validationError(400, errors, 'Validation failed');
      const parsed = JSON.parse(response.body as string);
      expect(parsed.message).toBe('Validation failed');
    });

    it('works without message', () => {
      const errors: ValidationError[] = [{ code: 'ERR_TEST', message: 'Test' }];
      const response = validationError(400, errors);
      const parsed = JSON.parse(response.body as string);
      expect(parsed.message).toBeUndefined();
    });

    it('sets Content-Type header to application/json', () => {
      const errors: ValidationError[] = [{ code: 'ERR_TEST', message: 'Test' }];
      const response = validationError(400, errors);
      expect(response.headers?.['Content-Type']).toBe('application/json');
    });
  });

  describe('validationResponse', () => {
    it('passes through the response', () => {
      const customResponse = {
        status: 418,
        headers: { 'X-Custom': 'header' },
        body: 'teapot',
        metadata: { custom: true }
      };
      const response = validationResponse(customResponse);
      expect(response).toEqual(customResponse);
    });

    it('works with minimal response', () => {
      const minimalResponse = {};
      const response = validationResponse(minimalResponse);
      expect(response).toEqual(minimalResponse);
    });
  });
});

describe('executeValidation', () => {
  // Note: Full integration tests for executeValidation would require
  // mocking stdin/stdout and process.exit, which is complex.
  // These tests verify the basic structure and can be extended as needed.

  it('is a function', () => {
    expect(typeof executeValidation).toBe('function');
  });

  it('accepts a ValidationFunction', () => {
    const validation = typeValidation({}, () => validationCreated());
    // Just verify it can be passed without type errors
    expect(() => {
      void executeValidation(validation);
    }).toBeDefined();
  });
});
