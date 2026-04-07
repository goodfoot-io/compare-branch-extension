/**
 * Build pipeline that compiles Cards configuration handlers into content-hashed
 * standalone ESM bundles and generates the corresponding settings.json with
 * correct command paths. Orchestrates argument parsing, handler compilation
 * via esbuild, and stale artifact cleanup.
 *
 * @summary CLI build pipeline for compiling Cards configuration into deployable settings
 * @module cli/index
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SettingsConfig, StreamConfigDefinition } from '../config.js';
import type { Action, Command, Settings, StreamDefinition } from '../schema.js';
import { type BuildArgs, buildLoaderMap } from './args.js';
import { compileHandler } from './compiler.js';
import { processWwwRoot } from './www-bundler.js';

export {
  type CompileFailure,
  type CompileOptions,
  type CompileResult,
  type CompileSuccess,
  compileHandler
} from './compiler.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Internal representation of a command to be compiled.
 */
interface CommandInfo {
  factoryType: string;
  name: string; // actionName or typeName
  sourcePath?: string;
  timeout?: number;
  // Action-specific metadata
  description?: string;
  icon?: string;
  supportsBackgroundMode?: boolean;
  allowConcurrent?: boolean;
}

/**
 * Result of compiling a single handler.
 */
interface CompiledHandler {
  /** Original command info */
  info: CommandInfo;
  /** Filename of the compiled bundle (e.g., 'launch-claude.abc12345.mjs') */
  filename: string;
  /** Full path to the compiled file */
  outputPath: string;
}

/**
 * Successful build result.
 */
export interface BuildSuccess {
  success: true;
  settingsPath: string;
  compiledHandlers: string[];
}

/**
 * Failed build result.
 */
export interface BuildFailure {
  success: false;
  error: string;
}

/**
 * Result of a build operation.
 */
export type BuildResult = BuildSuccess | BuildFailure;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Removes a file, ignoring ENOENT (already deleted).
 * Logs a warning for other errors.
 *
 * @param filePath - Absolute path to the file that should be removed.
 */
function tryUnlink(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[cards-sdk] Failed to clean up file %s: %s', filePath, (err as Error).message);
    }
  }
}

/**
 * Generates an 8-character content hash for cache busting.
 *
 * @param content - File content used as hash input.
 * @returns First eight characters of the SHA-256 digest.
 */
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
}

/**
 * Converts an action name to a slug (lowercase, hyphens).
 * E.g., "Launch Claude" -> "launch-claude"
 *
 * @param name - Human-readable action label from configuration.
 * @returns URL-safe slug suitable for IDs and filenames.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extracts the base filename from a source path without extension.
 * E.g., "/path/to/launch-claude-start.ts" -> "launch-claude-start"
 *
 * @param sourcePath - Handler source file path.
 * @returns Basename with common JS/TS extensions removed.
 */
function getBaseName(sourcePath: string): string {
  const basename = path.basename(sourcePath);
  // Remove common extensions
  return basename.replace(/\.(ts|js|mts|mjs|cts|cjs)$/, '');
}

/**
 * Generates the command string for settings.json.
 * Paths are relative to the settings.json file location.
 * Uses `$VSCODE_NODE` so the bundled Node.js interpreter is used
 * regardless of whether `node` is on the system PATH.
 * E.g., "$VSCODE_NODE ./bin/launch-claude.abc12345.mjs"
 *
 * @param filename - Compiled handler filename placed under the bin directory.
 * @param binDir - Relative output subdirectory containing compiled handlers.
 * @returns Command string to execute the compiled handler with VS Code's Node binary.
 */
function generateCommandString(filename: string, binDir: string): string {
  const relativePath = path.posix.join(binDir, filename);
  return `$VSCODE_NODE ./${relativePath}`;
}

// ============================================================================
// Handler Extraction
// ============================================================================

/**
 * Extracts all command info from a loaded config.
 *
 * @param config - Parsed settings configuration from `settings.config.ts`.
 * @returns Flattened command descriptors for actions, type hooks, and streams.
 */
