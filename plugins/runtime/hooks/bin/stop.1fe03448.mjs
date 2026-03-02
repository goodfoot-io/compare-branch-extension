#!/usr/bin/env -S node --enable-source-maps
import { createRequire as __createRequire } from "node:module";
import { fileURLToPath as __fileURLToPath } from "node:url";
import { dirname as __pathDirname } from "node:path";
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);

// src/stop.ts
import { execFileSync } from "node:child_process";

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
async function removeSessionPid(pid) {
  await executeTransaction(
    getCardRepoPidsRegistryPath(),
    getCardRepoPidsLockPath(),
    (registry) => {
      delete registry.sessions[String(pid)];
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
var LOCK_TIMEOUT_MS2 = 2e3;
function getCardRepoCommitsDir() {
  return join2(homedir2(), ".cards", "card-repo-commits");
}
function getSessionCsvPath(sessionId) {
  return join2(getCardRepoCommitsDir(), `${sessionId}.csv`);
}
function getSessionCsvLockPath(sessionId) {
  return join2(getCardRepoCommitsDir(), `${sessionId}.csv.lock`);
}
function getSessionHeadShaPath(sessionId) {
  return join2(getCardRepoCommitsDir(), `${sessionId}.head`);
}
async function appendCommitToSession(sessionId, sha) {
  mkdirSync2(getCardRepoCommitsDir(), { recursive: true, mode: 448 });
  const csvLockPath = getSessionCsvLockPath(sessionId);
  await acquireLock(csvLockPath, LOCK_TIMEOUT_MS2);
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
    const content = readFileSync2(csvPath, "utf-8");
    return content.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  } catch (error) {
    if (hasErrnoCode(error, "ENOENT")) return [];
    throw error;
  }
}
function removeSessionCsv(sessionId) {
  const csvPath = getSessionCsvPath(sessionId);
  const csvLockPath = getSessionCsvLockPath(sessionId);
  try {
    unlinkSync2(csvPath);
  } catch (error) {
    if (!hasErrnoCode(error, "ENOENT")) throw error;
  }
  try {
    unlinkSync2(csvLockPath);
  } catch (error) {
    if (!hasErrnoCode(error, "ENOENT")) throw error;
  }
}
function readSessionHeadSha(sessionId) {
  try {
    return readFileSync2(getSessionHeadShaPath(sessionId), "utf-8").trim();
  } catch (error) {
    if (hasErrnoCode(error, "ENOENT")) return null;
    throw error;
  }
}
function removeSessionHeadSha(sessionId) {
  try {
    unlinkSync2(getSessionHeadShaPath(sessionId));
  } catch (error) {
    if (!hasErrnoCode(error, "ENOENT")) throw error;
  }
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
function stopHook(config, handler) {
  return createHookFunction("Stop", config, handler);
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
  const { stdout, stderr } = specificOutput;
  return stderr !== void 0 ? { stdout, stderr } : { stdout };
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
    if (output?.stderr !== void 0) {
      process.stderr.write(output.stderr);
      process.exit(EXIT_CODES.BLOCK);
    }
    process.exit(EXIT_CODES.SUCCESS);
  }
}

// src/stop.ts
var EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf899d15363d7aa09";
var SHA_PATTERN = /^[0-9a-f]{40}$/i;
var CommitLogError = class extends Error {
  constructor(repoPath, sinceSha, cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to list commits since ${sinceSha} in ${repoPath}: ${reason}`);
    this.repoPath = repoPath;
    this.sinceSha = sinceSha;
    this.cause = cause;
  }
  name = "CommitLogError";
};
var CommitDiffError = class extends Error {
  constructor(repoPath, shas, cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to generate diff for ${shas.length} commit(s) in ${repoPath}: ${reason}`);
    this.repoPath = repoPath;
    this.shas = shas;
    this.cause = cause;
  }
  name = "CommitDiffError";
};
var CommitRecordError = class extends Error {
  constructor(sessionId, sha, cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to record commit ${sha} for session ${sessionId}: ${reason}`);
    this.sessionId = sessionId;
    this.sha = sha;
    this.cause = cause;
  }
  name = "CommitRecordError";
};
var SessionCleanupError = class extends Error {
  constructor(sessionId, cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to clean up session ${sessionId}: ${reason}`);
    this.sessionId = sessionId;
    this.cause = cause;
  }
  name = "SessionCleanupError";
};
function assertValidSha(sha, label) {
  if (!SHA_PATTERN.test(sha)) {
    throw new Error(`Invalid ${label}: ${sha}`);
  }
}
function getCommitsSince(repoPath, sinceSha) {
  assertValidSha(sinceSha, "since SHA");
  try {
    const output = execFileSync(
      "git",
      ["log", "--format=%H", `${sinceSha}..HEAD`, "--", ".", ":!streams/claude-code-session/"],
      {
        cwd: repoPath,
        encoding: "utf-8",
        timeout: 1e4,
        stdio: ["pipe", "pipe", "pipe"]
      }
    ).trim();
    if (!output) return [];
    const shas = output.split("\n");
    for (const sha of shas) {
      assertValidSha(sha, "commit SHA");
    }
    return shas;
  } catch (error) {
    throw new CommitLogError(repoPath, sinceSha, error);
  }
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
    const parentCheck = execFileSync("git", ["rev-list", "--parents", "-n", "1", oldest], {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const base = parentCheck.includes(" ") ? `${oldest}~1` : EMPTY_TREE_SHA;
    return execFileSync("git", ["diff", `${base}..HEAD`, "--", ".", ":!streams/claude-code-session/"], {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 1e4,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    throw new CommitDiffError(repoPath, shas, error);
  }
}
async function recordUnattributedCommits(sessionId, shas) {
  for (const sha of shas) {
    try {
      await appendCommitToSession(sessionId, sha);
    } catch (error) {
      throw new CommitRecordError(sessionId, sha, error);
    }
  }
}
async function cleanupSession(logger2, sessionId) {
  const resolvedPid = findClaudePid();
  try {
    if (resolvedPid) {
      await removeSessionPid(resolvedPid);
      logger2.info("Cleaned up PID registration", { pid: resolvedPid });
    }
    removeSessionHeadSha(sessionId);
    removeSessionCsv(sessionId);
    logger2.info("Cleaned up session CSV", { sessionId });
  } catch (error) {
    throw new SessionCleanupError(sessionId, error);
  }
}
async function cleanupAndApprove(logger2, sessionId, approvalMessage) {
  try {
    await cleanupSession(logger2, sessionId);
  } catch (error) {
    if (error instanceof SessionCleanupError) {
      logger2.error("Session cleanup failed", { sessionId: error.sessionId, error: error.message });
      return stopOutput({
        decision: "approve",
        systemMessage: [
          approvalMessage,
          "",
          `Warning: ${error.message}`,
          "",
          "Stale session artifacts may remain. To clean up manually:",
          "1. Check for leftover PID entries in the session registry",
          `2. Remove the session CSV for session ${sessionId} if it exists`
        ].join("\n"),
        reason: `Cleanup failed: ${error.message}`
      });
    }
    throw error;
  }
  return stopOutput({ decision: "approve", systemMessage: approvalMessage });
}
var stop_default = stopHook({}, async (input, { logger: logger2 }) => {
  let actionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger2.error("Not running inside an action subprocess", { error: message });
    return stopOutput({
      decision: "approve",
      systemMessage: "Stop hook: not running inside an action subprocess."
    });
  }
  const headSha = readSessionHeadSha(input.session_id);
  if (!headSha) {
    logger2.info("No HEAD SHA on file \u2014 skipping commit attribution check");
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
    if (error instanceof CommitLogError) {
      logger2.error("Failed to list commits", { repoPath: error.repoPath, error: error.message });
      return stopOutput({
        decision: "approve",
        systemMessage: [
          `Could not list commits since session start in '${error.repoPath}'.`,
          "",
          `Error: ${error.message}`,
          "",
          "Commit attribution could not be verified. To investigate:",
          `1. Verify the card repository is a valid git repo at: ${error.repoPath}`,
          "2. Check that git is available and the repository is not corrupted",
          `3. Confirm the baseline SHA (${error.sinceSha}) exists in the repository`
        ].join("\n"),
        reason: `Commit log failed: ${error.message}`
      });
    }
    throw error;
  }
  if (allCommits.length === 0) {
    return cleanupAndApprove(logger2, sessionId, "Stop approved \u2014 no commits since session start.");
  }
  let sessionCommits;
  try {
    sessionCommits = getSessionCommits(sessionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger2.error("Failed to read session commits", { error: message });
    return stopOutput({
      decision: "approve",
      systemMessage: [
        `Could not read session commit records for session ${sessionId}.`,
        "",
        `Error: ${message}`,
        "",
        "Commit attribution could not be verified. To investigate:",
        "1. Check that the session CSV file exists and is readable",
        `2. Verify file permissions for session ${sessionId}`
      ].join("\n"),
      reason: `Session CSV read failed: ${message}`
    });
  }
  const unattributed = getUnattributedCommits(allCommits, sessionCommits);
  if (unattributed.length === 0) {
    return cleanupAndApprove(
      logger2,
      sessionId,
      `Stop approved \u2014 all ${allCommits.length} commits attributed to this session.`
    );
  }
  const warnings = [];
  let diffContent;
  try {
    diffContent = getDiffForCommits(actionInput.cardRepoPath, unattributed);
  } catch (error) {
    if (error instanceof CommitDiffError) {
      logger2.error("Failed to generate diff", { repoPath: error.repoPath, error: error.message });
      diffContent = [
        `(Could not generate diff for ${error.shas.length} commit(s))`,
        "",
        `Error: ${error.message}`,
        "",
        "To view the diff manually:",
        `  git -C ${error.repoPath} diff ${error.shas[error.shas.length - 1]}~1..HEAD`
      ].join("\n");
      warnings.push(`Diff generation failed: ${error.message}`);
    } else {
      throw error;
    }
  }
  try {
    await recordUnattributedCommits(sessionId, unattributed);
  } catch (error) {
    if (error instanceof CommitRecordError) {
      logger2.error("Failed to record unattributed commit", {
        sessionId: error.sessionId,
        sha: error.sha,
        error: error.message
      });
      warnings.push(
        `Commit recording failed for ${error.sha}: ${error.message}. The next stop may re-flag these commits as unattributed. Verify the session CSV is writable.`
      );
    } else {
      throw error;
    }
  }
  try {
    await cleanupSession(logger2, sessionId);
  } catch (error) {
    if (error instanceof SessionCleanupError) {
      logger2.error("Session cleanup failed", { sessionId: error.sessionId, error: error.message });
      warnings.push(
        `Session cleanup failed: ${error.message}. Stale PID entries or CSV files may remain. Check the session registry and remove artifacts for session ${sessionId} manually.`
      );
    } else {
      throw error;
    }
  }
  const commitSummary = `${unattributed.length} unattributed commit${unattributed.length > 1 ? "s" : ""}`;
  const warningBlock = warnings.length > 0 ? `

Warnings:
${warnings.map((w) => `- ${w}`).join("\n")}` : "";
  return stopOutput({
    decision: "block",
    reason: `External changes detected in card repo (${commitSummary}):

${diffContent}${warningBlock}`
  });
});

// src/stop-entry.ts
process.env["CLAUDE_CODE_HOOKS_CLI_LOG_FILE"] = "/workspace/.cards/logs/claude-code-cards-runtime-hooks.log";
execute(stop_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3N0b3AudHMiLCAiLi4vY2xhdWRlLWNvZGUtc2Vzc2lvbnMvc3JjL2luZGV4LnRzIiwgIi4uL2NsYXVkZS1jb2RlLXNlc3Npb25zL3NyYy9pbnRlcm5hbC50cyIsICIuLi9jbGF1ZGUtY29kZS1zZXNzaW9ucy9zcmMvaXBjLnRzIiwgIi4uL2NsYXVkZS1jb2RlLXNlc3Npb25zL3NyYy9wcm9jZXNzLXRyZWUudHMiLCAiLi4vY2xhdWRlLWNvZGUtc2Vzc2lvbnMvc3JjL2NhcmQtcmVwby50cyIsICIuLi9zZGsvc3JjL2NvbmZpZy9lbnYudHMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2Vudi5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvaG9va3MuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2xvZ2dlci5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3Qvb3V0cHV0cy5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvcnVudGltZS5qcyIsICJzcmMvc3RvcC1lbnRyeS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBTdG9wIGhvb2sgaW1wbGVtZW50YXRpb24uXG4gKlxuICogUnVucyBhcyBhIHN1YnByb2Nlc3Mgb2YgYW4gYWN0aW9uLiBVc2VzIHtAbGluayBleHRyYWN0QWN0aW9uSW5wdXR9IHRvXG4gKiBjb25maXJtIHdlIGFyZSBpbnNpZGUgYW4gYWN0aW9uIHN1YnByb2Nlc3MgYW5kIHRvIGV4cG9zZSB0aGUgYWN0aW9uXG4gKiBwcm9jZXNzIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBBZnRlciBjb25maXJtaW5nIHRoZSBhY3Rpb24gY29udGV4dCwgdGhlIGhvb2sgY2hlY2tzIGZvciB1bmF0dHJpYnV0ZWRcbiAqIGNvbW1pdHMgaW4gdGhlIGNhcmQgcmVwbyBzaW5jZSB0aGUgc2Vzc2lvbiBzdGFydGVkICh0cmFja2VkIHZpYSBhXG4gKiBwZXItc2Vzc2lvbiBgLmhlYWRgIGZpbGUpLiBVbmF0dHJpYnV0ZWQgY29tbWl0cyBhcmUgdGhvc2Ugbm90IHJlY29yZGVkXG4gKiBpbiB0aGUgc2Vzc2lvbidzIENTViBieSB0aGUgY2FyZC1yZXBvIHBvc3QtY29tbWl0IGhvb2suXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFN0b3AgaG9vayBpbXBsZW1lbnRhdGlvblxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N0b3BcbiAqL1xuXG5pbXBvcnQgeyBleGVjRmlsZVN5bmMgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZmluZENsYXVkZVBpZCwgcmVtb3ZlU2Vzc2lvblBpZCB9IGZyb20gJ0BjYXJkcy9jbGF1ZGUtY29kZS1zZXNzaW9ucyc7XG5pbXBvcnQge1xuICBhcHBlbmRDb21taXRUb1Nlc3Npb24sXG4gIGdldFNlc3Npb25Db21taXRzLFxuICByZWFkU2Vzc2lvbkhlYWRTaGEsXG4gIHJlbW92ZVNlc3Npb25Dc3YsXG4gIHJlbW92ZVNlc3Npb25IZWFkU2hhXG59IGZyb20gJ0BjYXJkcy9jbGF1ZGUtY29kZS1zZXNzaW9ucy9jYXJkLXJlcG8nO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25JbnB1dCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IGV4dHJhY3RBY3Rpb25JbnB1dCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB0eXBlIHsgTG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbmltcG9ydCB7IHN0b3BIb29rLCBzdG9wT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcblxuLyoqXG4gKiBXZWxsLWtub3duIGdpdCBlbXB0eSB0cmVlIFNIQSwgdXNlZCBhcyBhIGRpZmYgYmFzZSBmb3IgaW5pdGlhbCBjb21taXRzLlxuICogVGhpcyBpcyBhIGRldGVybWluaXN0aWMgdmFsdWUgdGhhdCBuZXZlciBjaGFuZ2VzLlxuICovXG5jb25zdCBFTVBUWV9UUkVFX1NIQSA9ICc0YjgyNWRjNjQyY2I2ZWI5YTA2MGU1NGJmODk5ZDE1MzYzZDdhYTA5JztcbmNvbnN0IFNIQV9QQVRURVJOID0gL15bMC05YS1mXXs0MH0kL2k7XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gYGdpdCBsb2dgIGZhaWxzIHRvIGxpc3QgY29tbWl0cyBzaW5jZSBhIGJhc2VsaW5lIFNIQS5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbW1pdExvZ0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBvdmVycmlkZSByZWFkb25seSBuYW1lID0gJ0NvbW1pdExvZ0Vycm9yJztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgcmVwb1BhdGg6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgc2luY2VTaGE6IHN0cmluZyxcbiAgICBjYXVzZTogdW5rbm93blxuICApIHtcbiAgICBjb25zdCByZWFzb24gPSBjYXVzZSBpbnN0YW5jZW9mIEVycm9yID8gY2F1c2UubWVzc2FnZSA6IFN0cmluZyhjYXVzZSk7XG4gICAgc3VwZXIoYEZhaWxlZCB0byBsaXN0IGNvbW1pdHMgc2luY2UgJHtzaW5jZVNoYX0gaW4gJHtyZXBvUGF0aH06ICR7cmVhc29ufWApO1xuICAgIHRoaXMuY2F1c2UgPSBjYXVzZTtcbiAgfVxufVxuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIGBnaXQgZGlmZmAgZmFpbHMgdG8gZ2VuZXJhdGUgYSBkaWZmIGZvciB1bmF0dHJpYnV0ZWQgY29tbWl0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbW1pdERpZmZFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgbmFtZSA9ICdDb21taXREaWZmRXJyb3InO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSByZXBvUGF0aDogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBzaGFzOiBzdHJpbmdbXSxcbiAgICBjYXVzZTogdW5rbm93blxuICApIHtcbiAgICBjb25zdCByZWFzb24gPSBjYXVzZSBpbnN0YW5jZW9mIEVycm9yID8gY2F1c2UubWVzc2FnZSA6IFN0cmluZyhjYXVzZSk7XG4gICAgc3VwZXIoYEZhaWxlZCB0byBnZW5lcmF0ZSBkaWZmIGZvciAke3NoYXMubGVuZ3RofSBjb21taXQocykgaW4gJHtyZXBvUGF0aH06ICR7cmVhc29ufWApO1xuICAgIHRoaXMuY2F1c2UgPSBjYXVzZTtcbiAgfVxufVxuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIHJlY29yZGluZyBhbiB1bmF0dHJpYnV0ZWQgY29tbWl0IHRvIHRoZSBzZXNzaW9uIENTViBmYWlscy5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbW1pdFJlY29yZEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBvdmVycmlkZSByZWFkb25seSBuYW1lID0gJ0NvbW1pdFJlY29yZEVycm9yJztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgc2Vzc2lvbklkOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IHNoYTogc3RyaW5nLFxuICAgIGNhdXNlOiB1bmtub3duXG4gICkge1xuICAgIGNvbnN0IHJlYXNvbiA9IGNhdXNlIGluc3RhbmNlb2YgRXJyb3IgPyBjYXVzZS5tZXNzYWdlIDogU3RyaW5nKGNhdXNlKTtcbiAgICBzdXBlcihgRmFpbGVkIHRvIHJlY29yZCBjb21taXQgJHtzaGF9IGZvciBzZXNzaW9uICR7c2Vzc2lvbklkfTogJHtyZWFzb259YCk7XG4gICAgdGhpcy5jYXVzZSA9IGNhdXNlO1xuICB9XG59XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gc2Vzc2lvbiBjbGVhbnVwIChQSUQvQ1NWIHJlbW92YWwpIGZhaWxzLlxuICovXG5leHBvcnQgY2xhc3MgU2Vzc2lvbkNsZWFudXBFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgbmFtZSA9ICdTZXNzaW9uQ2xlYW51cEVycm9yJztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgc2Vzc2lvbklkOiBzdHJpbmcsXG4gICAgY2F1c2U6IHVua25vd25cbiAgKSB7XG4gICAgY29uc3QgcmVhc29uID0gY2F1c2UgaW5zdGFuY2VvZiBFcnJvciA/IGNhdXNlLm1lc3NhZ2UgOiBTdHJpbmcoY2F1c2UpO1xuICAgIHN1cGVyKGBGYWlsZWQgdG8gY2xlYW4gdXAgc2Vzc2lvbiAke3Nlc3Npb25JZH06ICR7cmVhc29ufWApO1xuICAgIHRoaXMuY2F1c2UgPSBjYXVzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhc3NlcnRWYWxpZFNoYShzaGE6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIVNIQV9QQVRURVJOLnRlc3Qoc2hhKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke2xhYmVsfTogJHtzaGF9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFsbCBjb21taXQgU0hBcyBiZXR3ZWVuIHNpbmNlU2hhIGFuZCBIRUFEIGluIHRoZSBnaXZlbiByZXBvLFxuICogZXhjbHVkaW5nIGNvbW1pdHMgdGhhdCBvbmx5IHRvdWNoIGZpbGVzIHVuZGVyIGBzdHJlYW1zL2NsYXVkZS1jb2RlLXNlc3Npb24vYC5cbiAqIFJ1bnM6IGdpdCBsb2cgLS1mb3JtYXQ9JUggc2luY2VTaGEuLkhFQUQgLS0gLiA6IXN0cmVhbXMvY2xhdWRlLWNvZGUtc2Vzc2lvbi9cbiAqXG4gKiBAcGFyYW0gcmVwb1BhdGggLSBDYXJkIHJlcG9zaXRvcnkgcGF0aCB3aGVyZSBnaXQgY29tbWFuZHMgc2hvdWxkIGV4ZWN1dGUuXG4gKiBAcGFyYW0gc2luY2VTaGEgLSBCYXNlbGluZSBTSEEgY2FwdHVyZWQgYXQgc2Vzc2lvbiBzdGFydC5cbiAqIEByZXR1cm5zIE5ld2VyIGNvbW1pdCBTSEFzIGluIHJldmVyc2UgY2hyb25vbG9naWNhbCBvcmRlciAobmV3ZXN0IGZpcnN0KS5cbiAqIEB0aHJvd3Mge0NvbW1pdExvZ0Vycm9yfSBXaGVuIHRoZSBnaXQgbG9nIGNvbW1hbmQgZmFpbHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb21taXRzU2luY2UocmVwb1BhdGg6IHN0cmluZywgc2luY2VTaGE6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgYXNzZXJ0VmFsaWRTaGEoc2luY2VTaGEsICdzaW5jZSBTSEEnKTtcblxuICB0cnkge1xuICAgIGNvbnN0IG91dHB1dCA9IGV4ZWNGaWxlU3luYyhcbiAgICAgICdnaXQnLFxuICAgICAgWydsb2cnLCAnLS1mb3JtYXQ9JUgnLCBgJHtzaW5jZVNoYX0uLkhFQURgLCAnLS0nLCAnLicsICc6IXN0cmVhbXMvY2xhdWRlLWNvZGUtc2Vzc2lvbi8nXSxcbiAgICAgIHtcbiAgICAgICAgY3dkOiByZXBvUGF0aCxcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGYtOCcsXG4gICAgICAgIHRpbWVvdXQ6IDEwMDAwLFxuICAgICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgICB9XG4gICAgKS50cmltKCk7XG4gICAgaWYgKCFvdXRwdXQpIHJldHVybiBbXTtcbiAgICBjb25zdCBzaGFzID0gb3V0cHV0LnNwbGl0KCdcXG4nKTtcbiAgICBmb3IgKGNvbnN0IHNoYSBvZiBzaGFzKSB7XG4gICAgICBhc3NlcnRWYWxpZFNoYShzaGEsICdjb21taXQgU0hBJyk7XG4gICAgfVxuICAgIHJldHVybiBzaGFzO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBDb21taXRMb2dFcnJvcihyZXBvUGF0aCwgc2luY2VTaGEsIGVycm9yKTtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgY29tbWl0cyBmcm9tIGFsbENvbW1pdHMgdGhhdCBhcmUgTk9UIGluIHNlc3Npb25Db21taXRzLlxuICpcbiAqIEBwYXJhbSBhbGxDb21taXRzIC0gRnVsbCBjb21taXQgbGlzdCBkZXRlY3RlZCBzaW5jZSBzZXNzaW9uIHN0YXJ0LlxuICogQHBhcmFtIHNlc3Npb25Db21taXRzIC0gQ29tbWl0cyBhbHJlYWR5IGF0dHJpYnV0ZWQgdG8gdGhlIGN1cnJlbnQgc2Vzc2lvbi5cbiAqIEByZXR1cm5zIFNIQXMgdGhhdCBzdGlsbCBuZWVkIGF0dHJpYnV0aW9uIHJldmlldy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFVuYXR0cmlidXRlZENvbW1pdHMoYWxsQ29tbWl0czogc3RyaW5nW10sIHNlc3Npb25Db21taXRzOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgc2Vzc2lvblNldCA9IG5ldyBTZXQoc2Vzc2lvbkNvbW1pdHMpO1xuICByZXR1cm4gYWxsQ29tbWl0cy5maWx0ZXIoKHNoYSkgPT4gIXNlc3Npb25TZXQuaGFzKHNoYSkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGNvbWJpbmVkIGRpZmYgY29udGVudCBmb3IgdGhlIGdpdmVuIGNvbW1pdCBTSEFzLlxuICogVXNlcyB0aGUgcmFuZ2UgZnJvbSBvbGRlc3QgdW5hdHRyaWJ1dGVkIGNvbW1pdCdzIHBhcmVudCB0byBIRUFELlxuICogRGV0ZWN0cyBpbml0aWFsIGNvbW1pdHMgKG5vIHBhcmVudCkgYW5kIHVzZXMgdGhlIGVtcHR5IHRyZWUgU0hBIGFzIGJhc2UuXG4gKlxuICogQHBhcmFtIHJlcG9QYXRoIC0gQ2FyZCByZXBvc2l0b3J5IHBhdGggd2hlcmUgZ2l0IGNvbW1hbmRzIHNob3VsZCBleGVjdXRlLlxuICogQHBhcmFtIHNoYXMgLSBVbmF0dHJpYnV0ZWQgY29tbWl0IFNIQXMgKG5ld2VzdCBmaXJzdCBmcm9tIHtAbGluayBnZXRDb21taXRzU2luY2V9KS5cbiAqIEByZXR1cm5zIFVuaWZpZWQgZGlmZiB0ZXh0IGZvciBhbGwgdW5hdHRyaWJ1dGVkIGNoYW5nZXMuXG4gKiBAdGhyb3dzIHtDb21taXREaWZmRXJyb3J9IFdoZW4gdGhlIGdpdCBkaWZmIGNvbW1hbmQgZmFpbHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREaWZmRm9yQ29tbWl0cyhyZXBvUGF0aDogc3RyaW5nLCBzaGFzOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIGlmIChzaGFzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnO1xuICAvLyBzaGFzIGFyZSBpbiByZXZlcnNlIGNocm9ub2xvZ2ljYWwgb3JkZXIgKG5ld2VzdCBmaXJzdCBmcm9tIGdpdCBsb2cpXG4gIC8vIG9sZGVzdCBpcyBsYXN0IGVsZW1lbnRcbiAgY29uc3Qgb2xkZXN0ID0gc2hhc1tzaGFzLmxlbmd0aCAtIDFdITtcbiAgYXNzZXJ0VmFsaWRTaGEob2xkZXN0LCAnb2xkZXN0IGNvbW1pdCBTSEEnKTtcblxuICB0cnkge1xuICAgIC8vIERldGVybWluZSB0aGUgZGlmZiBiYXNlOiBjaGVjayBpZiB0aGUgb2xkZXN0IGNvbW1pdCBoYXMgYSBwYXJlbnQuXG4gICAgLy8gYGdpdCByZXYtbGlzdCAtLXBhcmVudHMgLW4gMSBTSEFgIG91dHB1dHMgXCJTSEEgUEFSRU5ULi4uXCIgZm9yIHJlZ3VsYXJcbiAgICAvLyBjb21taXRzIGFuZCBqdXN0IFwiU0hBXCIgZm9yIGluaXRpYWwgY29tbWl0cyAobm8gcGFyZW50KS5cbiAgICBjb25zdCBwYXJlbnRDaGVjayA9IGV4ZWNGaWxlU3luYygnZ2l0JywgWydyZXYtbGlzdCcsICctLXBhcmVudHMnLCAnLW4nLCAnMScsIG9sZGVzdF0sIHtcbiAgICAgIGN3ZDogcmVwb1BhdGgsXG4gICAgICBlbmNvZGluZzogJ3V0Zi04JyxcbiAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgfSkudHJpbSgpO1xuICAgIGNvbnN0IGJhc2UgPSBwYXJlbnRDaGVjay5pbmNsdWRlcygnICcpID8gYCR7b2xkZXN0fX4xYCA6IEVNUFRZX1RSRUVfU0hBO1xuXG4gICAgcmV0dXJuIGV4ZWNGaWxlU3luYygnZ2l0JywgWydkaWZmJywgYCR7YmFzZX0uLkhFQURgLCAnLS0nLCAnLicsICc6IXN0cmVhbXMvY2xhdWRlLWNvZGUtc2Vzc2lvbi8nXSwge1xuICAgICAgY3dkOiByZXBvUGF0aCxcbiAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgdGltZW91dDogMTAwMDAsXG4gICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgfSkudHJpbSgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBDb21taXREaWZmRXJyb3IocmVwb1BhdGgsIHNoYXMsIGVycm9yKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlY29yZHMgdW5hdHRyaWJ1dGVkIGNvbW1pdHMgc28gdGhleSBhcmUgdHJlYXRlZCBhcyBhY2tub3dsZWRnZWQgb24gdGhlIG5leHQgc3RvcC5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRCB3aG9zZSBjb21taXQgQ1NWIHNob3VsZCBiZSB1cGRhdGVkLlxuICogQHBhcmFtIHNoYXMgLSBVbmF0dHJpYnV0ZWQgY29tbWl0IFNIQXMgdG8gcGVyc2lzdC5cbiAqIEB0aHJvd3Mge0NvbW1pdFJlY29yZEVycm9yfSBXaGVuIGEgY29tbWl0IGNhbm5vdCBiZSBhcHBlbmRlZCB0byB0aGUgc2Vzc2lvbiBDU1YuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlY29yZFVuYXR0cmlidXRlZENvbW1pdHMoc2Vzc2lvbklkOiBzdHJpbmcsIHNoYXM6IHN0cmluZ1tdKTogUHJvbWlzZTx2b2lkPiB7XG4gIGZvciAoY29uc3Qgc2hhIG9mIHNoYXMpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgYXBwZW5kQ29tbWl0VG9TZXNzaW9uKHNlc3Npb25JZCwgc2hhKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhyb3cgbmV3IENvbW1pdFJlY29yZEVycm9yKHNlc3Npb25JZCwgc2hhLCBlcnJvcik7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlcyBQSUQvc2Vzc2lvbiBhcnRpZmFjdHMgY3JlYXRlZCBkdXJpbmcgc2Vzc2lvbi1zdGFydC5cbiAqXG4gKiBAcGFyYW0gbG9nZ2VyIC0gSG9vayBsb2dnZXIgdXNlZCBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRCB3aG9zZSBDU1YgYnVmZmVyIHNob3VsZCBiZSBjbGVhbmVkIHVwLlxuICogQHRocm93cyB7U2Vzc2lvbkNsZWFudXBFcnJvcn0gV2hlbiBQSUQgb3IgQ1NWIGNsZWFudXAgZmFpbHMuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNsZWFudXBTZXNzaW9uKGxvZ2dlcjogTG9nZ2VyLCBzZXNzaW9uSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCByZXNvbHZlZFBpZCA9IGZpbmRDbGF1ZGVQaWQoKTtcblxuICB0cnkge1xuICAgIGlmIChyZXNvbHZlZFBpZCkge1xuICAgICAgYXdhaXQgcmVtb3ZlU2Vzc2lvblBpZChyZXNvbHZlZFBpZCk7XG4gICAgICBsb2dnZXIuaW5mbygnQ2xlYW5lZCB1cCBQSUQgcmVnaXN0cmF0aW9uJywgeyBwaWQ6IHJlc29sdmVkUGlkIH0pO1xuICAgIH1cblxuICAgIHJlbW92ZVNlc3Npb25IZWFkU2hhKHNlc3Npb25JZCk7XG4gICAgcmVtb3ZlU2Vzc2lvbkNzdihzZXNzaW9uSWQpO1xuICAgIGxvZ2dlci5pbmZvKCdDbGVhbmVkIHVwIHNlc3Npb24gQ1NWJywgeyBzZXNzaW9uSWQgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgbmV3IFNlc3Npb25DbGVhbnVwRXJyb3Ioc2Vzc2lvbklkLCBlcnJvcik7XG4gIH1cbn1cblxuLyoqXG4gKiBSdW5zIHNlc3Npb24gY2xlYW51cCBhbmQgcmV0dXJucyBhbiBhcHByb3ZlIG91dHB1dC4gV2hlbiBjbGVhbnVwIGZhaWxzXG4gKiB3aXRoIGEge0BsaW5rIFNlc3Npb25DbGVhbnVwRXJyb3J9LCB0aGUgYXBwcm92YWwgbWVzc2FnZSBpcyBhdWdtZW50ZWRcbiAqIHdpdGggYSB3YXJuaW5nIHJhdGhlciB0aGFuIGZhaWxpbmcgdGhlIGhvb2suXG4gKlxuICogQHBhcmFtIGxvZ2dlciAtIEhvb2sgbG9nZ2VyIHVzZWQgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gd2hvc2UgYXJ0aWZhY3RzIHNob3VsZCBiZSBjbGVhbmVkIHVwLlxuICogQHBhcmFtIGFwcHJvdmFsTWVzc2FnZSAtIE1lc3NhZ2UgcmV0dXJuZWQgb24gc3VjY2Vzcy5cbiAqIEByZXR1cm5zIFN0b3Agb3V0cHV0IHdpdGggZGVjaXNpb24gXCJhcHByb3ZlXCIuXG4gKiBAdGhyb3dzIFJlLXRocm93cyBub24te0BsaW5rIFNlc3Npb25DbGVhbnVwRXJyb3J9IGVycm9ycy5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gY2xlYW51cEFuZEFwcHJvdmUoXG4gIGxvZ2dlcjogTG9nZ2VyLFxuICBzZXNzaW9uSWQ6IHN0cmluZyxcbiAgYXBwcm92YWxNZXNzYWdlOiBzdHJpbmdcbik6IFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2Ygc3RvcE91dHB1dD4+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBjbGVhbnVwU2Vzc2lvbihsb2dnZXIsIHNlc3Npb25JZCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgU2Vzc2lvbkNsZWFudXBFcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdTZXNzaW9uIGNsZWFudXAgZmFpbGVkJywgeyBzZXNzaW9uSWQ6IGVycm9yLnNlc3Npb25JZCwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZScsXG4gICAgICAgIHN5c3RlbU1lc3NhZ2U6IFtcbiAgICAgICAgICBhcHByb3ZhbE1lc3NhZ2UsXG4gICAgICAgICAgJycsXG4gICAgICAgICAgYFdhcm5pbmc6ICR7ZXJyb3IubWVzc2FnZX1gLFxuICAgICAgICAgICcnLFxuICAgICAgICAgICdTdGFsZSBzZXNzaW9uIGFydGlmYWN0cyBtYXkgcmVtYWluLiBUbyBjbGVhbiB1cCBtYW51YWxseTonLFxuICAgICAgICAgICcxLiBDaGVjayBmb3IgbGVmdG92ZXIgUElEIGVudHJpZXMgaW4gdGhlIHNlc3Npb24gcmVnaXN0cnknLFxuICAgICAgICAgIGAyLiBSZW1vdmUgdGhlIHNlc3Npb24gQ1NWIGZvciBzZXNzaW9uICR7c2Vzc2lvbklkfSBpZiBpdCBleGlzdHNgXG4gICAgICAgIF0uam9pbignXFxuJyksXG4gICAgICAgIHJlYXNvbjogYENsZWFudXAgZmFpbGVkOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgfSk7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG4gIHJldHVybiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJywgc3lzdGVtTWVzc2FnZTogYXBwcm92YWxNZXNzYWdlIH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBzdG9wSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gIGxldCBhY3Rpb25JbnB1dDogQWN0aW9uSW5wdXQ7XG4gIHRyeSB7XG4gICAgYWN0aW9uSW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgIGxvZ2dlci5lcnJvcignTm90IHJ1bm5pbmcgaW5zaWRlIGFuIGFjdGlvbiBzdWJwcm9jZXNzJywgeyBlcnJvcjogbWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgICBkZWNpc2lvbjogJ2FwcHJvdmUnLFxuICAgICAgc3lzdGVtTWVzc2FnZTogJ1N0b3AgaG9vazogbm90IHJ1bm5pbmcgaW5zaWRlIGFuIGFjdGlvbiBzdWJwcm9jZXNzLidcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IGhlYWRTaGEgPSByZWFkU2Vzc2lvbkhlYWRTaGEoaW5wdXQuc2Vzc2lvbl9pZCk7XG4gIGlmICghaGVhZFNoYSkge1xuICAgIGxvZ2dlci5pbmZvKCdObyBIRUFEIFNIQSBvbiBmaWxlIFx1MjAxNCBza2lwcGluZyBjb21taXQgYXR0cmlidXRpb24gY2hlY2snKTtcbiAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgICBkZWNpc2lvbjogJ2FwcHJvdmUnLFxuICAgICAgc3lzdGVtTWVzc2FnZTogJ1N0b3AgYXBwcm92ZWQgKG5vIEhFQUQgU0hBIHRyYWNrZWQgZm9yIHRoaXMgc2Vzc2lvbikuJ1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3Qgc2Vzc2lvbklkID0gaW5wdXQuc2Vzc2lvbl9pZDtcblxuICAvLyBHZXQgYWxsIGNvbW1pdHMgc2luY2Ugc2Vzc2lvbiBzdGFydFxuICBsZXQgYWxsQ29tbWl0czogc3RyaW5nW107XG4gIHRyeSB7XG4gICAgYWxsQ29tbWl0cyA9IGdldENvbW1pdHNTaW5jZShhY3Rpb25JbnB1dC5jYXJkUmVwb1BhdGgsIGhlYWRTaGEpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIENvbW1pdExvZ0Vycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBsaXN0IGNvbW1pdHMnLCB7IHJlcG9QYXRoOiBlcnJvci5yZXBvUGF0aCwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZScsXG4gICAgICAgIHN5c3RlbU1lc3NhZ2U6IFtcbiAgICAgICAgICBgQ291bGQgbm90IGxpc3QgY29tbWl0cyBzaW5jZSBzZXNzaW9uIHN0YXJ0IGluICcke2Vycm9yLnJlcG9QYXRofScuYCxcbiAgICAgICAgICAnJyxcbiAgICAgICAgICBgRXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gLFxuICAgICAgICAgICcnLFxuICAgICAgICAgICdDb21taXQgYXR0cmlidXRpb24gY291bGQgbm90IGJlIHZlcmlmaWVkLiBUbyBpbnZlc3RpZ2F0ZTonLFxuICAgICAgICAgIGAxLiBWZXJpZnkgdGhlIGNhcmQgcmVwb3NpdG9yeSBpcyBhIHZhbGlkIGdpdCByZXBvIGF0OiAke2Vycm9yLnJlcG9QYXRofWAsXG4gICAgICAgICAgJzIuIENoZWNrIHRoYXQgZ2l0IGlzIGF2YWlsYWJsZSBhbmQgdGhlIHJlcG9zaXRvcnkgaXMgbm90IGNvcnJ1cHRlZCcsXG4gICAgICAgICAgYDMuIENvbmZpcm0gdGhlIGJhc2VsaW5lIFNIQSAoJHtlcnJvci5zaW5jZVNoYX0pIGV4aXN0cyBpbiB0aGUgcmVwb3NpdG9yeWBcbiAgICAgICAgXS5qb2luKCdcXG4nKSxcbiAgICAgICAgcmVhc29uOiBgQ29tbWl0IGxvZyBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICBpZiAoYWxsQ29tbWl0cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gY2xlYW51cEFuZEFwcHJvdmUobG9nZ2VyLCBzZXNzaW9uSWQsICdTdG9wIGFwcHJvdmVkIFx1MjAxNCBubyBjb21taXRzIHNpbmNlIHNlc3Npb24gc3RhcnQuJyk7XG4gIH1cblxuICAvLyBHZXQgc2Vzc2lvbidzIGF0dHJpYnV0ZWQgY29tbWl0c1xuICBsZXQgc2Vzc2lvbkNvbW1pdHM6IHN0cmluZ1tdO1xuICB0cnkge1xuICAgIHNlc3Npb25Db21taXRzID0gZ2V0U2Vzc2lvbkNvbW1pdHMoc2Vzc2lvbklkKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHJlYWQgc2Vzc2lvbiBjb21taXRzJywgeyBlcnJvcjogbWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgICBkZWNpc2lvbjogJ2FwcHJvdmUnLFxuICAgICAgc3lzdGVtTWVzc2FnZTogW1xuICAgICAgICBgQ291bGQgbm90IHJlYWQgc2Vzc2lvbiBjb21taXQgcmVjb3JkcyBmb3Igc2Vzc2lvbiAke3Nlc3Npb25JZH0uYCxcbiAgICAgICAgJycsXG4gICAgICAgIGBFcnJvcjogJHttZXNzYWdlfWAsXG4gICAgICAgICcnLFxuICAgICAgICAnQ29tbWl0IGF0dHJpYnV0aW9uIGNvdWxkIG5vdCBiZSB2ZXJpZmllZC4gVG8gaW52ZXN0aWdhdGU6JyxcbiAgICAgICAgJzEuIENoZWNrIHRoYXQgdGhlIHNlc3Npb24gQ1NWIGZpbGUgZXhpc3RzIGFuZCBpcyByZWFkYWJsZScsXG4gICAgICAgIGAyLiBWZXJpZnkgZmlsZSBwZXJtaXNzaW9ucyBmb3Igc2Vzc2lvbiAke3Nlc3Npb25JZH1gXG4gICAgICBdLmpvaW4oJ1xcbicpLFxuICAgICAgcmVhc29uOiBgU2Vzc2lvbiBDU1YgcmVhZCBmYWlsZWQ6ICR7bWVzc2FnZX1gXG4gICAgfSk7XG4gIH1cblxuICBjb25zdCB1bmF0dHJpYnV0ZWQgPSBnZXRVbmF0dHJpYnV0ZWRDb21taXRzKGFsbENvbW1pdHMsIHNlc3Npb25Db21taXRzKTtcblxuICBpZiAodW5hdHRyaWJ1dGVkLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBjbGVhbnVwQW5kQXBwcm92ZShcbiAgICAgIGxvZ2dlcixcbiAgICAgIHNlc3Npb25JZCxcbiAgICAgIGBTdG9wIGFwcHJvdmVkIFx1MjAxNCBhbGwgJHthbGxDb21taXRzLmxlbmd0aH0gY29tbWl0cyBhdHRyaWJ1dGVkIHRvIHRoaXMgc2Vzc2lvbi5gXG4gICAgKTtcbiAgfVxuXG4gIC8vIFVuYXR0cmlidXRlZCBjb21taXRzIGZvdW5kIFx1MjAxNCBnYXRoZXIgZGlmZiwgcmVjb3JkLCBjbGVhbnVwLCB0aGVuIGJsb2NrLlxuICAvLyBFcnJvcnMgaW4gdGhlc2Ugc2lkZS1lZmZlY3Qgb3BlcmF0aW9ucyBhcmUgY29sbGVjdGVkIGFzIHdhcm5pbmdzIGFuZFxuICAvLyBpbmNsdWRlZCBpbiB0aGUgb3V0cHV0IHdpdGhvdXQgY2hhbmdpbmcgdGhlIGJsb2NrIGRlY2lzaW9uLlxuICBjb25zdCB3YXJuaW5nczogc3RyaW5nW10gPSBbXTtcblxuICBsZXQgZGlmZkNvbnRlbnQ6IHN0cmluZztcbiAgdHJ5IHtcbiAgICBkaWZmQ29udGVudCA9IGdldERpZmZGb3JDb21taXRzKGFjdGlvbklucHV0LmNhcmRSZXBvUGF0aCwgdW5hdHRyaWJ1dGVkKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBDb21taXREaWZmRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGdlbmVyYXRlIGRpZmYnLCB7IHJlcG9QYXRoOiBlcnJvci5yZXBvUGF0aCwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICBkaWZmQ29udGVudCA9IFtcbiAgICAgICAgYChDb3VsZCBub3QgZ2VuZXJhdGUgZGlmZiBmb3IgJHtlcnJvci5zaGFzLmxlbmd0aH0gY29tbWl0KHMpKWAsXG4gICAgICAgICcnLFxuICAgICAgICBgRXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gLFxuICAgICAgICAnJyxcbiAgICAgICAgJ1RvIHZpZXcgdGhlIGRpZmYgbWFudWFsbHk6JyxcbiAgICAgICAgYCAgZ2l0IC1DICR7ZXJyb3IucmVwb1BhdGh9IGRpZmYgJHtlcnJvci5zaGFzW2Vycm9yLnNoYXMubGVuZ3RoIC0gMV19fjEuLkhFQURgXG4gICAgICBdLmpvaW4oJ1xcbicpO1xuICAgICAgd2FybmluZ3MucHVzaChgRGlmZiBnZW5lcmF0aW9uIGZhaWxlZDogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IHJlY29yZFVuYXR0cmlidXRlZENvbW1pdHMoc2Vzc2lvbklkLCB1bmF0dHJpYnV0ZWQpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIENvbW1pdFJlY29yZEVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byByZWNvcmQgdW5hdHRyaWJ1dGVkIGNvbW1pdCcsIHtcbiAgICAgICAgc2Vzc2lvbklkOiBlcnJvci5zZXNzaW9uSWQsXG4gICAgICAgIHNoYTogZXJyb3Iuc2hhLFxuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxuICAgICAgfSk7XG4gICAgICB3YXJuaW5ncy5wdXNoKFxuICAgICAgICBgQ29tbWl0IHJlY29yZGluZyBmYWlsZWQgZm9yICR7ZXJyb3Iuc2hhfTogJHtlcnJvci5tZXNzYWdlfS4gYCArXG4gICAgICAgICAgJ1RoZSBuZXh0IHN0b3AgbWF5IHJlLWZsYWcgdGhlc2UgY29tbWl0cyBhcyB1bmF0dHJpYnV0ZWQuICcgK1xuICAgICAgICAgICdWZXJpZnkgdGhlIHNlc3Npb24gQ1NWIGlzIHdyaXRhYmxlLidcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIHRyeSB7XG4gICAgYXdhaXQgY2xlYW51cFNlc3Npb24obG9nZ2VyLCBzZXNzaW9uSWQpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFNlc3Npb25DbGVhbnVwRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignU2Vzc2lvbiBjbGVhbnVwIGZhaWxlZCcsIHsgc2Vzc2lvbklkOiBlcnJvci5zZXNzaW9uSWQsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgICAgd2FybmluZ3MucHVzaChcbiAgICAgICAgYFNlc3Npb24gY2xlYW51cCBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX0uIGAgK1xuICAgICAgICAgICdTdGFsZSBQSUQgZW50cmllcyBvciBDU1YgZmlsZXMgbWF5IHJlbWFpbi4gJyArXG4gICAgICAgICAgYENoZWNrIHRoZSBzZXNzaW9uIHJlZ2lzdHJ5IGFuZCByZW1vdmUgYXJ0aWZhY3RzIGZvciBzZXNzaW9uICR7c2Vzc2lvbklkfSBtYW51YWxseS5gXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBjb25zdCBjb21taXRTdW1tYXJ5ID0gYCR7dW5hdHRyaWJ1dGVkLmxlbmd0aH0gdW5hdHRyaWJ1dGVkIGNvbW1pdCR7dW5hdHRyaWJ1dGVkLmxlbmd0aCA+IDEgPyAncycgOiAnJ31gO1xuICBjb25zdCB3YXJuaW5nQmxvY2sgPSB3YXJuaW5ncy5sZW5ndGggPiAwID8gYFxcblxcbldhcm5pbmdzOlxcbiR7d2FybmluZ3MubWFwKCh3KSA9PiBgLSAke3d9YCkuam9pbignXFxuJyl9YCA6ICcnO1xuXG4gIHJldHVybiBzdG9wT3V0cHV0KHtcbiAgICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAgICByZWFzb246IGBFeHRlcm5hbCBjaGFuZ2VzIGRldGVjdGVkIGluIGNhcmQgcmVwbyAoJHtjb21taXRTdW1tYXJ5fSk6XFxuXFxuJHtkaWZmQ29udGVudH0ke3dhcm5pbmdCbG9ja31gXG4gIH0pO1xufSk7XG4iLCAiLyoqXG4gKiBUcmFja3MgYXNzb2NpYXRpb25zIGJldHdlZW4gQ2xhdWRlIHByb2Nlc3MgSURzIGFuZCBjYXJkcyBvbiBkaXNrLCBidWZmZXJpbmdcbiAqIHBlbmRpbmcgY29tbWl0IFNIQXMgdW50aWwgYW4gYXNzb2NpYXRpb24gaXMgZXN0YWJsaXNoZWQuIFRoZSByZWdpc3RyeSB1c2VzXG4gKiBhdG9taWMgZmlsZSB3cml0ZXMsIGFkdmlzb3J5IGZpbGUgbG9ja2luZywgYW5kIGF1dG9tYXRpYyBzdGFsZS1lbnRyeSBwcnVuaW5nXG4gKiB0byByZW1haW4gY29ycmVjdCB1bmRlciBjb25jdXJyZW50IGFjY2Vzcy5cbiAqXG4gKiBAc3VtbWFyeSBQSUQtdG8tY2FyZCBzZXNzaW9uIHJlZ2lzdHJ5IHdpdGggY29tbWl0IGJ1ZmZlcmluZ1xuICogQG1vZHVsZSBjbGF1ZGUtY29kZS1zZXNzaW9uc1xuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlIH0gZnJvbSAnbm9kZTpmcy9wcm9taXNlcyc7XG5pbXBvcnQgeyBob21lZGlyIH0gZnJvbSAnbm9kZTpvcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IGV4ZWN1dGVUcmFuc2FjdGlvbiwgaGFzRXJybm9Db2RlLCBpc1Byb2Nlc3NBbGl2ZSwgcHJ1bmVTdGFsZUVudHJpZXMgfSBmcm9tICcuL2ludGVybmFsLmpzJztcblxuZXhwb3J0IHsgZmluZEFsbENsYXVkZVBpZHMsIGZpbmRDbGF1ZGVQaWQsIFBST0NFU1NfVFJFRV9NQVhfREVQVEggfSBmcm9tICcuL3Byb2Nlc3MtdHJlZS5qcyc7XG5cbmZ1bmN0aW9uIGdldENhcmRzRGlyKCk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGhvbWVkaXIoKSwgJy5jYXJkcycpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGNhbm9uaWNhbCBvbi1kaXNrIGxvY2F0aW9uIGZvciB0aGUgc2Vzc2lvbiByZWdpc3RyeSBKU09OIGZpbGUuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byBgfi8uY2FyZHMvY2xhdWRlLXNlc3Npb25zLmpzb25gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVnaXN0cnlQYXRoKCk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGdldENhcmRzRGlyKCksICdjbGF1ZGUtc2Vzc2lvbnMuanNvbicpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGNhbm9uaWNhbCBvbi1kaXNrIGxvY2F0aW9uIGZvciB0aGUgc2Vzc2lvbiBsb2NrIGZpbGUuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byBgfi8uY2FyZHMvY2xhdWRlLXNlc3Npb25zLmxvY2tgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9ja1BhdGgoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oZ2V0Q2FyZHNEaXIoKSwgJ2NsYXVkZS1zZXNzaW9ucy5sb2NrJyk7XG59XG5cbmV4cG9ydCBjb25zdCBMT0NLX1RJTUVPVVRfTVMgPSAyMDAwO1xuZXhwb3J0IGNvbnN0IE1BWF9FTlRSWV9BR0VfTVMgPSAyNCAqIDYwICogNjAgKiAxMDAwOyAvLyAyNCBob3Vyc1xuXG4vKiogU2Vzc2lvbiBkYXRhIHN0b3JlZCBwZXIgUElEIGluIHRoZSByZWdpc3RyeSBmaWxlLiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGF1ZGVTZXNzaW9uRW50cnkge1xuICBjYXJkSWQ/OiBzdHJpbmc7XG4gIHBlbmRpbmdDb21taXRzOiBzdHJpbmdbXTtcbiAgdXBkYXRlZEF0OiBzdHJpbmc7XG59XG5cbi8qKiBKU09OIHBheWxvYWQgc3RvcmVkIGF0IGB+Ly5jYXJkcy9jbGF1ZGUtc2Vzc2lvbnMuanNvbmAuICovXG5leHBvcnQgaW50ZXJmYWNlIENsYXVkZVNlc3Npb25SZWdpc3RyeSB7XG4gIHNlc3Npb25zOiBSZWNvcmQ8c3RyaW5nLCBDbGF1ZGVTZXNzaW9uRW50cnk+O1xufVxuXG4vKiogRXh0ZW5kZWQgc2Vzc2lvbiBlbnRyeSB0aGF0IGluY2x1ZGVzIHNlc3Npb24gSUQuICovXG5leHBvcnQgaW50ZXJmYWNlIFBpZFNlc3Npb25FbnRyeSB7XG4gIHNlc3Npb25JZDogc3RyaW5nO1xuICB1cGRhdGVkQXQ6IHN0cmluZztcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQdWJsaWMgQVBJXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiBBc3NvY2lhdGVzIFBJRCB3aXRoIGNhcmQuIElmIHRoZSBlbnRyeSBhbHJlYWR5IGhhcyBhIGBjYXJkSWRgLCByZXR1cm5zIGBbXWBcbiAqIChmaXJzdC13cml0ZS13aW5zKS4gT3RoZXJ3aXNlIHNldHMgYGNhcmRJZGAsIGV4dHJhY3RzIGFuZCBjbGVhcnNcbiAqIGBwZW5kaW5nQ29tbWl0c2AsIGFuZCByZXR1cm5zIHRoZSBleHRyYWN0ZWQgY29tbWl0cy5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gYXNzb2NpYXRlLlxuICogQHBhcmFtIGNhcmRJZCAtIENhcmQgaWRlbnRpZmllciB0byBiaW5kIHRvIHRoZSBQSUQuXG4gKiBAcmV0dXJucyBQZW5kaW5nIFNIQXMgY2FwdHVyZWQgYmVmb3JlIGFzc29jaWF0aW9uLCBvciBgW11gIG9uIGZpcnN0LXdyaXRlIGNvbmZsaWN0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXNzb2NpYXRlUGlkV2l0aENhcmQocGlkOiBudW1iZXIsIGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICByZXR1cm4gZXhlY3V0ZVRyYW5zYWN0aW9uPENsYXVkZVNlc3Npb25SZWdpc3RyeSwgc3RyaW5nW10+KFxuICAgIGdldFJlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldExvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICBjb25zdCBwaWRTdHIgPSBTdHJpbmcocGlkKTtcbiAgICAgIGNvbnN0IGVudHJ5ID0gcmVnaXN0cnkuc2Vzc2lvbnNbcGlkU3RyXTtcblxuICAgICAgaWYgKGVudHJ5Py5jYXJkSWQpIHJldHVybiBbXTtcblxuICAgICAgY29uc3QgcGVuZGluZ0NvbW1pdHMgPSBlbnRyeT8ucGVuZGluZ0NvbW1pdHMgPz8gW107XG5cbiAgICAgIHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl0gPSB7XG4gICAgICAgIGNhcmRJZCxcbiAgICAgICAgcGVuZGluZ0NvbW1pdHM6IFtdLFxuICAgICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgfTtcblxuICAgICAgcmV0dXJuIHBlbmRpbmdDb21taXRzO1xuICAgIH0sXG4gICAgKHJlZ2lzdHJ5KSA9PiBwcnVuZVN0YWxlRW50cmllcyhyZWdpc3RyeS5zZXNzaW9ucywgaXNQcm9jZXNzQWxpdmUsIE1BWF9FTlRSWV9BR0VfTVMpLFxuICAgIHsgc2Vzc2lvbnM6IHt9IH0gYXMgQ2xhdWRlU2Vzc2lvblJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vKipcbiAqIEFwcGVuZHMgU0hBIHRvIGBwZW5kaW5nQ29tbWl0c2AgZm9yIFBJRCAoZGVkdXBsaWNhdGluZykuIENyZWF0ZXMgdGhlIGVudHJ5XG4gKiBpZiBpdCBkb2VzIG5vdCBleGlzdC5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdGhhdCBwcm9kdWNlZCB0aGUgY29tbWl0LlxuICogQHBhcmFtIHNoYSAtIENvbW1pdCBTSEEgdG8gcmVjb3JkIGZvciBsYXRlciBhdHRyaWJ1dGlvbi5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlY29yZFBlbmRpbmdDb21taXQocGlkOiBudW1iZXIsIHNoYTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGV4ZWN1dGVUcmFuc2FjdGlvbjxDbGF1ZGVTZXNzaW9uUmVnaXN0cnksIHZvaWQ+KFxuICAgIGdldFJlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldExvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICBjb25zdCBwaWRTdHIgPSBTdHJpbmcocGlkKTtcbiAgICAgIGNvbnN0IGVudHJ5ID0gcmVnaXN0cnkuc2Vzc2lvbnNbcGlkU3RyXSA/PyB7XG4gICAgICAgIHBlbmRpbmdDb21taXRzOiBbXSxcbiAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgIH07XG5cbiAgICAgIGlmICghZW50cnkucGVuZGluZ0NvbW1pdHMuaW5jbHVkZXMoc2hhKSkge1xuICAgICAgICBlbnRyeS5wZW5kaW5nQ29tbWl0cy5wdXNoKHNoYSk7XG4gICAgICB9XG5cbiAgICAgIGVudHJ5LnVwZGF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgIHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl0gPSBlbnRyeTtcbiAgICB9LFxuICAgIChyZWdpc3RyeSkgPT4gcHJ1bmVTdGFsZUVudHJpZXMocmVnaXN0cnkuc2Vzc2lvbnMsIGlzUHJvY2Vzc0FsaXZlLCBNQVhfRU5UUllfQUdFX01TKSxcbiAgICB7IHNlc3Npb25zOiB7fSB9IGFzIENsYXVkZVNlc3Npb25SZWdpc3RyeSxcbiAgICBMT0NLX1RJTUVPVVRfTVNcbiAgKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGBjYXJkSWRgIGZvciBQSUQgaWYgaXQgZXhpc3RzLCBudWxsIG90aGVyd2lzZS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gcmVzb2x2ZS5cbiAqIEByZXR1cm5zIEFzc29jaWF0ZWQgY2FyZCBJRCwgb3IgYG51bGxgIHdoZW4gdW5rbm93bi5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFBpZENhcmRJZChwaWQ6IG51bWJlcik6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICByZXR1cm4gZXhlY3V0ZVRyYW5zYWN0aW9uPENsYXVkZVNlc3Npb25SZWdpc3RyeSwgc3RyaW5nIHwgbnVsbD4oXG4gICAgZ2V0UmVnaXN0cnlQYXRoKCksXG4gICAgZ2V0TG9ja1BhdGgoKSxcbiAgICAocmVnaXN0cnkpID0+IHtcbiAgICAgIGNvbnN0IHBpZFN0ciA9IFN0cmluZyhwaWQpO1xuICAgICAgcmV0dXJuIHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl0/LmNhcmRJZCA/PyBudWxsO1xuICAgIH0sXG4gICAgKHJlZ2lzdHJ5KSA9PiBwcnVuZVN0YWxlRW50cmllcyhyZWdpc3RyeS5zZXNzaW9ucywgaXNQcm9jZXNzQWxpdmUsIE1BWF9FTlRSWV9BR0VfTVMpLFxuICAgIHsgc2Vzc2lvbnM6IHt9IH0gYXMgQ2xhdWRlU2Vzc2lvblJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vKipcbiAqIFJlbW92ZXMgYW5kIHJldHVybnMgdGhlIFBJRCdzIGVudHJ5LiBSZXR1cm5zIG51bGwgaWYgbm90IGZvdW5kLlxuICpcbiAqIEBwYXJhbSBwaWQgLSBDbGF1ZGUgcHJvY2VzcyBJRCB0byByZW1vdmUuXG4gKiBAcmV0dXJucyBSZW1vdmVkIHJlZ2lzdHJ5IGVudHJ5LCBvciBgbnVsbGAgd2hlbiBubyBlbnRyeSBleGlzdGVkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlUGlkRW50cnkocGlkOiBudW1iZXIpOiBQcm9taXNlPENsYXVkZVNlc3Npb25FbnRyeSB8IG51bGw+IHtcbiAgcmV0dXJuIGV4ZWN1dGVUcmFuc2FjdGlvbjxDbGF1ZGVTZXNzaW9uUmVnaXN0cnksIENsYXVkZVNlc3Npb25FbnRyeSB8IG51bGw+KFxuICAgIGdldFJlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldExvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICBjb25zdCBwaWRTdHIgPSBTdHJpbmcocGlkKTtcbiAgICAgIGNvbnN0IGVudHJ5ID0gcmVnaXN0cnkuc2Vzc2lvbnNbcGlkU3RyXTtcblxuICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgIGRlbGV0ZSByZWdpc3RyeS5zZXNzaW9uc1twaWRTdHJdO1xuICAgICAgICByZXR1cm4gZW50cnk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgKHJlZ2lzdHJ5KSA9PiBwcnVuZVN0YWxlRW50cmllcyhyZWdpc3RyeS5zZXNzaW9ucywgaXNQcm9jZXNzQWxpdmUsIE1BWF9FTlRSWV9BR0VfTVMpLFxuICAgIHsgc2Vzc2lvbnM6IHt9IH0gYXMgQ2xhdWRlU2Vzc2lvblJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENhcmQtcmVwbyBQSUQgcmVnaXN0cnkgKHBpZHMuanNvbilcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogSlNPTiBwYXlsb2FkIHN0b3JlZCBhdCBgfi8uY2FyZHMvY2FyZC1yZXBvLWNvbW1pdHMvcGlkcy5qc29uYC4gKi9cbmludGVyZmFjZSBDYXJkUmVwb1BpZFJlZ2lzdHJ5IHtcbiAgc2Vzc2lvbnM6IFJlY29yZDxzdHJpbmcsIFBpZFNlc3Npb25FbnRyeT47XG59XG5cbmZ1bmN0aW9uIGdldENhcmRSZXBvUGlkc1JlZ2lzdHJ5UGF0aCgpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihnZXRDYXJkc0RpcigpLCAnY2FyZC1yZXBvLWNvbW1pdHMnLCAncGlkcy5qc29uJyk7XG59XG5cbmZ1bmN0aW9uIGdldENhcmRSZXBvUGlkc0xvY2tQYXRoKCk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGdldENhcmRzRGlyKCksICdjYXJkLXJlcG8tY29tbWl0cycsICdwaWRzLmxvY2snKTtcbn1cblxuLyoqXG4gKiBSZWdpc3RlcnMgYSBzZXNzaW9uIGZvciBhIENsYXVkZSBwcm9jZXNzIElEIGluIHRoZSBjYXJkLXJlcG8gUElEIHJlZ2lzdHJ5LlxuICpcbiAqIEBwYXJhbSBwaWQgLSBDbGF1ZGUgcHJvY2VzcyBJRCB0byByZWdpc3Rlci5cbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIGlkZW50aWZpZXIgdG8gYXNzb2NpYXRlIHdpdGggdGhlIFBJRC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyU2Vzc2lvbihwaWQ6IG51bWJlciwgc2Vzc2lvbklkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgZXhlY3V0ZVRyYW5zYWN0aW9uPENhcmRSZXBvUGlkUmVnaXN0cnksIHZvaWQ+KFxuICAgIGdldENhcmRSZXBvUGlkc1JlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldENhcmRSZXBvUGlkc0xvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICByZWdpc3RyeS5zZXNzaW9uc1tTdHJpbmcocGlkKV0gPSB7XG4gICAgICAgIHNlc3Npb25JZCxcbiAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgIH07XG4gICAgfSxcbiAgICB1bmRlZmluZWQsXG4gICAgeyBzZXNzaW9uczoge30gfSBhcyBDYXJkUmVwb1BpZFJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vKipcbiAqIFJlbW92ZXMgYSBQSUQgZW50cnkgZnJvbSB0aGUgY2FyZC1yZXBvIFBJRCByZWdpc3RyeS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gcmVtb3ZlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlU2Vzc2lvblBpZChwaWQ6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBleGVjdXRlVHJhbnNhY3Rpb248Q2FyZFJlcG9QaWRSZWdpc3RyeSwgdm9pZD4oXG4gICAgZ2V0Q2FyZFJlcG9QaWRzUmVnaXN0cnlQYXRoKCksXG4gICAgZ2V0Q2FyZFJlcG9QaWRzTG9ja1BhdGgoKSxcbiAgICAocmVnaXN0cnkpID0+IHtcbiAgICAgIGRlbGV0ZSByZWdpc3RyeS5zZXNzaW9uc1tTdHJpbmcocGlkKV07XG4gICAgfSxcbiAgICB1bmRlZmluZWQsXG4gICAgeyBzZXNzaW9uczoge30gfSBhcyBDYXJkUmVwb1BpZFJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHNlc3Npb24gSUQgZm9yIGEgQ2xhdWRlIHByb2Nlc3MgSUQuXG4gKlxuICogQHBhcmFtIHBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRvIGxvb2sgdXAuXG4gKiBAcmV0dXJucyBTZXNzaW9uIElELCBvciBgbnVsbGAgd2hlbiB0aGUgZW50cnkgaXMgYWJzZW50LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0U2Vzc2lvbklkRm9yUGlkKHBpZDogbnVtYmVyKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gIGNvbnN0IHJlZ2lzdHJ5UGF0aCA9IGdldENhcmRSZXBvUGlkc1JlZ2lzdHJ5UGF0aCgpO1xuICB0cnkge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZWFkRmlsZShyZWdpc3RyeVBhdGgsICd1dGYtOCcpO1xuICAgIGNvbnN0IHJlZ2lzdHJ5ID0gSlNPTi5wYXJzZShjb250ZW50KSBhcyBDYXJkUmVwb1BpZFJlZ2lzdHJ5O1xuICAgIHJldHVybiByZWdpc3RyeS5zZXNzaW9uc1tTdHJpbmcocGlkKV0/LnNlc3Npb25JZCA/PyBudWxsO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgcmV0dXJuIG51bGw7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cbiIsICIvKipcbiAqIEdlbmVyaWMgc2hhcmVkIGhlbHBlcnMgZm9yIHJlZ2lzdHJ5IGZpbGUgb3BlcmF0aW9ucy5cbiAqXG4gKiBFeHRyYWN0ZWQgZnJvbSBpbmRleC50cyBzbyB0aGF0IG11bHRpcGxlIHJlZ2lzdHJ5IG1vZHVsZXMgY2FuIHJldXNlIHRoZVxuICogc2FtZSBsb2NraW5nLCByZWFkL3dyaXRlLCBhbmQgcHJ1bmluZyBwcmltaXRpdmVzIHdpdGhvdXQgZHVwbGljYXRpb24uXG4gKlxuICogQWxsIGhlbHBlcnMgZm9sbG93IGZhaWwtY2xvc2VkIHNlbWFudGljczogdW5leHBlY3RlZCBlcnJvcnMgcHJvcGFnYXRlXG4gKiByYXRoZXIgdGhhbiBiZWluZyBzaWxlbnRseSBzd2FsbG93ZWQuXG4gKlxuICogQHN1bW1hcnkgR2VuZXJpYyBsb2NraW5nLCByZWFkL3dyaXRlLCBhbmQgcHJ1bmluZyBoZWxwZXJzXG4gKiBAbW9kdWxlIGludGVybmFsXG4gKi9cblxuaW1wb3J0IHsgY2xvc2VTeW5jLCBta2RpclN5bmMsIG9wZW5TeW5jLCByZWFkRmlsZVN5bmMsIHJlbmFtZVN5bmMsIHVubGlua1N5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgaXNQcm9jZXNzQWxpdmUgfSBmcm9tICcuL2lwYy5qcyc7XG5cbmV4cG9ydCB7IGlzUHJvY2Vzc0FsaXZlIH0gZnJvbSAnLi9pcGMuanMnO1xuXG4vKipcbiAqIFJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgYWZ0ZXIgYG1zYCBtaWxsaXNlY29uZHMuXG4gKlxuICogQHBhcmFtIG1zIC0gRHVyYXRpb24gdG8gc2xlZXAgaW4gbWlsbGlzZWNvbmRzLlxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgYWZ0ZXIgdGhlIHNwZWNpZmllZCBkZWxheS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNsZWVwKG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYW4gdW5rbm93biB0aHJvd24gdmFsdWUgaXMgYSBOb2RlLmpzIHN5c3RlbSBlcnJvciB3aXRoIHRoZVxuICogc3BlY2lmaWVkIGBjb2RlYCBwcm9wZXJ0eSAoZS5nLiBgJ0VOT0VOVCdgLCBgJ0VFWElTVCdgKS5cbiAqXG4gKiBAcGFyYW0gZXJyb3IgLSBWYWx1ZSBjYXVnaHQgaW4gYSBgY2F0Y2hgIGJsb2NrLlxuICogQHBhcmFtIGNvZGUgLSBFeHBlY3RlZCBgRXJybm9FeGNlcHRpb24uY29kZWAgc3RyaW5nLlxuICogQHJldHVybnMgYHRydWVgIHdoZW4gdGhlIGVycm9yIG1hdGNoZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNFcnJub0NvZGUoZXJyb3I6IHVua25vd24sIGNvZGU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiAnY29kZScgaW4gZXJyb3IgJiYgKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gY29kZTtcbn1cblxuLyoqXG4gKiBBdHRlbXB0cyB0byByZW1vdmUgYSBzdGFsZSBsb2NrIGZpbGUgbGVmdCBieSBhIGRlYWQgcHJvY2Vzcy5cbiAqXG4gKiBSZWFkcyB0aGUgUElEIGZyb20gdGhlIGxvY2sgZmlsZSwgY2hlY2tzIGxpdmVuZXNzLCBhbmQgdW5saW5rcyB3aGVuIHRoZVxuICogaG9sZGVyIGlzIG5vIGxvbmdlciBydW5uaW5nLiBBIHNlY29uZCByZWFkIGd1YXJkcyBhZ2FpbnN0IFRPQ1RPVSByYWNlcy5cbiAqXG4gKiBAcGFyYW0gbG9ja1BhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBsb2NrIGZpbGUuXG4gKiBAcmV0dXJucyBgdHJ1ZWAgd2hlbiB0aGUgc3RhbGUgbG9jayB3YXMgc3VjY2Vzc2Z1bGx5IHJlbW92ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cnlSZW1vdmVTdGFsZUxvY2sobG9ja1BhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIGNvbnN0IGxvY2tDb250ZW50ID0gcmVhZEZpbGVTeW5jKGxvY2tQYXRoLCAndXRmLTgnKTtcbiAgICBjb25zdCBob2xkZXJQaWQgPSBOdW1iZXIucGFyc2VJbnQobG9ja0NvbnRlbnQudHJpbSgpLCAxMCk7XG5cbiAgICBpZiAoIU51bWJlci5pc05hTihob2xkZXJQaWQpICYmICFpc1Byb2Nlc3NBbGl2ZShob2xkZXJQaWQpKSB7XG4gICAgICAvLyBSZS1yZWFkIGxvY2sgZmlsZSB0byByZWR1Y2UgVE9DVE9VIHJhY2Ugd2luZG93IGJlZm9yZSB1bmxpbmtpbmcuXG4gICAgICBpZiAocmVhZEZpbGVTeW5jKGxvY2tQYXRoLCAndXRmLTgnKSA9PT0gbG9ja0NvbnRlbnQpIHtcbiAgICAgICAgdW5saW5rU3luYyhsb2NrUGF0aCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgdHJ5IHtcbiAgICAgIHVubGlua1N5bmMobG9ja1BhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBFTk9FTlQ6IGxvY2sgYWxyZWFkeSByZW1vdmVkOyBvdGhlciBlcnJvcnM6IGJlc3QtZWZmb3J0IGNsZWFudXBcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGxvY2sgZmlsZSBleGNsdXNpdmVseSBhbmQgd3JpdGVzIHRoZSBjdXJyZW50IFBJRCBpbnRvIGl0LlxuICpcbiAqIFVzZXMgYE9fV1JPTkxZIHwgT19DUkVBVCB8IE9fRVhDTGAgKGAnd3gnYCkgc28gdGhlIGNhbGwgZmFpbHMgd2l0aFxuICogYEVFWElTVGAgd2hlbiBhbm90aGVyIHByb2Nlc3MgYWxyZWFkeSBob2xkcyB0aGUgbG9jay5cbiAqXG4gKiBAcGFyYW0gbG9ja1BhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBsb2NrIGZpbGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUxvY2tIb2xkZXJQaWQobG9ja1BhdGg6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBmZCA9IG9wZW5TeW5jKGxvY2tQYXRoLCAnd3gnLCAwbzYwMCk7XG4gIHRyeSB7XG4gICAgd3JpdGVGaWxlU3luYyhmZCwgU3RyaW5nKHByb2Nlc3MucGlkKSk7XG4gIH0gZmluYWxseSB7XG4gICAgY2xvc2VTeW5jKGZkKTtcbiAgfVxufVxuXG4vKipcbiAqIEFjcXVpcmVzIGFuIGFkdmlzb3J5IGZpbGUgbG9jaywgcmV0cnlpbmcgdW50aWwgc3VjY2VzcyBvciB0aW1lb3V0LlxuICpcbiAqICoqRmFpbC1jbG9zZWQqKjogdGhyb3dzIG9uIHRpbWVvdXQgaW5zdGVhZCBvZiByZXR1cm5pbmcgYSBib29sZWFuLlxuICpcbiAqIEBwYXJhbSBsb2NrUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGxvY2sgZmlsZS5cbiAqIEBwYXJhbSB0aW1lb3V0TXMgLSBNYXhpbXVtIHdhaXQgdGltZSBpbiBtaWxsaXNlY29uZHMuXG4gKiBAdGhyb3dzIHtFcnJvcn0gYCdMb2NrIGFjcXVpc2l0aW9uIHRpbWVvdXQnYCB3aGVuIHRoZSBsb2NrIGNhbm5vdCBiZVxuICogICBhY3F1aXJlZCB3aXRoaW4gYHRpbWVvdXRNc2AuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhY3F1aXJlTG9jayhsb2NrUGF0aDogc3RyaW5nLCB0aW1lb3V0TXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICBjb25zdCBkaXIgPSBkaXJuYW1lKGxvY2tQYXRoKTtcblxuICB3aGlsZSAoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSA8IHRpbWVvdXRNcykge1xuICAgIHRyeSB7XG4gICAgICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgbW9kZTogMG83MDAgfSk7XG4gICAgICB3cml0ZUxvY2tIb2xkZXJQaWQobG9ja1BhdGgpO1xuICAgICAgcmV0dXJuOyAvLyBzdWNjZXNzXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGlmICghaGFzRXJybm9Db2RlKGVycm9yLCAnRUVYSVNUJykpIHRocm93IGVycm9yO1xuICAgICAgaWYgKHRyeVJlbW92ZVN0YWxlTG9jayhsb2NrUGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCByZW1haW5pbmcgPSB0aW1lb3V0TXMgLSAoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSk7XG4gICAgICBpZiAocmVtYWluaW5nID4gMCkge1xuICAgICAgICBhd2FpdCBzbGVlcChNYXRoLm1pbig1MCwgcmVtYWluaW5nKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKCdMb2NrIGFjcXVpc2l0aW9uIHRpbWVvdXQnKTtcbn1cblxuLyoqXG4gKiBSZWxlYXNlcyBhbiBhZHZpc29yeSBmaWxlIGxvY2sgYnkgdW5saW5raW5nIHRoZSBsb2NrIGZpbGUuXG4gKlxuICogYEVOT0VOVGAgaXMgc2lsZW50bHkgaWdub3JlZCAodGhlIGxvY2sgd2FzIGFscmVhZHkgcmVsZWFzZWQpOyBhbGwgb3RoZXJcbiAqIGVycm9ycyBwcm9wYWdhdGUuXG4gKlxuICogQHBhcmFtIGxvY2tQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgbG9jayBmaWxlLlxuICogQHRocm93cyB7Tm9kZUpTLkVycm5vRXhjZXB0aW9ufSBXaGVuIHRoZSB1bmxpbmsgZmFpbHMgZm9yIHJlYXNvbnMgb3RoZXIgdGhhbiBgRU5PRU5UYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbGVhc2VMb2NrKGxvY2tQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICB1bmxpbmtTeW5jKGxvY2tQYXRoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoIWhhc0Vycm5vQ29kZShlcnJvciwgJ0VOT0VOVCcpKSB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgc3RhbGUgZW50cmllcyBmcm9tIGEgUElELWtleWVkIHJlZ2lzdHJ5IG9iamVjdC5cbiAqXG4gKiBBbiBlbnRyeSBpcyBjb25zaWRlcmVkIHN0YWxlIHdoZW46XG4gKiAxLiBJdHMga2V5IGlzIG5vdCBhIHZhbGlkIGludGVnZXIgUElELlxuICogMi4gSXRzIGB1cGRhdGVkQXRgIHRpbWVzdGFtcCBpcyBvbGRlciB0aGFuIGBtYXhBZ2VNc2AuXG4gKiAzLiBUaGUgcHJvY2VzcyBpZGVudGlmaWVkIGJ5IGl0cyBrZXkgaXMgbm8gbG9uZ2VyIGFsaXZlLlxuICpcbiAqIEBwYXJhbSByZWdpc3RyeSAtIE11dGFibGUgUElELWtleWVkIHJlY29yZCB0byBwcnVuZSBpbiBwbGFjZS5cbiAqIEBwYXJhbSBpc0FsaXZlIC0gTGl2ZW5lc3MgY2hlY2sgZnVuY3Rpb24gKHR5cGljYWxseSB7QGxpbmsgaXNQcm9jZXNzQWxpdmV9KS5cbiAqIEBwYXJhbSBtYXhBZ2VNcyAtIE1heGltdW0gZW50cnkgYWdlIGluIG1pbGxpc2Vjb25kcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBydW5lU3RhbGVFbnRyaWVzPFQgZXh0ZW5kcyB7IHVwZGF0ZWRBdDogc3RyaW5nIH0+KFxuICByZWdpc3RyeTogUmVjb3JkPHN0cmluZywgVD4sXG4gIGlzQWxpdmU6IChwaWQ6IG51bWJlcikgPT4gYm9vbGVhbixcbiAgbWF4QWdlTXM6IG51bWJlclxuKTogdm9pZCB7XG4gIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG5cbiAgZm9yIChjb25zdCBbcGlkU3RyLCBlbnRyeV0gb2YgT2JqZWN0LmVudHJpZXMocmVnaXN0cnkpKSB7XG4gICAgY29uc3QgcGlkID0gTnVtYmVyLnBhcnNlSW50KHBpZFN0ciwgMTApO1xuXG4gICAgaWYgKE51bWJlci5pc05hTihwaWQpKSB7XG4gICAgICBkZWxldGUgcmVnaXN0cnlbcGlkU3RyXTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB1cGRhdGVkQXQgPSBuZXcgRGF0ZShlbnRyeS51cGRhdGVkQXQpLmdldFRpbWUoKTtcbiAgICAgIGlmIChub3cgLSB1cGRhdGVkQXQgPiBtYXhBZ2VNcykge1xuICAgICAgICBkZWxldGUgcmVnaXN0cnlbcGlkU3RyXTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICBkZWxldGUgcmVnaXN0cnlbcGlkU3RyXTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBpZiAoIWlzQWxpdmUocGlkKSkge1xuICAgICAgICBkZWxldGUgcmVnaXN0cnlbcGlkU3RyXTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIGlzUHJvY2Vzc0FsaXZlIHRocm93cyBvbiB1bmV4cGVjdGVkIGVycm9ycyAtIGtlZXAgZW50cnlcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcGFyc2VzIGEgSlNPTiByZWdpc3RyeSBmaWxlLlxuICpcbiAqICoqRmFpbC1jbG9zZWQqKjogcmV0dXJucyBgZGVmYXVsdFZhbHVlYCBvbmx5IHdoZW4gdGhlIGZpbGUgZG9lcyBub3QgZXhpc3RcbiAqIChgRU5PRU5UYCkuIFBhcnNlIGVycm9ycyBhbmQgb3RoZXIgSS9PIGZhaWx1cmVzIHByb3BhZ2F0ZSBhcyBleGNlcHRpb25zLlxuICpcbiAqIEBwYXJhbSBwYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgcmVnaXN0cnkgSlNPTiBmaWxlLlxuICogQHBhcmFtIGRlZmF1bHRWYWx1ZSAtIFZhbHVlIHJldHVybmVkIHdoZW4gdGhlIGZpbGUgZG9lcyBub3QgZXhpc3QuXG4gKiBAcmV0dXJucyBQYXJzZWQgcmVnaXN0cnkgY29udGVudHMsIG9yIGBkZWZhdWx0VmFsdWVgIG9uIGBFTk9FTlRgLlxuICogQHRocm93cyB7U3ludGF4RXJyb3J9IFdoZW4gdGhlIGZpbGUgY29udGFpbnMgaW52YWxpZCBKU09OLlxuICogQHRocm93cyB7Tm9kZUpTLkVycm5vRXhjZXB0aW9ufSBPbiBJL08gZXJyb3JzIG90aGVyIHRoYW4gYEVOT0VOVGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkUmVnaXN0cnk8VD4ocGF0aDogc3RyaW5nLCBkZWZhdWx0VmFsdWU6IFQpOiBUIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKHBhdGgsICd1dGYtOCcpO1xuICAgIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpIGFzIFQ7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGhhc0Vycm5vQ29kZShlcnJvciwgJ0VOT0VOVCcpKSByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIHRocm93IGVycm9yOyAvLyBGQUlMLUNMT1NFRDogdGhyb3cgb24gcGFyc2UgZXJyb3JzXG4gIH1cbn1cblxuLyoqXG4gKiBBdG9taWNhbGx5IHdyaXRlcyBhIHJlZ2lzdHJ5IG9iamVjdCBhcyBwcmV0dHktcHJpbnRlZCBKU09OLlxuICpcbiAqIFdyaXRlcyB0byBhIHRlbXBvcmFyeSBgLnRtcGAgc2libGluZyBmaXJzdCwgdGhlbiByZW5hbWVzIGludG8gcGxhY2Ugc29cbiAqIHJlYWRlcnMgbmV2ZXIgb2JzZXJ2ZSBhIHBhcnRpYWxseS13cml0dGVuIGZpbGUuXG4gKlxuICogQHBhcmFtIHJlZ2lzdHJ5IC0gT2JqZWN0IHRvIHNlcmlhbGl6ZS5cbiAqIEBwYXJhbSByZWdpc3RyeVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSB0YXJnZXQgcmVnaXN0cnkgZmlsZS5cbiAqIEB0aHJvd3Mge05vZGVKUy5FcnJub0V4Y2VwdGlvbn0gT24gZmlsZXN5c3RlbSB3cml0ZSBvciByZW5hbWUgZmFpbHVyZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVJlZ2lzdHJ5TG9ja2VkPFQ+KHJlZ2lzdHJ5OiBULCByZWdpc3RyeVBhdGg6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBkaXIgPSBkaXJuYW1lKHJlZ2lzdHJ5UGF0aCk7XG4gIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlLCBtb2RlOiAwbzcwMCB9KTtcbiAgY29uc3QgdGVtcFBhdGggPSBgJHtyZWdpc3RyeVBhdGh9LnRtcGA7XG4gIHRyeSB7XG4gICAgd3JpdGVGaWxlU3luYyh0ZW1wUGF0aCwgSlNPTi5zdHJpbmdpZnkocmVnaXN0cnksIG51bGwsIDIpLCB7IG1vZGU6IDBvNjAwIH0pO1xuICAgIHJlbmFtZVN5bmModGVtcFBhdGgsIHJlZ2lzdHJ5UGF0aCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdHJ5IHtcbiAgICAgIHVubGlua1N5bmModGVtcFBhdGgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLyogY2xlYW51cCBiZXN0LWVmZm9ydCAqL1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgcmVhZC1tb2RpZnktd3JpdGUgdHJhbnNhY3Rpb24gdW5kZXIgYW4gYWR2aXNvcnkgZmlsZSBsb2NrLlxuICpcbiAqIDEuIEFjcXVpcmVzIGxvY2suXG4gKiAyLiBSZWFkcyByZWdpc3RyeSAob3IgdXNlcyBgZGVmYXVsdFJlZ2lzdHJ5YCBpZiBmaWxlIGFic2VudCkuXG4gKiAzLiBPcHRpb25hbGx5IHBydW5lcyBzdGFsZSBlbnRyaWVzLlxuICogNC4gQ2FsbHMgYG9wZXJhdGlvbmAgd2l0aCB0aGUgbXV0YWJsZSByZWdpc3RyeS5cbiAqIDUuIFdyaXRlcyB0aGUgcmVnaXN0cnkgYmFjay5cbiAqIDYuIFJlbGVhc2VzIGxvY2sgKGd1YXJhbnRlZWQgdmlhIGBmaW5hbGx5YCkuXG4gKlxuICogQHBhcmFtIHJlZ2lzdHJ5UGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIHJlZ2lzdHJ5IEpTT04gZmlsZS5cbiAqIEBwYXJhbSBsb2NrUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGxvY2sgZmlsZS5cbiAqIEBwYXJhbSBvcGVyYXRpb24gLSBDYWxsYmFjayB0aGF0IG11dGF0ZXMgdGhlIHJlZ2lzdHJ5IGFuZCByZXR1cm5zIGEgcmVzdWx0LlxuICogQHBhcmFtIHBydW5lciAtIE9wdGlvbmFsIGNhbGxiYWNrIHRvIHBydW5lIHN0YWxlIGVudHJpZXMgYmVmb3JlIHRoZSBvcGVyYXRpb24uXG4gKiBAcGFyYW0gZGVmYXVsdFJlZ2lzdHJ5IC0gRGVmYXVsdCB2YWx1ZSB3aGVuIHRoZSByZWdpc3RyeSBmaWxlIGRvZXMgbm90IGV4aXN0LlxuICogQHBhcmFtIGxvY2tUaW1lb3V0TXMgLSBMb2NrIGFjcXVpc2l0aW9uIHRpbWVvdXQgKGRlZmF1bHQgMjAwMCBtcykuXG4gKiBAcmV0dXJucyBUaGUgdmFsdWUgcmV0dXJuZWQgYnkgYG9wZXJhdGlvbmAuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlVHJhbnNhY3Rpb248VFJlZ2lzdHJ5LCBUUmVzdWx0PihcbiAgcmVnaXN0cnlQYXRoOiBzdHJpbmcsXG4gIGxvY2tQYXRoOiBzdHJpbmcsXG4gIG9wZXJhdGlvbjogKHJlZ2lzdHJ5OiBUUmVnaXN0cnkpID0+IFRSZXN1bHQsXG4gIHBydW5lcj86IChyZWdpc3RyeTogVFJlZ2lzdHJ5KSA9PiB2b2lkLFxuICBkZWZhdWx0UmVnaXN0cnk/OiBUUmVnaXN0cnksXG4gIGxvY2tUaW1lb3V0TXM/OiBudW1iZXJcbik6IFByb21pc2U8VFJlc3VsdD4ge1xuICBhd2FpdCBhY3F1aXJlTG9jayhsb2NrUGF0aCwgbG9ja1RpbWVvdXRNcyA/PyAyMDAwKTtcbiAgdHJ5IHtcbiAgICBjb25zdCByZWdpc3RyeSA9IHJlYWRSZWdpc3RyeTxUUmVnaXN0cnk+KHJlZ2lzdHJ5UGF0aCwgZGVmYXVsdFJlZ2lzdHJ5IGFzIFRSZWdpc3RyeSk7XG4gICAgaWYgKHBydW5lcikgcHJ1bmVyKHJlZ2lzdHJ5KTtcbiAgICBjb25zdCByZXN1bHQgPSBvcGVyYXRpb24ocmVnaXN0cnkpO1xuICAgIHdyaXRlUmVnaXN0cnlMb2NrZWQocmVnaXN0cnksIHJlZ2lzdHJ5UGF0aCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSBmaW5hbGx5IHtcbiAgICByZWxlYXNlTG9jayhsb2NrUGF0aCk7XG4gIH1cbn1cbiIsICIvKipcbiAqIFByb2Nlc3MtbGV2ZWwgaGVscGVycyBmb3IgY2hlY2tpbmcgcHJvY2VzcyBsaXZlbmVzcy5cbiAqXG4gKlxuICogQHN1bW1hcnkgUHJvY2Vzcy1sZXZlbCBoZWxwZXJzIGZvciBjaGVja2luZyBwcm9jZXNzIGxpdmVuZXNzXG4gKiBAbW9kdWxlIGlwY1xuICovXG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgcHJvY2VzcyBpcyBhbGl2ZSB1c2luZyBga2lsbChwaWQsIDApYC5cbiAqXG4gKiBTaWduYWwgMCBpcyBhIG5vLW9wIHByb2JlOiBubyBzaWduYWwgaXMgZGVsaXZlcmVkLCBidXQgdGhlIGtlcm5lbCBzdGlsbFxuICogdmFsaWRhdGVzIHRoYXQgdGhlIHRhcmdldCBQSUQgZXhpc3RzLiBgRVBFUk1gIGlzIHRyZWF0ZWQgYXMgXCJhbGl2ZVwiXG4gKiBiZWNhdXNlIHRoZSBwcm9jZXNzIGV4aXN0cyBidXQgaXMgb3duZWQgYnkgYW5vdGhlciB1c2VyLlxuICpcbiAqIEBwYXJhbSBwaWQgLSBQSUQgdG8gcHJvYmUuIENhbGxlcnMgdXN1YWxseSBwYXNzIGEgdmFsdWUgcHJldmlvdXNseSByZWNvcmRlZFxuICogICBpbiB0aGUgc2Vzc2lvbiByZWdpc3RyeS5cbiAqIEByZXR1cm5zIGB0cnVlYCB3aGVuIHRoZSBQSUQgc3RpbGwgZXhpc3RzLiBgRVBFUk1gIGlzIHRyZWF0ZWQgYXMgYWxpdmVcbiAqICAgYmVjYXVzZSBwZXJtaXNzaW9uIGZhaWx1cmVzIHN0aWxsIG1lYW4gdGhlIHByb2Nlc3MgaXMgcHJlc2VudC5cbiAqIEB0aHJvd3MgUmV0aHJvd3MgdW5leHBlY3RlZCBgcHJvY2Vzcy5raWxsYCBmYWlsdXJlcyBzbyBjYWxsZXJzIGNhbiBmYWlsIGNsb3NlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUHJvY2Vzc0FsaXZlKHBpZDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgcHJvY2Vzcy5raWxsKHBpZCwgMCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgJ2NvZGUnIGluIGVycm9yKSB7XG4gICAgICBjb25zdCBjb2RlID0gKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZTtcbiAgICAgIGlmIChjb2RlID09PSAnRVNSQ0gnKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VQRVJNJykgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG4iLCAiLyoqXG4gKiBQcm9jZXNzIHRyZWUgdXRpbGl0aWVzIGZvciBsb2NhdGluZyBDbGF1ZGUgQ29kZSBhbmNlc3RvciBwcm9jZXNzZXMuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFByb2Nlc3MgdHJlZSB1dGlsaXRpZXMgZm9yIGxvY2F0aW5nIENsYXVkZSBDb2RlIGFuY2VzdG9yIHByb2Nlc3Nlc1xuICogQG1vZHVsZSBsaWIvcHJvY2Vzcy10cmVlXG4gKi9cblxuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuXG4vKiogTWF4aW11bSBkZXB0aCB0byB3YWxrIHVwIHRoZSBwcm9jZXNzIHRyZWUuICovXG5leHBvcnQgY29uc3QgUFJPQ0VTU19UUkVFX01BWF9ERVBUSCA9IDEwO1xuXG4vKipcbiAqIFBhdHRlcm4gbWF0Y2hpbmcgYGNsYXVkZWAgYXMgYSBwYXRoIGNvbXBvbmVudCBpbiBgcHMgLW8gYXJncz1gIG91dHB1dC5cbiAqXG4gKiBNYXRjaGVzIGBjbGF1ZGVgIHdoZW4gcHJlY2VkZWQgYnkgc3RhcnQtb2Ytc3RyaW5nLCB3aGl0ZXNwYWNlLCBvciBgL2BcbiAqIChwYXRoIHNlcGFyYXRvcikgQU5EIGZvbGxvd2VkIGJ5IGAvYCwgd2hpdGVzcGFjZSwgb3IgZW5kLW9mLXN0cmluZy5cbiAqXG4gKiBUaGlzIGF2b2lkcyBmYWxzZSBwb3NpdGl2ZXMgb24gYC5jbGF1ZGUvYCBkaXJlY3RvcnkgcGF0aHMgaW4gYXJndW1lbnRzXG4gKiBsaWtlIGAvaG9tZS9ub2RlLy5jbGF1ZGUvc2hlbGwtc25hcHNob3RzLy4uLmAgYmVjYXVzZSB0aGUgYC5gIGJldHdlZW5cbiAqIHRoZSBgL2AgYW5kIGBjbGF1ZGVgIHByZXZlbnRzIHRoZSBsb29rYmVoaW5kIGZyb20gbWF0Y2hpbmcuXG4gKlxuICogVGhlIHRyYWlsaW5nIGAvYCBhbHRlcm5hdGl2ZSBoYW5kbGVzIHZlcnNpb25lZCBleGVjdXRhYmxlcyB3aGVyZSB0aGUgcGF0aFxuICogY29udGFpbnMgYC9jbGF1ZGUvdmVyc2lvbnMvWC5ZLlpgIFx1MjAxNCBgY2xhdWRlYCBpcyBhIGRpcmVjdG9yeSBjb21wb25lbnQsXG4gKiBub3QgdGhlIHRlcm1pbmFsIGNvbW1hbmQgbmFtZS5cbiAqL1xuY29uc3QgQ0xBVURFX0FSR1NfUEFUVEVSTiA9IC8oXnxcXHN8XFwvKWNsYXVkZShcXC98XFxzfCQpL2k7XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBnaXZlbiBQSUQgYmVsb25ncyB0byBhIENsYXVkZSBwcm9jZXNzLlxuICpcbiAqIFVzZXMgYHBzIC1wIFBJRCAtbyBhcmdzPWAgdG8gZ2V0IHRoZSBmdWxsIGNvbW1hbmQgbGluZSwgdGhlbiB0ZXN0c1xuICogd2hldGhlciBgY2xhdWRlYCBhcHBlYXJzIGFzIGEgcGF0aCBjb21wb25lbnQgb3IgY29tbWFuZCBuYW1lLlxuICogVGhpcyBtYXRjaGVzIGJvdGggdGhlIGBjbGF1ZGVgIGJpbmFyeSBhbmQgdmVyc2lvbmVkIGV4ZWN1dGFibGVzXG4gKiAoZS5nLiBgfi8ubG9jYWwvc2hhcmUvY2xhdWRlL3ZlcnNpb25zLzIuMS41MWApLlxuICpcbiAqIEBwYXJhbSBwaWQgLSBQcm9jZXNzIElEIHRvIGluc3BlY3QuXG4gKiBAcmV0dXJucyBgdHJ1ZWAgd2hlbiB0aGUgcHJvY2VzcyBhcmdzIG1hdGNoIENsYXVkZTsgb3RoZXJ3aXNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzQ2xhdWRlKHBpZDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgY29uc3QgYXJncyA9IGV4ZWNTeW5jKGBwcyAtcCAke3BpZH0gLW8gYXJncz1gLCB7IGVuY29kaW5nOiAndXRmOCcgfSkudHJpbSgpO1xuICAgIHJldHVybiBDTEFVREVfQVJHU19QQVRURVJOLnRlc3QoYXJncyk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHBhcmVudCBQSUQgZm9yIGEgcHJvY2Vzcywgb3IgYG51bGxgIHdoZW4gdHJhdmVyc2FsIHNob3VsZCBzdG9wLlxuICpcbiAqIGBudWxsYCBpcyByZXR1cm5lZCBmb3IgbWlzc2luZyBwcm9jZXNzZXMsIG1hbGZvcm1lZCBgcHNgIG91dHB1dCwgYW5kXG4gKiBzZWxmLXBhcmVudGluZyB2YWx1ZXMgdGhhdCB3b3VsZCBvdGhlcndpc2UgY3JlYXRlIGEgbG9vcC5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gUHJvY2VzcyBJRCB3aG9zZSBwYXJlbnQgc2hvdWxkIGJlIHF1ZXJpZWQuXG4gKiBAcmV0dXJucyBQYXJlbnQgUElEIHdoZW4gYXZhaWxhYmxlLCBvdGhlcndpc2UgYG51bGxgLlxuICovXG5mdW5jdGlvbiBnZXRQYXJlbnRQaWQocGlkOiBudW1iZXIpOiBudW1iZXIgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBwcGlkU3RyID0gZXhlY1N5bmMoYHBzIC1wICR7cGlkfSAtbyBwcGlkPWAsIHsgZW5jb2Rpbmc6ICd1dGY4JyB9KS50cmltKCk7XG4gICAgY29uc3QgcGFyZW50UGlkID0gTnVtYmVyLnBhcnNlSW50KHBwaWRTdHIsIDEwKTtcbiAgICBpZiAoTnVtYmVyLmlzTmFOKHBhcmVudFBpZCkgfHwgcGFyZW50UGlkID09PSBwaWQpIHJldHVybiBudWxsO1xuICAgIHJldHVybiBwYXJlbnRQaWQ7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogV2Fsa3MgdGhlIHByb2Nlc3MgdHJlZSB1cHdhcmQgZnJvbSBgc3RhcnRQaWRgIChkZWZhdWx0OiBgcHJvY2Vzcy5wcGlkYClcbiAqIGxvb2tpbmcgZm9yIHRoZSBuZWFyZXN0IGFuY2VzdG9yIG5hbWVkIFwiY2xhdWRlXCIuXG4gKlxuICogQHBhcmFtIHN0YXJ0UGlkIC0gT3B0aW9uYWwgcm9vdCBQSUQgZm9yIHRyYXZlcnNhbC4gV2hlbiBvbWl0dGVkLCB0cmF2ZXJzYWxcbiAqICAgc3RhcnRzIGF0IHRoZSBwYXJlbnQgb2YgdGhlIGN1cnJlbnQgaG9vayBwcm9jZXNzLlxuICogQHJldHVybnMgVGhlIG5lYXJlc3QgbWF0Y2hpbmcgQ2xhdWRlIGFuY2VzdG9yIFBJRCwgb3IgYG51bGxgIHdoZW4gbm8gbWF0Y2hcbiAqICAgaXMgZm91bmQgd2l0aGluIHtAbGluayBQUk9DRVNTX1RSRUVfTUFYX0RFUFRIfS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRDbGF1ZGVQaWQoc3RhcnRQaWQ/OiBudW1iZXIpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3QgcGlkcyA9IGZpbmRBbGxDbGF1ZGVQaWRzKHN0YXJ0UGlkKTtcbiAgcmV0dXJuIHBpZHNbMF0gPz8gbnVsbDtcbn1cblxuLyoqXG4gKiBXYWxrcyB0aGUgcHJvY2VzcyB0cmVlIHVwd2FyZCBmcm9tIGBzdGFydFBpZGAgKGRlZmF1bHQ6IGBwcm9jZXNzLnBwaWRgKSBhbmRcbiAqIHJldHVybnMgKiphbGwqKiBQSURzIG5hbWVkIFwiY2xhdWRlXCIsIG9yZGVyZWQgbmVhcmVzdC1maXJzdC5cbiAqXG4gKiBVc2VmdWwgd2hlbiBtdWx0aXBsZSBDbGF1ZGUgc2Vzc2lvbnMgYXJlIG5lc3RlZCAoZS5nLiBhIFRhc2sgc3ViYWdlbnRcbiAqIHNwYXduZWQgYnkgYW4gb3V0ZXIgQ2xhdWRlKSBhbmQgdGhlIGNvcnJlY3QgY2FyZCBhc3NvY2lhdGlvbiBtYXkgYmVsb25nXG4gKiB0byBhbiBhbmNlc3RvciBmdXJ0aGVyIHVwIHRoZSB0cmVlLlxuICogSWYgQ2xhdWRlIGxhdW5jaGVkIENsYXVkZSB3aGljaCBsYXVuY2hlZCBDbGF1ZGUsIHRoaXMgcmV0dXJucyB0aGF0IGJyZWFkY3J1bWJcbiAqIHRyYWlsIG5lYXJlc3QtZmlyc3QuXG4gKlxuICogQHBhcmFtIHN0YXJ0UGlkIC0gT3B0aW9uYWwgcm9vdCBQSUQgZm9yIHRyYXZlcnNhbC4gV2hlbiBvbWl0dGVkLCB0cmF2ZXJzYWxcbiAqICAgc3RhcnRzIGF0IHRoZSBwYXJlbnQgb2YgdGhlIGN1cnJlbnQgaG9vayBwcm9jZXNzLlxuICogQHJldHVybnMgQWxsIG1hdGNoaW5nIENsYXVkZSBhbmNlc3RvciBQSURzIGRpc2NvdmVyZWQgYmVmb3JlIHRyYXZlcnNhbCBzdG9wcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxDbGF1ZGVQaWRzKHN0YXJ0UGlkPzogbnVtYmVyKTogbnVtYmVyW10ge1xuICBjb25zdCByZXN1bHRzOiBudW1iZXJbXSA9IFtdO1xuICBsZXQgcGlkID0gc3RhcnRQaWQgPz8gcHJvY2Vzcy5wcGlkO1xuXG4gIGZvciAobGV0IGRlcHRoID0gMDsgZGVwdGggPCBQUk9DRVNTX1RSRUVfTUFYX0RFUFRIOyBkZXB0aCsrKSB7XG4gICAgaWYgKHBpZCA8PSAxKSBicmVhaztcblxuICAgIGlmIChpc0NsYXVkZShwaWQpKSB7XG4gICAgICByZXN1bHRzLnB1c2gocGlkKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJlbnRQaWQgPSBnZXRQYXJlbnRQaWQocGlkKTtcbiAgICBpZiAocGFyZW50UGlkID09PSBudWxsKSBicmVhaztcbiAgICBwaWQgPSBwYXJlbnRQaWQ7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cbiIsICIvKipcbiAqIFBlci1zZXNzaW9uIGZpbGUgb3BlcmF0aW9ucyBmb3IgY2FyZC1yZXBvIGNvbW1pdCBhdHRyaWJ1dGlvbi5cbiAqXG4gKiBNYW5hZ2VzIHBlci1zZXNzaW9uIENTViBmaWxlcywgLmhlYWQgZmlsZXMsIGFuZCBkaXJlY3Rvcnkgc2V0dXAgdW5kZXJcbiAqIGB+Ly5jYXJkcy9jYXJkLXJlcG8tY29tbWl0cy9gLiBFYWNoIHNlc3Npb24gZ2V0cyBpdHMgb3duIENTViBmaWxlIGZvclxuICogY29tbWl0IFNIQXMgYW5kIGEgLmhlYWQgZmlsZSB0cmFja2luZyB0aGUgSEVBRCBTSEEgYXQgc2Vzc2lvbiBzdGFydC5cbiAqXG4gKiBEZXNpZ24gaW52YXJpYW50czpcbiAqIC0gKipGYWlsLWNsb3NlZCoqOiB1bmV4cGVjdGVkIGVycm9ycyBwcm9wYWdhdGU7IG9ubHkgYEVOT0VOVGAgaXMgc2lsZW50bHkgaGFuZGxlZC5cbiAqIC0gKipQZXItc2Vzc2lvbiBsb2NraW5nKio6IENTViBhcHBlbmRzIGFjcXVpcmUgYSBwZXItc2Vzc2lvbiBsb2NrIHRvIHByZXZlbnRcbiAqICAgZHVwbGljYXRlIHdyaXRlcyB1bmRlciBjb25jdXJyZW50IGFjY2Vzcy5cbiAqIC0gKipEZWR1cGxpY2F0aW9uKio6IFNIQXMgYXJlIGRlZHVwbGljYXRlZCBiZWZvcmUgYXBwZW5kaW5nLlxuICpcbiAqIEBzdW1tYXJ5IFBlci1zZXNzaW9uIENTViBhbmQgLmhlYWQgZmlsZSBvcGVyYXRpb25zIGZvciBjYXJkLXJlcG8gY29tbWl0IGF0dHJpYnV0aW9uXG4gKiBAbW9kdWxlIGNhcmQtcmVwb1xuICovXG5cbmltcG9ydCB7IGFwcGVuZEZpbGVTeW5jLCBta2RpclN5bmMsIHJlYWRGaWxlU3luYywgdW5saW5rU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgaG9tZWRpciB9IGZyb20gJ25vZGU6b3MnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBhY3F1aXJlTG9jaywgaGFzRXJybm9Db2RlLCByZWxlYXNlTG9jayB9IGZyb20gJy4vaW50ZXJuYWwuanMnO1xuXG5jb25zdCBMT0NLX1RJTUVPVVRfTVMgPSAyMDAwO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEludGVybmFsIHBhdGggaGVscGVyc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIGdldENhcmRSZXBvQ29tbWl0c0RpcigpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihob21lZGlyKCksICcuY2FyZHMnLCAnY2FyZC1yZXBvLWNvbW1pdHMnKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2Vzc2lvbkNzdlBhdGgoc2Vzc2lvbklkOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihnZXRDYXJkUmVwb0NvbW1pdHNEaXIoKSwgYCR7c2Vzc2lvbklkfS5jc3ZgKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2Vzc2lvbkNzdkxvY2tQYXRoKHNlc3Npb25JZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oZ2V0Q2FyZFJlcG9Db21taXRzRGlyKCksIGAke3Nlc3Npb25JZH0uY3N2LmxvY2tgKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2Vzc2lvbkhlYWRTaGFQYXRoKHNlc3Npb25JZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oZ2V0Q2FyZFJlcG9Db21taXRzRGlyKCksIGAke3Nlc3Npb25JZH0uaGVhZGApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFB1YmxpYyBBUElcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKipcbiAqIEFwcGVuZHMgYSBjb21taXQgU0hBIHRvIHRoZSBzZXNzaW9uJ3MgQ1NWIGZpbGUuIERlZHVwbGljYXRlcyBTSEFzLlxuICogQ3JlYXRlcyBkaXJlY3RvcnkgYW5kIENTViBmaWxlIGlmIHRoZXkgZG9uJ3QgZXhpc3QuXG4gKlxuICogRGVkdXBsaWNhdGlvbiBpcyByZWFkLWJlZm9yZS1hcHBlbmQgdW5kZXIgYSBwZXItc2Vzc2lvbiBsb2NrLCBzbyBjb25jdXJyZW50XG4gKiB3cml0ZXJzIGRvIG5vdCBwcm9kdWNlIGR1cGxpY2F0ZSBsaW5lcyBmb3IgdGhlIHNhbWUgU0hBLlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIHdob3NlIGNvbW1pdCBidWZmZXIgc2hvdWxkIGJlIHVwZGF0ZWQuXG4gKiBAcGFyYW0gc2hhIC0gRnVsbCBjb21taXQgU0hBIHRvIGFwcGVuZC5cbiAqIEByZXR1cm5zIFJlc29sdmVzIG9uY2UgdGhlIFNIQSBpcyBwZXJzaXN0ZWQgb3Igc2tpcHBlZCBhcyBkdXBsaWNhdGUuXG4gKiBAdGhyb3dzIEVycm9yIG9uIGxvY2sgYWNxdWlzaXRpb24sIHJlYWQsIG9yIGFwcGVuZCBmYWlsdXJlcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcGVuZENvbW1pdFRvU2Vzc2lvbihzZXNzaW9uSWQ6IHN0cmluZywgc2hhOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgbWtkaXJTeW5jKGdldENhcmRSZXBvQ29tbWl0c0RpcigpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgbW9kZTogMG83MDAgfSk7XG5cbiAgY29uc3QgY3N2TG9ja1BhdGggPSBnZXRTZXNzaW9uQ3N2TG9ja1BhdGgoc2Vzc2lvbklkKTtcbiAgYXdhaXQgYWNxdWlyZUxvY2soY3N2TG9ja1BhdGgsIExPQ0tfVElNRU9VVF9NUyk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBjc3ZQYXRoID0gZ2V0U2Vzc2lvbkNzdlBhdGgoc2Vzc2lvbklkKTtcbiAgICBjb25zdCBleGlzdGluZ0NvbW1pdHMgPSBnZXRTZXNzaW9uQ29tbWl0cyhzZXNzaW9uSWQpO1xuXG4gICAgaWYgKCFleGlzdGluZ0NvbW1pdHMuaW5jbHVkZXMoc2hhKSkge1xuICAgICAgYXBwZW5kRmlsZVN5bmMoY3N2UGF0aCwgYCR7c2hhfVxcbmAsIHsgbW9kZTogMG82MDAgfSk7XG4gICAgfVxuICB9IGZpbmFsbHkge1xuICAgIHJlbGVhc2VMb2NrKGNzdkxvY2tQYXRoKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlYWRzIGFuZCByZXR1cm5zIGFsbCBjb21taXQgU0hBcyBmb3IgYSBzZXNzaW9uIGZyb20gaXRzIENTViBmaWxlLlxuICogUmV0dXJucyBlbXB0eSBhcnJheSBpZiBDU1YgZG9lc24ndCBleGlzdC5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiB3aG9zZSBjb21taXQgYnVmZmVyIHNob3VsZCBiZSByZWFkLlxuICogQHJldHVybnMgT3JkZXJlZCBsaXN0IG9mIG5vbi1lbXB0eSBTSEEgbGluZXMuIFJldHVybnMgYFtdYCB3aGVuIHRoZSBDU1YgaXMgYWJzZW50LlxuICogQHRocm93cyBFcnJvciBvbiByZWFkIGZhaWx1cmUgKGV4Y2VwdCBgRU5PRU5UYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTZXNzaW9uQ29tbWl0cyhzZXNzaW9uSWQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjc3ZQYXRoID0gZ2V0U2Vzc2lvbkNzdlBhdGgoc2Vzc2lvbklkKTtcbiAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGNzdlBhdGgsICd1dGYtOCcpO1xuICAgIHJldHVybiBjb250ZW50XG4gICAgICAuc3BsaXQoJ1xcbicpXG4gICAgICAubWFwKChsaW5lKSA9PiBsaW5lLnRyaW0oKSlcbiAgICAgIC5maWx0ZXIoKGxpbmUpID0+IGxpbmUubGVuZ3RoID4gMCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGhhc0Vycm5vQ29kZShlcnJvciwgJ0VOT0VOVCcpKSByZXR1cm4gW107XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBzZXNzaW9uJ3MgQ1NWIGZpbGUgYW5kIGl0cyBsb2NrIGZpbGUuXG4gKiBOby1vcCBpZiBmaWxlcyBkb24ndCBleGlzdC5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiB3aG9zZSBDU1YgYXJ0aWZhY3RzIHNob3VsZCBiZSBkZWxldGVkLlxuICogQHRocm93cyBFcnJvciB3aGVuIGRlbGV0aW5nIGVpdGhlciBmaWxlIGZhaWxzIGZvciByZWFzb25zIG90aGVyIHRoYW4gYEVOT0VOVGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVTZXNzaW9uQ3N2KHNlc3Npb25JZDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGNzdlBhdGggPSBnZXRTZXNzaW9uQ3N2UGF0aChzZXNzaW9uSWQpO1xuICBjb25zdCBjc3ZMb2NrUGF0aCA9IGdldFNlc3Npb25Dc3ZMb2NrUGF0aChzZXNzaW9uSWQpO1xuXG4gIHRyeSB7XG4gICAgdW5saW5rU3luYyhjc3ZQYXRoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoIWhhc0Vycm5vQ29kZShlcnJvciwgJ0VOT0VOVCcpKSB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgdW5saW5rU3luYyhjc3ZMb2NrUGF0aCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKCFoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLyoqXG4gKiBXcml0ZXMgYSBnaXQgSEVBRCBTSEEgdG8gdGhlIHNlc3Npb24ncyAuaGVhZCBmaWxlLlxuICogQ3JlYXRlcyBkaXJlY3RvcnkgaWYgaXQgZG9lc24ndCBleGlzdC5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiB3aG9zZSBIRUFEIFNIQSBzaG91bGQgYmUgc3RvcmVkLlxuICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgU0hBIHRvIHBlcnNpc3QuXG4gKiBAdGhyb3dzIEVycm9yIHdoZW4gZGlyZWN0b3J5IGNyZWF0aW9uIG9yIGZpbGUgd3JpdGUgZmFpbHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVNlc3Npb25IZWFkU2hhKHNlc3Npb25JZDogc3RyaW5nLCBzaGE6IHN0cmluZyk6IHZvaWQge1xuICBta2RpclN5bmMoZ2V0Q2FyZFJlcG9Db21taXRzRGlyKCksIHsgcmVjdXJzaXZlOiB0cnVlLCBtb2RlOiAwbzcwMCB9KTtcbiAgd3JpdGVGaWxlU3luYyhnZXRTZXNzaW9uSGVhZFNoYVBhdGgoc2Vzc2lvbklkKSwgc2hhLCB7IG1vZGU6IDBvNjAwIH0pO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBnaXQgSEVBRCBTSEEgZnJvbSB0aGUgc2Vzc2lvbidzIC5oZWFkIGZpbGUuXG4gKlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gd2hvc2UgSEVBRCBTSEEgc2hvdWxkIGJlIHJldHJpZXZlZC5cbiAqIEByZXR1cm5zIFRoZSBzdG9yZWQgU0hBIHdpdGggd2hpdGVzcGFjZSB0cmltbWVkLCBvciBgbnVsbGAgd2hlbiB0aGUgZmlsZSBpcyBhYnNlbnQuXG4gKiBAdGhyb3dzIEVycm9yIHdoZW4gZmlsZSByZWFkIGZhaWxzIGZvciByZWFzb25zIG90aGVyIHRoYW4gYEVOT0VOVGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkU2Vzc2lvbkhlYWRTaGEoc2Vzc2lvbklkOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcmVhZEZpbGVTeW5jKGdldFNlc3Npb25IZWFkU2hhUGF0aChzZXNzaW9uSWQpLCAndXRmLTgnKS50cmltKCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGhhc0Vycm5vQ29kZShlcnJvciwgJ0VOT0VOVCcpKSByZXR1cm4gbnVsbDtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgdGhlIHNlc3Npb24ncyAuaGVhZCBmaWxlLlxuICogTm8tb3AgaWYgZmlsZSBkb2Vzbid0IGV4aXN0LlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIHdob3NlIC5oZWFkIGZpbGUgc2hvdWxkIGJlIGRlbGV0ZWQuXG4gKiBAdGhyb3dzIEVycm9yIHdoZW4gZGVsZXRpbmcgdGhlIGZpbGUgZmFpbHMgZm9yIHJlYXNvbnMgb3RoZXIgdGhhbiBgRU5PRU5UYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZVNlc3Npb25IZWFkU2hhKHNlc3Npb25JZDogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgdW5saW5rU3luYyhnZXRTZXNzaW9uSGVhZFNoYVBhdGgoc2Vzc2lvbklkKSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKCFoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgdGhyb3cgZXJyb3I7XG4gIH1cbn1cbiIsICIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGluamVjdHMgYWN0aW9uIGFuZCB0eXBlIGhvb2sgaW5wdXRzIHZpYSBwcm9jZXNzLmVudi5cbiAqIFRoaXMgbW9kdWxlIHByb3ZpZGVzIHN0cmljdCBnZXR0ZXJzIGFuZCB0eXBlZCBleHRyYWN0b3JzIHNvIGhhbmRsZXJzIGRvIG5vdFxuICogbmVlZCB0byBwYXJzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgbWFudWFsbHkuXG4gKlxuICogVXNlIHRoZSBpbmRpdmlkdWFsIGdldHRlcnMgd2hlbiB5b3Ugb25seSBuZWVkIG9uZSB2YWx1ZTsgdXNlXG4gKiB7QGxpbmsgZXh0cmFjdEFjdGlvbklucHV0fSBvciB7QGxpbmsgZXh0cmFjdFR5cGVJbnB1dH0gd2hlbiB5b3UgbmVlZCBhIGZ1bGxcbiAqIHR5cGVkIHBheWxvYWQgZm9yIGFuIGFjdGlvbiBvciB0eXBlIGhvb2suXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uSW5wdXQsIFR5cGVIb29rSW5wdXQgfSBmcm9tICcuL2lucHV0cy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVzIHNldCBieSB0aGUgQ2FyZHMgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKlxuICogVGhpcyBpcyB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCBmb3IgZW52IHZhciBrZXlzIHVzZWQgYnkgYWN0aW9uIGFuZCB0eXBlXG4gKiBob29rIHByb2Nlc3Nlcy4gS2VlcCBpdCBpbiBzeW5jIHdpdGggdGhlIHdyYXBwZXIgdG8gYXZvaWQgc3VidGxlIFwidW5kZWZpbmVkXG4gKiBpbnB1dFwiIGJ1Z3MuXG4gKi9cbmV4cG9ydCBjb25zdCBDQVJEU19FTlZfVkFSUyA9IHtcbiAgLyoqXG4gICAqIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgY3VycmVudCBjYXJkLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBDQVJEX0lEOiAnQ0FSRF9JRCcsXG5cbiAgLyoqXG4gICAqIFRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gc2V0dGluZ3MuanNvbi5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgRU5WSVJPTk1FTlQ6ICdFTlZJUk9OTUVOVCcsXG5cbiAgLyoqXG4gICAqIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIGJ1dHRvbiB0aGF0IHRyaWdnZXJlZCB0aGlzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEFDVElPTl9OQU1FOiAnQUNUSU9OX05BTUUnLFxuXG4gIC8qKlxuICAgKiBDYXJkJ3MgZXhlY3V0aW9uIG1vZGUsIGRldGVybWluaW5nIFVJIGludGVyYWN0aW9uIG1vZGVsLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIFZhbGlkIHZhbHVlczogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJ1xuICAgKi9cbiAgRVhFQ1VUSU9OX01PREU6ICdFWEVDVVRJT05fTU9ERScsXG5cbiAgLyoqXG4gICAqIENhcmRzIHNlcnZlciBiYXNlIFVSTCBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQkFTRV9VUkw6ICdBUElfQkFTRV9VUkwnLFxuXG4gIC8qKlxuICAgKiBBdXRoZW50aWNhdGlvbiB0b2tlbiBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQUNDRVNTX1RPS0VOOiAnQVBJX0FDQ0VTU19UT0tFTicsXG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIE9wdGlvbmFsLlxuICAgKi9cbiAgQ09ESU5HX0FHRU5UOiAnQ09ESU5HX0FHRU5UJyxcblxuICAvKipcbiAgICogVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9OQU1FOiAnVFlQRV9OQU1FJyxcblxuICAvKipcbiAgICogVGhlIHR5cGUncyB2ZXJzaW9uIHN0cmluZyBmcm9tIHNldHRpbmdzLmpzb24gY29uZmlndXJhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFRZUEVfVkVSU0lPTjogJ1RZUEVfVkVSU0lPTicsXG5cbiAgLyoqXG4gICAqIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfTkFNRTogJ0ZJTEVfTkFNRScsXG5cbiAgLyoqXG4gICAqIEZ1bGwgcGF0aCB0byB0aGUgZmlsZS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfUEFUSDogJ0ZJTEVfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEZpbGUgc2l6ZSBpbiBieXRlcy5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfU0laRTogJ0ZJTEVfU0laRScsXG5cbiAgLyoqXG4gICAqIFNIQTI1NiBoYXNoIG9mIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBTSEEyNTY6ICdTSEEyNTYnLFxuXG4gIC8qKlxuICAgKiBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBDT05URU5UX1RZUEU6ICdDT05URU5UX1RZUEUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlci5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYCAod2l0aFxuICAgKiBgRUxFQ1RST05fUlVOX0FTX05PREU9MWApLiBDb21tYW5kcyBpbiBzZXR0aW5ncy5qc29uIHVzZVxuICAgKiBgJFZTQ09ERV9OT0RFIC4vYmluLy4uLmAgc28gdGhleSB3b3JrIHJlZ2FyZGxlc3Mgb2ZcbiAgICogd2hldGhlciBgbm9kZWAgaXMgb24gdGhlIHN5c3RlbSBQQVRILlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBWU0NPREVfTk9ERTogJ1ZTQ09ERV9OT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlciBydW5uaW5nIHRoZSB3cmFwcGVyIHByb2Nlc3MuXG4gICAqXG4gICAqIFNldCBieSB0aGUgd3JhcHBlciBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYC4gVXNlIGAkTk9ERWAgaW4gZW1iZWRkZWRcbiAgICogYmFzaCBzdGF0ZW1lbnRzIHRvIGludm9rZSBOb2RlIHNjcmlwdHMgcG9ydGFibHkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucy5cbiAgICovXG4gIE5PREU6ICdOT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVW5peCBkb21haW4gc29ja2V0IGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFNPQ0tFVF9QQVRIOiAnU09DS0VUX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGEgSlNPTiBmaWxlIGNvbnRhaW5pbmcgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZyb20gYSBwcmV2aW91cyBoYW5kbGVyLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LiBPcHRpb25hbC5cbiAgICovXG4gIFNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEg6ICdTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDT05GSUdfUEFUSDogJ0NPTkZJR19QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVlMgQ29kZSB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnkuXG4gICAqIFNldCBieSB0aGUgYWN0aW9uIGhhbmRsZXIgKGUuZy4sIGxhdW5jaC50cykgdG8gdGhlIHdvcmt0cmVlIHBhdGguXG4gICAqIEF2YWlsYWJsZSBpbiBob29rcyBydW5uaW5nIGluc2lkZSB0aGUgY2xhdWRlIENMSS5cbiAgICovXG4gIFdPUktTUEFDRV9QQVRIOiAnV09SS1NQQUNFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgKE5PVCBhIHdvcmt0cmVlKS5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIGFuZCB3YXRjaGVyIGZvclxuICAgKiBnaXQgb3BlcmF0aW9ucyAod29ya3RyZWUgcmVtb3ZhbCwgYnJhbmNoIGRlbGV0aW9uKSB0aGF0IG11c3QgcnVuXG4gICAqIGFnYWluc3QgdGhlIG1haW4gcmVwb3NpdG9yeS5cbiAgICovXG4gIFJFUE9fUk9PVDogJ1JFUE9fUk9PVCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGNhcmQncyByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENBUkRfUkVQT19QQVRIOiAnQ0FSRF9SRVBPX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlZCBzaGVsbCBjb21tYW5kIGZvciB0aGUgd3JhcHBlciB0byBzcGF3biBhcyB0aGUgYWN0aW9uIGhhbmRsZXIuXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyBjb25zdW1lZCBieSB0aGUgd3JhcHBlciAobm90IGJ5IGFjdGlvbiBoYW5kbGVycykuXG4gICAqL1xuICBBQ1RJT05fQ09NTUFORDogJ0FDVElPTl9DT01NQU5EJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCB0aGF0IHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3aWxsIG1lcmdlIGludG8uXG4gICAqIFJlc29sdmVkIGZyb20gdGhlIHdvcmtzcGFjZSBIRUFEIGF0IGxhdW5jaCB0aW1lLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBCQVNFX0JSQU5DSDogJ0JBU0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBmcm9tIHdoaWNoIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3YXMgY3JlYXRlZC5cbiAgICogTWF5IGRpZmZlciBmcm9tIEJBU0VfQlJBTkNIIHdoZW4gdGhlIHdvcmt0cmVlIHdhcyBjcmVhdGVkIGFnYWluc3RcbiAgICogYSBkaWZmZXJlbnQgcmVmIHRoYW4gdGhlIGN1cnJlbnQgd29ya3NwYWNlIEhFQUQuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFBBUkVOVF9CUkFOQ0g6ICdQQVJFTlRfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBuYW1lIGZvciB0aGUgY2FyZCdzIHdvcmtzcGFjZSBpbXBsZW1lbnRhdGlvbi5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uIGFmdGVyIHJlc29sdmluZyBvciBjcmVhdGluZyB0aGUgd29ya3RyZWUuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBXT1JLU1BBQ0VfQlJBTkNIOiAnV09SS1NQQUNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIFNlc3Npb24gSUQgcGVyc2lzdGVkIGJ5IHRoZSBzZXNzaW9uLXN0YXJ0IGhvb2sgdmlhIGBwZXJzaXN0RW52VmFyYC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIEJhc2ggdG9vbCBzaGVsbCBkZXNjZW5kYW50cyAoY29tbWFuZHMsIGdpdCBob29rcykgYWZ0ZXJcbiAgICogc2Vzc2lvbiBzdGFydC4gTk9UIGF2YWlsYWJsZSBpbiBob29rcyBzcGF3bmVkIGRpcmVjdGx5IGJ5IENsYXVkZSBDb2RlXG4gICAqIChzdG9wLCBzZXNzaW9uLWVuZCwgZXRjLikgXHUyMDE0IHRob3NlIHJlY2VpdmUgdGhlIHNlc3Npb24gSUQgdmlhIGhvb2sgaW5wdXQuXG4gICAqXG4gICAqIFRoZSBjYXJkLXJlcG8gcG9zdC1jb21taXQgaG9vayByZWFkcyB0aGlzIHRvIHJlY29yZCBjb21taXRzIGRpcmVjdGx5XG4gICAqIHdpdGhvdXQgbmVlZGluZyBhIHByb2Nlc3MtdHJlZSB3YWxrIG9yIFBJRCByZWdpc3RyeSBsb29rdXAuXG4gICAqL1xuICBDQVJEU19TRVNTSU9OX0lEOiAnQ0FSRFNfU0VTU0lPTl9JRCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAgICogaW50byBhbGwgc3Bhd25lZCBhY3Rpb24gcHJvY2Vzc2VzLiBVc2UgdGhpcyB0byBsb2NhdGUgYnVuZGxlZCBhc3NldHMgc3VjaFxuICAgKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEVYVEVOU0lPTl9QQVRIOiAnRVhURU5TSU9OX1BBVEgnXG59IGFzIGNvbnN0O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJbmRpdmlkdWFsIEdldHRlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSBleGVjdXRpb24gd3JhcHBlciBhbHdheXMgc2V0cyB0aGlzIGZvciBldmVyeSBhY3Rpb24gYW5kIHR5cGUgaG9vay5cbiAqIEByZXR1cm5zIFRoZSBjdXJyZW50IGNhcmQgSURcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0FSRF9JRCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2FyZElkID0gZ2V0Q2FyZElkKCk7XG4gKiBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyBjYXJkOiAke2NhcmRJZH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FyZElkKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX0lEfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZW52aXJvbm1lbnQgbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZhbHVlIG1hdGNoZXMgdGhlIGVudmlyb25tZW50IGtleSBpbiBzZXR0aW5ncy5qc29uIChlLmcuLCBcImRlZmF1bHRcIiwgXCJzdGFnaW5nXCIpLlxuICogQHJldHVybnMgVGhlIGVudmlyb25tZW50IG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRU5WSVJPTk1FTlQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudmlyb25tZW50ID0gZ2V0RW52aXJvbm1lbnQoKTtcbiAqIGNvbnNvbGUubG9nKGBFbnZpcm9ubWVudDogJHtlbnZpcm9ubWVudH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52aXJvbm1lbnQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFjdGlvbiBidXR0b24gbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHRoZSBkaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgaGFuZGxlciwgbWF0Y2hpbmdcbiAqIHRoZSBgYWN0aW9uTmFtZWAgZmllbGQgZnJvbSBgZGVmaW5lQWN0aW9uYC5cbiAqIEByZXR1cm5zIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBjdXJyZW50IGhhbmRsZXIgcnVuLlxuICogQHRocm93cyBFcnJvciBpZiBBQ1RJT05fTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYWN0aW9uTmFtZSA9IGdldEFjdGlvbk5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBSdW5uaW5nIGFjdGlvbjogJHthY3Rpb25OYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3Rpb25OYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBleGVjdXRpb24gbW9kZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBEZXRlcm1pbmVzIHRoZSBVSSBpbnRlcmFjdGlvbiBtb2RlbCBmb3IgYWN0aW9ucy5cbiAqIEByZXR1cm5zIFRoZSBleGVjdXRpb24gbW9kZSAoJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcpXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYRUNVVElPTl9NT0RFIGlzIG1pc3NpbmcsIGVtcHR5LCBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgbW9kZSA9IGdldEV4ZWN1dGlvbk1vZGUoKTtcbiAqIGlmIChtb2RlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gKiAgIC8vIFNob3cgdXNlciBwcm9tcHRzXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4ZWN1dGlvbk1vZGUoKTogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9YCk7XG4gIH1cbiAgaWYgKHZhbHVlICE9PSAnaW50ZXJhY3RpdmUnICYmIHZhbHVlICE9PSAnYmFja2dyb3VuZCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX06IGV4cGVjdGVkICdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYmFzZSBVUkwgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVXNlIHRoaXMgYXMgdGhlIGJhc2UgZm9yIGNvbnN0cnVjdGluZyBBUEkgZW5kcG9pbnRzLiBUaGUgVVJMIGRvZXMgbm90IGluY2x1ZGVcbiAqIGEgdHJhaWxpbmcgc2xhc2guXG4gKiBAcmV0dXJucyBCYXNlIFVSTCB1c2VkIHRvIGNvbnN0cnVjdCBDYXJkcyBBUEkgZW5kcG9pbnRzIGZvciB0aGlzIGV4ZWN1dGlvbi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0JBU0VfVVJMIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhcGlVcmwgPSBnZXRBcGlCYXNlVXJsKCk7XG4gKiBjb25zdCBlbmRwb2ludCA9IGAke2FwaVVybH0vY2FyZHMvJHtjYXJkSWR9YDtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQmFzZVVybCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkx9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYWNjZXNzIHRva2VuIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIEJlYXJlciB0b2tlbiB2YWxpZCBmb3IgdGhlIGR1cmF0aW9uIG9mIHRoaXMgYWN0aW9uIG9yIHR5cGUgaG9vayBleGVjdXRpb24uXG4gKiBJbmNsdWRlIGluIEF1dGhvcml6YXRpb24gaGVhZGVycyB3aGVuIGNhbGxpbmcgdGhlIENhcmRzIEFQSS5cbiAqIEByZXR1cm5zIEJlYXJlciB0b2tlbiB0aGF0IGF1dGhvcml6ZXMgQVBJIHJlcXVlc3RzIGZvciB0aGlzIGV4ZWN1dGlvbiBjb250ZXh0LlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQUNDRVNTX1RPS0VOIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0b2tlbiA9IGdldEFwaUFjY2Vzc1Rva2VuKCk7XG4gKiBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGFwaVVybCwge1xuICogICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0b2tlbn1gIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlBY2Nlc3NUb2tlbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU5dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGNvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogT3B0aW9uYWwgdmFsdWUgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLiBXaGVuIHNldCwgaW5kaWNhdGVzIHdoaWNoIEFJXG4gKiBjb2RpbmcgYXNzaXN0YW50IHRoZSB1c2VyIHByZWZlcnMuIEFjdGlvbnMgY2FuIHVzZSB0aGlzIHRvIGN1c3RvbWl6ZSBiZWhhdmlvclxuICogb3IgcHJvbXB0cyBmb3IgZGlmZmVyZW50IGFnZW50cy5cbiAqIEByZXR1cm5zIFRoZSBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb2RpbmdBZ2VudCA9IGdldENvZGluZ0FnZW50KCk7XG4gKiBpZiAoY29kaW5nQWdlbnQgPT09ICdjbGF1ZGUnKSB7XG4gKiAgIC8vIEN1c3RvbWl6ZSBmb3IgQ2xhdWRlXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvZGluZ0FnZW50KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ESU5HX0FHRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lIGZvciB0eXBlIGhvb2tzLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgb25seSBwcmVzZW50IGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICogQHJldHVybnMgVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdHlwZU5hbWUgPSBnZXRUeXBlTmFtZSgpO1xuICogY29uc29sZS5sb2coYFR5cGU6ICR7dHlwZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGUgdmVyc2lvbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZlcnNpb24gY29tZXMgZnJvbSB0aGUgdHlwZSBjb25maWd1cmF0aW9uIGluIHNldHRpbmdzLmpzb24uXG4gKiBAcmV0dXJucyBUaGUgdmVyc2lvbiBzdHJpbmcgZnJvbSB0eXBlIGNvbmZpZ1xuICogQHRocm93cyBFcnJvciBpZiBUWVBFX1ZFUlNJT04gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHZlcnNpb24gPSBnZXRUeXBlVmVyc2lvbigpO1xuICogY29uc29sZS5sb2coYFZlcnNpb246ICR7dmVyc2lvbn1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZVZlcnNpb24oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT05dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBuYW1lIGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZpbGUgbmFtZSByZWxhdGl2ZSB0byB0aGUgdHlwZSBkaXJlY3RvcnksIG5vdCBhIGZ1bGwgcGF0aC5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBGaWxlOiAke2ZpbGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSB0eXBlZCBmaWxlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZ1bGx5IHJlc29sdmVkIHBhdGggb24gZGlzayBwcm92aWRlZCBieSB0aGUgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKiBAcmV0dXJucyBUaGUgZnVsbCBwYXRoIHRvIHRoZSBmaWxlXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZVBhdGggPSBnZXRGaWxlUGF0aCgpO1xuICogY29uc29sZS5sb2coYFBhdGg6ICR7ZmlsZVBhdGh9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgc2l6ZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgdmFsdWUgaXMgcGFyc2VkIGFzIGEgYmFzZS0xMCBpbnRlZ2VyLlxuICogQHJldHVybnMgVGhlIGZpbGUgc2l6ZSBpbiBieXRlc1xuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1NJWkUgaXMgbWlzc2luZyBvciBub3QgYSBudW1iZXJcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBzaXplID0gZ2V0RmlsZVNpemUoKTtcbiAqIGNvbnNvbGUubG9nKGBTaXplOiAke3NpemV9IGJ5dGVzYCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVTaXplKCk6IG51bWJlciB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX1gKTtcbiAgfVxuICBjb25zdCBzaXplID0gTnVtYmVyLnBhcnNlSW50KHZhbHVlLCAxMCk7XG4gIGlmIChOdW1iZXIuaXNOYU4oc2l6ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9OiBleHBlY3RlZCBudW1iZXIsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gc2l6ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgU0hBMjU2IGhhc2ggZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogVXNlZnVsIGZvciBkZXRlY3RpbmcgY29udGVudCBjaGFuZ2VzIHdpdGhvdXQgcmVhZGluZyB0aGUgZmlsZSBhZ2Fpbi5cbiAqIEByZXR1cm5zIFRoZSBTSEEyNTYgaGFzaCBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBTSEEyNTYgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGhhc2ggPSBnZXRTaGEyNTYoKTtcbiAqIGNvbnNvbGUubG9nKGBIYXNoOiAke2hhc2h9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNoYTI1NigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNIQTI1Nl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TSEEyNTZ9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBNSU1FIHR5cGUgZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogUHJvdmlkZWQgZm9yIHR5cGUgaG9vayBldmVudHMgc28gdmFsaWRhdG9ycyBjYW4gYnJhbmNoIG9uIGNvbnRlbnQgdHlwZS5cbiAqIEByZXR1cm5zIFRoZSBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09OVEVOVF9UWVBFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb250ZW50VHlwZSA9IGdldENvbnRlbnRUeXBlKCk7XG4gKiBjb25zb2xlLmxvZyhgQ29udGVudCB0eXBlOiAke2NvbnRlbnRUeXBlfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb250ZW50VHlwZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlciBwYXRoIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgc2V0IGJ5IHRoZSBleHRlbnNpb24gZHVyaW5nIGFjdGl2YXRpb24gYW5kIGluamVjdGVkIGludG8gYWxsXG4gKiBzcGF3bmVkIGFjdGlvbi9ob29rIHByb2Nlc3Nlcy4gQ29uZmlndXJhdGlvbiBhdXRob3JzIGNhbiB1c2UgaXQgdG8gaW52b2tlXG4gKiBOb2RlLmpzIHdpdGhvdXQgcmVseWluZyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gKlxuICogQHJldHVybnMgVGhlIHBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXJcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVlNDT0RFX05PREUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG5vZGVQYXRoID0gZ2V0VnNjb2RlTm9kZVBhdGgoKTtcbiAqIGV4ZWNGaWxlU3luYyhub2RlUGF0aCwgWydzY3JpcHQuanMnXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFZzY29kZU5vZGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgcGF0aCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gKlxuICogQHJldHVybnMgVW5peCBzb2NrZXQgcGF0aCB1c2VkIHRvIHNlbmQgcnVudGltZSBjb250cm9sIG1lc3NhZ2VzLlxuICogQHRocm93cyBFcnJvciBpZiBTT0NLRVRfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb2NrZXRQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBwYXRoIHRvIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIG9wdGlvbmFsIFx1MjAxNCByZXR1cm5zIHVuZGVmaW5lZCB3aGVuIG5vdCBzZXQgKGkuZS4sIHRoZSBhY3Rpb25cbiAqIHdhcyBub3QgcmVsYXVuY2hlZCB2aWEgc3dpdGNoVG9JbnRlcmFjdGl2ZSkuXG4gKlxuICogQHJldHVybnMgVGhlIGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBkaXJlY3RvcnkgY29udGFpbmluZyBnZW5lcmF0ZWQgc2V0dGluZ3MgYXJ0aWZhY3RzLlxuICogQHRocm93cyBFcnJvciBpZiBDT05GSUdfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWdQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB3b3Jrc3BhY2UgcGF0aCBzZXQgYnkgdGhlIGFjdGlvbiBoYW5kbGVyIChlLmcuLCB0aGUgd29ya3RyZWUgcGF0aCkuXG4gKlxuICogVGhpcyBpcyBmb3IgaG9va3MgcnVubmluZyBpbnNpZGUgdGhlIENsYXVkZSBDTEksICoqbm90KiogZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqIEFjdGlvbiBoYW5kbGVycyBzaG91bGQgdXNlIHtAbGluayBnZXRSZXBvUm9vdH0gaW5zdGVhZC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBhY3RpdmUgd29ya3NwYWNlIC8gd29ya3RyZWUuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFdPUktTUEFDRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFdvcmtzcGFjZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCBwYXRoLlxuICpcbiAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyB1c2VkIGJ5IGFjdGlvbiBoYW5kbGVycyB0byByZXNvbHZlIHdvcmt0cmVlc1xuICogYW5kIHBlcmZvcm0gZ2l0IG9wZXJhdGlvbnMgYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICogQHRocm93cyBFcnJvciBpZiBSRVBPX1JPT1QgaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVwb1Jvb3QoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1RdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuUkVQT19ST09UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgcmVwb3NpdG9yeSBhc3NvY2lhdGVkIHdpdGggdGhlIGFjdGl2ZSBjYXJkLlxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX1JFUE9fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkUmVwb1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYVEVOU0lPTl9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVuc2lvblBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHBhcnNlcyB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogV2hlbiBgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSGAgaXMgc2V0LCByZWFkcyB0aGUgZmlsZSBhdCB0aGF0IHBhdGhcbiAqIGFuZCBwYXJzZXMgaXQgYXMgSlNPTi4gUmV0dXJucyB1bmRlZmluZWQgaWYgdGhlIGVudiB2YXIgaXMgbm90IHNldC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGFyc2VkIGRhdGEsIG9yIHVuZGVmaW5lZCBpZiB0aGUgcGF0aCBpcyBub3Qgc2V0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBmaWxlIGNhbm5vdCBiZSByZWFkIG9yIGNvbnRhaW5zIGludmFsaWQgSlNPTlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCk6IHVua25vd24gfCB1bmRlZmluZWQge1xuICBjb25zdCBkYXRhUGF0aCA9IGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpO1xuICBpZiAoZGF0YVBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhkYXRhUGF0aCwgJ3V0Zi04Jyk7XG4gIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlZCBJbnB1dCBFeHRyYWN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgYWN0aW9uIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKlxuICogQHJldHVybnMgVHlwZWQgQWN0aW9uSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYW4gYWN0aW9uIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5jYXJkSWQpO1xuICogY29uc29sZS5sb2coaW5wdXQuZXhlY3V0aW9uTW9kZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBY3Rpb25JbnB1dCgpOiBBY3Rpb25JbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBhY3Rpb25OYW1lOiBnZXRBY3Rpb25OYW1lKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgZXhlY3V0aW9uTW9kZTogZ2V0RXhlY3V0aW9uTW9kZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKSxcbiAgICBjb2RpbmdBZ2VudDogZ2V0Q29kaW5nQWdlbnQoKSxcbiAgICBzd2l0Y2hUb0ludGVyYWN0aXZlRGF0YTogcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCksXG4gICAgcmVwb1Jvb3Q6IGdldFJlcG9Sb290KCksXG4gICAgY2FyZFJlcG9QYXRoOiBnZXRDYXJkUmVwb1BhdGgoKSxcbiAgICBjb25maWdQYXRoOiBnZXRDb25maWdQYXRoKCksXG4gICAgZXh0ZW5zaW9uUGF0aDogZ2V0RXh0ZW5zaW9uUGF0aCgpXG4gIH07XG59XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgdHlwZSBob29rIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciB0eXBlIGxpZmVjeWNsZSBob29rcyAodmFsaWRhdG9yLCBjcmVhdGUsXG4gKiB1cGRhdGUsIGRlbGV0ZSkuXG4gKlxuICogQHJldHVybnMgVHlwZWQgVHlwZUhvb2tJbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhIHR5cGUgaG9vayBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RUeXBlSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LnR5cGVOYW1lKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmZpbGVOYW1lKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFR5cGVJbnB1dCgpOiBUeXBlSG9va0lucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIHR5cGVOYW1lOiBnZXRUeXBlTmFtZSgpLFxuICAgIHR5cGVWZXJzaW9uOiBnZXRUeXBlVmVyc2lvbigpLFxuICAgIGZpbGVOYW1lOiBnZXRGaWxlTmFtZSgpLFxuICAgIGZpbGVQYXRoOiBnZXRGaWxlUGF0aCgpLFxuICAgIGZpbGVTaXplOiBnZXRGaWxlU2l6ZSgpLFxuICAgIGZpbGVTaGEyNTY6IGdldFNoYTI1NigpLFxuICAgIGNvbnRlbnRUeXBlOiBnZXRDb250ZW50VHlwZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKVxuICB9O1xufVxuIiwgIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBhY2Nlc3MgdG8gQ2xhdWRlIENvZGUncyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHV0aWxpdGllc1xuICogZm9yIHBlcnNpc3RpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzIGluIFNlc3Npb25TdGFydCBob29rcy5cbiAqXG4gKiAjIyBFbnZpcm9ubWVudCBWYXJpYWJsZXNcbiAqXG4gKiBDbGF1ZGUgQ29kZSBzZXRzIHRoZXNlIGVudmlyb25tZW50IHZhcmlhYmxlcyB3aGVuIHJ1bm5pbmcgaG9va3M6XG4gKlxuICogfCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHwgQXZhaWxhYmxlIEluIHxcbiAqIHwtLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS18XG4gKiB8IGBDTEFVREVfUFJPSkVDVF9ESVJgIHwgQWJzb2x1dGUgcGF0aCB0byBwcm9qZWN0IHJvb3QgfCBBbGwgaG9va3MgfFxuICogfCBgQ0xBVURFX0VOVl9GSUxFYCB8IFBhdGggdG8gZmlsZSBmb3IgcGVyc2lzdGluZyBlbnYgdmFycyB8IFNlc3Npb25TdGFydCBvbmx5IHxcbiAqIHwgYENMQVVERV9DT0RFX1JFTU9URWAgfCBgXCJ0cnVlXCJgIGlmIHJ1bm5pbmcgcmVtb3RlbHkgfCBBbGwgaG9va3MgfFxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGdldFByb2plY3REaXIsIHBlcnNpc3RFbnZWYXIsIGlzUmVtb3RlRW52aXJvbm1lbnQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEdldCBwcm9qZWN0IGRpcmVjdG9yeVxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqXG4gKiAvLyBDaGVjayBpZiBydW5uaW5nIHJlbW90ZWx5XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIEhhbmRsZSByZW1vdGUtc3BlY2lmaWMgbG9naWNcbiAqIH1cbiAqXG4gKiAvLyBJbiBTZXNzaW9uU3RhcnQgaG9vazogcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ3Byb2R1Y3Rpb24nKTtcbiAqIHBlcnNpc3RFbnZWYXIoJ0FQSV9LRVknLCAnc2VjcmV0LWtleScpO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1leGVjdXRpb24tZGV0YWlsc1xuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwibm9kZTpmc1wiO1xuLyoqXG4gKiBDbGF1ZGUgQ29kZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lcy5cbiAqXG4gKiBUaGVzZSBhcmUgdGhlIGVudmlyb25tZW50IHZhcmlhYmxlcyB0aGF0IENsYXVkZSBDb2RlIHNldHMgd2hlbiBydW5uaW5nIGhvb2tzLlxuICovXG5leHBvcnQgY29uc3QgQ0xBVURFX0VOVl9WQVJTID0ge1xuICAgIC8qKlxuICAgICAqIEFic29sdXRlIHBhdGggdG8gdGhlIHByb2plY3Qgcm9vdCBkaXJlY3Rvcnkgd2hlcmUgQ2xhdWRlIENvZGUgd2FzIHN0YXJ0ZWQuXG4gICAgICogQXZhaWxhYmxlIGluIGFsbCBob29rcy5cbiAgICAgKi9cbiAgICBQUk9KRUNUX0RJUjogXCJDTEFVREVfUFJPSkVDVF9ESVJcIixcbiAgICAvKipcbiAgICAgKiBQYXRoIHRvIGEgZmlsZSB3aGVyZSBTZXNzaW9uU3RhcnQgaG9va3MgY2FuIHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICAgICAqIFZhcmlhYmxlcyB3cml0dGVuIHRvIHRoaXMgZmlsZSB3aWxsIGJlIGF2YWlsYWJsZSBpbiBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzLlxuICAgICAqIE9ubHkgYXZhaWxhYmxlIGluIFNlc3Npb25TdGFydCBob29rcy5cbiAgICAgKi9cbiAgICBFTlZfRklMRTogXCJDTEFVREVfRU5WX0ZJTEVcIixcbiAgICAvKipcbiAgICAgKiBTZXQgdG8gXCJ0cnVlXCIgd2hlbiBydW5uaW5nIGluIGEgcmVtb3RlICh3ZWIpIGVudmlyb25tZW50LlxuICAgICAqIE5vdCBzZXQgb3IgZW1wdHkgd2hlbiBydW5uaW5nIGluIGxvY2FsIENMSSBlbnZpcm9ubWVudC5cbiAgICAgKi9cbiAgICBSRU1PVEU6IFwiQ0xBVURFX0NPREVfUkVNT1RFXCIsXG59O1xuLyoqXG4gKiBHZXRzIHRoZSBDbGF1ZGUgQ29kZSBwcm9qZWN0IGRpcmVjdG9yeS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwcm9qZWN0IHJvb3Qgd2hlcmUgQ2xhdWRlIENvZGUgd2FzIHN0YXJ0ZWQuXG4gKiBUaGUgdmFsdWUgY29tZXMgZnJvbSB0aGUgYENMQVVERV9QUk9KRUNUX0RJUmAgZW52aXJvbm1lbnQgdmFyaWFibGUuXG4gKiBAcmV0dXJucyBUaGUgcHJvamVjdCBkaXJlY3RvcnkgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBwcm9qZWN0RGlyID0gZ2V0UHJvamVjdERpcigpO1xuICogaWYgKHByb2plY3REaXIpIHtcbiAqICAgY29uc3QgY29uZmlnUGF0aCA9IGAke3Byb2plY3REaXJ9Ly5jbGF1ZGUvY29uZmlnLmpzb25gO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0RGlyKCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuUFJPSkVDVF9ESVJdO1xufVxuLyoqXG4gKiBHZXRzIHRoZSBDbGF1ZGUgQ29kZSBlbnYgZmlsZSBwYXRoIGZvciBwZXJzaXN0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBUaGlzIGlzIG9ubHkgYXZhaWxhYmxlIGluIFNlc3Npb25TdGFydCBob29rcy4gVGhlIHBhdGggcG9pbnRzIHRvIGEgZmlsZVxuICogd2hlcmUgeW91IGNhbiB3cml0ZSBzaGVsbCBleHBvcnQgc3RhdGVtZW50cyB0byBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogZm9yIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMgaW4gdGhlIHNlc3Npb24uXG4gKiBAcmV0dXJucyBUaGUgZW52IGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXQgKG5vdCBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudkZpbGUgPSBnZXRFbnZGaWxlUGF0aCgpO1xuICogaWYgKGVudkZpbGUpIHtcbiAqICAgLy8gV2UncmUgaW4gYSBTZXNzaW9uU3RhcnQgaG9vayBhbmQgY2FuIHBlcnNpc3QgZW52IHZhcnNcbiAqICAgcGVyc2lzdEVudlZhcignTVlfVkFSJywgJ215LXZhbHVlJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudkZpbGVQYXRoKCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuRU5WX0ZJTEVdO1xufVxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGhvb2sgaXMgcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAqXG4gKiBSZW1vdGUgZW52aXJvbm1lbnRzIG1heSBoYXZlIGRpZmZlcmVudCBjYXBhYmlsaXRpZXMgb3IgcmVzdHJpY3Rpb25zXG4gKiBjb21wYXJlZCB0byBsb2NhbCBDTEkgZW52aXJvbm1lbnRzLlxuICogQHJldHVybnMgdHJ1ZSBpZiBydW5uaW5nIHJlbW90ZWx5LCBmYWxzZSBpZiBydW5uaW5nIGxvY2FsbHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIFVzZSB3ZWItY29tcGF0aWJsZSBhcHByb2FjaGVzXG4gKiB9IGVsc2Uge1xuICogICAvLyBDYW4gdXNlIGxvY2FsIENMSSBmZWF0dXJlc1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1JlbW90ZUVudmlyb25tZW50KCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuUkVNT1RFXSA9PT0gXCJ0cnVlXCI7XG59XG4vKipcbiAqIFBlcnNpc3RzIGFuIGVudmlyb25tZW50IHZhcmlhYmxlIGZvciB1c2UgaW4gc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gd3JpdGVzIGEgc2hlbGwgZXhwb3J0IHN0YXRlbWVudCB0byB0aGUgYENMQVVERV9FTlZfRklMRWAsXG4gKiB3aGljaCBDbGF1ZGUgQ29kZSBzb3VyY2VzIGJlZm9yZSBydW5uaW5nIGJhc2ggY29tbWFuZHMuIFRoaXMgYWxsb3dzXG4gKiBTZXNzaW9uU3RhcnQgaG9va3MgdG8gY29uZmlndXJlIHRoZSBlbnZpcm9ubWVudCBmb3IgdGhlIGVudGlyZSBzZXNzaW9uLlxuICpcbiAqICoqSW1wb3J0YW50Kio6IFRoaXMgZnVuY3Rpb24gb25seSB3b3JrcyBpbiBTZXNzaW9uU3RhcnQgaG9va3Mgd2hlcmVcbiAqIGBDTEFVREVfRU5WX0ZJTEVgIGlzIHNldC4gSW4gb3RoZXIgaG9va3MsIGl0IHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gKiBAcGFyYW0gbmFtZSAtIFRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGUgdmFsdWUgKHdpbGwgYmUgc2hlbGwtZXNjYXBlZClcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0xBVURFX0VOVl9GSUxFIGlzIG5vdCBzZXQgKG5vdCBpbiBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25TdGFydEhvb2ssIHNlc3Npb25TdGFydE91dHB1dCwgcGVyc2lzdEVudlZhciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7fSwgYXN5bmMgKGlucHV0KSA9PiB7XG4gKiAgIC8vIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0aGUgc2Vzc2lvblxuICogICBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdwcm9kdWN0aW9uJyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ0FQSV9LRVknLCBwcm9jZXNzLmVudi5NWV9BUElfS0VZID8/ICdkZWZhdWx0Jyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ1BBVEgnLCBgJHtwcm9jZXNzLmVudi5QQVRIfTouL25vZGVfbW9kdWxlcy8uYmluYCk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcGVyc2lzdGluZy1lbnZpcm9ubWVudC12YXJpYWJsZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcnNpc3RFbnZWYXIobmFtZSwgdmFsdWUpIHtcbiAgICBjb25zdCBlbnZGaWxlID0gZ2V0RW52RmlsZVBhdGgoKTtcbiAgICBpZiAoZW52RmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInBlcnNpc3RFbnZWYXIgY2FuIG9ubHkgYmUgdXNlZCBpbiBTZXNzaW9uU3RhcnQgaG9va3MuIFwiICsgXCJDTEFVREVfRU5WX0ZJTEUgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgbm90IHNldC5cIik7XG4gICAgfVxuICAgIC8vIFNoZWxsLWVzY2FwZSB0aGUgdmFsdWUgdG8gaGFuZGxlIHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgIGNvbnN0IGVzY2FwZWRWYWx1ZSA9IGVzY2FwZVNoZWxsVmFsdWUodmFsdWUpO1xuICAgIC8vIFdyaXRlIHRoZSBleHBvcnQgc3RhdGVtZW50XG4gICAgY29uc3QgZXhwb3J0U3RhdGVtZW50ID0gYGV4cG9ydCAke25hbWV9PSR7ZXNjYXBlZFZhbHVlfVxcbmA7XG4gICAgZnMuYXBwZW5kRmlsZVN5bmMoZW52RmlsZSwgZXhwb3J0U3RhdGVtZW50LCBcInV0Zi04XCIpO1xufVxuLyoqXG4gKiBQZXJzaXN0cyBtdWx0aXBsZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYXQgb25jZS5cbiAqXG4gKiBUaGlzIGlzIGEgY29udmVuaWVuY2Ugd3JhcHBlciBhcm91bmQgYHBlcnNpc3RFbnZWYXJgIGZvciBzZXR0aW5nXG4gKiBtdWx0aXBsZSB2YXJpYWJsZXMgaW4gYSBzaW5nbGUgY2FsbC5cbiAqIEBwYXJhbSB2YXJzIC0gT2JqZWN0IG1hcHBpbmcgdmFyaWFibGUgbmFtZXMgdG8gdmFsdWVzXG4gKiBAdGhyb3dzIEVycm9yIGlmIENMQVVERV9FTlZfRklMRSBpcyBub3Qgc2V0IChub3QgaW4gYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwZXJzaXN0RW52VmFycyh7XG4gKiAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gKiAgIEFQSV9LRVk6ICdzZWNyZXQnLFxuICogICBERUJVRzogJ2ZhbHNlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcnNpc3RFbnZWYXJzKHZhcnMpIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXModmFycykpIHtcbiAgICAgICAgcGVyc2lzdEVudlZhcihuYW1lLCB2YWx1ZSk7XG4gICAgfVxufVxuLyoqXG4gKiBFc2NhcGVzIGEgdmFsdWUgZm9yIHNhZmUgdXNlIGluIGEgc2hlbGwgZXhwb3J0IHN0YXRlbWVudC5cbiAqXG4gKiBVc2VzIHNpbmdsZSBxdW90ZXMgYW5kIGVzY2FwZXMgYW55IGVtYmVkZGVkIHNpbmdsZSBxdW90ZXMuXG4gKiBUaGlzIHByZXZlbnRzIHNoZWxsIGluamVjdGlvbiBhbmQgaGFuZGxlcyBzcGVjaWFsIGNoYXJhY3RlcnMuXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gZXNjYXBlXG4gKiBAcmV0dXJucyBUaGUgc2hlbGwtZXNjYXBlZCB2YWx1ZSAod2l0aCBxdW90ZXMpXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZXNjYXBlU2hlbGxWYWx1ZSh2YWx1ZSkge1xuICAgIC8vIFVzZSBzaW5nbGUgcXVvdGVzIGFuZCBlc2NhcGUgYW55IGVtYmVkZGVkIHNpbmdsZSBxdW90ZXNcbiAgICAvLyAndmFsdWUnIC0+ICd2YWwnXFwnJ3VlJyBmb3IgdmFsdWVzIGNvbnRhaW5pbmcgc2luZ2xlIHF1b3Rlc1xuICAgIGNvbnN0IGVzY2FwZWQgPSB2YWx1ZS5yZXBsYWNlKC8nL2csIFwiJ1xcXFwnJ1wiKTtcbiAgICByZXR1cm4gYCcke2VzY2FwZWR9J2A7XG59XG4iLCAiLyoqXG4gKiBIb29rIGZhY3RvcnkgZnVuY3Rpb25zIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBmYWN0b3J5IGZ1bmN0aW9ucyBmb3IgYWxsIDEyIGhvb2sgdHlwZXMgdGhhdCBoYW5kbGU6XG4gKiAtIElucHV0IHR5cGUgbmFycm93aW5nIGJhc2VkIG9uIGhvb2sgZXZlbnQgdHlwZVxuICogLSBPdXRwdXQgdHlwZSBlbmZvcmNlbWVudCB2aWEgcmV0dXJuIHR5cGVzXG4gKiAtIEVycm9yIHdyYXBwaW5nIHdpdGggYXV0b21hdGljIGxvZ2dpbmdcbiAqIC0gTG9nZ2VyIGNvbnRleHQgaW5qZWN0aW9uXG4gKlxuICogRWFjaCBmYWN0b3J5IGFjY2VwdHMgYSBIb29rQ29uZmlnIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dCBzZXR0aW5ncyxcbiAqIGFuZCByZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB0aGUgcnVudGltZSBpbnZva2VzIHdoZW4gdGhlIGhvb2sgZmlsZSBleGVjdXRlcy5cbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBHZW5lcmljIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIGhvb2sgZmFjdG9yeSBmdW5jdGlvbiBmb3IgYSBzcGVjaWZpYyBob29rIHR5cGUuXG4gKlxuICogVGhpcyBpcyB0aGUgaW50ZXJuYWwgaW1wbGVtZW50YXRpb24gdXNlZCBieSBhbGwgdHlwZWQgZmFjdG9yaWVzLlxuICogSXQgd3JhcHMgdGhlIGhhbmRsZXIgd2l0aCBlcnJvciBjYXRjaGluZyBhbmQgbG9nZ2luZy5cbiAqIEBwYXJhbSBob29rRXZlbnROYW1lIC0gVGhlIGhvb2sgZXZlbnQgbmFtZVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvblxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byB3cmFwXG4gKiBAcmV0dXJucyBBIHdyYXBwZWQgaG9vayBmdW5jdGlvblxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tGdW5jdGlvbihob29rRXZlbnROYW1lLCBjb25maWcsIGhhbmRsZXIpIHtcbiAgICBjb25zdCBob29rRm4gPSBhc3luYyAoaW5wdXQsIGNvbnRleHQpID0+IHtcbiAgICAgICAgLy8gRGVsZWdhdGUgZXJyb3IgaGFuZGxpbmcgdG8gdGhlIHJ1bnRpbWUgLSBqdXN0IGV4ZWN1dGUgdGhlIGhhbmRsZXJcbiAgICAgICAgLy8gVGhlIHJ1bnRpbWUgd2lsbCBjYXRjaCBlcnJvcnMsIGxvZyB0aGVtLCBhbmQgcmV0dXJuIGFwcHJvcHJpYXRlIG91dHB1dFxuICAgICAgICByZXR1cm4gYXdhaXQgaGFuZGxlcihpbnB1dCwgY29udGV4dCk7XG4gICAgfTtcbiAgICAvLyBBdHRhY2ggbWV0YWRhdGEgZm9yIHJ1bnRpbWUgaW5zcGVjdGlvblxuICAgIGhvb2tGbi5ob29rRXZlbnROYW1lID0gaG9va0V2ZW50TmFtZTtcbiAgICBob29rRm4ubWF0Y2hlciA9IGNvbmZpZy5tYXRjaGVyO1xuICAgIGhvb2tGbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gICAgcmV0dXJuIGhvb2tGbjtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZVRvb2xVc2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQcmVUb29sVXNlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0VG9vbFVzZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBvc3RUb29sVXNlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0VG9vbFVzZUZhaWx1cmVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQb3N0VG9vbFVzZUZhaWx1cmVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE5vdGlmaWNhdGlvbiBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIE5vdGlmaWNhdGlvbiBob29rIGhhbmRsZXIuXG4gKlxuICogTm90aWZpY2F0aW9uIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBzZW5kcyBhIG5vdGlmaWNhdGlvbiwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBGb3J3YXJkIG5vdGlmaWNhdGlvbnMgdG8gZXh0ZXJuYWwgc3lzdGVtc1xuICogLSBMb2cgaW1wb3J0YW50IGV2ZW50c1xuICogLSBUcmlnZ2VyIGN1c3RvbSBhbGVydGluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYG5vdGlmaWNhdGlvbl90eXBlYFxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IG5vdGlmaWNhdGlvbkhvb2ssIG5vdGlmaWNhdGlvbk91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gRm9yd2FyZCBub3RpZmljYXRpb25zIHRvIFNsYWNrXG4gKiBleHBvcnQgZGVmYXVsdCBub3RpZmljYXRpb25Ib29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ05vdGlmaWNhdGlvbiByZWNlaXZlZCcsIHtcbiAqICAgICB0eXBlOiBpbnB1dC5ub3RpZmljYXRpb25fdHlwZSxcbiAqICAgICB0aXRsZTogaW5wdXQudGl0bGVcbiAqICAgfSk7XG4gKlxuICogICBhd2FpdCBzZW5kU2xhY2tNZXNzYWdlKGlucHV0LnRpdGxlID8/ICdOb3RpZmljYXRpb24nLCBpbnB1dC5tZXNzYWdlKTtcbiAqXG4gKiAgIHJldHVybiBub3RpZmljYXRpb25PdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNub3RpZmljYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdGlmaWNhdGlvbkhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIk5vdGlmaWNhdGlvblwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVXNlclByb21wdFN1Ym1pdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFVzZXJQcm9tcHRTdWJtaXQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFVzZXJQcm9tcHRTdWJtaXQgaG9va3MgZmlyZSB3aGVuIGEgdXNlciBzdWJtaXRzIGEgcHJvbXB0LCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFkZCBhZGRpdGlvbmFsIGNvbnRleHQgb3IgaW5zdHJ1Y3Rpb25zXG4gKiAtIExvZyB1c2VyIGludGVyYWN0aW9uc1xuICogLSBWYWxpZGF0ZSBvciB0cmFuc2Zvcm0gcHJvbXB0c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgcHJvbXB0IHN1Ym1pc3Npb25zXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdXNlclByb21wdFN1Ym1pdEhvb2ssIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEFkZCBwcm9qZWN0IGNvbnRleHQgdG8gZXZlcnkgcHJvbXB0XG4gKiBleHBvcnQgZGVmYXVsdCB1c2VyUHJvbXB0U3VibWl0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5kZWJ1ZygnVXNlciBwcm9tcHQgc3VibWl0dGVkJywgeyBwcm9tcHRMZW5ndGg6IGlucHV0LnByb21wdC5sZW5ndGggfSk7XG4gKlxuICogICBjb25zdCBwcm9qZWN0Q29udGV4dCA9IGF3YWl0IGdldFByb2plY3RDb250ZXh0KCk7XG4gKlxuICogICByZXR1cm4gdXNlclByb21wdFN1Ym1pdE91dHB1dCh7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IHByb2plY3RDb250ZXh0XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN1c2VycHJvbXB0c3VibWl0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VyUHJvbXB0U3VibWl0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVXNlclByb21wdFN1Ym1pdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2Vzc2lvblN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2Vzc2lvblN0YXJ0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTZXNzaW9uU3RhcnQgaG9va3MgZmlyZSB3aGVuIGEgQ2xhdWRlIENvZGUgc2Vzc2lvbiBzdGFydHMgb3IgcmVzdGFydHMsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEluaXRpYWxpemUgc2Vzc2lvbiBzdGF0ZVxuICogLSBJbmplY3QgY29udGV4dCBvciBpbnN0cnVjdGlvbnNcbiAqIC0gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kc1xuICogLSBTZXQgdXAgbG9nZ2luZyBvciBtb25pdG9yaW5nXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgc291cmNlYCAoJ3N0YXJ0dXAnLCAncmVzdW1lJywgJ2NsZWFyJywgJ2NvbXBhY3QnKVxuICpcbiAqICoqQ29udGV4dCoqOiBTZXNzaW9uU3RhcnQgaG9va3MgcmVjZWl2ZSBhbiBleHRlbmRlZCBjb250ZXh0IHdpdGggYHBlcnNpc3RFbnZWYXJgXG4gKiBhbmQgYHBlcnNpc3RFbnZWYXJzYCBmdW5jdGlvbnMgZm9yIHNldHRpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25TdGFydEhvb2ssIHNlc3Npb25TdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHRoZSBzZXNzaW9uXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHsgbWF0Y2hlcjogJ3N0YXJ0dXAnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTmV3IHNlc3Npb24gc3RhcnRlZCcsIHtcbiAqICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gKiAgICAgY3dkOiBpbnB1dC5jd2RcbiAqICAgfSk7XG4gKlxuICogICAvLyBTZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ2RldmVsb3BtZW50Jyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ0RFQlVHJywgJ3RydWUnKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBTZXQgbXVsdGlwbGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIGF0IG9uY2VcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBwZXJzaXN0RW52VmFycyB9KSA9PiB7XG4gKiAgIHBlcnNpc3RFbnZWYXJzKHtcbiAqICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICogICAgIEFQSV9LRVk6ICdzZWNyZXQnLFxuICogICAgIERFQlVHOiAnZmFsc2UnXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Nlc3Npb25zdGFydFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvblN0YXJ0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2Vzc2lvblN0YXJ0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXNzaW9uRW5kIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2Vzc2lvbkVuZCBob29rIGhhbmRsZXIuXG4gKlxuICogU2Vzc2lvbkVuZCBob29rcyBmaXJlIHdoZW4gYSBDbGF1ZGUgQ29kZSBzZXNzaW9uIGVuZHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ2xlYW4gdXAgc2Vzc2lvbiByZXNvdXJjZXNcbiAqIC0gTG9nIHNlc3Npb24gbWV0cmljc1xuICogLSBQZXJzaXN0IHNlc3Npb24gc3RhdGVcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGByZWFzb25gICh0aGUgZXhpdCByZWFzb24gc3RyaW5nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25FbmRIb29rLCBzZXNzaW9uRW5kT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgc2Vzc2lvbiBlbmQgYW5kIGNsZWFuIHVwXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uRW5kSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTZXNzaW9uIGVuZGVkJywge1xuICogICAgIHNlc3Npb25JZDogaW5wdXQuc2Vzc2lvbl9pZCxcbiAqICAgICByZWFzb246IGlucHV0LnJlYXNvblxuICogICB9KTtcbiAqXG4gKiAgIGF3YWl0IGNsZWFudXBTZXNzaW9uUmVzb3VyY2VzKGlucHV0LnNlc3Npb25faWQpO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25FbmRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXNzaW9uZW5kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXNzaW9uRW5kSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2Vzc2lvbkVuZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RvcCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN0b3AgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN0b3AgaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIGlzIGFib3V0IHRvIHN0b3AsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQmxvY2sgdGhlIHN0b3AgYW5kIHJlcXVpcmUgYWRkaXRpb25hbCBhY3Rpb25cbiAqIC0gQ29uZmlybSB0aGUgdXNlciB3YW50cyB0byBzdG9wXG4gKiAtIENsZWFuIHVwIHJlc291cmNlcyBiZWZvcmUgc3RvcHBpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHN0b3AgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3RvcEhvb2ssIHN0b3BPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEJsb2NrIHN0b3AgaWYgdGhlcmUgYXJlIHBlbmRpbmcgY2hhbmdlc1xuICogZXhwb3J0IGRlZmF1bHQgc3RvcEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBjb25zdCBwZW5kaW5nQ2hhbmdlcyA9IGF3YWl0IGNoZWNrUGVuZGluZ0NoYW5nZXMoKTtcbiAqXG4gKiAgIGlmIChwZW5kaW5nQ2hhbmdlcy5sZW5ndGggPiAwKSB7XG4gKiAgICAgbG9nZ2VyLndhcm4oJ0Jsb2NraW5nIHN0b3AgZHVlIHRvIHBlbmRpbmcgY2hhbmdlcycsIHtcbiAqICAgICAgIGNvdW50OiBwZW5kaW5nQ2hhbmdlcy5sZW5ndGhcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICogICAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgICByZWFzb246IGBUaGVyZSBhcmUgJHtwZW5kaW5nQ2hhbmdlcy5sZW5ndGh9IHVuY29tbWl0dGVkIGNoYW5nZXNgLFxuICogICAgICAgc3lzdGVtTWVzc2FnZTogJ1BsZWFzZSBjb21taXQgb3IgZGlzY2FyZCBjaGFuZ2VzIGJlZm9yZSBzdG9wcGluZydcbiAqICAgICB9KTtcbiAqICAgfVxuICpcbiAqICAgbG9nZ2VyLmluZm8oJ0FwcHJvdmluZyBzdG9wJyk7XG4gKiAgIHJldHVybiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN0b3BcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN1YmFnZW50U3RhcnQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdWJhZ2VudFN0YXJ0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdWJhZ2VudFN0YXJ0IGhvb2tzIGZpcmUgd2hlbiBhIHN1YmFnZW50IChUYXNrIHRvb2wpIHN0YXJ0cywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBJbmplY3QgY29udGV4dCBmb3IgdGhlIHN1YmFnZW50XG4gKiAtIExvZyBzdWJhZ2VudCBpbnZvY2F0aW9uc1xuICogLSBDb25maWd1cmUgc3ViYWdlbnQgYmVoYXZpb3JcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBhZ2VudF90eXBlYCAoZS5nLiwgJ2V4cGxvcmUnLCAnY29kZWJhc2UtYW5hbHlzaXMnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN1YmFnZW50U3RhcnRIb29rLCBzdWJhZ2VudFN0YXJ0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBBZGQgY29udGV4dCBmb3IgZXhwbG9yZSBzdWJhZ2VudHNcbiAqIGV4cG9ydCBkZWZhdWx0IHN1YmFnZW50U3RhcnRIb29rKHsgbWF0Y2hlcjogJ2V4cGxvcmUnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnRXhwbG9yZSBzdWJhZ2VudCBzdGFydGluZycsIHtcbiAqICAgICBhZ2VudElkOiBpbnB1dC5hZ2VudF9pZCxcbiAqICAgICBhZ2VudFR5cGU6IGlucHV0LmFnZW50X3R5cGVcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gc3ViYWdlbnRTdGFydE91dHB1dCh7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGb2N1cyBvbiBmaW5kaW5nIHBhdHRlcm5zIGFuZCBjb252ZW50aW9ucydcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N1YmFnZW50c3RhcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN1YmFnZW50U3RhcnRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdWJhZ2VudFN0YXJ0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdWJhZ2VudFN0b3AgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdWJhZ2VudFN0b3AgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN1YmFnZW50U3RvcCBob29rcyBmaXJlIHdoZW4gYSBzdWJhZ2VudCBjb21wbGV0ZXMgb3Igc3RvcHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQmxvY2sgdGhlIHN1YmFnZW50IGZyb20gc3RvcHBpbmdcbiAqIC0gUHJvY2VzcyBzdWJhZ2VudCByZXN1bHRzXG4gKiAtIENsZWFuIHVwIHN1YmFnZW50IHJlc291cmNlc1xuICogLSBMb2cgc3ViYWdlbnQgY29tcGxldGlvblxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYGFnZW50X3R5cGVgIChlLmcuLCAnZXhwbG9yZScsICdjb2RlYmFzZS1hbmFseXNpcycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3ViYWdlbnRTdG9wSG9vaywgc3ViYWdlbnRTdG9wT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBCbG9jayBleHBsb3JlIHN1YmFnZW50cyBpZiB0YXNrIGluY29tcGxldGVcbiAqIGV4cG9ydCBkZWZhdWx0IHN1YmFnZW50U3RvcEhvb2soeyBtYXRjaGVyOiAnZXhwbG9yZScgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTdWJhZ2VudCBzdG9wcGluZycsIHtcbiAqICAgICBhZ2VudElkOiBpbnB1dC5hZ2VudF9pZCxcbiAqICAgICBhZ2VudFR5cGU6IGlucHV0LmFnZW50X3R5cGVcbiAqICAgfSk7XG4gKlxuICogICAvLyBCbG9jayBpZiB0cmFuc2NyaXB0IHNob3dzIGluY29tcGxldGUgd29ya1xuICogICByZXR1cm4gc3ViYWdlbnRTdG9wT3V0cHV0KHtcbiAqICAgICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgICByZWFzb246ICdQbGVhc2UgdmVyaWZ5IGV4cGxvcmF0aW9uIGlzIGNvbXBsZXRlJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3ViYWdlbnRzdG9wXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdWJhZ2VudFN0b3BIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdWJhZ2VudFN0b3BcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFByZUNvbXBhY3QgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBQcmVDb21wYWN0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBQcmVDb21wYWN0IGhvb2tzIGZpcmUgYmVmb3JlIGNvbnRleHQgY29tcGFjdGlvbiBvY2N1cnMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gUHJlc2VydmUgaW1wb3J0YW50IGluZm9ybWF0aW9uIGJlZm9yZSBjb21wYWN0aW9uXG4gKiAtIExvZyBjb21wYWN0aW9uIGV2ZW50c1xuICogLSBNb2RpZnkgY3VzdG9tIGluc3RydWN0aW9ucyBmb3IgdGhlIGNvbXBhY3RlZCBjb250ZXh0XG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdtYW51YWwnLCAnYXV0bycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcHJlQ29tcGFjdEhvb2ssIHByZUNvbXBhY3RPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyBjb21wYWN0aW9uIGV2ZW50cyBhbmQgcHJlc2VydmUgY29udGV4dFxuICogZXhwb3J0IGRlZmF1bHQgcHJlQ29tcGFjdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnQ29udGV4dCBjb21wYWN0aW9uIHRyaWdnZXJlZCcsIHtcbiAqICAgICB0cmlnZ2VyOiBpbnB1dC50cmlnZ2VyLFxuICogICAgIGhhc0N1c3RvbUluc3RydWN0aW9uczogaW5wdXQuY3VzdG9tX2luc3RydWN0aW9ucyAhPT0gbnVsbFxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBwcmVDb21wYWN0T3V0cHV0KHtcbiAqICAgICBzeXN0ZW1NZXNzYWdlOiAnUmVtZW1iZXI6IHN0cmljdCBtb2RlIGlzIGVuYWJsZWQnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBPbmx5IGhhbmRsZSBtYW51YWwgY29tcGFjdGlvblxuICogZXhwb3J0IGRlZmF1bHQgcHJlQ29tcGFjdEhvb2soeyBtYXRjaGVyOiAnbWFudWFsJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ01hbnVhbCBjb21wYWN0aW9uIHJlcXVlc3RlZCcpO1xuICogICByZXR1cm4gcHJlQ29tcGFjdE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3ByZWNvbXBhY3RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZUNvbXBhY3RIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQcmVDb21wYWN0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJtaXNzaW9uUmVxdWVzdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBlcm1pc3Npb25SZXF1ZXN0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXR1cCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNldHVwIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTZXR1cCBob29rcyBmaXJlIGR1cmluZyBpbml0aWFsaXphdGlvbiBvciBtYWludGVuYW5jZSwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBDb25maWd1cmUgaW5pdGlhbCBzZXNzaW9uIHN0YXRlXG4gKiAtIFBlcmZvcm0gc2V0dXAgdGFza3MgYmVmb3JlIHRoZSBzZXNzaW9uIHN0YXJ0c1xuICogLSBBZGQgY29udGV4dCBmb3IgbWFpbnRlbmFuY2Ugb3BlcmF0aW9uc1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHRyaWdnZXJgICgnaW5pdCcgb3IgJ21haW50ZW5hbmNlJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXR1cEhvb2ssIHNldHVwT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBIYW5kbGUgYWxsIHNldHVwIGV2ZW50c1xuICogZXhwb3J0IGRlZmF1bHQgc2V0dXBIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1NldHVwIHRyaWdnZXJlZCcsIHsgdHJpZ2dlcjogaW5wdXQudHJpZ2dlciB9KTtcbiAqICAgcmV0dXJuIHNldHVwT3V0cHV0KHt9KTtcbiAqIH0pO1xuICpcbiAqIC8vIE9ubHkgaGFuZGxlIGluaXRpYWxpemF0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCBzZXR1cEhvb2soeyBtYXRjaGVyOiAnaW5pdCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdJbml0aWFsaXppbmcgc2Vzc2lvbicpO1xuICogICByZXR1cm4gc2V0dXBPdXRwdXQoe1xuICogICAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdTZXNzaW9uIGluaXRpYWxpemVkIHdpdGggY3VzdG9tIGNvbmZpZ3VyYXRpb24nXG4gKiAgICAgfVxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2V0dXBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2V0dXBcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFRlYW1tYXRlSWRsZSBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFRlYW1tYXRlSWRsZSBob29rIGhhbmRsZXIuXG4gKlxuICogVGVhbW1hdGVJZGxlIGhvb2tzIGZpcmUgd2hlbiBhIHRlYW1tYXRlIGluIGEgdGVhbSBpcyBhYm91dCB0byBnbyBpZGxlLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBBc3NpZ24gd29yayB0byBpZGxlIHRlYW1tYXRlc1xuICogLSBMb2cgdGVhbSBhY3Rpdml0eVxuICogLSBDb29yZGluYXRlIG11bHRpLWFnZW50IHdvcmtmbG93c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgdGVhbW1hdGUgaWRsZSBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyB0ZWFtbWF0ZUlkbGVIb29rLCB0ZWFtbWF0ZUlkbGVPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyB3aGVuIHRlYW1tYXRlcyBnbyBpZGxlXG4gKiBleHBvcnQgZGVmYXVsdCB0ZWFtbWF0ZUlkbGVIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1RlYW1tYXRlIGdvaW5nIGlkbGUnLCB7XG4gKiAgICAgdGVhbW1hdGVOYW1lOiBpbnB1dC50ZWFtbWF0ZV9uYW1lLFxuICogICAgIHRlYW1OYW1lOiBpbnB1dC50ZWFtX25hbWVcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gdGVhbW1hdGVJZGxlT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdGVhbW1hdGVpZGxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZWFtbWF0ZUlkbGVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJUZWFtbWF0ZUlkbGVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFRhc2tDb21wbGV0ZWQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBUYXNrQ29tcGxldGVkIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBUYXNrQ29tcGxldGVkIGhvb2tzIGZpcmUgd2hlbiBhIHRhc2sgaXMgYmVpbmcgbWFya2VkIGFzIGNvbXBsZXRlZCxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gVmVyaWZ5IHRhc2sgY29tcGxldGlvblxuICogLSBMb2cgdGFzayBtZXRyaWNzXG4gKiAtIFRyaWdnZXIgZm9sbG93LXVwIGFjdGlvbnNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHRhc2sgY29tcGxldGlvbiBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyB0YXNrQ29tcGxldGVkSG9vaywgdGFza0NvbXBsZXRlZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHRhc2sgY29tcGxldGlvblxuICogZXhwb3J0IGRlZmF1bHQgdGFza0NvbXBsZXRlZEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnVGFzayBjb21wbGV0ZWQnLCB7XG4gKiAgICAgdGFza0lkOiBpbnB1dC50YXNrX2lkLFxuICogICAgIHRhc2tTdWJqZWN0OiBpbnB1dC50YXNrX3N1YmplY3RcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gdGFza0NvbXBsZXRlZE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Rhc2tjb21wbGV0ZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRhc2tDb21wbGV0ZWRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJUYXNrQ29tcGxldGVkXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4iLCAiLyoqXG4gKiBMb2dnZXIgc3lzdGVtIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyBzdHJ1Y3R1cmVkIGxvZ2dpbmcgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIG9wdGlvbmFsIGZpbGUgb3V0cHV0LlxuICogVGhlIGxvZ2dlciBpcyAqKnNpbGVudCBieSBkZWZhdWx0KiogdG8gYXZvaWQgaW50ZXJmZXJpbmcgd2l0aCBob29rIHByb3RvY29sXG4gKiAoc3Rkb3V0IGlzIHJlc2VydmVkIGZvciBKU09OIHJlc3BvbnNlcywgc3RkZXJyIG1heSBjb25mbGljdCB3aXRoIENsYXVkZSBDb2RlKS5cbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBsb2cgZXZlbnRzXG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAqICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gJHtldmVudC5ob29rVHlwZX06ICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAqIH0pO1xuICpcbiAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICogdW5zdWJzY3JpYmUoKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmltcG9ydCB7IGNsb3NlU3luYywgZXhpc3RzU3luYywgbWtkaXJTeW5jLCBvcGVuU3luYywgd3JpdGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG4vKipcbiAqIEFsbCBsb2cgbGV2ZWxzIGluIG9yZGVyIG9mIHNldmVyaXR5IChsb3dlc3QgdG8gaGlnaGVzdCkuXG4gKi9cbmV4cG9ydCBjb25zdCBMT0dfTEVWRUxTID0gW1wiZGVidWdcIiwgXCJpbmZvXCIsIFwid2FyblwiLCBcImVycm9yXCJdO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIENsYXNzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIExvZ2dlciBmb3IgQ2xhdWRlIENvZGUgaG9va3Mgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIGZpbGUgb3V0cHV0LlxuICpcbiAqICMjIEtleSBCZWhhdmlvcnNcbiAqXG4gKiB8IENvbmZpZ3VyYXRpb24gfCBCZWhhdmlvciB8XG4gKiB8LS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLXxcbiAqIHwgTm8gY29uZmlnIChkZWZhdWx0KSB8ICoqU2lsZW50KiogLSBubyBvdXRwdXQgYW55d2hlcmUgfFxuICogfCBgQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVgIGVudiB2YXIgfCBBcHBlbmQgSlNPTiBsaW5lcyB0byBmaWxlIHxcbiAqIHwgYC5vbihsZXZlbCwgaGFuZGxlcilgIHJlZ2lzdGVyZWQgfCBFdmVudHMgZGVsaXZlcmVkIHRvIGhhbmRsZXJzIG9ubHkgfFxuICogfCBNdWx0aXBsZSBkZXN0aW5hdGlvbnMgfCBBbGwgZGVzdGluYXRpb25zIHJlY2VpdmUgZXZlbnRzIHxcbiAqXG4gKiAjIyBJbXBvcnRhbnQgTm90ZXNcbiAqXG4gKiAtICoqTmV2ZXIgb3V0cHV0cyB0byBzdGRvdXQqKiAocmVzZXJ2ZWQgZm9yIEpTT04gaG9vayByZXNwb25zZSlcbiAqIC0gKipOZXZlciBvdXRwdXRzIHRvIHN0ZGVycioqIChtYXkgaW50ZXJmZXJlIHdpdGggQ2xhdWRlIENvZGUgZXJyb3IgaGFuZGxpbmcpXG4gKiAtIEZpbGUgb3V0cHV0IHVzZXMgSlNPTiBMaW5lcyBmb3JtYXQgZm9yIGVhc3kgcGFyc2luZ1xuICogLSBgLm9uKGxldmVsLCBoYW5kbGVyKWAgcmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvblxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGV2ZW50cyBhdCBzcGVjaWZpYyBsZXZlbFxuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiB7XG4gKiAgIHNlbmRBbGVydChldmVudC5tZXNzYWdlKTtcbiAqIH0pO1xuICpcbiAqIC8vIExvZyB3aXRoaW4gYSBob29rIGhhbmRsZXJcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIud2FybignQWJvdXQgdG8gdmFsaWRhdGUgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmVkIGV2ZW50IGhhbmRsZXJzIGJ5IGxvZyBsZXZlbC5cbiAgICAgKi9cbiAgICBoYW5kbGVycyA9IG5ldyBNYXAoKTtcbiAgICAvKipcbiAgICAgKiBGaWxlIGRlc2NyaXB0b3IgZm9yIGxvZyBmaWxlIG91dHB1dC5cbiAgICAgKiBMYXppbHkgaW5pdGlhbGl6ZWQgb24gZmlyc3Qgd3JpdGUuXG4gICAgICovXG4gICAgbG9nRmlsZUZkID0gbnVsbDtcbiAgICAvKipcbiAgICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgaWYgY29uZmlndXJlZC5cbiAgICAgKi9cbiAgICBsb2dGaWxlUGF0aCA9IG51bGw7XG4gICAgLyoqXG4gICAgICogV2hldGhlciBmaWxlIGluaXRpYWxpemF0aW9uIGhhcyBiZWVuIGF0dGVtcHRlZC5cbiAgICAgKi9cbiAgICBmaWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAgICovXG4gICAgY3VycmVudEhvb2tUeXBlO1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgaG9vayBpbnB1dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAgICovXG4gICAgY3VycmVudElucHV0O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgTG9nZ2VyIGluc3RhbmNlLlxuICAgICAqXG4gICAgICogVHlwaWNhbGx5IHlvdSBzaG91bGQgdXNlIHRoZSBleHBvcnRlZCBgbG9nZ2VyYCBzaW5nbGV0b24gcmF0aGVyIHRoYW5cbiAgICAgKiBjcmVhdGluZyBuZXcgaW5zdGFuY2VzLlxuICAgICAqIEBwYXJhbSBjb25maWcgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gVXNlIHNpbmdsZXRvbiAocmVjb21tZW5kZWQpXG4gICAgICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAgICAgKlxuICAgICAqIC8vIE9yIGNyZWF0ZSBjdXN0b20gaW5zdGFuY2VcbiAgICAgKiBjb25zdCBjdXN0b21Mb2dnZXIgPSBuZXcgTG9nZ2VyKHsgbG9nRmlsZVBhdGg6ICcvdmFyL2xvZy9ob29rcy5sb2cnIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbmZpZyA9IHt9KSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnMgbWFwIGZvciBlYWNoIGxldmVsXG4gICAgICAgIGZvciAoY29uc3QgbGV2ZWwgb2YgTE9HX0xFVkVMUykge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVycy5zZXQobGV2ZWwsIG5ldyBTZXQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IGxvZyBmaWxlIHBhdGggZnJvbSBjb25maWcgb3IgZW52aXJvbm1lbnRcbiAgICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGNvbmZpZy5sb2dGaWxlUGF0aCA/PyBwcm9jZXNzLmVudi5DTEFVREVfQ09ERV9IT09LU19MT0dfRklMRSA/PyBudWxsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRoYXQgaXMgdHlwaWNhbGx5IG9ubHkgdXNlZnVsXG4gICAgICogZHVyaW5nIGRldmVsb3BtZW50IG9yIHRyb3VibGVzaG9vdGluZy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBkZWJ1ZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgaW5wdXRTaXplOiAyNTYgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZGVidWcobWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJkZWJ1Z1wiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIGxpa2UgaG9vayBpbnZvY2F0aW9ucywgc3VjY2Vzc2Z1bFxuICAgICAqIGNvbXBsZXRpb25zLCBvciBzdGF0ZSBjaGFuZ2VzLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGluZm8gbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmluZm8oJ1Nlc3Npb24gc3RhcnRlZCcsIHsgc291cmNlOiAnc3RhcnR1cCcsIHNlc3Npb25JZDogJ2FiYzEyMycgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgaW5mbyhtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImluZm9cIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgaXNzdWVzIGJ1dCBkb24ndCBwcmV2ZW50XG4gICAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgd2FybmluZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIud2FybignRGVwcmVjYXRlZCBob29rIHBhdHRlcm4gZGV0ZWN0ZWQnLCB7IHBhdHRlcm46ICdsZWdhY3lNYXRjaGVyJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICB3YXJuKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwid2FyblwiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBlcnJvciBjb25kaXRpb25zIHRoYXQgcmVxdWlyZSBhdHRlbnRpb24gYnV0IHdlcmUgaGFuZGxlZFxuICAgICAqIGdyYWNlZnVsbHkuIEZvciBleGNlcHRpb25zLCBwcmVmZXIge0BsaW5rIGxvZ0Vycm9yfS5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBlcnJvciBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byB2YWxpZGF0ZSB0b29sIGlucHV0JywgeyB0b29sTmFtZTogJ0Jhc2gnLCByZWFzb246ICdlbXB0eSBjb21tYW5kJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBlcnJvcihtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImVycm9yXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICAgKlxuICAgICAqIFVzZSB0aGlzIG1ldGhvZCB3aGVuIGxvZ2dpbmcgY2F1Z2h0IGV4Y2VwdGlvbnMgdG8gY2FwdHVyZSB0aGUgZnVsbFxuICAgICAqIGVycm9yIGNvbnRleHQgaW5jbHVkaW5nIG5hbWUsIG1lc3NhZ2UsIHN0YWNrIHRyYWNlLCBhbmQgY2F1c2UgY2hhaW4uXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHRyeSB7XG4gICAgICogICBhd2FpdCBkYW5nZXJvdXNPcGVyYXRpb24oKTtcbiAgICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICAgKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdGYWlsZWQgdG8gZXhlY3V0ZSBkYW5nZXJvdXMgb3BlcmF0aW9uJywge1xuICAgICAqICAgICBvcGVyYXRpb246ICdkZWxldGUnLFxuICAgICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgICAqICAgfSk7XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGxvZ0Vycm9yKGVycm9yLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGVycm9ySW5mbyA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvcik7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbDogXCJlcnJvclwiLFxuICAgICAgICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgICAgICAgIGVycm9yOiBlcnJvckluZm8sXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZXMgYSBoYW5kbGVyIHRvIGxvZyBldmVudHMgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKlxuICAgICAqIFRoZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBsb2cgZXZlbnQgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBoYW5kbGVyXG4gICAgICogaXMgbm8gbG9uZ2VyIG5lZWRlZC5cbiAgICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgbG9nIGxldmVsIHRvIHN1YnNjcmliZSB0b1xuICAgICAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBldmVudFxuICAgICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgdGhlIGhhbmRsZXJcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBTdWJzY3JpYmUgdG8gZXJyb3IgZXZlbnRzXG4gICAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gICAgICogICBjb25zb2xlLmVycm9yKGBbJHtldmVudC5ob29rVHlwZX1dICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAgICAgKiAgIGlmIChldmVudC5lcnJvcikge1xuICAgICAqICAgICBjb25zb2xlLmVycm9yKGV2ZW50LmVycm9yLnN0YWNrKTtcbiAgICAgKiAgIH1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICAgICAqIHVuc3Vic2NyaWJlKCk7XG4gICAgICogYGBgXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIGxpYnJhcnlcbiAgICAgKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAgICAgKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubygpO1xuICAgICAqXG4gICAgICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBvbihsZXZlbCwgaGFuZGxlcikge1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQobGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgbGV2ZWxIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGxldmVsSGFuZGxlcnM/LmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqXG4gICAgICogVGhpcyBpcyBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBiZWZvcmUgaW52b2tpbmcgaG9vayBoYW5kbGVycy5cbiAgICAgKiBZb3UgdHlwaWNhbGx5IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIGRpcmVjdGx5LlxuICAgICAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSB0eXBlIG9mIGhvb2sgYmVpbmcgZXhlY3V0ZWRcbiAgICAgKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCBkYXRhXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgc2V0Q29udGV4dChob29rVHlwZSwgaW5wdXQpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSBob29rVHlwZTtcbiAgICAgICAgdGhpcy5jdXJyZW50SW5wdXQgPSBpbnB1dDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dC5cbiAgICAgKlxuICAgICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBjbGVhckNvbnRleHQoKSB7XG4gICAgICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29uZmlndXJlcyB0aGUgbG9nIGZpbGUgcGF0aCBhdCBydW50aW1lLlxuICAgICAqXG4gICAgICogQ2FsbCB0aGlzIHRvIGVuYWJsZSBvciBjaGFuZ2UgZmlsZSBsb2dnaW5nLiBTZXR0aW5nIHRvIGBudWxsYCBkaXNhYmxlc1xuICAgICAqIGZpbGUgbG9nZ2luZyAoYnV0IGRvZXNuJ3QgY2xvc2UgZXhpc3RpbmcgZmlsZSBoYW5kbGUgaW1tZWRpYXRlbHkpLlxuICAgICAqIEBwYXJhbSBmaWxlUGF0aCAtIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBvciBudWxsIHRvIGRpc2FibGVcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBFbmFibGUgZmlsZSBsb2dnaW5nIGF0IHJ1bnRpbWVcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZSgnL3Zhci9sb2cvY2xhdWRlLWhvb2tzLmxvZycpO1xuICAgICAqXG4gICAgICogLy8gRGlzYWJsZSBmaWxlIGxvZ2dpbmdcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZShudWxsKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBzZXRMb2dGaWxlKGZpbGVQYXRoKSB7XG4gICAgICAgIC8vIENsb3NlIGV4aXN0aW5nIGZpbGUgaWYgb3BlblxuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZXMgYWxsIHJlc291cmNlcyBoZWxkIGJ5IHRoZSBsb2dnZXIuXG4gICAgICpcbiAgICAgKiBDYWxsIHRoaXMgZHVyaW5nIGdyYWNlZnVsIHNodXRkb3duIHRvIGVuc3VyZSBhbGwgbG9nIGRhdGEgaXMgZmx1c2hlZC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgICAqICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgICogfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlcmUgYXJlIGFueSBhY3RpdmUgaGFuZGxlcnMgb3IgZGVzdGluYXRpb25zLlxuICAgICAqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIGFueSBoYW5kbGVycyBhcmUgcmVnaXN0ZXJlZCBvciBmaWxlIGxvZ2dpbmcgaXMgZW5hYmxlZC5cbiAgICAgKiBAcmV0dXJucyBXaGV0aGVyIHRoZSBsb2dnZXIgaGFzIGFueSBhY3RpdmUgb3V0cHV0IGRlc3RpbmF0aW9uc1xuICAgICAqL1xuICAgIGhhc0Rlc3RpbmF0aW9ucygpIHtcbiAgICAgICAgZm9yIChjb25zdCBoYW5kbGVycyBvZiB0aGlzLmhhbmRsZXJzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoaGFuZGxlcnMuc2l6ZSA+IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMubG9nRmlsZVBhdGggIT09IG51bGw7XG4gICAgfVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBQcml2YXRlIE1ldGhvZHNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLyoqXG4gICAgICogRW1pdHMgYSBsb2cgZXZlbnQuXG4gICAgICogQHBhcmFtIGxldmVsIC0gVGhlIHNldmVyaXR5IGxldmVsIG9mIHRoZSBldmVudFxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGxvZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHQgZGF0YVxuICAgICAqL1xuICAgIGVtaXQobGV2ZWwsIG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGxldmVsLFxuICAgICAgICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgICAgICAgIGNvbnRleHQsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRGVsaXZlcnMgYW4gZXZlbnQgdG8gYWxsIHJlZ2lzdGVyZWQgZGVzdGluYXRpb25zLlxuICAgICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gZGVsaXZlclxuICAgICAqL1xuICAgIGRlbGl2ZXJFdmVudChldmVudCkge1xuICAgICAgICAvLyBEZWxpdmVyIHRvIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChldmVudC5sZXZlbCk7XG4gICAgICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgbGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXIoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBoYW5kbGVyIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBXcml0ZSB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICAgICAgdGhpcy53cml0ZVRvRmlsZShldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdyaXRlcyBhbiBldmVudCB0byB0aGUgbG9nIGZpbGUuXG4gICAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byB3cml0ZVxuICAgICAqL1xuICAgIHdyaXRlVG9GaWxlKGV2ZW50KSB7XG4gICAgICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gTGF6eSBpbml0aWFsaXphdGlvbiBvZiBmaWxlIGhhbmRsZVxuICAgICAgICBpZiAoIXRoaXMuZmlsZUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGaWxlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkID09PSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbGluZSA9IGAke0pTT04uc3RyaW5naWZ5KGV2ZW50KX1cXG5gO1xuICAgICAgICAgICAgd3JpdGVTeW5jKHRoaXMubG9nRmlsZUZkLCBsaW5lKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSB3cml0ZSBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgICAgICAgIC8vIFRoaXMgZm9sbG93cyB0aGUgcmlzayBtaXRpZ2F0aW9uOiBcIkdyYWNlZnVsIGRlZ3JhZGF0aW9uIC0gbG9nIHdyaXRlXG4gICAgICAgICAgICAvLyBmYWlsdXJlcyBhcmUgc2lsZW50bHkgaWdub3JlZCB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblwiXG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGxvZyBmaWxlIGZvciB3cml0aW5nLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWxlKCkge1xuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEVuc3VyZSBkaXJlY3RvcnkgZXhpc3RzXG4gICAgICAgICAgICBjb25zdCBkaXIgPSBkaXJuYW1lKHRoaXMubG9nRmlsZVBhdGgpO1xuICAgICAgICAgICAgaWYgKCFleGlzdHNTeW5jKGRpcikpIHtcbiAgICAgICAgICAgICAgICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE9wZW4gZmlsZSBmb3IgYXBwZW5kaW5nXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG9wZW5TeW5jKHRoaXMubG9nRmlsZVBhdGgsIFwiYVwiKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSBpbml0aWFsaXphdGlvbiBlcnJvcnNcbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyBzdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uIGZyb20gYW4gdW5rbm93biBlcnJvci5cbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tXG4gICAgICogQHJldHVybnMgU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGV4dHJhY3RFcnJvckluZm8oZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogZXJyb3IubmFtZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgICAgIHN0YWNrOiBlcnJvci5zdGFjayxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBFeHRyYWN0IGNhdXNlIGNoYWluIGlmIHByZXNlbnRcbiAgICAgICAgICAgIGlmIChlcnJvci5jYXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgaW5mby5jYXVzZSA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvci5jYXVzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaW5mbztcbiAgICAgICAgfVxuICAgICAgICAvLyBIYW5kbGUgbm9uLUVycm9yIHZhbHVlc1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogXCJVbmtub3duRXJyb3JcIixcbiAgICAgICAgICAgIG1lc3NhZ2U6IFN0cmluZyhlcnJvciksXG4gICAgICAgIH07XG4gICAgfVxufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2luZ2xldG9uIEV4cG9ydFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBHbG9iYWwgbG9nZ2VyIGluc3RhbmNlIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBVc2UgdGhpcyBzaW5nbGV0b24gZm9yIGFsbCBsb2dnaW5nIHdpdGhpbiBob29rcy4gVGhlIGxvZ2dlciBpcyBjb25maWd1cmVkXG4gKiB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCBzdXBwb3J0cyBldmVudCBzdWJzY3JpcHRpb24gZm9yIGN1c3RvbVxuICogZGVzdGluYXRpb25zLlxuICpcbiAqICMjIENvbmZpZ3VyYXRpb25cbiAqXG4gKiB8IEVudmlyb25tZW50IFZhcmlhYmxlIHwgRGVzY3JpcHRpb24gfFxuICogfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfFxuICogfCBgQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVgIHwgUGF0aCB0byBsb2cgZmlsZSAoSlNPTiBMaW5lcyBmb3JtYXQpIHxcbiAqXG4gKiAjIyBVc2FnZSBpbiBIb29rc1xuICpcbiAqIFRoZSBsb2dnZXIgaXMgcGFzc2VkIHRvIGhvb2sgaGFuZGxlcnMgdmlhIGNvbnRleHQgZm9yIGNvbnZlbmllbmNlOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIud2FybignVmFsaWRhdGluZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogIyMgRXh0ZXJuYWwgSW50ZWdyYXRpb25cbiAqXG4gKiBTdWJzY3JpYmUgdG8gZXZlbnRzIHRvIGZvcndhcmQgbG9ncyB0byBleHRlcm5hbCBzeXN0ZW1zOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAqXG4gKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubyh7IGxldmVsOiAnZGVidWcnIH0pO1xuICpcbiAqIGxvZ2dlci5vbignZGVidWcnLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZGVidWcoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRGlyZWN0IHVzYWdlXG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGxvZ2dlci5pbmZvKCdTdGFydGluZyBvcGVyYXRpb24nKTtcbiAqIGxvZ2dlci53YXJuKCdSZXNvdXJjZSBsaW1pdCBhcHByb2FjaGluZycsIHsgdXNhZ2U6IDAuOSB9KTtcbiAqXG4gKiB0cnkge1xuICogICBhd2FpdCByaXNreU9wZXJhdGlvbigpO1xuICogfSBjYXRjaCAoZXJyKSB7XG4gKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdSaXNreSBvcGVyYXRpb24gZmFpbGVkJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcbiIsICIvKipcbiAqIE91dHB1dCB0eXBlcyBhbmQgYnVpbGRlcnMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGUtc2FmZSBvdXRwdXQgYnVpbGRlciBmdW5jdGlvbnMgZm9yIGFsbCAxMiBob29rIHR5cGVzLiBFYWNoIGJ1aWxkZXJcbiAqIGFjY2VwdHMgb3B0aW9ucyB0aGF0IG1hdGNoIHRoZSB3aXJlIGZvcm1hdCBleHBlY3RlZCBieSBDbGF1ZGUgQ29kZSwgd2l0aCB0eXBlc1xuICogZGVyaXZlZCBmcm9tIHRoZSBDbGF1ZGUgQWdlbnQgU0RLJ3MgYFN5bmNIb29rSlNPTk91dHB1dGAgdHlwZS5cbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICogQG1vZHVsZVxuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGl0IENvZGUgQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEV4aXQgY29kZXMgdXNlZCBieSBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiB8IEV4aXQgQ29kZSB8IE5hbWUgfCBXaGVuIFVzZWQgfCBDbGF1ZGUgQ29kZSBCZWhhdmlvciB8XG4gKiB8LS0tLS0tLS0tLS18LS0tLS0tfC0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXxcbiAqIHwgMCB8IFN1Y2Nlc3MgfCBIYW5kbGVyIHJldHVybnMgbm9ybWFsbHkgfCBDb250aW51ZSwgcGFyc2Ugc3Rkb3V0IGFzIEpTT04gfFxuICogfCAxIHwgRXJyb3IgfCBJbnZhbGlkIGlucHV0LCBub24tYmxvY2tpbmcgZXJyb3IgfCBOb24tYmxvY2tpbmcsIHN0ZGVyciB0byB1c2VyIG9ubHkgfFxuICogfCAyIHwgQmxvY2sgfCBIYW5kbGVyIHRocm93cyBPUiBgc3RvcFJlYXNvbmAgc2V0IHwgQmxvY2tpbmcsIHN0ZGVyciBzaG93biB0byBDbGF1ZGUgfFxuICovXG5leHBvcnQgY29uc3QgRVhJVF9DT0RFUyA9IHtcbiAgICAvKiogSGFuZGxlciBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LiBDbGF1ZGUgQ29kZSBwYXJzZXMgc3Rkb3V0IGFzIEpTT04uICovXG4gICAgU1VDQ0VTUzogMCxcbiAgICAvKiogTm9uLWJsb2NraW5nIGVycm9yIG9jY3VycmVkIChlLmcuLCBpbnZhbGlkIGlucHV0KS4gc3RkZXJyIHNob3duIHRvIHVzZXIgb25seS4gKi9cbiAgICBFUlJPUjogMSxcbiAgICAvKiogSGFuZGxlciB0aHJldyBleGNlcHRpb24gT1IgYmxvY2tpbmcgYWN0aW9uIHJlcXVlc3RlZC4gc3RkZXJyIHNob3duIHRvIENsYXVkZS4gKi9cbiAgICBCTE9DSzogMixcbn07XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBPdXRwdXQgQnVpbGRlciBGYWN0b3JpZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCBoYXZlIGhvb2tTcGVjaWZpY091dHB1dCB3aXRoIGEgaG9va0V2ZW50TmFtZSBkaXNjcmltaW5hdG9yLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+IHtcbiAgICAgICAgY29uc3QgeyBob29rU3BlY2lmaWNPdXRwdXQsIC4uLnJlc3QgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHN0ZG91dCA9IGhvb2tTcGVjaWZpY091dHB1dCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IHsgLi4ucmVzdCwgaG9va1NwZWNpZmljT3V0cHV0OiB7IGhvb2tFdmVudE5hbWU6IGhvb2tUeXBlLCAuLi5ob29rU3BlY2lmaWNPdXRwdXQgfSB9XG4gICAgICAgICAgICA6IHJlc3Q7XG4gICAgICAgIHJldHVybiB7IF90eXBlOiBob29rVHlwZSwgc3Rkb3V0IH07XG4gICAgfTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCBvbmx5IHVzZSBDb21tb25PcHRpb25zIChzaW1wbGUgcGFzc3Rocm91Z2gpLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiBvcHRpb25zLFxuICAgIH0pO1xufVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IHVzZSBkZWNpc2lvbi1iYXNlZCBvcHRpb25zIChTdG9wLCBTdWJhZ2VudFN0b3ApLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4gKHtcbiAgICAgICAgX3R5cGU6IGhvb2tUeXBlLFxuICAgICAgICBzdGRvdXQ6IG9wdGlvbnMsXG4gICAgfSk7XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGV4aXQtY29kZS1iYXNlZCBob29rcyAoVGVhbW1hdGVJZGxlLCBUYXNrQ29tcGxldGVkKS5cbiAqXG4gKiBUaGVzZSBob29rcyBkb24ndCB1c2UgSlNPTiBkZWNpc2lvbiBjb250cm9sIChubyBDb21tb25PcHRpb25zKS5cbiAqIFRoZSBvbmx5IG9wdGlvbiBpcyBgc3RkZXJyYCBcdTIwMTQgd2hlbiBwcmVzZW50LCBpdCB0cmlnZ2VycyBleGl0IGNvZGUgMiAoQkxPQ0spLlxuICogU3Rkb3V0IGFsd2F5cyByZWNlaXZlcyBge31gIChlbXB0eSBKU09OIG9iamVjdCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUV4aXRDb2RlT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAoeyBzdGRlcnIgfSA9IHt9KSA9PiAoe1xuICAgICAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgICAgIHN0ZG91dDoge30sXG4gICAgICAgIC4uLihzdGRlcnIgIT09IHVuZGVmaW5lZCA/IHsgc3RkZXJyIH0gOiB7fSksXG4gICAgfSk7XG59XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQcmVUb29sVXNlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQcmVUb29sVXNlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0b29sIGV4ZWN1dGlvblxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfVxuICogfSk7XG4gKlxuICogLy8gRGVueSB3aXRoIHJlYXNvblxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2RlbnknLFxuICogICAgIHBlcm1pc3Npb25EZWNpc2lvblJlYXNvbjogJ0Rhbmdlcm91cyBjb21tYW5kIGRldGVjdGVkJ1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBbGxvdyB3aXRoIG1vZGlmaWVkIGlucHV0XG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnLFxuICogICAgIHVwZGF0ZWRJbnB1dDogeyBjb21tYW5kOiAnbHMgLWxhJyB9XG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwcmVUb29sVXNlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQcmVUb29sVXNlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdFRvb2xVc2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RUb29sVXNlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBZGQgY29udGV4dCBhZnRlciBhIGZpbGUgcmVhZFxuICogcG9zdFRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZpbGUgY29udGFpbnMgc2Vuc2l0aXZlIGRhdGEnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwb3N0VG9vbFVzZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUG9zdFRvb2xVc2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0VG9vbFVzZUZhaWx1cmUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdUcnkgdXNpbmcgYSBkaWZmZXJlbnQgYXBwcm9hY2gnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBvc3RUb29sVXNlRmFpbHVyZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFVzZXJQcm9tcHRTdWJtaXQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1RoaXMgcHJvamVjdCB1c2VzIFR5cGVTY3JpcHQgc3RyaWN0IG1vZGUnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB1c2VyUHJvbXB0U3VibWl0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJVc2VyUHJvbXB0U3VibWl0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXNzaW9uU3RhcnRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHNlc3Npb25TdGFydE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiBKU09OLnN0cmluZ2lmeSh7IHByb2plY3Q6ICdteS1wcm9qZWN0JyB9KVxuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2Vzc2lvblN0YXJ0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJTZXNzaW9uU3RhcnRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXNzaW9uRW5kIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXNzaW9uRW5kT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzZXNzaW9uRW5kT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2Vzc2lvbkVuZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiU2Vzc2lvbkVuZFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN0b3AgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN0b3BPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRoZSBzdG9wXG4gKiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAqXG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3RvcE91dHB1dCh7XG4gKiAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICByZWFzb246ICdUaGVyZSBhcmUgdW5jb21taXR0ZWQgY2hhbmdlcydcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdG9wT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihcIlN0b3BcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdWJhZ2VudFN0YXJ0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdWJhZ2VudFN0YXJ0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGb2N1cyBvbiBmaW5kaW5nIHBhdHRlcm5zJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3ViYWdlbnRTdGFydE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU3ViYWdlbnRTdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN1YmFnZW50U3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3ViYWdlbnRTdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1Rhc2sgbm90IGNvbXBsZXRlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoXCJTdWJhZ2VudFN0b3BcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBOb3RpZmljYXRpb24gaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIE5vdGlmaWNhdGlvbk91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgYWJvdXQgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdOb3RpZmljYXRpb24gZm9yd2FyZGVkIHRvIFNsYWNrICNhbGVydHMgY2hhbm5lbCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU3VwcHJlc3MgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHsgc3VwcHJlc3NPdXRwdXQ6IHRydWUgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IG5vdGlmaWNhdGlvbk91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiTm90aWZpY2F0aW9uXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlQ29tcGFjdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlQ29tcGFjdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgIHN5c3RlbU1lc3NhZ2U6ICdSZW1lbWJlcjogc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwcmVDb21wYWN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJQcmVDb21wYWN0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUGVybWlzc2lvblJlcXVlc3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBdXRvLWFwcHJvdmVcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHsgYmVoYXZpb3I6ICdhbGxvdycgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBdXRvLWFwcHJvdmUgd2l0aCBtb2RpZmllZCBpbnB1dFxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdhbGxvdycsXG4gKiAgICAgICB1cGRhdGVkSW5wdXQ6IHsgZmlsZV9wYXRoOiAnL3NhZmUvcGF0aCcgfVxuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1kZW55XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7XG4gKiAgICAgICBiZWhhdmlvcjogJ2RlbnknLFxuICogICAgICAgbWVzc2FnZTogJ05vdCBhbGxvd2VkJyxcbiAqICAgICAgIGludGVycnVwdDogdHJ1ZVxuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gRmFsbCB0aHJvdWdoIHRvIG5vcm1hbCBwcm9tcHRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcGVybWlzc2lvblJlcXVlc3RPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBlcm1pc3Npb25SZXF1ZXN0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2V0dXAgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNldHVwT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBZGQgY29udGV4dCBkdXJpbmcgc2V0dXBcbiAqIHNldHVwT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdQcm9qZWN0IGluaXRpYWxpemVkIHdpdGggY3VzdG9tIHNldHRpbmdzJ1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBTaW1wbGUgcGFzc3Rocm91Z2hcbiAqIHNldHVwT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2V0dXBPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlNldHVwXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgVGVhbW1hdGVJZGxlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBUZWFtbWF0ZUlkbGVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRlYW1tYXRlIHRvIGdvIGlkbGVcbiAqIHRlYW1tYXRlSWRsZU91dHB1dCh7fSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCBmZWVkYmFja1xuICogdGVhbW1hdGVJZGxlT3V0cHV0KHsgc3RkZXJyOiAnQ29udGludWUgd29ya2luZzogdW5maW5pc2hlZCB0YXNrcyByZW1haW4uJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdGVhbW1hdGVJZGxlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUV4aXRDb2RlT3V0cHV0QnVpbGRlcihcIlRlYW1tYXRlSWRsZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFRhc2tDb21wbGV0ZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFRhc2tDb21wbGV0ZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRhc2sgY29tcGxldGlvblxuICogdGFza0NvbXBsZXRlZE91dHB1dCh7fSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCBmZWVkYmFja1xuICogdGFza0NvbXBsZXRlZE91dHB1dCh7IHN0ZGVycjogJ0Nhbm5vdCBjb21wbGV0ZTogdGVzdHMgYXJlIGZhaWxpbmcuJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdGFza0NvbXBsZXRlZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVFeGl0Q29kZU91dHB1dEJ1aWxkZXIoXCJUYXNrQ29tcGxldGVkXCIpO1xuIiwgIi8qKlxuICogUnVudGltZSBtb2R1bGUgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIEhhbmRsZXMgc3RkaW4vc3Rkb3V0L2V4aXQgY29kZSBzZW1hbnRpY3MgZm9yIGNvbXBpbGVkIGhvb2sgZXhlY3V0aW9uLlxuICogVGhpcyBtb2R1bGUgaXMgdGhlIGNvcmUgb3JjaGVzdHJhdG9yIHRoYXQ6XG4gKiAtIFJlYWRzIEpTT04gZnJvbSBzdGRpbiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAtIEludm9rZXMgdGhlIGhvb2sgaGFuZGxlclxuICogLSBXcml0ZXMgb3V0cHV0IHRvIHN0ZG91dFxuICogLSBNYW5hZ2VzIGV4aXQgY29kZXNcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBhIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCBteUhvb2sgZnJvbSAnLi9teS1ob29rLmpzJztcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IGZyb20gXCIuL2Vudi5qc1wiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vbG9nZ2VyLmpzXCI7XG5pbXBvcnQgeyBFWElUX0NPREVTIH0gZnJvbSBcIi4vb3V0cHV0cy5qc1wiO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RkaW4vU3Rkb3V0IEhhbmRsaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIFJlYWRzIGFsbCBkYXRhIGZyb20gc3RkaW4uXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tcGxldGUgc3RkaW4gY29udGVudFxuICovXG5hc3luYyBmdW5jdGlvbiByZWFkU3RkaW4oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgICAgIC8vIFNldCBlbmNvZGluZyBmaXJzdCB0byBlbnN1cmUgZGF0YSBldmVudHMgcmVjZWl2ZSBzdHJpbmdzXG4gICAgICAgIHByb2Nlc3Muc3RkaW4uc2V0RW5jb2RpbmcoXCJ1dGYtOFwiKTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoY2h1bmtzLmpvaW4oXCJcIikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG4vKipcbiAqIFBhcnNlcyBzdGRpbiBKU09OIGlucHV0LlxuICogQHBhcmFtIHN0ZGluQ29udGVudCAtIFJhdyBzdGRpbiBjb250ZW50XG4gKiBAcmV0dXJucyBQYXJzZWQgaW5wdXQgKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogQHRocm93cyBFcnJvciBpZiBKU09OIGlzIG1hbGZvcm1lZFxuICovXG5mdW5jdGlvbiBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KSB7XG4gICAgLy8gUGFyc2UgSlNPTiAtIGlucHV0IHVzZXMgd2lyZSBmb3JtYXQgKHNuYWtlX2Nhc2UpIGRpcmVjdGx5XG4gICAgY29uc3QgcmF3SW5wdXQgPSBKU09OLnBhcnNlKHN0ZGluQ29udGVudCk7XG4gICAgcmV0dXJuIHJhd0lucHV0O1xufVxuLyoqXG4gKiBXcml0ZXMgaG9vayBvdXRwdXQgdG8gc3Rkb3V0LlxuICpcbiAqIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSBrZXlzIHBlciBDbGF1ZGUgQ29kZSBob29rIHNwZWNpZmljYXRpb24uXG4gKiBAcGFyYW0gb3V0cHV0IC0gVGhlIGhvb2sgb3V0cHV0IHRvIHdyaXRlXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1vdXRwdXQtc3RydWN0dXJlXG4gKi9cbmZ1bmN0aW9uIHdyaXRlU3Rkb3V0KG91dHB1dCkge1xuICAgIC8vIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSAtIG5vIHRyYW5zZm9ybWF0aW9uIG5lZWRlZFxuICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEpTT04uc3RyaW5naWZ5KG91dHB1dCkpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXJyb3IgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBlcnJvciBvdXRwdXQgZm9yIG1hbGZvcm1lZCBzdGRpbiBKU09OLlxuICogQHBhcmFtIGVycm9yIC0gVGhlIHBhcnNlIGVycm9yXG4gKiBAcmV0dXJucyBIb29rT3V0cHV0IHdpdGggZW1wdHkgc3Rkb3V0XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKSB7XG4gICAgbG9nZ2VyLmVycm9yKGBJbnZhbGlkIEpTT04gaW5wdXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIHJldHVybiB7IHN0ZG91dDoge30gfTtcbn1cbi8qKlxuICogV3JpdGVzIGhhbmRsZXIgZXJyb3Igc3RhY2t0cmFjZSB0byBzdGRlcnIgYW5kIGV4aXRzIHdpdGggY29kZSAyLlxuICpcbiAqIFdoZW4gYSBob29rIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbjpcbiAqIC0gU3RhY2t0cmFjZSAod2l0aCBzb3VyY2VtYXBzIGlmIGF2YWlsYWJsZSkgaXMgb3V0cHV0IHRvIHN0ZGVyclxuICogLSBQcm9jZXNzIGV4aXRzIHdpdGggY29kZSAyIChCTE9DSylcbiAqIC0gTm8gSlNPTiBpcyBvdXRwdXQgdG8gc3Rkb3V0XG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIGJ5IHRoZSBoYW5kbGVyXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcikge1xuICAgIC8vIFdyaXRlIHN0YWNrIHRyYWNlIHRvIHN0ZGVyciAoc291cmNlbWFwcyBhcmUgYXBwbGllZCBhdXRvbWF0aWNhbGx5IGJ5IE5vZGUuanMpXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZX1cXG5gKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke1N0cmluZyhlcnJvcil9XFxuYCk7XG4gICAgfVxuICAgIC8vIExvZyB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICBsb2dnZXIuZXJyb3IoYEhvb2sgaGFuZGxlciBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHQgYW5kIGNsb3NlXG4gICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgIGxvZ2dlci5jbG9zZSgpO1xuICAgIC8vIEV4aXQgd2l0aCBjb2RlIDIgKEJMT0NLKSAtIG5vIEpTT04gb3V0cHV0XG4gICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuQkxPQ0spO1xufVxuLyoqXG4gKiBDb252ZXJ0cyBhIFNwZWNpZmljSG9va091dHB1dCB0byBIb29rT3V0cHV0IGZvciB3aXJlIGZvcm1hdC5cbiAqXG4gKiBTcGVjaWZpY0hvb2tPdXRwdXQgdHlwZXMgaGF2ZTogeyBfdHlwZSwgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqIEhvb2tPdXRwdXQgaGFzOiB7IHN0ZG91dCwgc3RkZXJyPyB9XG4gKlxuICogU2luY2Ugb3V0cHV0IGJ1aWxkZXJzIG5vdyBwcm9kdWNlIHdpcmUtZm9ybWF0IGRpcmVjdGx5LCB0aGlzIGZ1bmN0aW9uXG4gKiBzaW1wbHkgc3RyaXBzIHRoZSBgX3R5cGVgIGRpc2NyaW1pbmF0b3IgZmllbGQuXG4gKiBAcGFyYW0gc3BlY2lmaWNPdXRwdXQgLSBUaGUgc3BlY2lmaWMgb3V0cHV0IGZyb20gYSBob29rIGhhbmRsZXJcbiAqIEByZXR1cm5zIEhvb2tPdXRwdXQgcmVhZHkgZm9yIHNlcmlhbGl6YXRpb25cbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNob29rLW91dHB1dC1zdHJ1Y3R1cmVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBzcGVjaWZpY091dHB1dCA9IHByZVRvb2xVc2VPdXRwdXQoeyBob29rU3BlY2lmaWNPdXRwdXQ6IHsgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnIH0gfSk7XG4gKiBjb25zdCBob29rT3V0cHV0ID0gY29udmVydFRvSG9va091dHB1dChzcGVjaWZpY091dHB1dCk7XG4gKiAvLyBob29rT3V0cHV0OiB7IHN0ZG91dDogeyBob29rU3BlY2lmaWNPdXRwdXQ6IHsgLi4uIH0gfSB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpIHtcbiAgICBjb25zdCB7IHN0ZG91dCwgc3RkZXJyIH0gPSBzcGVjaWZpY091dHB1dDtcbiAgICByZXR1cm4gc3RkZXJyICE9PSB1bmRlZmluZWQgPyB7IHN0ZG91dCwgc3RkZXJyIH0gOiB7IHN0ZG91dCB9O1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhlY3V0ZSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeGVjdXRlcyBhIGhvb2sgaGFuZGxlciB3aXRoIGZ1bGwgcnVudGltZSBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgdGhhdCBjb21waWxlZCBob29rcyB1c2UuIFdoZW4gYSBjb21waWxlZCBob29rXG4gKiBydW5zIGFzIGEgQ0xJOlxuICpcbiAqIDEuIFJlYWRzIGFsbCBzdGRpblxuICogMi4gUGFyc2VzIEpTT04gKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogMy4gU2V0cyB1cCBsb2dnZXIgY29udGV4dCAoaG9va1R5cGUsIGlucHV0KVxuICogNC4gQ2FsbHMgaGFuZGxlciB3aXRoIGlucHV0IGFuZCBjb250ZXh0IChsb2dnZXIpXG4gKiA1LiBIYW5kbGVzIGFueSBlcnJvcnMsIGxvZ3MgdGhlbVxuICogNi4gV3JpdGVzIEpTT04gdG8gc3Rkb3V0XG4gKiA3LiBDbG9zZXMgbG9nZ2VyXG4gKiA4LiBFeGl0cyB3aXRoIGFwcHJvcHJpYXRlIGNvZGVcbiAqIEBwYXJhbSBob29rRm4gLSBUaGUgaG9vayBmdW5jdGlvbiB0byBleGVjdXRlIChmcm9tIGhvb2sgZmFjdG9yeSlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBjb21waWxlZCBob29rIGZpbGVcbiAqIGltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvcnVudGltZSc7XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogY29uc3QgbXlIb29rID0gcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKlxuICogZXhlY3V0ZShteUhvb2spO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUoaG9va0ZuKSB7XG4gICAgbGV0IG91dHB1dDtcbiAgICB0cnkge1xuICAgICAgICAvLyBDaGVjayBmb3IgbG9nIGZpbGUgY29uZmlndXJhdGlvbiBjb25mbGljdHNcbiAgICAgICAgLy8gQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFIGlzIGluamVjdGVkIGJ5IHRoZSBDTEkgLS1sb2cgcGFyYW1ldGVyXG4gICAgICAgIC8vIENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFIGlzIHRoZSB1c2VyJ3MgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAgICAgICAgY29uc3QgY2xpTG9nRmlsZSA9IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0NMSV9MT0dfRklMRTtcbiAgICAgICAgY29uc3QgZW52TG9nRmlsZSA9IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFO1xuICAgICAgICBpZiAoY2xpTG9nRmlsZSAhPT0gdW5kZWZpbmVkICYmIGVudkxvZ0ZpbGUgIT09IHVuZGVmaW5lZCAmJiBjbGlMb2dGaWxlICE9PSBlbnZMb2dGaWxlKSB7XG4gICAgICAgICAgICAvLyBXcml0ZSBlcnJvciB0byBzdGRlcnIgYW5kIGV4aXQgd2l0aCBlcnJvciBjb2RlXG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgTG9nIGZpbGUgY29uZmlndXJhdGlvbiBjb25mbGljdDogQ0xJIC0tbG9nPVwiJHtjbGlMb2dGaWxlfVwiIHZzIENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFPVwiJHtlbnZMb2dGaWxlfVwiLiBgICtcbiAgICAgICAgICAgICAgICBcIlVzZSBvbmx5IG9uZSBtZXRob2QgdG8gY29uZmlndXJlIGhvb2sgbG9nZ2luZy5cXG5cIik7XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgQ0xJIGxvZyBmaWxlIGlzIHNldCwgY29uZmlndXJlIHRoZSBsb2dnZXJcbiAgICAgICAgaWYgKGNsaUxvZ0ZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbG9nZ2VyLnNldExvZ0ZpbGUoY2xpTG9nRmlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVhZCBhbmQgcGFyc2Ugc3RkaW5cbiAgICAgICAgbGV0IHN0ZGluQ29udGVudDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHN0ZGluQ29udGVudCA9IGF3YWl0IHJlYWRTdGRpbigpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVycm9yLCBcIkZhaWxlZCB0byByZWFkIHN0ZGluXCIpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFBhcnNlIGFuZCB0cmFuc2Zvcm0gaW5wdXRcbiAgICAgICAgbGV0IGlucHV0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaW5wdXQgPSBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2dFcnJvcihlcnJvciwgXCJGYWlsZWQgdG8gcGFyc2Ugc3RkaW4gSlNPTlwiKTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgbG9nZ2VyIGNvbnRleHRcbiAgICAgICAgY29uc3QgaG9va0V2ZW50TmFtZSA9IGhvb2tGbi5ob29rRXZlbnROYW1lO1xuICAgICAgICBsb2dnZXIuc2V0Q29udGV4dChob29rRXZlbnROYW1lLCBpbnB1dCk7XG4gICAgICAgIC8vIEJ1aWxkIGNvbnRleHQgLSBTZXNzaW9uU3RhcnQgaG9va3MgZ2V0IGV4dGVuZGVkIGNvbnRleHQgd2l0aCBwZXJzaXN0RW52VmFyXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBob29rRXZlbnROYW1lID09PSBcIlNlc3Npb25TdGFydFwiID8geyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIsIHBlcnNpc3RFbnZWYXJzIH0gOiB7IGxvZ2dlciB9O1xuICAgICAgICAvLyBFeGVjdXRlIGhhbmRsZXJcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gYXdhaXQgaG9va0ZuKGlucHV0LCBjb250ZXh0KTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gSGFuZGxlciB0aHJldyAtIG91dHB1dCBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdCB3aXRoIGNvZGUgMlxuICAgICAgICAgICAgLy8gVGhpcyBjYWxsIG5ldmVyIHJldHVybnMgKHByb2Nlc3MuZXhpdClcbiAgICAgICAgICAgIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZmluYWxseSB7XG4gICAgICAgIC8vIFdyaXRlIG91dHB1dCBpZiB3ZSBoYXZlIGl0XG4gICAgICAgIGlmIChvdXRwdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgd3JpdGVTdGRvdXQob3V0cHV0LnN0ZG91dCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2xlYW4gdXAgbG9nZ2VyIChzaW5nbGUgY2xlYW51cCBwYXRoKVxuICAgICAgICBsb2dnZXIuY2xlYXJDb250ZXh0KCk7XG4gICAgICAgIGxvZ2dlci5jbG9zZSgpO1xuICAgICAgICAvLyBFeGl0LWNvZGUgQkxPQ0s6IHVubGlrZSBoYW5kbGVyIHRocm93IChubyBzdGRvdXQpLCB0aGlzIHBhdGggc3RpbGwgd3JpdGVzXG4gICAgICAgIC8vIHN0cnVjdHVyZWQgSlNPTiB0byBzdGRvdXQgKGFzIGVtcHR5IHt9KSBhbG9uZ3NpZGUgdGhlIHN0ZGVyciBtZXNzYWdlLlxuICAgICAgICAvLyBUaGUgY2FsbGVyIGNvbnRyb2xzIHN0ZGVyciBmb3JtYXR0aW5nIChubyBhcHBlbmRlZCBuZXdsaW5lKS5cbiAgICAgICAgaWYgKG91dHB1dD8uc3RkZXJyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKG91dHB1dC5zdGRlcnIpO1xuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuQkxPQ0spO1xuICAgICAgICB9XG4gICAgICAgIC8vIEV4aXQgd2l0aCBzdWNjZXNzIChoYW5kbGVyIGVycm9ycyBleGl0IHZpYSBoYW5kbGVIYW5kbGVyRXJyb3Igd2l0aCBjb2RlIDIpXG4gICAgICAgIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLlNVQ0NFU1MpO1xuICAgIH1cbn1cbiIsICJwcm9jZXNzLmVudlsnQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFJ10gPSBcIi93b3Jrc3BhY2UvLmNhcmRzL2xvZ3MvY2xhdWRlLWNvZGUtY2FyZHMtcnVudGltZS1ob29rcy5sb2dcIjtcblxuaW1wb3J0IGhvb2sgZnJvbSAnLi9zdG9wLnRzJztcbmltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICcuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvcnVudGltZS5qcyc7XG5cbmV4ZWN1dGUoaG9vayk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7OztBQWlCQSxTQUFTLG9CQUFvQjs7O0FDUDdCLFNBQVMsZ0JBQWdCO0FBQ3pCLFNBQVMsZUFBZTtBQUN4QixTQUFTLFlBQVk7OztBQ0NyQixTQUFTLFdBQVcsV0FBVyxVQUFVLGNBQWMsWUFBWSxZQUFZLHFCQUFxQjtBQUNwRyxTQUFTLGVBQWU7OztBQ09qQixTQUFTLGVBQWUsS0FBc0I7QUFDbkQsTUFBSTtBQUNGLFlBQVEsS0FBSyxLQUFLLENBQUM7QUFDbkIsV0FBTztBQUFBLEVBQ1QsU0FBUyxPQUFPO0FBQ2QsUUFBSSxpQkFBaUIsU0FBUyxVQUFVLE9BQU87QUFDN0MsWUFBTSxPQUFRLE1BQWdDO0FBQzlDLFVBQUksU0FBUyxRQUFTLFFBQU87QUFDN0IsVUFBSSxTQUFTLFFBQVMsUUFBTztBQUFBLElBQy9CO0FBQ0EsVUFBTTtBQUFBLEVBQ1I7QUFDRjs7O0FEUk8sU0FBUyxNQUFNLElBQTJCO0FBQy9DLFNBQU8sSUFBSSxRQUFRLENBQUMsWUFBWSxXQUFXLFNBQVMsRUFBRSxDQUFDO0FBQ3pEO0FBVU8sU0FBUyxhQUFhLE9BQWdCLE1BQXVCO0FBQ2xFLFNBQU8saUJBQWlCLFNBQVMsVUFBVSxTQUFVLE1BQWdDLFNBQVM7QUFDaEc7QUFXTyxTQUFTLG1CQUFtQixVQUEyQjtBQUM1RCxNQUFJO0FBQ0YsVUFBTSxjQUFjLGFBQWEsVUFBVSxPQUFPO0FBQ2xELFVBQU0sWUFBWSxPQUFPLFNBQVMsWUFBWSxLQUFLLEdBQUcsRUFBRTtBQUV4RCxRQUFJLENBQUMsT0FBTyxNQUFNLFNBQVMsS0FBSyxDQUFDLGVBQWUsU0FBUyxHQUFHO0FBRTFELFVBQUksYUFBYSxVQUFVLE9BQU8sTUFBTSxhQUFhO0FBQ25ELG1CQUFXLFFBQVE7QUFDbkIsZUFBTztBQUFBLE1BQ1Q7QUFBQSxJQUNGO0FBQUEsRUFDRixRQUFRO0FBQ04sUUFBSTtBQUNGLGlCQUFXLFFBQVE7QUFDbkIsYUFBTztBQUFBLElBQ1QsUUFBUTtBQUFBLElBRVI7QUFBQSxFQUNGO0FBRUEsU0FBTztBQUNUO0FBVU8sU0FBUyxtQkFBbUIsVUFBd0I7QUFDekQsUUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLEdBQUs7QUFDekMsTUFBSTtBQUNGLGtCQUFjLElBQUksT0FBTyxRQUFRLEdBQUcsQ0FBQztBQUFBLEVBQ3ZDLFVBQUU7QUFDQSxjQUFVLEVBQUU7QUFBQSxFQUNkO0FBQ0Y7QUFZQSxlQUFzQixZQUFZLFVBQWtCLFdBQWtDO0FBQ3BGLFFBQU0sWUFBWSxLQUFLLElBQUk7QUFDM0IsUUFBTSxNQUFNLFFBQVEsUUFBUTtBQUU1QixTQUFPLEtBQUssSUFBSSxJQUFJLFlBQVksV0FBVztBQUN6QyxRQUFJO0FBQ0YsZ0JBQVUsS0FBSyxFQUFFLFdBQVcsTUFBTSxNQUFNLElBQU0sQ0FBQztBQUMvQyx5QkFBbUIsUUFBUTtBQUMzQjtBQUFBLElBQ0YsU0FBUyxPQUFPO0FBQ2QsVUFBSSxDQUFDLGFBQWEsT0FBTyxRQUFRLEVBQUcsT0FBTTtBQUMxQyxVQUFJLG1CQUFtQixRQUFRLEVBQUc7QUFFbEMsWUFBTSxZQUFZLGFBQWEsS0FBSyxJQUFJLElBQUk7QUFDNUMsVUFBSSxZQUFZLEdBQUc7QUFDakIsY0FBTSxNQUFNLEtBQUssSUFBSSxJQUFJLFNBQVMsQ0FBQztBQUFBLE1BQ3JDO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFQSxRQUFNLElBQUksTUFBTSwwQkFBMEI7QUFDNUM7QUFXTyxTQUFTLFlBQVksVUFBd0I7QUFDbEQsTUFBSTtBQUNGLGVBQVcsUUFBUTtBQUFBLEVBQ3JCLFNBQVMsT0FBTztBQUNkLFFBQUksQ0FBQyxhQUFhLE9BQU8sUUFBUSxFQUFHLE9BQU07QUFBQSxFQUM1QztBQUNGO0FBOERPLFNBQVMsYUFBZ0IsTUFBYyxjQUFvQjtBQUNoRSxNQUFJO0FBQ0YsVUFBTSxVQUFVLGFBQWEsTUFBTSxPQUFPO0FBQzFDLFdBQU8sS0FBSyxNQUFNLE9BQU87QUFBQSxFQUMzQixTQUFTLE9BQU87QUFDZCxRQUFJLGFBQWEsT0FBTyxRQUFRLEVBQUcsUUFBTztBQUMxQyxVQUFNO0FBQUEsRUFDUjtBQUNGO0FBWU8sU0FBUyxvQkFBdUIsVUFBYSxjQUE0QjtBQUM5RSxRQUFNLE1BQU0sUUFBUSxZQUFZO0FBQ2hDLFlBQVUsS0FBSyxFQUFFLFdBQVcsTUFBTSxNQUFNLElBQU0sQ0FBQztBQUMvQyxRQUFNLFdBQVcsR0FBRyxZQUFZO0FBQ2hDLE1BQUk7QUFDRixrQkFBYyxVQUFVLEtBQUssVUFBVSxVQUFVLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxJQUFNLENBQUM7QUFDMUUsZUFBVyxVQUFVLFlBQVk7QUFBQSxFQUNuQyxTQUFTLE9BQU87QUFDZCxRQUFJO0FBQ0YsaUJBQVcsUUFBUTtBQUFBLElBQ3JCLFFBQVE7QUFBQSxJQUVSO0FBQ0EsVUFBTTtBQUFBLEVBQ1I7QUFDRjtBQW9CQSxlQUFzQixtQkFDcEIsY0FDQSxVQUNBLFdBQ0EsUUFDQSxpQkFDQSxlQUNrQjtBQUNsQixRQUFNLFlBQVksVUFBVSxpQkFBaUIsR0FBSTtBQUNqRCxNQUFJO0FBQ0YsVUFBTSxXQUFXLGFBQXdCLGNBQWMsZUFBNEI7QUFDbkYsUUFBSSxPQUFRLFFBQU8sUUFBUTtBQUMzQixVQUFNLFNBQVMsVUFBVSxRQUFRO0FBQ2pDLHdCQUFvQixVQUFVLFlBQVk7QUFDMUMsV0FBTztBQUFBLEVBQ1QsVUFBRTtBQUNBLGdCQUFZLFFBQVE7QUFBQSxFQUN0QjtBQUNGOzs7QUUxUUEsU0FBUyxnQkFBZ0I7QUFHbEIsSUFBTSx5QkFBeUI7QUFnQnRDLElBQU0sc0JBQXNCO0FBYTVCLFNBQVMsU0FBUyxLQUFzQjtBQUN0QyxNQUFJO0FBQ0YsVUFBTSxPQUFPLFNBQVMsU0FBUyxHQUFHLGFBQWEsRUFBRSxVQUFVLE9BQU8sQ0FBQyxFQUFFLEtBQUs7QUFDMUUsV0FBTyxvQkFBb0IsS0FBSyxJQUFJO0FBQUEsRUFDdEMsUUFBUTtBQUNOLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFXQSxTQUFTLGFBQWEsS0FBNEI7QUFDaEQsTUFBSTtBQUNGLFVBQU0sVUFBVSxTQUFTLFNBQVMsR0FBRyxhQUFhLEVBQUUsVUFBVSxPQUFPLENBQUMsRUFBRSxLQUFLO0FBQzdFLFVBQU0sWUFBWSxPQUFPLFNBQVMsU0FBUyxFQUFFO0FBQzdDLFFBQUksT0FBTyxNQUFNLFNBQVMsS0FBSyxjQUFjLElBQUssUUFBTztBQUN6RCxXQUFPO0FBQUEsRUFDVCxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQVdPLFNBQVMsY0FBYyxVQUFrQztBQUM5RCxRQUFNLE9BQU8sa0JBQWtCLFFBQVE7QUFDdkMsU0FBTyxLQUFLLENBQUMsS0FBSztBQUNwQjtBQWdCTyxTQUFTLGtCQUFrQixVQUE2QjtBQUM3RCxRQUFNLFVBQW9CLENBQUM7QUFDM0IsTUFBSSxNQUFNLFlBQVksUUFBUTtBQUU5QixXQUFTLFFBQVEsR0FBRyxRQUFRLHdCQUF3QixTQUFTO0FBQzNELFFBQUksT0FBTyxFQUFHO0FBRWQsUUFBSSxTQUFTLEdBQUcsR0FBRztBQUNqQixjQUFRLEtBQUssR0FBRztBQUFBLElBQ2xCO0FBRUEsVUFBTSxZQUFZLGFBQWEsR0FBRztBQUNsQyxRQUFJLGNBQWMsS0FBTTtBQUN4QixVQUFNO0FBQUEsRUFDUjtBQUVBLFNBQU87QUFDVDs7O0FIakdBLFNBQVMsY0FBc0I7QUFDN0IsU0FBTyxLQUFLLFFBQVEsR0FBRyxRQUFRO0FBQ2pDO0FBb0JPLElBQU0sa0JBQWtCO0FBQ3hCLElBQU0sbUJBQW1CLEtBQUssS0FBSyxLQUFLO0FBa0ovQyxTQUFTLDhCQUFzQztBQUM3QyxTQUFPLEtBQUssWUFBWSxHQUFHLHFCQUFxQixXQUFXO0FBQzdEO0FBRUEsU0FBUywwQkFBa0M7QUFDekMsU0FBTyxLQUFLLFlBQVksR0FBRyxxQkFBcUIsV0FBVztBQUM3RDtBQTZCQSxlQUFzQixpQkFBaUIsS0FBNEI7QUFDakUsUUFBTTtBQUFBLElBQ0osNEJBQTRCO0FBQUEsSUFDNUIsd0JBQXdCO0FBQUEsSUFDeEIsQ0FBQyxhQUFhO0FBQ1osYUFBTyxTQUFTLFNBQVMsT0FBTyxHQUFHLENBQUM7QUFBQSxJQUN0QztBQUFBLElBQ0E7QUFBQSxJQUNBLEVBQUUsVUFBVSxDQUFDLEVBQUU7QUFBQSxJQUNmO0FBQUEsRUFDRjtBQUNGOzs7QUl2TkEsU0FBUyxnQkFBZ0IsYUFBQUEsWUFBVyxnQkFBQUMsZUFBYyxjQUFBQyxhQUFZLGlCQUFBQyxzQkFBcUI7QUFDbkYsU0FBUyxXQUFBQyxnQkFBZTtBQUN4QixTQUFTLFFBQUFDLGFBQVk7QUFHckIsSUFBTUMsbUJBQWtCO0FBTXhCLFNBQVMsd0JBQWdDO0FBQ3ZDLFNBQU9DLE1BQUtDLFNBQVEsR0FBRyxVQUFVLG1CQUFtQjtBQUN0RDtBQUVBLFNBQVMsa0JBQWtCLFdBQTJCO0FBQ3BELFNBQU9ELE1BQUssc0JBQXNCLEdBQUcsR0FBRyxTQUFTLE1BQU07QUFDekQ7QUFFQSxTQUFTLHNCQUFzQixXQUEyQjtBQUN4RCxTQUFPQSxNQUFLLHNCQUFzQixHQUFHLEdBQUcsU0FBUyxXQUFXO0FBQzlEO0FBRUEsU0FBUyxzQkFBc0IsV0FBMkI7QUFDeEQsU0FBT0EsTUFBSyxzQkFBc0IsR0FBRyxHQUFHLFNBQVMsT0FBTztBQUMxRDtBQWtCQSxlQUFzQixzQkFBc0IsV0FBbUIsS0FBNEI7QUFDekYsRUFBQUUsV0FBVSxzQkFBc0IsR0FBRyxFQUFFLFdBQVcsTUFBTSxNQUFNLElBQU0sQ0FBQztBQUVuRSxRQUFNLGNBQWMsc0JBQXNCLFNBQVM7QUFDbkQsUUFBTSxZQUFZLGFBQWFILGdCQUFlO0FBRTlDLE1BQUk7QUFDRixVQUFNLFVBQVUsa0JBQWtCLFNBQVM7QUFDM0MsVUFBTSxrQkFBa0Isa0JBQWtCLFNBQVM7QUFFbkQsUUFBSSxDQUFDLGdCQUFnQixTQUFTLEdBQUcsR0FBRztBQUNsQyxxQkFBZSxTQUFTLEdBQUcsR0FBRztBQUFBLEdBQU0sRUFBRSxNQUFNLElBQU0sQ0FBQztBQUFBLElBQ3JEO0FBQUEsRUFDRixVQUFFO0FBQ0EsZ0JBQVksV0FBVztBQUFBLEVBQ3pCO0FBQ0Y7QUFVTyxTQUFTLGtCQUFrQixXQUE2QjtBQUM3RCxNQUFJO0FBQ0YsVUFBTSxVQUFVLGtCQUFrQixTQUFTO0FBQzNDLFVBQU0sVUFBVUksY0FBYSxTQUFTLE9BQU87QUFDN0MsV0FBTyxRQUNKLE1BQU0sSUFBSSxFQUNWLElBQUksQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLEVBQ3pCLE9BQU8sQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDO0FBQUEsRUFDckMsU0FBUyxPQUFPO0FBQ2QsUUFBSSxhQUFhLE9BQU8sUUFBUSxFQUFHLFFBQU8sQ0FBQztBQUMzQyxVQUFNO0FBQUEsRUFDUjtBQUNGO0FBU08sU0FBUyxpQkFBaUIsV0FBeUI7QUFDeEQsUUFBTSxVQUFVLGtCQUFrQixTQUFTO0FBQzNDLFFBQU0sY0FBYyxzQkFBc0IsU0FBUztBQUVuRCxNQUFJO0FBQ0YsSUFBQUMsWUFBVyxPQUFPO0FBQUEsRUFDcEIsU0FBUyxPQUFPO0FBQ2QsUUFBSSxDQUFDLGFBQWEsT0FBTyxRQUFRLEVBQUcsT0FBTTtBQUFBLEVBQzVDO0FBRUEsTUFBSTtBQUNGLElBQUFBLFlBQVcsV0FBVztBQUFBLEVBQ3hCLFNBQVMsT0FBTztBQUNkLFFBQUksQ0FBQyxhQUFhLE9BQU8sUUFBUSxFQUFHLE9BQU07QUFBQSxFQUM1QztBQUNGO0FBc0JPLFNBQVMsbUJBQW1CLFdBQWtDO0FBQ25FLE1BQUk7QUFDRixXQUFPQyxjQUFhLHNCQUFzQixTQUFTLEdBQUcsT0FBTyxFQUFFLEtBQUs7QUFBQSxFQUN0RSxTQUFTLE9BQU87QUFDZCxRQUFJLGFBQWEsT0FBTyxRQUFRLEVBQUcsUUFBTztBQUMxQyxVQUFNO0FBQUEsRUFDUjtBQUNGO0FBU08sU0FBUyxxQkFBcUIsV0FBeUI7QUFDNUQsTUFBSTtBQUNGLElBQUFDLFlBQVcsc0JBQXNCLFNBQVMsQ0FBQztBQUFBLEVBQzdDLFNBQVMsT0FBTztBQUNkLFFBQUksQ0FBQyxhQUFhLE9BQU8sUUFBUSxFQUFHLE9BQU07QUFBQSxFQUM1QztBQUNGOzs7QUN0SkEsU0FBUyxnQkFBQUMscUJBQW9CO0FBY3RCLElBQU0saUJBQWlCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUs1QixTQUFTO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1ULGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWIsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9iLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNaEIsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNZCxrQkFBa0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPbEIsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNZCxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWQsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsUUFBUTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNUixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVlkLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFVYixNQUFNO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1OLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWIsaUNBQWlDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1qQyxhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT2IsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFRaEIsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWhCLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBUWhCLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBU2IsZUFBZTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9mLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZbEIsa0JBQWtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFXbEIsZ0JBQWdCO0FBQ2xCO0FBa0JPLFNBQVMsWUFBb0I7QUFDbEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLE9BQU87QUFDaEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLE9BQU8sRUFBRTtBQUFBLEVBQ3BGO0FBQ0EsU0FBTztBQUNUO0FBY08sU0FBUyxpQkFBeUI7QUFDdkMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFdBQVc7QUFDcEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFdBQVcsRUFBRTtBQUFBLEVBQ3hGO0FBQ0EsU0FBTztBQUNUO0FBZU8sU0FBUyxnQkFBd0I7QUFDdEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFdBQVc7QUFDcEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFdBQVcsRUFBRTtBQUFBLEVBQ3hGO0FBQ0EsU0FBTztBQUNUO0FBZ0JPLFNBQVMsbUJBQWlEO0FBQy9ELFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxjQUFjO0FBQ3ZELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxjQUFjLEVBQUU7QUFBQSxFQUMzRjtBQUNBLE1BQUksVUFBVSxpQkFBaUIsVUFBVSxjQUFjO0FBQ3JELFVBQU0sSUFBSSxNQUFNLFdBQVcsZUFBZSxjQUFjLGtEQUFrRCxLQUFLLEdBQUc7QUFBQSxFQUNwSDtBQUNBLFNBQU87QUFDVDtBQWVPLFNBQVMsZ0JBQXdCO0FBQ3RDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxZQUFZO0FBQ3JELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxZQUFZLEVBQUU7QUFBQSxFQUN6RjtBQUNBLFNBQU87QUFDVDtBQWlCTyxTQUFTLG9CQUE0QjtBQUMxQyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsZ0JBQWdCO0FBQ3pELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxnQkFBZ0IsRUFBRTtBQUFBLEVBQzdGO0FBQ0EsU0FBTztBQUNUO0FBaUJPLFNBQVMsaUJBQXFDO0FBQ25ELFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxZQUFZO0FBQ3JELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQStMTyxTQUFTLGlDQUFxRDtBQUNuRSxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsK0JBQStCO0FBQ3hFLE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQVFPLFNBQVMsZ0JBQXdCO0FBQ3RDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxXQUFXO0FBQ3BELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxXQUFXLEVBQUU7QUFBQSxFQUN4RjtBQUNBLFNBQU87QUFDVDtBQTRCTyxTQUFTLGNBQXNCO0FBQ3BDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxTQUFTO0FBQ2xELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxTQUFTLEVBQUU7QUFBQSxFQUN0RjtBQUNBLFNBQU87QUFDVDtBQVFPLFNBQVMsa0JBQTBCO0FBQ3hDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxjQUFjO0FBQ3ZELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxjQUFjLEVBQUU7QUFBQSxFQUMzRjtBQUNBLFNBQU87QUFDVDtBQVlPLFNBQVMsbUJBQTJCO0FBQ3pDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxjQUFjO0FBQ3ZELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxjQUFjLEVBQUU7QUFBQSxFQUMzRjtBQUNBLFNBQU87QUFDVDtBQVdPLFNBQVMsOEJBQW1EO0FBQ2pFLFFBQU0sV0FBVywrQkFBK0I7QUFDaEQsTUFBSSxhQUFhLFFBQVc7QUFDMUIsV0FBTztBQUFBLEVBQ1Q7QUFDQSxRQUFNLFVBQVVDLGNBQWEsVUFBVSxPQUFPO0FBQzlDLFNBQU8sS0FBSyxNQUFNLE9BQU87QUFDM0I7QUFxQk8sU0FBUyxxQkFBa0M7QUFDaEQsU0FBTztBQUFBLElBQ0wsUUFBUSxVQUFVO0FBQUEsSUFDbEIsWUFBWSxjQUFjO0FBQUEsSUFDMUIsYUFBYSxlQUFlO0FBQUEsSUFDNUIsZUFBZSxpQkFBaUI7QUFBQSxJQUNoQyxZQUFZLGNBQWM7QUFBQSxJQUMxQixnQkFBZ0Isa0JBQWtCO0FBQUEsSUFDbEMsYUFBYSxlQUFlO0FBQUEsSUFDNUIseUJBQXlCLDRCQUE0QjtBQUFBLElBQ3JELFVBQVUsWUFBWTtBQUFBLElBQ3RCLGNBQWMsZ0JBQWdCO0FBQUEsSUFDOUIsWUFBWSxjQUFjO0FBQUEsSUFDMUIsZUFBZSxpQkFBaUI7QUFBQSxFQUNsQztBQUNGOzs7QUM1cUJBLFlBQVksUUFBUTtBQU1iLElBQU0sa0JBQWtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUszQixhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWIsVUFBVTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLVixRQUFRO0FBQ1o7QUFrQ08sU0FBUyxpQkFBaUI7QUFDN0IsU0FBTyxRQUFRLElBQUksZ0JBQWdCLFFBQVE7QUFDL0M7QUE4Q08sU0FBUyxjQUFjLE1BQU0sT0FBTztBQUN2QyxRQUFNLFVBQVUsZUFBZTtBQUMvQixNQUFJLFlBQVksUUFBVztBQUN2QixVQUFNLElBQUksTUFBTSx3R0FBNkc7QUFBQSxFQUNqSTtBQUVBLFFBQU0sZUFBZSxpQkFBaUIsS0FBSztBQUUzQyxRQUFNLGtCQUFrQixVQUFVLElBQUksSUFBSSxZQUFZO0FBQUE7QUFDdEQsRUFBRyxrQkFBZSxTQUFTLGlCQUFpQixPQUFPO0FBQ3ZEO0FBaUJPLFNBQVMsZUFBZSxNQUFNO0FBQ2pDLGFBQVcsQ0FBQyxNQUFNLEtBQUssS0FBSyxPQUFPLFFBQVEsSUFBSSxHQUFHO0FBQzlDLGtCQUFjLE1BQU0sS0FBSztBQUFBLEVBQzdCO0FBQ0o7QUFVQSxTQUFTLGlCQUFpQixPQUFPO0FBRzdCLFFBQU0sVUFBVSxNQUFNLFFBQVEsTUFBTSxPQUFPO0FBQzNDLFNBQU8sSUFBSSxPQUFPO0FBQ3RCOzs7QUNwSkEsU0FBUyxtQkFBbUIsZUFBZSxRQUFRLFNBQVM7QUFDeEQsUUFBTSxTQUFTLE9BQU8sT0FBTyxZQUFZO0FBR3JDLFdBQU8sTUFBTSxRQUFRLE9BQU8sT0FBTztBQUFBLEVBQ3ZDO0FBRUEsU0FBTyxnQkFBZ0I7QUFDdkIsU0FBTyxVQUFVLE9BQU87QUFDeEIsU0FBTyxVQUFVLE9BQU87QUFDeEIsU0FBTztBQUNYO0FBeU5PLFNBQVMsU0FBUyxRQUFRLFNBQVM7QUFDdEMsU0FBTyxtQkFBbUIsUUFBUSxRQUFRLE9BQU87QUFDckQ7OztBQ3RQQSxTQUFTLGFBQUFDLFlBQVcsWUFBWSxhQUFBQyxZQUFXLFlBQUFDLFdBQVUsaUJBQWlCO0FBQ3RFLFNBQVMsV0FBQUMsZ0JBQWU7QUFJakIsSUFBTSxhQUFhLENBQUMsU0FBUyxRQUFRLFFBQVEsT0FBTztBQXNDcEQsSUFBTSxTQUFOLE1BQWE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUloQixXQUFXLG9CQUFJLElBQUk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS25CLFlBQVk7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUlaLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUlkLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSWxCO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBZ0JBLFlBQVksU0FBUyxDQUFDLEdBQUc7QUFFckIsZUFBVyxTQUFTLFlBQVk7QUFDNUIsV0FBSyxTQUFTLElBQUksT0FBTyxvQkFBSSxJQUFJLENBQUM7QUFBQSxJQUN0QztBQUVBLFNBQUssY0FBYyxPQUFPLGVBQWUsUUFBUSxJQUFJLDhCQUE4QjtBQUFBLEVBQ3ZGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFhQSxNQUFNLFNBQVMsU0FBUztBQUNwQixTQUFLLEtBQUssU0FBUyxTQUFTLE9BQU87QUFBQSxFQUN2QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBYUEsS0FBSyxTQUFTLFNBQVM7QUFDbkIsU0FBSyxLQUFLLFFBQVEsU0FBUyxPQUFPO0FBQUEsRUFDdEM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWFBLEtBQUssU0FBUyxTQUFTO0FBQ25CLFNBQUssS0FBSyxRQUFRLFNBQVMsT0FBTztBQUFBLEVBQ3RDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFhQSxNQUFNLFNBQVMsU0FBUztBQUNwQixTQUFLLEtBQUssU0FBUyxTQUFTLE9BQU87QUFBQSxFQUN2QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQXFCQSxTQUFTLE9BQU8sU0FBUyxTQUFTO0FBQzlCLFVBQU0sWUFBWSxLQUFLLGlCQUFpQixLQUFLO0FBQzdDLFVBQU0sUUFBUTtBQUFBLE1BQ1YsWUFBVyxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUFBLE1BQ2xDLE9BQU87QUFBQSxNQUNQLFVBQVUsS0FBSztBQUFBLE1BQ2Y7QUFBQSxNQUNBLE9BQU8sS0FBSztBQUFBLE1BQ1osT0FBTztBQUFBLE1BQ1A7QUFBQSxJQUNKO0FBQ0EsU0FBSyxhQUFhLEtBQUs7QUFBQSxFQUMzQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBa0NBLEdBQUcsT0FBTyxTQUFTO0FBQ2YsVUFBTSxnQkFBZ0IsS0FBSyxTQUFTLElBQUksS0FBSztBQUM3QyxRQUFJLGVBQWU7QUFDZixvQkFBYyxJQUFJLE9BQU87QUFBQSxJQUM3QjtBQUNBLFdBQU8sTUFBTTtBQUNULHFCQUFlLE9BQU8sT0FBTztBQUFBLElBQ2pDO0FBQUEsRUFDSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVUEsV0FBVyxVQUFVLE9BQU87QUFDeEIsU0FBSyxrQkFBa0I7QUFDdkIsU0FBSyxlQUFlO0FBQUEsRUFDeEI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9BLGVBQWU7QUFDWCxTQUFLLGtCQUFrQjtBQUN2QixTQUFLLGVBQWU7QUFBQSxFQUN4QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBZ0JBLFdBQVcsVUFBVTtBQUVqQixRQUFJLEtBQUssY0FBYyxNQUFNO0FBQ3pCLFVBQUk7QUFDQSxRQUFBSCxXQUFVLEtBQUssU0FBUztBQUFBLE1BQzVCLFFBQ007QUFBQSxNQUVOO0FBQ0EsV0FBSyxZQUFZO0FBQUEsSUFDckI7QUFDQSxTQUFLLGNBQWM7QUFDbkIsU0FBSyxrQkFBa0I7QUFBQSxFQUMzQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVlBLFFBQVE7QUFDSixRQUFJLEtBQUssY0FBYyxNQUFNO0FBQ3pCLFVBQUk7QUFDQSxRQUFBQSxXQUFVLEtBQUssU0FBUztBQUFBLE1BQzVCLFFBQ007QUFBQSxNQUVOO0FBQ0EsV0FBSyxZQUFZO0FBQUEsSUFDckI7QUFDQSxTQUFLLGtCQUFrQjtBQUFBLEVBQzNCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPQSxrQkFBa0I7QUFDZCxlQUFXLFlBQVksS0FBSyxTQUFTLE9BQU8sR0FBRztBQUMzQyxVQUFJLFNBQVMsT0FBTztBQUNoQixlQUFPO0FBQUEsSUFDZjtBQUNBLFdBQU8sS0FBSyxnQkFBZ0I7QUFBQSxFQUNoQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVUEsS0FBSyxPQUFPLFNBQVMsU0FBUztBQUMxQixVQUFNLFFBQVE7QUFBQSxNQUNWLFlBQVcsb0JBQUksS0FBSyxHQUFFLFlBQVk7QUFBQSxNQUNsQztBQUFBLE1BQ0EsVUFBVSxLQUFLO0FBQUEsTUFDZjtBQUFBLE1BQ0EsT0FBTyxLQUFLO0FBQUEsTUFDWjtBQUFBLElBQ0o7QUFDQSxTQUFLLGFBQWEsS0FBSztBQUFBLEVBQzNCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtBLGFBQWEsT0FBTztBQUVoQixVQUFNLGdCQUFnQixLQUFLLFNBQVMsSUFBSSxNQUFNLEtBQUs7QUFDbkQsUUFBSSxlQUFlO0FBQ2YsaUJBQVcsV0FBVyxlQUFlO0FBQ2pDLFlBQUk7QUFDQSxrQkFBUSxLQUFLO0FBQUEsUUFDakIsUUFDTTtBQUFBLFFBRU47QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUVBLFNBQUssWUFBWSxLQUFLO0FBQUEsRUFDMUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS0EsWUFBWSxPQUFPO0FBQ2YsUUFBSSxDQUFDLEtBQUs7QUFDTjtBQUVKLFFBQUksQ0FBQyxLQUFLLGlCQUFpQjtBQUN2QixXQUFLLGVBQWU7QUFBQSxJQUN4QjtBQUNBLFFBQUksS0FBSyxjQUFjO0FBQ25CO0FBQ0osUUFBSTtBQUNBLFlBQU0sT0FBTyxHQUFHLEtBQUssVUFBVSxLQUFLLENBQUM7QUFBQTtBQUNyQyxnQkFBVSxLQUFLLFdBQVcsSUFBSTtBQUFBLElBQ2xDLFFBQ007QUFBQSxJQUlOO0FBQUEsRUFDSjtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSUEsaUJBQWlCO0FBQ2IsU0FBSyxrQkFBa0I7QUFDdkIsUUFBSSxDQUFDLEtBQUs7QUFDTjtBQUNKLFFBQUk7QUFFQSxZQUFNLE1BQU1HLFNBQVEsS0FBSyxXQUFXO0FBQ3BDLFVBQUksQ0FBQyxXQUFXLEdBQUcsR0FBRztBQUNsQixRQUFBRixXQUFVLEtBQUssRUFBRSxXQUFXLEtBQUssQ0FBQztBQUFBLE1BQ3RDO0FBRUEsV0FBSyxZQUFZQyxVQUFTLEtBQUssYUFBYSxHQUFHO0FBQUEsSUFDbkQsUUFDTTtBQUVGLFdBQUssWUFBWTtBQUFBLElBQ3JCO0FBQUEsRUFDSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1BLGlCQUFpQixPQUFPO0FBQ3BCLFFBQUksaUJBQWlCLE9BQU87QUFDeEIsWUFBTSxPQUFPO0FBQUEsUUFDVCxNQUFNLE1BQU07QUFBQSxRQUNaLFNBQVMsTUFBTTtBQUFBLFFBQ2YsT0FBTyxNQUFNO0FBQUEsTUFDakI7QUFFQSxVQUFJLE1BQU0sVUFBVSxRQUFXO0FBQzNCLGFBQUssUUFBUSxLQUFLLGlCQUFpQixNQUFNLEtBQUs7QUFBQSxNQUNsRDtBQUNBLGFBQU87QUFBQSxJQUNYO0FBRUEsV0FBTztBQUFBLE1BQ0gsTUFBTTtBQUFBLE1BQ04sU0FBUyxPQUFPLEtBQUs7QUFBQSxJQUN6QjtBQUFBLEVBQ0o7QUFDSjtBQTBETyxJQUFNLFNBQVMsSUFBSSxPQUFPOzs7QUNqZTFCLElBQU0sYUFBYTtBQUFBO0FBQUEsRUFFdEIsU0FBUztBQUFBO0FBQUEsRUFFVCxPQUFPO0FBQUE7QUFBQSxFQUVQLE9BQU87QUFDWDtBQXFDQSxTQUFTLDRCQUE0QixVQUFVO0FBQzNDLFNBQU8sQ0FBQyxVQUFVLENBQUMsT0FBTztBQUFBLElBQ3RCLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxFQUNaO0FBQ0o7QUFrSU8sSUFBTSxhQUE2Qiw0Q0FBNEIsTUFBTTs7O0FDMUs1RSxlQUFlLFlBQVk7QUFDdkIsU0FBTyxJQUFJLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFDcEMsVUFBTSxTQUFTLENBQUM7QUFFaEIsWUFBUSxNQUFNLFlBQVksT0FBTztBQUNqQyxZQUFRLE1BQU0sR0FBRyxRQUFRLENBQUMsVUFBVTtBQUNoQyxhQUFPLEtBQUssS0FBSztBQUFBLElBQ3JCLENBQUM7QUFDRCxZQUFRLE1BQU0sR0FBRyxPQUFPLE1BQU07QUFDMUIsY0FBUSxPQUFPLEtBQUssRUFBRSxDQUFDO0FBQUEsSUFDM0IsQ0FBQztBQUNELFlBQVEsTUFBTSxHQUFHLFNBQVMsQ0FBQyxVQUFVO0FBQ2pDLGFBQU8sS0FBSztBQUFBLElBQ2hCLENBQUM7QUFBQSxFQUNMLENBQUM7QUFDTDtBQU9BLFNBQVMsZ0JBQWdCLGNBQWM7QUFFbkMsUUFBTSxXQUFXLEtBQUssTUFBTSxZQUFZO0FBQ3hDLFNBQU87QUFDWDtBQVFBLFNBQVMsWUFBWSxRQUFRO0FBRXpCLFVBQVEsT0FBTyxNQUFNLEtBQUssVUFBVSxNQUFNLENBQUM7QUFDL0M7QUFTQSxTQUFTLDJCQUEyQixPQUFPO0FBQ3ZDLFNBQU8sTUFBTSx1QkFBdUIsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSyxDQUFDLEVBQUU7QUFDNUYsU0FBTyxFQUFFLFFBQVEsQ0FBQyxFQUFFO0FBQ3hCO0FBVUEsU0FBUyxtQkFBbUIsT0FBTztBQUUvQixNQUFJLGlCQUFpQixPQUFPO0FBQ3hCLFlBQVEsT0FBTyxNQUFNLEdBQUcsTUFBTSxTQUFTLE1BQU0sT0FBTztBQUFBLENBQUk7QUFBQSxFQUM1RCxPQUNLO0FBQ0QsWUFBUSxPQUFPLE1BQU0sR0FBRyxPQUFPLEtBQUssQ0FBQztBQUFBLENBQUk7QUFBQSxFQUM3QztBQUVBLFNBQU8sTUFBTSx1QkFBdUIsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSyxDQUFDLEVBQUU7QUFFNUYsU0FBTyxhQUFhO0FBQ3BCLFNBQU8sTUFBTTtBQUViLFVBQVEsS0FBSyxXQUFXLEtBQUs7QUFDakM7QUFtQk8sU0FBUyxvQkFBb0IsZ0JBQWdCO0FBQ2hELFFBQU0sRUFBRSxRQUFRLE9BQU8sSUFBSTtBQUMzQixTQUFPLFdBQVcsU0FBWSxFQUFFLFFBQVEsT0FBTyxJQUFJLEVBQUUsT0FBTztBQUNoRTtBQWtDQSxlQUFzQixRQUFRLFFBQVE7QUFDbEMsTUFBSTtBQUNKLE1BQUk7QUFJQSxVQUFNLGFBQWEsUUFBUSxJQUFJO0FBQy9CLFVBQU0sYUFBYSxRQUFRLElBQUk7QUFDL0IsUUFBSSxlQUFlLFVBQWEsZUFBZSxVQUFhLGVBQWUsWUFBWTtBQUVuRixjQUFRLE9BQU8sTUFBTSwrQ0FBK0MsVUFBVSxvQ0FBb0MsVUFBVTtBQUFBLENBQ3RFO0FBQ3RELGNBQVEsS0FBSyxXQUFXLEtBQUs7QUFBQSxJQUNqQztBQUVBLFFBQUksZUFBZSxRQUFXO0FBQzFCLGFBQU8sV0FBVyxVQUFVO0FBQUEsSUFDaEM7QUFFQSxRQUFJO0FBQ0osUUFBSTtBQUNBLHFCQUFlLE1BQU0sVUFBVTtBQUFBLElBQ25DLFNBQ08sT0FBTztBQUNWLGFBQU8sU0FBUyxPQUFPLHNCQUFzQjtBQUM3QyxlQUFTLDJCQUEyQixLQUFLO0FBQ3pDO0FBQUEsSUFDSjtBQUVBLFFBQUk7QUFDSixRQUFJO0FBQ0EsY0FBUSxnQkFBZ0IsWUFBWTtBQUFBLElBQ3hDLFNBQ08sT0FBTztBQUNWLGFBQU8sU0FBUyxPQUFPLDRCQUE0QjtBQUNuRCxlQUFTLDJCQUEyQixLQUFLO0FBQ3pDO0FBQUEsSUFDSjtBQUVBLFVBQU0sZ0JBQWdCLE9BQU87QUFDN0IsV0FBTyxXQUFXLGVBQWUsS0FBSztBQUV0QyxVQUFNLFVBQVUsa0JBQWtCLGlCQUFpQixFQUFFLFFBQVEsZUFBZSxlQUFlLElBQUksRUFBRSxPQUFPO0FBRXhHLFFBQUk7QUFDQSxZQUFNLGlCQUFpQixNQUFNLE9BQU8sT0FBTyxPQUFPO0FBQ2xELGVBQVMsb0JBQW9CLGNBQWM7QUFBQSxJQUMvQyxTQUNPLE9BQU87QUFHVix5QkFBbUIsS0FBSztBQUFBLElBQzVCO0FBQUEsRUFDSixVQUNBO0FBRUksUUFBSSxXQUFXLFFBQVc7QUFDdEIsa0JBQVksT0FBTyxNQUFNO0FBQUEsSUFDN0I7QUFFQSxXQUFPLGFBQWE7QUFDcEIsV0FBTyxNQUFNO0FBSWIsUUFBSSxRQUFRLFdBQVcsUUFBVztBQUM5QixjQUFRLE9BQU8sTUFBTSxPQUFPLE1BQU07QUFDbEMsY0FBUSxLQUFLLFdBQVcsS0FBSztBQUFBLElBQ2pDO0FBRUEsWUFBUSxLQUFLLFdBQVcsT0FBTztBQUFBLEVBQ25DO0FBQ0o7OztBWHJNQSxJQUFNLGlCQUFpQjtBQUN2QixJQUFNLGNBQWM7QUFLYixJQUFNLGlCQUFOLGNBQTZCLE1BQU07QUFBQSxFQUd4QyxZQUNrQixVQUNBLFVBQ2hCLE9BQ0E7QUFDQSxVQUFNLFNBQVMsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSztBQUNwRSxVQUFNLGdDQUFnQyxRQUFRLE9BQU8sUUFBUSxLQUFLLE1BQU0sRUFBRTtBQUwxRDtBQUNBO0FBS2hCLFNBQUssUUFBUTtBQUFBLEVBQ2Y7QUFBQSxFQVZrQixPQUFPO0FBVzNCO0FBS08sSUFBTSxrQkFBTixjQUE4QixNQUFNO0FBQUEsRUFHekMsWUFDa0IsVUFDQSxNQUNoQixPQUNBO0FBQ0EsVUFBTSxTQUFTLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDcEUsVUFBTSwrQkFBK0IsS0FBSyxNQUFNLGlCQUFpQixRQUFRLEtBQUssTUFBTSxFQUFFO0FBTHRFO0FBQ0E7QUFLaEIsU0FBSyxRQUFRO0FBQUEsRUFDZjtBQUFBLEVBVmtCLE9BQU87QUFXM0I7QUFLTyxJQUFNLG9CQUFOLGNBQWdDLE1BQU07QUFBQSxFQUczQyxZQUNrQixXQUNBLEtBQ2hCLE9BQ0E7QUFDQSxVQUFNLFNBQVMsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSztBQUNwRSxVQUFNLDJCQUEyQixHQUFHLGdCQUFnQixTQUFTLEtBQUssTUFBTSxFQUFFO0FBTDFEO0FBQ0E7QUFLaEIsU0FBSyxRQUFRO0FBQUEsRUFDZjtBQUFBLEVBVmtCLE9BQU87QUFXM0I7QUFLTyxJQUFNLHNCQUFOLGNBQWtDLE1BQU07QUFBQSxFQUc3QyxZQUNrQixXQUNoQixPQUNBO0FBQ0EsVUFBTSxTQUFTLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDcEUsVUFBTSw4QkFBOEIsU0FBUyxLQUFLLE1BQU0sRUFBRTtBQUoxQztBQUtoQixTQUFLLFFBQVE7QUFBQSxFQUNmO0FBQUEsRUFUa0IsT0FBTztBQVUzQjtBQUVBLFNBQVMsZUFBZSxLQUFhLE9BQXFCO0FBQ3hELE1BQUksQ0FBQyxZQUFZLEtBQUssR0FBRyxHQUFHO0FBQzFCLFVBQU0sSUFBSSxNQUFNLFdBQVcsS0FBSyxLQUFLLEdBQUcsRUFBRTtBQUFBLEVBQzVDO0FBQ0Y7QUFZTyxTQUFTLGdCQUFnQixVQUFrQixVQUE0QjtBQUM1RSxpQkFBZSxVQUFVLFdBQVc7QUFFcEMsTUFBSTtBQUNGLFVBQU0sU0FBUztBQUFBLE1BQ2I7QUFBQSxNQUNBLENBQUMsT0FBTyxlQUFlLEdBQUcsUUFBUSxVQUFVLE1BQU0sS0FBSyxnQ0FBZ0M7QUFBQSxNQUN2RjtBQUFBLFFBQ0UsS0FBSztBQUFBLFFBQ0wsVUFBVTtBQUFBLFFBQ1YsU0FBUztBQUFBLFFBQ1QsT0FBTyxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUEsTUFDaEM7QUFBQSxJQUNGLEVBQUUsS0FBSztBQUNQLFFBQUksQ0FBQyxPQUFRLFFBQU8sQ0FBQztBQUNyQixVQUFNLE9BQU8sT0FBTyxNQUFNLElBQUk7QUFDOUIsZUFBVyxPQUFPLE1BQU07QUFDdEIscUJBQWUsS0FBSyxZQUFZO0FBQUEsSUFDbEM7QUFDQSxXQUFPO0FBQUEsRUFDVCxTQUFTLE9BQU87QUFDZCxVQUFNLElBQUksZUFBZSxVQUFVLFVBQVUsS0FBSztBQUFBLEVBQ3BEO0FBQ0Y7QUFTTyxTQUFTLHVCQUF1QixZQUFzQixnQkFBb0M7QUFDL0YsUUFBTSxhQUFhLElBQUksSUFBSSxjQUFjO0FBQ3pDLFNBQU8sV0FBVyxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsSUFBSSxHQUFHLENBQUM7QUFDeEQ7QUFZTyxTQUFTLGtCQUFrQixVQUFrQixNQUF3QjtBQUMxRSxNQUFJLEtBQUssV0FBVyxFQUFHLFFBQU87QUFHOUIsUUFBTSxTQUFTLEtBQUssS0FBSyxTQUFTLENBQUM7QUFDbkMsaUJBQWUsUUFBUSxtQkFBbUI7QUFFMUMsTUFBSTtBQUlGLFVBQU0sY0FBYyxhQUFhLE9BQU8sQ0FBQyxZQUFZLGFBQWEsTUFBTSxLQUFLLE1BQU0sR0FBRztBQUFBLE1BQ3BGLEtBQUs7QUFBQSxNQUNMLFVBQVU7QUFBQSxNQUNWLFNBQVM7QUFBQSxNQUNULE9BQU8sQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLElBQ2hDLENBQUMsRUFBRSxLQUFLO0FBQ1IsVUFBTSxPQUFPLFlBQVksU0FBUyxHQUFHLElBQUksR0FBRyxNQUFNLE9BQU87QUFFekQsV0FBTyxhQUFhLE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxVQUFVLE1BQU0sS0FBSyxnQ0FBZ0MsR0FBRztBQUFBLE1BQ2pHLEtBQUs7QUFBQSxNQUNMLFVBQVU7QUFBQSxNQUNWLFNBQVM7QUFBQSxNQUNULE9BQU8sQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLElBQ2hDLENBQUMsRUFBRSxLQUFLO0FBQUEsRUFDVixTQUFTLE9BQU87QUFDZCxVQUFNLElBQUksZ0JBQWdCLFVBQVUsTUFBTSxLQUFLO0FBQUEsRUFDakQ7QUFDRjtBQVNBLGVBQWUsMEJBQTBCLFdBQW1CLE1BQStCO0FBQ3pGLGFBQVcsT0FBTyxNQUFNO0FBQ3RCLFFBQUk7QUFDRixZQUFNLHNCQUFzQixXQUFXLEdBQUc7QUFBQSxJQUM1QyxTQUFTLE9BQU87QUFDZCxZQUFNLElBQUksa0JBQWtCLFdBQVcsS0FBSyxLQUFLO0FBQUEsSUFDbkQ7QUFBQSxFQUNGO0FBQ0Y7QUFTQSxlQUFlLGVBQWVFLFNBQWdCLFdBQWtDO0FBQzlFLFFBQU0sY0FBYyxjQUFjO0FBRWxDLE1BQUk7QUFDRixRQUFJLGFBQWE7QUFDZixZQUFNLGlCQUFpQixXQUFXO0FBQ2xDLE1BQUFBLFFBQU8sS0FBSywrQkFBK0IsRUFBRSxLQUFLLFlBQVksQ0FBQztBQUFBLElBQ2pFO0FBRUEseUJBQXFCLFNBQVM7QUFDOUIscUJBQWlCLFNBQVM7QUFDMUIsSUFBQUEsUUFBTyxLQUFLLDBCQUEwQixFQUFFLFVBQVUsQ0FBQztBQUFBLEVBQ3JELFNBQVMsT0FBTztBQUNkLFVBQU0sSUFBSSxvQkFBb0IsV0FBVyxLQUFLO0FBQUEsRUFDaEQ7QUFDRjtBQWFBLGVBQWUsa0JBQ2JBLFNBQ0EsV0FDQSxpQkFDd0M7QUFDeEMsTUFBSTtBQUNGLFVBQU0sZUFBZUEsU0FBUSxTQUFTO0FBQUEsRUFDeEMsU0FBUyxPQUFPO0FBQ2QsUUFBSSxpQkFBaUIscUJBQXFCO0FBQ3hDLE1BQUFBLFFBQU8sTUFBTSwwQkFBMEIsRUFBRSxXQUFXLE1BQU0sV0FBVyxPQUFPLE1BQU0sUUFBUSxDQUFDO0FBQzNGLGFBQU8sV0FBVztBQUFBLFFBQ2hCLFVBQVU7QUFBQSxRQUNWLGVBQWU7QUFBQSxVQUNiO0FBQUEsVUFDQTtBQUFBLFVBQ0EsWUFBWSxNQUFNLE9BQU87QUFBQSxVQUN6QjtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQSx5Q0FBeUMsU0FBUztBQUFBLFFBQ3BELEVBQUUsS0FBSyxJQUFJO0FBQUEsUUFDWCxRQUFRLG1CQUFtQixNQUFNLE9BQU87QUFBQSxNQUMxQyxDQUFDO0FBQUEsSUFDSDtBQUNBLFVBQU07QUFBQSxFQUNSO0FBQ0EsU0FBTyxXQUFXLEVBQUUsVUFBVSxXQUFXLGVBQWUsZ0JBQWdCLENBQUM7QUFDM0U7QUFFQSxJQUFPLGVBQVEsU0FBUyxDQUFDLEdBQUcsT0FBTyxPQUFPLEVBQUUsUUFBQUEsUUFBTyxNQUFNO0FBQ3ZELE1BQUk7QUFDSixNQUFJO0FBQ0Ysa0JBQWMsbUJBQW1CO0FBQUEsRUFDbkMsU0FBUyxPQUFPO0FBQ2QsVUFBTSxVQUFVLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDckUsSUFBQUEsUUFBTyxNQUFNLDJDQUEyQyxFQUFFLE9BQU8sUUFBUSxDQUFDO0FBQzFFLFdBQU8sV0FBVztBQUFBLE1BQ2hCLFVBQVU7QUFBQSxNQUNWLGVBQWU7QUFBQSxJQUNqQixDQUFDO0FBQUEsRUFDSDtBQUVBLFFBQU0sVUFBVSxtQkFBbUIsTUFBTSxVQUFVO0FBQ25ELE1BQUksQ0FBQyxTQUFTO0FBQ1osSUFBQUEsUUFBTyxLQUFLLDhEQUF5RDtBQUNyRSxXQUFPLFdBQVc7QUFBQSxNQUNoQixVQUFVO0FBQUEsTUFDVixlQUFlO0FBQUEsSUFDakIsQ0FBQztBQUFBLEVBQ0g7QUFFQSxRQUFNLFlBQVksTUFBTTtBQUd4QixNQUFJO0FBQ0osTUFBSTtBQUNGLGlCQUFhLGdCQUFnQixZQUFZLGNBQWMsT0FBTztBQUFBLEVBQ2hFLFNBQVMsT0FBTztBQUNkLFFBQUksaUJBQWlCLGdCQUFnQjtBQUNuQyxNQUFBQSxRQUFPLE1BQU0sMEJBQTBCLEVBQUUsVUFBVSxNQUFNLFVBQVUsT0FBTyxNQUFNLFFBQVEsQ0FBQztBQUN6RixhQUFPLFdBQVc7QUFBQSxRQUNoQixVQUFVO0FBQUEsUUFDVixlQUFlO0FBQUEsVUFDYixrREFBa0QsTUFBTSxRQUFRO0FBQUEsVUFDaEU7QUFBQSxVQUNBLFVBQVUsTUFBTSxPQUFPO0FBQUEsVUFDdkI7QUFBQSxVQUNBO0FBQUEsVUFDQSx5REFBeUQsTUFBTSxRQUFRO0FBQUEsVUFDdkU7QUFBQSxVQUNBLGdDQUFnQyxNQUFNLFFBQVE7QUFBQSxRQUNoRCxFQUFFLEtBQUssSUFBSTtBQUFBLFFBQ1gsUUFBUSxzQkFBc0IsTUFBTSxPQUFPO0FBQUEsTUFDN0MsQ0FBQztBQUFBLElBQ0g7QUFDQSxVQUFNO0FBQUEsRUFDUjtBQUVBLE1BQUksV0FBVyxXQUFXLEdBQUc7QUFDM0IsV0FBTyxrQkFBa0JBLFNBQVEsV0FBVyxzREFBaUQ7QUFBQSxFQUMvRjtBQUdBLE1BQUk7QUFDSixNQUFJO0FBQ0YscUJBQWlCLGtCQUFrQixTQUFTO0FBQUEsRUFDOUMsU0FBUyxPQUFPO0FBQ2QsVUFBTSxVQUFVLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDckUsSUFBQUEsUUFBTyxNQUFNLGtDQUFrQyxFQUFFLE9BQU8sUUFBUSxDQUFDO0FBQ2pFLFdBQU8sV0FBVztBQUFBLE1BQ2hCLFVBQVU7QUFBQSxNQUNWLGVBQWU7QUFBQSxRQUNiLHFEQUFxRCxTQUFTO0FBQUEsUUFDOUQ7QUFBQSxRQUNBLFVBQVUsT0FBTztBQUFBLFFBQ2pCO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBLDBDQUEwQyxTQUFTO0FBQUEsTUFDckQsRUFBRSxLQUFLLElBQUk7QUFBQSxNQUNYLFFBQVEsNEJBQTRCLE9BQU87QUFBQSxJQUM3QyxDQUFDO0FBQUEsRUFDSDtBQUVBLFFBQU0sZUFBZSx1QkFBdUIsWUFBWSxjQUFjO0FBRXRFLE1BQUksYUFBYSxXQUFXLEdBQUc7QUFDN0IsV0FBTztBQUFBLE1BQ0xBO0FBQUEsTUFDQTtBQUFBLE1BQ0EsNEJBQXVCLFdBQVcsTUFBTTtBQUFBLElBQzFDO0FBQUEsRUFDRjtBQUtBLFFBQU0sV0FBcUIsQ0FBQztBQUU1QixNQUFJO0FBQ0osTUFBSTtBQUNGLGtCQUFjLGtCQUFrQixZQUFZLGNBQWMsWUFBWTtBQUFBLEVBQ3hFLFNBQVMsT0FBTztBQUNkLFFBQUksaUJBQWlCLGlCQUFpQjtBQUNwQyxNQUFBQSxRQUFPLE1BQU0sMkJBQTJCLEVBQUUsVUFBVSxNQUFNLFVBQVUsT0FBTyxNQUFNLFFBQVEsQ0FBQztBQUMxRixvQkFBYztBQUFBLFFBQ1osZ0NBQWdDLE1BQU0sS0FBSyxNQUFNO0FBQUEsUUFDakQ7QUFBQSxRQUNBLFVBQVUsTUFBTSxPQUFPO0FBQUEsUUFDdkI7QUFBQSxRQUNBO0FBQUEsUUFDQSxZQUFZLE1BQU0sUUFBUSxTQUFTLE1BQU0sS0FBSyxNQUFNLEtBQUssU0FBUyxDQUFDLENBQUM7QUFBQSxNQUN0RSxFQUFFLEtBQUssSUFBSTtBQUNYLGVBQVMsS0FBSywyQkFBMkIsTUFBTSxPQUFPLEVBQUU7QUFBQSxJQUMxRCxPQUFPO0FBQ0wsWUFBTTtBQUFBLElBQ1I7QUFBQSxFQUNGO0FBRUEsTUFBSTtBQUNGLFVBQU0sMEJBQTBCLFdBQVcsWUFBWTtBQUFBLEVBQ3pELFNBQVMsT0FBTztBQUNkLFFBQUksaUJBQWlCLG1CQUFtQjtBQUN0QyxNQUFBQSxRQUFPLE1BQU0sd0NBQXdDO0FBQUEsUUFDbkQsV0FBVyxNQUFNO0FBQUEsUUFDakIsS0FBSyxNQUFNO0FBQUEsUUFDWCxPQUFPLE1BQU07QUFBQSxNQUNmLENBQUM7QUFDRCxlQUFTO0FBQUEsUUFDUCwrQkFBK0IsTUFBTSxHQUFHLEtBQUssTUFBTSxPQUFPO0FBQUEsTUFHNUQ7QUFBQSxJQUNGLE9BQU87QUFDTCxZQUFNO0FBQUEsSUFDUjtBQUFBLEVBQ0Y7QUFFQSxNQUFJO0FBQ0YsVUFBTSxlQUFlQSxTQUFRLFNBQVM7QUFBQSxFQUN4QyxTQUFTLE9BQU87QUFDZCxRQUFJLGlCQUFpQixxQkFBcUI7QUFDeEMsTUFBQUEsUUFBTyxNQUFNLDBCQUEwQixFQUFFLFdBQVcsTUFBTSxXQUFXLE9BQU8sTUFBTSxRQUFRLENBQUM7QUFDM0YsZUFBUztBQUFBLFFBQ1AsMkJBQTJCLE1BQU0sT0FBTyw0R0FFeUIsU0FBUztBQUFBLE1BQzVFO0FBQUEsSUFDRixPQUFPO0FBQ0wsWUFBTTtBQUFBLElBQ1I7QUFBQSxFQUNGO0FBRUEsUUFBTSxnQkFBZ0IsR0FBRyxhQUFhLE1BQU0sdUJBQXVCLGFBQWEsU0FBUyxJQUFJLE1BQU0sRUFBRTtBQUNyRyxRQUFNLGVBQWUsU0FBUyxTQUFTLElBQUk7QUFBQTtBQUFBO0FBQUEsRUFBa0IsU0FBUyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSSxDQUFDLEtBQUs7QUFFMUcsU0FBTyxXQUFXO0FBQUEsSUFDaEIsVUFBVTtBQUFBLElBQ1YsUUFBUSwyQ0FBMkMsYUFBYTtBQUFBO0FBQUEsRUFBUyxXQUFXLEdBQUcsWUFBWTtBQUFBLEVBQ3JHLENBQUM7QUFDSCxDQUFDOzs7QVk5YUQsUUFBUSxJQUFJLGdDQUFnQyxJQUFJO0FBS2hELFFBQVEsWUFBSTsiLAogICJuYW1lcyI6IFsibWtkaXJTeW5jIiwgInJlYWRGaWxlU3luYyIsICJ1bmxpbmtTeW5jIiwgIndyaXRlRmlsZVN5bmMiLCAiaG9tZWRpciIsICJqb2luIiwgIkxPQ0tfVElNRU9VVF9NUyIsICJqb2luIiwgImhvbWVkaXIiLCAibWtkaXJTeW5jIiwgInJlYWRGaWxlU3luYyIsICJ1bmxpbmtTeW5jIiwgInJlYWRGaWxlU3luYyIsICJ1bmxpbmtTeW5jIiwgInJlYWRGaWxlU3luYyIsICJyZWFkRmlsZVN5bmMiLCAiY2xvc2VTeW5jIiwgIm1rZGlyU3luYyIsICJvcGVuU3luYyIsICJkaXJuYW1lIiwgImxvZ2dlciJdCn0K
