/**
 * Arguments for the build command
 */
export interface BuildArgs {
  /** Path to settings.config.ts file */
  config: string;
  /** Output directory for settings.json and compiled handlers */
  outdir: string;
  /** Optional log file for build output */
  log?: string;
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
 * - `--log <path>` - Optional log file for build output
 *
 * @param argv - Command arguments (process.argv.slice(2))
 * @returns Parse result with success/error status
 *
 * @example
 * ```typescript
 * const result = parseArgs(['build', '-c', 'settings.config.ts', '-o', 'dist/']);
 * if (result.success) {
 *   console.log(result.args.config); // 'settings.config.ts'
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
  const args: Partial<BuildArgs> = {};
  const knownFlags = new Set(['-c', '--config', '-o', '--outdir', '--log']);

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
      case '--log':
        args.log = value;
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

  // Return success with parsed args
  return {
    success: true,
    command: 'build',
    args: args as BuildArgs
  };
}
