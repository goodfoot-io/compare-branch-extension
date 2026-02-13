/**
 * Stream transform factory.
 *
 * This factory creates stream transform handlers for processing line-delimited
 * streams. It follows the same pattern as other type hook factories, using
 * SameShape for compile-time typo detection and preserving the stream type
 * as a generic parameter.
 *
 *
 * @summary Stream transform factory
 * @module factories/stream-transform
 */

import type { StreamInitContext, StreamTransformCommand, TransformContext } from '../command-types.js';
import type { SameShape } from '../type-utils.js';

/**
 * Configuration for stream transform handlers.
 */
export interface StreamTransformConfig {
  /** The stream type name (e.g., 'jsonl'). */
  streamType: string;
  /** Optional timeout in milliseconds. */
  timeout?: number;
  /** Maximum line length in bytes. */
  maxLineLength?: number;
  /** Maximum stream size in bytes. */
  maxStreamSize?: number;

  /**
   * Handler source file path, injected by the `injectSourcePath` esbuild
   * plugin during config loading. Do not set manually.
   *
   * @internal
   */
  sourcePath?: string;
}

/**
 * Handler function for stream transforms.
 *
 * Receives each line of the stream and transforms it before processing.
 *
 * @param line - The line content to transform
 * @param context - Transform context with line number and stream type
 * @returns The transformed line content
 */
export type StreamTransformHandler = (line: string, context: TransformContext) => string | Promise<string>;

/**
 * Optional initialization handler for stream transforms.
 *
 * Called once when a stream begins, before any lines are processed.
 * Use this to set up session-level state based on HTTP headers, card metadata,
 * or other stream context.
 *
 * @param context - Stream initialization context with headers, card info, and state
 * @returns A promise that resolves when initialization is complete, or void
 */
export type StreamInitHandler = (context: StreamInitContext) => void | Promise<void>;

/**
 * Creates a stream transform handler.
 *
 * Transform handlers receive each line of a stream and return the transformed
 * line. This enables pre-processing of stream data before it reaches the
 * main processing logic.
 *
 * @template T - Config type (inferred)
 * @param config - Stream metadata including the stream type
 * @param handler - Function that transforms each line
 * @param init - Optional initialization handler called once at stream start
 * @returns A command wrapper suitable for default export
 *
 * @example
 * ```typescript
 * // transforms/jsonl-sanitize.ts
 * import { defineStreamTransform } from '@cards/sdk/config';
 *
 * export default defineStreamTransform(
 *   {
 *     streamType: 'jsonl',
 *     maxLineLength: 1024 * 1024 // 1MB per line
 *   },
 *   async (line, context) => {
 *     // Remove any PII before processing
 *     const sanitized = removePII(line);
 *     context.logger.debug('Sanitized line', { lineNumber: context.lineNumber });
 *     return sanitized;
 *   }
 * );
 * ```
 *
 * @example With init handler
 * ```typescript
 * // transforms/jsonl-with-state.ts
 * import { defineStreamTransform } from '@cards/sdk/config';
 *
 * export default defineStreamTransform(
 *   { streamType: 'jsonl' },
 *   async (line, context) => {
 *     // Access session state set during init
 *     const prefix = context.state?.get('prefix') as string || '';
 *     return `${prefix}${line}`;
 *   },
 *   async (context) => {
 *     // Initialize session state from headers
 *     const clientId = context.headers['x-client-id'] || 'unknown';
 *     context.state.set('prefix', `[${clientId}] `);
 *   }
 * );
 * ```
 */
export function defineStreamTransform<T extends StreamTransformConfig>(
  config: SameShape<StreamTransformConfig, T>,
  handler: StreamTransformHandler,
  init?: StreamInitHandler
): StreamTransformCommand<T['streamType']> {
  const fn = async (line: string, context: TransformContext): Promise<string> => {
    return await Promise.resolve(handler(line, context));
  };

  fn.factoryType = 'streamTransform' as const;
  fn.streamType = config.streamType;
  fn.timeout = config.timeout;
  fn.maxLineLength = config.maxLineLength;
  fn.maxStreamSize = config.maxStreamSize;
  fn.sourcePath = config.sourcePath;

  // Attach init handler if provided
  if (init) {
    fn.init = init;
  }

  return fn as unknown as StreamTransformCommand<T['streamType']>;
}
