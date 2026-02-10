/**
 * End-to-end tests for the builder CLI.
 *
 * These tests verify the complete build pipeline:
 * 1. Configuration loading from TypeScript files
 * 2. Handler compilation into standalone ESM bundles
 * 3. Settings.json generation with proper structure
 * 4. Stale file cleanup between builds
 * 5. Error handling for various failure scenarios
 *
 * @module
 */

import { exec as execCallback } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { build } from '../../src/configuration/cli/index.js';
import type { Settings } from '../../src/configuration/schema.js';

const exec = promisify(execCallback);

// ============================================================================
// Test Constants
// ============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Path to the factories module for creating valid handlers.
 */
const FACTORIES_PATH = path.resolve(__dirname, '../../src/configuration/factories/index.js');

/**
 * Temporary directory for test fixtures.
 */
const FIXTURES_BASE = path.join(
  '/tmp/claude-1000/-workspace--worktrees-settings-updates',
  crypto.randomUUID(),
  'builder-cli-fixtures'
);

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a unique test directory for each test.
 */
function createTestDir(name: string): string {
  const dir = path.join(FIXTURES_BASE, name, crypto.randomUUID().slice(0, 8));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Writes a configuration file that imports handlers.
 */
function writeConfig(dir: string, content: string): string {
  const configPath = path.join(dir, 'settings.config.ts');
  fs.writeFileSync(configPath, content, 'utf-8');
  return configPath;
}

/**
 * Writes a handler file.
 */
function writeHandler(dir: string, filename: string, content: string): string {
  const handlerPath = path.join(dir, filename);
  fs.writeFileSync(handlerPath, content, 'utf-8');
  return handlerPath;
}

/**
 * Creates a minimal valid action handler.
 */
function createActionHandler(actionName: string, _handlerPath: string): string {
  return `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';
import { fileURLToPath } from 'node:url';

export default defineAction(
  {
    actionName: '${actionName}',
    timeout: 30000,
    sourcePath: fileURLToPath(import.meta.url)
  },
  async (input, { logger }) => {
    logger.info('${actionName} executed');
  }
);
`;
}

/**
 * Creates a minimal valid type validator handler.
 */
function createTypeValidatorHandler(typeName: string, _handlerPath: string): string {
  return `
import { defineTypeValidator, validationSuccess } from '${FACTORIES_PATH.replace(/\\/g, '/')}';
import { fileURLToPath } from 'node:url';

export default defineTypeValidator(
  {
    typeName: '${typeName}',
    timeout: 30000,
    sourcePath: fileURLToPath(import.meta.url)
  },
  async (request, context) => {
    context.logger.info('${typeName} validated');
    return validationSuccess({ typeName: '${typeName}' });
  }
);
`;
}

/**
 * Reads and parses settings.json from the output directory.
 */
function readSettings(outdir: string): Settings & { __generated?: { files: string[] } } {
  const settingsPath = path.join(outdir, 'settings.json');
  const content = fs.readFileSync(settingsPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Lists files in the bin directory.
 */
function listBinFiles(outdir: string): string[] {
  const binDir = path.join(outdir, 'bin');
  if (!fs.existsSync(binDir)) {
    return [];
  }
  return fs.readdirSync(binDir).filter((f) => f.endsWith('.mjs'));
}

// ============================================================================
// Tests
// ============================================================================

describe('builder CLI: build function', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir('build-function');
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('successful builds', () => {
    it('should build a config with a single action', async () => {
      writeHandler(testDir, 'my-action.ts', createActionHandler('My Action', testDir));

      // Create config
      const configPath = writeConfig(
        testDir,
        `
import handler from './my-action.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [handler]
    }
  }
};
`
      );

      const outdir = path.join(testDir, 'dist');

      // Build
      const result = await build({ config: configPath, outdir });

      if (!result.success) {
        console.error('Build failed:', result.error);
      }
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.settingsPath).toBe(path.join(outdir, 'settings.json'));
        expect(result.compiledHandlers.length).toBe(1);
      }

      // Verify settings.json
      const settings = readSettings(outdir);
      expect(settings.environments['default']).toBeDefined();
      expect(settings.environments['default']!.actions).toHaveLength(1);
      expect(settings.environments['default']!.actions[0]!.name).toBe('My Action');
      expect(settings.environments['default']!.actions[0]!.command.command).toMatch(/\.mjs$/);

      // Verify compiled handler exists
      const binFiles = listBinFiles(outdir);
      expect(binFiles.length).toBe(1);
      expect(binFiles[0]).toMatch(/my-action\.[a-f0-9]{8}\.mjs$/);
    });

    it('should build a config with multiple actions', async () => {
      // Create handlers
      writeHandler(testDir, 'launch.ts', createActionHandler('Launch', testDir));
      writeHandler(testDir, 'deploy.ts', createActionHandler('Deploy', testDir));

      // Create config
      const configPath = writeConfig(
        testDir,
        `
import launchHandler from './launch.js';
import deployHandler from './deploy.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [launchHandler, deployHandler]
    }
  }
};
`
      );

      const outdir = path.join(testDir, 'dist');
      const result = await build({ config: configPath, outdir });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.compiledHandlers.length).toBe(2);
      }

      // Verify settings.json
      const settings = readSettings(outdir);
      expect(settings.environments['default']!.actions).toHaveLength(2);
      expect(settings.environments['default']!.actions[0]!.command.command).toMatch(/launch\.[a-f0-9]{8}\.mjs$/);
      expect(settings.environments['default']!.actions[1]!.command.command).toMatch(/deploy\.[a-f0-9]{8}\.mjs$/);

      // Verify both handlers compiled
      const binFiles = listBinFiles(outdir);
      expect(binFiles.length).toBe(2);
    });

    it('should build a config with type validators', async () => {
      // Create handlers
      writeHandler(testDir, 'action-start.ts', createActionHandler('Test Action', testDir));
      writeHandler(testDir, 'note-validator.ts', createTypeValidatorHandler('note', testDir));

      // Create config
      const configPath = writeConfig(
        testDir,
        `
import action from './action-start.js';
import noteValidator from './note-validator.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action],
      types: {
        note: {
          version: '1.0.0',
          validator: noteValidator
        }
      }
    }
  }
};
`
      );

      const outdir = path.join(testDir, 'dist');
      const result = await build({ config: configPath, outdir });

      expect(result.success).toBe(true);

      // Verify settings.json has types
      const settings = readSettings(outdir);
      expect(settings.environments['default']!.types).toBeDefined();
      expect(settings.environments['default']!.types?.['note']).toBeDefined();
      expect(settings.environments['default']!.types?.['note']!.version).toBe('1.0.0');
      expect(settings.environments['default']!.types?.['note']!.validator?.command).toMatch(
        /note-validator\.[a-f0-9]{8}\.mjs$/
      );
    });

    it('should build a config with multiple environments', async () => {
      // Create handlers
      writeHandler(testDir, 'dev-action.ts', createActionHandler('Dev Action', testDir));
      writeHandler(testDir, 'prod-action.ts', createActionHandler('Prod Action', testDir));

      // Create config
      const configPath = writeConfig(
        testDir,
        `
import devAction from './dev-action.js';
import prodAction from './prod-action.js';

export default {
  environments: {
    development: {
      version: 1,
      description: 'Development environment',
      actions: [devAction]
    },
    production: {
      version: 1,
      description: 'Production environment',
      actions: [prodAction]
    }
  }
};
`
      );

      const outdir = path.join(testDir, 'dist');
      const result = await build({ config: configPath, outdir });

      expect(result.success).toBe(true);

      // Verify settings.json has both environments
      const settings = readSettings(outdir);
      expect(settings.environments['development']).toBeDefined();
      expect(settings.environments['production']).toBeDefined();
      expect(settings.environments['development']!.description).toBe('Development environment');
      expect(settings.environments['production']!.description).toBe('Production environment');
    });

    it('should include action metadata in settings.json', async () => {
      // Create handler with all metadata
      const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';
import { fileURLToPath } from 'node:url';

export default defineAction(
  {
    actionName: 'Full Metadata Action',
    description: 'An action with all metadata',
    icon: 'rocket',
    timeout: 60000,
    supportsBackgroundMode: true,
    allowConcurrent: false,
    sourcePath: fileURLToPath(import.meta.url)
  },
  async (input, { logger }) => {
    logger.info('Executed');
  }
);
`;
      writeHandler(testDir, 'full-action.ts', handlerContent);

      const configPath = writeConfig(
        testDir,
        `
import action from './full-action.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action]
    }
  }
};
`
      );

      const outdir = path.join(testDir, 'dist');
      const result = await build({ config: configPath, outdir });

      expect(result.success).toBe(true);

      // Verify all metadata is in settings.json
      const settings = readSettings(outdir);
      const action = settings.environments['default']!.actions[0]!;
      expect(action.name).toBe('Full Metadata Action');
      expect(action.description).toBe('An action with all metadata');
      expect(action.icon).toBe('rocket');
      expect(action.supportsBackgroundMode).toBe(true);
      expect(action.allowConcurrent).toBe(false);
      expect(action.command.timeout).toBe(60000);
    });
  });

  describe('__generated metadata', () => {
    it('should include __generated metadata with file list', async () => {
      writeHandler(testDir, 'action.ts', createActionHandler('Test', testDir));

      const configPath = writeConfig(
        testDir,
        `
import action from './action.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action]
    }
  }
};
`
      );

      const outdir = path.join(testDir, 'dist');
      await build({ config: configPath, outdir });

      const settings = readSettings(outdir);
      expect(settings.__generated).toBeDefined();
      expect(settings.__generated?.files).toBeInstanceOf(Array);
      expect(settings.__generated?.files.length).toBe(1);
    });

    it('should list unique files in __generated.files', async () => {
      // Create handlers where one is used twice
      writeHandler(testDir, 'shared-handler.ts', createActionHandler('Shared', testDir));

      const configPath = writeConfig(
        testDir,
        `
