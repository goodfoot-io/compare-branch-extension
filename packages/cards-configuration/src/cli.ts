#!/usr/bin/env node

/**
 * CLI tool for compiling Cards actions using esbuild.
 *
 * Discovers action files by scanning TypeScript for default exports that call a
 * known factory function (actionStart, actionEnd, typeValidator, etc.), compiles
 * them into standalone ESM modules, and generates settings.json with the correct
 * command paths for Cards Extension execution.
 *
 * Also supports legacy hook factories for backward compatibility.
 *
 * @example
 * ```bash
 * # Compile actions and generate settings.json
 * cards-configuration -i "actions/**\/*.ts" -o "./dist/settings.json" --environment default
 *
 * # Multi-environment build using config file
 * cards-configuration -c cards.config.json
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
import type { FactoryType } from './constants.js';
import { ALL_FACTORY_NAMES, HOOK_FACTORY_TO_EVENT } from './constants.js';
import type { HookEventName } from './types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Context determines how paths are resolved in settings.json.
 *
 * - `plugin`: Uses `$CARDS_PLUGIN_ROOT` for plugin settings
 * - `agent`: Uses `"$CLAUDE_PROJECT_DIR"` for agent settings (.claude/)
 */
type PathContext = 'plugin' | 'agent';

/**
 * Command-line arguments parsed from process.argv.
 */
interface CliArgs {
  /** Glob pattern for source files. */
  input: string;
  /** Path for settings.json output file. */
  output: string;
  /** Optional log file path injected into compiled commands. */
  log?: string;
  /** Show help. */
  help: boolean;
  /** Show version. */
  version: boolean;
  /** Node executable path to use in command output (default: "node"). */
  executable?: string;
  /** Environment name for single-environment builds. */
  environment?: string;
  /** Environment description for single-environment builds. */
  description?: string;
  /** Config file path for multi-environment builds. */
  configFile?: string;
}

/**
 * Metadata extracted from a source file via TypeScript AST analysis.
 */
interface CommandMetadata {
  /** The factory type used. */
  factoryType: FactoryType | 'legacyHook';
  /** Action name (for actionStart/actionEnd). */
  actionName?: string;
  /** Type name (for type factories). */
  typeName?: string;
  /** Description (for actionStart). */
  description?: string;
  /** Icon path (for actionStart). */
  icon?: string;
  /** Supports background mode (for actionStart). */
  supportsBackgroundMode?: boolean;
  /** Allow concurrent executions (for actionStart). */
  allowConcurrent?: boolean;
  /** Optional timeout in milliseconds. */
  timeout?: number;
  /** Legacy hook event name (for backward compatibility). */
  hookEventName?: HookEventName;
}

/**
 * A compiled command with its metadata and output path.
 */
interface CompiledCommand {
  /** Original source file path. */
  sourcePath: string;
  /** Compiled output file path. */
  outputPath: string;
  /** Output filename (e.g., "my-action.abc123.mjs"). */
  outputFilename: string;
  /** Extracted metadata. */
  metadata: CommandMetadata;
}

/**
 * Command configuration in settings.json.
 */
interface CommandConfig {
  /** Shell command to execute. */
  command: string;
  /** Optional timeout in milliseconds. */
  timeout?: number;
}

/**
 * Action configuration in settings.json.
 */
interface ActionConfig {
  /** Optional stable identifier. */
  id?: string;
  /** Display name. */
  name: string;
  /** Optional description. */
  description?: string;
  /** Optional icon path. */
  icon?: string;
  /** Start command configuration. */
  start: CommandConfig;
  /** Optional end command configuration. */
  end?: CommandConfig;
  /** Whether execution mode toggle is shown. */
  supportsBackgroundMode?: boolean;
  /** Whether multiple instances can run on same card. */
  allowConcurrent?: boolean;
}

/**
 * Type configuration in settings.json.
 */
interface TypeCommandConfig {
  /** Type version. */
  version: string;
  /** Optional validator command. */
  validator?: CommandConfig;
  /** Optional create hook command. */
  create?: CommandConfig;
  /** Optional update hook command. */
  update?: CommandConfig;
  /** Optional delete hook command. */
  delete?: CommandConfig;
}

/**
 * Environment configuration in settings.json.
 */
