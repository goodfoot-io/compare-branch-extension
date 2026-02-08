/**
 * Tests for output builders, executeValidation, and HTTP parser.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineTypeValidator } from '../src/factories/type-hooks.js';
import { parseHttpRequest } from '../src/http-parser.js';
import type { ValidatorFileRequest } from '../src/inputs.js';
import { executeValidation, validationError, validationSuccess } from '../src/validation.js';

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

describe('Output Builders', () => {
  describe('validationSuccess', () => {
    it('returns valid: true', () => {
      const result = validationSuccess();
      expect(result.valid).toBe(true);
    });

    it('includes metadata when provided', () => {
      const metadata = { key: 'value', count: 42 };
      const result = validationSuccess(metadata);
      expect(result.valid).toBe(true);
      expect((result as { valid: true; metadata?: Record<string, unknown> }).metadata).toEqual(metadata);
    });

    it('works without metadata', () => {
      const result = validationSuccess();
      expect(result.valid).toBe(true);
      expect((result as { valid: true; metadata?: Record<string, unknown> }).metadata).toBeUndefined();
    });

    it('writes { valid: true } with no metadata key when metadata is omitted', () => {
      const result = validationSuccess();
      expect(JSON.stringify(result)).toBe('{"valid":true}');
    });

    it('writes { valid: true, metadata: { key: "val" } } when metadata is provided', () => {
      const result = validationSuccess({ key: 'val' });
      expect(JSON.parse(JSON.stringify(result))).toEqual({ valid: true, metadata: { key: 'val' } });
    });
  });

  describe('validationError', () => {
    it('returns valid: false with errors', () => {
      const result = validationError(['error 1', 'error 2']);
      expect(result.valid).toBe(false);
      expect((result as { valid: false; errors: string[] }).errors).toEqual(['error 1', 'error 2']);
    });

    it('supports markdown-formatted error messages', () => {
      const result = validationError(['**Bold** error msg']);
      expect(result.valid).toBe(false);
      const parsed = JSON.parse(JSON.stringify(result));
      expect(parsed).toEqual({ valid: false, errors: ['**Bold** error msg'] });
    });

    it('works with empty errors array', () => {
      const result = validationError([]);
      expect(result.valid).toBe(false);
      expect((result as { valid: false; errors: string[] }).errors).toEqual([]);
    });
  });
});

describe('executeValidation', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `cards-validation-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('reads FILE_PATH from env and passes to handler as request.filePath', async () => {
    const filePath = join(tmpDir, 'test.json');
    writeFileSync(filePath, '{"hello":"world"}');

    let receivedRequest: ValidatorFileRequest | undefined;
    const validation = defineTypeValidator({ typeName: 'test' }, (request) => {
      receivedRequest = request;
      return validationSuccess();
    });

    const writtenChunks: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenChunks.push(String(chunk));
      return true;
    });
    const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const savedEnv = { ...process.env };
    process.env.FILE_PATH = filePath;
    process.env.TYPE_NAME = 'test';
    process.env.TYPE_VERSION = '1.0';
    process.env.FILE_NAME = 'test.json';
    process.env.CARD_ID = 'card-1';
    process.env.ENVIRONMENT = 'dev';
    process.env.API_BASE_URL = 'http://localhost';
    process.env.API_ACCESS_TOKEN = 'token';

    try {
      await executeValidation(validation);
    } finally {
      process.env = savedEnv;
    }

    expect(receivedRequest).toBeDefined();
    expect(receivedRequest!.filePath).toBe(filePath);
    expect(exitMock).toHaveBeenCalledWith(0);
  });

  it('reads existing .meta.json sidecar and passes parsed object as request.metadata', async () => {
    const filePath = join(tmpDir, 'test.json');
    writeFileSync(filePath, '{"hello":"world"}');
    writeFileSync(`${filePath}.meta.json`, JSON.stringify({ version: '2.0', custom: true }));

    let receivedMetadata: Record<string, unknown> | undefined;
    const validation = defineTypeValidator({ typeName: 'test' }, (request) => {
      receivedMetadata = request.metadata;
      return validationSuccess();
    });

    const writtenChunks: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const savedEnv = { ...process.env };
    process.env.FILE_PATH = filePath;
    process.env.TYPE_NAME = 'test';
    process.env.TYPE_VERSION = '1.0';
    process.env.FILE_NAME = 'test.json';
    process.env.CARD_ID = 'card-1';
    process.env.ENVIRONMENT = 'dev';
    process.env.API_BASE_URL = 'http://localhost';
    process.env.API_ACCESS_TOKEN = 'token';

    try {
      await executeValidation(validation);
    } finally {
      process.env = savedEnv;
    }

    expect(receivedMetadata).toEqual({ version: '2.0', custom: true });
  });

  it('passes metadata as undefined when no .meta.json exists', async () => {
    const filePath = join(tmpDir, 'test.json');
    writeFileSync(filePath, '{"hello":"world"}');

    let receivedMetadata: Record<string, unknown> | undefined = { sentinel: true };
    const validation = defineTypeValidator({ typeName: 'test' }, (request) => {
      receivedMetadata = request.metadata;
      return validationSuccess();
    });

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const savedEnv = { ...process.env };
    process.env.FILE_PATH = filePath;
    process.env.TYPE_NAME = 'test';
    process.env.TYPE_VERSION = '1.0';
    process.env.FILE_NAME = 'test.json';
    process.env.CARD_ID = 'card-1';
    process.env.ENVIRONMENT = 'dev';
    process.env.API_BASE_URL = 'http://localhost';
    process.env.API_ACCESS_TOKEN = 'token';

    try {
      await executeValidation(validation);
    } finally {
      process.env = savedEnv;
    }

    expect(receivedMetadata).toBeUndefined();
  });

  it('extracts type context from env vars', async () => {
    const filePath = join(tmpDir, 'test.json');
    writeFileSync(filePath, '{}');

    let receivedContext: unknown;
    const validation = defineTypeValidator({ typeName: 'test' }, (_request, context) => {
      receivedContext = context;
      return validationSuccess();
    });

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const savedEnv = { ...process.env };
    process.env.FILE_PATH = filePath;
    process.env.TYPE_NAME = 'my-type';
    process.env.TYPE_VERSION = '2.1';
    process.env.FILE_NAME = 'data.json';
    process.env.CARD_ID = 'card-42';
    process.env.ENVIRONMENT = 'staging';
    process.env.API_BASE_URL = 'https://api.example.com';
    process.env.API_ACCESS_TOKEN = 'secret-token';

    try {
      await executeValidation(validation);
    } finally {
      process.env = savedEnv;
    }

    const ctx = receivedContext as Record<string, unknown>;
    expect(ctx.typeName).toBe('my-type');
    expect(ctx.typeVersion).toBe('2.1');
    expect(ctx.fileName).toBe('data.json');
    expect(ctx.cardId).toBe('card-42');
    expect(ctx.environment).toBe('staging');
    expect(ctx.apiBaseUrl).toBe('https://api.example.com');
    expect(ctx.apiAccessToken).toBe('secret-token');
  });

  it('handler returning validationSuccess() writes { valid: true } to stdout', async () => {
    const filePath = join(tmpDir, 'test.json');
    writeFileSync(filePath, '{}');

    const validation = defineTypeValidator({ typeName: 'test' }, () => validationSuccess());

    const writtenChunks: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const savedEnv = { ...process.env };
    process.env.FILE_PATH = filePath;
    process.env.TYPE_NAME = 'test';
    process.env.TYPE_VERSION = '1.0';
    process.env.FILE_NAME = 'test.json';
    process.env.CARD_ID = 'card-1';
    process.env.ENVIRONMENT = 'dev';
    process.env.API_BASE_URL = 'http://localhost';
    process.env.API_ACCESS_TOKEN = 'token';

    try {
      await executeValidation(validation);
    } finally {
      process.env = savedEnv;
    }

    const output = JSON.parse(writtenChunks.join(''));
    expect(output).toEqual({ valid: true });
  });

  it('handler returning validationSuccess({ key: "val" }) writes { valid: true, metadata: { key: "val" } } to stdout', async () => {
    const filePath = join(tmpDir, 'test.json');
    writeFileSync(filePath, '{}');

    const validation = defineTypeValidator({ typeName: 'test' }, () => validationSuccess({ key: 'val' }));

    const writtenChunks: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const savedEnv = { ...process.env };
    process.env.FILE_PATH = filePath;
    process.env.TYPE_NAME = 'test';
    process.env.TYPE_VERSION = '1.0';
    process.env.FILE_NAME = 'test.json';
    process.env.CARD_ID = 'card-1';
    process.env.ENVIRONMENT = 'dev';
    process.env.API_BASE_URL = 'http://localhost';
    process.env.API_ACCESS_TOKEN = 'token';

    try {
      await executeValidation(validation);
    } finally {
      process.env = savedEnv;
    }

    const output = JSON.parse(writtenChunks.join(''));
    expect(output).toEqual({ valid: true, metadata: { key: 'val' } });
  });

  it('handler returning validationError(["**Bold** error msg"]) writes { valid: false, errors: [...] } to stdout', async () => {
    const filePath = join(tmpDir, 'test.json');
    writeFileSync(filePath, '{}');

    const validation = defineTypeValidator({ typeName: 'test' }, () => validationError(['**Bold** error msg']));

    const writtenChunks: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const savedEnv = { ...process.env };
    process.env.FILE_PATH = filePath;
    process.env.TYPE_NAME = 'test';
    process.env.TYPE_VERSION = '1.0';
    process.env.FILE_NAME = 'test.json';
    process.env.CARD_ID = 'card-1';
    process.env.ENVIRONMENT = 'dev';
    process.env.API_BASE_URL = 'http://localhost';
    process.env.API_ACCESS_TOKEN = 'token';

    try {
      await executeValidation(validation);
    } finally {
      process.env = savedEnv;
    }

    const output = JSON.parse(writtenChunks.join(''));
    expect(output).toEqual({ valid: false, errors: ['**Bold** error msg'] });
  });

  it('exits 0 for both success and error results', async () => {
    const filePath = join(tmpDir, 'test.json');
    writeFileSync(filePath, '{}');

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const savedEnv = { ...process.env };
    process.env.FILE_PATH = filePath;
    process.env.TYPE_NAME = 'test';
    process.env.TYPE_VERSION = '1.0';
    process.env.FILE_NAME = 'test.json';
    process.env.CARD_ID = 'card-1';
    process.env.ENVIRONMENT = 'dev';
    process.env.API_BASE_URL = 'http://localhost';
    process.env.API_ACCESS_TOKEN = 'token';

    // Test success
    const successValidation = defineTypeValidator({ typeName: 'test' }, () => validationSuccess());
    try {
      await executeValidation(successValidation);
    } finally {
      // keep env for second call
    }
    expect(exitMock).toHaveBeenCalledWith(0);

    exitMock.mockClear();

    // Test error
    const errorValidation = defineTypeValidator({ typeName: 'test' }, () => validationError(['err']));
    try {
      await executeValidation(errorValidation);
    } finally {
      process.env = savedEnv;
    }
    expect(exitMock).toHaveBeenCalledWith(0);
  });

  it('writes { valid: false, errors: [...] } on handler exception', async () => {
    const filePath = join(tmpDir, 'test.json');
    writeFileSync(filePath, '{}');

    const validation = defineTypeValidator({ typeName: 'test' }, () => {
      throw new Error('Something went wrong');
    });

    const writtenChunks: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const savedEnv = { ...process.env };
    process.env.FILE_PATH = filePath;
    process.env.TYPE_NAME = 'test';
    process.env.TYPE_VERSION = '1.0';
    process.env.FILE_NAME = 'test.json';
    process.env.CARD_ID = 'card-1';
    process.env.ENVIRONMENT = 'dev';
    process.env.API_BASE_URL = 'http://localhost';
    process.env.API_ACCESS_TOKEN = 'token';

    try {
      await executeValidation(validation);
    } finally {
      process.env = savedEnv;
    }

    const output = JSON.parse(writtenChunks.join(''));
    expect(output.valid).toBe(false);
    expect(output.errors).toEqual(['Something went wrong']);
  });

  it('writes { valid: false, errors: [...] } when FILE_PATH env missing', async () => {
    const validation = defineTypeValidator({ typeName: 'test' }, () => validationSuccess());

    const writtenChunks: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const savedEnv = { ...process.env };
    delete process.env.FILE_PATH;

    try {
      await executeValidation(validation);
    } finally {
      process.env = savedEnv;
    }

    const output = JSON.parse(writtenChunks.join(''));
    expect(output.valid).toBe(false);
    expect(output.errors).toEqual(['FILE_PATH environment variable is not set']);
  });

  it('produces { valid: false, errors: [...] } when TYPE_NAME env var is missing', async () => {
    const filePath = join(tmpDir, 'test.json');
    writeFileSync(filePath, '{}');

    const validation = defineTypeValidator({ typeName: 'test' }, () => validationSuccess());

    const writtenChunks: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const savedEnv = { ...process.env };
    process.env.FILE_PATH = filePath;
    // Deliberately NOT setting TYPE_NAME
    delete process.env.TYPE_NAME;
    process.env.TYPE_VERSION = '1.0';
    process.env.FILE_NAME = 'test.json';
    process.env.CARD_ID = 'card-1';
    process.env.ENVIRONMENT = 'dev';
    process.env.API_BASE_URL = 'http://localhost';
    process.env.API_ACCESS_TOKEN = 'token';

    try {
      await executeValidation(validation);
    } finally {
      process.env = savedEnv;
    }

    const output = JSON.parse(writtenChunks.join(''));
    expect(output.valid).toBe(false);
    expect(output.errors[0]).toContain('TYPE_NAME');
  });

  it('produces { valid: false, errors: [...] } when CARD_ID env var is missing', async () => {
    const filePath = join(tmpDir, 'test.json');
    writeFileSync(filePath, '{}');

    const validation = defineTypeValidator({ typeName: 'test' }, () => validationSuccess());

    const writtenChunks: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const savedEnv = { ...process.env };
    process.env.FILE_PATH = filePath;
    process.env.TYPE_NAME = 'test';
    process.env.TYPE_VERSION = '1.0';
    process.env.FILE_NAME = 'test.json';
    // Deliberately NOT setting CARD_ID
    delete process.env.CARD_ID;
    process.env.ENVIRONMENT = 'dev';
    process.env.API_BASE_URL = 'http://localhost';
    process.env.API_ACCESS_TOKEN = 'token';

    try {
      await executeValidation(validation);
    } finally {
      process.env = savedEnv;
    }

    const output = JSON.parse(writtenChunks.join(''));
    expect(output.valid).toBe(false);
    expect(output.errors[0]).toContain('CARD_ID');
  });
});
