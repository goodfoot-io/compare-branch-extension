#!/usr/bin/env node

/**
 * CLI main entry point for Cards Configuration v2.
 *
 * This module orchestrates the build process:
 * 1. Parses command-line arguments
 * 2. Loads the configuration file
 * 3. Compiles handlers into standalone ESM bundles
 * 4. Generates settings.json with proper command paths
 *
 * ## Handler Compilation
 *
 * When handlers have a `sourcePath` property, the CLI compiles them into
 * standalone .mjs bundles using esbuild. The compiled files include:
 * - A content hash for cache busting (e.g., `launch-claude.abc12345.mjs`)
 * - The runtime wrapper that calls `execute(handler)`
 *
 * This matches V1 feature parity where handlers are bundled as executables.
 *
 * @module cli/index
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SettingsConfig, StreamConfigDefinition } from '../config.js';
import type { Action, Command, Settings, StreamDefinition, TypeDefinition } from '../schema.js';
import type { BuildArgs } from './args.js';
import { compileHandler } from './compiler.js';

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
 * Generates an 8-character content hash for cache busting.
 */
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
}

/**
 * Converts an action name to a slug (lowercase, hyphens).
 * E.g., "Launch Claude" -> "launch-claude"
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
 */
function getBaseName(sourcePath: string): string {
  const basename = path.basename(sourcePath);
  // Remove common extensions
  return basename.replace(/\.(ts|js|mts|mjs|cts|cjs)$/, '');
}

/**
 * Generates the command string for settings.json.
 * Paths are relative to the settings.json file location.
 * E.g., "node ./bin/launch-claude.abc12345.mjs"
 */
function generateCommandString(filename: string, binDir: string): string {
  const relativePath = path.posix.join(binDir, filename);
  return `node ./${relativePath}`;
}

// ============================================================================
// Handler Extraction
// ============================================================================

/**
 * Extracts all command info from a loaded config.
 */
function extractCommands(config: SettingsConfig): CommandInfo[] {
  const commands: CommandInfo[] = [];

  for (const envConfig of Object.values(config.environments)) {
    // Extract action commands
    for (const actionPair of envConfig.actions) {
      // Note: We extract commands even if start is missing - validation happens later
      if (actionPair.start) {
        commands.push({
          factoryType: actionPair.start.factoryType,
          name: actionPair.start.actionName,
          sourcePath: actionPair.start.sourcePath,
          timeout: actionPair.start.timeout,
          description: actionPair.start.description,
          icon: actionPair.start.icon,
          supportsBackgroundMode: actionPair.start.supportsBackgroundMode,
          allowConcurrent: actionPair.start.allowConcurrent
        });
      }

      if (actionPair.end) {
        commands.push({
          factoryType: actionPair.end.factoryType,
          name: actionPair.end.actionName,
          sourcePath: actionPair.end.sourcePath,
          timeout: actionPair.end.timeout
        });
      }
    }

    // Extract type commands
    if (envConfig.types) {
      for (const typeConfig of Object.values(envConfig.types)) {
        if (typeConfig.validator) {
          commands.push({
            factoryType: typeConfig.validator.factoryType,
            name: typeConfig.validator.typeName,
            sourcePath: typeConfig.validator.sourcePath,
            timeout: typeConfig.validator.timeout
          });
        }
        if (typeConfig.create) {
          commands.push({
            factoryType: typeConfig.create.factoryType,
            name: typeConfig.create.typeName,
            sourcePath: typeConfig.create.sourcePath,
            timeout: typeConfig.create.timeout
          });
        }
        if (typeConfig.update) {
          commands.push({
            factoryType: typeConfig.update.factoryType,
            name: typeConfig.update.typeName,
            sourcePath: typeConfig.update.sourcePath,
            timeout: typeConfig.update.timeout
          });
        }
        if (typeConfig.delete) {
          commands.push({
            factoryType: typeConfig.delete.factoryType,
            name: typeConfig.delete.typeName,
            sourcePath: typeConfig.delete.sourcePath,
            timeout: typeConfig.delete.timeout
          });
        }
      }
    }

    // Extract stream transform commands
    if (envConfig.streams) {
      for (const streamConfig of Object.values(envConfig.streams)) {
        commands.push({
          factoryType: streamConfig.transform.factoryType,
          name: streamConfig.transform.streamType,
          sourcePath: streamConfig.transform.sourcePath,
          timeout: streamConfig.transform.timeout
        });
      }
    }
  }

  return commands;
}

