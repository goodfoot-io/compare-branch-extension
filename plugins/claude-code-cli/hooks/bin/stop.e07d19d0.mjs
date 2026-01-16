#!/usr/bin/env -S node --enable-source-maps
// ../../node_modules/@goodfoot/claude-code-hooks/dist/outputs.js
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

// ../../node_modules/@goodfoot/claude-code-hooks/dist/logger.js
import { closeSync, existsSync, mkdirSync, openSync, writeSync } from "node:fs";
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
    this.logFilePath = config.logFilePath ?? process.env["CLAUDE_CODE_HOOKS_LOG_FILE"] ?? null;
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
        closeSync(this.logFileFd);
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
        closeSync(this.logFileFd);
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
      if (handlers.size > 0) return true;
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
    if (!this.logFilePath) return;
    if (!this.fileInitialized) {
      this.initializeFile();
    }
    if (this.logFileFd === null) return;
    try {
      const line = JSON.stringify(event) + "\n";
      writeSync(this.logFileFd, line);
    } catch {
    }
  }
  /**
   * Initializes the log file for writing.
   */
  initializeFile() {
    this.fileInitialized = true;
    if (!this.logFilePath) return;
    try {
      const dir = dirname(this.logFilePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      this.logFileFd = openSync(this.logFilePath, "a");
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

// ../../node_modules/@goodfoot/claude-code-hooks/dist/hooks.js
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

// ../../node_modules/@goodfoot/claude-code-hooks/dist/env.js
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
    throw new Error(
      "persistEnvVar can only be used in SessionStart hooks. CLAUDE_ENV_FILE environment variable is not set."
    );
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

// ../../node_modules/@goodfoot/claude-code-hooks/dist/runtime.js
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
    const cliLogFile = process.env["CLAUDE_CODE_HOOKS_CLI_LOG_FILE"];
    const envLogFile = process.env["CLAUDE_CODE_HOOKS_LOG_FILE"];
    if (cliLogFile !== void 0 && envLogFile !== void 0 && cliLogFile !== envLogFile) {
      process.stderr.write(
        `Log file configuration conflict: CLI --log="${cliLogFile}" vs CLAUDE_CODE_HOOKS_LOG_FILE="${envLogFile}". Use only one method to configure hook logging.
`
      );
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

// src/lib/api.ts
import { execSync } from "node:child_process";
var ApiError = class _ApiError extends Error {
  options;
  constructor(message, options) {
    super(_ApiError.formatMessage(message, options ?? {}));
    this.name = "ApiError";
    this.options = options;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
  /**
   * Formats an error message with optional details.
   */
  static formatMessage(message, options) {
    const parts = [message];
    if (options.method && options.url) {
      parts.push(`${options.method} ${options.url}`);
    } else if (options.url) {
      parts.push(`URL: ${options.url}`);
    }
    if (options.status !== void 0) {
      const statusPart = options.statusText ? `Status: ${options.status} ${options.statusText}` : `Status: ${options.status}`;
      parts.push(statusPart);
    }
    if (options.responsePreview) {
      parts.push(`Response: ${options.responsePreview}`);
    }
    return parts.length === 1 ? message : parts.join("\n");
  }
};
function discoverApiUrl(logger2) {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (!pluginRoot) {
    throw new ApiError("CLAUDE_PLUGIN_ROOT environment variable is not set");
  }
  try {
    const result = execSync(`"${pluginRoot}/bin/discover-workspace-api.sh"`, {
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["pipe", "pipe", "pipe"]
    });
    return result.trim();
  } catch (error) {
    const execError = error;
    const exitCode = execError.status ?? "unknown";
    const stderr = execError.stderr ? String(execError.stderr) : "unknown";
    logger2?.debug("API discovery failed", { error: String(error) });
    throw new ApiError(`API discovery script failed (exit code: ${exitCode}, stderr: ${stderr})`, {
      cause: error instanceof Error ? error : new Error(String(error))
    });
  }
}
async function fetchIssueDiff(sessionId, issueId, baseUrl, logger2) {
  const url = `${baseUrl}/session/${sessionId}/diff?issueIds=${issueId}`;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5e3)
    });
    if (!response.ok) {
      const responseText = await response.text();
      const responsePreview = responseText.slice(0, 200);
      logger2?.debug("Issue diff fetch failed", { status: response.status });
      throw new ApiError("Issue diff fetch failed", {
        url,
        status: response.status,
        statusText: response.statusText,
        responsePreview
      });
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger2?.debug("Issue diff fetch error", { error: String(error) });
    throw new ApiError(`Issue diff fetch error: ${error instanceof Error ? error.message : String(error)}`, {
      url,
      cause: error instanceof Error ? error : new Error(String(error))
    });
  }
}
async function notifySessionStop(sessionId, dispatcherPid, baseUrl, logger2) {
  try {
    const response = await fetch(`${baseUrl}/session/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, dispatcherPid }),
      signal: AbortSignal.timeout(2e3)
    });
    return response.ok;
  } catch (error) {
    logger2?.debug("Notify session stop failed", { error: String(error) });
    return false;
  }
}

// src/lib/ipc.ts
function getDispatcherPid() {
  const pid = process.env.DISPATCHER_PID;
  if (!pid) {
    return null;
  }
  const parsed = Number.parseInt(pid, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
function signalIdle(pid, logger2) {
  if (process.env.SESSION_STOP_TEST_MODE === "1") {
    logger2?.debug("TEST_MODE: Would send SIGWINCH", { pid });
    return true;
  }
  try {
    process.kill(pid, "SIGWINCH");
    return true;
  } catch (error) {
    logger2?.warn("Failed to signal dispatcher idle", {
      pid,
      error: String(error)
    });
    return false;
  }
}

// src/lib/output-helpers.ts
function hasUpdates(diff) {
  return diff.jsonPatch.length > 0;
}
function buildUpdateSummary(diff) {
  let commentCount = 0;
  let changeCount = 0;
  for (const patch of diff.jsonPatch) {
    if (patch.op === "add" && patch.path === "/comments/-") {
      commentCount++;
    } else if (patch.op === "replace") {
      changeCount++;
    }
  }
  const parts = [];
  if (commentCount > 0) {
    parts.push(commentCount === 1 ? "1 new comment" : `${commentCount} new comments`);
  }
  if (changeCount > 0) {
    parts.push(changeCount === 1 ? "1 field change" : `${changeCount} field changes`);
  }
  const summary = parts.join(" and ");
  const issueCount = diff.issues.length;
  if (issueCount === 1) {
    const issueTitle = diff.issues[0].issueTitle ?? "unknown";
    return `Issue updated: ${summary} on "${issueTitle}"`;
  }
  return `Issues updated: ${summary} across ${issueCount} issues`;
}

// src/lib/state.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
var STATE_DIR = join(homedir(), ".compare-branch", "hook-state");
function getStateFile(sessionId) {
  return join(STATE_DIR, `${sessionId}.json`);
}
function ensureStateDir() {
  if (!existsSync2(STATE_DIR)) {
    mkdirSync2(STATE_DIR, { recursive: true });
  }
}
function readState(sessionId, logger2) {
  const stateFile = getStateFile(sessionId);
  if (existsSync2(stateFile)) {
    try {
      const content = readFileSync(stateFile, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      logger2?.debug("Failed to read state file", { error: String(error) });
    }
  }
  return { cliSkills: [] };
}
function writeState(sessionId, state, logger2) {
  ensureStateDir();
  const stateFile = getStateFile(sessionId);
  try {
    writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf-8");
  } catch (error) {
    logger2?.warn("Failed to write state file", { error: String(error) });
  }
}
function hasApiFailureBeenReported(sessionId, logger2) {
  const state = readState(sessionId, logger2);
  return state.apiFailureReported === true;
}
function markApiFailureReported(sessionId, logger2) {
  const state = readState(sessionId, logger2);
  state.apiFailureReported = true;
  writeState(sessionId, state, logger2);
}

// src/stop.ts
var stop_default = stopHook({}, async (input, { logger: logger2 }) => {
  if (process.env.EPHEMERAL_SESSION === "true") {
    return stopOutput({ decision: "approve" });
  }
  const sessionId = input.session_id;
  if (!sessionId) {
    return stopOutput({ decision: "approve" });
  }
  const issueId = process.env.ISSUE_ID;
  if (!issueId) {
    logger2.warn("ISSUE_ID not set - this hook requires the issue launcher");
    return stopOutput({
      decision: "approve",
      systemMessage: "Stop approved (no issue tracking)"
    });
  }
  let baseUrl;
  let diffResponse;
  try {
    baseUrl = discoverApiUrl(logger2);
    diffResponse = await fetchIssueDiff(sessionId, issueId, baseUrl, logger2);
  } catch (error) {
    logger2.debug("API error", { error: String(error) });
    if (hasApiFailureBeenReported(sessionId, logger2)) {
      logger2.debug("API failure already reported, approving stop to break loop");
      return stopOutput({
        decision: "approve",
        systemMessage: "Stop approved (API failure already reported)"
      });
    }
    markApiFailureReported(sessionId, logger2);
    return stopOutput({
      decision: "block",
      reason: `API unavailable: ${error instanceof Error ? error.message : String(error)}`,
      systemMessage: "The Issues API is unavailable. This is a catastrophic failure. Check that VSCode is running with the Compare Branch extension active."
    });
  }
  if (!hasUpdates(diffResponse)) {
    const dispatcherPid = getDispatcherPid();
    if (dispatcherPid) {
      await notifySessionStop(sessionId, dispatcherPid, baseUrl, logger2);
      signalIdle(dispatcherPid, logger2);
    }
    return stopOutput({
      decision: "approve",
      systemMessage: `Issue \`${issueId}\` has no updates.`
    });
  }
  const systemMsg = buildUpdateSummary(diffResponse);
  const patchJson = JSON.stringify(diffResponse.jsonPatch);
  return stopOutput({
    decision: "block",
    reason: `**Issue JSON patch**
\`\`\`json
${patchJson}
\`\`\``,
    systemMessage: systemMsg
  });
});

