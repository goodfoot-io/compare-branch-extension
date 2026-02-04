/**
 * Tests for the handler compiler.
 *
 * These tests verify that the compiler correctly bundles handler files into
 * standalone ESM bundles with runtime wrapper code injected.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compileHandler } from '../../src/cli/compiler.js';

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
    // Create a simple handler
    const handlerContent = `
import { actionStart } from '@cards/configuration-v2';

export default actionStart(async (input, context) => {
  context.logger.info('Action started');
});
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
    // Create a TypeScript handler
    const handlerContent = `
import { actionStart } from '@cards/configuration-v2';
import type { ActionStartInput, ActionContext } from '@cards/configuration-v2';

export default actionStart(async (input: ActionStartInput, context: ActionContext) => {
  context.logger.info('Action started');
});
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
import { actionStart } from '@cards/configuration-v2';

export default actionStart(async (input, context) => {
  context.logger.info('Test');
});
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
import { actionStart } from '@cards/configuration-v2';

export default actionStart(async (input, context) => {
  context.logger.info('Test');
});
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
import { actionStart } from '@cards/configuration-v2';

export default actionStart(async (input, context) => {
  context.logger.info('Test');
});
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
import { actionStart } from '@cards/configuration-v2';
import { greet } from './util.js';

export default actionStart(async (input, context) => {
  context.logger.info(greet('World'));
});
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
import { actionStart } from '@cards/configuration-v2';

export default actionStart(async (input, context) => {
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
import { actionStart } from '@cards/configuration-v2';

export default actionStart(async (input, context) => {
  context.logger.info('Test');
});
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
});
