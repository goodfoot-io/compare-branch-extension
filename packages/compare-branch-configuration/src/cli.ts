#!/usr/bin/env node

/**
 * CLI tool for compiling Compare Branch hooks using esbuild.
 *
 * Compiles TypeScript hooks to standalone ESM modules and generates hooks.json
 * with correct command paths for Compare Branch Extension execution.
 * @example
 * ```bash
 * # Compile hooks and generate hooks.json
 * compare-branch-configuration -i "hooks/**\/*.ts" -o "./dist/hooks.json"
 *
 * # With runtime logging (equivalent to COMPARE_BRANCH_HOOKS_LOG_FILE)
 * compare-branch-configuration -i "hooks/**\/*.ts" -o "./dist/hooks.json" --log /tmp/hooks.log
 * ```
 * @module
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as esbuild from 'esbuild';
import { glob } from 'glob';
import ts from 'typescript';
import { HOOK_FACTORY_TO_EVENT } from './constants.js';
import type { HookEventName } from './types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Hook context determines how paths are resolved in hooks.json.
 *
 * - `plugin`: Uses `$COMPARE_BRANCH_PLUGIN_ROOT` for plugin hooks
 * - `agent`: Uses `"$CLAUDE_PROJECT_DIR"` for agent hooks (.claude/hooks/)
 */
type HookContext = 'plugin' | 'agent';

/**
 * Command-line arguments parsed from process.argv.
 */
interface CliArgs {
  /** Glob pattern for hook source files. */
  input: string;
  /** Path for hooks.json output file. */
  output: string;
  /** Optional log file path. */
  log?: string;
  /** Show help. */
  help: boolean;
  /** Show version. */
  version: boolean;
  /** Node executable path to use in command output (default: "node"). */
  executable?: string;
}

/**
 * Metadata extracted from a hook file via TypeScript AST analysis.
 */
interface HookMetadata {
  /** The hook event type (StartIssue, EndIssue, etc.). */
  hookEventName: HookEventName;
  /** Optional timeout in milliseconds from hook config. */
  timeout?: number;
}

/**
 * A compiled hook with its metadata and output path.
 */
interface CompiledHook {
  /** Original source file path. */
  sourcePath: string;
  /** Compiled output file path. */
  outputPath: string;
  /** Output filename (e.g., "my-hook.abc123.mjs"). */
  outputFilename: string;
  /** Extracted hook metadata. */
  metadata: HookMetadata;
}

/**
 * Individual hook configuration within a matcher group.
 */
interface HookConfig {
  /** Hook type - always "command" for compiled hooks. */
  type: 'command';
  /** Absolute path to compiled hook executable. */
  command: string;
  /** Optional timeout in seconds. */
  timeout?: number;
}

/**
 * Matcher group entry within an event type.
 * Compare Branch hooks don't use matchers, so this is simplified.
 */
interface MatcherEntry {
  /** Array of hook configurations in this group. */
  hooks: HookConfig[];
}

/**
 * The complete hooks.json structure expected by Compare Branch Extension.
 *
 * Format: { hooks: { EventType: [ { hooks: [...] } ] } }
 */
interface HooksJson {
  /** Object keyed by event type (StartIssue, EndIssue, etc.). */
  hooks: Partial<Record<HookEventName, MatcherEntry[]>>;
  /** Generated file tracking metadata. */
  __generated: {
    /** Array of generated filenames. */
    files: string[];
    /** ISO timestamp of generation. */
    timestamp: string;
  };
}

// ============================================================================
// Constants
// ============================================================================

const VERSION = '1.0.0';