// ============================================================================
// Compilation
// ============================================================================

/**
 * Compiles all handlers that have sourcePath and returns compiled info.
 */
async function compileHandlers(
  commands: CommandInfo[],
  binDir: string
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
      // Find the already compiled handler for this source
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

    // Step 1: Compile WITHOUT sourcemaps to generate stable content hash
    // (Sourcemaps can contain timestamps or paths that change the hash)
    const hashResult = await compileHandler({
      sourcePath: cmd.sourcePath,
      outputPath: tempOutputPath,
      sourcemap: false,
      factoryType: cmd.factoryType
    });

    if (!hashResult.success) {
      errors.push(`Failed to compile ${cmd.sourcePath}: ${hashResult.error}`);
      continue;
    }

    // Generate hash from sourcemap-free content
    const hashContent = fs.readFileSync(tempOutputPath, 'utf-8');
    const hash = generateContentHash(hashContent);
    const filename = `${baseName}.${hash}.mjs`;
    const finalOutputPath = path.join(binDir, filename);

    // Step 2: Compile WITH sourcemaps for debugging
    const finalResult = await compileHandler({
      sourcePath: cmd.sourcePath,
      outputPath: finalOutputPath,
      sourcemap: true,
      factoryType: cmd.factoryType
    });

    if (!finalResult.success) {
      errors.push(`Failed to compile ${cmd.sourcePath} with sourcemaps: ${finalResult.error}`);
      // Clean up temp file
      try {
        fs.unlinkSync(tempOutputPath);
      } catch (err) {
        // Ignore ENOENT (file already deleted), log other errors
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn(
            '[cards-configuration] Failed to clean up temp file %s: %s',
            tempOutputPath,
            (err as Error).message
          );
        }
      }
      continue;
    }

    // Clean up temp file used for hashing
    try {
      fs.unlinkSync(tempOutputPath);
    } catch (err) {
      // Ignore ENOENT (file already deleted), log other errors
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(
          '[cards-configuration] Failed to clean up temp file %s: %s',
          tempOutputPath,
          (err as Error).message
        );
      }
    }

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
// Settings Generation
// ============================================================================

/**
 * Generates settings.json with proper command paths.
 */
function generateSettings(config: SettingsConfig, compiled: CompiledHandler[], binDir: string): Settings {
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
    for (const actionPair of envConfig.actions) {
      if (!actionPair.start) {
        throw new Error('Action must have a start command');
      }

      const startKey = `${actionPair.start.factoryType}:${actionPair.start.actionName}`;
      const startCompiled = compiledByKey.get(startKey);

      const action: Action = {
        id: actionPair.start.id ?? slugify(actionPair.start.actionName),
        name: actionPair.start.actionName,
        start: generateCommand(actionPair.start, startCompiled, binDir)
      };

      // Add optional metadata
      if (actionPair.start.description !== undefined) {
        action.description = actionPair.start.description;
      }
      if (actionPair.start.icon !== undefined) {
        action.icon = actionPair.start.icon;
      }
      if (actionPair.start.supportsBackgroundMode !== undefined) {
        action.supportsBackgroundMode = actionPair.start.supportsBackgroundMode;
      }
      if (actionPair.start.allowConcurrent !== undefined) {
        action.allowConcurrent = actionPair.start.allowConcurrent;
      }

      // Add end command if present
      if (actionPair.end) {
        const endKey = `${actionPair.end.factoryType}:${actionPair.end.actionName}`;
        const endCompiled = compiledByKey.get(endKey);
        action.end = generateCommand(actionPair.end, endCompiled, binDir);
      }

      actions.push(action);
    }

    // Generate types
    let types: Record<string, TypeDefinition> | undefined;
    if (envConfig.types) {
      types = {};
      for (const [typeName, typeConfig] of Object.entries(envConfig.types)) {
        const typeDef: TypeDefinition = {
          version: typeConfig.version
        };

        if (typeConfig.validator) {
          const key = `${typeConfig.validator.factoryType}:${typeConfig.validator.typeName}`;
          const compiled = compiledByKey.get(key);
          typeDef.validator = generateCommand(typeConfig.validator, compiled, binDir);
        }
        if (typeConfig.create) {
          const key = `${typeConfig.create.factoryType}:${typeConfig.create.typeName}`;
          const compiled = compiledByKey.get(key);
          typeDef.create = generateCommand(typeConfig.create, compiled, binDir);
        }
        if (typeConfig.update) {
          const key = `${typeConfig.update.factoryType}:${typeConfig.update.typeName}`;
          const compiled = compiledByKey.get(key);
          typeDef.update = generateCommand(typeConfig.update, compiled, binDir);
        }
        if (typeConfig.delete) {
          const key = `${typeConfig.delete.factoryType}:${typeConfig.delete.typeName}`;
          const compiled = compiledByKey.get(key);
          typeDef.delete = generateCommand(typeConfig.delete, compiled, binDir);
        }

        types[typeName] = typeDef;
      }
    }

    // Build environment
    environments[envName] = {
      version: envConfig.version ?? 1,
      actions
    };

    if (envConfig.description !== undefined) {
      environments[envName].description = envConfig.description;
    }

    if (types) {
      environments[envName].types = types;
    }

    // Generate streams
    if (envConfig.streams) {
      const streams: Record<string, StreamDefinition> = {};
      for (const [streamName, streamConfig] of Object.entries(envConfig.streams)) {
        const key = `${streamConfig.transform.factoryType}:${streamConfig.transform.streamType}`;
        const compiled = compiledByKey.get(key);
        streams[streamName] = generateStreamDefinition(streamConfig, compiled, binDir);
      }
      environments[envName].streams = streams;
    }
  }

  return { environments };
}

