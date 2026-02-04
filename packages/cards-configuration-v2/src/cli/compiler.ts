/**
 * Handler compiler for Cards Configuration v2.
 *
 * This module provides functionality to compile handler files into standalone
 * ESM bundles that can be executed by the runtime. The compiler uses Bun's
 * bundler API (via subprocess) to bundle each handler file with its dependencies
 * and injects a wrapper that calls the execute function.
 *
 * ## Compilation Process
 *
 * 1. Creates a temporary wrapper file that imports the handler and runtime
 * 2. Creates a build script that uses Bun.build() API
 * 3. Invokes the build script via `bun` subprocess
 * 4. Outputs a standalone ESM file that can be executed with Node.js or Bun
 * 5. Optionally generates source maps for debugging
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

  /**
   * Factory type of the handler.
   *
   * When 'typeValidator', the wrapper will use executeValidation() which
   * reads HTTP input from stdin and writes JSON response to stdout.
   * For other types, the wrapper uses execute() which reads from env vars.
   */
  factoryType?: string;
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

import { execSync } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Compiles a handler file into a standalone ESM bundle.
 *
 * This function bundles the handler file with all its dependencies using
 * Bun's bundler API (via subprocess), injects runtime wrapper code, and
 * outputs an executable ESM file. The resulting bundle can be executed
 * directly with Node.js or Bun.
 *
 * ## Bundling Strategy
 *
 * - **Format**: ESM (ES Modules)
 * - **Target**: Node.js compatible
 * - **External modules**: Node built-ins are externalized
 * - **Wrapper injection**: Creates a temporary wrapper file that imports the
 *   handler and calls execute()
 *
 * ## Error Handling
 *
 * Returns a CompileFailure result if:
 * - The source file doesn't exist
 * - The source file has syntax errors
 * - Bun build encounters an error during bundling
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
  const { sourcePath, outputPath, sourcemap = false, factoryType } = options;

  try {
    // Verify source file exists
    if (!fs.existsSync(sourcePath)) {
      return {
        success: false,
        error: `Source file does not exist: ${sourcePath}`
      };
    }

    // Create a unique temporary directory for build artifacts
    const buildHash = crypto.createHash('sha256').update(sourcePath).digest('hex').substring(0, 16);
    const tempDir = path.join(os.tmpdir(), 'cards-configuration-v2-build', buildHash);
    const wrapperPath = path.join(tempDir, 'wrapper.ts');
    const buildScriptPath = path.join(tempDir, 'build.ts');

    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    // Resolve runtime path (the runtime.js file in the same package)
    const runtimePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../runtime.js');

    // Resolve validation path for type validators
    const validationPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../validation.js');

    // Generate wrapper content based on handler type
    // Type validators use HTTP stdin/stdout protocol via executeValidation
    // Other handlers use environment variable extraction via execute
    let wrapperContent: string;
    if (factoryType === 'typeValidator') {
      wrapperContent = `
import handler from '${sourcePath.replace(/\\/g, '/')}';
import { executeValidation } from '${validationPath.replace(/\\/g, '/')}';

executeValidation(handler);
`;
    } else {
      wrapperContent = `
import handler from '${sourcePath.replace(/\\/g, '/')}';
import { execute } from '${runtimePath.replace(/\\/g, '/')}';

execute(handler);
`;
    }

    // Write wrapper file
    fs.writeFileSync(wrapperPath, wrapperContent, 'utf-8');

    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });

    // Banner to enable CommonJS require() in ESM bundles.
    // This is needed because some dependencies (e.g., gray-matter) use CommonJS
    // and need a working require() function for Node built-ins.
    const banner = `import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);`;

    // External modules (Node built-ins)
    const externals = [
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
    ];

    // Create a build script that uses Bun.build() API
    const buildScript = `
const result = await Bun.build({
  entrypoints: [${JSON.stringify(wrapperPath)}],
  outdir: ${JSON.stringify(outputDir)},
  format: 'esm',
  target: 'node',
  sourcemap: ${sourcemap ? '"inline"' : '"none"'},
  minify: false,
  external: ${JSON.stringify(externals)},
  naming: '[name].[ext]'
});

if (!result.success) {
  const errors = result.logs
    .filter((log) => log.level === 'error')
    .map((log) => log.message)
    .join('\\n');
  console.error(JSON.stringify({ success: false, error: errors || 'Unknown error' }));
  process.exit(1);
}

console.log(JSON.stringify({ success: true }));
`;

    // Write build script
    fs.writeFileSync(buildScriptPath, buildScript, 'utf-8');

    // Execute build script with Bun
    let buildOutput: string;
    try {
      buildOutput = execSync(`bun ${buildScriptPath}`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8'
      });
    } catch (execError) {
      const err = execError as { stderr?: string; stdout?: string; message?: string };
      // Try to parse structured error from stdout
      try {
        const result = JSON.parse(err.stdout || '{}');
        if (!result.success) {
          return {
            success: false,
            error: `Bundling failed: ${result.error}`
          };
        }
      } catch {
        // Fall back to stderr or message
        const errorOutput = err.stderr || err.message || 'Unknown error';
        return {
          success: false,
          error: `Bundling failed: ${errorOutput}`
        };
      }
      return {
        success: false,
        error: `Bundling failed: ${err.stderr || err.message || 'Unknown error'}`
      };
    }

    // Parse build result
    try {
      const result = JSON.parse(buildOutput.trim());
      if (!result.success) {
        return {
          success: false,
          error: `Bundling failed: ${result.error}`
        };
      }
    } catch {
      // If we can't parse the output but the command succeeded, continue
    }

    // Bun outputs to outdir with the entrypoint name (wrapper.js)
    const bunOutputPath = path.join(outputDir, 'wrapper.js');

    // Prepend the banner to the compiled output
    if (fs.existsSync(bunOutputPath)) {
      const compiledContent = fs.readFileSync(bunOutputPath, 'utf-8');
      const contentWithBanner = `${banner}\n${compiledContent}`;
      fs.writeFileSync(bunOutputPath, contentWithBanner, 'utf-8');
    }

    // Rename to the desired output path
    if (bunOutputPath !== outputPath && fs.existsSync(bunOutputPath)) {
      fs.renameSync(bunOutputPath, outputPath);
    }

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
