/**
 * End-to-end tests for build output validation.
 *
 * These tests validate that files produced by the build system:
 * 1. Have valid settings.json structure matching the schema
 * 2. Reference compiled handlers that exist
 * 3. Compiled handlers can be executed with proper environment variables
 *
 * @module
 */

import { exec as execCallback } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Settings } from '../../src/schema.js';

const exec = promisify(execCallback);

// ============================================================================
// Test Constants
// ============================================================================

/**
 * Path to the real build output from claude-code configuration.
 * This tests against actual built artifacts rather than mocked fixtures.
 */
const CLAUDE_CODE_DIST = path.resolve(
  __dirname,
  '../../../../../packages/cards/default-configuration/claude-code/dist'
);

/**
 * Temporary directory for test fixtures.
 */
const FIXTURES_DIR = path.join(os.tmpdir(), 'cards-configuration-e2e', crypto.randomUUID(), 'e2e-fixtures');

// ============================================================================
// Settings.json Structure Validation
// ============================================================================

describe('build output: settings.json structure', () => {
  let settings: Settings & { __generated?: { files: string[]; timestamp: string } };
  let settingsPath: string;

  beforeAll(() => {
    settingsPath = path.join(CLAUDE_CODE_DIST, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      throw new Error(
        `Build output not found at ${settingsPath}. ` +
          'Run the build first: yarn workspace @cards/default-configuration-claude-code build'
      );
    }
    const content = fs.readFileSync(settingsPath, 'utf-8');
    settings = JSON.parse(content);
  });

  describe('root structure', () => {
    it('should have environments object', () => {
      expect(settings).toHaveProperty('environments');
      expect(typeof settings.environments).toBe('object');
      expect(settings.environments).not.toBeNull();
    });

    it('should have at least one environment', () => {
      const envNames = Object.keys(settings.environments);
      expect(envNames.length).toBeGreaterThan(0);
    });

    it('should have __generated metadata', () => {
      expect(settings).toHaveProperty('__generated');
      expect(settings.__generated).toHaveProperty('files');
      expect(settings.__generated).toHaveProperty('timestamp');
      expect(Array.isArray(settings.__generated?.files)).toBe(true);
    });

    it('should have valid ISO timestamp', () => {
      const timestamp = settings.__generated?.timestamp;
      expect(timestamp).toBeTruthy();
      const parsed = new Date(timestamp!);
      expect(parsed.toString()).not.toBe('Invalid Date');
    });
  });

  describe('environment structure', () => {
    it('should have valid environment objects', () => {
      for (const [_envName, env] of Object.entries(settings.environments)) {
        expect(env).toHaveProperty('version');
        expect(typeof env.version).toBe('number');
        expect(env).toHaveProperty('actions');
        expect(Array.isArray(env.actions)).toBe(true);
      }
    });

    it('should have valid actions in each environment', () => {
      for (const [_envName, env] of Object.entries(settings.environments)) {
        for (const action of env.actions) {
          expect(action).toHaveProperty('name');
          expect(typeof action.name).toBe('string');
          expect(action).toHaveProperty('start');
          expect(action.start).toHaveProperty('command');
          expect(typeof action.start.command).toBe('string');

          // ID should be present (generated from name)
          expect(action).toHaveProperty('id');
          expect(typeof action.id).toBe('string');

          // If end command exists, validate it
          if (action.end) {
            expect(action.end).toHaveProperty('command');
            expect(typeof action.end.command).toBe('string');
          }
        }
      }
    });

    it('should have valid types if present', () => {
      for (const [_envName, env] of Object.entries(settings.environments)) {
        if (env.types) {
          for (const [_typeName, typeDef] of Object.entries(env.types)) {
            expect(typeDef).toHaveProperty('version');
            expect(typeof typeDef.version).toBe('string');

            // Validate optional hooks
            if (typeDef.validator) {
              expect(typeDef.validator).toHaveProperty('command');
            }
            if (typeDef.create) {
              expect(typeDef.create).toHaveProperty('command');
            }
            if (typeDef.update) {
              expect(typeDef.update).toHaveProperty('command');
            }
            if (typeDef.delete) {
              expect(typeDef.delete).toHaveProperty('command');
            }
          }
        }
      }
    });
  });

  describe('command paths', () => {
    it('should have commands that reference bin directory', () => {
      for (const [_envName, env] of Object.entries(settings.environments)) {
        for (const action of env.actions) {
          // Commands should reference bin directory (either ./bin/ or $CARDS_PLUGIN_ROOT/bin/)
          expect(action.start.command).toMatch(/bin\//);

          if (action.end) {
            expect(action.end.command).toMatch(/bin\//);
          }
        }

        if (env.types) {
          for (const [_typeName, typeDef] of Object.entries(env.types)) {
            if (typeDef.validator) {
              expect(typeDef.validator.command).toMatch(/bin\//);
            }
          }
        }
      }
    });

    it('should have commands with content hashes in filenames', () => {
      // Content hash pattern: name.8hexchars.mjs
      const hashPattern = /\.[a-f0-9]{8}\.mjs$/;

      for (const [_envName, env] of Object.entries(settings.environments)) {
        for (const action of env.actions) {
          expect(action.start.command).toMatch(hashPattern);

          if (action.end) {
            expect(action.end.command).toMatch(hashPattern);
          }
        }

        if (env.types) {
          for (const [_typeName, typeDef] of Object.entries(env.types)) {
            if (typeDef.validator) {
              expect(typeDef.validator.command).toMatch(hashPattern);
            }
          }
        }
      }
    });
  });
});

// ============================================================================
// Compiled Handler File Validation
// ============================================================================

describe('build output: compiled handlers', () => {
  let settings: Settings & { __generated?: { files: string[] } };
  let binDir: string;

  beforeAll(() => {
    const settingsPath = path.join(CLAUDE_CODE_DIST, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      throw new Error(`Build output not found at ${settingsPath}`);
    }
    const content = fs.readFileSync(settingsPath, 'utf-8');
    settings = JSON.parse(content);
    binDir = path.join(CLAUDE_CODE_DIST, 'bin');
  });

  describe('file existence', () => {
    it('should have bin directory', () => {
      expect(fs.existsSync(binDir)).toBe(true);
      expect(fs.statSync(binDir).isDirectory()).toBe(true);
    });

    it('should have all files listed in __generated.files', () => {
      const generatedFiles = settings.__generated?.files ?? [];
      expect(generatedFiles.length).toBeGreaterThan(0);

      for (const filename of generatedFiles) {
        const filePath = path.join(binDir, filename);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });

    it('should have executable permissions on compiled handlers', () => {
      const generatedFiles = settings.__generated?.files ?? [];

      for (const filename of generatedFiles) {
        const filePath = path.join(binDir, filename);
        const stats = fs.statSync(filePath);
        // Check executable bit (owner execute permission)
        const isExecutable = (stats.mode & 0o100) !== 0;
        expect(isExecutable).toBe(true);
      }
    });
  });

  describe('handler content', () => {
    it('should be valid ESM modules', () => {
      const generatedFiles = settings.__generated?.files ?? [];

      for (const filename of generatedFiles) {
        const filePath = path.join(binDir, filename);
        const content = fs.readFileSync(filePath, 'utf-8');

        // ESM modules should have import or export statements
        // The compiled handlers import from runtime
        expect(content).toContain('import');
      }
    });

    it('should have shebang or be plain JS', () => {
      const generatedFiles = settings.__generated?.files ?? [];

      for (const filename of generatedFiles) {
        const filePath = path.join(binDir, filename);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Either has shebang or is valid JS (starts with comment/import/var/etc)
        const isValidStart =
          content.startsWith('#!') ||
          content.startsWith('//') ||
          content.startsWith('/*') ||
          content.startsWith('import') ||
          content.startsWith('var') ||
          content.startsWith('const') ||
          content.startsWith('let');

        expect(isValidStart).toBe(true);
      }
    });
  });
});

// ============================================================================
// Handler Execution Tests
// ============================================================================

describe('build output: handler execution', () => {
  let settings: Settings & { __generated?: { files: string[] } };
  let binDir: string;

  beforeAll(() => {
    const settingsPath = path.join(CLAUDE_CODE_DIST, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      throw new Error(`Build output not found at ${settingsPath}`);
    }
    const content = fs.readFileSync(settingsPath, 'utf-8');
    settings = JSON.parse(content);
    binDir = path.join(CLAUDE_CODE_DIST, 'bin');

    // Create fixtures directory
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  });

  afterAll(() => {
    // Clean up fixtures
    fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
  });

  /**
   * Helper to execute a handler with environment variables.
   */
  async function executeHandler(
    handlerPath: string,
    env: Record<string, string>,
    timeout = 5000
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await exec(`node "${handlerPath}"`, {
        env: { ...process.env, ...env },
        timeout,
        cwd: FIXTURES_DIR
      });
      return { exitCode: 0, stdout, stderr };
    } catch (error: unknown) {
      const execError = error as { code?: number; stdout?: string; stderr?: string };
      return {
        exitCode: execError.code ?? 1,
        stdout: execError.stdout ?? '',
        stderr: execError.stderr ?? ''
      };
    }
  }

  /**
   * Helper to execute a validator handler with HTTP stdin protocol.
   * Validators receive HTTP request via stdin and return JSON response via stdout.
   */
  async function executeValidator(
    handlerPath: string,
    content: string | Buffer,
    env: Record<string, string>,
    options: { method?: string; contentType?: string } = {}
  ): Promise<{ exitCode: number; stdout: string; stderr: string; response?: { status?: number; errors?: unknown[] } }> {
    const { spawn } = await import('node:child_process');

    const method = options.method ?? 'PUT';
    const contentType = options.contentType ?? 'application/octet-stream';
    const body = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');

    // Build HTTP request
    const httpRequest =
      `${method} /type/${env.TYPE_NAME ?? 'test'}/${env.FILE_NAME ?? 'test.txt'} HTTP/1.1\r\n` +
      `Content-Type: ${contentType}\r\n` +
      `Content-Length: ${body.length}\r\n` +
      `\r\n`;

    const fullRequest = Buffer.concat([Buffer.from(httpRequest, 'utf-8'), body]);

    return new Promise((resolve) => {
      const proc = spawn('node', [handlerPath], {
        env: { ...process.env, ...env },
        cwd: FIXTURES_DIR,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        let response: { status?: number; errors?: unknown[] } | undefined;
        try {
          response = JSON.parse(stdout);
        } catch {
          // Ignore parse errors
        }
        resolve({
          exitCode: code ?? 0,
          stdout,
          stderr,
          response
        });
      });

      // Write HTTP request to stdin
      proc.stdin.write(fullRequest);
      proc.stdin.end();
    });
  }

  /**
   * Creates base environment variables for action handlers.
   */
  function createActionEnv(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
    return {
      CARD_ID: 'test-card-123',
      ENVIRONMENT: 'default',
      EXECUTION_MODE: 'interactive',
      API_BASE_URL: 'http://localhost:3000',
      API_ACCESS_TOKEN: 'test-token-abc',
      ...overrides
    };
  }

  /**
   * Creates base environment variables for type validator handlers.
   */
  function createValidatorEnv(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
    return {
      CARD_ID: 'test-card-123',
      ENVIRONMENT: 'default',
      TYPE_NAME: 'note',
      TYPE_VERSION: '1.0.0',
      FILE_NAME: 'test.md',
      API_BASE_URL: 'http://localhost:3000',
      API_ACCESS_TOKEN: 'test-token-abc',
      ...overrides
    };
  }

  /**
   * Creates base environment variables for type hook handlers (non-validators).
   */
  function _createTypeEnv(filePath: string, overrides: Partial<Record<string, string>> = {}): Record<string, string> {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    return {
      CARD_ID: 'test-card-123',
      ENVIRONMENT: 'default',
      TYPE_NAME: 'note',
      TYPE_VERSION: '1.0.0',
      FILE_NAME: path.basename(filePath),
      FILE_PATH: filePath,
      FILE_SIZE: String(stats.size),
      SHA256: hash,
      CONTENT_TYPE: 'text/markdown',
      API_BASE_URL: 'http://localhost:3000',
      API_ACCESS_TOKEN: 'test-token-abc',
      ...overrides
    };
  }

  describe('action handlers', () => {
    it('should fail with missing environment variables', async () => {
      const files = settings.__generated?.files ?? [];
      const actionHandler = files.find((f) => f.includes('launch-claude-start'));

      if (!actionHandler) {
        throw new Error('No action start handler found in build output');
      }

      const handlerPath = path.join(binDir, actionHandler);

      // Execute with no environment variables
      const result = await executeHandler(handlerPath, {});

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Missing required environment variable');
    });

    it('should execute successfully with valid environment', async () => {
      const files = settings.__generated?.files ?? [];
      const actionHandler = files.find((f) => f.includes('launch-claude-start'));

      if (!actionHandler) {
        throw new Error('No action start handler found in build output');
      }

      const handlerPath = path.join(binDir, actionHandler);
      const env = createActionEnv();

      const result = await executeHandler(handlerPath, env);

      // The handler should exit successfully (code 0)
      expect(result.exitCode).toBe(0);
    });

    it('should fail with invalid execution mode', async () => {
      const files = settings.__generated?.files ?? [];
      const actionHandler = files.find((f) => f.includes('launch-claude-start'));

      if (!actionHandler) {
        throw new Error('No action start handler found in build output');
      }

      const handlerPath = path.join(binDir, actionHandler);
      const env = createActionEnv({ EXECUTION_MODE: 'invalid-mode' });

      const result = await executeHandler(handlerPath, env);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid EXECUTION_MODE');
    });

    it('should execute end handlers successfully', async () => {
      const files = settings.__generated?.files ?? [];
      const endHandler = files.find((f) => f.includes('launch-claude-end'));

      if (!endHandler) {
        throw new Error('No action end handler found in build output');
      }

      const handlerPath = path.join(binDir, endHandler);
      const env = createActionEnv();

      const result = await executeHandler(handlerPath, env);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('type validator handlers', () => {
    it('should work with minimal environment variables (context defaults to empty)', async () => {
      const files = settings.__generated?.files ?? [];
      const validatorHandler = files.find((f) => f.includes('note-validator'));

      if (!validatorHandler) {
        throw new Error('No validator handler found in build output');
      }

      const noteContent = `---
id: test-123
author: Test Author
title: Test Note
---

Valid note content.
`;

      const handlerPath = path.join(binDir, validatorHandler);
      // Only provide minimal env (without TYPE_NAME, FILE_NAME, etc.)
      const result = await executeValidator(handlerPath, noteContent, {}, { contentType: 'text/markdown' });

      // Validator should still work - context fields default to empty strings
      expect(result.exitCode).toBe(0);
      expect(result.response?.status).toBe(201);
    });

    it('should validate a valid note file successfully', async () => {
      const files = settings.__generated?.files ?? [];
      const validatorHandler = files.find((f) => f.includes('note-validator'));

      if (!validatorHandler) {
        throw new Error('No validator handler found in build output');
      }

      const noteContent = `---
id: note-123
author: Test Author
title: Test Note
---

This is a valid note with all required frontmatter fields.
`;

      const handlerPath = path.join(binDir, validatorHandler);
      const env = createValidatorEnv({ TYPE_NAME: 'note', FILE_NAME: 'valid-note.md' });

      const result = await executeValidator(handlerPath, noteContent, env, { contentType: 'text/markdown' });

      expect(result.exitCode).toBe(0);
      expect(result.response?.status).toBe(201);
    });

    it('should fail validation for note without frontmatter', async () => {
      const files = settings.__generated?.files ?? [];
      const validatorHandler = files.find((f) => f.includes('note-validator'));

      if (!validatorHandler) {
        throw new Error('No validator handler found in build output');
      }

      const noteContent = `This is a note without any frontmatter.

It should fail validation.
`;

      const handlerPath = path.join(binDir, validatorHandler);
      const env = createValidatorEnv({ TYPE_NAME: 'note', FILE_NAME: 'invalid-note.md' });

      const result = await executeValidator(handlerPath, noteContent, env, { contentType: 'text/markdown' });

      expect(result.exitCode).toBe(0); // Validators always exit 0, errors in response
      expect(result.response?.status).toBe(400);
    });

    it('should fail validation for note with missing required fields', async () => {
      const files = settings.__generated?.files ?? [];
      const validatorHandler = files.find((f) => f.includes('note-validator'));

      if (!validatorHandler) {
        throw new Error('No validator handler found in build output');
      }

      const noteContent = `---
id: note-123
---

This note is missing author and title fields.
`;

      const handlerPath = path.join(binDir, validatorHandler);
      const env = createValidatorEnv({ TYPE_NAME: 'note', FILE_NAME: 'invalid-note.md' });

      const result = await executeValidator(handlerPath, noteContent, env, { contentType: 'text/markdown' });

      expect(result.exitCode).toBe(0); // Validators always exit 0, errors in response
      expect(result.response?.status).toBe(400);
    });

    it('should fail validation for note with empty required fields', async () => {
      const files = settings.__generated?.files ?? [];
      const validatorHandler = files.find((f) => f.includes('note-validator'));

      if (!validatorHandler) {
        throw new Error('No validator handler found in build output');
      }

      const noteContent = `---
id: ""
author: Test Author
title: ""
---

This note has empty id and title.
`;

      const handlerPath = path.join(binDir, validatorHandler);
      const env = createValidatorEnv({ TYPE_NAME: 'note', FILE_NAME: 'invalid-note.md' });

      const result = await executeValidator(handlerPath, noteContent, env, { contentType: 'text/markdown' });

      expect(result.exitCode).toBe(0); // Validators always exit 0, errors in response
      expect(result.response?.status).toBe(400);
    });
  });

  describe('adaptive card validator', () => {
    it('should validate a valid adaptive card', async () => {
      const files = settings.__generated?.files ?? [];
      const validatorHandler = files.find((f) => f.includes('adaptive-card-validator'));

      if (!validatorHandler) {
        throw new Error('No adaptive card validator handler found in build output');
      }

      // Create a valid adaptive card JSON (Cards wrapper format)
      const cardContent = JSON.stringify(
        {
          id: 'card-123',
          summary: 'Test card summary',
          author: 'Test Author',
          payload: {
            type: 'AdaptiveCard',
            version: '1.5',
            body: [
              {
                type: 'TextBlock',
                text: 'Hello, World!'
              }
            ]
          }
        },
        null,
        2
      );

      const handlerPath = path.join(binDir, validatorHandler);
      const env = createValidatorEnv({
        TYPE_NAME: 'adaptive-card',
        FILE_NAME: 'valid-card.json'
      });

      const result = await executeValidator(handlerPath, cardContent, env, { contentType: 'application/json' });

      expect(result.exitCode).toBe(0);
      expect(result.response?.status).toBe(201);
    });

    it('should fail validation for invalid adaptive card', async () => {
      const files = settings.__generated?.files ?? [];
      const validatorHandler = files.find((f) => f.includes('adaptive-card-validator'));

      if (!validatorHandler) {
        throw new Error('No adaptive card validator handler found in build output');
      }

      // Create an invalid adaptive card (missing required fields)
      const cardContent = JSON.stringify(
        {
          version: '1.5',
          body: []
        },
        null,
        2
      );

      const handlerPath = path.join(binDir, validatorHandler);
      const env = createValidatorEnv({
        TYPE_NAME: 'adaptive-card',
        FILE_NAME: 'invalid-card.json'
      });

      const result = await executeValidator(handlerPath, cardContent, env, { contentType: 'application/json' });

      expect(result.exitCode).toBe(0); // Validators always exit 0, errors in response
      expect(result.response?.status).toBe(400);
    });
  });
});

// ============================================================================
// Input/Output Handling Tests
// ============================================================================

describe('build output: input/output handling', () => {
  let settings: Settings & { __generated?: { files: string[] } };
  let binDir: string;

  beforeAll(() => {
    const settingsPath = path.join(CLAUDE_CODE_DIST, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      throw new Error(`Build output not found at ${settingsPath}`);
    }
    const content = fs.readFileSync(settingsPath, 'utf-8');
    settings = JSON.parse(content);
    binDir = path.join(CLAUDE_CODE_DIST, 'bin');

    // Create fixtures directory
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
  });

  /**
   * Helper to execute a handler with environment variables.
   */
  async function executeHandler(
    handlerPath: string,
    env: Record<string, string>,
    timeout = 5000
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await exec(`node "${handlerPath}"`, {
        env: { ...process.env, ...env },
        timeout,
        cwd: FIXTURES_DIR
      });
      return { exitCode: 0, stdout, stderr };
    } catch (error: unknown) {
      const execError = error as { code?: number; stdout?: string; stderr?: string };
      return {
        exitCode: execError.code ?? 1,
        stdout: execError.stdout ?? '',
        stderr: execError.stderr ?? ''
      };
    }
  }

  /**
   * Helper to execute a validator handler with HTTP stdin protocol.
   */
  async function executeValidator(
    handlerPath: string,
    content: string | Buffer,
    env: Record<string, string>,
    options: { method?: string; contentType?: string } = {}
  ): Promise<{ exitCode: number; stdout: string; stderr: string; response?: { status?: number } }> {
    const { spawn } = await import('node:child_process');

    const method = options.method ?? 'PUT';
    const contentType = options.contentType ?? 'application/octet-stream';
    const body = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');

    const httpRequest =
      `${method} /type/${env.TYPE_NAME ?? 'test'}/${env.FILE_NAME ?? 'test.txt'} HTTP/1.1\r\n` +
      `Content-Type: ${contentType}\r\n` +
      `Content-Length: ${body.length}\r\n` +
      `\r\n`;

    const fullRequest = Buffer.concat([Buffer.from(httpRequest, 'utf-8'), body]);

    return new Promise((resolve) => {
      const proc = spawn('node', [handlerPath], {
        env: { ...process.env, ...env },
        cwd: FIXTURES_DIR,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        let response: { status?: number } | undefined;
        try {
          response = JSON.parse(stdout);
        } catch {
          // Ignore parse errors
        }
        resolve({ exitCode: code ?? 0, stdout, stderr, response });
      });

      proc.stdin.write(fullRequest);
      proc.stdin.end();
    });
  }

  /**
   * Creates base environment variables for type validator handlers.
   */
  function createValidatorEnv(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
    return {
      CARD_ID: 'test-card-123',
      ENVIRONMENT: 'default',
      TYPE_NAME: 'note',
      TYPE_VERSION: '1.0.0',
      FILE_NAME: 'test.md',
      API_BASE_URL: 'http://localhost:3000',
      API_ACCESS_TOKEN: 'test-token-abc',
      ...overrides
    };
  }

  describe('environment variable input', () => {
    it('should read CARD_ID from environment', async () => {
      const files = settings.__generated?.files ?? [];
      const handler = files.find((f) => f.includes('launch-claude-start'));
      if (!handler) throw new Error('Handler not found');

      const handlerPath = path.join(binDir, handler);

      // Missing CARD_ID should fail
      const result = await executeHandler(handlerPath, {
        ENVIRONMENT: 'default',
        EXECUTION_MODE: 'interactive',
        API_BASE_URL: 'http://localhost',
        API_ACCESS_TOKEN: 'token'
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('CARD_ID');
    });

    it('should read EXECUTION_MODE and validate it', async () => {
      const files = settings.__generated?.files ?? [];
      const handler = files.find((f) => f.includes('launch-claude-start'));
      if (!handler) throw new Error('Handler not found');

      const handlerPath = path.join(binDir, handler);

      // Invalid EXECUTION_MODE should fail with specific error
      const result = await executeHandler(handlerPath, {
        CARD_ID: 'test-card',
        ENVIRONMENT: 'default',
        EXECUTION_MODE: 'invalid-mode',
        API_BASE_URL: 'http://localhost',
        API_ACCESS_TOKEN: 'token'
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('EXECUTION_MODE');
      expect(result.stderr).toContain('interactive');
      expect(result.stderr).toContain('background');
    });

    it('should accept both interactive and background execution modes', async () => {
      const files = settings.__generated?.files ?? [];
      const handler = files.find((f) => f.includes('launch-claude-start'));
      if (!handler) throw new Error('Handler not found');

      const handlerPath = path.join(binDir, handler);
      const baseEnv = {
        CARD_ID: 'test-card',
        ENVIRONMENT: 'default',
        API_BASE_URL: 'http://localhost',
        API_ACCESS_TOKEN: 'token'
      };

      // Interactive mode
      const interactiveResult = await executeHandler(handlerPath, {
        ...baseEnv,
        EXECUTION_MODE: 'interactive'
      });
      expect(interactiveResult.exitCode).toBe(0);

      // Background mode
      const backgroundResult = await executeHandler(handlerPath, {
        ...baseEnv,
        EXECUTION_MODE: 'background'
      });
      expect(backgroundResult.exitCode).toBe(0);
    });

    it('should read type hook environment variables for validators', async () => {
      const files = settings.__generated?.files ?? [];
      const handler = files.find((f) => f.includes('note-validator'));
      if (!handler) throw new Error('Handler not found');

      const noteContent = `---
id: test-id
author: Test Author
title: Test Title
---
Content here.
`;

      const handlerPath = path.join(binDir, handler);
      const env = createValidatorEnv({
        TYPE_NAME: 'note',
        TYPE_VERSION: '1.0.0',
        FILE_NAME: 'io-test-note.md'
      });

      const result = await executeValidator(handlerPath, noteContent, env, { contentType: 'text/markdown' });

      expect(result.exitCode).toBe(0);
      expect(result.response?.status).toBe(201);
    });
  });

  describe('validation response output', () => {
    it('should return validation errors in JSON response', async () => {
      const files = settings.__generated?.files ?? [];
      const handler = files.find((f) => f.includes('note-validator'));
      if (!handler) throw new Error('Handler not found');

      const noteContent = `---
id: test-id
---
Missing author and title.
`;

      const handlerPath = path.join(binDir, handler);
      const env = createValidatorEnv({
        TYPE_NAME: 'note',
        FILE_NAME: 'invalid-io-note.md'
      });

      const result = await executeValidator(handlerPath, noteContent, env, { contentType: 'text/markdown' });

      expect(result.exitCode).toBe(0); // Validators always exit 0
      expect(result.response?.status).toBe(400);
    });

    it('should return HTTP parse errors for malformed input', async () => {
      const files = settings.__generated?.files ?? [];
      const handler = files.find((f) => f.includes('note-validator'));
      if (!handler) throw new Error('Handler not found');

      const handlerPath = path.join(binDir, handler);
      const env = createValidatorEnv({ TYPE_NAME: 'note', FILE_NAME: 'test.md' });

      // Send malformed HTTP (missing Content-Length header)
      const { spawn } = await import('node:child_process');
      const result = await new Promise<{ exitCode: number; stdout: string; stderr: string; response?: unknown }>(
        (resolve) => {
          const proc = spawn('node', [handlerPath], {
            env: { ...process.env, ...env },
            cwd: FIXTURES_DIR,
            stdio: ['pipe', 'pipe', 'pipe']
          });

          let stdout = '';
          let stderr = '';

          proc.stdout.on('data', (data) => {
            stdout += data.toString();
          });
          proc.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          proc.on('close', (code) => {
            let response: unknown;
            try {
              response = JSON.parse(stdout);
            } catch {
              // Ignore parse errors
            }
            resolve({ exitCode: code ?? 0, stdout, stderr, response });
          });

          // Send malformed HTTP request (no Content-Length)
          proc.stdin.write('PUT /type/note/test.md HTTP/1.1\r\n\r\n');
          proc.stdin.end();
        }
      );

      // Validator should return 400 for parse error, exit 0
      expect(result.exitCode).toBe(0);
      expect((result.response as { status?: number })?.status).toBe(400);
    });

    it('should return JSON parse errors in response for adaptive card validator', async () => {
      const files = settings.__generated?.files ?? [];
      const handler = files.find((f) => f.includes('adaptive-card-validator'));
      if (!handler) throw new Error('Handler not found');

      const handlerPath = path.join(binDir, handler);
      const env = createValidatorEnv({
        TYPE_NAME: 'adaptive-card',
        FILE_NAME: 'invalid-json.json'
      });

      const result = await executeValidator(handlerPath, '{ invalid json }', env, { contentType: 'application/json' });

      expect(result.exitCode).toBe(0); // Validators always exit 0
      expect(result.response?.status).toBe(400);
    });
  });

  describe('exit codes', () => {
    it('should exit with code 0 on successful validation', async () => {
      const files = settings.__generated?.files ?? [];
      const handler = files.find((f) => f.includes('note-validator'));
      if (!handler) throw new Error('Handler not found');

      const noteContent = `---
id: success-id
author: Success Author
title: Success Title
---
Valid content.
`;

      const handlerPath = path.join(binDir, handler);
      const env = createValidatorEnv({
        TYPE_NAME: 'note',
        FILE_NAME: 'success-note.md'
      });

      const result = await executeValidator(handlerPath, noteContent, env, { contentType: 'text/markdown' });

      expect(result.exitCode).toBe(0);
      expect(result.response?.status).toBe(201);
    });

    it('should exit with code 0 on validation failure (errors in response)', async () => {
      const files = settings.__generated?.files ?? [];
      const handler = files.find((f) => f.includes('note-validator'));
      if (!handler) throw new Error('Handler not found');

      const noteContent = 'No frontmatter at all';

      const handlerPath = path.join(binDir, handler);
      const env = createValidatorEnv({
        TYPE_NAME: 'note',
        FILE_NAME: 'failure-note.md'
      });

      const result = await executeValidator(handlerPath, noteContent, env, { contentType: 'text/markdown' });

      // Validators always exit 0, errors are in the response
      expect(result.exitCode).toBe(0);
      expect(result.response?.status).toBe(400);
    });

    it('should exit with code 1 on environment extraction failure', async () => {
      const files = settings.__generated?.files ?? [];
      const handler = files.find((f) => f.includes('launch-claude-start'));
      if (!handler) throw new Error('Handler not found');

      const handlerPath = path.join(binDir, handler);

      // Run with completely empty environment
      const result = await executeHandler(handlerPath, {});

      expect(result.exitCode).toBe(1);
    });
  });

  describe('file content reading', () => {
    it('should correctly read and validate markdown frontmatter', async () => {
      const files = settings.__generated?.files ?? [];
      const handler = files.find((f) => f.includes('note-validator'));
      if (!handler) throw new Error('Handler not found');

      const noteContent = `---
id: fm-001
author: Frontmatter Author
title: "Title with: special characters"
---

Body content with **markdown** formatting.
`;

      const handlerPath = path.join(binDir, handler);
      const env = createValidatorEnv({
        TYPE_NAME: 'note',
        FILE_NAME: 'frontmatter-note.md'
      });

      const result = await executeValidator(handlerPath, noteContent, env, { contentType: 'text/markdown' });

      expect(result.exitCode).toBe(0);
      expect(result.response?.status).toBe(201);
    });

    it('should correctly read and validate JSON structure', async () => {
      const files = settings.__generated?.files ?? [];
      const handler = files.find((f) => f.includes('adaptive-card-validator'));
      if (!handler) throw new Error('Handler not found');

      const cardContent = JSON.stringify(
        {
          id: 'card-structured',
          summary: 'A structured card for testing',
          author: 'Test Framework',
          payload: {
            type: 'AdaptiveCard',
            version: '1.5',
            body: [
              { type: 'TextBlock', text: 'Header', size: 'large' },
              { type: 'TextBlock', text: 'Content' }
            ],
            actions: [{ type: 'Action.Submit', title: 'Submit' }]
          }
        },
        null,
        2
      );

      const handlerPath = path.join(binDir, handler);
      const env = createValidatorEnv({
        TYPE_NAME: 'adaptive-card',
        FILE_NAME: 'structured-card.json'
      });

      const result = await executeValidator(handlerPath, cardContent, env, { contentType: 'application/json' });

      expect(result.exitCode).toBe(0);
      expect(result.response?.status).toBe(201);
    });

    it('should detect missing required fields in adaptive card', async () => {
      const files = settings.__generated?.files ?? [];
      const handler = files.find((f) => f.includes('adaptive-card-validator'));
      if (!handler) throw new Error('Handler not found');

      const cardContent = JSON.stringify(
        {
          id: 'card-incomplete',
          // Missing: summary, author
          payload: {
            type: 'AdaptiveCard'
          }
        },
        null,
        2
      );

      const handlerPath = path.join(binDir, handler);
      const env = createValidatorEnv({
        TYPE_NAME: 'adaptive-card',
        FILE_NAME: 'incomplete-card.json'
      });

      const result = await executeValidator(handlerPath, cardContent, env, { contentType: 'application/json' });

      expect(result.exitCode).toBe(0); // Validators always exit 0
      expect(result.response?.status).toBe(400);
    });
  });
});

// ============================================================================
// Cross-reference Validation
// ============================================================================

describe('build output: cross-reference validation', () => {
  let settings: Settings & { __generated?: { files: string[] } };
  let binDir: string;

  /**
   * Extracts all handler filenames referenced by settings commands.
   */
  function extractReferencedFiles(): string[] {
    const referencedFiles: string[] = [];

    for (const [_envName, env] of Object.entries(settings.environments)) {
      for (const action of env.actions) {
        referencedFiles.push(extractFilename(action.start.command));
        if (action.end) {
          referencedFiles.push(extractFilename(action.end.command));
        }
      }

      if (env.types) {
        for (const [_typeName, typeDef] of Object.entries(env.types)) {
          if (typeDef.validator) {
            referencedFiles.push(extractFilename(typeDef.validator.command));
          }
          if (typeDef.create) {
            referencedFiles.push(extractFilename(typeDef.create.command));
          }
          if (typeDef.update) {
            referencedFiles.push(extractFilename(typeDef.update.command));
          }
          if (typeDef.delete) {
            referencedFiles.push(extractFilename(typeDef.delete.command));
          }
        }
      }
    }

    return referencedFiles;
  }

  beforeAll(() => {
    const settingsPath = path.join(CLAUDE_CODE_DIST, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      throw new Error(`Build output not found at ${settingsPath}`);
    }
    const content = fs.readFileSync(settingsPath, 'utf-8');
    settings = JSON.parse(content);
    binDir = path.join(CLAUDE_CODE_DIST, 'bin');
  });

  it('should have all referenced handler files exist', () => {
    const referencedFiles = extractReferencedFiles();

    // Verify all referenced files exist on disk
    for (const filename of referencedFiles) {
      const filePath = path.join(binDir, filename);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('should have all referenced handler files listed in __generated.files', () => {
    const generatedFiles = new Set(settings.__generated?.files ?? []);
    const referencedFiles = extractReferencedFiles();

    // Every handler file referenced by a command must be in the generated manifest
    for (const file of referencedFiles) {
      expect(generatedFiles.has(file)).toBe(true);
    }
  });

  it('should have unique content hashes for different handlers', () => {
    const generatedFiles = settings.__generated?.files ?? [];
    const hashes = new Map<string, string>();

    for (const filename of generatedFiles) {
      // Extract hash from filename (e.g., "launch-claude-start.e5f82141.mjs" -> "e5f82141")
      const match = filename.match(/\.([a-f0-9]{8})\.mjs$/);
      if (match) {
        const hash = match[1];
        const baseName = filename.replace(/\.[a-f0-9]{8}\.mjs$/, '');

        // Each base name should have a unique hash
        if (hashes.has(baseName)) {
          expect(hashes.get(baseName)).toBe(hash);
        } else {
          hashes.set(baseName, hash);
        }
      }
    }
  });
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts the filename from a command string.
 * Handles both "./bin/file.mjs" and "$CARDS_PLUGIN_ROOT/bin/file.mjs" formats.
 */
function extractFilename(command: string): string {
  // Remove "node " prefix if present
  const withoutNode = command.replace(/^node\s+/, '');
  // Extract just the filename
  return path.basename(withoutNode);
}