import handler from './shared-handler.js';

export default {
  environments: {
    env1: {
      version: 1,
      actions: [handler]
    },
    env2: {
      version: 1,
      actions: [handler]
    }
  }
};
`
      );

      const outdir = path.join(testDir, 'dist');
      await build({ config: configPath, outdir });

      const settings = readSettings(outdir);
      // Should only have one unique file even though handler is used twice
      expect(settings.__generated?.files.length).toBe(1);
    });
  });

  describe('content hashing', () => {
    it('should generate deterministic hashes for same content', async () => {
      writeHandler(testDir, 'action.ts', createActionHandler('Test', testDir));

      const configPath = writeConfig(
        testDir,
        `
import action from './action.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action]
    }
  }
};
`
      );

      const outdir1 = path.join(testDir, 'dist1');
      const outdir2 = path.join(testDir, 'dist2');

      await build({ config: configPath, outdir: outdir1 });
      await build({ config: configPath, outdir: outdir2 });

      const files1 = listBinFiles(outdir1);
      const files2 = listBinFiles(outdir2);

      // Same content should produce same hash
      expect(files1[0]!).toBe(files2[0]!);
    });

    it('should generate different hashes for different content', async () => {
      writeHandler(testDir, 'action1.ts', createActionHandler('Action One', testDir));
      writeHandler(testDir, 'action2.ts', createActionHandler('Action Two', testDir));

      const configPath = writeConfig(
        testDir,
        `
