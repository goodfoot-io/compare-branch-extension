/**
 * Stream transform factory.
 *
 * This factory creates stream transform handlers for processing line-delimited
 * streams. It follows the same pattern as other type hook factories, using
 * SameShape for compile-time typo detection and preserving the stream type
 * as a generic parameter.
 *
 * @module factories/stream-transform
 */

import type { StreamTransformCommand, TransformContext } from '../command-types.js';
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
   * Path to the handler source file for CLI compilation.
   *
   * When provided, the CLI will compile this file into a standalone bundle.
   * Use `import.meta.filename` or `import.meta.url` for the current file.
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
 * Creates a stream transform handler.
 *
 * Transform handlers receive each line of a stream and return the transformed
 * line. This enables pre-processing of stream data before it reaches the
 * main processing logic.
 *
 * @template T - Config type (inferred)
 * @param config - Stream metadata including the stream type
 * @param handler - Function that transforms each line
 * @returns A command wrapper suitable for default export
 *
 * @example
 * ```typescript
 * // transforms/jsonl-sanitize.ts
 * import { defineStreamTransform } from '@cards/configuration';
 *
 * export default defineStreamTransform(
 *   {
 *     streamType: 'jsonl',
 *     maxLineLength: 1024 * 1024, // 1MB per line
 *     sourcePath: import.meta.filename
 *   },
 *   async (line, context) => {
 *     // Remove any PII before processing
 *     const sanitized = removePII(line);
 *     context.logger.debug('Sanitized line', { lineNumber: context.lineNumber });
 *     return sanitized;
 *   }
 * );
 * ```
 */
export function defineStreamTransform<T extends StreamTransformConfig>(
  config: SameShape<StreamTransformConfig, T>,
  handler: StreamTransformHandler
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

  return fn as unknown as StreamTransformCommand<T['streamType']>;
}
