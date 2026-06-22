/**
 * Verifies that compiled bundles contain no build-time log preamble.
 *
 * The `logFile` option was removed from `compileHandler`. The Logger reads
 * `CARDS_HOOKS_LOG_FILE` from `process.env` at construction time, and the
 * env var is set at runtime by ActionDispatcher — no compile-time injection
 * is needed. This test confirms the preamble is absent.
 *
 * @summary Confirms --log preamble is no longer generated
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
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('compileHandler log preamble removal', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir();
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  it('should not contain a build-time CARDS_HOOKS_LOG_FILE assignment', async () => {
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

    const result = await compileHandler({
      sourcePath,
      outputPath,
      sourcemap: false
    });

    expect(result.success).toBe(true);

    const output = readCompiledOutput(outputPath);

    // The Logger module may reference CARDS_HOOKS_LOG_FILE as a reader,
    // but there must be no build-time preamble ASSIGNING it
    expect(output).not.toMatch(/process\.env\[["']CARDS_HOOKS_LOG_FILE["']\]\s*=/);
  });
});
