/**
 * Regression test: --log preamble must execute before Logger singleton.
 *
 * The `logFile` option in `compileHandler` generates a preamble that sets
 * `process.env.CARDS_HOOKS_LOG_FILE` before any Logger is constructed.
 * However, esbuild places bundled dependency code (which includes the
 * Logger module with `export const logger = new Logger()`) before the
 * entry-point preamble code. This means the Logger singleton is created
 * with `logFilePath = null` before the env var is ever set, so file
 * logging never activates.
 *
 * This test compiles a handler with `logFile` set, then inspects the
 * compiled bundle to verify that the line setting
 * `process.env['CARDS_HOOKS_LOG_FILE']` appears BEFORE any `new Logger()`
 * call. The test is expected to FAIL, demonstrating the bug.
 *
 * @summary Regression test for --log preamble ordering bug
 * @module
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { compileHandler } from '../../../src/config/cli/compiler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FACTORIES_PATH = path.resolve(__dirname, '../../../src/config/factories/index.js');

// ============================================================================
// Test Helpers
// ============================================================================

function createTestDir(): string {
  const dir = path.join(
    os.tmpdir(),
    `cards-sdk-log-preamble-order-test-${Date.now()}-${Math.random().toString(36).substring(7)}`
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeTestHandler(dir: string, filename: string, content: string): string {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function readCompiledOutput(outputPath: string): string {
  return fs.readFileSync(outputPath, 'utf-8');
}

function cleanupTestDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('compileHandler --log preamble ordering', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir();
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  it('should place CARDS_HOOKS_LOG_FILE assignment before new Logger() in the bundle', async () => {
    // Create a handler that uses the logger (which triggers the Logger
    // singleton to be bundled as a dependency).
    const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineAction(
  { actionName: 'TestLogOrder', timeout: 30000 },
  async (input, context) => {
    context.logger.info('Testing log preamble ordering');
  }
);
`;
    const sourcePath = writeTestHandler(testDir, 'handler.ts', handlerContent);
    const outputPath = path.join(testDir, 'output.mjs');

    // Compile with logFile set -- this generates the env-var preamble
    const result = await compileHandler({
      sourcePath,
      outputPath,
      sourcemap: false,
      logFile: '.cards/logs/hooks.log'
    });

    expect(result.success).toBe(true);

    const output = readCompiledOutput(outputPath);

    // Sanity: both the preamble and the Logger singleton must be present
    expect(output).toContain('CARDS_HOOKS_LOG_FILE');
    expect(output).toContain('new Logger');

    // Find the position of the preamble env-var assignment.
    // The preamble generates:
    //   process.env['CARDS_HOOKS_LOG_FILE'] = __resolve(...)
    // In the bundled output esbuild may rename the variable but the
    // string literal "CARDS_HOOKS_LOG_FILE" combined with an assignment
    // is unique to the preamble (the Logger constructor only reads it).
    const preamblePattern = /process\.env\[["']CARDS_HOOKS_LOG_FILE["']\]\s*=/;
    const preambleMatch = preamblePattern.exec(output);
    expect(preambleMatch).not.toBeNull();

    // Find the first `new Logger()` or `new Logger(` call in the bundle.
    // This is the singleton instantiation from logger.ts.
    const loggerPattern = /new Logger\s*\(/;
    const loggerMatch = loggerPattern.exec(output);
    expect(loggerMatch).not.toBeNull();

    // The preamble assignment MUST appear before the Logger constructor
    // call so the env var is set when `new Logger()` reads it.
    const preambleIndex = preambleMatch!.index;
    const loggerIndex = loggerMatch!.index;

    expect(preambleIndex).toBeLessThan(loggerIndex);
  });

  it('should embed an absolute path resolved at build time', async () => {
    // The --log path is resolved to an absolute path at build time by
    // the compiler (against process.cwd()). No runtime env var like
    // WORKSPACE_PATH or CARD_REPO_PATH is used for resolution.
    const handlerContent = `
import { defineAction } from '${FACTORIES_PATH.replace(/\\/g, '/')}';

export default defineAction(
  { actionName: 'TestLogBase', timeout: 30000 },
  async (input, context) => {
    context.logger.info('Testing log base path');
  }
);
`;
    const sourcePath = writeTestHandler(testDir, 'handler.ts', handlerContent);
    const outputPath = path.join(testDir, 'output.mjs');

    const result = await compileHandler({
      sourcePath,
      outputPath,
      sourcemap: false,
      logFile: '.cards/logs/hooks.log'
    });

    expect(result.success).toBe(true);

    const output = readCompiledOutput(outputPath);

    // The preamble embeds the build-time resolved absolute path
    expect(output).toContain(path.resolve('.cards/logs/hooks.log'));
    // No runtime env var dependency for path resolution
    expect(output).not.toContain("process.env['WORKSPACE_PATH']");
    expect(output).not.toMatch(/process\.env\[['"]CARD_REPO_PATH['"]\]/);
  });
});
