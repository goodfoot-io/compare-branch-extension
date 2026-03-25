#!/usr/bin/env -S node --enable-source-maps
import { createRequire as __createRequire } from "node:module";
import { fileURLToPath as __fileURLToPath } from "node:url";
import { dirname as __pathDirname } from "node:path";
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
if (!process.env['CLAUDE_CODE_HOOKS_LOG_FILE']) {
  process.env['CLAUDE_CODE_HOOKS_LOG_FILE'] = "/workspace/.cards/logs/claude-code-cards-runtime-hooks.log";
}

// src/session-start.ts
import { execFileSync as execFileSync2, spawn } from "node:child_process";
import { readFileSync as readFileSync5 } from "node:fs";
import { homedir as homedir3 } from "node:os";
import { dirname as dirname3, join as join4, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ../claude-code-sessions/src/index.ts
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// ../claude-code-sessions/src/internal.ts
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// ../claude-code-sessions/src/ipc.ts
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const code = error.code;
      if (code === "ESRCH") return false;
      if (code === "EPERM") return true;
    }
    throw error;
  }
}

// ../claude-code-sessions/src/internal.ts
function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
function hasErrnoCode(error, code) {
  return error instanceof Error && "code" in error && error.code === code;
}
function tryRemoveStaleLock(lockPath) {
  try {
    const lockContent = readFileSync(lockPath, "utf-8");
    const holderPid = Number.parseInt(lockContent.trim(), 10);
    if (!Number.isNaN(holderPid) && !isProcessAlive(holderPid)) {
      if (readFileSync(lockPath, "utf-8") === lockContent) {
        unlinkSync(lockPath);
        return true;
      }
    }
  } catch {
    try {
      unlinkSync(lockPath);
      return true;
    } catch {
    }
  }
  return false;
}
function writeLockHolderPid(lockPath) {
  const fd = openSync(lockPath, "wx", 384);
  try {
    writeFileSync(fd, String(process.pid));
  } finally {
    closeSync(fd);
  }
}
async function acquireLock(lockPath, timeoutMs) {
  const startTime = Date.now();
  const dir = dirname(lockPath);
  while (Date.now() - startTime < timeoutMs) {
    try {
      mkdirSync(dir, { recursive: true, mode: 448 });
      writeLockHolderPid(lockPath);
      return;
    } catch (error) {
      if (!hasErrnoCode(error, "EEXIST")) throw error;
      if (tryRemoveStaleLock(lockPath)) continue;
      const remaining = timeoutMs - (Date.now() - startTime);
      if (remaining > 0) {
        await sleep(Math.min(50, remaining));
      }
    }
  }
  throw new Error("Lock acquisition timeout");
}
function releaseLock(lockPath) {
  try {
    unlinkSync(lockPath);
  } catch (error) {
    if (!hasErrnoCode(error, "ENOENT")) throw error;
  }
}
function readRegistry(path, defaultValue) {
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (hasErrnoCode(error, "ENOENT")) return defaultValue;
    throw error;
  }
}
function writeRegistryLocked(registry, registryPath) {
  const dir = dirname(registryPath);
  mkdirSync(dir, { recursive: true, mode: 448 });
  const tempPath = `${registryPath}.tmp`;
  try {
    writeFileSync(tempPath, JSON.stringify(registry, null, 2), { mode: 384 });
    renameSync(tempPath, registryPath);
  } catch (error) {
    try {
      unlinkSync(tempPath);
    } catch {
    }
    throw error;
  }
}
async function executeTransaction(registryPath, lockPath, operation, pruner, defaultRegistry, lockTimeoutMs) {
  await acquireLock(lockPath, lockTimeoutMs ?? 2e3);
  try {
    const registry = readRegistry(registryPath, defaultRegistry);
    if (pruner) pruner(registry);
    const result = operation(registry);
    writeRegistryLocked(registry, registryPath);
    return result;
  } finally {
    releaseLock(lockPath);
  }
}

// ../claude-code-sessions/src/process-tree.ts
import { execSync } from "node:child_process";
var PROCESS_TREE_MAX_DEPTH = 10;
var CLAUDE_ARGS_PATTERN = /(^|\s|\/)claude(\/|\s|$)/i;
function isClaude(pid) {
  try {
    const args = execSync(`ps -p ${pid} -o args=`, { encoding: "utf8" }).trim();
    return CLAUDE_ARGS_PATTERN.test(args);
  } catch {
    return false;
  }
}
function getParentPid(pid) {
  try {
    const ppidStr = execSync(`ps -p ${pid} -o ppid=`, { encoding: "utf8" }).trim();
    const parentPid = Number.parseInt(ppidStr, 10);
    if (Number.isNaN(parentPid) || parentPid === pid) return null;
    return parentPid;
  } catch {
    return null;
  }
}
function findClaudePid(startPid) {
  const pids = findAllClaudePids(startPid);
  return pids[0] ?? null;
}
function findAllClaudePids(startPid) {
  const results = [];
  let pid = startPid ?? process.ppid;
  for (let depth = 0; depth < PROCESS_TREE_MAX_DEPTH; depth++) {
    if (pid <= 1) break;
    if (isClaude(pid)) {
      results.push(pid);
    }
    const parentPid = getParentPid(pid);
    if (parentPid === null) break;
    pid = parentPid;
  }
  return results;
}

// ../claude-code-sessions/src/index.ts
function getCardsDir() {
  return join(homedir(), ".cards");
}
var LOCK_TIMEOUT_MS = 2e3;
var MAX_ENTRY_AGE_MS = 24 * 60 * 60 * 1e3;
function getCardRepoPidsRegistryPath() {
  return join(getCardsDir(), "card-repo-commits", "pids.json");
}
function getCardRepoPidsLockPath() {
  return join(getCardsDir(), "card-repo-commits", "pids.lock");
}
async function registerSession(pid, sessionId) {
  await executeTransaction(
    getCardRepoPidsRegistryPath(),
    getCardRepoPidsLockPath(),
    (registry) => {
      registry.sessions[String(pid)] = {
        sessionId,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    },
    void 0,
    { sessions: {} },
    LOCK_TIMEOUT_MS
  );
}

// ../claude-code-sessions/src/card-repo.ts
import { appendFileSync, mkdirSync as mkdirSync2, readFileSync as readFileSync2, unlinkSync as unlinkSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { join as join2 } from "node:path";
function getCardRepoCommitsDir() {
  return join2(homedir2(), ".cards", "card-repo-commits");
}
function getSessionHeadShaPath(sessionId) {
  return join2(getCardRepoCommitsDir(), `${sessionId}.head`);
}
function writeSessionHeadSha(sessionId, sha) {
  mkdirSync2(getCardRepoCommitsDir(), { recursive: true, mode: 448 });
  writeFileSync2(getSessionHeadShaPath(sessionId), sha, { mode: 384 });
}

// ../sdk/src/config/env.ts
import { readFileSync as readFileSync3 } from "node:fs";
var CARDS_ENV_VARS = {
  /**
   * Unique identifier for the current card.
   * Available in all actions and type hooks.
   */
  CARD_ID: "CARD_ID",
  /**
   * The environment name from settings.json.
   * Available in all actions and type hooks.
   */
  ENVIRONMENT: "ENVIRONMENT",
  /**
   * Display name of the action button that triggered this handler.
   * Available in actions only (not type hooks).
   */
  ACTION_NAME: "ACTION_NAME",
  /**
   * Card's execution mode, determining UI interaction model.
   * Available in actions only (not type hooks).
   * Valid values: 'interactive' | 'background'
   */
  EXECUTION_MODE: "EXECUTION_MODE",
  /**
   * Cards server base URL for API calls.
   * Available in all actions and type hooks.
   */
  API_BASE_URL: "API_BASE_URL",
  /**
   * Authentication token for API calls.
   * Available in all actions and type hooks.
   */
  API_ACCESS_TOKEN: "API_ACCESS_TOKEN",
  /**
   * Configured coding agent identifier from cards.codingAgent setting.
   * Available in actions only (not type hooks).
   * Optional.
   */
  CODING_AGENT: "CODING_AGENT",
  /**
   * The registered type name.
   * Available in type hooks only.
   */
  TYPE_NAME: "TYPE_NAME",
  /**
   * The type's version string from settings.json configuration.
   * Available in type hooks only.
   */
  TYPE_VERSION: "TYPE_VERSION",
  /**
   * The file name within the type directory.
   * Available in type hooks only.
   */
  FILE_NAME: "FILE_NAME",
  /**
   * Full path to the file.
   * Available in type hooks only.
   */
  FILE_PATH: "FILE_PATH",
  /**
   * File size in bytes.
   * Available in type hooks only.
   */
  FILE_SIZE: "FILE_SIZE",
  /**
   * SHA256 hash of content.
   * Available in type hooks only.
   */
  SHA256: "SHA256",
  /**
   * MIME type of the content.
   * Available in type hooks only.
   */
  CONTENT_TYPE: "CONTENT_TYPE",
  /**
   * Path to the VS Code bundled Node.js interpreter.
   *
   * Set by the extension host from `process.execPath` (with
   * `ELECTRON_RUN_AS_NODE=1`). Commands in settings.json use
   * `$VSCODE_NODE ./bin/...` so they work regardless of
   * whether `node` is on the system PATH.
   *
   * Available in all actions and type hooks.
   */
  VSCODE_NODE: "VSCODE_NODE",
  /**
   * Path to the Node.js interpreter running the wrapper process.
   *
   * Set by the wrapper from `process.execPath`. Use `$NODE` in embedded
   * bash statements to invoke Node scripts portably.
   *
   * Available in all actions.
   */
  NODE: "NODE",
  /**
   * Path to the Unix domain socket for runtime-to-dispatcher communication.
   * Available in actions only.
   */
  SOCKET_PATH: "SOCKET_PATH",
  /**
   * Path to a JSON file containing switchToInteractive data from a previous handler.
   * Available in actions only. Optional.
   */
  SWITCH_TO_INTERACTIVE_DATA_PATH: "SWITCH_TO_INTERACTIVE_DATA_PATH",
  /**
   * Path to the settings configuration directory.
   * Available in actions only.
   */
  CONFIG_PATH: "CONFIG_PATH",
  /**
   * Path to the VS Code workspace root directory.
   * Set by the action handler (e.g., launch.ts) to the worktree path.
   * Available in hooks running inside the claude CLI.
   */
  WORKSPACE_PATH: "WORKSPACE_PATH",
  /**
   * Absolute path to the main git repository root (NOT a worktree).
   * Set by ActionDispatcher; consumed by the wrapper and watcher for
   * git operations (worktree removal, branch deletion) that must run
   * against the main repository.
   */
  REPO_ROOT: "REPO_ROOT",
  /**
   * Path to the card's repository directory.
   * Available in actions only.
   */
  CARD_REPO_PATH: "CARD_REPO_PATH",
  /**
   * Resolved shell command for the wrapper to spawn as the action handler.
   * Set by ActionDispatcher; consumed by the wrapper (not by action handlers).
   */
  ACTION_COMMAND: "ACTION_COMMAND",
  /**
   * Git branch that the card's workspace branch will merge into.
   * Resolved from the workspace HEAD at launch time.
   * Set by the launch action.
   * Available in actions only.
   */
  BASE_BRANCH: "BASE_BRANCH",
  /**
   * Git branch from which the card's workspace branch was created.
   * May differ from BASE_BRANCH when the worktree was created against
   * a different ref than the current workspace HEAD.
   * Set by the launch action.
   * Available in actions only.
   */
  PARENT_BRANCH: "PARENT_BRANCH",
  /**
   * Git branch name for the card's workspace implementation.
   * Set by the launch action after resolving or creating the worktree.
   * Available in actions only.
   */
  WORKSPACE_BRANCH: "WORKSPACE_BRANCH",
  /**
   * Session ID persisted by the session-start hook via `persistEnvVar`.
   *
   * Available in Bash tool shell descendants (commands, git hooks) after
   * session start. NOT available in hooks spawned directly by Claude Code
   * (stop, session-end, etc.) — those receive the session ID via hook input.
   *
   * The card-repo post-commit hook reads this to record commits directly
   * without needing a process-tree walk or PID registry lookup.
   */
  CARDS_SESSION_ID: "CARDS_SESSION_ID",
  /**
   * Absolute path to the VS Code extension installation directory.
   *
   * Set by the extension host from `context.extensionUri.fsPath` and injected
   * into all spawned action processes. Use this to locate bundled assets such
   * as the runtime plugin directory (`<extensionPath>/dist/plugins/runtime`).
   *
   * Available in actions only (not type hooks).
   */
  EXTENSION_PATH: "EXTENSION_PATH"
};
function getCardId() {
  const value = process.env[CARDS_ENV_VARS.CARD_ID];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CARD_ID}`);
  }
  return value;
}
function getEnvironment() {
  const value = process.env[CARDS_ENV_VARS.ENVIRONMENT];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.ENVIRONMENT}`);
  }
  return value;
}
function getActionName() {
  const value = process.env[CARDS_ENV_VARS.ACTION_NAME];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.ACTION_NAME}`);
  }
  return value;
}
function getExecutionMode() {
  const value = process.env[CARDS_ENV_VARS.EXECUTION_MODE];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.EXECUTION_MODE}`);
  }
  if (value !== "interactive" && value !== "background") {
    throw new Error(`Invalid ${CARDS_ENV_VARS.EXECUTION_MODE}: expected 'interactive' or 'background', got "${value}"`);
  }
  return value;
}
function getApiBaseUrl() {
  const value = process.env[CARDS_ENV_VARS.API_BASE_URL];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.API_BASE_URL}`);
  }
  return value;
}
function getApiAccessToken() {
  const value = process.env[CARDS_ENV_VARS.API_ACCESS_TOKEN];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.API_ACCESS_TOKEN}`);
  }
  return value;
}
function getCodingAgent() {
  const value = process.env[CARDS_ENV_VARS.CODING_AGENT];
  if (value === void 0 || value === "") {
    return void 0;
  }
  return value;
}
function getSwitchToInteractiveDataPath() {
  const value = process.env[CARDS_ENV_VARS.SWITCH_TO_INTERACTIVE_DATA_PATH];
  if (value === void 0 || value === "") {
    return void 0;
  }
  return value;
}
function getConfigPath() {
  const value = process.env[CARDS_ENV_VARS.CONFIG_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CONFIG_PATH}`);
  }
  return value;
}
function getRepoRoot() {
  const value = process.env[CARDS_ENV_VARS.REPO_ROOT];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.REPO_ROOT}`);
  }
  return value;
}
function getCardRepoPath() {
  const value = process.env[CARDS_ENV_VARS.CARD_REPO_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CARD_REPO_PATH}`);
  }
  return value;
}
function getExtensionPath() {
  const value = process.env[CARDS_ENV_VARS.EXTENSION_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.EXTENSION_PATH}`);
  }
  return value;
}
function readSwitchToInteractiveData() {
  const dataPath = getSwitchToInteractiveDataPath();
  if (dataPath === void 0) {
    return void 0;
  }
  const content = readFileSync3(dataPath, "utf-8");
  return JSON.parse(content);
}
function extractActionInput() {
  return {
    cardId: getCardId(),
    actionName: getActionName(),
    environment: getEnvironment(),
    executionMode: getExecutionMode(),
    apiBaseUrl: getApiBaseUrl(),
    apiAccessToken: getApiAccessToken(),
    codingAgent: getCodingAgent(),
    switchToInteractiveData: readSwitchToInteractiveData(),
    repoRoot: getRepoRoot(),
    cardRepoPath: getCardRepoPath(),
    configPath: getConfigPath(),
    extensionPath: getExtensionPath()
  };
}

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/env.js
import * as fs from "node:fs";
var CLAUDE_ENV_VARS = {
  /**
   * Absolute path to the project root directory where Claude Code was started.
   * Available in all hooks.
   */
  PROJECT_DIR: "CLAUDE_PROJECT_DIR",
  /**
   * Path to a file where SessionStart hooks can persist environment variables.
   * Variables written to this file will be available in all subsequent bash commands.
   * Only available in SessionStart hooks.
   */
  ENV_FILE: "CLAUDE_ENV_FILE",
  /**
   * Set to "true" when running in a remote (web) environment.
   * Not set or empty when running in local CLI environment.
   */
  REMOTE: "CLAUDE_CODE_REMOTE"
};
function getEnvFilePath() {
  return process.env[CLAUDE_ENV_VARS.ENV_FILE];
}
function persistEnvVar(name, value) {
  const envFile = getEnvFilePath();
  if (envFile === void 0) {
    throw new Error("persistEnvVar can only be used in SessionStart hooks. CLAUDE_ENV_FILE environment variable is not set.");
  }
  const escapedValue = escapeShellValue(value);
  const exportStatement = `export ${name}=${escapedValue}
`;
  fs.appendFileSync(envFile, exportStatement, "utf-8");
}
function persistEnvVars(vars) {
  for (const [name, value] of Object.entries(vars)) {
    persistEnvVar(name, value);
  }
}
function escapeShellValue(value) {
  const escaped = value.replace(/'/g, "'\\''");
  return `'${escaped}'`;
}

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/hooks.js
function createHookFunction(hookEventName, config, handler) {
  const hookFn = async (input, context) => {
    return await handler(input, context);
  };
  hookFn.hookEventName = hookEventName;
  hookFn.matcher = config.matcher;
  hookFn.timeout = config.timeout;
  return hookFn;
}
function sessionStartHook(config, handler) {
  return createHookFunction("SessionStart", config, handler);
}

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/logger.js
import { closeSync as closeSync2, existsSync, mkdirSync as mkdirSync3, openSync as openSync2, writeSync } from "node:fs";
import { dirname as dirname2 } from "node:path";
var LOG_LEVELS = ["debug", "info", "warn", "error"];
var Logger = class {
  /**
   * Registered event handlers by log level.
   */
  handlers = /* @__PURE__ */ new Map();
  /**
   * File descriptor for log file output.
   * Lazily initialized on first write.
   */
  logFileFd = null;
  /**
   * Path to the log file, if configured.
   */
  logFilePath = null;
  /**
   * Whether file initialization has been attempted.
   */
  fileInitialized = false;
  /**
   * Current hook context for enriching log events.
   */
  currentHookType;
  /**
   * Current hook input for enriching log events.
   */
  currentInput;
  /**
   * Creates a new Logger instance.
   *
   * Typically you should use the exported `logger` singleton rather than
   * creating new instances.
   * @param config - Optional configuration
   * @example
   * ```typescript
   * // Use singleton (recommended)
   * import { logger } from '@goodfoot/claude-code-hooks';
   *
   * // Or create custom instance
   * const customLogger = new Logger({ logFilePath: '/var/log/hooks.log' });
   * ```
   */
  constructor(config = {}) {
    for (const level of LOG_LEVELS) {
      this.handlers.set(level, /* @__PURE__ */ new Set());
    }
    this.logFilePath = config.logFilePath ?? (config.logEnvVar ? process.env[config.logEnvVar] : void 0) ?? null;
  }
  /**
   * Logs a debug message.
   *
   * Use for detailed debugging information that is typically only useful
   * during development or troubleshooting.
   * @param message - The debug message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.debug('Processing tool input', { toolName: 'Bash', inputSize: 256 });
   * ```
   */
  debug(message, context) {
    this.emit("debug", message, context);
  }
  /**
   * Logs an info message.
   *
   * Use for general operational events like hook invocations, successful
   * completions, or state changes.
   * @param message - The info message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.info('Session started', { source: 'startup', sessionId: 'abc123' });
   * ```
   */
  info(message, context) {
    this.emit("info", message, context);
  }
  /**
   * Logs a warning message.
   *
   * Use for conditions that may indicate issues but don't prevent
   * operation, such as deprecated patterns or performance concerns.
   * @param message - The warning message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.warn('Deprecated hook pattern detected', { pattern: 'legacyMatcher' });
   * ```
   */
  warn(message, context) {
    this.emit("warn", message, context);
  }
  /**
   * Logs an error message.
   *
   * Use for error conditions that require attention but were handled
   * gracefully. For exceptions, prefer {@link logError}.
   * @param message - The error message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.error('Failed to validate tool input', { toolName: 'Bash', reason: 'empty command' });
   * ```
   */
  error(message, context) {
    this.emit("error", message, context);
  }
  /**
   * Logs a structured error with full error details.
   *
   * Use this method when logging caught exceptions to capture the full
   * error context including name, message, stack trace, and cause chain.
   * @param error - The error to log
   * @param message - Human-readable description of what failed
   * @param context - Optional additional context
   * @example
   * ```typescript
   * try {
   *   await dangerousOperation();
   * } catch (err) {
   *   logger.logError(err, 'Failed to execute dangerous operation', {
   *     operation: 'delete',
   *     target: '/important/file.txt'
   *   });
   * }
   * ```
   */
  logError(error, message, context) {
    const errorInfo = this.extractErrorInfo(error);
    const event = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: "error",
      hookType: this.currentHookType,
      message,
      input: this.currentInput,
      error: errorInfo,
      context
    };
    this.deliverEvent(event);
  }
  /**
   * Subscribes a handler to log events at the specified level.
   *
   * The handler will be called for every log event at the specified level.
   * Returns an unsubscribe function that should be called when the handler
   * is no longer needed.
   * @param level - The log level to subscribe to
   * @param handler - The handler function to call for each event
   * @returns A function to unsubscribe the handler
   * @example
   * ```typescript
   * // Subscribe to error events
   * const unsubscribe = logger.on('error', (event) => {
   *   console.error(`[${event.hookType}] ${event.message}`);
   *   if (event.error) {
   *     console.error(event.error.stack);
   *   }
   * });
   *
   * // Later, clean up
   * unsubscribe();
   * ```
   * @example
   * ```typescript
   * // Forward to external logging library
   * import pino from 'pino';
   * const pinoLogger = pino();
   *
   * logger.on('info', (event) => pinoLogger.info(event, event.message));
   * logger.on('warn', (event) => pinoLogger.warn(event, event.message));
   * logger.on('error', (event) => pinoLogger.error(event, event.message));
   * ```
   */
  on(level, handler) {
    const levelHandlers = this.handlers.get(level);
    if (levelHandlers) {
      levelHandlers.add(handler);
    }
    return () => {
      levelHandlers?.delete(handler);
    };
  }
  /**
   * Sets the current hook context for enriching log events.
   *
   * This is called internally by the runtime before invoking hook handlers.
   * You typically don't need to call this directly.
   * @param hookType - The type of hook being executed
   * @param input - The hook input data
   * @internal
   */
  setContext(hookType, input) {
    this.currentHookType = hookType;
    this.currentInput = input;
  }
  /**
   * Clears the current hook context.
   *
   * Called internally by the runtime after hook execution completes.
   * @internal
   */
  clearContext() {
    this.currentHookType = void 0;
    this.currentInput = void 0;
  }
  /**
   * Configures the log file path at runtime.
   *
   * Call this to enable or change file logging. Setting to `null` disables
   * file logging (but doesn't close existing file handle immediately).
   * @param filePath - Path to the log file, or null to disable
   * @example
   * ```typescript
   * // Enable file logging at runtime
   * logger.setLogFile('/var/log/claude-hooks.log');
   *
   * // Disable file logging
   * logger.setLogFile(null);
   * ```
   */
  setLogFile(filePath) {
    if (this.logFileFd !== null) {
      try {
        closeSync2(this.logFileFd);
      } catch (closeError) {
        process.stderr.write(`[claude-code-hooks] Failed to close log file: ${String(closeError)}
`);
      }
      this.logFileFd = null;
    }
    this.logFilePath = filePath;
    this.fileInitialized = false;
  }
  /**
   * Closes all resources held by the logger.
   *
   * Call this during graceful shutdown to ensure all log data is flushed.
   * @example
   * ```typescript
   * process.on('exit', () => {
   *   logger.close();
   * });
   * ```
   */
  close() {
    if (this.logFileFd !== null) {
      try {
        closeSync2(this.logFileFd);
      } catch (closeError) {
        process.stderr.write(`[claude-code-hooks] Failed to close log file: ${String(closeError)}
`);
      }
      this.logFileFd = null;
    }
    this.fileInitialized = false;
  }
  /**
   * Checks if there are any active handlers or destinations.
   *
   * Returns true if any handlers are registered or file logging is enabled.
   * @returns Whether the logger has any active output destinations
   */
  hasDestinations() {
    for (const handlers of this.handlers.values()) {
      if (handlers.size > 0)
        return true;
    }
    return this.logFilePath !== null;
  }
  // ============================================================================
  // Private Methods
  // ============================================================================
  /**
   * Emits a log event.
   * @param level - The severity level of the event
   * @param message - The log message
   * @param context - Optional additional context data
   */
  emit(level, message, context) {
    const event = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      hookType: this.currentHookType,
      message,
      input: this.currentInput,
      context
    };
    this.deliverEvent(event);
  }
  /**
   * Delivers an event to all registered destinations.
   * @param event - The log event to deliver
   */
  deliverEvent(event) {
    const levelHandlers = this.handlers.get(event.level);
    if (levelHandlers) {
      for (const handler of levelHandlers) {
        try {
          handler(event);
        } catch (handlerError) {
          process.stderr.write(`[claude-code-hooks] Log handler error: ${String(handlerError)}
`);
        }
      }
    }
    this.writeToFile(event);
  }
  /**
   * Writes an event to the log file.
   * @param event - The log event to write
   */
  writeToFile(event) {
    if (!this.logFilePath)
      return;
    if (!this.fileInitialized) {
      this.initializeFile();
    }
    if (this.logFileFd === null)
      return;
    try {
      const line = `${JSON.stringify(event)}
`;
      writeSync(this.logFileFd, line);
    } catch (writeError) {
      this.logFileFd = null;
      this.fileInitialized = false;
      process.stderr.write(`[claude-code-hooks] Log file write failed: ${String(writeError)}
`);
    }
  }
  /**
   * Initializes the log file for writing.
   */
  initializeFile() {
    this.fileInitialized = true;
    if (!this.logFilePath)
      return;
    try {
      const dir = dirname2(this.logFilePath);
      if (!existsSync(dir)) {
        mkdirSync3(dir, { recursive: true });
      }
      this.logFileFd = openSync2(this.logFilePath, "a");
    } catch {
      this.logFileFd = null;
    }
  }
  /**
   * Extracts structured error information from an unknown error.
   * @param error - The error to extract information from
   * @returns Structured error information
   */
  extractErrorInfo(error) {
    if (error instanceof Error) {
      const info = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
      if (error.cause !== void 0) {
        info.cause = this.extractErrorInfo(error.cause);
      }
      return info;
    }
    return {
      name: "UnknownError",
      message: String(error)
    };
  }
};
var logger = new Logger({
  logEnvVar: process.env.CLAUDE_CODE_HOOKS_LOG_ENV_VAR ?? "CLAUDE_CODE_HOOKS_LOG_FILE"
});

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/outputs.js
var EXIT_CODES = {
  /** Handler completed successfully. Claude Code parses stdout as JSON. */
  SUCCESS: 0,
  /** Non-blocking error occurred (e.g., invalid input). stderr shown to user only. */
  ERROR: 1,
  /** Handler threw exception OR blocking action requested. stderr shown to Claude. */
  BLOCK: 2
};
function createHookSpecificOutputBuilder(hookType) {
  return (options = {}) => {
    const { hookSpecificOutput, ...rest } = options;
    const stdout = hookSpecificOutput !== void 0 ? { ...rest, hookSpecificOutput: { hookEventName: hookType, ...hookSpecificOutput } } : rest;
    return { _type: hookType, stdout };
  };
}
var sessionStartOutput = /* @__PURE__ */ createHookSpecificOutputBuilder("SessionStart");

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/runtime.js
async function readStdin() {
  return new Promise((resolve2, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      chunks.push(chunk);
    });
    process.stdin.on("end", () => {
      resolve2(chunks.join(""));
    });
    process.stdin.on("error", (error) => {
      reject(error);
    });
  });
}
function parseStdinInput(stdinContent) {
  const rawInput = JSON.parse(stdinContent);
  return rawInput;
}
function writeStdout(output) {
  process.stdout.write(JSON.stringify(output));
}
function createMalformedInputOutput(error) {
  logger.error(`Invalid JSON input: ${error instanceof Error ? error.message : String(error)}`);
  return { stdout: {} };
}
function handleHandlerError(error) {
  if (error instanceof Error) {
    process.stderr.write(`${error.stack ?? error.message}
`);
  } else {
    process.stderr.write(`${String(error)}
`);
  }
  logger.error(`Hook handler error: ${error instanceof Error ? error.message : String(error)}`);
  logger.clearContext();
  logger.close();
  process.exit(EXIT_CODES.BLOCK);
}
function convertToHookOutput(specificOutput) {
  const { stdout, stderr } = specificOutput;
  return stderr !== void 0 ? { stdout, stderr } : { stdout };
}
async function execute(hookFn) {
  let output;
  try {
    let stdinContent;
    try {
      stdinContent = await readStdin();
    } catch (error) {
      logger.logError(error, "Failed to read stdin");
      output = createMalformedInputOutput(error);
      return;
    }
    let input;
    try {
      input = parseStdinInput(stdinContent);
    } catch (error) {
      logger.logError(error, "Failed to parse stdin JSON");
      output = createMalformedInputOutput(error);
      return;
    }
    const hookEventName = hookFn.hookEventName;
    logger.setContext(hookEventName, input);
    const context = hookEventName === "SessionStart" ? { logger, persistEnvVar, persistEnvVars } : { logger };
    try {
      const specificOutput = await hookFn(input, context);
      output = convertToHookOutput(specificOutput);
    } catch (error) {
      handleHandlerError(error);
    }
  } finally {
    if (output !== void 0) {
      writeStdout(output.stdout);
    }
    logger.clearContext();
    logger.close();
    if (output?.stderr !== void 0) {
      process.stderr.write(output.stderr);
      process.exit(EXIT_CODES.BLOCK);
    }
    process.exit(EXIT_CODES.SUCCESS);
  }
}

// src/lib/context.ts
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync as readFileSync4, statSync } from "node:fs";
import { join as join3 } from "node:path";

// ../sdk/src/protocol/types/branch.ts
var WORKSPACE_BRANCHES_FILE = "workspace-branches.json";
var WORKSPACE_COMMITS_FILE = "workspace-commits.csv";

// src/lib/file-tree.ts
function createNode() {
  return { children: /* @__PURE__ */ new Map(), isFile: false };
}
function insertPath(root, path) {
  let node = root;
  const segments = path.split("/");
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    let child = node.children.get(seg);
    if (!child) {
      child = createNode();
      node.children.set(seg, child);
    }
    node = child;
  }
  node.isFile = true;
}
function renderNode(node, indent) {
  const lines = [];
  const prefix = " ".repeat(indent);
  const dirs = [];
  const files = [];
  for (const [name, child] of node.children) {
    if (child.isFile && child.children.size === 0) {
      files.push([name, child]);
    } else if (child.isFile && child.children.size > 0) {
      files.push([name, createNode()]);
      dirs.push([name, child]);
    } else {
      dirs.push([name, child]);
    }
  }
  dirs.sort(([a], [b]) => a.localeCompare(b));
  files.sort(([a], [b]) => a.localeCompare(b));
  for (const [name, child] of dirs) {
    let collapsed = name;
    let current = child;
    while (current.children.size === 1 && !current.isFile) {
      const [nextName, nextChild] = current.children.entries().next().value;
      collapsed += `/${nextName}`;
      current = nextChild;
    }
    if (current.isFile && current.children.size === 0) {
      lines.push(`${prefix}${collapsed}`);
    } else {
      lines.push(`${prefix}${collapsed}/`);
      lines.push(renderNode(current, indent + 2));
    }
  }
  for (const [name] of files) {
    lines.push(`${prefix}${name}`);
  }
  return lines.filter(Boolean).join("\n");
}
function formatFileTree(paths) {
  if (paths.length === 0) return "";
  const root = createNode();
  for (const p of paths) {
    if (p) insertPath(root, p);
  }
  return renderNode(root, 1);
}
function formatCommitLog(rawLog, separator) {
  if (!rawLog.trim()) return "";
  if (separator === "nul") {
    return formatNulDelimited(rawLog);
  }
  return formatBlankLineDelimited(rawLog);
}
function formatNulDelimited(raw) {
  const commits = raw.split("\0").filter((s) => s.trim());
  return commits.map((commit) => formatSingleCommit(commit.trim())).join("\n\n");
}
function formatBlankLineDelimited(raw) {
  const lines = raw.split("\n");
  const commitBlocks = [];
  let current = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === "" && current.length > 0) {
      const next = lines[i + 1];
      if (next && isCommitHeader(next)) {
        commitBlocks.push(current);
        current = [];
        continue;
      }
    }
    current.push(line);
  }
  if (current.length > 0) commitBlocks.push(current);
  return commitBlocks.map((block) => formatSingleCommit(block.join("\n").trim())).join("\n\n");
}
function isCommitHeader(line) {
  return /^[0-9a-f]{7,} - /.test(line);
}
function formatSingleCommit(block) {
  const lines = block.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return "";
  const header = lines[0];
  const files = lines.slice(1);
  if (files.length === 0) return header;
  const tree = formatFileTree(files);
  return tree ? `${header}
${tree}` : header;
}

// src/lib/context.ts
var CardRepoAccessError = class extends Error {
  constructor(repoPath, cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Cannot read card repository at ${repoPath}: ${reason}`);
    this.repoPath = repoPath;
    this.cause = cause;
  }
  name = "CardRepoAccessError";
  /**
   * Builds a user-facing system message explaining the card repo access failure.
   *
   * @param actor - Human-readable noun for the failing entity (e.g. "session", "subagent").
   * @returns Object with `systemMessage` and `stopReason` strings.
   */
  toHookFailure(actor) {
    return {
      systemMessage: [
        `The card repository at '${this.repoPath}' is not accessible.`,
        "",
        `Error: ${this.message}`,
        "",
        `This ${actor} cannot proceed without a valid card repository. To resolve:`,
        `1. Verify the card repository directory exists at: ${this.repoPath}`,
        "2. Ensure the current process has read permissions for the directory and its contents",
        "3. Check that the CARD_REPO_PATH environment variable points to a valid card repository"
      ].join("\n"),
      stopReason: `Card repository inaccessible at ${this.repoPath}: ${this.message}`
    };
  }
};
function readCardMeta(rootPath) {
  try {
    const raw = readFileSync4(join3(rootPath, "CARD.meta.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const gates = parsed["gates"];
    return {
      id: String(parsed["id"] ?? ""),
      title: String(parsed["title"] ?? ""),
      status: String(parsed["status"] ?? ""),
      gates: {
        planRequired: gates?.["planRequired"] === true,
        planApproved: gates?.["planApproved"] === true,
        mergeRequestRequired: gates?.["mergeRequestRequired"] === true,
        mergeApproved: gates?.["mergeApproved"] === true
      }
    };
  } catch {
    return null;
  }
}
function buildCardBlock(actionInput) {
  const meta = readCardMeta(actionInput.cardRepoPath);
  const id = meta?.id || actionInput.cardId;
  const title = meta?.title || "";
  const status = meta?.status || "";
  const gatesLine = meta ? `gates: planRequired=${meta.gates.planRequired} planApproved=${meta.gates.planApproved} mergeRequestRequired=${meta.gates.mergeRequestRequired} mergeApproved=${meta.gates.mergeApproved}` : "";
  const workspaceBranch = process.env[CARDS_ENV_VARS.WORKSPACE_BRANCH];
  const baseBranch = process.env[CARDS_ENV_VARS.BASE_BRANCH];
  const workspacePath = process.env[CARDS_ENV_VARS.WORKSPACE_PATH];
  const envLines = [`  CARD_REPO_PATH=${actionInput.cardRepoPath}`];
  if (workspacePath) envLines.push(`  WORKSPACE_PATH=${workspacePath}`);
  if (baseBranch) envLines.push(`  BASE_BRANCH=${baseBranch}`);
  if (workspaceBranch) envLines.push(`  WORKSPACE_BRANCH=${workspaceBranch}`);
  const bodyLines = [];
  if (title) bodyLines.push(`title: ${title}`);
  bodyLines.push("");
  if (gatesLine) bodyLines.push(gatesLine);
  bodyLines.push("env:");
  bodyLines.push(...envLines);
  const attrs = [`id="${id}"`, `status="${status}"`, `mode="${actionInput.executionMode}"`];
  return `<card ${attrs.join(" ")}>
${bodyLines.join("\n")}
</card>`;
}
function formatTimestamp(mtimeMs) {
  const d = new Date(mtimeMs);
  const iso = d.toISOString();
  return `${iso.slice(0, 16)}Z`;
}
function dirStats(dirPath) {
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    let count = 0;
    let latest = 0;
    for (const entry of entries) {
      if (entry.isFile()) {
        count++;
        try {
          const mt = statSync(join3(dirPath, entry.name)).mtimeMs;
          if (mt > latest) latest = mt;
        } catch {
        }
      }
    }
    return [count, latest];
  } catch {
    return [0, 0];
  }
}
function buildCardRepoBlock(rootPath) {
  let entries;
  try {
    entries = readdirSync(rootPath, { withFileTypes: true }).map((d) => ({
      name: d.name.toString(),
      isDir: d.isDirectory()
    }));
  } catch (error) {
    throw new CardRepoAccessError(rootPath, error);
  }
  const lines = [];
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const fullPath = join3(rootPath, entry.name);
    if (entry.isDir) {
      if (entry.name === "streams") {
        lines.push("streams/");
        try {
          const streamEntries = readdirSync(fullPath, { withFileTypes: true });
          for (const sub of streamEntries) {
            if (sub.isDirectory()) {
              const subName = sub.name.toString();
              const [count, latest] = dirStats(join3(fullPath, subName));
              const ts = latest > 0 ? `   latest ${formatTimestamp(latest)}` : "";
              lines.push(`${`  ${subName}/`.padEnd(24)}${count} files${ts}`);
            }
          }
        } catch {
        }
      } else {
        const [count, latest] = dirStats(fullPath);
        const ts = latest > 0 ? `   latest ${formatTimestamp(latest)}` : "";
        lines.push(`${`${entry.name}/`.padEnd(24)}${count} files${ts}`);
      }
    } else {
      try {
        const mt = statSync(fullPath).mtimeMs;
        lines.push(`${entry.name}`.padEnd(24) + formatTimestamp(mt));
      } catch {
        lines.push(entry.name);
      }
    }
  }
  return `<card-repo>
${lines.join("\n")}
</card-repo>`;
}
var MAX_CARD_REPO_LOG_COMMITS = 5;
function buildCardRepoLogBlock(rootPath) {
  try {
    const log = execFileSync(
      "git",
      [
        "log",
        `-${MAX_CARD_REPO_LOG_COMMITS}`,
        "--pretty=format:%x00%h - %an: %s",
        "--name-only",
        "--",
        ".",
        ":!streams/",
        ":!.gitignore",
        `:!${WORKSPACE_BRANCHES_FILE}`,
        `:!${WORKSPACE_COMMITS_FILE}`
      ],
      {
        cwd: rootPath,
        encoding: "utf-8",
        timeout: 5e3,
        stdio: ["pipe", "pipe", "pipe"]
      }
    ).trim();
    if (!log) return null;
    const formatted = formatCommitLog(log, "nul");
    if (!formatted) return null;
    let totalCount = null;
    try {
      const countStr = execFileSync("git", ["rev-list", "--count", "HEAD"], {
        cwd: rootPath,
        encoding: "utf-8",
        timeout: 5e3,
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
      totalCount = parseInt(countStr, 10);
      if (Number.isNaN(totalCount)) totalCount = null;
    } catch {
    }
    const countAttr = totalCount !== null ? ` count="${totalCount}"` : "";
    return `<card-repo-log${countAttr}>
${formatted}
</card-repo-log>`;
  } catch {
    return null;
  }
}
var MAX_WORKSPACE_COMMITS_PER_BRANCH = 5;
function readWorkspaceData(cardRepoPath) {
  const branches = {};
  let commits = [];
  try {
    const raw = readFileSync4(join3(cardRepoPath, WORKSPACE_BRANCHES_FILE), "utf-8");
    const parsed = JSON.parse(raw);
    for (const [name, meta] of Object.entries(parsed)) {
      if (meta && typeof meta === "object") {
        branches[name] = {
          parentBranch: typeof meta.parentBranch === "string" ? meta.parentBranch : void 0,
          addedAt: typeof meta.addedAt === "string" ? meta.addedAt : ""
        };
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      return null;
    }
  }
  try {
    const raw = readFileSync4(join3(cardRepoPath, WORKSPACE_COMMITS_FILE), "utf-8");
    commits = raw.split("\n").map((l) => l.trim()).filter((s) => s.length > 0);
  } catch (error) {
    if (error.code !== "ENOENT") {
      return null;
    }
  }
  if (Object.keys(branches).length === 0 && commits.length === 0) {
    return null;
  }
  return { branches, commits };
}
function getReachableShas(workspacePath, ref) {
  try {
    const output = execFileSync("git", ["log", "--format=%H", ref], {
      cwd: workspacePath,
      encoding: "utf-8",
      timeout: 1e4,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    return new Set(output ? output.split("\n") : []);
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function filterResolvableShas(workspacePath, shas) {
  if (shas.length === 0) return [];
  try {
    const output = execFileSync("git", ["cat-file", "--batch-check"], {
      input: `${shas.join("\n")}
`,
      cwd: workspacePath,
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const lines = output.split("\n");
    const resolvable = [];
    for (let i = 0; i < lines.length && i < shas.length; i++) {
      if (!lines[i].includes("missing")) {
        resolvable.push(shas[i]);
      }
    }
    return resolvable;
  } catch {
    return [];
  }
}
function resolveWorkspaceCommitDetails(workspacePath, shas) {
  if (shas.length === 0) return null;
  try {
    const output = execFileSync("git", ["log", "--no-walk", "--pretty=format:%h - %s", "--name-only", ...shas], {
      cwd: workspacePath,
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    if (!output) return null;
    return formatCommitLog(output, "blank-line") || null;
  } catch {
    return null;
  }
}
function buildWorkspaceRepoLogBlocks(workspacePath, cardRepoPath) {
  const workspace = readWorkspaceData(cardRepoPath);
  if (!workspace) return [];
  const baseBranch = process.env[CARDS_ENV_VARS.BASE_BRANCH] ?? "main";
  const sortedBranches = Object.entries(workspace.branches).sort(([, a], [, b]) => a.addedAt.localeCompare(b.addedAt));
  const reachableFromTracked = /* @__PURE__ */ new Set();
  const groups = [];
  for (const [name, meta] of sortedBranches) {
    const reachable = getReachableShas(workspacePath, name);
    const branchShas = workspace.commits.filter((sha) => reachable.has(sha));
    for (const sha of branchShas) reachableFromTracked.add(sha);
    if (branchShas.length > 0) {
      groups.push({ branchName: name, parentBranch: meta.parentBranch, shas: branchShas });
    }
  }
  const baseReachable = getReachableShas(workspacePath, baseBranch);
  const baseShas = workspace.commits.filter((sha) => baseReachable.has(sha) && !reachableFromTracked.has(sha));
  if (baseShas.length > 0) {
    groups.push({ branchName: baseBranch, shas: baseShas });
  }
  const orphanedShas = workspace.commits.filter((sha) => !reachableFromTracked.has(sha) && !baseReachable.has(sha));
  const resolvable = filterResolvableShas(workspacePath, orphanedShas);
  if (resolvable.length > 0) {
    groups.push({ branchName: "", shas: resolvable, orphaned: true });
  }
  const printedShas = /* @__PURE__ */ new Set();
  const blocks = [];
  for (const group of groups) {
    const newShas = group.shas.filter((sha) => !printedShas.has(sha));
    const dupShas = group.shas.filter((sha) => printedShas.has(sha));
    const displayShas = newShas.slice(-MAX_WORKSPACE_COMMITS_PER_BRANCH);
    const details = resolveWorkspaceCommitDetails(workspacePath, displayShas);
    if (details) {
      for (const sha of displayShas) printedShas.add(sha);
    }
    const bodyParts = [];
    if (details) bodyParts.push(details);
    if (dupShas.length > 0) {
      bodyParts.push(dupShas.map((sha) => sha.slice(0, 7)).join("\n"));
    }
    if (bodyParts.length === 0) continue;
    const attrs = [];
    if (group.orphaned) {
      attrs.push('orphaned="true"');
    } else {
      attrs.push(`branch="${group.branchName}"`);
      if (group.parentBranch) attrs.push(`parentBranch="${group.parentBranch}"`);
    }
    attrs.push(`count="${group.shas.length}"`);
    blocks.push(`<workspace-repo-log ${attrs.join(" ")}>
${bodyParts.join("\n")}
</workspace-repo-log>`);
  }
  return blocks;
}
function buildAdditionalContext(actionInput) {
  const cardBlock = buildCardBlock(actionInput);
  const repoBlock = buildCardRepoBlock(actionInput.cardRepoPath);
  const logBlock = buildCardRepoLogBlock(actionInput.cardRepoPath);
  const workspaceLogBlocks = buildWorkspaceRepoLogBlocks(actionInput.repoRoot, actionInput.cardRepoPath);
  const parts = [cardBlock, repoBlock];
  if (logBlock) parts.push(logBlock);
  parts.push(...workspaceLogBlocks);
  return parts.join("\n\n");
}

// src/session-start.ts
var SessionRegistrationError = class extends Error {
  constructor(pid, sessionId, cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to register PID ${pid} for session ${sessionId}: ${reason}`);
    this.pid = pid;
    this.sessionId = sessionId;
    this.cause = cause;
  }
  name = "SessionRegistrationError";
};
function resolveHeadSha(repoPath) {
  try {
    return execFileSync2("git", ["rev-parse", "HEAD"], {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
  } catch {
    return null;
  }
}
function spawnTranscriptWatcher(pid, sessionId, transcriptPath, cardId, cardRepoPath) {
  const watcherPath = resolve(dirname3(fileURLToPath(import.meta.url)), "../../bin/transcript-watcher.mjs");
  let nodeBin;
  try {
    nodeBin = process.env["VSCODE_NODE"] ?? readFileSync5(join4(homedir3(), ".cards", "VSCODE_NODE"), "utf-8").trim();
  } catch {
    nodeBin = "node";
  }
  const spawnArgs = [watcherPath, String(pid), sessionId, transcriptPath, cardId, cardRepoPath];
  const child = spawn(nodeBin, spawnArgs, {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}
async function registerPidAndSpawnWatcher(claudePid, sessionId, transcriptPath, actionInput, logger2) {
  try {
    await registerSession(claudePid, sessionId);
    logger2.info("Registered PID for commit attribution", { pid: claudePid, sessionId });
  } catch (cause) {
    const error = new SessionRegistrationError(claudePid, sessionId, cause);
    logger2.error("Session registration failed", { pid: error.pid, sessionId: error.sessionId, error: error.message });
    return sessionStartOutput({
      continue: false,
      systemMessage: [
        `Session registration failed for PID ${error.pid} (session ${error.sessionId}).`,
        "",
        `Error: ${error.message}`,
        "",
        "Commit attribution requires a valid PID-to-session mapping. To resolve:",
        "1. Verify the session registry is accessible and not locked by another process",
        "2. Ensure sufficient disk space for the session registry file",
        `3. Check that the Claude process (PID ${String(error.pid)}) is still running`
      ].join("\n"),
      stopReason: `Session registration failed: ${error.message}`
    });
  }
  try {
    spawnTranscriptWatcher(claudePid, sessionId, transcriptPath, actionInput.cardId, actionInput.cardRepoPath);
    logger2.info("Spawned transcript watcher", { pid: claudePid, sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger2.warn("Transcript watcher spawn failed", { error: message });
  }
  return null;
}
var CARDS_SESSION_ID_ENV = "CARDS_SESSION_ID";
var session_start_default = sessionStartHook({}, async (input, { logger: logger2, persistEnvVar: persistEnvVar2 }) => {
  let actionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger2.error("Not running inside an action subprocess", { error: message });
    return sessionStartOutput({
      systemMessage: "SessionStart hook: not running inside an action subprocess."
    });
  }
  persistEnvVar2(CARDS_SESSION_ID_ENV, input.session_id);
  logger2.info("Persisted session ID to environment", { sessionId: input.session_id });
  const headSha = resolveHeadSha(actionInput.cardRepoPath);
  if (headSha) {
    writeSessionHeadSha(input.session_id, headSha);
    logger2.info("Stored git HEAD sha", { headSha, repoPath: actionInput.cardRepoPath });
  } else {
    logger2.warn("Could not resolve git HEAD sha", { repoPath: actionInput.cardRepoPath });
  }
  const claudePid = findClaudePid();
  if (claudePid) {
    const failure = await registerPidAndSpawnWatcher(
      claudePid,
      input.session_id,
      input.transcript_path,
      actionInput,
      logger2
    );
    if (failure) return failure;
  } else {
    logger2.error("Could not find Claude PID for commit attribution", {
      sessionId: input.session_id,
      ppid: process.ppid
    });
    return sessionStartOutput({
      continue: false,
      systemMessage: [
        "Could not locate the Claude Code process in the ancestor chain.",
        "",
        `Session: ${input.session_id}`,
        `Hook PPID: ${process.ppid}`,
        "",
        "Commit attribution and transcript monitoring require a valid Claude PID.",
        "This is a fatal error when running inside an action subprocess (CARD_ID is set).",
        "",
        "To resolve:",
        '1. Ensure Claude Code is running as a process named "claude"',
        "2. Check that `ps` can see ancestor processes (no PID namespace isolation)",
        "3. Verify the process tree depth is within the allowed limit"
      ].join("\n"),
      stopReason: `Could not find Claude PID (ppid=${process.ppid}, session=${input.session_id})`
    });
  }
  logger2.info("Action subprocess confirmed", {
    cardId: actionInput.cardId,
    actionName: actionInput.actionName,
    environment: actionInput.environment,
    executionMode: actionInput.executionMode
  });
  let systemMessage;
  try {
    systemMessage = buildAdditionalContext(actionInput);
  } catch (error) {
    if (error instanceof CardRepoAccessError) {
      logger2.error("Card repo inaccessible", { repoPath: error.repoPath, error: error.message });
      return sessionStartOutput({
        continue: false,
        ...error.toHookFailure("session")
      });
    }
    throw error;
  }
  return sessionStartOutput({
    systemMessage,
    hookSpecificOutput: {
      additionalContext: systemMessage
    }
  });
});

// src/session-start-entry.ts
execute(session_start_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3Nlc3Npb24tc3RhcnQudHMiLCAiLi4vY2xhdWRlLWNvZGUtc2Vzc2lvbnMvc3JjL2luZGV4LnRzIiwgIi4uL2NsYXVkZS1jb2RlLXNlc3Npb25zL3NyYy9pbnRlcm5hbC50cyIsICIuLi9jbGF1ZGUtY29kZS1zZXNzaW9ucy9zcmMvaXBjLnRzIiwgIi4uL2NsYXVkZS1jb2RlLXNlc3Npb25zL3NyYy9wcm9jZXNzLXRyZWUudHMiLCAiLi4vY2xhdWRlLWNvZGUtc2Vzc2lvbnMvc3JjL2NhcmQtcmVwby50cyIsICIuLi9zZGsvc3JjL2NvbmZpZy9lbnYudHMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2Vudi5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvaG9va3MuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2xvZ2dlci5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3Qvb3V0cHV0cy5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvcnVudGltZS5qcyIsICJzcmMvbGliL2NvbnRleHQudHMiLCAiLi4vc2RrL3NyYy9wcm90b2NvbC90eXBlcy9icmFuY2gudHMiLCAic3JjL2xpYi9maWxlLXRyZWUudHMiLCAic3JjL3Nlc3Npb24tc3RhcnQtZW50cnkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU2Vzc2lvblN0YXJ0IGhvb2sgaW1wbGVtZW50YXRpb24uXG4gKlxuICogUnVucyBhcyBhIHN1YnByb2Nlc3Mgb2YgYW4gYWN0aW9uLiBVc2VzIHtAbGluayBleHRyYWN0QWN0aW9uSW5wdXR9IHRvXG4gKiBjb25maXJtIHdlIGFyZSBpbnNpZGUgYW4gYWN0aW9uIHN1YnByb2Nlc3MgYW5kIHRvIGV4cG9zZSB0aGUgYWN0aW9uXG4gKiBwcm9jZXNzIGVudmlyb25tZW50IHZhcmlhYmxlcyB0byB0aGUgc2Vzc2lvbiBjb250ZXh0LlxuICpcbiAqIEBzdW1tYXJ5IFNlc3Npb25TdGFydCBob29rIGltcGxlbWVudGF0aW9uXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbnN0YXJ0XG4gKi9cblxuaW1wb3J0IHsgZXhlY0ZpbGVTeW5jLCBzcGF3biB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdub2RlOm9zJztcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4sIHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJztcbmltcG9ydCB7IGZpbmRDbGF1ZGVQaWQsIHJlZ2lzdGVyU2Vzc2lvbiB9IGZyb20gJ0BjYXJkcy9jbGF1ZGUtY29kZS1zZXNzaW9ucyc7XG5pbXBvcnQgeyB3cml0ZVNlc3Npb25IZWFkU2hhIH0gZnJvbSAnQGNhcmRzL2NsYXVkZS1jb2RlLXNlc3Npb25zL2NhcmQtcmVwbyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbklucHV0IH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgZXh0cmFjdEFjdGlvbklucHV0IH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgc2Vzc2lvblN0YXJ0SG9vaywgc2Vzc2lvblN0YXJ0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbmltcG9ydCB7XG4gIGJ1aWxkQWRkaXRpb25hbENvbnRleHQsXG4gIGJ1aWxkQ2FyZEJsb2NrLFxuICBidWlsZENhcmRSZXBvQmxvY2ssXG4gIGJ1aWxkQ2FyZFJlcG9Mb2dCbG9jayxcbiAgYnVpbGRXb3Jrc3BhY2VSZXBvTG9nQmxvY2tzLFxuICBDYXJkUmVwb0FjY2Vzc0Vycm9yXG59IGZyb20gJy4vbGliL2NvbnRleHQuanMnO1xuXG5leHBvcnQgeyBidWlsZENhcmRCbG9jaywgYnVpbGRDYXJkUmVwb0Jsb2NrLCBidWlsZENhcmRSZXBvTG9nQmxvY2ssIGJ1aWxkV29ya3NwYWNlUmVwb0xvZ0Jsb2NrcywgQ2FyZFJlcG9BY2Nlc3NFcnJvciB9O1xuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIFBJRC10by1zZXNzaW9uIHJlZ2lzdHJhdGlvbiBmYWlscy5cbiAqXG4gKiBXcmFwcyB0aGUgdW5kZXJseWluZyBlcnJvciB3aXRoIHRoZSBQSUQgYW5kIHNlc3Npb24gSUQgZm9yXG4gKiBzdHJ1Y3R1cmVkIGVycm9yIGhhbmRsaW5nIGluIHRoZSBzZXNzaW9uLXN0YXJ0IGhvb2suXG4gKi9cbmV4cG9ydCBjbGFzcyBTZXNzaW9uUmVnaXN0cmF0aW9uRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IG5hbWUgPSAnU2Vzc2lvblJlZ2lzdHJhdGlvbkVycm9yJztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgcGlkOiBudW1iZXIsXG4gICAgcHVibGljIHJlYWRvbmx5IHNlc3Npb25JZDogc3RyaW5nLFxuICAgIGNhdXNlOiB1bmtub3duXG4gICkge1xuICAgIGNvbnN0IHJlYXNvbiA9IGNhdXNlIGluc3RhbmNlb2YgRXJyb3IgPyBjYXVzZS5tZXNzYWdlIDogU3RyaW5nKGNhdXNlKTtcbiAgICBzdXBlcihgRmFpbGVkIHRvIHJlZ2lzdGVyIFBJRCAke3BpZH0gZm9yIHNlc3Npb24gJHtzZXNzaW9uSWR9OiAke3JlYXNvbn1gKTtcbiAgICB0aGlzLmNhdXNlID0gY2F1c2U7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgZ2l0IEhFQUQgc2hhIGZvciBhIHJlcG9zaXRvcnkgcGF0aC5cbiAqXG4gKiBSZXR1cm5zIGBudWxsYCB3aGVuIHRoZSBwYXRoIGlzIG5vdCBhIGdpdCByZXBvc2l0b3J5IG9yIGdpdCBpc1xuICogdW5hdmFpbGFibGUuIEludGVudGlvbmFsbHkgZmFpbHMgb3BlbiBzbyBob29rIGZhaWx1cmVzIGRvIG5vdCBibG9ja1xuICogQ2xhdWRlLlxuICpcbiAqIEBwYXJhbSByZXBvUGF0aCAtIFJlcG9zaXRvcnkgZGlyZWN0b3J5IHdoZXJlIGBnaXQgcmV2LXBhcnNlIEhFQURgIHNob3VsZCBydW4uXG4gKiBAcmV0dXJucyBDdXJyZW50IGBIRUFEYCBTSEEsIG9yIGBudWxsYCB3aGVuIHVuYXZhaWxhYmxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUhlYWRTaGEocmVwb1BhdGg6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBleGVjRmlsZVN5bmMoJ2dpdCcsIFsncmV2LXBhcnNlJywgJ0hFQUQnXSwge1xuICAgICAgY3dkOiByZXBvUGF0aCxcbiAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICB9KS50cmltKCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogU3Bhd25zIGEgZGV0YWNoZWQgdHJhbnNjcmlwdCB3YXRjaGVyIHByb2Nlc3MgZm9yIGNyYXNoLXJlc2lsaWVudCB0cmFuc2NyaXB0IHVwbG9hZC5cbiAqXG4gKiBUaGUgd2F0Y2hlciBtb25pdG9ycyB0aGUgQ2xhdWRlIFBJRCBhbmQgdXBsb2FkcyB0aGUgdHJhbnNjcmlwdCBpZiB0aGUgcHJvY2Vzc1xuICogZXhpdHMgd2l0aG91dCB0aGUgc2Vzc2lvbi1lbmQgaG9vayBoYXZpbmcgcnVuIChjcmFzaC9TSUdLSUxMKS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gbW9uaXRvci5cbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIGlkZW50aWZpZXIgZm9yIHRoZSB0cmFuc2NyaXB0LlxuICogQHBhcmFtIHRyYW5zY3JpcHRQYXRoIC0gUGF0aCB0byB0aGUgdHJhbnNjcmlwdCBmaWxlLlxuICogQHBhcmFtIGNhcmRJZCAtIENhcmQgaWRlbnRpZmllciBmb3IgdGhlIHVwbG9hZCB0YXJnZXQuXG4gKiBAcGFyYW0gY2FyZFJlcG9QYXRoIC0gUGF0aCB0byB0aGUgY2FyZCByZXBvc2l0b3J5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3Bhd25UcmFuc2NyaXB0V2F0Y2hlcihcbiAgcGlkOiBudW1iZXIsXG4gIHNlc3Npb25JZDogc3RyaW5nLFxuICB0cmFuc2NyaXB0UGF0aDogc3RyaW5nLFxuICBjYXJkSWQ6IHN0cmluZyxcbiAgY2FyZFJlcG9QYXRoOiBzdHJpbmdcbik6IHZvaWQge1xuICBjb25zdCB3YXRjaGVyUGF0aCA9IHJlc29sdmUoZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpLCAnLi4vLi4vYmluL3RyYW5zY3JpcHQtd2F0Y2hlci5tanMnKTtcblxuICAvLyBSZXNvbHZlIG5vZGUgZXhlY3V0YWJsZTogcHJlZmVyIFZTQ09ERV9OT0RFIGVudiB2YXIsIGZhbGxiYWNrIHRvIGZpbGUsIHRoZW4gJ25vZGUnXG4gIGxldCBub2RlQmluOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgbm9kZUJpbiA9IHByb2Nlc3MuZW52WydWU0NPREVfTk9ERSddID8/IHJlYWRGaWxlU3luYyhqb2luKGhvbWVkaXIoKSwgJy5jYXJkcycsICdWU0NPREVfTk9ERScpLCAndXRmLTgnKS50cmltKCk7XG4gIH0gY2F0Y2gge1xuICAgIG5vZGVCaW4gPSAnbm9kZSc7XG4gIH1cblxuICBjb25zdCBzcGF3bkFyZ3MgPSBbd2F0Y2hlclBhdGgsIFN0cmluZyhwaWQpLCBzZXNzaW9uSWQsIHRyYW5zY3JpcHRQYXRoLCBjYXJkSWQsIGNhcmRSZXBvUGF0aF07XG5cbiAgY29uc3QgY2hpbGQgPSBzcGF3bihub2RlQmluLCBzcGF3bkFyZ3MsIHtcbiAgICBkZXRhY2hlZDogdHJ1ZSxcbiAgICBzdGRpbzogJ2lnbm9yZSdcbiAgfSk7XG4gIGNoaWxkLnVucmVmKCk7XG59XG5cbi8qKlxuICogUmVnaXN0ZXJzIHRoZSBDbGF1ZGUgUElEIGZvciBjb21taXQgYXR0cmlidXRpb24gYW5kIHNwYXducyB0aGUgdHJhbnNjcmlwdCB3YXRjaGVyLlxuICpcbiAqIFJldHVybnMgYSBmYWlsdXJlIG91dHB1dCBpZiBQSUQgcmVnaXN0cmF0aW9uIGZhaWxzIChibG9ja2luZyksIG9yIGBudWxsYCBvblxuICogc3VjY2Vzcy4gV2F0Y2hlciBzcGF3biBmYWlsdXJlIGlzIG5vbi1mYXRhbCBhbmQgb25seSBsb2dnZWQuXG4gKlxuICogQHBhcmFtIGNsYXVkZVBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRvIHJlZ2lzdGVyIGFuZCBtb25pdG9yLlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gaWRlbnRpZmllciBmb3IgdGhlIHJlZ2lzdHJhdGlvbi5cbiAqIEBwYXJhbSB0cmFuc2NyaXB0UGF0aCAtIFBhdGggdG8gdGhlIHRyYW5zY3JpcHQgZmlsZSBmb3IgdGhlIHdhdGNoZXIuXG4gKiBAcGFyYW0gYWN0aW9uSW5wdXQgLSBQYXJzZWQgYWN0aW9uIGlucHV0IGNvbnRhaW5pbmcgY2FyZCBjb250ZXh0LlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3Igc3RydWN0dXJlZCBvdXRwdXQuXG4gKiBAcmV0dXJucyBBIHNlc3Npb24tc3RhcnQgZmFpbHVyZSBvdXRwdXQgb24gcmVnaXN0cmF0aW9uIGVycm9yLCBvciBgbnVsbGAgb24gc3VjY2Vzcy5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmVnaXN0ZXJQaWRBbmRTcGF3bldhdGNoZXIoXG4gIGNsYXVkZVBpZDogbnVtYmVyLFxuICBzZXNzaW9uSWQ6IHN0cmluZyxcbiAgdHJhbnNjcmlwdFBhdGg6IHN0cmluZyxcbiAgYWN0aW9uSW5wdXQ6IEFjdGlvbklucHV0LFxuICBsb2dnZXI6IFBhcmFtZXRlcnM8UGFyYW1ldGVyczx0eXBlb2Ygc2Vzc2lvblN0YXJ0SG9vaz5bMV0+WzFdWydsb2dnZXInXVxuKTogUHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiBzZXNzaW9uU3RhcnRPdXRwdXQ+IHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGF3YWl0IHJlZ2lzdGVyU2Vzc2lvbihjbGF1ZGVQaWQsIHNlc3Npb25JZCk7XG4gICAgbG9nZ2VyLmluZm8oJ1JlZ2lzdGVyZWQgUElEIGZvciBjb21taXQgYXR0cmlidXRpb24nLCB7IHBpZDogY2xhdWRlUGlkLCBzZXNzaW9uSWQgfSk7XG4gIH0gY2F0Y2ggKGNhdXNlKSB7XG4gICAgY29uc3QgZXJyb3IgPSBuZXcgU2Vzc2lvblJlZ2lzdHJhdGlvbkVycm9yKGNsYXVkZVBpZCwgc2Vzc2lvbklkLCBjYXVzZSk7XG4gICAgbG9nZ2VyLmVycm9yKCdTZXNzaW9uIHJlZ2lzdHJhdGlvbiBmYWlsZWQnLCB7IHBpZDogZXJyb3IucGlkLCBzZXNzaW9uSWQ6IGVycm9yLnNlc3Npb25JZCwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7XG4gICAgICBjb250aW51ZTogZmFsc2UsXG4gICAgICBzeXN0ZW1NZXNzYWdlOiBbXG4gICAgICAgIGBTZXNzaW9uIHJlZ2lzdHJhdGlvbiBmYWlsZWQgZm9yIFBJRCAke2Vycm9yLnBpZH0gKHNlc3Npb24gJHtlcnJvci5zZXNzaW9uSWR9KS5gLFxuICAgICAgICAnJyxcbiAgICAgICAgYEVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCxcbiAgICAgICAgJycsXG4gICAgICAgICdDb21taXQgYXR0cmlidXRpb24gcmVxdWlyZXMgYSB2YWxpZCBQSUQtdG8tc2Vzc2lvbiBtYXBwaW5nLiBUbyByZXNvbHZlOicsXG4gICAgICAgICcxLiBWZXJpZnkgdGhlIHNlc3Npb24gcmVnaXN0cnkgaXMgYWNjZXNzaWJsZSBhbmQgbm90IGxvY2tlZCBieSBhbm90aGVyIHByb2Nlc3MnLFxuICAgICAgICAnMi4gRW5zdXJlIHN1ZmZpY2llbnQgZGlzayBzcGFjZSBmb3IgdGhlIHNlc3Npb24gcmVnaXN0cnkgZmlsZScsXG4gICAgICAgIGAzLiBDaGVjayB0aGF0IHRoZSBDbGF1ZGUgcHJvY2VzcyAoUElEICR7U3RyaW5nKGVycm9yLnBpZCl9KSBpcyBzdGlsbCBydW5uaW5nYFxuICAgICAgXS5qb2luKCdcXG4nKSxcbiAgICAgIHN0b3BSZWFzb246IGBTZXNzaW9uIHJlZ2lzdHJhdGlvbiBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIHNwYXduVHJhbnNjcmlwdFdhdGNoZXIoY2xhdWRlUGlkLCBzZXNzaW9uSWQsIHRyYW5zY3JpcHRQYXRoLCBhY3Rpb25JbnB1dC5jYXJkSWQsIGFjdGlvbklucHV0LmNhcmRSZXBvUGF0aCk7XG4gICAgbG9nZ2VyLmluZm8oJ1NwYXduZWQgdHJhbnNjcmlwdCB3YXRjaGVyJywgeyBwaWQ6IGNsYXVkZVBpZCwgc2Vzc2lvbklkIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgbG9nZ2VyLndhcm4oJ1RyYW5zY3JpcHQgd2F0Y2hlciBzcGF3biBmYWlsZWQnLCB7IGVycm9yOiBtZXNzYWdlIH0pO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZSBmb3IgdGhlIHNlc3Npb24gSUQgcGVyc2lzdGVkIGludG8gdGhlIEJhc2ggdG9vbFxuICogc2hlbGwgZW52aXJvbm1lbnQuIFRoZSBjYXJkLXJlcG8gcG9zdC1jb21taXQgaG9vayByZWFkcyB0aGlzIHRvIHJlY29yZFxuICogY29tbWl0cyB3aXRob3V0IG5lZWRpbmcgYSBwcm9jZXNzLXRyZWUgd2Fsay5cbiAqL1xuY29uc3QgQ0FSRFNfU0VTU0lPTl9JRF9FTlYgPSAnQ0FSRFNfU0VTU0lPTl9JRCc7XG5cbmV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIgfSkgPT4ge1xuICBsZXQgYWN0aW9uSW5wdXQ6IEFjdGlvbklucHV0O1xuICB0cnkge1xuICAgIGFjdGlvbklucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICBsb2dnZXIuZXJyb3IoJ05vdCBydW5uaW5nIGluc2lkZSBhbiBhY3Rpb24gc3VicHJvY2VzcycsIHsgZXJyb3I6IG1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7XG4gICAgICBzeXN0ZW1NZXNzYWdlOiAnU2Vzc2lvblN0YXJ0IGhvb2s6IG5vdCBydW5uaW5nIGluc2lkZSBhbiBhY3Rpb24gc3VicHJvY2Vzcy4nXG4gICAgfSk7XG4gIH1cblxuICAvLyBQZXJzaXN0IHNlc3Npb24gSUQgc28gdGhlIGNhcmQtcmVwbyBwb3N0LWNvbW1pdCBob29rIGNhbiBieXBhc3MgdGhlXG4gIC8vIHByb2Nlc3MgdHJlZSB3YWxrIGVudGlyZWx5LlxuICBwZXJzaXN0RW52VmFyKENBUkRTX1NFU1NJT05fSURfRU5WLCBpbnB1dC5zZXNzaW9uX2lkKTtcbiAgbG9nZ2VyLmluZm8oJ1BlcnNpc3RlZCBzZXNzaW9uIElEIHRvIGVudmlyb25tZW50JywgeyBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQgfSk7XG5cbiAgY29uc3QgaGVhZFNoYSA9IHJlc29sdmVIZWFkU2hhKGFjdGlvbklucHV0LmNhcmRSZXBvUGF0aCk7XG4gIGlmIChoZWFkU2hhKSB7XG4gICAgd3JpdGVTZXNzaW9uSGVhZFNoYShpbnB1dC5zZXNzaW9uX2lkLCBoZWFkU2hhKTtcbiAgICBsb2dnZXIuaW5mbygnU3RvcmVkIGdpdCBIRUFEIHNoYScsIHsgaGVhZFNoYSwgcmVwb1BhdGg6IGFjdGlvbklucHV0LmNhcmRSZXBvUGF0aCB9KTtcbiAgfSBlbHNlIHtcbiAgICBsb2dnZXIud2FybignQ291bGQgbm90IHJlc29sdmUgZ2l0IEhFQUQgc2hhJywgeyByZXBvUGF0aDogYWN0aW9uSW5wdXQuY2FyZFJlcG9QYXRoIH0pO1xuICB9XG5cbiAgY29uc3QgY2xhdWRlUGlkID0gZmluZENsYXVkZVBpZCgpO1xuICBpZiAoY2xhdWRlUGlkKSB7XG4gICAgY29uc3QgZmFpbHVyZSA9IGF3YWl0IHJlZ2lzdGVyUGlkQW5kU3Bhd25XYXRjaGVyKFxuICAgICAgY2xhdWRlUGlkLFxuICAgICAgaW5wdXQuc2Vzc2lvbl9pZCxcbiAgICAgIGlucHV0LnRyYW5zY3JpcHRfcGF0aCxcbiAgICAgIGFjdGlvbklucHV0LFxuICAgICAgbG9nZ2VyXG4gICAgKTtcbiAgICBpZiAoZmFpbHVyZSkgcmV0dXJuIGZhaWx1cmU7XG4gIH0gZWxzZSB7XG4gICAgbG9nZ2VyLmVycm9yKCdDb3VsZCBub3QgZmluZCBDbGF1ZGUgUElEIGZvciBjb21taXQgYXR0cmlidXRpb24nLCB7XG4gICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gICAgICBwcGlkOiBwcm9jZXNzLnBwaWRcbiAgICB9KTtcbiAgICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHtcbiAgICAgIGNvbnRpbnVlOiBmYWxzZSxcbiAgICAgIHN5c3RlbU1lc3NhZ2U6IFtcbiAgICAgICAgJ0NvdWxkIG5vdCBsb2NhdGUgdGhlIENsYXVkZSBDb2RlIHByb2Nlc3MgaW4gdGhlIGFuY2VzdG9yIGNoYWluLicsXG4gICAgICAgICcnLFxuICAgICAgICBgU2Vzc2lvbjogJHtpbnB1dC5zZXNzaW9uX2lkfWAsXG4gICAgICAgIGBIb29rIFBQSUQ6ICR7cHJvY2Vzcy5wcGlkfWAsXG4gICAgICAgICcnLFxuICAgICAgICAnQ29tbWl0IGF0dHJpYnV0aW9uIGFuZCB0cmFuc2NyaXB0IG1vbml0b3JpbmcgcmVxdWlyZSBhIHZhbGlkIENsYXVkZSBQSUQuJyxcbiAgICAgICAgJ1RoaXMgaXMgYSBmYXRhbCBlcnJvciB3aGVuIHJ1bm5pbmcgaW5zaWRlIGFuIGFjdGlvbiBzdWJwcm9jZXNzIChDQVJEX0lEIGlzIHNldCkuJyxcbiAgICAgICAgJycsXG4gICAgICAgICdUbyByZXNvbHZlOicsXG4gICAgICAgICcxLiBFbnN1cmUgQ2xhdWRlIENvZGUgaXMgcnVubmluZyBhcyBhIHByb2Nlc3MgbmFtZWQgXCJjbGF1ZGVcIicsXG4gICAgICAgICcyLiBDaGVjayB0aGF0IGBwc2AgY2FuIHNlZSBhbmNlc3RvciBwcm9jZXNzZXMgKG5vIFBJRCBuYW1lc3BhY2UgaXNvbGF0aW9uKScsXG4gICAgICAgICczLiBWZXJpZnkgdGhlIHByb2Nlc3MgdHJlZSBkZXB0aCBpcyB3aXRoaW4gdGhlIGFsbG93ZWQgbGltaXQnXG4gICAgICBdLmpvaW4oJ1xcbicpLFxuICAgICAgc3RvcFJlYXNvbjogYENvdWxkIG5vdCBmaW5kIENsYXVkZSBQSUQgKHBwaWQ9JHtwcm9jZXNzLnBwaWR9LCBzZXNzaW9uPSR7aW5wdXQuc2Vzc2lvbl9pZH0pYFxuICAgIH0pO1xuICB9XG5cbiAgbG9nZ2VyLmluZm8oJ0FjdGlvbiBzdWJwcm9jZXNzIGNvbmZpcm1lZCcsIHtcbiAgICBjYXJkSWQ6IGFjdGlvbklucHV0LmNhcmRJZCxcbiAgICBhY3Rpb25OYW1lOiBhY3Rpb25JbnB1dC5hY3Rpb25OYW1lLFxuICAgIGVudmlyb25tZW50OiBhY3Rpb25JbnB1dC5lbnZpcm9ubWVudCxcbiAgICBleGVjdXRpb25Nb2RlOiBhY3Rpb25JbnB1dC5leGVjdXRpb25Nb2RlXG4gIH0pO1xuXG4gIGxldCBzeXN0ZW1NZXNzYWdlOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgc3lzdGVtTWVzc2FnZSA9IGJ1aWxkQWRkaXRpb25hbENvbnRleHQoYWN0aW9uSW5wdXQpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIENhcmRSZXBvQWNjZXNzRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignQ2FyZCByZXBvIGluYWNjZXNzaWJsZScsIHsgcmVwb1BhdGg6IGVycm9yLnJlcG9QYXRoLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe1xuICAgICAgICBjb250aW51ZTogZmFsc2UsXG4gICAgICAgIC4uLmVycm9yLnRvSG9va0ZhaWx1cmUoJ3Nlc3Npb24nKVxuICAgICAgfSk7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7XG4gICAgc3lzdGVtTWVzc2FnZSxcbiAgICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAgICAgIGFkZGl0aW9uYWxDb250ZXh0OiBzeXN0ZW1NZXNzYWdlXG4gICAgfVxuICB9KTtcbn0pO1xuIiwgIi8qKlxuICogVHJhY2tzIGFzc29jaWF0aW9ucyBiZXR3ZWVuIENsYXVkZSBwcm9jZXNzIElEcyBhbmQgY2FyZHMgb24gZGlzaywgYnVmZmVyaW5nXG4gKiBwZW5kaW5nIGNvbW1pdCBTSEFzIHVudGlsIGFuIGFzc29jaWF0aW9uIGlzIGVzdGFibGlzaGVkLiBUaGUgcmVnaXN0cnkgdXNlc1xuICogYXRvbWljIGZpbGUgd3JpdGVzLCBhZHZpc29yeSBmaWxlIGxvY2tpbmcsIGFuZCBhdXRvbWF0aWMgc3RhbGUtZW50cnkgcHJ1bmluZ1xuICogdG8gcmVtYWluIGNvcnJlY3QgdW5kZXIgY29uY3VycmVudCBhY2Nlc3MuXG4gKlxuICogQHN1bW1hcnkgUElELXRvLWNhcmQgc2Vzc2lvbiByZWdpc3RyeSB3aXRoIGNvbW1pdCBidWZmZXJpbmdcbiAqIEBtb2R1bGUgY2xhdWRlLWNvZGUtc2Vzc2lvbnNcbiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZSB9IGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsgaG9tZWRpciB9IGZyb20gJ25vZGU6b3MnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBleGVjdXRlVHJhbnNhY3Rpb24sIGhhc0Vycm5vQ29kZSwgaXNQcm9jZXNzQWxpdmUsIHBydW5lU3RhbGVFbnRyaWVzIH0gZnJvbSAnLi9pbnRlcm5hbC5qcyc7XG5cbmV4cG9ydCB7IGZpbmRBbGxDbGF1ZGVQaWRzLCBmaW5kQ2xhdWRlUGlkLCBQUk9DRVNTX1RSRUVfTUFYX0RFUFRIIH0gZnJvbSAnLi9wcm9jZXNzLXRyZWUuanMnO1xuXG5mdW5jdGlvbiBnZXRDYXJkc0RpcigpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihob21lZGlyKCksICcuY2FyZHMnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjYW5vbmljYWwgb24tZGlzayBsb2NhdGlvbiBmb3IgdGhlIHNlc3Npb24gcmVnaXN0cnkgSlNPTiBmaWxlLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gYH4vLmNhcmRzL2NsYXVkZS1zZXNzaW9ucy5qc29uYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFJlZ2lzdHJ5UGF0aCgpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihnZXRDYXJkc0RpcigpLCAnY2xhdWRlLXNlc3Npb25zLmpzb24nKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjYW5vbmljYWwgb24tZGlzayBsb2NhdGlvbiBmb3IgdGhlIHNlc3Npb24gbG9jayBmaWxlLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gYH4vLmNhcmRzL2NsYXVkZS1zZXNzaW9ucy5sb2NrYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldExvY2tQYXRoKCk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGdldENhcmRzRGlyKCksICdjbGF1ZGUtc2Vzc2lvbnMubG9jaycpO1xufVxuXG5leHBvcnQgY29uc3QgTE9DS19USU1FT1VUX01TID0gMjAwMDtcbmV4cG9ydCBjb25zdCBNQVhfRU5UUllfQUdFX01TID0gMjQgKiA2MCAqIDYwICogMTAwMDsgLy8gMjQgaG91cnNcblxuLyoqIFNlc3Npb24gZGF0YSBzdG9yZWQgcGVyIFBJRCBpbiB0aGUgcmVnaXN0cnkgZmlsZS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2xhdWRlU2Vzc2lvbkVudHJ5IHtcbiAgY2FyZElkPzogc3RyaW5nO1xuICBwZW5kaW5nQ29tbWl0czogc3RyaW5nW107XG4gIHVwZGF0ZWRBdDogc3RyaW5nO1xufVxuXG4vKiogSlNPTiBwYXlsb2FkIHN0b3JlZCBhdCBgfi8uY2FyZHMvY2xhdWRlLXNlc3Npb25zLmpzb25gLiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGF1ZGVTZXNzaW9uUmVnaXN0cnkge1xuICBzZXNzaW9uczogUmVjb3JkPHN0cmluZywgQ2xhdWRlU2Vzc2lvbkVudHJ5Pjtcbn1cblxuLyoqIEV4dGVuZGVkIHNlc3Npb24gZW50cnkgdGhhdCBpbmNsdWRlcyBzZXNzaW9uIElELiAqL1xuZXhwb3J0IGludGVyZmFjZSBQaWRTZXNzaW9uRW50cnkge1xuICBzZXNzaW9uSWQ6IHN0cmluZztcbiAgdXBkYXRlZEF0OiBzdHJpbmc7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHVibGljIEFQSVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKlxuICogQXNzb2NpYXRlcyBQSUQgd2l0aCBjYXJkLiBJZiB0aGUgZW50cnkgYWxyZWFkeSBoYXMgYSBgY2FyZElkYCwgcmV0dXJucyBgW11gXG4gKiAoZmlyc3Qtd3JpdGUtd2lucykuIE90aGVyd2lzZSBzZXRzIGBjYXJkSWRgLCBleHRyYWN0cyBhbmQgY2xlYXJzXG4gKiBgcGVuZGluZ0NvbW1pdHNgLCBhbmQgcmV0dXJucyB0aGUgZXh0cmFjdGVkIGNvbW1pdHMuXG4gKlxuICogQHBhcmFtIHBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRvIGFzc29jaWF0ZS5cbiAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIGlkZW50aWZpZXIgdG8gYmluZCB0byB0aGUgUElELlxuICogQHJldHVybnMgUGVuZGluZyBTSEFzIGNhcHR1cmVkIGJlZm9yZSBhc3NvY2lhdGlvbiwgb3IgYFtdYCBvbiBmaXJzdC13cml0ZSBjb25mbGljdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFzc29jaWF0ZVBpZFdpdGhDYXJkKHBpZDogbnVtYmVyLCBjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgcmV0dXJuIGV4ZWN1dGVUcmFuc2FjdGlvbjxDbGF1ZGVTZXNzaW9uUmVnaXN0cnksIHN0cmluZ1tdPihcbiAgICBnZXRSZWdpc3RyeVBhdGgoKSxcbiAgICBnZXRMb2NrUGF0aCgpLFxuICAgIChyZWdpc3RyeSkgPT4ge1xuICAgICAgY29uc3QgcGlkU3RyID0gU3RyaW5nKHBpZCk7XG4gICAgICBjb25zdCBlbnRyeSA9IHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl07XG5cbiAgICAgIGlmIChlbnRyeT8uY2FyZElkKSByZXR1cm4gW107XG5cbiAgICAgIGNvbnN0IHBlbmRpbmdDb21taXRzID0gZW50cnk/LnBlbmRpbmdDb21taXRzID8/IFtdO1xuXG4gICAgICByZWdpc3RyeS5zZXNzaW9uc1twaWRTdHJdID0ge1xuICAgICAgICBjYXJkSWQsXG4gICAgICAgIHBlbmRpbmdDb21taXRzOiBbXSxcbiAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBwZW5kaW5nQ29tbWl0cztcbiAgICB9LFxuICAgIChyZWdpc3RyeSkgPT4gcHJ1bmVTdGFsZUVudHJpZXMocmVnaXN0cnkuc2Vzc2lvbnMsIGlzUHJvY2Vzc0FsaXZlLCBNQVhfRU5UUllfQUdFX01TKSxcbiAgICB7IHNlc3Npb25zOiB7fSB9IGFzIENsYXVkZVNlc3Npb25SZWdpc3RyeSxcbiAgICBMT0NLX1RJTUVPVVRfTVNcbiAgKTtcbn1cblxuLyoqXG4gKiBBcHBlbmRzIFNIQSB0byBgcGVuZGluZ0NvbW1pdHNgIGZvciBQSUQgKGRlZHVwbGljYXRpbmcpLiBDcmVhdGVzIHRoZSBlbnRyeVxuICogaWYgaXQgZG9lcyBub3QgZXhpc3QuXG4gKlxuICogQHBhcmFtIHBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRoYXQgcHJvZHVjZWQgdGhlIGNvbW1pdC5cbiAqIEBwYXJhbSBzaGEgLSBDb21taXQgU0hBIHRvIHJlY29yZCBmb3IgbGF0ZXIgYXR0cmlidXRpb24uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWNvcmRQZW5kaW5nQ29tbWl0KHBpZDogbnVtYmVyLCBzaGE6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBleGVjdXRlVHJhbnNhY3Rpb248Q2xhdWRlU2Vzc2lvblJlZ2lzdHJ5LCB2b2lkPihcbiAgICBnZXRSZWdpc3RyeVBhdGgoKSxcbiAgICBnZXRMb2NrUGF0aCgpLFxuICAgIChyZWdpc3RyeSkgPT4ge1xuICAgICAgY29uc3QgcGlkU3RyID0gU3RyaW5nKHBpZCk7XG4gICAgICBjb25zdCBlbnRyeSA9IHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl0gPz8ge1xuICAgICAgICBwZW5kaW5nQ29tbWl0czogW10sXG4gICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICB9O1xuXG4gICAgICBpZiAoIWVudHJ5LnBlbmRpbmdDb21taXRzLmluY2x1ZGVzKHNoYSkpIHtcbiAgICAgICAgZW50cnkucGVuZGluZ0NvbW1pdHMucHVzaChzaGEpO1xuICAgICAgfVxuXG4gICAgICBlbnRyeS51cGRhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICByZWdpc3RyeS5zZXNzaW9uc1twaWRTdHJdID0gZW50cnk7XG4gICAgfSxcbiAgICAocmVnaXN0cnkpID0+IHBydW5lU3RhbGVFbnRyaWVzKHJlZ2lzdHJ5LnNlc3Npb25zLCBpc1Byb2Nlc3NBbGl2ZSwgTUFYX0VOVFJZX0FHRV9NUyksXG4gICAgeyBzZXNzaW9uczoge30gfSBhcyBDbGF1ZGVTZXNzaW9uUmVnaXN0cnksXG4gICAgTE9DS19USU1FT1VUX01TXG4gICk7XG59XG5cbi8qKlxuICogUmV0dXJucyBgY2FyZElkYCBmb3IgUElEIGlmIGl0IGV4aXN0cywgbnVsbCBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRvIHJlc29sdmUuXG4gKiBAcmV0dXJucyBBc3NvY2lhdGVkIGNhcmQgSUQsIG9yIGBudWxsYCB3aGVuIHVua25vd24uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRQaWRDYXJkSWQocGlkOiBudW1iZXIpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgcmV0dXJuIGV4ZWN1dGVUcmFuc2FjdGlvbjxDbGF1ZGVTZXNzaW9uUmVnaXN0cnksIHN0cmluZyB8IG51bGw+KFxuICAgIGdldFJlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldExvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICBjb25zdCBwaWRTdHIgPSBTdHJpbmcocGlkKTtcbiAgICAgIHJldHVybiByZWdpc3RyeS5zZXNzaW9uc1twaWRTdHJdPy5jYXJkSWQgPz8gbnVsbDtcbiAgICB9LFxuICAgIChyZWdpc3RyeSkgPT4gcHJ1bmVTdGFsZUVudHJpZXMocmVnaXN0cnkuc2Vzc2lvbnMsIGlzUHJvY2Vzc0FsaXZlLCBNQVhfRU5UUllfQUdFX01TKSxcbiAgICB7IHNlc3Npb25zOiB7fSB9IGFzIENsYXVkZVNlc3Npb25SZWdpc3RyeSxcbiAgICBMT0NLX1RJTUVPVVRfTVNcbiAgKTtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIGFuZCByZXR1cm5zIHRoZSBQSUQncyBlbnRyeS4gUmV0dXJucyBudWxsIGlmIG5vdCBmb3VuZC5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gcmVtb3ZlLlxuICogQHJldHVybnMgUmVtb3ZlZCByZWdpc3RyeSBlbnRyeSwgb3IgYG51bGxgIHdoZW4gbm8gZW50cnkgZXhpc3RlZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbW92ZVBpZEVudHJ5KHBpZDogbnVtYmVyKTogUHJvbWlzZTxDbGF1ZGVTZXNzaW9uRW50cnkgfCBudWxsPiB7XG4gIHJldHVybiBleGVjdXRlVHJhbnNhY3Rpb248Q2xhdWRlU2Vzc2lvblJlZ2lzdHJ5LCBDbGF1ZGVTZXNzaW9uRW50cnkgfCBudWxsPihcbiAgICBnZXRSZWdpc3RyeVBhdGgoKSxcbiAgICBnZXRMb2NrUGF0aCgpLFxuICAgIChyZWdpc3RyeSkgPT4ge1xuICAgICAgY29uc3QgcGlkU3RyID0gU3RyaW5nKHBpZCk7XG4gICAgICBjb25zdCBlbnRyeSA9IHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl07XG5cbiAgICAgIGlmIChlbnRyeSkge1xuICAgICAgICBkZWxldGUgcmVnaXN0cnkuc2Vzc2lvbnNbcGlkU3RyXTtcbiAgICAgICAgcmV0dXJuIGVudHJ5O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuICAgIChyZWdpc3RyeSkgPT4gcHJ1bmVTdGFsZUVudHJpZXMocmVnaXN0cnkuc2Vzc2lvbnMsIGlzUHJvY2Vzc0FsaXZlLCBNQVhfRU5UUllfQUdFX01TKSxcbiAgICB7IHNlc3Npb25zOiB7fSB9IGFzIENsYXVkZVNlc3Npb25SZWdpc3RyeSxcbiAgICBMT0NLX1RJTUVPVVRfTVNcbiAgKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBDYXJkLXJlcG8gUElEIHJlZ2lzdHJ5IChwaWRzLmpzb24pXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIEpTT04gcGF5bG9hZCBzdG9yZWQgYXQgYH4vLmNhcmRzL2NhcmQtcmVwby1jb21taXRzL3BpZHMuanNvbmAuICovXG5pbnRlcmZhY2UgQ2FyZFJlcG9QaWRSZWdpc3RyeSB7XG4gIHNlc3Npb25zOiBSZWNvcmQ8c3RyaW5nLCBQaWRTZXNzaW9uRW50cnk+O1xufVxuXG5mdW5jdGlvbiBnZXRDYXJkUmVwb1BpZHNSZWdpc3RyeVBhdGgoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oZ2V0Q2FyZHNEaXIoKSwgJ2NhcmQtcmVwby1jb21taXRzJywgJ3BpZHMuanNvbicpO1xufVxuXG5mdW5jdGlvbiBnZXRDYXJkUmVwb1BpZHNMb2NrUGF0aCgpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihnZXRDYXJkc0RpcigpLCAnY2FyZC1yZXBvLWNvbW1pdHMnLCAncGlkcy5sb2NrJyk7XG59XG5cbi8qKlxuICogUmVnaXN0ZXJzIGEgc2Vzc2lvbiBmb3IgYSBDbGF1ZGUgcHJvY2VzcyBJRCBpbiB0aGUgY2FyZC1yZXBvIFBJRCByZWdpc3RyeS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gcmVnaXN0ZXIuXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBpZGVudGlmaWVyIHRvIGFzc29jaWF0ZSB3aXRoIHRoZSBQSUQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWdpc3RlclNlc3Npb24ocGlkOiBudW1iZXIsIHNlc3Npb25JZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGV4ZWN1dGVUcmFuc2FjdGlvbjxDYXJkUmVwb1BpZFJlZ2lzdHJ5LCB2b2lkPihcbiAgICBnZXRDYXJkUmVwb1BpZHNSZWdpc3RyeVBhdGgoKSxcbiAgICBnZXRDYXJkUmVwb1BpZHNMb2NrUGF0aCgpLFxuICAgIChyZWdpc3RyeSkgPT4ge1xuICAgICAgcmVnaXN0cnkuc2Vzc2lvbnNbU3RyaW5nKHBpZCldID0ge1xuICAgICAgICBzZXNzaW9uSWQsXG4gICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICB9O1xuICAgIH0sXG4gICAgdW5kZWZpbmVkLFxuICAgIHsgc2Vzc2lvbnM6IHt9IH0gYXMgQ2FyZFJlcG9QaWRSZWdpc3RyeSxcbiAgICBMT0NLX1RJTUVPVVRfTVNcbiAgKTtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIGEgUElEIGVudHJ5IGZyb20gdGhlIGNhcmQtcmVwbyBQSUQgcmVnaXN0cnkuXG4gKlxuICogQHBhcmFtIHBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRvIHJlbW92ZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbW92ZVNlc3Npb25QaWQocGlkOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgZXhlY3V0ZVRyYW5zYWN0aW9uPENhcmRSZXBvUGlkUmVnaXN0cnksIHZvaWQ+KFxuICAgIGdldENhcmRSZXBvUGlkc1JlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldENhcmRSZXBvUGlkc0xvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICBkZWxldGUgcmVnaXN0cnkuc2Vzc2lvbnNbU3RyaW5nKHBpZCldO1xuICAgIH0sXG4gICAgdW5kZWZpbmVkLFxuICAgIHsgc2Vzc2lvbnM6IHt9IH0gYXMgQ2FyZFJlcG9QaWRSZWdpc3RyeSxcbiAgICBMT0NLX1RJTUVPVVRfTVNcbiAgKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzZXNzaW9uIElEIGZvciBhIENsYXVkZSBwcm9jZXNzIElELlxuICpcbiAqIEBwYXJhbSBwaWQgLSBDbGF1ZGUgcHJvY2VzcyBJRCB0byBsb29rIHVwLlxuICogQHJldHVybnMgU2Vzc2lvbiBJRCwgb3IgYG51bGxgIHdoZW4gdGhlIGVudHJ5IGlzIGFic2VudC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFNlc3Npb25JZEZvclBpZChwaWQ6IG51bWJlcik6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICBjb25zdCByZWdpc3RyeVBhdGggPSBnZXRDYXJkUmVwb1BpZHNSZWdpc3RyeVBhdGgoKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgcmVhZEZpbGUocmVnaXN0cnlQYXRoLCAndXRmLTgnKTtcbiAgICBjb25zdCByZWdpc3RyeSA9IEpTT04ucGFyc2UoY29udGVudCkgYXMgQ2FyZFJlcG9QaWRSZWdpc3RyeTtcbiAgICByZXR1cm4gcmVnaXN0cnkuc2Vzc2lvbnNbU3RyaW5nKHBpZCldPy5zZXNzaW9uSWQgPz8gbnVsbDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoaGFzRXJybm9Db2RlKGVycm9yLCAnRU5PRU5UJykpIHJldHVybiBudWxsO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG4iLCAiLyoqXG4gKiBHZW5lcmljIHNoYXJlZCBoZWxwZXJzIGZvciByZWdpc3RyeSBmaWxlIG9wZXJhdGlvbnMuXG4gKlxuICogRXh0cmFjdGVkIGZyb20gaW5kZXgudHMgc28gdGhhdCBtdWx0aXBsZSByZWdpc3RyeSBtb2R1bGVzIGNhbiByZXVzZSB0aGVcbiAqIHNhbWUgbG9ja2luZywgcmVhZC93cml0ZSwgYW5kIHBydW5pbmcgcHJpbWl0aXZlcyB3aXRob3V0IGR1cGxpY2F0aW9uLlxuICpcbiAqIEFsbCBoZWxwZXJzIGZvbGxvdyBmYWlsLWNsb3NlZCBzZW1hbnRpY3M6IHVuZXhwZWN0ZWQgZXJyb3JzIHByb3BhZ2F0ZVxuICogcmF0aGVyIHRoYW4gYmVpbmcgc2lsZW50bHkgc3dhbGxvd2VkLlxuICpcbiAqIEBzdW1tYXJ5IEdlbmVyaWMgbG9ja2luZywgcmVhZC93cml0ZSwgYW5kIHBydW5pbmcgaGVscGVyc1xuICogQG1vZHVsZSBpbnRlcm5hbFxuICovXG5cbmltcG9ydCB7IGNsb3NlU3luYywgbWtkaXJTeW5jLCBvcGVuU3luYywgcmVhZEZpbGVTeW5jLCByZW5hbWVTeW5jLCB1bmxpbmtTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IGlzUHJvY2Vzc0FsaXZlIH0gZnJvbSAnLi9pcGMuanMnO1xuXG5leHBvcnQgeyBpc1Byb2Nlc3NBbGl2ZSB9IGZyb20gJy4vaXBjLmpzJztcblxuLyoqXG4gKiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIGFmdGVyIGBtc2AgbWlsbGlzZWNvbmRzLlxuICpcbiAqIEBwYXJhbSBtcyAtIER1cmF0aW9uIHRvIHNsZWVwIGluIG1pbGxpc2Vjb25kcy5cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIGFmdGVyIHRoZSBzcGVjaWZpZWQgZGVsYXkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzbGVlcChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGFuIHVua25vd24gdGhyb3duIHZhbHVlIGlzIGEgTm9kZS5qcyBzeXN0ZW0gZXJyb3Igd2l0aCB0aGVcbiAqIHNwZWNpZmllZCBgY29kZWAgcHJvcGVydHkgKGUuZy4gYCdFTk9FTlQnYCwgYCdFRVhJU1QnYCkuXG4gKlxuICogQHBhcmFtIGVycm9yIC0gVmFsdWUgY2F1Z2h0IGluIGEgYGNhdGNoYCBibG9jay5cbiAqIEBwYXJhbSBjb2RlIC0gRXhwZWN0ZWQgYEVycm5vRXhjZXB0aW9uLmNvZGVgIHN0cmluZy5cbiAqIEByZXR1cm5zIGB0cnVlYCB3aGVuIHRoZSBlcnJvciBtYXRjaGVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzRXJybm9Db2RlKGVycm9yOiB1bmtub3duLCBjb2RlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgJ2NvZGUnIGluIGVycm9yICYmIChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09IGNvZGU7XG59XG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gcmVtb3ZlIGEgc3RhbGUgbG9jayBmaWxlIGxlZnQgYnkgYSBkZWFkIHByb2Nlc3MuXG4gKlxuICogUmVhZHMgdGhlIFBJRCBmcm9tIHRoZSBsb2NrIGZpbGUsIGNoZWNrcyBsaXZlbmVzcywgYW5kIHVubGlua3Mgd2hlbiB0aGVcbiAqIGhvbGRlciBpcyBubyBsb25nZXIgcnVubmluZy4gQSBzZWNvbmQgcmVhZCBndWFyZHMgYWdhaW5zdCBUT0NUT1UgcmFjZXMuXG4gKlxuICogQHBhcmFtIGxvY2tQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgbG9jayBmaWxlLlxuICogQHJldHVybnMgYHRydWVgIHdoZW4gdGhlIHN0YWxlIGxvY2sgd2FzIHN1Y2Nlc3NmdWxseSByZW1vdmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJ5UmVtb3ZlU3RhbGVMb2NrKGxvY2tQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBsb2NrQ29udGVudCA9IHJlYWRGaWxlU3luYyhsb2NrUGF0aCwgJ3V0Zi04Jyk7XG4gICAgY29uc3QgaG9sZGVyUGlkID0gTnVtYmVyLnBhcnNlSW50KGxvY2tDb250ZW50LnRyaW0oKSwgMTApO1xuXG4gICAgaWYgKCFOdW1iZXIuaXNOYU4oaG9sZGVyUGlkKSAmJiAhaXNQcm9jZXNzQWxpdmUoaG9sZGVyUGlkKSkge1xuICAgICAgLy8gUmUtcmVhZCBsb2NrIGZpbGUgdG8gcmVkdWNlIFRPQ1RPVSByYWNlIHdpbmRvdyBiZWZvcmUgdW5saW5raW5nLlxuICAgICAgaWYgKHJlYWRGaWxlU3luYyhsb2NrUGF0aCwgJ3V0Zi04JykgPT09IGxvY2tDb250ZW50KSB7XG4gICAgICAgIHVubGlua1N5bmMobG9ja1BhdGgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIHRyeSB7XG4gICAgICB1bmxpbmtTeW5jKGxvY2tQYXRoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gRU5PRU5UOiBsb2NrIGFscmVhZHkgcmVtb3ZlZDsgb3RoZXIgZXJyb3JzOiBiZXN0LWVmZm9ydCBjbGVhbnVwXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBsb2NrIGZpbGUgZXhjbHVzaXZlbHkgYW5kIHdyaXRlcyB0aGUgY3VycmVudCBQSUQgaW50byBpdC5cbiAqXG4gKiBVc2VzIGBPX1dST05MWSB8IE9fQ1JFQVQgfCBPX0VYQ0xgIChgJ3d4J2ApIHNvIHRoZSBjYWxsIGZhaWxzIHdpdGhcbiAqIGBFRVhJU1RgIHdoZW4gYW5vdGhlciBwcm9jZXNzIGFscmVhZHkgaG9sZHMgdGhlIGxvY2suXG4gKlxuICogQHBhcmFtIGxvY2tQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgbG9jayBmaWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVMb2NrSG9sZGVyUGlkKGxvY2tQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgZmQgPSBvcGVuU3luYyhsb2NrUGF0aCwgJ3d4JywgMG82MDApO1xuICB0cnkge1xuICAgIHdyaXRlRmlsZVN5bmMoZmQsIFN0cmluZyhwcm9jZXNzLnBpZCkpO1xuICB9IGZpbmFsbHkge1xuICAgIGNsb3NlU3luYyhmZCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBY3F1aXJlcyBhbiBhZHZpc29yeSBmaWxlIGxvY2ssIHJldHJ5aW5nIHVudGlsIHN1Y2Nlc3Mgb3IgdGltZW91dC5cbiAqXG4gKiAqKkZhaWwtY2xvc2VkKio6IHRocm93cyBvbiB0aW1lb3V0IGluc3RlYWQgb2YgcmV0dXJuaW5nIGEgYm9vbGVhbi5cbiAqXG4gKiBAcGFyYW0gbG9ja1BhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBsb2NrIGZpbGUuXG4gKiBAcGFyYW0gdGltZW91dE1zIC0gTWF4aW11bSB3YWl0IHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICogQHRocm93cyB7RXJyb3J9IGAnTG9jayBhY3F1aXNpdGlvbiB0aW1lb3V0J2Agd2hlbiB0aGUgbG9jayBjYW5ub3QgYmVcbiAqICAgYWNxdWlyZWQgd2l0aGluIGB0aW1lb3V0TXNgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWNxdWlyZUxvY2sobG9ja1BhdGg6IHN0cmluZywgdGltZW91dE1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgY29uc3QgZGlyID0gZGlybmFtZShsb2NrUGF0aCk7XG5cbiAgd2hpbGUgKERhdGUubm93KCkgLSBzdGFydFRpbWUgPCB0aW1lb3V0TXMpIHtcbiAgICB0cnkge1xuICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUsIG1vZGU6IDBvNzAwIH0pO1xuICAgICAgd3JpdGVMb2NrSG9sZGVyUGlkKGxvY2tQYXRoKTtcbiAgICAgIHJldHVybjsgLy8gc3VjY2Vzc1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBpZiAoIWhhc0Vycm5vQ29kZShlcnJvciwgJ0VFWElTVCcpKSB0aHJvdyBlcnJvcjtcbiAgICAgIGlmICh0cnlSZW1vdmVTdGFsZUxvY2sobG9ja1BhdGgpKSBjb250aW51ZTtcblxuICAgICAgY29uc3QgcmVtYWluaW5nID0gdGltZW91dE1zIC0gKERhdGUubm93KCkgLSBzdGFydFRpbWUpO1xuICAgICAgaWYgKHJlbWFpbmluZyA+IDApIHtcbiAgICAgICAgYXdhaXQgc2xlZXAoTWF0aC5taW4oNTAsIHJlbWFpbmluZykpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcignTG9jayBhY3F1aXNpdGlvbiB0aW1lb3V0Jyk7XG59XG5cbi8qKlxuICogUmVsZWFzZXMgYW4gYWR2aXNvcnkgZmlsZSBsb2NrIGJ5IHVubGlua2luZyB0aGUgbG9jayBmaWxlLlxuICpcbiAqIGBFTk9FTlRgIGlzIHNpbGVudGx5IGlnbm9yZWQgKHRoZSBsb2NrIHdhcyBhbHJlYWR5IHJlbGVhc2VkKTsgYWxsIG90aGVyXG4gKiBlcnJvcnMgcHJvcGFnYXRlLlxuICpcbiAqIEBwYXJhbSBsb2NrUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGxvY2sgZmlsZS5cbiAqIEB0aHJvd3Mge05vZGVKUy5FcnJub0V4Y2VwdGlvbn0gV2hlbiB0aGUgdW5saW5rIGZhaWxzIGZvciByZWFzb25zIG90aGVyIHRoYW4gYEVOT0VOVGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWxlYXNlTG9jayhsb2NrUGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgdW5saW5rU3luYyhsb2NrUGF0aCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKCFoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIHN0YWxlIGVudHJpZXMgZnJvbSBhIFBJRC1rZXllZCByZWdpc3RyeSBvYmplY3QuXG4gKlxuICogQW4gZW50cnkgaXMgY29uc2lkZXJlZCBzdGFsZSB3aGVuOlxuICogMS4gSXRzIGtleSBpcyBub3QgYSB2YWxpZCBpbnRlZ2VyIFBJRC5cbiAqIDIuIEl0cyBgdXBkYXRlZEF0YCB0aW1lc3RhbXAgaXMgb2xkZXIgdGhhbiBgbWF4QWdlTXNgLlxuICogMy4gVGhlIHByb2Nlc3MgaWRlbnRpZmllZCBieSBpdHMga2V5IGlzIG5vIGxvbmdlciBhbGl2ZS5cbiAqXG4gKiBAcGFyYW0gcmVnaXN0cnkgLSBNdXRhYmxlIFBJRC1rZXllZCByZWNvcmQgdG8gcHJ1bmUgaW4gcGxhY2UuXG4gKiBAcGFyYW0gaXNBbGl2ZSAtIExpdmVuZXNzIGNoZWNrIGZ1bmN0aW9uICh0eXBpY2FsbHkge0BsaW5rIGlzUHJvY2Vzc0FsaXZlfSkuXG4gKiBAcGFyYW0gbWF4QWdlTXMgLSBNYXhpbXVtIGVudHJ5IGFnZSBpbiBtaWxsaXNlY29uZHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcnVuZVN0YWxlRW50cmllczxUIGV4dGVuZHMgeyB1cGRhdGVkQXQ6IHN0cmluZyB9PihcbiAgcmVnaXN0cnk6IFJlY29yZDxzdHJpbmcsIFQ+LFxuICBpc0FsaXZlOiAocGlkOiBudW1iZXIpID0+IGJvb2xlYW4sXG4gIG1heEFnZU1zOiBudW1iZXJcbik6IHZvaWQge1xuICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuXG4gIGZvciAoY29uc3QgW3BpZFN0ciwgZW50cnldIG9mIE9iamVjdC5lbnRyaWVzKHJlZ2lzdHJ5KSkge1xuICAgIGNvbnN0IHBpZCA9IE51bWJlci5wYXJzZUludChwaWRTdHIsIDEwKTtcblxuICAgIGlmIChOdW1iZXIuaXNOYU4ocGlkKSkge1xuICAgICAgZGVsZXRlIHJlZ2lzdHJ5W3BpZFN0cl07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgdXBkYXRlZEF0ID0gbmV3IERhdGUoZW50cnkudXBkYXRlZEF0KS5nZXRUaW1lKCk7XG4gICAgICBpZiAobm93IC0gdXBkYXRlZEF0ID4gbWF4QWdlTXMpIHtcbiAgICAgICAgZGVsZXRlIHJlZ2lzdHJ5W3BpZFN0cl07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgZGVsZXRlIHJlZ2lzdHJ5W3BpZFN0cl07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgaWYgKCFpc0FsaXZlKHBpZCkpIHtcbiAgICAgICAgZGVsZXRlIHJlZ2lzdHJ5W3BpZFN0cl07XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBpc1Byb2Nlc3NBbGl2ZSB0aHJvd3Mgb24gdW5leHBlY3RlZCBlcnJvcnMgLSBrZWVwIGVudHJ5XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHBhcnNlcyBhIEpTT04gcmVnaXN0cnkgZmlsZS5cbiAqXG4gKiAqKkZhaWwtY2xvc2VkKio6IHJldHVybnMgYGRlZmF1bHRWYWx1ZWAgb25seSB3aGVuIHRoZSBmaWxlIGRvZXMgbm90IGV4aXN0XG4gKiAoYEVOT0VOVGApLiBQYXJzZSBlcnJvcnMgYW5kIG90aGVyIEkvTyBmYWlsdXJlcyBwcm9wYWdhdGUgYXMgZXhjZXB0aW9ucy5cbiAqXG4gKiBAcGFyYW0gcGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIHJlZ2lzdHJ5IEpTT04gZmlsZS5cbiAqIEBwYXJhbSBkZWZhdWx0VmFsdWUgLSBWYWx1ZSByZXR1cm5lZCB3aGVuIHRoZSBmaWxlIGRvZXMgbm90IGV4aXN0LlxuICogQHJldHVybnMgUGFyc2VkIHJlZ2lzdHJ5IGNvbnRlbnRzLCBvciBgZGVmYXVsdFZhbHVlYCBvbiBgRU5PRU5UYC5cbiAqIEB0aHJvd3Mge1N5bnRheEVycm9yfSBXaGVuIHRoZSBmaWxlIGNvbnRhaW5zIGludmFsaWQgSlNPTi5cbiAqIEB0aHJvd3Mge05vZGVKUy5FcnJub0V4Y2VwdGlvbn0gT24gSS9PIGVycm9ycyBvdGhlciB0aGFuIGBFTk9FTlRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFJlZ2lzdHJ5PFQ+KHBhdGg6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBUKTogVCB7XG4gIHRyeSB7XG4gICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhwYXRoLCAndXRmLTgnKTtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShjb250ZW50KSBhcyBUO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICB0aHJvdyBlcnJvcjsgLy8gRkFJTC1DTE9TRUQ6IHRocm93IG9uIHBhcnNlIGVycm9yc1xuICB9XG59XG5cbi8qKlxuICogQXRvbWljYWxseSB3cml0ZXMgYSByZWdpc3RyeSBvYmplY3QgYXMgcHJldHR5LXByaW50ZWQgSlNPTi5cbiAqXG4gKiBXcml0ZXMgdG8gYSB0ZW1wb3JhcnkgYC50bXBgIHNpYmxpbmcgZmlyc3QsIHRoZW4gcmVuYW1lcyBpbnRvIHBsYWNlIHNvXG4gKiByZWFkZXJzIG5ldmVyIG9ic2VydmUgYSBwYXJ0aWFsbHktd3JpdHRlbiBmaWxlLlxuICpcbiAqIEBwYXJhbSByZWdpc3RyeSAtIE9iamVjdCB0byBzZXJpYWxpemUuXG4gKiBAcGFyYW0gcmVnaXN0cnlQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgdGFyZ2V0IHJlZ2lzdHJ5IGZpbGUuXG4gKiBAdGhyb3dzIHtOb2RlSlMuRXJybm9FeGNlcHRpb259IE9uIGZpbGVzeXN0ZW0gd3JpdGUgb3IgcmVuYW1lIGZhaWx1cmVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVSZWdpc3RyeUxvY2tlZDxUPihyZWdpc3RyeTogVCwgcmVnaXN0cnlQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgZGlyID0gZGlybmFtZShyZWdpc3RyeVBhdGgpO1xuICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgbW9kZTogMG83MDAgfSk7XG4gIGNvbnN0IHRlbXBQYXRoID0gYCR7cmVnaXN0cnlQYXRofS50bXBgO1xuICB0cnkge1xuICAgIHdyaXRlRmlsZVN5bmModGVtcFBhdGgsIEpTT04uc3RyaW5naWZ5KHJlZ2lzdHJ5LCBudWxsLCAyKSwgeyBtb2RlOiAwbzYwMCB9KTtcbiAgICByZW5hbWVTeW5jKHRlbXBQYXRoLCByZWdpc3RyeVBhdGgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRyeSB7XG4gICAgICB1bmxpbmtTeW5jKHRlbXBQYXRoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIGNsZWFudXAgYmVzdC1lZmZvcnQgKi9cbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLyoqXG4gKiBFeGVjdXRlcyBhIHJlYWQtbW9kaWZ5LXdyaXRlIHRyYW5zYWN0aW9uIHVuZGVyIGFuIGFkdmlzb3J5IGZpbGUgbG9jay5cbiAqXG4gKiAxLiBBY3F1aXJlcyBsb2NrLlxuICogMi4gUmVhZHMgcmVnaXN0cnkgKG9yIHVzZXMgYGRlZmF1bHRSZWdpc3RyeWAgaWYgZmlsZSBhYnNlbnQpLlxuICogMy4gT3B0aW9uYWxseSBwcnVuZXMgc3RhbGUgZW50cmllcy5cbiAqIDQuIENhbGxzIGBvcGVyYXRpb25gIHdpdGggdGhlIG11dGFibGUgcmVnaXN0cnkuXG4gKiA1LiBXcml0ZXMgdGhlIHJlZ2lzdHJ5IGJhY2suXG4gKiA2LiBSZWxlYXNlcyBsb2NrIChndWFyYW50ZWVkIHZpYSBgZmluYWxseWApLlxuICpcbiAqIEBwYXJhbSByZWdpc3RyeVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZWdpc3RyeSBKU09OIGZpbGUuXG4gKiBAcGFyYW0gbG9ja1BhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBsb2NrIGZpbGUuXG4gKiBAcGFyYW0gb3BlcmF0aW9uIC0gQ2FsbGJhY2sgdGhhdCBtdXRhdGVzIHRoZSByZWdpc3RyeSBhbmQgcmV0dXJucyBhIHJlc3VsdC5cbiAqIEBwYXJhbSBwcnVuZXIgLSBPcHRpb25hbCBjYWxsYmFjayB0byBwcnVuZSBzdGFsZSBlbnRyaWVzIGJlZm9yZSB0aGUgb3BlcmF0aW9uLlxuICogQHBhcmFtIGRlZmF1bHRSZWdpc3RyeSAtIERlZmF1bHQgdmFsdWUgd2hlbiB0aGUgcmVnaXN0cnkgZmlsZSBkb2VzIG5vdCBleGlzdC5cbiAqIEBwYXJhbSBsb2NrVGltZW91dE1zIC0gTG9jayBhY3F1aXNpdGlvbiB0aW1lb3V0IChkZWZhdWx0IDIwMDAgbXMpLlxuICogQHJldHVybnMgVGhlIHZhbHVlIHJldHVybmVkIGJ5IGBvcGVyYXRpb25gLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZVRyYW5zYWN0aW9uPFRSZWdpc3RyeSwgVFJlc3VsdD4oXG4gIHJlZ2lzdHJ5UGF0aDogc3RyaW5nLFxuICBsb2NrUGF0aDogc3RyaW5nLFxuICBvcGVyYXRpb246IChyZWdpc3RyeTogVFJlZ2lzdHJ5KSA9PiBUUmVzdWx0LFxuICBwcnVuZXI/OiAocmVnaXN0cnk6IFRSZWdpc3RyeSkgPT4gdm9pZCxcbiAgZGVmYXVsdFJlZ2lzdHJ5PzogVFJlZ2lzdHJ5LFxuICBsb2NrVGltZW91dE1zPzogbnVtYmVyXG4pOiBQcm9taXNlPFRSZXN1bHQ+IHtcbiAgYXdhaXQgYWNxdWlyZUxvY2sobG9ja1BhdGgsIGxvY2tUaW1lb3V0TXMgPz8gMjAwMCk7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVnaXN0cnkgPSByZWFkUmVnaXN0cnk8VFJlZ2lzdHJ5PihyZWdpc3RyeVBhdGgsIGRlZmF1bHRSZWdpc3RyeSBhcyBUUmVnaXN0cnkpO1xuICAgIGlmIChwcnVuZXIpIHBydW5lcihyZWdpc3RyeSk7XG4gICAgY29uc3QgcmVzdWx0ID0gb3BlcmF0aW9uKHJlZ2lzdHJ5KTtcbiAgICB3cml0ZVJlZ2lzdHJ5TG9ja2VkKHJlZ2lzdHJ5LCByZWdpc3RyeVBhdGgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0gZmluYWxseSB7XG4gICAgcmVsZWFzZUxvY2sobG9ja1BhdGgpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBQcm9jZXNzLWxldmVsIGhlbHBlcnMgZm9yIGNoZWNraW5nIHByb2Nlc3MgbGl2ZW5lc3MuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFByb2Nlc3MtbGV2ZWwgaGVscGVycyBmb3IgY2hlY2tpbmcgcHJvY2VzcyBsaXZlbmVzc1xuICogQG1vZHVsZSBpcGNcbiAqL1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHByb2Nlc3MgaXMgYWxpdmUgdXNpbmcgYGtpbGwocGlkLCAwKWAuXG4gKlxuICogU2lnbmFsIDAgaXMgYSBuby1vcCBwcm9iZTogbm8gc2lnbmFsIGlzIGRlbGl2ZXJlZCwgYnV0IHRoZSBrZXJuZWwgc3RpbGxcbiAqIHZhbGlkYXRlcyB0aGF0IHRoZSB0YXJnZXQgUElEIGV4aXN0cy4gYEVQRVJNYCBpcyB0cmVhdGVkIGFzIFwiYWxpdmVcIlxuICogYmVjYXVzZSB0aGUgcHJvY2VzcyBleGlzdHMgYnV0IGlzIG93bmVkIGJ5IGFub3RoZXIgdXNlci5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gUElEIHRvIHByb2JlLiBDYWxsZXJzIHVzdWFsbHkgcGFzcyBhIHZhbHVlIHByZXZpb3VzbHkgcmVjb3JkZWRcbiAqICAgaW4gdGhlIHNlc3Npb24gcmVnaXN0cnkuXG4gKiBAcmV0dXJucyBgdHJ1ZWAgd2hlbiB0aGUgUElEIHN0aWxsIGV4aXN0cy4gYEVQRVJNYCBpcyB0cmVhdGVkIGFzIGFsaXZlXG4gKiAgIGJlY2F1c2UgcGVybWlzc2lvbiBmYWlsdXJlcyBzdGlsbCBtZWFuIHRoZSBwcm9jZXNzIGlzIHByZXNlbnQuXG4gKiBAdGhyb3dzIFJldGhyb3dzIHVuZXhwZWN0ZWQgYHByb2Nlc3Mua2lsbGAgZmFpbHVyZXMgc28gY2FsbGVycyBjYW4gZmFpbCBjbG9zZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Byb2Nlc3NBbGl2ZShwaWQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIHByb2Nlc3Mua2lsbChwaWQsIDApO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmICdjb2RlJyBpbiBlcnJvcikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VTUkNIJykgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKGNvZGUgPT09ICdFUEVSTScpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuIiwgIi8qKlxuICogUHJvY2VzcyB0cmVlIHV0aWxpdGllcyBmb3IgbG9jYXRpbmcgQ2xhdWRlIENvZGUgYW5jZXN0b3IgcHJvY2Vzc2VzLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBQcm9jZXNzIHRyZWUgdXRpbGl0aWVzIGZvciBsb2NhdGluZyBDbGF1ZGUgQ29kZSBhbmNlc3RvciBwcm9jZXNzZXNcbiAqIEBtb2R1bGUgbGliL3Byb2Nlc3MtdHJlZVxuICovXG5cbmltcG9ydCB7IGV4ZWNTeW5jIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcblxuLyoqIE1heGltdW0gZGVwdGggdG8gd2FsayB1cCB0aGUgcHJvY2VzcyB0cmVlLiAqL1xuZXhwb3J0IGNvbnN0IFBST0NFU1NfVFJFRV9NQVhfREVQVEggPSAxMDtcblxuLyoqXG4gKiBQYXR0ZXJuIG1hdGNoaW5nIGBjbGF1ZGVgIGFzIGEgcGF0aCBjb21wb25lbnQgaW4gYHBzIC1vIGFyZ3M9YCBvdXRwdXQuXG4gKlxuICogTWF0Y2hlcyBgY2xhdWRlYCB3aGVuIHByZWNlZGVkIGJ5IHN0YXJ0LW9mLXN0cmluZywgd2hpdGVzcGFjZSwgb3IgYC9gXG4gKiAocGF0aCBzZXBhcmF0b3IpIEFORCBmb2xsb3dlZCBieSBgL2AsIHdoaXRlc3BhY2UsIG9yIGVuZC1vZi1zdHJpbmcuXG4gKlxuICogVGhpcyBhdm9pZHMgZmFsc2UgcG9zaXRpdmVzIG9uIGAuY2xhdWRlL2AgZGlyZWN0b3J5IHBhdGhzIGluIGFyZ3VtZW50c1xuICogbGlrZSBgL2hvbWUvbm9kZS8uY2xhdWRlL3NoZWxsLXNuYXBzaG90cy8uLi5gIGJlY2F1c2UgdGhlIGAuYCBiZXR3ZWVuXG4gKiB0aGUgYC9gIGFuZCBgY2xhdWRlYCBwcmV2ZW50cyB0aGUgbG9va2JlaGluZCBmcm9tIG1hdGNoaW5nLlxuICpcbiAqIFRoZSB0cmFpbGluZyBgL2AgYWx0ZXJuYXRpdmUgaGFuZGxlcyB2ZXJzaW9uZWQgZXhlY3V0YWJsZXMgd2hlcmUgdGhlIHBhdGhcbiAqIGNvbnRhaW5zIGAvY2xhdWRlL3ZlcnNpb25zL1guWS5aYCBcdTIwMTQgYGNsYXVkZWAgaXMgYSBkaXJlY3RvcnkgY29tcG9uZW50LFxuICogbm90IHRoZSB0ZXJtaW5hbCBjb21tYW5kIG5hbWUuXG4gKi9cbmNvbnN0IENMQVVERV9BUkdTX1BBVFRFUk4gPSAvKF58XFxzfFxcLyljbGF1ZGUoXFwvfFxcc3wkKS9pO1xuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgZ2l2ZW4gUElEIGJlbG9uZ3MgdG8gYSBDbGF1ZGUgcHJvY2Vzcy5cbiAqXG4gKiBVc2VzIGBwcyAtcCBQSUQgLW8gYXJncz1gIHRvIGdldCB0aGUgZnVsbCBjb21tYW5kIGxpbmUsIHRoZW4gdGVzdHNcbiAqIHdoZXRoZXIgYGNsYXVkZWAgYXBwZWFycyBhcyBhIHBhdGggY29tcG9uZW50IG9yIGNvbW1hbmQgbmFtZS5cbiAqIFRoaXMgbWF0Y2hlcyBib3RoIHRoZSBgY2xhdWRlYCBiaW5hcnkgYW5kIHZlcnNpb25lZCBleGVjdXRhYmxlc1xuICogKGUuZy4gYH4vLmxvY2FsL3NoYXJlL2NsYXVkZS92ZXJzaW9ucy8yLjEuNTFgKS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gUHJvY2VzcyBJRCB0byBpbnNwZWN0LlxuICogQHJldHVybnMgYHRydWVgIHdoZW4gdGhlIHByb2Nlc3MgYXJncyBtYXRjaCBDbGF1ZGU7IG90aGVyd2lzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0NsYXVkZShwaWQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIGNvbnN0IGFyZ3MgPSBleGVjU3luYyhgcHMgLXAgJHtwaWR9IC1vIGFyZ3M9YCwgeyBlbmNvZGluZzogJ3V0ZjgnIH0pLnRyaW0oKTtcbiAgICByZXR1cm4gQ0xBVURFX0FSR1NfUEFUVEVSTi50ZXN0KGFyZ3MpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBwYXJlbnQgUElEIGZvciBhIHByb2Nlc3MsIG9yIGBudWxsYCB3aGVuIHRyYXZlcnNhbCBzaG91bGQgc3RvcC5cbiAqXG4gKiBgbnVsbGAgaXMgcmV0dXJuZWQgZm9yIG1pc3NpbmcgcHJvY2Vzc2VzLCBtYWxmb3JtZWQgYHBzYCBvdXRwdXQsIGFuZFxuICogc2VsZi1wYXJlbnRpbmcgdmFsdWVzIHRoYXQgd291bGQgb3RoZXJ3aXNlIGNyZWF0ZSBhIGxvb3AuXG4gKlxuICogQHBhcmFtIHBpZCAtIFByb2Nlc3MgSUQgd2hvc2UgcGFyZW50IHNob3VsZCBiZSBxdWVyaWVkLlxuICogQHJldHVybnMgUGFyZW50IFBJRCB3aGVuIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIGBudWxsYC5cbiAqL1xuZnVuY3Rpb24gZ2V0UGFyZW50UGlkKHBpZDogbnVtYmVyKTogbnVtYmVyIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgY29uc3QgcHBpZFN0ciA9IGV4ZWNTeW5jKGBwcyAtcCAke3BpZH0gLW8gcHBpZD1gLCB7IGVuY29kaW5nOiAndXRmOCcgfSkudHJpbSgpO1xuICAgIGNvbnN0IHBhcmVudFBpZCA9IE51bWJlci5wYXJzZUludChwcGlkU3RyLCAxMCk7XG4gICAgaWYgKE51bWJlci5pc05hTihwYXJlbnRQaWQpIHx8IHBhcmVudFBpZCA9PT0gcGlkKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gcGFyZW50UGlkO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIFdhbGtzIHRoZSBwcm9jZXNzIHRyZWUgdXB3YXJkIGZyb20gYHN0YXJ0UGlkYCAoZGVmYXVsdDogYHByb2Nlc3MucHBpZGApXG4gKiBsb29raW5nIGZvciB0aGUgbmVhcmVzdCBhbmNlc3RvciBuYW1lZCBcImNsYXVkZVwiLlxuICpcbiAqIEBwYXJhbSBzdGFydFBpZCAtIE9wdGlvbmFsIHJvb3QgUElEIGZvciB0cmF2ZXJzYWwuIFdoZW4gb21pdHRlZCwgdHJhdmVyc2FsXG4gKiAgIHN0YXJ0cyBhdCB0aGUgcGFyZW50IG9mIHRoZSBjdXJyZW50IGhvb2sgcHJvY2Vzcy5cbiAqIEByZXR1cm5zIFRoZSBuZWFyZXN0IG1hdGNoaW5nIENsYXVkZSBhbmNlc3RvciBQSUQsIG9yIGBudWxsYCB3aGVuIG5vIG1hdGNoXG4gKiAgIGlzIGZvdW5kIHdpdGhpbiB7QGxpbmsgUFJPQ0VTU19UUkVFX01BWF9ERVBUSH0uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQ2xhdWRlUGlkKHN0YXJ0UGlkPzogbnVtYmVyKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IHBpZHMgPSBmaW5kQWxsQ2xhdWRlUGlkcyhzdGFydFBpZCk7XG4gIHJldHVybiBwaWRzWzBdID8/IG51bGw7XG59XG5cbi8qKlxuICogV2Fsa3MgdGhlIHByb2Nlc3MgdHJlZSB1cHdhcmQgZnJvbSBgc3RhcnRQaWRgIChkZWZhdWx0OiBgcHJvY2Vzcy5wcGlkYCkgYW5kXG4gKiByZXR1cm5zICoqYWxsKiogUElEcyBuYW1lZCBcImNsYXVkZVwiLCBvcmRlcmVkIG5lYXJlc3QtZmlyc3QuXG4gKlxuICogVXNlZnVsIHdoZW4gbXVsdGlwbGUgQ2xhdWRlIHNlc3Npb25zIGFyZSBuZXN0ZWQgKGUuZy4gYSBUYXNrIHN1YmFnZW50XG4gKiBzcGF3bmVkIGJ5IGFuIG91dGVyIENsYXVkZSkgYW5kIHRoZSBjb3JyZWN0IGNhcmQgYXNzb2NpYXRpb24gbWF5IGJlbG9uZ1xuICogdG8gYW4gYW5jZXN0b3IgZnVydGhlciB1cCB0aGUgdHJlZS5cbiAqIElmIENsYXVkZSBsYXVuY2hlZCBDbGF1ZGUgd2hpY2ggbGF1bmNoZWQgQ2xhdWRlLCB0aGlzIHJldHVybnMgdGhhdCBicmVhZGNydW1iXG4gKiB0cmFpbCBuZWFyZXN0LWZpcnN0LlxuICpcbiAqIEBwYXJhbSBzdGFydFBpZCAtIE9wdGlvbmFsIHJvb3QgUElEIGZvciB0cmF2ZXJzYWwuIFdoZW4gb21pdHRlZCwgdHJhdmVyc2FsXG4gKiAgIHN0YXJ0cyBhdCB0aGUgcGFyZW50IG9mIHRoZSBjdXJyZW50IGhvb2sgcHJvY2Vzcy5cbiAqIEByZXR1cm5zIEFsbCBtYXRjaGluZyBDbGF1ZGUgYW5jZXN0b3IgUElEcyBkaXNjb3ZlcmVkIGJlZm9yZSB0cmF2ZXJzYWwgc3RvcHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQWxsQ2xhdWRlUGlkcyhzdGFydFBpZD86IG51bWJlcik6IG51bWJlcltdIHtcbiAgY29uc3QgcmVzdWx0czogbnVtYmVyW10gPSBbXTtcbiAgbGV0IHBpZCA9IHN0YXJ0UGlkID8/IHByb2Nlc3MucHBpZDtcblxuICBmb3IgKGxldCBkZXB0aCA9IDA7IGRlcHRoIDwgUFJPQ0VTU19UUkVFX01BWF9ERVBUSDsgZGVwdGgrKykge1xuICAgIGlmIChwaWQgPD0gMSkgYnJlYWs7XG5cbiAgICBpZiAoaXNDbGF1ZGUocGlkKSkge1xuICAgICAgcmVzdWx0cy5wdXNoKHBpZCk7XG4gICAgfVxuXG4gICAgY29uc3QgcGFyZW50UGlkID0gZ2V0UGFyZW50UGlkKHBpZCk7XG4gICAgaWYgKHBhcmVudFBpZCA9PT0gbnVsbCkgYnJlYWs7XG4gICAgcGlkID0gcGFyZW50UGlkO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG4iLCAiLyoqXG4gKiBQZXItc2Vzc2lvbiBmaWxlIG9wZXJhdGlvbnMgZm9yIGNhcmQtcmVwbyBjb21taXQgYXR0cmlidXRpb24uXG4gKlxuICogTWFuYWdlcyBwZXItc2Vzc2lvbiBDU1YgZmlsZXMsIC5oZWFkIGZpbGVzLCBhbmQgZGlyZWN0b3J5IHNldHVwIHVuZGVyXG4gKiBgfi8uY2FyZHMvY2FyZC1yZXBvLWNvbW1pdHMvYC4gRWFjaCBzZXNzaW9uIGdldHMgaXRzIG93biBDU1YgZmlsZSBmb3JcbiAqIGNvbW1pdCBTSEFzIGFuZCBhIC5oZWFkIGZpbGUgdHJhY2tpbmcgdGhlIEhFQUQgU0hBIGF0IHNlc3Npb24gc3RhcnQuXG4gKlxuICogRGVzaWduIGludmFyaWFudHM6XG4gKiAtICoqRmFpbC1jbG9zZWQqKjogdW5leHBlY3RlZCBlcnJvcnMgcHJvcGFnYXRlOyBvbmx5IGBFTk9FTlRgIGlzIHNpbGVudGx5IGhhbmRsZWQuXG4gKiAtICoqUGVyLXNlc3Npb24gbG9ja2luZyoqOiBDU1YgYXBwZW5kcyBhY3F1aXJlIGEgcGVyLXNlc3Npb24gbG9jayB0byBwcmV2ZW50XG4gKiAgIGR1cGxpY2F0ZSB3cml0ZXMgdW5kZXIgY29uY3VycmVudCBhY2Nlc3MuXG4gKiAtICoqRGVkdXBsaWNhdGlvbioqOiBTSEFzIGFyZSBkZWR1cGxpY2F0ZWQgYmVmb3JlIGFwcGVuZGluZy5cbiAqXG4gKiBAc3VtbWFyeSBQZXItc2Vzc2lvbiBDU1YgYW5kIC5oZWFkIGZpbGUgb3BlcmF0aW9ucyBmb3IgY2FyZC1yZXBvIGNvbW1pdCBhdHRyaWJ1dGlvblxuICogQG1vZHVsZSBjYXJkLXJlcG9cbiAqL1xuXG5pbXBvcnQgeyBhcHBlbmRGaWxlU3luYywgbWtkaXJTeW5jLCByZWFkRmlsZVN5bmMsIHVubGlua1N5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdub2RlOm9zJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgYWNxdWlyZUxvY2ssIGhhc0Vycm5vQ29kZSwgcmVsZWFzZUxvY2sgfSBmcm9tICcuL2ludGVybmFsLmpzJztcblxuY29uc3QgTE9DS19USU1FT1VUX01TID0gMjAwMDtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBJbnRlcm5hbCBwYXRoIGhlbHBlcnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBnZXRDYXJkUmVwb0NvbW1pdHNEaXIoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oaG9tZWRpcigpLCAnLmNhcmRzJywgJ2NhcmQtcmVwby1jb21taXRzJyk7XG59XG5cbmZ1bmN0aW9uIGdldFNlc3Npb25Dc3ZQYXRoKHNlc3Npb25JZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oZ2V0Q2FyZFJlcG9Db21taXRzRGlyKCksIGAke3Nlc3Npb25JZH0uY3N2YCk7XG59XG5cbmZ1bmN0aW9uIGdldFNlc3Npb25Dc3ZMb2NrUGF0aChzZXNzaW9uSWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGdldENhcmRSZXBvQ29tbWl0c0RpcigpLCBgJHtzZXNzaW9uSWR9LmNzdi5sb2NrYCk7XG59XG5cbmZ1bmN0aW9uIGdldFNlc3Npb25IZWFkU2hhUGF0aChzZXNzaW9uSWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGdldENhcmRSZXBvQ29tbWl0c0RpcigpLCBgJHtzZXNzaW9uSWR9LmhlYWRgKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQdWJsaWMgQVBJXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiBBcHBlbmRzIGEgY29tbWl0IFNIQSB0byB0aGUgc2Vzc2lvbidzIENTViBmaWxlLiBEZWR1cGxpY2F0ZXMgU0hBcy5cbiAqIENyZWF0ZXMgZGlyZWN0b3J5IGFuZCBDU1YgZmlsZSBpZiB0aGV5IGRvbid0IGV4aXN0LlxuICpcbiAqIERlZHVwbGljYXRpb24gaXMgcmVhZC1iZWZvcmUtYXBwZW5kIHVuZGVyIGEgcGVyLXNlc3Npb24gbG9jaywgc28gY29uY3VycmVudFxuICogd3JpdGVycyBkbyBub3QgcHJvZHVjZSBkdXBsaWNhdGUgbGluZXMgZm9yIHRoZSBzYW1lIFNIQS5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiB3aG9zZSBjb21taXQgYnVmZmVyIHNob3VsZCBiZSB1cGRhdGVkLlxuICogQHBhcmFtIHNoYSAtIEZ1bGwgY29tbWl0IFNIQSB0byBhcHBlbmQuXG4gKiBAcmV0dXJucyBSZXNvbHZlcyBvbmNlIHRoZSBTSEEgaXMgcGVyc2lzdGVkIG9yIHNraXBwZWQgYXMgZHVwbGljYXRlLlxuICogQHRocm93cyBFcnJvciBvbiBsb2NrIGFjcXVpc2l0aW9uLCByZWFkLCBvciBhcHBlbmQgZmFpbHVyZXMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRDb21taXRUb1Nlc3Npb24oc2Vzc2lvbklkOiBzdHJpbmcsIHNoYTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIG1rZGlyU3luYyhnZXRDYXJkUmVwb0NvbW1pdHNEaXIoKSwgeyByZWN1cnNpdmU6IHRydWUsIG1vZGU6IDBvNzAwIH0pO1xuXG4gIGNvbnN0IGNzdkxvY2tQYXRoID0gZ2V0U2Vzc2lvbkNzdkxvY2tQYXRoKHNlc3Npb25JZCk7XG4gIGF3YWl0IGFjcXVpcmVMb2NrKGNzdkxvY2tQYXRoLCBMT0NLX1RJTUVPVVRfTVMpO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgY3N2UGF0aCA9IGdldFNlc3Npb25Dc3ZQYXRoKHNlc3Npb25JZCk7XG4gICAgY29uc3QgZXhpc3RpbmdDb21taXRzID0gZ2V0U2Vzc2lvbkNvbW1pdHMoc2Vzc2lvbklkKTtcblxuICAgIGlmICghZXhpc3RpbmdDb21taXRzLmluY2x1ZGVzKHNoYSkpIHtcbiAgICAgIGFwcGVuZEZpbGVTeW5jKGNzdlBhdGgsIGAke3NoYX1cXG5gLCB7IG1vZGU6IDBvNjAwIH0pO1xuICAgIH1cbiAgfSBmaW5hbGx5IHtcbiAgICByZWxlYXNlTG9jayhjc3ZMb2NrUGF0aCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcmV0dXJucyBhbGwgY29tbWl0IFNIQXMgZm9yIGEgc2Vzc2lvbiBmcm9tIGl0cyBDU1YgZmlsZS5cbiAqIFJldHVybnMgZW1wdHkgYXJyYXkgaWYgQ1NWIGRvZXNuJ3QgZXhpc3QuXG4gKlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gd2hvc2UgY29tbWl0IGJ1ZmZlciBzaG91bGQgYmUgcmVhZC5cbiAqIEByZXR1cm5zIE9yZGVyZWQgbGlzdCBvZiBub24tZW1wdHkgU0hBIGxpbmVzLiBSZXR1cm5zIGBbXWAgd2hlbiB0aGUgQ1NWIGlzIGFic2VudC5cbiAqIEB0aHJvd3MgRXJyb3Igb24gcmVhZCBmYWlsdXJlIChleGNlcHQgYEVOT0VOVGApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2Vzc2lvbkNvbW1pdHMoc2Vzc2lvbklkOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHRyeSB7XG4gICAgY29uc3QgY3N2UGF0aCA9IGdldFNlc3Npb25Dc3ZQYXRoKHNlc3Npb25JZCk7XG4gICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhjc3ZQYXRoLCAndXRmLTgnKTtcbiAgICByZXR1cm4gY29udGVudFxuICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgLm1hcCgobGluZSkgPT4gbGluZS50cmltKCkpXG4gICAgICAuZmlsdGVyKChsaW5lKSA9PiBsaW5lLmxlbmd0aCA+IDApO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgcmV0dXJuIFtdO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlcyB0aGUgc2Vzc2lvbidzIENTViBmaWxlIGFuZCBpdHMgbG9jayBmaWxlLlxuICogTm8tb3AgaWYgZmlsZXMgZG9uJ3QgZXhpc3QuXG4gKlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gd2hvc2UgQ1NWIGFydGlmYWN0cyBzaG91bGQgYmUgZGVsZXRlZC5cbiAqIEB0aHJvd3MgRXJyb3Igd2hlbiBkZWxldGluZyBlaXRoZXIgZmlsZSBmYWlscyBmb3IgcmVhc29ucyBvdGhlciB0aGFuIGBFTk9FTlRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlU2Vzc2lvbkNzdihzZXNzaW9uSWQ6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBjc3ZQYXRoID0gZ2V0U2Vzc2lvbkNzdlBhdGgoc2Vzc2lvbklkKTtcbiAgY29uc3QgY3N2TG9ja1BhdGggPSBnZXRTZXNzaW9uQ3N2TG9ja1BhdGgoc2Vzc2lvbklkKTtcblxuICB0cnkge1xuICAgIHVubGlua1N5bmMoY3N2UGF0aCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKCFoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgdGhyb3cgZXJyb3I7XG4gIH1cblxuICB0cnkge1xuICAgIHVubGlua1N5bmMoY3N2TG9ja1BhdGgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmICghaGFzRXJybm9Db2RlKGVycm9yLCAnRU5PRU5UJykpIHRocm93IGVycm9yO1xuICB9XG59XG5cbi8qKlxuICogV3JpdGVzIGEgZ2l0IEhFQUQgU0hBIHRvIHRoZSBzZXNzaW9uJ3MgLmhlYWQgZmlsZS5cbiAqIENyZWF0ZXMgZGlyZWN0b3J5IGlmIGl0IGRvZXNuJ3QgZXhpc3QuXG4gKlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gd2hvc2UgSEVBRCBTSEEgc2hvdWxkIGJlIHN0b3JlZC5cbiAqIEBwYXJhbSBzaGEgLSBHaXQgY29tbWl0IFNIQSB0byBwZXJzaXN0LlxuICogQHRocm93cyBFcnJvciB3aGVuIGRpcmVjdG9yeSBjcmVhdGlvbiBvciBmaWxlIHdyaXRlIGZhaWxzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVTZXNzaW9uSGVhZFNoYShzZXNzaW9uSWQ6IHN0cmluZywgc2hhOiBzdHJpbmcpOiB2b2lkIHtcbiAgbWtkaXJTeW5jKGdldENhcmRSZXBvQ29tbWl0c0RpcigpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgbW9kZTogMG83MDAgfSk7XG4gIHdyaXRlRmlsZVN5bmMoZ2V0U2Vzc2lvbkhlYWRTaGFQYXRoKHNlc3Npb25JZCksIHNoYSwgeyBtb2RlOiAwbzYwMCB9KTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZ2l0IEhFQUQgU0hBIGZyb20gdGhlIHNlc3Npb24ncyAuaGVhZCBmaWxlLlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIHdob3NlIEhFQUQgU0hBIHNob3VsZCBiZSByZXRyaWV2ZWQuXG4gKiBAcmV0dXJucyBUaGUgc3RvcmVkIFNIQSB3aXRoIHdoaXRlc3BhY2UgdHJpbW1lZCwgb3IgYG51bGxgIHdoZW4gdGhlIGZpbGUgaXMgYWJzZW50LlxuICogQHRocm93cyBFcnJvciB3aGVuIGZpbGUgcmVhZCBmYWlscyBmb3IgcmVhc29ucyBvdGhlciB0aGFuIGBFTk9FTlRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFNlc3Npb25IZWFkU2hhKHNlc3Npb25JZDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHJlYWRGaWxlU3luYyhnZXRTZXNzaW9uSGVhZFNoYVBhdGgoc2Vzc2lvbklkKSwgJ3V0Zi04JykudHJpbSgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgcmV0dXJuIG51bGw7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBzZXNzaW9uJ3MgLmhlYWQgZmlsZS5cbiAqIE5vLW9wIGlmIGZpbGUgZG9lc24ndCBleGlzdC5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiB3aG9zZSAuaGVhZCBmaWxlIHNob3VsZCBiZSBkZWxldGVkLlxuICogQHRocm93cyBFcnJvciB3aGVuIGRlbGV0aW5nIHRoZSBmaWxlIGZhaWxzIGZvciByZWFzb25zIG90aGVyIHRoYW4gYEVOT0VOVGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVTZXNzaW9uSGVhZFNoYShzZXNzaW9uSWQ6IHN0cmluZyk6IHZvaWQge1xuICB0cnkge1xuICAgIHVubGlua1N5bmMoZ2V0U2Vzc2lvbkhlYWRTaGFQYXRoKHNlc3Npb25JZCkpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmICghaGFzRXJybm9Db2RlKGVycm9yLCAnRU5PRU5UJykpIHRocm93IGVycm9yO1xuICB9XG59XG4iLCAiLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENhcmRzIEV4dGVuc2lvbiBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICpcbiAqIFRoZSBleGVjdXRpb24gd3JhcHBlciBpbmplY3RzIGFjdGlvbiBhbmQgdHlwZSBob29rIGlucHV0cyB2aWEgcHJvY2Vzcy5lbnYuXG4gKiBUaGlzIG1vZHVsZSBwcm92aWRlcyBzdHJpY3QgZ2V0dGVycyBhbmQgdHlwZWQgZXh0cmFjdG9ycyBzbyBoYW5kbGVycyBkbyBub3RcbiAqIG5lZWQgdG8gcGFyc2UgZW52aXJvbm1lbnQgdmFyaWFibGVzIG1hbnVhbGx5LlxuICpcbiAqIFVzZSB0aGUgaW5kaXZpZHVhbCBnZXR0ZXJzIHdoZW4geW91IG9ubHkgbmVlZCBvbmUgdmFsdWU7IHVzZVxuICoge0BsaW5rIGV4dHJhY3RBY3Rpb25JbnB1dH0gb3Ige0BsaW5rIGV4dHJhY3RUeXBlSW5wdXR9IHdoZW4geW91IG5lZWQgYSBmdWxsXG4gKiB0eXBlZCBwYXlsb2FkIGZvciBhbiBhY3Rpb24gb3IgdHlwZSBob29rLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENhcmRzIEV4dGVuc2lvbiBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbklucHV0LCBUeXBlSG9va0lucHV0IH0gZnJvbSAnLi9pbnB1dHMuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lcyBzZXQgYnkgdGhlIENhcmRzIGV4ZWN1dGlvbiB3cmFwcGVyLlxuICpcbiAqIFRoaXMgaXMgdGhlIHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggZm9yIGVudiB2YXIga2V5cyB1c2VkIGJ5IGFjdGlvbiBhbmQgdHlwZVxuICogaG9vayBwcm9jZXNzZXMuIEtlZXAgaXQgaW4gc3luYyB3aXRoIHRoZSB3cmFwcGVyIHRvIGF2b2lkIHN1YnRsZSBcInVuZGVmaW5lZFxuICogaW5wdXRcIiBidWdzLlxuICovXG5leHBvcnQgY29uc3QgQ0FSRFNfRU5WX1ZBUlMgPSB7XG4gIC8qKlxuICAgKiBVbmlxdWUgaWRlbnRpZmllciBmb3IgdGhlIGN1cnJlbnQgY2FyZC5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQ0FSRF9JRDogJ0NBUkRfSUQnLFxuXG4gIC8qKlxuICAgKiBUaGUgZW52aXJvbm1lbnQgbmFtZSBmcm9tIHNldHRpbmdzLmpzb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEVOVklST05NRU5UOiAnRU5WSVJPTk1FTlQnLFxuXG4gIC8qKlxuICAgKiBEaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiBidXR0b24gdGhhdCB0cmlnZ2VyZWQgdGhpcyBoYW5kbGVyLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqL1xuICBBQ1RJT05fTkFNRTogJ0FDVElPTl9OQU1FJyxcblxuICAvKipcbiAgICogQ2FyZCdzIGV4ZWN1dGlvbiBtb2RlLCBkZXRlcm1pbmluZyBVSSBpbnRlcmFjdGlvbiBtb2RlbC5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKiBWYWxpZCB2YWx1ZXM6ICdpbnRlcmFjdGl2ZScgfCAnYmFja2dyb3VuZCdcbiAgICovXG4gIEVYRUNVVElPTl9NT0RFOiAnRVhFQ1VUSU9OX01PREUnLFxuXG4gIC8qKlxuICAgKiBDYXJkcyBzZXJ2ZXIgYmFzZSBVUkwgZm9yIEFQSSBjYWxscy5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQVBJX0JBU0VfVVJMOiAnQVBJX0JBU0VfVVJMJyxcblxuICAvKipcbiAgICogQXV0aGVudGljYXRpb24gdG9rZW4gZm9yIEFQSSBjYWxscy5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQVBJX0FDQ0VTU19UT0tFTjogJ0FQSV9BQ0NFU1NfVE9LRU4nLFxuXG4gIC8qKlxuICAgKiBDb25maWd1cmVkIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyIGZyb20gY2FyZHMuY29kaW5nQWdlbnQgc2V0dGluZy5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKiBPcHRpb25hbC5cbiAgICovXG4gIENPRElOR19BR0VOVDogJ0NPRElOR19BR0VOVCcsXG5cbiAgLyoqXG4gICAqIFRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFRZUEVfTkFNRTogJ1RZUEVfTkFNRScsXG5cbiAgLyoqXG4gICAqIFRoZSB0eXBlJ3MgdmVyc2lvbiBzdHJpbmcgZnJvbSBzZXR0aW5ncy5qc29uIGNvbmZpZ3VyYXRpb24uXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX1ZFUlNJT046ICdUWVBFX1ZFUlNJT04nLFxuXG4gIC8qKlxuICAgKiBUaGUgZmlsZSBuYW1lIHdpdGhpbiB0aGUgdHlwZSBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX05BTUU6ICdGSUxFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBGdWxsIHBhdGggdG8gdGhlIGZpbGUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX1BBVEg6ICdGSUxFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBGaWxlIHNpemUgaW4gYnl0ZXMuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX1NJWkU6ICdGSUxFX1NJWkUnLFxuXG4gIC8qKlxuICAgKiBTSEEyNTYgaGFzaCBvZiBjb250ZW50LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgU0hBMjU2OiAnU0hBMjU2JyxcblxuICAvKipcbiAgICogTUlNRSB0eXBlIG9mIHRoZSBjb250ZW50LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgQ09OVEVOVF9UWVBFOiAnQ09OVEVOVF9UWVBFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgcHJvY2Vzcy5leGVjUGF0aGAgKHdpdGhcbiAgICogYEVMRUNUUk9OX1JVTl9BU19OT0RFPTFgKS4gQ29tbWFuZHMgaW4gc2V0dGluZ3MuanNvbiB1c2VcbiAgICogYCRWU0NPREVfTk9ERSAuL2Jpbi8uLi5gIHNvIHRoZXkgd29yayByZWdhcmRsZXNzIG9mXG4gICAqIHdoZXRoZXIgYG5vZGVgIGlzIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgVlNDT0RFX05PREU6ICdWU0NPREVfTk9ERScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXIgcnVubmluZyB0aGUgd3JhcHBlciBwcm9jZXNzLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIHdyYXBwZXIgZnJvbSBgcHJvY2Vzcy5leGVjUGF0aGAuIFVzZSBgJE5PREVgIGluIGVtYmVkZGVkXG4gICAqIGJhc2ggc3RhdGVtZW50cyB0byBpbnZva2UgTm9kZSBzY3JpcHRzIHBvcnRhYmx5LlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMuXG4gICAqL1xuICBOT0RFOiAnTk9ERScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFVuaXggZG9tYWluIHNvY2tldCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBTT0NLRVRfUEFUSDogJ1NPQ0tFVF9QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byBhIEpTT04gZmlsZSBjb250YWluaW5nIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmcm9tIGEgcHJldmlvdXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS4gT3B0aW9uYWwuXG4gICAqL1xuICBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIOiAnU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIHNldHRpbmdzIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQ09ORklHX1BBVEg6ICdDT05GSUdfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgd29ya3NwYWNlIHJvb3QgZGlyZWN0b3J5LlxuICAgKiBTZXQgYnkgdGhlIGFjdGlvbiBoYW5kbGVyIChlLmcuLCBsYXVuY2gudHMpIHRvIHRoZSB3b3JrdHJlZSBwYXRoLlxuICAgKiBBdmFpbGFibGUgaW4gaG9va3MgcnVubmluZyBpbnNpZGUgdGhlIGNsYXVkZSBDTEkuXG4gICAqL1xuICBXT1JLU1BBQ0VfUEFUSDogJ1dPUktTUEFDRV9QQVRIJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IChOT1QgYSB3b3JrdHJlZSkuXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyBjb25zdW1lZCBieSB0aGUgd3JhcHBlciBhbmQgd2F0Y2hlciBmb3JcbiAgICogZ2l0IG9wZXJhdGlvbnMgKHdvcmt0cmVlIHJlbW92YWwsIGJyYW5jaCBkZWxldGlvbikgdGhhdCBtdXN0IHJ1blxuICAgKiBhZ2FpbnN0IHRoZSBtYWluIHJlcG9zaXRvcnkuXG4gICAqL1xuICBSRVBPX1JPT1Q6ICdSRVBPX1JPT1QnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDQVJEX1JFUE9fUEFUSDogJ0NBUkRfUkVQT19QQVRIJyxcblxuICAvKipcbiAgICogUmVzb2x2ZWQgc2hlbGwgY29tbWFuZCBmb3IgdGhlIHdyYXBwZXIgdG8gc3Bhd24gYXMgdGhlIGFjdGlvbiBoYW5kbGVyLlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgY29uc3VtZWQgYnkgdGhlIHdyYXBwZXIgKG5vdCBieSBhY3Rpb24gaGFuZGxlcnMpLlxuICAgKi9cbiAgQUNUSU9OX0NPTU1BTkQ6ICdBQ1RJT05fQ09NTUFORCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggdGhhdCB0aGUgY2FyZCdzIHdvcmtzcGFjZSBicmFuY2ggd2lsbCBtZXJnZSBpbnRvLlxuICAgKiBSZXNvbHZlZCBmcm9tIHRoZSB3b3Jrc3BhY2UgSEVBRCBhdCBsYXVuY2ggdGltZS5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQkFTRV9CUkFOQ0g6ICdCQVNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggZnJvbSB3aGljaCB0aGUgY2FyZCdzIHdvcmtzcGFjZSBicmFuY2ggd2FzIGNyZWF0ZWQuXG4gICAqIE1heSBkaWZmZXIgZnJvbSBCQVNFX0JSQU5DSCB3aGVuIHRoZSB3b3JrdHJlZSB3YXMgY3JlYXRlZCBhZ2FpbnN0XG4gICAqIGEgZGlmZmVyZW50IHJlZiB0aGFuIHRoZSBjdXJyZW50IHdvcmtzcGFjZSBIRUFELlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBQQVJFTlRfQlJBTkNIOiAnUEFSRU5UX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggbmFtZSBmb3IgdGhlIGNhcmQncyB3b3Jrc3BhY2UgaW1wbGVtZW50YXRpb24uXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbiBhZnRlciByZXNvbHZpbmcgb3IgY3JlYXRpbmcgdGhlIHdvcmt0cmVlLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgV09SS1NQQUNFX0JSQU5DSDogJ1dPUktTUEFDRV9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBTZXNzaW9uIElEIHBlcnNpc3RlZCBieSB0aGUgc2Vzc2lvbi1zdGFydCBob29rIHZpYSBgcGVyc2lzdEVudlZhcmAuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBCYXNoIHRvb2wgc2hlbGwgZGVzY2VuZGFudHMgKGNvbW1hbmRzLCBnaXQgaG9va3MpIGFmdGVyXG4gICAqIHNlc3Npb24gc3RhcnQuIE5PVCBhdmFpbGFibGUgaW4gaG9va3Mgc3Bhd25lZCBkaXJlY3RseSBieSBDbGF1ZGUgQ29kZVxuICAgKiAoc3RvcCwgc2Vzc2lvbi1lbmQsIGV0Yy4pIFx1MjAxNCB0aG9zZSByZWNlaXZlIHRoZSBzZXNzaW9uIElEIHZpYSBob29rIGlucHV0LlxuICAgKlxuICAgKiBUaGUgY2FyZC1yZXBvIHBvc3QtY29tbWl0IGhvb2sgcmVhZHMgdGhpcyB0byByZWNvcmQgY29tbWl0cyBkaXJlY3RseVxuICAgKiB3aXRob3V0IG5lZWRpbmcgYSBwcm9jZXNzLXRyZWUgd2FsayBvciBQSUQgcmVnaXN0cnkgbG9va3VwLlxuICAgKi9cbiAgQ0FSRFNfU0VTU0lPTl9JRDogJ0NBUkRTX1NFU1NJT05fSUQnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBWUyBDb2RlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5LlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gICAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAgICogYXMgdGhlIHJ1bnRpbWUgcGx1Z2luIGRpcmVjdG9yeSAoYDxleHRlbnNpb25QYXRoPi9kaXN0L3BsdWdpbnMvcnVudGltZWApLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqL1xuICBFWFRFTlNJT05fUEFUSDogJ0VYVEVOU0lPTl9QQVRIJ1xufSBhcyBjb25zdDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW5kaXZpZHVhbCBHZXR0ZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogUmVhZHMgdGhlIGNhcmQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgYWx3YXlzIHNldHMgdGhpcyBmb3IgZXZlcnkgYWN0aW9uIGFuZCB0eXBlIGhvb2suXG4gKiBAcmV0dXJucyBUaGUgY3VycmVudCBjYXJkIElEXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfSUQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNhcmRJZCA9IGdldENhcmRJZCgpO1xuICogY29uc29sZS5sb2coYFByb2Nlc3NpbmcgY2FyZDogJHtjYXJkSWR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRJZCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfSURdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2YWx1ZSBtYXRjaGVzIHRoZSBlbnZpcm9ubWVudCBrZXkgaW4gc2V0dGluZ3MuanNvbiAoZS5nLiwgXCJkZWZhdWx0XCIsIFwic3RhZ2luZ1wiKS5cbiAqIEByZXR1cm5zIFRoZSBlbnZpcm9ubWVudCBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVOVklST05NRU5UIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZpcm9ubWVudCA9IGdldEVudmlyb25tZW50KCk7XG4gKiBjb25zb2xlLmxvZyhgRW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudmlyb25tZW50KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhY3Rpb24gYnV0dG9uIG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyB0aGUgZGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGhhbmRsZXIsIG1hdGNoaW5nXG4gKiB0aGUgYGFjdGlvbk5hbWVgIGZpZWxkIGZyb20gYGRlZmluZUFjdGlvbmAuXG4gKiBAcmV0dXJucyBEaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgY3VycmVudCBoYW5kbGVyIHJ1bi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQUNUSU9OX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFjdGlvbk5hbWUgPSBnZXRBY3Rpb25OYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgUnVubmluZyBhY3Rpb246ICR7YWN0aW9uTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aW9uTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZXhlY3V0aW9uIG1vZGUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogRGV0ZXJtaW5lcyB0aGUgVUkgaW50ZXJhY3Rpb24gbW9kZWwgZm9yIGFjdGlvbnMuXG4gKiBAcmV0dXJucyBUaGUgZXhlY3V0aW9uIG1vZGUgKCdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnKVxuICogQHRocm93cyBFcnJvciBpZiBFWEVDVVRJT05fTU9ERSBpcyBtaXNzaW5nLCBlbXB0eSwgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG1vZGUgPSBnZXRFeGVjdXRpb25Nb2RlKCk7XG4gKiBpZiAobW9kZSA9PT0gJ2ludGVyYWN0aXZlJykge1xuICogICAvLyBTaG93IHVzZXIgcHJvbXB0c1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeGVjdXRpb25Nb2RlKCk6ICdpbnRlcmFjdGl2ZScgfCAnYmFja2dyb3VuZCcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfWApO1xuICB9XG4gIGlmICh2YWx1ZSAhPT0gJ2ludGVyYWN0aXZlJyAmJiB2YWx1ZSAhPT0gJ2JhY2tncm91bmQnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9OiBleHBlY3RlZCAnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJywgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQVBJIGJhc2UgVVJMIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFVzZSB0aGlzIGFzIHRoZSBiYXNlIGZvciBjb25zdHJ1Y3RpbmcgQVBJIGVuZHBvaW50cy4gVGhlIFVSTCBkb2VzIG5vdCBpbmNsdWRlXG4gKiBhIHRyYWlsaW5nIHNsYXNoLlxuICogQHJldHVybnMgQmFzZSBVUkwgdXNlZCB0byBjb25zdHJ1Y3QgQ2FyZHMgQVBJIGVuZHBvaW50cyBmb3IgdGhpcyBleGVjdXRpb24uXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFQSV9CQVNFX1VSTCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYXBpVXJsID0gZ2V0QXBpQmFzZVVybCgpO1xuICogY29uc3QgZW5kcG9pbnQgPSBgJHthcGlVcmx9L2NhcmRzLyR7Y2FyZElkfWA7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUJhc2VVcmwoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkxdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQVBJIGFjY2VzcyB0b2tlbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBCZWFyZXIgdG9rZW4gdmFsaWQgZm9yIHRoZSBkdXJhdGlvbiBvZiB0aGlzIGFjdGlvbiBvciB0eXBlIGhvb2sgZXhlY3V0aW9uLlxuICogSW5jbHVkZSBpbiBBdXRob3JpemF0aW9uIGhlYWRlcnMgd2hlbiBjYWxsaW5nIHRoZSBDYXJkcyBBUEkuXG4gKiBAcmV0dXJucyBCZWFyZXIgdG9rZW4gdGhhdCBhdXRob3JpemVzIEFQSSByZXF1ZXN0cyBmb3IgdGhpcyBleGVjdXRpb24gY29udGV4dC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0FDQ0VTU19UT0tFTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdG9rZW4gPSBnZXRBcGlBY2Nlc3NUb2tlbigpO1xuICogY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChhcGlVcmwsIHtcbiAqICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dG9rZW59YCB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQWNjZXNzVG9rZW4oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU59YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjb25maWd1cmVkIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIE9wdGlvbmFsIHZhbHVlIGZyb20gY2FyZHMuY29kaW5nQWdlbnQgc2V0dGluZy4gV2hlbiBzZXQsIGluZGljYXRlcyB3aGljaCBBSVxuICogY29kaW5nIGFzc2lzdGFudCB0aGUgdXNlciBwcmVmZXJzLiBBY3Rpb25zIGNhbiB1c2UgdGhpcyB0byBjdXN0b21pemUgYmVoYXZpb3JcbiAqIG9yIHByb21wdHMgZm9yIGRpZmZlcmVudCBhZ2VudHMuXG4gKiBAcmV0dXJucyBUaGUgY29kaW5nIGFnZW50IGlkZW50aWZpZXIsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29kaW5nQWdlbnQgPSBnZXRDb2RpbmdBZ2VudCgpO1xuICogaWYgKGNvZGluZ0FnZW50ID09PSAnY2xhdWRlJykge1xuICogICAvLyBDdXN0b21pemUgZm9yIENsYXVkZVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb2RpbmdBZ2VudCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPRElOR19BR0VOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZSBmb3IgdHlwZSBob29rcy5cbiAqXG4gKiBUaGlzIHZhbHVlIGlzIG9ubHkgcHJlc2VudCBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqIEByZXR1cm5zIFRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBUWVBFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHR5cGVOYW1lID0gZ2V0VHlwZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBUeXBlOiAke3R5cGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlIHZlcnNpb24gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2ZXJzaW9uIGNvbWVzIGZyb20gdGhlIHR5cGUgY29uZmlndXJhdGlvbiBpbiBzZXR0aW5ncy5qc29uLlxuICogQHJldHVybnMgVGhlIHZlcnNpb24gc3RyaW5nIGZyb20gdHlwZSBjb25maWdcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9WRVJTSU9OIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB2ZXJzaW9uID0gZ2V0VHlwZVZlcnNpb24oKTtcbiAqIGNvbnNvbGUubG9nKGBWZXJzaW9uOiAke3ZlcnNpb259YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVWZXJzaW9uKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgbmFtZSBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmaWxlIG5hbWUgcmVsYXRpdmUgdG8gdGhlIHR5cGUgZGlyZWN0b3J5LCBub3QgYSBmdWxsIHBhdGguXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBuYW1lIHdpdGhpbiB0aGUgdHlwZSBkaXJlY3RvcnlcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlTmFtZSA9IGdldEZpbGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgRmlsZTogJHtmaWxlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgdHlwZWQgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmdWxseSByZXNvbHZlZCBwYXRoIG9uIGRpc2sgcHJvdmlkZWQgYnkgdGhlIGV4ZWN1dGlvbiB3cmFwcGVyLlxuICogQHJldHVybnMgVGhlIGZ1bGwgcGF0aCB0byB0aGUgZmlsZVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVQYXRoID0gZ2V0RmlsZVBhdGgoKTtcbiAqIGNvbnNvbGUubG9nKGBQYXRoOiAke2ZpbGVQYXRofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIHNpemUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIHZhbHVlIGlzIHBhcnNlZCBhcyBhIGJhc2UtMTAgaW50ZWdlci5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIHNpemUgaW4gYnl0ZXNcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9TSVpFIGlzIG1pc3Npbmcgb3Igbm90IGEgbnVtYmVyXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgc2l6ZSA9IGdldEZpbGVTaXplKCk7XG4gKiBjb25zb2xlLmxvZyhgU2l6ZTogJHtzaXplfSBieXRlc2ApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlU2l6ZSgpOiBudW1iZXIge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9YCk7XG4gIH1cbiAgY29uc3Qgc2l6ZSA9IE51bWJlci5wYXJzZUludCh2YWx1ZSwgMTApO1xuICBpZiAoTnVtYmVyLmlzTmFOKHNpemUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfTogZXhwZWN0ZWQgbnVtYmVyLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHNpemU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFNIQTI1NiBoYXNoIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFVzZWZ1bCBmb3IgZGV0ZWN0aW5nIGNvbnRlbnQgY2hhbmdlcyB3aXRob3V0IHJlYWRpbmcgdGhlIGZpbGUgYWdhaW4uXG4gKiBAcmV0dXJucyBUaGUgU0hBMjU2IGhhc2ggb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgU0hBMjU2IGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBoYXNoID0gZ2V0U2hhMjU2KCk7XG4gKiBjb25zb2xlLmxvZyhgSGFzaDogJHtoYXNofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTaGEyNTYoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TSEEyNTZdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU0hBMjU2fWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgTUlNRSB0eXBlIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFByb3ZpZGVkIGZvciB0eXBlIGhvb2sgZXZlbnRzIHNvIHZhbGlkYXRvcnMgY2FuIGJyYW5jaCBvbiBjb250ZW50IHR5cGUuXG4gKiBAcmV0dXJucyBUaGUgTUlNRSB0eXBlIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTlRFTlRfVFlQRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29udGVudFR5cGUgPSBnZXRDb250ZW50VHlwZSgpO1xuICogY29uc29sZS5sb2coYENvbnRlbnQgdHlwZTogJHtjb250ZW50VHlwZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29udGVudFR5cGUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIgcGF0aCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHNldCBieSB0aGUgZXh0ZW5zaW9uIGR1cmluZyBhY3RpdmF0aW9uIGFuZCBpbmplY3RlZCBpbnRvIGFsbFxuICogc3Bhd25lZCBhY3Rpb24vaG9vayBwcm9jZXNzZXMuIENvbmZpZ3VyYXRpb24gYXV0aG9ycyBjYW4gdXNlIGl0IHRvIGludm9rZVxuICogTm9kZS5qcyB3aXRob3V0IHJlbHlpbmcgb24gdGhlIHN5c3RlbSBQQVRILlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyXG4gKiBAdGhyb3dzIEVycm9yIGlmIFZTQ09ERV9OT0RFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBub2RlUGF0aCA9IGdldFZzY29kZU5vZGVQYXRoKCk7XG4gKiBleGVjRmlsZVN5bmMobm9kZVBhdGgsIFsnc2NyaXB0LmpzJ10pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRWc2NvZGVOb2RlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlZTQ09ERV9OT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlZTQ09ERV9OT0RFfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVW5peCBkb21haW4gc29ja2V0IHBhdGggZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICpcbiAqIEByZXR1cm5zIFVuaXggc29ja2V0IHBhdGggdXNlZCB0byBzZW5kIHJ1bnRpbWUgY29udHJvbCBtZXNzYWdlcy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgU09DS0VUX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U29ja2V0UGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcGF0aCB0byB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogVGhpcyBpcyBvcHRpb25hbCBcdTIwMTQgcmV0dXJucyB1bmRlZmluZWQgd2hlbiBub3Qgc2V0IChpLmUuLCB0aGUgYWN0aW9uXG4gKiB3YXMgbm90IHJlbGF1bmNoZWQgdmlhIHN3aXRjaFRvSW50ZXJhY3RpdmUpLlxuICpcbiAqIEByZXR1cm5zIFRoZSBmaWxlIHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YVBhdGgoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHNldHRpbmdzIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5IGNvbnRhaW5pbmcgZ2VuZXJhdGVkIHNldHRpbmdzIGFydGlmYWN0cy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09ORklHX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgd29ya3NwYWNlIHBhdGggc2V0IGJ5IHRoZSBhY3Rpb24gaGFuZGxlciAoZS5nLiwgdGhlIHdvcmt0cmVlIHBhdGgpLlxuICpcbiAqIFRoaXMgaXMgZm9yIGhvb2tzIHJ1bm5pbmcgaW5zaWRlIHRoZSBDbGF1ZGUgQ0xJLCAqKm5vdCoqIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKiBBY3Rpb24gaGFuZGxlcnMgc2hvdWxkIHVzZSB7QGxpbmsgZ2V0UmVwb1Jvb3R9IGluc3RlYWQuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgYWN0aXZlIHdvcmtzcGFjZSAvIHdvcmt0cmVlLlxuICogQHRocm93cyBFcnJvciBpZiBXT1JLU1BBQ0VfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRXb3Jrc3BhY2VQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgcGF0aC5cbiAqXG4gKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgdXNlZCBieSBhY3Rpb24gaGFuZGxlcnMgdG8gcmVzb2x2ZSB3b3JrdHJlZXNcbiAqIGFuZCBwZXJmb3JtIGdpdCBvcGVyYXRpb25zIGFnYWluc3QgdGhlIG1haW4gcmVwb3NpdG9yeS5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgKE5PVCBhIHdvcmt0cmVlKS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgUkVQT19ST09UIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFJlcG9Sb290KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuUkVQT19ST09UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlJFUE9fUk9PVH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGNhcmQncyByZXBvc2l0b3J5IGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIHJlcG9zaXRvcnkgYXNzb2NpYXRlZCB3aXRoIHRoZSBhY3RpdmUgY2FyZC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0FSRF9SRVBPX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FyZFJlcG9QYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ0FSRF9SRVBPX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ0FSRF9SRVBPX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5IHBhdGguXG4gKlxuICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBjb250ZXh0LmV4dGVuc2lvblVyaS5mc1BhdGhgIGFuZCBpbmplY3RlZFxuICogaW50byBhbGwgc3Bhd25lZCBhY3Rpb24gcHJvY2Vzc2VzLiBVc2UgdGhpcyB0byBsb2NhdGUgYnVuZGxlZCBhc3NldHMgc3VjaFxuICogYXMgdGhlIHJ1bnRpbWUgcGx1Z2luIGRpcmVjdG9yeSAoYDxleHRlbnNpb25QYXRoPi9kaXN0L3BsdWdpbnMvcnVudGltZWApLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5LlxuICogQHRocm93cyBFcnJvciBpZiBFWFRFTlNJT05fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHRlbnNpb25QYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIGFuZCBwYXJzZXMgdGhlIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmaWxlLlxuICpcbiAqIFdoZW4gYFNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhgIGlzIHNldCwgcmVhZHMgdGhlIGZpbGUgYXQgdGhhdCBwYXRoXG4gKiBhbmQgcGFyc2VzIGl0IGFzIEpTT04uIFJldHVybnMgdW5kZWZpbmVkIGlmIHRoZSBlbnYgdmFyIGlzIG5vdCBzZXQuXG4gKlxuICogQHJldHVybnMgVGhlIHBhcnNlZCBkYXRhLCBvciB1bmRlZmluZWQgaWYgdGhlIHBhdGggaXMgbm90IHNldFxuICogQHRocm93cyBFcnJvciBpZiB0aGUgZmlsZSBjYW5ub3QgYmUgcmVhZCBvciBjb250YWlucyBpbnZhbGlkIEpTT05cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSgpOiB1bmtub3duIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgZGF0YVBhdGggPSBnZXRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YVBhdGgoKTtcbiAgaWYgKGRhdGFQYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoZGF0YVBhdGgsICd1dGYtOCcpO1xuICByZXR1cm4gSlNPTi5wYXJzZShjb250ZW50KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVHlwZWQgSW5wdXQgRXh0cmFjdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEJ1aWxkcyBhIHR5cGVkIGFjdGlvbiBpbnB1dCBvYmplY3QgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogRXh0cmFjdHMgYWxsIGZpZWxkcyByZXF1aXJlZCBmb3IgYWN0aW9uIGhhbmRsZXJzLlxuICpcbiAqIEByZXR1cm5zIFR5cGVkIEFjdGlvbklucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGFuIGFjdGlvbiBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RBY3Rpb25JbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQuY2FyZElkKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmV4ZWN1dGlvbk1vZGUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QWN0aW9uSW5wdXQoKTogQWN0aW9uSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgYWN0aW9uTmFtZTogZ2V0QWN0aW9uTmFtZSgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIGV4ZWN1dGlvbk1vZGU6IGdldEV4ZWN1dGlvbk1vZGUoKSxcbiAgICBhcGlCYXNlVXJsOiBnZXRBcGlCYXNlVXJsKCksXG4gICAgYXBpQWNjZXNzVG9rZW46IGdldEFwaUFjY2Vzc1Rva2VuKCksXG4gICAgY29kaW5nQWdlbnQ6IGdldENvZGluZ0FnZW50KCksXG4gICAgc3dpdGNoVG9JbnRlcmFjdGl2ZURhdGE6IHJlYWRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSgpLFxuICAgIHJlcG9Sb290OiBnZXRSZXBvUm9vdCgpLFxuICAgIGNhcmRSZXBvUGF0aDogZ2V0Q2FyZFJlcG9QYXRoKCksXG4gICAgY29uZmlnUGF0aDogZ2V0Q29uZmlnUGF0aCgpLFxuICAgIGV4dGVuc2lvblBhdGg6IGdldEV4dGVuc2lvblBhdGgoKVxuICB9O1xufVxuXG4vKipcbiAqIEJ1aWxkcyBhIHR5cGVkIHR5cGUgaG9vayBpbnB1dCBvYmplY3QgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogRXh0cmFjdHMgYWxsIGZpZWxkcyByZXF1aXJlZCBmb3IgdHlwZSBsaWZlY3ljbGUgaG9va3MgKHZhbGlkYXRvciwgY3JlYXRlLFxuICogdXBkYXRlLCBkZWxldGUpLlxuICpcbiAqIEByZXR1cm5zIFR5cGVkIFR5cGVIb29rSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYSB0eXBlIGhvb2sgaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0VHlwZUlucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC50eXBlTmFtZSk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5maWxlTmFtZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RUeXBlSW5wdXQoKTogVHlwZUhvb2tJbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICB0eXBlTmFtZTogZ2V0VHlwZU5hbWUoKSxcbiAgICB0eXBlVmVyc2lvbjogZ2V0VHlwZVZlcnNpb24oKSxcbiAgICBmaWxlTmFtZTogZ2V0RmlsZU5hbWUoKSxcbiAgICBmaWxlUGF0aDogZ2V0RmlsZVBhdGgoKSxcbiAgICBmaWxlU2l6ZTogZ2V0RmlsZVNpemUoKSxcbiAgICBmaWxlU2hhMjU2OiBnZXRTaGEyNTYoKSxcbiAgICBjb250ZW50VHlwZTogZ2V0Q29udGVudFR5cGUoKSxcbiAgICBhcGlCYXNlVXJsOiBnZXRBcGlCYXNlVXJsKCksXG4gICAgYXBpQWNjZXNzVG9rZW46IGdldEFwaUFjY2Vzc1Rva2VuKClcbiAgfTtcbn1cbiIsICIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZWQgYWNjZXNzIHRvIENsYXVkZSBDb2RlJ3MgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCB1dGlsaXRpZXNcbiAqIGZvciBwZXJzaXN0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcyBpbiBTZXNzaW9uU3RhcnQgaG9va3MuXG4gKlxuICogIyMgRW52aXJvbm1lbnQgVmFyaWFibGVzXG4gKlxuICogQ2xhdWRlIENvZGUgc2V0cyB0aGVzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgd2hlbiBydW5uaW5nIGhvb2tzOlxuICpcbiAqIHwgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8IEF2YWlsYWJsZSBJbiB8XG4gKiB8LS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tfFxuICogfCBgQ0xBVURFX1BST0pFQ1RfRElSYCB8IEFic29sdXRlIHBhdGggdG8gcHJvamVjdCByb290IHwgQWxsIGhvb2tzIHxcbiAqIHwgYENMQVVERV9FTlZfRklMRWAgfCBQYXRoIHRvIGZpbGUgZm9yIHBlcnNpc3RpbmcgZW52IHZhcnMgfCBTZXNzaW9uU3RhcnQgb25seSB8XG4gKiB8IGBDTEFVREVfQ09ERV9SRU1PVEVgIHwgYFwidHJ1ZVwiYCBpZiBydW5uaW5nIHJlbW90ZWx5IHwgQWxsIGhvb2tzIHxcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBnZXRQcm9qZWN0RGlyLCBwZXJzaXN0RW52VmFyLCBpc1JlbW90ZUVudmlyb25tZW50IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBHZXQgcHJvamVjdCBkaXJlY3RvcnlcbiAqIGNvbnN0IHByb2plY3REaXIgPSBnZXRQcm9qZWN0RGlyKCk7XG4gKlxuICogLy8gQ2hlY2sgaWYgcnVubmluZyByZW1vdGVseVxuICogaWYgKGlzUmVtb3RlRW52aXJvbm1lbnQoKSkge1xuICogICAvLyBIYW5kbGUgcmVtb3RlLXNwZWNpZmljIGxvZ2ljXG4gKiB9XG4gKlxuICogLy8gSW4gU2Vzc2lvblN0YXJ0IGhvb2s6IHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdwcm9kdWN0aW9uJyk7XG4gKiBwZXJzaXN0RW52VmFyKCdBUElfS0VZJywgJ3NlY3JldC1rZXknKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stZXhlY3V0aW9uLWRldGFpbHNcbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcIm5vZGU6ZnNcIjtcbi8qKlxuICogQ2xhdWRlIENvZGUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMuXG4gKlxuICogVGhlc2UgYXJlIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgdGhhdCBDbGF1ZGUgQ29kZSBzZXRzIHdoZW4gcnVubmluZyBob29rcy5cbiAqL1xuZXhwb3J0IGNvbnN0IENMQVVERV9FTlZfVkFSUyA9IHtcbiAgICAvKipcbiAgICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBwcm9qZWN0IHJvb3QgZGlyZWN0b3J5IHdoZXJlIENsYXVkZSBDb2RlIHdhcyBzdGFydGVkLlxuICAgICAqIEF2YWlsYWJsZSBpbiBhbGwgaG9va3MuXG4gICAgICovXG4gICAgUFJPSkVDVF9ESVI6IFwiQ0xBVURFX1BST0pFQ1RfRElSXCIsXG4gICAgLyoqXG4gICAgICogUGF0aCB0byBhIGZpbGUgd2hlcmUgU2Vzc2lvblN0YXJ0IGhvb2tzIGNhbiBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAgICAgKiBWYXJpYWJsZXMgd3JpdHRlbiB0byB0aGlzIGZpbGUgd2lsbCBiZSBhdmFpbGFibGUgaW4gYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcy5cbiAgICAgKiBPbmx5IGF2YWlsYWJsZSBpbiBTZXNzaW9uU3RhcnQgaG9va3MuXG4gICAgICovXG4gICAgRU5WX0ZJTEU6IFwiQ0xBVURFX0VOVl9GSUxFXCIsXG4gICAgLyoqXG4gICAgICogU2V0IHRvIFwidHJ1ZVwiIHdoZW4gcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAgICAgKiBOb3Qgc2V0IG9yIGVtcHR5IHdoZW4gcnVubmluZyBpbiBsb2NhbCBDTEkgZW52aXJvbm1lbnQuXG4gICAgICovXG4gICAgUkVNT1RFOiBcIkNMQVVERV9DT0RFX1JFTU9URVwiLFxufTtcbi8qKlxuICogR2V0cyB0aGUgQ2xhdWRlIENvZGUgcHJvamVjdCBkaXJlY3RvcnkuXG4gKlxuICogVGhpcyBpcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcHJvamVjdCByb290IHdoZXJlIENsYXVkZSBDb2RlIHdhcyBzdGFydGVkLlxuICogVGhlIHZhbHVlIGNvbWVzIGZyb20gdGhlIGBDTEFVREVfUFJPSkVDVF9ESVJgIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICogQHJldHVybnMgVGhlIHByb2plY3QgZGlyZWN0b3J5IHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqIGlmIChwcm9qZWN0RGlyKSB7XG4gKiAgIGNvbnN0IGNvbmZpZ1BhdGggPSBgJHtwcm9qZWN0RGlyfS8uY2xhdWRlL2NvbmZpZy5qc29uYDtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdERpcigpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLlBST0pFQ1RfRElSXTtcbn1cbi8qKlxuICogR2V0cyB0aGUgQ2xhdWRlIENvZGUgZW52IGZpbGUgcGF0aCBmb3IgcGVyc2lzdGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogVGhpcyBpcyBvbmx5IGF2YWlsYWJsZSBpbiBTZXNzaW9uU3RhcnQgaG9va3MuIFRoZSBwYXRoIHBvaW50cyB0byBhIGZpbGVcbiAqIHdoZXJlIHlvdSBjYW4gd3JpdGUgc2hlbGwgZXhwb3J0IHN0YXRlbWVudHMgdG8gcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIGZvciBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzIGluIHRoZSBzZXNzaW9uLlxuICogQHJldHVybnMgVGhlIGVudiBmaWxlIHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0IChub3QgYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZGaWxlID0gZ2V0RW52RmlsZVBhdGgoKTtcbiAqIGlmIChlbnZGaWxlKSB7XG4gKiAgIC8vIFdlJ3JlIGluIGEgU2Vzc2lvblN0YXJ0IGhvb2sgYW5kIGNhbiBwZXJzaXN0IGVudiB2YXJzXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ01ZX1ZBUicsICdteS12YWx1ZScpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZGaWxlUGF0aCgpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLkVOVl9GSUxFXTtcbn1cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBob29rIGlzIHJ1bm5pbmcgaW4gYSByZW1vdGUgKHdlYikgZW52aXJvbm1lbnQuXG4gKlxuICogUmVtb3RlIGVudmlyb25tZW50cyBtYXkgaGF2ZSBkaWZmZXJlbnQgY2FwYWJpbGl0aWVzIG9yIHJlc3RyaWN0aW9uc1xuICogY29tcGFyZWQgdG8gbG9jYWwgQ0xJIGVudmlyb25tZW50cy5cbiAqIEByZXR1cm5zIHRydWUgaWYgcnVubmluZyByZW1vdGVseSwgZmFsc2UgaWYgcnVubmluZyBsb2NhbGx5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzUmVtb3RlRW52aXJvbm1lbnQoKSkge1xuICogICAvLyBVc2Ugd2ViLWNvbXBhdGlibGUgYXBwcm9hY2hlc1xuICogfSBlbHNlIHtcbiAqICAgLy8gQ2FuIHVzZSBsb2NhbCBDTEkgZmVhdHVyZXNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNSZW1vdGVFbnZpcm9ubWVudCgpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLlJFTU9URV0gPT09IFwidHJ1ZVwiO1xufVxuLyoqXG4gKiBQZXJzaXN0cyBhbiBlbnZpcm9ubWVudCB2YXJpYWJsZSBmb3IgdXNlIGluIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdyaXRlcyBhIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnQgdG8gdGhlIGBDTEFVREVfRU5WX0ZJTEVgLFxuICogd2hpY2ggQ2xhdWRlIENvZGUgc291cmNlcyBiZWZvcmUgcnVubmluZyBiYXNoIGNvbW1hbmRzLiBUaGlzIGFsbG93c1xuICogU2Vzc2lvblN0YXJ0IGhvb2tzIHRvIGNvbmZpZ3VyZSB0aGUgZW52aXJvbm1lbnQgZm9yIHRoZSBlbnRpcmUgc2Vzc2lvbi5cbiAqXG4gKiAqKkltcG9ydGFudCoqOiBUaGlzIGZ1bmN0aW9uIG9ubHkgd29ya3MgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzIHdoZXJlXG4gKiBgQ0xBVURFX0VOVl9GSUxFYCBpcyBzZXQuIEluIG90aGVyIGhvb2tzLCBpdCB3aWxsIHRocm93IGFuIGVycm9yLlxuICogQHBhcmFtIG5hbWUgLSBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZVxuICogQHBhcmFtIHZhbHVlIC0gVGhlIGVudmlyb25tZW50IHZhcmlhYmxlIHZhbHVlICh3aWxsIGJlIHNoZWxsLWVzY2FwZWQpXG4gKiBAdGhyb3dzIEVycm9yIGlmIENMQVVERV9FTlZfRklMRSBpcyBub3Qgc2V0IChub3QgaW4gYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uU3RhcnRIb29rLCBzZXNzaW9uU3RhcnRPdXRwdXQsIHBlcnNpc3RFbnZWYXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCkgPT4ge1xuICogICAvLyBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgdGhlIHNlc3Npb25cbiAqICAgcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAncHJvZHVjdGlvbicpO1xuICogICBwZXJzaXN0RW52VmFyKCdBUElfS0VZJywgcHJvY2Vzcy5lbnYuTVlfQVBJX0tFWSA/PyAnZGVmYXVsdCcpO1xuICogICBwZXJzaXN0RW52VmFyKCdQQVRIJywgYCR7cHJvY2Vzcy5lbnYuUEFUSH06Li9ub2RlX21vZHVsZXMvLmJpbmApO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3BlcnNpc3RpbmctZW52aXJvbm1lbnQtdmFyaWFibGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJzaXN0RW52VmFyKG5hbWUsIHZhbHVlKSB7XG4gICAgY29uc3QgZW52RmlsZSA9IGdldEVudkZpbGVQYXRoKCk7XG4gICAgaWYgKGVudkZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZXJzaXN0RW52VmFyIGNhbiBvbmx5IGJlIHVzZWQgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLiBcIiArIFwiQ0xBVURFX0VOVl9GSUxFIGVudmlyb25tZW50IHZhcmlhYmxlIGlzIG5vdCBzZXQuXCIpO1xuICAgIH1cbiAgICAvLyBTaGVsbC1lc2NhcGUgdGhlIHZhbHVlIHRvIGhhbmRsZSBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICBjb25zdCBlc2NhcGVkVmFsdWUgPSBlc2NhcGVTaGVsbFZhbHVlKHZhbHVlKTtcbiAgICAvLyBXcml0ZSB0aGUgZXhwb3J0IHN0YXRlbWVudFxuICAgIGNvbnN0IGV4cG9ydFN0YXRlbWVudCA9IGBleHBvcnQgJHtuYW1lfT0ke2VzY2FwZWRWYWx1ZX1cXG5gO1xuICAgIGZzLmFwcGVuZEZpbGVTeW5jKGVudkZpbGUsIGV4cG9ydFN0YXRlbWVudCwgXCJ1dGYtOFwiKTtcbn1cbi8qKlxuICogUGVyc2lzdHMgbXVsdGlwbGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIGF0IG9uY2UuXG4gKlxuICogVGhpcyBpcyBhIGNvbnZlbmllbmNlIHdyYXBwZXIgYXJvdW5kIGBwZXJzaXN0RW52VmFyYCBmb3Igc2V0dGluZ1xuICogbXVsdGlwbGUgdmFyaWFibGVzIGluIGEgc2luZ2xlIGNhbGwuXG4gKiBAcGFyYW0gdmFycyAtIE9iamVjdCBtYXBwaW5nIHZhcmlhYmxlIG5hbWVzIHRvIHZhbHVlc1xuICogQHRocm93cyBFcnJvciBpZiBDTEFVREVfRU5WX0ZJTEUgaXMgbm90IHNldCAobm90IGluIGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcGVyc2lzdEVudlZhcnMoe1xuICogICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICogICBBUElfS0VZOiAnc2VjcmV0JyxcbiAqICAgREVCVUc6ICdmYWxzZSdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJzaXN0RW52VmFycyh2YXJzKSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHZhcnMpKSB7XG4gICAgICAgIHBlcnNpc3RFbnZWYXIobmFtZSwgdmFsdWUpO1xuICAgIH1cbn1cbi8qKlxuICogRXNjYXBlcyBhIHZhbHVlIGZvciBzYWZlIHVzZSBpbiBhIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnQuXG4gKlxuICogVXNlcyBzaW5nbGUgcXVvdGVzIGFuZCBlc2NhcGVzIGFueSBlbWJlZGRlZCBzaW5nbGUgcXVvdGVzLlxuICogVGhpcyBwcmV2ZW50cyBzaGVsbCBpbmplY3Rpb24gYW5kIGhhbmRsZXMgc3BlY2lhbCBjaGFyYWN0ZXJzLlxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGVzY2FwZVxuICogQHJldHVybnMgVGhlIHNoZWxsLWVzY2FwZWQgdmFsdWUgKHdpdGggcXVvdGVzKVxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZVNoZWxsVmFsdWUodmFsdWUpIHtcbiAgICAvLyBVc2Ugc2luZ2xlIHF1b3RlcyBhbmQgZXNjYXBlIGFueSBlbWJlZGRlZCBzaW5nbGUgcXVvdGVzXG4gICAgLy8gJ3ZhbHVlJyAtPiAndmFsJ1xcJyd1ZScgZm9yIHZhbHVlcyBjb250YWluaW5nIHNpbmdsZSBxdW90ZXNcbiAgICBjb25zdCBlc2NhcGVkID0gdmFsdWUucmVwbGFjZSgvJy9nLCBcIidcXFxcJydcIik7XG4gICAgcmV0dXJuIGAnJHtlc2NhcGVkfSdgO1xufVxuIiwgIi8qKlxuICogSG9vayBmYWN0b3J5IGZ1bmN0aW9ucyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZWQgZmFjdG9yeSBmdW5jdGlvbnMgZm9yIGFsbCAxMiBob29rIHR5cGVzIHRoYXQgaGFuZGxlOlxuICogLSBJbnB1dCB0eXBlIG5hcnJvd2luZyBiYXNlZCBvbiBob29rIGV2ZW50IHR5cGVcbiAqIC0gT3V0cHV0IHR5cGUgZW5mb3JjZW1lbnQgdmlhIHJldHVybiB0eXBlc1xuICogLSBFcnJvciB3cmFwcGluZyB3aXRoIGF1dG9tYXRpYyBsb2dnaW5nXG4gKiAtIExvZ2dlciBjb250ZXh0IGluamVjdGlvblxuICpcbiAqIEVhY2ggZmFjdG9yeSBhY2NlcHRzIGEgSG9va0NvbmZpZyB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXQgc2V0dGluZ3MsXG4gKiBhbmQgcmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgdGhlIHJ1bnRpbWUgaW52b2tlcyB3aGVuIHRoZSBob29rIGZpbGUgZXhlY3V0ZXMuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcHJlVG9vbFVzZUhvb2ssIHByZVRvb2xVc2VPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnUHJvY2Vzc2luZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gR2VuZXJpYyBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBob29rIGZhY3RvcnkgZnVuY3Rpb24gZm9yIGEgc3BlY2lmaWMgaG9vayB0eXBlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGludGVybmFsIGltcGxlbWVudGF0aW9uIHVzZWQgYnkgYWxsIHR5cGVkIGZhY3Rvcmllcy5cbiAqIEl0IHdyYXBzIHRoZSBoYW5kbGVyIHdpdGggZXJyb3IgY2F0Y2hpbmcgYW5kIGxvZ2dpbmcuXG4gKiBAcGFyYW0gaG9va0V2ZW50TmFtZSAtIFRoZSBob29rIGV2ZW50IG5hbWVcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb25cbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gd3JhcFxuICogQHJldHVybnMgQSB3cmFwcGVkIGhvb2sgZnVuY3Rpb25cbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVIb29rRnVuY3Rpb24oaG9va0V2ZW50TmFtZSwgY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgY29uc3QgaG9va0ZuID0gYXN5bmMgKGlucHV0LCBjb250ZXh0KSA9PiB7XG4gICAgICAgIC8vIERlbGVnYXRlIGVycm9yIGhhbmRsaW5nIHRvIHRoZSBydW50aW1lIC0ganVzdCBleGVjdXRlIHRoZSBoYW5kbGVyXG4gICAgICAgIC8vIFRoZSBydW50aW1lIHdpbGwgY2F0Y2ggZXJyb3JzLCBsb2cgdGhlbSwgYW5kIHJldHVybiBhcHByb3ByaWF0ZSBvdXRwdXRcbiAgICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZXIoaW5wdXQsIGNvbnRleHQpO1xuICAgIH07XG4gICAgLy8gQXR0YWNoIG1ldGFkYXRhIGZvciBydW50aW1lIGluc3BlY3Rpb25cbiAgICBob29rRm4uaG9va0V2ZW50TmFtZSA9IGhvb2tFdmVudE5hbWU7XG4gICAgaG9va0ZuLm1hdGNoZXIgPSBjb25maWcubWF0Y2hlcjtcbiAgICBob29rRm4udGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuICAgIHJldHVybiBob29rRm47XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVUb29sVXNlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUHJlVG9vbFVzZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdFRvb2xVc2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQb3N0VG9vbFVzZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdFRvb2xVc2VGYWlsdXJlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUG9zdFRvb2xVc2VGYWlsdXJlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBOb3RpZmljYXRpb24gSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBOb3RpZmljYXRpb24gaG9vayBoYW5kbGVyLlxuICpcbiAqIE5vdGlmaWNhdGlvbiBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgc2VuZHMgYSBub3RpZmljYXRpb24sIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gRm9yd2FyZCBub3RpZmljYXRpb25zIHRvIGV4dGVybmFsIHN5c3RlbXNcbiAqIC0gTG9nIGltcG9ydGFudCBldmVudHNcbiAqIC0gVHJpZ2dlciBjdXN0b20gYWxlcnRpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBub3RpZmljYXRpb25fdHlwZWBcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBub3RpZmljYXRpb25Ib29rLCBub3RpZmljYXRpb25PdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEZvcndhcmQgbm90aWZpY2F0aW9ucyB0byBTbGFja1xuICogZXhwb3J0IGRlZmF1bHQgbm90aWZpY2F0aW9uSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdOb3RpZmljYXRpb24gcmVjZWl2ZWQnLCB7XG4gKiAgICAgdHlwZTogaW5wdXQubm90aWZpY2F0aW9uX3R5cGUsXG4gKiAgICAgdGl0bGU6IGlucHV0LnRpdGxlXG4gKiAgIH0pO1xuICpcbiAqICAgYXdhaXQgc2VuZFNsYWNrTWVzc2FnZShpbnB1dC50aXRsZSA/PyAnTm90aWZpY2F0aW9uJywgaW5wdXQubWVzc2FnZSk7XG4gKlxuICogICByZXR1cm4gbm90aWZpY2F0aW9uT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjbm90aWZpY2F0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RpZmljYXRpb25Ib29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJOb3RpZmljYXRpb25cIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFVzZXJQcm9tcHRTdWJtaXQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBVc2VyUHJvbXB0U3VibWl0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBVc2VyUHJvbXB0U3VibWl0IGhvb2tzIGZpcmUgd2hlbiBhIHVzZXIgc3VibWl0cyBhIHByb21wdCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBBZGQgYWRkaXRpb25hbCBjb250ZXh0IG9yIGluc3RydWN0aW9uc1xuICogLSBMb2cgdXNlciBpbnRlcmFjdGlvbnNcbiAqIC0gVmFsaWRhdGUgb3IgdHJhbnNmb3JtIHByb21wdHNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHByb21wdCBzdWJtaXNzaW9uc1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHVzZXJQcm9tcHRTdWJtaXRIb29rLCB1c2VyUHJvbXB0U3VibWl0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBBZGQgcHJvamVjdCBjb250ZXh0IHRvIGV2ZXJ5IHByb21wdFxuICogZXhwb3J0IGRlZmF1bHQgdXNlclByb21wdFN1Ym1pdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuZGVidWcoJ1VzZXIgcHJvbXB0IHN1Ym1pdHRlZCcsIHsgcHJvbXB0TGVuZ3RoOiBpbnB1dC5wcm9tcHQubGVuZ3RoIH0pO1xuICpcbiAqICAgY29uc3QgcHJvamVjdENvbnRleHQgPSBhd2FpdCBnZXRQcm9qZWN0Q29udGV4dCgpO1xuICpcbiAqICAgcmV0dXJuIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQoe1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiBwcm9qZWN0Q29udGV4dFxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdXNlcnByb21wdHN1Ym1pdFxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlclByb21wdFN1Ym1pdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlVzZXJQcm9tcHRTdWJtaXRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNlc3Npb25TdGFydCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNlc3Npb25TdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU2Vzc2lvblN0YXJ0IGhvb2tzIGZpcmUgd2hlbiBhIENsYXVkZSBDb2RlIHNlc3Npb24gc3RhcnRzIG9yIHJlc3RhcnRzLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBJbml0aWFsaXplIHNlc3Npb24gc3RhdGVcbiAqIC0gSW5qZWN0IGNvbnRleHQgb3IgaW5zdHJ1Y3Rpb25zXG4gKiAtIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHNcbiAqIC0gU2V0IHVwIGxvZ2dpbmcgb3IgbW9uaXRvcmluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHNvdXJjZWAgKCdzdGFydHVwJywgJ3Jlc3VtZScsICdjbGVhcicsICdjb21wYWN0JylcbiAqXG4gKiAqKkNvbnRleHQqKjogU2Vzc2lvblN0YXJ0IGhvb2tzIHJlY2VpdmUgYW4gZXh0ZW5kZWQgY29udGV4dCB3aXRoIGBwZXJzaXN0RW52VmFyYFxuICogYW5kIGBwZXJzaXN0RW52VmFyc2AgZnVuY3Rpb25zIGZvciBzZXR0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uU3RhcnRIb29rLCBzZXNzaW9uU3RhcnRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0aGUgc2Vzc2lvblxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7IG1hdGNoZXI6ICdzdGFydHVwJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyLCBwZXJzaXN0RW52VmFyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ05ldyBzZXNzaW9uIHN0YXJ0ZWQnLCB7XG4gKiAgICAgc2Vzc2lvbklkOiBpbnB1dC5zZXNzaW9uX2lkLFxuICogICAgIGN3ZDogaW5wdXQuY3dkXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gU2V0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kc1xuICogICBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdkZXZlbG9wbWVudCcpO1xuICogICBwZXJzaXN0RW52VmFyKCdERUJVRycsICd0cnVlJyk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gU2V0IG11bHRpcGxlIGVudmlyb25tZW50IHZhcmlhYmxlcyBhdCBvbmNlXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgcGVyc2lzdEVudlZhcnMgfSkgPT4ge1xuICogICBwZXJzaXN0RW52VmFycyh7XG4gKiAgICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAqICAgICBBUElfS0VZOiAnc2VjcmV0JyxcbiAqICAgICBERUJVRzogJ2ZhbHNlJ1xuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXNzaW9uc3RhcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlc3Npb25TdGFydEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNlc3Npb25TdGFydFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2Vzc2lvbkVuZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNlc3Npb25FbmQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNlc3Npb25FbmQgaG9va3MgZmlyZSB3aGVuIGEgQ2xhdWRlIENvZGUgc2Vzc2lvbiBlbmRzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENsZWFuIHVwIHNlc3Npb24gcmVzb3VyY2VzXG4gKiAtIExvZyBzZXNzaW9uIG1ldHJpY3NcbiAqIC0gUGVyc2lzdCBzZXNzaW9uIHN0YXRlXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgcmVhc29uYCAodGhlIGV4aXQgcmVhc29uIHN0cmluZylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uRW5kSG9vaywgc2Vzc2lvbkVuZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHNlc3Npb24gZW5kIGFuZCBjbGVhbiB1cFxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvbkVuZEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU2Vzc2lvbiBlbmRlZCcsIHtcbiAqICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gKiAgICAgcmVhc29uOiBpbnB1dC5yZWFzb25cbiAqICAgfSk7XG4gKlxuICogICBhd2FpdCBjbGVhbnVwU2Vzc2lvblJlc291cmNlcyhpbnB1dC5zZXNzaW9uX2lkKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uRW5kT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbmVuZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvbkVuZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNlc3Npb25FbmRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN0b3AgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdG9wIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBpcyBhYm91dCB0byBzdG9wLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdG9wIGFuZCByZXF1aXJlIGFkZGl0aW9uYWwgYWN0aW9uXG4gKiAtIENvbmZpcm0gdGhlIHVzZXIgd2FudHMgdG8gc3RvcFxuICogLSBDbGVhbiB1cCByZXNvdXJjZXMgYmVmb3JlIHN0b3BwaW5nXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBzdG9wIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN0b3BIb29rLCBzdG9wT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBCbG9jayBzdG9wIGlmIHRoZXJlIGFyZSBwZW5kaW5nIGNoYW5nZXNcbiAqIGV4cG9ydCBkZWZhdWx0IHN0b3BIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgY29uc3QgcGVuZGluZ0NoYW5nZXMgPSBhd2FpdCBjaGVja1BlbmRpbmdDaGFuZ2VzKCk7XG4gKlxuICogICBpZiAocGVuZGluZ0NoYW5nZXMubGVuZ3RoID4gMCkge1xuICogICAgIGxvZ2dlci53YXJuKCdCbG9ja2luZyBzdG9wIGR1ZSB0byBwZW5kaW5nIGNoYW5nZXMnLCB7XG4gKiAgICAgICBjb3VudDogcGVuZGluZ0NoYW5nZXMubGVuZ3RoXG4gKiAgICAgfSk7XG4gKlxuICogICAgIHJldHVybiBzdG9wT3V0cHV0KHtcbiAqICAgICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICAgICAgcmVhc29uOiBgVGhlcmUgYXJlICR7cGVuZGluZ0NoYW5nZXMubGVuZ3RofSB1bmNvbW1pdHRlZCBjaGFuZ2VzYCxcbiAqICAgICAgIHN5c3RlbU1lc3NhZ2U6ICdQbGVhc2UgY29tbWl0IG9yIGRpc2NhcmQgY2hhbmdlcyBiZWZvcmUgc3RvcHBpbmcnXG4gKiAgICAgfSk7XG4gKiAgIH1cbiAqXG4gKiAgIGxvZ2dlci5pbmZvKCdBcHByb3Zpbmcgc3RvcCcpO1xuICogICByZXR1cm4gc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N0b3BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3BIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdG9wXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdG9wRmFpbHVyZSBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN0b3BGYWlsdXJlIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdG9wRmFpbHVyZSBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgZW5jb3VudGVycyBhbiBlcnJvciB3aGlsZSBzdG9wcGluZ1xuICogKGUuZy4sIEFQSSBlcnJvcnMsIGF1dGhlbnRpY2F0aW9uIGZhaWx1cmVzLCByYXRlIGxpbWl0cyksIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gTG9nIHN0b3AgZmFpbHVyZSBldmVudHMgYW5kIGVycm9yIGRldGFpbHNcbiAqIC0gQWxlcnQgb24gdW5leHBlY3RlZCBzZXNzaW9uIHRlcm1pbmF0aW9uIGVycm9yc1xuICogLSBPYnNlcnZlIHdoYXQgZXJyb3IgY2F1c2VkIHRoZSBmYWlsdXJlXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBzdG9wIGZhaWx1cmUgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3RvcEZhaWx1cmVIb29rLCBzdG9wRmFpbHVyZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgc3RvcEZhaWx1cmVIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmVycm9yKCdTZXNzaW9uIHN0b3BwZWQgZHVlIHRvIGVycm9yJywge1xuICogICAgIGVycm9yOiBpbnB1dC5lcnJvcixcbiAqICAgICBkZXRhaWxzOiBpbnB1dC5lcnJvcl9kZXRhaWxzXG4gKiAgIH0pO1xuICogICByZXR1cm4gc3RvcEZhaWx1cmVPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdG9wZmFpbHVyZVxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcEZhaWx1cmVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdG9wRmFpbHVyZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3ViYWdlbnRTdGFydCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN1YmFnZW50U3RhcnQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN1YmFnZW50U3RhcnQgaG9va3MgZmlyZSB3aGVuIGEgc3ViYWdlbnQgKEFnZW50IHRvb2wpIHN0YXJ0cywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBJbmplY3QgY29udGV4dCBmb3IgdGhlIHN1YmFnZW50XG4gKiAtIExvZyBzdWJhZ2VudCBpbnZvY2F0aW9uc1xuICogLSBDb25maWd1cmUgc3ViYWdlbnQgYmVoYXZpb3JcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBhZ2VudF90eXBlYCAoZS5nLiwgJ2V4cGxvcmUnLCAnY29kZWJhc2UtYW5hbHlzaXMnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN1YmFnZW50U3RhcnRIb29rLCBzdWJhZ2VudFN0YXJ0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBBZGQgY29udGV4dCBmb3IgZXhwbG9yZSBzdWJhZ2VudHNcbiAqIGV4cG9ydCBkZWZhdWx0IHN1YmFnZW50U3RhcnRIb29rKHsgbWF0Y2hlcjogJ2V4cGxvcmUnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnRXhwbG9yZSBzdWJhZ2VudCBzdGFydGluZycsIHtcbiAqICAgICBhZ2VudElkOiBpbnB1dC5hZ2VudF9pZCxcbiAqICAgICBhZ2VudFR5cGU6IGlucHV0LmFnZW50X3R5cGVcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gc3ViYWdlbnRTdGFydE91dHB1dCh7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGb2N1cyBvbiBmaW5kaW5nIHBhdHRlcm5zIGFuZCBjb252ZW50aW9ucydcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N1YmFnZW50c3RhcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN1YmFnZW50U3RhcnRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdWJhZ2VudFN0YXJ0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdWJhZ2VudFN0b3AgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdWJhZ2VudFN0b3AgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN1YmFnZW50U3RvcCBob29rcyBmaXJlIHdoZW4gYSBzdWJhZ2VudCBjb21wbGV0ZXMgb3Igc3RvcHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQmxvY2sgdGhlIHN1YmFnZW50IGZyb20gc3RvcHBpbmdcbiAqIC0gUHJvY2VzcyBzdWJhZ2VudCByZXN1bHRzXG4gKiAtIENsZWFuIHVwIHN1YmFnZW50IHJlc291cmNlc1xuICogLSBMb2cgc3ViYWdlbnQgY29tcGxldGlvblxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYGFnZW50X3R5cGVgIChlLmcuLCAnZXhwbG9yZScsICdjb2RlYmFzZS1hbmFseXNpcycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3ViYWdlbnRTdG9wSG9vaywgc3ViYWdlbnRTdG9wT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBCbG9jayBleHBsb3JlIHN1YmFnZW50cyBpZiB0YXNrIGluY29tcGxldGVcbiAqIGV4cG9ydCBkZWZhdWx0IHN1YmFnZW50U3RvcEhvb2soeyBtYXRjaGVyOiAnZXhwbG9yZScgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTdWJhZ2VudCBzdG9wcGluZycsIHtcbiAqICAgICBhZ2VudElkOiBpbnB1dC5hZ2VudF9pZCxcbiAqICAgICBhZ2VudFR5cGU6IGlucHV0LmFnZW50X3R5cGVcbiAqICAgfSk7XG4gKlxuICogICAvLyBCbG9jayBpZiB0cmFuc2NyaXB0IHNob3dzIGluY29tcGxldGUgd29ya1xuICogICByZXR1cm4gc3ViYWdlbnRTdG9wT3V0cHV0KHtcbiAqICAgICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgICByZWFzb246ICdQbGVhc2UgdmVyaWZ5IGV4cGxvcmF0aW9uIGlzIGNvbXBsZXRlJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3ViYWdlbnRzdG9wXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdWJhZ2VudFN0b3BIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdWJhZ2VudFN0b3BcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFByZUNvbXBhY3QgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBQcmVDb21wYWN0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBQcmVDb21wYWN0IGhvb2tzIGZpcmUgYmVmb3JlIGNvbnRleHQgY29tcGFjdGlvbiBvY2N1cnMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gUHJlc2VydmUgaW1wb3J0YW50IGluZm9ybWF0aW9uIGJlZm9yZSBjb21wYWN0aW9uXG4gKiAtIExvZyBjb21wYWN0aW9uIGV2ZW50c1xuICogLSBNb2RpZnkgY3VzdG9tIGluc3RydWN0aW9ucyBmb3IgdGhlIGNvbXBhY3RlZCBjb250ZXh0XG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdtYW51YWwnLCAnYXV0bycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcHJlQ29tcGFjdEhvb2ssIHByZUNvbXBhY3RPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyBjb21wYWN0aW9uIGV2ZW50cyBhbmQgcHJlc2VydmUgY29udGV4dFxuICogZXhwb3J0IGRlZmF1bHQgcHJlQ29tcGFjdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnQ29udGV4dCBjb21wYWN0aW9uIHRyaWdnZXJlZCcsIHtcbiAqICAgICB0cmlnZ2VyOiBpbnB1dC50cmlnZ2VyLFxuICogICAgIGhhc0N1c3RvbUluc3RydWN0aW9uczogaW5wdXQuY3VzdG9tX2luc3RydWN0aW9ucyAhPT0gbnVsbFxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBwcmVDb21wYWN0T3V0cHV0KHtcbiAqICAgICBzeXN0ZW1NZXNzYWdlOiAnUmVtZW1iZXI6IHN0cmljdCBtb2RlIGlzIGVuYWJsZWQnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBPbmx5IGhhbmRsZSBtYW51YWwgY29tcGFjdGlvblxuICogZXhwb3J0IGRlZmF1bHQgcHJlQ29tcGFjdEhvb2soeyBtYXRjaGVyOiAnbWFudWFsJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ01hbnVhbCBjb21wYWN0aW9uIHJlcXVlc3RlZCcpO1xuICogICByZXR1cm4gcHJlQ29tcGFjdE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3ByZWNvbXBhY3RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZUNvbXBhY3RIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQcmVDb21wYWN0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBQb3N0Q29tcGFjdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFBvc3RDb21wYWN0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBQb3N0Q29tcGFjdCBob29rcyBmaXJlIGFmdGVyIGNvbnRleHQgY29tcGFjdGlvbiBjb21wbGV0ZXMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gT2JzZXJ2ZSB0aGUgY29tcGFjdGlvbiBzdW1tYXJ5IGFuZCBkZXRhaWxzXG4gKiAtIExvZyBjb21wYWN0aW9uIGV2ZW50c1xuICogLSBSZWFjdCB0byB0aGUgbmV3IGNvbXBhY3RlZCBzdGF0ZVxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHRyaWdnZXJgICgnbWFudWFsJywgJ2F1dG8nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHBvc3RDb21wYWN0SG9vaywgcG9zdENvbXBhY3RPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHBvc3RDb21wYWN0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdDb250ZXh0IGNvbXBhY3Rpb24gY29tcGxldGVkJywge1xuICogICAgIHRyaWdnZXI6IGlucHV0LnRyaWdnZXIsXG4gKiAgICAgc3VtbWFyeTogaW5wdXQuY29tcGFjdF9zdW1tYXJ5XG4gKiAgIH0pO1xuICogICByZXR1cm4gcG9zdENvbXBhY3RPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNwb3N0Y29tcGFjdFxuICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdENvbXBhY3RIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQb3N0Q29tcGFjdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcGVybWlzc2lvblJlcXVlc3RIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQZXJtaXNzaW9uUmVxdWVzdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2V0dXAgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXR1cCBob29rIGhhbmRsZXIuXG4gKlxuICogU2V0dXAgaG9va3MgZmlyZSBkdXJpbmcgaW5pdGlhbGl6YXRpb24gb3IgbWFpbnRlbmFuY2UsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ29uZmlndXJlIGluaXRpYWwgc2Vzc2lvbiBzdGF0ZVxuICogLSBQZXJmb3JtIHNldHVwIHRhc2tzIGJlZm9yZSB0aGUgc2Vzc2lvbiBzdGFydHNcbiAqIC0gQWRkIGNvbnRleHQgZm9yIG1haW50ZW5hbmNlIG9wZXJhdGlvbnNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGB0cmlnZ2VyYCAoJ2luaXQnIG9yICdtYWludGVuYW5jZScpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2V0dXBIb29rLCBzZXR1cE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gSGFuZGxlIGFsbCBzZXR1cCBldmVudHNcbiAqIGV4cG9ydCBkZWZhdWx0IHNldHVwSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTZXR1cCB0cmlnZ2VyZWQnLCB7IHRyaWdnZXI6IGlucHV0LnRyaWdnZXIgfSk7XG4gKiAgIHJldHVybiBzZXR1cE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBPbmx5IGhhbmRsZSBpbml0aWFsaXphdGlvblxuICogZXhwb3J0IGRlZmF1bHQgc2V0dXBIb29rKHsgbWF0Y2hlcjogJ2luaXQnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnSW5pdGlhbGl6aW5nIHNlc3Npb24nKTtcbiAqICAgcmV0dXJuIHNldHVwT3V0cHV0KHtcbiAqICAgICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnU2Vzc2lvbiBpbml0aWFsaXplZCB3aXRoIGN1c3RvbSBjb25maWd1cmF0aW9uJ1xuICogICAgIH1cbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3NldHVwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNldHVwXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUZWFtbWF0ZUlkbGUgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBUZWFtbWF0ZUlkbGUgaG9vayBoYW5kbGVyLlxuICpcbiAqIFRlYW1tYXRlSWRsZSBob29rcyBmaXJlIHdoZW4gYSB0ZWFtbWF0ZSBpbiBhIHRlYW0gaXMgYWJvdXQgdG8gZ28gaWRsZSxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQXNzaWduIHdvcmsgdG8gaWRsZSB0ZWFtbWF0ZXNcbiAqIC0gTG9nIHRlYW0gYWN0aXZpdHlcbiAqIC0gQ29vcmRpbmF0ZSBtdWx0aS1hZ2VudCB3b3JrZmxvd3NcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHRlYW1tYXRlIGlkbGUgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdGVhbW1hdGVJZGxlSG9vaywgdGVhbW1hdGVJZGxlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgd2hlbiB0ZWFtbWF0ZXMgZ28gaWRsZVxuICogZXhwb3J0IGRlZmF1bHQgdGVhbW1hdGVJZGxlSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdUZWFtbWF0ZSBnb2luZyBpZGxlJywge1xuICogICAgIHRlYW1tYXRlTmFtZTogaW5wdXQudGVhbW1hdGVfbmFtZSxcbiAqICAgICB0ZWFtTmFtZTogaW5wdXQudGVhbV9uYW1lXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHRlYW1tYXRlSWRsZU91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3RlYW1tYXRlaWRsZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdGVhbW1hdGVJZGxlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVGVhbW1hdGVJZGxlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUYXNrQ29tcGxldGVkIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVGFza0NvbXBsZXRlZCBob29rIGhhbmRsZXIuXG4gKlxuICogVGFza0NvbXBsZXRlZCBob29rcyBmaXJlIHdoZW4gYSB0YXNrIGlzIGJlaW5nIG1hcmtlZCBhcyBjb21wbGV0ZWQsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFZlcmlmeSB0YXNrIGNvbXBsZXRpb25cbiAqIC0gTG9nIHRhc2sgbWV0cmljc1xuICogLSBUcmlnZ2VyIGZvbGxvdy11cCBhY3Rpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCB0YXNrIGNvbXBsZXRpb24gZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdGFza0NvbXBsZXRlZEhvb2ssIHRhc2tDb21wbGV0ZWRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyB0YXNrIGNvbXBsZXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHRhc2tDb21wbGV0ZWRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Rhc2sgY29tcGxldGVkJywge1xuICogICAgIHRhc2tJZDogaW5wdXQudGFza19pZCxcbiAqICAgICB0YXNrU3ViamVjdDogaW5wdXQudGFza19zdWJqZWN0XG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHRhc2tDb21wbGV0ZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN0YXNrY29tcGxldGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0YXNrQ29tcGxldGVkSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVGFza0NvbXBsZXRlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRWxpY2l0YXRpb24gSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYW4gRWxpY2l0YXRpb24gaG9vayBoYW5kbGVyLlxuICpcbiAqIEVsaWNpdGF0aW9uIGhvb2tzIGZpcmUgd2hlbiBhbiBNQ1Agc2VydmVyIHJlcXVlc3RzIHVzZXIgaW5wdXQsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQWNjZXB0LCBkZWNsaW5lLCBvciBjYW5jZWwgZWxpY2l0YXRpb24gcmVxdWVzdHMgcHJvZ3JhbW1hdGljYWxseVxuICogLSBQcm92aWRlIHN0cnVjdHVyZWQgZm9ybSBpbnB1dCBvciBVUkwtYmFzZWQgYXV0aCByZXNwb25zZXNcbiAqIC0gTG9nIG9yIGF1ZGl0IGVsaWNpdGF0aW9uIHJlcXVlc3RzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBlbGljaXRhdGlvbiBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBlbGljaXRhdGlvbkhvb2ssIGVsaWNpdGF0aW9uT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBlbGljaXRhdGlvbkhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnRWxpY2l0YXRpb24gcmVxdWVzdCcsIHsgc2VydmVyOiBpbnB1dC5tY3Bfc2VydmVyX25hbWUgfSk7XG4gKiAgIHJldHVybiBlbGljaXRhdGlvbk91dHB1dCh7XG4gKiAgICAgaG9va1NwZWNpZmljT3V0cHV0OiB7IGFjdGlvbjogJ2FjY2VwdCcsIGNvbnRlbnQ6IHsgYXBwcm92ZWQ6IHRydWUgfSB9XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNlbGljaXRhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZWxpY2l0YXRpb25Ib29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJFbGljaXRhdGlvblwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRWxpY2l0YXRpb25SZXN1bHQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYW4gRWxpY2l0YXRpb25SZXN1bHQgaG9vayBoYW5kbGVyLlxuICpcbiAqIEVsaWNpdGF0aW9uUmVzdWx0IGhvb2tzIGZpcmUgd2l0aCB0aGUgcmVzdWx0IG9mIGFuIE1DUCBlbGljaXRhdGlvbiByZXF1ZXN0LFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBPYnNlcnZlIGVsaWNpdGF0aW9uIG91dGNvbWVzXG4gKiAtIE1vZGlmeSB0aGUgcmVzdWx0IGJlZm9yZSBpdCBpcyByZXR1cm5lZCB0byB0aGUgTUNQIHNlcnZlclxuICogLSBMb2cgZWxpY2l0YXRpb24gY29tcGxldGlvbnNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIGVsaWNpdGF0aW9uIHJlc3VsdCBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBlbGljaXRhdGlvblJlc3VsdEhvb2ssIGVsaWNpdGF0aW9uUmVzdWx0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBlbGljaXRhdGlvblJlc3VsdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnRWxpY2l0YXRpb24gcmVzdWx0JywgeyBhY3Rpb246IGlucHV0LmFjdGlvbiB9KTtcbiAqICAgcmV0dXJuIGVsaWNpdGF0aW9uUmVzdWx0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjZWxpY2l0YXRpb25yZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVsaWNpdGF0aW9uUmVzdWx0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiRWxpY2l0YXRpb25SZXN1bHRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbmZpZ0NoYW5nZSBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIENvbmZpZ0NoYW5nZSBob29rIGhhbmRsZXIuXG4gKlxuICogQ29uZmlnQ2hhbmdlIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBjb25maWd1cmF0aW9uIGNoYW5nZXMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gUmVhY3QgdG8gc2V0dGluZ3MgZmlsZSBjaGFuZ2VzXG4gKiAtIExvZyBvciBhdWRpdCBjb25maWd1cmF0aW9uIGNoYW5nZXNcbiAqIC0gQXBwbHkgY3VzdG9tIGxvZ2ljIHdoZW4gc2V0dGluZ3MgYXJlIHVwZGF0ZWRcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBzb3VyY2VgICgndXNlcl9zZXR0aW5ncycsICdwcm9qZWN0X3NldHRpbmdzJywgZXRjLilcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBjb25maWdDaGFuZ2VIb29rLCBjb25maWdDaGFuZ2VPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IGNvbmZpZ0NoYW5nZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnQ29uZmlnIGNoYW5nZWQnLCB7IHNvdXJjZTogaW5wdXQuc291cmNlLCBmaWxlOiBpbnB1dC5maWxlX3BhdGggfSk7XG4gKiAgIHJldHVybiBjb25maWdDaGFuZ2VPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNjb25maWdjaGFuZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZ0NoYW5nZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIkNvbmZpZ0NoYW5nZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW5zdHJ1Y3Rpb25zTG9hZGVkIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIEluc3RydWN0aW9uc0xvYWRlZCBob29rIGhhbmRsZXIuXG4gKlxuICogSW5zdHJ1Y3Rpb25zTG9hZGVkIGhvb2tzIGZpcmUgd2hlbiBhIENMQVVERS5tZCBvciBzaW1pbGFyIGluc3RydWN0aW9ucyBmaWxlXG4gKiBpcyBsb2FkZWQsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gUmVhY3QgdG8gaW5zdHJ1Y3Rpb25zIGJlaW5nIGFwcGxpZWRcbiAqIC0gTG9nIHdoaWNoIGluc3RydWN0aW9uIGZpbGVzIGFyZSBhY3RpdmVcbiAqIC0gT2JzZXJ2ZSB0aGUgaW5zdHJ1Y3Rpb24gbG9hZGluZyBoaWVyYXJjaHlcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIGluc3RydWN0aW9uIGxvYWQgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgaW5zdHJ1Y3Rpb25zTG9hZGVkSG9vaywgaW5zdHJ1Y3Rpb25zTG9hZGVkT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBpbnN0cnVjdGlvbnNMb2FkZWRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0luc3RydWN0aW9ucyBsb2FkZWQnLCB7IGZpbGU6IGlucHV0LmZpbGVfcGF0aCwgdHlwZTogaW5wdXQubWVtb3J5X3R5cGUgfSk7XG4gKiAgIHJldHVybiBpbnN0cnVjdGlvbnNMb2FkZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNpbnN0cnVjdGlvbnNsb2FkZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluc3RydWN0aW9uc0xvYWRlZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIkluc3RydWN0aW9uc0xvYWRlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gV29ya3RyZWVDcmVhdGUgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBXb3JrdHJlZUNyZWF0ZSBob29rIGhhbmRsZXIuXG4gKlxuICogV29ya3RyZWVDcmVhdGUgaG9va3MgZmlyZSB3aGVuIGEgZ2l0IHdvcmt0cmVlIGlzIGNyZWF0ZWQsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gU2V0IHVwIHdvcmt0cmVlLXNwZWNpZmljIGNvbmZpZ3VyYXRpb25cbiAqIC0gTG9nIHdvcmt0cmVlIGNyZWF0aW9uIGV2ZW50c1xuICogLSBJbml0aWFsaXplIHdvcmt0cmVlIHJlc291cmNlc1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgd29ya3RyZWUgY3JlYXRpb24gZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgd29ya3RyZWVDcmVhdGVIb29rLCB3b3JrdHJlZUNyZWF0ZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgd29ya3RyZWVDcmVhdGVIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1dvcmt0cmVlIGNyZWF0ZWQnLCB7IG5hbWU6IGlucHV0Lm5hbWUgfSk7XG4gKiAgIHJldHVybiB3b3JrdHJlZUNyZWF0ZU91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3dvcmt0cmVlY3JlYXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3b3JrdHJlZUNyZWF0ZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIldvcmt0cmVlQ3JlYXRlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBXb3JrdHJlZVJlbW92ZSBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFdvcmt0cmVlUmVtb3ZlIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBXb3JrdHJlZVJlbW92ZSBob29rcyBmaXJlIHdoZW4gYSBnaXQgd29ya3RyZWUgaXMgcmVtb3ZlZCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBDbGVhbiB1cCB3b3JrdHJlZS1zcGVjaWZpYyByZXNvdXJjZXNcbiAqIC0gTG9nIHdvcmt0cmVlIHJlbW92YWwgZXZlbnRzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCB3b3JrdHJlZSByZW1vdmFsIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHdvcmt0cmVlUmVtb3ZlSG9vaywgd29ya3RyZWVSZW1vdmVPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHdvcmt0cmVlUmVtb3ZlSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdXb3JrdHJlZSByZW1vdmVkJywgeyBwYXRoOiBpbnB1dC53b3JrdHJlZV9wYXRoIH0pO1xuICogICByZXR1cm4gd29ya3RyZWVSZW1vdmVPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN3b3JrdHJlZXJlbW92ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gd29ya3RyZWVSZW1vdmVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJXb3JrdHJlZVJlbW92ZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ3dkQ2hhbmdlZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIEN3ZENoYW5nZWQgaG9vayBoYW5kbGVyLlxuICpcbiAqIEN3ZENoYW5nZWQgaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlJ3MgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeSBjaGFuZ2VzLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBSZWFjdCB0byBkaXJlY3RvcnkgY2hhbmdlcyB3aXRoaW4gYSBzZXNzaW9uXG4gKiAtIFVwZGF0ZSBmaWxlIHdhdGNoZXJzIG9yIGVudmlyb25tZW50IHN0YXRlXG4gKiAtIFJldHVybiBgd2F0Y2hQYXRoc2AgdmlhIGBob29rU3BlY2lmaWNPdXRwdXRgIHRvIHJlZ2lzdGVyIHBhdGhzIGZvciBGaWxlQ2hhbmdlZCBldmVudHNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIGN3ZCBjaGFuZ2UgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgY3dkQ2hhbmdlZEhvb2ssIGN3ZENoYW5nZWRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IGN3ZENoYW5nZWRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1dvcmtpbmcgZGlyZWN0b3J5IGNoYW5nZWQnLCB7IGZyb206IGlucHV0Lm9sZF9jd2QsIHRvOiBpbnB1dC5uZXdfY3dkIH0pO1xuICogICByZXR1cm4gY3dkQ2hhbmdlZE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2N3ZGNoYW5nZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGN3ZENoYW5nZWRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJDd2RDaGFuZ2VkXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBGaWxlQ2hhbmdlZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIEZpbGVDaGFuZ2VkIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBGaWxlQ2hhbmdlZCBob29rcyBmaXJlIHdoZW4gYSB3YXRjaGVkIGZpbGUgY2hhbmdlcyBvbiBkaXNrLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFJlYWN0IHRvIGZpbGUgc3lzdGVtIGNoYW5nZXMgZHVyaW5nIGEgc2Vzc2lvblxuICogLSBJbnZhbGlkYXRlIGNhY2hlcyBvciByZWxvYWQgY29uZmlndXJhdGlvblxuICogLSBSZXR1cm4gYHdhdGNoUGF0aHNgIHZpYSBgaG9va1NwZWNpZmljT3V0cHV0YCB0byB1cGRhdGUgdGhlIHNldCBvZiB3YXRjaGVkIHBhdGhzXG4gKlxuICogVGhlIGlucHV0IGBldmVudGAgZmllbGQgaW5kaWNhdGVzIHRoZSB0eXBlIG9mIGNoYW5nZTpcbiAqIC0gYCdjaGFuZ2UnYCAtIEZpbGUgY29udGVudHMgY2hhbmdlZFxuICogLSBgJ2FkZCdgIC0gRmlsZSB3YXMgY3JlYXRlZFxuICogLSBgJ3VubGluaydgIC0gRmlsZSB3YXMgZGVsZXRlZFxuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgZmlsZSBjaGFuZ2UgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgZmlsZUNoYW5nZWRIb29rLCBmaWxlQ2hhbmdlZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgZmlsZUNoYW5nZWRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0ZpbGUgY2hhbmdlZCcsIHsgcGF0aDogaW5wdXQuZmlsZV9wYXRoLCBldmVudDogaW5wdXQuZXZlbnQgfSk7XG4gKiAgIHJldHVybiBmaWxlQ2hhbmdlZE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2ZpbGVjaGFuZ2VkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaWxlQ2hhbmdlZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIkZpbGVDaGFuZ2VkXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4iLCAiLyoqXG4gKiBMb2dnZXIgc3lzdGVtIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyBzdHJ1Y3R1cmVkIGxvZ2dpbmcgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIG9wdGlvbmFsIGZpbGUgb3V0cHV0LlxuICogVGhlIGxvZ2dlciBpcyAqKnNpbGVudCBieSBkZWZhdWx0KiogdG8gYXZvaWQgaW50ZXJmZXJpbmcgd2l0aCBob29rIHByb3RvY29sXG4gKiAoc3Rkb3V0IGlzIHJlc2VydmVkIGZvciBKU09OIHJlc3BvbnNlcywgc3RkZXJyIG1heSBjb25mbGljdCB3aXRoIENsYXVkZSBDb2RlKS5cbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBsb2cgZXZlbnRzXG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAqICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gJHtldmVudC5ob29rVHlwZX06ICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAqIH0pO1xuICpcbiAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICogdW5zdWJzY3JpYmUoKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmltcG9ydCB7IGNsb3NlU3luYywgZXhpc3RzU3luYywgbWtkaXJTeW5jLCBvcGVuU3luYywgd3JpdGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG4vKipcbiAqIEFsbCBsb2cgbGV2ZWxzIGluIG9yZGVyIG9mIHNldmVyaXR5IChsb3dlc3QgdG8gaGlnaGVzdCkuXG4gKi9cbmV4cG9ydCBjb25zdCBMT0dfTEVWRUxTID0gW1wiZGVidWdcIiwgXCJpbmZvXCIsIFwid2FyblwiLCBcImVycm9yXCJdO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIENsYXNzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIExvZ2dlciBmb3IgQ2xhdWRlIENvZGUgaG9va3Mgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIGZpbGUgb3V0cHV0LlxuICpcbiAqICMjIEtleSBCZWhhdmlvcnNcbiAqXG4gKiB8IENvbmZpZ3VyYXRpb24gfCBCZWhhdmlvciB8XG4gKiB8LS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLXxcbiAqIHwgTm8gY29uZmlnIChkZWZhdWx0KSB8ICoqU2lsZW50KiogLSBubyBvdXRwdXQgYW55d2hlcmUgfFxuICogfCBgQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVgIGVudiB2YXIgfCBBcHBlbmQgSlNPTiBsaW5lcyB0byBmaWxlIHxcbiAqIHwgYC5vbihsZXZlbCwgaGFuZGxlcilgIHJlZ2lzdGVyZWQgfCBFdmVudHMgZGVsaXZlcmVkIHRvIGhhbmRsZXJzIG9ubHkgfFxuICogfCBNdWx0aXBsZSBkZXN0aW5hdGlvbnMgfCBBbGwgZGVzdGluYXRpb25zIHJlY2VpdmUgZXZlbnRzIHxcbiAqXG4gKiAjIyBJbXBvcnRhbnQgTm90ZXNcbiAqXG4gKiAtICoqTmV2ZXIgb3V0cHV0cyB0byBzdGRvdXQqKiAocmVzZXJ2ZWQgZm9yIEpTT04gaG9vayByZXNwb25zZSlcbiAqIC0gKipOZXZlciBvdXRwdXRzIHRvIHN0ZGVycioqIChtYXkgaW50ZXJmZXJlIHdpdGggQ2xhdWRlIENvZGUgZXJyb3IgaGFuZGxpbmcpXG4gKiAtIEZpbGUgb3V0cHV0IHVzZXMgSlNPTiBMaW5lcyBmb3JtYXQgZm9yIGVhc3kgcGFyc2luZ1xuICogLSBgLm9uKGxldmVsLCBoYW5kbGVyKWAgcmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvblxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGV2ZW50cyBhdCBzcGVjaWZpYyBsZXZlbFxuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiB7XG4gKiAgIHNlbmRBbGVydChldmVudC5tZXNzYWdlKTtcbiAqIH0pO1xuICpcbiAqIC8vIExvZyB3aXRoaW4gYSBob29rIGhhbmRsZXJcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIud2FybignQWJvdXQgdG8gdmFsaWRhdGUgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmVkIGV2ZW50IGhhbmRsZXJzIGJ5IGxvZyBsZXZlbC5cbiAgICAgKi9cbiAgICBoYW5kbGVycyA9IG5ldyBNYXAoKTtcbiAgICAvKipcbiAgICAgKiBGaWxlIGRlc2NyaXB0b3IgZm9yIGxvZyBmaWxlIG91dHB1dC5cbiAgICAgKiBMYXppbHkgaW5pdGlhbGl6ZWQgb24gZmlyc3Qgd3JpdGUuXG4gICAgICovXG4gICAgbG9nRmlsZUZkID0gbnVsbDtcbiAgICAvKipcbiAgICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgaWYgY29uZmlndXJlZC5cbiAgICAgKi9cbiAgICBsb2dGaWxlUGF0aCA9IG51bGw7XG4gICAgLyoqXG4gICAgICogV2hldGhlciBmaWxlIGluaXRpYWxpemF0aW9uIGhhcyBiZWVuIGF0dGVtcHRlZC5cbiAgICAgKi9cbiAgICBmaWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAgICovXG4gICAgY3VycmVudEhvb2tUeXBlO1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgaG9vayBpbnB1dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAgICovXG4gICAgY3VycmVudElucHV0O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgTG9nZ2VyIGluc3RhbmNlLlxuICAgICAqXG4gICAgICogVHlwaWNhbGx5IHlvdSBzaG91bGQgdXNlIHRoZSBleHBvcnRlZCBgbG9nZ2VyYCBzaW5nbGV0b24gcmF0aGVyIHRoYW5cbiAgICAgKiBjcmVhdGluZyBuZXcgaW5zdGFuY2VzLlxuICAgICAqIEBwYXJhbSBjb25maWcgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gVXNlIHNpbmdsZXRvbiAocmVjb21tZW5kZWQpXG4gICAgICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAgICAgKlxuICAgICAqIC8vIE9yIGNyZWF0ZSBjdXN0b20gaW5zdGFuY2VcbiAgICAgKiBjb25zdCBjdXN0b21Mb2dnZXIgPSBuZXcgTG9nZ2VyKHsgbG9nRmlsZVBhdGg6ICcvdmFyL2xvZy9ob29rcy5sb2cnIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbmZpZyA9IHt9KSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnMgbWFwIGZvciBlYWNoIGxldmVsXG4gICAgICAgIGZvciAoY29uc3QgbGV2ZWwgb2YgTE9HX0xFVkVMUykge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVycy5zZXQobGV2ZWwsIG5ldyBTZXQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IGxvZyBmaWxlIHBhdGggZnJvbSBleHBsaWNpdCBjb25maWcsIG9yIGJ5IHJlYWRpbmcgdGhlIGNvbmZpZ3VyZWQgZW52IHZhclxuICAgICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gY29uZmlnLmxvZ0ZpbGVQYXRoID8/IChjb25maWcubG9nRW52VmFyID8gcHJvY2Vzcy5lbnZbY29uZmlnLmxvZ0VudlZhcl0gOiB1bmRlZmluZWQpID8/IG51bGw7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBkZXRhaWxlZCBkZWJ1Z2dpbmcgaW5mb3JtYXRpb24gdGhhdCBpcyB0eXBpY2FsbHkgb25seSB1c2VmdWxcbiAgICAgKiBkdXJpbmcgZGV2ZWxvcG1lbnQgb3IgdHJvdWJsZXNob290aW5nLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGRlYnVnIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci5kZWJ1ZygnUHJvY2Vzc2luZyB0b29sIGlucHV0JywgeyB0b29sTmFtZTogJ0Jhc2gnLCBpbnB1dFNpemU6IDI1NiB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBkZWJ1ZyhtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImRlYnVnXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGFuIGluZm8gbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZ2VuZXJhbCBvcGVyYXRpb25hbCBldmVudHMgbGlrZSBob29rIGludm9jYXRpb25zLCBzdWNjZXNzZnVsXG4gICAgICogY29tcGxldGlvbnMsIG9yIHN0YXRlIGNoYW5nZXMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgaW5mbyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuaW5mbygnU2Vzc2lvbiBzdGFydGVkJywgeyBzb3VyY2U6ICdzdGFydHVwJywgc2Vzc2lvbklkOiAnYWJjMTIzJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBpbmZvKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwiaW5mb1wiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhIHdhcm5pbmcgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgY29uZGl0aW9ucyB0aGF0IG1heSBpbmRpY2F0ZSBpc3N1ZXMgYnV0IGRvbid0IHByZXZlbnRcbiAgICAgKiBvcGVyYXRpb24sIHN1Y2ggYXMgZGVwcmVjYXRlZCBwYXR0ZXJucyBvciBwZXJmb3JtYW5jZSBjb25jZXJucy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci53YXJuKCdEZXByZWNhdGVkIGhvb2sgcGF0dGVybiBkZXRlY3RlZCcsIHsgcGF0dGVybjogJ2xlZ2FjeU1hdGNoZXInIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHdhcm4obWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJ3YXJuXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGVycm9yIGNvbmRpdGlvbnMgdGhhdCByZXF1aXJlIGF0dGVudGlvbiBidXQgd2VyZSBoYW5kbGVkXG4gICAgICogZ3JhY2VmdWxseS4gRm9yIGV4Y2VwdGlvbnMsIHByZWZlciB7QGxpbmsgbG9nRXJyb3J9LlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGVycm9yIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHZhbGlkYXRlIHRvb2wgaW5wdXQnLCB7IHRvb2xOYW1lOiAnQmFzaCcsIHJlYXNvbjogJ2VtcHR5IGNvbW1hbmQnIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGVycm9yKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwiZXJyb3JcIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIHdpdGggZnVsbCBlcnJvciBkZXRhaWxzLlxuICAgICAqXG4gICAgICogVXNlIHRoaXMgbWV0aG9kIHdoZW4gbG9nZ2luZyBjYXVnaHQgZXhjZXB0aW9ucyB0byBjYXB0dXJlIHRoZSBmdWxsXG4gICAgICogZXJyb3IgY29udGV4dCBpbmNsdWRpbmcgbmFtZSwgbWVzc2FnZSwgc3RhY2sgdHJhY2UsIGFuZCBjYXVzZSBjaGFpbi5cbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gbG9nXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGZhaWxlZFxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogdHJ5IHtcbiAgICAgKiAgIGF3YWl0IGRhbmdlcm91c09wZXJhdGlvbigpO1xuICAgICAqIH0gY2F0Y2ggKGVycikge1xuICAgICAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ0ZhaWxlZCB0byBleGVjdXRlIGRhbmdlcm91cyBvcGVyYXRpb24nLCB7XG4gICAgICogICAgIG9wZXJhdGlvbjogJ2RlbGV0ZScsXG4gICAgICogICAgIHRhcmdldDogJy9pbXBvcnRhbnQvZmlsZS50eHQnXG4gICAgICogICB9KTtcbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICovXG4gICAgbG9nRXJyb3IoZXJyb3IsIG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgY29uc3QgZXJyb3JJbmZvID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yKTtcbiAgICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGxldmVsOiBcImVycm9yXCIsXG4gICAgICAgICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgICAgICAgZXJyb3I6IGVycm9ySW5mbyxcbiAgICAgICAgICAgIGNvbnRleHQsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlcyBhIGhhbmRsZXIgdG8gbG9nIGV2ZW50cyBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgICAqXG4gICAgICogVGhlIGhhbmRsZXIgd2lsbCBiZSBjYWxsZWQgZm9yIGV2ZXJ5IGxvZyBldmVudCBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgICAqIFJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgY2FsbGVkIHdoZW4gdGhlIGhhbmRsZXJcbiAgICAgKiBpcyBubyBsb25nZXIgbmVlZGVkLlxuICAgICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBsb2cgbGV2ZWwgdG8gc3Vic2NyaWJlIHRvXG4gICAgICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGV2ZW50XG4gICAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byB1bnN1YnNjcmliZSB0aGUgaGFuZGxlclxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIFN1YnNjcmliZSB0byBlcnJvciBldmVudHNcbiAgICAgKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAgICAgKiAgIGNvbnNvbGUuZXJyb3IoYFske2V2ZW50Lmhvb2tUeXBlfV0gJHtldmVudC5tZXNzYWdlfWApO1xuICAgICAqICAgaWYgKGV2ZW50LmVycm9yKSB7XG4gICAgICogICAgIGNvbnNvbGUuZXJyb3IoZXZlbnQuZXJyb3Iuc3RhY2spO1xuICAgICAqICAgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gICAgICogdW5zdWJzY3JpYmUoKTtcbiAgICAgKiBgYGBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBGb3J3YXJkIHRvIGV4dGVybmFsIGxvZ2dpbmcgbGlicmFyeVxuICAgICAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICAgICAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKCk7XG4gICAgICpcbiAgICAgKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAgICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIG9uKGxldmVsLCBoYW5kbGVyKSB7XG4gICAgICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChsZXZlbCk7XG4gICAgICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgICAgICBsZXZlbEhhbmRsZXJzLmFkZChoYW5kbGVyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgbGV2ZWxIYW5kbGVycz8uZGVsZXRlKGhhbmRsZXIpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIGNhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGJlZm9yZSBpbnZva2luZyBob29rIGhhbmRsZXJzLlxuICAgICAqIFlvdSB0eXBpY2FsbHkgZG9uJ3QgbmVlZCB0byBjYWxsIHRoaXMgZGlyZWN0bHkuXG4gICAgICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIHR5cGUgb2YgaG9vayBiZWluZyBleGVjdXRlZFxuICAgICAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IGRhdGFcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBzZXRDb250ZXh0KGhvb2tUeXBlLCBpbnB1dCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IGhvb2tUeXBlO1xuICAgICAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IGlucHV0O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0LlxuICAgICAqXG4gICAgICogQ2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYWZ0ZXIgaG9vayBleGVjdXRpb24gY29tcGxldGVzLlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIGNsZWFyQ29udGV4dCgpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuY3VycmVudElucHV0ID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDb25maWd1cmVzIHRoZSBsb2cgZmlsZSBwYXRoIGF0IHJ1bnRpbWUuXG4gICAgICpcbiAgICAgKiBDYWxsIHRoaXMgdG8gZW5hYmxlIG9yIGNoYW5nZSBmaWxlIGxvZ2dpbmcuIFNldHRpbmcgdG8gYG51bGxgIGRpc2FibGVzXG4gICAgICogZmlsZSBsb2dnaW5nIChidXQgZG9lc24ndCBjbG9zZSBleGlzdGluZyBmaWxlIGhhbmRsZSBpbW1lZGlhdGVseSkuXG4gICAgICogQHBhcmFtIGZpbGVQYXRoIC0gUGF0aCB0byB0aGUgbG9nIGZpbGUsIG9yIG51bGwgdG8gZGlzYWJsZVxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIEVuYWJsZSBmaWxlIGxvZ2dpbmcgYXQgcnVudGltZVxuICAgICAqIGxvZ2dlci5zZXRMb2dGaWxlKCcvdmFyL2xvZy9jbGF1ZGUtaG9va3MubG9nJyk7XG4gICAgICpcbiAgICAgKiAvLyBEaXNhYmxlIGZpbGUgbG9nZ2luZ1xuICAgICAqIGxvZ2dlci5zZXRMb2dGaWxlKG51bGwpO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHNldExvZ0ZpbGUoZmlsZVBhdGgpIHtcbiAgICAgICAgLy8gQ2xvc2UgZXhpc3RpbmcgZmlsZSBpZiBvcGVuXG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGNsb3NlRXJyb3IpIHtcbiAgICAgICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgW2NsYXVkZS1jb2RlLWhvb2tzXSBGYWlsZWQgdG8gY2xvc2UgbG9nIGZpbGU6ICR7U3RyaW5nKGNsb3NlRXJyb3IpfVxcbmApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2VzIGFsbCByZXNvdXJjZXMgaGVsZCBieSB0aGUgbG9nZ2VyLlxuICAgICAqXG4gICAgICogQ2FsbCB0aGlzIGR1cmluZyBncmFjZWZ1bCBzaHV0ZG93biB0byBlbnN1cmUgYWxsIGxvZyBkYXRhIGlzIGZsdXNoZWQuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHtcbiAgICAgKiAgIGxvZ2dlci5jbG9zZSgpO1xuICAgICAqIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGNsb3NlKCkge1xuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChjbG9zZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYFtjbGF1ZGUtY29kZS1ob29rc10gRmFpbGVkIHRvIGNsb3NlIGxvZyBmaWxlOiAke1N0cmluZyhjbG9zZUVycm9yKX1cXG5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlcmUgYXJlIGFueSBhY3RpdmUgaGFuZGxlcnMgb3IgZGVzdGluYXRpb25zLlxuICAgICAqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIGFueSBoYW5kbGVycyBhcmUgcmVnaXN0ZXJlZCBvciBmaWxlIGxvZ2dpbmcgaXMgZW5hYmxlZC5cbiAgICAgKiBAcmV0dXJucyBXaGV0aGVyIHRoZSBsb2dnZXIgaGFzIGFueSBhY3RpdmUgb3V0cHV0IGRlc3RpbmF0aW9uc1xuICAgICAqL1xuICAgIGhhc0Rlc3RpbmF0aW9ucygpIHtcbiAgICAgICAgZm9yIChjb25zdCBoYW5kbGVycyBvZiB0aGlzLmhhbmRsZXJzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoaGFuZGxlcnMuc2l6ZSA+IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMubG9nRmlsZVBhdGggIT09IG51bGw7XG4gICAgfVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBQcml2YXRlIE1ldGhvZHNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLyoqXG4gICAgICogRW1pdHMgYSBsb2cgZXZlbnQuXG4gICAgICogQHBhcmFtIGxldmVsIC0gVGhlIHNldmVyaXR5IGxldmVsIG9mIHRoZSBldmVudFxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGxvZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHQgZGF0YVxuICAgICAqL1xuICAgIGVtaXQobGV2ZWwsIG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGxldmVsLFxuICAgICAgICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgICAgICAgIGNvbnRleHQsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRGVsaXZlcnMgYW4gZXZlbnQgdG8gYWxsIHJlZ2lzdGVyZWQgZGVzdGluYXRpb25zLlxuICAgICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gZGVsaXZlclxuICAgICAqL1xuICAgIGRlbGl2ZXJFdmVudChldmVudCkge1xuICAgICAgICAvLyBEZWxpdmVyIHRvIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChldmVudC5sZXZlbCk7XG4gICAgICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgbGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXIoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoaGFuZGxlckVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBbY2xhdWRlLWNvZGUtaG9va3NdIExvZyBoYW5kbGVyIGVycm9yOiAke1N0cmluZyhoYW5kbGVyRXJyb3IpfVxcbmApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBXcml0ZSB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICAgICAgdGhpcy53cml0ZVRvRmlsZShldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdyaXRlcyBhbiBldmVudCB0byB0aGUgbG9nIGZpbGUuXG4gICAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byB3cml0ZVxuICAgICAqL1xuICAgIHdyaXRlVG9GaWxlKGV2ZW50KSB7XG4gICAgICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gTGF6eSBpbml0aWFsaXphdGlvbiBvZiBmaWxlIGhhbmRsZVxuICAgICAgICBpZiAoIXRoaXMuZmlsZUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGaWxlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkID09PSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbGluZSA9IGAke0pTT04uc3RyaW5naWZ5KGV2ZW50KX1cXG5gO1xuICAgICAgICAgICAgd3JpdGVTeW5jKHRoaXMubG9nRmlsZUZkLCBsaW5lKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAod3JpdGVFcnJvcikge1xuICAgICAgICAgICAgLy8gRGlzYWJsZSBmaWxlIGxvZ2dpbmcgYWZ0ZXIgYSB3cml0ZSBmYWlsdXJlIHRvIGF2b2lkIHJlcGVhdGVkIGVycm9yc1xuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBbY2xhdWRlLWNvZGUtaG9va3NdIExvZyBmaWxlIHdyaXRlIGZhaWxlZDogJHtTdHJpbmcod3JpdGVFcnJvcil9XFxuYCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGxvZyBmaWxlIGZvciB3cml0aW5nLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWxlKCkge1xuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEVuc3VyZSBkaXJlY3RvcnkgZXhpc3RzXG4gICAgICAgICAgICBjb25zdCBkaXIgPSBkaXJuYW1lKHRoaXMubG9nRmlsZVBhdGgpO1xuICAgICAgICAgICAgaWYgKCFleGlzdHNTeW5jKGRpcikpIHtcbiAgICAgICAgICAgICAgICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE9wZW4gZmlsZSBmb3IgYXBwZW5kaW5nXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG9wZW5TeW5jKHRoaXMubG9nRmlsZVBhdGgsIFwiYVwiKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSBpbml0aWFsaXphdGlvbiBlcnJvcnNcbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyBzdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uIGZyb20gYW4gdW5rbm93biBlcnJvci5cbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tXG4gICAgICogQHJldHVybnMgU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGV4dHJhY3RFcnJvckluZm8oZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogZXJyb3IubmFtZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgICAgIHN0YWNrOiBlcnJvci5zdGFjayxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBFeHRyYWN0IGNhdXNlIGNoYWluIGlmIHByZXNlbnRcbiAgICAgICAgICAgIGlmIChlcnJvci5jYXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgaW5mby5jYXVzZSA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvci5jYXVzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaW5mbztcbiAgICAgICAgfVxuICAgICAgICAvLyBIYW5kbGUgbm9uLUVycm9yIHZhbHVlc1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogXCJVbmtub3duRXJyb3JcIixcbiAgICAgICAgICAgIG1lc3NhZ2U6IFN0cmluZyhlcnJvciksXG4gICAgICAgIH07XG4gICAgfVxufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2luZ2xldG9uIEV4cG9ydFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBHbG9iYWwgbG9nZ2VyIGluc3RhbmNlIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBVc2UgdGhpcyBzaW5nbGV0b24gZm9yIGFsbCBsb2dnaW5nIHdpdGhpbiBob29rcy4gVGhlIGxvZ2dlciBpcyBjb25maWd1cmVkXG4gKiB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCBzdXBwb3J0cyBldmVudCBzdWJzY3JpcHRpb24gZm9yIGN1c3RvbVxuICogZGVzdGluYXRpb25zLlxuICpcbiAqICMjIENvbmZpZ3VyYXRpb25cbiAqXG4gKiB8IEVudmlyb25tZW50IFZhcmlhYmxlIHwgRGVzY3JpcHRpb24gfFxuICogfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfFxuICogfCBgQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVgIHwgUGF0aCB0byBsb2cgZmlsZSAoSlNPTiBMaW5lcyBmb3JtYXQpIHxcbiAqXG4gKiAjIyBVc2FnZSBpbiBIb29rc1xuICpcbiAqIFRoZSBsb2dnZXIgaXMgcGFzc2VkIHRvIGhvb2sgaGFuZGxlcnMgdmlhIGNvbnRleHQgZm9yIGNvbnZlbmllbmNlOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIud2FybignVmFsaWRhdGluZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogIyMgRXh0ZXJuYWwgSW50ZWdyYXRpb25cbiAqXG4gKiBTdWJzY3JpYmUgdG8gZXZlbnRzIHRvIGZvcndhcmQgbG9ncyB0byBleHRlcm5hbCBzeXN0ZW1zOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAqXG4gKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubyh7IGxldmVsOiAnZGVidWcnIH0pO1xuICpcbiAqIGxvZ2dlci5vbignZGVidWcnLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZGVidWcoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRGlyZWN0IHVzYWdlXG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGxvZ2dlci5pbmZvKCdTdGFydGluZyBvcGVyYXRpb24nKTtcbiAqIGxvZ2dlci53YXJuKCdSZXNvdXJjZSBsaW1pdCBhcHByb2FjaGluZycsIHsgdXNhZ2U6IDAuOSB9KTtcbiAqXG4gKiB0cnkge1xuICogICBhd2FpdCByaXNreU9wZXJhdGlvbigpO1xuICogfSBjYXRjaCAoZXJyKSB7XG4gKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdSaXNreSBvcGVyYXRpb24gZmFpbGVkJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuLy8gQ0xBVURFX0NPREVfSE9PS1NfTE9HX0VOVl9WQVIgaXMgc2V0IHVuY29uZGl0aW9uYWxseSBieSB0aGUgLS1sb2ctZW52LXZhciBiYW5uZXJcbi8vIGJlZm9yZSB0aGlzIG1vZHVsZSBpbml0aWFsaXNlcy4gSWYgYWJzZW50LCBmYWxsIGJhY2sgdG8gdGhlIGRlZmF1bHQgZW52IHZhciBuYW1lLlxuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoe1xuICAgIGxvZ0VudlZhcjogcHJvY2Vzcy5lbnYuQ0xBVURFX0NPREVfSE9PS1NfTE9HX0VOVl9WQVIgPz8gXCJDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRVwiLFxufSk7XG4iLCAiLyoqXG4gKiBPdXRwdXQgdHlwZXMgYW5kIGJ1aWxkZXJzIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlLXNhZmUgb3V0cHV0IGJ1aWxkZXIgZnVuY3Rpb25zIGZvciBhbGwgMTIgaG9vayB0eXBlcy4gRWFjaCBidWlsZGVyXG4gKiBhY2NlcHRzIG9wdGlvbnMgdGhhdCBtYXRjaCB0aGUgd2lyZSBmb3JtYXQgZXhwZWN0ZWQgYnkgQ2xhdWRlIENvZGUsIHdpdGggdHlwZXNcbiAqIGRlcml2ZWQgZnJvbSB0aGUgQ2xhdWRlIEFnZW50IFNESydzIGBTeW5jSG9va0pTT05PdXRwdXRgIHR5cGUuXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhpdCBDb2RlIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeGl0IGNvZGVzIHVzZWQgYnkgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogfCBFeGl0IENvZGUgfCBOYW1lIHwgV2hlbiBVc2VkIHwgQ2xhdWRlIENvZGUgQmVoYXZpb3IgfFxuICogfC0tLS0tLS0tLS0tfC0tLS0tLXwtLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLS0tLS0tLS18XG4gKiB8IDAgfCBTdWNjZXNzIHwgSGFuZGxlciByZXR1cm5zIG5vcm1hbGx5IHwgQ29udGludWUsIHBhcnNlIHN0ZG91dCBhcyBKU09OIHxcbiAqIHwgMSB8IEVycm9yIHwgSW52YWxpZCBpbnB1dCwgbm9uLWJsb2NraW5nIGVycm9yIHwgTm9uLWJsb2NraW5nLCBzdGRlcnIgdG8gdXNlciBvbmx5IHxcbiAqIHwgMiB8IEJsb2NrIHwgSGFuZGxlciB0aHJvd3MgT1IgYHN0b3BSZWFzb25gIHNldCB8IEJsb2NraW5nLCBzdGRlcnIgc2hvd24gdG8gQ2xhdWRlIHxcbiAqL1xuZXhwb3J0IGNvbnN0IEVYSVRfQ09ERVMgPSB7XG4gICAgLyoqIEhhbmRsZXIgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gQ2xhdWRlIENvZGUgcGFyc2VzIHN0ZG91dCBhcyBKU09OLiAqL1xuICAgIFNVQ0NFU1M6IDAsXG4gICAgLyoqIE5vbi1ibG9ja2luZyBlcnJvciBvY2N1cnJlZCAoZS5nLiwgaW52YWxpZCBpbnB1dCkuIHN0ZGVyciBzaG93biB0byB1c2VyIG9ubHkuICovXG4gICAgRVJST1I6IDEsXG4gICAgLyoqIEhhbmRsZXIgdGhyZXcgZXhjZXB0aW9uIE9SIGJsb2NraW5nIGFjdGlvbiByZXF1ZXN0ZWQuIHN0ZGVyciBzaG93biB0byBDbGF1ZGUuICovXG4gICAgQkxPQ0s6IDIsXG59O1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gT3V0cHV0IEJ1aWxkZXIgRmFjdG9yaWVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgaGF2ZSBob29rU3BlY2lmaWNPdXRwdXQgd2l0aCBhIGhvb2tFdmVudE5hbWUgZGlzY3JpbWluYXRvci5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiB7XG4gICAgICAgIGNvbnN0IHsgaG9va1NwZWNpZmljT3V0cHV0LCAuLi5yZXN0IH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCBzdGRvdXQgPSBob29rU3BlY2lmaWNPdXRwdXQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB7IC4uLnJlc3QsIGhvb2tTcGVjaWZpY091dHB1dDogeyBob29rRXZlbnROYW1lOiBob29rVHlwZSwgLi4uaG9va1NwZWNpZmljT3V0cHV0IH0gfVxuICAgICAgICAgICAgOiByZXN0O1xuICAgICAgICByZXR1cm4geyBfdHlwZTogaG9va1R5cGUsIHN0ZG91dCB9O1xuICAgIH07XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgb25seSB1c2UgQ29tbW9uT3B0aW9ucyAoc2ltcGxlIHBhc3N0aHJvdWdoKS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiAoe1xuICAgICAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgICAgIHN0ZG91dDogb3B0aW9ucyxcbiAgICB9KTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCB1c2UgZGVjaXNpb24tYmFzZWQgb3B0aW9ucyAoU3RvcCwgU3ViYWdlbnRTdG9wKS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiBvcHRpb25zLFxuICAgIH0pO1xufVxuLyoqXG4gKiBGYWN0b3J5IGZvciBleGl0LWNvZGUtYmFzZWQgaG9va3MgKFRlYW1tYXRlSWRsZSwgVGFza0NvbXBsZXRlZCkuXG4gKlxuICogVGhlc2UgaG9va3MgZG9uJ3QgdXNlIEpTT04gZGVjaXNpb24gY29udHJvbCAobm8gQ29tbW9uT3B0aW9ucykuXG4gKiBUaGUgb25seSBvcHRpb24gaXMgYHN0ZGVycmAgXHUyMDE0IHdoZW4gcHJlc2VudCwgaXQgdHJpZ2dlcnMgZXhpdCBjb2RlIDIgKEJMT0NLKS5cbiAqIFN0ZG91dCBhbHdheXMgcmVjZWl2ZXMgYHt9YCAoZW1wdHkgSlNPTiBvYmplY3QpLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVFeGl0Q29kZU91dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKHsgc3RkZXJyIH0gPSB7fSkgPT4gKHtcbiAgICAgICAgX3R5cGU6IGhvb2tUeXBlLFxuICAgICAgICBzdGRvdXQ6IHt9LFxuICAgICAgICAuLi4oc3RkZXJyICE9PSB1bmRlZmluZWQgPyB7IHN0ZGVyciB9IDoge30pLFxuICAgIH0pO1xufVxuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlVG9vbFVzZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlVG9vbFVzZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdG9vbCBleGVjdXRpb25cbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnIH1cbiAqIH0pO1xuICpcbiAqIC8vIERlbnkgd2l0aCByZWFzb25cbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb246ICdkZW55JyxcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb25SZWFzb246ICdEYW5nZXJvdXMgY29tbWFuZCBkZXRlY3RlZCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQWxsb3cgd2l0aCBtb2RpZmllZCBpbnB1dFxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyxcbiAqICAgICB1cGRhdGVkSW5wdXQ6IHsgY29tbWFuZDogJ2xzIC1sYScgfVxuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcHJlVG9vbFVzZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUHJlVG9vbFVzZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBvc3RUb29sVXNlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQb3N0VG9vbFVzZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgYWZ0ZXIgYSBmaWxlIHJlYWRcbiAqIHBvc3RUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGaWxlIGNvbnRhaW5zIHNlbnNpdGl2ZSBkYXRhJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcG9zdFRvb2xVc2VPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBvc3RUb29sVXNlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdFRvb2xVc2VGYWlsdXJlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnVHJ5IHVzaW5nIGEgZGlmZmVyZW50IGFwcHJvYWNoJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQb3N0VG9vbFVzZUZhaWx1cmVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBVc2VyUHJvbXB0U3VibWl0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBVc2VyUHJvbXB0U3VibWl0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB1c2VyUHJvbXB0U3VibWl0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdUaGlzIHByb2plY3QgdXNlcyBUeXBlU2NyaXB0IHN0cmljdCBtb2RlJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdXNlclByb21wdFN1Ym1pdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiVXNlclByb21wdFN1Ym1pdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNlc3Npb25TdGFydCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU2Vzc2lvblN0YXJ0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzZXNzaW9uU3RhcnRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogSlNPTi5zdHJpbmdpZnkoeyBwcm9qZWN0OiAnbXktcHJvamVjdCcgfSlcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNlc3Npb25TdGFydE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU2Vzc2lvblN0YXJ0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2Vzc2lvbkVuZCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU2Vzc2lvbkVuZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc2Vzc2lvbkVuZE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNlc3Npb25FbmRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIlNlc3Npb25FbmRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdG9wIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0aGUgc3RvcFxuICogc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCByZWFzb25cbiAqIHN0b3BPdXRwdXQoe1xuICogICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgcmVhc29uOiAnVGhlcmUgYXJlIHVuY29tbWl0dGVkIGNoYW5nZXMnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoXCJTdG9wXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3RvcEZhaWx1cmUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN0b3BGYWlsdXJlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzdG9wRmFpbHVyZU91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN0b3BGYWlsdXJlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJTdG9wRmFpbHVyZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN1YmFnZW50U3RhcnQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN1YmFnZW50U3RhcnRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZvY3VzIG9uIGZpbmRpbmcgcGF0dGVybnMnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdWJhZ2VudFN0YXJ0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJTdWJhZ2VudFN0YXJ0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3ViYWdlbnRTdG9wIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdWJhZ2VudFN0b3BPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEJsb2NrIHdpdGggcmVhc29uXG4gKiBzdWJhZ2VudFN0b3BPdXRwdXQoe1xuICogICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgcmVhc29uOiAnVGFzayBub3QgY29tcGxldGUnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3ViYWdlbnRTdG9wT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihcIlN1YmFnZW50U3RvcFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIE5vdGlmaWNhdGlvbiBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgTm90aWZpY2F0aW9uT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBZGQgY29udGV4dCBhYm91dCB0aGUgbm90aWZpY2F0aW9uXG4gKiBub3RpZmljYXRpb25PdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ05vdGlmaWNhdGlvbiBmb3J3YXJkZWQgdG8gU2xhY2sgI2FsZXJ0cyBjaGFubmVsJ1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBTdXBwcmVzcyB0aGUgbm90aWZpY2F0aW9uXG4gKiBub3RpZmljYXRpb25PdXRwdXQoeyBzdXBwcmVzc091dHB1dDogdHJ1ZSB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgbm90aWZpY2F0aW9uT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJOb3RpZmljYXRpb25cIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQcmVDb21wYWN0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQcmVDb21wYWN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwcmVDb21wYWN0T3V0cHV0KHtcbiAqICAgc3lzdGVtTWVzc2FnZTogJ1JlbWVtYmVyOiBzdHJpY3QgbW9kZSBpcyBlbmFibGVkJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHByZUNvbXBhY3RPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIlByZUNvbXBhY3RcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0Q29tcGFjdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdENvbXBhY3RPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHBvc3RDb21wYWN0T3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcG9zdENvbXBhY3RPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIlBvc3RDb21wYWN0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUGVybWlzc2lvblJlcXVlc3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBdXRvLWFwcHJvdmVcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHsgYmVoYXZpb3I6ICdhbGxvdycgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBdXRvLWFwcHJvdmUgd2l0aCBtb2RpZmllZCBpbnB1dFxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdhbGxvdycsXG4gKiAgICAgICB1cGRhdGVkSW5wdXQ6IHsgZmlsZV9wYXRoOiAnL3NhZmUvcGF0aCcgfVxuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1kZW55XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7XG4gKiAgICAgICBiZWhhdmlvcjogJ2RlbnknLFxuICogICAgICAgbWVzc2FnZTogJ05vdCBhbGxvd2VkJyxcbiAqICAgICAgIGludGVycnVwdDogdHJ1ZVxuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gRmFsbCB0aHJvdWdoIHRvIG5vcm1hbCBwcm9tcHRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcGVybWlzc2lvblJlcXVlc3RPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBlcm1pc3Npb25SZXF1ZXN0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2V0dXAgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNldHVwT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBZGQgY29udGV4dCBkdXJpbmcgc2V0dXBcbiAqIHNldHVwT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdQcm9qZWN0IGluaXRpYWxpemVkIHdpdGggY3VzdG9tIHNldHRpbmdzJ1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBTaW1wbGUgcGFzc3Rocm91Z2hcbiAqIHNldHVwT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2V0dXBPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlNldHVwXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgVGVhbW1hdGVJZGxlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBUZWFtbWF0ZUlkbGVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRlYW1tYXRlIHRvIGdvIGlkbGVcbiAqIHRlYW1tYXRlSWRsZU91dHB1dCh7fSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCBmZWVkYmFja1xuICogdGVhbW1hdGVJZGxlT3V0cHV0KHsgc3RkZXJyOiAnQ29udGludWUgd29ya2luZzogdW5maW5pc2hlZCB0YXNrcyByZW1haW4uJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdGVhbW1hdGVJZGxlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUV4aXRDb2RlT3V0cHV0QnVpbGRlcihcIlRlYW1tYXRlSWRsZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFRhc2tDb21wbGV0ZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFRhc2tDb21wbGV0ZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRhc2sgY29tcGxldGlvblxuICogdGFza0NvbXBsZXRlZE91dHB1dCh7fSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCBmZWVkYmFja1xuICogdGFza0NvbXBsZXRlZE91dHB1dCh7IHN0ZGVycjogJ0Nhbm5vdCBjb21wbGV0ZTogdGVzdHMgYXJlIGZhaWxpbmcuJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdGFza0NvbXBsZXRlZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVFeGl0Q29kZU91dHB1dEJ1aWxkZXIoXCJUYXNrQ29tcGxldGVkXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgRWxpY2l0YXRpb24gaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBbiBFbGljaXRhdGlvbk91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWNjZXB0IHRoZSBlbGljaXRhdGlvblxuICogZWxpY2l0YXRpb25PdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgYWN0aW9uOiAnYWNjZXB0JywgY29udGVudDogeyB1c2VybmFtZTogJ2FsaWNlJyB9IH1cbiAqIH0pO1xuICpcbiAqIC8vIERlY2xpbmUgdGhlIGVsaWNpdGF0aW9uXG4gKiBlbGljaXRhdGlvbk91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDogeyBhY3Rpb246ICdkZWNsaW5lJyB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgZWxpY2l0YXRpb25PdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIkVsaWNpdGF0aW9uXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgRWxpY2l0YXRpb25SZXN1bHQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBbiBFbGljaXRhdGlvblJlc3VsdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogZWxpY2l0YXRpb25SZXN1bHRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBlbGljaXRhdGlvblJlc3VsdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiRWxpY2l0YXRpb25SZXN1bHRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBDb25maWdDaGFuZ2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIENvbmZpZ0NoYW5nZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uZmlnQ2hhbmdlT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgY29uZmlnQ2hhbmdlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJDb25maWdDaGFuZ2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBJbnN0cnVjdGlvbnNMb2FkZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBbiBJbnN0cnVjdGlvbnNMb2FkZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGluc3RydWN0aW9uc0xvYWRlZE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGluc3RydWN0aW9uc0xvYWRlZE91dHB1dCA9IFxuLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJJbnN0cnVjdGlvbnNMb2FkZWRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBXb3JrdHJlZUNyZWF0ZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgV29ya3RyZWVDcmVhdGVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHdvcmt0cmVlQ3JlYXRlT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgd29ya3RyZWVDcmVhdGVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIldvcmt0cmVlQ3JlYXRlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgV29ya3RyZWVSZW1vdmUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFdvcmt0cmVlUmVtb3ZlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB3b3JrdHJlZVJlbW92ZU91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHdvcmt0cmVlUmVtb3ZlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJXb3JrdHJlZVJlbW92ZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIEN3ZENoYW5nZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIEN3ZENoYW5nZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFJldHVybiBhZGRpdGlvbmFsIHBhdGhzIHRvIHdhdGNoIGFmdGVyIHRoZSBjd2QgY2hhbmdlXG4gKiBjd2RDaGFuZ2VkT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgd2F0Y2hQYXRoczogWycvbmV3L3BhdGgvdG8vd2F0Y2gnXVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBTaW1wbGUgcGFzc3Rocm91Z2hcbiAqIGN3ZENoYW5nZWRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBjd2RDaGFuZ2VkT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJDd2RDaGFuZ2VkXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgRmlsZUNoYW5nZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIEZpbGVDaGFuZ2VkT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBVcGRhdGUgdGhlIHNldCBvZiB3YXRjaGVkIHBhdGhzXG4gKiBmaWxlQ2hhbmdlZE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHdhdGNoUGF0aHM6IFsnL3BhdGgvdG8vd2F0Y2gnLCAnL2Fub3RoZXIvcGF0aCddXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFNpbXBsZSBwYXNzdGhyb3VnaFxuICogZmlsZUNoYW5nZWRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBmaWxlQ2hhbmdlZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiRmlsZUNoYW5nZWRcIik7XG4iLCAiLyoqXG4gKiBSdW50aW1lIG1vZHVsZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogSGFuZGxlcyBzdGRpbi9zdGRvdXQvZXhpdCBjb2RlIHNlbWFudGljcyBmb3IgY29tcGlsZWQgaG9vayBleGVjdXRpb24uXG4gKiBUaGlzIG1vZHVsZSBpcyB0aGUgY29yZSBvcmNoZXN0cmF0b3IgdGhhdDpcbiAqIC0gUmVhZHMgSlNPTiBmcm9tIHN0ZGluICh3aXJlIGZvcm1hdCB3aXRoIHNuYWtlX2Nhc2UgcHJvcGVydGllcylcbiAqIC0gSW52b2tlcyB0aGUgaG9vayBoYW5kbGVyXG4gKiAtIFdyaXRlcyBvdXRwdXQgdG8gc3Rkb3V0XG4gKiAtIE1hbmFnZXMgZXhpdCBjb2Rlc1xuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEluIGEgY29tcGlsZWQgaG9vayBmaWxlXG4gKiBpbXBvcnQgeyBleGVjdXRlIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL3J1bnRpbWUnO1xuICogaW1wb3J0IG15SG9vayBmcm9tICcuL215LWhvb2suanMnO1xuICpcbiAqIGV4ZWN1dGUobXlIb29rKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmltcG9ydCB7IHBlcnNpc3RFbnZWYXIsIHBlcnNpc3RFbnZWYXJzIH0gZnJvbSBcIi4vZW52LmpzXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi9sb2dnZXIuanNcIjtcbmltcG9ydCB7IEVYSVRfQ09ERVMgfSBmcm9tIFwiLi9vdXRwdXRzLmpzXCI7XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdGRpbi9TdGRvdXQgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogUmVhZHMgYWxsIGRhdGEgZnJvbSBzdGRpbi5cbiAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjb21wbGV0ZSBzdGRpbiBjb250ZW50XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlYWRTdGRpbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCBjaHVua3MgPSBbXTtcbiAgICAgICAgLy8gU2V0IGVuY29kaW5nIGZpcnN0IHRvIGVuc3VyZSBkYXRhIGV2ZW50cyByZWNlaXZlIHN0cmluZ3NcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5zZXRFbmNvZGluZyhcInV0Zi04XCIpO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHtcbiAgICAgICAgICAgIGNodW5rcy5wdXNoKGNodW5rKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2Nlc3Muc3RkaW4ub24oXCJlbmRcIiwgKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShjaHVua3Muam9pbihcIlwiKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZXJyb3JcIiwgKGVycm9yKSA9PiB7XG4gICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cbi8qKlxuICogUGFyc2VzIHN0ZGluIEpTT04gaW5wdXQuXG4gKiBAcGFyYW0gc3RkaW5Db250ZW50IC0gUmF3IHN0ZGluIGNvbnRlbnRcbiAqIEByZXR1cm5zIFBhcnNlZCBpbnB1dCAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiBAdGhyb3dzIEVycm9yIGlmIEpTT04gaXMgbWFsZm9ybWVkXG4gKi9cbmZ1bmN0aW9uIHBhcnNlU3RkaW5JbnB1dChzdGRpbkNvbnRlbnQpIHtcbiAgICAvLyBQYXJzZSBKU09OIC0gaW5wdXQgdXNlcyB3aXJlIGZvcm1hdCAoc25ha2VfY2FzZSkgZGlyZWN0bHlcbiAgICBjb25zdCByYXdJbnB1dCA9IEpTT04ucGFyc2Uoc3RkaW5Db250ZW50KTtcbiAgICByZXR1cm4gcmF3SW5wdXQ7XG59XG4vKipcbiAqIFdyaXRlcyBob29rIG91dHB1dCB0byBzdGRvdXQuXG4gKlxuICogT3V0cHV0IHVzZXMgY2FtZWxDYXNlIGtleXMgcGVyIENsYXVkZSBDb2RlIGhvb2sgc3BlY2lmaWNhdGlvbi5cbiAqIEBwYXJhbSBvdXRwdXQgLSBUaGUgaG9vayBvdXRwdXQgdG8gd3JpdGVcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNob29rLW91dHB1dC1zdHJ1Y3R1cmVcbiAqL1xuZnVuY3Rpb24gd3JpdGVTdGRvdXQob3V0cHV0KSB7XG4gICAgLy8gT3V0cHV0IHVzZXMgY2FtZWxDYXNlIC0gbm8gdHJhbnNmb3JtYXRpb24gbmVlZGVkXG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoSlNPTi5zdHJpbmdpZnkob3V0cHV0KSk7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFcnJvciBIYW5kbGluZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIGVycm9yIG91dHB1dCBmb3IgbWFsZm9ybWVkIHN0ZGluIEpTT04uXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgcGFyc2UgZXJyb3JcbiAqIEByZXR1cm5zIEhvb2tPdXRwdXQgd2l0aCBlbXB0eSBzdGRvdXRcbiAqL1xuZnVuY3Rpb24gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpIHtcbiAgICBsb2dnZXIuZXJyb3IoYEludmFsaWQgSlNPTiBpbnB1dDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgcmV0dXJuIHsgc3Rkb3V0OiB7fSB9O1xufVxuLyoqXG4gKiBXcml0ZXMgaGFuZGxlciBlcnJvciBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdHMgd2l0aCBjb2RlIDIuXG4gKlxuICogV2hlbiBhIGhvb2sgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uOlxuICogLSBTdGFja3RyYWNlICh3aXRoIHNvdXJjZW1hcHMgaWYgYXZhaWxhYmxlKSBpcyBvdXRwdXQgdG8gc3RkZXJyXG4gKiAtIFByb2Nlc3MgZXhpdHMgd2l0aCBjb2RlIDIgKEJMT0NLKVxuICogLSBObyBKU09OIGlzIG91dHB1dCB0byBzdGRvdXRcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0aHJvd24gYnkgdGhlIGhhbmRsZXJcbiAqL1xuZnVuY3Rpb24gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKSB7XG4gICAgLy8gV3JpdGUgc3RhY2sgdHJhY2UgdG8gc3RkZXJyIChzb3VyY2VtYXBzIGFyZSBhcHBsaWVkIGF1dG9tYXRpY2FsbHkgYnkgTm9kZS5qcylcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlfVxcbmApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7U3RyaW5nKGVycm9yKX1cXG5gKTtcbiAgICB9XG4gICAgLy8gTG9nIHRvIGZpbGUgaWYgY29uZmlndXJlZFxuICAgIGxvZ2dlci5lcnJvcihgSG9vayBoYW5kbGVyIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAvLyBDbGVhciBsb2dnZXIgY29udGV4dCBhbmQgY2xvc2VcbiAgICBsb2dnZXIuY2xlYXJDb250ZXh0KCk7XG4gICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgLy8gRXhpdCB3aXRoIGNvZGUgMiAoQkxPQ0spIC0gbm8gSlNPTiBvdXRwdXRcbiAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5CTE9DSyk7XG59XG4vKipcbiAqIENvbnZlcnRzIGEgU3BlY2lmaWNIb29rT3V0cHV0IHRvIEhvb2tPdXRwdXQgZm9yIHdpcmUgZm9ybWF0LlxuICpcbiAqIFNwZWNpZmljSG9va091dHB1dCB0eXBlcyBoYXZlOiB7IF90eXBlLCBzdGRvdXQsIHN0ZGVycj8gfVxuICogSG9va091dHB1dCBoYXM6IHsgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqXG4gKiBTaW5jZSBvdXRwdXQgYnVpbGRlcnMgbm93IHByb2R1Y2Ugd2lyZS1mb3JtYXQgZGlyZWN0bHksIHRoaXMgZnVuY3Rpb25cbiAqIHNpbXBseSBzdHJpcHMgdGhlIGBfdHlwZWAgZGlzY3JpbWluYXRvciBmaWVsZC5cbiAqIEBwYXJhbSBzcGVjaWZpY091dHB1dCAtIFRoZSBzcGVjaWZpYyBvdXRwdXQgZnJvbSBhIGhvb2sgaGFuZGxlclxuICogQHJldHVybnMgSG9va091dHB1dCByZWFkeSBmb3Igc2VyaWFsaXphdGlvblxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gcHJlVG9vbFVzZU91dHB1dCh7IGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfSB9KTtcbiAqIGNvbnN0IGhvb2tPdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAqIC8vIGhvb2tPdXRwdXQ6IHsgc3Rkb3V0OiB7IGhvb2tTcGVjaWZpY091dHB1dDogeyAuLi4gfSB9IH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFRvSG9va091dHB1dChzcGVjaWZpY091dHB1dCkge1xuICAgIGNvbnN0IHsgc3Rkb3V0LCBzdGRlcnIgfSA9IHNwZWNpZmljT3V0cHV0O1xuICAgIHJldHVybiBzdGRlcnIgIT09IHVuZGVmaW5lZCA/IHsgc3Rkb3V0LCBzdGRlcnIgfSA6IHsgc3Rkb3V0IH07XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGVjdXRlIEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEV4ZWN1dGVzIGEgaG9vayBoYW5kbGVyIHdpdGggZnVsbCBydW50aW1lIG9yY2hlc3RyYXRpb24uXG4gKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeSBwb2ludCB0aGF0IGNvbXBpbGVkIGhvb2tzIHVzZS4gV2hlbiBhIGNvbXBpbGVkIGhvb2tcbiAqIHJ1bnMgYXMgYSBDTEk6XG4gKlxuICogMS4gUmVhZHMgYWxsIHN0ZGluXG4gKiAyLiBQYXJzZXMgSlNPTiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAzLiBTZXRzIHVwIGxvZ2dlciBjb250ZXh0IChob29rVHlwZSwgaW5wdXQpXG4gKiA0LiBDYWxscyBoYW5kbGVyIHdpdGggaW5wdXQgYW5kIGNvbnRleHQgKGxvZ2dlcilcbiAqIDUuIEhhbmRsZXMgYW55IGVycm9ycywgbG9ncyB0aGVtXG4gKiA2LiBXcml0ZXMgSlNPTiB0byBzdGRvdXRcbiAqIDcuIENsb3NlcyBsb2dnZXJcbiAqIDguIEV4aXRzIHdpdGggYXBwcm9wcmlhdGUgY29kZVxuICogQHBhcmFtIGhvb2tGbiAtIFRoZSBob29rIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgKGZyb20gaG9vayBmYWN0b3J5KVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEluIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCB7IHByZVRvb2xVc2VIb29rLCBwcmVUb29sVXNlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBjb25zdCBteUhvb2sgPSBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShob29rRm4pIHtcbiAgICBsZXQgb3V0cHV0O1xuICAgIHRyeSB7XG4gICAgICAgIC8vIFJlYWQgYW5kIHBhcnNlIHN0ZGluXG4gICAgICAgIGxldCBzdGRpbkNvbnRlbnQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzdGRpbkNvbnRlbnQgPSBhd2FpdCByZWFkU3RkaW4oKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2dFcnJvcihlcnJvciwgXCJGYWlsZWQgdG8gcmVhZCBzdGRpblwiKTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBQYXJzZSBhbmQgdHJhbnNmb3JtIGlucHV0XG4gICAgICAgIGxldCBpbnB1dDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlucHV0ID0gcGFyc2VTdGRpbklucHV0KHN0ZGluQ29udGVudCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIubG9nRXJyb3IoZXJyb3IsIFwiRmFpbGVkIHRvIHBhcnNlIHN0ZGluIEpTT05cIik7XG4gICAgICAgICAgICBvdXRwdXQgPSBjcmVhdGVNYWxmb3JtZWRJbnB1dE91dHB1dChlcnJvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IGxvZ2dlciBjb250ZXh0XG4gICAgICAgIGNvbnN0IGhvb2tFdmVudE5hbWUgPSBob29rRm4uaG9va0V2ZW50TmFtZTtcbiAgICAgICAgbG9nZ2VyLnNldENvbnRleHQoaG9va0V2ZW50TmFtZSwgaW5wdXQpO1xuICAgICAgICAvLyBCdWlsZCBjb250ZXh0IC0gU2Vzc2lvblN0YXJ0IGhvb2tzIGdldCBleHRlbmRlZCBjb250ZXh0IHdpdGggcGVyc2lzdEVudlZhclxuICAgICAgICBjb25zdCBjb250ZXh0ID0gaG9va0V2ZW50TmFtZSA9PT0gXCJTZXNzaW9uU3RhcnRcIiA/IHsgbG9nZ2VyLCBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IDogeyBsb2dnZXIgfTtcbiAgICAgICAgLy8gRXhlY3V0ZSBoYW5kbGVyXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzcGVjaWZpY091dHB1dCA9IGF3YWl0IGhvb2tGbihpbnB1dCwgY29udGV4dCk7XG4gICAgICAgICAgICBvdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZXIgdGhyZXcgLSBvdXRwdXQgc3RhY2t0cmFjZSB0byBzdGRlcnIgYW5kIGV4aXQgd2l0aCBjb2RlIDJcbiAgICAgICAgICAgIC8vIFRoaXMgY2FsbCBuZXZlciByZXR1cm5zIChwcm9jZXNzLmV4aXQpXG4gICAgICAgICAgICBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZpbmFsbHkge1xuICAgICAgICAvLyBXcml0ZSBvdXRwdXQgaWYgd2UgaGF2ZSBpdFxuICAgICAgICBpZiAob3V0cHV0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHdyaXRlU3Rkb3V0KG91dHB1dC5zdGRvdXQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIENsZWFuIHVwIGxvZ2dlciAoc2luZ2xlIGNsZWFudXAgcGF0aClcbiAgICAgICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgICAgICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgICAgLy8gRXhpdC1jb2RlIEJMT0NLOiB1bmxpa2UgaGFuZGxlciB0aHJvdyAobm8gc3Rkb3V0KSwgdGhpcyBwYXRoIHN0aWxsIHdyaXRlc1xuICAgICAgICAvLyBzdHJ1Y3R1cmVkIEpTT04gdG8gc3Rkb3V0IChhcyBlbXB0eSB7fSkgYWxvbmdzaWRlIHRoZSBzdGRlcnIgbWVzc2FnZS5cbiAgICAgICAgLy8gVGhlIGNhbGxlciBjb250cm9scyBzdGRlcnIgZm9ybWF0dGluZyAobm8gYXBwZW5kZWQgbmV3bGluZSkuXG4gICAgICAgIGlmIChvdXRwdXQ/LnN0ZGVyciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShvdXRwdXQuc3RkZXJyKTtcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLkJMT0NLKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBFeGl0IHdpdGggc3VjY2VzcyAoaGFuZGxlciBlcnJvcnMgZXhpdCB2aWEgaGFuZGxlSGFuZGxlckVycm9yIHdpdGggY29kZSAyKVxuICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgICB9XG59XG4iLCAiLyoqXG4gKiBTaGFyZWQgY29udGV4dC1idWlsZGluZyB1dGlsaXRpZXMgZm9yIFNlc3Npb25TdGFydCBhbmQgU3ViYWdlbnRTdGFydCBob29rcy5cbiAqXG4gKiBCb3RoIGhvb2tzIG5lZWQgaWRlbnRpY2FsIGNhcmQgY29udGV4dCBpbmplY3Rpb24uIFRoaXMgbW9kdWxlIGV4dHJhY3RzIHRoZVxuICogc2hhcmVkIGxvZ2ljIHNvIGl0IGNhbiBiZSByZXVzZWQgd2l0aG91dCBkdXBsaWNhdGlvbi5cbiAqXG4gKiBAc3VtbWFyeSBTaGFyZWQgY29udGV4dC1idWlsZGluZyB1dGlsaXRpZXMgZm9yIHNlc3Npb24gYW5kIHN1YmFnZW50IGhvb2tzXG4gKiBAbW9kdWxlIGxpYi9jb250ZXh0XG4gKi9cblxuaW1wb3J0IHsgZXhlY0ZpbGVTeW5jIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IHJlYWRkaXJTeW5jLCByZWFkRmlsZVN5bmMsIHN0YXRTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uSW5wdXQgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG5pbXBvcnQgeyBDQVJEU19FTlZfVkFSUyB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IFdPUktTUEFDRV9CUkFOQ0hFU19GSUxFLCBXT1JLU1BBQ0VfQ09NTUlUU19GSUxFIH0gZnJvbSAnQGNhcmRzL3Nkay9wcm90b2NvbCc7XG5pbXBvcnQgeyBmb3JtYXRDb21taXRMb2cgfSBmcm9tICcuL2ZpbGUtdHJlZS5qcyc7XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gdGhlIGNhcmQgcmVwb3NpdG9yeSBjYW5ub3QgYmUgcmVhZC5cbiAqXG4gKiBXcmFwcyB0aGUgdW5kZXJseWluZyBmaWxlc3lzdGVtIGVycm9yIHdpdGggdGhlIHJlcG9zaXRvcnkgcGF0aCBmb3JcbiAqIHN0cnVjdHVyZWQgZXJyb3IgaGFuZGxpbmcgaW4gc2Vzc2lvbiBhbmQgc3ViYWdlbnQgaG9va3MuXG4gKi9cbmV4cG9ydCBjbGFzcyBDYXJkUmVwb0FjY2Vzc0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBvdmVycmlkZSByZWFkb25seSBuYW1lID0gJ0NhcmRSZXBvQWNjZXNzRXJyb3InO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSByZXBvUGF0aDogc3RyaW5nLFxuICAgIGNhdXNlOiB1bmtub3duXG4gICkge1xuICAgIGNvbnN0IHJlYXNvbiA9IGNhdXNlIGluc3RhbmNlb2YgRXJyb3IgPyBjYXVzZS5tZXNzYWdlIDogU3RyaW5nKGNhdXNlKTtcbiAgICBzdXBlcihgQ2Fubm90IHJlYWQgY2FyZCByZXBvc2l0b3J5IGF0ICR7cmVwb1BhdGh9OiAke3JlYXNvbn1gKTtcbiAgICB0aGlzLmNhdXNlID0gY2F1c2U7XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIGEgdXNlci1mYWNpbmcgc3lzdGVtIG1lc3NhZ2UgZXhwbGFpbmluZyB0aGUgY2FyZCByZXBvIGFjY2VzcyBmYWlsdXJlLlxuICAgKlxuICAgKiBAcGFyYW0gYWN0b3IgLSBIdW1hbi1yZWFkYWJsZSBub3VuIGZvciB0aGUgZmFpbGluZyBlbnRpdHkgKGUuZy4gXCJzZXNzaW9uXCIsIFwic3ViYWdlbnRcIikuXG4gICAqIEByZXR1cm5zIE9iamVjdCB3aXRoIGBzeXN0ZW1NZXNzYWdlYCBhbmQgYHN0b3BSZWFzb25gIHN0cmluZ3MuXG4gICAqL1xuICB0b0hvb2tGYWlsdXJlKGFjdG9yOiBzdHJpbmcpOiB7IHN5c3RlbU1lc3NhZ2U6IHN0cmluZzsgc3RvcFJlYXNvbjogc3RyaW5nIH0ge1xuICAgIHJldHVybiB7XG4gICAgICBzeXN0ZW1NZXNzYWdlOiBbXG4gICAgICAgIGBUaGUgY2FyZCByZXBvc2l0b3J5IGF0ICcke3RoaXMucmVwb1BhdGh9JyBpcyBub3QgYWNjZXNzaWJsZS5gLFxuICAgICAgICAnJyxcbiAgICAgICAgYEVycm9yOiAke3RoaXMubWVzc2FnZX1gLFxuICAgICAgICAnJyxcbiAgICAgICAgYFRoaXMgJHthY3Rvcn0gY2Fubm90IHByb2NlZWQgd2l0aG91dCBhIHZhbGlkIGNhcmQgcmVwb3NpdG9yeS4gVG8gcmVzb2x2ZTpgLFxuICAgICAgICBgMS4gVmVyaWZ5IHRoZSBjYXJkIHJlcG9zaXRvcnkgZGlyZWN0b3J5IGV4aXN0cyBhdDogJHt0aGlzLnJlcG9QYXRofWAsXG4gICAgICAgICcyLiBFbnN1cmUgdGhlIGN1cnJlbnQgcHJvY2VzcyBoYXMgcmVhZCBwZXJtaXNzaW9ucyBmb3IgdGhlIGRpcmVjdG9yeSBhbmQgaXRzIGNvbnRlbnRzJyxcbiAgICAgICAgJzMuIENoZWNrIHRoYXQgdGhlIENBUkRfUkVQT19QQVRIIGVudmlyb25tZW50IHZhcmlhYmxlIHBvaW50cyB0byBhIHZhbGlkIGNhcmQgcmVwb3NpdG9yeSdcbiAgICAgIF0uam9pbignXFxuJyksXG4gICAgICBzdG9wUmVhc29uOiBgQ2FyZCByZXBvc2l0b3J5IGluYWNjZXNzaWJsZSBhdCAke3RoaXMucmVwb1BhdGh9OiAke3RoaXMubWVzc2FnZX1gXG4gICAgfTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDYXJkIG1ldGFkYXRhXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogU3Vic2V0IG9mIENBUkQubWV0YS5qc29uIGZpZWxkcyBzdXJmYWNlZCBpbiB0aGUgYDxjYXJkPmAgY29udGV4dCBibG9jay5cbiAqL1xuaW50ZXJmYWNlIENhcmRNZXRhIHtcbiAgaWQ6IHN0cmluZztcbiAgdGl0bGU6IHN0cmluZztcbiAgc3RhdHVzOiBzdHJpbmc7XG4gIGdhdGVzOiB7XG4gICAgcGxhblJlcXVpcmVkOiBib29sZWFuO1xuICAgIHBsYW5BcHByb3ZlZDogYm9vbGVhbjtcbiAgICBtZXJnZVJlcXVlc3RSZXF1aXJlZDogYm9vbGVhbjtcbiAgICBtZXJnZUFwcHJvdmVkOiBib29sZWFuO1xuICB9O1xufVxuXG4vKipcbiAqIFJlYWRzIGFuZCBwYXJzZXMgQ0FSRC5tZXRhLmpzb24gZnJvbSB0aGUgY2FyZCByZXBvc2l0b3J5LlxuICpcbiAqIFJldHVybnMgYG51bGxgIHdoZW4gdGhlIGZpbGUgaXMgbWlzc2luZyBvciBtYWxmb3JtZWQgc28gdGhlIGNhbGxlclxuICogY2FuIGZhbGwgYmFjayB0byB2YWx1ZXMgZnJvbSB7QGxpbmsgQWN0aW9uSW5wdXR9LlxuICpcbiAqIEBwYXJhbSByb290UGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSBjYXJkIHJlcG9zaXRvcnkuXG4gKiBAcmV0dXJucyBQYXJzZWQgbWV0YWRhdGEsIG9yIGBudWxsYCB3aGVuIHVuYXZhaWxhYmxlLlxuICovXG5mdW5jdGlvbiByZWFkQ2FyZE1ldGEocm9vdFBhdGg6IHN0cmluZyk6IENhcmRNZXRhIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmF3ID0gcmVhZEZpbGVTeW5jKGpvaW4ocm9vdFBhdGgsICdDQVJELm1ldGEuanNvbicpLCAndXRmLTgnKTtcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJhdykgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgY29uc3QgZ2F0ZXMgPSBwYXJzZWRbJ2dhdGVzJ10gYXMgUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gfCB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBTdHJpbmcocGFyc2VkWydpZCddID8/ICcnKSxcbiAgICAgIHRpdGxlOiBTdHJpbmcocGFyc2VkWyd0aXRsZSddID8/ICcnKSxcbiAgICAgIHN0YXR1czogU3RyaW5nKHBhcnNlZFsnc3RhdHVzJ10gPz8gJycpLFxuICAgICAgZ2F0ZXM6IHtcbiAgICAgICAgcGxhblJlcXVpcmVkOiBnYXRlcz8uWydwbGFuUmVxdWlyZWQnXSA9PT0gdHJ1ZSxcbiAgICAgICAgcGxhbkFwcHJvdmVkOiBnYXRlcz8uWydwbGFuQXBwcm92ZWQnXSA9PT0gdHJ1ZSxcbiAgICAgICAgbWVyZ2VSZXF1ZXN0UmVxdWlyZWQ6IGdhdGVzPy5bJ21lcmdlUmVxdWVzdFJlcXVpcmVkJ10gPT09IHRydWUsXG4gICAgICAgIG1lcmdlQXBwcm92ZWQ6IGdhdGVzPy5bJ21lcmdlQXBwcm92ZWQnXSA9PT0gdHJ1ZVxuICAgICAgfVxuICAgIH07XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQnVpbGRzIHRoZSBgPGNhcmQ+YCBYTUwgYmxvY2sgd2l0aCBjYXJkIGlkZW50aXR5LCBnYXRlcywgYW5kIGVudiB2YXJzLlxuICpcbiAqIEZhbGxzIGJhY2sgdG8ge0BsaW5rIEFjdGlvbklucHV0fSBmaWVsZHMgd2hlbiBDQVJELm1ldGEuanNvbiBpcyB1bnJlYWRhYmxlLlxuICpcbiAqIEBwYXJhbSBhY3Rpb25JbnB1dCAtIFBhcnNlZCBhY3Rpb24gaW5wdXQgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKiBAcmV0dXJucyBUaGUgYDxjYXJkIC4uLj4uLi48L2NhcmQ+YCBibG9jayBzdHJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhcmRCbG9jayhhY3Rpb25JbnB1dDogQWN0aW9uSW5wdXQpOiBzdHJpbmcge1xuICBjb25zdCBtZXRhID0gcmVhZENhcmRNZXRhKGFjdGlvbklucHV0LmNhcmRSZXBvUGF0aCk7XG5cbiAgY29uc3QgaWQgPSBtZXRhPy5pZCB8fCBhY3Rpb25JbnB1dC5jYXJkSWQ7XG4gIGNvbnN0IHRpdGxlID0gbWV0YT8udGl0bGUgfHwgJyc7XG4gIGNvbnN0IHN0YXR1cyA9IG1ldGE/LnN0YXR1cyB8fCAnJztcblxuICBjb25zdCBnYXRlc0xpbmUgPSBtZXRhXG4gICAgPyBgZ2F0ZXM6IHBsYW5SZXF1aXJlZD0ke21ldGEuZ2F0ZXMucGxhblJlcXVpcmVkfSBwbGFuQXBwcm92ZWQ9JHttZXRhLmdhdGVzLnBsYW5BcHByb3ZlZH0gbWVyZ2VSZXF1ZXN0UmVxdWlyZWQ9JHttZXRhLmdhdGVzLm1lcmdlUmVxdWVzdFJlcXVpcmVkfSBtZXJnZUFwcHJvdmVkPSR7bWV0YS5nYXRlcy5tZXJnZUFwcHJvdmVkfWBcbiAgICA6ICcnO1xuXG4gIGNvbnN0IHdvcmtzcGFjZUJyYW5jaCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9CUkFOQ0hdO1xuICBjb25zdCBiYXNlQnJhbmNoID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQkFTRV9CUkFOQ0hdO1xuXG4gIGNvbnN0IHdvcmtzcGFjZVBhdGggPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSF07XG4gIGNvbnN0IGVudkxpbmVzID0gW2AgIENBUkRfUkVQT19QQVRIPSR7YWN0aW9uSW5wdXQuY2FyZFJlcG9QYXRofWBdO1xuICBpZiAod29ya3NwYWNlUGF0aCkgZW52TGluZXMucHVzaChgICBXT1JLU1BBQ0VfUEFUSD0ke3dvcmtzcGFjZVBhdGh9YCk7XG4gIGlmIChiYXNlQnJhbmNoKSBlbnZMaW5lcy5wdXNoKGAgIEJBU0VfQlJBTkNIPSR7YmFzZUJyYW5jaH1gKTtcbiAgaWYgKHdvcmtzcGFjZUJyYW5jaCkgZW52TGluZXMucHVzaChgICBXT1JLU1BBQ0VfQlJBTkNIPSR7d29ya3NwYWNlQnJhbmNofWApO1xuXG4gIGNvbnN0IGJvZHlMaW5lczogc3RyaW5nW10gPSBbXTtcbiAgaWYgKHRpdGxlKSBib2R5TGluZXMucHVzaChgdGl0bGU6ICR7dGl0bGV9YCk7XG4gIGJvZHlMaW5lcy5wdXNoKCcnKTtcbiAgaWYgKGdhdGVzTGluZSkgYm9keUxpbmVzLnB1c2goZ2F0ZXNMaW5lKTtcbiAgYm9keUxpbmVzLnB1c2goJ2VudjonKTtcbiAgYm9keUxpbmVzLnB1c2goLi4uZW52TGluZXMpO1xuXG4gIGNvbnN0IGF0dHJzID0gW2BpZD1cIiR7aWR9XCJgLCBgc3RhdHVzPVwiJHtzdGF0dXN9XCJgLCBgbW9kZT1cIiR7YWN0aW9uSW5wdXQuZXhlY3V0aW9uTW9kZX1cImBdO1xuXG4gIHJldHVybiBgPGNhcmQgJHthdHRycy5qb2luKCcgJyl9PlxcbiR7Ym9keUxpbmVzLmpvaW4oJ1xcbicpfVxcbjwvY2FyZD5gO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDYXJkIHJlcG8gbGlzdGluZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEZvcm1hdHMgYW4gbXRpbWUgYXMgYW4gSVNPIDg2MDEgc3RyaW5nIHRydW5jYXRlZCB0byBtaW51dGVzIGluIFVUQy5cbiAqXG4gKiBAcGFyYW0gbXRpbWVNcyAtIE1vZGlmaWNhdGlvbiB0aW1lIGluIG1pbGxpc2Vjb25kcyBzaW5jZSBlcG9jaC5cbiAqIEByZXR1cm5zIElTTyBzdHJpbmcgbGlrZSBgMjAyNS0wMi0yNFQxNDoyNFpgLlxuICovXG5mdW5jdGlvbiBmb3JtYXRUaW1lc3RhbXAobXRpbWVNczogbnVtYmVyKTogc3RyaW5nIHtcbiAgY29uc3QgZCA9IG5ldyBEYXRlKG10aW1lTXMpO1xuICBjb25zdCBpc28gPSBkLnRvSVNPU3RyaW5nKCk7IC8vIDIwMjUtMDItMjRUMTQ6MjQ6MjEuMDAwWlxuICAvLyBUcnVuY2F0ZSB0byBtaW51dGVzOiBcIjIwMjUtMDItMjRUMTQ6MjRaXCJcbiAgcmV0dXJuIGAke2lzby5zbGljZSgwLCAxNil9WmA7XG59XG5cbi8qKlxuICogQ291bnRzIGZpbGVzIChub24tZGlyZWN0b3JpZXMpIGluIGEgZGlyZWN0b3J5IGFuZCByZXR1cm5zIHRoZSBsYXRlc3QgbXRpbWUuXG4gKlxuICogQHBhcmFtIGRpclBhdGggLSBEaXJlY3RvcnkgdG8gc2Nhbi5cbiAqIEByZXR1cm5zIFR1cGxlIG9mIGBbZmlsZUNvdW50LCBsYXRlc3RNdGltZU1zXWAsIG9yIGBbMCwgMF1gIG9uIGVycm9yLlxuICovXG5mdW5jdGlvbiBkaXJTdGF0cyhkaXJQYXRoOiBzdHJpbmcpOiBbY291bnQ6IG51bWJlciwgbGF0ZXN0TXRpbWVNczogbnVtYmVyXSB7XG4gIHRyeSB7XG4gICAgY29uc3QgZW50cmllcyA9IHJlYWRkaXJTeW5jKGRpclBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICBsZXQgY291bnQgPSAwO1xuICAgIGxldCBsYXRlc3QgPSAwO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgaWYgKGVudHJ5LmlzRmlsZSgpKSB7XG4gICAgICAgIGNvdW50Kys7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgbXQgPSBzdGF0U3luYyhqb2luKGRpclBhdGgsIGVudHJ5Lm5hbWUpKS5tdGltZU1zO1xuICAgICAgICAgIGlmIChtdCA+IGxhdGVzdCkgbGF0ZXN0ID0gbXQ7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIGluZGl2aWR1YWwgc3RhdCBmYWlsdXJlIGlzIG5vbi1mYXRhbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbY291bnQsIGxhdGVzdF07XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBbMCwgMF07XG4gIH1cbn1cblxuLyoqXG4gKiBCdWlsZHMgdGhlIGA8Y2FyZC1yZXBvPmAgYmxvY2s6IHJvb3QtbGV2ZWwgZmlsZXMgd2l0aCB0aW1lc3RhbXBzLFxuICogZGlyZWN0b3JpZXMgd2l0aCBjaGlsZCBjb3VudHMsIGFuZCBzdHJlYW1zIHN1YmRpcmVjdG9yaWVzLlxuICpcbiAqIEBwYXJhbSByb290UGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSBjYXJkIHJlcG9zaXRvcnkuXG4gKiBAcmV0dXJucyBUaGUgYDxjYXJkLXJlcG8+Li4uPC9jYXJkLXJlcG8+YCBibG9jayBzdHJpbmcuXG4gKiBAdGhyb3dzIHtDYXJkUmVwb0FjY2Vzc0Vycm9yfSBXaGVuIHRoZSByb290IGRpcmVjdG9yeSBjYW5ub3QgYmUgcmVhZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2FyZFJlcG9CbG9jayhyb290UGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IGVudHJpZXM6IHsgbmFtZTogc3RyaW5nOyBpc0RpcjogYm9vbGVhbiB9W107XG4gIHRyeSB7XG4gICAgZW50cmllcyA9IHJlYWRkaXJTeW5jKHJvb3RQYXRoLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSkubWFwKChkKSA9PiAoe1xuICAgICAgbmFtZTogZC5uYW1lLnRvU3RyaW5nKCksXG4gICAgICBpc0RpcjogZC5pc0RpcmVjdG9yeSgpXG4gICAgfSkpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBDYXJkUmVwb0FjY2Vzc0Vycm9yKHJvb3RQYXRoLCBlcnJvcik7XG4gIH1cblxuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICBpZiAoZW50cnkubmFtZSA9PT0gJy5naXQnKSBjb250aW51ZTtcbiAgICBjb25zdCBmdWxsUGF0aCA9IGpvaW4ocm9vdFBhdGgsIGVudHJ5Lm5hbWUpO1xuXG4gICAgaWYgKGVudHJ5LmlzRGlyKSB7XG4gICAgICBpZiAoZW50cnkubmFtZSA9PT0gJ3N0cmVhbXMnKSB7XG4gICAgICAgIC8vIFN0cmVhbXM6IHNob3cgZWFjaCBzdWJkaXJlY3Rvcnkgd2l0aCBjaGlsZCBjb3VudCArIGxhdGVzdCB0aW1lc3RhbXBcbiAgICAgICAgbGluZXMucHVzaCgnc3RyZWFtcy8nKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBzdHJlYW1FbnRyaWVzID0gcmVhZGRpclN5bmMoZnVsbFBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHN1YiBvZiBzdHJlYW1FbnRyaWVzKSB7XG4gICAgICAgICAgICBpZiAoc3ViLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgY29uc3Qgc3ViTmFtZSA9IHN1Yi5uYW1lLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgIGNvbnN0IFtjb3VudCwgbGF0ZXN0XSA9IGRpclN0YXRzKGpvaW4oZnVsbFBhdGgsIHN1Yk5hbWUpKTtcbiAgICAgICAgICAgICAgY29uc3QgdHMgPSBsYXRlc3QgPiAwID8gYCAgIGxhdGVzdCAke2Zvcm1hdFRpbWVzdGFtcChsYXRlc3QpfWAgOiAnJztcbiAgICAgICAgICAgICAgbGluZXMucHVzaChgJHtgICAke3N1Yk5hbWV9L2AucGFkRW5kKDI0KX0ke2NvdW50fSBmaWxlcyR7dHN9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBzdHJlYW1zIGRpciB1bnJlYWRhYmxlIFx1MjAxNCBhbHJlYWR5IGxpc3RlZCB0aGUgZGlyZWN0b3J5IG5hbWVcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTm9uLXN0cmVhbXMgZGlyZWN0b3J5OiBzaG93IGNoaWxkIGNvdW50ICsgbGF0ZXN0IHRpbWVzdGFtcFxuICAgICAgICBjb25zdCBbY291bnQsIGxhdGVzdF0gPSBkaXJTdGF0cyhmdWxsUGF0aCk7XG4gICAgICAgIGNvbnN0IHRzID0gbGF0ZXN0ID4gMCA/IGAgICBsYXRlc3QgJHtmb3JtYXRUaW1lc3RhbXAobGF0ZXN0KX1gIDogJyc7XG4gICAgICAgIGxpbmVzLnB1c2goYCR7YCR7ZW50cnkubmFtZX0vYC5wYWRFbmQoMjQpfSR7Y291bnR9IGZpbGVzJHt0c31gKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUm9vdC1sZXZlbCBmaWxlOiBzaG93IG5hbWUgKyB0aW1lc3RhbXBcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IG10ID0gc3RhdFN5bmMoZnVsbFBhdGgpLm10aW1lTXM7XG4gICAgICAgIGxpbmVzLnB1c2goYCR7ZW50cnkubmFtZX1gLnBhZEVuZCgyNCkgKyBmb3JtYXRUaW1lc3RhbXAobXQpKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICBsaW5lcy5wdXNoKGVudHJ5Lm5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBgPGNhcmQtcmVwbz5cXG4ke2xpbmVzLmpvaW4oJ1xcbicpfVxcbjwvY2FyZC1yZXBvPmA7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENhcmQgcmVwbyBnaXQgbG9nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKiBNYXhpbXVtIG51bWJlciBvZiBxdWFsaWZ5aW5nIGNvbW1pdHMgc2hvd24gaW4gdGhlIGNhcmQgcmVwbyBsb2cuICovXG5jb25zdCBNQVhfQ0FSRF9SRVBPX0xPR19DT01NSVRTID0gNTtcblxuLyoqXG4gKiBCdWlsZHMgdGhlIGA8Y2FyZC1yZXBvLWxvZz5gIGJsb2NrIHdpdGggcmVjZW50IGNvbW1pdHMgYW5kIHBhdGNoIGRpZmZzLlxuICpcbiAqIEZpbHRlcnMgb3V0IGNvbW1pdHMgdGhhdCBleGNsdXNpdmVseSB0b3VjaCBgc3RyZWFtcy9gIGZpbGVzIChoaWdoLWZyZXF1ZW5jeVxuICogdHJhbnNjcmlwdCB3cml0ZXMpLiBTaG93cyBwYXRjaCBvdXRwdXQgaW5zdGVhZCBvZiBkaWZmc3RhdCBmb3IgcmVtYWluaW5nXG4gKiBjb250ZW50LlxuICpcbiAqIFJldHVybnMgYG51bGxgIHdoZW4gdGhlIHJlcG9zaXRvcnkgaGFzIG5vIHF1YWxpZnlpbmcgY29tbWl0cyBvciBnaXQgaXNcbiAqIHVuYXZhaWxhYmxlLCBzbyB0aGUgYmxvY2sgY2FuIGJlIG9taXR0ZWQgZnJvbSB0aGUgb3V0cHV0LlxuICpcbiAqIEBwYXJhbSByb290UGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSBjYXJkIHJlcG9zaXRvcnkuXG4gKiBAcmV0dXJucyBUaGUgYDxjYXJkLXJlcG8tbG9nIC4uLj4uLi48L2NhcmQtcmVwby1sb2c+YCBibG9jayBzdHJpbmcsIG9yIGBudWxsYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2FyZFJlcG9Mb2dCbG9jayhyb290UGF0aDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgY29uc3QgbG9nID0gZXhlY0ZpbGVTeW5jKFxuICAgICAgJ2dpdCcsXG4gICAgICBbXG4gICAgICAgICdsb2cnLFxuICAgICAgICBgLSR7TUFYX0NBUkRfUkVQT19MT0dfQ09NTUlUU31gLFxuICAgICAgICAnLS1wcmV0dHk9Zm9ybWF0OiV4MDAlaCAtICVhbjogJXMnLFxuICAgICAgICAnLS1uYW1lLW9ubHknLFxuICAgICAgICAnLS0nLFxuICAgICAgICAnLicsXG4gICAgICAgICc6IXN0cmVhbXMvJyxcbiAgICAgICAgJzohLmdpdGlnbm9yZScsXG4gICAgICAgIGA6ISR7V09SS1NQQUNFX0JSQU5DSEVTX0ZJTEV9YCxcbiAgICAgICAgYDohJHtXT1JLU1BBQ0VfQ09NTUlUU19GSUxFfWBcbiAgICAgIF0sXG4gICAgICB7XG4gICAgICAgIGN3ZDogcm9vdFBhdGgsXG4gICAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgICB0aW1lb3V0OiA1MDAwLFxuICAgICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgICB9XG4gICAgKS50cmltKCk7XG5cbiAgICBpZiAoIWxvZykgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBmb3JtYXR0ZWQgPSBmb3JtYXRDb21taXRMb2cobG9nLCAnbnVsJyk7XG4gICAgaWYgKCFmb3JtYXR0ZWQpIHJldHVybiBudWxsO1xuXG4gICAgbGV0IHRvdGFsQ291bnQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb3VudFN0ciA9IGV4ZWNGaWxlU3luYygnZ2l0JywgWydyZXYtbGlzdCcsICctLWNvdW50JywgJ0hFQUQnXSwge1xuICAgICAgICBjd2Q6IHJvb3RQYXRoLFxuICAgICAgICBlbmNvZGluZzogJ3V0Zi04JyxcbiAgICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgICAgc3RkaW86IFsncGlwZScsICdwaXBlJywgJ3BpcGUnXVxuICAgICAgfSkudHJpbSgpO1xuICAgICAgdG90YWxDb3VudCA9IHBhcnNlSW50KGNvdW50U3RyLCAxMCk7XG4gICAgICBpZiAoTnVtYmVyLmlzTmFOKHRvdGFsQ291bnQpKSB0b3RhbENvdW50ID0gbnVsbDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIGNvdW50IGlzIG9wdGlvbmFsXG4gICAgfVxuXG4gICAgY29uc3QgY291bnRBdHRyID0gdG90YWxDb3VudCAhPT0gbnVsbCA/IGAgY291bnQ9XCIke3RvdGFsQ291bnR9XCJgIDogJyc7XG4gICAgcmV0dXJuIGA8Y2FyZC1yZXBvLWxvZyR7Y291bnRBdHRyfT5cXG4ke2Zvcm1hdHRlZH1cXG48L2NhcmQtcmVwby1sb2c+YDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gV29ya3NwYWNlIHJlcG8gbG9nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKiBNYXhpbXVtIG51bWJlciBvZiBjb21taXRzIHNob3duIHdpdGggZnVsbCBkZXRhaWwgcGVyIGJyYW5jaCBibG9jay4gKi9cbmNvbnN0IE1BWF9XT1JLU1BBQ0VfQ09NTUlUU19QRVJfQlJBTkNIID0gNTtcblxuLyoqXG4gKiBXb3Jrc3BhY2UgdHJhY2tpbmcgZGF0YSByZWFkIGZyb20gc2VwYXJhdGUgd29ya3NwYWNlIGZpbGVzLlxuICovXG5pbnRlcmZhY2UgV29ya3NwYWNlRGF0YSB7XG4gIGJyYW5jaGVzOiBSZWNvcmQ8c3RyaW5nLCB7IHBhcmVudEJyYW5jaD86IHN0cmluZzsgYWRkZWRBdDogc3RyaW5nIH0+O1xuICBjb21taXRzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBSZWFkcyB3b3Jrc3BhY2UgZGF0YSBmcm9tIHNlcGFyYXRlIGZpbGVzIGluIHRoZSBjYXJkIHJlcG9zaXRvcnkuXG4gKlxuICogUmVhZHMgYnJhbmNoZXMgZnJvbSBgd29ya3NwYWNlLWJyYW5jaGVzLmpzb25gIGFuZCBjb21taXRzIGZyb21cbiAqIGB3b3Jrc3BhY2UtY29tbWl0cy5jc3ZgLiBFYWNoIGZpbGUgaXMgcmVhZCBpbmRlcGVuZGVudGx5IFx1MjAxNCBFTk9FTlQgaXNcbiAqIHRyZWF0ZWQgYXMgYW4gZW1wdHkgcmVzdWx0LCBvdGhlciBlcnJvcnMgY2F1c2UgYG51bGxgIHRvIGJlIHJldHVybmVkLlxuICpcbiAqIFJldHVybnMgZGF0YSB3aGVuZXZlciBlaXRoZXIgZmlsZSBoYXMgY29udGVudC4gUmV0dXJucyBgbnVsbGAgb25seSB3aGVuXG4gKiBib3RoIGZpbGVzIGFyZSBhYnNlbnQgb3IgZW1wdHksIG9yIHdoZW4gYSBub24tRU5PRU5UIGVycm9yIG9jY3Vycy5cbiAqXG4gKiBAcGFyYW0gY2FyZFJlcG9QYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAqIEByZXR1cm5zIFBhcnNlZCB3b3Jrc3BhY2UgZGF0YSwgb3IgYG51bGxgIHdoZW4gdW5hdmFpbGFibGUuXG4gKi9cbmZ1bmN0aW9uIHJlYWRXb3Jrc3BhY2VEYXRhKGNhcmRSZXBvUGF0aDogc3RyaW5nKTogV29ya3NwYWNlRGF0YSB8IG51bGwge1xuICBjb25zdCBicmFuY2hlczogV29ya3NwYWNlRGF0YVsnYnJhbmNoZXMnXSA9IHt9O1xuICBsZXQgY29tbWl0czogc3RyaW5nW10gPSBbXTtcblxuICAvLyBSZWFkIGJyYW5jaGVzIGZyb20gd29ya3NwYWNlLWJyYW5jaGVzLmpzb25cbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSByZWFkRmlsZVN5bmMoam9pbihjYXJkUmVwb1BhdGgsIFdPUktTUEFDRV9CUkFOQ0hFU19GSUxFKSwgJ3V0Zi04Jyk7XG4gICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyYXcpIGFzIFJlY29yZDxzdHJpbmcsIHsgcGFyZW50QnJhbmNoPzogc3RyaW5nOyBhZGRlZEF0Pzogc3RyaW5nIH0+O1xuICAgIGZvciAoY29uc3QgW25hbWUsIG1ldGFdIG9mIE9iamVjdC5lbnRyaWVzKHBhcnNlZCkpIHtcbiAgICAgIGlmIChtZXRhICYmIHR5cGVvZiBtZXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICBicmFuY2hlc1tuYW1lXSA9IHtcbiAgICAgICAgICBwYXJlbnRCcmFuY2g6IHR5cGVvZiBtZXRhLnBhcmVudEJyYW5jaCA9PT0gJ3N0cmluZycgPyBtZXRhLnBhcmVudEJyYW5jaCA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBhZGRlZEF0OiB0eXBlb2YgbWV0YS5hZGRlZEF0ID09PSAnc3RyaW5nJyA/IG1ldGEuYWRkZWRBdCA6ICcnXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLy8gUmVhZCBjb21taXRzIGZyb20gd29ya3NwYWNlLWNvbW1pdHMuY3N2XG4gIHRyeSB7XG4gICAgY29uc3QgcmF3ID0gcmVhZEZpbGVTeW5jKGpvaW4oY2FyZFJlcG9QYXRoLCBXT1JLU1BBQ0VfQ09NTUlUU19GSUxFKSwgJ3V0Zi04Jyk7XG4gICAgY29tbWl0cyA9IHJhd1xuICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgLm1hcCgobCkgPT4gbC50cmltKCkpXG4gICAgICAuZmlsdGVyKChzKTogcyBpcyBzdHJpbmcgPT4gcy5sZW5ndGggPiAwKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybiBkYXRhIHdoZW4gZWl0aGVyIGZpbGUgaGFzIGNvbnRlbnRcbiAgaWYgKE9iamVjdC5rZXlzKGJyYW5jaGVzKS5sZW5ndGggPT09IDAgJiYgY29tbWl0cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB7IGJyYW5jaGVzLCBjb21taXRzIH07XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgc2V0IG9mIGNvbW1pdCBTSEFzIHJlYWNoYWJsZSBmcm9tIGEgZ2l0IHJlZi5cbiAqXG4gKiBAcGFyYW0gd29ya3NwYWNlUGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSB3b3Jrc3BhY2UgcmVwb3NpdG9yeS5cbiAqIEBwYXJhbSByZWYgLSBHaXQgcmVmIG5hbWUgKGJyYW5jaCwgdGFnLCBvciBTSEEpLlxuICogQHJldHVybnMgU2V0IG9mIGZ1bGwgNDAtY2hhciBTSEFzLCBvciBlbXB0eSBzZXQgb24gZmFpbHVyZS5cbiAqL1xuZnVuY3Rpb24gZ2V0UmVhY2hhYmxlU2hhcyh3b3Jrc3BhY2VQYXRoOiBzdHJpbmcsIHJlZjogc3RyaW5nKTogU2V0PHN0cmluZz4ge1xuICB0cnkge1xuICAgIGNvbnN0IG91dHB1dCA9IGV4ZWNGaWxlU3luYygnZ2l0JywgWydsb2cnLCAnLS1mb3JtYXQ9JUgnLCByZWZdLCB7XG4gICAgICBjd2Q6IHdvcmtzcGFjZVBhdGgsXG4gICAgICBlbmNvZGluZzogJ3V0Zi04JyxcbiAgICAgIHRpbWVvdXQ6IDEwMDAwLFxuICAgICAgc3RkaW86IFsncGlwZScsICdwaXBlJywgJ3BpcGUnXVxuICAgIH0pLnRyaW0oKTtcbiAgICByZXR1cm4gbmV3IFNldChvdXRwdXQgPyBvdXRwdXQuc3BsaXQoJ1xcbicpIDogW10pO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbmV3IFNldCgpO1xuICB9XG59XG5cbi8qKlxuICogRmlsdGVycyBTSEFzIHRvIHRob3NlIHRoYXQgZXhpc3QgYXMgb2JqZWN0cyBpbiB0aGUgd29ya3NwYWNlIHJlcG8uXG4gKlxuICogVXNlcyBgZ2l0IGNhdC1maWxlIC0tYmF0Y2gtY2hlY2tgIGZvciBhIHNpbmdsZS1jYWxsIGJhdGNoIGV4aXN0ZW5jZSB0ZXN0LlxuICpcbiAqIEBwYXJhbSB3b3Jrc3BhY2VQYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIHdvcmtzcGFjZSByZXBvc2l0b3J5LlxuICogQHBhcmFtIHNoYXMgLSBGdWxsIDQwLWNoYXIgU0hBcyB0byBjaGVjay5cbiAqIEByZXR1cm5zIFNIQXMgdGhhdCBleGlzdCBpbiB0aGUgcmVwb3NpdG9yeS5cbiAqL1xuZnVuY3Rpb24gZmlsdGVyUmVzb2x2YWJsZVNoYXMod29ya3NwYWNlUGF0aDogc3RyaW5nLCBzaGFzOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbiAgaWYgKHNoYXMubGVuZ3RoID09PSAwKSByZXR1cm4gW107XG4gIHRyeSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gZXhlY0ZpbGVTeW5jKCdnaXQnLCBbJ2NhdC1maWxlJywgJy0tYmF0Y2gtY2hlY2snXSwge1xuICAgICAgaW5wdXQ6IGAke3NoYXMuam9pbignXFxuJyl9XFxuYCxcbiAgICAgIGN3ZDogd29ya3NwYWNlUGF0aCxcbiAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICB9KS50cmltKCk7XG5cbiAgICBjb25zdCBsaW5lcyA9IG91dHB1dC5zcGxpdCgnXFxuJyk7XG4gICAgY29uc3QgcmVzb2x2YWJsZTogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aCAmJiBpIDwgc2hhcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFsaW5lc1tpXSEuaW5jbHVkZXMoJ21pc3NpbmcnKSkge1xuICAgICAgICByZXNvbHZhYmxlLnB1c2goc2hhc1tpXSEpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2YWJsZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgY29tbWl0IGRldGFpbHMgZm9yIHNwZWNpZmljIFNIQXMgdXNpbmcgYGdpdCBsb2cgLS1uby13YWxrYC5cbiAqXG4gKiBAcGFyYW0gd29ya3NwYWNlUGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSB3b3Jrc3BhY2UgcmVwb3NpdG9yeS5cbiAqIEBwYXJhbSBzaGFzIC0gRnVsbCA0MC1jaGFyIFNIQXMgdG8gcmVzb2x2ZS5cbiAqIEByZXR1cm5zIEZvcm1hdHRlZCBjb21taXQgbG9nIHdpdGggdHJlZS1yZW5kZXJlZCBmaWxlIGxpc3RzLCBvciBgbnVsbGAgb24gZmFpbHVyZS5cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVdvcmtzcGFjZUNvbW1pdERldGFpbHMod29ya3NwYWNlUGF0aDogc3RyaW5nLCBzaGFzOiBzdHJpbmdbXSk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoc2hhcy5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIGNvbnN0IG91dHB1dCA9IGV4ZWNGaWxlU3luYygnZ2l0JywgWydsb2cnLCAnLS1uby13YWxrJywgJy0tcHJldHR5PWZvcm1hdDolaCAtICVzJywgJy0tbmFtZS1vbmx5JywgLi4uc2hhc10sIHtcbiAgICAgIGN3ZDogd29ya3NwYWNlUGF0aCxcbiAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICB9KS50cmltKCk7XG5cbiAgICBpZiAoIW91dHB1dCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIGZvcm1hdENvbW1pdExvZyhvdXRwdXQsICdibGFuay1saW5lJykgfHwgbnVsbDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21taXQgZ3JvdXAgZm9yIGEgc2luZ2xlIGJyYW5jaCBvciB0aGUgb3JwaGFuZWQgYnVja2V0LlxuICovXG5pbnRlcmZhY2UgQ29tbWl0R3JvdXAge1xuICBicmFuY2hOYW1lOiBzdHJpbmc7XG4gIHBhcmVudEJyYW5jaD86IHN0cmluZztcbiAgc2hhczogc3RyaW5nW107XG4gIG9ycGhhbmVkPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYDx3b3Jrc3BhY2UtcmVwby1sb2c+YCBibG9ja3Mgc2hvd2luZyB3b3Jrc3BhY2UgY29tbWl0cyBncm91cGVkIGJ5IGJyYW5jaC5cbiAqXG4gKiBSZWFkcyBicmFuY2hlcyBmcm9tIGB3b3Jrc3BhY2UtYnJhbmNoZXMuanNvbmAgYW5kIGNvbW1pdHMgZnJvbVxuICogYHdvcmtzcGFjZS1jb21taXRzLmNzdmAsIHBhcnRpdGlvbnMgY29tbWl0cyBhY3Jvc3MgYnJhbmNoZXMgdXNpbmcgZ2l0XG4gKiByZWFjaGFiaWxpdHksIGFuZCByZW5kZXJzIHBlci1icmFuY2ggWE1MIGJsb2Nrcy4gQWxyZWFkeS1wcmludGVkIGNvbW1pdHNcbiAqIGFwcGVhciBhcyBiYXJlIHNob3J0IGhhc2hlcyBpbiBzdWJzZXF1ZW50IGJsb2NrcyAoZGVkdXApLlxuICpcbiAqIEJyYW5jaCBwcm9jZXNzaW5nIG9yZGVyOiBzb3J0ZWQgYnkgYGFkZGVkQXRgIChvbGRlc3QgZmlyc3QpIHNvIHRoZVxuICogZm91bmRhdGlvbmFsIGJyYW5jaCByZWNlaXZlcyBmdWxsIGNvbW1pdCBvdXRwdXQgYW5kIGxhdGVyIGJyYW5jaGVzIGRlZHVwXG4gKiBhZ2FpbnN0IGl0LlxuICpcbiAqIEBwYXJhbSB3b3Jrc3BhY2VQYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIHdvcmtzcGFjZSByZXBvc2l0b3J5LlxuICogQHBhcmFtIGNhcmRSZXBvUGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSBjYXJkIHJlcG9zaXRvcnkuXG4gKiBAcmV0dXJucyBBcnJheSBvZiBgPHdvcmtzcGFjZS1yZXBvLWxvZz5gIGJsb2NrIHN0cmluZ3MsIG9yIGVtcHR5IGFycmF5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRXb3Jrc3BhY2VSZXBvTG9nQmxvY2tzKHdvcmtzcGFjZVBhdGg6IHN0cmluZywgY2FyZFJlcG9QYXRoOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHdvcmtzcGFjZSA9IHJlYWRXb3Jrc3BhY2VEYXRhKGNhcmRSZXBvUGF0aCk7XG4gIGlmICghd29ya3NwYWNlKSByZXR1cm4gW107XG5cbiAgY29uc3QgYmFzZUJyYW5jaCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkJBU0VfQlJBTkNIXSA/PyAnbWFpbic7XG5cbiAgLy8gU29ydCBicmFuY2hlcyBieSBhZGRlZEF0IChvbGRlc3QgZmlyc3QpXG4gIGNvbnN0IHNvcnRlZEJyYW5jaGVzID0gT2JqZWN0LmVudHJpZXMod29ya3NwYWNlLmJyYW5jaGVzKS5zb3J0KChbLCBhXSwgWywgYl0pID0+IGEuYWRkZWRBdC5sb2NhbGVDb21wYXJlKGIuYWRkZWRBdCkpO1xuXG4gIC8vIFBhcnRpdGlvbjogZWFjaCBicmFuY2ggaW5jbHVkZXMgQUxMIHJlYWNoYWJsZSB3b3Jrc3BhY2UuY29tbWl0cyAobWF5IG92ZXJsYXApLlxuICAvLyBSZW5kZXJpbmcgZGVkdXAgaGFuZGxlcyBjcm9zcy1icmFuY2ggb3ZlcmxhcCB2aWEgYmFyZSBzaG9ydCBoYXNoZXMuXG4gIGNvbnN0IHJlYWNoYWJsZUZyb21UcmFja2VkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGdyb3VwczogQ29tbWl0R3JvdXBbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgW25hbWUsIG1ldGFdIG9mIHNvcnRlZEJyYW5jaGVzKSB7XG4gICAgY29uc3QgcmVhY2hhYmxlID0gZ2V0UmVhY2hhYmxlU2hhcyh3b3Jrc3BhY2VQYXRoLCBuYW1lKTtcbiAgICBjb25zdCBicmFuY2hTaGFzID0gd29ya3NwYWNlLmNvbW1pdHMuZmlsdGVyKChzaGEpID0+IHJlYWNoYWJsZS5oYXMoc2hhKSk7XG4gICAgZm9yIChjb25zdCBzaGEgb2YgYnJhbmNoU2hhcykgcmVhY2hhYmxlRnJvbVRyYWNrZWQuYWRkKHNoYSk7XG4gICAgaWYgKGJyYW5jaFNoYXMubGVuZ3RoID4gMCkge1xuICAgICAgZ3JvdXBzLnB1c2goeyBicmFuY2hOYW1lOiBuYW1lLCBwYXJlbnRCcmFuY2g6IG1ldGEucGFyZW50QnJhbmNoLCBzaGFzOiBicmFuY2hTaGFzIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEJhc2UgYnJhbmNoOiBjb21taXRzIHJlYWNoYWJsZSBmcm9tIGJhc2UgYnV0IE5PVCBmcm9tIGFueSB0cmFja2VkIGJyYW5jaFxuICBjb25zdCBiYXNlUmVhY2hhYmxlID0gZ2V0UmVhY2hhYmxlU2hhcyh3b3Jrc3BhY2VQYXRoLCBiYXNlQnJhbmNoKTtcbiAgY29uc3QgYmFzZVNoYXMgPSB3b3Jrc3BhY2UuY29tbWl0cy5maWx0ZXIoKHNoYSkgPT4gYmFzZVJlYWNoYWJsZS5oYXMoc2hhKSAmJiAhcmVhY2hhYmxlRnJvbVRyYWNrZWQuaGFzKHNoYSkpO1xuICBpZiAoYmFzZVNoYXMubGVuZ3RoID4gMCkge1xuICAgIGdyb3Vwcy5wdXNoKHsgYnJhbmNoTmFtZTogYmFzZUJyYW5jaCwgc2hhczogYmFzZVNoYXMgfSk7XG4gIH1cblxuICAvLyBPcnBoYW5lZDogbm90IHJlYWNoYWJsZSBmcm9tIGFueSB0cmFja2VkIGJyYW5jaCBvciBiYXNlLCBmaWx0ZXIgdG8gcmVzb2x2YWJsZVxuICBjb25zdCBvcnBoYW5lZFNoYXMgPSB3b3Jrc3BhY2UuY29tbWl0cy5maWx0ZXIoKHNoYSkgPT4gIXJlYWNoYWJsZUZyb21UcmFja2VkLmhhcyhzaGEpICYmICFiYXNlUmVhY2hhYmxlLmhhcyhzaGEpKTtcbiAgY29uc3QgcmVzb2x2YWJsZSA9IGZpbHRlclJlc29sdmFibGVTaGFzKHdvcmtzcGFjZVBhdGgsIG9ycGhhbmVkU2hhcyk7XG4gIGlmIChyZXNvbHZhYmxlLmxlbmd0aCA+IDApIHtcbiAgICBncm91cHMucHVzaCh7IGJyYW5jaE5hbWU6ICcnLCBzaGFzOiByZXNvbHZhYmxlLCBvcnBoYW5lZDogdHJ1ZSB9KTtcbiAgfVxuXG4gIC8vIFJlbmRlciBibG9ja3Mgd2l0aCBjcm9zcy1icmFuY2ggZGVkdXBcbiAgY29uc3QgcHJpbnRlZFNoYXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgYmxvY2tzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgZ3JvdXAgb2YgZ3JvdXBzKSB7XG4gICAgY29uc3QgbmV3U2hhcyA9IGdyb3VwLnNoYXMuZmlsdGVyKChzaGEpID0+ICFwcmludGVkU2hhcy5oYXMoc2hhKSk7XG4gICAgY29uc3QgZHVwU2hhcyA9IGdyb3VwLnNoYXMuZmlsdGVyKChzaGEpID0+IHByaW50ZWRTaGFzLmhhcyhzaGEpKTtcblxuICAgIC8vIFNob3cgbW9zdCByZWNlbnQgTiB3aXRoIGZ1bGwgZGV0YWlsXG4gICAgY29uc3QgZGlzcGxheVNoYXMgPSBuZXdTaGFzLnNsaWNlKC1NQVhfV09SS1NQQUNFX0NPTU1JVFNfUEVSX0JSQU5DSCk7XG4gICAgY29uc3QgZGV0YWlscyA9IHJlc29sdmVXb3Jrc3BhY2VDb21taXREZXRhaWxzKHdvcmtzcGFjZVBhdGgsIGRpc3BsYXlTaGFzKTtcblxuICAgIGlmIChkZXRhaWxzKSB7XG4gICAgICBmb3IgKGNvbnN0IHNoYSBvZiBkaXNwbGF5U2hhcykgcHJpbnRlZFNoYXMuYWRkKHNoYSk7XG4gICAgfVxuXG4gICAgLy8gQnVpbGQgYm9keTogZnVsbCBkZXRhaWxzIGZpcnN0LCB0aGVuIGJhcmUgaGFzaGVzIGZvciBkZWR1cFxuICAgIGNvbnN0IGJvZHlQYXJ0czogc3RyaW5nW10gPSBbXTtcbiAgICBpZiAoZGV0YWlscykgYm9keVBhcnRzLnB1c2goZGV0YWlscyk7XG4gICAgaWYgKGR1cFNoYXMubGVuZ3RoID4gMCkge1xuICAgICAgYm9keVBhcnRzLnB1c2goZHVwU2hhcy5tYXAoKHNoYSkgPT4gc2hhLnNsaWNlKDAsIDcpKS5qb2luKCdcXG4nKSk7XG4gICAgfVxuXG4gICAgaWYgKGJvZHlQYXJ0cy5sZW5ndGggPT09IDApIGNvbnRpbnVlO1xuXG4gICAgLy8gQnVpbGQgWE1MIHRhZ1xuICAgIGNvbnN0IGF0dHJzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGlmIChncm91cC5vcnBoYW5lZCkge1xuICAgICAgYXR0cnMucHVzaCgnb3JwaGFuZWQ9XCJ0cnVlXCInKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXR0cnMucHVzaChgYnJhbmNoPVwiJHtncm91cC5icmFuY2hOYW1lfVwiYCk7XG4gICAgICBpZiAoZ3JvdXAucGFyZW50QnJhbmNoKSBhdHRycy5wdXNoKGBwYXJlbnRCcmFuY2g9XCIke2dyb3VwLnBhcmVudEJyYW5jaH1cImApO1xuICAgIH1cbiAgICBhdHRycy5wdXNoKGBjb3VudD1cIiR7Z3JvdXAuc2hhcy5sZW5ndGh9XCJgKTtcblxuICAgIGJsb2Nrcy5wdXNoKGA8d29ya3NwYWNlLXJlcG8tbG9nICR7YXR0cnMuam9pbignICcpfT5cXG4ke2JvZHlQYXJ0cy5qb2luKCdcXG4nKX1cXG48L3dvcmtzcGFjZS1yZXBvLWxvZz5gKTtcbiAgfVxuXG4gIHJldHVybiBibG9ja3M7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbWJpbmVkIGNvbnRleHRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBCdWlsZHMgdGhlIGNvbWJpbmVkIGFkZGl0aW9uYWwgY29udGV4dCBzdHJpbmcgZm9yIHNlc3Npb24gYW5kIHN1YmFnZW50IGhvb2tzLlxuICpcbiAqIFByb2R1Y2VzIFhNTCBibG9ja3M6IGA8Y2FyZD5gIChpZGVudGl0eSArIGdhdGVzICsgZW52KSwgYDxjYXJkLXJlcG8+YFxuICogKGRpcmVjdG9yeSBzdW1tYXJ5KSwgb3B0aW9uYWxseSBgPGNhcmQtcmVwby1sb2c+YCAocmVjZW50IGNhcmQgcmVwbyBjb21taXRzKSxcbiAqIGFuZCBvcHRpb25hbGx5IGA8d29ya3NwYWNlLXJlcG8tbG9nPmAgYmxvY2tzICh3b3Jrc3BhY2UgY29tbWl0cyBwZXIgYnJhbmNoKS5cbiAqIExldCB7QGxpbmsgQ2FyZFJlcG9BY2Nlc3NFcnJvcn0gcHJvcGFnYXRlIHRvIHRoZSBjYWxsZXIgZm9yIHN0cnVjdHVyZWRcbiAqIGVycm9yIGhhbmRsaW5nLlxuICpcbiAqIEBwYXJhbSBhY3Rpb25JbnB1dCAtIFBhcnNlZCBhY3Rpb24gaW5wdXQgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKiBAcmV0dXJucyBDb21iaW5lZCBjb250ZXh0IHN0cmluZyB3aXRoIFhNTCBibG9ja3MuXG4gKiBAdGhyb3dzIHtDYXJkUmVwb0FjY2Vzc0Vycm9yfSBXaGVuIHRoZSBjYXJkIHJlcG9zaXRvcnkgY2Fubm90IGJlIHJlYWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFkZGl0aW9uYWxDb250ZXh0KGFjdGlvbklucHV0OiBBY3Rpb25JbnB1dCk6IHN0cmluZyB7XG4gIGNvbnN0IGNhcmRCbG9jayA9IGJ1aWxkQ2FyZEJsb2NrKGFjdGlvbklucHV0KTtcbiAgY29uc3QgcmVwb0Jsb2NrID0gYnVpbGRDYXJkUmVwb0Jsb2NrKGFjdGlvbklucHV0LmNhcmRSZXBvUGF0aCk7XG4gIGNvbnN0IGxvZ0Jsb2NrID0gYnVpbGRDYXJkUmVwb0xvZ0Jsb2NrKGFjdGlvbklucHV0LmNhcmRSZXBvUGF0aCk7XG4gIGNvbnN0IHdvcmtzcGFjZUxvZ0Jsb2NrcyA9IGJ1aWxkV29ya3NwYWNlUmVwb0xvZ0Jsb2NrcyhhY3Rpb25JbnB1dC5yZXBvUm9vdCwgYWN0aW9uSW5wdXQuY2FyZFJlcG9QYXRoKTtcblxuICBjb25zdCBwYXJ0cyA9IFtjYXJkQmxvY2ssIHJlcG9CbG9ja107XG4gIGlmIChsb2dCbG9jaykgcGFydHMucHVzaChsb2dCbG9jayk7XG4gIHBhcnRzLnB1c2goLi4ud29ya3NwYWNlTG9nQmxvY2tzKTtcbiAgcmV0dXJuIHBhcnRzLmpvaW4oJ1xcblxcbicpO1xufVxuIiwgIi8qKlxuICogQnJhbmNoIGFuZCB3b3JrdHJlZSB0cmFja2luZyB0eXBlcyBmb3IgQ2FyZHMgVjIgd29ya3NwYWNlIGludGVncmF0aW9uLlxuICpcbiAqIFRoZXNlIHR5cGVzIHN1cHBvcnQgdHJhY2tpbmcgR2l0IGJyYW5jaGVzIGFuZCB0aGVpciBhc3NvY2lhdGVkIHdvcmt0cmVlcyB3aXRoaW5cbiAqIGEgY2FyZCdzIHdvcmtzcGFjZS4gQnJhbmNoIG1ldGFkYXRhIGlzIHBlcnNpc3RlZCBpbiBzZXBhcmF0ZSB3b3Jrc3BhY2UtYnJhbmNoZXMuanNvblxuICogYW5kIHdvcmtzcGFjZS1jb21taXRzLmNzdiBmaWxlcywgdHJhY2tlZCB3aXRoIHN0YXRpYyBtZXRhZGF0YSAoYnJhbmNoIG5hbWUsIHdvcmt0cmVlIHBhdGgsXG4gKiBhZGRlZEF0IHRpbWVzdGFtcCkgYW5kIGRlcml2ZWQgZmllbGRzIGNvbXB1dGVkIGF0IHJlYWQgdGltZSAoZXhpc3RzLCBpc01lcmdlZCwgY29tbWl0cykuXG4gKlxuICogVGhlIGJyYW5jaCBBUEkgKGBHRVQgL2NhcmRzLzppZC9icmFuY2hlc2AsIGBQT1NUIC9jYXJkcy86aWQvYnJhbmNoZXNgKSB1c2VzXG4gKiB0aGVzZSB0eXBlcyB0byBleHBvc2Ugd29ya3NwYWNlIHRyYWNraW5nIHN0YXRlIHRvIGNsaWVudHMgYW5kIGVuYWJsZSBicmFuY2hcbiAqIGFzc29jaWF0aW9uIHdpdGggY2FyZHMuXG4gKlxuICogQHN1bW1hcnkgQnJhbmNoIGFuZCB3b3JrdHJlZSB0cmFja2luZyB0eXBlcyBmb3IgQ2FyZHMgVjIgd29ya3NwYWNlIGludGVncmF0aW9uXG4gKiBAbW9kdWxlIHR5cGVzL2JyYW5jaFxuICovXG5cbmltcG9ydCB0eXBlIHsgQ29tbWl0RGV0YWlscyB9IGZyb20gJy4vdGltZWxpbmUuanMnO1xuXG4vKipcbiAqIFdlbGwta25vd24gU0hBIGZvciBhbiBlbXB0eSBnaXQgdHJlZS5cbiAqXG4gKiBUaGlzIGlzIGEgZGV0ZXJtaW5pc3RpYyB2YWx1ZSBwcm9kdWNlZCBieSBgZ2l0IGhhc2gtb2JqZWN0IC10IHRyZWUgL2Rldi9udWxsYFxuICogYW5kIG5ldmVyIGNoYW5nZXMgYWNyb3NzIGdpdCB2ZXJzaW9ucy4gVXNlZCBhcyB0aGUgZGlmZiBiYXNlIHdoZW4gY29tcGFyaW5nXG4gKiBhZ2FpbnN0IGEgc3RhdGUgd2l0aCBubyBwcmlvciBjb21taXRzLlxuICovXG5leHBvcnQgY29uc3QgRU1QVFlfVFJFRV9TSEEgPSAnNGI4MjVkYzY0MmNiNmViOWEwNjBlNTRiZjhkNjkyODhmYmVlNDkwNCc7XG5cbmV4cG9ydCBjb25zdCBXT1JLU1BBQ0VfQlJBTkNIRVNfRklMRSA9ICd3b3Jrc3BhY2UtYnJhbmNoZXMuanNvbic7XG5leHBvcnQgY29uc3QgV09SS1NQQUNFX0NPTU1JVFNfRklMRSA9ICd3b3Jrc3BhY2UtY29tbWl0cy5jc3YnO1xuXG4vKipcbiAqIEEgc2luZ2xlIHRyYWNrZWQgYnJhbmNoIHdpdGhpbiBhIGNhcmQncyB3b3Jrc3BhY2UgYmxvY2suXG4gKlxuICogVGhpcyBpcyB0aGUgbWluaW1hbCBtZXRhZGF0YSBwZXJzaXN0ZWQgZm9yIGVhY2ggYnJhbmNoIGluIHdvcmtzcGFjZS1icmFuY2hlcy5qc29uLlxuICogVGhlIHdvcmt0cmVlIHBhdGggaXMgb3B0aW9uYWwgYW5kIG1hY2hpbmUtc3BlY2lmaWM7IGl0IG1heSBiZWNvbWUgc3RhbGUgaWZcbiAqIHRoZSB3b3JrdHJlZSBpcyBtb3ZlZCBvciBkZWxldGVkIG91dHNpZGUgb2YgdGhlIGNhcmRzIHN5c3RlbS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBXb3Jrc3BhY2VCcmFuY2gge1xuICAvKipcbiAgICogT3B0aW9uYWwgYWJzb2x1dGUgcGF0aCB0byB3b3JrdHJlZSBkaXJlY3RvcnkgKG1hY2hpbmUtc3BlY2lmaWMsIG1heSBiZSBzdGFsZSkuXG4gICAqIFRoaXMgcGF0aCBpcyBhZHZpc29yeSBvbmx5IGFuZCBzaG91bGQgYmUgdmFsaWRhdGVkIGJlZm9yZSB1c2UuXG4gICAqL1xuICB3b3JrdHJlZT86IHN0cmluZztcblxuICAvKipcbiAgICogTmFtZSBvZiB0aGUgYnJhbmNoIHRoaXMgd2FzIGNyZWF0ZWQgZnJvbSAoZS5nLiwgJ21haW4nLCAnbWFzdGVyJykuXG4gICAqIFVzZWQgYXMgdGhlIGJhc2UgcmVmIGZvciBjb21wYXJpc29ucywgZmFzdC1mb3J3YXJkIGRldGVjdGlvbiwgYW5kIHJlYmFzZSB0YXJnZXRpbmcuXG4gICAqL1xuICBwYXJlbnRCcmFuY2g6IHN0cmluZztcblxuICAvKipcbiAgICogSVNPIDg2MDEgdGltZXN0YW1wIHdoZW4gYnJhbmNoIHdhcyBhZGRlZCB0byB0aGUgY2FyZC5cbiAgICogVXNlZCBmb3IgY2hyb25vbG9naWNhbCBzb3J0aW5nIGFuZCBhdWRpdCB0cmFpbHMuXG4gICAqL1xuICBhZGRlZEF0OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQnJhbmNoIGluZm8gcmV0dXJuZWQgYnkgR0VUIC9jYXJkcy86aWQvYnJhbmNoZXMgKGluY2x1ZGVzIGNvbXB1dGVkIGZpZWxkcykuXG4gKlxuICogVGhpcyB0eXBlIGV4dGVuZHMgdGhlIHBlcnNpc3RlZCBXb3Jrc3BhY2VCcmFuY2ggZGF0YSB3aXRoIHJ1bnRpbWUtY29tcHV0ZWRcbiAqIGZpZWxkcyB0aGF0IHJlZmxlY3QgdGhlIGN1cnJlbnQgR2l0IHJlcG9zaXRvcnkgc3RhdGUuIENvbXB1dGVkIGZpZWxkcyBhcmVcbiAqIG5ldmVyIHBlcnNpc3RlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCcmFuY2hJbmZvIHtcbiAgLyoqXG4gICAqIEJyYW5jaCBuYW1lIChtYXkgY29udGFpbiBzbGFzaGVzLCBlLmcuLCBcImZlYXR1cmUvYXV0aFwiKS5cbiAgICogVGhpcyBpcyB0aGUgR2l0IHJlZiBuYW1lLCBub3QgYSBmaWxlc3lzdGVtIHBhdGguXG4gICAqL1xuICBuYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsIHdvcmt0cmVlIHBhdGggYXNzb2NpYXRlZCB3aXRoIHRoaXMgYnJhbmNoLlxuICAgKiBDb3BpZWQgZnJvbSBXb3Jrc3BhY2VCcmFuY2gud29ya3RyZWUgaWYgcHJlc2VudC5cbiAgICovXG4gIHdvcmt0cmVlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBQYXJlbnQgYnJhbmNoIG5hbWUgZnJvbSB3aGljaCB0aGlzIGJyYW5jaCB3YXMgY3JlYXRlZCAoZS5nLiwgJ21haW4nLCAnbWFzdGVyJykuXG4gICAqIFVzZWQgYXMgdGhlIGJhc2UgcmVmIGZvciBjb21wYXJpc29ucy5cbiAgICovXG4gIHBhcmVudEJyYW5jaDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBJU08gODYwMSB0aW1lc3RhbXAgd2hlbiBicmFuY2ggd2FzIGFkZGVkLlxuICAgKiBDb3BpZWQgZnJvbSBXb3Jrc3BhY2VCcmFuY2guYWRkZWRBdC5cbiAgICovXG4gIGFkZGVkQXQ6IHN0cmluZztcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgYnJhbmNoIHN0aWxsIGV4aXN0cyBpbiBnaXQgKGNvbXB1dGVkIGF0IHJlYWQgdGltZSkuXG4gICAqIEZhbHNlIGlmIHRoZSBicmFuY2ggcmVmIGhhcyBiZWVuIGRlbGV0ZWQuXG4gICAqL1xuICBleGlzdHM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBicmFuY2ggdGlwIGlzIG1lcmdlZCBpbnRvIHJlcXVlc3Rpbmcgd29ya3NwYWNlIEhFQUQuXG4gICAqIENvbXB1dGVkIGF0IHJlYWQgdGltZSwgbmV2ZXIgc3RvcmVkLiBPbmx5IG1lYW5pbmdmdWwgd2hlbiBleGlzdHM9dHJ1ZS5cbiAgICovXG4gIGlzTWVyZ2VkPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQ29tbWl0IFNIQXMgcmVhY2hhYmxlIGZyb20gdGhpcyBicmFuY2ggYnV0IG5vdCBmcm9tIEhFQUQgKGNvbXB1dGVkIGF0IHJlYWQgdGltZSkuXG4gICAqIEVtcHR5IGFycmF5IGlmIGJyYW5jaCBpcyBmdWxseSBtZXJnZWQgb3IgZG9lcyBub3QgZXhpc3QuXG4gICAqL1xuICBjb21taXRzPzogc3RyaW5nW107XG59XG5cbi8qKlxuICogUmVzcG9uc2Ugc2hhcGUgZm9yIEdFVCAvY2FyZHMvOmlkL2JyYW5jaGVzLlxuICpcbiAqIFJldHVybnMgYWxsIHRyYWNrZWQgYnJhbmNoZXMgZm9yIGEgY2FyZCB3aXRoIGNvbXB1dGVkIHJ1bnRpbWUgZmllbGRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEJyYW5jaGVzUmVzcG9uc2Uge1xuICAvKipcbiAgICogTGlzdCBvZiB0cmFja2VkIGJyYW5jaGVzIHdpdGggY29tcHV0ZWQgZmllbGRzLlxuICAgKiBTb3J0ZWQgYnkgYWRkZWRBdCB0aW1lc3RhbXAgKG9sZGVzdCBmaXJzdCkuXG4gICAqL1xuICBicmFuY2hlczogQnJhbmNoSW5mb1tdO1xuXG4gIC8qKlxuICAgKiBBbGwgY2FyZC1sZXZlbCBjb21taXQgU0hBcyBmcm9tIHdvcmtzcGFjZS1jb21taXRzLmNzdi5cbiAgICogUHJlc2VudCByZWdhcmRsZXNzIG9mIGJyYW5jaCBzdGF0ZSwgc28gdGhlIFVJIGNhbiBzaG93IGNoYW5nZXNcbiAgICogZXZlbiBhZnRlciBhbGwgdHJhY2tlZCBicmFuY2hlcyBoYXZlIGJlZW4gcmVtb3ZlZC5cbiAgICovXG4gIGNvbW1pdHM6IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBEZWZhdWx0IGJyYW5jaCBvZiB0aGUgd29ya3NwYWNlIHJlcG9zaXRvcnkgKGUuZy4sICdtYWluJywgJ21hc3RlcicpLlxuICAgKiBEZXRlY3RlZCBmcm9tIGByZWZzL3JlbW90ZXMvb3JpZ2luL0hFQURgLCBmYWxsaW5nIGJhY2sgdG8gY3VycmVudCBIRUFEIGJyYW5jaC5cbiAgICogVXNlZCBhcyB0aGUgYmFzZSByZWYgZm9yIGNhcmQtbGV2ZWwgY29tbWl0cyB3aGVuIG5vIHRyYWNrZWQgYnJhbmNoZXMgcmVtYWluLlxuICAgKi9cbiAgZGVmYXVsdEJyYW5jaDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBTSEFzIG9mIGNhcmQgY29tbWl0cyB0aGF0IGFyZSBhbmNlc3RvcnMgb2YgSEVBRCBhdCB0aGUgcmVxdWVzdGluZyB3b3Jrc3BhY2UuXG4gICAqIEVtcHR5IGFycmF5IHdoZW4gd29ya3NwYWNlUGF0aCBpcyBub3QgcHJvdmlkZWQgb3IgZ2l0IG9wZXJhdGlvbnMgZmFpbCBncmFjZWZ1bGx5LlxuICAgKi9cbiAgbWVyZ2VkQ29tbWl0czogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIEJyYW5jaCBuYW1lIGNoZWNrZWQgb3V0IGF0IHRoZSByZXF1ZXN0aW5nIHdvcmtzcGFjZSAoZS5nLiwgXCJtYWluXCIsIFwiZmVhdHVyZS1hdXRoXCIpLlxuICAgKiBcIkhFQURcIiB3aGVuIGluIGRldGFjaGVkIEhFQUQgc3RhdGUuXG4gICAqIEVtcHR5IHN0cmluZyB3aGVuIHdvcmtzcGFjZVBhdGggaXMgbm90IHByb3ZpZGVkIG9yIGdpdCBvcGVyYXRpb25zIGZhaWwgZ3JhY2VmdWxseS5cbiAgICovXG4gIGhlYWRCcmFuY2g6IHN0cmluZztcblxuICAvKipcbiAgICogQ29tbWl0IGRldGFpbHMga2V5ZWQgYnkgU0hBIGZvciBlYWNoIGVudHJ5IGluIGBjb21taXRzYC5cbiAgICogRW1wdHkgd2hlbiB0aGVyZSBhcmUgbm8gY29tbWl0cy4gT25seSBhYnNlbnQgd2hlbiBgd29ya3NwYWNlUGF0aGAgd2FzIG5vdCBwcm92aWRlZFxuICAgKiAoaS5lLiB0aGUgcmVpbmRleCBwYXRoIFx1MjAxNCBgY29tbWl0RGV0YWlsc2AgaXMgZGVsaXZlcmVkIHNlcGFyYXRlbHkgdmlhIGBXb3Jrc3BhY2VDb21taXRFdmVudGApLlxuICAgKi9cbiAgY29tbWl0RGV0YWlscz86IFJlY29yZDxzdHJpbmcsIENvbW1pdERldGFpbHM+O1xufVxuXG4vKipcbiAqIFJlcXVlc3QgYm9keSBmb3IgUE9TVCAvY2FyZHMvOmlkL2JyYW5jaGVzLlxuICpcbiAqIFVzZWQgdG8gYWRkIGEgbmV3IGJyYW5jaCB0byBhIGNhcmQncyB3b3Jrc3BhY2UgdHJhY2tpbmcgYmxvY2suXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWRkQnJhbmNoUmVxdWVzdCB7XG4gIC8qKlxuICAgKiBCcmFuY2ggbmFtZSB0byB0cmFjay5cbiAgICogTXVzdCBiZSBhIHZhbGlkIEdpdCByZWYgbmFtZSAobWF5IGNvbnRhaW4gc2xhc2hlcykuXG4gICAqL1xuICBuYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsIHdvcmt0cmVlIHBhdGguXG4gICAqIFNob3VsZCBiZSBhbiBhYnNvbHV0ZSBwYXRoIHRvIGEgdmFsaWQgd29ya3RyZWUgZGlyZWN0b3J5LlxuICAgKi9cbiAgd29ya3RyZWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFBhcmVudCBicmFuY2ggbmFtZSBmcm9tIHdoaWNoIHRoaXMgYnJhbmNoIHdhcyBjcmVhdGVkIChlLmcuLCAnbWFpbicsICdtYXN0ZXInKS5cbiAgICogVXNlZCBhcyB0aGUgYmFzZSByZWYgZm9yIGNvbXBhcmlzb25zLlxuICAgKi9cbiAgcGFyZW50QnJhbmNoOiBzdHJpbmc7XG59XG4iLCAiLyoqXG4gKiBUcmVlLWZvcm1hdHRlZCByZW5kZXJpbmcgZm9yIGZpbGUgcGF0aCBsaXN0cy5cbiAqXG4gKiBCdWlsZHMgYSB0cmllIGZyb20gZmlsZSBwYXRocywgY29sbGFwc2VzIHNpbmdsZS1jaGlsZCBkaXJlY3RvcnkgY2hhaW5zLFxuICogYW5kIHJlbmRlcnMgYW4gaW5kZW50ZWQgdHJlZSB0aGF0IGNvbXByZXNzZXMgc2hhcmVkIHByZWZpeGVzLlxuICpcbiAqIEBzdW1tYXJ5IFByZWZpeC1jb21wcmVzc2VkIGZpbGUgdHJlZSByZW5kZXJpbmdcbiAqL1xuXG4vKiogSW50ZXJuYWwgdHJpZSBub2RlIGZvciBidWlsZGluZyB0aGUgZmlsZSB0cmVlLiAqL1xuaW50ZXJmYWNlIFRyaWVOb2RlIHtcbiAgY2hpbGRyZW46IE1hcDxzdHJpbmcsIFRyaWVOb2RlPjtcbiAgaXNGaWxlOiBib29sZWFuO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOb2RlKCk6IFRyaWVOb2RlIHtcbiAgcmV0dXJuIHsgY2hpbGRyZW46IG5ldyBNYXAoKSwgaXNGaWxlOiBmYWxzZSB9O1xufVxuXG4vKipcbiAqIEluc2VydHMgYSBwYXRoIGludG8gdGhlIHRyaWUsIHNwbGl0dGluZyBvbiBgL2AuXG4gKlxuICogQHBhcmFtIHJvb3QgLSBSb290IHRyaWUgbm9kZS5cbiAqIEBwYXJhbSBwYXRoIC0gRmlsZSBwYXRoIHRvIGluc2VydC5cbiAqL1xuZnVuY3Rpb24gaW5zZXJ0UGF0aChyb290OiBUcmllTm9kZSwgcGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIGxldCBub2RlID0gcm9vdDtcbiAgY29uc3Qgc2VnbWVudHMgPSBwYXRoLnNwbGl0KCcvJyk7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2VnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBzZWcgPSBzZWdtZW50c1tpXSE7XG4gICAgbGV0IGNoaWxkID0gbm9kZS5jaGlsZHJlbi5nZXQoc2VnKTtcbiAgICBpZiAoIWNoaWxkKSB7XG4gICAgICBjaGlsZCA9IGNyZWF0ZU5vZGUoKTtcbiAgICAgIG5vZGUuY2hpbGRyZW4uc2V0KHNlZywgY2hpbGQpO1xuICAgIH1cbiAgICBub2RlID0gY2hpbGQ7XG4gIH1cbiAgbm9kZS5pc0ZpbGUgPSB0cnVlO1xufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIHRyaWUgYXMgYW4gaW5kZW50ZWQgdHJlZSBzdHJpbmcuXG4gKlxuICogU2luZ2xlLWNoaWxkIGRpcmVjdG9yeSBjaGFpbnMgYXJlIGNvbGxhcHNlZDogYHNyYy9gIFx1MjE5MiBgbGliL2AgXHUyMTkyIGB1dGlscy50c2BcbiAqIGJlY29tZXMgYHNyYy9saWIvdXRpbHMudHNgIHdoZW4gZWFjaCBpbnRlcm1lZGlhdGUgaGFzIGV4YWN0bHkgb25lIGNoaWxkLlxuICpcbiAqIERpcmVjdG9yaWVzIHNvcnQgYmVmb3JlIGZpbGVzIGF0IGVhY2ggbGV2ZWwuIEVudHJpZXMgYXJlIGFscGhhYmV0aWNhbCB3aXRoaW5cbiAqIGVhY2ggZ3JvdXAuXG4gKlxuICogQHBhcmFtIG5vZGUgLSBDdXJyZW50IHRyaWUgbm9kZSB0byByZW5kZXIuXG4gKiBAcGFyYW0gaW5kZW50IC0gTnVtYmVyIG9mIGxlYWRpbmcgc3BhY2VzIGZvciB0aGlzIGxldmVsLlxuICogQHJldHVybnMgUmVuZGVyZWQgdHJlZSBsaW5lcyBqb2luZWQgYnkgbmV3bGluZXMuXG4gKi9cbmZ1bmN0aW9uIHJlbmRlck5vZGUobm9kZTogVHJpZU5vZGUsIGluZGVudDogbnVtYmVyKTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHByZWZpeCA9ICcgJy5yZXBlYXQoaW5kZW50KTtcblxuICAvLyBTZXBhcmF0ZSBjaGlsZHJlbiBpbnRvIGRpcmVjdG9yaWVzIGFuZCBmaWxlc1xuICBjb25zdCBkaXJzOiBbc3RyaW5nLCBUcmllTm9kZV1bXSA9IFtdO1xuICBjb25zdCBmaWxlczogW3N0cmluZywgVHJpZU5vZGVdW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IFtuYW1lLCBjaGlsZF0gb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgIGlmIChjaGlsZC5pc0ZpbGUgJiYgY2hpbGQuY2hpbGRyZW4uc2l6ZSA9PT0gMCkge1xuICAgICAgZmlsZXMucHVzaChbbmFtZSwgY2hpbGRdKTtcbiAgICB9IGVsc2UgaWYgKGNoaWxkLmlzRmlsZSAmJiBjaGlsZC5jaGlsZHJlbi5zaXplID4gMCkge1xuICAgICAgLy8gQSBwYXRoIHNlZ21lbnQgdGhhdCBpcyBib3RoIGEgZmlsZSBhbmQgaGFzIGNoaWxkcmVuIFx1MjAxNCB0cmVhdCBhcyBmaWxlXG4gICAgICAvLyBmb3IgaXRzIG93biBlbnRyeSwgdGhlbiByZW5kZXIgY2hpbGRyZW4gc2VwYXJhdGVseS5cbiAgICAgIGZpbGVzLnB1c2goW25hbWUsIGNyZWF0ZU5vZGUoKV0pOyAvLyBmaWxlIGVudHJ5XG4gICAgICBkaXJzLnB1c2goW25hbWUsIGNoaWxkXSk7IC8vIGRpcmVjdG9yeSBlbnRyeSB3aXRoIGNoaWxkcmVuXG4gICAgfSBlbHNlIHtcbiAgICAgIGRpcnMucHVzaChbbmFtZSwgY2hpbGRdKTtcbiAgICB9XG4gIH1cblxuICBkaXJzLnNvcnQoKFthXSwgW2JdKSA9PiBhLmxvY2FsZUNvbXBhcmUoYikpO1xuICBmaWxlcy5zb3J0KChbYV0sIFtiXSkgPT4gYS5sb2NhbGVDb21wYXJlKGIpKTtcblxuICBmb3IgKGNvbnN0IFtuYW1lLCBjaGlsZF0gb2YgZGlycykge1xuICAgIC8vIENvbGxhcHNlIHNpbmdsZS1jaGlsZCBkaXJlY3RvcnkgY2hhaW5zXG4gICAgbGV0IGNvbGxhcHNlZCA9IG5hbWU7XG4gICAgbGV0IGN1cnJlbnQgPSBjaGlsZDtcbiAgICB3aGlsZSAoY3VycmVudC5jaGlsZHJlbi5zaXplID09PSAxICYmICFjdXJyZW50LmlzRmlsZSkge1xuICAgICAgY29uc3QgW25leHROYW1lLCBuZXh0Q2hpbGRdID0gY3VycmVudC5jaGlsZHJlbi5lbnRyaWVzKCkubmV4dCgpLnZhbHVlIGFzIFtzdHJpbmcsIFRyaWVOb2RlXTtcbiAgICAgIGNvbGxhcHNlZCArPSBgLyR7bmV4dE5hbWV9YDtcbiAgICAgIGN1cnJlbnQgPSBuZXh0Q2hpbGQ7XG4gICAgfVxuXG4gICAgaWYgKGN1cnJlbnQuaXNGaWxlICYmIGN1cnJlbnQuY2hpbGRyZW4uc2l6ZSA9PT0gMCkge1xuICAgICAgLy8gRW50aXJlIGNoYWluIGNvbGxhcHNlZCB0byBhIHNpbmdsZSBmaWxlIHBhdGhcbiAgICAgIGxpbmVzLnB1c2goYCR7cHJlZml4fSR7Y29sbGFwc2VkfWApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBEaXJlY3Rvcnkgbm9kZSBcdTIwMTQgcmVuZGVyIHdpdGggdHJhaWxpbmcgc2xhc2gsIHRoZW4gY2hpbGRyZW5cbiAgICAgIGxpbmVzLnB1c2goYCR7cHJlZml4fSR7Y29sbGFwc2VkfS9gKTtcbiAgICAgIGxpbmVzLnB1c2gocmVuZGVyTm9kZShjdXJyZW50LCBpbmRlbnQgKyAyKSk7XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBbbmFtZV0gb2YgZmlsZXMpIHtcbiAgICBsaW5lcy5wdXNoKGAke3ByZWZpeH0ke25hbWV9YCk7XG4gIH1cblxuICByZXR1cm4gbGluZXMuZmlsdGVyKEJvb2xlYW4pLmpvaW4oJ1xcbicpO1xufVxuXG4vKipcbiAqIFJlbmRlcnMgYSBsaXN0IG9mIGZpbGUgcGF0aHMgYXMgYSBwcmVmaXgtY29tcHJlc3NlZCBpbmRlbnRlZCB0cmVlLlxuICpcbiAqIFNpbmdsZS1jaGlsZCBkaXJlY3RvcnkgY2hhaW5zIGFyZSBjb2xsYXBzZWQgaW50byBjb21iaW5lZCBzZWdtZW50c1xuICogKGUuZy4sIGBzcmMvbGliL2AgYXMgb25lIG5vZGUpLiBMZWFmIGZpbGVzIGFsd2F5cyBhcHBlYXIgYXMgaW5kaXZpZHVhbCBlbnRyaWVzLlxuICpcbiAqIEBwYXJhbSBwYXRocyAtIEZsYXQgZmlsZSBwYXRocyAoZS5nLiwgZnJvbSBgZ2l0IGxvZyAtLW5hbWUtb25seWApLlxuICogQHJldHVybnMgSW5kZW50ZWQgdHJlZSBzdHJpbmcsIG9yIGVtcHR5IHN0cmluZyBpZiBwYXRocyBpcyBlbXB0eS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEZpbGVUcmVlKHBhdGhzOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIGlmIChwYXRocy5sZW5ndGggPT09IDApIHJldHVybiAnJztcblxuICBjb25zdCByb290ID0gY3JlYXRlTm9kZSgpO1xuICBmb3IgKGNvbnN0IHAgb2YgcGF0aHMpIHtcbiAgICBpZiAocCkgaW5zZXJ0UGF0aChyb290LCBwKTtcbiAgfVxuXG4gIHJldHVybiByZW5kZXJOb2RlKHJvb3QsIDEpO1xufVxuXG4vKipcbiAqIFBhcnNlcyByYXcgYGdpdCBsb2cgLS1uYW1lLW9ubHlgIG91dHB1dCBpbnRvIHBlci1jb21taXQgYmxvY2tzLCBhcHBsaWVzXG4gKiB0cmVlIGZvcm1hdHRpbmcgdG8gZWFjaCBjb21taXQncyBmaWxlIGxpc3QsIGFuZCByZWFzc2VtYmxlcy5cbiAqXG4gKiBIYW5kbGVzIHR3byBzZXBhcmF0b3IgY29udmVudGlvbnM6XG4gKiAtIE5VTC1kZWxpbWl0ZWQgKGAleDAwYCBpbiBgLS1wcmV0dHk9Zm9ybWF0YCk6IHVzZWQgYnkgYGJ1aWxkQ2FyZFJlcG9Mb2dCbG9ja2BcbiAqIC0gQmxhbmstbGluZS1kZWxpbWl0ZWQ6IHVzZWQgYnkgYC0tbm8td2Fsa2AgaW4gYHJlc29sdmVXb3Jrc3BhY2VDb21taXREZXRhaWxzYCBhbmQgdGhlIHN0b3AgaG9va1xuICpcbiAqIEBwYXJhbSByYXdMb2cgLSBSYXcgZ2l0IGxvZyBvdXRwdXQgd2l0aCBgLS1uYW1lLW9ubHlgLlxuICogQHBhcmFtIHNlcGFyYXRvciAtIEhvdyBjb21taXRzIGFyZSBzZXBhcmF0ZWQ6IGAnbnVsJ2AgZm9yIGAleDAwYCwgYCdibGFuay1saW5lJ2AgZm9yIGRvdWJsZSBuZXdsaW5lLlxuICogQHJldHVybnMgRm9ybWF0dGVkIG91dHB1dCB3aXRoIHRyZWUtcmVuZGVyZWQgZmlsZSBsaXN0cyBwZXIgY29tbWl0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0Q29tbWl0TG9nKHJhd0xvZzogc3RyaW5nLCBzZXBhcmF0b3I6ICdudWwnIHwgJ2JsYW5rLWxpbmUnKTogc3RyaW5nIHtcbiAgaWYgKCFyYXdMb2cudHJpbSgpKSByZXR1cm4gJyc7XG5cbiAgaWYgKHNlcGFyYXRvciA9PT0gJ251bCcpIHtcbiAgICByZXR1cm4gZm9ybWF0TnVsRGVsaW1pdGVkKHJhd0xvZyk7XG4gIH1cbiAgcmV0dXJuIGZvcm1hdEJsYW5rTGluZURlbGltaXRlZChyYXdMb2cpO1xufVxuXG4vKipcbiAqIE5VTC1kZWxpbWl0ZWQgZm9ybWF0OiBgJXgwMGhlYWRlclxcblxcbmZpbGUxXFxuZmlsZTJcXHgwMGhlYWRlcjJcXG5cXG5maWxlM2BcbiAqXG4gKiBUaGUgZmlyc3QgTlVMIG1heSBiZSBhdCBwb3NpdGlvbiAwIChsZWFkaW5nKSwgc28gd2UgZmlsdGVyIGVtcHR5IHNwbGl0cy5cbiAqXG4gKiBAcGFyYW0gcmF3IC0gUmF3IE5VTC1kZWxpbWl0ZWQgZ2l0IGxvZyBvdXRwdXQuXG4gKiBAcmV0dXJucyBGb3JtYXR0ZWQgb3V0cHV0IHdpdGggdHJlZS1yZW5kZXJlZCBmaWxlIGxpc3RzLlxuICovXG5mdW5jdGlvbiBmb3JtYXROdWxEZWxpbWl0ZWQocmF3OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBjb21taXRzID0gcmF3LnNwbGl0KCdcXDAnKS5maWx0ZXIoKHMpID0+IHMudHJpbSgpKTtcbiAgcmV0dXJuIGNvbW1pdHMubWFwKChjb21taXQpID0+IGZvcm1hdFNpbmdsZUNvbW1pdChjb21taXQudHJpbSgpKSkuam9pbignXFxuXFxuJyk7XG59XG5cbi8qKlxuICogQmxhbmstbGluZS1kZWxpbWl0ZWQgZm9ybWF0OiBjb21taXRzIHNlcGFyYXRlZCBieSBgXFxuXFxuYCB3aGVyZSB0aGUgc2Vjb25kXG4gKiBibG9jayBzdGFydHMgd2l0aCBhIHNob3J0IGhhc2ggbGluZS5cbiAqXG4gKiBXaXRoaW4gYSBzaW5nbGUgY29tbWl0LCBgLS1uYW1lLW9ubHlgIGFsc28gcHV0cyBhIGJsYW5rIGxpbmUgYmV0d2VlbiB0aGVcbiAqIGhlYWRlciBhbmQgdGhlIGZpbGUgbGlzdC4gV2UgZGlzdGluZ3Vpc2ggaW50cmEtY29tbWl0IGJsYW5rIGxpbmVzIGZyb21cbiAqIGludGVyLWNvbW1pdCBibGFuayBsaW5lcyBieSBjaGVja2luZyB3aGV0aGVyIHRoZSBsaW5lIGFmdGVyIHRoZSBibGFuayBsaW5lXG4gKiBsb29rcyBsaWtlIGEgY29tbWl0IGhlYWRlciAoc2hvcnQgaGFzaCBwYXR0ZXJuKS5cbiAqXG4gKiBAcGFyYW0gcmF3IC0gUmF3IGJsYW5rLWxpbmUtZGVsaW1pdGVkIGdpdCBsb2cgb3V0cHV0LlxuICogQHJldHVybnMgRm9ybWF0dGVkIG91dHB1dCB3aXRoIHRyZWUtcmVuZGVyZWQgZmlsZSBsaXN0cy5cbiAqL1xuZnVuY3Rpb24gZm9ybWF0QmxhbmtMaW5lRGVsaW1pdGVkKHJhdzogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXMgPSByYXcuc3BsaXQoJ1xcbicpO1xuICBjb25zdCBjb21taXRCbG9ja3M6IHN0cmluZ1tdW10gPSBbXTtcbiAgbGV0IGN1cnJlbnQ6IHN0cmluZ1tdID0gW107XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXSE7XG5cbiAgICAvLyBEZXRlY3QgaW50ZXItY29tbWl0IGJvdW5kYXJ5OiBlbXB0eSBsaW5lIGZvbGxvd2VkIGJ5IGEgY29tbWl0IGhlYWRlclxuICAgIGlmIChsaW5lID09PSAnJyAmJiBjdXJyZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IG5leHQgPSBsaW5lc1tpICsgMV07XG4gICAgICBpZiAobmV4dCAmJiBpc0NvbW1pdEhlYWRlcihuZXh0KSkge1xuICAgICAgICBjb21taXRCbG9ja3MucHVzaChjdXJyZW50KTtcbiAgICAgICAgY3VycmVudCA9IFtdO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjdXJyZW50LnB1c2gobGluZSk7XG4gIH1cbiAgaWYgKGN1cnJlbnQubGVuZ3RoID4gMCkgY29tbWl0QmxvY2tzLnB1c2goY3VycmVudCk7XG5cbiAgcmV0dXJuIGNvbW1pdEJsb2Nrcy5tYXAoKGJsb2NrKSA9PiBmb3JtYXRTaW5nbGVDb21taXQoYmxvY2suam9pbignXFxuJykudHJpbSgpKSkuam9pbignXFxuXFxuJyk7XG59XG5cbi8qKlxuICogQ29tbWl0IGhlYWRlcnMgZnJvbSBgLS1wcmV0dHk9Zm9ybWF0OiVoIC0gJXNgIHN0YXJ0IHdpdGggYSBzaG9ydCBoZXggaGFzaC5cbiAqXG4gKiBAcGFyYW0gbGluZSAtIExpbmUgdG8gdGVzdC5cbiAqIEByZXR1cm5zIFdoZXRoZXIgdGhlIGxpbmUgbWF0Y2hlcyB0aGUgY29tbWl0IGhlYWRlciBwYXR0ZXJuLlxuICovXG5mdW5jdGlvbiBpc0NvbW1pdEhlYWRlcihsaW5lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIC9eWzAtOWEtZl17Nyx9IC0gLy50ZXN0KGxpbmUpO1xufVxuXG4vKipcbiAqIEZvcm1hdHMgYSBzaW5nbGUgY29tbWl0IGJsb2NrOiBoZWFkZXIgbGluZSArIGZpbGUgcGF0aHMuXG4gKlxuICogVGhlIGhlYWRlciBpcyB0aGUgZmlyc3Qgbm9uLWVtcHR5IGxpbmUuIFJlbWFpbmluZyBub24tZW1wdHkgbGluZXMgYXJlIGZpbGUgcGF0aHMuXG4gKlxuICogQHBhcmFtIGJsb2NrIC0gUmF3IGNvbW1pdCBibG9jayB0ZXh0LlxuICogQHJldHVybnMgSGVhZGVyIGZvbGxvd2VkIGJ5IHRyZWUtZm9ybWF0dGVkIGZpbGUgbGlzdC5cbiAqL1xuZnVuY3Rpb24gZm9ybWF0U2luZ2xlQ29tbWl0KGJsb2NrOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lcyA9IGJsb2NrLnNwbGl0KCdcXG4nKS5maWx0ZXIoKGwpID0+IGwudHJpbSgpKTtcbiAgaWYgKGxpbmVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnO1xuXG4gIGNvbnN0IGhlYWRlciA9IGxpbmVzWzBdITtcbiAgY29uc3QgZmlsZXMgPSBsaW5lcy5zbGljZSgxKTtcblxuICBpZiAoZmlsZXMubGVuZ3RoID09PSAwKSByZXR1cm4gaGVhZGVyO1xuXG4gIGNvbnN0IHRyZWUgPSBmb3JtYXRGaWxlVHJlZShmaWxlcyk7XG4gIHJldHVybiB0cmVlID8gYCR7aGVhZGVyfVxcbiR7dHJlZX1gIDogaGVhZGVyO1xufVxuIiwgImltcG9ydCBob29rIGZyb20gJy4vc2Vzc2lvbi1zdGFydC50cyc7XG5pbXBvcnQgeyBleGVjdXRlIH0gZnJvbSAnLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L3J1bnRpbWUuanMnO1xuXG5leGVjdXRlKGhvb2spO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUFXQSxTQUFTLGdCQUFBQSxlQUFjLGFBQWE7QUFDcEMsU0FBUyxnQkFBQUMscUJBQW9CO0FBQzdCLFNBQVMsV0FBQUMsZ0JBQWU7QUFDeEIsU0FBUyxXQUFBQyxVQUFTLFFBQUFDLE9BQU0sZUFBZTtBQUN2QyxTQUFTLHFCQUFxQjs7O0FDTDlCLFNBQVMsZ0JBQWdCO0FBQ3pCLFNBQVMsZUFBZTtBQUN4QixTQUFTLFlBQVk7OztBQ0NyQixTQUFTLFdBQVcsV0FBVyxVQUFVLGNBQWMsWUFBWSxZQUFZLHFCQUFxQjtBQUNwRyxTQUFTLGVBQWU7OztBQ09qQixTQUFTLGVBQWUsS0FBc0I7QUFDbkQsTUFBSTtBQUNGLFlBQVEsS0FBSyxLQUFLLENBQUM7QUFDbkIsV0FBTztBQUFBLEVBQ1QsU0FBUyxPQUFPO0FBQ2QsUUFBSSxpQkFBaUIsU0FBUyxVQUFVLE9BQU87QUFDN0MsWUFBTSxPQUFRLE1BQWdDO0FBQzlDLFVBQUksU0FBUyxRQUFTLFFBQU87QUFDN0IsVUFBSSxTQUFTLFFBQVMsUUFBTztBQUFBLElBQy9CO0FBQ0EsVUFBTTtBQUFBLEVBQ1I7QUFDRjs7O0FEUk8sU0FBUyxNQUFNLElBQTJCO0FBQy9DLFNBQU8sSUFBSSxRQUFRLENBQUNDLGFBQVksV0FBV0EsVUFBUyxFQUFFLENBQUM7QUFDekQ7QUFVTyxTQUFTLGFBQWEsT0FBZ0IsTUFBdUI7QUFDbEUsU0FBTyxpQkFBaUIsU0FBUyxVQUFVLFNBQVUsTUFBZ0MsU0FBUztBQUNoRztBQVdPLFNBQVMsbUJBQW1CLFVBQTJCO0FBQzVELE1BQUk7QUFDRixVQUFNLGNBQWMsYUFBYSxVQUFVLE9BQU87QUFDbEQsVUFBTSxZQUFZLE9BQU8sU0FBUyxZQUFZLEtBQUssR0FBRyxFQUFF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eEMsTUFBQUEsUUFBTyxNQUFNLDBCQUEwQixFQUFFLFVBQVUsTUFBTSxVQUFVLE9BQU8sTUFBTSxRQUFRLENBQUM7QUFDekYsYUFBTyxtQkFBbUI7QUFBQSxRQUN4QixVQUFVO0FBQUEsUUFDVixHQUFHLE1BQU0sY0FBYyxTQUFTO0FBQUEsTUFDbEMsQ0FBQztBQUFBLElBQ0g7QUFDQSxVQUFNO0FBQUEsRUFDUjtBQUVBLFNBQU8sbUJBQW1CO0FBQUEsSUFDeEI7QUFBQSxJQUNBLG9CQUFvQjtBQUFBLE1BQ2xCLG1CQUFtQjtBQUFBLElBQ3JCO0FBQUEsRUFDRixDQUFDO0FBQ0gsQ0FBQzs7O0FlalFELFFBQVEscUJBQUk7IiwKICAibmFtZXMiOiBbImV4ZWNGaWxlU3luYyIsICJyZWFkRmlsZVN5bmMiLCAiaG9tZWRpciIsICJkaXJuYW1lIiwgImpvaW4iLCAicmVzb2x2ZSIsICJta2RpclN5bmMiLCAicmVhZEZpbGVTeW5jIiwgInVubGlua1N5bmMiLCAid3JpdGVGaWxlU3luYyIsICJob21lZGlyIiwgImpvaW4iLCAiam9pbiIsICJob21lZGlyIiwgImpvaW4iLCAibWtkaXJTeW5jIiwgIndyaXRlRmlsZVN5bmMiLCAicmVhZEZpbGVTeW5jIiwgInJlYWRGaWxlU3luYyIsICJjbG9zZVN5bmMiLCAibWtkaXJTeW5jIiwgIm9wZW5TeW5jIiwgImRpcm5hbWUiLCAicmVzb2x2ZSIsICJyZWFkRmlsZVN5bmMiLCAiam9pbiIsICJyZWFkRmlsZVN5bmMiLCAiam9pbiIsICJleGVjRmlsZVN5bmMiLCAiZGlybmFtZSIsICJyZWFkRmlsZVN5bmMiLCAiam9pbiIsICJob21lZGlyIiwgImxvZ2dlciIsICJwZXJzaXN0RW52VmFyIl0KfQo=
