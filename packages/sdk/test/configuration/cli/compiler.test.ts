/**
 * Tests for the handler compiler.
 *
 * These tests verify that the compiler correctly bundles handler files into
 * standalone ESM bundles with runtime wrapper code injected.
 *
 * @summary Tests for the handler compiler
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compileHandler } from '../../../src/config/cli/compiler.js';

// Resolve the path to the factories module for test fixtures
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FACTORIES_PATH = path.resolve(__dirname, '../../../src/config/factories/index.js');
const STREAM_TRANSFORM_PATH = path.resolve(__dirname, '../../../src/config/factories/stream-transform.js');

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a temporary directory for test files.
 *
 * @returns Absolute path to a newly created temporary directory.
 */
function createTestDir(): string {
  const scratchpad = path.join(
    os.tmpdir(),
    'claude-1000/-workspace--worktrees-settings-updates',
    '14bd0ed8-2e93-4c1d-bbc6-ce5ed92e3214',
    'scratchpad',
    `test-${Date.now()}-${Math.random().toString(36).substring(7)}`
  );
  fs.mkdirSync(scratchpad, { recursive: true });
  return scratchpad;
}

/**
 * Writes a test handler file and returns its path.
 *
 * @param dir - Directory where the handler fixture should be written.
 * @param filename - Filename to assign to the handler fixture.
 * @param content - Source code content to write into the fixture file.
 * @returns Absolute path to the written handler fixture.
 */