// ../../../../../tmp/claude-code-hooks-build/9991b2b10ede2d09/wrapper.ts
process.env["CLAUDE_CODE_HOOKS_CLI_LOG_FILE"] = "/workspace/hooks.log";
execute(stop_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvcmVtb3ZlLWNvbXBhcmUtYnJhbmNoLXZpZXcvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L291dHB1dHMuanMiLCAiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvcmVtb3ZlLWNvbXBhcmUtYnJhbmNoLXZpZXcvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2xvZ2dlci5qcyIsICIuLi8uLi8uLi93b3Jrc3BhY2UvLndvcmt0cmVlcy9yZW1vdmUtY29tcGFyZS1icmFuY2gtdmlldy9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvaG9va3MuanMiLCAiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvcmVtb3ZlLWNvbXBhcmUtYnJhbmNoLXZpZXcvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2Vudi5qcyIsICIuLi8uLi8uLi93b3Jrc3BhY2UvLndvcmt0cmVlcy9yZW1vdmUtY29tcGFyZS1icmFuY2gtdmlldy9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvcnVudGltZS5qcyIsICIuLi8uLi8uLi93b3Jrc3BhY2UvLndvcmt0cmVlcy9yZW1vdmUtY29tcGFyZS1icmFuY2gtdmlldy9wYWNrYWdlcy9jbGF1ZGUtY29kZS1jbGktaG9va3Mvc3JjL2xpYi9hcGkudHMiLCAiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvcmVtb3ZlLWNvbXBhcmUtYnJhbmNoLXZpZXcvcGFja2FnZXMvY2xhdWRlLWNvZGUtY2xpLWhvb2tzL3NyYy9saWIvaXBjLnRzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL3JlbW92ZS1jb21wYXJlLWJyYW5jaC12aWV3L3BhY2thZ2VzL2NsYXVkZS1jb2RlLWNsaS1ob29rcy9zcmMvbGliL291dHB1dC1oZWxwZXJzLnRzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL3JlbW92ZS1jb21wYXJlLWJyYW5jaC12aWV3L3BhY2thZ2VzL2NsYXVkZS1jb2RlLWNsaS1ob29rcy9zcmMvbGliL3N0YXRlLnRzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL3JlbW92ZS1jb21wYXJlLWJyYW5jaC12aWV3L3BhY2thZ2VzL2NsYXVkZS1jb2RlLWNsaS1ob29rcy9zcmMvc3RvcC50cyIsICJ3cmFwcGVyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIE91dHB1dCB0eXBlcyBhbmQgYnVpbGRlcnMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGUtc2FmZSBvdXRwdXQgYnVpbGRlciBmdW5jdGlvbnMgZm9yIGFsbCAxMiBob29rIHR5cGVzLiBFYWNoIGJ1aWxkZXJcbiAqIGFjY2VwdHMgb3B0aW9ucyB0aGF0IG1hdGNoIHRoZSB3aXJlIGZvcm1hdCBleHBlY3RlZCBieSBDbGF1ZGUgQ29kZSwgd2l0aCB0eXBlc1xuICogZGVyaXZlZCBmcm9tIHRoZSBDbGF1ZGUgQWdlbnQgU0RLJ3MgYFN5bmNIb29rSlNPTk91dHB1dGAgdHlwZS5cbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICogQG1vZHVsZVxuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGl0IENvZGUgQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEV4aXQgY29kZXMgdXNlZCBieSBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiB8IEV4aXQgQ29kZSB8IE5hbWUgfCBXaGVuIFVzZWQgfCBDbGF1ZGUgQ29kZSBCZWhhdmlvciB8XG4gKiB8LS0tLS0tLS0tLS18LS0tLS0tfC0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXxcbiAqIHwgMCB8IFN1Y2Nlc3MgfCBIYW5kbGVyIHJldHVybnMgbm9ybWFsbHkgfCBDb250aW51ZSwgcGFyc2Ugc3Rkb3V0IGFzIEpTT04gfFxuICogfCAxIHwgRXJyb3IgfCBJbnZhbGlkIGlucHV0LCBub24tYmxvY2tpbmcgZXJyb3IgfCBOb24tYmxvY2tpbmcsIHN0ZGVyciB0byB1c2VyIG9ubHkgfFxuICogfCAyIHwgQmxvY2sgfCBIYW5kbGVyIHRocm93cyBPUiBgc3RvcFJlYXNvbmAgc2V0IHwgQmxvY2tpbmcsIHN0ZGVyciBzaG93biB0byBDbGF1ZGUgfFxuICovXG5leHBvcnQgY29uc3QgRVhJVF9DT0RFUyA9IHtcbiAgLyoqIEhhbmRsZXIgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gQ2xhdWRlIENvZGUgcGFyc2VzIHN0ZG91dCBhcyBKU09OLiAqL1xuICBTVUNDRVNTOiAwLFxuICAvKiogTm9uLWJsb2NraW5nIGVycm9yIG9jY3VycmVkIChlLmcuLCBpbnZhbGlkIGlucHV0KS4gc3RkZXJyIHNob3duIHRvIHVzZXIgb25seS4gKi9cbiAgRVJST1I6IDEsXG4gIC8qKiBIYW5kbGVyIHRocmV3IGV4Y2VwdGlvbiBPUiBibG9ja2luZyBhY3Rpb24gcmVxdWVzdGVkLiBzdGRlcnIgc2hvd24gdG8gQ2xhdWRlLiAqL1xuICBCTE9DSzogMlxufTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE91dHB1dCBCdWlsZGVyIEZhY3Rvcmllc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IGhhdmUgaG9va1NwZWNpZmljT3V0cHV0IHdpdGggYSBob29rRXZlbnROYW1lIGRpc2NyaW1pbmF0b3IuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgcmV0dXJuIChvcHRpb25zID0ge30pID0+IHtcbiAgICBjb25zdCB7IGhvb2tTcGVjaWZpY091dHB1dCwgLi4ucmVzdCB9ID0gb3B0aW9ucztcbiAgICBjb25zdCBzdGRvdXQgPVxuICAgICAgaG9va1NwZWNpZmljT3V0cHV0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgPyB7IC4uLnJlc3QsIGhvb2tTcGVjaWZpY091dHB1dDogeyBob29rRXZlbnROYW1lOiBob29rVHlwZSwgLi4uaG9va1NwZWNpZmljT3V0cHV0IH0gfVxuICAgICAgICA6IHJlc3Q7XG4gICAgcmV0dXJuIHsgX3R5cGU6IGhvb2tUeXBlLCBzdGRvdXQgfTtcbiAgfTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCBvbmx5IHVzZSBDb21tb25PcHRpb25zIChzaW1wbGUgcGFzc3Rocm91Z2gpLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiAoe1xuICAgIF90eXBlOiBob29rVHlwZSxcbiAgICBzdGRvdXQ6IG9wdGlvbnNcbiAgfSk7XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgdXNlIGRlY2lzaW9uLWJhc2VkIG9wdGlvbnMgKFN0b3AsIFN1YmFnZW50U3RvcCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4gKHtcbiAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgc3Rkb3V0OiBvcHRpb25zXG4gIH0pO1xufVxuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlVG9vbFVzZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlVG9vbFVzZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdG9vbCBleGVjdXRpb25cbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnIH1cbiAqIH0pO1xuICpcbiAqIC8vIERlbnkgd2l0aCByZWFzb25cbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb246ICdkZW55JyxcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb25SZWFzb246ICdEYW5nZXJvdXMgY29tbWFuZCBkZXRlY3RlZCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQWxsb3cgd2l0aCBtb2RpZmllZCBpbnB1dFxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyxcbiAqICAgICB1cGRhdGVkSW5wdXQ6IHsgY29tbWFuZDogJ2xzIC1sYScgfVxuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcHJlVG9vbFVzZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKCdQcmVUb29sVXNlJyk7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0VG9vbFVzZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdFRvb2xVc2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGFmdGVyIGEgZmlsZSByZWFkXG4gKiBwb3N0VG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRmlsZSBjb250YWlucyBzZW5zaXRpdmUgZGF0YSdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RUb29sVXNlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoJ1Bvc3RUb29sVXNlJyk7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0VG9vbFVzZUZhaWx1cmUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdUcnkgdXNpbmcgYSBkaWZmZXJlbnQgYXBwcm9hY2gnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcignUG9zdFRvb2xVc2VGYWlsdXJlJyk7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBVc2VyUHJvbXB0U3VibWl0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBVc2VyUHJvbXB0U3VibWl0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB1c2VyUHJvbXB0U3VibWl0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdUaGlzIHByb2plY3QgdXNlcyBUeXBlU2NyaXB0IHN0cmljdCBtb2RlJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdXNlclByb21wdFN1Ym1pdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKCdVc2VyUHJvbXB0U3VibWl0Jyk7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXNzaW9uU3RhcnQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNlc3Npb25TdGFydE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc2Vzc2lvblN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IEpTT04uc3RyaW5naWZ5KHsgcHJvamVjdDogJ215LXByb2plY3QnIH0pXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXNzaW9uU3RhcnRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcignU2Vzc2lvblN0YXJ0Jyk7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXNzaW9uRW5kIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXNzaW9uRW5kT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzZXNzaW9uRW5kT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2Vzc2lvbkVuZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKCdTZXNzaW9uRW5kJyk7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdG9wIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0aGUgc3RvcFxuICogc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCByZWFzb25cbiAqIHN0b3BPdXRwdXQoe1xuICogICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgcmVhc29uOiAnVGhlcmUgYXJlIHVuY29tbWl0dGVkIGNoYW5nZXMnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoJ1N0b3AnKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN1YmFnZW50U3RhcnQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN1YmFnZW50U3RhcnRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZvY3VzIG9uIGZpbmRpbmcgcGF0dGVybnMnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdWJhZ2VudFN0YXJ0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoJ1N1YmFnZW50U3RhcnQnKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN1YmFnZW50U3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3ViYWdlbnRTdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1Rhc2sgbm90IGNvbXBsZXRlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoJ1N1YmFnZW50U3RvcCcpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgTm90aWZpY2F0aW9uIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBOb3RpZmljYXRpb25PdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGFib3V0IHRoZSBub3RpZmljYXRpb25cbiAqIG5vdGlmaWNhdGlvbk91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnTm90aWZpY2F0aW9uIGZvcndhcmRlZCB0byBTbGFjayAjYWxlcnRzIGNoYW5uZWwnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFN1cHByZXNzIHRoZSBub3RpZmljYXRpb25cbiAqIG5vdGlmaWNhdGlvbk91dHB1dCh7IHN1cHByZXNzT3V0cHV0OiB0cnVlIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBub3RpZmljYXRpb25PdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcignTm90aWZpY2F0aW9uJyk7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQcmVDb21wYWN0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQcmVDb21wYWN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwcmVDb21wYWN0T3V0cHV0KHtcbiAqICAgc3lzdGVtTWVzc2FnZTogJ1JlbWVtYmVyOiBzdHJpY3QgbW9kZSBpcyBlbmFibGVkJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHByZUNvbXBhY3RPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcignUHJlQ29tcGFjdCcpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUGVybWlzc2lvblJlcXVlc3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBdXRvLWFwcHJvdmVcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHsgYmVoYXZpb3I6ICdhbGxvdycgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBdXRvLWFwcHJvdmUgd2l0aCBtb2RpZmllZCBpbnB1dFxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdhbGxvdycsXG4gKiAgICAgICB1cGRhdGVkSW5wdXQ6IHsgZmlsZV9wYXRoOiAnL3NhZmUvcGF0aCcgfVxuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1kZW55XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7XG4gKiAgICAgICBiZWhhdmlvcjogJ2RlbnknLFxuICogICAgICAgbWVzc2FnZTogJ05vdCBhbGxvd2VkJyxcbiAqICAgICAgIGludGVycnVwdDogdHJ1ZVxuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gRmFsbCB0aHJvdWdoIHRvIG5vcm1hbCBwcm9tcHRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcGVybWlzc2lvblJlcXVlc3RPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcignUGVybWlzc2lvblJlcXVlc3QnKTtcbiIsICIvKipcbiAqIExvZ2dlciBzeXN0ZW0gZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHN0cnVjdHVyZWQgbG9nZ2luZyB3aXRoIGV2ZW50IHN1YnNjcmlwdGlvbiBhbmQgb3B0aW9uYWwgZmlsZSBvdXRwdXQuXG4gKiBUaGUgbG9nZ2VyIGlzICoqc2lsZW50IGJ5IGRlZmF1bHQqKiB0byBhdm9pZCBpbnRlcmZlcmluZyB3aXRoIGhvb2sgcHJvdG9jb2xcbiAqIChzdGRvdXQgaXMgcmVzZXJ2ZWQgZm9yIEpTT04gcmVzcG9uc2VzLCBzdGRlcnIgbWF5IGNvbmZsaWN0IHdpdGggQ2xhdWRlIENvZGUpLlxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGxvZyBldmVudHNcbiAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICogICBjb25zb2xlLmVycm9yKGBFcnJvciBpbiAke2V2ZW50Lmhvb2tUeXBlfTogJHtldmVudC5tZXNzYWdlfWApO1xuICogfSk7XG4gKlxuICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gKiB1bnN1YnNjcmliZSgpO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuaW1wb3J0IHsgY2xvc2VTeW5jLCBleGlzdHNTeW5jLCBta2RpclN5bmMsIG9wZW5TeW5jLCB3cml0ZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tICdub2RlOnBhdGgnO1xuLyoqXG4gKiBBbGwgbG9nIGxldmVscyBpbiBvcmRlciBvZiBzZXZlcml0eSAobG93ZXN0IHRvIGhpZ2hlc3QpLlxuICovXG5leHBvcnQgY29uc3QgTE9HX0xFVkVMUyA9IFsnZGVidWcnLCAnaW5mbycsICd3YXJuJywgJ2Vycm9yJ107XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogTG9nZ2VyIGZvciBDbGF1ZGUgQ29kZSBob29rcyB3aXRoIGV2ZW50IHN1YnNjcmlwdGlvbiBhbmQgZmlsZSBvdXRwdXQuXG4gKlxuICogIyMgS2V5IEJlaGF2aW9yc1xuICpcbiAqIHwgQ29uZmlndXJhdGlvbiB8IEJlaGF2aW9yIHxcbiAqIHwtLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tfFxuICogfCBObyBjb25maWcgKGRlZmF1bHQpIHwgKipTaWxlbnQqKiAtIG5vIG91dHB1dCBhbnl3aGVyZSB8XG4gKiB8IGBDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRWAgZW52IHZhciB8IEFwcGVuZCBKU09OIGxpbmVzIHRvIGZpbGUgfFxuICogfCBgLm9uKGxldmVsLCBoYW5kbGVyKWAgcmVnaXN0ZXJlZCB8IEV2ZW50cyBkZWxpdmVyZWQgdG8gaGFuZGxlcnMgb25seSB8XG4gKiB8IE11bHRpcGxlIGRlc3RpbmF0aW9ucyB8IEFsbCBkZXN0aW5hdGlvbnMgcmVjZWl2ZSBldmVudHMgfFxuICpcbiAqICMjIEltcG9ydGFudCBOb3Rlc1xuICpcbiAqIC0gKipOZXZlciBvdXRwdXRzIHRvIHN0ZG91dCoqIChyZXNlcnZlZCBmb3IgSlNPTiBob29rIHJlc3BvbnNlKVxuICogLSAqKk5ldmVyIG91dHB1dHMgdG8gc3RkZXJyKiogKG1heSBpbnRlcmZlcmUgd2l0aCBDbGF1ZGUgQ29kZSBlcnJvciBoYW5kbGluZylcbiAqIC0gRmlsZSBvdXRwdXQgdXNlcyBKU09OIExpbmVzIGZvcm1hdCBmb3IgZWFzeSBwYXJzaW5nXG4gKiAtIGAub24obGV2ZWwsIGhhbmRsZXIpYCByZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gZXZlbnRzIGF0IHNwZWNpZmljIGxldmVsXG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHtcbiAqICAgc2VuZEFsZXJ0KGV2ZW50Lm1lc3NhZ2UpO1xuICogfSk7XG4gKlxuICogLy8gTG9nIHdpdGhpbiBhIGhvb2sgaGFuZGxlclxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci53YXJuKCdBYm91dCB0byB2YWxpZGF0ZSBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuICAvKipcbiAgICogUmVnaXN0ZXJlZCBldmVudCBoYW5kbGVycyBieSBsb2cgbGV2ZWwuXG4gICAqL1xuICBoYW5kbGVycyA9IG5ldyBNYXAoKTtcbiAgLyoqXG4gICAqIEZpbGUgZGVzY3JpcHRvciBmb3IgbG9nIGZpbGUgb3V0cHV0LlxuICAgKiBMYXppbHkgaW5pdGlhbGl6ZWQgb24gZmlyc3Qgd3JpdGUuXG4gICAqL1xuICBsb2dGaWxlRmQgPSBudWxsO1xuICAvKipcbiAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUsIGlmIGNvbmZpZ3VyZWQuXG4gICAqL1xuICBsb2dGaWxlUGF0aCA9IG51bGw7XG4gIC8qKlxuICAgKiBXaGV0aGVyIGZpbGUgaW5pdGlhbGl6YXRpb24gaGFzIGJlZW4gYXR0ZW1wdGVkLlxuICAgKi9cbiAgZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gIC8qKlxuICAgKiBDdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqL1xuICBjdXJyZW50SG9va1R5cGU7XG4gIC8qKlxuICAgKiBDdXJyZW50IGhvb2sgaW5wdXQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKi9cbiAgY3VycmVudElucHV0O1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBMb2dnZXIgaW5zdGFuY2UuXG4gICAqXG4gICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAqIGNyZWF0aW5nIG5ldyBpbnN0YW5jZXMuXG4gICAqIEBwYXJhbSBjb25maWcgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gVXNlIHNpbmdsZXRvbiAocmVjb21tZW5kZWQpXG4gICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gICAqXG4gICAqIC8vIE9yIGNyZWF0ZSBjdXN0b20gaW5zdGFuY2VcbiAgICogY29uc3QgY3VzdG9tTG9nZ2VyID0gbmV3IExvZ2dlcih7IGxvZ0ZpbGVQYXRoOiAnL3Zhci9sb2cvaG9va3MubG9nJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnMgbWFwIGZvciBlYWNoIGxldmVsXG4gICAgZm9yIChjb25zdCBsZXZlbCBvZiBMT0dfTEVWRUxTKSB7XG4gICAgICB0aGlzLmhhbmRsZXJzLnNldChsZXZlbCwgbmV3IFNldCgpKTtcbiAgICB9XG4gICAgLy8gU2V0IGxvZyBmaWxlIHBhdGggZnJvbSBjb25maWcgb3IgZW52aXJvbm1lbnRcbiAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gY29uZmlnLmxvZ0ZpbGVQYXRoID8/IHByb2Nlc3MuZW52WydDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRSddID8/IG51bGw7XG4gIH1cbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGRldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB0aGF0IGlzIHR5cGljYWxseSBvbmx5IHVzZWZ1bFxuICAgKiBkdXJpbmcgZGV2ZWxvcG1lbnQgb3IgdHJvdWJsZXNob290aW5nLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBkZWJ1ZyBtZXNzYWdlXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmRlYnVnKCdQcm9jZXNzaW5nIHRvb2wgaW5wdXQnLCB7IHRvb2xOYW1lOiAnQmFzaCcsIGlucHV0U2l6ZTogMjU2IH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGRlYnVnKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICB0aGlzLmVtaXQoJ2RlYnVnJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cbiAgLyoqXG4gICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIGxpa2UgaG9vayBpbnZvY2F0aW9ucywgc3VjY2Vzc2Z1bFxuICAgKiBjb21wbGV0aW9ucywgb3Igc3RhdGUgY2hhbmdlcy5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgaW5mbyBtZXNzYWdlXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmluZm8oJ1Nlc3Npb24gc3RhcnRlZCcsIHsgc291cmNlOiAnc3RhcnR1cCcsIHNlc3Npb25JZDogJ2FiYzEyMycgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgaW5mbyhtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgdGhpcy5lbWl0KCdpbmZvJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgY29uZGl0aW9ucyB0aGF0IG1heSBpbmRpY2F0ZSBpc3N1ZXMgYnV0IGRvbid0IHByZXZlbnRcbiAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIHdhcm5pbmcgbWVzc2FnZVxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci53YXJuKCdEZXByZWNhdGVkIGhvb2sgcGF0dGVybiBkZXRlY3RlZCcsIHsgcGF0dGVybjogJ2xlZ2FjeU1hdGNoZXInIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHdhcm4obWVzc2FnZSwgY29udGV4dCkge1xuICAgIHRoaXMuZW1pdCgnd2FybicsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG4gIC8qKlxuICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZXJyb3IgY29uZGl0aW9ucyB0aGF0IHJlcXVpcmUgYXR0ZW50aW9uIGJ1dCB3ZXJlIGhhbmRsZWRcbiAgICogZ3JhY2VmdWxseS4gRm9yIGV4Y2VwdGlvbnMsIHByZWZlciB7QGxpbmsgbG9nRXJyb3J9LlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBlcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gdmFsaWRhdGUgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgcmVhc29uOiAnZW1wdHkgY29tbWFuZCcgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZXJyb3IobWVzc2FnZSwgY29udGV4dCkge1xuICAgIHRoaXMuZW1pdCgnZXJyb3InLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuICAvKipcbiAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAqXG4gICAqIFVzZSB0aGlzIG1ldGhvZCB3aGVuIGxvZ2dpbmcgY2F1Z2h0IGV4Y2VwdGlvbnMgdG8gY2FwdHVyZSB0aGUgZnVsbFxuICAgKiBlcnJvciBjb250ZXh0IGluY2x1ZGluZyBuYW1lLCBtZXNzYWdlLCBzdGFjayB0cmFjZSwgYW5kIGNhdXNlIGNoYWluLlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gbG9nXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiB0cnkge1xuICAgKiAgIGF3YWl0IGRhbmdlcm91c09wZXJhdGlvbigpO1xuICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnRmFpbGVkIHRvIGV4ZWN1dGUgZGFuZ2Vyb3VzIG9wZXJhdGlvbicsIHtcbiAgICogICAgIG9wZXJhdGlvbjogJ2RlbGV0ZScsXG4gICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgKiAgIH0pO1xuICAgKiB9XG4gICAqIGBgYFxuICAgKi9cbiAgbG9nRXJyb3IoZXJyb3IsIG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICBjb25zdCBlcnJvckluZm8gPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IpO1xuICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBsZXZlbDogJ2Vycm9yJyxcbiAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICBlcnJvcjogZXJyb3JJbmZvLFxuICAgICAgY29udGV4dFxuICAgIH07XG4gICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICB9XG4gIC8qKlxuICAgKiBTdWJzY3JpYmVzIGEgaGFuZGxlciB0byBsb2cgZXZlbnRzIGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAqXG4gICAqIFRoZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBsb2cgZXZlbnQgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICogUmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSBjYWxsZWQgd2hlbiB0aGUgaGFuZGxlclxuICAgKiBpcyBubyBsb25nZXIgbmVlZGVkLlxuICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgbG9nIGxldmVsIHRvIHN1YnNjcmliZSB0b1xuICAgKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggZXZlbnRcbiAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byB1bnN1YnNjcmliZSB0aGUgaGFuZGxlclxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFN1YnNjcmliZSB0byBlcnJvciBldmVudHNcbiAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gICAqICAgY29uc29sZS5lcnJvcihgWyR7ZXZlbnQuaG9va1R5cGV9XSAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gICAqICAgaWYgKGV2ZW50LmVycm9yKSB7XG4gICAqICAgICBjb25zb2xlLmVycm9yKGV2ZW50LmVycm9yLnN0YWNrKTtcbiAgICogICB9XG4gICAqIH0pO1xuICAgKlxuICAgKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAgICogdW5zdWJzY3JpYmUoKTtcbiAgICogYGBgXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIGxpYnJhcnlcbiAgICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gICAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKCk7XG4gICAqXG4gICAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogYGBgXG4gICAqL1xuICBvbihsZXZlbCwgaGFuZGxlcikge1xuICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChsZXZlbCk7XG4gICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgIGxldmVsSGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICAgIH1cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgbGV2ZWxIYW5kbGVycz8uZGVsZXRlKGhhbmRsZXIpO1xuICAgIH07XG4gIH1cbiAgLyoqXG4gICAqIFNldHMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICpcbiAgICogVGhpcyBpcyBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBiZWZvcmUgaW52b2tpbmcgaG9vayBoYW5kbGVycy5cbiAgICogWW91IHR5cGljYWxseSBkb24ndCBuZWVkIHRvIGNhbGwgdGhpcyBkaXJlY3RseS5cbiAgICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIHR5cGUgb2YgaG9vayBiZWluZyBleGVjdXRlZFxuICAgKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCBkYXRhXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc2V0Q29udGV4dChob29rVHlwZSwgaW5wdXQpIHtcbiAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IGhvb2tUeXBlO1xuICAgIHRoaXMuY3VycmVudElucHV0ID0gaW5wdXQ7XG4gIH1cbiAgLyoqXG4gICAqIENsZWFycyB0aGUgY3VycmVudCBob29rIGNvbnRleHQuXG4gICAqXG4gICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBjbGVhckNvbnRleHQoKSB7XG4gICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5jdXJyZW50SW5wdXQgPSB1bmRlZmluZWQ7XG4gIH1cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgdGhlIGxvZyBmaWxlIHBhdGggYXQgcnVudGltZS5cbiAgICpcbiAgICogQ2FsbCB0aGlzIHRvIGVuYWJsZSBvciBjaGFuZ2UgZmlsZSBsb2dnaW5nLiBTZXR0aW5nIHRvIGBudWxsYCBkaXNhYmxlc1xuICAgKiBmaWxlIGxvZ2dpbmcgKGJ1dCBkb2Vzbid0IGNsb3NlIGV4aXN0aW5nIGZpbGUgaGFuZGxlIGltbWVkaWF0ZWx5KS5cbiAgICogQHBhcmFtIGZpbGVQYXRoIC0gUGF0aCB0byB0aGUgbG9nIGZpbGUsIG9yIG51bGwgdG8gZGlzYWJsZVxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIEVuYWJsZSBmaWxlIGxvZ2dpbmcgYXQgcnVudGltZVxuICAgKiBsb2dnZXIuc2V0TG9nRmlsZSgnL3Zhci9sb2cvY2xhdWRlLWhvb2tzLmxvZycpO1xuICAgKlxuICAgKiAvLyBEaXNhYmxlIGZpbGUgbG9nZ2luZ1xuICAgKiBsb2dnZXIuc2V0TG9nRmlsZShudWxsKTtcbiAgICogYGBgXG4gICAqL1xuICBzZXRMb2dGaWxlKGZpbGVQYXRoKSB7XG4gICAgLy8gQ2xvc2UgZXhpc3RpbmcgZmlsZSBpZiBvcGVuXG4gICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgIH1cbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gIH1cbiAgLyoqXG4gICAqIENsb3NlcyBhbGwgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIGxvZ2dlci5cbiAgICpcbiAgICogQ2FsbCB0aGlzIGR1cmluZyBncmFjZWZ1bCBzaHV0ZG93biB0byBlbnN1cmUgYWxsIGxvZyBkYXRhIGlzIGZsdXNoZWQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHtcbiAgICogICBsb2dnZXIuY2xvc2UoKTtcbiAgICogfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY2xvc2UoKSB7XG4gICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgIH1cbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgfVxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZXJlIGFyZSBhbnkgYWN0aXZlIGhhbmRsZXJzIG9yIGRlc3RpbmF0aW9ucy5cbiAgICpcbiAgICogUmV0dXJucyB0cnVlIGlmIGFueSBoYW5kbGVycyBhcmUgcmVnaXN0ZXJlZCBvciBmaWxlIGxvZ2dpbmcgaXMgZW5hYmxlZC5cbiAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICovXG4gIGhhc0Rlc3RpbmF0aW9ucygpIHtcbiAgICBmb3IgKGNvbnN0IGhhbmRsZXJzIG9mIHRoaXMuaGFuZGxlcnMudmFsdWVzKCkpIHtcbiAgICAgIGlmIChoYW5kbGVycy5zaXplID4gMCkgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmxvZ0ZpbGVQYXRoICE9PSBudWxsO1xuICB9XG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLyoqXG4gICAqIEVtaXRzIGEgbG9nIGV2ZW50LlxuICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgc2V2ZXJpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50XG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGxvZyBtZXNzYWdlXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0IGRhdGFcbiAgICovXG4gIGVtaXQobGV2ZWwsIG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICBjb25zdCBldmVudCA9IHtcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgbGV2ZWwsXG4gICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgY29udGV4dFxuICAgIH07XG4gICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICB9XG4gIC8qKlxuICAgKiBEZWxpdmVycyBhbiBldmVudCB0byBhbGwgcmVnaXN0ZXJlZCBkZXN0aW5hdGlvbnMuXG4gICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gZGVsaXZlclxuICAgKi9cbiAgZGVsaXZlckV2ZW50KGV2ZW50KSB7XG4gICAgLy8gRGVsaXZlciB0byBldmVudCBoYW5kbGVyc1xuICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChldmVudC5sZXZlbCk7XG4gICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaGFuZGxlcihldmVudCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBoYW5kbGVyIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFdyaXRlIHRvIGZpbGUgaWYgY29uZmlndXJlZFxuICAgIHRoaXMud3JpdGVUb0ZpbGUoZXZlbnQpO1xuICB9XG4gIC8qKlxuICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIHdyaXRlXG4gICAqL1xuICB3cml0ZVRvRmlsZShldmVudCkge1xuICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xuICAgIC8vIExhenkgaW5pdGlhbGl6YXRpb24gb2YgZmlsZSBoYW5kbGVcbiAgICBpZiAoIXRoaXMuZmlsZUluaXRpYWxpemVkKSB7XG4gICAgICB0aGlzLmluaXRpYWxpemVGaWxlKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCA9PT0gbnVsbCkgcmV0dXJuO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBsaW5lID0gSlNPTi5zdHJpbmdpZnkoZXZlbnQpICsgJ1xcbic7XG4gICAgICB3cml0ZVN5bmModGhpcy5sb2dGaWxlRmQsIGxpbmUpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgd3JpdGUgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAvLyBUaGlzIGZvbGxvd3MgdGhlIHJpc2sgbWl0aWdhdGlvbjogXCJHcmFjZWZ1bCBkZWdyYWRhdGlvbiAtIGxvZyB3cml0ZVxuICAgICAgLy8gZmFpbHVyZXMgYXJlIHNpbGVudGx5IGlnbm9yZWQgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cIlxuICAgIH1cbiAgfVxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGxvZyBmaWxlIGZvciB3cml0aW5nLlxuICAgKi9cbiAgaW5pdGlhbGl6ZUZpbGUoKSB7XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xuICAgIHRyeSB7XG4gICAgICAvLyBFbnN1cmUgZGlyZWN0b3J5IGV4aXN0c1xuICAgICAgY29uc3QgZGlyID0gZGlybmFtZSh0aGlzLmxvZ0ZpbGVQYXRoKTtcbiAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgLy8gT3BlbiBmaWxlIGZvciBhcHBlbmRpbmdcbiAgICAgIHRoaXMubG9nRmlsZUZkID0gb3BlblN5bmModGhpcy5sb2dGaWxlUGF0aCwgJ2EnKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIGluaXRpYWxpemF0aW9uIGVycm9yc1xuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cbiAgfVxuICAvKipcbiAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBleHRyYWN0IGluZm9ybWF0aW9uIGZyb21cbiAgICogQHJldHVybnMgU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvblxuICAgKi9cbiAgZXh0cmFjdEVycm9ySW5mbyhlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICBjb25zdCBpbmZvID0ge1xuICAgICAgICBuYW1lOiBlcnJvci5uYW1lLFxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2tcbiAgICAgIH07XG4gICAgICAvLyBFeHRyYWN0IGNhdXNlIGNoYWluIGlmIHByZXNlbnRcbiAgICAgIGlmIChlcnJvci5jYXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGluZm8uY2F1c2UgPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IuY2F1c2UpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGluZm87XG4gICAgfVxuICAgIC8vIEhhbmRsZSBub24tRXJyb3IgdmFsdWVzXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICdVbmtub3duRXJyb3InLFxuICAgICAgbWVzc2FnZTogU3RyaW5nKGVycm9yKVxuICAgIH07XG4gIH1cbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNpbmdsZXRvbiBFeHBvcnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogVXNlIHRoaXMgc2luZ2xldG9uIGZvciBhbGwgbG9nZ2luZyB3aXRoaW4gaG9va3MuIFRoZSBsb2dnZXIgaXMgY29uZmlndXJlZFxuICogdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgc3VwcG9ydHMgZXZlbnQgc3Vic2NyaXB0aW9uIGZvciBjdXN0b21cbiAqIGRlc3RpbmF0aW9ucy5cbiAqXG4gKiAjIyBDb25maWd1cmF0aW9uXG4gKlxuICogfCBFbnZpcm9ubWVudCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHxcbiAqIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCB8IFBhdGggdG8gbG9nIGZpbGUgKEpTT04gTGluZXMgZm9ybWF0KSB8XG4gKlxuICogIyMgVXNhZ2UgaW4gSG9va3NcbiAqXG4gKiBUaGUgbG9nZ2VyIGlzIHBhc3NlZCB0byBob29rIGhhbmRsZXJzIHZpYSBjb250ZXh0IGZvciBjb252ZW5pZW5jZTpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ1ZhbGlkYXRpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gKlxuICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oeyBsZXZlbDogJ2RlYnVnJyB9KTtcbiAqXG4gKiBsb2dnZXIub24oJ2RlYnVnJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmRlYnVnKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIERpcmVjdCB1c2FnZVxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBsb2dnZXIuaW5mbygnU3RhcnRpbmcgb3BlcmF0aW9uJyk7XG4gKiBsb2dnZXIud2FybignUmVzb3VyY2UgbGltaXQgYXBwcm9hY2hpbmcnLCB7IHVzYWdlOiAwLjkgfSk7XG4gKlxuICogdHJ5IHtcbiAqICAgYXdhaXQgcmlza3lPcGVyYXRpb24oKTtcbiAqIH0gY2F0Y2ggKGVycikge1xuICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnUmlza3kgb3BlcmF0aW9uIGZhaWxlZCcpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG4iLCAiLyoqXG4gKiBIb29rIGZhY3RvcnkgZnVuY3Rpb25zIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBmYWN0b3J5IGZ1bmN0aW9ucyBmb3IgYWxsIDEyIGhvb2sgdHlwZXMgdGhhdCBoYW5kbGU6XG4gKiAtIElucHV0IHR5cGUgbmFycm93aW5nIGJhc2VkIG9uIGhvb2sgZXZlbnQgdHlwZVxuICogLSBPdXRwdXQgdHlwZSBlbmZvcmNlbWVudCB2aWEgcmV0dXJuIHR5cGVzXG4gKiAtIEVycm9yIHdyYXBwaW5nIHdpdGggYXV0b21hdGljIGxvZ2dpbmdcbiAqIC0gTG9nZ2VyIGNvbnRleHQgaW5qZWN0aW9uXG4gKlxuICogRWFjaCBmYWN0b3J5IGFjY2VwdHMgYSBIb29rQ29uZmlnIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dCBzZXR0aW5ncyxcbiAqIGFuZCByZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB0aGUgcnVudGltZSBpbnZva2VzIHdoZW4gdGhlIGhvb2sgZmlsZSBleGVjdXRlcy5cbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBHZW5lcmljIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIGhvb2sgZmFjdG9yeSBmdW5jdGlvbiBmb3IgYSBzcGVjaWZpYyBob29rIHR5cGUuXG4gKlxuICogVGhpcyBpcyB0aGUgaW50ZXJuYWwgaW1wbGVtZW50YXRpb24gdXNlZCBieSBhbGwgdHlwZWQgZmFjdG9yaWVzLlxuICogSXQgd3JhcHMgdGhlIGhhbmRsZXIgd2l0aCBlcnJvciBjYXRjaGluZyBhbmQgbG9nZ2luZy5cbiAqIEBwYXJhbSBob29rRXZlbnROYW1lIC0gVGhlIGhvb2sgZXZlbnQgbmFtZVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvblxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byB3cmFwXG4gKiBAcmV0dXJucyBBIHdyYXBwZWQgaG9vayBmdW5jdGlvblxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tGdW5jdGlvbihob29rRXZlbnROYW1lLCBjb25maWcsIGhhbmRsZXIpIHtcbiAgY29uc3QgaG9va0ZuID0gYXN5bmMgKGlucHV0LCBjb250ZXh0KSA9PiB7XG4gICAgLy8gRGVsZWdhdGUgZXJyb3IgaGFuZGxpbmcgdG8gdGhlIHJ1bnRpbWUgLSBqdXN0IGV4ZWN1dGUgdGhlIGhhbmRsZXJcbiAgICAvLyBUaGUgcnVudGltZSB3aWxsIGNhdGNoIGVycm9ycywgbG9nIHRoZW0sIGFuZCByZXR1cm4gYXBwcm9wcmlhdGUgb3V0cHV0XG4gICAgcmV0dXJuIGF3YWl0IGhhbmRsZXIoaW5wdXQsIGNvbnRleHQpO1xuICB9O1xuICAvLyBBdHRhY2ggbWV0YWRhdGEgZm9yIHJ1bnRpbWUgaW5zcGVjdGlvblxuICBob29rRm4uaG9va0V2ZW50TmFtZSA9IGhvb2tFdmVudE5hbWU7XG4gIGhvb2tGbi5tYXRjaGVyID0gY29uZmlnLm1hdGNoZXI7XG4gIGhvb2tGbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gIHJldHVybiBob29rRm47XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVUb29sVXNlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbignUHJlVG9vbFVzZScsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0VG9vbFVzZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oJ1Bvc3RUb29sVXNlJywgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3RUb29sVXNlRmFpbHVyZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oJ1Bvc3RUb29sVXNlRmFpbHVyZScsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBOb3RpZmljYXRpb24gSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBOb3RpZmljYXRpb24gaG9vayBoYW5kbGVyLlxuICpcbiAqIE5vdGlmaWNhdGlvbiBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgc2VuZHMgYSBub3RpZmljYXRpb24sIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gRm9yd2FyZCBub3RpZmljYXRpb25zIHRvIGV4dGVybmFsIHN5c3RlbXNcbiAqIC0gTG9nIGltcG9ydGFudCBldmVudHNcbiAqIC0gVHJpZ2dlciBjdXN0b20gYWxlcnRpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBub3RpZmljYXRpb25fdHlwZWBcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBub3RpZmljYXRpb25Ib29rLCBub3RpZmljYXRpb25PdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEZvcndhcmQgbm90aWZpY2F0aW9ucyB0byBTbGFja1xuICogZXhwb3J0IGRlZmF1bHQgbm90aWZpY2F0aW9uSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdOb3RpZmljYXRpb24gcmVjZWl2ZWQnLCB7XG4gKiAgICAgdHlwZTogaW5wdXQubm90aWZpY2F0aW9uX3R5cGUsXG4gKiAgICAgdGl0bGU6IGlucHV0LnRpdGxlXG4gKiAgIH0pO1xuICpcbiAqICAgYXdhaXQgc2VuZFNsYWNrTWVzc2FnZShpbnB1dC50aXRsZSA/PyAnTm90aWZpY2F0aW9uJywgaW5wdXQubWVzc2FnZSk7XG4gKlxuICogICByZXR1cm4gbm90aWZpY2F0aW9uT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjbm90aWZpY2F0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RpZmljYXRpb25Ib29rKGNvbmZpZywgaGFuZGxlcikge1xuICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKCdOb3RpZmljYXRpb24nLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVXNlclByb21wdFN1Ym1pdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFVzZXJQcm9tcHRTdWJtaXQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFVzZXJQcm9tcHRTdWJtaXQgaG9va3MgZmlyZSB3aGVuIGEgdXNlciBzdWJtaXRzIGEgcHJvbXB0LCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFkZCBhZGRpdGlvbmFsIGNvbnRleHQgb3IgaW5zdHJ1Y3Rpb25zXG4gKiAtIExvZyB1c2VyIGludGVyYWN0aW9uc1xuICogLSBWYWxpZGF0ZSBvciB0cmFuc2Zvcm0gcHJvbXB0c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgcHJvbXB0IHN1Ym1pc3Npb25zXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdXNlclByb21wdFN1Ym1pdEhvb2ssIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEFkZCBwcm9qZWN0IGNvbnRleHQgdG8gZXZlcnkgcHJvbXB0XG4gKiBleHBvcnQgZGVmYXVsdCB1c2VyUHJvbXB0U3VibWl0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5kZWJ1ZygnVXNlciBwcm9tcHQgc3VibWl0dGVkJywgeyBwcm9tcHRMZW5ndGg6IGlucHV0LnByb21wdC5sZW5ndGggfSk7XG4gKlxuICogICBjb25zdCBwcm9qZWN0Q29udGV4dCA9IGF3YWl0IGdldFByb2plY3RDb250ZXh0KCk7XG4gKlxuICogICByZXR1cm4gdXNlclByb21wdFN1Ym1pdE91dHB1dCh7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IHByb2plY3RDb250ZXh0XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN1c2VycHJvbXB0c3VibWl0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VyUHJvbXB0U3VibWl0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbignVXNlclByb21wdFN1Ym1pdCcsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXNzaW9uU3RhcnQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXNzaW9uU3RhcnQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNlc3Npb25TdGFydCBob29rcyBmaXJlIHdoZW4gYSBDbGF1ZGUgQ29kZSBzZXNzaW9uIHN0YXJ0cyBvciByZXN0YXJ0cyxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gSW5pdGlhbGl6ZSBzZXNzaW9uIHN0YXRlXG4gKiAtIEluamVjdCBjb250ZXh0IG9yIGluc3RydWN0aW9uc1xuICogLSBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3Igc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzXG4gKiAtIFNldCB1cCBsb2dnaW5nIG9yIG1vbml0b3JpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBzb3VyY2VgICgnc3RhcnR1cCcsICdyZXN1bWUnLCAnY2xlYXInLCAnY29tcGFjdCcpXG4gKlxuICogKipDb250ZXh0Kio6IFNlc3Npb25TdGFydCBob29rcyByZWNlaXZlIGFuIGV4dGVuZGVkIGNvbnRleHQgd2l0aCBgcGVyc2lzdEVudlZhcmBcbiAqIGFuZCBgcGVyc2lzdEVudlZhcnNgIGZ1bmN0aW9ucyBmb3Igc2V0dGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvblN0YXJ0SG9vaywgc2Vzc2lvblN0YXJ0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgdGhlIHNlc3Npb25cbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soeyBtYXRjaGVyOiAnc3RhcnR1cCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciwgcGVyc2lzdEVudlZhciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdOZXcgc2Vzc2lvbiBzdGFydGVkJywge1xuICogICAgIHNlc3Npb25JZDogaW5wdXQuc2Vzc2lvbl9pZCxcbiAqICAgICBjd2Q6IGlucHV0LmN3ZFxuICogICB9KTtcbiAqXG4gKiAgIC8vIFNldCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHNcbiAqICAgcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAnZGV2ZWxvcG1lbnQnKTtcbiAqICAgcGVyc2lzdEVudlZhcignREVCVUcnLCAndHJ1ZScpO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFNldCBtdWx0aXBsZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYXQgb25jZVxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IHBlcnNpc3RFbnZWYXJzIH0pID0+IHtcbiAqICAgcGVyc2lzdEVudlZhcnMoe1xuICogICAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gKiAgICAgQVBJX0tFWTogJ3NlY3JldCcsXG4gKiAgICAgREVCVUc6ICdmYWxzZSdcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbnN0YXJ0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXNzaW9uU3RhcnRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKCdTZXNzaW9uU3RhcnQnLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2Vzc2lvbkVuZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNlc3Npb25FbmQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNlc3Npb25FbmQgaG9va3MgZmlyZSB3aGVuIGEgQ2xhdWRlIENvZGUgc2Vzc2lvbiBlbmRzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENsZWFuIHVwIHNlc3Npb24gcmVzb3VyY2VzXG4gKiAtIExvZyBzZXNzaW9uIG1ldHJpY3NcbiAqIC0gUGVyc2lzdCBzZXNzaW9uIHN0YXRlXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgcmVhc29uYCAodGhlIGV4aXQgcmVhc29uIHN0cmluZylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uRW5kSG9vaywgc2Vzc2lvbkVuZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHNlc3Npb24gZW5kIGFuZCBjbGVhbiB1cFxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvbkVuZEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU2Vzc2lvbiBlbmRlZCcsIHtcbiAqICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gKiAgICAgcmVhc29uOiBpbnB1dC5yZWFzb25cbiAqICAgfSk7XG4gKlxuICogICBhd2FpdCBjbGVhbnVwU2Vzc2lvblJlc291cmNlcyhpbnB1dC5zZXNzaW9uX2lkKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uRW5kT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbmVuZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvbkVuZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oJ1Nlc3Npb25FbmQnLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RvcCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN0b3AgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN0b3AgaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIGlzIGFib3V0IHRvIHN0b3AsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQmxvY2sgdGhlIHN0b3AgYW5kIHJlcXVpcmUgYWRkaXRpb25hbCBhY3Rpb25cbiAqIC0gQ29uZmlybSB0aGUgdXNlciB3YW50cyB0byBzdG9wXG4gKiAtIENsZWFuIHVwIHJlc291cmNlcyBiZWZvcmUgc3RvcHBpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHN0b3AgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3RvcEhvb2ssIHN0b3BPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEJsb2NrIHN0b3AgaWYgdGhlcmUgYXJlIHBlbmRpbmcgY2hhbmdlc1xuICogZXhwb3J0IGRlZmF1bHQgc3RvcEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBjb25zdCBwZW5kaW5nQ2hhbmdlcyA9IGF3YWl0IGNoZWNrUGVuZGluZ0NoYW5nZXMoKTtcbiAqXG4gKiAgIGlmIChwZW5kaW5nQ2hhbmdlcy5sZW5ndGggPiAwKSB7XG4gKiAgICAgbG9nZ2VyLndhcm4oJ0Jsb2NraW5nIHN0b3AgZHVlIHRvIHBlbmRpbmcgY2hhbmdlcycsIHtcbiAqICAgICAgIGNvdW50OiBwZW5kaW5nQ2hhbmdlcy5sZW5ndGhcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICogICAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgICByZWFzb246IGBUaGVyZSBhcmUgJHtwZW5kaW5nQ2hhbmdlcy5sZW5ndGh9IHVuY29tbWl0dGVkIGNoYW5nZXNgLFxuICogICAgICAgc3lzdGVtTWVzc2FnZTogJ1BsZWFzZSBjb21taXQgb3IgZGlzY2FyZCBjaGFuZ2VzIGJlZm9yZSBzdG9wcGluZydcbiAqICAgICB9KTtcbiAqICAgfVxuICpcbiAqICAgbG9nZ2VyLmluZm8oJ0FwcHJvdmluZyBzdG9wJyk7XG4gKiAgIHJldHVybiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oJ1N0b3AnLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3ViYWdlbnRTdGFydCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN1YmFnZW50U3RhcnQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN1YmFnZW50U3RhcnQgaG9va3MgZmlyZSB3aGVuIGEgc3ViYWdlbnQgKFRhc2sgdG9vbCkgc3RhcnRzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEluamVjdCBjb250ZXh0IGZvciB0aGUgc3ViYWdlbnRcbiAqIC0gTG9nIHN1YmFnZW50IGludm9jYXRpb25zXG4gKiAtIENvbmZpZ3VyZSBzdWJhZ2VudCBiZWhhdmlvclxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYGFnZW50X3R5cGVgIChlLmcuLCAnZXhwbG9yZScsICdjb2RlYmFzZS1hbmFseXNpcycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3ViYWdlbnRTdGFydEhvb2ssIHN1YmFnZW50U3RhcnRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEFkZCBjb250ZXh0IGZvciBleHBsb3JlIHN1YmFnZW50c1xuICogZXhwb3J0IGRlZmF1bHQgc3ViYWdlbnRTdGFydEhvb2soeyBtYXRjaGVyOiAnZXhwbG9yZScgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdFeHBsb3JlIHN1YmFnZW50IHN0YXJ0aW5nJywge1xuICogICAgIGFnZW50SWQ6IGlucHV0LmFnZW50X2lkLFxuICogICAgIGFnZW50VHlwZTogaW5wdXQuYWdlbnRfdHlwZVxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZvY3VzIG9uIGZpbmRpbmcgcGF0dGVybnMgYW5kIGNvbnZlbnRpb25zJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3ViYWdlbnRzdGFydFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdGFydEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oJ1N1YmFnZW50U3RhcnQnLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3ViYWdlbnRTdG9wIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdWJhZ2VudFN0b3AgaG9va3MgZmlyZSB3aGVuIGEgc3ViYWdlbnQgY29tcGxldGVzIG9yIHN0b3BzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdWJhZ2VudCBmcm9tIHN0b3BwaW5nXG4gKiAtIFByb2Nlc3Mgc3ViYWdlbnQgcmVzdWx0c1xuICogLSBDbGVhbiB1cCBzdWJhZ2VudCByZXNvdXJjZXNcbiAqIC0gTG9nIHN1YmFnZW50IGNvbXBsZXRpb25cbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBhZ2VudF90eXBlYCAoZS5nLiwgJ2V4cGxvcmUnLCAnY29kZWJhc2UtYW5hbHlzaXMnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN1YmFnZW50U3RvcEhvb2ssIHN1YmFnZW50U3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQmxvY2sgZXhwbG9yZSBzdWJhZ2VudHMgaWYgdGFzayBpbmNvbXBsZXRlXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0b3BIb29rKHsgbWF0Y2hlcjogJ2V4cGxvcmUnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU3ViYWdlbnQgc3RvcHBpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gQmxvY2sgaWYgdHJhbnNjcmlwdCBzaG93cyBpbmNvbXBsZXRlIHdvcmtcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RvcE91dHB1dCh7XG4gKiAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgcmVhc29uOiAnUGxlYXNlIHZlcmlmeSBleHBsb3JhdGlvbiBpcyBjb21wbGV0ZSdcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N1YmFnZW50c3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdG9wSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbignU3ViYWdlbnRTdG9wJywgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFByZUNvbXBhY3QgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBQcmVDb21wYWN0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBQcmVDb21wYWN0IGhvb2tzIGZpcmUgYmVmb3JlIGNvbnRleHQgY29tcGFjdGlvbiBvY2N1cnMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gUHJlc2VydmUgaW1wb3J0YW50IGluZm9ybWF0aW9uIGJlZm9yZSBjb21wYWN0aW9uXG4gKiAtIExvZyBjb21wYWN0aW9uIGV2ZW50c1xuICogLSBNb2RpZnkgY3VzdG9tIGluc3RydWN0aW9ucyBmb3IgdGhlIGNvbXBhY3RlZCBjb250ZXh0XG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdtYW51YWwnLCAnYXV0bycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcHJlQ29tcGFjdEhvb2ssIHByZUNvbXBhY3RPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyBjb21wYWN0aW9uIGV2ZW50cyBhbmQgcHJlc2VydmUgY29udGV4dFxuICogZXhwb3J0IGRlZmF1bHQgcHJlQ29tcGFjdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnQ29udGV4dCBjb21wYWN0aW9uIHRyaWdnZXJlZCcsIHtcbiAqICAgICB0cmlnZ2VyOiBpbnB1dC50cmlnZ2VyLFxuICogICAgIGhhc0N1c3RvbUluc3RydWN0aW9uczogaW5wdXQuY3VzdG9tX2luc3RydWN0aW9ucyAhPT0gbnVsbFxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBwcmVDb21wYWN0T3V0cHV0KHtcbiAqICAgICBzeXN0ZW1NZXNzYWdlOiAnUmVtZW1iZXI6IHN0cmljdCBtb2RlIGlzIGVuYWJsZWQnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBPbmx5IGhhbmRsZSBtYW51YWwgY29tcGFjdGlvblxuICogZXhwb3J0IGRlZmF1bHQgcHJlQ29tcGFjdEhvb2soeyBtYXRjaGVyOiAnbWFudWFsJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ01hbnVhbCBjb21wYWN0aW9uIHJlcXVlc3RlZCcpO1xuICogICByZXR1cm4gcHJlQ29tcGFjdE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3ByZWNvbXBhY3RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZUNvbXBhY3RIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKCdQcmVDb21wYWN0JywgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcm1pc3Npb25SZXF1ZXN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbignUGVybWlzc2lvblJlcXVlc3QnLCBjb25maWcsIGhhbmRsZXIpO1xufVxuIiwgIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBhY2Nlc3MgdG8gQ2xhdWRlIENvZGUncyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHV0aWxpdGllc1xuICogZm9yIHBlcnNpc3RpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzIGluIFNlc3Npb25TdGFydCBob29rcy5cbiAqXG4gKiAjIyBFbnZpcm9ubWVudCBWYXJpYWJsZXNcbiAqXG4gKiBDbGF1ZGUgQ29kZSBzZXRzIHRoZXNlIGVudmlyb25tZW50IHZhcmlhYmxlcyB3aGVuIHJ1bm5pbmcgaG9va3M6XG4gKlxuICogfCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHwgQXZhaWxhYmxlIEluIHxcbiAqIHwtLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS18XG4gKiB8IGBDTEFVREVfUFJPSkVDVF9ESVJgIHwgQWJzb2x1dGUgcGF0aCB0byBwcm9qZWN0IHJvb3QgfCBBbGwgaG9va3MgfFxuICogfCBgQ0xBVURFX0VOVl9GSUxFYCB8IFBhdGggdG8gZmlsZSBmb3IgcGVyc2lzdGluZyBlbnYgdmFycyB8IFNlc3Npb25TdGFydCBvbmx5IHxcbiAqIHwgYENMQVVERV9DT0RFX1JFTU9URWAgfCBgXCJ0cnVlXCJgIGlmIHJ1bm5pbmcgcmVtb3RlbHkgfCBBbGwgaG9va3MgfFxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGdldFByb2plY3REaXIsIHBlcnNpc3RFbnZWYXIsIGlzUmVtb3RlRW52aXJvbm1lbnQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEdldCBwcm9qZWN0IGRpcmVjdG9yeVxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqXG4gKiAvLyBDaGVjayBpZiBydW5uaW5nIHJlbW90ZWx5XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIEhhbmRsZSByZW1vdGUtc3BlY2lmaWMgbG9naWNcbiAqIH1cbiAqXG4gKiAvLyBJbiBTZXNzaW9uU3RhcnQgaG9vazogcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ3Byb2R1Y3Rpb24nKTtcbiAqIHBlcnNpc3RFbnZWYXIoJ0FQSV9LRVknLCAnc2VjcmV0LWtleScpO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1leGVjdXRpb24tZGV0YWlsc1xuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzJztcbi8qKlxuICogQ2xhdWRlIENvZGUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMuXG4gKlxuICogVGhlc2UgYXJlIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgdGhhdCBDbGF1ZGUgQ29kZSBzZXRzIHdoZW4gcnVubmluZyBob29rcy5cbiAqL1xuZXhwb3J0IGNvbnN0IENMQVVERV9FTlZfVkFSUyA9IHtcbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIHByb2plY3Qgcm9vdCBkaXJlY3Rvcnkgd2hlcmUgQ2xhdWRlIENvZGUgd2FzIHN0YXJ0ZWQuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgaG9va3MuXG4gICAqL1xuICBQUk9KRUNUX0RJUjogJ0NMQVVERV9QUk9KRUNUX0RJUicsXG4gIC8qKlxuICAgKiBQYXRoIHRvIGEgZmlsZSB3aGVyZSBTZXNzaW9uU3RhcnQgaG9va3MgY2FuIHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICAgKiBWYXJpYWJsZXMgd3JpdHRlbiB0byB0aGlzIGZpbGUgd2lsbCBiZSBhdmFpbGFibGUgaW4gYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcy5cbiAgICogT25seSBhdmFpbGFibGUgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICAgKi9cbiAgRU5WX0ZJTEU6ICdDTEFVREVfRU5WX0ZJTEUnLFxuICAvKipcbiAgICogU2V0IHRvIFwidHJ1ZVwiIHdoZW4gcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAgICogTm90IHNldCBvciBlbXB0eSB3aGVuIHJ1bm5pbmcgaW4gbG9jYWwgQ0xJIGVudmlyb25tZW50LlxuICAgKi9cbiAgUkVNT1RFOiAnQ0xBVURFX0NPREVfUkVNT1RFJ1xufTtcbi8qKlxuICogR2V0cyB0aGUgQ2xhdWRlIENvZGUgcHJvamVjdCBkaXJlY3RvcnkuXG4gKlxuICogVGhpcyBpcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcHJvamVjdCByb290IHdoZXJlIENsYXVkZSBDb2RlIHdhcyBzdGFydGVkLlxuICogVGhlIHZhbHVlIGNvbWVzIGZyb20gdGhlIGBDTEFVREVfUFJPSkVDVF9ESVJgIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICogQHJldHVybnMgVGhlIHByb2plY3QgZGlyZWN0b3J5IHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqIGlmIChwcm9qZWN0RGlyKSB7XG4gKiAgIGNvbnN0IGNvbmZpZ1BhdGggPSBgJHtwcm9qZWN0RGlyfS8uY2xhdWRlL2NvbmZpZy5qc29uYDtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdERpcigpIHtcbiAgcmV0dXJuIHByb2Nlc3MuZW52W0NMQVVERV9FTlZfVkFSUy5QUk9KRUNUX0RJUl07XG59XG4vKipcbiAqIEdldHMgdGhlIENsYXVkZSBDb2RlIGVudiBmaWxlIHBhdGggZm9yIHBlcnNpc3RpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIFRoaXMgaXMgb25seSBhdmFpbGFibGUgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLiBUaGUgcGF0aCBwb2ludHMgdG8gYSBmaWxlXG4gKiB3aGVyZSB5b3UgY2FuIHdyaXRlIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnRzIHRvIHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiBmb3IgYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcyBpbiB0aGUgc2Vzc2lvbi5cbiAqIEByZXR1cm5zIFRoZSBlbnYgZmlsZSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldCAobm90IGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZW52RmlsZSA9IGdldEVudkZpbGVQYXRoKCk7XG4gKiBpZiAoZW52RmlsZSkge1xuICogICAvLyBXZSdyZSBpbiBhIFNlc3Npb25TdGFydCBob29rIGFuZCBjYW4gcGVyc2lzdCBlbnYgdmFyc1xuICogICBwZXJzaXN0RW52VmFyKCdNWV9WQVInLCAnbXktdmFsdWUnKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52RmlsZVBhdGgoKSB7XG4gIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuRU5WX0ZJTEVdO1xufVxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGhvb2sgaXMgcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAqXG4gKiBSZW1vdGUgZW52aXJvbm1lbnRzIG1heSBoYXZlIGRpZmZlcmVudCBjYXBhYmlsaXRpZXMgb3IgcmVzdHJpY3Rpb25zXG4gKiBjb21wYXJlZCB0byBsb2NhbCBDTEkgZW52aXJvbm1lbnRzLlxuICogQHJldHVybnMgdHJ1ZSBpZiBydW5uaW5nIHJlbW90ZWx5LCBmYWxzZSBpZiBydW5uaW5nIGxvY2FsbHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIFVzZSB3ZWItY29tcGF0aWJsZSBhcHByb2FjaGVzXG4gKiB9IGVsc2Uge1xuICogICAvLyBDYW4gdXNlIGxvY2FsIENMSSBmZWF0dXJlc1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1JlbW90ZUVudmlyb25tZW50KCkge1xuICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLlJFTU9URV0gPT09ICd0cnVlJztcbn1cbi8qKlxuICogUGVyc2lzdHMgYW4gZW52aXJvbm1lbnQgdmFyaWFibGUgZm9yIHVzZSBpbiBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB3cml0ZXMgYSBzaGVsbCBleHBvcnQgc3RhdGVtZW50IHRvIHRoZSBgQ0xBVURFX0VOVl9GSUxFYCxcbiAqIHdoaWNoIENsYXVkZSBDb2RlIHNvdXJjZXMgYmVmb3JlIHJ1bm5pbmcgYmFzaCBjb21tYW5kcy4gVGhpcyBhbGxvd3NcbiAqIFNlc3Npb25TdGFydCBob29rcyB0byBjb25maWd1cmUgdGhlIGVudmlyb25tZW50IGZvciB0aGUgZW50aXJlIHNlc3Npb24uXG4gKlxuICogKipJbXBvcnRhbnQqKjogVGhpcyBmdW5jdGlvbiBvbmx5IHdvcmtzIGluIFNlc3Npb25TdGFydCBob29rcyB3aGVyZVxuICogYENMQVVERV9FTlZfRklMRWAgaXMgc2V0LiBJbiBvdGhlciBob29rcywgaXQgd2lsbCB0aHJvdyBhbiBlcnJvci5cbiAqIEBwYXJhbSBuYW1lIC0gVGhlIGVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZSB2YWx1ZSAod2lsbCBiZSBzaGVsbC1lc2NhcGVkKVxuICogQHRocm93cyBFcnJvciBpZiBDTEFVREVfRU5WX0ZJTEUgaXMgbm90IHNldCAobm90IGluIGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvblN0YXJ0SG9vaywgc2Vzc2lvblN0YXJ0T3V0cHV0LCBwZXJzaXN0RW52VmFyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHt9LCBhc3luYyAoaW5wdXQpID0+IHtcbiAqICAgLy8gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHRoZSBzZXNzaW9uXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ3Byb2R1Y3Rpb24nKTtcbiAqICAgcGVyc2lzdEVudlZhcignQVBJX0tFWScsIHByb2Nlc3MuZW52Lk1ZX0FQSV9LRVkgPz8gJ2RlZmF1bHQnKTtcbiAqICAgcGVyc2lzdEVudlZhcignUEFUSCcsIGAke3Byb2Nlc3MuZW52LlBBVEh9Oi4vbm9kZV9tb2R1bGVzLy5iaW5gKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNwZXJzaXN0aW5nLWVudmlyb25tZW50LXZhcmlhYmxlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGVyc2lzdEVudlZhcihuYW1lLCB2YWx1ZSkge1xuICBjb25zdCBlbnZGaWxlID0gZ2V0RW52RmlsZVBhdGgoKTtcbiAgaWYgKGVudkZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdwZXJzaXN0RW52VmFyIGNhbiBvbmx5IGJlIHVzZWQgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLiAnICsgJ0NMQVVERV9FTlZfRklMRSBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyBub3Qgc2V0LidcbiAgICApO1xuICB9XG4gIC8vIFNoZWxsLWVzY2FwZSB0aGUgdmFsdWUgdG8gaGFuZGxlIHNwZWNpYWwgY2hhcmFjdGVyc1xuICBjb25zdCBlc2NhcGVkVmFsdWUgPSBlc2NhcGVTaGVsbFZhbHVlKHZhbHVlKTtcbiAgLy8gV3JpdGUgdGhlIGV4cG9ydCBzdGF0ZW1lbnRcbiAgY29uc3QgZXhwb3J0U3RhdGVtZW50ID0gYGV4cG9ydCAke25hbWV9PSR7ZXNjYXBlZFZhbHVlfVxcbmA7XG4gIGZzLmFwcGVuZEZpbGVTeW5jKGVudkZpbGUsIGV4cG9ydFN0YXRlbWVudCwgJ3V0Zi04Jyk7XG59XG4vKipcbiAqIFBlcnNpc3RzIG11bHRpcGxlIGVudmlyb25tZW50IHZhcmlhYmxlcyBhdCBvbmNlLlxuICpcbiAqIFRoaXMgaXMgYSBjb252ZW5pZW5jZSB3cmFwcGVyIGFyb3VuZCBgcGVyc2lzdEVudlZhcmAgZm9yIHNldHRpbmdcbiAqIG11bHRpcGxlIHZhcmlhYmxlcyBpbiBhIHNpbmdsZSBjYWxsLlxuICogQHBhcmFtIHZhcnMgLSBPYmplY3QgbWFwcGluZyB2YXJpYWJsZSBuYW1lcyB0byB2YWx1ZXNcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0xBVURFX0VOVl9GSUxFIGlzIG5vdCBzZXQgKG5vdCBpbiBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHBlcnNpc3RFbnZWYXJzKHtcbiAqICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAqICAgQVBJX0tFWTogJ3NlY3JldCcsXG4gKiAgIERFQlVHOiAnZmFsc2UnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGVyc2lzdEVudlZhcnModmFycykge1xuICBmb3IgKGNvbnN0IFtuYW1lLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXModmFycykpIHtcbiAgICBwZXJzaXN0RW52VmFyKG5hbWUsIHZhbHVlKTtcbiAgfVxufVxuLyoqXG4gKiBFc2NhcGVzIGEgdmFsdWUgZm9yIHNhZmUgdXNlIGluIGEgc2hlbGwgZXhwb3J0IHN0YXRlbWVudC5cbiAqXG4gKiBVc2VzIHNpbmdsZSBxdW90ZXMgYW5kIGVzY2FwZXMgYW55IGVtYmVkZGVkIHNpbmdsZSBxdW90ZXMuXG4gKiBUaGlzIHByZXZlbnRzIHNoZWxsIGluamVjdGlvbiBhbmQgaGFuZGxlcyBzcGVjaWFsIGNoYXJhY3RlcnMuXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gZXNjYXBlXG4gKiBAcmV0dXJucyBUaGUgc2hlbGwtZXNjYXBlZCB2YWx1ZSAod2l0aCBxdW90ZXMpXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZXNjYXBlU2hlbGxWYWx1ZSh2YWx1ZSkge1xuICAvLyBVc2Ugc2luZ2xlIHF1b3RlcyBhbmQgZXNjYXBlIGFueSBlbWJlZGRlZCBzaW5nbGUgcXVvdGVzXG4gIC8vICd2YWx1ZScgLT4gJ3ZhbCdcXCcndWUnIGZvciB2YWx1ZXMgY29udGFpbmluZyBzaW5nbGUgcXVvdGVzXG4gIGNvbnN0IGVzY2FwZWQgPSB2YWx1ZS5yZXBsYWNlKC8nL2csIFwiJ1xcXFwnJ1wiKTtcbiAgcmV0dXJuIGAnJHtlc2NhcGVkfSdgO1xufVxuIiwgIi8qKlxuICogUnVudGltZSBtb2R1bGUgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIEhhbmRsZXMgc3RkaW4vc3Rkb3V0L2V4aXQgY29kZSBzZW1hbnRpY3MgZm9yIGNvbXBpbGVkIGhvb2sgZXhlY3V0aW9uLlxuICogVGhpcyBtb2R1bGUgaXMgdGhlIGNvcmUgb3JjaGVzdHJhdG9yIHRoYXQ6XG4gKiAtIFJlYWRzIEpTT04gZnJvbSBzdGRpbiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAtIEludm9rZXMgdGhlIGhvb2sgaGFuZGxlclxuICogLSBXcml0ZXMgb3V0cHV0IHRvIHN0ZG91dFxuICogLSBNYW5hZ2VzIGV4aXQgY29kZXNcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBhIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCBteUhvb2sgZnJvbSAnLi9teS1ob29rLmpzJztcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IGZyb20gJy4vZW52LmpzJztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB7IEVYSVRfQ09ERVMgfSBmcm9tICcuL291dHB1dHMuanMnO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RkaW4vU3Rkb3V0IEhhbmRsaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIFJlYWRzIGFsbCBkYXRhIGZyb20gc3RkaW4uXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tcGxldGUgc3RkaW4gY29udGVudFxuICovXG5hc3luYyBmdW5jdGlvbiByZWFkU3RkaW4oKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgLy8gU2V0IGVuY29kaW5nIGZpcnN0IHRvIGVuc3VyZSBkYXRhIGV2ZW50cyByZWNlaXZlIHN0cmluZ3NcbiAgICBwcm9jZXNzLnN0ZGluLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuICAgIHByb2Nlc3Muc3RkaW4ub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgIGNodW5rcy5wdXNoKGNodW5rKTtcbiAgICB9KTtcbiAgICBwcm9jZXNzLnN0ZGluLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICByZXNvbHZlKGNodW5rcy5qb2luKCcnKSk7XG4gICAgfSk7XG4gICAgcHJvY2Vzcy5zdGRpbi5vbignZXJyb3InLCAoZXJyb3IpID0+IHtcbiAgICAgIHJlamVjdChlcnJvcik7XG4gICAgfSk7XG4gIH0pO1xufVxuLyoqXG4gKiBQYXJzZXMgc3RkaW4gSlNPTiBpbnB1dC5cbiAqIEBwYXJhbSBzdGRpbkNvbnRlbnQgLSBSYXcgc3RkaW4gY29udGVudFxuICogQHJldHVybnMgUGFyc2VkIGlucHV0ICh3aXJlIGZvcm1hdCB3aXRoIHNuYWtlX2Nhc2UgcHJvcGVydGllcylcbiAqIEB0aHJvd3MgRXJyb3IgaWYgSlNPTiBpcyBtYWxmb3JtZWRcbiAqL1xuZnVuY3Rpb24gcGFyc2VTdGRpbklucHV0KHN0ZGluQ29udGVudCkge1xuICAvLyBQYXJzZSBKU09OIC0gaW5wdXQgdXNlcyB3aXJlIGZvcm1hdCAoc25ha2VfY2FzZSkgZGlyZWN0bHlcbiAgY29uc3QgcmF3SW5wdXQgPSBKU09OLnBhcnNlKHN0ZGluQ29udGVudCk7XG4gIHJldHVybiByYXdJbnB1dDtcbn1cbi8qKlxuICogV3JpdGVzIGhvb2sgb3V0cHV0IHRvIHN0ZG91dC5cbiAqXG4gKiBPdXRwdXQgdXNlcyBjYW1lbENhc2Uga2V5cyBwZXIgQ2xhdWRlIENvZGUgaG9vayBzcGVjaWZpY2F0aW9uLlxuICogQHBhcmFtIG91dHB1dCAtIFRoZSBob29rIG91dHB1dCB0byB3cml0ZVxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICovXG5mdW5jdGlvbiB3cml0ZVN0ZG91dChvdXRwdXQpIHtcbiAgLy8gT3V0cHV0IHVzZXMgY2FtZWxDYXNlIC0gbm8gdHJhbnNmb3JtYXRpb24gbmVlZGVkXG4gIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEpTT04uc3RyaW5naWZ5KG91dHB1dCkpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXJyb3IgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBlcnJvciBvdXRwdXQgZm9yIG1hbGZvcm1lZCBzdGRpbiBKU09OLlxuICogQHBhcmFtIGVycm9yIC0gVGhlIHBhcnNlIGVycm9yXG4gKiBAcmV0dXJucyBIb29rT3V0cHV0IHdpdGggZW1wdHkgc3Rkb3V0XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKSB7XG4gIGxvZ2dlci5lcnJvcihgSW52YWxpZCBKU09OIGlucHV0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgcmV0dXJuIHsgc3Rkb3V0OiB7fSB9O1xufVxuLyoqXG4gKiBXcml0ZXMgaGFuZGxlciBlcnJvciBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdHMgd2l0aCBjb2RlIDIuXG4gKlxuICogV2hlbiBhIGhvb2sgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uOlxuICogLSBTdGFja3RyYWNlICh3aXRoIHNvdXJjZW1hcHMgaWYgYXZhaWxhYmxlKSBpcyBvdXRwdXQgdG8gc3RkZXJyXG4gKiAtIFByb2Nlc3MgZXhpdHMgd2l0aCBjb2RlIDIgKEJMT0NLKVxuICogLSBObyBKU09OIGlzIG91dHB1dCB0byBzdGRvdXRcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0aHJvd24gYnkgdGhlIGhhbmRsZXJcbiAqL1xuZnVuY3Rpb24gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKSB7XG4gIC8vIFdyaXRlIHN0YWNrIHRyYWNlIHRvIHN0ZGVyciAoc291cmNlbWFwcyBhcmUgYXBwbGllZCBhdXRvbWF0aWNhbGx5IGJ5IE5vZGUuanMpXG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZX1cXG5gKTtcbiAgfSBlbHNlIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtTdHJpbmcoZXJyb3IpfVxcbmApO1xuICB9XG4gIC8vIExvZyB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgbG9nZ2VyLmVycm9yKGBIb29rIGhhbmRsZXIgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAvLyBDbGVhciBsb2dnZXIgY29udGV4dCBhbmQgY2xvc2VcbiAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICBsb2dnZXIuY2xvc2UoKTtcbiAgLy8gRXhpdCB3aXRoIGNvZGUgMiAoQkxPQ0spIC0gbm8gSlNPTiBvdXRwdXRcbiAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuQkxPQ0spO1xufVxuLyoqXG4gKiBDb252ZXJ0cyBhIFNwZWNpZmljSG9va091dHB1dCB0byBIb29rT3V0cHV0IGZvciB3aXJlIGZvcm1hdC5cbiAqXG4gKiBTcGVjaWZpY0hvb2tPdXRwdXQgdHlwZXMgaGF2ZTogeyBfdHlwZSwgZXhpdENvZGUsIHN0ZG91dCwgc3RkZXJyPyB9XG4gKiBIb29rT3V0cHV0IGhhczogeyBleGl0Q29kZSwgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqXG4gKiBTaW5jZSBvdXRwdXQgYnVpbGRlcnMgbm93IHByb2R1Y2Ugd2lyZS1mb3JtYXQgZGlyZWN0bHksIHRoaXMgZnVuY3Rpb25cbiAqIHNpbXBseSBzdHJpcHMgdGhlIGBfdHlwZWAgZGlzY3JpbWluYXRvciBmaWVsZC5cbiAqIEBwYXJhbSBzcGVjaWZpY091dHB1dCAtIFRoZSBzcGVjaWZpYyBvdXRwdXQgZnJvbSBhIGhvb2sgaGFuZGxlclxuICogQHJldHVybnMgSG9va091dHB1dCByZWFkeSBmb3Igc2VyaWFsaXphdGlvblxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gcHJlVG9vbFVzZU91dHB1dCh7IGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfSB9KTtcbiAqIGNvbnN0IGhvb2tPdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAqIC8vIGhvb2tPdXRwdXQ6IHsgZXhpdENvZGU6IDAsIHN0ZG91dDogeyBob29rU3BlY2lmaWNPdXRwdXQ6IHsgLi4uIH0gfSB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpIHtcbiAgcmV0dXJuIHsgc3Rkb3V0OiBzcGVjaWZpY091dHB1dC5zdGRvdXQgfTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4ZWN1dGUgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRXhlY3V0ZXMgYSBob29rIGhhbmRsZXIgd2l0aCBmdWxsIHJ1bnRpbWUgb3JjaGVzdHJhdGlvbi5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5IHBvaW50IHRoYXQgY29tcGlsZWQgaG9va3MgdXNlLiBXaGVuIGEgY29tcGlsZWQgaG9va1xuICogcnVucyBhcyBhIENMSTpcbiAqXG4gKiAxLiBSZWFkcyBhbGwgc3RkaW5cbiAqIDIuIFBhcnNlcyBKU09OICh3aXJlIGZvcm1hdCB3aXRoIHNuYWtlX2Nhc2UgcHJvcGVydGllcylcbiAqIDMuIFNldHMgdXAgbG9nZ2VyIGNvbnRleHQgKGhvb2tUeXBlLCBpbnB1dClcbiAqIDQuIENhbGxzIGhhbmRsZXIgd2l0aCBpbnB1dCBhbmQgY29udGV4dCAobG9nZ2VyKVxuICogNS4gSGFuZGxlcyBhbnkgZXJyb3JzLCBsb2dzIHRoZW1cbiAqIDYuIFdyaXRlcyBKU09OIHRvIHN0ZG91dFxuICogNy4gQ2xvc2VzIGxvZ2dlclxuICogOC4gRXhpdHMgd2l0aCBhcHByb3ByaWF0ZSBjb2RlXG4gKiBAcGFyYW0gaG9va0ZuIC0gVGhlIGhvb2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSAoZnJvbSBob29rIGZhY3RvcnkpXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gSW4gY29tcGlsZWQgaG9vayBmaWxlXG4gKiBpbXBvcnQgeyBleGVjdXRlIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL3J1bnRpbWUnO1xuICogaW1wb3J0IHsgcHJlVG9vbFVzZUhvb2ssIHByZVRvb2xVc2VPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGNvbnN0IG15SG9vayA9IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnUHJvY2Vzc2luZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICpcbiAqIGV4ZWN1dGUobXlIb29rKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlKGhvb2tGbikge1xuICBsZXQgb3V0cHV0O1xuICB0cnkge1xuICAgIC8vIENoZWNrIGZvciBsb2cgZmlsZSBjb25maWd1cmF0aW9uIGNvbmZsaWN0c1xuICAgIC8vIENMQVVERV9DT0RFX0hPT0tTX0NMSV9MT0dfRklMRSBpcyBpbmplY3RlZCBieSB0aGUgQ0xJIC0tbG9nIHBhcmFtZXRlclxuICAgIC8vIENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFIGlzIHRoZSB1c2VyJ3MgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAgICBjb25zdCBjbGlMb2dGaWxlID0gcHJvY2Vzcy5lbnZbJ0NMQVVERV9DT0RFX0hPT0tTX0NMSV9MT0dfRklMRSddO1xuICAgIGNvbnN0IGVudkxvZ0ZpbGUgPSBwcm9jZXNzLmVudlsnQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEUnXTtcbiAgICBpZiAoY2xpTG9nRmlsZSAhPT0gdW5kZWZpbmVkICYmIGVudkxvZ0ZpbGUgIT09IHVuZGVmaW5lZCAmJiBjbGlMb2dGaWxlICE9PSBlbnZMb2dGaWxlKSB7XG4gICAgICAvLyBXcml0ZSBlcnJvciB0byBzdGRlcnIgYW5kIGV4aXQgd2l0aCBlcnJvciBjb2RlXG4gICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgYExvZyBmaWxlIGNvbmZpZ3VyYXRpb24gY29uZmxpY3Q6IENMSSAtLWxvZz1cIiR7Y2xpTG9nRmlsZX1cIiB2cyBDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRT1cIiR7ZW52TG9nRmlsZX1cIi4gYCArXG4gICAgICAgICAgJ1VzZSBvbmx5IG9uZSBtZXRob2QgdG8gY29uZmlndXJlIGhvb2sgbG9nZ2luZy5cXG4nXG4gICAgICApO1xuICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH1cbiAgICAvLyBJZiBDTEkgbG9nIGZpbGUgaXMgc2V0LCBjb25maWd1cmUgdGhlIGxvZ2dlclxuICAgIGlmIChjbGlMb2dGaWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGxvZ2dlci5zZXRMb2dGaWxlKGNsaUxvZ0ZpbGUpO1xuICAgIH1cbiAgICAvLyBSZWFkIGFuZCBwYXJzZSBzdGRpblxuICAgIGxldCBzdGRpbkNvbnRlbnQ7XG4gICAgdHJ5IHtcbiAgICAgIHN0ZGluQ29udGVudCA9IGF3YWl0IHJlYWRTdGRpbigpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIubG9nRXJyb3IoZXJyb3IsICdGYWlsZWQgdG8gcmVhZCBzdGRpbicpO1xuICAgICAgb3V0cHV0ID0gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBQYXJzZSBhbmQgdHJhbnNmb3JtIGlucHV0XG4gICAgbGV0IGlucHV0O1xuICAgIHRyeSB7XG4gICAgICBpbnB1dCA9IHBhcnNlU3RkaW5JbnB1dChzdGRpbkNvbnRlbnQpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIubG9nRXJyb3IoZXJyb3IsICdGYWlsZWQgdG8gcGFyc2Ugc3RkaW4gSlNPTicpO1xuICAgICAgb3V0cHV0ID0gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBTZXQgbG9nZ2VyIGNvbnRleHRcbiAgICBjb25zdCBob29rRXZlbnROYW1lID0gaG9va0ZuLmhvb2tFdmVudE5hbWU7XG4gICAgbG9nZ2VyLnNldENvbnRleHQoaG9va0V2ZW50TmFtZSwgaW5wdXQpO1xuICAgIC8vIEJ1aWxkIGNvbnRleHQgLSBTZXNzaW9uU3RhcnQgaG9va3MgZ2V0IGV4dGVuZGVkIGNvbnRleHQgd2l0aCBwZXJzaXN0RW52VmFyXG4gICAgY29uc3QgY29udGV4dCA9IGhvb2tFdmVudE5hbWUgPT09ICdTZXNzaW9uU3RhcnQnID8geyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIsIHBlcnNpc3RFbnZWYXJzIH0gOiB7IGxvZ2dlciB9O1xuICAgIC8vIEV4ZWN1dGUgaGFuZGxlclxuICAgIHRyeSB7XG4gICAgICBjb25zdCBzcGVjaWZpY091dHB1dCA9IGF3YWl0IGhvb2tGbihpbnB1dCwgY29udGV4dCk7XG4gICAgICBvdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gSGFuZGxlciB0aHJldyAtIG91dHB1dCBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdCB3aXRoIGNvZGUgMlxuICAgICAgLy8gVGhpcyBjYWxsIG5ldmVyIHJldHVybnMgKHByb2Nlc3MuZXhpdClcbiAgICAgIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcik7XG4gICAgfVxuICB9IGZpbmFsbHkge1xuICAgIC8vIFdyaXRlIG91dHB1dCBpZiB3ZSBoYXZlIGl0XG4gICAgaWYgKG91dHB1dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB3cml0ZVN0ZG91dChvdXRwdXQuc3Rkb3V0KTtcbiAgICB9XG4gICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHRcbiAgICBsb2dnZXIuY2xlYXJDb250ZXh0KCk7XG4gICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgLy8gRXhpdCB3aXRoIHN1Y2Nlc3MgKGhhbmRsZXIgZXJyb3JzIGV4aXQgdmlhIGhhbmRsZUhhbmRsZXJFcnJvciB3aXRoIGNvZGUgMilcbiAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgfVxufVxuIiwgIi8qKlxuICogQVBJIHV0aWxpdGllcyBmb3IgaG9vayBzY3JpcHRzLlxuICpcbiAqIFByb3ZpZGVzIGZ1bmN0aW9ucyBmb3IgQVBJIGRpc2NvdmVyeSBhbmQgSFRUUCBvcGVyYXRpb25zIHVzZWQgYWNyb3NzXG4gKiBtdWx0aXBsZSBob29rcy5cbiAqL1xuXG5pbXBvcnQgeyBleGVjU3luYyB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgdHlwZSB7IElzc3VlLCBTZXNzaW9uRGlmZlJlc3BvbnNlIH0gZnJvbSAnQGdvb2Rmb290L2FwaS10eXBlcyc7XG5pbXBvcnQgdHlwZSB7IExvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG5cbi8vIFJlLWV4cG9ydCBzaGFyZWQgdHlwZXMgZm9yIGNvbnN1bWVyc1xuZXhwb3J0IHR5cGUgeyBJc3N1ZSwgSXNzdWVTdGF0dXMsIFNlc3Npb25EaWZmUmVzcG9uc2UsIFNlc3Npb25Jc3N1ZURpZmYgfSBmcm9tICdAZ29vZGZvb3QvYXBpLXR5cGVzJztcblxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBCYXNoVG9vbFJlc3BvbnNlIHN0cnVjdHVyZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCYXNoVG9vbFJlc3BvbnNlIHtcbiAgc3Rkb3V0OiBzdHJpbmc7XG4gIHN0ZGVycjogc3RyaW5nO1xuICBleGl0Q29kZTogbnVtYmVyO1xuICBjb21tYW5kOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYSBCYXNoVG9vbFJlc3BvbnNlLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFZhbHVlIHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHZhbHVlIGlzIGEgQmFzaFRvb2xSZXNwb25zZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCYXNoVG9vbFJlc3BvbnNlKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgQmFzaFRvb2xSZXNwb25zZSB7XG4gIHJldHVybiAoXG4gICAgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJlxuICAgIHZhbHVlICE9PSBudWxsICYmXG4gICAgJ2V4aXRDb2RlJyBpbiB2YWx1ZSAmJlxuICAgIHR5cGVvZiAodmFsdWUgYXMgQmFzaFRvb2xSZXNwb25zZSkuZXhpdENvZGUgPT09ICdudW1iZXInICYmXG4gICAgJ3N0ZG91dCcgaW4gdmFsdWUgJiZcbiAgICB0eXBlb2YgKHZhbHVlIGFzIEJhc2hUb29sUmVzcG9uc2UpLnN0ZG91dCA9PT0gJ3N0cmluZydcbiAgKTtcbn1cblxuLyoqXG4gKiBDb21tZW50IHdpdGggYSBjb21taXRTaGEgKHVzZWQgZm9yIG9ycGhhbiBjbGVhbnVwKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21taXRDb21tZW50IHtcbiAgaWQ6IHN0cmluZztcbiAgY29tbWl0U2hhOiBzdHJpbmc7XG59XG5cbi8qKlxuICogT3B0aW9ucyBmb3IgQXBpRXJyb3IgY29uc3RydWN0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwaUVycm9yT3B0aW9ucyB7XG4gIC8qKiBIVFRQIG1ldGhvZCB1c2VkIGluIHRoZSByZXF1ZXN0ICovXG4gIG1ldGhvZD86IHN0cmluZztcbiAgLyoqIFVSTCBvZiB0aGUgcmVxdWVzdCAqL1xuICB1cmw/OiBzdHJpbmc7XG4gIC8qKiBIVFRQIHN0YXR1cyBjb2RlICovXG4gIHN0YXR1cz86IG51bWJlcjtcbiAgLyoqIEhUVFAgc3RhdHVzIHRleHQgKi9cbiAgc3RhdHVzVGV4dD86IHN0cmluZztcbiAgLyoqIFByZXZpZXcgb2YgdGhlIHJlc3BvbnNlIGJvZHkgKHRydW5jYXRlZCkgKi9cbiAgcmVzcG9uc2VQcmV2aWV3Pzogc3RyaW5nO1xuICAvKiogT3JpZ2luYWwgZXJyb3IgdGhhdCBjYXVzZWQgdGhpcyBlcnJvciAqL1xuICBjYXVzZT86IEVycm9yO1xufVxuXG4vKipcbiAqIEN1c3RvbSBlcnJvciBjbGFzcyBmb3IgQVBJLXJlbGF0ZWQgZXJyb3JzLlxuICogUHJvdmlkZXMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmb3IgZGVidWdnaW5nLlxuICovXG5leHBvcnQgY2xhc3MgQXBpRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIHB1YmxpYyByZWFkb25seSBvcHRpb25zPzogQXBpRXJyb3JPcHRpb25zO1xuXG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZywgb3B0aW9ucz86IEFwaUVycm9yT3B0aW9ucykge1xuICAgIHN1cGVyKEFwaUVycm9yLmZvcm1hdE1lc3NhZ2UobWVzc2FnZSwgb3B0aW9ucyA/PyB7fSkpO1xuICAgIHRoaXMubmFtZSA9ICdBcGlFcnJvcic7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAob3B0aW9ucz8uY2F1c2UpIHtcbiAgICAgIHRoaXMuY2F1c2UgPSBvcHRpb25zLmNhdXNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGb3JtYXRzIGFuIGVycm9yIG1lc3NhZ2Ugd2l0aCBvcHRpb25hbCBkZXRhaWxzLlxuICAgKi9cbiAgc3RhdGljIGZvcm1hdE1lc3NhZ2UobWVzc2FnZTogc3RyaW5nLCBvcHRpb25zOiBBcGlFcnJvck9wdGlvbnMpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFttZXNzYWdlXTtcblxuICAgIGlmIChvcHRpb25zLm1ldGhvZCAmJiBvcHRpb25zLnVybCkge1xuICAgICAgcGFydHMucHVzaChgJHtvcHRpb25zLm1ldGhvZH0gJHtvcHRpb25zLnVybH1gKTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMudXJsKSB7XG4gICAgICBwYXJ0cy5wdXNoKGBVUkw6ICR7b3B0aW9ucy51cmx9YCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuc3RhdHVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHN0YXR1c1BhcnQgPSBvcHRpb25zLnN0YXR1c1RleHRcbiAgICAgICAgPyBgU3RhdHVzOiAke29wdGlvbnMuc3RhdHVzfSAke29wdGlvbnMuc3RhdHVzVGV4dH1gXG4gICAgICAgIDogYFN0YXR1czogJHtvcHRpb25zLnN0YXR1c31gO1xuICAgICAgcGFydHMucHVzaChzdGF0dXNQYXJ0KTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5yZXNwb25zZVByZXZpZXcpIHtcbiAgICAgIHBhcnRzLnB1c2goYFJlc3BvbnNlOiAke29wdGlvbnMucmVzcG9uc2VQcmV2aWV3fWApO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJ0cy5sZW5ndGggPT09IDEgPyBtZXNzYWdlIDogcGFydHMuam9pbignXFxuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEaXNjb3ZlcnMgdGhlIElzc3VlcyBBUEkgYmFzZSBVUkwgZm9yIHRoZSBjdXJyZW50IHdvcmtzcGFjZS5cbiAqXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlIGZvciBkZWJ1ZyBvdXRwdXRcbiAqIEByZXR1cm5zIEJhc2UgVVJMXG4gKiBAdGhyb3dzIHtBcGlFcnJvcn0gSWYgQ0xBVURFX1BMVUdJTl9ST09UIGlzIG5vdCBzZXQgb3IgZGlzY292ZXJ5IGZhaWxzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXNjb3ZlckFwaVVybChsb2dnZXI/OiBMb2dnZXIpOiBzdHJpbmcge1xuICBjb25zdCBwbHVnaW5Sb290ID0gcHJvY2Vzcy5lbnYuQ0xBVURFX1BMVUdJTl9ST09UO1xuICBpZiAoIXBsdWdpblJvb3QpIHtcbiAgICB0aHJvdyBuZXcgQXBpRXJyb3IoJ0NMQVVERV9QTFVHSU5fUk9PVCBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyBub3Qgc2V0Jyk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGV4ZWNTeW5jKGBcIiR7cGx1Z2luUm9vdH0vYmluL2Rpc2NvdmVyLXdvcmtzcGFjZS1hcGkuc2hcImAsIHtcbiAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0LnRyaW0oKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBleGVjRXJyb3IgPSBlcnJvciBhcyBFcnJvciAmIHsgc3RhdHVzPzogbnVtYmVyOyBzdGRlcnI/OiBCdWZmZXIgfCBzdHJpbmcgfTtcbiAgICBjb25zdCBleGl0Q29kZSA9IGV4ZWNFcnJvci5zdGF0dXMgPz8gJ3Vua25vd24nO1xuICAgIGNvbnN0IHN0ZGVyciA9IGV4ZWNFcnJvci5zdGRlcnIgPyBTdHJpbmcoZXhlY0Vycm9yLnN0ZGVycikgOiAndW5rbm93bic7XG4gICAgbG9nZ2VyPy5kZWJ1ZygnQVBJIGRpc2NvdmVyeSBmYWlsZWQnLCB7IGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgIHRocm93IG5ldyBBcGlFcnJvcihgQVBJIGRpc2NvdmVyeSBzY3JpcHQgZmFpbGVkIChleGl0IGNvZGU6ICR7ZXhpdENvZGV9LCBzdGRlcnI6ICR7c3RkZXJyfSlgLCB7XG4gICAgICBjYXVzZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBGZXRjaGVzIGlzc3VlIGRpZmYgZm9yIGEgc2Vzc2lvbi5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGlzc3VlSWQgLSBJc3N1ZSBJRFxuICogQHBhcmFtIGJhc2VVcmwgLSBBUEkgYmFzZSBVUkxcbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgaW5zdGFuY2VcbiAqIEByZXR1cm5zIElzc3VlIGRpZmZcbiAqIEB0aHJvd3Mge0FwaUVycm9yfSBPbiBuZXR3b3JrIG9yIEhUVFAgZXJyb3JzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaElzc3VlRGlmZihcbiAgc2Vzc2lvbklkOiBzdHJpbmcsXG4gIGlzc3VlSWQ6IHN0cmluZyxcbiAgYmFzZVVybDogc3RyaW5nLFxuICBsb2dnZXI/OiBMb2dnZXJcbik6IFByb21pc2U8U2Vzc2lvbkRpZmZSZXNwb25zZT4ge1xuICBjb25zdCB1cmwgPSBgJHtiYXNlVXJsfS9zZXNzaW9uLyR7c2Vzc2lvbklkfS9kaWZmP2lzc3VlSWRzPSR7aXNzdWVJZH1gO1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoNTAwMClcbiAgICB9KTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICBjb25zdCByZXNwb25zZVRleHQgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgICBjb25zdCByZXNwb25zZVByZXZpZXcgPSByZXNwb25zZVRleHQuc2xpY2UoMCwgMjAwKTtcbiAgICAgIGxvZ2dlcj8uZGVidWcoJ0lzc3VlIGRpZmYgZmV0Y2ggZmFpbGVkJywgeyBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyB9KTtcbiAgICAgIHRocm93IG5ldyBBcGlFcnJvcignSXNzdWUgZGlmZiBmZXRjaCBmYWlsZWQnLCB7XG4gICAgICAgIHVybCxcbiAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXG4gICAgICAgIHN0YXR1c1RleHQ6IHJlc3BvbnNlLnN0YXR1c1RleHQsXG4gICAgICAgIHJlc3BvbnNlUHJldmlld1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiAoYXdhaXQgcmVzcG9uc2UuanNvbigpKSBhcyBTZXNzaW9uRGlmZlJlc3BvbnNlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIC8vIFJlLXRocm93IEFwaUVycm9yIHdpdGhvdXQgd3JhcHBpbmdcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcGlFcnJvcikge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICAgIGxvZ2dlcj8uZGVidWcoJ0lzc3VlIGRpZmYgZmV0Y2ggZXJyb3InLCB7IGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgIHRocm93IG5ldyBBcGlFcnJvcihgSXNzdWUgZGlmZiBmZXRjaCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCwge1xuICAgICAgdXJsLFxuICAgICAgY2F1c2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKVxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogRmV0Y2hlcyBhIHNpbmdsZSBpc3N1ZSBieSBJRC5cbiAqXG4gKiBAcGFyYW0gaXNzdWVJZCAtIElzc3VlIElEXG4gKiBAcGFyYW0gYmFzZVVybCAtIEFQSSBiYXNlIFVSTFxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBpbnN0YW5jZVxuICogQHJldHVybnMgSXNzdWUgb3IgbnVsbCBvbiBmYWlsdXJlXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaElzc3VlKGlzc3VlSWQ6IHN0cmluZywgYmFzZVVybDogc3RyaW5nLCBsb2dnZXI/OiBMb2dnZXIpOiBQcm9taXNlPElzc3VlIHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vaXNzdWVzLyR7aXNzdWVJZH1gLCB7XG4gICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoNTAwMClcbiAgICB9KTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICBsb2dnZXI/LmRlYnVnKCdJc3N1ZSBmZXRjaCBmYWlsZWQnLCB7IHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzIH0pO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiAoYXdhaXQgcmVzcG9uc2UuanNvbigpKSBhcyBJc3N1ZTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXI/LmRlYnVnKCdJc3N1ZSBmZXRjaCBlcnJvcicsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBQb3N0cyBhIHNlc3Npb24gY29tbWVudCB0byBhbiBpc3N1ZS5cbiAqXG4gKiBAcGFyYW0gaXNzdWVJZCAtIElzc3VlIElEXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGJhc2VVcmwgLSBBUEkgYmFzZSBVUkxcbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgaW5zdGFuY2VcbiAqIEByZXR1cm5zIHRydWUgb24gc3VjY2Vzc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcG9zdFNlc3Npb25Db21tZW50KFxuICBpc3N1ZUlkOiBzdHJpbmcsXG4gIHNlc3Npb25JZDogc3RyaW5nLFxuICBiYXNlVXJsOiBzdHJpbmcsXG4gIGxvZ2dlcj86IExvZ2dlclxuKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9pc3N1ZXMvJHtpc3N1ZUlkfS9jb21tZW50c2AsIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHNlc3Npb25JZCwgYXV0aG9yOiAnYWdlbnQnIH0pLFxuICAgICAgc2lnbmFsOiBBYm9ydFNpZ25hbC50aW1lb3V0KDIwMDApXG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3BvbnNlLm9rO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlcj8uZGVidWcoJ1Bvc3Qgc2Vzc2lvbiBjb21tZW50IGZhaWxlZCcsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogRGVsZXRlcyBzZXNzaW9uIHdhdGVybWFyay5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGJhc2VVcmwgLSBBUEkgYmFzZSBVUkxcbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgaW5zdGFuY2VcbiAqIEByZXR1cm5zIHRydWUgb24gc3VjY2Vzc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVsZXRlU2Vzc2lvbldhdGVybWFyayhzZXNzaW9uSWQ6IHN0cmluZywgYmFzZVVybDogc3RyaW5nLCBsb2dnZXI/OiBMb2dnZXIpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L3Nlc3Npb24vJHtzZXNzaW9uSWR9YCwge1xuICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgIHNpZ25hbDogQWJvcnRTaWduYWwudGltZW91dCgyMDAwKVxuICAgIH0pO1xuICAgIHJldHVybiByZXNwb25zZS5vaztcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXI/LmRlYnVnKCdEZWxldGUgc2Vzc2lvbiB3YXRlcm1hcmsgZmFpbGVkJywgeyBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBOb3RpZmllcyBleHRlbnNpb24gdGhhdCBzZXNzaW9uIGlzIHN0YXJ0aW5nL2FjdGl2ZS5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGRpc3BhdGNoZXJQaWQgLSBEaXNwYXRjaGVyIFBJRFxuICogQHBhcmFtIGJhc2VVcmwgLSBBUEkgYmFzZSBVUkxcbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgaW5zdGFuY2VcbiAqIEByZXR1cm5zIHRydWUgb24gc3VjY2Vzc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbm90aWZ5U2Vzc2lvblN0YXJ0KFxuICBzZXNzaW9uSWQ6IHN0cmluZyxcbiAgZGlzcGF0Y2hlclBpZDogbnVtYmVyLFxuICBiYXNlVXJsOiBzdHJpbmcsXG4gIGxvZ2dlcj86IExvZ2dlclxuKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9zZXNzaW9uL3N0YXJ0YCwge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgc2Vzc2lvbklkLCBkaXNwYXRjaGVyUGlkIH0pLFxuICAgICAgc2lnbmFsOiBBYm9ydFNpZ25hbC50aW1lb3V0KDIwMDApXG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3BvbnNlLm9rO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlcj8uZGVidWcoJ05vdGlmeSBzZXNzaW9uIHN0YXJ0IGZhaWxlZCcsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogTm90aWZpZXMgZXh0ZW5zaW9uIHRoYXQgc2Vzc2lvbiBpcyBzdG9wcGluZy5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGRpc3BhdGNoZXJQaWQgLSBEaXNwYXRjaGVyIFBJRFxuICogQHBhcmFtIGJhc2VVcmwgLSBBUEkgYmFzZSBVUkxcbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgaW5zdGFuY2VcbiAqIEByZXR1cm5zIHRydWUgb24gc3VjY2Vzc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbm90aWZ5U2Vzc2lvblN0b3AoXG4gIHNlc3Npb25JZDogc3RyaW5nLFxuICBkaXNwYXRjaGVyUGlkOiBudW1iZXIsXG4gIGJhc2VVcmw6IHN0cmluZyxcbiAgbG9nZ2VyPzogTG9nZ2VyXG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L3Nlc3Npb24vc3RvcGAsIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHNlc3Npb25JZCwgZGlzcGF0Y2hlclBpZCB9KSxcbiAgICAgIHNpZ25hbDogQWJvcnRTaWduYWwudGltZW91dCgyMDAwKVxuICAgIH0pO1xuICAgIHJldHVybiByZXNwb25zZS5vaztcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXI/LmRlYnVnKCdOb3RpZnkgc2Vzc2lvbiBzdG9wIGZhaWxlZCcsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogUG9zdHMgYSBjb21taXQgY29tbWVudCB0byBhbiBpc3N1ZS5cbiAqXG4gKiBAcGFyYW0gaXNzdWVJZCAtIElzc3VlIElEXG4gKiBAcGFyYW0gY29tbWl0U2hhIC0gQ29tbWl0IFNIQVxuICogQHBhcmFtIGJhc2VVcmwgLSBBUEkgYmFzZSBVUkxcbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgaW5zdGFuY2VcbiAqIEByZXR1cm5zIHRydWUgb24gc3VjY2VzcywgZmFsc2Ugb24gZmFpbHVyZVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcG9zdENvbW1pdENvbW1lbnQoXG4gIGlzc3VlSWQ6IHN0cmluZyxcbiAgY29tbWl0U2hhOiBzdHJpbmcsXG4gIGJhc2VVcmw6IHN0cmluZyxcbiAgbG9nZ2VyPzogTG9nZ2VyXG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2lzc3Vlcy8ke2lzc3VlSWR9L2NvbW1lbnRzYCwge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgY29tbWl0U2hhLCBhdXRob3I6ICdhZ2VudCcgfSksXG4gICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoMjAwMClcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzcG9uc2Uub2s7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyPy5kZWJ1ZygnUG9zdCBjb21taXQgY29tbWVudCBmYWlsZWQnLCB7IGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIEZldGNoZXMgY29tbWl0IGNvbW1lbnRzIGZvciBhbiBpc3N1ZS5cbiAqXG4gKiBAcGFyYW0gaXNzdWVJZCAtIElzc3VlIElEXG4gKiBAcGFyYW0gYmFzZVVybCAtIEFQSSBiYXNlIFVSTFxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBpbnN0YW5jZVxuICogQHJldHVybnMgQXJyYXkgb2YgY29tbWl0IGNvbW1lbnRzLCBvciBlbXB0eSBhcnJheSBvbiBmYWlsdXJlXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaENvbW1pdENvbW1lbnRzKGlzc3VlSWQ6IHN0cmluZywgYmFzZVVybDogc3RyaW5nLCBsb2dnZXI/OiBMb2dnZXIpOiBQcm9taXNlPENvbW1pdENvbW1lbnRbXT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vaXNzdWVzLyR7aXNzdWVJZH0vY29tbWVudHNgLCB7XG4gICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoNTAwMClcbiAgICB9KTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICBsb2dnZXI/LmRlYnVnKCdGZXRjaCBjb21taXQgY29tbWVudHMgZmFpbGVkJywgeyBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyB9KTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgY29tbWVudHMgPSAoYXdhaXQgcmVzcG9uc2UuanNvbigpKSBhcyBBcnJheTx7IGlkOiBzdHJpbmc7IGNvbW1pdFNoYT86IHN0cmluZyB9PjtcbiAgICByZXR1cm4gY29tbWVudHNcbiAgICAgIC5maWx0ZXIoKGNvbW1lbnQpOiBjb21tZW50IGlzIHsgaWQ6IHN0cmluZzsgY29tbWl0U2hhOiBzdHJpbmcgfSA9PiB0eXBlb2YgY29tbWVudC5jb21taXRTaGEgPT09ICdzdHJpbmcnKVxuICAgICAgLm1hcCgoeyBpZCwgY29tbWl0U2hhIH0pID0+ICh7IGlkLCBjb21taXRTaGEgfSkpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlcj8uZGVidWcoJ0ZldGNoIGNvbW1pdCBjb21tZW50cyBmYWlsZWQnLCB7IGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgIHJldHVybiBbXTtcbiAgfVxufVxuXG4vKipcbiAqIERlbGV0ZXMgYSBjb21tZW50IGZyb20gYW4gaXNzdWUuXG4gKlxuICogQHBhcmFtIGlzc3VlSWQgLSBJc3N1ZSBJRFxuICogQHBhcmFtIGNvbW1lbnRJZCAtIENvbW1lbnQgSURcbiAqIEBwYXJhbSBiYXNlVXJsIC0gQVBJIGJhc2UgVVJMXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlXG4gKiBAcmV0dXJucyB0cnVlIG9uIHN1Y2Nlc3MsIGZhbHNlIG9uIGZhaWx1cmVcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZUNvbW1lbnQoXG4gIGlzc3VlSWQ6IHN0cmluZyxcbiAgY29tbWVudElkOiBzdHJpbmcsXG4gIGJhc2VVcmw6IHN0cmluZyxcbiAgbG9nZ2VyPzogTG9nZ2VyXG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2lzc3Vlcy8ke2lzc3VlSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWAsIHtcbiAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoMjAwMClcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzcG9uc2Uub2s7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyPy5kZWJ1ZygnRGVsZXRlIGNvbW1lbnQgZmFpbGVkJywgeyBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiIsICIvKipcbiAqIElQQyB1dGlsaXRpZXMgZm9yIHRoZSBcIlNpZ25hbC1BdWdtZW50ZWQgRXhlY3V0aW9uIEJyaWRnZVwiLlxuICpcbiAqIFRoaXMgbW9kdWxlIHByb3ZpZGVzIHRoZSBjb21tdW5pY2F0aW9uIHByaW1pdGl2ZXMgdXNlZCBieSBDbGF1ZGUgaG9va3MgdG9cbiAqIHNpZ25hbCBzdGF0ZSBjaGFuZ2VzIGJhY2sgdG8gdGhlIGV4dGVuc2lvbidzIHN1cGVydmlzb3IgKHRoZSB3cmFwcGVyIHNjcmlwdCkuXG4gKlxuICogSXQgdXNlcyBQT1NJWCBzaWduYWxzIGFzIGEgbGlnaHR3ZWlnaHQsIG91dC1vZi1iYW5kIHNpZ25hbGluZyBtZWNoYW5pc21cbiAqIHRoYXQgYnlwYXNzZXMgc3RhbmRhcmQgc3Rkb3V0L3N0ZGVyciBzdHJlYW1zLCBwcmV2ZW50aW5nIGludGVyZmVyZW5jZSB3aXRoXG4gKiBDbGF1ZGUncyBwcmltYXJ5IG91dHB1dCBvciB0ZXJtaW5hbCBVSS5cbiAqXG4gKiBAbW9kdWxlIGxpYi9pcGNcbiAqIEBzZWUgQ2xhdWRlV3JhcHBlclNjcmlwdFNlcnZpY2VcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IExvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSBgRElTUEFUQ0hFUl9QSURgIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSBQSUQgaXMgaW5qZWN0ZWQgYnkgYENsYXVkZVdyYXBwZXJTY3JpcHRTZXJ2aWNlYCB3aGVuIGJvb3RzdHJhcHBpbmcgdGhlXG4gKiBlcGhlbWVyYWwgc3VwZXJ2aXNvciBzY3JpcHQuIFRoaXMgUElEIGlzIHJlcXVpcmVkIGZvciBhbGwgSVBDIHNpZ25hbGluZ1xuICogb3BlcmF0aW9ucyBpbiB0aGUgU2lnbmFsLUF1Z21lbnRlZCBFeGVjdXRpb24gQnJpZGdlLlxuICpcbiAqIEJlaGF2aW9yYWwgY29udHJhY3Q6XG4gKiAtIFJldHVybnMgYG51bGxgIGlmIGBESVNQQVRDSEVSX1BJRGAgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgbm90IHNldC5cbiAqIC0gUmV0dXJucyBgbnVsbGAgaWYgdGhlIHZhbHVlIGNhbm5vdCBiZSBwYXJzZWQgYXMgYSBiYXNlLTEwIGludGVnZXIuXG4gKiAtIFJldHVybnMgdGhlIHBhcnNlZCBpbnRlZ2VyIGlmIGJvdGggY29uZGl0aW9ucyBwYXNzLlxuICpcbiAqIEByZXR1cm5zIERpc3BhdGNoZXIgUElEIG9yIG51bGwgaWYgbm90IHNldCBvciBpbnZhbGlkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGlzcGF0Y2hlclBpZCgpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3QgcGlkID0gcHJvY2Vzcy5lbnYuRElTUEFUQ0hFUl9QSUQ7XG4gIGlmICghcGlkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyLnBhcnNlSW50KHBpZCwgMTApO1xuICByZXR1cm4gTnVtYmVyLmlzTmFOKHBhcnNlZCkgPyBudWxsIDogcGFyc2VkO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgZGlzcGF0Y2hlciBwcm9jZXNzIGlzIGFsaXZlIHVzaW5nIGBraWxsKHBpZCwgMClgLlxuICpcbiAqIFN0cmF0ZWd5OiBTZW5kaW5nIHNpZ25hbCAwIGlzIGEgc3RhbmRhcmQgUE9TSVggdGVjaG5pcXVlIHRvIHByb2JlIHByb2Nlc3NcbiAqIGV4aXN0ZW5jZSBhbmQgcGVybWlzc2lvbiB3aXRob3V0IGRlbGl2ZXJpbmcgYSBzaWduYWwuIFRoaXMgaXMgYW4gYXRvbWljXG4gKiBvcnBoYW4tZGV0ZWN0aW9uIHByaW1pdGl2ZSBmb3IgdGhlIFNpZ25hbC1BdWdtZW50ZWQgRXhlY3V0aW9uIEJyaWRnZS5cbiAqXG4gKiBCZWhhdmlvcmFsIGNvbnRyYWN0OlxuICogLSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgcHJvY2VzcyBleGlzdHMgYW5kIHRoZSBjYWxsZXIgaGFzIHBlcm1pc3Npb24gdG8gc2lnbmFsIGl0LlxuICogLSBSZXR1cm5zIGBmYWxzZWAgb24gYW55IGVycm9yIChwcm9jZXNzIG5vdCBmb3VuZCwgcGVybWlzc2lvbiBkZW5pZWQsIGludmFsaWQgUElELCBldGMuKS5cbiAqIC0gRG9lcyBub3QgbW9kaWZ5IHRoZSB0YXJnZXQgcHJvY2VzcyBvciBkZWxpdmVyIGEgc2lnbmFsLlxuICpcbiAqIEBwYXJhbSBwaWQgLSBEaXNwYXRjaGVyIFBJRCB0byBjaGVjay5cbiAqIEByZXR1cm5zIGB0cnVlYCBpZiB0aGUgcHJvY2VzcyBleGlzdHMgYW5kIGlzIHJlYWNoYWJsZSwgYGZhbHNlYCBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Rpc3BhdGNoZXJBbGl2ZShwaWQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIC8vIGtpbGwocGlkLCAwKSBjaGVja3MgaWYgcHJvY2VzcyBleGlzdHMgd2l0aG91dCBzZW5kaW5nIHNpZ25hbFxuICAgIHByb2Nlc3Mua2lsbChwaWQsIDApO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBTaWduYWxzIHRoYXQgQ2xhdWRlIGlzIGFjdGl2ZWx5IHByb2Nlc3NpbmcgYSByZXF1ZXN0IHVzaW5nIGBTSUdVUkdgLlxuICpcbiAqIEluIHRoZSBTaWduYWwtQXVnbWVudGVkIEV4ZWN1dGlvbiBCcmlkZ2UsIGBTSUdVUkdgIGFjdHMgYXMgYSBoZWFydGJlYXQgdGhhdFxuICogdGVsbHMgdGhlIGRpc3BhdGNoZXIgXCJDbGF1ZGUgaXMgd29ya2luZ1wiLiBUaGUgd3JhcHBlciBzY3JpcHQgdHJhcHMgdGhpcyBzaWduYWxcbiAqIGFuZCB1cGRhdGVzIHRoZSBWUyBDb2RlIFVJIHRvIFwiQWN0aXZlXCIgc3RhdGUsIGVuYWJsaW5nIHN1Yi1zZWNvbmQgdHJhbnNwYXJlbmN5XG4gKiBvZiBDbGF1ZGUncyBwcm9jZXNzaW5nIHN0YXRlLlxuICpcbiAqIFdoeSBgU0lHVVJHYD86IFN0YW5kYXJkbHkgcmVzZXJ2ZWQgZm9yIFwiVXJnZW50IERhdGFcIiBvbiBzb2NrZXRzLCB0aGlzIHNpZ25hbFxuICogaXMgbm9uLXRlcm1pbmF0aW5nIGJ5IGRlZmF1bHQgb24gbW9zdCBVbml4IHN5c3RlbXMgYW5kIHJhcmVseSByZS1wdXJwb3NlZCBieVxuICogb3RoZXIgdG9vbHMsIG1ha2luZyBpdCBzYWZlIGZvciBpbi1wcm9jZXNzIHN0YXRlIHNpZ25hbGluZy5cbiAqXG4gKiBCZWhhdmlvcmFsIGNvbnRyYWN0OlxuICogLSBJZiBgU0lHTkFMX0FDVElWRV9URVNUX01PREU9MWAgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgc2V0LCBsb2dzIGRlYnVnIG91dHB1dFxuICogICBhbmQgcmV0dXJucyBgdHJ1ZWAgd2l0aG91dCBzZW5kaW5nIHRoZSBzaWduYWwgKHRlc3QgaGFybmVzcyBlc2NhcGUgaGF0Y2gpLlxuICogLSBBdHRlbXB0cyB0byBkZWxpdmVyIGBTSUdVUkdgIHRvIHRoZSBkaXNwYXRjaGVyIHByb2Nlc3MuXG4gKiAtIFJldHVybnMgYHRydWVgIGlmIGRlbGl2ZXJ5IHN1Y2NlZWRlZCwgYGZhbHNlYCBpZiBwcm9jZXNzIGlzIGRlYWQgb3IgYWNjZXNzIGRlbmllZC5cbiAqIC0gTG9ncyB3YXJuaW5ncyBvbiBkZWxpdmVyeSBmYWlsdXJlIChvcHRpb25hbCBsb2dnZXIgcGFyYW1ldGVyKS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gRGlzcGF0Y2hlciBQSUQuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gT3B0aW9uYWwgbG9nZ2VyIGZvciBkZWJ1Z2dpbmcgZGlzcGF0Y2ggZmFpbHVyZXMuXG4gKiBAcmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHNpZ25hbCB3YXMgc3VjY2Vzc2Z1bGx5IGRlbGl2ZXJlZCAob3IgdGVzdCBtb2RlIGJ5cGFzc2VkKSwgYGZhbHNlYCBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaWduYWxBY3RpdmUocGlkOiBudW1iZXIsIGxvZ2dlcj86IExvZ2dlcik6IGJvb2xlYW4ge1xuICBpZiAocHJvY2Vzcy5lbnYuU0lHTkFMX0FDVElWRV9URVNUX01PREUgPT09ICcxJykge1xuICAgIGxvZ2dlcj8uZGVidWcoJ1RFU1RfTU9ERTogV291bGQgc2VuZCBTSUdVUkcnLCB7IHBpZCB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgcHJvY2Vzcy5raWxsKHBpZCwgJ1NJR1VSRycpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlcj8ud2FybignRmFpbGVkIHRvIHNpZ25hbCBkaXNwYXRjaGVyIGFjdGl2ZScsIHtcbiAgICAgIHBpZCxcbiAgICAgIGVycm9yOiBTdHJpbmcoZXJyb3IpXG4gICAgfSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogU2lnbmFscyB0aGF0IENsYXVkZSBpcyBpZGxlIG9yIGFib3V0IHRvIHN0b3AgdXNpbmcgYFNJR1dJTkNIYC5cbiAqXG4gKiBJbiB0aGUgU2lnbmFsLUF1Z21lbnRlZCBFeGVjdXRpb24gQnJpZGdlLCBgU0lHV0lOQ0hgIHRlbGxzIHRoZSBkaXNwYXRjaGVyXG4gKiBcIkNsYXVkZSBpcyBwYXVzZWQgYW5kIHdhaXRpbmcgZm9yIHVzZXIgaW5wdXRcIi4gVGhlIHdyYXBwZXIgc2NyaXB0IHRyYXBzIHRoaXNcbiAqIHNpZ25hbCBhbmQgdHJhbnNpdGlvbnMgdGhlIFZTIENvZGUgVUkgdG8gXCJJZGxlXCIgc3RhdGUsIHNpZ25hbGluZyB0aGF0IHRoZSB1c2VyXG4gKiBjYW4gaW50ZXJhY3Qgd2l0aCB0aGUgZWRpdG9yIHdpdGhvdXQgaW50ZXJydXB0aW5nIENsYXVkZS5cbiAqXG4gKiBXaHkgYFNJR1dJTkNIYD86IFN0YW5kYXJkbHkgcmVzZXJ2ZWQgZm9yIFwiV2luZG93IENoYW5nZVwiICh0ZXJtaW5hbCByZXNpemUpLlxuICogV2hpbGUgaXQgaGFzIHNlbWFudGljIG1lYW5pbmcgaW4gdGVybWluYWwgY29udGV4dHMsIGl0IGlzIG5vbi10ZXJtaW5hdGluZyBhbmRcbiAqIGNhbiBiZSBzYWZlbHkgdHJhcHBlZCBieSB0aGUgc3VwZXJ2aXNvciBzY3JpcHQgdG8gc2lnbmFsIFVJIHN0YXRlIHRyYW5zaXRpb25zLlxuICpcbiAqIEJlaGF2aW9yYWwgY29udHJhY3Q6XG4gKiAtIElmIGBTRVNTSU9OX1NUT1BfVEVTVF9NT0RFPTFgIGVudmlyb25tZW50IHZhcmlhYmxlIGlzIHNldCwgbG9ncyBkZWJ1ZyBvdXRwdXRcbiAqICAgYW5kIHJldHVybnMgYHRydWVgIHdpdGhvdXQgc2VuZGluZyB0aGUgc2lnbmFsICh0ZXN0IGhhcm5lc3MgZXNjYXBlIGhhdGNoKS5cbiAqIC0gQXR0ZW1wdHMgdG8gZGVsaXZlciBgU0lHV0lOQ0hgIHRvIHRoZSBkaXNwYXRjaGVyIHByb2Nlc3MuXG4gKiAtIFJldHVybnMgYHRydWVgIGlmIGRlbGl2ZXJ5IHN1Y2NlZWRlZCwgYGZhbHNlYCBpZiBwcm9jZXNzIGlzIGRlYWQgb3IgYWNjZXNzIGRlbmllZC5cbiAqIC0gTG9ncyB3YXJuaW5ncyBvbiBkZWxpdmVyeSBmYWlsdXJlIChvcHRpb25hbCBsb2dnZXIgcGFyYW1ldGVyKS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gRGlzcGF0Y2hlciBQSUQuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gT3B0aW9uYWwgbG9nZ2VyIGZvciBkZWJ1Z2dpbmcgZGlzcGF0Y2ggZmFpbHVyZXMuXG4gKiBAcmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHNpZ25hbCB3YXMgc3VjY2Vzc2Z1bGx5IGRlbGl2ZXJlZCAob3IgdGVzdCBtb2RlIGJ5cGFzc2VkKSwgYGZhbHNlYCBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaWduYWxJZGxlKHBpZDogbnVtYmVyLCBsb2dnZXI/OiBMb2dnZXIpOiBib29sZWFuIHtcbiAgaWYgKHByb2Nlc3MuZW52LlNFU1NJT05fU1RPUF9URVNUX01PREUgPT09ICcxJykge1xuICAgIGxvZ2dlcj8uZGVidWcoJ1RFU1RfTU9ERTogV291bGQgc2VuZCBTSUdXSU5DSCcsIHsgcGlkIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBwcm9jZXNzLmtpbGwocGlkLCAnU0lHV0lOQ0gnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXI/Lndhcm4oJ0ZhaWxlZCB0byBzaWduYWwgZGlzcGF0Y2hlciBpZGxlJywge1xuICAgICAgcGlkLFxuICAgICAgZXJyb3I6IFN0cmluZyhlcnJvcilcbiAgICB9KTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiIsICIvKipcbiAqIE91dHB1dCBoZWxwZXJzIGZvciBidWlsZGluZyBodW1hbi1yZWFkYWJsZSBtZXNzYWdlcyBmcm9tIEFQSSByZXNwb25zZXMuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGlmZlJlc3BvbnNlIH0gZnJvbSAnQGdvb2Rmb290L2FwaS10eXBlcyc7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGRpZmYgcmVzcG9uc2UgaGFzIGFueSB1cGRhdGVzLlxuICpcbiAqIFVwZGF0ZXMgYXJlIGluZGljYXRlZCBieSB0aGUgcHJlc2VuY2Ugb2YganNvblBhdGNoIG9wZXJhdGlvbnMuXG4gKlxuICogQHBhcmFtIGRpZmYgLSBTZXNzaW9uIGRpZmYgcmVzcG9uc2VcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlcmUgYXJlIHVwZGF0ZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc1VwZGF0ZXMoZGlmZjogU2Vzc2lvbkRpZmZSZXNwb25zZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gZGlmZi5qc29uUGF0Y2gubGVuZ3RoID4gMDtcbn1cblxuLyoqXG4gKiBCdWlsZHMgaHVtYW4tcmVhZGFibGUgdXBkYXRlIHN1bW1hcnkgZnJvbSBkaWZmIHJlc3BvbnNlLlxuICpcbiAqIFBhcnNlcyBqc29uUGF0Y2ggdG8gY291bnQgbmV3IGNvbW1lbnRzIChvcDogJ2FkZCcsIHBhdGg6ICcvY29tbWVudHMvLScpXG4gKiBhbmQgZmllbGQgY2hhbmdlcyAob3A6ICdyZXBsYWNlJyBvbiBvdGhlciBwYXRocykuXG4gKlxuICogQHBhcmFtIGRpZmYgLSBTZXNzaW9uIGRpZmYgcmVzcG9uc2VcbiAqIEByZXR1cm5zIEh1bWFuLXJlYWRhYmxlIHN0cmluZyBsaWtlIFwiMSBuZXcgY29tbWVudFwiIG9yIFwiMiBuZXcgY29tbWVudHMgYW5kIDEgZmllbGQgY2hhbmdlXCJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVXBkYXRlU3VtbWFyeShkaWZmOiBTZXNzaW9uRGlmZlJlc3BvbnNlKTogc3RyaW5nIHtcbiAgbGV0IGNvbW1lbnRDb3VudCA9IDA7XG4gIGxldCBjaGFuZ2VDb3VudCA9IDA7XG5cbiAgZm9yIChjb25zdCBwYXRjaCBvZiBkaWZmLmpzb25QYXRjaCkge1xuICAgIGlmIChwYXRjaC5vcCA9PT0gJ2FkZCcgJiYgcGF0Y2gucGF0aCA9PT0gJy9jb21tZW50cy8tJykge1xuICAgICAgY29tbWVudENvdW50Kys7XG4gICAgfSBlbHNlIGlmIChwYXRjaC5vcCA9PT0gJ3JlcGxhY2UnKSB7XG4gICAgICBjaGFuZ2VDb3VudCsrO1xuICAgIH1cbiAgfVxuXG4gIC8vIEJ1aWxkIG1lc3NhZ2UgcGFydHNcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKGNvbW1lbnRDb3VudCA+IDApIHtcbiAgICBwYXJ0cy5wdXNoKGNvbW1lbnRDb3VudCA9PT0gMSA/ICcxIG5ldyBjb21tZW50JyA6IGAke2NvbW1lbnRDb3VudH0gbmV3IGNvbW1lbnRzYCk7XG4gIH1cblxuICBpZiAoY2hhbmdlQ291bnQgPiAwKSB7XG4gICAgcGFydHMucHVzaChjaGFuZ2VDb3VudCA9PT0gMSA/ICcxIGZpZWxkIGNoYW5nZScgOiBgJHtjaGFuZ2VDb3VudH0gZmllbGQgY2hhbmdlc2ApO1xuICB9XG5cbiAgY29uc3Qgc3VtbWFyeSA9IHBhcnRzLmpvaW4oJyBhbmQgJyk7XG5cbiAgLy8gQWRkIGlzc3VlIGNvbnRleHRcbiAgY29uc3QgaXNzdWVDb3VudCA9IGRpZmYuaXNzdWVzLmxlbmd0aDtcbiAgaWYgKGlzc3VlQ291bnQgPT09IDEpIHtcbiAgICBjb25zdCBpc3N1ZVRpdGxlID0gZGlmZi5pc3N1ZXNbMF0uaXNzdWVUaXRsZSA/PyAndW5rbm93bic7XG4gICAgcmV0dXJuIGBJc3N1ZSB1cGRhdGVkOiAke3N1bW1hcnl9IG9uIFwiJHtpc3N1ZVRpdGxlfVwiYDtcbiAgfVxuICByZXR1cm4gYElzc3VlcyB1cGRhdGVkOiAke3N1bW1hcnl9IGFjcm9zcyAke2lzc3VlQ291bnR9IGlzc3Vlc2A7XG59XG5cbi8qKlxuICogRm9ybWF0cyBhIHNraWxsIGxpc3QgZm9yIGRpc3BsYXkuXG4gKlxuICogQHBhcmFtIHNraWxscyAtIEFycmF5IG9mIHNraWxsIG5hbWVzXG4gKiBAcmV0dXJucyBGb3JtYXR0ZWQgc3RyaW5nIGxpa2UgXCInc2tpbGwxJyBhbmQgJ3NraWxsMidcIlxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0U2tpbGxMaXN0KHNraWxsczogc3RyaW5nW10pOiBzdHJpbmcge1xuICBjb25zdCBwcmVmaXhlZCA9IHNraWxscy5tYXAoKHMpID0+IGAnY2xhdWRlLWNvZGUtY2xpOiR7c30nYCk7XG5cbiAgaWYgKHByZWZpeGVkLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBwcmVmaXhlZFswXTtcbiAgfVxuICBpZiAocHJlZml4ZWQubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIGAke3ByZWZpeGVkWzBdfSBhbmQgJHtwcmVmaXhlZFsxXX1gO1xuICB9XG4gIC8vIFRocmVlIG9yIG1vcmU6ICdza2lsbDEnLCAnc2tpbGwyJywgYW5kICdza2lsbDMnXG4gIGNvbnN0IGFsbEJ1dExhc3QgPSBwcmVmaXhlZC5zbGljZSgwLCAtMSk7XG4gIGNvbnN0IGxhc3QgPSBwcmVmaXhlZFtwcmVmaXhlZC5sZW5ndGggLSAxXTtcbiAgcmV0dXJuIGAke2FsbEJ1dExhc3Quam9pbignLCAnKX0sIGFuZCAke2xhc3R9YDtcbn1cbiIsICIvKipcbiAqIFN0YXRlIGZpbGUgdXRpbGl0aWVzIGZvciBob29rIHNjcmlwdHMuXG4gKlxuICogUHJvdmlkZXMgZnVuY3Rpb25zIGZvciBtYW5hZ2luZyBzZXNzaW9uIHN0YXRlIGZpbGVzIHVzZWQgZm9yIHRyYWNraW5nXG4gKiBDTEkgc2tpbGxzIGFjcm9zcyBjb250ZXh0IGNvbXBhY3Rpb24uXG4gKlxuICogU3RhdGUgZmlsZSBsb2NhdGlvbjogJEhPTUUvLmNvbXBhcmUtYnJhbmNoL2hvb2stc3RhdGUvJHtzZXNzaW9uX2lkfS5qc29uXG4gKi9cblxuaW1wb3J0IHsgZXhpc3RzU3luYywgbWtkaXJTeW5jLCByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdub2RlOm9zJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHR5cGUgeyBMb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuXG5jb25zdCBTVEFURV9ESVIgPSBqb2luKGhvbWVkaXIoKSwgJy5jb21wYXJlLWJyYW5jaCcsICdob29rLXN0YXRlJyk7XG5cbmludGVyZmFjZSBTZXNzaW9uU3RhdGUge1xuICBjbGlTa2lsbHM6IHN0cmluZ1tdO1xuICAvKiogU2V0IHdoZW4gQVBJIGZhaWx1cmUgaGFzIGJlZW4gcmVwb3J0ZWQgdG8gcHJldmVudCByZXBlYXRlZCBibG9ja2luZyAqL1xuICBhcGlGYWlsdXJlUmVwb3J0ZWQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEdldHMgdGhlIHN0YXRlIGRpcmVjdG9yeSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGVEaXIoKTogc3RyaW5nIHtcbiAgcmV0dXJuIFNUQVRFX0RJUjtcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBzdGF0ZSBmaWxlIHBhdGggZm9yIGEgc2Vzc2lvbi5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGVGaWxlKHNlc3Npb25JZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oU1RBVEVfRElSLCBgJHtzZXNzaW9uSWR9Lmpzb25gKTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIHN0YXRlIGRpcmVjdG9yeSBpZiBuZWVkZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVTdGF0ZURpcigpOiB2b2lkIHtcbiAgaWYgKCFleGlzdHNTeW5jKFNUQVRFX0RJUikpIHtcbiAgICBta2RpclN5bmMoU1RBVEVfRElSLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJlYWRzIHN0YXRlIGZyb20gZmlsZS5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBpbnN0YW5jZVxuICogQHJldHVybnMgU2Vzc2lvbiBzdGF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN0YXRlKHNlc3Npb25JZDogc3RyaW5nLCBsb2dnZXI/OiBMb2dnZXIpOiBTZXNzaW9uU3RhdGUge1xuICBjb25zdCBzdGF0ZUZpbGUgPSBnZXRTdGF0ZUZpbGUoc2Vzc2lvbklkKTtcblxuICBpZiAoZXhpc3RzU3luYyhzdGF0ZUZpbGUpKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoc3RhdGVGaWxlLCAndXRmLTgnKTtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpIGFzIFNlc3Npb25TdGF0ZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyPy5kZWJ1ZygnRmFpbGVkIHRvIHJlYWQgc3RhdGUgZmlsZScsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHsgY2xpU2tpbGxzOiBbXSB9O1xufVxuXG4vKipcbiAqIFdyaXRlcyBzdGF0ZSB0byBmaWxlLlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIElEXG4gKiBAcGFyYW0gc3RhdGUgLSBTdGF0ZSB0byB3cml0ZVxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBpbnN0YW5jZVxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVTdGF0ZShzZXNzaW9uSWQ6IHN0cmluZywgc3RhdGU6IFNlc3Npb25TdGF0ZSwgbG9nZ2VyPzogTG9nZ2VyKTogdm9pZCB7XG4gIGVuc3VyZVN0YXRlRGlyKCk7XG5cbiAgY29uc3Qgc3RhdGVGaWxlID0gZ2V0U3RhdGVGaWxlKHNlc3Npb25JZCk7XG5cbiAgdHJ5IHtcbiAgICB3cml0ZUZpbGVTeW5jKHN0YXRlRmlsZSwgSlNPTi5zdHJpbmdpZnkoc3RhdGUsIG51bGwsIDIpLCAndXRmLTgnKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXI/Lndhcm4oJ0ZhaWxlZCB0byB3cml0ZSBzdGF0ZSBmaWxlJywgeyBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJlYWRzIGNsaVNraWxscyBhcnJheSBmcm9tIHN0YXRlLlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIElEXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlXG4gKiBAcmV0dXJucyBBcnJheSBvZiBza2lsbCBuYW1lc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZENsaVNraWxscyhzZXNzaW9uSWQ6IHN0cmluZywgbG9nZ2VyPzogTG9nZ2VyKTogc3RyaW5nW10ge1xuICBjb25zdCBzdGF0ZSA9IHJlYWRTdGF0ZShzZXNzaW9uSWQsIGxvZ2dlcik7XG4gIHJldHVybiBzdGF0ZS5jbGlTa2lsbHMgPz8gW107XG59XG5cbi8qKlxuICogQWRkcyBhIHNraWxsIHRvIGNsaVNraWxscyAoZGVkdXBsaWNhdGVkKS5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIHNraWxsTmFtZSAtIFNraWxsIG5hbWUgdG8gYWRkXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRDbGlTa2lsbChzZXNzaW9uSWQ6IHN0cmluZywgc2tpbGxOYW1lOiBzdHJpbmcsIGxvZ2dlcj86IExvZ2dlcik6IHZvaWQge1xuICBjb25zdCBzdGF0ZSA9IHJlYWRTdGF0ZShzZXNzaW9uSWQsIGxvZ2dlcik7XG4gIGNvbnN0IHNraWxscyA9IG5ldyBTZXQoc3RhdGUuY2xpU2tpbGxzID8/IFtdKTtcbiAgc2tpbGxzLmFkZChza2lsbE5hbWUpO1xuICBzdGF0ZS5jbGlTa2lsbHMgPSBbLi4uc2tpbGxzXTtcbiAgd3JpdGVTdGF0ZShzZXNzaW9uSWQsIHN0YXRlLCBsb2dnZXIpO1xufVxuXG4vKipcbiAqIENsZWFycyBjbGlTa2lsbHMgZnJvbSBzdGF0ZS5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBpbnN0YW5jZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJDbGlTa2lsbHMoc2Vzc2lvbklkOiBzdHJpbmcsIGxvZ2dlcj86IExvZ2dlcik6IHZvaWQge1xuICBjb25zdCBzdGF0ZUZpbGUgPSBnZXRTdGF0ZUZpbGUoc2Vzc2lvbklkKTtcblxuICBpZiAoIWV4aXN0c1N5bmMoc3RhdGVGaWxlKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGUgPSByZWFkU3RhdGUoc2Vzc2lvbklkLCBsb2dnZXIpO1xuICAgIC8vIENsZWFyIHNraWxscyBieSBzZXR0aW5nIHRvIGVtcHR5IGFycmF5IGluc3RlYWQgb2YgZGVsZXRlXG4gICAgc3RhdGUuY2xpU2tpbGxzID0gW107XG4gICAgd3JpdGVTdGF0ZShzZXNzaW9uSWQsIHN0YXRlLCBsb2dnZXIpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlcj8uZGVidWcoJ0ZhaWxlZCB0byBjbGVhciBDTEkgc2tpbGxzJywgeyBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIENoZWNrcyBpZiBBUEkgZmFpbHVyZSBoYXMgYmVlbiByZXBvcnRlZCBmb3IgdGhpcyBzZXNzaW9uLlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIElEXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlXG4gKiBAcmV0dXJucyB0cnVlIGlmIEFQSSBmYWlsdXJlIHdhcyBhbHJlYWR5IHJlcG9ydGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNBcGlGYWlsdXJlQmVlblJlcG9ydGVkKHNlc3Npb25JZDogc3RyaW5nLCBsb2dnZXI/OiBMb2dnZXIpOiBib29sZWFuIHtcbiAgY29uc3Qgc3RhdGUgPSByZWFkU3RhdGUoc2Vzc2lvbklkLCBsb2dnZXIpO1xuICByZXR1cm4gc3RhdGUuYXBpRmFpbHVyZVJlcG9ydGVkID09PSB0cnVlO1xufVxuXG4vKipcbiAqIE1hcmtzIEFQSSBmYWlsdXJlIGFzIHJlcG9ydGVkIGZvciB0aGlzIHNlc3Npb24uXG4gKiBVc2VkIHRvIHByZXZlbnQgcmVwZWF0ZWQgYmxvY2tpbmcgb24gQVBJIGZhaWx1cmVzLlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIElEXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXJrQXBpRmFpbHVyZVJlcG9ydGVkKHNlc3Npb25JZDogc3RyaW5nLCBsb2dnZXI/OiBMb2dnZXIpOiB2b2lkIHtcbiAgY29uc3Qgc3RhdGUgPSByZWFkU3RhdGUoc2Vzc2lvbklkLCBsb2dnZXIpO1xuICBzdGF0ZS5hcGlGYWlsdXJlUmVwb3J0ZWQgPSB0cnVlO1xuICB3cml0ZVN0YXRlKHNlc3Npb25JZCwgc3RhdGUsIGxvZ2dlcik7XG59XG4iLCAiLyoqXG4gKiBTdG9wIGhvb2s6IE1hbmFnZXMgXCJJZGxlXCIgdHJhbnNpdGlvbnMgYW5kIGNvbnRleHQgaW5qZWN0aW9uIGZvciB0aGUgYWdlbnQuXG4gKlxuICogVGhpcyBob29rIGlzIHJlc3BvbnNpYmxlIGZvciB0aGUgZ3JhY2VmdWwgXCJoYW5kLW9mZlwiIGJldHdlZW4gdGhlIGF1dG9ub21vdXNcbiAqIGFnZW50IGFuZCB0aGUgdXNlci4gSXQgbWFuYWdlcyB0d28gbWFpbiBzY2VuYXJpb3M6XG4gKlxuICogMS4gKipDb250ZXh0IFJlZnJlc2ggKEJsb2NraW5nKSoqOiBJZiB0aGUgaXNzdWUgYmVpbmcgd29ya2VkIG9uIGhhcyB1cGRhdGVzIChuZXdcbiAqICAgIGNvbW1lbnRzIG9yIGZpZWxkIGNoYW5nZXMpIHdoaWxlIENsYXVkZSB3YXMgcnVubmluZywgdGhpcyBob29rIGJsb2NrcyB0aGVcbiAqICAgIHN0b3AgcmVxdWVzdCBhbmQgaW5qZWN0cyB0aGUgdXBkYXRlcyBhcyBhIEpTT04gcGF0Y2guIFRoaXMgZm9yY2VzIENsYXVkZSB0b1xuICogICAgYWNrbm93bGVkZ2UgdGhlIG5ldyBjb250ZXh0IGJlZm9yZSBpdCBjYW4gZmluaXNoLlxuICogMi4gKipJZGxlIFNpZ25hbGluZyAoU0lHV0lOQ0gpKio6IElmIHRoZXJlIGFyZSBubyB1cGRhdGVzIGFuZCB0aGUgYWdlbnQgaXNcbiAqICAgIGFsbG93ZWQgdG8gc3RvcCwgdGhpcyBob29rIHNlbmRzIGBTSUdXSU5DSGAgdG8gdGhlIGBESVNQQVRDSEVSX1BJRGAuXG4gKiAgICBUaGUgd3JhcHBlciBzY3JpcHQgaW50ZXJwcmV0cyB0aGlzIGFzIFwiQ2xhdWRlIGlzIG5vdyBpZGxlL3dhaXRpbmcgZm9yIGlucHV0XCIsXG4gKiAgICB3aGljaCB1cGRhdGVzIHRoZSBWUyBDb2RlIFVJIHN0YXRlIHRvIFwiSWRsZVwiLlxuICpcbiAqIEBtb2R1bGUgaG9va3Mvc3RvcFxuICogQHNlZSBDbGF1ZGVXcmFwcGVyU2NyaXB0U2VydmljZVxuICovXG5cbmltcG9ydCB7IHN0b3BIb29rLCBzdG9wT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbmltcG9ydCB7IGRpc2NvdmVyQXBpVXJsLCBmZXRjaElzc3VlRGlmZiwgbm90aWZ5U2Vzc2lvblN0b3AsIHR5cGUgU2Vzc2lvbkRpZmZSZXNwb25zZSB9IGZyb20gJy4vbGliL2FwaS5qcyc7XG5pbXBvcnQgeyBnZXREaXNwYXRjaGVyUGlkLCBzaWduYWxJZGxlIH0gZnJvbSAnLi9saWIvaXBjLmpzJztcbmltcG9ydCB7IGJ1aWxkVXBkYXRlU3VtbWFyeSwgaGFzVXBkYXRlcyB9IGZyb20gJy4vbGliL291dHB1dC1oZWxwZXJzLmpzJztcbmltcG9ydCB7IGhhc0FwaUZhaWx1cmVCZWVuUmVwb3J0ZWQsIG1hcmtBcGlGYWlsdXJlUmVwb3J0ZWQgfSBmcm9tICcuL2xpYi9zdGF0ZS5qcyc7XG5cbi8qKlxuICogSGFuZGxlciBmb3IgdGhlIFN0b3AgaG9vay5cbiAqXG4gKiBNYW5hZ2VzIHRoZSBncmFjZWZ1bCBoYW5kLW9mZiBiZXR3ZWVuIHRoZSBhdXRvbm9tb3VzIGFnZW50IGFuZCB0aGUgdXNlciBieVxuICogY2hlY2tpbmcgZm9yIGlzc3VlIHVwZGF0ZXMgYW5kIHNpZ25hbGluZyB0aGUgZGlzcGF0Y2hlciBhcHByb3ByaWF0ZWx5LlxuICpcbiAqIEV4ZWN1dGlvbiBtb2RlbDpcbiAqIDEuICoqVXBkYXRlIERldGVjdGlvbioqOiBGZXRjaGVzIGEgSlNPTiBwYXRjaCByZXByZXNlbnRpbmcgY2hhbmdlcyB0byB0aGUgaXNzdWVcbiAqICAgIHNpbmNlIHRoZSBzZXNzaW9uIHN0YXJ0ZWQgKG5ldyBjb21tZW50cywgZmllbGQgdXBkYXRlcywgZXRjLikuXG4gKiAyLiAqKkJsb2NraW5nIERlY2lzaW9uKio6IElmIHVwZGF0ZXMgZXhpc3QsIGJsb2NrcyBDbGF1ZGUgZnJvbSBzdG9wcGluZyBhbmRcbiAqICAgIGluamVjdHMgdGhlIGRpZmYgYXMgYSBKU09OIHBhdGNoIGluIGJvdGggYHJlYXNvbmAgYW5kIGBzeXN0ZW1NZXNzYWdlYC5cbiAqICAgIFRoaXMgZm9yY2VzIENsYXVkZSB0byBhY2tub3dsZWRnZSBhbmQgaW5jb3Jwb3JhdGUgdGhlIG5ldyBjb250ZXh0LlxuICogMy4gKipJZGxlIFNpZ25hbGluZyoqOiBJZiBubyB1cGRhdGVzIGV4aXN0LCBhbGxvd3MgQ2xhdWRlIHRvIHN0b3AgYW5kIHNpZ25hbHNcbiAqICAgIHRoZSBkaXNwYXRjaGVyIHdpdGggYFNJR1dJTkNIYCB0byB0cmFuc2l0aW9uIHRoZSBWUyBDb2RlIFVJIHRvIFwiSWRsZVwiIHN0YXRlLlxuICpcbiAqIEFQSSBmYWlsdXJlIGhhbmRsaW5nIGVtcGxveXMgYSBzdGF0ZSBtYWNoaW5lIHRvIHByZXZlbnQgbG9vcCBjb25kaXRpb25zOlxuICogLSBGaXJzdCBmYWlsdXJlOiBCbG9ja3Mgc3RvcCwgbWFya3MgZmFpbHVyZSBpbiBzZXNzaW9uIHN0YXRlLCBzdWdnZXN0cyByZW1lZGlhdGlvbi5cbiAqIC0gU3Vic2VxdWVudCBmYWlsdXJlczogQXBwcm92ZXMgc3RvcCB0byBicmVhayB0aGUgbG9vcCAoYXNzdW1lcyBBUEkgaXMgcGVybWFuZW50bHkgdW5hdmFpbGFibGUpLlxuICpcbiAqIEJlaGF2aW9yYWwgY29udHJhY3Q6XG4gKiAtIElmIGBzZXNzaW9uX2lkYCBpcyBub3QgcHJvdmlkZWQsIHJldHVybnMgYXBwcm92ZSAobm8tb3ApLlxuICogLSBJZiBgSVNTVUVfSURgIGlzIG5vdCBzZXQsIGFwcHJvdmVzIHN0b3AgKGdyYWNlZnVsIGRlZ3JhZGF0aW9uIGZvciBub24taXNzdWUgd29ya2Zsb3dzKS5cbiAqIC0gSWYgQVBJIGlzIHVuYXZhaWxhYmxlIG9uIGZpcnN0IGNhbGwsIGJsb2NrcyBzdG9wIGFuZCByZXBvcnRzIHRoZSBmYWlsdXJlLlxuICogLSBJZiBBUEkgaXMgdW5hdmFpbGFibGUgb24gcmV0cnksIGFwcHJvdmVzIHN0b3AgdG8gcHJldmVudCBpbmZpbml0ZSBsb29wcy5cbiAqIC0gSWYgbm8gdXBkYXRlcyBkZXRlY3RlZCwgYXBwcm92ZXMgc3RvcCBhbmQgc2lnbmFscyBkaXNwYXRjaGVyIGlkbGUuXG4gKiAtIElmIHVwZGF0ZXMgZGV0ZWN0ZWQsIGJsb2NrcyBzdG9wIHdpdGggSlNPTiBwYXRjaCArIGh1bWFuLXJlYWRhYmxlIHN1bW1hcnkuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gSG9vayBpbnB1dCBjb250YWluaW5nIGBzZXNzaW9uX2lkYCAoQ2xhdWRlIHNlc3Npb24gaWRlbnRpZmllcikuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlIGZvciBkZWJ1ZyBhbmQgZXJyb3IgcmVwb3J0aW5nLlxuICogQHJldHVybnMgc3RvcE91dHB1dCB3aXRoIGRlY2lzaW9uICgnYXBwcm92ZScgb3IgJ2Jsb2NrJyksIG9wdGlvbmFsIHJlYXNvbiwgYW5kIHN5c3RlbU1lc3NhZ2UuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IHN0b3BIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAgLy8gU2tpcCBzZXNzaW9uIHRyYWNraW5nIGZvciBlcGhlbWVyYWwgc2Vzc2lvbnMgKGludGVydmlldywgcmV2aWV3LCByZXNlYXJjaCwgZXRjLilcbiAgaWYgKHByb2Nlc3MuZW52LkVQSEVNRVJBTF9TRVNTSU9OID09PSAndHJ1ZScpIHtcbiAgICByZXR1cm4gc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gIH1cblxuICBjb25zdCBzZXNzaW9uSWQgPSBpbnB1dC5zZXNzaW9uX2lkO1xuICBpZiAoIXNlc3Npb25JZCkge1xuICAgIHJldHVybiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAgfVxuXG4gIC8vIFJlcXVpcmUgSVNTVUVfSUQgZW52aXJvbm1lbnQgdmFyaWFibGUgKHNldCBieSB3cmFwcGVyKVxuICBjb25zdCBpc3N1ZUlkID0gcHJvY2Vzcy5lbnYuSVNTVUVfSUQ7XG4gIGlmICghaXNzdWVJZCkge1xuICAgIGxvZ2dlci53YXJuKCdJU1NVRV9JRCBub3Qgc2V0IC0gdGhpcyBob29rIHJlcXVpcmVzIHRoZSBpc3N1ZSBsYXVuY2hlcicpO1xuICAgIC8vIERvbid0IGJsb2NrIG9uIG1pc3NpbmcgY29uZmlnXG4gICAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICAgICAgZGVjaXNpb246ICdhcHByb3ZlJyxcbiAgICAgIHN5c3RlbU1lc3NhZ2U6ICdTdG9wIGFwcHJvdmVkIChubyBpc3N1ZSB0cmFja2luZyknXG4gICAgfSk7XG4gIH1cblxuICAvLyBEaXNjb3ZlciBBUEkgVVJMIGFuZCBmZXRjaCBpc3N1ZSBkaWZmXG4gIGxldCBiYXNlVXJsOiBzdHJpbmc7XG4gIGxldCBkaWZmUmVzcG9uc2U6IFNlc3Npb25EaWZmUmVzcG9uc2U7XG4gIHRyeSB7XG4gICAgYmFzZVVybCA9IGRpc2NvdmVyQXBpVXJsKGxvZ2dlcik7XG4gICAgZGlmZlJlc3BvbnNlID0gYXdhaXQgZmV0Y2hJc3N1ZURpZmYoc2Vzc2lvbklkLCBpc3N1ZUlkLCBiYXNlVXJsLCBsb2dnZXIpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlci5kZWJ1ZygnQVBJIGVycm9yJywgeyBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcblxuICAgIC8vIENoZWNrIGlmIHdlJ3ZlIGFscmVhZHkgcmVwb3J0ZWQgdGhpcyBmYWlsdXJlIHRvIHByZXZlbnQgbG9vcGluZ1xuICAgIGlmIChoYXNBcGlGYWlsdXJlQmVlblJlcG9ydGVkKHNlc3Npb25JZCwgbG9nZ2VyKSkge1xuICAgICAgbG9nZ2VyLmRlYnVnKCdBUEkgZmFpbHVyZSBhbHJlYWR5IHJlcG9ydGVkLCBhcHByb3Zpbmcgc3RvcCB0byBicmVhayBsb29wJyk7XG4gICAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZScsXG4gICAgICAgIHN5c3RlbU1lc3NhZ2U6ICdTdG9wIGFwcHJvdmVkIChBUEkgZmFpbHVyZSBhbHJlYWR5IHJlcG9ydGVkKSdcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEZpcnN0IGZhaWx1cmUgLSBtYXJrIGFzIHJlcG9ydGVkIGFuZCBibG9ja1xuICAgIG1hcmtBcGlGYWlsdXJlUmVwb3J0ZWQoc2Vzc2lvbklkLCBsb2dnZXIpO1xuICAgIHJldHVybiBzdG9wT3V0cHV0KHtcbiAgICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICAgICAgcmVhc29uOiBgQVBJIHVuYXZhaWxhYmxlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gLFxuICAgICAgc3lzdGVtTWVzc2FnZTpcbiAgICAgICAgJ1RoZSBJc3N1ZXMgQVBJIGlzIHVuYXZhaWxhYmxlLiBUaGlzIGlzIGEgY2F0YXN0cm9waGljIGZhaWx1cmUuICcgK1xuICAgICAgICAnQ2hlY2sgdGhhdCBWU0NvZGUgaXMgcnVubmluZyB3aXRoIHRoZSBDb21wYXJlIEJyYW5jaCBleHRlbnNpb24gYWN0aXZlLidcbiAgICB9KTtcbiAgfVxuXG4gIC8vIENoZWNrIGlmIGFueSBpc3N1ZSBoYXMgbmV3IGNvbW1lbnRzIG9yIGZpZWxkIGNoYW5nZXNcbiAgaWYgKCFoYXNVcGRhdGVzKGRpZmZSZXNwb25zZSkpIHtcbiAgICAvLyBObyB1cGRhdGVzIC0gQ2xhdWRlIHdpbGwgc3RvcC4gU2lnbmFsIGRpc3BhdGNoZXIgdGhhdCB3ZSdyZSBnb2luZyBpZGxlLlxuICAgIGNvbnN0IGRpc3BhdGNoZXJQaWQgPSBnZXREaXNwYXRjaGVyUGlkKCk7XG4gICAgaWYgKGRpc3BhdGNoZXJQaWQpIHtcbiAgICAgIC8vIE5vdGlmeSBleHRlbnNpb24gb2Ygc2Vzc2lvbiBzdG9wXG4gICAgICBhd2FpdCBub3RpZnlTZXNzaW9uU3RvcChzZXNzaW9uSWQsIGRpc3BhdGNoZXJQaWQsIGJhc2VVcmwsIGxvZ2dlcik7XG4gICAgICAvLyBTaWduYWwgZGlzcGF0Y2hlciBpZGxlXG4gICAgICBzaWduYWxJZGxlKGRpc3BhdGNoZXJQaWQsIGxvZ2dlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICAgICAgZGVjaXNpb246ICdhcHByb3ZlJyxcbiAgICAgIHN5c3RlbU1lc3NhZ2U6IGBJc3N1ZSBcXGAke2lzc3VlSWR9XFxgIGhhcyBubyB1cGRhdGVzLmBcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEJ1aWxkIGh1bWFuLXJlYWRhYmxlIHN5c3RlbU1lc3NhZ2UgZnJvbSBkaWZmIHJlc3BvbnNlXG4gIGNvbnN0IHN5c3RlbU1zZyA9IGJ1aWxkVXBkYXRlU3VtbWFyeShkaWZmUmVzcG9uc2UpO1xuXG4gIC8vIE91dHB1dCBvbmx5IHRoZSBqc29uUGF0Y2ggYXJyYXkgKG5vdCB0aGUgZnVsbCByZXNwb25zZSB3aGljaCBpbmNsdWRlcyBmdWxsSXNzdWUpXG4gIGNvbnN0IHBhdGNoSnNvbiA9IEpTT04uc3RyaW5naWZ5KGRpZmZSZXNwb25zZS5qc29uUGF0Y2gpO1xuXG4gIC8vIEJsb2NrIHN0b3BwaW5nIGFuZCBwcm92aWRlIGRpZmYgYXMgcmVhc29uIHdpdGggc3lzdGVtTWVzc2FnZVxuICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgZGVjaXNpb246ICdibG9jaycsXG4gICAgcmVhc29uOiBgKipJc3N1ZSBKU09OIHBhdGNoKipcXG5cXGBcXGBcXGBqc29uXFxuJHtwYXRjaEpzb259XFxuXFxgXFxgXFxgYCxcbiAgICBzeXN0ZW1NZXNzYWdlOiBzeXN0ZW1Nc2dcbiAgfSk7XG59KTtcbiIsICJwcm9jZXNzLmVudlsnQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFJ10gPSBcIi93b3Jrc3BhY2UvaG9va3MubG9nXCI7XG5cbmltcG9ydCBob29rIGZyb20gJy93b3Jrc3BhY2UvLndvcmt0cmVlcy9yZW1vdmUtY29tcGFyZS1icmFuY2gtdmlldy9wYWNrYWdlcy9jbGF1ZGUtY29kZS1jbGktaG9va3Mvc3JjL3N0b3AudHMnO1xuaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJy93b3Jrc3BhY2UvLndvcmt0cmVlcy9yZW1vdmUtY29tcGFyZS1icmFuY2gtdmlldy9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvcnVudGltZS5qcyc7XG5cbmV4ZWN1dGUoaG9vayk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBcUJPLElBQU0sYUFBYTtBQUFBO0FBQUEsRUFFeEIsU0FBUztBQUFBO0FBQUEsRUFFVCxPQUFPO0FBQUE7QUFBQSxFQUVQLE9BQU87QUFDVDtBQXNDQSxTQUFTLDRCQUE0QixVQUFVO0FBQzdDLFNBQU8sQ0FBQyxVQUFVLENBQUMsT0FBTztBQUFBLElBQ3hCLE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxFQUNWO0FBQ0Y7QUFpSE8sSUFBTSxhQUE2Qiw0Q0FBNEIsTUFBTTs7O0FDbks1RSxTQUFTLFdBQVcsWUFBWSxXQUFXLFVBQVUsaUJB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QUksMEJBQTBCLFdBQVdBLE9BQU0sR0FBRztBQUNoRCxNQUFBQSxRQUFPLE1BQU0sNERBQTREO0FBQ3pFLGFBQU8sV0FBVztBQUFBLFFBQ2hCLFVBQVU7QUFBQSxRQUNWLGVBQWU7QUFBQSxNQUNqQixDQUFDO0FBQUEsSUFDSDtBQUdBLDJCQUF1QixXQUFXQSxPQUFNO0FBQ3hDLFdBQU8sV0FBVztBQUFBLE1BQ2hCLFVBQVU7QUFBQSxNQUNWLFFBQVEsb0JBQW9CLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUssQ0FBQztBQUFBLE1BQ2xGLGVBQ0U7QUFBQSxJQUVKLENBQUM7QUFBQSxFQUNIO0FBR0EsTUFBSSxDQUFDLFdBQVcsWUFBWSxHQUFHO0FBRTdCLFVBQU0sZ0JBQWdCLGlCQUFpQjtBQUN2QyxRQUFJLGVBQWU7QUFFakIsWUFBTSxrQkFBa0IsV0FBVyxlQUFlLFNBQVNBLE9BQU07QUFFakUsaUJBQVcsZUFBZUEsT0FBTTtBQUFBLElBQ2xDO0FBRUEsV0FBTyxXQUFXO0FBQUEsTUFDaEIsVUFBVTtBQUFBLE1BQ1YsZUFBZSxXQUFXLE9BQU87QUFBQSxJQUNuQyxDQUFDO0FBQUEsRUFDSDtBQUdBLFFBQU0sWUFBWSxtQkFBbUIsWUFBWTtBQUdqRCxRQUFNLFlBQVksS0FBSyxVQUFVLGFBQWEsU0FBUztBQUd2RCxTQUFPLFdBQVc7QUFBQSxJQUNoQixVQUFVO0FBQUEsSUFDVixRQUFRO0FBQUE7QUFBQSxFQUFxQyxTQUFTO0FBQUE7QUFBQSxJQUN0RCxlQUFlO0FBQUEsRUFDakIsQ0FBQztBQUNILENBQUM7OztBQ3hJRCxRQUFRLElBQUksZ0NBQWdDLElBQUk7QUFLaEQsUUFBUSxZQUFJOyIsCiAgIm5hbWVzIjogWyJsb2dnZXIiLCAibG9nZ2VyIiwgImxvZ2dlciIsICJleGlzdHNTeW5jIiwgIm1rZGlyU3luYyIsICJleGlzdHNTeW5jIiwgIm1rZGlyU3luYyIsICJsb2dnZXIiLCAibG9nZ2VyIiwgImxvZ2dlciJdCn0K