interface EnvironmentConfig {
  /** Schema version. */
  version: number;
  /** Optional description. */
  description?: string;
  /** Array of action configurations. */
  actions: ActionConfig[];
  /** Optional type configurations. */
  types?: Record<string, TypeCommandConfig>;
}

/**
 * The complete settings.json structure.
 */
interface SettingsJson {
  /** Environments keyed by name. */
  environments: Record<string, EnvironmentConfig>;
  /** Generated file tracking metadata. */
  __generated: {
    /** Array of generated filenames. */
    files: string[];
    /** ISO timestamp of generation. */
    timestamp: string;
  };
}

/**
 * Legacy hooks.json structure for backward compatibility.
 */
interface HooksJson {
  hooks: Partial<
    Record<HookEventName, Array<{ hooks: Array<{ type: 'command'; command: string; timeout?: number }> }>>
  >;
  __generated: {
    files: string[];
    timestamp: string;
  };
}

/**
 * Multi-environment configuration file structure.
 */
interface ConfigFile {
  /** Environments with their glob patterns. */
  environments: Record<
    string,
    {
      /** Optional description. */
      description?: string;
      /** Glob patterns for action source files. */
      actions?: string[];
      /** Glob patterns for type source files. */
      types?: string[];
    }
  >;
  /** Output path for settings.json. */
  output: string;
}

// ============================================================================
// Constants
// ============================================================================

const VERSION = '2.0.0';