const HELP_TEXT = `
@goodfoot/compare-branch-configuration - Type-safe, compiled hooks for Compare Branch Extension

Description:
  This tool acts as a build system for Compare Branch hooks. It scans your TypeScript files for
  exported hook factories (e.g., startIssueHook), compiles them into standalone ESM modules,
  and generates a hooks.json manifest for the Compare Branch Extension.

Usage:
  npx -y @goodfoot/compare-branch-configuration -i <glob> -o <path> [options]

Build Mode (compile existing hooks):
  -i, --input <glob>
      Glob pattern to find your hook source files.
      Example: "hooks/**/*.ts" (Quotes are recommended to prevent shell expansion)

  -o, --output <path>
      Path where the hooks.json manifest should be generated.
      Compiled hook files (.mjs) will be placed in the same directory as this file.
      Example: "dist/hooks.json"

Optional Arguments:
  --log <path>
      Path to a log file for runtime hook logging.
      If provided, all context.logger calls within your hooks will write to this file.
      This is equivalent to setting the COMPARE_BRANCH_HOOKS_LOG_FILE environment variable.
      Example: "/tmp/compare-branch-configuration.log"

  --executable <path>
      Node executable path to use in generated commands (default: "node").
      Use this to specify a custom node path in the generated hooks.json commands.
      Example: "/usr/local/bin/node" or "node22"

  -h, --help
      Show this help message.

  -v, --version
      Show the current version of the CLI.

Examples:
  1. Basic Compilation:
     npx -y @goodfoot/compare-branch-configuration -i "hooks/**/*.ts" -o "dist/hooks.json"

  2. With Runtime Logging:
     npx -y @goodfoot/compare-branch-configuration -i "src/hooks/*.ts" -o "bin/hooks.json" --log /tmp/hooks.log

  3. With Custom Node Executable:
     npx -y @goodfoot/compare-branch-configuration -i "hooks/**/*.ts" -o "dist/hooks.json" --executable /usr/local/bin/node

Troubleshooting:
  - Ensure your hook files use 'export default'.
  - Use absolute paths in your glob patterns if relative paths aren't finding files.
  - Check the log file specified by --log if hooks don't seem to run.
`;

// ============================================================================
// Argument Parsing
// ============================================================================

/**
 * Parses command-line arguments.
 * @param argv - Process argv (usually process.argv.slice(2))
 * @returns Parsed arguments
 */
function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    input: '',
    output: '',
    help: false,
    version: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '-i':
      case '--input':
        args.input = argv[++i] ?? '';
        break;
      case '-o':
      case '--output':
        args.output = argv[++i] ?? '';
        break;
      case '--log':
        args.log = argv[++i];
        break;
      case '-h':
      case '--help':
        args.help = true;
        break;
      case '-v':
      case '--version':
        args.version = true;
        break;
      case '--executable':
        args.executable = argv[++i] ?? '';
        break;
      default:
        // Unknown argument - ignore
        break;
    }
  }

  return args;
}

/**
 * Validates CLI arguments and returns error message if invalid.
 * @param args - Parsed CLI arguments
 * @returns Error message if invalid, undefined if valid
 */
function validateArgs(args: CliArgs): string | undefined {
  if (args.help || args.version) {
    return undefined;
  }

  // Normal build mode validation
  if (args.input === '') {
    return 'Missing required argument: -i/--input <glob>';
  }

  if (args.output === '') {
    return 'Missing required argument: -o/--output <path>';
  }

  return undefined;
}

// ============================================================================
// TypeScript AST Analysis
// ============================================================================

/**
 * Extracts hook metadata from a TypeScript source file using AST analysis.
 *
 * Looks for default exports that call hook factory functions (startIssueHook, etc.)
 * and extracts the hook type and timeout from the config object.
 * @param sourcePath - Absolute path to the TypeScript source file
 * @returns Extracted hook metadata or undefined if not a valid hook file
 * @example
 * ```typescript
 * // For a file containing:
 * // export default startIssueHook({ timeout: 5000 }, handler);
 *
 * const metadata = analyzeHookFile('/path/to/hook.ts');
 * // { hookEventName: 'StartIssue', timeout: 5000 }
 * ```
 */