import action1 from './action1.js';
import action2 from './action2.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action1, action2]
    }
  }
};
`
      );

      const outdir = path.join(testDir, 'dist');
      await build({ config: configPath, outdir });

      const files = listBinFiles(outdir);
      expect(files.length).toBe(2);

      // Extract hashes
      const hash1 = files[0]!.match(/\.([a-f0-9]{8})\.mjs$/)?.[1];
      const hash2 = files[1]!.match(/\.([a-f0-9]{8})\.mjs$/)?.[1];

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('stale file cleanup', () => {
    it('should remove stale files from previous build', async () => {
      // First build with two actions
      writeHandler(testDir, 'action1.ts', createActionHandler('Action 1', testDir));
      writeHandler(testDir, 'action2.ts', createActionHandler('Action 2', testDir));

      const configPath = writeConfig(
        testDir,
        `
import action1 from './action1.js';
import action2 from './action2.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action1, action2]
    }
  }
};
`
      );

      const outdir = path.join(testDir, 'dist');
      await build({ config: configPath, outdir });

      const filesAfterFirstBuild = listBinFiles(outdir);
      expect(filesAfterFirstBuild.length).toBe(2);

      // Second build with only one action
      writeConfig(
        testDir,
        `
import action1 from './action1.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action1]
    }
  }
};
`
      );

      await build({ config: configPath, outdir });

      const filesAfterSecondBuild = listBinFiles(outdir);
      expect(filesAfterSecondBuild.length).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should fail for non-existent config file', async () => {
      const result = await build({
        config: path.join(testDir, 'does-not-exist.config.ts'),
        outdir: path.join(testDir, 'dist')
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('does not exist');
      }
    });

    it('should fail for config with invalid structure', async () => {
      writeConfig(
        testDir,
        `