/**
 * Generates a Command object for a handler.
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
 */
function generateStreamDefinition(
  streamConfig: StreamConfigDefinition,
  compiled: CompiledHandler | undefined,
  binDir: string
): StreamDefinition {
  const streamDef: StreamDefinition = {
    version: streamConfig.version,
    transform: {
      path: compiled
        ? path.posix.join(binDir, compiled.filename)
        : `${streamConfig.transform.factoryType}-${streamConfig.transform.streamType}.js`
    }
  };
  if (streamConfig.transform.timeout !== undefined) {
    streamDef.transform.timeout = streamConfig.transform.timeout;
  }
  if (streamConfig.transform.maxLineLength !== undefined) {
    streamDef.maxLineLength = streamConfig.transform.maxLineLength;
  }
  if (streamConfig.transform.maxStreamSize !== undefined) {
    streamDef.maxStreamSize = streamConfig.transform.maxStreamSize;
  }
  return streamDef;
}

// ============================================================================
// Stale File Cleanup
// ============================================================================

/**
 * Removes stale compiled files from a previous build.
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
      const filePath = path.join(binDir, filename);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        // Ignore ENOENT (file already deleted), log other errors
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn('[cards-configuration] Failed to clean up stale file %s: %s', filePath, (err as Error).message);
        }
      }
    }
  } catch (err) {
    // Ignore ENOENT (settings file doesn't exist), log other errors
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[cards-configuration] Failed to read previous settings for cleanup: %s', (err as Error).message);
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
 */
export async function build(args: BuildArgs): Promise<BuildResult> {
  try {
    // 1. Load configuration file
    const { loadConfig } = await import('./config-loader.js');
    const loadResult = await loadConfig(args.config);

    if (!loadResult.success) {
      return {
        success: false,
        error: loadResult.error
      };
    }

    const { config } = loadResult;

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
    const { compiled, errors } = await compileHandlers(commands, binDir);

    if (errors.length > 0) {
      return {
        success: false,
        error: `Compilation errors:\n${errors.join('\n')}`
      };
    }

    // 6. Generate settings.json
    const settings = generateSettings(config, compiled, 'bin');

    // 7. Add __generated metadata
    const uniqueFilenames = [...new Set(compiled.map((c) => c.filename))];
    const settingsWithMeta = {
      ...settings,
      __generated: {
        files: uniqueFilenames,
        timestamp: new Date().toISOString()
      }
    };

    // 8. Write settings.json atomically (via temp file)
    const tempPath = `${settingsPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(settingsWithMeta, null, 2), 'utf-8');
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
    console.error('\nUsage: cards-configuration-v2 build -c <config> -o <outdir>');
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