function analyzeHookFile(sourcePath: string): HookMetadata | undefined {
  const sourceCode = fs.readFileSync(sourcePath, 'utf-8');
  const sourceFile = ts.createSourceFile(sourcePath, sourceCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  let metadata: HookMetadata | undefined;

  /**
   * Recursively visits AST nodes to find hook factory calls.
   * @param node - The AST node to visit
   */
  function visit(node: ts.Node): void {
    // Look for export default or export = assignment
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      // export default <expression>
      const expression = node.expression;
      const result = extractHookMetadataFromExpression(expression);
      if (result !== undefined) {
        metadata = result;
      }
    }

    // Also check for: export default startIssueHook(...)
    // which might be wrapped in other expressions
    ts.forEachChild(node, visit);
  }

  /**
   * Extracts metadata from a call expression to a hook factory.
   * @param expression - The expression node to analyze
   * @returns Hook metadata if found, undefined otherwise
   */
  function extractHookMetadataFromExpression(expression: ts.Expression): HookMetadata | undefined {
    // Handle direct call: startIssueHook({ ... }, handler)
    if (ts.isCallExpression(expression)) {
      return extractFromCallExpression(expression);
    }

    // Handle await: await startIssueHook(...)
    if (ts.isAwaitExpression(expression)) {
      return extractHookMetadataFromExpression(expression.expression);
    }

    // Handle parenthesized: (startIssueHook(...))
    if (ts.isParenthesizedExpression(expression)) {
      return extractHookMetadataFromExpression(expression.expression);
    }

    return undefined;
  }

  /**
   * Extracts metadata from a CallExpression node.
   * @param callExpr - The call expression to extract metadata from
   * @returns Hook metadata if the call is to a hook factory, undefined otherwise
   */
  function extractFromCallExpression(callExpr: ts.CallExpression): HookMetadata | undefined {
    // Get the function being called
    const callee = callExpr.expression;
    let factoryName: string | undefined;

    if (ts.isIdentifier(callee)) {
      factoryName = callee.text;
    } else if (ts.isPropertyAccessExpression(callee)) {
      // Could be namespace.startIssueHook
      factoryName = callee.name.text;
    }

    if (factoryName === undefined) {
      return undefined;
    }

    // Check if it's a known hook factory
    const hookEventName = HOOK_FACTORY_TO_EVENT[factoryName];
    if (hookEventName === undefined) {
      return undefined;
    }

    // Extract config from first argument
    const configArg = callExpr.arguments[0];
    let timeout: number | undefined;

    if (configArg !== undefined && ts.isObjectLiteralExpression(configArg)) {
      for (const prop of configArg.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;

        const propName = ts.isIdentifier(prop.name) ? prop.name.text : undefined;
        if (propName === undefined) continue;

        if (propName === 'timeout') {
          // Extract number value
          if (ts.isNumericLiteral(prop.initializer)) {
            timeout = Number(prop.initializer.text);
          }
        }
      }
    }

    return { hookEventName, timeout };
  }

  visit(sourceFile);
  return metadata;
}

// ============================================================================
// Hook File Discovery
// ============================================================================

/**
 * Discovers hook files matching the glob pattern.
 * @param pattern - Glob pattern for hook files
 * @param cwd - Current working directory for relative patterns
 * @returns Array of absolute paths to hook files
 */
async function discoverHookFiles(pattern: string, cwd: string): Promise<string[]> {
  const files = await glob(pattern, {
    cwd,
    absolute: true,
    nodir: true
  });

  return files.filter((file) => file.endsWith('.ts') || file.endsWith('.mts'));
}

// ============================================================================
// esbuild Compilation
// ============================================================================

/**
 * Options for compiling a hook.
 */
interface CompileHookOptions {
  /** Absolute path to source file. */
  sourcePath: string;
  /** Directory for compiled output. */
  outputDir: string;
  /** Optional log file path to inject into compiled hook. */
  logFilePath?: string;
}

/**
 * Compiles a TypeScript hook file to a self-contained ESM executable.
 *
 * Creates a wrapper that imports the hook and calls execute(), then bundles
 * everything together including the runtime.
 * @param options - Compilation options
 * @returns Compiled output content as a string
 */