export default {
  // Missing environments
  version: 1
};
`
      );

      const result = await build({
        config: path.join(testDir, 'settings.config.ts'),
        outdir: path.join(testDir, 'dist')
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('invalid structure');
      }
    });

    it('should fail for config with syntax error', async () => {
      writeConfig(
        testDir,
        `
export default {
  environments: {
    default: {
      version: 1
      actions: []  // Missing comma
    }
  }
};
`
      );

      const result = await build({
        config: path.join(testDir, 'settings.config.ts'),
        outdir: path.join(testDir, 'dist')
      });

      expect(result.success).toBe(false);
    });

    it('should fail for handler with compilation error', async () => {
      // Create handler with syntax error
      writeHandler(
        testDir,
        'broken.ts',
        `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineAction(
  { actionName: 'Broken', timeout: 30000, sourcePath: '/broken.ts' },
  async (input, { logger }) => {
    // Missing closing brace
    logger.info('test');
`
      );

      const configPath = writeConfig(
        testDir,
        `
import broken from './broken.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [broken]
    }
  }
};
`
      );

      const result = await build({
        config: configPath,
        outdir: path.join(testDir, 'dist')
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });
  });
});

describe('builder CLI: compiled handler execution', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir('handler-execution');
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  /**
   * Helper to execute a compiled handler.
   */
  async function executeHandler(
    handlerPath: string,
    env: Record<string, string>
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await exec(`node "${handlerPath}"`, {
        env: { ...process.env, ...env },
        timeout: 10000
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
   * Helper to execute a validator handler with file-path protocol.
   *
   * Creates a temporary file with the given content, sets FILE_PATH in env,
   * and executes the handler. Returns the parsed ValidationResult from stdout.
   */
  async function executeValidator(
    handlerPath: string,
    content: string | Buffer,
    env: Record<string, string>,
    _options: { method?: string; contentType?: string } = {}
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
    response?: { valid?: boolean; metadata?: Record<string, unknown> };
  }> {
    const { spawn } = await import('node:child_process');
    const fs = await import('node:fs');

    // Write content to a temp file and pass FILE_PATH
    const filePath = path.join(testDir, `validator-input-${Date.now()}.tmp`);
    const body = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
    fs.writeFileSync(filePath, body);

    return new Promise((resolve) => {
      const proc = spawn('node', [handlerPath], {
        env: { ...process.env, ...env, FILE_PATH: filePath },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        let response: { valid?: boolean; metadata?: Record<string, unknown> } | undefined;
        try {
          response = JSON.parse(stdout);
        } catch {
          // Ignore parse errors
        }
        // Clean up temp file
        try {
          fs.unlinkSync(filePath);
        } catch {
          /* ignore */
        }
        resolve({
          exitCode: code ?? 0,
          stdout,
          stderr,
          response
        });
      });

      // Close stdin immediately (no longer needed)
      proc.stdin.end();
    });
  }

  it('should compile handlers that execute successfully', async () => {
    writeHandler(testDir, 'action.ts', createActionHandler('Executable', testDir));

    const configPath = writeConfig(
      testDir,
      `
