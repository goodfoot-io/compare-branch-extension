#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/cli/config-loader.ts
var config_loader_exports = {};
__export(config_loader_exports, {
  loadConfig: () => loadConfig
});
import { existsSync as existsSync2 } from "node:fs";
import { createRequire } from "node:module";
import { resolve as resolve2 } from "node:path";
import { fileURLToPath } from "node:url";
async function loadConfig(configPath) {
  const absolutePath = resolve2(configPath);
  if (!existsSync2(absolutePath)) {
    return {
      success: false,
      error: `Configuration file does not exist: ${absolutePath}`
    };
  }
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const jiti = createJiti(currentFile, {
      interopDefault: true,
      requireCache: false
    });
    const module = await jiti.import(absolutePath, {});
    if (!module || typeof module !== "object") {
      return {
        success: false,
        error: `Configuration file has no default export: ${absolutePath}`
      };
    }
    const maybeConfig = module;
    if (!maybeConfig.environments || typeof maybeConfig.environments !== "object") {
      return {
        success: false,
        error: `Configuration has invalid structure: missing 'environments' property in ${absolutePath}`
      };
    }
    return {
      success: true,
      config: maybeConfig,
      configPath: absolutePath
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to load configuration file: ${errorMessage}`
    };
  }
}
var require2, createJiti;
var init_config_loader = __esm({
  "src/cli/config-loader.ts"() {
    "use strict";
    require2 = createRequire(import.meta.url);
    createJiti = require2("jiti");
  }
});

// src/cli/args.ts
var args_exports = {};
__export(args_exports, {
  parseArgs: () => parseArgs
});
function parseArgs(argv) {
  if (argv.length === 0) {
    return { success: false, error: "Missing command. Usage: cards-configuration-v2 build [options]" };
  }
  const command = argv[0];
  if (command !== "build") {
    return { success: false, error: `Unknown command: ${command}. Only 'build' is supported.` };
  }
  const args = {};
  const knownFlags = /* @__PURE__ */ new Set(["-c", "--config", "-o", "--outdir", "--log"]);
  for (let i = 1; i < argv.length; i++) {
    const flag = argv[i];
    if (!knownFlags.has(flag)) {
      if (flag.startsWith("-")) {
        return { success: false, error: `Unknown flag: ${flag}` };
      }
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith("-")) {
      let flagName;
      if (flag.startsWith("--")) {
        flagName = flag;
      } else if (flag === "-c") {
        flagName = "--config";
      } else if (flag === "-o") {
        flagName = "--outdir";
      } else {
        flagName = flag;
      }
      return { success: false, error: `Missing value for ${flagName}` };
    }
    switch (flag) {
      case "-c":
      case "--config":
        args.config = value;
        break;
      case "-o":
      case "--outdir":
        args.outdir = value;
        break;
      case "--log":
        args.log = value;
        break;
    }
    i++;
  }
  if (!args.config) {
    return { success: false, error: "Missing required argument: --config" };
  }
  if (!args.outdir) {
    return { success: false, error: "Missing required argument: --outdir" };
  }
  return {
    success: true,
    command: "build",
    args
  };
}
var init_args = __esm({
  "src/cli/args.ts"() {
    "use strict";
  }
});

// src/cli/index.ts
import * as crypto from "node:crypto";
import * as fs2 from "node:fs";
import * as path2 from "node:path";

// src/cli/compiler.ts
import * as fs from "node:fs";
import * as path from "node:path";
import * as esbuild from "esbuild";
function findPackageRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error(`Could not find package.json from ${startDir}`);
}
var PACKAGE_ROOT = findPackageRoot(path.dirname(new URL(import.meta.url).pathname));
var EXTERNALS = [
  "node:*",
  "http",
  "https",
  "url",
  "stream",
  "zlib",
  "events",
  "buffer",
  "util",
  "path",
  "fs",
  "os",
  "crypto",
  "child_process",
  "perf_hooks",
  "async_hooks",
  "diagnostics_channel"
];
var BANNER = `import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);`;
async function compileHandler(options) {
  const { sourcePath, outputPath, sourcemap = false, factoryType, logFile } = options;
  try {
    if (!fs.existsSync(sourcePath)) {
      return {
        success: false,
        error: `Source file does not exist: ${sourcePath}`
      };
    }
    const resolveDir = path.dirname(sourcePath);
    const toRelativeImport = (absolute) => {
      const rel = path.relative(resolveDir, absolute).replace(/\\/g, "/");
      return rel.startsWith(".") ? rel : `./${rel}`;
    };
    const sourceImport = toRelativeImport(sourcePath);
    const logPreamble = logFile ? `
import { resolve as __resolve } from 'node:path';
const __DEFAULT_LOG_DEST = ${JSON.stringify(logFile)};
const __cardRepo = process.env['CARD_REPO_PATH'];
if (__cardRepo && !process.env['CARDS_HOOKS_LOG_FILE']) {
  process.env['CARDS_HOOKS_LOG_FILE'] = __resolve(__cardRepo, __DEFAULT_LOG_DEST);
}
` : "";
    let wrapperContent;
    if (factoryType === "streamTransform") {
      wrapperContent = `
import cmd from '${sourceImport}';
export function init(ctx) { return cmd.init?.(ctx); }
export default function transform(line, ctx) { return cmd(line, ctx); }
`;
    } else if (factoryType === "typeValidator") {
      const validationImport = toRelativeImport(path.resolve(PACKAGE_ROOT, "src/validation.ts"));
      wrapperContent = `${logPreamble}
import handler from '${sourceImport}';
import { executeValidation } from '${validationImport}';

executeValidation(handler);
`;
    } else {
      const runtimeImport = toRelativeImport(path.resolve(PACKAGE_ROOT, "src/runtime.ts"));
      wrapperContent = `${logPreamble}
import handler from '${sourceImport}';
import { executeCommand } from '${runtimeImport}';

executeCommand(handler);
`;
    }
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });
    const isStreamTransform = factoryType === "streamTransform";
    const result = await esbuild.build({
      stdin: {
        contents: wrapperContent,
        resolveDir,
        sourcefile: "hook-wrapper.ts",
        loader: "ts"
      },
      outfile: outputPath,
      bundle: true,
      format: "esm",
      platform: isStreamTransform ? "neutral" : "node",
      target: "es2022",
      sourcemap: sourcemap ? "inline" : false,
      minify: false,
      external: isStreamTransform ? [] : EXTERNALS,
      banner: isStreamTransform ? {} : {
        js: BANNER
      },
      logLevel: "silent"
    });
    if (result.errors.length > 0) {
      const errors = result.errors.map((e) => e.text).join("\n");
      return {
        success: false,
        error: `Bundling failed: ${errors}`
      };
    }
    return {
      success: true,
      outputPath
    };
  } catch (error) {
    if (error && typeof error === "object" && "errors" in error) {
      const buildError = error;
      const errors = buildError.errors.map((e) => e.text).join("\n");
      return {
        success: false,
        error: `Bundling failed: ${errors}`
      };
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Compilation failed: ${errorMessage}`
    };
  }
}

