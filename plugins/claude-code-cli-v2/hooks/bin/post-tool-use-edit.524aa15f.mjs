#!/usr/bin/env -S node --enable-source-maps
// src/post-tool-use-edit.ts
import { readFile as readFile2 } from "node:fs/promises";

// node_modules/@goodfoot/claude-code-hooks/dist/env.js
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

// node_modules/@goodfoot/claude-code-hooks/dist/hooks.js
function createHookFunction(hookEventName, config, handler) {
  const hookFn = async (input, context) => {
    return await handler(input, context);
  };
  hookFn.hookEventName = hookEventName;
  hookFn.matcher = config.matcher;
  hookFn.timeout = config.timeout;
  return hookFn;
}
function postToolUseHook(config, handler) {
  return createHookFunction("PostToolUse", config, handler);
}

// node_modules/@goodfoot/claude-code-hooks/dist/logger.js
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

// node_modules/@goodfoot/claude-code-hooks/dist/outputs.js
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
var postToolUseOutput = /* @__PURE__ */ createHookSpecificOutputBuilder("PostToolUse");

// node_modules/@goodfoot/claude-code-hooks/dist/runtime.js
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

// node_modules/@goodfoot/claude-code-hooks/dist/tool-helpers.js
function getFilePath(input) {
  const toolInput = input.tool_input;
  if (toolInput && typeof toolInput === "object" && "file_path" in toolInput) {
    const filePath = toolInput.file_path;
    return typeof filePath === "string" ? filePath : null;
  }
  return null;
}

// ../validator/src/card.ts
var CARD_STATUSES = ["active", "completed"];
var MAX_SUMMARY_LENGTH = 200;
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateRequiredString(obj, field, path, context, errors) {
  const value = obj[field];
  if (value === void 0 || value === null) {
    errors.push({ field: `${path}.${field}`, message: `${field} is required for ${context}`, code: "missing_field" });
  } else if (typeof value !== "string") {
    errors.push({ field: `${path}.${field}`, message: `${field} must be a string`, code: "invalid_type" });
  }
}
function validateRequiredArray(obj, field, path, context, errors) {
  const value = obj[field];
  if (value === void 0 || value === null) {
    errors.push({ field: `${path}.${field}`, message: `${field} is required for ${context}`, code: "missing_field" });
    return void 0;
  }
  if (!Array.isArray(value)) {
    errors.push({ field: `${path}.${field}`, message: `${field} must be an array`, code: "invalid_type" });
    return void 0;
  }
  return value;
}
function validateBodyElement(element, path, errors) {
  if (!isObject(element)) {
    errors.push({ field: path, message: "body element must be an object", code: "invalid_type" });
    return;
  }
  const el = element;
  const elType = el["type"];
  if (elType === void 0 || elType === null) {
    errors.push({ field: `${path}.type`, message: "type is required for body element", code: "missing_field" });
    return;
  }
  if (typeof elType !== "string") {
    errors.push({ field: `${path}.type`, message: "type must be a string", code: "invalid_type" });
    return;
  }
  switch (elType) {
    case "TextBlock":
      validateRequiredString(el, "text", path, "TextBlock", errors);
      break;
    case "Image":
      validateRequiredString(el, "url", path, "Image", errors);
      break;
    case "Container": {
      const items = validateRequiredArray(el, "items", path, "Container", errors);
      items?.forEach((item, i) => {
        validateBodyElement(item, `${path}.items[${i}]`, errors);
      });
      break;
    }
    case "ColumnSet": {
      const columns = validateRequiredArray(el, "columns", path, "ColumnSet", errors);
      columns?.forEach((column, i) => {
        const colPath = `${path}.columns[${i}]`;
        if (!isObject(column)) {
          errors.push({ field: colPath, message: "column must be an object", code: "invalid_type" });
          return;
        }
        if (column["type"] !== "Column") {
          errors.push({ field: `${colPath}.type`, message: "column type must be 'Column'", code: "invalid_type" });
        }
        if (column["items"] !== void 0 && column["items"] !== null) {
          if (!Array.isArray(column["items"])) {
            errors.push({ field: `${colPath}.items`, message: "items must be an array", code: "invalid_type" });
          } else {
            column["items"].forEach((item, j) => {
              validateBodyElement(item, `${colPath}.items[${j}]`, errors);
            });
          }
        }
      });
      break;
    }
    case "ActionSet": {
      const actions = validateRequiredArray(el, "actions", path, "ActionSet", errors);
      actions?.forEach((action, i) => {
        validateAction(action, `${path}.actions[${i}]`, errors);
      });
      break;
    }
    case "FactSet": {
      const facts = validateRequiredArray(el, "facts", path, "FactSet", errors);
      facts?.forEach((fact, i) => {
        const factPath = `${path}.facts[${i}]`;
        if (!isObject(fact)) {
          errors.push({ field: factPath, message: "fact must be an object", code: "invalid_type" });
          return;
        }
        if (fact["title"] === void 0 || fact["title"] === null) {
          errors.push({ field: `${factPath}.title`, message: "title is required for fact", code: "missing_field" });
        }
        if (fact["value"] === void 0 || fact["value"] === null) {
          errors.push({ field: `${factPath}.value`, message: "value is required for fact", code: "missing_field" });
        }
      });
      break;
    }
    case "Input.Text":
    case "Input.Number":
    case "Input.Date":
    case "Input.Time":
    case "Input.Toggle":
    case "Input.ChoiceSet":
      validateRequiredString(el, "id", path, elType, errors);
      break;
    default:
      break;
  }
}
function validateAction(action, path, errors) {
  if (!isObject(action)) {
    errors.push({ field: path, message: "action must be an object", code: "invalid_type" });
    return;
  }
  const act = action;
  const actType = act["type"];
  if (actType === void 0 || actType === null) {
    errors.push({ field: `${path}.type`, message: "type is required for action", code: "missing_field" });
    return;
  }
  if (typeof actType !== "string") {
    errors.push({ field: `${path}.type`, message: "type must be a string", code: "invalid_type" });
    return;
  }
  switch (actType) {
    case "Action.Submit":
      break;
    case "Action.OpenUrl":
      validateRequiredString(act, "url", path, "Action.OpenUrl", errors);
      break;
    case "Action.ShowCard": {
      const nestedCard = act["card"];
      if (nestedCard === void 0 || nestedCard === null) {
        errors.push({ field: `${path}.card`, message: "card is required for Action.ShowCard", code: "missing_field" });
      } else if (!isObject(nestedCard)) {
        errors.push({ field: `${path}.card`, message: "card must be an object", code: "invalid_type" });
      } else {
        if (nestedCard["type"] === void 0 || nestedCard["type"] === null) {
          errors.push({ field: `${path}.card.type`, message: "card.type is required", code: "missing_field" });
        } else if (nestedCard["type"] !== "AdaptiveCard") {
          errors.push({
            field: `${path}.card.type`,
            message: "card.type must be 'AdaptiveCard'",
            code: "invalid_type"
          });
        }
        if (nestedCard["body"] !== void 0 && nestedCard["body"] !== null) {
          if (!Array.isArray(nestedCard["body"])) {
            errors.push({ field: `${path}.card.body`, message: "card.body must be an array", code: "invalid_type" });
          } else {
            nestedCard["body"].forEach((element, i) => {
              validateBodyElement(element, `${path}.card.body[${i}]`, errors);
            });
          }
        }
        if (nestedCard["actions"] !== void 0 && nestedCard["actions"] !== null) {
          if (!Array.isArray(nestedCard["actions"])) {
            errors.push({
              field: `${path}.card.actions`,
              message: "card.actions must be an array",
              code: "invalid_type"
            });
          } else {
            nestedCard["actions"].forEach((nestedAction, i) => {
              validateAction(nestedAction, `${path}.card.actions[${i}]`, errors);
            });
          }
        }
      }
      break;
    }
    case "Action.ToggleVisibility": {
      const targets = validateRequiredArray(act, "targetElements", path, "Action.ToggleVisibility", errors);
      targets?.forEach((target, i) => {
        if (typeof target !== "string") {
          errors.push({
            field: `${path}.targetElements[${i}]`,
            message: "targetElement must be a string",
            code: "invalid_type"
          });
        }
      });
      break;
    }
    default:
      break;
  }
}
function validateOptionalString(obj, field, path, errors) {
  const value = obj[field];
  if (value !== void 0 && value !== null && typeof value !== "string") {
    errors.push({ field: `${path}.${field}`, message: `${path}.${field} must be a string`, code: "invalid_type" });
  }
}
function validateOptionalArray(obj, field, path, errors) {
  const value = obj[field];
  if (value === void 0 || value === null) {
    return void 0;
  }
  if (!Array.isArray(value)) {
    errors.push({ field: `${path}.${field}`, message: `${path}.${field} must be an array`, code: "invalid_type" });
    return void 0;
  }
  return value;
}
var SEMVER_PATTERN = /^\d+\.\d+(\.\d+)?$/;
function validateAdaptiveCardSchema(adaptiveCard, cardStatus, errors) {
  if (adaptiveCard["type"] === void 0 || adaptiveCard["type"] === null) {
    errors.push({ field: "card.type", message: "card.type is required", code: "missing_field" });
  } else if (adaptiveCard["type"] !== "AdaptiveCard") {
    errors.push({ field: "card.type", message: "card.type must be 'AdaptiveCard'", code: "invalid_type" });
  }
  validateOptionalString(adaptiveCard, "version", "card", errors);
  const body = validateOptionalArray(adaptiveCard, "body", "card", errors);
  body?.forEach((element, i) => {
    validateBodyElement(element, `card.body[${i}]`, errors);
  });
  const actions = validateOptionalArray(adaptiveCard, "actions", "card", errors);
  actions?.forEach((action, i) => {
    validateAction(action, `card.actions[${i}]`, errors);
  });
  const schema2 = adaptiveCard["$schema"];
  if (schema2 !== void 0 && schema2 !== null) {
    if (typeof schema2 !== "string") {
      errors.push({ field: "card.$schema", message: "card.$schema must be a string", code: "invalid_type" });
    } else {
      try {
        new URL(schema2);
      } catch (error) {
        if (error instanceof TypeError) {
          errors.push({ field: "card.$schema", message: "card.$schema must be a valid URL", code: "invalid_format" });
        } else {
          throw error;
        }
      }
    }
  }
  const minVersion = adaptiveCard["minVersion"];
  if (minVersion !== void 0 && minVersion !== null) {
    if (typeof minVersion !== "string") {
      errors.push({ field: "card.minVersion", message: "card.minVersion must be a string", code: "invalid_type" });
    } else if (!SEMVER_PATTERN.test(minVersion)) {
      errors.push({
        field: "card.minVersion",
        message: "card.minVersion must be in semver format (e.g., 1.5 or 1.5.0)",
        code: "invalid_format"
      });
    }
  }
  if (cardStatus === "active" && Array.isArray(actions) && actions.length === 0) {
    errors.push({
      field: "card.actions",
      message: 'Card with "active" status should have at least one action',
      code: "warning_active_without_actions"
    });
  }
}
function validateCard(card) {
  const errors = [];
  if (card.id === void 0 || card.id === null) {
    errors.push({
      field: "id",
      message: "id is required",
      code: "missing_field"
    });
  } else if (typeof card.id !== "string") {
    errors.push({
      field: "id",
      message: "id must be a string",
      code: "invalid_type",
      expectedType: "string"
    });
  } else if (card.id.trim().length === 0) {
    errors.push({
      field: "id",
      message: "id must not be empty",
      code: "invalid_format",
      suggestion: "Provide a non-empty value"
    });
  }
  if (card.summary === void 0 || card.summary === null) {
    errors.push({ field: "summary", message: "summary is required", code: "missing_field" });
  } else if (typeof card.summary !== "string") {
    errors.push({
      field: "summary",
      message: "summary must be a string",
      code: "invalid_type",
      expectedType: "string"
    });
  } else if (card.summary.trim().length === 0) {
    errors.push({
      field: "summary",
      message: "summary must not be empty",
      code: "invalid_format",
      suggestion: "Provide a non-empty value"
    });
  } else if (card.summary.length > MAX_SUMMARY_LENGTH) {
    errors.push({
      field: "summary",
      message: `summary must not exceed ${MAX_SUMMARY_LENGTH} characters`,
      code: "length_exceeded",
      suggestion: `Shorten to ${MAX_SUMMARY_LENGTH} characters or less`
    });
  }
  if (card.author === void 0 || card.author === null) {
    errors.push({
      field: "author",
      message: "author is required",
      code: "missing_field"
    });
  } else if (typeof card.author !== "string") {
    errors.push({
      field: "author",
      message: "author must be a string",
      code: "invalid_type",
      expectedType: "string"
    });
  } else if (card.author.trim().length === 0) {
    errors.push({
      field: "author",
      message: "author must not be empty",
      code: "invalid_format",
      suggestion: "Provide a non-empty value"
    });
  }
  if (card.status === void 0 || card.status === null) {
    errors.push({ field: "status", message: "status is required", code: "missing_field" });
  } else if (typeof card.status !== "string") {
    errors.push({
      field: "status",
      message: "status must be a string",
      code: "invalid_type"
    });
  } else if (!CARD_STATUSES.includes(card.status)) {
    errors.push({
      field: "status",
      message: `status must be one of: ${CARD_STATUSES.join(", ")}`,
      code: "invalid_status",
      availableValues: CARD_STATUSES
    });
  }
  if (card.card === void 0 || card.card === null) {
    errors.push({ field: "card", message: "card is required", code: "missing_field" });
  } else if (!isObject(card.card)) {
    errors.push({ field: "card", message: "card must be an object", code: "invalid_type" });
  } else {
    validateAdaptiveCardSchema(card.card, card.status, errors);
  }
  if (card.status === "completed" && (card.output === void 0 || card.output === null)) {
    errors.push({
      field: "output",
      message: 'Card with "completed" status should have output defined',
      code: "warning_completed_without_output"
    });
  }
  return { valid: errors.length === 0, errors };
}

// ../../../node_modules/js-yaml/dist/js-yaml.mjs
function isNothing(subject) {
  return typeof subject === "undefined" || subject === null;
}
function isObject2(subject) {
  return typeof subject === "object" && subject !== null;
}
function toArray(sequence) {
  if (Array.isArray(sequence)) return sequence;
  else if (isNothing(sequence)) return [];
  return [sequence];
}
function extend(target, source) {
  var index, length, key, sourceKeys;
  if (source) {
    sourceKeys = Object.keys(source);
    for (index = 0, length = sourceKeys.length; index < length; index += 1) {
      key = sourceKeys[index];
      target[key] = source[key];
    }
  }
  return target;
}
function repeat(string, count) {
  var result = "", cycle;
  for (cycle = 0; cycle < count; cycle += 1) {
    result += string;
  }
  return result;
}
function isNegativeZero(number) {
  return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
}
var isNothing_1 = isNothing;
var isObject_1 = isObject2;
var toArray_1 = toArray;
var repeat_1 = repeat;
var isNegativeZero_1 = isNegativeZero;
var extend_1 = extend;
var common = {
  isNothing: isNothing_1,
  isObject: isObject_1,
  toArray: toArray_1,
  repeat: repeat_1,
  isNegativeZero: isNegativeZero_1,
  extend: extend_1
};
function formatError(exception2, compact) {
  var where = "", message = exception2.reason || "(unknown reason)";
  if (!exception2.mark) return message;
  if (exception2.mark.name) {
    where += 'in "' + exception2.mark.name + '" ';
  }
  where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
  if (!compact && exception2.mark.snippet) {
    where += "\n\n" + exception2.mark.snippet;
  }
  return message + " " + where;
}
function YAMLException$1(reason, mark) {
  Error.call(this);
  this.name = "YAMLException";
  this.reason = reason;
  this.mark = mark;
  this.message = formatError(this, false);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack || "";
  }
}
YAMLException$1.prototype = Object.create(Error.prototype);
YAMLException$1.prototype.constructor = YAMLException$1;
YAMLException$1.prototype.toString = function toString(compact) {
  return this.name + ": " + formatError(this, compact);
};
var exception = YAMLException$1;
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
  var head = "";
  var tail = "";
  var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
  if (position - lineStart > maxHalfLength) {
    head = " ... ";
    lineStart = position - maxHalfLength + head.length;
  }
  if (lineEnd - position > maxHalfLength) {
    tail = " ...";
    lineEnd = position + maxHalfLength - tail.length;
  }
  return {
    str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
    pos: position - lineStart + head.length
    // relative position
  };
}
function padStart(string, max) {
  return common.repeat(" ", max - string.length) + string;
}
function makeSnippet(mark, options) {
  options = Object.create(options || null);
  if (!mark.buffer) return null;
  if (!options.maxLength) options.maxLength = 79;
  if (typeof options.indent !== "number") options.indent = 1;
  if (typeof options.linesBefore !== "number") options.linesBefore = 3;
  if (typeof options.linesAfter !== "number") options.linesAfter = 2;
  var re = /\r?\n|\r|\0/g;
  var lineStarts = [0];
  var lineEnds = [];
  var match;
  var foundLineNo = -1;
  while (match = re.exec(mark.buffer)) {
    lineEnds.push(match.index);
    lineStarts.push(match.index + match[0].length);
    if (mark.position <= match.index && foundLineNo < 0) {
      foundLineNo = lineStarts.length - 2;
    }
  }
  if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
  var result = "", i, line;
  var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
  var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
  for (i = 1; i <= options.linesBefore; i++) {
    if (foundLineNo - i < 0) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo - i],
      lineEnds[foundLineNo - i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
      maxLineLength
    );
    result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
  }
  line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
  result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
  for (i = 1; i <= options.linesAfter; i++) {
    if (foundLineNo + i >= lineEnds.length) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo + i],
      lineEnds[foundLineNo + i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
      maxLineLength
    );
    result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  }
  return result.replace(/\n$/, "");
}
var snippet = makeSnippet;
var TYPE_CONSTRUCTOR_OPTIONS = [
  "kind",
  "multi",
  "resolve",
  "construct",
  "instanceOf",
  "predicate",
  "represent",
  "representName",
  "defaultStyle",
  "styleAliases"
];
var YAML_NODE_KINDS = [
  "scalar",
  "sequence",
  "mapping"
];
function compileStyleAliases(map2) {
  var result = {};
  if (map2 !== null) {
    Object.keys(map2).forEach(function(style) {
      map2[style].forEach(function(alias) {
        result[String(alias)] = style;
      });
    });
  }
  return result;
}
function Type$1(tag, options) {
  options = options || {};
  Object.keys(options).forEach(function(name) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
      throw new exception('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    }
  });
  this.options = options;
  this.tag = tag;
  this.kind = options["kind"] || null;
  this.resolve = options["resolve"] || function() {
    return true;
  };
  this.construct = options["construct"] || function(data) {
    return data;
  };
  this.instanceOf = options["instanceOf"] || null;
  this.predicate = options["predicate"] || null;
  this.represent = options["represent"] || null;
  this.representName = options["representName"] || null;
  this.defaultStyle = options["defaultStyle"] || null;
  this.multi = options["multi"] || false;
  this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}
var type = Type$1;
function compileList(schema2, name) {
  var result = [];
  schema2[name].forEach(function(currentType) {
    var newIndex = result.length;
    result.forEach(function(previousType, previousIndex) {
      if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
        newIndex = previousIndex;
      }
    });
    result[newIndex] = currentType;
  });
  return result;
}
function compileMap() {
  var result = {
    scalar: {},
    sequence: {},
    mapping: {},
    fallback: {},
    multi: {
      scalar: [],
      sequence: [],
      mapping: [],
      fallback: []
    }
  }, index, length;
  function collectType(type2) {
    if (type2.multi) {
      result.multi[type2.kind].push(type2);
      result.multi["fallback"].push(type2);
    } else {
      result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
    }
  }
  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }
  return result;
}
function Schema$1(definition) {
  return this.extend(definition);
}
Schema$1.prototype.extend = function extend2(definition) {
  var implicit = [];
  var explicit = [];
  if (definition instanceof type) {
    explicit.push(definition);
  } else if (Array.isArray(definition)) {
    explicit = explicit.concat(definition);
  } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
    if (definition.implicit) implicit = implicit.concat(definition.implicit);
    if (definition.explicit) explicit = explicit.concat(definition.explicit);
  } else {
    throw new exception("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
  }
  implicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
    if (type$1.loadKind && type$1.loadKind !== "scalar") {
      throw new exception("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
    }
    if (type$1.multi) {
      throw new exception("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
    }
  });
  explicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
  });
  var result = Object.create(Schema$1.prototype);
  result.implicit = (this.implicit || []).concat(implicit);
  result.explicit = (this.explicit || []).concat(explicit);
  result.compiledImplicit = compileList(result, "implicit");
  result.compiledExplicit = compileList(result, "explicit");
  result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
  return result;
};
var schema = Schema$1;
var str = new type("tag:yaml.org,2002:str", {
  kind: "scalar",
  construct: function(data) {
    return data !== null ? data : "";
  }
});
var seq = new type("tag:yaml.org,2002:seq", {
  kind: "sequence",
  construct: function(data) {
    return data !== null ? data : [];
  }
});
var map = new type("tag:yaml.org,2002:map", {
  kind: "mapping",
  construct: function(data) {
    return data !== null ? data : {};
  }
});
var failsafe = new schema({
  explicit: [
    str,
    seq,
    map
  ]
});
function resolveYamlNull(data) {
  if (data === null) return true;
  var max = data.length;
  return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
}
function constructYamlNull() {
  return null;
}
function isNull(object) {
  return object === null;
}
var _null = new type("tag:yaml.org,2002:null", {
  kind: "scalar",
  resolve: resolveYamlNull,
  construct: constructYamlNull,
  predicate: isNull,
  represent: {
    canonical: function() {
      return "~";
    },
    lowercase: function() {
      return "null";
    },
    uppercase: function() {
      return "NULL";
    },
    camelcase: function() {
      return "Null";
    },
    empty: function() {
      return "";
    }
  },
  defaultStyle: "lowercase"
});
function resolveYamlBoolean(data) {
  if (data === null) return false;
  var max = data.length;
  return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
}
function constructYamlBoolean(data) {
  return data === "true" || data === "True" || data === "TRUE";
}
function isBoolean(object) {
  return Object.prototype.toString.call(object) === "[object Boolean]";
}
var bool = new type("tag:yaml.org,2002:bool", {
  kind: "scalar",
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function(object) {
      return object ? "true" : "false";
    },
    uppercase: function(object) {
      return object ? "TRUE" : "FALSE";
    },
    camelcase: function(object) {
      return object ? "True" : "False";
    }
  },
  defaultStyle: "lowercase"
});
function isHexCode(c) {
  return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
}
function isOctCode(c) {
  return 48 <= c && c <= 55;
}
function isDecCode(c) {
  return 48 <= c && c <= 57;
}
function resolveYamlInteger(data) {
  if (data === null) return false;
  var max = data.length, index = 0, hasDigits = false, ch;
  if (!max) return false;
  ch = data[index];
  if (ch === "-" || ch === "+") {
    ch = data[++index];
  }
  if (ch === "0") {
    if (index + 1 === max) return true;
    ch = data[++index];
    if (ch === "b") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (ch !== "0" && ch !== "1") return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "x") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isHexCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "o") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isOctCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
  }
  if (ch === "_") return false;
  for (; index < max; index++) {
    ch = data[index];
    if (ch === "_") continue;
    if (!isDecCode(data.charCodeAt(index))) {
      return false;
    }
    hasDigits = true;
  }
  if (!hasDigits || ch === "_") return false;
  return true;
}
function constructYamlInteger(data) {
  var value = data, sign = 1, ch;
  if (value.indexOf("_") !== -1) {
    value = value.replace(/_/g, "");
  }
  ch = value[0];
  if (ch === "-" || ch === "+") {
    if (ch === "-") sign = -1;
    value = value.slice(1);
    ch = value[0];
  }
  if (value === "0") return 0;
  if (ch === "0") {
    if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
    if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
    if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
  }
  return sign * parseInt(value, 10);
}
function isInteger(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
}
var int = new type("tag:yaml.org,2002:int", {
  kind: "scalar",
  resolve: resolveYamlInteger,
  construct: constructYamlInteger,
  predicate: isInteger,
  represent: {
    binary: function(obj) {
      return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
    },
    octal: function(obj) {
      return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
    },
    decimal: function(obj) {
      return obj.toString(10);
    },
    /* eslint-disable max-len */
    hexadecimal: function(obj) {
      return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
    }
  },
  defaultStyle: "decimal",
  styleAliases: {
    binary: [2, "bin"],
    octal: [8, "oct"],
    decimal: [10, "dec"],
    hexadecimal: [16, "hex"]
  }
});
var YAML_FLOAT_PATTERN = new RegExp(
  // 2.5e4, 2.5 and integers
  "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
);
function resolveYamlFloat(data) {
  if (data === null) return false;
  if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
  // Probably should update regexp & check speed
  data[data.length - 1] === "_") {
    return false;
  }
  return true;
}
function constructYamlFloat(data) {
  var value, sign;
  value = data.replace(/_/g, "").toLowerCase();
  sign = value[0] === "-" ? -1 : 1;
  if ("+-".indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }
  if (value === ".inf") {
    return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  } else if (value === ".nan") {
    return NaN;
  }
  return sign * parseFloat(value, 10);
}
var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
function representYamlFloat(object, style) {
  var res;
  if (isNaN(object)) {
    switch (style) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  } else if (Number.POSITIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  } else if (Number.NEGATIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  } else if (common.isNegativeZero(object)) {
    return "-0.0";
  }
  res = object.toString(10);
  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
}
var float = new type("tag:yaml.org,2002:float", {
  kind: "scalar",
  resolve: resolveYamlFloat,
  construct: constructYamlFloat,
  predicate: isFloat,
  represent: representYamlFloat,
  defaultStyle: "lowercase"
});
var json = failsafe.extend({
  implicit: [
    _null,
    bool,
    int,
    float
  ]
});
var core = json;
var YAML_DATE_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
);
var YAML_TIMESTAMP_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
);
function resolveYamlTimestamp(data) {
  if (data === null) return false;
  if (YAML_DATE_REGEXP.exec(data) !== null) return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
  return false;
}
function constructYamlTimestamp(data) {
  var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
  match = YAML_DATE_REGEXP.exec(data);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
  if (match === null) throw new Error("Date resolve error");
  year = +match[1];
  month = +match[2] - 1;
  day = +match[3];
  if (!match[4]) {
    return new Date(Date.UTC(year, month, day));
  }
  hour = +match[4];
  minute = +match[5];
  second = +match[6];
  if (match[7]) {
    fraction = match[7].slice(0, 3);
    while (fraction.length < 3) {
      fraction += "0";
    }
    fraction = +fraction;
  }
  if (match[9]) {
    tz_hour = +match[10];
    tz_minute = +(match[11] || 0);
    delta = (tz_hour * 60 + tz_minute) * 6e4;
    if (match[9] === "-") delta = -delta;
  }
  date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (delta) date.setTime(date.getTime() - delta);
  return date;
}
function representYamlTimestamp(object) {
  return object.toISOString();
}
var timestamp = new type("tag:yaml.org,2002:timestamp", {
  kind: "scalar",
  resolve: resolveYamlTimestamp,
  construct: constructYamlTimestamp,
  instanceOf: Date,
  represent: representYamlTimestamp
});
function resolveYamlMerge(data) {
  return data === "<<" || data === null;
}
var merge = new type("tag:yaml.org,2002:merge", {
  kind: "scalar",
  resolve: resolveYamlMerge
});
var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function resolveYamlBinary(data) {
  if (data === null) return false;
  var code, idx, bitlen = 0, max = data.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    code = map2.indexOf(data.charAt(idx));
    if (code > 64) continue;
    if (code < 0) return false;
    bitlen += 6;
  }
  return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
  var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map2 = BASE64_MAP, bits = 0, result = [];
  for (idx = 0; idx < max; idx++) {
    if (idx % 4 === 0 && idx) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    }
    bits = bits << 6 | map2.indexOf(input.charAt(idx));
  }
  tailbits = max % 4 * 6;
  if (tailbits === 0) {
    result.push(bits >> 16 & 255);
    result.push(bits >> 8 & 255);
    result.push(bits & 255);
  } else if (tailbits === 18) {
    result.push(bits >> 10 & 255);
    result.push(bits >> 2 & 255);
  } else if (tailbits === 12) {
    result.push(bits >> 4 & 255);
  }
  return new Uint8Array(result);
}
function representYamlBinary(object) {
  var result = "", bits = 0, idx, tail, max = object.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    if (idx % 3 === 0 && idx) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    }
    bits = (bits << 8) + object[idx];
  }
  tail = max % 3;
  if (tail === 0) {
    result += map2[bits >> 18 & 63];
    result += map2[bits >> 12 & 63];
    result += map2[bits >> 6 & 63];
    result += map2[bits & 63];
  } else if (tail === 2) {
    result += map2[bits >> 10 & 63];
    result += map2[bits >> 4 & 63];
    result += map2[bits << 2 & 63];
    result += map2[64];
  } else if (tail === 1) {
    result += map2[bits >> 2 & 63];
    result += map2[bits << 4 & 63];
    result += map2[64];
    result += map2[64];
  }
  return result;
}
function isBinary(obj) {
  return Object.prototype.toString.call(obj) === "[object Uint8Array]";
}
var binary = new type("tag:yaml.org,2002:binary", {
  kind: "scalar",
  resolve: resolveYamlBinary,
  construct: constructYamlBinary,
  predicate: isBinary,
  represent: representYamlBinary
});
var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
var _toString$2 = Object.prototype.toString;
function resolveYamlOmap(data) {
  if (data === null) return true;
  var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    pairHasKey = false;
    if (_toString$2.call(pair) !== "[object Object]") return false;
    for (pairKey in pair) {
      if (_hasOwnProperty$3.call(pair, pairKey)) {
        if (!pairHasKey) pairHasKey = true;
        else return false;
      }
    }
    if (!pairHasKey) return false;
    if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
    else return false;
  }
  return true;
}
function constructYamlOmap(data) {
  return data !== null ? data : [];
}
var omap = new type("tag:yaml.org,2002:omap", {
  kind: "sequence",
  resolve: resolveYamlOmap,
  construct: constructYamlOmap
});
var _toString$1 = Object.prototype.toString;
function resolveYamlPairs(data) {
  if (data === null) return true;
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    if (_toString$1.call(pair) !== "[object Object]") return false;
    keys = Object.keys(pair);
    if (keys.length !== 1) return false;
    result[index] = [keys[0], pair[keys[0]]];
  }
  return true;
}
function constructYamlPairs(data) {
  if (data === null) return [];
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    keys = Object.keys(pair);
    result[index] = [keys[0], pair[keys[0]]];
  }
  return result;
}
var pairs = new type("tag:yaml.org,2002:pairs", {
  kind: "sequence",
  resolve: resolveYamlPairs,
  construct: constructYamlPairs
});
var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
function resolveYamlSet(data) {
  if (data === null) return true;
  var key, object = data;
  for (key in object) {
    if (_hasOwnProperty$2.call(object, key)) {
      if (object[key] !== null) return false;
    }
  }
  return true;
}
function constructYamlSet(data) {
  return data !== null ? data : {};
}
var set = new type("tag:yaml.org,2002:set", {
  kind: "mapping",
  resolve: resolveYamlSet,
  construct: constructYamlSet
});
var _default = core.extend({
  implicit: [
    timestamp,
    merge
  ],
  explicit: [
    binary,
    omap,
    pairs,
    set
  ]
});
var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var CHOMPING_CLIP = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP = 3;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function _class(obj) {
  return Object.prototype.toString.call(obj);
}
function is_EOL(c) {
  return c === 10 || c === 13;
}
function is_WHITE_SPACE(c) {
  return c === 9 || c === 32;
}
function is_WS_OR_EOL(c) {
  return c === 9 || c === 32 || c === 10 || c === 13;
}
function is_FLOW_INDICATOR(c) {
  return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromHexCode(c) {
  var lc;
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  lc = c | 32;
  if (97 <= lc && lc <= 102) {
    return lc - 97 + 10;
  }
  return -1;
}
function escapedHexLen(c) {
  if (c === 120) {
    return 2;
  }
  if (c === 117) {
    return 4;
  }
  if (c === 85) {
    return 8;
  }
  return 0;
}
function fromDecimalCode(c) {
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  return -1;
}
function simpleEscapeSequence(c) {
  return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
}
function charFromCodepoint(c) {
  if (c <= 65535) {
    return String.fromCharCode(c);
  }
  return String.fromCharCode(
    (c - 65536 >> 10) + 55296,
    (c - 65536 & 1023) + 56320
  );
}
function setProperty(object, key, value) {
  if (key === "__proto__") {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value
    });
  } else {
    object[key] = value;
  }
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}
var i;
function State$1(input, options) {
  this.input = input;
  this.filename = options["filename"] || null;
  this.schema = options["schema"] || _default;
  this.onWarning = options["onWarning"] || null;
  this.legacy = options["legacy"] || false;
  this.json = options["json"] || false;
  this.listener = options["listener"] || null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.typeMap = this.schema.compiledTypeMap;
  this.length = input.length;
  this.position = 0;
  this.line = 0;
  this.lineStart = 0;
  this.lineIndent = 0;
  this.firstTabInLine = -1;
  this.documents = [];
}
function generateError(state, message) {
  var mark = {
    name: state.filename,
    buffer: state.input.slice(0, -1),
    // omit trailing \0
    position: state.position,
    line: state.line,
    column: state.position - state.lineStart
  };
  mark.snippet = snippet(mark);
  return new exception(message, mark);
}
function throwError(state, message) {
  throw generateError(state, message);
}
function throwWarning(state, message) {
  if (state.onWarning) {
    state.onWarning.call(null, generateError(state, message));
  }
}
var directiveHandlers = {
  YAML: function handleYamlDirective(state, name, args) {
    var match, major, minor;
    if (state.version !== null) {
      throwError(state, "duplication of %YAML directive");
    }
    if (args.length !== 1) {
      throwError(state, "YAML directive accepts exactly one argument");
    }
    match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match === null) {
      throwError(state, "ill-formed argument of the YAML directive");
    }
    major = parseInt(match[1], 10);
    minor = parseInt(match[2], 10);
    if (major !== 1) {
      throwError(state, "unacceptable YAML version of the document");
    }
    state.version = args[0];
    state.checkLineBreaks = minor < 2;
    if (minor !== 1 && minor !== 2) {
      throwWarning(state, "unsupported YAML version of the document");
    }
  },
  TAG: function handleTagDirective(state, name, args) {
    var handle, prefix;
    if (args.length !== 2) {
      throwError(state, "TAG directive accepts exactly two arguments");
    }
    handle = args[0];
    prefix = args[1];
    if (!PATTERN_TAG_HANDLE.test(handle)) {
      throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
    }
    if (_hasOwnProperty$1.call(state.tagMap, handle)) {
      throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
    }
    if (!PATTERN_TAG_URI.test(prefix)) {
      throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
    }
    try {
      prefix = decodeURIComponent(prefix);
    } catch (err) {
      throwError(state, "tag prefix is malformed: " + prefix);
    }
    state.tagMap[handle] = prefix;
  }
};
function captureSegment(state, start, end, checkJson) {
  var _position, _length, _character, _result;
  if (start < end) {
    _result = state.input.slice(start, end);
    if (checkJson) {
      for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
          throwError(state, "expected valid JSON character");
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, "the stream contains non-printable characters");
    }
    state.result += _result;
  }
}
function mergeMappings(state, destination, source, overridableKeys) {
  var sourceKeys, key, index, quantity;
  if (!common.isObject(source)) {
    throwError(state, "cannot merge mappings; the provided source object is unacceptable");
  }
  sourceKeys = Object.keys(source);
  for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
    key = sourceKeys[index];
    if (!_hasOwnProperty$1.call(destination, key)) {
      setProperty(destination, key, source[key]);
      overridableKeys[key] = true;
    }
  }
}
function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
  var index, quantity;
  if (Array.isArray(keyNode)) {
    keyNode = Array.prototype.slice.call(keyNode);
    for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
      if (Array.isArray(keyNode[index])) {
        throwError(state, "nested arrays are not supported inside keys");
      }
      if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
        keyNode[index] = "[object Object]";
      }
    }
  }
  if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
    keyNode = "[object Object]";
  }
  keyNode = String(keyNode);
  if (_result === null) {
    _result = {};
  }
  if (keyTag === "tag:yaml.org,2002:merge") {
    if (Array.isArray(valueNode)) {
      for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
        mergeMappings(state, _result, valueNode[index], overridableKeys);
      }
    } else {
      mergeMappings(state, _result, valueNode, overridableKeys);
    }
  } else {
    if (!state.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
      state.line = startLine || state.line;
      state.lineStart = startLineStart || state.lineStart;
      state.position = startPos || state.position;
      throwError(state, "duplicated mapping key");
    }
    setProperty(_result, keyNode, valueNode);
    delete overridableKeys[keyNode];
  }
  return _result;
}
function readLineBreak(state) {
  var ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 10) {
    state.position++;
  } else if (ch === 13) {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) {
      state.position++;
    }
  } else {
    throwError(state, "a line break is expected");
  }
  state.line += 1;
  state.lineStart = state.position;
  state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments, checkIndent) {
  var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      if (ch === 9 && state.firstTabInLine === -1) {
        state.firstTabInLine = state.position;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 10 && ch !== 13 && ch !== 0);
    }
    if (is_EOL(ch)) {
      readLineBreak(state);
      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;
      while (ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }
  if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
    throwWarning(state, "deficient indentation");
  }
  return lineBreaks;
}
function testDocumentSeparator(state) {
  var _position = state.position, ch;
  ch = state.input.charCodeAt(_position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
    _position += 3;
    ch = state.input.charCodeAt(_position);
    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }
  return false;
}
function writeFoldedLines(state, count) {
  if (count === 1) {
    state.result += " ";
  } else if (count > 1) {
    state.result += common.repeat("\n", count - 1);
  }
}
function readPlainScalar(state, nodeIndent, withinFlowCollection) {
  var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
  ch = state.input.charCodeAt(state.position);
  if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
    return false;
  }
  if (ch === 63 || ch === 45) {
    following = state.input.charCodeAt(state.position + 1);
    if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }
  state.kind = "scalar";
  state.result = "";
  captureStart = captureEnd = state.position;
  hasPendingContent = false;
  while (ch !== 0) {
    if (ch === 58) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }
    } else if (ch === 35) {
      preceding = state.input.charCodeAt(state.position - 1);
      if (is_WS_OR_EOL(preceding)) {
        break;
      }
    } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;
    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);
      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }
    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }
    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }
    ch = state.input.charCodeAt(++state.position);
  }
  captureSegment(state, captureStart, captureEnd, false);
  if (state.result) {
    return true;
  }
  state.kind = _kind;
  state.result = _result;
  return false;
}
function readSingleQuotedScalar(state, nodeIndent) {
  var ch, captureStart, captureEnd;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 39) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 39) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (ch === 39) {
        captureStart = state.position;
        state.position++;
        captureEnd = state.position;
      } else {
        return true;
      }
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a single quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent) {
  var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 34) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 34) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
      return true;
    } else if (ch === 92) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);
      } else if (ch < 256 && simpleEscapeCheck[ch]) {
        state.result += simpleEscapeMap[ch];
        state.position++;
      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;
        for (; hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);
          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;
          } else {
            throwError(state, "expected hexadecimal character");
          }
        }
        state.result += charFromCodepoint(hexResult);
        state.position++;
      } else {
        throwError(state, "unknown escape sequence");
      }
      captureStart = captureEnd = state.position;
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a double quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state, nodeIndent) {
  var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 91) {
    terminator = 93;
    isMapping = false;
    _result = [];
  } else if (ch === 123) {
    terminator = 125;
    isMapping = true;
    _result = {};
  } else {
    return false;
  }
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(++state.position);
  while (ch !== 0) {
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? "mapping" : "sequence";
      state.result = _result;
      return true;
    } else if (!readNext) {
      throwError(state, "missed comma between flow collection entries");
    } else if (ch === 44) {
      throwError(state, "expected the node content, but found ','");
    }
    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;
    if (ch === 63) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }
    _line = state.line;
    _lineStart = state.lineStart;
    _pos = state.position;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if ((isExplicitPair || state.line === _line) && ch === 58) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }
    if (isMapping) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
    } else if (isPair) {
      _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
    } else {
      _result.push(keyNode);
    }
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === 44) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state, nodeIndent) {
  var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 124) {
    folding = false;
  } else if (ch === 62) {
    folding = true;
  } else {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  while (ch !== 0) {
    ch = state.input.charCodeAt(++state.position);
    if (ch === 43 || ch === 45) {
      if (CHOMPING_CLIP === chomping) {
        chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, "repeat of a chomping mode identifier");
      }
    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, "repeat of an indentation width identifier");
      }
    } else {
      break;
    }
  }
  if (is_WHITE_SPACE(ch)) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (is_WHITE_SPACE(ch));
    if (ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (!is_EOL(ch) && ch !== 0);
    }
  }
  while (ch !== 0) {
    readLineBreak(state);
    state.lineIndent = 0;
    ch = state.input.charCodeAt(state.position);
    while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }
    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }
    if (state.lineIndent < textIndent) {
      if (chomping === CHOMPING_KEEP) {
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (didReadContent) {
          state.result += "\n";
        }
      }
      break;
    }
    if (folding) {
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (atMoreIndented) {
        atMoreIndented = false;
        state.result += common.repeat("\n", emptyLines + 1);
      } else if (emptyLines === 0) {
        if (didReadContent) {
          state.result += " ";
        }
      } else {
        state.result += common.repeat("\n", emptyLines);
      }
    } else {
      state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
    }
    didReadContent = true;
    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;
    while (!is_EOL(ch) && ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, state.position, false);
  }
  return true;
}
function readBlockSequence(state, nodeIndent) {
  var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    if (ch !== 45) {
      break;
    }
    following = state.input.charCodeAt(state.position + 1);
    if (!is_WS_OR_EOL(following)) {
      break;
    }
    detected = true;
    state.position++;
    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }
    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    _result.push(state.result);
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a sequence entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "sequence";
    state.result = _result;
    return true;
  }
  return false;
}
function readBlockMapping(state, nodeIndent, flowIndent) {
  var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (!atExplicitKey && state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line;
    if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
      if (ch === 63) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        detected = true;
        atExplicitKey = true;
        allowCompact = true;
      } else if (atExplicitKey) {
        atExplicitKey = false;
        allowCompact = true;
      } else {
        throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
      }
      state.position += 1;
      ch = following;
    } else {
      _keyLine = state.line;
      _keyLineStart = state.lineStart;
      _keyPos = state.position;
      if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
        break;
      }
      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!is_WS_OR_EOL(ch)) {
            throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          }
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;
        } else if (detected) {
          throwError(state, "can not read an implicit mapping pair; a colon is missed");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      } else if (detected) {
        throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true;
      }
    }
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (atExplicitKey) {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
      }
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }
      if (!atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
        keyTag = keyNode = valueNode = null;
      }
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a mapping entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (atExplicitKey) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "mapping";
    state.result = _result;
  }
  return detected;
}
function readTagProperty(state) {
  var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 33) return false;
  if (state.tag !== null) {
    throwError(state, "duplication of a tag property");
  }
  ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  } else {
    tagHandle = "!";
  }
  _position = state.position;
  if (isVerbatim) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (ch !== 0 && ch !== 62);
    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, "unexpected end of the stream within a verbatim tag");
    }
  } else {
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      if (ch === 33) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);
          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, "named tag handle cannot contain such characters");
          }
          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, "tag suffix cannot contain exclamation marks");
        }
      }
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(_position, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, "tag suffix cannot contain flow indicator characters");
    }
  }
  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, "tag name cannot contain such characters: " + tagName);
  }
  try {
    tagName = decodeURIComponent(tagName);
  } catch (err) {
    throwError(state, "tag name is malformed: " + tagName);
  }
  if (isVerbatim) {
    state.tag = tagName;
  } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;
  } else if (tagHandle === "!") {
    state.tag = "!" + tagName;
  } else if (tagHandle === "!!") {
    state.tag = "tag:yaml.org,2002:" + tagName;
  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }
  return true;
}
function readAnchorProperty(state) {
  var _position, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 38) return false;
  if (state.anchor !== null) {
    throwError(state, "duplication of an anchor property");
  }
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an anchor node must contain at least one character");
  }
  state.anchor = state.input.slice(_position, state.position);
  return true;
}
function readAlias(state) {
  var _position, alias, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 42) return false;
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an alias node must contain at least one character");
  }
  alias = state.input.slice(_position, state.position);
  if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
  }
  state.result = state.anchorMap[alias];
  skipSeparationSpace(state, true, -1);
  return true;
}
function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type2, flowIndent, blockIndent;
  if (state.listener !== null) {
    state.listener("open", state);
  }
  state.tag = null;
  state.anchor = null;
  state.kind = null;
  state.result = null;
  allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;
      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }
  if (indentStatus === 1) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }
  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }
  if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }
    blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) {
      if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;
        } else if (readAlias(state)) {
          hasContent = true;
          if (state.tag !== null || state.anchor !== null) {
            throwError(state, "alias node should not have any properties");
          }
        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;
          if (state.tag === null) {
            state.tag = "?";
          }
        }
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else if (indentStatus === 0) {
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }
  if (state.tag === null) {
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = state.result;
    }
  } else if (state.tag === "?") {
    if (state.result !== null && state.kind !== "scalar") {
      throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
    }
    for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
      type2 = state.implicitTypes[typeIndex];
      if (type2.resolve(state.result)) {
        state.result = type2.construct(state.result);
        state.tag = type2.tag;
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
        break;
      }
    }
  } else if (state.tag !== "!") {
    if (_hasOwnProperty$1.call(state.typeMap[state.kind || "fallback"], state.tag)) {
      type2 = state.typeMap[state.kind || "fallback"][state.tag];
    } else {
      type2 = null;
      typeList = state.typeMap.multi[state.kind || "fallback"];
      for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
        if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
          type2 = typeList[typeIndex];
          break;
        }
      }
    }
    if (!type2) {
      throwError(state, "unknown tag !<" + state.tag + ">");
    }
    if (state.result !== null && type2.kind !== state.kind) {
      throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
    }
    if (!type2.resolve(state.result, state.tag)) {
      throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
    } else {
      state.result = type2.construct(state.result, state.tag);
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    }
  }
  if (state.listener !== null) {
    state.listener("close", state);
  }
  return state.tag !== null || state.anchor !== null || hasContent;
}
function readDocument(state) {
  var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = /* @__PURE__ */ Object.create(null);
  state.anchorMap = /* @__PURE__ */ Object.create(null);
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if (state.lineIndent > 0 || ch !== 37) {
      break;
    }
    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];
    if (directiveName.length < 1) {
      throwError(state, "directive name must not be less than one character in length");
    }
    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && !is_EOL(ch));
        break;
      }
      if (is_EOL(ch)) break;
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      directiveArgs.push(state.input.slice(_position, state.position));
    }
    if (ch !== 0) readLineBreak(state);
    if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
  }
  skipSeparationSpace(state, true, -1);
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);
  } else if (hasDirectives) {
    throwError(state, "directives end mark is expected");
  }
  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);
  if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, "non-ASCII line breaks are interpreted as content");
  }
  state.documents.push(state.result);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    if (state.input.charCodeAt(state.position) === 46) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }
  if (state.position < state.length - 1) {
    throwError(state, "end of the stream or a document separator is expected");
  } else {
    return;
  }
}
function loadDocuments(input, options) {
  input = String(input);
  options = options || {};
  if (input.length !== 0) {
    if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
      input += "\n";
    }
    if (input.charCodeAt(0) === 65279) {
      input = input.slice(1);
    }
  }
  var state = new State$1(input, options);
  var nullpos = input.indexOf("\0");
  if (nullpos !== -1) {
    state.position = nullpos;
    throwError(state, "null byte is not allowed in input");
  }
  state.input += "\0";
  while (state.input.charCodeAt(state.position) === 32) {
    state.lineIndent += 1;
    state.position += 1;
  }
  while (state.position < state.length - 1) {
    readDocument(state);
  }
  return state.documents;
}
function loadAll$1(input, iterator, options) {
  if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
    options = iterator;
    iterator = null;
  }
  var documents = loadDocuments(input, options);
  if (typeof iterator !== "function") {
    return documents;
  }
  for (var index = 0, length = documents.length; index < length; index += 1) {
    iterator(documents[index]);
  }
}
function load$1(input, options) {
  var documents = loadDocuments(input, options);
  if (documents.length === 0) {
    return void 0;
  } else if (documents.length === 1) {
    return documents[0];
  }
  throw new exception("expected a single document in the stream, but found more");
}
var loadAll_1 = loadAll$1;
var load_1 = load$1;
var loader = {
  loadAll: loadAll_1,
  load: load_1
};
var _toString = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var CHAR_BOM = 65279;
var CHAR_TAB = 9;
var CHAR_LINE_FEED = 10;
var CHAR_CARRIAGE_RETURN = 13;
var CHAR_SPACE = 32;
var CHAR_EXCLAMATION = 33;
var CHAR_DOUBLE_QUOTE = 34;
var CHAR_SHARP = 35;
var CHAR_PERCENT = 37;
var CHAR_AMPERSAND = 38;
var CHAR_SINGLE_QUOTE = 39;
var CHAR_ASTERISK = 42;
var CHAR_COMMA = 44;
var CHAR_MINUS = 45;
var CHAR_COLON = 58;
var CHAR_EQUALS = 61;
var CHAR_GREATER_THAN = 62;
var CHAR_QUESTION = 63;
var CHAR_COMMERCIAL_AT = 64;
var CHAR_LEFT_SQUARE_BRACKET = 91;
var CHAR_RIGHT_SQUARE_BRACKET = 93;
var CHAR_GRAVE_ACCENT = 96;
var CHAR_LEFT_CURLY_BRACKET = 123;
var CHAR_VERTICAL_LINE = 124;
var CHAR_RIGHT_CURLY_BRACKET = 125;
var ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = '\\"';
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
var DEPRECATED_BOOLEANS_SYNTAX = [
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "on",
  "On",
  "ON",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF"
];
var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
function compileStyleMap(schema2, map2) {
  var result, keys, index, length, tag, style, type2;
  if (map2 === null) return {};
  result = {};
  keys = Object.keys(map2);
  for (index = 0, length = keys.length; index < length; index += 1) {
    tag = keys[index];
    style = String(map2[tag]);
    if (tag.slice(0, 2) === "!!") {
      tag = "tag:yaml.org,2002:" + tag.slice(2);
    }
    type2 = schema2.compiledTypeMap["fallback"][tag];
    if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
      style = type2.styleAliases[style];
    }
    result[tag] = style;
  }
  return result;
}
function encodeHex(character) {
  var string, handle, length;
  string = character.toString(16).toUpperCase();
  if (character <= 255) {
    handle = "x";
    length = 2;
  } else if (character <= 65535) {
    handle = "u";
    length = 4;
  } else if (character <= 4294967295) {
    handle = "U";
    length = 8;
  } else {
    throw new exception("code point within a string may not be greater than 0xFFFFFFFF");
  }
  return "\\" + handle + common.repeat("0", length - string.length) + string;
}
var QUOTING_TYPE_SINGLE = 1;
var QUOTING_TYPE_DOUBLE = 2;
function State(options) {
  this.schema = options["schema"] || _default;
  this.indent = Math.max(1, options["indent"] || 2);
  this.noArrayIndent = options["noArrayIndent"] || false;
  this.skipInvalid = options["skipInvalid"] || false;
  this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
  this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
  this.sortKeys = options["sortKeys"] || false;
  this.lineWidth = options["lineWidth"] || 80;
  this.noRefs = options["noRefs"] || false;
  this.noCompatMode = options["noCompatMode"] || false;
  this.condenseFlow = options["condenseFlow"] || false;
  this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
  this.forceQuotes = options["forceQuotes"] || false;
  this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.explicitTypes = this.schema.compiledExplicit;
  this.tag = null;
  this.result = "";
  this.duplicates = [];
  this.usedDuplicates = null;
}
function indentString(string, spaces) {
  var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
  while (position < length) {
    next = string.indexOf("\n", position);
    if (next === -1) {
      line = string.slice(position);
      position = length;
    } else {
      line = string.slice(position, next + 1);
      position = next + 1;
    }
    if (line.length && line !== "\n") result += ind;
    result += line;
  }
  return result;
}
function generateNextLine(state, level) {
  return "\n" + common.repeat(" ", state.indent * level);
}
function testImplicitResolving(state, str2) {
  var index, length, type2;
  for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
    type2 = state.implicitTypes[index];
    if (type2.resolve(str2)) {
      return true;
    }
  }
  return false;
}
function isWhitespace(c) {
  return c === CHAR_SPACE || c === CHAR_TAB;
}
function isPrintable(c) {
  return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
}
function isNsCharOrWhitespace(c) {
  return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
}
function isPlainSafe(c, prev, inblock) {
  var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
  var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
  return (
    // ns-plain-safe
    (inblock ? (
      // c = flow-in
      cIsNsCharOrWhitespace
    ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
  );
}
function isPlainSafeFirst(c) {
  return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
}
function isPlainSafeLast(c) {
  return !isWhitespace(c) && c !== CHAR_COLON;
}
function codePointAt(string, pos) {
  var first = string.charCodeAt(pos), second;
  if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
    second = string.charCodeAt(pos + 1);
    if (second >= 56320 && second <= 57343) {
      return (first - 55296) * 1024 + second - 56320 + 65536;
    }
  }
  return first;
}
function needIndentIndicator(string) {
  var leadingSpaceRe = /^\n* /;
  return leadingSpaceRe.test(string);
}
var STYLE_PLAIN = 1;
var STYLE_SINGLE = 2;
var STYLE_LITERAL = 3;
var STYLE_FOLDED = 4;
var STYLE_DOUBLE = 5;
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
  var i;
  var char = 0;
  var prevChar = null;
  var hasLineBreak = false;
  var hasFoldableLine = false;
  var shouldTrackWidth = lineWidth !== -1;
  var previousLineBreak = -1;
  var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
  if (singleLineOnly || forceQuotes) {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
  } else {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
          i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
          previousLineBreak = i;
        }
      } else if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
    hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
  }
  if (!hasLineBreak && !hasFoldableLine) {
    if (plain && !forceQuotes && !testAmbiguousType(string)) {
      return STYLE_PLAIN;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  if (indentPerLevel > 9 && needIndentIndicator(string)) {
    return STYLE_DOUBLE;
  }
  if (!forceQuotes) {
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
  }
  return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
}
function writeScalar(state, string, level, iskey, inblock) {
  state.dump = function() {
    if (string.length === 0) {
      return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
    }
    if (!state.noCompatMode) {
      if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
      }
    }
    var indent = state.indent * Math.max(1, level);
    var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
    var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
    function testAmbiguity(string2) {
      return testImplicitResolving(state, string2);
    }
    switch (chooseScalarStyle(
      string,
      singleLineOnly,
      state.indent,
      lineWidth,
      testAmbiguity,
      state.quotingType,
      state.forceQuotes && !iskey,
      inblock
    )) {
      case STYLE_PLAIN:
        return string;
      case STYLE_SINGLE:
        return "'" + string.replace(/'/g, "''") + "'";
      case STYLE_LITERAL:
        return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
      case STYLE_FOLDED:
        return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
      case STYLE_DOUBLE:
        return '"' + escapeString(string) + '"';
      default:
        throw new exception("impossible error: invalid scalar style");
    }
  }();
}
function blockHeader(string, indentPerLevel) {
  var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
  var clip = string[string.length - 1] === "\n";
  var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
  var chomp = keep ? "+" : clip ? "" : "-";
  return indentIndicator + chomp + "\n";
}
function dropEndingNewline(string) {
  return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
}
function foldString(string, width) {
  var lineRe = /(\n+)([^\n]*)/g;
  var result = function() {
    var nextLF = string.indexOf("\n");
    nextLF = nextLF !== -1 ? nextLF : string.length;
    lineRe.lastIndex = nextLF;
    return foldLine(string.slice(0, nextLF), width);
  }();
  var prevMoreIndented = string[0] === "\n" || string[0] === " ";
  var moreIndented;
  var match;
  while (match = lineRe.exec(string)) {
    var prefix = match[1], line = match[2];
    moreIndented = line[0] === " ";
    result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }
  return result;
}
function foldLine(line, width) {
  if (line === "" || line[0] === " ") return line;
  var breakRe = / [^ ]/g;
  var match;
  var start = 0, end, curr = 0, next = 0;
  var result = "";
  while (match = breakRe.exec(line)) {
    next = match.index;
    if (next - start > width) {
      end = curr > start ? curr : next;
      result += "\n" + line.slice(start, end);
      start = end + 1;
    }
    curr = next;
  }
  result += "\n";
  if (line.length - start > width && curr > start) {
    result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
  } else {
    result += line.slice(start);
  }
  return result.slice(1);
}
function escapeString(string) {
  var result = "";
  var char = 0;
  var escapeSeq;
  for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
    char = codePointAt(string, i);
    escapeSeq = ESCAPE_SEQUENCES[char];
    if (!escapeSeq && isPrintable(char)) {
      result += string[i];
      if (char >= 65536) result += string[i + 1];
    } else {
      result += escapeSeq || encodeHex(char);
    }
  }
  return result;
}
function writeFlowSequence(state, level, object) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
      if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = "[" + _result + "]";
}
function writeBlockSequence(state, level, object, compact) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
      if (!compact || _result !== "") {
        _result += generateNextLine(state, level);
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        _result += "-";
      } else {
        _result += "- ";
      }
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = _result || "[]";
}
function writeFlowMapping(state, level, object) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (_result !== "") pairBuffer += ", ";
    if (state.condenseFlow) pairBuffer += '"';
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level, objectKey, false, false)) {
      continue;
    }
    if (state.dump.length > 1024) pairBuffer += "? ";
    pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
    if (!writeNode(state, level, objectValue, false, false)) {
      continue;
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = "{" + _result + "}";
}
function writeBlockMapping(state, level, object, compact) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
  if (state.sortKeys === true) {
    objectKeyList.sort();
  } else if (typeof state.sortKeys === "function") {
    objectKeyList.sort(state.sortKeys);
  } else if (state.sortKeys) {
    throw new exception("sortKeys must be a boolean or a function");
  }
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (!compact || _result !== "") {
      pairBuffer += generateNextLine(state, level);
    }
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level + 1, objectKey, true, true, true)) {
      continue;
    }
    explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
    if (explicitPair) {
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += "?";
      } else {
        pairBuffer += "? ";
      }
    }
    pairBuffer += state.dump;
    if (explicitPair) {
      pairBuffer += generateNextLine(state, level);
    }
    if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
      continue;
    }
    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      pairBuffer += ":";
    } else {
      pairBuffer += ": ";
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = _result || "{}";
}
function detectType(state, object, explicit) {
  var _result, typeList, index, length, type2, style;
  typeList = explicit ? state.explicitTypes : state.implicitTypes;
  for (index = 0, length = typeList.length; index < length; index += 1) {
    type2 = typeList[index];
    if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
      if (explicit) {
        if (type2.multi && type2.representName) {
          state.tag = type2.representName(object);
        } else {
          state.tag = type2.tag;
        }
      } else {
        state.tag = "?";
      }
      if (type2.represent) {
        style = state.styleMap[type2.tag] || type2.defaultStyle;
        if (_toString.call(type2.represent) === "[object Function]") {
          _result = type2.represent(object, style);
        } else if (_hasOwnProperty.call(type2.represent, style)) {
          _result = type2.represent[style](object, style);
        } else {
          throw new exception("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
        }
        state.dump = _result;
      }
      return true;
    }
  }
  return false;
}
function writeNode(state, level, object, block, compact, iskey, isblockseq) {
  state.tag = null;
  state.dump = object;
  if (!detectType(state, object, false)) {
    detectType(state, object, true);
  }
  var type2 = _toString.call(state.dump);
  var inblock = block;
  var tagStr;
  if (block) {
    block = state.flowLevel < 0 || state.flowLevel > level;
  }
  var objectOrArray = type2 === "[object Object]" || type2 === "[object Array]", duplicateIndex, duplicate;
  if (objectOrArray) {
    duplicateIndex = state.duplicates.indexOf(object);
    duplicate = duplicateIndex !== -1;
  }
  if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
    compact = false;
  }
  if (duplicate && state.usedDuplicates[duplicateIndex]) {
    state.dump = "*ref_" + duplicateIndex;
  } else {
    if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
      state.usedDuplicates[duplicateIndex] = true;
    }
    if (type2 === "[object Object]") {
      if (block && Object.keys(state.dump).length !== 0) {
        writeBlockMapping(state, level, state.dump, compact);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowMapping(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object Array]") {
      if (block && state.dump.length !== 0) {
        if (state.noArrayIndent && !isblockseq && level > 0) {
          writeBlockSequence(state, level - 1, state.dump, compact);
        } else {
          writeBlockSequence(state, level, state.dump, compact);
        }
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowSequence(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object String]") {
      if (state.tag !== "?") {
        writeScalar(state, state.dump, level, iskey, inblock);
      }
    } else if (type2 === "[object Undefined]") {
      return false;
    } else {
      if (state.skipInvalid) return false;
      throw new exception("unacceptable kind of an object to dump " + type2);
    }
    if (state.tag !== null && state.tag !== "?") {
      tagStr = encodeURI(
        state.tag[0] === "!" ? state.tag.slice(1) : state.tag
      ).replace(/!/g, "%21");
      if (state.tag[0] === "!") {
        tagStr = "!" + tagStr;
      } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
        tagStr = "!!" + tagStr.slice(18);
      } else {
        tagStr = "!<" + tagStr + ">";
      }
      state.dump = tagStr + " " + state.dump;
    }
  }
  return true;
}
function getDuplicateReferences(object, state) {
  var objects = [], duplicatesIndexes = [], index, length;
  inspectNode(object, objects, duplicatesIndexes);
  for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
    state.duplicates.push(objects[duplicatesIndexes[index]]);
  }
  state.usedDuplicates = new Array(length);
}
function inspectNode(object, objects, duplicatesIndexes) {
  var objectKeyList, index, length;
  if (object !== null && typeof object === "object") {
    index = objects.indexOf(object);
    if (index !== -1) {
      if (duplicatesIndexes.indexOf(index) === -1) {
        duplicatesIndexes.push(index);
      }
    } else {
      objects.push(object);
      if (Array.isArray(object)) {
        for (index = 0, length = object.length; index < length; index += 1) {
          inspectNode(object[index], objects, duplicatesIndexes);
        }
      } else {
        objectKeyList = Object.keys(object);
        for (index = 0, length = objectKeyList.length; index < length; index += 1) {
          inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
        }
      }
    }
  }
}
function dump$1(input, options) {
  options = options || {};
  var state = new State(options);
  if (!state.noRefs) getDuplicateReferences(input, state);
  var value = input;
  if (state.replacer) {
    value = state.replacer.call({ "": value }, "", value);
  }
  if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
  return "";
}
var dump_1 = dump$1;
var dumper = {
  dump: dump_1
};
function renamed(from, to) {
  return function() {
    throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
  };
}
var load = loader.load;
var loadAll = loader.loadAll;
var dump = dumper.dump;
var safeLoad = renamed("safeLoad", "load");
var safeLoadAll = renamed("safeLoadAll", "loadAll");
var safeDump = renamed("safeDump", "dump");

// ../validator/src/node.ts
import * as fs2 from "node:fs";
import * as fsPromises from "node:fs/promises";

// src/post-tool-use-edit.ts
var post_tool_use_edit_default = postToolUseHook({ matcher: "Write|Edit|MultiEdit" }, async (input, { logger: logger2 }) => {
  const filePath = getFilePath(input);
  if (!filePath) return postToolUseOutput({});
  const isCardFile = filePath.includes("/cards/") && filePath.endsWith(".json");
  if (!isCardFile) {
    return postToolUseOutput({});
  }
  try {
    const content = await readFile2(filePath, "utf-8");
    if (isCardFile) {
      const card = JSON.parse(content);
      const result = validateCard(card);
      if (!result.valid) {
        return postToolUseOutput({
          systemMessage: `Card validation failed: ${result.errors.map((e) => e.message).join(", ")}`
        });
      }
    }
    return postToolUseOutput({
      systemMessage: `Validated: ${filePath}`
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return postToolUseOutput({
        systemMessage: `Invalid JSON in card file: ${error.message}`
      });
    }
    logger2.warn("Validation error", { error: String(error) });
    return postToolUseOutput({});
  }
});

// ../../../../../../tmp/claude-code-hooks-build/9be22fd0a3e2614d/wrapper.ts
process.env["CLAUDE_CODE_HOOKS_CLI_LOG_FILE"] = "/tmp/hooks-v2.log";
execute(post_tool_use_edit_default);
/*! Bundled license information:

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 4.1.1 https://github.com/nodeca/js-yaml @license MIT *)
*/
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWRldGFpbC13ZWJ2aWV3L3BhY2thZ2VzL2lzc3Vlcy9jbGF1ZGUtY29kZS1jbGktaG9va3Mvc3JjL3Bvc3QtdG9vbC11c2UtZWRpdC50cyIsICIuLi8uLi8uLi93b3Jrc3BhY2UvLndvcmt0cmVlcy9pc3N1ZXMtdjItZGV0YWlsLXdlYnZpZXcvcGFja2FnZXMvaXNzdWVzL2NsYXVkZS1jb2RlLWNsaS1ob29rcy9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvZW52LmpzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL2lzc3Vlcy12Mi1kZXRhaWwtd2Vidmlldy9wYWNrYWdlcy9pc3N1ZXMvY2xhdWRlLWNvZGUtY2xpLWhvb2tzL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9ob29rcy5qcyIsICIuLi8uLi8uLi93b3Jrc3BhY2UvLndvcmt0cmVlcy9pc3N1ZXMtdjItZGV0YWlsLXdlYnZpZXcvcGFja2FnZXMvaXNzdWVzL2NsYXVkZS1jb2RlLWNsaS1ob29rcy9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvbG9nZ2VyLmpzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL2lzc3Vlcy12Mi1kZXRhaWwtd2Vidmlldy9wYWNrYWdlcy9pc3N1ZXMvY2xhdWRlLWNvZGUtY2xpLWhvb2tzL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9vdXRwdXRzLmpzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL2lzc3Vlcy12Mi1kZXRhaWwtd2Vidmlldy9wYWNrYWdlcy9pc3N1ZXMvY2xhdWRlLWNvZGUtY2xpLWhvb2tzL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9ydW50aW1lLmpzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL2lzc3Vlcy12Mi1kZXRhaWwtd2Vidmlldy9wYWNrYWdlcy9pc3N1ZXMvY2xhdWRlLWNvZGUtY2xpLWhvb2tzL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC90b29sLWhlbHBlcnMuanMiLCAiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWRldGFpbC13ZWJ2aWV3L3BhY2thZ2VzL2lzc3Vlcy92YWxpZGF0b3Ivc3JjL2NhcmQudHMiLCAiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWRldGFpbC13ZWJ2aWV3L25vZGVfbW9kdWxlcy9qcy15YW1sL2Rpc3QvanMteWFtbC5tanMiLCAiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWRldGFpbC13ZWJ2aWV3L3BhY2thZ2VzL2lzc3Vlcy92YWxpZGF0b3Ivc3JjL25vZGUudHMiLCAid3JhcHBlci50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgcmVhZEZpbGUgfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7IGdldEZpbGVQYXRoLCBwb3N0VG9vbFVzZUhvb2ssIHBvc3RUb29sVXNlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbmltcG9ydCB7IHZhbGlkYXRlQ2FyZCB9IGZyb20gJ0Bnb29kZm9vdC9pc3N1ZXMtdmFsaWRhdG9yJztcblxuZXhwb3J0IGRlZmF1bHQgcG9zdFRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ1dyaXRlfEVkaXR8TXVsdGlFZGl0JyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAgY29uc3QgZmlsZVBhdGggPSBnZXRGaWxlUGF0aChpbnB1dCk7XG4gIGlmICghZmlsZVBhdGgpIHJldHVybiBwb3N0VG9vbFVzZU91dHB1dCh7fSk7XG5cbiAgLy8gT25seSB2YWxpZGF0ZSBpc3N1ZS1yZWxhdGVkIGZpbGVzXG4gIGNvbnN0IGlzQ2FyZEZpbGUgPSBmaWxlUGF0aC5pbmNsdWRlcygnL2NhcmRzLycpICYmIGZpbGVQYXRoLmVuZHNXaXRoKCcuanNvbicpO1xuXG4gIGlmICghaXNDYXJkRmlsZSkge1xuICAgIHJldHVybiBwb3N0VG9vbFVzZU91dHB1dCh7fSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZWFkRmlsZShmaWxlUGF0aCwgJ3V0Zi04Jyk7XG5cbiAgICBpZiAoaXNDYXJkRmlsZSkge1xuICAgICAgY29uc3QgY2FyZCA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZUNhcmQoY2FyZCk7XG4gICAgICBpZiAoIXJlc3VsdC52YWxpZCkge1xuICAgICAgICByZXR1cm4gcG9zdFRvb2xVc2VPdXRwdXQoe1xuICAgICAgICAgIHN5c3RlbU1lc3NhZ2U6IGBDYXJkIHZhbGlkYXRpb24gZmFpbGVkOiAke3Jlc3VsdC5lcnJvcnMubWFwKChlKSA9PiBlLm1lc3NhZ2UpLmpvaW4oJywgJyl9YFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcG9zdFRvb2xVc2VPdXRwdXQoe1xuICAgICAgc3lzdGVtTWVzc2FnZTogYFZhbGlkYXRlZDogJHtmaWxlUGF0aH1gXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gSGFuZGxlIEpTT04gcGFyc2UgZXJyb3JzIGV4cGxpY2l0bHkgZm9yIGNhcmQgZmlsZXNcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBTeW50YXhFcnJvcikge1xuICAgICAgcmV0dXJuIHBvc3RUb29sVXNlT3V0cHV0KHtcbiAgICAgICAgc3lzdGVtTWVzc2FnZTogYEludmFsaWQgSlNPTiBpbiBjYXJkIGZpbGU6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICB9KTtcbiAgICB9XG4gICAgbG9nZ2VyLndhcm4oJ1ZhbGlkYXRpb24gZXJyb3InLCB7IGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgIHJldHVybiBwb3N0VG9vbFVzZU91dHB1dCh7fSk7XG4gIH1cbn0pO1xuIiwgIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBhY2Nlc3MgdG8gQ2xhdWRlIENvZGUncyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHV0aWxpdGllc1xuICogZm9yIHBlcnNpc3RpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzIGluIFNlc3Npb25TdGFydCBob29rcy5cbiAqXG4gKiAjIyBFbnZpcm9ubWVudCBWYXJpYWJsZXNcbiAqXG4gKiBDbGF1ZGUgQ29kZSBzZXRzIHRoZXNlIGVudmlyb25tZW50IHZhcmlhYmxlcyB3aGVuIHJ1bm5pbmcgaG9va3M6XG4gKlxuICogfCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHwgQXZhaWxhYmxlIEluIHxcbiAqIHwtLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS18XG4gKiB8IGBDTEFVREVfUFJPSkVDVF9ESVJgIHwgQWJzb2x1dGUgcGF0aCB0byBwcm9qZWN0IHJvb3QgfCBBbGwgaG9va3MgfFxuICogfCBgQ0xBVURFX0VOVl9GSUxFYCB8IFBhdGggdG8gZmlsZSBmb3IgcGVyc2lzdGluZyBlbnYgdmFycyB8IFNlc3Npb25TdGFydCBvbmx5IHxcbiAqIHwgYENMQVVERV9DT0RFX1JFTU9URWAgfCBgXCJ0cnVlXCJgIGlmIHJ1bm5pbmcgcmVtb3RlbHkgfCBBbGwgaG9va3MgfFxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGdldFByb2plY3REaXIsIHBlcnNpc3RFbnZWYXIsIGlzUmVtb3RlRW52aXJvbm1lbnQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEdldCBwcm9qZWN0IGRpcmVjdG9yeVxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqXG4gKiAvLyBDaGVjayBpZiBydW5uaW5nIHJlbW90ZWx5XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIEhhbmRsZSByZW1vdGUtc3BlY2lmaWMgbG9naWNcbiAqIH1cbiAqXG4gKiAvLyBJbiBTZXNzaW9uU3RhcnQgaG9vazogcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ3Byb2R1Y3Rpb24nKTtcbiAqIHBlcnNpc3RFbnZWYXIoJ0FQSV9LRVknLCAnc2VjcmV0LWtleScpO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1leGVjdXRpb24tZGV0YWlsc1xuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwibm9kZTpmc1wiO1xuLyoqXG4gKiBDbGF1ZGUgQ29kZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lcy5cbiAqXG4gKiBUaGVzZSBhcmUgdGhlIGVudmlyb25tZW50IHZhcmlhYmxlcyB0aGF0IENsYXVkZSBDb2RlIHNldHMgd2hlbiBydW5uaW5nIGhvb2tzLlxuICovXG5leHBvcnQgY29uc3QgQ0xBVURFX0VOVl9WQVJTID0ge1xuICAgIC8qKlxuICAgICAqIEFic29sdXRlIHBhdGggdG8gdGhlIHByb2plY3Qgcm9vdCBkaXJlY3Rvcnkgd2hlcmUgQ2xhdWRlIENvZGUgd2FzIHN0YXJ0ZWQuXG4gICAgICogQXZhaWxhYmxlIGluIGFsbCBob29rcy5cbiAgICAgKi9cbiAgICBQUk9KRUNUX0RJUjogXCJDTEFVREVfUFJPSkVDVF9ESVJcIixcbiAgICAvKipcbiAgICAgKiBQYXRoIHRvIGEgZmlsZSB3aGVyZSBTZXNzaW9uU3RhcnQgaG9va3MgY2FuIHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICAgICAqIFZhcmlhYmxlcyB3cml0dGVuIHRvIHRoaXMgZmlsZSB3aWxsIGJlIGF2YWlsYWJsZSBpbiBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzLlxuICAgICAqIE9ubHkgYXZhaWxhYmxlIGluIFNlc3Npb25TdGFydCBob29rcy5cbiAgICAgKi9cbiAgICBFTlZfRklMRTogXCJDTEFVREVfRU5WX0ZJTEVcIixcbiAgICAvKipcbiAgICAgKiBTZXQgdG8gXCJ0cnVlXCIgd2hlbiBydW5uaW5nIGluIGEgcmVtb3RlICh3ZWIpIGVudmlyb25tZW50LlxuICAgICAqIE5vdCBzZXQgb3IgZW1wdHkgd2hlbiBydW5uaW5nIGluIGxvY2FsIENMSSBlbnZpcm9ubWVudC5cbiAgICAgKi9cbiAgICBSRU1PVEU6IFwiQ0xBVURFX0NPREVfUkVNT1RFXCIsXG59O1xuLyoqXG4gKiBHZXRzIHRoZSBDbGF1ZGUgQ29kZSBwcm9qZWN0IGRpcmVjdG9yeS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwcm9qZWN0IHJvb3Qgd2hlcmUgQ2xhdWRlIENvZGUgd2FzIHN0YXJ0ZWQuXG4gKiBUaGUgdmFsdWUgY29tZXMgZnJvbSB0aGUgYENMQVVERV9QUk9KRUNUX0RJUmAgZW52aXJvbm1lbnQgdmFyaWFibGUuXG4gKiBAcmV0dXJucyBUaGUgcHJvamVjdCBkaXJlY3RvcnkgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBwcm9qZWN0RGlyID0gZ2V0UHJvamVjdERpcigpO1xuICogaWYgKHByb2plY3REaXIpIHtcbiAqICAgY29uc3QgY29uZmlnUGF0aCA9IGAke3Byb2plY3REaXJ9Ly5jbGF1ZGUvY29uZmlnLmpzb25gO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0RGlyKCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuUFJPSkVDVF9ESVJdO1xufVxuLyoqXG4gKiBHZXRzIHRoZSBDbGF1ZGUgQ29kZSBlbnYgZmlsZSBwYXRoIGZvciBwZXJzaXN0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBUaGlzIGlzIG9ubHkgYXZhaWxhYmxlIGluIFNlc3Npb25TdGFydCBob29rcy4gVGhlIHBhdGggcG9pbnRzIHRvIGEgZmlsZVxuICogd2hlcmUgeW91IGNhbiB3cml0ZSBzaGVsbCBleHBvcnQgc3RhdGVtZW50cyB0byBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogZm9yIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMgaW4gdGhlIHNlc3Npb24uXG4gKiBAcmV0dXJucyBUaGUgZW52IGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXQgKG5vdCBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudkZpbGUgPSBnZXRFbnZGaWxlUGF0aCgpO1xuICogaWYgKGVudkZpbGUpIHtcbiAqICAgLy8gV2UncmUgaW4gYSBTZXNzaW9uU3RhcnQgaG9vayBhbmQgY2FuIHBlcnNpc3QgZW52IHZhcnNcbiAqICAgcGVyc2lzdEVudlZhcignTVlfVkFSJywgJ215LXZhbHVlJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudkZpbGVQYXRoKCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuRU5WX0ZJTEVdO1xufVxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGhvb2sgaXMgcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAqXG4gKiBSZW1vdGUgZW52aXJvbm1lbnRzIG1heSBoYXZlIGRpZmZlcmVudCBjYXBhYmlsaXRpZXMgb3IgcmVzdHJpY3Rpb25zXG4gKiBjb21wYXJlZCB0byBsb2NhbCBDTEkgZW52aXJvbm1lbnRzLlxuICogQHJldHVybnMgdHJ1ZSBpZiBydW5uaW5nIHJlbW90ZWx5LCBmYWxzZSBpZiBydW5uaW5nIGxvY2FsbHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIFVzZSB3ZWItY29tcGF0aWJsZSBhcHByb2FjaGVzXG4gKiB9IGVsc2Uge1xuICogICAvLyBDYW4gdXNlIGxvY2FsIENMSSBmZWF0dXJlc1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1JlbW90ZUVudmlyb25tZW50KCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuUkVNT1RFXSA9PT0gXCJ0cnVlXCI7XG59XG4vKipcbiAqIFBlcnNpc3RzIGFuIGVudmlyb25tZW50IHZhcmlhYmxlIGZvciB1c2UgaW4gc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gd3JpdGVzIGEgc2hlbGwgZXhwb3J0IHN0YXRlbWVudCB0byB0aGUgYENMQVVERV9FTlZfRklMRWAsXG4gKiB3aGljaCBDbGF1ZGUgQ29kZSBzb3VyY2VzIGJlZm9yZSBydW5uaW5nIGJhc2ggY29tbWFuZHMuIFRoaXMgYWxsb3dzXG4gKiBTZXNzaW9uU3RhcnQgaG9va3MgdG8gY29uZmlndXJlIHRoZSBlbnZpcm9ubWVudCBmb3IgdGhlIGVudGlyZSBzZXNzaW9uLlxuICpcbiAqICoqSW1wb3J0YW50Kio6IFRoaXMgZnVuY3Rpb24gb25seSB3b3JrcyBpbiBTZXNzaW9uU3RhcnQgaG9va3Mgd2hlcmVcbiAqIGBDTEFVREVfRU5WX0ZJTEVgIGlzIHNldC4gSW4gb3RoZXIgaG9va3MsIGl0IHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gKiBAcGFyYW0gbmFtZSAtIFRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGUgdmFsdWUgKHdpbGwgYmUgc2hlbGwtZXNjYXBlZClcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0xBVURFX0VOVl9GSUxFIGlzIG5vdCBzZXQgKG5vdCBpbiBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25TdGFydEhvb2ssIHNlc3Npb25TdGFydE91dHB1dCwgcGVyc2lzdEVudlZhciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7fSwgYXN5bmMgKGlucHV0KSA9PiB7XG4gKiAgIC8vIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0aGUgc2Vzc2lvblxuICogICBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdwcm9kdWN0aW9uJyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ0FQSV9LRVknLCBwcm9jZXNzLmVudi5NWV9BUElfS0VZID8/ICdkZWZhdWx0Jyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ1BBVEgnLCBgJHtwcm9jZXNzLmVudi5QQVRIfTouL25vZGVfbW9kdWxlcy8uYmluYCk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcGVyc2lzdGluZy1lbnZpcm9ubWVudC12YXJpYWJsZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcnNpc3RFbnZWYXIobmFtZSwgdmFsdWUpIHtcbiAgICBjb25zdCBlbnZGaWxlID0gZ2V0RW52RmlsZVBhdGgoKTtcbiAgICBpZiAoZW52RmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInBlcnNpc3RFbnZWYXIgY2FuIG9ubHkgYmUgdXNlZCBpbiBTZXNzaW9uU3RhcnQgaG9va3MuIFwiICsgXCJDTEFVREVfRU5WX0ZJTEUgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgbm90IHNldC5cIik7XG4gICAgfVxuICAgIC8vIFNoZWxsLWVzY2FwZSB0aGUgdmFsdWUgdG8gaGFuZGxlIHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgIGNvbnN0IGVzY2FwZWRWYWx1ZSA9IGVzY2FwZVNoZWxsVmFsdWUodmFsdWUpO1xuICAgIC8vIFdyaXRlIHRoZSBleHBvcnQgc3RhdGVtZW50XG4gICAgY29uc3QgZXhwb3J0U3RhdGVtZW50ID0gYGV4cG9ydCAke25hbWV9PSR7ZXNjYXBlZFZhbHVlfVxcbmA7XG4gICAgZnMuYXBwZW5kRmlsZVN5bmMoZW52RmlsZSwgZXhwb3J0U3RhdGVtZW50LCBcInV0Zi04XCIpO1xufVxuLyoqXG4gKiBQZXJzaXN0cyBtdWx0aXBsZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYXQgb25jZS5cbiAqXG4gKiBUaGlzIGlzIGEgY29udmVuaWVuY2Ugd3JhcHBlciBhcm91bmQgYHBlcnNpc3RFbnZWYXJgIGZvciBzZXR0aW5nXG4gKiBtdWx0aXBsZSB2YXJpYWJsZXMgaW4gYSBzaW5nbGUgY2FsbC5cbiAqIEBwYXJhbSB2YXJzIC0gT2JqZWN0IG1hcHBpbmcgdmFyaWFibGUgbmFtZXMgdG8gdmFsdWVzXG4gKiBAdGhyb3dzIEVycm9yIGlmIENMQVVERV9FTlZfRklMRSBpcyBub3Qgc2V0IChub3QgaW4gYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwZXJzaXN0RW52VmFycyh7XG4gKiAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gKiAgIEFQSV9LRVk6ICdzZWNyZXQnLFxuICogICBERUJVRzogJ2ZhbHNlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcnNpc3RFbnZWYXJzKHZhcnMpIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXModmFycykpIHtcbiAgICAgICAgcGVyc2lzdEVudlZhcihuYW1lLCB2YWx1ZSk7XG4gICAgfVxufVxuLyoqXG4gKiBFc2NhcGVzIGEgdmFsdWUgZm9yIHNhZmUgdXNlIGluIGEgc2hlbGwgZXhwb3J0IHN0YXRlbWVudC5cbiAqXG4gKiBVc2VzIHNpbmdsZSBxdW90ZXMgYW5kIGVzY2FwZXMgYW55IGVtYmVkZGVkIHNpbmdsZSBxdW90ZXMuXG4gKiBUaGlzIHByZXZlbnRzIHNoZWxsIGluamVjdGlvbiBhbmQgaGFuZGxlcyBzcGVjaWFsIGNoYXJhY3RlcnMuXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gZXNjYXBlXG4gKiBAcmV0dXJucyBUaGUgc2hlbGwtZXNjYXBlZCB2YWx1ZSAod2l0aCBxdW90ZXMpXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZXNjYXBlU2hlbGxWYWx1ZSh2YWx1ZSkge1xuICAgIC8vIFVzZSBzaW5nbGUgcXVvdGVzIGFuZCBlc2NhcGUgYW55IGVtYmVkZGVkIHNpbmdsZSBxdW90ZXNcbiAgICAvLyAndmFsdWUnIC0+ICd2YWwnXFwnJ3VlJyBmb3IgdmFsdWVzIGNvbnRhaW5pbmcgc2luZ2xlIHF1b3Rlc1xuICAgIGNvbnN0IGVzY2FwZWQgPSB2YWx1ZS5yZXBsYWNlKC8nL2csIFwiJ1xcXFwnJ1wiKTtcbiAgICByZXR1cm4gYCcke2VzY2FwZWR9J2A7XG59XG4iLCAiLyoqXG4gKiBIb29rIGZhY3RvcnkgZnVuY3Rpb25zIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBmYWN0b3J5IGZ1bmN0aW9ucyBmb3IgYWxsIDEyIGhvb2sgdHlwZXMgdGhhdCBoYW5kbGU6XG4gKiAtIElucHV0IHR5cGUgbmFycm93aW5nIGJhc2VkIG9uIGhvb2sgZXZlbnQgdHlwZVxuICogLSBPdXRwdXQgdHlwZSBlbmZvcmNlbWVudCB2aWEgcmV0dXJuIHR5cGVzXG4gKiAtIEVycm9yIHdyYXBwaW5nIHdpdGggYXV0b21hdGljIGxvZ2dpbmdcbiAqIC0gTG9nZ2VyIGNvbnRleHQgaW5qZWN0aW9uXG4gKlxuICogRWFjaCBmYWN0b3J5IGFjY2VwdHMgYSBIb29rQ29uZmlnIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dCBzZXR0aW5ncyxcbiAqIGFuZCByZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB0aGUgcnVudGltZSBpbnZva2VzIHdoZW4gdGhlIGhvb2sgZmlsZSBleGVjdXRlcy5cbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBHZW5lcmljIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIGhvb2sgZmFjdG9yeSBmdW5jdGlvbiBmb3IgYSBzcGVjaWZpYyBob29rIHR5cGUuXG4gKlxuICogVGhpcyBpcyB0aGUgaW50ZXJuYWwgaW1wbGVtZW50YXRpb24gdXNlZCBieSBhbGwgdHlwZWQgZmFjdG9yaWVzLlxuICogSXQgd3JhcHMgdGhlIGhhbmRsZXIgd2l0aCBlcnJvciBjYXRjaGluZyBhbmQgbG9nZ2luZy5cbiAqIEBwYXJhbSBob29rRXZlbnROYW1lIC0gVGhlIGhvb2sgZXZlbnQgbmFtZVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvblxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byB3cmFwXG4gKiBAcmV0dXJucyBBIHdyYXBwZWQgaG9vayBmdW5jdGlvblxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tGdW5jdGlvbihob29rRXZlbnROYW1lLCBjb25maWcsIGhhbmRsZXIpIHtcbiAgICBjb25zdCBob29rRm4gPSBhc3luYyAoaW5wdXQsIGNvbnRleHQpID0+IHtcbiAgICAgICAgLy8gRGVsZWdhdGUgZXJyb3IgaGFuZGxpbmcgdG8gdGhlIHJ1bnRpbWUgLSBqdXN0IGV4ZWN1dGUgdGhlIGhhbmRsZXJcbiAgICAgICAgLy8gVGhlIHJ1bnRpbWUgd2lsbCBjYXRjaCBlcnJvcnMsIGxvZyB0aGVtLCBhbmQgcmV0dXJuIGFwcHJvcHJpYXRlIG91dHB1dFxuICAgICAgICByZXR1cm4gYXdhaXQgaGFuZGxlcihpbnB1dCwgY29udGV4dCk7XG4gICAgfTtcbiAgICAvLyBBdHRhY2ggbWV0YWRhdGEgZm9yIHJ1bnRpbWUgaW5zcGVjdGlvblxuICAgIGhvb2tGbi5ob29rRXZlbnROYW1lID0gaG9va0V2ZW50TmFtZTtcbiAgICBob29rRm4ubWF0Y2hlciA9IGNvbmZpZy5tYXRjaGVyO1xuICAgIGhvb2tGbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gICAgcmV0dXJuIGhvb2tGbjtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZVRvb2xVc2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQcmVUb29sVXNlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0VG9vbFVzZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBvc3RUb29sVXNlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0VG9vbFVzZUZhaWx1cmVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQb3N0VG9vbFVzZUZhaWx1cmVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE5vdGlmaWNhdGlvbiBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIE5vdGlmaWNhdGlvbiBob29rIGhhbmRsZXIuXG4gKlxuICogTm90aWZpY2F0aW9uIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBzZW5kcyBhIG5vdGlmaWNhdGlvbiwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBGb3J3YXJkIG5vdGlmaWNhdGlvbnMgdG8gZXh0ZXJuYWwgc3lzdGVtc1xuICogLSBMb2cgaW1wb3J0YW50IGV2ZW50c1xuICogLSBUcmlnZ2VyIGN1c3RvbSBhbGVydGluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYG5vdGlmaWNhdGlvbl90eXBlYFxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IG5vdGlmaWNhdGlvbkhvb2ssIG5vdGlmaWNhdGlvbk91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gRm9yd2FyZCBub3RpZmljYXRpb25zIHRvIFNsYWNrXG4gKiBleHBvcnQgZGVmYXVsdCBub3RpZmljYXRpb25Ib29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ05vdGlmaWNhdGlvbiByZWNlaXZlZCcsIHtcbiAqICAgICB0eXBlOiBpbnB1dC5ub3RpZmljYXRpb25fdHlwZSxcbiAqICAgICB0aXRsZTogaW5wdXQudGl0bGVcbiAqICAgfSk7XG4gKlxuICogICBhd2FpdCBzZW5kU2xhY2tNZXNzYWdlKGlucHV0LnRpdGxlID8/ICdOb3RpZmljYXRpb24nLCBpbnB1dC5tZXNzYWdlKTtcbiAqXG4gKiAgIHJldHVybiBub3RpZmljYXRpb25PdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNub3RpZmljYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdGlmaWNhdGlvbkhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIk5vdGlmaWNhdGlvblwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVXNlclByb21wdFN1Ym1pdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFVzZXJQcm9tcHRTdWJtaXQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFVzZXJQcm9tcHRTdWJtaXQgaG9va3MgZmlyZSB3aGVuIGEgdXNlciBzdWJtaXRzIGEgcHJvbXB0LCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFkZCBhZGRpdGlvbmFsIGNvbnRleHQgb3IgaW5zdHJ1Y3Rpb25zXG4gKiAtIExvZyB1c2VyIGludGVyYWN0aW9uc1xuICogLSBWYWxpZGF0ZSBvciB0cmFuc2Zvcm0gcHJvbXB0c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgcHJvbXB0IHN1Ym1pc3Npb25zXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdXNlclByb21wdFN1Ym1pdEhvb2ssIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEFkZCBwcm9qZWN0IGNvbnRleHQgdG8gZXZlcnkgcHJvbXB0XG4gKiBleHBvcnQgZGVmYXVsdCB1c2VyUHJvbXB0U3VibWl0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5kZWJ1ZygnVXNlciBwcm9tcHQgc3VibWl0dGVkJywgeyBwcm9tcHRMZW5ndGg6IGlucHV0LnByb21wdC5sZW5ndGggfSk7XG4gKlxuICogICBjb25zdCBwcm9qZWN0Q29udGV4dCA9IGF3YWl0IGdldFByb2plY3RDb250ZXh0KCk7XG4gKlxuICogICByZXR1cm4gdXNlclByb21wdFN1Ym1pdE91dHB1dCh7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IHByb2plY3RDb250ZXh0XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN1c2VycHJvbXB0c3VibWl0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VyUHJvbXB0U3VibWl0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVXNlclByb21wdFN1Ym1pdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2Vzc2lvblN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2Vzc2lvblN0YXJ0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTZXNzaW9uU3RhcnQgaG9va3MgZmlyZSB3aGVuIGEgQ2xhdWRlIENvZGUgc2Vzc2lvbiBzdGFydHMgb3IgcmVzdGFydHMsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEluaXRpYWxpemUgc2Vzc2lvbiBzdGF0ZVxuICogLSBJbmplY3QgY29udGV4dCBvciBpbnN0cnVjdGlvbnNcbiAqIC0gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kc1xuICogLSBTZXQgdXAgbG9nZ2luZyBvciBtb25pdG9yaW5nXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgc291cmNlYCAoJ3N0YXJ0dXAnLCAncmVzdW1lJywgJ2NsZWFyJywgJ2NvbXBhY3QnKVxuICpcbiAqICoqQ29udGV4dCoqOiBTZXNzaW9uU3RhcnQgaG9va3MgcmVjZWl2ZSBhbiBleHRlbmRlZCBjb250ZXh0IHdpdGggYHBlcnNpc3RFbnZWYXJgXG4gKiBhbmQgYHBlcnNpc3RFbnZWYXJzYCBmdW5jdGlvbnMgZm9yIHNldHRpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25TdGFydEhvb2ssIHNlc3Npb25TdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHRoZSBzZXNzaW9uXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHsgbWF0Y2hlcjogJ3N0YXJ0dXAnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTmV3IHNlc3Npb24gc3RhcnRlZCcsIHtcbiAqICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gKiAgICAgY3dkOiBpbnB1dC5jd2RcbiAqICAgfSk7XG4gKlxuICogICAvLyBTZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ2RldmVsb3BtZW50Jyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ0RFQlVHJywgJ3RydWUnKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBTZXQgbXVsdGlwbGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIGF0IG9uY2VcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBwZXJzaXN0RW52VmFycyB9KSA9PiB7XG4gKiAgIHBlcnNpc3RFbnZWYXJzKHtcbiAqICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICogICAgIEFQSV9LRVk6ICdzZWNyZXQnLFxuICogICAgIERFQlVHOiAnZmFsc2UnXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Nlc3Npb25zdGFydFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvblN0YXJ0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2Vzc2lvblN0YXJ0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXNzaW9uRW5kIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2Vzc2lvbkVuZCBob29rIGhhbmRsZXIuXG4gKlxuICogU2Vzc2lvbkVuZCBob29rcyBmaXJlIHdoZW4gYSBDbGF1ZGUgQ29kZSBzZXNzaW9uIGVuZHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ2xlYW4gdXAgc2Vzc2lvbiByZXNvdXJjZXNcbiAqIC0gTG9nIHNlc3Npb24gbWV0cmljc1xuICogLSBQZXJzaXN0IHNlc3Npb24gc3RhdGVcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGByZWFzb25gICh0aGUgZXhpdCByZWFzb24gc3RyaW5nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25FbmRIb29rLCBzZXNzaW9uRW5kT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgc2Vzc2lvbiBlbmQgYW5kIGNsZWFuIHVwXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uRW5kSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTZXNzaW9uIGVuZGVkJywge1xuICogICAgIHNlc3Npb25JZDogaW5wdXQuc2Vzc2lvbl9pZCxcbiAqICAgICByZWFzb246IGlucHV0LnJlYXNvblxuICogICB9KTtcbiAqXG4gKiAgIGF3YWl0IGNsZWFudXBTZXNzaW9uUmVzb3VyY2VzKGlucHV0LnNlc3Npb25faWQpO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25FbmRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXNzaW9uZW5kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXNzaW9uRW5kSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2Vzc2lvbkVuZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RvcCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN0b3AgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN0b3AgaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIGlzIGFib3V0IHRvIHN0b3AsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQmxvY2sgdGhlIHN0b3AgYW5kIHJlcXVpcmUgYWRkaXRpb25hbCBhY3Rpb25cbiAqIC0gQ29uZmlybSB0aGUgdXNlciB3YW50cyB0byBzdG9wXG4gKiAtIENsZWFuIHVwIHJlc291cmNlcyBiZWZvcmUgc3RvcHBpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHN0b3AgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3RvcEhvb2ssIHN0b3BPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEJsb2NrIHN0b3AgaWYgdGhlcmUgYXJlIHBlbmRpbmcgY2hhbmdlc1xuICogZXhwb3J0IGRlZmF1bHQgc3RvcEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBjb25zdCBwZW5kaW5nQ2hhbmdlcyA9IGF3YWl0IGNoZWNrUGVuZGluZ0NoYW5nZXMoKTtcbiAqXG4gKiAgIGlmIChwZW5kaW5nQ2hhbmdlcy5sZW5ndGggPiAwKSB7XG4gKiAgICAgbG9nZ2VyLndhcm4oJ0Jsb2NraW5nIHN0b3AgZHVlIHRvIHBlbmRpbmcgY2hhbmdlcycsIHtcbiAqICAgICAgIGNvdW50OiBwZW5kaW5nQ2hhbmdlcy5sZW5ndGhcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICogICAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgICByZWFzb246IGBUaGVyZSBhcmUgJHtwZW5kaW5nQ2hhbmdlcy5sZW5ndGh9IHVuY29tbWl0dGVkIGNoYW5nZXNgLFxuICogICAgICAgc3lzdGVtTWVzc2FnZTogJ1BsZWFzZSBjb21taXQgb3IgZGlzY2FyZCBjaGFuZ2VzIGJlZm9yZSBzdG9wcGluZydcbiAqICAgICB9KTtcbiAqICAgfVxuICpcbiAqICAgbG9nZ2VyLmluZm8oJ0FwcHJvdmluZyBzdG9wJyk7XG4gKiAgIHJldHVybiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN0b3BcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN1YmFnZW50U3RhcnQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdWJhZ2VudFN0YXJ0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdWJhZ2VudFN0YXJ0IGhvb2tzIGZpcmUgd2hlbiBhIHN1YmFnZW50IChUYXNrIHRvb2wpIHN0YXJ0cywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBJbmplY3QgY29udGV4dCBmb3IgdGhlIHN1YmFnZW50XG4gKiAtIExvZyBzdWJhZ2VudCBpbnZvY2F0aW9uc1xuICogLSBDb25maWd1cmUgc3ViYWdlbnQgYmVoYXZpb3JcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBhZ2VudF90eXBlYCAoZS5nLiwgJ2V4cGxvcmUnLCAnY29kZWJhc2UtYW5hbHlzaXMnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN1YmFnZW50U3RhcnRIb29rLCBzdWJhZ2VudFN0YXJ0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBBZGQgY29udGV4dCBmb3IgZXhwbG9yZSBzdWJhZ2VudHNcbiAqIGV4cG9ydCBkZWZhdWx0IHN1YmFnZW50U3RhcnRIb29rKHsgbWF0Y2hlcjogJ2V4cGxvcmUnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnRXhwbG9yZSBzdWJhZ2VudCBzdGFydGluZycsIHtcbiAqICAgICBhZ2VudElkOiBpbnB1dC5hZ2VudF9pZCxcbiAqICAgICBhZ2VudFR5cGU6IGlucHV0LmFnZW50X3R5cGVcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gc3ViYWdlbnRTdGFydE91dHB1dCh7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGb2N1cyBvbiBmaW5kaW5nIHBhdHRlcm5zIGFuZCBjb252ZW50aW9ucydcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N1YmFnZW50c3RhcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN1YmFnZW50U3RhcnRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdWJhZ2VudFN0YXJ0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdWJhZ2VudFN0b3AgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdWJhZ2VudFN0b3AgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN1YmFnZW50U3RvcCBob29rcyBmaXJlIHdoZW4gYSBzdWJhZ2VudCBjb21wbGV0ZXMgb3Igc3RvcHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQmxvY2sgdGhlIHN1YmFnZW50IGZyb20gc3RvcHBpbmdcbiAqIC0gUHJvY2VzcyBzdWJhZ2VudCByZXN1bHRzXG4gKiAtIENsZWFuIHVwIHN1YmFnZW50IHJlc291cmNlc1xuICogLSBMb2cgc3ViYWdlbnQgY29tcGxldGlvblxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYGFnZW50X3R5cGVgIChlLmcuLCAnZXhwbG9yZScsICdjb2RlYmFzZS1hbmFseXNpcycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3ViYWdlbnRTdG9wSG9vaywgc3ViYWdlbnRTdG9wT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBCbG9jayBleHBsb3JlIHN1YmFnZW50cyBpZiB0YXNrIGluY29tcGxldGVcbiAqIGV4cG9ydCBkZWZhdWx0IHN1YmFnZW50U3RvcEhvb2soeyBtYXRjaGVyOiAnZXhwbG9yZScgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTdWJhZ2VudCBzdG9wcGluZycsIHtcbiAqICAgICBhZ2VudElkOiBpbnB1dC5hZ2VudF9pZCxcbiAqICAgICBhZ2VudFR5cGU6IGlucHV0LmFnZW50X3R5cGVcbiAqICAgfSk7XG4gKlxuICogICAvLyBCbG9jayBpZiB0cmFuc2NyaXB0IHNob3dzIGluY29tcGxldGUgd29ya1xuICogICByZXR1cm4gc3ViYWdlbnRTdG9wT3V0cHV0KHtcbiAqICAgICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgICByZWFzb246ICdQbGVhc2UgdmVyaWZ5IGV4cGxvcmF0aW9uIGlzIGNvbXBsZXRlJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3ViYWdlbnRzdG9wXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdWJhZ2VudFN0b3BIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdWJhZ2VudFN0b3BcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFByZUNvbXBhY3QgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBQcmVDb21wYWN0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBQcmVDb21wYWN0IGhvb2tzIGZpcmUgYmVmb3JlIGNvbnRleHQgY29tcGFjdGlvbiBvY2N1cnMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gUHJlc2VydmUgaW1wb3J0YW50IGluZm9ybWF0aW9uIGJlZm9yZSBjb21wYWN0aW9uXG4gKiAtIExvZyBjb21wYWN0aW9uIGV2ZW50c1xuICogLSBNb2RpZnkgY3VzdG9tIGluc3RydWN0aW9ucyBmb3IgdGhlIGNvbXBhY3RlZCBjb250ZXh0XG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdtYW51YWwnLCAnYXV0bycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcHJlQ29tcGFjdEhvb2ssIHByZUNvbXBhY3RPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyBjb21wYWN0aW9uIGV2ZW50cyBhbmQgcHJlc2VydmUgY29udGV4dFxuICogZXhwb3J0IGRlZmF1bHQgcHJlQ29tcGFjdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnQ29udGV4dCBjb21wYWN0aW9uIHRyaWdnZXJlZCcsIHtcbiAqICAgICB0cmlnZ2VyOiBpbnB1dC50cmlnZ2VyLFxuICogICAgIGhhc0N1c3RvbUluc3RydWN0aW9uczogaW5wdXQuY3VzdG9tX2luc3RydWN0aW9ucyAhPT0gbnVsbFxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBwcmVDb21wYWN0T3V0cHV0KHtcbiAqICAgICBzeXN0ZW1NZXNzYWdlOiAnUmVtZW1iZXI6IHN0cmljdCBtb2RlIGlzIGVuYWJsZWQnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBPbmx5IGhhbmRsZSBtYW51YWwgY29tcGFjdGlvblxuICogZXhwb3J0IGRlZmF1bHQgcHJlQ29tcGFjdEhvb2soeyBtYXRjaGVyOiAnbWFudWFsJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ01hbnVhbCBjb21wYWN0aW9uIHJlcXVlc3RlZCcpO1xuICogICByZXR1cm4gcHJlQ29tcGFjdE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3ByZWNvbXBhY3RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZUNvbXBhY3RIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQcmVDb21wYWN0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJtaXNzaW9uUmVxdWVzdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBlcm1pc3Npb25SZXF1ZXN0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4iLCAiLyoqXG4gKiBMb2dnZXIgc3lzdGVtIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyBzdHJ1Y3R1cmVkIGxvZ2dpbmcgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIG9wdGlvbmFsIGZpbGUgb3V0cHV0LlxuICogVGhlIGxvZ2dlciBpcyAqKnNpbGVudCBieSBkZWZhdWx0KiogdG8gYXZvaWQgaW50ZXJmZXJpbmcgd2l0aCBob29rIHByb3RvY29sXG4gKiAoc3Rkb3V0IGlzIHJlc2VydmVkIGZvciBKU09OIHJlc3BvbnNlcywgc3RkZXJyIG1heSBjb25mbGljdCB3aXRoIENsYXVkZSBDb2RlKS5cbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBsb2cgZXZlbnRzXG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAqICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gJHtldmVudC5ob29rVHlwZX06ICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAqIH0pO1xuICpcbiAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICogdW5zdWJzY3JpYmUoKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmltcG9ydCB7IGNsb3NlU3luYywgZXhpc3RzU3luYywgbWtkaXJTeW5jLCBvcGVuU3luYywgd3JpdGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG4vKipcbiAqIEFsbCBsb2cgbGV2ZWxzIGluIG9yZGVyIG9mIHNldmVyaXR5IChsb3dlc3QgdG8gaGlnaGVzdCkuXG4gKi9cbmV4cG9ydCBjb25zdCBMT0dfTEVWRUxTID0gW1wiZGVidWdcIiwgXCJpbmZvXCIsIFwid2FyblwiLCBcImVycm9yXCJdO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIENsYXNzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIExvZ2dlciBmb3IgQ2xhdWRlIENvZGUgaG9va3Mgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIGZpbGUgb3V0cHV0LlxuICpcbiAqICMjIEtleSBCZWhhdmlvcnNcbiAqXG4gKiB8IENvbmZpZ3VyYXRpb24gfCBCZWhhdmlvciB8XG4gKiB8LS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLXxcbiAqIHwgTm8gY29uZmlnIChkZWZhdWx0KSB8ICoqU2lsZW50KiogLSBubyBvdXRwdXQgYW55d2hlcmUgfFxuICogfCBgQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVgIGVudiB2YXIgfCBBcHBlbmQgSlNPTiBsaW5lcyB0byBmaWxlIHxcbiAqIHwgYC5vbihsZXZlbCwgaGFuZGxlcilgIHJlZ2lzdGVyZWQgfCBFdmVudHMgZGVsaXZlcmVkIHRvIGhhbmRsZXJzIG9ubHkgfFxuICogfCBNdWx0aXBsZSBkZXN0aW5hdGlvbnMgfCBBbGwgZGVzdGluYXRpb25zIHJlY2VpdmUgZXZlbnRzIHxcbiAqXG4gKiAjIyBJbXBvcnRhbnQgTm90ZXNcbiAqXG4gKiAtICoqTmV2ZXIgb3V0cHV0cyB0byBzdGRvdXQqKiAocmVzZXJ2ZWQgZm9yIEpTT04gaG9vayByZXNwb25zZSlcbiAqIC0gKipOZXZlciBvdXRwdXRzIHRvIHN0ZGVycioqIChtYXkgaW50ZXJmZXJlIHdpdGggQ2xhdWRlIENvZGUgZXJyb3IgaGFuZGxpbmcpXG4gKiAtIEZpbGUgb3V0cHV0IHVzZXMgSlNPTiBMaW5lcyBmb3JtYXQgZm9yIGVhc3kgcGFyc2luZ1xuICogLSBgLm9uKGxldmVsLCBoYW5kbGVyKWAgcmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvblxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGV2ZW50cyBhdCBzcGVjaWZpYyBsZXZlbFxuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiB7XG4gKiAgIHNlbmRBbGVydChldmVudC5tZXNzYWdlKTtcbiAqIH0pO1xuICpcbiAqIC8vIExvZyB3aXRoaW4gYSBob29rIGhhbmRsZXJcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIud2FybignQWJvdXQgdG8gdmFsaWRhdGUgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmVkIGV2ZW50IGhhbmRsZXJzIGJ5IGxvZyBsZXZlbC5cbiAgICAgKi9cbiAgICBoYW5kbGVycyA9IG5ldyBNYXAoKTtcbiAgICAvKipcbiAgICAgKiBGaWxlIGRlc2NyaXB0b3IgZm9yIGxvZyBmaWxlIG91dHB1dC5cbiAgICAgKiBMYXppbHkgaW5pdGlhbGl6ZWQgb24gZmlyc3Qgd3JpdGUuXG4gICAgICovXG4gICAgbG9nRmlsZUZkID0gbnVsbDtcbiAgICAvKipcbiAgICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgaWYgY29uZmlndXJlZC5cbiAgICAgKi9cbiAgICBsb2dGaWxlUGF0aCA9IG51bGw7XG4gICAgLyoqXG4gICAgICogV2hldGhlciBmaWxlIGluaXRpYWxpemF0aW9uIGhhcyBiZWVuIGF0dGVtcHRlZC5cbiAgICAgKi9cbiAgICBmaWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAgICovXG4gICAgY3VycmVudEhvb2tUeXBlO1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgaG9vayBpbnB1dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAgICovXG4gICAgY3VycmVudElucHV0O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgTG9nZ2VyIGluc3RhbmNlLlxuICAgICAqXG4gICAgICogVHlwaWNhbGx5IHlvdSBzaG91bGQgdXNlIHRoZSBleHBvcnRlZCBgbG9nZ2VyYCBzaW5nbGV0b24gcmF0aGVyIHRoYW5cbiAgICAgKiBjcmVhdGluZyBuZXcgaW5zdGFuY2VzLlxuICAgICAqIEBwYXJhbSBjb25maWcgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gVXNlIHNpbmdsZXRvbiAocmVjb21tZW5kZWQpXG4gICAgICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAgICAgKlxuICAgICAqIC8vIE9yIGNyZWF0ZSBjdXN0b20gaW5zdGFuY2VcbiAgICAgKiBjb25zdCBjdXN0b21Mb2dnZXIgPSBuZXcgTG9nZ2VyKHsgbG9nRmlsZVBhdGg6ICcvdmFyL2xvZy9ob29rcy5sb2cnIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbmZpZyA9IHt9KSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnMgbWFwIGZvciBlYWNoIGxldmVsXG4gICAgICAgIGZvciAoY29uc3QgbGV2ZWwgb2YgTE9HX0xFVkVMUykge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVycy5zZXQobGV2ZWwsIG5ldyBTZXQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IGxvZyBmaWxlIHBhdGggZnJvbSBjb25maWcgb3IgZW52aXJvbm1lbnRcbiAgICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGNvbmZpZy5sb2dGaWxlUGF0aCA/PyBwcm9jZXNzLmVudi5DTEFVREVfQ09ERV9IT09LU19MT0dfRklMRSA/PyBudWxsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRoYXQgaXMgdHlwaWNhbGx5IG9ubHkgdXNlZnVsXG4gICAgICogZHVyaW5nIGRldmVsb3BtZW50IG9yIHRyb3VibGVzaG9vdGluZy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBkZWJ1ZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgaW5wdXRTaXplOiAyNTYgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZGVidWcobWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJkZWJ1Z1wiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIGxpa2UgaG9vayBpbnZvY2F0aW9ucywgc3VjY2Vzc2Z1bFxuICAgICAqIGNvbXBsZXRpb25zLCBvciBzdGF0ZSBjaGFuZ2VzLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGluZm8gbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmluZm8oJ1Nlc3Npb24gc3RhcnRlZCcsIHsgc291cmNlOiAnc3RhcnR1cCcsIHNlc3Npb25JZDogJ2FiYzEyMycgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgaW5mbyhtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImluZm9cIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgaXNzdWVzIGJ1dCBkb24ndCBwcmV2ZW50XG4gICAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgd2FybmluZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIud2FybignRGVwcmVjYXRlZCBob29rIHBhdHRlcm4gZGV0ZWN0ZWQnLCB7IHBhdHRlcm46ICdsZWdhY3lNYXRjaGVyJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICB3YXJuKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwid2FyblwiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBlcnJvciBjb25kaXRpb25zIHRoYXQgcmVxdWlyZSBhdHRlbnRpb24gYnV0IHdlcmUgaGFuZGxlZFxuICAgICAqIGdyYWNlZnVsbHkuIEZvciBleGNlcHRpb25zLCBwcmVmZXIge0BsaW5rIGxvZ0Vycm9yfS5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBlcnJvciBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byB2YWxpZGF0ZSB0b29sIGlucHV0JywgeyB0b29sTmFtZTogJ0Jhc2gnLCByZWFzb246ICdlbXB0eSBjb21tYW5kJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBlcnJvcihtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImVycm9yXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICAgKlxuICAgICAqIFVzZSB0aGlzIG1ldGhvZCB3aGVuIGxvZ2dpbmcgY2F1Z2h0IGV4Y2VwdGlvbnMgdG8gY2FwdHVyZSB0aGUgZnVsbFxuICAgICAqIGVycm9yIGNvbnRleHQgaW5jbHVkaW5nIG5hbWUsIG1lc3NhZ2UsIHN0YWNrIHRyYWNlLCBhbmQgY2F1c2UgY2hhaW4uXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHRyeSB7XG4gICAgICogICBhd2FpdCBkYW5nZXJvdXNPcGVyYXRpb24oKTtcbiAgICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICAgKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdGYWlsZWQgdG8gZXhlY3V0ZSBkYW5nZXJvdXMgb3BlcmF0aW9uJywge1xuICAgICAqICAgICBvcGVyYXRpb246ICdkZWxldGUnLFxuICAgICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgICAqICAgfSk7XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGxvZ0Vycm9yKGVycm9yLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGVycm9ySW5mbyA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvcik7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbDogXCJlcnJvclwiLFxuICAgICAgICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgICAgICAgIGVycm9yOiBlcnJvckluZm8sXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZXMgYSBoYW5kbGVyIHRvIGxvZyBldmVudHMgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKlxuICAgICAqIFRoZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBsb2cgZXZlbnQgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBoYW5kbGVyXG4gICAgICogaXMgbm8gbG9uZ2VyIG5lZWRlZC5cbiAgICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgbG9nIGxldmVsIHRvIHN1YnNjcmliZSB0b1xuICAgICAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBldmVudFxuICAgICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgdGhlIGhhbmRsZXJcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBTdWJzY3JpYmUgdG8gZXJyb3IgZXZlbnRzXG4gICAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gICAgICogICBjb25zb2xlLmVycm9yKGBbJHtldmVudC5ob29rVHlwZX1dICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAgICAgKiAgIGlmIChldmVudC5lcnJvcikge1xuICAgICAqICAgICBjb25zb2xlLmVycm9yKGV2ZW50LmVycm9yLnN0YWNrKTtcbiAgICAgKiAgIH1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICAgICAqIHVuc3Vic2NyaWJlKCk7XG4gICAgICogYGBgXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIGxpYnJhcnlcbiAgICAgKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAgICAgKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubygpO1xuICAgICAqXG4gICAgICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBvbihsZXZlbCwgaGFuZGxlcikge1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQobGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgbGV2ZWxIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGxldmVsSGFuZGxlcnM/LmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqXG4gICAgICogVGhpcyBpcyBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBiZWZvcmUgaW52b2tpbmcgaG9vayBoYW5kbGVycy5cbiAgICAgKiBZb3UgdHlwaWNhbGx5IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIGRpcmVjdGx5LlxuICAgICAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSB0eXBlIG9mIGhvb2sgYmVpbmcgZXhlY3V0ZWRcbiAgICAgKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCBkYXRhXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgc2V0Q29udGV4dChob29rVHlwZSwgaW5wdXQpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSBob29rVHlwZTtcbiAgICAgICAgdGhpcy5jdXJyZW50SW5wdXQgPSBpbnB1dDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dC5cbiAgICAgKlxuICAgICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBjbGVhckNvbnRleHQoKSB7XG4gICAgICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29uZmlndXJlcyB0aGUgbG9nIGZpbGUgcGF0aCBhdCBydW50aW1lLlxuICAgICAqXG4gICAgICogQ2FsbCB0aGlzIHRvIGVuYWJsZSBvciBjaGFuZ2UgZmlsZSBsb2dnaW5nLiBTZXR0aW5nIHRvIGBudWxsYCBkaXNhYmxlc1xuICAgICAqIGZpbGUgbG9nZ2luZyAoYnV0IGRvZXNuJ3QgY2xvc2UgZXhpc3RpbmcgZmlsZSBoYW5kbGUgaW1tZWRpYXRlbHkpLlxuICAgICAqIEBwYXJhbSBmaWxlUGF0aCAtIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBvciBudWxsIHRvIGRpc2FibGVcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBFbmFibGUgZmlsZSBsb2dnaW5nIGF0IHJ1bnRpbWVcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZSgnL3Zhci9sb2cvY2xhdWRlLWhvb2tzLmxvZycpO1xuICAgICAqXG4gICAgICogLy8gRGlzYWJsZSBmaWxlIGxvZ2dpbmdcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZShudWxsKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBzZXRMb2dGaWxlKGZpbGVQYXRoKSB7XG4gICAgICAgIC8vIENsb3NlIGV4aXN0aW5nIGZpbGUgaWYgb3BlblxuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZXMgYWxsIHJlc291cmNlcyBoZWxkIGJ5IHRoZSBsb2dnZXIuXG4gICAgICpcbiAgICAgKiBDYWxsIHRoaXMgZHVyaW5nIGdyYWNlZnVsIHNodXRkb3duIHRvIGVuc3VyZSBhbGwgbG9nIGRhdGEgaXMgZmx1c2hlZC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgICAqICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgICogfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlcmUgYXJlIGFueSBhY3RpdmUgaGFuZGxlcnMgb3IgZGVzdGluYXRpb25zLlxuICAgICAqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIGFueSBoYW5kbGVycyBhcmUgcmVnaXN0ZXJlZCBvciBmaWxlIGxvZ2dpbmcgaXMgZW5hYmxlZC5cbiAgICAgKiBAcmV0dXJucyBXaGV0aGVyIHRoZSBsb2dnZXIgaGFzIGFueSBhY3RpdmUgb3V0cHV0IGRlc3RpbmF0aW9uc1xuICAgICAqL1xuICAgIGhhc0Rlc3RpbmF0aW9ucygpIHtcbiAgICAgICAgZm9yIChjb25zdCBoYW5kbGVycyBvZiB0aGlzLmhhbmRsZXJzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoaGFuZGxlcnMuc2l6ZSA+IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMubG9nRmlsZVBhdGggIT09IG51bGw7XG4gICAgfVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBQcml2YXRlIE1ldGhvZHNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLyoqXG4gICAgICogRW1pdHMgYSBsb2cgZXZlbnQuXG4gICAgICogQHBhcmFtIGxldmVsIC0gVGhlIHNldmVyaXR5IGxldmVsIG9mIHRoZSBldmVudFxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGxvZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHQgZGF0YVxuICAgICAqL1xuICAgIGVtaXQobGV2ZWwsIG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGxldmVsLFxuICAgICAgICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgICAgICAgIGNvbnRleHQsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRGVsaXZlcnMgYW4gZXZlbnQgdG8gYWxsIHJlZ2lzdGVyZWQgZGVzdGluYXRpb25zLlxuICAgICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gZGVsaXZlclxuICAgICAqL1xuICAgIGRlbGl2ZXJFdmVudChldmVudCkge1xuICAgICAgICAvLyBEZWxpdmVyIHRvIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChldmVudC5sZXZlbCk7XG4gICAgICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgbGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXIoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBoYW5kbGVyIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBXcml0ZSB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICAgICAgdGhpcy53cml0ZVRvRmlsZShldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdyaXRlcyBhbiBldmVudCB0byB0aGUgbG9nIGZpbGUuXG4gICAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byB3cml0ZVxuICAgICAqL1xuICAgIHdyaXRlVG9GaWxlKGV2ZW50KSB7XG4gICAgICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gTGF6eSBpbml0aWFsaXphdGlvbiBvZiBmaWxlIGhhbmRsZVxuICAgICAgICBpZiAoIXRoaXMuZmlsZUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGaWxlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkID09PSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbGluZSA9IGAke0pTT04uc3RyaW5naWZ5KGV2ZW50KX1cXG5gO1xuICAgICAgICAgICAgd3JpdGVTeW5jKHRoaXMubG9nRmlsZUZkLCBsaW5lKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSB3cml0ZSBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgICAgICAgIC8vIFRoaXMgZm9sbG93cyB0aGUgcmlzayBtaXRpZ2F0aW9uOiBcIkdyYWNlZnVsIGRlZ3JhZGF0aW9uIC0gbG9nIHdyaXRlXG4gICAgICAgICAgICAvLyBmYWlsdXJlcyBhcmUgc2lsZW50bHkgaWdub3JlZCB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblwiXG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGxvZyBmaWxlIGZvciB3cml0aW5nLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWxlKCkge1xuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEVuc3VyZSBkaXJlY3RvcnkgZXhpc3RzXG4gICAgICAgICAgICBjb25zdCBkaXIgPSBkaXJuYW1lKHRoaXMubG9nRmlsZVBhdGgpO1xuICAgICAgICAgICAgaWYgKCFleGlzdHNTeW5jKGRpcikpIHtcbiAgICAgICAgICAgICAgICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE9wZW4gZmlsZSBmb3IgYXBwZW5kaW5nXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG9wZW5TeW5jKHRoaXMubG9nRmlsZVBhdGgsIFwiYVwiKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSBpbml0aWFsaXphdGlvbiBlcnJvcnNcbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyBzdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uIGZyb20gYW4gdW5rbm93biBlcnJvci5cbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tXG4gICAgICogQHJldHVybnMgU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGV4dHJhY3RFcnJvckluZm8oZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogZXJyb3IubmFtZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgICAgIHN0YWNrOiBlcnJvci5zdGFjayxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBFeHRyYWN0IGNhdXNlIGNoYWluIGlmIHByZXNlbnRcbiAgICAgICAgICAgIGlmIChlcnJvci5jYXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgaW5mby5jYXVzZSA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvci5jYXVzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaW5mbztcbiAgICAgICAgfVxuICAgICAgICAvLyBIYW5kbGUgbm9uLUVycm9yIHZhbHVlc1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogXCJVbmtub3duRXJyb3JcIixcbiAgICAgICAgICAgIG1lc3NhZ2U6IFN0cmluZyhlcnJvciksXG4gICAgICAgIH07XG4gICAgfVxufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2luZ2xldG9uIEV4cG9ydFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBHbG9iYWwgbG9nZ2VyIGluc3RhbmNlIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBVc2UgdGhpcyBzaW5nbGV0b24gZm9yIGFsbCBsb2dnaW5nIHdpdGhpbiBob29rcy4gVGhlIGxvZ2dlciBpcyBjb25maWd1cmVkXG4gKiB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCBzdXBwb3J0cyBldmVudCBzdWJzY3JpcHRpb24gZm9yIGN1c3RvbVxuICogZGVzdGluYXRpb25zLlxuICpcbiAqICMjIENvbmZpZ3VyYXRpb25cbiAqXG4gKiB8IEVudmlyb25tZW50IFZhcmlhYmxlIHwgRGVzY3JpcHRpb24gfFxuICogfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfFxuICogfCBgQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVgIHwgUGF0aCB0byBsb2cgZmlsZSAoSlNPTiBMaW5lcyBmb3JtYXQpIHxcbiAqXG4gKiAjIyBVc2FnZSBpbiBIb29rc1xuICpcbiAqIFRoZSBsb2dnZXIgaXMgcGFzc2VkIHRvIGhvb2sgaGFuZGxlcnMgdmlhIGNvbnRleHQgZm9yIGNvbnZlbmllbmNlOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIud2FybignVmFsaWRhdGluZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogIyMgRXh0ZXJuYWwgSW50ZWdyYXRpb25cbiAqXG4gKiBTdWJzY3JpYmUgdG8gZXZlbnRzIHRvIGZvcndhcmQgbG9ncyB0byBleHRlcm5hbCBzeXN0ZW1zOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAqXG4gKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubyh7IGxldmVsOiAnZGVidWcnIH0pO1xuICpcbiAqIGxvZ2dlci5vbignZGVidWcnLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZGVidWcoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRGlyZWN0IHVzYWdlXG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGxvZ2dlci5pbmZvKCdTdGFydGluZyBvcGVyYXRpb24nKTtcbiAqIGxvZ2dlci53YXJuKCdSZXNvdXJjZSBsaW1pdCBhcHByb2FjaGluZycsIHsgdXNhZ2U6IDAuOSB9KTtcbiAqXG4gKiB0cnkge1xuICogICBhd2FpdCByaXNreU9wZXJhdGlvbigpO1xuICogfSBjYXRjaCAoZXJyKSB7XG4gKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdSaXNreSBvcGVyYXRpb24gZmFpbGVkJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcbiIsICIvKipcbiAqIE91dHB1dCB0eXBlcyBhbmQgYnVpbGRlcnMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGUtc2FmZSBvdXRwdXQgYnVpbGRlciBmdW5jdGlvbnMgZm9yIGFsbCAxMiBob29rIHR5cGVzLiBFYWNoIGJ1aWxkZXJcbiAqIGFjY2VwdHMgb3B0aW9ucyB0aGF0IG1hdGNoIHRoZSB3aXJlIGZvcm1hdCBleHBlY3RlZCBieSBDbGF1ZGUgQ29kZSwgd2l0aCB0eXBlc1xuICogZGVyaXZlZCBmcm9tIHRoZSBDbGF1ZGUgQWdlbnQgU0RLJ3MgYFN5bmNIb29rSlNPTk91dHB1dGAgdHlwZS5cbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICogQG1vZHVsZVxuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGl0IENvZGUgQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEV4aXQgY29kZXMgdXNlZCBieSBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiB8IEV4aXQgQ29kZSB8IE5hbWUgfCBXaGVuIFVzZWQgfCBDbGF1ZGUgQ29kZSBCZWhhdmlvciB8XG4gKiB8LS0tLS0tLS0tLS18LS0tLS0tfC0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXxcbiAqIHwgMCB8IFN1Y2Nlc3MgfCBIYW5kbGVyIHJldHVybnMgbm9ybWFsbHkgfCBDb250aW51ZSwgcGFyc2Ugc3Rkb3V0IGFzIEpTT04gfFxuICogfCAxIHwgRXJyb3IgfCBJbnZhbGlkIGlucHV0LCBub24tYmxvY2tpbmcgZXJyb3IgfCBOb24tYmxvY2tpbmcsIHN0ZGVyciB0byB1c2VyIG9ubHkgfFxuICogfCAyIHwgQmxvY2sgfCBIYW5kbGVyIHRocm93cyBPUiBgc3RvcFJlYXNvbmAgc2V0IHwgQmxvY2tpbmcsIHN0ZGVyciBzaG93biB0byBDbGF1ZGUgfFxuICovXG5leHBvcnQgY29uc3QgRVhJVF9DT0RFUyA9IHtcbiAgICAvKiogSGFuZGxlciBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LiBDbGF1ZGUgQ29kZSBwYXJzZXMgc3Rkb3V0IGFzIEpTT04uICovXG4gICAgU1VDQ0VTUzogMCxcbiAgICAvKiogTm9uLWJsb2NraW5nIGVycm9yIG9jY3VycmVkIChlLmcuLCBpbnZhbGlkIGlucHV0KS4gc3RkZXJyIHNob3duIHRvIHVzZXIgb25seS4gKi9cbiAgICBFUlJPUjogMSxcbiAgICAvKiogSGFuZGxlciB0aHJldyBleGNlcHRpb24gT1IgYmxvY2tpbmcgYWN0aW9uIHJlcXVlc3RlZC4gc3RkZXJyIHNob3duIHRvIENsYXVkZS4gKi9cbiAgICBCTE9DSzogMixcbn07XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBPdXRwdXQgQnVpbGRlciBGYWN0b3JpZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCBoYXZlIGhvb2tTcGVjaWZpY091dHB1dCB3aXRoIGEgaG9va0V2ZW50TmFtZSBkaXNjcmltaW5hdG9yLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+IHtcbiAgICAgICAgY29uc3QgeyBob29rU3BlY2lmaWNPdXRwdXQsIC4uLnJlc3QgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHN0ZG91dCA9IGhvb2tTcGVjaWZpY091dHB1dCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IHsgLi4ucmVzdCwgaG9va1NwZWNpZmljT3V0cHV0OiB7IGhvb2tFdmVudE5hbWU6IGhvb2tUeXBlLCAuLi5ob29rU3BlY2lmaWNPdXRwdXQgfSB9XG4gICAgICAgICAgICA6IHJlc3Q7XG4gICAgICAgIHJldHVybiB7IF90eXBlOiBob29rVHlwZSwgc3Rkb3V0IH07XG4gICAgfTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCBvbmx5IHVzZSBDb21tb25PcHRpb25zIChzaW1wbGUgcGFzc3Rocm91Z2gpLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiBvcHRpb25zLFxuICAgIH0pO1xufVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IHVzZSBkZWNpc2lvbi1iYXNlZCBvcHRpb25zIChTdG9wLCBTdWJhZ2VudFN0b3ApLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4gKHtcbiAgICAgICAgX3R5cGU6IGhvb2tUeXBlLFxuICAgICAgICBzdGRvdXQ6IG9wdGlvbnMsXG4gICAgfSk7XG59XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQcmVUb29sVXNlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQcmVUb29sVXNlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0b29sIGV4ZWN1dGlvblxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfVxuICogfSk7XG4gKlxuICogLy8gRGVueSB3aXRoIHJlYXNvblxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2RlbnknLFxuICogICAgIHBlcm1pc3Npb25EZWNpc2lvblJlYXNvbjogJ0Rhbmdlcm91cyBjb21tYW5kIGRldGVjdGVkJ1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBbGxvdyB3aXRoIG1vZGlmaWVkIGlucHV0XG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnLFxuICogICAgIHVwZGF0ZWRJbnB1dDogeyBjb21tYW5kOiAnbHMgLWxhJyB9XG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwcmVUb29sVXNlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQcmVUb29sVXNlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdFRvb2xVc2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RUb29sVXNlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBZGQgY29udGV4dCBhZnRlciBhIGZpbGUgcmVhZFxuICogcG9zdFRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZpbGUgY29udGFpbnMgc2Vuc2l0aXZlIGRhdGEnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwb3N0VG9vbFVzZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUG9zdFRvb2xVc2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0VG9vbFVzZUZhaWx1cmUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdUcnkgdXNpbmcgYSBkaWZmZXJlbnQgYXBwcm9hY2gnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBvc3RUb29sVXNlRmFpbHVyZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFVzZXJQcm9tcHRTdWJtaXQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1RoaXMgcHJvamVjdCB1c2VzIFR5cGVTY3JpcHQgc3RyaWN0IG1vZGUnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB1c2VyUHJvbXB0U3VibWl0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJVc2VyUHJvbXB0U3VibWl0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXNzaW9uU3RhcnRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHNlc3Npb25TdGFydE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiBKU09OLnN0cmluZ2lmeSh7IHByb2plY3Q6ICdteS1wcm9qZWN0JyB9KVxuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2Vzc2lvblN0YXJ0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJTZXNzaW9uU3RhcnRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXNzaW9uRW5kIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXNzaW9uRW5kT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzZXNzaW9uRW5kT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2Vzc2lvbkVuZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiU2Vzc2lvbkVuZFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN0b3AgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN0b3BPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRoZSBzdG9wXG4gKiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAqXG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3RvcE91dHB1dCh7XG4gKiAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICByZWFzb246ICdUaGVyZSBhcmUgdW5jb21taXR0ZWQgY2hhbmdlcydcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdG9wT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihcIlN0b3BcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdWJhZ2VudFN0YXJ0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdWJhZ2VudFN0YXJ0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGb2N1cyBvbiBmaW5kaW5nIHBhdHRlcm5zJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3ViYWdlbnRTdGFydE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU3ViYWdlbnRTdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN1YmFnZW50U3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3ViYWdlbnRTdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1Rhc2sgbm90IGNvbXBsZXRlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoXCJTdWJhZ2VudFN0b3BcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBOb3RpZmljYXRpb24gaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIE5vdGlmaWNhdGlvbk91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgYWJvdXQgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdOb3RpZmljYXRpb24gZm9yd2FyZGVkIHRvIFNsYWNrICNhbGVydHMgY2hhbm5lbCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU3VwcHJlc3MgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHsgc3VwcHJlc3NPdXRwdXQ6IHRydWUgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IG5vdGlmaWNhdGlvbk91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiTm90aWZpY2F0aW9uXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlQ29tcGFjdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlQ29tcGFjdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgIHN5c3RlbU1lc3NhZ2U6ICdSZW1lbWJlcjogc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwcmVDb21wYWN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJQcmVDb21wYWN0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUGVybWlzc2lvblJlcXVlc3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBdXRvLWFwcHJvdmVcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHsgYmVoYXZpb3I6ICdhbGxvdycgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBdXRvLWFwcHJvdmUgd2l0aCBtb2RpZmllZCBpbnB1dFxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdhbGxvdycsXG4gKiAgICAgICB1cGRhdGVkSW5wdXQ6IHsgZmlsZV9wYXRoOiAnL3NhZmUvcGF0aCcgfVxuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1kZW55XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7XG4gKiAgICAgICBiZWhhdmlvcjogJ2RlbnknLFxuICogICAgICAgbWVzc2FnZTogJ05vdCBhbGxvd2VkJyxcbiAqICAgICAgIGludGVycnVwdDogdHJ1ZVxuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gRmFsbCB0aHJvdWdoIHRvIG5vcm1hbCBwcm9tcHRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcGVybWlzc2lvblJlcXVlc3RPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBlcm1pc3Npb25SZXF1ZXN0XCIpO1xuIiwgIi8qKlxuICogUnVudGltZSBtb2R1bGUgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIEhhbmRsZXMgc3RkaW4vc3Rkb3V0L2V4aXQgY29kZSBzZW1hbnRpY3MgZm9yIGNvbXBpbGVkIGhvb2sgZXhlY3V0aW9uLlxuICogVGhpcyBtb2R1bGUgaXMgdGhlIGNvcmUgb3JjaGVzdHJhdG9yIHRoYXQ6XG4gKiAtIFJlYWRzIEpTT04gZnJvbSBzdGRpbiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAtIEludm9rZXMgdGhlIGhvb2sgaGFuZGxlclxuICogLSBXcml0ZXMgb3V0cHV0IHRvIHN0ZG91dFxuICogLSBNYW5hZ2VzIGV4aXQgY29kZXNcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBhIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCBteUhvb2sgZnJvbSAnLi9teS1ob29rLmpzJztcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IGZyb20gXCIuL2Vudi5qc1wiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vbG9nZ2VyLmpzXCI7XG5pbXBvcnQgeyBFWElUX0NPREVTIH0gZnJvbSBcIi4vb3V0cHV0cy5qc1wiO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RkaW4vU3Rkb3V0IEhhbmRsaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIFJlYWRzIGFsbCBkYXRhIGZyb20gc3RkaW4uXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tcGxldGUgc3RkaW4gY29udGVudFxuICovXG5hc3luYyBmdW5jdGlvbiByZWFkU3RkaW4oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgICAgIC8vIFNldCBlbmNvZGluZyBmaXJzdCB0byBlbnN1cmUgZGF0YSBldmVudHMgcmVjZWl2ZSBzdHJpbmdzXG4gICAgICAgIHByb2Nlc3Muc3RkaW4uc2V0RW5jb2RpbmcoXCJ1dGYtOFwiKTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoY2h1bmtzLmpvaW4oXCJcIikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG4vKipcbiAqIFBhcnNlcyBzdGRpbiBKU09OIGlucHV0LlxuICogQHBhcmFtIHN0ZGluQ29udGVudCAtIFJhdyBzdGRpbiBjb250ZW50XG4gKiBAcmV0dXJucyBQYXJzZWQgaW5wdXQgKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogQHRocm93cyBFcnJvciBpZiBKU09OIGlzIG1hbGZvcm1lZFxuICovXG5mdW5jdGlvbiBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KSB7XG4gICAgLy8gUGFyc2UgSlNPTiAtIGlucHV0IHVzZXMgd2lyZSBmb3JtYXQgKHNuYWtlX2Nhc2UpIGRpcmVjdGx5XG4gICAgY29uc3QgcmF3SW5wdXQgPSBKU09OLnBhcnNlKHN0ZGluQ29udGVudCk7XG4gICAgcmV0dXJuIHJhd0lucHV0O1xufVxuLyoqXG4gKiBXcml0ZXMgaG9vayBvdXRwdXQgdG8gc3Rkb3V0LlxuICpcbiAqIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSBrZXlzIHBlciBDbGF1ZGUgQ29kZSBob29rIHNwZWNpZmljYXRpb24uXG4gKiBAcGFyYW0gb3V0cHV0IC0gVGhlIGhvb2sgb3V0cHV0IHRvIHdyaXRlXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1vdXRwdXQtc3RydWN0dXJlXG4gKi9cbmZ1bmN0aW9uIHdyaXRlU3Rkb3V0KG91dHB1dCkge1xuICAgIC8vIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSAtIG5vIHRyYW5zZm9ybWF0aW9uIG5lZWRlZFxuICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEpTT04uc3RyaW5naWZ5KG91dHB1dCkpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXJyb3IgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBlcnJvciBvdXRwdXQgZm9yIG1hbGZvcm1lZCBzdGRpbiBKU09OLlxuICogQHBhcmFtIGVycm9yIC0gVGhlIHBhcnNlIGVycm9yXG4gKiBAcmV0dXJucyBIb29rT3V0cHV0IHdpdGggZW1wdHkgc3Rkb3V0XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKSB7XG4gICAgbG9nZ2VyLmVycm9yKGBJbnZhbGlkIEpTT04gaW5wdXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIHJldHVybiB7IHN0ZG91dDoge30gfTtcbn1cbi8qKlxuICogV3JpdGVzIGhhbmRsZXIgZXJyb3Igc3RhY2t0cmFjZSB0byBzdGRlcnIgYW5kIGV4aXRzIHdpdGggY29kZSAyLlxuICpcbiAqIFdoZW4gYSBob29rIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbjpcbiAqIC0gU3RhY2t0cmFjZSAod2l0aCBzb3VyY2VtYXBzIGlmIGF2YWlsYWJsZSkgaXMgb3V0cHV0IHRvIHN0ZGVyclxuICogLSBQcm9jZXNzIGV4aXRzIHdpdGggY29kZSAyIChCTE9DSylcbiAqIC0gTm8gSlNPTiBpcyBvdXRwdXQgdG8gc3Rkb3V0XG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIGJ5IHRoZSBoYW5kbGVyXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcikge1xuICAgIC8vIFdyaXRlIHN0YWNrIHRyYWNlIHRvIHN0ZGVyciAoc291cmNlbWFwcyBhcmUgYXBwbGllZCBhdXRvbWF0aWNhbGx5IGJ5IE5vZGUuanMpXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZX1cXG5gKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke1N0cmluZyhlcnJvcil9XFxuYCk7XG4gICAgfVxuICAgIC8vIExvZyB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICBsb2dnZXIuZXJyb3IoYEhvb2sgaGFuZGxlciBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHQgYW5kIGNsb3NlXG4gICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgIGxvZ2dlci5jbG9zZSgpO1xuICAgIC8vIEV4aXQgd2l0aCBjb2RlIDIgKEJMT0NLKSAtIG5vIEpTT04gb3V0cHV0XG4gICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuQkxPQ0spO1xufVxuLyoqXG4gKiBDb252ZXJ0cyBhIFNwZWNpZmljSG9va091dHB1dCB0byBIb29rT3V0cHV0IGZvciB3aXJlIGZvcm1hdC5cbiAqXG4gKiBTcGVjaWZpY0hvb2tPdXRwdXQgdHlwZXMgaGF2ZTogeyBfdHlwZSwgZXhpdENvZGUsIHN0ZG91dCwgc3RkZXJyPyB9XG4gKiBIb29rT3V0cHV0IGhhczogeyBleGl0Q29kZSwgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqXG4gKiBTaW5jZSBvdXRwdXQgYnVpbGRlcnMgbm93IHByb2R1Y2Ugd2lyZS1mb3JtYXQgZGlyZWN0bHksIHRoaXMgZnVuY3Rpb25cbiAqIHNpbXBseSBzdHJpcHMgdGhlIGBfdHlwZWAgZGlzY3JpbWluYXRvciBmaWVsZC5cbiAqIEBwYXJhbSBzcGVjaWZpY091dHB1dCAtIFRoZSBzcGVjaWZpYyBvdXRwdXQgZnJvbSBhIGhvb2sgaGFuZGxlclxuICogQHJldHVybnMgSG9va091dHB1dCByZWFkeSBmb3Igc2VyaWFsaXphdGlvblxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gcHJlVG9vbFVzZU91dHB1dCh7IGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfSB9KTtcbiAqIGNvbnN0IGhvb2tPdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAqIC8vIGhvb2tPdXRwdXQ6IHsgZXhpdENvZGU6IDAsIHN0ZG91dDogeyBob29rU3BlY2lmaWNPdXRwdXQ6IHsgLi4uIH0gfSB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpIHtcbiAgICByZXR1cm4geyBzdGRvdXQ6IHNwZWNpZmljT3V0cHV0LnN0ZG91dCB9O1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhlY3V0ZSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeGVjdXRlcyBhIGhvb2sgaGFuZGxlciB3aXRoIGZ1bGwgcnVudGltZSBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgdGhhdCBjb21waWxlZCBob29rcyB1c2UuIFdoZW4gYSBjb21waWxlZCBob29rXG4gKiBydW5zIGFzIGEgQ0xJOlxuICpcbiAqIDEuIFJlYWRzIGFsbCBzdGRpblxuICogMi4gUGFyc2VzIEpTT04gKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogMy4gU2V0cyB1cCBsb2dnZXIgY29udGV4dCAoaG9va1R5cGUsIGlucHV0KVxuICogNC4gQ2FsbHMgaGFuZGxlciB3aXRoIGlucHV0IGFuZCBjb250ZXh0IChsb2dnZXIpXG4gKiA1LiBIYW5kbGVzIGFueSBlcnJvcnMsIGxvZ3MgdGhlbVxuICogNi4gV3JpdGVzIEpTT04gdG8gc3Rkb3V0XG4gKiA3LiBDbG9zZXMgbG9nZ2VyXG4gKiA4LiBFeGl0cyB3aXRoIGFwcHJvcHJpYXRlIGNvZGVcbiAqIEBwYXJhbSBob29rRm4gLSBUaGUgaG9vayBmdW5jdGlvbiB0byBleGVjdXRlIChmcm9tIGhvb2sgZmFjdG9yeSlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBjb21waWxlZCBob29rIGZpbGVcbiAqIGltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvcnVudGltZSc7XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogY29uc3QgbXlIb29rID0gcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKlxuICogZXhlY3V0ZShteUhvb2spO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUoaG9va0ZuKSB7XG4gICAgbGV0IG91dHB1dDtcbiAgICB0cnkge1xuICAgICAgICAvLyBDaGVjayBmb3IgbG9nIGZpbGUgY29uZmlndXJhdGlvbiBjb25mbGljdHNcbiAgICAgICAgLy8gQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFIGlzIGluamVjdGVkIGJ5IHRoZSBDTEkgLS1sb2cgcGFyYW1ldGVyXG4gICAgICAgIC8vIENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFIGlzIHRoZSB1c2VyJ3MgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAgICAgICAgY29uc3QgY2xpTG9nRmlsZSA9IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0NMSV9MT0dfRklMRTtcbiAgICAgICAgY29uc3QgZW52TG9nRmlsZSA9IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFO1xuICAgICAgICBpZiAoY2xpTG9nRmlsZSAhPT0gdW5kZWZpbmVkICYmIGVudkxvZ0ZpbGUgIT09IHVuZGVmaW5lZCAmJiBjbGlMb2dGaWxlICE9PSBlbnZMb2dGaWxlKSB7XG4gICAgICAgICAgICAvLyBXcml0ZSBlcnJvciB0byBzdGRlcnIgYW5kIGV4aXQgd2l0aCBlcnJvciBjb2RlXG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgTG9nIGZpbGUgY29uZmlndXJhdGlvbiBjb25mbGljdDogQ0xJIC0tbG9nPVwiJHtjbGlMb2dGaWxlfVwiIHZzIENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFPVwiJHtlbnZMb2dGaWxlfVwiLiBgICtcbiAgICAgICAgICAgICAgICBcIlVzZSBvbmx5IG9uZSBtZXRob2QgdG8gY29uZmlndXJlIGhvb2sgbG9nZ2luZy5cXG5cIik7XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgQ0xJIGxvZyBmaWxlIGlzIHNldCwgY29uZmlndXJlIHRoZSBsb2dnZXJcbiAgICAgICAgaWYgKGNsaUxvZ0ZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbG9nZ2VyLnNldExvZ0ZpbGUoY2xpTG9nRmlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVhZCBhbmQgcGFyc2Ugc3RkaW5cbiAgICAgICAgbGV0IHN0ZGluQ29udGVudDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHN0ZGluQ29udGVudCA9IGF3YWl0IHJlYWRTdGRpbigpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVycm9yLCBcIkZhaWxlZCB0byByZWFkIHN0ZGluXCIpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFBhcnNlIGFuZCB0cmFuc2Zvcm0gaW5wdXRcbiAgICAgICAgbGV0IGlucHV0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaW5wdXQgPSBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2dFcnJvcihlcnJvciwgXCJGYWlsZWQgdG8gcGFyc2Ugc3RkaW4gSlNPTlwiKTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgbG9nZ2VyIGNvbnRleHRcbiAgICAgICAgY29uc3QgaG9va0V2ZW50TmFtZSA9IGhvb2tGbi5ob29rRXZlbnROYW1lO1xuICAgICAgICBsb2dnZXIuc2V0Q29udGV4dChob29rRXZlbnROYW1lLCBpbnB1dCk7XG4gICAgICAgIC8vIEJ1aWxkIGNvbnRleHQgLSBTZXNzaW9uU3RhcnQgaG9va3MgZ2V0IGV4dGVuZGVkIGNvbnRleHQgd2l0aCBwZXJzaXN0RW52VmFyXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBob29rRXZlbnROYW1lID09PSBcIlNlc3Npb25TdGFydFwiID8geyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIsIHBlcnNpc3RFbnZWYXJzIH0gOiB7IGxvZ2dlciB9O1xuICAgICAgICAvLyBFeGVjdXRlIGhhbmRsZXJcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gYXdhaXQgaG9va0ZuKGlucHV0LCBjb250ZXh0KTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gSGFuZGxlciB0aHJldyAtIG91dHB1dCBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdCB3aXRoIGNvZGUgMlxuICAgICAgICAgICAgLy8gVGhpcyBjYWxsIG5ldmVyIHJldHVybnMgKHByb2Nlc3MuZXhpdClcbiAgICAgICAgICAgIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZmluYWxseSB7XG4gICAgICAgIC8vIFdyaXRlIG91dHB1dCBpZiB3ZSBoYXZlIGl0XG4gICAgICAgIGlmIChvdXRwdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgd3JpdGVTdGRvdXQob3V0cHV0LnN0ZG91dCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHRcbiAgICAgICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgICAgICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgICAgLy8gRXhpdCB3aXRoIHN1Y2Nlc3MgKGhhbmRsZXIgZXJyb3JzIGV4aXQgdmlhIGhhbmRsZUhhbmRsZXJFcnJvciB3aXRoIGNvZGUgMilcbiAgICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfVxufVxuIiwgIi8qKlxuICogVHlwZSBndWFyZHMgYW5kIGhlbHBlciBmdW5jdGlvbnMgZm9yIENsYXVkZSBDb2RlIHRvb2wgaW5wdXRzLlxuICpcbiAqIFByb3ZpZGVzIHNhZmUgdHlwZSBuYXJyb3dpbmcgZm9yIHRvb2wgaW5wdXRzIGFuZCB1dGlsaXR5IGZ1bmN0aW9uc1xuICogZm9yIGNvbW1vbiBwYXR0ZXJucyBsaWtlIGZpbGUgcGF0aCBleHRyYWN0aW9uIGFuZCBjb250ZW50IGluc3BlY3Rpb24uXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHtcbiAqICAgcHJlVG9vbFVzZUhvb2ssXG4gKiAgIHByZVRvb2xVc2VPdXRwdXQsXG4gKiAgIGlzV3JpdGVUb29sLFxuICogICBnZXRGaWxlUGF0aCxcbiAqICAgaXNUc0ZpbGUsXG4gKiAgIGNoZWNrQ29udGVudEZvclBhdHRlcm5cbiAqIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdXcml0ZXxFZGl0fE11bHRpRWRpdCcgfSwgKGlucHV0KSA9PiB7XG4gKiAgIGNvbnN0IGZpbGVQYXRoID0gZ2V0RmlsZVBhdGgoaW5wdXQpO1xuICogICBpZiAoIWZpbGVQYXRoIHx8ICFpc1RzRmlsZShmaWxlUGF0aCkpIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHt9KTtcbiAqXG4gKiAgIGNvbnN0IHJlc3VsdCA9IGNoZWNrQ29udGVudEZvclBhdHRlcm4oaW5wdXQsIC9AdHMtZXhwZWN0LWVycm9yL2cpO1xuICogICBpZiAocmVzdWx0Py5pc0FkZGl0aW9uKSB7XG4gKiAgICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICAgICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2RlbnknLFxuICogICAgICAgICBwZXJtaXNzaW9uRGVjaXNpb25SZWFzb246IGBDYW5ub3QgYWRkOiAke3Jlc3VsdC5tYXRjaGVzLmpvaW4oJywgJyl9YFxuICogICAgICAgfVxuICogICAgIH0pO1xuICogICB9XG4gKlxuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKiBAbW9kdWxlXG4gKi9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGUgR3VhcmRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIFdyaXRlIHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIFdyaXRlVG9vbElucHV0LlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gY2hlY2tcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGlucHV0IGlzIGZvciBhIFdyaXRlIHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNXcml0ZVRvb2woaW5wdXQpKSB7XG4gKiAgIC8vIGlucHV0LnRvb2xfaW5wdXQgaXMgbm93IHR5cGVkIGFzIFdyaXRlVG9vbElucHV0XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQuZmlsZV9wYXRoKTtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5jb250ZW50KTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXcml0ZVRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIldyaXRlXCI7XG59XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIEVkaXQgdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgRWRpdFRvb2xJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYW4gRWRpdCB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzRWRpdFRvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQub2xkX3N0cmluZyk7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQubmV3X3N0cmluZyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRWRpdFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIkVkaXRcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgTXVsdGlFZGl0IHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIE11bHRpRWRpdFRvb2xJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBNdWx0aUVkaXQgdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc011bHRpRWRpdFRvb2woaW5wdXQpKSB7XG4gKiAgIGZvciAoY29uc3QgZWRpdCBvZiBpbnB1dC50b29sX2lucHV0LmVkaXRzKSB7XG4gKiAgICAgY29uc29sZS5sb2coYCR7ZWRpdC5vbGRfc3RyaW5nfSAtPiAke2VkaXQubmV3X3N0cmluZ31gKTtcbiAqICAgfVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc011bHRpRWRpdFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIk11bHRpRWRpdFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBhbnkgZmlsZS1tb2RpZnlpbmcgdG9vbCAoV3JpdGUsIEVkaXQsIG9yIE11bHRpRWRpdCkuXG4gKlxuICogVXNlIHRoaXMgd2hlbiB5b3UgbmVlZCB0byBoYW5kbGUgYWxsIGZpbGUgbW9kaWZpY2F0aW9ucyBnZW5lcmljYWxseS5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBXcml0ZSwgRWRpdCwgb3IgTXVsdGlFZGl0IHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNGaWxlTW9kaWZ5aW5nVG9vbChpbnB1dCkpIHtcbiAqICAgY29uc3QgZmlsZVBhdGggPSBnZXRGaWxlUGF0aChpbnB1dCk7IC8vIFdvcmtzIGZvciBhbGwgdGhyZWUgdHlwZXNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGaWxlTW9kaWZ5aW5nVG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiV3JpdGVcIiB8fCBpbnB1dC50b29sX25hbWUgPT09IFwiRWRpdFwiIHx8IGlucHV0LnRvb2xfbmFtZSA9PT0gXCJNdWx0aUVkaXRcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgUmVhZCB0b29sIGlucHV0cy5cbiAqXG4gKiBOYXJyb3dzIHRoZSBpbnB1dCB0eXBlIHRvIGluY2x1ZGUgYSB0eXBlZCBSZWFkVG9vbElucHV0LlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gY2hlY2tcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGlucHV0IGlzIGZvciBhIFJlYWQgdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc1JlYWRUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LmZpbGVfcGF0aCk7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQub2Zmc2V0KTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNSZWFkVG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiUmVhZFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBCYXNoIHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIEJhc2hUb29sSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgQmFzaCB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzQmFzaFRvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQuY29tbWFuZCk7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQudGltZW91dCk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQmFzaFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIkJhc2hcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgR2xvYiB0b29sIGlucHV0cy5cbiAqXG4gKiBOYXJyb3dzIHRoZSBpbnB1dCB0eXBlIHRvIGluY2x1ZGUgYSB0eXBlZCBHbG9iVG9vbElucHV0LlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gY2hlY2tcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGlucHV0IGlzIGZvciBhIEdsb2IgdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc0dsb2JUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LnBhdHRlcm4pO1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LnBhdGgpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0dsb2JUb29sKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0LnRvb2xfbmFtZSA9PT0gXCJHbG9iXCI7XG59XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIEdyZXAgdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgR3JlcFRvb2xJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBHcmVwIHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNHcmVwVG9vbChpbnB1dCkpIHtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5wYXR0ZXJuKTtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5nbG9iKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNHcmVwVG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiR3JlcFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBUYXNrIHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIEFnZW50SW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgVGFzayB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzVGFza1Rvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQucHJvbXB0KTtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5zdWJhZ2VudF90eXBlKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUYXNrVG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiVGFza1wiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBUYXNrT3V0cHV0IHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIFRhc2tPdXRwdXRJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBUYXNrT3V0cHV0IHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNUYXNrT3V0cHV0VG9vbChpbnB1dCkpIHtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC50YXNrX2lkKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUYXNrT3V0cHV0VG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiVGFza091dHB1dFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBFeGl0UGxhbk1vZGUgdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgRXhpdFBsYW5Nb2RlSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGFuIEV4aXRQbGFuTW9kZSB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzRXhpdFBsYW5Nb2RlVG9vbChpbnB1dCkpIHtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5hbGxvd2VkUHJvbXB0cyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRXhpdFBsYW5Nb2RlVG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiRXhpdFBsYW5Nb2RlXCI7XG59XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIEtpbGxTaGVsbCB0b29sIGlucHV0cy5cbiAqXG4gKiBOYXJyb3dzIHRoZSBpbnB1dCB0eXBlIHRvIGluY2x1ZGUgYSB0eXBlZCBLaWxsU2hlbGxJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBLaWxsU2hlbGwgdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc0tpbGxTaGVsbFRvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQuc2hlbGxfaWQpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0tpbGxTaGVsbFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIktpbGxTaGVsbFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBOb3RlYm9va0VkaXQgdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgTm90ZWJvb2tFZGl0SW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgTm90ZWJvb2tFZGl0IHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNOb3RlYm9va0VkaXRUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0Lm5vdGVib29rX3BhdGgpO1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0Lm5ld19zb3VyY2UpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vdGVib29rRWRpdFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIk5vdGVib29rRWRpdFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBUb2RvV3JpdGUgdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgVG9kb1dyaXRlSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgVG9kb1dyaXRlIHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNUb2RvV3JpdGVUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LnRvZG9zKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUb2RvV3JpdGVUb29sKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0LnRvb2xfbmFtZSA9PT0gXCJUb2RvV3JpdGVcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgV2ViRmV0Y2ggdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgV2ViRmV0Y2hJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBXZWJGZXRjaCB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzV2ViRmV0Y2hUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LnVybCk7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQucHJvbXB0KTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXZWJGZXRjaFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIldlYkZldGNoXCI7XG59XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIFdlYlNlYXJjaCB0b29sIGlucHV0cy5cbiAqXG4gKiBOYXJyb3dzIHRoZSBpbnB1dCB0eXBlIHRvIGluY2x1ZGUgYSB0eXBlZCBXZWJTZWFyY2hJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBXZWJTZWFyY2ggdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc1dlYlNlYXJjaFRvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQucXVlcnkpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1dlYlNlYXJjaFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIldlYlNlYXJjaFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBBc2tVc2VyUXVlc3Rpb24gdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgQXNrVXNlclF1ZXN0aW9uSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGFuIEFza1VzZXJRdWVzdGlvbiB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzQXNrVXNlclF1ZXN0aW9uVG9vbChpbnB1dCkpIHtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5xdWVzdGlvbnMpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Fza1VzZXJRdWVzdGlvblRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIkFza1VzZXJRdWVzdGlvblwiO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRmlsZSBQYXRoIFV0aWxpdGllc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeHRyYWN0cyB0aGUgZmlsZSBwYXRoIGZyb20gYSB0b29sIGlucHV0LlxuICpcbiAqIFdvcmtzIHdpdGggV3JpdGUsIEVkaXQsIE11bHRpRWRpdCwgYW5kIFJlYWQgdG9vbHMuXG4gKiBSZXR1cm5zIG51bGwgZm9yIG90aGVyIHRvb2xzIG9yIGlmIGZpbGVfcGF0aCBpcyBtaXNzaW5nLlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gZXh0cmFjdCBmcm9tXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBwYXRoLCBvciBudWxsIGlmIG5vdCBhcHBsaWNhYmxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZVBhdGggPSBnZXRGaWxlUGF0aChpbnB1dCk7XG4gKiBpZiAoZmlsZVBhdGggJiYgaXNUc0ZpbGUoZmlsZVBhdGgpKSB7XG4gKiAgIC8vIEhhbmRsZSBUeXBlU2NyaXB0IGZpbGVcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVBhdGgoaW5wdXQpIHtcbiAgICBjb25zdCB0b29sSW5wdXQgPSBpbnB1dC50b29sX2lucHV0O1xuICAgIGlmICh0b29sSW5wdXQgJiYgdHlwZW9mIHRvb2xJbnB1dCA9PT0gXCJvYmplY3RcIiAmJiBcImZpbGVfcGF0aFwiIGluIHRvb2xJbnB1dCkge1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHRvb2xJbnB1dC5maWxlX3BhdGg7XG4gICAgICAgIHJldHVybiB0eXBlb2YgZmlsZVBhdGggPT09IFwic3RyaW5nXCIgPyBmaWxlUGF0aCA6IG51bGw7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuLyoqXG4gKiBDaGVja3MgaWYgYSBmaWxlIHBhdGggaXMgYSBKYXZhU2NyaXB0IG9yIFR5cGVTY3JpcHQgZmlsZS5cbiAqXG4gKiBNYXRjaGVzIC5qcywgLmpzeCwgLnRzLCAudHN4LCAubWpzLCAubXRzLCAuY2pzLCAuY3RzIGV4dGVuc2lvbnMuXG4gKiBAcGFyYW0gZmlsZVBhdGggLSBUaGUgZmlsZSBwYXRoIHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBmaWxlIGlzIEphdmFTY3JpcHQgb3IgVHlwZVNjcmlwdFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc0pzVHNGaWxlKGZpbGVQYXRoKSkge1xuICogICAvLyBDaGVjayBmb3IgVHlwZVNjcmlwdC1zcGVjaWZpYyBwYXR0ZXJuc1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0pzVHNGaWxlKGZpbGVQYXRoKSB7XG4gICAgcmV0dXJuIC9cXC5bY21dP1tqdF1zeD8kLy50ZXN0KGZpbGVQYXRoKTtcbn1cbi8qKlxuICogQ2hlY2tzIGlmIGEgZmlsZSBwYXRoIGlzIGEgVHlwZVNjcmlwdCBmaWxlLlxuICpcbiAqIE1hdGNoZXMgLnRzLCAudHN4LCAubXRzLCAuY3RzIGV4dGVuc2lvbnMuXG4gKiBAcGFyYW0gZmlsZVBhdGggLSBUaGUgZmlsZSBwYXRoIHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBmaWxlIGlzIFR5cGVTY3JpcHRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNUc0ZpbGUoZmlsZVBhdGgpKSB7XG4gKiAgIC8vIEVuZm9yY2UgVHlwZVNjcmlwdC1zcGVjaWZpYyBydWxlc1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1RzRmlsZShmaWxlUGF0aCkge1xuICAgIHJldHVybiAvXFwuW2NtXT90c3g/JC8udGVzdChmaWxlUGF0aCk7XG59XG4vKipcbiAqIENoZWNrcyBpZiBhIHBhdHRlcm4gZXhpc3RzIGluIHRoZSBjb250ZW50IGJlaW5nIHdyaXR0ZW4gb3IgZWRpdGVkLlxuICpcbiAqIEZvciBXcml0ZTogY2hlY2tzIHRoZSBjb250ZW50IGJlaW5nIHdyaXR0ZW5cbiAqIEZvciBFZGl0OiBjaGVja3MgbmV3X3N0cmluZyAoYW5kIG9sZF9zdHJpbmcgdG8gZGV0ZWN0IGFkZGl0aW9ucylcbiAqIEZvciBNdWx0aUVkaXQ6IGNoZWNrcyBhbGwgZWRpdHMgYW5kIGFnZ3JlZ2F0ZXMgcmVzdWx0c1xuICogQHBhcmFtIGlucHV0IC0gVGhlIFByZVRvb2xVc2UgaG9vayBpbnB1dFxuICogQHBhcmFtIHBhdHRlcm4gLSBUaGUgcmVnZXggcGF0dGVybiB0byBzZWFyY2ggZm9yIChnbG9iYWwgZmxhZyB3aWxsIGJlIHVzZWQpXG4gKiBAcmV0dXJucyBSZXN1bHQgb2JqZWN0LCBvciBudWxsIGlmIG5vdCBhIGZpbGUtbW9kaWZ5aW5nIHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCbG9jayBAdHMtZXhwZWN0LWVycm9yIGJlaW5nIGFkZGVkXG4gKiBjb25zdCByZXN1bHQgPSBjaGVja0NvbnRlbnRGb3JQYXR0ZXJuKGlucHV0LCAvQHRzLWV4cGVjdC1lcnJvci9nKTtcbiAqIGlmIChyZXN1bHQ/LmlzQWRkaXRpb24pIHtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgICAgcGVybWlzc2lvbkRlY2lzaW9uOiAnZGVueScsXG4gKiAgICAgICBwZXJtaXNzaW9uRGVjaXNpb25SZWFzb246IGBDYW5ub3QgYWRkOiAke3Jlc3VsdC5tYXRjaGVzLmpvaW4oJywgJyl9YFxuICogICAgIH1cbiAqICAgfSk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrQ29udGVudEZvclBhdHRlcm4oaW5wdXQsIHBhdHRlcm4pIHtcbiAgICAvLyBFbnN1cmUgcGF0dGVybiBoYXMgZ2xvYmFsIGZsYWcgZm9yIG1hdGNoQWxsXG4gICAgY29uc3QgZ2xvYmFsUGF0dGVybiA9IHBhdHRlcm4uZ2xvYmFsID8gcGF0dGVybiA6IG5ldyBSZWdFeHAocGF0dGVybi5zb3VyY2UsIGAke3BhdHRlcm4uZmxhZ3N9Z2ApO1xuICAgIGlmIChpc1dyaXRlVG9vbChpbnB1dCkpIHtcbiAgICAgICAgY29uc3QgbWF0Y2hlcyA9IFsuLi5pbnB1dC50b29sX2lucHV0LmNvbnRlbnQubWF0Y2hBbGwoZ2xvYmFsUGF0dGVybildLm1hcCgobSkgPT4gbVswXSk7XG4gICAgICAgIGNvbnN0IHVuaXF1ZU1hdGNoZXMgPSBbLi4ubmV3IFNldChtYXRjaGVzKV07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBmb3VuZDogdW5pcXVlTWF0Y2hlcy5sZW5ndGggPiAwLFxuICAgICAgICAgICAgaXNBZGRpdGlvbjogdW5pcXVlTWF0Y2hlcy5sZW5ndGggPiAwLCAvLyBGb3IgV3JpdGUsIGFueSBtYXRjaCBpcyBhbiBhZGRpdGlvblxuICAgICAgICAgICAgbWF0Y2hlczogdW5pcXVlTWF0Y2hlcyxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKGlzRWRpdFRvb2woaW5wdXQpKSB7XG4gICAgICAgIGNvbnN0IG5ld01hdGNoZXMgPSBbLi4uaW5wdXQudG9vbF9pbnB1dC5uZXdfc3RyaW5nLm1hdGNoQWxsKGdsb2JhbFBhdHRlcm4pXS5tYXAoKG0pID0+IG1bMF0pO1xuICAgICAgICBjb25zdCBvbGRNYXRjaGVzID0gWy4uLmlucHV0LnRvb2xfaW5wdXQub2xkX3N0cmluZy5tYXRjaEFsbChnbG9iYWxQYXR0ZXJuKV0ubWFwKChtKSA9PiBtWzBdKTtcbiAgICAgICAgY29uc3QgdW5pcXVlTmV3TWF0Y2hlcyA9IFsuLi5uZXcgU2V0KG5ld01hdGNoZXMpXTtcbiAgICAgICAgY29uc3QgdW5pcXVlT2xkTWF0Y2hlcyA9IG5ldyBTZXQob2xkTWF0Y2hlcyk7XG4gICAgICAgIC8vIEFkZGl0aW9uID0gZm91bmQgaW4gbmV3IGJ1dCBub3QgaW4gb2xkXG4gICAgICAgIGNvbnN0IGFkZGl0aW9ucyA9IHVuaXF1ZU5ld01hdGNoZXMuZmlsdGVyKChtKSA9PiAhdW5pcXVlT2xkTWF0Y2hlcy5oYXMobSkpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZm91bmQ6IHVuaXF1ZU5ld01hdGNoZXMubGVuZ3RoID4gMCxcbiAgICAgICAgICAgIGlzQWRkaXRpb246IGFkZGl0aW9ucy5sZW5ndGggPiAwLFxuICAgICAgICAgICAgbWF0Y2hlczogdW5pcXVlTmV3TWF0Y2hlcyxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKGlzTXVsdGlFZGl0VG9vbChpbnB1dCkpIHtcbiAgICAgICAgY29uc3QgZGV0YWlscyA9IFtdO1xuICAgICAgICBjb25zdCBhbGxNYXRjaGVzID0gbmV3IFNldCgpO1xuICAgICAgICBsZXQgYW55Rm91bmQgPSBmYWxzZTtcbiAgICAgICAgbGV0IGFueUFkZGl0aW9uID0gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQudG9vbF9pbnB1dC5lZGl0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgZWRpdCA9IGlucHV0LnRvb2xfaW5wdXQuZWRpdHNbaV07XG4gICAgICAgICAgICBjb25zdCBuZXdNYXRjaGVzID0gWy4uLmVkaXQubmV3X3N0cmluZy5tYXRjaEFsbChnbG9iYWxQYXR0ZXJuKV0ubWFwKChtKSA9PiBtWzBdKTtcbiAgICAgICAgICAgIGNvbnN0IG9sZE1hdGNoZXMgPSBbLi4uZWRpdC5vbGRfc3RyaW5nLm1hdGNoQWxsKGdsb2JhbFBhdHRlcm4pXS5tYXAoKG0pID0+IG1bMF0pO1xuICAgICAgICAgICAgY29uc3QgdW5pcXVlTmV3TWF0Y2hlcyA9IFsuLi5uZXcgU2V0KG5ld01hdGNoZXMpXTtcbiAgICAgICAgICAgIGNvbnN0IHVuaXF1ZU9sZE1hdGNoZXMgPSBuZXcgU2V0KG9sZE1hdGNoZXMpO1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25zID0gdW5pcXVlTmV3TWF0Y2hlcy5maWx0ZXIoKG0pID0+ICF1bmlxdWVPbGRNYXRjaGVzLmhhcyhtKSk7XG4gICAgICAgICAgICBjb25zdCBmb3VuZCA9IHVuaXF1ZU5ld01hdGNoZXMubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGlzQWRkaXRpb24gPSBhZGRpdGlvbnMubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIGlmIChmb3VuZClcbiAgICAgICAgICAgICAgICBhbnlGb3VuZCA9IHRydWU7XG4gICAgICAgICAgICBpZiAoaXNBZGRpdGlvbilcbiAgICAgICAgICAgICAgICBhbnlBZGRpdGlvbiA9IHRydWU7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG0gb2YgdW5pcXVlTmV3TWF0Y2hlcykge1xuICAgICAgICAgICAgICAgIGFsbE1hdGNoZXMuYWRkKG0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGV0YWlscy5wdXNoKHtcbiAgICAgICAgICAgICAgICBpbmRleDogaSxcbiAgICAgICAgICAgICAgICBmb3VuZCxcbiAgICAgICAgICAgICAgICBpc0FkZGl0aW9uLFxuICAgICAgICAgICAgICAgIG1hdGNoZXM6IHVuaXF1ZU5ld01hdGNoZXMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZm91bmQ6IGFueUZvdW5kLFxuICAgICAgICAgICAgaXNBZGRpdGlvbjogYW55QWRkaXRpb24sXG4gICAgICAgICAgICBtYXRjaGVzOiBbLi4uYWxsTWF0Y2hlc10sXG4gICAgICAgICAgICBkZXRhaWxzLFxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8qKlxuICogSXRlcmF0ZXMgb3ZlciBjb250ZW50IGluIFdyaXRlL0VkaXQvTXVsdGlFZGl0IG9wZXJhdGlvbnMuXG4gKlxuICogUHJvdmlkZXMgYSB1bmlmaWVkIHdheSB0byBpbnNwZWN0IGNvbnRlbnQgcmVnYXJkbGVzcyBvZiBvcGVyYXRpb24gdHlwZS5cbiAqIFJldHVybiBmYWxzZSBmcm9tIHRoZSBjYWxsYmFjayB0byBzdG9wIGl0ZXJhdGlvbiBlYXJseS5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBQcmVUb29sVXNlIGhvb2sgaW5wdXRcbiAqIEBwYXJhbSBjYWxsYmFjayAtIEZ1bmN0aW9uIGNhbGxlZCBmb3IgZWFjaCBjb250ZW50IHBpZWNlLCByZXR1cm4gZmFsc2UgdG8gc3RvcFxuICogQHJldHVybnMgVHJ1ZSBpZiBhbGwgY2FsbGJhY2tzIHJldHVybmVkIHRydWUsIGZhbHNlIGlmIHN0b3BwZWQgZWFybHkgb3Igbm90IGFwcGxpY2FibGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBDaGVjayBhbGwgY29udGVudCBmb3Igc2Vuc2l0aXZlIGRhdGFcbiAqIGNvbnN0IGhhc1NlbnNpdGl2ZSA9ICFmb3JFYWNoQ29udGVudChpbnB1dCwgKHsgbmV3Q29udGVudCB9KSA9PiB7XG4gKiAgIGlmICgvcGFzc3dvcmR8c2VjcmV0fGFwaS4/a2V5L2kudGVzdChuZXdDb250ZW50KSkge1xuICogICAgIHJldHVybiBmYWxzZTsgLy8gU3RvcCAtIGZvdW5kIHNlbnNpdGl2ZSBkYXRhXG4gKiAgIH1cbiAqICAgcmV0dXJuIHRydWU7IC8vIENvbnRpbnVlXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9yRWFjaENvbnRlbnQoaW5wdXQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKGlzV3JpdGVUb29sKGlucHV0KSkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soe1xuICAgICAgICAgICAgbmV3Q29udGVudDogaW5wdXQudG9vbF9pbnB1dC5jb250ZW50LFxuICAgICAgICAgICAgb2xkQ29udGVudDogbnVsbCxcbiAgICAgICAgICAgIGluZGV4OiAwLFxuICAgICAgICAgICAgaXNXcml0ZTogdHJ1ZSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChpc0VkaXRUb29sKGlucHV0KSkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soe1xuICAgICAgICAgICAgbmV3Q29udGVudDogaW5wdXQudG9vbF9pbnB1dC5uZXdfc3RyaW5nLFxuICAgICAgICAgICAgb2xkQ29udGVudDogaW5wdXQudG9vbF9pbnB1dC5vbGRfc3RyaW5nLFxuICAgICAgICAgICAgaW5kZXg6IDAsXG4gICAgICAgICAgICBpc1dyaXRlOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChpc011bHRpRWRpdFRvb2woaW5wdXQpKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQudG9vbF9pbnB1dC5lZGl0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgZWRpdCA9IGlucHV0LnRvb2xfaW5wdXQuZWRpdHNbaV07XG4gICAgICAgICAgICBjb25zdCBzaG91bGRDb250aW51ZSA9IGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICBuZXdDb250ZW50OiBlZGl0Lm5ld19zdHJpbmcsXG4gICAgICAgICAgICAgICAgb2xkQ29udGVudDogZWRpdC5vbGRfc3RyaW5nLFxuICAgICAgICAgICAgICAgIGluZGV4OiBpLFxuICAgICAgICAgICAgICAgIGlzV3JpdGU6IGZhbHNlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIXNob3VsZENvbnRpbnVlKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuIiwgIi8qKlxuICogQWRhcHRpdmUgQ2FyZHMgdmFsaWRhdGlvbiBmdW5jdGlvbnMuXG4gKlxuICogQG1vZHVsZSBjYXJkXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBDYXJkLCBDYXJkU3RhdHVzIH0gZnJvbSAnQGdvb2Rmb290L2lzc3Vlcy1wcm90b2NvbCc7XG5pbXBvcnQgdHlwZSB7IEZpZWxkVmFsaWRhdGlvbkVycm9yLCBWYWxpZGF0aW9uUmVzdWx0IH0gZnJvbSAnLi90eXBlcy5qcyc7XG5cbmNvbnN0IENBUkRfU1RBVFVTRVMgPSBbJ2FjdGl2ZScsICdjb21wbGV0ZWQnXSBhcyBjb25zdCBzYXRpc2ZpZXMgcmVhZG9ubHkgQ2FyZFN0YXR1c1tdO1xuY29uc3QgTUFYX1NVTU1BUllfTEVOR1RIID0gMjAwO1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIHZhbHVlIGlzIGEgbm9uLW51bGwsIG5vbi1hcnJheSBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSk7XG59XG5cbi8qKlxuICogVmFsaWRhdGVzIGEgcmVxdWlyZWQgc3RyaW5nIGZpZWxkIGFuZCBhZGRzIGVycm9ycyBpZiBpbnZhbGlkLlxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZVJlcXVpcmVkU3RyaW5nKFxuICBvYmo6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBmaWVsZDogc3RyaW5nLFxuICBwYXRoOiBzdHJpbmcsXG4gIGNvbnRleHQ6IHN0cmluZyxcbiAgZXJyb3JzOiBGaWVsZFZhbGlkYXRpb25FcnJvcltdXG4pOiB2b2lkIHtcbiAgY29uc3QgdmFsdWUgPSBvYmpbZmllbGRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LiR7ZmllbGR9YCwgbWVzc2FnZTogYCR7ZmllbGR9IGlzIHJlcXVpcmVkIGZvciAke2NvbnRleHR9YCwgY29kZTogJ21pc3NpbmdfZmllbGQnIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS4ke2ZpZWxkfWAsIG1lc3NhZ2U6IGAke2ZpZWxkfSBtdXN0IGJlIGEgc3RyaW5nYCwgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgYSByZXF1aXJlZCBhcnJheSBmaWVsZCBhbmQgcmV0dXJucyB0aGUgYXJyYXkgaWYgdmFsaWQuXG4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlUmVxdWlyZWRBcnJheShcbiAgb2JqOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgZmllbGQ6IHN0cmluZyxcbiAgcGF0aDogc3RyaW5nLFxuICBjb250ZXh0OiBzdHJpbmcsXG4gIGVycm9yczogRmllbGRWYWxpZGF0aW9uRXJyb3JbXVxuKTogdW5rbm93bltdIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBvYmpbZmllbGRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LiR7ZmllbGR9YCwgbWVzc2FnZTogYCR7ZmllbGR9IGlzIHJlcXVpcmVkIGZvciAke2NvbnRleHR9YCwgY29kZTogJ21pc3NpbmdfZmllbGQnIH0pO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LiR7ZmllbGR9YCwgbWVzc2FnZTogYCR7ZmllbGR9IG11c3QgYmUgYW4gYXJyYXlgLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgYSBib2R5IGVsZW1lbnQgaW4gYW4gQWRhcHRpdmUgQ2FyZC5cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVCb2R5RWxlbWVudChlbGVtZW50OiB1bmtub3duLCBwYXRoOiBzdHJpbmcsIGVycm9yczogRmllbGRWYWxpZGF0aW9uRXJyb3JbXSk6IHZvaWQge1xuICBpZiAoIWlzT2JqZWN0KGVsZW1lbnQpKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogcGF0aCwgbWVzc2FnZTogJ2JvZHkgZWxlbWVudCBtdXN0IGJlIGFuIG9iamVjdCcsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGVsID0gZWxlbWVudDtcbiAgY29uc3QgZWxUeXBlID0gZWxbJ3R5cGUnXTtcblxuICBpZiAoZWxUeXBlID09PSB1bmRlZmluZWQgfHwgZWxUeXBlID09PSBudWxsKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7cGF0aH0udHlwZWAsIG1lc3NhZ2U6ICd0eXBlIGlzIHJlcXVpcmVkIGZvciBib2R5IGVsZW1lbnQnLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh0eXBlb2YgZWxUeXBlICE9PSAnc3RyaW5nJykge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LnR5cGVgLCBtZXNzYWdlOiAndHlwZSBtdXN0IGJlIGEgc3RyaW5nJywgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgc3dpdGNoIChlbFR5cGUpIHtcbiAgICBjYXNlICdUZXh0QmxvY2snOlxuICAgICAgdmFsaWRhdGVSZXF1aXJlZFN0cmluZyhlbCwgJ3RleHQnLCBwYXRoLCAnVGV4dEJsb2NrJywgZXJyb3JzKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnSW1hZ2UnOlxuICAgICAgdmFsaWRhdGVSZXF1aXJlZFN0cmluZyhlbCwgJ3VybCcsIHBhdGgsICdJbWFnZScsIGVycm9ycyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ0NvbnRhaW5lcic6IHtcbiAgICAgIGNvbnN0IGl0ZW1zID0gdmFsaWRhdGVSZXF1aXJlZEFycmF5KGVsLCAnaXRlbXMnLCBwYXRoLCAnQ29udGFpbmVyJywgZXJyb3JzKTtcbiAgICAgIGl0ZW1zPy5mb3JFYWNoKChpdGVtLCBpKSA9PiB7XG4gICAgICAgIHZhbGlkYXRlQm9keUVsZW1lbnQoaXRlbSwgYCR7cGF0aH0uaXRlbXNbJHtpfV1gLCBlcnJvcnMpO1xuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjYXNlICdDb2x1bW5TZXQnOiB7XG4gICAgICBjb25zdCBjb2x1bW5zID0gdmFsaWRhdGVSZXF1aXJlZEFycmF5KGVsLCAnY29sdW1ucycsIHBhdGgsICdDb2x1bW5TZXQnLCBlcnJvcnMpO1xuICAgICAgY29sdW1ucz8uZm9yRWFjaCgoY29sdW1uLCBpKSA9PiB7XG4gICAgICAgIGNvbnN0IGNvbFBhdGggPSBgJHtwYXRofS5jb2x1bW5zWyR7aX1dYDtcbiAgICAgICAgaWYgKCFpc09iamVjdChjb2x1bW4pKSB7XG4gICAgICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogY29sUGF0aCwgbWVzc2FnZTogJ2NvbHVtbiBtdXN0IGJlIGFuIG9iamVjdCcsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sdW1uWyd0eXBlJ10gIT09ICdDb2x1bW4nKSB7XG4gICAgICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7Y29sUGF0aH0udHlwZWAsIG1lc3NhZ2U6IFwiY29sdW1uIHR5cGUgbXVzdCBiZSAnQ29sdW1uJ1wiLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sdW1uWydpdGVtcyddICE9PSB1bmRlZmluZWQgJiYgY29sdW1uWydpdGVtcyddICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGNvbHVtblsnaXRlbXMnXSkpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke2NvbFBhdGh9Lml0ZW1zYCwgbWVzc2FnZTogJ2l0ZW1zIG11c3QgYmUgYW4gYXJyYXknLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgKGNvbHVtblsnaXRlbXMnXSBhcyB1bmtub3duW10pLmZvckVhY2goKGl0ZW0sIGopID0+IHtcbiAgICAgICAgICAgICAgdmFsaWRhdGVCb2R5RWxlbWVudChpdGVtLCBgJHtjb2xQYXRofS5pdGVtc1ske2p9XWAsIGVycm9ycyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY2FzZSAnQWN0aW9uU2V0Jzoge1xuICAgICAgY29uc3QgYWN0aW9ucyA9IHZhbGlkYXRlUmVxdWlyZWRBcnJheShlbCwgJ2FjdGlvbnMnLCBwYXRoLCAnQWN0aW9uU2V0JywgZXJyb3JzKTtcbiAgICAgIGFjdGlvbnM/LmZvckVhY2goKGFjdGlvbiwgaSkgPT4ge1xuICAgICAgICB2YWxpZGF0ZUFjdGlvbihhY3Rpb24sIGAke3BhdGh9LmFjdGlvbnNbJHtpfV1gLCBlcnJvcnMpO1xuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjYXNlICdGYWN0U2V0Jzoge1xuICAgICAgY29uc3QgZmFjdHMgPSB2YWxpZGF0ZVJlcXVpcmVkQXJyYXkoZWwsICdmYWN0cycsIHBhdGgsICdGYWN0U2V0JywgZXJyb3JzKTtcbiAgICAgIGZhY3RzPy5mb3JFYWNoKChmYWN0LCBpKSA9PiB7XG4gICAgICAgIGNvbnN0IGZhY3RQYXRoID0gYCR7cGF0aH0uZmFjdHNbJHtpfV1gO1xuICAgICAgICBpZiAoIWlzT2JqZWN0KGZhY3QpKSB7XG4gICAgICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogZmFjdFBhdGgsIG1lc3NhZ2U6ICdmYWN0IG11c3QgYmUgYW4gb2JqZWN0JywgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmYWN0Wyd0aXRsZSddID09PSB1bmRlZmluZWQgfHwgZmFjdFsndGl0bGUnXSA9PT0gbnVsbCkge1xuICAgICAgICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke2ZhY3RQYXRofS50aXRsZWAsIG1lc3NhZ2U6ICd0aXRsZSBpcyByZXF1aXJlZCBmb3IgZmFjdCcsIGNvZGU6ICdtaXNzaW5nX2ZpZWxkJyB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmFjdFsndmFsdWUnXSA9PT0gdW5kZWZpbmVkIHx8IGZhY3RbJ3ZhbHVlJ10gPT09IG51bGwpIHtcbiAgICAgICAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtmYWN0UGF0aH0udmFsdWVgLCBtZXNzYWdlOiAndmFsdWUgaXMgcmVxdWlyZWQgZm9yIGZhY3QnLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY2FzZSAnSW5wdXQuVGV4dCc6XG4gICAgY2FzZSAnSW5wdXQuTnVtYmVyJzpcbiAgICBjYXNlICdJbnB1dC5EYXRlJzpcbiAgICBjYXNlICdJbnB1dC5UaW1lJzpcbiAgICBjYXNlICdJbnB1dC5Ub2dnbGUnOlxuICAgIGNhc2UgJ0lucHV0LkNob2ljZVNldCc6XG4gICAgICB2YWxpZGF0ZVJlcXVpcmVkU3RyaW5nKGVsLCAnaWQnLCBwYXRoLCBlbFR5cGUsIGVycm9ycyk7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBVbmtub3duIGVsZW1lbnQgdHlwZSAtIGFsbG93IGZvciBmb3J3YXJkIGNvbXBhdGliaWxpdHlcbiAgICAgIGJyZWFrO1xuICB9XG59XG5cbi8qKlxuICogVmFsaWRhdGVzIGFuIGFjdGlvbiBpbiBhbiBBZGFwdGl2ZSBDYXJkLlxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZUFjdGlvbihhY3Rpb246IHVua25vd24sIHBhdGg6IHN0cmluZywgZXJyb3JzOiBGaWVsZFZhbGlkYXRpb25FcnJvcltdKTogdm9pZCB7XG4gIGlmICghaXNPYmplY3QoYWN0aW9uKSkge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IHBhdGgsIG1lc3NhZ2U6ICdhY3Rpb24gbXVzdCBiZSBhbiBvYmplY3QnLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBhY3QgPSBhY3Rpb247XG4gIGNvbnN0IGFjdFR5cGUgPSBhY3RbJ3R5cGUnXTtcblxuICBpZiAoYWN0VHlwZSA9PT0gdW5kZWZpbmVkIHx8IGFjdFR5cGUgPT09IG51bGwpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS50eXBlYCwgbWVzc2FnZTogJ3R5cGUgaXMgcmVxdWlyZWQgZm9yIGFjdGlvbicsIGNvZGU6ICdtaXNzaW5nX2ZpZWxkJyB9KTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHR5cGVvZiBhY3RUeXBlICE9PSAnc3RyaW5nJykge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LnR5cGVgLCBtZXNzYWdlOiAndHlwZSBtdXN0IGJlIGEgc3RyaW5nJywgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgc3dpdGNoIChhY3RUeXBlKSB7XG4gICAgY2FzZSAnQWN0aW9uLlN1Ym1pdCc6XG4gICAgICAvLyBObyByZXF1aXJlZCBmaWVsZHMgYmV5b25kIHR5cGVcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnQWN0aW9uLk9wZW5VcmwnOlxuICAgICAgdmFsaWRhdGVSZXF1aXJlZFN0cmluZyhhY3QsICd1cmwnLCBwYXRoLCAnQWN0aW9uLk9wZW5VcmwnLCBlcnJvcnMpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdBY3Rpb24uU2hvd0NhcmQnOiB7XG4gICAgICBjb25zdCBuZXN0ZWRDYXJkID0gYWN0WydjYXJkJ107XG4gICAgICBpZiAobmVzdGVkQ2FyZCA9PT0gdW5kZWZpbmVkIHx8IG5lc3RlZENhcmQgPT09IG51bGwpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7cGF0aH0uY2FyZGAsIG1lc3NhZ2U6ICdjYXJkIGlzIHJlcXVpcmVkIGZvciBBY3Rpb24uU2hvd0NhcmQnLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gICAgICB9IGVsc2UgaWYgKCFpc09iamVjdChuZXN0ZWRDYXJkKSkge1xuICAgICAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS5jYXJkYCwgbWVzc2FnZTogJ2NhcmQgbXVzdCBiZSBhbiBvYmplY3QnLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFZhbGlkYXRlIG5lc3RlZCBjYXJkIHR5cGVcbiAgICAgICAgaWYgKG5lc3RlZENhcmRbJ3R5cGUnXSA9PT0gdW5kZWZpbmVkIHx8IG5lc3RlZENhcmRbJ3R5cGUnXSA9PT0gbnVsbCkge1xuICAgICAgICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LmNhcmQudHlwZWAsIG1lc3NhZ2U6ICdjYXJkLnR5cGUgaXMgcmVxdWlyZWQnLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAobmVzdGVkQ2FyZFsndHlwZSddICE9PSAnQWRhcHRpdmVDYXJkJykge1xuICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgIGZpZWxkOiBgJHtwYXRofS5jYXJkLnR5cGVgLFxuICAgICAgICAgICAgbWVzc2FnZTogXCJjYXJkLnR5cGUgbXVzdCBiZSAnQWRhcHRpdmVDYXJkJ1wiLFxuICAgICAgICAgICAgY29kZTogJ2ludmFsaWRfdHlwZSdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFZhbGlkYXRlIG5lc3RlZCBjYXJkIGJvZHkgaWYgcHJlc2VudFxuICAgICAgICBpZiAobmVzdGVkQ2FyZFsnYm9keSddICE9PSB1bmRlZmluZWQgJiYgbmVzdGVkQ2FyZFsnYm9keSddICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG5lc3RlZENhcmRbJ2JvZHknXSkpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LmNhcmQuYm9keWAsIG1lc3NhZ2U6ICdjYXJkLmJvZHkgbXVzdCBiZSBhbiBhcnJheScsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAobmVzdGVkQ2FyZFsnYm9keSddIGFzIHVua25vd25bXSkuZm9yRWFjaCgoZWxlbWVudCwgaSkgPT4ge1xuICAgICAgICAgICAgICB2YWxpZGF0ZUJvZHlFbGVtZW50KGVsZW1lbnQsIGAke3BhdGh9LmNhcmQuYm9keVske2l9XWAsIGVycm9ycyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBWYWxpZGF0ZSBuZXN0ZWQgY2FyZCBhY3Rpb25zIGlmIHByZXNlbnRcbiAgICAgICAgaWYgKG5lc3RlZENhcmRbJ2FjdGlvbnMnXSAhPT0gdW5kZWZpbmVkICYmIG5lc3RlZENhcmRbJ2FjdGlvbnMnXSAhPT0gbnVsbCkge1xuICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShuZXN0ZWRDYXJkWydhY3Rpb25zJ10pKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICAgIGZpZWxkOiBgJHtwYXRofS5jYXJkLmFjdGlvbnNgLFxuICAgICAgICAgICAgICBtZXNzYWdlOiAnY2FyZC5hY3Rpb25zIG11c3QgYmUgYW4gYXJyYXknLFxuICAgICAgICAgICAgICBjb2RlOiAnaW52YWxpZF90eXBlJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIChuZXN0ZWRDYXJkWydhY3Rpb25zJ10gYXMgdW5rbm93bltdKS5mb3JFYWNoKChuZXN0ZWRBY3Rpb24sIGkpID0+IHtcbiAgICAgICAgICAgICAgdmFsaWRhdGVBY3Rpb24obmVzdGVkQWN0aW9uLCBgJHtwYXRofS5jYXJkLmFjdGlvbnNbJHtpfV1gLCBlcnJvcnMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjYXNlICdBY3Rpb24uVG9nZ2xlVmlzaWJpbGl0eSc6IHtcbiAgICAgIGNvbnN0IHRhcmdldHMgPSB2YWxpZGF0ZVJlcXVpcmVkQXJyYXkoYWN0LCAndGFyZ2V0RWxlbWVudHMnLCBwYXRoLCAnQWN0aW9uLlRvZ2dsZVZpc2liaWxpdHknLCBlcnJvcnMpO1xuICAgICAgdGFyZ2V0cz8uZm9yRWFjaCgodGFyZ2V0LCBpKSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgdGFyZ2V0ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgICAgIGZpZWxkOiBgJHtwYXRofS50YXJnZXRFbGVtZW50c1ske2l9XWAsXG4gICAgICAgICAgICBtZXNzYWdlOiAndGFyZ2V0RWxlbWVudCBtdXN0IGJlIGEgc3RyaW5nJyxcbiAgICAgICAgICAgIGNvZGU6ICdpbnZhbGlkX3R5cGUnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgZGVmYXVsdDpcbiAgICAgIC8vIFVua25vd24gYWN0aW9uIHR5cGUgLSBhbGxvdyBmb3IgZm9yd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICBicmVhaztcbiAgfVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyBvcHRpb25hbCBzdHJpbmcgZmllbGQgb24gYWRhcHRpdmUgY2FyZC5cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVPcHRpb25hbFN0cmluZyhcbiAgb2JqOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgZmllbGQ6IHN0cmluZyxcbiAgcGF0aDogc3RyaW5nLFxuICBlcnJvcnM6IEZpZWxkVmFsaWRhdGlvbkVycm9yW11cbik6IHZvaWQge1xuICBjb25zdCB2YWx1ZSA9IG9ialtmaWVsZF07XG4gIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS4ke2ZpZWxkfWAsIG1lc3NhZ2U6IGAke3BhdGh9LiR7ZmllbGR9IG11c3QgYmUgYSBzdHJpbmdgLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyBvcHRpb25hbCBhcnJheSBmaWVsZCBvbiBhZGFwdGl2ZSBjYXJkIGFuZCByZXR1cm5zIGl0IGlmIHZhbGlkLlxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZU9wdGlvbmFsQXJyYXkoXG4gIG9iajogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGZpZWxkOiBzdHJpbmcsXG4gIHBhdGg6IHN0cmluZyxcbiAgZXJyb3JzOiBGaWVsZFZhbGlkYXRpb25FcnJvcltdXG4pOiB1bmtub3duW10gfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IG9ialtmaWVsZF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7cGF0aH0uJHtmaWVsZH1gLCBtZXNzYWdlOiBgJHtwYXRofS4ke2ZpZWxkfSBtdXN0IGJlIGFuIGFycmF5YCwgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmNvbnN0IFNFTVZFUl9QQVRURVJOID0gL15cXGQrXFwuXFxkKyhcXC5cXGQrKT8kLztcblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhlIGlubmVyIEFkYXB0aXZlIENhcmQgc2NoZW1hLlxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZUFkYXB0aXZlQ2FyZFNjaGVtYShcbiAgYWRhcHRpdmVDYXJkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgY2FyZFN0YXR1czogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICBlcnJvcnM6IEZpZWxkVmFsaWRhdGlvbkVycm9yW11cbik6IHZvaWQge1xuICAvLyB0eXBlIGlzIHJlcXVpcmVkIGFuZCBtdXN0IGJlICdBZGFwdGl2ZUNhcmQnXG4gIGlmIChhZGFwdGl2ZUNhcmRbJ3R5cGUnXSA9PT0gdW5kZWZpbmVkIHx8IGFkYXB0aXZlQ2FyZFsndHlwZSddID09PSBudWxsKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogJ2NhcmQudHlwZScsIG1lc3NhZ2U6ICdjYXJkLnR5cGUgaXMgcmVxdWlyZWQnLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gIH0gZWxzZSBpZiAoYWRhcHRpdmVDYXJkWyd0eXBlJ10gIT09ICdBZGFwdGl2ZUNhcmQnKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogJ2NhcmQudHlwZScsIG1lc3NhZ2U6IFwiY2FyZC50eXBlIG11c3QgYmUgJ0FkYXB0aXZlQ2FyZCdcIiwgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gIH1cblxuICB2YWxpZGF0ZU9wdGlvbmFsU3RyaW5nKGFkYXB0aXZlQ2FyZCwgJ3ZlcnNpb24nLCAnY2FyZCcsIGVycm9ycyk7XG5cbiAgY29uc3QgYm9keSA9IHZhbGlkYXRlT3B0aW9uYWxBcnJheShhZGFwdGl2ZUNhcmQsICdib2R5JywgJ2NhcmQnLCBlcnJvcnMpO1xuICBib2R5Py5mb3JFYWNoKChlbGVtZW50LCBpKSA9PiB7XG4gICAgdmFsaWRhdGVCb2R5RWxlbWVudChlbGVtZW50LCBgY2FyZC5ib2R5WyR7aX1dYCwgZXJyb3JzKTtcbiAgfSk7XG5cbiAgY29uc3QgYWN0aW9ucyA9IHZhbGlkYXRlT3B0aW9uYWxBcnJheShhZGFwdGl2ZUNhcmQsICdhY3Rpb25zJywgJ2NhcmQnLCBlcnJvcnMpO1xuICBhY3Rpb25zPy5mb3JFYWNoKChhY3Rpb24sIGkpID0+IHtcbiAgICB2YWxpZGF0ZUFjdGlvbihhY3Rpb24sIGBjYXJkLmFjdGlvbnNbJHtpfV1gLCBlcnJvcnMpO1xuICB9KTtcblxuICAvLyAkc2NoZW1hIGlzIG9wdGlvbmFsIGJ1dCBtdXN0IGJlIHZhbGlkIFVSTCBpZiBwcmVzZW50XG4gIGNvbnN0IHNjaGVtYSA9IGFkYXB0aXZlQ2FyZFsnJHNjaGVtYSddO1xuICBpZiAoc2NoZW1hICE9PSB1bmRlZmluZWQgJiYgc2NoZW1hICE9PSBudWxsKSB7XG4gICAgaWYgKHR5cGVvZiBzY2hlbWEgIT09ICdzdHJpbmcnKSB7XG4gICAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiAnY2FyZC4kc2NoZW1hJywgbWVzc2FnZTogJ2NhcmQuJHNjaGVtYSBtdXN0IGJlIGEgc3RyaW5nJywgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBVUkwoc2NoZW1hKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIC8vIFR5cGVFcnJvciBpcyB0aHJvd24gZm9yIGludmFsaWQgVVJMcyAtIHRoaXMgaXMgdGhlIGV4cGVjdGVkIHZhbGlkYXRpb24gZmFpbHVyZVxuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBUeXBlRXJyb3IpIHtcbiAgICAgICAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiAnY2FyZC4kc2NoZW1hJywgbWVzc2FnZTogJ2NhcmQuJHNjaGVtYSBtdXN0IGJlIGEgdmFsaWQgVVJMJywgY29kZTogJ2ludmFsaWRfZm9ybWF0JyB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIG1pblZlcnNpb24gaXMgb3B0aW9uYWwgYnV0IG11c3QgYmUgc2VtdmVyIGZvcm1hdCBpZiBwcmVzZW50XG4gIGNvbnN0IG1pblZlcnNpb24gPSBhZGFwdGl2ZUNhcmRbJ21pblZlcnNpb24nXTtcbiAgaWYgKG1pblZlcnNpb24gIT09IHVuZGVmaW5lZCAmJiBtaW5WZXJzaW9uICE9PSBudWxsKSB7XG4gICAgaWYgKHR5cGVvZiBtaW5WZXJzaW9uICE9PSAnc3RyaW5nJykge1xuICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogJ2NhcmQubWluVmVyc2lvbicsIG1lc3NhZ2U6ICdjYXJkLm1pblZlcnNpb24gbXVzdCBiZSBhIHN0cmluZycsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgIH0gZWxzZSBpZiAoIVNFTVZFUl9QQVRURVJOLnRlc3QobWluVmVyc2lvbikpIHtcbiAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgZmllbGQ6ICdjYXJkLm1pblZlcnNpb24nLFxuICAgICAgICBtZXNzYWdlOiAnY2FyZC5taW5WZXJzaW9uIG11c3QgYmUgaW4gc2VtdmVyIGZvcm1hdCAoZS5nLiwgMS41IG9yIDEuNS4wKScsXG4gICAgICAgIGNvZGU6ICdpbnZhbGlkX2Zvcm1hdCdcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIENyb3NzLWZpZWxkOiB3YXJuIHdoZW4gc3RhdHVzIGlzIGFjdGl2ZSBidXQgbm8gYWN0aW9uc1xuICBpZiAoY2FyZFN0YXR1cyA9PT0gJ2FjdGl2ZScgJiYgQXJyYXkuaXNBcnJheShhY3Rpb25zKSAmJiBhY3Rpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAnY2FyZC5hY3Rpb25zJyxcbiAgICAgIG1lc3NhZ2U6ICdDYXJkIHdpdGggXCJhY3RpdmVcIiBzdGF0dXMgc2hvdWxkIGhhdmUgYXQgbGVhc3Qgb25lIGFjdGlvbicsXG4gICAgICBjb2RlOiAnd2FybmluZ19hY3RpdmVfd2l0aG91dF9hY3Rpb25zJ1xuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogVmFsaWRhdGVzIGFuIEFkYXB0aXZlIENhcmQgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSBjYXJkIC0gVGhlIGNhcmQgb2JqZWN0IHRvIHZhbGlkYXRlXG4gKiBAcmV0dXJucyBWYWxpZGF0aW9uUmVzdWx0IGluZGljYXRpbmcgc3VjY2VzcyBvciBmYWlsdXJlIHdpdGggZXJyb3JzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNhcmQoY2FyZDogQ2FyZCk6IFZhbGlkYXRpb25SZXN1bHQge1xuICBjb25zdCBlcnJvcnM6IEZpZWxkVmFsaWRhdGlvbkVycm9yW10gPSBbXTtcblxuICAvLyBWYWxpZGF0ZSBpZCBmaWVsZFxuICBpZiAoY2FyZC5pZCA9PT0gdW5kZWZpbmVkIHx8IGNhcmQuaWQgPT09IG51bGwpIHtcbiAgICBlcnJvcnMucHVzaCh7XG4gICAgICBmaWVsZDogJ2lkJyxcbiAgICAgIG1lc3NhZ2U6ICdpZCBpcyByZXF1aXJlZCcsXG4gICAgICBjb2RlOiAnbWlzc2luZ19maWVsZCdcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgY2FyZC5pZCAhPT0gJ3N0cmluZycpIHtcbiAgICBlcnJvcnMucHVzaCh7XG4gICAgICBmaWVsZDogJ2lkJyxcbiAgICAgIG1lc3NhZ2U6ICdpZCBtdXN0IGJlIGEgc3RyaW5nJyxcbiAgICAgIGNvZGU6ICdpbnZhbGlkX3R5cGUnLFxuICAgICAgZXhwZWN0ZWRUeXBlOiAnc3RyaW5nJ1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKGNhcmQuaWQudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAnaWQnLFxuICAgICAgbWVzc2FnZTogJ2lkIG11c3Qgbm90IGJlIGVtcHR5JyxcbiAgICAgIGNvZGU6ICdpbnZhbGlkX2Zvcm1hdCcsXG4gICAgICBzdWdnZXN0aW9uOiAnUHJvdmlkZSBhIG5vbi1lbXB0eSB2YWx1ZSdcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFZhbGlkYXRlIHN1bW1hcnkgd2l0aCBsZW5ndGggY29uc3RyYWludFxuICBpZiAoY2FyZC5zdW1tYXJ5ID09PSB1bmRlZmluZWQgfHwgY2FyZC5zdW1tYXJ5ID09PSBudWxsKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogJ3N1bW1hcnknLCBtZXNzYWdlOiAnc3VtbWFyeSBpcyByZXF1aXJlZCcsIGNvZGU6ICdtaXNzaW5nX2ZpZWxkJyB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgY2FyZC5zdW1tYXJ5ICE9PSAnc3RyaW5nJykge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAnc3VtbWFyeScsXG4gICAgICBtZXNzYWdlOiAnc3VtbWFyeSBtdXN0IGJlIGEgc3RyaW5nJyxcbiAgICAgIGNvZGU6ICdpbnZhbGlkX3R5cGUnLFxuICAgICAgZXhwZWN0ZWRUeXBlOiAnc3RyaW5nJ1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKGNhcmQuc3VtbWFyeS50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgZXJyb3JzLnB1c2goe1xuICAgICAgZmllbGQ6ICdzdW1tYXJ5JyxcbiAgICAgIG1lc3NhZ2U6ICdzdW1tYXJ5IG11c3Qgbm90IGJlIGVtcHR5JyxcbiAgICAgIGNvZGU6ICdpbnZhbGlkX2Zvcm1hdCcsXG4gICAgICBzdWdnZXN0aW9uOiAnUHJvdmlkZSBhIG5vbi1lbXB0eSB2YWx1ZSdcbiAgICB9KTtcbiAgfSBlbHNlIGlmIChjYXJkLnN1bW1hcnkubGVuZ3RoID4gTUFYX1NVTU1BUllfTEVOR1RIKSB7XG4gICAgZXJyb3JzLnB1c2goe1xuICAgICAgZmllbGQ6ICdzdW1tYXJ5JyxcbiAgICAgIG1lc3NhZ2U6IGBzdW1tYXJ5IG11c3Qgbm90IGV4Y2VlZCAke01BWF9TVU1NQVJZX0xFTkdUSH0gY2hhcmFjdGVyc2AsXG4gICAgICBjb2RlOiAnbGVuZ3RoX2V4Y2VlZGVkJyxcbiAgICAgIHN1Z2dlc3Rpb246IGBTaG9ydGVuIHRvICR7TUFYX1NVTU1BUllfTEVOR1RIfSBjaGFyYWN0ZXJzIG9yIGxlc3NgXG4gICAgfSk7XG4gIH1cblxuICAvLyBWYWxpZGF0ZSBhdXRob3IgZmllbGRcbiAgaWYgKGNhcmQuYXV0aG9yID09PSB1bmRlZmluZWQgfHwgY2FyZC5hdXRob3IgPT09IG51bGwpIHtcbiAgICBlcnJvcnMucHVzaCh7XG4gICAgICBmaWVsZDogJ2F1dGhvcicsXG4gICAgICBtZXNzYWdlOiAnYXV0aG9yIGlzIHJlcXVpcmVkJyxcbiAgICAgIGNvZGU6ICdtaXNzaW5nX2ZpZWxkJ1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBjYXJkLmF1dGhvciAhPT0gJ3N0cmluZycpIHtcbiAgICBlcnJvcnMucHVzaCh7XG4gICAgICBmaWVsZDogJ2F1dGhvcicsXG4gICAgICBtZXNzYWdlOiAnYXV0aG9yIG11c3QgYmUgYSBzdHJpbmcnLFxuICAgICAgY29kZTogJ2ludmFsaWRfdHlwZScsXG4gICAgICBleHBlY3RlZFR5cGU6ICdzdHJpbmcnXG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoY2FyZC5hdXRob3IudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAnYXV0aG9yJyxcbiAgICAgIG1lc3NhZ2U6ICdhdXRob3IgbXVzdCBub3QgYmUgZW1wdHknLFxuICAgICAgY29kZTogJ2ludmFsaWRfZm9ybWF0JyxcbiAgICAgIHN1Z2dlc3Rpb246ICdQcm92aWRlIGEgbm9uLWVtcHR5IHZhbHVlJ1xuICAgIH0pO1xuICB9XG5cbiAgLy8gVmFsaWRhdGUgc3RhdHVzIGZpZWxkXG4gIGlmIChjYXJkLnN0YXR1cyA9PT0gdW5kZWZpbmVkIHx8IGNhcmQuc3RhdHVzID09PSBudWxsKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogJ3N0YXR1cycsIG1lc3NhZ2U6ICdzdGF0dXMgaXMgcmVxdWlyZWQnLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNhcmQuc3RhdHVzICE9PSAnc3RyaW5nJykge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAnc3RhdHVzJyxcbiAgICAgIG1lc3NhZ2U6ICdzdGF0dXMgbXVzdCBiZSBhIHN0cmluZycsXG4gICAgICBjb2RlOiAnaW52YWxpZF90eXBlJ1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKCFDQVJEX1NUQVRVU0VTLmluY2x1ZGVzKGNhcmQuc3RhdHVzIGFzICh0eXBlb2YgQ0FSRF9TVEFUVVNFUylbbnVtYmVyXSkpIHtcbiAgICBlcnJvcnMucHVzaCh7XG4gICAgICBmaWVsZDogJ3N0YXR1cycsXG4gICAgICBtZXNzYWdlOiBgc3RhdHVzIG11c3QgYmUgb25lIG9mOiAke0NBUkRfU1RBVFVTRVMuam9pbignLCAnKX1gLFxuICAgICAgY29kZTogJ2ludmFsaWRfc3RhdHVzJyxcbiAgICAgIGF2YWlsYWJsZVZhbHVlczogQ0FSRF9TVEFUVVNFU1xuICAgIH0pO1xuICB9XG5cbiAgLy8gVmFsaWRhdGUgY2FyZCBmaWVsZFxuICBpZiAoY2FyZC5jYXJkID09PSB1bmRlZmluZWQgfHwgY2FyZC5jYXJkID09PSBudWxsKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogJ2NhcmQnLCBtZXNzYWdlOiAnY2FyZCBpcyByZXF1aXJlZCcsIGNvZGU6ICdtaXNzaW5nX2ZpZWxkJyB9KTtcbiAgfSBlbHNlIGlmICghaXNPYmplY3QoY2FyZC5jYXJkKSkge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6ICdjYXJkJywgbWVzc2FnZTogJ2NhcmQgbXVzdCBiZSBhbiBvYmplY3QnLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgfSBlbHNlIHtcbiAgICB2YWxpZGF0ZUFkYXB0aXZlQ2FyZFNjaGVtYShjYXJkLmNhcmQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4sIGNhcmQuc3RhdHVzLCBlcnJvcnMpO1xuICB9XG5cbiAgLy8gQ3Jvc3MtZmllbGQ6IHdhcm4gd2hlbiBzdGF0dXMgaXMgY29tcGxldGVkIGJ1dCBubyBvdXRwdXRcbiAgaWYgKGNhcmQuc3RhdHVzID09PSAnY29tcGxldGVkJyAmJiAoY2FyZC5vdXRwdXQgPT09IHVuZGVmaW5lZCB8fCBjYXJkLm91dHB1dCA9PT0gbnVsbCkpIHtcbiAgICBlcnJvcnMucHVzaCh7XG4gICAgICBmaWVsZDogJ291dHB1dCcsXG4gICAgICBtZXNzYWdlOiAnQ2FyZCB3aXRoIFwiY29tcGxldGVkXCIgc3RhdHVzIHNob3VsZCBoYXZlIG91dHB1dCBkZWZpbmVkJyxcbiAgICAgIGNvZGU6ICd3YXJuaW5nX2NvbXBsZXRlZF93aXRob3V0X291dHB1dCdcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7IHZhbGlkOiBlcnJvcnMubGVuZ3RoID09PSAwLCBlcnJvcnMgfTtcbn1cbiIsICJcbi8qISBqcy15YW1sIDQuMS4xIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlY2EvanMteWFtbCBAbGljZW5zZSBNSVQgKi9cbmZ1bmN0aW9uIGlzTm90aGluZyhzdWJqZWN0KSB7XG4gIHJldHVybiAodHlwZW9mIHN1YmplY3QgPT09ICd1bmRlZmluZWQnKSB8fCAoc3ViamVjdCA9PT0gbnVsbCk7XG59XG5cblxuZnVuY3Rpb24gaXNPYmplY3Qoc3ViamVjdCkge1xuICByZXR1cm4gKHR5cGVvZiBzdWJqZWN0ID09PSAnb2JqZWN0JykgJiYgKHN1YmplY3QgIT09IG51bGwpO1xufVxuXG5cbmZ1bmN0aW9uIHRvQXJyYXkoc2VxdWVuY2UpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoc2VxdWVuY2UpKSByZXR1cm4gc2VxdWVuY2U7XG4gIGVsc2UgaWYgKGlzTm90aGluZyhzZXF1ZW5jZSkpIHJldHVybiBbXTtcblxuICByZXR1cm4gWyBzZXF1ZW5jZSBdO1xufVxuXG5cbmZ1bmN0aW9uIGV4dGVuZCh0YXJnZXQsIHNvdXJjZSkge1xuICB2YXIgaW5kZXgsIGxlbmd0aCwga2V5LCBzb3VyY2VLZXlzO1xuXG4gIGlmIChzb3VyY2UpIHtcbiAgICBzb3VyY2VLZXlzID0gT2JqZWN0LmtleXMoc291cmNlKTtcblxuICAgIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBzb3VyY2VLZXlzLmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICAgIGtleSA9IHNvdXJjZUtleXNbaW5kZXhdO1xuICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGFyZ2V0O1xufVxuXG5cbmZ1bmN0aW9uIHJlcGVhdChzdHJpbmcsIGNvdW50KSB7XG4gIHZhciByZXN1bHQgPSAnJywgY3ljbGU7XG5cbiAgZm9yIChjeWNsZSA9IDA7IGN5Y2xlIDwgY291bnQ7IGN5Y2xlICs9IDEpIHtcbiAgICByZXN1bHQgKz0gc3RyaW5nO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuXG5mdW5jdGlvbiBpc05lZ2F0aXZlWmVybyhudW1iZXIpIHtcbiAgcmV0dXJuIChudW1iZXIgPT09IDApICYmIChOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFkgPT09IDEgLyBudW1iZXIpO1xufVxuXG5cbnZhciBpc05vdGhpbmdfMSAgICAgID0gaXNOb3RoaW5nO1xudmFyIGlzT2JqZWN0XzEgICAgICAgPSBpc09iamVjdDtcbnZhciB0b0FycmF5XzEgICAgICAgID0gdG9BcnJheTtcbnZhciByZXBlYXRfMSAgICAgICAgID0gcmVwZWF0O1xudmFyIGlzTmVnYXRpdmVaZXJvXzEgPSBpc05lZ2F0aXZlWmVybztcbnZhciBleHRlbmRfMSAgICAgICAgID0gZXh0ZW5kO1xuXG52YXIgY29tbW9uID0ge1xuXHRpc05vdGhpbmc6IGlzTm90aGluZ18xLFxuXHRpc09iamVjdDogaXNPYmplY3RfMSxcblx0dG9BcnJheTogdG9BcnJheV8xLFxuXHRyZXBlYXQ6IHJlcGVhdF8xLFxuXHRpc05lZ2F0aXZlWmVybzogaXNOZWdhdGl2ZVplcm9fMSxcblx0ZXh0ZW5kOiBleHRlbmRfMVxufTtcblxuLy8gWUFNTCBlcnJvciBjbGFzcy4gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy84NDU4OTg0XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IoZXhjZXB0aW9uLCBjb21wYWN0KSB7XG4gIHZhciB3aGVyZSA9ICcnLCBtZXNzYWdlID0gZXhjZXB0aW9uLnJlYXNvbiB8fCAnKHVua25vd24gcmVhc29uKSc7XG5cbiAgaWYgKCFleGNlcHRpb24ubWFyaykgcmV0dXJuIG1lc3NhZ2U7XG5cbiAgaWYgKGV4Y2VwdGlvbi5tYXJrLm5hbWUpIHtcbiAgICB3aGVyZSArPSAnaW4gXCInICsgZXhjZXB0aW9uLm1hcmsubmFtZSArICdcIiAnO1xuICB9XG5cbiAgd2hlcmUgKz0gJygnICsgKGV4Y2VwdGlvbi5tYXJrLmxpbmUgKyAxKSArICc6JyArIChleGNlcHRpb24ubWFyay5jb2x1bW4gKyAxKSArICcpJztcblxuICBpZiAoIWNvbXBhY3QgJiYgZXhjZXB0aW9uLm1hcmsuc25pcHBldCkge1xuICAgIHdoZXJlICs9ICdcXG5cXG4nICsgZXhjZXB0aW9uLm1hcmsuc25pcHBldDtcbiAgfVxuXG4gIHJldHVybiBtZXNzYWdlICsgJyAnICsgd2hlcmU7XG59XG5cblxuZnVuY3Rpb24gWUFNTEV4Y2VwdGlvbiQxKHJlYXNvbiwgbWFyaykge1xuICAvLyBTdXBlciBjb25zdHJ1Y3RvclxuICBFcnJvci5jYWxsKHRoaXMpO1xuXG4gIHRoaXMubmFtZSA9ICdZQU1MRXhjZXB0aW9uJztcbiAgdGhpcy5yZWFzb24gPSByZWFzb247XG4gIHRoaXMubWFyayA9IG1hcms7XG4gIHRoaXMubWVzc2FnZSA9IGZvcm1hdEVycm9yKHRoaXMsIGZhbHNlKTtcblxuICAvLyBJbmNsdWRlIHN0YWNrIHRyYWNlIGluIGVycm9yIG9iamVjdFxuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICAvLyBDaHJvbWUgYW5kIE5vZGVKU1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuICB9IGVsc2Uge1xuICAgIC8vIEZGLCBJRSAxMCsgYW5kIFNhZmFyaSA2Ky4gRmFsbGJhY2sgZm9yIG90aGVyc1xuICAgIHRoaXMuc3RhY2sgPSAobmV3IEVycm9yKCkpLnN0YWNrIHx8ICcnO1xuICB9XG59XG5cblxuLy8gSW5oZXJpdCBmcm9tIEVycm9yXG5ZQU1MRXhjZXB0aW9uJDEucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFcnJvci5wcm90b3R5cGUpO1xuWUFNTEV4Y2VwdGlvbiQxLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFlBTUxFeGNlcHRpb24kMTtcblxuXG5ZQU1MRXhjZXB0aW9uJDEucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoY29tcGFjdCkge1xuICByZXR1cm4gdGhpcy5uYW1lICsgJzogJyArIGZvcm1hdEVycm9yKHRoaXMsIGNvbXBhY3QpO1xufTtcblxuXG52YXIgZXhjZXB0aW9uID0gWUFNTEV4Y2VwdGlvbiQxO1xuXG4vLyBnZXQgc25pcHBldCBmb3IgYSBzaW5nbGUgbGluZSwgcmVzcGVjdGluZyBtYXhMZW5ndGhcbmZ1bmN0aW9uIGdldExpbmUoYnVmZmVyLCBsaW5lU3RhcnQsIGxpbmVFbmQsIHBvc2l0aW9uLCBtYXhMaW5lTGVuZ3RoKSB7XG4gIHZhciBoZWFkID0gJyc7XG4gIHZhciB0YWlsID0gJyc7XG4gIHZhciBtYXhIYWxmTGVuZ3RoID0gTWF0aC5mbG9vcihtYXhMaW5lTGVuZ3RoIC8gMikgLSAxO1xuXG4gIGlmIChwb3NpdGlvbiAtIGxpbmVTdGFydCA+IG1heEhhbGZMZW5ndGgpIHtcbiAgICBoZWFkID0gJyAuLi4gJztcbiAgICBsaW5lU3RhcnQgPSBwb3NpdGlvbiAtIG1heEhhbGZMZW5ndGggKyBoZWFkLmxlbmd0aDtcbiAgfVxuXG4gIGlmIChsaW5lRW5kIC0gcG9zaXRpb24gPiBtYXhIYWxmTGVuZ3RoKSB7XG4gICAgdGFpbCA9ICcgLi4uJztcbiAgICBsaW5lRW5kID0gcG9zaXRpb24gKyBtYXhIYWxmTGVuZ3RoIC0gdGFpbC5sZW5ndGg7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHN0cjogaGVhZCArIGJ1ZmZlci5zbGljZShsaW5lU3RhcnQsIGxpbmVFbmQpLnJlcGxhY2UoL1xcdC9nLCAnXHUyMTkyJykgKyB0YWlsLFxuICAgIHBvczogcG9zaXRpb24gLSBsaW5lU3RhcnQgKyBoZWFkLmxlbmd0aCAvLyByZWxhdGl2ZSBwb3NpdGlvblxuICB9O1xufVxuXG5cbmZ1bmN0aW9uIHBhZFN0YXJ0KHN0cmluZywgbWF4KSB7XG4gIHJldHVybiBjb21tb24ucmVwZWF0KCcgJywgbWF4IC0gc3RyaW5nLmxlbmd0aCkgKyBzdHJpbmc7XG59XG5cblxuZnVuY3Rpb24gbWFrZVNuaXBwZXQobWFyaywgb3B0aW9ucykge1xuICBvcHRpb25zID0gT2JqZWN0LmNyZWF0ZShvcHRpb25zIHx8IG51bGwpO1xuXG4gIGlmICghbWFyay5idWZmZXIpIHJldHVybiBudWxsO1xuXG4gIGlmICghb3B0aW9ucy5tYXhMZW5ndGgpIG9wdGlvbnMubWF4TGVuZ3RoID0gNzk7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucy5pbmRlbnQgICAgICAhPT0gJ251bWJlcicpIG9wdGlvbnMuaW5kZW50ICAgICAgPSAxO1xuICBpZiAodHlwZW9mIG9wdGlvbnMubGluZXNCZWZvcmUgIT09ICdudW1iZXInKSBvcHRpb25zLmxpbmVzQmVmb3JlID0gMztcbiAgaWYgKHR5cGVvZiBvcHRpb25zLmxpbmVzQWZ0ZXIgICE9PSAnbnVtYmVyJykgb3B0aW9ucy5saW5lc0FmdGVyICA9IDI7XG5cbiAgdmFyIHJlID0gL1xccj9cXG58XFxyfFxcMC9nO1xuICB2YXIgbGluZVN0YXJ0cyA9IFsgMCBdO1xuICB2YXIgbGluZUVuZHMgPSBbXTtcbiAgdmFyIG1hdGNoO1xuICB2YXIgZm91bmRMaW5lTm8gPSAtMTtcblxuICB3aGlsZSAoKG1hdGNoID0gcmUuZXhlYyhtYXJrLmJ1ZmZlcikpKSB7XG4gICAgbGluZUVuZHMucHVzaChtYXRjaC5pbmRleCk7XG4gICAgbGluZVN0YXJ0cy5wdXNoKG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoKTtcblxuICAgIGlmIChtYXJrLnBvc2l0aW9uIDw9IG1hdGNoLmluZGV4ICYmIGZvdW5kTGluZU5vIDwgMCkge1xuICAgICAgZm91bmRMaW5lTm8gPSBsaW5lU3RhcnRzLmxlbmd0aCAtIDI7XG4gICAgfVxuICB9XG5cbiAgaWYgKGZvdW5kTGluZU5vIDwgMCkgZm91bmRMaW5lTm8gPSBsaW5lU3RhcnRzLmxlbmd0aCAtIDE7XG5cbiAgdmFyIHJlc3VsdCA9ICcnLCBpLCBsaW5lO1xuICB2YXIgbGluZU5vTGVuZ3RoID0gTWF0aC5taW4obWFyay5saW5lICsgb3B0aW9ucy5saW5lc0FmdGVyLCBsaW5lRW5kcy5sZW5ndGgpLnRvU3RyaW5nKCkubGVuZ3RoO1xuICB2YXIgbWF4TGluZUxlbmd0aCA9IG9wdGlvbnMubWF4TGVuZ3RoIC0gKG9wdGlvbnMuaW5kZW50ICsgbGluZU5vTGVuZ3RoICsgMyk7XG5cbiAgZm9yIChpID0gMTsgaSA8PSBvcHRpb25zLmxpbmVzQmVmb3JlOyBpKyspIHtcbiAgICBpZiAoZm91bmRMaW5lTm8gLSBpIDwgMCkgYnJlYWs7XG4gICAgbGluZSA9IGdldExpbmUoXG4gICAgICBtYXJrLmJ1ZmZlcixcbiAgICAgIGxpbmVTdGFydHNbZm91bmRMaW5lTm8gLSBpXSxcbiAgICAgIGxpbmVFbmRzW2ZvdW5kTGluZU5vIC0gaV0sXG4gICAgICBtYXJrLnBvc2l0aW9uIC0gKGxpbmVTdGFydHNbZm91bmRMaW5lTm9dIC0gbGluZVN0YXJ0c1tmb3VuZExpbmVObyAtIGldKSxcbiAgICAgIG1heExpbmVMZW5ndGhcbiAgICApO1xuICAgIHJlc3VsdCA9IGNvbW1vbi5yZXBlYXQoJyAnLCBvcHRpb25zLmluZGVudCkgKyBwYWRTdGFydCgobWFyay5saW5lIC0gaSArIDEpLnRvU3RyaW5nKCksIGxpbmVOb0xlbmd0aCkgK1xuICAgICAgJyB8ICcgKyBsaW5lLnN0ciArICdcXG4nICsgcmVzdWx0O1xuICB9XG5cbiAgbGluZSA9IGdldExpbmUobWFyay5idWZmZXIsIGxpbmVTdGFydHNbZm91bmRMaW5lTm9dLCBsaW5lRW5kc1tmb3VuZExpbmVOb10sIG1hcmsucG9zaXRpb24sIG1heExpbmVMZW5ndGgpO1xuICByZXN1bHQgKz0gY29tbW9uLnJlcGVhdCgnICcsIG9wdGlvbnMuaW5kZW50KSArIHBhZFN0YXJ0KChtYXJrLmxpbmUgKyAxKS50b1N0cmluZygpLCBsaW5lTm9MZW5ndGgpICtcbiAgICAnIHwgJyArIGxpbmUuc3RyICsgJ1xcbic7XG4gIHJlc3VsdCArPSBjb21tb24ucmVwZWF0KCctJywgb3B0aW9ucy5pbmRlbnQgKyBsaW5lTm9MZW5ndGggKyAzICsgbGluZS5wb3MpICsgJ14nICsgJ1xcbic7XG5cbiAgZm9yIChpID0gMTsgaSA8PSBvcHRpb25zLmxpbmVzQWZ0ZXI7IGkrKykge1xuICAgIGlmIChmb3VuZExpbmVObyArIGkgPj0gbGluZUVuZHMubGVuZ3RoKSBicmVhaztcbiAgICBsaW5lID0gZ2V0TGluZShcbiAgICAgIG1hcmsuYnVmZmVyLFxuICAgICAgbGluZVN0YXJ0c1tmb3VuZExpbmVObyArIGldLFxuICAgICAgbGluZUVuZHNbZm91bmRMaW5lTm8gKyBpXSxcbiAgICAgIG1hcmsucG9zaXRpb24gLSAobGluZVN0YXJ0c1tmb3VuZExpbmVOb10gLSBsaW5lU3RhcnRzW2ZvdW5kTGluZU5vICsgaV0pLFxuICAgICAgbWF4TGluZUxlbmd0aFxuICAgICk7XG4gICAgcmVzdWx0ICs9IGNvbW1vbi5yZXBlYXQoJyAnLCBvcHRpb25zLmluZGVudCkgKyBwYWRTdGFydCgobWFyay5saW5lICsgaSArIDEpLnRvU3RyaW5nKCksIGxpbmVOb0xlbmd0aCkgK1xuICAgICAgJyB8ICcgKyBsaW5lLnN0ciArICdcXG4nO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdC5yZXBsYWNlKC9cXG4kLywgJycpO1xufVxuXG5cbnZhciBzbmlwcGV0ID0gbWFrZVNuaXBwZXQ7XG5cbnZhciBUWVBFX0NPTlNUUlVDVE9SX09QVElPTlMgPSBbXG4gICdraW5kJyxcbiAgJ211bHRpJyxcbiAgJ3Jlc29sdmUnLFxuICAnY29uc3RydWN0JyxcbiAgJ2luc3RhbmNlT2YnLFxuICAncHJlZGljYXRlJyxcbiAgJ3JlcHJlc2VudCcsXG4gICdyZXByZXNlbnROYW1lJyxcbiAgJ2RlZmF1bHRTdHlsZScsXG4gICdzdHlsZUFsaWFzZXMnXG5dO1xuXG52YXIgWUFNTF9OT0RFX0tJTkRTID0gW1xuICAnc2NhbGFyJyxcbiAgJ3NlcXVlbmNlJyxcbiAgJ21hcHBpbmcnXG5dO1xuXG5mdW5jdGlvbiBjb21waWxlU3R5bGVBbGlhc2VzKG1hcCkge1xuICB2YXIgcmVzdWx0ID0ge307XG5cbiAgaWYgKG1hcCAhPT0gbnVsbCkge1xuICAgIE9iamVjdC5rZXlzKG1hcCkuZm9yRWFjaChmdW5jdGlvbiAoc3R5bGUpIHtcbiAgICAgIG1hcFtzdHlsZV0uZm9yRWFjaChmdW5jdGlvbiAoYWxpYXMpIHtcbiAgICAgICAgcmVzdWx0W1N0cmluZyhhbGlhcyldID0gc3R5bGU7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIFR5cGUkMSh0YWcsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgT2JqZWN0LmtleXMob3B0aW9ucykuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgIGlmIChUWVBFX0NPTlNUUlVDVE9SX09QVElPTlMuaW5kZXhPZihuYW1lKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBleGNlcHRpb24oJ1Vua25vd24gb3B0aW9uIFwiJyArIG5hbWUgKyAnXCIgaXMgbWV0IGluIGRlZmluaXRpb24gb2YgXCInICsgdGFnICsgJ1wiIFlBTUwgdHlwZS4nKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIFRPRE86IEFkZCB0YWcgZm9ybWF0IGNoZWNrLlxuICB0aGlzLm9wdGlvbnMgICAgICAgPSBvcHRpb25zOyAvLyBrZWVwIG9yaWdpbmFsIG9wdGlvbnMgaW4gY2FzZSB1c2VyIHdhbnRzIHRvIGV4dGVuZCB0aGlzIHR5cGUgbGF0ZXJcbiAgdGhpcy50YWcgICAgICAgICAgID0gdGFnO1xuICB0aGlzLmtpbmQgICAgICAgICAgPSBvcHRpb25zWydraW5kJ10gICAgICAgICAgfHwgbnVsbDtcbiAgdGhpcy5yZXNvbHZlICAgICAgID0gb3B0aW9uc1sncmVzb2x2ZSddICAgICAgIHx8IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gIHRoaXMuY29uc3RydWN0ICAgICA9IG9wdGlvbnNbJ2NvbnN0cnVjdCddICAgICB8fCBmdW5jdGlvbiAoZGF0YSkgeyByZXR1cm4gZGF0YTsgfTtcbiAgdGhpcy5pbnN0YW5jZU9mICAgID0gb3B0aW9uc1snaW5zdGFuY2VPZiddICAgIHx8IG51bGw7XG4gIHRoaXMucHJlZGljYXRlICAgICA9IG9wdGlvbnNbJ3ByZWRpY2F0ZSddICAgICB8fCBudWxsO1xuICB0aGlzLnJlcHJlc2VudCAgICAgPSBvcHRpb25zWydyZXByZXNlbnQnXSAgICAgfHwgbnVsbDtcbiAgdGhpcy5yZXByZXNlbnROYW1lID0gb3B0aW9uc1sncmVwcmVzZW50TmFtZSddIHx8IG51bGw7XG4gIHRoaXMuZGVmYXVsdFN0eWxlICA9IG9wdGlvbnNbJ2RlZmF1bHRTdHlsZSddICB8fCBudWxsO1xuICB0aGlzLm11bHRpICAgICAgICAgPSBvcHRpb25zWydtdWx0aSddICAgICAgICAgfHwgZmFsc2U7XG4gIHRoaXMuc3R5bGVBbGlhc2VzICA9IGNvbXBpbGVTdHlsZUFsaWFzZXMob3B0aW9uc1snc3R5bGVBbGlhc2VzJ10gfHwgbnVsbCk7XG5cbiAgaWYgKFlBTUxfTk9ERV9LSU5EUy5pbmRleE9mKHRoaXMua2luZCkgPT09IC0xKSB7XG4gICAgdGhyb3cgbmV3IGV4Y2VwdGlvbignVW5rbm93biBraW5kIFwiJyArIHRoaXMua2luZCArICdcIiBpcyBzcGVjaWZpZWQgZm9yIFwiJyArIHRhZyArICdcIiBZQU1MIHR5cGUuJyk7XG4gIH1cbn1cblxudmFyIHR5cGUgPSBUeXBlJDE7XG5cbi8qZXNsaW50LWRpc2FibGUgbWF4LWxlbiovXG5cblxuXG5cblxuZnVuY3Rpb24gY29tcGlsZUxpc3Qoc2NoZW1hLCBuYW1lKSB7XG4gIHZhciByZXN1bHQgPSBbXTtcblxuICBzY2hlbWFbbmFtZV0uZm9yRWFjaChmdW5jdGlvbiAoY3VycmVudFR5cGUpIHtcbiAgICB2YXIgbmV3SW5kZXggPSByZXN1bHQubGVuZ3RoO1xuXG4gICAgcmVzdWx0LmZvckVhY2goZnVuY3Rpb24gKHByZXZpb3VzVHlwZSwgcHJldmlvdXNJbmRleCkge1xuICAgICAgaWYgKHByZXZpb3VzVHlwZS50YWcgPT09IGN1cnJlbnRUeXBlLnRhZyAmJlxuICAgICAgICAgIHByZXZpb3VzVHlwZS5raW5kID09PSBjdXJyZW50VHlwZS5raW5kICYmXG4gICAgICAgICAgcHJldmlvdXNUeXBlLm11bHRpID09PSBjdXJyZW50VHlwZS5tdWx0aSkge1xuXG4gICAgICAgIG5ld0luZGV4ID0gcHJldmlvdXNJbmRleDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJlc3VsdFtuZXdJbmRleF0gPSBjdXJyZW50VHlwZTtcbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuXG5mdW5jdGlvbiBjb21waWxlTWFwKC8qIGxpc3RzLi4uICovKSB7XG4gIHZhciByZXN1bHQgPSB7XG4gICAgICAgIHNjYWxhcjoge30sXG4gICAgICAgIHNlcXVlbmNlOiB7fSxcbiAgICAgICAgbWFwcGluZzoge30sXG4gICAgICAgIGZhbGxiYWNrOiB7fSxcbiAgICAgICAgbXVsdGk6IHtcbiAgICAgICAgICBzY2FsYXI6IFtdLFxuICAgICAgICAgIHNlcXVlbmNlOiBbXSxcbiAgICAgICAgICBtYXBwaW5nOiBbXSxcbiAgICAgICAgICBmYWxsYmFjazogW11cbiAgICAgICAgfVxuICAgICAgfSwgaW5kZXgsIGxlbmd0aDtcblxuICBmdW5jdGlvbiBjb2xsZWN0VHlwZSh0eXBlKSB7XG4gICAgaWYgKHR5cGUubXVsdGkpIHtcbiAgICAgIHJlc3VsdC5tdWx0aVt0eXBlLmtpbmRdLnB1c2godHlwZSk7XG4gICAgICByZXN1bHQubXVsdGlbJ2ZhbGxiYWNrJ10ucHVzaCh0eXBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0W3R5cGUua2luZF1bdHlwZS50YWddID0gcmVzdWx0WydmYWxsYmFjayddW3R5cGUudGFnXSA9IHR5cGU7XG4gICAgfVxuICB9XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgYXJndW1lbnRzW2luZGV4XS5mb3JFYWNoKGNvbGxlY3RUeXBlKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5cbmZ1bmN0aW9uIFNjaGVtYSQxKGRlZmluaXRpb24pIHtcbiAgcmV0dXJuIHRoaXMuZXh0ZW5kKGRlZmluaXRpb24pO1xufVxuXG5cblNjaGVtYSQxLnByb3RvdHlwZS5leHRlbmQgPSBmdW5jdGlvbiBleHRlbmQoZGVmaW5pdGlvbikge1xuICB2YXIgaW1wbGljaXQgPSBbXTtcbiAgdmFyIGV4cGxpY2l0ID0gW107XG5cbiAgaWYgKGRlZmluaXRpb24gaW5zdGFuY2VvZiB0eXBlKSB7XG4gICAgLy8gU2NoZW1hLmV4dGVuZCh0eXBlKVxuICAgIGV4cGxpY2l0LnB1c2goZGVmaW5pdGlvbik7XG5cbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGRlZmluaXRpb24pKSB7XG4gICAgLy8gU2NoZW1hLmV4dGVuZChbIHR5cGUxLCB0eXBlMiwgLi4uIF0pXG4gICAgZXhwbGljaXQgPSBleHBsaWNpdC5jb25jYXQoZGVmaW5pdGlvbik7XG5cbiAgfSBlbHNlIGlmIChkZWZpbml0aW9uICYmIChBcnJheS5pc0FycmF5KGRlZmluaXRpb24uaW1wbGljaXQpIHx8IEFycmF5LmlzQXJyYXkoZGVmaW5pdGlvbi5leHBsaWNpdCkpKSB7XG4gICAgLy8gU2NoZW1hLmV4dGVuZCh7IGV4cGxpY2l0OiBbIHR5cGUxLCB0eXBlMiwgLi4uIF0sIGltcGxpY2l0OiBbIHR5cGUxLCB0eXBlMiwgLi4uIF0gfSlcbiAgICBpZiAoZGVmaW5pdGlvbi5pbXBsaWNpdCkgaW1wbGljaXQgPSBpbXBsaWNpdC5jb25jYXQoZGVmaW5pdGlvbi5pbXBsaWNpdCk7XG4gICAgaWYgKGRlZmluaXRpb24uZXhwbGljaXQpIGV4cGxpY2l0ID0gZXhwbGljaXQuY29uY2F0KGRlZmluaXRpb24uZXhwbGljaXQpO1xuXG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IGV4Y2VwdGlvbignU2NoZW1hLmV4dGVuZCBhcmd1bWVudCBzaG91bGQgYmUgYSBUeXBlLCBbIFR5cGUgXSwgJyArXG4gICAgICAnb3IgYSBzY2hlbWEgZGVmaW5pdGlvbiAoeyBpbXBsaWNpdDogWy4uLl0sIGV4cGxpY2l0OiBbLi4uXSB9KScpO1xuICB9XG5cbiAgaW1wbGljaXQuZm9yRWFjaChmdW5jdGlvbiAodHlwZSQxKSB7XG4gICAgaWYgKCEodHlwZSQxIGluc3RhbmNlb2YgdHlwZSkpIHtcbiAgICAgIHRocm93IG5ldyBleGNlcHRpb24oJ1NwZWNpZmllZCBsaXN0IG9mIFlBTUwgdHlwZXMgKG9yIGEgc2luZ2xlIFR5cGUgb2JqZWN0KSBjb250YWlucyBhIG5vbi1UeXBlIG9iamVjdC4nKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZSQxLmxvYWRLaW5kICYmIHR5cGUkMS5sb2FkS2luZCAhPT0gJ3NjYWxhcicpIHtcbiAgICAgIHRocm93IG5ldyBleGNlcHRpb24oJ1RoZXJlIGlzIGEgbm9uLXNjYWxhciB0eXBlIGluIHRoZSBpbXBsaWNpdCBsaXN0IG9mIGEgc2NoZW1hLiBJbXBsaWNpdCByZXNvbHZpbmcgb2Ygc3VjaCB0eXBlcyBpcyBub3Qgc3VwcG9ydGVkLicpO1xuICAgIH1cblxuICAgIGlmICh0eXBlJDEubXVsdGkpIHtcbiAgICAgIHRocm93IG5ldyBleGNlcHRpb24oJ1RoZXJlIGlzIGEgbXVsdGkgdHlwZSBpbiB0aGUgaW1wbGljaXQgbGlzdCBvZiBhIHNjaGVtYS4gTXVsdGkgdGFncyBjYW4gb25seSBiZSBsaXN0ZWQgYXMgZXhwbGljaXQuJyk7XG4gICAgfVxuICB9KTtcblxuICBleHBsaWNpdC5mb3JFYWNoKGZ1bmN0aW9uICh0eXBlJDEpIHtcbiAgICBpZiAoISh0eXBlJDEgaW5zdGFuY2VvZiB0eXBlKSkge1xuICAgICAgdGhyb3cgbmV3IGV4Y2VwdGlvbignU3BlY2lmaWVkIGxpc3Qgb2YgWUFNTCB0eXBlcyAob3IgYSBzaW5nbGUgVHlwZSBvYmplY3QpIGNvbnRhaW5zIGEgbm9uLVR5cGUgb2JqZWN0LicpO1xuICAgIH1cbiAgfSk7XG5cbiAgdmFyIHJlc3VsdCA9IE9iamVjdC5jcmVhdGUoU2NoZW1hJDEucHJvdG90eXBlKTtcblxuICByZXN1bHQuaW1wbGljaXQgPSAodGhpcy5pbXBsaWNpdCB8fCBbXSkuY29uY2F0KGltcGxpY2l0KTtcbiAgcmVzdWx0LmV4cGxpY2l0ID0gKHRoaXMuZXhwbGljaXQgfHwgW10pLmNvbmNhdChleHBsaWNpdCk7XG5cbiAgcmVzdWx0LmNvbXBpbGVkSW1wbGljaXQgPSBjb21waWxlTGlzdChyZXN1bHQsICdpbXBsaWNpdCcpO1xuICByZXN1bHQuY29tcGlsZWRFeHBsaWNpdCA9IGNvbXBpbGVMaXN0KHJlc3VsdCwgJ2V4cGxpY2l0Jyk7XG4gIHJlc3VsdC5jb21waWxlZFR5cGVNYXAgID0gY29tcGlsZU1hcChyZXN1bHQuY29tcGlsZWRJbXBsaWNpdCwgcmVzdWx0LmNvbXBpbGVkRXhwbGljaXQpO1xuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbnZhciBzY2hlbWEgPSBTY2hlbWEkMTtcblxudmFyIHN0ciA9IG5ldyB0eXBlKCd0YWc6eWFtbC5vcmcsMjAwMjpzdHInLCB7XG4gIGtpbmQ6ICdzY2FsYXInLFxuICBjb25zdHJ1Y3Q6IGZ1bmN0aW9uIChkYXRhKSB7IHJldHVybiBkYXRhICE9PSBudWxsID8gZGF0YSA6ICcnOyB9XG59KTtcblxudmFyIHNlcSA9IG5ldyB0eXBlKCd0YWc6eWFtbC5vcmcsMjAwMjpzZXEnLCB7XG4gIGtpbmQ6ICdzZXF1ZW5jZScsXG4gIGNvbnN0cnVjdDogZnVuY3Rpb24gKGRhdGEpIHsgcmV0dXJuIGRhdGEgIT09IG51bGwgPyBkYXRhIDogW107IH1cbn0pO1xuXG52YXIgbWFwID0gbmV3IHR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOm1hcCcsIHtcbiAga2luZDogJ21hcHBpbmcnLFxuICBjb25zdHJ1Y3Q6IGZ1bmN0aW9uIChkYXRhKSB7IHJldHVybiBkYXRhICE9PSBudWxsID8gZGF0YSA6IHt9OyB9XG59KTtcblxudmFyIGZhaWxzYWZlID0gbmV3IHNjaGVtYSh7XG4gIGV4cGxpY2l0OiBbXG4gICAgc3RyLFxuICAgIHNlcSxcbiAgICBtYXBcbiAgXVxufSk7XG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sTnVsbChkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gdHJ1ZTtcblxuICB2YXIgbWF4ID0gZGF0YS5sZW5ndGg7XG5cbiAgcmV0dXJuIChtYXggPT09IDEgJiYgZGF0YSA9PT0gJ34nKSB8fFxuICAgICAgICAgKG1heCA9PT0gNCAmJiAoZGF0YSA9PT0gJ251bGwnIHx8IGRhdGEgPT09ICdOdWxsJyB8fCBkYXRhID09PSAnTlVMTCcpKTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbE51bGwoKSB7XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBpc051bGwob2JqZWN0KSB7XG4gIHJldHVybiBvYmplY3QgPT09IG51bGw7XG59XG5cbnZhciBfbnVsbCA9IG5ldyB0eXBlKCd0YWc6eWFtbC5vcmcsMjAwMjpudWxsJywge1xuICBraW5kOiAnc2NhbGFyJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxOdWxsLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxOdWxsLFxuICBwcmVkaWNhdGU6IGlzTnVsbCxcbiAgcmVwcmVzZW50OiB7XG4gICAgY2Fub25pY2FsOiBmdW5jdGlvbiAoKSB7IHJldHVybiAnfic7ICAgIH0sXG4gICAgbG93ZXJjYXNlOiBmdW5jdGlvbiAoKSB7IHJldHVybiAnbnVsbCc7IH0sXG4gICAgdXBwZXJjYXNlOiBmdW5jdGlvbiAoKSB7IHJldHVybiAnTlVMTCc7IH0sXG4gICAgY2FtZWxjYXNlOiBmdW5jdGlvbiAoKSB7IHJldHVybiAnTnVsbCc7IH0sXG4gICAgZW1wdHk6ICAgICBmdW5jdGlvbiAoKSB7IHJldHVybiAnJzsgICAgIH1cbiAgfSxcbiAgZGVmYXVsdFN0eWxlOiAnbG93ZXJjYXNlJ1xufSk7XG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sQm9vbGVhbihkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIG1heCA9IGRhdGEubGVuZ3RoO1xuXG4gIHJldHVybiAobWF4ID09PSA0ICYmIChkYXRhID09PSAndHJ1ZScgfHwgZGF0YSA9PT0gJ1RydWUnIHx8IGRhdGEgPT09ICdUUlVFJykpIHx8XG4gICAgICAgICAobWF4ID09PSA1ICYmIChkYXRhID09PSAnZmFsc2UnIHx8IGRhdGEgPT09ICdGYWxzZScgfHwgZGF0YSA9PT0gJ0ZBTFNFJykpO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RZYW1sQm9vbGVhbihkYXRhKSB7XG4gIHJldHVybiBkYXRhID09PSAndHJ1ZScgfHxcbiAgICAgICAgIGRhdGEgPT09ICdUcnVlJyB8fFxuICAgICAgICAgZGF0YSA9PT0gJ1RSVUUnO1xufVxuXG5mdW5jdGlvbiBpc0Jvb2xlYW4ob2JqZWN0KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xufVxuXG52YXIgYm9vbCA9IG5ldyB0eXBlKCd0YWc6eWFtbC5vcmcsMjAwMjpib29sJywge1xuICBraW5kOiAnc2NhbGFyJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxCb29sZWFuLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxCb29sZWFuLFxuICBwcmVkaWNhdGU6IGlzQm9vbGVhbixcbiAgcmVwcmVzZW50OiB7XG4gICAgbG93ZXJjYXNlOiBmdW5jdGlvbiAob2JqZWN0KSB7IHJldHVybiBvYmplY3QgPyAndHJ1ZScgOiAnZmFsc2UnOyB9LFxuICAgIHVwcGVyY2FzZTogZnVuY3Rpb24gKG9iamVjdCkgeyByZXR1cm4gb2JqZWN0ID8gJ1RSVUUnIDogJ0ZBTFNFJzsgfSxcbiAgICBjYW1lbGNhc2U6IGZ1bmN0aW9uIChvYmplY3QpIHsgcmV0dXJuIG9iamVjdCA/ICdUcnVlJyA6ICdGYWxzZSc7IH1cbiAgfSxcbiAgZGVmYXVsdFN0eWxlOiAnbG93ZXJjYXNlJ1xufSk7XG5cbmZ1bmN0aW9uIGlzSGV4Q29kZShjKSB7XG4gIHJldHVybiAoKDB4MzAvKiAwICovIDw9IGMpICYmIChjIDw9IDB4MzkvKiA5ICovKSkgfHxcbiAgICAgICAgICgoMHg0MS8qIEEgKi8gPD0gYykgJiYgKGMgPD0gMHg0Ni8qIEYgKi8pKSB8fFxuICAgICAgICAgKCgweDYxLyogYSAqLyA8PSBjKSAmJiAoYyA8PSAweDY2LyogZiAqLykpO1xufVxuXG5mdW5jdGlvbiBpc09jdENvZGUoYykge1xuICByZXR1cm4gKCgweDMwLyogMCAqLyA8PSBjKSAmJiAoYyA8PSAweDM3LyogNyAqLykpO1xufVxuXG5mdW5jdGlvbiBpc0RlY0NvZGUoYykge1xuICByZXR1cm4gKCgweDMwLyogMCAqLyA8PSBjKSAmJiAoYyA8PSAweDM5LyogOSAqLykpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlWWFtbEludGVnZXIoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBtYXggPSBkYXRhLmxlbmd0aCxcbiAgICAgIGluZGV4ID0gMCxcbiAgICAgIGhhc0RpZ2l0cyA9IGZhbHNlLFxuICAgICAgY2g7XG5cbiAgaWYgKCFtYXgpIHJldHVybiBmYWxzZTtcblxuICBjaCA9IGRhdGFbaW5kZXhdO1xuXG4gIC8vIHNpZ25cbiAgaWYgKGNoID09PSAnLScgfHwgY2ggPT09ICcrJykge1xuICAgIGNoID0gZGF0YVsrK2luZGV4XTtcbiAgfVxuXG4gIGlmIChjaCA9PT0gJzAnKSB7XG4gICAgLy8gMFxuICAgIGlmIChpbmRleCArIDEgPT09IG1heCkgcmV0dXJuIHRydWU7XG4gICAgY2ggPSBkYXRhWysraW5kZXhdO1xuXG4gICAgLy8gYmFzZSAyLCBiYXNlIDgsIGJhc2UgMTZcblxuICAgIGlmIChjaCA9PT0gJ2InKSB7XG4gICAgICAvLyBiYXNlIDJcbiAgICAgIGluZGV4Kys7XG5cbiAgICAgIGZvciAoOyBpbmRleCA8IG1heDsgaW5kZXgrKykge1xuICAgICAgICBjaCA9IGRhdGFbaW5kZXhdO1xuICAgICAgICBpZiAoY2ggPT09ICdfJykgY29udGludWU7XG4gICAgICAgIGlmIChjaCAhPT0gJzAnICYmIGNoICE9PSAnMScpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaGFzRGlnaXRzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXNEaWdpdHMgJiYgY2ggIT09ICdfJztcbiAgICB9XG5cblxuICAgIGlmIChjaCA9PT0gJ3gnKSB7XG4gICAgICAvLyBiYXNlIDE2XG4gICAgICBpbmRleCsrO1xuXG4gICAgICBmb3IgKDsgaW5kZXggPCBtYXg7IGluZGV4KyspIHtcbiAgICAgICAgY2ggPSBkYXRhW2luZGV4XTtcbiAgICAgICAgaWYgKGNoID09PSAnXycpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoIWlzSGV4Q29kZShkYXRhLmNoYXJDb2RlQXQoaW5kZXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBoYXNEaWdpdHMgPSB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGhhc0RpZ2l0cyAmJiBjaCAhPT0gJ18nO1xuICAgIH1cblxuXG4gICAgaWYgKGNoID09PSAnbycpIHtcbiAgICAgIC8vIGJhc2UgOFxuICAgICAgaW5kZXgrKztcblxuICAgICAgZm9yICg7IGluZGV4IDwgbWF4OyBpbmRleCsrKSB7XG4gICAgICAgIGNoID0gZGF0YVtpbmRleF07XG4gICAgICAgIGlmIChjaCA9PT0gJ18nKSBjb250aW51ZTtcbiAgICAgICAgaWYgKCFpc09jdENvZGUoZGF0YS5jaGFyQ29kZUF0KGluZGV4KSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaGFzRGlnaXRzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXNEaWdpdHMgJiYgY2ggIT09ICdfJztcbiAgICB9XG4gIH1cblxuICAvLyBiYXNlIDEwIChleGNlcHQgMClcblxuICAvLyB2YWx1ZSBzaG91bGQgbm90IHN0YXJ0IHdpdGggYF9gO1xuICBpZiAoY2ggPT09ICdfJykgcmV0dXJuIGZhbHNlO1xuXG4gIGZvciAoOyBpbmRleCA8IG1heDsgaW5kZXgrKykge1xuICAgIGNoID0gZGF0YVtpbmRleF07XG4gICAgaWYgKGNoID09PSAnXycpIGNvbnRpbnVlO1xuICAgIGlmICghaXNEZWNDb2RlKGRhdGEuY2hhckNvZGVBdChpbmRleCkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGhhc0RpZ2l0cyA9IHRydWU7XG4gIH1cblxuICAvLyBTaG91bGQgaGF2ZSBkaWdpdHMgYW5kIHNob3VsZCBub3QgZW5kIHdpdGggYF9gXG4gIGlmICghaGFzRGlnaXRzIHx8IGNoID09PSAnXycpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbEludGVnZXIoZGF0YSkge1xuICB2YXIgdmFsdWUgPSBkYXRhLCBzaWduID0gMSwgY2g7XG5cbiAgaWYgKHZhbHVlLmluZGV4T2YoJ18nKSAhPT0gLTEpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoL18vZywgJycpO1xuICB9XG5cbiAgY2ggPSB2YWx1ZVswXTtcblxuICBpZiAoY2ggPT09ICctJyB8fCBjaCA9PT0gJysnKSB7XG4gICAgaWYgKGNoID09PSAnLScpIHNpZ24gPSAtMTtcbiAgICB2YWx1ZSA9IHZhbHVlLnNsaWNlKDEpO1xuICAgIGNoID0gdmFsdWVbMF07XG4gIH1cblxuICBpZiAodmFsdWUgPT09ICcwJykgcmV0dXJuIDA7XG5cbiAgaWYgKGNoID09PSAnMCcpIHtcbiAgICBpZiAodmFsdWVbMV0gPT09ICdiJykgcmV0dXJuIHNpZ24gKiBwYXJzZUludCh2YWx1ZS5zbGljZSgyKSwgMik7XG4gICAgaWYgKHZhbHVlWzFdID09PSAneCcpIHJldHVybiBzaWduICogcGFyc2VJbnQodmFsdWUuc2xpY2UoMiksIDE2KTtcbiAgICBpZiAodmFsdWVbMV0gPT09ICdvJykgcmV0dXJuIHNpZ24gKiBwYXJzZUludCh2YWx1ZS5zbGljZSgyKSwgOCk7XG4gIH1cblxuICByZXR1cm4gc2lnbiAqIHBhcnNlSW50KHZhbHVlLCAxMCk7XG59XG5cbmZ1bmN0aW9uIGlzSW50ZWdlcihvYmplY3QpIHtcbiAgcmV0dXJuIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSkgPT09ICdbb2JqZWN0IE51bWJlcl0nICYmXG4gICAgICAgICAob2JqZWN0ICUgMSA9PT0gMCAmJiAhY29tbW9uLmlzTmVnYXRpdmVaZXJvKG9iamVjdCkpO1xufVxuXG52YXIgaW50ID0gbmV3IHR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOmludCcsIHtcbiAga2luZDogJ3NjYWxhcicsXG4gIHJlc29sdmU6IHJlc29sdmVZYW1sSW50ZWdlcixcbiAgY29uc3RydWN0OiBjb25zdHJ1Y3RZYW1sSW50ZWdlcixcbiAgcHJlZGljYXRlOiBpc0ludGVnZXIsXG4gIHJlcHJlc2VudDoge1xuICAgIGJpbmFyeTogICAgICBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogPj0gMCA/ICcwYicgKyBvYmoudG9TdHJpbmcoMikgOiAnLTBiJyArIG9iai50b1N0cmluZygyKS5zbGljZSgxKTsgfSxcbiAgICBvY3RhbDogICAgICAgZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqID49IDAgPyAnMG8nICArIG9iai50b1N0cmluZyg4KSA6ICctMG8nICArIG9iai50b1N0cmluZyg4KS5zbGljZSgxKTsgfSxcbiAgICBkZWNpbWFsOiAgICAgZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqLnRvU3RyaW5nKDEwKTsgfSxcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG4gICAgaGV4YWRlY2ltYWw6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiA+PSAwID8gJzB4JyArIG9iai50b1N0cmluZygxNikudG9VcHBlckNhc2UoKSA6ICAnLTB4JyArIG9iai50b1N0cmluZygxNikudG9VcHBlckNhc2UoKS5zbGljZSgxKTsgfVxuICB9LFxuICBkZWZhdWx0U3R5bGU6ICdkZWNpbWFsJyxcbiAgc3R5bGVBbGlhc2VzOiB7XG4gICAgYmluYXJ5OiAgICAgIFsgMiwgICdiaW4nIF0sXG4gICAgb2N0YWw6ICAgICAgIFsgOCwgICdvY3QnIF0sXG4gICAgZGVjaW1hbDogICAgIFsgMTAsICdkZWMnIF0sXG4gICAgaGV4YWRlY2ltYWw6IFsgMTYsICdoZXgnIF1cbiAgfVxufSk7XG5cbnZhciBZQU1MX0ZMT0FUX1BBVFRFUk4gPSBuZXcgUmVnRXhwKFxuICAvLyAyLjVlNCwgMi41IGFuZCBpbnRlZ2Vyc1xuICAnXig/OlstK10/KD86WzAtOV1bMC05X10qKSg/OlxcXFwuWzAtOV9dKik/KD86W2VFXVstK10/WzAtOV0rKT8nICtcbiAgLy8gLjJlNCwgLjJcbiAgLy8gc3BlY2lhbCBjYXNlLCBzZWVtcyBub3QgZnJvbSBzcGVjXG4gICd8XFxcXC5bMC05X10rKD86W2VFXVstK10/WzAtOV0rKT8nICtcbiAgLy8gLmluZlxuICAnfFstK10/XFxcXC4oPzppbmZ8SW5mfElORiknICtcbiAgLy8gLm5hblxuICAnfFxcXFwuKD86bmFufE5hTnxOQU4pKSQnKTtcblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxGbG9hdChkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKCFZQU1MX0ZMT0FUX1BBVFRFUk4udGVzdChkYXRhKSB8fFxuICAgICAgLy8gUXVpY2sgaGFjayB0byBub3QgYWxsb3cgaW50ZWdlcnMgZW5kIHdpdGggYF9gXG4gICAgICAvLyBQcm9iYWJseSBzaG91bGQgdXBkYXRlIHJlZ2V4cCAmIGNoZWNrIHNwZWVkXG4gICAgICBkYXRhW2RhdGEubGVuZ3RoIC0gMV0gPT09ICdfJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RZYW1sRmxvYXQoZGF0YSkge1xuICB2YXIgdmFsdWUsIHNpZ247XG5cbiAgdmFsdWUgID0gZGF0YS5yZXBsYWNlKC9fL2csICcnKS50b0xvd2VyQ2FzZSgpO1xuICBzaWduICAgPSB2YWx1ZVswXSA9PT0gJy0nID8gLTEgOiAxO1xuXG4gIGlmICgnKy0nLmluZGV4T2YodmFsdWVbMF0pID49IDApIHtcbiAgICB2YWx1ZSA9IHZhbHVlLnNsaWNlKDEpO1xuICB9XG5cbiAgaWYgKHZhbHVlID09PSAnLmluZicpIHtcbiAgICByZXR1cm4gKHNpZ24gPT09IDEpID8gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZIDogTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZO1xuXG4gIH0gZWxzZSBpZiAodmFsdWUgPT09ICcubmFuJykge1xuICAgIHJldHVybiBOYU47XG4gIH1cbiAgcmV0dXJuIHNpZ24gKiBwYXJzZUZsb2F0KHZhbHVlLCAxMCk7XG59XG5cblxudmFyIFNDSUVOVElGSUNfV0lUSE9VVF9ET1QgPSAvXlstK10/WzAtOV0rZS87XG5cbmZ1bmN0aW9uIHJlcHJlc2VudFlhbWxGbG9hdChvYmplY3QsIHN0eWxlKSB7XG4gIHZhciByZXM7XG5cbiAgaWYgKGlzTmFOKG9iamVjdCkpIHtcbiAgICBzd2l0Y2ggKHN0eWxlKSB7XG4gICAgICBjYXNlICdsb3dlcmNhc2UnOiByZXR1cm4gJy5uYW4nO1xuICAgICAgY2FzZSAndXBwZXJjYXNlJzogcmV0dXJuICcuTkFOJztcbiAgICAgIGNhc2UgJ2NhbWVsY2FzZSc6IHJldHVybiAnLk5hTic7XG4gICAgfVxuICB9IGVsc2UgaWYgKE51bWJlci5QT1NJVElWRV9JTkZJTklUWSA9PT0gb2JqZWN0KSB7XG4gICAgc3dpdGNoIChzdHlsZSkge1xuICAgICAgY2FzZSAnbG93ZXJjYXNlJzogcmV0dXJuICcuaW5mJztcbiAgICAgIGNhc2UgJ3VwcGVyY2FzZSc6IHJldHVybiAnLklORic7XG4gICAgICBjYXNlICdjYW1lbGNhc2UnOiByZXR1cm4gJy5JbmYnO1xuICAgIH1cbiAgfSBlbHNlIGlmIChOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFkgPT09IG9iamVjdCkge1xuICAgIHN3aXRjaCAoc3R5bGUpIHtcbiAgICAgIGNhc2UgJ2xvd2VyY2FzZSc6IHJldHVybiAnLS5pbmYnO1xuICAgICAgY2FzZSAndXBwZXJjYXNlJzogcmV0dXJuICctLklORic7XG4gICAgICBjYXNlICdjYW1lbGNhc2UnOiByZXR1cm4gJy0uSW5mJztcbiAgICB9XG4gIH0gZWxzZSBpZiAoY29tbW9uLmlzTmVnYXRpdmVaZXJvKG9iamVjdCkpIHtcbiAgICByZXR1cm4gJy0wLjAnO1xuICB9XG5cbiAgcmVzID0gb2JqZWN0LnRvU3RyaW5nKDEwKTtcblxuICAvLyBKUyBzdHJpbmdpZmllciBjYW4gYnVpbGQgc2NpZW50aWZpYyBmb3JtYXQgd2l0aG91dCBkb3RzOiA1ZS0xMDAsXG4gIC8vIHdoaWxlIFlBTUwgcmVxdXJlcyBkb3Q6IDUuZS0xMDAuIEZpeCBpdCB3aXRoIHNpbXBsZSBoYWNrXG5cbiAgcmV0dXJuIFNDSUVOVElGSUNfV0lUSE9VVF9ET1QudGVzdChyZXMpID8gcmVzLnJlcGxhY2UoJ2UnLCAnLmUnKSA6IHJlcztcbn1cblxuZnVuY3Rpb24gaXNGbG9hdChvYmplY3QpIHtcbiAgcmV0dXJuIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gJ1tvYmplY3QgTnVtYmVyXScpICYmXG4gICAgICAgICAob2JqZWN0ICUgMSAhPT0gMCB8fCBjb21tb24uaXNOZWdhdGl2ZVplcm8ob2JqZWN0KSk7XG59XG5cbnZhciBmbG9hdCA9IG5ldyB0eXBlKCd0YWc6eWFtbC5vcmcsMjAwMjpmbG9hdCcsIHtcbiAga2luZDogJ3NjYWxhcicsXG4gIHJlc29sdmU6IHJlc29sdmVZYW1sRmxvYXQsXG4gIGNvbnN0cnVjdDogY29uc3RydWN0WWFtbEZsb2F0LFxuICBwcmVkaWNhdGU6IGlzRmxvYXQsXG4gIHJlcHJlc2VudDogcmVwcmVzZW50WWFtbEZsb2F0LFxuICBkZWZhdWx0U3R5bGU6ICdsb3dlcmNhc2UnXG59KTtcblxudmFyIGpzb24gPSBmYWlsc2FmZS5leHRlbmQoe1xuICBpbXBsaWNpdDogW1xuICAgIF9udWxsLFxuICAgIGJvb2wsXG4gICAgaW50LFxuICAgIGZsb2F0XG4gIF1cbn0pO1xuXG52YXIgY29yZSA9IGpzb247XG5cbnZhciBZQU1MX0RBVEVfUkVHRVhQID0gbmV3IFJlZ0V4cChcbiAgJ14oWzAtOV1bMC05XVswLTldWzAtOV0pJyAgICAgICAgICArIC8vIFsxXSB5ZWFyXG4gICctKFswLTldWzAtOV0pJyAgICAgICAgICAgICAgICAgICAgKyAvLyBbMl0gbW9udGhcbiAgJy0oWzAtOV1bMC05XSkkJyk7ICAgICAgICAgICAgICAgICAgIC8vIFszXSBkYXlcblxudmFyIFlBTUxfVElNRVNUQU1QX1JFR0VYUCA9IG5ldyBSZWdFeHAoXG4gICdeKFswLTldWzAtOV1bMC05XVswLTldKScgICAgICAgICAgKyAvLyBbMV0geWVhclxuICAnLShbMC05XVswLTldPyknICAgICAgICAgICAgICAgICAgICsgLy8gWzJdIG1vbnRoXG4gICctKFswLTldWzAtOV0/KScgICAgICAgICAgICAgICAgICAgKyAvLyBbM10gZGF5XG4gICcoPzpbVHRdfFsgXFxcXHRdKyknICAgICAgICAgICAgICAgICArIC8vIC4uLlxuICAnKFswLTldWzAtOV0/KScgICAgICAgICAgICAgICAgICAgICsgLy8gWzRdIGhvdXJcbiAgJzooWzAtOV1bMC05XSknICAgICAgICAgICAgICAgICAgICArIC8vIFs1XSBtaW51dGVcbiAgJzooWzAtOV1bMC05XSknICAgICAgICAgICAgICAgICAgICArIC8vIFs2XSBzZWNvbmRcbiAgJyg/OlxcXFwuKFswLTldKikpPycgICAgICAgICAgICAgICAgICsgLy8gWzddIGZyYWN0aW9uXG4gICcoPzpbIFxcXFx0XSooWnwoWy0rXSkoWzAtOV1bMC05XT8pJyArIC8vIFs4XSB0eiBbOV0gdHpfc2lnbiBbMTBdIHR6X2hvdXJcbiAgJyg/OjooWzAtOV1bMC05XSkpPykpPyQnKTsgICAgICAgICAgIC8vIFsxMV0gdHpfbWludXRlXG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sVGltZXN0YW1wKGRhdGEpIHtcbiAgaWYgKGRhdGEgPT09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgaWYgKFlBTUxfREFURV9SRUdFWFAuZXhlYyhkYXRhKSAhPT0gbnVsbCkgcmV0dXJuIHRydWU7XG4gIGlmIChZQU1MX1RJTUVTVEFNUF9SRUdFWFAuZXhlYyhkYXRhKSAhPT0gbnVsbCkgcmV0dXJuIHRydWU7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbFRpbWVzdGFtcChkYXRhKSB7XG4gIHZhciBtYXRjaCwgeWVhciwgbW9udGgsIGRheSwgaG91ciwgbWludXRlLCBzZWNvbmQsIGZyYWN0aW9uID0gMCxcbiAgICAgIGRlbHRhID0gbnVsbCwgdHpfaG91ciwgdHpfbWludXRlLCBkYXRlO1xuXG4gIG1hdGNoID0gWUFNTF9EQVRFX1JFR0VYUC5leGVjKGRhdGEpO1xuICBpZiAobWF0Y2ggPT09IG51bGwpIG1hdGNoID0gWUFNTF9USU1FU1RBTVBfUkVHRVhQLmV4ZWMoZGF0YSk7XG5cbiAgaWYgKG1hdGNoID09PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJ0RhdGUgcmVzb2x2ZSBlcnJvcicpO1xuXG4gIC8vIG1hdGNoOiBbMV0geWVhciBbMl0gbW9udGggWzNdIGRheVxuXG4gIHllYXIgPSArKG1hdGNoWzFdKTtcbiAgbW9udGggPSArKG1hdGNoWzJdKSAtIDE7IC8vIEpTIG1vbnRoIHN0YXJ0cyB3aXRoIDBcbiAgZGF5ID0gKyhtYXRjaFszXSk7XG5cbiAgaWYgKCFtYXRjaFs0XSkgeyAvLyBubyBob3VyXG4gICAgcmV0dXJuIG5ldyBEYXRlKERhdGUuVVRDKHllYXIsIG1vbnRoLCBkYXkpKTtcbiAgfVxuXG4gIC8vIG1hdGNoOiBbNF0gaG91ciBbNV0gbWludXRlIFs2XSBzZWNvbmQgWzddIGZyYWN0aW9uXG5cbiAgaG91ciA9ICsobWF0Y2hbNF0pO1xuICBtaW51dGUgPSArKG1hdGNoWzVdKTtcbiAgc2Vjb25kID0gKyhtYXRjaFs2XSk7XG5cbiAgaWYgKG1hdGNoWzddKSB7XG4gICAgZnJhY3Rpb24gPSBtYXRjaFs3XS5zbGljZSgwLCAzKTtcbiAgICB3aGlsZSAoZnJhY3Rpb24ubGVuZ3RoIDwgMykgeyAvLyBtaWxsaS1zZWNvbmRzXG4gICAgICBmcmFjdGlvbiArPSAnMCc7XG4gICAgfVxuICAgIGZyYWN0aW9uID0gK2ZyYWN0aW9uO1xuICB9XG5cbiAgLy8gbWF0Y2g6IFs4XSB0eiBbOV0gdHpfc2lnbiBbMTBdIHR6X2hvdXIgWzExXSB0el9taW51dGVcblxuICBpZiAobWF0Y2hbOV0pIHtcbiAgICB0el9ob3VyID0gKyhtYXRjaFsxMF0pO1xuICAgIHR6X21pbnV0ZSA9ICsobWF0Y2hbMTFdIHx8IDApO1xuICAgIGRlbHRhID0gKHR6X2hvdXIgKiA2MCArIHR6X21pbnV0ZSkgKiA2MDAwMDsgLy8gZGVsdGEgaW4gbWlsaS1zZWNvbmRzXG4gICAgaWYgKG1hdGNoWzldID09PSAnLScpIGRlbHRhID0gLWRlbHRhO1xuICB9XG5cbiAgZGF0ZSA9IG5ldyBEYXRlKERhdGUuVVRDKHllYXIsIG1vbnRoLCBkYXksIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBmcmFjdGlvbikpO1xuXG4gIGlmIChkZWx0YSkgZGF0ZS5zZXRUaW1lKGRhdGUuZ2V0VGltZSgpIC0gZGVsdGEpO1xuXG4gIHJldHVybiBkYXRlO1xufVxuXG5mdW5jdGlvbiByZXByZXNlbnRZYW1sVGltZXN0YW1wKG9iamVjdCAvKiwgc3R5bGUqLykge1xuICByZXR1cm4gb2JqZWN0LnRvSVNPU3RyaW5nKCk7XG59XG5cbnZhciB0aW1lc3RhbXAgPSBuZXcgdHlwZSgndGFnOnlhbWwub3JnLDIwMDI6dGltZXN0YW1wJywge1xuICBraW5kOiAnc2NhbGFyJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxUaW1lc3RhbXAsXG4gIGNvbnN0cnVjdDogY29uc3RydWN0WWFtbFRpbWVzdGFtcCxcbiAgaW5zdGFuY2VPZjogRGF0ZSxcbiAgcmVwcmVzZW50OiByZXByZXNlbnRZYW1sVGltZXN0YW1wXG59KTtcblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxNZXJnZShkYXRhKSB7XG4gIHJldHVybiBkYXRhID09PSAnPDwnIHx8IGRhdGEgPT09IG51bGw7XG59XG5cbnZhciBtZXJnZSA9IG5ldyB0eXBlKCd0YWc6eWFtbC5vcmcsMjAwMjptZXJnZScsIHtcbiAga2luZDogJ3NjYWxhcicsXG4gIHJlc29sdmU6IHJlc29sdmVZYW1sTWVyZ2Vcbn0pO1xuXG4vKmVzbGludC1kaXNhYmxlIG5vLWJpdHdpc2UqL1xuXG5cblxuXG5cbi8vIFsgNjQsIDY1LCA2NiBdIC0+IFsgcGFkZGluZywgQ1IsIExGIF1cbnZhciBCQVNFNjRfTUFQID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89XFxuXFxyJztcblxuXG5mdW5jdGlvbiByZXNvbHZlWWFtbEJpbmFyeShkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIGNvZGUsIGlkeCwgYml0bGVuID0gMCwgbWF4ID0gZGF0YS5sZW5ndGgsIG1hcCA9IEJBU0U2NF9NQVA7XG5cbiAgLy8gQ29udmVydCBvbmUgYnkgb25lLlxuICBmb3IgKGlkeCA9IDA7IGlkeCA8IG1heDsgaWR4KyspIHtcbiAgICBjb2RlID0gbWFwLmluZGV4T2YoZGF0YS5jaGFyQXQoaWR4KSk7XG5cbiAgICAvLyBTa2lwIENSL0xGXG4gICAgaWYgKGNvZGUgPiA2NCkgY29udGludWU7XG5cbiAgICAvLyBGYWlsIG9uIGlsbGVnYWwgY2hhcmFjdGVyc1xuICAgIGlmIChjb2RlIDwgMCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgYml0bGVuICs9IDY7XG4gIH1cblxuICAvLyBJZiB0aGVyZSBhcmUgYW55IGJpdHMgbGVmdCwgc291cmNlIHdhcyBjb3JydXB0ZWRcbiAgcmV0dXJuIChiaXRsZW4gJSA4KSA9PT0gMDtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbEJpbmFyeShkYXRhKSB7XG4gIHZhciBpZHgsIHRhaWxiaXRzLFxuICAgICAgaW5wdXQgPSBkYXRhLnJlcGxhY2UoL1tcXHJcXG49XS9nLCAnJyksIC8vIHJlbW92ZSBDUi9MRiAmIHBhZGRpbmcgdG8gc2ltcGxpZnkgc2NhblxuICAgICAgbWF4ID0gaW5wdXQubGVuZ3RoLFxuICAgICAgbWFwID0gQkFTRTY0X01BUCxcbiAgICAgIGJpdHMgPSAwLFxuICAgICAgcmVzdWx0ID0gW107XG5cbiAgLy8gQ29sbGVjdCBieSA2KjQgYml0cyAoMyBieXRlcylcblxuICBmb3IgKGlkeCA9IDA7IGlkeCA8IG1heDsgaWR4KyspIHtcbiAgICBpZiAoKGlkeCAlIDQgPT09IDApICYmIGlkeCkge1xuICAgICAgcmVzdWx0LnB1c2goKGJpdHMgPj4gMTYpICYgMHhGRik7XG4gICAgICByZXN1bHQucHVzaCgoYml0cyA+PiA4KSAmIDB4RkYpO1xuICAgICAgcmVzdWx0LnB1c2goYml0cyAmIDB4RkYpO1xuICAgIH1cblxuICAgIGJpdHMgPSAoYml0cyA8PCA2KSB8IG1hcC5pbmRleE9mKGlucHV0LmNoYXJBdChpZHgpKTtcbiAgfVxuXG4gIC8vIER1bXAgdGFpbFxuXG4gIHRhaWxiaXRzID0gKG1heCAlIDQpICogNjtcblxuICBpZiAodGFpbGJpdHMgPT09IDApIHtcbiAgICByZXN1bHQucHVzaCgoYml0cyA+PiAxNikgJiAweEZGKTtcbiAgICByZXN1bHQucHVzaCgoYml0cyA+PiA4KSAmIDB4RkYpO1xuICAgIHJlc3VsdC5wdXNoKGJpdHMgJiAweEZGKTtcbiAgfSBlbHNlIGlmICh0YWlsYml0cyA9PT0gMTgpIHtcbiAgICByZXN1bHQucHVzaCgoYml0cyA+PiAxMCkgJiAweEZGKTtcbiAgICByZXN1bHQucHVzaCgoYml0cyA+PiAyKSAmIDB4RkYpO1xuICB9IGVsc2UgaWYgKHRhaWxiaXRzID09PSAxMikge1xuICAgIHJlc3VsdC5wdXNoKChiaXRzID4+IDQpICYgMHhGRik7XG4gIH1cblxuICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkocmVzdWx0KTtcbn1cblxuZnVuY3Rpb24gcmVwcmVzZW50WWFtbEJpbmFyeShvYmplY3QgLyosIHN0eWxlKi8pIHtcbiAgdmFyIHJlc3VsdCA9ICcnLCBiaXRzID0gMCwgaWR4LCB0YWlsLFxuICAgICAgbWF4ID0gb2JqZWN0Lmxlbmd0aCxcbiAgICAgIG1hcCA9IEJBU0U2NF9NQVA7XG5cbiAgLy8gQ29udmVydCBldmVyeSB0aHJlZSBieXRlcyB0byA0IEFTQ0lJIGNoYXJhY3RlcnMuXG5cbiAgZm9yIChpZHggPSAwOyBpZHggPCBtYXg7IGlkeCsrKSB7XG4gICAgaWYgKChpZHggJSAzID09PSAwKSAmJiBpZHgpIHtcbiAgICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPj4gMTgpICYgMHgzRl07XG4gICAgICByZXN1bHQgKz0gbWFwWyhiaXRzID4+IDEyKSAmIDB4M0ZdO1xuICAgICAgcmVzdWx0ICs9IG1hcFsoYml0cyA+PiA2KSAmIDB4M0ZdO1xuICAgICAgcmVzdWx0ICs9IG1hcFtiaXRzICYgMHgzRl07XG4gICAgfVxuXG4gICAgYml0cyA9IChiaXRzIDw8IDgpICsgb2JqZWN0W2lkeF07XG4gIH1cblxuICAvLyBEdW1wIHRhaWxcblxuICB0YWlsID0gbWF4ICUgMztcblxuICBpZiAodGFpbCA9PT0gMCkge1xuICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPj4gMTgpICYgMHgzRl07XG4gICAgcmVzdWx0ICs9IG1hcFsoYml0cyA+PiAxMikgJiAweDNGXTtcbiAgICByZXN1bHQgKz0gbWFwWyhiaXRzID4+IDYpICYgMHgzRl07XG4gICAgcmVzdWx0ICs9IG1hcFtiaXRzICYgMHgzRl07XG4gIH0gZWxzZSBpZiAodGFpbCA9PT0gMikge1xuICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPj4gMTApICYgMHgzRl07XG4gICAgcmVzdWx0ICs9IG1hcFsoYml0cyA+PiA0KSAmIDB4M0ZdO1xuICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPDwgMikgJiAweDNGXTtcbiAgICByZXN1bHQgKz0gbWFwWzY0XTtcbiAgfSBlbHNlIGlmICh0YWlsID09PSAxKSB7XG4gICAgcmVzdWx0ICs9IG1hcFsoYml0cyA+PiAyKSAmIDB4M0ZdO1xuICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPDwgNCkgJiAweDNGXTtcbiAgICByZXN1bHQgKz0gbWFwWzY0XTtcbiAgICByZXN1bHQgKz0gbWFwWzY0XTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGlzQmluYXJ5KG9iaikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICAnW29iamVjdCBVaW50OEFycmF5XSc7XG59XG5cbnZhciBiaW5hcnkgPSBuZXcgdHlwZSgndGFnOnlhbWwub3JnLDIwMDI6YmluYXJ5Jywge1xuICBraW5kOiAnc2NhbGFyJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxCaW5hcnksXG4gIGNvbnN0cnVjdDogY29uc3RydWN0WWFtbEJpbmFyeSxcbiAgcHJlZGljYXRlOiBpc0JpbmFyeSxcbiAgcmVwcmVzZW50OiByZXByZXNlbnRZYW1sQmluYXJ5XG59KTtcblxudmFyIF9oYXNPd25Qcm9wZXJ0eSQzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBfdG9TdHJpbmckMiAgICAgICA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sT21hcChkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gdHJ1ZTtcblxuICB2YXIgb2JqZWN0S2V5cyA9IFtdLCBpbmRleCwgbGVuZ3RoLCBwYWlyLCBwYWlyS2V5LCBwYWlySGFzS2V5LFxuICAgICAgb2JqZWN0ID0gZGF0YTtcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICBwYWlyID0gb2JqZWN0W2luZGV4XTtcbiAgICBwYWlySGFzS2V5ID0gZmFsc2U7XG5cbiAgICBpZiAoX3RvU3RyaW5nJDIuY2FsbChwYWlyKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScpIHJldHVybiBmYWxzZTtcblxuICAgIGZvciAocGFpcktleSBpbiBwYWlyKSB7XG4gICAgICBpZiAoX2hhc093blByb3BlcnR5JDMuY2FsbChwYWlyLCBwYWlyS2V5KSkge1xuICAgICAgICBpZiAoIXBhaXJIYXNLZXkpIHBhaXJIYXNLZXkgPSB0cnVlO1xuICAgICAgICBlbHNlIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXBhaXJIYXNLZXkpIHJldHVybiBmYWxzZTtcblxuICAgIGlmIChvYmplY3RLZXlzLmluZGV4T2YocGFpcktleSkgPT09IC0xKSBvYmplY3RLZXlzLnB1c2gocGFpcktleSk7XG4gICAgZWxzZSByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbE9tYXAoZGF0YSkge1xuICByZXR1cm4gZGF0YSAhPT0gbnVsbCA/IGRhdGEgOiBbXTtcbn1cblxudmFyIG9tYXAgPSBuZXcgdHlwZSgndGFnOnlhbWwub3JnLDIwMDI6b21hcCcsIHtcbiAga2luZDogJ3NlcXVlbmNlJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxPbWFwLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxPbWFwXG59KTtcblxudmFyIF90b1N0cmluZyQxID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxQYWlycyhkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gdHJ1ZTtcblxuICB2YXIgaW5kZXgsIGxlbmd0aCwgcGFpciwga2V5cywgcmVzdWx0LFxuICAgICAgb2JqZWN0ID0gZGF0YTtcblxuICByZXN1bHQgPSBuZXcgQXJyYXkob2JqZWN0Lmxlbmd0aCk7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgcGFpciA9IG9iamVjdFtpbmRleF07XG5cbiAgICBpZiAoX3RvU3RyaW5nJDEuY2FsbChwYWlyKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScpIHJldHVybiBmYWxzZTtcblxuICAgIGtleXMgPSBPYmplY3Qua2V5cyhwYWlyKTtcblxuICAgIGlmIChrZXlzLmxlbmd0aCAhPT0gMSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgcmVzdWx0W2luZGV4XSA9IFsga2V5c1swXSwgcGFpcltrZXlzWzBdXSBdO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxQYWlycyhkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gW107XG5cbiAgdmFyIGluZGV4LCBsZW5ndGgsIHBhaXIsIGtleXMsIHJlc3VsdCxcbiAgICAgIG9iamVjdCA9IGRhdGE7XG5cbiAgcmVzdWx0ID0gbmV3IEFycmF5KG9iamVjdC5sZW5ndGgpO1xuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBvYmplY3QubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHBhaXIgPSBvYmplY3RbaW5kZXhdO1xuXG4gICAga2V5cyA9IE9iamVjdC5rZXlzKHBhaXIpO1xuXG4gICAgcmVzdWx0W2luZGV4XSA9IFsga2V5c1swXSwgcGFpcltrZXlzWzBdXSBdO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxudmFyIHBhaXJzID0gbmV3IHR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOnBhaXJzJywge1xuICBraW5kOiAnc2VxdWVuY2UnLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbFBhaXJzLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxQYWlyc1xufSk7XG5cbnZhciBfaGFzT3duUHJvcGVydHkkMiA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sU2V0KGRhdGEpIHtcbiAgaWYgKGRhdGEgPT09IG51bGwpIHJldHVybiB0cnVlO1xuXG4gIHZhciBrZXksIG9iamVjdCA9IGRhdGE7XG5cbiAgZm9yIChrZXkgaW4gb2JqZWN0KSB7XG4gICAgaWYgKF9oYXNPd25Qcm9wZXJ0eSQyLmNhbGwob2JqZWN0LCBrZXkpKSB7XG4gICAgICBpZiAob2JqZWN0W2tleV0gIT09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbFNldChkYXRhKSB7XG4gIHJldHVybiBkYXRhICE9PSBudWxsID8gZGF0YSA6IHt9O1xufVxuXG52YXIgc2V0ID0gbmV3IHR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOnNldCcsIHtcbiAga2luZDogJ21hcHBpbmcnLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbFNldCxcbiAgY29uc3RydWN0OiBjb25zdHJ1Y3RZYW1sU2V0XG59KTtcblxudmFyIF9kZWZhdWx0ID0gY29yZS5leHRlbmQoe1xuICBpbXBsaWNpdDogW1xuICAgIHRpbWVzdGFtcCxcbiAgICBtZXJnZVxuICBdLFxuICBleHBsaWNpdDogW1xuICAgIGJpbmFyeSxcbiAgICBvbWFwLFxuICAgIHBhaXJzLFxuICAgIHNldFxuICBdXG59KTtcblxuLyplc2xpbnQtZGlzYWJsZSBtYXgtbGVuLG5vLXVzZS1iZWZvcmUtZGVmaW5lKi9cblxuXG5cblxuXG5cblxudmFyIF9oYXNPd25Qcm9wZXJ0eSQxID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuXG52YXIgQ09OVEVYVF9GTE9XX0lOICAgPSAxO1xudmFyIENPTlRFWFRfRkxPV19PVVQgID0gMjtcbnZhciBDT05URVhUX0JMT0NLX0lOICA9IDM7XG52YXIgQ09OVEVYVF9CTE9DS19PVVQgPSA0O1xuXG5cbnZhciBDSE9NUElOR19DTElQICA9IDE7XG52YXIgQ0hPTVBJTkdfU1RSSVAgPSAyO1xudmFyIENIT01QSU5HX0tFRVAgID0gMztcblxuXG52YXIgUEFUVEVSTl9OT05fUFJJTlRBQkxFICAgICAgICAgPSAvW1xceDAwLVxceDA4XFx4MEJcXHgwQ1xceDBFLVxceDFGXFx4N0YtXFx4ODRcXHg4Ni1cXHg5RlxcdUZGRkVcXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXS87XG52YXIgUEFUVEVSTl9OT05fQVNDSUlfTElORV9CUkVBS1MgPSAvW1xceDg1XFx1MjAyOFxcdTIwMjldLztcbnZhciBQQVRURVJOX0ZMT1dfSU5ESUNBVE9SUyAgICAgICA9IC9bLFxcW1xcXVxce1xcfV0vO1xudmFyIFBBVFRFUk5fVEFHX0hBTkRMRSAgICAgICAgICAgID0gL14oPzohfCEhfCFbYS16XFwtXSshKSQvaTtcbnZhciBQQVRURVJOX1RBR19VUkkgICAgICAgICAgICAgICA9IC9eKD86IXxbXixcXFtcXF1cXHtcXH1dKSg/OiVbMC05YS1mXXsyfXxbMC05YS16XFwtIztcXC9cXD86QCY9XFwrXFwkLF9cXC4hflxcKidcXChcXClcXFtcXF1dKSokL2k7XG5cblxuZnVuY3Rpb24gX2NsYXNzKG9iaikgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaik7IH1cblxuZnVuY3Rpb24gaXNfRU9MKGMpIHtcbiAgcmV0dXJuIChjID09PSAweDBBLyogTEYgKi8pIHx8IChjID09PSAweDBELyogQ1IgKi8pO1xufVxuXG5mdW5jdGlvbiBpc19XSElURV9TUEFDRShjKSB7XG4gIHJldHVybiAoYyA9PT0gMHgwOS8qIFRhYiAqLykgfHwgKGMgPT09IDB4MjAvKiBTcGFjZSAqLyk7XG59XG5cbmZ1bmN0aW9uIGlzX1dTX09SX0VPTChjKSB7XG4gIHJldHVybiAoYyA9PT0gMHgwOS8qIFRhYiAqLykgfHxcbiAgICAgICAgIChjID09PSAweDIwLyogU3BhY2UgKi8pIHx8XG4gICAgICAgICAoYyA9PT0gMHgwQS8qIExGICovKSB8fFxuICAgICAgICAgKGMgPT09IDB4MEQvKiBDUiAqLyk7XG59XG5cbmZ1bmN0aW9uIGlzX0ZMT1dfSU5ESUNBVE9SKGMpIHtcbiAgcmV0dXJuIGMgPT09IDB4MkMvKiAsICovIHx8XG4gICAgICAgICBjID09PSAweDVCLyogWyAqLyB8fFxuICAgICAgICAgYyA9PT0gMHg1RC8qIF0gKi8gfHxcbiAgICAgICAgIGMgPT09IDB4N0IvKiB7ICovIHx8XG4gICAgICAgICBjID09PSAweDdELyogfSAqLztcbn1cblxuZnVuY3Rpb24gZnJvbUhleENvZGUoYykge1xuICB2YXIgbGM7XG5cbiAgaWYgKCgweDMwLyogMCAqLyA8PSBjKSAmJiAoYyA8PSAweDM5LyogOSAqLykpIHtcbiAgICByZXR1cm4gYyAtIDB4MzA7XG4gIH1cblxuICAvKmVzbGludC1kaXNhYmxlIG5vLWJpdHdpc2UqL1xuICBsYyA9IGMgfCAweDIwO1xuXG4gIGlmICgoMHg2MS8qIGEgKi8gPD0gbGMpICYmIChsYyA8PSAweDY2LyogZiAqLykpIHtcbiAgICByZXR1cm4gbGMgLSAweDYxICsgMTA7XG4gIH1cblxuICByZXR1cm4gLTE7XG59XG5cbmZ1bmN0aW9uIGVzY2FwZWRIZXhMZW4oYykge1xuICBpZiAoYyA9PT0gMHg3OC8qIHggKi8pIHsgcmV0dXJuIDI7IH1cbiAgaWYgKGMgPT09IDB4NzUvKiB1ICovKSB7IHJldHVybiA0OyB9XG4gIGlmIChjID09PSAweDU1LyogVSAqLykgeyByZXR1cm4gODsgfVxuICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gZnJvbURlY2ltYWxDb2RlKGMpIHtcbiAgaWYgKCgweDMwLyogMCAqLyA8PSBjKSAmJiAoYyA8PSAweDM5LyogOSAqLykpIHtcbiAgICByZXR1cm4gYyAtIDB4MzA7XG4gIH1cblxuICByZXR1cm4gLTE7XG59XG5cbmZ1bmN0aW9uIHNpbXBsZUVzY2FwZVNlcXVlbmNlKGMpIHtcbiAgLyogZXNsaW50LWRpc2FibGUgaW5kZW50ICovXG4gIHJldHVybiAoYyA9PT0gMHgzMC8qIDAgKi8pID8gJ1xceDAwJyA6XG4gICAgICAgIChjID09PSAweDYxLyogYSAqLykgPyAnXFx4MDcnIDpcbiAgICAgICAgKGMgPT09IDB4NjIvKiBiICovKSA/ICdcXHgwOCcgOlxuICAgICAgICAoYyA9PT0gMHg3NC8qIHQgKi8pID8gJ1xceDA5JyA6XG4gICAgICAgIChjID09PSAweDA5LyogVGFiICovKSA/ICdcXHgwOScgOlxuICAgICAgICAoYyA9PT0gMHg2RS8qIG4gKi8pID8gJ1xceDBBJyA6XG4gICAgICAgIChjID09PSAweDc2LyogdiAqLykgPyAnXFx4MEInIDpcbiAgICAgICAgKGMgPT09IDB4NjYvKiBmICovKSA/ICdcXHgwQycgOlxuICAgICAgICAoYyA9PT0gMHg3Mi8qIHIgKi8pID8gJ1xceDBEJyA6XG4gICAgICAgIChjID09PSAweDY1LyogZSAqLykgPyAnXFx4MUInIDpcbiAgICAgICAgKGMgPT09IDB4MjAvKiBTcGFjZSAqLykgPyAnICcgOlxuICAgICAgICAoYyA9PT0gMHgyMi8qIFwiICovKSA/ICdcXHgyMicgOlxuICAgICAgICAoYyA9PT0gMHgyRi8qIC8gKi8pID8gJy8nIDpcbiAgICAgICAgKGMgPT09IDB4NUMvKiBcXCAqLykgPyAnXFx4NUMnIDpcbiAgICAgICAgKGMgPT09IDB4NEUvKiBOICovKSA/ICdcXHg4NScgOlxuICAgICAgICAoYyA9PT0gMHg1Ri8qIF8gKi8pID8gJ1xceEEwJyA6XG4gICAgICAgIChjID09PSAweDRDLyogTCAqLykgPyAnXFx1MjAyOCcgOlxuICAgICAgICAoYyA9PT0gMHg1MC8qIFAgKi8pID8gJ1xcdTIwMjknIDogJyc7XG59XG5cbmZ1bmN0aW9uIGNoYXJGcm9tQ29kZXBvaW50KGMpIHtcbiAgaWYgKGMgPD0gMHhGRkZGKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoYyk7XG4gIH1cbiAgLy8gRW5jb2RlIFVURi0xNiBzdXJyb2dhdGUgcGFpclxuICAvLyBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9VVEYtMTYjQ29kZV9wb2ludHNfVS4yQjAxMDAwMF90b19VLjJCMTBGRkZGXG4gIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKFxuICAgICgoYyAtIDB4MDEwMDAwKSA+PiAxMCkgKyAweEQ4MDAsXG4gICAgKChjIC0gMHgwMTAwMDApICYgMHgwM0ZGKSArIDB4REMwMFxuICApO1xufVxuXG4vLyBzZXQgYSBwcm9wZXJ0eSBvZiBhIGxpdGVyYWwgb2JqZWN0LCB3aGlsZSBwcm90ZWN0aW5nIGFnYWluc3QgcHJvdG90eXBlIHBvbGx1dGlvbixcbi8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vbm9kZWNhL2pzLXlhbWwvaXNzdWVzLzE2NCBmb3IgbW9yZSBkZXRhaWxzXG5mdW5jdGlvbiBzZXRQcm9wZXJ0eShvYmplY3QsIGtleSwgdmFsdWUpIHtcbiAgLy8gdXNlZCBmb3IgdGhpcyBzcGVjaWZpYyBrZXkgb25seSBiZWNhdXNlIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBpcyBzbG93XG4gIGlmIChrZXkgPT09ICdfX3Byb3RvX18nKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwga2V5LCB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICB2YWx1ZTogdmFsdWVcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBvYmplY3Rba2V5XSA9IHZhbHVlO1xuICB9XG59XG5cbnZhciBzaW1wbGVFc2NhcGVDaGVjayA9IG5ldyBBcnJheSgyNTYpOyAvLyBpbnRlZ2VyLCBmb3IgZmFzdCBhY2Nlc3NcbnZhciBzaW1wbGVFc2NhcGVNYXAgPSBuZXcgQXJyYXkoMjU2KTtcbmZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyBpKyspIHtcbiAgc2ltcGxlRXNjYXBlQ2hlY2tbaV0gPSBzaW1wbGVFc2NhcGVTZXF1ZW5jZShpKSA/IDEgOiAwO1xuICBzaW1wbGVFc2NhcGVNYXBbaV0gPSBzaW1wbGVFc2NhcGVTZXF1ZW5jZShpKTtcbn1cblxuXG5mdW5jdGlvbiBTdGF0ZSQxKGlucHV0LCBvcHRpb25zKSB7XG4gIHRoaXMuaW5wdXQgPSBpbnB1dDtcblxuICB0aGlzLmZpbGVuYW1lICA9IG9wdGlvbnNbJ2ZpbGVuYW1lJ10gIHx8IG51bGw7XG4gIHRoaXMuc2NoZW1hICAgID0gb3B0aW9uc1snc2NoZW1hJ10gICAgfHwgX2RlZmF1bHQ7XG4gIHRoaXMub25XYXJuaW5nID0gb3B0aW9uc1snb25XYXJuaW5nJ10gfHwgbnVsbDtcbiAgLy8gKEhpZGRlbikgUmVtb3ZlPyBtYWtlcyB0aGUgbG9hZGVyIHRvIGV4cGVjdCBZQU1MIDEuMSBkb2N1bWVudHNcbiAgLy8gaWYgc3VjaCBkb2N1bWVudHMgaGF2ZSBubyBleHBsaWNpdCAlWUFNTCBkaXJlY3RpdmVcbiAgdGhpcy5sZWdhY3kgICAgPSBvcHRpb25zWydsZWdhY3knXSAgICB8fCBmYWxzZTtcblxuICB0aGlzLmpzb24gICAgICA9IG9wdGlvbnNbJ2pzb24nXSAgICAgIHx8IGZhbHNlO1xuICB0aGlzLmxpc3RlbmVyICA9IG9wdGlvbnNbJ2xpc3RlbmVyJ10gIHx8IG51bGw7XG5cbiAgdGhpcy5pbXBsaWNpdFR5cGVzID0gdGhpcy5zY2hlbWEuY29tcGlsZWRJbXBsaWNpdDtcbiAgdGhpcy50eXBlTWFwICAgICAgID0gdGhpcy5zY2hlbWEuY29tcGlsZWRUeXBlTWFwO1xuXG4gIHRoaXMubGVuZ3RoICAgICA9IGlucHV0Lmxlbmd0aDtcbiAgdGhpcy5wb3NpdGlvbiAgID0gMDtcbiAgdGhpcy5saW5lICAgICAgID0gMDtcbiAgdGhpcy5saW5lU3RhcnQgID0gMDtcbiAgdGhpcy5saW5lSW5kZW50ID0gMDtcblxuICAvLyBwb3NpdGlvbiBvZiBmaXJzdCBsZWFkaW5nIHRhYiBpbiB0aGUgY3VycmVudCBsaW5lLFxuICAvLyB1c2VkIHRvIG1ha2Ugc3VyZSB0aGVyZSBhcmUgbm8gdGFicyBpbiB0aGUgaW5kZW50YXRpb25cbiAgdGhpcy5maXJzdFRhYkluTGluZSA9IC0xO1xuXG4gIHRoaXMuZG9jdW1lbnRzID0gW107XG5cbiAgLypcbiAgdGhpcy52ZXJzaW9uO1xuICB0aGlzLmNoZWNrTGluZUJyZWFrcztcbiAgdGhpcy50YWdNYXA7XG4gIHRoaXMuYW5jaG9yTWFwO1xuICB0aGlzLnRhZztcbiAgdGhpcy5hbmNob3I7XG4gIHRoaXMua2luZDtcbiAgdGhpcy5yZXN1bHQ7Ki9cblxufVxuXG5cbmZ1bmN0aW9uIGdlbmVyYXRlRXJyb3Ioc3RhdGUsIG1lc3NhZ2UpIHtcbiAgdmFyIG1hcmsgPSB7XG4gICAgbmFtZTogICAgIHN0YXRlLmZpbGVuYW1lLFxuICAgIGJ1ZmZlcjogICBzdGF0ZS5pbnB1dC5zbGljZSgwLCAtMSksIC8vIG9taXQgdHJhaWxpbmcgXFwwXG4gICAgcG9zaXRpb246IHN0YXRlLnBvc2l0aW9uLFxuICAgIGxpbmU6ICAgICBzdGF0ZS5saW5lLFxuICAgIGNvbHVtbjogICBzdGF0ZS5wb3NpdGlvbiAtIHN0YXRlLmxpbmVTdGFydFxuICB9O1xuXG4gIG1hcmsuc25pcHBldCA9IHNuaXBwZXQobWFyayk7XG5cbiAgcmV0dXJuIG5ldyBleGNlcHRpb24obWVzc2FnZSwgbWFyayk7XG59XG5cbmZ1bmN0aW9uIHRocm93RXJyb3Ioc3RhdGUsIG1lc3NhZ2UpIHtcbiAgdGhyb3cgZ2VuZXJhdGVFcnJvcihzdGF0ZSwgbWVzc2FnZSk7XG59XG5cbmZ1bmN0aW9uIHRocm93V2FybmluZyhzdGF0ZSwgbWVzc2FnZSkge1xuICBpZiAoc3RhdGUub25XYXJuaW5nKSB7XG4gICAgc3RhdGUub25XYXJuaW5nLmNhbGwobnVsbCwgZ2VuZXJhdGVFcnJvcihzdGF0ZSwgbWVzc2FnZSkpO1xuICB9XG59XG5cblxudmFyIGRpcmVjdGl2ZUhhbmRsZXJzID0ge1xuXG4gIFlBTUw6IGZ1bmN0aW9uIGhhbmRsZVlhbWxEaXJlY3RpdmUoc3RhdGUsIG5hbWUsIGFyZ3MpIHtcblxuICAgIHZhciBtYXRjaCwgbWFqb3IsIG1pbm9yO1xuXG4gICAgaWYgKHN0YXRlLnZlcnNpb24gIT09IG51bGwpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdkdXBsaWNhdGlvbiBvZiAlWUFNTCBkaXJlY3RpdmUnKTtcbiAgICB9XG5cbiAgICBpZiAoYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdZQU1MIGRpcmVjdGl2ZSBhY2NlcHRzIGV4YWN0bHkgb25lIGFyZ3VtZW50Jyk7XG4gICAgfVxuXG4gICAgbWF0Y2ggPSAvXihbMC05XSspXFwuKFswLTldKykkLy5leGVjKGFyZ3NbMF0pO1xuXG4gICAgaWYgKG1hdGNoID09PSBudWxsKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnaWxsLWZvcm1lZCBhcmd1bWVudCBvZiB0aGUgWUFNTCBkaXJlY3RpdmUnKTtcbiAgICB9XG5cbiAgICBtYWpvciA9IHBhcnNlSW50KG1hdGNoWzFdLCAxMCk7XG4gICAgbWlub3IgPSBwYXJzZUludChtYXRjaFsyXSwgMTApO1xuXG4gICAgaWYgKG1ham9yICE9PSAxKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndW5hY2NlcHRhYmxlIFlBTUwgdmVyc2lvbiBvZiB0aGUgZG9jdW1lbnQnKTtcbiAgICB9XG5cbiAgICBzdGF0ZS52ZXJzaW9uID0gYXJnc1swXTtcbiAgICBzdGF0ZS5jaGVja0xpbmVCcmVha3MgPSAobWlub3IgPCAyKTtcblxuICAgIGlmIChtaW5vciAhPT0gMSAmJiBtaW5vciAhPT0gMikge1xuICAgICAgdGhyb3dXYXJuaW5nKHN0YXRlLCAndW5zdXBwb3J0ZWQgWUFNTCB2ZXJzaW9uIG9mIHRoZSBkb2N1bWVudCcpO1xuICAgIH1cbiAgfSxcblxuICBUQUc6IGZ1bmN0aW9uIGhhbmRsZVRhZ0RpcmVjdGl2ZShzdGF0ZSwgbmFtZSwgYXJncykge1xuXG4gICAgdmFyIGhhbmRsZSwgcHJlZml4O1xuXG4gICAgaWYgKGFyZ3MubGVuZ3RoICE9PSAyKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnVEFHIGRpcmVjdGl2ZSBhY2NlcHRzIGV4YWN0bHkgdHdvIGFyZ3VtZW50cycpO1xuICAgIH1cblxuICAgIGhhbmRsZSA9IGFyZ3NbMF07XG4gICAgcHJlZml4ID0gYXJnc1sxXTtcblxuICAgIGlmICghUEFUVEVSTl9UQUdfSEFORExFLnRlc3QoaGFuZGxlKSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2lsbC1mb3JtZWQgdGFnIGhhbmRsZSAoZmlyc3QgYXJndW1lbnQpIG9mIHRoZSBUQUcgZGlyZWN0aXZlJyk7XG4gICAgfVxuXG4gICAgaWYgKF9oYXNPd25Qcm9wZXJ0eSQxLmNhbGwoc3RhdGUudGFnTWFwLCBoYW5kbGUpKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndGhlcmUgaXMgYSBwcmV2aW91c2x5IGRlY2xhcmVkIHN1ZmZpeCBmb3IgXCInICsgaGFuZGxlICsgJ1wiIHRhZyBoYW5kbGUnKTtcbiAgICB9XG5cbiAgICBpZiAoIVBBVFRFUk5fVEFHX1VSSS50ZXN0KHByZWZpeCkpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdpbGwtZm9ybWVkIHRhZyBwcmVmaXggKHNlY29uZCBhcmd1bWVudCkgb2YgdGhlIFRBRyBkaXJlY3RpdmUnKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgcHJlZml4ID0gZGVjb2RlVVJJQ29tcG9uZW50KHByZWZpeCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndGFnIHByZWZpeCBpcyBtYWxmb3JtZWQ6ICcgKyBwcmVmaXgpO1xuICAgIH1cblxuICAgIHN0YXRlLnRhZ01hcFtoYW5kbGVdID0gcHJlZml4O1xuICB9XG59O1xuXG5cbmZ1bmN0aW9uIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBzdGFydCwgZW5kLCBjaGVja0pzb24pIHtcbiAgdmFyIF9wb3NpdGlvbiwgX2xlbmd0aCwgX2NoYXJhY3RlciwgX3Jlc3VsdDtcblxuICBpZiAoc3RhcnQgPCBlbmQpIHtcbiAgICBfcmVzdWx0ID0gc3RhdGUuaW5wdXQuc2xpY2Uoc3RhcnQsIGVuZCk7XG5cbiAgICBpZiAoY2hlY2tKc29uKSB7XG4gICAgICBmb3IgKF9wb3NpdGlvbiA9IDAsIF9sZW5ndGggPSBfcmVzdWx0Lmxlbmd0aDsgX3Bvc2l0aW9uIDwgX2xlbmd0aDsgX3Bvc2l0aW9uICs9IDEpIHtcbiAgICAgICAgX2NoYXJhY3RlciA9IF9yZXN1bHQuY2hhckNvZGVBdChfcG9zaXRpb24pO1xuICAgICAgICBpZiAoIShfY2hhcmFjdGVyID09PSAweDA5IHx8XG4gICAgICAgICAgICAgICgweDIwIDw9IF9jaGFyYWN0ZXIgJiYgX2NoYXJhY3RlciA8PSAweDEwRkZGRikpKSB7XG4gICAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2V4cGVjdGVkIHZhbGlkIEpTT04gY2hhcmFjdGVyJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFBBVFRFUk5fTk9OX1BSSU5UQUJMRS50ZXN0KF9yZXN1bHQpKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndGhlIHN0cmVhbSBjb250YWlucyBub24tcHJpbnRhYmxlIGNoYXJhY3RlcnMnKTtcbiAgICB9XG5cbiAgICBzdGF0ZS5yZXN1bHQgKz0gX3Jlc3VsdDtcbiAgfVxufVxuXG5mdW5jdGlvbiBtZXJnZU1hcHBpbmdzKHN0YXRlLCBkZXN0aW5hdGlvbiwgc291cmNlLCBvdmVycmlkYWJsZUtleXMpIHtcbiAgdmFyIHNvdXJjZUtleXMsIGtleSwgaW5kZXgsIHF1YW50aXR5O1xuXG4gIGlmICghY29tbW9uLmlzT2JqZWN0KHNvdXJjZSkpIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAnY2Fubm90IG1lcmdlIG1hcHBpbmdzOyB0aGUgcHJvdmlkZWQgc291cmNlIG9iamVjdCBpcyB1bmFjY2VwdGFibGUnKTtcbiAgfVxuXG4gIHNvdXJjZUtleXMgPSBPYmplY3Qua2V5cyhzb3VyY2UpO1xuXG4gIGZvciAoaW5kZXggPSAwLCBxdWFudGl0eSA9IHNvdXJjZUtleXMubGVuZ3RoOyBpbmRleCA8IHF1YW50aXR5OyBpbmRleCArPSAxKSB7XG4gICAga2V5ID0gc291cmNlS2V5c1tpbmRleF07XG5cbiAgICBpZiAoIV9oYXNPd25Qcm9wZXJ0eSQxLmNhbGwoZGVzdGluYXRpb24sIGtleSkpIHtcbiAgICAgIHNldFByb3BlcnR5KGRlc3RpbmF0aW9uLCBrZXksIHNvdXJjZVtrZXldKTtcbiAgICAgIG92ZXJyaWRhYmxlS2V5c1trZXldID0gdHJ1ZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gc3RvcmVNYXBwaW5nUGFpcihzdGF0ZSwgX3Jlc3VsdCwgb3ZlcnJpZGFibGVLZXlzLCBrZXlUYWcsIGtleU5vZGUsIHZhbHVlTm9kZSxcbiAgc3RhcnRMaW5lLCBzdGFydExpbmVTdGFydCwgc3RhcnRQb3MpIHtcblxuICB2YXIgaW5kZXgsIHF1YW50aXR5O1xuXG4gIC8vIFRoZSBvdXRwdXQgaXMgYSBwbGFpbiBvYmplY3QgaGVyZSwgc28ga2V5cyBjYW4gb25seSBiZSBzdHJpbmdzLlxuICAvLyBXZSBuZWVkIHRvIGNvbnZlcnQga2V5Tm9kZSB0byBhIHN0cmluZywgYnV0IGRvaW5nIHNvIGNhbiBoYW5nIHRoZSBwcm9jZXNzXG4gIC8vIChkZWVwbHkgbmVzdGVkIGFycmF5cyB0aGF0IGV4cGxvZGUgZXhwb25lbnRpYWxseSB1c2luZyBhbGlhc2VzKS5cbiAgaWYgKEFycmF5LmlzQXJyYXkoa2V5Tm9kZSkpIHtcbiAgICBrZXlOb2RlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoa2V5Tm9kZSk7XG5cbiAgICBmb3IgKGluZGV4ID0gMCwgcXVhbnRpdHkgPSBrZXlOb2RlLmxlbmd0aDsgaW5kZXggPCBxdWFudGl0eTsgaW5kZXggKz0gMSkge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoa2V5Tm9kZVtpbmRleF0pKSB7XG4gICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICduZXN0ZWQgYXJyYXlzIGFyZSBub3Qgc3VwcG9ydGVkIGluc2lkZSBrZXlzJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Yga2V5Tm9kZSA9PT0gJ29iamVjdCcgJiYgX2NsYXNzKGtleU5vZGVbaW5kZXhdKSA9PT0gJ1tvYmplY3QgT2JqZWN0XScpIHtcbiAgICAgICAga2V5Tm9kZVtpbmRleF0gPSAnW29iamVjdCBPYmplY3RdJztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBBdm9pZCBjb2RlIGV4ZWN1dGlvbiBpbiBsb2FkKCkgdmlhIHRvU3RyaW5nIHByb3BlcnR5XG4gIC8vIChzdGlsbCB1c2UgaXRzIG93biB0b1N0cmluZyBmb3IgYXJyYXlzLCB0aW1lc3RhbXBzLFxuICAvLyBhbmQgd2hhdGV2ZXIgdXNlciBzY2hlbWEgZXh0ZW5zaW9ucyBoYXBwZW4gdG8gaGF2ZSBAQHRvU3RyaW5nVGFnKVxuICBpZiAodHlwZW9mIGtleU5vZGUgPT09ICdvYmplY3QnICYmIF9jbGFzcyhrZXlOb2RlKSA9PT0gJ1tvYmplY3QgT2JqZWN0XScpIHtcbiAgICBrZXlOb2RlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG4gIH1cblxuXG4gIGtleU5vZGUgPSBTdHJpbmcoa2V5Tm9kZSk7XG5cbiAgaWYgKF9yZXN1bHQgPT09IG51bGwpIHtcbiAgICBfcmVzdWx0ID0ge307XG4gIH1cblxuICBpZiAoa2V5VGFnID09PSAndGFnOnlhbWwub3JnLDIwMDI6bWVyZ2UnKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWVOb2RlKSkge1xuICAgICAgZm9yIChpbmRleCA9IDAsIHF1YW50aXR5ID0gdmFsdWVOb2RlLmxlbmd0aDsgaW5kZXggPCBxdWFudGl0eTsgaW5kZXggKz0gMSkge1xuICAgICAgICBtZXJnZU1hcHBpbmdzKHN0YXRlLCBfcmVzdWx0LCB2YWx1ZU5vZGVbaW5kZXhdLCBvdmVycmlkYWJsZUtleXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBtZXJnZU1hcHBpbmdzKHN0YXRlLCBfcmVzdWx0LCB2YWx1ZU5vZGUsIG92ZXJyaWRhYmxlS2V5cyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmICghc3RhdGUuanNvbiAmJlxuICAgICAgICAhX2hhc093blByb3BlcnR5JDEuY2FsbChvdmVycmlkYWJsZUtleXMsIGtleU5vZGUpICYmXG4gICAgICAgIF9oYXNPd25Qcm9wZXJ0eSQxLmNhbGwoX3Jlc3VsdCwga2V5Tm9kZSkpIHtcbiAgICAgIHN0YXRlLmxpbmUgPSBzdGFydExpbmUgfHwgc3RhdGUubGluZTtcbiAgICAgIHN0YXRlLmxpbmVTdGFydCA9IHN0YXJ0TGluZVN0YXJ0IHx8IHN0YXRlLmxpbmVTdGFydDtcbiAgICAgIHN0YXRlLnBvc2l0aW9uID0gc3RhcnRQb3MgfHwgc3RhdGUucG9zaXRpb247XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnZHVwbGljYXRlZCBtYXBwaW5nIGtleScpO1xuICAgIH1cblxuICAgIHNldFByb3BlcnR5KF9yZXN1bHQsIGtleU5vZGUsIHZhbHVlTm9kZSk7XG4gICAgZGVsZXRlIG92ZXJyaWRhYmxlS2V5c1trZXlOb2RlXTtcbiAgfVxuXG4gIHJldHVybiBfcmVzdWx0O1xufVxuXG5mdW5jdGlvbiByZWFkTGluZUJyZWFrKHN0YXRlKSB7XG4gIHZhciBjaDtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmIChjaCA9PT0gMHgwQS8qIExGICovKSB7XG4gICAgc3RhdGUucG9zaXRpb24rKztcbiAgfSBlbHNlIGlmIChjaCA9PT0gMHgwRC8qIENSICovKSB7XG4gICAgc3RhdGUucG9zaXRpb24rKztcbiAgICBpZiAoc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbikgPT09IDB4MEEvKiBMRiAqLykge1xuICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2EgbGluZSBicmVhayBpcyBleHBlY3RlZCcpO1xuICB9XG5cbiAgc3RhdGUubGluZSArPSAxO1xuICBzdGF0ZS5saW5lU3RhcnQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgc3RhdGUuZmlyc3RUYWJJbkxpbmUgPSAtMTtcbn1cblxuZnVuY3Rpb24gc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgYWxsb3dDb21tZW50cywgY2hlY2tJbmRlbnQpIHtcbiAgdmFyIGxpbmVCcmVha3MgPSAwLFxuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICB3aGlsZSAoY2ggIT09IDApIHtcbiAgICB3aGlsZSAoaXNfV0hJVEVfU1BBQ0UoY2gpKSB7XG4gICAgICBpZiAoY2ggPT09IDB4MDkvKiBUYWIgKi8gJiYgc3RhdGUuZmlyc3RUYWJJbkxpbmUgPT09IC0xKSB7XG4gICAgICAgIHN0YXRlLmZpcnN0VGFiSW5MaW5lID0gc3RhdGUucG9zaXRpb247XG4gICAgICB9XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfVxuXG4gICAgaWYgKGFsbG93Q29tbWVudHMgJiYgY2ggPT09IDB4MjMvKiAjICovKSB7XG4gICAgICBkbyB7XG4gICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICAgIH0gd2hpbGUgKGNoICE9PSAweDBBLyogTEYgKi8gJiYgY2ggIT09IDB4MEQvKiBDUiAqLyAmJiBjaCAhPT0gMCk7XG4gICAgfVxuXG4gICAgaWYgKGlzX0VPTChjaCkpIHtcbiAgICAgIHJlYWRMaW5lQnJlYWsoc3RhdGUpO1xuXG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuICAgICAgbGluZUJyZWFrcysrO1xuICAgICAgc3RhdGUubGluZUluZGVudCA9IDA7XG5cbiAgICAgIHdoaWxlIChjaCA9PT0gMHgyMC8qIFNwYWNlICovKSB7XG4gICAgICAgIHN0YXRlLmxpbmVJbmRlbnQrKztcbiAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAoY2hlY2tJbmRlbnQgIT09IC0xICYmIGxpbmVCcmVha3MgIT09IDAgJiYgc3RhdGUubGluZUluZGVudCA8IGNoZWNrSW5kZW50KSB7XG4gICAgdGhyb3dXYXJuaW5nKHN0YXRlLCAnZGVmaWNpZW50IGluZGVudGF0aW9uJyk7XG4gIH1cblxuICByZXR1cm4gbGluZUJyZWFrcztcbn1cblxuZnVuY3Rpb24gdGVzdERvY3VtZW50U2VwYXJhdG9yKHN0YXRlKSB7XG4gIHZhciBfcG9zaXRpb24gPSBzdGF0ZS5wb3NpdGlvbixcbiAgICAgIGNoO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChfcG9zaXRpb24pO1xuXG4gIC8vIENvbmRpdGlvbiBzdGF0ZS5wb3NpdGlvbiA9PT0gc3RhdGUubGluZVN0YXJ0IGlzIHRlc3RlZFxuICAvLyBpbiBwYXJlbnQgb24gZWFjaCBjYWxsLCBmb3IgZWZmaWNpZW5jeS4gTm8gbmVlZHMgdG8gdGVzdCBoZXJlIGFnYWluLlxuICBpZiAoKGNoID09PSAweDJELyogLSAqLyB8fCBjaCA9PT0gMHgyRS8qIC4gKi8pICYmXG4gICAgICBjaCA9PT0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChfcG9zaXRpb24gKyAxKSAmJlxuICAgICAgY2ggPT09IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoX3Bvc2l0aW9uICsgMikpIHtcblxuICAgIF9wb3NpdGlvbiArPSAzO1xuXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KF9wb3NpdGlvbik7XG5cbiAgICBpZiAoY2ggPT09IDAgfHwgaXNfV1NfT1JfRU9MKGNoKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiB3cml0ZUZvbGRlZExpbmVzKHN0YXRlLCBjb3VudCkge1xuICBpZiAoY291bnQgPT09IDEpIHtcbiAgICBzdGF0ZS5yZXN1bHQgKz0gJyAnO1xuICB9IGVsc2UgaWYgKGNvdW50ID4gMSkge1xuICAgIHN0YXRlLnJlc3VsdCArPSBjb21tb24ucmVwZWF0KCdcXG4nLCBjb3VudCAtIDEpO1xuICB9XG59XG5cblxuZnVuY3Rpb24gcmVhZFBsYWluU2NhbGFyKHN0YXRlLCBub2RlSW5kZW50LCB3aXRoaW5GbG93Q29sbGVjdGlvbikge1xuICB2YXIgcHJlY2VkaW5nLFxuICAgICAgZm9sbG93aW5nLFxuICAgICAgY2FwdHVyZVN0YXJ0LFxuICAgICAgY2FwdHVyZUVuZCxcbiAgICAgIGhhc1BlbmRpbmdDb250ZW50LFxuICAgICAgX2xpbmUsXG4gICAgICBfbGluZVN0YXJ0LFxuICAgICAgX2xpbmVJbmRlbnQsXG4gICAgICBfa2luZCA9IHN0YXRlLmtpbmQsXG4gICAgICBfcmVzdWx0ID0gc3RhdGUucmVzdWx0LFxuICAgICAgY2g7XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoaXNfV1NfT1JfRU9MKGNoKSAgICAgIHx8XG4gICAgICBpc19GTE9XX0lORElDQVRPUihjaCkgfHxcbiAgICAgIGNoID09PSAweDIzLyogIyAqLyAgICB8fFxuICAgICAgY2ggPT09IDB4MjYvKiAmICovICAgIHx8XG4gICAgICBjaCA9PT0gMHgyQS8qICogKi8gICAgfHxcbiAgICAgIGNoID09PSAweDIxLyogISAqLyAgICB8fFxuICAgICAgY2ggPT09IDB4N0MvKiB8ICovICAgIHx8XG4gICAgICBjaCA9PT0gMHgzRS8qID4gKi8gICAgfHxcbiAgICAgIGNoID09PSAweDI3LyogJyAqLyAgICB8fFxuICAgICAgY2ggPT09IDB4MjIvKiBcIiAqLyAgICB8fFxuICAgICAgY2ggPT09IDB4MjUvKiAlICovICAgIHx8XG4gICAgICBjaCA9PT0gMHg0MC8qIEAgKi8gICAgfHxcbiAgICAgIGNoID09PSAweDYwLyogYCAqLykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChjaCA9PT0gMHgzRi8qID8gKi8gfHwgY2ggPT09IDB4MkQvKiAtICovKSB7XG4gICAgZm9sbG93aW5nID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDEpO1xuXG4gICAgaWYgKGlzX1dTX09SX0VPTChmb2xsb3dpbmcpIHx8XG4gICAgICAgIHdpdGhpbkZsb3dDb2xsZWN0aW9uICYmIGlzX0ZMT1dfSU5ESUNBVE9SKGZvbGxvd2luZykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBzdGF0ZS5raW5kID0gJ3NjYWxhcic7XG4gIHN0YXRlLnJlc3VsdCA9ICcnO1xuICBjYXB0dXJlU3RhcnQgPSBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG4gIGhhc1BlbmRpbmdDb250ZW50ID0gZmFsc2U7XG5cbiAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgaWYgKGNoID09PSAweDNBLyogOiAqLykge1xuICAgICAgZm9sbG93aW5nID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDEpO1xuXG4gICAgICBpZiAoaXNfV1NfT1JfRU9MKGZvbGxvd2luZykgfHxcbiAgICAgICAgICB3aXRoaW5GbG93Q29sbGVjdGlvbiAmJiBpc19GTE9XX0lORElDQVRPUihmb2xsb3dpbmcpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIGlmIChjaCA9PT0gMHgyMy8qICMgKi8pIHtcbiAgICAgIHByZWNlZGluZyA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24gLSAxKTtcblxuICAgICAgaWYgKGlzX1dTX09SX0VPTChwcmVjZWRpbmcpKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIGlmICgoc3RhdGUucG9zaXRpb24gPT09IHN0YXRlLmxpbmVTdGFydCAmJiB0ZXN0RG9jdW1lbnRTZXBhcmF0b3Ioc3RhdGUpKSB8fFxuICAgICAgICAgICAgICAgd2l0aGluRmxvd0NvbGxlY3Rpb24gJiYgaXNfRkxPV19JTkRJQ0FUT1IoY2gpKSB7XG4gICAgICBicmVhaztcblxuICAgIH0gZWxzZSBpZiAoaXNfRU9MKGNoKSkge1xuICAgICAgX2xpbmUgPSBzdGF0ZS5saW5lO1xuICAgICAgX2xpbmVTdGFydCA9IHN0YXRlLmxpbmVTdGFydDtcbiAgICAgIF9saW5lSW5kZW50ID0gc3RhdGUubGluZUluZGVudDtcbiAgICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIGZhbHNlLCAtMSk7XG5cbiAgICAgIGlmIChzdGF0ZS5saW5lSW5kZW50ID49IG5vZGVJbmRlbnQpIHtcbiAgICAgICAgaGFzUGVuZGluZ0NvbnRlbnQgPSB0cnVlO1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLnBvc2l0aW9uID0gY2FwdHVyZUVuZDtcbiAgICAgICAgc3RhdGUubGluZSA9IF9saW5lO1xuICAgICAgICBzdGF0ZS5saW5lU3RhcnQgPSBfbGluZVN0YXJ0O1xuICAgICAgICBzdGF0ZS5saW5lSW5kZW50ID0gX2xpbmVJbmRlbnQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChoYXNQZW5kaW5nQ29udGVudCkge1xuICAgICAgY2FwdHVyZVNlZ21lbnQoc3RhdGUsIGNhcHR1cmVTdGFydCwgY2FwdHVyZUVuZCwgZmFsc2UpO1xuICAgICAgd3JpdGVGb2xkZWRMaW5lcyhzdGF0ZSwgc3RhdGUubGluZSAtIF9saW5lKTtcbiAgICAgIGNhcHR1cmVTdGFydCA9IGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgICAgIGhhc1BlbmRpbmdDb250ZW50ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFpc19XSElURV9TUEFDRShjaCkpIHtcbiAgICAgIGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbiArIDE7XG4gICAgfVxuXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICB9XG5cbiAgY2FwdHVyZVNlZ21lbnQoc3RhdGUsIGNhcHR1cmVTdGFydCwgY2FwdHVyZUVuZCwgZmFsc2UpO1xuXG4gIGlmIChzdGF0ZS5yZXN1bHQpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHN0YXRlLmtpbmQgPSBfa2luZDtcbiAgc3RhdGUucmVzdWx0ID0gX3Jlc3VsdDtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiByZWFkU2luZ2xlUXVvdGVkU2NhbGFyKHN0YXRlLCBub2RlSW5kZW50KSB7XG4gIHZhciBjaCxcbiAgICAgIGNhcHR1cmVTdGFydCwgY2FwdHVyZUVuZDtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmIChjaCAhPT0gMHgyNy8qICcgKi8pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBzdGF0ZS5raW5kID0gJ3NjYWxhcic7XG4gIHN0YXRlLnJlc3VsdCA9ICcnO1xuICBzdGF0ZS5wb3NpdGlvbisrO1xuICBjYXB0dXJlU3RhcnQgPSBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG5cbiAgd2hpbGUgKChjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pKSAhPT0gMCkge1xuICAgIGlmIChjaCA9PT0gMHgyNy8qICcgKi8pIHtcbiAgICAgIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIHN0YXRlLnBvc2l0aW9uLCB0cnVlKTtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICAgICAgaWYgKGNoID09PSAweDI3LyogJyAqLykge1xuICAgICAgICBjYXB0dXJlU3RhcnQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICAgICAgY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKGlzX0VPTChjaCkpIHtcbiAgICAgIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIGNhcHR1cmVFbmQsIHRydWUpO1xuICAgICAgd3JpdGVGb2xkZWRMaW5lcyhzdGF0ZSwgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgZmFsc2UsIG5vZGVJbmRlbnQpKTtcbiAgICAgIGNhcHR1cmVTdGFydCA9IGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcblxuICAgIH0gZWxzZSBpZiAoc3RhdGUucG9zaXRpb24gPT09IHN0YXRlLmxpbmVTdGFydCAmJiB0ZXN0RG9jdW1lbnRTZXBhcmF0b3Ioc3RhdGUpKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndW5leHBlY3RlZCBlbmQgb2YgdGhlIGRvY3VtZW50IHdpdGhpbiBhIHNpbmdsZSBxdW90ZWQgc2NhbGFyJyk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICAgIGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgICB9XG4gIH1cblxuICB0aHJvd0Vycm9yKHN0YXRlLCAndW5leHBlY3RlZCBlbmQgb2YgdGhlIHN0cmVhbSB3aXRoaW4gYSBzaW5nbGUgcXVvdGVkIHNjYWxhcicpO1xufVxuXG5mdW5jdGlvbiByZWFkRG91YmxlUXVvdGVkU2NhbGFyKHN0YXRlLCBub2RlSW5kZW50KSB7XG4gIHZhciBjYXB0dXJlU3RhcnQsXG4gICAgICBjYXB0dXJlRW5kLFxuICAgICAgaGV4TGVuZ3RoLFxuICAgICAgaGV4UmVzdWx0LFxuICAgICAgdG1wLFxuICAgICAgY2g7XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoY2ggIT09IDB4MjIvKiBcIiAqLykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHN0YXRlLmtpbmQgPSAnc2NhbGFyJztcbiAgc3RhdGUucmVzdWx0ID0gJyc7XG4gIHN0YXRlLnBvc2l0aW9uKys7XG4gIGNhcHR1cmVTdGFydCA9IGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcblxuICB3aGlsZSAoKGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbikpICE9PSAwKSB7XG4gICAgaWYgKGNoID09PSAweDIyLyogXCIgKi8pIHtcbiAgICAgIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIHN0YXRlLnBvc2l0aW9uLCB0cnVlKTtcbiAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgICByZXR1cm4gdHJ1ZTtcblxuICAgIH0gZWxzZSBpZiAoY2ggPT09IDB4NUMvKiBcXCAqLykge1xuICAgICAgY2FwdHVyZVNlZ21lbnQoc3RhdGUsIGNhcHR1cmVTdGFydCwgc3RhdGUucG9zaXRpb24sIHRydWUpO1xuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gICAgICBpZiAoaXNfRU9MKGNoKSkge1xuICAgICAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCBmYWxzZSwgbm9kZUluZGVudCk7XG5cbiAgICAgICAgLy8gVE9ETzogcmV3b3JrIHRvIGlubGluZSBmbiB3aXRoIG5vIHR5cGUgY2FzdD9cbiAgICAgIH0gZWxzZSBpZiAoY2ggPCAyNTYgJiYgc2ltcGxlRXNjYXBlQ2hlY2tbY2hdKSB7XG4gICAgICAgIHN0YXRlLnJlc3VsdCArPSBzaW1wbGVFc2NhcGVNYXBbY2hdO1xuICAgICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuXG4gICAgICB9IGVsc2UgaWYgKCh0bXAgPSBlc2NhcGVkSGV4TGVuKGNoKSkgPiAwKSB7XG4gICAgICAgIGhleExlbmd0aCA9IHRtcDtcbiAgICAgICAgaGV4UmVzdWx0ID0gMDtcblxuICAgICAgICBmb3IgKDsgaGV4TGVuZ3RoID4gMDsgaGV4TGVuZ3RoLS0pIHtcbiAgICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICAgICAgICBpZiAoKHRtcCA9IGZyb21IZXhDb2RlKGNoKSkgPj0gMCkge1xuICAgICAgICAgICAgaGV4UmVzdWx0ID0gKGhleFJlc3VsdCA8PCA0KSArIHRtcDtcblxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnZXhwZWN0ZWQgaGV4YWRlY2ltYWwgY2hhcmFjdGVyJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGUucmVzdWx0ICs9IGNoYXJGcm9tQ29kZXBvaW50KGhleFJlc3VsdCk7XG5cbiAgICAgICAgc3RhdGUucG9zaXRpb24rKztcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3Vua25vd24gZXNjYXBlIHNlcXVlbmNlJyk7XG4gICAgICB9XG5cbiAgICAgIGNhcHR1cmVTdGFydCA9IGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcblxuICAgIH0gZWxzZSBpZiAoaXNfRU9MKGNoKSkge1xuICAgICAgY2FwdHVyZVNlZ21lbnQoc3RhdGUsIGNhcHR1cmVTdGFydCwgY2FwdHVyZUVuZCwgdHJ1ZSk7XG4gICAgICB3cml0ZUZvbGRlZExpbmVzKHN0YXRlLCBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCBmYWxzZSwgbm9kZUluZGVudCkpO1xuICAgICAgY2FwdHVyZVN0YXJ0ID0gY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuXG4gICAgfSBlbHNlIGlmIChzdGF0ZS5wb3NpdGlvbiA9PT0gc3RhdGUubGluZVN0YXJ0ICYmIHRlc3REb2N1bWVudFNlcGFyYXRvcihzdGF0ZSkpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd1bmV4cGVjdGVkIGVuZCBvZiB0aGUgZG9jdW1lbnQgd2l0aGluIGEgZG91YmxlIHF1b3RlZCBzY2FsYXInKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgICAgY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuICAgIH1cbiAgfVxuXG4gIHRocm93RXJyb3Ioc3RhdGUsICd1bmV4cGVjdGVkIGVuZCBvZiB0aGUgc3RyZWFtIHdpdGhpbiBhIGRvdWJsZSBxdW90ZWQgc2NhbGFyJyk7XG59XG5cbmZ1bmN0aW9uIHJlYWRGbG93Q29sbGVjdGlvbihzdGF0ZSwgbm9kZUluZGVudCkge1xuICB2YXIgcmVhZE5leHQgPSB0cnVlLFxuICAgICAgX2xpbmUsXG4gICAgICBfbGluZVN0YXJ0LFxuICAgICAgX3BvcyxcbiAgICAgIF90YWcgICAgID0gc3RhdGUudGFnLFxuICAgICAgX3Jlc3VsdCxcbiAgICAgIF9hbmNob3IgID0gc3RhdGUuYW5jaG9yLFxuICAgICAgZm9sbG93aW5nLFxuICAgICAgdGVybWluYXRvcixcbiAgICAgIGlzUGFpcixcbiAgICAgIGlzRXhwbGljaXRQYWlyLFxuICAgICAgaXNNYXBwaW5nLFxuICAgICAgb3ZlcnJpZGFibGVLZXlzID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIGtleU5vZGUsXG4gICAgICBrZXlUYWcsXG4gICAgICB2YWx1ZU5vZGUsXG4gICAgICBjaDtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmIChjaCA9PT0gMHg1Qi8qIFsgKi8pIHtcbiAgICB0ZXJtaW5hdG9yID0gMHg1RDsvKiBdICovXG4gICAgaXNNYXBwaW5nID0gZmFsc2U7XG4gICAgX3Jlc3VsdCA9IFtdO1xuICB9IGVsc2UgaWYgKGNoID09PSAweDdCLyogeyAqLykge1xuICAgIHRlcm1pbmF0b3IgPSAweDdEOy8qIH0gKi9cbiAgICBpc01hcHBpbmcgPSB0cnVlO1xuICAgIF9yZXN1bHQgPSB7fTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoc3RhdGUuYW5jaG9yICE9PSBudWxsKSB7XG4gICAgc3RhdGUuYW5jaG9yTWFwW3N0YXRlLmFuY2hvcl0gPSBfcmVzdWx0O1xuICB9XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gIHdoaWxlIChjaCAhPT0gMCkge1xuICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIG5vZGVJbmRlbnQpO1xuXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICAgIGlmIChjaCA9PT0gdGVybWluYXRvcikge1xuICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICAgIHN0YXRlLnRhZyA9IF90YWc7XG4gICAgICBzdGF0ZS5hbmNob3IgPSBfYW5jaG9yO1xuICAgICAgc3RhdGUua2luZCA9IGlzTWFwcGluZyA/ICdtYXBwaW5nJyA6ICdzZXF1ZW5jZSc7XG4gICAgICBzdGF0ZS5yZXN1bHQgPSBfcmVzdWx0O1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICghcmVhZE5leHQpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdtaXNzZWQgY29tbWEgYmV0d2VlbiBmbG93IGNvbGxlY3Rpb24gZW50cmllcycpO1xuICAgIH0gZWxzZSBpZiAoY2ggPT09IDB4MkMvKiAsICovKSB7XG4gICAgICAvLyBcImZsb3cgY29sbGVjdGlvbiBlbnRyaWVzIGNhbiBuZXZlciBiZSBjb21wbGV0ZWx5IGVtcHR5XCIsIGFzIHBlciBZQU1MIDEuMiwgc2VjdGlvbiA3LjRcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsIFwiZXhwZWN0ZWQgdGhlIG5vZGUgY29udGVudCwgYnV0IGZvdW5kICcsJ1wiKTtcbiAgICB9XG5cbiAgICBrZXlUYWcgPSBrZXlOb2RlID0gdmFsdWVOb2RlID0gbnVsbDtcbiAgICBpc1BhaXIgPSBpc0V4cGxpY2l0UGFpciA9IGZhbHNlO1xuXG4gICAgaWYgKGNoID09PSAweDNGLyogPyAqLykge1xuICAgICAgZm9sbG93aW5nID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDEpO1xuXG4gICAgICBpZiAoaXNfV1NfT1JfRU9MKGZvbGxvd2luZykpIHtcbiAgICAgICAgaXNQYWlyID0gaXNFeHBsaWNpdFBhaXIgPSB0cnVlO1xuICAgICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgICAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCBub2RlSW5kZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBfbGluZSA9IHN0YXRlLmxpbmU7IC8vIFNhdmUgdGhlIGN1cnJlbnQgbGluZS5cbiAgICBfbGluZVN0YXJ0ID0gc3RhdGUubGluZVN0YXJ0O1xuICAgIF9wb3MgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgICBjb21wb3NlTm9kZShzdGF0ZSwgbm9kZUluZGVudCwgQ09OVEVYVF9GTE9XX0lOLCBmYWxzZSwgdHJ1ZSk7XG4gICAga2V5VGFnID0gc3RhdGUudGFnO1xuICAgIGtleU5vZGUgPSBzdGF0ZS5yZXN1bHQ7XG4gICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgbm9kZUluZGVudCk7XG5cbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gICAgaWYgKChpc0V4cGxpY2l0UGFpciB8fCBzdGF0ZS5saW5lID09PSBfbGluZSkgJiYgY2ggPT09IDB4M0EvKiA6ICovKSB7XG4gICAgICBpc1BhaXIgPSB0cnVlO1xuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgbm9kZUluZGVudCk7XG4gICAgICBjb21wb3NlTm9kZShzdGF0ZSwgbm9kZUluZGVudCwgQ09OVEVYVF9GTE9XX0lOLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICB2YWx1ZU5vZGUgPSBzdGF0ZS5yZXN1bHQ7XG4gICAgfVxuXG4gICAgaWYgKGlzTWFwcGluZykge1xuICAgICAgc3RvcmVNYXBwaW5nUGFpcihzdGF0ZSwgX3Jlc3VsdCwgb3ZlcnJpZGFibGVLZXlzLCBrZXlUYWcsIGtleU5vZGUsIHZhbHVlTm9kZSwgX2xpbmUsIF9saW5lU3RhcnQsIF9wb3MpO1xuICAgIH0gZWxzZSBpZiAoaXNQYWlyKSB7XG4gICAgICBfcmVzdWx0LnB1c2goc3RvcmVNYXBwaW5nUGFpcihzdGF0ZSwgbnVsbCwgb3ZlcnJpZGFibGVLZXlzLCBrZXlUYWcsIGtleU5vZGUsIHZhbHVlTm9kZSwgX2xpbmUsIF9saW5lU3RhcnQsIF9wb3MpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgX3Jlc3VsdC5wdXNoKGtleU5vZGUpO1xuICAgIH1cblxuICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIG5vZGVJbmRlbnQpO1xuXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICAgIGlmIChjaCA9PT0gMHgyQy8qICwgKi8pIHtcbiAgICAgIHJlYWROZXh0ID0gdHJ1ZTtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVhZE5leHQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICB0aHJvd0Vycm9yKHN0YXRlLCAndW5leHBlY3RlZCBlbmQgb2YgdGhlIHN0cmVhbSB3aXRoaW4gYSBmbG93IGNvbGxlY3Rpb24nKTtcbn1cblxuZnVuY3Rpb24gcmVhZEJsb2NrU2NhbGFyKHN0YXRlLCBub2RlSW5kZW50KSB7XG4gIHZhciBjYXB0dXJlU3RhcnQsXG4gICAgICBmb2xkaW5nLFxuICAgICAgY2hvbXBpbmcgICAgICAgPSBDSE9NUElOR19DTElQLFxuICAgICAgZGlkUmVhZENvbnRlbnQgPSBmYWxzZSxcbiAgICAgIGRldGVjdGVkSW5kZW50ID0gZmFsc2UsXG4gICAgICB0ZXh0SW5kZW50ICAgICA9IG5vZGVJbmRlbnQsXG4gICAgICBlbXB0eUxpbmVzICAgICA9IDAsXG4gICAgICBhdE1vcmVJbmRlbnRlZCA9IGZhbHNlLFxuICAgICAgdG1wLFxuICAgICAgY2g7XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoY2ggPT09IDB4N0MvKiB8ICovKSB7XG4gICAgZm9sZGluZyA9IGZhbHNlO1xuICB9IGVsc2UgaWYgKGNoID09PSAweDNFLyogPiAqLykge1xuICAgIGZvbGRpbmcgPSB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHN0YXRlLmtpbmQgPSAnc2NhbGFyJztcbiAgc3RhdGUucmVzdWx0ID0gJyc7XG5cbiAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gICAgaWYgKGNoID09PSAweDJCLyogKyAqLyB8fCBjaCA9PT0gMHgyRC8qIC0gKi8pIHtcbiAgICAgIGlmIChDSE9NUElOR19DTElQID09PSBjaG9tcGluZykge1xuICAgICAgICBjaG9tcGluZyA9IChjaCA9PT0gMHgyQi8qICsgKi8pID8gQ0hPTVBJTkdfS0VFUCA6IENIT01QSU5HX1NUUklQO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3JlcGVhdCBvZiBhIGNob21waW5nIG1vZGUgaWRlbnRpZmllcicpO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIGlmICgodG1wID0gZnJvbURlY2ltYWxDb2RlKGNoKSkgPj0gMCkge1xuICAgICAgaWYgKHRtcCA9PT0gMCkge1xuICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnYmFkIGV4cGxpY2l0IGluZGVudGF0aW9uIHdpZHRoIG9mIGEgYmxvY2sgc2NhbGFyOyBpdCBjYW5ub3QgYmUgbGVzcyB0aGFuIG9uZScpO1xuICAgICAgfSBlbHNlIGlmICghZGV0ZWN0ZWRJbmRlbnQpIHtcbiAgICAgICAgdGV4dEluZGVudCA9IG5vZGVJbmRlbnQgKyB0bXAgLSAxO1xuICAgICAgICBkZXRlY3RlZEluZGVudCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAncmVwZWF0IG9mIGFuIGluZGVudGF0aW9uIHdpZHRoIGlkZW50aWZpZXInKTtcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAoaXNfV0hJVEVfU1BBQ0UoY2gpKSB7XG4gICAgZG8geyBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7IH1cbiAgICB3aGlsZSAoaXNfV0hJVEVfU1BBQ0UoY2gpKTtcblxuICAgIGlmIChjaCA9PT0gMHgyMy8qICMgKi8pIHtcbiAgICAgIGRvIHsgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pOyB9XG4gICAgICB3aGlsZSAoIWlzX0VPTChjaCkgJiYgKGNoICE9PSAwKSk7XG4gICAgfVxuICB9XG5cbiAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgcmVhZExpbmVCcmVhayhzdGF0ZSk7XG4gICAgc3RhdGUubGluZUluZGVudCA9IDA7XG5cbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gICAgd2hpbGUgKCghZGV0ZWN0ZWRJbmRlbnQgfHwgc3RhdGUubGluZUluZGVudCA8IHRleHRJbmRlbnQpICYmXG4gICAgICAgICAgIChjaCA9PT0gMHgyMC8qIFNwYWNlICovKSkge1xuICAgICAgc3RhdGUubGluZUluZGVudCsrO1xuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgIH1cblxuICAgIGlmICghZGV0ZWN0ZWRJbmRlbnQgJiYgc3RhdGUubGluZUluZGVudCA+IHRleHRJbmRlbnQpIHtcbiAgICAgIHRleHRJbmRlbnQgPSBzdGF0ZS5saW5lSW5kZW50O1xuICAgIH1cblxuICAgIGlmIChpc19FT0woY2gpKSB7XG4gICAgICBlbXB0eUxpbmVzKys7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBFbmQgb2YgdGhlIHNjYWxhci5cbiAgICBpZiAoc3RhdGUubGluZUluZGVudCA8IHRleHRJbmRlbnQpIHtcblxuICAgICAgLy8gUGVyZm9ybSB0aGUgY2hvbXBpbmcuXG4gICAgICBpZiAoY2hvbXBpbmcgPT09IENIT01QSU5HX0tFRVApIHtcbiAgICAgICAgc3RhdGUucmVzdWx0ICs9IGNvbW1vbi5yZXBlYXQoJ1xcbicsIGRpZFJlYWRDb250ZW50ID8gMSArIGVtcHR5TGluZXMgOiBlbXB0eUxpbmVzKTtcbiAgICAgIH0gZWxzZSBpZiAoY2hvbXBpbmcgPT09IENIT01QSU5HX0NMSVApIHtcbiAgICAgICAgaWYgKGRpZFJlYWRDb250ZW50KSB7IC8vIGkuZS4gb25seSBpZiB0aGUgc2NhbGFyIGlzIG5vdCBlbXB0eS5cbiAgICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gJ1xcbic7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQnJlYWsgdGhpcyBgd2hpbGVgIGN5Y2xlIGFuZCBnbyB0byB0aGUgZnVuY2l0b24ncyBlcGlsb2d1ZS5cbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIEZvbGRlZCBzdHlsZTogdXNlIGZhbmN5IHJ1bGVzIHRvIGhhbmRsZSBsaW5lIGJyZWFrcy5cbiAgICBpZiAoZm9sZGluZykge1xuXG4gICAgICAvLyBMaW5lcyBzdGFydGluZyB3aXRoIHdoaXRlIHNwYWNlIGNoYXJhY3RlcnMgKG1vcmUtaW5kZW50ZWQgbGluZXMpIGFyZSBub3QgZm9sZGVkLlxuICAgICAgaWYgKGlzX1dISVRFX1NQQUNFKGNoKSkge1xuICAgICAgICBhdE1vcmVJbmRlbnRlZCA9IHRydWU7XG4gICAgICAgIC8vIGV4Y2VwdCBmb3IgdGhlIGZpcnN0IGNvbnRlbnQgbGluZSAoY2YuIEV4YW1wbGUgOC4xKVxuICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gY29tbW9uLnJlcGVhdCgnXFxuJywgZGlkUmVhZENvbnRlbnQgPyAxICsgZW1wdHlMaW5lcyA6IGVtcHR5TGluZXMpO1xuXG4gICAgICAvLyBFbmQgb2YgbW9yZS1pbmRlbnRlZCBibG9jay5cbiAgICAgIH0gZWxzZSBpZiAoYXRNb3JlSW5kZW50ZWQpIHtcbiAgICAgICAgYXRNb3JlSW5kZW50ZWQgPSBmYWxzZTtcbiAgICAgICAgc3RhdGUucmVzdWx0ICs9IGNvbW1vbi5yZXBlYXQoJ1xcbicsIGVtcHR5TGluZXMgKyAxKTtcblxuICAgICAgLy8gSnVzdCBvbmUgbGluZSBicmVhayAtIHBlcmNlaXZlIGFzIHRoZSBzYW1lIGxpbmUuXG4gICAgICB9IGVsc2UgaWYgKGVtcHR5TGluZXMgPT09IDApIHtcbiAgICAgICAgaWYgKGRpZFJlYWRDb250ZW50KSB7IC8vIGkuZS4gb25seSBpZiB3ZSBoYXZlIGFscmVhZHkgcmVhZCBzb21lIHNjYWxhciBjb250ZW50LlxuICAgICAgICAgIHN0YXRlLnJlc3VsdCArPSAnICc7XG4gICAgICAgIH1cblxuICAgICAgLy8gU2V2ZXJhbCBsaW5lIGJyZWFrcyAtIHBlcmNlaXZlIGFzIGRpZmZlcmVudCBsaW5lcy5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLnJlc3VsdCArPSBjb21tb24ucmVwZWF0KCdcXG4nLCBlbXB0eUxpbmVzKTtcbiAgICAgIH1cblxuICAgIC8vIExpdGVyYWwgc3R5bGU6IGp1c3QgYWRkIGV4YWN0IG51bWJlciBvZiBsaW5lIGJyZWFrcyBiZXR3ZWVuIGNvbnRlbnQgbGluZXMuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEtlZXAgYWxsIGxpbmUgYnJlYWtzIGV4Y2VwdCB0aGUgaGVhZGVyIGxpbmUgYnJlYWsuXG4gICAgICBzdGF0ZS5yZXN1bHQgKz0gY29tbW9uLnJlcGVhdCgnXFxuJywgZGlkUmVhZENvbnRlbnQgPyAxICsgZW1wdHlMaW5lcyA6IGVtcHR5TGluZXMpO1xuICAgIH1cblxuICAgIGRpZFJlYWRDb250ZW50ID0gdHJ1ZTtcbiAgICBkZXRlY3RlZEluZGVudCA9IHRydWU7XG4gICAgZW1wdHlMaW5lcyA9IDA7XG4gICAgY2FwdHVyZVN0YXJ0ID0gc3RhdGUucG9zaXRpb247XG5cbiAgICB3aGlsZSAoIWlzX0VPTChjaCkgJiYgKGNoICE9PSAwKSkge1xuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgIH1cblxuICAgIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIHN0YXRlLnBvc2l0aW9uLCBmYWxzZSk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gcmVhZEJsb2NrU2VxdWVuY2Uoc3RhdGUsIG5vZGVJbmRlbnQpIHtcbiAgdmFyIF9saW5lLFxuICAgICAgX3RhZyAgICAgID0gc3RhdGUudGFnLFxuICAgICAgX2FuY2hvciAgID0gc3RhdGUuYW5jaG9yLFxuICAgICAgX3Jlc3VsdCAgID0gW10sXG4gICAgICBmb2xsb3dpbmcsXG4gICAgICBkZXRlY3RlZCAgPSBmYWxzZSxcbiAgICAgIGNoO1xuXG4gIC8vIHRoZXJlIGlzIGEgbGVhZGluZyB0YWIgYmVmb3JlIHRoaXMgdG9rZW4sIHNvIGl0IGNhbid0IGJlIGEgYmxvY2sgc2VxdWVuY2UvbWFwcGluZztcbiAgLy8gaXQgY2FuIHN0aWxsIGJlIGZsb3cgc2VxdWVuY2UvbWFwcGluZyBvciBhIHNjYWxhclxuICBpZiAoc3RhdGUuZmlyc3RUYWJJbkxpbmUgIT09IC0xKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKHN0YXRlLmFuY2hvciAhPT0gbnVsbCkge1xuICAgIHN0YXRlLmFuY2hvck1hcFtzdGF0ZS5hbmNob3JdID0gX3Jlc3VsdDtcbiAgfVxuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgaWYgKHN0YXRlLmZpcnN0VGFiSW5MaW5lICE9PSAtMSkge1xuICAgICAgc3RhdGUucG9zaXRpb24gPSBzdGF0ZS5maXJzdFRhYkluTGluZTtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd0YWIgY2hhcmFjdGVycyBtdXN0IG5vdCBiZSB1c2VkIGluIGluZGVudGF0aW9uJyk7XG4gICAgfVxuXG4gICAgaWYgKGNoICE9PSAweDJELyogLSAqLykge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgZm9sbG93aW5nID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDEpO1xuXG4gICAgaWYgKCFpc19XU19PUl9FT0woZm9sbG93aW5nKSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgZGV0ZWN0ZWQgPSB0cnVlO1xuICAgIHN0YXRlLnBvc2l0aW9uKys7XG5cbiAgICBpZiAoc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpKSB7XG4gICAgICBpZiAoc3RhdGUubGluZUluZGVudCA8PSBub2RlSW5kZW50KSB7XG4gICAgICAgIF9yZXN1bHQucHVzaChudWxsKTtcbiAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgX2xpbmUgPSBzdGF0ZS5saW5lO1xuICAgIGNvbXBvc2VOb2RlKHN0YXRlLCBub2RlSW5kZW50LCBDT05URVhUX0JMT0NLX0lOLCBmYWxzZSwgdHJ1ZSk7XG4gICAgX3Jlc3VsdC5wdXNoKHN0YXRlLnJlc3VsdCk7XG4gICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpO1xuXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICAgIGlmICgoc3RhdGUubGluZSA9PT0gX2xpbmUgfHwgc3RhdGUubGluZUluZGVudCA+IG5vZGVJbmRlbnQpICYmIChjaCAhPT0gMCkpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdiYWQgaW5kZW50YXRpb24gb2YgYSBzZXF1ZW5jZSBlbnRyeScpO1xuICAgIH0gZWxzZSBpZiAoc3RhdGUubGluZUluZGVudCA8IG5vZGVJbmRlbnQpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmIChkZXRlY3RlZCkge1xuICAgIHN0YXRlLnRhZyA9IF90YWc7XG4gICAgc3RhdGUuYW5jaG9yID0gX2FuY2hvcjtcbiAgICBzdGF0ZS5raW5kID0gJ3NlcXVlbmNlJztcbiAgICBzdGF0ZS5yZXN1bHQgPSBfcmVzdWx0O1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmVhZEJsb2NrTWFwcGluZyhzdGF0ZSwgbm9kZUluZGVudCwgZmxvd0luZGVudCkge1xuICB2YXIgZm9sbG93aW5nLFxuICAgICAgYWxsb3dDb21wYWN0LFxuICAgICAgX2xpbmUsXG4gICAgICBfa2V5TGluZSxcbiAgICAgIF9rZXlMaW5lU3RhcnQsXG4gICAgICBfa2V5UG9zLFxuICAgICAgX3RhZyAgICAgICAgICA9IHN0YXRlLnRhZyxcbiAgICAgIF9hbmNob3IgICAgICAgPSBzdGF0ZS5hbmNob3IsXG4gICAgICBfcmVzdWx0ICAgICAgID0ge30sXG4gICAgICBvdmVycmlkYWJsZUtleXMgPSBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgICAga2V5VGFnICAgICAgICA9IG51bGwsXG4gICAgICBrZXlOb2RlICAgICAgID0gbnVsbCxcbiAgICAgIHZhbHVlTm9kZSAgICAgPSBudWxsLFxuICAgICAgYXRFeHBsaWNpdEtleSA9IGZhbHNlLFxuICAgICAgZGV0ZWN0ZWQgICAgICA9IGZhbHNlLFxuICAgICAgY2g7XG5cbiAgLy8gdGhlcmUgaXMgYSBsZWFkaW5nIHRhYiBiZWZvcmUgdGhpcyB0b2tlbiwgc28gaXQgY2FuJ3QgYmUgYSBibG9jayBzZXF1ZW5jZS9tYXBwaW5nO1xuICAvLyBpdCBjYW4gc3RpbGwgYmUgZmxvdyBzZXF1ZW5jZS9tYXBwaW5nIG9yIGEgc2NhbGFyXG4gIGlmIChzdGF0ZS5maXJzdFRhYkluTGluZSAhPT0gLTEpIHJldHVybiBmYWxzZTtcblxuICBpZiAoc3RhdGUuYW5jaG9yICE9PSBudWxsKSB7XG4gICAgc3RhdGUuYW5jaG9yTWFwW3N0YXRlLmFuY2hvcl0gPSBfcmVzdWx0O1xuICB9XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICB3aGlsZSAoY2ggIT09IDApIHtcbiAgICBpZiAoIWF0RXhwbGljaXRLZXkgJiYgc3RhdGUuZmlyc3RUYWJJbkxpbmUgIT09IC0xKSB7XG4gICAgICBzdGF0ZS5wb3NpdGlvbiA9IHN0YXRlLmZpcnN0VGFiSW5MaW5lO1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3RhYiBjaGFyYWN0ZXJzIG11c3Qgbm90IGJlIHVzZWQgaW4gaW5kZW50YXRpb24nKTtcbiAgICB9XG5cbiAgICBmb2xsb3dpbmcgPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uICsgMSk7XG4gICAgX2xpbmUgPSBzdGF0ZS5saW5lOyAvLyBTYXZlIHRoZSBjdXJyZW50IGxpbmUuXG5cbiAgICAvL1xuICAgIC8vIEV4cGxpY2l0IG5vdGF0aW9uIGNhc2UuIFRoZXJlIGFyZSB0d28gc2VwYXJhdGUgYmxvY2tzOlxuICAgIC8vIGZpcnN0IGZvciB0aGUga2V5IChkZW5vdGVkIGJ5IFwiP1wiKSBhbmQgc2Vjb25kIGZvciB0aGUgdmFsdWUgKGRlbm90ZWQgYnkgXCI6XCIpXG4gICAgLy9cbiAgICBpZiAoKGNoID09PSAweDNGLyogPyAqLyB8fCBjaCA9PT0gMHgzQS8qIDogKi8pICYmIGlzX1dTX09SX0VPTChmb2xsb3dpbmcpKSB7XG5cbiAgICAgIGlmIChjaCA9PT0gMHgzRi8qID8gKi8pIHtcbiAgICAgICAgaWYgKGF0RXhwbGljaXRLZXkpIHtcbiAgICAgICAgICBzdG9yZU1hcHBpbmdQYWlyKHN0YXRlLCBfcmVzdWx0LCBvdmVycmlkYWJsZUtleXMsIGtleVRhZywga2V5Tm9kZSwgbnVsbCwgX2tleUxpbmUsIF9rZXlMaW5lU3RhcnQsIF9rZXlQb3MpO1xuICAgICAgICAgIGtleVRhZyA9IGtleU5vZGUgPSB2YWx1ZU5vZGUgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgZGV0ZWN0ZWQgPSB0cnVlO1xuICAgICAgICBhdEV4cGxpY2l0S2V5ID0gdHJ1ZTtcbiAgICAgICAgYWxsb3dDb21wYWN0ID0gdHJ1ZTtcblxuICAgICAgfSBlbHNlIGlmIChhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgIC8vIGkuZS4gMHgzQS8qIDogKi8gPT09IGNoYXJhY3RlciBhZnRlciB0aGUgZXhwbGljaXQga2V5LlxuICAgICAgICBhdEV4cGxpY2l0S2V5ID0gZmFsc2U7XG4gICAgICAgIGFsbG93Q29tcGFjdCA9IHRydWU7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdpbmNvbXBsZXRlIGV4cGxpY2l0IG1hcHBpbmcgcGFpcjsgYSBrZXkgbm9kZSBpcyBtaXNzZWQ7IG9yIGZvbGxvd2VkIGJ5IGEgbm9uLXRhYnVsYXRlZCBlbXB0eSBsaW5lJyk7XG4gICAgICB9XG5cbiAgICAgIHN0YXRlLnBvc2l0aW9uICs9IDE7XG4gICAgICBjaCA9IGZvbGxvd2luZztcblxuICAgIC8vXG4gICAgLy8gSW1wbGljaXQgbm90YXRpb24gY2FzZS4gRmxvdy1zdHlsZSBub2RlIGFzIHRoZSBrZXkgZmlyc3QsIHRoZW4gXCI6XCIsIGFuZCB0aGUgdmFsdWUuXG4gICAgLy9cbiAgICB9IGVsc2Uge1xuICAgICAgX2tleUxpbmUgPSBzdGF0ZS5saW5lO1xuICAgICAgX2tleUxpbmVTdGFydCA9IHN0YXRlLmxpbmVTdGFydDtcbiAgICAgIF9rZXlQb3MgPSBzdGF0ZS5wb3NpdGlvbjtcblxuICAgICAgaWYgKCFjb21wb3NlTm9kZShzdGF0ZSwgZmxvd0luZGVudCwgQ09OVEVYVF9GTE9XX09VVCwgZmFsc2UsIHRydWUpKSB7XG4gICAgICAgIC8vIE5laXRoZXIgaW1wbGljaXQgbm9yIGV4cGxpY2l0IG5vdGF0aW9uLlxuICAgICAgICAvLyBSZWFkaW5nIGlzIGRvbmUuIEdvIHRvIHRoZSBlcGlsb2d1ZS5cbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdGF0ZS5saW5lID09PSBfbGluZSkge1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gICAgICAgIHdoaWxlIChpc19XSElURV9TUEFDRShjaCkpIHtcbiAgICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2ggPT09IDB4M0EvKiA6ICovKSB7XG4gICAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gICAgICAgICAgaWYgKCFpc19XU19PUl9FT0woY2gpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnYSB3aGl0ZXNwYWNlIGNoYXJhY3RlciBpcyBleHBlY3RlZCBhZnRlciB0aGUga2V5LXZhbHVlIHNlcGFyYXRvciB3aXRoaW4gYSBibG9jayBtYXBwaW5nJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGF0RXhwbGljaXRLZXkpIHtcbiAgICAgICAgICAgIHN0b3JlTWFwcGluZ1BhaXIoc3RhdGUsIF9yZXN1bHQsIG92ZXJyaWRhYmxlS2V5cywga2V5VGFnLCBrZXlOb2RlLCBudWxsLCBfa2V5TGluZSwgX2tleUxpbmVTdGFydCwgX2tleVBvcyk7XG4gICAgICAgICAgICBrZXlUYWcgPSBrZXlOb2RlID0gdmFsdWVOb2RlID0gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkZXRlY3RlZCA9IHRydWU7XG4gICAgICAgICAgYXRFeHBsaWNpdEtleSA9IGZhbHNlO1xuICAgICAgICAgIGFsbG93Q29tcGFjdCA9IGZhbHNlO1xuICAgICAgICAgIGtleVRhZyA9IHN0YXRlLnRhZztcbiAgICAgICAgICBrZXlOb2RlID0gc3RhdGUucmVzdWx0O1xuXG4gICAgICAgIH0gZWxzZSBpZiAoZGV0ZWN0ZWQpIHtcbiAgICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnY2FuIG5vdCByZWFkIGFuIGltcGxpY2l0IG1hcHBpbmcgcGFpcjsgYSBjb2xvbiBpcyBtaXNzZWQnKTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0YXRlLnRhZyA9IF90YWc7XG4gICAgICAgICAgc3RhdGUuYW5jaG9yID0gX2FuY2hvcjtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gS2VlcCB0aGUgcmVzdWx0IG9mIGBjb21wb3NlTm9kZWAuXG4gICAgICAgIH1cblxuICAgICAgfSBlbHNlIGlmIChkZXRlY3RlZCkge1xuICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnY2FuIG5vdCByZWFkIGEgYmxvY2sgbWFwcGluZyBlbnRyeTsgYSBtdWx0aWxpbmUga2V5IG1heSBub3QgYmUgYW4gaW1wbGljaXQga2V5Jyk7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLnRhZyA9IF90YWc7XG4gICAgICAgIHN0YXRlLmFuY2hvciA9IF9hbmNob3I7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBLZWVwIHRoZSByZXN1bHQgb2YgYGNvbXBvc2VOb2RlYC5cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvL1xuICAgIC8vIENvbW1vbiByZWFkaW5nIGNvZGUgZm9yIGJvdGggZXhwbGljaXQgYW5kIGltcGxpY2l0IG5vdGF0aW9ucy5cbiAgICAvL1xuICAgIGlmIChzdGF0ZS5saW5lID09PSBfbGluZSB8fCBzdGF0ZS5saW5lSW5kZW50ID4gbm9kZUluZGVudCkge1xuICAgICAgaWYgKGF0RXhwbGljaXRLZXkpIHtcbiAgICAgICAgX2tleUxpbmUgPSBzdGF0ZS5saW5lO1xuICAgICAgICBfa2V5TGluZVN0YXJ0ID0gc3RhdGUubGluZVN0YXJ0O1xuICAgICAgICBfa2V5UG9zID0gc3RhdGUucG9zaXRpb247XG4gICAgICB9XG5cbiAgICAgIGlmIChjb21wb3NlTm9kZShzdGF0ZSwgbm9kZUluZGVudCwgQ09OVEVYVF9CTE9DS19PVVQsIHRydWUsIGFsbG93Q29tcGFjdCkpIHtcbiAgICAgICAgaWYgKGF0RXhwbGljaXRLZXkpIHtcbiAgICAgICAgICBrZXlOb2RlID0gc3RhdGUucmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlTm9kZSA9IHN0YXRlLnJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIWF0RXhwbGljaXRLZXkpIHtcbiAgICAgICAgc3RvcmVNYXBwaW5nUGFpcihzdGF0ZSwgX3Jlc3VsdCwgb3ZlcnJpZGFibGVLZXlzLCBrZXlUYWcsIGtleU5vZGUsIHZhbHVlTm9kZSwgX2tleUxpbmUsIF9rZXlMaW5lU3RhcnQsIF9rZXlQb3MpO1xuICAgICAgICBrZXlUYWcgPSBrZXlOb2RlID0gdmFsdWVOb2RlID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpO1xuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcbiAgICB9XG5cbiAgICBpZiAoKHN0YXRlLmxpbmUgPT09IF9saW5lIHx8IHN0YXRlLmxpbmVJbmRlbnQgPiBub2RlSW5kZW50KSAmJiAoY2ggIT09IDApKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnYmFkIGluZGVudGF0aW9uIG9mIGEgbWFwcGluZyBlbnRyeScpO1xuICAgIH0gZWxzZSBpZiAoc3RhdGUubGluZUluZGVudCA8IG5vZGVJbmRlbnQpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIC8vXG4gIC8vIEVwaWxvZ3VlLlxuICAvL1xuXG4gIC8vIFNwZWNpYWwgY2FzZTogbGFzdCBtYXBwaW5nJ3Mgbm9kZSBjb250YWlucyBvbmx5IHRoZSBrZXkgaW4gZXhwbGljaXQgbm90YXRpb24uXG4gIGlmIChhdEV4cGxpY2l0S2V5KSB7XG4gICAgc3RvcmVNYXBwaW5nUGFpcihzdGF0ZSwgX3Jlc3VsdCwgb3ZlcnJpZGFibGVLZXlzLCBrZXlUYWcsIGtleU5vZGUsIG51bGwsIF9rZXlMaW5lLCBfa2V5TGluZVN0YXJ0LCBfa2V5UG9zKTtcbiAgfVxuXG4gIC8vIEV4cG9zZSB0aGUgcmVzdWx0aW5nIG1hcHBpbmcuXG4gIGlmIChkZXRlY3RlZCkge1xuICAgIHN0YXRlLnRhZyA9IF90YWc7XG4gICAgc3RhdGUuYW5jaG9yID0gX2FuY2hvcjtcbiAgICBzdGF0ZS5raW5kID0gJ21hcHBpbmcnO1xuICAgIHN0YXRlLnJlc3VsdCA9IF9yZXN1bHQ7XG4gIH1cblxuICByZXR1cm4gZGV0ZWN0ZWQ7XG59XG5cbmZ1bmN0aW9uIHJlYWRUYWdQcm9wZXJ0eShzdGF0ZSkge1xuICB2YXIgX3Bvc2l0aW9uLFxuICAgICAgaXNWZXJiYXRpbSA9IGZhbHNlLFxuICAgICAgaXNOYW1lZCAgICA9IGZhbHNlLFxuICAgICAgdGFnSGFuZGxlLFxuICAgICAgdGFnTmFtZSxcbiAgICAgIGNoO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoICE9PSAweDIxLyogISAqLykgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChzdGF0ZS50YWcgIT09IG51bGwpIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAnZHVwbGljYXRpb24gb2YgYSB0YWcgcHJvcGVydHknKTtcbiAgfVxuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoY2ggPT09IDB4M0MvKiA8ICovKSB7XG4gICAgaXNWZXJiYXRpbSA9IHRydWU7XG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gIH0gZWxzZSBpZiAoY2ggPT09IDB4MjEvKiAhICovKSB7XG4gICAgaXNOYW1lZCA9IHRydWU7XG4gICAgdGFnSGFuZGxlID0gJyEhJztcbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG5cbiAgfSBlbHNlIHtcbiAgICB0YWdIYW5kbGUgPSAnISc7XG4gIH1cblxuICBfcG9zaXRpb24gPSBzdGF0ZS5wb3NpdGlvbjtcblxuICBpZiAoaXNWZXJiYXRpbSkge1xuICAgIGRvIHsgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pOyB9XG4gICAgd2hpbGUgKGNoICE9PSAwICYmIGNoICE9PSAweDNFLyogPiAqLyk7XG5cbiAgICBpZiAoc3RhdGUucG9zaXRpb24gPCBzdGF0ZS5sZW5ndGgpIHtcbiAgICAgIHRhZ05hbWUgPSBzdGF0ZS5pbnB1dC5zbGljZShfcG9zaXRpb24sIHN0YXRlLnBvc2l0aW9uKTtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuZXhwZWN0ZWQgZW5kIG9mIHRoZSBzdHJlYW0gd2l0aGluIGEgdmVyYmF0aW0gdGFnJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHdoaWxlIChjaCAhPT0gMCAmJiAhaXNfV1NfT1JfRU9MKGNoKSkge1xuXG4gICAgICBpZiAoY2ggPT09IDB4MjEvKiAhICovKSB7XG4gICAgICAgIGlmICghaXNOYW1lZCkge1xuICAgICAgICAgIHRhZ0hhbmRsZSA9IHN0YXRlLmlucHV0LnNsaWNlKF9wb3NpdGlvbiAtIDEsIHN0YXRlLnBvc2l0aW9uICsgMSk7XG5cbiAgICAgICAgICBpZiAoIVBBVFRFUk5fVEFHX0hBTkRMRS50ZXN0KHRhZ0hhbmRsZSkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICduYW1lZCB0YWcgaGFuZGxlIGNhbm5vdCBjb250YWluIHN1Y2ggY2hhcmFjdGVycycpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlzTmFtZWQgPSB0cnVlO1xuICAgICAgICAgIF9wb3NpdGlvbiA9IHN0YXRlLnBvc2l0aW9uICsgMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndGFnIHN1ZmZpeCBjYW5ub3QgY29udGFpbiBleGNsYW1hdGlvbiBtYXJrcycpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9XG5cbiAgICB0YWdOYW1lID0gc3RhdGUuaW5wdXQuc2xpY2UoX3Bvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoUEFUVEVSTl9GTE9XX0lORElDQVRPUlMudGVzdCh0YWdOYW1lKSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3RhZyBzdWZmaXggY2Fubm90IGNvbnRhaW4gZmxvdyBpbmRpY2F0b3IgY2hhcmFjdGVycycpO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0YWdOYW1lICYmICFQQVRURVJOX1RBR19VUkkudGVzdCh0YWdOYW1lKSkge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICd0YWcgbmFtZSBjYW5ub3QgY29udGFpbiBzdWNoIGNoYXJhY3RlcnM6ICcgKyB0YWdOYW1lKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgdGFnTmFtZSA9IGRlY29kZVVSSUNvbXBvbmVudCh0YWdOYW1lKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3RhZyBuYW1lIGlzIG1hbGZvcm1lZDogJyArIHRhZ05hbWUpO1xuICB9XG5cbiAgaWYgKGlzVmVyYmF0aW0pIHtcbiAgICBzdGF0ZS50YWcgPSB0YWdOYW1lO1xuXG4gIH0gZWxzZSBpZiAoX2hhc093blByb3BlcnR5JDEuY2FsbChzdGF0ZS50YWdNYXAsIHRhZ0hhbmRsZSkpIHtcbiAgICBzdGF0ZS50YWcgPSBzdGF0ZS50YWdNYXBbdGFnSGFuZGxlXSArIHRhZ05hbWU7XG5cbiAgfSBlbHNlIGlmICh0YWdIYW5kbGUgPT09ICchJykge1xuICAgIHN0YXRlLnRhZyA9ICchJyArIHRhZ05hbWU7XG5cbiAgfSBlbHNlIGlmICh0YWdIYW5kbGUgPT09ICchIScpIHtcbiAgICBzdGF0ZS50YWcgPSAndGFnOnlhbWwub3JnLDIwMDI6JyArIHRhZ05hbWU7XG5cbiAgfSBlbHNlIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAndW5kZWNsYXJlZCB0YWcgaGFuZGxlIFwiJyArIHRhZ0hhbmRsZSArICdcIicpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlYWRBbmNob3JQcm9wZXJ0eShzdGF0ZSkge1xuICB2YXIgX3Bvc2l0aW9uLFxuICAgICAgY2g7XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoY2ggIT09IDB4MjYvKiAmICovKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKHN0YXRlLmFuY2hvciAhPT0gbnVsbCkge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICdkdXBsaWNhdGlvbiBvZiBhbiBhbmNob3IgcHJvcGVydHknKTtcbiAgfVxuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgd2hpbGUgKGNoICE9PSAwICYmICFpc19XU19PUl9FT0woY2gpICYmICFpc19GTE9XX0lORElDQVRPUihjaCkpIHtcbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gIH1cblxuICBpZiAoc3RhdGUucG9zaXRpb24gPT09IF9wb3NpdGlvbikge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICduYW1lIG9mIGFuIGFuY2hvciBub2RlIG11c3QgY29udGFpbiBhdCBsZWFzdCBvbmUgY2hhcmFjdGVyJyk7XG4gIH1cblxuICBzdGF0ZS5hbmNob3IgPSBzdGF0ZS5pbnB1dC5zbGljZShfcG9zaXRpb24sIHN0YXRlLnBvc2l0aW9uKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlYWRBbGlhcyhzdGF0ZSkge1xuICB2YXIgX3Bvc2l0aW9uLCBhbGlhcyxcbiAgICAgIGNoO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoICE9PSAweDJBLyogKiAqLykgcmV0dXJuIGZhbHNlO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgd2hpbGUgKGNoICE9PSAwICYmICFpc19XU19PUl9FT0woY2gpICYmICFpc19GTE9XX0lORElDQVRPUihjaCkpIHtcbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gIH1cblxuICBpZiAoc3RhdGUucG9zaXRpb24gPT09IF9wb3NpdGlvbikge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICduYW1lIG9mIGFuIGFsaWFzIG5vZGUgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSBjaGFyYWN0ZXInKTtcbiAgfVxuXG4gIGFsaWFzID0gc3RhdGUuaW5wdXQuc2xpY2UoX3Bvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKCFfaGFzT3duUHJvcGVydHkkMS5jYWxsKHN0YXRlLmFuY2hvck1hcCwgYWxpYXMpKSB7XG4gICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuaWRlbnRpZmllZCBhbGlhcyBcIicgKyBhbGlhcyArICdcIicpO1xuICB9XG5cbiAgc3RhdGUucmVzdWx0ID0gc3RhdGUuYW5jaG9yTWFwW2FsaWFzXTtcbiAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29tcG9zZU5vZGUoc3RhdGUsIHBhcmVudEluZGVudCwgbm9kZUNvbnRleHQsIGFsbG93VG9TZWVrLCBhbGxvd0NvbXBhY3QpIHtcbiAgdmFyIGFsbG93QmxvY2tTdHlsZXMsXG4gICAgICBhbGxvd0Jsb2NrU2NhbGFycyxcbiAgICAgIGFsbG93QmxvY2tDb2xsZWN0aW9ucyxcbiAgICAgIGluZGVudFN0YXR1cyA9IDEsIC8vIDE6IHRoaXM+cGFyZW50LCAwOiB0aGlzPXBhcmVudCwgLTE6IHRoaXM8cGFyZW50XG4gICAgICBhdE5ld0xpbmUgID0gZmFsc2UsXG4gICAgICBoYXNDb250ZW50ID0gZmFsc2UsXG4gICAgICB0eXBlSW5kZXgsXG4gICAgICB0eXBlUXVhbnRpdHksXG4gICAgICB0eXBlTGlzdCxcbiAgICAgIHR5cGUsXG4gICAgICBmbG93SW5kZW50LFxuICAgICAgYmxvY2tJbmRlbnQ7XG5cbiAgaWYgKHN0YXRlLmxpc3RlbmVyICE9PSBudWxsKSB7XG4gICAgc3RhdGUubGlzdGVuZXIoJ29wZW4nLCBzdGF0ZSk7XG4gIH1cblxuICBzdGF0ZS50YWcgICAgPSBudWxsO1xuICBzdGF0ZS5hbmNob3IgPSBudWxsO1xuICBzdGF0ZS5raW5kICAgPSBudWxsO1xuICBzdGF0ZS5yZXN1bHQgPSBudWxsO1xuXG4gIGFsbG93QmxvY2tTdHlsZXMgPSBhbGxvd0Jsb2NrU2NhbGFycyA9IGFsbG93QmxvY2tDb2xsZWN0aW9ucyA9XG4gICAgQ09OVEVYVF9CTE9DS19PVVQgPT09IG5vZGVDb250ZXh0IHx8XG4gICAgQ09OVEVYVF9CTE9DS19JTiAgPT09IG5vZGVDb250ZXh0O1xuXG4gIGlmIChhbGxvd1RvU2Vlaykge1xuICAgIGlmIChza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCAtMSkpIHtcbiAgICAgIGF0TmV3TGluZSA9IHRydWU7XG5cbiAgICAgIGlmIChzdGF0ZS5saW5lSW5kZW50ID4gcGFyZW50SW5kZW50KSB7XG4gICAgICAgIGluZGVudFN0YXR1cyA9IDE7XG4gICAgICB9IGVsc2UgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPT09IHBhcmVudEluZGVudCkge1xuICAgICAgICBpbmRlbnRTdGF0dXMgPSAwO1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZS5saW5lSW5kZW50IDwgcGFyZW50SW5kZW50KSB7XG4gICAgICAgIGluZGVudFN0YXR1cyA9IC0xO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChpbmRlbnRTdGF0dXMgPT09IDEpIHtcbiAgICB3aGlsZSAocmVhZFRhZ1Byb3BlcnR5KHN0YXRlKSB8fCByZWFkQW5jaG9yUHJvcGVydHkoc3RhdGUpKSB7XG4gICAgICBpZiAoc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpKSB7XG4gICAgICAgIGF0TmV3TGluZSA9IHRydWU7XG4gICAgICAgIGFsbG93QmxvY2tDb2xsZWN0aW9ucyA9IGFsbG93QmxvY2tTdHlsZXM7XG5cbiAgICAgICAgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPiBwYXJlbnRJbmRlbnQpIHtcbiAgICAgICAgICBpbmRlbnRTdGF0dXMgPSAxO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPT09IHBhcmVudEluZGVudCkge1xuICAgICAgICAgIGluZGVudFN0YXR1cyA9IDA7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUubGluZUluZGVudCA8IHBhcmVudEluZGVudCkge1xuICAgICAgICAgIGluZGVudFN0YXR1cyA9IC0xO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhbGxvd0Jsb2NrQ29sbGVjdGlvbnMgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoYWxsb3dCbG9ja0NvbGxlY3Rpb25zKSB7XG4gICAgYWxsb3dCbG9ja0NvbGxlY3Rpb25zID0gYXROZXdMaW5lIHx8IGFsbG93Q29tcGFjdDtcbiAgfVxuXG4gIGlmIChpbmRlbnRTdGF0dXMgPT09IDEgfHwgQ09OVEVYVF9CTE9DS19PVVQgPT09IG5vZGVDb250ZXh0KSB7XG4gICAgaWYgKENPTlRFWFRfRkxPV19JTiA9PT0gbm9kZUNvbnRleHQgfHwgQ09OVEVYVF9GTE9XX09VVCA9PT0gbm9kZUNvbnRleHQpIHtcbiAgICAgIGZsb3dJbmRlbnQgPSBwYXJlbnRJbmRlbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZsb3dJbmRlbnQgPSBwYXJlbnRJbmRlbnQgKyAxO1xuICAgIH1cblxuICAgIGJsb2NrSW5kZW50ID0gc3RhdGUucG9zaXRpb24gLSBzdGF0ZS5saW5lU3RhcnQ7XG5cbiAgICBpZiAoaW5kZW50U3RhdHVzID09PSAxKSB7XG4gICAgICBpZiAoYWxsb3dCbG9ja0NvbGxlY3Rpb25zICYmXG4gICAgICAgICAgKHJlYWRCbG9ja1NlcXVlbmNlKHN0YXRlLCBibG9ja0luZGVudCkgfHxcbiAgICAgICAgICAgcmVhZEJsb2NrTWFwcGluZyhzdGF0ZSwgYmxvY2tJbmRlbnQsIGZsb3dJbmRlbnQpKSB8fFxuICAgICAgICAgIHJlYWRGbG93Q29sbGVjdGlvbihzdGF0ZSwgZmxvd0luZGVudCkpIHtcbiAgICAgICAgaGFzQ29udGVudCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoKGFsbG93QmxvY2tTY2FsYXJzICYmIHJlYWRCbG9ja1NjYWxhcihzdGF0ZSwgZmxvd0luZGVudCkpIHx8XG4gICAgICAgICAgICByZWFkU2luZ2xlUXVvdGVkU2NhbGFyKHN0YXRlLCBmbG93SW5kZW50KSB8fFxuICAgICAgICAgICAgcmVhZERvdWJsZVF1b3RlZFNjYWxhcihzdGF0ZSwgZmxvd0luZGVudCkpIHtcbiAgICAgICAgICBoYXNDb250ZW50ID0gdHJ1ZTtcblxuICAgICAgICB9IGVsc2UgaWYgKHJlYWRBbGlhcyhzdGF0ZSkpIHtcbiAgICAgICAgICBoYXNDb250ZW50ID0gdHJ1ZTtcblxuICAgICAgICAgIGlmIChzdGF0ZS50YWcgIT09IG51bGwgfHwgc3RhdGUuYW5jaG9yICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnYWxpYXMgbm9kZSBzaG91bGQgbm90IGhhdmUgYW55IHByb3BlcnRpZXMnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmIChyZWFkUGxhaW5TY2FsYXIoc3RhdGUsIGZsb3dJbmRlbnQsIENPTlRFWFRfRkxPV19JTiA9PT0gbm9kZUNvbnRleHQpKSB7XG4gICAgICAgICAgaGFzQ29udGVudCA9IHRydWU7XG5cbiAgICAgICAgICBpZiAoc3RhdGUudGFnID09PSBudWxsKSB7XG4gICAgICAgICAgICBzdGF0ZS50YWcgPSAnPyc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0YXRlLmFuY2hvciAhPT0gbnVsbCkge1xuICAgICAgICAgIHN0YXRlLmFuY2hvck1hcFtzdGF0ZS5hbmNob3JdID0gc3RhdGUucmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpbmRlbnRTdGF0dXMgPT09IDApIHtcbiAgICAgIC8vIFNwZWNpYWwgY2FzZTogYmxvY2sgc2VxdWVuY2VzIGFyZSBhbGxvd2VkIHRvIGhhdmUgc2FtZSBpbmRlbnRhdGlvbiBsZXZlbCBhcyB0aGUgcGFyZW50LlxuICAgICAgLy8gaHR0cDovL3d3dy55YW1sLm9yZy9zcGVjLzEuMi9zcGVjLmh0bWwjaWQyNzk5Nzg0XG4gICAgICBoYXNDb250ZW50ID0gYWxsb3dCbG9ja0NvbGxlY3Rpb25zICYmIHJlYWRCbG9ja1NlcXVlbmNlKHN0YXRlLCBibG9ja0luZGVudCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN0YXRlLnRhZyA9PT0gbnVsbCkge1xuICAgIGlmIChzdGF0ZS5hbmNob3IgIT09IG51bGwpIHtcbiAgICAgIHN0YXRlLmFuY2hvck1hcFtzdGF0ZS5hbmNob3JdID0gc3RhdGUucmVzdWx0O1xuICAgIH1cblxuICB9IGVsc2UgaWYgKHN0YXRlLnRhZyA9PT0gJz8nKSB7XG4gICAgLy8gSW1wbGljaXQgcmVzb2x2aW5nIGlzIG5vdCBhbGxvd2VkIGZvciBub24tc2NhbGFyIHR5cGVzLCBhbmQgJz8nXG4gICAgLy8gbm9uLXNwZWNpZmljIHRhZyBpcyBvbmx5IGF1dG9tYXRpY2FsbHkgYXNzaWduZWQgdG8gcGxhaW4gc2NhbGFycy5cbiAgICAvL1xuICAgIC8vIFdlIG9ubHkgbmVlZCB0byBjaGVjayBraW5kIGNvbmZvcm1pdHkgaW4gY2FzZSB1c2VyIGV4cGxpY2l0bHkgYXNzaWducyAnPydcbiAgICAvLyB0YWcsIGZvciBleGFtcGxlIGxpa2UgdGhpczogXCIhPD8+IFswXVwiXG4gICAgLy9cbiAgICBpZiAoc3RhdGUucmVzdWx0ICE9PSBudWxsICYmIHN0YXRlLmtpbmQgIT09ICdzY2FsYXInKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndW5hY2NlcHRhYmxlIG5vZGUga2luZCBmb3IgITw/PiB0YWc7IGl0IHNob3VsZCBiZSBcInNjYWxhclwiLCBub3QgXCInICsgc3RhdGUua2luZCArICdcIicpO1xuICAgIH1cblxuICAgIGZvciAodHlwZUluZGV4ID0gMCwgdHlwZVF1YW50aXR5ID0gc3RhdGUuaW1wbGljaXRUeXBlcy5sZW5ndGg7IHR5cGVJbmRleCA8IHR5cGVRdWFudGl0eTsgdHlwZUluZGV4ICs9IDEpIHtcbiAgICAgIHR5cGUgPSBzdGF0ZS5pbXBsaWNpdFR5cGVzW3R5cGVJbmRleF07XG5cbiAgICAgIGlmICh0eXBlLnJlc29sdmUoc3RhdGUucmVzdWx0KSkgeyAvLyBgc3RhdGUucmVzdWx0YCB1cGRhdGVkIGluIHJlc29sdmVyIGlmIG1hdGNoZWRcbiAgICAgICAgc3RhdGUucmVzdWx0ID0gdHlwZS5jb25zdHJ1Y3Qoc3RhdGUucmVzdWx0KTtcbiAgICAgICAgc3RhdGUudGFnID0gdHlwZS50YWc7XG4gICAgICAgIGlmIChzdGF0ZS5hbmNob3IgIT09IG51bGwpIHtcbiAgICAgICAgICBzdGF0ZS5hbmNob3JNYXBbc3RhdGUuYW5jaG9yXSA9IHN0YXRlLnJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAoc3RhdGUudGFnICE9PSAnIScpIHtcbiAgICBpZiAoX2hhc093blByb3BlcnR5JDEuY2FsbChzdGF0ZS50eXBlTWFwW3N0YXRlLmtpbmQgfHwgJ2ZhbGxiYWNrJ10sIHN0YXRlLnRhZykpIHtcbiAgICAgIHR5cGUgPSBzdGF0ZS50eXBlTWFwW3N0YXRlLmtpbmQgfHwgJ2ZhbGxiYWNrJ11bc3RhdGUudGFnXTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbG9va2luZyBmb3IgbXVsdGkgdHlwZVxuICAgICAgdHlwZSA9IG51bGw7XG4gICAgICB0eXBlTGlzdCA9IHN0YXRlLnR5cGVNYXAubXVsdGlbc3RhdGUua2luZCB8fCAnZmFsbGJhY2snXTtcblxuICAgICAgZm9yICh0eXBlSW5kZXggPSAwLCB0eXBlUXVhbnRpdHkgPSB0eXBlTGlzdC5sZW5ndGg7IHR5cGVJbmRleCA8IHR5cGVRdWFudGl0eTsgdHlwZUluZGV4ICs9IDEpIHtcbiAgICAgICAgaWYgKHN0YXRlLnRhZy5zbGljZSgwLCB0eXBlTGlzdFt0eXBlSW5kZXhdLnRhZy5sZW5ndGgpID09PSB0eXBlTGlzdFt0eXBlSW5kZXhdLnRhZykge1xuICAgICAgICAgIHR5cGUgPSB0eXBlTGlzdFt0eXBlSW5kZXhdO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCF0eXBlKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndW5rbm93biB0YWcgITwnICsgc3RhdGUudGFnICsgJz4nKTtcbiAgICB9XG5cbiAgICBpZiAoc3RhdGUucmVzdWx0ICE9PSBudWxsICYmIHR5cGUua2luZCAhPT0gc3RhdGUua2luZCkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuYWNjZXB0YWJsZSBub2RlIGtpbmQgZm9yICE8JyArIHN0YXRlLnRhZyArICc+IHRhZzsgaXQgc2hvdWxkIGJlIFwiJyArIHR5cGUua2luZCArICdcIiwgbm90IFwiJyArIHN0YXRlLmtpbmQgKyAnXCInKTtcbiAgICB9XG5cbiAgICBpZiAoIXR5cGUucmVzb2x2ZShzdGF0ZS5yZXN1bHQsIHN0YXRlLnRhZykpIHsgLy8gYHN0YXRlLnJlc3VsdGAgdXBkYXRlZCBpbiByZXNvbHZlciBpZiBtYXRjaGVkXG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnY2Fubm90IHJlc29sdmUgYSBub2RlIHdpdGggITwnICsgc3RhdGUudGFnICsgJz4gZXhwbGljaXQgdGFnJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRlLnJlc3VsdCA9IHR5cGUuY29uc3RydWN0KHN0YXRlLnJlc3VsdCwgc3RhdGUudGFnKTtcbiAgICAgIGlmIChzdGF0ZS5hbmNob3IgIT09IG51bGwpIHtcbiAgICAgICAgc3RhdGUuYW5jaG9yTWFwW3N0YXRlLmFuY2hvcl0gPSBzdGF0ZS5yZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKHN0YXRlLmxpc3RlbmVyICE9PSBudWxsKSB7XG4gICAgc3RhdGUubGlzdGVuZXIoJ2Nsb3NlJywgc3RhdGUpO1xuICB9XG4gIHJldHVybiBzdGF0ZS50YWcgIT09IG51bGwgfHwgIHN0YXRlLmFuY2hvciAhPT0gbnVsbCB8fCBoYXNDb250ZW50O1xufVxuXG5mdW5jdGlvbiByZWFkRG9jdW1lbnQoc3RhdGUpIHtcbiAgdmFyIGRvY3VtZW50U3RhcnQgPSBzdGF0ZS5wb3NpdGlvbixcbiAgICAgIF9wb3NpdGlvbixcbiAgICAgIGRpcmVjdGl2ZU5hbWUsXG4gICAgICBkaXJlY3RpdmVBcmdzLFxuICAgICAgaGFzRGlyZWN0aXZlcyA9IGZhbHNlLFxuICAgICAgY2g7XG5cbiAgc3RhdGUudmVyc2lvbiA9IG51bGw7XG4gIHN0YXRlLmNoZWNrTGluZUJyZWFrcyA9IHN0YXRlLmxlZ2FjeTtcbiAgc3RhdGUudGFnTWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgc3RhdGUuYW5jaG9yTWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICB3aGlsZSAoKGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbikpICE9PSAwKSB7XG4gICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpO1xuXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICAgIGlmIChzdGF0ZS5saW5lSW5kZW50ID4gMCB8fCBjaCAhPT0gMHgyNS8qICUgKi8pIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGhhc0RpcmVjdGl2ZXMgPSB0cnVlO1xuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICBfcG9zaXRpb24gPSBzdGF0ZS5wb3NpdGlvbjtcblxuICAgIHdoaWxlIChjaCAhPT0gMCAmJiAhaXNfV1NfT1JfRU9MKGNoKSkge1xuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgIH1cblxuICAgIGRpcmVjdGl2ZU5hbWUgPSBzdGF0ZS5pbnB1dC5zbGljZShfcG9zaXRpb24sIHN0YXRlLnBvc2l0aW9uKTtcbiAgICBkaXJlY3RpdmVBcmdzID0gW107XG5cbiAgICBpZiAoZGlyZWN0aXZlTmFtZS5sZW5ndGggPCAxKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnZGlyZWN0aXZlIG5hbWUgbXVzdCBub3QgYmUgbGVzcyB0aGFuIG9uZSBjaGFyYWN0ZXIgaW4gbGVuZ3RoJyk7XG4gICAgfVxuXG4gICAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgICB3aGlsZSAoaXNfV0hJVEVfU1BBQ0UoY2gpKSB7XG4gICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNoID09PSAweDIzLyogIyAqLykge1xuICAgICAgICBkbyB7IGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTsgfVxuICAgICAgICB3aGlsZSAoY2ggIT09IDAgJiYgIWlzX0VPTChjaCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgaWYgKGlzX0VPTChjaCkpIGJyZWFrO1xuXG4gICAgICBfcG9zaXRpb24gPSBzdGF0ZS5wb3NpdGlvbjtcblxuICAgICAgd2hpbGUgKGNoICE9PSAwICYmICFpc19XU19PUl9FT0woY2gpKSB7XG4gICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICAgIH1cblxuICAgICAgZGlyZWN0aXZlQXJncy5wdXNoKHN0YXRlLmlucHV0LnNsaWNlKF9wb3NpdGlvbiwgc3RhdGUucG9zaXRpb24pKTtcbiAgICB9XG5cbiAgICBpZiAoY2ggIT09IDApIHJlYWRMaW5lQnJlYWsoc3RhdGUpO1xuXG4gICAgaWYgKF9oYXNPd25Qcm9wZXJ0eSQxLmNhbGwoZGlyZWN0aXZlSGFuZGxlcnMsIGRpcmVjdGl2ZU5hbWUpKSB7XG4gICAgICBkaXJlY3RpdmVIYW5kbGVyc1tkaXJlY3RpdmVOYW1lXShzdGF0ZSwgZGlyZWN0aXZlTmFtZSwgZGlyZWN0aXZlQXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93V2FybmluZyhzdGF0ZSwgJ3Vua25vd24gZG9jdW1lbnQgZGlyZWN0aXZlIFwiJyArIGRpcmVjdGl2ZU5hbWUgKyAnXCInKTtcbiAgICB9XG4gIH1cblxuICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCAtMSk7XG5cbiAgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPT09IDAgJiZcbiAgICAgIHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pICAgICA9PT0gMHgyRC8qIC0gKi8gJiZcbiAgICAgIHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24gKyAxKSA9PT0gMHgyRC8qIC0gKi8gJiZcbiAgICAgIHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24gKyAyKSA9PT0gMHgyRC8qIC0gKi8pIHtcbiAgICBzdGF0ZS5wb3NpdGlvbiArPSAzO1xuICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcblxuICB9IGVsc2UgaWYgKGhhc0RpcmVjdGl2ZXMpIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAnZGlyZWN0aXZlcyBlbmQgbWFyayBpcyBleHBlY3RlZCcpO1xuICB9XG5cbiAgY29tcG9zZU5vZGUoc3RhdGUsIHN0YXRlLmxpbmVJbmRlbnQgLSAxLCBDT05URVhUX0JMT0NLX09VVCwgZmFsc2UsIHRydWUpO1xuICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCAtMSk7XG5cbiAgaWYgKHN0YXRlLmNoZWNrTGluZUJyZWFrcyAmJlxuICAgICAgUEFUVEVSTl9OT05fQVNDSUlfTElORV9CUkVBS1MudGVzdChzdGF0ZS5pbnB1dC5zbGljZShkb2N1bWVudFN0YXJ0LCBzdGF0ZS5wb3NpdGlvbikpKSB7XG4gICAgdGhyb3dXYXJuaW5nKHN0YXRlLCAnbm9uLUFTQ0lJIGxpbmUgYnJlYWtzIGFyZSBpbnRlcnByZXRlZCBhcyBjb250ZW50Jyk7XG4gIH1cblxuICBzdGF0ZS5kb2N1bWVudHMucHVzaChzdGF0ZS5yZXN1bHQpO1xuXG4gIGlmIChzdGF0ZS5wb3NpdGlvbiA9PT0gc3RhdGUubGluZVN0YXJ0ICYmIHRlc3REb2N1bWVudFNlcGFyYXRvcihzdGF0ZSkpIHtcblxuICAgIGlmIChzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKSA9PT0gMHgyRS8qIC4gKi8pIHtcbiAgICAgIHN0YXRlLnBvc2l0aW9uICs9IDM7XG4gICAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCAtMSk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChzdGF0ZS5wb3NpdGlvbiA8IChzdGF0ZS5sZW5ndGggLSAxKSkge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICdlbmQgb2YgdGhlIHN0cmVhbSBvciBhIGRvY3VtZW50IHNlcGFyYXRvciBpcyBleHBlY3RlZCcpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGxvYWREb2N1bWVudHMoaW5wdXQsIG9wdGlvbnMpIHtcbiAgaW5wdXQgPSBTdHJpbmcoaW5wdXQpO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICBpZiAoaW5wdXQubGVuZ3RoICE9PSAwKSB7XG5cbiAgICAvLyBBZGQgdGFpbGluZyBgXFxuYCBpZiBub3QgZXhpc3RzXG4gICAgaWYgKGlucHV0LmNoYXJDb2RlQXQoaW5wdXQubGVuZ3RoIC0gMSkgIT09IDB4MEEvKiBMRiAqLyAmJlxuICAgICAgICBpbnB1dC5jaGFyQ29kZUF0KGlucHV0Lmxlbmd0aCAtIDEpICE9PSAweDBELyogQ1IgKi8pIHtcbiAgICAgIGlucHV0ICs9ICdcXG4nO1xuICAgIH1cblxuICAgIC8vIFN0cmlwIEJPTVxuICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KDApID09PSAweEZFRkYpIHtcbiAgICAgIGlucHV0ID0gaW5wdXQuc2xpY2UoMSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIHN0YXRlID0gbmV3IFN0YXRlJDEoaW5wdXQsIG9wdGlvbnMpO1xuXG4gIHZhciBudWxscG9zID0gaW5wdXQuaW5kZXhPZignXFwwJyk7XG5cbiAgaWYgKG51bGxwb3MgIT09IC0xKSB7XG4gICAgc3RhdGUucG9zaXRpb24gPSBudWxscG9zO1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICdudWxsIGJ5dGUgaXMgbm90IGFsbG93ZWQgaW4gaW5wdXQnKTtcbiAgfVxuXG4gIC8vIFVzZSAwIGFzIHN0cmluZyB0ZXJtaW5hdG9yLiBUaGF0IHNpZ25pZmljYW50bHkgc2ltcGxpZmllcyBib3VuZHMgY2hlY2suXG4gIHN0YXRlLmlucHV0ICs9ICdcXDAnO1xuXG4gIHdoaWxlIChzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKSA9PT0gMHgyMC8qIFNwYWNlICovKSB7XG4gICAgc3RhdGUubGluZUluZGVudCArPSAxO1xuICAgIHN0YXRlLnBvc2l0aW9uICs9IDE7XG4gIH1cblxuICB3aGlsZSAoc3RhdGUucG9zaXRpb24gPCAoc3RhdGUubGVuZ3RoIC0gMSkpIHtcbiAgICByZWFkRG9jdW1lbnQoc3RhdGUpO1xuICB9XG5cbiAgcmV0dXJuIHN0YXRlLmRvY3VtZW50cztcbn1cblxuXG5mdW5jdGlvbiBsb2FkQWxsJDEoaW5wdXQsIGl0ZXJhdG9yLCBvcHRpb25zKSB7XG4gIGlmIChpdGVyYXRvciAhPT0gbnVsbCAmJiB0eXBlb2YgaXRlcmF0b3IgPT09ICdvYmplY3QnICYmIHR5cGVvZiBvcHRpb25zID09PSAndW5kZWZpbmVkJykge1xuICAgIG9wdGlvbnMgPSBpdGVyYXRvcjtcbiAgICBpdGVyYXRvciA9IG51bGw7XG4gIH1cblxuICB2YXIgZG9jdW1lbnRzID0gbG9hZERvY3VtZW50cyhpbnB1dCwgb3B0aW9ucyk7XG5cbiAgaWYgKHR5cGVvZiBpdGVyYXRvciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBkb2N1bWVudHM7XG4gIH1cblxuICBmb3IgKHZhciBpbmRleCA9IDAsIGxlbmd0aCA9IGRvY3VtZW50cy5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgaXRlcmF0b3IoZG9jdW1lbnRzW2luZGV4XSk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBsb2FkJDEoaW5wdXQsIG9wdGlvbnMpIHtcbiAgdmFyIGRvY3VtZW50cyA9IGxvYWREb2N1bWVudHMoaW5wdXQsIG9wdGlvbnMpO1xuXG4gIGlmIChkb2N1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgLyplc2xpbnQtZGlzYWJsZSBuby11bmRlZmluZWQqL1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0gZWxzZSBpZiAoZG9jdW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBkb2N1bWVudHNbMF07XG4gIH1cbiAgdGhyb3cgbmV3IGV4Y2VwdGlvbignZXhwZWN0ZWQgYSBzaW5nbGUgZG9jdW1lbnQgaW4gdGhlIHN0cmVhbSwgYnV0IGZvdW5kIG1vcmUnKTtcbn1cblxuXG52YXIgbG9hZEFsbF8xID0gbG9hZEFsbCQxO1xudmFyIGxvYWRfMSAgICA9IGxvYWQkMTtcblxudmFyIGxvYWRlciA9IHtcblx0bG9hZEFsbDogbG9hZEFsbF8xLFxuXHRsb2FkOiBsb2FkXzFcbn07XG5cbi8qZXNsaW50LWRpc2FibGUgbm8tdXNlLWJlZm9yZS1kZWZpbmUqL1xuXG5cblxuXG5cbnZhciBfdG9TdHJpbmcgICAgICAgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIF9oYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbnZhciBDSEFSX0JPTSAgICAgICAgICAgICAgICAgID0gMHhGRUZGO1xudmFyIENIQVJfVEFCICAgICAgICAgICAgICAgICAgPSAweDA5OyAvKiBUYWIgKi9cbnZhciBDSEFSX0xJTkVfRkVFRCAgICAgICAgICAgID0gMHgwQTsgLyogTEYgKi9cbnZhciBDSEFSX0NBUlJJQUdFX1JFVFVSTiAgICAgID0gMHgwRDsgLyogQ1IgKi9cbnZhciBDSEFSX1NQQUNFICAgICAgICAgICAgICAgID0gMHgyMDsgLyogU3BhY2UgKi9cbnZhciBDSEFSX0VYQ0xBTUFUSU9OICAgICAgICAgID0gMHgyMTsgLyogISAqL1xudmFyIENIQVJfRE9VQkxFX1FVT1RFICAgICAgICAgPSAweDIyOyAvKiBcIiAqL1xudmFyIENIQVJfU0hBUlAgICAgICAgICAgICAgICAgPSAweDIzOyAvKiAjICovXG52YXIgQ0hBUl9QRVJDRU5UICAgICAgICAgICAgICA9IDB4MjU7IC8qICUgKi9cbnZhciBDSEFSX0FNUEVSU0FORCAgICAgICAgICAgID0gMHgyNjsgLyogJiAqL1xudmFyIENIQVJfU0lOR0xFX1FVT1RFICAgICAgICAgPSAweDI3OyAvKiAnICovXG52YXIgQ0hBUl9BU1RFUklTSyAgICAgICAgICAgICA9IDB4MkE7IC8qICogKi9cbnZhciBDSEFSX0NPTU1BICAgICAgICAgICAgICAgID0gMHgyQzsgLyogLCAqL1xudmFyIENIQVJfTUlOVVMgICAgICAgICAgICAgICAgPSAweDJEOyAvKiAtICovXG52YXIgQ0hBUl9DT0xPTiAgICAgICAgICAgICAgICA9IDB4M0E7IC8qIDogKi9cbnZhciBDSEFSX0VRVUFMUyAgICAgICAgICAgICAgID0gMHgzRDsgLyogPSAqL1xudmFyIENIQVJfR1JFQVRFUl9USEFOICAgICAgICAgPSAweDNFOyAvKiA+ICovXG52YXIgQ0hBUl9RVUVTVElPTiAgICAgICAgICAgICA9IDB4M0Y7IC8qID8gKi9cbnZhciBDSEFSX0NPTU1FUkNJQUxfQVQgICAgICAgID0gMHg0MDsgLyogQCAqL1xudmFyIENIQVJfTEVGVF9TUVVBUkVfQlJBQ0tFVCAgPSAweDVCOyAvKiBbICovXG52YXIgQ0hBUl9SSUdIVF9TUVVBUkVfQlJBQ0tFVCA9IDB4NUQ7IC8qIF0gKi9cbnZhciBDSEFSX0dSQVZFX0FDQ0VOVCAgICAgICAgID0gMHg2MDsgLyogYCAqL1xudmFyIENIQVJfTEVGVF9DVVJMWV9CUkFDS0VUICAgPSAweDdCOyAvKiB7ICovXG52YXIgQ0hBUl9WRVJUSUNBTF9MSU5FICAgICAgICA9IDB4N0M7IC8qIHwgKi9cbnZhciBDSEFSX1JJR0hUX0NVUkxZX0JSQUNLRVQgID0gMHg3RDsgLyogfSAqL1xuXG52YXIgRVNDQVBFX1NFUVVFTkNFUyA9IHt9O1xuXG5FU0NBUEVfU0VRVUVOQ0VTWzB4MDBdICAgPSAnXFxcXDAnO1xuRVNDQVBFX1NFUVVFTkNFU1sweDA3XSAgID0gJ1xcXFxhJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgwOF0gICA9ICdcXFxcYic7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MDldICAgPSAnXFxcXHQnO1xuRVNDQVBFX1NFUVVFTkNFU1sweDBBXSAgID0gJ1xcXFxuJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgwQl0gICA9ICdcXFxcdic7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MENdICAgPSAnXFxcXGYnO1xuRVNDQVBFX1NFUVVFTkNFU1sweDBEXSAgID0gJ1xcXFxyJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgxQl0gICA9ICdcXFxcZSc7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MjJdICAgPSAnXFxcXFwiJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHg1Q10gICA9ICdcXFxcXFxcXCc7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4ODVdICAgPSAnXFxcXE4nO1xuRVNDQVBFX1NFUVVFTkNFU1sweEEwXSAgID0gJ1xcXFxfJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgyMDI4XSA9ICdcXFxcTCc7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MjAyOV0gPSAnXFxcXFAnO1xuXG52YXIgREVQUkVDQVRFRF9CT09MRUFOU19TWU5UQVggPSBbXG4gICd5JywgJ1knLCAneWVzJywgJ1llcycsICdZRVMnLCAnb24nLCAnT24nLCAnT04nLFxuICAnbicsICdOJywgJ25vJywgJ05vJywgJ05PJywgJ29mZicsICdPZmYnLCAnT0ZGJ1xuXTtcblxudmFyIERFUFJFQ0FURURfQkFTRTYwX1NZTlRBWCA9IC9eWy0rXT9bMC05X10rKD86OlswLTlfXSspKyg/OlxcLlswLTlfXSopPyQvO1xuXG5mdW5jdGlvbiBjb21waWxlU3R5bGVNYXAoc2NoZW1hLCBtYXApIHtcbiAgdmFyIHJlc3VsdCwga2V5cywgaW5kZXgsIGxlbmd0aCwgdGFnLCBzdHlsZSwgdHlwZTtcblxuICBpZiAobWFwID09PSBudWxsKSByZXR1cm4ge307XG5cbiAgcmVzdWx0ID0ge307XG4gIGtleXMgPSBPYmplY3Qua2V5cyhtYXApO1xuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICB0YWcgPSBrZXlzW2luZGV4XTtcbiAgICBzdHlsZSA9IFN0cmluZyhtYXBbdGFnXSk7XG5cbiAgICBpZiAodGFnLnNsaWNlKDAsIDIpID09PSAnISEnKSB7XG4gICAgICB0YWcgPSAndGFnOnlhbWwub3JnLDIwMDI6JyArIHRhZy5zbGljZSgyKTtcbiAgICB9XG4gICAgdHlwZSA9IHNjaGVtYS5jb21waWxlZFR5cGVNYXBbJ2ZhbGxiYWNrJ11bdGFnXTtcblxuICAgIGlmICh0eXBlICYmIF9oYXNPd25Qcm9wZXJ0eS5jYWxsKHR5cGUuc3R5bGVBbGlhc2VzLCBzdHlsZSkpIHtcbiAgICAgIHN0eWxlID0gdHlwZS5zdHlsZUFsaWFzZXNbc3R5bGVdO1xuICAgIH1cblxuICAgIHJlc3VsdFt0YWddID0gc3R5bGU7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBlbmNvZGVIZXgoY2hhcmFjdGVyKSB7XG4gIHZhciBzdHJpbmcsIGhhbmRsZSwgbGVuZ3RoO1xuXG4gIHN0cmluZyA9IGNoYXJhY3Rlci50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtcblxuICBpZiAoY2hhcmFjdGVyIDw9IDB4RkYpIHtcbiAgICBoYW5kbGUgPSAneCc7XG4gICAgbGVuZ3RoID0gMjtcbiAgfSBlbHNlIGlmIChjaGFyYWN0ZXIgPD0gMHhGRkZGKSB7XG4gICAgaGFuZGxlID0gJ3UnO1xuICAgIGxlbmd0aCA9IDQ7XG4gIH0gZWxzZSBpZiAoY2hhcmFjdGVyIDw9IDB4RkZGRkZGRkYpIHtcbiAgICBoYW5kbGUgPSAnVSc7XG4gICAgbGVuZ3RoID0gODtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgZXhjZXB0aW9uKCdjb2RlIHBvaW50IHdpdGhpbiBhIHN0cmluZyBtYXkgbm90IGJlIGdyZWF0ZXIgdGhhbiAweEZGRkZGRkZGJyk7XG4gIH1cblxuICByZXR1cm4gJ1xcXFwnICsgaGFuZGxlICsgY29tbW9uLnJlcGVhdCgnMCcsIGxlbmd0aCAtIHN0cmluZy5sZW5ndGgpICsgc3RyaW5nO1xufVxuXG5cbnZhciBRVU9USU5HX1RZUEVfU0lOR0xFID0gMSxcbiAgICBRVU9USU5HX1RZUEVfRE9VQkxFID0gMjtcblxuZnVuY3Rpb24gU3RhdGUob3B0aW9ucykge1xuICB0aGlzLnNjaGVtYSAgICAgICAgPSBvcHRpb25zWydzY2hlbWEnXSB8fCBfZGVmYXVsdDtcbiAgdGhpcy5pbmRlbnQgICAgICAgID0gTWF0aC5tYXgoMSwgKG9wdGlvbnNbJ2luZGVudCddIHx8IDIpKTtcbiAgdGhpcy5ub0FycmF5SW5kZW50ID0gb3B0aW9uc1snbm9BcnJheUluZGVudCddIHx8IGZhbHNlO1xuICB0aGlzLnNraXBJbnZhbGlkICAgPSBvcHRpb25zWydza2lwSW52YWxpZCddIHx8IGZhbHNlO1xuICB0aGlzLmZsb3dMZXZlbCAgICAgPSAoY29tbW9uLmlzTm90aGluZyhvcHRpb25zWydmbG93TGV2ZWwnXSkgPyAtMSA6IG9wdGlvbnNbJ2Zsb3dMZXZlbCddKTtcbiAgdGhpcy5zdHlsZU1hcCAgICAgID0gY29tcGlsZVN0eWxlTWFwKHRoaXMuc2NoZW1hLCBvcHRpb25zWydzdHlsZXMnXSB8fCBudWxsKTtcbiAgdGhpcy5zb3J0S2V5cyAgICAgID0gb3B0aW9uc1snc29ydEtleXMnXSB8fCBmYWxzZTtcbiAgdGhpcy5saW5lV2lkdGggICAgID0gb3B0aW9uc1snbGluZVdpZHRoJ10gfHwgODA7XG4gIHRoaXMubm9SZWZzICAgICAgICA9IG9wdGlvbnNbJ25vUmVmcyddIHx8IGZhbHNlO1xuICB0aGlzLm5vQ29tcGF0TW9kZSAgPSBvcHRpb25zWydub0NvbXBhdE1vZGUnXSB8fCBmYWxzZTtcbiAgdGhpcy5jb25kZW5zZUZsb3cgID0gb3B0aW9uc1snY29uZGVuc2VGbG93J10gfHwgZmFsc2U7XG4gIHRoaXMucXVvdGluZ1R5cGUgICA9IG9wdGlvbnNbJ3F1b3RpbmdUeXBlJ10gPT09ICdcIicgPyBRVU9USU5HX1RZUEVfRE9VQkxFIDogUVVPVElOR19UWVBFX1NJTkdMRTtcbiAgdGhpcy5mb3JjZVF1b3RlcyAgID0gb3B0aW9uc1snZm9yY2VRdW90ZXMnXSB8fCBmYWxzZTtcbiAgdGhpcy5yZXBsYWNlciAgICAgID0gdHlwZW9mIG9wdGlvbnNbJ3JlcGxhY2VyJ10gPT09ICdmdW5jdGlvbicgPyBvcHRpb25zWydyZXBsYWNlciddIDogbnVsbDtcblxuICB0aGlzLmltcGxpY2l0VHlwZXMgPSB0aGlzLnNjaGVtYS5jb21waWxlZEltcGxpY2l0O1xuICB0aGlzLmV4cGxpY2l0VHlwZXMgPSB0aGlzLnNjaGVtYS5jb21waWxlZEV4cGxpY2l0O1xuXG4gIHRoaXMudGFnID0gbnVsbDtcbiAgdGhpcy5yZXN1bHQgPSAnJztcblxuICB0aGlzLmR1cGxpY2F0ZXMgPSBbXTtcbiAgdGhpcy51c2VkRHVwbGljYXRlcyA9IG51bGw7XG59XG5cbi8vIEluZGVudHMgZXZlcnkgbGluZSBpbiBhIHN0cmluZy4gRW1wdHkgbGluZXMgKFxcbiBvbmx5KSBhcmUgbm90IGluZGVudGVkLlxuZnVuY3Rpb24gaW5kZW50U3RyaW5nKHN0cmluZywgc3BhY2VzKSB7XG4gIHZhciBpbmQgPSBjb21tb24ucmVwZWF0KCcgJywgc3BhY2VzKSxcbiAgICAgIHBvc2l0aW9uID0gMCxcbiAgICAgIG5leHQgPSAtMSxcbiAgICAgIHJlc3VsdCA9ICcnLFxuICAgICAgbGluZSxcbiAgICAgIGxlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG5cbiAgd2hpbGUgKHBvc2l0aW9uIDwgbGVuZ3RoKSB7XG4gICAgbmV4dCA9IHN0cmluZy5pbmRleE9mKCdcXG4nLCBwb3NpdGlvbik7XG4gICAgaWYgKG5leHQgPT09IC0xKSB7XG4gICAgICBsaW5lID0gc3RyaW5nLnNsaWNlKHBvc2l0aW9uKTtcbiAgICAgIHBvc2l0aW9uID0gbGVuZ3RoO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaW5lID0gc3RyaW5nLnNsaWNlKHBvc2l0aW9uLCBuZXh0ICsgMSk7XG4gICAgICBwb3NpdGlvbiA9IG5leHQgKyAxO1xuICAgIH1cblxuICAgIGlmIChsaW5lLmxlbmd0aCAmJiBsaW5lICE9PSAnXFxuJykgcmVzdWx0ICs9IGluZDtcblxuICAgIHJlc3VsdCArPSBsaW5lO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVOZXh0TGluZShzdGF0ZSwgbGV2ZWwpIHtcbiAgcmV0dXJuICdcXG4nICsgY29tbW9uLnJlcGVhdCgnICcsIHN0YXRlLmluZGVudCAqIGxldmVsKTtcbn1cblxuZnVuY3Rpb24gdGVzdEltcGxpY2l0UmVzb2x2aW5nKHN0YXRlLCBzdHIpIHtcbiAgdmFyIGluZGV4LCBsZW5ndGgsIHR5cGU7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IHN0YXRlLmltcGxpY2l0VHlwZXMubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHR5cGUgPSBzdGF0ZS5pbXBsaWNpdFR5cGVzW2luZGV4XTtcblxuICAgIGlmICh0eXBlLnJlc29sdmUoc3RyKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBbMzNdIHMtd2hpdGUgOjo9IHMtc3BhY2UgfCBzLXRhYlxuZnVuY3Rpb24gaXNXaGl0ZXNwYWNlKGMpIHtcbiAgcmV0dXJuIGMgPT09IENIQVJfU1BBQ0UgfHwgYyA9PT0gQ0hBUl9UQUI7XG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgY2hhcmFjdGVyIGNhbiBiZSBwcmludGVkIHdpdGhvdXQgZXNjYXBpbmcuXG4vLyBGcm9tIFlBTUwgMS4yOiBcImFueSBhbGxvd2VkIGNoYXJhY3RlcnMga25vd24gdG8gYmUgbm9uLXByaW50YWJsZVxuLy8gc2hvdWxkIGFsc28gYmUgZXNjYXBlZC4gW0hvd2V2ZXIsXSBUaGlzIGlzblx1MjAxOXQgbWFuZGF0b3J5XCJcbi8vIERlcml2ZWQgZnJvbSBuYi1jaGFyIC0gXFx0IC0gI3g4NSAtICN4QTAgLSAjeDIwMjggLSAjeDIwMjkuXG5mdW5jdGlvbiBpc1ByaW50YWJsZShjKSB7XG4gIHJldHVybiAgKDB4MDAwMjAgPD0gYyAmJiBjIDw9IDB4MDAwMDdFKVxuICAgICAgfHwgKCgweDAwMEExIDw9IGMgJiYgYyA8PSAweDAwRDdGRikgJiYgYyAhPT0gMHgyMDI4ICYmIGMgIT09IDB4MjAyOSlcbiAgICAgIHx8ICgoMHgwRTAwMCA8PSBjICYmIGMgPD0gMHgwMEZGRkQpICYmIGMgIT09IENIQVJfQk9NKVxuICAgICAgfHwgICgweDEwMDAwIDw9IGMgJiYgYyA8PSAweDEwRkZGRik7XG59XG5cbi8vIFszNF0gbnMtY2hhciA6Oj0gbmItY2hhciAtIHMtd2hpdGVcbi8vIFsyN10gbmItY2hhciA6Oj0gYy1wcmludGFibGUgLSBiLWNoYXIgLSBjLWJ5dGUtb3JkZXItbWFya1xuLy8gWzI2XSBiLWNoYXIgIDo6PSBiLWxpbmUtZmVlZCB8IGItY2FycmlhZ2UtcmV0dXJuXG4vLyBJbmNsdWRpbmcgcy13aGl0ZSAoZm9yIHNvbWUgcmVhc29uLCBleGFtcGxlcyBkb2Vzbid0IG1hdGNoIHNwZWNzIGluIHRoaXMgYXNwZWN0KVxuLy8gbnMtY2hhciA6Oj0gYy1wcmludGFibGUgLSBiLWxpbmUtZmVlZCAtIGItY2FycmlhZ2UtcmV0dXJuIC0gYy1ieXRlLW9yZGVyLW1hcmtcbmZ1bmN0aW9uIGlzTnNDaGFyT3JXaGl0ZXNwYWNlKGMpIHtcbiAgcmV0dXJuIGlzUHJpbnRhYmxlKGMpXG4gICAgJiYgYyAhPT0gQ0hBUl9CT01cbiAgICAvLyAtIGItY2hhclxuICAgICYmIGMgIT09IENIQVJfQ0FSUklBR0VfUkVUVVJOXG4gICAgJiYgYyAhPT0gQ0hBUl9MSU5FX0ZFRUQ7XG59XG5cbi8vIFsxMjddICBucy1wbGFpbi1zYWZlKGMpIDo6PSBjID0gZmxvdy1vdXQgIFx1MjFEMiBucy1wbGFpbi1zYWZlLW91dFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBmbG93LWluICAgXHUyMUQyIG5zLXBsYWluLXNhZmUtaW5cbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjID0gYmxvY2sta2V5IFx1MjFEMiBucy1wbGFpbi1zYWZlLW91dFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBmbG93LWtleSAgXHUyMUQyIG5zLXBsYWluLXNhZmUtaW5cbi8vIFsxMjhdIG5zLXBsYWluLXNhZmUtb3V0IDo6PSBucy1jaGFyXG4vLyBbMTI5XSAgbnMtcGxhaW4tc2FmZS1pbiA6Oj0gbnMtY2hhciAtIGMtZmxvdy1pbmRpY2F0b3Jcbi8vIFsxMzBdICBucy1wbGFpbi1jaGFyKGMpIDo6PSAgKCBucy1wbGFpbi1zYWZlKGMpIC0gXHUyMDFDOlx1MjAxRCAtIFx1MjAxQyNcdTIwMUQgKVxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgfCAoIC8qIEFuIG5zLWNoYXIgcHJlY2VkaW5nICovIFx1MjAxQyNcdTIwMUQgKVxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgfCAoIFx1MjAxQzpcdTIwMUQgLyogRm9sbG93ZWQgYnkgYW4gbnMtcGxhaW4tc2FmZShjKSAqLyApXG5mdW5jdGlvbiBpc1BsYWluU2FmZShjLCBwcmV2LCBpbmJsb2NrKSB7XG4gIHZhciBjSXNOc0NoYXJPcldoaXRlc3BhY2UgPSBpc05zQ2hhck9yV2hpdGVzcGFjZShjKTtcbiAgdmFyIGNJc05zQ2hhciA9IGNJc05zQ2hhck9yV2hpdGVzcGFjZSAmJiAhaXNXaGl0ZXNwYWNlKGMpO1xuICByZXR1cm4gKFxuICAgIC8vIG5zLXBsYWluLXNhZmVcbiAgICBpbmJsb2NrID8gLy8gYyA9IGZsb3ctaW5cbiAgICAgIGNJc05zQ2hhck9yV2hpdGVzcGFjZVxuICAgICAgOiBjSXNOc0NoYXJPcldoaXRlc3BhY2VcbiAgICAgICAgLy8gLSBjLWZsb3ctaW5kaWNhdG9yXG4gICAgICAgICYmIGMgIT09IENIQVJfQ09NTUFcbiAgICAgICAgJiYgYyAhPT0gQ0hBUl9MRUZUX1NRVUFSRV9CUkFDS0VUXG4gICAgICAgICYmIGMgIT09IENIQVJfUklHSFRfU1FVQVJFX0JSQUNLRVRcbiAgICAgICAgJiYgYyAhPT0gQ0hBUl9MRUZUX0NVUkxZX0JSQUNLRVRcbiAgICAgICAgJiYgYyAhPT0gQ0hBUl9SSUdIVF9DVVJMWV9CUkFDS0VUXG4gIClcbiAgICAvLyBucy1wbGFpbi1jaGFyXG4gICAgJiYgYyAhPT0gQ0hBUl9TSEFSUCAvLyBmYWxzZSBvbiAnIydcbiAgICAmJiAhKHByZXYgPT09IENIQVJfQ09MT04gJiYgIWNJc05zQ2hhcikgLy8gZmFsc2Ugb24gJzogJ1xuICAgIHx8IChpc05zQ2hhck9yV2hpdGVzcGFjZShwcmV2KSAmJiAhaXNXaGl0ZXNwYWNlKHByZXYpICYmIGMgPT09IENIQVJfU0hBUlApIC8vIGNoYW5nZSB0byB0cnVlIG9uICdbXiBdIydcbiAgICB8fCAocHJldiA9PT0gQ0hBUl9DT0xPTiAmJiBjSXNOc0NoYXIpOyAvLyBjaGFuZ2UgdG8gdHJ1ZSBvbiAnOlteIF0nXG59XG5cbi8vIFNpbXBsaWZpZWQgdGVzdCBmb3IgdmFsdWVzIGFsbG93ZWQgYXMgdGhlIGZpcnN0IGNoYXJhY3RlciBpbiBwbGFpbiBzdHlsZS5cbmZ1bmN0aW9uIGlzUGxhaW5TYWZlRmlyc3QoYykge1xuICAvLyBVc2VzIGEgc3Vic2V0IG9mIG5zLWNoYXIgLSBjLWluZGljYXRvclxuICAvLyB3aGVyZSBucy1jaGFyID0gbmItY2hhciAtIHMtd2hpdGUuXG4gIC8vIE5vIHN1cHBvcnQgb2YgKCAoIFx1MjAxQz9cdTIwMUQgfCBcdTIwMUM6XHUyMDFEIHwgXHUyMDFDLVx1MjAxRCApIC8qIEZvbGxvd2VkIGJ5IGFuIG5zLXBsYWluLXNhZmUoYykpICovICkgcGFydFxuICByZXR1cm4gaXNQcmludGFibGUoYykgJiYgYyAhPT0gQ0hBUl9CT01cbiAgICAmJiAhaXNXaGl0ZXNwYWNlKGMpIC8vIC0gcy13aGl0ZVxuICAgIC8vIC0gKGMtaW5kaWNhdG9yIDo6PVxuICAgIC8vIFx1MjAxQy1cdTIwMUQgfCBcdTIwMUM/XHUyMDFEIHwgXHUyMDFDOlx1MjAxRCB8IFx1MjAxQyxcdTIwMUQgfCBcdTIwMUNbXHUyMDFEIHwgXHUyMDFDXVx1MjAxRCB8IFx1MjAxQ3tcdTIwMUQgfCBcdTIwMUN9XHUyMDFEXG4gICAgJiYgYyAhPT0gQ0hBUl9NSU5VU1xuICAgICYmIGMgIT09IENIQVJfUVVFU1RJT05cbiAgICAmJiBjICE9PSBDSEFSX0NPTE9OXG4gICAgJiYgYyAhPT0gQ0hBUl9DT01NQVxuICAgICYmIGMgIT09IENIQVJfTEVGVF9TUVVBUkVfQlJBQ0tFVFxuICAgICYmIGMgIT09IENIQVJfUklHSFRfU1FVQVJFX0JSQUNLRVRcbiAgICAmJiBjICE9PSBDSEFSX0xFRlRfQ1VSTFlfQlJBQ0tFVFxuICAgICYmIGMgIT09IENIQVJfUklHSFRfQ1VSTFlfQlJBQ0tFVFxuICAgIC8vIHwgXHUyMDFDI1x1MjAxRCB8IFx1MjAxQyZcdTIwMUQgfCBcdTIwMUMqXHUyMDFEIHwgXHUyMDFDIVx1MjAxRCB8IFx1MjAxQ3xcdTIwMUQgfCBcdTIwMUM9XHUyMDFEIHwgXHUyMDFDPlx1MjAxRCB8IFx1MjAxQydcdTIwMUQgfCBcdTIwMUNcIlx1MjAxRFxuICAgICYmIGMgIT09IENIQVJfU0hBUlBcbiAgICAmJiBjICE9PSBDSEFSX0FNUEVSU0FORFxuICAgICYmIGMgIT09IENIQVJfQVNURVJJU0tcbiAgICAmJiBjICE9PSBDSEFSX0VYQ0xBTUFUSU9OXG4gICAgJiYgYyAhPT0gQ0hBUl9WRVJUSUNBTF9MSU5FXG4gICAgJiYgYyAhPT0gQ0hBUl9FUVVBTFNcbiAgICAmJiBjICE9PSBDSEFSX0dSRUFURVJfVEhBTlxuICAgICYmIGMgIT09IENIQVJfU0lOR0xFX1FVT1RFXG4gICAgJiYgYyAhPT0gQ0hBUl9ET1VCTEVfUVVPVEVcbiAgICAvLyB8IFx1MjAxQyVcdTIwMUQgfCBcdTIwMUNAXHUyMDFEIHwgXHUyMDFDYFx1MjAxRClcbiAgICAmJiBjICE9PSBDSEFSX1BFUkNFTlRcbiAgICAmJiBjICE9PSBDSEFSX0NPTU1FUkNJQUxfQVRcbiAgICAmJiBjICE9PSBDSEFSX0dSQVZFX0FDQ0VOVDtcbn1cblxuLy8gU2ltcGxpZmllZCB0ZXN0IGZvciB2YWx1ZXMgYWxsb3dlZCBhcyB0aGUgbGFzdCBjaGFyYWN0ZXIgaW4gcGxhaW4gc3R5bGUuXG5mdW5jdGlvbiBpc1BsYWluU2FmZUxhc3QoYykge1xuICAvLyBqdXN0IG5vdCB3aGl0ZXNwYWNlIG9yIGNvbG9uLCBpdCB3aWxsIGJlIGNoZWNrZWQgdG8gYmUgcGxhaW4gY2hhcmFjdGVyIGxhdGVyXG4gIHJldHVybiAhaXNXaGl0ZXNwYWNlKGMpICYmIGMgIT09IENIQVJfQ09MT047XG59XG5cbi8vIFNhbWUgYXMgJ3N0cmluZycuY29kZVBvaW50QXQocG9zKSwgYnV0IHdvcmtzIGluIG9sZGVyIGJyb3dzZXJzLlxuZnVuY3Rpb24gY29kZVBvaW50QXQoc3RyaW5nLCBwb3MpIHtcbiAgdmFyIGZpcnN0ID0gc3RyaW5nLmNoYXJDb2RlQXQocG9zKSwgc2Vjb25kO1xuICBpZiAoZmlyc3QgPj0gMHhEODAwICYmIGZpcnN0IDw9IDB4REJGRiAmJiBwb3MgKyAxIDwgc3RyaW5nLmxlbmd0aCkge1xuICAgIHNlY29uZCA9IHN0cmluZy5jaGFyQ29kZUF0KHBvcyArIDEpO1xuICAgIGlmIChzZWNvbmQgPj0gMHhEQzAwICYmIHNlY29uZCA8PSAweERGRkYpIHtcbiAgICAgIC8vIGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nI3N1cnJvZ2F0ZS1mb3JtdWxhZVxuICAgICAgcmV0dXJuIChmaXJzdCAtIDB4RDgwMCkgKiAweDQwMCArIHNlY29uZCAtIDB4REMwMCArIDB4MTAwMDA7XG4gICAgfVxuICB9XG4gIHJldHVybiBmaXJzdDtcbn1cblxuLy8gRGV0ZXJtaW5lcyB3aGV0aGVyIGJsb2NrIGluZGVudGF0aW9uIGluZGljYXRvciBpcyByZXF1aXJlZC5cbmZ1bmN0aW9uIG5lZWRJbmRlbnRJbmRpY2F0b3Ioc3RyaW5nKSB7XG4gIHZhciBsZWFkaW5nU3BhY2VSZSA9IC9eXFxuKiAvO1xuICByZXR1cm4gbGVhZGluZ1NwYWNlUmUudGVzdChzdHJpbmcpO1xufVxuXG52YXIgU1RZTEVfUExBSU4gICA9IDEsXG4gICAgU1RZTEVfU0lOR0xFICA9IDIsXG4gICAgU1RZTEVfTElURVJBTCA9IDMsXG4gICAgU1RZTEVfRk9MREVEICA9IDQsXG4gICAgU1RZTEVfRE9VQkxFICA9IDU7XG5cbi8vIERldGVybWluZXMgd2hpY2ggc2NhbGFyIHN0eWxlcyBhcmUgcG9zc2libGUgYW5kIHJldHVybnMgdGhlIHByZWZlcnJlZCBzdHlsZS5cbi8vIGxpbmVXaWR0aCA9IC0xID0+IG5vIGxpbWl0LlxuLy8gUHJlLWNvbmRpdGlvbnM6IHN0ci5sZW5ndGggPiAwLlxuLy8gUG9zdC1jb25kaXRpb25zOlxuLy8gICAgU1RZTEVfUExBSU4gb3IgU1RZTEVfU0lOR0xFID0+IG5vIFxcbiBhcmUgaW4gdGhlIHN0cmluZy5cbi8vICAgIFNUWUxFX0xJVEVSQUwgPT4gbm8gbGluZXMgYXJlIHN1aXRhYmxlIGZvciBmb2xkaW5nIChvciBsaW5lV2lkdGggaXMgLTEpLlxuLy8gICAgU1RZTEVfRk9MREVEID0+IGEgbGluZSA+IGxpbmVXaWR0aCBhbmQgY2FuIGJlIGZvbGRlZCAoYW5kIGxpbmVXaWR0aCAhPSAtMSkuXG5mdW5jdGlvbiBjaG9vc2VTY2FsYXJTdHlsZShzdHJpbmcsIHNpbmdsZUxpbmVPbmx5LCBpbmRlbnRQZXJMZXZlbCwgbGluZVdpZHRoLFxuICB0ZXN0QW1iaWd1b3VzVHlwZSwgcXVvdGluZ1R5cGUsIGZvcmNlUXVvdGVzLCBpbmJsb2NrKSB7XG5cbiAgdmFyIGk7XG4gIHZhciBjaGFyID0gMDtcbiAgdmFyIHByZXZDaGFyID0gbnVsbDtcbiAgdmFyIGhhc0xpbmVCcmVhayA9IGZhbHNlO1xuICB2YXIgaGFzRm9sZGFibGVMaW5lID0gZmFsc2U7IC8vIG9ubHkgY2hlY2tlZCBpZiBzaG91bGRUcmFja1dpZHRoXG4gIHZhciBzaG91bGRUcmFja1dpZHRoID0gbGluZVdpZHRoICE9PSAtMTtcbiAgdmFyIHByZXZpb3VzTGluZUJyZWFrID0gLTE7IC8vIGNvdW50IHRoZSBmaXJzdCBsaW5lIGNvcnJlY3RseVxuICB2YXIgcGxhaW4gPSBpc1BsYWluU2FmZUZpcnN0KGNvZGVQb2ludEF0KHN0cmluZywgMCkpXG4gICAgICAgICAgJiYgaXNQbGFpblNhZmVMYXN0KGNvZGVQb2ludEF0KHN0cmluZywgc3RyaW5nLmxlbmd0aCAtIDEpKTtcblxuICBpZiAoc2luZ2xlTGluZU9ubHkgfHwgZm9yY2VRdW90ZXMpIHtcbiAgICAvLyBDYXNlOiBubyBibG9jayBzdHlsZXMuXG4gICAgLy8gQ2hlY2sgZm9yIGRpc2FsbG93ZWQgY2hhcmFjdGVycyB0byBydWxlIG91dCBwbGFpbiBhbmQgc2luZ2xlLlxuICAgIGZvciAoaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOyBjaGFyID49IDB4MTAwMDAgPyBpICs9IDIgOiBpKyspIHtcbiAgICAgIGNoYXIgPSBjb2RlUG9pbnRBdChzdHJpbmcsIGkpO1xuICAgICAgaWYgKCFpc1ByaW50YWJsZShjaGFyKSkge1xuICAgICAgICByZXR1cm4gU1RZTEVfRE9VQkxFO1xuICAgICAgfVxuICAgICAgcGxhaW4gPSBwbGFpbiAmJiBpc1BsYWluU2FmZShjaGFyLCBwcmV2Q2hhciwgaW5ibG9jayk7XG4gICAgICBwcmV2Q2hhciA9IGNoYXI7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIENhc2U6IGJsb2NrIHN0eWxlcyBwZXJtaXR0ZWQuXG4gICAgZm9yIChpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7IGNoYXIgPj0gMHgxMDAwMCA/IGkgKz0gMiA6IGkrKykge1xuICAgICAgY2hhciA9IGNvZGVQb2ludEF0KHN0cmluZywgaSk7XG4gICAgICBpZiAoY2hhciA9PT0gQ0hBUl9MSU5FX0ZFRUQpIHtcbiAgICAgICAgaGFzTGluZUJyZWFrID0gdHJ1ZTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgYW55IGxpbmUgY2FuIGJlIGZvbGRlZC5cbiAgICAgICAgaWYgKHNob3VsZFRyYWNrV2lkdGgpIHtcbiAgICAgICAgICBoYXNGb2xkYWJsZUxpbmUgPSBoYXNGb2xkYWJsZUxpbmUgfHxcbiAgICAgICAgICAgIC8vIEZvbGRhYmxlIGxpbmUgPSB0b28gbG9uZywgYW5kIG5vdCBtb3JlLWluZGVudGVkLlxuICAgICAgICAgICAgKGkgLSBwcmV2aW91c0xpbmVCcmVhayAtIDEgPiBsaW5lV2lkdGggJiZcbiAgICAgICAgICAgICBzdHJpbmdbcHJldmlvdXNMaW5lQnJlYWsgKyAxXSAhPT0gJyAnKTtcbiAgICAgICAgICBwcmV2aW91c0xpbmVCcmVhayA9IGk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIWlzUHJpbnRhYmxlKGNoYXIpKSB7XG4gICAgICAgIHJldHVybiBTVFlMRV9ET1VCTEU7XG4gICAgICB9XG4gICAgICBwbGFpbiA9IHBsYWluICYmIGlzUGxhaW5TYWZlKGNoYXIsIHByZXZDaGFyLCBpbmJsb2NrKTtcbiAgICAgIHByZXZDaGFyID0gY2hhcjtcbiAgICB9XG4gICAgLy8gaW4gY2FzZSB0aGUgZW5kIGlzIG1pc3NpbmcgYSBcXG5cbiAgICBoYXNGb2xkYWJsZUxpbmUgPSBoYXNGb2xkYWJsZUxpbmUgfHwgKHNob3VsZFRyYWNrV2lkdGggJiZcbiAgICAgIChpIC0gcHJldmlvdXNMaW5lQnJlYWsgLSAxID4gbGluZVdpZHRoICYmXG4gICAgICAgc3RyaW5nW3ByZXZpb3VzTGluZUJyZWFrICsgMV0gIT09ICcgJykpO1xuICB9XG4gIC8vIEFsdGhvdWdoIGV2ZXJ5IHN0eWxlIGNhbiByZXByZXNlbnQgXFxuIHdpdGhvdXQgZXNjYXBpbmcsIHByZWZlciBibG9jayBzdHlsZXNcbiAgLy8gZm9yIG11bHRpbGluZSwgc2luY2UgdGhleSdyZSBtb3JlIHJlYWRhYmxlIGFuZCB0aGV5IGRvbid0IGFkZCBlbXB0eSBsaW5lcy5cbiAgLy8gQWxzbyBwcmVmZXIgZm9sZGluZyBhIHN1cGVyLWxvbmcgbGluZS5cbiAgaWYgKCFoYXNMaW5lQnJlYWsgJiYgIWhhc0ZvbGRhYmxlTGluZSkge1xuICAgIC8vIFN0cmluZ3MgaW50ZXJwcmV0YWJsZSBhcyBhbm90aGVyIHR5cGUgaGF2ZSB0byBiZSBxdW90ZWQ7XG4gICAgLy8gZS5nLiB0aGUgc3RyaW5nICd0cnVlJyB2cy4gdGhlIGJvb2xlYW4gdHJ1ZS5cbiAgICBpZiAocGxhaW4gJiYgIWZvcmNlUXVvdGVzICYmICF0ZXN0QW1iaWd1b3VzVHlwZShzdHJpbmcpKSB7XG4gICAgICByZXR1cm4gU1RZTEVfUExBSU47XG4gICAgfVxuICAgIHJldHVybiBxdW90aW5nVHlwZSA9PT0gUVVPVElOR19UWVBFX0RPVUJMRSA/IFNUWUxFX0RPVUJMRSA6IFNUWUxFX1NJTkdMRTtcbiAgfVxuICAvLyBFZGdlIGNhc2U6IGJsb2NrIGluZGVudGF0aW9uIGluZGljYXRvciBjYW4gb25seSBoYXZlIG9uZSBkaWdpdC5cbiAgaWYgKGluZGVudFBlckxldmVsID4gOSAmJiBuZWVkSW5kZW50SW5kaWNhdG9yKHN0cmluZykpIHtcbiAgICByZXR1cm4gU1RZTEVfRE9VQkxFO1xuICB9XG4gIC8vIEF0IHRoaXMgcG9pbnQgd2Uga25vdyBibG9jayBzdHlsZXMgYXJlIHZhbGlkLlxuICAvLyBQcmVmZXIgbGl0ZXJhbCBzdHlsZSB1bmxlc3Mgd2Ugd2FudCB0byBmb2xkLlxuICBpZiAoIWZvcmNlUXVvdGVzKSB7XG4gICAgcmV0dXJuIGhhc0ZvbGRhYmxlTGluZSA/IFNUWUxFX0ZPTERFRCA6IFNUWUxFX0xJVEVSQUw7XG4gIH1cbiAgcmV0dXJuIHF1b3RpbmdUeXBlID09PSBRVU9USU5HX1RZUEVfRE9VQkxFID8gU1RZTEVfRE9VQkxFIDogU1RZTEVfU0lOR0xFO1xufVxuXG4vLyBOb3RlOiBsaW5lIGJyZWFraW5nL2ZvbGRpbmcgaXMgaW1wbGVtZW50ZWQgZm9yIG9ubHkgdGhlIGZvbGRlZCBzdHlsZS5cbi8vIE5CLiBXZSBkcm9wIHRoZSBsYXN0IHRyYWlsaW5nIG5ld2xpbmUgKGlmIGFueSkgb2YgYSByZXR1cm5lZCBibG9jayBzY2FsYXJcbi8vICBzaW5jZSB0aGUgZHVtcGVyIGFkZHMgaXRzIG93biBuZXdsaW5lLiBUaGlzIGFsd2F5cyB3b3Jrczpcbi8vICAgIFx1MjAyMiBObyBlbmRpbmcgbmV3bGluZSA9PiB1bmFmZmVjdGVkOyBhbHJlYWR5IHVzaW5nIHN0cmlwIFwiLVwiIGNob21waW5nLlxuLy8gICAgXHUyMDIyIEVuZGluZyBuZXdsaW5lICAgID0+IHJlbW92ZWQgdGhlbiByZXN0b3JlZC5cbi8vICBJbXBvcnRhbnRseSwgdGhpcyBrZWVwcyB0aGUgXCIrXCIgY2hvbXAgaW5kaWNhdG9yIGZyb20gZ2FpbmluZyBhbiBleHRyYSBsaW5lLlxuZnVuY3Rpb24gd3JpdGVTY2FsYXIoc3RhdGUsIHN0cmluZywgbGV2ZWwsIGlza2V5LCBpbmJsb2NrKSB7XG4gIHN0YXRlLmR1bXAgPSAoZnVuY3Rpb24gKCkge1xuICAgIGlmIChzdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gc3RhdGUucXVvdGluZ1R5cGUgPT09IFFVT1RJTkdfVFlQRV9ET1VCTEUgPyAnXCJcIicgOiBcIicnXCI7XG4gICAgfVxuICAgIGlmICghc3RhdGUubm9Db21wYXRNb2RlKSB7XG4gICAgICBpZiAoREVQUkVDQVRFRF9CT09MRUFOU19TWU5UQVguaW5kZXhPZihzdHJpbmcpICE9PSAtMSB8fCBERVBSRUNBVEVEX0JBU0U2MF9TWU5UQVgudGVzdChzdHJpbmcpKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5xdW90aW5nVHlwZSA9PT0gUVVPVElOR19UWVBFX0RPVUJMRSA/ICgnXCInICsgc3RyaW5nICsgJ1wiJykgOiAoXCInXCIgKyBzdHJpbmcgKyBcIidcIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGluZGVudCA9IHN0YXRlLmluZGVudCAqIE1hdGgubWF4KDEsIGxldmVsKTsgLy8gbm8gMC1pbmRlbnQgc2NhbGFyc1xuICAgIC8vIEFzIGluZGVudGF0aW9uIGdldHMgZGVlcGVyLCBsZXQgdGhlIHdpZHRoIGRlY3JlYXNlIG1vbm90b25pY2FsbHlcbiAgICAvLyB0byB0aGUgbG93ZXIgYm91bmQgbWluKHN0YXRlLmxpbmVXaWR0aCwgNDApLlxuICAgIC8vIE5vdGUgdGhhdCB0aGlzIGltcGxpZXNcbiAgICAvLyAgc3RhdGUubGluZVdpZHRoIFx1MjI2NCA0MCArIHN0YXRlLmluZGVudDogd2lkdGggaXMgZml4ZWQgYXQgdGhlIGxvd2VyIGJvdW5kLlxuICAgIC8vICBzdGF0ZS5saW5lV2lkdGggPiA0MCArIHN0YXRlLmluZGVudDogd2lkdGggZGVjcmVhc2VzIHVudGlsIHRoZSBsb3dlciBib3VuZC5cbiAgICAvLyBUaGlzIGJlaGF2ZXMgYmV0dGVyIHRoYW4gYSBjb25zdGFudCBtaW5pbXVtIHdpZHRoIHdoaWNoIGRpc2FsbG93cyBuYXJyb3dlciBvcHRpb25zLFxuICAgIC8vIG9yIGFuIGluZGVudCB0aHJlc2hvbGQgd2hpY2ggY2F1c2VzIHRoZSB3aWR0aCB0byBzdWRkZW5seSBpbmNyZWFzZS5cbiAgICB2YXIgbGluZVdpZHRoID0gc3RhdGUubGluZVdpZHRoID09PSAtMVxuICAgICAgPyAtMSA6IE1hdGgubWF4KE1hdGgubWluKHN0YXRlLmxpbmVXaWR0aCwgNDApLCBzdGF0ZS5saW5lV2lkdGggLSBpbmRlbnQpO1xuXG4gICAgLy8gV2l0aG91dCBrbm93aW5nIGlmIGtleXMgYXJlIGltcGxpY2l0L2V4cGxpY2l0LCBhc3N1bWUgaW1wbGljaXQgZm9yIHNhZmV0eS5cbiAgICB2YXIgc2luZ2xlTGluZU9ubHkgPSBpc2tleVxuICAgICAgLy8gTm8gYmxvY2sgc3R5bGVzIGluIGZsb3cgbW9kZS5cbiAgICAgIHx8IChzdGF0ZS5mbG93TGV2ZWwgPiAtMSAmJiBsZXZlbCA+PSBzdGF0ZS5mbG93TGV2ZWwpO1xuICAgIGZ1bmN0aW9uIHRlc3RBbWJpZ3VpdHkoc3RyaW5nKSB7XG4gICAgICByZXR1cm4gdGVzdEltcGxpY2l0UmVzb2x2aW5nKHN0YXRlLCBzdHJpbmcpO1xuICAgIH1cblxuICAgIHN3aXRjaCAoY2hvb3NlU2NhbGFyU3R5bGUoc3RyaW5nLCBzaW5nbGVMaW5lT25seSwgc3RhdGUuaW5kZW50LCBsaW5lV2lkdGgsXG4gICAgICB0ZXN0QW1iaWd1aXR5LCBzdGF0ZS5xdW90aW5nVHlwZSwgc3RhdGUuZm9yY2VRdW90ZXMgJiYgIWlza2V5LCBpbmJsb2NrKSkge1xuXG4gICAgICBjYXNlIFNUWUxFX1BMQUlOOlxuICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgICAgY2FzZSBTVFlMRV9TSU5HTEU6XG4gICAgICAgIHJldHVybiBcIidcIiArIHN0cmluZy5yZXBsYWNlKC8nL2csIFwiJydcIikgKyBcIidcIjtcbiAgICAgIGNhc2UgU1RZTEVfTElURVJBTDpcbiAgICAgICAgcmV0dXJuICd8JyArIGJsb2NrSGVhZGVyKHN0cmluZywgc3RhdGUuaW5kZW50KVxuICAgICAgICAgICsgZHJvcEVuZGluZ05ld2xpbmUoaW5kZW50U3RyaW5nKHN0cmluZywgaW5kZW50KSk7XG4gICAgICBjYXNlIFNUWUxFX0ZPTERFRDpcbiAgICAgICAgcmV0dXJuICc+JyArIGJsb2NrSGVhZGVyKHN0cmluZywgc3RhdGUuaW5kZW50KVxuICAgICAgICAgICsgZHJvcEVuZGluZ05ld2xpbmUoaW5kZW50U3RyaW5nKGZvbGRTdHJpbmcoc3RyaW5nLCBsaW5lV2lkdGgpLCBpbmRlbnQpKTtcbiAgICAgIGNhc2UgU1RZTEVfRE9VQkxFOlxuICAgICAgICByZXR1cm4gJ1wiJyArIGVzY2FwZVN0cmluZyhzdHJpbmcpICsgJ1wiJztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBleGNlcHRpb24oJ2ltcG9zc2libGUgZXJyb3I6IGludmFsaWQgc2NhbGFyIHN0eWxlJyk7XG4gICAgfVxuICB9KCkpO1xufVxuXG4vLyBQcmUtY29uZGl0aW9uczogc3RyaW5nIGlzIHZhbGlkIGZvciBhIGJsb2NrIHNjYWxhciwgMSA8PSBpbmRlbnRQZXJMZXZlbCA8PSA5LlxuZnVuY3Rpb24gYmxvY2tIZWFkZXIoc3RyaW5nLCBpbmRlbnRQZXJMZXZlbCkge1xuICB2YXIgaW5kZW50SW5kaWNhdG9yID0gbmVlZEluZGVudEluZGljYXRvcihzdHJpbmcpID8gU3RyaW5nKGluZGVudFBlckxldmVsKSA6ICcnO1xuXG4gIC8vIG5vdGUgdGhlIHNwZWNpYWwgY2FzZTogdGhlIHN0cmluZyAnXFxuJyBjb3VudHMgYXMgYSBcInRyYWlsaW5nXCIgZW1wdHkgbGluZS5cbiAgdmFyIGNsaXAgPSAgICAgICAgICBzdHJpbmdbc3RyaW5nLmxlbmd0aCAtIDFdID09PSAnXFxuJztcbiAgdmFyIGtlZXAgPSBjbGlwICYmIChzdHJpbmdbc3RyaW5nLmxlbmd0aCAtIDJdID09PSAnXFxuJyB8fCBzdHJpbmcgPT09ICdcXG4nKTtcbiAgdmFyIGNob21wID0ga2VlcCA/ICcrJyA6IChjbGlwID8gJycgOiAnLScpO1xuXG4gIHJldHVybiBpbmRlbnRJbmRpY2F0b3IgKyBjaG9tcCArICdcXG4nO1xufVxuXG4vLyAoU2VlIHRoZSBub3RlIGZvciB3cml0ZVNjYWxhci4pXG5mdW5jdGlvbiBkcm9wRW5kaW5nTmV3bGluZShzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZ1tzdHJpbmcubGVuZ3RoIC0gMV0gPT09ICdcXG4nID8gc3RyaW5nLnNsaWNlKDAsIC0xKSA6IHN0cmluZztcbn1cblxuLy8gTm90ZTogYSBsb25nIGxpbmUgd2l0aG91dCBhIHN1aXRhYmxlIGJyZWFrIHBvaW50IHdpbGwgZXhjZWVkIHRoZSB3aWR0aCBsaW1pdC5cbi8vIFByZS1jb25kaXRpb25zOiBldmVyeSBjaGFyIGluIHN0ciBpc1ByaW50YWJsZSwgc3RyLmxlbmd0aCA+IDAsIHdpZHRoID4gMC5cbmZ1bmN0aW9uIGZvbGRTdHJpbmcoc3RyaW5nLCB3aWR0aCkge1xuICAvLyBJbiBmb2xkZWQgc3R5bGUsICRrJCBjb25zZWN1dGl2ZSBuZXdsaW5lcyBvdXRwdXQgYXMgJGsrMSQgbmV3bGluZXNcdTIwMTRcbiAgLy8gdW5sZXNzIHRoZXkncmUgYmVmb3JlIG9yIGFmdGVyIGEgbW9yZS1pbmRlbnRlZCBsaW5lLCBvciBhdCB0aGUgdmVyeVxuICAvLyBiZWdpbm5pbmcgb3IgZW5kLCBpbiB3aGljaCBjYXNlICRrJCBtYXBzIHRvICRrJC5cbiAgLy8gVGhlcmVmb3JlLCBwYXJzZSBlYWNoIGNodW5rIGFzIG5ld2xpbmUocykgZm9sbG93ZWQgYnkgYSBjb250ZW50IGxpbmUuXG4gIHZhciBsaW5lUmUgPSAvKFxcbispKFteXFxuXSopL2c7XG5cbiAgLy8gZmlyc3QgbGluZSAocG9zc2libHkgYW4gZW1wdHkgbGluZSlcbiAgdmFyIHJlc3VsdCA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5leHRMRiA9IHN0cmluZy5pbmRleE9mKCdcXG4nKTtcbiAgICBuZXh0TEYgPSBuZXh0TEYgIT09IC0xID8gbmV4dExGIDogc3RyaW5nLmxlbmd0aDtcbiAgICBsaW5lUmUubGFzdEluZGV4ID0gbmV4dExGO1xuICAgIHJldHVybiBmb2xkTGluZShzdHJpbmcuc2xpY2UoMCwgbmV4dExGKSwgd2lkdGgpO1xuICB9KCkpO1xuICAvLyBJZiB3ZSBoYXZlbid0IHJlYWNoZWQgdGhlIGZpcnN0IGNvbnRlbnQgbGluZSB5ZXQsIGRvbid0IGFkZCBhbiBleHRyYSBcXG4uXG4gIHZhciBwcmV2TW9yZUluZGVudGVkID0gc3RyaW5nWzBdID09PSAnXFxuJyB8fCBzdHJpbmdbMF0gPT09ICcgJztcbiAgdmFyIG1vcmVJbmRlbnRlZDtcblxuICAvLyByZXN0IG9mIHRoZSBsaW5lc1xuICB2YXIgbWF0Y2g7XG4gIHdoaWxlICgobWF0Y2ggPSBsaW5lUmUuZXhlYyhzdHJpbmcpKSkge1xuICAgIHZhciBwcmVmaXggPSBtYXRjaFsxXSwgbGluZSA9IG1hdGNoWzJdO1xuICAgIG1vcmVJbmRlbnRlZCA9IChsaW5lWzBdID09PSAnICcpO1xuICAgIHJlc3VsdCArPSBwcmVmaXhcbiAgICAgICsgKCFwcmV2TW9yZUluZGVudGVkICYmICFtb3JlSW5kZW50ZWQgJiYgbGluZSAhPT0gJydcbiAgICAgICAgPyAnXFxuJyA6ICcnKVxuICAgICAgKyBmb2xkTGluZShsaW5lLCB3aWR0aCk7XG4gICAgcHJldk1vcmVJbmRlbnRlZCA9IG1vcmVJbmRlbnRlZDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIEdyZWVkeSBsaW5lIGJyZWFraW5nLlxuLy8gUGlja3MgdGhlIGxvbmdlc3QgbGluZSB1bmRlciB0aGUgbGltaXQgZWFjaCB0aW1lLFxuLy8gb3RoZXJ3aXNlIHNldHRsZXMgZm9yIHRoZSBzaG9ydGVzdCBsaW5lIG92ZXIgdGhlIGxpbWl0LlxuLy8gTkIuIE1vcmUtaW5kZW50ZWQgbGluZXMgKmNhbm5vdCogYmUgZm9sZGVkLCBhcyB0aGF0IHdvdWxkIGFkZCBhbiBleHRyYSBcXG4uXG5mdW5jdGlvbiBmb2xkTGluZShsaW5lLCB3aWR0aCkge1xuICBpZiAobGluZSA9PT0gJycgfHwgbGluZVswXSA9PT0gJyAnKSByZXR1cm4gbGluZTtcblxuICAvLyBTaW5jZSBhIG1vcmUtaW5kZW50ZWQgbGluZSBhZGRzIGEgXFxuLCBicmVha3MgY2FuJ3QgYmUgZm9sbG93ZWQgYnkgYSBzcGFjZS5cbiAgdmFyIGJyZWFrUmUgPSAvIFteIF0vZzsgLy8gbm90ZTogdGhlIG1hdGNoIGluZGV4IHdpbGwgYWx3YXlzIGJlIDw9IGxlbmd0aC0yLlxuICB2YXIgbWF0Y2g7XG4gIC8vIHN0YXJ0IGlzIGFuIGluY2x1c2l2ZSBpbmRleC4gZW5kLCBjdXJyLCBhbmQgbmV4dCBhcmUgZXhjbHVzaXZlLlxuICB2YXIgc3RhcnQgPSAwLCBlbmQsIGN1cnIgPSAwLCBuZXh0ID0gMDtcbiAgdmFyIHJlc3VsdCA9ICcnO1xuXG4gIC8vIEludmFyaWFudHM6IDAgPD0gc3RhcnQgPD0gbGVuZ3RoLTEuXG4gIC8vICAgMCA8PSBjdXJyIDw9IG5leHQgPD0gbWF4KDAsIGxlbmd0aC0yKS4gY3VyciAtIHN0YXJ0IDw9IHdpZHRoLlxuICAvLyBJbnNpZGUgdGhlIGxvb3A6XG4gIC8vICAgQSBtYXRjaCBpbXBsaWVzIGxlbmd0aCA+PSAyLCBzbyBjdXJyIGFuZCBuZXh0IGFyZSA8PSBsZW5ndGgtMi5cbiAgd2hpbGUgKChtYXRjaCA9IGJyZWFrUmUuZXhlYyhsaW5lKSkpIHtcbiAgICBuZXh0ID0gbWF0Y2guaW5kZXg7XG4gICAgLy8gbWFpbnRhaW4gaW52YXJpYW50OiBjdXJyIC0gc3RhcnQgPD0gd2lkdGhcbiAgICBpZiAobmV4dCAtIHN0YXJ0ID4gd2lkdGgpIHtcbiAgICAgIGVuZCA9IChjdXJyID4gc3RhcnQpID8gY3VyciA6IG5leHQ7IC8vIGRlcml2ZSBlbmQgPD0gbGVuZ3RoLTJcbiAgICAgIHJlc3VsdCArPSAnXFxuJyArIGxpbmUuc2xpY2Uoc3RhcnQsIGVuZCk7XG4gICAgICAvLyBza2lwIHRoZSBzcGFjZSB0aGF0IHdhcyBvdXRwdXQgYXMgXFxuXG4gICAgICBzdGFydCA9IGVuZCArIDE7ICAgICAgICAgICAgICAgICAgICAvLyBkZXJpdmUgc3RhcnQgPD0gbGVuZ3RoLTFcbiAgICB9XG4gICAgY3VyciA9IG5leHQ7XG4gIH1cblxuICAvLyBCeSB0aGUgaW52YXJpYW50cywgc3RhcnQgPD0gbGVuZ3RoLTEsIHNvIHRoZXJlIGlzIHNvbWV0aGluZyBsZWZ0IG92ZXIuXG4gIC8vIEl0IGlzIGVpdGhlciB0aGUgd2hvbGUgc3RyaW5nIG9yIGEgcGFydCBzdGFydGluZyBmcm9tIG5vbi13aGl0ZXNwYWNlLlxuICByZXN1bHQgKz0gJ1xcbic7XG4gIC8vIEluc2VydCBhIGJyZWFrIGlmIHRoZSByZW1haW5kZXIgaXMgdG9vIGxvbmcgYW5kIHRoZXJlIGlzIGEgYnJlYWsgYXZhaWxhYmxlLlxuICBpZiAobGluZS5sZW5ndGggLSBzdGFydCA+IHdpZHRoICYmIGN1cnIgPiBzdGFydCkge1xuICAgIHJlc3VsdCArPSBsaW5lLnNsaWNlKHN0YXJ0LCBjdXJyKSArICdcXG4nICsgbGluZS5zbGljZShjdXJyICsgMSk7XG4gIH0gZWxzZSB7XG4gICAgcmVzdWx0ICs9IGxpbmUuc2xpY2Uoc3RhcnQpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdC5zbGljZSgxKTsgLy8gZHJvcCBleHRyYSBcXG4gam9pbmVyXG59XG5cbi8vIEVzY2FwZXMgYSBkb3VibGUtcXVvdGVkIHN0cmluZy5cbmZ1bmN0aW9uIGVzY2FwZVN0cmluZyhzdHJpbmcpIHtcbiAgdmFyIHJlc3VsdCA9ICcnO1xuICB2YXIgY2hhciA9IDA7XG4gIHZhciBlc2NhcGVTZXE7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOyBjaGFyID49IDB4MTAwMDAgPyBpICs9IDIgOiBpKyspIHtcbiAgICBjaGFyID0gY29kZVBvaW50QXQoc3RyaW5nLCBpKTtcbiAgICBlc2NhcGVTZXEgPSBFU0NBUEVfU0VRVUVOQ0VTW2NoYXJdO1xuXG4gICAgaWYgKCFlc2NhcGVTZXEgJiYgaXNQcmludGFibGUoY2hhcikpIHtcbiAgICAgIHJlc3VsdCArPSBzdHJpbmdbaV07XG4gICAgICBpZiAoY2hhciA+PSAweDEwMDAwKSByZXN1bHQgKz0gc3RyaW5nW2kgKyAxXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ICs9IGVzY2FwZVNlcSB8fCBlbmNvZGVIZXgoY2hhcik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG93U2VxdWVuY2Uoc3RhdGUsIGxldmVsLCBvYmplY3QpIHtcbiAgdmFyIF9yZXN1bHQgPSAnJyxcbiAgICAgIF90YWcgICAgPSBzdGF0ZS50YWcsXG4gICAgICBpbmRleCxcbiAgICAgIGxlbmd0aCxcbiAgICAgIHZhbHVlO1xuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBvYmplY3QubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHZhbHVlID0gb2JqZWN0W2luZGV4XTtcblxuICAgIGlmIChzdGF0ZS5yZXBsYWNlcikge1xuICAgICAgdmFsdWUgPSBzdGF0ZS5yZXBsYWNlci5jYWxsKG9iamVjdCwgU3RyaW5nKGluZGV4KSwgdmFsdWUpO1xuICAgIH1cblxuICAgIC8vIFdyaXRlIG9ubHkgdmFsaWQgZWxlbWVudHMsIHB1dCBudWxsIGluc3RlYWQgb2YgaW52YWxpZCBlbGVtZW50cy5cbiAgICBpZiAod3JpdGVOb2RlKHN0YXRlLCBsZXZlbCwgdmFsdWUsIGZhbHNlLCBmYWxzZSkgfHxcbiAgICAgICAgKHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgIHdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwsIG51bGwsIGZhbHNlLCBmYWxzZSkpKSB7XG5cbiAgICAgIGlmIChfcmVzdWx0ICE9PSAnJykgX3Jlc3VsdCArPSAnLCcgKyAoIXN0YXRlLmNvbmRlbnNlRmxvdyA/ICcgJyA6ICcnKTtcbiAgICAgIF9yZXN1bHQgKz0gc3RhdGUuZHVtcDtcbiAgICB9XG4gIH1cblxuICBzdGF0ZS50YWcgPSBfdGFnO1xuICBzdGF0ZS5kdW1wID0gJ1snICsgX3Jlc3VsdCArICddJztcbn1cblxuZnVuY3Rpb24gd3JpdGVCbG9ja1NlcXVlbmNlKHN0YXRlLCBsZXZlbCwgb2JqZWN0LCBjb21wYWN0KSB7XG4gIHZhciBfcmVzdWx0ID0gJycsXG4gICAgICBfdGFnICAgID0gc3RhdGUudGFnLFxuICAgICAgaW5kZXgsXG4gICAgICBsZW5ndGgsXG4gICAgICB2YWx1ZTtcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICB2YWx1ZSA9IG9iamVjdFtpbmRleF07XG5cbiAgICBpZiAoc3RhdGUucmVwbGFjZXIpIHtcbiAgICAgIHZhbHVlID0gc3RhdGUucmVwbGFjZXIuY2FsbChvYmplY3QsIFN0cmluZyhpbmRleCksIHZhbHVlKTtcbiAgICB9XG5cbiAgICAvLyBXcml0ZSBvbmx5IHZhbGlkIGVsZW1lbnRzLCBwdXQgbnVsbCBpbnN0ZWFkIG9mIGludmFsaWQgZWxlbWVudHMuXG4gICAgaWYgKHdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwgKyAxLCB2YWx1ZSwgdHJ1ZSwgdHJ1ZSwgZmFsc2UsIHRydWUpIHx8XG4gICAgICAgICh0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgICB3cml0ZU5vZGUoc3RhdGUsIGxldmVsICsgMSwgbnVsbCwgdHJ1ZSwgdHJ1ZSwgZmFsc2UsIHRydWUpKSkge1xuXG4gICAgICBpZiAoIWNvbXBhY3QgfHwgX3Jlc3VsdCAhPT0gJycpIHtcbiAgICAgICAgX3Jlc3VsdCArPSBnZW5lcmF0ZU5leHRMaW5lKHN0YXRlLCBsZXZlbCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdGF0ZS5kdW1wICYmIENIQVJfTElORV9GRUVEID09PSBzdGF0ZS5kdW1wLmNoYXJDb2RlQXQoMCkpIHtcbiAgICAgICAgX3Jlc3VsdCArPSAnLSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBfcmVzdWx0ICs9ICctICc7XG4gICAgICB9XG5cbiAgICAgIF9yZXN1bHQgKz0gc3RhdGUuZHVtcDtcbiAgICB9XG4gIH1cblxuICBzdGF0ZS50YWcgPSBfdGFnO1xuICBzdGF0ZS5kdW1wID0gX3Jlc3VsdCB8fCAnW10nOyAvLyBFbXB0eSBzZXF1ZW5jZSBpZiBubyB2YWxpZCB2YWx1ZXMuXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvd01hcHBpbmcoc3RhdGUsIGxldmVsLCBvYmplY3QpIHtcbiAgdmFyIF9yZXN1bHQgICAgICAgPSAnJyxcbiAgICAgIF90YWcgICAgICAgICAgPSBzdGF0ZS50YWcsXG4gICAgICBvYmplY3RLZXlMaXN0ID0gT2JqZWN0LmtleXMob2JqZWN0KSxcbiAgICAgIGluZGV4LFxuICAgICAgbGVuZ3RoLFxuICAgICAgb2JqZWN0S2V5LFxuICAgICAgb2JqZWN0VmFsdWUsXG4gICAgICBwYWlyQnVmZmVyO1xuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBvYmplY3RLZXlMaXN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcblxuICAgIHBhaXJCdWZmZXIgPSAnJztcbiAgICBpZiAoX3Jlc3VsdCAhPT0gJycpIHBhaXJCdWZmZXIgKz0gJywgJztcblxuICAgIGlmIChzdGF0ZS5jb25kZW5zZUZsb3cpIHBhaXJCdWZmZXIgKz0gJ1wiJztcblxuICAgIG9iamVjdEtleSA9IG9iamVjdEtleUxpc3RbaW5kZXhdO1xuICAgIG9iamVjdFZhbHVlID0gb2JqZWN0W29iamVjdEtleV07XG5cbiAgICBpZiAoc3RhdGUucmVwbGFjZXIpIHtcbiAgICAgIG9iamVjdFZhbHVlID0gc3RhdGUucmVwbGFjZXIuY2FsbChvYmplY3QsIG9iamVjdEtleSwgb2JqZWN0VmFsdWUpO1xuICAgIH1cblxuICAgIGlmICghd3JpdGVOb2RlKHN0YXRlLCBsZXZlbCwgb2JqZWN0S2V5LCBmYWxzZSwgZmFsc2UpKSB7XG4gICAgICBjb250aW51ZTsgLy8gU2tpcCB0aGlzIHBhaXIgYmVjYXVzZSBvZiBpbnZhbGlkIGtleTtcbiAgICB9XG5cbiAgICBpZiAoc3RhdGUuZHVtcC5sZW5ndGggPiAxMDI0KSBwYWlyQnVmZmVyICs9ICc/ICc7XG5cbiAgICBwYWlyQnVmZmVyICs9IHN0YXRlLmR1bXAgKyAoc3RhdGUuY29uZGVuc2VGbG93ID8gJ1wiJyA6ICcnKSArICc6JyArIChzdGF0ZS5jb25kZW5zZUZsb3cgPyAnJyA6ICcgJyk7XG5cbiAgICBpZiAoIXdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwsIG9iamVjdFZhbHVlLCBmYWxzZSwgZmFsc2UpKSB7XG4gICAgICBjb250aW51ZTsgLy8gU2tpcCB0aGlzIHBhaXIgYmVjYXVzZSBvZiBpbnZhbGlkIHZhbHVlLlxuICAgIH1cblxuICAgIHBhaXJCdWZmZXIgKz0gc3RhdGUuZHVtcDtcblxuICAgIC8vIEJvdGgga2V5IGFuZCB2YWx1ZSBhcmUgdmFsaWQuXG4gICAgX3Jlc3VsdCArPSBwYWlyQnVmZmVyO1xuICB9XG5cbiAgc3RhdGUudGFnID0gX3RhZztcbiAgc3RhdGUuZHVtcCA9ICd7JyArIF9yZXN1bHQgKyAnfSc7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQmxvY2tNYXBwaW5nKHN0YXRlLCBsZXZlbCwgb2JqZWN0LCBjb21wYWN0KSB7XG4gIHZhciBfcmVzdWx0ICAgICAgID0gJycsXG4gICAgICBfdGFnICAgICAgICAgID0gc3RhdGUudGFnLFxuICAgICAgb2JqZWN0S2V5TGlzdCA9IE9iamVjdC5rZXlzKG9iamVjdCksXG4gICAgICBpbmRleCxcbiAgICAgIGxlbmd0aCxcbiAgICAgIG9iamVjdEtleSxcbiAgICAgIG9iamVjdFZhbHVlLFxuICAgICAgZXhwbGljaXRQYWlyLFxuICAgICAgcGFpckJ1ZmZlcjtcblxuICAvLyBBbGxvdyBzb3J0aW5nIGtleXMgc28gdGhhdCB0aGUgb3V0cHV0IGZpbGUgaXMgZGV0ZXJtaW5pc3RpY1xuICBpZiAoc3RhdGUuc29ydEtleXMgPT09IHRydWUpIHtcbiAgICAvLyBEZWZhdWx0IHNvcnRpbmdcbiAgICBvYmplY3RLZXlMaXN0LnNvcnQoKTtcbiAgfSBlbHNlIGlmICh0eXBlb2Ygc3RhdGUuc29ydEtleXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyBDdXN0b20gc29ydCBmdW5jdGlvblxuICAgIG9iamVjdEtleUxpc3Quc29ydChzdGF0ZS5zb3J0S2V5cyk7XG4gIH0gZWxzZSBpZiAoc3RhdGUuc29ydEtleXMpIHtcbiAgICAvLyBTb21ldGhpbmcgaXMgd3JvbmdcbiAgICB0aHJvdyBuZXcgZXhjZXB0aW9uKCdzb3J0S2V5cyBtdXN0IGJlIGEgYm9vbGVhbiBvciBhIGZ1bmN0aW9uJyk7XG4gIH1cblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0S2V5TGlzdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgcGFpckJ1ZmZlciA9ICcnO1xuXG4gICAgaWYgKCFjb21wYWN0IHx8IF9yZXN1bHQgIT09ICcnKSB7XG4gICAgICBwYWlyQnVmZmVyICs9IGdlbmVyYXRlTmV4dExpbmUoc3RhdGUsIGxldmVsKTtcbiAgICB9XG5cbiAgICBvYmplY3RLZXkgPSBvYmplY3RLZXlMaXN0W2luZGV4XTtcbiAgICBvYmplY3RWYWx1ZSA9IG9iamVjdFtvYmplY3RLZXldO1xuXG4gICAgaWYgKHN0YXRlLnJlcGxhY2VyKSB7XG4gICAgICBvYmplY3RWYWx1ZSA9IHN0YXRlLnJlcGxhY2VyLmNhbGwob2JqZWN0LCBvYmplY3RLZXksIG9iamVjdFZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAoIXdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwgKyAxLCBvYmplY3RLZXksIHRydWUsIHRydWUsIHRydWUpKSB7XG4gICAgICBjb250aW51ZTsgLy8gU2tpcCB0aGlzIHBhaXIgYmVjYXVzZSBvZiBpbnZhbGlkIGtleS5cbiAgICB9XG5cbiAgICBleHBsaWNpdFBhaXIgPSAoc3RhdGUudGFnICE9PSBudWxsICYmIHN0YXRlLnRhZyAhPT0gJz8nKSB8fFxuICAgICAgICAgICAgICAgICAgIChzdGF0ZS5kdW1wICYmIHN0YXRlLmR1bXAubGVuZ3RoID4gMTAyNCk7XG5cbiAgICBpZiAoZXhwbGljaXRQYWlyKSB7XG4gICAgICBpZiAoc3RhdGUuZHVtcCAmJiBDSEFSX0xJTkVfRkVFRCA9PT0gc3RhdGUuZHVtcC5jaGFyQ29kZUF0KDApKSB7XG4gICAgICAgIHBhaXJCdWZmZXIgKz0gJz8nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFpckJ1ZmZlciArPSAnPyAnO1xuICAgICAgfVxuICAgIH1cblxuICAgIHBhaXJCdWZmZXIgKz0gc3RhdGUuZHVtcDtcblxuICAgIGlmIChleHBsaWNpdFBhaXIpIHtcbiAgICAgIHBhaXJCdWZmZXIgKz0gZ2VuZXJhdGVOZXh0TGluZShzdGF0ZSwgbGV2ZWwpO1xuICAgIH1cblxuICAgIGlmICghd3JpdGVOb2RlKHN0YXRlLCBsZXZlbCArIDEsIG9iamVjdFZhbHVlLCB0cnVlLCBleHBsaWNpdFBhaXIpKSB7XG4gICAgICBjb250aW51ZTsgLy8gU2tpcCB0aGlzIHBhaXIgYmVjYXVzZSBvZiBpbnZhbGlkIHZhbHVlLlxuICAgIH1cblxuICAgIGlmIChzdGF0ZS5kdW1wICYmIENIQVJfTElORV9GRUVEID09PSBzdGF0ZS5kdW1wLmNoYXJDb2RlQXQoMCkpIHtcbiAgICAgIHBhaXJCdWZmZXIgKz0gJzonO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYWlyQnVmZmVyICs9ICc6ICc7XG4gICAgfVxuXG4gICAgcGFpckJ1ZmZlciArPSBzdGF0ZS5kdW1wO1xuXG4gICAgLy8gQm90aCBrZXkgYW5kIHZhbHVlIGFyZSB2YWxpZC5cbiAgICBfcmVzdWx0ICs9IHBhaXJCdWZmZXI7XG4gIH1cblxuICBzdGF0ZS50YWcgPSBfdGFnO1xuICBzdGF0ZS5kdW1wID0gX3Jlc3VsdCB8fCAne30nOyAvLyBFbXB0eSBtYXBwaW5nIGlmIG5vIHZhbGlkIHBhaXJzLlxufVxuXG5mdW5jdGlvbiBkZXRlY3RUeXBlKHN0YXRlLCBvYmplY3QsIGV4cGxpY2l0KSB7XG4gIHZhciBfcmVzdWx0LCB0eXBlTGlzdCwgaW5kZXgsIGxlbmd0aCwgdHlwZSwgc3R5bGU7XG5cbiAgdHlwZUxpc3QgPSBleHBsaWNpdCA/IHN0YXRlLmV4cGxpY2l0VHlwZXMgOiBzdGF0ZS5pbXBsaWNpdFR5cGVzO1xuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSB0eXBlTGlzdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgdHlwZSA9IHR5cGVMaXN0W2luZGV4XTtcblxuICAgIGlmICgodHlwZS5pbnN0YW5jZU9mICB8fCB0eXBlLnByZWRpY2F0ZSkgJiZcbiAgICAgICAgKCF0eXBlLmluc3RhbmNlT2YgfHwgKCh0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JykgJiYgKG9iamVjdCBpbnN0YW5jZW9mIHR5cGUuaW5zdGFuY2VPZikpKSAmJlxuICAgICAgICAoIXR5cGUucHJlZGljYXRlICB8fCB0eXBlLnByZWRpY2F0ZShvYmplY3QpKSkge1xuXG4gICAgICBpZiAoZXhwbGljaXQpIHtcbiAgICAgICAgaWYgKHR5cGUubXVsdGkgJiYgdHlwZS5yZXByZXNlbnROYW1lKSB7XG4gICAgICAgICAgc3RhdGUudGFnID0gdHlwZS5yZXByZXNlbnROYW1lKG9iamVjdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RhdGUudGFnID0gdHlwZS50YWc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLnRhZyA9ICc/JztcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGUucmVwcmVzZW50KSB7XG4gICAgICAgIHN0eWxlID0gc3RhdGUuc3R5bGVNYXBbdHlwZS50YWddIHx8IHR5cGUuZGVmYXVsdFN0eWxlO1xuXG4gICAgICAgIGlmIChfdG9TdHJpbmcuY2FsbCh0eXBlLnJlcHJlc2VudCkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXScpIHtcbiAgICAgICAgICBfcmVzdWx0ID0gdHlwZS5yZXByZXNlbnQob2JqZWN0LCBzdHlsZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoX2hhc093blByb3BlcnR5LmNhbGwodHlwZS5yZXByZXNlbnQsIHN0eWxlKSkge1xuICAgICAgICAgIF9yZXN1bHQgPSB0eXBlLnJlcHJlc2VudFtzdHlsZV0ob2JqZWN0LCBzdHlsZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IGV4Y2VwdGlvbignITwnICsgdHlwZS50YWcgKyAnPiB0YWcgcmVzb2x2ZXIgYWNjZXB0cyBub3QgXCInICsgc3R5bGUgKyAnXCIgc3R5bGUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLmR1bXAgPSBfcmVzdWx0O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIFNlcmlhbGl6ZXMgYG9iamVjdGAgYW5kIHdyaXRlcyBpdCB0byBnbG9iYWwgYHJlc3VsdGAuXG4vLyBSZXR1cm5zIHRydWUgb24gc3VjY2Vzcywgb3IgZmFsc2Ugb24gaW52YWxpZCBvYmplY3QuXG4vL1xuZnVuY3Rpb24gd3JpdGVOb2RlKHN0YXRlLCBsZXZlbCwgb2JqZWN0LCBibG9jaywgY29tcGFjdCwgaXNrZXksIGlzYmxvY2tzZXEpIHtcbiAgc3RhdGUudGFnID0gbnVsbDtcbiAgc3RhdGUuZHVtcCA9IG9iamVjdDtcblxuICBpZiAoIWRldGVjdFR5cGUoc3RhdGUsIG9iamVjdCwgZmFsc2UpKSB7XG4gICAgZGV0ZWN0VHlwZShzdGF0ZSwgb2JqZWN0LCB0cnVlKTtcbiAgfVxuXG4gIHZhciB0eXBlID0gX3RvU3RyaW5nLmNhbGwoc3RhdGUuZHVtcCk7XG4gIHZhciBpbmJsb2NrID0gYmxvY2s7XG4gIHZhciB0YWdTdHI7XG5cbiAgaWYgKGJsb2NrKSB7XG4gICAgYmxvY2sgPSAoc3RhdGUuZmxvd0xldmVsIDwgMCB8fCBzdGF0ZS5mbG93TGV2ZWwgPiBsZXZlbCk7XG4gIH1cblxuICB2YXIgb2JqZWN0T3JBcnJheSA9IHR5cGUgPT09ICdbb2JqZWN0IE9iamVjdF0nIHx8IHR5cGUgPT09ICdbb2JqZWN0IEFycmF5XScsXG4gICAgICBkdXBsaWNhdGVJbmRleCxcbiAgICAgIGR1cGxpY2F0ZTtcblxuICBpZiAob2JqZWN0T3JBcnJheSkge1xuICAgIGR1cGxpY2F0ZUluZGV4ID0gc3RhdGUuZHVwbGljYXRlcy5pbmRleE9mKG9iamVjdCk7XG4gICAgZHVwbGljYXRlID0gZHVwbGljYXRlSW5kZXggIT09IC0xO1xuICB9XG5cbiAgaWYgKChzdGF0ZS50YWcgIT09IG51bGwgJiYgc3RhdGUudGFnICE9PSAnPycpIHx8IGR1cGxpY2F0ZSB8fCAoc3RhdGUuaW5kZW50ICE9PSAyICYmIGxldmVsID4gMCkpIHtcbiAgICBjb21wYWN0ID0gZmFsc2U7XG4gIH1cblxuICBpZiAoZHVwbGljYXRlICYmIHN0YXRlLnVzZWREdXBsaWNhdGVzW2R1cGxpY2F0ZUluZGV4XSkge1xuICAgIHN0YXRlLmR1bXAgPSAnKnJlZl8nICsgZHVwbGljYXRlSW5kZXg7XG4gIH0gZWxzZSB7XG4gICAgaWYgKG9iamVjdE9yQXJyYXkgJiYgZHVwbGljYXRlICYmICFzdGF0ZS51c2VkRHVwbGljYXRlc1tkdXBsaWNhdGVJbmRleF0pIHtcbiAgICAgIHN0YXRlLnVzZWREdXBsaWNhdGVzW2R1cGxpY2F0ZUluZGV4XSA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0eXBlID09PSAnW29iamVjdCBPYmplY3RdJykge1xuICAgICAgaWYgKGJsb2NrICYmIChPYmplY3Qua2V5cyhzdGF0ZS5kdW1wKS5sZW5ndGggIT09IDApKSB7XG4gICAgICAgIHdyaXRlQmxvY2tNYXBwaW5nKHN0YXRlLCBsZXZlbCwgc3RhdGUuZHVtcCwgY29tcGFjdCk7XG4gICAgICAgIGlmIChkdXBsaWNhdGUpIHtcbiAgICAgICAgICBzdGF0ZS5kdW1wID0gJyZyZWZfJyArIGR1cGxpY2F0ZUluZGV4ICsgc3RhdGUuZHVtcDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd3JpdGVGbG93TWFwcGluZyhzdGF0ZSwgbGV2ZWwsIHN0YXRlLmR1bXApO1xuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgc3RhdGUuZHVtcCA9ICcmcmVmXycgKyBkdXBsaWNhdGVJbmRleCArICcgJyArIHN0YXRlLmR1bXA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgIGlmIChibG9jayAmJiAoc3RhdGUuZHVtcC5sZW5ndGggIT09IDApKSB7XG4gICAgICAgIGlmIChzdGF0ZS5ub0FycmF5SW5kZW50ICYmICFpc2Jsb2Nrc2VxICYmIGxldmVsID4gMCkge1xuICAgICAgICAgIHdyaXRlQmxvY2tTZXF1ZW5jZShzdGF0ZSwgbGV2ZWwgLSAxLCBzdGF0ZS5kdW1wLCBjb21wYWN0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3cml0ZUJsb2NrU2VxdWVuY2Uoc3RhdGUsIGxldmVsLCBzdGF0ZS5kdW1wLCBjb21wYWN0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgc3RhdGUuZHVtcCA9ICcmcmVmXycgKyBkdXBsaWNhdGVJbmRleCArIHN0YXRlLmR1bXA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdyaXRlRmxvd1NlcXVlbmNlKHN0YXRlLCBsZXZlbCwgc3RhdGUuZHVtcCk7XG4gICAgICAgIGlmIChkdXBsaWNhdGUpIHtcbiAgICAgICAgICBzdGF0ZS5kdW1wID0gJyZyZWZfJyArIGR1cGxpY2F0ZUluZGV4ICsgJyAnICsgc3RhdGUuZHVtcDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ1tvYmplY3QgU3RyaW5nXScpIHtcbiAgICAgIGlmIChzdGF0ZS50YWcgIT09ICc/Jykge1xuICAgICAgICB3cml0ZVNjYWxhcihzdGF0ZSwgc3RhdGUuZHVtcCwgbGV2ZWwsIGlza2V5LCBpbmJsb2NrKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdbb2JqZWN0IFVuZGVmaW5lZF0nKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChzdGF0ZS5za2lwSW52YWxpZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgdGhyb3cgbmV3IGV4Y2VwdGlvbigndW5hY2NlcHRhYmxlIGtpbmQgb2YgYW4gb2JqZWN0IHRvIGR1bXAgJyArIHR5cGUpO1xuICAgIH1cblxuICAgIGlmIChzdGF0ZS50YWcgIT09IG51bGwgJiYgc3RhdGUudGFnICE9PSAnPycpIHtcbiAgICAgIC8vIE5lZWQgdG8gZW5jb2RlIGFsbCBjaGFyYWN0ZXJzIGV4Y2VwdCB0aG9zZSBhbGxvd2VkIGJ5IHRoZSBzcGVjOlxuICAgICAgLy9cbiAgICAgIC8vIFszNV0gbnMtZGVjLWRpZ2l0ICAgIDo6PSAgWyN4MzAtI3gzOV0gLyogMC05ICovXG4gICAgICAvLyBbMzZdIG5zLWhleC1kaWdpdCAgICA6Oj0gIG5zLWRlYy1kaWdpdFxuICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgfCBbI3g0MS0jeDQ2XSAvKiBBLUYgKi8gfCBbI3g2MS0jeDY2XSAvKiBhLWYgKi9cbiAgICAgIC8vIFszN10gbnMtYXNjaWktbGV0dGVyIDo6PSAgWyN4NDEtI3g1QV0gLyogQS1aICovIHwgWyN4NjEtI3g3QV0gLyogYS16ICovXG4gICAgICAvLyBbMzhdIG5zLXdvcmQtY2hhciAgICA6Oj0gIG5zLWRlYy1kaWdpdCB8IG5zLWFzY2lpLWxldHRlciB8IFx1MjAxQy1cdTIwMURcbiAgICAgIC8vIFszOV0gbnMtdXJpLWNoYXIgICAgIDo6PSAgXHUyMDFDJVx1MjAxRCBucy1oZXgtZGlnaXQgbnMtaGV4LWRpZ2l0IHwgbnMtd29yZC1jaGFyIHwgXHUyMDFDI1x1MjAxRFxuICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgfCBcdTIwMUM7XHUyMDFEIHwgXHUyMDFDL1x1MjAxRCB8IFx1MjAxQz9cdTIwMUQgfCBcdTIwMUM6XHUyMDFEIHwgXHUyMDFDQFx1MjAxRCB8IFx1MjAxQyZcdTIwMUQgfCBcdTIwMUM9XHUyMDFEIHwgXHUyMDFDK1x1MjAxRCB8IFx1MjAxQyRcdTIwMUQgfCBcdTIwMUMsXHUyMDFEXG4gICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICB8IFx1MjAxQ19cdTIwMUQgfCBcdTIwMUMuXHUyMDFEIHwgXHUyMDFDIVx1MjAxRCB8IFx1MjAxQ35cdTIwMUQgfCBcdTIwMUMqXHUyMDFEIHwgXHUyMDFDJ1x1MjAxRCB8IFx1MjAxQyhcdTIwMUQgfCBcdTIwMUMpXHUyMDFEIHwgXHUyMDFDW1x1MjAxRCB8IFx1MjAxQ11cdTIwMURcbiAgICAgIC8vXG4gICAgICAvLyBBbHNvIG5lZWQgdG8gZW5jb2RlICchJyBiZWNhdXNlIGl0IGhhcyBzcGVjaWFsIG1lYW5pbmcgKGVuZCBvZiB0YWcgcHJlZml4KS5cbiAgICAgIC8vXG4gICAgICB0YWdTdHIgPSBlbmNvZGVVUkkoXG4gICAgICAgIHN0YXRlLnRhZ1swXSA9PT0gJyEnID8gc3RhdGUudGFnLnNsaWNlKDEpIDogc3RhdGUudGFnXG4gICAgICApLnJlcGxhY2UoLyEvZywgJyUyMScpO1xuXG4gICAgICBpZiAoc3RhdGUudGFnWzBdID09PSAnIScpIHtcbiAgICAgICAgdGFnU3RyID0gJyEnICsgdGFnU3RyO1xuICAgICAgfSBlbHNlIGlmICh0YWdTdHIuc2xpY2UoMCwgMTgpID09PSAndGFnOnlhbWwub3JnLDIwMDI6Jykge1xuICAgICAgICB0YWdTdHIgPSAnISEnICsgdGFnU3RyLnNsaWNlKDE4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhZ1N0ciA9ICchPCcgKyB0YWdTdHIgKyAnPic7XG4gICAgICB9XG5cbiAgICAgIHN0YXRlLmR1bXAgPSB0YWdTdHIgKyAnICcgKyBzdGF0ZS5kdW1wO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBnZXREdXBsaWNhdGVSZWZlcmVuY2VzKG9iamVjdCwgc3RhdGUpIHtcbiAgdmFyIG9iamVjdHMgPSBbXSxcbiAgICAgIGR1cGxpY2F0ZXNJbmRleGVzID0gW10sXG4gICAgICBpbmRleCxcbiAgICAgIGxlbmd0aDtcblxuICBpbnNwZWN0Tm9kZShvYmplY3QsIG9iamVjdHMsIGR1cGxpY2F0ZXNJbmRleGVzKTtcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gZHVwbGljYXRlc0luZGV4ZXMubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHN0YXRlLmR1cGxpY2F0ZXMucHVzaChvYmplY3RzW2R1cGxpY2F0ZXNJbmRleGVzW2luZGV4XV0pO1xuICB9XG4gIHN0YXRlLnVzZWREdXBsaWNhdGVzID0gbmV3IEFycmF5KGxlbmd0aCk7XG59XG5cbmZ1bmN0aW9uIGluc3BlY3ROb2RlKG9iamVjdCwgb2JqZWN0cywgZHVwbGljYXRlc0luZGV4ZXMpIHtcbiAgdmFyIG9iamVjdEtleUxpc3QsXG4gICAgICBpbmRleCxcbiAgICAgIGxlbmd0aDtcblxuICBpZiAob2JqZWN0ICE9PSBudWxsICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnKSB7XG4gICAgaW5kZXggPSBvYmplY3RzLmluZGV4T2Yob2JqZWN0KTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICBpZiAoZHVwbGljYXRlc0luZGV4ZXMuaW5kZXhPZihpbmRleCkgPT09IC0xKSB7XG4gICAgICAgIGR1cGxpY2F0ZXNJbmRleGVzLnB1c2goaW5kZXgpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvYmplY3RzLnB1c2gob2JqZWN0KTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0KSkge1xuICAgICAgICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICAgICAgICBpbnNwZWN0Tm9kZShvYmplY3RbaW5kZXhdLCBvYmplY3RzLCBkdXBsaWNhdGVzSW5kZXhlcyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9iamVjdEtleUxpc3QgPSBPYmplY3Qua2V5cyhvYmplY3QpO1xuXG4gICAgICAgIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBvYmplY3RLZXlMaXN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICAgICAgICBpbnNwZWN0Tm9kZShvYmplY3Rbb2JqZWN0S2V5TGlzdFtpbmRleF1dLCBvYmplY3RzLCBkdXBsaWNhdGVzSW5kZXhlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZHVtcCQxKGlucHV0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHZhciBzdGF0ZSA9IG5ldyBTdGF0ZShvcHRpb25zKTtcblxuICBpZiAoIXN0YXRlLm5vUmVmcykgZ2V0RHVwbGljYXRlUmVmZXJlbmNlcyhpbnB1dCwgc3RhdGUpO1xuXG4gIHZhciB2YWx1ZSA9IGlucHV0O1xuXG4gIGlmIChzdGF0ZS5yZXBsYWNlcikge1xuICAgIHZhbHVlID0gc3RhdGUucmVwbGFjZXIuY2FsbCh7ICcnOiB2YWx1ZSB9LCAnJywgdmFsdWUpO1xuICB9XG5cbiAgaWYgKHdyaXRlTm9kZShzdGF0ZSwgMCwgdmFsdWUsIHRydWUsIHRydWUpKSByZXR1cm4gc3RhdGUuZHVtcCArICdcXG4nO1xuXG4gIHJldHVybiAnJztcbn1cblxudmFyIGR1bXBfMSA9IGR1bXAkMTtcblxudmFyIGR1bXBlciA9IHtcblx0ZHVtcDogZHVtcF8xXG59O1xuXG5mdW5jdGlvbiByZW5hbWVkKGZyb20sIHRvKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGdW5jdGlvbiB5YW1sLicgKyBmcm9tICsgJyBpcyByZW1vdmVkIGluIGpzLXlhbWwgNC4gJyArXG4gICAgICAnVXNlIHlhbWwuJyArIHRvICsgJyBpbnN0ZWFkLCB3aGljaCBpcyBub3cgc2FmZSBieSBkZWZhdWx0LicpO1xuICB9O1xufVxuXG5cbnZhciBUeXBlICAgICAgICAgICAgICAgID0gdHlwZTtcbnZhciBTY2hlbWEgICAgICAgICAgICAgID0gc2NoZW1hO1xudmFyIEZBSUxTQUZFX1NDSEVNQSAgICAgPSBmYWlsc2FmZTtcbnZhciBKU09OX1NDSEVNQSAgICAgICAgID0ganNvbjtcbnZhciBDT1JFX1NDSEVNQSAgICAgICAgID0gY29yZTtcbnZhciBERUZBVUxUX1NDSEVNQSAgICAgID0gX2RlZmF1bHQ7XG52YXIgbG9hZCAgICAgICAgICAgICAgICA9IGxvYWRlci5sb2FkO1xudmFyIGxvYWRBbGwgICAgICAgICAgICAgPSBsb2FkZXIubG9hZEFsbDtcbnZhciBkdW1wICAgICAgICAgICAgICAgID0gZHVtcGVyLmR1bXA7XG52YXIgWUFNTEV4Y2VwdGlvbiAgICAgICA9IGV4Y2VwdGlvbjtcblxuLy8gUmUtZXhwb3J0IGFsbCB0eXBlcyBpbiBjYXNlIHVzZXIgd2FudHMgdG8gY3JlYXRlIGN1c3RvbSBzY2hlbWFcbnZhciB0eXBlcyA9IHtcbiAgYmluYXJ5OiAgICBiaW5hcnksXG4gIGZsb2F0OiAgICAgZmxvYXQsXG4gIG1hcDogICAgICAgbWFwLFxuICBudWxsOiAgICAgIF9udWxsLFxuICBwYWlyczogICAgIHBhaXJzLFxuICBzZXQ6ICAgICAgIHNldCxcbiAgdGltZXN0YW1wOiB0aW1lc3RhbXAsXG4gIGJvb2w6ICAgICAgYm9vbCxcbiAgaW50OiAgICAgICBpbnQsXG4gIG1lcmdlOiAgICAgbWVyZ2UsXG4gIG9tYXA6ICAgICAgb21hcCxcbiAgc2VxOiAgICAgICBzZXEsXG4gIHN0cjogICAgICAgc3RyXG59O1xuXG4vLyBSZW1vdmVkIGZ1bmN0aW9ucyBmcm9tIEpTLVlBTUwgMy4wLnhcbnZhciBzYWZlTG9hZCAgICAgICAgICAgID0gcmVuYW1lZCgnc2FmZUxvYWQnLCAnbG9hZCcpO1xudmFyIHNhZmVMb2FkQWxsICAgICAgICAgPSByZW5hbWVkKCdzYWZlTG9hZEFsbCcsICdsb2FkQWxsJyk7XG52YXIgc2FmZUR1bXAgICAgICAgICAgICA9IHJlbmFtZWQoJ3NhZmVEdW1wJywgJ2R1bXAnKTtcblxudmFyIGpzWWFtbCA9IHtcblx0VHlwZTogVHlwZSxcblx0U2NoZW1hOiBTY2hlbWEsXG5cdEZBSUxTQUZFX1NDSEVNQTogRkFJTFNBRkVfU0NIRU1BLFxuXHRKU09OX1NDSEVNQTogSlNPTl9TQ0hFTUEsXG5cdENPUkVfU0NIRU1BOiBDT1JFX1NDSEVNQSxcblx0REVGQVVMVF9TQ0hFTUE6IERFRkFVTFRfU0NIRU1BLFxuXHRsb2FkOiBsb2FkLFxuXHRsb2FkQWxsOiBsb2FkQWxsLFxuXHRkdW1wOiBkdW1wLFxuXHRZQU1MRXhjZXB0aW9uOiBZQU1MRXhjZXB0aW9uLFxuXHR0eXBlczogdHlwZXMsXG5cdHNhZmVMb2FkOiBzYWZlTG9hZCxcblx0c2FmZUxvYWRBbGw6IHNhZmVMb2FkQWxsLFxuXHRzYWZlRHVtcDogc2FmZUR1bXBcbn07XG5cbmV4cG9ydCB7IENPUkVfU0NIRU1BLCBERUZBVUxUX1NDSEVNQSwgRkFJTFNBRkVfU0NIRU1BLCBKU09OX1NDSEVNQSwgU2NoZW1hLCBUeXBlLCBZQU1MRXhjZXB0aW9uLCBqc1lhbWwgYXMgZGVmYXVsdCwgZHVtcCwgbG9hZCwgbG9hZEFsbCwgc2FmZUR1bXAsIHNhZmVMb2FkLCBzYWZlTG9hZEFsbCwgdHlwZXMgfTtcbiIsICIvKipcbiAqIE5vZGUuanMtc3BlY2lmaWMgdmFsaWRhdGlvbiBoZWxwZXJzLlxuICpcbiAqIEBtb2R1bGUgbm9kZVxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0ICogYXMgZnNQcm9taXNlcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7XG4gIHZhbGlkYXRlSXNzdWVSZXBvSW50ZWdyaXR5IGFzIGNvcmVWYWxpZGF0ZUlzc3VlUmVwb0ludGVncml0eSxcbiAgdmFsaWRhdGVJc3N1ZVJlcG9JbnRlZ3JpdHlBc3luYyBhcyBjb3JlVmFsaWRhdGVJc3N1ZVJlcG9JbnRlZ3JpdHlBc3luY1xufSBmcm9tICcuL2ludGVncml0eS5qcyc7XG5pbXBvcnQgdHlwZSB7IFZhbGlkYXRpb25SZXN1bHQgfSBmcm9tICcuL3R5cGVzLmpzJztcblxuLyoqXG4gKiBJbnRlcmZhY2UgZm9yIE5vZGUuanMgdmFsaWRhdGlvbiBoZWxwZXJzIHRoYXQgdXNlIHJlYWwgZmlsZXN5c3RlbSBhY2Nlc3MuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTm9kZVZhbGlkYXRvciB7XG4gIC8qKlxuICAgKiBWYWxpZGF0ZXMgdGhlIGludGVncml0eSBvZiBhbiBpc3N1ZSByZXBvc2l0b3J5IHVzaW5nIHJlYWwgZmlsZXN5c3RlbSBjaGVja3MuXG4gICAqXG4gICAqIEBwYXJhbSByZXBvUGF0aCAtIFBhdGggdG8gdGhlIGlzc3VlIHJlcG9zaXRvcnlcbiAgICogQHJldHVybnMgVmFsaWRhdGlvblJlc3VsdCBpbmRpY2F0aW5nIHN1Y2Nlc3Mgb3IgZmFpbHVyZSB3aXRoIGVycm9yc1xuICAgKi9cbiAgdmFsaWRhdGVJc3N1ZVJlcG9JbnRlZ3JpdHkocmVwb1BhdGg6IHN0cmluZyk6IFZhbGlkYXRpb25SZXN1bHQ7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIE5vZGVWYWxpZGF0b3IgdGhhdCBiaW5kcyBmcy5leGlzdHNTeW5jIGFuZCBmcy5yZWFkRmlsZVN5bmMgYXV0b21hdGljYWxseS5cbiAqXG4gKiBUaGlzIGhlbHBlciBwcm92aWRlcyBhIGNvbnZlbmllbnQgd3JhcHBlciBmb3IgTm9kZS5qcyBlbnZpcm9ubWVudHNcbiAqIHdoZXJlIGZpbGVzeXN0ZW0gYWNjZXNzIGlzIGF2YWlsYWJsZS5cbiAqXG4gKiBAcmV0dXJucyBBIE5vZGVWYWxpZGF0b3IgaW5zdGFuY2Ugd2l0aCBmaWxlc3lzdGVtIGJpbmRpbmdzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVOb2RlVmFsaWRhdG9yKCk6IE5vZGVWYWxpZGF0b3Ige1xuICByZXR1cm4ge1xuICAgIHZhbGlkYXRlSXNzdWVSZXBvSW50ZWdyaXR5KHJlcG9QYXRoOiBzdHJpbmcpOiBWYWxpZGF0aW9uUmVzdWx0IHtcbiAgICAgIHJldHVybiBjb3JlVmFsaWRhdGVJc3N1ZVJlcG9JbnRlZ3JpdHkocmVwb1BhdGgsIGZzLmV4aXN0c1N5bmMsIChmaWxlUGF0aDogc3RyaW5nKSA9PlxuICAgICAgICBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGYtOCcpXG4gICAgICApO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBJbnRlcmZhY2UgZm9yIGFzeW5jIE5vZGUuanMgdmFsaWRhdGlvbiBoZWxwZXJzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFzeW5jTm9kZVZhbGlkYXRvciB7XG4gIC8qKlxuICAgKiBWYWxpZGF0ZXMgdGhlIGludGVncml0eSBvZiBhbiBpc3N1ZSByZXBvc2l0b3J5IHVzaW5nIGFzeW5jIGZpbGVzeXN0ZW0gY2hlY2tzLlxuICAgKlxuICAgKiBAcGFyYW0gcmVwb1BhdGggLSBQYXRoIHRvIHRoZSBpc3N1ZSByZXBvc2l0b3J5XG4gICAqIEByZXR1cm5zIFByb21pc2U8VmFsaWRhdGlvblJlc3VsdD4gaW5kaWNhdGluZyBzdWNjZXNzIG9yIGZhaWx1cmUgd2l0aCBlcnJvcnNcbiAgICovXG4gIHZhbGlkYXRlSXNzdWVSZXBvSW50ZWdyaXR5QXN5bmMocmVwb1BhdGg6IHN0cmluZyk6IFByb21pc2U8VmFsaWRhdGlvblJlc3VsdD47XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBBc3luY05vZGVWYWxpZGF0b3IgdGhhdCBiaW5kcyBmcy5wcm9taXNlcyBhdXRvbWF0aWNhbGx5LlxuICpcbiAqIFRoaXMgaGVscGVyIHByb3ZpZGVzIGEgY29udmVuaWVudCB3cmFwcGVyIGZvciBOb2RlLmpzIGVudmlyb25tZW50c1xuICogd2hlcmUgYXN5bmMgZmlsZXN5c3RlbSBhY2Nlc3MgaXMgYXZhaWxhYmxlLlxuICpcbiAqIEByZXR1cm5zIEFuIEFzeW5jTm9kZVZhbGlkYXRvciBpbnN0YW5jZSB3aXRoIGFzeW5jIGZpbGVzeXN0ZW0gYmluZGluZ3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUFzeW5jTm9kZVZhbGlkYXRvcigpOiBBc3luY05vZGVWYWxpZGF0b3Ige1xuICByZXR1cm4ge1xuICAgIGFzeW5jIHZhbGlkYXRlSXNzdWVSZXBvSW50ZWdyaXR5QXN5bmMocmVwb1BhdGg6IHN0cmluZyk6IFByb21pc2U8VmFsaWRhdGlvblJlc3VsdD4ge1xuICAgICAgcmV0dXJuIGNvcmVWYWxpZGF0ZUlzc3VlUmVwb0ludGVncml0eUFzeW5jKFxuICAgICAgICByZXBvUGF0aCxcbiAgICAgICAgYXN5bmMgKHBhdGgpID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgZnNQcm9taXNlcy5hY2Nlc3MocGF0aCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIChwYXRoKSA9PiBmc1Byb21pc2VzLnJlYWRGaWxlKHBhdGgsICd1dGYtOCcpXG4gICAgICApO1xuICAgIH1cbiAgfTtcbn1cbiIsICJwcm9jZXNzLmVudlsnQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFJ10gPSBcIi90bXAvaG9va3MtdjIubG9nXCI7XG5cbmltcG9ydCBob29rIGZyb20gJy93b3Jrc3BhY2UvLndvcmt0cmVlcy9pc3N1ZXMtdjItZGV0YWlsLXdlYnZpZXcvcGFja2FnZXMvaXNzdWVzL2NsYXVkZS1jb2RlLWNsaS1ob29rcy9zcmMvcG9zdC10b29sLXVzZS1lZGl0LnRzJztcbmltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICcvd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWRldGFpbC13ZWJ2aWV3L3BhY2thZ2VzL2lzc3Vlcy9jbGF1ZGUtY29kZS1jbGktaG9va3Mvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L3J1bnRpbWUuanMnO1xuXG5leGVjdXRlKGhvb2spO1xuIl0sCiAgIm1h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LFNBQVMsYUFBYSxJQUFJO0FBQ2hDLFVBQUksQ0FBQyxPQUFPLE9BQU87QUFDakIsZUFBTyxrQkFBa0I7QUFBQSxVQUN2QixlQUFlLDJCQUEyQixPQUFPLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxJQUFJLENBQUM7QUFBQSxRQUMxRixDQUFDO0FBQUEsTUFDSDtBQUFBLElBQ0Y7QUFFQSxXQUFPLGtCQUFrQjtBQUFBLE1BQ3ZCLGVBQWUsY0FBYyxRQUFRO0FBQUEsSUFDdkMsQ0FBQztBQUFBLEVBQ0gsU0FBUyxPQUFPO0FBRWQsUUFBSSxpQkFBaUIsYUFBYTtBQUNoQyxhQUFPLGtCQUFrQjtBQUFBLFFBQ3ZCLGVBQWUsOEJBQThCLE1BQU0sT0FBTztBQUFBLE1BQzVELENBQUM7QUFBQSxJQUNIO0FBQ0EsSUFBQUQsUUFBTyxLQUFLLG9CQUFvQixFQUFFLE9BQU8sT0FBTyxLQUFLLEVBQUUsQ0FBQztBQUN4RCxXQUFPLGtCQUFrQixDQUFDLENBQUM7QUFBQSxFQUM3QjtBQUNGLENBQUM7OztBVXpDRCxRQUFRLElBQUksZ0NBQWdDLElBQUk7QUFLaEQsUUFBUSwwQkFBSTsiLAogICJuYW1lcyI6IFsicmVhZEZpbGUiLCAic2NoZW1hIiwgImlzT2JqZWN0IiwgImV4Y2VwdGlvbiIsICJtYXAiLCAic2NoZW1hIiwgInR5cGUiLCAiZXh0ZW5kIiwgInN0ciIsICJzdHJpbmciLCAiZnMiLCAibG9nZ2VyIiwgInJlYWRGaWxlIl0KfQo=
