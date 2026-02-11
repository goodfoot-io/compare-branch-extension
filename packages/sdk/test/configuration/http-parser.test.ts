/**
 * Tests for HTTP parser.
 */

import { describe, expect, it } from 'vitest';
import { parseHttpRequest } from '../../src/config/http-parser.js';

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
