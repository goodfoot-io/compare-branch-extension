#!/usr/bin/env -S node --enable-source-maps
// src/stop.ts
import { execFileSync } from "node:child_process";

// ../../../packages/cards/git-hooks/src/lib/card-repo-sessions.ts
import {
  appendFileSync,
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ../../../packages/cards/git-hooks/src/lib/ipc.ts
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

// ../../../packages/cards/git-hooks/src/lib/card-repo-sessions.ts
var MAX_ENTRY_AGE_MS = 24 * 60 * 60 * 1e3;
var LOCK_TIMEOUT_MS = 2e3;
function getCardRepoCommitsDir() {
  return join(homedir(), ".cards", "card-repo-commits");
}
function getRegistryPath() {
  return join(getCardRepoCommitsDir(), "pids.json");
}
function getLockPath() {
  return join(getCardRepoCommitsDir(), "pids.lock");
}
function getSessionCsvPath(sessionId) {
  return join(getCardRepoCommitsDir(), `${sessionId}.csv`);
}
function getSessionCsvLockPath(sessionId) {
  return join(getCardRepoCommitsDir(), `${sessionId}.csv.lock`);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function hasErrnoCode(error, code) {
  return error instanceof Error && "code" in error && error.code === code;
}
function tryRemoveStaleLock(lockPath) {
  try {
    const lockContent = readFileSync(lockPath, "utf-8");
    const holderPid = Number.parseInt(lockContent.trim(), 10);
    if (!Number.isNaN(holderPid) && !isProcessAlive(holderPid)) {
      const rereadContent = readFileSync(lockPath, "utf-8");
      if (rereadContent === lockContent) {
        unlinkSync(lockPath);
        return true;
      }
    }
  } catch {
    try {
      unlinkSync(lockPath);
      return true;
    } catch (unlinkError) {
      if (!hasErrnoCode(unlinkError, "ENOENT")) throw unlinkError;
    }
  }
  return false;
}
async function acquireLock(lockPath) {
  const startTime = Date.now();
  const resolvedLockPath = lockPath ?? getLockPath();
  while (Date.now() - startTime < LOCK_TIMEOUT_MS) {
    try {
      mkdirSync(getCardRepoCommitsDir(), { recursive: true, mode: 448 });
      const fd = openSync(resolvedLockPath, "wx", 384);
      writeFileSync(fd, String(process.pid));
      closeSync(fd);
      return;
    } catch (error) {
      if (!hasErrnoCode(error, "EEXIST")) throw error;
      if (tryRemoveStaleLock(resolvedLockPath)) continue;
      const remaining = LOCK_TIMEOUT_MS - (Date.now() - startTime);
      if (remaining > 0) await sleep(Math.min(50, remaining));
    }
  }
  throw new Error("Lock acquisition timeout");
}
function releaseLock(lockPath) {
  try {
    unlinkSync(lockPath ?? getLockPath());
  } catch (error) {
    if (!hasErrnoCode(error, "ENOENT")) throw error;
  }
}
function readRegistry() {
  try {
    const content = readFileSync(getRegistryPath(), "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (hasErrnoCode(error, "ENOENT")) return { sessions: {} };
    throw error;
  }
}
function writeRegistryLocked(registry) {
  mkdirSync(getCardRepoCommitsDir(), { recursive: true, mode: 448 });
  const registryPath = getRegistryPath();
  const tempPath = `${registryPath}.tmp`;
  try {
    writeFileSync(tempPath, JSON.stringify(registry, null, 2), { mode: 384 });
    renameSync(tempPath, registryPath);
  } catch (error) {
    try {
      unlinkSync(tempPath);
    } catch (unlinkError) {
      if (!hasErrnoCode(unlinkError, "ENOENT")) {
        process.stderr.write(
          `cards-hook: failed to clean up temp file ${tempPath}: ${unlinkError instanceof Error ? unlinkError.message : String(unlinkError)}
`
        );
      }
    }
    throw error;
  }
}
function pruneStaleEntries(registry) {
  const now = Date.now();
  for (const [pidStr, entry] of Object.entries(registry.sessions)) {
    const pid = Number.parseInt(pidStr, 10);
    if (Number.isNaN(pid)) {
      delete registry.sessions[pidStr];
      continue;
    }
    const updatedAt = new Date(entry.updatedAt).getTime();
    if (Number.isNaN(updatedAt) || now - updatedAt > MAX_ENTRY_AGE_MS) {
      delete registry.sessions[pidStr];
      continue;
    }
    if (!isProcessAlive(pid)) {
      delete registry.sessions[pidStr];
    }
  }
}
async function executeTransaction(operation) {
  await acquireLock();
  try {
    const registry = readRegistry();
    pruneStaleEntries(registry);
    const result = operation(registry);
    writeRegistryLocked(registry);
    return result;
  } finally {
    releaseLock();
  }
}
async function appendCommitToSession(sessionId, sha) {
  mkdirSync(getCardRepoCommitsDir(), { recursive: true, mode: 448 });
  const csvLockPath = getSessionCsvLockPath(sessionId);
  await acquireLock(csvLockPath);
  try {
    const csvPath = getSessionCsvPath(sessionId);
    const existingCommits = getSessionCommits(sessionId);
    if (!existingCommits.includes(sha)) {
      appendFileSync(csvPath, `${sha}
`, { mode: 384 });
    }
  } finally {
    releaseLock(csvLockPath);
  }
}
function getSessionCommits(sessionId) {
  try {
    const csvPath = getSessionCsvPath(sessionId);
    const content = readFileSync(csvPath, "utf-8");
    return content.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  } catch (error) {
    if (hasErrnoCode(error, "ENOENT")) return [];
    throw error;
  }
}
async function removeSessionPid(pid) {
  await executeTransaction((registry) => {
    const pidStr = String(pid);
    delete registry.sessions[pidStr];
  });
}
function removeSessionCsv(sessionId) {
  const csvPath = getSessionCsvPath(sessionId);
  const csvLockPath = getSessionCsvLockPath(sessionId);
  try {
    unlinkSync(csvPath);
  } catch (error) {
    if (!hasErrnoCode(error, "ENOENT")) throw error;
  }
  try {
    unlinkSync(csvLockPath);
  } catch (error) {
    if (!hasErrnoCode(error, "ENOENT")) throw error;
  }
}

// ../../../packages/cards/git-hooks/src/lib/process-tree.ts
import { execSync } from "node:child_process";
import { basename } from "node:path";
var PROCESS_TREE_MAX_DEPTH = 10;
function isClaude(pid) {
  try {
    const comm = execSync(`ps -p ${pid} -o comm=`, { encoding: "utf8" }).trim();
    if (basename(comm).toLowerCase() === "claude") return true;
    const args = execSync(`ps -p ${pid} -o args=`, { encoding: "utf8" }).trim();
    return /\bclaude\b/i.test(args);
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

// ../sdk/src/config/env.ts
import { readFileSync as readFileSync2 } from "node:fs";
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
   * `$VSCODE_NODE_PATH ./bin/...` so they work regardless of
   * whether `node` is on the system PATH.
   *
   * Available in all actions and type hooks.
   */
  VSCODE_NODE_PATH: "VSCODE_NODE_PATH",
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
   * Available in actions only.
   */
  WORKSPACE_PATH: "WORKSPACE_PATH",
  /**
   * Path to the card's repository directory.
   * Available in actions only.
   */
  CARD_REPO_PATH: "CARD_REPO_PATH"
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
function getWorkspacePath() {
  const value = process.env[CARDS_ENV_VARS.WORKSPACE_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.WORKSPACE_PATH}`);
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
function readSwitchToInteractiveData() {
  const dataPath = getSwitchToInteractiveDataPath();
  if (dataPath === void 0) {
    return void 0;
  }
  const content = readFileSync2(dataPath, "utf-8");
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
    workspacePath: getWorkspacePath(),
    cardRepoPath: getCardRepoPath()
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
function stopHook(config, handler) {
  return createHookFunction("Stop", config, handler);
}

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/logger.js
import { closeSync as closeSync2, existsSync, mkdirSync as mkdirSync2, openSync as openSync2, writeSync } from "node:fs";
import { dirname } from "node:path";
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
    this.logFilePath = config.logFilePath ?? process.env.CLAUDE_CODE_HOOKS_LOG_FILE ?? null;
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
      } catch {
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
      } catch {
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
        } catch {
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
    } catch {
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
      const dir = dirname(this.logFilePath);
      if (!existsSync(dir)) {
        mkdirSync2(dir, { recursive: true });
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
var logger = new Logger();

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/outputs.js
var EXIT_CODES = {
  /** Handler completed successfully. Claude Code parses stdout as JSON. */
  SUCCESS: 0,
  /** Non-blocking error occurred (e.g., invalid input). stderr shown to user only. */
  ERROR: 1,
  /** Handler threw exception OR blocking action requested. stderr shown to Claude. */
  BLOCK: 2
};
function createDecisionOutputBuilder(hookType) {
  return (options = {}) => ({
    _type: hookType,
    stdout: options
  });
}
var stopOutput = /* @__PURE__ */ createDecisionOutputBuilder("Stop");

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/runtime.js
async function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      chunks.push(chunk);
    });
    process.stdin.on("end", () => {
      resolve(chunks.join(""));
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
  return { stdout: specificOutput.stdout };
}
async function execute(hookFn) {
  let output;
  try {
    const cliLogFile = process.env.CLAUDE_CODE_HOOKS_CLI_LOG_FILE;
    const envLogFile = process.env.CLAUDE_CODE_HOOKS_LOG_FILE;
    if (cliLogFile !== void 0 && envLogFile !== void 0 && cliLogFile !== envLogFile) {
      process.stderr.write(`Log file configuration conflict: CLI --log="${cliLogFile}" vs CLAUDE_CODE_HOOKS_LOG_FILE="${envLogFile}". Use only one method to configure hook logging.
`);
      process.exit(EXIT_CODES.ERROR);
    }
    if (cliLogFile !== void 0) {
      logger.setLogFile(cliLogFile);
    }
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
    process.exit(EXIT_CODES.SUCCESS);
  }
}

// src/stop.ts
var EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf899d15363d7aa09";
var SHA_PATTERN = /^[0-9a-f]{40}$/i;
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function assertValidSha(sha, label) {
  if (!SHA_PATTERN.test(sha)) {
    throw new Error(`Invalid ${label}: ${sha}`);
  }
}
function getCommitsSince(repoPath, sinceSha) {
  assertValidSha(sinceSha, "since SHA");
  const output = execFileSync("git", ["log", "--format=%H", `${sinceSha}..HEAD`], {
    cwd: repoPath,
    encoding: "utf-8",
    timeout: 1e4,
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
  if (!output) return [];
  const shas = output.split("\n");
  for (const sha of shas) {
    assertValidSha(sha, "commit SHA");
  }
  return shas;
}
function getUnattributedCommits(allCommits, sessionCommits) {
  const sessionSet = new Set(sessionCommits);
  return allCommits.filter((sha) => !sessionSet.has(sha));
}
function getDiffForCommits(repoPath, shas) {
  if (shas.length === 0) return "";
  const oldest = shas[shas.length - 1];
  assertValidSha(oldest, "oldest commit SHA");
  try {
    return execFileSync("git", ["diff", `${oldest}~1..HEAD`], {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 1e4,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
  } catch {
    return execFileSync("git", ["diff", `${EMPTY_TREE_SHA}..HEAD`], {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 1e4,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
  }
}
var stop_default = stopHook({}, async (input, { logger: logger2 }) => {
  let actionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = errorMessage(error);
    logger2.error("Not running inside an action subprocess", { error: message });
    return stopOutput({
      decision: "approve",
      systemMessage: "Stop hook: not running inside an action subprocess."
    });
  }
  const headSha = process.env["SESSION_GIT_HEAD_SHA"];
  if (!headSha) {
    logger2.info("No SESSION_GIT_HEAD_SHA \u2014 skipping commit attribution check");
    return stopOutput({
      decision: "approve",
      systemMessage: "Stop approved (no HEAD SHA tracked for this session)."
    });
  }
  const sessionId = input.session_id;
  let allCommits;
  try {
    allCommits = getCommitsSince(actionInput.cardRepoPath, headSha);
  } catch (error) {
    const message = errorMessage(error);
    logger2.error("Failed to get commits since session start", { error: message });
    return stopOutput({
      decision: "block",
      reason: `Cannot determine commit attribution: git log failed: ${message}`
    });
  }
  if (allCommits.length === 0) {
    await cleanupSession(logger2, sessionId);
    return stopOutput({
      decision: "approve",
      systemMessage: "Stop approved \u2014 no commits since session start."
    });
  }
  let sessionCommits;
  try {
    sessionCommits = getSessionCommits(sessionId);
  } catch (error) {
    const message = errorMessage(error);
    logger2.error("Failed to read session commits", { error: message });
    return stopOutput({
      decision: "block",
      reason: `Cannot determine commit attribution: CSV read failed: ${message}`
    });
  }
  const unattributed = getUnattributedCommits(allCommits, sessionCommits);
  if (unattributed.length === 0) {
    await cleanupSession(logger2, sessionId);
    return stopOutput({
      decision: "approve",
      systemMessage: `Stop approved \u2014 all ${allCommits.length} commits attributed to this session.`
    });
  }
  let diffContent;
  try {
    diffContent = getDiffForCommits(actionInput.cardRepoPath, unattributed);
  } catch (error) {
    const message = errorMessage(error);
    diffContent = `(Could not generate diff: ${message})`;
  }
  await recordUnattributedCommits(sessionId, unattributed, logger2);
  await cleanupSession(logger2, sessionId);
  return stopOutput({
    decision: "block",
    reason: `External changes detected in card repo (${unattributed.length} unattributed commit${unattributed.length > 1 ? "s" : ""}):

${diffContent}`
  });
});
async function recordUnattributedCommits(sessionId, shas, logger2) {
  for (const sha of shas) {
    try {
      await appendCommitToSession(sessionId, sha);
    } catch (error) {
      logger2.error("Failed to record unattributed commit", { sha, error });
    }
  }
}
async function cleanupSession(logger2, sessionId) {
  const envPid = process.env["SESSION_CLAUDE_PID"];
  const pid = envPid ? Number.parseInt(envPid, 10) : null;
  const resolvedPid = pid && !Number.isNaN(pid) ? pid : findClaudePid();
  if (resolvedPid) {
    try {
      await removeSessionPid(resolvedPid);
      logger2.info("Cleaned up PID registration", { pid: resolvedPid });
    } catch (error) {
      logger2.error("Failed to clean up PID registration", { error });
    }
  }
  try {
    removeSessionCsv(sessionId);
    logger2.info("Cleaned up session CSV", { sessionId });
  } catch (error) {
    logger2.error("Failed to clean up session CSV", { error });
  }
}

// src/stop-entry.ts
process.env["CLAUDE_CODE_HOOKS_CLI_LOG_FILE"] = "/workspace/.cards/logs/runtime-hooks.log";
execute(stop_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3N0b3AudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY2FyZHMvZ2l0LWhvb2tzL3NyYy9saWIvY2FyZC1yZXBvLXNlc3Npb25zLnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL2NhcmRzL2dpdC1ob29rcy9zcmMvbGliL2lwYy50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9jYXJkcy9naXQtaG9va3Mvc3JjL2xpYi9wcm9jZXNzLXRyZWUudHMiLCAiLi4vc2RrL3NyYy9jb25maWcvZW52LnRzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9lbnYuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2hvb2tzLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9sb2dnZXIuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L291dHB1dHMuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L3J1bnRpbWUuanMiLCAic3JjL3N0b3AtZW50cnkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU3RvcCBob29rIGltcGxlbWVudGF0aW9uLlxuICpcbiAqIFJ1bnMgYXMgYSBzdWJwcm9jZXNzIG9mIGFuIGFjdGlvbi4gVXNlcyB7QGxpbmsgZXh0cmFjdEFjdGlvbklucHV0fSB0b1xuICogY29uZmlybSB3ZSBhcmUgaW5zaWRlIGFuIGFjdGlvbiBzdWJwcm9jZXNzIGFuZCB0byBleHBvc2UgdGhlIGFjdGlvblxuICogcHJvY2VzcyBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogQWZ0ZXIgY29uZmlybWluZyB0aGUgYWN0aW9uIGNvbnRleHQsIHRoZSBob29rIGNoZWNrcyBmb3IgdW5hdHRyaWJ1dGVkXG4gKiBjb21taXRzIGluIHRoZSBjYXJkIHJlcG8gc2luY2UgdGhlIHNlc3Npb24gc3RhcnRlZCAodHJhY2tlZCB2aWFcbiAqIGBTRVNTSU9OX0dJVF9IRUFEX1NIQWApLiBVbmF0dHJpYnV0ZWQgY29tbWl0cyBhcmUgdGhvc2Ugbm90IHJlY29yZGVkXG4gKiBpbiB0aGUgc2Vzc2lvbidzIENTViBieSB0aGUgY2FyZC1yZXBvIHBvc3QtY29tbWl0IGhvb2suXG4gKlxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N0b3BcbiAqL1xuXG5pbXBvcnQgeyBleGVjRmlsZVN5bmMgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtcbiAgYXBwZW5kQ29tbWl0VG9TZXNzaW9uLFxuICBnZXRTZXNzaW9uQ29tbWl0cyxcbiAgcmVtb3ZlU2Vzc2lvbkNzdixcbiAgcmVtb3ZlU2Vzc2lvblBpZFxufSBmcm9tICdAY2FyZHMvZ2l0LWhvb2tzL2xpYi9jYXJkLXJlcG8tc2Vzc2lvbnMnO1xuaW1wb3J0IHsgZmluZENsYXVkZVBpZCB9IGZyb20gJ0BjYXJkcy9naXQtaG9va3MvbGliL3Byb2Nlc3MtdHJlZSc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbklucHV0IH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgZXh0cmFjdEFjdGlvbklucHV0IH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHR5cGUgeyBMb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuaW1wb3J0IHsgc3RvcEhvb2ssIHN0b3BPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuXG4vKipcbiAqIFdlbGwta25vd24gZ2l0IGVtcHR5IHRyZWUgU0hBLCB1c2VkIGFzIGEgZGlmZiBiYXNlIGZvciBpbml0aWFsIGNvbW1pdHMuXG4gKiBUaGlzIGlzIGEgZGV0ZXJtaW5pc3RpYyB2YWx1ZSB0aGF0IG5ldmVyIGNoYW5nZXMuXG4gKi9cbmNvbnN0IEVNUFRZX1RSRUVfU0hBID0gJzRiODI1ZGM2NDJjYjZlYjlhMDYwZTU0YmY4OTlkMTUzNjNkN2FhMDknO1xuY29uc3QgU0hBX1BBVFRFUk4gPSAvXlswLTlhLWZdezQwfSQvaTtcblxuZnVuY3Rpb24gZXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0VmFsaWRTaGEoc2hhOiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCFTSEFfUEFUVEVSTi50ZXN0KHNoYSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtsYWJlbH06ICR7c2hhfWApO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhbGwgY29tbWl0IFNIQXMgYmV0d2VlbiBzaW5jZVNoYSBhbmQgSEVBRCBpbiB0aGUgZ2l2ZW4gcmVwby5cbiAqIFJ1bnM6IGdpdCBsb2cgLS1mb3JtYXQ9JUggc2luY2VTaGEuLkhFQURcbiAqXG4gKiBAcGFyYW0gcmVwb1BhdGggLSBDYXJkIHJlcG9zaXRvcnkgcGF0aCB3aGVyZSBnaXQgY29tbWFuZHMgc2hvdWxkIGV4ZWN1dGUuXG4gKiBAcGFyYW0gc2luY2VTaGEgLSBCYXNlbGluZSBTSEEgY2FwdHVyZWQgYXQgc2Vzc2lvbiBzdGFydC5cbiAqIEByZXR1cm5zIE5ld2VyIGNvbW1pdCBTSEFzIGluIHJldmVyc2UgY2hyb25vbG9naWNhbCBvcmRlciAobmV3ZXN0IGZpcnN0KS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbW1pdHNTaW5jZShyZXBvUGF0aDogc3RyaW5nLCBzaW5jZVNoYTogc3RyaW5nKTogc3RyaW5nW10ge1xuICBhc3NlcnRWYWxpZFNoYShzaW5jZVNoYSwgJ3NpbmNlIFNIQScpO1xuXG4gIGNvbnN0IG91dHB1dCA9IGV4ZWNGaWxlU3luYygnZ2l0JywgWydsb2cnLCAnLS1mb3JtYXQ9JUgnLCBgJHtzaW5jZVNoYX0uLkhFQURgXSwge1xuICAgIGN3ZDogcmVwb1BhdGgsXG4gICAgZW5jb2Rpbmc6ICd1dGYtOCcsXG4gICAgdGltZW91dDogMTAwMDAsXG4gICAgc3RkaW86IFsncGlwZScsICdwaXBlJywgJ3BpcGUnXVxuICB9KS50cmltKCk7XG4gIGlmICghb3V0cHV0KSByZXR1cm4gW107XG4gIGNvbnN0IHNoYXMgPSBvdXRwdXQuc3BsaXQoJ1xcbicpO1xuICBmb3IgKGNvbnN0IHNoYSBvZiBzaGFzKSB7XG4gICAgYXNzZXJ0VmFsaWRTaGEoc2hhLCAnY29tbWl0IFNIQScpO1xuICB9XG4gIHJldHVybiBzaGFzO1xufVxuXG4vKipcbiAqIFJldHVybnMgY29tbWl0cyBmcm9tIGFsbENvbW1pdHMgdGhhdCBhcmUgTk9UIGluIHNlc3Npb25Db21taXRzLlxuICpcbiAqIEBwYXJhbSBhbGxDb21taXRzIC0gRnVsbCBjb21taXQgbGlzdCBkZXRlY3RlZCBzaW5jZSBzZXNzaW9uIHN0YXJ0LlxuICogQHBhcmFtIHNlc3Npb25Db21taXRzIC0gQ29tbWl0cyBhbHJlYWR5IGF0dHJpYnV0ZWQgdG8gdGhlIGN1cnJlbnQgc2Vzc2lvbi5cbiAqIEByZXR1cm5zIFNIQXMgdGhhdCBzdGlsbCBuZWVkIGF0dHJpYnV0aW9uIHJldmlldy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFVuYXR0cmlidXRlZENvbW1pdHMoYWxsQ29tbWl0czogc3RyaW5nW10sIHNlc3Npb25Db21taXRzOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgc2Vzc2lvblNldCA9IG5ldyBTZXQoc2Vzc2lvbkNvbW1pdHMpO1xuICByZXR1cm4gYWxsQ29tbWl0cy5maWx0ZXIoKHNoYSkgPT4gIXNlc3Npb25TZXQuaGFzKHNoYSkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGNvbWJpbmVkIGRpZmYgY29udGVudCBmb3IgdGhlIGdpdmVuIGNvbW1pdCBTSEFzLlxuICogVXNlcyB0aGUgcmFuZ2UgZnJvbSBvbGRlc3QgdW5hdHRyaWJ1dGVkIGNvbW1pdCdzIHBhcmVudCB0byBIRUFELlxuICogRmFsbHMgYmFjayB0byBlbXB0eSB0cmVlIFNIQSBpZiBvbGRlc3QgY29tbWl0IGlzIHRoZSBpbml0aWFsIGNvbW1pdC5cbiAqXG4gKiBAcGFyYW0gcmVwb1BhdGggLSBDYXJkIHJlcG9zaXRvcnkgcGF0aCB3aGVyZSBnaXQgY29tbWFuZHMgc2hvdWxkIGV4ZWN1dGUuXG4gKiBAcGFyYW0gc2hhcyAtIFVuYXR0cmlidXRlZCBjb21taXQgU0hBcyAobmV3ZXN0IGZpcnN0IGZyb20ge0BsaW5rIGdldENvbW1pdHNTaW5jZX0pLlxuICogQHJldHVybnMgVW5pZmllZCBkaWZmIHRleHQgZm9yIGFsbCB1bmF0dHJpYnV0ZWQgY2hhbmdlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERpZmZGb3JDb21taXRzKHJlcG9QYXRoOiBzdHJpbmcsIHNoYXM6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgaWYgKHNoYXMubGVuZ3RoID09PSAwKSByZXR1cm4gJyc7XG4gIC8vIHNoYXMgYXJlIGluIHJldmVyc2UgY2hyb25vbG9naWNhbCBvcmRlciAobmV3ZXN0IGZpcnN0IGZyb20gZ2l0IGxvZylcbiAgLy8gb2xkZXN0IGlzIGxhc3QgZWxlbWVudFxuICBjb25zdCBvbGRlc3QgPSBzaGFzW3NoYXMubGVuZ3RoIC0gMV0hO1xuICBhc3NlcnRWYWxpZFNoYShvbGRlc3QsICdvbGRlc3QgY29tbWl0IFNIQScpO1xuICB0cnkge1xuICAgIHJldHVybiBleGVjRmlsZVN5bmMoJ2dpdCcsIFsnZGlmZicsIGAke29sZGVzdH1+MS4uSEVBRGBdLCB7XG4gICAgICBjd2Q6IHJlcG9QYXRoLFxuICAgICAgZW5jb2Rpbmc6ICd1dGYtOCcsXG4gICAgICB0aW1lb3V0OiAxMDAwMCxcbiAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICB9KS50cmltKCk7XG4gIH0gY2F0Y2gge1xuICAgIC8vIEZhbGxiYWNrIGZvciBpbml0aWFsIGNvbW1pdHMgdGhhdCBoYXZlIG5vIHBhcmVudFxuICAgIHJldHVybiBleGVjRmlsZVN5bmMoJ2dpdCcsIFsnZGlmZicsIGAke0VNUFRZX1RSRUVfU0hBfS4uSEVBRGBdLCB7XG4gICAgICBjd2Q6IHJlcG9QYXRoLFxuICAgICAgZW5jb2Rpbmc6ICd1dGYtOCcsXG4gICAgICB0aW1lb3V0OiAxMDAwMCxcbiAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICB9KS50cmltKCk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgc3RvcEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICBsZXQgYWN0aW9uSW5wdXQ6IEFjdGlvbklucHV0O1xuICB0cnkge1xuICAgIGFjdGlvbklucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yTWVzc2FnZShlcnJvcik7XG4gICAgbG9nZ2VyLmVycm9yKCdOb3QgcnVubmluZyBpbnNpZGUgYW4gYWN0aW9uIHN1YnByb2Nlc3MnLCB7IGVycm9yOiBtZXNzYWdlIH0pO1xuICAgIHJldHVybiBzdG9wT3V0cHV0KHtcbiAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZScsXG4gICAgICBzeXN0ZW1NZXNzYWdlOiAnU3RvcCBob29rOiBub3QgcnVubmluZyBpbnNpZGUgYW4gYWN0aW9uIHN1YnByb2Nlc3MuJ1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgaGVhZFNoYSA9IHByb2Nlc3MuZW52WydTRVNTSU9OX0dJVF9IRUFEX1NIQSddO1xuICBpZiAoIWhlYWRTaGEpIHtcbiAgICBsb2dnZXIuaW5mbygnTm8gU0VTU0lPTl9HSVRfSEVBRF9TSEEgXHUyMDE0IHNraXBwaW5nIGNvbW1pdCBhdHRyaWJ1dGlvbiBjaGVjaycpO1xuICAgIHJldHVybiBzdG9wT3V0cHV0KHtcbiAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZScsXG4gICAgICBzeXN0ZW1NZXNzYWdlOiAnU3RvcCBhcHByb3ZlZCAobm8gSEVBRCBTSEEgdHJhY2tlZCBmb3IgdGhpcyBzZXNzaW9uKS4nXG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBzZXNzaW9uSWQgPSBpbnB1dC5zZXNzaW9uX2lkO1xuXG4gIC8vIEdldCBhbGwgY29tbWl0cyBzaW5jZSBzZXNzaW9uIHN0YXJ0XG4gIGxldCBhbGxDb21taXRzOiBzdHJpbmdbXTtcbiAgdHJ5IHtcbiAgICBhbGxDb21taXRzID0gZ2V0Q29tbWl0c1NpbmNlKGFjdGlvbklucHV0LmNhcmRSZXBvUGF0aCwgaGVhZFNoYSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yTWVzc2FnZShlcnJvcik7XG4gICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gZ2V0IGNvbW1pdHMgc2luY2Ugc2Vzc2lvbiBzdGFydCcsIHsgZXJyb3I6IG1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICAgICAgZGVjaXNpb246ICdibG9jaycsXG4gICAgICByZWFzb246IGBDYW5ub3QgZGV0ZXJtaW5lIGNvbW1pdCBhdHRyaWJ1dGlvbjogZ2l0IGxvZyBmYWlsZWQ6ICR7bWVzc2FnZX1gXG4gICAgfSk7XG4gIH1cblxuICBpZiAoYWxsQ29tbWl0cy5sZW5ndGggPT09IDApIHtcbiAgICAvLyBObyBjb21taXRzIHNpbmNlIHNlc3Npb24gc3RhcnQgXHUyMDE0IGFwcHJvdmVcbiAgICBhd2FpdCBjbGVhbnVwU2Vzc2lvbihsb2dnZXIsIHNlc3Npb25JZCk7XG4gICAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICAgICAgZGVjaXNpb246ICdhcHByb3ZlJyxcbiAgICAgIHN5c3RlbU1lc3NhZ2U6ICdTdG9wIGFwcHJvdmVkIFx1MjAxNCBubyBjb21taXRzIHNpbmNlIHNlc3Npb24gc3RhcnQuJ1xuICAgIH0pO1xuICB9XG5cbiAgLy8gR2V0IHNlc3Npb24ncyBhdHRyaWJ1dGVkIGNvbW1pdHNcbiAgbGV0IHNlc3Npb25Db21taXRzOiBzdHJpbmdbXTtcbiAgdHJ5IHtcbiAgICBzZXNzaW9uQ29tbWl0cyA9IGdldFNlc3Npb25Db21taXRzKHNlc3Npb25JZCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yTWVzc2FnZShlcnJvcik7XG4gICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gcmVhZCBzZXNzaW9uIGNvbW1pdHMnLCB7IGVycm9yOiBtZXNzYWdlIH0pO1xuICAgIHJldHVybiBzdG9wT3V0cHV0KHtcbiAgICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICAgICAgcmVhc29uOiBgQ2Fubm90IGRldGVybWluZSBjb21taXQgYXR0cmlidXRpb246IENTViByZWFkIGZhaWxlZDogJHttZXNzYWdlfWBcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHVuYXR0cmlidXRlZCA9IGdldFVuYXR0cmlidXRlZENvbW1pdHMoYWxsQ29tbWl0cywgc2Vzc2lvbkNvbW1pdHMpO1xuXG4gIGlmICh1bmF0dHJpYnV0ZWQubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gQWxsIGNvbW1pdHMgYXR0cmlidXRlZCBcdTIwMTQgYXBwcm92ZVxuICAgIGF3YWl0IGNsZWFudXBTZXNzaW9uKGxvZ2dlciwgc2Vzc2lvbklkKTtcbiAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgICBkZWNpc2lvbjogJ2FwcHJvdmUnLFxuICAgICAgc3lzdGVtTWVzc2FnZTogYFN0b3AgYXBwcm92ZWQgXHUyMDE0IGFsbCAke2FsbENvbW1pdHMubGVuZ3RofSBjb21taXRzIGF0dHJpYnV0ZWQgdG8gdGhpcyBzZXNzaW9uLmBcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFVuYXR0cmlidXRlZCBjb21taXRzIGZvdW5kIFx1MjAxNCBibG9jayB3aXRoIGRpZmZcbiAgbGV0IGRpZmZDb250ZW50OiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgZGlmZkNvbnRlbnQgPSBnZXREaWZmRm9yQ29tbWl0cyhhY3Rpb25JbnB1dC5jYXJkUmVwb1BhdGgsIHVuYXR0cmlidXRlZCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yTWVzc2FnZShlcnJvcik7XG4gICAgZGlmZkNvbnRlbnQgPSBgKENvdWxkIG5vdCBnZW5lcmF0ZSBkaWZmOiAke21lc3NhZ2V9KWA7XG4gIH1cblxuICBhd2FpdCByZWNvcmRVbmF0dHJpYnV0ZWRDb21taXRzKHNlc3Npb25JZCwgdW5hdHRyaWJ1dGVkLCBsb2dnZXIpO1xuICBhd2FpdCBjbGVhbnVwU2Vzc2lvbihsb2dnZXIsIHNlc3Npb25JZCk7XG5cbiAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICAgIHJlYXNvbjogYEV4dGVybmFsIGNoYW5nZXMgZGV0ZWN0ZWQgaW4gY2FyZCByZXBvICgke3VuYXR0cmlidXRlZC5sZW5ndGh9IHVuYXR0cmlidXRlZCBjb21taXQke3VuYXR0cmlidXRlZC5sZW5ndGggPiAxID8gJ3MnIDogJyd9KTpcXG5cXG4ke2RpZmZDb250ZW50fWBcbiAgfSk7XG59KTtcblxuLyoqXG4gKiBSZWNvcmRzIHVuYXR0cmlidXRlZCBjb21taXRzIHNvIHRoZXkgYXJlIHRyZWF0ZWQgYXMgYWNrbm93bGVkZ2VkIG9uIHRoZSBuZXh0IHN0b3AuXG4gKlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gSUQgd2hvc2UgY29tbWl0IENTViBzaG91bGQgYmUgdXBkYXRlZC5cbiAqIEBwYXJhbSBzaGFzIC0gVW5hdHRyaWJ1dGVkIGNvbW1pdCBTSEFzIHRvIHBlcnNpc3QuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gSG9vayBsb2dnZXIgZm9yIGJlc3QtZWZmb3J0IGVycm9yIHJlcG9ydGluZy5cbiAqIEByZXR1cm5zIFJlc29sdmVzIGFmdGVyIGFsbCBTSEFzIGhhdmUgYmVlbiBhdHRlbXB0ZWQuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlY29yZFVuYXR0cmlidXRlZENvbW1pdHMoc2Vzc2lvbklkOiBzdHJpbmcsIHNoYXM6IHN0cmluZ1tdLCBsb2dnZXI6IExvZ2dlcik6IFByb21pc2U8dm9pZD4ge1xuICBmb3IgKGNvbnN0IHNoYSBvZiBzaGFzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGFwcGVuZENvbW1pdFRvU2Vzc2lvbihzZXNzaW9uSWQsIHNoYSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHJlY29yZCB1bmF0dHJpYnV0ZWQgY29tbWl0JywgeyBzaGEsIGVycm9yIH0pO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgUElEL3Nlc3Npb24gYXJ0aWZhY3RzIGNyZWF0ZWQgZHVyaW5nIHNlc3Npb24tc3RhcnQuXG4gKlxuICogQHBhcmFtIGxvZ2dlciAtIEhvb2sgbG9nZ2VyIHVzZWQgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gSUQgd2hvc2UgQ1NWIGJ1ZmZlciBzaG91bGQgYmUgY2xlYW5lZCB1cC5cbiAqIEByZXR1cm5zIFJlc29sdmVzIGFmdGVyIGJlc3QtZWZmb3J0IGNsZWFudXAuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNsZWFudXBTZXNzaW9uKGxvZ2dlcjogTG9nZ2VyLCBzZXNzaW9uSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAvLyBVc2UgcGVyc2lzdGVkIFBJRCBmcm9tIHNlc3Npb24tc3RhcnQsIGZhbGwgYmFjayB0byBmaW5kQ2xhdWRlUGlkKClcbiAgY29uc3QgZW52UGlkID0gcHJvY2Vzcy5lbnZbJ1NFU1NJT05fQ0xBVURFX1BJRCddO1xuICBjb25zdCBwaWQgPSBlbnZQaWQgPyBOdW1iZXIucGFyc2VJbnQoZW52UGlkLCAxMCkgOiBudWxsO1xuICBjb25zdCByZXNvbHZlZFBpZCA9IHBpZCAmJiAhTnVtYmVyLmlzTmFOKHBpZCkgPyBwaWQgOiBmaW5kQ2xhdWRlUGlkKCk7XG5cbiAgaWYgKHJlc29sdmVkUGlkKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHJlbW92ZVNlc3Npb25QaWQocmVzb2x2ZWRQaWQpO1xuICAgICAgbG9nZ2VyLmluZm8oJ0NsZWFuZWQgdXAgUElEIHJlZ2lzdHJhdGlvbicsIHsgcGlkOiByZXNvbHZlZFBpZCB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gY2xlYW4gdXAgUElEIHJlZ2lzdHJhdGlvbicsIHsgZXJyb3IgfSk7XG4gICAgfVxuICB9XG5cbiAgdHJ5IHtcbiAgICByZW1vdmVTZXNzaW9uQ3N2KHNlc3Npb25JZCk7XG4gICAgbG9nZ2VyLmluZm8oJ0NsZWFuZWQgdXAgc2Vzc2lvbiBDU1YnLCB7IHNlc3Npb25JZCB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBjbGVhbiB1cCBzZXNzaW9uIENTVicsIHsgZXJyb3IgfSk7XG4gIH1cbn1cbiIsICIvKipcbiAqIEZpbGUtYmFzZWQgUElELXRvLXNlc3Npb25JZCByZWdpc3RyeSBmb3IgY2FyZC1yZXBvIGNvbW1pdCBhdHRyaWJ1dGlvbi5cbiAqXG4gKiBUcmFja3Mgd2hpY2ggQ2xhdWRlIHNlc3Npb24gUElEIGlzIGFzc29jaWF0ZWQgd2l0aCB3aGljaCBzZXNzaW9uSWQsIGFuZFxuICogYnVmZmVycyBjb21taXQgU0hBcyBwZXIgc2Vzc2lvbiBpbiBpbmRpdmlkdWFsIENTViBmaWxlcy5cbiAqXG4gKiBEZXNpZ24gaW52YXJpYW50czpcbiAqIC0gKipObyBmYWlsLW9wZW4qKjogZnVuY3Rpb25zIHRocm93IG9uIGVycm9yIChjYWxsZXJzIGhhbmRsZSBlcnJvcnMpLlxuICogLSAqKkF0b21pYyB3cml0ZXMqKjogcmVnaXN0cnkgZmlsZSBpcyB3cml0dGVuIHZpYSB0ZW1wIGZpbGUgKyByZW5hbWUuXG4gKiAtICoqU3RhbGUtZW50cnkgcHJ1bmluZyoqOiBlbnRyaWVzIG9sZGVyIHRoYW4gMjRoIG9yIGJlbG9uZ2luZyB0byBkZWFkIFBJRHNcbiAqICAgYXJlIHJlbW92ZWQgb24gZXZlcnkgdHJhbnNhY3Rpb24uXG4gKiAtICoqUGVyLXNlc3Npb24gQ1NWKio6IGVhY2ggc2Vzc2lvbiBnZXRzIGl0cyBvd24gQ1NWIGZpbGUgd2l0aCBjb21taXQgU0hBcy5cbiAqXG4gKiBAbW9kdWxlIGxpYi9jYXJkLXJlcG8tc2Vzc2lvbnNcbiAqL1xuXG5pbXBvcnQge1xuICBhcHBlbmRGaWxlU3luYyxcbiAgY2xvc2VTeW5jLFxuICBta2RpclN5bmMsXG4gIG9wZW5TeW5jLFxuICByZWFkRmlsZVN5bmMsXG4gIHJlbmFtZVN5bmMsXG4gIHVubGlua1N5bmMsXG4gIHdyaXRlRmlsZVN5bmNcbn0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBob21lZGlyIH0gZnJvbSAnbm9kZTpvcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IGlzUHJvY2Vzc0FsaXZlIH0gZnJvbSAnLi9pcGMuanMnO1xuXG5leHBvcnQgY29uc3QgTUFYX0VOVFJZX0FHRV9NUyA9IDI0ICogNjAgKiA2MCAqIDEwMDA7IC8vIDI0IGhvdXJzXG5leHBvcnQgY29uc3QgTE9DS19USU1FT1VUX01TID0gMjAwMDtcblxuZnVuY3Rpb24gZ2V0Q2FyZFJlcG9Db21taXRzRGlyKCk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGhvbWVkaXIoKSwgJy5jYXJkcycsICdjYXJkLXJlcG8tY29tbWl0cycpO1xufVxuXG5mdW5jdGlvbiBnZXRSZWdpc3RyeVBhdGgoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oZ2V0Q2FyZFJlcG9Db21taXRzRGlyKCksICdwaWRzLmpzb24nKTtcbn1cblxuZnVuY3Rpb24gZ2V0TG9ja1BhdGgoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oZ2V0Q2FyZFJlcG9Db21taXRzRGlyKCksICdwaWRzLmxvY2snKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2Vzc2lvbkNzdlBhdGgoc2Vzc2lvbklkOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihnZXRDYXJkUmVwb0NvbW1pdHNEaXIoKSwgYCR7c2Vzc2lvbklkfS5jc3ZgKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2Vzc2lvbkNzdkxvY2tQYXRoKHNlc3Npb25JZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oZ2V0Q2FyZFJlcG9Db21taXRzRGlyKCksIGAke3Nlc3Npb25JZH0uY3N2LmxvY2tgKTtcbn1cblxuLyoqIFNlc3Npb24gbWV0YWRhdGEga2V5ZWQgYnkgUElEIGluIHRoZSByZWdpc3RyeSBmaWxlLiAqL1xuZXhwb3J0IGludGVyZmFjZSBQaWRTZXNzaW9uRW50cnkge1xuICBzZXNzaW9uSWQ6IHN0cmluZztcbiAgdXBkYXRlZEF0OiBzdHJpbmc7IC8vIElTTyB0aW1lc3RhbXBcbn1cblxuLyoqIEpTT04gcGF5bG9hZCBwZXJzaXN0ZWQgYXQgYH4vLmNhcmRzL2NhcmQtcmVwby1jb21taXRzL3BpZHMuanNvbmAuICovXG5leHBvcnQgaW50ZXJmYWNlIFBpZFNlc3Npb25SZWdpc3RyeSB7XG4gIHNlc3Npb25zOiBSZWNvcmQ8c3RyaW5nLCBQaWRTZXNzaW9uRW50cnk+O1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEludGVybmFsIGhlbHBlcnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBzbGVlcChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xufVxuXG5mdW5jdGlvbiBoYXNFcnJub0NvZGUoZXJyb3I6IHVua25vd24sIGNvZGU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiAnY29kZScgaW4gZXJyb3IgJiYgKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gY29kZTtcbn1cblxuLyoqXG4gKiBBdHRlbXB0cyB0byByZW1vdmUgYSBzdGFsZSBsb2NrIGZpbGUgaGVsZCBieSBhIGRlYWQgcHJvY2Vzcy5cbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgbG9jayB3YXMgcmVtb3ZlZCBhbmQgdGhlIGNhbGxlciBzaG91bGQgcmV0cnkuXG4gKi9cbmZ1bmN0aW9uIHRyeVJlbW92ZVN0YWxlTG9jayhsb2NrUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgY29uc3QgbG9ja0NvbnRlbnQgPSByZWFkRmlsZVN5bmMobG9ja1BhdGgsICd1dGYtOCcpO1xuICAgIGNvbnN0IGhvbGRlclBpZCA9IE51bWJlci5wYXJzZUludChsb2NrQ29udGVudC50cmltKCksIDEwKTtcblxuICAgIGlmICghTnVtYmVyLmlzTmFOKGhvbGRlclBpZCkgJiYgIWlzUHJvY2Vzc0FsaXZlKGhvbGRlclBpZCkpIHtcbiAgICAgIC8vIFJlLXJlYWQgbG9jayBmaWxlIHRvIG1pdGlnYXRlIFRPQ1RPVSByYWNlIGNvbmRpdGlvblxuICAgICAgY29uc3QgcmVyZWFkQ29udGVudCA9IHJlYWRGaWxlU3luYyhsb2NrUGF0aCwgJ3V0Zi04Jyk7XG4gICAgICBpZiAocmVyZWFkQ29udGVudCA9PT0gbG9ja0NvbnRlbnQpIHtcbiAgICAgICAgdW5saW5rU3luYyhsb2NrUGF0aCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gTG9jayBmaWxlIHVucmVhZGFibGUgb3IgaXNQcm9jZXNzQWxpdmUgZmFpbGVkIFx1MjAxNCBmb3JjZS1yZW1vdmUgYW5kIHJldHJ5XG4gICAgdHJ5IHtcbiAgICAgIHVubGlua1N5bmMobG9ja1BhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAodW5saW5rRXJyb3IpIHtcbiAgICAgIGlmICghaGFzRXJybm9Db2RlKHVubGlua0Vycm9yLCAnRU5PRU5UJykpIHRocm93IHVubGlua0Vycm9yO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGFjcXVpcmVMb2NrKGxvY2tQYXRoPzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gIGNvbnN0IHJlc29sdmVkTG9ja1BhdGggPSBsb2NrUGF0aCA/PyBnZXRMb2NrUGF0aCgpO1xuXG4gIHdoaWxlIChEYXRlLm5vdygpIC0gc3RhcnRUaW1lIDwgTE9DS19USU1FT1VUX01TKSB7XG4gICAgdHJ5IHtcbiAgICAgIG1rZGlyU3luYyhnZXRDYXJkUmVwb0NvbW1pdHNEaXIoKSwgeyByZWN1cnNpdmU6IHRydWUsIG1vZGU6IDBvNzAwIH0pO1xuICAgICAgY29uc3QgZmQgPSBvcGVuU3luYyhyZXNvbHZlZExvY2tQYXRoLCAnd3gnLCAwbzYwMCk7XG4gICAgICB3cml0ZUZpbGVTeW5jKGZkLCBTdHJpbmcocHJvY2Vzcy5waWQpKTtcbiAgICAgIGNsb3NlU3luYyhmZCk7XG4gICAgICByZXR1cm47XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGlmICghaGFzRXJybm9Db2RlKGVycm9yLCAnRUVYSVNUJykpIHRocm93IGVycm9yO1xuICAgICAgaWYgKHRyeVJlbW92ZVN0YWxlTG9jayhyZXNvbHZlZExvY2tQYXRoKSkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IHJlbWFpbmluZyA9IExPQ0tfVElNRU9VVF9NUyAtIChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKTtcbiAgICAgIGlmIChyZW1haW5pbmcgPiAwKSBhd2FpdCBzbGVlcChNYXRoLm1pbig1MCwgcmVtYWluaW5nKSk7XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKCdMb2NrIGFjcXVpc2l0aW9uIHRpbWVvdXQnKTtcbn1cblxuZnVuY3Rpb24gcmVsZWFzZUxvY2sobG9ja1BhdGg/OiBzdHJpbmcpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICB1bmxpbmtTeW5jKGxvY2tQYXRoID8/IGdldExvY2tQYXRoKCkpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmICghaGFzRXJybm9Db2RlKGVycm9yLCAnRU5PRU5UJykpIHRocm93IGVycm9yO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRSZWdpc3RyeSgpOiBQaWRTZXNzaW9uUmVnaXN0cnkge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoZ2V0UmVnaXN0cnlQYXRoKCksICd1dGYtOCcpO1xuICAgIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpIGFzIFBpZFNlc3Npb25SZWdpc3RyeTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoaGFzRXJybm9Db2RlKGVycm9yLCAnRU5PRU5UJykpIHJldHVybiB7IHNlc3Npb25zOiB7fSB9O1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlUmVnaXN0cnlMb2NrZWQocmVnaXN0cnk6IFBpZFNlc3Npb25SZWdpc3RyeSk6IHZvaWQge1xuICBta2RpclN5bmMoZ2V0Q2FyZFJlcG9Db21taXRzRGlyKCksIHsgcmVjdXJzaXZlOiB0cnVlLCBtb2RlOiAwbzcwMCB9KTtcblxuICBjb25zdCByZWdpc3RyeVBhdGggPSBnZXRSZWdpc3RyeVBhdGgoKTtcbiAgY29uc3QgdGVtcFBhdGggPSBgJHtyZWdpc3RyeVBhdGh9LnRtcGA7XG4gIHRyeSB7XG4gICAgd3JpdGVGaWxlU3luYyh0ZW1wUGF0aCwgSlNPTi5zdHJpbmdpZnkocmVnaXN0cnksIG51bGwsIDIpLCB7IG1vZGU6IDBvNjAwIH0pO1xuICAgIHJlbmFtZVN5bmModGVtcFBhdGgsIHJlZ2lzdHJ5UGF0aCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gQmVzdC1lZmZvcnQgY2xlYW51cDogcmVtb3ZlIHRlbXAgZmlsZSBiZWZvcmUgcmUtdGhyb3dpbmcuXG4gICAgLy8gT25seSBFTk9FTlQgaXMgZXhwZWN0ZWQgKHdyaXRlRmlsZVN5bmMgbWF5IG5vdCBoYXZlIGNyZWF0ZWQgdGhlIGZpbGUpLlxuICAgIHRyeSB7XG4gICAgICB1bmxpbmtTeW5jKHRlbXBQYXRoKTtcbiAgICB9IGNhdGNoICh1bmxpbmtFcnJvcikge1xuICAgICAgaWYgKCFoYXNFcnJub0NvZGUodW5saW5rRXJyb3IsICdFTk9FTlQnKSkge1xuICAgICAgICAvLyBVbmV4cGVjdGVkIGNsZWFudXAgZmFpbHVyZSBcdTIwMTQgbG9nIGJ1dCBwcmVzZXJ2ZSB0aGUgb3JpZ2luYWwgZXJyb3JcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgICAgYGNhcmRzLWhvb2s6IGZhaWxlZCB0byBjbGVhbiB1cCB0ZW1wIGZpbGUgJHt0ZW1wUGF0aH06ICR7dW5saW5rRXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IHVubGlua0Vycm9yLm1lc3NhZ2UgOiBTdHJpbmcodW5saW5rRXJyb3IpfVxcbmBcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJ1bmVTdGFsZUVudHJpZXMocmVnaXN0cnk6IFBpZFNlc3Npb25SZWdpc3RyeSk6IHZvaWQge1xuICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuXG4gIGZvciAoY29uc3QgW3BpZFN0ciwgZW50cnldIG9mIE9iamVjdC5lbnRyaWVzKHJlZ2lzdHJ5LnNlc3Npb25zKSkge1xuICAgIGNvbnN0IHBpZCA9IE51bWJlci5wYXJzZUludChwaWRTdHIsIDEwKTtcblxuICAgIGlmIChOdW1iZXIuaXNOYU4ocGlkKSkge1xuICAgICAgZGVsZXRlIHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBEYXRlIGNvbnN0cnVjdG9yIHJldHVybnMgTmFOIGZvciBpbnZhbGlkIHN0cmluZ3MgXHUyMDE0IG5vIHRyeS9jYXRjaCBuZWVkZWRcbiAgICBjb25zdCB1cGRhdGVkQXQgPSBuZXcgRGF0ZShlbnRyeS51cGRhdGVkQXQpLmdldFRpbWUoKTtcbiAgICBpZiAoTnVtYmVyLmlzTmFOKHVwZGF0ZWRBdCkgfHwgbm93IC0gdXBkYXRlZEF0ID4gTUFYX0VOVFJZX0FHRV9NUykge1xuICAgICAgZGVsZXRlIHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoIWlzUHJvY2Vzc0FsaXZlKHBpZCkpIHtcbiAgICAgIGRlbGV0ZSByZWdpc3RyeS5zZXNzaW9uc1twaWRTdHJdO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBleGVjdXRlVHJhbnNhY3Rpb248VD4ob3BlcmF0aW9uOiAocmVnaXN0cnk6IFBpZFNlc3Npb25SZWdpc3RyeSkgPT4gVCk6IFByb21pc2U8VD4ge1xuICBhd2FpdCBhY3F1aXJlTG9jaygpO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVnaXN0cnkgPSByZWFkUmVnaXN0cnkoKTtcbiAgICBwcnVuZVN0YWxlRW50cmllcyhyZWdpc3RyeSk7XG4gICAgY29uc3QgcmVzdWx0ID0gb3BlcmF0aW9uKHJlZ2lzdHJ5KTtcbiAgICB3cml0ZVJlZ2lzdHJ5TG9ja2VkKHJlZ2lzdHJ5KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9IGZpbmFsbHkge1xuICAgIHJlbGVhc2VMb2NrKCk7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQdWJsaWMgQVBJXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiBSZWdpc3RlcnMgYSBQSUQgd2l0aCBhIHNlc3Npb25JZC4gVXBkYXRlcyB0aGUgdGltZXN0YW1wIGlmIGFscmVhZHkgcmVnaXN0ZXJlZC5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgb3duaW5nIHRoZSBzZXNzaW9uLlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gaWRlbnRpZmllciB1c2VkIHRvIG5hbWUgdGhlIHBlci1zZXNzaW9uIENTViBmaWxlLlxuICogQHJldHVybnMgUmVzb2x2ZXMgb25jZSB0aGUgcmVnaXN0cnkgd3JpdGUgaXMgZHVyYWJseSBjb21taXR0ZWQuXG4gKiBAdGhyb3dzIEVycm9yIG9uIGxvY2sgYWNxdWlzaXRpb24gb3IgcmVnaXN0cnkgd3JpdGUgZmFpbHVyZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyU2Vzc2lvblBpZChwaWQ6IG51bWJlciwgc2Vzc2lvbklkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgZXhlY3V0ZVRyYW5zYWN0aW9uKChyZWdpc3RyeSkgPT4ge1xuICAgIGNvbnN0IHBpZFN0ciA9IFN0cmluZyhwaWQpO1xuICAgIHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl0gPSB7XG4gICAgICBzZXNzaW9uSWQsXG4gICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgIH07XG4gIH0pO1xufVxuXG4vKipcbiAqIFJldHVybnMgc2Vzc2lvbklkIGZvciBhIFBJRCBpZiBpdCBleGlzdHMsIG51bGwgb3RoZXJ3aXNlLlxuICpcbiAqIFRoaXMgcmVhZCBwYXRoIGRvZXMgbm90IGFjcXVpcmUgdGhlIHdyaXRlIGxvY2ssIHNvIGNhbGxlcnMgc2hvdWxkIHRyZWF0IHRoZVxuICogcmVzdWx0IGFzIGEgcG9pbnQtaW4tdGltZSBsb29rdXAuXG4gKlxuICogQHBhcmFtIHBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRvIHJlc29sdmUuXG4gKiBAcmV0dXJucyBTZXNzaW9uIElEIGZvciB0aGUgUElELCBvciBgbnVsbGAgd2hlbiB0aGUgUElEIGlzIG5vdCByZWdpc3RlcmVkLlxuICogQHRocm93cyBFcnJvciBvbiByZWdpc3RyeSByZWFkL3BhcnNpbmcgZmFpbHVyZXMgb3RoZXIgdGhhbiBtaXNzaW5nIGZpbGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTZXNzaW9uSWRGb3JQaWQocGlkOiBudW1iZXIpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgcmVnaXN0cnkgPSByZWFkUmVnaXN0cnkoKTtcbiAgY29uc3QgcGlkU3RyID0gU3RyaW5nKHBpZCk7XG4gIHJldHVybiByZWdpc3RyeS5zZXNzaW9uc1twaWRTdHJdPy5zZXNzaW9uSWQgPz8gbnVsbDtcbn1cblxuLyoqXG4gKiBBcHBlbmRzIGEgY29tbWl0IFNIQSB0byB0aGUgc2Vzc2lvbidzIENTViBmaWxlLiBEZWR1cGxpY2F0ZXMgU0hBcy5cbiAqIENyZWF0ZXMgZGlyZWN0b3J5IGFuZCBDU1YgZmlsZSBpZiB0aGV5IGRvbid0IGV4aXN0LlxuICpcbiAqIERlZHVwbGljYXRpb24gaXMgcmVhZC1iZWZvcmUtYXBwZW5kIHVuZGVyIGEgcGVyLXNlc3Npb24gbG9jaywgc28gY29uY3VycmVudFxuICogd3JpdGVycyBkbyBub3QgcHJvZHVjZSBkdXBsaWNhdGUgbGluZXMgZm9yIHRoZSBzYW1lIFNIQS5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiB3aG9zZSBjb21taXQgYnVmZmVyIHNob3VsZCBiZSB1cGRhdGVkLlxuICogQHBhcmFtIHNoYSAtIEZ1bGwgY29tbWl0IFNIQSB0byBhcHBlbmQuXG4gKiBAcmV0dXJucyBSZXNvbHZlcyBvbmNlIHRoZSBTSEEgaXMgcGVyc2lzdGVkIG9yIHNraXBwZWQgYXMgZHVwbGljYXRlLlxuICogQHRocm93cyBFcnJvciBvbiBsb2NrIGFjcXVpc2l0aW9uLCByZWFkLCBvciBhcHBlbmQgZmFpbHVyZXMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRDb21taXRUb1Nlc3Npb24oc2Vzc2lvbklkOiBzdHJpbmcsIHNoYTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIG1rZGlyU3luYyhnZXRDYXJkUmVwb0NvbW1pdHNEaXIoKSwgeyByZWN1cnNpdmU6IHRydWUsIG1vZGU6IDBvNzAwIH0pO1xuXG4gIGNvbnN0IGNzdkxvY2tQYXRoID0gZ2V0U2Vzc2lvbkNzdkxvY2tQYXRoKHNlc3Npb25JZCk7XG4gIGF3YWl0IGFjcXVpcmVMb2NrKGNzdkxvY2tQYXRoKTtcblxuICB0cnkge1xuICAgIGNvbnN0IGNzdlBhdGggPSBnZXRTZXNzaW9uQ3N2UGF0aChzZXNzaW9uSWQpO1xuICAgIGNvbnN0IGV4aXN0aW5nQ29tbWl0cyA9IGdldFNlc3Npb25Db21taXRzKHNlc3Npb25JZCk7XG5cbiAgICBpZiAoIWV4aXN0aW5nQ29tbWl0cy5pbmNsdWRlcyhzaGEpKSB7XG4gICAgICBhcHBlbmRGaWxlU3luYyhjc3ZQYXRoLCBgJHtzaGF9XFxuYCwgeyBtb2RlOiAwbzYwMCB9KTtcbiAgICB9XG4gIH0gZmluYWxseSB7XG4gICAgcmVsZWFzZUxvY2soY3N2TG9ja1BhdGgpO1xuICB9XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHJldHVybnMgYWxsIGNvbW1pdCBTSEFzIGZvciBhIHNlc3Npb24gZnJvbSBpdHMgQ1NWIGZpbGUuXG4gKiBSZXR1cm5zIGVtcHR5IGFycmF5IGlmIENTViBkb2Vzbid0IGV4aXN0LlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIHdob3NlIGNvbW1pdCBidWZmZXIgc2hvdWxkIGJlIHJlYWQuXG4gKiBAcmV0dXJucyBPcmRlcmVkIGxpc3Qgb2Ygbm9uLWVtcHR5IFNIQSBsaW5lcy4gUmV0dXJucyBgW11gIHdoZW4gdGhlIENTViBpcyBhYnNlbnQuXG4gKiBAdGhyb3dzIEVycm9yIG9uIHJlYWQgZmFpbHVyZSAoZXhjZXB0IGBFTk9FTlRgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNlc3Npb25Db21taXRzKHNlc3Npb25JZDogc3RyaW5nKTogc3RyaW5nW10ge1xuICB0cnkge1xuICAgIGNvbnN0IGNzdlBhdGggPSBnZXRTZXNzaW9uQ3N2UGF0aChzZXNzaW9uSWQpO1xuICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoY3N2UGF0aCwgJ3V0Zi04Jyk7XG4gICAgcmV0dXJuIGNvbnRlbnRcbiAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgIC5tYXAoKGxpbmUpID0+IGxpbmUudHJpbSgpKVxuICAgICAgLmZpbHRlcigobGluZSkgPT4gbGluZS5sZW5ndGggPiAwKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoaGFzRXJybm9Db2RlKGVycm9yLCAnRU5PRU5UJykpIHJldHVybiBbXTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgYSBQSUQgZW50cnkgZnJvbSB0aGUgcmVnaXN0cnkuXG4gKlxuICogQHBhcmFtIHBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRvIHJlbW92ZS5cbiAqIEByZXR1cm5zIFJlc29sdmVzIG9uY2UgdGhlIHJlbW92YWwgaXMgZHVyYWJseSBjb21taXR0ZWQuXG4gKiBAdGhyb3dzIEVycm9yIG9uIGxvY2sgYWNxdWlzaXRpb24gb3IgcmVnaXN0cnkgd3JpdGUgZmFpbHVyZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbW92ZVNlc3Npb25QaWQocGlkOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgZXhlY3V0ZVRyYW5zYWN0aW9uKChyZWdpc3RyeSkgPT4ge1xuICAgIGNvbnN0IHBpZFN0ciA9IFN0cmluZyhwaWQpO1xuICAgIGRlbGV0ZSByZWdpc3RyeS5zZXNzaW9uc1twaWRTdHJdO1xuICB9KTtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBzZXNzaW9uJ3MgQ1NWIGZpbGUgYW5kIGl0cyBsb2NrIGZpbGUuXG4gKiBOby1vcCBpZiBmaWxlcyBkb24ndCBleGlzdC5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiB3aG9zZSBDU1YgYXJ0aWZhY3RzIHNob3VsZCBiZSBkZWxldGVkLlxuICogQHJldHVybnMgYHZvaWRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlU2Vzc2lvbkNzdihzZXNzaW9uSWQ6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBjc3ZQYXRoID0gZ2V0U2Vzc2lvbkNzdlBhdGgoc2Vzc2lvbklkKTtcbiAgY29uc3QgY3N2TG9ja1BhdGggPSBnZXRTZXNzaW9uQ3N2TG9ja1BhdGgoc2Vzc2lvbklkKTtcblxuICB0cnkge1xuICAgIHVubGlua1N5bmMoY3N2UGF0aCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKCFoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgdGhyb3cgZXJyb3I7XG4gIH1cblxuICB0cnkge1xuICAgIHVubGlua1N5bmMoY3N2TG9ja1BhdGgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmICghaGFzRXJybm9Db2RlKGVycm9yLCAnRU5PRU5UJykpIHRocm93IGVycm9yO1xuICB9XG59XG4iLCAiLyoqXG4gKiBQcm9jZXNzLWxldmVsIGhlbHBlcnMgZm9yIGNoZWNraW5nIHByb2Nlc3MgbGl2ZW5lc3MuXG4gKlxuICogQG1vZHVsZSBsaWIvaXBjXG4gKi9cblxuLyoqXG4gKiBDaGVja3MgaWYgYSBwcm9jZXNzIGlzIGFsaXZlIHVzaW5nIGBraWxsKHBpZCwgMClgLlxuICpcbiAqIFNpZ25hbCAwIGlzIGEgbm8tb3AgcHJvYmU6IG5vIHNpZ25hbCBpcyBkZWxpdmVyZWQsIGJ1dCB0aGUga2VybmVsIHN0aWxsXG4gKiB2YWxpZGF0ZXMgdGhhdCB0aGUgdGFyZ2V0IFBJRCBleGlzdHMuIGBFUEVSTWAgaXMgdHJlYXRlZCBhcyBcImFsaXZlXCJcbiAqIGJlY2F1c2UgdGhlIHByb2Nlc3MgZXhpc3RzIGJ1dCBpcyBvd25lZCBieSBhbm90aGVyIHVzZXIuXG4gKlxuICogQHBhcmFtIHBpZCAtIFBJRCB0byBwcm9iZS4gQ2FsbGVycyB1c3VhbGx5IHBhc3MgYSB2YWx1ZSBwcmV2aW91c2x5IHJlY29yZGVkXG4gKiAgIGluIHRoZSBzZXNzaW9uIHJlZ2lzdHJ5LlxuICogQHJldHVybnMgYHRydWVgIHdoZW4gdGhlIFBJRCBzdGlsbCBleGlzdHMuIGBFUEVSTWAgaXMgdHJlYXRlZCBhcyBhbGl2ZVxuICogICBiZWNhdXNlIHBlcm1pc3Npb24gZmFpbHVyZXMgc3RpbGwgbWVhbiB0aGUgcHJvY2VzcyBpcyBwcmVzZW50LlxuICogQHRocm93cyBSZXRocm93cyB1bmV4cGVjdGVkIGBwcm9jZXNzLmtpbGxgIGZhaWx1cmVzIHNvIGNhbGxlcnMgY2FuIGZhaWwgY2xvc2VkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcm9jZXNzQWxpdmUocGlkOiBudW1iZXIpOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBwcm9jZXNzLmtpbGwocGlkLCAwKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiAnY29kZScgaW4gZXJyb3IpIHtcbiAgICAgIGNvbnN0IGNvZGUgPSAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlO1xuICAgICAgaWYgKGNvZGUgPT09ICdFU1JDSCcpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChjb2RlID09PSAnRVBFUk0nKSByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cbiIsICIvKipcbiAqIFByb2Nlc3MgdHJlZSB1dGlsaXRpZXMgZm9yIGxvY2F0aW5nIENsYXVkZSBDb2RlIGFuY2VzdG9yIHByb2Nlc3Nlcy5cbiAqXG4gKiBAbW9kdWxlIGxpYi9wcm9jZXNzLXRyZWVcbiAqL1xuXG5pbXBvcnQgeyBleGVjU3luYyB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyBiYXNlbmFtZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5cbi8qKiBNYXhpbXVtIGRlcHRoIHRvIHdhbGsgdXAgdGhlIHByb2Nlc3MgdHJlZS4gKi9cbmV4cG9ydCBjb25zdCBQUk9DRVNTX1RSRUVfTUFYX0RFUFRIID0gMTA7XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBnaXZlbiBQSUQgYmVsb25ncyB0byBhIHByb2Nlc3MgbmFtZWQgXCJjbGF1ZGVcIi5cbiAqXG4gKiBUd28tc3RlcCBtYXRjaGluZzpcbiAqIDEuIFByaW1hcnk6IGBwcyAtcCBQSUQgLW8gY29tbT1gIC0+IGJhc2VuYW1lIC0+IGNvbXBhcmUgXCJjbGF1ZGVcIiAoY2FzZS1pbnNlbnNpdGl2ZSlcbiAqIDIuIEZhbGxiYWNrOiBgcHMgLXAgUElEIC1vIGFyZ3M9YCAtPiB0ZXN0IC9cXGJjbGF1ZGVcXGIvaVxuICovXG5mdW5jdGlvbiBpc0NsYXVkZShwaWQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbW0gPSBleGVjU3luYyhgcHMgLXAgJHtwaWR9IC1vIGNvbW09YCwgeyBlbmNvZGluZzogJ3V0ZjgnIH0pLnRyaW0oKTtcbiAgICBpZiAoYmFzZW5hbWUoY29tbSkudG9Mb3dlckNhc2UoKSA9PT0gJ2NsYXVkZScpIHJldHVybiB0cnVlO1xuXG4gICAgY29uc3QgYXJncyA9IGV4ZWNTeW5jKGBwcyAtcCAke3BpZH0gLW8gYXJncz1gLCB7IGVuY29kaW5nOiAndXRmOCcgfSkudHJpbSgpO1xuICAgIHJldHVybiAvXFxiY2xhdWRlXFxiL2kudGVzdChhcmdzKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcGFyZW50IFBJRCBmb3IgYSBwcm9jZXNzLCBvciBgbnVsbGAgd2hlbiB0cmF2ZXJzYWwgc2hvdWxkIHN0b3AuXG4gKlxuICogYG51bGxgIGlzIHJldHVybmVkIGZvciBtaXNzaW5nIHByb2Nlc3NlcywgbWFsZm9ybWVkIGBwc2Agb3V0cHV0LCBhbmRcbiAqIHNlbGYtcGFyZW50aW5nIHZhbHVlcyB0aGF0IHdvdWxkIG90aGVyd2lzZSBjcmVhdGUgYSBsb29wLlxuICovXG5mdW5jdGlvbiBnZXRQYXJlbnRQaWQocGlkOiBudW1iZXIpOiBudW1iZXIgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBwcGlkU3RyID0gZXhlY1N5bmMoYHBzIC1wICR7cGlkfSAtbyBwcGlkPWAsIHsgZW5jb2Rpbmc6ICd1dGY4JyB9KS50cmltKCk7XG4gICAgY29uc3QgcGFyZW50UGlkID0gTnVtYmVyLnBhcnNlSW50KHBwaWRTdHIsIDEwKTtcbiAgICBpZiAoTnVtYmVyLmlzTmFOKHBhcmVudFBpZCkgfHwgcGFyZW50UGlkID09PSBwaWQpIHJldHVybiBudWxsO1xuICAgIHJldHVybiBwYXJlbnRQaWQ7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogV2Fsa3MgdGhlIHByb2Nlc3MgdHJlZSB1cHdhcmQgZnJvbSBgc3RhcnRQaWRgIChkZWZhdWx0OiBgcHJvY2Vzcy5wcGlkYClcbiAqIGxvb2tpbmcgZm9yIHRoZSBuZWFyZXN0IGFuY2VzdG9yIG5hbWVkIFwiY2xhdWRlXCIuXG4gKlxuICogQHBhcmFtIHN0YXJ0UGlkIC0gT3B0aW9uYWwgcm9vdCBQSUQgZm9yIHRyYXZlcnNhbC4gV2hlbiBvbWl0dGVkLCB0cmF2ZXJzYWxcbiAqICAgc3RhcnRzIGF0IHRoZSBwYXJlbnQgb2YgdGhlIGN1cnJlbnQgaG9vayBwcm9jZXNzLlxuICogQHJldHVybnMgVGhlIG5lYXJlc3QgbWF0Y2hpbmcgQ2xhdWRlIGFuY2VzdG9yIFBJRCwgb3IgYG51bGxgIHdoZW4gbm8gbWF0Y2hcbiAqICAgaXMgZm91bmQgd2l0aGluIHtAbGluayBQUk9DRVNTX1RSRUVfTUFYX0RFUFRIfS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRDbGF1ZGVQaWQoc3RhcnRQaWQ/OiBudW1iZXIpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3QgcGlkcyA9IGZpbmRBbGxDbGF1ZGVQaWRzKHN0YXJ0UGlkKTtcbiAgcmV0dXJuIHBpZHNbMF0gPz8gbnVsbDtcbn1cblxuLyoqXG4gKiBXYWxrcyB0aGUgcHJvY2VzcyB0cmVlIHVwd2FyZCBmcm9tIGBzdGFydFBpZGAgKGRlZmF1bHQ6IGBwcm9jZXNzLnBwaWRgKSBhbmRcbiAqIHJldHVybnMgKiphbGwqKiBQSURzIG5hbWVkIFwiY2xhdWRlXCIsIG9yZGVyZWQgbmVhcmVzdC1maXJzdC5cbiAqXG4gKiBVc2VmdWwgd2hlbiBtdWx0aXBsZSBDbGF1ZGUgc2Vzc2lvbnMgYXJlIG5lc3RlZCAoZS5nLiBhIFRhc2sgc3ViYWdlbnRcbiAqIHNwYXduZWQgYnkgYW4gb3V0ZXIgQ2xhdWRlKSBhbmQgdGhlIGNvcnJlY3QgY2FyZCBhc3NvY2lhdGlvbiBtYXkgYmVsb25nXG4gKiB0byBhbiBhbmNlc3RvciBmdXJ0aGVyIHVwIHRoZSB0cmVlLlxuICogSWYgQ2xhdWRlIGxhdW5jaGVkIENsYXVkZSB3aGljaCBsYXVuY2hlZCBDbGF1ZGUsIHRoaXMgcmV0dXJucyB0aGF0IGJyZWFkY3J1bWJcbiAqIHRyYWlsIG5lYXJlc3QtZmlyc3QuXG4gKlxuICogQHBhcmFtIHN0YXJ0UGlkIC0gT3B0aW9uYWwgcm9vdCBQSUQgZm9yIHRyYXZlcnNhbC4gV2hlbiBvbWl0dGVkLCB0cmF2ZXJzYWxcbiAqICAgc3RhcnRzIGF0IHRoZSBwYXJlbnQgb2YgdGhlIGN1cnJlbnQgaG9vayBwcm9jZXNzLlxuICogQHJldHVybnMgQWxsIG1hdGNoaW5nIENsYXVkZSBhbmNlc3RvciBQSURzIGRpc2NvdmVyZWQgYmVmb3JlIHRyYXZlcnNhbCBzdG9wcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxDbGF1ZGVQaWRzKHN0YXJ0UGlkPzogbnVtYmVyKTogbnVtYmVyW10ge1xuICBjb25zdCByZXN1bHRzOiBudW1iZXJbXSA9IFtdO1xuICBsZXQgcGlkID0gc3RhcnRQaWQgPz8gcHJvY2Vzcy5wcGlkO1xuXG4gIGZvciAobGV0IGRlcHRoID0gMDsgZGVwdGggPCBQUk9DRVNTX1RSRUVfTUFYX0RFUFRIOyBkZXB0aCsrKSB7XG4gICAgaWYgKHBpZCA8PSAxKSBicmVhaztcblxuICAgIGlmIChpc0NsYXVkZShwaWQpKSB7XG4gICAgICByZXN1bHRzLnB1c2gocGlkKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJlbnRQaWQgPSBnZXRQYXJlbnRQaWQocGlkKTtcbiAgICBpZiAocGFyZW50UGlkID09PSBudWxsKSBicmVhaztcbiAgICBwaWQgPSBwYXJlbnRQaWQ7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cbiIsICIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGluamVjdHMgYWN0aW9uIGFuZCB0eXBlIGhvb2sgaW5wdXRzIHZpYSBwcm9jZXNzLmVudi5cbiAqIFRoaXMgbW9kdWxlIHByb3ZpZGVzIHN0cmljdCBnZXR0ZXJzIGFuZCB0eXBlZCBleHRyYWN0b3JzIHNvIGhhbmRsZXJzIGRvIG5vdFxuICogbmVlZCB0byBwYXJzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgbWFudWFsbHkuXG4gKlxuICogVXNlIHRoZSBpbmRpdmlkdWFsIGdldHRlcnMgd2hlbiB5b3Ugb25seSBuZWVkIG9uZSB2YWx1ZTsgdXNlXG4gKiB7QGxpbmsgZXh0cmFjdEFjdGlvbklucHV0fSBvciB7QGxpbmsgZXh0cmFjdFR5cGVJbnB1dH0gd2hlbiB5b3UgbmVlZCBhIGZ1bGxcbiAqIHR5cGVkIHBheWxvYWQgZm9yIGFuIGFjdGlvbiBvciB0eXBlIGhvb2suXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25JbnB1dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMgc2V0IGJ5IHRoZSBDYXJkcyBleGVjdXRpb24gd3JhcHBlci5cbiAqXG4gKiBUaGlzIGlzIHRoZSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciBlbnYgdmFyIGtleXMgdXNlZCBieSBhY3Rpb24gYW5kIHR5cGVcbiAqIGhvb2sgcHJvY2Vzc2VzLiBLZWVwIGl0IGluIHN5bmMgd2l0aCB0aGUgd3JhcHBlciB0byBhdm9pZCBzdWJ0bGUgXCJ1bmRlZmluZWRcbiAqIGlucHV0XCIgYnVncy5cbiAqL1xuZXhwb3J0IGNvbnN0IENBUkRTX0VOVl9WQVJTID0ge1xuICAvKipcbiAgICogVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBjdXJyZW50IGNhcmQuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIENBUkRfSUQ6ICdDQVJEX0lEJyxcblxuICAvKipcbiAgICogVGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSBzZXR0aW5ncy5qc29uLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBFTlZJUk9OTUVOVDogJ0VOVklST05NRU5UJyxcblxuICAvKipcbiAgICogRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gYnV0dG9uIHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgQUNUSU9OX05BTUU6ICdBQ1RJT05fTkFNRScsXG5cbiAgLyoqXG4gICAqIENhcmQncyBleGVjdXRpb24gbW9kZSwgZGV0ZXJtaW5pbmcgVUkgaW50ZXJhY3Rpb24gbW9kZWwuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogVmFsaWQgdmFsdWVzOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnXG4gICAqL1xuICBFWEVDVVRJT05fTU9ERTogJ0VYRUNVVElPTl9NT0RFJyxcblxuICAvKipcbiAgICogQ2FyZHMgc2VydmVyIGJhc2UgVVJMIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9CQVNFX1VSTDogJ0FQSV9CQVNFX1VSTCcsXG5cbiAgLyoqXG4gICAqIEF1dGhlbnRpY2F0aW9uIHRva2VuIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9BQ0NFU1NfVE9LRU46ICdBUElfQUNDRVNTX1RPS0VOJyxcblxuICAvKipcbiAgICogQ29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogT3B0aW9uYWwuXG4gICAqL1xuICBDT0RJTkdfQUdFTlQ6ICdDT0RJTkdfQUdFTlQnLFxuXG4gIC8qKlxuICAgKiBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX05BTUU6ICdUWVBFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSdzIHZlcnNpb24gc3RyaW5nIGZyb20gc2V0dGluZ3MuanNvbiBjb25maWd1cmF0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9WRVJTSU9OOiAnVFlQRV9WRVJTSU9OJyxcblxuICAvKipcbiAgICogVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9OQU1FOiAnRklMRV9OQU1FJyxcblxuICAvKipcbiAgICogRnVsbCBwYXRoIHRvIHRoZSBmaWxlLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9QQVRIOiAnRklMRV9QQVRIJyxcblxuICAvKipcbiAgICogRmlsZSBzaXplIGluIGJ5dGVzLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9TSVpFOiAnRklMRV9TSVpFJyxcblxuICAvKipcbiAgICogU0hBMjU2IGhhc2ggb2YgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFNIQTI1NjogJ1NIQTI1NicsXG5cbiAgLyoqXG4gICAqIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIENPTlRFTlRfVFlQRTogJ0NPTlRFTlRfVFlQRScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgICh3aXRoXG4gICAqIGBFTEVDVFJPTl9SVU5fQVNfTk9ERT0xYCkuIENvbW1hbmRzIGluIHNldHRpbmdzLmpzb24gdXNlXG4gICAqIGAkVlNDT0RFX05PREVfUEFUSCAuL2Jpbi8uLi5gIHNvIHRoZXkgd29yayByZWdhcmRsZXNzIG9mXG4gICAqIHdoZXRoZXIgYG5vZGVgIGlzIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgVlNDT0RFX05PREVfUEFUSDogJ1ZTQ09ERV9OT0RFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgU09DS0VUX1BBVEg6ICdTT0NLRVRfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gYSBKU09OIGZpbGUgY29udGFpbmluZyBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZnJvbSBhIHByZXZpb3VzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuIE9wdGlvbmFsLlxuICAgKi9cbiAgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSDogJ1NXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENPTkZJR19QQVRIOiAnQ09ORklHX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFdPUktTUEFDRV9QQVRIOiAnV09SS1NQQUNFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDQVJEX1JFUE9fUEFUSDogJ0NBUkRfUkVQT19QQVRIJ1xufSBhcyBjb25zdDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW5kaXZpZHVhbCBHZXR0ZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogUmVhZHMgdGhlIGNhcmQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgYWx3YXlzIHNldHMgdGhpcyBmb3IgZXZlcnkgYWN0aW9uIGFuZCB0eXBlIGhvb2suXG4gKiBAcmV0dXJucyBUaGUgY3VycmVudCBjYXJkIElEXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfSUQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNhcmRJZCA9IGdldENhcmRJZCgpO1xuICogY29uc29sZS5sb2coYFByb2Nlc3NpbmcgY2FyZDogJHtjYXJkSWR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRJZCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfSURdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2YWx1ZSBtYXRjaGVzIHRoZSBlbnZpcm9ubWVudCBrZXkgaW4gc2V0dGluZ3MuanNvbiAoZS5nLiwgXCJkZWZhdWx0XCIsIFwic3RhZ2luZ1wiKS5cbiAqIEByZXR1cm5zIFRoZSBlbnZpcm9ubWVudCBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVOVklST05NRU5UIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZpcm9ubWVudCA9IGdldEVudmlyb25tZW50KCk7XG4gKiBjb25zb2xlLmxvZyhgRW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudmlyb25tZW50KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhY3Rpb24gYnV0dG9uIG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyB0aGUgZGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGhhbmRsZXIsIG1hdGNoaW5nXG4gKiB0aGUgYGFjdGlvbk5hbWVgIGZpZWxkIGZyb20gYGRlZmluZUFjdGlvbmAuXG4gKiBAcmV0dXJucyBUaGUgYWN0aW9uIG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQUNUSU9OX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFjdGlvbk5hbWUgPSBnZXRBY3Rpb25OYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgUnVubmluZyBhY3Rpb246ICR7YWN0aW9uTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aW9uTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZXhlY3V0aW9uIG1vZGUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogRGV0ZXJtaW5lcyB0aGUgVUkgaW50ZXJhY3Rpb24gbW9kZWwgZm9yIGFjdGlvbnMuXG4gKiBAcmV0dXJucyBUaGUgZXhlY3V0aW9uIG1vZGUgKCdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnKVxuICogQHRocm93cyBFcnJvciBpZiBFWEVDVVRJT05fTU9ERSBpcyBtaXNzaW5nLCBlbXB0eSwgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG1vZGUgPSBnZXRFeGVjdXRpb25Nb2RlKCk7XG4gKiBpZiAobW9kZSA9PT0gJ2ludGVyYWN0aXZlJykge1xuICogICAvLyBTaG93IHVzZXIgcHJvbXB0c1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeGVjdXRpb25Nb2RlKCk6ICdpbnRlcmFjdGl2ZScgfCAnYmFja2dyb3VuZCcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfWApO1xuICB9XG4gIGlmICh2YWx1ZSAhPT0gJ2ludGVyYWN0aXZlJyAmJiB2YWx1ZSAhPT0gJ2JhY2tncm91bmQnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9OiBleHBlY3RlZCAnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJywgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQVBJIGJhc2UgVVJMIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFVzZSB0aGlzIGFzIHRoZSBiYXNlIGZvciBjb25zdHJ1Y3RpbmcgQVBJIGVuZHBvaW50cy4gVGhlIFVSTCBkb2VzIG5vdCBpbmNsdWRlXG4gKiBhIHRyYWlsaW5nIHNsYXNoLlxuICogQHJldHVybnMgVGhlIEFQSSBiYXNlIFVSTFxuICogQHRocm93cyBFcnJvciBpZiBBUElfQkFTRV9VUkwgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFwaVVybCA9IGdldEFwaUJhc2VVcmwoKTtcbiAqIGNvbnN0IGVuZHBvaW50ID0gYCR7YXBpVXJsfS9jYXJkcy8ke2NhcmRJZH1gO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlCYXNlVXJsKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBhY2Nlc3MgdG9rZW4gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogQmVhcmVyIHRva2VuIHZhbGlkIGZvciB0aGUgZHVyYXRpb24gb2YgdGhpcyBhY3Rpb24gb3IgdHlwZSBob29rIGV4ZWN1dGlvbi5cbiAqIEluY2x1ZGUgaW4gQXV0aG9yaXphdGlvbiBoZWFkZXJzIHdoZW4gY2FsbGluZyB0aGUgQ2FyZHMgQVBJLlxuICogQHJldHVybnMgVGhlIEFQSSBhY2Nlc3MgdG9rZW5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0FDQ0VTU19UT0tFTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdG9rZW4gPSBnZXRBcGlBY2Nlc3NUb2tlbigpO1xuICogY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChhcGlVcmwsIHtcbiAqICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dG9rZW59YCB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQWNjZXNzVG9rZW4oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU59YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjb25maWd1cmVkIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIE9wdGlvbmFsIHZhbHVlIGZyb20gY2FyZHMuY29kaW5nQWdlbnQgc2V0dGluZy4gV2hlbiBzZXQsIGluZGljYXRlcyB3aGljaCBBSVxuICogY29kaW5nIGFzc2lzdGFudCB0aGUgdXNlciBwcmVmZXJzLiBBY3Rpb25zIGNhbiB1c2UgdGhpcyB0byBjdXN0b21pemUgYmVoYXZpb3JcbiAqIG9yIHByb21wdHMgZm9yIGRpZmZlcmVudCBhZ2VudHMuXG4gKiBAcmV0dXJucyBUaGUgY29kaW5nIGFnZW50IGlkZW50aWZpZXIsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29kaW5nQWdlbnQgPSBnZXRDb2RpbmdBZ2VudCgpO1xuICogaWYgKGNvZGluZ0FnZW50ID09PSAnY2xhdWRlJykge1xuICogICAvLyBDdXN0b21pemUgZm9yIENsYXVkZVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb2RpbmdBZ2VudCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPRElOR19BR0VOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZSBmb3IgdHlwZSBob29rcy5cbiAqXG4gKiBUaGlzIHZhbHVlIGlzIG9ubHkgcHJlc2VudCBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqIEByZXR1cm5zIFRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBUWVBFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHR5cGVOYW1lID0gZ2V0VHlwZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBUeXBlOiAke3R5cGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlIHZlcnNpb24gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2ZXJzaW9uIGNvbWVzIGZyb20gdGhlIHR5cGUgY29uZmlndXJhdGlvbiBpbiBzZXR0aW5ncy5qc29uLlxuICogQHJldHVybnMgVGhlIHZlcnNpb24gc3RyaW5nIGZyb20gdHlwZSBjb25maWdcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9WRVJTSU9OIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB2ZXJzaW9uID0gZ2V0VHlwZVZlcnNpb24oKTtcbiAqIGNvbnNvbGUubG9nKGBWZXJzaW9uOiAke3ZlcnNpb259YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVWZXJzaW9uKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgbmFtZSBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmaWxlIG5hbWUgcmVsYXRpdmUgdG8gdGhlIHR5cGUgZGlyZWN0b3J5LCBub3QgYSBmdWxsIHBhdGguXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBuYW1lIHdpdGhpbiB0aGUgdHlwZSBkaXJlY3RvcnlcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlTmFtZSA9IGdldEZpbGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgRmlsZTogJHtmaWxlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgdHlwZWQgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmdWxseSByZXNvbHZlZCBwYXRoIG9uIGRpc2sgcHJvdmlkZWQgYnkgdGhlIGV4ZWN1dGlvbiB3cmFwcGVyLlxuICogQHJldHVybnMgVGhlIGZ1bGwgcGF0aCB0byB0aGUgZmlsZVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVQYXRoID0gZ2V0RmlsZVBhdGgoKTtcbiAqIGNvbnNvbGUubG9nKGBQYXRoOiAke2ZpbGVQYXRofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIHNpemUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIHZhbHVlIGlzIHBhcnNlZCBhcyBhIGJhc2UtMTAgaW50ZWdlci5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIHNpemUgaW4gYnl0ZXNcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9TSVpFIGlzIG1pc3Npbmcgb3Igbm90IGEgbnVtYmVyXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgc2l6ZSA9IGdldEZpbGVTaXplKCk7XG4gKiBjb25zb2xlLmxvZyhgU2l6ZTogJHtzaXplfSBieXRlc2ApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlU2l6ZSgpOiBudW1iZXIge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9YCk7XG4gIH1cbiAgY29uc3Qgc2l6ZSA9IE51bWJlci5wYXJzZUludCh2YWx1ZSwgMTApO1xuICBpZiAoTnVtYmVyLmlzTmFOKHNpemUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfTogZXhwZWN0ZWQgbnVtYmVyLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHNpemU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFNIQTI1NiBoYXNoIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFVzZWZ1bCBmb3IgZGV0ZWN0aW5nIGNvbnRlbnQgY2hhbmdlcyB3aXRob3V0IHJlYWRpbmcgdGhlIGZpbGUgYWdhaW4uXG4gKiBAcmV0dXJucyBUaGUgU0hBMjU2IGhhc2ggb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgU0hBMjU2IGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBoYXNoID0gZ2V0U2hhMjU2KCk7XG4gKiBjb25zb2xlLmxvZyhgSGFzaDogJHtoYXNofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTaGEyNTYoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TSEEyNTZdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU0hBMjU2fWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgTUlNRSB0eXBlIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFByb3ZpZGVkIGZvciB0eXBlIGhvb2sgZXZlbnRzIHNvIHZhbGlkYXRvcnMgY2FuIGJyYW5jaCBvbiBjb250ZW50IHR5cGUuXG4gKiBAcmV0dXJucyBUaGUgTUlNRSB0eXBlIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTlRFTlRfVFlQRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29udGVudFR5cGUgPSBnZXRDb250ZW50VHlwZSgpO1xuICogY29uc29sZS5sb2coYENvbnRlbnQgdHlwZTogJHtjb250ZW50VHlwZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29udGVudFR5cGUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIgcGF0aCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHNldCBieSB0aGUgZXh0ZW5zaW9uIGR1cmluZyBhY3RpdmF0aW9uIGFuZCBpbmplY3RlZCBpbnRvIGFsbFxuICogc3Bhd25lZCBhY3Rpb24vaG9vayBwcm9jZXNzZXMuIENvbmZpZ3VyYXRpb24gYXV0aG9ycyBjYW4gdXNlIGl0IHRvIGludm9rZVxuICogTm9kZS5qcyB3aXRob3V0IHJlbHlpbmcgb24gdGhlIHN5c3RlbSBQQVRILlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyXG4gKiBAdGhyb3dzIEVycm9yIGlmIFZTQ09ERV9OT0RFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG5vZGVQYXRoID0gZ2V0VnNjb2RlTm9kZVBhdGgoKTtcbiAqIGV4ZWNGaWxlU3luYyhub2RlUGF0aCwgWydzY3JpcHQuanMnXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFZzY29kZU5vZGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREVfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVW5peCBkb21haW4gc29ja2V0IHBhdGggZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICpcbiAqIEByZXR1cm5zIFRoZSBzb2NrZXQgcGF0aFxuICogQHRocm93cyBFcnJvciBpZiBTT0NLRVRfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb2NrZXRQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBwYXRoIHRvIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIG9wdGlvbmFsIFx1MjAxNCByZXR1cm5zIHVuZGVmaW5lZCB3aGVuIG5vdCBzZXQgKGkuZS4sIHRoZSBhY3Rpb25cbiAqIHdhcyBub3QgcmVsYXVuY2hlZCB2aWEgc3dpdGNoVG9JbnRlcmFjdGl2ZSkuXG4gKlxuICogQHJldHVybnMgVGhlIGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgY29uZmlnIHBhdGhcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09ORklHX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgd29ya3NwYWNlIHBhdGhcbiAqIEB0aHJvd3MgRXJyb3IgaWYgV09SS1NQQUNFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29ya3NwYWNlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgVGhlIGNhcmQgcmVwbyBwYXRoXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfUkVQT19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRSZXBvUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcGFyc2VzIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBXaGVuIGBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIYCBpcyBzZXQsIHJlYWRzIHRoZSBmaWxlIGF0IHRoYXQgcGF0aFxuICogYW5kIHBhcnNlcyBpdCBhcyBKU09OLiBSZXR1cm5zIHVuZGVmaW5lZCBpZiB0aGUgZW52IHZhciBpcyBub3Qgc2V0LlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXJzZWQgZGF0YSwgb3IgdW5kZWZpbmVkIGlmIHRoZSBwYXRoIGlzIG5vdCBzZXRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGZpbGUgY2Fubm90IGJlIHJlYWQgb3IgY29udGFpbnMgaW52YWxpZCBKU09OXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKTogdW5rbm93biB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGRhdGFQYXRoID0gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk7XG4gIGlmIChkYXRhUGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGRhdGFQYXRoLCAndXRmLTgnKTtcbiAgcmV0dXJuIEpTT04ucGFyc2UoY29udGVudCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVkIElucHV0IEV4dHJhY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCBhY3Rpb24gaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBBY3Rpb25JbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhbiBhY3Rpb24gaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmNhcmRJZCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5leGVjdXRpb25Nb2RlKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFjdGlvbklucHV0KCk6IEFjdGlvbklucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGFjdGlvbk5hbWU6IGdldEFjdGlvbk5hbWUoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICBleGVjdXRpb25Nb2RlOiBnZXRFeGVjdXRpb25Nb2RlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpLFxuICAgIGNvZGluZ0FnZW50OiBnZXRDb2RpbmdBZ2VudCgpLFxuICAgIHN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhOiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKSxcbiAgICB3b3Jrc3BhY2VQYXRoOiBnZXRXb3Jrc3BhY2VQYXRoKCksXG4gICAgY2FyZFJlcG9QYXRoOiBnZXRDYXJkUmVwb1BhdGgoKVxuICB9O1xufVxuXG4vKipcbiAqIEJ1aWxkcyBhIHR5cGVkIHR5cGUgaG9vayBpbnB1dCBvYmplY3QgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogRXh0cmFjdHMgYWxsIGZpZWxkcyByZXF1aXJlZCBmb3IgdHlwZSBsaWZlY3ljbGUgaG9va3MgKHZhbGlkYXRvciwgY3JlYXRlLFxuICogdXBkYXRlLCBkZWxldGUpLlxuICpcbiAqIEByZXR1cm5zIFR5cGVkIFR5cGVIb29rSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYSB0eXBlIGhvb2sgaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0VHlwZUlucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC50eXBlTmFtZSk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5maWxlTmFtZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RUeXBlSW5wdXQoKTogVHlwZUhvb2tJbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICB0eXBlTmFtZTogZ2V0VHlwZU5hbWUoKSxcbiAgICB0eXBlVmVyc2lvbjogZ2V0VHlwZVZlcnNpb24oKSxcbiAgICBmaWxlTmFtZTogZ2V0RmlsZU5hbWUoKSxcbiAgICBmaWxlUGF0aDogZ2V0RmlsZVBhdGgoKSxcbiAgICBmaWxlU2l6ZTogZ2V0RmlsZVNpemUoKSxcbiAgICBmaWxlU2hhMjU2OiBnZXRTaGEyNTYoKSxcbiAgICBjb250ZW50VHlwZTogZ2V0Q29udGVudFR5cGUoKSxcbiAgICBhcGlCYXNlVXJsOiBnZXRBcGlCYXNlVXJsKCksXG4gICAgYXBpQWNjZXNzVG9rZW46IGdldEFwaUFjY2Vzc1Rva2VuKClcbiAgfTtcbn1cbiIsICIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZWQgYWNjZXNzIHRvIENsYXVkZSBDb2RlJ3MgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCB1dGlsaXRpZXNcbiAqIGZvciBwZXJzaXN0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcyBpbiBTZXNzaW9uU3RhcnQgaG9va3MuXG4gKlxuICogIyMgRW52aXJvbm1lbnQgVmFyaWFibGVzXG4gKlxuICogQ2xhdWRlIENvZGUgc2V0cyB0aGVzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgd2hlbiBydW5uaW5nIGhvb2tzOlxuICpcbiAqIHwgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8IEF2YWlsYWJsZSBJbiB8XG4gKiB8LS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tfFxuICogfCBgQ0xBVURFX1BST0pFQ1RfRElSYCB8IEFic29sdXRlIHBhdGggdG8gcHJvamVjdCByb290IHwgQWxsIGhvb2tzIHxcbiAqIHwgYENMQVVERV9FTlZfRklMRWAgfCBQYXRoIHRvIGZpbGUgZm9yIHBlcnNpc3RpbmcgZW52IHZhcnMgfCBTZXNzaW9uU3RhcnQgb25seSB8XG4gKiB8IGBDTEFVREVfQ09ERV9SRU1PVEVgIHwgYFwidHJ1ZVwiYCBpZiBydW5uaW5nIHJlbW90ZWx5IHwgQWxsIGhvb2tzIHxcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBnZXRQcm9qZWN0RGlyLCBwZXJzaXN0RW52VmFyLCBpc1JlbW90ZUVudmlyb25tZW50IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBHZXQgcHJvamVjdCBkaXJlY3RvcnlcbiAqIGNvbnN0IHByb2plY3REaXIgPSBnZXRQcm9qZWN0RGlyKCk7XG4gKlxuICogLy8gQ2hlY2sgaWYgcnVubmluZyByZW1vdGVseVxuICogaWYgKGlzUmVtb3RlRW52aXJvbm1lbnQoKSkge1xuICogICAvLyBIYW5kbGUgcmVtb3RlLXNwZWNpZmljIGxvZ2ljXG4gKiB9XG4gKlxuICogLy8gSW4gU2Vzc2lvblN0YXJ0IGhvb2s6IHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdwcm9kdWN0aW9uJyk7XG4gKiBwZXJzaXN0RW52VmFyKCdBUElfS0VZJywgJ3NlY3JldC1rZXknKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stZXhlY3V0aW9uLWRldGFpbHNcbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcIm5vZGU6ZnNcIjtcbi8qKlxuICogQ2xhdWRlIENvZGUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMuXG4gKlxuICogVGhlc2UgYXJlIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgdGhhdCBDbGF1ZGUgQ29kZSBzZXRzIHdoZW4gcnVubmluZyBob29rcy5cbiAqL1xuZXhwb3J0IGNvbnN0IENMQVVERV9FTlZfVkFSUyA9IHtcbiAgICAvKipcbiAgICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBwcm9qZWN0IHJvb3QgZGlyZWN0b3J5IHdoZXJlIENsYXVkZSBDb2RlIHdhcyBzdGFydGVkLlxuICAgICAqIEF2YWlsYWJsZSBpbiBhbGwgaG9va3MuXG4gICAgICovXG4gICAgUFJPSkVDVF9ESVI6IFwiQ0xBVURFX1BST0pFQ1RfRElSXCIsXG4gICAgLyoqXG4gICAgICogUGF0aCB0byBhIGZpbGUgd2hlcmUgU2Vzc2lvblN0YXJ0IGhvb2tzIGNhbiBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAgICAgKiBWYXJpYWJsZXMgd3JpdHRlbiB0byB0aGlzIGZpbGUgd2lsbCBiZSBhdmFpbGFibGUgaW4gYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcy5cbiAgICAgKiBPbmx5IGF2YWlsYWJsZSBpbiBTZXNzaW9uU3RhcnQgaG9va3MuXG4gICAgICovXG4gICAgRU5WX0ZJTEU6IFwiQ0xBVURFX0VOVl9GSUxFXCIsXG4gICAgLyoqXG4gICAgICogU2V0IHRvIFwidHJ1ZVwiIHdoZW4gcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAgICAgKiBOb3Qgc2V0IG9yIGVtcHR5IHdoZW4gcnVubmluZyBpbiBsb2NhbCBDTEkgZW52aXJvbm1lbnQuXG4gICAgICovXG4gICAgUkVNT1RFOiBcIkNMQVVERV9DT0RFX1JFTU9URVwiLFxufTtcbi8qKlxuICogR2V0cyB0aGUgQ2xhdWRlIENvZGUgcHJvamVjdCBkaXJlY3RvcnkuXG4gKlxuICogVGhpcyBpcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcHJvamVjdCByb290IHdoZXJlIENsYXVkZSBDb2RlIHdhcyBzdGFydGVkLlxuICogVGhlIHZhbHVlIGNvbWVzIGZyb20gdGhlIGBDTEFVREVfUFJPSkVDVF9ESVJgIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICogQHJldHVybnMgVGhlIHByb2plY3QgZGlyZWN0b3J5IHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqIGlmIChwcm9qZWN0RGlyKSB7XG4gKiAgIGNvbnN0IGNvbmZpZ1BhdGggPSBgJHtwcm9qZWN0RGlyfS8uY2xhdWRlL2NvbmZpZy5qc29uYDtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdERpcigpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLlBST0pFQ1RfRElSXTtcbn1cbi8qKlxuICogR2V0cyB0aGUgQ2xhdWRlIENvZGUgZW52IGZpbGUgcGF0aCBmb3IgcGVyc2lzdGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogVGhpcyBpcyBvbmx5IGF2YWlsYWJsZSBpbiBTZXNzaW9uU3RhcnQgaG9va3MuIFRoZSBwYXRoIHBvaW50cyB0byBhIGZpbGVcbiAqIHdoZXJlIHlvdSBjYW4gd3JpdGUgc2hlbGwgZXhwb3J0IHN0YXRlbWVudHMgdG8gcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIGZvciBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzIGluIHRoZSBzZXNzaW9uLlxuICogQHJldHVybnMgVGhlIGVudiBmaWxlIHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0IChub3QgYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZGaWxlID0gZ2V0RW52RmlsZVBhdGgoKTtcbiAqIGlmIChlbnZGaWxlKSB7XG4gKiAgIC8vIFdlJ3JlIGluIGEgU2Vzc2lvblN0YXJ0IGhvb2sgYW5kIGNhbiBwZXJzaXN0IGVudiB2YXJzXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ01ZX1ZBUicsICdteS12YWx1ZScpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZGaWxlUGF0aCgpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLkVOVl9GSUxFXTtcbn1cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBob29rIGlzIHJ1bm5pbmcgaW4gYSByZW1vdGUgKHdlYikgZW52aXJvbm1lbnQuXG4gKlxuICogUmVtb3RlIGVudmlyb25tZW50cyBtYXkgaGF2ZSBkaWZmZXJlbnQgY2FwYWJpbGl0aWVzIG9yIHJlc3RyaWN0aW9uc1xuICogY29tcGFyZWQgdG8gbG9jYWwgQ0xJIGVudmlyb25tZW50cy5cbiAqIEByZXR1cm5zIHRydWUgaWYgcnVubmluZyByZW1vdGVseSwgZmFsc2UgaWYgcnVubmluZyBsb2NhbGx5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzUmVtb3RlRW52aXJvbm1lbnQoKSkge1xuICogICAvLyBVc2Ugd2ViLWNvbXBhdGlibGUgYXBwcm9hY2hlc1xuICogfSBlbHNlIHtcbiAqICAgLy8gQ2FuIHVzZSBsb2NhbCBDTEkgZmVhdHVyZXNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNSZW1vdGVFbnZpcm9ubWVudCgpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLlJFTU9URV0gPT09IFwidHJ1ZVwiO1xufVxuLyoqXG4gKiBQZXJzaXN0cyBhbiBlbnZpcm9ubWVudCB2YXJpYWJsZSBmb3IgdXNlIGluIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdyaXRlcyBhIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnQgdG8gdGhlIGBDTEFVREVfRU5WX0ZJTEVgLFxuICogd2hpY2ggQ2xhdWRlIENvZGUgc291cmNlcyBiZWZvcmUgcnVubmluZyBiYXNoIGNvbW1hbmRzLiBUaGlzIGFsbG93c1xuICogU2Vzc2lvblN0YXJ0IGhvb2tzIHRvIGNvbmZpZ3VyZSB0aGUgZW52aXJvbm1lbnQgZm9yIHRoZSBlbnRpcmUgc2Vzc2lvbi5cbiAqXG4gKiAqKkltcG9ydGFudCoqOiBUaGlzIGZ1bmN0aW9uIG9ubHkgd29ya3MgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzIHdoZXJlXG4gKiBgQ0xBVURFX0VOVl9GSUxFYCBpcyBzZXQuIEluIG90aGVyIGhvb2tzLCBpdCB3aWxsIHRocm93IGFuIGVycm9yLlxuICogQHBhcmFtIG5hbWUgLSBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZVxuICogQHBhcmFtIHZhbHVlIC0gVGhlIGVudmlyb25tZW50IHZhcmlhYmxlIHZhbHVlICh3aWxsIGJlIHNoZWxsLWVzY2FwZWQpXG4gKiBAdGhyb3dzIEVycm9yIGlmIENMQVVERV9FTlZfRklMRSBpcyBub3Qgc2V0IChub3QgaW4gYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uU3RhcnRIb29rLCBzZXNzaW9uU3RhcnRPdXRwdXQsIHBlcnNpc3RFbnZWYXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCkgPT4ge1xuICogICAvLyBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgdGhlIHNlc3Npb25cbiAqICAgcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAncHJvZHVjdGlvbicpO1xuICogICBwZXJzaXN0RW52VmFyKCdBUElfS0VZJywgcHJvY2Vzcy5lbnYuTVlfQVBJX0tFWSA/PyAnZGVmYXVsdCcpO1xuICogICBwZXJzaXN0RW52VmFyKCdQQVRIJywgYCR7cHJvY2Vzcy5lbnYuUEFUSH06Li9ub2RlX21vZHVsZXMvLmJpbmApO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3BlcnNpc3RpbmctZW52aXJvbm1lbnQtdmFyaWFibGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJzaXN0RW52VmFyKG5hbWUsIHZhbHVlKSB7XG4gICAgY29uc3QgZW52RmlsZSA9IGdldEVudkZpbGVQYXRoKCk7XG4gICAgaWYgKGVudkZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZXJzaXN0RW52VmFyIGNhbiBvbmx5IGJlIHVzZWQgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLiBcIiArIFwiQ0xBVURFX0VOVl9GSUxFIGVudmlyb25tZW50IHZhcmlhYmxlIGlzIG5vdCBzZXQuXCIpO1xuICAgIH1cbiAgICAvLyBTaGVsbC1lc2NhcGUgdGhlIHZhbHVlIHRvIGhhbmRsZSBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICBjb25zdCBlc2NhcGVkVmFsdWUgPSBlc2NhcGVTaGVsbFZhbHVlKHZhbHVlKTtcbiAgICAvLyBXcml0ZSB0aGUgZXhwb3J0IHN0YXRlbWVudFxuICAgIGNvbnN0IGV4cG9ydFN0YXRlbWVudCA9IGBleHBvcnQgJHtuYW1lfT0ke2VzY2FwZWRWYWx1ZX1cXG5gO1xuICAgIGZzLmFwcGVuZEZpbGVTeW5jKGVudkZpbGUsIGV4cG9ydFN0YXRlbWVudCwgXCJ1dGYtOFwiKTtcbn1cbi8qKlxuICogUGVyc2lzdHMgbXVsdGlwbGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIGF0IG9uY2UuXG4gKlxuICogVGhpcyBpcyBhIGNvbnZlbmllbmNlIHdyYXBwZXIgYXJvdW5kIGBwZXJzaXN0RW52VmFyYCBmb3Igc2V0dGluZ1xuICogbXVsdGlwbGUgdmFyaWFibGVzIGluIGEgc2luZ2xlIGNhbGwuXG4gKiBAcGFyYW0gdmFycyAtIE9iamVjdCBtYXBwaW5nIHZhcmlhYmxlIG5hbWVzIHRvIHZhbHVlc1xuICogQHRocm93cyBFcnJvciBpZiBDTEFVREVfRU5WX0ZJTEUgaXMgbm90IHNldCAobm90IGluIGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcGVyc2lzdEVudlZhcnMoe1xuICogICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICogICBBUElfS0VZOiAnc2VjcmV0JyxcbiAqICAgREVCVUc6ICdmYWxzZSdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJzaXN0RW52VmFycyh2YXJzKSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHZhcnMpKSB7XG4gICAgICAgIHBlcnNpc3RFbnZWYXIobmFtZSwgdmFsdWUpO1xuICAgIH1cbn1cbi8qKlxuICogRXNjYXBlcyBhIHZhbHVlIGZvciBzYWZlIHVzZSBpbiBhIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnQuXG4gKlxuICogVXNlcyBzaW5nbGUgcXVvdGVzIGFuZCBlc2NhcGVzIGFueSBlbWJlZGRlZCBzaW5nbGUgcXVvdGVzLlxuICogVGhpcyBwcmV2ZW50cyBzaGVsbCBpbmplY3Rpb24gYW5kIGhhbmRsZXMgc3BlY2lhbCBjaGFyYWN0ZXJzLlxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGVzY2FwZVxuICogQHJldHVybnMgVGhlIHNoZWxsLWVzY2FwZWQgdmFsdWUgKHdpdGggcXVvdGVzKVxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZVNoZWxsVmFsdWUodmFsdWUpIHtcbiAgICAvLyBVc2Ugc2luZ2xlIHF1b3RlcyBhbmQgZXNjYXBlIGFueSBlbWJlZGRlZCBzaW5nbGUgcXVvdGVzXG4gICAgLy8gJ3ZhbHVlJyAtPiAndmFsJ1xcJyd1ZScgZm9yIHZhbHVlcyBjb250YWluaW5nIHNpbmdsZSBxdW90ZXNcbiAgICBjb25zdCBlc2NhcGVkID0gdmFsdWUucmVwbGFjZSgvJy9nLCBcIidcXFxcJydcIik7XG4gICAgcmV0dXJuIGAnJHtlc2NhcGVkfSdgO1xufVxuIiwgIi8qKlxuICogSG9vayBmYWN0b3J5IGZ1bmN0aW9ucyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZWQgZmFjdG9yeSBmdW5jdGlvbnMgZm9yIGFsbCAxMiBob29rIHR5cGVzIHRoYXQgaGFuZGxlOlxuICogLSBJbnB1dCB0eXBlIG5hcnJvd2luZyBiYXNlZCBvbiBob29rIGV2ZW50IHR5cGVcbiAqIC0gT3V0cHV0IHR5cGUgZW5mb3JjZW1lbnQgdmlhIHJldHVybiB0eXBlc1xuICogLSBFcnJvciB3cmFwcGluZyB3aXRoIGF1dG9tYXRpYyBsb2dnaW5nXG4gKiAtIExvZ2dlciBjb250ZXh0IGluamVjdGlvblxuICpcbiAqIEVhY2ggZmFjdG9yeSBhY2NlcHRzIGEgSG9va0NvbmZpZyB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXQgc2V0dGluZ3MsXG4gKiBhbmQgcmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgdGhlIHJ1bnRpbWUgaW52b2tlcyB3aGVuIHRoZSBob29rIGZpbGUgZXhlY3V0ZXMuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcHJlVG9vbFVzZUhvb2ssIHByZVRvb2xVc2VPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnUHJvY2Vzc2luZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gR2VuZXJpYyBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBob29rIGZhY3RvcnkgZnVuY3Rpb24gZm9yIGEgc3BlY2lmaWMgaG9vayB0eXBlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGludGVybmFsIGltcGxlbWVudGF0aW9uIHVzZWQgYnkgYWxsIHR5cGVkIGZhY3Rvcmllcy5cbiAqIEl0IHdyYXBzIHRoZSBoYW5kbGVyIHdpdGggZXJyb3IgY2F0Y2hpbmcgYW5kIGxvZ2dpbmcuXG4gKiBAcGFyYW0gaG9va0V2ZW50TmFtZSAtIFRoZSBob29rIGV2ZW50IG5hbWVcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb25cbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gd3JhcFxuICogQHJldHVybnMgQSB3cmFwcGVkIGhvb2sgZnVuY3Rpb25cbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVIb29rRnVuY3Rpb24oaG9va0V2ZW50TmFtZSwgY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgY29uc3QgaG9va0ZuID0gYXN5bmMgKGlucHV0LCBjb250ZXh0KSA9PiB7XG4gICAgICAgIC8vIERlbGVnYXRlIGVycm9yIGhhbmRsaW5nIHRvIHRoZSBydW50aW1lIC0ganVzdCBleGVjdXRlIHRoZSBoYW5kbGVyXG4gICAgICAgIC8vIFRoZSBydW50aW1lIHdpbGwgY2F0Y2ggZXJyb3JzLCBsb2cgdGhlbSwgYW5kIHJldHVybiBhcHByb3ByaWF0ZSBvdXRwdXRcbiAgICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZXIoaW5wdXQsIGNvbnRleHQpO1xuICAgIH07XG4gICAgLy8gQXR0YWNoIG1ldGFkYXRhIGZvciBydW50aW1lIGluc3BlY3Rpb25cbiAgICBob29rRm4uaG9va0V2ZW50TmFtZSA9IGhvb2tFdmVudE5hbWU7XG4gICAgaG9va0ZuLm1hdGNoZXIgPSBjb25maWcubWF0Y2hlcjtcbiAgICBob29rRm4udGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuICAgIHJldHVybiBob29rRm47XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVUb29sVXNlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUHJlVG9vbFVzZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdFRvb2xVc2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQb3N0VG9vbFVzZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdFRvb2xVc2VGYWlsdXJlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUG9zdFRvb2xVc2VGYWlsdXJlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBOb3RpZmljYXRpb24gSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBOb3RpZmljYXRpb24gaG9vayBoYW5kbGVyLlxuICpcbiAqIE5vdGlmaWNhdGlvbiBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgc2VuZHMgYSBub3RpZmljYXRpb24sIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gRm9yd2FyZCBub3RpZmljYXRpb25zIHRvIGV4dGVybmFsIHN5c3RlbXNcbiAqIC0gTG9nIGltcG9ydGFudCBldmVudHNcbiAqIC0gVHJpZ2dlciBjdXN0b20gYWxlcnRpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBub3RpZmljYXRpb25fdHlwZWBcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBub3RpZmljYXRpb25Ib29rLCBub3RpZmljYXRpb25PdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEZvcndhcmQgbm90aWZpY2F0aW9ucyB0byBTbGFja1xuICogZXhwb3J0IGRlZmF1bHQgbm90aWZpY2F0aW9uSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdOb3RpZmljYXRpb24gcmVjZWl2ZWQnLCB7XG4gKiAgICAgdHlwZTogaW5wdXQubm90aWZpY2F0aW9uX3R5cGUsXG4gKiAgICAgdGl0bGU6IGlucHV0LnRpdGxlXG4gKiAgIH0pO1xuICpcbiAqICAgYXdhaXQgc2VuZFNsYWNrTWVzc2FnZShpbnB1dC50aXRsZSA/PyAnTm90aWZpY2F0aW9uJywgaW5wdXQubWVzc2FnZSk7XG4gKlxuICogICByZXR1cm4gbm90aWZpY2F0aW9uT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjbm90aWZpY2F0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RpZmljYXRpb25Ib29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJOb3RpZmljYXRpb25cIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFVzZXJQcm9tcHRTdWJtaXQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBVc2VyUHJvbXB0U3VibWl0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBVc2VyUHJvbXB0U3VibWl0IGhvb2tzIGZpcmUgd2hlbiBhIHVzZXIgc3VibWl0cyBhIHByb21wdCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBBZGQgYWRkaXRpb25hbCBjb250ZXh0IG9yIGluc3RydWN0aW9uc1xuICogLSBMb2cgdXNlciBpbnRlcmFjdGlvbnNcbiAqIC0gVmFsaWRhdGUgb3IgdHJhbnNmb3JtIHByb21wdHNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHByb21wdCBzdWJtaXNzaW9uc1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHVzZXJQcm9tcHRTdWJtaXRIb29rLCB1c2VyUHJvbXB0U3VibWl0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBBZGQgcHJvamVjdCBjb250ZXh0IHRvIGV2ZXJ5IHByb21wdFxuICogZXhwb3J0IGRlZmF1bHQgdXNlclByb21wdFN1Ym1pdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuZGVidWcoJ1VzZXIgcHJvbXB0IHN1Ym1pdHRlZCcsIHsgcHJvbXB0TGVuZ3RoOiBpbnB1dC5wcm9tcHQubGVuZ3RoIH0pO1xuICpcbiAqICAgY29uc3QgcHJvamVjdENvbnRleHQgPSBhd2FpdCBnZXRQcm9qZWN0Q29udGV4dCgpO1xuICpcbiAqICAgcmV0dXJuIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQoe1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiBwcm9qZWN0Q29udGV4dFxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdXNlcnByb21wdHN1Ym1pdFxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlclByb21wdFN1Ym1pdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlVzZXJQcm9tcHRTdWJtaXRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNlc3Npb25TdGFydCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNlc3Npb25TdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU2Vzc2lvblN0YXJ0IGhvb2tzIGZpcmUgd2hlbiBhIENsYXVkZSBDb2RlIHNlc3Npb24gc3RhcnRzIG9yIHJlc3RhcnRzLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBJbml0aWFsaXplIHNlc3Npb24gc3RhdGVcbiAqIC0gSW5qZWN0IGNvbnRleHQgb3IgaW5zdHJ1Y3Rpb25zXG4gKiAtIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHNcbiAqIC0gU2V0IHVwIGxvZ2dpbmcgb3IgbW9uaXRvcmluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHNvdXJjZWAgKCdzdGFydHVwJywgJ3Jlc3VtZScsICdjbGVhcicsICdjb21wYWN0JylcbiAqXG4gKiAqKkNvbnRleHQqKjogU2Vzc2lvblN0YXJ0IGhvb2tzIHJlY2VpdmUgYW4gZXh0ZW5kZWQgY29udGV4dCB3aXRoIGBwZXJzaXN0RW52VmFyYFxuICogYW5kIGBwZXJzaXN0RW52VmFyc2AgZnVuY3Rpb25zIGZvciBzZXR0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uU3RhcnRIb29rLCBzZXNzaW9uU3RhcnRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0aGUgc2Vzc2lvblxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7IG1hdGNoZXI6ICdzdGFydHVwJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyLCBwZXJzaXN0RW52VmFyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ05ldyBzZXNzaW9uIHN0YXJ0ZWQnLCB7XG4gKiAgICAgc2Vzc2lvbklkOiBpbnB1dC5zZXNzaW9uX2lkLFxuICogICAgIGN3ZDogaW5wdXQuY3dkXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gU2V0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kc1xuICogICBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdkZXZlbG9wbWVudCcpO1xuICogICBwZXJzaXN0RW52VmFyKCdERUJVRycsICd0cnVlJyk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gU2V0IG11bHRpcGxlIGVudmlyb25tZW50IHZhcmlhYmxlcyBhdCBvbmNlXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgcGVyc2lzdEVudlZhcnMgfSkgPT4ge1xuICogICBwZXJzaXN0RW52VmFycyh7XG4gKiAgICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAqICAgICBBUElfS0VZOiAnc2VjcmV0JyxcbiAqICAgICBERUJVRzogJ2ZhbHNlJ1xuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXNzaW9uc3RhcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlc3Npb25TdGFydEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNlc3Npb25TdGFydFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2Vzc2lvbkVuZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNlc3Npb25FbmQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNlc3Npb25FbmQgaG9va3MgZmlyZSB3aGVuIGEgQ2xhdWRlIENvZGUgc2Vzc2lvbiBlbmRzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENsZWFuIHVwIHNlc3Npb24gcmVzb3VyY2VzXG4gKiAtIExvZyBzZXNzaW9uIG1ldHJpY3NcbiAqIC0gUGVyc2lzdCBzZXNzaW9uIHN0YXRlXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgcmVhc29uYCAodGhlIGV4aXQgcmVhc29uIHN0cmluZylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uRW5kSG9vaywgc2Vzc2lvbkVuZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHNlc3Npb24gZW5kIGFuZCBjbGVhbiB1cFxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvbkVuZEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU2Vzc2lvbiBlbmRlZCcsIHtcbiAqICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gKiAgICAgcmVhc29uOiBpbnB1dC5yZWFzb25cbiAqICAgfSk7XG4gKlxuICogICBhd2FpdCBjbGVhbnVwU2Vzc2lvblJlc291cmNlcyhpbnB1dC5zZXNzaW9uX2lkKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uRW5kT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbmVuZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvbkVuZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNlc3Npb25FbmRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN0b3AgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdG9wIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBpcyBhYm91dCB0byBzdG9wLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdG9wIGFuZCByZXF1aXJlIGFkZGl0aW9uYWwgYWN0aW9uXG4gKiAtIENvbmZpcm0gdGhlIHVzZXIgd2FudHMgdG8gc3RvcFxuICogLSBDbGVhbiB1cCByZXNvdXJjZXMgYmVmb3JlIHN0b3BwaW5nXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBzdG9wIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN0b3BIb29rLCBzdG9wT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBCbG9jayBzdG9wIGlmIHRoZXJlIGFyZSBwZW5kaW5nIGNoYW5nZXNcbiAqIGV4cG9ydCBkZWZhdWx0IHN0b3BIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgY29uc3QgcGVuZGluZ0NoYW5nZXMgPSBhd2FpdCBjaGVja1BlbmRpbmdDaGFuZ2VzKCk7XG4gKlxuICogICBpZiAocGVuZGluZ0NoYW5nZXMubGVuZ3RoID4gMCkge1xuICogICAgIGxvZ2dlci53YXJuKCdCbG9ja2luZyBzdG9wIGR1ZSB0byBwZW5kaW5nIGNoYW5nZXMnLCB7XG4gKiAgICAgICBjb3VudDogcGVuZGluZ0NoYW5nZXMubGVuZ3RoXG4gKiAgICAgfSk7XG4gKlxuICogICAgIHJldHVybiBzdG9wT3V0cHV0KHtcbiAqICAgICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICAgICAgcmVhc29uOiBgVGhlcmUgYXJlICR7cGVuZGluZ0NoYW5nZXMubGVuZ3RofSB1bmNvbW1pdHRlZCBjaGFuZ2VzYCxcbiAqICAgICAgIHN5c3RlbU1lc3NhZ2U6ICdQbGVhc2UgY29tbWl0IG9yIGRpc2NhcmQgY2hhbmdlcyBiZWZvcmUgc3RvcHBpbmcnXG4gKiAgICAgfSk7XG4gKiAgIH1cbiAqXG4gKiAgIGxvZ2dlci5pbmZvKCdBcHByb3Zpbmcgc3RvcCcpO1xuICogICByZXR1cm4gc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N0b3BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3BIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdG9wXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdWJhZ2VudFN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU3ViYWdlbnRTdGFydCBob29rcyBmaXJlIHdoZW4gYSBzdWJhZ2VudCAoVGFzayB0b29sKSBzdGFydHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gSW5qZWN0IGNvbnRleHQgZm9yIHRoZSBzdWJhZ2VudFxuICogLSBMb2cgc3ViYWdlbnQgaW52b2NhdGlvbnNcbiAqIC0gQ29uZmlndXJlIHN1YmFnZW50IGJlaGF2aW9yXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgYWdlbnRfdHlwZWAgKGUuZy4sICdleHBsb3JlJywgJ2NvZGViYXNlLWFuYWx5c2lzJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdWJhZ2VudFN0YXJ0SG9vaywgc3ViYWdlbnRTdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQWRkIGNvbnRleHQgZm9yIGV4cGxvcmUgc3ViYWdlbnRzXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0YXJ0SG9vayh7IG1hdGNoZXI6ICdleHBsb3JlJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0V4cGxvcmUgc3ViYWdlbnQgc3RhcnRpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRm9jdXMgb24gZmluZGluZyBwYXR0ZXJucyBhbmQgY29udmVudGlvbnMnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdWJhZ2VudHN0YXJ0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdWJhZ2VudFN0YXJ0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdGFydFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3ViYWdlbnRTdG9wIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdWJhZ2VudFN0b3AgaG9va3MgZmlyZSB3aGVuIGEgc3ViYWdlbnQgY29tcGxldGVzIG9yIHN0b3BzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdWJhZ2VudCBmcm9tIHN0b3BwaW5nXG4gKiAtIFByb2Nlc3Mgc3ViYWdlbnQgcmVzdWx0c1xuICogLSBDbGVhbiB1cCBzdWJhZ2VudCByZXNvdXJjZXNcbiAqIC0gTG9nIHN1YmFnZW50IGNvbXBsZXRpb25cbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBhZ2VudF90eXBlYCAoZS5nLiwgJ2V4cGxvcmUnLCAnY29kZWJhc2UtYW5hbHlzaXMnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN1YmFnZW50U3RvcEhvb2ssIHN1YmFnZW50U3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQmxvY2sgZXhwbG9yZSBzdWJhZ2VudHMgaWYgdGFzayBpbmNvbXBsZXRlXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0b3BIb29rKHsgbWF0Y2hlcjogJ2V4cGxvcmUnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU3ViYWdlbnQgc3RvcHBpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gQmxvY2sgaWYgdHJhbnNjcmlwdCBzaG93cyBpbmNvbXBsZXRlIHdvcmtcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RvcE91dHB1dCh7XG4gKiAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgcmVhc29uOiAnUGxlYXNlIHZlcmlmeSBleHBsb3JhdGlvbiBpcyBjb21wbGV0ZSdcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N1YmFnZW50c3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdG9wSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdG9wXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBQcmVDb21wYWN0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgUHJlQ29tcGFjdCBob29rIGhhbmRsZXIuXG4gKlxuICogUHJlQ29tcGFjdCBob29rcyBmaXJlIGJlZm9yZSBjb250ZXh0IGNvbXBhY3Rpb24gb2NjdXJzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFByZXNlcnZlIGltcG9ydGFudCBpbmZvcm1hdGlvbiBiZWZvcmUgY29tcGFjdGlvblxuICogLSBMb2cgY29tcGFjdGlvbiBldmVudHNcbiAqIC0gTW9kaWZ5IGN1c3RvbSBpbnN0cnVjdGlvbnMgZm9yIHRoZSBjb21wYWN0ZWQgY29udGV4dFxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHRyaWdnZXJgICgnbWFudWFsJywgJ2F1dG8nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHByZUNvbXBhY3RIb29rLCBwcmVDb21wYWN0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgY29tcGFjdGlvbiBldmVudHMgYW5kIHByZXNlcnZlIGNvbnRleHRcbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbnRleHQgY29tcGFjdGlvbiB0cmlnZ2VyZWQnLCB7XG4gKiAgICAgdHJpZ2dlcjogaW5wdXQudHJpZ2dlcixcbiAqICAgICBoYXNDdXN0b21JbnN0cnVjdGlvbnM6IGlucHV0LmN1c3RvbV9pbnN0cnVjdGlvbnMgIT09IG51bGxcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgICAgc3lzdGVtTWVzc2FnZTogJ1JlbWVtYmVyOiBzdHJpY3QgbW9kZSBpcyBlbmFibGVkJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gT25seSBoYW5kbGUgbWFudWFsIGNvbXBhY3Rpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHsgbWF0Y2hlcjogJ21hbnVhbCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdNYW51YWwgY29tcGFjdGlvbiByZXF1ZXN0ZWQnKTtcbiAqICAgcmV0dXJuIHByZUNvbXBhY3RPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNwcmVjb21wYWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVDb21wYWN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUHJlQ29tcGFjdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcGVybWlzc2lvblJlcXVlc3RIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQZXJtaXNzaW9uUmVxdWVzdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2V0dXAgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXR1cCBob29rIGhhbmRsZXIuXG4gKlxuICogU2V0dXAgaG9va3MgZmlyZSBkdXJpbmcgaW5pdGlhbGl6YXRpb24gb3IgbWFpbnRlbmFuY2UsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ29uZmlndXJlIGluaXRpYWwgc2Vzc2lvbiBzdGF0ZVxuICogLSBQZXJmb3JtIHNldHVwIHRhc2tzIGJlZm9yZSB0aGUgc2Vzc2lvbiBzdGFydHNcbiAqIC0gQWRkIGNvbnRleHQgZm9yIG1haW50ZW5hbmNlIG9wZXJhdGlvbnNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGB0cmlnZ2VyYCAoJ2luaXQnIG9yICdtYWludGVuYW5jZScpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2V0dXBIb29rLCBzZXR1cE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gSGFuZGxlIGFsbCBzZXR1cCBldmVudHNcbiAqIGV4cG9ydCBkZWZhdWx0IHNldHVwSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTZXR1cCB0cmlnZ2VyZWQnLCB7IHRyaWdnZXI6IGlucHV0LnRyaWdnZXIgfSk7XG4gKiAgIHJldHVybiBzZXR1cE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBPbmx5IGhhbmRsZSBpbml0aWFsaXphdGlvblxuICogZXhwb3J0IGRlZmF1bHQgc2V0dXBIb29rKHsgbWF0Y2hlcjogJ2luaXQnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnSW5pdGlhbGl6aW5nIHNlc3Npb24nKTtcbiAqICAgcmV0dXJuIHNldHVwT3V0cHV0KHtcbiAqICAgICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnU2Vzc2lvbiBpbml0aWFsaXplZCB3aXRoIGN1c3RvbSBjb25maWd1cmF0aW9uJ1xuICogICAgIH1cbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3NldHVwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNldHVwXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUZWFtbWF0ZUlkbGUgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBUZWFtbWF0ZUlkbGUgaG9vayBoYW5kbGVyLlxuICpcbiAqIFRlYW1tYXRlSWRsZSBob29rcyBmaXJlIHdoZW4gYSB0ZWFtbWF0ZSBpbiBhIHRlYW0gaXMgYWJvdXQgdG8gZ28gaWRsZSxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQXNzaWduIHdvcmsgdG8gaWRsZSB0ZWFtbWF0ZXNcbiAqIC0gTG9nIHRlYW0gYWN0aXZpdHlcbiAqIC0gQ29vcmRpbmF0ZSBtdWx0aS1hZ2VudCB3b3JrZmxvd3NcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHRlYW1tYXRlIGlkbGUgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdGVhbW1hdGVJZGxlSG9vaywgdGVhbW1hdGVJZGxlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgd2hlbiB0ZWFtbWF0ZXMgZ28gaWRsZVxuICogZXhwb3J0IGRlZmF1bHQgdGVhbW1hdGVJZGxlSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdUZWFtbWF0ZSBnb2luZyBpZGxlJywge1xuICogICAgIHRlYW1tYXRlTmFtZTogaW5wdXQudGVhbW1hdGVfbmFtZSxcbiAqICAgICB0ZWFtTmFtZTogaW5wdXQudGVhbV9uYW1lXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHRlYW1tYXRlSWRsZU91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3RlYW1tYXRlaWRsZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdGVhbW1hdGVJZGxlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVGVhbW1hdGVJZGxlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUYXNrQ29tcGxldGVkIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVGFza0NvbXBsZXRlZCBob29rIGhhbmRsZXIuXG4gKlxuICogVGFza0NvbXBsZXRlZCBob29rcyBmaXJlIHdoZW4gYSB0YXNrIGlzIGJlaW5nIG1hcmtlZCBhcyBjb21wbGV0ZWQsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFZlcmlmeSB0YXNrIGNvbXBsZXRpb25cbiAqIC0gTG9nIHRhc2sgbWV0cmljc1xuICogLSBUcmlnZ2VyIGZvbGxvdy11cCBhY3Rpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCB0YXNrIGNvbXBsZXRpb24gZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdGFza0NvbXBsZXRlZEhvb2ssIHRhc2tDb21wbGV0ZWRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyB0YXNrIGNvbXBsZXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHRhc2tDb21wbGV0ZWRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Rhc2sgY29tcGxldGVkJywge1xuICogICAgIHRhc2tJZDogaW5wdXQudGFza19pZCxcbiAqICAgICB0YXNrU3ViamVjdDogaW5wdXQudGFza19zdWJqZWN0XG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHRhc2tDb21wbGV0ZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN0YXNrY29tcGxldGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0YXNrQ29tcGxldGVkSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVGFza0NvbXBsZXRlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuIiwgIi8qKlxuICogTG9nZ2VyIHN5c3RlbSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgc3RydWN0dXJlZCBsb2dnaW5nIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBvcHRpb25hbCBmaWxlIG91dHB1dC5cbiAqIFRoZSBsb2dnZXIgaXMgKipzaWxlbnQgYnkgZGVmYXVsdCoqIHRvIGF2b2lkIGludGVyZmVyaW5nIHdpdGggaG9vayBwcm90b2NvbFxuICogKHN0ZG91dCBpcyByZXNlcnZlZCBmb3IgSlNPTiByZXNwb25zZXMsIHN0ZGVyciBtYXkgY29uZmxpY3Qgd2l0aCBDbGF1ZGUgQ29kZSkuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gbG9nIGV2ZW50c1xuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gKiAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluICR7ZXZlbnQuaG9va1R5cGV9OiAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAqIHVuc3Vic2NyaWJlKCk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBjbG9zZVN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgb3BlblN5bmMsIHdyaXRlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuLyoqXG4gKiBBbGwgbG9nIGxldmVscyBpbiBvcmRlciBvZiBzZXZlcml0eSAobG93ZXN0IHRvIGhpZ2hlc3QpLlxuICovXG5leHBvcnQgY29uc3QgTE9HX0xFVkVMUyA9IFtcImRlYnVnXCIsIFwiaW5mb1wiLCBcIndhcm5cIiwgXCJlcnJvclwiXTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBMb2dnZXIgZm9yIENsYXVkZSBDb2RlIGhvb2tzIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBmaWxlIG91dHB1dC5cbiAqXG4gKiAjIyBLZXkgQmVoYXZpb3JzXG4gKlxuICogfCBDb25maWd1cmF0aW9uIHwgQmVoYXZpb3IgfFxuICogfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS18XG4gKiB8IE5vIGNvbmZpZyAoZGVmYXVsdCkgfCAqKlNpbGVudCoqIC0gbm8gb3V0cHV0IGFueXdoZXJlIHxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCBlbnYgdmFyIHwgQXBwZW5kIEpTT04gbGluZXMgdG8gZmlsZSB8XG4gKiB8IGAub24obGV2ZWwsIGhhbmRsZXIpYCByZWdpc3RlcmVkIHwgRXZlbnRzIGRlbGl2ZXJlZCB0byBoYW5kbGVycyBvbmx5IHxcbiAqIHwgTXVsdGlwbGUgZGVzdGluYXRpb25zIHwgQWxsIGRlc3RpbmF0aW9ucyByZWNlaXZlIGV2ZW50cyB8XG4gKlxuICogIyMgSW1wb3J0YW50IE5vdGVzXG4gKlxuICogLSAqKk5ldmVyIG91dHB1dHMgdG8gc3Rkb3V0KiogKHJlc2VydmVkIGZvciBKU09OIGhvb2sgcmVzcG9uc2UpXG4gKiAtICoqTmV2ZXIgb3V0cHV0cyB0byBzdGRlcnIqKiAobWF5IGludGVyZmVyZSB3aXRoIENsYXVkZSBDb2RlIGVycm9yIGhhbmRsaW5nKVxuICogLSBGaWxlIG91dHB1dCB1c2VzIEpTT04gTGluZXMgZm9ybWF0IGZvciBlYXN5IHBhcnNpbmdcbiAqIC0gYC5vbihsZXZlbCwgaGFuZGxlcilgIHJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb25cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBldmVudHMgYXQgc3BlY2lmaWMgbGV2ZWxcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4ge1xuICogICBzZW5kQWxlcnQoZXZlbnQubWVzc2FnZSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMb2cgd2l0aGluIGEgaG9vayBoYW5kbGVyXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ0Fib3V0IHRvIHZhbGlkYXRlIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJlZCBldmVudCBoYW5kbGVycyBieSBsb2cgbGV2ZWwuXG4gICAgICovXG4gICAgaGFuZGxlcnMgPSBuZXcgTWFwKCk7XG4gICAgLyoqXG4gICAgICogRmlsZSBkZXNjcmlwdG9yIGZvciBsb2cgZmlsZSBvdXRwdXQuXG4gICAgICogTGF6aWx5IGluaXRpYWxpemVkIG9uIGZpcnN0IHdyaXRlLlxuICAgICAqL1xuICAgIGxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgLyoqXG4gICAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUsIGlmIGNvbmZpZ3VyZWQuXG4gICAgICovXG4gICAgbG9nRmlsZVBhdGggPSBudWxsO1xuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgZmlsZSBpbml0aWFsaXphdGlvbiBoYXMgYmVlbiBhdHRlbXB0ZWQuXG4gICAgICovXG4gICAgZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgLyoqXG4gICAgICogQ3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRIb29rVHlwZTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGhvb2sgaW5wdXQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRJbnB1dDtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IExvZ2dlciBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAgICogY3JlYXRpbmcgbmV3IGluc3RhbmNlcy5cbiAgICAgKiBAcGFyYW0gY29uZmlnIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvblxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIFVzZSBzaW5nbGV0b24gKHJlY29tbWVuZGVkKVxuICAgICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gICAgICpcbiAgICAgKiAvLyBPciBjcmVhdGUgY3VzdG9tIGluc3RhbmNlXG4gICAgICogY29uc3QgY3VzdG9tTG9nZ2VyID0gbmV3IExvZ2dlcih7IGxvZ0ZpbGVQYXRoOiAnL3Zhci9sb2cvaG9va3MubG9nJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzIG1hcCBmb3IgZWFjaCBsZXZlbFxuICAgICAgICBmb3IgKGNvbnN0IGxldmVsIG9mIExPR19MRVZFTFMpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlcnMuc2V0KGxldmVsLCBuZXcgU2V0KCkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNldCBsb2cgZmlsZSBwYXRoIGZyb20gY29uZmlnIG9yIGVudmlyb25tZW50XG4gICAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBjb25maWcubG9nRmlsZVBhdGggPz8gcHJvY2Vzcy5lbnYuQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEUgPz8gbnVsbDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGRldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB0aGF0IGlzIHR5cGljYWxseSBvbmx5IHVzZWZ1bFxuICAgICAqIGR1cmluZyBkZXZlbG9wbWVudCBvciB0cm91Ymxlc2hvb3RpbmcuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgZGVidWcgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmRlYnVnKCdQcm9jZXNzaW5nIHRvb2wgaW5wdXQnLCB7IHRvb2xOYW1lOiAnQmFzaCcsIGlucHV0U2l6ZTogMjU2IH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGRlYnVnKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwiZGVidWdcIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBnZW5lcmFsIG9wZXJhdGlvbmFsIGV2ZW50cyBsaWtlIGhvb2sgaW52b2NhdGlvbnMsIHN1Y2Nlc3NmdWxcbiAgICAgKiBjb21wbGV0aW9ucywgb3Igc3RhdGUgY2hhbmdlcy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBpbmZvIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci5pbmZvKCdTZXNzaW9uIHN0YXJ0ZWQnLCB7IHNvdXJjZTogJ3N0YXJ0dXAnLCBzZXNzaW9uSWQ6ICdhYmMxMjMnIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGluZm8obWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJpbmZvXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBjb25kaXRpb25zIHRoYXQgbWF5IGluZGljYXRlIGlzc3VlcyBidXQgZG9uJ3QgcHJldmVudFxuICAgICAqIG9wZXJhdGlvbiwgc3VjaCBhcyBkZXByZWNhdGVkIHBhdHRlcm5zIG9yIHBlcmZvcm1hbmNlIGNvbmNlcm5zLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIHdhcm5pbmcgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLndhcm4oJ0RlcHJlY2F0ZWQgaG9vayBwYXR0ZXJuIGRldGVjdGVkJywgeyBwYXR0ZXJuOiAnbGVnYWN5TWF0Y2hlcicgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgd2FybihtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcIndhcm5cIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZXJyb3IgY29uZGl0aW9ucyB0aGF0IHJlcXVpcmUgYXR0ZW50aW9uIGJ1dCB3ZXJlIGhhbmRsZWRcbiAgICAgKiBncmFjZWZ1bGx5LiBGb3IgZXhjZXB0aW9ucywgcHJlZmVyIHtAbGluayBsb2dFcnJvcn0uXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgZXJyb3IgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gdmFsaWRhdGUgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgcmVhc29uOiAnZW1wdHkgY29tbWFuZCcgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZXJyb3IobWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJlcnJvclwiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAgICpcbiAgICAgKiBVc2UgdGhpcyBtZXRob2Qgd2hlbiBsb2dnaW5nIGNhdWdodCBleGNlcHRpb25zIHRvIGNhcHR1cmUgdGhlIGZ1bGxcbiAgICAgKiBlcnJvciBjb250ZXh0IGluY2x1ZGluZyBuYW1lLCBtZXNzYWdlLCBzdGFjayB0cmFjZSwgYW5kIGNhdXNlIGNoYWluLlxuICAgICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBsb2dcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiB0cnkge1xuICAgICAqICAgYXdhaXQgZGFuZ2Vyb3VzT3BlcmF0aW9uKCk7XG4gICAgICogfSBjYXRjaCAoZXJyKSB7XG4gICAgICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnRmFpbGVkIHRvIGV4ZWN1dGUgZGFuZ2Vyb3VzIG9wZXJhdGlvbicsIHtcbiAgICAgKiAgICAgb3BlcmF0aW9uOiAnZGVsZXRlJyxcbiAgICAgKiAgICAgdGFyZ2V0OiAnL2ltcG9ydGFudC9maWxlLnR4dCdcbiAgICAgKiAgIH0pO1xuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBsb2dFcnJvcihlcnJvciwgbWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICBjb25zdCBlcnJvckluZm8gPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IpO1xuICAgICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgbGV2ZWw6IFwiZXJyb3JcIixcbiAgICAgICAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICAgICAgICBlcnJvcjogZXJyb3JJbmZvLFxuICAgICAgICAgICAgY29udGV4dCxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmVzIGEgaGFuZGxlciB0byBsb2cgZXZlbnRzIGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAgICpcbiAgICAgKiBUaGUgaGFuZGxlciB3aWxsIGJlIGNhbGxlZCBmb3IgZXZlcnkgbG9nIGV2ZW50IGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAgICogUmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSBjYWxsZWQgd2hlbiB0aGUgaGFuZGxlclxuICAgICAqIGlzIG5vIGxvbmdlciBuZWVkZWQuXG4gICAgICogQHBhcmFtIGxldmVsIC0gVGhlIGxvZyBsZXZlbCB0byBzdWJzY3JpYmUgdG9cbiAgICAgKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggZXZlbnRcbiAgICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIHRoZSBoYW5kbGVyXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gU3Vic2NyaWJlIHRvIGVycm9yIGV2ZW50c1xuICAgICAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICAgICAqICAgY29uc29sZS5lcnJvcihgWyR7ZXZlbnQuaG9va1R5cGV9XSAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gICAgICogICBpZiAoZXZlbnQuZXJyb3IpIHtcbiAgICAgKiAgICAgY29uc29sZS5lcnJvcihldmVudC5lcnJvci5zdGFjayk7XG4gICAgICogICB9XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAgICAgKiB1bnN1YnNjcmliZSgpO1xuICAgICAqIGBgYFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIEZvcndhcmQgdG8gZXh0ZXJuYWwgbG9nZ2luZyBsaWJyYXJ5XG4gICAgICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gICAgICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oKTtcbiAgICAgKlxuICAgICAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAgICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgb24obGV2ZWwsIGhhbmRsZXIpIHtcbiAgICAgICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGxldmVsKTtcbiAgICAgICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgIGxldmVsSGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICBsZXZlbEhhbmRsZXJzPy5kZWxldGUoaGFuZGxlcik7XG4gICAgICAgIH07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICAgKlxuICAgICAqIFRoaXMgaXMgY2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYmVmb3JlIGludm9raW5nIGhvb2sgaGFuZGxlcnMuXG4gICAgICogWW91IHR5cGljYWxseSBkb24ndCBuZWVkIHRvIGNhbGwgdGhpcyBkaXJlY3RseS5cbiAgICAgKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgdHlwZSBvZiBob29rIGJlaW5nIGV4ZWN1dGVkXG4gICAgICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgZGF0YVxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIHNldENvbnRleHQoaG9va1R5cGUsIGlucHV0KSB7XG4gICAgICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gaG9va1R5cGU7XG4gICAgICAgIHRoaXMuY3VycmVudElucHV0ID0gaW5wdXQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsZWFycyB0aGUgY3VycmVudCBob29rIGNvbnRleHQuXG4gICAgICpcbiAgICAgKiBDYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBhZnRlciBob29rIGV4ZWN1dGlvbiBjb21wbGV0ZXMuXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgY2xlYXJDb250ZXh0KCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5jdXJyZW50SW5wdXQgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENvbmZpZ3VyZXMgdGhlIGxvZyBmaWxlIHBhdGggYXQgcnVudGltZS5cbiAgICAgKlxuICAgICAqIENhbGwgdGhpcyB0byBlbmFibGUgb3IgY2hhbmdlIGZpbGUgbG9nZ2luZy4gU2V0dGluZyB0byBgbnVsbGAgZGlzYWJsZXNcbiAgICAgKiBmaWxlIGxvZ2dpbmcgKGJ1dCBkb2Vzbid0IGNsb3NlIGV4aXN0aW5nIGZpbGUgaGFuZGxlIGltbWVkaWF0ZWx5KS5cbiAgICAgKiBAcGFyYW0gZmlsZVBhdGggLSBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgb3IgbnVsbCB0byBkaXNhYmxlXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gRW5hYmxlIGZpbGUgbG9nZ2luZyBhdCBydW50aW1lXG4gICAgICogbG9nZ2VyLnNldExvZ0ZpbGUoJy92YXIvbG9nL2NsYXVkZS1ob29rcy5sb2cnKTtcbiAgICAgKlxuICAgICAqIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nXG4gICAgICogbG9nZ2VyLnNldExvZ0ZpbGUobnVsbCk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgc2V0TG9nRmlsZShmaWxlUGF0aCkge1xuICAgICAgICAvLyBDbG9zZSBleGlzdGluZyBmaWxlIGlmIG9wZW5cbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2VzIGFsbCByZXNvdXJjZXMgaGVsZCBieSB0aGUgbG9nZ2VyLlxuICAgICAqXG4gICAgICogQ2FsbCB0aGlzIGR1cmluZyBncmFjZWZ1bCBzaHV0ZG93biB0byBlbnN1cmUgYWxsIGxvZyBkYXRhIGlzIGZsdXNoZWQuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHtcbiAgICAgKiAgIGxvZ2dlci5jbG9zZSgpO1xuICAgICAqIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGNsb3NlKCkge1xuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZXJlIGFyZSBhbnkgYWN0aXZlIGhhbmRsZXJzIG9yIGRlc3RpbmF0aW9ucy5cbiAgICAgKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgaGFuZGxlcnMgYXJlIHJlZ2lzdGVyZWQgb3IgZmlsZSBsb2dnaW5nIGlzIGVuYWJsZWQuXG4gICAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICAgKi9cbiAgICBoYXNEZXN0aW5hdGlvbnMoKSB7XG4gICAgICAgIGZvciAoY29uc3QgaGFuZGxlcnMgb2YgdGhpcy5oYW5kbGVycy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKGhhbmRsZXJzLnNpemUgPiAwKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmxvZ0ZpbGVQYXRoICE9PSBudWxsO1xuICAgIH1cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8qKlxuICAgICAqIEVtaXRzIGEgbG9nIGV2ZW50LlxuICAgICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBzZXZlcml0eSBsZXZlbCBvZiB0aGUgZXZlbnRcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBsb2cgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0IGRhdGFcbiAgICAgKi9cbiAgICBlbWl0KGxldmVsLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbCxcbiAgICAgICAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERlbGl2ZXJzIGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGRlc3RpbmF0aW9ucy5cbiAgICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGRlbGl2ZXJcbiAgICAgKi9cbiAgICBkZWxpdmVyRXZlbnQoZXZlbnQpIHtcbiAgICAgICAgLy8gRGVsaXZlciB0byBldmVudCBoYW5kbGVyc1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnQubGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgaGFuZGxlciBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gV3JpdGUgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgICAgIHRoaXMud3JpdGVUb0ZpbGUoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gd3JpdGVcbiAgICAgKi9cbiAgICB3cml0ZVRvRmlsZShldmVudCkge1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIC8vIExhenkgaW5pdGlhbGl6YXRpb24gb2YgZmlsZSBoYW5kbGVcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmlsZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCA9PT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBgJHtKU09OLnN0cmluZ2lmeShldmVudCl9XFxuYDtcbiAgICAgICAgICAgIHdyaXRlU3luYyh0aGlzLmxvZ0ZpbGVGZCwgbGluZSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgd3JpdGUgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAgICAgICAvLyBUaGlzIGZvbGxvd3MgdGhlIHJpc2sgbWl0aWdhdGlvbjogXCJHcmFjZWZ1bCBkZWdyYWRhdGlvbiAtIGxvZyB3cml0ZVxuICAgICAgICAgICAgLy8gZmFpbHVyZXMgYXJlIHNpbGVudGx5IGlnbm9yZWQgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cIlxuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBsb2cgZmlsZSBmb3Igd3JpdGluZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmlsZSgpIHtcbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFbnN1cmUgZGlyZWN0b3J5IGV4aXN0c1xuICAgICAgICAgICAgY29uc3QgZGlyID0gZGlybmFtZSh0aGlzLmxvZ0ZpbGVQYXRoKTtcbiAgICAgICAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgICAgICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBPcGVuIGZpbGUgZm9yIGFwcGVuZGluZ1xuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBvcGVuU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCBcImFcIik7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgaW5pdGlhbGl6YXRpb24gZXJyb3JzXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbVxuICAgICAqIEByZXR1cm5zIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBleHRyYWN0RXJyb3JJbmZvKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBjYXVzZSBjaGFpbiBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAoZXJyb3IuY2F1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGluZm8uY2F1c2UgPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IuY2F1c2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH1cbiAgICAgICAgLy8gSGFuZGxlIG5vbi1FcnJvciB2YWx1ZXNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IFwiVW5rbm93bkVycm9yXCIsXG4gICAgICAgICAgICBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgICB9O1xuICAgIH1cbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNpbmdsZXRvbiBFeHBvcnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogVXNlIHRoaXMgc2luZ2xldG9uIGZvciBhbGwgbG9nZ2luZyB3aXRoaW4gaG9va3MuIFRoZSBsb2dnZXIgaXMgY29uZmlndXJlZFxuICogdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgc3VwcG9ydHMgZXZlbnQgc3Vic2NyaXB0aW9uIGZvciBjdXN0b21cbiAqIGRlc3RpbmF0aW9ucy5cbiAqXG4gKiAjIyBDb25maWd1cmF0aW9uXG4gKlxuICogfCBFbnZpcm9ubWVudCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHxcbiAqIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCB8IFBhdGggdG8gbG9nIGZpbGUgKEpTT04gTGluZXMgZm9ybWF0KSB8XG4gKlxuICogIyMgVXNhZ2UgaW4gSG9va3NcbiAqXG4gKiBUaGUgbG9nZ2VyIGlzIHBhc3NlZCB0byBob29rIGhhbmRsZXJzIHZpYSBjb250ZXh0IGZvciBjb252ZW5pZW5jZTpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ1ZhbGlkYXRpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gKlxuICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oeyBsZXZlbDogJ2RlYnVnJyB9KTtcbiAqXG4gKiBsb2dnZXIub24oJ2RlYnVnJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmRlYnVnKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIERpcmVjdCB1c2FnZVxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBsb2dnZXIuaW5mbygnU3RhcnRpbmcgb3BlcmF0aW9uJyk7XG4gKiBsb2dnZXIud2FybignUmVzb3VyY2UgbGltaXQgYXBwcm9hY2hpbmcnLCB7IHVzYWdlOiAwLjkgfSk7XG4gKlxuICogdHJ5IHtcbiAqICAgYXdhaXQgcmlza3lPcGVyYXRpb24oKTtcbiAqIH0gY2F0Y2ggKGVycikge1xuICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnUmlza3kgb3BlcmF0aW9uIGZhaWxlZCcpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG4iLCAiLyoqXG4gKiBPdXRwdXQgdHlwZXMgYW5kIGJ1aWxkZXJzIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlLXNhZmUgb3V0cHV0IGJ1aWxkZXIgZnVuY3Rpb25zIGZvciBhbGwgMTIgaG9vayB0eXBlcy4gRWFjaCBidWlsZGVyXG4gKiBhY2NlcHRzIG9wdGlvbnMgdGhhdCBtYXRjaCB0aGUgd2lyZSBmb3JtYXQgZXhwZWN0ZWQgYnkgQ2xhdWRlIENvZGUsIHdpdGggdHlwZXNcbiAqIGRlcml2ZWQgZnJvbSB0aGUgQ2xhdWRlIEFnZW50IFNESydzIGBTeW5jSG9va0pTT05PdXRwdXRgIHR5cGUuXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhpdCBDb2RlIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeGl0IGNvZGVzIHVzZWQgYnkgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogfCBFeGl0IENvZGUgfCBOYW1lIHwgV2hlbiBVc2VkIHwgQ2xhdWRlIENvZGUgQmVoYXZpb3IgfFxuICogfC0tLS0tLS0tLS0tfC0tLS0tLXwtLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLS0tLS0tLS18XG4gKiB8IDAgfCBTdWNjZXNzIHwgSGFuZGxlciByZXR1cm5zIG5vcm1hbGx5IHwgQ29udGludWUsIHBhcnNlIHN0ZG91dCBhcyBKU09OIHxcbiAqIHwgMSB8IEVycm9yIHwgSW52YWxpZCBpbnB1dCwgbm9uLWJsb2NraW5nIGVycm9yIHwgTm9uLWJsb2NraW5nLCBzdGRlcnIgdG8gdXNlciBvbmx5IHxcbiAqIHwgMiB8IEJsb2NrIHwgSGFuZGxlciB0aHJvd3MgT1IgYHN0b3BSZWFzb25gIHNldCB8IEJsb2NraW5nLCBzdGRlcnIgc2hvd24gdG8gQ2xhdWRlIHxcbiAqL1xuZXhwb3J0IGNvbnN0IEVYSVRfQ09ERVMgPSB7XG4gICAgLyoqIEhhbmRsZXIgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gQ2xhdWRlIENvZGUgcGFyc2VzIHN0ZG91dCBhcyBKU09OLiAqL1xuICAgIFNVQ0NFU1M6IDAsXG4gICAgLyoqIE5vbi1ibG9ja2luZyBlcnJvciBvY2N1cnJlZCAoZS5nLiwgaW52YWxpZCBpbnB1dCkuIHN0ZGVyciBzaG93biB0byB1c2VyIG9ubHkuICovXG4gICAgRVJST1I6IDEsXG4gICAgLyoqIEhhbmRsZXIgdGhyZXcgZXhjZXB0aW9uIE9SIGJsb2NraW5nIGFjdGlvbiByZXF1ZXN0ZWQuIHN0ZGVyciBzaG93biB0byBDbGF1ZGUuICovXG4gICAgQkxPQ0s6IDIsXG59O1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gT3V0cHV0IEJ1aWxkZXIgRmFjdG9yaWVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgaGF2ZSBob29rU3BlY2lmaWNPdXRwdXQgd2l0aCBhIGhvb2tFdmVudE5hbWUgZGlzY3JpbWluYXRvci5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiB7XG4gICAgICAgIGNvbnN0IHsgaG9va1NwZWNpZmljT3V0cHV0LCAuLi5yZXN0IH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCBzdGRvdXQgPSBob29rU3BlY2lmaWNPdXRwdXQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB7IC4uLnJlc3QsIGhvb2tTcGVjaWZpY091dHB1dDogeyBob29rRXZlbnROYW1lOiBob29rVHlwZSwgLi4uaG9va1NwZWNpZmljT3V0cHV0IH0gfVxuICAgICAgICAgICAgOiByZXN0O1xuICAgICAgICByZXR1cm4geyBfdHlwZTogaG9va1R5cGUsIHN0ZG91dCB9O1xuICAgIH07XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgb25seSB1c2UgQ29tbW9uT3B0aW9ucyAoc2ltcGxlIHBhc3N0aHJvdWdoKS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiAoe1xuICAgICAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgICAgIHN0ZG91dDogb3B0aW9ucyxcbiAgICB9KTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCB1c2UgZGVjaXNpb24tYmFzZWQgb3B0aW9ucyAoU3RvcCwgU3ViYWdlbnRTdG9wKS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiBvcHRpb25zLFxuICAgIH0pO1xufVxuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlVG9vbFVzZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlVG9vbFVzZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdG9vbCBleGVjdXRpb25cbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnIH1cbiAqIH0pO1xuICpcbiAqIC8vIERlbnkgd2l0aCByZWFzb25cbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb246ICdkZW55JyxcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb25SZWFzb246ICdEYW5nZXJvdXMgY29tbWFuZCBkZXRlY3RlZCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQWxsb3cgd2l0aCBtb2RpZmllZCBpbnB1dFxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyxcbiAqICAgICB1cGRhdGVkSW5wdXQ6IHsgY29tbWFuZDogJ2xzIC1sYScgfVxuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcHJlVG9vbFVzZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUHJlVG9vbFVzZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBvc3RUb29sVXNlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQb3N0VG9vbFVzZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgYWZ0ZXIgYSBmaWxlIHJlYWRcbiAqIHBvc3RUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGaWxlIGNvbnRhaW5zIHNlbnNpdGl2ZSBkYXRhJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcG9zdFRvb2xVc2VPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBvc3RUb29sVXNlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdFRvb2xVc2VGYWlsdXJlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnVHJ5IHVzaW5nIGEgZGlmZmVyZW50IGFwcHJvYWNoJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQb3N0VG9vbFVzZUZhaWx1cmVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBVc2VyUHJvbXB0U3VibWl0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBVc2VyUHJvbXB0U3VibWl0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB1c2VyUHJvbXB0U3VibWl0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdUaGlzIHByb2plY3QgdXNlcyBUeXBlU2NyaXB0IHN0cmljdCBtb2RlJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdXNlclByb21wdFN1Ym1pdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiVXNlclByb21wdFN1Ym1pdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNlc3Npb25TdGFydCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU2Vzc2lvblN0YXJ0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzZXNzaW9uU3RhcnRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogSlNPTi5zdHJpbmdpZnkoeyBwcm9qZWN0OiAnbXktcHJvamVjdCcgfSlcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNlc3Npb25TdGFydE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU2Vzc2lvblN0YXJ0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2Vzc2lvbkVuZCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU2Vzc2lvbkVuZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc2Vzc2lvbkVuZE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNlc3Npb25FbmRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIlNlc3Npb25FbmRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdG9wIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0aGUgc3RvcFxuICogc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCByZWFzb25cbiAqIHN0b3BPdXRwdXQoe1xuICogICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgcmVhc29uOiAnVGhlcmUgYXJlIHVuY29tbWl0dGVkIGNoYW5nZXMnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoXCJTdG9wXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3ViYWdlbnRTdGFydCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdGFydE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc3ViYWdlbnRTdGFydE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRm9jdXMgb24gZmluZGluZyBwYXR0ZXJucydcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RhcnRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlN1YmFnZW50U3RhcnRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdWJhZ2VudFN0b3AgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN1YmFnZW50U3RvcE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQmxvY2sgd2l0aCByZWFzb25cbiAqIHN1YmFnZW50U3RvcE91dHB1dCh7XG4gKiAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICByZWFzb246ICdUYXNrIG5vdCBjb21wbGV0ZSdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdWJhZ2VudFN0b3BPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKFwiU3ViYWdlbnRTdG9wXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgTm90aWZpY2F0aW9uIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBOb3RpZmljYXRpb25PdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGFib3V0IHRoZSBub3RpZmljYXRpb25cbiAqIG5vdGlmaWNhdGlvbk91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnTm90aWZpY2F0aW9uIGZvcndhcmRlZCB0byBTbGFjayAjYWxlcnRzIGNoYW5uZWwnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFN1cHByZXNzIHRoZSBub3RpZmljYXRpb25cbiAqIG5vdGlmaWNhdGlvbk91dHB1dCh7IHN1cHByZXNzT3V0cHV0OiB0cnVlIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBub3RpZmljYXRpb25PdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIk5vdGlmaWNhdGlvblwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFByZUNvbXBhY3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFByZUNvbXBhY3RPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHByZUNvbXBhY3RPdXRwdXQoe1xuICogICBzeXN0ZW1NZXNzYWdlOiAnUmVtZW1iZXI6IHN0cmljdCBtb2RlIGlzIGVuYWJsZWQnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcHJlQ29tcGFjdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiUHJlQ29tcGFjdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBlcm1pc3Npb25SZXF1ZXN0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQZXJtaXNzaW9uUmVxdWVzdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQXV0by1hcHByb3ZlXG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7IGJlaGF2aW9yOiAnYWxsb3cnIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1hcHByb3ZlIHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHtcbiAqICAgICAgIGJlaGF2aW9yOiAnYWxsb3cnLFxuICogICAgICAgdXBkYXRlZElucHV0OiB7IGZpbGVfcGF0aDogJy9zYWZlL3BhdGgnIH1cbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEF1dG8tZGVueVxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdkZW55JyxcbiAqICAgICAgIG1lc3NhZ2U6ICdOb3QgYWxsb3dlZCcsXG4gKiAgICAgICBpbnRlcnJ1cHQ6IHRydWVcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEZhbGwgdGhyb3VnaCB0byBub3JtYWwgcHJvbXB0XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQZXJtaXNzaW9uUmVxdWVzdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNldHVwIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXR1cE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgZHVyaW5nIHNldHVwXG4gKiBzZXR1cE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnUHJvamVjdCBpbml0aWFsaXplZCB3aXRoIGN1c3RvbSBzZXR0aW5ncydcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU2ltcGxlIHBhc3N0aHJvdWdoXG4gKiBzZXR1cE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNldHVwT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJTZXR1cFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFRlYW1tYXRlSWRsZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVGVhbW1hdGVJZGxlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB0ZWFtbWF0ZUlkbGVPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB0ZWFtbWF0ZUlkbGVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIlRlYW1tYXRlSWRsZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFRhc2tDb21wbGV0ZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFRhc2tDb21wbGV0ZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHRhc2tDb21wbGV0ZWRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB0YXNrQ29tcGxldGVkT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJUYXNrQ29tcGxldGVkXCIpO1xuIiwgIi8qKlxuICogUnVudGltZSBtb2R1bGUgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIEhhbmRsZXMgc3RkaW4vc3Rkb3V0L2V4aXQgY29kZSBzZW1hbnRpY3MgZm9yIGNvbXBpbGVkIGhvb2sgZXhlY3V0aW9uLlxuICogVGhpcyBtb2R1bGUgaXMgdGhlIGNvcmUgb3JjaGVzdHJhdG9yIHRoYXQ6XG4gKiAtIFJlYWRzIEpTT04gZnJvbSBzdGRpbiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAtIEludm9rZXMgdGhlIGhvb2sgaGFuZGxlclxuICogLSBXcml0ZXMgb3V0cHV0IHRvIHN0ZG91dFxuICogLSBNYW5hZ2VzIGV4aXQgY29kZXNcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBhIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCBteUhvb2sgZnJvbSAnLi9teS1ob29rLmpzJztcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IGZyb20gXCIuL2Vudi5qc1wiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vbG9nZ2VyLmpzXCI7XG5pbXBvcnQgeyBFWElUX0NPREVTIH0gZnJvbSBcIi4vb3V0cHV0cy5qc1wiO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RkaW4vU3Rkb3V0IEhhbmRsaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIFJlYWRzIGFsbCBkYXRhIGZyb20gc3RkaW4uXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tcGxldGUgc3RkaW4gY29udGVudFxuICovXG5hc3luYyBmdW5jdGlvbiByZWFkU3RkaW4oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgICAgIC8vIFNldCBlbmNvZGluZyBmaXJzdCB0byBlbnN1cmUgZGF0YSBldmVudHMgcmVjZWl2ZSBzdHJpbmdzXG4gICAgICAgIHByb2Nlc3Muc3RkaW4uc2V0RW5jb2RpbmcoXCJ1dGYtOFwiKTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoY2h1bmtzLmpvaW4oXCJcIikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG4vKipcbiAqIFBhcnNlcyBzdGRpbiBKU09OIGlucHV0LlxuICogQHBhcmFtIHN0ZGluQ29udGVudCAtIFJhdyBzdGRpbiBjb250ZW50XG4gKiBAcmV0dXJucyBQYXJzZWQgaW5wdXQgKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogQHRocm93cyBFcnJvciBpZiBKU09OIGlzIG1hbGZvcm1lZFxuICovXG5mdW5jdGlvbiBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KSB7XG4gICAgLy8gUGFyc2UgSlNPTiAtIGlucHV0IHVzZXMgd2lyZSBmb3JtYXQgKHNuYWtlX2Nhc2UpIGRpcmVjdGx5XG4gICAgY29uc3QgcmF3SW5wdXQgPSBKU09OLnBhcnNlKHN0ZGluQ29udGVudCk7XG4gICAgcmV0dXJuIHJhd0lucHV0O1xufVxuLyoqXG4gKiBXcml0ZXMgaG9vayBvdXRwdXQgdG8gc3Rkb3V0LlxuICpcbiAqIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSBrZXlzIHBlciBDbGF1ZGUgQ29kZSBob29rIHNwZWNpZmljYXRpb24uXG4gKiBAcGFyYW0gb3V0cHV0IC0gVGhlIGhvb2sgb3V0cHV0IHRvIHdyaXRlXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1vdXRwdXQtc3RydWN0dXJlXG4gKi9cbmZ1bmN0aW9uIHdyaXRlU3Rkb3V0KG91dHB1dCkge1xuICAgIC8vIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSAtIG5vIHRyYW5zZm9ybWF0aW9uIG5lZWRlZFxuICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEpTT04uc3RyaW5naWZ5KG91dHB1dCkpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXJyb3IgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBlcnJvciBvdXRwdXQgZm9yIG1hbGZvcm1lZCBzdGRpbiBKU09OLlxuICogQHBhcmFtIGVycm9yIC0gVGhlIHBhcnNlIGVycm9yXG4gKiBAcmV0dXJucyBIb29rT3V0cHV0IHdpdGggZW1wdHkgc3Rkb3V0XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKSB7XG4gICAgbG9nZ2VyLmVycm9yKGBJbnZhbGlkIEpTT04gaW5wdXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIHJldHVybiB7IHN0ZG91dDoge30gfTtcbn1cbi8qKlxuICogV3JpdGVzIGhhbmRsZXIgZXJyb3Igc3RhY2t0cmFjZSB0byBzdGRlcnIgYW5kIGV4aXRzIHdpdGggY29kZSAyLlxuICpcbiAqIFdoZW4gYSBob29rIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbjpcbiAqIC0gU3RhY2t0cmFjZSAod2l0aCBzb3VyY2VtYXBzIGlmIGF2YWlsYWJsZSkgaXMgb3V0cHV0IHRvIHN0ZGVyclxuICogLSBQcm9jZXNzIGV4aXRzIHdpdGggY29kZSAyIChCTE9DSylcbiAqIC0gTm8gSlNPTiBpcyBvdXRwdXQgdG8gc3Rkb3V0XG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIGJ5IHRoZSBoYW5kbGVyXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcikge1xuICAgIC8vIFdyaXRlIHN0YWNrIHRyYWNlIHRvIHN0ZGVyciAoc291cmNlbWFwcyBhcmUgYXBwbGllZCBhdXRvbWF0aWNhbGx5IGJ5IE5vZGUuanMpXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZX1cXG5gKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke1N0cmluZyhlcnJvcil9XFxuYCk7XG4gICAgfVxuICAgIC8vIExvZyB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICBsb2dnZXIuZXJyb3IoYEhvb2sgaGFuZGxlciBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHQgYW5kIGNsb3NlXG4gICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgIGxvZ2dlci5jbG9zZSgpO1xuICAgIC8vIEV4aXQgd2l0aCBjb2RlIDIgKEJMT0NLKSAtIG5vIEpTT04gb3V0cHV0XG4gICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuQkxPQ0spO1xufVxuLyoqXG4gKiBDb252ZXJ0cyBhIFNwZWNpZmljSG9va091dHB1dCB0byBIb29rT3V0cHV0IGZvciB3aXJlIGZvcm1hdC5cbiAqXG4gKiBTcGVjaWZpY0hvb2tPdXRwdXQgdHlwZXMgaGF2ZTogeyBfdHlwZSwgZXhpdENvZGUsIHN0ZG91dCwgc3RkZXJyPyB9XG4gKiBIb29rT3V0cHV0IGhhczogeyBleGl0Q29kZSwgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqXG4gKiBTaW5jZSBvdXRwdXQgYnVpbGRlcnMgbm93IHByb2R1Y2Ugd2lyZS1mb3JtYXQgZGlyZWN0bHksIHRoaXMgZnVuY3Rpb25cbiAqIHNpbXBseSBzdHJpcHMgdGhlIGBfdHlwZWAgZGlzY3JpbWluYXRvciBmaWVsZC5cbiAqIEBwYXJhbSBzcGVjaWZpY091dHB1dCAtIFRoZSBzcGVjaWZpYyBvdXRwdXQgZnJvbSBhIGhvb2sgaGFuZGxlclxuICogQHJldHVybnMgSG9va091dHB1dCByZWFkeSBmb3Igc2VyaWFsaXphdGlvblxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gcHJlVG9vbFVzZU91dHB1dCh7IGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfSB9KTtcbiAqIGNvbnN0IGhvb2tPdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAqIC8vIGhvb2tPdXRwdXQ6IHsgZXhpdENvZGU6IDAsIHN0ZG91dDogeyBob29rU3BlY2lmaWNPdXRwdXQ6IHsgLi4uIH0gfSB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpIHtcbiAgICByZXR1cm4geyBzdGRvdXQ6IHNwZWNpZmljT3V0cHV0LnN0ZG91dCB9O1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhlY3V0ZSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeGVjdXRlcyBhIGhvb2sgaGFuZGxlciB3aXRoIGZ1bGwgcnVudGltZSBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgdGhhdCBjb21waWxlZCBob29rcyB1c2UuIFdoZW4gYSBjb21waWxlZCBob29rXG4gKiBydW5zIGFzIGEgQ0xJOlxuICpcbiAqIDEuIFJlYWRzIGFsbCBzdGRpblxuICogMi4gUGFyc2VzIEpTT04gKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogMy4gU2V0cyB1cCBsb2dnZXIgY29udGV4dCAoaG9va1R5cGUsIGlucHV0KVxuICogNC4gQ2FsbHMgaGFuZGxlciB3aXRoIGlucHV0IGFuZCBjb250ZXh0IChsb2dnZXIpXG4gKiA1LiBIYW5kbGVzIGFueSBlcnJvcnMsIGxvZ3MgdGhlbVxuICogNi4gV3JpdGVzIEpTT04gdG8gc3Rkb3V0XG4gKiA3LiBDbG9zZXMgbG9nZ2VyXG4gKiA4LiBFeGl0cyB3aXRoIGFwcHJvcHJpYXRlIGNvZGVcbiAqIEBwYXJhbSBob29rRm4gLSBUaGUgaG9vayBmdW5jdGlvbiB0byBleGVjdXRlIChmcm9tIGhvb2sgZmFjdG9yeSlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBjb21waWxlZCBob29rIGZpbGVcbiAqIGltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvcnVudGltZSc7XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogY29uc3QgbXlIb29rID0gcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKlxuICogZXhlY3V0ZShteUhvb2spO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUoaG9va0ZuKSB7XG4gICAgbGV0IG91dHB1dDtcbiAgICB0cnkge1xuICAgICAgICAvLyBDaGVjayBmb3IgbG9nIGZpbGUgY29uZmlndXJhdGlvbiBjb25mbGljdHNcbiAgICAgICAgLy8gQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFIGlzIGluamVjdGVkIGJ5IHRoZSBDTEkgLS1sb2cgcGFyYW1ldGVyXG4gICAgICAgIC8vIENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFIGlzIHRoZSB1c2VyJ3MgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAgICAgICAgY29uc3QgY2xpTG9nRmlsZSA9IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0NMSV9MT0dfRklMRTtcbiAgICAgICAgY29uc3QgZW52TG9nRmlsZSA9IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFO1xuICAgICAgICBpZiAoY2xpTG9nRmlsZSAhPT0gdW5kZWZpbmVkICYmIGVudkxvZ0ZpbGUgIT09IHVuZGVmaW5lZCAmJiBjbGlMb2dGaWxlICE9PSBlbnZMb2dGaWxlKSB7XG4gICAgICAgICAgICAvLyBXcml0ZSBlcnJvciB0byBzdGRlcnIgYW5kIGV4aXQgd2l0aCBlcnJvciBjb2RlXG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgTG9nIGZpbGUgY29uZmlndXJhdGlvbiBjb25mbGljdDogQ0xJIC0tbG9nPVwiJHtjbGlMb2dGaWxlfVwiIHZzIENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFPVwiJHtlbnZMb2dGaWxlfVwiLiBgICtcbiAgICAgICAgICAgICAgICBcIlVzZSBvbmx5IG9uZSBtZXRob2QgdG8gY29uZmlndXJlIGhvb2sgbG9nZ2luZy5cXG5cIik7XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgQ0xJIGxvZyBmaWxlIGlzIHNldCwgY29uZmlndXJlIHRoZSBsb2dnZXJcbiAgICAgICAgaWYgKGNsaUxvZ0ZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbG9nZ2VyLnNldExvZ0ZpbGUoY2xpTG9nRmlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVhZCBhbmQgcGFyc2Ugc3RkaW5cbiAgICAgICAgbGV0IHN0ZGluQ29udGVudDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHN0ZGluQ29udGVudCA9IGF3YWl0IHJlYWRTdGRpbigpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVycm9yLCBcIkZhaWxlZCB0byByZWFkIHN0ZGluXCIpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFBhcnNlIGFuZCB0cmFuc2Zvcm0gaW5wdXRcbiAgICAgICAgbGV0IGlucHV0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaW5wdXQgPSBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2dFcnJvcihlcnJvciwgXCJGYWlsZWQgdG8gcGFyc2Ugc3RkaW4gSlNPTlwiKTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgbG9nZ2VyIGNvbnRleHRcbiAgICAgICAgY29uc3QgaG9va0V2ZW50TmFtZSA9IGhvb2tGbi5ob29rRXZlbnROYW1lO1xuICAgICAgICBsb2dnZXIuc2V0Q29udGV4dChob29rRXZlbnROYW1lLCBpbnB1dCk7XG4gICAgICAgIC8vIEJ1aWxkIGNvbnRleHQgLSBTZXNzaW9uU3RhcnQgaG9va3MgZ2V0IGV4dGVuZGVkIGNvbnRleHQgd2l0aCBwZXJzaXN0RW52VmFyXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBob29rRXZlbnROYW1lID09PSBcIlNlc3Npb25TdGFydFwiID8geyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIsIHBlcnNpc3RFbnZWYXJzIH0gOiB7IGxvZ2dlciB9O1xuICAgICAgICAvLyBFeGVjdXRlIGhhbmRsZXJcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gYXdhaXQgaG9va0ZuKGlucHV0LCBjb250ZXh0KTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gSGFuZGxlciB0aHJldyAtIG91dHB1dCBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdCB3aXRoIGNvZGUgMlxuICAgICAgICAgICAgLy8gVGhpcyBjYWxsIG5ldmVyIHJldHVybnMgKHByb2Nlc3MuZXhpdClcbiAgICAgICAgICAgIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZmluYWxseSB7XG4gICAgICAgIC8vIFdyaXRlIG91dHB1dCBpZiB3ZSBoYXZlIGl0XG4gICAgICAgIGlmIChvdXRwdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgd3JpdGVTdGRvdXQob3V0cHV0LnN0ZG91dCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHRcbiAgICAgICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgICAgICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgICAgLy8gRXhpdCB3aXRoIHN1Y2Nlc3MgKGhhbmRsZXIgZXJyb3JzIGV4aXQgdmlhIGhhbmRsZUhhbmRsZXJFcnJvciB3aXRoIGNvZGUgMilcbiAgICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfVxufVxuIiwgInByb2Nlc3MuZW52WydDTEFVREVfQ09ERV9IT09LU19DTElfTE9HX0ZJTEUnXSA9IFwiL3dvcmtzcGFjZS8uY2FyZHMvbG9ncy9ydW50aW1lLWhvb2tzLmxvZ1wiO1xuXG5pbXBvcnQgaG9vayBmcm9tICcuL3N0b3AudHMnO1xuaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9ydW50aW1lLmpzJztcblxuZXhlY3V0ZShob29rKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFlQSxTQUFTLG9CQUFvQjs7O0FDQzdCO0FBQUEsRUFDRTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxPQUNLO0FBQ1AsU0FBUyxlQUFlO0FBQ3hCLFNBQVMsWUFBWTs7O0FDUmQsU0FBUyxlQUFlLEtBQXNCO0FBQ25ELE1BQUk7QUFDRixZQUFRLEtBQUssS0FBSyxDQUFDO0FBQ25CLFdBQU87QUFBQSxFQUNULFNBQVMsT0FBTztBQUNkLFFBQUksaUJBQWlCLFNBQVMsVUFBVSxPQUFPO0FBQzdDLFlBQU0sT0FBUSxNQUFnQztBQUM5QyxVQUFJLFNBQVMsUUFBUyxRQUFPO0FBQzdCLFVBQUksU0FBUyxRQUFTLFFBQU87QUFBQSxJQUMvQjtBQUNBLFVBQU07QUFBQSxFQUNSO0FBQ0Y7OztBRERPLElBQU0sbUJBQW1CLEtBQUssS0FBSyxLQUFLO0FBQ3hDLElBQU0sa0JBQWtCO0FBRS9CLFNBQVMsd0JBQWdDO0FBQ3ZDLFNBQU8sS0FBSyxRQUFRLEdBQUcsVUFBVSxtQkFBbUI7QUFDdEQ7QUFFQSxTQUFTLGtCQUEwQjtBQUNqQyxTQUFPLEtBQUssc0JBQXNCLEdBQUcsV0FB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Q3pHLGFBQVcsT0FBTyxNQUFNO0FBQ3RCLFFBQUk7QUFDRixZQUFNLHNCQUFzQixXQUFXLEdBQUc7QUFBQSxJQUM1QyxTQUFTLE9BQU87QUFDZCxNQUFBQSxRQUFPLE1BQU0sd0NBQXdDLEVBQUUsS0FBSyxNQUFNLENBQUM7QUFBQSxJQUNyRTtBQUFBLEVBQ0Y7QUFDRjtBQVNBLGVBQWUsZUFBZUEsU0FBZ0IsV0FBa0M7QUFFOUUsUUFBTSxTQUFTLFFBQVEsSUFBSSxvQkFBb0I7QUFDL0MsUUFBTSxNQUFNLFNBQVMsT0FBTyxTQUFTLFFBQVEsRUFBRSxJQUFJO0FBQ25ELFFBQU0sY0FBYyxPQUFPLENBQUMsT0FBTyxNQUFNLEdBQUcsSUFBSSxNQUFNLGNBQWM7QUFFcEUsTUFBSSxhQUFhO0FBQ2YsUUFBSTtBQUNGLFlBQU0saUJBQWlCLFdBQVc7QUFDbEMsTUFBQUEsUUFBTyxLQUFLLCtCQUErQixFQUFFLEtBQUssWUFBWSxDQUFDO0FBQUEsSUFDakUsU0FBUyxPQUFPO0FBQ2QsTUFBQUEsUUFBTyxNQUFNLHVDQUF1QyxFQUFFLE1BQU0sQ0FBQztBQUFBLElBQy9EO0FBQUEsRUFDRjtBQUVBLE1BQUk7QUFDRixxQkFBaUIsU0FBUztBQUMxQixJQUFBQSxRQUFPLEtBQUssMEJBQTBCLEVBQUUsVUFBVSxDQUFDO0FBQUEsRUFDckQsU0FBUyxPQUFPO0FBQ2QsSUFBQUEsUUFBTyxNQUFNLGtDQUFrQyxFQUFFLE1BQU0sQ0FBQztBQUFBLEVBQzFEO0FBQ0Y7OztBVXpQQSxRQUFRLElBQUksZ0NBQWdDLElBQUk7QUFLaEQsUUFBUSxZQUFJOyIsCiAgIm5hbWVzIjogWyJyZWFkRmlsZVN5bmMiLCAicmVhZEZpbGVTeW5jIiwgImNsb3NlU3luYyIsICJta2RpclN5bmMiLCAib3BlblN5bmMiLCAibG9nZ2VyIl0KfQo=