function extractCommands(config: SettingsConfig): CommandInfo[] {
  const commands: CommandInfo[] = [];

  for (const envConfig of Object.values(config.environments)) {
    // Extract action commands
    for (const action of envConfig.actions) {
      commands.push({
        factoryType: action.factoryType,
        name: action.actionName,
        sourcePath: action.sourcePath,
        timeout: action.timeout,
        description: action.description,
        icon: action.icon,
        supportsBackgroundMode: action.supportsBackgroundMode,
        allowConcurrent: action.allowConcurrent
      });
    }

    // Stream configs no longer produce compiled handlers — wwwRoot directories
    // are copied to the output as static assets.
  }

  return commands;
}

// ============================================================================
// Compilation
// ============================================================================

/**
 * Strips the trailing inline sourcemap comment from compiled output.
 *
 * esbuild appends `//# sourceMappingURL=data:...` as the last line.
 * Stripping it before hashing produces deterministic hashes that reflect
 * actual bundled content (including dependencies) without being affected
 * by sourcemap data that varies across builds.
 *
 * @param content - Bundled handler output that may include an inline source map.
 * @returns Bundle content without the trailing inline source map directive.
 */
function stripSourceMapComment(content: string): string {
  return content.replace(/\n\/\/# sourceMappingURL=data:.*$/s, '');
}

/**
 * Compiles all handlers that have sourcePath and returns compiled info.
 *
 * Single-pass: compiles each handler once with inline sourcemaps, then
 * strips the sourcemap line to generate a deterministic content hash.
 *
 * @param commands - Flattened command descriptors extracted from configuration.
 * @param binDir - Absolute output directory for compiled handler bundles.
 * @param loaders - Additional esbuild loaders for non-code imports (e.g., `{ '.md': 'text' }`).
 * @returns Compiled handler metadata plus a list of compilation error strings.
 */
async function compileHandlers(
  commands: CommandInfo[],
  binDir: string,
  loaders?: Record<string, string>
): Promise<{ compiled: CompiledHandler[]; errors: string[] }> {
  const compiled: CompiledHandler[] = [];
  const errors: string[] = [];
  const seenPaths = new Set<string>();

  // Ensure bin directory exists
  fs.mkdirSync(binDir, { recursive: true });

  for (const cmd of commands) {
    if (!cmd.sourcePath) {
      continue;
    }

    // Skip if we've already compiled this source (deduplication)
    if (seenPaths.has(cmd.sourcePath)) {
      const existing = compiled.find((c) => c.info.sourcePath === cmd.sourcePath);
      if (existing) {
        compiled.push({
          info: cmd,
          filename: existing.filename,
          outputPath: existing.outputPath
        });
      }
      continue;
    }
    seenPaths.add(cmd.sourcePath);

    const baseName = getBaseName(cmd.sourcePath);
    const tempOutputPath = path.join(binDir, `${baseName}.temp.mjs`);

    // Single-pass: compile with inline sourcemaps
    const result = await compileHandler({
      sourcePath: cmd.sourcePath,
      outputPath: tempOutputPath,
      sourcemap: true,
      loaders
    });

    if (!result.success) {
      errors.push(`Failed to compile ${cmd.sourcePath}: ${result.error}`);
      continue;
    }

    // Hash the content WITHOUT the sourcemap comment for deterministic hashes
    const fullContent = fs.readFileSync(tempOutputPath, 'utf-8');
    const hash = generateContentHash(stripSourceMapComment(fullContent));
    const filename = `${baseName}.${hash}.mjs`;
    const finalOutputPath = path.join(binDir, filename);

    // Rename to final content-hashed filename
    // D11: On Windows, fs.rename fails with EEXIST if destination exists.
    // Unlink first; the brief non-atomic window is acceptable here.
    try {
      fs.unlinkSync(finalOutputPath);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    fs.renameSync(tempOutputPath, finalOutputPath);

    // Make executable
    fs.chmodSync(finalOutputPath, 0o755);

    compiled.push({
      info: cmd,
      filename,
      outputPath: finalOutputPath
    });
  }

  return { compiled, errors };
}

// ============================================================================
// wwwRoot Processing
// ============================================================================

/**
 * Processes all wwwRoot directories across all environments and streams.
 *
 * For each stream config with a wwwRoot, resolves the directory relative to
 * the config file, bundles inline module scripts in the HTML entrypoint,
 * and copies the result to the output directory. Returns a map of
 * `"envName/streamName"` to the relative output path for use in settings.json.
 *
 * @param config - Parsed settings configuration.
 * @param configDir - Directory containing the config file (for resolving relative wwwRoot paths).
 * @param outdir - Absolute path to the build output directory.
 * @returns Map from `"envName/streamName"` to the relative wwwRoot path in the output.
 */
async function processAllWwwRoots(
  config: SettingsConfig,
  configDir: string,
  outdir: string
): Promise<Map<string, string>> {
  const overrides = new Map<string, string>();

  for (const [envName, envConfig] of Object.entries(config.environments)) {
    if (!envConfig.streams) continue;

    for (const [streamName, streamConfig] of Object.entries(envConfig.streams)) {
      if (!streamConfig.wwwRoot) continue;

      const wwwRootDir = path.isAbsolute(streamConfig.wwwRoot)
        ? streamConfig.wwwRoot
        : path.resolve(configDir, streamConfig.wwwRoot);

      const entrypoint = streamConfig.entrypoint ?? 'index.html';
      const entrypointPath = path.resolve(wwwRootDir, entrypoint);

      // Skip processing if the wwwRoot directory or entrypoint doesn't exist —
      // the original path passes through unchanged in settings.json.
      if (!fs.existsSync(entrypointPath)) {
        continue;
      }

      const relativeOutputDir = path.join('www', streamName);
      const absoluteOutputDir = path.join(outdir, relativeOutputDir);

      await processWwwRoot(wwwRootDir, absoluteOutputDir, entrypoint);
      overrides.set(`${envName}/${streamName}`, `./${relativeOutputDir}`);
    }
  }

  return overrides;
}

// ============================================================================
// Settings Generation
// ============================================================================

/**
 * Generates settings.json with proper command paths.
 *
 * @param config - Original typed configuration object.
 * @param compiled - Metadata for successfully compiled handlers.
 * @param binDir - Relative bin directory used in generated command strings.
 * @param wwwRootOverrides - Map from `"envName/streamName"` to the relative wwwRoot path
 *   in the build output, replacing the source path in generated settings.
 * @returns Settings schema object ready to serialize as `settings.json`.
 */
function generateSettings(
  config: SettingsConfig,
  compiled: CompiledHandler[],
  binDir: string,
  wwwRootOverrides?: Map<string, string>
): Settings {
  // Build lookup maps for compiled handlers
  const compiledByKey = new Map<string, CompiledHandler>();
  for (const c of compiled) {
    const key = `${c.info.factoryType}:${c.info.name}`;
    compiledByKey.set(key, c);
  }

  const environments: Settings['environments'] = {};

  for (const [envName, envConfig] of Object.entries(config.environments)) {
    // Generate actions
    const actions: Action[] = [];
    for (const actionCmd of envConfig.actions) {
      const key = `${actionCmd.factoryType}:${actionCmd.actionName}`;
      const compiled = compiledByKey.get(key);

      const action: Action = {
        id: actionCmd.id ?? slugify(actionCmd.actionName),
        name: actionCmd.actionName,
        command: generateCommand(actionCmd, compiled, binDir)
      };

      // Add optional metadata
      if (actionCmd.description !== undefined) {
        action.description = actionCmd.description;
      }
      if (actionCmd.icon !== undefined) {
        action.icon = actionCmd.icon;
      }
      if (actionCmd.supportsBackgroundMode !== undefined) {
        action.supportsBackgroundMode = actionCmd.supportsBackgroundMode;
      }
      if (actionCmd.allowConcurrent !== undefined) {
        action.allowConcurrent = actionCmd.allowConcurrent;
      }

      actions.push(action);
    }

    // Build environment
    environments[envName] = {
      version: envConfig.version ?? 1,
      actions
    };

    if (envConfig.description !== undefined) {
      environments[envName].description = envConfig.description;
    }

    // Generate streams — wwwRoot paths are rewritten to bundled output locations
    if (envConfig.streams) {
      const streams: Record<string, StreamDefinition> = {};
      for (const [streamName, streamConfig] of Object.entries(envConfig.streams)) {
        const overrideKey = `${envName}/${streamName}`;
        const wwwRootOverride = wwwRootOverrides?.get(overrideKey);
        streams[streamName] = generateStreamDefinition(streamConfig, wwwRootOverride);
      }
      environments[envName].streams = streams;
    }
  }

  return { environments };
}

/**
 * Generates a Command object for a handler.
 *
 * @param cmd - Command metadata from the source configuration.
 * @param cmd.factoryType - Factory identifier used to build fallback command names.
 * @param cmd.timeout - Optional timeout value propagated to generated command metadata.
 * @param cmd.sourcePath - Optional source path that indicates the command can be compiled.
 * @param compiled - Matching compiled handler metadata when compilation succeeded.
 * @param binDir - Relative bin directory used when constructing executable paths.
 * @returns Command object consumable by the runtime settings schema.
 */
function generateCommand(
  cmd: { factoryType: string; timeout?: number; sourcePath?: string },
  compiled: CompiledHandler | undefined,
  binDir: string
): Command {
  let commandStr: string;

  if (compiled) {
    // Use compiled filename
    commandStr = generateCommandString(compiled.filename, binDir);
  } else {
    // Fallback to placeholder (no sourcePath provided)
    commandStr = `${cmd.factoryType}-placeholder.js`;
  }

  const command: Command = { command: commandStr };

  if (cmd.timeout !== undefined) {
    command.timeout = cmd.timeout;
  }

  return command;
}

/**
 * Generates a StreamDefinition object for a stream config.
 *
 * @param streamConfig - Source stream configuration with wwwRoot and optional fields.
 * @param wwwRootOverride - When provided, replaces the source wwwRoot path with the
 *   bundled output path.
 * @returns Stream definition object compatible with settings schema.
 */
function generateStreamDefinition(streamConfig: StreamConfigDefinition, wwwRootOverride?: string): StreamDefinition {
  const streamDef: StreamDefinition = {
    version: streamConfig.version,
    wwwRoot: wwwRootOverride ?? streamConfig.wwwRoot
  };
  if (streamConfig.entrypoint !== undefined) {
    streamDef.entrypoint = streamConfig.entrypoint;
  }
  if (streamConfig.maxLineLength !== undefined) {
    streamDef.maxLineLength = streamConfig.maxLineLength;
  }
  if (streamConfig.maxStreamSize !== undefined) {
    streamDef.maxStreamSize = streamConfig.maxStreamSize;
  }
  return streamDef;
}

// ============================================================================
// Stale File Cleanup
// ============================================================================

/**
 * Removes stale compiled files from a previous build.
 *
 * @param settingsPath - Path to the previous `settings.json` file, if present.
 * @param binDir - Directory where compiled handler files are stored.
 */
function cleanupStaleFiles(settingsPath: string, binDir: string): void {
  try {
    if (!fs.existsSync(settingsPath)) {
      return;
    }

    const existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as {
      __generated?: { files?: string[] };
    };

    const previousFiles = existingSettings.__generated?.files ?? [];

    for (const filename of previousFiles) {
      tryUnlink(path.join(binDir, filename));
    }
  } catch (err) {
    // Ignore ENOENT (settings file doesn't exist), log other errors
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[cards-sdk] Failed to read previous settings for cleanup: %s', (err as Error).message);
    }
  }
}

// ============================================================================
// Main Build Function
// ============================================================================

/**
 * Execute a build from the provided configuration.
 *
 * This function orchestrates the entire build process:
 * 1. Loads and validates the configuration file
 * 2. Compiles handlers with sourcePath into standalone bundles
 * 3. Generates settings.json with proper command paths
 * 4. Cleans up stale files from previous builds
 *
 * @param args - Parsed CLI arguments describing config and output locations.
 * @returns Build result containing generated paths or a failure message.
 */
export async function build(args: BuildArgs): Promise<BuildResult> {
  try {
    // 1. Load configuration file
    const { loadConfig } = await import('./config-loader.js');
    const loaderMap = args.loaderFlags ? buildLoaderMap(args.loaderFlags) : undefined;
    const loadResult = await loadConfig(args.config, loaderMap);

    if (!loadResult.success) {
      return {
        success: false,
        error: loadResult.error
      };
    }

    const { config, configPath } = loadResult;
    const configDir = path.dirname(configPath);

    // 2. Create output directories
    const outdir = path.resolve(args.outdir);
    const binDir = path.join(outdir, 'bin');
    const settingsPath = path.join(outdir, 'settings.json');

    // Check if outdir exists as a file (common mistake: passing -o dist/settings.json instead of -o dist)
    if (fs.existsSync(outdir) && fs.statSync(outdir).isFile()) {
      return {
        success: false,
        error: `Output path "${args.outdir}" is a file, not a directory. The -o/--outdir argument should be a directory path (e.g., "dist"), not a file path.`
      };
    }

    fs.mkdirSync(outdir, { recursive: true });

    // 3. Cleanup stale files from previous build
    cleanupStaleFiles(settingsPath, binDir);

    // 4. Extract commands from config
    const commands = extractCommands(config);

    // 5. Compile handlers
    const { compiled, errors } = await compileHandlers(commands, binDir, loaderMap);

    if (errors.length > 0) {
      return {
        success: false,
        error: `Compilation errors:\n${errors.join('\n')}`
      };
    }

    // 6. Process wwwRoot directories — bundle inline module scripts
    const wwwRootOverrides = await processAllWwwRoots(config, configDir, outdir);

    // 7. Generate settings.json
    const settings = generateSettings(config, compiled, 'bin', wwwRootOverrides);

    // 8. Add __generated metadata
    const uniqueFilenames = [...new Set(compiled.map((c) => c.filename))];
    const settingsWithMeta = {
      ...settings,
      __generated: {
        files: uniqueFilenames
      }
    };

    // 9. Write settings.json atomically (via temp file)
    const tempPath = `${settingsPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(settingsWithMeta, null, 2), 'utf-8');
    // D11: On Windows, fs.rename fails with EEXIST if destination exists.
    // Unlink first; the brief non-atomic window is acceptable here.
    try {
      fs.unlinkSync(settingsPath);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    fs.renameSync(tempPath, settingsPath);

    return {
      success: true,
      settingsPath,
      compiledHandlers: compiled.map((c) => c.outputPath)
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Build failed: ${errorMessage}`
    };
  }
}

/**
 * CLI entry point.
 */
export async function main(): Promise<void> {
  const { parseArgs } = await import('./args.js');
  const parseResult = parseArgs(process.argv.slice(2));

  if (!parseResult.success) {
    console.error('Error:', parseResult.error);
    console.error('\nUsage: cards-sdk build -c <config> -o <outdir>');
    process.exit(1);
  }

  const buildResult = await build(parseResult.args);

  if (!buildResult.success) {
    console.error('Build failed:', buildResult.error);
    process.exit(1);
  }

  console.log('Build successful!');
  console.log('Settings written to:', buildResult.settingsPath);
  if (buildResult.compiledHandlers.length > 0) {
    console.log('Compiled handlers:', buildResult.compiledHandlers.length);
  }
  process.exit(0);
}
