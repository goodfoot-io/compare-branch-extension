/**
 * Test harness for stream transform execution.
 *
 * Wraps the StreamTransformWorkerPool to provide a simplified testing API
 * with automatic worker lifecycle management. Accepts inline transform code
 * and captures console logs for test assertions.
 *
 *
 * @summary Test harness for stream transform execution
 * @module stream/TestStreamTransformHarness
 */

import * as path from 'node:path';
import type { StreamInitContext } from '@cards/server';
import { StreamTransformWorkerPool } from '@cards/server';
import { v4 as uuid } from 'uuid';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for creating a TestStreamTransformHarness.
 */
export interface TestStreamTransformHarnessOptions {
  /**
   * Path to the worker script. Auto-resolves from @cards/server if not provided.
   */
  workerPath?: string;
}

/**
 * Options for creating a StreamInitContext with sensible defaults.
 */
export type CreateStreamInitContextOptions = Partial<Omit<StreamInitContext, 'state'>>;

/**
 * Captured log entry from transform execution.
 */
export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  args: unknown[];
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a StreamInitContext with sensible defaults.
 *
 * @param overrides - Partial overrides for context fields
 * @returns Complete context suitable for transform initialization (without state Map)
 */
export function createStreamInitContext(
  overrides: CreateStreamInitContextOptions = {}
): Omit<StreamInitContext, 'state'> {
  return {
    streamType: 'test-stream',
    filename: 'test.log',
    headers: {},
    card: {
      id: 'test-card-id',
      metadata: {}
    },
    ...overrides
  };
}

// ============================================================================
// TestStreamTransformHarness
// ============================================================================

/**
 * Test harness for stream transform execution.
 *
 * Provides a simplified API for testing stream transforms with automatic
 * worker lifecycle management and log capture.
 *
 * Usage:
 * ```typescript
 * const harness = new TestStreamTransformHarness();
 * await harness.start(`
 *   export default function transform(line) {
 *     return \`processed: \${line}\`;
 *   }
 * `);
 *
 * const { result } = await harness.transform('test line');
 * expect(result).toBe('processed: test line');
 *
 * await harness.stop();
 * ```
 */
export class TestStreamTransformHarness {
  private pool: StreamTransformWorkerPool | null = null;
  private streamId: string = '';
  private logs: LogEntry[] = [];
  private lineCounter = 0;
  private readonly workerPath: string;

  constructor(options: TestStreamTransformHarnessOptions = {}) {
    if (options.workerPath) {
      this.workerPath = options.workerPath;
    } else {
      // Resolve to the TypeScript source file within @cards/server
      // The worker is loaded with tsx, so we need the .ts file
      const serverPath = require.resolve('@cards/server');
      const serverDir = path.dirname(serverPath);
      this.workerPath = path.join(serverDir, 'runtime', 'stream-transform-worker.ts');
    }
  }

  /**
   * Starts the harness with the given transform code.
   *
   * @param transformCode - ESM source code for the transform module
   * @param initContext - Optional partial init context overrides
   */
  async start(transformCode: string, initContext: Partial<Omit<StreamInitContext, 'state'>> = {}): Promise<void> {
    if (this.pool) {
      throw new Error('Harness already started. Call stop() first.');
    }

    this.streamId = uuid();
    this.logs = [];
    this.lineCounter = 0;

    this.pool = new StreamTransformWorkerPool(this.workerPath);

    // Set up log capture by accessing the pool's internal workers map
    // The pool filters out 'log' messages, so we need to intercept them
    const poolInternal = this.pool as unknown as {
      workers: Map<
        string,
        {
          worker: {
            on: (event: string, handler: (msg: unknown) => void) => void;
          };
        }
      >;
    };

    const context = createStreamInitContext(initContext);
    await this.pool.spawnWorker(this.streamId, transformCode, context);

    // After spawning, hook into the worker's message handler for log capture
    const workerInfo = poolInternal.workers.get(this.streamId);
    if (workerInfo) {
      workerInfo.worker.on('message', (msg: unknown) => {
        const message = msg as { type: string; level?: string; args?: unknown[] };
        if (message.type === 'log' && message.level && message.args) {
          this.logs.push({
            level: message.level as 'info' | 'warn' | 'error',
            args: message.args
          });
        }
      });
    }
  }

  /**
   * Transforms a line using the loaded transform.
   *
   * @param line - Line content to transform
   * @param lineNumber - Optional line number (auto-increments if not provided)
   * @returns Object with result and optional error
   */
  async transform(line: string, lineNumber?: number): Promise<{ result: string; error?: string }> {
    if (!this.pool) {
      throw new Error('Harness not started. Call start() first.');
    }

    const actualLineNumber = lineNumber ?? ++this.lineCounter;
    return this.pool.transform(this.streamId, line, actualLineNumber, 'test-stream');
  }

  /**
   * Returns all captured console logs from transform execution.
   *
   * @returns Snapshot of captured log entries in arrival order
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clears captured logs.
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Returns whether the harness is currently started and ready for transforms.
   *
   * @returns `true` when a worker pool is active and transform calls are allowed
   */
  get isStarted(): boolean {
    return this.pool !== null;
  }

  /**
   * Stops the harness and cleans up resources.
   */
  async stop(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.closeWorker(this.streamId);
      } finally {
        this.pool = null;
        this.streamId = '';
        this.logs = [];
        this.lineCounter = 0;
      }
    }
  }
}