// src/cli/index.ts
function tryUnlink(filePath) {
  try {
    fs2.unlinkSync(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn("[cards-configuration] Failed to clean up file %s: %s", filePath, err.message);
    }
  }
}
function generateContentHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex").substring(0, 8);
}
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function getBaseName(sourcePath) {
  const basename2 = path2.basename(sourcePath);
  return basename2.replace(/\.(ts|js|mts|mjs|cts|cjs)$/, "");
}
function generateCommandString(filename, binDir) {
  const relativePath = path2.posix.join(binDir, filename);
  return `$VSCODE_NODE_PATH ./${relativePath}`;
}
function extractCommands(config) {
  const commands = [];
  for (const envConfig of Object.values(config.environments)) {
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
    if (envConfig.types) {
      const typeHookKeys = ["validator", "create", "update", "delete"];
      for (const typeConfig of Object.values(envConfig.types)) {
        for (const hookKey of typeHookKeys) {
          const hook = typeConfig[hookKey];
          if (hook) {
            commands.push({
              factoryType: hook.factoryType,
              name: hook.typeName,
              sourcePath: hook.sourcePath,
              timeout: hook.timeout
            });
          }
        }
      }
    }
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
async function compileHandlers(commands, binDir, logFile) {
  const compiled = [];
  const errors = [];
  const seenPaths = /* @__PURE__ */ new Set();
  fs2.mkdirSync(binDir, { recursive: true });
  for (const cmd of commands) {
    if (!cmd.sourcePath) {
      continue;
    }
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
    const tempOutputPath = path2.join(binDir, `${baseName}.temp.mjs`);
    const hashResult = await compileHandler({
      sourcePath: cmd.sourcePath,
      outputPath: tempOutputPath,
      sourcemap: false,
      factoryType: cmd.factoryType,
      logFile
    });
    if (!hashResult.success) {
      errors.push(`Failed to compile ${cmd.sourcePath}: ${hashResult.error}`);
      continue;
    }
    const hashContent = fs2.readFileSync(tempOutputPath, "utf-8");
    const hash = generateContentHash(hashContent);
    const filename = `${baseName}.${hash}.mjs`;
    const finalOutputPath = path2.join(binDir, filename);
    const finalResult = await compileHandler({
      sourcePath: cmd.sourcePath,
      outputPath: finalOutputPath,
      sourcemap: true,
      factoryType: cmd.factoryType,
      logFile
    });
    if (!finalResult.success) {
      errors.push(`Failed to compile ${cmd.sourcePath} with sourcemaps: ${finalResult.error}`);
      tryUnlink(tempOutputPath);
      continue;
    }
    tryUnlink(tempOutputPath);
    fs2.chmodSync(finalOutputPath, 493);
    compiled.push({
      info: cmd,
      filename,
      outputPath: finalOutputPath
    });
  }
  return { compiled, errors };
}
function generateSettings(config, compiled, binDir) {
  const compiledByKey = /* @__PURE__ */ new Map();
  for (const c of compiled) {
    const key = `${c.info.factoryType}:${c.info.name}`;
    compiledByKey.set(key, c);
  }
  const environments = {};
  for (const [envName, envConfig] of Object.entries(config.environments)) {
    const actions = [];
    for (const actionCmd of envConfig.actions) {
      const key = `${actionCmd.factoryType}:${actionCmd.actionName}`;
      const compiled2 = compiledByKey.get(key);
      const action = {
        id: actionCmd.id ?? slugify(actionCmd.actionName),
        name: actionCmd.actionName,
        command: generateCommand(actionCmd, compiled2, binDir)
      };
      if (actionCmd.description !== void 0) {
        action.description = actionCmd.description;
      }
      if (actionCmd.icon !== void 0) {
        action.icon = actionCmd.icon;
      }
      if (actionCmd.supportsBackgroundMode !== void 0) {
        action.supportsBackgroundMode = actionCmd.supportsBackgroundMode;
      }
      if (actionCmd.allowConcurrent !== void 0) {
        action.allowConcurrent = actionCmd.allowConcurrent;
      }
      actions.push(action);
    }
    let types;
    if (envConfig.types) {
      types = {};
      for (const [typeName, typeConfig] of Object.entries(envConfig.types)) {
        const typeDef = {
          version: typeConfig.version
        };
        if (typeConfig.validator) {
          const key = `${typeConfig.validator.factoryType}:${typeConfig.validator.typeName}`;
          const compiled2 = compiledByKey.get(key);
          typeDef.validator = generateCommand(typeConfig.validator, compiled2, binDir);
        }
        if (typeConfig.create) {
          const key = `${typeConfig.create.factoryType}:${typeConfig.create.typeName}`;
          const compiled2 = compiledByKey.get(key);
          typeDef.create = generateCommand(typeConfig.create, compiled2, binDir);
        }
        if (typeConfig.update) {
          const key = `${typeConfig.update.factoryType}:${typeConfig.update.typeName}`;
          const compiled2 = compiledByKey.get(key);
          typeDef.update = generateCommand(typeConfig.update, compiled2, binDir);
        }
        if (typeConfig.delete) {
          const key = `${typeConfig.delete.factoryType}:${typeConfig.delete.typeName}`;
          const compiled2 = compiledByKey.get(key);
          typeDef.delete = generateCommand(typeConfig.delete, compiled2, binDir);
        }
        types[typeName] = typeDef;
      }
    }
    environments[envName] = {
      version: envConfig.version ?? 1,
      actions
    };
    if (envConfig.description !== void 0) {
      environments[envName].description = envConfig.description;
    }
    if (types) {
      environments[envName].types = types;
    }
    if (envConfig.streams) {
      const streams = {};
      for (const [streamName, streamConfig] of Object.entries(envConfig.streams)) {
        const key = `${streamConfig.transform.factoryType}:${streamConfig.transform.streamType}`;
        const compiled2 = compiledByKey.get(key);
        streams[streamName] = generateStreamDefinition(streamConfig, compiled2, binDir);
      }
      environments[envName].streams = streams;
    }
  }
  return { environments };
}
function generateCommand(cmd, compiled, binDir) {
  let commandStr;
  if (compiled) {
    commandStr = generateCommandString(compiled.filename, binDir);
  } else {
    commandStr = `${cmd.factoryType}-placeholder.js`;
  }
  const command = { command: commandStr };
  if (cmd.timeout !== void 0) {
    command.timeout = cmd.timeout;
  }
  return command;
}
function generateStreamDefinition(streamConfig, compiled, binDir) {
  const streamDef = {
    version: streamConfig.version,
    transform: {
      path: compiled ? path2.posix.join(binDir, compiled.filename) : `${streamConfig.transform.factoryType}-${streamConfig.transform.streamType}.js`
    }
  };
  if (streamConfig.transform.timeout !== void 0) {
    streamDef.transform.timeout = streamConfig.transform.timeout;
  }
  if (streamConfig.transform.maxLineLength !== void 0) {
    streamDef.maxLineLength = streamConfig.transform.maxLineLength;
  }
  if (streamConfig.transform.maxStreamSize !== void 0) {
    streamDef.maxStreamSize = streamConfig.transform.maxStreamSize;
  }
  return streamDef;
}
function cleanupStaleFiles(settingsPath, binDir) {
  try {
    if (!fs2.existsSync(settingsPath)) {
      return;
    }
    const existingSettings = JSON.parse(fs2.readFileSync(settingsPath, "utf-8"));
    const previousFiles = existingSettings.__generated?.files ?? [];
    for (const filename of previousFiles) {
      tryUnlink(path2.join(binDir, filename));
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn("[cards-configuration] Failed to read previous settings for cleanup: %s", err.message);
    }
  }
}
async function build2(args) {
  try {
    const { loadConfig: loadConfig2 } = await Promise.resolve().then(() => (init_config_loader(), config_loader_exports));
    const loadResult = await loadConfig2(args.config);
    if (!loadResult.success) {
      return {
        success: false,
        error: loadResult.error
      };
    }
    const { config } = loadResult;
    const outdir = path2.resolve(args.outdir);
    const binDir = path2.join(outdir, "bin");
    const settingsPath = path2.join(outdir, "settings.json");
    if (fs2.existsSync(outdir) && fs2.statSync(outdir).isFile()) {
      return {
        success: false,
        error: `Output path "${args.outdir}" is a file, not a directory. The -o/--outdir argument should be a directory path (e.g., "dist"), not a file path.`
      };
    }
    fs2.mkdirSync(outdir, { recursive: true });
    cleanupStaleFiles(settingsPath, binDir);
    const commands = extractCommands(config);
    const { compiled, errors } = await compileHandlers(commands, binDir, args.log);
    if (errors.length > 0) {
      return {
        success: false,
        error: `Compilation errors:
${errors.join("\n")}`
      };
    }
    const settings = generateSettings(config, compiled, "bin");
    const uniqueFilenames = [...new Set(compiled.map((c) => c.filename))];
    const settingsWithMeta = {
      ...settings,
      __generated: {
        files: uniqueFilenames
      }
    };
    const tempPath = `${settingsPath}.tmp`;
    fs2.writeFileSync(tempPath, JSON.stringify(settingsWithMeta, null, 2), "utf-8");
    fs2.renameSync(tempPath, settingsPath);
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
async function main() {
  const { parseArgs: parseArgs2 } = await Promise.resolve().then(() => (init_args(), args_exports));
  const parseResult = parseArgs2(process.argv.slice(2));
  if (!parseResult.success) {
    console.error("Error:", parseResult.error);
    console.error("\nUsage: cards-configuration-v2 build -c <config> -o <outdir>");
    process.exit(1);
  }
  const buildResult = await build2(parseResult.args);
  if (!buildResult.success) {
    console.error("Build failed:", buildResult.error);
    process.exit(1);
  }
  console.log("Build successful!");
  console.log("Settings written to:", buildResult.settingsPath);
  if (buildResult.compiledHandlers.length > 0) {
    console.log("Compiled handlers:", buildResult.compiledHandlers.length);
  }
  process.exit(0);
}

// src/cli.ts
main();
