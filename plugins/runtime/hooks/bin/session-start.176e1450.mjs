#!/usr/bin/env -S node --enable-source-maps
import { createRequire as __createRequire } from "node:module";
import { fileURLToPath as __fileURLToPath } from "node:url";
import { dirname as __pathDirname } from "node:path";
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
process.env['CLAUDE_CODE_HOOKS_LOG_ENV_VAR'] = "CLAUDE_CODE_RUNTIME_HOOKS_LOG_FILE";

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
  EXTENSION_PATH: "EXTENSION_PATH",
  /**
   * Absolute path to the Cards hooks log file.
   *
   * Set by ActionDispatcher at runtime. Read by the Logger singleton
   * at construction time to determine where hook execution logs are written.
   *
   * Available in all actions and type hooks.
   */
  HOOKS_LOG_FILE: "CARDS_HOOKS_LOG_FILE"
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

// ../../../../../../../node_modules/@goodfoot/claude-code-hooks/dist/env.js
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

// ../../../../../../../node_modules/@goodfoot/claude-code-hooks/dist/hooks.js
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

// ../../../../../../../node_modules/@goodfoot/claude-code-hooks/dist/logger.js
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

// ../../../../../../../node_modules/@goodfoot/claude-code-hooks/dist/outputs.js
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

// ../../../../../../../node_modules/@goodfoot/claude-code-hooks/dist/runtime.js
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3Nlc3Npb24tc3RhcnQudHMiLCAiLi4vY2xhdWRlLWNvZGUtc2Vzc2lvbnMvc3JjL2luZGV4LnRzIiwgIi4uL2NsYXVkZS1jb2RlLXNlc3Npb25zL3NyYy9pbnRlcm5hbC50cyIsICIuLi9jbGF1ZGUtY29kZS1zZXNzaW9ucy9zcmMvaXBjLnRzIiwgIi4uL2NsYXVkZS1jb2RlLXNlc3Npb25zL3NyYy9wcm9jZXNzLXRyZWUudHMiLCAiLi4vY2xhdWRlLWNvZGUtc2Vzc2lvbnMvc3JjL2NhcmQtcmVwby50cyIsICIuLi9zZGsvc3JjL2NvbmZpZy9lbnYudHMiLCAiLi4vLi4vLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2Vudi5qcyIsICIuLi8uLi8uLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvaG9va3MuanMiLCAiLi4vLi4vLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2xvZ2dlci5qcyIsICIuLi8uLi8uLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3Qvb3V0cHV0cy5qcyIsICIuLi8uLi8uLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvcnVudGltZS5qcyIsICJzcmMvbGliL2NvbnRleHQudHMiLCAiLi4vc2RrL3NyYy9wcm90b2NvbC90eXBlcy9icmFuY2gudHMiLCAic3JjL2xpYi9maWxlLXRyZWUudHMiLCAic3JjL3Nlc3Npb24tc3RhcnQtZW50cnkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU2Vzc2lvblN0YXJ0IGhvb2sgaW1wbGVtZW50YXRpb24uXG4gKlxuICogUnVucyBhcyBhIHN1YnByb2Nlc3Mgb2YgYW4gYWN0aW9uLiBVc2VzIHtAbGluayBleHRyYWN0QWN0aW9uSW5wdXR9IHRvXG4gKiBjb25maXJtIHdlIGFyZSBpbnNpZGUgYW4gYWN0aW9uIHN1YnByb2Nlc3MgYW5kIHRvIGV4cG9zZSB0aGUgYWN0aW9uXG4gKiBwcm9jZXNzIGVudmlyb25tZW50IHZhcmlhYmxlcyB0byB0aGUgc2Vzc2lvbiBjb250ZXh0LlxuICpcbiAqIEBzdW1tYXJ5IFNlc3Npb25TdGFydCBob29rIGltcGxlbWVudGF0aW9uXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbnN0YXJ0XG4gKi9cblxuaW1wb3J0IHsgZXhlY0ZpbGVTeW5jLCBzcGF3biB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdub2RlOm9zJztcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4sIHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJztcbmltcG9ydCB7IGZpbmRDbGF1ZGVQaWQsIHJlZ2lzdGVyU2Vzc2lvbiB9IGZyb20gJ0BjYXJkcy9jbGF1ZGUtY29kZS1zZXNzaW9ucyc7XG5pbXBvcnQgeyB3cml0ZVNlc3Npb25IZWFkU2hhIH0gZnJvbSAnQGNhcmRzL2NsYXVkZS1jb2RlLXNlc3Npb25zL2NhcmQtcmVwbyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbklucHV0IH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgZXh0cmFjdEFjdGlvbklucHV0IH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgc2Vzc2lvblN0YXJ0SG9vaywgc2Vzc2lvblN0YXJ0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbmltcG9ydCB7XG4gIGJ1aWxkQWRkaXRpb25hbENvbnRleHQsXG4gIGJ1aWxkQ2FyZEJsb2NrLFxuICBidWlsZENhcmRSZXBvQmxvY2ssXG4gIGJ1aWxkQ2FyZFJlcG9Mb2dCbG9jayxcbiAgYnVpbGRXb3Jrc3BhY2VSZXBvTG9nQmxvY2tzLFxuICBDYXJkUmVwb0FjY2Vzc0Vycm9yXG59IGZyb20gJy4vbGliL2NvbnRleHQuanMnO1xuXG5leHBvcnQgeyBidWlsZENhcmRCbG9jaywgYnVpbGRDYXJkUmVwb0Jsb2NrLCBidWlsZENhcmRSZXBvTG9nQmxvY2ssIGJ1aWxkV29ya3NwYWNlUmVwb0xvZ0Jsb2NrcywgQ2FyZFJlcG9BY2Nlc3NFcnJvciB9O1xuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIFBJRC10by1zZXNzaW9uIHJlZ2lzdHJhdGlvbiBmYWlscy5cbiAqXG4gKiBXcmFwcyB0aGUgdW5kZXJseWluZyBlcnJvciB3aXRoIHRoZSBQSUQgYW5kIHNlc3Npb24gSUQgZm9yXG4gKiBzdHJ1Y3R1cmVkIGVycm9yIGhhbmRsaW5nIGluIHRoZSBzZXNzaW9uLXN0YXJ0IGhvb2suXG4gKi9cbmV4cG9ydCBjbGFzcyBTZXNzaW9uUmVnaXN0cmF0aW9uRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IG5hbWUgPSAnU2Vzc2lvblJlZ2lzdHJhdGlvbkVycm9yJztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgcGlkOiBudW1iZXIsXG4gICAgcHVibGljIHJlYWRvbmx5IHNlc3Npb25JZDogc3RyaW5nLFxuICAgIGNhdXNlOiB1bmtub3duXG4gICkge1xuICAgIGNvbnN0IHJlYXNvbiA9IGNhdXNlIGluc3RhbmNlb2YgRXJyb3IgPyBjYXVzZS5tZXNzYWdlIDogU3RyaW5nKGNhdXNlKTtcbiAgICBzdXBlcihgRmFpbGVkIHRvIHJlZ2lzdGVyIFBJRCAke3BpZH0gZm9yIHNlc3Npb24gJHtzZXNzaW9uSWR9OiAke3JlYXNvbn1gKTtcbiAgICB0aGlzLmNhdXNlID0gY2F1c2U7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgZ2l0IEhFQUQgc2hhIGZvciBhIHJlcG9zaXRvcnkgcGF0aC5cbiAqXG4gKiBSZXR1cm5zIGBudWxsYCB3aGVuIHRoZSBwYXRoIGlzIG5vdCBhIGdpdCByZXBvc2l0b3J5IG9yIGdpdCBpc1xuICogdW5hdmFpbGFibGUuIEludGVudGlvbmFsbHkgZmFpbHMgb3BlbiBzbyBob29rIGZhaWx1cmVzIGRvIG5vdCBibG9ja1xuICogQ2xhdWRlLlxuICpcbiAqIEBwYXJhbSByZXBvUGF0aCAtIFJlcG9zaXRvcnkgZGlyZWN0b3J5IHdoZXJlIGBnaXQgcmV2LXBhcnNlIEhFQURgIHNob3VsZCBydW4uXG4gKiBAcmV0dXJucyBDdXJyZW50IGBIRUFEYCBTSEEsIG9yIGBudWxsYCB3aGVuIHVuYXZhaWxhYmxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUhlYWRTaGEocmVwb1BhdGg6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBleGVjRmlsZVN5bmMoJ2dpdCcsIFsncmV2LXBhcnNlJywgJ0hFQUQnXSwge1xuICAgICAgY3dkOiByZXBvUGF0aCxcbiAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICB9KS50cmltKCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogU3Bhd25zIGEgZGV0YWNoZWQgdHJhbnNjcmlwdCB3YXRjaGVyIHByb2Nlc3MgZm9yIGNyYXNoLXJlc2lsaWVudCB0cmFuc2NyaXB0IHVwbG9hZC5cbiAqXG4gKiBUaGUgd2F0Y2hlciBtb25pdG9ycyB0aGUgQ2xhdWRlIFBJRCBhbmQgdXBsb2FkcyB0aGUgdHJhbnNjcmlwdCBpZiB0aGUgcHJvY2Vzc1xuICogZXhpdHMgd2l0aG91dCB0aGUgc2Vzc2lvbi1lbmQgaG9vayBoYXZpbmcgcnVuIChjcmFzaC9TSUdLSUxMKS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gbW9uaXRvci5cbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIGlkZW50aWZpZXIgZm9yIHRoZSB0cmFuc2NyaXB0LlxuICogQHBhcmFtIHRyYW5zY3JpcHRQYXRoIC0gUGF0aCB0byB0aGUgdHJhbnNjcmlwdCBmaWxlLlxuICogQHBhcmFtIGNhcmRJZCAtIENhcmQgaWRlbnRpZmllciBmb3IgdGhlIHVwbG9hZCB0YXJnZXQuXG4gKiBAcGFyYW0gY2FyZFJlcG9QYXRoIC0gUGF0aCB0byB0aGUgY2FyZCByZXBvc2l0b3J5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3Bhd25UcmFuc2NyaXB0V2F0Y2hlcihcbiAgcGlkOiBudW1iZXIsXG4gIHNlc3Npb25JZDogc3RyaW5nLFxuICB0cmFuc2NyaXB0UGF0aDogc3RyaW5nLFxuICBjYXJkSWQ6IHN0cmluZyxcbiAgY2FyZFJlcG9QYXRoOiBzdHJpbmdcbik6IHZvaWQge1xuICBjb25zdCB3YXRjaGVyUGF0aCA9IHJlc29sdmUoZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpLCAnLi4vLi4vYmluL3RyYW5zY3JpcHQtd2F0Y2hlci5tanMnKTtcblxuICAvLyBSZXNvbHZlIG5vZGUgZXhlY3V0YWJsZTogcHJlZmVyIFZTQ09ERV9OT0RFIGVudiB2YXIsIGZhbGxiYWNrIHRvIGZpbGUsIHRoZW4gJ25vZGUnXG4gIGxldCBub2RlQmluOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgbm9kZUJpbiA9IHByb2Nlc3MuZW52WydWU0NPREVfTk9ERSddID8/IHJlYWRGaWxlU3luYyhqb2luKGhvbWVkaXIoKSwgJy5jYXJkcycsICdWU0NPREVfTk9ERScpLCAndXRmLTgnKS50cmltKCk7XG4gIH0gY2F0Y2gge1xuICAgIG5vZGVCaW4gPSAnbm9kZSc7XG4gIH1cblxuICBjb25zdCBzcGF3bkFyZ3MgPSBbd2F0Y2hlclBhdGgsIFN0cmluZyhwaWQpLCBzZXNzaW9uSWQsIHRyYW5zY3JpcHRQYXRoLCBjYXJkSWQsIGNhcmRSZXBvUGF0aF07XG5cbiAgY29uc3QgY2hpbGQgPSBzcGF3bihub2RlQmluLCBzcGF3bkFyZ3MsIHtcbiAgICBkZXRhY2hlZDogdHJ1ZSxcbiAgICBzdGRpbzogJ2lnbm9yZSdcbiAgfSk7XG4gIGNoaWxkLnVucmVmKCk7XG59XG5cbi8qKlxuICogUmVnaXN0ZXJzIHRoZSBDbGF1ZGUgUElEIGZvciBjb21taXQgYXR0cmlidXRpb24gYW5kIHNwYXducyB0aGUgdHJhbnNjcmlwdCB3YXRjaGVyLlxuICpcbiAqIFJldHVybnMgYSBmYWlsdXJlIG91dHB1dCBpZiBQSUQgcmVnaXN0cmF0aW9uIGZhaWxzIChibG9ja2luZyksIG9yIGBudWxsYCBvblxuICogc3VjY2Vzcy4gV2F0Y2hlciBzcGF3biBmYWlsdXJlIGlzIG5vbi1mYXRhbCBhbmQgb25seSBsb2dnZWQuXG4gKlxuICogQHBhcmFtIGNsYXVkZVBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRvIHJlZ2lzdGVyIGFuZCBtb25pdG9yLlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gaWRlbnRpZmllciBmb3IgdGhlIHJlZ2lzdHJhdGlvbi5cbiAqIEBwYXJhbSB0cmFuc2NyaXB0UGF0aCAtIFBhdGggdG8gdGhlIHRyYW5zY3JpcHQgZmlsZSBmb3IgdGhlIHdhdGNoZXIuXG4gKiBAcGFyYW0gYWN0aW9uSW5wdXQgLSBQYXJzZWQgYWN0aW9uIGlucHV0IGNvbnRhaW5pbmcgY2FyZCBjb250ZXh0LlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3Igc3RydWN0dXJlZCBvdXRwdXQuXG4gKiBAcmV0dXJucyBBIHNlc3Npb24tc3RhcnQgZmFpbHVyZSBvdXRwdXQgb24gcmVnaXN0cmF0aW9uIGVycm9yLCBvciBgbnVsbGAgb24gc3VjY2Vzcy5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmVnaXN0ZXJQaWRBbmRTcGF3bldhdGNoZXIoXG4gIGNsYXVkZVBpZDogbnVtYmVyLFxuICBzZXNzaW9uSWQ6IHN0cmluZyxcbiAgdHJhbnNjcmlwdFBhdGg6IHN0cmluZyxcbiAgYWN0aW9uSW5wdXQ6IEFjdGlvbklucHV0LFxuICBsb2dnZXI6IFBhcmFtZXRlcnM8UGFyYW1ldGVyczx0eXBlb2Ygc2Vzc2lvblN0YXJ0SG9vaz5bMV0+WzFdWydsb2dnZXInXVxuKTogUHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiBzZXNzaW9uU3RhcnRPdXRwdXQ+IHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGF3YWl0IHJlZ2lzdGVyU2Vzc2lvbihjbGF1ZGVQaWQsIHNlc3Npb25JZCk7XG4gICAgbG9nZ2VyLmluZm8oJ1JlZ2lzdGVyZWQgUElEIGZvciBjb21taXQgYXR0cmlidXRpb24nLCB7IHBpZDogY2xhdWRlUGlkLCBzZXNzaW9uSWQgfSk7XG4gIH0gY2F0Y2ggKGNhdXNlKSB7XG4gICAgY29uc3QgZXJyb3IgPSBuZXcgU2Vzc2lvblJlZ2lzdHJhdGlvbkVycm9yKGNsYXVkZVBpZCwgc2Vzc2lvbklkLCBjYXVzZSk7XG4gICAgbG9nZ2VyLmVycm9yKCdTZXNzaW9uIHJlZ2lzdHJhdGlvbiBmYWlsZWQnLCB7IHBpZDogZXJyb3IucGlkLCBzZXNzaW9uSWQ6IGVycm9yLnNlc3Npb25JZCwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7XG4gICAgICBjb250aW51ZTogZmFsc2UsXG4gICAgICBzeXN0ZW1NZXNzYWdlOiBbXG4gICAgICAgIGBTZXNzaW9uIHJlZ2lzdHJhdGlvbiBmYWlsZWQgZm9yIFBJRCAke2Vycm9yLnBpZH0gKHNlc3Npb24gJHtlcnJvci5zZXNzaW9uSWR9KS5gLFxuICAgICAgICAnJyxcbiAgICAgICAgYEVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCxcbiAgICAgICAgJycsXG4gICAgICAgICdDb21taXQgYXR0cmlidXRpb24gcmVxdWlyZXMgYSB2YWxpZCBQSUQtdG8tc2Vzc2lvbiBtYXBwaW5nLiBUbyByZXNvbHZlOicsXG4gICAgICAgICcxLiBWZXJpZnkgdGhlIHNlc3Npb24gcmVnaXN0cnkgaXMgYWNjZXNzaWJsZSBhbmQgbm90IGxvY2tlZCBieSBhbm90aGVyIHByb2Nlc3MnLFxuICAgICAgICAnMi4gRW5zdXJlIHN1ZmZpY2llbnQgZGlzayBzcGFjZSBmb3IgdGhlIHNlc3Npb24gcmVnaXN0cnkgZmlsZScsXG4gICAgICAgIGAzLiBDaGVjayB0aGF0IHRoZSBDbGF1ZGUgcHJvY2VzcyAoUElEICR7U3RyaW5nKGVycm9yLnBpZCl9KSBpcyBzdGlsbCBydW5uaW5nYFxuICAgICAgXS5qb2luKCdcXG4nKSxcbiAgICAgIHN0b3BSZWFzb246IGBTZXNzaW9uIHJlZ2lzdHJhdGlvbiBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIHNwYXduVHJhbnNjcmlwdFdhdGNoZXIoY2xhdWRlUGlkLCBzZXNzaW9uSWQsIHRyYW5zY3JpcHRQYXRoLCBhY3Rpb25JbnB1dC5jYXJkSWQsIGFjdGlvbklucHV0LmNhcmRSZXBvUGF0aCk7XG4gICAgbG9nZ2VyLmluZm8oJ1NwYXduZWQgdHJhbnNjcmlwdCB3YXRjaGVyJywgeyBwaWQ6IGNsYXVkZVBpZCwgc2Vzc2lvbklkIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgbG9nZ2VyLndhcm4oJ1RyYW5zY3JpcHQgd2F0Y2hlciBzcGF3biBmYWlsZWQnLCB7IGVycm9yOiBtZXNzYWdlIH0pO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZSBmb3IgdGhlIHNlc3Npb24gSUQgcGVyc2lzdGVkIGludG8gdGhlIEJhc2ggdG9vbFxuICogc2hlbGwgZW52aXJvbm1lbnQuIFRoZSBjYXJkLXJlcG8gcG9zdC1jb21taXQgaG9vayByZWFkcyB0aGlzIHRvIHJlY29yZFxuICogY29tbWl0cyB3aXRob3V0IG5lZWRpbmcgYSBwcm9jZXNzLXRyZWUgd2Fsay5cbiAqL1xuY29uc3QgQ0FSRFNfU0VTU0lPTl9JRF9FTlYgPSAnQ0FSRFNfU0VTU0lPTl9JRCc7XG5cbmV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIgfSkgPT4ge1xuICBsZXQgYWN0aW9uSW5wdXQ6IEFjdGlvbklucHV0O1xuICB0cnkge1xuICAgIGFjdGlvbklucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICBsb2dnZXIuZXJyb3IoJ05vdCBydW5uaW5nIGluc2lkZSBhbiBhY3Rpb24gc3VicHJvY2VzcycsIHsgZXJyb3I6IG1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7XG4gICAgICBzeXN0ZW1NZXNzYWdlOiAnU2Vzc2lvblN0YXJ0IGhvb2s6IG5vdCBydW5uaW5nIGluc2lkZSBhbiBhY3Rpb24gc3VicHJvY2Vzcy4nXG4gICAgfSk7XG4gIH1cblxuICAvLyBQZXJzaXN0IHNlc3Npb24gSUQgc28gdGhlIGNhcmQtcmVwbyBwb3N0LWNvbW1pdCBob29rIGNhbiBieXBhc3MgdGhlXG4gIC8vIHByb2Nlc3MgdHJlZSB3YWxrIGVudGlyZWx5LlxuICBwZXJzaXN0RW52VmFyKENBUkRTX1NFU1NJT05fSURfRU5WLCBpbnB1dC5zZXNzaW9uX2lkKTtcbiAgbG9nZ2VyLmluZm8oJ1BlcnNpc3RlZCBzZXNzaW9uIElEIHRvIGVudmlyb25tZW50JywgeyBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQgfSk7XG5cbiAgY29uc3QgaGVhZFNoYSA9IHJlc29sdmVIZWFkU2hhKGFjdGlvbklucHV0LmNhcmRSZXBvUGF0aCk7XG4gIGlmIChoZWFkU2hhKSB7XG4gICAgd3JpdGVTZXNzaW9uSGVhZFNoYShpbnB1dC5zZXNzaW9uX2lkLCBoZWFkU2hhKTtcbiAgICBsb2dnZXIuaW5mbygnU3RvcmVkIGdpdCBIRUFEIHNoYScsIHsgaGVhZFNoYSwgcmVwb1BhdGg6IGFjdGlvbklucHV0LmNhcmRSZXBvUGF0aCB9KTtcbiAgfSBlbHNlIHtcbiAgICBsb2dnZXIud2FybignQ291bGQgbm90IHJlc29sdmUgZ2l0IEhFQUQgc2hhJywgeyByZXBvUGF0aDogYWN0aW9uSW5wdXQuY2FyZFJlcG9QYXRoIH0pO1xuICB9XG5cbiAgY29uc3QgY2xhdWRlUGlkID0gZmluZENsYXVkZVBpZCgpO1xuICBpZiAoY2xhdWRlUGlkKSB7XG4gICAgY29uc3QgZmFpbHVyZSA9IGF3YWl0IHJlZ2lzdGVyUGlkQW5kU3Bhd25XYXRjaGVyKFxuICAgICAgY2xhdWRlUGlkLFxuICAgICAgaW5wdXQuc2Vzc2lvbl9pZCxcbiAgICAgIGlucHV0LnRyYW5zY3JpcHRfcGF0aCxcbiAgICAgIGFjdGlvbklucHV0LFxuICAgICAgbG9nZ2VyXG4gICAgKTtcbiAgICBpZiAoZmFpbHVyZSkgcmV0dXJuIGZhaWx1cmU7XG4gIH0gZWxzZSB7XG4gICAgbG9nZ2VyLmVycm9yKCdDb3VsZCBub3QgZmluZCBDbGF1ZGUgUElEIGZvciBjb21taXQgYXR0cmlidXRpb24nLCB7XG4gICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gICAgICBwcGlkOiBwcm9jZXNzLnBwaWRcbiAgICB9KTtcbiAgICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHtcbiAgICAgIGNvbnRpbnVlOiBmYWxzZSxcbiAgICAgIHN5c3RlbU1lc3NhZ2U6IFtcbiAgICAgICAgJ0NvdWxkIG5vdCBsb2NhdGUgdGhlIENsYXVkZSBDb2RlIHByb2Nlc3MgaW4gdGhlIGFuY2VzdG9yIGNoYWluLicsXG4gICAgICAgICcnLFxuICAgICAgICBgU2Vzc2lvbjogJHtpbnB1dC5zZXNzaW9uX2lkfWAsXG4gICAgICAgIGBIb29rIFBQSUQ6ICR7cHJvY2Vzcy5wcGlkfWAsXG4gICAgICAgICcnLFxuICAgICAgICAnQ29tbWl0IGF0dHJpYnV0aW9uIGFuZCB0cmFuc2NyaXB0IG1vbml0b3JpbmcgcmVxdWlyZSBhIHZhbGlkIENsYXVkZSBQSUQuJyxcbiAgICAgICAgJ1RoaXMgaXMgYSBmYXRhbCBlcnJvciB3aGVuIHJ1bm5pbmcgaW5zaWRlIGFuIGFjdGlvbiBzdWJwcm9jZXNzIChDQVJEX0lEIGlzIHNldCkuJyxcbiAgICAgICAgJycsXG4gICAgICAgICdUbyByZXNvbHZlOicsXG4gICAgICAgICcxLiBFbnN1cmUgQ2xhdWRlIENvZGUgaXMgcnVubmluZyBhcyBhIHByb2Nlc3MgbmFtZWQgXCJjbGF1ZGVcIicsXG4gICAgICAgICcyLiBDaGVjayB0aGF0IGBwc2AgY2FuIHNlZSBhbmNlc3RvciBwcm9jZXNzZXMgKG5vIFBJRCBuYW1lc3BhY2UgaXNvbGF0aW9uKScsXG4gICAgICAgICczLiBWZXJpZnkgdGhlIHByb2Nlc3MgdHJlZSBkZXB0aCBpcyB3aXRoaW4gdGhlIGFsbG93ZWQgbGltaXQnXG4gICAgICBdLmpvaW4oJ1xcbicpLFxuICAgICAgc3RvcFJlYXNvbjogYENvdWxkIG5vdCBmaW5kIENsYXVkZSBQSUQgKHBwaWQ9JHtwcm9jZXNzLnBwaWR9LCBzZXNzaW9uPSR7aW5wdXQuc2Vzc2lvbl9pZH0pYFxuICAgIH0pO1xuICB9XG5cbiAgbG9nZ2VyLmluZm8oJ0FjdGlvbiBzdWJwcm9jZXNzIGNvbmZpcm1lZCcsIHtcbiAgICBjYXJkSWQ6IGFjdGlvbklucHV0LmNhcmRJZCxcbiAgICBhY3Rpb25OYW1lOiBhY3Rpb25JbnB1dC5hY3Rpb25OYW1lLFxuICAgIGVudmlyb25tZW50OiBhY3Rpb25JbnB1dC5lbnZpcm9ubWVudCxcbiAgICBleGVjdXRpb25Nb2RlOiBhY3Rpb25JbnB1dC5leGVjdXRpb25Nb2RlXG4gIH0pO1xuXG4gIGxldCBzeXN0ZW1NZXNzYWdlOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgc3lzdGVtTWVzc2FnZSA9IGJ1aWxkQWRkaXRpb25hbENvbnRleHQoYWN0aW9uSW5wdXQpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIENhcmRSZXBvQWNjZXNzRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignQ2FyZCByZXBvIGluYWNjZXNzaWJsZScsIHsgcmVwb1BhdGg6IGVycm9yLnJlcG9QYXRoLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe1xuICAgICAgICBjb250aW51ZTogZmFsc2UsXG4gICAgICAgIC4uLmVycm9yLnRvSG9va0ZhaWx1cmUoJ3Nlc3Npb24nKVxuICAgICAgfSk7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7XG4gICAgc3lzdGVtTWVzc2FnZSxcbiAgICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAgICAgIGFkZGl0aW9uYWxDb250ZXh0OiBzeXN0ZW1NZXNzYWdlXG4gICAgfVxuICB9KTtcbn0pO1xuIiwgIi8qKlxuICogVHJhY2tzIGFzc29jaWF0aW9ucyBiZXR3ZWVuIENsYXVkZSBwcm9jZXNzIElEcyBhbmQgY2FyZHMgb24gZGlzaywgYnVmZmVyaW5nXG4gKiBwZW5kaW5nIGNvbW1pdCBTSEFzIHVudGlsIGFuIGFzc29jaWF0aW9uIGlzIGVzdGFibGlzaGVkLiBUaGUgcmVnaXN0cnkgdXNlc1xuICogYXRvbWljIGZpbGUgd3JpdGVzLCBhZHZpc29yeSBmaWxlIGxvY2tpbmcsIGFuZCBhdXRvbWF0aWMgc3RhbGUtZW50cnkgcHJ1bmluZ1xuICogdG8gcmVtYWluIGNvcnJlY3QgdW5kZXIgY29uY3VycmVudCBhY2Nlc3MuXG4gKlxuICogQHN1bW1hcnkgUElELXRvLWNhcmQgc2Vzc2lvbiByZWdpc3RyeSB3aXRoIGNvbW1pdCBidWZmZXJpbmdcbiAqIEBtb2R1bGUgY2xhdWRlLWNvZGUtc2Vzc2lvbnNcbiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZSB9IGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsgaG9tZWRpciB9IGZyb20gJ25vZGU6b3MnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBleGVjdXRlVHJhbnNhY3Rpb24sIGhhc0Vycm5vQ29kZSwgaXNQcm9jZXNzQWxpdmUsIHBydW5lU3RhbGVFbnRyaWVzIH0gZnJvbSAnLi9pbnRlcm5hbC5qcyc7XG5cbmV4cG9ydCB7IGZpbmRBbGxDbGF1ZGVQaWRzLCBmaW5kQ2xhdWRlUGlkLCBQUk9DRVNTX1RSRUVfTUFYX0RFUFRIIH0gZnJvbSAnLi9wcm9jZXNzLXRyZWUuanMnO1xuXG5mdW5jdGlvbiBnZXRDYXJkc0RpcigpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihob21lZGlyKCksICcuY2FyZHMnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjYW5vbmljYWwgb24tZGlzayBsb2NhdGlvbiBmb3IgdGhlIHNlc3Npb24gcmVnaXN0cnkgSlNPTiBmaWxlLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gYH4vLmNhcmRzL2NsYXVkZS1zZXNzaW9ucy5qc29uYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFJlZ2lzdHJ5UGF0aCgpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihnZXRDYXJkc0RpcigpLCAnY2xhdWRlLXNlc3Npb25zLmpzb24nKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjYW5vbmljYWwgb24tZGlzayBsb2NhdGlvbiBmb3IgdGhlIHNlc3Npb24gbG9jayBmaWxlLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gYH4vLmNhcmRzL2NsYXVkZS1zZXNzaW9ucy5sb2NrYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldExvY2tQYXRoKCk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGdldENhcmRzRGlyKCksICdjbGF1ZGUtc2Vzc2lvbnMubG9jaycpO1xufVxuXG5leHBvcnQgY29uc3QgTE9DS19USU1FT1VUX01TID0gMjAwMDtcbmV4cG9ydCBjb25zdCBNQVhfRU5UUllfQUdFX01TID0gMjQgKiA2MCAqIDYwICogMTAwMDsgLy8gMjQgaG91cnNcblxuLyoqIFNlc3Npb24gZGF0YSBzdG9yZWQgcGVyIFBJRCBpbiB0aGUgcmVnaXN0cnkgZmlsZS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2xhdWRlU2Vzc2lvbkVudHJ5IHtcbiAgY2FyZElkPzogc3RyaW5nO1xuICBwZW5kaW5nQ29tbWl0czogc3RyaW5nW107XG4gIHVwZGF0ZWRBdDogc3RyaW5nO1xufVxuXG4vKiogSlNPTiBwYXlsb2FkIHN0b3JlZCBhdCBgfi8uY2FyZHMvY2xhdWRlLXNlc3Npb25zLmpzb25gLiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGF1ZGVTZXNzaW9uUmVnaXN0cnkge1xuICBzZXNzaW9uczogUmVjb3JkPHN0cmluZywgQ2xhdWRlU2Vzc2lvbkVudHJ5Pjtcbn1cblxuLyoqIEV4dGVuZGVkIHNlc3Npb24gZW50cnkgdGhhdCBpbmNsdWRlcyBzZXNzaW9uIElELiAqL1xuZXhwb3J0IGludGVyZmFjZSBQaWRTZXNzaW9uRW50cnkge1xuICBzZXNzaW9uSWQ6IHN0cmluZztcbiAgdXBkYXRlZEF0OiBzdHJpbmc7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUHVibGljIEFQSVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKlxuICogQXNzb2NpYXRlcyBQSUQgd2l0aCBjYXJkLiBJZiB0aGUgZW50cnkgYWxyZWFkeSBoYXMgYSBgY2FyZElkYCwgcmV0dXJucyBgW11gXG4gKiAoZmlyc3Qtd3JpdGUtd2lucykuIE90aGVyd2lzZSBzZXRzIGBjYXJkSWRgLCBleHRyYWN0cyBhbmQgY2xlYXJzXG4gKiBgcGVuZGluZ0NvbW1pdHNgLCBhbmQgcmV0dXJucyB0aGUgZXh0cmFjdGVkIGNvbW1pdHMuXG4gKlxuICogQHBhcmFtIHBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRvIGFzc29jaWF0ZS5cbiAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIGlkZW50aWZpZXIgdG8gYmluZCB0byB0aGUgUElELlxuICogQHJldHVybnMgUGVuZGluZyBTSEFzIGNhcHR1cmVkIGJlZm9yZSBhc3NvY2lhdGlvbiwgb3IgYFtdYCBvbiBmaXJzdC13cml0ZSBjb25mbGljdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFzc29jaWF0ZVBpZFdpdGhDYXJkKHBpZDogbnVtYmVyLCBjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgcmV0dXJuIGV4ZWN1dGVUcmFuc2FjdGlvbjxDbGF1ZGVTZXNzaW9uUmVnaXN0cnksIHN0cmluZ1tdPihcbiAgICBnZXRSZWdpc3RyeVBhdGgoKSxcbiAgICBnZXRMb2NrUGF0aCgpLFxuICAgIChyZWdpc3RyeSkgPT4ge1xuICAgICAgY29uc3QgcGlkU3RyID0gU3RyaW5nKHBpZCk7XG4gICAgICBjb25zdCBlbnRyeSA9IHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl07XG5cbiAgICAgIGlmIChlbnRyeT8uY2FyZElkKSByZXR1cm4gW107XG5cbiAgICAgIGNvbnN0IHBlbmRpbmdDb21taXRzID0gZW50cnk/LnBlbmRpbmdDb21taXRzID8/IFtdO1xuXG4gICAgICByZWdpc3RyeS5zZXNzaW9uc1twaWRTdHJdID0ge1xuICAgICAgICBjYXJkSWQsXG4gICAgICAgIHBlbmRpbmdDb21taXRzOiBbXSxcbiAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBwZW5kaW5nQ29tbWl0cztcbiAgICB9LFxuICAgIChyZWdpc3RyeSkgPT4gcHJ1bmVTdGFsZUVudHJpZXMocmVnaXN0cnkuc2Vzc2lvbnMsIGlzUHJvY2Vzc0FsaXZlLCBNQVhfRU5UUllfQUdFX01TKSxcbiAgICB7IHNlc3Npb25zOiB7fSB9IGFzIENsYXVkZVNlc3Npb25SZWdpc3RyeSxcbiAgICBMT0NLX1RJTUVPVVRfTVNcbiAgKTtcbn1cblxuLyoqXG4gKiBBcHBlbmRzIFNIQSB0byBgcGVuZGluZ0NvbW1pdHNgIGZvciBQSUQgKGRlZHVwbGljYXRpbmcpLiBDcmVhdGVzIHRoZSBlbnRyeVxuICogaWYgaXQgZG9lcyBub3QgZXhpc3QuXG4gKlxuICogQHBhcmFtIHBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRoYXQgcHJvZHVjZWQgdGhlIGNvbW1pdC5cbiAqIEBwYXJhbSBzaGEgLSBDb21taXQgU0hBIHRvIHJlY29yZCBmb3IgbGF0ZXIgYXR0cmlidXRpb24uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWNvcmRQZW5kaW5nQ29tbWl0KHBpZDogbnVtYmVyLCBzaGE6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBleGVjdXRlVHJhbnNhY3Rpb248Q2xhdWRlU2Vzc2lvblJlZ2lzdHJ5LCB2b2lkPihcbiAgICBnZXRSZWdpc3RyeVBhdGgoKSxcbiAgICBnZXRMb2NrUGF0aCgpLFxuICAgIChyZWdpc3RyeSkgPT4ge1xuICAgICAgY29uc3QgcGlkU3RyID0gU3RyaW5nKHBpZCk7XG4gICAgICBjb25zdCBlbnRyeSA9IHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl0gPz8ge1xuICAgICAgICBwZW5kaW5nQ29tbWl0czogW10sXG4gICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICB9O1xuXG4gICAgICBpZiAoIWVudHJ5LnBlbmRpbmdDb21taXRzLmluY2x1ZGVzKHNoYSkpIHtcbiAgICAgICAgZW50cnkucGVuZGluZ0NvbW1pdHMucHVzaChzaGEpO1xuICAgICAgfVxuXG4gICAgICBlbnRyeS51cGRhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICByZWdpc3RyeS5zZXNzaW9uc1twaWRTdHJdID0gZW50cnk7XG4gICAgfSxcbiAgICAocmVnaXN0cnkpID0+IHBydW5lU3RhbGVFbnRyaWVzKHJlZ2lzdHJ5LnNlc3Npb25zLCBpc1Byb2Nlc3NBbGl2ZSwgTUFYX0VOVFJZX0FHRV9NUyksXG4gICAgeyBzZXNzaW9uczoge30gfSBhcyBDbGF1ZGVTZXNzaW9uUmVnaXN0cnksXG4gICAgTE9DS19USU1FT1VUX01TXG4gICk7XG59XG5cbi8qKlxuICogUmV0dXJucyBgY2FyZElkYCBmb3IgUElEIGlmIGl0IGV4aXN0cywgbnVsbCBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRvIHJlc29sdmUuXG4gKiBAcmV0dXJucyBBc3NvY2lhdGVkIGNhcmQgSUQsIG9yIGBudWxsYCB3aGVuIHVua25vd24uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRQaWRDYXJkSWQocGlkOiBudW1iZXIpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgcmV0dXJuIGV4ZWN1dGVUcmFuc2FjdGlvbjxDbGF1ZGVTZXNzaW9uUmVnaXN0cnksIHN0cmluZyB8IG51bGw+KFxuICAgIGdldFJlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldExvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICBjb25zdCBwaWRTdHIgPSBTdHJpbmcocGlkKTtcbiAgICAgIHJldHVybiByZWdpc3RyeS5zZXNzaW9uc1twaWRTdHJdPy5jYXJkSWQgPz8gbnVsbDtcbiAgICB9LFxuICAgIChyZWdpc3RyeSkgPT4gcHJ1bmVTdGFsZUVudHJpZXMocmVnaXN0cnkuc2Vzc2lvbnMsIGlzUHJvY2Vzc0FsaXZlLCBNQVhfRU5UUllfQUdFX01TKSxcbiAgICB7IHNlc3Npb25zOiB7fSB9IGFzIENsYXVkZVNlc3Npb25SZWdpc3RyeSxcbiAgICBMT0NLX1RJTUVPVVRfTVNcbiAgKTtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIGFuZCByZXR1cm5zIHRoZSBQSUQncyBlbnRyeS4gUmV0dXJucyBudWxsIGlmIG5vdCBmb3VuZC5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gcmVtb3ZlLlxuICogQHJldHVybnMgUmVtb3ZlZCByZWdpc3RyeSBlbnRyeSwgb3IgYG51bGxgIHdoZW4gbm8gZW50cnkgZXhpc3RlZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbW92ZVBpZEVudHJ5KHBpZDogbnVtYmVyKTogUHJvbWlzZTxDbGF1ZGVTZXNzaW9uRW50cnkgfCBudWxsPiB7XG4gIHJldHVybiBleGVjdXRlVHJhbnNhY3Rpb248Q2xhdWRlU2Vzc2lvblJlZ2lzdHJ5LCBDbGF1ZGVTZXNzaW9uRW50cnkgfCBudWxsPihcbiAgICBnZXRSZWdpc3RyeVBhdGgoKSxcbiAgICBnZXRMb2NrUGF0aCgpLFxuICAgIChyZWdpc3RyeSkgPT4ge1xuICAgICAgY29uc3QgcGlkU3RyID0gU3RyaW5nKHBpZCk7XG4gICAgICBjb25zdCBlbnRyeSA9IHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl07XG5cbiAgICAgIGlmIChlbnRyeSkge1xuICAgICAgICBkZWxldGUgcmVnaXN0cnkuc2Vzc2lvbnNbcGlkU3RyXTtcbiAgICAgICAgcmV0dXJuIGVudHJ5O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuICAgIChyZWdpc3RyeSkgPT4gcHJ1bmVTdGFsZUVudHJpZXMocmVnaXN0cnkuc2Vzc2lvbnMsIGlzUHJvY2Vzc0FsaXZlLCBNQVhfRU5UUllfQUdFX01TKSxcbiAgICB7IHNlc3Npb25zOiB7fSB9IGFzIENsYXVkZVNlc3Npb25SZWdpc3RyeSxcbiAgICBMT0NLX1RJTUVPVVRfTVNcbiAgKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBDYXJkLXJlcG8gUElEIHJlZ2lzdHJ5IChwaWRzLmpzb24pXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIEpTT04gcGF5bG9hZCBzdG9yZWQgYXQgYH4vLmNhcmRzL2NhcmQtcmVwby1jb21taXRzL3BpZHMuanNvbmAuICovXG5pbnRlcmZhY2UgQ2FyZFJlcG9QaWRSZWdpc3RyeSB7XG4gIHNlc3Npb25zOiBSZWNvcmQ8c3RyaW5nLCBQaWRTZXNzaW9uRW50cnk+O1xufVxuXG5mdW5jdGlvbiBnZXRDYXJkUmVwb1BpZHNSZWdpc3RyeVBhdGgoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oZ2V0Q2FyZHNEaXIoKSwgJ2NhcmQtcmVwby1jb21taXRzJywgJ3BpZHMuanNvbicpO1xufVxuXG5mdW5jdGlvbiBnZXRDYXJkUmVwb1BpZHNMb2NrUGF0aCgpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihnZXRDYXJkc0RpcigpLCAnY2FyZC1yZXBvLWNvbW1pdHMnLCAncGlkcy5sb2NrJyk7XG59XG5cbi8qKlxuICogUmVnaXN0ZXJzIGEgc2Vzc2lvbiBmb3IgYSBDbGF1ZGUgcHJvY2VzcyBJRCBpbiB0aGUgY2FyZC1yZXBvIFBJRCByZWdpc3RyeS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gcmVnaXN0ZXIuXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBpZGVudGlmaWVyIHRvIGFzc29jaWF0ZSB3aXRoIHRoZSBQSUQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWdpc3RlclNlc3Npb24ocGlkOiBudW1iZXIsIHNlc3Npb25JZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGV4ZWN1dGVUcmFuc2FjdGlvbjxDYXJkUmVwb1BpZFJlZ2lzdHJ5LCB2b2lkPihcbiAgICBnZXRDYXJkUmVwb1BpZHNSZWdpc3RyeVBhdGgoKSxcbiAgICBnZXRDYXJkUmVwb1BpZHNMb2NrUGF0aCgpLFxuICAgIChyZWdpc3RyeSkgPT4ge1xuICAgICAgcmVnaXN0cnkuc2Vzc2lvbnNbU3RyaW5nKHBpZCldID0ge1xuICAgICAgICBzZXNzaW9uSWQsXG4gICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICB9O1xuICAgIH0sXG4gICAgdW5kZWZpbmVkLFxuICAgIHsgc2Vzc2lvbnM6IHt9IH0gYXMgQ2FyZFJlcG9QaWRSZWdpc3RyeSxcbiAgICBMT0NLX1RJTUVPVVRfTVNcbiAgKTtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIGEgUElEIGVudHJ5IGZyb20gdGhlIGNhcmQtcmVwbyBQSUQgcmVnaXN0cnkuXG4gKlxuICogQHBhcmFtIHBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRvIHJlbW92ZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbW92ZVNlc3Npb25QaWQocGlkOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgZXhlY3V0ZVRyYW5zYWN0aW9uPENhcmRSZXBvUGlkUmVnaXN0cnksIHZvaWQ+KFxuICAgIGdldENhcmRSZXBvUGlkc1JlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldENhcmRSZXBvUGlkc0xvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICBkZWxldGUgcmVnaXN0cnkuc2Vzc2lvbnNbU3RyaW5nKHBpZCldO1xuICAgIH0sXG4gICAgdW5kZWZpbmVkLFxuICAgIHsgc2Vzc2lvbnM6IHt9IH0gYXMgQ2FyZFJlcG9QaWRSZWdpc3RyeSxcbiAgICBMT0NLX1RJTUVPVVRfTVNcbiAgKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzZXNzaW9uIElEIGZvciBhIENsYXVkZSBwcm9jZXNzIElELlxuICpcbiAqIEBwYXJhbSBwaWQgLSBDbGF1ZGUgcHJvY2VzcyBJRCB0byBsb29rIHVwLlxuICogQHJldHVybnMgU2Vzc2lvbiBJRCwgb3IgYG51bGxgIHdoZW4gdGhlIGVudHJ5IGlzIGFic2VudC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFNlc3Npb25JZEZvclBpZChwaWQ6IG51bWJlcik6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICBjb25zdCByZWdpc3RyeVBhdGggPSBnZXRDYXJkUmVwb1BpZHNSZWdpc3RyeVBhdGgoKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgcmVhZEZpbGUocmVnaXN0cnlQYXRoLCAndXRmLTgnKTtcbiAgICBjb25zdCByZWdpc3RyeSA9IEpTT04ucGFyc2UoY29udGVudCkgYXMgQ2FyZFJlcG9QaWRSZWdpc3RyeTtcbiAgICByZXR1cm4gcmVnaXN0cnkuc2Vzc2lvbnNbU3RyaW5nKHBpZCldPy5zZXNzaW9uSWQgPz8gbnVsbDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoaGFzRXJybm9Db2RlKGVycm9yLCAnRU5PRU5UJykpIHJldHVybiBudWxsO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG4iLCAiLyoqXG4gKiBHZW5lcmljIHNoYXJlZCBoZWxwZXJzIGZvciByZWdpc3RyeSBmaWxlIG9wZXJhdGlvbnMuXG4gKlxuICogRXh0cmFjdGVkIGZyb20gaW5kZXgudHMgc28gdGhhdCBtdWx0aXBsZSByZWdpc3RyeSBtb2R1bGVzIGNhbiByZXVzZSB0aGVcbiAqIHNhbWUgbG9ja2luZywgcmVhZC93cml0ZSwgYW5kIHBydW5pbmcgcHJpbWl0aXZlcyB3aXRob3V0IGR1cGxpY2F0aW9uLlxuICpcbiAqIEFsbCBoZWxwZXJzIGZvbGxvdyBmYWlsLWNsb3NlZCBzZW1hbnRpY3M6IHVuZXhwZWN0ZWQgZXJyb3JzIHByb3BhZ2F0ZVxuICogcmF0aGVyIHRoYW4gYmVpbmcgc2lsZW50bHkgc3dhbGxvd2VkLlxuICpcbiAqIEBzdW1tYXJ5IEdlbmVyaWMgbG9ja2luZywgcmVhZC93cml0ZSwgYW5kIHBydW5pbmcgaGVscGVyc1xuICogQG1vZHVsZSBpbnRlcm5hbFxuICovXG5cbmltcG9ydCB7IGNsb3NlU3luYywgbWtkaXJTeW5jLCBvcGVuU3luYywgcmVhZEZpbGVTeW5jLCByZW5hbWVTeW5jLCB1bmxpbmtTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IGlzUHJvY2Vzc0FsaXZlIH0gZnJvbSAnLi9pcGMuanMnO1xuXG5leHBvcnQgeyBpc1Byb2Nlc3NBbGl2ZSB9IGZyb20gJy4vaXBjLmpzJztcblxuLyoqXG4gKiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIGFmdGVyIGBtc2AgbWlsbGlzZWNvbmRzLlxuICpcbiAqIEBwYXJhbSBtcyAtIER1cmF0aW9uIHRvIHNsZWVwIGluIG1pbGxpc2Vjb25kcy5cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIGFmdGVyIHRoZSBzcGVjaWZpZWQgZGVsYXkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzbGVlcChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGFuIHVua25vd24gdGhyb3duIHZhbHVlIGlzIGEgTm9kZS5qcyBzeXN0ZW0gZXJyb3Igd2l0aCB0aGVcbiAqIHNwZWNpZmllZCBgY29kZWAgcHJvcGVydHkgKGUuZy4gYCdFTk9FTlQnYCwgYCdFRVhJU1QnYCkuXG4gKlxuICogQHBhcmFtIGVycm9yIC0gVmFsdWUgY2F1Z2h0IGluIGEgYGNhdGNoYCBibG9jay5cbiAqIEBwYXJhbSBjb2RlIC0gRXhwZWN0ZWQgYEVycm5vRXhjZXB0aW9uLmNvZGVgIHN0cmluZy5cbiAqIEByZXR1cm5zIGB0cnVlYCB3aGVuIHRoZSBlcnJvciBtYXRjaGVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzRXJybm9Db2RlKGVycm9yOiB1bmtub3duLCBjb2RlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgJ2NvZGUnIGluIGVycm9yICYmIChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09IGNvZGU7XG59XG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gcmVtb3ZlIGEgc3RhbGUgbG9jayBmaWxlIGxlZnQgYnkgYSBkZWFkIHByb2Nlc3MuXG4gKlxuICogUmVhZHMgdGhlIFBJRCBmcm9tIHRoZSBsb2NrIGZpbGUsIGNoZWNrcyBsaXZlbmVzcywgYW5kIHVubGlua3Mgd2hlbiB0aGVcbiAqIGhvbGRlciBpcyBubyBsb25nZXIgcnVubmluZy4gQSBzZWNvbmQgcmVhZCBndWFyZHMgYWdhaW5zdCBUT0NUT1UgcmFjZXMuXG4gKlxuICogQHBhcmFtIGxvY2tQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgbG9jayBmaWxlLlxuICogQHJldHVybnMgYHRydWVgIHdoZW4gdGhlIHN0YWxlIGxvY2sgd2FzIHN1Y2Nlc3NmdWxseSByZW1vdmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJ5UmVtb3ZlU3RhbGVMb2NrKGxvY2tQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBsb2NrQ29udGVudCA9IHJlYWRGaWxlU3luYyhsb2NrUGF0aCwgJ3V0Zi04Jyk7XG4gICAgY29uc3QgaG9sZGVyUGlkID0gTnVtYmVyLnBhcnNlSW50KGxvY2tDb250ZW50LnRyaW0oKSwgMTApO1xuXG4gICAgaWYgKCFOdW1iZXIuaXNOYU4oaG9sZGVyUGlkKSAmJiAhaXNQcm9jZXNzQWxpdmUoaG9sZGVyUGlkKSkge1xuICAgICAgLy8gUmUtcmVhZCBsb2NrIGZpbGUgdG8gcmVkdWNlIFRPQ1RPVSByYWNlIHdpbmRvdyBiZWZvcmUgdW5saW5raW5nLlxuICAgICAgaWYgKHJlYWRGaWxlU3luYyhsb2NrUGF0aCwgJ3V0Zi04JykgPT09IGxvY2tDb250ZW50KSB7XG4gICAgICAgIHVubGlua1N5bmMobG9ja1BhdGgpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIHRyeSB7XG4gICAgICB1bmxpbmtTeW5jKGxvY2tQYXRoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gRU5PRU5UOiBsb2NrIGFscmVhZHkgcmVtb3ZlZDsgb3RoZXIgZXJyb3JzOiBiZXN0LWVmZm9ydCBjbGVhbnVwXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBsb2NrIGZpbGUgZXhjbHVzaXZlbHkgYW5kIHdyaXRlcyB0aGUgY3VycmVudCBQSUQgaW50byBpdC5cbiAqXG4gKiBVc2VzIGBPX1dST05MWSB8IE9fQ1JFQVQgfCBPX0VYQ0xgIChgJ3d4J2ApIHNvIHRoZSBjYWxsIGZhaWxzIHdpdGhcbiAqIGBFRVhJU1RgIHdoZW4gYW5vdGhlciBwcm9jZXNzIGFscmVhZHkgaG9sZHMgdGhlIGxvY2suXG4gKlxuICogQHBhcmFtIGxvY2tQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgbG9jayBmaWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVMb2NrSG9sZGVyUGlkKGxvY2tQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgZmQgPSBvcGVuU3luYyhsb2NrUGF0aCwgJ3d4JywgMG82MDApO1xuICB0cnkge1xuICAgIHdyaXRlRmlsZVN5bmMoZmQsIFN0cmluZyhwcm9jZXNzLnBpZCkpO1xuICB9IGZpbmFsbHkge1xuICAgIGNsb3NlU3luYyhmZCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBY3F1aXJlcyBhbiBhZHZpc29yeSBmaWxlIGxvY2ssIHJldHJ5aW5nIHVudGlsIHN1Y2Nlc3Mgb3IgdGltZW91dC5cbiAqXG4gKiAqKkZhaWwtY2xvc2VkKio6IHRocm93cyBvbiB0aW1lb3V0IGluc3RlYWQgb2YgcmV0dXJuaW5nIGEgYm9vbGVhbi5cbiAqXG4gKiBAcGFyYW0gbG9ja1BhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBsb2NrIGZpbGUuXG4gKiBAcGFyYW0gdGltZW91dE1zIC0gTWF4aW11bSB3YWl0IHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICogQHRocm93cyB7RXJyb3J9IGAnTG9jayBhY3F1aXNpdGlvbiB0aW1lb3V0J2Agd2hlbiB0aGUgbG9jayBjYW5ub3QgYmVcbiAqICAgYWNxdWlyZWQgd2l0aGluIGB0aW1lb3V0TXNgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWNxdWlyZUxvY2sobG9ja1BhdGg6IHN0cmluZywgdGltZW91dE1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgY29uc3QgZGlyID0gZGlybmFtZShsb2NrUGF0aCk7XG5cbiAgd2hpbGUgKERhdGUubm93KCkgLSBzdGFydFRpbWUgPCB0aW1lb3V0TXMpIHtcbiAgICB0cnkge1xuICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUsIG1vZGU6IDBvNzAwIH0pO1xuICAgICAgd3JpdGVMb2NrSG9sZGVyUGlkKGxvY2tQYXRoKTtcbiAgICAgIHJldHVybjsgLy8gc3VjY2Vzc1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBpZiAoIWhhc0Vycm5vQ29kZShlcnJvciwgJ0VFWElTVCcpKSB0aHJvdyBlcnJvcjtcbiAgICAgIGlmICh0cnlSZW1vdmVTdGFsZUxvY2sobG9ja1BhdGgpKSBjb250aW51ZTtcblxuICAgICAgY29uc3QgcmVtYWluaW5nID0gdGltZW91dE1zIC0gKERhdGUubm93KCkgLSBzdGFydFRpbWUpO1xuICAgICAgaWYgKHJlbWFpbmluZyA+IDApIHtcbiAgICAgICAgYXdhaXQgc2xlZXAoTWF0aC5taW4oNTAsIHJlbWFpbmluZykpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcignTG9jayBhY3F1aXNpdGlvbiB0aW1lb3V0Jyk7XG59XG5cbi8qKlxuICogUmVsZWFzZXMgYW4gYWR2aXNvcnkgZmlsZSBsb2NrIGJ5IHVubGlua2luZyB0aGUgbG9jayBmaWxlLlxuICpcbiAqIGBFTk9FTlRgIGlzIHNpbGVudGx5IGlnbm9yZWQgKHRoZSBsb2NrIHdhcyBhbHJlYWR5IHJlbGVhc2VkKTsgYWxsIG90aGVyXG4gKiBlcnJvcnMgcHJvcGFnYXRlLlxuICpcbiAqIEBwYXJhbSBsb2NrUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGxvY2sgZmlsZS5cbiAqIEB0aHJvd3Mge05vZGVKUy5FcnJub0V4Y2VwdGlvbn0gV2hlbiB0aGUgdW5saW5rIGZhaWxzIGZvciByZWFzb25zIG90aGVyIHRoYW4gYEVOT0VOVGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWxlYXNlTG9jayhsb2NrUGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgdW5saW5rU3luYyhsb2NrUGF0aCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKCFoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIHN0YWxlIGVudHJpZXMgZnJvbSBhIFBJRC1rZXllZCByZWdpc3RyeSBvYmplY3QuXG4gKlxuICogQW4gZW50cnkgaXMgY29uc2lkZXJlZCBzdGFsZSB3aGVuOlxuICogMS4gSXRzIGtleSBpcyBub3QgYSB2YWxpZCBpbnRlZ2VyIFBJRC5cbiAqIDIuIEl0cyBgdXBkYXRlZEF0YCB0aW1lc3RhbXAgaXMgb2xkZXIgdGhhbiBgbWF4QWdlTXNgLlxuICogMy4gVGhlIHByb2Nlc3MgaWRlbnRpZmllZCBieSBpdHMga2V5IGlzIG5vIGxvbmdlciBhbGl2ZS5cbiAqXG4gKiBAcGFyYW0gcmVnaXN0cnkgLSBNdXRhYmxlIFBJRC1rZXllZCByZWNvcmQgdG8gcHJ1bmUgaW4gcGxhY2UuXG4gKiBAcGFyYW0gaXNBbGl2ZSAtIExpdmVuZXNzIGNoZWNrIGZ1bmN0aW9uICh0eXBpY2FsbHkge0BsaW5rIGlzUHJvY2Vzc0FsaXZlfSkuXG4gKiBAcGFyYW0gbWF4QWdlTXMgLSBNYXhpbXVtIGVudHJ5IGFnZSBpbiBtaWxsaXNlY29uZHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcnVuZVN0YWxlRW50cmllczxUIGV4dGVuZHMgeyB1cGRhdGVkQXQ6IHN0cmluZyB9PihcbiAgcmVnaXN0cnk6IFJlY29yZDxzdHJpbmcsIFQ+LFxuICBpc0FsaXZlOiAocGlkOiBudW1iZXIpID0+IGJvb2xlYW4sXG4gIG1heEFnZU1zOiBudW1iZXJcbik6IHZvaWQge1xuICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuXG4gIGZvciAoY29uc3QgW3BpZFN0ciwgZW50cnldIG9mIE9iamVjdC5lbnRyaWVzKHJlZ2lzdHJ5KSkge1xuICAgIGNvbnN0IHBpZCA9IE51bWJlci5wYXJzZUludChwaWRTdHIsIDEwKTtcblxuICAgIGlmIChOdW1iZXIuaXNOYU4ocGlkKSkge1xuICAgICAgZGVsZXRlIHJlZ2lzdHJ5W3BpZFN0cl07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgdXBkYXRlZEF0ID0gbmV3IERhdGUoZW50cnkudXBkYXRlZEF0KS5nZXRUaW1lKCk7XG4gICAgICBpZiAobm93IC0gdXBkYXRlZEF0ID4gbWF4QWdlTXMpIHtcbiAgICAgICAgZGVsZXRlIHJlZ2lzdHJ5W3BpZFN0cl07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgZGVsZXRlIHJlZ2lzdHJ5W3BpZFN0cl07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgaWYgKCFpc0FsaXZlKHBpZCkpIHtcbiAgICAgICAgZGVsZXRlIHJlZ2lzdHJ5W3BpZFN0cl07XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBpc1Byb2Nlc3NBbGl2ZSB0aHJvd3Mgb24gdW5leHBlY3RlZCBlcnJvcnMgLSBrZWVwIGVudHJ5XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHBhcnNlcyBhIEpTT04gcmVnaXN0cnkgZmlsZS5cbiAqXG4gKiAqKkZhaWwtY2xvc2VkKio6IHJldHVybnMgYGRlZmF1bHRWYWx1ZWAgb25seSB3aGVuIHRoZSBmaWxlIGRvZXMgbm90IGV4aXN0XG4gKiAoYEVOT0VOVGApLiBQYXJzZSBlcnJvcnMgYW5kIG90aGVyIEkvTyBmYWlsdXJlcyBwcm9wYWdhdGUgYXMgZXhjZXB0aW9ucy5cbiAqXG4gKiBAcGFyYW0gcGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIHJlZ2lzdHJ5IEpTT04gZmlsZS5cbiAqIEBwYXJhbSBkZWZhdWx0VmFsdWUgLSBWYWx1ZSByZXR1cm5lZCB3aGVuIHRoZSBmaWxlIGRvZXMgbm90IGV4aXN0LlxuICogQHJldHVybnMgUGFyc2VkIHJlZ2lzdHJ5IGNvbnRlbnRzLCBvciBgZGVmYXVsdFZhbHVlYCBvbiBgRU5PRU5UYC5cbiAqIEB0aHJvd3Mge1N5bnRheEVycm9yfSBXaGVuIHRoZSBmaWxlIGNvbnRhaW5zIGludmFsaWQgSlNPTi5cbiAqIEB0aHJvd3Mge05vZGVKUy5FcnJub0V4Y2VwdGlvbn0gT24gSS9PIGVycm9ycyBvdGhlciB0aGFuIGBFTk9FTlRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFJlZ2lzdHJ5PFQ+KHBhdGg6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBUKTogVCB7XG4gIHRyeSB7XG4gICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhwYXRoLCAndXRmLTgnKTtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShjb250ZW50KSBhcyBUO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICB0aHJvdyBlcnJvcjsgLy8gRkFJTC1DTE9TRUQ6IHRocm93IG9uIHBhcnNlIGVycm9yc1xuICB9XG59XG5cbi8qKlxuICogQXRvbWljYWxseSB3cml0ZXMgYSByZWdpc3RyeSBvYmplY3QgYXMgcHJldHR5LXByaW50ZWQgSlNPTi5cbiAqXG4gKiBXcml0ZXMgdG8gYSB0ZW1wb3JhcnkgYC50bXBgIHNpYmxpbmcgZmlyc3QsIHRoZW4gcmVuYW1lcyBpbnRvIHBsYWNlIHNvXG4gKiByZWFkZXJzIG5ldmVyIG9ic2VydmUgYSBwYXJ0aWFsbHktd3JpdHRlbiBmaWxlLlxuICpcbiAqIEBwYXJhbSByZWdpc3RyeSAtIE9iamVjdCB0byBzZXJpYWxpemUuXG4gKiBAcGFyYW0gcmVnaXN0cnlQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgdGFyZ2V0IHJlZ2lzdHJ5IGZpbGUuXG4gKiBAdGhyb3dzIHtOb2RlSlMuRXJybm9FeGNlcHRpb259IE9uIGZpbGVzeXN0ZW0gd3JpdGUgb3IgcmVuYW1lIGZhaWx1cmVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVSZWdpc3RyeUxvY2tlZDxUPihyZWdpc3RyeTogVCwgcmVnaXN0cnlQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgZGlyID0gZGlybmFtZShyZWdpc3RyeVBhdGgpO1xuICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgbW9kZTogMG83MDAgfSk7XG4gIGNvbnN0IHRlbXBQYXRoID0gYCR7cmVnaXN0cnlQYXRofS50bXBgO1xuICB0cnkge1xuICAgIHdyaXRlRmlsZVN5bmModGVtcFBhdGgsIEpTT04uc3RyaW5naWZ5KHJlZ2lzdHJ5LCBudWxsLCAyKSwgeyBtb2RlOiAwbzYwMCB9KTtcbiAgICByZW5hbWVTeW5jKHRlbXBQYXRoLCByZWdpc3RyeVBhdGgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRyeSB7XG4gICAgICB1bmxpbmtTeW5jKHRlbXBQYXRoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIGNsZWFudXAgYmVzdC1lZmZvcnQgKi9cbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLyoqXG4gKiBFeGVjdXRlcyBhIHJlYWQtbW9kaWZ5LXdyaXRlIHRyYW5zYWN0aW9uIHVuZGVyIGFuIGFkdmlzb3J5IGZpbGUgbG9jay5cbiAqXG4gKiAxLiBBY3F1aXJlcyBsb2NrLlxuICogMi4gUmVhZHMgcmVnaXN0cnkgKG9yIHVzZXMgYGRlZmF1bHRSZWdpc3RyeWAgaWYgZmlsZSBhYnNlbnQpLlxuICogMy4gT3B0aW9uYWxseSBwcnVuZXMgc3RhbGUgZW50cmllcy5cbiAqIDQuIENhbGxzIGBvcGVyYXRpb25gIHdpdGggdGhlIG11dGFibGUgcmVnaXN0cnkuXG4gKiA1LiBXcml0ZXMgdGhlIHJlZ2lzdHJ5IGJhY2suXG4gKiA2LiBSZWxlYXNlcyBsb2NrIChndWFyYW50ZWVkIHZpYSBgZmluYWxseWApLlxuICpcbiAqIEBwYXJhbSByZWdpc3RyeVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZWdpc3RyeSBKU09OIGZpbGUuXG4gKiBAcGFyYW0gbG9ja1BhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBsb2NrIGZpbGUuXG4gKiBAcGFyYW0gb3BlcmF0aW9uIC0gQ2FsbGJhY2sgdGhhdCBtdXRhdGVzIHRoZSByZWdpc3RyeSBhbmQgcmV0dXJucyBhIHJlc3VsdC5cbiAqIEBwYXJhbSBwcnVuZXIgLSBPcHRpb25hbCBjYWxsYmFjayB0byBwcnVuZSBzdGFsZSBlbnRyaWVzIGJlZm9yZSB0aGUgb3BlcmF0aW9uLlxuICogQHBhcmFtIGRlZmF1bHRSZWdpc3RyeSAtIERlZmF1bHQgdmFsdWUgd2hlbiB0aGUgcmVnaXN0cnkgZmlsZSBkb2VzIG5vdCBleGlzdC5cbiAqIEBwYXJhbSBsb2NrVGltZW91dE1zIC0gTG9jayBhY3F1aXNpdGlvbiB0aW1lb3V0IChkZWZhdWx0IDIwMDAgbXMpLlxuICogQHJldHVybnMgVGhlIHZhbHVlIHJldHVybmVkIGJ5IGBvcGVyYXRpb25gLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZVRyYW5zYWN0aW9uPFRSZWdpc3RyeSwgVFJlc3VsdD4oXG4gIHJlZ2lzdHJ5UGF0aDogc3RyaW5nLFxuICBsb2NrUGF0aDogc3RyaW5nLFxuICBvcGVyYXRpb246IChyZWdpc3RyeTogVFJlZ2lzdHJ5KSA9PiBUUmVzdWx0LFxuICBwcnVuZXI/OiAocmVnaXN0cnk6IFRSZWdpc3RyeSkgPT4gdm9pZCxcbiAgZGVmYXVsdFJlZ2lzdHJ5PzogVFJlZ2lzdHJ5LFxuICBsb2NrVGltZW91dE1zPzogbnVtYmVyXG4pOiBQcm9taXNlPFRSZXN1bHQ+IHtcbiAgYXdhaXQgYWNxdWlyZUxvY2sobG9ja1BhdGgsIGxvY2tUaW1lb3V0TXMgPz8gMjAwMCk7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVnaXN0cnkgPSByZWFkUmVnaXN0cnk8VFJlZ2lzdHJ5PihyZWdpc3RyeVBhdGgsIGRlZmF1bHRSZWdpc3RyeSBhcyBUUmVnaXN0cnkpO1xuICAgIGlmIChwcnVuZXIpIHBydW5lcihyZWdpc3RyeSk7XG4gICAgY29uc3QgcmVzdWx0ID0gb3BlcmF0aW9uKHJlZ2lzdHJ5KTtcbiAgICB3cml0ZVJlZ2lzdHJ5TG9ja2VkKHJlZ2lzdHJ5LCByZWdpc3RyeVBhdGgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0gZmluYWxseSB7XG4gICAgcmVsZWFzZUxvY2sobG9ja1BhdGgpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBQcm9jZXNzLWxldmVsIGhlbHBlcnMgZm9yIGNoZWNraW5nIHByb2Nlc3MgbGl2ZW5lc3MuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFByb2Nlc3MtbGV2ZWwgaGVscGVycyBmb3IgY2hlY2tpbmcgcHJvY2VzcyBsaXZlbmVzc1xuICogQG1vZHVsZSBpcGNcbiAqL1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHByb2Nlc3MgaXMgYWxpdmUgdXNpbmcgYGtpbGwocGlkLCAwKWAuXG4gKlxuICogU2lnbmFsIDAgaXMgYSBuby1vcCBwcm9iZTogbm8gc2lnbmFsIGlzIGRlbGl2ZXJlZCwgYnV0IHRoZSBrZXJuZWwgc3RpbGxcbiAqIHZhbGlkYXRlcyB0aGF0IHRoZSB0YXJnZXQgUElEIGV4aXN0cy4gYEVQRVJNYCBpcyB0cmVhdGVkIGFzIFwiYWxpdmVcIlxuICogYmVjYXVzZSB0aGUgcHJvY2VzcyBleGlzdHMgYnV0IGlzIG93bmVkIGJ5IGFub3RoZXIgdXNlci5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gUElEIHRvIHByb2JlLiBDYWxsZXJzIHVzdWFsbHkgcGFzcyBhIHZhbHVlIHByZXZpb3VzbHkgcmVjb3JkZWRcbiAqICAgaW4gdGhlIHNlc3Npb24gcmVnaXN0cnkuXG4gKiBAcmV0dXJucyBgdHJ1ZWAgd2hlbiB0aGUgUElEIHN0aWxsIGV4aXN0cy4gYEVQRVJNYCBpcyB0cmVhdGVkIGFzIGFsaXZlXG4gKiAgIGJlY2F1c2UgcGVybWlzc2lvbiBmYWlsdXJlcyBzdGlsbCBtZWFuIHRoZSBwcm9jZXNzIGlzIHByZXNlbnQuXG4gKiBAdGhyb3dzIFJldGhyb3dzIHVuZXhwZWN0ZWQgYHByb2Nlc3Mua2lsbGAgZmFpbHVyZXMgc28gY2FsbGVycyBjYW4gZmFpbCBjbG9zZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Byb2Nlc3NBbGl2ZShwaWQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIHByb2Nlc3Mua2lsbChwaWQsIDApO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmICdjb2RlJyBpbiBlcnJvcikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VTUkNIJykgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKGNvZGUgPT09ICdFUEVSTScpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuIiwgIi8qKlxuICogUHJvY2VzcyB0cmVlIHV0aWxpdGllcyBmb3IgbG9jYXRpbmcgQ2xhdWRlIENvZGUgYW5jZXN0b3IgcHJvY2Vzc2VzLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBQcm9jZXNzIHRyZWUgdXRpbGl0aWVzIGZvciBsb2NhdGluZyBDbGF1ZGUgQ29kZSBhbmNlc3RvciBwcm9jZXNzZXNcbiAqIEBtb2R1bGUgbGliL3Byb2Nlc3MtdHJlZVxuICovXG5cbmltcG9ydCB7IGV4ZWNTeW5jIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcblxuLyoqIE1heGltdW0gZGVwdGggdG8gd2FsayB1cCB0aGUgcHJvY2VzcyB0cmVlLiAqL1xuZXhwb3J0IGNvbnN0IFBST0NFU1NfVFJFRV9NQVhfREVQVEggPSAxMDtcblxuLyoqXG4gKiBQYXR0ZXJuIG1hdGNoaW5nIGBjbGF1ZGVgIGFzIGEgcGF0aCBjb21wb25lbnQgaW4gYHBzIC1vIGFyZ3M9YCBvdXRwdXQuXG4gKlxuICogTWF0Y2hlcyBgY2xhdWRlYCB3aGVuIHByZWNlZGVkIGJ5IHN0YXJ0LW9mLXN0cmluZywgd2hpdGVzcGFjZSwgb3IgYC9gXG4gKiAocGF0aCBzZXBhcmF0b3IpIEFORCBmb2xsb3dlZCBieSBgL2AsIHdoaXRlc3BhY2UsIG9yIGVuZC1vZi1zdHJpbmcuXG4gKlxuICogVGhpcyBhdm9pZHMgZmFsc2UgcG9zaXRpdmVzIG9uIGAuY2xhdWRlL2AgZGlyZWN0b3J5IHBhdGhzIGluIGFyZ3VtZW50c1xuICogbGlrZSBgL2hvbWUvbm9kZS8uY2xhdWRlL3NoZWxsLXNuYXBzaG90cy8uLi5gIGJlY2F1c2UgdGhlIGAuYCBiZXR3ZWVuXG4gKiB0aGUgYC9gIGFuZCBgY2xhdWRlYCBwcmV2ZW50cyB0aGUgbG9va2JlaGluZCBmcm9tIG1hdGNoaW5nLlxuICpcbiAqIFRoZSB0cmFpbGluZyBgL2AgYWx0ZXJuYXRpdmUgaGFuZGxlcyB2ZXJzaW9uZWQgZXhlY3V0YWJsZXMgd2hlcmUgdGhlIHBhdGhcbiAqIGNvbnRhaW5zIGAvY2xhdWRlL3ZlcnNpb25zL1guWS5aYCBcdTIwMTQgYGNsYXVkZWAgaXMgYSBkaXJlY3RvcnkgY29tcG9uZW50LFxuICogbm90IHRoZSB0ZXJtaW5hbCBjb21tYW5kIG5hbWUuXG4gKi9cbmNvbnN0IENMQVVERV9BUkdTX1BBVFRFUk4gPSAvKF58XFxzfFxcLyljbGF1ZGUoXFwvfFxcc3wkKS9pO1xuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgZ2l2ZW4gUElEIGJlbG9uZ3MgdG8gYSBDbGF1ZGUgcHJvY2Vzcy5cbiAqXG4gKiBVc2VzIGBwcyAtcCBQSUQgLW8gYXJncz1gIHRvIGdldCB0aGUgZnVsbCBjb21tYW5kIGxpbmUsIHRoZW4gdGVzdHNcbiAqIHdoZXRoZXIgYGNsYXVkZWAgYXBwZWFycyBhcyBhIHBhdGggY29tcG9uZW50IG9yIGNvbW1hbmQgbmFtZS5cbiAqIFRoaXMgbWF0Y2hlcyBib3RoIHRoZSBgY2xhdWRlYCBiaW5hcnkgYW5kIHZlcnNpb25lZCBleGVjdXRhYmxlc1xuICogKGUuZy4gYH4vLmxvY2FsL3NoYXJlL2NsYXVkZS92ZXJzaW9ucy8yLjEuNTFgKS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gUHJvY2VzcyBJRCB0byBpbnNwZWN0LlxuICogQHJldHVybnMgYHRydWVgIHdoZW4gdGhlIHByb2Nlc3MgYXJncyBtYXRjaCBDbGF1ZGU7IG90aGVyd2lzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0NsYXVkZShwaWQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIGNvbnN0IGFyZ3MgPSBleGVjU3luYyhgcHMgLXAgJHtwaWR9IC1vIGFyZ3M9YCwgeyBlbmNvZGluZzogJ3V0ZjgnIH0pLnRyaW0oKTtcbiAgICByZXR1cm4gQ0xBVURFX0FSR1NfUEFUVEVSTi50ZXN0KGFyZ3MpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBwYXJlbnQgUElEIGZvciBhIHByb2Nlc3MsIG9yIGBudWxsYCB3aGVuIHRyYXZlcnNhbCBzaG91bGQgc3RvcC5cbiAqXG4gKiBgbnVsbGAgaXMgcmV0dXJuZWQgZm9yIG1pc3NpbmcgcHJvY2Vzc2VzLCBtYWxmb3JtZWQgYHBzYCBvdXRwdXQsIGFuZFxuICogc2VsZi1wYXJlbnRpbmcgdmFsdWVzIHRoYXQgd291bGQgb3RoZXJ3aXNlIGNyZWF0ZSBhIGxvb3AuXG4gKlxuICogQHBhcmFtIHBpZCAtIFByb2Nlc3MgSUQgd2hvc2UgcGFyZW50IHNob3VsZCBiZSBxdWVyaWVkLlxuICogQHJldHVybnMgUGFyZW50IFBJRCB3aGVuIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIGBudWxsYC5cbiAqL1xuZnVuY3Rpb24gZ2V0UGFyZW50UGlkKHBpZDogbnVtYmVyKTogbnVtYmVyIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgY29uc3QgcHBpZFN0ciA9IGV4ZWNTeW5jKGBwcyAtcCAke3BpZH0gLW8gcHBpZD1gLCB7IGVuY29kaW5nOiAndXRmOCcgfSkudHJpbSgpO1xuICAgIGNvbnN0IHBhcmVudFBpZCA9IE51bWJlci5wYXJzZUludChwcGlkU3RyLCAxMCk7XG4gICAgaWYgKE51bWJlci5pc05hTihwYXJlbnRQaWQpIHx8IHBhcmVudFBpZCA9PT0gcGlkKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gcGFyZW50UGlkO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIFdhbGtzIHRoZSBwcm9jZXNzIHRyZWUgdXB3YXJkIGZyb20gYHN0YXJ0UGlkYCAoZGVmYXVsdDogYHByb2Nlc3MucHBpZGApXG4gKiBsb29raW5nIGZvciB0aGUgbmVhcmVzdCBhbmNlc3RvciBuYW1lZCBcImNsYXVkZVwiLlxuICpcbiAqIEBwYXJhbSBzdGFydFBpZCAtIE9wdGlvbmFsIHJvb3QgUElEIGZvciB0cmF2ZXJzYWwuIFdoZW4gb21pdHRlZCwgdHJhdmVyc2FsXG4gKiAgIHN0YXJ0cyBhdCB0aGUgcGFyZW50IG9mIHRoZSBjdXJyZW50IGhvb2sgcHJvY2Vzcy5cbiAqIEByZXR1cm5zIFRoZSBuZWFyZXN0IG1hdGNoaW5nIENsYXVkZSBhbmNlc3RvciBQSUQsIG9yIGBudWxsYCB3aGVuIG5vIG1hdGNoXG4gKiAgIGlzIGZvdW5kIHdpdGhpbiB7QGxpbmsgUFJPQ0VTU19UUkVFX01BWF9ERVBUSH0uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQ2xhdWRlUGlkKHN0YXJ0UGlkPzogbnVtYmVyKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IHBpZHMgPSBmaW5kQWxsQ2xhdWRlUGlkcyhzdGFydFBpZCk7XG4gIHJldHVybiBwaWRzWzBdID8/IG51bGw7XG59XG5cbi8qKlxuICogV2Fsa3MgdGhlIHByb2Nlc3MgdHJlZSB1cHdhcmQgZnJvbSBgc3RhcnRQaWRgIChkZWZhdWx0OiBgcHJvY2Vzcy5wcGlkYCkgYW5kXG4gKiByZXR1cm5zICoqYWxsKiogUElEcyBuYW1lZCBcImNsYXVkZVwiLCBvcmRlcmVkIG5lYXJlc3QtZmlyc3QuXG4gKlxuICogVXNlZnVsIHdoZW4gbXVsdGlwbGUgQ2xhdWRlIHNlc3Npb25zIGFyZSBuZXN0ZWQgKGUuZy4gYSBUYXNrIHN1YmFnZW50XG4gKiBzcGF3bmVkIGJ5IGFuIG91dGVyIENsYXVkZSkgYW5kIHRoZSBjb3JyZWN0IGNhcmQgYXNzb2NpYXRpb24gbWF5IGJlbG9uZ1xuICogdG8gYW4gYW5jZXN0b3IgZnVydGhlciB1cCB0aGUgdHJlZS5cbiAqIElmIENsYXVkZSBsYXVuY2hlZCBDbGF1ZGUgd2hpY2ggbGF1bmNoZWQgQ2xhdWRlLCB0aGlzIHJldHVybnMgdGhhdCBicmVhZGNydW1iXG4gKiB0cmFpbCBuZWFyZXN0LWZpcnN0LlxuICpcbiAqIEBwYXJhbSBzdGFydFBpZCAtIE9wdGlvbmFsIHJvb3QgUElEIGZvciB0cmF2ZXJzYWwuIFdoZW4gb21pdHRlZCwgdHJhdmVyc2FsXG4gKiAgIHN0YXJ0cyBhdCB0aGUgcGFyZW50IG9mIHRoZSBjdXJyZW50IGhvb2sgcHJvY2Vzcy5cbiAqIEByZXR1cm5zIEFsbCBtYXRjaGluZyBDbGF1ZGUgYW5jZXN0b3IgUElEcyBkaXNjb3ZlcmVkIGJlZm9yZSB0cmF2ZXJzYWwgc3RvcHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQWxsQ2xhdWRlUGlkcyhzdGFydFBpZD86IG51bWJlcik6IG51bWJlcltdIHtcbiAgY29uc3QgcmVzdWx0czogbnVtYmVyW10gPSBbXTtcbiAgbGV0IHBpZCA9IHN0YXJ0UGlkID8/IHByb2Nlc3MucHBpZDtcblxuICBmb3IgKGxldCBkZXB0aCA9IDA7IGRlcHRoIDwgUFJPQ0VTU19UUkVFX01BWF9ERVBUSDsgZGVwdGgrKykge1xuICAgIGlmIChwaWQgPD0gMSkgYnJlYWs7XG5cbiAgICBpZiAoaXNDbGF1ZGUocGlkKSkge1xuICAgICAgcmVzdWx0cy5wdXNoKHBpZCk7XG4gICAgfVxuXG4gICAgY29uc3QgcGFyZW50UGlkID0gZ2V0UGFyZW50UGlkKHBpZCk7XG4gICAgaWYgKHBhcmVudFBpZCA9PT0gbnVsbCkgYnJlYWs7XG4gICAgcGlkID0gcGFyZW50UGlkO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG4iLCAiLyoqXG4gKiBQZXItc2Vzc2lvbiBmaWxlIG9wZXJhdGlvbnMgZm9yIGNhcmQtcmVwbyBjb21taXQgYXR0cmlidXRpb24uXG4gKlxuICogTWFuYWdlcyBwZXItc2Vzc2lvbiBDU1YgZmlsZXMsIC5oZWFkIGZpbGVzLCBhbmQgZGlyZWN0b3J5IHNldHVwIHVuZGVyXG4gKiBgfi8uY2FyZHMvY2FyZC1yZXBvLWNvbW1pdHMvYC4gRWFjaCBzZXNzaW9uIGdldHMgaXRzIG93biBDU1YgZmlsZSBmb3JcbiAqIGNvbW1pdCBTSEFzIGFuZCBhIC5oZWFkIGZpbGUgdHJhY2tpbmcgdGhlIEhFQUQgU0hBIGF0IHNlc3Npb24gc3RhcnQuXG4gKlxuICogRGVzaWduIGludmFyaWFudHM6XG4gKiAtICoqRmFpbC1jbG9zZWQqKjogdW5leHBlY3RlZCBlcnJvcnMgcHJvcGFnYXRlOyBvbmx5IGBFTk9FTlRgIGlzIHNpbGVudGx5IGhhbmRsZWQuXG4gKiAtICoqUGVyLXNlc3Npb24gbG9ja2luZyoqOiBDU1YgYXBwZW5kcyBhY3F1aXJlIGEgcGVyLXNlc3Npb24gbG9jayB0byBwcmV2ZW50XG4gKiAgIGR1cGxpY2F0ZSB3cml0ZXMgdW5kZXIgY29uY3VycmVudCBhY2Nlc3MuXG4gKiAtICoqRGVkdXBsaWNhdGlvbioqOiBTSEFzIGFyZSBkZWR1cGxpY2F0ZWQgYmVmb3JlIGFwcGVuZGluZy5cbiAqXG4gKiBAc3VtbWFyeSBQZXItc2Vzc2lvbiBDU1YgYW5kIC5oZWFkIGZpbGUgb3BlcmF0aW9ucyBmb3IgY2FyZC1yZXBvIGNvbW1pdCBhdHRyaWJ1dGlvblxuICogQG1vZHVsZSBjYXJkLXJlcG9cbiAqL1xuXG5pbXBvcnQgeyBhcHBlbmRGaWxlU3luYywgbWtkaXJTeW5jLCByZWFkRmlsZVN5bmMsIHVubGlua1N5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdub2RlOm9zJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgYWNxdWlyZUxvY2ssIGhhc0Vycm5vQ29kZSwgcmVsZWFzZUxvY2sgfSBmcm9tICcuL2ludGVybmFsLmpzJztcblxuY29uc3QgTE9DS19USU1FT1VUX01TID0gMjAwMDtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBJbnRlcm5hbCBwYXRoIGhlbHBlcnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBnZXRDYXJkUmVwb0NvbW1pdHNEaXIoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oaG9tZWRpcigpLCAnLmNhcmRzJywgJ2NhcmQtcmVwby1jb21taXRzJyk7XG59XG5cbmZ1bmN0aW9uIGdldFNlc3Npb25Dc3ZQYXRoKHNlc3Npb25JZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oZ2V0Q2FyZFJlcG9Db21taXRzRGlyKCksIGAke3Nlc3Npb25JZH0uY3N2YCk7XG59XG5cbmZ1bmN0aW9uIGdldFNlc3Npb25Dc3ZMb2NrUGF0aChzZXNzaW9uSWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGdldENhcmRSZXBvQ29tbWl0c0RpcigpLCBgJHtzZXNzaW9uSWR9LmNzdi5sb2NrYCk7XG59XG5cbmZ1bmN0aW9uIGdldFNlc3Npb25IZWFkU2hhUGF0aChzZXNzaW9uSWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGdldENhcmRSZXBvQ29tbWl0c0RpcigpLCBgJHtzZXNzaW9uSWR9LmhlYWRgKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQdWJsaWMgQVBJXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiBBcHBlbmRzIGEgY29tbWl0IFNIQSB0byB0aGUgc2Vzc2lvbidzIENTViBmaWxlLiBEZWR1cGxpY2F0ZXMgU0hBcy5cbiAqIENyZWF0ZXMgZGlyZWN0b3J5IGFuZCBDU1YgZmlsZSBpZiB0aGV5IGRvbid0IGV4aXN0LlxuICpcbiAqIERlZHVwbGljYXRpb24gaXMgcmVhZC1iZWZvcmUtYXBwZW5kIHVuZGVyIGEgcGVyLXNlc3Npb24gbG9jaywgc28gY29uY3VycmVudFxuICogd3JpdGVycyBkbyBub3QgcHJvZHVjZSBkdXBsaWNhdGUgbGluZXMgZm9yIHRoZSBzYW1lIFNIQS5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiB3aG9zZSBjb21taXQgYnVmZmVyIHNob3VsZCBiZSB1cGRhdGVkLlxuICogQHBhcmFtIHNoYSAtIEZ1bGwgY29tbWl0IFNIQSB0byBhcHBlbmQuXG4gKiBAcmV0dXJucyBSZXNvbHZlcyBvbmNlIHRoZSBTSEEgaXMgcGVyc2lzdGVkIG9yIHNraXBwZWQgYXMgZHVwbGljYXRlLlxuICogQHRocm93cyBFcnJvciBvbiBsb2NrIGFjcXVpc2l0aW9uLCByZWFkLCBvciBhcHBlbmQgZmFpbHVyZXMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRDb21taXRUb1Nlc3Npb24oc2Vzc2lvbklkOiBzdHJpbmcsIHNoYTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIG1rZGlyU3luYyhnZXRDYXJkUmVwb0NvbW1pdHNEaXIoKSwgeyByZWN1cnNpdmU6IHRydWUsIG1vZGU6IDBvNzAwIH0pO1xuXG4gIGNvbnN0IGNzdkxvY2tQYXRoID0gZ2V0U2Vzc2lvbkNzdkxvY2tQYXRoKHNlc3Npb25JZCk7XG4gIGF3YWl0IGFjcXVpcmVMb2NrKGNzdkxvY2tQYXRoLCBMT0NLX1RJTUVPVVRfTVMpO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgY3N2UGF0aCA9IGdldFNlc3Npb25Dc3ZQYXRoKHNlc3Npb25JZCk7XG4gICAgY29uc3QgZXhpc3RpbmdDb21taXRzID0gZ2V0U2Vzc2lvbkNvbW1pdHMoc2Vzc2lvbklkKTtcblxuICAgIGlmICghZXhpc3RpbmdDb21taXRzLmluY2x1ZGVzKHNoYSkpIHtcbiAgICAgIGFwcGVuZEZpbGVTeW5jKGNzdlBhdGgsIGAke3NoYX1cXG5gLCB7IG1vZGU6IDBvNjAwIH0pO1xuICAgIH1cbiAgfSBmaW5hbGx5IHtcbiAgICByZWxlYXNlTG9jayhjc3ZMb2NrUGF0aCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcmV0dXJucyBhbGwgY29tbWl0IFNIQXMgZm9yIGEgc2Vzc2lvbiBmcm9tIGl0cyBDU1YgZmlsZS5cbiAqIFJldHVybnMgZW1wdHkgYXJyYXkgaWYgQ1NWIGRvZXNuJ3QgZXhpc3QuXG4gKlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gd2hvc2UgY29tbWl0IGJ1ZmZlciBzaG91bGQgYmUgcmVhZC5cbiAqIEByZXR1cm5zIE9yZGVyZWQgbGlzdCBvZiBub24tZW1wdHkgU0hBIGxpbmVzLiBSZXR1cm5zIGBbXWAgd2hlbiB0aGUgQ1NWIGlzIGFic2VudC5cbiAqIEB0aHJvd3MgRXJyb3Igb24gcmVhZCBmYWlsdXJlIChleGNlcHQgYEVOT0VOVGApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2Vzc2lvbkNvbW1pdHMoc2Vzc2lvbklkOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHRyeSB7XG4gICAgY29uc3QgY3N2UGF0aCA9IGdldFNlc3Npb25Dc3ZQYXRoKHNlc3Npb25JZCk7XG4gICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhjc3ZQYXRoLCAndXRmLTgnKTtcbiAgICByZXR1cm4gY29udGVudFxuICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgLm1hcCgobGluZSkgPT4gbGluZS50cmltKCkpXG4gICAgICAuZmlsdGVyKChsaW5lKSA9PiBsaW5lLmxlbmd0aCA+IDApO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgcmV0dXJuIFtdO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlcyB0aGUgc2Vzc2lvbidzIENTViBmaWxlIGFuZCBpdHMgbG9jayBmaWxlLlxuICogTm8tb3AgaWYgZmlsZXMgZG9uJ3QgZXhpc3QuXG4gKlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gd2hvc2UgQ1NWIGFydGlmYWN0cyBzaG91bGQgYmUgZGVsZXRlZC5cbiAqIEB0aHJvd3MgRXJyb3Igd2hlbiBkZWxldGluZyBlaXRoZXIgZmlsZSBmYWlscyBmb3IgcmVhc29ucyBvdGhlciB0aGFuIGBFTk9FTlRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlU2Vzc2lvbkNzdihzZXNzaW9uSWQ6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBjc3ZQYXRoID0gZ2V0U2Vzc2lvbkNzdlBhdGgoc2Vzc2lvbklkKTtcbiAgY29uc3QgY3N2TG9ja1BhdGggPSBnZXRTZXNzaW9uQ3N2TG9ja1BhdGgoc2Vzc2lvbklkKTtcblxuICB0cnkge1xuICAgIHVubGlua1N5bmMoY3N2UGF0aCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKCFoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgdGhyb3cgZXJyb3I7XG4gIH1cblxuICB0cnkge1xuICAgIHVubGlua1N5bmMoY3N2TG9ja1BhdGgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmICghaGFzRXJybm9Db2RlKGVycm9yLCAnRU5PRU5UJykpIHRocm93IGVycm9yO1xuICB9XG59XG5cbi8qKlxuICogV3JpdGVzIGEgZ2l0IEhFQUQgU0hBIHRvIHRoZSBzZXNzaW9uJ3MgLmhlYWQgZmlsZS5cbiAqIENyZWF0ZXMgZGlyZWN0b3J5IGlmIGl0IGRvZXNuJ3QgZXhpc3QuXG4gKlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gd2hvc2UgSEVBRCBTSEEgc2hvdWxkIGJlIHN0b3JlZC5cbiAqIEBwYXJhbSBzaGEgLSBHaXQgY29tbWl0IFNIQSB0byBwZXJzaXN0LlxuICogQHRocm93cyBFcnJvciB3aGVuIGRpcmVjdG9yeSBjcmVhdGlvbiBvciBmaWxlIHdyaXRlIGZhaWxzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVTZXNzaW9uSGVhZFNoYShzZXNzaW9uSWQ6IHN0cmluZywgc2hhOiBzdHJpbmcpOiB2b2lkIHtcbiAgbWtkaXJTeW5jKGdldENhcmRSZXBvQ29tbWl0c0RpcigpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgbW9kZTogMG83MDAgfSk7XG4gIHdyaXRlRmlsZVN5bmMoZ2V0U2Vzc2lvbkhlYWRTaGFQYXRoKHNlc3Npb25JZCksIHNoYSwgeyBtb2RlOiAwbzYwMCB9KTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZ2l0IEhFQUQgU0hBIGZyb20gdGhlIHNlc3Npb24ncyAuaGVhZCBmaWxlLlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIHdob3NlIEhFQUQgU0hBIHNob3VsZCBiZSByZXRyaWV2ZWQuXG4gKiBAcmV0dXJucyBUaGUgc3RvcmVkIFNIQSB3aXRoIHdoaXRlc3BhY2UgdHJpbW1lZCwgb3IgYG51bGxgIHdoZW4gdGhlIGZpbGUgaXMgYWJzZW50LlxuICogQHRocm93cyBFcnJvciB3aGVuIGZpbGUgcmVhZCBmYWlscyBmb3IgcmVhc29ucyBvdGhlciB0aGFuIGBFTk9FTlRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFNlc3Npb25IZWFkU2hhKHNlc3Npb25JZDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHJlYWRGaWxlU3luYyhnZXRTZXNzaW9uSGVhZFNoYVBhdGgoc2Vzc2lvbklkKSwgJ3V0Zi04JykudHJpbSgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgcmV0dXJuIG51bGw7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBzZXNzaW9uJ3MgLmhlYWQgZmlsZS5cbiAqIE5vLW9wIGlmIGZpbGUgZG9lc24ndCBleGlzdC5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiB3aG9zZSAuaGVhZCBmaWxlIHNob3VsZCBiZSBkZWxldGVkLlxuICogQHRocm93cyBFcnJvciB3aGVuIGRlbGV0aW5nIHRoZSBmaWxlIGZhaWxzIGZvciByZWFzb25zIG90aGVyIHRoYW4gYEVOT0VOVGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVTZXNzaW9uSGVhZFNoYShzZXNzaW9uSWQ6IHN0cmluZyk6IHZvaWQge1xuICB0cnkge1xuICAgIHVubGlua1N5bmMoZ2V0U2Vzc2lvbkhlYWRTaGFQYXRoKHNlc3Npb25JZCkpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmICghaGFzRXJybm9Db2RlKGVycm9yLCAnRU5PRU5UJykpIHRocm93IGVycm9yO1xuICB9XG59XG4iLCAiLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENhcmRzIEV4dGVuc2lvbiBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICpcbiAqIFRoZSBleGVjdXRpb24gd3JhcHBlciBpbmplY3RzIGFjdGlvbiBhbmQgdHlwZSBob29rIGlucHV0cyB2aWEgcHJvY2Vzcy5lbnYuXG4gKiBUaGlzIG1vZHVsZSBwcm92aWRlcyBzdHJpY3QgZ2V0dGVycyBhbmQgdHlwZWQgZXh0cmFjdG9ycyBzbyBoYW5kbGVycyBkbyBub3RcbiAqIG5lZWQgdG8gcGFyc2UgZW52aXJvbm1lbnQgdmFyaWFibGVzIG1hbnVhbGx5LlxuICpcbiAqIFVzZSB0aGUgaW5kaXZpZHVhbCBnZXR0ZXJzIHdoZW4geW91IG9ubHkgbmVlZCBvbmUgdmFsdWU7IHVzZVxuICoge0BsaW5rIGV4dHJhY3RBY3Rpb25JbnB1dH0gb3Ige0BsaW5rIGV4dHJhY3RUeXBlSW5wdXR9IHdoZW4geW91IG5lZWQgYSBmdWxsXG4gKiB0eXBlZCBwYXlsb2FkIGZvciBhbiBhY3Rpb24gb3IgdHlwZSBob29rLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENhcmRzIEV4dGVuc2lvbiBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbklucHV0LCBUeXBlSG9va0lucHV0IH0gZnJvbSAnLi9pbnB1dHMuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lcyBzZXQgYnkgdGhlIENhcmRzIGV4ZWN1dGlvbiB3cmFwcGVyLlxuICpcbiAqIFRoaXMgaXMgdGhlIHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggZm9yIGVudiB2YXIga2V5cyB1c2VkIGJ5IGFjdGlvbiBhbmQgdHlwZVxuICogaG9vayBwcm9jZXNzZXMuIEtlZXAgaXQgaW4gc3luYyB3aXRoIHRoZSB3cmFwcGVyIHRvIGF2b2lkIHN1YnRsZSBcInVuZGVmaW5lZFxuICogaW5wdXRcIiBidWdzLlxuICovXG5leHBvcnQgY29uc3QgQ0FSRFNfRU5WX1ZBUlMgPSB7XG4gIC8qKlxuICAgKiBVbmlxdWUgaWRlbnRpZmllciBmb3IgdGhlIGN1cnJlbnQgY2FyZC5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQ0FSRF9JRDogJ0NBUkRfSUQnLFxuXG4gIC8qKlxuICAgKiBUaGUgZW52aXJvbm1lbnQgbmFtZSBmcm9tIHNldHRpbmdzLmpzb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEVOVklST05NRU5UOiAnRU5WSVJPTk1FTlQnLFxuXG4gIC8qKlxuICAgKiBEaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiBidXR0b24gdGhhdCB0cmlnZ2VyZWQgdGhpcyBoYW5kbGVyLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqL1xuICBBQ1RJT05fTkFNRTogJ0FDVElPTl9OQU1FJyxcblxuICAvKipcbiAgICogQ2FyZCdzIGV4ZWN1dGlvbiBtb2RlLCBkZXRlcm1pbmluZyBVSSBpbnRlcmFjdGlvbiBtb2RlbC5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKiBWYWxpZCB2YWx1ZXM6ICdpbnRlcmFjdGl2ZScgfCAnYmFja2dyb3VuZCdcbiAgICovXG4gIEVYRUNVVElPTl9NT0RFOiAnRVhFQ1VUSU9OX01PREUnLFxuXG4gIC8qKlxuICAgKiBDYXJkcyBzZXJ2ZXIgYmFzZSBVUkwgZm9yIEFQSSBjYWxscy5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQVBJX0JBU0VfVVJMOiAnQVBJX0JBU0VfVVJMJyxcblxuICAvKipcbiAgICogQXV0aGVudGljYXRpb24gdG9rZW4gZm9yIEFQSSBjYWxscy5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQVBJX0FDQ0VTU19UT0tFTjogJ0FQSV9BQ0NFU1NfVE9LRU4nLFxuXG4gIC8qKlxuICAgKiBDb25maWd1cmVkIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyIGZyb20gY2FyZHMuY29kaW5nQWdlbnQgc2V0dGluZy5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKiBPcHRpb25hbC5cbiAgICovXG4gIENPRElOR19BR0VOVDogJ0NPRElOR19BR0VOVCcsXG5cbiAgLyoqXG4gICAqIFRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFRZUEVfTkFNRTogJ1RZUEVfTkFNRScsXG5cbiAgLyoqXG4gICAqIFRoZSB0eXBlJ3MgdmVyc2lvbiBzdHJpbmcgZnJvbSBzZXR0aW5ncy5qc29uIGNvbmZpZ3VyYXRpb24uXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX1ZFUlNJT046ICdUWVBFX1ZFUlNJT04nLFxuXG4gIC8qKlxuICAgKiBUaGUgZmlsZSBuYW1lIHdpdGhpbiB0aGUgdHlwZSBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX05BTUU6ICdGSUxFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBGdWxsIHBhdGggdG8gdGhlIGZpbGUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX1BBVEg6ICdGSUxFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBGaWxlIHNpemUgaW4gYnl0ZXMuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX1NJWkU6ICdGSUxFX1NJWkUnLFxuXG4gIC8qKlxuICAgKiBTSEEyNTYgaGFzaCBvZiBjb250ZW50LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgU0hBMjU2OiAnU0hBMjU2JyxcblxuICAvKipcbiAgICogTUlNRSB0eXBlIG9mIHRoZSBjb250ZW50LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgQ09OVEVOVF9UWVBFOiAnQ09OVEVOVF9UWVBFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgcHJvY2Vzcy5leGVjUGF0aGAgKHdpdGhcbiAgICogYEVMRUNUUk9OX1JVTl9BU19OT0RFPTFgKS4gQ29tbWFuZHMgaW4gc2V0dGluZ3MuanNvbiB1c2VcbiAgICogYCRWU0NPREVfTk9ERSAuL2Jpbi8uLi5gIHNvIHRoZXkgd29yayByZWdhcmRsZXNzIG9mXG4gICAqIHdoZXRoZXIgYG5vZGVgIGlzIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgVlNDT0RFX05PREU6ICdWU0NPREVfTk9ERScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXIgcnVubmluZyB0aGUgd3JhcHBlciBwcm9jZXNzLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIHdyYXBwZXIgZnJvbSBgcHJvY2Vzcy5leGVjUGF0aGAuIFVzZSBgJE5PREVgIGluIGVtYmVkZGVkXG4gICAqIGJhc2ggc3RhdGVtZW50cyB0byBpbnZva2UgTm9kZSBzY3JpcHRzIHBvcnRhYmx5LlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMuXG4gICAqL1xuICBOT0RFOiAnTk9ERScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFVuaXggZG9tYWluIHNvY2tldCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBTT0NLRVRfUEFUSDogJ1NPQ0tFVF9QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byBhIEpTT04gZmlsZSBjb250YWluaW5nIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmcm9tIGEgcHJldmlvdXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS4gT3B0aW9uYWwuXG4gICAqL1xuICBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIOiAnU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIHNldHRpbmdzIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQ09ORklHX1BBVEg6ICdDT05GSUdfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgd29ya3NwYWNlIHJvb3QgZGlyZWN0b3J5LlxuICAgKiBTZXQgYnkgdGhlIGFjdGlvbiBoYW5kbGVyIChlLmcuLCBsYXVuY2gudHMpIHRvIHRoZSB3b3JrdHJlZSBwYXRoLlxuICAgKiBBdmFpbGFibGUgaW4gaG9va3MgcnVubmluZyBpbnNpZGUgdGhlIGNsYXVkZSBDTEkuXG4gICAqL1xuICBXT1JLU1BBQ0VfUEFUSDogJ1dPUktTUEFDRV9QQVRIJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IChOT1QgYSB3b3JrdHJlZSkuXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyBjb25zdW1lZCBieSB0aGUgd3JhcHBlciBhbmQgd2F0Y2hlciBmb3JcbiAgICogZ2l0IG9wZXJhdGlvbnMgKHdvcmt0cmVlIHJlbW92YWwsIGJyYW5jaCBkZWxldGlvbikgdGhhdCBtdXN0IHJ1blxuICAgKiBhZ2FpbnN0IHRoZSBtYWluIHJlcG9zaXRvcnkuXG4gICAqL1xuICBSRVBPX1JPT1Q6ICdSRVBPX1JPT1QnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDQVJEX1JFUE9fUEFUSDogJ0NBUkRfUkVQT19QQVRIJyxcblxuICAvKipcbiAgICogUmVzb2x2ZWQgc2hlbGwgY29tbWFuZCBmb3IgdGhlIHdyYXBwZXIgdG8gc3Bhd24gYXMgdGhlIGFjdGlvbiBoYW5kbGVyLlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgY29uc3VtZWQgYnkgdGhlIHdyYXBwZXIgKG5vdCBieSBhY3Rpb24gaGFuZGxlcnMpLlxuICAgKi9cbiAgQUNUSU9OX0NPTU1BTkQ6ICdBQ1RJT05fQ09NTUFORCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggdGhhdCB0aGUgY2FyZCdzIHdvcmtzcGFjZSBicmFuY2ggd2lsbCBtZXJnZSBpbnRvLlxuICAgKiBSZXNvbHZlZCBmcm9tIHRoZSB3b3Jrc3BhY2UgSEVBRCBhdCBsYXVuY2ggdGltZS5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQkFTRV9CUkFOQ0g6ICdCQVNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggZnJvbSB3aGljaCB0aGUgY2FyZCdzIHdvcmtzcGFjZSBicmFuY2ggd2FzIGNyZWF0ZWQuXG4gICAqIE1heSBkaWZmZXIgZnJvbSBCQVNFX0JSQU5DSCB3aGVuIHRoZSB3b3JrdHJlZSB3YXMgY3JlYXRlZCBhZ2FpbnN0XG4gICAqIGEgZGlmZmVyZW50IHJlZiB0aGFuIHRoZSBjdXJyZW50IHdvcmtzcGFjZSBIRUFELlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBQQVJFTlRfQlJBTkNIOiAnUEFSRU5UX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggbmFtZSBmb3IgdGhlIGNhcmQncyB3b3Jrc3BhY2UgaW1wbGVtZW50YXRpb24uXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbiBhZnRlciByZXNvbHZpbmcgb3IgY3JlYXRpbmcgdGhlIHdvcmt0cmVlLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgV09SS1NQQUNFX0JSQU5DSDogJ1dPUktTUEFDRV9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBTZXNzaW9uIElEIHBlcnNpc3RlZCBieSB0aGUgc2Vzc2lvbi1zdGFydCBob29rIHZpYSBgcGVyc2lzdEVudlZhcmAuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBCYXNoIHRvb2wgc2hlbGwgZGVzY2VuZGFudHMgKGNvbW1hbmRzLCBnaXQgaG9va3MpIGFmdGVyXG4gICAqIHNlc3Npb24gc3RhcnQuIE5PVCBhdmFpbGFibGUgaW4gaG9va3Mgc3Bhd25lZCBkaXJlY3RseSBieSBDbGF1ZGUgQ29kZVxuICAgKiAoc3RvcCwgc2Vzc2lvbi1lbmQsIGV0Yy4pIFx1MjAxNCB0aG9zZSByZWNlaXZlIHRoZSBzZXNzaW9uIElEIHZpYSBob29rIGlucHV0LlxuICAgKlxuICAgKiBUaGUgY2FyZC1yZXBvIHBvc3QtY29tbWl0IGhvb2sgcmVhZHMgdGhpcyB0byByZWNvcmQgY29tbWl0cyBkaXJlY3RseVxuICAgKiB3aXRob3V0IG5lZWRpbmcgYSBwcm9jZXNzLXRyZWUgd2FsayBvciBQSUQgcmVnaXN0cnkgbG9va3VwLlxuICAgKi9cbiAgQ0FSRFNfU0VTU0lPTl9JRDogJ0NBUkRTX1NFU1NJT05fSUQnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBWUyBDb2RlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5LlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gICAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAgICogYXMgdGhlIHJ1bnRpbWUgcGx1Z2luIGRpcmVjdG9yeSAoYDxleHRlbnNpb25QYXRoPi9kaXN0L3BsdWdpbnMvcnVudGltZWApLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqL1xuICBFWFRFTlNJT05fUEFUSDogJ0VYVEVOU0lPTl9QQVRIJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgQ2FyZHMgaG9va3MgbG9nIGZpbGUuXG4gICAqXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyIGF0IHJ1bnRpbWUuIFJlYWQgYnkgdGhlIExvZ2dlciBzaW5nbGV0b25cbiAgICogYXQgY29uc3RydWN0aW9uIHRpbWUgdG8gZGV0ZXJtaW5lIHdoZXJlIGhvb2sgZXhlY3V0aW9uIGxvZ3MgYXJlIHdyaXR0ZW4uXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEhPT0tTX0xPR19GSUxFOiAnQ0FSRFNfSE9PS1NfTE9HX0ZJTEUnXG59IGFzIGNvbnN0O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJbmRpdmlkdWFsIEdldHRlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSBleGVjdXRpb24gd3JhcHBlciBhbHdheXMgc2V0cyB0aGlzIGZvciBldmVyeSBhY3Rpb24gYW5kIHR5cGUgaG9vay5cbiAqIEByZXR1cm5zIFRoZSBjdXJyZW50IGNhcmQgSURcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0FSRF9JRCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2FyZElkID0gZ2V0Q2FyZElkKCk7XG4gKiBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyBjYXJkOiAke2NhcmRJZH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FyZElkKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX0lEfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZW52aXJvbm1lbnQgbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZhbHVlIG1hdGNoZXMgdGhlIGVudmlyb25tZW50IGtleSBpbiBzZXR0aW5ncy5qc29uIChlLmcuLCBcImRlZmF1bHRcIiwgXCJzdGFnaW5nXCIpLlxuICogQHJldHVybnMgVGhlIGVudmlyb25tZW50IG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRU5WSVJPTk1FTlQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudmlyb25tZW50ID0gZ2V0RW52aXJvbm1lbnQoKTtcbiAqIGNvbnNvbGUubG9nKGBFbnZpcm9ubWVudDogJHtlbnZpcm9ubWVudH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52aXJvbm1lbnQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFjdGlvbiBidXR0b24gbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHRoZSBkaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgaGFuZGxlciwgbWF0Y2hpbmdcbiAqIHRoZSBgYWN0aW9uTmFtZWAgZmllbGQgZnJvbSBgZGVmaW5lQWN0aW9uYC5cbiAqIEByZXR1cm5zIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBjdXJyZW50IGhhbmRsZXIgcnVuLlxuICogQHRocm93cyBFcnJvciBpZiBBQ1RJT05fTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYWN0aW9uTmFtZSA9IGdldEFjdGlvbk5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBSdW5uaW5nIGFjdGlvbjogJHthY3Rpb25OYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3Rpb25OYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBleGVjdXRpb24gbW9kZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBEZXRlcm1pbmVzIHRoZSBVSSBpbnRlcmFjdGlvbiBtb2RlbCBmb3IgYWN0aW9ucy5cbiAqIEByZXR1cm5zIFRoZSBleGVjdXRpb24gbW9kZSAoJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcpXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYRUNVVElPTl9NT0RFIGlzIG1pc3NpbmcsIGVtcHR5LCBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgbW9kZSA9IGdldEV4ZWN1dGlvbk1vZGUoKTtcbiAqIGlmIChtb2RlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gKiAgIC8vIFNob3cgdXNlciBwcm9tcHRzXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4ZWN1dGlvbk1vZGUoKTogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9YCk7XG4gIH1cbiAgaWYgKHZhbHVlICE9PSAnaW50ZXJhY3RpdmUnICYmIHZhbHVlICE9PSAnYmFja2dyb3VuZCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX06IGV4cGVjdGVkICdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYmFzZSBVUkwgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVXNlIHRoaXMgYXMgdGhlIGJhc2UgZm9yIGNvbnN0cnVjdGluZyBBUEkgZW5kcG9pbnRzLiBUaGUgVVJMIGRvZXMgbm90IGluY2x1ZGVcbiAqIGEgdHJhaWxpbmcgc2xhc2guXG4gKiBAcmV0dXJucyBCYXNlIFVSTCB1c2VkIHRvIGNvbnN0cnVjdCBDYXJkcyBBUEkgZW5kcG9pbnRzIGZvciB0aGlzIGV4ZWN1dGlvbi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0JBU0VfVVJMIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhcGlVcmwgPSBnZXRBcGlCYXNlVXJsKCk7XG4gKiBjb25zdCBlbmRwb2ludCA9IGAke2FwaVVybH0vY2FyZHMvJHtjYXJkSWR9YDtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQmFzZVVybCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkx9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYWNjZXNzIHRva2VuIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIEJlYXJlciB0b2tlbiB2YWxpZCBmb3IgdGhlIGR1cmF0aW9uIG9mIHRoaXMgYWN0aW9uIG9yIHR5cGUgaG9vayBleGVjdXRpb24uXG4gKiBJbmNsdWRlIGluIEF1dGhvcml6YXRpb24gaGVhZGVycyB3aGVuIGNhbGxpbmcgdGhlIENhcmRzIEFQSS5cbiAqIEByZXR1cm5zIEJlYXJlciB0b2tlbiB0aGF0IGF1dGhvcml6ZXMgQVBJIHJlcXVlc3RzIGZvciB0aGlzIGV4ZWN1dGlvbiBjb250ZXh0LlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQUNDRVNTX1RPS0VOIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0b2tlbiA9IGdldEFwaUFjY2Vzc1Rva2VuKCk7XG4gKiBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGFwaVVybCwge1xuICogICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0b2tlbn1gIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlBY2Nlc3NUb2tlbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU5dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGNvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogT3B0aW9uYWwgdmFsdWUgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLiBXaGVuIHNldCwgaW5kaWNhdGVzIHdoaWNoIEFJXG4gKiBjb2RpbmcgYXNzaXN0YW50IHRoZSB1c2VyIHByZWZlcnMuIEFjdGlvbnMgY2FuIHVzZSB0aGlzIHRvIGN1c3RvbWl6ZSBiZWhhdmlvclxuICogb3IgcHJvbXB0cyBmb3IgZGlmZmVyZW50IGFnZW50cy5cbiAqIEByZXR1cm5zIFRoZSBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb2RpbmdBZ2VudCA9IGdldENvZGluZ0FnZW50KCk7XG4gKiBpZiAoY29kaW5nQWdlbnQgPT09ICdjbGF1ZGUnKSB7XG4gKiAgIC8vIEN1c3RvbWl6ZSBmb3IgQ2xhdWRlXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvZGluZ0FnZW50KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ESU5HX0FHRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lIGZvciB0eXBlIGhvb2tzLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgb25seSBwcmVzZW50IGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICogQHJldHVybnMgVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdHlwZU5hbWUgPSBnZXRUeXBlTmFtZSgpO1xuICogY29uc29sZS5sb2coYFR5cGU6ICR7dHlwZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGUgdmVyc2lvbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZlcnNpb24gY29tZXMgZnJvbSB0aGUgdHlwZSBjb25maWd1cmF0aW9uIGluIHNldHRpbmdzLmpzb24uXG4gKiBAcmV0dXJucyBUaGUgdmVyc2lvbiBzdHJpbmcgZnJvbSB0eXBlIGNvbmZpZ1xuICogQHRocm93cyBFcnJvciBpZiBUWVBFX1ZFUlNJT04gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHZlcnNpb24gPSBnZXRUeXBlVmVyc2lvbigpO1xuICogY29uc29sZS5sb2coYFZlcnNpb246ICR7dmVyc2lvbn1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZVZlcnNpb24oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT05dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBuYW1lIGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZpbGUgbmFtZSByZWxhdGl2ZSB0byB0aGUgdHlwZSBkaXJlY3RvcnksIG5vdCBhIGZ1bGwgcGF0aC5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBGaWxlOiAke2ZpbGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSB0eXBlZCBmaWxlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZ1bGx5IHJlc29sdmVkIHBhdGggb24gZGlzayBwcm92aWRlZCBieSB0aGUgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKiBAcmV0dXJucyBUaGUgZnVsbCBwYXRoIHRvIHRoZSBmaWxlXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZVBhdGggPSBnZXRGaWxlUGF0aCgpO1xuICogY29uc29sZS5sb2coYFBhdGg6ICR7ZmlsZVBhdGh9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgc2l6ZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgdmFsdWUgaXMgcGFyc2VkIGFzIGEgYmFzZS0xMCBpbnRlZ2VyLlxuICogQHJldHVybnMgVGhlIGZpbGUgc2l6ZSBpbiBieXRlc1xuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1NJWkUgaXMgbWlzc2luZyBvciBub3QgYSBudW1iZXJcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBzaXplID0gZ2V0RmlsZVNpemUoKTtcbiAqIGNvbnNvbGUubG9nKGBTaXplOiAke3NpemV9IGJ5dGVzYCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVTaXplKCk6IG51bWJlciB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX1gKTtcbiAgfVxuICBjb25zdCBzaXplID0gTnVtYmVyLnBhcnNlSW50KHZhbHVlLCAxMCk7XG4gIGlmIChOdW1iZXIuaXNOYU4oc2l6ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9OiBleHBlY3RlZCBudW1iZXIsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gc2l6ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgU0hBMjU2IGhhc2ggZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogVXNlZnVsIGZvciBkZXRlY3RpbmcgY29udGVudCBjaGFuZ2VzIHdpdGhvdXQgcmVhZGluZyB0aGUgZmlsZSBhZ2Fpbi5cbiAqIEByZXR1cm5zIFRoZSBTSEEyNTYgaGFzaCBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBTSEEyNTYgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGhhc2ggPSBnZXRTaGEyNTYoKTtcbiAqIGNvbnNvbGUubG9nKGBIYXNoOiAke2hhc2h9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNoYTI1NigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNIQTI1Nl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TSEEyNTZ9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBNSU1FIHR5cGUgZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogUHJvdmlkZWQgZm9yIHR5cGUgaG9vayBldmVudHMgc28gdmFsaWRhdG9ycyBjYW4gYnJhbmNoIG9uIGNvbnRlbnQgdHlwZS5cbiAqIEByZXR1cm5zIFRoZSBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09OVEVOVF9UWVBFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb250ZW50VHlwZSA9IGdldENvbnRlbnRUeXBlKCk7XG4gKiBjb25zb2xlLmxvZyhgQ29udGVudCB0eXBlOiAke2NvbnRlbnRUeXBlfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb250ZW50VHlwZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlciBwYXRoIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgc2V0IGJ5IHRoZSBleHRlbnNpb24gZHVyaW5nIGFjdGl2YXRpb24gYW5kIGluamVjdGVkIGludG8gYWxsXG4gKiBzcGF3bmVkIGFjdGlvbi9ob29rIHByb2Nlc3Nlcy4gQ29uZmlndXJhdGlvbiBhdXRob3JzIGNhbiB1c2UgaXQgdG8gaW52b2tlXG4gKiBOb2RlLmpzIHdpdGhvdXQgcmVseWluZyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gKlxuICogQHJldHVybnMgVGhlIHBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXJcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVlNDT0RFX05PREUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG5vZGVQYXRoID0gZ2V0VnNjb2RlTm9kZVBhdGgoKTtcbiAqIGV4ZWNGaWxlU3luYyhub2RlUGF0aCwgWydzY3JpcHQuanMnXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFZzY29kZU5vZGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgcGF0aCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gKlxuICogQHJldHVybnMgVW5peCBzb2NrZXQgcGF0aCB1c2VkIHRvIHNlbmQgcnVudGltZSBjb250cm9sIG1lc3NhZ2VzLlxuICogQHRocm93cyBFcnJvciBpZiBTT0NLRVRfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb2NrZXRQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBwYXRoIHRvIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIG9wdGlvbmFsIFx1MjAxNCByZXR1cm5zIHVuZGVmaW5lZCB3aGVuIG5vdCBzZXQgKGkuZS4sIHRoZSBhY3Rpb25cbiAqIHdhcyBub3QgcmVsYXVuY2hlZCB2aWEgc3dpdGNoVG9JbnRlcmFjdGl2ZSkuXG4gKlxuICogQHJldHVybnMgVGhlIGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBkaXJlY3RvcnkgY29udGFpbmluZyBnZW5lcmF0ZWQgc2V0dGluZ3MgYXJ0aWZhY3RzLlxuICogQHRocm93cyBFcnJvciBpZiBDT05GSUdfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWdQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB3b3Jrc3BhY2UgcGF0aCBzZXQgYnkgdGhlIGFjdGlvbiBoYW5kbGVyIChlLmcuLCB0aGUgd29ya3RyZWUgcGF0aCkuXG4gKlxuICogVGhpcyBpcyBmb3IgaG9va3MgcnVubmluZyBpbnNpZGUgdGhlIENsYXVkZSBDTEksICoqbm90KiogZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqIEFjdGlvbiBoYW5kbGVycyBzaG91bGQgdXNlIHtAbGluayBnZXRSZXBvUm9vdH0gaW5zdGVhZC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBhY3RpdmUgd29ya3NwYWNlIC8gd29ya3RyZWUuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFdPUktTUEFDRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFdvcmtzcGFjZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCBwYXRoLlxuICpcbiAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyB1c2VkIGJ5IGFjdGlvbiBoYW5kbGVycyB0byByZXNvbHZlIHdvcmt0cmVlc1xuICogYW5kIHBlcmZvcm0gZ2l0IG9wZXJhdGlvbnMgYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICogQHRocm93cyBFcnJvciBpZiBSRVBPX1JPT1QgaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVwb1Jvb3QoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1RdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuUkVQT19ST09UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgcmVwb3NpdG9yeSBhc3NvY2lhdGVkIHdpdGggdGhlIGFjdGl2ZSBjYXJkLlxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX1JFUE9fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkUmVwb1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYVEVOU0lPTl9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVuc2lvblBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHBhcnNlcyB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogV2hlbiBgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSGAgaXMgc2V0LCByZWFkcyB0aGUgZmlsZSBhdCB0aGF0IHBhdGhcbiAqIGFuZCBwYXJzZXMgaXQgYXMgSlNPTi4gUmV0dXJucyB1bmRlZmluZWQgaWYgdGhlIGVudiB2YXIgaXMgbm90IHNldC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGFyc2VkIGRhdGEsIG9yIHVuZGVmaW5lZCBpZiB0aGUgcGF0aCBpcyBub3Qgc2V0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBmaWxlIGNhbm5vdCBiZSByZWFkIG9yIGNvbnRhaW5zIGludmFsaWQgSlNPTlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCk6IHVua25vd24gfCB1bmRlZmluZWQge1xuICBjb25zdCBkYXRhUGF0aCA9IGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpO1xuICBpZiAoZGF0YVBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhkYXRhUGF0aCwgJ3V0Zi04Jyk7XG4gIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlZCBJbnB1dCBFeHRyYWN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgYWN0aW9uIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKlxuICogQHJldHVybnMgVHlwZWQgQWN0aW9uSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYW4gYWN0aW9uIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5jYXJkSWQpO1xuICogY29uc29sZS5sb2coaW5wdXQuZXhlY3V0aW9uTW9kZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBY3Rpb25JbnB1dCgpOiBBY3Rpb25JbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBhY3Rpb25OYW1lOiBnZXRBY3Rpb25OYW1lKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgZXhlY3V0aW9uTW9kZTogZ2V0RXhlY3V0aW9uTW9kZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKSxcbiAgICBjb2RpbmdBZ2VudDogZ2V0Q29kaW5nQWdlbnQoKSxcbiAgICBzd2l0Y2hUb0ludGVyYWN0aXZlRGF0YTogcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCksXG4gICAgcmVwb1Jvb3Q6IGdldFJlcG9Sb290KCksXG4gICAgY2FyZFJlcG9QYXRoOiBnZXRDYXJkUmVwb1BhdGgoKSxcbiAgICBjb25maWdQYXRoOiBnZXRDb25maWdQYXRoKCksXG4gICAgZXh0ZW5zaW9uUGF0aDogZ2V0RXh0ZW5zaW9uUGF0aCgpXG4gIH07XG59XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgdHlwZSBob29rIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciB0eXBlIGxpZmVjeWNsZSBob29rcyAodmFsaWRhdG9yLCBjcmVhdGUsXG4gKiB1cGRhdGUsIGRlbGV0ZSkuXG4gKlxuICogQHJldHVybnMgVHlwZWQgVHlwZUhvb2tJbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhIHR5cGUgaG9vayBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RUeXBlSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LnR5cGVOYW1lKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmZpbGVOYW1lKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFR5cGVJbnB1dCgpOiBUeXBlSG9va0lucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIHR5cGVOYW1lOiBnZXRUeXBlTmFtZSgpLFxuICAgIHR5cGVWZXJzaW9uOiBnZXRUeXBlVmVyc2lvbigpLFxuICAgIGZpbGVOYW1lOiBnZXRGaWxlTmFtZSgpLFxuICAgIGZpbGVQYXRoOiBnZXRGaWxlUGF0aCgpLFxuICAgIGZpbGVTaXplOiBnZXRGaWxlU2l6ZSgpLFxuICAgIGZpbGVTaGEyNTY6IGdldFNoYTI1NigpLFxuICAgIGNvbnRlbnRUeXBlOiBnZXRDb250ZW50VHlwZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKVxuICB9O1xufVxuIiwgIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBhY2Nlc3MgdG8gQ2xhdWRlIENvZGUncyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHV0aWxpdGllc1xuICogZm9yIHBlcnNpc3RpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzIGluIFNlc3Npb25TdGFydCBob29rcy5cbiAqXG4gKiAjIyBFbnZpcm9ubWVudCBWYXJpYWJsZXNcbiAqXG4gKiBDbGF1ZGUgQ29kZSBzZXRzIHRoZXNlIGVudmlyb25tZW50IHZhcmlhYmxlcyB3aGVuIHJ1bm5pbmcgaG9va3M6XG4gKlxuICogfCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHwgQXZhaWxhYmxlIEluIHxcbiAqIHwtLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS18XG4gKiB8IGBDTEFVREVfUFJPSkVDVF9ESVJgIHwgQWJzb2x1dGUgcGF0aCB0byBwcm9qZWN0IHJvb3QgfCBBbGwgaG9va3MgfFxuICogfCBgQ0xBVURFX0VOVl9GSUxFYCB8IFBhdGggdG8gZmlsZSBmb3IgcGVyc2lzdGluZyBlbnYgdmFycyB8IFNlc3Npb25TdGFydCBvbmx5IHxcbiAqIHwgYENMQVVERV9DT0RFX1JFTU9URWAgfCBgXCJ0cnVlXCJgIGlmIHJ1bm5pbmcgcmVtb3RlbHkgfCBBbGwgaG9va3MgfFxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGdldFByb2plY3REaXIsIHBlcnNpc3RFbnZWYXIsIGlzUmVtb3RlRW52aXJvbm1lbnQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEdldCBwcm9qZWN0IGRpcmVjdG9yeVxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqXG4gKiAvLyBDaGVjayBpZiBydW5uaW5nIHJlbW90ZWx5XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIEhhbmRsZSByZW1vdGUtc3BlY2lmaWMgbG9naWNcbiAqIH1cbiAqXG4gKiAvLyBJbiBTZXNzaW9uU3RhcnQgaG9vazogcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ3Byb2R1Y3Rpb24nKTtcbiAqIHBlcnNpc3RFbnZWYXIoJ0FQSV9LRVknLCAnc2VjcmV0LWtleScpO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1leGVjdXRpb24tZGV0YWlsc1xuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwibm9kZTpmc1wiO1xuLyoqXG4gKiBDbGF1ZGUgQ29kZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lcy5cbiAqXG4gKiBUaGVzZSBhcmUgdGhlIGVudmlyb25tZW50IHZhcmlhYmxlcyB0aGF0IENsYXVkZSBDb2RlIHNldHMgd2hlbiBydW5uaW5nIGhvb2tzLlxuICovXG5leHBvcnQgY29uc3QgQ0xBVURFX0VOVl9WQVJTID0ge1xuICAgIC8qKlxuICAgICAqIEFic29sdXRlIHBhdGggdG8gdGhlIHByb2plY3Qgcm9vdCBkaXJlY3Rvcnkgd2hlcmUgQ2xhdWRlIENvZGUgd2FzIHN0YXJ0ZWQuXG4gICAgICogQXZhaWxhYmxlIGluIGFsbCBob29rcy5cbiAgICAgKi9cbiAgICBQUk9KRUNUX0RJUjogXCJDTEFVREVfUFJPSkVDVF9ESVJcIixcbiAgICAvKipcbiAgICAgKiBQYXRoIHRvIGEgZmlsZSB3aGVyZSBTZXNzaW9uU3RhcnQgaG9va3MgY2FuIHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICAgICAqIFZhcmlhYmxlcyB3cml0dGVuIHRvIHRoaXMgZmlsZSB3aWxsIGJlIGF2YWlsYWJsZSBpbiBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzLlxuICAgICAqIE9ubHkgYXZhaWxhYmxlIGluIFNlc3Npb25TdGFydCBob29rcy5cbiAgICAgKi9cbiAgICBFTlZfRklMRTogXCJDTEFVREVfRU5WX0ZJTEVcIixcbiAgICAvKipcbiAgICAgKiBTZXQgdG8gXCJ0cnVlXCIgd2hlbiBydW5uaW5nIGluIGEgcmVtb3RlICh3ZWIpIGVudmlyb25tZW50LlxuICAgICAqIE5vdCBzZXQgb3IgZW1wdHkgd2hlbiBydW5uaW5nIGluIGxvY2FsIENMSSBlbnZpcm9ubWVudC5cbiAgICAgKi9cbiAgICBSRU1PVEU6IFwiQ0xBVURFX0NPREVfUkVNT1RFXCIsXG59O1xuLyoqXG4gKiBHZXRzIHRoZSBDbGF1ZGUgQ29kZSBwcm9qZWN0IGRpcmVjdG9yeS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwcm9qZWN0IHJvb3Qgd2hlcmUgQ2xhdWRlIENvZGUgd2FzIHN0YXJ0ZWQuXG4gKiBUaGUgdmFsdWUgY29tZXMgZnJvbSB0aGUgYENMQVVERV9QUk9KRUNUX0RJUmAgZW52aXJvbm1lbnQgdmFyaWFibGUuXG4gKiBAcmV0dXJucyBUaGUgcHJvamVjdCBkaXJlY3RvcnkgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBwcm9qZWN0RGlyID0gZ2V0UHJvamVjdERpcigpO1xuICogaWYgKHByb2plY3REaXIpIHtcbiAqICAgY29uc3QgY29uZmlnUGF0aCA9IGAke3Byb2plY3REaXJ9Ly5jbGF1ZGUvY29uZmlnLmpzb25gO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0RGlyKCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuUFJPSkVDVF9ESVJdO1xufVxuLyoqXG4gKiBHZXRzIHRoZSBDbGF1ZGUgQ29kZSBlbnYgZmlsZSBwYXRoIGZvciBwZXJzaXN0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBUaGlzIGlzIG9ubHkgYXZhaWxhYmxlIGluIFNlc3Npb25TdGFydCBob29rcy4gVGhlIHBhdGggcG9pbnRzIHRvIGEgZmlsZVxuICogd2hlcmUgeW91IGNhbiB3cml0ZSBzaGVsbCBleHBvcnQgc3RhdGVtZW50cyB0byBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogZm9yIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMgaW4gdGhlIHNlc3Npb24uXG4gKiBAcmV0dXJucyBUaGUgZW52IGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXQgKG5vdCBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudkZpbGUgPSBnZXRFbnZGaWxlUGF0aCgpO1xuICogaWYgKGVudkZpbGUpIHtcbiAqICAgLy8gV2UncmUgaW4gYSBTZXNzaW9uU3RhcnQgaG9vayBhbmQgY2FuIHBlcnNpc3QgZW52IHZhcnNcbiAqICAgcGVyc2lzdEVudlZhcignTVlfVkFSJywgJ215LXZhbHVlJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudkZpbGVQYXRoKCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuRU5WX0ZJTEVdO1xufVxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGhvb2sgaXMgcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAqXG4gKiBSZW1vdGUgZW52aXJvbm1lbnRzIG1heSBoYXZlIGRpZmZlcmVudCBjYXBhYmlsaXRpZXMgb3IgcmVzdHJpY3Rpb25zXG4gKiBjb21wYXJlZCB0byBsb2NhbCBDTEkgZW52aXJvbm1lbnRzLlxuICogQHJldHVybnMgdHJ1ZSBpZiBydW5uaW5nIHJlbW90ZWx5LCBmYWxzZSBpZiBydW5uaW5nIGxvY2FsbHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIFVzZSB3ZWItY29tcGF0aWJsZSBhcHByb2FjaGVzXG4gKiB9IGVsc2Uge1xuICogICAvLyBDYW4gdXNlIGxvY2FsIENMSSBmZWF0dXJlc1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1JlbW90ZUVudmlyb25tZW50KCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuUkVNT1RFXSA9PT0gXCJ0cnVlXCI7XG59XG4vKipcbiAqIFBlcnNpc3RzIGFuIGVudmlyb25tZW50IHZhcmlhYmxlIGZvciB1c2UgaW4gc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gd3JpdGVzIGEgc2hlbGwgZXhwb3J0IHN0YXRlbWVudCB0byB0aGUgYENMQVVERV9FTlZfRklMRWAsXG4gKiB3aGljaCBDbGF1ZGUgQ29kZSBzb3VyY2VzIGJlZm9yZSBydW5uaW5nIGJhc2ggY29tbWFuZHMuIFRoaXMgYWxsb3dzXG4gKiBTZXNzaW9uU3RhcnQgaG9va3MgdG8gY29uZmlndXJlIHRoZSBlbnZpcm9ubWVudCBmb3IgdGhlIGVudGlyZSBzZXNzaW9uLlxuICpcbiAqICoqSW1wb3J0YW50Kio6IFRoaXMgZnVuY3Rpb24gb25seSB3b3JrcyBpbiBTZXNzaW9uU3RhcnQgaG9va3Mgd2hlcmVcbiAqIGBDTEFVREVfRU5WX0ZJTEVgIGlzIHNldC4gSW4gb3RoZXIgaG9va3MsIGl0IHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gKiBAcGFyYW0gbmFtZSAtIFRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGUgdmFsdWUgKHdpbGwgYmUgc2hlbGwtZXNjYXBlZClcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0xBVURFX0VOVl9GSUxFIGlzIG5vdCBzZXQgKG5vdCBpbiBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25TdGFydEhvb2ssIHNlc3Npb25TdGFydE91dHB1dCwgcGVyc2lzdEVudlZhciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7fSwgYXN5bmMgKGlucHV0KSA9PiB7XG4gKiAgIC8vIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0aGUgc2Vzc2lvblxuICogICBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdwcm9kdWN0aW9uJyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ0FQSV9LRVknLCBwcm9jZXNzLmVudi5NWV9BUElfS0VZID8/ICdkZWZhdWx0Jyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ1BBVEgnLCBgJHtwcm9jZXNzLmVudi5QQVRIfTouL25vZGVfbW9kdWxlcy8uYmluYCk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcGVyc2lzdGluZy1lbnZpcm9ubWVudC12YXJpYWJsZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcnNpc3RFbnZWYXIobmFtZSwgdmFsdWUpIHtcbiAgICBjb25zdCBlbnZGaWxlID0gZ2V0RW52RmlsZVBhdGgoKTtcbiAgICBpZiAoZW52RmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInBlcnNpc3RFbnZWYXIgY2FuIG9ubHkgYmUgdXNlZCBpbiBTZXNzaW9uU3RhcnQgaG9va3MuIFwiICsgXCJDTEFVREVfRU5WX0ZJTEUgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgbm90IHNldC5cIik7XG4gICAgfVxuICAgIC8vIFNoZWxsLWVzY2FwZSB0aGUgdmFsdWUgdG8gaGFuZGxlIHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgIGNvbnN0IGVzY2FwZWRWYWx1ZSA9IGVzY2FwZVNoZWxsVmFsdWUodmFsdWUpO1xuICAgIC8vIFdyaXRlIHRoZSBleHBvcnQgc3RhdGVtZW50XG4gICAgY29uc3QgZXhwb3J0U3RhdGVtZW50ID0gYGV4cG9ydCAke25hbWV9PSR7ZXNjYXBlZFZhbHVlfVxcbmA7XG4gICAgZnMuYXBwZW5kRmlsZVN5bmMoZW52RmlsZSwgZXhwb3J0U3RhdGVtZW50LCBcInV0Zi04XCIpO1xufVxuLyoqXG4gKiBQZXJzaXN0cyBtdWx0aXBsZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYXQgb25jZS5cbiAqXG4gKiBUaGlzIGlzIGEgY29udmVuaWVuY2Ugd3JhcHBlciBhcm91bmQgYHBlcnNpc3RFbnZWYXJgIGZvciBzZXR0aW5nXG4gKiBtdWx0aXBsZSB2YXJpYWJsZXMgaW4gYSBzaW5nbGUgY2FsbC5cbiAqIEBwYXJhbSB2YXJzIC0gT2JqZWN0IG1hcHBpbmcgdmFyaWFibGUgbmFtZXMgdG8gdmFsdWVzXG4gKiBAdGhyb3dzIEVycm9yIGlmIENMQVVERV9FTlZfRklMRSBpcyBub3Qgc2V0IChub3QgaW4gYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwZXJzaXN0RW52VmFycyh7XG4gKiAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gKiAgIEFQSV9LRVk6ICdzZWNyZXQnLFxuICogICBERUJVRzogJ2ZhbHNlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcnNpc3RFbnZWYXJzKHZhcnMpIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXModmFycykpIHtcbiAgICAgICAgcGVyc2lzdEVudlZhcihuYW1lLCB2YWx1ZSk7XG4gICAgfVxufVxuLyoqXG4gKiBFc2NhcGVzIGEgdmFsdWUgZm9yIHNhZmUgdXNlIGluIGEgc2hlbGwgZXhwb3J0IHN0YXRlbWVudC5cbiAqXG4gKiBVc2VzIHNpbmdsZSBxdW90ZXMgYW5kIGVzY2FwZXMgYW55IGVtYmVkZGVkIHNpbmdsZSBxdW90ZXMuXG4gKiBUaGlzIHByZXZlbnRzIHNoZWxsIGluamVjdGlvbiBhbmQgaGFuZGxlcyBzcGVjaWFsIGNoYXJhY3RlcnMuXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gZXNjYXBlXG4gKiBAcmV0dXJucyBUaGUgc2hlbGwtZXNjYXBlZCB2YWx1ZSAod2l0aCBxdW90ZXMpXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZXNjYXBlU2hlbGxWYWx1ZSh2YWx1ZSkge1xuICAgIC8vIFVzZSBzaW5nbGUgcXVvdGVzIGFuZCBlc2NhcGUgYW55IGVtYmVkZGVkIHNpbmdsZSBxdW90ZXNcbiAgICAvLyAndmFsdWUnIC0+ICd2YWwnXFwnJ3VlJyBmb3IgdmFsdWVzIGNvbnRhaW5pbmcgc2luZ2xlIHF1b3Rlc1xuICAgIGNvbnN0IGVzY2FwZWQgPSB2YWx1ZS5yZXBsYWNlKC8nL2csIFwiJ1xcXFwnJ1wiKTtcbiAgICByZXR1cm4gYCcke2VzY2FwZWR9J2A7XG59XG4iLCAiLyoqXG4gKiBIb29rIGZhY3RvcnkgZnVuY3Rpb25zIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBmYWN0b3J5IGZ1bmN0aW9ucyBmb3IgYWxsIDEyIGhvb2sgdHlwZXMgdGhhdCBoYW5kbGU6XG4gKiAtIElucHV0IHR5cGUgbmFycm93aW5nIGJhc2VkIG9uIGhvb2sgZXZlbnQgdHlwZVxuICogLSBPdXRwdXQgdHlwZSBlbmZvcmNlbWVudCB2aWEgcmV0dXJuIHR5cGVzXG4gKiAtIEVycm9yIHdyYXBwaW5nIHdpdGggYXV0b21hdGljIGxvZ2dpbmdcbiAqIC0gTG9nZ2VyIGNvbnRleHQgaW5qZWN0aW9uXG4gKlxuICogRWFjaCBmYWN0b3J5IGFjY2VwdHMgYSBIb29rQ29uZmlnIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dCBzZXR0aW5ncyxcbiAqIGFuZCByZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB0aGUgcnVudGltZSBpbnZva2VzIHdoZW4gdGhlIGhvb2sgZmlsZSBleGVjdXRlcy5cbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBHZW5lcmljIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIGhvb2sgZmFjdG9yeSBmdW5jdGlvbiBmb3IgYSBzcGVjaWZpYyBob29rIHR5cGUuXG4gKlxuICogVGhpcyBpcyB0aGUgaW50ZXJuYWwgaW1wbGVtZW50YXRpb24gdXNlZCBieSBhbGwgdHlwZWQgZmFjdG9yaWVzLlxuICogSXQgd3JhcHMgdGhlIGhhbmRsZXIgd2l0aCBlcnJvciBjYXRjaGluZyBhbmQgbG9nZ2luZy5cbiAqIEBwYXJhbSBob29rRXZlbnROYW1lIC0gVGhlIGhvb2sgZXZlbnQgbmFtZVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvblxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byB3cmFwXG4gKiBAcmV0dXJucyBBIHdyYXBwZWQgaG9vayBmdW5jdGlvblxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tGdW5jdGlvbihob29rRXZlbnROYW1lLCBjb25maWcsIGhhbmRsZXIpIHtcbiAgICBjb25zdCBob29rRm4gPSBhc3luYyAoaW5wdXQsIGNvbnRleHQpID0+IHtcbiAgICAgICAgLy8gRGVsZWdhdGUgZXJyb3IgaGFuZGxpbmcgdG8gdGhlIHJ1bnRpbWUgLSBqdXN0IGV4ZWN1dGUgdGhlIGhhbmRsZXJcbiAgICAgICAgLy8gVGhlIHJ1bnRpbWUgd2lsbCBjYXRjaCBlcnJvcnMsIGxvZyB0aGVtLCBhbmQgcmV0dXJuIGFwcHJvcHJpYXRlIG91dHB1dFxuICAgICAgICByZXR1cm4gYXdhaXQgaGFuZGxlcihpbnB1dCwgY29udGV4dCk7XG4gICAgfTtcbiAgICAvLyBBdHRhY2ggbWV0YWRhdGEgZm9yIHJ1bnRpbWUgaW5zcGVjdGlvblxuICAgIGhvb2tGbi5ob29rRXZlbnROYW1lID0gaG9va0V2ZW50TmFtZTtcbiAgICBob29rRm4ubWF0Y2hlciA9IGNvbmZpZy5tYXRjaGVyO1xuICAgIGhvb2tGbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gICAgcmV0dXJuIGhvb2tGbjtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZVRvb2xVc2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQcmVUb29sVXNlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0VG9vbFVzZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBvc3RUb29sVXNlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0VG9vbFVzZUZhaWx1cmVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQb3N0VG9vbFVzZUZhaWx1cmVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE5vdGlmaWNhdGlvbiBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIE5vdGlmaWNhdGlvbiBob29rIGhhbmRsZXIuXG4gKlxuICogTm90aWZpY2F0aW9uIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBzZW5kcyBhIG5vdGlmaWNhdGlvbiwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBGb3J3YXJkIG5vdGlmaWNhdGlvbnMgdG8gZXh0ZXJuYWwgc3lzdGVtc1xuICogLSBMb2cgaW1wb3J0YW50IGV2ZW50c1xuICogLSBUcmlnZ2VyIGN1c3RvbSBhbGVydGluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYG5vdGlmaWNhdGlvbl90eXBlYFxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IG5vdGlmaWNhdGlvbkhvb2ssIG5vdGlmaWNhdGlvbk91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gRm9yd2FyZCBub3RpZmljYXRpb25zIHRvIFNsYWNrXG4gKiBleHBvcnQgZGVmYXVsdCBub3RpZmljYXRpb25Ib29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ05vdGlmaWNhdGlvbiByZWNlaXZlZCcsIHtcbiAqICAgICB0eXBlOiBpbnB1dC5ub3RpZmljYXRpb25fdHlwZSxcbiAqICAgICB0aXRsZTogaW5wdXQudGl0bGVcbiAqICAgfSk7XG4gKlxuICogICBhd2FpdCBzZW5kU2xhY2tNZXNzYWdlKGlucHV0LnRpdGxlID8/ICdOb3RpZmljYXRpb24nLCBpbnB1dC5tZXNzYWdlKTtcbiAqXG4gKiAgIHJldHVybiBub3RpZmljYXRpb25PdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNub3RpZmljYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdGlmaWNhdGlvbkhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIk5vdGlmaWNhdGlvblwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVXNlclByb21wdFN1Ym1pdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFVzZXJQcm9tcHRTdWJtaXQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFVzZXJQcm9tcHRTdWJtaXQgaG9va3MgZmlyZSB3aGVuIGEgdXNlciBzdWJtaXRzIGEgcHJvbXB0LCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFkZCBhZGRpdGlvbmFsIGNvbnRleHQgb3IgaW5zdHJ1Y3Rpb25zXG4gKiAtIExvZyB1c2VyIGludGVyYWN0aW9uc1xuICogLSBWYWxpZGF0ZSBvciB0cmFuc2Zvcm0gcHJvbXB0c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgcHJvbXB0IHN1Ym1pc3Npb25zXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdXNlclByb21wdFN1Ym1pdEhvb2ssIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEFkZCBwcm9qZWN0IGNvbnRleHQgdG8gZXZlcnkgcHJvbXB0XG4gKiBleHBvcnQgZGVmYXVsdCB1c2VyUHJvbXB0U3VibWl0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5kZWJ1ZygnVXNlciBwcm9tcHQgc3VibWl0dGVkJywgeyBwcm9tcHRMZW5ndGg6IGlucHV0LnByb21wdC5sZW5ndGggfSk7XG4gKlxuICogICBjb25zdCBwcm9qZWN0Q29udGV4dCA9IGF3YWl0IGdldFByb2plY3RDb250ZXh0KCk7XG4gKlxuICogICByZXR1cm4gdXNlclByb21wdFN1Ym1pdE91dHB1dCh7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IHByb2plY3RDb250ZXh0XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN1c2VycHJvbXB0c3VibWl0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VyUHJvbXB0U3VibWl0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVXNlclByb21wdFN1Ym1pdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2Vzc2lvblN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2Vzc2lvblN0YXJ0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTZXNzaW9uU3RhcnQgaG9va3MgZmlyZSB3aGVuIGEgQ2xhdWRlIENvZGUgc2Vzc2lvbiBzdGFydHMgb3IgcmVzdGFydHMsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEluaXRpYWxpemUgc2Vzc2lvbiBzdGF0ZVxuICogLSBJbmplY3QgY29udGV4dCBvciBpbnN0cnVjdGlvbnNcbiAqIC0gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kc1xuICogLSBTZXQgdXAgbG9nZ2luZyBvciBtb25pdG9yaW5nXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgc291cmNlYCAoJ3N0YXJ0dXAnLCAncmVzdW1lJywgJ2NsZWFyJywgJ2NvbXBhY3QnKVxuICpcbiAqICoqQ29udGV4dCoqOiBTZXNzaW9uU3RhcnQgaG9va3MgcmVjZWl2ZSBhbiBleHRlbmRlZCBjb250ZXh0IHdpdGggYHBlcnNpc3RFbnZWYXJgXG4gKiBhbmQgYHBlcnNpc3RFbnZWYXJzYCBmdW5jdGlvbnMgZm9yIHNldHRpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25TdGFydEhvb2ssIHNlc3Npb25TdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHRoZSBzZXNzaW9uXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHsgbWF0Y2hlcjogJ3N0YXJ0dXAnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTmV3IHNlc3Npb24gc3RhcnRlZCcsIHtcbiAqICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gKiAgICAgY3dkOiBpbnB1dC5jd2RcbiAqICAgfSk7XG4gKlxuICogICAvLyBTZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ2RldmVsb3BtZW50Jyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ0RFQlVHJywgJ3RydWUnKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBTZXQgbXVsdGlwbGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIGF0IG9uY2VcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBwZXJzaXN0RW52VmFycyB9KSA9PiB7XG4gKiAgIHBlcnNpc3RFbnZWYXJzKHtcbiAqICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICogICAgIEFQSV9LRVk6ICdzZWNyZXQnLFxuICogICAgIERFQlVHOiAnZmFsc2UnXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Nlc3Npb25zdGFydFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvblN0YXJ0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2Vzc2lvblN0YXJ0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXNzaW9uRW5kIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2Vzc2lvbkVuZCBob29rIGhhbmRsZXIuXG4gKlxuICogU2Vzc2lvbkVuZCBob29rcyBmaXJlIHdoZW4gYSBDbGF1ZGUgQ29kZSBzZXNzaW9uIGVuZHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ2xlYW4gdXAgc2Vzc2lvbiByZXNvdXJjZXNcbiAqIC0gTG9nIHNlc3Npb24gbWV0cmljc1xuICogLSBQZXJzaXN0IHNlc3Npb24gc3RhdGVcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGByZWFzb25gICh0aGUgZXhpdCByZWFzb24gc3RyaW5nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25FbmRIb29rLCBzZXNzaW9uRW5kT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgc2Vzc2lvbiBlbmQgYW5kIGNsZWFuIHVwXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uRW5kSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTZXNzaW9uIGVuZGVkJywge1xuICogICAgIHNlc3Npb25JZDogaW5wdXQuc2Vzc2lvbl9pZCxcbiAqICAgICByZWFzb246IGlucHV0LnJlYXNvblxuICogICB9KTtcbiAqXG4gKiAgIGF3YWl0IGNsZWFudXBTZXNzaW9uUmVzb3VyY2VzKGlucHV0LnNlc3Npb25faWQpO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25FbmRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXNzaW9uZW5kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXNzaW9uRW5kSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2Vzc2lvbkVuZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RvcCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN0b3AgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN0b3AgaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIGlzIGFib3V0IHRvIHN0b3AsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQmxvY2sgdGhlIHN0b3AgYW5kIHJlcXVpcmUgYWRkaXRpb25hbCBhY3Rpb25cbiAqIC0gQ29uZmlybSB0aGUgdXNlciB3YW50cyB0byBzdG9wXG4gKiAtIENsZWFuIHVwIHJlc291cmNlcyBiZWZvcmUgc3RvcHBpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHN0b3AgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3RvcEhvb2ssIHN0b3BPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEJsb2NrIHN0b3AgaWYgdGhlcmUgYXJlIHBlbmRpbmcgY2hhbmdlc1xuICogZXhwb3J0IGRlZmF1bHQgc3RvcEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBjb25zdCBwZW5kaW5nQ2hhbmdlcyA9IGF3YWl0IGNoZWNrUGVuZGluZ0NoYW5nZXMoKTtcbiAqXG4gKiAgIGlmIChwZW5kaW5nQ2hhbmdlcy5sZW5ndGggPiAwKSB7XG4gKiAgICAgbG9nZ2VyLndhcm4oJ0Jsb2NraW5nIHN0b3AgZHVlIHRvIHBlbmRpbmcgY2hhbmdlcycsIHtcbiAqICAgICAgIGNvdW50OiBwZW5kaW5nQ2hhbmdlcy5sZW5ndGhcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICogICAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgICByZWFzb246IGBUaGVyZSBhcmUgJHtwZW5kaW5nQ2hhbmdlcy5sZW5ndGh9IHVuY29tbWl0dGVkIGNoYW5nZXNgLFxuICogICAgICAgc3lzdGVtTWVzc2FnZTogJ1BsZWFzZSBjb21taXQgb3IgZGlzY2FyZCBjaGFuZ2VzIGJlZm9yZSBzdG9wcGluZydcbiAqICAgICB9KTtcbiAqICAgfVxuICpcbiAqICAgbG9nZ2VyLmluZm8oJ0FwcHJvdmluZyBzdG9wJyk7XG4gKiAgIHJldHVybiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN0b3BcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN0b3BGYWlsdXJlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3RvcEZhaWx1cmUgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN0b3BGYWlsdXJlIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBlbmNvdW50ZXJzIGFuIGVycm9yIHdoaWxlIHN0b3BwaW5nXG4gKiAoZS5nLiwgQVBJIGVycm9ycywgYXV0aGVudGljYXRpb24gZmFpbHVyZXMsIHJhdGUgbGltaXRzKSwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBMb2cgc3RvcCBmYWlsdXJlIGV2ZW50cyBhbmQgZXJyb3IgZGV0YWlsc1xuICogLSBBbGVydCBvbiB1bmV4cGVjdGVkIHNlc3Npb24gdGVybWluYXRpb24gZXJyb3JzXG4gKiAtIE9ic2VydmUgd2hhdCBlcnJvciBjYXVzZWQgdGhlIGZhaWx1cmVcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHN0b3AgZmFpbHVyZSBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdG9wRmFpbHVyZUhvb2ssIHN0b3BGYWlsdXJlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBzdG9wRmFpbHVyZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuZXJyb3IoJ1Nlc3Npb24gc3RvcHBlZCBkdWUgdG8gZXJyb3InLCB7XG4gKiAgICAgZXJyb3I6IGlucHV0LmVycm9yLFxuICogICAgIGRldGFpbHM6IGlucHV0LmVycm9yX2RldGFpbHNcbiAqICAgfSk7XG4gKiAgIHJldHVybiBzdG9wRmFpbHVyZU91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N0b3BmYWlsdXJlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wRmFpbHVyZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN0b3BGYWlsdXJlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdWJhZ2VudFN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU3ViYWdlbnRTdGFydCBob29rcyBmaXJlIHdoZW4gYSBzdWJhZ2VudCAoQWdlbnQgdG9vbCkgc3RhcnRzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEluamVjdCBjb250ZXh0IGZvciB0aGUgc3ViYWdlbnRcbiAqIC0gTG9nIHN1YmFnZW50IGludm9jYXRpb25zXG4gKiAtIENvbmZpZ3VyZSBzdWJhZ2VudCBiZWhhdmlvclxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYGFnZW50X3R5cGVgIChlLmcuLCAnZXhwbG9yZScsICdjb2RlYmFzZS1hbmFseXNpcycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3ViYWdlbnRTdGFydEhvb2ssIHN1YmFnZW50U3RhcnRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEFkZCBjb250ZXh0IGZvciBleHBsb3JlIHN1YmFnZW50c1xuICogZXhwb3J0IGRlZmF1bHQgc3ViYWdlbnRTdGFydEhvb2soeyBtYXRjaGVyOiAnZXhwbG9yZScgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdFeHBsb3JlIHN1YmFnZW50IHN0YXJ0aW5nJywge1xuICogICAgIGFnZW50SWQ6IGlucHV0LmFnZW50X2lkLFxuICogICAgIGFnZW50VHlwZTogaW5wdXQuYWdlbnRfdHlwZVxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZvY3VzIG9uIGZpbmRpbmcgcGF0dGVybnMgYW5kIGNvbnZlbnRpb25zJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3ViYWdlbnRzdGFydFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdGFydEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN1YmFnZW50U3RhcnRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN1YmFnZW50U3RvcCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN1YmFnZW50U3RvcCBob29rIGhhbmRsZXIuXG4gKlxuICogU3ViYWdlbnRTdG9wIGhvb2tzIGZpcmUgd2hlbiBhIHN1YmFnZW50IGNvbXBsZXRlcyBvciBzdG9wcywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBCbG9jayB0aGUgc3ViYWdlbnQgZnJvbSBzdG9wcGluZ1xuICogLSBQcm9jZXNzIHN1YmFnZW50IHJlc3VsdHNcbiAqIC0gQ2xlYW4gdXAgc3ViYWdlbnQgcmVzb3VyY2VzXG4gKiAtIExvZyBzdWJhZ2VudCBjb21wbGV0aW9uXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgYWdlbnRfdHlwZWAgKGUuZy4sICdleHBsb3JlJywgJ2NvZGViYXNlLWFuYWx5c2lzJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdWJhZ2VudFN0b3BIb29rLCBzdWJhZ2VudFN0b3BPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEJsb2NrIGV4cGxvcmUgc3ViYWdlbnRzIGlmIHRhc2sgaW5jb21wbGV0ZVxuICogZXhwb3J0IGRlZmF1bHQgc3ViYWdlbnRTdG9wSG9vayh7IG1hdGNoZXI6ICdleHBsb3JlJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1N1YmFnZW50IHN0b3BwaW5nJywge1xuICogICAgIGFnZW50SWQ6IGlucHV0LmFnZW50X2lkLFxuICogICAgIGFnZW50VHlwZTogaW5wdXQuYWdlbnRfdHlwZVxuICogICB9KTtcbiAqXG4gKiAgIC8vIEJsb2NrIGlmIHRyYW5zY3JpcHQgc2hvd3MgaW5jb21wbGV0ZSB3b3JrXG4gKiAgIHJldHVybiBzdWJhZ2VudFN0b3BPdXRwdXQoe1xuICogICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICAgIHJlYXNvbjogJ1BsZWFzZSB2ZXJpZnkgZXhwbG9yYXRpb24gaXMgY29tcGxldGUnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdWJhZ2VudHN0b3BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN1YmFnZW50U3RvcEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN1YmFnZW50U3RvcFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUHJlQ29tcGFjdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFByZUNvbXBhY3QgaG9vayBoYW5kbGVyLlxuICpcbiAqIFByZUNvbXBhY3QgaG9va3MgZmlyZSBiZWZvcmUgY29udGV4dCBjb21wYWN0aW9uIG9jY3VycywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBQcmVzZXJ2ZSBpbXBvcnRhbnQgaW5mb3JtYXRpb24gYmVmb3JlIGNvbXBhY3Rpb25cbiAqIC0gTG9nIGNvbXBhY3Rpb24gZXZlbnRzXG4gKiAtIE1vZGlmeSBjdXN0b20gaW5zdHJ1Y3Rpb25zIGZvciB0aGUgY29tcGFjdGVkIGNvbnRleHRcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGB0cmlnZ2VyYCAoJ21hbnVhbCcsICdhdXRvJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwcmVDb21wYWN0SG9vaywgcHJlQ29tcGFjdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIGNvbXBhY3Rpb24gZXZlbnRzIGFuZCBwcmVzZXJ2ZSBjb250ZXh0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVDb21wYWN0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdDb250ZXh0IGNvbXBhY3Rpb24gdHJpZ2dlcmVkJywge1xuICogICAgIHRyaWdnZXI6IGlucHV0LnRyaWdnZXIsXG4gKiAgICAgaGFzQ3VzdG9tSW5zdHJ1Y3Rpb25zOiBpbnB1dC5jdXN0b21faW5zdHJ1Y3Rpb25zICE9PSBudWxsXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHByZUNvbXBhY3RPdXRwdXQoe1xuICogICAgIHN5c3RlbU1lc3NhZ2U6ICdSZW1lbWJlcjogc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCdcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIE9ubHkgaGFuZGxlIG1hbnVhbCBjb21wYWN0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVDb21wYWN0SG9vayh7IG1hdGNoZXI6ICdtYW51YWwnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTWFudWFsIGNvbXBhY3Rpb24gcmVxdWVzdGVkJyk7XG4gKiAgIHJldHVybiBwcmVDb21wYWN0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcHJlY29tcGFjdFxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJlQ29tcGFjdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlByZUNvbXBhY3RcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFBvc3RDb21wYWN0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgUG9zdENvbXBhY3QgaG9vayBoYW5kbGVyLlxuICpcbiAqIFBvc3RDb21wYWN0IGhvb2tzIGZpcmUgYWZ0ZXIgY29udGV4dCBjb21wYWN0aW9uIGNvbXBsZXRlcywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBPYnNlcnZlIHRoZSBjb21wYWN0aW9uIHN1bW1hcnkgYW5kIGRldGFpbHNcbiAqIC0gTG9nIGNvbXBhY3Rpb24gZXZlbnRzXG4gKiAtIFJlYWN0IHRvIHRoZSBuZXcgY29tcGFjdGVkIHN0YXRlXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdtYW51YWwnLCAnYXV0bycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcG9zdENvbXBhY3RIb29rLCBwb3N0Q29tcGFjdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgcG9zdENvbXBhY3RIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbnRleHQgY29tcGFjdGlvbiBjb21wbGV0ZWQnLCB7XG4gKiAgICAgdHJpZ2dlcjogaW5wdXQudHJpZ2dlcixcbiAqICAgICBzdW1tYXJ5OiBpbnB1dC5jb21wYWN0X3N1bW1hcnlcbiAqICAgfSk7XG4gKiAgIHJldHVybiBwb3N0Q29tcGFjdE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Bvc3Rjb21wYWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0Q29tcGFjdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBvc3RDb21wYWN0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJtaXNzaW9uUmVxdWVzdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBlcm1pc3Npb25SZXF1ZXN0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXR1cCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNldHVwIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTZXR1cCBob29rcyBmaXJlIGR1cmluZyBpbml0aWFsaXphdGlvbiBvciBtYWludGVuYW5jZSwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBDb25maWd1cmUgaW5pdGlhbCBzZXNzaW9uIHN0YXRlXG4gKiAtIFBlcmZvcm0gc2V0dXAgdGFza3MgYmVmb3JlIHRoZSBzZXNzaW9uIHN0YXJ0c1xuICogLSBBZGQgY29udGV4dCBmb3IgbWFpbnRlbmFuY2Ugb3BlcmF0aW9uc1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHRyaWdnZXJgICgnaW5pdCcgb3IgJ21haW50ZW5hbmNlJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXR1cEhvb2ssIHNldHVwT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBIYW5kbGUgYWxsIHNldHVwIGV2ZW50c1xuICogZXhwb3J0IGRlZmF1bHQgc2V0dXBIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1NldHVwIHRyaWdnZXJlZCcsIHsgdHJpZ2dlcjogaW5wdXQudHJpZ2dlciB9KTtcbiAqICAgcmV0dXJuIHNldHVwT3V0cHV0KHt9KTtcbiAqIH0pO1xuICpcbiAqIC8vIE9ubHkgaGFuZGxlIGluaXRpYWxpemF0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCBzZXR1cEhvb2soeyBtYXRjaGVyOiAnaW5pdCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdJbml0aWFsaXppbmcgc2Vzc2lvbicpO1xuICogICByZXR1cm4gc2V0dXBPdXRwdXQoe1xuICogICAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdTZXNzaW9uIGluaXRpYWxpemVkIHdpdGggY3VzdG9tIGNvbmZpZ3VyYXRpb24nXG4gKiAgICAgfVxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2V0dXBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2V0dXBcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFRlYW1tYXRlSWRsZSBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFRlYW1tYXRlSWRsZSBob29rIGhhbmRsZXIuXG4gKlxuICogVGVhbW1hdGVJZGxlIGhvb2tzIGZpcmUgd2hlbiBhIHRlYW1tYXRlIGluIGEgdGVhbSBpcyBhYm91dCB0byBnbyBpZGxlLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBBc3NpZ24gd29yayB0byBpZGxlIHRlYW1tYXRlc1xuICogLSBMb2cgdGVhbSBhY3Rpdml0eVxuICogLSBDb29yZGluYXRlIG11bHRpLWFnZW50IHdvcmtmbG93c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgdGVhbW1hdGUgaWRsZSBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyB0ZWFtbWF0ZUlkbGVIb29rLCB0ZWFtbWF0ZUlkbGVPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyB3aGVuIHRlYW1tYXRlcyBnbyBpZGxlXG4gKiBleHBvcnQgZGVmYXVsdCB0ZWFtbWF0ZUlkbGVIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1RlYW1tYXRlIGdvaW5nIGlkbGUnLCB7XG4gKiAgICAgdGVhbW1hdGVOYW1lOiBpbnB1dC50ZWFtbWF0ZV9uYW1lLFxuICogICAgIHRlYW1OYW1lOiBpbnB1dC50ZWFtX25hbWVcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gdGVhbW1hdGVJZGxlT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdGVhbW1hdGVpZGxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZWFtbWF0ZUlkbGVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJUZWFtbWF0ZUlkbGVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFRhc2tDb21wbGV0ZWQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBUYXNrQ29tcGxldGVkIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBUYXNrQ29tcGxldGVkIGhvb2tzIGZpcmUgd2hlbiBhIHRhc2sgaXMgYmVpbmcgbWFya2VkIGFzIGNvbXBsZXRlZCxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gVmVyaWZ5IHRhc2sgY29tcGxldGlvblxuICogLSBMb2cgdGFzayBtZXRyaWNzXG4gKiAtIFRyaWdnZXIgZm9sbG93LXVwIGFjdGlvbnNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHRhc2sgY29tcGxldGlvbiBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyB0YXNrQ29tcGxldGVkSG9vaywgdGFza0NvbXBsZXRlZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHRhc2sgY29tcGxldGlvblxuICogZXhwb3J0IGRlZmF1bHQgdGFza0NvbXBsZXRlZEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnVGFzayBjb21wbGV0ZWQnLCB7XG4gKiAgICAgdGFza0lkOiBpbnB1dC50YXNrX2lkLFxuICogICAgIHRhc2tTdWJqZWN0OiBpbnB1dC50YXNrX3N1YmplY3RcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gdGFza0NvbXBsZXRlZE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Rhc2tjb21wbGV0ZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRhc2tDb21wbGV0ZWRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJUYXNrQ29tcGxldGVkXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFbGljaXRhdGlvbiBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBFbGljaXRhdGlvbiBob29rIGhhbmRsZXIuXG4gKlxuICogRWxpY2l0YXRpb24gaG9va3MgZmlyZSB3aGVuIGFuIE1DUCBzZXJ2ZXIgcmVxdWVzdHMgdXNlciBpbnB1dCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBBY2NlcHQsIGRlY2xpbmUsIG9yIGNhbmNlbCBlbGljaXRhdGlvbiByZXF1ZXN0cyBwcm9ncmFtbWF0aWNhbGx5XG4gKiAtIFByb3ZpZGUgc3RydWN0dXJlZCBmb3JtIGlucHV0IG9yIFVSTC1iYXNlZCBhdXRoIHJlc3BvbnNlc1xuICogLSBMb2cgb3IgYXVkaXQgZWxpY2l0YXRpb24gcmVxdWVzdHNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIGVsaWNpdGF0aW9uIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGVsaWNpdGF0aW9uSG9vaywgZWxpY2l0YXRpb25PdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IGVsaWNpdGF0aW9uSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdFbGljaXRhdGlvbiByZXF1ZXN0JywgeyBzZXJ2ZXI6IGlucHV0Lm1jcF9zZXJ2ZXJfbmFtZSB9KTtcbiAqICAgcmV0dXJuIGVsaWNpdGF0aW9uT3V0cHV0KHtcbiAqICAgICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgYWN0aW9uOiAnYWNjZXB0JywgY29udGVudDogeyBhcHByb3ZlZDogdHJ1ZSB9IH1cbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2VsaWNpdGF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbGljaXRhdGlvbkhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIkVsaWNpdGF0aW9uXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFbGljaXRhdGlvblJlc3VsdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBFbGljaXRhdGlvblJlc3VsdCBob29rIGhhbmRsZXIuXG4gKlxuICogRWxpY2l0YXRpb25SZXN1bHQgaG9va3MgZmlyZSB3aXRoIHRoZSByZXN1bHQgb2YgYW4gTUNQIGVsaWNpdGF0aW9uIHJlcXVlc3QsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIE9ic2VydmUgZWxpY2l0YXRpb24gb3V0Y29tZXNcbiAqIC0gTW9kaWZ5IHRoZSByZXN1bHQgYmVmb3JlIGl0IGlzIHJldHVybmVkIHRvIHRoZSBNQ1Agc2VydmVyXG4gKiAtIExvZyBlbGljaXRhdGlvbiBjb21wbGV0aW9uc1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgZWxpY2l0YXRpb24gcmVzdWx0IGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGVsaWNpdGF0aW9uUmVzdWx0SG9vaywgZWxpY2l0YXRpb25SZXN1bHRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IGVsaWNpdGF0aW9uUmVzdWx0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdFbGljaXRhdGlvbiByZXN1bHQnLCB7IGFjdGlvbjogaW5wdXQuYWN0aW9uIH0pO1xuICogICByZXR1cm4gZWxpY2l0YXRpb25SZXN1bHRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNlbGljaXRhdGlvbnJlc3VsdFxuICovXG5leHBvcnQgZnVuY3Rpb24gZWxpY2l0YXRpb25SZXN1bHRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJFbGljaXRhdGlvblJlc3VsdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uZmlnQ2hhbmdlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgQ29uZmlnQ2hhbmdlIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBDb25maWdDaGFuZ2UgaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIGNvbmZpZ3VyYXRpb24gY2hhbmdlcywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBSZWFjdCB0byBzZXR0aW5ncyBmaWxlIGNoYW5nZXNcbiAqIC0gTG9nIG9yIGF1ZGl0IGNvbmZpZ3VyYXRpb24gY2hhbmdlc1xuICogLSBBcHBseSBjdXN0b20gbG9naWMgd2hlbiBzZXR0aW5ncyBhcmUgdXBkYXRlZFxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHNvdXJjZWAgKCd1c2VyX3NldHRpbmdzJywgJ3Byb2plY3Rfc2V0dGluZ3MnLCBldGMuKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGNvbmZpZ0NoYW5nZUhvb2ssIGNvbmZpZ0NoYW5nZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgY29uZmlnQ2hhbmdlSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdDb25maWcgY2hhbmdlZCcsIHsgc291cmNlOiBpbnB1dC5zb3VyY2UsIGZpbGU6IGlucHV0LmZpbGVfcGF0aCB9KTtcbiAqICAgcmV0dXJuIGNvbmZpZ0NoYW5nZU91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2NvbmZpZ2NoYW5nZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY29uZmlnQ2hhbmdlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiQ29uZmlnQ2hhbmdlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJbnN0cnVjdGlvbnNMb2FkZWQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYW4gSW5zdHJ1Y3Rpb25zTG9hZGVkIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBJbnN0cnVjdGlvbnNMb2FkZWQgaG9va3MgZmlyZSB3aGVuIGEgQ0xBVURFLm1kIG9yIHNpbWlsYXIgaW5zdHJ1Y3Rpb25zIGZpbGVcbiAqIGlzIGxvYWRlZCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBSZWFjdCB0byBpbnN0cnVjdGlvbnMgYmVpbmcgYXBwbGllZFxuICogLSBMb2cgd2hpY2ggaW5zdHJ1Y3Rpb24gZmlsZXMgYXJlIGFjdGl2ZVxuICogLSBPYnNlcnZlIHRoZSBpbnN0cnVjdGlvbiBsb2FkaW5nIGhpZXJhcmNoeVxuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgaW5zdHJ1Y3Rpb24gbG9hZCBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBpbnN0cnVjdGlvbnNMb2FkZWRIb29rLCBpbnN0cnVjdGlvbnNMb2FkZWRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IGluc3RydWN0aW9uc0xvYWRlZEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnSW5zdHJ1Y3Rpb25zIGxvYWRlZCcsIHsgZmlsZTogaW5wdXQuZmlsZV9wYXRoLCB0eXBlOiBpbnB1dC5tZW1vcnlfdHlwZSB9KTtcbiAqICAgcmV0dXJuIGluc3RydWN0aW9uc0xvYWRlZE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2luc3RydWN0aW9uc2xvYWRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5zdHJ1Y3Rpb25zTG9hZGVkSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiSW5zdHJ1Y3Rpb25zTG9hZGVkXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBXb3JrdHJlZUNyZWF0ZSBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFdvcmt0cmVlQ3JlYXRlIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBXb3JrdHJlZUNyZWF0ZSBob29rcyBmaXJlIHdoZW4gYSBnaXQgd29ya3RyZWUgaXMgY3JlYXRlZCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBTZXQgdXAgd29ya3RyZWUtc3BlY2lmaWMgY29uZmlndXJhdGlvblxuICogLSBMb2cgd29ya3RyZWUgY3JlYXRpb24gZXZlbnRzXG4gKiAtIEluaXRpYWxpemUgd29ya3RyZWUgcmVzb3VyY2VzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCB3b3JrdHJlZSBjcmVhdGlvbiBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyB3b3JrdHJlZUNyZWF0ZUhvb2ssIHdvcmt0cmVlQ3JlYXRlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCB3b3JrdHJlZUNyZWF0ZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnV29ya3RyZWUgY3JlYXRlZCcsIHsgbmFtZTogaW5wdXQubmFtZSB9KTtcbiAqICAgcmV0dXJuIHdvcmt0cmVlQ3JlYXRlT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjd29ya3RyZWVjcmVhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdvcmt0cmVlQ3JlYXRlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiV29ya3RyZWVDcmVhdGVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFdvcmt0cmVlUmVtb3ZlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgV29ya3RyZWVSZW1vdmUgaG9vayBoYW5kbGVyLlxuICpcbiAqIFdvcmt0cmVlUmVtb3ZlIGhvb2tzIGZpcmUgd2hlbiBhIGdpdCB3b3JrdHJlZSBpcyByZW1vdmVkLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENsZWFuIHVwIHdvcmt0cmVlLXNwZWNpZmljIHJlc291cmNlc1xuICogLSBMb2cgd29ya3RyZWUgcmVtb3ZhbCBldmVudHNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHdvcmt0cmVlIHJlbW92YWwgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgd29ya3RyZWVSZW1vdmVIb29rLCB3b3JrdHJlZVJlbW92ZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgd29ya3RyZWVSZW1vdmVIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1dvcmt0cmVlIHJlbW92ZWQnLCB7IHBhdGg6IGlucHV0Lndvcmt0cmVlX3BhdGggfSk7XG4gKiAgIHJldHVybiB3b3JrdHJlZVJlbW92ZU91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3dvcmt0cmVlcmVtb3ZlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3b3JrdHJlZVJlbW92ZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIldvcmt0cmVlUmVtb3ZlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDd2RDaGFuZ2VkIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgQ3dkQ2hhbmdlZCBob29rIGhhbmRsZXIuXG4gKlxuICogQ3dkQ2hhbmdlZCBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUncyBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5IGNoYW5nZXMsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFJlYWN0IHRvIGRpcmVjdG9yeSBjaGFuZ2VzIHdpdGhpbiBhIHNlc3Npb25cbiAqIC0gVXBkYXRlIGZpbGUgd2F0Y2hlcnMgb3IgZW52aXJvbm1lbnQgc3RhdGVcbiAqIC0gUmV0dXJuIGB3YXRjaFBhdGhzYCB2aWEgYGhvb2tTcGVjaWZpY091dHB1dGAgdG8gcmVnaXN0ZXIgcGF0aHMgZm9yIEZpbGVDaGFuZ2VkIGV2ZW50c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgY3dkIGNoYW5nZSBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBjd2RDaGFuZ2VkSG9vaywgY3dkQ2hhbmdlZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgY3dkQ2hhbmdlZEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnV29ya2luZyBkaXJlY3RvcnkgY2hhbmdlZCcsIHsgZnJvbTogaW5wdXQub2xkX2N3ZCwgdG86IGlucHV0Lm5ld19jd2QgfSk7XG4gKiAgIHJldHVybiBjd2RDaGFuZ2VkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjY3dkY2hhbmdlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3dkQ2hhbmdlZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIkN3ZENoYW5nZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZpbGVDaGFuZ2VkIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgRmlsZUNoYW5nZWQgaG9vayBoYW5kbGVyLlxuICpcbiAqIEZpbGVDaGFuZ2VkIGhvb2tzIGZpcmUgd2hlbiBhIHdhdGNoZWQgZmlsZSBjaGFuZ2VzIG9uIGRpc2ssIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gUmVhY3QgdG8gZmlsZSBzeXN0ZW0gY2hhbmdlcyBkdXJpbmcgYSBzZXNzaW9uXG4gKiAtIEludmFsaWRhdGUgY2FjaGVzIG9yIHJlbG9hZCBjb25maWd1cmF0aW9uXG4gKiAtIFJldHVybiBgd2F0Y2hQYXRoc2AgdmlhIGBob29rU3BlY2lmaWNPdXRwdXRgIHRvIHVwZGF0ZSB0aGUgc2V0IG9mIHdhdGNoZWQgcGF0aHNcbiAqXG4gKiBUaGUgaW5wdXQgYGV2ZW50YCBmaWVsZCBpbmRpY2F0ZXMgdGhlIHR5cGUgb2YgY2hhbmdlOlxuICogLSBgJ2NoYW5nZSdgIC0gRmlsZSBjb250ZW50cyBjaGFuZ2VkXG4gKiAtIGAnYWRkJ2AgLSBGaWxlIHdhcyBjcmVhdGVkXG4gKiAtIGAndW5saW5rJ2AgLSBGaWxlIHdhcyBkZWxldGVkXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBmaWxlIGNoYW5nZSBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBmaWxlQ2hhbmdlZEhvb2ssIGZpbGVDaGFuZ2VkT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBmaWxlQ2hhbmdlZEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnRmlsZSBjaGFuZ2VkJywgeyBwYXRoOiBpbnB1dC5maWxlX3BhdGgsIGV2ZW50OiBpbnB1dC5ldmVudCB9KTtcbiAqICAgcmV0dXJuIGZpbGVDaGFuZ2VkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjZmlsZWNoYW5nZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbGVDaGFuZ2VkSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiRmlsZUNoYW5nZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbiIsICIvKipcbiAqIExvZ2dlciBzeXN0ZW0gZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHN0cnVjdHVyZWQgbG9nZ2luZyB3aXRoIGV2ZW50IHN1YnNjcmlwdGlvbiBhbmQgb3B0aW9uYWwgZmlsZSBvdXRwdXQuXG4gKiBUaGUgbG9nZ2VyIGlzICoqc2lsZW50IGJ5IGRlZmF1bHQqKiB0byBhdm9pZCBpbnRlcmZlcmluZyB3aXRoIGhvb2sgcHJvdG9jb2xcbiAqIChzdGRvdXQgaXMgcmVzZXJ2ZWQgZm9yIEpTT04gcmVzcG9uc2VzLCBzdGRlcnIgbWF5IGNvbmZsaWN0IHdpdGggQ2xhdWRlIENvZGUpLlxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGxvZyBldmVudHNcbiAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICogICBjb25zb2xlLmVycm9yKGBFcnJvciBpbiAke2V2ZW50Lmhvb2tUeXBlfTogJHtldmVudC5tZXNzYWdlfWApO1xuICogfSk7XG4gKlxuICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gKiB1bnN1YnNjcmliZSgpO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuaW1wb3J0IHsgY2xvc2VTeW5jLCBleGlzdHNTeW5jLCBta2RpclN5bmMsIG9wZW5TeW5jLCB3cml0ZVN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcbi8qKlxuICogQWxsIGxvZyBsZXZlbHMgaW4gb3JkZXIgb2Ygc2V2ZXJpdHkgKGxvd2VzdCB0byBoaWdoZXN0KS5cbiAqL1xuZXhwb3J0IGNvbnN0IExPR19MRVZFTFMgPSBbXCJkZWJ1Z1wiLCBcImluZm9cIiwgXCJ3YXJuXCIsIFwiZXJyb3JcIl07XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogTG9nZ2VyIGZvciBDbGF1ZGUgQ29kZSBob29rcyB3aXRoIGV2ZW50IHN1YnNjcmlwdGlvbiBhbmQgZmlsZSBvdXRwdXQuXG4gKlxuICogIyMgS2V5IEJlaGF2aW9yc1xuICpcbiAqIHwgQ29uZmlndXJhdGlvbiB8IEJlaGF2aW9yIHxcbiAqIHwtLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tfFxuICogfCBObyBjb25maWcgKGRlZmF1bHQpIHwgKipTaWxlbnQqKiAtIG5vIG91dHB1dCBhbnl3aGVyZSB8XG4gKiB8IGBDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRWAgZW52IHZhciB8IEFwcGVuZCBKU09OIGxpbmVzIHRvIGZpbGUgfFxuICogfCBgLm9uKGxldmVsLCBoYW5kbGVyKWAgcmVnaXN0ZXJlZCB8IEV2ZW50cyBkZWxpdmVyZWQgdG8gaGFuZGxlcnMgb25seSB8XG4gKiB8IE11bHRpcGxlIGRlc3RpbmF0aW9ucyB8IEFsbCBkZXN0aW5hdGlvbnMgcmVjZWl2ZSBldmVudHMgfFxuICpcbiAqICMjIEltcG9ydGFudCBOb3Rlc1xuICpcbiAqIC0gKipOZXZlciBvdXRwdXRzIHRvIHN0ZG91dCoqIChyZXNlcnZlZCBmb3IgSlNPTiBob29rIHJlc3BvbnNlKVxuICogLSAqKk5ldmVyIG91dHB1dHMgdG8gc3RkZXJyKiogKG1heSBpbnRlcmZlcmUgd2l0aCBDbGF1ZGUgQ29kZSBlcnJvciBoYW5kbGluZylcbiAqIC0gRmlsZSBvdXRwdXQgdXNlcyBKU09OIExpbmVzIGZvcm1hdCBmb3IgZWFzeSBwYXJzaW5nXG4gKiAtIGAub24obGV2ZWwsIGhhbmRsZXIpYCByZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gZXZlbnRzIGF0IHNwZWNpZmljIGxldmVsXG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHtcbiAqICAgc2VuZEFsZXJ0KGV2ZW50Lm1lc3NhZ2UpO1xuICogfSk7XG4gKlxuICogLy8gTG9nIHdpdGhpbiBhIGhvb2sgaGFuZGxlclxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci53YXJuKCdBYm91dCB0byB2YWxpZGF0ZSBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyZWQgZXZlbnQgaGFuZGxlcnMgYnkgbG9nIGxldmVsLlxuICAgICAqL1xuICAgIGhhbmRsZXJzID0gbmV3IE1hcCgpO1xuICAgIC8qKlxuICAgICAqIEZpbGUgZGVzY3JpcHRvciBmb3IgbG9nIGZpbGUgb3V0cHV0LlxuICAgICAqIExhemlseSBpbml0aWFsaXplZCBvbiBmaXJzdCB3cml0ZS5cbiAgICAgKi9cbiAgICBsb2dGaWxlRmQgPSBudWxsO1xuICAgIC8qKlxuICAgICAqIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBpZiBjb25maWd1cmVkLlxuICAgICAqL1xuICAgIGxvZ0ZpbGVQYXRoID0gbnVsbDtcbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIGZpbGUgaW5pdGlhbGl6YXRpb24gaGFzIGJlZW4gYXR0ZW1wdGVkLlxuICAgICAqL1xuICAgIGZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICAgKi9cbiAgICBjdXJyZW50SG9va1R5cGU7XG4gICAgLyoqXG4gICAgICogQ3VycmVudCBob29rIGlucHV0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICAgKi9cbiAgICBjdXJyZW50SW5wdXQ7XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBMb2dnZXIgaW5zdGFuY2UuXG4gICAgICpcbiAgICAgKiBUeXBpY2FsbHkgeW91IHNob3VsZCB1c2UgdGhlIGV4cG9ydGVkIGBsb2dnZXJgIHNpbmdsZXRvbiByYXRoZXIgdGhhblxuICAgICAqIGNyZWF0aW5nIG5ldyBpbnN0YW5jZXMuXG4gICAgICogQHBhcmFtIGNvbmZpZyAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBVc2Ugc2luZ2xldG9uIChyZWNvbW1lbmRlZClcbiAgICAgKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICAgICAqXG4gICAgICogLy8gT3IgY3JlYXRlIGN1c3RvbSBpbnN0YW5jZVxuICAgICAqIGNvbnN0IGN1c3RvbUxvZ2dlciA9IG5ldyBMb2dnZXIoeyBsb2dGaWxlUGF0aDogJy92YXIvbG9nL2hvb2tzLmxvZycgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uZmlnID0ge30pIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBoYW5kbGVycyBtYXAgZm9yIGVhY2ggbGV2ZWxcbiAgICAgICAgZm9yIChjb25zdCBsZXZlbCBvZiBMT0dfTEVWRUxTKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZXJzLnNldChsZXZlbCwgbmV3IFNldCgpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgbG9nIGZpbGUgcGF0aCBmcm9tIGV4cGxpY2l0IGNvbmZpZywgb3IgYnkgcmVhZGluZyB0aGUgY29uZmlndXJlZCBlbnYgdmFyXG4gICAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBjb25maWcubG9nRmlsZVBhdGggPz8gKGNvbmZpZy5sb2dFbnZWYXIgPyBwcm9jZXNzLmVudltjb25maWcubG9nRW52VmFyXSA6IHVuZGVmaW5lZCkgPz8gbnVsbDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGRldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB0aGF0IGlzIHR5cGljYWxseSBvbmx5IHVzZWZ1bFxuICAgICAqIGR1cmluZyBkZXZlbG9wbWVudCBvciB0cm91Ymxlc2hvb3RpbmcuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgZGVidWcgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmRlYnVnKCdQcm9jZXNzaW5nIHRvb2wgaW5wdXQnLCB7IHRvb2xOYW1lOiAnQmFzaCcsIGlucHV0U2l6ZTogMjU2IH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGRlYnVnKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwiZGVidWdcIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBnZW5lcmFsIG9wZXJhdGlvbmFsIGV2ZW50cyBsaWtlIGhvb2sgaW52b2NhdGlvbnMsIHN1Y2Nlc3NmdWxcbiAgICAgKiBjb21wbGV0aW9ucywgb3Igc3RhdGUgY2hhbmdlcy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBpbmZvIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci5pbmZvKCdTZXNzaW9uIHN0YXJ0ZWQnLCB7IHNvdXJjZTogJ3N0YXJ0dXAnLCBzZXNzaW9uSWQ6ICdhYmMxMjMnIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGluZm8obWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJpbmZvXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBjb25kaXRpb25zIHRoYXQgbWF5IGluZGljYXRlIGlzc3VlcyBidXQgZG9uJ3QgcHJldmVudFxuICAgICAqIG9wZXJhdGlvbiwgc3VjaCBhcyBkZXByZWNhdGVkIHBhdHRlcm5zIG9yIHBlcmZvcm1hbmNlIGNvbmNlcm5zLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIHdhcm5pbmcgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLndhcm4oJ0RlcHJlY2F0ZWQgaG9vayBwYXR0ZXJuIGRldGVjdGVkJywgeyBwYXR0ZXJuOiAnbGVnYWN5TWF0Y2hlcicgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgd2FybihtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcIndhcm5cIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZXJyb3IgY29uZGl0aW9ucyB0aGF0IHJlcXVpcmUgYXR0ZW50aW9uIGJ1dCB3ZXJlIGhhbmRsZWRcbiAgICAgKiBncmFjZWZ1bGx5LiBGb3IgZXhjZXB0aW9ucywgcHJlZmVyIHtAbGluayBsb2dFcnJvcn0uXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgZXJyb3IgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gdmFsaWRhdGUgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgcmVhc29uOiAnZW1wdHkgY29tbWFuZCcgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZXJyb3IobWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJlcnJvclwiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAgICpcbiAgICAgKiBVc2UgdGhpcyBtZXRob2Qgd2hlbiBsb2dnaW5nIGNhdWdodCBleGNlcHRpb25zIHRvIGNhcHR1cmUgdGhlIGZ1bGxcbiAgICAgKiBlcnJvciBjb250ZXh0IGluY2x1ZGluZyBuYW1lLCBtZXNzYWdlLCBzdGFjayB0cmFjZSwgYW5kIGNhdXNlIGNoYWluLlxuICAgICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBsb2dcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiB0cnkge1xuICAgICAqICAgYXdhaXQgZGFuZ2Vyb3VzT3BlcmF0aW9uKCk7XG4gICAgICogfSBjYXRjaCAoZXJyKSB7XG4gICAgICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnRmFpbGVkIHRvIGV4ZWN1dGUgZGFuZ2Vyb3VzIG9wZXJhdGlvbicsIHtcbiAgICAgKiAgICAgb3BlcmF0aW9uOiAnZGVsZXRlJyxcbiAgICAgKiAgICAgdGFyZ2V0OiAnL2ltcG9ydGFudC9maWxlLnR4dCdcbiAgICAgKiAgIH0pO1xuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBsb2dFcnJvcihlcnJvciwgbWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICBjb25zdCBlcnJvckluZm8gPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IpO1xuICAgICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgbGV2ZWw6IFwiZXJyb3JcIixcbiAgICAgICAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICAgICAgICBlcnJvcjogZXJyb3JJbmZvLFxuICAgICAgICAgICAgY29udGV4dCxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmVzIGEgaGFuZGxlciB0byBsb2cgZXZlbnRzIGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAgICpcbiAgICAgKiBUaGUgaGFuZGxlciB3aWxsIGJlIGNhbGxlZCBmb3IgZXZlcnkgbG9nIGV2ZW50IGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAgICogUmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSBjYWxsZWQgd2hlbiB0aGUgaGFuZGxlclxuICAgICAqIGlzIG5vIGxvbmdlciBuZWVkZWQuXG4gICAgICogQHBhcmFtIGxldmVsIC0gVGhlIGxvZyBsZXZlbCB0byBzdWJzY3JpYmUgdG9cbiAgICAgKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggZXZlbnRcbiAgICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIHRoZSBoYW5kbGVyXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gU3Vic2NyaWJlIHRvIGVycm9yIGV2ZW50c1xuICAgICAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICAgICAqICAgY29uc29sZS5lcnJvcihgWyR7ZXZlbnQuaG9va1R5cGV9XSAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gICAgICogICBpZiAoZXZlbnQuZXJyb3IpIHtcbiAgICAgKiAgICAgY29uc29sZS5lcnJvcihldmVudC5lcnJvci5zdGFjayk7XG4gICAgICogICB9XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAgICAgKiB1bnN1YnNjcmliZSgpO1xuICAgICAqIGBgYFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIEZvcndhcmQgdG8gZXh0ZXJuYWwgbG9nZ2luZyBsaWJyYXJ5XG4gICAgICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gICAgICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oKTtcbiAgICAgKlxuICAgICAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAgICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgb24obGV2ZWwsIGhhbmRsZXIpIHtcbiAgICAgICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGxldmVsKTtcbiAgICAgICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgIGxldmVsSGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICBsZXZlbEhhbmRsZXJzPy5kZWxldGUoaGFuZGxlcik7XG4gICAgICAgIH07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICAgKlxuICAgICAqIFRoaXMgaXMgY2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYmVmb3JlIGludm9raW5nIGhvb2sgaGFuZGxlcnMuXG4gICAgICogWW91IHR5cGljYWxseSBkb24ndCBuZWVkIHRvIGNhbGwgdGhpcyBkaXJlY3RseS5cbiAgICAgKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgdHlwZSBvZiBob29rIGJlaW5nIGV4ZWN1dGVkXG4gICAgICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgZGF0YVxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIHNldENvbnRleHQoaG9va1R5cGUsIGlucHV0KSB7XG4gICAgICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gaG9va1R5cGU7XG4gICAgICAgIHRoaXMuY3VycmVudElucHV0ID0gaW5wdXQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsZWFycyB0aGUgY3VycmVudCBob29rIGNvbnRleHQuXG4gICAgICpcbiAgICAgKiBDYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBhZnRlciBob29rIGV4ZWN1dGlvbiBjb21wbGV0ZXMuXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgY2xlYXJDb250ZXh0KCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5jdXJyZW50SW5wdXQgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENvbmZpZ3VyZXMgdGhlIGxvZyBmaWxlIHBhdGggYXQgcnVudGltZS5cbiAgICAgKlxuICAgICAqIENhbGwgdGhpcyB0byBlbmFibGUgb3IgY2hhbmdlIGZpbGUgbG9nZ2luZy4gU2V0dGluZyB0byBgbnVsbGAgZGlzYWJsZXNcbiAgICAgKiBmaWxlIGxvZ2dpbmcgKGJ1dCBkb2Vzbid0IGNsb3NlIGV4aXN0aW5nIGZpbGUgaGFuZGxlIGltbWVkaWF0ZWx5KS5cbiAgICAgKiBAcGFyYW0gZmlsZVBhdGggLSBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgb3IgbnVsbCB0byBkaXNhYmxlXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gRW5hYmxlIGZpbGUgbG9nZ2luZyBhdCBydW50aW1lXG4gICAgICogbG9nZ2VyLnNldExvZ0ZpbGUoJy92YXIvbG9nL2NsYXVkZS1ob29rcy5sb2cnKTtcbiAgICAgKlxuICAgICAqIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nXG4gICAgICogbG9nZ2VyLnNldExvZ0ZpbGUobnVsbCk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgc2V0TG9nRmlsZShmaWxlUGF0aCkge1xuICAgICAgICAvLyBDbG9zZSBleGlzdGluZyBmaWxlIGlmIG9wZW5cbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoY2xvc2VFcnJvcikge1xuICAgICAgICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBbY2xhdWRlLWNvZGUtaG9va3NdIEZhaWxlZCB0byBjbG9zZSBsb2cgZmlsZTogJHtTdHJpbmcoY2xvc2VFcnJvcil9XFxuYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZXMgYWxsIHJlc291cmNlcyBoZWxkIGJ5IHRoZSBsb2dnZXIuXG4gICAgICpcbiAgICAgKiBDYWxsIHRoaXMgZHVyaW5nIGdyYWNlZnVsIHNodXRkb3duIHRvIGVuc3VyZSBhbGwgbG9nIGRhdGEgaXMgZmx1c2hlZC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgICAqICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgICogfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGNsb3NlRXJyb3IpIHtcbiAgICAgICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgW2NsYXVkZS1jb2RlLWhvb2tzXSBGYWlsZWQgdG8gY2xvc2UgbG9nIGZpbGU6ICR7U3RyaW5nKGNsb3NlRXJyb3IpfVxcbmApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGVyZSBhcmUgYW55IGFjdGl2ZSBoYW5kbGVycyBvciBkZXN0aW5hdGlvbnMuXG4gICAgICpcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgYW55IGhhbmRsZXJzIGFyZSByZWdpc3RlcmVkIG9yIGZpbGUgbG9nZ2luZyBpcyBlbmFibGVkLlxuICAgICAqIEByZXR1cm5zIFdoZXRoZXIgdGhlIGxvZ2dlciBoYXMgYW55IGFjdGl2ZSBvdXRwdXQgZGVzdGluYXRpb25zXG4gICAgICovXG4gICAgaGFzRGVzdGluYXRpb25zKCkge1xuICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXJzIG9mIHRoaXMuaGFuZGxlcnMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChoYW5kbGVycy5zaXplID4gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5sb2dGaWxlUGF0aCAhPT0gbnVsbDtcbiAgICB9XG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFByaXZhdGUgTWV0aG9kc1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvKipcbiAgICAgKiBFbWl0cyBhIGxvZyBldmVudC5cbiAgICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgc2V2ZXJpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50XG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgbG9nIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dCBkYXRhXG4gICAgICovXG4gICAgZW1pdChsZXZlbCwgbWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgbGV2ZWwsXG4gICAgICAgICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgICAgICAgY29udGV4dCxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEZWxpdmVycyBhbiBldmVudCB0byBhbGwgcmVnaXN0ZXJlZCBkZXN0aW5hdGlvbnMuXG4gICAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byBkZWxpdmVyXG4gICAgICovXG4gICAgZGVsaXZlckV2ZW50KGV2ZW50KSB7XG4gICAgICAgIC8vIERlbGl2ZXIgdG8gZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGV2ZW50LmxldmVsKTtcbiAgICAgICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcihldmVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChoYW5kbGVyRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYFtjbGF1ZGUtY29kZS1ob29rc10gTG9nIGhhbmRsZXIgZXJyb3I6ICR7U3RyaW5nKGhhbmRsZXJFcnJvcil9XFxuYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFdyaXRlIHRvIGZpbGUgaWYgY29uZmlndXJlZFxuICAgICAgICB0aGlzLndyaXRlVG9GaWxlKGV2ZW50KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogV3JpdGVzIGFuIGV2ZW50IHRvIHRoZSBsb2cgZmlsZS5cbiAgICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIHdyaXRlXG4gICAgICovXG4gICAgd3JpdGVUb0ZpbGUoZXZlbnQpIHtcbiAgICAgICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAvLyBMYXp5IGluaXRpYWxpemF0aW9uIG9mIGZpbGUgaGFuZGxlXG4gICAgICAgIGlmICghdGhpcy5maWxlSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpbGUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgPT09IG51bGwpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBsaW5lID0gYCR7SlNPTi5zdHJpbmdpZnkoZXZlbnQpfVxcbmA7XG4gICAgICAgICAgICB3cml0ZVN5bmModGhpcy5sb2dGaWxlRmQsIGxpbmUpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoICh3cml0ZUVycm9yKSB7XG4gICAgICAgICAgICAvLyBEaXNhYmxlIGZpbGUgbG9nZ2luZyBhZnRlciBhIHdyaXRlIGZhaWx1cmUgdG8gYXZvaWQgcmVwZWF0ZWQgZXJyb3JzXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYFtjbGF1ZGUtY29kZS1ob29rc10gTG9nIGZpbGUgd3JpdGUgZmFpbGVkOiAke1N0cmluZyh3cml0ZUVycm9yKX1cXG5gKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbG9nIGZpbGUgZm9yIHdyaXRpbmcuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZpbGUoKSB7XG4gICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRW5zdXJlIGRpcmVjdG9yeSBleGlzdHNcbiAgICAgICAgICAgIGNvbnN0IGRpciA9IGRpcm5hbWUodGhpcy5sb2dGaWxlUGF0aCk7XG4gICAgICAgICAgICBpZiAoIWV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgICAgICAgICAgIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gT3BlbiBmaWxlIGZvciBhcHBlbmRpbmdcbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gb3BlblN5bmModGhpcy5sb2dGaWxlUGF0aCwgXCJhXCIpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIGluaXRpYWxpemF0aW9uIGVycm9yc1xuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIHN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb24gZnJvbSBhbiB1bmtub3duIGVycm9yLlxuICAgICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBleHRyYWN0IGluZm9ybWF0aW9uIGZyb21cbiAgICAgKiBAcmV0dXJucyBTdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgZXh0cmFjdEVycm9ySW5mbyhlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBlcnJvci5uYW1lLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgc3RhY2s6IGVycm9yLnN0YWNrLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgY2F1c2UgY2hhaW4gaWYgcHJlc2VudFxuICAgICAgICAgICAgaWYgKGVycm9yLmNhdXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpbmZvLmNhdXNlID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yLmNhdXNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpbmZvO1xuICAgICAgICB9XG4gICAgICAgIC8vIEhhbmRsZSBub24tRXJyb3IgdmFsdWVzXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiBcIlVua25vd25FcnJvclwiLFxuICAgICAgICAgICAgbWVzc2FnZTogU3RyaW5nKGVycm9yKSxcbiAgICAgICAgfTtcbiAgICB9XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTaW5nbGV0b24gRXhwb3J0XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEdsb2JhbCBsb2dnZXIgaW5zdGFuY2UgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFVzZSB0aGlzIHNpbmdsZXRvbiBmb3IgYWxsIGxvZ2dpbmcgd2l0aGluIGhvb2tzLiBUaGUgbG9nZ2VyIGlzIGNvbmZpZ3VyZWRcbiAqIHZpYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHN1cHBvcnRzIGV2ZW50IHN1YnNjcmlwdGlvbiBmb3IgY3VzdG9tXG4gKiBkZXN0aW5hdGlvbnMuXG4gKlxuICogIyMgQ29uZmlndXJhdGlvblxuICpcbiAqIHwgRW52aXJvbm1lbnQgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8XG4gKiB8LS0tLS0tLS0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18XG4gKiB8IGBDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRWAgfCBQYXRoIHRvIGxvZyBmaWxlIChKU09OIExpbmVzIGZvcm1hdCkgfFxuICpcbiAqICMjIFVzYWdlIGluIEhvb2tzXG4gKlxuICogVGhlIGxvZ2dlciBpcyBwYXNzZWQgdG8gaG9vayBoYW5kbGVycyB2aWEgY29udGV4dCBmb3IgY29udmVuaWVuY2U6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci53YXJuKCdWYWxpZGF0aW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiAjIyBFeHRlcm5hbCBJbnRlZ3JhdGlvblxuICpcbiAqIFN1YnNjcmliZSB0byBldmVudHMgdG8gZm9yd2FyZCBsb2dzIHRvIGV4dGVybmFsIHN5c3RlbXM6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICpcbiAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKHsgbGV2ZWw6ICdkZWJ1ZycgfSk7XG4gKlxuICogbG9nZ2VyLm9uKCdkZWJ1ZycsIChldmVudCkgPT4gcGlub0xvZ2dlci5kZWJ1ZyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBEaXJlY3QgdXNhZ2VcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIG9wZXJhdGlvbicpO1xuICogbG9nZ2VyLndhcm4oJ1Jlc291cmNlIGxpbWl0IGFwcHJvYWNoaW5nJywgeyB1c2FnZTogMC45IH0pO1xuICpcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IHJpc2t5T3BlcmF0aW9uKCk7XG4gKiB9IGNhdGNoIChlcnIpIHtcbiAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ1Jpc2t5IG9wZXJhdGlvbiBmYWlsZWQnKTtcbiAqIH1cbiAqIGBgYFxuICovXG4vLyBDTEFVREVfQ09ERV9IT09LU19MT0dfRU5WX1ZBUiBpcyBzZXQgdW5jb25kaXRpb25hbGx5IGJ5IHRoZSAtLWxvZy1lbnYtdmFyIGJhbm5lclxuLy8gYmVmb3JlIHRoaXMgbW9kdWxlIGluaXRpYWxpc2VzLiBJZiBhYnNlbnQsIGZhbGwgYmFjayB0byB0aGUgZGVmYXVsdCBlbnYgdmFyIG5hbWUuXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcih7XG4gICAgbG9nRW52VmFyOiBwcm9jZXNzLmVudi5DTEFVREVfQ09ERV9IT09LU19MT0dfRU5WX1ZBUiA/PyBcIkNMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFXCIsXG59KTtcbiIsICIvKipcbiAqIE91dHB1dCB0eXBlcyBhbmQgYnVpbGRlcnMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGUtc2FmZSBvdXRwdXQgYnVpbGRlciBmdW5jdGlvbnMgZm9yIGFsbCAxMiBob29rIHR5cGVzLiBFYWNoIGJ1aWxkZXJcbiAqIGFjY2VwdHMgb3B0aW9ucyB0aGF0IG1hdGNoIHRoZSB3aXJlIGZvcm1hdCBleHBlY3RlZCBieSBDbGF1ZGUgQ29kZSwgd2l0aCB0eXBlc1xuICogZGVyaXZlZCBmcm9tIHRoZSBDbGF1ZGUgQWdlbnQgU0RLJ3MgYFN5bmNIb29rSlNPTk91dHB1dGAgdHlwZS5cbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICogQG1vZHVsZVxuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGl0IENvZGUgQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEV4aXQgY29kZXMgdXNlZCBieSBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiB8IEV4aXQgQ29kZSB8IE5hbWUgfCBXaGVuIFVzZWQgfCBDbGF1ZGUgQ29kZSBCZWhhdmlvciB8XG4gKiB8LS0tLS0tLS0tLS18LS0tLS0tfC0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXxcbiAqIHwgMCB8IFN1Y2Nlc3MgfCBIYW5kbGVyIHJldHVybnMgbm9ybWFsbHkgfCBDb250aW51ZSwgcGFyc2Ugc3Rkb3V0IGFzIEpTT04gfFxuICogfCAxIHwgRXJyb3IgfCBJbnZhbGlkIGlucHV0LCBub24tYmxvY2tpbmcgZXJyb3IgfCBOb24tYmxvY2tpbmcsIHN0ZGVyciB0byB1c2VyIG9ubHkgfFxuICogfCAyIHwgQmxvY2sgfCBIYW5kbGVyIHRocm93cyBPUiBgc3RvcFJlYXNvbmAgc2V0IHwgQmxvY2tpbmcsIHN0ZGVyciBzaG93biB0byBDbGF1ZGUgfFxuICovXG5leHBvcnQgY29uc3QgRVhJVF9DT0RFUyA9IHtcbiAgICAvKiogSGFuZGxlciBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LiBDbGF1ZGUgQ29kZSBwYXJzZXMgc3Rkb3V0IGFzIEpTT04uICovXG4gICAgU1VDQ0VTUzogMCxcbiAgICAvKiogTm9uLWJsb2NraW5nIGVycm9yIG9jY3VycmVkIChlLmcuLCBpbnZhbGlkIGlucHV0KS4gc3RkZXJyIHNob3duIHRvIHVzZXIgb25seS4gKi9cbiAgICBFUlJPUjogMSxcbiAgICAvKiogSGFuZGxlciB0aHJldyBleGNlcHRpb24gT1IgYmxvY2tpbmcgYWN0aW9uIHJlcXVlc3RlZC4gc3RkZXJyIHNob3duIHRvIENsYXVkZS4gKi9cbiAgICBCTE9DSzogMixcbn07XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBPdXRwdXQgQnVpbGRlciBGYWN0b3JpZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCBoYXZlIGhvb2tTcGVjaWZpY091dHB1dCB3aXRoIGEgaG9va0V2ZW50TmFtZSBkaXNjcmltaW5hdG9yLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+IHtcbiAgICAgICAgY29uc3QgeyBob29rU3BlY2lmaWNPdXRwdXQsIC4uLnJlc3QgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHN0ZG91dCA9IGhvb2tTcGVjaWZpY091dHB1dCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IHsgLi4ucmVzdCwgaG9va1NwZWNpZmljT3V0cHV0OiB7IGhvb2tFdmVudE5hbWU6IGhvb2tUeXBlLCAuLi5ob29rU3BlY2lmaWNPdXRwdXQgfSB9XG4gICAgICAgICAgICA6IHJlc3Q7XG4gICAgICAgIHJldHVybiB7IF90eXBlOiBob29rVHlwZSwgc3Rkb3V0IH07XG4gICAgfTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCBvbmx5IHVzZSBDb21tb25PcHRpb25zIChzaW1wbGUgcGFzc3Rocm91Z2gpLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiBvcHRpb25zLFxuICAgIH0pO1xufVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IHVzZSBkZWNpc2lvbi1iYXNlZCBvcHRpb25zIChTdG9wLCBTdWJhZ2VudFN0b3ApLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4gKHtcbiAgICAgICAgX3R5cGU6IGhvb2tUeXBlLFxuICAgICAgICBzdGRvdXQ6IG9wdGlvbnMsXG4gICAgfSk7XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGV4aXQtY29kZS1iYXNlZCBob29rcyAoVGVhbW1hdGVJZGxlLCBUYXNrQ29tcGxldGVkKS5cbiAqXG4gKiBUaGVzZSBob29rcyBkb24ndCB1c2UgSlNPTiBkZWNpc2lvbiBjb250cm9sIChubyBDb21tb25PcHRpb25zKS5cbiAqIFRoZSBvbmx5IG9wdGlvbiBpcyBgc3RkZXJyYCBcdTIwMTQgd2hlbiBwcmVzZW50LCBpdCB0cmlnZ2VycyBleGl0IGNvZGUgMiAoQkxPQ0spLlxuICogU3Rkb3V0IGFsd2F5cyByZWNlaXZlcyBge31gIChlbXB0eSBKU09OIG9iamVjdCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUV4aXRDb2RlT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAoeyBzdGRlcnIgfSA9IHt9KSA9PiAoe1xuICAgICAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgICAgIHN0ZG91dDoge30sXG4gICAgICAgIC4uLihzdGRlcnIgIT09IHVuZGVmaW5lZCA/IHsgc3RkZXJyIH0gOiB7fSksXG4gICAgfSk7XG59XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQcmVUb29sVXNlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQcmVUb29sVXNlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0b29sIGV4ZWN1dGlvblxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfVxuICogfSk7XG4gKlxuICogLy8gRGVueSB3aXRoIHJlYXNvblxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2RlbnknLFxuICogICAgIHBlcm1pc3Npb25EZWNpc2lvblJlYXNvbjogJ0Rhbmdlcm91cyBjb21tYW5kIGRldGVjdGVkJ1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBbGxvdyB3aXRoIG1vZGlmaWVkIGlucHV0XG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnLFxuICogICAgIHVwZGF0ZWRJbnB1dDogeyBjb21tYW5kOiAnbHMgLWxhJyB9XG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwcmVUb29sVXNlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQcmVUb29sVXNlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdFRvb2xVc2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RUb29sVXNlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBZGQgY29udGV4dCBhZnRlciBhIGZpbGUgcmVhZFxuICogcG9zdFRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZpbGUgY29udGFpbnMgc2Vuc2l0aXZlIGRhdGEnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwb3N0VG9vbFVzZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUG9zdFRvb2xVc2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0VG9vbFVzZUZhaWx1cmUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdUcnkgdXNpbmcgYSBkaWZmZXJlbnQgYXBwcm9hY2gnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBvc3RUb29sVXNlRmFpbHVyZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFVzZXJQcm9tcHRTdWJtaXQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1RoaXMgcHJvamVjdCB1c2VzIFR5cGVTY3JpcHQgc3RyaWN0IG1vZGUnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB1c2VyUHJvbXB0U3VibWl0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJVc2VyUHJvbXB0U3VibWl0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXNzaW9uU3RhcnRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHNlc3Npb25TdGFydE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiBKU09OLnN0cmluZ2lmeSh7IHByb2plY3Q6ICdteS1wcm9qZWN0JyB9KVxuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2Vzc2lvblN0YXJ0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJTZXNzaW9uU3RhcnRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXNzaW9uRW5kIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXNzaW9uRW5kT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzZXNzaW9uRW5kT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2Vzc2lvbkVuZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiU2Vzc2lvbkVuZFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN0b3AgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN0b3BPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRoZSBzdG9wXG4gKiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAqXG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3RvcE91dHB1dCh7XG4gKiAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICByZWFzb246ICdUaGVyZSBhcmUgdW5jb21taXR0ZWQgY2hhbmdlcydcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdG9wT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihcIlN0b3BcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdG9wRmFpbHVyZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3RvcEZhaWx1cmVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHN0b3BGYWlsdXJlT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3RvcEZhaWx1cmVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIlN0b3BGYWlsdXJlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3ViYWdlbnRTdGFydCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdGFydE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc3ViYWdlbnRTdGFydE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRm9jdXMgb24gZmluZGluZyBwYXR0ZXJucydcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RhcnRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlN1YmFnZW50U3RhcnRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdWJhZ2VudFN0b3AgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN1YmFnZW50U3RvcE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQmxvY2sgd2l0aCByZWFzb25cbiAqIHN1YmFnZW50U3RvcE91dHB1dCh7XG4gKiAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICByZWFzb246ICdUYXNrIG5vdCBjb21wbGV0ZSdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdWJhZ2VudFN0b3BPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKFwiU3ViYWdlbnRTdG9wXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgTm90aWZpY2F0aW9uIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBOb3RpZmljYXRpb25PdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGFib3V0IHRoZSBub3RpZmljYXRpb25cbiAqIG5vdGlmaWNhdGlvbk91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnTm90aWZpY2F0aW9uIGZvcndhcmRlZCB0byBTbGFjayAjYWxlcnRzIGNoYW5uZWwnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFN1cHByZXNzIHRoZSBub3RpZmljYXRpb25cbiAqIG5vdGlmaWNhdGlvbk91dHB1dCh7IHN1cHByZXNzT3V0cHV0OiB0cnVlIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBub3RpZmljYXRpb25PdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIk5vdGlmaWNhdGlvblwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFByZUNvbXBhY3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFByZUNvbXBhY3RPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHByZUNvbXBhY3RPdXRwdXQoe1xuICogICBzeXN0ZW1NZXNzYWdlOiAnUmVtZW1iZXI6IHN0cmljdCBtb2RlIGlzIGVuYWJsZWQnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcHJlQ29tcGFjdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiUHJlQ29tcGFjdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBvc3RDb21wYWN0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQb3N0Q29tcGFjdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcG9zdENvbXBhY3RPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwb3N0Q29tcGFjdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiUG9zdENvbXBhY3RcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQZXJtaXNzaW9uUmVxdWVzdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUGVybWlzc2lvblJlcXVlc3RPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEF1dG8tYXBwcm92ZVxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjogeyBiZWhhdmlvcjogJ2FsbG93JyB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEF1dG8tYXBwcm92ZSB3aXRoIG1vZGlmaWVkIGlucHV0XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7XG4gKiAgICAgICBiZWhhdmlvcjogJ2FsbG93JyxcbiAqICAgICAgIHVwZGF0ZWRJbnB1dDogeyBmaWxlX3BhdGg6ICcvc2FmZS9wYXRoJyB9XG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBdXRvLWRlbnlcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHtcbiAqICAgICAgIGJlaGF2aW9yOiAnZGVueScsXG4gKiAgICAgICBtZXNzYWdlOiAnTm90IGFsbG93ZWQnLFxuICogICAgICAgaW50ZXJydXB0OiB0cnVlXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBGYWxsIHRocm91Z2ggdG8gbm9ybWFsIHByb21wdFxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUGVybWlzc2lvblJlcXVlc3RcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXR1cCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU2V0dXBPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGR1cmluZyBzZXR1cFxuICogc2V0dXBPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1Byb2plY3QgaW5pdGlhbGl6ZWQgd2l0aCBjdXN0b20gc2V0dGluZ3MnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFNpbXBsZSBwYXNzdGhyb3VnaFxuICogc2V0dXBPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXR1cE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU2V0dXBcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBUZWFtbWF0ZUlkbGUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFRlYW1tYXRlSWRsZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGVhbW1hdGUgdG8gZ28gaWRsZVxuICogdGVhbW1hdGVJZGxlT3V0cHV0KHt9KTtcbiAqXG4gKiAvLyBCbG9jayB3aXRoIGZlZWRiYWNrXG4gKiB0ZWFtbWF0ZUlkbGVPdXRwdXQoeyBzdGRlcnI6ICdDb250aW51ZSB3b3JraW5nOiB1bmZpbmlzaGVkIHRhc2tzIHJlbWFpbi4nIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB0ZWFtbWF0ZUlkbGVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRXhpdENvZGVPdXRwdXRCdWlsZGVyKFwiVGVhbW1hdGVJZGxlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgVGFza0NvbXBsZXRlZCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVGFza0NvbXBsZXRlZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGFzayBjb21wbGV0aW9uXG4gKiB0YXNrQ29tcGxldGVkT3V0cHV0KHt9KTtcbiAqXG4gKiAvLyBCbG9jayB3aXRoIGZlZWRiYWNrXG4gKiB0YXNrQ29tcGxldGVkT3V0cHV0KHsgc3RkZXJyOiAnQ2Fubm90IGNvbXBsZXRlOiB0ZXN0cyBhcmUgZmFpbGluZy4nIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB0YXNrQ29tcGxldGVkT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUV4aXRDb2RlT3V0cHV0QnVpbGRlcihcIlRhc2tDb21wbGV0ZWRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBFbGljaXRhdGlvbiBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEFuIEVsaWNpdGF0aW9uT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBY2NlcHQgdGhlIGVsaWNpdGF0aW9uXG4gKiBlbGljaXRhdGlvbk91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDogeyBhY3Rpb246ICdhY2NlcHQnLCBjb250ZW50OiB7IHVzZXJuYW1lOiAnYWxpY2UnIH0gfVxuICogfSk7XG4gKlxuICogLy8gRGVjbGluZSB0aGUgZWxpY2l0YXRpb25cbiAqIGVsaWNpdGF0aW9uT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7IGFjdGlvbjogJ2RlY2xpbmUnIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBlbGljaXRhdGlvbk91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiRWxpY2l0YXRpb25cIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBFbGljaXRhdGlvblJlc3VsdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEFuIEVsaWNpdGF0aW9uUmVzdWx0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBlbGljaXRhdGlvblJlc3VsdE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGVsaWNpdGF0aW9uUmVzdWx0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJFbGljaXRhdGlvblJlc3VsdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIENvbmZpZ0NoYW5nZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgQ29uZmlnQ2hhbmdlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25maWdDaGFuZ2VPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBjb25maWdDaGFuZ2VPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIkNvbmZpZ0NoYW5nZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIEluc3RydWN0aW9uc0xvYWRlZCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEFuIEluc3RydWN0aW9uc0xvYWRlZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW5zdHJ1Y3Rpb25zTG9hZGVkT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgaW5zdHJ1Y3Rpb25zTG9hZGVkT3V0cHV0ID0gXG4vKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIkluc3RydWN0aW9uc0xvYWRlZFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFdvcmt0cmVlQ3JlYXRlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBXb3JrdHJlZUNyZWF0ZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogd29ya3RyZWVDcmVhdGVPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB3b3JrdHJlZUNyZWF0ZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiV29ya3RyZWVDcmVhdGVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBXb3JrdHJlZVJlbW92ZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgV29ya3RyZWVSZW1vdmVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHdvcmt0cmVlUmVtb3ZlT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgd29ya3RyZWVSZW1vdmVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIldvcmt0cmVlUmVtb3ZlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgQ3dkQ2hhbmdlZCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgQ3dkQ2hhbmdlZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gUmV0dXJuIGFkZGl0aW9uYWwgcGF0aHMgdG8gd2F0Y2ggYWZ0ZXIgdGhlIGN3ZCBjaGFuZ2VcbiAqIGN3ZENoYW5nZWRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICB3YXRjaFBhdGhzOiBbJy9uZXcvcGF0aC90by93YXRjaCddXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFNpbXBsZSBwYXNzdGhyb3VnaFxuICogY3dkQ2hhbmdlZE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGN3ZENoYW5nZWRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIkN3ZENoYW5nZWRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBGaWxlQ2hhbmdlZCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgRmlsZUNoYW5nZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFVwZGF0ZSB0aGUgc2V0IG9mIHdhdGNoZWQgcGF0aHNcbiAqIGZpbGVDaGFuZ2VkT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgd2F0Y2hQYXRoczogWycvcGF0aC90by93YXRjaCcsICcvYW5vdGhlci9wYXRoJ11cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU2ltcGxlIHBhc3N0aHJvdWdoXG4gKiBmaWxlQ2hhbmdlZE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGZpbGVDaGFuZ2VkT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJGaWxlQ2hhbmdlZFwiKTtcbiIsICIvKipcbiAqIFJ1bnRpbWUgbW9kdWxlIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBIYW5kbGVzIHN0ZGluL3N0ZG91dC9leGl0IGNvZGUgc2VtYW50aWNzIGZvciBjb21waWxlZCBob29rIGV4ZWN1dGlvbi5cbiAqIFRoaXMgbW9kdWxlIGlzIHRoZSBjb3JlIG9yY2hlc3RyYXRvciB0aGF0OlxuICogLSBSZWFkcyBKU09OIGZyb20gc3RkaW4gKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogLSBJbnZva2VzIHRoZSBob29rIGhhbmRsZXJcbiAqIC0gV3JpdGVzIG91dHB1dCB0byBzdGRvdXRcbiAqIC0gTWFuYWdlcyBleGl0IGNvZGVzXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gSW4gYSBjb21waWxlZCBob29rIGZpbGVcbiAqIGltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvcnVudGltZSc7XG4gKiBpbXBvcnQgbXlIb29rIGZyb20gJy4vbXktaG9vay5qcyc7XG4gKlxuICogZXhlY3V0ZShteUhvb2spO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuaW1wb3J0IHsgcGVyc2lzdEVudlZhciwgcGVyc2lzdEVudlZhcnMgfSBmcm9tIFwiLi9lbnYuanNcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuL2xvZ2dlci5qc1wiO1xuaW1wb3J0IHsgRVhJVF9DT0RFUyB9IGZyb20gXCIuL291dHB1dHMuanNcIjtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN0ZGluL1N0ZG91dCBIYW5kbGluZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBSZWFkcyBhbGwgZGF0YSBmcm9tIHN0ZGluLlxuICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNvbXBsZXRlIHN0ZGluIGNvbnRlbnRcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmVhZFN0ZGluKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IGNodW5rcyA9IFtdO1xuICAgICAgICAvLyBTZXQgZW5jb2RpbmcgZmlyc3QgdG8gZW5zdXJlIGRhdGEgZXZlbnRzIHJlY2VpdmUgc3RyaW5nc1xuICAgICAgICBwcm9jZXNzLnN0ZGluLnNldEVuY29kaW5nKFwidXRmLThcIik7XG4gICAgICAgIHByb2Nlc3Muc3RkaW4ub24oXCJkYXRhXCIsIChjaHVuaykgPT4ge1xuICAgICAgICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImVuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKGNodW5rcy5qb2luKFwiXCIpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2Nlc3Muc3RkaW4ub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuLyoqXG4gKiBQYXJzZXMgc3RkaW4gSlNPTiBpbnB1dC5cbiAqIEBwYXJhbSBzdGRpbkNvbnRlbnQgLSBSYXcgc3RkaW4gY29udGVudFxuICogQHJldHVybnMgUGFyc2VkIGlucHV0ICh3aXJlIGZvcm1hdCB3aXRoIHNuYWtlX2Nhc2UgcHJvcGVydGllcylcbiAqIEB0aHJvd3MgRXJyb3IgaWYgSlNPTiBpcyBtYWxmb3JtZWRcbiAqL1xuZnVuY3Rpb24gcGFyc2VTdGRpbklucHV0KHN0ZGluQ29udGVudCkge1xuICAgIC8vIFBhcnNlIEpTT04gLSBpbnB1dCB1c2VzIHdpcmUgZm9ybWF0IChzbmFrZV9jYXNlKSBkaXJlY3RseVxuICAgIGNvbnN0IHJhd0lucHV0ID0gSlNPTi5wYXJzZShzdGRpbkNvbnRlbnQpO1xuICAgIHJldHVybiByYXdJbnB1dDtcbn1cbi8qKlxuICogV3JpdGVzIGhvb2sgb3V0cHV0IHRvIHN0ZG91dC5cbiAqXG4gKiBPdXRwdXQgdXNlcyBjYW1lbENhc2Uga2V5cyBwZXIgQ2xhdWRlIENvZGUgaG9vayBzcGVjaWZpY2F0aW9uLlxuICogQHBhcmFtIG91dHB1dCAtIFRoZSBob29rIG91dHB1dCB0byB3cml0ZVxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICovXG5mdW5jdGlvbiB3cml0ZVN0ZG91dChvdXRwdXQpIHtcbiAgICAvLyBPdXRwdXQgdXNlcyBjYW1lbENhc2UgLSBubyB0cmFuc2Zvcm1hdGlvbiBuZWVkZWRcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShKU09OLnN0cmluZ2lmeShvdXRwdXQpKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVycm9yIEhhbmRsaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYW4gZXJyb3Igb3V0cHV0IGZvciBtYWxmb3JtZWQgc3RkaW4gSlNPTi5cbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBwYXJzZSBlcnJvclxuICogQHJldHVybnMgSG9va091dHB1dCB3aXRoIGVtcHR5IHN0ZG91dFxuICovXG5mdW5jdGlvbiBjcmVhdGVNYWxmb3JtZWRJbnB1dE91dHB1dChlcnJvcikge1xuICAgIGxvZ2dlci5lcnJvcihgSW52YWxpZCBKU09OIGlucHV0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICByZXR1cm4geyBzdGRvdXQ6IHt9IH07XG59XG4vKipcbiAqIFdyaXRlcyBoYW5kbGVyIGVycm9yIHN0YWNrdHJhY2UgdG8gc3RkZXJyIGFuZCBleGl0cyB3aXRoIGNvZGUgMi5cbiAqXG4gKiBXaGVuIGEgaG9vayBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb246XG4gKiAtIFN0YWNrdHJhY2UgKHdpdGggc291cmNlbWFwcyBpZiBhdmFpbGFibGUpIGlzIG91dHB1dCB0byBzdGRlcnJcbiAqIC0gUHJvY2VzcyBleGl0cyB3aXRoIGNvZGUgMiAoQkxPQ0spXG4gKiAtIE5vIEpTT04gaXMgb3V0cHV0IHRvIHN0ZG91dFxuICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRocm93biBieSB0aGUgaGFuZGxlclxuICovXG5mdW5jdGlvbiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpIHtcbiAgICAvLyBXcml0ZSBzdGFjayB0cmFjZSB0byBzdGRlcnIgKHNvdXJjZW1hcHMgYXJlIGFwcGxpZWQgYXV0b21hdGljYWxseSBieSBOb2RlLmpzKVxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke2Vycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2V9XFxuYCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtTdHJpbmcoZXJyb3IpfVxcbmApO1xuICAgIH1cbiAgICAvLyBMb2cgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgbG9nZ2VyLmVycm9yKGBIb29rIGhhbmRsZXIgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIC8vIENsZWFyIGxvZ2dlciBjb250ZXh0IGFuZCBjbG9zZVxuICAgIGxvZ2dlci5jbGVhckNvbnRleHQoKTtcbiAgICBsb2dnZXIuY2xvc2UoKTtcbiAgICAvLyBFeGl0IHdpdGggY29kZSAyIChCTE9DSykgLSBubyBKU09OIG91dHB1dFxuICAgIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLkJMT0NLKTtcbn1cbi8qKlxuICogQ29udmVydHMgYSBTcGVjaWZpY0hvb2tPdXRwdXQgdG8gSG9va091dHB1dCBmb3Igd2lyZSBmb3JtYXQuXG4gKlxuICogU3BlY2lmaWNIb29rT3V0cHV0IHR5cGVzIGhhdmU6IHsgX3R5cGUsIHN0ZG91dCwgc3RkZXJyPyB9XG4gKiBIb29rT3V0cHV0IGhhczogeyBzdGRvdXQsIHN0ZGVycj8gfVxuICpcbiAqIFNpbmNlIG91dHB1dCBidWlsZGVycyBub3cgcHJvZHVjZSB3aXJlLWZvcm1hdCBkaXJlY3RseSwgdGhpcyBmdW5jdGlvblxuICogc2ltcGx5IHN0cmlwcyB0aGUgYF90eXBlYCBkaXNjcmltaW5hdG9yIGZpZWxkLlxuICogQHBhcmFtIHNwZWNpZmljT3V0cHV0IC0gVGhlIHNwZWNpZmljIG91dHB1dCBmcm9tIGEgaG9vayBoYW5kbGVyXG4gKiBAcmV0dXJucyBIb29rT3V0cHV0IHJlYWR5IGZvciBzZXJpYWxpemF0aW9uXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1vdXRwdXQtc3RydWN0dXJlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgc3BlY2lmaWNPdXRwdXQgPSBwcmVUb29sVXNlT3V0cHV0KHsgaG9va1NwZWNpZmljT3V0cHV0OiB7IHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyB9IH0pO1xuICogY29uc3QgaG9va091dHB1dCA9IGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpO1xuICogLy8gaG9va091dHB1dDogeyBzdGRvdXQ6IHsgaG9va1NwZWNpZmljT3V0cHV0OiB7IC4uLiB9IH0gfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KSB7XG4gICAgY29uc3QgeyBzdGRvdXQsIHN0ZGVyciB9ID0gc3BlY2lmaWNPdXRwdXQ7XG4gICAgcmV0dXJuIHN0ZGVyciAhPT0gdW5kZWZpbmVkID8geyBzdGRvdXQsIHN0ZGVyciB9IDogeyBzdGRvdXQgfTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4ZWN1dGUgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRXhlY3V0ZXMgYSBob29rIGhhbmRsZXIgd2l0aCBmdWxsIHJ1bnRpbWUgb3JjaGVzdHJhdGlvbi5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5IHBvaW50IHRoYXQgY29tcGlsZWQgaG9va3MgdXNlLiBXaGVuIGEgY29tcGlsZWQgaG9va1xuICogcnVucyBhcyBhIENMSTpcbiAqXG4gKiAxLiBSZWFkcyBhbGwgc3RkaW5cbiAqIDIuIFBhcnNlcyBKU09OICh3aXJlIGZvcm1hdCB3aXRoIHNuYWtlX2Nhc2UgcHJvcGVydGllcylcbiAqIDMuIFNldHMgdXAgbG9nZ2VyIGNvbnRleHQgKGhvb2tUeXBlLCBpbnB1dClcbiAqIDQuIENhbGxzIGhhbmRsZXIgd2l0aCBpbnB1dCBhbmQgY29udGV4dCAobG9nZ2VyKVxuICogNS4gSGFuZGxlcyBhbnkgZXJyb3JzLCBsb2dzIHRoZW1cbiAqIDYuIFdyaXRlcyBKU09OIHRvIHN0ZG91dFxuICogNy4gQ2xvc2VzIGxvZ2dlclxuICogOC4gRXhpdHMgd2l0aCBhcHByb3ByaWF0ZSBjb2RlXG4gKiBAcGFyYW0gaG9va0ZuIC0gVGhlIGhvb2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSAoZnJvbSBob29rIGZhY3RvcnkpXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gSW4gY29tcGlsZWQgaG9vayBmaWxlXG4gKiBpbXBvcnQgeyBleGVjdXRlIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL3J1bnRpbWUnO1xuICogaW1wb3J0IHsgcHJlVG9vbFVzZUhvb2ssIHByZVRvb2xVc2VPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGNvbnN0IG15SG9vayA9IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnUHJvY2Vzc2luZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICpcbiAqIGV4ZWN1dGUobXlIb29rKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlKGhvb2tGbikge1xuICAgIGxldCBvdXRwdXQ7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gUmVhZCBhbmQgcGFyc2Ugc3RkaW5cbiAgICAgICAgbGV0IHN0ZGluQ29udGVudDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHN0ZGluQ29udGVudCA9IGF3YWl0IHJlYWRTdGRpbigpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVycm9yLCBcIkZhaWxlZCB0byByZWFkIHN0ZGluXCIpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFBhcnNlIGFuZCB0cmFuc2Zvcm0gaW5wdXRcbiAgICAgICAgbGV0IGlucHV0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaW5wdXQgPSBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2dFcnJvcihlcnJvciwgXCJGYWlsZWQgdG8gcGFyc2Ugc3RkaW4gSlNPTlwiKTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgbG9nZ2VyIGNvbnRleHRcbiAgICAgICAgY29uc3QgaG9va0V2ZW50TmFtZSA9IGhvb2tGbi5ob29rRXZlbnROYW1lO1xuICAgICAgICBsb2dnZXIuc2V0Q29udGV4dChob29rRXZlbnROYW1lLCBpbnB1dCk7XG4gICAgICAgIC8vIEJ1aWxkIGNvbnRleHQgLSBTZXNzaW9uU3RhcnQgaG9va3MgZ2V0IGV4dGVuZGVkIGNvbnRleHQgd2l0aCBwZXJzaXN0RW52VmFyXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBob29rRXZlbnROYW1lID09PSBcIlNlc3Npb25TdGFydFwiID8geyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIsIHBlcnNpc3RFbnZWYXJzIH0gOiB7IGxvZ2dlciB9O1xuICAgICAgICAvLyBFeGVjdXRlIGhhbmRsZXJcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gYXdhaXQgaG9va0ZuKGlucHV0LCBjb250ZXh0KTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gSGFuZGxlciB0aHJldyAtIG91dHB1dCBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdCB3aXRoIGNvZGUgMlxuICAgICAgICAgICAgLy8gVGhpcyBjYWxsIG5ldmVyIHJldHVybnMgKHByb2Nlc3MuZXhpdClcbiAgICAgICAgICAgIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZmluYWxseSB7XG4gICAgICAgIC8vIFdyaXRlIG91dHB1dCBpZiB3ZSBoYXZlIGl0XG4gICAgICAgIGlmIChvdXRwdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgd3JpdGVTdGRvdXQob3V0cHV0LnN0ZG91dCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2xlYW4gdXAgbG9nZ2VyIChzaW5nbGUgY2xlYW51cCBwYXRoKVxuICAgICAgICBsb2dnZXIuY2xlYXJDb250ZXh0KCk7XG4gICAgICAgIGxvZ2dlci5jbG9zZSgpO1xuICAgICAgICAvLyBFeGl0LWNvZGUgQkxPQ0s6IHVubGlrZSBoYW5kbGVyIHRocm93IChubyBzdGRvdXQpLCB0aGlzIHBhdGggc3RpbGwgd3JpdGVzXG4gICAgICAgIC8vIHN0cnVjdHVyZWQgSlNPTiB0byBzdGRvdXQgKGFzIGVtcHR5IHt9KSBhbG9uZ3NpZGUgdGhlIHN0ZGVyciBtZXNzYWdlLlxuICAgICAgICAvLyBUaGUgY2FsbGVyIGNvbnRyb2xzIHN0ZGVyciBmb3JtYXR0aW5nIChubyBhcHBlbmRlZCBuZXdsaW5lKS5cbiAgICAgICAgaWYgKG91dHB1dD8uc3RkZXJyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKG91dHB1dC5zdGRlcnIpO1xuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuQkxPQ0spO1xuICAgICAgICB9XG4gICAgICAgIC8vIEV4aXQgd2l0aCBzdWNjZXNzIChoYW5kbGVyIGVycm9ycyBleGl0IHZpYSBoYW5kbGVIYW5kbGVyRXJyb3Igd2l0aCBjb2RlIDIpXG4gICAgICAgIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLlNVQ0NFU1MpO1xuICAgIH1cbn1cbiIsICIvKipcbiAqIFNoYXJlZCBjb250ZXh0LWJ1aWxkaW5nIHV0aWxpdGllcyBmb3IgU2Vzc2lvblN0YXJ0IGFuZCBTdWJhZ2VudFN0YXJ0IGhvb2tzLlxuICpcbiAqIEJvdGggaG9va3MgbmVlZCBpZGVudGljYWwgY2FyZCBjb250ZXh0IGluamVjdGlvbi4gVGhpcyBtb2R1bGUgZXh0cmFjdHMgdGhlXG4gKiBzaGFyZWQgbG9naWMgc28gaXQgY2FuIGJlIHJldXNlZCB3aXRob3V0IGR1cGxpY2F0aW9uLlxuICpcbiAqIEBzdW1tYXJ5IFNoYXJlZCBjb250ZXh0LWJ1aWxkaW5nIHV0aWxpdGllcyBmb3Igc2Vzc2lvbiBhbmQgc3ViYWdlbnQgaG9va3NcbiAqIEBtb2R1bGUgbGliL2NvbnRleHRcbiAqL1xuXG5pbXBvcnQgeyBleGVjRmlsZVN5bmMgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgcmVhZGRpclN5bmMsIHJlYWRGaWxlU3luYywgc3RhdFN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25JbnB1dCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IENBUkRTX0VOVl9WQVJTIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgV09SS1NQQUNFX0JSQU5DSEVTX0ZJTEUsIFdPUktTUEFDRV9DT01NSVRTX0ZJTEUgfSBmcm9tICdAY2FyZHMvc2RrL3Byb3RvY29sJztcbmltcG9ydCB7IGZvcm1hdENvbW1pdExvZyB9IGZyb20gJy4vZmlsZS10cmVlLmpzJztcblxuLyoqXG4gKiBFcnJvciB0aHJvd24gd2hlbiB0aGUgY2FyZCByZXBvc2l0b3J5IGNhbm5vdCBiZSByZWFkLlxuICpcbiAqIFdyYXBzIHRoZSB1bmRlcmx5aW5nIGZpbGVzeXN0ZW0gZXJyb3Igd2l0aCB0aGUgcmVwb3NpdG9yeSBwYXRoIGZvclxuICogc3RydWN0dXJlZCBlcnJvciBoYW5kbGluZyBpbiBzZXNzaW9uIGFuZCBzdWJhZ2VudCBob29rcy5cbiAqL1xuZXhwb3J0IGNsYXNzIENhcmRSZXBvQWNjZXNzRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IG5hbWUgPSAnQ2FyZFJlcG9BY2Nlc3NFcnJvcic7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IHJlcG9QYXRoOiBzdHJpbmcsXG4gICAgY2F1c2U6IHVua25vd25cbiAgKSB7XG4gICAgY29uc3QgcmVhc29uID0gY2F1c2UgaW5zdGFuY2VvZiBFcnJvciA/IGNhdXNlLm1lc3NhZ2UgOiBTdHJpbmcoY2F1c2UpO1xuICAgIHN1cGVyKGBDYW5ub3QgcmVhZCBjYXJkIHJlcG9zaXRvcnkgYXQgJHtyZXBvUGF0aH06ICR7cmVhc29ufWApO1xuICAgIHRoaXMuY2F1c2UgPSBjYXVzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCdWlsZHMgYSB1c2VyLWZhY2luZyBzeXN0ZW0gbWVzc2FnZSBleHBsYWluaW5nIHRoZSBjYXJkIHJlcG8gYWNjZXNzIGZhaWx1cmUuXG4gICAqXG4gICAqIEBwYXJhbSBhY3RvciAtIEh1bWFuLXJlYWRhYmxlIG5vdW4gZm9yIHRoZSBmYWlsaW5nIGVudGl0eSAoZS5nLiBcInNlc3Npb25cIiwgXCJzdWJhZ2VudFwiKS5cbiAgICogQHJldHVybnMgT2JqZWN0IHdpdGggYHN5c3RlbU1lc3NhZ2VgIGFuZCBgc3RvcFJlYXNvbmAgc3RyaW5ncy5cbiAgICovXG4gIHRvSG9va0ZhaWx1cmUoYWN0b3I6IHN0cmluZyk6IHsgc3lzdGVtTWVzc2FnZTogc3RyaW5nOyBzdG9wUmVhc29uOiBzdHJpbmcgfSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN5c3RlbU1lc3NhZ2U6IFtcbiAgICAgICAgYFRoZSBjYXJkIHJlcG9zaXRvcnkgYXQgJyR7dGhpcy5yZXBvUGF0aH0nIGlzIG5vdCBhY2Nlc3NpYmxlLmAsXG4gICAgICAgICcnLFxuICAgICAgICBgRXJyb3I6ICR7dGhpcy5tZXNzYWdlfWAsXG4gICAgICAgICcnLFxuICAgICAgICBgVGhpcyAke2FjdG9yfSBjYW5ub3QgcHJvY2VlZCB3aXRob3V0IGEgdmFsaWQgY2FyZCByZXBvc2l0b3J5LiBUbyByZXNvbHZlOmAsXG4gICAgICAgIGAxLiBWZXJpZnkgdGhlIGNhcmQgcmVwb3NpdG9yeSBkaXJlY3RvcnkgZXhpc3RzIGF0OiAke3RoaXMucmVwb1BhdGh9YCxcbiAgICAgICAgJzIuIEVuc3VyZSB0aGUgY3VycmVudCBwcm9jZXNzIGhhcyByZWFkIHBlcm1pc3Npb25zIGZvciB0aGUgZGlyZWN0b3J5IGFuZCBpdHMgY29udGVudHMnLFxuICAgICAgICAnMy4gQ2hlY2sgdGhhdCB0aGUgQ0FSRF9SRVBPX1BBVEggZW52aXJvbm1lbnQgdmFyaWFibGUgcG9pbnRzIHRvIGEgdmFsaWQgY2FyZCByZXBvc2l0b3J5J1xuICAgICAgXS5qb2luKCdcXG4nKSxcbiAgICAgIHN0b3BSZWFzb246IGBDYXJkIHJlcG9zaXRvcnkgaW5hY2Nlc3NpYmxlIGF0ICR7dGhpcy5yZXBvUGF0aH06ICR7dGhpcy5tZXNzYWdlfWBcbiAgICB9O1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENhcmQgbWV0YWRhdGFcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBTdWJzZXQgb2YgQ0FSRC5tZXRhLmpzb24gZmllbGRzIHN1cmZhY2VkIGluIHRoZSBgPGNhcmQ+YCBjb250ZXh0IGJsb2NrLlxuICovXG5pbnRlcmZhY2UgQ2FyZE1ldGEge1xuICBpZDogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICBzdGF0dXM6IHN0cmluZztcbiAgZ2F0ZXM6IHtcbiAgICBwbGFuUmVxdWlyZWQ6IGJvb2xlYW47XG4gICAgcGxhbkFwcHJvdmVkOiBib29sZWFuO1xuICAgIG1lcmdlUmVxdWVzdFJlcXVpcmVkOiBib29sZWFuO1xuICAgIG1lcmdlQXBwcm92ZWQ6IGJvb2xlYW47XG4gIH07XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHBhcnNlcyBDQVJELm1ldGEuanNvbiBmcm9tIHRoZSBjYXJkIHJlcG9zaXRvcnkuXG4gKlxuICogUmV0dXJucyBgbnVsbGAgd2hlbiB0aGUgZmlsZSBpcyBtaXNzaW5nIG9yIG1hbGZvcm1lZCBzbyB0aGUgY2FsbGVyXG4gKiBjYW4gZmFsbCBiYWNrIHRvIHZhbHVlcyBmcm9tIHtAbGluayBBY3Rpb25JbnB1dH0uXG4gKlxuICogQHBhcmFtIHJvb3RQYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAqIEByZXR1cm5zIFBhcnNlZCBtZXRhZGF0YSwgb3IgYG51bGxgIHdoZW4gdW5hdmFpbGFibGUuXG4gKi9cbmZ1bmN0aW9uIHJlYWRDYXJkTWV0YShyb290UGF0aDogc3RyaW5nKTogQ2FyZE1ldGEgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSByZWFkRmlsZVN5bmMoam9pbihyb290UGF0aCwgJ0NBUkQubWV0YS5qc29uJyksICd1dGYtOCcpO1xuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmF3KSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICBjb25zdCBnYXRlcyA9IHBhcnNlZFsnZ2F0ZXMnXSBhcyBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiB8IHVuZGVmaW5lZDtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IFN0cmluZyhwYXJzZWRbJ2lkJ10gPz8gJycpLFxuICAgICAgdGl0bGU6IFN0cmluZyhwYXJzZWRbJ3RpdGxlJ10gPz8gJycpLFxuICAgICAgc3RhdHVzOiBTdHJpbmcocGFyc2VkWydzdGF0dXMnXSA/PyAnJyksXG4gICAgICBnYXRlczoge1xuICAgICAgICBwbGFuUmVxdWlyZWQ6IGdhdGVzPy5bJ3BsYW5SZXF1aXJlZCddID09PSB0cnVlLFxuICAgICAgICBwbGFuQXBwcm92ZWQ6IGdhdGVzPy5bJ3BsYW5BcHByb3ZlZCddID09PSB0cnVlLFxuICAgICAgICBtZXJnZVJlcXVlc3RSZXF1aXJlZDogZ2F0ZXM/LlsnbWVyZ2VSZXF1ZXN0UmVxdWlyZWQnXSA9PT0gdHJ1ZSxcbiAgICAgICAgbWVyZ2VBcHByb3ZlZDogZ2F0ZXM/LlsnbWVyZ2VBcHByb3ZlZCddID09PSB0cnVlXG4gICAgICB9XG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBCdWlsZHMgdGhlIGA8Y2FyZD5gIFhNTCBibG9jayB3aXRoIGNhcmQgaWRlbnRpdHksIGdhdGVzLCBhbmQgZW52IHZhcnMuXG4gKlxuICogRmFsbHMgYmFjayB0byB7QGxpbmsgQWN0aW9uSW5wdXR9IGZpZWxkcyB3aGVuIENBUkQubWV0YS5qc29uIGlzIHVucmVhZGFibGUuXG4gKlxuICogQHBhcmFtIGFjdGlvbklucHV0IC0gUGFyc2VkIGFjdGlvbiBpbnB1dCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqIEByZXR1cm5zIFRoZSBgPGNhcmQgLi4uPi4uLjwvY2FyZD5gIGJsb2NrIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2FyZEJsb2NrKGFjdGlvbklucHV0OiBBY3Rpb25JbnB1dCk6IHN0cmluZyB7XG4gIGNvbnN0IG1ldGEgPSByZWFkQ2FyZE1ldGEoYWN0aW9uSW5wdXQuY2FyZFJlcG9QYXRoKTtcblxuICBjb25zdCBpZCA9IG1ldGE/LmlkIHx8IGFjdGlvbklucHV0LmNhcmRJZDtcbiAgY29uc3QgdGl0bGUgPSBtZXRhPy50aXRsZSB8fCAnJztcbiAgY29uc3Qgc3RhdHVzID0gbWV0YT8uc3RhdHVzIHx8ICcnO1xuXG4gIGNvbnN0IGdhdGVzTGluZSA9IG1ldGFcbiAgICA/IGBnYXRlczogcGxhblJlcXVpcmVkPSR7bWV0YS5nYXRlcy5wbGFuUmVxdWlyZWR9IHBsYW5BcHByb3ZlZD0ke21ldGEuZ2F0ZXMucGxhbkFwcHJvdmVkfSBtZXJnZVJlcXVlc3RSZXF1aXJlZD0ke21ldGEuZ2F0ZXMubWVyZ2VSZXF1ZXN0UmVxdWlyZWR9IG1lcmdlQXBwcm92ZWQ9JHttZXRhLmdhdGVzLm1lcmdlQXBwcm92ZWR9YFxuICAgIDogJyc7XG5cbiAgY29uc3Qgd29ya3NwYWNlQnJhbmNoID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX0JSQU5DSF07XG4gIGNvbnN0IGJhc2VCcmFuY2ggPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5CQVNFX0JSQU5DSF07XG5cbiAgY29uc3Qgd29ya3NwYWNlUGF0aCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIXTtcbiAgY29uc3QgZW52TGluZXMgPSBbYCAgQ0FSRF9SRVBPX1BBVEg9JHthY3Rpb25JbnB1dC5jYXJkUmVwb1BhdGh9YF07XG4gIGlmICh3b3Jrc3BhY2VQYXRoKSBlbnZMaW5lcy5wdXNoKGAgIFdPUktTUEFDRV9QQVRIPSR7d29ya3NwYWNlUGF0aH1gKTtcbiAgaWYgKGJhc2VCcmFuY2gpIGVudkxpbmVzLnB1c2goYCAgQkFTRV9CUkFOQ0g9JHtiYXNlQnJhbmNofWApO1xuICBpZiAod29ya3NwYWNlQnJhbmNoKSBlbnZMaW5lcy5wdXNoKGAgIFdPUktTUEFDRV9CUkFOQ0g9JHt3b3Jrc3BhY2VCcmFuY2h9YCk7XG5cbiAgY29uc3QgYm9keUxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAodGl0bGUpIGJvZHlMaW5lcy5wdXNoKGB0aXRsZTogJHt0aXRsZX1gKTtcbiAgYm9keUxpbmVzLnB1c2goJycpO1xuICBpZiAoZ2F0ZXNMaW5lKSBib2R5TGluZXMucHVzaChnYXRlc0xpbmUpO1xuICBib2R5TGluZXMucHVzaCgnZW52OicpO1xuICBib2R5TGluZXMucHVzaCguLi5lbnZMaW5lcyk7XG5cbiAgY29uc3QgYXR0cnMgPSBbYGlkPVwiJHtpZH1cImAsIGBzdGF0dXM9XCIke3N0YXR1c31cImAsIGBtb2RlPVwiJHthY3Rpb25JbnB1dC5leGVjdXRpb25Nb2RlfVwiYF07XG5cbiAgcmV0dXJuIGA8Y2FyZCAke2F0dHJzLmpvaW4oJyAnKX0+XFxuJHtib2R5TGluZXMuam9pbignXFxuJyl9XFxuPC9jYXJkPmA7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENhcmQgcmVwbyBsaXN0aW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRm9ybWF0cyBhbiBtdGltZSBhcyBhbiBJU08gODYwMSBzdHJpbmcgdHJ1bmNhdGVkIHRvIG1pbnV0ZXMgaW4gVVRDLlxuICpcbiAqIEBwYXJhbSBtdGltZU1zIC0gTW9kaWZpY2F0aW9uIHRpbWUgaW4gbWlsbGlzZWNvbmRzIHNpbmNlIGVwb2NoLlxuICogQHJldHVybnMgSVNPIHN0cmluZyBsaWtlIGAyMDI1LTAyLTI0VDE0OjI0WmAuXG4gKi9cbmZ1bmN0aW9uIGZvcm1hdFRpbWVzdGFtcChtdGltZU1zOiBudW1iZXIpOiBzdHJpbmcge1xuICBjb25zdCBkID0gbmV3IERhdGUobXRpbWVNcyk7XG4gIGNvbnN0IGlzbyA9IGQudG9JU09TdHJpbmcoKTsgLy8gMjAyNS0wMi0yNFQxNDoyNDoyMS4wMDBaXG4gIC8vIFRydW5jYXRlIHRvIG1pbnV0ZXM6IFwiMjAyNS0wMi0yNFQxNDoyNFpcIlxuICByZXR1cm4gYCR7aXNvLnNsaWNlKDAsIDE2KX1aYDtcbn1cblxuLyoqXG4gKiBDb3VudHMgZmlsZXMgKG5vbi1kaXJlY3RvcmllcykgaW4gYSBkaXJlY3RvcnkgYW5kIHJldHVybnMgdGhlIGxhdGVzdCBtdGltZS5cbiAqXG4gKiBAcGFyYW0gZGlyUGF0aCAtIERpcmVjdG9yeSB0byBzY2FuLlxuICogQHJldHVybnMgVHVwbGUgb2YgYFtmaWxlQ291bnQsIGxhdGVzdE10aW1lTXNdYCwgb3IgYFswLCAwXWAgb24gZXJyb3IuXG4gKi9cbmZ1bmN0aW9uIGRpclN0YXRzKGRpclBhdGg6IHN0cmluZyk6IFtjb3VudDogbnVtYmVyLCBsYXRlc3RNdGltZU1zOiBudW1iZXJdIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBlbnRyaWVzID0gcmVhZGRpclN5bmMoZGlyUGF0aCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgbGV0IGxhdGVzdCA9IDA7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICBpZiAoZW50cnkuaXNGaWxlKCkpIHtcbiAgICAgICAgY291bnQrKztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBtdCA9IHN0YXRTeW5jKGpvaW4oZGlyUGF0aCwgZW50cnkubmFtZSkpLm10aW1lTXM7XG4gICAgICAgICAgaWYgKG10ID4gbGF0ZXN0KSBsYXRlc3QgPSBtdDtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gaW5kaXZpZHVhbCBzdGF0IGZhaWx1cmUgaXMgbm9uLWZhdGFsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFtjb3VudCwgbGF0ZXN0XTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIFswLCAwXTtcbiAgfVxufVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgYDxjYXJkLXJlcG8+YCBibG9jazogcm9vdC1sZXZlbCBmaWxlcyB3aXRoIHRpbWVzdGFtcHMsXG4gKiBkaXJlY3RvcmllcyB3aXRoIGNoaWxkIGNvdW50cywgYW5kIHN0cmVhbXMgc3ViZGlyZWN0b3JpZXMuXG4gKlxuICogQHBhcmFtIHJvb3RQYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAqIEByZXR1cm5zIFRoZSBgPGNhcmQtcmVwbz4uLi48L2NhcmQtcmVwbz5gIGJsb2NrIHN0cmluZy5cbiAqIEB0aHJvd3Mge0NhcmRSZXBvQWNjZXNzRXJyb3J9IFdoZW4gdGhlIHJvb3QgZGlyZWN0b3J5IGNhbm5vdCBiZSByZWFkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYXJkUmVwb0Jsb2NrKHJvb3RQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgZW50cmllczogeyBuYW1lOiBzdHJpbmc7IGlzRGlyOiBib29sZWFuIH1bXTtcbiAgdHJ5IHtcbiAgICBlbnRyaWVzID0gcmVhZGRpclN5bmMocm9vdFBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KS5tYXAoKGQpID0+ICh7XG4gICAgICBuYW1lOiBkLm5hbWUudG9TdHJpbmcoKSxcbiAgICAgIGlzRGlyOiBkLmlzRGlyZWN0b3J5KClcbiAgICB9KSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgbmV3IENhcmRSZXBvQWNjZXNzRXJyb3Iocm9vdFBhdGgsIGVycm9yKTtcbiAgfVxuXG4gIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgIGlmIChlbnRyeS5uYW1lID09PSAnLmdpdCcpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGZ1bGxQYXRoID0gam9pbihyb290UGF0aCwgZW50cnkubmFtZSk7XG5cbiAgICBpZiAoZW50cnkuaXNEaXIpIHtcbiAgICAgIGlmIChlbnRyeS5uYW1lID09PSAnc3RyZWFtcycpIHtcbiAgICAgICAgLy8gU3RyZWFtczogc2hvdyBlYWNoIHN1YmRpcmVjdG9yeSB3aXRoIGNoaWxkIGNvdW50ICsgbGF0ZXN0IHRpbWVzdGFtcFxuICAgICAgICBsaW5lcy5wdXNoKCdzdHJlYW1zLycpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHN0cmVhbUVudHJpZXMgPSByZWFkZGlyU3luYyhmdWxsUGF0aCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgICAgICAgIGZvciAoY29uc3Qgc3ViIG9mIHN0cmVhbUVudHJpZXMpIHtcbiAgICAgICAgICAgIGlmIChzdWIuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICBjb25zdCBzdWJOYW1lID0gc3ViLm5hbWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgY29uc3QgW2NvdW50LCBsYXRlc3RdID0gZGlyU3RhdHMoam9pbihmdWxsUGF0aCwgc3ViTmFtZSkpO1xuICAgICAgICAgICAgICBjb25zdCB0cyA9IGxhdGVzdCA+IDAgPyBgICAgbGF0ZXN0ICR7Zm9ybWF0VGltZXN0YW1wKGxhdGVzdCl9YCA6ICcnO1xuICAgICAgICAgICAgICBsaW5lcy5wdXNoKGAke2AgICR7c3ViTmFtZX0vYC5wYWRFbmQoMjQpfSR7Y291bnR9IGZpbGVzJHt0c31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIHN0cmVhbXMgZGlyIHVucmVhZGFibGUgXHUyMDE0IGFscmVhZHkgbGlzdGVkIHRoZSBkaXJlY3RvcnkgbmFtZVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBOb24tc3RyZWFtcyBkaXJlY3Rvcnk6IHNob3cgY2hpbGQgY291bnQgKyBsYXRlc3QgdGltZXN0YW1wXG4gICAgICAgIGNvbnN0IFtjb3VudCwgbGF0ZXN0XSA9IGRpclN0YXRzKGZ1bGxQYXRoKTtcbiAgICAgICAgY29uc3QgdHMgPSBsYXRlc3QgPiAwID8gYCAgIGxhdGVzdCAke2Zvcm1hdFRpbWVzdGFtcChsYXRlc3QpfWAgOiAnJztcbiAgICAgICAgbGluZXMucHVzaChgJHtgJHtlbnRyeS5uYW1lfS9gLnBhZEVuZCgyNCl9JHtjb3VudH0gZmlsZXMke3RzfWApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBSb290LWxldmVsIGZpbGU6IHNob3cgbmFtZSArIHRpbWVzdGFtcFxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgbXQgPSBzdGF0U3luYyhmdWxsUGF0aCkubXRpbWVNcztcbiAgICAgICAgbGluZXMucHVzaChgJHtlbnRyeS5uYW1lfWAucGFkRW5kKDI0KSArIGZvcm1hdFRpbWVzdGFtcChtdCkpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIGxpbmVzLnB1c2goZW50cnkubmFtZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGA8Y2FyZC1yZXBvPlxcbiR7bGluZXMuam9pbignXFxuJyl9XFxuPC9jYXJkLXJlcG8+YDtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ2FyZCByZXBvIGdpdCBsb2dcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqIE1heGltdW0gbnVtYmVyIG9mIHF1YWxpZnlpbmcgY29tbWl0cyBzaG93biBpbiB0aGUgY2FyZCByZXBvIGxvZy4gKi9cbmNvbnN0IE1BWF9DQVJEX1JFUE9fTE9HX0NPTU1JVFMgPSA1O1xuXG4vKipcbiAqIEJ1aWxkcyB0aGUgYDxjYXJkLXJlcG8tbG9nPmAgYmxvY2sgd2l0aCByZWNlbnQgY29tbWl0cyBhbmQgcGF0Y2ggZGlmZnMuXG4gKlxuICogRmlsdGVycyBvdXQgY29tbWl0cyB0aGF0IGV4Y2x1c2l2ZWx5IHRvdWNoIGBzdHJlYW1zL2AgZmlsZXMgKGhpZ2gtZnJlcXVlbmN5XG4gKiB0cmFuc2NyaXB0IHdyaXRlcykuIFNob3dzIHBhdGNoIG91dHB1dCBpbnN0ZWFkIG9mIGRpZmZzdGF0IGZvciByZW1haW5pbmdcbiAqIGNvbnRlbnQuXG4gKlxuICogUmV0dXJucyBgbnVsbGAgd2hlbiB0aGUgcmVwb3NpdG9yeSBoYXMgbm8gcXVhbGlmeWluZyBjb21taXRzIG9yIGdpdCBpc1xuICogdW5hdmFpbGFibGUsIHNvIHRoZSBibG9jayBjYW4gYmUgb21pdHRlZCBmcm9tIHRoZSBvdXRwdXQuXG4gKlxuICogQHBhcmFtIHJvb3RQYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAqIEByZXR1cm5zIFRoZSBgPGNhcmQtcmVwby1sb2cgLi4uPi4uLjwvY2FyZC1yZXBvLWxvZz5gIGJsb2NrIHN0cmluZywgb3IgYG51bGxgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYXJkUmVwb0xvZ0Jsb2NrKHJvb3RQYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBsb2cgPSBleGVjRmlsZVN5bmMoXG4gICAgICAnZ2l0JyxcbiAgICAgIFtcbiAgICAgICAgJ2xvZycsXG4gICAgICAgIGAtJHtNQVhfQ0FSRF9SRVBPX0xPR19DT01NSVRTfWAsXG4gICAgICAgICctLXByZXR0eT1mb3JtYXQ6JXgwMCVoIC0gJWFuOiAlcycsXG4gICAgICAgICctLW5hbWUtb25seScsXG4gICAgICAgICctLScsXG4gICAgICAgICcuJyxcbiAgICAgICAgJzohc3RyZWFtcy8nLFxuICAgICAgICAnOiEuZ2l0aWdub3JlJyxcbiAgICAgICAgYDohJHtXT1JLU1BBQ0VfQlJBTkNIRVNfRklMRX1gLFxuICAgICAgICBgOiEke1dPUktTUEFDRV9DT01NSVRTX0ZJTEV9YFxuICAgICAgXSxcbiAgICAgIHtcbiAgICAgICAgY3dkOiByb290UGF0aCxcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGYtOCcsXG4gICAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICAgIH1cbiAgICApLnRyaW0oKTtcblxuICAgIGlmICghbG9nKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGZvcm1hdHRlZCA9IGZvcm1hdENvbW1pdExvZyhsb2csICdudWwnKTtcbiAgICBpZiAoIWZvcm1hdHRlZCkgcmV0dXJuIG51bGw7XG5cbiAgICBsZXQgdG90YWxDb3VudDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvdW50U3RyID0gZXhlY0ZpbGVTeW5jKCdnaXQnLCBbJ3Jldi1saXN0JywgJy0tY291bnQnLCAnSEVBRCddLCB7XG4gICAgICAgIGN3ZDogcm9vdFBhdGgsXG4gICAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgICB0aW1lb3V0OiA1MDAwLFxuICAgICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgICB9KS50cmltKCk7XG4gICAgICB0b3RhbENvdW50ID0gcGFyc2VJbnQoY291bnRTdHIsIDEwKTtcbiAgICAgIGlmIChOdW1iZXIuaXNOYU4odG90YWxDb3VudCkpIHRvdGFsQ291bnQgPSBudWxsO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gY291bnQgaXMgb3B0aW9uYWxcbiAgICB9XG5cbiAgICBjb25zdCBjb3VudEF0dHIgPSB0b3RhbENvdW50ICE9PSBudWxsID8gYCBjb3VudD1cIiR7dG90YWxDb3VudH1cImAgOiAnJztcbiAgICByZXR1cm4gYDxjYXJkLXJlcG8tbG9nJHtjb3VudEF0dHJ9PlxcbiR7Zm9ybWF0dGVkfVxcbjwvY2FyZC1yZXBvLWxvZz5gO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBXb3Jrc3BhY2UgcmVwbyBsb2dcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqIE1heGltdW0gbnVtYmVyIG9mIGNvbW1pdHMgc2hvd24gd2l0aCBmdWxsIGRldGFpbCBwZXIgYnJhbmNoIGJsb2NrLiAqL1xuY29uc3QgTUFYX1dPUktTUEFDRV9DT01NSVRTX1BFUl9CUkFOQ0ggPSA1O1xuXG4vKipcbiAqIFdvcmtzcGFjZSB0cmFja2luZyBkYXRhIHJlYWQgZnJvbSBzZXBhcmF0ZSB3b3Jrc3BhY2UgZmlsZXMuXG4gKi9cbmludGVyZmFjZSBXb3Jrc3BhY2VEYXRhIHtcbiAgYnJhbmNoZXM6IFJlY29yZDxzdHJpbmcsIHsgcGFyZW50QnJhbmNoPzogc3RyaW5nOyBhZGRlZEF0OiBzdHJpbmcgfT47XG4gIGNvbW1pdHM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIFJlYWRzIHdvcmtzcGFjZSBkYXRhIGZyb20gc2VwYXJhdGUgZmlsZXMgaW4gdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAqXG4gKiBSZWFkcyBicmFuY2hlcyBmcm9tIGB3b3Jrc3BhY2UtYnJhbmNoZXMuanNvbmAgYW5kIGNvbW1pdHMgZnJvbVxuICogYHdvcmtzcGFjZS1jb21taXRzLmNzdmAuIEVhY2ggZmlsZSBpcyByZWFkIGluZGVwZW5kZW50bHkgXHUyMDE0IEVOT0VOVCBpc1xuICogdHJlYXRlZCBhcyBhbiBlbXB0eSByZXN1bHQsIG90aGVyIGVycm9ycyBjYXVzZSBgbnVsbGAgdG8gYmUgcmV0dXJuZWQuXG4gKlxuICogUmV0dXJucyBkYXRhIHdoZW5ldmVyIGVpdGhlciBmaWxlIGhhcyBjb250ZW50LiBSZXR1cm5zIGBudWxsYCBvbmx5IHdoZW5cbiAqIGJvdGggZmlsZXMgYXJlIGFic2VudCBvciBlbXB0eSwgb3Igd2hlbiBhIG5vbi1FTk9FTlQgZXJyb3Igb2NjdXJzLlxuICpcbiAqIEBwYXJhbSBjYXJkUmVwb1BhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgY2FyZCByZXBvc2l0b3J5LlxuICogQHJldHVybnMgUGFyc2VkIHdvcmtzcGFjZSBkYXRhLCBvciBgbnVsbGAgd2hlbiB1bmF2YWlsYWJsZS5cbiAqL1xuZnVuY3Rpb24gcmVhZFdvcmtzcGFjZURhdGEoY2FyZFJlcG9QYXRoOiBzdHJpbmcpOiBXb3Jrc3BhY2VEYXRhIHwgbnVsbCB7XG4gIGNvbnN0IGJyYW5jaGVzOiBXb3Jrc3BhY2VEYXRhWydicmFuY2hlcyddID0ge307XG4gIGxldCBjb21taXRzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIC8vIFJlYWQgYnJhbmNoZXMgZnJvbSB3b3Jrc3BhY2UtYnJhbmNoZXMuanNvblxuICB0cnkge1xuICAgIGNvbnN0IHJhdyA9IHJlYWRGaWxlU3luYyhqb2luKGNhcmRSZXBvUGF0aCwgV09SS1NQQUNFX0JSQU5DSEVTX0ZJTEUpLCAndXRmLTgnKTtcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJhdykgYXMgUmVjb3JkPHN0cmluZywgeyBwYXJlbnRCcmFuY2g/OiBzdHJpbmc7IGFkZGVkQXQ/OiBzdHJpbmcgfT47XG4gICAgZm9yIChjb25zdCBbbmFtZSwgbWV0YV0gb2YgT2JqZWN0LmVudHJpZXMocGFyc2VkKSkge1xuICAgICAgaWYgKG1ldGEgJiYgdHlwZW9mIG1ldGEgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGJyYW5jaGVzW25hbWVdID0ge1xuICAgICAgICAgIHBhcmVudEJyYW5jaDogdHlwZW9mIG1ldGEucGFyZW50QnJhbmNoID09PSAnc3RyaW5nJyA/IG1ldGEucGFyZW50QnJhbmNoIDogdW5kZWZpbmVkLFxuICAgICAgICAgIGFkZGVkQXQ6IHR5cGVvZiBtZXRhLmFkZGVkQXQgPT09ICdzdHJpbmcnID8gbWV0YS5hZGRlZEF0IDogJydcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvLyBSZWFkIGNvbW1pdHMgZnJvbSB3b3Jrc3BhY2UtY29tbWl0cy5jc3ZcbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSByZWFkRmlsZVN5bmMoam9pbihjYXJkUmVwb1BhdGgsIFdPUktTUEFDRV9DT01NSVRTX0ZJTEUpLCAndXRmLTgnKTtcbiAgICBjb21taXRzID0gcmF3XG4gICAgICAuc3BsaXQoJ1xcbicpXG4gICAgICAubWFwKChsKSA9PiBsLnRyaW0oKSlcbiAgICAgIC5maWx0ZXIoKHMpOiBzIGlzIHN0cmluZyA9PiBzLmxlbmd0aCA+IDApO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLy8gUmV0dXJuIGRhdGEgd2hlbiBlaXRoZXIgZmlsZSBoYXMgY29udGVudFxuICBpZiAoT2JqZWN0LmtleXMoYnJhbmNoZXMpLmxlbmd0aCA9PT0gMCAmJiBjb21taXRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHsgYnJhbmNoZXMsIGNvbW1pdHMgfTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzZXQgb2YgY29tbWl0IFNIQXMgcmVhY2hhYmxlIGZyb20gYSBnaXQgcmVmLlxuICpcbiAqIEBwYXJhbSB3b3Jrc3BhY2VQYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIHdvcmtzcGFjZSByZXBvc2l0b3J5LlxuICogQHBhcmFtIHJlZiAtIEdpdCByZWYgbmFtZSAoYnJhbmNoLCB0YWcsIG9yIFNIQSkuXG4gKiBAcmV0dXJucyBTZXQgb2YgZnVsbCA0MC1jaGFyIFNIQXMsIG9yIGVtcHR5IHNldCBvbiBmYWlsdXJlLlxuICovXG5mdW5jdGlvbiBnZXRSZWFjaGFibGVTaGFzKHdvcmtzcGFjZVBhdGg6IHN0cmluZywgcmVmOiBzdHJpbmcpOiBTZXQ8c3RyaW5nPiB7XG4gIHRyeSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gZXhlY0ZpbGVTeW5jKCdnaXQnLCBbJ2xvZycsICctLWZvcm1hdD0lSCcsIHJlZl0sIHtcbiAgICAgIGN3ZDogd29ya3NwYWNlUGF0aCxcbiAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgdGltZW91dDogMTAwMDAsXG4gICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgfSkudHJpbSgpO1xuICAgIHJldHVybiBuZXcgU2V0KG91dHB1dCA/IG91dHB1dC5zcGxpdCgnXFxuJykgOiBbXSk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBuZXcgU2V0KCk7XG4gIH1cbn1cblxuLyoqXG4gKiBGaWx0ZXJzIFNIQXMgdG8gdGhvc2UgdGhhdCBleGlzdCBhcyBvYmplY3RzIGluIHRoZSB3b3Jrc3BhY2UgcmVwby5cbiAqXG4gKiBVc2VzIGBnaXQgY2F0LWZpbGUgLS1iYXRjaC1jaGVja2AgZm9yIGEgc2luZ2xlLWNhbGwgYmF0Y2ggZXhpc3RlbmNlIHRlc3QuXG4gKlxuICogQHBhcmFtIHdvcmtzcGFjZVBhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgd29ya3NwYWNlIHJlcG9zaXRvcnkuXG4gKiBAcGFyYW0gc2hhcyAtIEZ1bGwgNDAtY2hhciBTSEFzIHRvIGNoZWNrLlxuICogQHJldHVybnMgU0hBcyB0aGF0IGV4aXN0IGluIHRoZSByZXBvc2l0b3J5LlxuICovXG5mdW5jdGlvbiBmaWx0ZXJSZXNvbHZhYmxlU2hhcyh3b3Jrc3BhY2VQYXRoOiBzdHJpbmcsIHNoYXM6IHN0cmluZ1tdKTogc3RyaW5nW10ge1xuICBpZiAoc2hhcy5sZW5ndGggPT09IDApIHJldHVybiBbXTtcbiAgdHJ5IHtcbiAgICBjb25zdCBvdXRwdXQgPSBleGVjRmlsZVN5bmMoJ2dpdCcsIFsnY2F0LWZpbGUnLCAnLS1iYXRjaC1jaGVjayddLCB7XG4gICAgICBpbnB1dDogYCR7c2hhcy5qb2luKCdcXG4nKX1cXG5gLFxuICAgICAgY3dkOiB3b3Jrc3BhY2VQYXRoLFxuICAgICAgZW5jb2Rpbmc6ICd1dGYtOCcsXG4gICAgICB0aW1lb3V0OiA1MDAwLFxuICAgICAgc3RkaW86IFsncGlwZScsICdwaXBlJywgJ3BpcGUnXVxuICAgIH0pLnRyaW0oKTtcblxuICAgIGNvbnN0IGxpbmVzID0gb3V0cHV0LnNwbGl0KCdcXG4nKTtcbiAgICBjb25zdCByZXNvbHZhYmxlOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoICYmIGkgPCBzaGFzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIWxpbmVzW2ldIS5pbmNsdWRlcygnbWlzc2luZycpKSB7XG4gICAgICAgIHJlc29sdmFibGUucHVzaChzaGFzW2ldISk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXNvbHZhYmxlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gW107XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNvbHZlcyBjb21taXQgZGV0YWlscyBmb3Igc3BlY2lmaWMgU0hBcyB1c2luZyBgZ2l0IGxvZyAtLW5vLXdhbGtgLlxuICpcbiAqIEBwYXJhbSB3b3Jrc3BhY2VQYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIHdvcmtzcGFjZSByZXBvc2l0b3J5LlxuICogQHBhcmFtIHNoYXMgLSBGdWxsIDQwLWNoYXIgU0hBcyB0byByZXNvbHZlLlxuICogQHJldHVybnMgRm9ybWF0dGVkIGNvbW1pdCBsb2cgd2l0aCB0cmVlLXJlbmRlcmVkIGZpbGUgbGlzdHMsIG9yIGBudWxsYCBvbiBmYWlsdXJlLlxuICovXG5mdW5jdGlvbiByZXNvbHZlV29ya3NwYWNlQ29tbWl0RGV0YWlscyh3b3Jrc3BhY2VQYXRoOiBzdHJpbmcsIHNoYXM6IHN0cmluZ1tdKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmIChzaGFzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XG4gIHRyeSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gZXhlY0ZpbGVTeW5jKCdnaXQnLCBbJ2xvZycsICctLW5vLXdhbGsnLCAnLS1wcmV0dHk9Zm9ybWF0OiVoIC0gJXMnLCAnLS1uYW1lLW9ubHknLCAuLi5zaGFzXSwge1xuICAgICAgY3dkOiB3b3Jrc3BhY2VQYXRoLFxuICAgICAgZW5jb2Rpbmc6ICd1dGYtOCcsXG4gICAgICB0aW1lb3V0OiA1MDAwLFxuICAgICAgc3RkaW86IFsncGlwZScsICdwaXBlJywgJ3BpcGUnXVxuICAgIH0pLnRyaW0oKTtcblxuICAgIGlmICghb3V0cHV0KSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gZm9ybWF0Q29tbWl0TG9nKG91dHB1dCwgJ2JsYW5rLWxpbmUnKSB8fCBudWxsO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIENvbW1pdCBncm91cCBmb3IgYSBzaW5nbGUgYnJhbmNoIG9yIHRoZSBvcnBoYW5lZCBidWNrZXQuXG4gKi9cbmludGVyZmFjZSBDb21taXRHcm91cCB7XG4gIGJyYW5jaE5hbWU6IHN0cmluZztcbiAgcGFyZW50QnJhbmNoPzogc3RyaW5nO1xuICBzaGFzOiBzdHJpbmdbXTtcbiAgb3JwaGFuZWQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEJ1aWxkcyBgPHdvcmtzcGFjZS1yZXBvLWxvZz5gIGJsb2NrcyBzaG93aW5nIHdvcmtzcGFjZSBjb21taXRzIGdyb3VwZWQgYnkgYnJhbmNoLlxuICpcbiAqIFJlYWRzIGJyYW5jaGVzIGZyb20gYHdvcmtzcGFjZS1icmFuY2hlcy5qc29uYCBhbmQgY29tbWl0cyBmcm9tXG4gKiBgd29ya3NwYWNlLWNvbW1pdHMuY3N2YCwgcGFydGl0aW9ucyBjb21taXRzIGFjcm9zcyBicmFuY2hlcyB1c2luZyBnaXRcbiAqIHJlYWNoYWJpbGl0eSwgYW5kIHJlbmRlcnMgcGVyLWJyYW5jaCBYTUwgYmxvY2tzLiBBbHJlYWR5LXByaW50ZWQgY29tbWl0c1xuICogYXBwZWFyIGFzIGJhcmUgc2hvcnQgaGFzaGVzIGluIHN1YnNlcXVlbnQgYmxvY2tzIChkZWR1cCkuXG4gKlxuICogQnJhbmNoIHByb2Nlc3Npbmcgb3JkZXI6IHNvcnRlZCBieSBgYWRkZWRBdGAgKG9sZGVzdCBmaXJzdCkgc28gdGhlXG4gKiBmb3VuZGF0aW9uYWwgYnJhbmNoIHJlY2VpdmVzIGZ1bGwgY29tbWl0IG91dHB1dCBhbmQgbGF0ZXIgYnJhbmNoZXMgZGVkdXBcbiAqIGFnYWluc3QgaXQuXG4gKlxuICogQHBhcmFtIHdvcmtzcGFjZVBhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgd29ya3NwYWNlIHJlcG9zaXRvcnkuXG4gKiBAcGFyYW0gY2FyZFJlcG9QYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAqIEByZXR1cm5zIEFycmF5IG9mIGA8d29ya3NwYWNlLXJlcG8tbG9nPmAgYmxvY2sgc3RyaW5ncywgb3IgZW1wdHkgYXJyYXkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFdvcmtzcGFjZVJlcG9Mb2dCbG9ja3Mod29ya3NwYWNlUGF0aDogc3RyaW5nLCBjYXJkUmVwb1BhdGg6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgd29ya3NwYWNlID0gcmVhZFdvcmtzcGFjZURhdGEoY2FyZFJlcG9QYXRoKTtcbiAgaWYgKCF3b3Jrc3BhY2UpIHJldHVybiBbXTtcblxuICBjb25zdCBiYXNlQnJhbmNoID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQkFTRV9CUkFOQ0hdID8/ICdtYWluJztcblxuICAvLyBTb3J0IGJyYW5jaGVzIGJ5IGFkZGVkQXQgKG9sZGVzdCBmaXJzdClcbiAgY29uc3Qgc29ydGVkQnJhbmNoZXMgPSBPYmplY3QuZW50cmllcyh3b3Jrc3BhY2UuYnJhbmNoZXMpLnNvcnQoKFssIGFdLCBbLCBiXSkgPT4gYS5hZGRlZEF0LmxvY2FsZUNvbXBhcmUoYi5hZGRlZEF0KSk7XG5cbiAgLy8gUGFydGl0aW9uOiBlYWNoIGJyYW5jaCBpbmNsdWRlcyBBTEwgcmVhY2hhYmxlIHdvcmtzcGFjZS5jb21taXRzIChtYXkgb3ZlcmxhcCkuXG4gIC8vIFJlbmRlcmluZyBkZWR1cCBoYW5kbGVzIGNyb3NzLWJyYW5jaCBvdmVybGFwIHZpYSBiYXJlIHNob3J0IGhhc2hlcy5cbiAgY29uc3QgcmVhY2hhYmxlRnJvbVRyYWNrZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgZ3JvdXBzOiBDb21taXRHcm91cFtdID0gW107XG5cbiAgZm9yIChjb25zdCBbbmFtZSwgbWV0YV0gb2Ygc29ydGVkQnJhbmNoZXMpIHtcbiAgICBjb25zdCByZWFjaGFibGUgPSBnZXRSZWFjaGFibGVTaGFzKHdvcmtzcGFjZVBhdGgsIG5hbWUpO1xuICAgIGNvbnN0IGJyYW5jaFNoYXMgPSB3b3Jrc3BhY2UuY29tbWl0cy5maWx0ZXIoKHNoYSkgPT4gcmVhY2hhYmxlLmhhcyhzaGEpKTtcbiAgICBmb3IgKGNvbnN0IHNoYSBvZiBicmFuY2hTaGFzKSByZWFjaGFibGVGcm9tVHJhY2tlZC5hZGQoc2hhKTtcbiAgICBpZiAoYnJhbmNoU2hhcy5sZW5ndGggPiAwKSB7XG4gICAgICBncm91cHMucHVzaCh7IGJyYW5jaE5hbWU6IG5hbWUsIHBhcmVudEJyYW5jaDogbWV0YS5wYXJlbnRCcmFuY2gsIHNoYXM6IGJyYW5jaFNoYXMgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gQmFzZSBicmFuY2g6IGNvbW1pdHMgcmVhY2hhYmxlIGZyb20gYmFzZSBidXQgTk9UIGZyb20gYW55IHRyYWNrZWQgYnJhbmNoXG4gIGNvbnN0IGJhc2VSZWFjaGFibGUgPSBnZXRSZWFjaGFibGVTaGFzKHdvcmtzcGFjZVBhdGgsIGJhc2VCcmFuY2gpO1xuICBjb25zdCBiYXNlU2hhcyA9IHdvcmtzcGFjZS5jb21taXRzLmZpbHRlcigoc2hhKSA9PiBiYXNlUmVhY2hhYmxlLmhhcyhzaGEpICYmICFyZWFjaGFibGVGcm9tVHJhY2tlZC5oYXMoc2hhKSk7XG4gIGlmIChiYXNlU2hhcy5sZW5ndGggPiAwKSB7XG4gICAgZ3JvdXBzLnB1c2goeyBicmFuY2hOYW1lOiBiYXNlQnJhbmNoLCBzaGFzOiBiYXNlU2hhcyB9KTtcbiAgfVxuXG4gIC8vIE9ycGhhbmVkOiBub3QgcmVhY2hhYmxlIGZyb20gYW55IHRyYWNrZWQgYnJhbmNoIG9yIGJhc2UsIGZpbHRlciB0byByZXNvbHZhYmxlXG4gIGNvbnN0IG9ycGhhbmVkU2hhcyA9IHdvcmtzcGFjZS5jb21taXRzLmZpbHRlcigoc2hhKSA9PiAhcmVhY2hhYmxlRnJvbVRyYWNrZWQuaGFzKHNoYSkgJiYgIWJhc2VSZWFjaGFibGUuaGFzKHNoYSkpO1xuICBjb25zdCByZXNvbHZhYmxlID0gZmlsdGVyUmVzb2x2YWJsZVNoYXMod29ya3NwYWNlUGF0aCwgb3JwaGFuZWRTaGFzKTtcbiAgaWYgKHJlc29sdmFibGUubGVuZ3RoID4gMCkge1xuICAgIGdyb3Vwcy5wdXNoKHsgYnJhbmNoTmFtZTogJycsIHNoYXM6IHJlc29sdmFibGUsIG9ycGhhbmVkOiB0cnVlIH0pO1xuICB9XG5cbiAgLy8gUmVuZGVyIGJsb2NrcyB3aXRoIGNyb3NzLWJyYW5jaCBkZWR1cFxuICBjb25zdCBwcmludGVkU2hhcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBibG9ja3M6IHN0cmluZ1tdID0gW107XG5cbiAgZm9yIChjb25zdCBncm91cCBvZiBncm91cHMpIHtcbiAgICBjb25zdCBuZXdTaGFzID0gZ3JvdXAuc2hhcy5maWx0ZXIoKHNoYSkgPT4gIXByaW50ZWRTaGFzLmhhcyhzaGEpKTtcbiAgICBjb25zdCBkdXBTaGFzID0gZ3JvdXAuc2hhcy5maWx0ZXIoKHNoYSkgPT4gcHJpbnRlZFNoYXMuaGFzKHNoYSkpO1xuXG4gICAgLy8gU2hvdyBtb3N0IHJlY2VudCBOIHdpdGggZnVsbCBkZXRhaWxcbiAgICBjb25zdCBkaXNwbGF5U2hhcyA9IG5ld1NoYXMuc2xpY2UoLU1BWF9XT1JLU1BBQ0VfQ09NTUlUU19QRVJfQlJBTkNIKTtcbiAgICBjb25zdCBkZXRhaWxzID0gcmVzb2x2ZVdvcmtzcGFjZUNvbW1pdERldGFpbHMod29ya3NwYWNlUGF0aCwgZGlzcGxheVNoYXMpO1xuXG4gICAgaWYgKGRldGFpbHMpIHtcbiAgICAgIGZvciAoY29uc3Qgc2hhIG9mIGRpc3BsYXlTaGFzKSBwcmludGVkU2hhcy5hZGQoc2hhKTtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCBib2R5OiBmdWxsIGRldGFpbHMgZmlyc3QsIHRoZW4gYmFyZSBoYXNoZXMgZm9yIGRlZHVwXG4gICAgY29uc3QgYm9keVBhcnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGlmIChkZXRhaWxzKSBib2R5UGFydHMucHVzaChkZXRhaWxzKTtcbiAgICBpZiAoZHVwU2hhcy5sZW5ndGggPiAwKSB7XG4gICAgICBib2R5UGFydHMucHVzaChkdXBTaGFzLm1hcCgoc2hhKSA9PiBzaGEuc2xpY2UoMCwgNykpLmpvaW4oJ1xcbicpKTtcbiAgICB9XG5cbiAgICBpZiAoYm9keVBhcnRzLmxlbmd0aCA9PT0gMCkgY29udGludWU7XG5cbiAgICAvLyBCdWlsZCBYTUwgdGFnXG4gICAgY29uc3QgYXR0cnM6IHN0cmluZ1tdID0gW107XG4gICAgaWYgKGdyb3VwLm9ycGhhbmVkKSB7XG4gICAgICBhdHRycy5wdXNoKCdvcnBoYW5lZD1cInRydWVcIicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhdHRycy5wdXNoKGBicmFuY2g9XCIke2dyb3VwLmJyYW5jaE5hbWV9XCJgKTtcbiAgICAgIGlmIChncm91cC5wYXJlbnRCcmFuY2gpIGF0dHJzLnB1c2goYHBhcmVudEJyYW5jaD1cIiR7Z3JvdXAucGFyZW50QnJhbmNofVwiYCk7XG4gICAgfVxuICAgIGF0dHJzLnB1c2goYGNvdW50PVwiJHtncm91cC5zaGFzLmxlbmd0aH1cImApO1xuXG4gICAgYmxvY2tzLnB1c2goYDx3b3Jrc3BhY2UtcmVwby1sb2cgJHthdHRycy5qb2luKCcgJyl9PlxcbiR7Ym9keVBhcnRzLmpvaW4oJ1xcbicpfVxcbjwvd29ya3NwYWNlLXJlcG8tbG9nPmApO1xuICB9XG5cbiAgcmV0dXJuIGJsb2Nrcztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29tYmluZWQgY29udGV4dFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgY29tYmluZWQgYWRkaXRpb25hbCBjb250ZXh0IHN0cmluZyBmb3Igc2Vzc2lvbiBhbmQgc3ViYWdlbnQgaG9va3MuXG4gKlxuICogUHJvZHVjZXMgWE1MIGJsb2NrczogYDxjYXJkPmAgKGlkZW50aXR5ICsgZ2F0ZXMgKyBlbnYpLCBgPGNhcmQtcmVwbz5gXG4gKiAoZGlyZWN0b3J5IHN1bW1hcnkpLCBvcHRpb25hbGx5IGA8Y2FyZC1yZXBvLWxvZz5gIChyZWNlbnQgY2FyZCByZXBvIGNvbW1pdHMpLFxuICogYW5kIG9wdGlvbmFsbHkgYDx3b3Jrc3BhY2UtcmVwby1sb2c+YCBibG9ja3MgKHdvcmtzcGFjZSBjb21taXRzIHBlciBicmFuY2gpLlxuICogTGV0IHtAbGluayBDYXJkUmVwb0FjY2Vzc0Vycm9yfSBwcm9wYWdhdGUgdG8gdGhlIGNhbGxlciBmb3Igc3RydWN0dXJlZFxuICogZXJyb3IgaGFuZGxpbmcuXG4gKlxuICogQHBhcmFtIGFjdGlvbklucHV0IC0gUGFyc2VkIGFjdGlvbiBpbnB1dCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqIEByZXR1cm5zIENvbWJpbmVkIGNvbnRleHQgc3RyaW5nIHdpdGggWE1MIGJsb2Nrcy5cbiAqIEB0aHJvd3Mge0NhcmRSZXBvQWNjZXNzRXJyb3J9IFdoZW4gdGhlIGNhcmQgcmVwb3NpdG9yeSBjYW5ub3QgYmUgcmVhZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWRkaXRpb25hbENvbnRleHQoYWN0aW9uSW5wdXQ6IEFjdGlvbklucHV0KTogc3RyaW5nIHtcbiAgY29uc3QgY2FyZEJsb2NrID0gYnVpbGRDYXJkQmxvY2soYWN0aW9uSW5wdXQpO1xuICBjb25zdCByZXBvQmxvY2sgPSBidWlsZENhcmRSZXBvQmxvY2soYWN0aW9uSW5wdXQuY2FyZFJlcG9QYXRoKTtcbiAgY29uc3QgbG9nQmxvY2sgPSBidWlsZENhcmRSZXBvTG9nQmxvY2soYWN0aW9uSW5wdXQuY2FyZFJlcG9QYXRoKTtcbiAgY29uc3Qgd29ya3NwYWNlTG9nQmxvY2tzID0gYnVpbGRXb3Jrc3BhY2VSZXBvTG9nQmxvY2tzKGFjdGlvbklucHV0LnJlcG9Sb290LCBhY3Rpb25JbnB1dC5jYXJkUmVwb1BhdGgpO1xuXG4gIGNvbnN0IHBhcnRzID0gW2NhcmRCbG9jaywgcmVwb0Jsb2NrXTtcbiAgaWYgKGxvZ0Jsb2NrKSBwYXJ0cy5wdXNoKGxvZ0Jsb2NrKTtcbiAgcGFydHMucHVzaCguLi53b3Jrc3BhY2VMb2dCbG9ja3MpO1xuICByZXR1cm4gcGFydHMuam9pbignXFxuXFxuJyk7XG59XG4iLCAiLyoqXG4gKiBCcmFuY2ggYW5kIHdvcmt0cmVlIHRyYWNraW5nIHR5cGVzIGZvciBDYXJkcyBWMiB3b3Jrc3BhY2UgaW50ZWdyYXRpb24uXG4gKlxuICogVGhlc2UgdHlwZXMgc3VwcG9ydCB0cmFja2luZyBHaXQgYnJhbmNoZXMgYW5kIHRoZWlyIGFzc29jaWF0ZWQgd29ya3RyZWVzIHdpdGhpblxuICogYSBjYXJkJ3Mgd29ya3NwYWNlLiBCcmFuY2ggbWV0YWRhdGEgaXMgcGVyc2lzdGVkIGluIHNlcGFyYXRlIHdvcmtzcGFjZS1icmFuY2hlcy5qc29uXG4gKiBhbmQgd29ya3NwYWNlLWNvbW1pdHMuY3N2IGZpbGVzLCB0cmFja2VkIHdpdGggc3RhdGljIG1ldGFkYXRhIChicmFuY2ggbmFtZSwgd29ya3RyZWUgcGF0aCxcbiAqIGFkZGVkQXQgdGltZXN0YW1wKSBhbmQgZGVyaXZlZCBmaWVsZHMgY29tcHV0ZWQgYXQgcmVhZCB0aW1lIChleGlzdHMsIGlzTWVyZ2VkLCBjb21taXRzKS5cbiAqXG4gKiBUaGUgYnJhbmNoIEFQSSAoYEdFVCAvY2FyZHMvOmlkL2JyYW5jaGVzYCwgYFBPU1QgL2NhcmRzLzppZC9icmFuY2hlc2ApIHVzZXNcbiAqIHRoZXNlIHR5cGVzIHRvIGV4cG9zZSB3b3Jrc3BhY2UgdHJhY2tpbmcgc3RhdGUgdG8gY2xpZW50cyBhbmQgZW5hYmxlIGJyYW5jaFxuICogYXNzb2NpYXRpb24gd2l0aCBjYXJkcy5cbiAqXG4gKiBAc3VtbWFyeSBCcmFuY2ggYW5kIHdvcmt0cmVlIHRyYWNraW5nIHR5cGVzIGZvciBDYXJkcyBWMiB3b3Jrc3BhY2UgaW50ZWdyYXRpb25cbiAqIEBtb2R1bGUgdHlwZXMvYnJhbmNoXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBDb21taXREZXRhaWxzIH0gZnJvbSAnLi90aW1lbGluZS5qcyc7XG5cbi8qKlxuICogV2VsbC1rbm93biBTSEEgZm9yIGFuIGVtcHR5IGdpdCB0cmVlLlxuICpcbiAqIFRoaXMgaXMgYSBkZXRlcm1pbmlzdGljIHZhbHVlIHByb2R1Y2VkIGJ5IGBnaXQgaGFzaC1vYmplY3QgLXQgdHJlZSAvZGV2L251bGxgXG4gKiBhbmQgbmV2ZXIgY2hhbmdlcyBhY3Jvc3MgZ2l0IHZlcnNpb25zLiBVc2VkIGFzIHRoZSBkaWZmIGJhc2Ugd2hlbiBjb21wYXJpbmdcbiAqIGFnYWluc3QgYSBzdGF0ZSB3aXRoIG5vIHByaW9yIGNvbW1pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBFTVBUWV9UUkVFX1NIQSA9ICc0YjgyNWRjNjQyY2I2ZWI5YTA2MGU1NGJmOGQ2OTI4OGZiZWU0OTA0JztcblxuZXhwb3J0IGNvbnN0IFdPUktTUEFDRV9CUkFOQ0hFU19GSUxFID0gJ3dvcmtzcGFjZS1icmFuY2hlcy5qc29uJztcbmV4cG9ydCBjb25zdCBXT1JLU1BBQ0VfQ09NTUlUU19GSUxFID0gJ3dvcmtzcGFjZS1jb21taXRzLmNzdic7XG5cbi8qKlxuICogQSBzaW5nbGUgdHJhY2tlZCBicmFuY2ggd2l0aGluIGEgY2FyZCdzIHdvcmtzcGFjZSBibG9jay5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtaW5pbWFsIG1ldGFkYXRhIHBlcnNpc3RlZCBmb3IgZWFjaCBicmFuY2ggaW4gd29ya3NwYWNlLWJyYW5jaGVzLmpzb24uXG4gKiBUaGUgd29ya3RyZWUgcGF0aCBpcyBvcHRpb25hbCBhbmQgbWFjaGluZS1zcGVjaWZpYzsgaXQgbWF5IGJlY29tZSBzdGFsZSBpZlxuICogdGhlIHdvcmt0cmVlIGlzIG1vdmVkIG9yIGRlbGV0ZWQgb3V0c2lkZSBvZiB0aGUgY2FyZHMgc3lzdGVtLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtzcGFjZUJyYW5jaCB7XG4gIC8qKlxuICAgKiBPcHRpb25hbCBhYnNvbHV0ZSBwYXRoIHRvIHdvcmt0cmVlIGRpcmVjdG9yeSAobWFjaGluZS1zcGVjaWZpYywgbWF5IGJlIHN0YWxlKS5cbiAgICogVGhpcyBwYXRoIGlzIGFkdmlzb3J5IG9ubHkgYW5kIHNob3VsZCBiZSB2YWxpZGF0ZWQgYmVmb3JlIHVzZS5cbiAgICovXG4gIHdvcmt0cmVlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBOYW1lIG9mIHRoZSBicmFuY2ggdGhpcyB3YXMgY3JlYXRlZCBmcm9tIChlLmcuLCAnbWFpbicsICdtYXN0ZXInKS5cbiAgICogVXNlZCBhcyB0aGUgYmFzZSByZWYgZm9yIGNvbXBhcmlzb25zLCBmYXN0LWZvcndhcmQgZGV0ZWN0aW9uLCBhbmQgcmViYXNlIHRhcmdldGluZy5cbiAgICovXG4gIHBhcmVudEJyYW5jaDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBJU08gODYwMSB0aW1lc3RhbXAgd2hlbiBicmFuY2ggd2FzIGFkZGVkIHRvIHRoZSBjYXJkLlxuICAgKiBVc2VkIGZvciBjaHJvbm9sb2dpY2FsIHNvcnRpbmcgYW5kIGF1ZGl0IHRyYWlscy5cbiAgICovXG4gIGFkZGVkQXQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBCcmFuY2ggaW5mbyByZXR1cm5lZCBieSBHRVQgL2NhcmRzLzppZC9icmFuY2hlcyAoaW5jbHVkZXMgY29tcHV0ZWQgZmllbGRzKS5cbiAqXG4gKiBUaGlzIHR5cGUgZXh0ZW5kcyB0aGUgcGVyc2lzdGVkIFdvcmtzcGFjZUJyYW5jaCBkYXRhIHdpdGggcnVudGltZS1jb21wdXRlZFxuICogZmllbGRzIHRoYXQgcmVmbGVjdCB0aGUgY3VycmVudCBHaXQgcmVwb3NpdG9yeSBzdGF0ZS4gQ29tcHV0ZWQgZmllbGRzIGFyZVxuICogbmV2ZXIgcGVyc2lzdGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEJyYW5jaEluZm8ge1xuICAvKipcbiAgICogQnJhbmNoIG5hbWUgKG1heSBjb250YWluIHNsYXNoZXMsIGUuZy4sIFwiZmVhdHVyZS9hdXRoXCIpLlxuICAgKiBUaGlzIGlzIHRoZSBHaXQgcmVmIG5hbWUsIG5vdCBhIGZpbGVzeXN0ZW0gcGF0aC5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogT3B0aW9uYWwgd29ya3RyZWUgcGF0aCBhc3NvY2lhdGVkIHdpdGggdGhpcyBicmFuY2guXG4gICAqIENvcGllZCBmcm9tIFdvcmtzcGFjZUJyYW5jaC53b3JrdHJlZSBpZiBwcmVzZW50LlxuICAgKi9cbiAgd29ya3RyZWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFBhcmVudCBicmFuY2ggbmFtZSBmcm9tIHdoaWNoIHRoaXMgYnJhbmNoIHdhcyBjcmVhdGVkIChlLmcuLCAnbWFpbicsICdtYXN0ZXInKS5cbiAgICogVXNlZCBhcyB0aGUgYmFzZSByZWYgZm9yIGNvbXBhcmlzb25zLlxuICAgKi9cbiAgcGFyZW50QnJhbmNoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIElTTyA4NjAxIHRpbWVzdGFtcCB3aGVuIGJyYW5jaCB3YXMgYWRkZWQuXG4gICAqIENvcGllZCBmcm9tIFdvcmtzcGFjZUJyYW5jaC5hZGRlZEF0LlxuICAgKi9cbiAgYWRkZWRBdDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBicmFuY2ggc3RpbGwgZXhpc3RzIGluIGdpdCAoY29tcHV0ZWQgYXQgcmVhZCB0aW1lKS5cbiAgICogRmFsc2UgaWYgdGhlIGJyYW5jaCByZWYgaGFzIGJlZW4gZGVsZXRlZC5cbiAgICovXG4gIGV4aXN0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGJyYW5jaCB0aXAgaXMgbWVyZ2VkIGludG8gcmVxdWVzdGluZyB3b3Jrc3BhY2UgSEVBRC5cbiAgICogQ29tcHV0ZWQgYXQgcmVhZCB0aW1lLCBuZXZlciBzdG9yZWQuIE9ubHkgbWVhbmluZ2Z1bCB3aGVuIGV4aXN0cz10cnVlLlxuICAgKi9cbiAgaXNNZXJnZWQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBDb21taXQgU0hBcyByZWFjaGFibGUgZnJvbSB0aGlzIGJyYW5jaCBidXQgbm90IGZyb20gSEVBRCAoY29tcHV0ZWQgYXQgcmVhZCB0aW1lKS5cbiAgICogRW1wdHkgYXJyYXkgaWYgYnJhbmNoIGlzIGZ1bGx5IG1lcmdlZCBvciBkb2VzIG5vdCBleGlzdC5cbiAgICovXG4gIGNvbW1pdHM/OiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBSZXNwb25zZSBzaGFwZSBmb3IgR0VUIC9jYXJkcy86aWQvYnJhbmNoZXMuXG4gKlxuICogUmV0dXJucyBhbGwgdHJhY2tlZCBicmFuY2hlcyBmb3IgYSBjYXJkIHdpdGggY29tcHV0ZWQgcnVudGltZSBmaWVsZHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQnJhbmNoZXNSZXNwb25zZSB7XG4gIC8qKlxuICAgKiBMaXN0IG9mIHRyYWNrZWQgYnJhbmNoZXMgd2l0aCBjb21wdXRlZCBmaWVsZHMuXG4gICAqIFNvcnRlZCBieSBhZGRlZEF0IHRpbWVzdGFtcCAob2xkZXN0IGZpcnN0KS5cbiAgICovXG4gIGJyYW5jaGVzOiBCcmFuY2hJbmZvW107XG5cbiAgLyoqXG4gICAqIEFsbCBjYXJkLWxldmVsIGNvbW1pdCBTSEFzIGZyb20gd29ya3NwYWNlLWNvbW1pdHMuY3N2LlxuICAgKiBQcmVzZW50IHJlZ2FyZGxlc3Mgb2YgYnJhbmNoIHN0YXRlLCBzbyB0aGUgVUkgY2FuIHNob3cgY2hhbmdlc1xuICAgKiBldmVuIGFmdGVyIGFsbCB0cmFja2VkIGJyYW5jaGVzIGhhdmUgYmVlbiByZW1vdmVkLlxuICAgKi9cbiAgY29tbWl0czogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIERlZmF1bHQgYnJhbmNoIG9mIHRoZSB3b3Jrc3BhY2UgcmVwb3NpdG9yeSAoZS5nLiwgJ21haW4nLCAnbWFzdGVyJykuXG4gICAqIERldGVjdGVkIGZyb20gYHJlZnMvcmVtb3Rlcy9vcmlnaW4vSEVBRGAsIGZhbGxpbmcgYmFjayB0byBjdXJyZW50IEhFQUQgYnJhbmNoLlxuICAgKiBVc2VkIGFzIHRoZSBiYXNlIHJlZiBmb3IgY2FyZC1sZXZlbCBjb21taXRzIHdoZW4gbm8gdHJhY2tlZCBicmFuY2hlcyByZW1haW4uXG4gICAqL1xuICBkZWZhdWx0QnJhbmNoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFNIQXMgb2YgY2FyZCBjb21taXRzIHRoYXQgYXJlIGFuY2VzdG9ycyBvZiBIRUFEIGF0IHRoZSByZXF1ZXN0aW5nIHdvcmtzcGFjZS5cbiAgICogRW1wdHkgYXJyYXkgd2hlbiB3b3Jrc3BhY2VQYXRoIGlzIG5vdCBwcm92aWRlZCBvciBnaXQgb3BlcmF0aW9ucyBmYWlsIGdyYWNlZnVsbHkuXG4gICAqL1xuICBtZXJnZWRDb21taXRzOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogQnJhbmNoIG5hbWUgY2hlY2tlZCBvdXQgYXQgdGhlIHJlcXVlc3Rpbmcgd29ya3NwYWNlIChlLmcuLCBcIm1haW5cIiwgXCJmZWF0dXJlLWF1dGhcIikuXG4gICAqIFwiSEVBRFwiIHdoZW4gaW4gZGV0YWNoZWQgSEVBRCBzdGF0ZS5cbiAgICogRW1wdHkgc3RyaW5nIHdoZW4gd29ya3NwYWNlUGF0aCBpcyBub3QgcHJvdmlkZWQgb3IgZ2l0IG9wZXJhdGlvbnMgZmFpbCBncmFjZWZ1bGx5LlxuICAgKi9cbiAgaGVhZEJyYW5jaDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBDb21taXQgZGV0YWlscyBrZXllZCBieSBTSEEgZm9yIGVhY2ggZW50cnkgaW4gYGNvbW1pdHNgLlxuICAgKiBFbXB0eSB3aGVuIHRoZXJlIGFyZSBubyBjb21taXRzLiBPbmx5IGFic2VudCB3aGVuIGB3b3Jrc3BhY2VQYXRoYCB3YXMgbm90IHByb3ZpZGVkXG4gICAqIChpLmUuIHRoZSByZWluZGV4IHBhdGggXHUyMDE0IGBjb21taXREZXRhaWxzYCBpcyBkZWxpdmVyZWQgc2VwYXJhdGVseSB2aWEgYFdvcmtzcGFjZUNvbW1pdEV2ZW50YCkuXG4gICAqL1xuICBjb21taXREZXRhaWxzPzogUmVjb3JkPHN0cmluZywgQ29tbWl0RGV0YWlscz47XG59XG5cbi8qKlxuICogUmVxdWVzdCBib2R5IGZvciBQT1NUIC9jYXJkcy86aWQvYnJhbmNoZXMuXG4gKlxuICogVXNlZCB0byBhZGQgYSBuZXcgYnJhbmNoIHRvIGEgY2FyZCdzIHdvcmtzcGFjZSB0cmFja2luZyBibG9jay5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBZGRCcmFuY2hSZXF1ZXN0IHtcbiAgLyoqXG4gICAqIEJyYW5jaCBuYW1lIHRvIHRyYWNrLlxuICAgKiBNdXN0IGJlIGEgdmFsaWQgR2l0IHJlZiBuYW1lIChtYXkgY29udGFpbiBzbGFzaGVzKS5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogT3B0aW9uYWwgd29ya3RyZWUgcGF0aC5cbiAgICogU2hvdWxkIGJlIGFuIGFic29sdXRlIHBhdGggdG8gYSB2YWxpZCB3b3JrdHJlZSBkaXJlY3RvcnkuXG4gICAqL1xuICB3b3JrdHJlZT86IHN0cmluZztcblxuICAvKipcbiAgICogUGFyZW50IGJyYW5jaCBuYW1lIGZyb20gd2hpY2ggdGhpcyBicmFuY2ggd2FzIGNyZWF0ZWQgKGUuZy4sICdtYWluJywgJ21hc3RlcicpLlxuICAgKiBVc2VkIGFzIHRoZSBiYXNlIHJlZiBmb3IgY29tcGFyaXNvbnMuXG4gICAqL1xuICBwYXJlbnRCcmFuY2g6IHN0cmluZztcbn1cbiIsICIvKipcbiAqIFRyZWUtZm9ybWF0dGVkIHJlbmRlcmluZyBmb3IgZmlsZSBwYXRoIGxpc3RzLlxuICpcbiAqIEJ1aWxkcyBhIHRyaWUgZnJvbSBmaWxlIHBhdGhzLCBjb2xsYXBzZXMgc2luZ2xlLWNoaWxkIGRpcmVjdG9yeSBjaGFpbnMsXG4gKiBhbmQgcmVuZGVycyBhbiBpbmRlbnRlZCB0cmVlIHRoYXQgY29tcHJlc3NlcyBzaGFyZWQgcHJlZml4ZXMuXG4gKlxuICogQHN1bW1hcnkgUHJlZml4LWNvbXByZXNzZWQgZmlsZSB0cmVlIHJlbmRlcmluZ1xuICovXG5cbi8qKiBJbnRlcm5hbCB0cmllIG5vZGUgZm9yIGJ1aWxkaW5nIHRoZSBmaWxlIHRyZWUuICovXG5pbnRlcmZhY2UgVHJpZU5vZGUge1xuICBjaGlsZHJlbjogTWFwPHN0cmluZywgVHJpZU5vZGU+O1xuICBpc0ZpbGU6IGJvb2xlYW47XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU5vZGUoKTogVHJpZU5vZGUge1xuICByZXR1cm4geyBjaGlsZHJlbjogbmV3IE1hcCgpLCBpc0ZpbGU6IGZhbHNlIH07XG59XG5cbi8qKlxuICogSW5zZXJ0cyBhIHBhdGggaW50byB0aGUgdHJpZSwgc3BsaXR0aW5nIG9uIGAvYC5cbiAqXG4gKiBAcGFyYW0gcm9vdCAtIFJvb3QgdHJpZSBub2RlLlxuICogQHBhcmFtIHBhdGggLSBGaWxlIHBhdGggdG8gaW5zZXJ0LlxuICovXG5mdW5jdGlvbiBpbnNlcnRQYXRoKHJvb3Q6IFRyaWVOb2RlLCBwYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgbGV0IG5vZGUgPSByb290O1xuICBjb25zdCBzZWdtZW50cyA9IHBhdGguc3BsaXQoJy8nKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWdtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHNlZyA9IHNlZ21lbnRzW2ldITtcbiAgICBsZXQgY2hpbGQgPSBub2RlLmNoaWxkcmVuLmdldChzZWcpO1xuICAgIGlmICghY2hpbGQpIHtcbiAgICAgIGNoaWxkID0gY3JlYXRlTm9kZSgpO1xuICAgICAgbm9kZS5jaGlsZHJlbi5zZXQoc2VnLCBjaGlsZCk7XG4gICAgfVxuICAgIG5vZGUgPSBjaGlsZDtcbiAgfVxuICBub2RlLmlzRmlsZSA9IHRydWU7XG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgdHJpZSBhcyBhbiBpbmRlbnRlZCB0cmVlIHN0cmluZy5cbiAqXG4gKiBTaW5nbGUtY2hpbGQgZGlyZWN0b3J5IGNoYWlucyBhcmUgY29sbGFwc2VkOiBgc3JjL2AgXHUyMTkyIGBsaWIvYCBcdTIxOTIgYHV0aWxzLnRzYFxuICogYmVjb21lcyBgc3JjL2xpYi91dGlscy50c2Agd2hlbiBlYWNoIGludGVybWVkaWF0ZSBoYXMgZXhhY3RseSBvbmUgY2hpbGQuXG4gKlxuICogRGlyZWN0b3JpZXMgc29ydCBiZWZvcmUgZmlsZXMgYXQgZWFjaCBsZXZlbC4gRW50cmllcyBhcmUgYWxwaGFiZXRpY2FsIHdpdGhpblxuICogZWFjaCBncm91cC5cbiAqXG4gKiBAcGFyYW0gbm9kZSAtIEN1cnJlbnQgdHJpZSBub2RlIHRvIHJlbmRlci5cbiAqIEBwYXJhbSBpbmRlbnQgLSBOdW1iZXIgb2YgbGVhZGluZyBzcGFjZXMgZm9yIHRoaXMgbGV2ZWwuXG4gKiBAcmV0dXJucyBSZW5kZXJlZCB0cmVlIGxpbmVzIGpvaW5lZCBieSBuZXdsaW5lcy5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyTm9kZShub2RlOiBUcmllTm9kZSwgaW5kZW50OiBudW1iZXIpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgcHJlZml4ID0gJyAnLnJlcGVhdChpbmRlbnQpO1xuXG4gIC8vIFNlcGFyYXRlIGNoaWxkcmVuIGludG8gZGlyZWN0b3JpZXMgYW5kIGZpbGVzXG4gIGNvbnN0IGRpcnM6IFtzdHJpbmcsIFRyaWVOb2RlXVtdID0gW107XG4gIGNvbnN0IGZpbGVzOiBbc3RyaW5nLCBUcmllTm9kZV1bXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgW25hbWUsIGNoaWxkXSBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgaWYgKGNoaWxkLmlzRmlsZSAmJiBjaGlsZC5jaGlsZHJlbi5zaXplID09PSAwKSB7XG4gICAgICBmaWxlcy5wdXNoKFtuYW1lLCBjaGlsZF0pO1xuICAgIH0gZWxzZSBpZiAoY2hpbGQuaXNGaWxlICYmIGNoaWxkLmNoaWxkcmVuLnNpemUgPiAwKSB7XG4gICAgICAvLyBBIHBhdGggc2VnbWVudCB0aGF0IGlzIGJvdGggYSBmaWxlIGFuZCBoYXMgY2hpbGRyZW4gXHUyMDE0IHRyZWF0IGFzIGZpbGVcbiAgICAgIC8vIGZvciBpdHMgb3duIGVudHJ5LCB0aGVuIHJlbmRlciBjaGlsZHJlbiBzZXBhcmF0ZWx5LlxuICAgICAgZmlsZXMucHVzaChbbmFtZSwgY3JlYXRlTm9kZSgpXSk7IC8vIGZpbGUgZW50cnlcbiAgICAgIGRpcnMucHVzaChbbmFtZSwgY2hpbGRdKTsgLy8gZGlyZWN0b3J5IGVudHJ5IHdpdGggY2hpbGRyZW5cbiAgICB9IGVsc2Uge1xuICAgICAgZGlycy5wdXNoKFtuYW1lLCBjaGlsZF0pO1xuICAgIH1cbiAgfVxuXG4gIGRpcnMuc29ydCgoW2FdLCBbYl0pID0+IGEubG9jYWxlQ29tcGFyZShiKSk7XG4gIGZpbGVzLnNvcnQoKFthXSwgW2JdKSA9PiBhLmxvY2FsZUNvbXBhcmUoYikpO1xuXG4gIGZvciAoY29uc3QgW25hbWUsIGNoaWxkXSBvZiBkaXJzKSB7XG4gICAgLy8gQ29sbGFwc2Ugc2luZ2xlLWNoaWxkIGRpcmVjdG9yeSBjaGFpbnNcbiAgICBsZXQgY29sbGFwc2VkID0gbmFtZTtcbiAgICBsZXQgY3VycmVudCA9IGNoaWxkO1xuICAgIHdoaWxlIChjdXJyZW50LmNoaWxkcmVuLnNpemUgPT09IDEgJiYgIWN1cnJlbnQuaXNGaWxlKSB7XG4gICAgICBjb25zdCBbbmV4dE5hbWUsIG5leHRDaGlsZF0gPSBjdXJyZW50LmNoaWxkcmVuLmVudHJpZXMoKS5uZXh0KCkudmFsdWUgYXMgW3N0cmluZywgVHJpZU5vZGVdO1xuICAgICAgY29sbGFwc2VkICs9IGAvJHtuZXh0TmFtZX1gO1xuICAgICAgY3VycmVudCA9IG5leHRDaGlsZDtcbiAgICB9XG5cbiAgICBpZiAoY3VycmVudC5pc0ZpbGUgJiYgY3VycmVudC5jaGlsZHJlbi5zaXplID09PSAwKSB7XG4gICAgICAvLyBFbnRpcmUgY2hhaW4gY29sbGFwc2VkIHRvIGEgc2luZ2xlIGZpbGUgcGF0aFxuICAgICAgbGluZXMucHVzaChgJHtwcmVmaXh9JHtjb2xsYXBzZWR9YCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERpcmVjdG9yeSBub2RlIFx1MjAxNCByZW5kZXIgd2l0aCB0cmFpbGluZyBzbGFzaCwgdGhlbiBjaGlsZHJlblxuICAgICAgbGluZXMucHVzaChgJHtwcmVmaXh9JHtjb2xsYXBzZWR9L2ApO1xuICAgICAgbGluZXMucHVzaChyZW5kZXJOb2RlKGN1cnJlbnQsIGluZGVudCArIDIpKTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IFtuYW1lXSBvZiBmaWxlcykge1xuICAgIGxpbmVzLnB1c2goYCR7cHJlZml4fSR7bmFtZX1gKTtcbiAgfVxuXG4gIHJldHVybiBsaW5lcy5maWx0ZXIoQm9vbGVhbikuam9pbignXFxuJyk7XG59XG5cbi8qKlxuICogUmVuZGVycyBhIGxpc3Qgb2YgZmlsZSBwYXRocyBhcyBhIHByZWZpeC1jb21wcmVzc2VkIGluZGVudGVkIHRyZWUuXG4gKlxuICogU2luZ2xlLWNoaWxkIGRpcmVjdG9yeSBjaGFpbnMgYXJlIGNvbGxhcHNlZCBpbnRvIGNvbWJpbmVkIHNlZ21lbnRzXG4gKiAoZS5nLiwgYHNyYy9saWIvYCBhcyBvbmUgbm9kZSkuIExlYWYgZmlsZXMgYWx3YXlzIGFwcGVhciBhcyBpbmRpdmlkdWFsIGVudHJpZXMuXG4gKlxuICogQHBhcmFtIHBhdGhzIC0gRmxhdCBmaWxlIHBhdGhzIChlLmcuLCBmcm9tIGBnaXQgbG9nIC0tbmFtZS1vbmx5YCkuXG4gKiBAcmV0dXJucyBJbmRlbnRlZCB0cmVlIHN0cmluZywgb3IgZW1wdHkgc3RyaW5nIGlmIHBhdGhzIGlzIGVtcHR5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RmlsZVRyZWUocGF0aHM6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgaWYgKHBhdGhzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnO1xuXG4gIGNvbnN0IHJvb3QgPSBjcmVhdGVOb2RlKCk7XG4gIGZvciAoY29uc3QgcCBvZiBwYXRocykge1xuICAgIGlmIChwKSBpbnNlcnRQYXRoKHJvb3QsIHApO1xuICB9XG5cbiAgcmV0dXJuIHJlbmRlck5vZGUocm9vdCwgMSk7XG59XG5cbi8qKlxuICogUGFyc2VzIHJhdyBgZ2l0IGxvZyAtLW5hbWUtb25seWAgb3V0cHV0IGludG8gcGVyLWNvbW1pdCBibG9ja3MsIGFwcGxpZXNcbiAqIHRyZWUgZm9ybWF0dGluZyB0byBlYWNoIGNvbW1pdCdzIGZpbGUgbGlzdCwgYW5kIHJlYXNzZW1ibGVzLlxuICpcbiAqIEhhbmRsZXMgdHdvIHNlcGFyYXRvciBjb252ZW50aW9uczpcbiAqIC0gTlVMLWRlbGltaXRlZCAoYCV4MDBgIGluIGAtLXByZXR0eT1mb3JtYXRgKTogdXNlZCBieSBgYnVpbGRDYXJkUmVwb0xvZ0Jsb2NrYFxuICogLSBCbGFuay1saW5lLWRlbGltaXRlZDogdXNlZCBieSBgLS1uby13YWxrYCBpbiBgcmVzb2x2ZVdvcmtzcGFjZUNvbW1pdERldGFpbHNgIGFuZCB0aGUgc3RvcCBob29rXG4gKlxuICogQHBhcmFtIHJhd0xvZyAtIFJhdyBnaXQgbG9nIG91dHB1dCB3aXRoIGAtLW5hbWUtb25seWAuXG4gKiBAcGFyYW0gc2VwYXJhdG9yIC0gSG93IGNvbW1pdHMgYXJlIHNlcGFyYXRlZDogYCdudWwnYCBmb3IgYCV4MDBgLCBgJ2JsYW5rLWxpbmUnYCBmb3IgZG91YmxlIG5ld2xpbmUuXG4gKiBAcmV0dXJucyBGb3JtYXR0ZWQgb3V0cHV0IHdpdGggdHJlZS1yZW5kZXJlZCBmaWxlIGxpc3RzIHBlciBjb21taXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRDb21taXRMb2cocmF3TG9nOiBzdHJpbmcsIHNlcGFyYXRvcjogJ251bCcgfCAnYmxhbmstbGluZScpOiBzdHJpbmcge1xuICBpZiAoIXJhd0xvZy50cmltKCkpIHJldHVybiAnJztcblxuICBpZiAoc2VwYXJhdG9yID09PSAnbnVsJykge1xuICAgIHJldHVybiBmb3JtYXROdWxEZWxpbWl0ZWQocmF3TG9nKTtcbiAgfVxuICByZXR1cm4gZm9ybWF0QmxhbmtMaW5lRGVsaW1pdGVkKHJhd0xvZyk7XG59XG5cbi8qKlxuICogTlVMLWRlbGltaXRlZCBmb3JtYXQ6IGAleDAwaGVhZGVyXFxuXFxuZmlsZTFcXG5maWxlMlxceDAwaGVhZGVyMlxcblxcbmZpbGUzYFxuICpcbiAqIFRoZSBmaXJzdCBOVUwgbWF5IGJlIGF0IHBvc2l0aW9uIDAgKGxlYWRpbmcpLCBzbyB3ZSBmaWx0ZXIgZW1wdHkgc3BsaXRzLlxuICpcbiAqIEBwYXJhbSByYXcgLSBSYXcgTlVMLWRlbGltaXRlZCBnaXQgbG9nIG91dHB1dC5cbiAqIEByZXR1cm5zIEZvcm1hdHRlZCBvdXRwdXQgd2l0aCB0cmVlLXJlbmRlcmVkIGZpbGUgbGlzdHMuXG4gKi9cbmZ1bmN0aW9uIGZvcm1hdE51bERlbGltaXRlZChyYXc6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGNvbW1pdHMgPSByYXcuc3BsaXQoJ1xcMCcpLmZpbHRlcigocykgPT4gcy50cmltKCkpO1xuICByZXR1cm4gY29tbWl0cy5tYXAoKGNvbW1pdCkgPT4gZm9ybWF0U2luZ2xlQ29tbWl0KGNvbW1pdC50cmltKCkpKS5qb2luKCdcXG5cXG4nKTtcbn1cblxuLyoqXG4gKiBCbGFuay1saW5lLWRlbGltaXRlZCBmb3JtYXQ6IGNvbW1pdHMgc2VwYXJhdGVkIGJ5IGBcXG5cXG5gIHdoZXJlIHRoZSBzZWNvbmRcbiAqIGJsb2NrIHN0YXJ0cyB3aXRoIGEgc2hvcnQgaGFzaCBsaW5lLlxuICpcbiAqIFdpdGhpbiBhIHNpbmdsZSBjb21taXQsIGAtLW5hbWUtb25seWAgYWxzbyBwdXRzIGEgYmxhbmsgbGluZSBiZXR3ZWVuIHRoZVxuICogaGVhZGVyIGFuZCB0aGUgZmlsZSBsaXN0LiBXZSBkaXN0aW5ndWlzaCBpbnRyYS1jb21taXQgYmxhbmsgbGluZXMgZnJvbVxuICogaW50ZXItY29tbWl0IGJsYW5rIGxpbmVzIGJ5IGNoZWNraW5nIHdoZXRoZXIgdGhlIGxpbmUgYWZ0ZXIgdGhlIGJsYW5rIGxpbmVcbiAqIGxvb2tzIGxpa2UgYSBjb21taXQgaGVhZGVyIChzaG9ydCBoYXNoIHBhdHRlcm4pLlxuICpcbiAqIEBwYXJhbSByYXcgLSBSYXcgYmxhbmstbGluZS1kZWxpbWl0ZWQgZ2l0IGxvZyBvdXRwdXQuXG4gKiBAcmV0dXJucyBGb3JtYXR0ZWQgb3V0cHV0IHdpdGggdHJlZS1yZW5kZXJlZCBmaWxlIGxpc3RzLlxuICovXG5mdW5jdGlvbiBmb3JtYXRCbGFua0xpbmVEZWxpbWl0ZWQocmF3OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lcyA9IHJhdy5zcGxpdCgnXFxuJyk7XG4gIGNvbnN0IGNvbW1pdEJsb2Nrczogc3RyaW5nW11bXSA9IFtdO1xuICBsZXQgY3VycmVudDogc3RyaW5nW10gPSBbXTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgbGluZSA9IGxpbmVzW2ldITtcblxuICAgIC8vIERldGVjdCBpbnRlci1jb21taXQgYm91bmRhcnk6IGVtcHR5IGxpbmUgZm9sbG93ZWQgYnkgYSBjb21taXQgaGVhZGVyXG4gICAgaWYgKGxpbmUgPT09ICcnICYmIGN1cnJlbnQubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgbmV4dCA9IGxpbmVzW2kgKyAxXTtcbiAgICAgIGlmIChuZXh0ICYmIGlzQ29tbWl0SGVhZGVyKG5leHQpKSB7XG4gICAgICAgIGNvbW1pdEJsb2Nrcy5wdXNoKGN1cnJlbnQpO1xuICAgICAgICBjdXJyZW50ID0gW107XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGN1cnJlbnQucHVzaChsaW5lKTtcbiAgfVxuICBpZiAoY3VycmVudC5sZW5ndGggPiAwKSBjb21taXRCbG9ja3MucHVzaChjdXJyZW50KTtcblxuICByZXR1cm4gY29tbWl0QmxvY2tzLm1hcCgoYmxvY2spID0+IGZvcm1hdFNpbmdsZUNvbW1pdChibG9jay5qb2luKCdcXG4nKS50cmltKCkpKS5qb2luKCdcXG5cXG4nKTtcbn1cblxuLyoqXG4gKiBDb21taXQgaGVhZGVycyBmcm9tIGAtLXByZXR0eT1mb3JtYXQ6JWggLSAlc2Agc3RhcnQgd2l0aCBhIHNob3J0IGhleCBoYXNoLlxuICpcbiAqIEBwYXJhbSBsaW5lIC0gTGluZSB0byB0ZXN0LlxuICogQHJldHVybnMgV2hldGhlciB0aGUgbGluZSBtYXRjaGVzIHRoZSBjb21taXQgaGVhZGVyIHBhdHRlcm4uXG4gKi9cbmZ1bmN0aW9uIGlzQ29tbWl0SGVhZGVyKGxpbmU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gL15bMC05YS1mXXs3LH0gLSAvLnRlc3QobGluZSk7XG59XG5cbi8qKlxuICogRm9ybWF0cyBhIHNpbmdsZSBjb21taXQgYmxvY2s6IGhlYWRlciBsaW5lICsgZmlsZSBwYXRocy5cbiAqXG4gKiBUaGUgaGVhZGVyIGlzIHRoZSBmaXJzdCBub24tZW1wdHkgbGluZS4gUmVtYWluaW5nIG5vbi1lbXB0eSBsaW5lcyBhcmUgZmlsZSBwYXRocy5cbiAqXG4gKiBAcGFyYW0gYmxvY2sgLSBSYXcgY29tbWl0IGJsb2NrIHRleHQuXG4gKiBAcmV0dXJucyBIZWFkZXIgZm9sbG93ZWQgYnkgdHJlZS1mb3JtYXR0ZWQgZmlsZSBsaXN0LlxuICovXG5mdW5jdGlvbiBmb3JtYXRTaW5nbGVDb21taXQoYmxvY2s6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzID0gYmxvY2suc3BsaXQoJ1xcbicpLmZpbHRlcigobCkgPT4gbC50cmltKCkpO1xuICBpZiAobGluZXMubGVuZ3RoID09PSAwKSByZXR1cm4gJyc7XG5cbiAgY29uc3QgaGVhZGVyID0gbGluZXNbMF0hO1xuICBjb25zdCBmaWxlcyA9IGxpbmVzLnNsaWNlKDEpO1xuXG4gIGlmIChmaWxlcy5sZW5ndGggPT09IDApIHJldHVybiBoZWFkZXI7XG5cbiAgY29uc3QgdHJlZSA9IGZvcm1hdEZpbGVUcmVlKGZpbGVzKTtcbiAgcmV0dXJuIHRyZWUgPyBgJHtoZWFkZXJ9XFxuJHt0cmVlfWAgOiBoZWFkZXI7XG59XG4iLCAiaW1wb3J0IGhvb2sgZnJvbSAnLi9zZXNzaW9uLXN0YXJ0LnRzJztcbmltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICcuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvcnVudGltZS5qcyc7XG5cbmV4ZWN1dGUoaG9vayk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7QUFXQSxTQUFTLGdCQUFBQSxlQUFjLGFBQWE7QUFDcEMsU0FBUyxnQkFBQUMscUJBQW9CO0FBQzdCLFNBQVMsV0FBQUMsZ0JBQWU7QUFDeEIsU0FBUyxXQUFBQyxVQUFTLFFBQUFDLE9BQU0sZUFBZTtBQUN2QyxTQUFTLHFCQUFxQjs7O0FDTDlCLFNBQVMsZ0JBQWdCO0FBQ3pCLFNBQVMsZUFBZTtBQUN4QixTQUFTLFlBQVk7OztBQ0NyQixTQUFTLFdBQVcsV0FBVyxVQUFVLGNBQWMsWUFBWSxZQUFZLHFCQUFxQjtBQUNwRyxTQUFTLGVBQWU7OztBQ09qQixTQUFTLGVBQWUsS0FBc0I7QUFDbkQsTUFBSTtBQUNGLFlBQVEsS0FBSyxLQUFLLENBQUM7QUFDbkIsV0FBTztBQUFBLEVBQ1QsU0FBUyxPQUFPO0FBQ2QsUUFBSSxpQkFBaUIsU0FBUyxVQUFVLE9BQU87QUFDN0MsWUFBTSxPQUFRLE1BQWdDO0FBQzlDLFVBQUksU0FBUyxRQUFTLFFBQU87QUFDN0IsVUFBSSxTQUFTLFFBQVMsUUFBTztBQUFBLElBQy9CO0FBQ0EsVUFBTTtBQUFBLEVBQ1I7QUFDRjs7O0FEUk8sU0FBUyxNQUFNLElBQTJCO0FBQy9DLFNBQU8sSUFBSSxRQUFRLENBQUNDLGFBQVksV0FBV0EsVUFBUyxFQUFFLENBQUM7QUFDekQ7QUFVTyxTQUFTLGFBQWEsT0FBZ0IsTUFBdUI7QUFDbEUsU0FBTyxpQkFBaUIsU0FBUyxVQUFVLFNBQVUsTUFBZ0MsU0FBUztBQUNoRztBQVdPLFNBQVMsbUJBQW1CLFVBQTJCO0FBQzVELE1BQUk7QUFDRixVQUFNLGNBQWMsYUFBYSxVQUFVLE9BQU87QUFDbEQsVUFBTSxZQUFZLE9BQU8sU0FBUyxZQUFZLEtBQUssR0FBRyxFQUFFO0FBRXhELFFBQUksQ0FBQyxPQUFPLE1BQU0sU0FBUyxLQUFLLENBQUMsZUFBZSxTQUFTLEdBQUc7QUFFMUQsVUFBSSxhQUFhLFVBQVUsT0FBTyxNQUFNLGFBQWE7QUFDbkQsbUJBQVcsUUFBUTtBQUNuQixlQUFPO0FBQUEsTUFDVDtBQUFBLElBQ0Y7QUFBQSxFQUNGLFFBQVE7QUFDTixRQUFJO0FBQ0YsaUJBQVcsUUFBUTtBQUNuQixhQUFPO0FBQUEsSUFDVCxRQUFRO0FBQUEsSUFFUjtBQUFBLEVBQ0Y7QUFFQSxTQUFPO0FBQ1Q7QUFVTyxTQUFTLG1CQUFtQixVQUF3QjtBQUN6RCxRQUFNLEtBQUssU0FBUyxVQUFVLE1BQU0sR0FBSztBQUN6QyxNQUFJO0FBQ0Ysa0JBQWMsSUFBSSxPQUFPLFFBQVEsR0FBRyxDQUFDO0FBQUEsRUFDdkMsVUFBRTtBQUNBLGNBQVUsRUFBRTtBQUFBLEVBQ2Q7QUFDRjtBQVlBLGVBQXNCLFlBQVksVUFBa0IsV0FBa0M7QUFDcEYsUUFBTSxZQUFZLEtBQUssSUFBSTtBQUMzQixRQUFNLE1BQU0sUUFBUSxRQUFRO0FBRTVCLFNBQU8sS0FBSyxJQUFJLElBQUksWUFBWSxXQUFXO0FBQ3pDLFFBQUk7QUFDRixnQkFBVSxLQUFLLEVBQUUsV0FBVyxNQUFNLE1BQU0sSUFBTSxDQUFDO0FBQy9DLHlCQUFtQixRQUFRO0FBQzNCO0FBQUEsSUFDRixTQUFTLE9BQU87QUFDZCxVQUFJLENBQUMsYUFBYSxPQUFPLFFBQVEsRUFBRyxPQUFNO0FBQzFDLFVBQUksbUJBQW1CLFFBQVEsRUFBRztBQUVsQyxZQUFNLFlBQVksYUFBYSxLQUFLLElBQUksSUFBSTtBQUM1QyxVQUFJLFlBQVksR0FBRztBQUNqQixjQUFNLE1BQU0sS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDO0FBQUEsTUFDckM7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUVBLFFBQU0sSUFBSSxNQUFNLDBCQUEwQjtBQUM1QztBQVdPLFNBQVMsWUFBWSxVQUF3QjtBQUNsRCxNQUFJO0FBQ0YsZUFBVyxRQUFRO0FBQUEsRUFDckIsU0FBUyxPQUFPO0FBQ2QsUUFBSSxDQUFDLGFBQWEsT0FBTyxRQUFRLEVBQUcsT0FBTTtBQUFBLEVBQzVDO0FBQ0Y7QUE4RE8sU0FBUyxhQUFnQixNQUFjLGNBQW9CO0FBQ2hFLE1BQUk7QUFDRixVQUFNLFVBQVUsYUFBYSxNQUFNLE9BQU87QUFDMUMsV0FBTyxLQUFLLE1BQU0sT0FBTztBQUFBLEVBQzNCLFNBQVMsT0FBTztBQUNkLFFBQUksYUFBYSxPQUFPLFFBQVEsRUFBRyxRQUFPO0FBQzFDLFVBQU07QUFBQSxFQUNSO0FBQ0Y7QUFZTyxTQUFTLG9CQUF1QixVQUFhLGNBQTRCO0FBQzlFLFFBQU0sTUFBTSxRQUFRLFlBQVk7QUFDaEMsWUFBVSxLQUFLLEVBQUUsV0FBVyxNQUFNLE1BQU0sSUFBTSxDQUFDO0FBQy9DLFFBQU0sV0FBVyxHQUFHLFlBQVk7QUFDaEMsTUFBSTtBQUNGLGtCQUFjLFVBQVUsS0FBSyxVQUFVLFVBQVUsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLElBQU0sQ0FBQztBQUMxRSxlQUFXLFVBQVUsWUFBWTtBQUFBLEVBQ25DLFNBQVMsT0FBTztBQUNkLFFBQUk7QUFDRixpQkFBVyxRQUFRO0FBQUEsSUFDckIsUUFBUTtBQUFBLElBRVI7QUFDQSxVQUFNO0FBQUEsRUFDUjtBQUNGO0FBb0JBLGVBQXNCLG1CQUNwQixjQUNBLFVBQ0EsV0FDQSxRQUNBLGlCQUNBLGVBQ2tCO0FBQ2xCLFFBQU0sWUFBWSxVQUFVLGlCQUFpQixHQUFJO0FBQ2pELE1BQUk7QUFDRixVQUFNLFdBQVcsYUFBd0IsY0FBYyxlQUE0QjtBQUNuRixRQUFJLE9BQVEsUUFBTyxRQUFRO0FBQzNCLFVBQU0sU0FBUyxVQUFVLFFBQVE7QUFDakMsd0JBQW9CLFVBQVUsWUFBWTtBQUMxQyxXQUFPO0FBQUEsRUFDVCxVQUFFO0FBQ0EsZ0JBQVksUUFBUTtBQUFBLEVBQ3RCO0FBQ0Y7OztBRTFRQSxTQUFTLGdCQUFnQjtBQUdsQixJQUFNLHlCQUF5QjtBQWdCdEMsSUFBTSxzQkFBc0I7QUFhNUIsU0FBUyxTQUFTLEtBQXNCO0FBQ3RDLE1BQUk7QUFDRixVQUFNLE9BQU8sU0FBUyxTQUFTLEdBQUcsYUFBYSxFQUFFLFVBQVUsT0FBTyxDQUFDLEVBQUUsS0FBSztBQUMxRSxXQUFPLG9CQUFvQixLQUFLLElBQUk7QUFBQSxFQUN0QyxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQVdBLFNBQVMsYUFBYSxLQUE0QjtBQUNoRCxNQUFJO0FBQ0YsVUFBTSxVQUFVLFNBQVMsU0FBUyxHQUFHLGFBQWEsRUFBRSxVQUFVLE9BQU8sQ0FBQyxFQUFFLEtBQUs7QUFDN0UsVUFBTSxZQUFZLE9BQU8sU0FBUyxTQUFTLEVBQUU7QUFDN0MsUUFBSSxPQUFPLE1BQU0sU0FBUyxLQUFLLGNBQWMsSUFBSyxRQUFPO0FBQ3pELFdBQU87QUFBQSxFQUNULFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBV08sU0FBUyxjQUFjLFVBQWtDO0FBQzlELFFBQU0sT0FBTyxrQkFBa0IsUUFBUTtBQUN2QyxTQUFPLEtBQUssQ0FBQyxLQUFLO0FBQ3BCO0FBZ0JPLFNBQVMsa0JBQWtCLFVBQTZCO0FBQzdELFFBQU0sVUFBb0IsQ0FBQztBQUMzQixNQUFJLE1BQU0sWUFBWSxRQUFRO0FBRTlCLFdBQVMsUUFBUSxHQUFHLFFBQVEsd0JBQXdCLFNBQVM7QUFDM0QsUUFBSSxPQUFPLEVBQUc7QUFFZCxRQUFJLFNBQVMsR0FBRyxHQUFHO0FBQ2pCLGNBQVEsS0FBSyxHQUFHO0FBQUEsSUFDbEI7QUFFQSxVQUFNLFlBQVksYUFBYSxHQUFHO0FBQ2xDLFFBQUksY0FBYyxLQUFNO0FBQ3hCLFVBQU07QUFBQSxFQUNSO0FBRUEsU0FBTztBQUNUOzs7QUhqR0EsU0FBUyxjQUFzQjtBQUM3QixTQUFPLEtBQUssUUFBUSxHQUFHLFFBQVE7QUFDakM7QUFvQk8sSUFBTSxrQkFBa0I7QUFDeEIsSUFBTSxtQkFBbUIsS0FBSyxLQUFLLEtBQUs7QUFrSi9DLFNBQVMsOEJBQXNDO0FBQzdDLFNBQU8sS0FBSyxZQUFZLEdBQUcscUJBQXFCLFdBQVc7QUFDN0Q7QUFFQSxTQUFTLDBCQUFrQztBQUN6QyxTQUFPLEtBQUssWUFBWSxHQUFHLHFCQUFxQixXQUFXO0FBQzdEO0FBUUEsZUFBc0IsZ0JBQWdCLEtBQWEsV0FBa0M7QUFDbkYsUUFBTTtBQUFBLElBQ0osNEJBQTRCO0FBQUEsSUFDNUIsd0JBQXdCO0FBQUEsSUFDeEIsQ0FBQyxhQUFhO0FBQ1osZUFBUyxTQUFTLE9BQU8sR0FBRyxDQUFDLElBQUk7QUFBQSxRQUMvQjtBQUFBLFFBQ0EsWUFBVyxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUFBLE1BQ3BDO0FBQUEsSUFDRjtBQUFBLElBQ0E7QUFBQSxJQUNBLEVBQUUsVUFBVSxDQUFDLEVBQUU7QUFBQSxJQUNmO0FBQUEsRUFDRjtBQUNGOzs7QUlyTUEsU0FBUyxnQkFBZ0IsYUFBQUMsWUFBVyxnQkFBQUMsZUFBYyxjQUFBQyxhQUFZLGlCQUFBQyxzQkFBcUI7QUFDbkYsU0FBUyxXQUFBQyxnQkFBZTtBQUN4QixTQUFTLFFBQUFDLGFBQVk7QUFTckIsU0FBUyx3QkFBZ0M7QUFDdkMsU0FBT0MsTUFBS0MsU0FBUSxHQUFHLFVBQVUsbUJBQW1CO0FBQ3REO0FBVUEsU0FBUyxzQkFBc0IsV0FBMkI7QUFDeEQsU0FBT0MsTUFBSyxzQkFBc0IsR0FBRyxHQUFHLFNBQVMsT0FBTztBQUMxRDtBQTBGTyxTQUFTLG9CQUFvQixXQUFtQixLQUFtQjtBQUN4RSxFQUFBQyxXQUFVLHNCQUFzQixHQUFHLEVBQUUsV0FBVyxNQUFNLE1BQU0sSUFBTSxDQUFDO0FBQ25FLEVBQUFDLGVBQWMsc0JBQXNCLFNBQVMsR0FBRyxLQUFLLEVBQUUsTUFBTSxJQUFNLENBQUM7QUFDdEU7OztBQ3ZIQSxTQUFTLGdCQUFBQyxxQkFBb0I7QUFjdEIsSUFBTSxpQkFBaUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSzVCLFNBQVM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVQsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNYixhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT2IsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1oQixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1kLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9sQixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1kLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNZCxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxRQUFRO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1SLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWWQsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVViLE1BQU07QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTU4sYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNYixpQ0FBaUM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWpDLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPYixnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVFoQixXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNaEIsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFRaEIsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFTYixlQUFlO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT2Ysa0JBQWtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVlsQixrQkFBa0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVdsQixnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFVaEIsZ0JBQWdCO0FBQ2xCO0FBa0JPLFNBQVMsWUFBb0I7QUFDbEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLE9BQU87QUFDaEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLE9BQU8sRUFBRTtBQUFBLEVBQ3BGO0FBQ0EsU0FBTztBQUNUO0FBY08sU0FBUyxpQkFBeUI7QUFDdkMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFdBQVc7QUFDcEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFdBQVcsRUFBRTtBQUFBLEVBQ3hGO0FBQ0EsU0FBTztBQUNUO0FBZU8sU0FBUyxnQkFBd0I7QUFDdEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFdBQVc7QUFDcEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFdBQVcsRUFBRTtBQUFBLEVBQ3hGO0FBQ0EsU0FBTztBQUNUO0FBZ0JPLFNBQVMsbUJBQWlEO0FBQy9ELFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxjQUFjO0FBQ3ZELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxjQUFjLEVBQUU7QUFBQSxFQUMzRjtBQUNBLE1BQUksVUFBVSxpQkFBaUIsVUFBVSxjQUFjO0FBQ3JELFVBQU0sSUFBSSxNQUFNLFdBQVcsZUFBZSxjQUFjLGtEQUFrRCxLQUFLLEdBQUc7QUFBQSxFQUNwSDtBQUNBLFNBQU87QUFDVDtBQWVPLFNBQVMsZ0JBQXdCO0FBQ3RDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxZQUFZO0FBQ3JELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxZQUFZLEVBQUU7QUFBQSxFQUN6RjtBQUNBLFNBQU87QUFDVDtBQWlCTyxTQUFTLG9CQUE0QjtBQUMxQyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsZ0JBQWdCO0FBQ3pELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxnQkFBZ0IsRUFBRTtBQUFBLEVBQzdGO0FBQ0EsU0FBTztBQUNUO0FBaUJPLFNBQVMsaUJBQXFDO0FBQ25ELFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxZQUFZO0FBQ3JELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQStMTyxTQUFTLGlDQUFxRDtBQUNuRSxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsK0JBQStCO0FBQ3hFLE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQVFPLFNBQVMsZ0JBQXdCO0FBQ3RDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxXQUFXO0FBQ3BELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxXQUFXLEVBQUU7QUFBQSxFQUN4RjtBQUNBLFNBQU87QUFDVDtBQTRCTyxTQUFTLGNBQXNCO0FBQ3BDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxTQUFTO0FBQ2xELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxTQUFTLEVBQUU7QUFBQSxFQUN0RjtBQUNBLFNBQU87QUFDVDtBQVFPLFNBQVMsa0JBQTBCO0FBQ3hDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxjQUFjO0FBQ3ZELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxjQUFjLEVBQUU7QUFBQSxFQUMzRjtBQUNBLFNBQU87QUFDVDtBQVlPLFNBQVMsbUJBQTJCO0FBQ3pDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxjQUFjO0FBQ3ZELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxjQUFjLEVBQUU7QUFBQSxFQUMzRjtBQUNBLFNBQU87QUFDVDtBQVdPLFNBQVMsOEJBQW1EO0FBQ2pFLFFBQU0sV0FBVywrQkFBK0I7QUFDaEQsTUFBSSxhQUFhLFFBQVc7QUFDMUIsV0FBTztBQUFBLEVBQ1Q7QUFDQSxRQUFNLFVBQVVDLGNBQWEsVUFBVSxPQUFPO0FBQzlDLFNBQU8sS0FBSyxNQUFNLE9BQU87QUFDM0I7QUFxQk8sU0FBUyxxQkFBa0M7QUFDaEQsU0FBTztBQUFBLElBQ0wsUUFBUSxVQUFVO0FBQUEsSUFDbEIsWUFBWSxjQUFjO0FBQUEsSUFDMUIsYUFBYSxlQUFlO0FBQUEsSUFDNUIsZUFBZSxpQkFBaUI7QUFBQSxJQUNoQyxZQUFZLGNBQWM7QUFBQSxJQUMxQixnQkFBZ0Isa0JBQWtCO0FBQUEsSUFDbEMsYUFBYSxlQUFlO0FBQUEsSUFDNUIseUJBQXlCLDRCQUE0QjtBQUFBLElBQ3JELFVBQVUsWUFBWTtBQUFBLElBQ3RCLGNBQWMsZ0JBQWdCO0FBQUEsSUFDOUIsWUFBWSxjQUFjO0FBQUEsSUFDMUIsZUFBZSxpQkFBaUI7QUFBQSxFQUNsQztBQUNGOzs7QUN0ckJBLFlBQVksUUFBUTtBQU1iLElBQU0sa0JBQWtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUszQixhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWIsVUFBVTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLVixRQUFRO0FBQ1o7QUFrQ08sU0FBUyxpQkFBaUI7QUFDN0IsU0FBTyxRQUFRLElBQUksZ0JBQWdCLFFBQVE7QUFDL0M7QUE4Q08sU0FBUyxjQUFjLE1BQU0sT0FBTztBQUN2QyxRQUFNLFVBQVUsZUFBZTtBQUMvQixNQUFJLFlBQVksUUFBVztBQUN2QixVQUFNLElBQUksTUFBTSx3R0FBNkc7QUFBQSxFQUNqSTtBQUVBLFFBQU0sZUFBZSxpQkFBaUIsS0FBSztBQUUzQyxRQUFNLGtCQUFrQixVQUFVLElBQUksSUFBSSxZQUFZO0FBQUE7QUFDdEQsRUFBRyxrQkFBZSxTQUFTLGlCQUFpQixPQUFPO0FBQ3ZEO0FBaUJPLFNBQVMsZUFBZSxNQUFNO0FBQ2pDLGFBQVcsQ0FBQyxNQUFNLEtBQUssS0FBSyxPQUFPLFFBQVEsSUFBSSxHQUFHO0FBQzlDLGtCQUFjLE1BQU0sS0FBSztBQUFBLEVBQzdCO0FBQ0o7QUFVQSxTQUFTLGlCQUFpQixPQUFPO0FBRzdCLFFBQU0sVUFBVSxNQUFNLFFBQVEsTUFBTSxPQUFPO0FBQzNDLFNBQU8sSUFBSSxPQUFPO0FBQ3RCOzs7QUNwSkEsU0FBUyxtQkFBbUIsZUFBZSxRQUFRLFNBQVM7QUFDeEQsUUFBTSxTQUFTLE9BQU8sT0FBTyxZQUFZO0FBR3JDLFdBQU8sTUFBTSxRQUFRLE9BQU8sT0FBTztBQUFBLEVBQ3ZDO0FBRUEsU0FBTyxnQkFBZ0I7QUFDdkIsU0FBTyxVQUFVLE9BQU87QUFDeEIsU0FBTyxVQUFVLE9BQU87QUFDeEIsU0FBTztBQUNYO0FBeUlPLFNBQVMsaUJBQWlCLFFBQVEsU0FBUztBQUM5QyxTQUFPLG1CQUFtQixnQkFBZ0IsUUFBUSxPQUFPO0FBQzdEOzs7QUN0S0EsU0FBUyxhQUFBQyxZQUFXLFlBQVksYUFBQUMsWUFBVyxZQUFBQyxXQUFVLGlCQUFpQjtBQUN0RSxTQUFTLFdBQUFDLGdCQUFlO0FBSWpCLElBQU0sYUFBYSxDQUFDLFNBQVMsUUFBUSxRQUFRLE9BQU87QUFzQ3BELElBQU0sU0FBTixNQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJaEIsV0FBVyxvQkFBSSxJQUFJO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtuQixZQUFZO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJWixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJZCxrQkFBa0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUlsQjtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWdCQSxZQUFZLFNBQVMsQ0FBQyxHQUFHO0FBRXJCLGVBQVcsU0FBUyxZQUFZO0FBQzVCLFdBQUssU0FBUyxJQUFJLE9BQU8sb0JBQUksSUFBSSxDQUFDO0FBQUEsSUFDdEM7QUFFQSxTQUFLLGNBQWMsT0FBTyxnQkFBZ0IsT0FBTyxZQUFZLFFBQVEsSUFBSSxPQUFPLFNBQVMsSUFBSSxXQUFjO0FBQUEsRUFDL0c7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWFBLE1BQU0sU0FBUyxTQUFTO0FBQ3BCLFNBQUssS0FBSyxTQUFTLFNBQVMsT0FBTztBQUFBLEVBQ3ZDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFhQSxLQUFLLFNBQVMsU0FBUztBQUNuQixTQUFLLEtBQUssUUFBUSxTQUFTLE9BQU87QUFBQSxFQUN0QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBYUEsS0FBSyxTQUFTLFNBQVM7QUFDbkIsU0FBSyxLQUFLLFFBQVEsU0FBUyxPQUFPO0FBQUEsRUFDdEM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWFBLE1BQU0sU0FBUyxTQUFTO0FBQ3BCLFNBQUssS0FBSyxTQUFTLFNBQVMsT0FBTztBQUFBLEVBQ3ZDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBcUJBLFNBQVMsT0FBTyxTQUFTLFNBQVM7QUFDOUIsVUFBTSxZQUFZLEtBQUssaUJBQWlCLEtBQUs7QUFDN0MsVUFBTSxRQUFRO0FBQUEsTUFDVixZQUFXLG9CQUFJLEtBQUssR0FBRSxZQUFZO0FBQUEsTUFDbEMsT0FBTztBQUFBLE1BQ1AsVUFBVSxLQUFLO0FBQUEsTUFDZjtBQUFBLE1BQ0EsT0FBTyxLQUFLO0FBQUEsTUFDWixPQUFPO0FBQUEsTUFDUDtBQUFBLElBQ0o7QUFDQSxTQUFLLGFBQWEsS0FBSztBQUFBLEVBQzNCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFrQ0EsR0FBRyxPQUFPLFNBQVM7QUFDZixVQUFNLGdCQUFnQixLQUFLLFNBQVMsSUFBSSxLQUFLO0FBQzdDLFFBQUksZUFBZTtBQUNmLG9CQUFjLElBQUksT0FBTztBQUFBLElBQzdCO0FBQ0EsV0FBTyxNQUFNO0FBQ1QscUJBQWUsT0FBTyxPQUFPO0FBQUEsSUFDakM7QUFBQSxFQUNKO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFVQSxXQUFXLFVBQVUsT0FBTztBQUN4QixTQUFLLGtCQUFrQjtBQUN2QixTQUFLLGVBQWU7QUFBQSxFQUN4QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT0EsZUFBZTtBQUNYLFNBQUssa0JBQWtCO0FBQ3ZCLFNBQUssZUFBZTtBQUFBLEVBQ3hCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFnQkEsV0FBVyxVQUFVO0FBRWpCLFFBQUksS0FBSyxjQUFjLE1BQU07QUFDekIsVUFBSTtBQUNBLFFBQUFILFdBQVUsS0FBSyxTQUFTO0FBQUEsTUFDNUIsU0FDTyxZQUFZO0FBQ2YsZ0JBQVEsT0FBTyxNQUFNLGlEQUFpRCxPQUFPLFVBQVUsQ0FBQztBQUFBLENBQUk7QUFBQSxNQUNoRztBQUNBLFdBQUssWUFBWTtBQUFBLElBQ3JCO0FBQ0EsU0FBSyxjQUFjO0FBQ25CLFNBQUssa0JBQWtCO0FBQUEsRUFDM0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZQSxRQUFRO0FBQ0osUUFBSSxLQUFLLGNBQWMsTUFBTTtBQUN6QixVQUFJO0FBQ0EsUUFBQUEsV0FBVSxLQUFLLFNBQVM7QUFBQSxNQUM1QixTQUNPLFlBQVk7QUFDZixnQkFBUSxPQUFPLE1BQU0saURBQWlELE9BQU8sVUFBVSxDQUFDO0FBQUEsQ0FBSTtBQUFBLE1BQ2hHO0FBQ0EsV0FBSyxZQUFZO0FBQUEsSUFDckI7QUFDQSxTQUFLLGtCQUFrQjtBQUFBLEVBQzNCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPQSxrQkFBa0I7QUFDZCxlQUFXLFlBQVksS0FBSyxTQUFTLE9BQU8sR0FBRztBQUMzQyxVQUFJLFNBQVMsT0FBTztBQUNoQixlQUFPO0FBQUEsSUFDZjtBQUNBLFdBQU8sS0FBSyxnQkFBZ0I7QUFBQSxFQUNoQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVUEsS0FBSyxPQUFPLFNBQVMsU0FBUztBQUMxQixVQUFNLFFBQVE7QUFBQSxNQUNWLFlBQVcsb0JBQUksS0FBSyxHQUFFLFlBQVk7QUFBQSxNQUNsQztBQUFBLE1BQ0EsVUFBVSxLQUFLO0FBQUEsTUFDZjtBQUFBLE1BQ0EsT0FBTyxLQUFLO0FBQUEsTUFDWjtBQUFBLElBQ0o7QUFDQSxTQUFLLGFBQWEsS0FBSztBQUFBLEVBQzNCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtBLGFBQWEsT0FBTztBQUVoQixVQUFNLGdCQUFnQixLQUFLLFNBQVMsSUFBSSxNQUFNLEtBQUs7QUFDbkQsUUFBSSxlQUFlO0FBQ2YsaUJBQVcsV0FBVyxlQUFlO0FBQ2pDLFlBQUk7QUFDQSxrQkFBUSxLQUFLO0FBQUEsUUFDakIsU0FDTyxjQUFjO0FBQ2pCLGtCQUFRLE9BQU8sTUFBTSwwQ0FBMEMsT0FBTyxZQUFZLENBQUM7QUFBQSxDQUFJO0FBQUEsUUFDM0Y7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUVBLFNBQUssWUFBWSxLQUFLO0FBQUEsRUFDMUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS0EsWUFBWSxPQUFPO0FBQ2YsUUFBSSxDQUFDLEtBQUs7QUFDTjtBQUVKLFFBQUksQ0FBQyxLQUFLLGlCQUFpQjtBQUN2QixXQUFLLGVBQWU7QUFBQSxJQUN4QjtBQUNBLFFBQUksS0FBSyxjQUFjO0FBQ25CO0FBQ0osUUFBSTtBQUNBLFlBQU0sT0FBTyxHQUFHLEtBQUssVUFBVSxLQUFLLENBQUM7QUFBQTtBQUNyQyxnQkFBVSxLQUFLLFdBQVcsSUFBSTtBQUFBLElBQ2xDLFNBQ08sWUFBWTtBQUVmLFdBQUssWUFBWTtBQUNqQixXQUFLLGtCQUFrQjtBQUN2QixjQUFRLE9BQU8sTUFBTSw4Q0FBOEMsT0FBTyxVQUFVLENBQUM7QUFBQSxDQUFJO0FBQUEsSUFDN0Y7QUFBQSxFQUNKO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJQSxpQkFBaUI7QUFDYixTQUFLLGtCQUFrQjtBQUN2QixRQUFJLENBQUMsS0FBSztBQUNOO0FBQ0osUUFBSTtBQUVBLFlBQU0sTUFBTUcsU0FBUSxLQUFLLFdBQVc7QUFDcEMsVUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHO0FBQ2xCLFFBQUFGLFdBQVUsS0FBSyxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQUEsTUFDdEM7QUFFQSxXQUFLLFlBQVlDLFVBQVMsS0FBSyxhQUFhLEdBQUc7QUFBQSxJQUNuRCxRQUNNO0FBRUYsV0FBSyxZQUFZO0FBQUEsSUFDckI7QUFBQSxFQUNKO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTUEsaUJBQWlCLE9BQU87QUFDcEIsUUFBSSxpQkFBaUIsT0FBTztBQUN4QixZQUFNLE9BQU87QUFBQSxRQUNULE1BQU0sTUFBTTtBQUFBLFFBQ1osU0FBUyxNQUFNO0FBQUEsUUFDZixPQUFPLE1BQU07QUFBQSxNQUNqQjtBQUVBLFVBQUksTUFBTSxVQUFVLFFBQVc7QUFDM0IsYUFBSyxRQUFRLEtBQUssaUJBQWlCLE1BQU0sS0FBSztBQUFBLE1BQ2xEO0FBQ0EsYUFBTztBQUFBLElBQ1g7QUFFQSxXQUFPO0FBQUEsTUFDSCxNQUFNO0FBQUEsTUFDTixTQUFTLE9BQU8sS0FBSztBQUFBLElBQ3pCO0FBQUEsRUFDSjtBQUNKO0FBNERPLElBQU0sU0FBUyxJQUFJLE9BQU87QUFBQSxFQUM3QixXQUFXLFFBQVEsSUFBSSxpQ0FBaUM7QUFDNUQsQ0FBQzs7O0FDdGVNLElBQU0sYUFBYTtBQUFBO0FBQUEsRUFFdEIsU0FBUztBQUFBO0FBQUEsRUFFVCxPQUFPO0FBQUE7QUFBQSxFQUVQLE9BQU87QUFDWDtBQVVBLFNBQVMsZ0NBQWdDLFVBQVU7QUFDL0MsU0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNO0FBQ3JCLFVBQU0sRUFBRSxvQkFBb0IsR0FBRyxLQUFLLElBQUk7QUFDeEMsVUFBTSxTQUFTLHVCQUF1QixTQUNoQyxFQUFFLEdBQUcsTUFBTSxvQkFBb0IsRUFBRSxlQUFlLFVBQVUsR0FBRyxtQkFBbUIsRUFBRSxJQUNsRjtBQUNOLFdBQU8sRUFBRSxPQUFPLFVBQVUsT0FBTztBQUFBLEVBQ3JDO0FBQ0o7QUErSE8sSUFBTSxxQkFBcUMsZ0RBQWdDLGNBQWM7OztBQy9JaEcsZUFBZSxZQUFZO0FBQ3ZCLFNBQU8sSUFBSSxRQUFRLENBQUNFLFVBQVMsV0FBVztBQUNwQyxVQUFNLFNBQVMsQ0FBQztBQUVoQixZQUFRLE1BQU0sWUFBWSxPQUFPO0FBQ2pDLFlBQVEsTUFBTSxHQUFHLFFBQVEsQ0FBQyxVQUFVO0FBQ2hDLGFBQU8sS0FBSyxLQUFLO0FBQUEsSUFDckIsQ0FBQztBQUNELFlBQVEsTUFBTSxHQUFHLE9BQU8sTUFBTTtBQUMxQixNQUFBQSxTQUFRLE9BQU8sS0FBSyxFQUFFLENBQUM7QUFBQSxJQUMzQixDQUFDO0FBQ0QsWUFBUSxNQUFNLEdBQUcsU0FBUyxDQUFDLFVBQVU7QUFDakMsYUFBTyxLQUFLO0FBQUEsSUFDaEIsQ0FBQztBQUFBLEVBQ0wsQ0FBQztBQUNMO0FBT0EsU0FBUyxnQkFBZ0IsY0FBYztBQUVuQyxRQUFNLFdBQVcsS0FBSyxNQUFNLFlBQVk7QUFDeEMsU0FBTztBQUNYO0FBUUEsU0FBUyxZQUFZLFFBQVE7QUFFekIsVUFBUSxPQUFPLE1BQU0sS0FBSyxVQUFVLE1BQU0sQ0FBQztBQUMvQztBQVNBLFNBQVMsMkJBQTJCLE9BQU87QUFDdkMsU0FBTyxNQUFNLHVCQUF1QixpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLLENBQUMsRUFBRTtBQUM1RixTQUFPLEVBQUUsUUFBUSxDQUFDLEVBQUU7QUFDeEI7QUFVQSxTQUFTLG1CQUFtQixPQUFPO0FBRS9CLE1BQUksaUJBQWlCLE9BQU87QUFDeEIsWUFBUSxPQUFPLE1BQU0sR0FBRyxNQUFNLFNBQVMsTUFBTSxPQUFPO0FBQUEsQ0FBSTtBQUFBLEVBQzVELE9BQ0s7QUFDRCxZQUFRLE9BQU8sTUFBTSxHQUFHLE9BQU8sS0FBSyxDQUFDO0FBQUEsQ0FBSTtBQUFBLEVBQzdDO0FBRUEsU0FBTyxNQUFNLHVCQUF1QixpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLLENBQUMsRUFBRTtBQUU1RixTQUFPLGFBQWE7QUFDcEIsU0FBTyxNQUFNO0FBRWIsVUFBUSxLQUFLLFdBQVcsS0FBSztBQUNqQztBQW1CTyxTQUFTLG9CQUFvQixnQkFBZ0I7QUFDaEQsUUFBTSxFQUFFLFFBQVEsT0FBTyxJQUFJO0FBQzNCLFNBQU8sV0FBVyxTQUFZLEVBQUUsUUFBUSxPQUFPLElBQUksRUFBRSxPQUFPO0FBQ2hFO0FBa0NBLGVBQXNCLFFBQVEsUUFBUTtBQUNsQyxNQUFJO0FBQ0osTUFBSTtBQUVBLFFBQUk7QUFDSixRQUFJO0FBQ0EscUJBQWUsTUFBTSxVQUFVO0FBQUEsSUFDbkMsU0FDTyxPQUFPO0FBQ1YsYUFBTyxTQUFTLE9BQU8sc0JBQXNCO0FBQzdDLGVBQVMsMkJBQTJCLEtBQUs7QUFDekM7QUFBQSxJQUNKO0FBRUEsUUFBSTtBQUNKLFFBQUk7QUFDQSxjQUFRLGdCQUFnQixZQUFZO0FBQUEsSUFDeEMsU0FDTyxPQUFPO0FBQ1YsYUFBTyxTQUFTLE9BQU8sNEJBQTRCO0FBQ25ELGVBQVMsMkJBQTJCLEtBQUs7QUFDekM7QUFBQSxJQUNKO0FBRUEsVUFBTSxnQkFBZ0IsT0FBTztBQUM3QixXQUFPLFdBQVcsZUFBZSxLQUFLO0FBRXRDLFVBQU0sVUFBVSxrQkFBa0IsaUJBQWlCLEVBQUUsUUFBUSxlQUFlLGVBQWUsSUFBSSxFQUFFLE9BQU87QUFFeEcsUUFBSTtBQUNBLFlBQU0saUJBQWlCLE1BQU0sT0FBTyxPQUFPLE9BQU87QUFDbEQsZUFBUyxvQkFBb0IsY0FBYztBQUFBLElBQy9DLFNBQ08sT0FBTztBQUdWLHlCQUFtQixLQUFLO0FBQUEsSUFDNUI7QUFBQSxFQUNKLFVBQ0E7QUFFSSxRQUFJLFdBQVcsUUFBVztBQUN0QixrQkFBWSxPQUFPLE1BQU07QUFBQSxJQUM3QjtBQUVBLFdBQU8sYUFBYTtBQUNwQixXQUFPLE1BQU07QUFJYixRQUFJLFFBQVEsV0FBVyxRQUFXO0FBQzlCLGNBQVEsT0FBTyxNQUFNLE9BQU8sTUFBTTtBQUNsQyxjQUFRLEtBQUssV0FBVyxLQUFLO0FBQUEsSUFDakM7QUFFQSxZQUFRLEtBQUssV0FBVyxPQUFPO0FBQUEsRUFDbkM7QUFDSjs7O0FDL01BLFNBQVMsb0JBQW9CO0FBQzdCLFNBQVMsYUFBYSxnQkFBQUMsZUFBYyxnQkFBZ0I7QUFDcEQsU0FBUyxRQUFBQyxhQUFZOzs7QUNlZCxJQUFNLDBCQUEwQjtBQUNoQyxJQUFNLHlCQUF5Qjs7O0FDYnRDLFNBQVMsYUFBdUI7QUFDOUIsU0FBTyxFQUFFLFVBQVUsb0JBQUksSUFBSSxHQUFHLFFBQVEsTUFBTTtBQUM5QztBQVFBLFNBQVMsV0FBVyxNQUFnQixNQUFvQjtBQUN0RCxNQUFJLE9BQU87QUFDWCxRQUFNLFdBQVcsS0FBSyxNQUFNLEdBQUc7QUFDL0IsV0FBUyxJQUFJLEdBQUcsSUFBSSxTQUFTLFFBQVEsS0FBSztBQUN4QyxVQUFNLE1BQU0sU0FBUyxDQUFDO0FBQ3RCLFFBQUksUUFBUSxLQUFLLFNBQVMsSUFBSSxHQUFHO0FBQ2pDLFFBQUksQ0FBQyxPQUFPO0FBQ1YsY0FBUSxXQUFXO0FBQ25CLFdBQUssU0FBUyxJQUFJLEtBQUssS0FBSztBQUFBLElBQzlCO0FBQ0EsV0FBTztBQUFBLEVBQ1Q7QUFDQSxPQUFLLFNBQVM7QUFDaEI7QUFlQSxTQUFTLFdBQVcsTUFBZ0IsUUFBd0I7QUFDMUQsUUFBTSxRQUFrQixDQUFDO0FBQ3pCLFFBQU0sU0FBUyxJQUFJLE9BQU8sTUFBTTtBQUdoQyxRQUFNLE9BQTZCLENBQUM7QUFDcEMsUUFBTSxRQUE4QixDQUFDO0FBRXJDLGFBQVcsQ0FBQyxNQUFNLEtBQUssS0FBSyxLQUFLLFVBQVU7QUFDekMsUUFBSSxNQUFNLFVBQVUsTUFBTSxTQUFTLFNBQVMsR0FBRztBQUM3QyxZQUFNLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQztBQUFBLElBQzFCLFdBQVcsTUFBTSxVQUFVLE1BQU0sU0FBUyxPQUFPLEdBQUc7QUFHbEQsWUFBTSxLQUFLLENBQUMsTUFBTSxXQUFXLENBQUMsQ0FBQztBQUMvQixXQUFLLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQztBQUFBLElBQ3pCLE9BQU87QUFDTCxXQUFLLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQztBQUFBLElBQ3pCO0FBQUEsRUFDRjtBQUVBLE9BQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDMUMsUUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQztBQUUzQyxhQUFXLENBQUMsTUFBTSxLQUFLLEtBQUssTUFBTTtBQUVoQyxRQUFJLFlBQVk7QUFDaEIsUUFBSSxVQUFVO0FBQ2QsV0FBTyxRQUFRLFNBQVMsU0FBUyxLQUFLLENBQUMsUUFBUSxRQUFRO0FBQ3JELFlBQU0sQ0FBQyxVQUFVLFNBQVMsSUFBSSxRQUFRLFNBQVMsUUFBUSxFQUFFLEtBQUssRUFBRTtBQUNoRSxtQkFBYSxJQUFJLFFBQVE7QUFDekIsZ0JBQVU7QUFBQSxJQUNaO0FBRUEsUUFBSSxRQUFRLFVBQVUsUUFBUSxTQUFTLFNBQVMsR0FBRztBQUVqRCxZQUFNLEtBQUssR0FBRyxNQUFNLEdBQUcsU0FBUyxFQUFFO0FBQUEsSUFDcEMsT0FBTztBQUVMLFlBQU0sS0FBSyxHQUFHLE1BQU0sR0FBRyxTQUFTLEdBQUc7QUFDbkMsWUFBTSxLQUFLLFdBQVcsU0FBUyxTQUFTLENBQUMsQ0FBQztBQUFBLElBQzVDO0FBQUEsRUFDRjtBQUVBLGFBQVcsQ0FBQyxJQUFJLEtBQUssT0FBTztBQUMxQixVQUFNLEtBQUssR0FBRyxNQUFNLEdBQUcsSUFBSSxFQUFFO0FBQUEsRUFDL0I7QUFFQSxTQUFPLE1BQU0sT0FBTyxPQUFPLEVBQUUsS0FBSyxJQUFJO0FBQ3hDO0FBV08sU0FBUyxlQUFlLE9BQXlCO0FBQ3RELE1BQUksTUFBTSxXQUFXLEVBQUcsUUFBTztBQUUvQixRQUFNLE9BQU8sV0FBVztBQUN4QixhQUFXLEtBQUssT0FBTztBQUNyQixRQUFJLEVBQUcsWUFBVyxNQUFNLENBQUM7QUFBQSxFQUMzQjtBQUVBLFNBQU8sV0FBVyxNQUFNLENBQUM7QUFDM0I7QUFjTyxTQUFTLGdCQUFnQixRQUFnQixXQUF5QztBQUN2RixNQUFJLENBQUMsT0FBTyxLQUFLLEVBQUcsUUFBTztBQUUzQixNQUFJLGNBQWMsT0FBTztBQUN2QixXQUFPLG1CQUFtQixNQUFNO0FBQUEsRUFDbEM7QUFDQSxTQUFPLHlCQUF5QixNQUFNO0FBQ3hDO0FBVUEsU0FBUyxtQkFBbUIsS0FBcUI7QUFDL0MsUUFBTSxVQUFVLElBQUksTUFBTSxJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUM7QUFDdEQsU0FBTyxRQUFRLElBQUksQ0FBQyxXQUFXLG1CQUFtQixPQUFPLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQy9FO0FBY0EsU0FBUyx5QkFBeUIsS0FBcUI7QUFDckQsUUFBTSxRQUFRLElBQUksTUFBTSxJQUFJO0FBQzVCLFFBQU0sZUFBMkIsQ0FBQztBQUNsQyxNQUFJLFVBQW9CLENBQUM7QUFFekIsV0FBUyxJQUFJLEdBQUcsSUFBSSxNQUFNLFFBQVEsS0FBSztBQUNyQyxVQUFNLE9BQU8sTUFBTSxDQUFDO0FBR3BCLFFBQUksU0FBUyxNQUFNLFFBQVEsU0FBUyxHQUFHO0FBQ3JDLFlBQU0sT0FBTyxNQUFNLElBQUksQ0FBQztBQUN4QixVQUFJLFFBQVEsZUFBZSxJQUFJLEdBQUc7QUFDaEMscUJBQWEsS0FBSyxPQUFPO0FBQ3pCLGtCQUFVLENBQUM7QUFDWDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBRUEsWUFBUSxLQUFLLElBQUk7QUFBQSxFQUNuQjtBQUNBLE1BQUksUUFBUSxTQUFTLEVBQUcsY0FBYSxLQUFLLE9BQU87QUFFakQsU0FBTyxhQUFhLElBQUksQ0FBQyxVQUFVLG1CQUFtQixNQUFNLEtBQUssSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQzdGO0FBUUEsU0FBUyxlQUFlLE1BQXVCO0FBQzdDLFNBQU8sbUJBQW1CLEtBQUssSUFBSTtBQUNyQztBQVVBLFNBQVMsbUJBQW1CLE9BQXVCO0FBQ2pELFFBQU0sUUFBUSxNQUFNLE1BQU0sSUFBSSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDO0FBQ3RELE1BQUksTUFBTSxXQUFXLEVBQUcsUUFBTztBQUUvQixRQUFNLFNBQVMsTUFBTSxDQUFDO0FBQ3RCLFFBQU0sUUFBUSxNQUFNLE1BQU0sQ0FBQztBQUUzQixNQUFJLE1BQU0sV0FBVyxFQUFHLFFBQU87QUFFL0IsUUFBTSxPQUFPLGVBQWUsS0FBSztBQUNqQyxTQUFPLE9BQU8sR0FBRyxNQUFNO0FBQUEsRUFBSyxJQUFJLEtBQUs7QUFDdkM7OztBRnhNTyxJQUFNLHNCQUFOLGNBQWtDLE1BQU07QUFBQSxFQUc3QyxZQUNrQixVQUNoQixPQUNBO0FBQ0EsVUFBTSxTQUFTLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDcEUsVUFBTSxrQ0FBa0MsUUFBUSxLQUFLLE1BQU0sRUFBRTtBQUo3QztBQUtoQixTQUFLLFFBQVE7QUFBQSxFQUNmO0FBQUEsRUFUa0IsT0FBTztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBaUJ6QixjQUFjLE9BQThEO0FBQzFFLFdBQU87QUFBQSxNQUNMLGVBQWU7QUFBQSxRQUNiLDJCQUEyQixLQUFLLFFBQVE7QUFBQSxRQUN4QztBQUFBLFFBQ0EsVUFBVSxLQUFLLE9BQU87QUFBQSxRQUN0QjtBQUFBLFFBQ0EsUUFBUSxLQUFLO0FBQUEsUUFDYixzREFBc0QsS0FBSyxRQUFRO0FBQUEsUUFDbkU7QUFBQSxRQUNBO0FBQUEsTUFDRixFQUFFLEtBQUssSUFBSTtBQUFBLE1BQ1gsWUFBWSxtQ0FBbUMsS0FBSyxRQUFRLEtBQUssS0FBSyxPQUFPO0FBQUEsSUFDL0U7QUFBQSxFQUNGO0FBQ0Y7QUE4QkEsU0FBUyxhQUFhLFVBQW1DO0FBQ3ZELE1BQUk7QUFDRixVQUFNLE1BQU1DLGNBQWFDLE1BQUssVUFBVSxnQkFBZ0IsR0FBRyxPQUFPO0FBQ2xFLFVBQU0sU0FBUyxLQUFLLE1BQU0sR0FBRztBQUM3QixVQUFNLFFBQVEsT0FBTyxPQUFPO0FBQzVCLFdBQU87QUFBQSxNQUNMLElBQUksT0FBTyxPQUFPLElBQUksS0FBSyxFQUFFO0FBQUEsTUFDN0IsT0FBTyxPQUFPLE9BQU8sT0FBTyxLQUFLLEVBQUU7QUFBQSxNQUNuQyxRQUFRLE9BQU8sT0FBTyxRQUFRLEtBQUssRUFBRTtBQUFBLE1BQ3JDLE9BQU87QUFBQSxRQUNMLGNBQWMsUUFBUSxjQUFjLE1BQU07QUFBQSxRQUMxQyxjQUFjLFFBQVEsY0FBYyxNQUFNO0FBQUEsUUFDMUMsc0JBQXNCLFFBQVEsc0JBQXNCLE1BQU07QUFBQSxRQUMxRCxlQUFlLFFBQVEsZUFBZSxNQUFNO0FBQUEsTUFDOUM7QUFBQSxJQUNGO0FBQUEsRUFDRixRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQVVPLFNBQVMsZUFBZSxhQUFrQztBQUMvRCxRQUFNLE9BQU8sYUFBYSxZQUFZLFlBQVk7QUFFbEQsUUFBTSxLQUFLLE1BQU0sTUFBTSxZQUFZO0FBQ25DLFFBQU0sUUFBUSxNQUFNLFNBQVM7QUFDN0IsUUFBTSxTQUFTLE1BQU0sVUFBVTtBQUUvQixRQUFNLFlBQVksT0FDZCx1QkFBdUIsS0FBSyxNQUFNLFlBQVksaUJBQWlCLEtBQUssTUFBTSxZQUFZLHlCQUF5QixLQUFLLE1BQU0sb0JBQW9CLGtCQUFrQixLQUFLLE1BQU0sYUFBYSxLQUN4TDtBQUVKLFFBQU0sa0JBQWtCLFFBQVEsSUFBSSxlQUFlLGdCQUFnQjtBQUNuRSxRQUFNLGFBQWEsUUFBUSxJQUFJLGVBQWUsV0FBVztBQUV6RCxRQUFNLGdCQUFnQixRQUFRLElBQUksZUFBZSxjQUFjO0FBQy9ELFFBQU0sV0FBVyxDQUFDLG9CQUFvQixZQUFZLFlBQVksRUFBRTtBQUNoRSxNQUFJLGNBQWUsVUFBUyxLQUFLLG9CQUFvQixhQUFhLEVBQUU7QUFDcEUsTUFBSSxXQUFZLFVBQVMsS0FBSyxpQkFBaUIsVUFBVSxFQUFFO0FBQzNELE1BQUksZ0JBQWlCLFVBQVMsS0FBSyxzQkFBc0IsZUFBZSxFQUFFO0FBRTFFLFFBQU0sWUFBc0IsQ0FBQztBQUM3QixNQUFJLE1BQU8sV0FBVSxLQUFLLFVBQVUsS0FBSyxFQUFFO0FBQzNDLFlBQVUsS0FBSyxFQUFFO0FBQ2pCLE1BQUksVUFBVyxXQUFVLEtBQUssU0FBUztBQUN2QyxZQUFVLEtBQUssTUFBTTtBQUNyQixZQUFVLEtBQUssR0FBRyxRQUFRO0FBRTFCLFFBQU0sUUFBUSxDQUFDLE9BQU8sRUFBRSxLQUFLLFdBQVcsTUFBTSxLQUFLLFNBQVMsWUFBWSxhQUFhLEdBQUc7QUFFeEYsU0FBTyxTQUFTLE1BQU0sS0FBSyxHQUFHLENBQUM7QUFBQSxFQUFNLFVBQVUsS0FBSyxJQUFJLENBQUM7QUFBQTtBQUMzRDtBQVlBLFNBQVMsZ0JBQWdCLFNBQXlCO0FBQ2hELFFBQU0sSUFBSSxJQUFJLEtBQUssT0FBTztBQUMxQixRQUFNLE1BQU0sRUFBRSxZQUFZO0FBRTFCLFNBQU8sR0FBRyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDNUI7QUFRQSxTQUFTLFNBQVMsU0FBeUQ7QUFDekUsTUFBSTtBQUNGLFVBQU0sVUFBVSxZQUFZLFNBQVMsRUFBRSxlQUFlLEtBQUssQ0FBQztBQUM1RCxRQUFJLFFBQVE7QUFDWixRQUFJLFNBQVM7QUFDYixlQUFXLFNBQVMsU0FBUztBQUMzQixVQUFJLE1BQU0sT0FBTyxHQUFHO0FBQ2xCO0FBQ0EsWUFBSTtBQUNGLGdCQUFNLEtBQUssU0FBU0EsTUFBSyxTQUFTLE1BQU0sSUFBSSxDQUFDLEVBQUU7QUFDL0MsY0FBSSxLQUFLLE9BQVEsVUFBUztBQUFBLFFBQzVCLFFBQVE7QUFBQSxRQUVSO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFDQSxXQUFPLENBQUMsT0FBTyxNQUFNO0FBQUEsRUFDdkIsUUFBUTtBQUNOLFdBQU8sQ0FBQyxHQUFHLENBQUM7QUFBQSxFQUNkO0FBQ0Y7QUFVTyxTQUFTLG1CQUFtQixVQUEwQjtBQUMzRCxNQUFJO0FBQ0osTUFBSTtBQUNGLGNBQVUsWUFBWSxVQUFVLEVBQUUsZUFBZSxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTztBQUFBLE1BQ25FLE1BQU0sRUFBRSxLQUFLLFNBQVM7QUFBQSxNQUN0QixPQUFPLEVBQUUsWUFBWTtBQUFBLElBQ3ZCLEVBQUU7QUFBQSxFQUNKLFNBQVMsT0FBTztBQUNkLFVBQU0sSUFBSSxvQkFBb0IsVUFBVSxLQUFLO0FBQUEsRUFDL0M7QUFFQSxRQUFNLFFBQWtCLENBQUM7QUFFekIsYUFBVyxTQUFTLFNBQVM7QUFDM0IsUUFBSSxNQUFNLFNBQVMsT0FBUTtBQUMzQixVQUFNLFdBQVdBLE1BQUssVUFBVSxNQUFNLElBQUk7QUFFMUMsUUFBSSxNQUFNLE9BQU87QUFDZixVQUFJLE1BQU0sU0FBUyxXQUFXO0FBRTVCLGNBQU0sS0FBSyxVQUFVO0FBQ3JCLFlBQUk7QUFDRixnQkFBTSxnQkFBZ0IsWUFBWSxVQUFVLEVBQUUsZUFBZSxLQUFLLENBQUM7QUFDbkUscUJBQVcsT0FBTyxlQUFlO0FBQy9CLGdCQUFJLElBQUksWUFBWSxHQUFHO0FBQ3JCLG9CQUFNLFVBQVUsSUFBSSxLQUFLLFNBQVM7QUFDbEMsb0JBQU0sQ0FBQyxPQUFPLE1BQU0sSUFBSSxTQUFTQSxNQUFLLFVBQVUsT0FBTyxDQUFDO0FBQ3hELG9CQUFNLEtBQUssU0FBUyxJQUFJLGFBQWEsZ0JBQWdCLE1BQU0sQ0FBQyxLQUFLO0FBQ2pFLG9CQUFNLEtBQUssR0FBRyxLQUFLLE9BQU8sSUFBSSxPQUFPLEVBQUUsQ0FBQyxHQUFHLEtBQUssU0FBUyxFQUFFLEVBQUU7QUFBQSxZQUMvRDtBQUFBLFVBQ0Y7QUFBQSxRQUNGLFFBQVE7QUFBQSxRQUVSO0FBQUEsTUFDRixPQUFPO0FBRUwsY0FBTSxDQUFDLE9BQU8sTUFBTSxJQUFJLFNBQVMsUUFBUTtBQUN6QyxjQUFNLEtBQUssU0FBUyxJQUFJLGFBQWEsZ0JBQWdCLE1BQU0sQ0FBQyxLQUFLO0FBQ2pFLGNBQU0sS0FBSyxHQUFHLEdBQUcsTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFLENBQUMsR0FBRyxLQUFLLFNBQVMsRUFBRSxFQUFFO0FBQUEsTUFDaEU7QUFBQSxJQUNGLE9BQU87QUFFTCxVQUFJO0FBQ0YsY0FBTSxLQUFLLFNBQVMsUUFBUSxFQUFFO0FBQzlCLGNBQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxHQUFHLE9BQU8sRUFBRSxJQUFJLGdCQUFnQixFQUFFLENBQUM7QUFBQSxNQUM3RCxRQUFRO0FBQ04sY0FBTSxLQUFLLE1BQU0sSUFBSTtBQUFBLE1BQ3ZCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFQSxTQUFPO0FBQUEsRUFBZ0IsTUFBTSxLQUFLLElBQUksQ0FBQztBQUFBO0FBQ3pDO0FBT0EsSUFBTSw0QkFBNEI7QUFlM0IsU0FBUyxzQkFBc0IsVUFBaUM7QUFDckUsTUFBSTtBQUNGLFVBQU0sTUFBTTtBQUFBLE1BQ1Y7QUFBQSxNQUNBO0FBQUEsUUFDRTtBQUFBLFFBQ0EsSUFBSSx5QkFBeUI7QUFBQSxRQUM3QjtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQSxLQUFLLHVCQUF1QjtBQUFBLFFBQzVCLEtBQUssc0JBQXNCO0FBQUEsTUFDN0I7QUFBQSxNQUNBO0FBQUEsUUFDRSxLQUFLO0FBQUEsUUFDTCxVQUFVO0FBQUEsUUFDVixTQUFTO0FBQUEsUUFDVCxPQUFPLENBQUMsUUFBUSxRQUFRLE1BQU07QUFBQSxNQUNoQztBQUFBLElBQ0YsRUFBRSxLQUFLO0FBRVAsUUFBSSxDQUFDLElBQUssUUFBTztBQUVqQixVQUFNLFlBQVksZ0JBQWdCLEtBQUssS0FBSztBQUM1QyxRQUFJLENBQUMsVUFBVyxRQUFPO0FBRXZCLFFBQUksYUFBNEI7QUFDaEMsUUFBSTtBQUNGLFlBQU0sV0FBVyxhQUFhLE9BQU8sQ0FBQyxZQUFZLFdBQVcsTUFBTSxHQUFHO0FBQUEsUUFDcEUsS0FBSztBQUFBLFFBQ0wsVUFBVTtBQUFBLFFBQ1YsU0FBUztBQUFBLFFBQ1QsT0FBTyxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUEsTUFDaEMsQ0FBQyxFQUFFLEtBQUs7QUFDUixtQkFBYSxTQUFTLFVBQVUsRUFBRTtBQUNsQyxVQUFJLE9BQU8sTUFBTSxVQUFVLEVBQUcsY0FBYTtBQUFBLElBQzdDLFFBQVE7QUFBQSxJQUVSO0FBRUEsVUFBTSxZQUFZLGVBQWUsT0FBTyxXQUFXLFVBQVUsTUFBTTtBQUNuRSxXQUFPLGlCQUFpQixTQUFTO0FBQUEsRUFBTSxTQUFTO0FBQUE7QUFBQSxFQUNsRCxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQU9BLElBQU0sbUNBQW1DO0FBdUJ6QyxTQUFTLGtCQUFrQixjQUE0QztBQUNyRSxRQUFNLFdBQXNDLENBQUM7QUFDN0MsTUFBSSxVQUFvQixDQUFDO0FBR3pCLE1BQUk7QUFDRixVQUFNLE1BQU1ELGNBQWFDLE1BQUssY0FBYyx1QkFBdUIsR0FBRyxPQUFPO0FBQzdFLFVBQU0sU0FBUyxLQUFLLE1BQU0sR0FBRztBQUM3QixlQUFXLENBQUMsTUFBTSxJQUFJLEtBQUssT0FBTyxRQUFRLE1BQU0sR0FBRztBQUNqRCxVQUFJLFFBQVEsT0FBTyxTQUFTLFVBQVU7QUFDcEMsaUJBQVMsSUFBSSxJQUFJO0FBQUEsVUFDZixjQUFjLE9BQU8sS0FBSyxpQkFBaUIsV0FBVyxLQUFLLGVBQWU7QUFBQSxVQUMxRSxTQUFTLE9BQU8sS0FBSyxZQUFZLFdBQVcsS0FBSyxVQUFVO0FBQUEsUUFDN0Q7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0YsU0FBUyxPQUFPO0FBQ2QsUUFBSyxNQUFnQyxTQUFTLFVBQVU7QUFDdEQsYUFBTztBQUFBLElBQ1Q7QUFBQSxFQUNGO0FBR0EsTUFBSTtBQUNGLFVBQU0sTUFBTUQsY0FBYUMsTUFBSyxjQUFjLHNCQUFzQixHQUFHLE9BQU87QUFDNUUsY0FBVSxJQUNQLE1BQU0sSUFBSSxFQUNWLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQ25CLE9BQU8sQ0FBQyxNQUFtQixFQUFFLFNBQVMsQ0FBQztBQUFBLEVBQzVDLFNBQVMsT0FBTztBQUNkLFFBQUssTUFBZ0MsU0FBUyxVQUFVO0FBQ3RELGFBQU87QUFBQSxJQUNUO0FBQUEsRUFDRjtBQUdBLE1BQUksT0FBTyxLQUFLLFFBQVEsRUFBRSxXQUFXLEtBQUssUUFBUSxXQUFXLEdBQUc7QUFDOUQsV0FBTztBQUFBLEVBQ1Q7QUFFQSxTQUFPLEVBQUUsVUFBVSxRQUFRO0FBQzdCO0FBU0EsU0FBUyxpQkFBaUIsZUFBdUIsS0FBMEI7QUFDekUsTUFBSTtBQUNGLFVBQU0sU0FBUyxhQUFhLE9BQU8sQ0FBQyxPQUFPLGVBQWUsR0FBRyxHQUFHO0FBQUEsTUFDOUQsS0FBSztBQUFBLE1BQ0wsVUFBVTtBQUFBLE1BQ1YsU0FBUztBQUFBLE1BQ1QsT0FBTyxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUEsSUFDaEMsQ0FBQyxFQUFFLEtBQUs7QUFDUixXQUFPLElBQUksSUFBSSxTQUFTLE9BQU8sTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDO0FBQUEsRUFDakQsUUFBUTtBQUNOLFdBQU8sb0JBQUksSUFBSTtBQUFBLEVBQ2pCO0FBQ0Y7QUFXQSxTQUFTLHFCQUFxQixlQUF1QixNQUEwQjtBQUM3RSxNQUFJLEtBQUssV0FBVyxFQUFHLFFBQU8sQ0FBQztBQUMvQixNQUFJO0FBQ0YsVUFBTSxTQUFTLGFBQWEsT0FBTyxDQUFDLFlBQVksZUFBZSxHQUFHO0FBQUEsTUFDaEUsT0FBTyxHQUFHLEtBQUssS0FBSyxJQUFJLENBQUM7QUFBQTtBQUFBLE1BQ3pCLEtBQUs7QUFBQSxNQUNMLFVBQVU7QUFBQSxNQUNWLFNBQVM7QUFBQSxNQUNULE9BQU8sQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLElBQ2hDLENBQUMsRUFBRSxLQUFLO0FBRVIsVUFBTSxRQUFRLE9BQU8sTUFBTSxJQUFJO0FBQy9CLFVBQU0sYUFBdUIsQ0FBQztBQUM5QixhQUFTLElBQUksR0FBRyxJQUFJLE1BQU0sVUFBVSxJQUFJLEtBQUssUUFBUSxLQUFLO0FBQ3hELFVBQUksQ0FBQyxNQUFNLENBQUMsRUFBRyxTQUFTLFNBQVMsR0FBRztBQUNsQyxtQkFBVyxLQUFLLEtBQUssQ0FBQyxDQUFFO0FBQUEsTUFDMUI7QUFBQSxJQUNGO0FBQ0EsV0FBTztBQUFBLEVBQ1QsUUFBUTtBQUNOLFdBQU8sQ0FBQztBQUFBLEVBQ1Y7QUFDRjtBQVNBLFNBQVMsOEJBQThCLGVBQXVCLE1BQStCO0FBQzNGLE1BQUksS0FBSyxXQUFXLEVBQUcsUUFBTztBQUM5QixNQUFJO0FBQ0YsVUFBTSxTQUFTLGFBQWEsT0FBTyxDQUFDLE9BQU8sYUFBYSwyQkFBMkIsZUFBZSxHQUFHLElBQUksR0FBRztBQUFBLE1BQzFHLEtBQUs7QUFBQSxNQUNMLFVBQVU7QUFBQSxNQUNWLFNBQVM7QUFBQSxNQUNULE9BQU8sQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLElBQ2hDLENBQUMsRUFBRSxLQUFLO0FBRVIsUUFBSSxDQUFDLE9BQVEsUUFBTztBQUNwQixXQUFPLGdCQUFnQixRQUFRLFlBQVksS0FBSztBQUFBLEVBQ2xELFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBNEJPLFNBQVMsNEJBQTRCLGVBQXVCLGNBQWdDO0FBQ2pHLFFBQU0sWUFBWSxrQkFBa0IsWUFBWTtBQUNoRCxNQUFJLENBQUMsVUFBVyxRQUFPLENBQUM7QUFFeEIsUUFBTSxhQUFhLFFBQVEsSUFBSSxlQUFlLFdBQVcsS0FBSztBQUc5RCxRQUFNLGlCQUFpQixPQUFPLFFBQVEsVUFBVSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsY0FBYyxFQUFFLE9BQU8sQ0FBQztBQUluSCxRQUFNLHVCQUF1QixvQkFBSSxJQUFZO0FBQzdDLFFBQU0sU0FBd0IsQ0FBQztBQUUvQixhQUFXLENBQUMsTUFBTSxJQUFJLEtBQUssZ0JBQWdCO0FBQ3pDLFVBQU0sWUFBWSxpQkFBaUIsZUFBZSxJQUFJO0FBQ3RELFVBQU0sYUFBYSxVQUFVLFFBQVEsT0FBTyxDQUFDLFFBQVEsVUFBVSxJQUFJLEdBQUcsQ0FBQztBQUN2RSxlQUFXLE9BQU8sV0FBWSxzQkFBcUIsSUFBSSxHQUFHO0FBQzFELFFBQUksV0FBVyxTQUFTLEdBQUc7QUFDekIsYUFBTyxLQUFLLEVBQUUsWUFBWSxNQUFNLGNBQWMsS0FBSyxjQUFjLE1BQU0sV0FBVyxDQUFDO0FBQUEsSUFDckY7QUFBQSxFQUNGO0FBR0EsUUFBTSxnQkFBZ0IsaUJBQWlCLGVBQWUsVUFBVTtBQUNoRSxRQUFNLFdBQVcsVUFBVSxRQUFRLE9BQU8sQ0FBQyxRQUFRLGNBQWMsSUFBSSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsSUFBSSxHQUFHLENBQUM7QUFDM0csTUFBSSxTQUFTLFNBQVMsR0FBRztBQUN2QixXQUFPLEtBQUssRUFBRSxZQUFZLFlBQVksTUFBTSxTQUFTLENBQUM7QUFBQSxFQUN4RDtBQUdBLFFBQU0sZUFBZSxVQUFVLFFBQVEsT0FBTyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsSUFBSSxHQUFHLEtBQUssQ0FBQyxjQUFjLElBQUksR0FBRyxDQUFDO0FBQ2hILFFBQU0sYUFBYSxxQkFBcUIsZUFBZSxZQUFZO0FBQ25FLE1BQUksV0FBVyxTQUFTLEdBQUc7QUFDekIsV0FBTyxLQUFLLEVBQUUsWUFBWSxJQUFJLE1BQU0sWUFBWSxVQUFVLEtBQUssQ0FBQztBQUFBLEVBQ2xFO0FBR0EsUUFBTSxjQUFjLG9CQUFJLElBQVk7QUFDcEMsUUFBTSxTQUFtQixDQUFDO0FBRTFCLGFBQVcsU0FBUyxRQUFRO0FBQzFCLFVBQU0sVUFBVSxNQUFNLEtBQUssT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLElBQUksR0FBRyxDQUFDO0FBQ2hFLFVBQU0sVUFBVSxNQUFNLEtBQUssT0FBTyxDQUFDLFFBQVEsWUFBWSxJQUFJLEdBQUcsQ0FBQztBQUcvRCxVQUFNLGNBQWMsUUFBUSxNQUFNLENBQUMsZ0NBQWdDO0FBQ25FLFVBQU0sVUFBVSw4QkFBOEIsZUFBZSxXQUFXO0FBRXhFLFFBQUksU0FBUztBQUNYLGlCQUFXLE9BQU8sWUFBYSxhQUFZLElBQUksR0FBRztBQUFBLElBQ3BEO0FBR0EsVUFBTSxZQUFzQixDQUFDO0FBQzdCLFFBQUksUUFBUyxXQUFVLEtBQUssT0FBTztBQUNuQyxRQUFJLFFBQVEsU0FBUyxHQUFHO0FBQ3RCLGdCQUFVLEtBQUssUUFBUSxJQUFJLENBQUMsUUFBUSxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQztBQUFBLElBQ2pFO0FBRUEsUUFBSSxVQUFVLFdBQVcsRUFBRztBQUc1QixVQUFNLFFBQWtCLENBQUM7QUFDekIsUUFBSSxNQUFNLFVBQVU7QUFDbEIsWUFBTSxLQUFLLGlCQUFpQjtBQUFBLElBQzlCLE9BQU87QUFDTCxZQUFNLEtBQUssV0FBVyxNQUFNLFVBQVUsR0FBRztBQUN6QyxVQUFJLE1BQU0sYUFBYyxPQUFNLEtBQUssaUJBQWlCLE1BQU0sWUFBWSxHQUFHO0FBQUEsSUFDM0U7QUFDQSxVQUFNLEtBQUssVUFBVSxNQUFNLEtBQUssTUFBTSxHQUFHO0FBRXpDLFdBQU8sS0FBSyx1QkFBdUIsTUFBTSxLQUFLLEdBQUcsQ0FBQztBQUFBLEVBQU0sVUFBVSxLQUFLLElBQUksQ0FBQztBQUFBLHNCQUF5QjtBQUFBLEVBQ3ZHO0FBRUEsU0FBTztBQUNUO0FBbUJPLFNBQVMsdUJBQXVCLGFBQWtDO0FBQ3ZFLFFBQU0sWUFBWSxlQUFlLFdBQVc7QUFDNUMsUUFBTSxZQUFZLG1CQUFtQixZQUFZLFlBQVk7QUFDN0QsUUFBTSxXQUFXLHNCQUFzQixZQUFZLFlBQVk7QUFDL0QsUUFBTSxxQkFBcUIsNEJBQTRCLFlBQVksVUFBVSxZQUFZLFlBQVk7QUFFckcsUUFBTSxRQUFRLENBQUMsV0FBVyxTQUFTO0FBQ25DLE1BQUksU0FBVSxPQUFNLEtBQUssUUFBUTtBQUNqQyxRQUFNLEtBQUssR0FBRyxrQkFBa0I7QUFDaEMsU0FBTyxNQUFNLEtBQUssTUFBTTtBQUMxQjs7O0FadmpCTyxJQUFNLDJCQUFOLGNBQXVDLE1BQU07QUFBQSxFQUdsRCxZQUNrQixLQUNBLFdBQ2hCLE9BQ0E7QUFDQSxVQUFNLFNBQVMsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSztBQUNwRSxVQUFNLDBCQUEwQixHQUFHLGdCQUFnQixTQUFTLEtBQUssTUFBTSxFQUFFO0FBTHpEO0FBQ0E7QUFLaEIsU0FBSyxRQUFRO0FBQUEsRUFDZjtBQUFBLEVBVmtCLE9BQU87QUFXM0I7QUFZTyxTQUFTLGVBQWUsVUFBaUM7QUFDOUQsTUFBSTtBQUNGLFdBQU9DLGNBQWEsT0FBTyxDQUFDLGFBQWEsTUFBTSxHQUFHO0FBQUEsTUFDaEQsS0FBSztBQUFBLE1BQ0wsVUFBVTtBQUFBLE1BQ1YsU0FBUztBQUFBLE1BQ1QsT0FBTyxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUEsSUFDaEMsQ0FBQyxFQUFFLEtBQUs7QUFBQSxFQUNWLFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBY08sU0FBUyx1QkFDZCxLQUNBLFdBQ0EsZ0JBQ0EsUUFDQSxjQUNNO0FBQ04sUUFBTSxjQUFjLFFBQVFDLFNBQVEsY0FBYyxZQUFZLEdBQUcsQ0FBQyxHQUFHLGtDQUFrQztBQUd2RyxNQUFJO0FBQ0osTUFBSTtBQUNGLGNBQVUsUUFBUSxJQUFJLGFBQWEsS0FBS0MsY0FBYUMsTUFBS0MsU0FBUSxHQUFHLFVBQVUsYUFBYSxHQUFHLE9BQU8sRUFBRSxLQUFLO0FBQUEsRUFDL0csUUFBUTtBQUNOLGNBQVU7QUFBQSxFQUNaO0FBRUEsUUFBTSxZQUFZLENBQUMsYUFBYSxPQUFPLEdBQUcsR0FBRyxXQUFXLGdCQUFnQixRQUFRLFlBQVk7QUFFNUYsUUFBTSxRQUFRLE1BQU0sU0FBUyxXQUFXO0FBQUEsSUFDdEMsVUFBVTtBQUFBLElBQ1YsT0FBTztBQUFBLEVBQ1QsQ0FBQztBQUNELFFBQU0sTUFBTTtBQUNkO0FBZUEsZUFBZSwyQkFDYixXQUNBLFdBQ0EsZ0JBQ0EsYUFDQUMsU0FDdUQ7QUFDdkQsTUFBSTtBQUNGLFVBQU0sZ0JBQWdCLFdBQVcsU0FBUztBQUMxQyxJQUFBQSxRQUFPLEtBQUsseUNBQXlDLEVBQUUsS0FBSyxXQUFXLFVBQVUsQ0FBQztBQUFBLEVBQ3BGLFNBQVMsT0FBTztBQUNkLFVBQU0sUUFBUSxJQUFJLHlCQUF5QixXQUFXLFdBQVcsS0FBSztBQUN0RSxJQUFBQSxRQUFPLE1BQU0sK0JBQStCLEVBQUUsS0FBSyxNQUFNLEtBQUssV0FBVyxNQUFNLFdBQVcsT0FBTyxNQUFNLFFBQVEsQ0FBQztBQUNoSCxXQUFPLG1CQUFtQjtBQUFBLE1BQ3hCLFVBQVU7QUFBQSxNQUNWLGVBQWU7QUFBQSxRQUNiLHVDQUF1QyxNQUFNLEdBQUcsYUFBYSxNQUFNLFNBQVM7QUFBQSxRQUM1RTtBQUFBLFFBQ0EsVUFBVSxNQUFNLE9BQU87QUFBQSxRQUN2QjtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0EseUNBQXlDLE9BQU8sTUFBTSxHQUFHLENBQUM7QUFBQSxNQUM1RCxFQUFFLEtBQUssSUFBSTtBQUFBLE1BQ1gsWUFBWSxnQ0FBZ0MsTUFBTSxPQUFPO0FBQUEsSUFDM0QsQ0FBQztBQUFBLEVBQ0g7QUFFQSxNQUFJO0FBQ0YsMkJBQXVCLFdBQVcsV0FBVyxnQkFBZ0IsWUFBWSxRQUFRLFlBQVksWUFBWTtBQUN6RyxJQUFBQSxRQUFPLEtBQUssOEJBQThCLEVBQUUsS0FBSyxXQUFXLFVBQVUsQ0FBQztBQUFBLEVBQ3pFLFNBQVMsT0FBTztBQUNkLFVBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3JFLElBQUFBLFFBQU8sS0FBSyxtQ0FBbUMsRUFBRSxPQUFPLFFBQVEsQ0FBQztBQUFBLEVBQ25FO0FBRUEsU0FBTztBQUNUO0FBT0EsSUFBTSx1QkFBdUI7QUFFN0IsSUFBTyx3QkFBUSxpQkFBaUIsQ0FBQyxHQUFHLE9BQU8sT0FBTyxFQUFFLFFBQUFBLFNBQVEsZUFBQUMsZUFBYyxNQUFNO0FBQzlFLE1BQUk7QUFDSixNQUFJO0FBQ0Ysa0JBQWMsbUJBQW1CO0FBQUEsRUFDbkMsU0FBUyxPQUFPO0FBQ2QsVUFBTSxVQUFVLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDckUsSUFBQUQsUUFBTyxNQUFNLDJDQUEyQyxFQUFFLE9BQU8sUUFBUSxDQUFDO0FBQzFFLFdBQU8sbUJBQW1CO0FBQUEsTUFDeEIsZUFBZTtBQUFBLElBQ2pCLENBQUM7QUFBQSxFQUNIO0FBSUEsRUFBQUMsZUFBYyxzQkFBc0IsTUFBTSxVQUFVO0FBQ3BELEVBQUFELFFBQU8sS0FBSyx1Q0FBdUMsRUFBRSxXQUFXLE1BQU0sV0FBVyxDQUFDO0FBRWxGLFFBQU0sVUFBVSxlQUFlLFlBQVksWUFBWTtBQUN2RCxNQUFJLFNBQVM7QUFDWCx3QkFBb0IsTUFBTSxZQUFZLE9BQU87QUFDN0MsSUFBQUEsUUFBTyxLQUFLLHVCQUF1QixFQUFFLFNBQVMsVUFBVSxZQUFZLGFBQWEsQ0FBQztBQUFBLEVBQ3BGLE9BQU87QUFDTCxJQUFBQSxRQUFPLEtBQUssa0NBQWtDLEVBQUUsVUFBVSxZQUFZLGFBQWEsQ0FBQztBQUFBLEVBQ3RGO0FBRUEsUUFBTSxZQUFZLGNBQWM7QUFDaEMsTUFBSSxXQUFXO0FBQ2IsVUFBTSxVQUFVLE1BQU07QUFBQSxNQUNwQjtBQUFBLE1BQ0EsTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ047QUFBQSxNQUNBQTtBQUFBLElBQ0Y7QUFDQSxRQUFJLFFBQVMsUUFBTztBQUFBLEVBQ3RCLE9BQU87QUFDTCxJQUFBQSxRQUFPLE1BQU0sb0RBQW9EO0FBQUEsTUFDL0QsV0FBVyxNQUFNO0FBQUEsTUFDakIsTUFBTSxRQUFRO0FBQUEsSUFDaEIsQ0FBQztBQUNELFdBQU8sbUJBQW1CO0FBQUEsTUFDeEIsVUFBVTtBQUFBLE1BQ1YsZUFBZTtBQUFBLFFBQ2I7QUFBQSxRQUNBO0FBQUEsUUFDQSxZQUFZLE1BQU0sVUFBVTtBQUFBLFFBQzVCLGNBQWMsUUFBUSxJQUFJO0FBQUEsUUFDMUI7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRixFQUFFLEtBQUssSUFBSTtBQUFBLE1BQ1gsWUFBWSxtQ0FBbUMsUUFBUSxJQUFJLGFBQWEsTUFBTSxVQUFVO0FBQUEsSUFDMUYsQ0FBQztBQUFBLEVBQ0g7QUFFQSxFQUFBQSxRQUFPLEtBQUssK0JBQStCO0FBQUEsSUFDekMsUUFBUSxZQUFZO0FBQUEsSUFDcEIsWUFBWSxZQUFZO0FBQUEsSUFDeEIsYUFBYSxZQUFZO0FBQUEsSUFDekIsZUFBZSxZQUFZO0FBQUEsRUFDN0IsQ0FBQztBQUVELE1BQUk7QUFDSixNQUFJO0FBQ0Ysb0JBQWdCLHVCQUF1QixXQUFXO0FBQUEsRUFDcEQsU0FBUyxPQUFPO0FBQ2QsUUFBSSxpQkFBaUIscUJBQXFCO0FBQ3hDLE1BQUFBLFFBQU8sTUFBTSwwQkFBMEIsRUFBRSxVQUFVLE1BQU0sVUFBVSxPQUFPLE1BQU0sUUFBUSxDQUFDO0FBQ3pGLGFBQU8sbUJBQW1CO0FBQUEsUUFDeEIsVUFBVTtBQUFBLFFBQ1YsR0FBRyxNQUFNLGNBQWMsU0FBUztBQUFBLE1BQ2xDLENBQUM7QUFBQSxJQUNIO0FBQ0EsVUFBTTtBQUFBLEVBQ1I7QUFFQSxTQUFPLG1CQUFtQjtBQUFBLElBQ3hCO0FBQUEsSUFDQSxvQkFBb0I7QUFBQSxNQUNsQixtQkFBbUI7QUFBQSxJQUNyQjtBQUFBLEVBQ0YsQ0FBQztBQUNILENBQUM7OztBZWpRRCxRQUFRLHFCQUFJOyIsCiAgIm5hbWVzIjogWyJleGVjRmlsZVN5bmMiLCAicmVhZEZpbGVTeW5jIiwgImhvbWVkaXIiLCAiZGlybmFtZSIsICJqb2luIiwgInJlc29sdmUiLCAibWtkaXJTeW5jIiwgInJlYWRGaWxlU3luYyIsICJ1bmxpbmtTeW5jIiwgIndyaXRlRmlsZVN5bmMiLCAiaG9tZWRpciIsICJqb2luIiwgImpvaW4iLCAiaG9tZWRpciIsICJqb2luIiwgIm1rZGlyU3luYyIsICJ3cml0ZUZpbGVTeW5jIiwgInJlYWRGaWxlU3luYyIsICJyZWFkRmlsZVN5bmMiLCAiY2xvc2VTeW5jIiwgIm1rZGlyU3luYyIsICJvcGVuU3luYyIsICJkaXJuYW1lIiwgInJlc29sdmUiLCAicmVhZEZpbGVTeW5jIiwgImpvaW4iLCAicmVhZEZpbGVTeW5jIiwgImpvaW4iLCAiZXhlY0ZpbGVTeW5jIiwgImRpcm5hbWUiLCAicmVhZEZpbGVTeW5jIiwgImpvaW4iLCAiaG9tZWRpciIsICJsb2dnZXIiLCAicGVyc2lzdEVudlZhciJdCn0K