async function compileHook(options: CompileHookOptions): Promise<string> {
  const { sourcePath, logFilePath } = options;

  // Create a temporary wrapper file that imports the hook and executes it
  // Use system temp directory with deterministic name based on all inputs that affect output
  // This ensures the same inputs always produce the same temp path, making builds deterministic
  const hashInputs = [sourcePath, logFilePath ?? ''].join(':');
  const buildHash = crypto.createHash('sha256').update(hashInputs).digest('hex').substring(0, 16);
  const tempDir = path.join(os.tmpdir(), 'compare-branch-configuration-build', buildHash);
  const wrapperPath = path.join(tempDir, 'wrapper.ts');
  const tempOutput = path.join(tempDir, 'output.mjs');

  // Get the path to the runtime module (relative to this CLI)
  const runtimePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), './runtime.js');

  // Ensure temp directory exists (don't delete - concurrent builds may be using it)
  fs.mkdirSync(tempDir, { recursive: true });

  // Build log file injection code if specified
  const logFileInjection =
    logFilePath !== undefined
      ? `process.env['COMPARE_BRANCH_HOOKS_CLI_LOG_FILE'] = ${JSON.stringify(logFilePath)};\n`
      : '';

  // Create wrapper that imports the hook and calls execute
  const wrapperContent = `${logFileInjection}
import hook from '${sourcePath.replace(/\\/g, '/')}';
import { execute } from '${runtimePath.replace(/\\/g, '/')}';

execute(hook);
`;
  fs.writeFileSync(wrapperPath, wrapperContent, 'utf-8');

  await esbuild.build({
    entryPoints: [wrapperPath],
    outfile: tempOutput,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    bundle: true,
    sourcemap: 'inline',
    minify: false,
    // Keep node built-ins external
    external: [
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
    // Ensure we get clean ESM output
    mainFields: ['module', 'main'],
    conditions: ['import', 'node']
  });

  // Read and return the compiled content
  // Don't delete temp directory - allows concurrent builds of same source
  // and the OS will clean up /tmp periodically
  return fs.readFileSync(tempOutput, 'utf-8');
}

/**
 * Generates a content hash (SHA-256, 8-char prefix) for a compiled hook.
 * @param content - Compiled hook content
 * @returns 8-character hex hash
 */
function generateContentHash(content: string): string {
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return hash.substring(0, 8);
}

/**
 * Options for compiling all hooks.
 */
interface CompileAllHooksOptions {
  /** Array of source file paths. */
  hookFiles: string[];
  /** Directory for compiled output. */
  outputDir: string;
  /** Optional log file path to inject into compiled hooks. */
  logFilePath?: string;
}

/**
 * Compiles all discovered hooks and returns their metadata.
 * @param options - Compilation options
 * @returns Array of compiled hook information
 */
async function compileAllHooks(options: CompileAllHooksOptions): Promise<CompiledHook[]> {
  const { hookFiles, outputDir, logFilePath } = options;
  const compiledHooks: CompiledHook[] = [];

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const sourcePath of hookFiles) {
    // Extract metadata from source
    const metadata = analyzeHookFile(sourcePath);
    if (metadata === undefined) {
      continue;
    }

    // Compile the hook
    const compiledContent = await compileHook({ sourcePath, outputDir, logFilePath });

    // Generate content hash
    const hash = generateContentHash(compiledContent);

    // Determine output filename
    const baseName = path.basename(sourcePath, path.extname(sourcePath));
    const outputFilename = `${baseName}.${hash}.mjs`;
    const outputPath = path.join(outputDir, outputFilename);

    // Write compiled output with shebang for direct execution
    // --enable-source-maps enables stack traces with original source locations
    const shebang = '#!/usr/bin/env -S node --enable-source-maps\n';
    fs.writeFileSync(outputPath, shebang + compiledContent, { encoding: 'utf-8', mode: 0o755 });

    compiledHooks.push({
      sourcePath,
      outputPath,
      outputFilename,
      metadata
    });
  }

  return compiledHooks;
}

// ============================================================================
// hooks.json Generation
// ============================================================================

/**
 * Groups compiled hooks by event type.
 * @param compiledHooks - Array of compiled hooks
 * @returns Map of EventType -> Hooks
 */
function groupHooksByEvent(compiledHooks: CompiledHook[]): Map<HookEventName, CompiledHook[]> {
  const groups = new Map<HookEventName, CompiledHook[]>();

  for (const hook of compiledHooks) {
    const eventName = hook.metadata.hookEventName;

    const existing = groups.get(eventName);
    if (existing !== undefined) {
      existing.push(hook);
    } else {
      groups.set(eventName, [hook]);
    }
  }

  return groups;
}

/**
 * Result of detecting the hook context, including the root directory.
 */
interface HookContextInfo {
  /** Hook context type. */
  context: HookContext;
  /** Absolute path to the root directory (plugin root or project root). */
  rootDir: string;
}

