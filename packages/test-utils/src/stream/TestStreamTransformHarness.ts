/**
 * Test harness for stream transform execution.
 *
 * Loads compiled StreamTransformModule code via dynamic import and provides a
 * simplified testing API with automatic lifecycle management. Accepts inline
 * transform code as a string, writes it to a temp file for import, and
 * maintains per-instance transform context (state map) across calls.
 *
 *
 * @summary Test harness for stream transform execution via dynamic import
 * @module stream/TestStreamTransformHarness
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

// ============================================================================
// Types
// ============================================================================

/**
 * Shape of the compiled stream transform module default export.
 * Mirrors StreamTransformModule from @cards/web.
 */
interface StreamTransformModuleExport {
  streamType: string;
  handler: (line: string, ctx: Record<string, unknown>) => string | Promise<string>;
  init?: (ctx: Record<string, unknown>) => void | Promise<void>;
}

// ============================================================================
// TestStreamTransformHarness
// ============================================================================

/**
 * Test harness for stream transform execution.
 *
 * Writes inline ESM transform code to a temp file, imports it dynamically,
 * and calls the exported `handler` and optional `init` functions directly.
 * The state map is maintained across `transform()` calls within a single
 * `start()`/`stop()` lifecycle.
 *
 * Usage:
 * ```typescript
 * const harness = new TestStreamTransformHarness();
 * await harness.start(`
 *   export default {
 *     streamType: 'test',
 *     handler(line, ctx) { return \`processed: \${line}\`; }
 *   };
 * `);
 *
 * const { result } = await harness.transform('test line');
 * expect(result).toBe('processed: test line');
 *
 * await harness.stop();
 * ```
 */
export class TestStreamTransformHarness {
  private module: StreamTransformModuleExport | null = null;
  private ctx: Record<string, unknown> | null = null;
  private tmpPath: string | null = null;

  /**
   * Starts the harness by loading the given transform code.
   *
   * Writes `transformCode` to a unique temp `.mjs` file, imports it, calls
   * `init(ctx)` if present, then stores the module and context for subsequent
   * `transform()` calls.
   *
   * @param transformCode - ESM source code exporting a StreamTransformModule as default
   * @throws If the harness is already started
   */
  async start(transformCode: string): Promise<void> {
    if (this.module) {
      throw new Error('Harness already started. Call stop() first.');
    }
    this.tmpPath = path.join(os.tmpdir(), `${crypto.randomUUID()}.mjs`);
    await fs.writeFile(this.tmpPath, transformCode, 'utf8');
    const mod = await import(this.tmpPath);
    const defaultExport = mod.default as StreamTransformModuleExport;
    this.ctx = { state: new Map<string, unknown>() };
    if (defaultExport.init) {
      await defaultExport.init(this.ctx);
    }
    this.module = defaultExport;
  }

  /**
   * Transforms a line using the loaded transform handler.
   *
   * On handler error, returns the original line with an `error` string
   * (fail-open semantics).
   *
   * @param line - Line content to transform
   * @returns Object with `result` string and optional `error` message
   * @throws If the harness has not been started
   */
  async transform(line: string): Promise<{ result: string; error?: string }> {
    if (!this.module || !this.ctx) {
      throw new Error('Harness not started. Call start() first.');
    }
    try {
      const result = await this.module.handler(line, this.ctx);
      return { result };
    } catch (error) {
      return { result: line, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Returns whether the harness is currently started and ready for transforms.
   *
   * @returns `true` when a module is loaded and transform calls are allowed
   */
  get isStarted(): boolean {
    return this.module !== null;
  }

  /**
   * Stops the harness and cleans up resources.
   *
   * Removes the temporary file and clears the loaded module and context.
   * After calling `stop()`, `transform()` calls will throw until `start()`
   * is called again.
   */
  async stop(): Promise<void> {
    this.module = null;
    this.ctx = null;
    if (this.tmpPath) {
      await fs.unlink(this.tmpPath).catch(() => undefined);
      this.tmpPath = null;
    }
  }
}