import action from './action.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action]
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    await build({ config: configPath, outdir });

    const binFiles = listBinFiles(outdir);
    expect(binFiles.length).toBe(1);

    const handlerPath = path.join(outdir, 'bin', binFiles[0]!);
    const result = await executeHandler(handlerPath, {
      CARD_ID: 'test-card',
      ACTION_NAME: 'Test',
      ENVIRONMENT: 'default',
      EXECUTION_MODE: 'interactive',
      API_BASE_URL: 'http://localhost',
      API_ACCESS_TOKEN: 'token',
      WORKSPACE_PATH: testDir,
      CARD_REPO_PATH: testDir
    });

    expect(result.exitCode).toBe(0);
  });

  it('should compile type validators that execute successfully', async () => {
    writeHandler(testDir, 'action.ts', createActionHandler('Test', testDir));
    writeHandler(testDir, 'validator.ts', createTypeValidatorHandler('test-type', testDir));

    const configPath = writeConfig(
      testDir,
      `
import action from './action.js';
import validator from './validator.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action],
      types: {
        'test-type': {
          version: '1.0.0',
          validator: validator
        }
      }
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    await build({ config: configPath, outdir });

    // Find the validator handler
    const binFiles = listBinFiles(outdir);
    const validatorFile = binFiles.find((f) => f.includes('validator'));
    expect(validatorFile).toBeDefined();

    // Test content to validate
    const testContent = 'test content for validation';

    const handlerPath = path.join(outdir, 'bin', validatorFile!);
    const result = await executeValidator(
      handlerPath,
      testContent,
      {
        CARD_ID: 'test-card',
        ENVIRONMENT: 'default',
        TYPE_NAME: 'test-type',
        TYPE_VERSION: '1.0.0',
        FILE_NAME: 'test-file.txt',
        API_BASE_URL: 'http://localhost',
        API_ACCESS_TOKEN: 'token'
      },
      { contentType: 'text/plain' }
    );

    expect(result.exitCode).toBe(0);
    expect(result.response?.valid).toBe(true);
  });

  it('should compile handlers with CommonJS dependencies', async () => {
    // Create a handler that would need CommonJS support
    const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

export default defineAction(
  {
    actionName: 'CJS Test',
    timeout: 30000,
    sourcePath: fileURLToPath(import.meta.url)
  },
  async (input, { logger }) => {
    // Use path module (a Node built-in that works with CJS shim)
    const joined = path.join('a', 'b', 'c');
    logger.info('Path joined: ' + joined);
  }
);
`;
    writeHandler(testDir, 'cjs-action.ts', handlerContent);

    const configPath = writeConfig(
      testDir,
      `
import action from './cjs-action.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action]
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    const buildResult = await build({ config: configPath, outdir });
    expect(buildResult.success).toBe(true);

    const binFiles = listBinFiles(outdir);
    const handlerPath = path.join(outdir, 'bin', binFiles[0]!);
    const result = await executeHandler(handlerPath, {
      CARD_ID: 'test-card',
      ACTION_NAME: 'CJS Test',
      ENVIRONMENT: 'default',
      EXECUTION_MODE: 'interactive',
      API_BASE_URL: 'http://localhost',
      API_ACCESS_TOKEN: 'token',
      WORKSPACE_PATH: testDir,
      CARD_REPO_PATH: testDir
    });

    expect(result.exitCode).toBe(0);
  });
});

describe('builder CLI: directory and file handling', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir('file-handling');
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should create output directory if it does not exist', async () => {
    writeHandler(testDir, 'action.ts', createActionHandler('Test', testDir));

    const configPath = writeConfig(
      testDir,
      `
import action from './action.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action]
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'nested', 'output', 'directory');
    expect(fs.existsSync(outdir)).toBe(false);

    const result = await build({ config: configPath, outdir });

    expect(result.success).toBe(true);
    expect(fs.existsSync(outdir)).toBe(true);
    expect(fs.existsSync(path.join(outdir, 'settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(outdir, 'bin'))).toBe(true);
  });

  it('should create bin directory for compiled handlers', async () => {
    writeHandler(testDir, 'action.ts', createActionHandler('Test', testDir));

    const configPath = writeConfig(
      testDir,
      `
import action from './action.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action]
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    await build({ config: configPath, outdir });

    const binDir = path.join(outdir, 'bin');
    expect(fs.existsSync(binDir)).toBe(true);
    expect(fs.statSync(binDir).isDirectory()).toBe(true);
  });

  it('should make compiled handlers executable', async () => {
    writeHandler(testDir, 'action.ts', createActionHandler('Test', testDir));

    const configPath = writeConfig(
      testDir,
      `
import action from './action.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action]
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    await build({ config: configPath, outdir });

    const binFiles = listBinFiles(outdir);
    for (const file of binFiles) {
      const filePath = path.join(outdir, 'bin', file);
      const stats = fs.statSync(filePath);
      // Check executable bit
      const isExecutable = (stats.mode & 0o100) !== 0;
      expect(isExecutable).toBe(true);
    }
  });

  it('should write settings.json with proper formatting', async () => {
    writeHandler(testDir, 'action.ts', createActionHandler('Test', testDir));

    const configPath = writeConfig(
      testDir,
      `
import action from './action.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action]
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    await build({ config: configPath, outdir });

    const settingsContent = fs.readFileSync(path.join(outdir, 'settings.json'), 'utf-8');

    // Should be formatted with 2-space indentation
    expect(settingsContent).toContain('\n');
    expect(settingsContent).toContain('  ');

    // Should be valid JSON
    expect(() => JSON.parse(settingsContent)).not.toThrow();
  });
});

describe('builder CLI: stream transform builds', () => {
  let testDir: string;

  /**
   * Path to the stream transform factory for test fixtures.
   */
  const STREAM_TRANSFORM_FACTORY_PATH = path.resolve(
    __dirname,
    '../../src/configuration/factories/stream-transform.js'
  );

  /**
   * Creates a minimal valid stream transform handler.
   */
  function createStreamTransformHandler(streamType: string, handlerPath: string): string {
    return `
import { defineStreamTransform } from '${STREAM_TRANSFORM_FACTORY_PATH.replace(/\\/g, '/')}';

export default defineStreamTransform(
  {
    streamType: '${streamType}',
    sourcePath: '${handlerPath.replace(/\\/g, '/')}'
  },
  (line) => \`[\${line}]\`,
  (ctx) => { ctx.state.set('ready', true); }
);
`;
  }

  /**
   * Creates a stream transform handler with metadata.
   */
  function createStreamTransformHandlerWithMetadata(streamType: string, handlerPath: string): string {
    return `
import { defineStreamTransform } from '${STREAM_TRANSFORM_FACTORY_PATH.replace(/\\/g, '/')}';

export default defineStreamTransform(
  {
    streamType: '${streamType}',
    sourcePath: '${handlerPath.replace(/\\/g, '/')}',
    timeout: 10000,
    maxLineLength: 2048,
    maxStreamSize: 1048576
  },
  (line) => \`[\${line}]\`
);
`;
  }

  /**
   * Creates a stream transform handler without sourcePath.
   */
  function createStreamTransformHandlerNoSourcePath(streamType: string): string {
    return `
import { defineStreamTransform } from '${STREAM_TRANSFORM_FACTORY_PATH.replace(/\\/g, '/')}';

export default defineStreamTransform(
  { streamType: '${streamType}' },
  (line) => \`[\${line}]\`
);
`;
  }

  beforeEach(() => {
    testDir = createTestDir('stream-transform');
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should build config with stream transform and include streams section in settings.json', async () => {
    writeHandler(testDir, 'action-start.ts', createActionHandler('Test Action', testDir));
    writeHandler(
      testDir,
      'test-stream.ts',
      createStreamTransformHandler('test-stream', path.join(testDir, 'test-stream.ts'))
    );

    // Create config with both action and stream
    const configPath = writeConfig(
      testDir,
      `
import action from './action-start.js';
import streamHandler from './test-stream.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action],
      streams: {
        'test-stream': {
          version: 1,
          transform: streamHandler
        }
      }
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    const result = await build({ config: configPath, outdir });

    expect(result.success).toBe(true);

    // Verify settings.json has streams section
    const settings = readSettings(outdir);
    expect(settings.environments['default']!.streams).toBeDefined();
    expect(settings.environments['default']!.streams?.['test-stream']).toBeDefined();
    expect(settings.environments['default']!.streams?.['test-stream']!.version).toBe(1);

    // Verify transform.path matches bin/<name>.<hash>.mjs pattern
    const transformPath = settings.environments['default']!.streams?.['test-stream']!.transform?.path;
    expect(transformPath).toMatch(/^bin\/test-stream\.[a-f0-9]{8}\.mjs$/);
  });

  it('should create compiled stream transform file in bin/ with content hash filename', async () => {
    writeHandler(testDir, 'action-start.ts', createActionHandler('Test Action', testDir));
    writeHandler(
      testDir,
      'my-stream.ts',
      createStreamTransformHandler('my-stream', path.join(testDir, 'my-stream.ts'))
    );

    const configPath = writeConfig(
      testDir,
      `
import action from './action-start.js';
import streamHandler from './my-stream.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action],
      streams: {
        'my-stream': {
          version: 1,
          transform: streamHandler
        }
      }
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    await build({ config: configPath, outdir });

    // Verify bin/ contains the stream transform file
    const binFiles = listBinFiles(outdir);
    const streamFile = binFiles.find((f) => f.includes('my-stream'));
    expect(streamFile).toBeDefined();

    // Verify filename includes content hash pattern [name].[8chars].mjs
    expect(streamFile).toMatch(/^my-stream\.[a-f0-9]{8}\.mjs$/);
  });

  it('should compile stream transform as valid ESM without bare imports', async () => {
    writeHandler(testDir, 'action-start.ts', createActionHandler('Test Action', testDir));
    writeHandler(
      testDir,
      'transform.ts',
      createStreamTransformHandler('transform', path.join(testDir, 'transform.ts'))
    );

    const configPath = writeConfig(
      testDir,
      `
import action from './action-start.js';
import streamHandler from './transform.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action],
      streams: {
        'transform': {
          version: 1,
          transform: streamHandler
        }
      }
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    await build({ config: configPath, outdir });

    // Read the compiled stream transform file
    const binFiles = listBinFiles(outdir);
    const streamFile = binFiles.find((f) => f.includes('transform'));
    expect(streamFile).toBeDefined();

    const compiledPath = path.join(outdir, 'bin', streamFile!);
    const compiledContent = fs.readFileSync(compiledPath, 'utf-8');

    // Verify it exports init (either as named export or export declaration)
    expect(compiledContent).toMatch(/export\s+(\{[^}]*init[^}]*\}|function init)/);
    expect(compiledContent).toContain('export');
    expect(compiledContent).toMatch(/export\s+\{[^}]*default[^}]*\}|export default/);

    // Verify it does NOT contain bare import statements (fully bundled)
    // Allow only the shebang line at the start
    const lines = compiledContent.split('\n').filter((line) => !line.startsWith('#!'));
    const hasImport = lines.some((line) => line.trim().startsWith('import '));
    expect(hasImport).toBe(false);

    // Verify it does NOT contain createRequire banner (stream transforms should not have it)
    expect(compiledContent).not.toContain('createRequire');
  });

  it('should support stream transforms coexisting with actions and types', async () => {
    // Create all three handler types
    writeHandler(testDir, 'action.ts', createActionHandler('Test Action', testDir));
    writeHandler(testDir, 'validator.ts', createTypeValidatorHandler('test-type', testDir));
    writeHandler(testDir, 'stream.ts', createStreamTransformHandler('test-stream', path.join(testDir, 'stream.ts')));

    const configPath = writeConfig(
      testDir,
      `
import action from './action.js';
import validator from './validator.js';
import streamHandler from './stream.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action],
      types: {
        'test-type': {
          version: '1.0.0',
          validator: validator
        }
      },
      streams: {
        'test-stream': {
          version: 1,
          transform: streamHandler
        }
      }
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    const result = await build({ config: configPath, outdir });

    expect(result.success).toBe(true);

    // Verify settings.json has all three sections
    const settings = readSettings(outdir);
    expect(settings.environments['default']!.actions).toBeDefined();
    expect(settings.environments['default']!.actions.length).toBe(1);
    expect(settings.environments['default']!.types).toBeDefined();
    expect(settings.environments['default']!.types?.['test-type']).toBeDefined();
    expect(settings.environments['default']!.streams).toBeDefined();
    expect(settings.environments['default']!.streams?.['test-stream']).toBeDefined();

    // Verify bin/ has files for all three handler types
    const binFiles = listBinFiles(outdir);
    expect(binFiles.length).toBe(3);
    expect(binFiles.some((f) => f.includes('action'))).toBe(true);
    expect(binFiles.some((f) => f.includes('validator'))).toBe(true);
    expect(binFiles.some((f) => f.includes('stream'))).toBe(true);
  });

  it('should include stream transform files in __generated.files', async () => {
    writeHandler(testDir, 'action.ts', createActionHandler('Test Action', testDir));
    writeHandler(testDir, 'stream.ts', createStreamTransformHandler('stream', path.join(testDir, 'stream.ts')));

    const configPath = writeConfig(
      testDir,
      `
import action from './action.js';
import streamHandler from './stream.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action],
      streams: {
        'stream': {
          version: 1,
          transform: streamHandler
        }
      }
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    await build({ config: configPath, outdir });

    // Verify __generated.files includes stream transform
    const settings = readSettings(outdir);
    expect(settings.__generated?.files).toBeDefined();
    expect(settings.__generated?.files.length).toBe(2); // action + stream

    const streamFile = settings.__generated?.files.find((f) => f.includes('stream'));
    expect(streamFile).toBeDefined();
    expect(streamFile).toMatch(/^stream\.[a-f0-9]{8}\.mjs$/);
  });

  it('should clean up stale stream transform files on rebuild', async () => {
    // First build: config with stream + action
    writeHandler(testDir, 'action.ts', createActionHandler('Test Action', testDir));
    writeHandler(testDir, 'stream.ts', createStreamTransformHandler('stream', path.join(testDir, 'stream.ts')));

    const configPath = writeConfig(
      testDir,
      `
import action from './action.js';
import streamHandler from './stream.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action],
      streams: {
        'stream': {
          version: 1,
          transform: streamHandler
        }
      }
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    await build({ config: configPath, outdir });

    const filesAfterFirstBuild = listBinFiles(outdir);
    expect(filesAfterFirstBuild.length).toBe(2); // action + stream
    const streamFile = filesAfterFirstBuild.find((f) => f.includes('stream'));
    expect(streamFile).toBeDefined();

    // Second build: config with only action (no stream)
    writeConfig(
      testDir,
      `
import action from './action.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action]
    }
  }
};
`
    );

    await build({ config: configPath, outdir });

    // Verify stream transform file is cleaned up
    const filesAfterSecondBuild = listBinFiles(outdir);
    expect(filesAfterSecondBuild.length).toBe(1); // only action
    expect(filesAfterSecondBuild.some((f) => f.includes('stream'))).toBe(false);
  });

  it('should preserve stream metadata in settings.json', async () => {
    writeHandler(testDir, 'action.ts', createActionHandler('Test Action', testDir));
    writeHandler(
      testDir,
      'stream-with-metadata.ts',
      createStreamTransformHandlerWithMetadata('stream-with-metadata', path.join(testDir, 'stream-with-metadata.ts'))
    );

    const configPath = writeConfig(
      testDir,
      `
import action from './action.js';
import streamHandler from './stream-with-metadata.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action],
      streams: {
        'stream-with-metadata': {
          version: 2,
          transform: streamHandler
        }
      }
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    await build({ config: configPath, outdir });

    // Verify all metadata fields are in settings.json
    const settings = readSettings(outdir);
    const streamConfig = settings.environments['default']!.streams?.['stream-with-metadata'];
    expect(streamConfig).toBeDefined();
    expect(streamConfig?.version).toBe(2);
    expect(streamConfig?.transform?.timeout).toBe(10000);
    expect(streamConfig?.maxLineLength).toBe(2048);
    expect(streamConfig?.maxStreamSize).toBe(1048576);
  });

  it('should produce placeholder path for stream transform without sourcePath', async () => {
    writeHandler(testDir, 'action.ts', createActionHandler('Test Action', testDir));
    writeHandler(testDir, 'stream-no-source.ts', createStreamTransformHandlerNoSourcePath('stream-no-source'));

    const configPath = writeConfig(
      testDir,
      `
import action from './action.js';
import streamHandler from './stream-no-source.js';

export default {
  environments: {
    default: {
      version: 1,
      actions: [action],
      streams: {
        'stream-no-source': {
          version: 1,
          transform: streamHandler
        }
      }
    }
  }
};
`
    );

    const outdir = path.join(testDir, 'dist');
    await build({ config: configPath, outdir });

    // Verify settings.json stream has placeholder-format path
    const settings = readSettings(outdir);
    const streamConfig = settings.environments['default']!.streams?.['stream-no-source'];
    expect(streamConfig).toBeDefined();

    // Stream without sourcePath should produce a placeholder path (not compiled)
    const transformPath = streamConfig?.transform?.path;
    expect(transformPath).toBeDefined();
    // Placeholder paths follow the pattern: streamTransform-<streamType>.js
    expect(transformPath).toMatch(/^streamTransform-stream-no-source\.js$/);
  });
});

// ============================================================================
// Cleanup
// ============================================================================

beforeAll(() => {
  fs.mkdirSync(FIXTURES_BASE, { recursive: true });
});

afterAll(() => {
  fs.rmSync(FIXTURES_BASE, { recursive: true, force: true });
});
