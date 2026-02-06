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
 *
 * @example With init handler
 * ```typescript
 * // transforms/jsonl-with-state.ts
 * import { defineStreamTransform } from '@cards/configuration';
 *
 * export default defineStreamTransform(
 *   {
 *     streamType: 'jsonl',
 *     sourcePath: import.meta.filename
 *   },
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
export function defineStreamTransform(config, handler, init) {
    const fn = async (line, context) => {
        return await Promise.resolve(handler(line, context));
    };
    fn.factoryType = 'streamTransform';
    fn.streamType = config.streamType;
    fn.timeout = config.timeout;
    fn.maxLineLength = config.maxLineLength;
    fn.maxStreamSize = config.maxStreamSize;
    fn.sourcePath = config.sourcePath;
    // Attach init handler if provided
    if (init) {
        fn.init = init;
    }
    return fn;
}