/**
 * Auto-detects the hook context and root directory based on directory structure.
 *
 * Detection logic:
 * - If output path contains `.claude/` directory segment → agent context, root is parent of .claude/
 * - Default: plugin context with hooks.json parent directory as root
 * @param outputPath - Absolute path to the hooks.json output file
 * @returns Detected hook context and root directory
 */
function detectHookContext(outputPath: string): HookContextInfo {
  // Normalize path separators for cross-platform compatibility
  const normalizedPath = outputPath.replace(/\\/g, '/');

  // Check if the output path is within a .claude/ directory (agent hooks)
  // This matches paths like: /project/.claude/hooks/hooks.json
  const claudeMatch = normalizedPath.match(/^(.+)\/\.claude\//);
  if (claudeMatch !== null) {
    return {
      context: 'agent',
      rootDir: claudeMatch[1]
    };
  }

  // Default to plugin context with output directory as root
  return {
    context: 'plugin',
    rootDir: path.dirname(outputPath)
  };
}

/**
 * Generates a command path based on the hook context.
 *
 * Calculates the relative path from the root directory to the bin directory.
 * Prepends the node executable.
 *
 * - `plugin`: Uses `node $COMPARE_BRANCH_PLUGIN_ROOT/hooks/bin/filename`
 * - `agent`: Uses `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/bin/filename`
 * @param filename - The compiled hook filename
 * @param buildDir - Absolute path to the bin directory
 * @param contextInfo - Hook context info including root directory
 * @param executable - Node executable path (default: "node")
 * @returns The command path string
 */
function generateCommandPath(
  filename: string,
  buildDir: string,
  contextInfo: HookContextInfo,
  executable: string = 'node'
): string {
  // Calculate relative path from root to bin directory
  const relativeBuildPath = path.relative(contextInfo.rootDir, buildDir);
  // Normalize to forward slashes for cross-platform compatibility
  const normalizedRelativePath = relativeBuildPath.replace(/\\/g, '/');

  if (contextInfo.context === 'agent') {
    // Agent hooks use $CLAUDE_PROJECT_DIR with shell-style quoting
    return `${executable} "$CLAUDE_PROJECT_DIR"/${normalizedRelativePath}/${filename}`;
  }
  // Plugin hooks use $COMPARE_BRANCH_PLUGIN_ROOT
  return `${executable} $COMPARE_BRANCH_PLUGIN_ROOT/${normalizedRelativePath}/${filename}`;
}

/**
 * Generates the hooks.json content in Compare Branch Extension's expected format.
 *
 * Format: { hooks: { EventType: [ { hooks: [...] } ] } }
 * Note: No matcher field since Compare Branch hooks don't use matchers.
 * @param compiledHooks - Array of compiled hooks
 * @param buildDir - Absolute path to the bin directory
 * @param contextInfo - Hook context info for path resolution
 * @param executable - Node executable path (default: "node")
 * @returns The hooks.json structure
 */
function generateHooksJson(
  compiledHooks: CompiledHook[],
  buildDir: string,
  contextInfo: HookContextInfo,
  executable: string = 'node'
): HooksJson {
  const groups = groupHooksByEvent(compiledHooks);
  const hooks: Partial<Record<HookEventName, MatcherEntry[]>> = {};

  for (const [eventName, hookList] of groups) {
    // Create a single matcher entry (no matcher field)
    const entry: MatcherEntry = {
      hooks: hookList.map((hook) => ({
        type: 'command' as const,
        command: generateCommandPath(hook.outputFilename, buildDir, contextInfo, executable),
        ...(hook.metadata.timeout !== undefined ? { timeout: hook.metadata.timeout } : {})
      }))
    };

    hooks[eventName] = [entry];
  }

  return {
    hooks,
    __generated: {
      files: compiledHooks.map((h) => h.outputFilename),
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Reads an existing hooks.json file if it exists.
 * @param outputPath - Path to the hooks.json file
 * @returns Parsed HooksJson or undefined if file doesn't exist
 */
function readExistingHooksJson(outputPath: string): HooksJson | undefined {
  if (!fs.existsSync(outputPath)) {
    return undefined;
  }

  try {
    const content = fs.readFileSync(outputPath, 'utf-8');
    return JSON.parse(content) as HooksJson;
  } catch {
    return undefined;
  }
}

/**
 * Removes previously generated hook files from disk.
 * Only removes files that were tracked in __generated.files.
 * @param existingHooksJson - The existing hooks.json content
 * @param outputDir - Directory containing the generated files
 */
function removeOldGeneratedFiles(existingHooksJson: HooksJson, outputDir: string): void {
  const filesToRemove = existingHooksJson.__generated?.files ?? [];

  for (const filename of filesToRemove) {
    const filePath = path.join(outputDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // Ignore errors when removing old files
      }
    }
  }
}

/**
 * Extracts hooks from an existing hooks.json that were NOT generated by this package.
 * Identifies generated hooks by checking if their command path matches the generated file pattern.
 * @param existingHooksJson - The existing hooks.json content
 * @returns Object containing preserved hooks (keyed by event type)
 */
function extractPreservedHooks(existingHooksJson: HooksJson): Partial<Record<HookEventName, MatcherEntry[]>> {
  const generatedFiles = new Set(existingHooksJson.__generated?.files ?? []);
  const preserved: Partial<Record<HookEventName, MatcherEntry[]>> = {};

  for (const [eventType, entries] of Object.entries(existingHooksJson.hooks)) {
    const preservedEntries: MatcherEntry[] = [];

    for (const entry of entries) {
      // Filter out hooks whose command matches a generated file
      const preservedHooks = entry.hooks.filter((hook) => {
        // Extract filename from the command path
        // Command format: ${COMPARE_BRANCH_PLUGIN_ROOT}/filename.hash.mjs
        const match = hook.command.match(/\/([^/]+)$/);
        const filename = match ? match[1] : '';
        return !generatedFiles.has(filename);
      });

      if (preservedHooks.length > 0) {
        preservedEntries.push({
          ...entry,
          hooks: preservedHooks
        });
      }
    }

    if (preservedEntries.length > 0) {
      preserved[eventType as HookEventName] = preservedEntries;
    }
  }

  return preserved;
}

/**
 * Merges preserved hooks with newly generated hooks.
 * Preserved hooks are added first, then new hooks are appended.
 * @param newHooksJson - The newly generated hooks.json content
 * @param preservedHooks - Hooks to preserve from the existing hooks.json
 * @returns Merged HooksJson
 */
function mergeHooksJson(
  newHooksJson: HooksJson,
  preservedHooks: Partial<Record<HookEventName, MatcherEntry[]>>
): HooksJson {
  const mergedHooks: Partial<Record<HookEventName, MatcherEntry[]>> = {};

  // Get all event types from both sources
  const allEventTypes = new Set([
    ...Object.keys(preservedHooks),
    ...Object.keys(newHooksJson.hooks)
  ]) as Set<HookEventName>;

  for (const eventType of allEventTypes) {
    const preserved = preservedHooks[eventType] ?? [];
    const generated = newHooksJson.hooks[eventType] ?? [];

    // Combine preserved and generated entries
    mergedHooks[eventType] = [...preserved, ...generated];
  }

  return {
    hooks: mergedHooks,
    __generated: newHooksJson.__generated
  };
}

/**
 * Writes hooks.json to the specified path atomically.
 * Uses write-to-temp-then-rename pattern for atomicity.
 * @param hooksJson - The hooks.json content
 * @param outputPath - Path to write hooks.json
 */
function writeHooksJson(hooksJson: HooksJson, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write to a temporary file first, then rename for atomicity
  const tempPath = `${outputPath}.tmp.${process.pid}`;
  const content = `${JSON.stringify(hooksJson, null, 2)}\n`;

  try {
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, outputPath);
  } catch (error) {
    // Clean up temp file if rename failed
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const args = parseArgs(rawArgs);

  // Handle help or no args
  if (args.help || rawArgs.length === 0) {
    process.stdout.write(HELP_TEXT);
    process.exit(0);
  }

  // Handle version
  if (args.version) {
    process.stdout.write(`compare-branch-configuration v${VERSION}\n`);
    process.exit(0);
  }

  // Validate arguments
  const validationError = validateArgs(args);
  if (validationError !== undefined) {
    process.stderr.write(`Error: ${validationError}\n\n`);
    process.stdout.write(HELP_TEXT);
    process.exit(1);
  }

  try {
    const cwd = process.cwd();
    const outputPath = path.resolve(cwd, args.output);
    const hooksJsonDir = path.dirname(outputPath);
    // Compiled hooks go in a 'bin' subdirectory relative to hooks.json
    const buildDir = path.join(hooksJsonDir, 'bin');

    // Resolve log file path to absolute if provided
    const logFilePath = args.log !== undefined ? path.resolve(cwd, args.log) : undefined;

    // Discover hook files
    const hookFiles = await discoverHookFiles(args.input, cwd);

    if (hookFiles.length === 0) {
      process.stderr.write(`No hook files found matching pattern: ${args.input}\n`);
      process.exit(1);
    }

    // Read existing hooks.json to preserve non-generated hooks
    const existingHooksJson = readExistingHooksJson(outputPath);
    let preservedHooks: Partial<Record<HookEventName, MatcherEntry[]>> = {};

    if (existingHooksJson !== undefined) {
      // Extract hooks that were NOT generated by this package
      preservedHooks = extractPreservedHooks(existingHooksJson);

      // Remove old generated files from disk
      removeOldGeneratedFiles(existingHooksJson, buildDir);
    }

    // Compile all hooks
    const compiledHooks = await compileAllHooks({ hookFiles, outputDir: buildDir, logFilePath });

    if (compiledHooks.length === 0) {
      process.stderr.write('No valid hooks found in discovered files.\n');
      process.exit(1);
    }

    // Auto-detect hook context based on output path
    const hookContext = detectHookContext(outputPath);

    // Generate hooks.json for newly compiled hooks
    const executable = args.executable !== undefined && args.executable !== '' ? args.executable : 'node';
    const newHooksJson = generateHooksJson(compiledHooks, buildDir, hookContext, executable);

    // Preserve timestamp if generated files haven't changed
    if (existingHooksJson !== undefined) {
      const existingFiles = [...(existingHooksJson.__generated?.files ?? [])].sort();
      const newFiles = [...newHooksJson.__generated.files].sort();
      const filesUnchanged =
        existingFiles.length === newFiles.length && existingFiles.every((f, i) => f === newFiles[i]);

      if (filesUnchanged && existingHooksJson.__generated?.timestamp) {
        newHooksJson.__generated.timestamp = existingHooksJson.__generated.timestamp;
      }
    }

    // Merge with preserved hooks
    const finalHooksJson = mergeHooksJson(newHooksJson, preservedHooks);
    writeHooksJson(finalHooksJson, outputPath);

    // Output summary to stdout
    process.stdout.write(`Compiled ${compiledHooks.length} hooks to ${buildDir}\n`);
    if (Object.keys(preservedHooks).length > 0) {
      const preservedCount = Object.values(preservedHooks).reduce(
        (sum, entries) => sum + entries.reduce((s, e) => s + e.hooks.length, 0),
        0
      );
      process.stdout.write(`Preserved ${preservedCount} hooks from other sources\n`);
    }
    process.stdout.write(`Generated ${outputPath}\n`);

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  }
}

// Run main only when executed directly (not when imported for testing)
// Check if this file is the entry point by checking if import.meta.url matches process.argv[1]
// Resolves symlinks to handle npm bin symlinks correctly
const isDirectExecution = (() => {
  try {
    const scriptPath = process.argv[1];
    if (!scriptPath) return false;
    // Resolve symlinks to get the real path (npm creates symlinks in node_modules/.bin)
    const realScriptPath = fs.realpathSync(scriptPath);
    const scriptUrl = new URL(`file://${realScriptPath}`);
    return import.meta.url === scriptUrl.href;
  } catch {
    return false;
  }
})();

if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`Fatal error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}

// Export for testing
export {
  parseArgs,
  validateArgs,
  analyzeHookFile,
  discoverHookFiles,
  compileHook,
  generateContentHash,
  detectHookContext,
  generateCommandPath,
  generateHooksJson,
  groupHooksByEvent,
  readExistingHooksJson,
  removeOldGeneratedFiles,
  extractPreservedHooks,
  mergeHooksJson,
  HOOK_FACTORY_TO_EVENT
};
export type { CliArgs, HookMetadata, CompiledHook, HookConfig, MatcherEntry, HooksJson };
