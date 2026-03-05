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

// ../sdk/src/protocol/types/branch.ts
var EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

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
function stopHook(config, handler) {
  return createHookFunction("Stop", config, handler);
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

// ../../../../../../../node_modules/@goodfoot/claude-code-hooks/dist/outputs.js
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

// ../../../../../../../node_modules/@goodfoot/claude-code-hooks/dist/runtime.js
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
process.env["CLAUDE_CODE_HOOKS_CLI_LOG_FILE"] = "/workspace/.worktrees/cards/main-93/2/.cards/logs/claude-code-cards-runtime-hooks.log";
execute(stop_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3N0b3AudHMiLCAiLi4vY2xhdWRlLWNvZGUtc2Vzc2lvbnMvc3JjL2luZGV4LnRzIiwgIi4uL2NsYXVkZS1jb2RlLXNlc3Npb25zL3NyYy9pbnRlcm5hbC50cyIsICIuLi9jbGF1ZGUtY29kZS1zZXNzaW9ucy9zcmMvaXBjLnRzIiwgIi4uL2NsYXVkZS1jb2RlLXNlc3Npb25zL3NyYy9wcm9jZXNzLXRyZWUudHMiLCAiLi4vY2xhdWRlLWNvZGUtc2Vzc2lvbnMvc3JjL2NhcmQtcmVwby50cyIsICIuLi9zZGsvc3JjL2NvbmZpZy9lbnYudHMiLCAiLi4vc2RrL3NyYy9wcm90b2NvbC90eXBlcy9icmFuY2gudHMiLCAiLi4vLi4vLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2Vudi5qcyIsICIuLi8uLi8uLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvaG9va3MuanMiLCAiLi4vLi4vLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2xvZ2dlci5qcyIsICIuLi8uLi8uLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3Qvb3V0cHV0cy5qcyIsICIuLi8uLi8uLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvcnVudGltZS5qcyIsICJzcmMvc3RvcC1lbnRyeS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBTdG9wIGhvb2sgaW1wbGVtZW50YXRpb24uXG4gKlxuICogUnVucyBhcyBhIHN1YnByb2Nlc3Mgb2YgYW4gYWN0aW9uLiBVc2VzIHtAbGluayBleHRyYWN0QWN0aW9uSW5wdXR9IHRvXG4gKiBjb25maXJtIHdlIGFyZSBpbnNpZGUgYW4gYWN0aW9uIHN1YnByb2Nlc3MgYW5kIHRvIGV4cG9zZSB0aGUgYWN0aW9uXG4gKiBwcm9jZXNzIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBBZnRlciBjb25maXJtaW5nIHRoZSBhY3Rpb24gY29udGV4dCwgdGhlIGhvb2sgY2hlY2tzIGZvciB1bmF0dHJpYnV0ZWRcbiAqIGNvbW1pdHMgaW4gdGhlIGNhcmQgcmVwbyBzaW5jZSB0aGUgc2Vzc2lvbiBzdGFydGVkICh0cmFja2VkIHZpYSBhXG4gKiBwZXItc2Vzc2lvbiBgLmhlYWRgIGZpbGUpLiBVbmF0dHJpYnV0ZWQgY29tbWl0cyBhcmUgdGhvc2Ugbm90IHJlY29yZGVkXG4gKiBpbiB0aGUgc2Vzc2lvbidzIENTViBieSB0aGUgY2FyZC1yZXBvIHBvc3QtY29tbWl0IGhvb2suXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFN0b3AgaG9vayBpbXBsZW1lbnRhdGlvblxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N0b3BcbiAqL1xuXG5pbXBvcnQgeyBleGVjRmlsZVN5bmMgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZmluZENsYXVkZVBpZCwgcmVtb3ZlU2Vzc2lvblBpZCB9IGZyb20gJ0BjYXJkcy9jbGF1ZGUtY29kZS1zZXNzaW9ucyc7XG5pbXBvcnQge1xuICBhcHBlbmRDb21taXRUb1Nlc3Npb24sXG4gIGdldFNlc3Npb25Db21taXRzLFxuICByZWFkU2Vzc2lvbkhlYWRTaGEsXG4gIHJlbW92ZVNlc3Npb25Dc3YsXG4gIHJlbW92ZVNlc3Npb25IZWFkU2hhXG59IGZyb20gJ0BjYXJkcy9jbGF1ZGUtY29kZS1zZXNzaW9ucy9jYXJkLXJlcG8nO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25JbnB1dCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IGV4dHJhY3RBY3Rpb25JbnB1dCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IEVNUFRZX1RSRUVfU0hBIH0gZnJvbSAnQGNhcmRzL3Nkay9wcm90b2NvbCc7XG5pbXBvcnQgdHlwZSB7IExvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG5pbXBvcnQgeyBzdG9wSG9vaywgc3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG5cbmNvbnN0IFNIQV9QQVRURVJOID0gL15bMC05YS1mXXs0MH0kL2k7XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gYGdpdCBsb2dgIGZhaWxzIHRvIGxpc3QgY29tbWl0cyBzaW5jZSBhIGJhc2VsaW5lIFNIQS5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbW1pdExvZ0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBvdmVycmlkZSByZWFkb25seSBuYW1lID0gJ0NvbW1pdExvZ0Vycm9yJztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgcmVwb1BhdGg6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgc2luY2VTaGE6IHN0cmluZyxcbiAgICBjYXVzZTogdW5rbm93blxuICApIHtcbiAgICBjb25zdCByZWFzb24gPSBjYXVzZSBpbnN0YW5jZW9mIEVycm9yID8gY2F1c2UubWVzc2FnZSA6IFN0cmluZyhjYXVzZSk7XG4gICAgc3VwZXIoYEZhaWxlZCB0byBsaXN0IGNvbW1pdHMgc2luY2UgJHtzaW5jZVNoYX0gaW4gJHtyZXBvUGF0aH06ICR7cmVhc29ufWApO1xuICAgIHRoaXMuY2F1c2UgPSBjYXVzZTtcbiAgfVxufVxuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIGBnaXQgZGlmZmAgZmFpbHMgdG8gZ2VuZXJhdGUgYSBkaWZmIGZvciB1bmF0dHJpYnV0ZWQgY29tbWl0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbW1pdERpZmZFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgbmFtZSA9ICdDb21taXREaWZmRXJyb3InO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSByZXBvUGF0aDogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBzaGFzOiBzdHJpbmdbXSxcbiAgICBjYXVzZTogdW5rbm93blxuICApIHtcbiAgICBjb25zdCByZWFzb24gPSBjYXVzZSBpbnN0YW5jZW9mIEVycm9yID8gY2F1c2UubWVzc2FnZSA6IFN0cmluZyhjYXVzZSk7XG4gICAgc3VwZXIoYEZhaWxlZCB0byBnZW5lcmF0ZSBkaWZmIGZvciAke3NoYXMubGVuZ3RofSBjb21taXQocykgaW4gJHtyZXBvUGF0aH06ICR7cmVhc29ufWApO1xuICAgIHRoaXMuY2F1c2UgPSBjYXVzZTtcbiAgfVxufVxuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIHJlY29yZGluZyBhbiB1bmF0dHJpYnV0ZWQgY29tbWl0IHRvIHRoZSBzZXNzaW9uIENTViBmYWlscy5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbW1pdFJlY29yZEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBvdmVycmlkZSByZWFkb25seSBuYW1lID0gJ0NvbW1pdFJlY29yZEVycm9yJztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgc2Vzc2lvbklkOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IHNoYTogc3RyaW5nLFxuICAgIGNhdXNlOiB1bmtub3duXG4gICkge1xuICAgIGNvbnN0IHJlYXNvbiA9IGNhdXNlIGluc3RhbmNlb2YgRXJyb3IgPyBjYXVzZS5tZXNzYWdlIDogU3RyaW5nKGNhdXNlKTtcbiAgICBzdXBlcihgRmFpbGVkIHRvIHJlY29yZCBjb21taXQgJHtzaGF9IGZvciBzZXNzaW9uICR7c2Vzc2lvbklkfTogJHtyZWFzb259YCk7XG4gICAgdGhpcy5jYXVzZSA9IGNhdXNlO1xuICB9XG59XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gc2Vzc2lvbiBjbGVhbnVwIChQSUQvQ1NWIHJlbW92YWwpIGZhaWxzLlxuICovXG5leHBvcnQgY2xhc3MgU2Vzc2lvbkNsZWFudXBFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgbmFtZSA9ICdTZXNzaW9uQ2xlYW51cEVycm9yJztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgc2Vzc2lvbklkOiBzdHJpbmcsXG4gICAgY2F1c2U6IHVua25vd25cbiAgKSB7XG4gICAgY29uc3QgcmVhc29uID0gY2F1c2UgaW5zdGFuY2VvZiBFcnJvciA/IGNhdXNlLm1lc3NhZ2UgOiBTdHJpbmcoY2F1c2UpO1xuICAgIHN1cGVyKGBGYWlsZWQgdG8gY2xlYW4gdXAgc2Vzc2lvbiAke3Nlc3Npb25JZH06ICR7cmVhc29ufWApO1xuICAgIHRoaXMuY2F1c2UgPSBjYXVzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhc3NlcnRWYWxpZFNoYShzaGE6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIVNIQV9QQVRURVJOLnRlc3Qoc2hhKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke2xhYmVsfTogJHtzaGF9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFsbCBjb21taXQgU0hBcyBiZXR3ZWVuIHNpbmNlU2hhIGFuZCBIRUFEIGluIHRoZSBnaXZlbiByZXBvLFxuICogZXhjbHVkaW5nIGNvbW1pdHMgdGhhdCBvbmx5IHRvdWNoIGZpbGVzIHVuZGVyIGBzdHJlYW1zL2NsYXVkZS1jb2RlLXNlc3Npb24vYC5cbiAqIFJ1bnM6IGdpdCBsb2cgLS1mb3JtYXQ9JUggc2luY2VTaGEuLkhFQUQgLS0gLiA6IXN0cmVhbXMvY2xhdWRlLWNvZGUtc2Vzc2lvbi9cbiAqXG4gKiBAcGFyYW0gcmVwb1BhdGggLSBDYXJkIHJlcG9zaXRvcnkgcGF0aCB3aGVyZSBnaXQgY29tbWFuZHMgc2hvdWxkIGV4ZWN1dGUuXG4gKiBAcGFyYW0gc2luY2VTaGEgLSBCYXNlbGluZSBTSEEgY2FwdHVyZWQgYXQgc2Vzc2lvbiBzdGFydC5cbiAqIEByZXR1cm5zIE5ld2VyIGNvbW1pdCBTSEFzIGluIHJldmVyc2UgY2hyb25vbG9naWNhbCBvcmRlciAobmV3ZXN0IGZpcnN0KS5cbiAqIEB0aHJvd3Mge0NvbW1pdExvZ0Vycm9yfSBXaGVuIHRoZSBnaXQgbG9nIGNvbW1hbmQgZmFpbHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb21taXRzU2luY2UocmVwb1BhdGg6IHN0cmluZywgc2luY2VTaGE6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgYXNzZXJ0VmFsaWRTaGEoc2luY2VTaGEsICdzaW5jZSBTSEEnKTtcblxuICB0cnkge1xuICAgIGNvbnN0IG91dHB1dCA9IGV4ZWNGaWxlU3luYyhcbiAgICAgICdnaXQnLFxuICAgICAgWydsb2cnLCAnLS1mb3JtYXQ9JUgnLCBgJHtzaW5jZVNoYX0uLkhFQURgLCAnLS0nLCAnLicsICc6IXN0cmVhbXMvY2xhdWRlLWNvZGUtc2Vzc2lvbi8nXSxcbiAgICAgIHtcbiAgICAgICAgY3dkOiByZXBvUGF0aCxcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGYtOCcsXG4gICAgICAgIHRpbWVvdXQ6IDEwMDAwLFxuICAgICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgICB9XG4gICAgKS50cmltKCk7XG4gICAgaWYgKCFvdXRwdXQpIHJldHVybiBbXTtcbiAgICBjb25zdCBzaGFzID0gb3V0cHV0LnNwbGl0KCdcXG4nKTtcbiAgICBmb3IgKGNvbnN0IHNoYSBvZiBzaGFzKSB7XG4gICAgICBhc3NlcnRWYWxpZFNoYShzaGEsICdjb21taXQgU0hBJyk7XG4gICAgfVxuICAgIHJldHVybiBzaGFzO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBDb21taXRMb2dFcnJvcihyZXBvUGF0aCwgc2luY2VTaGEsIGVycm9yKTtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgY29tbWl0cyBmcm9tIGFsbENvbW1pdHMgdGhhdCBhcmUgTk9UIGluIHNlc3Npb25Db21taXRzLlxuICpcbiAqIEBwYXJhbSBhbGxDb21taXRzIC0gRnVsbCBjb21taXQgbGlzdCBkZXRlY3RlZCBzaW5jZSBzZXNzaW9uIHN0YXJ0LlxuICogQHBhcmFtIHNlc3Npb25Db21taXRzIC0gQ29tbWl0cyBhbHJlYWR5IGF0dHJpYnV0ZWQgdG8gdGhlIGN1cnJlbnQgc2Vzc2lvbi5cbiAqIEByZXR1cm5zIFNIQXMgdGhhdCBzdGlsbCBuZWVkIGF0dHJpYnV0aW9uIHJldmlldy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFVuYXR0cmlidXRlZENvbW1pdHMoYWxsQ29tbWl0czogc3RyaW5nW10sIHNlc3Npb25Db21taXRzOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgc2Vzc2lvblNldCA9IG5ldyBTZXQoc2Vzc2lvbkNvbW1pdHMpO1xuICByZXR1cm4gYWxsQ29tbWl0cy5maWx0ZXIoKHNoYSkgPT4gIXNlc3Npb25TZXQuaGFzKHNoYSkpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGNvbWJpbmVkIGRpZmYgY29udGVudCBmb3IgdGhlIGdpdmVuIGNvbW1pdCBTSEFzLlxuICogVXNlcyB0aGUgcmFuZ2UgZnJvbSBvbGRlc3QgdW5hdHRyaWJ1dGVkIGNvbW1pdCdzIHBhcmVudCB0byBIRUFELlxuICogRGV0ZWN0cyBpbml0aWFsIGNvbW1pdHMgKG5vIHBhcmVudCkgYW5kIHVzZXMgdGhlIGVtcHR5IHRyZWUgU0hBIGFzIGJhc2UuXG4gKlxuICogQHBhcmFtIHJlcG9QYXRoIC0gQ2FyZCByZXBvc2l0b3J5IHBhdGggd2hlcmUgZ2l0IGNvbW1hbmRzIHNob3VsZCBleGVjdXRlLlxuICogQHBhcmFtIHNoYXMgLSBVbmF0dHJpYnV0ZWQgY29tbWl0IFNIQXMgKG5ld2VzdCBmaXJzdCBmcm9tIHtAbGluayBnZXRDb21taXRzU2luY2V9KS5cbiAqIEByZXR1cm5zIFVuaWZpZWQgZGlmZiB0ZXh0IGZvciBhbGwgdW5hdHRyaWJ1dGVkIGNoYW5nZXMuXG4gKiBAdGhyb3dzIHtDb21taXREaWZmRXJyb3J9IFdoZW4gdGhlIGdpdCBkaWZmIGNvbW1hbmQgZmFpbHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXREaWZmRm9yQ29tbWl0cyhyZXBvUGF0aDogc3RyaW5nLCBzaGFzOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIGlmIChzaGFzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnO1xuICAvLyBzaGFzIGFyZSBpbiByZXZlcnNlIGNocm9ub2xvZ2ljYWwgb3JkZXIgKG5ld2VzdCBmaXJzdCBmcm9tIGdpdCBsb2cpXG4gIC8vIG9sZGVzdCBpcyBsYXN0IGVsZW1lbnRcbiAgY29uc3Qgb2xkZXN0ID0gc2hhc1tzaGFzLmxlbmd0aCAtIDFdITtcbiAgYXNzZXJ0VmFsaWRTaGEob2xkZXN0LCAnb2xkZXN0IGNvbW1pdCBTSEEnKTtcblxuICB0cnkge1xuICAgIC8vIERldGVybWluZSB0aGUgZGlmZiBiYXNlOiBjaGVjayBpZiB0aGUgb2xkZXN0IGNvbW1pdCBoYXMgYSBwYXJlbnQuXG4gICAgLy8gYGdpdCByZXYtbGlzdCAtLXBhcmVudHMgLW4gMSBTSEFgIG91dHB1dHMgXCJTSEEgUEFSRU5ULi4uXCIgZm9yIHJlZ3VsYXJcbiAgICAvLyBjb21taXRzIGFuZCBqdXN0IFwiU0hBXCIgZm9yIGluaXRpYWwgY29tbWl0cyAobm8gcGFyZW50KS5cbiAgICBjb25zdCBwYXJlbnRDaGVjayA9IGV4ZWNGaWxlU3luYygnZ2l0JywgWydyZXYtbGlzdCcsICctLXBhcmVudHMnLCAnLW4nLCAnMScsIG9sZGVzdF0sIHtcbiAgICAgIGN3ZDogcmVwb1BhdGgsXG4gICAgICBlbmNvZGluZzogJ3V0Zi04JyxcbiAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgfSkudHJpbSgpO1xuICAgIGNvbnN0IGJhc2UgPSBwYXJlbnRDaGVjay5pbmNsdWRlcygnICcpID8gYCR7b2xkZXN0fX4xYCA6IEVNUFRZX1RSRUVfU0hBO1xuXG4gICAgcmV0dXJuIGV4ZWNGaWxlU3luYygnZ2l0JywgWydkaWZmJywgYCR7YmFzZX0uLkhFQURgLCAnLS0nLCAnLicsICc6IXN0cmVhbXMvY2xhdWRlLWNvZGUtc2Vzc2lvbi8nXSwge1xuICAgICAgY3dkOiByZXBvUGF0aCxcbiAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgdGltZW91dDogMTAwMDAsXG4gICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgfSkudHJpbSgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBDb21taXREaWZmRXJyb3IocmVwb1BhdGgsIHNoYXMsIGVycm9yKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlY29yZHMgdW5hdHRyaWJ1dGVkIGNvbW1pdHMgc28gdGhleSBhcmUgdHJlYXRlZCBhcyBhY2tub3dsZWRnZWQgb24gdGhlIG5leHQgc3RvcC5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRCB3aG9zZSBjb21taXQgQ1NWIHNob3VsZCBiZSB1cGRhdGVkLlxuICogQHBhcmFtIHNoYXMgLSBVbmF0dHJpYnV0ZWQgY29tbWl0IFNIQXMgdG8gcGVyc2lzdC5cbiAqIEB0aHJvd3Mge0NvbW1pdFJlY29yZEVycm9yfSBXaGVuIGEgY29tbWl0IGNhbm5vdCBiZSBhcHBlbmRlZCB0byB0aGUgc2Vzc2lvbiBDU1YuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlY29yZFVuYXR0cmlidXRlZENvbW1pdHMoc2Vzc2lvbklkOiBzdHJpbmcsIHNoYXM6IHN0cmluZ1tdKTogUHJvbWlzZTx2b2lkPiB7XG4gIGZvciAoY29uc3Qgc2hhIG9mIHNoYXMpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgYXBwZW5kQ29tbWl0VG9TZXNzaW9uKHNlc3Npb25JZCwgc2hhKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhyb3cgbmV3IENvbW1pdFJlY29yZEVycm9yKHNlc3Npb25JZCwgc2hhLCBlcnJvcik7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlcyBQSUQvc2Vzc2lvbiBhcnRpZmFjdHMgY3JlYXRlZCBkdXJpbmcgc2Vzc2lvbi1zdGFydC5cbiAqXG4gKiBAcGFyYW0gbG9nZ2VyIC0gSG9vayBsb2dnZXIgdXNlZCBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRCB3aG9zZSBDU1YgYnVmZmVyIHNob3VsZCBiZSBjbGVhbmVkIHVwLlxuICogQHRocm93cyB7U2Vzc2lvbkNsZWFudXBFcnJvcn0gV2hlbiBQSUQgb3IgQ1NWIGNsZWFudXAgZmFpbHMuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNsZWFudXBTZXNzaW9uKGxvZ2dlcjogTG9nZ2VyLCBzZXNzaW9uSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCByZXNvbHZlZFBpZCA9IGZpbmRDbGF1ZGVQaWQoKTtcblxuICB0cnkge1xuICAgIGlmIChyZXNvbHZlZFBpZCkge1xuICAgICAgYXdhaXQgcmVtb3ZlU2Vzc2lvblBpZChyZXNvbHZlZFBpZCk7XG4gICAgICBsb2dnZXIuaW5mbygnQ2xlYW5lZCB1cCBQSUQgcmVnaXN0cmF0aW9uJywgeyBwaWQ6IHJlc29sdmVkUGlkIH0pO1xuICAgIH1cblxuICAgIHJlbW92ZVNlc3Npb25IZWFkU2hhKHNlc3Npb25JZCk7XG4gICAgcmVtb3ZlU2Vzc2lvbkNzdihzZXNzaW9uSWQpO1xuICAgIGxvZ2dlci5pbmZvKCdDbGVhbmVkIHVwIHNlc3Npb24gQ1NWJywgeyBzZXNzaW9uSWQgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgbmV3IFNlc3Npb25DbGVhbnVwRXJyb3Ioc2Vzc2lvbklkLCBlcnJvcik7XG4gIH1cbn1cblxuLyoqXG4gKiBSdW5zIHNlc3Npb24gY2xlYW51cCBhbmQgcmV0dXJucyBhbiBhcHByb3ZlIG91dHB1dC4gV2hlbiBjbGVhbnVwIGZhaWxzXG4gKiB3aXRoIGEge0BsaW5rIFNlc3Npb25DbGVhbnVwRXJyb3J9LCB0aGUgYXBwcm92YWwgbWVzc2FnZSBpcyBhdWdtZW50ZWRcbiAqIHdpdGggYSB3YXJuaW5nIHJhdGhlciB0aGFuIGZhaWxpbmcgdGhlIGhvb2suXG4gKlxuICogQHBhcmFtIGxvZ2dlciAtIEhvb2sgbG9nZ2VyIHVzZWQgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gd2hvc2UgYXJ0aWZhY3RzIHNob3VsZCBiZSBjbGVhbmVkIHVwLlxuICogQHBhcmFtIGFwcHJvdmFsTWVzc2FnZSAtIE1lc3NhZ2UgcmV0dXJuZWQgb24gc3VjY2Vzcy5cbiAqIEByZXR1cm5zIFN0b3Agb3V0cHV0IHdpdGggZGVjaXNpb24gXCJhcHByb3ZlXCIuXG4gKiBAdGhyb3dzIFJlLXRocm93cyBub24te0BsaW5rIFNlc3Npb25DbGVhbnVwRXJyb3J9IGVycm9ycy5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gY2xlYW51cEFuZEFwcHJvdmUoXG4gIGxvZ2dlcjogTG9nZ2VyLFxuICBzZXNzaW9uSWQ6IHN0cmluZyxcbiAgYXBwcm92YWxNZXNzYWdlOiBzdHJpbmdcbik6IFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2Ygc3RvcE91dHB1dD4+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBjbGVhbnVwU2Vzc2lvbihsb2dnZXIsIHNlc3Npb25JZCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgU2Vzc2lvbkNsZWFudXBFcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdTZXNzaW9uIGNsZWFudXAgZmFpbGVkJywgeyBzZXNzaW9uSWQ6IGVycm9yLnNlc3Npb25JZCwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZScsXG4gICAgICAgIHN5c3RlbU1lc3NhZ2U6IFtcbiAgICAgICAgICBhcHByb3ZhbE1lc3NhZ2UsXG4gICAgICAgICAgJycsXG4gICAgICAgICAgYFdhcm5pbmc6ICR7ZXJyb3IubWVzc2FnZX1gLFxuICAgICAgICAgICcnLFxuICAgICAgICAgICdTdGFsZSBzZXNzaW9uIGFydGlmYWN0cyBtYXkgcmVtYWluLiBUbyBjbGVhbiB1cCBtYW51YWxseTonLFxuICAgICAgICAgICcxLiBDaGVjayBmb3IgbGVmdG92ZXIgUElEIGVudHJpZXMgaW4gdGhlIHNlc3Npb24gcmVnaXN0cnknLFxuICAgICAgICAgIGAyLiBSZW1vdmUgdGhlIHNlc3Npb24gQ1NWIGZvciBzZXNzaW9uICR7c2Vzc2lvbklkfSBpZiBpdCBleGlzdHNgXG4gICAgICAgIF0uam9pbignXFxuJyksXG4gICAgICAgIHJlYXNvbjogYENsZWFudXAgZmFpbGVkOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgfSk7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG4gIHJldHVybiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJywgc3lzdGVtTWVzc2FnZTogYXBwcm92YWxNZXNzYWdlIH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBzdG9wSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gIGxldCBhY3Rpb25JbnB1dDogQWN0aW9uSW5wdXQ7XG4gIHRyeSB7XG4gICAgYWN0aW9uSW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgIGxvZ2dlci5lcnJvcignTm90IHJ1bm5pbmcgaW5zaWRlIGFuIGFjdGlvbiBzdWJwcm9jZXNzJywgeyBlcnJvcjogbWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgICBkZWNpc2lvbjogJ2FwcHJvdmUnLFxuICAgICAgc3lzdGVtTWVzc2FnZTogJ1N0b3AgaG9vazogbm90IHJ1bm5pbmcgaW5zaWRlIGFuIGFjdGlvbiBzdWJwcm9jZXNzLidcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IGhlYWRTaGEgPSByZWFkU2Vzc2lvbkhlYWRTaGEoaW5wdXQuc2Vzc2lvbl9pZCk7XG4gIGlmICghaGVhZFNoYSkge1xuICAgIGxvZ2dlci5pbmZvKCdObyBIRUFEIFNIQSBvbiBmaWxlIFx1MjAxNCBza2lwcGluZyBjb21taXQgYXR0cmlidXRpb24gY2hlY2snKTtcbiAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgICBkZWNpc2lvbjogJ2FwcHJvdmUnLFxuICAgICAgc3lzdGVtTWVzc2FnZTogJ1N0b3AgYXBwcm92ZWQgKG5vIEhFQUQgU0hBIHRyYWNrZWQgZm9yIHRoaXMgc2Vzc2lvbikuJ1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3Qgc2Vzc2lvbklkID0gaW5wdXQuc2Vzc2lvbl9pZDtcblxuICAvLyBHZXQgYWxsIGNvbW1pdHMgc2luY2Ugc2Vzc2lvbiBzdGFydFxuICBsZXQgYWxsQ29tbWl0czogc3RyaW5nW107XG4gIHRyeSB7XG4gICAgYWxsQ29tbWl0cyA9IGdldENvbW1pdHNTaW5jZShhY3Rpb25JbnB1dC5jYXJkUmVwb1BhdGgsIGhlYWRTaGEpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIENvbW1pdExvZ0Vycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBsaXN0IGNvbW1pdHMnLCB7IHJlcG9QYXRoOiBlcnJvci5yZXBvUGF0aCwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZScsXG4gICAgICAgIHN5c3RlbU1lc3NhZ2U6IFtcbiAgICAgICAgICBgQ291bGQgbm90IGxpc3QgY29tbWl0cyBzaW5jZSBzZXNzaW9uIHN0YXJ0IGluICcke2Vycm9yLnJlcG9QYXRofScuYCxcbiAgICAgICAgICAnJyxcbiAgICAgICAgICBgRXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gLFxuICAgICAgICAgICcnLFxuICAgICAgICAgICdDb21taXQgYXR0cmlidXRpb24gY291bGQgbm90IGJlIHZlcmlmaWVkLiBUbyBpbnZlc3RpZ2F0ZTonLFxuICAgICAgICAgIGAxLiBWZXJpZnkgdGhlIGNhcmQgcmVwb3NpdG9yeSBpcyBhIHZhbGlkIGdpdCByZXBvIGF0OiAke2Vycm9yLnJlcG9QYXRofWAsXG4gICAgICAgICAgJzIuIENoZWNrIHRoYXQgZ2l0IGlzIGF2YWlsYWJsZSBhbmQgdGhlIHJlcG9zaXRvcnkgaXMgbm90IGNvcnJ1cHRlZCcsXG4gICAgICAgICAgYDMuIENvbmZpcm0gdGhlIGJhc2VsaW5lIFNIQSAoJHtlcnJvci5zaW5jZVNoYX0pIGV4aXN0cyBpbiB0aGUgcmVwb3NpdG9yeWBcbiAgICAgICAgXS5qb2luKCdcXG4nKSxcbiAgICAgICAgcmVhc29uOiBgQ29tbWl0IGxvZyBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICBpZiAoYWxsQ29tbWl0cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gY2xlYW51cEFuZEFwcHJvdmUobG9nZ2VyLCBzZXNzaW9uSWQsICdTdG9wIGFwcHJvdmVkIFx1MjAxNCBubyBjb21taXRzIHNpbmNlIHNlc3Npb24gc3RhcnQuJyk7XG4gIH1cblxuICAvLyBHZXQgc2Vzc2lvbidzIGF0dHJpYnV0ZWQgY29tbWl0c1xuICBsZXQgc2Vzc2lvbkNvbW1pdHM6IHN0cmluZ1tdO1xuICB0cnkge1xuICAgIHNlc3Npb25Db21taXRzID0gZ2V0U2Vzc2lvbkNvbW1pdHMoc2Vzc2lvbklkKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHJlYWQgc2Vzc2lvbiBjb21taXRzJywgeyBlcnJvcjogbWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgICBkZWNpc2lvbjogJ2FwcHJvdmUnLFxuICAgICAgc3lzdGVtTWVzc2FnZTogW1xuICAgICAgICBgQ291bGQgbm90IHJlYWQgc2Vzc2lvbiBjb21taXQgcmVjb3JkcyBmb3Igc2Vzc2lvbiAke3Nlc3Npb25JZH0uYCxcbiAgICAgICAgJycsXG4gICAgICAgIGBFcnJvcjogJHttZXNzYWdlfWAsXG4gICAgICAgICcnLFxuICAgICAgICAnQ29tbWl0IGF0dHJpYnV0aW9uIGNvdWxkIG5vdCBiZSB2ZXJpZmllZC4gVG8gaW52ZXN0aWdhdGU6JyxcbiAgICAgICAgJzEuIENoZWNrIHRoYXQgdGhlIHNlc3Npb24gQ1NWIGZpbGUgZXhpc3RzIGFuZCBpcyByZWFkYWJsZScsXG4gICAgICAgIGAyLiBWZXJpZnkgZmlsZSBwZXJtaXNzaW9ucyBmb3Igc2Vzc2lvbiAke3Nlc3Npb25JZH1gXG4gICAgICBdLmpvaW4oJ1xcbicpLFxuICAgICAgcmVhc29uOiBgU2Vzc2lvbiBDU1YgcmVhZCBmYWlsZWQ6ICR7bWVzc2FnZX1gXG4gICAgfSk7XG4gIH1cblxuICBjb25zdCB1bmF0dHJpYnV0ZWQgPSBnZXRVbmF0dHJpYnV0ZWRDb21taXRzKGFsbENvbW1pdHMsIHNlc3Npb25Db21taXRzKTtcblxuICBpZiAodW5hdHRyaWJ1dGVkLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBjbGVhbnVwQW5kQXBwcm92ZShcbiAgICAgIGxvZ2dlcixcbiAgICAgIHNlc3Npb25JZCxcbiAgICAgIGBTdG9wIGFwcHJvdmVkIFx1MjAxNCBhbGwgJHthbGxDb21taXRzLmxlbmd0aH0gY29tbWl0cyBhdHRyaWJ1dGVkIHRvIHRoaXMgc2Vzc2lvbi5gXG4gICAgKTtcbiAgfVxuXG4gIC8vIFVuYXR0cmlidXRlZCBjb21taXRzIGZvdW5kIFx1MjAxNCBnYXRoZXIgZGlmZiwgcmVjb3JkLCBjbGVhbnVwLCB0aGVuIGJsb2NrLlxuICAvLyBFcnJvcnMgaW4gdGhlc2Ugc2lkZS1lZmZlY3Qgb3BlcmF0aW9ucyBhcmUgY29sbGVjdGVkIGFzIHdhcm5pbmdzIGFuZFxuICAvLyBpbmNsdWRlZCBpbiB0aGUgb3V0cHV0IHdpdGhvdXQgY2hhbmdpbmcgdGhlIGJsb2NrIGRlY2lzaW9uLlxuICBjb25zdCB3YXJuaW5nczogc3RyaW5nW10gPSBbXTtcblxuICBsZXQgZGlmZkNvbnRlbnQ6IHN0cmluZztcbiAgdHJ5IHtcbiAgICBkaWZmQ29udGVudCA9IGdldERpZmZGb3JDb21taXRzKGFjdGlvbklucHV0LmNhcmRSZXBvUGF0aCwgdW5hdHRyaWJ1dGVkKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBDb21taXREaWZmRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGdlbmVyYXRlIGRpZmYnLCB7IHJlcG9QYXRoOiBlcnJvci5yZXBvUGF0aCwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICBkaWZmQ29udGVudCA9IFtcbiAgICAgICAgYChDb3VsZCBub3QgZ2VuZXJhdGUgZGlmZiBmb3IgJHtlcnJvci5zaGFzLmxlbmd0aH0gY29tbWl0KHMpKWAsXG4gICAgICAgICcnLFxuICAgICAgICBgRXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gLFxuICAgICAgICAnJyxcbiAgICAgICAgJ1RvIHZpZXcgdGhlIGRpZmYgbWFudWFsbHk6JyxcbiAgICAgICAgYCAgZ2l0IC1DICR7ZXJyb3IucmVwb1BhdGh9IGRpZmYgJHtlcnJvci5zaGFzW2Vycm9yLnNoYXMubGVuZ3RoIC0gMV19fjEuLkhFQURgXG4gICAgICBdLmpvaW4oJ1xcbicpO1xuICAgICAgd2FybmluZ3MucHVzaChgRGlmZiBnZW5lcmF0aW9uIGZhaWxlZDogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IHJlY29yZFVuYXR0cmlidXRlZENvbW1pdHMoc2Vzc2lvbklkLCB1bmF0dHJpYnV0ZWQpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIENvbW1pdFJlY29yZEVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byByZWNvcmQgdW5hdHRyaWJ1dGVkIGNvbW1pdCcsIHtcbiAgICAgICAgc2Vzc2lvbklkOiBlcnJvci5zZXNzaW9uSWQsXG4gICAgICAgIHNoYTogZXJyb3Iuc2hhLFxuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxuICAgICAgfSk7XG4gICAgICB3YXJuaW5ncy5wdXNoKFxuICAgICAgICBgQ29tbWl0IHJlY29yZGluZyBmYWlsZWQgZm9yICR7ZXJyb3Iuc2hhfTogJHtlcnJvci5tZXNzYWdlfS4gYCArXG4gICAgICAgICAgJ1RoZSBuZXh0IHN0b3AgbWF5IHJlLWZsYWcgdGhlc2UgY29tbWl0cyBhcyB1bmF0dHJpYnV0ZWQuICcgK1xuICAgICAgICAgICdWZXJpZnkgdGhlIHNlc3Npb24gQ1NWIGlzIHdyaXRhYmxlLidcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIHRyeSB7XG4gICAgYXdhaXQgY2xlYW51cFNlc3Npb24obG9nZ2VyLCBzZXNzaW9uSWQpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFNlc3Npb25DbGVhbnVwRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignU2Vzc2lvbiBjbGVhbnVwIGZhaWxlZCcsIHsgc2Vzc2lvbklkOiBlcnJvci5zZXNzaW9uSWQsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgICAgd2FybmluZ3MucHVzaChcbiAgICAgICAgYFNlc3Npb24gY2xlYW51cCBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX0uIGAgK1xuICAgICAgICAgICdTdGFsZSBQSUQgZW50cmllcyBvciBDU1YgZmlsZXMgbWF5IHJlbWFpbi4gJyArXG4gICAgICAgICAgYENoZWNrIHRoZSBzZXNzaW9uIHJlZ2lzdHJ5IGFuZCByZW1vdmUgYXJ0aWZhY3RzIGZvciBzZXNzaW9uICR7c2Vzc2lvbklkfSBtYW51YWxseS5gXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBjb25zdCBjb21taXRTdW1tYXJ5ID0gYCR7dW5hdHRyaWJ1dGVkLmxlbmd0aH0gdW5hdHRyaWJ1dGVkIGNvbW1pdCR7dW5hdHRyaWJ1dGVkLmxlbmd0aCA+IDEgPyAncycgOiAnJ31gO1xuICBjb25zdCB3YXJuaW5nQmxvY2sgPSB3YXJuaW5ncy5sZW5ndGggPiAwID8gYFxcblxcbldhcm5pbmdzOlxcbiR7d2FybmluZ3MubWFwKCh3KSA9PiBgLSAke3d9YCkuam9pbignXFxuJyl9YCA6ICcnO1xuXG4gIHJldHVybiBzdG9wT3V0cHV0KHtcbiAgICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAgICByZWFzb246IGBFeHRlcm5hbCBjaGFuZ2VzIGRldGVjdGVkIGluIGNhcmQgcmVwbyAoJHtjb21taXRTdW1tYXJ5fSk6XFxuXFxuJHtkaWZmQ29udGVudH0ke3dhcm5pbmdCbG9ja31gXG4gIH0pO1xufSk7XG4iLCAiLyoqXG4gKiBUcmFja3MgYXNzb2NpYXRpb25zIGJldHdlZW4gQ2xhdWRlIHByb2Nlc3MgSURzIGFuZCBjYXJkcyBvbiBkaXNrLCBidWZmZXJpbmdcbiAqIHBlbmRpbmcgY29tbWl0IFNIQXMgdW50aWwgYW4gYXNzb2NpYXRpb24gaXMgZXN0YWJsaXNoZWQuIFRoZSByZWdpc3RyeSB1c2VzXG4gKiBhdG9taWMgZmlsZSB3cml0ZXMsIGFkdmlzb3J5IGZpbGUgbG9ja2luZywgYW5kIGF1dG9tYXRpYyBzdGFsZS1lbnRyeSBwcnVuaW5nXG4gKiB0byByZW1haW4gY29ycmVjdCB1bmRlciBjb25jdXJyZW50IGFjY2Vzcy5cbiAqXG4gKiBAc3VtbWFyeSBQSUQtdG8tY2FyZCBzZXNzaW9uIHJlZ2lzdHJ5IHdpdGggY29tbWl0IGJ1ZmZlcmluZ1xuICogQG1vZHVsZSBjbGF1ZGUtY29kZS1zZXNzaW9uc1xuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlIH0gZnJvbSAnbm9kZTpmcy9wcm9taXNlcyc7XG5pbXBvcnQgeyBob21lZGlyIH0gZnJvbSAnbm9kZTpvcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IGV4ZWN1dGVUcmFuc2FjdGlvbiwgaGFzRXJybm9Db2RlLCBpc1Byb2Nlc3NBbGl2ZSwgcHJ1bmVTdGFsZUVudHJpZXMgfSBmcm9tICcuL2ludGVybmFsLmpzJztcblxuZXhwb3J0IHsgZmluZEFsbENsYXVkZVBpZHMsIGZpbmRDbGF1ZGVQaWQsIFBST0NFU1NfVFJFRV9NQVhfREVQVEggfSBmcm9tICcuL3Byb2Nlc3MtdHJlZS5qcyc7XG5cbmZ1bmN0aW9uIGdldENhcmRzRGlyKCk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGhvbWVkaXIoKSwgJy5jYXJkcycpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGNhbm9uaWNhbCBvbi1kaXNrIGxvY2F0aW9uIGZvciB0aGUgc2Vzc2lvbiByZWdpc3RyeSBKU09OIGZpbGUuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byBgfi8uY2FyZHMvY2xhdWRlLXNlc3Npb25zLmpzb25gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVnaXN0cnlQYXRoKCk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGdldENhcmRzRGlyKCksICdjbGF1ZGUtc2Vzc2lvbnMuanNvbicpO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGNhbm9uaWNhbCBvbi1kaXNrIGxvY2F0aW9uIGZvciB0aGUgc2Vzc2lvbiBsb2NrIGZpbGUuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byBgfi8uY2FyZHMvY2xhdWRlLXNlc3Npb25zLmxvY2tgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9ja1BhdGgoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oZ2V0Q2FyZHNEaXIoKSwgJ2NsYXVkZS1zZXNzaW9ucy5sb2NrJyk7XG59XG5cbmV4cG9ydCBjb25zdCBMT0NLX1RJTUVPVVRfTVMgPSAyMDAwO1xuZXhwb3J0IGNvbnN0IE1BWF9FTlRSWV9BR0VfTVMgPSAyNCAqIDYwICogNjAgKiAxMDAwOyAvLyAyNCBob3Vyc1xuXG4vKiogU2Vzc2lvbiBkYXRhIHN0b3JlZCBwZXIgUElEIGluIHRoZSByZWdpc3RyeSBmaWxlLiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGF1ZGVTZXNzaW9uRW50cnkge1xuICBjYXJkSWQ/OiBzdHJpbmc7XG4gIHBlbmRpbmdDb21taXRzOiBzdHJpbmdbXTtcbiAgdXBkYXRlZEF0OiBzdHJpbmc7XG59XG5cbi8qKiBKU09OIHBheWxvYWQgc3RvcmVkIGF0IGB+Ly5jYXJkcy9jbGF1ZGUtc2Vzc2lvbnMuanNvbmAuICovXG5leHBvcnQgaW50ZXJmYWNlIENsYXVkZVNlc3Npb25SZWdpc3RyeSB7XG4gIHNlc3Npb25zOiBSZWNvcmQ8c3RyaW5nLCBDbGF1ZGVTZXNzaW9uRW50cnk+O1xufVxuXG4vKiogRXh0ZW5kZWQgc2Vzc2lvbiBlbnRyeSB0aGF0IGluY2x1ZGVzIHNlc3Npb24gSUQuICovXG5leHBvcnQgaW50ZXJmYWNlIFBpZFNlc3Npb25FbnRyeSB7XG4gIHNlc3Npb25JZDogc3RyaW5nO1xuICB1cGRhdGVkQXQ6IHN0cmluZztcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQdWJsaWMgQVBJXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiBBc3NvY2lhdGVzIFBJRCB3aXRoIGNhcmQuIElmIHRoZSBlbnRyeSBhbHJlYWR5IGhhcyBhIGBjYXJkSWRgLCByZXR1cm5zIGBbXWBcbiAqIChmaXJzdC13cml0ZS13aW5zKS4gT3RoZXJ3aXNlIHNldHMgYGNhcmRJZGAsIGV4dHJhY3RzIGFuZCBjbGVhcnNcbiAqIGBwZW5kaW5nQ29tbWl0c2AsIGFuZCByZXR1cm5zIHRoZSBleHRyYWN0ZWQgY29tbWl0cy5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gYXNzb2NpYXRlLlxuICogQHBhcmFtIGNhcmRJZCAtIENhcmQgaWRlbnRpZmllciB0byBiaW5kIHRvIHRoZSBQSUQuXG4gKiBAcmV0dXJucyBQZW5kaW5nIFNIQXMgY2FwdHVyZWQgYmVmb3JlIGFzc29jaWF0aW9uLCBvciBgW11gIG9uIGZpcnN0LXdyaXRlIGNvbmZsaWN0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXNzb2NpYXRlUGlkV2l0aENhcmQocGlkOiBudW1iZXIsIGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICByZXR1cm4gZXhlY3V0ZVRyYW5zYWN0aW9uPENsYXVkZVNlc3Npb25SZWdpc3RyeSwgc3RyaW5nW10+KFxuICAgIGdldFJlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldExvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICBjb25zdCBwaWRTdHIgPSBTdHJpbmcocGlkKTtcbiAgICAgIGNvbnN0IGVudHJ5ID0gcmVnaXN0cnkuc2Vzc2lvbnNbcGlkU3RyXTtcblxuICAgICAgaWYgKGVudHJ5Py5jYXJkSWQpIHJldHVybiBbXTtcblxuICAgICAgY29uc3QgcGVuZGluZ0NvbW1pdHMgPSBlbnRyeT8ucGVuZGluZ0NvbW1pdHMgPz8gW107XG5cbiAgICAgIHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl0gPSB7XG4gICAgICAgIGNhcmRJZCxcbiAgICAgICAgcGVuZGluZ0NvbW1pdHM6IFtdLFxuICAgICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgfTtcblxuICAgICAgcmV0dXJuIHBlbmRpbmdDb21taXRzO1xuICAgIH0sXG4gICAgKHJlZ2lzdHJ5KSA9PiBwcnVuZVN0YWxlRW50cmllcyhyZWdpc3RyeS5zZXNzaW9ucywgaXNQcm9jZXNzQWxpdmUsIE1BWF9FTlRSWV9BR0VfTVMpLFxuICAgIHsgc2Vzc2lvbnM6IHt9IH0gYXMgQ2xhdWRlU2Vzc2lvblJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vKipcbiAqIEFwcGVuZHMgU0hBIHRvIGBwZW5kaW5nQ29tbWl0c2AgZm9yIFBJRCAoZGVkdXBsaWNhdGluZykuIENyZWF0ZXMgdGhlIGVudHJ5XG4gKiBpZiBpdCBkb2VzIG5vdCBleGlzdC5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdGhhdCBwcm9kdWNlZCB0aGUgY29tbWl0LlxuICogQHBhcmFtIHNoYSAtIENvbW1pdCBTSEEgdG8gcmVjb3JkIGZvciBsYXRlciBhdHRyaWJ1dGlvbi5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlY29yZFBlbmRpbmdDb21taXQocGlkOiBudW1iZXIsIHNoYTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGV4ZWN1dGVUcmFuc2FjdGlvbjxDbGF1ZGVTZXNzaW9uUmVnaXN0cnksIHZvaWQ+KFxuICAgIGdldFJlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldExvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICBjb25zdCBwaWRTdHIgPSBTdHJpbmcocGlkKTtcbiAgICAgIGNvbnN0IGVudHJ5ID0gcmVnaXN0cnkuc2Vzc2lvbnNbcGlkU3RyXSA/PyB7XG4gICAgICAgIHBlbmRpbmdDb21taXRzOiBbXSxcbiAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgIH07XG5cbiAgICAgIGlmICghZW50cnkucGVuZGluZ0NvbW1pdHMuaW5jbHVkZXMoc2hhKSkge1xuICAgICAgICBlbnRyeS5wZW5kaW5nQ29tbWl0cy5wdXNoKHNoYSk7XG4gICAgICB9XG5cbiAgICAgIGVudHJ5LnVwZGF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgIHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl0gPSBlbnRyeTtcbiAgICB9LFxuICAgIChyZWdpc3RyeSkgPT4gcHJ1bmVTdGFsZUVudHJpZXMocmVnaXN0cnkuc2Vzc2lvbnMsIGlzUHJvY2Vzc0FsaXZlLCBNQVhfRU5UUllfQUdFX01TKSxcbiAgICB7IHNlc3Npb25zOiB7fSB9IGFzIENsYXVkZVNlc3Npb25SZWdpc3RyeSxcbiAgICBMT0NLX1RJTUVPVVRfTVNcbiAgKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGBjYXJkSWRgIGZvciBQSUQgaWYgaXQgZXhpc3RzLCBudWxsIG90aGVyd2lzZS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gcmVzb2x2ZS5cbiAqIEByZXR1cm5zIEFzc29jaWF0ZWQgY2FyZCBJRCwgb3IgYG51bGxgIHdoZW4gdW5rbm93bi5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFBpZENhcmRJZChwaWQ6IG51bWJlcik6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICByZXR1cm4gZXhlY3V0ZVRyYW5zYWN0aW9uPENsYXVkZVNlc3Npb25SZWdpc3RyeSwgc3RyaW5nIHwgbnVsbD4oXG4gICAgZ2V0UmVnaXN0cnlQYXRoKCksXG4gICAgZ2V0TG9ja1BhdGgoKSxcbiAgICAocmVnaXN0cnkpID0+IHtcbiAgICAgIGNvbnN0IHBpZFN0ciA9IFN0cmluZyhwaWQpO1xuICAgICAgcmV0dXJuIHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl0/LmNhcmRJZCA/PyBudWxsO1xuICAgIH0sXG4gICAgKHJlZ2lzdHJ5KSA9PiBwcnVuZVN0YWxlRW50cmllcyhyZWdpc3RyeS5zZXNzaW9ucywgaXNQcm9jZXNzQWxpdmUsIE1BWF9FTlRSWV9BR0VfTVMpLFxuICAgIHsgc2Vzc2lvbnM6IHt9IH0gYXMgQ2xhdWRlU2Vzc2lvblJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vKipcbiAqIFJlbW92ZXMgYW5kIHJldHVybnMgdGhlIFBJRCdzIGVudHJ5LiBSZXR1cm5zIG51bGwgaWYgbm90IGZvdW5kLlxuICpcbiAqIEBwYXJhbSBwaWQgLSBDbGF1ZGUgcHJvY2VzcyBJRCB0byByZW1vdmUuXG4gKiBAcmV0dXJucyBSZW1vdmVkIHJlZ2lzdHJ5IGVudHJ5LCBvciBgbnVsbGAgd2hlbiBubyBlbnRyeSBleGlzdGVkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlUGlkRW50cnkocGlkOiBudW1iZXIpOiBQcm9taXNlPENsYXVkZVNlc3Npb25FbnRyeSB8IG51bGw+IHtcbiAgcmV0dXJuIGV4ZWN1dGVUcmFuc2FjdGlvbjxDbGF1ZGVTZXNzaW9uUmVnaXN0cnksIENsYXVkZVNlc3Npb25FbnRyeSB8IG51bGw+KFxuICAgIGdldFJlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldExvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICBjb25zdCBwaWRTdHIgPSBTdHJpbmcocGlkKTtcbiAgICAgIGNvbnN0IGVudHJ5ID0gcmVnaXN0cnkuc2Vzc2lvbnNbcGlkU3RyXTtcblxuICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgIGRlbGV0ZSByZWdpc3RyeS5zZXNzaW9uc1twaWRTdHJdO1xuICAgICAgICByZXR1cm4gZW50cnk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgKHJlZ2lzdHJ5KSA9PiBwcnVuZVN0YWxlRW50cmllcyhyZWdpc3RyeS5zZXNzaW9ucywgaXNQcm9jZXNzQWxpdmUsIE1BWF9FTlRSWV9BR0VfTVMpLFxuICAgIHsgc2Vzc2lvbnM6IHt9IH0gYXMgQ2xhdWRlU2Vzc2lvblJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENhcmQtcmVwbyBQSUQgcmVnaXN0cnkgKHBpZHMuanNvbilcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogSlNPTiBwYXlsb2FkIHN0b3JlZCBhdCBgfi8uY2FyZHMvY2FyZC1yZXBvLWNvbW1pdHMvcGlkcy5qc29uYC4gKi9cbmludGVyZmFjZSBDYXJkUmVwb1BpZFJlZ2lzdHJ5IHtcbiAgc2Vzc2lvbnM6IFJlY29yZDxzdHJpbmcsIFBpZFNlc3Npb25FbnRyeT47XG59XG5cbmZ1bmN0aW9uIGdldENhcmRSZXBvUGlkc1JlZ2lzdHJ5UGF0aCgpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihnZXRDYXJkc0RpcigpLCAnY2FyZC1yZXBvLWNvbW1pdHMnLCAncGlkcy5qc29uJyk7XG59XG5cbmZ1bmN0aW9uIGdldENhcmRSZXBvUGlkc0xvY2tQYXRoKCk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGdldENhcmRzRGlyKCksICdjYXJkLXJlcG8tY29tbWl0cycsICdwaWRzLmxvY2snKTtcbn1cblxuLyoqXG4gKiBSZWdpc3RlcnMgYSBzZXNzaW9uIGZvciBhIENsYXVkZSBwcm9jZXNzIElEIGluIHRoZSBjYXJkLXJlcG8gUElEIHJlZ2lzdHJ5LlxuICpcbiAqIEBwYXJhbSBwaWQgLSBDbGF1ZGUgcHJvY2VzcyBJRCB0byByZWdpc3Rlci5cbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIGlkZW50aWZpZXIgdG8gYXNzb2NpYXRlIHdpdGggdGhlIFBJRC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyU2Vzc2lvbihwaWQ6IG51bWJlciwgc2Vzc2lvbklkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgZXhlY3V0ZVRyYW5zYWN0aW9uPENhcmRSZXBvUGlkUmVnaXN0cnksIHZvaWQ+KFxuICAgIGdldENhcmRSZXBvUGlkc1JlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldENhcmRSZXBvUGlkc0xvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICByZWdpc3RyeS5zZXNzaW9uc1tTdHJpbmcocGlkKV0gPSB7XG4gICAgICAgIHNlc3Npb25JZCxcbiAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgIH07XG4gICAgfSxcbiAgICB1bmRlZmluZWQsXG4gICAgeyBzZXNzaW9uczoge30gfSBhcyBDYXJkUmVwb1BpZFJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vKipcbiAqIFJlbW92ZXMgYSBQSUQgZW50cnkgZnJvbSB0aGUgY2FyZC1yZXBvIFBJRCByZWdpc3RyeS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gcmVtb3ZlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlU2Vzc2lvblBpZChwaWQ6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBleGVjdXRlVHJhbnNhY3Rpb248Q2FyZFJlcG9QaWRSZWdpc3RyeSwgdm9pZD4oXG4gICAgZ2V0Q2FyZFJlcG9QaWRzUmVnaXN0cnlQYXRoKCksXG4gICAgZ2V0Q2FyZFJlcG9QaWRzTG9ja1BhdGgoKSxcbiAgICAocmVnaXN0cnkpID0+IHtcbiAgICAgIGRlbGV0ZSByZWdpc3RyeS5zZXNzaW9uc1tTdHJpbmcocGlkKV07XG4gICAgfSxcbiAgICB1bmRlZmluZWQsXG4gICAgeyBzZXNzaW9uczoge30gfSBhcyBDYXJkUmVwb1BpZFJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHNlc3Npb24gSUQgZm9yIGEgQ2xhdWRlIHByb2Nlc3MgSUQuXG4gKlxuICogQHBhcmFtIHBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRvIGxvb2sgdXAuXG4gKiBAcmV0dXJucyBTZXNzaW9uIElELCBvciBgbnVsbGAgd2hlbiB0aGUgZW50cnkgaXMgYWJzZW50LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0U2Vzc2lvbklkRm9yUGlkKHBpZDogbnVtYmVyKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gIGNvbnN0IHJlZ2lzdHJ5UGF0aCA9IGdldENhcmRSZXBvUGlkc1JlZ2lzdHJ5UGF0aCgpO1xuICB0cnkge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZWFkRmlsZShyZWdpc3RyeVBhdGgsICd1dGYtOCcpO1xuICAgIGNvbnN0IHJlZ2lzdHJ5ID0gSlNPTi5wYXJzZShjb250ZW50KSBhcyBDYXJkUmVwb1BpZFJlZ2lzdHJ5O1xuICAgIHJldHVybiByZWdpc3RyeS5zZXNzaW9uc1tTdHJpbmcocGlkKV0/LnNlc3Npb25JZCA/PyBudWxsO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgcmV0dXJuIG51bGw7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cbiIsICIvKipcbiAqIEdlbmVyaWMgc2hhcmVkIGhlbHBlcnMgZm9yIHJlZ2lzdHJ5IGZpbGUgb3BlcmF0aW9ucy5cbiAqXG4gKiBFeHRyYWN0ZWQgZnJvbSBpbmRleC50cyBzbyB0aGF0IG11bHRpcGxlIHJlZ2lzdHJ5IG1vZHVsZXMgY2FuIHJldXNlIHRoZVxuICogc2FtZSBsb2NraW5nLCByZWFkL3dyaXRlLCBhbmQgcHJ1bmluZyBwcmltaXRpdmVzIHdpdGhvdXQgZHVwbGljYXRpb24uXG4gKlxuICogQWxsIGhlbHBlcnMgZm9sbG93IGZhaWwtY2xvc2VkIHNlbWFudGljczogdW5leHBlY3RlZCBlcnJvcnMgcHJvcGFnYXRlXG4gKiByYXRoZXIgdGhhbiBiZWluZyBzaWxlbnRseSBzd2FsbG93ZWQuXG4gKlxuICogQHN1bW1hcnkgR2VuZXJpYyBsb2NraW5nLCByZWFkL3dyaXRlLCBhbmQgcHJ1bmluZyBoZWxwZXJzXG4gKiBAbW9kdWxlIGludGVybmFsXG4gKi9cblxuaW1wb3J0IHsgY2xvc2VTeW5jLCBta2RpclN5bmMsIG9wZW5TeW5jLCByZWFkRmlsZVN5bmMsIHJlbmFtZVN5bmMsIHVubGlua1N5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgaXNQcm9jZXNzQWxpdmUgfSBmcm9tICcuL2lwYy5qcyc7XG5cbmV4cG9ydCB7IGlzUHJvY2Vzc0FsaXZlIH0gZnJvbSAnLi9pcGMuanMnO1xuXG4vKipcbiAqIFJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgYWZ0ZXIgYG1zYCBtaWxsaXNlY29uZHMuXG4gKlxuICogQHBhcmFtIG1zIC0gRHVyYXRpb24gdG8gc2xlZXAgaW4gbWlsbGlzZWNvbmRzLlxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgYWZ0ZXIgdGhlIHNwZWNpZmllZCBkZWxheS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNsZWVwKG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYW4gdW5rbm93biB0aHJvd24gdmFsdWUgaXMgYSBOb2RlLmpzIHN5c3RlbSBlcnJvciB3aXRoIHRoZVxuICogc3BlY2lmaWVkIGBjb2RlYCBwcm9wZXJ0eSAoZS5nLiBgJ0VOT0VOVCdgLCBgJ0VFWElTVCdgKS5cbiAqXG4gKiBAcGFyYW0gZXJyb3IgLSBWYWx1ZSBjYXVnaHQgaW4gYSBgY2F0Y2hgIGJsb2NrLlxuICogQHBhcmFtIGNvZGUgLSBFeHBlY3RlZCBgRXJybm9FeGNlcHRpb24uY29kZWAgc3RyaW5nLlxuICogQHJldHVybnMgYHRydWVgIHdoZW4gdGhlIGVycm9yIG1hdGNoZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNFcnJub0NvZGUoZXJyb3I6IHVua25vd24sIGNvZGU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiAnY29kZScgaW4gZXJyb3IgJiYgKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gY29kZTtcbn1cblxuLyoqXG4gKiBBdHRlbXB0cyB0byByZW1vdmUgYSBzdGFsZSBsb2NrIGZpbGUgbGVmdCBieSBhIGRlYWQgcHJvY2Vzcy5cbiAqXG4gKiBSZWFkcyB0aGUgUElEIGZyb20gdGhlIGxvY2sgZmlsZSwgY2hlY2tzIGxpdmVuZXNzLCBhbmQgdW5saW5rcyB3aGVuIHRoZVxuICogaG9sZGVyIGlzIG5vIGxvbmdlciBydW5uaW5nLiBBIHNlY29uZCByZWFkIGd1YXJkcyBhZ2FpbnN0IFRPQ1RPVSByYWNlcy5cbiAqXG4gKiBAcGFyYW0gbG9ja1BhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBsb2NrIGZpbGUuXG4gKiBAcmV0dXJucyBgdHJ1ZWAgd2hlbiB0aGUgc3RhbGUgbG9jayB3YXMgc3VjY2Vzc2Z1bGx5IHJlbW92ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cnlSZW1vdmVTdGFsZUxvY2sobG9ja1BhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIGNvbnN0IGxvY2tDb250ZW50ID0gcmVhZEZpbGVTeW5jKGxvY2tQYXRoLCAndXRmLTgnKTtcbiAgICBjb25zdCBob2xkZXJQaWQgPSBOdW1iZXIucGFyc2VJbnQobG9ja0NvbnRlbnQudHJpbSgpLCAxMCk7XG5cbiAgICBpZiAoIU51bWJlci5pc05hTihob2xkZXJQaWQpICYmICFpc1Byb2Nlc3NBbGl2ZShob2xkZXJQaWQpKSB7XG4gICAgICAvLyBSZS1yZWFkIGxvY2sgZmlsZSB0byByZWR1Y2UgVE9DVE9VIHJhY2Ugd2luZG93IGJlZm9yZSB1bmxpbmtpbmcuXG4gICAgICBpZiAocmVhZEZpbGVTeW5jKGxvY2tQYXRoLCAndXRmLTgnKSA9PT0gbG9ja0NvbnRlbnQpIHtcbiAgICAgICAgdW5saW5rU3luYyhsb2NrUGF0aCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgdHJ5IHtcbiAgICAgIHVubGlua1N5bmMobG9ja1BhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBFTk9FTlQ6IGxvY2sgYWxyZWFkeSByZW1vdmVkOyBvdGhlciBlcnJvcnM6IGJlc3QtZWZmb3J0IGNsZWFudXBcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGxvY2sgZmlsZSBleGNsdXNpdmVseSBhbmQgd3JpdGVzIHRoZSBjdXJyZW50IFBJRCBpbnRvIGl0LlxuICpcbiAqIFVzZXMgYE9fV1JPTkxZIHwgT19DUkVBVCB8IE9fRVhDTGAgKGAnd3gnYCkgc28gdGhlIGNhbGwgZmFpbHMgd2l0aFxuICogYEVFWElTVGAgd2hlbiBhbm90aGVyIHByb2Nlc3MgYWxyZWFkeSBob2xkcyB0aGUgbG9jay5cbiAqXG4gKiBAcGFyYW0gbG9ja1BhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBsb2NrIGZpbGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUxvY2tIb2xkZXJQaWQobG9ja1BhdGg6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBmZCA9IG9wZW5TeW5jKGxvY2tQYXRoLCAnd3gnLCAwbzYwMCk7XG4gIHRyeSB7XG4gICAgd3JpdGVGaWxlU3luYyhmZCwgU3RyaW5nKHByb2Nlc3MucGlkKSk7XG4gIH0gZmluYWxseSB7XG4gICAgY2xvc2VTeW5jKGZkKTtcbiAgfVxufVxuXG4vKipcbiAqIEFjcXVpcmVzIGFuIGFkdmlzb3J5IGZpbGUgbG9jaywgcmV0cnlpbmcgdW50aWwgc3VjY2VzcyBvciB0aW1lb3V0LlxuICpcbiAqICoqRmFpbC1jbG9zZWQqKjogdGhyb3dzIG9uIHRpbWVvdXQgaW5zdGVhZCBvZiByZXR1cm5pbmcgYSBib29sZWFuLlxuICpcbiAqIEBwYXJhbSBsb2NrUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGxvY2sgZmlsZS5cbiAqIEBwYXJhbSB0aW1lb3V0TXMgLSBNYXhpbXVtIHdhaXQgdGltZSBpbiBtaWxsaXNlY29uZHMuXG4gKiBAdGhyb3dzIHtFcnJvcn0gYCdMb2NrIGFjcXVpc2l0aW9uIHRpbWVvdXQnYCB3aGVuIHRoZSBsb2NrIGNhbm5vdCBiZVxuICogICBhY3F1aXJlZCB3aXRoaW4gYHRpbWVvdXRNc2AuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhY3F1aXJlTG9jayhsb2NrUGF0aDogc3RyaW5nLCB0aW1lb3V0TXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICBjb25zdCBkaXIgPSBkaXJuYW1lKGxvY2tQYXRoKTtcblxuICB3aGlsZSAoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSA8IHRpbWVvdXRNcykge1xuICAgIHRyeSB7XG4gICAgICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgbW9kZTogMG83MDAgfSk7XG4gICAgICB3cml0ZUxvY2tIb2xkZXJQaWQobG9ja1BhdGgpO1xuICAgICAgcmV0dXJuOyAvLyBzdWNjZXNzXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGlmICghaGFzRXJybm9Db2RlKGVycm9yLCAnRUVYSVNUJykpIHRocm93IGVycm9yO1xuICAgICAgaWYgKHRyeVJlbW92ZVN0YWxlTG9jayhsb2NrUGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCByZW1haW5pbmcgPSB0aW1lb3V0TXMgLSAoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSk7XG4gICAgICBpZiAocmVtYWluaW5nID4gMCkge1xuICAgICAgICBhd2FpdCBzbGVlcChNYXRoLm1pbig1MCwgcmVtYWluaW5nKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKCdMb2NrIGFjcXVpc2l0aW9uIHRpbWVvdXQnKTtcbn1cblxuLyoqXG4gKiBSZWxlYXNlcyBhbiBhZHZpc29yeSBmaWxlIGxvY2sgYnkgdW5saW5raW5nIHRoZSBsb2NrIGZpbGUuXG4gKlxuICogYEVOT0VOVGAgaXMgc2lsZW50bHkgaWdub3JlZCAodGhlIGxvY2sgd2FzIGFscmVhZHkgcmVsZWFzZWQpOyBhbGwgb3RoZXJcbiAqIGVycm9ycyBwcm9wYWdhdGUuXG4gKlxuICogQHBhcmFtIGxvY2tQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgbG9jayBmaWxlLlxuICogQHRocm93cyB7Tm9kZUpTLkVycm5vRXhjZXB0aW9ufSBXaGVuIHRoZSB1bmxpbmsgZmFpbHMgZm9yIHJlYXNvbnMgb3RoZXIgdGhhbiBgRU5PRU5UYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbGVhc2VMb2NrKGxvY2tQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICB1bmxpbmtTeW5jKGxvY2tQYXRoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoIWhhc0Vycm5vQ29kZShlcnJvciwgJ0VOT0VOVCcpKSB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgc3RhbGUgZW50cmllcyBmcm9tIGEgUElELWtleWVkIHJlZ2lzdHJ5IG9iamVjdC5cbiAqXG4gKiBBbiBlbnRyeSBpcyBjb25zaWRlcmVkIHN0YWxlIHdoZW46XG4gKiAxLiBJdHMga2V5IGlzIG5vdCBhIHZhbGlkIGludGVnZXIgUElELlxuICogMi4gSXRzIGB1cGRhdGVkQXRgIHRpbWVzdGFtcCBpcyBvbGRlciB0aGFuIGBtYXhBZ2VNc2AuXG4gKiAzLiBUaGUgcHJvY2VzcyBpZGVudGlmaWVkIGJ5IGl0cyBrZXkgaXMgbm8gbG9uZ2VyIGFsaXZlLlxuICpcbiAqIEBwYXJhbSByZWdpc3RyeSAtIE11dGFibGUgUElELWtleWVkIHJlY29yZCB0byBwcnVuZSBpbiBwbGFjZS5cbiAqIEBwYXJhbSBpc0FsaXZlIC0gTGl2ZW5lc3MgY2hlY2sgZnVuY3Rpb24gKHR5cGljYWxseSB7QGxpbmsgaXNQcm9jZXNzQWxpdmV9KS5cbiAqIEBwYXJhbSBtYXhBZ2VNcyAtIE1heGltdW0gZW50cnkgYWdlIGluIG1pbGxpc2Vjb25kcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBydW5lU3RhbGVFbnRyaWVzPFQgZXh0ZW5kcyB7IHVwZGF0ZWRBdDogc3RyaW5nIH0+KFxuICByZWdpc3RyeTogUmVjb3JkPHN0cmluZywgVD4sXG4gIGlzQWxpdmU6IChwaWQ6IG51bWJlcikgPT4gYm9vbGVhbixcbiAgbWF4QWdlTXM6IG51bWJlclxuKTogdm9pZCB7XG4gIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG5cbiAgZm9yIChjb25zdCBbcGlkU3RyLCBlbnRyeV0gb2YgT2JqZWN0LmVudHJpZXMocmVnaXN0cnkpKSB7XG4gICAgY29uc3QgcGlkID0gTnVtYmVyLnBhcnNlSW50KHBpZFN0ciwgMTApO1xuXG4gICAgaWYgKE51bWJlci5pc05hTihwaWQpKSB7XG4gICAgICBkZWxldGUgcmVnaXN0cnlbcGlkU3RyXTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB1cGRhdGVkQXQgPSBuZXcgRGF0ZShlbnRyeS51cGRhdGVkQXQpLmdldFRpbWUoKTtcbiAgICAgIGlmIChub3cgLSB1cGRhdGVkQXQgPiBtYXhBZ2VNcykge1xuICAgICAgICBkZWxldGUgcmVnaXN0cnlbcGlkU3RyXTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICBkZWxldGUgcmVnaXN0cnlbcGlkU3RyXTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBpZiAoIWlzQWxpdmUocGlkKSkge1xuICAgICAgICBkZWxldGUgcmVnaXN0cnlbcGlkU3RyXTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIGlzUHJvY2Vzc0FsaXZlIHRocm93cyBvbiB1bmV4cGVjdGVkIGVycm9ycyAtIGtlZXAgZW50cnlcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcGFyc2VzIGEgSlNPTiByZWdpc3RyeSBmaWxlLlxuICpcbiAqICoqRmFpbC1jbG9zZWQqKjogcmV0dXJucyBgZGVmYXVsdFZhbHVlYCBvbmx5IHdoZW4gdGhlIGZpbGUgZG9lcyBub3QgZXhpc3RcbiAqIChgRU5PRU5UYCkuIFBhcnNlIGVycm9ycyBhbmQgb3RoZXIgSS9PIGZhaWx1cmVzIHByb3BhZ2F0ZSBhcyBleGNlcHRpb25zLlxuICpcbiAqIEBwYXJhbSBwYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgcmVnaXN0cnkgSlNPTiBmaWxlLlxuICogQHBhcmFtIGRlZmF1bHRWYWx1ZSAtIFZhbHVlIHJldHVybmVkIHdoZW4gdGhlIGZpbGUgZG9lcyBub3QgZXhpc3QuXG4gKiBAcmV0dXJucyBQYXJzZWQgcmVnaXN0cnkgY29udGVudHMsIG9yIGBkZWZhdWx0VmFsdWVgIG9uIGBFTk9FTlRgLlxuICogQHRocm93cyB7U3ludGF4RXJyb3J9IFdoZW4gdGhlIGZpbGUgY29udGFpbnMgaW52YWxpZCBKU09OLlxuICogQHRocm93cyB7Tm9kZUpTLkVycm5vRXhjZXB0aW9ufSBPbiBJL08gZXJyb3JzIG90aGVyIHRoYW4gYEVOT0VOVGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkUmVnaXN0cnk8VD4ocGF0aDogc3RyaW5nLCBkZWZhdWx0VmFsdWU6IFQpOiBUIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKHBhdGgsICd1dGYtOCcpO1xuICAgIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpIGFzIFQ7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGhhc0Vycm5vQ29kZShlcnJvciwgJ0VOT0VOVCcpKSByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIHRocm93IGVycm9yOyAvLyBGQUlMLUNMT1NFRDogdGhyb3cgb24gcGFyc2UgZXJyb3JzXG4gIH1cbn1cblxuLyoqXG4gKiBBdG9taWNhbGx5IHdyaXRlcyBhIHJlZ2lzdHJ5IG9iamVjdCBhcyBwcmV0dHktcHJpbnRlZCBKU09OLlxuICpcbiAqIFdyaXRlcyB0byBhIHRlbXBvcmFyeSBgLnRtcGAgc2libGluZyBmaXJzdCwgdGhlbiByZW5hbWVzIGludG8gcGxhY2Ugc29cbiAqIHJlYWRlcnMgbmV2ZXIgb2JzZXJ2ZSBhIHBhcnRpYWxseS13cml0dGVuIGZpbGUuXG4gKlxuICogQHBhcmFtIHJlZ2lzdHJ5IC0gT2JqZWN0IHRvIHNlcmlhbGl6ZS5cbiAqIEBwYXJhbSByZWdpc3RyeVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSB0YXJnZXQgcmVnaXN0cnkgZmlsZS5cbiAqIEB0aHJvd3Mge05vZGVKUy5FcnJub0V4Y2VwdGlvbn0gT24gZmlsZXN5c3RlbSB3cml0ZSBvciByZW5hbWUgZmFpbHVyZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVJlZ2lzdHJ5TG9ja2VkPFQ+KHJlZ2lzdHJ5OiBULCByZWdpc3RyeVBhdGg6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBkaXIgPSBkaXJuYW1lKHJlZ2lzdHJ5UGF0aCk7XG4gIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlLCBtb2RlOiAwbzcwMCB9KTtcbiAgY29uc3QgdGVtcFBhdGggPSBgJHtyZWdpc3RyeVBhdGh9LnRtcGA7XG4gIHRyeSB7XG4gICAgd3JpdGVGaWxlU3luYyh0ZW1wUGF0aCwgSlNPTi5zdHJpbmdpZnkocmVnaXN0cnksIG51bGwsIDIpLCB7IG1vZGU6IDBvNjAwIH0pO1xuICAgIHJlbmFtZVN5bmModGVtcFBhdGgsIHJlZ2lzdHJ5UGF0aCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdHJ5IHtcbiAgICAgIHVubGlua1N5bmModGVtcFBhdGgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLyogY2xlYW51cCBiZXN0LWVmZm9ydCAqL1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgcmVhZC1tb2RpZnktd3JpdGUgdHJhbnNhY3Rpb24gdW5kZXIgYW4gYWR2aXNvcnkgZmlsZSBsb2NrLlxuICpcbiAqIDEuIEFjcXVpcmVzIGxvY2suXG4gKiAyLiBSZWFkcyByZWdpc3RyeSAob3IgdXNlcyBgZGVmYXVsdFJlZ2lzdHJ5YCBpZiBmaWxlIGFic2VudCkuXG4gKiAzLiBPcHRpb25hbGx5IHBydW5lcyBzdGFsZSBlbnRyaWVzLlxuICogNC4gQ2FsbHMgYG9wZXJhdGlvbmAgd2l0aCB0aGUgbXV0YWJsZSByZWdpc3RyeS5cbiAqIDUuIFdyaXRlcyB0aGUgcmVnaXN0cnkgYmFjay5cbiAqIDYuIFJlbGVhc2VzIGxvY2sgKGd1YXJhbnRlZWQgdmlhIGBmaW5hbGx5YCkuXG4gKlxuICogQHBhcmFtIHJlZ2lzdHJ5UGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIHJlZ2lzdHJ5IEpTT04gZmlsZS5cbiAqIEBwYXJhbSBsb2NrUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGxvY2sgZmlsZS5cbiAqIEBwYXJhbSBvcGVyYXRpb24gLSBDYWxsYmFjayB0aGF0IG11dGF0ZXMgdGhlIHJlZ2lzdHJ5IGFuZCByZXR1cm5zIGEgcmVzdWx0LlxuICogQHBhcmFtIHBydW5lciAtIE9wdGlvbmFsIGNhbGxiYWNrIHRvIHBydW5lIHN0YWxlIGVudHJpZXMgYmVmb3JlIHRoZSBvcGVyYXRpb24uXG4gKiBAcGFyYW0gZGVmYXVsdFJlZ2lzdHJ5IC0gRGVmYXVsdCB2YWx1ZSB3aGVuIHRoZSByZWdpc3RyeSBmaWxlIGRvZXMgbm90IGV4aXN0LlxuICogQHBhcmFtIGxvY2tUaW1lb3V0TXMgLSBMb2NrIGFjcXVpc2l0aW9uIHRpbWVvdXQgKGRlZmF1bHQgMjAwMCBtcykuXG4gKiBAcmV0dXJucyBUaGUgdmFsdWUgcmV0dXJuZWQgYnkgYG9wZXJhdGlvbmAuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlVHJhbnNhY3Rpb248VFJlZ2lzdHJ5LCBUUmVzdWx0PihcbiAgcmVnaXN0cnlQYXRoOiBzdHJpbmcsXG4gIGxvY2tQYXRoOiBzdHJpbmcsXG4gIG9wZXJhdGlvbjogKHJlZ2lzdHJ5OiBUUmVnaXN0cnkpID0+IFRSZXN1bHQsXG4gIHBydW5lcj86IChyZWdpc3RyeTogVFJlZ2lzdHJ5KSA9PiB2b2lkLFxuICBkZWZhdWx0UmVnaXN0cnk/OiBUUmVnaXN0cnksXG4gIGxvY2tUaW1lb3V0TXM/OiBudW1iZXJcbik6IFByb21pc2U8VFJlc3VsdD4ge1xuICBhd2FpdCBhY3F1aXJlTG9jayhsb2NrUGF0aCwgbG9ja1RpbWVvdXRNcyA/PyAyMDAwKTtcbiAgdHJ5IHtcbiAgICBjb25zdCByZWdpc3RyeSA9IHJlYWRSZWdpc3RyeTxUUmVnaXN0cnk+KHJlZ2lzdHJ5UGF0aCwgZGVmYXVsdFJlZ2lzdHJ5IGFzIFRSZWdpc3RyeSk7XG4gICAgaWYgKHBydW5lcikgcHJ1bmVyKHJlZ2lzdHJ5KTtcbiAgICBjb25zdCByZXN1bHQgPSBvcGVyYXRpb24ocmVnaXN0cnkpO1xuICAgIHdyaXRlUmVnaXN0cnlMb2NrZWQocmVnaXN0cnksIHJlZ2lzdHJ5UGF0aCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSBmaW5hbGx5IHtcbiAgICByZWxlYXNlTG9jayhsb2NrUGF0aCk7XG4gIH1cbn1cbiIsICIvKipcbiAqIFByb2Nlc3MtbGV2ZWwgaGVscGVycyBmb3IgY2hlY2tpbmcgcHJvY2VzcyBsaXZlbmVzcy5cbiAqXG4gKlxuICogQHN1bW1hcnkgUHJvY2Vzcy1sZXZlbCBoZWxwZXJzIGZvciBjaGVja2luZyBwcm9jZXNzIGxpdmVuZXNzXG4gKiBAbW9kdWxlIGlwY1xuICovXG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgcHJvY2VzcyBpcyBhbGl2ZSB1c2luZyBga2lsbChwaWQsIDApYC5cbiAqXG4gKiBTaWduYWwgMCBpcyBhIG5vLW9wIHByb2JlOiBubyBzaWduYWwgaXMgZGVsaXZlcmVkLCBidXQgdGhlIGtlcm5lbCBzdGlsbFxuICogdmFsaWRhdGVzIHRoYXQgdGhlIHRhcmdldCBQSUQgZXhpc3RzLiBgRVBFUk1gIGlzIHRyZWF0ZWQgYXMgXCJhbGl2ZVwiXG4gKiBiZWNhdXNlIHRoZSBwcm9jZXNzIGV4aXN0cyBidXQgaXMgb3duZWQgYnkgYW5vdGhlciB1c2VyLlxuICpcbiAqIEBwYXJhbSBwaWQgLSBQSUQgdG8gcHJvYmUuIENhbGxlcnMgdXN1YWxseSBwYXNzIGEgdmFsdWUgcHJldmlvdXNseSByZWNvcmRlZFxuICogICBpbiB0aGUgc2Vzc2lvbiByZWdpc3RyeS5cbiAqIEByZXR1cm5zIGB0cnVlYCB3aGVuIHRoZSBQSUQgc3RpbGwgZXhpc3RzLiBgRVBFUk1gIGlzIHRyZWF0ZWQgYXMgYWxpdmVcbiAqICAgYmVjYXVzZSBwZXJtaXNzaW9uIGZhaWx1cmVzIHN0aWxsIG1lYW4gdGhlIHByb2Nlc3MgaXMgcHJlc2VudC5cbiAqIEB0aHJvd3MgUmV0aHJvd3MgdW5leHBlY3RlZCBgcHJvY2Vzcy5raWxsYCBmYWlsdXJlcyBzbyBjYWxsZXJzIGNhbiBmYWlsIGNsb3NlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUHJvY2Vzc0FsaXZlKHBpZDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgcHJvY2Vzcy5raWxsKHBpZCwgMCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgJ2NvZGUnIGluIGVycm9yKSB7XG4gICAgICBjb25zdCBjb2RlID0gKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZTtcbiAgICAgIGlmIChjb2RlID09PSAnRVNSQ0gnKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VQRVJNJykgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG4iLCAiLyoqXG4gKiBQcm9jZXNzIHRyZWUgdXRpbGl0aWVzIGZvciBsb2NhdGluZyBDbGF1ZGUgQ29kZSBhbmNlc3RvciBwcm9jZXNzZXMuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFByb2Nlc3MgdHJlZSB1dGlsaXRpZXMgZm9yIGxvY2F0aW5nIENsYXVkZSBDb2RlIGFuY2VzdG9yIHByb2Nlc3Nlc1xuICogQG1vZHVsZSBsaWIvcHJvY2Vzcy10cmVlXG4gKi9cblxuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuXG4vKiogTWF4aW11bSBkZXB0aCB0byB3YWxrIHVwIHRoZSBwcm9jZXNzIHRyZWUuICovXG5leHBvcnQgY29uc3QgUFJPQ0VTU19UUkVFX01BWF9ERVBUSCA9IDEwO1xuXG4vKipcbiAqIFBhdHRlcm4gbWF0Y2hpbmcgYGNsYXVkZWAgYXMgYSBwYXRoIGNvbXBvbmVudCBpbiBgcHMgLW8gYXJncz1gIG91dHB1dC5cbiAqXG4gKiBNYXRjaGVzIGBjbGF1ZGVgIHdoZW4gcHJlY2VkZWQgYnkgc3RhcnQtb2Ytc3RyaW5nLCB3aGl0ZXNwYWNlLCBvciBgL2BcbiAqIChwYXRoIHNlcGFyYXRvcikgQU5EIGZvbGxvd2VkIGJ5IGAvYCwgd2hpdGVzcGFjZSwgb3IgZW5kLW9mLXN0cmluZy5cbiAqXG4gKiBUaGlzIGF2b2lkcyBmYWxzZSBwb3NpdGl2ZXMgb24gYC5jbGF1ZGUvYCBkaXJlY3RvcnkgcGF0aHMgaW4gYXJndW1lbnRzXG4gKiBsaWtlIGAvaG9tZS9ub2RlLy5jbGF1ZGUvc2hlbGwtc25hcHNob3RzLy4uLmAgYmVjYXVzZSB0aGUgYC5gIGJldHdlZW5cbiAqIHRoZSBgL2AgYW5kIGBjbGF1ZGVgIHByZXZlbnRzIHRoZSBsb29rYmVoaW5kIGZyb20gbWF0Y2hpbmcuXG4gKlxuICogVGhlIHRyYWlsaW5nIGAvYCBhbHRlcm5hdGl2ZSBoYW5kbGVzIHZlcnNpb25lZCBleGVjdXRhYmxlcyB3aGVyZSB0aGUgcGF0aFxuICogY29udGFpbnMgYC9jbGF1ZGUvdmVyc2lvbnMvWC5ZLlpgIFx1MjAxNCBgY2xhdWRlYCBpcyBhIGRpcmVjdG9yeSBjb21wb25lbnQsXG4gKiBub3QgdGhlIHRlcm1pbmFsIGNvbW1hbmQgbmFtZS5cbiAqL1xuY29uc3QgQ0xBVURFX0FSR1NfUEFUVEVSTiA9IC8oXnxcXHN8XFwvKWNsYXVkZShcXC98XFxzfCQpL2k7XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBnaXZlbiBQSUQgYmVsb25ncyB0byBhIENsYXVkZSBwcm9jZXNzLlxuICpcbiAqIFVzZXMgYHBzIC1wIFBJRCAtbyBhcmdzPWAgdG8gZ2V0IHRoZSBmdWxsIGNvbW1hbmQgbGluZSwgdGhlbiB0ZXN0c1xuICogd2hldGhlciBgY2xhdWRlYCBhcHBlYXJzIGFzIGEgcGF0aCBjb21wb25lbnQgb3IgY29tbWFuZCBuYW1lLlxuICogVGhpcyBtYXRjaGVzIGJvdGggdGhlIGBjbGF1ZGVgIGJpbmFyeSBhbmQgdmVyc2lvbmVkIGV4ZWN1dGFibGVzXG4gKiAoZS5nLiBgfi8ubG9jYWwvc2hhcmUvY2xhdWRlL3ZlcnNpb25zLzIuMS41MWApLlxuICpcbiAqIEBwYXJhbSBwaWQgLSBQcm9jZXNzIElEIHRvIGluc3BlY3QuXG4gKiBAcmV0dXJucyBgdHJ1ZWAgd2hlbiB0aGUgcHJvY2VzcyBhcmdzIG1hdGNoIENsYXVkZTsgb3RoZXJ3aXNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzQ2xhdWRlKHBpZDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgY29uc3QgYXJncyA9IGV4ZWNTeW5jKGBwcyAtcCAke3BpZH0gLW8gYXJncz1gLCB7IGVuY29kaW5nOiAndXRmOCcgfSkudHJpbSgpO1xuICAgIHJldHVybiBDTEFVREVfQVJHU19QQVRURVJOLnRlc3QoYXJncyk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHBhcmVudCBQSUQgZm9yIGEgcHJvY2Vzcywgb3IgYG51bGxgIHdoZW4gdHJhdmVyc2FsIHNob3VsZCBzdG9wLlxuICpcbiAqIGBudWxsYCBpcyByZXR1cm5lZCBmb3IgbWlzc2luZyBwcm9jZXNzZXMsIG1hbGZvcm1lZCBgcHNgIG91dHB1dCwgYW5kXG4gKiBzZWxmLXBhcmVudGluZyB2YWx1ZXMgdGhhdCB3b3VsZCBvdGhlcndpc2UgY3JlYXRlIGEgbG9vcC5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gUHJvY2VzcyBJRCB3aG9zZSBwYXJlbnQgc2hvdWxkIGJlIHF1ZXJpZWQuXG4gKiBAcmV0dXJucyBQYXJlbnQgUElEIHdoZW4gYXZhaWxhYmxlLCBvdGhlcndpc2UgYG51bGxgLlxuICovXG5mdW5jdGlvbiBnZXRQYXJlbnRQaWQocGlkOiBudW1iZXIpOiBudW1iZXIgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBwcGlkU3RyID0gZXhlY1N5bmMoYHBzIC1wICR7cGlkfSAtbyBwcGlkPWAsIHsgZW5jb2Rpbmc6ICd1dGY4JyB9KS50cmltKCk7XG4gICAgY29uc3QgcGFyZW50UGlkID0gTnVtYmVyLnBhcnNlSW50KHBwaWRTdHIsIDEwKTtcbiAgICBpZiAoTnVtYmVyLmlzTmFOKHBhcmVudFBpZCkgfHwgcGFyZW50UGlkID09PSBwaWQpIHJldHVybiBudWxsO1xuICAgIHJldHVybiBwYXJlbnRQaWQ7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogV2Fsa3MgdGhlIHByb2Nlc3MgdHJlZSB1cHdhcmQgZnJvbSBgc3RhcnRQaWRgIChkZWZhdWx0OiBgcHJvY2Vzcy5wcGlkYClcbiAqIGxvb2tpbmcgZm9yIHRoZSBuZWFyZXN0IGFuY2VzdG9yIG5hbWVkIFwiY2xhdWRlXCIuXG4gKlxuICogQHBhcmFtIHN0YXJ0UGlkIC0gT3B0aW9uYWwgcm9vdCBQSUQgZm9yIHRyYXZlcnNhbC4gV2hlbiBvbWl0dGVkLCB0cmF2ZXJzYWxcbiAqICAgc3RhcnRzIGF0IHRoZSBwYXJlbnQgb2YgdGhlIGN1cnJlbnQgaG9vayBwcm9jZXNzLlxuICogQHJldHVybnMgVGhlIG5lYXJlc3QgbWF0Y2hpbmcgQ2xhdWRlIGFuY2VzdG9yIFBJRCwgb3IgYG51bGxgIHdoZW4gbm8gbWF0Y2hcbiAqICAgaXMgZm91bmQgd2l0aGluIHtAbGluayBQUk9DRVNTX1RSRUVfTUFYX0RFUFRIfS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRDbGF1ZGVQaWQoc3RhcnRQaWQ/OiBudW1iZXIpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3QgcGlkcyA9IGZpbmRBbGxDbGF1ZGVQaWRzKHN0YXJ0UGlkKTtcbiAgcmV0dXJuIHBpZHNbMF0gPz8gbnVsbDtcbn1cblxuLyoqXG4gKiBXYWxrcyB0aGUgcHJvY2VzcyB0cmVlIHVwd2FyZCBmcm9tIGBzdGFydFBpZGAgKGRlZmF1bHQ6IGBwcm9jZXNzLnBwaWRgKSBhbmRcbiAqIHJldHVybnMgKiphbGwqKiBQSURzIG5hbWVkIFwiY2xhdWRlXCIsIG9yZGVyZWQgbmVhcmVzdC1maXJzdC5cbiAqXG4gKiBVc2VmdWwgd2hlbiBtdWx0aXBsZSBDbGF1ZGUgc2Vzc2lvbnMgYXJlIG5lc3RlZCAoZS5nLiBhIFRhc2sgc3ViYWdlbnRcbiAqIHNwYXduZWQgYnkgYW4gb3V0ZXIgQ2xhdWRlKSBhbmQgdGhlIGNvcnJlY3QgY2FyZCBhc3NvY2lhdGlvbiBtYXkgYmVsb25nXG4gKiB0byBhbiBhbmNlc3RvciBmdXJ0aGVyIHVwIHRoZSB0cmVlLlxuICogSWYgQ2xhdWRlIGxhdW5jaGVkIENsYXVkZSB3aGljaCBsYXVuY2hlZCBDbGF1ZGUsIHRoaXMgcmV0dXJucyB0aGF0IGJyZWFkY3J1bWJcbiAqIHRyYWlsIG5lYXJlc3QtZmlyc3QuXG4gKlxuICogQHBhcmFtIHN0YXJ0UGlkIC0gT3B0aW9uYWwgcm9vdCBQSUQgZm9yIHRyYXZlcnNhbC4gV2hlbiBvbWl0dGVkLCB0cmF2ZXJzYWxcbiAqICAgc3RhcnRzIGF0IHRoZSBwYXJlbnQgb2YgdGhlIGN1cnJlbnQgaG9vayBwcm9jZXNzLlxuICogQHJldHVybnMgQWxsIG1hdGNoaW5nIENsYXVkZSBhbmNlc3RvciBQSURzIGRpc2NvdmVyZWQgYmVmb3JlIHRyYXZlcnNhbCBzdG9wcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxDbGF1ZGVQaWRzKHN0YXJ0UGlkPzogbnVtYmVyKTogbnVtYmVyW10ge1xuICBjb25zdCByZXN1bHRzOiBudW1iZXJbXSA9IFtdO1xuICBsZXQgcGlkID0gc3RhcnRQaWQgPz8gcHJvY2Vzcy5wcGlkO1xuXG4gIGZvciAobGV0IGRlcHRoID0gMDsgZGVwdGggPCBQUk9DRVNTX1RSRUVfTUFYX0RFUFRIOyBkZXB0aCsrKSB7XG4gICAgaWYgKHBpZCA8PSAxKSBicmVhaztcblxuICAgIGlmIChpc0NsYXVkZShwaWQpKSB7XG4gICAgICByZXN1bHRzLnB1c2gocGlkKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJlbnRQaWQgPSBnZXRQYXJlbnRQaWQocGlkKTtcbiAgICBpZiAocGFyZW50UGlkID09PSBudWxsKSBicmVhaztcbiAgICBwaWQgPSBwYXJlbnRQaWQ7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cbiIsICIvKipcbiAqIFBlci1zZXNzaW9uIGZpbGUgb3BlcmF0aW9ucyBmb3IgY2FyZC1yZXBvIGNvbW1pdCBhdHRyaWJ1dGlvbi5cbiAqXG4gKiBNYW5hZ2VzIHBlci1zZXNzaW9uIENTViBmaWxlcywgLmhlYWQgZmlsZXMsIGFuZCBkaXJlY3Rvcnkgc2V0dXAgdW5kZXJcbiAqIGB+Ly5jYXJkcy9jYXJkLXJlcG8tY29tbWl0cy9gLiBFYWNoIHNlc3Npb24gZ2V0cyBpdHMgb3duIENTViBmaWxlIGZvclxuICogY29tbWl0IFNIQXMgYW5kIGEgLmhlYWQgZmlsZSB0cmFja2luZyB0aGUgSEVBRCBTSEEgYXQgc2Vzc2lvbiBzdGFydC5cbiAqXG4gKiBEZXNpZ24gaW52YXJpYW50czpcbiAqIC0gKipGYWlsLWNsb3NlZCoqOiB1bmV4cGVjdGVkIGVycm9ycyBwcm9wYWdhdGU7IG9ubHkgYEVOT0VOVGAgaXMgc2lsZW50bHkgaGFuZGxlZC5cbiAqIC0gKipQZXItc2Vzc2lvbiBsb2NraW5nKio6IENTViBhcHBlbmRzIGFjcXVpcmUgYSBwZXItc2Vzc2lvbiBsb2NrIHRvIHByZXZlbnRcbiAqICAgZHVwbGljYXRlIHdyaXRlcyB1bmRlciBjb25jdXJyZW50IGFjY2Vzcy5cbiAqIC0gKipEZWR1cGxpY2F0aW9uKio6IFNIQXMgYXJlIGRlZHVwbGljYXRlZCBiZWZvcmUgYXBwZW5kaW5nLlxuICpcbiAqIEBzdW1tYXJ5IFBlci1zZXNzaW9uIENTViBhbmQgLmhlYWQgZmlsZSBvcGVyYXRpb25zIGZvciBjYXJkLXJlcG8gY29tbWl0IGF0dHJpYnV0aW9uXG4gKiBAbW9kdWxlIGNhcmQtcmVwb1xuICovXG5cbmltcG9ydCB7IGFwcGVuZEZpbGVTeW5jLCBta2RpclN5bmMsIHJlYWRGaWxlU3luYywgdW5saW5rU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgaG9tZWRpciB9IGZyb20gJ25vZGU6b3MnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBhY3F1aXJlTG9jaywgaGFzRXJybm9Db2RlLCByZWxlYXNlTG9jayB9IGZyb20gJy4vaW50ZXJuYWwuanMnO1xuXG5jb25zdCBMT0NLX1RJTUVPVVRfTVMgPSAyMDAwO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEludGVybmFsIHBhdGggaGVscGVyc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIGdldENhcmRSZXBvQ29tbWl0c0RpcigpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihob21lZGlyKCksICcuY2FyZHMnLCAnY2FyZC1yZXBvLWNvbW1pdHMnKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2Vzc2lvbkNzdlBhdGgoc2Vzc2lvbklkOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihnZXRDYXJkUmVwb0NvbW1pdHNEaXIoKSwgYCR7c2Vzc2lvbklkfS5jc3ZgKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2Vzc2lvbkNzdkxvY2tQYXRoKHNlc3Npb25JZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oZ2V0Q2FyZFJlcG9Db21taXRzRGlyKCksIGAke3Nlc3Npb25JZH0uY3N2LmxvY2tgKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2Vzc2lvbkhlYWRTaGFQYXRoKHNlc3Npb25JZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oZ2V0Q2FyZFJlcG9Db21taXRzRGlyKCksIGAke3Nlc3Npb25JZH0uaGVhZGApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFB1YmxpYyBBUElcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKipcbiAqIEFwcGVuZHMgYSBjb21taXQgU0hBIHRvIHRoZSBzZXNzaW9uJ3MgQ1NWIGZpbGUuIERlZHVwbGljYXRlcyBTSEFzLlxuICogQ3JlYXRlcyBkaXJlY3RvcnkgYW5kIENTViBmaWxlIGlmIHRoZXkgZG9uJ3QgZXhpc3QuXG4gKlxuICogRGVkdXBsaWNhdGlvbiBpcyByZWFkLWJlZm9yZS1hcHBlbmQgdW5kZXIgYSBwZXItc2Vzc2lvbiBsb2NrLCBzbyBjb25jdXJyZW50XG4gKiB3cml0ZXJzIGRvIG5vdCBwcm9kdWNlIGR1cGxpY2F0ZSBsaW5lcyBmb3IgdGhlIHNhbWUgU0hBLlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIHdob3NlIGNvbW1pdCBidWZmZXIgc2hvdWxkIGJlIHVwZGF0ZWQuXG4gKiBAcGFyYW0gc2hhIC0gRnVsbCBjb21taXQgU0hBIHRvIGFwcGVuZC5cbiAqIEByZXR1cm5zIFJlc29sdmVzIG9uY2UgdGhlIFNIQSBpcyBwZXJzaXN0ZWQgb3Igc2tpcHBlZCBhcyBkdXBsaWNhdGUuXG4gKiBAdGhyb3dzIEVycm9yIG9uIGxvY2sgYWNxdWlzaXRpb24sIHJlYWQsIG9yIGFwcGVuZCBmYWlsdXJlcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcGVuZENvbW1pdFRvU2Vzc2lvbihzZXNzaW9uSWQ6IHN0cmluZywgc2hhOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgbWtkaXJTeW5jKGdldENhcmRSZXBvQ29tbWl0c0RpcigpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgbW9kZTogMG83MDAgfSk7XG5cbiAgY29uc3QgY3N2TG9ja1BhdGggPSBnZXRTZXNzaW9uQ3N2TG9ja1BhdGgoc2Vzc2lvbklkKTtcbiAgYXdhaXQgYWNxdWlyZUxvY2soY3N2TG9ja1BhdGgsIExPQ0tfVElNRU9VVF9NUyk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBjc3ZQYXRoID0gZ2V0U2Vzc2lvbkNzdlBhdGgoc2Vzc2lvbklkKTtcbiAgICBjb25zdCBleGlzdGluZ0NvbW1pdHMgPSBnZXRTZXNzaW9uQ29tbWl0cyhzZXNzaW9uSWQpO1xuXG4gICAgaWYgKCFleGlzdGluZ0NvbW1pdHMuaW5jbHVkZXMoc2hhKSkge1xuICAgICAgYXBwZW5kRmlsZVN5bmMoY3N2UGF0aCwgYCR7c2hhfVxcbmAsIHsgbW9kZTogMG82MDAgfSk7XG4gICAgfVxuICB9IGZpbmFsbHkge1xuICAgIHJlbGVhc2VMb2NrKGNzdkxvY2tQYXRoKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlYWRzIGFuZCByZXR1cm5zIGFsbCBjb21taXQgU0hBcyBmb3IgYSBzZXNzaW9uIGZyb20gaXRzIENTViBmaWxlLlxuICogUmV0dXJucyBlbXB0eSBhcnJheSBpZiBDU1YgZG9lc24ndCBleGlzdC5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiB3aG9zZSBjb21taXQgYnVmZmVyIHNob3VsZCBiZSByZWFkLlxuICogQHJldHVybnMgT3JkZXJlZCBsaXN0IG9mIG5vbi1lbXB0eSBTSEEgbGluZXMuIFJldHVybnMgYFtdYCB3aGVuIHRoZSBDU1YgaXMgYWJzZW50LlxuICogQHRocm93cyBFcnJvciBvbiByZWFkIGZhaWx1cmUgKGV4Y2VwdCBgRU5PRU5UYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTZXNzaW9uQ29tbWl0cyhzZXNzaW9uSWQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjc3ZQYXRoID0gZ2V0U2Vzc2lvbkNzdlBhdGgoc2Vzc2lvbklkKTtcbiAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGNzdlBhdGgsICd1dGYtOCcpO1xuICAgIHJldHVybiBjb250ZW50XG4gICAgICAuc3BsaXQoJ1xcbicpXG4gICAgICAubWFwKChsaW5lKSA9PiBsaW5lLnRyaW0oKSlcbiAgICAgIC5maWx0ZXIoKGxpbmUpID0+IGxpbmUubGVuZ3RoID4gMCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGhhc0Vycm5vQ29kZShlcnJvciwgJ0VOT0VOVCcpKSByZXR1cm4gW107XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBzZXNzaW9uJ3MgQ1NWIGZpbGUgYW5kIGl0cyBsb2NrIGZpbGUuXG4gKiBOby1vcCBpZiBmaWxlcyBkb24ndCBleGlzdC5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiB3aG9zZSBDU1YgYXJ0aWZhY3RzIHNob3VsZCBiZSBkZWxldGVkLlxuICogQHRocm93cyBFcnJvciB3aGVuIGRlbGV0aW5nIGVpdGhlciBmaWxlIGZhaWxzIGZvciByZWFzb25zIG90aGVyIHRoYW4gYEVOT0VOVGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVTZXNzaW9uQ3N2KHNlc3Npb25JZDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGNzdlBhdGggPSBnZXRTZXNzaW9uQ3N2UGF0aChzZXNzaW9uSWQpO1xuICBjb25zdCBjc3ZMb2NrUGF0aCA9IGdldFNlc3Npb25Dc3ZMb2NrUGF0aChzZXNzaW9uSWQpO1xuXG4gIHRyeSB7XG4gICAgdW5saW5rU3luYyhjc3ZQYXRoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoIWhhc0Vycm5vQ29kZShlcnJvciwgJ0VOT0VOVCcpKSB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgdW5saW5rU3luYyhjc3ZMb2NrUGF0aCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKCFoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgdGhyb3cgZXJyb3I7XG4gIH1cbn1cblxuLyoqXG4gKiBXcml0ZXMgYSBnaXQgSEVBRCBTSEEgdG8gdGhlIHNlc3Npb24ncyAuaGVhZCBmaWxlLlxuICogQ3JlYXRlcyBkaXJlY3RvcnkgaWYgaXQgZG9lc24ndCBleGlzdC5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiB3aG9zZSBIRUFEIFNIQSBzaG91bGQgYmUgc3RvcmVkLlxuICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgU0hBIHRvIHBlcnNpc3QuXG4gKiBAdGhyb3dzIEVycm9yIHdoZW4gZGlyZWN0b3J5IGNyZWF0aW9uIG9yIGZpbGUgd3JpdGUgZmFpbHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZVNlc3Npb25IZWFkU2hhKHNlc3Npb25JZDogc3RyaW5nLCBzaGE6IHN0cmluZyk6IHZvaWQge1xuICBta2RpclN5bmMoZ2V0Q2FyZFJlcG9Db21taXRzRGlyKCksIHsgcmVjdXJzaXZlOiB0cnVlLCBtb2RlOiAwbzcwMCB9KTtcbiAgd3JpdGVGaWxlU3luYyhnZXRTZXNzaW9uSGVhZFNoYVBhdGgoc2Vzc2lvbklkKSwgc2hhLCB7IG1vZGU6IDBvNjAwIH0pO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBnaXQgSEVBRCBTSEEgZnJvbSB0aGUgc2Vzc2lvbidzIC5oZWFkIGZpbGUuXG4gKlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gd2hvc2UgSEVBRCBTSEEgc2hvdWxkIGJlIHJldHJpZXZlZC5cbiAqIEByZXR1cm5zIFRoZSBzdG9yZWQgU0hBIHdpdGggd2hpdGVzcGFjZSB0cmltbWVkLCBvciBgbnVsbGAgd2hlbiB0aGUgZmlsZSBpcyBhYnNlbnQuXG4gKiBAdGhyb3dzIEVycm9yIHdoZW4gZmlsZSByZWFkIGZhaWxzIGZvciByZWFzb25zIG90aGVyIHRoYW4gYEVOT0VOVGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkU2Vzc2lvbkhlYWRTaGEoc2Vzc2lvbklkOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcmVhZEZpbGVTeW5jKGdldFNlc3Npb25IZWFkU2hhUGF0aChzZXNzaW9uSWQpLCAndXRmLTgnKS50cmltKCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGhhc0Vycm5vQ29kZShlcnJvciwgJ0VOT0VOVCcpKSByZXR1cm4gbnVsbDtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgdGhlIHNlc3Npb24ncyAuaGVhZCBmaWxlLlxuICogTm8tb3AgaWYgZmlsZSBkb2Vzbid0IGV4aXN0LlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIHdob3NlIC5oZWFkIGZpbGUgc2hvdWxkIGJlIGRlbGV0ZWQuXG4gKiBAdGhyb3dzIEVycm9yIHdoZW4gZGVsZXRpbmcgdGhlIGZpbGUgZmFpbHMgZm9yIHJlYXNvbnMgb3RoZXIgdGhhbiBgRU5PRU5UYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZVNlc3Npb25IZWFkU2hhKHNlc3Npb25JZDogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgdW5saW5rU3luYyhnZXRTZXNzaW9uSGVhZFNoYVBhdGgoc2Vzc2lvbklkKSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKCFoYXNFcnJub0NvZGUoZXJyb3IsICdFTk9FTlQnKSkgdGhyb3cgZXJyb3I7XG4gIH1cbn1cbiIsICIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGluamVjdHMgYWN0aW9uIGFuZCB0eXBlIGhvb2sgaW5wdXRzIHZpYSBwcm9jZXNzLmVudi5cbiAqIFRoaXMgbW9kdWxlIHByb3ZpZGVzIHN0cmljdCBnZXR0ZXJzIGFuZCB0eXBlZCBleHRyYWN0b3JzIHNvIGhhbmRsZXJzIGRvIG5vdFxuICogbmVlZCB0byBwYXJzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgbWFudWFsbHkuXG4gKlxuICogVXNlIHRoZSBpbmRpdmlkdWFsIGdldHRlcnMgd2hlbiB5b3Ugb25seSBuZWVkIG9uZSB2YWx1ZTsgdXNlXG4gKiB7QGxpbmsgZXh0cmFjdEFjdGlvbklucHV0fSBvciB7QGxpbmsgZXh0cmFjdFR5cGVJbnB1dH0gd2hlbiB5b3UgbmVlZCBhIGZ1bGxcbiAqIHR5cGVkIHBheWxvYWQgZm9yIGFuIGFjdGlvbiBvciB0eXBlIGhvb2suXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uSW5wdXQsIFR5cGVIb29rSW5wdXQgfSBmcm9tICcuL2lucHV0cy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVzIHNldCBieSB0aGUgQ2FyZHMgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKlxuICogVGhpcyBpcyB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCBmb3IgZW52IHZhciBrZXlzIHVzZWQgYnkgYWN0aW9uIGFuZCB0eXBlXG4gKiBob29rIHByb2Nlc3Nlcy4gS2VlcCBpdCBpbiBzeW5jIHdpdGggdGhlIHdyYXBwZXIgdG8gYXZvaWQgc3VidGxlIFwidW5kZWZpbmVkXG4gKiBpbnB1dFwiIGJ1Z3MuXG4gKi9cbmV4cG9ydCBjb25zdCBDQVJEU19FTlZfVkFSUyA9IHtcbiAgLyoqXG4gICAqIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgY3VycmVudCBjYXJkLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBDQVJEX0lEOiAnQ0FSRF9JRCcsXG5cbiAgLyoqXG4gICAqIFRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gc2V0dGluZ3MuanNvbi5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgRU5WSVJPTk1FTlQ6ICdFTlZJUk9OTUVOVCcsXG5cbiAgLyoqXG4gICAqIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIGJ1dHRvbiB0aGF0IHRyaWdnZXJlZCB0aGlzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEFDVElPTl9OQU1FOiAnQUNUSU9OX05BTUUnLFxuXG4gIC8qKlxuICAgKiBDYXJkJ3MgZXhlY3V0aW9uIG1vZGUsIGRldGVybWluaW5nIFVJIGludGVyYWN0aW9uIG1vZGVsLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIFZhbGlkIHZhbHVlczogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJ1xuICAgKi9cbiAgRVhFQ1VUSU9OX01PREU6ICdFWEVDVVRJT05fTU9ERScsXG5cbiAgLyoqXG4gICAqIENhcmRzIHNlcnZlciBiYXNlIFVSTCBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQkFTRV9VUkw6ICdBUElfQkFTRV9VUkwnLFxuXG4gIC8qKlxuICAgKiBBdXRoZW50aWNhdGlvbiB0b2tlbiBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQUNDRVNTX1RPS0VOOiAnQVBJX0FDQ0VTU19UT0tFTicsXG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIE9wdGlvbmFsLlxuICAgKi9cbiAgQ09ESU5HX0FHRU5UOiAnQ09ESU5HX0FHRU5UJyxcblxuICAvKipcbiAgICogVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9OQU1FOiAnVFlQRV9OQU1FJyxcblxuICAvKipcbiAgICogVGhlIHR5cGUncyB2ZXJzaW9uIHN0cmluZyBmcm9tIHNldHRpbmdzLmpzb24gY29uZmlndXJhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFRZUEVfVkVSU0lPTjogJ1RZUEVfVkVSU0lPTicsXG5cbiAgLyoqXG4gICAqIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfTkFNRTogJ0ZJTEVfTkFNRScsXG5cbiAgLyoqXG4gICAqIEZ1bGwgcGF0aCB0byB0aGUgZmlsZS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfUEFUSDogJ0ZJTEVfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEZpbGUgc2l6ZSBpbiBieXRlcy5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfU0laRTogJ0ZJTEVfU0laRScsXG5cbiAgLyoqXG4gICAqIFNIQTI1NiBoYXNoIG9mIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBTSEEyNTY6ICdTSEEyNTYnLFxuXG4gIC8qKlxuICAgKiBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBDT05URU5UX1RZUEU6ICdDT05URU5UX1RZUEUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlci5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYCAod2l0aFxuICAgKiBgRUxFQ1RST05fUlVOX0FTX05PREU9MWApLiBDb21tYW5kcyBpbiBzZXR0aW5ncy5qc29uIHVzZVxuICAgKiBgJFZTQ09ERV9OT0RFIC4vYmluLy4uLmAgc28gdGhleSB3b3JrIHJlZ2FyZGxlc3Mgb2ZcbiAgICogd2hldGhlciBgbm9kZWAgaXMgb24gdGhlIHN5c3RlbSBQQVRILlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBWU0NPREVfTk9ERTogJ1ZTQ09ERV9OT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlciBydW5uaW5nIHRoZSB3cmFwcGVyIHByb2Nlc3MuXG4gICAqXG4gICAqIFNldCBieSB0aGUgd3JhcHBlciBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYC4gVXNlIGAkTk9ERWAgaW4gZW1iZWRkZWRcbiAgICogYmFzaCBzdGF0ZW1lbnRzIHRvIGludm9rZSBOb2RlIHNjcmlwdHMgcG9ydGFibHkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucy5cbiAgICovXG4gIE5PREU6ICdOT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVW5peCBkb21haW4gc29ja2V0IGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFNPQ0tFVF9QQVRIOiAnU09DS0VUX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGEgSlNPTiBmaWxlIGNvbnRhaW5pbmcgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZyb20gYSBwcmV2aW91cyBoYW5kbGVyLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LiBPcHRpb25hbC5cbiAgICovXG4gIFNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEg6ICdTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDT05GSUdfUEFUSDogJ0NPTkZJR19QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVlMgQ29kZSB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnkuXG4gICAqIFNldCBieSB0aGUgYWN0aW9uIGhhbmRsZXIgKGUuZy4sIGxhdW5jaC50cykgdG8gdGhlIHdvcmt0cmVlIHBhdGguXG4gICAqIEF2YWlsYWJsZSBpbiBob29rcyBydW5uaW5nIGluc2lkZSB0aGUgY2xhdWRlIENMSS5cbiAgICovXG4gIFdPUktTUEFDRV9QQVRIOiAnV09SS1NQQUNFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgKE5PVCBhIHdvcmt0cmVlKS5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIGFuZCB3YXRjaGVyIGZvclxuICAgKiBnaXQgb3BlcmF0aW9ucyAod29ya3RyZWUgcmVtb3ZhbCwgYnJhbmNoIGRlbGV0aW9uKSB0aGF0IG11c3QgcnVuXG4gICAqIGFnYWluc3QgdGhlIG1haW4gcmVwb3NpdG9yeS5cbiAgICovXG4gIFJFUE9fUk9PVDogJ1JFUE9fUk9PVCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGNhcmQncyByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENBUkRfUkVQT19QQVRIOiAnQ0FSRF9SRVBPX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlZCBzaGVsbCBjb21tYW5kIGZvciB0aGUgd3JhcHBlciB0byBzcGF3biBhcyB0aGUgYWN0aW9uIGhhbmRsZXIuXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyBjb25zdW1lZCBieSB0aGUgd3JhcHBlciAobm90IGJ5IGFjdGlvbiBoYW5kbGVycykuXG4gICAqL1xuICBBQ1RJT05fQ09NTUFORDogJ0FDVElPTl9DT01NQU5EJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCB0aGF0IHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3aWxsIG1lcmdlIGludG8uXG4gICAqIFJlc29sdmVkIGZyb20gdGhlIHdvcmtzcGFjZSBIRUFEIGF0IGxhdW5jaCB0aW1lLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBCQVNFX0JSQU5DSDogJ0JBU0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBmcm9tIHdoaWNoIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3YXMgY3JlYXRlZC5cbiAgICogTWF5IGRpZmZlciBmcm9tIEJBU0VfQlJBTkNIIHdoZW4gdGhlIHdvcmt0cmVlIHdhcyBjcmVhdGVkIGFnYWluc3RcbiAgICogYSBkaWZmZXJlbnQgcmVmIHRoYW4gdGhlIGN1cnJlbnQgd29ya3NwYWNlIEhFQUQuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFBBUkVOVF9CUkFOQ0g6ICdQQVJFTlRfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBuYW1lIGZvciB0aGUgY2FyZCdzIHdvcmtzcGFjZSBpbXBsZW1lbnRhdGlvbi5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uIGFmdGVyIHJlc29sdmluZyBvciBjcmVhdGluZyB0aGUgd29ya3RyZWUuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBXT1JLU1BBQ0VfQlJBTkNIOiAnV09SS1NQQUNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIFNlc3Npb24gSUQgcGVyc2lzdGVkIGJ5IHRoZSBzZXNzaW9uLXN0YXJ0IGhvb2sgdmlhIGBwZXJzaXN0RW52VmFyYC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIEJhc2ggdG9vbCBzaGVsbCBkZXNjZW5kYW50cyAoY29tbWFuZHMsIGdpdCBob29rcykgYWZ0ZXJcbiAgICogc2Vzc2lvbiBzdGFydC4gTk9UIGF2YWlsYWJsZSBpbiBob29rcyBzcGF3bmVkIGRpcmVjdGx5IGJ5IENsYXVkZSBDb2RlXG4gICAqIChzdG9wLCBzZXNzaW9uLWVuZCwgZXRjLikgXHUyMDE0IHRob3NlIHJlY2VpdmUgdGhlIHNlc3Npb24gSUQgdmlhIGhvb2sgaW5wdXQuXG4gICAqXG4gICAqIFRoZSBjYXJkLXJlcG8gcG9zdC1jb21taXQgaG9vayByZWFkcyB0aGlzIHRvIHJlY29yZCBjb21taXRzIGRpcmVjdGx5XG4gICAqIHdpdGhvdXQgbmVlZGluZyBhIHByb2Nlc3MtdHJlZSB3YWxrIG9yIFBJRCByZWdpc3RyeSBsb29rdXAuXG4gICAqL1xuICBDQVJEU19TRVNTSU9OX0lEOiAnQ0FSRFNfU0VTU0lPTl9JRCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAgICogaW50byBhbGwgc3Bhd25lZCBhY3Rpb24gcHJvY2Vzc2VzLiBVc2UgdGhpcyB0byBsb2NhdGUgYnVuZGxlZCBhc3NldHMgc3VjaFxuICAgKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEVYVEVOU0lPTl9QQVRIOiAnRVhURU5TSU9OX1BBVEgnXG59IGFzIGNvbnN0O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJbmRpdmlkdWFsIEdldHRlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSBleGVjdXRpb24gd3JhcHBlciBhbHdheXMgc2V0cyB0aGlzIGZvciBldmVyeSBhY3Rpb24gYW5kIHR5cGUgaG9vay5cbiAqIEByZXR1cm5zIFRoZSBjdXJyZW50IGNhcmQgSURcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0FSRF9JRCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2FyZElkID0gZ2V0Q2FyZElkKCk7XG4gKiBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyBjYXJkOiAke2NhcmRJZH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FyZElkKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX0lEfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZW52aXJvbm1lbnQgbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZhbHVlIG1hdGNoZXMgdGhlIGVudmlyb25tZW50IGtleSBpbiBzZXR0aW5ncy5qc29uIChlLmcuLCBcImRlZmF1bHRcIiwgXCJzdGFnaW5nXCIpLlxuICogQHJldHVybnMgVGhlIGVudmlyb25tZW50IG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRU5WSVJPTk1FTlQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudmlyb25tZW50ID0gZ2V0RW52aXJvbm1lbnQoKTtcbiAqIGNvbnNvbGUubG9nKGBFbnZpcm9ubWVudDogJHtlbnZpcm9ubWVudH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52aXJvbm1lbnQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFjdGlvbiBidXR0b24gbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHRoZSBkaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgaGFuZGxlciwgbWF0Y2hpbmdcbiAqIHRoZSBgYWN0aW9uTmFtZWAgZmllbGQgZnJvbSBgZGVmaW5lQWN0aW9uYC5cbiAqIEByZXR1cm5zIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBjdXJyZW50IGhhbmRsZXIgcnVuLlxuICogQHRocm93cyBFcnJvciBpZiBBQ1RJT05fTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYWN0aW9uTmFtZSA9IGdldEFjdGlvbk5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBSdW5uaW5nIGFjdGlvbjogJHthY3Rpb25OYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3Rpb25OYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBleGVjdXRpb24gbW9kZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBEZXRlcm1pbmVzIHRoZSBVSSBpbnRlcmFjdGlvbiBtb2RlbCBmb3IgYWN0aW9ucy5cbiAqIEByZXR1cm5zIFRoZSBleGVjdXRpb24gbW9kZSAoJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcpXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYRUNVVElPTl9NT0RFIGlzIG1pc3NpbmcsIGVtcHR5LCBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgbW9kZSA9IGdldEV4ZWN1dGlvbk1vZGUoKTtcbiAqIGlmIChtb2RlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gKiAgIC8vIFNob3cgdXNlciBwcm9tcHRzXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4ZWN1dGlvbk1vZGUoKTogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9YCk7XG4gIH1cbiAgaWYgKHZhbHVlICE9PSAnaW50ZXJhY3RpdmUnICYmIHZhbHVlICE9PSAnYmFja2dyb3VuZCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX06IGV4cGVjdGVkICdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYmFzZSBVUkwgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVXNlIHRoaXMgYXMgdGhlIGJhc2UgZm9yIGNvbnN0cnVjdGluZyBBUEkgZW5kcG9pbnRzLiBUaGUgVVJMIGRvZXMgbm90IGluY2x1ZGVcbiAqIGEgdHJhaWxpbmcgc2xhc2guXG4gKiBAcmV0dXJucyBCYXNlIFVSTCB1c2VkIHRvIGNvbnN0cnVjdCBDYXJkcyBBUEkgZW5kcG9pbnRzIGZvciB0aGlzIGV4ZWN1dGlvbi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0JBU0VfVVJMIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhcGlVcmwgPSBnZXRBcGlCYXNlVXJsKCk7XG4gKiBjb25zdCBlbmRwb2ludCA9IGAke2FwaVVybH0vY2FyZHMvJHtjYXJkSWR9YDtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQmFzZVVybCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkx9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYWNjZXNzIHRva2VuIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIEJlYXJlciB0b2tlbiB2YWxpZCBmb3IgdGhlIGR1cmF0aW9uIG9mIHRoaXMgYWN0aW9uIG9yIHR5cGUgaG9vayBleGVjdXRpb24uXG4gKiBJbmNsdWRlIGluIEF1dGhvcml6YXRpb24gaGVhZGVycyB3aGVuIGNhbGxpbmcgdGhlIENhcmRzIEFQSS5cbiAqIEByZXR1cm5zIEJlYXJlciB0b2tlbiB0aGF0IGF1dGhvcml6ZXMgQVBJIHJlcXVlc3RzIGZvciB0aGlzIGV4ZWN1dGlvbiBjb250ZXh0LlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQUNDRVNTX1RPS0VOIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0b2tlbiA9IGdldEFwaUFjY2Vzc1Rva2VuKCk7XG4gKiBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGFwaVVybCwge1xuICogICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0b2tlbn1gIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlBY2Nlc3NUb2tlbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU5dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGNvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogT3B0aW9uYWwgdmFsdWUgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLiBXaGVuIHNldCwgaW5kaWNhdGVzIHdoaWNoIEFJXG4gKiBjb2RpbmcgYXNzaXN0YW50IHRoZSB1c2VyIHByZWZlcnMuIEFjdGlvbnMgY2FuIHVzZSB0aGlzIHRvIGN1c3RvbWl6ZSBiZWhhdmlvclxuICogb3IgcHJvbXB0cyBmb3IgZGlmZmVyZW50IGFnZW50cy5cbiAqIEByZXR1cm5zIFRoZSBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb2RpbmdBZ2VudCA9IGdldENvZGluZ0FnZW50KCk7XG4gKiBpZiAoY29kaW5nQWdlbnQgPT09ICdjbGF1ZGUnKSB7XG4gKiAgIC8vIEN1c3RvbWl6ZSBmb3IgQ2xhdWRlXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvZGluZ0FnZW50KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ESU5HX0FHRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lIGZvciB0eXBlIGhvb2tzLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgb25seSBwcmVzZW50IGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICogQHJldHVybnMgVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdHlwZU5hbWUgPSBnZXRUeXBlTmFtZSgpO1xuICogY29uc29sZS5sb2coYFR5cGU6ICR7dHlwZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGUgdmVyc2lvbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZlcnNpb24gY29tZXMgZnJvbSB0aGUgdHlwZSBjb25maWd1cmF0aW9uIGluIHNldHRpbmdzLmpzb24uXG4gKiBAcmV0dXJucyBUaGUgdmVyc2lvbiBzdHJpbmcgZnJvbSB0eXBlIGNvbmZpZ1xuICogQHRocm93cyBFcnJvciBpZiBUWVBFX1ZFUlNJT04gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHZlcnNpb24gPSBnZXRUeXBlVmVyc2lvbigpO1xuICogY29uc29sZS5sb2coYFZlcnNpb246ICR7dmVyc2lvbn1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZVZlcnNpb24oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT05dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBuYW1lIGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZpbGUgbmFtZSByZWxhdGl2ZSB0byB0aGUgdHlwZSBkaXJlY3RvcnksIG5vdCBhIGZ1bGwgcGF0aC5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBGaWxlOiAke2ZpbGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSB0eXBlZCBmaWxlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZ1bGx5IHJlc29sdmVkIHBhdGggb24gZGlzayBwcm92aWRlZCBieSB0aGUgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKiBAcmV0dXJucyBUaGUgZnVsbCBwYXRoIHRvIHRoZSBmaWxlXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZVBhdGggPSBnZXRGaWxlUGF0aCgpO1xuICogY29uc29sZS5sb2coYFBhdGg6ICR7ZmlsZVBhdGh9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgc2l6ZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgdmFsdWUgaXMgcGFyc2VkIGFzIGEgYmFzZS0xMCBpbnRlZ2VyLlxuICogQHJldHVybnMgVGhlIGZpbGUgc2l6ZSBpbiBieXRlc1xuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1NJWkUgaXMgbWlzc2luZyBvciBub3QgYSBudW1iZXJcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBzaXplID0gZ2V0RmlsZVNpemUoKTtcbiAqIGNvbnNvbGUubG9nKGBTaXplOiAke3NpemV9IGJ5dGVzYCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVTaXplKCk6IG51bWJlciB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX1gKTtcbiAgfVxuICBjb25zdCBzaXplID0gTnVtYmVyLnBhcnNlSW50KHZhbHVlLCAxMCk7XG4gIGlmIChOdW1iZXIuaXNOYU4oc2l6ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9OiBleHBlY3RlZCBudW1iZXIsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gc2l6ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgU0hBMjU2IGhhc2ggZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogVXNlZnVsIGZvciBkZXRlY3RpbmcgY29udGVudCBjaGFuZ2VzIHdpdGhvdXQgcmVhZGluZyB0aGUgZmlsZSBhZ2Fpbi5cbiAqIEByZXR1cm5zIFRoZSBTSEEyNTYgaGFzaCBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBTSEEyNTYgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGhhc2ggPSBnZXRTaGEyNTYoKTtcbiAqIGNvbnNvbGUubG9nKGBIYXNoOiAke2hhc2h9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNoYTI1NigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNIQTI1Nl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TSEEyNTZ9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBNSU1FIHR5cGUgZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogUHJvdmlkZWQgZm9yIHR5cGUgaG9vayBldmVudHMgc28gdmFsaWRhdG9ycyBjYW4gYnJhbmNoIG9uIGNvbnRlbnQgdHlwZS5cbiAqIEByZXR1cm5zIFRoZSBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09OVEVOVF9UWVBFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb250ZW50VHlwZSA9IGdldENvbnRlbnRUeXBlKCk7XG4gKiBjb25zb2xlLmxvZyhgQ29udGVudCB0eXBlOiAke2NvbnRlbnRUeXBlfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb250ZW50VHlwZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlciBwYXRoIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgc2V0IGJ5IHRoZSBleHRlbnNpb24gZHVyaW5nIGFjdGl2YXRpb24gYW5kIGluamVjdGVkIGludG8gYWxsXG4gKiBzcGF3bmVkIGFjdGlvbi9ob29rIHByb2Nlc3Nlcy4gQ29uZmlndXJhdGlvbiBhdXRob3JzIGNhbiB1c2UgaXQgdG8gaW52b2tlXG4gKiBOb2RlLmpzIHdpdGhvdXQgcmVseWluZyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gKlxuICogQHJldHVybnMgVGhlIHBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXJcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVlNDT0RFX05PREUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG5vZGVQYXRoID0gZ2V0VnNjb2RlTm9kZVBhdGgoKTtcbiAqIGV4ZWNGaWxlU3luYyhub2RlUGF0aCwgWydzY3JpcHQuanMnXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFZzY29kZU5vZGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgcGF0aCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gKlxuICogQHJldHVybnMgVW5peCBzb2NrZXQgcGF0aCB1c2VkIHRvIHNlbmQgcnVudGltZSBjb250cm9sIG1lc3NhZ2VzLlxuICogQHRocm93cyBFcnJvciBpZiBTT0NLRVRfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb2NrZXRQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBwYXRoIHRvIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIG9wdGlvbmFsIFx1MjAxNCByZXR1cm5zIHVuZGVmaW5lZCB3aGVuIG5vdCBzZXQgKGkuZS4sIHRoZSBhY3Rpb25cbiAqIHdhcyBub3QgcmVsYXVuY2hlZCB2aWEgc3dpdGNoVG9JbnRlcmFjdGl2ZSkuXG4gKlxuICogQHJldHVybnMgVGhlIGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBkaXJlY3RvcnkgY29udGFpbmluZyBnZW5lcmF0ZWQgc2V0dGluZ3MgYXJ0aWZhY3RzLlxuICogQHRocm93cyBFcnJvciBpZiBDT05GSUdfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWdQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB3b3Jrc3BhY2UgcGF0aCBzZXQgYnkgdGhlIGFjdGlvbiBoYW5kbGVyIChlLmcuLCB0aGUgd29ya3RyZWUgcGF0aCkuXG4gKlxuICogVGhpcyBpcyBmb3IgaG9va3MgcnVubmluZyBpbnNpZGUgdGhlIENsYXVkZSBDTEksICoqbm90KiogZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqIEFjdGlvbiBoYW5kbGVycyBzaG91bGQgdXNlIHtAbGluayBnZXRSZXBvUm9vdH0gaW5zdGVhZC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBhY3RpdmUgd29ya3NwYWNlIC8gd29ya3RyZWUuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFdPUktTUEFDRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFdvcmtzcGFjZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCBwYXRoLlxuICpcbiAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyB1c2VkIGJ5IGFjdGlvbiBoYW5kbGVycyB0byByZXNvbHZlIHdvcmt0cmVlc1xuICogYW5kIHBlcmZvcm0gZ2l0IG9wZXJhdGlvbnMgYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICogQHRocm93cyBFcnJvciBpZiBSRVBPX1JPT1QgaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVwb1Jvb3QoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1RdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuUkVQT19ST09UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgcmVwb3NpdG9yeSBhc3NvY2lhdGVkIHdpdGggdGhlIGFjdGl2ZSBjYXJkLlxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX1JFUE9fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkUmVwb1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYVEVOU0lPTl9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVuc2lvblBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHBhcnNlcyB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogV2hlbiBgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSGAgaXMgc2V0LCByZWFkcyB0aGUgZmlsZSBhdCB0aGF0IHBhdGhcbiAqIGFuZCBwYXJzZXMgaXQgYXMgSlNPTi4gUmV0dXJucyB1bmRlZmluZWQgaWYgdGhlIGVudiB2YXIgaXMgbm90IHNldC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGFyc2VkIGRhdGEsIG9yIHVuZGVmaW5lZCBpZiB0aGUgcGF0aCBpcyBub3Qgc2V0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBmaWxlIGNhbm5vdCBiZSByZWFkIG9yIGNvbnRhaW5zIGludmFsaWQgSlNPTlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCk6IHVua25vd24gfCB1bmRlZmluZWQge1xuICBjb25zdCBkYXRhUGF0aCA9IGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpO1xuICBpZiAoZGF0YVBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhkYXRhUGF0aCwgJ3V0Zi04Jyk7XG4gIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlZCBJbnB1dCBFeHRyYWN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgYWN0aW9uIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKlxuICogQHJldHVybnMgVHlwZWQgQWN0aW9uSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYW4gYWN0aW9uIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5jYXJkSWQpO1xuICogY29uc29sZS5sb2coaW5wdXQuZXhlY3V0aW9uTW9kZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBY3Rpb25JbnB1dCgpOiBBY3Rpb25JbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBhY3Rpb25OYW1lOiBnZXRBY3Rpb25OYW1lKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgZXhlY3V0aW9uTW9kZTogZ2V0RXhlY3V0aW9uTW9kZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKSxcbiAgICBjb2RpbmdBZ2VudDogZ2V0Q29kaW5nQWdlbnQoKSxcbiAgICBzd2l0Y2hUb0ludGVyYWN0aXZlRGF0YTogcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCksXG4gICAgcmVwb1Jvb3Q6IGdldFJlcG9Sb290KCksXG4gICAgY2FyZFJlcG9QYXRoOiBnZXRDYXJkUmVwb1BhdGgoKSxcbiAgICBjb25maWdQYXRoOiBnZXRDb25maWdQYXRoKCksXG4gICAgZXh0ZW5zaW9uUGF0aDogZ2V0RXh0ZW5zaW9uUGF0aCgpXG4gIH07XG59XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgdHlwZSBob29rIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciB0eXBlIGxpZmVjeWNsZSBob29rcyAodmFsaWRhdG9yLCBjcmVhdGUsXG4gKiB1cGRhdGUsIGRlbGV0ZSkuXG4gKlxuICogQHJldHVybnMgVHlwZWQgVHlwZUhvb2tJbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhIHR5cGUgaG9vayBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RUeXBlSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LnR5cGVOYW1lKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmZpbGVOYW1lKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFR5cGVJbnB1dCgpOiBUeXBlSG9va0lucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIHR5cGVOYW1lOiBnZXRUeXBlTmFtZSgpLFxuICAgIHR5cGVWZXJzaW9uOiBnZXRUeXBlVmVyc2lvbigpLFxuICAgIGZpbGVOYW1lOiBnZXRGaWxlTmFtZSgpLFxuICAgIGZpbGVQYXRoOiBnZXRGaWxlUGF0aCgpLFxuICAgIGZpbGVTaXplOiBnZXRGaWxlU2l6ZSgpLFxuICAgIGZpbGVTaGEyNTY6IGdldFNoYTI1NigpLFxuICAgIGNvbnRlbnRUeXBlOiBnZXRDb250ZW50VHlwZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKVxuICB9O1xufVxuIiwgIi8qKlxuICogQnJhbmNoIGFuZCB3b3JrdHJlZSB0cmFja2luZyB0eXBlcyBmb3IgQ2FyZHMgVjIgd29ya3NwYWNlIGludGVncmF0aW9uLlxuICpcbiAqIFRoZXNlIHR5cGVzIHN1cHBvcnQgdHJhY2tpbmcgR2l0IGJyYW5jaGVzIGFuZCB0aGVpciBhc3NvY2lhdGVkIHdvcmt0cmVlcyB3aXRoaW5cbiAqIGEgY2FyZCdzIHdvcmtzcGFjZS4gQnJhbmNoIG1ldGFkYXRhIGlzIHBlcnNpc3RlZCBpbiBzZXBhcmF0ZSB3b3Jrc3BhY2UtYnJhbmNoZXMuanNvblxuICogYW5kIHdvcmtzcGFjZS1jb21taXRzLmNzdiBmaWxlcywgdHJhY2tlZCB3aXRoIHN0YXRpYyBtZXRhZGF0YSAoYnJhbmNoIG5hbWUsIHdvcmt0cmVlIHBhdGgsXG4gKiBhZGRlZEF0IHRpbWVzdGFtcCkgYW5kIGRlcml2ZWQgZmllbGRzIGNvbXB1dGVkIGF0IHJlYWQgdGltZSAoZXhpc3RzLCBpc01lcmdlZCwgY29tbWl0cykuXG4gKlxuICogVGhlIGJyYW5jaCBBUEkgKGBHRVQgL2NhcmRzLzppZC9icmFuY2hlc2AsIGBQT1NUIC9jYXJkcy86aWQvYnJhbmNoZXNgKSB1c2VzXG4gKiB0aGVzZSB0eXBlcyB0byBleHBvc2Ugd29ya3NwYWNlIHRyYWNraW5nIHN0YXRlIHRvIGNsaWVudHMgYW5kIGVuYWJsZSBicmFuY2hcbiAqIGFzc29jaWF0aW9uIHdpdGggY2FyZHMuXG4gKlxuICogQHN1bW1hcnkgQnJhbmNoIGFuZCB3b3JrdHJlZSB0cmFja2luZyB0eXBlcyBmb3IgQ2FyZHMgVjIgd29ya3NwYWNlIGludGVncmF0aW9uXG4gKiBAbW9kdWxlIHR5cGVzL2JyYW5jaFxuICovXG5cbi8qKlxuICogV2VsbC1rbm93biBTSEEgZm9yIGFuIGVtcHR5IGdpdCB0cmVlLlxuICpcbiAqIFRoaXMgaXMgYSBkZXRlcm1pbmlzdGljIHZhbHVlIHByb2R1Y2VkIGJ5IGBnaXQgaGFzaC1vYmplY3QgLXQgdHJlZSAvZGV2L251bGxgXG4gKiBhbmQgbmV2ZXIgY2hhbmdlcyBhY3Jvc3MgZ2l0IHZlcnNpb25zLiBVc2VkIGFzIHRoZSBkaWZmIGJhc2Ugd2hlbiBjb21wYXJpbmdcbiAqIGFnYWluc3QgYSBzdGF0ZSB3aXRoIG5vIHByaW9yIGNvbW1pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBFTVBUWV9UUkVFX1NIQSA9ICc0YjgyNWRjNjQyY2I2ZWI5YTA2MGU1NGJmOGQ2OTI4OGZiZWU0OTA0JztcblxuZXhwb3J0IGNvbnN0IFdPUktTUEFDRV9CUkFOQ0hFU19GSUxFID0gJ3dvcmtzcGFjZS1icmFuY2hlcy5qc29uJztcbmV4cG9ydCBjb25zdCBXT1JLU1BBQ0VfQ09NTUlUU19GSUxFID0gJ3dvcmtzcGFjZS1jb21taXRzLmNzdic7XG5cbi8qKlxuICogQSBzaW5nbGUgdHJhY2tlZCBicmFuY2ggd2l0aGluIGEgY2FyZCdzIHdvcmtzcGFjZSBibG9jay5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtaW5pbWFsIG1ldGFkYXRhIHBlcnNpc3RlZCBmb3IgZWFjaCBicmFuY2ggaW4gd29ya3NwYWNlLWJyYW5jaGVzLmpzb24uXG4gKiBUaGUgd29ya3RyZWUgcGF0aCBpcyBvcHRpb25hbCBhbmQgbWFjaGluZS1zcGVjaWZpYzsgaXQgbWF5IGJlY29tZSBzdGFsZSBpZlxuICogdGhlIHdvcmt0cmVlIGlzIG1vdmVkIG9yIGRlbGV0ZWQgb3V0c2lkZSBvZiB0aGUgY2FyZHMgc3lzdGVtLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtzcGFjZUJyYW5jaCB7XG4gIC8qKlxuICAgKiBPcHRpb25hbCBhYnNvbHV0ZSBwYXRoIHRvIHdvcmt0cmVlIGRpcmVjdG9yeSAobWFjaGluZS1zcGVjaWZpYywgbWF5IGJlIHN0YWxlKS5cbiAgICogVGhpcyBwYXRoIGlzIGFkdmlzb3J5IG9ubHkgYW5kIHNob3VsZCBiZSB2YWxpZGF0ZWQgYmVmb3JlIHVzZS5cbiAgICovXG4gIHdvcmt0cmVlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBOYW1lIG9mIHRoZSBicmFuY2ggdGhpcyB3YXMgY3JlYXRlZCBmcm9tIChlLmcuLCAnbWFpbicsICdtYXN0ZXInKS5cbiAgICogVXNlZCBhcyB0aGUgYmFzZSByZWYgZm9yIGNvbXBhcmlzb25zLCBmYXN0LWZvcndhcmQgZGV0ZWN0aW9uLCBhbmQgcmViYXNlIHRhcmdldGluZy5cbiAgICovXG4gIHBhcmVudEJyYW5jaDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBJU08gODYwMSB0aW1lc3RhbXAgd2hlbiBicmFuY2ggd2FzIGFkZGVkIHRvIHRoZSBjYXJkLlxuICAgKiBVc2VkIGZvciBjaHJvbm9sb2dpY2FsIHNvcnRpbmcgYW5kIGF1ZGl0IHRyYWlscy5cbiAgICovXG4gIGFkZGVkQXQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBCcmFuY2ggaW5mbyByZXR1cm5lZCBieSBHRVQgL2NhcmRzLzppZC9icmFuY2hlcyAoaW5jbHVkZXMgY29tcHV0ZWQgZmllbGRzKS5cbiAqXG4gKiBUaGlzIHR5cGUgZXh0ZW5kcyB0aGUgcGVyc2lzdGVkIFdvcmtzcGFjZUJyYW5jaCBkYXRhIHdpdGggcnVudGltZS1jb21wdXRlZFxuICogZmllbGRzIHRoYXQgcmVmbGVjdCB0aGUgY3VycmVudCBHaXQgcmVwb3NpdG9yeSBzdGF0ZS4gQ29tcHV0ZWQgZmllbGRzIGFyZVxuICogbmV2ZXIgcGVyc2lzdGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEJyYW5jaEluZm8ge1xuICAvKipcbiAgICogQnJhbmNoIG5hbWUgKG1heSBjb250YWluIHNsYXNoZXMsIGUuZy4sIFwiZmVhdHVyZS9hdXRoXCIpLlxuICAgKiBUaGlzIGlzIHRoZSBHaXQgcmVmIG5hbWUsIG5vdCBhIGZpbGVzeXN0ZW0gcGF0aC5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogT3B0aW9uYWwgd29ya3RyZWUgcGF0aCBhc3NvY2lhdGVkIHdpdGggdGhpcyBicmFuY2guXG4gICAqIENvcGllZCBmcm9tIFdvcmtzcGFjZUJyYW5jaC53b3JrdHJlZSBpZiBwcmVzZW50LlxuICAgKi9cbiAgd29ya3RyZWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFBhcmVudCBicmFuY2ggbmFtZSBmcm9tIHdoaWNoIHRoaXMgYnJhbmNoIHdhcyBjcmVhdGVkIChlLmcuLCAnbWFpbicsICdtYXN0ZXInKS5cbiAgICogVXNlZCBhcyB0aGUgYmFzZSByZWYgZm9yIGNvbXBhcmlzb25zLlxuICAgKi9cbiAgcGFyZW50QnJhbmNoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIElTTyA4NjAxIHRpbWVzdGFtcCB3aGVuIGJyYW5jaCB3YXMgYWRkZWQuXG4gICAqIENvcGllZCBmcm9tIFdvcmtzcGFjZUJyYW5jaC5hZGRlZEF0LlxuICAgKi9cbiAgYWRkZWRBdDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBicmFuY2ggc3RpbGwgZXhpc3RzIGluIGdpdCAoY29tcHV0ZWQgYXQgcmVhZCB0aW1lKS5cbiAgICogRmFsc2UgaWYgdGhlIGJyYW5jaCByZWYgaGFzIGJlZW4gZGVsZXRlZC5cbiAgICovXG4gIGV4aXN0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGJyYW5jaCB0aXAgaXMgbWVyZ2VkIGludG8gcmVxdWVzdGluZyB3b3Jrc3BhY2UgSEVBRC5cbiAgICogQ29tcHV0ZWQgYXQgcmVhZCB0aW1lLCBuZXZlciBzdG9yZWQuIE9ubHkgbWVhbmluZ2Z1bCB3aGVuIGV4aXN0cz10cnVlLlxuICAgKi9cbiAgaXNNZXJnZWQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBDb21taXQgU0hBcyByZWFjaGFibGUgZnJvbSB0aGlzIGJyYW5jaCBidXQgbm90IGZyb20gSEVBRCAoY29tcHV0ZWQgYXQgcmVhZCB0aW1lKS5cbiAgICogRW1wdHkgYXJyYXkgaWYgYnJhbmNoIGlzIGZ1bGx5IG1lcmdlZCBvciBkb2VzIG5vdCBleGlzdC5cbiAgICovXG4gIGNvbW1pdHM/OiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBSZXNwb25zZSBzaGFwZSBmb3IgR0VUIC9jYXJkcy86aWQvYnJhbmNoZXMuXG4gKlxuICogUmV0dXJucyBhbGwgdHJhY2tlZCBicmFuY2hlcyBmb3IgYSBjYXJkIHdpdGggY29tcHV0ZWQgcnVudGltZSBmaWVsZHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQnJhbmNoZXNSZXNwb25zZSB7XG4gIC8qKlxuICAgKiBMaXN0IG9mIHRyYWNrZWQgYnJhbmNoZXMgd2l0aCBjb21wdXRlZCBmaWVsZHMuXG4gICAqIFNvcnRlZCBieSBhZGRlZEF0IHRpbWVzdGFtcCAob2xkZXN0IGZpcnN0KS5cbiAgICovXG4gIGJyYW5jaGVzOiBCcmFuY2hJbmZvW107XG5cbiAgLyoqXG4gICAqIEFsbCBjYXJkLWxldmVsIGNvbW1pdCBTSEFzIGZyb20gd29ya3NwYWNlLWNvbW1pdHMuY3N2LlxuICAgKiBQcmVzZW50IHJlZ2FyZGxlc3Mgb2YgYnJhbmNoIHN0YXRlLCBzbyB0aGUgVUkgY2FuIHNob3cgY2hhbmdlc1xuICAgKiBldmVuIGFmdGVyIGFsbCB0cmFja2VkIGJyYW5jaGVzIGhhdmUgYmVlbiByZW1vdmVkLlxuICAgKi9cbiAgY29tbWl0czogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIERlZmF1bHQgYnJhbmNoIG9mIHRoZSB3b3Jrc3BhY2UgcmVwb3NpdG9yeSAoZS5nLiwgJ21haW4nLCAnbWFzdGVyJykuXG4gICAqIERldGVjdGVkIGZyb20gYHJlZnMvcmVtb3Rlcy9vcmlnaW4vSEVBRGAsIGZhbGxpbmcgYmFjayB0byBjdXJyZW50IEhFQUQgYnJhbmNoLlxuICAgKiBVc2VkIGFzIHRoZSBiYXNlIHJlZiBmb3IgY2FyZC1sZXZlbCBjb21taXRzIHdoZW4gbm8gdHJhY2tlZCBicmFuY2hlcyByZW1haW4uXG4gICAqL1xuICBkZWZhdWx0QnJhbmNoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFNIQXMgb2YgY2FyZCBjb21taXRzIHRoYXQgYXJlIGFuY2VzdG9ycyBvZiBIRUFEIGF0IHRoZSByZXF1ZXN0aW5nIHdvcmtzcGFjZS5cbiAgICogRW1wdHkgYXJyYXkgd2hlbiB3b3Jrc3BhY2VQYXRoIGlzIG5vdCBwcm92aWRlZCBvciBnaXQgb3BlcmF0aW9ucyBmYWlsIGdyYWNlZnVsbHkuXG4gICAqL1xuICBtZXJnZWRDb21taXRzOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogQnJhbmNoIG5hbWUgY2hlY2tlZCBvdXQgYXQgdGhlIHJlcXVlc3Rpbmcgd29ya3NwYWNlIChlLmcuLCBcIm1haW5cIiwgXCJmZWF0dXJlLWF1dGhcIikuXG4gICAqIFwiSEVBRFwiIHdoZW4gaW4gZGV0YWNoZWQgSEVBRCBzdGF0ZS5cbiAgICogRW1wdHkgc3RyaW5nIHdoZW4gd29ya3NwYWNlUGF0aCBpcyBub3QgcHJvdmlkZWQgb3IgZ2l0IG9wZXJhdGlvbnMgZmFpbCBncmFjZWZ1bGx5LlxuICAgKi9cbiAgaGVhZEJyYW5jaDogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJlcXVlc3QgYm9keSBmb3IgUE9TVCAvY2FyZHMvOmlkL2JyYW5jaGVzLlxuICpcbiAqIFVzZWQgdG8gYWRkIGEgbmV3IGJyYW5jaCB0byBhIGNhcmQncyB3b3Jrc3BhY2UgdHJhY2tpbmcgYmxvY2suXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWRkQnJhbmNoUmVxdWVzdCB7XG4gIC8qKlxuICAgKiBCcmFuY2ggbmFtZSB0byB0cmFjay5cbiAgICogTXVzdCBiZSBhIHZhbGlkIEdpdCByZWYgbmFtZSAobWF5IGNvbnRhaW4gc2xhc2hlcykuXG4gICAqL1xuICBuYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsIHdvcmt0cmVlIHBhdGguXG4gICAqIFNob3VsZCBiZSBhbiBhYnNvbHV0ZSBwYXRoIHRvIGEgdmFsaWQgd29ya3RyZWUgZGlyZWN0b3J5LlxuICAgKi9cbiAgd29ya3RyZWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFBhcmVudCBicmFuY2ggbmFtZSBmcm9tIHdoaWNoIHRoaXMgYnJhbmNoIHdhcyBjcmVhdGVkIChlLmcuLCAnbWFpbicsICdtYXN0ZXInKS5cbiAgICogVXNlZCBhcyB0aGUgYmFzZSByZWYgZm9yIGNvbXBhcmlzb25zLlxuICAgKi9cbiAgcGFyZW50QnJhbmNoOiBzdHJpbmc7XG59XG4iLCAiLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGVkIGFjY2VzcyB0byBDbGF1ZGUgQ29kZSdzIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgdXRpbGl0aWVzXG4gKiBmb3IgcGVyc2lzdGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICpcbiAqICMjIEVudmlyb25tZW50IFZhcmlhYmxlc1xuICpcbiAqIENsYXVkZSBDb2RlIHNldHMgdGhlc2UgZW52aXJvbm1lbnQgdmFyaWFibGVzIHdoZW4gcnVubmluZyBob29rczpcbiAqXG4gKiB8IFZhcmlhYmxlIHwgRGVzY3JpcHRpb24gfCBBdmFpbGFibGUgSW4gfFxuICogfC0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLXxcbiAqIHwgYENMQVVERV9QUk9KRUNUX0RJUmAgfCBBYnNvbHV0ZSBwYXRoIHRvIHByb2plY3Qgcm9vdCB8IEFsbCBob29rcyB8XG4gKiB8IGBDTEFVREVfRU5WX0ZJTEVgIHwgUGF0aCB0byBmaWxlIGZvciBwZXJzaXN0aW5nIGVudiB2YXJzIHwgU2Vzc2lvblN0YXJ0IG9ubHkgfFxuICogfCBgQ0xBVURFX0NPREVfUkVNT1RFYCB8IGBcInRydWVcImAgaWYgcnVubmluZyByZW1vdGVseSB8IEFsbCBob29rcyB8XG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgZ2V0UHJvamVjdERpciwgcGVyc2lzdEVudlZhciwgaXNSZW1vdGVFbnZpcm9ubWVudCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gR2V0IHByb2plY3QgZGlyZWN0b3J5XG4gKiBjb25zdCBwcm9qZWN0RGlyID0gZ2V0UHJvamVjdERpcigpO1xuICpcbiAqIC8vIENoZWNrIGlmIHJ1bm5pbmcgcmVtb3RlbHlcbiAqIGlmIChpc1JlbW90ZUVudmlyb25tZW50KCkpIHtcbiAqICAgLy8gSGFuZGxlIHJlbW90ZS1zcGVjaWZpYyBsb2dpY1xuICogfVxuICpcbiAqIC8vIEluIFNlc3Npb25TdGFydCBob29rOiBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAncHJvZHVjdGlvbicpO1xuICogcGVyc2lzdEVudlZhcignQVBJX0tFWScsICdzZWNyZXQta2V5Jyk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNob29rLWV4ZWN1dGlvbi1kZXRhaWxzXG4gKi9cbmltcG9ydCAqIGFzIGZzIGZyb20gXCJub2RlOmZzXCI7XG4vKipcbiAqIENsYXVkZSBDb2RlIGVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVzLlxuICpcbiAqIFRoZXNlIGFyZSB0aGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIHRoYXQgQ2xhdWRlIENvZGUgc2V0cyB3aGVuIHJ1bm5pbmcgaG9va3MuXG4gKi9cbmV4cG9ydCBjb25zdCBDTEFVREVfRU5WX1ZBUlMgPSB7XG4gICAgLyoqXG4gICAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgcHJvamVjdCByb290IGRpcmVjdG9yeSB3aGVyZSBDbGF1ZGUgQ29kZSB3YXMgc3RhcnRlZC5cbiAgICAgKiBBdmFpbGFibGUgaW4gYWxsIGhvb2tzLlxuICAgICAqL1xuICAgIFBST0pFQ1RfRElSOiBcIkNMQVVERV9QUk9KRUNUX0RJUlwiLFxuICAgIC8qKlxuICAgICAqIFBhdGggdG8gYSBmaWxlIHdoZXJlIFNlc3Npb25TdGFydCBob29rcyBjYW4gcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gICAgICogVmFyaWFibGVzIHdyaXR0ZW4gdG8gdGhpcyBmaWxlIHdpbGwgYmUgYXZhaWxhYmxlIGluIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMuXG4gICAgICogT25seSBhdmFpbGFibGUgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICAgICAqL1xuICAgIEVOVl9GSUxFOiBcIkNMQVVERV9FTlZfRklMRVwiLFxuICAgIC8qKlxuICAgICAqIFNldCB0byBcInRydWVcIiB3aGVuIHJ1bm5pbmcgaW4gYSByZW1vdGUgKHdlYikgZW52aXJvbm1lbnQuXG4gICAgICogTm90IHNldCBvciBlbXB0eSB3aGVuIHJ1bm5pbmcgaW4gbG9jYWwgQ0xJIGVudmlyb25tZW50LlxuICAgICAqL1xuICAgIFJFTU9URTogXCJDTEFVREVfQ09ERV9SRU1PVEVcIixcbn07XG4vKipcbiAqIEdldHMgdGhlIENsYXVkZSBDb2RlIHByb2plY3QgZGlyZWN0b3J5LlxuICpcbiAqIFRoaXMgaXMgdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHByb2plY3Qgcm9vdCB3aGVyZSBDbGF1ZGUgQ29kZSB3YXMgc3RhcnRlZC5cbiAqIFRoZSB2YWx1ZSBjb21lcyBmcm9tIHRoZSBgQ0xBVURFX1BST0pFQ1RfRElSYCBlbnZpcm9ubWVudCB2YXJpYWJsZS5cbiAqIEByZXR1cm5zIFRoZSBwcm9qZWN0IGRpcmVjdG9yeSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHByb2plY3REaXIgPSBnZXRQcm9qZWN0RGlyKCk7XG4gKiBpZiAocHJvamVjdERpcikge1xuICogICBjb25zdCBjb25maWdQYXRoID0gYCR7cHJvamVjdERpcn0vLmNsYXVkZS9jb25maWcuanNvbmA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3REaXIoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52W0NMQVVERV9FTlZfVkFSUy5QUk9KRUNUX0RJUl07XG59XG4vKipcbiAqIEdldHMgdGhlIENsYXVkZSBDb2RlIGVudiBmaWxlIHBhdGggZm9yIHBlcnNpc3RpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIFRoaXMgaXMgb25seSBhdmFpbGFibGUgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLiBUaGUgcGF0aCBwb2ludHMgdG8gYSBmaWxlXG4gKiB3aGVyZSB5b3UgY2FuIHdyaXRlIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnRzIHRvIHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiBmb3IgYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcyBpbiB0aGUgc2Vzc2lvbi5cbiAqIEByZXR1cm5zIFRoZSBlbnYgZmlsZSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldCAobm90IGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZW52RmlsZSA9IGdldEVudkZpbGVQYXRoKCk7XG4gKiBpZiAoZW52RmlsZSkge1xuICogICAvLyBXZSdyZSBpbiBhIFNlc3Npb25TdGFydCBob29rIGFuZCBjYW4gcGVyc2lzdCBlbnYgdmFyc1xuICogICBwZXJzaXN0RW52VmFyKCdNWV9WQVInLCAnbXktdmFsdWUnKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52RmlsZVBhdGgoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52W0NMQVVERV9FTlZfVkFSUy5FTlZfRklMRV07XG59XG4vKipcbiAqIENoZWNrcyBpZiB0aGUgaG9vayBpcyBydW5uaW5nIGluIGEgcmVtb3RlICh3ZWIpIGVudmlyb25tZW50LlxuICpcbiAqIFJlbW90ZSBlbnZpcm9ubWVudHMgbWF5IGhhdmUgZGlmZmVyZW50IGNhcGFiaWxpdGllcyBvciByZXN0cmljdGlvbnNcbiAqIGNvbXBhcmVkIHRvIGxvY2FsIENMSSBlbnZpcm9ubWVudHMuXG4gKiBAcmV0dXJucyB0cnVlIGlmIHJ1bm5pbmcgcmVtb3RlbHksIGZhbHNlIGlmIHJ1bm5pbmcgbG9jYWxseVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc1JlbW90ZUVudmlyb25tZW50KCkpIHtcbiAqICAgLy8gVXNlIHdlYi1jb21wYXRpYmxlIGFwcHJvYWNoZXNcbiAqIH0gZWxzZSB7XG4gKiAgIC8vIENhbiB1c2UgbG9jYWwgQ0xJIGZlYXR1cmVzXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVtb3RlRW52aXJvbm1lbnQoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52W0NMQVVERV9FTlZfVkFSUy5SRU1PVEVdID09PSBcInRydWVcIjtcbn1cbi8qKlxuICogUGVyc2lzdHMgYW4gZW52aXJvbm1lbnQgdmFyaWFibGUgZm9yIHVzZSBpbiBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB3cml0ZXMgYSBzaGVsbCBleHBvcnQgc3RhdGVtZW50IHRvIHRoZSBgQ0xBVURFX0VOVl9GSUxFYCxcbiAqIHdoaWNoIENsYXVkZSBDb2RlIHNvdXJjZXMgYmVmb3JlIHJ1bm5pbmcgYmFzaCBjb21tYW5kcy4gVGhpcyBhbGxvd3NcbiAqIFNlc3Npb25TdGFydCBob29rcyB0byBjb25maWd1cmUgdGhlIGVudmlyb25tZW50IGZvciB0aGUgZW50aXJlIHNlc3Npb24uXG4gKlxuICogKipJbXBvcnRhbnQqKjogVGhpcyBmdW5jdGlvbiBvbmx5IHdvcmtzIGluIFNlc3Npb25TdGFydCBob29rcyB3aGVyZVxuICogYENMQVVERV9FTlZfRklMRWAgaXMgc2V0LiBJbiBvdGhlciBob29rcywgaXQgd2lsbCB0aHJvdyBhbiBlcnJvci5cbiAqIEBwYXJhbSBuYW1lIC0gVGhlIGVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZSB2YWx1ZSAod2lsbCBiZSBzaGVsbC1lc2NhcGVkKVxuICogQHRocm93cyBFcnJvciBpZiBDTEFVREVfRU5WX0ZJTEUgaXMgbm90IHNldCAobm90IGluIGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvblN0YXJ0SG9vaywgc2Vzc2lvblN0YXJ0T3V0cHV0LCBwZXJzaXN0RW52VmFyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHt9LCBhc3luYyAoaW5wdXQpID0+IHtcbiAqICAgLy8gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHRoZSBzZXNzaW9uXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ3Byb2R1Y3Rpb24nKTtcbiAqICAgcGVyc2lzdEVudlZhcignQVBJX0tFWScsIHByb2Nlc3MuZW52Lk1ZX0FQSV9LRVkgPz8gJ2RlZmF1bHQnKTtcbiAqICAgcGVyc2lzdEVudlZhcignUEFUSCcsIGAke3Byb2Nlc3MuZW52LlBBVEh9Oi4vbm9kZV9tb2R1bGVzLy5iaW5gKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNwZXJzaXN0aW5nLWVudmlyb25tZW50LXZhcmlhYmxlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGVyc2lzdEVudlZhcihuYW1lLCB2YWx1ZSkge1xuICAgIGNvbnN0IGVudkZpbGUgPSBnZXRFbnZGaWxlUGF0aCgpO1xuICAgIGlmIChlbnZGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwicGVyc2lzdEVudlZhciBjYW4gb25seSBiZSB1c2VkIGluIFNlc3Npb25TdGFydCBob29rcy4gXCIgKyBcIkNMQVVERV9FTlZfRklMRSBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyBub3Qgc2V0LlwiKTtcbiAgICB9XG4gICAgLy8gU2hlbGwtZXNjYXBlIHRoZSB2YWx1ZSB0byBoYW5kbGUgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgY29uc3QgZXNjYXBlZFZhbHVlID0gZXNjYXBlU2hlbGxWYWx1ZSh2YWx1ZSk7XG4gICAgLy8gV3JpdGUgdGhlIGV4cG9ydCBzdGF0ZW1lbnRcbiAgICBjb25zdCBleHBvcnRTdGF0ZW1lbnQgPSBgZXhwb3J0ICR7bmFtZX09JHtlc2NhcGVkVmFsdWV9XFxuYDtcbiAgICBmcy5hcHBlbmRGaWxlU3luYyhlbnZGaWxlLCBleHBvcnRTdGF0ZW1lbnQsIFwidXRmLThcIik7XG59XG4vKipcbiAqIFBlcnNpc3RzIG11bHRpcGxlIGVudmlyb25tZW50IHZhcmlhYmxlcyBhdCBvbmNlLlxuICpcbiAqIFRoaXMgaXMgYSBjb252ZW5pZW5jZSB3cmFwcGVyIGFyb3VuZCBgcGVyc2lzdEVudlZhcmAgZm9yIHNldHRpbmdcbiAqIG11bHRpcGxlIHZhcmlhYmxlcyBpbiBhIHNpbmdsZSBjYWxsLlxuICogQHBhcmFtIHZhcnMgLSBPYmplY3QgbWFwcGluZyB2YXJpYWJsZSBuYW1lcyB0byB2YWx1ZXNcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0xBVURFX0VOVl9GSUxFIGlzIG5vdCBzZXQgKG5vdCBpbiBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHBlcnNpc3RFbnZWYXJzKHtcbiAqICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAqICAgQVBJX0tFWTogJ3NlY3JldCcsXG4gKiAgIERFQlVHOiAnZmFsc2UnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGVyc2lzdEVudlZhcnModmFycykge1xuICAgIGZvciAoY29uc3QgW25hbWUsIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyh2YXJzKSkge1xuICAgICAgICBwZXJzaXN0RW52VmFyKG5hbWUsIHZhbHVlKTtcbiAgICB9XG59XG4vKipcbiAqIEVzY2FwZXMgYSB2YWx1ZSBmb3Igc2FmZSB1c2UgaW4gYSBzaGVsbCBleHBvcnQgc3RhdGVtZW50LlxuICpcbiAqIFVzZXMgc2luZ2xlIHF1b3RlcyBhbmQgZXNjYXBlcyBhbnkgZW1iZWRkZWQgc2luZ2xlIHF1b3Rlcy5cbiAqIFRoaXMgcHJldmVudHMgc2hlbGwgaW5qZWN0aW9uIGFuZCBoYW5kbGVzIHNwZWNpYWwgY2hhcmFjdGVycy5cbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBlc2NhcGVcbiAqIEByZXR1cm5zIFRoZSBzaGVsbC1lc2NhcGVkIHZhbHVlICh3aXRoIHF1b3RlcylcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBlc2NhcGVTaGVsbFZhbHVlKHZhbHVlKSB7XG4gICAgLy8gVXNlIHNpbmdsZSBxdW90ZXMgYW5kIGVzY2FwZSBhbnkgZW1iZWRkZWQgc2luZ2xlIHF1b3Rlc1xuICAgIC8vICd2YWx1ZScgLT4gJ3ZhbCdcXCcndWUnIGZvciB2YWx1ZXMgY29udGFpbmluZyBzaW5nbGUgcXVvdGVzXG4gICAgY29uc3QgZXNjYXBlZCA9IHZhbHVlLnJlcGxhY2UoLycvZywgXCInXFxcXCcnXCIpO1xuICAgIHJldHVybiBgJyR7ZXNjYXBlZH0nYDtcbn1cbiIsICIvKipcbiAqIEhvb2sgZmFjdG9yeSBmdW5jdGlvbnMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGVkIGZhY3RvcnkgZnVuY3Rpb25zIGZvciBhbGwgMTIgaG9vayB0eXBlcyB0aGF0IGhhbmRsZTpcbiAqIC0gSW5wdXQgdHlwZSBuYXJyb3dpbmcgYmFzZWQgb24gaG9vayBldmVudCB0eXBlXG4gKiAtIE91dHB1dCB0eXBlIGVuZm9yY2VtZW50IHZpYSByZXR1cm4gdHlwZXNcbiAqIC0gRXJyb3Igd3JhcHBpbmcgd2l0aCBhdXRvbWF0aWMgbG9nZ2luZ1xuICogLSBMb2dnZXIgY29udGV4dCBpbmplY3Rpb25cbiAqXG4gKiBFYWNoIGZhY3RvcnkgYWNjZXB0cyBhIEhvb2tDb25maWcgd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0IHNldHRpbmdzLFxuICogYW5kIHJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHRoZSBydW50aW1lIGludm9rZXMgd2hlbiB0aGUgaG9vayBmaWxlIGV4ZWN1dGVzLlxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHByZVRvb2xVc2VIb29rLCBwcmVUb29sVXNlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEdlbmVyaWMgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgaG9vayBmYWN0b3J5IGZ1bmN0aW9uIGZvciBhIHNwZWNpZmljIGhvb2sgdHlwZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBpbnRlcm5hbCBpbXBsZW1lbnRhdGlvbiB1c2VkIGJ5IGFsbCB0eXBlZCBmYWN0b3JpZXMuXG4gKiBJdCB3cmFwcyB0aGUgaGFuZGxlciB3aXRoIGVycm9yIGNhdGNoaW5nIGFuZCBsb2dnaW5nLlxuICogQHBhcmFtIGhvb2tFdmVudE5hbWUgLSBUaGUgaG9vayBldmVudCBuYW1lXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIHdyYXBcbiAqIEByZXR1cm5zIEEgd3JhcHBlZCBob29rIGZ1bmN0aW9uXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlSG9va0Z1bmN0aW9uKGhvb2tFdmVudE5hbWUsIGNvbmZpZywgaGFuZGxlcikge1xuICAgIGNvbnN0IGhvb2tGbiA9IGFzeW5jIChpbnB1dCwgY29udGV4dCkgPT4ge1xuICAgICAgICAvLyBEZWxlZ2F0ZSBlcnJvciBoYW5kbGluZyB0byB0aGUgcnVudGltZSAtIGp1c3QgZXhlY3V0ZSB0aGUgaGFuZGxlclxuICAgICAgICAvLyBUaGUgcnVudGltZSB3aWxsIGNhdGNoIGVycm9ycywgbG9nIHRoZW0sIGFuZCByZXR1cm4gYXBwcm9wcmlhdGUgb3V0cHV0XG4gICAgICAgIHJldHVybiBhd2FpdCBoYW5kbGVyKGlucHV0LCBjb250ZXh0KTtcbiAgICB9O1xuICAgIC8vIEF0dGFjaCBtZXRhZGF0YSBmb3IgcnVudGltZSBpbnNwZWN0aW9uXG4gICAgaG9va0ZuLmhvb2tFdmVudE5hbWUgPSBob29rRXZlbnROYW1lO1xuICAgIGhvb2tGbi5tYXRjaGVyID0gY29uZmlnLm1hdGNoZXI7XG4gICAgaG9va0ZuLnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcbiAgICByZXR1cm4gaG9va0ZuO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcHJlVG9vbFVzZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlByZVRvb2xVc2VcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3RUb29sVXNlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUG9zdFRvb2xVc2VcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3RUb29sVXNlRmFpbHVyZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBvc3RUb29sVXNlRmFpbHVyZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTm90aWZpY2F0aW9uIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgTm90aWZpY2F0aW9uIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBOb3RpZmljYXRpb24gaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIHNlbmRzIGEgbm90aWZpY2F0aW9uLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEZvcndhcmQgbm90aWZpY2F0aW9ucyB0byBleHRlcm5hbCBzeXN0ZW1zXG4gKiAtIExvZyBpbXBvcnRhbnQgZXZlbnRzXG4gKiAtIFRyaWdnZXIgY3VzdG9tIGFsZXJ0aW5nXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgbm90aWZpY2F0aW9uX3R5cGVgXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbm90aWZpY2F0aW9uSG9vaywgbm90aWZpY2F0aW9uT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBGb3J3YXJkIG5vdGlmaWNhdGlvbnMgdG8gU2xhY2tcbiAqIGV4cG9ydCBkZWZhdWx0IG5vdGlmaWNhdGlvbkhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTm90aWZpY2F0aW9uIHJlY2VpdmVkJywge1xuICogICAgIHR5cGU6IGlucHV0Lm5vdGlmaWNhdGlvbl90eXBlLFxuICogICAgIHRpdGxlOiBpbnB1dC50aXRsZVxuICogICB9KTtcbiAqXG4gKiAgIGF3YWl0IHNlbmRTbGFja01lc3NhZ2UoaW5wdXQudGl0bGUgPz8gJ05vdGlmaWNhdGlvbicsIGlucHV0Lm1lc3NhZ2UpO1xuICpcbiAqICAgcmV0dXJuIG5vdGlmaWNhdGlvbk91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI25vdGlmaWNhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gbm90aWZpY2F0aW9uSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiTm90aWZpY2F0aW9uXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBVc2VyUHJvbXB0U3VibWl0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVXNlclByb21wdFN1Ym1pdCBob29rIGhhbmRsZXIuXG4gKlxuICogVXNlclByb21wdFN1Ym1pdCBob29rcyBmaXJlIHdoZW4gYSB1c2VyIHN1Ym1pdHMgYSBwcm9tcHQsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQWRkIGFkZGl0aW9uYWwgY29udGV4dCBvciBpbnN0cnVjdGlvbnNcbiAqIC0gTG9nIHVzZXIgaW50ZXJhY3Rpb25zXG4gKiAtIFZhbGlkYXRlIG9yIHRyYW5zZm9ybSBwcm9tcHRzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBwcm9tcHQgc3VibWlzc2lvbnNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyB1c2VyUHJvbXB0U3VibWl0SG9vaywgdXNlclByb21wdFN1Ym1pdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQWRkIHByb2plY3QgY29udGV4dCB0byBldmVyeSBwcm9tcHRcbiAqIGV4cG9ydCBkZWZhdWx0IHVzZXJQcm9tcHRTdWJtaXRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmRlYnVnKCdVc2VyIHByb21wdCBzdWJtaXR0ZWQnLCB7IHByb21wdExlbmd0aDogaW5wdXQucHJvbXB0Lmxlbmd0aCB9KTtcbiAqXG4gKiAgIGNvbnN0IHByb2plY3RDb250ZXh0ID0gYXdhaXQgZ2V0UHJvamVjdENvbnRleHQoKTtcbiAqXG4gKiAgIHJldHVybiB1c2VyUHJvbXB0U3VibWl0T3V0cHV0KHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogcHJvamVjdENvbnRleHRcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3VzZXJwcm9tcHRzdWJtaXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVzZXJQcm9tcHRTdWJtaXRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJVc2VyUHJvbXB0U3VibWl0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXNzaW9uU3RhcnQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXNzaW9uU3RhcnQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNlc3Npb25TdGFydCBob29rcyBmaXJlIHdoZW4gYSBDbGF1ZGUgQ29kZSBzZXNzaW9uIHN0YXJ0cyBvciByZXN0YXJ0cyxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gSW5pdGlhbGl6ZSBzZXNzaW9uIHN0YXRlXG4gKiAtIEluamVjdCBjb250ZXh0IG9yIGluc3RydWN0aW9uc1xuICogLSBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3Igc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzXG4gKiAtIFNldCB1cCBsb2dnaW5nIG9yIG1vbml0b3JpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBzb3VyY2VgICgnc3RhcnR1cCcsICdyZXN1bWUnLCAnY2xlYXInLCAnY29tcGFjdCcpXG4gKlxuICogKipDb250ZXh0Kio6IFNlc3Npb25TdGFydCBob29rcyByZWNlaXZlIGFuIGV4dGVuZGVkIGNvbnRleHQgd2l0aCBgcGVyc2lzdEVudlZhcmBcbiAqIGFuZCBgcGVyc2lzdEVudlZhcnNgIGZ1bmN0aW9ucyBmb3Igc2V0dGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvblN0YXJ0SG9vaywgc2Vzc2lvblN0YXJ0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgdGhlIHNlc3Npb25cbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soeyBtYXRjaGVyOiAnc3RhcnR1cCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciwgcGVyc2lzdEVudlZhciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdOZXcgc2Vzc2lvbiBzdGFydGVkJywge1xuICogICAgIHNlc3Npb25JZDogaW5wdXQuc2Vzc2lvbl9pZCxcbiAqICAgICBjd2Q6IGlucHV0LmN3ZFxuICogICB9KTtcbiAqXG4gKiAgIC8vIFNldCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHNcbiAqICAgcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAnZGV2ZWxvcG1lbnQnKTtcbiAqICAgcGVyc2lzdEVudlZhcignREVCVUcnLCAndHJ1ZScpO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFNldCBtdWx0aXBsZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYXQgb25jZVxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IHBlcnNpc3RFbnZWYXJzIH0pID0+IHtcbiAqICAgcGVyc2lzdEVudlZhcnMoe1xuICogICAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gKiAgICAgQVBJX0tFWTogJ3NlY3JldCcsXG4gKiAgICAgREVCVUc6ICdmYWxzZSdcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbnN0YXJ0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXNzaW9uU3RhcnRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXNzaW9uU3RhcnRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNlc3Npb25FbmQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXNzaW9uRW5kIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTZXNzaW9uRW5kIGhvb2tzIGZpcmUgd2hlbiBhIENsYXVkZSBDb2RlIHNlc3Npb24gZW5kcywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBDbGVhbiB1cCBzZXNzaW9uIHJlc291cmNlc1xuICogLSBMb2cgc2Vzc2lvbiBtZXRyaWNzXG4gKiAtIFBlcnNpc3Qgc2Vzc2lvbiBzdGF0ZVxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHJlYXNvbmAgKHRoZSBleGl0IHJlYXNvbiBzdHJpbmcpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvbkVuZEhvb2ssIHNlc3Npb25FbmRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyBzZXNzaW9uIGVuZCBhbmQgY2xlYW4gdXBcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25FbmRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Nlc3Npb24gZW5kZWQnLCB7XG4gKiAgICAgc2Vzc2lvbklkOiBpbnB1dC5zZXNzaW9uX2lkLFxuICogICAgIHJlYXNvbjogaW5wdXQucmVhc29uXG4gKiAgIH0pO1xuICpcbiAqICAgYXdhaXQgY2xlYW51cFNlc3Npb25SZXNvdXJjZXMoaW5wdXQuc2Vzc2lvbl9pZCk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvbkVuZE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Nlc3Npb25lbmRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlc3Npb25FbmRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXNzaW9uRW5kXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdG9wIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3RvcCBob29rIGhhbmRsZXIuXG4gKlxuICogU3RvcCBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgaXMgYWJvdXQgdG8gc3RvcCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBCbG9jayB0aGUgc3RvcCBhbmQgcmVxdWlyZSBhZGRpdGlvbmFsIGFjdGlvblxuICogLSBDb25maXJtIHRoZSB1c2VyIHdhbnRzIHRvIHN0b3BcbiAqIC0gQ2xlYW4gdXAgcmVzb3VyY2VzIGJlZm9yZSBzdG9wcGluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgc3RvcCBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdG9wSG9vaywgc3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQmxvY2sgc3RvcCBpZiB0aGVyZSBhcmUgcGVuZGluZyBjaGFuZ2VzXG4gKiBleHBvcnQgZGVmYXVsdCBzdG9wSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGNvbnN0IHBlbmRpbmdDaGFuZ2VzID0gYXdhaXQgY2hlY2tQZW5kaW5nQ2hhbmdlcygpO1xuICpcbiAqICAgaWYgKHBlbmRpbmdDaGFuZ2VzLmxlbmd0aCA+IDApIHtcbiAqICAgICBsb2dnZXIud2FybignQmxvY2tpbmcgc3RvcCBkdWUgdG8gcGVuZGluZyBjaGFuZ2VzJywge1xuICogICAgICAgY291bnQ6IHBlbmRpbmdDaGFuZ2VzLmxlbmd0aFxuICogICAgIH0pO1xuICpcbiAqICAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gKiAgICAgICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgICAgIHJlYXNvbjogYFRoZXJlIGFyZSAke3BlbmRpbmdDaGFuZ2VzLmxlbmd0aH0gdW5jb21taXR0ZWQgY2hhbmdlc2AsXG4gKiAgICAgICBzeXN0ZW1NZXNzYWdlOiAnUGxlYXNlIGNvbW1pdCBvciBkaXNjYXJkIGNoYW5nZXMgYmVmb3JlIHN0b3BwaW5nJ1xuICogICAgIH0pO1xuICogICB9XG4gKlxuICogICBsb2dnZXIuaW5mbygnQXBwcm92aW5nIHN0b3AnKTtcbiAqICAgcmV0dXJuIHN0b3BPdXRwdXQoeyBkZWNpc2lvbjogJ2FwcHJvdmUnIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdG9wXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3RvcFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3ViYWdlbnRTdGFydCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN1YmFnZW50U3RhcnQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN1YmFnZW50U3RhcnQgaG9va3MgZmlyZSB3aGVuIGEgc3ViYWdlbnQgKFRhc2sgdG9vbCkgc3RhcnRzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEluamVjdCBjb250ZXh0IGZvciB0aGUgc3ViYWdlbnRcbiAqIC0gTG9nIHN1YmFnZW50IGludm9jYXRpb25zXG4gKiAtIENvbmZpZ3VyZSBzdWJhZ2VudCBiZWhhdmlvclxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYGFnZW50X3R5cGVgIChlLmcuLCAnZXhwbG9yZScsICdjb2RlYmFzZS1hbmFseXNpcycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3ViYWdlbnRTdGFydEhvb2ssIHN1YmFnZW50U3RhcnRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEFkZCBjb250ZXh0IGZvciBleHBsb3JlIHN1YmFnZW50c1xuICogZXhwb3J0IGRlZmF1bHQgc3ViYWdlbnRTdGFydEhvb2soeyBtYXRjaGVyOiAnZXhwbG9yZScgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdFeHBsb3JlIHN1YmFnZW50IHN0YXJ0aW5nJywge1xuICogICAgIGFnZW50SWQ6IGlucHV0LmFnZW50X2lkLFxuICogICAgIGFnZW50VHlwZTogaW5wdXQuYWdlbnRfdHlwZVxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZvY3VzIG9uIGZpbmRpbmcgcGF0dGVybnMgYW5kIGNvbnZlbnRpb25zJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3ViYWdlbnRzdGFydFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdGFydEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN1YmFnZW50U3RhcnRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN1YmFnZW50U3RvcCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN1YmFnZW50U3RvcCBob29rIGhhbmRsZXIuXG4gKlxuICogU3ViYWdlbnRTdG9wIGhvb2tzIGZpcmUgd2hlbiBhIHN1YmFnZW50IGNvbXBsZXRlcyBvciBzdG9wcywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBCbG9jayB0aGUgc3ViYWdlbnQgZnJvbSBzdG9wcGluZ1xuICogLSBQcm9jZXNzIHN1YmFnZW50IHJlc3VsdHNcbiAqIC0gQ2xlYW4gdXAgc3ViYWdlbnQgcmVzb3VyY2VzXG4gKiAtIExvZyBzdWJhZ2VudCBjb21wbGV0aW9uXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgYWdlbnRfdHlwZWAgKGUuZy4sICdleHBsb3JlJywgJ2NvZGViYXNlLWFuYWx5c2lzJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdWJhZ2VudFN0b3BIb29rLCBzdWJhZ2VudFN0b3BPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEJsb2NrIGV4cGxvcmUgc3ViYWdlbnRzIGlmIHRhc2sgaW5jb21wbGV0ZVxuICogZXhwb3J0IGRlZmF1bHQgc3ViYWdlbnRTdG9wSG9vayh7IG1hdGNoZXI6ICdleHBsb3JlJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1N1YmFnZW50IHN0b3BwaW5nJywge1xuICogICAgIGFnZW50SWQ6IGlucHV0LmFnZW50X2lkLFxuICogICAgIGFnZW50VHlwZTogaW5wdXQuYWdlbnRfdHlwZVxuICogICB9KTtcbiAqXG4gKiAgIC8vIEJsb2NrIGlmIHRyYW5zY3JpcHQgc2hvd3MgaW5jb21wbGV0ZSB3b3JrXG4gKiAgIHJldHVybiBzdWJhZ2VudFN0b3BPdXRwdXQoe1xuICogICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICAgIHJlYXNvbjogJ1BsZWFzZSB2ZXJpZnkgZXhwbG9yYXRpb24gaXMgY29tcGxldGUnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdWJhZ2VudHN0b3BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN1YmFnZW50U3RvcEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN1YmFnZW50U3RvcFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUHJlQ29tcGFjdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFByZUNvbXBhY3QgaG9vayBoYW5kbGVyLlxuICpcbiAqIFByZUNvbXBhY3QgaG9va3MgZmlyZSBiZWZvcmUgY29udGV4dCBjb21wYWN0aW9uIG9jY3VycywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBQcmVzZXJ2ZSBpbXBvcnRhbnQgaW5mb3JtYXRpb24gYmVmb3JlIGNvbXBhY3Rpb25cbiAqIC0gTG9nIGNvbXBhY3Rpb24gZXZlbnRzXG4gKiAtIE1vZGlmeSBjdXN0b20gaW5zdHJ1Y3Rpb25zIGZvciB0aGUgY29tcGFjdGVkIGNvbnRleHRcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGB0cmlnZ2VyYCAoJ21hbnVhbCcsICdhdXRvJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwcmVDb21wYWN0SG9vaywgcHJlQ29tcGFjdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIGNvbXBhY3Rpb24gZXZlbnRzIGFuZCBwcmVzZXJ2ZSBjb250ZXh0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVDb21wYWN0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdDb250ZXh0IGNvbXBhY3Rpb24gdHJpZ2dlcmVkJywge1xuICogICAgIHRyaWdnZXI6IGlucHV0LnRyaWdnZXIsXG4gKiAgICAgaGFzQ3VzdG9tSW5zdHJ1Y3Rpb25zOiBpbnB1dC5jdXN0b21faW5zdHJ1Y3Rpb25zICE9PSBudWxsXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHByZUNvbXBhY3RPdXRwdXQoe1xuICogICAgIHN5c3RlbU1lc3NhZ2U6ICdSZW1lbWJlcjogc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCdcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIE9ubHkgaGFuZGxlIG1hbnVhbCBjb21wYWN0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVDb21wYWN0SG9vayh7IG1hdGNoZXI6ICdtYW51YWwnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTWFudWFsIGNvbXBhY3Rpb24gcmVxdWVzdGVkJyk7XG4gKiAgIHJldHVybiBwcmVDb21wYWN0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcHJlY29tcGFjdFxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJlQ29tcGFjdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlByZUNvbXBhY3RcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcm1pc3Npb25SZXF1ZXN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUGVybWlzc2lvblJlcXVlc3RcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNldHVwIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2V0dXAgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNldHVwIGhvb2tzIGZpcmUgZHVyaW5nIGluaXRpYWxpemF0aW9uIG9yIG1haW50ZW5hbmNlLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENvbmZpZ3VyZSBpbml0aWFsIHNlc3Npb24gc3RhdGVcbiAqIC0gUGVyZm9ybSBzZXR1cCB0YXNrcyBiZWZvcmUgdGhlIHNlc3Npb24gc3RhcnRzXG4gKiAtIEFkZCBjb250ZXh0IGZvciBtYWludGVuYW5jZSBvcGVyYXRpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdpbml0JyBvciAnbWFpbnRlbmFuY2UnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNldHVwSG9vaywgc2V0dXBPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEhhbmRsZSBhbGwgc2V0dXAgZXZlbnRzXG4gKiBleHBvcnQgZGVmYXVsdCBzZXR1cEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU2V0dXAgdHJpZ2dlcmVkJywgeyB0cmlnZ2VyOiBpbnB1dC50cmlnZ2VyIH0pO1xuICogICByZXR1cm4gc2V0dXBPdXRwdXQoe30pO1xuICogfSk7XG4gKlxuICogLy8gT25seSBoYW5kbGUgaW5pdGlhbGl6YXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHNldHVwSG9vayh7IG1hdGNoZXI6ICdpbml0JyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0luaXRpYWxpemluZyBzZXNzaW9uJyk7XG4gKiAgIHJldHVybiBzZXR1cE91dHB1dCh7XG4gKiAgICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1Nlc3Npb24gaW5pdGlhbGl6ZWQgd2l0aCBjdXN0b20gY29uZmlndXJhdGlvbidcbiAqICAgICB9XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXR1cFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXR1cFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGVhbW1hdGVJZGxlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVGVhbW1hdGVJZGxlIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBUZWFtbWF0ZUlkbGUgaG9va3MgZmlyZSB3aGVuIGEgdGVhbW1hdGUgaW4gYSB0ZWFtIGlzIGFib3V0IHRvIGdvIGlkbGUsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFzc2lnbiB3b3JrIHRvIGlkbGUgdGVhbW1hdGVzXG4gKiAtIExvZyB0ZWFtIGFjdGl2aXR5XG4gKiAtIENvb3JkaW5hdGUgbXVsdGktYWdlbnQgd29ya2Zsb3dzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCB0ZWFtbWF0ZSBpZGxlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHRlYW1tYXRlSWRsZUhvb2ssIHRlYW1tYXRlSWRsZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHdoZW4gdGVhbW1hdGVzIGdvIGlkbGVcbiAqIGV4cG9ydCBkZWZhdWx0IHRlYW1tYXRlSWRsZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnVGVhbW1hdGUgZ29pbmcgaWRsZScsIHtcbiAqICAgICB0ZWFtbWF0ZU5hbWU6IGlucHV0LnRlYW1tYXRlX25hbWUsXG4gKiAgICAgdGVhbU5hbWU6IGlucHV0LnRlYW1fbmFtZVxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiB0ZWFtbWF0ZUlkbGVPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN0ZWFtbWF0ZWlkbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRlYW1tYXRlSWRsZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlRlYW1tYXRlSWRsZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGFza0NvbXBsZXRlZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFRhc2tDb21wbGV0ZWQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFRhc2tDb21wbGV0ZWQgaG9va3MgZmlyZSB3aGVuIGEgdGFzayBpcyBiZWluZyBtYXJrZWQgYXMgY29tcGxldGVkLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBWZXJpZnkgdGFzayBjb21wbGV0aW9uXG4gKiAtIExvZyB0YXNrIG1ldHJpY3NcbiAqIC0gVHJpZ2dlciBmb2xsb3ctdXAgYWN0aW9uc1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgdGFzayBjb21wbGV0aW9uIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHRhc2tDb21wbGV0ZWRIb29rLCB0YXNrQ29tcGxldGVkT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgdGFzayBjb21wbGV0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCB0YXNrQ29tcGxldGVkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdUYXNrIGNvbXBsZXRlZCcsIHtcbiAqICAgICB0YXNrSWQ6IGlucHV0LnRhc2tfaWQsXG4gKiAgICAgdGFza1N1YmplY3Q6IGlucHV0LnRhc2tfc3ViamVjdFxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiB0YXNrQ29tcGxldGVkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdGFza2NvbXBsZXRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdGFza0NvbXBsZXRlZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlRhc2tDb21wbGV0ZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbiIsICIvKipcbiAqIExvZ2dlciBzeXN0ZW0gZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHN0cnVjdHVyZWQgbG9nZ2luZyB3aXRoIGV2ZW50IHN1YnNjcmlwdGlvbiBhbmQgb3B0aW9uYWwgZmlsZSBvdXRwdXQuXG4gKiBUaGUgbG9nZ2VyIGlzICoqc2lsZW50IGJ5IGRlZmF1bHQqKiB0byBhdm9pZCBpbnRlcmZlcmluZyB3aXRoIGhvb2sgcHJvdG9jb2xcbiAqIChzdGRvdXQgaXMgcmVzZXJ2ZWQgZm9yIEpTT04gcmVzcG9uc2VzLCBzdGRlcnIgbWF5IGNvbmZsaWN0IHdpdGggQ2xhdWRlIENvZGUpLlxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGxvZyBldmVudHNcbiAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICogICBjb25zb2xlLmVycm9yKGBFcnJvciBpbiAke2V2ZW50Lmhvb2tUeXBlfTogJHtldmVudC5tZXNzYWdlfWApO1xuICogfSk7XG4gKlxuICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gKiB1bnN1YnNjcmliZSgpO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuaW1wb3J0IHsgY2xvc2VTeW5jLCBleGlzdHNTeW5jLCBta2RpclN5bmMsIG9wZW5TeW5jLCB3cml0ZVN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcbi8qKlxuICogQWxsIGxvZyBsZXZlbHMgaW4gb3JkZXIgb2Ygc2V2ZXJpdHkgKGxvd2VzdCB0byBoaWdoZXN0KS5cbiAqL1xuZXhwb3J0IGNvbnN0IExPR19MRVZFTFMgPSBbXCJkZWJ1Z1wiLCBcImluZm9cIiwgXCJ3YXJuXCIsIFwiZXJyb3JcIl07XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogTG9nZ2VyIGZvciBDbGF1ZGUgQ29kZSBob29rcyB3aXRoIGV2ZW50IHN1YnNjcmlwdGlvbiBhbmQgZmlsZSBvdXRwdXQuXG4gKlxuICogIyMgS2V5IEJlaGF2aW9yc1xuICpcbiAqIHwgQ29uZmlndXJhdGlvbiB8IEJlaGF2aW9yIHxcbiAqIHwtLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tfFxuICogfCBObyBjb25maWcgKGRlZmF1bHQpIHwgKipTaWxlbnQqKiAtIG5vIG91dHB1dCBhbnl3aGVyZSB8XG4gKiB8IGBDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRWAgZW52IHZhciB8IEFwcGVuZCBKU09OIGxpbmVzIHRvIGZpbGUgfFxuICogfCBgLm9uKGxldmVsLCBoYW5kbGVyKWAgcmVnaXN0ZXJlZCB8IEV2ZW50cyBkZWxpdmVyZWQgdG8gaGFuZGxlcnMgb25seSB8XG4gKiB8IE11bHRpcGxlIGRlc3RpbmF0aW9ucyB8IEFsbCBkZXN0aW5hdGlvbnMgcmVjZWl2ZSBldmVudHMgfFxuICpcbiAqICMjIEltcG9ydGFudCBOb3Rlc1xuICpcbiAqIC0gKipOZXZlciBvdXRwdXRzIHRvIHN0ZG91dCoqIChyZXNlcnZlZCBmb3IgSlNPTiBob29rIHJlc3BvbnNlKVxuICogLSAqKk5ldmVyIG91dHB1dHMgdG8gc3RkZXJyKiogKG1heSBpbnRlcmZlcmUgd2l0aCBDbGF1ZGUgQ29kZSBlcnJvciBoYW5kbGluZylcbiAqIC0gRmlsZSBvdXRwdXQgdXNlcyBKU09OIExpbmVzIGZvcm1hdCBmb3IgZWFzeSBwYXJzaW5nXG4gKiAtIGAub24obGV2ZWwsIGhhbmRsZXIpYCByZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gZXZlbnRzIGF0IHNwZWNpZmljIGxldmVsXG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHtcbiAqICAgc2VuZEFsZXJ0KGV2ZW50Lm1lc3NhZ2UpO1xuICogfSk7XG4gKlxuICogLy8gTG9nIHdpdGhpbiBhIGhvb2sgaGFuZGxlclxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci53YXJuKCdBYm91dCB0byB2YWxpZGF0ZSBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyZWQgZXZlbnQgaGFuZGxlcnMgYnkgbG9nIGxldmVsLlxuICAgICAqL1xuICAgIGhhbmRsZXJzID0gbmV3IE1hcCgpO1xuICAgIC8qKlxuICAgICAqIEZpbGUgZGVzY3JpcHRvciBmb3IgbG9nIGZpbGUgb3V0cHV0LlxuICAgICAqIExhemlseSBpbml0aWFsaXplZCBvbiBmaXJzdCB3cml0ZS5cbiAgICAgKi9cbiAgICBsb2dGaWxlRmQgPSBudWxsO1xuICAgIC8qKlxuICAgICAqIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBpZiBjb25maWd1cmVkLlxuICAgICAqL1xuICAgIGxvZ0ZpbGVQYXRoID0gbnVsbDtcbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIGZpbGUgaW5pdGlhbGl6YXRpb24gaGFzIGJlZW4gYXR0ZW1wdGVkLlxuICAgICAqL1xuICAgIGZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICAgKi9cbiAgICBjdXJyZW50SG9va1R5cGU7XG4gICAgLyoqXG4gICAgICogQ3VycmVudCBob29rIGlucHV0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICAgKi9cbiAgICBjdXJyZW50SW5wdXQ7XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBMb2dnZXIgaW5zdGFuY2UuXG4gICAgICpcbiAgICAgKiBUeXBpY2FsbHkgeW91IHNob3VsZCB1c2UgdGhlIGV4cG9ydGVkIGBsb2dnZXJgIHNpbmdsZXRvbiByYXRoZXIgdGhhblxuICAgICAqIGNyZWF0aW5nIG5ldyBpbnN0YW5jZXMuXG4gICAgICogQHBhcmFtIGNvbmZpZyAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBVc2Ugc2luZ2xldG9uIChyZWNvbW1lbmRlZClcbiAgICAgKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICAgICAqXG4gICAgICogLy8gT3IgY3JlYXRlIGN1c3RvbSBpbnN0YW5jZVxuICAgICAqIGNvbnN0IGN1c3RvbUxvZ2dlciA9IG5ldyBMb2dnZXIoeyBsb2dGaWxlUGF0aDogJy92YXIvbG9nL2hvb2tzLmxvZycgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uZmlnID0ge30pIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBoYW5kbGVycyBtYXAgZm9yIGVhY2ggbGV2ZWxcbiAgICAgICAgZm9yIChjb25zdCBsZXZlbCBvZiBMT0dfTEVWRUxTKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZXJzLnNldChsZXZlbCwgbmV3IFNldCgpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgbG9nIGZpbGUgcGF0aCBmcm9tIGNvbmZpZyBvciBlbnZpcm9ubWVudFxuICAgICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gY29uZmlnLmxvZ0ZpbGVQYXRoID8/IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFID8/IG51bGw7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBkZXRhaWxlZCBkZWJ1Z2dpbmcgaW5mb3JtYXRpb24gdGhhdCBpcyB0eXBpY2FsbHkgb25seSB1c2VmdWxcbiAgICAgKiBkdXJpbmcgZGV2ZWxvcG1lbnQgb3IgdHJvdWJsZXNob290aW5nLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGRlYnVnIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci5kZWJ1ZygnUHJvY2Vzc2luZyB0b29sIGlucHV0JywgeyB0b29sTmFtZTogJ0Jhc2gnLCBpbnB1dFNpemU6IDI1NiB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBkZWJ1ZyhtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImRlYnVnXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGFuIGluZm8gbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZ2VuZXJhbCBvcGVyYXRpb25hbCBldmVudHMgbGlrZSBob29rIGludm9jYXRpb25zLCBzdWNjZXNzZnVsXG4gICAgICogY29tcGxldGlvbnMsIG9yIHN0YXRlIGNoYW5nZXMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgaW5mbyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuaW5mbygnU2Vzc2lvbiBzdGFydGVkJywgeyBzb3VyY2U6ICdzdGFydHVwJywgc2Vzc2lvbklkOiAnYWJjMTIzJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBpbmZvKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwiaW5mb1wiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhIHdhcm5pbmcgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgY29uZGl0aW9ucyB0aGF0IG1heSBpbmRpY2F0ZSBpc3N1ZXMgYnV0IGRvbid0IHByZXZlbnRcbiAgICAgKiBvcGVyYXRpb24sIHN1Y2ggYXMgZGVwcmVjYXRlZCBwYXR0ZXJucyBvciBwZXJmb3JtYW5jZSBjb25jZXJucy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci53YXJuKCdEZXByZWNhdGVkIGhvb2sgcGF0dGVybiBkZXRlY3RlZCcsIHsgcGF0dGVybjogJ2xlZ2FjeU1hdGNoZXInIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHdhcm4obWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJ3YXJuXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGVycm9yIGNvbmRpdGlvbnMgdGhhdCByZXF1aXJlIGF0dGVudGlvbiBidXQgd2VyZSBoYW5kbGVkXG4gICAgICogZ3JhY2VmdWxseS4gRm9yIGV4Y2VwdGlvbnMsIHByZWZlciB7QGxpbmsgbG9nRXJyb3J9LlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGVycm9yIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHZhbGlkYXRlIHRvb2wgaW5wdXQnLCB7IHRvb2xOYW1lOiAnQmFzaCcsIHJlYXNvbjogJ2VtcHR5IGNvbW1hbmQnIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGVycm9yKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwiZXJyb3JcIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIHdpdGggZnVsbCBlcnJvciBkZXRhaWxzLlxuICAgICAqXG4gICAgICogVXNlIHRoaXMgbWV0aG9kIHdoZW4gbG9nZ2luZyBjYXVnaHQgZXhjZXB0aW9ucyB0byBjYXB0dXJlIHRoZSBmdWxsXG4gICAgICogZXJyb3IgY29udGV4dCBpbmNsdWRpbmcgbmFtZSwgbWVzc2FnZSwgc3RhY2sgdHJhY2UsIGFuZCBjYXVzZSBjaGFpbi5cbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gbG9nXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGZhaWxlZFxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogdHJ5IHtcbiAgICAgKiAgIGF3YWl0IGRhbmdlcm91c09wZXJhdGlvbigpO1xuICAgICAqIH0gY2F0Y2ggKGVycikge1xuICAgICAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ0ZhaWxlZCB0byBleGVjdXRlIGRhbmdlcm91cyBvcGVyYXRpb24nLCB7XG4gICAgICogICAgIG9wZXJhdGlvbjogJ2RlbGV0ZScsXG4gICAgICogICAgIHRhcmdldDogJy9pbXBvcnRhbnQvZmlsZS50eHQnXG4gICAgICogICB9KTtcbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICovXG4gICAgbG9nRXJyb3IoZXJyb3IsIG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgY29uc3QgZXJyb3JJbmZvID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yKTtcbiAgICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGxldmVsOiBcImVycm9yXCIsXG4gICAgICAgICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgICAgICAgZXJyb3I6IGVycm9ySW5mbyxcbiAgICAgICAgICAgIGNvbnRleHQsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlcyBhIGhhbmRsZXIgdG8gbG9nIGV2ZW50cyBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgICAqXG4gICAgICogVGhlIGhhbmRsZXIgd2lsbCBiZSBjYWxsZWQgZm9yIGV2ZXJ5IGxvZyBldmVudCBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgICAqIFJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgY2FsbGVkIHdoZW4gdGhlIGhhbmRsZXJcbiAgICAgKiBpcyBubyBsb25nZXIgbmVlZGVkLlxuICAgICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBsb2cgbGV2ZWwgdG8gc3Vic2NyaWJlIHRvXG4gICAgICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGV2ZW50XG4gICAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byB1bnN1YnNjcmliZSB0aGUgaGFuZGxlclxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIFN1YnNjcmliZSB0byBlcnJvciBldmVudHNcbiAgICAgKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAgICAgKiAgIGNvbnNvbGUuZXJyb3IoYFske2V2ZW50Lmhvb2tUeXBlfV0gJHtldmVudC5tZXNzYWdlfWApO1xuICAgICAqICAgaWYgKGV2ZW50LmVycm9yKSB7XG4gICAgICogICAgIGNvbnNvbGUuZXJyb3IoZXZlbnQuZXJyb3Iuc3RhY2spO1xuICAgICAqICAgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gICAgICogdW5zdWJzY3JpYmUoKTtcbiAgICAgKiBgYGBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBGb3J3YXJkIHRvIGV4dGVybmFsIGxvZ2dpbmcgbGlicmFyeVxuICAgICAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICAgICAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKCk7XG4gICAgICpcbiAgICAgKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAgICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIG9uKGxldmVsLCBoYW5kbGVyKSB7XG4gICAgICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChsZXZlbCk7XG4gICAgICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgICAgICBsZXZlbEhhbmRsZXJzLmFkZChoYW5kbGVyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgbGV2ZWxIYW5kbGVycz8uZGVsZXRlKGhhbmRsZXIpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIGNhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGJlZm9yZSBpbnZva2luZyBob29rIGhhbmRsZXJzLlxuICAgICAqIFlvdSB0eXBpY2FsbHkgZG9uJ3QgbmVlZCB0byBjYWxsIHRoaXMgZGlyZWN0bHkuXG4gICAgICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIHR5cGUgb2YgaG9vayBiZWluZyBleGVjdXRlZFxuICAgICAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IGRhdGFcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBzZXRDb250ZXh0KGhvb2tUeXBlLCBpbnB1dCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IGhvb2tUeXBlO1xuICAgICAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IGlucHV0O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0LlxuICAgICAqXG4gICAgICogQ2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYWZ0ZXIgaG9vayBleGVjdXRpb24gY29tcGxldGVzLlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIGNsZWFyQ29udGV4dCgpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuY3VycmVudElucHV0ID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDb25maWd1cmVzIHRoZSBsb2cgZmlsZSBwYXRoIGF0IHJ1bnRpbWUuXG4gICAgICpcbiAgICAgKiBDYWxsIHRoaXMgdG8gZW5hYmxlIG9yIGNoYW5nZSBmaWxlIGxvZ2dpbmcuIFNldHRpbmcgdG8gYG51bGxgIGRpc2FibGVzXG4gICAgICogZmlsZSBsb2dnaW5nIChidXQgZG9lc24ndCBjbG9zZSBleGlzdGluZyBmaWxlIGhhbmRsZSBpbW1lZGlhdGVseSkuXG4gICAgICogQHBhcmFtIGZpbGVQYXRoIC0gUGF0aCB0byB0aGUgbG9nIGZpbGUsIG9yIG51bGwgdG8gZGlzYWJsZVxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIEVuYWJsZSBmaWxlIGxvZ2dpbmcgYXQgcnVudGltZVxuICAgICAqIGxvZ2dlci5zZXRMb2dGaWxlKCcvdmFyL2xvZy9jbGF1ZGUtaG9va3MubG9nJyk7XG4gICAgICpcbiAgICAgKiAvLyBEaXNhYmxlIGZpbGUgbG9nZ2luZ1xuICAgICAqIGxvZ2dlci5zZXRMb2dGaWxlKG51bGwpO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHNldExvZ0ZpbGUoZmlsZVBhdGgpIHtcbiAgICAgICAgLy8gQ2xvc2UgZXhpc3RpbmcgZmlsZSBpZiBvcGVuXG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlcyBhbGwgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIGxvZ2dlci5cbiAgICAgKlxuICAgICAqIENhbGwgdGhpcyBkdXJpbmcgZ3JhY2VmdWwgc2h1dGRvd24gdG8gZW5zdXJlIGFsbCBsb2cgZGF0YSBpcyBmbHVzaGVkLlxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gICAgICogICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgKiB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGVyZSBhcmUgYW55IGFjdGl2ZSBoYW5kbGVycyBvciBkZXN0aW5hdGlvbnMuXG4gICAgICpcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgYW55IGhhbmRsZXJzIGFyZSByZWdpc3RlcmVkIG9yIGZpbGUgbG9nZ2luZyBpcyBlbmFibGVkLlxuICAgICAqIEByZXR1cm5zIFdoZXRoZXIgdGhlIGxvZ2dlciBoYXMgYW55IGFjdGl2ZSBvdXRwdXQgZGVzdGluYXRpb25zXG4gICAgICovXG4gICAgaGFzRGVzdGluYXRpb25zKCkge1xuICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXJzIG9mIHRoaXMuaGFuZGxlcnMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChoYW5kbGVycy5zaXplID4gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5sb2dGaWxlUGF0aCAhPT0gbnVsbDtcbiAgICB9XG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFByaXZhdGUgTWV0aG9kc1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvKipcbiAgICAgKiBFbWl0cyBhIGxvZyBldmVudC5cbiAgICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgc2V2ZXJpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50XG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgbG9nIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dCBkYXRhXG4gICAgICovXG4gICAgZW1pdChsZXZlbCwgbWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgbGV2ZWwsXG4gICAgICAgICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgICAgICAgY29udGV4dCxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEZWxpdmVycyBhbiBldmVudCB0byBhbGwgcmVnaXN0ZXJlZCBkZXN0aW5hdGlvbnMuXG4gICAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byBkZWxpdmVyXG4gICAgICovXG4gICAgZGVsaXZlckV2ZW50KGV2ZW50KSB7XG4gICAgICAgIC8vIERlbGl2ZXIgdG8gZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGV2ZW50LmxldmVsKTtcbiAgICAgICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcihldmVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGhhbmRsZXIgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFdyaXRlIHRvIGZpbGUgaWYgY29uZmlndXJlZFxuICAgICAgICB0aGlzLndyaXRlVG9GaWxlKGV2ZW50KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogV3JpdGVzIGFuIGV2ZW50IHRvIHRoZSBsb2cgZmlsZS5cbiAgICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIHdyaXRlXG4gICAgICovXG4gICAgd3JpdGVUb0ZpbGUoZXZlbnQpIHtcbiAgICAgICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAvLyBMYXp5IGluaXRpYWxpemF0aW9uIG9mIGZpbGUgaGFuZGxlXG4gICAgICAgIGlmICghdGhpcy5maWxlSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpbGUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgPT09IG51bGwpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBsaW5lID0gYCR7SlNPTi5zdHJpbmdpZnkoZXZlbnQpfVxcbmA7XG4gICAgICAgICAgICB3cml0ZVN5bmModGhpcy5sb2dGaWxlRmQsIGxpbmUpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIHdyaXRlIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgICAgICAgLy8gVGhpcyBmb2xsb3dzIHRoZSByaXNrIG1pdGlnYXRpb246IFwiR3JhY2VmdWwgZGVncmFkYXRpb24gLSBsb2cgd3JpdGVcbiAgICAgICAgICAgIC8vIGZhaWx1cmVzIGFyZSBzaWxlbnRseSBpZ25vcmVkIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXCJcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbG9nIGZpbGUgZm9yIHdyaXRpbmcuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZpbGUoKSB7XG4gICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRW5zdXJlIGRpcmVjdG9yeSBleGlzdHNcbiAgICAgICAgICAgIGNvbnN0IGRpciA9IGRpcm5hbWUodGhpcy5sb2dGaWxlUGF0aCk7XG4gICAgICAgICAgICBpZiAoIWV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgICAgICAgICAgIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gT3BlbiBmaWxlIGZvciBhcHBlbmRpbmdcbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gb3BlblN5bmModGhpcy5sb2dGaWxlUGF0aCwgXCJhXCIpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIGluaXRpYWxpemF0aW9uIGVycm9yc1xuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIHN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb24gZnJvbSBhbiB1bmtub3duIGVycm9yLlxuICAgICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBleHRyYWN0IGluZm9ybWF0aW9uIGZyb21cbiAgICAgKiBAcmV0dXJucyBTdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgZXh0cmFjdEVycm9ySW5mbyhlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBlcnJvci5uYW1lLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgc3RhY2s6IGVycm9yLnN0YWNrLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgY2F1c2UgY2hhaW4gaWYgcHJlc2VudFxuICAgICAgICAgICAgaWYgKGVycm9yLmNhdXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpbmZvLmNhdXNlID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yLmNhdXNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpbmZvO1xuICAgICAgICB9XG4gICAgICAgIC8vIEhhbmRsZSBub24tRXJyb3IgdmFsdWVzXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiBcIlVua25vd25FcnJvclwiLFxuICAgICAgICAgICAgbWVzc2FnZTogU3RyaW5nKGVycm9yKSxcbiAgICAgICAgfTtcbiAgICB9XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTaW5nbGV0b24gRXhwb3J0XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEdsb2JhbCBsb2dnZXIgaW5zdGFuY2UgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFVzZSB0aGlzIHNpbmdsZXRvbiBmb3IgYWxsIGxvZ2dpbmcgd2l0aGluIGhvb2tzLiBUaGUgbG9nZ2VyIGlzIGNvbmZpZ3VyZWRcbiAqIHZpYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHN1cHBvcnRzIGV2ZW50IHN1YnNjcmlwdGlvbiBmb3IgY3VzdG9tXG4gKiBkZXN0aW5hdGlvbnMuXG4gKlxuICogIyMgQ29uZmlndXJhdGlvblxuICpcbiAqIHwgRW52aXJvbm1lbnQgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8XG4gKiB8LS0tLS0tLS0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18XG4gKiB8IGBDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRWAgfCBQYXRoIHRvIGxvZyBmaWxlIChKU09OIExpbmVzIGZvcm1hdCkgfFxuICpcbiAqICMjIFVzYWdlIGluIEhvb2tzXG4gKlxuICogVGhlIGxvZ2dlciBpcyBwYXNzZWQgdG8gaG9vayBoYW5kbGVycyB2aWEgY29udGV4dCBmb3IgY29udmVuaWVuY2U6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci53YXJuKCdWYWxpZGF0aW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiAjIyBFeHRlcm5hbCBJbnRlZ3JhdGlvblxuICpcbiAqIFN1YnNjcmliZSB0byBldmVudHMgdG8gZm9yd2FyZCBsb2dzIHRvIGV4dGVybmFsIHN5c3RlbXM6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICpcbiAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKHsgbGV2ZWw6ICdkZWJ1ZycgfSk7XG4gKlxuICogbG9nZ2VyLm9uKCdkZWJ1ZycsIChldmVudCkgPT4gcGlub0xvZ2dlci5kZWJ1ZyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBEaXJlY3QgdXNhZ2VcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIG9wZXJhdGlvbicpO1xuICogbG9nZ2VyLndhcm4oJ1Jlc291cmNlIGxpbWl0IGFwcHJvYWNoaW5nJywgeyB1c2FnZTogMC45IH0pO1xuICpcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IHJpc2t5T3BlcmF0aW9uKCk7XG4gKiB9IGNhdGNoIChlcnIpIHtcbiAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ1Jpc2t5IG9wZXJhdGlvbiBmYWlsZWQnKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuIiwgIi8qKlxuICogT3V0cHV0IHR5cGVzIGFuZCBidWlsZGVycyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZS1zYWZlIG91dHB1dCBidWlsZGVyIGZ1bmN0aW9ucyBmb3IgYWxsIDEyIGhvb2sgdHlwZXMuIEVhY2ggYnVpbGRlclxuICogYWNjZXB0cyBvcHRpb25zIHRoYXQgbWF0Y2ggdGhlIHdpcmUgZm9ybWF0IGV4cGVjdGVkIGJ5IENsYXVkZSBDb2RlLCB3aXRoIHR5cGVzXG4gKiBkZXJpdmVkIGZyb20gdGhlIENsYXVkZSBBZ2VudCBTREsncyBgU3luY0hvb2tKU09OT3V0cHV0YCB0eXBlLlxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKiBAbW9kdWxlXG4gKi9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4aXQgQ29kZSBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRXhpdCBjb2RlcyB1c2VkIGJ5IENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIHwgRXhpdCBDb2RlIHwgTmFtZSB8IFdoZW4gVXNlZCB8IENsYXVkZSBDb2RlIEJlaGF2aW9yIHxcbiAqIHwtLS0tLS0tLS0tLXwtLS0tLS18LS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS0tLS0tLS0tfFxuICogfCAwIHwgU3VjY2VzcyB8IEhhbmRsZXIgcmV0dXJucyBub3JtYWxseSB8IENvbnRpbnVlLCBwYXJzZSBzdGRvdXQgYXMgSlNPTiB8XG4gKiB8IDEgfCBFcnJvciB8IEludmFsaWQgaW5wdXQsIG5vbi1ibG9ja2luZyBlcnJvciB8IE5vbi1ibG9ja2luZywgc3RkZXJyIHRvIHVzZXIgb25seSB8XG4gKiB8IDIgfCBCbG9jayB8IEhhbmRsZXIgdGhyb3dzIE9SIGBzdG9wUmVhc29uYCBzZXQgfCBCbG9ja2luZywgc3RkZXJyIHNob3duIHRvIENsYXVkZSB8XG4gKi9cbmV4cG9ydCBjb25zdCBFWElUX0NPREVTID0ge1xuICAgIC8qKiBIYW5kbGVyIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuIENsYXVkZSBDb2RlIHBhcnNlcyBzdGRvdXQgYXMgSlNPTi4gKi9cbiAgICBTVUNDRVNTOiAwLFxuICAgIC8qKiBOb24tYmxvY2tpbmcgZXJyb3Igb2NjdXJyZWQgKGUuZy4sIGludmFsaWQgaW5wdXQpLiBzdGRlcnIgc2hvd24gdG8gdXNlciBvbmx5LiAqL1xuICAgIEVSUk9SOiAxLFxuICAgIC8qKiBIYW5kbGVyIHRocmV3IGV4Y2VwdGlvbiBPUiBibG9ja2luZyBhY3Rpb24gcmVxdWVzdGVkLiBzdGRlcnIgc2hvd24gdG8gQ2xhdWRlLiAqL1xuICAgIEJMT0NLOiAyLFxufTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE91dHB1dCBCdWlsZGVyIEZhY3Rvcmllc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IGhhdmUgaG9va1NwZWNpZmljT3V0cHV0IHdpdGggYSBob29rRXZlbnROYW1lIGRpc2NyaW1pbmF0b3IuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgICAgICBjb25zdCB7IGhvb2tTcGVjaWZpY091dHB1dCwgLi4ucmVzdCB9ID0gb3B0aW9ucztcbiAgICAgICAgY29uc3Qgc3Rkb3V0ID0gaG9va1NwZWNpZmljT3V0cHV0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8geyAuLi5yZXN0LCBob29rU3BlY2lmaWNPdXRwdXQ6IHsgaG9va0V2ZW50TmFtZTogaG9va1R5cGUsIC4uLmhvb2tTcGVjaWZpY091dHB1dCB9IH1cbiAgICAgICAgICAgIDogcmVzdDtcbiAgICAgICAgcmV0dXJuIHsgX3R5cGU6IGhvb2tUeXBlLCBzdGRvdXQgfTtcbiAgICB9O1xufVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IG9ubHkgdXNlIENvbW1vbk9wdGlvbnMgKHNpbXBsZSBwYXNzdGhyb3VnaCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4gKHtcbiAgICAgICAgX3R5cGU6IGhvb2tUeXBlLFxuICAgICAgICBzdGRvdXQ6IG9wdGlvbnMsXG4gICAgfSk7XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgdXNlIGRlY2lzaW9uLWJhc2VkIG9wdGlvbnMgKFN0b3AsIFN1YmFnZW50U3RvcCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiAoe1xuICAgICAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgICAgIHN0ZG91dDogb3B0aW9ucyxcbiAgICB9KTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgZXhpdC1jb2RlLWJhc2VkIGhvb2tzIChUZWFtbWF0ZUlkbGUsIFRhc2tDb21wbGV0ZWQpLlxuICpcbiAqIFRoZXNlIGhvb2tzIGRvbid0IHVzZSBKU09OIGRlY2lzaW9uIGNvbnRyb2wgKG5vIENvbW1vbk9wdGlvbnMpLlxuICogVGhlIG9ubHkgb3B0aW9uIGlzIGBzdGRlcnJgIFx1MjAxNCB3aGVuIHByZXNlbnQsIGl0IHRyaWdnZXJzIGV4aXQgY29kZSAyIChCTE9DSykuXG4gKiBTdGRvdXQgYWx3YXlzIHJlY2VpdmVzIGB7fWAgKGVtcHR5IEpTT04gb2JqZWN0KS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlRXhpdENvZGVPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuICh7IHN0ZGVyciB9ID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiB7fSxcbiAgICAgICAgLi4uKHN0ZGVyciAhPT0gdW5kZWZpbmVkID8geyBzdGRlcnIgfSA6IHt9KSxcbiAgICB9KTtcbn1cbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFByZVRvb2xVc2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFByZVRvb2xVc2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRvb2wgZXhlY3V0aW9uXG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7IHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyB9XG4gKiB9KTtcbiAqXG4gKiAvLyBEZW55IHdpdGggcmVhc29uXG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uOiAnZGVueScsXG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uUmVhc29uOiAnRGFuZ2Vyb3VzIGNvbW1hbmQgZGV0ZWN0ZWQnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEFsbG93IHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycsXG4gKiAgICAgdXBkYXRlZElucHV0OiB7IGNvbW1hbmQ6ICdscyAtbGEnIH1cbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHByZVRvb2xVc2VPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlByZVRvb2xVc2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0VG9vbFVzZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdFRvb2xVc2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGFmdGVyIGEgZmlsZSByZWFkXG4gKiBwb3N0VG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRmlsZSBjb250YWlucyBzZW5zaXRpdmUgZGF0YSdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RUb29sVXNlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQb3N0VG9vbFVzZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBvc3RUb29sVXNlRmFpbHVyZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1RyeSB1c2luZyBhIGRpZmZlcmVudCBhcHByb2FjaCdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUG9zdFRvb2xVc2VGYWlsdXJlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgVXNlclByb21wdFN1Ym1pdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVXNlclByb21wdFN1Ym1pdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdXNlclByb21wdFN1Ym1pdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnVGhpcyBwcm9qZWN0IHVzZXMgVHlwZVNjcmlwdCBzdHJpY3QgbW9kZSdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlVzZXJQcm9tcHRTdWJtaXRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXNzaW9uU3RhcnQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNlc3Npb25TdGFydE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc2Vzc2lvblN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IEpTT04uc3RyaW5naWZ5KHsgcHJvamVjdDogJ215LXByb2plY3QnIH0pXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXNzaW9uU3RhcnRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlNlc3Npb25TdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNlc3Npb25FbmQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNlc3Npb25FbmRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHNlc3Npb25FbmRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXNzaW9uRW5kT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJTZXNzaW9uRW5kXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3RvcE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGhlIHN0b3BcbiAqIHN0b3BPdXRwdXQoeyBkZWNpc2lvbjogJ2FwcHJvdmUnIH0pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggcmVhc29uXG4gKiBzdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1RoZXJlIGFyZSB1bmNvbW1pdHRlZCBjaGFuZ2VzJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN0b3BPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKFwiU3RvcFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN1YmFnZW50U3RhcnQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN1YmFnZW50U3RhcnRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZvY3VzIG9uIGZpbmRpbmcgcGF0dGVybnMnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdWJhZ2VudFN0YXJ0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJTdWJhZ2VudFN0YXJ0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3ViYWdlbnRTdG9wIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdWJhZ2VudFN0b3BPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEJsb2NrIHdpdGggcmVhc29uXG4gKiBzdWJhZ2VudFN0b3BPdXRwdXQoe1xuICogICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgcmVhc29uOiAnVGFzayBub3QgY29tcGxldGUnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3ViYWdlbnRTdG9wT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihcIlN1YmFnZW50U3RvcFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIE5vdGlmaWNhdGlvbiBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgTm90aWZpY2F0aW9uT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBZGQgY29udGV4dCBhYm91dCB0aGUgbm90aWZpY2F0aW9uXG4gKiBub3RpZmljYXRpb25PdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ05vdGlmaWNhdGlvbiBmb3J3YXJkZWQgdG8gU2xhY2sgI2FsZXJ0cyBjaGFubmVsJ1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBTdXBwcmVzcyB0aGUgbm90aWZpY2F0aW9uXG4gKiBub3RpZmljYXRpb25PdXRwdXQoeyBzdXBwcmVzc091dHB1dDogdHJ1ZSB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgbm90aWZpY2F0aW9uT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJOb3RpZmljYXRpb25cIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQcmVDb21wYWN0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQcmVDb21wYWN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwcmVDb21wYWN0T3V0cHV0KHtcbiAqICAgc3lzdGVtTWVzc2FnZTogJ1JlbWVtYmVyOiBzdHJpY3QgbW9kZSBpcyBlbmFibGVkJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHByZUNvbXBhY3RPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIlByZUNvbXBhY3RcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQZXJtaXNzaW9uUmVxdWVzdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUGVybWlzc2lvblJlcXVlc3RPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEF1dG8tYXBwcm92ZVxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjogeyBiZWhhdmlvcjogJ2FsbG93JyB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEF1dG8tYXBwcm92ZSB3aXRoIG1vZGlmaWVkIGlucHV0XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7XG4gKiAgICAgICBiZWhhdmlvcjogJ2FsbG93JyxcbiAqICAgICAgIHVwZGF0ZWRJbnB1dDogeyBmaWxlX3BhdGg6ICcvc2FmZS9wYXRoJyB9XG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBdXRvLWRlbnlcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHtcbiAqICAgICAgIGJlaGF2aW9yOiAnZGVueScsXG4gKiAgICAgICBtZXNzYWdlOiAnTm90IGFsbG93ZWQnLFxuICogICAgICAgaW50ZXJydXB0OiB0cnVlXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBGYWxsIHRocm91Z2ggdG8gbm9ybWFsIHByb21wdFxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUGVybWlzc2lvblJlcXVlc3RcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXR1cCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU2V0dXBPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGR1cmluZyBzZXR1cFxuICogc2V0dXBPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1Byb2plY3QgaW5pdGlhbGl6ZWQgd2l0aCBjdXN0b20gc2V0dGluZ3MnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFNpbXBsZSBwYXNzdGhyb3VnaFxuICogc2V0dXBPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXR1cE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU2V0dXBcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBUZWFtbWF0ZUlkbGUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFRlYW1tYXRlSWRsZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGVhbW1hdGUgdG8gZ28gaWRsZVxuICogdGVhbW1hdGVJZGxlT3V0cHV0KHt9KTtcbiAqXG4gKiAvLyBCbG9jayB3aXRoIGZlZWRiYWNrXG4gKiB0ZWFtbWF0ZUlkbGVPdXRwdXQoeyBzdGRlcnI6ICdDb250aW51ZSB3b3JraW5nOiB1bmZpbmlzaGVkIHRhc2tzIHJlbWFpbi4nIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB0ZWFtbWF0ZUlkbGVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRXhpdENvZGVPdXRwdXRCdWlsZGVyKFwiVGVhbW1hdGVJZGxlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgVGFza0NvbXBsZXRlZCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVGFza0NvbXBsZXRlZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGFzayBjb21wbGV0aW9uXG4gKiB0YXNrQ29tcGxldGVkT3V0cHV0KHt9KTtcbiAqXG4gKiAvLyBCbG9jayB3aXRoIGZlZWRiYWNrXG4gKiB0YXNrQ29tcGxldGVkT3V0cHV0KHsgc3RkZXJyOiAnQ2Fubm90IGNvbXBsZXRlOiB0ZXN0cyBhcmUgZmFpbGluZy4nIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB0YXNrQ29tcGxldGVkT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUV4aXRDb2RlT3V0cHV0QnVpbGRlcihcIlRhc2tDb21wbGV0ZWRcIik7XG4iLCAiLyoqXG4gKiBSdW50aW1lIG1vZHVsZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogSGFuZGxlcyBzdGRpbi9zdGRvdXQvZXhpdCBjb2RlIHNlbWFudGljcyBmb3IgY29tcGlsZWQgaG9vayBleGVjdXRpb24uXG4gKiBUaGlzIG1vZHVsZSBpcyB0aGUgY29yZSBvcmNoZXN0cmF0b3IgdGhhdDpcbiAqIC0gUmVhZHMgSlNPTiBmcm9tIHN0ZGluICh3aXJlIGZvcm1hdCB3aXRoIHNuYWtlX2Nhc2UgcHJvcGVydGllcylcbiAqIC0gSW52b2tlcyB0aGUgaG9vayBoYW5kbGVyXG4gKiAtIFdyaXRlcyBvdXRwdXQgdG8gc3Rkb3V0XG4gKiAtIE1hbmFnZXMgZXhpdCBjb2Rlc1xuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEluIGEgY29tcGlsZWQgaG9vayBmaWxlXG4gKiBpbXBvcnQgeyBleGVjdXRlIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL3J1bnRpbWUnO1xuICogaW1wb3J0IG15SG9vayBmcm9tICcuL215LWhvb2suanMnO1xuICpcbiAqIGV4ZWN1dGUobXlIb29rKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmltcG9ydCB7IHBlcnNpc3RFbnZWYXIsIHBlcnNpc3RFbnZWYXJzIH0gZnJvbSBcIi4vZW52LmpzXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi9sb2dnZXIuanNcIjtcbmltcG9ydCB7IEVYSVRfQ09ERVMgfSBmcm9tIFwiLi9vdXRwdXRzLmpzXCI7XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdGRpbi9TdGRvdXQgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogUmVhZHMgYWxsIGRhdGEgZnJvbSBzdGRpbi5cbiAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjb21wbGV0ZSBzdGRpbiBjb250ZW50XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlYWRTdGRpbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCBjaHVua3MgPSBbXTtcbiAgICAgICAgLy8gU2V0IGVuY29kaW5nIGZpcnN0IHRvIGVuc3VyZSBkYXRhIGV2ZW50cyByZWNlaXZlIHN0cmluZ3NcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5zZXRFbmNvZGluZyhcInV0Zi04XCIpO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHtcbiAgICAgICAgICAgIGNodW5rcy5wdXNoKGNodW5rKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2Nlc3Muc3RkaW4ub24oXCJlbmRcIiwgKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShjaHVua3Muam9pbihcIlwiKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZXJyb3JcIiwgKGVycm9yKSA9PiB7XG4gICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cbi8qKlxuICogUGFyc2VzIHN0ZGluIEpTT04gaW5wdXQuXG4gKiBAcGFyYW0gc3RkaW5Db250ZW50IC0gUmF3IHN0ZGluIGNvbnRlbnRcbiAqIEByZXR1cm5zIFBhcnNlZCBpbnB1dCAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiBAdGhyb3dzIEVycm9yIGlmIEpTT04gaXMgbWFsZm9ybWVkXG4gKi9cbmZ1bmN0aW9uIHBhcnNlU3RkaW5JbnB1dChzdGRpbkNvbnRlbnQpIHtcbiAgICAvLyBQYXJzZSBKU09OIC0gaW5wdXQgdXNlcyB3aXJlIGZvcm1hdCAoc25ha2VfY2FzZSkgZGlyZWN0bHlcbiAgICBjb25zdCByYXdJbnB1dCA9IEpTT04ucGFyc2Uoc3RkaW5Db250ZW50KTtcbiAgICByZXR1cm4gcmF3SW5wdXQ7XG59XG4vKipcbiAqIFdyaXRlcyBob29rIG91dHB1dCB0byBzdGRvdXQuXG4gKlxuICogT3V0cHV0IHVzZXMgY2FtZWxDYXNlIGtleXMgcGVyIENsYXVkZSBDb2RlIGhvb2sgc3BlY2lmaWNhdGlvbi5cbiAqIEBwYXJhbSBvdXRwdXQgLSBUaGUgaG9vayBvdXRwdXQgdG8gd3JpdGVcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNob29rLW91dHB1dC1zdHJ1Y3R1cmVcbiAqL1xuZnVuY3Rpb24gd3JpdGVTdGRvdXQob3V0cHV0KSB7XG4gICAgLy8gT3V0cHV0IHVzZXMgY2FtZWxDYXNlIC0gbm8gdHJhbnNmb3JtYXRpb24gbmVlZGVkXG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoSlNPTi5zdHJpbmdpZnkob3V0cHV0KSk7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFcnJvciBIYW5kbGluZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIGVycm9yIG91dHB1dCBmb3IgbWFsZm9ybWVkIHN0ZGluIEpTT04uXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgcGFyc2UgZXJyb3JcbiAqIEByZXR1cm5zIEhvb2tPdXRwdXQgd2l0aCBlbXB0eSBzdGRvdXRcbiAqL1xuZnVuY3Rpb24gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpIHtcbiAgICBsb2dnZXIuZXJyb3IoYEludmFsaWQgSlNPTiBpbnB1dDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgcmV0dXJuIHsgc3Rkb3V0OiB7fSB9O1xufVxuLyoqXG4gKiBXcml0ZXMgaGFuZGxlciBlcnJvciBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdHMgd2l0aCBjb2RlIDIuXG4gKlxuICogV2hlbiBhIGhvb2sgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uOlxuICogLSBTdGFja3RyYWNlICh3aXRoIHNvdXJjZW1hcHMgaWYgYXZhaWxhYmxlKSBpcyBvdXRwdXQgdG8gc3RkZXJyXG4gKiAtIFByb2Nlc3MgZXhpdHMgd2l0aCBjb2RlIDIgKEJMT0NLKVxuICogLSBObyBKU09OIGlzIG91dHB1dCB0byBzdGRvdXRcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0aHJvd24gYnkgdGhlIGhhbmRsZXJcbiAqL1xuZnVuY3Rpb24gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKSB7XG4gICAgLy8gV3JpdGUgc3RhY2sgdHJhY2UgdG8gc3RkZXJyIChzb3VyY2VtYXBzIGFyZSBhcHBsaWVkIGF1dG9tYXRpY2FsbHkgYnkgTm9kZS5qcylcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlfVxcbmApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7U3RyaW5nKGVycm9yKX1cXG5gKTtcbiAgICB9XG4gICAgLy8gTG9nIHRvIGZpbGUgaWYgY29uZmlndXJlZFxuICAgIGxvZ2dlci5lcnJvcihgSG9vayBoYW5kbGVyIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAvLyBDbGVhciBsb2dnZXIgY29udGV4dCBhbmQgY2xvc2VcbiAgICBsb2dnZXIuY2xlYXJDb250ZXh0KCk7XG4gICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgLy8gRXhpdCB3aXRoIGNvZGUgMiAoQkxPQ0spIC0gbm8gSlNPTiBvdXRwdXRcbiAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5CTE9DSyk7XG59XG4vKipcbiAqIENvbnZlcnRzIGEgU3BlY2lmaWNIb29rT3V0cHV0IHRvIEhvb2tPdXRwdXQgZm9yIHdpcmUgZm9ybWF0LlxuICpcbiAqIFNwZWNpZmljSG9va091dHB1dCB0eXBlcyBoYXZlOiB7IF90eXBlLCBzdGRvdXQsIHN0ZGVycj8gfVxuICogSG9va091dHB1dCBoYXM6IHsgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqXG4gKiBTaW5jZSBvdXRwdXQgYnVpbGRlcnMgbm93IHByb2R1Y2Ugd2lyZS1mb3JtYXQgZGlyZWN0bHksIHRoaXMgZnVuY3Rpb25cbiAqIHNpbXBseSBzdHJpcHMgdGhlIGBfdHlwZWAgZGlzY3JpbWluYXRvciBmaWVsZC5cbiAqIEBwYXJhbSBzcGVjaWZpY091dHB1dCAtIFRoZSBzcGVjaWZpYyBvdXRwdXQgZnJvbSBhIGhvb2sgaGFuZGxlclxuICogQHJldHVybnMgSG9va091dHB1dCByZWFkeSBmb3Igc2VyaWFsaXphdGlvblxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gcHJlVG9vbFVzZU91dHB1dCh7IGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfSB9KTtcbiAqIGNvbnN0IGhvb2tPdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAqIC8vIGhvb2tPdXRwdXQ6IHsgc3Rkb3V0OiB7IGhvb2tTcGVjaWZpY091dHB1dDogeyAuLi4gfSB9IH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFRvSG9va091dHB1dChzcGVjaWZpY091dHB1dCkge1xuICAgIGNvbnN0IHsgc3Rkb3V0LCBzdGRlcnIgfSA9IHNwZWNpZmljT3V0cHV0O1xuICAgIHJldHVybiBzdGRlcnIgIT09IHVuZGVmaW5lZCA/IHsgc3Rkb3V0LCBzdGRlcnIgfSA6IHsgc3Rkb3V0IH07XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGVjdXRlIEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEV4ZWN1dGVzIGEgaG9vayBoYW5kbGVyIHdpdGggZnVsbCBydW50aW1lIG9yY2hlc3RyYXRpb24uXG4gKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeSBwb2ludCB0aGF0IGNvbXBpbGVkIGhvb2tzIHVzZS4gV2hlbiBhIGNvbXBpbGVkIGhvb2tcbiAqIHJ1bnMgYXMgYSBDTEk6XG4gKlxuICogMS4gUmVhZHMgYWxsIHN0ZGluXG4gKiAyLiBQYXJzZXMgSlNPTiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAzLiBTZXRzIHVwIGxvZ2dlciBjb250ZXh0IChob29rVHlwZSwgaW5wdXQpXG4gKiA0LiBDYWxscyBoYW5kbGVyIHdpdGggaW5wdXQgYW5kIGNvbnRleHQgKGxvZ2dlcilcbiAqIDUuIEhhbmRsZXMgYW55IGVycm9ycywgbG9ncyB0aGVtXG4gKiA2LiBXcml0ZXMgSlNPTiB0byBzdGRvdXRcbiAqIDcuIENsb3NlcyBsb2dnZXJcbiAqIDguIEV4aXRzIHdpdGggYXBwcm9wcmlhdGUgY29kZVxuICogQHBhcmFtIGhvb2tGbiAtIFRoZSBob29rIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgKGZyb20gaG9vayBmYWN0b3J5KVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEluIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCB7IHByZVRvb2xVc2VIb29rLCBwcmVUb29sVXNlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBjb25zdCBteUhvb2sgPSBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShob29rRm4pIHtcbiAgICBsZXQgb3V0cHV0O1xuICAgIHRyeSB7XG4gICAgICAgIC8vIENoZWNrIGZvciBsb2cgZmlsZSBjb25maWd1cmF0aW9uIGNvbmZsaWN0c1xuICAgICAgICAvLyBDTEFVREVfQ09ERV9IT09LU19DTElfTE9HX0ZJTEUgaXMgaW5qZWN0ZWQgYnkgdGhlIENMSSAtLWxvZyBwYXJhbWV0ZXJcbiAgICAgICAgLy8gQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEUgaXMgdGhlIHVzZXIncyBlbnZpcm9ubWVudCB2YXJpYWJsZVxuICAgICAgICBjb25zdCBjbGlMb2dGaWxlID0gcHJvY2Vzcy5lbnYuQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFO1xuICAgICAgICBjb25zdCBlbnZMb2dGaWxlID0gcHJvY2Vzcy5lbnYuQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEU7XG4gICAgICAgIGlmIChjbGlMb2dGaWxlICE9PSB1bmRlZmluZWQgJiYgZW52TG9nRmlsZSAhPT0gdW5kZWZpbmVkICYmIGNsaUxvZ0ZpbGUgIT09IGVudkxvZ0ZpbGUpIHtcbiAgICAgICAgICAgIC8vIFdyaXRlIGVycm9yIHRvIHN0ZGVyciBhbmQgZXhpdCB3aXRoIGVycm9yIGNvZGVcbiAgICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBMb2cgZmlsZSBjb25maWd1cmF0aW9uIGNvbmZsaWN0OiBDTEkgLS1sb2c9XCIke2NsaUxvZ0ZpbGV9XCIgdnMgQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEU9XCIke2VudkxvZ0ZpbGV9XCIuIGAgK1xuICAgICAgICAgICAgICAgIFwiVXNlIG9ubHkgb25lIG1ldGhvZCB0byBjb25maWd1cmUgaG9vayBsb2dnaW5nLlxcblwiKTtcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiBDTEkgbG9nIGZpbGUgaXMgc2V0LCBjb25maWd1cmUgdGhlIGxvZ2dlclxuICAgICAgICBpZiAoY2xpTG9nRmlsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsb2dnZXIuc2V0TG9nRmlsZShjbGlMb2dGaWxlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBSZWFkIGFuZCBwYXJzZSBzdGRpblxuICAgICAgICBsZXQgc3RkaW5Db250ZW50O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc3RkaW5Db250ZW50ID0gYXdhaXQgcmVhZFN0ZGluKCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIubG9nRXJyb3IoZXJyb3IsIFwiRmFpbGVkIHRvIHJlYWQgc3RkaW5cIik7XG4gICAgICAgICAgICBvdXRwdXQgPSBjcmVhdGVNYWxmb3JtZWRJbnB1dE91dHB1dChlcnJvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gUGFyc2UgYW5kIHRyYW5zZm9ybSBpbnB1dFxuICAgICAgICBsZXQgaW5wdXQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpbnB1dCA9IHBhcnNlU3RkaW5JbnB1dChzdGRpbkNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVycm9yLCBcIkZhaWxlZCB0byBwYXJzZSBzdGRpbiBKU09OXCIpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNldCBsb2dnZXIgY29udGV4dFxuICAgICAgICBjb25zdCBob29rRXZlbnROYW1lID0gaG9va0ZuLmhvb2tFdmVudE5hbWU7XG4gICAgICAgIGxvZ2dlci5zZXRDb250ZXh0KGhvb2tFdmVudE5hbWUsIGlucHV0KTtcbiAgICAgICAgLy8gQnVpbGQgY29udGV4dCAtIFNlc3Npb25TdGFydCBob29rcyBnZXQgZXh0ZW5kZWQgY29udGV4dCB3aXRoIHBlcnNpc3RFbnZWYXJcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGhvb2tFdmVudE5hbWUgPT09IFwiU2Vzc2lvblN0YXJ0XCIgPyB7IGxvZ2dlciwgcGVyc2lzdEVudlZhciwgcGVyc2lzdEVudlZhcnMgfSA6IHsgbG9nZ2VyIH07XG4gICAgICAgIC8vIEV4ZWN1dGUgaGFuZGxlclxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc3BlY2lmaWNPdXRwdXQgPSBhd2FpdCBob29rRm4oaW5wdXQsIGNvbnRleHQpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY29udmVydFRvSG9va091dHB1dChzcGVjaWZpY091dHB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBIYW5kbGVyIHRocmV3IC0gb3V0cHV0IHN0YWNrdHJhY2UgdG8gc3RkZXJyIGFuZCBleGl0IHdpdGggY29kZSAyXG4gICAgICAgICAgICAvLyBUaGlzIGNhbGwgbmV2ZXIgcmV0dXJucyAocHJvY2Vzcy5leGl0KVxuICAgICAgICAgICAgaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmaW5hbGx5IHtcbiAgICAgICAgLy8gV3JpdGUgb3V0cHV0IGlmIHdlIGhhdmUgaXRcbiAgICAgICAgaWYgKG91dHB1dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB3cml0ZVN0ZG91dChvdXRwdXQuc3Rkb3V0KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBDbGVhbiB1cCBsb2dnZXIgKHNpbmdsZSBjbGVhbnVwIHBhdGgpXG4gICAgICAgIGxvZ2dlci5jbGVhckNvbnRleHQoKTtcbiAgICAgICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgICAgIC8vIEV4aXQtY29kZSBCTE9DSzogdW5saWtlIGhhbmRsZXIgdGhyb3cgKG5vIHN0ZG91dCksIHRoaXMgcGF0aCBzdGlsbCB3cml0ZXNcbiAgICAgICAgLy8gc3RydWN0dXJlZCBKU09OIHRvIHN0ZG91dCAoYXMgZW1wdHkge30pIGFsb25nc2lkZSB0aGUgc3RkZXJyIG1lc3NhZ2UuXG4gICAgICAgIC8vIFRoZSBjYWxsZXIgY29udHJvbHMgc3RkZXJyIGZvcm1hdHRpbmcgKG5vIGFwcGVuZGVkIG5ld2xpbmUpLlxuICAgICAgICBpZiAob3V0cHV0Py5zdGRlcnIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUob3V0cHV0LnN0ZGVycik7XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5CTE9DSyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRXhpdCB3aXRoIHN1Y2Nlc3MgKGhhbmRsZXIgZXJyb3JzIGV4aXQgdmlhIGhhbmRsZUhhbmRsZXJFcnJvciB3aXRoIGNvZGUgMilcbiAgICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfVxufVxuIiwgInByb2Nlc3MuZW52WydDTEFVREVfQ09ERV9IT09LU19DTElfTE9HX0ZJTEUnXSA9IFwiL3dvcmtzcGFjZS8ud29ya3RyZWVzL2NhcmRzL21haW4tOTMvMi8uY2FyZHMvbG9ncy9jbGF1ZGUtY29kZS1jYXJkcy1ydW50aW1lLWhvb2tzLmxvZ1wiO1xuXG5pbXBvcnQgaG9vayBmcm9tICcuL3N0b3AudHMnO1xuaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9ydW50aW1lLmpzJztcblxuZXhlY3V0ZShob29rKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7O0FBaUJBLFNBQVMsb0JBQW9COzs7QUNQN0IsU0FBUyxnQkFBZ0I7QUFDekIsU0FBUyxlQUFlO0FBQ3hCLFNBQVMsWUFBWTs7O0FDQ3JCLFNBQVMsV0FBVyxXQUFXLFVBQVUsY0FBYyxZQUFZLFlBQVkscUJBQXFCO0FBQ3BHLFNBQVMsZUFBZTs7O0FDT2pCLFNBQVMsZUFBZSxLQUFzQjtBQUNuRCxNQUFJO0FBQ0YsWUFBUSxLQUFLLEtBQUssQ0FBQztBQUNuQixXQUFPO0FBQUEsRUFDVCxTQUFTLE9BQU87QUFDZCxRQUFJLGlCQUFpQixTQUFTLFVBQVUsT0FBTztBQUM3QyxZQUFNLE9BQVEsTUFBZ0M7QUFDOUMsVUFBSSxTQUFTLFFBQVMsUUFBTztBQUM3QixVQUFJLFNBQVMsUUFBUyxRQUFPO0FBQUEsSUFDL0I7QUFDQSxVQUFNO0FBQUEsRUFDUjtBQUNGOzs7QURSTyxTQUFTLE1BQU0sSUFBMkI7QUFDL0MsU0FBTyxJQUFJLFFBQVEsQ0FBQyxZQUFZLFdBQVcsU0FBUyxFQUFFLENBQUM7QUFDekQ7QUFVTyxTQUFTLGFBQWEsT0FBZ0IsTUFBdUI7QUFDbEUsU0FBTyxpQkFBaUIsU0FBUyxVQUFVLFNBQVUsTUFBZ0MsU0FBUztBQUNoRztBQVdPLFNBQVMsbUJBQW1CLFVBQTJCO0FBQzVELE1BQUk7QUFDRixVQUFNLGNBQWMsYUFBYSxVQUFVLE9BQU87QUFDbEQsVUFBTSxZQUFZLE9BQU8sU0FBUyxZQUFZLEtBQUssR0FBRyxFQUFFO0FBRXhELFFBQUksQ0FBQyxPQUFPLE1BQU0sU0FBUyxLQUFLLENBQUMsZUFBZSxTQUFTLEdBQUc7QUFFMUQsVUFBSSxhQUFhLFVBQVUsT0FBTyxNQUFNLGFBQWE7QUFDbkQsbUJBQVcsUUFBUTtBQUNuQixlQUFPO0FBQUEsTUFDVDtBQUFBLElBQ0Y7QUFBQSxFQUNGLFFBQVE7QUFDTixRQUFJO0FBQ0YsaUJBQVcsUUFBUTtBQUNuQixhQUFPO0FBQUEsSUFDVCxRQUFRO0FBQUEsSUFFUjtBQUFBLEVBQ0Y7QUFFQSxTQUFPO0FBQ1Q7QUFVTyxTQUFTLG1CQUFtQixVQUF3QjtBQUN6RCxRQUFNLEtBQUssU0FBUyxVQUFVLE1BQU0sR0FBSztBQUN6QyxNQUFJO0FBQ0Ysa0JBQWMsSUFBSSxPQUFPLFFBQVEsR0FBRyxDQUFDO0FBQUEsRUFDdkMsVUFBRTtBQUNBLGNBQVUsRUFBRTtBQUFBLEVBQ2Q7QUFDRjtBQVlBLGVBQXNCLFlBQVksVUFBa0IsV0FBa0M7QUFDcEYsUUFBTSxZQUFZLEtBQUssSUFBSTtBQUMzQixRQUFNLE1BQU0sUUFBUSxRQUFRO0FBRTVCLFNBQU8sS0FBSyxJQUFJLElBQUksWUFBWSxXQUFXO0FBQ3pDLFFBQUk7QUFDRixnQkFBVSxLQUFLLEVBQUUsV0FBVyxNQUFNLE1BQU0sSUFBTSxDQUFDO0FBQy9DLHlCQUFtQixRQUFRO0FBQzNCO0FBQUEsSUFDRixTQUFTLE9BQU87QUFDZCxVQUFJLENBQUMsYUFBYSxPQUFPLFFBQVEsRUFBRyxPQUFNO0FBQzFDLFVBQUksbUJBQW1CLFFBQVEsRUFBRztBQUVsQyxZQUFNLFlBQVksYUFBYSxLQUFLLElBQUksSUFBSTtBQUM1QyxVQUFJLFlBQVksR0FBRztBQUNqQixjQUFNLE1BQU0sS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDO0FBQUEsTUFDckM7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUVBLFFBQU0sSUFBSSxNQUFNLDBCQUEwQjtBQUM1QztBQVdPLFNBQVMsWUFBWSxVQUF3QjtBQUNsRCxNQUFJO0FBQ0YsZUFBVyxRQUFRO0FBQUEsRUFDckIsU0FBUyxPQUFPO0FBQ2QsUUFBSSxDQUFDLGFBQWEsT0FBTyxRQUFRLEVBQUcsT0FBTTtBQUFBLEVBQzVDO0FBQ0Y7QUE4RE8sU0FBUyxhQUFnQixNQUFjLGNBQW9CO0FBQ2hFLE1BQUk7QUFDRixVQUFNLFVBQVUsYUFBYSxNQUFNLE9BQU87QUFDMUMsV0FBTyxLQUFLLE1BQU0sT0FBTztBQUFBLEVBQzNCLFNBQVMsT0FBTztBQUNkLFFBQUksYUFBYSxPQUFPLFFBQVEsRUFBRyxRQUFPO0FBQzFDLFVBQU07QUFBQSxFQUNSO0FBQ0Y7QUFZTyxTQUFTLG9CQUF1QixVQUFhLGNBQTRCO0FBQzlFLFFBQU0sTUFBTSxRQUFRLFlBQVk7QUFDaEMsWUFBVSxLQUFLLEVBQUUsV0FBVyxNQUFNLE1BQU0sSUFBTSxDQUFDO0FBQy9DLFFBQU0sV0FBVyxHQUFHLFlBQVk7QUFDaEMsTUFBSTtBQUNGLGtCQUFjLFVBQVUsS0FBSyxVQUFVLFVBQVUsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLElBQU0sQ0FBQztBQUMxRSxlQUFXLFVBQVUsWUFBWTtBQUFBLEVBQ25DLFNBQVMsT0FBTztBQUNkLFFBQUk7QUFDRixpQkFBVyxRQUFRO0FBQUEsSUFDckIsUUFBUTtBQUFBLElBRVI7QUFDQSxVQUFNO0FBQUEsRUFDUjtBQUNGO0FBb0JBLGVBQXNCLG1CQUNwQixjQUNBLFVBQ0EsV0FDQSxRQUNBLGlCQUNBLGVBQ2tCO0FBQ2xCLFFBQU0sWUFBWSxVQUFVLGlCQUFpQixHQUFJO0FBQ2pELE1BQUk7QUFDRixVQUFNLFdBQVcsYUFBd0IsY0FBYyxlQUE0QjtBQUNuRixRQUFJLE9BQVEsUUFBTyxRQUFRO0FBQzNCLFVBQU0sU0FBUyxVQUFVLFFBQVE7QUFDakMsd0JBQW9CLFVBQVUsWUFBWTtBQUMxQyxXQUFPO0FBQUEsRUFDVCxVQUFFO0FBQ0EsZ0JBQVksUUFBUTtBQUFBLEVBQ3RCO0FBQ0Y7OztBRTFRQSxTQUFTLGdCQUFnQjtBQUdsQixJQUFNLHlCQUF5QjtBQWdCdEMsSUFBTSxzQkFBc0I7QUFhNUIsU0FBUyxTQUFTLEtBQXNCO0FBQ3RDLE1BQUk7QUFDRixVQUFNLE9BQU8sU0FBUyxTQUFTLEdBQUcsYUFBYSxFQUFFLFVBQVUsT0FBTyxDQUFDLEVBQUUsS0FBSztBQUMxRSxXQUFPLG9CQUFvQixLQUFLLElBQUk7QUFBQSxFQUN0QyxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQVdBLFNBQVMsYUFBYSxLQUE0QjtBQUNoRCxNQUFJO0FBQ0YsVUFBTSxVQUFVLFNBQVMsU0FBUyxHQUFHLGFBQWEsRUFBRSxVQUFVLE9BQU8sQ0FBQyxFQUFFLEtBQUs7QUFDN0UsVUFBTSxZQUFZLE9BQU8sU0FBUyxTQUFTLEVBQUU7QUFDN0MsUUFBSSxPQUFPLE1BQU0sU0FBUyxLQUFLLGNBQWMsSUFBSyxRQUFPO0FBQ3pELFdBQU87QUFBQSxFQUNULFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBV08sU0FBUyxjQUFjLFVBQWtDO0FBQzlELFFBQU0sT0FBTyxrQkFBa0IsUUFBUTtBQUN2QyxTQUFPLEtBQUssQ0FBQyxLQUFLO0FBQ3BCO0FBZ0JPLFNBQVMsa0JBQWtCLFVBQTZCO0FBQzdELFFBQU0sVUFBb0IsQ0FBQztBQUMzQixNQUFJLE1BQU0sWUFBWSxRQUFRO0FBRTlCLFdBQVMsUUFBUSxHQUFHLFFBQVEsd0JBQXdCLFNBQVM7QUFDM0QsUUFBSSxPQUFPLEVBQUc7QUFFZCxRQUFJLFNBQVMsR0FBRyxHQUFHO0FBQ2pCLGNBQVEsS0FBSyxHQUFHO0FBQUEsSUFDbEI7QUFFQSxVQUFNLFlBQVksYUFBYSxHQUFHO0FBQ2xDLFFBQUksY0FBYyxLQUFNO0FBQ3hCLFVBQU07QUFBQSxFQUNSO0FBRUEsU0FBTztBQUNUOzs7QUhqR0EsU0FBUyxjQUFzQjtBQUM3QixTQUFPLEtBQUssUUFBUSxHQUFHLFFBQVE7QUFDakM7QUFvQk8sSUFBTSxrQkFBa0I7QUFDeEIsSUFBTSxtQkFBbUIsS0FBSyxLQUFLLEtBQUs7QUFrSi9DLFNBQVMsOEJBQXNDO0FBQzdDLFNBQU8sS0FBSyxZQUFZLEdBQUcscUJBQXFCLFdBQVc7QUFDN0Q7QUFFQSxTQUFTLDBCQUFrQztBQUN6QyxTQUFPLEtBQUssWUFBWSxHQUFHLHFCQUFxQixXQUFXO0FBQzdEO0FBNkJBLGVBQXNCLGlCQUFpQixLQUE0QjtBQUNqRSxRQUFNO0FBQUEsSUFDSiw0QkFBNEI7QUFBQSxJQUM1Qix3QkFBd0I7QUFBQSxJQUN4QixDQUFDLGFBQWE7QUFDWixhQUFPLFNBQVMsU0FBUyxPQUFPLEdBQUcsQ0FBQztBQUFBLElBQ3RDO0FBQUEsSUFDQTtBQUFBLElBQ0EsRUFBRSxVQUFVLENBQUMsRUFBRTtBQUFBLElBQ2Y7QUFBQSxFQUNGO0FBQ0Y7OztBSXZOQSxTQUFTLGdCQUFnQixhQUFBQSxZQUFXLGdCQUFBQyxlQUFjLGNBQUFDLGFBQVksaUJBQUFDLHNCQUFxQjtBQUNuRixTQUFTLFdBQUFDLGdCQUFlO0FBQ3hCLFNBQVMsUUFBQUMsYUFBWTtBQUdyQixJQUFNQyxtQkFBa0I7QUFNeEIsU0FBUyx3QkFBZ0M7QUFDdkMsU0FBT0MsTUFBS0MsU0FBUSxHQUFHLFVBQVUsbUJBQW1CO0FBQ3REO0FBRUEsU0FBUyxrQkFBa0IsV0FBMkI7QUFDcEQsU0FBT0QsTUFBSyxzQkFBc0IsR0FBRyxHQUFHLFNBQVMsTUFBTTtBQUN6RDtBQUVBLFNBQVMsc0JBQXNCLFdBQTJCO0FBQ3hELFNBQU9BLE1BQUssc0JBQXNCLEdBQUcsR0FBRyxTQUFTLFdBQVc7QUFDOUQ7QUFFQSxTQUFTLHNCQUFzQixXQUEyQjtBQUN4RCxTQUFPQSxNQUFLLHNCQUFzQixHQUFHLEdBQUcsU0FBUyxPQUFPO0FBQzFEO0FBa0JBLGVBQXNCLHNCQUFzQixXQUFtQixLQUE0QjtBQUN6RixFQUFBRSxXQUFVLHNCQUFzQixHQUFHLEVBQUUsV0FBVyxNQUFNLE1BQU0sSUFBTSxDQUFDO0FBRW5FLFFBQU0sY0FBYyxzQkFBc0IsU0FBUztBQUNuRCxRQUFNLFlBQVksYUFBYUgsZ0JBQWU7QUFFOUMsTUFBSTtBQUNGLFVBQU0sVUFBVSxrQkFBa0IsU0FBUztBQUMzQyxVQUFNLGtCQUFrQixrQkFBa0IsU0FBUztBQUVuRCxRQUFJLENBQUMsZ0JBQWdCLFNBQVMsR0FBRyxHQUFHO0FBQ2xDLHFCQUFlLFNBQVMsR0FBRyxHQUFHO0FBQUEsR0FBTSxFQUFFLE1BQU0sSUFBTSxDQUFDO0FBQUEsSUFDckQ7QUFBQSxFQUNGLFVBQUU7QUFDQSxnQkFBWSxXQUFXO0FBQUEsRUFDekI7QUFDRjtBQVVPLFNBQVMsa0JBQWtCLFdBQTZCO0FBQzdELE1BQUk7QUFDRixVQUFNLFVBQVUsa0JBQWtCLFNBQVM7QUFDM0MsVUFBTSxVQUFVSSxjQUFhLFNBQVMsT0FBTztBQUM3QyxXQUFPLFFBQ0osTUFBTSxJQUFJLEVBQ1YsSUFBSSxDQUFDLFNBQVMsS0FBSyxLQUFLLENBQUMsRUFDekIsT0FBTyxDQUFDLFNBQVMsS0FBSyxTQUFTLENBQUM7QUFBQSxFQUNyQyxTQUFTLE9BQU87QUFDZCxRQUFJLGFBQWEsT0FBTyxRQUFRLEVBQUcsUUFBTyxDQUFDO0FBQzNDLFVBQU07QUFBQSxFQUNSO0FBQ0Y7QUFTTyxTQUFTLGlCQUFpQixXQUF5QjtBQUN4RCxRQUFNLFVBQVUsa0JBQWtCLFNBQVM7QUFDM0MsUUFBTSxjQUFjLHNCQUFzQixTQUFTO0FBRW5ELE1BQUk7QUFDRixJQUFBQyxZQUFXLE9BQU87QUFBQSxFQUNwQixTQUFTLE9BQU87QUFDZCxRQUFJLENBQUMsYUFBYSxPQUFPLFFBQVEsRUFBRyxPQUFNO0FBQUEsRUFDNUM7QUFFQSxNQUFJO0FBQ0YsSUFBQUEsWUFBVyxXQUFXO0FBQUEsRUFDeEIsU0FBUyxPQUFPO0FBQ2QsUUFBSSxDQUFDLGFBQWEsT0FBTyxRQUFRLEVBQUcsT0FBTTtBQUFBLEVBQzVDO0FBQ0Y7QUFzQk8sU0FBUyxtQkFBbUIsV0FBa0M7QUFDbkUsTUFBSTtBQUNGLFdBQU9DLGNBQWEsc0JBQXNCLFNBQVMsR0FBRyxPQUFPLEVBQUUsS0FBSztBQUFBLEVBQ3RFLFNBQVMsT0FBTztBQUNkLFFBQUksYUFBYSxPQUFPLFFBQVEsRUFBRyxRQUFPO0FBQzFDLFVBQU07QUFBQSxFQUNSO0FBQ0Y7QUFTTyxTQUFTLHFCQUFxQixXQUF5QjtBQUM1RCxNQUFJO0FBQ0YsSUFBQUMsWUFBVyxzQkFBc0IsU0FBUyxDQUFDO0FBQUEsRUFDN0MsU0FBUyxPQUFPO0FBQ2QsUUFBSSxDQUFDLGFBQWEsT0FBTyxRQUFRLEVBQUcsT0FBTTtBQUFBLEVBQzVDO0FBQ0Y7OztBQ3RKQSxTQUFTLGdCQUFBQyxxQkFBb0I7QUFjdEIsSUFBTSxpQkFBaUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSzVCLFNBQVM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVQsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNYixhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT2IsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1oQixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1kLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9sQixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1kLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNZCxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxRQUFRO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1SLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWWQsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVViLE1BQU07QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTU4sYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNYixpQ0FBaUM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWpDLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPYixnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVFoQixXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNaEIsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFRaEIsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFTYixlQUFlO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT2Ysa0JBQWtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVlsQixrQkFBa0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVdsQixnQkFBZ0I7QUFDbEI7QUFrQk8sU0FBUyxZQUFvQjtBQUNsQyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsT0FBTztBQUNoRCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsT0FBTyxFQUFFO0FBQUEsRUFDcEY7QUFDQSxTQUFPO0FBQ1Q7QUFjTyxTQUFTLGlCQUF5QjtBQUN2QyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsV0FBVztBQUNwRCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsV0FBVyxFQUFFO0FBQUEsRUFDeEY7QUFDQSxTQUFPO0FBQ1Q7QUFlTyxTQUFTLGdCQUF3QjtBQUN0QyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsV0FBVztBQUNwRCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsV0FBVyxFQUFFO0FBQUEsRUFDeEY7QUFDQSxTQUFPO0FBQ1Q7QUFnQk8sU0FBUyxtQkFBaUQ7QUFDL0QsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLGNBQWM7QUFDdkQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLGNBQWMsRUFBRTtBQUFBLEVBQzNGO0FBQ0EsTUFBSSxVQUFVLGlCQUFpQixVQUFVLGNBQWM7QUFDckQsVUFBTSxJQUFJLE1BQU0sV0FBVyxlQUFlLGNBQWMsa0RBQWtELEtBQUssR0FBRztBQUFBLEVBQ3BIO0FBQ0EsU0FBTztBQUNUO0FBZU8sU0FBUyxnQkFBd0I7QUFDdEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFlBQVk7QUFDckQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFlBQVksRUFBRTtBQUFBLEVBQ3pGO0FBQ0EsU0FBTztBQUNUO0FBaUJPLFNBQVMsb0JBQTRCO0FBQzFDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxnQkFBZ0I7QUFDekQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLGdCQUFnQixFQUFFO0FBQUEsRUFDN0Y7QUFDQSxTQUFPO0FBQ1Q7QUFpQk8sU0FBUyxpQkFBcUM7QUFDbkQsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFlBQVk7QUFDckQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFdBQU87QUFBQSxFQUNUO0FBQ0EsU0FBTztBQUNUO0FBK0xPLFNBQVMsaUNBQXFEO0FBQ25FLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSwrQkFBK0I7QUFDeEUsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFdBQU87QUFBQSxFQUNUO0FBQ0EsU0FBTztBQUNUO0FBUU8sU0FBUyxnQkFBd0I7QUFDdEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFdBQVc7QUFDcEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFdBQVcsRUFBRTtBQUFBLEVBQ3hGO0FBQ0EsU0FBTztBQUNUO0FBNEJPLFNBQVMsY0FBc0I7QUFDcEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFNBQVM7QUFDbEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFNBQVMsRUFBRTtBQUFBLEVBQ3RGO0FBQ0EsU0FBTztBQUNUO0FBUU8sU0FBUyxrQkFBMEI7QUFDeEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLGNBQWM7QUFDdkQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLGNBQWMsRUFBRTtBQUFBLEVBQzNGO0FBQ0EsU0FBTztBQUNUO0FBWU8sU0FBUyxtQkFBMkI7QUFDekMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLGNBQWM7QUFDdkQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLGNBQWMsRUFBRTtBQUFBLEVBQzNGO0FBQ0EsU0FBTztBQUNUO0FBV08sU0FBUyw4QkFBbUQ7QUFDakUsUUFBTSxXQUFXLCtCQUErQjtBQUNoRCxNQUFJLGFBQWEsUUFBVztBQUMxQixXQUFPO0FBQUEsRUFDVDtBQUNBLFFBQU0sVUFBVUMsY0FBYSxVQUFVLE9BQU87QUFDOUMsU0FBTyxLQUFLLE1BQU0sT0FBTztBQUMzQjtBQXFCTyxTQUFTLHFCQUFrQztBQUNoRCxTQUFPO0FBQUEsSUFDTCxRQUFRLFVBQVU7QUFBQSxJQUNsQixZQUFZLGNBQWM7QUFBQSxJQUMxQixhQUFhLGVBQWU7QUFBQSxJQUM1QixlQUFlLGlCQUFpQjtBQUFBLElBQ2hDLFlBQVksY0FBYztBQUFBLElBQzFCLGdCQUFnQixrQkFBa0I7QUFBQSxJQUNsQyxhQUFhLGVBQWU7QUFBQSxJQUM1Qix5QkFBeUIsNEJBQTRCO0FBQUEsSUFDckQsVUFBVSxZQUFZO0FBQUEsSUFDdEIsY0FBYyxnQkFBZ0I7QUFBQSxJQUM5QixZQUFZLGNBQWM7QUFBQSxJQUMxQixlQUFlLGlCQUFpQjtBQUFBLEVBQ2xDO0FBQ0Y7OztBQ3ZyQk8sSUFBTSxpQkFBaUI7OztBQ1c5QixZQUFZLFFBQVE7QUFNYixJQUFNLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLM0IsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1iLFVBQVU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS1YsUUFBUTtBQUNaO0FBa0NPLFNBQVMsaUJBQWlCO0FBQzdCLFNBQU8sUUFBUSxJQUFJLGdCQUFnQixRQUFRO0FBQy9DO0FBOENPLFNBQVMsY0FBYyxNQUFNLE9BQU87QUFDdkMsUUFBTSxVQUFVLGVBQWU7QUFDL0IsTUFBSSxZQUFZLFFBQVc7QUFDdkIsVUFBTSxJQUFJLE1BQU0sd0dBQTZHO0FBQUEsRUFDakk7QUFFQSxRQUFNLGVBQWUsaUJBQWlCLEtBQUs7QUFFM0MsUUFBTSxrQkFBa0IsVUFBVSxJQUFJLElBQUksWUFBWTtBQUFBO0FBQ3RELEVBQUcsa0JBQWUsU0FBUyxpQkFBaUIsT0FBTztBQUN2RDtBQWlCTyxTQUFTLGVBQWUsTUFBTTtBQUNqQyxhQUFXLENBQUMsTUFBTSxLQUFLLEtBQUssT0FBTyxRQUFRLElBQUksR0FBRztBQUM5QyxrQkFBYyxNQUFNLEtBQUs7QUFBQSxFQUM3QjtBQUNKO0FBVUEsU0FBUyxpQkFBaUIsT0FBTztBQUc3QixRQUFNLFVBQVUsTUFBTSxRQUFRLE1BQU0sT0FBTztBQUMzQyxTQUFPLElBQUksT0FBTztBQUN0Qjs7O0FDcEpBLFNBQVMsbUJBQW1CLGVBQWUsUUFBUSxTQUFTO0FBQ3hELFFBQU0sU0FBUyxPQUFPLE9BQU8sWUFBWTtBQUdyQyxXQUFPLE1BQU0sUUFBUSxPQUFPLE9BQU87QUFBQSxFQUN2QztBQUVBLFNBQU8sZ0JBQWdCO0FBQ3ZCLFNBQU8sVUFBVSxPQUFPO0FBQ3hCLFNBQU8sVUFBVSxPQUFPO0FBQ3hCLFNBQU87QUFDWDtBQXlOTyxTQUFTLFNBQVMsUUFBUSxTQUFTO0FBQ3RDLFNBQU8sbUJBQW1CLFFBQVEsUUFBUSxPQUFPO0FBQ3JEOzs7QUN0UEEsU0FBUyxhQUFBQyxZQUFXLFlBQVksYUFBQUMsWUFBVyxZQUFBQyxXQUFVLGlCQUFpQjtBQUN0RSxTQUFTLFdBQUFDLGdCQUFlO0FBSWpCLElBQU0sYUFBYSxDQUFDLFNBQVMsUUFBUSxRQUFRLE9BQU87QUFzQ3BELElBQU0sU0FBTixNQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJaEIsV0FBVyxvQkFBSSxJQUFJO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtuQixZQUFZO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJWixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJZCxrQkFBa0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUlsQjtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWdCQSxZQUFZLFNBQVMsQ0FBQyxHQUFHO0FBRXJCLGVBQVcsU0FBUyxZQUFZO0FBQzVCLFdBQUssU0FBUyxJQUFJLE9BQU8sb0JBQUksSUFBSSxDQUFDO0FBQUEsSUFDdEM7QUFFQSxTQUFLLGNBQWMsT0FBTyxlQUFlLFFBQVEsSUFBSSw4QkFBOEI7QUFBQSxFQUN2RjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBYUEsTUFBTSxTQUFTLFNBQVM7QUFDcEIsU0FBSyxLQUFLLFNBQVMsU0FBUyxPQUFPO0FBQUEsRUFDdkM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWFBLEtBQUssU0FBUyxTQUFTO0FBQ25CLFNBQUssS0FBSyxRQUFRLFNBQVMsT0FBTztBQUFBLEVBQ3RDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFhQSxLQUFLLFNBQVMsU0FBUztBQUNuQixTQUFLLEtBQUssUUFBUSxTQUFTLE9BQU87QUFBQSxFQUN0QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBYUEsTUFBTSxTQUFTLFNBQVM7QUFDcEIsU0FBSyxLQUFLLFNBQVMsU0FBUyxPQUFPO0FBQUEsRUFDdkM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFxQkEsU0FBUyxPQUFPLFNBQVMsU0FBUztBQUM5QixVQUFNLFlBQVksS0FBSyxpQkFBaUIsS0FBSztBQUM3QyxVQUFNLFFBQVE7QUFBQSxNQUNWLFlBQVcsb0JBQUksS0FBSyxHQUFFLFlBQVk7QUFBQSxNQUNsQyxPQUFPO0FBQUEsTUFDUCxVQUFVLEtBQUs7QUFBQSxNQUNmO0FBQUEsTUFDQSxPQUFPLEtBQUs7QUFBQSxNQUNaLE9BQU87QUFBQSxNQUNQO0FBQUEsSUFDSjtBQUNBLFNBQUssYUFBYSxLQUFLO0FBQUEsRUFDM0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWtDQSxHQUFHLE9BQU8sU0FBUztBQUNmLFVBQU0sZ0JBQWdCLEtBQUssU0FBUyxJQUFJLEtBQUs7QUFDN0MsUUFBSSxlQUFlO0FBQ2Ysb0JBQWMsSUFBSSxPQUFPO0FBQUEsSUFDN0I7QUFDQSxXQUFPLE1BQU07QUFDVCxxQkFBZSxPQUFPLE9BQU87QUFBQSxJQUNqQztBQUFBLEVBQ0o7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVVBLFdBQVcsVUFBVSxPQUFPO0FBQ3hCLFNBQUssa0JBQWtCO0FBQ3ZCLFNBQUssZUFBZTtBQUFBLEVBQ3hCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPQSxlQUFlO0FBQ1gsU0FBSyxrQkFBa0I7QUFDdkIsU0FBSyxlQUFlO0FBQUEsRUFDeEI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWdCQSxXQUFXLFVBQVU7QUFFakIsUUFBSSxLQUFLLGNBQWMsTUFBTTtBQUN6QixVQUFJO0FBQ0EsUUFBQUgsV0FBVSxLQUFLLFNBQVM7QUFBQSxNQUM1QixRQUNNO0FBQUEsTUFFTjtBQUNBLFdBQUssWUFBWTtBQUFBLElBQ3JCO0FBQ0EsU0FBSyxjQUFjO0FBQ25CLFNBQUssa0JBQWtCO0FBQUEsRUFDM0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZQSxRQUFRO0FBQ0osUUFBSSxLQUFLLGNBQWMsTUFBTTtBQUN6QixVQUFJO0FBQ0EsUUFBQUEsV0FBVSxLQUFLLFNBQVM7QUFBQSxNQUM1QixRQUNNO0FBQUEsTUFFTjtBQUNBLFdBQUssWUFBWTtBQUFBLElBQ3JCO0FBQ0EsU0FBSyxrQkFBa0I7QUFBQSxFQUMzQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT0Esa0JBQWtCO0FBQ2QsZUFBVyxZQUFZLEtBQUssU0FBUyxPQUFPLEdBQUc7QUFDM0MsVUFBSSxTQUFTLE9BQU87QUFDaEIsZUFBTztBQUFBLElBQ2Y7QUFDQSxXQUFPLEtBQUssZ0JBQWdCO0FBQUEsRUFDaEM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVVBLEtBQUssT0FBTyxTQUFTLFNBQVM7QUFDMUIsVUFBTSxRQUFRO0FBQUEsTUFDVixZQUFXLG9CQUFJLEtBQUssR0FBRSxZQUFZO0FBQUEsTUFDbEM7QUFBQSxNQUNBLFVBQVUsS0FBSztBQUFBLE1BQ2Y7QUFBQSxNQUNBLE9BQU8sS0FBSztBQUFBLE1BQ1o7QUFBQSxJQUNKO0FBQ0EsU0FBSyxhQUFhLEtBQUs7QUFBQSxFQUMzQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLQSxhQUFhLE9BQU87QUFFaEIsVUFBTSxnQkFBZ0IsS0FBSyxTQUFTLElBQUksTUFBTSxLQUFLO0FBQ25ELFFBQUksZUFBZTtBQUNmLGlCQUFXLFdBQVcsZUFBZTtBQUNqQyxZQUFJO0FBQ0Esa0JBQVEsS0FBSztBQUFBLFFBQ2pCLFFBQ007QUFBQSxRQUVOO0FBQUEsTUFDSjtBQUFBLElBQ0o7QUFFQSxTQUFLLFlBQVksS0FBSztBQUFBLEVBQzFCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtBLFlBQVksT0FBTztBQUNmLFFBQUksQ0FBQyxLQUFLO0FBQ047QUFFSixRQUFJLENBQUMsS0FBSyxpQkFBaUI7QUFDdkIsV0FBSyxlQUFlO0FBQUEsSUFDeEI7QUFDQSxRQUFJLEtBQUssY0FBYztBQUNuQjtBQUNKLFFBQUk7QUFDQSxZQUFNLE9BQU8sR0FBRyxLQUFLLFVBQVUsS0FBSyxDQUFDO0FBQUE7QUFDckMsZ0JBQVUsS0FBSyxXQUFXLElBQUk7QUFBQSxJQUNsQyxRQUNNO0FBQUEsSUFJTjtBQUFBLEVBQ0o7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUlBLGlCQUFpQjtBQUNiLFNBQUssa0JBQWtCO0FBQ3ZCLFFBQUksQ0FBQyxLQUFLO0FBQ047QUFDSixRQUFJO0FBRUEsWUFBTSxNQUFNRyxTQUFRLEtBQUssV0FBVztBQUNwQyxVQUFJLENBQUMsV0FBVyxHQUFHLEdBQUc7QUFDbEIsUUFBQUYsV0FBVSxLQUFLLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFBQSxNQUN0QztBQUVBLFdBQUssWUFBWUMsVUFBUyxLQUFLLGFBQWEsR0FBRztBQUFBLElBQ25ELFFBQ007QUFFRixXQUFLLFlBQVk7QUFBQSxJQUNyQjtBQUFBLEVBQ0o7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNQSxpQkFBaUIsT0FBTztBQUNwQixRQUFJLGlCQUFpQixPQUFPO0FBQ3hCLFlBQU0sT0FBTztBQUFBLFFBQ1QsTUFBTSxNQUFNO0FBQUEsUUFDWixTQUFTLE1BQU07QUFBQSxRQUNmLE9BQU8sTUFBTTtBQUFBLE1BQ2pCO0FBRUEsVUFBSSxNQUFNLFVBQVUsUUFBVztBQUMzQixhQUFLLFFBQVEsS0FBSyxpQkFBaUIsTUFBTSxLQUFLO0FBQUEsTUFDbEQ7QUFDQSxhQUFPO0FBQUEsSUFDWDtBQUVBLFdBQU87QUFBQSxNQUNILE1BQU07QUFBQSxNQUNOLFNBQVMsT0FBTyxLQUFLO0FBQUEsSUFDekI7QUFBQSxFQUNKO0FBQ0o7QUEwRE8sSUFBTSxTQUFTLElBQUksT0FBTzs7O0FDamUxQixJQUFNLGFBQWE7QUFBQTtBQUFBLEVBRXRCLFNBQVM7QUFBQTtBQUFBLEVBRVQsT0FBTztBQUFBO0FBQUEsRUFFUCxPQUFPO0FBQ1g7QUFxQ0EsU0FBUyw0QkFBNEIsVUFBVTtBQUMzQyxTQUFPLENBQUMsVUFBVSxDQUFDLE9BQU87QUFBQSxJQUN0QixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsRUFDWjtBQUNKO0FBa0lPLElBQU0sYUFBNkIsNENBQTRCLE1BQU07OztBQzFLNUUsZUFBZSxZQUFZO0FBQ3ZCLFNBQU8sSUFBSSxRQUFRLENBQUMsU0FBUyxXQUFXO0FBQ3BDLFVBQU0sU0FBUyxDQUFDO0FBRWhCLFlBQVEsTUFBTSxZQUFZLE9BQU87QUFDakMsWUFBUSxNQUFNLEdBQUcsUUFBUSxDQUFDLFVBQVU7QUFDaEMsYUFBTyxLQUFLLEtBQUs7QUFBQSxJQUNyQixDQUFDO0FBQ0QsWUFBUSxNQUFNLEdBQUcsT0FBTyxNQUFNO0FBQzFCLGNBQVEsT0FBTyxLQUFLLEVBQUUsQ0FBQztBQUFBLElBQzNCLENBQUM7QUFDRCxZQUFRLE1BQU0sR0FBRyxTQUFTLENBQUMsVUFBVTtBQUNqQyxhQUFPLEtBQUs7QUFBQSxJQUNoQixDQUFDO0FBQUEsRUFDTCxDQUFDO0FBQ0w7QUFPQSxTQUFTLGdCQUFnQixjQUFjO0FBRW5DLFFBQU0sV0FBVyxLQUFLLE1BQU0sWUFBWTtBQUN4QyxTQUFPO0FBQ1g7QUFRQSxTQUFTLFlBQVksUUFBUTtBQUV6QixVQUFRLE9BQU8sTUFBTSxLQUFLLFVBQVUsTUFBTSxDQUFDO0FBQy9DO0FBU0EsU0FBUywyQkFBMkIsT0FBTztBQUN2QyxTQUFPLE1BQU0sdUJBQXVCLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUssQ0FBQyxFQUFFO0FBQzVGLFNBQU8sRUFBRSxRQUFRLENBQUMsRUFBRTtBQUN4QjtBQVVBLFNBQVMsbUJBQW1CLE9BQU87QUFFL0IsTUFBSSxpQkFBaUIsT0FBTztBQUN4QixZQUFRLE9BQU8sTUFBTSxHQUFHLE1BQU0sU0FBUyxNQUFNLE9BQU87QUFBQSxDQUFJO0FBQUEsRUFDNUQsT0FDSztBQUNELFlBQVEsT0FBTyxNQUFNLEdBQUcsT0FBTyxLQUFLLENBQUM7QUFBQSxDQUFJO0FBQUEsRUFDN0M7QUFFQSxTQUFPLE1BQU0sdUJBQXVCLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUssQ0FBQyxFQUFFO0FBRTVGLFNBQU8sYUFBYTtBQUNwQixTQUFPLE1BQU07QUFFYixVQUFRLEtBQUssV0FBVyxLQUFLO0FBQ2pDO0FBbUJPLFNBQVMsb0JBQW9CLGdCQUFnQjtBQUNoRCxRQUFNLEVBQUUsUUFBUSxPQUFPLElBQUk7QUFDM0IsU0FBTyxXQUFXLFNBQVksRUFBRSxRQUFRLE9BQU8sSUFBSSxFQUFFLE9BQU87QUFDaEU7QUFrQ0EsZUFBc0IsUUFBUSxRQUFRO0FBQ2xDLE1BQUk7QUFDSixNQUFJO0FBSUEsVUFBTSxhQUFhLFFBQVEsSUFBSTtBQUMvQixVQUFNLGFBQWEsUUFBUSxJQUFJO0FBQy9CLFFBQUksZUFBZSxVQUFhLGVBQWUsVUFBYSxlQUFlLFlBQVk7QUFFbkYsY0FBUSxPQUFPLE1BQU0sK0NBQStDLFVBQVUsb0NBQW9DLFVBQVU7QUFBQSxDQUN0RTtBQUN0RCxjQUFRLEtBQUssV0FBVyxLQUFLO0FBQUEsSUFDakM7QUFFQSxRQUFJLGVBQWUsUUFBVztBQUMxQixhQUFPLFdBQVcsVUFBVTtBQUFBLElBQ2hDO0FBRUEsUUFBSTtBQUNKLFFBQUk7QUFDQSxxQkFBZSxNQUFNLFVBQVU7QUFBQSxJQUNuQyxTQUNPLE9BQU87QUFDVixhQUFPLFNBQVMsT0FBTyxzQkFBc0I7QUFDN0MsZUFBUywyQkFBMkIsS0FBSztBQUN6QztBQUFBLElBQ0o7QUFFQSxRQUFJO0FBQ0osUUFBSTtBQUNBLGNBQVEsZ0JBQWdCLFlBQVk7QUFBQSxJQUN4QyxTQUNPLE9BQU87QUFDVixhQUFPLFNBQVMsT0FBTyw0QkFBNEI7QUFDbkQsZUFBUywyQkFBMkIsS0FBSztBQUN6QztBQUFBLElBQ0o7QUFFQSxVQUFNLGdCQUFnQixPQUFPO0FBQzdCLFdBQU8sV0FBVyxlQUFlLEtBQUs7QUFFdEMsVUFBTSxVQUFVLGtCQUFrQixpQkFBaUIsRUFBRSxRQUFRLGVBQWUsZUFBZSxJQUFJLEVBQUUsT0FBTztBQUV4RyxRQUFJO0FBQ0EsWUFBTSxpQkFBaUIsTUFBTSxPQUFPLE9BQU8sT0FBTztBQUNsRCxlQUFTLG9CQUFvQixjQUFjO0FBQUEsSUFDL0MsU0FDTyxPQUFPO0FBR1YseUJBQW1CLEtBQUs7QUFBQSxJQUM1QjtBQUFBLEVBQ0osVUFDQTtBQUVJLFFBQUksV0FBVyxRQUFXO0FBQ3RCLGtCQUFZLE9BQU8sTUFBTTtBQUFBLElBQzdCO0FBRUEsV0FBTyxhQUFhO0FBQ3BCLFdBQU8sTUFBTTtBQUliLFFBQUksUUFBUSxXQUFXLFFBQVc7QUFDOUIsY0FBUSxPQUFPLE1BQU0sT0FBTyxNQUFNO0FBQ2xDLGNBQVEsS0FBSyxXQUFXLEtBQUs7QUFBQSxJQUNqQztBQUVBLFlBQVEsS0FBSyxXQUFXLE9BQU87QUFBQSxFQUNuQztBQUNKOzs7QVp4TUEsSUFBTSxjQUFjO0FBS2IsSUFBTSxpQkFBTixjQUE2QixNQUFNO0FBQUEsRUFHeEMsWUFDa0IsVUFDQSxVQUNoQixPQUNBO0FBQ0EsVUFBTSxTQUFTLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDcEUsVUFBTSxnQ0FBZ0MsUUFBUSxPQUFPLFFBQVEsS0FBSyxNQUFNLEVBQUU7QUFMMUQ7QUFDQTtBQUtoQixTQUFLLFFBQVE7QUFBQSxFQUNmO0FBQUEsRUFWa0IsT0FBTztBQVczQjtBQUtPLElBQU0sa0JBQU4sY0FBOEIsTUFBTTtBQUFBLEVBR3pDLFlBQ2tCLFVBQ0EsTUFDaEIsT0FDQTtBQUNBLFVBQU0sU0FBUyxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3BFLFVBQU0sK0JBQStCLEtBQUssTUFBTSxpQkFBaUIsUUFBUSxLQUFLLE1BQU0sRUFBRTtBQUx0RTtBQUNBO0FBS2hCLFNBQUssUUFBUTtBQUFBLEVBQ2Y7QUFBQSxFQVZrQixPQUFPO0FBVzNCO0FBS08sSUFBTSxvQkFBTixjQUFnQyxNQUFNO0FBQUEsRUFHM0MsWUFDa0IsV0FDQSxLQUNoQixPQUNBO0FBQ0EsVUFBTSxTQUFTLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDcEUsVUFBTSwyQkFBMkIsR0FBRyxnQkFBZ0IsU0FBUyxLQUFLLE1BQU0sRUFBRTtBQUwxRDtBQUNBO0FBS2hCLFNBQUssUUFBUTtBQUFBLEVBQ2Y7QUFBQSxFQVZrQixPQUFPO0FBVzNCO0FBS08sSUFBTSxzQkFBTixjQUFrQyxNQUFNO0FBQUEsRUFHN0MsWUFDa0IsV0FDaEIsT0FDQTtBQUNBLFVBQU0sU0FBUyxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3BFLFVBQU0sOEJBQThCLFNBQVMsS0FBSyxNQUFNLEVBQUU7QUFKMUM7QUFLaEIsU0FBSyxRQUFRO0FBQUEsRUFDZjtBQUFBLEVBVGtCLE9BQU87QUFVM0I7QUFFQSxTQUFTLGVBQWUsS0FBYSxPQUFxQjtBQUN4RCxNQUFJLENBQUMsWUFBWSxLQUFLLEdBQUcsR0FBRztBQUMxQixVQUFNLElBQUksTUFBTSxXQUFXLEtBQUssS0FBSyxHQUFHLEVBQUU7QUFBQSxFQUM1QztBQUNGO0FBWU8sU0FBUyxnQkFBZ0IsVUFBa0IsVUFBNEI7QUFDNUUsaUJBQWUsVUFBVSxXQUFXO0FBRXBDLE1BQUk7QUFDRixVQUFNLFNBQVM7QUFBQSxNQUNiO0FBQUEsTUFDQSxDQUFDLE9BQU8sZUFBZSxHQUFHLFFBQVEsVUFBVSxNQUFNLEtBQUssZ0NBQWdDO0FBQUEsTUFDdkY7QUFBQSxRQUNFLEtBQUs7QUFBQSxRQUNMLFVBQVU7QUFBQSxRQUNWLFNBQVM7QUFBQSxRQUNULE9BQU8sQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLE1BQ2hDO0FBQUEsSUFDRixFQUFFLEtBQUs7QUFDUCxRQUFJLENBQUMsT0FBUSxRQUFPLENBQUM7QUFDckIsVUFBTSxPQUFPLE9BQU8sTUFBTSxJQUFJO0FBQzlCLGVBQVcsT0FBTyxNQUFNO0FBQ3RCLHFCQUFlLEtBQUssWUFBWTtBQUFBLElBQ2xDO0FBQ0EsV0FBTztBQUFBLEVBQ1QsU0FBUyxPQUFPO0FBQ2QsVUFBTSxJQUFJLGVBQWUsVUFBVSxVQUFVLEtBQUs7QUFBQSxFQUNwRDtBQUNGO0FBU08sU0FBUyx1QkFBdUIsWUFBc0IsZ0JBQW9DO0FBQy9GLFFBQU0sYUFBYSxJQUFJLElBQUksY0FBYztBQUN6QyxTQUFPLFdBQVcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDO0FBQ3hEO0FBWU8sU0FBUyxrQkFBa0IsVUFBa0IsTUFBd0I7QUFDMUUsTUFBSSxLQUFLLFdBQVcsRUFBRyxRQUFPO0FBRzlCLFFBQU0sU0FBUyxLQUFLLEtBQUssU0FBUyxDQUFDO0FBQ25DLGlCQUFlLFFBQVEsbUJBQW1CO0FBRTFDLE1BQUk7QUFJRixVQUFNLGNBQWMsYUFBYSxPQUFPLENBQUMsWUFBWSxhQUFhLE1BQU0sS0FBSyxNQUFNLEdBQUc7QUFBQSxNQUNwRixLQUFLO0FBQUEsTUFDTCxVQUFVO0FBQUEsTUFDVixTQUFTO0FBQUEsTUFDVCxPQUFPLENBQUMsUUFBUSxRQUFRLE1BQU07QUFBQSxJQUNoQyxDQUFDLEVBQUUsS0FBSztBQUNSLFVBQU0sT0FBTyxZQUFZLFNBQVMsR0FBRyxJQUFJLEdBQUcsTUFBTSxPQUFPO0FBRXpELFdBQU8sYUFBYSxPQUFPLENBQUMsUUFBUSxHQUFHLElBQUksVUFBVSxNQUFNLEtBQUssZ0NBQWdDLEdBQUc7QUFBQSxNQUNqRyxLQUFLO0FBQUEsTUFDTCxVQUFVO0FBQUEsTUFDVixTQUFTO0FBQUEsTUFDVCxPQUFPLENBQUMsUUFBUSxRQUFRLE1BQU07QUFBQSxJQUNoQyxDQUFDLEVBQUUsS0FBSztBQUFBLEVBQ1YsU0FBUyxPQUFPO0FBQ2QsVUFBTSxJQUFJLGdCQUFnQixVQUFVLE1BQU0sS0FBSztBQUFBLEVBQ2pEO0FBQ0Y7QUFTQSxlQUFlLDBCQUEwQixXQUFtQixNQUErQjtBQUN6RixhQUFXLE9BQU8sTUFBTTtBQUN0QixRQUFJO0FBQ0YsWUFBTSxzQkFBc0IsV0FBVyxHQUFHO0FBQUEsSUFDNUMsU0FBUyxPQUFPO0FBQ2QsWUFBTSxJQUFJLGtCQUFrQixXQUFXLEtBQUssS0FBSztBQUFBLElBQ25EO0FBQUEsRUFDRjtBQUNGO0FBU0EsZUFBZSxlQUFlRSxTQUFnQixXQUFrQztBQUM5RSxRQUFNLGNBQWMsY0FBYztBQUVsQyxNQUFJO0FBQ0YsUUFBSSxhQUFhO0FBQ2YsWUFBTSxpQkFBaUIsV0FBVztBQUNsQyxNQUFBQSxRQUFPLEtBQUssK0JBQStCLEVBQUUsS0FBSyxZQUFZLENBQUM7QUFBQSxJQUNqRTtBQUVBLHlCQUFxQixTQUFTO0FBQzlCLHFCQUFpQixTQUFTO0FBQzFCLElBQUFBLFFBQU8sS0FBSywwQkFBMEIsRUFBRSxVQUFVLENBQUM7QUFBQSxFQUNyRCxTQUFTLE9BQU87QUFDZCxVQUFNLElBQUksb0JBQW9CLFdBQVcsS0FBSztBQUFBLEVBQ2hEO0FBQ0Y7QUFhQSxlQUFlLGtCQUNiQSxTQUNBLFdBQ0EsaUJBQ3dDO0FBQ3hDLE1BQUk7QUFDRixVQUFNLGVBQWVBLFNBQVEsU0FBUztBQUFBLEVBQ3hDLFNBQVMsT0FBTztBQUNkLFFBQUksaUJBQWlCLHFCQUFxQjtBQUN4QyxNQUFBQSxRQUFPLE1BQU0sMEJBQTBCLEVBQUUsV0FBVyxNQUFNLFdBQVcsT0FBTyxNQUFNLFFBQVEsQ0FBQztBQUMzRixhQUFPLFdBQVc7QUFBQSxRQUNoQixVQUFVO0FBQUEsUUFDVixlQUFlO0FBQUEsVUFDYjtBQUFBLFVBQ0E7QUFBQSxVQUNBLFlBQVksTUFBTSxPQUFPO0FBQUEsVUFDekI7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0EseUNBQXlDLFNBQVM7QUFBQSxRQUNwRCxFQUFFLEtBQUssSUFBSTtBQUFBLFFBQ1gsUUFBUSxtQkFBbUIsTUFBTSxPQUFPO0FBQUEsTUFDMUMsQ0FBQztBQUFBLElBQ0g7QUFDQSxVQUFNO0FBQUEsRUFDUjtBQUNBLFNBQU8sV0FBVyxFQUFFLFVBQVUsV0FBVyxlQUFlLGdCQUFnQixDQUFDO0FBQzNFO0FBRUEsSUFBTyxlQUFRLFNBQVMsQ0FBQyxHQUFHLE9BQU8sT0FBTyxFQUFFLFFBQUFBLFFBQU8sTUFBTTtBQUN2RCxNQUFJO0FBQ0osTUFBSTtBQUNGLGtCQUFjLG1CQUFtQjtBQUFBLEVBQ25DLFNBQVMsT0FBTztBQUNkLFVBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3JFLElBQUFBLFFBQU8sTUFBTSwyQ0FBMkMsRUFBRSxPQUFPLFFBQVEsQ0FBQztBQUMxRSxXQUFPLFdBQVc7QUFBQSxNQUNoQixVQUFVO0FBQUEsTUFDVixlQUFlO0FBQUEsSUFDakIsQ0FBQztBQUFBLEVBQ0g7QUFFQSxRQUFNLFVBQVUsbUJBQW1CLE1BQU0sVUFBVTtBQUNuRCxNQUFJLENBQUMsU0FBUztBQUNaLElBQUFBLFFBQU8sS0FBSyw4REFBeUQ7QUFDckUsV0FBTyxXQUFXO0FBQUEsTUFDaEIsVUFBVTtBQUFBLE1BQ1YsZUFBZTtBQUFBLElBQ2pCLENBQUM7QUFBQSxFQUNIO0FBRUEsUUFBTSxZQUFZLE1BQU07QUFHeEIsTUFBSTtBQUNKLE1BQUk7QUFDRixpQkFBYSxnQkFBZ0IsWUFBWSxjQUFjLE9BQU87QUFBQSxFQUNoRSxTQUFTLE9BQU87QUFDZCxRQUFJLGlCQUFpQixnQkFBZ0I7QUFDbkMsTUFBQUEsUUFBTyxNQUFNLDBCQUEwQixFQUFFLFVBQVUsTUFBTSxVQUFVLE9BQU8sTUFBTSxRQUFRLENBQUM7QUFDekYsYUFBTyxXQUFXO0FBQUEsUUFDaEIsVUFBVTtBQUFBLFFBQ1YsZUFBZTtBQUFBLFVBQ2Isa0RBQWtELE1BQU0sUUFBUTtBQUFBLFVBQ2hFO0FBQUEsVUFDQSxVQUFVLE1BQU0sT0FBTztBQUFBLFVBQ3ZCO0FBQUEsVUFDQTtBQUFBLFVBQ0EseURBQXlELE1BQU0sUUFBUTtBQUFBLFVBQ3ZFO0FBQUEsVUFDQSxnQ0FBZ0MsTUFBTSxRQUFRO0FBQUEsUUFDaEQsRUFBRSxLQUFLLElBQUk7QUFBQSxRQUNYLFFBQVEsc0JBQXNCLE1BQU0sT0FBTztBQUFBLE1BQzdDLENBQUM7QUFBQSxJQUNIO0FBQ0EsVUFBTTtBQUFBLEVBQ1I7QUFFQSxNQUFJLFdBQVcsV0FBVyxHQUFHO0FBQzNCLFdBQU8sa0JBQWtCQSxTQUFRLFdBQVcsc0RBQWlEO0FBQUEsRUFDL0Y7QUFHQSxNQUFJO0FBQ0osTUFBSTtBQUNGLHFCQUFpQixrQkFBa0IsU0FBUztBQUFBLEVBQzlDLFNBQVMsT0FBTztBQUNkLFVBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3JFLElBQUFBLFFBQU8sTUFBTSxrQ0FBa0MsRUFBRSxPQUFPLFFBQVEsQ0FBQztBQUNqRSxXQUFPLFdBQVc7QUFBQSxNQUNoQixVQUFVO0FBQUEsTUFDVixlQUFlO0FBQUEsUUFDYixxREFBcUQsU0FBUztBQUFBLFFBQzlEO0FBQUEsUUFDQSxVQUFVLE9BQU87QUFBQSxRQUNqQjtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQSwwQ0FBMEMsU0FBUztBQUFBLE1BQ3JELEVBQUUsS0FBSyxJQUFJO0FBQUEsTUFDWCxRQUFRLDRCQUE0QixPQUFPO0FBQUEsSUFDN0MsQ0FBQztBQUFBLEVBQ0g7QUFFQSxRQUFNLGVBQWUsdUJBQXVCLFlBQVksY0FBYztBQUV0RSxNQUFJLGFBQWEsV0FBVyxHQUFHO0FBQzdCLFdBQU87QUFBQSxNQUNMQTtBQUFBLE1BQ0E7QUFBQSxNQUNBLDRCQUF1QixXQUFXLE1BQU07QUFBQSxJQUMxQztBQUFBLEVBQ0Y7QUFLQSxRQUFNLFdBQXFCLENBQUM7QUFFNUIsTUFBSTtBQUNKLE1BQUk7QUFDRixrQkFBYyxrQkFBa0IsWUFBWSxjQUFjLFlBQVk7QUFBQSxFQUN4RSxTQUFTLE9BQU87QUFDZCxRQUFJLGlCQUFpQixpQkFBaUI7QUFDcEMsTUFBQUEsUUFBTyxNQUFNLDJCQUEyQixFQUFFLFVBQVUsTUFBTSxVQUFVLE9BQU8sTUFBTSxRQUFRLENBQUM7QUFDMUYsb0JBQWM7QUFBQSxRQUNaLGdDQUFnQyxNQUFNLEtBQUssTUFBTTtBQUFBLFFBQ2pEO0FBQUEsUUFDQSxVQUFVLE1BQU0sT0FBTztBQUFBLFFBQ3ZCO0FBQUEsUUFDQTtBQUFBLFFBQ0EsWUFBWSxNQUFNLFFBQVEsU0FBUyxNQUFNLEtBQUssTUFBTSxLQUFLLFNBQVMsQ0FBQyxDQUFDO0FBQUEsTUFDdEUsRUFBRSxLQUFLLElBQUk7QUFDWCxlQUFTLEtBQUssMkJBQTJCLE1BQU0sT0FBTyxFQUFFO0FBQUEsSUFDMUQsT0FBTztBQUNMLFlBQU07QUFBQSxJQUNSO0FBQUEsRUFDRjtBQUVBLE1BQUk7QUFDRixVQUFNLDBCQUEwQixXQUFXLFlBQVk7QUFBQSxFQUN6RCxTQUFTLE9BQU87QUFDZCxRQUFJLGlCQUFpQixtQkFBbUI7QUFDdEMsTUFBQUEsUUFBTyxNQUFNLHdDQUF3QztBQUFBLFFBQ25ELFdBQVcsTUFBTTtBQUFBLFFBQ2pCLEtBQUssTUFBTTtBQUFBLFFBQ1gsT0FBTyxNQUFNO0FBQUEsTUFDZixDQUFDO0FBQ0QsZUFBUztBQUFBLFFBQ1AsK0JBQStCLE1BQU0sR0FBRyxLQUFLLE1BQU0sT0FBTztBQUFBLE1BRzVEO0FBQUEsSUFDRixPQUFPO0FBQ0wsWUFBTTtBQUFBLElBQ1I7QUFBQSxFQUNGO0FBRUEsTUFBSTtBQUNGLFVBQU0sZUFBZUEsU0FBUSxTQUFTO0FBQUEsRUFDeEMsU0FBUyxPQUFPO0FBQ2QsUUFBSSxpQkFBaUIscUJBQXFCO0FBQ3hDLE1BQUFBLFFBQU8sTUFBTSwwQkFBMEIsRUFBRSxXQUFXLE1BQU0sV0FBVyxPQUFPLE1BQU0sUUFBUSxDQUFDO0FBQzNGLGVBQVM7QUFBQSxRQUNQLDJCQUEyQixNQUFNLE9BQU8sNEdBRXlCLFNBQVM7QUFBQSxNQUM1RTtBQUFBLElBQ0YsT0FBTztBQUNMLFlBQU07QUFBQSxJQUNSO0FBQUEsRUFDRjtBQUVBLFFBQU0sZ0JBQWdCLEdBQUcsYUFBYSxNQUFNLHVCQUF1QixhQUFhLFNBQVMsSUFBSSxNQUFNLEVBQUU7QUFDckcsUUFBTSxlQUFlLFNBQVMsU0FBUyxJQUFJO0FBQUE7QUFBQTtBQUFBLEVBQWtCLFNBQVMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLElBQUksQ0FBQyxLQUFLO0FBRTFHLFNBQU8sV0FBVztBQUFBLElBQ2hCLFVBQVU7QUFBQSxJQUNWLFFBQVEsMkNBQTJDLGFBQWE7QUFBQTtBQUFBLEVBQVMsV0FBVyxHQUFHLFlBQVk7QUFBQSxFQUNyRyxDQUFDO0FBQ0gsQ0FBQzs7O0FhMWFELFFBQVEsSUFBSSxnQ0FBZ0MsSUFBSTtBQUtoRCxRQUFRLFlBQUk7IiwKICAibmFtZXMiOiBbIm1rZGlyU3luYyIsICJyZWFkRmlsZVN5bmMiLCAidW5saW5rU3luYyIsICJ3cml0ZUZpbGVTeW5jIiwgImhvbWVkaXIiLCAiam9pbiIsICJMT0NLX1RJTUVPVVRfTVMiLCAiam9pbiIsICJob21lZGlyIiwgIm1rZGlyU3luYyIsICJyZWFkRmlsZVN5bmMiLCAidW5saW5rU3luYyIsICJyZWFkRmlsZVN5bmMiLCAidW5saW5rU3luYyIsICJyZWFkRmlsZVN5bmMiLCAicmVhZEZpbGVTeW5jIiwgImNsb3NlU3luYyIsICJta2RpclN5bmMiLCAib3BlblN5bmMiLCAiZGlybmFtZSIsICJsb2dnZXIiXQp9Cg==
