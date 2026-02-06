/**
 * Tests for the handler compiler.
 *
 * These tests verify that the compiler correctly bundles handler files into
 * standalone ESM bundles with runtime wrapper code injected.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compileHandler } from '../../src/cli/compiler.js';

// Resolve the path to the factories module for test fixtures
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FACTORIES_PATH = path.resolve(__dirname, '../../src/factories/index.js');
const STREAM_TRANSFORM_PATH = path.resolve(__dirname, '../../src/factories/stream-transform.js');

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a temporary directory for test files.
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
 */
function writeTestHandler(dir: string, filename: string, content: string): string {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Reads the compiled output file.
 */
function readCompiledOutput(outputPath: string): string {
  return fs.readFileSync(outputPath, 'utf-8');
}

/**
 * Cleans up a test directory.
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
import { defineActionStart } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineActionStart(
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
import { defineActionStart } from '${FACTORIES_PATH.replace(/\\/g, '/')}';
import type { ActionStartInput, ActionContext } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineActionStart(
  { actionName: 'Test', timeout: 30000 },
  async (input: ActionStartInput, context: ActionContext) => {
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

  it('should inject runtime wrapper code that calls execute', async () => {
    // Create a simple handler
    const handlerContent = `
import { defineActionStart } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineActionStart(
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

    // The output should import execute from the runtime
    expect(output).toContain('execute');

    // The output should call execute (either directly or through bundled code)
    // We're looking for the pattern where execute is invoked
    expect(output).toMatch(/execute\s*\(/);
  });

  // ==========================================================================
  // Source Maps
  // ==========================================================================

  it('should generate inline source maps when requested', async () => {
    const handlerContent = `
import { defineActionStart } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineActionStart(
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
import { defineActionStart } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineActionStart(
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
import { defineActionStart } from '${FACTORIES_PATH.replace(/\\/g, '/')}';
import { greet } from './util.js';

export default defineActionStart(
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
import { defineActionStart } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineActionStart(
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
import { defineActionStart } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineActionStart(
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
  // Stream Transform Compilation
  // ==========================================================================

  describe('streamTransform factoryType', () => {
    it('should compile a stream transform handler into valid ESM', async () => {
      const handlerContent = `
import { defineStreamTransform } from '${STREAM_TRANSFORM_PATH.replace(/\\/g, '/')}';

export default defineStreamTransform(
  { streamType: 'test-stream', sourcePath: '/workspace/handler.js' },
  (line) => \`transformed: \${line}\`,
  (ctx) => { ctx.state.set('initialized', true); }
);
`;
      const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
      const outputPath = path.join(testDir, 'output.mjs');

      // Compile
      const result = await compileHandler({
        sourcePath,
        outputPath,
        sourcemap: false,
        factoryType: 'streamTransform'
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

    it('should output contains export function init and export default', async () => {
      const handlerContent = `
import { defineStreamTransform } from '${STREAM_TRANSFORM_PATH.replace(/\\/g, '/')}';

export default defineStreamTransform(
  { streamType: 'test-stream', sourcePath: '/workspace/handler.js' },
  (line) => \`transformed: \${line}\`,
  (ctx) => { ctx.state.set('initialized', true); }
);
`;
      const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
      const outputPath = path.join(testDir, 'output.mjs');

      // Compile
      const result = await compileHandler({
        sourcePath,
        outputPath,
        sourcemap: false,
        factoryType: 'streamTransform'
      });

      // Verify success
      expect(result.success).toBe(true);

      // Read output and verify it contains the expected exports
      const output = readCompiledOutput(outputPath);
      // esbuild may output as separate function declarations + export statement
      expect(output).toMatch(/function init\s*\(/);
      expect(output).toMatch(/export\s*\{[\s\S]*?init/);
      expect(output).toMatch(/export\s*\{[\s\S]*?default/);
    });

    it('should output NOT contain import statements (fully bundled)', async () => {
      const handlerContent = `
import { defineStreamTransform } from '${STREAM_TRANSFORM_PATH.replace(/\\/g, '/')}';

export default defineStreamTransform(
  { streamType: 'test-stream', sourcePath: '/workspace/handler.js' },
  (line) => \`transformed: \${line}\`,
  (ctx) => { ctx.state.set('initialized', true); }
);
`;
      const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
      const outputPath = path.join(testDir, 'output.mjs');

      // Compile
      const result = await compileHandler({
        sourcePath,
        outputPath,
        sourcemap: false,
        factoryType: 'streamTransform'
      });

      // Verify success
      expect(result.success).toBe(true);

      // Read output and verify it does NOT contain import statements
      const output = readCompiledOutput(outputPath);
      expect(output).not.toMatch(/^\s*import\s+/m);
    });

    it('should output NOT contain createRequire banner', async () => {
      const handlerContent = `
import { defineStreamTransform } from '${STREAM_TRANSFORM_PATH.replace(/\\/g, '/')}';

export default defineStreamTransform(
  { streamType: 'test-stream', sourcePath: '/workspace/handler.js' },
  (line) => \`transformed: \${line}\`,
  (ctx) => { ctx.state.set('initialized', true); }
);
`;
      const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
      const outputPath = path.join(testDir, 'output.mjs');

      // Compile
      const result = await compileHandler({
        sourcePath,
        outputPath,
        sourcemap: false,
        factoryType: 'streamTransform'
      });

      // Verify success
      expect(result.success).toBe(true);

      // Read output and verify it does NOT contain createRequire banner
      const output = readCompiledOutput(outputPath);
      expect(output).not.toContain('createRequire');
      expect(output).not.toContain('__createRequire');
    });

    it('should compile stream transform without init handler and safely no-op', async () => {
      const handlerContent = `
import { defineStreamTransform } from '${STREAM_TRANSFORM_PATH.replace(/\\/g, '/')}';

export default defineStreamTransform(
  { streamType: 'test-stream', sourcePath: '/workspace/handler.js' },
  (line) => \`transformed: \${line}\`
);
`;
      const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
      const outputPath = path.join(testDir, 'output.mjs');

      // Compile
      const result = await compileHandler({
        sourcePath,
        outputPath,
        sourcemap: false,
        factoryType: 'streamTransform'
      });

      // Verify success
      expect(result.success).toBe(true);

      // Read output and verify it still has export function init that safely no-ops
      const output = readCompiledOutput(outputPath);
      expect(output).toMatch(/function init\s*\(/);
      expect(output).toMatch(/export\s*\{[\s\S]*?init/);
    });

    it('should handle non-existent source file for stream transform', async () => {
      const sourcePath = path.join(testDir, 'non-existent.js');
      const outputPath = path.join(testDir, 'output.mjs');

      // Compile
      const result = await compileHandler({
        sourcePath,
        outputPath,
        sourcemap: false,
        factoryType: 'streamTransform'
      });

      // Verify failure
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
        expect(result.error.length).toBeGreaterThan(0);
      }
    });

    it('should generate inline source maps for stream transforms when requested', async () => {
      const handlerContent = `
import { defineStreamTransform } from '${STREAM_TRANSFORM_PATH.replace(/\\/g, '/')}';

export default defineStreamTransform(
  { streamType: 'test-stream', sourcePath: '/workspace/handler.js' },
  (line) => \`transformed: \${line}\`,
  (ctx) => { ctx.state.set('initialized', true); }
);
`;
      const sourcePath = writeTestHandler(testDir, 'handler.js', handlerContent);
      const outputPath = path.join(testDir, 'output.mjs');

      // Compile with sourcemap
      const result = await compileHandler({
        sourcePath,
        outputPath,
        sourcemap: true,
        factoryType: 'streamTransform'
      });

      // Verify success
      expect(result.success).toBe(true);

      // Read output and verify source map is present
      const output = readCompiledOutput(outputPath);
      expect(output).toContain('sourceMappingURL');
    });
  });
});
