/**
 * CLI argument parsing for the cards-sdk build command.
 *
 * @summary CLI argument parsing for cards-sdk build
 * @module
 */

/**
 * Valid esbuild loader types that can be used with the `--loader` flag.
 */
const VALID_ESBUILD_LOADERS: readonly string[] = [
  'base64',
  'binary',
  'copy',
  'css',
  'dataurl',
  'empty',
  'file',
  'js',
  'json',
  'jsx',
  'local-css',
  'text',
  'ts',
  'tsx'
];

/**
 * Parses a `--loader` flag value (e.g., `.md=text`) into extension and loader type.
 *
 * @param spec - Loader specification in `.ext=type` format.
 * @returns Parsed loader, or `undefined` if the format is invalid.
 */
function parseLoaderFlag(spec: string): { extension: string; loader: string } | undefined {
  const separatorIndex = spec.indexOf('=');
  if (separatorIndex <= 0 || separatorIndex === spec.length - 1) {
    return undefined;
  }
  const extension = spec.slice(0, separatorIndex);
  const loader = spec.slice(separatorIndex + 1);
  if (!extension.startsWith('.') || extension.length < 2) {
    return undefined;
  }
  return { extension, loader };
}

/**
 * Builds a loader map from parsed `--loader` flag values.
 *
 * @param loaderFlags - Raw `--loader` flag values from the CLI.
 * @returns Map of file extensions to esbuild loader types.
 */
export function buildLoaderMap(loaderFlags: string[]): Record<string, string> {
  const loaders: Record<string, string> = {};
  for (const loaderFlag of loaderFlags) {
    const parsed = parseLoaderFlag(loaderFlag);
    if (parsed !== undefined) {
      loaders[parsed.extension] = parsed.loader;
    }
  }
  return loaders;
}

/**
 * Arguments for the build command
 *
 * @summary Arguments for the build command
 */
export interface BuildArgs {
  /** Path to settings.config.ts file */
  config: string;
  /** Output directory for settings.json and compiled handlers */
  outdir: string;
  /** Raw `--loader` flag values (e.g., `['.md=text']`) */
  loaderFlags?: string[];
}

/**
 * Successful parse result
 */
export interface SuccessResult {
  success: true;
  command: 'build';
  args: BuildArgs;
}

/**
 * Failed parse result
 */
export interface ErrorResult {
  success: false;
  error: string;
}

/**
 * Result of parsing command-line arguments
 */
export type ParseResult = SuccessResult | ErrorResult;

/**
 * Parse command-line arguments for the cards-sdk CLI.
 *
 * Supports the build command with the following arguments:
 * - `-c, --config <path>` - Path to settings.config.ts (required)
 * - `-o, --outdir <path>` - Output directory (required)
 * - `--loader <.ext=type>` - Register an esbuild loader for non-code imports (repeatable)
 *
 * @param argv - Command arguments (process.argv.slice(2))
 * @returns Parse result with success/error status
 *
 * @example
 * ```typescript
 * const result = parseArgs(['build', '-c', 'settings.config.ts', '-o', 'dist/', '--loader', '.md=text']);
 * if (result.success) {
 *   console.log(result.args.config); // 'settings.config.ts'
 *   console.log(result.args.loaderFlags); // ['.md=text']
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function parseArgs(argv: string[]): ParseResult {
  // Check for command
  if (argv.length === 0) {
    return { success: false, error: 'Missing command. Usage: cards-sdk build [options]' };
  }

  const command = argv[0];
  if (command !== 'build') {
    return { success: false, error: `Unknown command: ${command}. Only 'build' is supported.` };
  }

  // Parse flags
  const args: Partial<BuildArgs> & { loaderFlags: string[] } = { loaderFlags: [] };
  const knownFlags = new Set(['-c', '--config', '-o', '--outdir', '--loader']);

  for (let i = 1; i < argv.length; i++) {
    const flag = argv[i] as string;

    // Check if this is a known flag
    if (!knownFlags.has(flag)) {
      // Check if it looks like a flag (starts with -)
      if (flag.startsWith('-')) {
        return { success: false, error: `Unknown flag: ${flag}` };
      }
      // If it doesn't start with -, it might be a value for a previous flag
      // This shouldn't happen if parsing is correct, but we'll catch it below
      continue;
    }

    // Get the value for this flag
    const value = argv[i + 1];

    // Check if value exists and doesn't look like another flag
    if (!value || value.startsWith('-')) {
      let flagName: string;
      if (flag.startsWith('--')) {
        flagName = flag;
      } else if (flag === '-c') {
        flagName = '--config';
      } else if (flag === '-o') {
        flagName = '--outdir';
      } else {
        flagName = flag;
      }
      return { success: false, error: `Missing value for ${flagName}` };
    }

    // Assign the value based on the flag
    switch (flag) {
      case '-c':
      case '--config':
        args.config = value;
        break;
      case '-o':
      case '--outdir':
        args.outdir = value;
        break;
      case '--loader':
        args.loaderFlags.push(value);
        break;
    }

    // Skip the next item since it's the value we just processed
    i++;
  }

  // Check for required arguments
  if (!args.config) {
    return { success: false, error: 'Missing required argument: --config' };
  }

  if (!args.outdir) {
    return { success: false, error: 'Missing required argument: --outdir' };
  }

  // Validate loader flags
  for (const loaderFlag of args.loaderFlags) {
    const parsed = parseLoaderFlag(loaderFlag);
    if (parsed === undefined) {
      return { success: false, error: `Invalid --loader value: ${loaderFlag}. Expected .ext=type` };
    }
    if (!VALID_ESBUILD_LOADERS.includes(parsed.loader)) {
      return {
        success: false,
        error: `Invalid esbuild loader type for ${parsed.extension}: ${parsed.loader}`
      };
    }
  }

  // Return success with parsed args
  return {
    success: true,
    command: 'build',
    args: args as BuildArgs
  };
}