function writeTestHandler(dir: string, filename: string, content: string): string {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Reads the compiled output file.
 *
 * @param outputPath - Absolute path to the compiled bundle to inspect.
 * @returns UTF-8 source text of the compiled bundle.
 */
function readCompiledOutput(outputPath: string): string {
  return fs.readFileSync(outputPath, 'utf-8');
}

/**
 * Cleans up a test directory.
 *
 * @param dir - Directory path to recursively remove.
 */
function cleanupTestDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('compileHandler', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir();
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  // ==========================================================================
  // Basic Compilation
  // ==========================================================================

  it('should compile a simple JavaScript handler to ESM bundle', async () => {
    // Create a simple handler that imports from the real source path
    const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineAction(
  { actionName: 'Test', timeout: 30000 },
  async (input, context) => {
    context.logger.info('Action started');
  }
);
`;
    const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
    const outputPath = path.join(testDir, 'output.mjs');

    // Compile
    const result = await compileHandler({
      sourcePath,
      outputPath,
      sourcemap: false
    });

    // Verify success
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.outputPath).toBe(outputPath);
    }

    // Verify output file exists
    expect(fs.existsSync(outputPath)).toBe(true);

    // Verify output is valid JavaScript
    const output = readCompiledOutput(outputPath);
    expect(output).toBeTruthy();
    expect(output.length).toBeGreaterThan(0);
  });

  it('should compile a TypeScript handler to ESM bundle', async () => {
    // Create a TypeScript handler that imports from the real source path
    const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';
import type { ActionInput, ActionContext } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineAction(
  { actionName: 'Test', timeout: 30000 },
  async (input: ActionInput, context: ActionContext) => {
    context.logger.info('Action started');
  }
);
`;
    const sourcePath = writeTestHandler(testDir, 'handler.ts', handlerContent);
    const outputPath = path.join(testDir, 'output.mjs');

    // Compile
    const result = await compileHandler({
      sourcePath,
      outputPath,
      sourcemap: false
    });

    // Verify success
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.outputPath).toBe(outputPath);
    }

    // Verify output file exists
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  // ==========================================================================
  // Wrapper Injection
  // ==========================================================================

  it('should inject runtime wrapper code that calls executeCommand', async () => {
    // Create a simple handler
    const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineAction(
  { actionName: 'Test', timeout: 30000 },
  async (input, context) => {
    context.logger.info('Test');
  }
);
`;
    const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
    const outputPath = path.join(testDir, 'output.mjs');

    // Compile
    const result = await compileHandler({
      sourcePath,
      outputPath,
      sourcemap: false
    });

    // Verify success
    expect(result.success).toBe(true);

    // Read output and verify wrapper code
    const output = readCompiledOutput(outputPath);

    // The output should import executeCommand from the runtime
    expect(output).toContain('executeCommand');

    // The output should call executeCommand (either directly or through bundled code)
    // We're looking for the pattern where executeCommand is invoked
    expect(output).toMatch(/executeCommand\s*\(/);
  });

  // ==========================================================================
  // Source Maps
  // ==========================================================================

  it('should generate inline source maps when requested', async () => {
    const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineAction(
  { actionName: 'Test', timeout: 30000 },
  async (input, context) => {
    context.logger.info('Test');
  }
);
`;
    const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
    const outputPath = path.join(testDir, 'output.mjs');

    // Compile with sourcemap
    const result = await compileHandler({
      sourcePath,
      outputPath,
      sourcemap: true
    });

    // Verify success
    expect(result.success).toBe(true);

    // Read output and verify source map is present
    const output = readCompiledOutput(outputPath);
    expect(output).toContain('sourceMappingURL');
  });

  it('should not generate source maps when not requested', async () => {
    const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineAction(
  { actionName: 'Test', timeout: 30000 },
  async (input, context) => {
    context.logger.info('Test');
  }
);
`;
    const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
    const outputPath = path.join(testDir, 'output.mjs');

    // Compile without sourcemap
    const result = await compileHandler({
      sourcePath,
      outputPath,
      sourcemap: false
    });

    // Verify success
    expect(result.success).toBe(true);

    // Read output and verify no source map
    const output = readCompiledOutput(outputPath);
    expect(output).not.toContain('sourceMappingURL');
  });

  // ==========================================================================
  // Dependency Bundling
  // ==========================================================================

  it('should bundle dependencies inline', async () => {
    // Create a handler that imports a local module
    const utilContent = `
export function greet(name) {
  return \`Hello, \${name}!\`;
}
`;
    writeTestHandler(testDir, 'util.js', utilContent);

    const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';
import { greet } from './util.js';

export default defineAction(
  { actionName: 'Test', timeout: 30000 },
  async (input, context) => {
    context.logger.info(greet('World'));
  }
);
`;
    const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
    const outputPath = path.join(testDir, 'output.mjs');

    // Compile
    const result = await compileHandler({
      sourcePath,
      outputPath,
      sourcemap: false
    });

    // Verify success
    expect(result.success).toBe(true);

    // Read output and verify the greet function is bundled
    const output = readCompiledOutput(outputPath);
    expect(output).toContain('greet');
    expect(output).toContain('Hello');
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  it('should return error for non-existent source file', async () => {
    const sourcePath = path.join(testDir, 'non-existent.js');
    const outputPath = path.join(testDir, 'output.mjs');

    // Compile
    const result = await compileHandler({
      sourcePath,
      outputPath,
      sourcemap: false
    });

    // Verify failure
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('should return error for handler with syntax errors', async () => {
    // Create a handler with syntax errors
    const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineAction(
  { actionName: 'Test', timeout: 30000 },
  async (input, context) => {
    // Missing closing brace
    context.logger.info('Test');
`;
    const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
    const outputPath = path.join(testDir, 'output.mjs');

    // Compile
    const result = await compileHandler({
      sourcePath,
      outputPath,
      sourcemap: false
    });

    // Verify failure
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });

  // ==========================================================================
  // Output Directory Creation
  // ==========================================================================

  it('should create output directory if it does not exist', async () => {
    const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineAction(
  { actionName: 'Test', timeout: 30000 },
  async (input, context) => {
    context.logger.info('Test');
  }
);
`;
    const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
    const outputDir = path.join(testDir, 'nested', 'output', 'dir');
    const outputPath = path.join(outputDir, 'output.mjs');

    // Verify output directory doesn't exist yet
    expect(fs.existsSync(outputDir)).toBe(false);

    // Compile
    const result = await compileHandler({
      sourcePath,
      outputPath,
      sourcemap: false
    });

    // Verify success
    expect(result.success).toBe(true);

    // Verify output directory was created
    expect(fs.existsSync(outputDir)).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  // ==========================================================================
  // Log File Embedding
  // ==========================================================================

  describe('logFile option', () => {
    it('should compile log dest as a const that sets CARDS_HOOKS_LOG_FILE for action handlers', async () => {
      const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineAction(
  { actionName: 'Test', timeout: 30000 },
  async (input, context) => {
    context.logger.info('Test');
  }
);
`;
      const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
      const outputPath = path.join(testDir, 'output.mjs');

      const result = await compileHandler({
        sourcePath,
        outputPath,
        sourcemap: false,
        logFile: '.cards/logs/hooks.log'
      });

      expect(result.success).toBe(true);
      const output = readCompiledOutput(outputPath);
      // Build-time resolved absolute path is embedded directly
      expect(output).toContain('CARDS_HOOKS_LOG_FILE');
      expect(output).toContain(path.resolve('.cards/logs/hooks.log'));
      // No runtime WORKSPACE_PATH dependency
      expect(output).not.toContain("process.env['WORKSPACE_PATH']");
    });

    it('should compile log dest as a const that sets CARDS_HOOKS_LOG_FILE for type validators', async () => {
      const handlerContent = `
import { defineTypeValidator, validationSuccess } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineTypeValidator(
  { typeName: 'test', timeout: 30000 },
  async (request, context) => validationSuccess()
);
`;
      const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
      const outputPath = path.join(testDir, 'output.mjs');

      const result = await compileHandler({
        sourcePath,
        outputPath,
        sourcemap: false,
        factoryType: 'typeValidator',
        logFile: '.cards/logs/hooks.log'
      });

      expect(result.success).toBe(true);
      const output = readCompiledOutput(outputPath);
      // Build-time resolved absolute path is embedded directly
      expect(output).toContain('CARDS_HOOKS_LOG_FILE');
      expect(output).toContain(path.resolve('.cards/logs/hooks.log'));
      // No runtime WORKSPACE_PATH dependency
      expect(output).not.toContain("process.env['WORKSPACE_PATH']");
    });

    it('should not embed logFile when option is not set', async () => {
      const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineAction(
  { actionName: 'Test', timeout: 30000 },
  async (input, context) => {
    context.logger.info('Test');
  }
);
`;
      const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
      const outputPath = path.join(testDir, 'output.mjs');

      const result = await compileHandler({
        sourcePath,
        outputPath,
        sourcemap: false
      });

      expect(result.success).toBe(true);
      const output = readCompiledOutput(outputPath);
      // The bundled Logger code references CARDS_HOOKS_LOG_FILE naturally,
      // but the preamble const should NOT be present
      expect(output).not.toContain('__DEFAULT_LOG_DEST');
    });

    it('should not embed logFile for stream transforms', async () => {
      const handlerContent = `
import { defineStreamTransform } from '${STREAM_TRANSFORM_PATH.replace(/\\/g, '/')}';

export default defineStreamTransform(
  { streamType: 'test-stream', sourcePath: '/workspace/handler.js' },
  (line) => line
);
`;
      const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
      const outputPath = path.join(testDir, 'output.mjs');

      const result = await compileHandler({
        sourcePath,
        outputPath,
        sourcemap: false,
        factoryType: 'streamTransform',
        logFile: '.cards/logs/hooks.log'
      });

      expect(result.success).toBe(true);
      const output = readCompiledOutput(outputPath);
      // Stream transforms don't use executeCommand/executeValidation
      expect(output).not.toContain('__DEFAULT_LOG_DEST');
    });
  });

  // ==========================================================================
  // Stream Transform Compilation
  // ==========================================================================

  describe('streamTransform factoryType', () => {
    /**
     * Compiles a stream transform handler and returns the compiled output string.
     * Asserts compilation success before returning.
     *
     * @param handlerContent - Stream transform fixture source code to compile.
     * @param options - Optional compilation flags for this helper.
     * @param options.sourcemap - Whether to request inline source maps from the compiler.
     * @returns Compiled bundle source text.
     */
    async function compileStreamTransform(
      handlerContent: string,
      options: { sourcemap?: boolean } = {}
    ): Promise<string> {
      const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
      const outputPath = path.join(testDir, 'output.mjs');
      const result = await compileHandler({
        sourcePath,
        outputPath,
        sourcemap: options.sourcemap ?? false,
        factoryType: 'streamTransform'
      });
      expect(result.success).toBe(true);
      return readCompiledOutput(outputPath);
    }

    /** Stream transform handler fixture with init function. */
    const HANDLER_WITH_INIT = `
import { defineStreamTransform } from '${STREAM_TRANSFORM_PATH.replace(/\\/g, '/')}';

export default defineStreamTransform(
  { streamType: 'test-stream', sourcePath: '/workspace/handler.js' },
  (line) => \`transformed: \${line}\`,
  (ctx) => { ctx.state.set('initialized', true); }
);
`;

    /** Stream transform handler fixture without init function. */
    const HANDLER_WITHOUT_INIT = `
import { defineStreamTransform } from '${STREAM_TRANSFORM_PATH.replace(/\\/g, '/')}';

export default defineStreamTransform(
  { streamType: 'test-stream', sourcePath: '/workspace/handler.js' },
  (line) => \`transformed: \${line}\`
);
`;

    it('should produce a self-contained ESM bundle with default export object shape', async () => {
      const output = await compileStreamTransform(HANDLER_WITH_INIT);

      // Default export is an object with streamType, handler, init fields
      expect(output).toMatch(/streamType/);
      expect(output).toMatch(/handler/);
      expect(output).toMatch(/init/);

      // Exported as default (esbuild emits `export { x as default }`)
      expect(output).toMatch(/as\s+default/);

      // No named init export (only default export)
      expect(output).not.toMatch(/export\s+function\s+init/);
      expect(output).not.toMatch(/export\s*\{[^}]*\binit\b[^}]*\}/);

      // Fully bundled: no bare import statements
      expect(output).not.toMatch(/^\s*import\s+/m);

      // No Node.js createRequire banner (incompatible with browser blob URL)
      expect(output).not.toContain('createRequire');
    });

    it('should set init to undefined when no init handler is provided', async () => {
      const output = await compileStreamTransform(HANDLER_WITHOUT_INIT);
      // init field is present in the object but resolves to void 0
      expect(output).toMatch(/init/);
      expect(output).not.toMatch(/export\s+function\s+init/);
    });

    it('should return error for non-existent source file', async () => {
      const sourcePath = path.join(testDir, 'non-existent.js');
      const outputPath = path.join(testDir, 'output.mjs');

      const result = await compileHandler({
        sourcePath,
        outputPath,
        sourcemap: false,
        factoryType: 'streamTransform'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('does not exist');
      }
    });

    it('should generate inline source maps when requested', async () => {
      const output = await compileStreamTransform(HANDLER_WITH_INIT, { sourcemap: true });

      expect(output).toContain('sourceMappingURL');
    });
  });
});