const HELP_TEXT = `
@cards/configuration - Type-safe, compiled actions for Cards Extension

Description:
  This tool acts as a build system for Cards actions. It scans your TypeScript files for
  exported factory functions (actionStart, actionEnd, typeValidator, etc.), compiles them
  into standalone ESM modules, and generates a settings.json manifest.

Usage:
  npx -y @cards/configuration -i <glob> -o <path> --environment <name> [options]
  npx -y @cards/configuration -c <config-file>

Single Environment Build:
  -i, --input <glob>
      Glob pattern to find your action source files.
      Example: "actions/**/*.ts" (Quotes are recommended to prevent shell expansion)

  -o, --output <path>
      Path where the settings.json manifest should be generated.
      Compiled files (.mjs) will be placed in a 'bin' subdirectory.
      Example: "dist/settings.json"

  --environment <name>
      Environment name for the build.
      Example: "default"

  --description <text>
      Optional description for the environment.
      Example: "Standard Claude Code workflows"

Multi-Environment Build:
  -c, --config <path>
      Path to a JSON configuration file for multi-environment builds.
      Example: "cards.config.json"

      Config file format:
      {
        "environments": {
          "default": {
            "description": "Standard workflows",
            "actions": ["src/actions/*.ts"],
            "types": ["src/types/*.ts"]
          }
        },
        "output": "dist/settings.json"
      }

Optional Arguments:
  --log <path>
      Path to a log file for runtime logging.
      If provided, all context.logger calls will write to this file.
      Example: "/tmp/cards.log"

  --executable <path>
      Node executable path to use in generated commands (default: "node").
      Example: "/usr/local/bin/node" or "node22"

  -h, --help
      Show this help message.

  -v, --version
      Show the current version of the CLI.

Examples:
  1. Single Environment:
     npx -y @cards/configuration -i "actions/**/*.ts" -o "dist/settings.json" --environment default

  2. With Description:
     npx -y @cards/configuration -i "src/*.ts" -o "dist/settings.json" \\
       --environment default --description "Standard Claude Code workflows"

  3. Multi-Environment (config file):
     npx -y @cards/configuration -c cards.config.json

Factory Functions:
  - actionStart(config, handler)  - Creates an action start command
  - actionEnd(config, handler)    - Creates an action end command
  - typeValidator(config, handler) - Creates a type validator
  - typeCreate(config, handler)    - Creates a type create hook
  - typeUpdate(config, handler)    - Creates a type update hook
  - typeDelete(config, handler)    - Creates a type delete hook
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
      case '--environment':
        args.environment = argv[++i] ?? '';
        break;
      case '--description':
        args.description = argv[++i] ?? '';
        break;
      case '-c':
      case '--config':
        args.configFile = argv[++i] ?? '';
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

  // Config file mode
  if (args.configFile !== undefined && args.configFile !== '') {
    return undefined;
  }

  // Single environment mode validation
  if (args.input === '') {
    return 'Missing required argument: -i/--input <glob>';
  }

  if (args.output === '') {
    return 'Missing required argument: -o/--output <path>';
  }

  if (args.environment === undefined || args.environment === '') {
    return 'Missing required argument: --environment <name>';
  }

  return undefined;
}

// ============================================================================
// TypeScript AST Analysis
// ============================================================================

/**
 * Extracts command metadata from a TypeScript source file using AST analysis.
 *
 * Looks for default exports that call factory functions and extracts metadata
 * from the config object.
 * @param sourcePath - Absolute path to the TypeScript source file
 * @returns Extracted metadata or undefined if not a valid command file
 */
function analyzeSourceFile(sourcePath: string): CommandMetadata | undefined {
  const sourceCode = fs.readFileSync(sourcePath, 'utf-8');
  const sourceFile = ts.createSourceFile(sourcePath, sourceCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  let metadata: CommandMetadata | undefined;

  function visit(node: ts.Node): void {
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      const result = extractMetadataFromExpression(node.expression);
      if (result !== undefined) {
        metadata = result;
      }
    }
    ts.forEachChild(node, visit);
  }

  function extractMetadataFromExpression(expression: ts.Expression): CommandMetadata | undefined {
    if (ts.isCallExpression(expression)) {
      return extractFromCallExpression(expression);
    }
    if (ts.isAwaitExpression(expression)) {
      return extractMetadataFromExpression(expression.expression);
    }
    if (ts.isParenthesizedExpression(expression)) {
      return extractMetadataFromExpression(expression.expression);
    }
    return undefined;
  }

  function extractFromCallExpression(callExpr: ts.CallExpression): CommandMetadata | undefined {
    const callee = callExpr.expression;
    let factoryName: string | undefined;

    if (ts.isIdentifier(callee)) {
      factoryName = callee.text;
    } else if (ts.isPropertyAccessExpression(callee)) {
      factoryName = callee.name.text;
    }

    if (factoryName === undefined) {
      return undefined;
    }

    // Check for new factory functions
    if (ALL_FACTORY_NAMES.includes(factoryName as FactoryType)) {
      return extractNewFactoryMetadata(factoryName as FactoryType, callExpr);
    }

    // Check for legacy hook factories
    const hookEventName = HOOK_FACTORY_TO_EVENT[factoryName];
    if (hookEventName !== undefined) {
      return extractLegacyHookMetadata(hookEventName, callExpr);
    }

    return undefined;
  }

  function extractNewFactoryMetadata(factoryType: FactoryType, callExpr: ts.CallExpression): CommandMetadata {
    const configArg = callExpr.arguments[0];
    const result: CommandMetadata = { factoryType };

    if (configArg !== undefined && ts.isObjectLiteralExpression(configArg)) {
      for (const prop of configArg.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;

        const propName = ts.isIdentifier(prop.name) ? prop.name.text : undefined;
        if (propName === undefined) continue;

        switch (propName) {
          case 'actionName':
            if (ts.isStringLiteral(prop.initializer)) {
              result.actionName = prop.initializer.text;
            }
            break;
          case 'typeName':
            if (ts.isStringLiteral(prop.initializer)) {
              result.typeName = prop.initializer.text;
            }
            break;
          case 'description':
            if (ts.isStringLiteral(prop.initializer)) {
              result.description = prop.initializer.text;
            }
            break;
          case 'icon':
            if (ts.isStringLiteral(prop.initializer)) {
              result.icon = prop.initializer.text;
            }
            break;
          case 'supportsBackgroundMode':
            if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword) {
              result.supportsBackgroundMode = true;
            } else if (prop.initializer.kind === ts.SyntaxKind.FalseKeyword) {
              result.supportsBackgroundMode = false;
            }
            break;
          case 'allowConcurrent':
            if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword) {
              result.allowConcurrent = true;
            } else if (prop.initializer.kind === ts.SyntaxKind.FalseKeyword) {
              result.allowConcurrent = false;
            }
            break;
          case 'timeout':
            if (ts.isNumericLiteral(prop.initializer)) {
              result.timeout = Number(prop.initializer.text);
            }
            break;
        }
      }
    }

    return result;
  }

  function extractLegacyHookMetadata(hookEventName: HookEventName, callExpr: ts.CallExpression): CommandMetadata {
    const configArg = callExpr.arguments[0];
    const result: CommandMetadata = {
      factoryType: 'legacyHook',
      hookEventName
    };

    if (configArg !== undefined && ts.isObjectLiteralExpression(configArg)) {
      for (const prop of configArg.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;

        const propName = ts.isIdentifier(prop.name) ? prop.name.text : undefined;
        if (propName === 'timeout' && ts.isNumericLiteral(prop.initializer)) {
          result.timeout = Number(prop.initializer.text);
        }
      }
    }

    return result;
  }

  visit(sourceFile);
  return metadata;
}

// Legacy compatibility
function analyzeHookFile(sourcePath: string): { hookEventName: HookEventName; timeout?: number } | undefined {
  const metadata = analyzeSourceFile(sourcePath);
  if (metadata?.factoryType === 'legacyHook' && metadata.hookEventName) {
    return { hookEventName: metadata.hookEventName, timeout: metadata.timeout };
  }
  return undefined;
}

// ============================================================================
// File Discovery
// ============================================================================

/**
 * Discovers source files matching the glob pattern.
 * @param pattern - Glob pattern for source files
 * @param cwd - Current working directory for relative patterns
 * @returns Array of absolute paths to source files
 */
async function discoverSourceFiles(pattern: string, cwd: string): Promise<string[]> {
  const files = await glob(pattern, {
    cwd,
    absolute: true,
    nodir: true
  });

  return files.filter((file) => file.endsWith('.ts') || file.endsWith('.mts'));
}

// Legacy compatibility
async function discoverHookFiles(pattern: string, cwd: string): Promise<string[]> {
  return discoverSourceFiles(pattern, cwd);
}

// ============================================================================
// esbuild Compilation
// ============================================================================

interface CompileOptions {
  sourcePath: string;
  outputDir: string;
  logFilePath?: string;
}

/**
 * Compiles a TypeScript source file to a self-contained ESM executable.
 * @param options - Compilation options
 * @returns Compiled output content as a string
 */
async function compileSource(options: CompileOptions): Promise<string> {
  const { sourcePath, logFilePath } = options;

  const hashInputs = [sourcePath, logFilePath ?? ''].join(':');
  const buildHash = crypto.createHash('sha256').update(hashInputs).digest('hex').substring(0, 16);
  const tempDir = path.join(os.tmpdir(), 'cards-configuration-build', buildHash);
  const wrapperPath = path.join(tempDir, 'wrapper.ts');
  const tempOutput = path.join(tempDir, 'output.mjs');

  const runtimePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), './runtime.js');

  fs.mkdirSync(tempDir, { recursive: true });

  const logFileInjection =
    logFilePath !== undefined ? `process.env['CARDS_HOOKS_CLI_LOG_FILE'] = ${JSON.stringify(logFilePath)};\n` : '';

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
    mainFields: ['module', 'main'],
    conditions: ['import', 'node']
  });

  return fs.readFileSync(tempOutput, 'utf-8');
}

// Legacy compatibility
async function compileHook(options: CompileOptions): Promise<string> {
  return compileSource(options);
}

/**
 * Generates a content hash (SHA-256, 8-char prefix).
 * @param content - Content to hash
 * @returns 8-character hex hash
 */
function generateContentHash(content: string): string {
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return hash.substring(0, 8);
}

interface CompileAllOptions {
  sourceFiles: string[];
  outputDir: string;
  logFilePath?: string;
}

/**
 * Compiles all discovered source files and returns their metadata.
 * @param options - Compilation options
 * @returns Array of compiled command information
 */
async function compileAllSources(options: CompileAllOptions): Promise<CompiledCommand[]> {
  const { sourceFiles, outputDir, logFilePath } = options;
  const compiledCommands: CompiledCommand[] = [];

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const sourcePath of sourceFiles) {
    const metadata = analyzeSourceFile(sourcePath);
    if (metadata === undefined) {
      continue;
    }

    const compiledContent = await compileSource({ sourcePath, outputDir, logFilePath });
    const hash = generateContentHash(compiledContent);

    const baseName = path.basename(sourcePath, path.extname(sourcePath));
    const outputFilename = `${baseName}.${hash}.mjs`;
    const outputPath = path.join(outputDir, outputFilename);

    const shebang = '#!/usr/bin/env -S node --enable-source-maps\n';
    fs.writeFileSync(outputPath, shebang + compiledContent, { encoding: 'utf-8', mode: 0o755 });

    compiledCommands.push({
      sourcePath,
      outputPath,
      outputFilename,
      metadata
    });
  }

  return compiledCommands;
}

// ============================================================================
// Path Resolution
// ============================================================================

interface PathContextInfo {
  context: PathContext;
  rootDir: string;
}

/**
 * Auto-detects the path context based on output path.
 * @param outputPath - Absolute path to the settings.json output file
 * @returns Detected context and root directory
 */
function detectPathContext(outputPath: string): PathContextInfo {
  const normalizedPath = outputPath.replace(/\\/g, '/');

  const claudeMatch = normalizedPath.match(/^(.+)\/\.claude\//);
  if (claudeMatch !== null) {
    return {
      context: 'agent',
      rootDir: claudeMatch[1]
    };
  }

  return {
    context: 'plugin',
    rootDir: path.dirname(outputPath)
  };
}

// Legacy compatibility
function detectHookContext(outputPath: string): PathContextInfo {
  return detectPathContext(outputPath);
}

/**
 * Generates a command path based on the context.
 * @param filename - The compiled command filename
 * @param buildDir - Absolute path to the bin directory
 * @param contextInfo - Path context info
 * @param executable - Node executable path (default: "node")
 * @returns The command path string
 */
function generateCommandPath(
  filename: string,
  buildDir: string,
  contextInfo: PathContextInfo,
  executable: string = 'node'
): string {
  const relativeBuildPath = path.relative(contextInfo.rootDir, buildDir);
  const normalizedRelativePath = relativeBuildPath.replace(/\\/g, '/');

  if (contextInfo.context === 'agent') {
    return `${executable} "$CLAUDE_PROJECT_DIR"/${normalizedRelativePath}/${filename}`;
  }
  return `${executable} $CARDS_PLUGIN_ROOT/${normalizedRelativePath}/${filename}`;
}

// ============================================================================
// settings.json Generation
// ============================================================================

/**
 * Groups compiled commands by action name.
 * @param commands - Array of compiled commands
 * @returns Map of actionName -> commands
 */
function groupByActionName(commands: CompiledCommand[]): Map<string, CompiledCommand[]> {
  const groups = new Map<string, CompiledCommand[]>();

  for (const cmd of commands) {
    const actionName = cmd.metadata.actionName;
    if (!actionName) continue;

    const existing = groups.get(actionName);
    if (existing) {
      existing.push(cmd);
    } else {
      groups.set(actionName, [cmd]);
    }
  }

  return groups;
}

/**
 * Groups compiled commands by type name.
 * @param commands - Array of compiled commands
 * @returns Map of typeName -> commands
 */
function groupByTypeName(commands: CompiledCommand[]): Map<string, CompiledCommand[]> {
  const groups = new Map<string, CompiledCommand[]>();

  for (const cmd of commands) {
    const typeName = cmd.metadata.typeName;
    if (!typeName) continue;

    const existing = groups.get(typeName);
    if (existing) {
      existing.push(cmd);
    } else {
      groups.set(typeName, [cmd]);
    }
  }

  return groups;
}

/**
 * Converts an action name to a URL-friendly slug for use as ID.
 * @param name - Action name
 * @returns Slugified ID
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generates settings.json from compiled commands.
 * @param compiledCommands - Array of compiled commands
 * @param environmentName - Environment name
 * @param environmentDescription - Optional environment description
 * @param buildDir - Build directory path
 * @param contextInfo - Path context info
 * @param executable - Node executable path
 * @returns Settings JSON structure
 */
function generateSettingsJson(
  compiledCommands: CompiledCommand[],
  environmentName: string,
  environmentDescription: string | undefined,
  buildDir: string,
  contextInfo: PathContextInfo,
  executable: string = 'node'
): SettingsJson {
  const actionCommands = compiledCommands.filter(
    (cmd) => cmd.metadata.factoryType === 'actionStart' || cmd.metadata.factoryType === 'actionEnd'
  );

  const typeCommands = compiledCommands.filter((cmd) =>
    ['typeValidator', 'typeCreate', 'typeUpdate', 'typeDelete'].includes(cmd.metadata.factoryType)
  );

  const actionGroups = groupByActionName(actionCommands);
  const typeGroups = groupByTypeName(typeCommands);

  const actions: ActionConfig[] = [];

  for (const [actionName, cmds] of actionGroups) {
    const startCmd = cmds.find((c) => c.metadata.factoryType === 'actionStart');
    const endCmd = cmds.find((c) => c.metadata.factoryType === 'actionEnd');

    if (!startCmd) continue; // Every action needs a start command

    const action: ActionConfig = {
      id: slugify(actionName),
      name: actionName,
      start: {
        command: generateCommandPath(startCmd.outputFilename, buildDir, contextInfo, executable),
        ...(startCmd.metadata.timeout !== undefined ? { timeout: startCmd.metadata.timeout } : {})
      }
    };

    if (startCmd.metadata.description) {
      action.description = startCmd.metadata.description;
    }
    if (startCmd.metadata.icon) {
      action.icon = startCmd.metadata.icon;
    }
    if (startCmd.metadata.supportsBackgroundMode !== undefined) {
      action.supportsBackgroundMode = startCmd.metadata.supportsBackgroundMode;
    }
    if (startCmd.metadata.allowConcurrent !== undefined) {
      action.allowConcurrent = startCmd.metadata.allowConcurrent;
    }

    if (endCmd) {
      action.end = {
        command: generateCommandPath(endCmd.outputFilename, buildDir, contextInfo, executable),
        ...(endCmd.metadata.timeout !== undefined ? { timeout: endCmd.metadata.timeout } : {})
      };
    }

    actions.push(action);
  }

  const types: Record<string, TypeCommandConfig> = {};

  for (const [typeName, cmds] of typeGroups) {
    const validatorCmd = cmds.find((c) => c.metadata.factoryType === 'typeValidator');
    const createCmd = cmds.find((c) => c.metadata.factoryType === 'typeCreate');
    const updateCmd = cmds.find((c) => c.metadata.factoryType === 'typeUpdate');
    const deleteCmd = cmds.find((c) => c.metadata.factoryType === 'typeDelete');

    const typeConfig: TypeCommandConfig = {
      version: '1.0.0' // Default version - could be extracted from config in future
    };

    if (validatorCmd) {
      typeConfig.validator = {
        command: generateCommandPath(validatorCmd.outputFilename, buildDir, contextInfo, executable),
        ...(validatorCmd.metadata.timeout !== undefined ? { timeout: validatorCmd.metadata.timeout } : {})
      };
    }
    if (createCmd) {
      typeConfig.create = {
        command: generateCommandPath(createCmd.outputFilename, buildDir, contextInfo, executable),
        ...(createCmd.metadata.timeout !== undefined ? { timeout: createCmd.metadata.timeout } : {})
      };
    }
    if (updateCmd) {
      typeConfig.update = {
        command: generateCommandPath(updateCmd.outputFilename, buildDir, contextInfo, executable),
        ...(updateCmd.metadata.timeout !== undefined ? { timeout: updateCmd.metadata.timeout } : {})
      };
    }
    if (deleteCmd) {
      typeConfig.delete = {
        command: generateCommandPath(deleteCmd.outputFilename, buildDir, contextInfo, executable),
        ...(deleteCmd.metadata.timeout !== undefined ? { timeout: deleteCmd.metadata.timeout } : {})
      };
    }

    types[typeName] = typeConfig;
  }

  const environment: EnvironmentConfig = {
    version: 1,
    actions
  };

  if (environmentDescription) {
    environment.description = environmentDescription;
  }

  if (Object.keys(types).length > 0) {
    environment.types = types;
  }

  return {
    environments: {
      [environmentName]: environment
    },
    __generated: {
      files: compiledCommands.map((c) => c.outputFilename),
      timestamp: new Date().toISOString()
    }
  };
}

// ============================================================================
// Legacy hooks.json Generation (for backward compatibility)
// ============================================================================

interface HookMetadata {
  hookEventName: HookEventName;
  timeout?: number;
}

interface CompiledHook {
  sourcePath: string;
  outputPath: string;
  outputFilename: string;
  metadata: HookMetadata;
}

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

function generateHooksJson(
  compiledHooks: CompiledHook[],
  buildDir: string,
  contextInfo: PathContextInfo,
  executable: string = 'node'
): HooksJson {
  const groups = groupHooksByEvent(compiledHooks);
  const hooks: HooksJson['hooks'] = {};

  for (const [eventName, hookList] of groups) {
    const entry = {
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

// ============================================================================
// File Operations
// ============================================================================

/**
 * Reads an existing settings.json or hooks.json file.
 * @param outputPath - Path to the file
 * @returns Parsed content or undefined if file doesn't exist or is invalid
 */
function readExistingOutput(outputPath: string): (SettingsJson | HooksJson) | undefined {
  if (!fs.existsSync(outputPath)) {
    return undefined;
  }

  try {
    const content = fs.readFileSync(outputPath, 'utf-8');
    return JSON.parse(content) as SettingsJson | HooksJson;
  } catch {
    return undefined;
  }
}

function readExistingHooksJson(outputPath: string): HooksJson | undefined {
  const existing = readExistingOutput(outputPath);
  if (existing && 'hooks' in existing) {
    return existing as HooksJson;
  }
  return undefined;
}

/**
 * Removes previously generated files from disk.
 * @param existingOutput - The existing output content
 * @param outputDir - Directory containing the generated files
 */
function removeOldGeneratedFiles(existingOutput: SettingsJson | HooksJson, outputDir: string): void {
  const filesToRemove = existingOutput.__generated?.files ?? [];

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

// Legacy hook preservation types
interface MatcherEntry {
  hooks: Array<{ type: 'command'; command: string; timeout?: number }>;
}

function extractPreservedHooks(existingHooksJson: HooksJson): Partial<Record<HookEventName, MatcherEntry[]>> {
  const generatedFiles = new Set(existingHooksJson.__generated?.files ?? []);
  const preserved: Partial<Record<HookEventName, MatcherEntry[]>> = {};

  for (const [eventType, entries] of Object.entries(existingHooksJson.hooks)) {
    const preservedEntries: MatcherEntry[] = [];

    for (const entry of entries) {
      const preservedHooks = entry.hooks.filter((hook) => {
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

function mergeHooksJson(
  newHooksJson: HooksJson,
  preservedHooks: Partial<Record<HookEventName, MatcherEntry[]>>
): HooksJson {
  const mergedHooks: Partial<Record<HookEventName, MatcherEntry[]>> = {};

  const allEventTypes = new Set([
    ...Object.keys(preservedHooks),
    ...Object.keys(newHooksJson.hooks)
  ]) as Set<HookEventName>;

  for (const eventType of allEventTypes) {
    const preserved = preservedHooks[eventType] ?? [];
    const generated = newHooksJson.hooks[eventType] ?? [];

    mergedHooks[eventType] = [...preserved, ...generated];
  }

  return {
    hooks: mergedHooks,
    __generated: newHooksJson.__generated
  };
}

/**
 * Writes output JSON to the specified path atomically.
 * @param content - The JSON content
 * @param outputPath - Path to write
 */
function writeOutputJson(content: SettingsJson | HooksJson, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${outputPath}.tmp.${process.pid}`;
  const jsonContent = `${JSON.stringify(content, null, 2)}\n`;

  try {
    fs.writeFileSync(tempPath, jsonContent, 'utf-8');
    fs.renameSync(tempPath, outputPath);
  } catch (error) {
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

function writeHooksJson(hooksJson: HooksJson, outputPath: string): void {
  writeOutputJson(hooksJson, outputPath);
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

  if (args.help || rawArgs.length === 0) {
    process.stdout.write(HELP_TEXT);
    process.exit(0);
  }

  if (args.version) {
    process.stdout.write(`cards-configuration v${VERSION}\n`);
    process.exit(0);
  }

  const validationError = validateArgs(args);
  if (validationError !== undefined) {
    process.stderr.write(`Error: ${validationError}\n\n`);
    process.stdout.write(HELP_TEXT);
    process.exit(1);
  }

  try {
    const cwd = process.cwd();

    // Config file mode
    if (args.configFile) {
      const configPath = path.resolve(cwd, args.configFile);
      if (!fs.existsSync(configPath)) {
        process.stderr.write(`Error: Config file not found: ${configPath}\n`);
        process.exit(1);
      }

      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent) as ConfigFile;

      const outputPath = path.resolve(path.dirname(configPath), config.output);
      const buildDir = path.join(path.dirname(outputPath), 'bin');
      const logFilePath = args.log !== undefined ? path.resolve(cwd, args.log) : undefined;
      const executable = args.executable !== undefined && args.executable !== '' ? args.executable : 'node';
      const contextInfo = detectPathContext(outputPath);

      // Read existing to remove old generated files
      const existingOutput = readExistingOutput(outputPath);
      if (existingOutput !== undefined) {
        removeOldGeneratedFiles(existingOutput, buildDir);
      }

      const allEnvironments: Record<string, EnvironmentConfig> = {};
      const allGeneratedFiles: string[] = [];

      for (const [envName, envConfig] of Object.entries(config.environments)) {
        const actionPatterns = envConfig.actions ?? [];
        const typePatterns = envConfig.types ?? [];
        const allPatterns = [...actionPatterns, ...typePatterns];

        const sourceFiles: string[] = [];
        for (const pattern of allPatterns) {
          const files = await discoverSourceFiles(pattern, path.dirname(configPath));
          sourceFiles.push(...files);
        }

        if (sourceFiles.length === 0) {
          process.stderr.write(`Warning: No source files found for environment "${envName}"\n`);
          continue;
        }

        const compiledCommands = await compileAllSources({
          sourceFiles: [...new Set(sourceFiles)],
          outputDir: buildDir,
          logFilePath
        });

        const envSettings = generateSettingsJson(
          compiledCommands,
          envName,
          envConfig.description,
          buildDir,
          contextInfo,
          executable
        );

        allEnvironments[envName] = envSettings.environments[envName];
        allGeneratedFiles.push(...envSettings.__generated.files);
      }

      const finalSettings: SettingsJson = {
        environments: allEnvironments,
        __generated: {
          files: [...new Set(allGeneratedFiles)],
          timestamp: new Date().toISOString()
        }
      };

      writeOutputJson(finalSettings, outputPath);

      process.stdout.write(`Generated ${outputPath} with ${Object.keys(allEnvironments).length} environments\n`);
      process.exit(0);
    }

    // Single environment mode
    const outputPath = path.resolve(cwd, args.output);
    const buildDir = path.join(path.dirname(outputPath), 'bin');
    const logFilePath = args.log !== undefined ? path.resolve(cwd, args.log) : undefined;
    const executable = args.executable !== undefined && args.executable !== '' ? args.executable : 'node';

    const sourceFiles = await discoverSourceFiles(args.input, cwd);

    if (sourceFiles.length === 0) {
      process.stderr.write(`No source files found matching pattern: ${args.input}\n`);
      process.exit(1);
    }

    // Read existing to remove old generated files
    const existingOutput = readExistingOutput(outputPath);
    if (existingOutput !== undefined) {
      removeOldGeneratedFiles(existingOutput, buildDir);
    }

    const compiledCommands = await compileAllSources({
      sourceFiles,
      outputDir: buildDir,
      logFilePath
    });

    if (compiledCommands.length === 0) {
      process.stderr.write('No valid commands found in discovered files.\n');
      process.exit(1);
    }

    const contextInfo = detectPathContext(outputPath);
    const settingsJson = generateSettingsJson(
      compiledCommands,
      args.environment!,
      args.description,
      buildDir,
      contextInfo,
      executable
    );

    writeOutputJson(settingsJson, outputPath);

    const actionCount = settingsJson.environments[args.environment!].actions.length;
    const typeCount = Object.keys(settingsJson.environments[args.environment!].types ?? {}).length;
    process.stdout.write(`Compiled ${compiledCommands.length} commands to ${buildDir}\n`);
    process.stdout.write(`Generated ${outputPath} (${actionCount} actions, ${typeCount} types)\n`);

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  }
}

// Run main only when executed directly
const isDirectExecution = (() => {
  try {
    const scriptPath = process.argv[1];
    if (!scriptPath) return false;
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
  analyzeSourceFile,
  analyzeHookFile,
  discoverSourceFiles,
  discoverHookFiles,
  compileSource,
  compileHook,
  generateContentHash,
  detectPathContext,
  detectHookContext,
  generateCommandPath,
  generateSettingsJson,
  generateHooksJson,
  groupByActionName,
  groupByTypeName,
  groupHooksByEvent,
  slugify,
  readExistingOutput,
  readExistingHooksJson,
  removeOldGeneratedFiles,
  extractPreservedHooks,
  mergeHooksJson,
  writeOutputJson,
  writeHooksJson,
  HOOK_FACTORY_TO_EVENT
};
export type {
  CliArgs,
  CommandMetadata,
  CompiledCommand,
  ActionConfig,
  TypeCommandConfig,
  EnvironmentConfig,
  SettingsJson,
  HooksJson,
  ConfigFile,
  HookMetadata,
  CompiledHook,
  MatcherEntry
};
