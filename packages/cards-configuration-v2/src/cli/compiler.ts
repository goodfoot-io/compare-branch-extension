/**
 * Handler compiler for Cards Configuration v2.
 *
 * This module provides functionality to compile handler files into standalone
 * ESM bundles that can be executed by the runtime. The compiler uses esbuild
 * to bundle each handler file with its dependencies and injects a wrapper that
 * calls the execute function.
 *
 * ## Compilation Process
 *
 * 1. Creates a temporary wrapper file that imports the handler and runtime
 * 2. Uses esbuild to bundle the wrapper with all dependencies
 * 3. Outputs a standalone ESM file that can be executed with Node.js
 * 4. Optionally generates source maps for debugging
 *
 * ## Wrapper Code
 *
 * The compiler injects a wrapper that:
 * - Imports the execute function from the runtime
 * - Imports the user's handler default export
 * - Calls execute(handler) to start the runtime orchestration
 *
 * @module
 * @see {@link compileHandler} for the main compilation function
 *
 * @example
 * ```typescript
 * import { compileHandler } from '@cards/configuration-v2/cli/compiler';
 *
 * const result = await compileHandler({
 *   sourcePath: '/path/to/handler.ts',
 *   outputPath: '/path/to/output.mjs',
 *   sourcemap: true
 * });
 *
 * if (result.success) {
 *   console.log(`Compiled to: ${result.outputPath}`);
 * } else {
 *   console.error(`Compilation failed: ${result.error}`);
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Options for compiling a handler file.
 */
export interface CompileOptions {
  /**
   * Source file path (handler file).
   *
   * This should be an absolute path to a TypeScript or JavaScript file that
   * exports a command handler as its default export.
   */
  sourcePath: string;

  /**
   * Output file path for compiled bundle.
   *
   * The compiled bundle will be written to this path. Parent directories will
   * be created if they don't exist.
   */
  outputPath: string;

  /**
   * Whether to generate source maps.
   *
   * When true, generates inline source maps for debugging. When false, no
   * source maps are generated. Defaults to false.
   */
  sourcemap?: boolean;
}

/**
 * Result of a successful compilation.
 */
export interface CompileSuccess {
  /** Indicates the compilation succeeded */
  success: true;

  /** The path where the compiled bundle was written */
  outputPath: string;
}

/**
 * Result of a failed compilation.
 */
export interface CompileFailure {
  /** Indicates the compilation failed */
  success: false;

  /** Human-readable error message describing the failure */
  error: string;
}

/**
 * Result of a handler compilation.
 *
 * This is a discriminated union that either represents success or failure.
 * Check the `success` field to determine which variant you have.
 */
export type CompileResult = CompileSuccess | CompileFailure;

// ============================================================================
// Implementation
// ============================================================================

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as esbuild from 'esbuild';

/**
 * Compiles a handler file into a standalone ESM bundle.
 *
 * This function bundles the handler file with all its dependencies using
 * esbuild, injects runtime wrapper code, and outputs an executable ESM file.
 * The resulting bundle can be executed directly with Node.js.
 *
 * ## Bundling Strategy
 *
 * - **Format**: ESM (ES Modules)
 * - **Platform**: Node.js
 * - **Target**: Node 20
 * - **External modules**: Node built-ins are externalized
 * - **Wrapper injection**: Creates a temporary wrapper file that imports the
 *   handler and calls execute()
 *
 * ## Error Handling
 *
 * Returns a CompileFailure result if:
 * - The source file doesn't exist
 * - The source file has syntax errors
 * - esbuild encounters an error during bundling
 * - The output directory cannot be created
 * - File system operations fail
 *
 * @param options - Compilation options including source path, output path, and sourcemap flag
 * @returns A promise that resolves to a CompileResult indicating success or failure
 *
 * @example
 * ```typescript
 * // Compile a TypeScript handler
 * const result = await compileHandler({
 *   sourcePath: '/workspace/handlers/my-action.ts',
 *   outputPath: '/workspace/.compiled/my-action.mjs',
 *   sourcemap: true
 * });
 *
 * if (!result.success) {
 *   console.error(result.error);
 *   process.exit(1);
 * }
 * ```
 */
export async function compileHandler(options: CompileOptions): Promise<CompileResult> {
  const { sourcePath, outputPath, sourcemap = false } = options;

  try {
    // Verify source file exists
    if (!fs.existsSync(sourcePath)) {
      return {
        success: false,
        error: `Source file does not exist: ${sourcePath}`
      };
    }

    // Create a unique temporary directory for the wrapper
    const buildHash = crypto.createHash('sha256').update(sourcePath).digest('hex').substring(0, 16);
    const tempDir = path.join(os.tmpdir(), 'cards-configuration-v2-build', buildHash);
    const wrapperPath = path.join(tempDir, 'wrapper.ts');

    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    // Resolve runtime path (the runtime.js file in the same package)
    const runtimePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../runtime.js');

    // Generate wrapper content that imports the handler and calls execute
    const wrapperContent = `
import handler from '${sourcePath.replace(/\\/g, '/')}';
import { execute } from '${runtimePath.replace(/\\/g, '/')}';

execute(handler);
`;

    // Write wrapper file
    fs.writeFileSync(wrapperPath, wrapperContent, 'utf-8');

    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });

    // Bundle with esbuild
    await esbuild.build({
      entryPoints: [wrapperPath],
      outfile: outputPath,
      format: 'esm',
      platform: 'node',
      target: 'node20',
      bundle: true,
      sourcemap: sourcemap ? 'inline' : false,
      minify: false,
      external: [
        '@cards/configuration-v2',
        'node:*',
        'http',
        'https',
        'url',
        'stream',
        'zlib',
        'events',
        'buffer',
        'util',
        'path',
        'fs',
        'os',
        'crypto',
        'child_process',
        'perf_hooks',
        'async_hooks',
        'diagnostics_channel'
      ],
      mainFields: ['module', 'main'],
      conditions: ['import', 'node']
    });

    return {
      success: true,
      outputPath
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Compilation failed: ${errorMessage}`
    };
  }
}
