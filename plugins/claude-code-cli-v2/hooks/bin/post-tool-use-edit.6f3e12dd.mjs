#!/usr/bin/env -S node --enable-source-maps
// src/post-tool-use-edit.ts
import { readFile as readFile2 } from "node:fs/promises";

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
function postToolUseHook(config, handler) {
  return createHookFunction("PostToolUse", config, handler);
}

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/logger.js
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
var postToolUseOutput = /* @__PURE__ */ createHookSpecificOutputBuilder("PostToolUse");

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

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/tool-helpers.js
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

// ../../../../../../tmp/claude-code-hooks-build/0e45e61374c10ff3/wrapper.ts
process.env["CLAUDE_CODE_HOOKS_CLI_LOG_FILE"] = "/tmp/hooks-v2.log";
execute(post_tool_use_edit_default);
/*! Bundled license information:

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 4.1.1 https://github.com/nodeca/js-yaml @license MIT *)
*/
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWxpc3Qtd2Vidmlldy9wYWNrYWdlcy9pc3N1ZXMvY2xhdWRlLWNvZGUtY2xpLWhvb2tzL3NyYy9wb3N0LXRvb2wtdXNlLWVkaXQudHMiLCAiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWxpc3Qtd2Vidmlldy9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvZW52LmpzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL2lzc3Vlcy12Mi1saXN0LXdlYnZpZXcvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2hvb2tzLmpzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL2lzc3Vlcy12Mi1saXN0LXdlYnZpZXcvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2xvZ2dlci5qcyIsICIuLi8uLi8uLi93b3Jrc3BhY2UvLndvcmt0cmVlcy9pc3N1ZXMtdjItbGlzdC13ZWJ2aWV3L25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9vdXRwdXRzLmpzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL2lzc3Vlcy12Mi1saXN0LXdlYnZpZXcvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L3J1bnRpbWUuanMiLCAiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWxpc3Qtd2Vidmlldy9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvdG9vbC1oZWxwZXJzLmpzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL2lzc3Vlcy12Mi1saXN0LXdlYnZpZXcvcGFja2FnZXMvaXNzdWVzL3ZhbGlkYXRvci9zcmMvY2FyZC50cyIsICIuLi8uLi8uLi93b3Jrc3BhY2UvLndvcmt0cmVlcy9pc3N1ZXMtdjItbGlzdC13ZWJ2aWV3L25vZGVfbW9kdWxlcy9qcy15YW1sL2Rpc3QvanMteWFtbC5tanMiLCAiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWxpc3Qtd2Vidmlldy9wYWNrYWdlcy9pc3N1ZXMvdmFsaWRhdG9yL3NyYy9ub2RlLnRzIiwgIndyYXBwZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IHJlYWRGaWxlIH0gZnJvbSAnbm9kZTpmcy9wcm9taXNlcyc7XG5pbXBvcnQgeyBnZXRGaWxlUGF0aCwgcG9zdFRvb2xVc2VIb29rLCBwb3N0VG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG5pbXBvcnQgeyB2YWxpZGF0ZUNhcmQgfSBmcm9tICdAZ29vZGZvb3QvaXNzdWVzLXZhbGlkYXRvcic7XG5cbmV4cG9ydCBkZWZhdWx0IHBvc3RUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdXcml0ZXxFZGl0fE11bHRpRWRpdCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gIGNvbnN0IGZpbGVQYXRoID0gZ2V0RmlsZVBhdGgoaW5wdXQpO1xuICBpZiAoIWZpbGVQYXRoKSByZXR1cm4gcG9zdFRvb2xVc2VPdXRwdXQoe30pO1xuXG4gIC8vIE9ubHkgdmFsaWRhdGUgaXNzdWUtcmVsYXRlZCBmaWxlc1xuICBjb25zdCBpc0NhcmRGaWxlID0gZmlsZVBhdGguaW5jbHVkZXMoJy9jYXJkcy8nKSAmJiBmaWxlUGF0aC5lbmRzV2l0aCgnLmpzb24nKTtcblxuICBpZiAoIWlzQ2FyZEZpbGUpIHtcbiAgICByZXR1cm4gcG9zdFRvb2xVc2VPdXRwdXQoe30pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgcmVhZEZpbGUoZmlsZVBhdGgsICd1dGYtOCcpO1xuXG4gICAgaWYgKGlzQ2FyZEZpbGUpIHtcbiAgICAgIGNvbnN0IGNhcmQgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVDYXJkKGNhcmQpO1xuICAgICAgaWYgKCFyZXN1bHQudmFsaWQpIHtcbiAgICAgICAgcmV0dXJuIHBvc3RUb29sVXNlT3V0cHV0KHtcbiAgICAgICAgICBzeXN0ZW1NZXNzYWdlOiBgQ2FyZCB2YWxpZGF0aW9uIGZhaWxlZDogJHtyZXN1bHQuZXJyb3JzLm1hcCgoZSkgPT4gZS5tZXNzYWdlKS5qb2luKCcsICcpfWBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHBvc3RUb29sVXNlT3V0cHV0KHtcbiAgICAgIHN5c3RlbU1lc3NhZ2U6IGBWYWxpZGF0ZWQ6ICR7ZmlsZVBhdGh9YFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIC8vIEhhbmRsZSBKU09OIHBhcnNlIGVycm9ycyBleHBsaWNpdGx5IGZvciBjYXJkIGZpbGVzXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpIHtcbiAgICAgIHJldHVybiBwb3N0VG9vbFVzZU91dHB1dCh7XG4gICAgICAgIHN5c3RlbU1lc3NhZ2U6IGBJbnZhbGlkIEpTT04gaW4gY2FyZCBmaWxlOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgfSk7XG4gICAgfVxuICAgIGxvZ2dlci53YXJuKCdWYWxpZGF0aW9uIGVycm9yJywgeyBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgICByZXR1cm4gcG9zdFRvb2xVc2VPdXRwdXQoe30pO1xuICB9XG59KTtcbiIsICIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZWQgYWNjZXNzIHRvIENsYXVkZSBDb2RlJ3MgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCB1dGlsaXRpZXNcbiAqIGZvciBwZXJzaXN0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcyBpbiBTZXNzaW9uU3RhcnQgaG9va3MuXG4gKlxuICogIyMgRW52aXJvbm1lbnQgVmFyaWFibGVzXG4gKlxuICogQ2xhdWRlIENvZGUgc2V0cyB0aGVzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgd2hlbiBydW5uaW5nIGhvb2tzOlxuICpcbiAqIHwgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8IEF2YWlsYWJsZSBJbiB8XG4gKiB8LS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tfFxuICogfCBgQ0xBVURFX1BST0pFQ1RfRElSYCB8IEFic29sdXRlIHBhdGggdG8gcHJvamVjdCByb290IHwgQWxsIGhvb2tzIHxcbiAqIHwgYENMQVVERV9FTlZfRklMRWAgfCBQYXRoIHRvIGZpbGUgZm9yIHBlcnNpc3RpbmcgZW52IHZhcnMgfCBTZXNzaW9uU3RhcnQgb25seSB8XG4gKiB8IGBDTEFVREVfQ09ERV9SRU1PVEVgIHwgYFwidHJ1ZVwiYCBpZiBydW5uaW5nIHJlbW90ZWx5IHwgQWxsIGhvb2tzIHxcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBnZXRQcm9qZWN0RGlyLCBwZXJzaXN0RW52VmFyLCBpc1JlbW90ZUVudmlyb25tZW50IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBHZXQgcHJvamVjdCBkaXJlY3RvcnlcbiAqIGNvbnN0IHByb2plY3REaXIgPSBnZXRQcm9qZWN0RGlyKCk7XG4gKlxuICogLy8gQ2hlY2sgaWYgcnVubmluZyByZW1vdGVseVxuICogaWYgKGlzUmVtb3RlRW52aXJvbm1lbnQoKSkge1xuICogICAvLyBIYW5kbGUgcmVtb3RlLXNwZWNpZmljIGxvZ2ljXG4gKiB9XG4gKlxuICogLy8gSW4gU2Vzc2lvblN0YXJ0IGhvb2s6IHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdwcm9kdWN0aW9uJyk7XG4gKiBwZXJzaXN0RW52VmFyKCdBUElfS0VZJywgJ3NlY3JldC1rZXknKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stZXhlY3V0aW9uLWRldGFpbHNcbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcIm5vZGU6ZnNcIjtcbi8qKlxuICogQ2xhdWRlIENvZGUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMuXG4gKlxuICogVGhlc2UgYXJlIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgdGhhdCBDbGF1ZGUgQ29kZSBzZXRzIHdoZW4gcnVubmluZyBob29rcy5cbiAqL1xuZXhwb3J0IGNvbnN0IENMQVVERV9FTlZfVkFSUyA9IHtcbiAgICAvKipcbiAgICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBwcm9qZWN0IHJvb3QgZGlyZWN0b3J5IHdoZXJlIENsYXVkZSBDb2RlIHdhcyBzdGFydGVkLlxuICAgICAqIEF2YWlsYWJsZSBpbiBhbGwgaG9va3MuXG4gICAgICovXG4gICAgUFJPSkVDVF9ESVI6IFwiQ0xBVURFX1BST0pFQ1RfRElSXCIsXG4gICAgLyoqXG4gICAgICogUGF0aCB0byBhIGZpbGUgd2hlcmUgU2Vzc2lvblN0YXJ0IGhvb2tzIGNhbiBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAgICAgKiBWYXJpYWJsZXMgd3JpdHRlbiB0byB0aGlzIGZpbGUgd2lsbCBiZSBhdmFpbGFibGUgaW4gYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcy5cbiAgICAgKiBPbmx5IGF2YWlsYWJsZSBpbiBTZXNzaW9uU3RhcnQgaG9va3MuXG4gICAgICovXG4gICAgRU5WX0ZJTEU6IFwiQ0xBVURFX0VOVl9GSUxFXCIsXG4gICAgLyoqXG4gICAgICogU2V0IHRvIFwidHJ1ZVwiIHdoZW4gcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAgICAgKiBOb3Qgc2V0IG9yIGVtcHR5IHdoZW4gcnVubmluZyBpbiBsb2NhbCBDTEkgZW52aXJvbm1lbnQuXG4gICAgICovXG4gICAgUkVNT1RFOiBcIkNMQVVERV9DT0RFX1JFTU9URVwiLFxufTtcbi8qKlxuICogR2V0cyB0aGUgQ2xhdWRlIENvZGUgcHJvamVjdCBkaXJlY3RvcnkuXG4gKlxuICogVGhpcyBpcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcHJvamVjdCByb290IHdoZXJlIENsYXVkZSBDb2RlIHdhcyBzdGFydGVkLlxuICogVGhlIHZhbHVlIGNvbWVzIGZyb20gdGhlIGBDTEFVREVfUFJPSkVDVF9ESVJgIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICogQHJldHVybnMgVGhlIHByb2plY3QgZGlyZWN0b3J5IHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqIGlmIChwcm9qZWN0RGlyKSB7XG4gKiAgIGNvbnN0IGNvbmZpZ1BhdGggPSBgJHtwcm9qZWN0RGlyfS8uY2xhdWRlL2NvbmZpZy5qc29uYDtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdERpcigpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLlBST0pFQ1RfRElSXTtcbn1cbi8qKlxuICogR2V0cyB0aGUgQ2xhdWRlIENvZGUgZW52IGZpbGUgcGF0aCBmb3IgcGVyc2lzdGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogVGhpcyBpcyBvbmx5IGF2YWlsYWJsZSBpbiBTZXNzaW9uU3RhcnQgaG9va3MuIFRoZSBwYXRoIHBvaW50cyB0byBhIGZpbGVcbiAqIHdoZXJlIHlvdSBjYW4gd3JpdGUgc2hlbGwgZXhwb3J0IHN0YXRlbWVudHMgdG8gcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIGZvciBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzIGluIHRoZSBzZXNzaW9uLlxuICogQHJldHVybnMgVGhlIGVudiBmaWxlIHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0IChub3QgYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZGaWxlID0gZ2V0RW52RmlsZVBhdGgoKTtcbiAqIGlmIChlbnZGaWxlKSB7XG4gKiAgIC8vIFdlJ3JlIGluIGEgU2Vzc2lvblN0YXJ0IGhvb2sgYW5kIGNhbiBwZXJzaXN0IGVudiB2YXJzXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ01ZX1ZBUicsICdteS12YWx1ZScpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZGaWxlUGF0aCgpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLkVOVl9GSUxFXTtcbn1cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBob29rIGlzIHJ1bm5pbmcgaW4gYSByZW1vdGUgKHdlYikgZW52aXJvbm1lbnQuXG4gKlxuICogUmVtb3RlIGVudmlyb25tZW50cyBtYXkgaGF2ZSBkaWZmZXJlbnQgY2FwYWJpbGl0aWVzIG9yIHJlc3RyaWN0aW9uc1xuICogY29tcGFyZWQgdG8gbG9jYWwgQ0xJIGVudmlyb25tZW50cy5cbiAqIEByZXR1cm5zIHRydWUgaWYgcnVubmluZyByZW1vdGVseSwgZmFsc2UgaWYgcnVubmluZyBsb2NhbGx5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzUmVtb3RlRW52aXJvbm1lbnQoKSkge1xuICogICAvLyBVc2Ugd2ViLWNvbXBhdGlibGUgYXBwcm9hY2hlc1xuICogfSBlbHNlIHtcbiAqICAgLy8gQ2FuIHVzZSBsb2NhbCBDTEkgZmVhdHVyZXNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNSZW1vdGVFbnZpcm9ubWVudCgpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLlJFTU9URV0gPT09IFwidHJ1ZVwiO1xufVxuLyoqXG4gKiBQZXJzaXN0cyBhbiBlbnZpcm9ubWVudCB2YXJpYWJsZSBmb3IgdXNlIGluIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdyaXRlcyBhIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnQgdG8gdGhlIGBDTEFVREVfRU5WX0ZJTEVgLFxuICogd2hpY2ggQ2xhdWRlIENvZGUgc291cmNlcyBiZWZvcmUgcnVubmluZyBiYXNoIGNvbW1hbmRzLiBUaGlzIGFsbG93c1xuICogU2Vzc2lvblN0YXJ0IGhvb2tzIHRvIGNvbmZpZ3VyZSB0aGUgZW52aXJvbm1lbnQgZm9yIHRoZSBlbnRpcmUgc2Vzc2lvbi5cbiAqXG4gKiAqKkltcG9ydGFudCoqOiBUaGlzIGZ1bmN0aW9uIG9ubHkgd29ya3MgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzIHdoZXJlXG4gKiBgQ0xBVURFX0VOVl9GSUxFYCBpcyBzZXQuIEluIG90aGVyIGhvb2tzLCBpdCB3aWxsIHRocm93IGFuIGVycm9yLlxuICogQHBhcmFtIG5hbWUgLSBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZVxuICogQHBhcmFtIHZhbHVlIC0gVGhlIGVudmlyb25tZW50IHZhcmlhYmxlIHZhbHVlICh3aWxsIGJlIHNoZWxsLWVzY2FwZWQpXG4gKiBAdGhyb3dzIEVycm9yIGlmIENMQVVERV9FTlZfRklMRSBpcyBub3Qgc2V0IChub3QgaW4gYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uU3RhcnRIb29rLCBzZXNzaW9uU3RhcnRPdXRwdXQsIHBlcnNpc3RFbnZWYXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCkgPT4ge1xuICogICAvLyBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgdGhlIHNlc3Npb25cbiAqICAgcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAncHJvZHVjdGlvbicpO1xuICogICBwZXJzaXN0RW52VmFyKCdBUElfS0VZJywgcHJvY2Vzcy5lbnYuTVlfQVBJX0tFWSA/PyAnZGVmYXVsdCcpO1xuICogICBwZXJzaXN0RW52VmFyKCdQQVRIJywgYCR7cHJvY2Vzcy5lbnYuUEFUSH06Li9ub2RlX21vZHVsZXMvLmJpbmApO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3BlcnNpc3RpbmctZW52aXJvbm1lbnQtdmFyaWFibGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJzaXN0RW52VmFyKG5hbWUsIHZhbHVlKSB7XG4gICAgY29uc3QgZW52RmlsZSA9IGdldEVudkZpbGVQYXRoKCk7XG4gICAgaWYgKGVudkZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZXJzaXN0RW52VmFyIGNhbiBvbmx5IGJlIHVzZWQgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLiBcIiArIFwiQ0xBVURFX0VOVl9GSUxFIGVudmlyb25tZW50IHZhcmlhYmxlIGlzIG5vdCBzZXQuXCIpO1xuICAgIH1cbiAgICAvLyBTaGVsbC1lc2NhcGUgdGhlIHZhbHVlIHRvIGhhbmRsZSBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICBjb25zdCBlc2NhcGVkVmFsdWUgPSBlc2NhcGVTaGVsbFZhbHVlKHZhbHVlKTtcbiAgICAvLyBXcml0ZSB0aGUgZXhwb3J0IHN0YXRlbWVudFxuICAgIGNvbnN0IGV4cG9ydFN0YXRlbWVudCA9IGBleHBvcnQgJHtuYW1lfT0ke2VzY2FwZWRWYWx1ZX1cXG5gO1xuICAgIGZzLmFwcGVuZEZpbGVTeW5jKGVudkZpbGUsIGV4cG9ydFN0YXRlbWVudCwgXCJ1dGYtOFwiKTtcbn1cbi8qKlxuICogUGVyc2lzdHMgbXVsdGlwbGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIGF0IG9uY2UuXG4gKlxuICogVGhpcyBpcyBhIGNvbnZlbmllbmNlIHdyYXBwZXIgYXJvdW5kIGBwZXJzaXN0RW52VmFyYCBmb3Igc2V0dGluZ1xuICogbXVsdGlwbGUgdmFyaWFibGVzIGluIGEgc2luZ2xlIGNhbGwuXG4gKiBAcGFyYW0gdmFycyAtIE9iamVjdCBtYXBwaW5nIHZhcmlhYmxlIG5hbWVzIHRvIHZhbHVlc1xuICogQHRocm93cyBFcnJvciBpZiBDTEFVREVfRU5WX0ZJTEUgaXMgbm90IHNldCAobm90IGluIGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcGVyc2lzdEVudlZhcnMoe1xuICogICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICogICBBUElfS0VZOiAnc2VjcmV0JyxcbiAqICAgREVCVUc6ICdmYWxzZSdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJzaXN0RW52VmFycyh2YXJzKSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHZhcnMpKSB7XG4gICAgICAgIHBlcnNpc3RFbnZWYXIobmFtZSwgdmFsdWUpO1xuICAgIH1cbn1cbi8qKlxuICogRXNjYXBlcyBhIHZhbHVlIGZvciBzYWZlIHVzZSBpbiBhIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnQuXG4gKlxuICogVXNlcyBzaW5nbGUgcXVvdGVzIGFuZCBlc2NhcGVzIGFueSBlbWJlZGRlZCBzaW5nbGUgcXVvdGVzLlxuICogVGhpcyBwcmV2ZW50cyBzaGVsbCBpbmplY3Rpb24gYW5kIGhhbmRsZXMgc3BlY2lhbCBjaGFyYWN0ZXJzLlxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGVzY2FwZVxuICogQHJldHVybnMgVGhlIHNoZWxsLWVzY2FwZWQgdmFsdWUgKHdpdGggcXVvdGVzKVxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZVNoZWxsVmFsdWUodmFsdWUpIHtcbiAgICAvLyBVc2Ugc2luZ2xlIHF1b3RlcyBhbmQgZXNjYXBlIGFueSBlbWJlZGRlZCBzaW5nbGUgcXVvdGVzXG4gICAgLy8gJ3ZhbHVlJyAtPiAndmFsJ1xcJyd1ZScgZm9yIHZhbHVlcyBjb250YWluaW5nIHNpbmdsZSBxdW90ZXNcbiAgICBjb25zdCBlc2NhcGVkID0gdmFsdWUucmVwbGFjZSgvJy9nLCBcIidcXFxcJydcIik7XG4gICAgcmV0dXJuIGAnJHtlc2NhcGVkfSdgO1xufVxuIiwgIi8qKlxuICogSG9vayBmYWN0b3J5IGZ1bmN0aW9ucyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZWQgZmFjdG9yeSBmdW5jdGlvbnMgZm9yIGFsbCAxMiBob29rIHR5cGVzIHRoYXQgaGFuZGxlOlxuICogLSBJbnB1dCB0eXBlIG5hcnJvd2luZyBiYXNlZCBvbiBob29rIGV2ZW50IHR5cGVcbiAqIC0gT3V0cHV0IHR5cGUgZW5mb3JjZW1lbnQgdmlhIHJldHVybiB0eXBlc1xuICogLSBFcnJvciB3cmFwcGluZyB3aXRoIGF1dG9tYXRpYyBsb2dnaW5nXG4gKiAtIExvZ2dlciBjb250ZXh0IGluamVjdGlvblxuICpcbiAqIEVhY2ggZmFjdG9yeSBhY2NlcHRzIGEgSG9va0NvbmZpZyB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXQgc2V0dGluZ3MsXG4gKiBhbmQgcmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgdGhlIHJ1bnRpbWUgaW52b2tlcyB3aGVuIHRoZSBob29rIGZpbGUgZXhlY3V0ZXMuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcHJlVG9vbFVzZUhvb2ssIHByZVRvb2xVc2VPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnUHJvY2Vzc2luZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gR2VuZXJpYyBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBob29rIGZhY3RvcnkgZnVuY3Rpb24gZm9yIGEgc3BlY2lmaWMgaG9vayB0eXBlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGludGVybmFsIGltcGxlbWVudGF0aW9uIHVzZWQgYnkgYWxsIHR5cGVkIGZhY3Rvcmllcy5cbiAqIEl0IHdyYXBzIHRoZSBoYW5kbGVyIHdpdGggZXJyb3IgY2F0Y2hpbmcgYW5kIGxvZ2dpbmcuXG4gKiBAcGFyYW0gaG9va0V2ZW50TmFtZSAtIFRoZSBob29rIGV2ZW50IG5hbWVcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb25cbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gd3JhcFxuICogQHJldHVybnMgQSB3cmFwcGVkIGhvb2sgZnVuY3Rpb25cbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVIb29rRnVuY3Rpb24oaG9va0V2ZW50TmFtZSwgY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgY29uc3QgaG9va0ZuID0gYXN5bmMgKGlucHV0LCBjb250ZXh0KSA9PiB7XG4gICAgICAgIC8vIERlbGVnYXRlIGVycm9yIGhhbmRsaW5nIHRvIHRoZSBydW50aW1lIC0ganVzdCBleGVjdXRlIHRoZSBoYW5kbGVyXG4gICAgICAgIC8vIFRoZSBydW50aW1lIHdpbGwgY2F0Y2ggZXJyb3JzLCBsb2cgdGhlbSwgYW5kIHJldHVybiBhcHByb3ByaWF0ZSBvdXRwdXRcbiAgICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZXIoaW5wdXQsIGNvbnRleHQpO1xuICAgIH07XG4gICAgLy8gQXR0YWNoIG1ldGFkYXRhIGZvciBydW50aW1lIGluc3BlY3Rpb25cbiAgICBob29rRm4uaG9va0V2ZW50TmFtZSA9IGhvb2tFdmVudE5hbWU7XG4gICAgaG9va0ZuLm1hdGNoZXIgPSBjb25maWcubWF0Y2hlcjtcbiAgICBob29rRm4udGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuICAgIHJldHVybiBob29rRm47XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVUb29sVXNlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUHJlVG9vbFVzZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdFRvb2xVc2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQb3N0VG9vbFVzZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdFRvb2xVc2VGYWlsdXJlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUG9zdFRvb2xVc2VGYWlsdXJlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBOb3RpZmljYXRpb24gSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBOb3RpZmljYXRpb24gaG9vayBoYW5kbGVyLlxuICpcbiAqIE5vdGlmaWNhdGlvbiBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgc2VuZHMgYSBub3RpZmljYXRpb24sIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gRm9yd2FyZCBub3RpZmljYXRpb25zIHRvIGV4dGVybmFsIHN5c3RlbXNcbiAqIC0gTG9nIGltcG9ydGFudCBldmVudHNcbiAqIC0gVHJpZ2dlciBjdXN0b20gYWxlcnRpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBub3RpZmljYXRpb25fdHlwZWBcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBub3RpZmljYXRpb25Ib29rLCBub3RpZmljYXRpb25PdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEZvcndhcmQgbm90aWZpY2F0aW9ucyB0byBTbGFja1xuICogZXhwb3J0IGRlZmF1bHQgbm90aWZpY2F0aW9uSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdOb3RpZmljYXRpb24gcmVjZWl2ZWQnLCB7XG4gKiAgICAgdHlwZTogaW5wdXQubm90aWZpY2F0aW9uX3R5cGUsXG4gKiAgICAgdGl0bGU6IGlucHV0LnRpdGxlXG4gKiAgIH0pO1xuICpcbiAqICAgYXdhaXQgc2VuZFNsYWNrTWVzc2FnZShpbnB1dC50aXRsZSA/PyAnTm90aWZpY2F0aW9uJywgaW5wdXQubWVzc2FnZSk7XG4gKlxuICogICByZXR1cm4gbm90aWZpY2F0aW9uT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjbm90aWZpY2F0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RpZmljYXRpb25Ib29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJOb3RpZmljYXRpb25cIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFVzZXJQcm9tcHRTdWJtaXQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBVc2VyUHJvbXB0U3VibWl0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBVc2VyUHJvbXB0U3VibWl0IGhvb2tzIGZpcmUgd2hlbiBhIHVzZXIgc3VibWl0cyBhIHByb21wdCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBBZGQgYWRkaXRpb25hbCBjb250ZXh0IG9yIGluc3RydWN0aW9uc1xuICogLSBMb2cgdXNlciBpbnRlcmFjdGlvbnNcbiAqIC0gVmFsaWRhdGUgb3IgdHJhbnNmb3JtIHByb21wdHNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHByb21wdCBzdWJtaXNzaW9uc1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHVzZXJQcm9tcHRTdWJtaXRIb29rLCB1c2VyUHJvbXB0U3VibWl0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBBZGQgcHJvamVjdCBjb250ZXh0IHRvIGV2ZXJ5IHByb21wdFxuICogZXhwb3J0IGRlZmF1bHQgdXNlclByb21wdFN1Ym1pdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuZGVidWcoJ1VzZXIgcHJvbXB0IHN1Ym1pdHRlZCcsIHsgcHJvbXB0TGVuZ3RoOiBpbnB1dC5wcm9tcHQubGVuZ3RoIH0pO1xuICpcbiAqICAgY29uc3QgcHJvamVjdENvbnRleHQgPSBhd2FpdCBnZXRQcm9qZWN0Q29udGV4dCgpO1xuICpcbiAqICAgcmV0dXJuIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQoe1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiBwcm9qZWN0Q29udGV4dFxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdXNlcnByb21wdHN1Ym1pdFxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlclByb21wdFN1Ym1pdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlVzZXJQcm9tcHRTdWJtaXRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNlc3Npb25TdGFydCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNlc3Npb25TdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU2Vzc2lvblN0YXJ0IGhvb2tzIGZpcmUgd2hlbiBhIENsYXVkZSBDb2RlIHNlc3Npb24gc3RhcnRzIG9yIHJlc3RhcnRzLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBJbml0aWFsaXplIHNlc3Npb24gc3RhdGVcbiAqIC0gSW5qZWN0IGNvbnRleHQgb3IgaW5zdHJ1Y3Rpb25zXG4gKiAtIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHNcbiAqIC0gU2V0IHVwIGxvZ2dpbmcgb3IgbW9uaXRvcmluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHNvdXJjZWAgKCdzdGFydHVwJywgJ3Jlc3VtZScsICdjbGVhcicsICdjb21wYWN0JylcbiAqXG4gKiAqKkNvbnRleHQqKjogU2Vzc2lvblN0YXJ0IGhvb2tzIHJlY2VpdmUgYW4gZXh0ZW5kZWQgY29udGV4dCB3aXRoIGBwZXJzaXN0RW52VmFyYFxuICogYW5kIGBwZXJzaXN0RW52VmFyc2AgZnVuY3Rpb25zIGZvciBzZXR0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uU3RhcnRIb29rLCBzZXNzaW9uU3RhcnRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0aGUgc2Vzc2lvblxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7IG1hdGNoZXI6ICdzdGFydHVwJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyLCBwZXJzaXN0RW52VmFyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ05ldyBzZXNzaW9uIHN0YXJ0ZWQnLCB7XG4gKiAgICAgc2Vzc2lvbklkOiBpbnB1dC5zZXNzaW9uX2lkLFxuICogICAgIGN3ZDogaW5wdXQuY3dkXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gU2V0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kc1xuICogICBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdkZXZlbG9wbWVudCcpO1xuICogICBwZXJzaXN0RW52VmFyKCdERUJVRycsICd0cnVlJyk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gU2V0IG11bHRpcGxlIGVudmlyb25tZW50IHZhcmlhYmxlcyBhdCBvbmNlXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgcGVyc2lzdEVudlZhcnMgfSkgPT4ge1xuICogICBwZXJzaXN0RW52VmFycyh7XG4gKiAgICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAqICAgICBBUElfS0VZOiAnc2VjcmV0JyxcbiAqICAgICBERUJVRzogJ2ZhbHNlJ1xuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXNzaW9uc3RhcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlc3Npb25TdGFydEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNlc3Npb25TdGFydFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2Vzc2lvbkVuZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNlc3Npb25FbmQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNlc3Npb25FbmQgaG9va3MgZmlyZSB3aGVuIGEgQ2xhdWRlIENvZGUgc2Vzc2lvbiBlbmRzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENsZWFuIHVwIHNlc3Npb24gcmVzb3VyY2VzXG4gKiAtIExvZyBzZXNzaW9uIG1ldHJpY3NcbiAqIC0gUGVyc2lzdCBzZXNzaW9uIHN0YXRlXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgcmVhc29uYCAodGhlIGV4aXQgcmVhc29uIHN0cmluZylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uRW5kSG9vaywgc2Vzc2lvbkVuZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHNlc3Npb24gZW5kIGFuZCBjbGVhbiB1cFxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvbkVuZEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU2Vzc2lvbiBlbmRlZCcsIHtcbiAqICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gKiAgICAgcmVhc29uOiBpbnB1dC5yZWFzb25cbiAqICAgfSk7XG4gKlxuICogICBhd2FpdCBjbGVhbnVwU2Vzc2lvblJlc291cmNlcyhpbnB1dC5zZXNzaW9uX2lkKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uRW5kT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbmVuZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvbkVuZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNlc3Npb25FbmRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN0b3AgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdG9wIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBpcyBhYm91dCB0byBzdG9wLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdG9wIGFuZCByZXF1aXJlIGFkZGl0aW9uYWwgYWN0aW9uXG4gKiAtIENvbmZpcm0gdGhlIHVzZXIgd2FudHMgdG8gc3RvcFxuICogLSBDbGVhbiB1cCByZXNvdXJjZXMgYmVmb3JlIHN0b3BwaW5nXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBzdG9wIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN0b3BIb29rLCBzdG9wT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBCbG9jayBzdG9wIGlmIHRoZXJlIGFyZSBwZW5kaW5nIGNoYW5nZXNcbiAqIGV4cG9ydCBkZWZhdWx0IHN0b3BIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgY29uc3QgcGVuZGluZ0NoYW5nZXMgPSBhd2FpdCBjaGVja1BlbmRpbmdDaGFuZ2VzKCk7XG4gKlxuICogICBpZiAocGVuZGluZ0NoYW5nZXMubGVuZ3RoID4gMCkge1xuICogICAgIGxvZ2dlci53YXJuKCdCbG9ja2luZyBzdG9wIGR1ZSB0byBwZW5kaW5nIGNoYW5nZXMnLCB7XG4gKiAgICAgICBjb3VudDogcGVuZGluZ0NoYW5nZXMubGVuZ3RoXG4gKiAgICAgfSk7XG4gKlxuICogICAgIHJldHVybiBzdG9wT3V0cHV0KHtcbiAqICAgICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICAgICAgcmVhc29uOiBgVGhlcmUgYXJlICR7cGVuZGluZ0NoYW5nZXMubGVuZ3RofSB1bmNvbW1pdHRlZCBjaGFuZ2VzYCxcbiAqICAgICAgIHN5c3RlbU1lc3NhZ2U6ICdQbGVhc2UgY29tbWl0IG9yIGRpc2NhcmQgY2hhbmdlcyBiZWZvcmUgc3RvcHBpbmcnXG4gKiAgICAgfSk7XG4gKiAgIH1cbiAqXG4gKiAgIGxvZ2dlci5pbmZvKCdBcHByb3Zpbmcgc3RvcCcpO1xuICogICByZXR1cm4gc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N0b3BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3BIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdG9wXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdWJhZ2VudFN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU3ViYWdlbnRTdGFydCBob29rcyBmaXJlIHdoZW4gYSBzdWJhZ2VudCAoVGFzayB0b29sKSBzdGFydHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gSW5qZWN0IGNvbnRleHQgZm9yIHRoZSBzdWJhZ2VudFxuICogLSBMb2cgc3ViYWdlbnQgaW52b2NhdGlvbnNcbiAqIC0gQ29uZmlndXJlIHN1YmFnZW50IGJlaGF2aW9yXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgYWdlbnRfdHlwZWAgKGUuZy4sICdleHBsb3JlJywgJ2NvZGViYXNlLWFuYWx5c2lzJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdWJhZ2VudFN0YXJ0SG9vaywgc3ViYWdlbnRTdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQWRkIGNvbnRleHQgZm9yIGV4cGxvcmUgc3ViYWdlbnRzXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0YXJ0SG9vayh7IG1hdGNoZXI6ICdleHBsb3JlJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0V4cGxvcmUgc3ViYWdlbnQgc3RhcnRpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRm9jdXMgb24gZmluZGluZyBwYXR0ZXJucyBhbmQgY29udmVudGlvbnMnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdWJhZ2VudHN0YXJ0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdWJhZ2VudFN0YXJ0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdGFydFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3ViYWdlbnRTdG9wIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdWJhZ2VudFN0b3AgaG9va3MgZmlyZSB3aGVuIGEgc3ViYWdlbnQgY29tcGxldGVzIG9yIHN0b3BzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdWJhZ2VudCBmcm9tIHN0b3BwaW5nXG4gKiAtIFByb2Nlc3Mgc3ViYWdlbnQgcmVzdWx0c1xuICogLSBDbGVhbiB1cCBzdWJhZ2VudCByZXNvdXJjZXNcbiAqIC0gTG9nIHN1YmFnZW50IGNvbXBsZXRpb25cbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBhZ2VudF90eXBlYCAoZS5nLiwgJ2V4cGxvcmUnLCAnY29kZWJhc2UtYW5hbHlzaXMnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN1YmFnZW50U3RvcEhvb2ssIHN1YmFnZW50U3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQmxvY2sgZXhwbG9yZSBzdWJhZ2VudHMgaWYgdGFzayBpbmNvbXBsZXRlXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0b3BIb29rKHsgbWF0Y2hlcjogJ2V4cGxvcmUnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU3ViYWdlbnQgc3RvcHBpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gQmxvY2sgaWYgdHJhbnNjcmlwdCBzaG93cyBpbmNvbXBsZXRlIHdvcmtcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RvcE91dHB1dCh7XG4gKiAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgcmVhc29uOiAnUGxlYXNlIHZlcmlmeSBleHBsb3JhdGlvbiBpcyBjb21wbGV0ZSdcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N1YmFnZW50c3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdG9wSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdG9wXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBQcmVDb21wYWN0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgUHJlQ29tcGFjdCBob29rIGhhbmRsZXIuXG4gKlxuICogUHJlQ29tcGFjdCBob29rcyBmaXJlIGJlZm9yZSBjb250ZXh0IGNvbXBhY3Rpb24gb2NjdXJzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFByZXNlcnZlIGltcG9ydGFudCBpbmZvcm1hdGlvbiBiZWZvcmUgY29tcGFjdGlvblxuICogLSBMb2cgY29tcGFjdGlvbiBldmVudHNcbiAqIC0gTW9kaWZ5IGN1c3RvbSBpbnN0cnVjdGlvbnMgZm9yIHRoZSBjb21wYWN0ZWQgY29udGV4dFxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHRyaWdnZXJgICgnbWFudWFsJywgJ2F1dG8nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHByZUNvbXBhY3RIb29rLCBwcmVDb21wYWN0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgY29tcGFjdGlvbiBldmVudHMgYW5kIHByZXNlcnZlIGNvbnRleHRcbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbnRleHQgY29tcGFjdGlvbiB0cmlnZ2VyZWQnLCB7XG4gKiAgICAgdHJpZ2dlcjogaW5wdXQudHJpZ2dlcixcbiAqICAgICBoYXNDdXN0b21JbnN0cnVjdGlvbnM6IGlucHV0LmN1c3RvbV9pbnN0cnVjdGlvbnMgIT09IG51bGxcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgICAgc3lzdGVtTWVzc2FnZTogJ1JlbWVtYmVyOiBzdHJpY3QgbW9kZSBpcyBlbmFibGVkJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gT25seSBoYW5kbGUgbWFudWFsIGNvbXBhY3Rpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHsgbWF0Y2hlcjogJ21hbnVhbCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdNYW51YWwgY29tcGFjdGlvbiByZXF1ZXN0ZWQnKTtcbiAqICAgcmV0dXJuIHByZUNvbXBhY3RPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNwcmVjb21wYWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVDb21wYWN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUHJlQ29tcGFjdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcGVybWlzc2lvblJlcXVlc3RIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQZXJtaXNzaW9uUmVxdWVzdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuIiwgIi8qKlxuICogTG9nZ2VyIHN5c3RlbSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgc3RydWN0dXJlZCBsb2dnaW5nIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBvcHRpb25hbCBmaWxlIG91dHB1dC5cbiAqIFRoZSBsb2dnZXIgaXMgKipzaWxlbnQgYnkgZGVmYXVsdCoqIHRvIGF2b2lkIGludGVyZmVyaW5nIHdpdGggaG9vayBwcm90b2NvbFxuICogKHN0ZG91dCBpcyByZXNlcnZlZCBmb3IgSlNPTiByZXNwb25zZXMsIHN0ZGVyciBtYXkgY29uZmxpY3Qgd2l0aCBDbGF1ZGUgQ29kZSkuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gbG9nIGV2ZW50c1xuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gKiAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluICR7ZXZlbnQuaG9va1R5cGV9OiAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAqIHVuc3Vic2NyaWJlKCk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBjbG9zZVN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgb3BlblN5bmMsIHdyaXRlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuLyoqXG4gKiBBbGwgbG9nIGxldmVscyBpbiBvcmRlciBvZiBzZXZlcml0eSAobG93ZXN0IHRvIGhpZ2hlc3QpLlxuICovXG5leHBvcnQgY29uc3QgTE9HX0xFVkVMUyA9IFtcImRlYnVnXCIsIFwiaW5mb1wiLCBcIndhcm5cIiwgXCJlcnJvclwiXTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBMb2dnZXIgZm9yIENsYXVkZSBDb2RlIGhvb2tzIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBmaWxlIG91dHB1dC5cbiAqXG4gKiAjIyBLZXkgQmVoYXZpb3JzXG4gKlxuICogfCBDb25maWd1cmF0aW9uIHwgQmVoYXZpb3IgfFxuICogfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS18XG4gKiB8IE5vIGNvbmZpZyAoZGVmYXVsdCkgfCAqKlNpbGVudCoqIC0gbm8gb3V0cHV0IGFueXdoZXJlIHxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCBlbnYgdmFyIHwgQXBwZW5kIEpTT04gbGluZXMgdG8gZmlsZSB8XG4gKiB8IGAub24obGV2ZWwsIGhhbmRsZXIpYCByZWdpc3RlcmVkIHwgRXZlbnRzIGRlbGl2ZXJlZCB0byBoYW5kbGVycyBvbmx5IHxcbiAqIHwgTXVsdGlwbGUgZGVzdGluYXRpb25zIHwgQWxsIGRlc3RpbmF0aW9ucyByZWNlaXZlIGV2ZW50cyB8XG4gKlxuICogIyMgSW1wb3J0YW50IE5vdGVzXG4gKlxuICogLSAqKk5ldmVyIG91dHB1dHMgdG8gc3Rkb3V0KiogKHJlc2VydmVkIGZvciBKU09OIGhvb2sgcmVzcG9uc2UpXG4gKiAtICoqTmV2ZXIgb3V0cHV0cyB0byBzdGRlcnIqKiAobWF5IGludGVyZmVyZSB3aXRoIENsYXVkZSBDb2RlIGVycm9yIGhhbmRsaW5nKVxuICogLSBGaWxlIG91dHB1dCB1c2VzIEpTT04gTGluZXMgZm9ybWF0IGZvciBlYXN5IHBhcnNpbmdcbiAqIC0gYC5vbihsZXZlbCwgaGFuZGxlcilgIHJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb25cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBldmVudHMgYXQgc3BlY2lmaWMgbGV2ZWxcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4ge1xuICogICBzZW5kQWxlcnQoZXZlbnQubWVzc2FnZSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMb2cgd2l0aGluIGEgaG9vayBoYW5kbGVyXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ0Fib3V0IHRvIHZhbGlkYXRlIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJlZCBldmVudCBoYW5kbGVycyBieSBsb2cgbGV2ZWwuXG4gICAgICovXG4gICAgaGFuZGxlcnMgPSBuZXcgTWFwKCk7XG4gICAgLyoqXG4gICAgICogRmlsZSBkZXNjcmlwdG9yIGZvciBsb2cgZmlsZSBvdXRwdXQuXG4gICAgICogTGF6aWx5IGluaXRpYWxpemVkIG9uIGZpcnN0IHdyaXRlLlxuICAgICAqL1xuICAgIGxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgLyoqXG4gICAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUsIGlmIGNvbmZpZ3VyZWQuXG4gICAgICovXG4gICAgbG9nRmlsZVBhdGggPSBudWxsO1xuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgZmlsZSBpbml0aWFsaXphdGlvbiBoYXMgYmVlbiBhdHRlbXB0ZWQuXG4gICAgICovXG4gICAgZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgLyoqXG4gICAgICogQ3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRIb29rVHlwZTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGhvb2sgaW5wdXQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRJbnB1dDtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IExvZ2dlciBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAgICogY3JlYXRpbmcgbmV3IGluc3RhbmNlcy5cbiAgICAgKiBAcGFyYW0gY29uZmlnIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvblxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIFVzZSBzaW5nbGV0b24gKHJlY29tbWVuZGVkKVxuICAgICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gICAgICpcbiAgICAgKiAvLyBPciBjcmVhdGUgY3VzdG9tIGluc3RhbmNlXG4gICAgICogY29uc3QgY3VzdG9tTG9nZ2VyID0gbmV3IExvZ2dlcih7IGxvZ0ZpbGVQYXRoOiAnL3Zhci9sb2cvaG9va3MubG9nJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzIG1hcCBmb3IgZWFjaCBsZXZlbFxuICAgICAgICBmb3IgKGNvbnN0IGxldmVsIG9mIExPR19MRVZFTFMpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlcnMuc2V0KGxldmVsLCBuZXcgU2V0KCkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNldCBsb2cgZmlsZSBwYXRoIGZyb20gY29uZmlnIG9yIGVudmlyb25tZW50XG4gICAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBjb25maWcubG9nRmlsZVBhdGggPz8gcHJvY2Vzcy5lbnYuQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEUgPz8gbnVsbDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGRldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB0aGF0IGlzIHR5cGljYWxseSBvbmx5IHVzZWZ1bFxuICAgICAqIGR1cmluZyBkZXZlbG9wbWVudCBvciB0cm91Ymxlc2hvb3RpbmcuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgZGVidWcgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmRlYnVnKCdQcm9jZXNzaW5nIHRvb2wgaW5wdXQnLCB7IHRvb2xOYW1lOiAnQmFzaCcsIGlucHV0U2l6ZTogMjU2IH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGRlYnVnKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwiZGVidWdcIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBnZW5lcmFsIG9wZXJhdGlvbmFsIGV2ZW50cyBsaWtlIGhvb2sgaW52b2NhdGlvbnMsIHN1Y2Nlc3NmdWxcbiAgICAgKiBjb21wbGV0aW9ucywgb3Igc3RhdGUgY2hhbmdlcy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBpbmZvIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci5pbmZvKCdTZXNzaW9uIHN0YXJ0ZWQnLCB7IHNvdXJjZTogJ3N0YXJ0dXAnLCBzZXNzaW9uSWQ6ICdhYmMxMjMnIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGluZm8obWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJpbmZvXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBjb25kaXRpb25zIHRoYXQgbWF5IGluZGljYXRlIGlzc3VlcyBidXQgZG9uJ3QgcHJldmVudFxuICAgICAqIG9wZXJhdGlvbiwgc3VjaCBhcyBkZXByZWNhdGVkIHBhdHRlcm5zIG9yIHBlcmZvcm1hbmNlIGNvbmNlcm5zLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIHdhcm5pbmcgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLndhcm4oJ0RlcHJlY2F0ZWQgaG9vayBwYXR0ZXJuIGRldGVjdGVkJywgeyBwYXR0ZXJuOiAnbGVnYWN5TWF0Y2hlcicgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgd2FybihtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcIndhcm5cIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZXJyb3IgY29uZGl0aW9ucyB0aGF0IHJlcXVpcmUgYXR0ZW50aW9uIGJ1dCB3ZXJlIGhhbmRsZWRcbiAgICAgKiBncmFjZWZ1bGx5LiBGb3IgZXhjZXB0aW9ucywgcHJlZmVyIHtAbGluayBsb2dFcnJvcn0uXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgZXJyb3IgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gdmFsaWRhdGUgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgcmVhc29uOiAnZW1wdHkgY29tbWFuZCcgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZXJyb3IobWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJlcnJvclwiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAgICpcbiAgICAgKiBVc2UgdGhpcyBtZXRob2Qgd2hlbiBsb2dnaW5nIGNhdWdodCBleGNlcHRpb25zIHRvIGNhcHR1cmUgdGhlIGZ1bGxcbiAgICAgKiBlcnJvciBjb250ZXh0IGluY2x1ZGluZyBuYW1lLCBtZXNzYWdlLCBzdGFjayB0cmFjZSwgYW5kIGNhdXNlIGNoYWluLlxuICAgICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBsb2dcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiB0cnkge1xuICAgICAqICAgYXdhaXQgZGFuZ2Vyb3VzT3BlcmF0aW9uKCk7XG4gICAgICogfSBjYXRjaCAoZXJyKSB7XG4gICAgICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnRmFpbGVkIHRvIGV4ZWN1dGUgZGFuZ2Vyb3VzIG9wZXJhdGlvbicsIHtcbiAgICAgKiAgICAgb3BlcmF0aW9uOiAnZGVsZXRlJyxcbiAgICAgKiAgICAgdGFyZ2V0OiAnL2ltcG9ydGFudC9maWxlLnR4dCdcbiAgICAgKiAgIH0pO1xuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBsb2dFcnJvcihlcnJvciwgbWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICBjb25zdCBlcnJvckluZm8gPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IpO1xuICAgICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgbGV2ZWw6IFwiZXJyb3JcIixcbiAgICAgICAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICAgICAgICBlcnJvcjogZXJyb3JJbmZvLFxuICAgICAgICAgICAgY29udGV4dCxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmVzIGEgaGFuZGxlciB0byBsb2cgZXZlbnRzIGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAgICpcbiAgICAgKiBUaGUgaGFuZGxlciB3aWxsIGJlIGNhbGxlZCBmb3IgZXZlcnkgbG9nIGV2ZW50IGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAgICogUmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSBjYWxsZWQgd2hlbiB0aGUgaGFuZGxlclxuICAgICAqIGlzIG5vIGxvbmdlciBuZWVkZWQuXG4gICAgICogQHBhcmFtIGxldmVsIC0gVGhlIGxvZyBsZXZlbCB0byBzdWJzY3JpYmUgdG9cbiAgICAgKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggZXZlbnRcbiAgICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIHRoZSBoYW5kbGVyXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gU3Vic2NyaWJlIHRvIGVycm9yIGV2ZW50c1xuICAgICAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICAgICAqICAgY29uc29sZS5lcnJvcihgWyR7ZXZlbnQuaG9va1R5cGV9XSAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gICAgICogICBpZiAoZXZlbnQuZXJyb3IpIHtcbiAgICAgKiAgICAgY29uc29sZS5lcnJvcihldmVudC5lcnJvci5zdGFjayk7XG4gICAgICogICB9XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAgICAgKiB1bnN1YnNjcmliZSgpO1xuICAgICAqIGBgYFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIEZvcndhcmQgdG8gZXh0ZXJuYWwgbG9nZ2luZyBsaWJyYXJ5XG4gICAgICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gICAgICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oKTtcbiAgICAgKlxuICAgICAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAgICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgb24obGV2ZWwsIGhhbmRsZXIpIHtcbiAgICAgICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGxldmVsKTtcbiAgICAgICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgIGxldmVsSGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICBsZXZlbEhhbmRsZXJzPy5kZWxldGUoaGFuZGxlcik7XG4gICAgICAgIH07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICAgKlxuICAgICAqIFRoaXMgaXMgY2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYmVmb3JlIGludm9raW5nIGhvb2sgaGFuZGxlcnMuXG4gICAgICogWW91IHR5cGljYWxseSBkb24ndCBuZWVkIHRvIGNhbGwgdGhpcyBkaXJlY3RseS5cbiAgICAgKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgdHlwZSBvZiBob29rIGJlaW5nIGV4ZWN1dGVkXG4gICAgICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgZGF0YVxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIHNldENvbnRleHQoaG9va1R5cGUsIGlucHV0KSB7XG4gICAgICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gaG9va1R5cGU7XG4gICAgICAgIHRoaXMuY3VycmVudElucHV0ID0gaW5wdXQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsZWFycyB0aGUgY3VycmVudCBob29rIGNvbnRleHQuXG4gICAgICpcbiAgICAgKiBDYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBhZnRlciBob29rIGV4ZWN1dGlvbiBjb21wbGV0ZXMuXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgY2xlYXJDb250ZXh0KCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5jdXJyZW50SW5wdXQgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENvbmZpZ3VyZXMgdGhlIGxvZyBmaWxlIHBhdGggYXQgcnVudGltZS5cbiAgICAgKlxuICAgICAqIENhbGwgdGhpcyB0byBlbmFibGUgb3IgY2hhbmdlIGZpbGUgbG9nZ2luZy4gU2V0dGluZyB0byBgbnVsbGAgZGlzYWJsZXNcbiAgICAgKiBmaWxlIGxvZ2dpbmcgKGJ1dCBkb2Vzbid0IGNsb3NlIGV4aXN0aW5nIGZpbGUgaGFuZGxlIGltbWVkaWF0ZWx5KS5cbiAgICAgKiBAcGFyYW0gZmlsZVBhdGggLSBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgb3IgbnVsbCB0byBkaXNhYmxlXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gRW5hYmxlIGZpbGUgbG9nZ2luZyBhdCBydW50aW1lXG4gICAgICogbG9nZ2VyLnNldExvZ0ZpbGUoJy92YXIvbG9nL2NsYXVkZS1ob29rcy5sb2cnKTtcbiAgICAgKlxuICAgICAqIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nXG4gICAgICogbG9nZ2VyLnNldExvZ0ZpbGUobnVsbCk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgc2V0TG9nRmlsZShmaWxlUGF0aCkge1xuICAgICAgICAvLyBDbG9zZSBleGlzdGluZyBmaWxlIGlmIG9wZW5cbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2VzIGFsbCByZXNvdXJjZXMgaGVsZCBieSB0aGUgbG9nZ2VyLlxuICAgICAqXG4gICAgICogQ2FsbCB0aGlzIGR1cmluZyBncmFjZWZ1bCBzaHV0ZG93biB0byBlbnN1cmUgYWxsIGxvZyBkYXRhIGlzIGZsdXNoZWQuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHtcbiAgICAgKiAgIGxvZ2dlci5jbG9zZSgpO1xuICAgICAqIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGNsb3NlKCkge1xuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZXJlIGFyZSBhbnkgYWN0aXZlIGhhbmRsZXJzIG9yIGRlc3RpbmF0aW9ucy5cbiAgICAgKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgaGFuZGxlcnMgYXJlIHJlZ2lzdGVyZWQgb3IgZmlsZSBsb2dnaW5nIGlzIGVuYWJsZWQuXG4gICAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICAgKi9cbiAgICBoYXNEZXN0aW5hdGlvbnMoKSB7XG4gICAgICAgIGZvciAoY29uc3QgaGFuZGxlcnMgb2YgdGhpcy5oYW5kbGVycy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKGhhbmRsZXJzLnNpemUgPiAwKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmxvZ0ZpbGVQYXRoICE9PSBudWxsO1xuICAgIH1cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8qKlxuICAgICAqIEVtaXRzIGEgbG9nIGV2ZW50LlxuICAgICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBzZXZlcml0eSBsZXZlbCBvZiB0aGUgZXZlbnRcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBsb2cgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0IGRhdGFcbiAgICAgKi9cbiAgICBlbWl0KGxldmVsLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbCxcbiAgICAgICAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERlbGl2ZXJzIGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGRlc3RpbmF0aW9ucy5cbiAgICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGRlbGl2ZXJcbiAgICAgKi9cbiAgICBkZWxpdmVyRXZlbnQoZXZlbnQpIHtcbiAgICAgICAgLy8gRGVsaXZlciB0byBldmVudCBoYW5kbGVyc1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnQubGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgaGFuZGxlciBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gV3JpdGUgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgICAgIHRoaXMud3JpdGVUb0ZpbGUoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gd3JpdGVcbiAgICAgKi9cbiAgICB3cml0ZVRvRmlsZShldmVudCkge1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIC8vIExhenkgaW5pdGlhbGl6YXRpb24gb2YgZmlsZSBoYW5kbGVcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmlsZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCA9PT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBgJHtKU09OLnN0cmluZ2lmeShldmVudCl9XFxuYDtcbiAgICAgICAgICAgIHdyaXRlU3luYyh0aGlzLmxvZ0ZpbGVGZCwgbGluZSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgd3JpdGUgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAgICAgICAvLyBUaGlzIGZvbGxvd3MgdGhlIHJpc2sgbWl0aWdhdGlvbjogXCJHcmFjZWZ1bCBkZWdyYWRhdGlvbiAtIGxvZyB3cml0ZVxuICAgICAgICAgICAgLy8gZmFpbHVyZXMgYXJlIHNpbGVudGx5IGlnbm9yZWQgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cIlxuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBsb2cgZmlsZSBmb3Igd3JpdGluZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmlsZSgpIHtcbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFbnN1cmUgZGlyZWN0b3J5IGV4aXN0c1xuICAgICAgICAgICAgY29uc3QgZGlyID0gZGlybmFtZSh0aGlzLmxvZ0ZpbGVQYXRoKTtcbiAgICAgICAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgICAgICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBPcGVuIGZpbGUgZm9yIGFwcGVuZGluZ1xuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBvcGVuU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCBcImFcIik7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgaW5pdGlhbGl6YXRpb24gZXJyb3JzXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbVxuICAgICAqIEByZXR1cm5zIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBleHRyYWN0RXJyb3JJbmZvKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBjYXVzZSBjaGFpbiBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAoZXJyb3IuY2F1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGluZm8uY2F1c2UgPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IuY2F1c2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH1cbiAgICAgICAgLy8gSGFuZGxlIG5vbi1FcnJvciB2YWx1ZXNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IFwiVW5rbm93bkVycm9yXCIsXG4gICAgICAgICAgICBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgICB9O1xuICAgIH1cbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNpbmdsZXRvbiBFeHBvcnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogVXNlIHRoaXMgc2luZ2xldG9uIGZvciBhbGwgbG9nZ2luZyB3aXRoaW4gaG9va3MuIFRoZSBsb2dnZXIgaXMgY29uZmlndXJlZFxuICogdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgc3VwcG9ydHMgZXZlbnQgc3Vic2NyaXB0aW9uIGZvciBjdXN0b21cbiAqIGRlc3RpbmF0aW9ucy5cbiAqXG4gKiAjIyBDb25maWd1cmF0aW9uXG4gKlxuICogfCBFbnZpcm9ubWVudCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHxcbiAqIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCB8IFBhdGggdG8gbG9nIGZpbGUgKEpTT04gTGluZXMgZm9ybWF0KSB8XG4gKlxuICogIyMgVXNhZ2UgaW4gSG9va3NcbiAqXG4gKiBUaGUgbG9nZ2VyIGlzIHBhc3NlZCB0byBob29rIGhhbmRsZXJzIHZpYSBjb250ZXh0IGZvciBjb252ZW5pZW5jZTpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ1ZhbGlkYXRpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gKlxuICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oeyBsZXZlbDogJ2RlYnVnJyB9KTtcbiAqXG4gKiBsb2dnZXIub24oJ2RlYnVnJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmRlYnVnKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIERpcmVjdCB1c2FnZVxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBsb2dnZXIuaW5mbygnU3RhcnRpbmcgb3BlcmF0aW9uJyk7XG4gKiBsb2dnZXIud2FybignUmVzb3VyY2UgbGltaXQgYXBwcm9hY2hpbmcnLCB7IHVzYWdlOiAwLjkgfSk7XG4gKlxuICogdHJ5IHtcbiAqICAgYXdhaXQgcmlza3lPcGVyYXRpb24oKTtcbiAqIH0gY2F0Y2ggKGVycikge1xuICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnUmlza3kgb3BlcmF0aW9uIGZhaWxlZCcpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG4iLCAiLyoqXG4gKiBPdXRwdXQgdHlwZXMgYW5kIGJ1aWxkZXJzIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlLXNhZmUgb3V0cHV0IGJ1aWxkZXIgZnVuY3Rpb25zIGZvciBhbGwgMTIgaG9vayB0eXBlcy4gRWFjaCBidWlsZGVyXG4gKiBhY2NlcHRzIG9wdGlvbnMgdGhhdCBtYXRjaCB0aGUgd2lyZSBmb3JtYXQgZXhwZWN0ZWQgYnkgQ2xhdWRlIENvZGUsIHdpdGggdHlwZXNcbiAqIGRlcml2ZWQgZnJvbSB0aGUgQ2xhdWRlIEFnZW50IFNESydzIGBTeW5jSG9va0pTT05PdXRwdXRgIHR5cGUuXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhpdCBDb2RlIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeGl0IGNvZGVzIHVzZWQgYnkgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogfCBFeGl0IENvZGUgfCBOYW1lIHwgV2hlbiBVc2VkIHwgQ2xhdWRlIENvZGUgQmVoYXZpb3IgfFxuICogfC0tLS0tLS0tLS0tfC0tLS0tLXwtLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLS0tLS0tLS18XG4gKiB8IDAgfCBTdWNjZXNzIHwgSGFuZGxlciByZXR1cm5zIG5vcm1hbGx5IHwgQ29udGludWUsIHBhcnNlIHN0ZG91dCBhcyBKU09OIHxcbiAqIHwgMSB8IEVycm9yIHwgSW52YWxpZCBpbnB1dCwgbm9uLWJsb2NraW5nIGVycm9yIHwgTm9uLWJsb2NraW5nLCBzdGRlcnIgdG8gdXNlciBvbmx5IHxcbiAqIHwgMiB8IEJsb2NrIHwgSGFuZGxlciB0aHJvd3MgT1IgYHN0b3BSZWFzb25gIHNldCB8IEJsb2NraW5nLCBzdGRlcnIgc2hvd24gdG8gQ2xhdWRlIHxcbiAqL1xuZXhwb3J0IGNvbnN0IEVYSVRfQ09ERVMgPSB7XG4gICAgLyoqIEhhbmRsZXIgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gQ2xhdWRlIENvZGUgcGFyc2VzIHN0ZG91dCBhcyBKU09OLiAqL1xuICAgIFNVQ0NFU1M6IDAsXG4gICAgLyoqIE5vbi1ibG9ja2luZyBlcnJvciBvY2N1cnJlZCAoZS5nLiwgaW52YWxpZCBpbnB1dCkuIHN0ZGVyciBzaG93biB0byB1c2VyIG9ubHkuICovXG4gICAgRVJST1I6IDEsXG4gICAgLyoqIEhhbmRsZXIgdGhyZXcgZXhjZXB0aW9uIE9SIGJsb2NraW5nIGFjdGlvbiByZXF1ZXN0ZWQuIHN0ZGVyciBzaG93biB0byBDbGF1ZGUuICovXG4gICAgQkxPQ0s6IDIsXG59O1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gT3V0cHV0IEJ1aWxkZXIgRmFjdG9yaWVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgaGF2ZSBob29rU3BlY2lmaWNPdXRwdXQgd2l0aCBhIGhvb2tFdmVudE5hbWUgZGlzY3JpbWluYXRvci5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiB7XG4gICAgICAgIGNvbnN0IHsgaG9va1NwZWNpZmljT3V0cHV0LCAuLi5yZXN0IH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCBzdGRvdXQgPSBob29rU3BlY2lmaWNPdXRwdXQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB7IC4uLnJlc3QsIGhvb2tTcGVjaWZpY091dHB1dDogeyBob29rRXZlbnROYW1lOiBob29rVHlwZSwgLi4uaG9va1NwZWNpZmljT3V0cHV0IH0gfVxuICAgICAgICAgICAgOiByZXN0O1xuICAgICAgICByZXR1cm4geyBfdHlwZTogaG9va1R5cGUsIHN0ZG91dCB9O1xuICAgIH07XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgb25seSB1c2UgQ29tbW9uT3B0aW9ucyAoc2ltcGxlIHBhc3N0aHJvdWdoKS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiAoe1xuICAgICAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgICAgIHN0ZG91dDogb3B0aW9ucyxcbiAgICB9KTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCB1c2UgZGVjaXNpb24tYmFzZWQgb3B0aW9ucyAoU3RvcCwgU3ViYWdlbnRTdG9wKS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiBvcHRpb25zLFxuICAgIH0pO1xufVxuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlVG9vbFVzZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlVG9vbFVzZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdG9vbCBleGVjdXRpb25cbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnIH1cbiAqIH0pO1xuICpcbiAqIC8vIERlbnkgd2l0aCByZWFzb25cbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb246ICdkZW55JyxcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb25SZWFzb246ICdEYW5nZXJvdXMgY29tbWFuZCBkZXRlY3RlZCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQWxsb3cgd2l0aCBtb2RpZmllZCBpbnB1dFxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyxcbiAqICAgICB1cGRhdGVkSW5wdXQ6IHsgY29tbWFuZDogJ2xzIC1sYScgfVxuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcHJlVG9vbFVzZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUHJlVG9vbFVzZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBvc3RUb29sVXNlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQb3N0VG9vbFVzZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgYWZ0ZXIgYSBmaWxlIHJlYWRcbiAqIHBvc3RUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGaWxlIGNvbnRhaW5zIHNlbnNpdGl2ZSBkYXRhJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcG9zdFRvb2xVc2VPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBvc3RUb29sVXNlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdFRvb2xVc2VGYWlsdXJlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnVHJ5IHVzaW5nIGEgZGlmZmVyZW50IGFwcHJvYWNoJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQb3N0VG9vbFVzZUZhaWx1cmVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBVc2VyUHJvbXB0U3VibWl0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBVc2VyUHJvbXB0U3VibWl0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB1c2VyUHJvbXB0U3VibWl0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdUaGlzIHByb2plY3QgdXNlcyBUeXBlU2NyaXB0IHN0cmljdCBtb2RlJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdXNlclByb21wdFN1Ym1pdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiVXNlclByb21wdFN1Ym1pdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNlc3Npb25TdGFydCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU2Vzc2lvblN0YXJ0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzZXNzaW9uU3RhcnRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogSlNPTi5zdHJpbmdpZnkoeyBwcm9qZWN0OiAnbXktcHJvamVjdCcgfSlcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNlc3Npb25TdGFydE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU2Vzc2lvblN0YXJ0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2Vzc2lvbkVuZCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU2Vzc2lvbkVuZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc2Vzc2lvbkVuZE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNlc3Npb25FbmRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIlNlc3Npb25FbmRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdG9wIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0aGUgc3RvcFxuICogc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCByZWFzb25cbiAqIHN0b3BPdXRwdXQoe1xuICogICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgcmVhc29uOiAnVGhlcmUgYXJlIHVuY29tbWl0dGVkIGNoYW5nZXMnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoXCJTdG9wXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3ViYWdlbnRTdGFydCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdGFydE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc3ViYWdlbnRTdGFydE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRm9jdXMgb24gZmluZGluZyBwYXR0ZXJucydcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RhcnRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlN1YmFnZW50U3RhcnRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdWJhZ2VudFN0b3AgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN1YmFnZW50U3RvcE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQmxvY2sgd2l0aCByZWFzb25cbiAqIHN1YmFnZW50U3RvcE91dHB1dCh7XG4gKiAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICByZWFzb246ICdUYXNrIG5vdCBjb21wbGV0ZSdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdWJhZ2VudFN0b3BPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKFwiU3ViYWdlbnRTdG9wXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgTm90aWZpY2F0aW9uIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBOb3RpZmljYXRpb25PdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGFib3V0IHRoZSBub3RpZmljYXRpb25cbiAqIG5vdGlmaWNhdGlvbk91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnTm90aWZpY2F0aW9uIGZvcndhcmRlZCB0byBTbGFjayAjYWxlcnRzIGNoYW5uZWwnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFN1cHByZXNzIHRoZSBub3RpZmljYXRpb25cbiAqIG5vdGlmaWNhdGlvbk91dHB1dCh7IHN1cHByZXNzT3V0cHV0OiB0cnVlIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBub3RpZmljYXRpb25PdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIk5vdGlmaWNhdGlvblwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFByZUNvbXBhY3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFByZUNvbXBhY3RPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHByZUNvbXBhY3RPdXRwdXQoe1xuICogICBzeXN0ZW1NZXNzYWdlOiAnUmVtZW1iZXI6IHN0cmljdCBtb2RlIGlzIGVuYWJsZWQnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcHJlQ29tcGFjdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiUHJlQ29tcGFjdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBlcm1pc3Npb25SZXF1ZXN0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQZXJtaXNzaW9uUmVxdWVzdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQXV0by1hcHByb3ZlXG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7IGJlaGF2aW9yOiAnYWxsb3cnIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1hcHByb3ZlIHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHtcbiAqICAgICAgIGJlaGF2aW9yOiAnYWxsb3cnLFxuICogICAgICAgdXBkYXRlZElucHV0OiB7IGZpbGVfcGF0aDogJy9zYWZlL3BhdGgnIH1cbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEF1dG8tZGVueVxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdkZW55JyxcbiAqICAgICAgIG1lc3NhZ2U6ICdOb3QgYWxsb3dlZCcsXG4gKiAgICAgICBpbnRlcnJ1cHQ6IHRydWVcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEZhbGwgdGhyb3VnaCB0byBub3JtYWwgcHJvbXB0XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQZXJtaXNzaW9uUmVxdWVzdFwiKTtcbiIsICIvKipcbiAqIFJ1bnRpbWUgbW9kdWxlIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBIYW5kbGVzIHN0ZGluL3N0ZG91dC9leGl0IGNvZGUgc2VtYW50aWNzIGZvciBjb21waWxlZCBob29rIGV4ZWN1dGlvbi5cbiAqIFRoaXMgbW9kdWxlIGlzIHRoZSBjb3JlIG9yY2hlc3RyYXRvciB0aGF0OlxuICogLSBSZWFkcyBKU09OIGZyb20gc3RkaW4gKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogLSBJbnZva2VzIHRoZSBob29rIGhhbmRsZXJcbiAqIC0gV3JpdGVzIG91dHB1dCB0byBzdGRvdXRcbiAqIC0gTWFuYWdlcyBleGl0IGNvZGVzXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gSW4gYSBjb21waWxlZCBob29rIGZpbGVcbiAqIGltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvcnVudGltZSc7XG4gKiBpbXBvcnQgbXlIb29rIGZyb20gJy4vbXktaG9vay5qcyc7XG4gKlxuICogZXhlY3V0ZShteUhvb2spO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuaW1wb3J0IHsgcGVyc2lzdEVudlZhciwgcGVyc2lzdEVudlZhcnMgfSBmcm9tIFwiLi9lbnYuanNcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuL2xvZ2dlci5qc1wiO1xuaW1wb3J0IHsgRVhJVF9DT0RFUyB9IGZyb20gXCIuL291dHB1dHMuanNcIjtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN0ZGluL1N0ZG91dCBIYW5kbGluZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBSZWFkcyBhbGwgZGF0YSBmcm9tIHN0ZGluLlxuICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNvbXBsZXRlIHN0ZGluIGNvbnRlbnRcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmVhZFN0ZGluKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IGNodW5rcyA9IFtdO1xuICAgICAgICAvLyBTZXQgZW5jb2RpbmcgZmlyc3QgdG8gZW5zdXJlIGRhdGEgZXZlbnRzIHJlY2VpdmUgc3RyaW5nc1xuICAgICAgICBwcm9jZXNzLnN0ZGluLnNldEVuY29kaW5nKFwidXRmLThcIik7XG4gICAgICAgIHByb2Nlc3Muc3RkaW4ub24oXCJkYXRhXCIsIChjaHVuaykgPT4ge1xuICAgICAgICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImVuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKGNodW5rcy5qb2luKFwiXCIpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2Nlc3Muc3RkaW4ub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuLyoqXG4gKiBQYXJzZXMgc3RkaW4gSlNPTiBpbnB1dC5cbiAqIEBwYXJhbSBzdGRpbkNvbnRlbnQgLSBSYXcgc3RkaW4gY29udGVudFxuICogQHJldHVybnMgUGFyc2VkIGlucHV0ICh3aXJlIGZvcm1hdCB3aXRoIHNuYWtlX2Nhc2UgcHJvcGVydGllcylcbiAqIEB0aHJvd3MgRXJyb3IgaWYgSlNPTiBpcyBtYWxmb3JtZWRcbiAqL1xuZnVuY3Rpb24gcGFyc2VTdGRpbklucHV0KHN0ZGluQ29udGVudCkge1xuICAgIC8vIFBhcnNlIEpTT04gLSBpbnB1dCB1c2VzIHdpcmUgZm9ybWF0IChzbmFrZV9jYXNlKSBkaXJlY3RseVxuICAgIGNvbnN0IHJhd0lucHV0ID0gSlNPTi5wYXJzZShzdGRpbkNvbnRlbnQpO1xuICAgIHJldHVybiByYXdJbnB1dDtcbn1cbi8qKlxuICogV3JpdGVzIGhvb2sgb3V0cHV0IHRvIHN0ZG91dC5cbiAqXG4gKiBPdXRwdXQgdXNlcyBjYW1lbENhc2Uga2V5cyBwZXIgQ2xhdWRlIENvZGUgaG9vayBzcGVjaWZpY2F0aW9uLlxuICogQHBhcmFtIG91dHB1dCAtIFRoZSBob29rIG91dHB1dCB0byB3cml0ZVxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICovXG5mdW5jdGlvbiB3cml0ZVN0ZG91dChvdXRwdXQpIHtcbiAgICAvLyBPdXRwdXQgdXNlcyBjYW1lbENhc2UgLSBubyB0cmFuc2Zvcm1hdGlvbiBuZWVkZWRcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShKU09OLnN0cmluZ2lmeShvdXRwdXQpKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVycm9yIEhhbmRsaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYW4gZXJyb3Igb3V0cHV0IGZvciBtYWxmb3JtZWQgc3RkaW4gSlNPTi5cbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBwYXJzZSBlcnJvclxuICogQHJldHVybnMgSG9va091dHB1dCB3aXRoIGVtcHR5IHN0ZG91dFxuICovXG5mdW5jdGlvbiBjcmVhdGVNYWxmb3JtZWRJbnB1dE91dHB1dChlcnJvcikge1xuICAgIGxvZ2dlci5lcnJvcihgSW52YWxpZCBKU09OIGlucHV0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICByZXR1cm4geyBzdGRvdXQ6IHt9IH07XG59XG4vKipcbiAqIFdyaXRlcyBoYW5kbGVyIGVycm9yIHN0YWNrdHJhY2UgdG8gc3RkZXJyIGFuZCBleGl0cyB3aXRoIGNvZGUgMi5cbiAqXG4gKiBXaGVuIGEgaG9vayBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb246XG4gKiAtIFN0YWNrdHJhY2UgKHdpdGggc291cmNlbWFwcyBpZiBhdmFpbGFibGUpIGlzIG91dHB1dCB0byBzdGRlcnJcbiAqIC0gUHJvY2VzcyBleGl0cyB3aXRoIGNvZGUgMiAoQkxPQ0spXG4gKiAtIE5vIEpTT04gaXMgb3V0cHV0IHRvIHN0ZG91dFxuICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRocm93biBieSB0aGUgaGFuZGxlclxuICovXG5mdW5jdGlvbiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpIHtcbiAgICAvLyBXcml0ZSBzdGFjayB0cmFjZSB0byBzdGRlcnIgKHNvdXJjZW1hcHMgYXJlIGFwcGxpZWQgYXV0b21hdGljYWxseSBieSBOb2RlLmpzKVxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke2Vycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2V9XFxuYCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtTdHJpbmcoZXJyb3IpfVxcbmApO1xuICAgIH1cbiAgICAvLyBMb2cgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgbG9nZ2VyLmVycm9yKGBIb29rIGhhbmRsZXIgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIC8vIENsZWFyIGxvZ2dlciBjb250ZXh0IGFuZCBjbG9zZVxuICAgIGxvZ2dlci5jbGVhckNvbnRleHQoKTtcbiAgICBsb2dnZXIuY2xvc2UoKTtcbiAgICAvLyBFeGl0IHdpdGggY29kZSAyIChCTE9DSykgLSBubyBKU09OIG91dHB1dFxuICAgIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLkJMT0NLKTtcbn1cbi8qKlxuICogQ29udmVydHMgYSBTcGVjaWZpY0hvb2tPdXRwdXQgdG8gSG9va091dHB1dCBmb3Igd2lyZSBmb3JtYXQuXG4gKlxuICogU3BlY2lmaWNIb29rT3V0cHV0IHR5cGVzIGhhdmU6IHsgX3R5cGUsIGV4aXRDb2RlLCBzdGRvdXQsIHN0ZGVycj8gfVxuICogSG9va091dHB1dCBoYXM6IHsgZXhpdENvZGUsIHN0ZG91dCwgc3RkZXJyPyB9XG4gKlxuICogU2luY2Ugb3V0cHV0IGJ1aWxkZXJzIG5vdyBwcm9kdWNlIHdpcmUtZm9ybWF0IGRpcmVjdGx5LCB0aGlzIGZ1bmN0aW9uXG4gKiBzaW1wbHkgc3RyaXBzIHRoZSBgX3R5cGVgIGRpc2NyaW1pbmF0b3IgZmllbGQuXG4gKiBAcGFyYW0gc3BlY2lmaWNPdXRwdXQgLSBUaGUgc3BlY2lmaWMgb3V0cHV0IGZyb20gYSBob29rIGhhbmRsZXJcbiAqIEByZXR1cm5zIEhvb2tPdXRwdXQgcmVhZHkgZm9yIHNlcmlhbGl6YXRpb25cbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNob29rLW91dHB1dC1zdHJ1Y3R1cmVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBzcGVjaWZpY091dHB1dCA9IHByZVRvb2xVc2VPdXRwdXQoeyBob29rU3BlY2lmaWNPdXRwdXQ6IHsgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnIH0gfSk7XG4gKiBjb25zdCBob29rT3V0cHV0ID0gY29udmVydFRvSG9va091dHB1dChzcGVjaWZpY091dHB1dCk7XG4gKiAvLyBob29rT3V0cHV0OiB7IGV4aXRDb2RlOiAwLCBzdGRvdXQ6IHsgaG9va1NwZWNpZmljT3V0cHV0OiB7IC4uLiB9IH0gfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KSB7XG4gICAgcmV0dXJuIHsgc3Rkb3V0OiBzcGVjaWZpY091dHB1dC5zdGRvdXQgfTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4ZWN1dGUgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRXhlY3V0ZXMgYSBob29rIGhhbmRsZXIgd2l0aCBmdWxsIHJ1bnRpbWUgb3JjaGVzdHJhdGlvbi5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5IHBvaW50IHRoYXQgY29tcGlsZWQgaG9va3MgdXNlLiBXaGVuIGEgY29tcGlsZWQgaG9va1xuICogcnVucyBhcyBhIENMSTpcbiAqXG4gKiAxLiBSZWFkcyBhbGwgc3RkaW5cbiAqIDIuIFBhcnNlcyBKU09OICh3aXJlIGZvcm1hdCB3aXRoIHNuYWtlX2Nhc2UgcHJvcGVydGllcylcbiAqIDMuIFNldHMgdXAgbG9nZ2VyIGNvbnRleHQgKGhvb2tUeXBlLCBpbnB1dClcbiAqIDQuIENhbGxzIGhhbmRsZXIgd2l0aCBpbnB1dCBhbmQgY29udGV4dCAobG9nZ2VyKVxuICogNS4gSGFuZGxlcyBhbnkgZXJyb3JzLCBsb2dzIHRoZW1cbiAqIDYuIFdyaXRlcyBKU09OIHRvIHN0ZG91dFxuICogNy4gQ2xvc2VzIGxvZ2dlclxuICogOC4gRXhpdHMgd2l0aCBhcHByb3ByaWF0ZSBjb2RlXG4gKiBAcGFyYW0gaG9va0ZuIC0gVGhlIGhvb2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSAoZnJvbSBob29rIGZhY3RvcnkpXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gSW4gY29tcGlsZWQgaG9vayBmaWxlXG4gKiBpbXBvcnQgeyBleGVjdXRlIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL3J1bnRpbWUnO1xuICogaW1wb3J0IHsgcHJlVG9vbFVzZUhvb2ssIHByZVRvb2xVc2VPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGNvbnN0IG15SG9vayA9IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnUHJvY2Vzc2luZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICpcbiAqIGV4ZWN1dGUobXlIb29rKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlKGhvb2tGbikge1xuICAgIGxldCBvdXRwdXQ7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGxvZyBmaWxlIGNvbmZpZ3VyYXRpb24gY29uZmxpY3RzXG4gICAgICAgIC8vIENMQVVERV9DT0RFX0hPT0tTX0NMSV9MT0dfRklMRSBpcyBpbmplY3RlZCBieSB0aGUgQ0xJIC0tbG9nIHBhcmFtZXRlclxuICAgICAgICAvLyBDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRSBpcyB0aGUgdXNlcidzIGVudmlyb25tZW50IHZhcmlhYmxlXG4gICAgICAgIGNvbnN0IGNsaUxvZ0ZpbGUgPSBwcm9jZXNzLmVudi5DTEFVREVfQ09ERV9IT09LU19DTElfTE9HX0ZJTEU7XG4gICAgICAgIGNvbnN0IGVudkxvZ0ZpbGUgPSBwcm9jZXNzLmVudi5DTEFVREVfQ09ERV9IT09LU19MT0dfRklMRTtcbiAgICAgICAgaWYgKGNsaUxvZ0ZpbGUgIT09IHVuZGVmaW5lZCAmJiBlbnZMb2dGaWxlICE9PSB1bmRlZmluZWQgJiYgY2xpTG9nRmlsZSAhPT0gZW52TG9nRmlsZSkge1xuICAgICAgICAgICAgLy8gV3JpdGUgZXJyb3IgdG8gc3RkZXJyIGFuZCBleGl0IHdpdGggZXJyb3IgY29kZVxuICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYExvZyBmaWxlIGNvbmZpZ3VyYXRpb24gY29uZmxpY3Q6IENMSSAtLWxvZz1cIiR7Y2xpTG9nRmlsZX1cIiB2cyBDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRT1cIiR7ZW52TG9nRmlsZX1cIi4gYCArXG4gICAgICAgICAgICAgICAgXCJVc2Ugb25seSBvbmUgbWV0aG9kIHRvIGNvbmZpZ3VyZSBob29rIGxvZ2dpbmcuXFxuXCIpO1xuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIENMSSBsb2cgZmlsZSBpcyBzZXQsIGNvbmZpZ3VyZSB0aGUgbG9nZ2VyXG4gICAgICAgIGlmIChjbGlMb2dGaWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxvZ2dlci5zZXRMb2dGaWxlKGNsaUxvZ0ZpbGUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFJlYWQgYW5kIHBhcnNlIHN0ZGluXG4gICAgICAgIGxldCBzdGRpbkNvbnRlbnQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzdGRpbkNvbnRlbnQgPSBhd2FpdCByZWFkU3RkaW4oKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2dFcnJvcihlcnJvciwgXCJGYWlsZWQgdG8gcmVhZCBzdGRpblwiKTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBQYXJzZSBhbmQgdHJhbnNmb3JtIGlucHV0XG4gICAgICAgIGxldCBpbnB1dDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlucHV0ID0gcGFyc2VTdGRpbklucHV0KHN0ZGluQ29udGVudCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIubG9nRXJyb3IoZXJyb3IsIFwiRmFpbGVkIHRvIHBhcnNlIHN0ZGluIEpTT05cIik7XG4gICAgICAgICAgICBvdXRwdXQgPSBjcmVhdGVNYWxmb3JtZWRJbnB1dE91dHB1dChlcnJvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IGxvZ2dlciBjb250ZXh0XG4gICAgICAgIGNvbnN0IGhvb2tFdmVudE5hbWUgPSBob29rRm4uaG9va0V2ZW50TmFtZTtcbiAgICAgICAgbG9nZ2VyLnNldENvbnRleHQoaG9va0V2ZW50TmFtZSwgaW5wdXQpO1xuICAgICAgICAvLyBCdWlsZCBjb250ZXh0IC0gU2Vzc2lvblN0YXJ0IGhvb2tzIGdldCBleHRlbmRlZCBjb250ZXh0IHdpdGggcGVyc2lzdEVudlZhclxuICAgICAgICBjb25zdCBjb250ZXh0ID0gaG9va0V2ZW50TmFtZSA9PT0gXCJTZXNzaW9uU3RhcnRcIiA/IHsgbG9nZ2VyLCBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IDogeyBsb2dnZXIgfTtcbiAgICAgICAgLy8gRXhlY3V0ZSBoYW5kbGVyXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzcGVjaWZpY091dHB1dCA9IGF3YWl0IGhvb2tGbihpbnB1dCwgY29udGV4dCk7XG4gICAgICAgICAgICBvdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZXIgdGhyZXcgLSBvdXRwdXQgc3RhY2t0cmFjZSB0byBzdGRlcnIgYW5kIGV4aXQgd2l0aCBjb2RlIDJcbiAgICAgICAgICAgIC8vIFRoaXMgY2FsbCBuZXZlciByZXR1cm5zIChwcm9jZXNzLmV4aXQpXG4gICAgICAgICAgICBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZpbmFsbHkge1xuICAgICAgICAvLyBXcml0ZSBvdXRwdXQgaWYgd2UgaGF2ZSBpdFxuICAgICAgICBpZiAob3V0cHV0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHdyaXRlU3Rkb3V0KG91dHB1dC5zdGRvdXQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIENsZWFyIGxvZ2dlciBjb250ZXh0XG4gICAgICAgIGxvZ2dlci5jbGVhckNvbnRleHQoKTtcbiAgICAgICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgICAgIC8vIEV4aXQgd2l0aCBzdWNjZXNzIChoYW5kbGVyIGVycm9ycyBleGl0IHZpYSBoYW5kbGVIYW5kbGVyRXJyb3Igd2l0aCBjb2RlIDIpXG4gICAgICAgIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLlNVQ0NFU1MpO1xuICAgIH1cbn1cbiIsICIvKipcbiAqIFR5cGUgZ3VhcmRzIGFuZCBoZWxwZXIgZnVuY3Rpb25zIGZvciBDbGF1ZGUgQ29kZSB0b29sIGlucHV0cy5cbiAqXG4gKiBQcm92aWRlcyBzYWZlIHR5cGUgbmFycm93aW5nIGZvciB0b29sIGlucHV0cyBhbmQgdXRpbGl0eSBmdW5jdGlvbnNcbiAqIGZvciBjb21tb24gcGF0dGVybnMgbGlrZSBmaWxlIHBhdGggZXh0cmFjdGlvbiBhbmQgY29udGVudCBpbnNwZWN0aW9uLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7XG4gKiAgIHByZVRvb2xVc2VIb29rLFxuICogICBwcmVUb29sVXNlT3V0cHV0LFxuICogICBpc1dyaXRlVG9vbCxcbiAqICAgZ2V0RmlsZVBhdGgsXG4gKiAgIGlzVHNGaWxlLFxuICogICBjaGVja0NvbnRlbnRGb3JQYXR0ZXJuXG4gKiB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnV3JpdGV8RWRpdHxNdWx0aUVkaXQnIH0sIChpbnB1dCkgPT4ge1xuICogICBjb25zdCBmaWxlUGF0aCA9IGdldEZpbGVQYXRoKGlucHV0KTtcbiAqICAgaWYgKCFmaWxlUGF0aCB8fCAhaXNUc0ZpbGUoZmlsZVBhdGgpKSByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7fSk7XG4gKlxuICogICBjb25zdCByZXN1bHQgPSBjaGVja0NvbnRlbnRGb3JQYXR0ZXJuKGlucHV0LCAvQHRzLWV4cGVjdC1lcnJvci9nKTtcbiAqICAgaWYgKHJlc3VsdD8uaXNBZGRpdGlvbikge1xuICogICAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgICAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgICAgICBwZXJtaXNzaW9uRGVjaXNpb246ICdkZW55JyxcbiAqICAgICAgICAgcGVybWlzc2lvbkRlY2lzaW9uUmVhc29uOiBgQ2Fubm90IGFkZDogJHtyZXN1bHQubWF0Y2hlcy5qb2luKCcsICcpfWBcbiAqICAgICAgIH1cbiAqICAgICB9KTtcbiAqICAgfVxuICpcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICogQG1vZHVsZVxuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlIEd1YXJkc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBXcml0ZSB0b29sIGlucHV0cy5cbiAqXG4gKiBOYXJyb3dzIHRoZSBpbnB1dCB0eXBlIHRvIGluY2x1ZGUgYSB0eXBlZCBXcml0ZVRvb2xJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBXcml0ZSB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzV3JpdGVUb29sKGlucHV0KSkge1xuICogICAvLyBpbnB1dC50b29sX2lucHV0IGlzIG5vdyB0eXBlZCBhcyBXcml0ZVRvb2xJbnB1dFxuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LmZpbGVfcGF0aCk7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQuY29udGVudCk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV3JpdGVUb29sKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0LnRvb2xfbmFtZSA9PT0gXCJXcml0ZVwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBFZGl0IHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIEVkaXRUb29sSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGFuIEVkaXQgdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc0VkaXRUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0Lm9sZF9zdHJpbmcpO1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0Lm5ld19zdHJpbmcpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0VkaXRUb29sKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0LnRvb2xfbmFtZSA9PT0gXCJFZGl0XCI7XG59XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIE11bHRpRWRpdCB0b29sIGlucHV0cy5cbiAqXG4gKiBOYXJyb3dzIHRoZSBpbnB1dCB0eXBlIHRvIGluY2x1ZGUgYSB0eXBlZCBNdWx0aUVkaXRUb29sSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgTXVsdGlFZGl0IHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNNdWx0aUVkaXRUb29sKGlucHV0KSkge1xuICogICBmb3IgKGNvbnN0IGVkaXQgb2YgaW5wdXQudG9vbF9pbnB1dC5lZGl0cykge1xuICogICAgIGNvbnNvbGUubG9nKGAke2VkaXQub2xkX3N0cmluZ30gLT4gJHtlZGl0Lm5ld19zdHJpbmd9YCk7XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNdWx0aUVkaXRUb29sKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0LnRvb2xfbmFtZSA9PT0gXCJNdWx0aUVkaXRcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgYW55IGZpbGUtbW9kaWZ5aW5nIHRvb2wgKFdyaXRlLCBFZGl0LCBvciBNdWx0aUVkaXQpLlxuICpcbiAqIFVzZSB0aGlzIHdoZW4geW91IG5lZWQgdG8gaGFuZGxlIGFsbCBmaWxlIG1vZGlmaWNhdGlvbnMgZ2VuZXJpY2FsbHkuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgV3JpdGUsIEVkaXQsIG9yIE11bHRpRWRpdCB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzRmlsZU1vZGlmeWluZ1Rvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnN0IGZpbGVQYXRoID0gZ2V0RmlsZVBhdGgoaW5wdXQpOyAvLyBXb3JrcyBmb3IgYWxsIHRocmVlIHR5cGVzXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRmlsZU1vZGlmeWluZ1Rvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIldyaXRlXCIgfHwgaW5wdXQudG9vbF9uYW1lID09PSBcIkVkaXRcIiB8fCBpbnB1dC50b29sX25hbWUgPT09IFwiTXVsdGlFZGl0XCI7XG59XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIFJlYWQgdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgUmVhZFRvb2xJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBSZWFkIHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNSZWFkVG9vbChpbnB1dCkpIHtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5maWxlX3BhdGgpO1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0Lm9mZnNldCk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVhZFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIlJlYWRcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgQmFzaCB0b29sIGlucHV0cy5cbiAqXG4gKiBOYXJyb3dzIHRoZSBpbnB1dCB0eXBlIHRvIGluY2x1ZGUgYSB0eXBlZCBCYXNoVG9vbElucHV0LlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gY2hlY2tcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGlucHV0IGlzIGZvciBhIEJhc2ggdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc0Jhc2hUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LmNvbW1hbmQpO1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LnRpbWVvdXQpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Jhc2hUb29sKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0LnRvb2xfbmFtZSA9PT0gXCJCYXNoXCI7XG59XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIEdsb2IgdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgR2xvYlRvb2xJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBHbG9iIHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNHbG9iVG9vbChpbnB1dCkpIHtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5wYXR0ZXJuKTtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5wYXRoKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNHbG9iVG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiR2xvYlwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBHcmVwIHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIEdyZXBUb29sSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgR3JlcCB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzR3JlcFRvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQucGF0dGVybik7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQuZ2xvYik7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzR3JlcFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIkdyZXBcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgVGFzayB0b29sIGlucHV0cy5cbiAqXG4gKiBOYXJyb3dzIHRoZSBpbnB1dCB0eXBlIHRvIGluY2x1ZGUgYSB0eXBlZCBBZ2VudElucHV0LlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gY2hlY2tcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGlucHV0IGlzIGZvciBhIFRhc2sgdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc1Rhc2tUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LnByb21wdCk7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQuc3ViYWdlbnRfdHlwZSk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVGFza1Rvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIlRhc2tcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgVGFza091dHB1dCB0b29sIGlucHV0cy5cbiAqXG4gKiBOYXJyb3dzIHRoZSBpbnB1dCB0eXBlIHRvIGluY2x1ZGUgYSB0eXBlZCBUYXNrT3V0cHV0SW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgVGFza091dHB1dCB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzVGFza091dHB1dFRvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQudGFza19pZCk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVGFza091dHB1dFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIlRhc2tPdXRwdXRcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgRXhpdFBsYW5Nb2RlIHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIEV4aXRQbGFuTW9kZUlucHV0LlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gY2hlY2tcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGlucHV0IGlzIGZvciBhbiBFeGl0UGxhbk1vZGUgdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc0V4aXRQbGFuTW9kZVRvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQuYWxsb3dlZFByb21wdHMpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0V4aXRQbGFuTW9kZVRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIkV4aXRQbGFuTW9kZVwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBLaWxsU2hlbGwgdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgS2lsbFNoZWxsSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgS2lsbFNoZWxsIHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNLaWxsU2hlbGxUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LnNoZWxsX2lkKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNLaWxsU2hlbGxUb29sKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0LnRvb2xfbmFtZSA9PT0gXCJLaWxsU2hlbGxcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgTm90ZWJvb2tFZGl0IHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIE5vdGVib29rRWRpdElucHV0LlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gY2hlY2tcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGlucHV0IGlzIGZvciBhIE5vdGVib29rRWRpdCB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzTm90ZWJvb2tFZGl0VG9vbChpbnB1dCkpIHtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5ub3RlYm9va19wYXRoKTtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5uZXdfc291cmNlKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOb3RlYm9va0VkaXRUb29sKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0LnRvb2xfbmFtZSA9PT0gXCJOb3RlYm9va0VkaXRcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgVG9kb1dyaXRlIHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIFRvZG9Xcml0ZUlucHV0LlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gY2hlY2tcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGlucHV0IGlzIGZvciBhIFRvZG9Xcml0ZSB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzVG9kb1dyaXRlVG9vbChpbnB1dCkpIHtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC50b2Rvcyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVG9kb1dyaXRlVG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiVG9kb1dyaXRlXCI7XG59XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIFdlYkZldGNoIHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIFdlYkZldGNoSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgV2ViRmV0Y2ggdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc1dlYkZldGNoVG9vbChpbnB1dCkpIHtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC51cmwpO1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LnByb21wdCk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzV2ViRmV0Y2hUb29sKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0LnRvb2xfbmFtZSA9PT0gXCJXZWJGZXRjaFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBXZWJTZWFyY2ggdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgV2ViU2VhcmNoSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgV2ViU2VhcmNoIHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNXZWJTZWFyY2hUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LnF1ZXJ5KTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXZWJTZWFyY2hUb29sKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0LnRvb2xfbmFtZSA9PT0gXCJXZWJTZWFyY2hcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgQXNrVXNlclF1ZXN0aW9uIHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIEFza1VzZXJRdWVzdGlvbklucHV0LlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gY2hlY2tcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGlucHV0IGlzIGZvciBhbiBBc2tVc2VyUXVlc3Rpb24gdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc0Fza1VzZXJRdWVzdGlvblRvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQucXVlc3Rpb25zKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBc2tVc2VyUXVlc3Rpb25Ub29sKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0LnRvb2xfbmFtZSA9PT0gXCJBc2tVc2VyUXVlc3Rpb25cIjtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZpbGUgUGF0aCBVdGlsaXRpZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRXh0cmFjdHMgdGhlIGZpbGUgcGF0aCBmcm9tIGEgdG9vbCBpbnB1dC5cbiAqXG4gKiBXb3JrcyB3aXRoIFdyaXRlLCBFZGl0LCBNdWx0aUVkaXQsIGFuZCBSZWFkIHRvb2xzLlxuICogUmV0dXJucyBudWxsIGZvciBvdGhlciB0b29scyBvciBpZiBmaWxlX3BhdGggaXMgbWlzc2luZy5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGV4dHJhY3QgZnJvbVxuICogQHJldHVybnMgVGhlIGZpbGUgcGF0aCwgb3IgbnVsbCBpZiBub3QgYXBwbGljYWJsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVQYXRoID0gZ2V0RmlsZVBhdGgoaW5wdXQpO1xuICogaWYgKGZpbGVQYXRoICYmIGlzVHNGaWxlKGZpbGVQYXRoKSkge1xuICogICAvLyBIYW5kbGUgVHlwZVNjcmlwdCBmaWxlXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVQYXRoKGlucHV0KSB7XG4gICAgY29uc3QgdG9vbElucHV0ID0gaW5wdXQudG9vbF9pbnB1dDtcbiAgICBpZiAodG9vbElucHV0ICYmIHR5cGVvZiB0b29sSW5wdXQgPT09IFwib2JqZWN0XCIgJiYgXCJmaWxlX3BhdGhcIiBpbiB0b29sSW5wdXQpIHtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSB0b29sSW5wdXQuZmlsZV9wYXRoO1xuICAgICAgICByZXR1cm4gdHlwZW9mIGZpbGVQYXRoID09PSBcInN0cmluZ1wiID8gZmlsZVBhdGggOiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8qKlxuICogQ2hlY2tzIGlmIGEgZmlsZSBwYXRoIGlzIGEgSmF2YVNjcmlwdCBvciBUeXBlU2NyaXB0IGZpbGUuXG4gKlxuICogTWF0Y2hlcyAuanMsIC5qc3gsIC50cywgLnRzeCwgLm1qcywgLm10cywgLmNqcywgLmN0cyBleHRlbnNpb25zLlxuICogQHBhcmFtIGZpbGVQYXRoIC0gVGhlIGZpbGUgcGF0aCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgZmlsZSBpcyBKYXZhU2NyaXB0IG9yIFR5cGVTY3JpcHRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNKc1RzRmlsZShmaWxlUGF0aCkpIHtcbiAqICAgLy8gQ2hlY2sgZm9yIFR5cGVTY3JpcHQtc3BlY2lmaWMgcGF0dGVybnNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNKc1RzRmlsZShmaWxlUGF0aCkge1xuICAgIHJldHVybiAvXFwuW2NtXT9banRdc3g/JC8udGVzdChmaWxlUGF0aCk7XG59XG4vKipcbiAqIENoZWNrcyBpZiBhIGZpbGUgcGF0aCBpcyBhIFR5cGVTY3JpcHQgZmlsZS5cbiAqXG4gKiBNYXRjaGVzIC50cywgLnRzeCwgLm10cywgLmN0cyBleHRlbnNpb25zLlxuICogQHBhcmFtIGZpbGVQYXRoIC0gVGhlIGZpbGUgcGF0aCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgZmlsZSBpcyBUeXBlU2NyaXB0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzVHNGaWxlKGZpbGVQYXRoKSkge1xuICogICAvLyBFbmZvcmNlIFR5cGVTY3JpcHQtc3BlY2lmaWMgcnVsZXNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUc0ZpbGUoZmlsZVBhdGgpIHtcbiAgICByZXR1cm4gL1xcLltjbV0/dHN4PyQvLnRlc3QoZmlsZVBhdGgpO1xufVxuLyoqXG4gKiBDaGVja3MgaWYgYSBwYXR0ZXJuIGV4aXN0cyBpbiB0aGUgY29udGVudCBiZWluZyB3cml0dGVuIG9yIGVkaXRlZC5cbiAqXG4gKiBGb3IgV3JpdGU6IGNoZWNrcyB0aGUgY29udGVudCBiZWluZyB3cml0dGVuXG4gKiBGb3IgRWRpdDogY2hlY2tzIG5ld19zdHJpbmcgKGFuZCBvbGRfc3RyaW5nIHRvIGRldGVjdCBhZGRpdGlvbnMpXG4gKiBGb3IgTXVsdGlFZGl0OiBjaGVja3MgYWxsIGVkaXRzIGFuZCBhZ2dyZWdhdGVzIHJlc3VsdHNcbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBQcmVUb29sVXNlIGhvb2sgaW5wdXRcbiAqIEBwYXJhbSBwYXR0ZXJuIC0gVGhlIHJlZ2V4IHBhdHRlcm4gdG8gc2VhcmNoIGZvciAoZ2xvYmFsIGZsYWcgd2lsbCBiZSB1c2VkKVxuICogQHJldHVybnMgUmVzdWx0IG9iamVjdCwgb3IgbnVsbCBpZiBub3QgYSBmaWxlLW1vZGlmeWluZyB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQmxvY2sgQHRzLWV4cGVjdC1lcnJvciBiZWluZyBhZGRlZFxuICogY29uc3QgcmVzdWx0ID0gY2hlY2tDb250ZW50Rm9yUGF0dGVybihpbnB1dCwgL0B0cy1leHBlY3QtZXJyb3IvZyk7XG4gKiBpZiAocmVzdWx0Py5pc0FkZGl0aW9uKSB7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2RlbnknLFxuICogICAgICAgcGVybWlzc2lvbkRlY2lzaW9uUmVhc29uOiBgQ2Fubm90IGFkZDogJHtyZXN1bHQubWF0Y2hlcy5qb2luKCcsICcpfWBcbiAqICAgICB9XG4gKiAgIH0pO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaGVja0NvbnRlbnRGb3JQYXR0ZXJuKGlucHV0LCBwYXR0ZXJuKSB7XG4gICAgLy8gRW5zdXJlIHBhdHRlcm4gaGFzIGdsb2JhbCBmbGFnIGZvciBtYXRjaEFsbFxuICAgIGNvbnN0IGdsb2JhbFBhdHRlcm4gPSBwYXR0ZXJuLmdsb2JhbCA/IHBhdHRlcm4gOiBuZXcgUmVnRXhwKHBhdHRlcm4uc291cmNlLCBgJHtwYXR0ZXJuLmZsYWdzfWdgKTtcbiAgICBpZiAoaXNXcml0ZVRvb2woaW5wdXQpKSB7XG4gICAgICAgIGNvbnN0IG1hdGNoZXMgPSBbLi4uaW5wdXQudG9vbF9pbnB1dC5jb250ZW50Lm1hdGNoQWxsKGdsb2JhbFBhdHRlcm4pXS5tYXAoKG0pID0+IG1bMF0pO1xuICAgICAgICBjb25zdCB1bmlxdWVNYXRjaGVzID0gWy4uLm5ldyBTZXQobWF0Y2hlcyldO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZm91bmQ6IHVuaXF1ZU1hdGNoZXMubGVuZ3RoID4gMCxcbiAgICAgICAgICAgIGlzQWRkaXRpb246IHVuaXF1ZU1hdGNoZXMubGVuZ3RoID4gMCwgLy8gRm9yIFdyaXRlLCBhbnkgbWF0Y2ggaXMgYW4gYWRkaXRpb25cbiAgICAgICAgICAgIG1hdGNoZXM6IHVuaXF1ZU1hdGNoZXMsXG4gICAgICAgIH07XG4gICAgfVxuICAgIGlmIChpc0VkaXRUb29sKGlucHV0KSkge1xuICAgICAgICBjb25zdCBuZXdNYXRjaGVzID0gWy4uLmlucHV0LnRvb2xfaW5wdXQubmV3X3N0cmluZy5tYXRjaEFsbChnbG9iYWxQYXR0ZXJuKV0ubWFwKChtKSA9PiBtWzBdKTtcbiAgICAgICAgY29uc3Qgb2xkTWF0Y2hlcyA9IFsuLi5pbnB1dC50b29sX2lucHV0Lm9sZF9zdHJpbmcubWF0Y2hBbGwoZ2xvYmFsUGF0dGVybildLm1hcCgobSkgPT4gbVswXSk7XG4gICAgICAgIGNvbnN0IHVuaXF1ZU5ld01hdGNoZXMgPSBbLi4ubmV3IFNldChuZXdNYXRjaGVzKV07XG4gICAgICAgIGNvbnN0IHVuaXF1ZU9sZE1hdGNoZXMgPSBuZXcgU2V0KG9sZE1hdGNoZXMpO1xuICAgICAgICAvLyBBZGRpdGlvbiA9IGZvdW5kIGluIG5ldyBidXQgbm90IGluIG9sZFxuICAgICAgICBjb25zdCBhZGRpdGlvbnMgPSB1bmlxdWVOZXdNYXRjaGVzLmZpbHRlcigobSkgPT4gIXVuaXF1ZU9sZE1hdGNoZXMuaGFzKG0pKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGZvdW5kOiB1bmlxdWVOZXdNYXRjaGVzLmxlbmd0aCA+IDAsXG4gICAgICAgICAgICBpc0FkZGl0aW9uOiBhZGRpdGlvbnMubGVuZ3RoID4gMCxcbiAgICAgICAgICAgIG1hdGNoZXM6IHVuaXF1ZU5ld01hdGNoZXMsXG4gICAgICAgIH07XG4gICAgfVxuICAgIGlmIChpc011bHRpRWRpdFRvb2woaW5wdXQpKSB7XG4gICAgICAgIGNvbnN0IGRldGFpbHMgPSBbXTtcbiAgICAgICAgY29uc3QgYWxsTWF0Y2hlcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgbGV0IGFueUZvdW5kID0gZmFsc2U7XG4gICAgICAgIGxldCBhbnlBZGRpdGlvbiA9IGZhbHNlO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0LnRvb2xfaW5wdXQuZWRpdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGVkaXQgPSBpbnB1dC50b29sX2lucHV0LmVkaXRzW2ldO1xuICAgICAgICAgICAgY29uc3QgbmV3TWF0Y2hlcyA9IFsuLi5lZGl0Lm5ld19zdHJpbmcubWF0Y2hBbGwoZ2xvYmFsUGF0dGVybildLm1hcCgobSkgPT4gbVswXSk7XG4gICAgICAgICAgICBjb25zdCBvbGRNYXRjaGVzID0gWy4uLmVkaXQub2xkX3N0cmluZy5tYXRjaEFsbChnbG9iYWxQYXR0ZXJuKV0ubWFwKChtKSA9PiBtWzBdKTtcbiAgICAgICAgICAgIGNvbnN0IHVuaXF1ZU5ld01hdGNoZXMgPSBbLi4ubmV3IFNldChuZXdNYXRjaGVzKV07XG4gICAgICAgICAgICBjb25zdCB1bmlxdWVPbGRNYXRjaGVzID0gbmV3IFNldChvbGRNYXRjaGVzKTtcbiAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9ucyA9IHVuaXF1ZU5ld01hdGNoZXMuZmlsdGVyKChtKSA9PiAhdW5pcXVlT2xkTWF0Y2hlcy5oYXMobSkpO1xuICAgICAgICAgICAgY29uc3QgZm91bmQgPSB1bmlxdWVOZXdNYXRjaGVzLmxlbmd0aCA+IDA7XG4gICAgICAgICAgICBjb25zdCBpc0FkZGl0aW9uID0gYWRkaXRpb25zLmxlbmd0aCA+IDA7XG4gICAgICAgICAgICBpZiAoZm91bmQpXG4gICAgICAgICAgICAgICAgYW55Rm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKGlzQWRkaXRpb24pXG4gICAgICAgICAgICAgICAgYW55QWRkaXRpb24gPSB0cnVlO1xuICAgICAgICAgICAgZm9yIChjb25zdCBtIG9mIHVuaXF1ZU5ld01hdGNoZXMpIHtcbiAgICAgICAgICAgICAgICBhbGxNYXRjaGVzLmFkZChtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRldGFpbHMucHVzaCh7XG4gICAgICAgICAgICAgICAgaW5kZXg6IGksXG4gICAgICAgICAgICAgICAgZm91bmQsXG4gICAgICAgICAgICAgICAgaXNBZGRpdGlvbixcbiAgICAgICAgICAgICAgICBtYXRjaGVzOiB1bmlxdWVOZXdNYXRjaGVzLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGZvdW5kOiBhbnlGb3VuZCxcbiAgICAgICAgICAgIGlzQWRkaXRpb246IGFueUFkZGl0aW9uLFxuICAgICAgICAgICAgbWF0Y2hlczogWy4uLmFsbE1hdGNoZXNdLFxuICAgICAgICAgICAgZGV0YWlscyxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG4vKipcbiAqIEl0ZXJhdGVzIG92ZXIgY29udGVudCBpbiBXcml0ZS9FZGl0L011bHRpRWRpdCBvcGVyYXRpb25zLlxuICpcbiAqIFByb3ZpZGVzIGEgdW5pZmllZCB3YXkgdG8gaW5zcGVjdCBjb250ZW50IHJlZ2FyZGxlc3Mgb2Ygb3BlcmF0aW9uIHR5cGUuXG4gKiBSZXR1cm4gZmFsc2UgZnJvbSB0aGUgY2FsbGJhY2sgdG8gc3RvcCBpdGVyYXRpb24gZWFybHkuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgUHJlVG9vbFVzZSBob29rIGlucHV0XG4gKiBAcGFyYW0gY2FsbGJhY2sgLSBGdW5jdGlvbiBjYWxsZWQgZm9yIGVhY2ggY29udGVudCBwaWVjZSwgcmV0dXJuIGZhbHNlIHRvIHN0b3BcbiAqIEByZXR1cm5zIFRydWUgaWYgYWxsIGNhbGxiYWNrcyByZXR1cm5lZCB0cnVlLCBmYWxzZSBpZiBzdG9wcGVkIGVhcmx5IG9yIG5vdCBhcHBsaWNhYmxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQ2hlY2sgYWxsIGNvbnRlbnQgZm9yIHNlbnNpdGl2ZSBkYXRhXG4gKiBjb25zdCBoYXNTZW5zaXRpdmUgPSAhZm9yRWFjaENvbnRlbnQoaW5wdXQsICh7IG5ld0NvbnRlbnQgfSkgPT4ge1xuICogICBpZiAoL3Bhc3N3b3JkfHNlY3JldHxhcGkuP2tleS9pLnRlc3QobmV3Q29udGVudCkpIHtcbiAqICAgICByZXR1cm4gZmFsc2U7IC8vIFN0b3AgLSBmb3VuZCBzZW5zaXRpdmUgZGF0YVxuICogICB9XG4gKiAgIHJldHVybiB0cnVlOyAvLyBDb250aW51ZVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvckVhY2hDb250ZW50KGlucHV0LCBjYWxsYmFjaykge1xuICAgIGlmIChpc1dyaXRlVG9vbChpbnB1dCkpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHtcbiAgICAgICAgICAgIG5ld0NvbnRlbnQ6IGlucHV0LnRvb2xfaW5wdXQuY29udGVudCxcbiAgICAgICAgICAgIG9sZENvbnRlbnQ6IG51bGwsXG4gICAgICAgICAgICBpbmRleDogMCxcbiAgICAgICAgICAgIGlzV3JpdGU6IHRydWUsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoaXNFZGl0VG9vbChpbnB1dCkpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHtcbiAgICAgICAgICAgIG5ld0NvbnRlbnQ6IGlucHV0LnRvb2xfaW5wdXQubmV3X3N0cmluZyxcbiAgICAgICAgICAgIG9sZENvbnRlbnQ6IGlucHV0LnRvb2xfaW5wdXQub2xkX3N0cmluZyxcbiAgICAgICAgICAgIGluZGV4OiAwLFxuICAgICAgICAgICAgaXNXcml0ZTogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoaXNNdWx0aUVkaXRUb29sKGlucHV0KSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0LnRvb2xfaW5wdXQuZWRpdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGVkaXQgPSBpbnB1dC50b29sX2lucHV0LmVkaXRzW2ldO1xuICAgICAgICAgICAgY29uc3Qgc2hvdWxkQ29udGludWUgPSBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgbmV3Q29udGVudDogZWRpdC5uZXdfc3RyaW5nLFxuICAgICAgICAgICAgICAgIG9sZENvbnRlbnQ6IGVkaXQub2xkX3N0cmluZyxcbiAgICAgICAgICAgICAgICBpbmRleDogaSxcbiAgICAgICAgICAgICAgICBpc1dyaXRlOiBmYWxzZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFzaG91bGRDb250aW51ZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbiIsICIvKipcbiAqIEFkYXB0aXZlIENhcmRzIHZhbGlkYXRpb24gZnVuY3Rpb25zLlxuICpcbiAqIEBtb2R1bGUgY2FyZFxuICovXG5cbmltcG9ydCB0eXBlIHsgQ2FyZCwgQ2FyZFN0YXR1cyB9IGZyb20gJ0Bnb29kZm9vdC9pc3N1ZXMtcHJvdG9jb2wnO1xuaW1wb3J0IHR5cGUgeyBGaWVsZFZhbGlkYXRpb25FcnJvciwgVmFsaWRhdGlvblJlc3VsdCB9IGZyb20gJy4vdHlwZXMuanMnO1xuXG5jb25zdCBDQVJEX1NUQVRVU0VTID0gWydhY3RpdmUnLCAnY29tcGxldGVkJ10gYXMgY29uc3Qgc2F0aXNmaWVzIHJlYWRvbmx5IENhcmRTdGF0dXNbXTtcbmNvbnN0IE1BWF9TVU1NQVJZX0xFTkdUSCA9IDIwMDtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSB2YWx1ZSBpcyBhIG5vbi1udWxsLCBub24tYXJyYXkgb2JqZWN0LlxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlcyBhIHJlcXVpcmVkIHN0cmluZyBmaWVsZCBhbmQgYWRkcyBlcnJvcnMgaWYgaW52YWxpZC5cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVSZXF1aXJlZFN0cmluZyhcbiAgb2JqOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgZmllbGQ6IHN0cmluZyxcbiAgcGF0aDogc3RyaW5nLFxuICBjb250ZXh0OiBzdHJpbmcsXG4gIGVycm9yczogRmllbGRWYWxpZGF0aW9uRXJyb3JbXVxuKTogdm9pZCB7XG4gIGNvbnN0IHZhbHVlID0gb2JqW2ZpZWxkXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS4ke2ZpZWxkfWAsIG1lc3NhZ2U6IGAke2ZpZWxkfSBpcyByZXF1aXJlZCBmb3IgJHtjb250ZXh0fWAsIGNvZGU6ICdtaXNzaW5nX2ZpZWxkJyB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7cGF0aH0uJHtmaWVsZH1gLCBtZXNzYWdlOiBgJHtmaWVsZH0gbXVzdCBiZSBhIHN0cmluZ2AsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICB9XG59XG5cbi8qKlxuICogVmFsaWRhdGVzIGEgcmVxdWlyZWQgYXJyYXkgZmllbGQgYW5kIHJldHVybnMgdGhlIGFycmF5IGlmIHZhbGlkLlxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZVJlcXVpcmVkQXJyYXkoXG4gIG9iajogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGZpZWxkOiBzdHJpbmcsXG4gIHBhdGg6IHN0cmluZyxcbiAgY29udGV4dDogc3RyaW5nLFxuICBlcnJvcnM6IEZpZWxkVmFsaWRhdGlvbkVycm9yW11cbik6IHVua25vd25bXSB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gb2JqW2ZpZWxkXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS4ke2ZpZWxkfWAsIG1lc3NhZ2U6IGAke2ZpZWxkfSBpcyByZXF1aXJlZCBmb3IgJHtjb250ZXh0fWAsIGNvZGU6ICdtaXNzaW5nX2ZpZWxkJyB9KTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS4ke2ZpZWxkfWAsIG1lc3NhZ2U6IGAke2ZpZWxkfSBtdXN0IGJlIGFuIGFycmF5YCwgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogVmFsaWRhdGVzIGEgYm9keSBlbGVtZW50IGluIGFuIEFkYXB0aXZlIENhcmQuXG4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlQm9keUVsZW1lbnQoZWxlbWVudDogdW5rbm93biwgcGF0aDogc3RyaW5nLCBlcnJvcnM6IEZpZWxkVmFsaWRhdGlvbkVycm9yW10pOiB2b2lkIHtcbiAgaWYgKCFpc09iamVjdChlbGVtZW50KSkge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IHBhdGgsIG1lc3NhZ2U6ICdib2R5IGVsZW1lbnQgbXVzdCBiZSBhbiBvYmplY3QnLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBlbCA9IGVsZW1lbnQ7XG4gIGNvbnN0IGVsVHlwZSA9IGVsWyd0eXBlJ107XG5cbiAgaWYgKGVsVHlwZSA9PT0gdW5kZWZpbmVkIHx8IGVsVHlwZSA9PT0gbnVsbCkge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LnR5cGVgLCBtZXNzYWdlOiAndHlwZSBpcyByZXF1aXJlZCBmb3IgYm9keSBlbGVtZW50JywgY29kZTogJ21pc3NpbmdfZmllbGQnIH0pO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAodHlwZW9mIGVsVHlwZSAhPT0gJ3N0cmluZycpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS50eXBlYCwgbWVzc2FnZTogJ3R5cGUgbXVzdCBiZSBhIHN0cmluZycsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHN3aXRjaCAoZWxUeXBlKSB7XG4gICAgY2FzZSAnVGV4dEJsb2NrJzpcbiAgICAgIHZhbGlkYXRlUmVxdWlyZWRTdHJpbmcoZWwsICd0ZXh0JywgcGF0aCwgJ1RleHRCbG9jaycsIGVycm9ycyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ0ltYWdlJzpcbiAgICAgIHZhbGlkYXRlUmVxdWlyZWRTdHJpbmcoZWwsICd1cmwnLCBwYXRoLCAnSW1hZ2UnLCBlcnJvcnMpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdDb250YWluZXInOiB7XG4gICAgICBjb25zdCBpdGVtcyA9IHZhbGlkYXRlUmVxdWlyZWRBcnJheShlbCwgJ2l0ZW1zJywgcGF0aCwgJ0NvbnRhaW5lcicsIGVycm9ycyk7XG4gICAgICBpdGVtcz8uZm9yRWFjaCgoaXRlbSwgaSkgPT4ge1xuICAgICAgICB2YWxpZGF0ZUJvZHlFbGVtZW50KGl0ZW0sIGAke3BhdGh9Lml0ZW1zWyR7aX1dYCwgZXJyb3JzKTtcbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY2FzZSAnQ29sdW1uU2V0Jzoge1xuICAgICAgY29uc3QgY29sdW1ucyA9IHZhbGlkYXRlUmVxdWlyZWRBcnJheShlbCwgJ2NvbHVtbnMnLCBwYXRoLCAnQ29sdW1uU2V0JywgZXJyb3JzKTtcbiAgICAgIGNvbHVtbnM/LmZvckVhY2goKGNvbHVtbiwgaSkgPT4ge1xuICAgICAgICBjb25zdCBjb2xQYXRoID0gYCR7cGF0aH0uY29sdW1uc1ske2l9XWA7XG4gICAgICAgIGlmICghaXNPYmplY3QoY29sdW1uKSkge1xuICAgICAgICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGNvbFBhdGgsIG1lc3NhZ2U6ICdjb2x1bW4gbXVzdCBiZSBhbiBvYmplY3QnLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbHVtblsndHlwZSddICE9PSAnQ29sdW1uJykge1xuICAgICAgICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke2NvbFBhdGh9LnR5cGVgLCBtZXNzYWdlOiBcImNvbHVtbiB0eXBlIG11c3QgYmUgJ0NvbHVtbidcIiwgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbHVtblsnaXRlbXMnXSAhPT0gdW5kZWZpbmVkICYmIGNvbHVtblsnaXRlbXMnXSAhPT0gbnVsbCkge1xuICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShjb2x1bW5bJ2l0ZW1zJ10pKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtjb2xQYXRofS5pdGVtc2AsIG1lc3NhZ2U6ICdpdGVtcyBtdXN0IGJlIGFuIGFycmF5JywgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIChjb2x1bW5bJ2l0ZW1zJ10gYXMgdW5rbm93bltdKS5mb3JFYWNoKChpdGVtLCBqKSA9PiB7XG4gICAgICAgICAgICAgIHZhbGlkYXRlQm9keUVsZW1lbnQoaXRlbSwgYCR7Y29sUGF0aH0uaXRlbXNbJHtqfV1gLCBlcnJvcnMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGNhc2UgJ0FjdGlvblNldCc6IHtcbiAgICAgIGNvbnN0IGFjdGlvbnMgPSB2YWxpZGF0ZVJlcXVpcmVkQXJyYXkoZWwsICdhY3Rpb25zJywgcGF0aCwgJ0FjdGlvblNldCcsIGVycm9ycyk7XG4gICAgICBhY3Rpb25zPy5mb3JFYWNoKChhY3Rpb24sIGkpID0+IHtcbiAgICAgICAgdmFsaWRhdGVBY3Rpb24oYWN0aW9uLCBgJHtwYXRofS5hY3Rpb25zWyR7aX1dYCwgZXJyb3JzKTtcbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY2FzZSAnRmFjdFNldCc6IHtcbiAgICAgIGNvbnN0IGZhY3RzID0gdmFsaWRhdGVSZXF1aXJlZEFycmF5KGVsLCAnZmFjdHMnLCBwYXRoLCAnRmFjdFNldCcsIGVycm9ycyk7XG4gICAgICBmYWN0cz8uZm9yRWFjaCgoZmFjdCwgaSkgPT4ge1xuICAgICAgICBjb25zdCBmYWN0UGF0aCA9IGAke3BhdGh9LmZhY3RzWyR7aX1dYDtcbiAgICAgICAgaWYgKCFpc09iamVjdChmYWN0KSkge1xuICAgICAgICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGZhY3RQYXRoLCBtZXNzYWdlOiAnZmFjdCBtdXN0IGJlIGFuIG9iamVjdCcsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmFjdFsndGl0bGUnXSA9PT0gdW5kZWZpbmVkIHx8IGZhY3RbJ3RpdGxlJ10gPT09IG51bGwpIHtcbiAgICAgICAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtmYWN0UGF0aH0udGl0bGVgLCBtZXNzYWdlOiAndGl0bGUgaXMgcmVxdWlyZWQgZm9yIGZhY3QnLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZhY3RbJ3ZhbHVlJ10gPT09IHVuZGVmaW5lZCB8fCBmYWN0Wyd2YWx1ZSddID09PSBudWxsKSB7XG4gICAgICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7ZmFjdFBhdGh9LnZhbHVlYCwgbWVzc2FnZTogJ3ZhbHVlIGlzIHJlcXVpcmVkIGZvciBmYWN0JywgY29kZTogJ21pc3NpbmdfZmllbGQnIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGNhc2UgJ0lucHV0LlRleHQnOlxuICAgIGNhc2UgJ0lucHV0Lk51bWJlcic6XG4gICAgY2FzZSAnSW5wdXQuRGF0ZSc6XG4gICAgY2FzZSAnSW5wdXQuVGltZSc6XG4gICAgY2FzZSAnSW5wdXQuVG9nZ2xlJzpcbiAgICBjYXNlICdJbnB1dC5DaG9pY2VTZXQnOlxuICAgICAgdmFsaWRhdGVSZXF1aXJlZFN0cmluZyhlbCwgJ2lkJywgcGF0aCwgZWxUeXBlLCBlcnJvcnMpO1xuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgLy8gVW5rbm93biBlbGVtZW50IHR5cGUgLSBhbGxvdyBmb3IgZm9yd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICBicmVhaztcbiAgfVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyBhbiBhY3Rpb24gaW4gYW4gQWRhcHRpdmUgQ2FyZC5cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVBY3Rpb24oYWN0aW9uOiB1bmtub3duLCBwYXRoOiBzdHJpbmcsIGVycm9yczogRmllbGRWYWxpZGF0aW9uRXJyb3JbXSk6IHZvaWQge1xuICBpZiAoIWlzT2JqZWN0KGFjdGlvbikpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBwYXRoLCBtZXNzYWdlOiAnYWN0aW9uIG11c3QgYmUgYW4gb2JqZWN0JywgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgYWN0ID0gYWN0aW9uO1xuICBjb25zdCBhY3RUeXBlID0gYWN0Wyd0eXBlJ107XG5cbiAgaWYgKGFjdFR5cGUgPT09IHVuZGVmaW5lZCB8fCBhY3RUeXBlID09PSBudWxsKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7cGF0aH0udHlwZWAsIG1lc3NhZ2U6ICd0eXBlIGlzIHJlcXVpcmVkIGZvciBhY3Rpb24nLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh0eXBlb2YgYWN0VHlwZSAhPT0gJ3N0cmluZycpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS50eXBlYCwgbWVzc2FnZTogJ3R5cGUgbXVzdCBiZSBhIHN0cmluZycsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHN3aXRjaCAoYWN0VHlwZSkge1xuICAgIGNhc2UgJ0FjdGlvbi5TdWJtaXQnOlxuICAgICAgLy8gTm8gcmVxdWlyZWQgZmllbGRzIGJleW9uZCB0eXBlXG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ0FjdGlvbi5PcGVuVXJsJzpcbiAgICAgIHZhbGlkYXRlUmVxdWlyZWRTdHJpbmcoYWN0LCAndXJsJywgcGF0aCwgJ0FjdGlvbi5PcGVuVXJsJywgZXJyb3JzKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnQWN0aW9uLlNob3dDYXJkJzoge1xuICAgICAgY29uc3QgbmVzdGVkQ2FyZCA9IGFjdFsnY2FyZCddO1xuICAgICAgaWYgKG5lc3RlZENhcmQgPT09IHVuZGVmaW5lZCB8fCBuZXN0ZWRDYXJkID09PSBudWxsKSB7XG4gICAgICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LmNhcmRgLCBtZXNzYWdlOiAnY2FyZCBpcyByZXF1aXJlZCBmb3IgQWN0aW9uLlNob3dDYXJkJywgY29kZTogJ21pc3NpbmdfZmllbGQnIH0pO1xuICAgICAgfSBlbHNlIGlmICghaXNPYmplY3QobmVzdGVkQ2FyZCkpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7cGF0aH0uY2FyZGAsIG1lc3NhZ2U6ICdjYXJkIG11c3QgYmUgYW4gb2JqZWN0JywgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBWYWxpZGF0ZSBuZXN0ZWQgY2FyZCB0eXBlXG4gICAgICAgIGlmIChuZXN0ZWRDYXJkWyd0eXBlJ10gPT09IHVuZGVmaW5lZCB8fCBuZXN0ZWRDYXJkWyd0eXBlJ10gPT09IG51bGwpIHtcbiAgICAgICAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS5jYXJkLnR5cGVgLCBtZXNzYWdlOiAnY2FyZC50eXBlIGlzIHJlcXVpcmVkJywgY29kZTogJ21pc3NpbmdfZmllbGQnIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKG5lc3RlZENhcmRbJ3R5cGUnXSAhPT0gJ0FkYXB0aXZlQ2FyZCcpIHtcbiAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICBmaWVsZDogYCR7cGF0aH0uY2FyZC50eXBlYCxcbiAgICAgICAgICAgIG1lc3NhZ2U6IFwiY2FyZC50eXBlIG11c3QgYmUgJ0FkYXB0aXZlQ2FyZCdcIixcbiAgICAgICAgICAgIGNvZGU6ICdpbnZhbGlkX3R5cGUnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBWYWxpZGF0ZSBuZXN0ZWQgY2FyZCBib2R5IGlmIHByZXNlbnRcbiAgICAgICAgaWYgKG5lc3RlZENhcmRbJ2JvZHknXSAhPT0gdW5kZWZpbmVkICYmIG5lc3RlZENhcmRbJ2JvZHknXSAhPT0gbnVsbCkge1xuICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShuZXN0ZWRDYXJkWydib2R5J10pKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS5jYXJkLmJvZHlgLCBtZXNzYWdlOiAnY2FyZC5ib2R5IG11c3QgYmUgYW4gYXJyYXknLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgKG5lc3RlZENhcmRbJ2JvZHknXSBhcyB1bmtub3duW10pLmZvckVhY2goKGVsZW1lbnQsIGkpID0+IHtcbiAgICAgICAgICAgICAgdmFsaWRhdGVCb2R5RWxlbWVudChlbGVtZW50LCBgJHtwYXRofS5jYXJkLmJvZHlbJHtpfV1gLCBlcnJvcnMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVmFsaWRhdGUgbmVzdGVkIGNhcmQgYWN0aW9ucyBpZiBwcmVzZW50XG4gICAgICAgIGlmIChuZXN0ZWRDYXJkWydhY3Rpb25zJ10gIT09IHVuZGVmaW5lZCAmJiBuZXN0ZWRDYXJkWydhY3Rpb25zJ10gIT09IG51bGwpIHtcbiAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobmVzdGVkQ2FyZFsnYWN0aW9ucyddKSkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICBmaWVsZDogYCR7cGF0aH0uY2FyZC5hY3Rpb25zYCxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ2NhcmQuYWN0aW9ucyBtdXN0IGJlIGFuIGFycmF5JyxcbiAgICAgICAgICAgICAgY29kZTogJ2ludmFsaWRfdHlwZSdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAobmVzdGVkQ2FyZFsnYWN0aW9ucyddIGFzIHVua25vd25bXSkuZm9yRWFjaCgobmVzdGVkQWN0aW9uLCBpKSA9PiB7XG4gICAgICAgICAgICAgIHZhbGlkYXRlQWN0aW9uKG5lc3RlZEFjdGlvbiwgYCR7cGF0aH0uY2FyZC5hY3Rpb25zWyR7aX1dYCwgZXJyb3JzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY2FzZSAnQWN0aW9uLlRvZ2dsZVZpc2liaWxpdHknOiB7XG4gICAgICBjb25zdCB0YXJnZXRzID0gdmFsaWRhdGVSZXF1aXJlZEFycmF5KGFjdCwgJ3RhcmdldEVsZW1lbnRzJywgcGF0aCwgJ0FjdGlvbi5Ub2dnbGVWaXNpYmlsaXR5JywgZXJyb3JzKTtcbiAgICAgIHRhcmdldHM/LmZvckVhY2goKHRhcmdldCwgaSkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHRhcmdldCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICBmaWVsZDogYCR7cGF0aH0udGFyZ2V0RWxlbWVudHNbJHtpfV1gLFxuICAgICAgICAgICAgbWVzc2FnZTogJ3RhcmdldEVsZW1lbnQgbXVzdCBiZSBhIHN0cmluZycsXG4gICAgICAgICAgICBjb2RlOiAnaW52YWxpZF90eXBlJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBVbmtub3duIGFjdGlvbiB0eXBlIC0gYWxsb3cgZm9yIGZvcndhcmQgY29tcGF0aWJpbGl0eVxuICAgICAgYnJlYWs7XG4gIH1cbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgb3B0aW9uYWwgc3RyaW5nIGZpZWxkIG9uIGFkYXB0aXZlIGNhcmQuXG4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlT3B0aW9uYWxTdHJpbmcoXG4gIG9iajogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGZpZWxkOiBzdHJpbmcsXG4gIHBhdGg6IHN0cmluZyxcbiAgZXJyb3JzOiBGaWVsZFZhbGlkYXRpb25FcnJvcltdXG4pOiB2b2lkIHtcbiAgY29uc3QgdmFsdWUgPSBvYmpbZmllbGRdO1xuICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7cGF0aH0uJHtmaWVsZH1gLCBtZXNzYWdlOiBgJHtwYXRofS4ke2ZpZWxkfSBtdXN0IGJlIGEgc3RyaW5nYCwgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgb3B0aW9uYWwgYXJyYXkgZmllbGQgb24gYWRhcHRpdmUgY2FyZCBhbmQgcmV0dXJucyBpdCBpZiB2YWxpZC5cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVPcHRpb25hbEFycmF5KFxuICBvYmo6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBmaWVsZDogc3RyaW5nLFxuICBwYXRoOiBzdHJpbmcsXG4gIGVycm9yczogRmllbGRWYWxpZGF0aW9uRXJyb3JbXVxuKTogdW5rbm93bltdIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBvYmpbZmllbGRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LiR7ZmllbGR9YCwgbWVzc2FnZTogYCR7cGF0aH0uJHtmaWVsZH0gbXVzdCBiZSBhbiBhcnJheWAsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5jb25zdCBTRU1WRVJfUEFUVEVSTiA9IC9eXFxkK1xcLlxcZCsoXFwuXFxkKyk/JC87XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoZSBpbm5lciBBZGFwdGl2ZSBDYXJkIHNjaGVtYS5cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVBZGFwdGl2ZUNhcmRTY2hlbWEoXG4gIGFkYXB0aXZlQ2FyZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGNhcmRTdGF0dXM6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgZXJyb3JzOiBGaWVsZFZhbGlkYXRpb25FcnJvcltdXG4pOiB2b2lkIHtcbiAgLy8gdHlwZSBpcyByZXF1aXJlZCBhbmQgbXVzdCBiZSAnQWRhcHRpdmVDYXJkJ1xuICBpZiAoYWRhcHRpdmVDYXJkWyd0eXBlJ10gPT09IHVuZGVmaW5lZCB8fCBhZGFwdGl2ZUNhcmRbJ3R5cGUnXSA9PT0gbnVsbCkge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6ICdjYXJkLnR5cGUnLCBtZXNzYWdlOiAnY2FyZC50eXBlIGlzIHJlcXVpcmVkJywgY29kZTogJ21pc3NpbmdfZmllbGQnIH0pO1xuICB9IGVsc2UgaWYgKGFkYXB0aXZlQ2FyZFsndHlwZSddICE9PSAnQWRhcHRpdmVDYXJkJykge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6ICdjYXJkLnR5cGUnLCBtZXNzYWdlOiBcImNhcmQudHlwZSBtdXN0IGJlICdBZGFwdGl2ZUNhcmQnXCIsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICB9XG5cbiAgdmFsaWRhdGVPcHRpb25hbFN0cmluZyhhZGFwdGl2ZUNhcmQsICd2ZXJzaW9uJywgJ2NhcmQnLCBlcnJvcnMpO1xuXG4gIGNvbnN0IGJvZHkgPSB2YWxpZGF0ZU9wdGlvbmFsQXJyYXkoYWRhcHRpdmVDYXJkLCAnYm9keScsICdjYXJkJywgZXJyb3JzKTtcbiAgYm9keT8uZm9yRWFjaCgoZWxlbWVudCwgaSkgPT4ge1xuICAgIHZhbGlkYXRlQm9keUVsZW1lbnQoZWxlbWVudCwgYGNhcmQuYm9keVske2l9XWAsIGVycm9ycyk7XG4gIH0pO1xuXG4gIGNvbnN0IGFjdGlvbnMgPSB2YWxpZGF0ZU9wdGlvbmFsQXJyYXkoYWRhcHRpdmVDYXJkLCAnYWN0aW9ucycsICdjYXJkJywgZXJyb3JzKTtcbiAgYWN0aW9ucz8uZm9yRWFjaCgoYWN0aW9uLCBpKSA9PiB7XG4gICAgdmFsaWRhdGVBY3Rpb24oYWN0aW9uLCBgY2FyZC5hY3Rpb25zWyR7aX1dYCwgZXJyb3JzKTtcbiAgfSk7XG5cbiAgLy8gJHNjaGVtYSBpcyBvcHRpb25hbCBidXQgbXVzdCBiZSB2YWxpZCBVUkwgaWYgcHJlc2VudFxuICBjb25zdCBzY2hlbWEgPSBhZGFwdGl2ZUNhcmRbJyRzY2hlbWEnXTtcbiAgaWYgKHNjaGVtYSAhPT0gdW5kZWZpbmVkICYmIHNjaGVtYSAhPT0gbnVsbCkge1xuICAgIGlmICh0eXBlb2Ygc2NoZW1hICE9PSAnc3RyaW5nJykge1xuICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogJ2NhcmQuJHNjaGVtYScsIG1lc3NhZ2U6ICdjYXJkLiRzY2hlbWEgbXVzdCBiZSBhIHN0cmluZycsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgVVJMKHNjaGVtYSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAvLyBUeXBlRXJyb3IgaXMgdGhyb3duIGZvciBpbnZhbGlkIFVSTHMgLSB0aGlzIGlzIHRoZSBleHBlY3RlZCB2YWxpZGF0aW9uIGZhaWx1cmVcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgVHlwZUVycm9yKSB7XG4gICAgICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogJ2NhcmQuJHNjaGVtYScsIG1lc3NhZ2U6ICdjYXJkLiRzY2hlbWEgbXVzdCBiZSBhIHZhbGlkIFVSTCcsIGNvZGU6ICdpbnZhbGlkX2Zvcm1hdCcgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBtaW5WZXJzaW9uIGlzIG9wdGlvbmFsIGJ1dCBtdXN0IGJlIHNlbXZlciBmb3JtYXQgaWYgcHJlc2VudFxuICBjb25zdCBtaW5WZXJzaW9uID0gYWRhcHRpdmVDYXJkWydtaW5WZXJzaW9uJ107XG4gIGlmIChtaW5WZXJzaW9uICE9PSB1bmRlZmluZWQgJiYgbWluVmVyc2lvbiAhPT0gbnVsbCkge1xuICAgIGlmICh0eXBlb2YgbWluVmVyc2lvbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6ICdjYXJkLm1pblZlcnNpb24nLCBtZXNzYWdlOiAnY2FyZC5taW5WZXJzaW9uIG11c3QgYmUgYSBzdHJpbmcnLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgICB9IGVsc2UgaWYgKCFTRU1WRVJfUEFUVEVSTi50ZXN0KG1pblZlcnNpb24pKSB7XG4gICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgIGZpZWxkOiAnY2FyZC5taW5WZXJzaW9uJyxcbiAgICAgICAgbWVzc2FnZTogJ2NhcmQubWluVmVyc2lvbiBtdXN0IGJlIGluIHNlbXZlciBmb3JtYXQgKGUuZy4sIDEuNSBvciAxLjUuMCknLFxuICAgICAgICBjb2RlOiAnaW52YWxpZF9mb3JtYXQnXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBDcm9zcy1maWVsZDogd2FybiB3aGVuIHN0YXR1cyBpcyBhY3RpdmUgYnV0IG5vIGFjdGlvbnNcbiAgaWYgKGNhcmRTdGF0dXMgPT09ICdhY3RpdmUnICYmIEFycmF5LmlzQXJyYXkoYWN0aW9ucykgJiYgYWN0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICBlcnJvcnMucHVzaCh7XG4gICAgICBmaWVsZDogJ2NhcmQuYWN0aW9ucycsXG4gICAgICBtZXNzYWdlOiAnQ2FyZCB3aXRoIFwiYWN0aXZlXCIgc3RhdHVzIHNob3VsZCBoYXZlIGF0IGxlYXN0IG9uZSBhY3Rpb24nLFxuICAgICAgY29kZTogJ3dhcm5pbmdfYWN0aXZlX3dpdGhvdXRfYWN0aW9ucydcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFZhbGlkYXRlcyBhbiBBZGFwdGl2ZSBDYXJkIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0gY2FyZCAtIFRoZSBjYXJkIG9iamVjdCB0byB2YWxpZGF0ZVxuICogQHJldHVybnMgVmFsaWRhdGlvblJlc3VsdCBpbmRpY2F0aW5nIHN1Y2Nlc3Mgb3IgZmFpbHVyZSB3aXRoIGVycm9yc1xuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVDYXJkKGNhcmQ6IENhcmQpOiBWYWxpZGF0aW9uUmVzdWx0IHtcbiAgY29uc3QgZXJyb3JzOiBGaWVsZFZhbGlkYXRpb25FcnJvcltdID0gW107XG5cbiAgLy8gVmFsaWRhdGUgaWQgZmllbGRcbiAgaWYgKGNhcmQuaWQgPT09IHVuZGVmaW5lZCB8fCBjYXJkLmlkID09PSBudWxsKSB7XG4gICAgZXJyb3JzLnB1c2goe1xuICAgICAgZmllbGQ6ICdpZCcsXG4gICAgICBtZXNzYWdlOiAnaWQgaXMgcmVxdWlyZWQnLFxuICAgICAgY29kZTogJ21pc3NpbmdfZmllbGQnXG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNhcmQuaWQgIT09ICdzdHJpbmcnKSB7XG4gICAgZXJyb3JzLnB1c2goe1xuICAgICAgZmllbGQ6ICdpZCcsXG4gICAgICBtZXNzYWdlOiAnaWQgbXVzdCBiZSBhIHN0cmluZycsXG4gICAgICBjb2RlOiAnaW52YWxpZF90eXBlJyxcbiAgICAgIGV4cGVjdGVkVHlwZTogJ3N0cmluZydcbiAgICB9KTtcbiAgfSBlbHNlIGlmIChjYXJkLmlkLnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICBlcnJvcnMucHVzaCh7XG4gICAgICBmaWVsZDogJ2lkJyxcbiAgICAgIG1lc3NhZ2U6ICdpZCBtdXN0IG5vdCBiZSBlbXB0eScsXG4gICAgICBjb2RlOiAnaW52YWxpZF9mb3JtYXQnLFxuICAgICAgc3VnZ2VzdGlvbjogJ1Byb3ZpZGUgYSBub24tZW1wdHkgdmFsdWUnXG4gICAgfSk7XG4gIH1cblxuICAvLyBWYWxpZGF0ZSBzdW1tYXJ5IHdpdGggbGVuZ3RoIGNvbnN0cmFpbnRcbiAgaWYgKGNhcmQuc3VtbWFyeSA9PT0gdW5kZWZpbmVkIHx8IGNhcmQuc3VtbWFyeSA9PT0gbnVsbCkge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6ICdzdW1tYXJ5JywgbWVzc2FnZTogJ3N1bW1hcnkgaXMgcmVxdWlyZWQnLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNhcmQuc3VtbWFyeSAhPT0gJ3N0cmluZycpIHtcbiAgICBlcnJvcnMucHVzaCh7XG4gICAgICBmaWVsZDogJ3N1bW1hcnknLFxuICAgICAgbWVzc2FnZTogJ3N1bW1hcnkgbXVzdCBiZSBhIHN0cmluZycsXG4gICAgICBjb2RlOiAnaW52YWxpZF90eXBlJyxcbiAgICAgIGV4cGVjdGVkVHlwZTogJ3N0cmluZydcbiAgICB9KTtcbiAgfSBlbHNlIGlmIChjYXJkLnN1bW1hcnkudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAnc3VtbWFyeScsXG4gICAgICBtZXNzYWdlOiAnc3VtbWFyeSBtdXN0IG5vdCBiZSBlbXB0eScsXG4gICAgICBjb2RlOiAnaW52YWxpZF9mb3JtYXQnLFxuICAgICAgc3VnZ2VzdGlvbjogJ1Byb3ZpZGUgYSBub24tZW1wdHkgdmFsdWUnXG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoY2FyZC5zdW1tYXJ5Lmxlbmd0aCA+IE1BWF9TVU1NQVJZX0xFTkdUSCkge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAnc3VtbWFyeScsXG4gICAgICBtZXNzYWdlOiBgc3VtbWFyeSBtdXN0IG5vdCBleGNlZWQgJHtNQVhfU1VNTUFSWV9MRU5HVEh9IGNoYXJhY3RlcnNgLFxuICAgICAgY29kZTogJ2xlbmd0aF9leGNlZWRlZCcsXG4gICAgICBzdWdnZXN0aW9uOiBgU2hvcnRlbiB0byAke01BWF9TVU1NQVJZX0xFTkdUSH0gY2hhcmFjdGVycyBvciBsZXNzYFxuICAgIH0pO1xuICB9XG5cbiAgLy8gVmFsaWRhdGUgYXV0aG9yIGZpZWxkXG4gIGlmIChjYXJkLmF1dGhvciA9PT0gdW5kZWZpbmVkIHx8IGNhcmQuYXV0aG9yID09PSBudWxsKSB7XG4gICAgZXJyb3JzLnB1c2goe1xuICAgICAgZmllbGQ6ICdhdXRob3InLFxuICAgICAgbWVzc2FnZTogJ2F1dGhvciBpcyByZXF1aXJlZCcsXG4gICAgICBjb2RlOiAnbWlzc2luZ19maWVsZCdcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgY2FyZC5hdXRob3IgIT09ICdzdHJpbmcnKSB7XG4gICAgZXJyb3JzLnB1c2goe1xuICAgICAgZmllbGQ6ICdhdXRob3InLFxuICAgICAgbWVzc2FnZTogJ2F1dGhvciBtdXN0IGJlIGEgc3RyaW5nJyxcbiAgICAgIGNvZGU6ICdpbnZhbGlkX3R5cGUnLFxuICAgICAgZXhwZWN0ZWRUeXBlOiAnc3RyaW5nJ1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKGNhcmQuYXV0aG9yLnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICBlcnJvcnMucHVzaCh7XG4gICAgICBmaWVsZDogJ2F1dGhvcicsXG4gICAgICBtZXNzYWdlOiAnYXV0aG9yIG11c3Qgbm90IGJlIGVtcHR5JyxcbiAgICAgIGNvZGU6ICdpbnZhbGlkX2Zvcm1hdCcsXG4gICAgICBzdWdnZXN0aW9uOiAnUHJvdmlkZSBhIG5vbi1lbXB0eSB2YWx1ZSdcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFZhbGlkYXRlIHN0YXR1cyBmaWVsZFxuICBpZiAoY2FyZC5zdGF0dXMgPT09IHVuZGVmaW5lZCB8fCBjYXJkLnN0YXR1cyA9PT0gbnVsbCkge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6ICdzdGF0dXMnLCBtZXNzYWdlOiAnc3RhdHVzIGlzIHJlcXVpcmVkJywgY29kZTogJ21pc3NpbmdfZmllbGQnIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBjYXJkLnN0YXR1cyAhPT0gJ3N0cmluZycpIHtcbiAgICBlcnJvcnMucHVzaCh7XG4gICAgICBmaWVsZDogJ3N0YXR1cycsXG4gICAgICBtZXNzYWdlOiAnc3RhdHVzIG11c3QgYmUgYSBzdHJpbmcnLFxuICAgICAgY29kZTogJ2ludmFsaWRfdHlwZSdcbiAgICB9KTtcbiAgfSBlbHNlIGlmICghQ0FSRF9TVEFUVVNFUy5pbmNsdWRlcyhjYXJkLnN0YXR1cyBhcyAodHlwZW9mIENBUkRfU1RBVFVTRVMpW251bWJlcl0pKSB7XG4gICAgZXJyb3JzLnB1c2goe1xuICAgICAgZmllbGQ6ICdzdGF0dXMnLFxuICAgICAgbWVzc2FnZTogYHN0YXR1cyBtdXN0IGJlIG9uZSBvZjogJHtDQVJEX1NUQVRVU0VTLmpvaW4oJywgJyl9YCxcbiAgICAgIGNvZGU6ICdpbnZhbGlkX3N0YXR1cycsXG4gICAgICBhdmFpbGFibGVWYWx1ZXM6IENBUkRfU1RBVFVTRVNcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFZhbGlkYXRlIGNhcmQgZmllbGRcbiAgaWYgKGNhcmQuY2FyZCA9PT0gdW5kZWZpbmVkIHx8IGNhcmQuY2FyZCA9PT0gbnVsbCkge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6ICdjYXJkJywgbWVzc2FnZTogJ2NhcmQgaXMgcmVxdWlyZWQnLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gIH0gZWxzZSBpZiAoIWlzT2JqZWN0KGNhcmQuY2FyZCkpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiAnY2FyZCcsIG1lc3NhZ2U6ICdjYXJkIG11c3QgYmUgYW4gb2JqZWN0JywgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gIH0gZWxzZSB7XG4gICAgdmFsaWRhdGVBZGFwdGl2ZUNhcmRTY2hlbWEoY2FyZC5jYXJkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBjYXJkLnN0YXR1cywgZXJyb3JzKTtcbiAgfVxuXG4gIC8vIENyb3NzLWZpZWxkOiB3YXJuIHdoZW4gc3RhdHVzIGlzIGNvbXBsZXRlZCBidXQgbm8gb3V0cHV0XG4gIGlmIChjYXJkLnN0YXR1cyA9PT0gJ2NvbXBsZXRlZCcgJiYgKGNhcmQub3V0cHV0ID09PSB1bmRlZmluZWQgfHwgY2FyZC5vdXRwdXQgPT09IG51bGwpKSB7XG4gICAgZXJyb3JzLnB1c2goe1xuICAgICAgZmllbGQ6ICdvdXRwdXQnLFxuICAgICAgbWVzc2FnZTogJ0NhcmQgd2l0aCBcImNvbXBsZXRlZFwiIHN0YXR1cyBzaG91bGQgaGF2ZSBvdXRwdXQgZGVmaW5lZCcsXG4gICAgICBjb2RlOiAnd2FybmluZ19jb21wbGV0ZWRfd2l0aG91dF9vdXRwdXQnXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4geyB2YWxpZDogZXJyb3JzLmxlbmd0aCA9PT0gMCwgZXJyb3JzIH07XG59XG4iLCAiXG4vKiEganMteWFtbCA0LjEuMSBodHRwczovL2dpdGh1Yi5jb20vbm9kZWNhL2pzLXlhbWwgQGxpY2Vuc2UgTUlUICovXG5mdW5jdGlvbiBpc05vdGhpbmcoc3ViamVjdCkge1xuICByZXR1cm4gKHR5cGVvZiBzdWJqZWN0ID09PSAndW5kZWZpbmVkJykgfHwgKHN1YmplY3QgPT09IG51bGwpO1xufVxuXG5cbmZ1bmN0aW9uIGlzT2JqZWN0KHN1YmplY3QpIHtcbiAgcmV0dXJuICh0eXBlb2Ygc3ViamVjdCA9PT0gJ29iamVjdCcpICYmIChzdWJqZWN0ICE9PSBudWxsKTtcbn1cblxuXG5mdW5jdGlvbiB0b0FycmF5KHNlcXVlbmNlKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KHNlcXVlbmNlKSkgcmV0dXJuIHNlcXVlbmNlO1xuICBlbHNlIGlmIChpc05vdGhpbmcoc2VxdWVuY2UpKSByZXR1cm4gW107XG5cbiAgcmV0dXJuIFsgc2VxdWVuY2UgXTtcbn1cblxuXG5mdW5jdGlvbiBleHRlbmQodGFyZ2V0LCBzb3VyY2UpIHtcbiAgdmFyIGluZGV4LCBsZW5ndGgsIGtleSwgc291cmNlS2V5cztcblxuICBpZiAoc291cmNlKSB7XG4gICAgc291cmNlS2V5cyA9IE9iamVjdC5rZXlzKHNvdXJjZSk7XG5cbiAgICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gc291cmNlS2V5cy5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgICBrZXkgPSBzb3VyY2VLZXlzW2luZGV4XTtcbiAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRhcmdldDtcbn1cblxuXG5mdW5jdGlvbiByZXBlYXQoc3RyaW5nLCBjb3VudCkge1xuICB2YXIgcmVzdWx0ID0gJycsIGN5Y2xlO1xuXG4gIGZvciAoY3ljbGUgPSAwOyBjeWNsZSA8IGNvdW50OyBjeWNsZSArPSAxKSB7XG4gICAgcmVzdWx0ICs9IHN0cmluZztcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cblxuZnVuY3Rpb24gaXNOZWdhdGl2ZVplcm8obnVtYmVyKSB7XG4gIHJldHVybiAobnVtYmVyID09PSAwKSAmJiAoTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZID09PSAxIC8gbnVtYmVyKTtcbn1cblxuXG52YXIgaXNOb3RoaW5nXzEgICAgICA9IGlzTm90aGluZztcbnZhciBpc09iamVjdF8xICAgICAgID0gaXNPYmplY3Q7XG52YXIgdG9BcnJheV8xICAgICAgICA9IHRvQXJyYXk7XG52YXIgcmVwZWF0XzEgICAgICAgICA9IHJlcGVhdDtcbnZhciBpc05lZ2F0aXZlWmVyb18xID0gaXNOZWdhdGl2ZVplcm87XG52YXIgZXh0ZW5kXzEgICAgICAgICA9IGV4dGVuZDtcblxudmFyIGNvbW1vbiA9IHtcblx0aXNOb3RoaW5nOiBpc05vdGhpbmdfMSxcblx0aXNPYmplY3Q6IGlzT2JqZWN0XzEsXG5cdHRvQXJyYXk6IHRvQXJyYXlfMSxcblx0cmVwZWF0OiByZXBlYXRfMSxcblx0aXNOZWdhdGl2ZVplcm86IGlzTmVnYXRpdmVaZXJvXzEsXG5cdGV4dGVuZDogZXh0ZW5kXzFcbn07XG5cbi8vIFlBTUwgZXJyb3IgY2xhc3MuIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvODQ1ODk4NFxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKGV4Y2VwdGlvbiwgY29tcGFjdCkge1xuICB2YXIgd2hlcmUgPSAnJywgbWVzc2FnZSA9IGV4Y2VwdGlvbi5yZWFzb24gfHwgJyh1bmtub3duIHJlYXNvbiknO1xuXG4gIGlmICghZXhjZXB0aW9uLm1hcmspIHJldHVybiBtZXNzYWdlO1xuXG4gIGlmIChleGNlcHRpb24ubWFyay5uYW1lKSB7XG4gICAgd2hlcmUgKz0gJ2luIFwiJyArIGV4Y2VwdGlvbi5tYXJrLm5hbWUgKyAnXCIgJztcbiAgfVxuXG4gIHdoZXJlICs9ICcoJyArIChleGNlcHRpb24ubWFyay5saW5lICsgMSkgKyAnOicgKyAoZXhjZXB0aW9uLm1hcmsuY29sdW1uICsgMSkgKyAnKSc7XG5cbiAgaWYgKCFjb21wYWN0ICYmIGV4Y2VwdGlvbi5tYXJrLnNuaXBwZXQpIHtcbiAgICB3aGVyZSArPSAnXFxuXFxuJyArIGV4Y2VwdGlvbi5tYXJrLnNuaXBwZXQ7XG4gIH1cblxuICByZXR1cm4gbWVzc2FnZSArICcgJyArIHdoZXJlO1xufVxuXG5cbmZ1bmN0aW9uIFlBTUxFeGNlcHRpb24kMShyZWFzb24sIG1hcmspIHtcbiAgLy8gU3VwZXIgY29uc3RydWN0b3JcbiAgRXJyb3IuY2FsbCh0aGlzKTtcblxuICB0aGlzLm5hbWUgPSAnWUFNTEV4Y2VwdGlvbic7XG4gIHRoaXMucmVhc29uID0gcmVhc29uO1xuICB0aGlzLm1hcmsgPSBtYXJrO1xuICB0aGlzLm1lc3NhZ2UgPSBmb3JtYXRFcnJvcih0aGlzLCBmYWxzZSk7XG5cbiAgLy8gSW5jbHVkZSBzdGFjayB0cmFjZSBpbiBlcnJvciBvYmplY3RcbiAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgLy8gQ2hyb21lIGFuZCBOb2RlSlNcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBGRiwgSUUgMTArIGFuZCBTYWZhcmkgNisuIEZhbGxiYWNrIGZvciBvdGhlcnNcbiAgICB0aGlzLnN0YWNrID0gKG5ldyBFcnJvcigpKS5zdGFjayB8fCAnJztcbiAgfVxufVxuXG5cbi8vIEluaGVyaXQgZnJvbSBFcnJvclxuWUFNTEV4Y2VwdGlvbiQxLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbllBTUxFeGNlcHRpb24kMS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBZQU1MRXhjZXB0aW9uJDE7XG5cblxuWUFNTEV4Y2VwdGlvbiQxLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKGNvbXBhY3QpIHtcbiAgcmV0dXJuIHRoaXMubmFtZSArICc6ICcgKyBmb3JtYXRFcnJvcih0aGlzLCBjb21wYWN0KTtcbn07XG5cblxudmFyIGV4Y2VwdGlvbiA9IFlBTUxFeGNlcHRpb24kMTtcblxuLy8gZ2V0IHNuaXBwZXQgZm9yIGEgc2luZ2xlIGxpbmUsIHJlc3BlY3RpbmcgbWF4TGVuZ3RoXG5mdW5jdGlvbiBnZXRMaW5lKGJ1ZmZlciwgbGluZVN0YXJ0LCBsaW5lRW5kLCBwb3NpdGlvbiwgbWF4TGluZUxlbmd0aCkge1xuICB2YXIgaGVhZCA9ICcnO1xuICB2YXIgdGFpbCA9ICcnO1xuICB2YXIgbWF4SGFsZkxlbmd0aCA9IE1hdGguZmxvb3IobWF4TGluZUxlbmd0aCAvIDIpIC0gMTtcblxuICBpZiAocG9zaXRpb24gLSBsaW5lU3RhcnQgPiBtYXhIYWxmTGVuZ3RoKSB7XG4gICAgaGVhZCA9ICcgLi4uICc7XG4gICAgbGluZVN0YXJ0ID0gcG9zaXRpb24gLSBtYXhIYWxmTGVuZ3RoICsgaGVhZC5sZW5ndGg7XG4gIH1cblxuICBpZiAobGluZUVuZCAtIHBvc2l0aW9uID4gbWF4SGFsZkxlbmd0aCkge1xuICAgIHRhaWwgPSAnIC4uLic7XG4gICAgbGluZUVuZCA9IHBvc2l0aW9uICsgbWF4SGFsZkxlbmd0aCAtIHRhaWwubGVuZ3RoO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzdHI6IGhlYWQgKyBidWZmZXIuc2xpY2UobGluZVN0YXJ0LCBsaW5lRW5kKS5yZXBsYWNlKC9cXHQvZywgJ1x1MjE5MicpICsgdGFpbCxcbiAgICBwb3M6IHBvc2l0aW9uIC0gbGluZVN0YXJ0ICsgaGVhZC5sZW5ndGggLy8gcmVsYXRpdmUgcG9zaXRpb25cbiAgfTtcbn1cblxuXG5mdW5jdGlvbiBwYWRTdGFydChzdHJpbmcsIG1heCkge1xuICByZXR1cm4gY29tbW9uLnJlcGVhdCgnICcsIG1heCAtIHN0cmluZy5sZW5ndGgpICsgc3RyaW5nO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VTbmlwcGV0KG1hcmssIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IE9iamVjdC5jcmVhdGUob3B0aW9ucyB8fCBudWxsKTtcblxuICBpZiAoIW1hcmsuYnVmZmVyKSByZXR1cm4gbnVsbDtcblxuICBpZiAoIW9wdGlvbnMubWF4TGVuZ3RoKSBvcHRpb25zLm1heExlbmd0aCA9IDc5O1xuICBpZiAodHlwZW9mIG9wdGlvbnMuaW5kZW50ICAgICAgIT09ICdudW1iZXInKSBvcHRpb25zLmluZGVudCAgICAgID0gMTtcbiAgaWYgKHR5cGVvZiBvcHRpb25zLmxpbmVzQmVmb3JlICE9PSAnbnVtYmVyJykgb3B0aW9ucy5saW5lc0JlZm9yZSA9IDM7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucy5saW5lc0FmdGVyICAhPT0gJ251bWJlcicpIG9wdGlvbnMubGluZXNBZnRlciAgPSAyO1xuXG4gIHZhciByZSA9IC9cXHI/XFxufFxccnxcXDAvZztcbiAgdmFyIGxpbmVTdGFydHMgPSBbIDAgXTtcbiAgdmFyIGxpbmVFbmRzID0gW107XG4gIHZhciBtYXRjaDtcbiAgdmFyIGZvdW5kTGluZU5vID0gLTE7XG5cbiAgd2hpbGUgKChtYXRjaCA9IHJlLmV4ZWMobWFyay5idWZmZXIpKSkge1xuICAgIGxpbmVFbmRzLnB1c2gobWF0Y2guaW5kZXgpO1xuICAgIGxpbmVTdGFydHMucHVzaChtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCk7XG5cbiAgICBpZiAobWFyay5wb3NpdGlvbiA8PSBtYXRjaC5pbmRleCAmJiBmb3VuZExpbmVObyA8IDApIHtcbiAgICAgIGZvdW5kTGluZU5vID0gbGluZVN0YXJ0cy5sZW5ndGggLSAyO1xuICAgIH1cbiAgfVxuXG4gIGlmIChmb3VuZExpbmVObyA8IDApIGZvdW5kTGluZU5vID0gbGluZVN0YXJ0cy5sZW5ndGggLSAxO1xuXG4gIHZhciByZXN1bHQgPSAnJywgaSwgbGluZTtcbiAgdmFyIGxpbmVOb0xlbmd0aCA9IE1hdGgubWluKG1hcmsubGluZSArIG9wdGlvbnMubGluZXNBZnRlciwgbGluZUVuZHMubGVuZ3RoKS50b1N0cmluZygpLmxlbmd0aDtcbiAgdmFyIG1heExpbmVMZW5ndGggPSBvcHRpb25zLm1heExlbmd0aCAtIChvcHRpb25zLmluZGVudCArIGxpbmVOb0xlbmd0aCArIDMpO1xuXG4gIGZvciAoaSA9IDE7IGkgPD0gb3B0aW9ucy5saW5lc0JlZm9yZTsgaSsrKSB7XG4gICAgaWYgKGZvdW5kTGluZU5vIC0gaSA8IDApIGJyZWFrO1xuICAgIGxpbmUgPSBnZXRMaW5lKFxuICAgICAgbWFyay5idWZmZXIsXG4gICAgICBsaW5lU3RhcnRzW2ZvdW5kTGluZU5vIC0gaV0sXG4gICAgICBsaW5lRW5kc1tmb3VuZExpbmVObyAtIGldLFxuICAgICAgbWFyay5wb3NpdGlvbiAtIChsaW5lU3RhcnRzW2ZvdW5kTGluZU5vXSAtIGxpbmVTdGFydHNbZm91bmRMaW5lTm8gLSBpXSksXG4gICAgICBtYXhMaW5lTGVuZ3RoXG4gICAgKTtcbiAgICByZXN1bHQgPSBjb21tb24ucmVwZWF0KCcgJywgb3B0aW9ucy5pbmRlbnQpICsgcGFkU3RhcnQoKG1hcmsubGluZSAtIGkgKyAxKS50b1N0cmluZygpLCBsaW5lTm9MZW5ndGgpICtcbiAgICAgICcgfCAnICsgbGluZS5zdHIgKyAnXFxuJyArIHJlc3VsdDtcbiAgfVxuXG4gIGxpbmUgPSBnZXRMaW5lKG1hcmsuYnVmZmVyLCBsaW5lU3RhcnRzW2ZvdW5kTGluZU5vXSwgbGluZUVuZHNbZm91bmRMaW5lTm9dLCBtYXJrLnBvc2l0aW9uLCBtYXhMaW5lTGVuZ3RoKTtcbiAgcmVzdWx0ICs9IGNvbW1vbi5yZXBlYXQoJyAnLCBvcHRpb25zLmluZGVudCkgKyBwYWRTdGFydCgobWFyay5saW5lICsgMSkudG9TdHJpbmcoKSwgbGluZU5vTGVuZ3RoKSArXG4gICAgJyB8ICcgKyBsaW5lLnN0ciArICdcXG4nO1xuICByZXN1bHQgKz0gY29tbW9uLnJlcGVhdCgnLScsIG9wdGlvbnMuaW5kZW50ICsgbGluZU5vTGVuZ3RoICsgMyArIGxpbmUucG9zKSArICdeJyArICdcXG4nO1xuXG4gIGZvciAoaSA9IDE7IGkgPD0gb3B0aW9ucy5saW5lc0FmdGVyOyBpKyspIHtcbiAgICBpZiAoZm91bmRMaW5lTm8gKyBpID49IGxpbmVFbmRzLmxlbmd0aCkgYnJlYWs7XG4gICAgbGluZSA9IGdldExpbmUoXG4gICAgICBtYXJrLmJ1ZmZlcixcbiAgICAgIGxpbmVTdGFydHNbZm91bmRMaW5lTm8gKyBpXSxcbiAgICAgIGxpbmVFbmRzW2ZvdW5kTGluZU5vICsgaV0sXG4gICAgICBtYXJrLnBvc2l0aW9uIC0gKGxpbmVTdGFydHNbZm91bmRMaW5lTm9dIC0gbGluZVN0YXJ0c1tmb3VuZExpbmVObyArIGldKSxcbiAgICAgIG1heExpbmVMZW5ndGhcbiAgICApO1xuICAgIHJlc3VsdCArPSBjb21tb24ucmVwZWF0KCcgJywgb3B0aW9ucy5pbmRlbnQpICsgcGFkU3RhcnQoKG1hcmsubGluZSArIGkgKyAxKS50b1N0cmluZygpLCBsaW5lTm9MZW5ndGgpICtcbiAgICAgICcgfCAnICsgbGluZS5zdHIgKyAnXFxuJztcbiAgfVxuXG4gIHJldHVybiByZXN1bHQucmVwbGFjZSgvXFxuJC8sICcnKTtcbn1cblxuXG52YXIgc25pcHBldCA9IG1ha2VTbmlwcGV0O1xuXG52YXIgVFlQRV9DT05TVFJVQ1RPUl9PUFRJT05TID0gW1xuICAna2luZCcsXG4gICdtdWx0aScsXG4gICdyZXNvbHZlJyxcbiAgJ2NvbnN0cnVjdCcsXG4gICdpbnN0YW5jZU9mJyxcbiAgJ3ByZWRpY2F0ZScsXG4gICdyZXByZXNlbnQnLFxuICAncmVwcmVzZW50TmFtZScsXG4gICdkZWZhdWx0U3R5bGUnLFxuICAnc3R5bGVBbGlhc2VzJ1xuXTtcblxudmFyIFlBTUxfTk9ERV9LSU5EUyA9IFtcbiAgJ3NjYWxhcicsXG4gICdzZXF1ZW5jZScsXG4gICdtYXBwaW5nJ1xuXTtcblxuZnVuY3Rpb24gY29tcGlsZVN0eWxlQWxpYXNlcyhtYXApIHtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuXG4gIGlmIChtYXAgIT09IG51bGwpIHtcbiAgICBPYmplY3Qua2V5cyhtYXApLmZvckVhY2goZnVuY3Rpb24gKHN0eWxlKSB7XG4gICAgICBtYXBbc3R5bGVdLmZvckVhY2goZnVuY3Rpb24gKGFsaWFzKSB7XG4gICAgICAgIHJlc3VsdFtTdHJpbmcoYWxpYXMpXSA9IHN0eWxlO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBUeXBlJDEodGFnLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIE9iamVjdC5rZXlzKG9wdGlvbnMpLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBpZiAoVFlQRV9DT05TVFJVQ1RPUl9PUFRJT05TLmluZGV4T2YobmFtZSkgPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgZXhjZXB0aW9uKCdVbmtub3duIG9wdGlvbiBcIicgKyBuYW1lICsgJ1wiIGlzIG1ldCBpbiBkZWZpbml0aW9uIG9mIFwiJyArIHRhZyArICdcIiBZQU1MIHR5cGUuJyk7XG4gICAgfVxuICB9KTtcblxuICAvLyBUT0RPOiBBZGQgdGFnIGZvcm1hdCBjaGVjay5cbiAgdGhpcy5vcHRpb25zICAgICAgID0gb3B0aW9uczsgLy8ga2VlcCBvcmlnaW5hbCBvcHRpb25zIGluIGNhc2UgdXNlciB3YW50cyB0byBleHRlbmQgdGhpcyB0eXBlIGxhdGVyXG4gIHRoaXMudGFnICAgICAgICAgICA9IHRhZztcbiAgdGhpcy5raW5kICAgICAgICAgID0gb3B0aW9uc1sna2luZCddICAgICAgICAgIHx8IG51bGw7XG4gIHRoaXMucmVzb2x2ZSAgICAgICA9IG9wdGlvbnNbJ3Jlc29sdmUnXSAgICAgICB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICB0aGlzLmNvbnN0cnVjdCAgICAgPSBvcHRpb25zWydjb25zdHJ1Y3QnXSAgICAgfHwgZnVuY3Rpb24gKGRhdGEpIHsgcmV0dXJuIGRhdGE7IH07XG4gIHRoaXMuaW5zdGFuY2VPZiAgICA9IG9wdGlvbnNbJ2luc3RhbmNlT2YnXSAgICB8fCBudWxsO1xuICB0aGlzLnByZWRpY2F0ZSAgICAgPSBvcHRpb25zWydwcmVkaWNhdGUnXSAgICAgfHwgbnVsbDtcbiAgdGhpcy5yZXByZXNlbnQgICAgID0gb3B0aW9uc1sncmVwcmVzZW50J10gICAgIHx8IG51bGw7XG4gIHRoaXMucmVwcmVzZW50TmFtZSA9IG9wdGlvbnNbJ3JlcHJlc2VudE5hbWUnXSB8fCBudWxsO1xuICB0aGlzLmRlZmF1bHRTdHlsZSAgPSBvcHRpb25zWydkZWZhdWx0U3R5bGUnXSAgfHwgbnVsbDtcbiAgdGhpcy5tdWx0aSAgICAgICAgID0gb3B0aW9uc1snbXVsdGknXSAgICAgICAgIHx8IGZhbHNlO1xuICB0aGlzLnN0eWxlQWxpYXNlcyAgPSBjb21waWxlU3R5bGVBbGlhc2VzKG9wdGlvbnNbJ3N0eWxlQWxpYXNlcyddIHx8IG51bGwpO1xuXG4gIGlmIChZQU1MX05PREVfS0lORFMuaW5kZXhPZih0aGlzLmtpbmQpID09PSAtMSkge1xuICAgIHRocm93IG5ldyBleGNlcHRpb24oJ1Vua25vd24ga2luZCBcIicgKyB0aGlzLmtpbmQgKyAnXCIgaXMgc3BlY2lmaWVkIGZvciBcIicgKyB0YWcgKyAnXCIgWUFNTCB0eXBlLicpO1xuICB9XG59XG5cbnZhciB0eXBlID0gVHlwZSQxO1xuXG4vKmVzbGludC1kaXNhYmxlIG1heC1sZW4qL1xuXG5cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVMaXN0KHNjaGVtYSwgbmFtZSkge1xuICB2YXIgcmVzdWx0ID0gW107XG5cbiAgc2NoZW1hW25hbWVdLmZvckVhY2goZnVuY3Rpb24gKGN1cnJlbnRUeXBlKSB7XG4gICAgdmFyIG5ld0luZGV4ID0gcmVzdWx0Lmxlbmd0aDtcblxuICAgIHJlc3VsdC5mb3JFYWNoKGZ1bmN0aW9uIChwcmV2aW91c1R5cGUsIHByZXZpb3VzSW5kZXgpIHtcbiAgICAgIGlmIChwcmV2aW91c1R5cGUudGFnID09PSBjdXJyZW50VHlwZS50YWcgJiZcbiAgICAgICAgICBwcmV2aW91c1R5cGUua2luZCA9PT0gY3VycmVudFR5cGUua2luZCAmJlxuICAgICAgICAgIHByZXZpb3VzVHlwZS5tdWx0aSA9PT0gY3VycmVudFR5cGUubXVsdGkpIHtcblxuICAgICAgICBuZXdJbmRleCA9IHByZXZpb3VzSW5kZXg7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXN1bHRbbmV3SW5kZXhdID0gY3VycmVudFR5cGU7XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cblxuZnVuY3Rpb24gY29tcGlsZU1hcCgvKiBsaXN0cy4uLiAqLykge1xuICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBzY2FsYXI6IHt9LFxuICAgICAgICBzZXF1ZW5jZToge30sXG4gICAgICAgIG1hcHBpbmc6IHt9LFxuICAgICAgICBmYWxsYmFjazoge30sXG4gICAgICAgIG11bHRpOiB7XG4gICAgICAgICAgc2NhbGFyOiBbXSxcbiAgICAgICAgICBzZXF1ZW5jZTogW10sXG4gICAgICAgICAgbWFwcGluZzogW10sXG4gICAgICAgICAgZmFsbGJhY2s6IFtdXG4gICAgICAgIH1cbiAgICAgIH0sIGluZGV4LCBsZW5ndGg7XG5cbiAgZnVuY3Rpb24gY29sbGVjdFR5cGUodHlwZSkge1xuICAgIGlmICh0eXBlLm11bHRpKSB7XG4gICAgICByZXN1bHQubXVsdGlbdHlwZS5raW5kXS5wdXNoKHR5cGUpO1xuICAgICAgcmVzdWx0Lm11bHRpWydmYWxsYmFjayddLnB1c2godHlwZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdFt0eXBlLmtpbmRdW3R5cGUudGFnXSA9IHJlc3VsdFsnZmFsbGJhY2snXVt0eXBlLnRhZ10gPSB0eXBlO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIGFyZ3VtZW50c1tpbmRleF0uZm9yRWFjaChjb2xsZWN0VHlwZSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuXG5mdW5jdGlvbiBTY2hlbWEkMShkZWZpbml0aW9uKSB7XG4gIHJldHVybiB0aGlzLmV4dGVuZChkZWZpbml0aW9uKTtcbn1cblxuXG5TY2hlbWEkMS5wcm90b3R5cGUuZXh0ZW5kID0gZnVuY3Rpb24gZXh0ZW5kKGRlZmluaXRpb24pIHtcbiAgdmFyIGltcGxpY2l0ID0gW107XG4gIHZhciBleHBsaWNpdCA9IFtdO1xuXG4gIGlmIChkZWZpbml0aW9uIGluc3RhbmNlb2YgdHlwZSkge1xuICAgIC8vIFNjaGVtYS5leHRlbmQodHlwZSlcbiAgICBleHBsaWNpdC5wdXNoKGRlZmluaXRpb24pO1xuXG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShkZWZpbml0aW9uKSkge1xuICAgIC8vIFNjaGVtYS5leHRlbmQoWyB0eXBlMSwgdHlwZTIsIC4uLiBdKVxuICAgIGV4cGxpY2l0ID0gZXhwbGljaXQuY29uY2F0KGRlZmluaXRpb24pO1xuXG4gIH0gZWxzZSBpZiAoZGVmaW5pdGlvbiAmJiAoQXJyYXkuaXNBcnJheShkZWZpbml0aW9uLmltcGxpY2l0KSB8fCBBcnJheS5pc0FycmF5KGRlZmluaXRpb24uZXhwbGljaXQpKSkge1xuICAgIC8vIFNjaGVtYS5leHRlbmQoeyBleHBsaWNpdDogWyB0eXBlMSwgdHlwZTIsIC4uLiBdLCBpbXBsaWNpdDogWyB0eXBlMSwgdHlwZTIsIC4uLiBdIH0pXG4gICAgaWYgKGRlZmluaXRpb24uaW1wbGljaXQpIGltcGxpY2l0ID0gaW1wbGljaXQuY29uY2F0KGRlZmluaXRpb24uaW1wbGljaXQpO1xuICAgIGlmIChkZWZpbml0aW9uLmV4cGxpY2l0KSBleHBsaWNpdCA9IGV4cGxpY2l0LmNvbmNhdChkZWZpbml0aW9uLmV4cGxpY2l0KTtcblxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBleGNlcHRpb24oJ1NjaGVtYS5leHRlbmQgYXJndW1lbnQgc2hvdWxkIGJlIGEgVHlwZSwgWyBUeXBlIF0sICcgK1xuICAgICAgJ29yIGEgc2NoZW1hIGRlZmluaXRpb24gKHsgaW1wbGljaXQ6IFsuLi5dLCBleHBsaWNpdDogWy4uLl0gfSknKTtcbiAgfVxuXG4gIGltcGxpY2l0LmZvckVhY2goZnVuY3Rpb24gKHR5cGUkMSkge1xuICAgIGlmICghKHR5cGUkMSBpbnN0YW5jZW9mIHR5cGUpKSB7XG4gICAgICB0aHJvdyBuZXcgZXhjZXB0aW9uKCdTcGVjaWZpZWQgbGlzdCBvZiBZQU1MIHR5cGVzIChvciBhIHNpbmdsZSBUeXBlIG9iamVjdCkgY29udGFpbnMgYSBub24tVHlwZSBvYmplY3QuJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUkMS5sb2FkS2luZCAmJiB0eXBlJDEubG9hZEtpbmQgIT09ICdzY2FsYXInKSB7XG4gICAgICB0aHJvdyBuZXcgZXhjZXB0aW9uKCdUaGVyZSBpcyBhIG5vbi1zY2FsYXIgdHlwZSBpbiB0aGUgaW1wbGljaXQgbGlzdCBvZiBhIHNjaGVtYS4gSW1wbGljaXQgcmVzb2x2aW5nIG9mIHN1Y2ggdHlwZXMgaXMgbm90IHN1cHBvcnRlZC4nKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZSQxLm11bHRpKSB7XG4gICAgICB0aHJvdyBuZXcgZXhjZXB0aW9uKCdUaGVyZSBpcyBhIG11bHRpIHR5cGUgaW4gdGhlIGltcGxpY2l0IGxpc3Qgb2YgYSBzY2hlbWEuIE11bHRpIHRhZ3MgY2FuIG9ubHkgYmUgbGlzdGVkIGFzIGV4cGxpY2l0LicpO1xuICAgIH1cbiAgfSk7XG5cbiAgZXhwbGljaXQuZm9yRWFjaChmdW5jdGlvbiAodHlwZSQxKSB7XG4gICAgaWYgKCEodHlwZSQxIGluc3RhbmNlb2YgdHlwZSkpIHtcbiAgICAgIHRocm93IG5ldyBleGNlcHRpb24oJ1NwZWNpZmllZCBsaXN0IG9mIFlBTUwgdHlwZXMgKG9yIGEgc2luZ2xlIFR5cGUgb2JqZWN0KSBjb250YWlucyBhIG5vbi1UeXBlIG9iamVjdC4nKTtcbiAgICB9XG4gIH0pO1xuXG4gIHZhciByZXN1bHQgPSBPYmplY3QuY3JlYXRlKFNjaGVtYSQxLnByb3RvdHlwZSk7XG5cbiAgcmVzdWx0LmltcGxpY2l0ID0gKHRoaXMuaW1wbGljaXQgfHwgW10pLmNvbmNhdChpbXBsaWNpdCk7XG4gIHJlc3VsdC5leHBsaWNpdCA9ICh0aGlzLmV4cGxpY2l0IHx8IFtdKS5jb25jYXQoZXhwbGljaXQpO1xuXG4gIHJlc3VsdC5jb21waWxlZEltcGxpY2l0ID0gY29tcGlsZUxpc3QocmVzdWx0LCAnaW1wbGljaXQnKTtcbiAgcmVzdWx0LmNvbXBpbGVkRXhwbGljaXQgPSBjb21waWxlTGlzdChyZXN1bHQsICdleHBsaWNpdCcpO1xuICByZXN1bHQuY29tcGlsZWRUeXBlTWFwICA9IGNvbXBpbGVNYXAocmVzdWx0LmNvbXBpbGVkSW1wbGljaXQsIHJlc3VsdC5jb21waWxlZEV4cGxpY2l0KTtcblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuXG52YXIgc2NoZW1hID0gU2NoZW1hJDE7XG5cbnZhciBzdHIgPSBuZXcgdHlwZSgndGFnOnlhbWwub3JnLDIwMDI6c3RyJywge1xuICBraW5kOiAnc2NhbGFyJyxcbiAgY29uc3RydWN0OiBmdW5jdGlvbiAoZGF0YSkgeyByZXR1cm4gZGF0YSAhPT0gbnVsbCA/IGRhdGEgOiAnJzsgfVxufSk7XG5cbnZhciBzZXEgPSBuZXcgdHlwZSgndGFnOnlhbWwub3JnLDIwMDI6c2VxJywge1xuICBraW5kOiAnc2VxdWVuY2UnLFxuICBjb25zdHJ1Y3Q6IGZ1bmN0aW9uIChkYXRhKSB7IHJldHVybiBkYXRhICE9PSBudWxsID8gZGF0YSA6IFtdOyB9XG59KTtcblxudmFyIG1hcCA9IG5ldyB0eXBlKCd0YWc6eWFtbC5vcmcsMjAwMjptYXAnLCB7XG4gIGtpbmQ6ICdtYXBwaW5nJyxcbiAgY29uc3RydWN0OiBmdW5jdGlvbiAoZGF0YSkgeyByZXR1cm4gZGF0YSAhPT0gbnVsbCA/IGRhdGEgOiB7fTsgfVxufSk7XG5cbnZhciBmYWlsc2FmZSA9IG5ldyBzY2hlbWEoe1xuICBleHBsaWNpdDogW1xuICAgIHN0cixcbiAgICBzZXEsXG4gICAgbWFwXG4gIF1cbn0pO1xuXG5mdW5jdGlvbiByZXNvbHZlWWFtbE51bGwoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIHRydWU7XG5cbiAgdmFyIG1heCA9IGRhdGEubGVuZ3RoO1xuXG4gIHJldHVybiAobWF4ID09PSAxICYmIGRhdGEgPT09ICd+JykgfHxcbiAgICAgICAgIChtYXggPT09IDQgJiYgKGRhdGEgPT09ICdudWxsJyB8fCBkYXRhID09PSAnTnVsbCcgfHwgZGF0YSA9PT0gJ05VTEwnKSk7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxOdWxsKCkge1xuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNOdWxsKG9iamVjdCkge1xuICByZXR1cm4gb2JqZWN0ID09PSBudWxsO1xufVxuXG52YXIgX251bGwgPSBuZXcgdHlwZSgndGFnOnlhbWwub3JnLDIwMDI6bnVsbCcsIHtcbiAga2luZDogJ3NjYWxhcicsXG4gIHJlc29sdmU6IHJlc29sdmVZYW1sTnVsbCxcbiAgY29uc3RydWN0OiBjb25zdHJ1Y3RZYW1sTnVsbCxcbiAgcHJlZGljYXRlOiBpc051bGwsXG4gIHJlcHJlc2VudDoge1xuICAgIGNhbm9uaWNhbDogZnVuY3Rpb24gKCkgeyByZXR1cm4gJ34nOyAgICB9LFxuICAgIGxvd2VyY2FzZTogZnVuY3Rpb24gKCkgeyByZXR1cm4gJ251bGwnOyB9LFxuICAgIHVwcGVyY2FzZTogZnVuY3Rpb24gKCkgeyByZXR1cm4gJ05VTEwnOyB9LFxuICAgIGNhbWVsY2FzZTogZnVuY3Rpb24gKCkgeyByZXR1cm4gJ051bGwnOyB9LFxuICAgIGVtcHR5OiAgICAgZnVuY3Rpb24gKCkgeyByZXR1cm4gJyc7ICAgICB9XG4gIH0sXG4gIGRlZmF1bHRTdHlsZTogJ2xvd2VyY2FzZSdcbn0pO1xuXG5mdW5jdGlvbiByZXNvbHZlWWFtbEJvb2xlYW4oZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBtYXggPSBkYXRhLmxlbmd0aDtcblxuICByZXR1cm4gKG1heCA9PT0gNCAmJiAoZGF0YSA9PT0gJ3RydWUnIHx8IGRhdGEgPT09ICdUcnVlJyB8fCBkYXRhID09PSAnVFJVRScpKSB8fFxuICAgICAgICAgKG1heCA9PT0gNSAmJiAoZGF0YSA9PT0gJ2ZhbHNlJyB8fCBkYXRhID09PSAnRmFsc2UnIHx8IGRhdGEgPT09ICdGQUxTRScpKTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbEJvb2xlYW4oZGF0YSkge1xuICByZXR1cm4gZGF0YSA9PT0gJ3RydWUnIHx8XG4gICAgICAgICBkYXRhID09PSAnVHJ1ZScgfHxcbiAgICAgICAgIGRhdGEgPT09ICdUUlVFJztcbn1cblxuZnVuY3Rpb24gaXNCb29sZWFuKG9iamVjdCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkgPT09ICdbb2JqZWN0IEJvb2xlYW5dJztcbn1cblxudmFyIGJvb2wgPSBuZXcgdHlwZSgndGFnOnlhbWwub3JnLDIwMDI6Ym9vbCcsIHtcbiAga2luZDogJ3NjYWxhcicsXG4gIHJlc29sdmU6IHJlc29sdmVZYW1sQm9vbGVhbixcbiAgY29uc3RydWN0OiBjb25zdHJ1Y3RZYW1sQm9vbGVhbixcbiAgcHJlZGljYXRlOiBpc0Jvb2xlYW4sXG4gIHJlcHJlc2VudDoge1xuICAgIGxvd2VyY2FzZTogZnVuY3Rpb24gKG9iamVjdCkgeyByZXR1cm4gb2JqZWN0ID8gJ3RydWUnIDogJ2ZhbHNlJzsgfSxcbiAgICB1cHBlcmNhc2U6IGZ1bmN0aW9uIChvYmplY3QpIHsgcmV0dXJuIG9iamVjdCA/ICdUUlVFJyA6ICdGQUxTRSc7IH0sXG4gICAgY2FtZWxjYXNlOiBmdW5jdGlvbiAob2JqZWN0KSB7IHJldHVybiBvYmplY3QgPyAnVHJ1ZScgOiAnRmFsc2UnOyB9XG4gIH0sXG4gIGRlZmF1bHRTdHlsZTogJ2xvd2VyY2FzZSdcbn0pO1xuXG5mdW5jdGlvbiBpc0hleENvZGUoYykge1xuICByZXR1cm4gKCgweDMwLyogMCAqLyA8PSBjKSAmJiAoYyA8PSAweDM5LyogOSAqLykpIHx8XG4gICAgICAgICAoKDB4NDEvKiBBICovIDw9IGMpICYmIChjIDw9IDB4NDYvKiBGICovKSkgfHxcbiAgICAgICAgICgoMHg2MS8qIGEgKi8gPD0gYykgJiYgKGMgPD0gMHg2Ni8qIGYgKi8pKTtcbn1cblxuZnVuY3Rpb24gaXNPY3RDb2RlKGMpIHtcbiAgcmV0dXJuICgoMHgzMC8qIDAgKi8gPD0gYykgJiYgKGMgPD0gMHgzNy8qIDcgKi8pKTtcbn1cblxuZnVuY3Rpb24gaXNEZWNDb2RlKGMpIHtcbiAgcmV0dXJuICgoMHgzMC8qIDAgKi8gPD0gYykgJiYgKGMgPD0gMHgzOS8qIDkgKi8pKTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxJbnRlZ2VyKGRhdGEpIHtcbiAgaWYgKGRhdGEgPT09IG51bGwpIHJldHVybiBmYWxzZTtcblxuICB2YXIgbWF4ID0gZGF0YS5sZW5ndGgsXG4gICAgICBpbmRleCA9IDAsXG4gICAgICBoYXNEaWdpdHMgPSBmYWxzZSxcbiAgICAgIGNoO1xuXG4gIGlmICghbWF4KSByZXR1cm4gZmFsc2U7XG5cbiAgY2ggPSBkYXRhW2luZGV4XTtcblxuICAvLyBzaWduXG4gIGlmIChjaCA9PT0gJy0nIHx8IGNoID09PSAnKycpIHtcbiAgICBjaCA9IGRhdGFbKytpbmRleF07XG4gIH1cblxuICBpZiAoY2ggPT09ICcwJykge1xuICAgIC8vIDBcbiAgICBpZiAoaW5kZXggKyAxID09PSBtYXgpIHJldHVybiB0cnVlO1xuICAgIGNoID0gZGF0YVsrK2luZGV4XTtcblxuICAgIC8vIGJhc2UgMiwgYmFzZSA4LCBiYXNlIDE2XG5cbiAgICBpZiAoY2ggPT09ICdiJykge1xuICAgICAgLy8gYmFzZSAyXG4gICAgICBpbmRleCsrO1xuXG4gICAgICBmb3IgKDsgaW5kZXggPCBtYXg7IGluZGV4KyspIHtcbiAgICAgICAgY2ggPSBkYXRhW2luZGV4XTtcbiAgICAgICAgaWYgKGNoID09PSAnXycpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoY2ggIT09ICcwJyAmJiBjaCAhPT0gJzEnKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGhhc0RpZ2l0cyA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gaGFzRGlnaXRzICYmIGNoICE9PSAnXyc7XG4gICAgfVxuXG5cbiAgICBpZiAoY2ggPT09ICd4Jykge1xuICAgICAgLy8gYmFzZSAxNlxuICAgICAgaW5kZXgrKztcblxuICAgICAgZm9yICg7IGluZGV4IDwgbWF4OyBpbmRleCsrKSB7XG4gICAgICAgIGNoID0gZGF0YVtpbmRleF07XG4gICAgICAgIGlmIChjaCA9PT0gJ18nKSBjb250aW51ZTtcbiAgICAgICAgaWYgKCFpc0hleENvZGUoZGF0YS5jaGFyQ29kZUF0KGluZGV4KSkpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaGFzRGlnaXRzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXNEaWdpdHMgJiYgY2ggIT09ICdfJztcbiAgICB9XG5cblxuICAgIGlmIChjaCA9PT0gJ28nKSB7XG4gICAgICAvLyBiYXNlIDhcbiAgICAgIGluZGV4Kys7XG5cbiAgICAgIGZvciAoOyBpbmRleCA8IG1heDsgaW5kZXgrKykge1xuICAgICAgICBjaCA9IGRhdGFbaW5kZXhdO1xuICAgICAgICBpZiAoY2ggPT09ICdfJykgY29udGludWU7XG4gICAgICAgIGlmICghaXNPY3RDb2RlKGRhdGEuY2hhckNvZGVBdChpbmRleCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGhhc0RpZ2l0cyA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gaGFzRGlnaXRzICYmIGNoICE9PSAnXyc7XG4gICAgfVxuICB9XG5cbiAgLy8gYmFzZSAxMCAoZXhjZXB0IDApXG5cbiAgLy8gdmFsdWUgc2hvdWxkIG5vdCBzdGFydCB3aXRoIGBfYDtcbiAgaWYgKGNoID09PSAnXycpIHJldHVybiBmYWxzZTtcblxuICBmb3IgKDsgaW5kZXggPCBtYXg7IGluZGV4KyspIHtcbiAgICBjaCA9IGRhdGFbaW5kZXhdO1xuICAgIGlmIChjaCA9PT0gJ18nKSBjb250aW51ZTtcbiAgICBpZiAoIWlzRGVjQ29kZShkYXRhLmNoYXJDb2RlQXQoaW5kZXgpKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBoYXNEaWdpdHMgPSB0cnVlO1xuICB9XG5cbiAgLy8gU2hvdWxkIGhhdmUgZGlnaXRzIGFuZCBzaG91bGQgbm90IGVuZCB3aXRoIGBfYFxuICBpZiAoIWhhc0RpZ2l0cyB8fCBjaCA9PT0gJ18nKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxJbnRlZ2VyKGRhdGEpIHtcbiAgdmFyIHZhbHVlID0gZGF0YSwgc2lnbiA9IDEsIGNoO1xuXG4gIGlmICh2YWx1ZS5pbmRleE9mKCdfJykgIT09IC0xKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9fL2csICcnKTtcbiAgfVxuXG4gIGNoID0gdmFsdWVbMF07XG5cbiAgaWYgKGNoID09PSAnLScgfHwgY2ggPT09ICcrJykge1xuICAgIGlmIChjaCA9PT0gJy0nKSBzaWduID0gLTE7XG4gICAgdmFsdWUgPSB2YWx1ZS5zbGljZSgxKTtcbiAgICBjaCA9IHZhbHVlWzBdO1xuICB9XG5cbiAgaWYgKHZhbHVlID09PSAnMCcpIHJldHVybiAwO1xuXG4gIGlmIChjaCA9PT0gJzAnKSB7XG4gICAgaWYgKHZhbHVlWzFdID09PSAnYicpIHJldHVybiBzaWduICogcGFyc2VJbnQodmFsdWUuc2xpY2UoMiksIDIpO1xuICAgIGlmICh2YWx1ZVsxXSA9PT0gJ3gnKSByZXR1cm4gc2lnbiAqIHBhcnNlSW50KHZhbHVlLnNsaWNlKDIpLCAxNik7XG4gICAgaWYgKHZhbHVlWzFdID09PSAnbycpIHJldHVybiBzaWduICogcGFyc2VJbnQodmFsdWUuc2xpY2UoMiksIDgpO1xuICB9XG5cbiAgcmV0dXJuIHNpZ24gKiBwYXJzZUludCh2YWx1ZSwgMTApO1xufVxuXG5mdW5jdGlvbiBpc0ludGVnZXIob2JqZWN0KSB7XG4gIHJldHVybiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkpID09PSAnW29iamVjdCBOdW1iZXJdJyAmJlxuICAgICAgICAgKG9iamVjdCAlIDEgPT09IDAgJiYgIWNvbW1vbi5pc05lZ2F0aXZlWmVybyhvYmplY3QpKTtcbn1cblxudmFyIGludCA9IG5ldyB0eXBlKCd0YWc6eWFtbC5vcmcsMjAwMjppbnQnLCB7XG4gIGtpbmQ6ICdzY2FsYXInLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbEludGVnZXIsXG4gIGNvbnN0cnVjdDogY29uc3RydWN0WWFtbEludGVnZXIsXG4gIHByZWRpY2F0ZTogaXNJbnRlZ2VyLFxuICByZXByZXNlbnQ6IHtcbiAgICBiaW5hcnk6ICAgICAgZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqID49IDAgPyAnMGInICsgb2JqLnRvU3RyaW5nKDIpIDogJy0wYicgKyBvYmoudG9TdHJpbmcoMikuc2xpY2UoMSk7IH0sXG4gICAgb2N0YWw6ICAgICAgIGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiA+PSAwID8gJzBvJyAgKyBvYmoudG9TdHJpbmcoOCkgOiAnLTBvJyAgKyBvYmoudG9TdHJpbmcoOCkuc2xpY2UoMSk7IH0sXG4gICAgZGVjaW1hbDogICAgIGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iai50b1N0cmluZygxMCk7IH0sXG4gICAgLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuICAgIGhleGFkZWNpbWFsOiBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogPj0gMCA/ICcweCcgKyBvYmoudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkgOiAgJy0weCcgKyBvYmoudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkuc2xpY2UoMSk7IH1cbiAgfSxcbiAgZGVmYXVsdFN0eWxlOiAnZGVjaW1hbCcsXG4gIHN0eWxlQWxpYXNlczoge1xuICAgIGJpbmFyeTogICAgICBbIDIsICAnYmluJyBdLFxuICAgIG9jdGFsOiAgICAgICBbIDgsICAnb2N0JyBdLFxuICAgIGRlY2ltYWw6ICAgICBbIDEwLCAnZGVjJyBdLFxuICAgIGhleGFkZWNpbWFsOiBbIDE2LCAnaGV4JyBdXG4gIH1cbn0pO1xuXG52YXIgWUFNTF9GTE9BVF9QQVRURVJOID0gbmV3IFJlZ0V4cChcbiAgLy8gMi41ZTQsIDIuNSBhbmQgaW50ZWdlcnNcbiAgJ14oPzpbLStdPyg/OlswLTldWzAtOV9dKikoPzpcXFxcLlswLTlfXSopPyg/OltlRV1bLStdP1swLTldKyk/JyArXG4gIC8vIC4yZTQsIC4yXG4gIC8vIHNwZWNpYWwgY2FzZSwgc2VlbXMgbm90IGZyb20gc3BlY1xuICAnfFxcXFwuWzAtOV9dKyg/OltlRV1bLStdP1swLTldKyk/JyArXG4gIC8vIC5pbmZcbiAgJ3xbLStdP1xcXFwuKD86aW5mfEluZnxJTkYpJyArXG4gIC8vIC5uYW5cbiAgJ3xcXFxcLig/Om5hbnxOYU58TkFOKSkkJyk7XG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sRmxvYXQoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmICghWUFNTF9GTE9BVF9QQVRURVJOLnRlc3QoZGF0YSkgfHxcbiAgICAgIC8vIFF1aWNrIGhhY2sgdG8gbm90IGFsbG93IGludGVnZXJzIGVuZCB3aXRoIGBfYFxuICAgICAgLy8gUHJvYmFibHkgc2hvdWxkIHVwZGF0ZSByZWdleHAgJiBjaGVjayBzcGVlZFxuICAgICAgZGF0YVtkYXRhLmxlbmd0aCAtIDFdID09PSAnXycpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbEZsb2F0KGRhdGEpIHtcbiAgdmFyIHZhbHVlLCBzaWduO1xuXG4gIHZhbHVlICA9IGRhdGEucmVwbGFjZSgvXy9nLCAnJykudG9Mb3dlckNhc2UoKTtcbiAgc2lnbiAgID0gdmFsdWVbMF0gPT09ICctJyA/IC0xIDogMTtcblxuICBpZiAoJystJy5pbmRleE9mKHZhbHVlWzBdKSA+PSAwKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS5zbGljZSgxKTtcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PT0gJy5pbmYnKSB7XG4gICAgcmV0dXJuIChzaWduID09PSAxKSA/IE51bWJlci5QT1NJVElWRV9JTkZJTklUWSA6IE51bWJlci5ORUdBVElWRV9JTkZJTklUWTtcblxuICB9IGVsc2UgaWYgKHZhbHVlID09PSAnLm5hbicpIHtcbiAgICByZXR1cm4gTmFOO1xuICB9XG4gIHJldHVybiBzaWduICogcGFyc2VGbG9hdCh2YWx1ZSwgMTApO1xufVxuXG5cbnZhciBTQ0lFTlRJRklDX1dJVEhPVVRfRE9UID0gL15bLStdP1swLTldK2UvO1xuXG5mdW5jdGlvbiByZXByZXNlbnRZYW1sRmxvYXQob2JqZWN0LCBzdHlsZSkge1xuICB2YXIgcmVzO1xuXG4gIGlmIChpc05hTihvYmplY3QpKSB7XG4gICAgc3dpdGNoIChzdHlsZSkge1xuICAgICAgY2FzZSAnbG93ZXJjYXNlJzogcmV0dXJuICcubmFuJztcbiAgICAgIGNhc2UgJ3VwcGVyY2FzZSc6IHJldHVybiAnLk5BTic7XG4gICAgICBjYXNlICdjYW1lbGNhc2UnOiByZXR1cm4gJy5OYU4nO1xuICAgIH1cbiAgfSBlbHNlIGlmIChOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFkgPT09IG9iamVjdCkge1xuICAgIHN3aXRjaCAoc3R5bGUpIHtcbiAgICAgIGNhc2UgJ2xvd2VyY2FzZSc6IHJldHVybiAnLmluZic7XG4gICAgICBjYXNlICd1cHBlcmNhc2UnOiByZXR1cm4gJy5JTkYnO1xuICAgICAgY2FzZSAnY2FtZWxjYXNlJzogcmV0dXJuICcuSW5mJztcbiAgICB9XG4gIH0gZWxzZSBpZiAoTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZID09PSBvYmplY3QpIHtcbiAgICBzd2l0Y2ggKHN0eWxlKSB7XG4gICAgICBjYXNlICdsb3dlcmNhc2UnOiByZXR1cm4gJy0uaW5mJztcbiAgICAgIGNhc2UgJ3VwcGVyY2FzZSc6IHJldHVybiAnLS5JTkYnO1xuICAgICAgY2FzZSAnY2FtZWxjYXNlJzogcmV0dXJuICctLkluZic7XG4gICAgfVxuICB9IGVsc2UgaWYgKGNvbW1vbi5pc05lZ2F0aXZlWmVybyhvYmplY3QpKSB7XG4gICAgcmV0dXJuICctMC4wJztcbiAgfVxuXG4gIHJlcyA9IG9iamVjdC50b1N0cmluZygxMCk7XG5cbiAgLy8gSlMgc3RyaW5naWZpZXIgY2FuIGJ1aWxkIHNjaWVudGlmaWMgZm9ybWF0IHdpdGhvdXQgZG90czogNWUtMTAwLFxuICAvLyB3aGlsZSBZQU1MIHJlcXVyZXMgZG90OiA1LmUtMTAwLiBGaXggaXQgd2l0aCBzaW1wbGUgaGFja1xuXG4gIHJldHVybiBTQ0lFTlRJRklDX1dJVEhPVVRfRE9ULnRlc3QocmVzKSA/IHJlcy5yZXBsYWNlKCdlJywgJy5lJykgOiByZXM7XG59XG5cbmZ1bmN0aW9uIGlzRmxvYXQob2JqZWN0KSB7XG4gIHJldHVybiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkgPT09ICdbb2JqZWN0IE51bWJlcl0nKSAmJlxuICAgICAgICAgKG9iamVjdCAlIDEgIT09IDAgfHwgY29tbW9uLmlzTmVnYXRpdmVaZXJvKG9iamVjdCkpO1xufVxuXG52YXIgZmxvYXQgPSBuZXcgdHlwZSgndGFnOnlhbWwub3JnLDIwMDI6ZmxvYXQnLCB7XG4gIGtpbmQ6ICdzY2FsYXInLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbEZsb2F0LFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxGbG9hdCxcbiAgcHJlZGljYXRlOiBpc0Zsb2F0LFxuICByZXByZXNlbnQ6IHJlcHJlc2VudFlhbWxGbG9hdCxcbiAgZGVmYXVsdFN0eWxlOiAnbG93ZXJjYXNlJ1xufSk7XG5cbnZhciBqc29uID0gZmFpbHNhZmUuZXh0ZW5kKHtcbiAgaW1wbGljaXQ6IFtcbiAgICBfbnVsbCxcbiAgICBib29sLFxuICAgIGludCxcbiAgICBmbG9hdFxuICBdXG59KTtcblxudmFyIGNvcmUgPSBqc29uO1xuXG52YXIgWUFNTF9EQVRFX1JFR0VYUCA9IG5ldyBSZWdFeHAoXG4gICdeKFswLTldWzAtOV1bMC05XVswLTldKScgICAgICAgICAgKyAvLyBbMV0geWVhclxuICAnLShbMC05XVswLTldKScgICAgICAgICAgICAgICAgICAgICsgLy8gWzJdIG1vbnRoXG4gICctKFswLTldWzAtOV0pJCcpOyAgICAgICAgICAgICAgICAgICAvLyBbM10gZGF5XG5cbnZhciBZQU1MX1RJTUVTVEFNUF9SRUdFWFAgPSBuZXcgUmVnRXhwKFxuICAnXihbMC05XVswLTldWzAtOV1bMC05XSknICAgICAgICAgICsgLy8gWzFdIHllYXJcbiAgJy0oWzAtOV1bMC05XT8pJyAgICAgICAgICAgICAgICAgICArIC8vIFsyXSBtb250aFxuICAnLShbMC05XVswLTldPyknICAgICAgICAgICAgICAgICAgICsgLy8gWzNdIGRheVxuICAnKD86W1R0XXxbIFxcXFx0XSspJyAgICAgICAgICAgICAgICAgKyAvLyAuLi5cbiAgJyhbMC05XVswLTldPyknICAgICAgICAgICAgICAgICAgICArIC8vIFs0XSBob3VyXG4gICc6KFswLTldWzAtOV0pJyAgICAgICAgICAgICAgICAgICAgKyAvLyBbNV0gbWludXRlXG4gICc6KFswLTldWzAtOV0pJyAgICAgICAgICAgICAgICAgICAgKyAvLyBbNl0gc2Vjb25kXG4gICcoPzpcXFxcLihbMC05XSopKT8nICAgICAgICAgICAgICAgICArIC8vIFs3XSBmcmFjdGlvblxuICAnKD86WyBcXFxcdF0qKFp8KFstK10pKFswLTldWzAtOV0/KScgKyAvLyBbOF0gdHogWzldIHR6X3NpZ24gWzEwXSB0el9ob3VyXG4gICcoPzo6KFswLTldWzAtOV0pKT8pKT8kJyk7ICAgICAgICAgICAvLyBbMTFdIHR6X21pbnV0ZVxuXG5mdW5jdGlvbiByZXNvbHZlWWFtbFRpbWVzdGFtcChkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gIGlmIChZQU1MX0RBVEVfUkVHRVhQLmV4ZWMoZGF0YSkgIT09IG51bGwpIHJldHVybiB0cnVlO1xuICBpZiAoWUFNTF9USU1FU1RBTVBfUkVHRVhQLmV4ZWMoZGF0YSkgIT09IG51bGwpIHJldHVybiB0cnVlO1xuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxUaW1lc3RhbXAoZGF0YSkge1xuICB2YXIgbWF0Y2gsIHllYXIsIG1vbnRoLCBkYXksIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBmcmFjdGlvbiA9IDAsXG4gICAgICBkZWx0YSA9IG51bGwsIHR6X2hvdXIsIHR6X21pbnV0ZSwgZGF0ZTtcblxuICBtYXRjaCA9IFlBTUxfREFURV9SRUdFWFAuZXhlYyhkYXRhKTtcbiAgaWYgKG1hdGNoID09PSBudWxsKSBtYXRjaCA9IFlBTUxfVElNRVNUQU1QX1JFR0VYUC5leGVjKGRhdGEpO1xuXG4gIGlmIChtYXRjaCA9PT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKCdEYXRlIHJlc29sdmUgZXJyb3InKTtcblxuICAvLyBtYXRjaDogWzFdIHllYXIgWzJdIG1vbnRoIFszXSBkYXlcblxuICB5ZWFyID0gKyhtYXRjaFsxXSk7XG4gIG1vbnRoID0gKyhtYXRjaFsyXSkgLSAxOyAvLyBKUyBtb250aCBzdGFydHMgd2l0aCAwXG4gIGRheSA9ICsobWF0Y2hbM10pO1xuXG4gIGlmICghbWF0Y2hbNF0pIHsgLy8gbm8gaG91clxuICAgIHJldHVybiBuZXcgRGF0ZShEYXRlLlVUQyh5ZWFyLCBtb250aCwgZGF5KSk7XG4gIH1cblxuICAvLyBtYXRjaDogWzRdIGhvdXIgWzVdIG1pbnV0ZSBbNl0gc2Vjb25kIFs3XSBmcmFjdGlvblxuXG4gIGhvdXIgPSArKG1hdGNoWzRdKTtcbiAgbWludXRlID0gKyhtYXRjaFs1XSk7XG4gIHNlY29uZCA9ICsobWF0Y2hbNl0pO1xuXG4gIGlmIChtYXRjaFs3XSkge1xuICAgIGZyYWN0aW9uID0gbWF0Y2hbN10uc2xpY2UoMCwgMyk7XG4gICAgd2hpbGUgKGZyYWN0aW9uLmxlbmd0aCA8IDMpIHsgLy8gbWlsbGktc2Vjb25kc1xuICAgICAgZnJhY3Rpb24gKz0gJzAnO1xuICAgIH1cbiAgICBmcmFjdGlvbiA9ICtmcmFjdGlvbjtcbiAgfVxuXG4gIC8vIG1hdGNoOiBbOF0gdHogWzldIHR6X3NpZ24gWzEwXSB0el9ob3VyIFsxMV0gdHpfbWludXRlXG5cbiAgaWYgKG1hdGNoWzldKSB7XG4gICAgdHpfaG91ciA9ICsobWF0Y2hbMTBdKTtcbiAgICB0el9taW51dGUgPSArKG1hdGNoWzExXSB8fCAwKTtcbiAgICBkZWx0YSA9ICh0el9ob3VyICogNjAgKyB0el9taW51dGUpICogNjAwMDA7IC8vIGRlbHRhIGluIG1pbGktc2Vjb25kc1xuICAgIGlmIChtYXRjaFs5XSA9PT0gJy0nKSBkZWx0YSA9IC1kZWx0YTtcbiAgfVxuXG4gIGRhdGUgPSBuZXcgRGF0ZShEYXRlLlVUQyh5ZWFyLCBtb250aCwgZGF5LCBob3VyLCBtaW51dGUsIHNlY29uZCwgZnJhY3Rpb24pKTtcblxuICBpZiAoZGVsdGEpIGRhdGUuc2V0VGltZShkYXRlLmdldFRpbWUoKSAtIGRlbHRhKTtcblxuICByZXR1cm4gZGF0ZTtcbn1cblxuZnVuY3Rpb24gcmVwcmVzZW50WWFtbFRpbWVzdGFtcChvYmplY3QgLyosIHN0eWxlKi8pIHtcbiAgcmV0dXJuIG9iamVjdC50b0lTT1N0cmluZygpO1xufVxuXG52YXIgdGltZXN0YW1wID0gbmV3IHR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOnRpbWVzdGFtcCcsIHtcbiAga2luZDogJ3NjYWxhcicsXG4gIHJlc29sdmU6IHJlc29sdmVZYW1sVGltZXN0YW1wLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxUaW1lc3RhbXAsXG4gIGluc3RhbmNlT2Y6IERhdGUsXG4gIHJlcHJlc2VudDogcmVwcmVzZW50WWFtbFRpbWVzdGFtcFxufSk7XG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sTWVyZ2UoZGF0YSkge1xuICByZXR1cm4gZGF0YSA9PT0gJzw8JyB8fCBkYXRhID09PSBudWxsO1xufVxuXG52YXIgbWVyZ2UgPSBuZXcgdHlwZSgndGFnOnlhbWwub3JnLDIwMDI6bWVyZ2UnLCB7XG4gIGtpbmQ6ICdzY2FsYXInLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbE1lcmdlXG59KTtcblxuLyplc2xpbnQtZGlzYWJsZSBuby1iaXR3aXNlKi9cblxuXG5cblxuXG4vLyBbIDY0LCA2NSwgNjYgXSAtPiBbIHBhZGRpbmcsIENSLCBMRiBdXG52YXIgQkFTRTY0X01BUCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvPVxcblxccic7XG5cblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxCaW5hcnkoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBjb2RlLCBpZHgsIGJpdGxlbiA9IDAsIG1heCA9IGRhdGEubGVuZ3RoLCBtYXAgPSBCQVNFNjRfTUFQO1xuXG4gIC8vIENvbnZlcnQgb25lIGJ5IG9uZS5cbiAgZm9yIChpZHggPSAwOyBpZHggPCBtYXg7IGlkeCsrKSB7XG4gICAgY29kZSA9IG1hcC5pbmRleE9mKGRhdGEuY2hhckF0KGlkeCkpO1xuXG4gICAgLy8gU2tpcCBDUi9MRlxuICAgIGlmIChjb2RlID4gNjQpIGNvbnRpbnVlO1xuXG4gICAgLy8gRmFpbCBvbiBpbGxlZ2FsIGNoYXJhY3RlcnNcbiAgICBpZiAoY29kZSA8IDApIHJldHVybiBmYWxzZTtcblxuICAgIGJpdGxlbiArPSA2O1xuICB9XG5cbiAgLy8gSWYgdGhlcmUgYXJlIGFueSBiaXRzIGxlZnQsIHNvdXJjZSB3YXMgY29ycnVwdGVkXG4gIHJldHVybiAoYml0bGVuICUgOCkgPT09IDA7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxCaW5hcnkoZGF0YSkge1xuICB2YXIgaWR4LCB0YWlsYml0cyxcbiAgICAgIGlucHV0ID0gZGF0YS5yZXBsYWNlKC9bXFxyXFxuPV0vZywgJycpLCAvLyByZW1vdmUgQ1IvTEYgJiBwYWRkaW5nIHRvIHNpbXBsaWZ5IHNjYW5cbiAgICAgIG1heCA9IGlucHV0Lmxlbmd0aCxcbiAgICAgIG1hcCA9IEJBU0U2NF9NQVAsXG4gICAgICBiaXRzID0gMCxcbiAgICAgIHJlc3VsdCA9IFtdO1xuXG4gIC8vIENvbGxlY3QgYnkgNio0IGJpdHMgKDMgYnl0ZXMpXG5cbiAgZm9yIChpZHggPSAwOyBpZHggPCBtYXg7IGlkeCsrKSB7XG4gICAgaWYgKChpZHggJSA0ID09PSAwKSAmJiBpZHgpIHtcbiAgICAgIHJlc3VsdC5wdXNoKChiaXRzID4+IDE2KSAmIDB4RkYpO1xuICAgICAgcmVzdWx0LnB1c2goKGJpdHMgPj4gOCkgJiAweEZGKTtcbiAgICAgIHJlc3VsdC5wdXNoKGJpdHMgJiAweEZGKTtcbiAgICB9XG5cbiAgICBiaXRzID0gKGJpdHMgPDwgNikgfCBtYXAuaW5kZXhPZihpbnB1dC5jaGFyQXQoaWR4KSk7XG4gIH1cblxuICAvLyBEdW1wIHRhaWxcblxuICB0YWlsYml0cyA9IChtYXggJSA0KSAqIDY7XG5cbiAgaWYgKHRhaWxiaXRzID09PSAwKSB7XG4gICAgcmVzdWx0LnB1c2goKGJpdHMgPj4gMTYpICYgMHhGRik7XG4gICAgcmVzdWx0LnB1c2goKGJpdHMgPj4gOCkgJiAweEZGKTtcbiAgICByZXN1bHQucHVzaChiaXRzICYgMHhGRik7XG4gIH0gZWxzZSBpZiAodGFpbGJpdHMgPT09IDE4KSB7XG4gICAgcmVzdWx0LnB1c2goKGJpdHMgPj4gMTApICYgMHhGRik7XG4gICAgcmVzdWx0LnB1c2goKGJpdHMgPj4gMikgJiAweEZGKTtcbiAgfSBlbHNlIGlmICh0YWlsYml0cyA9PT0gMTIpIHtcbiAgICByZXN1bHQucHVzaCgoYml0cyA+PiA0KSAmIDB4RkYpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBVaW50OEFycmF5KHJlc3VsdCk7XG59XG5cbmZ1bmN0aW9uIHJlcHJlc2VudFlhbWxCaW5hcnkob2JqZWN0IC8qLCBzdHlsZSovKSB7XG4gIHZhciByZXN1bHQgPSAnJywgYml0cyA9IDAsIGlkeCwgdGFpbCxcbiAgICAgIG1heCA9IG9iamVjdC5sZW5ndGgsXG4gICAgICBtYXAgPSBCQVNFNjRfTUFQO1xuXG4gIC8vIENvbnZlcnQgZXZlcnkgdGhyZWUgYnl0ZXMgdG8gNCBBU0NJSSBjaGFyYWN0ZXJzLlxuXG4gIGZvciAoaWR4ID0gMDsgaWR4IDwgbWF4OyBpZHgrKykge1xuICAgIGlmICgoaWR4ICUgMyA9PT0gMCkgJiYgaWR4KSB7XG4gICAgICByZXN1bHQgKz0gbWFwWyhiaXRzID4+IDE4KSAmIDB4M0ZdO1xuICAgICAgcmVzdWx0ICs9IG1hcFsoYml0cyA+PiAxMikgJiAweDNGXTtcbiAgICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPj4gNikgJiAweDNGXTtcbiAgICAgIHJlc3VsdCArPSBtYXBbYml0cyAmIDB4M0ZdO1xuICAgIH1cblxuICAgIGJpdHMgPSAoYml0cyA8PCA4KSArIG9iamVjdFtpZHhdO1xuICB9XG5cbiAgLy8gRHVtcCB0YWlsXG5cbiAgdGFpbCA9IG1heCAlIDM7XG5cbiAgaWYgKHRhaWwgPT09IDApIHtcbiAgICByZXN1bHQgKz0gbWFwWyhiaXRzID4+IDE4KSAmIDB4M0ZdO1xuICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPj4gMTIpICYgMHgzRl07XG4gICAgcmVzdWx0ICs9IG1hcFsoYml0cyA+PiA2KSAmIDB4M0ZdO1xuICAgIHJlc3VsdCArPSBtYXBbYml0cyAmIDB4M0ZdO1xuICB9IGVsc2UgaWYgKHRhaWwgPT09IDIpIHtcbiAgICByZXN1bHQgKz0gbWFwWyhiaXRzID4+IDEwKSAmIDB4M0ZdO1xuICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPj4gNCkgJiAweDNGXTtcbiAgICByZXN1bHQgKz0gbWFwWyhiaXRzIDw8IDIpICYgMHgzRl07XG4gICAgcmVzdWx0ICs9IG1hcFs2NF07XG4gIH0gZWxzZSBpZiAodGFpbCA9PT0gMSkge1xuICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPj4gMikgJiAweDNGXTtcbiAgICByZXN1bHQgKz0gbWFwWyhiaXRzIDw8IDQpICYgMHgzRl07XG4gICAgcmVzdWx0ICs9IG1hcFs2NF07XG4gICAgcmVzdWx0ICs9IG1hcFs2NF07XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpc0JpbmFyeShvYmopIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAgJ1tvYmplY3QgVWludDhBcnJheV0nO1xufVxuXG52YXIgYmluYXJ5ID0gbmV3IHR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOmJpbmFyeScsIHtcbiAga2luZDogJ3NjYWxhcicsXG4gIHJlc29sdmU6IHJlc29sdmVZYW1sQmluYXJ5LFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxCaW5hcnksXG4gIHByZWRpY2F0ZTogaXNCaW5hcnksXG4gIHJlcHJlc2VudDogcmVwcmVzZW50WWFtbEJpbmFyeVxufSk7XG5cbnZhciBfaGFzT3duUHJvcGVydHkkMyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgX3RvU3RyaW5nJDIgICAgICAgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5mdW5jdGlvbiByZXNvbHZlWWFtbE9tYXAoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIHRydWU7XG5cbiAgdmFyIG9iamVjdEtleXMgPSBbXSwgaW5kZXgsIGxlbmd0aCwgcGFpciwgcGFpcktleSwgcGFpckhhc0tleSxcbiAgICAgIG9iamVjdCA9IGRhdGE7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgcGFpciA9IG9iamVjdFtpbmRleF07XG4gICAgcGFpckhhc0tleSA9IGZhbHNlO1xuXG4gICAgaWYgKF90b1N0cmluZyQyLmNhbGwocGFpcikgIT09ICdbb2JqZWN0IE9iamVjdF0nKSByZXR1cm4gZmFsc2U7XG5cbiAgICBmb3IgKHBhaXJLZXkgaW4gcGFpcikge1xuICAgICAgaWYgKF9oYXNPd25Qcm9wZXJ0eSQzLmNhbGwocGFpciwgcGFpcktleSkpIHtcbiAgICAgICAgaWYgKCFwYWlySGFzS2V5KSBwYWlySGFzS2V5ID0gdHJ1ZTtcbiAgICAgICAgZWxzZSByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwYWlySGFzS2V5KSByZXR1cm4gZmFsc2U7XG5cbiAgICBpZiAob2JqZWN0S2V5cy5pbmRleE9mKHBhaXJLZXkpID09PSAtMSkgb2JqZWN0S2V5cy5wdXNoKHBhaXJLZXkpO1xuICAgIGVsc2UgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxPbWFwKGRhdGEpIHtcbiAgcmV0dXJuIGRhdGEgIT09IG51bGwgPyBkYXRhIDogW107XG59XG5cbnZhciBvbWFwID0gbmV3IHR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOm9tYXAnLCB7XG4gIGtpbmQ6ICdzZXF1ZW5jZScsXG4gIHJlc29sdmU6IHJlc29sdmVZYW1sT21hcCxcbiAgY29uc3RydWN0OiBjb25zdHJ1Y3RZYW1sT21hcFxufSk7XG5cbnZhciBfdG9TdHJpbmckMSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sUGFpcnMoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIHRydWU7XG5cbiAgdmFyIGluZGV4LCBsZW5ndGgsIHBhaXIsIGtleXMsIHJlc3VsdCxcbiAgICAgIG9iamVjdCA9IGRhdGE7XG5cbiAgcmVzdWx0ID0gbmV3IEFycmF5KG9iamVjdC5sZW5ndGgpO1xuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBvYmplY3QubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHBhaXIgPSBvYmplY3RbaW5kZXhdO1xuXG4gICAgaWYgKF90b1N0cmluZyQxLmNhbGwocGFpcikgIT09ICdbb2JqZWN0IE9iamVjdF0nKSByZXR1cm4gZmFsc2U7XG5cbiAgICBrZXlzID0gT2JqZWN0LmtleXMocGFpcik7XG5cbiAgICBpZiAoa2V5cy5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZTtcblxuICAgIHJlc3VsdFtpbmRleF0gPSBbIGtleXNbMF0sIHBhaXJba2V5c1swXV0gXTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RZYW1sUGFpcnMoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIFtdO1xuXG4gIHZhciBpbmRleCwgbGVuZ3RoLCBwYWlyLCBrZXlzLCByZXN1bHQsXG4gICAgICBvYmplY3QgPSBkYXRhO1xuXG4gIHJlc3VsdCA9IG5ldyBBcnJheShvYmplY3QubGVuZ3RoKTtcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICBwYWlyID0gb2JqZWN0W2luZGV4XTtcblxuICAgIGtleXMgPSBPYmplY3Qua2V5cyhwYWlyKTtcblxuICAgIHJlc3VsdFtpbmRleF0gPSBbIGtleXNbMF0sIHBhaXJba2V5c1swXV0gXTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbnZhciBwYWlycyA9IG5ldyB0eXBlKCd0YWc6eWFtbC5vcmcsMjAwMjpwYWlycycsIHtcbiAga2luZDogJ3NlcXVlbmNlJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxQYWlycyxcbiAgY29uc3RydWN0OiBjb25zdHJ1Y3RZYW1sUGFpcnNcbn0pO1xuXG52YXIgX2hhc093blByb3BlcnR5JDIgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5mdW5jdGlvbiByZXNvbHZlWWFtbFNldChkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gdHJ1ZTtcblxuICB2YXIga2V5LCBvYmplY3QgPSBkYXRhO1xuXG4gIGZvciAoa2V5IGluIG9iamVjdCkge1xuICAgIGlmIChfaGFzT3duUHJvcGVydHkkMi5jYWxsKG9iamVjdCwga2V5KSkge1xuICAgICAgaWYgKG9iamVjdFtrZXldICE9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxTZXQoZGF0YSkge1xuICByZXR1cm4gZGF0YSAhPT0gbnVsbCA/IGRhdGEgOiB7fTtcbn1cblxudmFyIHNldCA9IG5ldyB0eXBlKCd0YWc6eWFtbC5vcmcsMjAwMjpzZXQnLCB7XG4gIGtpbmQ6ICdtYXBwaW5nJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxTZXQsXG4gIGNvbnN0cnVjdDogY29uc3RydWN0WWFtbFNldFxufSk7XG5cbnZhciBfZGVmYXVsdCA9IGNvcmUuZXh0ZW5kKHtcbiAgaW1wbGljaXQ6IFtcbiAgICB0aW1lc3RhbXAsXG4gICAgbWVyZ2VcbiAgXSxcbiAgZXhwbGljaXQ6IFtcbiAgICBiaW5hcnksXG4gICAgb21hcCxcbiAgICBwYWlycyxcbiAgICBzZXRcbiAgXVxufSk7XG5cbi8qZXNsaW50LWRpc2FibGUgbWF4LWxlbixuby11c2UtYmVmb3JlLWRlZmluZSovXG5cblxuXG5cblxuXG5cbnZhciBfaGFzT3duUHJvcGVydHkkMSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cblxudmFyIENPTlRFWFRfRkxPV19JTiAgID0gMTtcbnZhciBDT05URVhUX0ZMT1dfT1VUICA9IDI7XG52YXIgQ09OVEVYVF9CTE9DS19JTiAgPSAzO1xudmFyIENPTlRFWFRfQkxPQ0tfT1VUID0gNDtcblxuXG52YXIgQ0hPTVBJTkdfQ0xJUCAgPSAxO1xudmFyIENIT01QSU5HX1NUUklQID0gMjtcbnZhciBDSE9NUElOR19LRUVQICA9IDM7XG5cblxudmFyIFBBVFRFUk5fTk9OX1BSSU5UQUJMRSAgICAgICAgID0gL1tcXHgwMC1cXHgwOFxceDBCXFx4MENcXHgwRS1cXHgxRlxceDdGLVxceDg0XFx4ODYtXFx4OUZcXHVGRkZFXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0vO1xudmFyIFBBVFRFUk5fTk9OX0FTQ0lJX0xJTkVfQlJFQUtTID0gL1tcXHg4NVxcdTIwMjhcXHUyMDI5XS87XG52YXIgUEFUVEVSTl9GTE9XX0lORElDQVRPUlMgICAgICAgPSAvWyxcXFtcXF1cXHtcXH1dLztcbnZhciBQQVRURVJOX1RBR19IQU5ETEUgICAgICAgICAgICA9IC9eKD86IXwhIXwhW2EtelxcLV0rISkkL2k7XG52YXIgUEFUVEVSTl9UQUdfVVJJICAgICAgICAgICAgICAgPSAvXig/OiF8W14sXFxbXFxdXFx7XFx9XSkoPzolWzAtOWEtZl17Mn18WzAtOWEtelxcLSM7XFwvXFw/OkAmPVxcK1xcJCxfXFwuIX5cXConXFwoXFwpXFxbXFxdXSkqJC9pO1xuXG5cbmZ1bmN0aW9uIF9jbGFzcyhvYmopIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopOyB9XG5cbmZ1bmN0aW9uIGlzX0VPTChjKSB7XG4gIHJldHVybiAoYyA9PT0gMHgwQS8qIExGICovKSB8fCAoYyA9PT0gMHgwRC8qIENSICovKTtcbn1cblxuZnVuY3Rpb24gaXNfV0hJVEVfU1BBQ0UoYykge1xuICByZXR1cm4gKGMgPT09IDB4MDkvKiBUYWIgKi8pIHx8IChjID09PSAweDIwLyogU3BhY2UgKi8pO1xufVxuXG5mdW5jdGlvbiBpc19XU19PUl9FT0woYykge1xuICByZXR1cm4gKGMgPT09IDB4MDkvKiBUYWIgKi8pIHx8XG4gICAgICAgICAoYyA9PT0gMHgyMC8qIFNwYWNlICovKSB8fFxuICAgICAgICAgKGMgPT09IDB4MEEvKiBMRiAqLykgfHxcbiAgICAgICAgIChjID09PSAweDBELyogQ1IgKi8pO1xufVxuXG5mdW5jdGlvbiBpc19GTE9XX0lORElDQVRPUihjKSB7XG4gIHJldHVybiBjID09PSAweDJDLyogLCAqLyB8fFxuICAgICAgICAgYyA9PT0gMHg1Qi8qIFsgKi8gfHxcbiAgICAgICAgIGMgPT09IDB4NUQvKiBdICovIHx8XG4gICAgICAgICBjID09PSAweDdCLyogeyAqLyB8fFxuICAgICAgICAgYyA9PT0gMHg3RC8qIH0gKi87XG59XG5cbmZ1bmN0aW9uIGZyb21IZXhDb2RlKGMpIHtcbiAgdmFyIGxjO1xuXG4gIGlmICgoMHgzMC8qIDAgKi8gPD0gYykgJiYgKGMgPD0gMHgzOS8qIDkgKi8pKSB7XG4gICAgcmV0dXJuIGMgLSAweDMwO1xuICB9XG5cbiAgLyplc2xpbnQtZGlzYWJsZSBuby1iaXR3aXNlKi9cbiAgbGMgPSBjIHwgMHgyMDtcblxuICBpZiAoKDB4NjEvKiBhICovIDw9IGxjKSAmJiAobGMgPD0gMHg2Ni8qIGYgKi8pKSB7XG4gICAgcmV0dXJuIGxjIC0gMHg2MSArIDEwO1xuICB9XG5cbiAgcmV0dXJuIC0xO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVkSGV4TGVuKGMpIHtcbiAgaWYgKGMgPT09IDB4NzgvKiB4ICovKSB7IHJldHVybiAyOyB9XG4gIGlmIChjID09PSAweDc1LyogdSAqLykgeyByZXR1cm4gNDsgfVxuICBpZiAoYyA9PT0gMHg1NS8qIFUgKi8pIHsgcmV0dXJuIDg7IH1cbiAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIGZyb21EZWNpbWFsQ29kZShjKSB7XG4gIGlmICgoMHgzMC8qIDAgKi8gPD0gYykgJiYgKGMgPD0gMHgzOS8qIDkgKi8pKSB7XG4gICAgcmV0dXJuIGMgLSAweDMwO1xuICB9XG5cbiAgcmV0dXJuIC0xO1xufVxuXG5mdW5jdGlvbiBzaW1wbGVFc2NhcGVTZXF1ZW5jZShjKSB7XG4gIC8qIGVzbGludC1kaXNhYmxlIGluZGVudCAqL1xuICByZXR1cm4gKGMgPT09IDB4MzAvKiAwICovKSA/ICdcXHgwMCcgOlxuICAgICAgICAoYyA9PT0gMHg2MS8qIGEgKi8pID8gJ1xceDA3JyA6XG4gICAgICAgIChjID09PSAweDYyLyogYiAqLykgPyAnXFx4MDgnIDpcbiAgICAgICAgKGMgPT09IDB4NzQvKiB0ICovKSA/ICdcXHgwOScgOlxuICAgICAgICAoYyA9PT0gMHgwOS8qIFRhYiAqLykgPyAnXFx4MDknIDpcbiAgICAgICAgKGMgPT09IDB4NkUvKiBuICovKSA/ICdcXHgwQScgOlxuICAgICAgICAoYyA9PT0gMHg3Ni8qIHYgKi8pID8gJ1xceDBCJyA6XG4gICAgICAgIChjID09PSAweDY2LyogZiAqLykgPyAnXFx4MEMnIDpcbiAgICAgICAgKGMgPT09IDB4NzIvKiByICovKSA/ICdcXHgwRCcgOlxuICAgICAgICAoYyA9PT0gMHg2NS8qIGUgKi8pID8gJ1xceDFCJyA6XG4gICAgICAgIChjID09PSAweDIwLyogU3BhY2UgKi8pID8gJyAnIDpcbiAgICAgICAgKGMgPT09IDB4MjIvKiBcIiAqLykgPyAnXFx4MjInIDpcbiAgICAgICAgKGMgPT09IDB4MkYvKiAvICovKSA/ICcvJyA6XG4gICAgICAgIChjID09PSAweDVDLyogXFwgKi8pID8gJ1xceDVDJyA6XG4gICAgICAgIChjID09PSAweDRFLyogTiAqLykgPyAnXFx4ODUnIDpcbiAgICAgICAgKGMgPT09IDB4NUYvKiBfICovKSA/ICdcXHhBMCcgOlxuICAgICAgICAoYyA9PT0gMHg0Qy8qIEwgKi8pID8gJ1xcdTIwMjgnIDpcbiAgICAgICAgKGMgPT09IDB4NTAvKiBQICovKSA/ICdcXHUyMDI5JyA6ICcnO1xufVxuXG5mdW5jdGlvbiBjaGFyRnJvbUNvZGVwb2ludChjKSB7XG4gIGlmIChjIDw9IDB4RkZGRikge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICB9XG4gIC8vIEVuY29kZSBVVEYtMTYgc3Vycm9nYXRlIHBhaXJcbiAgLy8gaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvVVRGLTE2I0NvZGVfcG9pbnRzX1UuMkIwMTAwMDBfdG9fVS4yQjEwRkZGRlxuICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShcbiAgICAoKGMgLSAweDAxMDAwMCkgPj4gMTApICsgMHhEODAwLFxuICAgICgoYyAtIDB4MDEwMDAwKSAmIDB4MDNGRikgKyAweERDMDBcbiAgKTtcbn1cblxuLy8gc2V0IGEgcHJvcGVydHkgb2YgYSBsaXRlcmFsIG9iamVjdCwgd2hpbGUgcHJvdGVjdGluZyBhZ2FpbnN0IHByb3RvdHlwZSBwb2xsdXRpb24sXG4vLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL25vZGVjYS9qcy15YW1sL2lzc3Vlcy8xNjQgZm9yIG1vcmUgZGV0YWlsc1xuZnVuY3Rpb24gc2V0UHJvcGVydHkob2JqZWN0LCBrZXksIHZhbHVlKSB7XG4gIC8vIHVzZWQgZm9yIHRoaXMgc3BlY2lmaWMga2V5IG9ubHkgYmVjYXVzZSBPYmplY3QuZGVmaW5lUHJvcGVydHkgaXMgc2xvd1xuICBpZiAoa2V5ID09PSAnX19wcm90b19fJykge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIGtleSwge1xuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgdmFsdWU6IHZhbHVlXG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0W2tleV0gPSB2YWx1ZTtcbiAgfVxufVxuXG52YXIgc2ltcGxlRXNjYXBlQ2hlY2sgPSBuZXcgQXJyYXkoMjU2KTsgLy8gaW50ZWdlciwgZm9yIGZhc3QgYWNjZXNzXG52YXIgc2ltcGxlRXNjYXBlTWFwID0gbmV3IEFycmF5KDI1Nik7XG5mb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgaSsrKSB7XG4gIHNpbXBsZUVzY2FwZUNoZWNrW2ldID0gc2ltcGxlRXNjYXBlU2VxdWVuY2UoaSkgPyAxIDogMDtcbiAgc2ltcGxlRXNjYXBlTWFwW2ldID0gc2ltcGxlRXNjYXBlU2VxdWVuY2UoaSk7XG59XG5cblxuZnVuY3Rpb24gU3RhdGUkMShpbnB1dCwgb3B0aW9ucykge1xuICB0aGlzLmlucHV0ID0gaW5wdXQ7XG5cbiAgdGhpcy5maWxlbmFtZSAgPSBvcHRpb25zWydmaWxlbmFtZSddICB8fCBudWxsO1xuICB0aGlzLnNjaGVtYSAgICA9IG9wdGlvbnNbJ3NjaGVtYSddICAgIHx8IF9kZWZhdWx0O1xuICB0aGlzLm9uV2FybmluZyA9IG9wdGlvbnNbJ29uV2FybmluZyddIHx8IG51bGw7XG4gIC8vIChIaWRkZW4pIFJlbW92ZT8gbWFrZXMgdGhlIGxvYWRlciB0byBleHBlY3QgWUFNTCAxLjEgZG9jdW1lbnRzXG4gIC8vIGlmIHN1Y2ggZG9jdW1lbnRzIGhhdmUgbm8gZXhwbGljaXQgJVlBTUwgZGlyZWN0aXZlXG4gIHRoaXMubGVnYWN5ICAgID0gb3B0aW9uc1snbGVnYWN5J10gICAgfHwgZmFsc2U7XG5cbiAgdGhpcy5qc29uICAgICAgPSBvcHRpb25zWydqc29uJ10gICAgICB8fCBmYWxzZTtcbiAgdGhpcy5saXN0ZW5lciAgPSBvcHRpb25zWydsaXN0ZW5lciddICB8fCBudWxsO1xuXG4gIHRoaXMuaW1wbGljaXRUeXBlcyA9IHRoaXMuc2NoZW1hLmNvbXBpbGVkSW1wbGljaXQ7XG4gIHRoaXMudHlwZU1hcCAgICAgICA9IHRoaXMuc2NoZW1hLmNvbXBpbGVkVHlwZU1hcDtcblxuICB0aGlzLmxlbmd0aCAgICAgPSBpbnB1dC5sZW5ndGg7XG4gIHRoaXMucG9zaXRpb24gICA9IDA7XG4gIHRoaXMubGluZSAgICAgICA9IDA7XG4gIHRoaXMubGluZVN0YXJ0ICA9IDA7XG4gIHRoaXMubGluZUluZGVudCA9IDA7XG5cbiAgLy8gcG9zaXRpb24gb2YgZmlyc3QgbGVhZGluZyB0YWIgaW4gdGhlIGN1cnJlbnQgbGluZSxcbiAgLy8gdXNlZCB0byBtYWtlIHN1cmUgdGhlcmUgYXJlIG5vIHRhYnMgaW4gdGhlIGluZGVudGF0aW9uXG4gIHRoaXMuZmlyc3RUYWJJbkxpbmUgPSAtMTtcblxuICB0aGlzLmRvY3VtZW50cyA9IFtdO1xuXG4gIC8qXG4gIHRoaXMudmVyc2lvbjtcbiAgdGhpcy5jaGVja0xpbmVCcmVha3M7XG4gIHRoaXMudGFnTWFwO1xuICB0aGlzLmFuY2hvck1hcDtcbiAgdGhpcy50YWc7XG4gIHRoaXMuYW5jaG9yO1xuICB0aGlzLmtpbmQ7XG4gIHRoaXMucmVzdWx0OyovXG5cbn1cblxuXG5mdW5jdGlvbiBnZW5lcmF0ZUVycm9yKHN0YXRlLCBtZXNzYWdlKSB7XG4gIHZhciBtYXJrID0ge1xuICAgIG5hbWU6ICAgICBzdGF0ZS5maWxlbmFtZSxcbiAgICBidWZmZXI6ICAgc3RhdGUuaW5wdXQuc2xpY2UoMCwgLTEpLCAvLyBvbWl0IHRyYWlsaW5nIFxcMFxuICAgIHBvc2l0aW9uOiBzdGF0ZS5wb3NpdGlvbixcbiAgICBsaW5lOiAgICAgc3RhdGUubGluZSxcbiAgICBjb2x1bW46ICAgc3RhdGUucG9zaXRpb24gLSBzdGF0ZS5saW5lU3RhcnRcbiAgfTtcblxuICBtYXJrLnNuaXBwZXQgPSBzbmlwcGV0KG1hcmspO1xuXG4gIHJldHVybiBuZXcgZXhjZXB0aW9uKG1lc3NhZ2UsIG1hcmspO1xufVxuXG5mdW5jdGlvbiB0aHJvd0Vycm9yKHN0YXRlLCBtZXNzYWdlKSB7XG4gIHRocm93IGdlbmVyYXRlRXJyb3Ioc3RhdGUsIG1lc3NhZ2UpO1xufVxuXG5mdW5jdGlvbiB0aHJvd1dhcm5pbmcoc3RhdGUsIG1lc3NhZ2UpIHtcbiAgaWYgKHN0YXRlLm9uV2FybmluZykge1xuICAgIHN0YXRlLm9uV2FybmluZy5jYWxsKG51bGwsIGdlbmVyYXRlRXJyb3Ioc3RhdGUsIG1lc3NhZ2UpKTtcbiAgfVxufVxuXG5cbnZhciBkaXJlY3RpdmVIYW5kbGVycyA9IHtcblxuICBZQU1MOiBmdW5jdGlvbiBoYW5kbGVZYW1sRGlyZWN0aXZlKHN0YXRlLCBuYW1lLCBhcmdzKSB7XG5cbiAgICB2YXIgbWF0Y2gsIG1ham9yLCBtaW5vcjtcblxuICAgIGlmIChzdGF0ZS52ZXJzaW9uICE9PSBudWxsKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnZHVwbGljYXRpb24gb2YgJVlBTUwgZGlyZWN0aXZlJyk7XG4gICAgfVxuXG4gICAgaWYgKGFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnWUFNTCBkaXJlY3RpdmUgYWNjZXB0cyBleGFjdGx5IG9uZSBhcmd1bWVudCcpO1xuICAgIH1cblxuICAgIG1hdGNoID0gL14oWzAtOV0rKVxcLihbMC05XSspJC8uZXhlYyhhcmdzWzBdKTtcblxuICAgIGlmIChtYXRjaCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2lsbC1mb3JtZWQgYXJndW1lbnQgb2YgdGhlIFlBTUwgZGlyZWN0aXZlJyk7XG4gICAgfVxuXG4gICAgbWFqb3IgPSBwYXJzZUludChtYXRjaFsxXSwgMTApO1xuICAgIG1pbm9yID0gcGFyc2VJbnQobWF0Y2hbMl0sIDEwKTtcblxuICAgIGlmIChtYWpvciAhPT0gMSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuYWNjZXB0YWJsZSBZQU1MIHZlcnNpb24gb2YgdGhlIGRvY3VtZW50Jyk7XG4gICAgfVxuXG4gICAgc3RhdGUudmVyc2lvbiA9IGFyZ3NbMF07XG4gICAgc3RhdGUuY2hlY2tMaW5lQnJlYWtzID0gKG1pbm9yIDwgMik7XG5cbiAgICBpZiAobWlub3IgIT09IDEgJiYgbWlub3IgIT09IDIpIHtcbiAgICAgIHRocm93V2FybmluZyhzdGF0ZSwgJ3Vuc3VwcG9ydGVkIFlBTUwgdmVyc2lvbiBvZiB0aGUgZG9jdW1lbnQnKTtcbiAgICB9XG4gIH0sXG5cbiAgVEFHOiBmdW5jdGlvbiBoYW5kbGVUYWdEaXJlY3RpdmUoc3RhdGUsIG5hbWUsIGFyZ3MpIHtcblxuICAgIHZhciBoYW5kbGUsIHByZWZpeDtcblxuICAgIGlmIChhcmdzLmxlbmd0aCAhPT0gMikge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ1RBRyBkaXJlY3RpdmUgYWNjZXB0cyBleGFjdGx5IHR3byBhcmd1bWVudHMnKTtcbiAgICB9XG5cbiAgICBoYW5kbGUgPSBhcmdzWzBdO1xuICAgIHByZWZpeCA9IGFyZ3NbMV07XG5cbiAgICBpZiAoIVBBVFRFUk5fVEFHX0hBTkRMRS50ZXN0KGhhbmRsZSkpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdpbGwtZm9ybWVkIHRhZyBoYW5kbGUgKGZpcnN0IGFyZ3VtZW50KSBvZiB0aGUgVEFHIGRpcmVjdGl2ZScpO1xuICAgIH1cblxuICAgIGlmIChfaGFzT3duUHJvcGVydHkkMS5jYWxsKHN0YXRlLnRhZ01hcCwgaGFuZGxlKSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3RoZXJlIGlzIGEgcHJldmlvdXNseSBkZWNsYXJlZCBzdWZmaXggZm9yIFwiJyArIGhhbmRsZSArICdcIiB0YWcgaGFuZGxlJyk7XG4gICAgfVxuXG4gICAgaWYgKCFQQVRURVJOX1RBR19VUkkudGVzdChwcmVmaXgpKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnaWxsLWZvcm1lZCB0YWcgcHJlZml4IChzZWNvbmQgYXJndW1lbnQpIG9mIHRoZSBUQUcgZGlyZWN0aXZlJyk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHByZWZpeCA9IGRlY29kZVVSSUNvbXBvbmVudChwcmVmaXgpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3RhZyBwcmVmaXggaXMgbWFsZm9ybWVkOiAnICsgcHJlZml4KTtcbiAgICB9XG5cbiAgICBzdGF0ZS50YWdNYXBbaGFuZGxlXSA9IHByZWZpeDtcbiAgfVxufTtcblxuXG5mdW5jdGlvbiBjYXB0dXJlU2VnbWVudChzdGF0ZSwgc3RhcnQsIGVuZCwgY2hlY2tKc29uKSB7XG4gIHZhciBfcG9zaXRpb24sIF9sZW5ndGgsIF9jaGFyYWN0ZXIsIF9yZXN1bHQ7XG5cbiAgaWYgKHN0YXJ0IDwgZW5kKSB7XG4gICAgX3Jlc3VsdCA9IHN0YXRlLmlucHV0LnNsaWNlKHN0YXJ0LCBlbmQpO1xuXG4gICAgaWYgKGNoZWNrSnNvbikge1xuICAgICAgZm9yIChfcG9zaXRpb24gPSAwLCBfbGVuZ3RoID0gX3Jlc3VsdC5sZW5ndGg7IF9wb3NpdGlvbiA8IF9sZW5ndGg7IF9wb3NpdGlvbiArPSAxKSB7XG4gICAgICAgIF9jaGFyYWN0ZXIgPSBfcmVzdWx0LmNoYXJDb2RlQXQoX3Bvc2l0aW9uKTtcbiAgICAgICAgaWYgKCEoX2NoYXJhY3RlciA9PT0gMHgwOSB8fFxuICAgICAgICAgICAgICAoMHgyMCA8PSBfY2hhcmFjdGVyICYmIF9jaGFyYWN0ZXIgPD0gMHgxMEZGRkYpKSkge1xuICAgICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdleHBlY3RlZCB2YWxpZCBKU09OIGNoYXJhY3RlcicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChQQVRURVJOX05PTl9QUklOVEFCTEUudGVzdChfcmVzdWx0KSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3RoZSBzdHJlYW0gY29udGFpbnMgbm9uLXByaW50YWJsZSBjaGFyYWN0ZXJzJyk7XG4gICAgfVxuXG4gICAgc3RhdGUucmVzdWx0ICs9IF9yZXN1bHQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWVyZ2VNYXBwaW5ncyhzdGF0ZSwgZGVzdGluYXRpb24sIHNvdXJjZSwgb3ZlcnJpZGFibGVLZXlzKSB7XG4gIHZhciBzb3VyY2VLZXlzLCBrZXksIGluZGV4LCBxdWFudGl0eTtcblxuICBpZiAoIWNvbW1vbi5pc09iamVjdChzb3VyY2UpKSB7XG4gICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2Nhbm5vdCBtZXJnZSBtYXBwaW5nczsgdGhlIHByb3ZpZGVkIHNvdXJjZSBvYmplY3QgaXMgdW5hY2NlcHRhYmxlJyk7XG4gIH1cblxuICBzb3VyY2VLZXlzID0gT2JqZWN0LmtleXMoc291cmNlKTtcblxuICBmb3IgKGluZGV4ID0gMCwgcXVhbnRpdHkgPSBzb3VyY2VLZXlzLmxlbmd0aDsgaW5kZXggPCBxdWFudGl0eTsgaW5kZXggKz0gMSkge1xuICAgIGtleSA9IHNvdXJjZUtleXNbaW5kZXhdO1xuXG4gICAgaWYgKCFfaGFzT3duUHJvcGVydHkkMS5jYWxsKGRlc3RpbmF0aW9uLCBrZXkpKSB7XG4gICAgICBzZXRQcm9wZXJ0eShkZXN0aW5hdGlvbiwga2V5LCBzb3VyY2Vba2V5XSk7XG4gICAgICBvdmVycmlkYWJsZUtleXNba2V5XSA9IHRydWU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHN0b3JlTWFwcGluZ1BhaXIoc3RhdGUsIF9yZXN1bHQsIG92ZXJyaWRhYmxlS2V5cywga2V5VGFnLCBrZXlOb2RlLCB2YWx1ZU5vZGUsXG4gIHN0YXJ0TGluZSwgc3RhcnRMaW5lU3RhcnQsIHN0YXJ0UG9zKSB7XG5cbiAgdmFyIGluZGV4LCBxdWFudGl0eTtcblxuICAvLyBUaGUgb3V0cHV0IGlzIGEgcGxhaW4gb2JqZWN0IGhlcmUsIHNvIGtleXMgY2FuIG9ubHkgYmUgc3RyaW5ncy5cbiAgLy8gV2UgbmVlZCB0byBjb252ZXJ0IGtleU5vZGUgdG8gYSBzdHJpbmcsIGJ1dCBkb2luZyBzbyBjYW4gaGFuZyB0aGUgcHJvY2Vzc1xuICAvLyAoZGVlcGx5IG5lc3RlZCBhcnJheXMgdGhhdCBleHBsb2RlIGV4cG9uZW50aWFsbHkgdXNpbmcgYWxpYXNlcykuXG4gIGlmIChBcnJheS5pc0FycmF5KGtleU5vZGUpKSB7XG4gICAga2V5Tm9kZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGtleU5vZGUpO1xuXG4gICAgZm9yIChpbmRleCA9IDAsIHF1YW50aXR5ID0ga2V5Tm9kZS5sZW5ndGg7IGluZGV4IDwgcXVhbnRpdHk7IGluZGV4ICs9IDEpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGtleU5vZGVbaW5kZXhdKSkge1xuICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnbmVzdGVkIGFycmF5cyBhcmUgbm90IHN1cHBvcnRlZCBpbnNpZGUga2V5cycpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGtleU5vZGUgPT09ICdvYmplY3QnICYmIF9jbGFzcyhrZXlOb2RlW2luZGV4XSkgPT09ICdbb2JqZWN0IE9iamVjdF0nKSB7XG4gICAgICAgIGtleU5vZGVbaW5kZXhdID0gJ1tvYmplY3QgT2JqZWN0XSc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQXZvaWQgY29kZSBleGVjdXRpb24gaW4gbG9hZCgpIHZpYSB0b1N0cmluZyBwcm9wZXJ0eVxuICAvLyAoc3RpbGwgdXNlIGl0cyBvd24gdG9TdHJpbmcgZm9yIGFycmF5cywgdGltZXN0YW1wcyxcbiAgLy8gYW5kIHdoYXRldmVyIHVzZXIgc2NoZW1hIGV4dGVuc2lvbnMgaGFwcGVuIHRvIGhhdmUgQEB0b1N0cmluZ1RhZylcbiAgaWYgKHR5cGVvZiBrZXlOb2RlID09PSAnb2JqZWN0JyAmJiBfY2xhc3Moa2V5Tm9kZSkgPT09ICdbb2JqZWN0IE9iamVjdF0nKSB7XG4gICAga2V5Tm9kZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuICB9XG5cblxuICBrZXlOb2RlID0gU3RyaW5nKGtleU5vZGUpO1xuXG4gIGlmIChfcmVzdWx0ID09PSBudWxsKSB7XG4gICAgX3Jlc3VsdCA9IHt9O1xuICB9XG5cbiAgaWYgKGtleVRhZyA9PT0gJ3RhZzp5YW1sLm9yZywyMDAyOm1lcmdlJykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlTm9kZSkpIHtcbiAgICAgIGZvciAoaW5kZXggPSAwLCBxdWFudGl0eSA9IHZhbHVlTm9kZS5sZW5ndGg7IGluZGV4IDwgcXVhbnRpdHk7IGluZGV4ICs9IDEpIHtcbiAgICAgICAgbWVyZ2VNYXBwaW5ncyhzdGF0ZSwgX3Jlc3VsdCwgdmFsdWVOb2RlW2luZGV4XSwgb3ZlcnJpZGFibGVLZXlzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbWVyZ2VNYXBwaW5ncyhzdGF0ZSwgX3Jlc3VsdCwgdmFsdWVOb2RlLCBvdmVycmlkYWJsZUtleXMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoIXN0YXRlLmpzb24gJiZcbiAgICAgICAgIV9oYXNPd25Qcm9wZXJ0eSQxLmNhbGwob3ZlcnJpZGFibGVLZXlzLCBrZXlOb2RlKSAmJlxuICAgICAgICBfaGFzT3duUHJvcGVydHkkMS5jYWxsKF9yZXN1bHQsIGtleU5vZGUpKSB7XG4gICAgICBzdGF0ZS5saW5lID0gc3RhcnRMaW5lIHx8IHN0YXRlLmxpbmU7XG4gICAgICBzdGF0ZS5saW5lU3RhcnQgPSBzdGFydExpbmVTdGFydCB8fCBzdGF0ZS5saW5lU3RhcnQ7XG4gICAgICBzdGF0ZS5wb3NpdGlvbiA9IHN0YXJ0UG9zIHx8IHN0YXRlLnBvc2l0aW9uO1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2R1cGxpY2F0ZWQgbWFwcGluZyBrZXknKTtcbiAgICB9XG5cbiAgICBzZXRQcm9wZXJ0eShfcmVzdWx0LCBrZXlOb2RlLCB2YWx1ZU5vZGUpO1xuICAgIGRlbGV0ZSBvdmVycmlkYWJsZUtleXNba2V5Tm9kZV07XG4gIH1cblxuICByZXR1cm4gX3Jlc3VsdDtcbn1cblxuZnVuY3Rpb24gcmVhZExpbmVCcmVhayhzdGF0ZSkge1xuICB2YXIgY2g7XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoY2ggPT09IDB4MEEvKiBMRiAqLykge1xuICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gIH0gZWxzZSBpZiAoY2ggPT09IDB4MEQvKiBDUiAqLykge1xuICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgaWYgKHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pID09PSAweDBBLyogTEYgKi8pIHtcbiAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICdhIGxpbmUgYnJlYWsgaXMgZXhwZWN0ZWQnKTtcbiAgfVxuXG4gIHN0YXRlLmxpbmUgKz0gMTtcbiAgc3RhdGUubGluZVN0YXJ0ID0gc3RhdGUucG9zaXRpb247XG4gIHN0YXRlLmZpcnN0VGFiSW5MaW5lID0gLTE7XG59XG5cbmZ1bmN0aW9uIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIGFsbG93Q29tbWVudHMsIGNoZWNrSW5kZW50KSB7XG4gIHZhciBsaW5lQnJlYWtzID0gMCxcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgd2hpbGUgKGlzX1dISVRFX1NQQUNFKGNoKSkge1xuICAgICAgaWYgKGNoID09PSAweDA5LyogVGFiICovICYmIHN0YXRlLmZpcnN0VGFiSW5MaW5lID09PSAtMSkge1xuICAgICAgICBzdGF0ZS5maXJzdFRhYkluTGluZSA9IHN0YXRlLnBvc2l0aW9uO1xuICAgICAgfVxuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgIH1cblxuICAgIGlmIChhbGxvd0NvbW1lbnRzICYmIGNoID09PSAweDIzLyogIyAqLykge1xuICAgICAgZG8ge1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICB9IHdoaWxlIChjaCAhPT0gMHgwQS8qIExGICovICYmIGNoICE9PSAweDBELyogQ1IgKi8gJiYgY2ggIT09IDApO1xuICAgIH1cblxuICAgIGlmIChpc19FT0woY2gpKSB7XG4gICAgICByZWFkTGluZUJyZWFrKHN0YXRlKTtcblxuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcbiAgICAgIGxpbmVCcmVha3MrKztcbiAgICAgIHN0YXRlLmxpbmVJbmRlbnQgPSAwO1xuXG4gICAgICB3aGlsZSAoY2ggPT09IDB4MjAvKiBTcGFjZSAqLykge1xuICAgICAgICBzdGF0ZS5saW5lSW5kZW50Kys7XG4gICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKGNoZWNrSW5kZW50ICE9PSAtMSAmJiBsaW5lQnJlYWtzICE9PSAwICYmIHN0YXRlLmxpbmVJbmRlbnQgPCBjaGVja0luZGVudCkge1xuICAgIHRocm93V2FybmluZyhzdGF0ZSwgJ2RlZmljaWVudCBpbmRlbnRhdGlvbicpO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVCcmVha3M7XG59XG5cbmZ1bmN0aW9uIHRlc3REb2N1bWVudFNlcGFyYXRvcihzdGF0ZSkge1xuICB2YXIgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb24sXG4gICAgICBjaDtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoX3Bvc2l0aW9uKTtcblxuICAvLyBDb25kaXRpb24gc3RhdGUucG9zaXRpb24gPT09IHN0YXRlLmxpbmVTdGFydCBpcyB0ZXN0ZWRcbiAgLy8gaW4gcGFyZW50IG9uIGVhY2ggY2FsbCwgZm9yIGVmZmljaWVuY3kuIE5vIG5lZWRzIHRvIHRlc3QgaGVyZSBhZ2Fpbi5cbiAgaWYgKChjaCA9PT0gMHgyRC8qIC0gKi8gfHwgY2ggPT09IDB4MkUvKiAuICovKSAmJlxuICAgICAgY2ggPT09IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoX3Bvc2l0aW9uICsgMSkgJiZcbiAgICAgIGNoID09PSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KF9wb3NpdGlvbiArIDIpKSB7XG5cbiAgICBfcG9zaXRpb24gKz0gMztcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChfcG9zaXRpb24pO1xuXG4gICAgaWYgKGNoID09PSAwIHx8IGlzX1dTX09SX0VPTChjaCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gd3JpdGVGb2xkZWRMaW5lcyhzdGF0ZSwgY291bnQpIHtcbiAgaWYgKGNvdW50ID09PSAxKSB7XG4gICAgc3RhdGUucmVzdWx0ICs9ICcgJztcbiAgfSBlbHNlIGlmIChjb3VudCA+IDEpIHtcbiAgICBzdGF0ZS5yZXN1bHQgKz0gY29tbW9uLnJlcGVhdCgnXFxuJywgY291bnQgLSAxKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHJlYWRQbGFpblNjYWxhcihzdGF0ZSwgbm9kZUluZGVudCwgd2l0aGluRmxvd0NvbGxlY3Rpb24pIHtcbiAgdmFyIHByZWNlZGluZyxcbiAgICAgIGZvbGxvd2luZyxcbiAgICAgIGNhcHR1cmVTdGFydCxcbiAgICAgIGNhcHR1cmVFbmQsXG4gICAgICBoYXNQZW5kaW5nQ29udGVudCxcbiAgICAgIF9saW5lLFxuICAgICAgX2xpbmVTdGFydCxcbiAgICAgIF9saW5lSW5kZW50LFxuICAgICAgX2tpbmQgPSBzdGF0ZS5raW5kLFxuICAgICAgX3Jlc3VsdCA9IHN0YXRlLnJlc3VsdCxcbiAgICAgIGNoO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGlzX1dTX09SX0VPTChjaCkgICAgICB8fFxuICAgICAgaXNfRkxPV19JTkRJQ0FUT1IoY2gpIHx8XG4gICAgICBjaCA9PT0gMHgyMy8qICMgKi8gICAgfHxcbiAgICAgIGNoID09PSAweDI2LyogJiAqLyAgICB8fFxuICAgICAgY2ggPT09IDB4MkEvKiAqICovICAgIHx8XG4gICAgICBjaCA9PT0gMHgyMS8qICEgKi8gICAgfHxcbiAgICAgIGNoID09PSAweDdDLyogfCAqLyAgICB8fFxuICAgICAgY2ggPT09IDB4M0UvKiA+ICovICAgIHx8XG4gICAgICBjaCA9PT0gMHgyNy8qICcgKi8gICAgfHxcbiAgICAgIGNoID09PSAweDIyLyogXCIgKi8gICAgfHxcbiAgICAgIGNoID09PSAweDI1LyogJSAqLyAgICB8fFxuICAgICAgY2ggPT09IDB4NDAvKiBAICovICAgIHx8XG4gICAgICBjaCA9PT0gMHg2MC8qIGAgKi8pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoY2ggPT09IDB4M0YvKiA/ICovIHx8IGNoID09PSAweDJELyogLSAqLykge1xuICAgIGZvbGxvd2luZyA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24gKyAxKTtcblxuICAgIGlmIChpc19XU19PUl9FT0woZm9sbG93aW5nKSB8fFxuICAgICAgICB3aXRoaW5GbG93Q29sbGVjdGlvbiAmJiBpc19GTE9XX0lORElDQVRPUihmb2xsb3dpbmcpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgc3RhdGUua2luZCA9ICdzY2FsYXInO1xuICBzdGF0ZS5yZXN1bHQgPSAnJztcbiAgY2FwdHVyZVN0YXJ0ID0gY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuICBoYXNQZW5kaW5nQ29udGVudCA9IGZhbHNlO1xuXG4gIHdoaWxlIChjaCAhPT0gMCkge1xuICAgIGlmIChjaCA9PT0gMHgzQS8qIDogKi8pIHtcbiAgICAgIGZvbGxvd2luZyA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24gKyAxKTtcblxuICAgICAgaWYgKGlzX1dTX09SX0VPTChmb2xsb3dpbmcpIHx8XG4gICAgICAgICAgd2l0aGluRmxvd0NvbGxlY3Rpb24gJiYgaXNfRkxPV19JTkRJQ0FUT1IoZm9sbG93aW5nKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAoY2ggPT09IDB4MjMvKiAjICovKSB7XG4gICAgICBwcmVjZWRpbmcgPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uIC0gMSk7XG5cbiAgICAgIGlmIChpc19XU19PUl9FT0wocHJlY2VkaW5nKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAoKHN0YXRlLnBvc2l0aW9uID09PSBzdGF0ZS5saW5lU3RhcnQgJiYgdGVzdERvY3VtZW50U2VwYXJhdG9yKHN0YXRlKSkgfHxcbiAgICAgICAgICAgICAgIHdpdGhpbkZsb3dDb2xsZWN0aW9uICYmIGlzX0ZMT1dfSU5ESUNBVE9SKGNoKSkge1xuICAgICAgYnJlYWs7XG5cbiAgICB9IGVsc2UgaWYgKGlzX0VPTChjaCkpIHtcbiAgICAgIF9saW5lID0gc3RhdGUubGluZTtcbiAgICAgIF9saW5lU3RhcnQgPSBzdGF0ZS5saW5lU3RhcnQ7XG4gICAgICBfbGluZUluZGVudCA9IHN0YXRlLmxpbmVJbmRlbnQ7XG4gICAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCBmYWxzZSwgLTEpO1xuXG4gICAgICBpZiAoc3RhdGUubGluZUluZGVudCA+PSBub2RlSW5kZW50KSB7XG4gICAgICAgIGhhc1BlbmRpbmdDb250ZW50ID0gdHJ1ZTtcbiAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5wb3NpdGlvbiA9IGNhcHR1cmVFbmQ7XG4gICAgICAgIHN0YXRlLmxpbmUgPSBfbGluZTtcbiAgICAgICAgc3RhdGUubGluZVN0YXJ0ID0gX2xpbmVTdGFydDtcbiAgICAgICAgc3RhdGUubGluZUluZGVudCA9IF9saW5lSW5kZW50O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGFzUGVuZGluZ0NvbnRlbnQpIHtcbiAgICAgIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIGNhcHR1cmVFbmQsIGZhbHNlKTtcbiAgICAgIHdyaXRlRm9sZGVkTGluZXMoc3RhdGUsIHN0YXRlLmxpbmUgLSBfbGluZSk7XG4gICAgICBjYXB0dXJlU3RhcnQgPSBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG4gICAgICBoYXNQZW5kaW5nQ29udGVudCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghaXNfV0hJVEVfU1BBQ0UoY2gpKSB7XG4gICAgICBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb24gKyAxO1xuICAgIH1cblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgfVxuXG4gIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIGNhcHR1cmVFbmQsIGZhbHNlKTtcblxuICBpZiAoc3RhdGUucmVzdWx0KSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBzdGF0ZS5raW5kID0gX2tpbmQ7XG4gIHN0YXRlLnJlc3VsdCA9IF9yZXN1bHQ7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmVhZFNpbmdsZVF1b3RlZFNjYWxhcihzdGF0ZSwgbm9kZUluZGVudCkge1xuICB2YXIgY2gsXG4gICAgICBjYXB0dXJlU3RhcnQsIGNhcHR1cmVFbmQ7XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoY2ggIT09IDB4MjcvKiAnICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgc3RhdGUua2luZCA9ICdzY2FsYXInO1xuICBzdGF0ZS5yZXN1bHQgPSAnJztcbiAgc3RhdGUucG9zaXRpb24rKztcbiAgY2FwdHVyZVN0YXJ0ID0gY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuXG4gIHdoaWxlICgoY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKSkgIT09IDApIHtcbiAgICBpZiAoY2ggPT09IDB4MjcvKiAnICovKSB7XG4gICAgICBjYXB0dXJlU2VnbWVudChzdGF0ZSwgY2FwdHVyZVN0YXJ0LCBzdGF0ZS5wb3NpdGlvbiwgdHJ1ZSk7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICAgIGlmIChjaCA9PT0gMHgyNy8qICcgKi8pIHtcbiAgICAgICAgY2FwdHVyZVN0YXJ0ID0gc3RhdGUucG9zaXRpb247XG4gICAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgICAgIGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIGlmIChpc19FT0woY2gpKSB7XG4gICAgICBjYXB0dXJlU2VnbWVudChzdGF0ZSwgY2FwdHVyZVN0YXJ0LCBjYXB0dXJlRW5kLCB0cnVlKTtcbiAgICAgIHdyaXRlRm9sZGVkTGluZXMoc3RhdGUsIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIGZhbHNlLCBub2RlSW5kZW50KSk7XG4gICAgICBjYXB0dXJlU3RhcnQgPSBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG5cbiAgICB9IGVsc2UgaWYgKHN0YXRlLnBvc2l0aW9uID09PSBzdGF0ZS5saW5lU3RhcnQgJiYgdGVzdERvY3VtZW50U2VwYXJhdG9yKHN0YXRlKSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuZXhwZWN0ZWQgZW5kIG9mIHRoZSBkb2N1bWVudCB3aXRoaW4gYSBzaW5nbGUgcXVvdGVkIHNjYWxhcicpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgICBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG4gICAgfVxuICB9XG5cbiAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuZXhwZWN0ZWQgZW5kIG9mIHRoZSBzdHJlYW0gd2l0aGluIGEgc2luZ2xlIHF1b3RlZCBzY2FsYXInKTtcbn1cblxuZnVuY3Rpb24gcmVhZERvdWJsZVF1b3RlZFNjYWxhcihzdGF0ZSwgbm9kZUluZGVudCkge1xuICB2YXIgY2FwdHVyZVN0YXJ0LFxuICAgICAgY2FwdHVyZUVuZCxcbiAgICAgIGhleExlbmd0aCxcbiAgICAgIGhleFJlc3VsdCxcbiAgICAgIHRtcCxcbiAgICAgIGNoO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoICE9PSAweDIyLyogXCIgKi8pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBzdGF0ZS5raW5kID0gJ3NjYWxhcic7XG4gIHN0YXRlLnJlc3VsdCA9ICcnO1xuICBzdGF0ZS5wb3NpdGlvbisrO1xuICBjYXB0dXJlU3RhcnQgPSBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG5cbiAgd2hpbGUgKChjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pKSAhPT0gMCkge1xuICAgIGlmIChjaCA9PT0gMHgyMi8qIFwiICovKSB7XG4gICAgICBjYXB0dXJlU2VnbWVudChzdGF0ZSwgY2FwdHVyZVN0YXJ0LCBzdGF0ZS5wb3NpdGlvbiwgdHJ1ZSk7XG4gICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICB9IGVsc2UgaWYgKGNoID09PSAweDVDLyogXFwgKi8pIHtcbiAgICAgIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIHN0YXRlLnBvc2l0aW9uLCB0cnVlKTtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICAgICAgaWYgKGlzX0VPTChjaCkpIHtcbiAgICAgICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgZmFsc2UsIG5vZGVJbmRlbnQpO1xuXG4gICAgICAgIC8vIFRPRE86IHJld29yayB0byBpbmxpbmUgZm4gd2l0aCBubyB0eXBlIGNhc3Q/XG4gICAgICB9IGVsc2UgaWYgKGNoIDwgMjU2ICYmIHNpbXBsZUVzY2FwZUNoZWNrW2NoXSkge1xuICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gc2ltcGxlRXNjYXBlTWFwW2NoXTtcbiAgICAgICAgc3RhdGUucG9zaXRpb24rKztcblxuICAgICAgfSBlbHNlIGlmICgodG1wID0gZXNjYXBlZEhleExlbihjaCkpID4gMCkge1xuICAgICAgICBoZXhMZW5ndGggPSB0bXA7XG4gICAgICAgIGhleFJlc3VsdCA9IDA7XG5cbiAgICAgICAgZm9yICg7IGhleExlbmd0aCA+IDA7IGhleExlbmd0aC0tKSB7XG4gICAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gICAgICAgICAgaWYgKCh0bXAgPSBmcm9tSGV4Q29kZShjaCkpID49IDApIHtcbiAgICAgICAgICAgIGhleFJlc3VsdCA9IChoZXhSZXN1bHQgPDwgNCkgKyB0bXA7XG5cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2V4cGVjdGVkIGhleGFkZWNpbWFsIGNoYXJhY3RlcicpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLnJlc3VsdCArPSBjaGFyRnJvbUNvZGVwb2ludChoZXhSZXN1bHQpO1xuXG4gICAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd1bmtub3duIGVzY2FwZSBzZXF1ZW5jZScpO1xuICAgICAgfVxuXG4gICAgICBjYXB0dXJlU3RhcnQgPSBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG5cbiAgICB9IGVsc2UgaWYgKGlzX0VPTChjaCkpIHtcbiAgICAgIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIGNhcHR1cmVFbmQsIHRydWUpO1xuICAgICAgd3JpdGVGb2xkZWRMaW5lcyhzdGF0ZSwgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgZmFsc2UsIG5vZGVJbmRlbnQpKTtcbiAgICAgIGNhcHR1cmVTdGFydCA9IGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcblxuICAgIH0gZWxzZSBpZiAoc3RhdGUucG9zaXRpb24gPT09IHN0YXRlLmxpbmVTdGFydCAmJiB0ZXN0RG9jdW1lbnRTZXBhcmF0b3Ioc3RhdGUpKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndW5leHBlY3RlZCBlbmQgb2YgdGhlIGRvY3VtZW50IHdpdGhpbiBhIGRvdWJsZSBxdW90ZWQgc2NhbGFyJyk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICAgIGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgICB9XG4gIH1cblxuICB0aHJvd0Vycm9yKHN0YXRlLCAndW5leHBlY3RlZCBlbmQgb2YgdGhlIHN0cmVhbSB3aXRoaW4gYSBkb3VibGUgcXVvdGVkIHNjYWxhcicpO1xufVxuXG5mdW5jdGlvbiByZWFkRmxvd0NvbGxlY3Rpb24oc3RhdGUsIG5vZGVJbmRlbnQpIHtcbiAgdmFyIHJlYWROZXh0ID0gdHJ1ZSxcbiAgICAgIF9saW5lLFxuICAgICAgX2xpbmVTdGFydCxcbiAgICAgIF9wb3MsXG4gICAgICBfdGFnICAgICA9IHN0YXRlLnRhZyxcbiAgICAgIF9yZXN1bHQsXG4gICAgICBfYW5jaG9yICA9IHN0YXRlLmFuY2hvcixcbiAgICAgIGZvbGxvd2luZyxcbiAgICAgIHRlcm1pbmF0b3IsXG4gICAgICBpc1BhaXIsXG4gICAgICBpc0V4cGxpY2l0UGFpcixcbiAgICAgIGlzTWFwcGluZyxcbiAgICAgIG92ZXJyaWRhYmxlS2V5cyA9IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgICBrZXlOb2RlLFxuICAgICAga2V5VGFnLFxuICAgICAgdmFsdWVOb2RlLFxuICAgICAgY2g7XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoY2ggPT09IDB4NUIvKiBbICovKSB7XG4gICAgdGVybWluYXRvciA9IDB4NUQ7LyogXSAqL1xuICAgIGlzTWFwcGluZyA9IGZhbHNlO1xuICAgIF9yZXN1bHQgPSBbXTtcbiAgfSBlbHNlIGlmIChjaCA9PT0gMHg3Qi8qIHsgKi8pIHtcbiAgICB0ZXJtaW5hdG9yID0gMHg3RDsvKiB9ICovXG4gICAgaXNNYXBwaW5nID0gdHJ1ZTtcbiAgICBfcmVzdWx0ID0ge307XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKHN0YXRlLmFuY2hvciAhPT0gbnVsbCkge1xuICAgIHN0YXRlLmFuY2hvck1hcFtzdGF0ZS5hbmNob3JdID0gX3Jlc3VsdDtcbiAgfVxuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICB3aGlsZSAoY2ggIT09IDApIHtcbiAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCBub2RlSW5kZW50KTtcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoY2ggPT09IHRlcm1pbmF0b3IpIHtcbiAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgICBzdGF0ZS50YWcgPSBfdGFnO1xuICAgICAgc3RhdGUuYW5jaG9yID0gX2FuY2hvcjtcbiAgICAgIHN0YXRlLmtpbmQgPSBpc01hcHBpbmcgPyAnbWFwcGluZycgOiAnc2VxdWVuY2UnO1xuICAgICAgc3RhdGUucmVzdWx0ID0gX3Jlc3VsdDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoIXJlYWROZXh0KSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnbWlzc2VkIGNvbW1hIGJldHdlZW4gZmxvdyBjb2xsZWN0aW9uIGVudHJpZXMnKTtcbiAgICB9IGVsc2UgaWYgKGNoID09PSAweDJDLyogLCAqLykge1xuICAgICAgLy8gXCJmbG93IGNvbGxlY3Rpb24gZW50cmllcyBjYW4gbmV2ZXIgYmUgY29tcGxldGVseSBlbXB0eVwiLCBhcyBwZXIgWUFNTCAxLjIsIHNlY3Rpb24gNy40XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCBcImV4cGVjdGVkIHRoZSBub2RlIGNvbnRlbnQsIGJ1dCBmb3VuZCAnLCdcIik7XG4gICAgfVxuXG4gICAga2V5VGFnID0ga2V5Tm9kZSA9IHZhbHVlTm9kZSA9IG51bGw7XG4gICAgaXNQYWlyID0gaXNFeHBsaWNpdFBhaXIgPSBmYWxzZTtcblxuICAgIGlmIChjaCA9PT0gMHgzRi8qID8gKi8pIHtcbiAgICAgIGZvbGxvd2luZyA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24gKyAxKTtcblxuICAgICAgaWYgKGlzX1dTX09SX0VPTChmb2xsb3dpbmcpKSB7XG4gICAgICAgIGlzUGFpciA9IGlzRXhwbGljaXRQYWlyID0gdHJ1ZTtcbiAgICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICAgICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgbm9kZUluZGVudCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgX2xpbmUgPSBzdGF0ZS5saW5lOyAvLyBTYXZlIHRoZSBjdXJyZW50IGxpbmUuXG4gICAgX2xpbmVTdGFydCA9IHN0YXRlLmxpbmVTdGFydDtcbiAgICBfcG9zID0gc3RhdGUucG9zaXRpb247XG4gICAgY29tcG9zZU5vZGUoc3RhdGUsIG5vZGVJbmRlbnQsIENPTlRFWFRfRkxPV19JTiwgZmFsc2UsIHRydWUpO1xuICAgIGtleVRhZyA9IHN0YXRlLnRhZztcbiAgICBrZXlOb2RlID0gc3RhdGUucmVzdWx0O1xuICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIG5vZGVJbmRlbnQpO1xuXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICAgIGlmICgoaXNFeHBsaWNpdFBhaXIgfHwgc3RhdGUubGluZSA9PT0gX2xpbmUpICYmIGNoID09PSAweDNBLyogOiAqLykge1xuICAgICAgaXNQYWlyID0gdHJ1ZTtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIG5vZGVJbmRlbnQpO1xuICAgICAgY29tcG9zZU5vZGUoc3RhdGUsIG5vZGVJbmRlbnQsIENPTlRFWFRfRkxPV19JTiwgZmFsc2UsIHRydWUpO1xuICAgICAgdmFsdWVOb2RlID0gc3RhdGUucmVzdWx0O1xuICAgIH1cblxuICAgIGlmIChpc01hcHBpbmcpIHtcbiAgICAgIHN0b3JlTWFwcGluZ1BhaXIoc3RhdGUsIF9yZXN1bHQsIG92ZXJyaWRhYmxlS2V5cywga2V5VGFnLCBrZXlOb2RlLCB2YWx1ZU5vZGUsIF9saW5lLCBfbGluZVN0YXJ0LCBfcG9zKTtcbiAgICB9IGVsc2UgaWYgKGlzUGFpcikge1xuICAgICAgX3Jlc3VsdC5wdXNoKHN0b3JlTWFwcGluZ1BhaXIoc3RhdGUsIG51bGwsIG92ZXJyaWRhYmxlS2V5cywga2V5VGFnLCBrZXlOb2RlLCB2YWx1ZU5vZGUsIF9saW5lLCBfbGluZVN0YXJ0LCBfcG9zKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9yZXN1bHQucHVzaChrZXlOb2RlKTtcbiAgICB9XG5cbiAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCBub2RlSW5kZW50KTtcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoY2ggPT09IDB4MkMvKiAsICovKSB7XG4gICAgICByZWFkTmV4dCA9IHRydWU7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlYWROZXh0ID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuZXhwZWN0ZWQgZW5kIG9mIHRoZSBzdHJlYW0gd2l0aGluIGEgZmxvdyBjb2xsZWN0aW9uJyk7XG59XG5cbmZ1bmN0aW9uIHJlYWRCbG9ja1NjYWxhcihzdGF0ZSwgbm9kZUluZGVudCkge1xuICB2YXIgY2FwdHVyZVN0YXJ0LFxuICAgICAgZm9sZGluZyxcbiAgICAgIGNob21waW5nICAgICAgID0gQ0hPTVBJTkdfQ0xJUCxcbiAgICAgIGRpZFJlYWRDb250ZW50ID0gZmFsc2UsXG4gICAgICBkZXRlY3RlZEluZGVudCA9IGZhbHNlLFxuICAgICAgdGV4dEluZGVudCAgICAgPSBub2RlSW5kZW50LFxuICAgICAgZW1wdHlMaW5lcyAgICAgPSAwLFxuICAgICAgYXRNb3JlSW5kZW50ZWQgPSBmYWxzZSxcbiAgICAgIHRtcCxcbiAgICAgIGNoO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoID09PSAweDdDLyogfCAqLykge1xuICAgIGZvbGRpbmcgPSBmYWxzZTtcbiAgfSBlbHNlIGlmIChjaCA9PT0gMHgzRS8qID4gKi8pIHtcbiAgICBmb2xkaW5nID0gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBzdGF0ZS5raW5kID0gJ3NjYWxhcic7XG4gIHN0YXRlLnJlc3VsdCA9ICcnO1xuXG4gIHdoaWxlIChjaCAhPT0gMCkge1xuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICAgIGlmIChjaCA9PT0gMHgyQi8qICsgKi8gfHwgY2ggPT09IDB4MkQvKiAtICovKSB7XG4gICAgICBpZiAoQ0hPTVBJTkdfQ0xJUCA9PT0gY2hvbXBpbmcpIHtcbiAgICAgICAgY2hvbXBpbmcgPSAoY2ggPT09IDB4MkIvKiArICovKSA/IENIT01QSU5HX0tFRVAgOiBDSE9NUElOR19TVFJJUDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdyZXBlYXQgb2YgYSBjaG9tcGluZyBtb2RlIGlkZW50aWZpZXInKTtcbiAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAoKHRtcCA9IGZyb21EZWNpbWFsQ29kZShjaCkpID49IDApIHtcbiAgICAgIGlmICh0bXAgPT09IDApIHtcbiAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2JhZCBleHBsaWNpdCBpbmRlbnRhdGlvbiB3aWR0aCBvZiBhIGJsb2NrIHNjYWxhcjsgaXQgY2Fubm90IGJlIGxlc3MgdGhhbiBvbmUnKTtcbiAgICAgIH0gZWxzZSBpZiAoIWRldGVjdGVkSW5kZW50KSB7XG4gICAgICAgIHRleHRJbmRlbnQgPSBub2RlSW5kZW50ICsgdG1wIC0gMTtcbiAgICAgICAgZGV0ZWN0ZWRJbmRlbnQgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3JlcGVhdCBvZiBhbiBpbmRlbnRhdGlvbiB3aWR0aCBpZGVudGlmaWVyJyk7XG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKGlzX1dISVRFX1NQQUNFKGNoKSkge1xuICAgIGRvIHsgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pOyB9XG4gICAgd2hpbGUgKGlzX1dISVRFX1NQQUNFKGNoKSk7XG5cbiAgICBpZiAoY2ggPT09IDB4MjMvKiAjICovKSB7XG4gICAgICBkbyB7IGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTsgfVxuICAgICAgd2hpbGUgKCFpc19FT0woY2gpICYmIChjaCAhPT0gMCkpO1xuICAgIH1cbiAgfVxuXG4gIHdoaWxlIChjaCAhPT0gMCkge1xuICAgIHJlYWRMaW5lQnJlYWsoc3RhdGUpO1xuICAgIHN0YXRlLmxpbmVJbmRlbnQgPSAwO1xuXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICAgIHdoaWxlICgoIWRldGVjdGVkSW5kZW50IHx8IHN0YXRlLmxpbmVJbmRlbnQgPCB0ZXh0SW5kZW50KSAmJlxuICAgICAgICAgICAoY2ggPT09IDB4MjAvKiBTcGFjZSAqLykpIHtcbiAgICAgIHN0YXRlLmxpbmVJbmRlbnQrKztcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9XG5cbiAgICBpZiAoIWRldGVjdGVkSW5kZW50ICYmIHN0YXRlLmxpbmVJbmRlbnQgPiB0ZXh0SW5kZW50KSB7XG4gICAgICB0ZXh0SW5kZW50ID0gc3RhdGUubGluZUluZGVudDtcbiAgICB9XG5cbiAgICBpZiAoaXNfRU9MKGNoKSkge1xuICAgICAgZW1wdHlMaW5lcysrO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gRW5kIG9mIHRoZSBzY2FsYXIuXG4gICAgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPCB0ZXh0SW5kZW50KSB7XG5cbiAgICAgIC8vIFBlcmZvcm0gdGhlIGNob21waW5nLlxuICAgICAgaWYgKGNob21waW5nID09PSBDSE9NUElOR19LRUVQKSB7XG4gICAgICAgIHN0YXRlLnJlc3VsdCArPSBjb21tb24ucmVwZWF0KCdcXG4nLCBkaWRSZWFkQ29udGVudCA/IDEgKyBlbXB0eUxpbmVzIDogZW1wdHlMaW5lcyk7XG4gICAgICB9IGVsc2UgaWYgKGNob21waW5nID09PSBDSE9NUElOR19DTElQKSB7XG4gICAgICAgIGlmIChkaWRSZWFkQ29udGVudCkgeyAvLyBpLmUuIG9ubHkgaWYgdGhlIHNjYWxhciBpcyBub3QgZW1wdHkuXG4gICAgICAgICAgc3RhdGUucmVzdWx0ICs9ICdcXG4nO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEJyZWFrIHRoaXMgYHdoaWxlYCBjeWNsZSBhbmQgZ28gdG8gdGhlIGZ1bmNpdG9uJ3MgZXBpbG9ndWUuXG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBGb2xkZWQgc3R5bGU6IHVzZSBmYW5jeSBydWxlcyB0byBoYW5kbGUgbGluZSBicmVha3MuXG4gICAgaWYgKGZvbGRpbmcpIHtcblxuICAgICAgLy8gTGluZXMgc3RhcnRpbmcgd2l0aCB3aGl0ZSBzcGFjZSBjaGFyYWN0ZXJzIChtb3JlLWluZGVudGVkIGxpbmVzKSBhcmUgbm90IGZvbGRlZC5cbiAgICAgIGlmIChpc19XSElURV9TUEFDRShjaCkpIHtcbiAgICAgICAgYXRNb3JlSW5kZW50ZWQgPSB0cnVlO1xuICAgICAgICAvLyBleGNlcHQgZm9yIHRoZSBmaXJzdCBjb250ZW50IGxpbmUgKGNmLiBFeGFtcGxlIDguMSlcbiAgICAgICAgc3RhdGUucmVzdWx0ICs9IGNvbW1vbi5yZXBlYXQoJ1xcbicsIGRpZFJlYWRDb250ZW50ID8gMSArIGVtcHR5TGluZXMgOiBlbXB0eUxpbmVzKTtcblxuICAgICAgLy8gRW5kIG9mIG1vcmUtaW5kZW50ZWQgYmxvY2suXG4gICAgICB9IGVsc2UgaWYgKGF0TW9yZUluZGVudGVkKSB7XG4gICAgICAgIGF0TW9yZUluZGVudGVkID0gZmFsc2U7XG4gICAgICAgIHN0YXRlLnJlc3VsdCArPSBjb21tb24ucmVwZWF0KCdcXG4nLCBlbXB0eUxpbmVzICsgMSk7XG5cbiAgICAgIC8vIEp1c3Qgb25lIGxpbmUgYnJlYWsgLSBwZXJjZWl2ZSBhcyB0aGUgc2FtZSBsaW5lLlxuICAgICAgfSBlbHNlIGlmIChlbXB0eUxpbmVzID09PSAwKSB7XG4gICAgICAgIGlmIChkaWRSZWFkQ29udGVudCkgeyAvLyBpLmUuIG9ubHkgaWYgd2UgaGF2ZSBhbHJlYWR5IHJlYWQgc29tZSBzY2FsYXIgY29udGVudC5cbiAgICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gJyAnO1xuICAgICAgICB9XG5cbiAgICAgIC8vIFNldmVyYWwgbGluZSBicmVha3MgLSBwZXJjZWl2ZSBhcyBkaWZmZXJlbnQgbGluZXMuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gY29tbW9uLnJlcGVhdCgnXFxuJywgZW1wdHlMaW5lcyk7XG4gICAgICB9XG5cbiAgICAvLyBMaXRlcmFsIHN0eWxlOiBqdXN0IGFkZCBleGFjdCBudW1iZXIgb2YgbGluZSBicmVha3MgYmV0d2VlbiBjb250ZW50IGxpbmVzLlxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBLZWVwIGFsbCBsaW5lIGJyZWFrcyBleGNlcHQgdGhlIGhlYWRlciBsaW5lIGJyZWFrLlxuICAgICAgc3RhdGUucmVzdWx0ICs9IGNvbW1vbi5yZXBlYXQoJ1xcbicsIGRpZFJlYWRDb250ZW50ID8gMSArIGVtcHR5TGluZXMgOiBlbXB0eUxpbmVzKTtcbiAgICB9XG5cbiAgICBkaWRSZWFkQ29udGVudCA9IHRydWU7XG4gICAgZGV0ZWN0ZWRJbmRlbnQgPSB0cnVlO1xuICAgIGVtcHR5TGluZXMgPSAwO1xuICAgIGNhcHR1cmVTdGFydCA9IHN0YXRlLnBvc2l0aW9uO1xuXG4gICAgd2hpbGUgKCFpc19FT0woY2gpICYmIChjaCAhPT0gMCkpIHtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9XG5cbiAgICBjYXB0dXJlU2VnbWVudChzdGF0ZSwgY2FwdHVyZVN0YXJ0LCBzdGF0ZS5wb3NpdGlvbiwgZmFsc2UpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlYWRCbG9ja1NlcXVlbmNlKHN0YXRlLCBub2RlSW5kZW50KSB7XG4gIHZhciBfbGluZSxcbiAgICAgIF90YWcgICAgICA9IHN0YXRlLnRhZyxcbiAgICAgIF9hbmNob3IgICA9IHN0YXRlLmFuY2hvcixcbiAgICAgIF9yZXN1bHQgICA9IFtdLFxuICAgICAgZm9sbG93aW5nLFxuICAgICAgZGV0ZWN0ZWQgID0gZmFsc2UsXG4gICAgICBjaDtcblxuICAvLyB0aGVyZSBpcyBhIGxlYWRpbmcgdGFiIGJlZm9yZSB0aGlzIHRva2VuLCBzbyBpdCBjYW4ndCBiZSBhIGJsb2NrIHNlcXVlbmNlL21hcHBpbmc7XG4gIC8vIGl0IGNhbiBzdGlsbCBiZSBmbG93IHNlcXVlbmNlL21hcHBpbmcgb3IgYSBzY2FsYXJcbiAgaWYgKHN0YXRlLmZpcnN0VGFiSW5MaW5lICE9PSAtMSkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChzdGF0ZS5hbmNob3IgIT09IG51bGwpIHtcbiAgICBzdGF0ZS5hbmNob3JNYXBbc3RhdGUuYW5jaG9yXSA9IF9yZXN1bHQ7XG4gIH1cblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIHdoaWxlIChjaCAhPT0gMCkge1xuICAgIGlmIChzdGF0ZS5maXJzdFRhYkluTGluZSAhPT0gLTEpIHtcbiAgICAgIHN0YXRlLnBvc2l0aW9uID0gc3RhdGUuZmlyc3RUYWJJbkxpbmU7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndGFiIGNoYXJhY3RlcnMgbXVzdCBub3QgYmUgdXNlZCBpbiBpbmRlbnRhdGlvbicpO1xuICAgIH1cblxuICAgIGlmIChjaCAhPT0gMHgyRC8qIC0gKi8pIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGZvbGxvd2luZyA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24gKyAxKTtcblxuICAgIGlmICghaXNfV1NfT1JfRU9MKGZvbGxvd2luZykpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGRldGVjdGVkID0gdHJ1ZTtcbiAgICBzdGF0ZS5wb3NpdGlvbisrO1xuXG4gICAgaWYgKHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKSkge1xuICAgICAgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPD0gbm9kZUluZGVudCkge1xuICAgICAgICBfcmVzdWx0LnB1c2gobnVsbCk7XG4gICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIF9saW5lID0gc3RhdGUubGluZTtcbiAgICBjb21wb3NlTm9kZShzdGF0ZSwgbm9kZUluZGVudCwgQ09OVEVYVF9CTE9DS19JTiwgZmFsc2UsIHRydWUpO1xuICAgIF9yZXN1bHQucHVzaChzdGF0ZS5yZXN1bHQpO1xuICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoKHN0YXRlLmxpbmUgPT09IF9saW5lIHx8IHN0YXRlLmxpbmVJbmRlbnQgPiBub2RlSW5kZW50KSAmJiAoY2ggIT09IDApKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnYmFkIGluZGVudGF0aW9uIG9mIGEgc2VxdWVuY2UgZW50cnknKTtcbiAgICB9IGVsc2UgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPCBub2RlSW5kZW50KSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAoZGV0ZWN0ZWQpIHtcbiAgICBzdGF0ZS50YWcgPSBfdGFnO1xuICAgIHN0YXRlLmFuY2hvciA9IF9hbmNob3I7XG4gICAgc3RhdGUua2luZCA9ICdzZXF1ZW5jZSc7XG4gICAgc3RhdGUucmVzdWx0ID0gX3Jlc3VsdDtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHJlYWRCbG9ja01hcHBpbmcoc3RhdGUsIG5vZGVJbmRlbnQsIGZsb3dJbmRlbnQpIHtcbiAgdmFyIGZvbGxvd2luZyxcbiAgICAgIGFsbG93Q29tcGFjdCxcbiAgICAgIF9saW5lLFxuICAgICAgX2tleUxpbmUsXG4gICAgICBfa2V5TGluZVN0YXJ0LFxuICAgICAgX2tleVBvcyxcbiAgICAgIF90YWcgICAgICAgICAgPSBzdGF0ZS50YWcsXG4gICAgICBfYW5jaG9yICAgICAgID0gc3RhdGUuYW5jaG9yLFxuICAgICAgX3Jlc3VsdCAgICAgICA9IHt9LFxuICAgICAgb3ZlcnJpZGFibGVLZXlzID0gT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICAgIGtleVRhZyAgICAgICAgPSBudWxsLFxuICAgICAga2V5Tm9kZSAgICAgICA9IG51bGwsXG4gICAgICB2YWx1ZU5vZGUgICAgID0gbnVsbCxcbiAgICAgIGF0RXhwbGljaXRLZXkgPSBmYWxzZSxcbiAgICAgIGRldGVjdGVkICAgICAgPSBmYWxzZSxcbiAgICAgIGNoO1xuXG4gIC8vIHRoZXJlIGlzIGEgbGVhZGluZyB0YWIgYmVmb3JlIHRoaXMgdG9rZW4sIHNvIGl0IGNhbid0IGJlIGEgYmxvY2sgc2VxdWVuY2UvbWFwcGluZztcbiAgLy8gaXQgY2FuIHN0aWxsIGJlIGZsb3cgc2VxdWVuY2UvbWFwcGluZyBvciBhIHNjYWxhclxuICBpZiAoc3RhdGUuZmlyc3RUYWJJbkxpbmUgIT09IC0xKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKHN0YXRlLmFuY2hvciAhPT0gbnVsbCkge1xuICAgIHN0YXRlLmFuY2hvck1hcFtzdGF0ZS5hbmNob3JdID0gX3Jlc3VsdDtcbiAgfVxuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgaWYgKCFhdEV4cGxpY2l0S2V5ICYmIHN0YXRlLmZpcnN0VGFiSW5MaW5lICE9PSAtMSkge1xuICAgICAgc3RhdGUucG9zaXRpb24gPSBzdGF0ZS5maXJzdFRhYkluTGluZTtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd0YWIgY2hhcmFjdGVycyBtdXN0IG5vdCBiZSB1c2VkIGluIGluZGVudGF0aW9uJyk7XG4gICAgfVxuXG4gICAgZm9sbG93aW5nID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDEpO1xuICAgIF9saW5lID0gc3RhdGUubGluZTsgLy8gU2F2ZSB0aGUgY3VycmVudCBsaW5lLlxuXG4gICAgLy9cbiAgICAvLyBFeHBsaWNpdCBub3RhdGlvbiBjYXNlLiBUaGVyZSBhcmUgdHdvIHNlcGFyYXRlIGJsb2NrczpcbiAgICAvLyBmaXJzdCBmb3IgdGhlIGtleSAoZGVub3RlZCBieSBcIj9cIikgYW5kIHNlY29uZCBmb3IgdGhlIHZhbHVlIChkZW5vdGVkIGJ5IFwiOlwiKVxuICAgIC8vXG4gICAgaWYgKChjaCA9PT0gMHgzRi8qID8gKi8gfHwgY2ggPT09IDB4M0EvKiA6ICovKSAmJiBpc19XU19PUl9FT0woZm9sbG93aW5nKSkge1xuXG4gICAgICBpZiAoY2ggPT09IDB4M0YvKiA/ICovKSB7XG4gICAgICAgIGlmIChhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgICAgc3RvcmVNYXBwaW5nUGFpcihzdGF0ZSwgX3Jlc3VsdCwgb3ZlcnJpZGFibGVLZXlzLCBrZXlUYWcsIGtleU5vZGUsIG51bGwsIF9rZXlMaW5lLCBfa2V5TGluZVN0YXJ0LCBfa2V5UG9zKTtcbiAgICAgICAgICBrZXlUYWcgPSBrZXlOb2RlID0gdmFsdWVOb2RlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGRldGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgYXRFeHBsaWNpdEtleSA9IHRydWU7XG4gICAgICAgIGFsbG93Q29tcGFjdCA9IHRydWU7XG5cbiAgICAgIH0gZWxzZSBpZiAoYXRFeHBsaWNpdEtleSkge1xuICAgICAgICAvLyBpLmUuIDB4M0EvKiA6ICovID09PSBjaGFyYWN0ZXIgYWZ0ZXIgdGhlIGV4cGxpY2l0IGtleS5cbiAgICAgICAgYXRFeHBsaWNpdEtleSA9IGZhbHNlO1xuICAgICAgICBhbGxvd0NvbXBhY3QgPSB0cnVlO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnaW5jb21wbGV0ZSBleHBsaWNpdCBtYXBwaW5nIHBhaXI7IGEga2V5IG5vZGUgaXMgbWlzc2VkOyBvciBmb2xsb3dlZCBieSBhIG5vbi10YWJ1bGF0ZWQgZW1wdHkgbGluZScpO1xuICAgICAgfVxuXG4gICAgICBzdGF0ZS5wb3NpdGlvbiArPSAxO1xuICAgICAgY2ggPSBmb2xsb3dpbmc7XG5cbiAgICAvL1xuICAgIC8vIEltcGxpY2l0IG5vdGF0aW9uIGNhc2UuIEZsb3ctc3R5bGUgbm9kZSBhcyB0aGUga2V5IGZpcnN0LCB0aGVuIFwiOlwiLCBhbmQgdGhlIHZhbHVlLlxuICAgIC8vXG4gICAgfSBlbHNlIHtcbiAgICAgIF9rZXlMaW5lID0gc3RhdGUubGluZTtcbiAgICAgIF9rZXlMaW5lU3RhcnQgPSBzdGF0ZS5saW5lU3RhcnQ7XG4gICAgICBfa2V5UG9zID0gc3RhdGUucG9zaXRpb247XG5cbiAgICAgIGlmICghY29tcG9zZU5vZGUoc3RhdGUsIGZsb3dJbmRlbnQsIENPTlRFWFRfRkxPV19PVVQsIGZhbHNlLCB0cnVlKSkge1xuICAgICAgICAvLyBOZWl0aGVyIGltcGxpY2l0IG5vciBleHBsaWNpdCBub3RhdGlvbi5cbiAgICAgICAgLy8gUmVhZGluZyBpcyBkb25lLiBHbyB0byB0aGUgZXBpbG9ndWUuXG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBpZiAoc3RhdGUubGluZSA9PT0gX2xpbmUpIHtcbiAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICAgICAgICB3aGlsZSAoaXNfV0hJVEVfU1BBQ0UoY2gpKSB7XG4gICAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoID09PSAweDNBLyogOiAqLykge1xuICAgICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICAgICAgICAgIGlmICghaXNfV1NfT1JfRU9MKGNoKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2Egd2hpdGVzcGFjZSBjaGFyYWN0ZXIgaXMgZXhwZWN0ZWQgYWZ0ZXIgdGhlIGtleS12YWx1ZSBzZXBhcmF0b3Igd2l0aGluIGEgYmxvY2sgbWFwcGluZycpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgICAgICBzdG9yZU1hcHBpbmdQYWlyKHN0YXRlLCBfcmVzdWx0LCBvdmVycmlkYWJsZUtleXMsIGtleVRhZywga2V5Tm9kZSwgbnVsbCwgX2tleUxpbmUsIF9rZXlMaW5lU3RhcnQsIF9rZXlQb3MpO1xuICAgICAgICAgICAga2V5VGFnID0ga2V5Tm9kZSA9IHZhbHVlTm9kZSA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGV0ZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgIGF0RXhwbGljaXRLZXkgPSBmYWxzZTtcbiAgICAgICAgICBhbGxvd0NvbXBhY3QgPSBmYWxzZTtcbiAgICAgICAgICBrZXlUYWcgPSBzdGF0ZS50YWc7XG4gICAgICAgICAga2V5Tm9kZSA9IHN0YXRlLnJlc3VsdDtcblxuICAgICAgICB9IGVsc2UgaWYgKGRldGVjdGVkKSB7XG4gICAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2NhbiBub3QgcmVhZCBhbiBpbXBsaWNpdCBtYXBwaW5nIHBhaXI7IGEgY29sb24gaXMgbWlzc2VkJyk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdGF0ZS50YWcgPSBfdGFnO1xuICAgICAgICAgIHN0YXRlLmFuY2hvciA9IF9hbmNob3I7XG4gICAgICAgICAgcmV0dXJuIHRydWU7IC8vIEtlZXAgdGhlIHJlc3VsdCBvZiBgY29tcG9zZU5vZGVgLlxuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSBpZiAoZGV0ZWN0ZWQpIHtcbiAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2NhbiBub3QgcmVhZCBhIGJsb2NrIG1hcHBpbmcgZW50cnk7IGEgbXVsdGlsaW5lIGtleSBtYXkgbm90IGJlIGFuIGltcGxpY2l0IGtleScpO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS50YWcgPSBfdGFnO1xuICAgICAgICBzdGF0ZS5hbmNob3IgPSBfYW5jaG9yO1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gS2VlcCB0aGUgcmVzdWx0IG9mIGBjb21wb3NlTm9kZWAuXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy9cbiAgICAvLyBDb21tb24gcmVhZGluZyBjb2RlIGZvciBib3RoIGV4cGxpY2l0IGFuZCBpbXBsaWNpdCBub3RhdGlvbnMuXG4gICAgLy9cbiAgICBpZiAoc3RhdGUubGluZSA9PT0gX2xpbmUgfHwgc3RhdGUubGluZUluZGVudCA+IG5vZGVJbmRlbnQpIHtcbiAgICAgIGlmIChhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgIF9rZXlMaW5lID0gc3RhdGUubGluZTtcbiAgICAgICAgX2tleUxpbmVTdGFydCA9IHN0YXRlLmxpbmVTdGFydDtcbiAgICAgICAgX2tleVBvcyA9IHN0YXRlLnBvc2l0aW9uO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29tcG9zZU5vZGUoc3RhdGUsIG5vZGVJbmRlbnQsIENPTlRFWFRfQkxPQ0tfT1VULCB0cnVlLCBhbGxvd0NvbXBhY3QpKSB7XG4gICAgICAgIGlmIChhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgICAga2V5Tm9kZSA9IHN0YXRlLnJlc3VsdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZU5vZGUgPSBzdGF0ZS5yZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgIHN0b3JlTWFwcGluZ1BhaXIoc3RhdGUsIF9yZXN1bHQsIG92ZXJyaWRhYmxlS2V5cywga2V5VGFnLCBrZXlOb2RlLCB2YWx1ZU5vZGUsIF9rZXlMaW5lLCBfa2V5TGluZVN0YXJ0LCBfa2V5UG9zKTtcbiAgICAgICAga2V5VGFnID0ga2V5Tm9kZSA9IHZhbHVlTm9kZSA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG4gICAgfVxuXG4gICAgaWYgKChzdGF0ZS5saW5lID09PSBfbGluZSB8fCBzdGF0ZS5saW5lSW5kZW50ID4gbm9kZUluZGVudCkgJiYgKGNoICE9PSAwKSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2JhZCBpbmRlbnRhdGlvbiBvZiBhIG1hcHBpbmcgZW50cnknKTtcbiAgICB9IGVsc2UgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPCBub2RlSW5kZW50KSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICAvL1xuICAvLyBFcGlsb2d1ZS5cbiAgLy9cblxuICAvLyBTcGVjaWFsIGNhc2U6IGxhc3QgbWFwcGluZydzIG5vZGUgY29udGFpbnMgb25seSB0aGUga2V5IGluIGV4cGxpY2l0IG5vdGF0aW9uLlxuICBpZiAoYXRFeHBsaWNpdEtleSkge1xuICAgIHN0b3JlTWFwcGluZ1BhaXIoc3RhdGUsIF9yZXN1bHQsIG92ZXJyaWRhYmxlS2V5cywga2V5VGFnLCBrZXlOb2RlLCBudWxsLCBfa2V5TGluZSwgX2tleUxpbmVTdGFydCwgX2tleVBvcyk7XG4gIH1cblxuICAvLyBFeHBvc2UgdGhlIHJlc3VsdGluZyBtYXBwaW5nLlxuICBpZiAoZGV0ZWN0ZWQpIHtcbiAgICBzdGF0ZS50YWcgPSBfdGFnO1xuICAgIHN0YXRlLmFuY2hvciA9IF9hbmNob3I7XG4gICAgc3RhdGUua2luZCA9ICdtYXBwaW5nJztcbiAgICBzdGF0ZS5yZXN1bHQgPSBfcmVzdWx0O1xuICB9XG5cbiAgcmV0dXJuIGRldGVjdGVkO1xufVxuXG5mdW5jdGlvbiByZWFkVGFnUHJvcGVydHkoc3RhdGUpIHtcbiAgdmFyIF9wb3NpdGlvbixcbiAgICAgIGlzVmVyYmF0aW0gPSBmYWxzZSxcbiAgICAgIGlzTmFtZWQgICAgPSBmYWxzZSxcbiAgICAgIHRhZ0hhbmRsZSxcbiAgICAgIHRhZ05hbWUsXG4gICAgICBjaDtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmIChjaCAhPT0gMHgyMS8qICEgKi8pIHJldHVybiBmYWxzZTtcblxuICBpZiAoc3RhdGUudGFnICE9PSBudWxsKSB7XG4gICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2R1cGxpY2F0aW9uIG9mIGEgdGFnIHByb3BlcnR5Jyk7XG4gIH1cblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoID09PSAweDNDLyogPCAqLykge1xuICAgIGlzVmVyYmF0aW0gPSB0cnVlO1xuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICB9IGVsc2UgaWYgKGNoID09PSAweDIxLyogISAqLykge1xuICAgIGlzTmFtZWQgPSB0cnVlO1xuICAgIHRhZ0hhbmRsZSA9ICchISc7XG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gIH0gZWxzZSB7XG4gICAgdGFnSGFuZGxlID0gJyEnO1xuICB9XG5cbiAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgaWYgKGlzVmVyYmF0aW0pIHtcbiAgICBkbyB7IGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTsgfVxuICAgIHdoaWxlIChjaCAhPT0gMCAmJiBjaCAhPT0gMHgzRS8qID4gKi8pO1xuXG4gICAgaWYgKHN0YXRlLnBvc2l0aW9uIDwgc3RhdGUubGVuZ3RoKSB7XG4gICAgICB0YWdOYW1lID0gc3RhdGUuaW5wdXQuc2xpY2UoX3Bvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd1bmV4cGVjdGVkIGVuZCBvZiB0aGUgc3RyZWFtIHdpdGhpbiBhIHZlcmJhdGltIHRhZycpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB3aGlsZSAoY2ggIT09IDAgJiYgIWlzX1dTX09SX0VPTChjaCkpIHtcblxuICAgICAgaWYgKGNoID09PSAweDIxLyogISAqLykge1xuICAgICAgICBpZiAoIWlzTmFtZWQpIHtcbiAgICAgICAgICB0YWdIYW5kbGUgPSBzdGF0ZS5pbnB1dC5zbGljZShfcG9zaXRpb24gLSAxLCBzdGF0ZS5wb3NpdGlvbiArIDEpO1xuXG4gICAgICAgICAgaWYgKCFQQVRURVJOX1RBR19IQU5ETEUudGVzdCh0YWdIYW5kbGUpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnbmFtZWQgdGFnIGhhbmRsZSBjYW5ub3QgY29udGFpbiBzdWNoIGNoYXJhY3RlcnMnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpc05hbWVkID0gdHJ1ZTtcbiAgICAgICAgICBfcG9zaXRpb24gPSBzdGF0ZS5wb3NpdGlvbiArIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3RhZyBzdWZmaXggY2Fubm90IGNvbnRhaW4gZXhjbGFtYXRpb24gbWFya3MnKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfVxuXG4gICAgdGFnTmFtZSA9IHN0YXRlLmlucHV0LnNsaWNlKF9wb3NpdGlvbiwgc3RhdGUucG9zaXRpb24pO1xuXG4gICAgaWYgKFBBVFRFUk5fRkxPV19JTkRJQ0FUT1JTLnRlc3QodGFnTmFtZSkpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd0YWcgc3VmZml4IGNhbm5vdCBjb250YWluIGZsb3cgaW5kaWNhdG9yIGNoYXJhY3RlcnMnKTtcbiAgICB9XG4gIH1cblxuICBpZiAodGFnTmFtZSAmJiAhUEFUVEVSTl9UQUdfVVJJLnRlc3QodGFnTmFtZSkpIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAndGFnIG5hbWUgY2Fubm90IGNvbnRhaW4gc3VjaCBjaGFyYWN0ZXJzOiAnICsgdGFnTmFtZSk7XG4gIH1cblxuICB0cnkge1xuICAgIHRhZ05hbWUgPSBkZWNvZGVVUklDb21wb25lbnQodGFnTmFtZSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICd0YWcgbmFtZSBpcyBtYWxmb3JtZWQ6ICcgKyB0YWdOYW1lKTtcbiAgfVxuXG4gIGlmIChpc1ZlcmJhdGltKSB7XG4gICAgc3RhdGUudGFnID0gdGFnTmFtZTtcblxuICB9IGVsc2UgaWYgKF9oYXNPd25Qcm9wZXJ0eSQxLmNhbGwoc3RhdGUudGFnTWFwLCB0YWdIYW5kbGUpKSB7XG4gICAgc3RhdGUudGFnID0gc3RhdGUudGFnTWFwW3RhZ0hhbmRsZV0gKyB0YWdOYW1lO1xuXG4gIH0gZWxzZSBpZiAodGFnSGFuZGxlID09PSAnIScpIHtcbiAgICBzdGF0ZS50YWcgPSAnIScgKyB0YWdOYW1lO1xuXG4gIH0gZWxzZSBpZiAodGFnSGFuZGxlID09PSAnISEnKSB7XG4gICAgc3RhdGUudGFnID0gJ3RhZzp5YW1sLm9yZywyMDAyOicgKyB0YWdOYW1lO1xuXG4gIH0gZWxzZSB7XG4gICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuZGVjbGFyZWQgdGFnIGhhbmRsZSBcIicgKyB0YWdIYW5kbGUgKyAnXCInKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiByZWFkQW5jaG9yUHJvcGVydHkoc3RhdGUpIHtcbiAgdmFyIF9wb3NpdGlvbixcbiAgICAgIGNoO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoICE9PSAweDI2LyogJiAqLykgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChzdGF0ZS5hbmNob3IgIT09IG51bGwpIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAnZHVwbGljYXRpb24gb2YgYW4gYW5jaG9yIHByb3BlcnR5Jyk7XG4gIH1cblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gIF9wb3NpdGlvbiA9IHN0YXRlLnBvc2l0aW9uO1xuXG4gIHdoaWxlIChjaCAhPT0gMCAmJiAhaXNfV1NfT1JfRU9MKGNoKSAmJiAhaXNfRkxPV19JTkRJQ0FUT1IoY2gpKSB7XG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICB9XG5cbiAgaWYgKHN0YXRlLnBvc2l0aW9uID09PSBfcG9zaXRpb24pIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAnbmFtZSBvZiBhbiBhbmNob3Igbm9kZSBtdXN0IGNvbnRhaW4gYXQgbGVhc3Qgb25lIGNoYXJhY3RlcicpO1xuICB9XG5cbiAgc3RhdGUuYW5jaG9yID0gc3RhdGUuaW5wdXQuc2xpY2UoX3Bvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiByZWFkQWxpYXMoc3RhdGUpIHtcbiAgdmFyIF9wb3NpdGlvbiwgYWxpYXMsXG4gICAgICBjaDtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmIChjaCAhPT0gMHgyQS8qICogKi8pIHJldHVybiBmYWxzZTtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gIF9wb3NpdGlvbiA9IHN0YXRlLnBvc2l0aW9uO1xuXG4gIHdoaWxlIChjaCAhPT0gMCAmJiAhaXNfV1NfT1JfRU9MKGNoKSAmJiAhaXNfRkxPV19JTkRJQ0FUT1IoY2gpKSB7XG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICB9XG5cbiAgaWYgKHN0YXRlLnBvc2l0aW9uID09PSBfcG9zaXRpb24pIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAnbmFtZSBvZiBhbiBhbGlhcyBub2RlIG11c3QgY29udGFpbiBhdCBsZWFzdCBvbmUgY2hhcmFjdGVyJyk7XG4gIH1cblxuICBhbGlhcyA9IHN0YXRlLmlucHV0LnNsaWNlKF9wb3NpdGlvbiwgc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmICghX2hhc093blByb3BlcnR5JDEuY2FsbChzdGF0ZS5hbmNob3JNYXAsIGFsaWFzKSkge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICd1bmlkZW50aWZpZWQgYWxpYXMgXCInICsgYWxpYXMgKyAnXCInKTtcbiAgfVxuXG4gIHN0YXRlLnJlc3VsdCA9IHN0YXRlLmFuY2hvck1hcFthbGlhc107XG4gIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbXBvc2VOb2RlKHN0YXRlLCBwYXJlbnRJbmRlbnQsIG5vZGVDb250ZXh0LCBhbGxvd1RvU2VlaywgYWxsb3dDb21wYWN0KSB7XG4gIHZhciBhbGxvd0Jsb2NrU3R5bGVzLFxuICAgICAgYWxsb3dCbG9ja1NjYWxhcnMsXG4gICAgICBhbGxvd0Jsb2NrQ29sbGVjdGlvbnMsXG4gICAgICBpbmRlbnRTdGF0dXMgPSAxLCAvLyAxOiB0aGlzPnBhcmVudCwgMDogdGhpcz1wYXJlbnQsIC0xOiB0aGlzPHBhcmVudFxuICAgICAgYXROZXdMaW5lICA9IGZhbHNlLFxuICAgICAgaGFzQ29udGVudCA9IGZhbHNlLFxuICAgICAgdHlwZUluZGV4LFxuICAgICAgdHlwZVF1YW50aXR5LFxuICAgICAgdHlwZUxpc3QsXG4gICAgICB0eXBlLFxuICAgICAgZmxvd0luZGVudCxcbiAgICAgIGJsb2NrSW5kZW50O1xuXG4gIGlmIChzdGF0ZS5saXN0ZW5lciAhPT0gbnVsbCkge1xuICAgIHN0YXRlLmxpc3RlbmVyKCdvcGVuJywgc3RhdGUpO1xuICB9XG5cbiAgc3RhdGUudGFnICAgID0gbnVsbDtcbiAgc3RhdGUuYW5jaG9yID0gbnVsbDtcbiAgc3RhdGUua2luZCAgID0gbnVsbDtcbiAgc3RhdGUucmVzdWx0ID0gbnVsbDtcblxuICBhbGxvd0Jsb2NrU3R5bGVzID0gYWxsb3dCbG9ja1NjYWxhcnMgPSBhbGxvd0Jsb2NrQ29sbGVjdGlvbnMgPVxuICAgIENPTlRFWFRfQkxPQ0tfT1VUID09PSBub2RlQ29udGV4dCB8fFxuICAgIENPTlRFWFRfQkxPQ0tfSU4gID09PSBub2RlQ29udGV4dDtcblxuICBpZiAoYWxsb3dUb1NlZWspIHtcbiAgICBpZiAoc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpKSB7XG4gICAgICBhdE5ld0xpbmUgPSB0cnVlO1xuXG4gICAgICBpZiAoc3RhdGUubGluZUluZGVudCA+IHBhcmVudEluZGVudCkge1xuICAgICAgICBpbmRlbnRTdGF0dXMgPSAxO1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZS5saW5lSW5kZW50ID09PSBwYXJlbnRJbmRlbnQpIHtcbiAgICAgICAgaW5kZW50U3RhdHVzID0gMDtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUubGluZUluZGVudCA8IHBhcmVudEluZGVudCkge1xuICAgICAgICBpbmRlbnRTdGF0dXMgPSAtMTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoaW5kZW50U3RhdHVzID09PSAxKSB7XG4gICAgd2hpbGUgKHJlYWRUYWdQcm9wZXJ0eShzdGF0ZSkgfHwgcmVhZEFuY2hvclByb3BlcnR5KHN0YXRlKSkge1xuICAgICAgaWYgKHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKSkge1xuICAgICAgICBhdE5ld0xpbmUgPSB0cnVlO1xuICAgICAgICBhbGxvd0Jsb2NrQ29sbGVjdGlvbnMgPSBhbGxvd0Jsb2NrU3R5bGVzO1xuXG4gICAgICAgIGlmIChzdGF0ZS5saW5lSW5kZW50ID4gcGFyZW50SW5kZW50KSB7XG4gICAgICAgICAgaW5kZW50U3RhdHVzID0gMTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZS5saW5lSW5kZW50ID09PSBwYXJlbnRJbmRlbnQpIHtcbiAgICAgICAgICBpbmRlbnRTdGF0dXMgPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPCBwYXJlbnRJbmRlbnQpIHtcbiAgICAgICAgICBpbmRlbnRTdGF0dXMgPSAtMTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWxsb3dCbG9ja0NvbGxlY3Rpb25zID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKGFsbG93QmxvY2tDb2xsZWN0aW9ucykge1xuICAgIGFsbG93QmxvY2tDb2xsZWN0aW9ucyA9IGF0TmV3TGluZSB8fCBhbGxvd0NvbXBhY3Q7XG4gIH1cblxuICBpZiAoaW5kZW50U3RhdHVzID09PSAxIHx8IENPTlRFWFRfQkxPQ0tfT1VUID09PSBub2RlQ29udGV4dCkge1xuICAgIGlmIChDT05URVhUX0ZMT1dfSU4gPT09IG5vZGVDb250ZXh0IHx8IENPTlRFWFRfRkxPV19PVVQgPT09IG5vZGVDb250ZXh0KSB7XG4gICAgICBmbG93SW5kZW50ID0gcGFyZW50SW5kZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICBmbG93SW5kZW50ID0gcGFyZW50SW5kZW50ICsgMTtcbiAgICB9XG5cbiAgICBibG9ja0luZGVudCA9IHN0YXRlLnBvc2l0aW9uIC0gc3RhdGUubGluZVN0YXJ0O1xuXG4gICAgaWYgKGluZGVudFN0YXR1cyA9PT0gMSkge1xuICAgICAgaWYgKGFsbG93QmxvY2tDb2xsZWN0aW9ucyAmJlxuICAgICAgICAgIChyZWFkQmxvY2tTZXF1ZW5jZShzdGF0ZSwgYmxvY2tJbmRlbnQpIHx8XG4gICAgICAgICAgIHJlYWRCbG9ja01hcHBpbmcoc3RhdGUsIGJsb2NrSW5kZW50LCBmbG93SW5kZW50KSkgfHxcbiAgICAgICAgICByZWFkRmxvd0NvbGxlY3Rpb24oc3RhdGUsIGZsb3dJbmRlbnQpKSB7XG4gICAgICAgIGhhc0NvbnRlbnQgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKChhbGxvd0Jsb2NrU2NhbGFycyAmJiByZWFkQmxvY2tTY2FsYXIoc3RhdGUsIGZsb3dJbmRlbnQpKSB8fFxuICAgICAgICAgICAgcmVhZFNpbmdsZVF1b3RlZFNjYWxhcihzdGF0ZSwgZmxvd0luZGVudCkgfHxcbiAgICAgICAgICAgIHJlYWREb3VibGVRdW90ZWRTY2FsYXIoc3RhdGUsIGZsb3dJbmRlbnQpKSB7XG4gICAgICAgICAgaGFzQ29udGVudCA9IHRydWU7XG5cbiAgICAgICAgfSBlbHNlIGlmIChyZWFkQWxpYXMoc3RhdGUpKSB7XG4gICAgICAgICAgaGFzQ29udGVudCA9IHRydWU7XG5cbiAgICAgICAgICBpZiAoc3RhdGUudGFnICE9PSBudWxsIHx8IHN0YXRlLmFuY2hvciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2FsaWFzIG5vZGUgc2hvdWxkIG5vdCBoYXZlIGFueSBwcm9wZXJ0aWVzJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAocmVhZFBsYWluU2NhbGFyKHN0YXRlLCBmbG93SW5kZW50LCBDT05URVhUX0ZMT1dfSU4gPT09IG5vZGVDb250ZXh0KSkge1xuICAgICAgICAgIGhhc0NvbnRlbnQgPSB0cnVlO1xuXG4gICAgICAgICAgaWYgKHN0YXRlLnRhZyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgc3RhdGUudGFnID0gJz8nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0ZS5hbmNob3IgIT09IG51bGwpIHtcbiAgICAgICAgICBzdGF0ZS5hbmNob3JNYXBbc3RhdGUuYW5jaG9yXSA9IHN0YXRlLnJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaW5kZW50U3RhdHVzID09PSAwKSB7XG4gICAgICAvLyBTcGVjaWFsIGNhc2U6IGJsb2NrIHNlcXVlbmNlcyBhcmUgYWxsb3dlZCB0byBoYXZlIHNhbWUgaW5kZW50YXRpb24gbGV2ZWwgYXMgdGhlIHBhcmVudC5cbiAgICAgIC8vIGh0dHA6Ly93d3cueWFtbC5vcmcvc3BlYy8xLjIvc3BlYy5odG1sI2lkMjc5OTc4NFxuICAgICAgaGFzQ29udGVudCA9IGFsbG93QmxvY2tDb2xsZWN0aW9ucyAmJiByZWFkQmxvY2tTZXF1ZW5jZShzdGF0ZSwgYmxvY2tJbmRlbnQpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzdGF0ZS50YWcgPT09IG51bGwpIHtcbiAgICBpZiAoc3RhdGUuYW5jaG9yICE9PSBudWxsKSB7XG4gICAgICBzdGF0ZS5hbmNob3JNYXBbc3RhdGUuYW5jaG9yXSA9IHN0YXRlLnJlc3VsdDtcbiAgICB9XG5cbiAgfSBlbHNlIGlmIChzdGF0ZS50YWcgPT09ICc/Jykge1xuICAgIC8vIEltcGxpY2l0IHJlc29sdmluZyBpcyBub3QgYWxsb3dlZCBmb3Igbm9uLXNjYWxhciB0eXBlcywgYW5kICc/J1xuICAgIC8vIG5vbi1zcGVjaWZpYyB0YWcgaXMgb25seSBhdXRvbWF0aWNhbGx5IGFzc2lnbmVkIHRvIHBsYWluIHNjYWxhcnMuXG4gICAgLy9cbiAgICAvLyBXZSBvbmx5IG5lZWQgdG8gY2hlY2sga2luZCBjb25mb3JtaXR5IGluIGNhc2UgdXNlciBleHBsaWNpdGx5IGFzc2lnbnMgJz8nXG4gICAgLy8gdGFnLCBmb3IgZXhhbXBsZSBsaWtlIHRoaXM6IFwiITw/PiBbMF1cIlxuICAgIC8vXG4gICAgaWYgKHN0YXRlLnJlc3VsdCAhPT0gbnVsbCAmJiBzdGF0ZS5raW5kICE9PSAnc2NhbGFyJykge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuYWNjZXB0YWJsZSBub2RlIGtpbmQgZm9yICE8Pz4gdGFnOyBpdCBzaG91bGQgYmUgXCJzY2FsYXJcIiwgbm90IFwiJyArIHN0YXRlLmtpbmQgKyAnXCInKTtcbiAgICB9XG5cbiAgICBmb3IgKHR5cGVJbmRleCA9IDAsIHR5cGVRdWFudGl0eSA9IHN0YXRlLmltcGxpY2l0VHlwZXMubGVuZ3RoOyB0eXBlSW5kZXggPCB0eXBlUXVhbnRpdHk7IHR5cGVJbmRleCArPSAxKSB7XG4gICAgICB0eXBlID0gc3RhdGUuaW1wbGljaXRUeXBlc1t0eXBlSW5kZXhdO1xuXG4gICAgICBpZiAodHlwZS5yZXNvbHZlKHN0YXRlLnJlc3VsdCkpIHsgLy8gYHN0YXRlLnJlc3VsdGAgdXBkYXRlZCBpbiByZXNvbHZlciBpZiBtYXRjaGVkXG4gICAgICAgIHN0YXRlLnJlc3VsdCA9IHR5cGUuY29uc3RydWN0KHN0YXRlLnJlc3VsdCk7XG4gICAgICAgIHN0YXRlLnRhZyA9IHR5cGUudGFnO1xuICAgICAgICBpZiAoc3RhdGUuYW5jaG9yICE9PSBudWxsKSB7XG4gICAgICAgICAgc3RhdGUuYW5jaG9yTWFwW3N0YXRlLmFuY2hvcl0gPSBzdGF0ZS5yZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKHN0YXRlLnRhZyAhPT0gJyEnKSB7XG4gICAgaWYgKF9oYXNPd25Qcm9wZXJ0eSQxLmNhbGwoc3RhdGUudHlwZU1hcFtzdGF0ZS5raW5kIHx8ICdmYWxsYmFjayddLCBzdGF0ZS50YWcpKSB7XG4gICAgICB0eXBlID0gc3RhdGUudHlwZU1hcFtzdGF0ZS5raW5kIHx8ICdmYWxsYmFjayddW3N0YXRlLnRhZ107XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGxvb2tpbmcgZm9yIG11bHRpIHR5cGVcbiAgICAgIHR5cGUgPSBudWxsO1xuICAgICAgdHlwZUxpc3QgPSBzdGF0ZS50eXBlTWFwLm11bHRpW3N0YXRlLmtpbmQgfHwgJ2ZhbGxiYWNrJ107XG5cbiAgICAgIGZvciAodHlwZUluZGV4ID0gMCwgdHlwZVF1YW50aXR5ID0gdHlwZUxpc3QubGVuZ3RoOyB0eXBlSW5kZXggPCB0eXBlUXVhbnRpdHk7IHR5cGVJbmRleCArPSAxKSB7XG4gICAgICAgIGlmIChzdGF0ZS50YWcuc2xpY2UoMCwgdHlwZUxpc3RbdHlwZUluZGV4XS50YWcubGVuZ3RoKSA9PT0gdHlwZUxpc3RbdHlwZUluZGV4XS50YWcpIHtcbiAgICAgICAgICB0eXBlID0gdHlwZUxpc3RbdHlwZUluZGV4XTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghdHlwZSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3Vua25vd24gdGFnICE8JyArIHN0YXRlLnRhZyArICc+Jyk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXRlLnJlc3VsdCAhPT0gbnVsbCAmJiB0eXBlLmtpbmQgIT09IHN0YXRlLmtpbmQpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd1bmFjY2VwdGFibGUgbm9kZSBraW5kIGZvciAhPCcgKyBzdGF0ZS50YWcgKyAnPiB0YWc7IGl0IHNob3VsZCBiZSBcIicgKyB0eXBlLmtpbmQgKyAnXCIsIG5vdCBcIicgKyBzdGF0ZS5raW5kICsgJ1wiJyk7XG4gICAgfVxuXG4gICAgaWYgKCF0eXBlLnJlc29sdmUoc3RhdGUucmVzdWx0LCBzdGF0ZS50YWcpKSB7IC8vIGBzdGF0ZS5yZXN1bHRgIHVwZGF0ZWQgaW4gcmVzb2x2ZXIgaWYgbWF0Y2hlZFxuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2Nhbm5vdCByZXNvbHZlIGEgbm9kZSB3aXRoICE8JyArIHN0YXRlLnRhZyArICc+IGV4cGxpY2l0IHRhZycpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0ZS5yZXN1bHQgPSB0eXBlLmNvbnN0cnVjdChzdGF0ZS5yZXN1bHQsIHN0YXRlLnRhZyk7XG4gICAgICBpZiAoc3RhdGUuYW5jaG9yICE9PSBudWxsKSB7XG4gICAgICAgIHN0YXRlLmFuY2hvck1hcFtzdGF0ZS5hbmNob3JdID0gc3RhdGUucmVzdWx0O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChzdGF0ZS5saXN0ZW5lciAhPT0gbnVsbCkge1xuICAgIHN0YXRlLmxpc3RlbmVyKCdjbG9zZScsIHN0YXRlKTtcbiAgfVxuICByZXR1cm4gc3RhdGUudGFnICE9PSBudWxsIHx8ICBzdGF0ZS5hbmNob3IgIT09IG51bGwgfHwgaGFzQ29udGVudDtcbn1cblxuZnVuY3Rpb24gcmVhZERvY3VtZW50KHN0YXRlKSB7XG4gIHZhciBkb2N1bWVudFN0YXJ0ID0gc3RhdGUucG9zaXRpb24sXG4gICAgICBfcG9zaXRpb24sXG4gICAgICBkaXJlY3RpdmVOYW1lLFxuICAgICAgZGlyZWN0aXZlQXJncyxcbiAgICAgIGhhc0RpcmVjdGl2ZXMgPSBmYWxzZSxcbiAgICAgIGNoO1xuXG4gIHN0YXRlLnZlcnNpb24gPSBudWxsO1xuICBzdGF0ZS5jaGVja0xpbmVCcmVha3MgPSBzdGF0ZS5sZWdhY3k7XG4gIHN0YXRlLnRhZ01hcCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHN0YXRlLmFuY2hvck1hcCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgd2hpbGUgKChjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pKSAhPT0gMCkge1xuICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoc3RhdGUubGluZUluZGVudCA+IDAgfHwgY2ggIT09IDB4MjUvKiAlICovKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBoYXNEaXJlY3RpdmVzID0gdHJ1ZTtcbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgICB3aGlsZSAoY2ggIT09IDAgJiYgIWlzX1dTX09SX0VPTChjaCkpIHtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9XG5cbiAgICBkaXJlY3RpdmVOYW1lID0gc3RhdGUuaW5wdXQuc2xpY2UoX3Bvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG4gICAgZGlyZWN0aXZlQXJncyA9IFtdO1xuXG4gICAgaWYgKGRpcmVjdGl2ZU5hbWUubGVuZ3RoIDwgMSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2RpcmVjdGl2ZSBuYW1lIG11c3Qgbm90IGJlIGxlc3MgdGhhbiBvbmUgY2hhcmFjdGVyIGluIGxlbmd0aCcpO1xuICAgIH1cblxuICAgIHdoaWxlIChjaCAhPT0gMCkge1xuICAgICAgd2hpbGUgKGlzX1dISVRFX1NQQUNFKGNoKSkge1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaCA9PT0gMHgyMy8qICMgKi8pIHtcbiAgICAgICAgZG8geyBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7IH1cbiAgICAgICAgd2hpbGUgKGNoICE9PSAwICYmICFpc19FT0woY2gpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc19FT0woY2gpKSBicmVhaztcblxuICAgICAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgICAgIHdoaWxlIChjaCAhPT0gMCAmJiAhaXNfV1NfT1JfRU9MKGNoKSkge1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICB9XG5cbiAgICAgIGRpcmVjdGl2ZUFyZ3MucHVzaChzdGF0ZS5pbnB1dC5zbGljZShfcG9zaXRpb24sIHN0YXRlLnBvc2l0aW9uKSk7XG4gICAgfVxuXG4gICAgaWYgKGNoICE9PSAwKSByZWFkTGluZUJyZWFrKHN0YXRlKTtcblxuICAgIGlmIChfaGFzT3duUHJvcGVydHkkMS5jYWxsKGRpcmVjdGl2ZUhhbmRsZXJzLCBkaXJlY3RpdmVOYW1lKSkge1xuICAgICAgZGlyZWN0aXZlSGFuZGxlcnNbZGlyZWN0aXZlTmFtZV0oc3RhdGUsIGRpcmVjdGl2ZU5hbWUsIGRpcmVjdGl2ZUFyZ3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvd1dhcm5pbmcoc3RhdGUsICd1bmtub3duIGRvY3VtZW50IGRpcmVjdGl2ZSBcIicgKyBkaXJlY3RpdmVOYW1lICsgJ1wiJyk7XG4gICAgfVxuICB9XG5cbiAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpO1xuXG4gIGlmIChzdGF0ZS5saW5lSW5kZW50ID09PSAwICYmXG4gICAgICBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKSAgICAgPT09IDB4MkQvKiAtICovICYmXG4gICAgICBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uICsgMSkgPT09IDB4MkQvKiAtICovICYmXG4gICAgICBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uICsgMikgPT09IDB4MkQvKiAtICovKSB7XG4gICAgc3RhdGUucG9zaXRpb24gKz0gMztcbiAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCAtMSk7XG5cbiAgfSBlbHNlIGlmIChoYXNEaXJlY3RpdmVzKSB7XG4gICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2RpcmVjdGl2ZXMgZW5kIG1hcmsgaXMgZXhwZWN0ZWQnKTtcbiAgfVxuXG4gIGNvbXBvc2VOb2RlKHN0YXRlLCBzdGF0ZS5saW5lSW5kZW50IC0gMSwgQ09OVEVYVF9CTE9DS19PVVQsIGZhbHNlLCB0cnVlKTtcbiAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpO1xuXG4gIGlmIChzdGF0ZS5jaGVja0xpbmVCcmVha3MgJiZcbiAgICAgIFBBVFRFUk5fTk9OX0FTQ0lJX0xJTkVfQlJFQUtTLnRlc3Qoc3RhdGUuaW5wdXQuc2xpY2UoZG9jdW1lbnRTdGFydCwgc3RhdGUucG9zaXRpb24pKSkge1xuICAgIHRocm93V2FybmluZyhzdGF0ZSwgJ25vbi1BU0NJSSBsaW5lIGJyZWFrcyBhcmUgaW50ZXJwcmV0ZWQgYXMgY29udGVudCcpO1xuICB9XG5cbiAgc3RhdGUuZG9jdW1lbnRzLnB1c2goc3RhdGUucmVzdWx0KTtcblxuICBpZiAoc3RhdGUucG9zaXRpb24gPT09IHN0YXRlLmxpbmVTdGFydCAmJiB0ZXN0RG9jdW1lbnRTZXBhcmF0b3Ioc3RhdGUpKSB7XG5cbiAgICBpZiAoc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbikgPT09IDB4MkUvKiAuICovKSB7XG4gICAgICBzdGF0ZS5wb3NpdGlvbiArPSAzO1xuICAgICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoc3RhdGUucG9zaXRpb24gPCAoc3RhdGUubGVuZ3RoIC0gMSkpIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAnZW5kIG9mIHRoZSBzdHJlYW0gb3IgYSBkb2N1bWVudCBzZXBhcmF0b3IgaXMgZXhwZWN0ZWQnKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm47XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBsb2FkRG9jdW1lbnRzKGlucHV0LCBvcHRpb25zKSB7XG4gIGlucHV0ID0gU3RyaW5nKGlucHV0KTtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgaWYgKGlucHV0Lmxlbmd0aCAhPT0gMCkge1xuXG4gICAgLy8gQWRkIHRhaWxpbmcgYFxcbmAgaWYgbm90IGV4aXN0c1xuICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KGlucHV0Lmxlbmd0aCAtIDEpICE9PSAweDBBLyogTEYgKi8gJiZcbiAgICAgICAgaW5wdXQuY2hhckNvZGVBdChpbnB1dC5sZW5ndGggLSAxKSAhPT0gMHgwRC8qIENSICovKSB7XG4gICAgICBpbnB1dCArPSAnXFxuJztcbiAgICB9XG5cbiAgICAvLyBTdHJpcCBCT01cbiAgICBpZiAoaW5wdXQuY2hhckNvZGVBdCgwKSA9PT0gMHhGRUZGKSB7XG4gICAgICBpbnB1dCA9IGlucHV0LnNsaWNlKDEpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBzdGF0ZSA9IG5ldyBTdGF0ZSQxKGlucHV0LCBvcHRpb25zKTtcblxuICB2YXIgbnVsbHBvcyA9IGlucHV0LmluZGV4T2YoJ1xcMCcpO1xuXG4gIGlmIChudWxscG9zICE9PSAtMSkge1xuICAgIHN0YXRlLnBvc2l0aW9uID0gbnVsbHBvcztcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAnbnVsbCBieXRlIGlzIG5vdCBhbGxvd2VkIGluIGlucHV0Jyk7XG4gIH1cblxuICAvLyBVc2UgMCBhcyBzdHJpbmcgdGVybWluYXRvci4gVGhhdCBzaWduaWZpY2FudGx5IHNpbXBsaWZpZXMgYm91bmRzIGNoZWNrLlxuICBzdGF0ZS5pbnB1dCArPSAnXFwwJztcblxuICB3aGlsZSAoc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbikgPT09IDB4MjAvKiBTcGFjZSAqLykge1xuICAgIHN0YXRlLmxpbmVJbmRlbnQgKz0gMTtcbiAgICBzdGF0ZS5wb3NpdGlvbiArPSAxO1xuICB9XG5cbiAgd2hpbGUgKHN0YXRlLnBvc2l0aW9uIDwgKHN0YXRlLmxlbmd0aCAtIDEpKSB7XG4gICAgcmVhZERvY3VtZW50KHN0YXRlKTtcbiAgfVxuXG4gIHJldHVybiBzdGF0ZS5kb2N1bWVudHM7XG59XG5cblxuZnVuY3Rpb24gbG9hZEFsbCQxKGlucHV0LCBpdGVyYXRvciwgb3B0aW9ucykge1xuICBpZiAoaXRlcmF0b3IgIT09IG51bGwgJiYgdHlwZW9mIGl0ZXJhdG9yID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBvcHRpb25zID0gaXRlcmF0b3I7XG4gICAgaXRlcmF0b3IgPSBudWxsO1xuICB9XG5cbiAgdmFyIGRvY3VtZW50cyA9IGxvYWREb2N1bWVudHMoaW5wdXQsIG9wdGlvbnMpO1xuXG4gIGlmICh0eXBlb2YgaXRlcmF0b3IgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZG9jdW1lbnRzO1xuICB9XG5cbiAgZm9yICh2YXIgaW5kZXggPSAwLCBsZW5ndGggPSBkb2N1bWVudHMubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIGl0ZXJhdG9yKGRvY3VtZW50c1tpbmRleF0pO1xuICB9XG59XG5cblxuZnVuY3Rpb24gbG9hZCQxKGlucHV0LCBvcHRpb25zKSB7XG4gIHZhciBkb2N1bWVudHMgPSBsb2FkRG9jdW1lbnRzKGlucHV0LCBvcHRpb25zKTtcblxuICBpZiAoZG9jdW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIC8qZXNsaW50LWRpc2FibGUgbm8tdW5kZWZpbmVkKi9cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9IGVsc2UgaWYgKGRvY3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gZG9jdW1lbnRzWzBdO1xuICB9XG4gIHRocm93IG5ldyBleGNlcHRpb24oJ2V4cGVjdGVkIGEgc2luZ2xlIGRvY3VtZW50IGluIHRoZSBzdHJlYW0sIGJ1dCBmb3VuZCBtb3JlJyk7XG59XG5cblxudmFyIGxvYWRBbGxfMSA9IGxvYWRBbGwkMTtcbnZhciBsb2FkXzEgICAgPSBsb2FkJDE7XG5cbnZhciBsb2FkZXIgPSB7XG5cdGxvYWRBbGw6IGxvYWRBbGxfMSxcblx0bG9hZDogbG9hZF8xXG59O1xuXG4vKmVzbGludC1kaXNhYmxlIG5vLXVzZS1iZWZvcmUtZGVmaW5lKi9cblxuXG5cblxuXG52YXIgX3RvU3RyaW5nICAgICAgID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciBfaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG52YXIgQ0hBUl9CT00gICAgICAgICAgICAgICAgICA9IDB4RkVGRjtcbnZhciBDSEFSX1RBQiAgICAgICAgICAgICAgICAgID0gMHgwOTsgLyogVGFiICovXG52YXIgQ0hBUl9MSU5FX0ZFRUQgICAgICAgICAgICA9IDB4MEE7IC8qIExGICovXG52YXIgQ0hBUl9DQVJSSUFHRV9SRVRVUk4gICAgICA9IDB4MEQ7IC8qIENSICovXG52YXIgQ0hBUl9TUEFDRSAgICAgICAgICAgICAgICA9IDB4MjA7IC8qIFNwYWNlICovXG52YXIgQ0hBUl9FWENMQU1BVElPTiAgICAgICAgICA9IDB4MjE7IC8qICEgKi9cbnZhciBDSEFSX0RPVUJMRV9RVU9URSAgICAgICAgID0gMHgyMjsgLyogXCIgKi9cbnZhciBDSEFSX1NIQVJQICAgICAgICAgICAgICAgID0gMHgyMzsgLyogIyAqL1xudmFyIENIQVJfUEVSQ0VOVCAgICAgICAgICAgICAgPSAweDI1OyAvKiAlICovXG52YXIgQ0hBUl9BTVBFUlNBTkQgICAgICAgICAgICA9IDB4MjY7IC8qICYgKi9cbnZhciBDSEFSX1NJTkdMRV9RVU9URSAgICAgICAgID0gMHgyNzsgLyogJyAqL1xudmFyIENIQVJfQVNURVJJU0sgICAgICAgICAgICAgPSAweDJBOyAvKiAqICovXG52YXIgQ0hBUl9DT01NQSAgICAgICAgICAgICAgICA9IDB4MkM7IC8qICwgKi9cbnZhciBDSEFSX01JTlVTICAgICAgICAgICAgICAgID0gMHgyRDsgLyogLSAqL1xudmFyIENIQVJfQ09MT04gICAgICAgICAgICAgICAgPSAweDNBOyAvKiA6ICovXG52YXIgQ0hBUl9FUVVBTFMgICAgICAgICAgICAgICA9IDB4M0Q7IC8qID0gKi9cbnZhciBDSEFSX0dSRUFURVJfVEhBTiAgICAgICAgID0gMHgzRTsgLyogPiAqL1xudmFyIENIQVJfUVVFU1RJT04gICAgICAgICAgICAgPSAweDNGOyAvKiA/ICovXG52YXIgQ0hBUl9DT01NRVJDSUFMX0FUICAgICAgICA9IDB4NDA7IC8qIEAgKi9cbnZhciBDSEFSX0xFRlRfU1FVQVJFX0JSQUNLRVQgID0gMHg1QjsgLyogWyAqL1xudmFyIENIQVJfUklHSFRfU1FVQVJFX0JSQUNLRVQgPSAweDVEOyAvKiBdICovXG52YXIgQ0hBUl9HUkFWRV9BQ0NFTlQgICAgICAgICA9IDB4NjA7IC8qIGAgKi9cbnZhciBDSEFSX0xFRlRfQ1VSTFlfQlJBQ0tFVCAgID0gMHg3QjsgLyogeyAqL1xudmFyIENIQVJfVkVSVElDQUxfTElORSAgICAgICAgPSAweDdDOyAvKiB8ICovXG52YXIgQ0hBUl9SSUdIVF9DVVJMWV9CUkFDS0VUICA9IDB4N0Q7IC8qIH0gKi9cblxudmFyIEVTQ0FQRV9TRVFVRU5DRVMgPSB7fTtcblxuRVNDQVBFX1NFUVVFTkNFU1sweDAwXSAgID0gJ1xcXFwwJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgwN10gICA9ICdcXFxcYSc7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MDhdICAgPSAnXFxcXGInO1xuRVNDQVBFX1NFUVVFTkNFU1sweDA5XSAgID0gJ1xcXFx0JztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgwQV0gICA9ICdcXFxcbic7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MEJdICAgPSAnXFxcXHYnO1xuRVNDQVBFX1NFUVVFTkNFU1sweDBDXSAgID0gJ1xcXFxmJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgwRF0gICA9ICdcXFxccic7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MUJdICAgPSAnXFxcXGUnO1xuRVNDQVBFX1NFUVVFTkNFU1sweDIyXSAgID0gJ1xcXFxcIic7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4NUNdICAgPSAnXFxcXFxcXFwnO1xuRVNDQVBFX1NFUVVFTkNFU1sweDg1XSAgID0gJ1xcXFxOJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHhBMF0gICA9ICdcXFxcXyc7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MjAyOF0gPSAnXFxcXEwnO1xuRVNDQVBFX1NFUVVFTkNFU1sweDIwMjldID0gJ1xcXFxQJztcblxudmFyIERFUFJFQ0FURURfQk9PTEVBTlNfU1lOVEFYID0gW1xuICAneScsICdZJywgJ3llcycsICdZZXMnLCAnWUVTJywgJ29uJywgJ09uJywgJ09OJyxcbiAgJ24nLCAnTicsICdubycsICdObycsICdOTycsICdvZmYnLCAnT2ZmJywgJ09GRidcbl07XG5cbnZhciBERVBSRUNBVEVEX0JBU0U2MF9TWU5UQVggPSAvXlstK10/WzAtOV9dKyg/OjpbMC05X10rKSsoPzpcXC5bMC05X10qKT8kLztcblxuZnVuY3Rpb24gY29tcGlsZVN0eWxlTWFwKHNjaGVtYSwgbWFwKSB7XG4gIHZhciByZXN1bHQsIGtleXMsIGluZGV4LCBsZW5ndGgsIHRhZywgc3R5bGUsIHR5cGU7XG5cbiAgaWYgKG1hcCA9PT0gbnVsbCkgcmV0dXJuIHt9O1xuXG4gIHJlc3VsdCA9IHt9O1xuICBrZXlzID0gT2JqZWN0LmtleXMobWFwKTtcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgdGFnID0ga2V5c1tpbmRleF07XG4gICAgc3R5bGUgPSBTdHJpbmcobWFwW3RhZ10pO1xuXG4gICAgaWYgKHRhZy5zbGljZSgwLCAyKSA9PT0gJyEhJykge1xuICAgICAgdGFnID0gJ3RhZzp5YW1sLm9yZywyMDAyOicgKyB0YWcuc2xpY2UoMik7XG4gICAgfVxuICAgIHR5cGUgPSBzY2hlbWEuY29tcGlsZWRUeXBlTWFwWydmYWxsYmFjayddW3RhZ107XG5cbiAgICBpZiAodHlwZSAmJiBfaGFzT3duUHJvcGVydHkuY2FsbCh0eXBlLnN0eWxlQWxpYXNlcywgc3R5bGUpKSB7XG4gICAgICBzdHlsZSA9IHR5cGUuc3R5bGVBbGlhc2VzW3N0eWxlXTtcbiAgICB9XG5cbiAgICByZXN1bHRbdGFnXSA9IHN0eWxlO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZW5jb2RlSGV4KGNoYXJhY3Rlcikge1xuICB2YXIgc3RyaW5nLCBoYW5kbGUsIGxlbmd0aDtcblxuICBzdHJpbmcgPSBjaGFyYWN0ZXIudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7XG5cbiAgaWYgKGNoYXJhY3RlciA8PSAweEZGKSB7XG4gICAgaGFuZGxlID0gJ3gnO1xuICAgIGxlbmd0aCA9IDI7XG4gIH0gZWxzZSBpZiAoY2hhcmFjdGVyIDw9IDB4RkZGRikge1xuICAgIGhhbmRsZSA9ICd1JztcbiAgICBsZW5ndGggPSA0O1xuICB9IGVsc2UgaWYgKGNoYXJhY3RlciA8PSAweEZGRkZGRkZGKSB7XG4gICAgaGFuZGxlID0gJ1UnO1xuICAgIGxlbmd0aCA9IDg7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IGV4Y2VwdGlvbignY29kZSBwb2ludCB3aXRoaW4gYSBzdHJpbmcgbWF5IG5vdCBiZSBncmVhdGVyIHRoYW4gMHhGRkZGRkZGRicpO1xuICB9XG5cbiAgcmV0dXJuICdcXFxcJyArIGhhbmRsZSArIGNvbW1vbi5yZXBlYXQoJzAnLCBsZW5ndGggLSBzdHJpbmcubGVuZ3RoKSArIHN0cmluZztcbn1cblxuXG52YXIgUVVPVElOR19UWVBFX1NJTkdMRSA9IDEsXG4gICAgUVVPVElOR19UWVBFX0RPVUJMRSA9IDI7XG5cbmZ1bmN0aW9uIFN0YXRlKG9wdGlvbnMpIHtcbiAgdGhpcy5zY2hlbWEgICAgICAgID0gb3B0aW9uc1snc2NoZW1hJ10gfHwgX2RlZmF1bHQ7XG4gIHRoaXMuaW5kZW50ICAgICAgICA9IE1hdGgubWF4KDEsIChvcHRpb25zWydpbmRlbnQnXSB8fCAyKSk7XG4gIHRoaXMubm9BcnJheUluZGVudCA9IG9wdGlvbnNbJ25vQXJyYXlJbmRlbnQnXSB8fCBmYWxzZTtcbiAgdGhpcy5za2lwSW52YWxpZCAgID0gb3B0aW9uc1snc2tpcEludmFsaWQnXSB8fCBmYWxzZTtcbiAgdGhpcy5mbG93TGV2ZWwgICAgID0gKGNvbW1vbi5pc05vdGhpbmcob3B0aW9uc1snZmxvd0xldmVsJ10pID8gLTEgOiBvcHRpb25zWydmbG93TGV2ZWwnXSk7XG4gIHRoaXMuc3R5bGVNYXAgICAgICA9IGNvbXBpbGVTdHlsZU1hcCh0aGlzLnNjaGVtYSwgb3B0aW9uc1snc3R5bGVzJ10gfHwgbnVsbCk7XG4gIHRoaXMuc29ydEtleXMgICAgICA9IG9wdGlvbnNbJ3NvcnRLZXlzJ10gfHwgZmFsc2U7XG4gIHRoaXMubGluZVdpZHRoICAgICA9IG9wdGlvbnNbJ2xpbmVXaWR0aCddIHx8IDgwO1xuICB0aGlzLm5vUmVmcyAgICAgICAgPSBvcHRpb25zWydub1JlZnMnXSB8fCBmYWxzZTtcbiAgdGhpcy5ub0NvbXBhdE1vZGUgID0gb3B0aW9uc1snbm9Db21wYXRNb2RlJ10gfHwgZmFsc2U7XG4gIHRoaXMuY29uZGVuc2VGbG93ICA9IG9wdGlvbnNbJ2NvbmRlbnNlRmxvdyddIHx8IGZhbHNlO1xuICB0aGlzLnF1b3RpbmdUeXBlICAgPSBvcHRpb25zWydxdW90aW5nVHlwZSddID09PSAnXCInID8gUVVPVElOR19UWVBFX0RPVUJMRSA6IFFVT1RJTkdfVFlQRV9TSU5HTEU7XG4gIHRoaXMuZm9yY2VRdW90ZXMgICA9IG9wdGlvbnNbJ2ZvcmNlUXVvdGVzJ10gfHwgZmFsc2U7XG4gIHRoaXMucmVwbGFjZXIgICAgICA9IHR5cGVvZiBvcHRpb25zWydyZXBsYWNlciddID09PSAnZnVuY3Rpb24nID8gb3B0aW9uc1sncmVwbGFjZXInXSA6IG51bGw7XG5cbiAgdGhpcy5pbXBsaWNpdFR5cGVzID0gdGhpcy5zY2hlbWEuY29tcGlsZWRJbXBsaWNpdDtcbiAgdGhpcy5leHBsaWNpdFR5cGVzID0gdGhpcy5zY2hlbWEuY29tcGlsZWRFeHBsaWNpdDtcblxuICB0aGlzLnRhZyA9IG51bGw7XG4gIHRoaXMucmVzdWx0ID0gJyc7XG5cbiAgdGhpcy5kdXBsaWNhdGVzID0gW107XG4gIHRoaXMudXNlZER1cGxpY2F0ZXMgPSBudWxsO1xufVxuXG4vLyBJbmRlbnRzIGV2ZXJ5IGxpbmUgaW4gYSBzdHJpbmcuIEVtcHR5IGxpbmVzIChcXG4gb25seSkgYXJlIG5vdCBpbmRlbnRlZC5cbmZ1bmN0aW9uIGluZGVudFN0cmluZyhzdHJpbmcsIHNwYWNlcykge1xuICB2YXIgaW5kID0gY29tbW9uLnJlcGVhdCgnICcsIHNwYWNlcyksXG4gICAgICBwb3NpdGlvbiA9IDAsXG4gICAgICBuZXh0ID0gLTEsXG4gICAgICByZXN1bHQgPSAnJyxcbiAgICAgIGxpbmUsXG4gICAgICBsZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xuXG4gIHdoaWxlIChwb3NpdGlvbiA8IGxlbmd0aCkge1xuICAgIG5leHQgPSBzdHJpbmcuaW5kZXhPZignXFxuJywgcG9zaXRpb24pO1xuICAgIGlmIChuZXh0ID09PSAtMSkge1xuICAgICAgbGluZSA9IHN0cmluZy5zbGljZShwb3NpdGlvbik7XG4gICAgICBwb3NpdGlvbiA9IGxlbmd0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGluZSA9IHN0cmluZy5zbGljZShwb3NpdGlvbiwgbmV4dCArIDEpO1xuICAgICAgcG9zaXRpb24gPSBuZXh0ICsgMTtcbiAgICB9XG5cbiAgICBpZiAobGluZS5sZW5ndGggJiYgbGluZSAhPT0gJ1xcbicpIHJlc3VsdCArPSBpbmQ7XG5cbiAgICByZXN1bHQgKz0gbGluZTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlTmV4dExpbmUoc3RhdGUsIGxldmVsKSB7XG4gIHJldHVybiAnXFxuJyArIGNvbW1vbi5yZXBlYXQoJyAnLCBzdGF0ZS5pbmRlbnQgKiBsZXZlbCk7XG59XG5cbmZ1bmN0aW9uIHRlc3RJbXBsaWNpdFJlc29sdmluZyhzdGF0ZSwgc3RyKSB7XG4gIHZhciBpbmRleCwgbGVuZ3RoLCB0eXBlO1xuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBzdGF0ZS5pbXBsaWNpdFR5cGVzLmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICB0eXBlID0gc3RhdGUuaW1wbGljaXRUeXBlc1tpbmRleF07XG5cbiAgICBpZiAodHlwZS5yZXNvbHZlKHN0cikpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLy8gWzMzXSBzLXdoaXRlIDo6PSBzLXNwYWNlIHwgcy10YWJcbmZ1bmN0aW9uIGlzV2hpdGVzcGFjZShjKSB7XG4gIHJldHVybiBjID09PSBDSEFSX1NQQUNFIHx8IGMgPT09IENIQVJfVEFCO1xufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhlIGNoYXJhY3RlciBjYW4gYmUgcHJpbnRlZCB3aXRob3V0IGVzY2FwaW5nLlxuLy8gRnJvbSBZQU1MIDEuMjogXCJhbnkgYWxsb3dlZCBjaGFyYWN0ZXJzIGtub3duIHRvIGJlIG5vbi1wcmludGFibGVcbi8vIHNob3VsZCBhbHNvIGJlIGVzY2FwZWQuIFtIb3dldmVyLF0gVGhpcyBpc25cdTIwMTl0IG1hbmRhdG9yeVwiXG4vLyBEZXJpdmVkIGZyb20gbmItY2hhciAtIFxcdCAtICN4ODUgLSAjeEEwIC0gI3gyMDI4IC0gI3gyMDI5LlxuZnVuY3Rpb24gaXNQcmludGFibGUoYykge1xuICByZXR1cm4gICgweDAwMDIwIDw9IGMgJiYgYyA8PSAweDAwMDA3RSlcbiAgICAgIHx8ICgoMHgwMDBBMSA8PSBjICYmIGMgPD0gMHgwMEQ3RkYpICYmIGMgIT09IDB4MjAyOCAmJiBjICE9PSAweDIwMjkpXG4gICAgICB8fCAoKDB4MEUwMDAgPD0gYyAmJiBjIDw9IDB4MDBGRkZEKSAmJiBjICE9PSBDSEFSX0JPTSlcbiAgICAgIHx8ICAoMHgxMDAwMCA8PSBjICYmIGMgPD0gMHgxMEZGRkYpO1xufVxuXG4vLyBbMzRdIG5zLWNoYXIgOjo9IG5iLWNoYXIgLSBzLXdoaXRlXG4vLyBbMjddIG5iLWNoYXIgOjo9IGMtcHJpbnRhYmxlIC0gYi1jaGFyIC0gYy1ieXRlLW9yZGVyLW1hcmtcbi8vIFsyNl0gYi1jaGFyICA6Oj0gYi1saW5lLWZlZWQgfCBiLWNhcnJpYWdlLXJldHVyblxuLy8gSW5jbHVkaW5nIHMtd2hpdGUgKGZvciBzb21lIHJlYXNvbiwgZXhhbXBsZXMgZG9lc24ndCBtYXRjaCBzcGVjcyBpbiB0aGlzIGFzcGVjdClcbi8vIG5zLWNoYXIgOjo9IGMtcHJpbnRhYmxlIC0gYi1saW5lLWZlZWQgLSBiLWNhcnJpYWdlLXJldHVybiAtIGMtYnl0ZS1vcmRlci1tYXJrXG5mdW5jdGlvbiBpc05zQ2hhck9yV2hpdGVzcGFjZShjKSB7XG4gIHJldHVybiBpc1ByaW50YWJsZShjKVxuICAgICYmIGMgIT09IENIQVJfQk9NXG4gICAgLy8gLSBiLWNoYXJcbiAgICAmJiBjICE9PSBDSEFSX0NBUlJJQUdFX1JFVFVSTlxuICAgICYmIGMgIT09IENIQVJfTElORV9GRUVEO1xufVxuXG4vLyBbMTI3XSAgbnMtcGxhaW4tc2FmZShjKSA6Oj0gYyA9IGZsb3ctb3V0ICBcdTIxRDIgbnMtcGxhaW4tc2FmZS1vdXRcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjID0gZmxvdy1pbiAgIFx1MjFEMiBucy1wbGFpbi1zYWZlLWluXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYyA9IGJsb2NrLWtleSBcdTIxRDIgbnMtcGxhaW4tc2FmZS1vdXRcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjID0gZmxvdy1rZXkgIFx1MjFEMiBucy1wbGFpbi1zYWZlLWluXG4vLyBbMTI4XSBucy1wbGFpbi1zYWZlLW91dCA6Oj0gbnMtY2hhclxuLy8gWzEyOV0gIG5zLXBsYWluLXNhZmUtaW4gOjo9IG5zLWNoYXIgLSBjLWZsb3ctaW5kaWNhdG9yXG4vLyBbMTMwXSAgbnMtcGxhaW4tY2hhcihjKSA6Oj0gICggbnMtcGxhaW4tc2FmZShjKSAtIFx1MjAxQzpcdTIwMUQgLSBcdTIwMUMjXHUyMDFEIClcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwgKCAvKiBBbiBucy1jaGFyIHByZWNlZGluZyAqLyBcdTIwMUMjXHUyMDFEIClcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwgKCBcdTIwMUM6XHUyMDFEIC8qIEZvbGxvd2VkIGJ5IGFuIG5zLXBsYWluLXNhZmUoYykgKi8gKVxuZnVuY3Rpb24gaXNQbGFpblNhZmUoYywgcHJldiwgaW5ibG9jaykge1xuICB2YXIgY0lzTnNDaGFyT3JXaGl0ZXNwYWNlID0gaXNOc0NoYXJPcldoaXRlc3BhY2UoYyk7XG4gIHZhciBjSXNOc0NoYXIgPSBjSXNOc0NoYXJPcldoaXRlc3BhY2UgJiYgIWlzV2hpdGVzcGFjZShjKTtcbiAgcmV0dXJuIChcbiAgICAvLyBucy1wbGFpbi1zYWZlXG4gICAgaW5ibG9jayA/IC8vIGMgPSBmbG93LWluXG4gICAgICBjSXNOc0NoYXJPcldoaXRlc3BhY2VcbiAgICAgIDogY0lzTnNDaGFyT3JXaGl0ZXNwYWNlXG4gICAgICAgIC8vIC0gYy1mbG93LWluZGljYXRvclxuICAgICAgICAmJiBjICE9PSBDSEFSX0NPTU1BXG4gICAgICAgICYmIGMgIT09IENIQVJfTEVGVF9TUVVBUkVfQlJBQ0tFVFxuICAgICAgICAmJiBjICE9PSBDSEFSX1JJR0hUX1NRVUFSRV9CUkFDS0VUXG4gICAgICAgICYmIGMgIT09IENIQVJfTEVGVF9DVVJMWV9CUkFDS0VUXG4gICAgICAgICYmIGMgIT09IENIQVJfUklHSFRfQ1VSTFlfQlJBQ0tFVFxuICApXG4gICAgLy8gbnMtcGxhaW4tY2hhclxuICAgICYmIGMgIT09IENIQVJfU0hBUlAgLy8gZmFsc2Ugb24gJyMnXG4gICAgJiYgIShwcmV2ID09PSBDSEFSX0NPTE9OICYmICFjSXNOc0NoYXIpIC8vIGZhbHNlIG9uICc6ICdcbiAgICB8fCAoaXNOc0NoYXJPcldoaXRlc3BhY2UocHJldikgJiYgIWlzV2hpdGVzcGFjZShwcmV2KSAmJiBjID09PSBDSEFSX1NIQVJQKSAvLyBjaGFuZ2UgdG8gdHJ1ZSBvbiAnW14gXSMnXG4gICAgfHwgKHByZXYgPT09IENIQVJfQ09MT04gJiYgY0lzTnNDaGFyKTsgLy8gY2hhbmdlIHRvIHRydWUgb24gJzpbXiBdJ1xufVxuXG4vLyBTaW1wbGlmaWVkIHRlc3QgZm9yIHZhbHVlcyBhbGxvd2VkIGFzIHRoZSBmaXJzdCBjaGFyYWN0ZXIgaW4gcGxhaW4gc3R5bGUuXG5mdW5jdGlvbiBpc1BsYWluU2FmZUZpcnN0KGMpIHtcbiAgLy8gVXNlcyBhIHN1YnNldCBvZiBucy1jaGFyIC0gYy1pbmRpY2F0b3JcbiAgLy8gd2hlcmUgbnMtY2hhciA9IG5iLWNoYXIgLSBzLXdoaXRlLlxuICAvLyBObyBzdXBwb3J0IG9mICggKCBcdTIwMUM/XHUyMDFEIHwgXHUyMDFDOlx1MjAxRCB8IFx1MjAxQy1cdTIwMUQgKSAvKiBGb2xsb3dlZCBieSBhbiBucy1wbGFpbi1zYWZlKGMpKSAqLyApIHBhcnRcbiAgcmV0dXJuIGlzUHJpbnRhYmxlKGMpICYmIGMgIT09IENIQVJfQk9NXG4gICAgJiYgIWlzV2hpdGVzcGFjZShjKSAvLyAtIHMtd2hpdGVcbiAgICAvLyAtIChjLWluZGljYXRvciA6Oj1cbiAgICAvLyBcdTIwMUMtXHUyMDFEIHwgXHUyMDFDP1x1MjAxRCB8IFx1MjAxQzpcdTIwMUQgfCBcdTIwMUMsXHUyMDFEIHwgXHUyMDFDW1x1MjAxRCB8IFx1MjAxQ11cdTIwMUQgfCBcdTIwMUN7XHUyMDFEIHwgXHUyMDFDfVx1MjAxRFxuICAgICYmIGMgIT09IENIQVJfTUlOVVNcbiAgICAmJiBjICE9PSBDSEFSX1FVRVNUSU9OXG4gICAgJiYgYyAhPT0gQ0hBUl9DT0xPTlxuICAgICYmIGMgIT09IENIQVJfQ09NTUFcbiAgICAmJiBjICE9PSBDSEFSX0xFRlRfU1FVQVJFX0JSQUNLRVRcbiAgICAmJiBjICE9PSBDSEFSX1JJR0hUX1NRVUFSRV9CUkFDS0VUXG4gICAgJiYgYyAhPT0gQ0hBUl9MRUZUX0NVUkxZX0JSQUNLRVRcbiAgICAmJiBjICE9PSBDSEFSX1JJR0hUX0NVUkxZX0JSQUNLRVRcbiAgICAvLyB8IFx1MjAxQyNcdTIwMUQgfCBcdTIwMUMmXHUyMDFEIHwgXHUyMDFDKlx1MjAxRCB8IFx1MjAxQyFcdTIwMUQgfCBcdTIwMUN8XHUyMDFEIHwgXHUyMDFDPVx1MjAxRCB8IFx1MjAxQz5cdTIwMUQgfCBcdTIwMUMnXHUyMDFEIHwgXHUyMDFDXCJcdTIwMURcbiAgICAmJiBjICE9PSBDSEFSX1NIQVJQXG4gICAgJiYgYyAhPT0gQ0hBUl9BTVBFUlNBTkRcbiAgICAmJiBjICE9PSBDSEFSX0FTVEVSSVNLXG4gICAgJiYgYyAhPT0gQ0hBUl9FWENMQU1BVElPTlxuICAgICYmIGMgIT09IENIQVJfVkVSVElDQUxfTElORVxuICAgICYmIGMgIT09IENIQVJfRVFVQUxTXG4gICAgJiYgYyAhPT0gQ0hBUl9HUkVBVEVSX1RIQU5cbiAgICAmJiBjICE9PSBDSEFSX1NJTkdMRV9RVU9URVxuICAgICYmIGMgIT09IENIQVJfRE9VQkxFX1FVT1RFXG4gICAgLy8gfCBcdTIwMUMlXHUyMDFEIHwgXHUyMDFDQFx1MjAxRCB8IFx1MjAxQ2BcdTIwMUQpXG4gICAgJiYgYyAhPT0gQ0hBUl9QRVJDRU5UXG4gICAgJiYgYyAhPT0gQ0hBUl9DT01NRVJDSUFMX0FUXG4gICAgJiYgYyAhPT0gQ0hBUl9HUkFWRV9BQ0NFTlQ7XG59XG5cbi8vIFNpbXBsaWZpZWQgdGVzdCBmb3IgdmFsdWVzIGFsbG93ZWQgYXMgdGhlIGxhc3QgY2hhcmFjdGVyIGluIHBsYWluIHN0eWxlLlxuZnVuY3Rpb24gaXNQbGFpblNhZmVMYXN0KGMpIHtcbiAgLy8ganVzdCBub3Qgd2hpdGVzcGFjZSBvciBjb2xvbiwgaXQgd2lsbCBiZSBjaGVja2VkIHRvIGJlIHBsYWluIGNoYXJhY3RlciBsYXRlclxuICByZXR1cm4gIWlzV2hpdGVzcGFjZShjKSAmJiBjICE9PSBDSEFSX0NPTE9OO1xufVxuXG4vLyBTYW1lIGFzICdzdHJpbmcnLmNvZGVQb2ludEF0KHBvcyksIGJ1dCB3b3JrcyBpbiBvbGRlciBicm93c2Vycy5cbmZ1bmN0aW9uIGNvZGVQb2ludEF0KHN0cmluZywgcG9zKSB7XG4gIHZhciBmaXJzdCA9IHN0cmluZy5jaGFyQ29kZUF0KHBvcyksIHNlY29uZDtcbiAgaWYgKGZpcnN0ID49IDB4RDgwMCAmJiBmaXJzdCA8PSAweERCRkYgJiYgcG9zICsgMSA8IHN0cmluZy5sZW5ndGgpIHtcbiAgICBzZWNvbmQgPSBzdHJpbmcuY2hhckNvZGVBdChwb3MgKyAxKTtcbiAgICBpZiAoc2Vjb25kID49IDB4REMwMCAmJiBzZWNvbmQgPD0gMHhERkZGKSB7XG4gICAgICAvLyBodHRwczovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZyNzdXJyb2dhdGUtZm9ybXVsYWVcbiAgICAgIHJldHVybiAoZmlyc3QgLSAweEQ4MDApICogMHg0MDAgKyBzZWNvbmQgLSAweERDMDAgKyAweDEwMDAwO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmlyc3Q7XG59XG5cbi8vIERldGVybWluZXMgd2hldGhlciBibG9jayBpbmRlbnRhdGlvbiBpbmRpY2F0b3IgaXMgcmVxdWlyZWQuXG5mdW5jdGlvbiBuZWVkSW5kZW50SW5kaWNhdG9yKHN0cmluZykge1xuICB2YXIgbGVhZGluZ1NwYWNlUmUgPSAvXlxcbiogLztcbiAgcmV0dXJuIGxlYWRpbmdTcGFjZVJlLnRlc3Qoc3RyaW5nKTtcbn1cblxudmFyIFNUWUxFX1BMQUlOICAgPSAxLFxuICAgIFNUWUxFX1NJTkdMRSAgPSAyLFxuICAgIFNUWUxFX0xJVEVSQUwgPSAzLFxuICAgIFNUWUxFX0ZPTERFRCAgPSA0LFxuICAgIFNUWUxFX0RPVUJMRSAgPSA1O1xuXG4vLyBEZXRlcm1pbmVzIHdoaWNoIHNjYWxhciBzdHlsZXMgYXJlIHBvc3NpYmxlIGFuZCByZXR1cm5zIHRoZSBwcmVmZXJyZWQgc3R5bGUuXG4vLyBsaW5lV2lkdGggPSAtMSA9PiBubyBsaW1pdC5cbi8vIFByZS1jb25kaXRpb25zOiBzdHIubGVuZ3RoID4gMC5cbi8vIFBvc3QtY29uZGl0aW9uczpcbi8vICAgIFNUWUxFX1BMQUlOIG9yIFNUWUxFX1NJTkdMRSA9PiBubyBcXG4gYXJlIGluIHRoZSBzdHJpbmcuXG4vLyAgICBTVFlMRV9MSVRFUkFMID0+IG5vIGxpbmVzIGFyZSBzdWl0YWJsZSBmb3IgZm9sZGluZyAob3IgbGluZVdpZHRoIGlzIC0xKS5cbi8vICAgIFNUWUxFX0ZPTERFRCA9PiBhIGxpbmUgPiBsaW5lV2lkdGggYW5kIGNhbiBiZSBmb2xkZWQgKGFuZCBsaW5lV2lkdGggIT0gLTEpLlxuZnVuY3Rpb24gY2hvb3NlU2NhbGFyU3R5bGUoc3RyaW5nLCBzaW5nbGVMaW5lT25seSwgaW5kZW50UGVyTGV2ZWwsIGxpbmVXaWR0aCxcbiAgdGVzdEFtYmlndW91c1R5cGUsIHF1b3RpbmdUeXBlLCBmb3JjZVF1b3RlcywgaW5ibG9jaykge1xuXG4gIHZhciBpO1xuICB2YXIgY2hhciA9IDA7XG4gIHZhciBwcmV2Q2hhciA9IG51bGw7XG4gIHZhciBoYXNMaW5lQnJlYWsgPSBmYWxzZTtcbiAgdmFyIGhhc0ZvbGRhYmxlTGluZSA9IGZhbHNlOyAvLyBvbmx5IGNoZWNrZWQgaWYgc2hvdWxkVHJhY2tXaWR0aFxuICB2YXIgc2hvdWxkVHJhY2tXaWR0aCA9IGxpbmVXaWR0aCAhPT0gLTE7XG4gIHZhciBwcmV2aW91c0xpbmVCcmVhayA9IC0xOyAvLyBjb3VudCB0aGUgZmlyc3QgbGluZSBjb3JyZWN0bHlcbiAgdmFyIHBsYWluID0gaXNQbGFpblNhZmVGaXJzdChjb2RlUG9pbnRBdChzdHJpbmcsIDApKVxuICAgICAgICAgICYmIGlzUGxhaW5TYWZlTGFzdChjb2RlUG9pbnRBdChzdHJpbmcsIHN0cmluZy5sZW5ndGggLSAxKSk7XG5cbiAgaWYgKHNpbmdsZUxpbmVPbmx5IHx8IGZvcmNlUXVvdGVzKSB7XG4gICAgLy8gQ2FzZTogbm8gYmxvY2sgc3R5bGVzLlxuICAgIC8vIENoZWNrIGZvciBkaXNhbGxvd2VkIGNoYXJhY3RlcnMgdG8gcnVsZSBvdXQgcGxhaW4gYW5kIHNpbmdsZS5cbiAgICBmb3IgKGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgY2hhciA+PSAweDEwMDAwID8gaSArPSAyIDogaSsrKSB7XG4gICAgICBjaGFyID0gY29kZVBvaW50QXQoc3RyaW5nLCBpKTtcbiAgICAgIGlmICghaXNQcmludGFibGUoY2hhcikpIHtcbiAgICAgICAgcmV0dXJuIFNUWUxFX0RPVUJMRTtcbiAgICAgIH1cbiAgICAgIHBsYWluID0gcGxhaW4gJiYgaXNQbGFpblNhZmUoY2hhciwgcHJldkNoYXIsIGluYmxvY2spO1xuICAgICAgcHJldkNoYXIgPSBjaGFyO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBDYXNlOiBibG9jayBzdHlsZXMgcGVybWl0dGVkLlxuICAgIGZvciAoaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOyBjaGFyID49IDB4MTAwMDAgPyBpICs9IDIgOiBpKyspIHtcbiAgICAgIGNoYXIgPSBjb2RlUG9pbnRBdChzdHJpbmcsIGkpO1xuICAgICAgaWYgKGNoYXIgPT09IENIQVJfTElORV9GRUVEKSB7XG4gICAgICAgIGhhc0xpbmVCcmVhayA9IHRydWU7XG4gICAgICAgIC8vIENoZWNrIGlmIGFueSBsaW5lIGNhbiBiZSBmb2xkZWQuXG4gICAgICAgIGlmIChzaG91bGRUcmFja1dpZHRoKSB7XG4gICAgICAgICAgaGFzRm9sZGFibGVMaW5lID0gaGFzRm9sZGFibGVMaW5lIHx8XG4gICAgICAgICAgICAvLyBGb2xkYWJsZSBsaW5lID0gdG9vIGxvbmcsIGFuZCBub3QgbW9yZS1pbmRlbnRlZC5cbiAgICAgICAgICAgIChpIC0gcHJldmlvdXNMaW5lQnJlYWsgLSAxID4gbGluZVdpZHRoICYmXG4gICAgICAgICAgICAgc3RyaW5nW3ByZXZpb3VzTGluZUJyZWFrICsgMV0gIT09ICcgJyk7XG4gICAgICAgICAgcHJldmlvdXNMaW5lQnJlYWsgPSBpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCFpc1ByaW50YWJsZShjaGFyKSkge1xuICAgICAgICByZXR1cm4gU1RZTEVfRE9VQkxFO1xuICAgICAgfVxuICAgICAgcGxhaW4gPSBwbGFpbiAmJiBpc1BsYWluU2FmZShjaGFyLCBwcmV2Q2hhciwgaW5ibG9jayk7XG4gICAgICBwcmV2Q2hhciA9IGNoYXI7XG4gICAgfVxuICAgIC8vIGluIGNhc2UgdGhlIGVuZCBpcyBtaXNzaW5nIGEgXFxuXG4gICAgaGFzRm9sZGFibGVMaW5lID0gaGFzRm9sZGFibGVMaW5lIHx8IChzaG91bGRUcmFja1dpZHRoICYmXG4gICAgICAoaSAtIHByZXZpb3VzTGluZUJyZWFrIC0gMSA+IGxpbmVXaWR0aCAmJlxuICAgICAgIHN0cmluZ1twcmV2aW91c0xpbmVCcmVhayArIDFdICE9PSAnICcpKTtcbiAgfVxuICAvLyBBbHRob3VnaCBldmVyeSBzdHlsZSBjYW4gcmVwcmVzZW50IFxcbiB3aXRob3V0IGVzY2FwaW5nLCBwcmVmZXIgYmxvY2sgc3R5bGVzXG4gIC8vIGZvciBtdWx0aWxpbmUsIHNpbmNlIHRoZXkncmUgbW9yZSByZWFkYWJsZSBhbmQgdGhleSBkb24ndCBhZGQgZW1wdHkgbGluZXMuXG4gIC8vIEFsc28gcHJlZmVyIGZvbGRpbmcgYSBzdXBlci1sb25nIGxpbmUuXG4gIGlmICghaGFzTGluZUJyZWFrICYmICFoYXNGb2xkYWJsZUxpbmUpIHtcbiAgICAvLyBTdHJpbmdzIGludGVycHJldGFibGUgYXMgYW5vdGhlciB0eXBlIGhhdmUgdG8gYmUgcXVvdGVkO1xuICAgIC8vIGUuZy4gdGhlIHN0cmluZyAndHJ1ZScgdnMuIHRoZSBib29sZWFuIHRydWUuXG4gICAgaWYgKHBsYWluICYmICFmb3JjZVF1b3RlcyAmJiAhdGVzdEFtYmlndW91c1R5cGUoc3RyaW5nKSkge1xuICAgICAgcmV0dXJuIFNUWUxFX1BMQUlOO1xuICAgIH1cbiAgICByZXR1cm4gcXVvdGluZ1R5cGUgPT09IFFVT1RJTkdfVFlQRV9ET1VCTEUgPyBTVFlMRV9ET1VCTEUgOiBTVFlMRV9TSU5HTEU7XG4gIH1cbiAgLy8gRWRnZSBjYXNlOiBibG9jayBpbmRlbnRhdGlvbiBpbmRpY2F0b3IgY2FuIG9ubHkgaGF2ZSBvbmUgZGlnaXQuXG4gIGlmIChpbmRlbnRQZXJMZXZlbCA+IDkgJiYgbmVlZEluZGVudEluZGljYXRvcihzdHJpbmcpKSB7XG4gICAgcmV0dXJuIFNUWUxFX0RPVUJMRTtcbiAgfVxuICAvLyBBdCB0aGlzIHBvaW50IHdlIGtub3cgYmxvY2sgc3R5bGVzIGFyZSB2YWxpZC5cbiAgLy8gUHJlZmVyIGxpdGVyYWwgc3R5bGUgdW5sZXNzIHdlIHdhbnQgdG8gZm9sZC5cbiAgaWYgKCFmb3JjZVF1b3Rlcykge1xuICAgIHJldHVybiBoYXNGb2xkYWJsZUxpbmUgPyBTVFlMRV9GT0xERUQgOiBTVFlMRV9MSVRFUkFMO1xuICB9XG4gIHJldHVybiBxdW90aW5nVHlwZSA9PT0gUVVPVElOR19UWVBFX0RPVUJMRSA/IFNUWUxFX0RPVUJMRSA6IFNUWUxFX1NJTkdMRTtcbn1cblxuLy8gTm90ZTogbGluZSBicmVha2luZy9mb2xkaW5nIGlzIGltcGxlbWVudGVkIGZvciBvbmx5IHRoZSBmb2xkZWQgc3R5bGUuXG4vLyBOQi4gV2UgZHJvcCB0aGUgbGFzdCB0cmFpbGluZyBuZXdsaW5lIChpZiBhbnkpIG9mIGEgcmV0dXJuZWQgYmxvY2sgc2NhbGFyXG4vLyAgc2luY2UgdGhlIGR1bXBlciBhZGRzIGl0cyBvd24gbmV3bGluZS4gVGhpcyBhbHdheXMgd29ya3M6XG4vLyAgICBcdTIwMjIgTm8gZW5kaW5nIG5ld2xpbmUgPT4gdW5hZmZlY3RlZDsgYWxyZWFkeSB1c2luZyBzdHJpcCBcIi1cIiBjaG9tcGluZy5cbi8vICAgIFx1MjAyMiBFbmRpbmcgbmV3bGluZSAgICA9PiByZW1vdmVkIHRoZW4gcmVzdG9yZWQuXG4vLyAgSW1wb3J0YW50bHksIHRoaXMga2VlcHMgdGhlIFwiK1wiIGNob21wIGluZGljYXRvciBmcm9tIGdhaW5pbmcgYW4gZXh0cmEgbGluZS5cbmZ1bmN0aW9uIHdyaXRlU2NhbGFyKHN0YXRlLCBzdHJpbmcsIGxldmVsLCBpc2tleSwgaW5ibG9jaykge1xuICBzdGF0ZS5kdW1wID0gKGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoc3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHN0YXRlLnF1b3RpbmdUeXBlID09PSBRVU9USU5HX1RZUEVfRE9VQkxFID8gJ1wiXCInIDogXCInJ1wiO1xuICAgIH1cbiAgICBpZiAoIXN0YXRlLm5vQ29tcGF0TW9kZSkge1xuICAgICAgaWYgKERFUFJFQ0FURURfQk9PTEVBTlNfU1lOVEFYLmluZGV4T2Yoc3RyaW5nKSAhPT0gLTEgfHwgREVQUkVDQVRFRF9CQVNFNjBfU1lOVEFYLnRlc3Qoc3RyaW5nKSkge1xuICAgICAgICByZXR1cm4gc3RhdGUucXVvdGluZ1R5cGUgPT09IFFVT1RJTkdfVFlQRV9ET1VCTEUgPyAoJ1wiJyArIHN0cmluZyArICdcIicpIDogKFwiJ1wiICsgc3RyaW5nICsgXCInXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBpbmRlbnQgPSBzdGF0ZS5pbmRlbnQgKiBNYXRoLm1heCgxLCBsZXZlbCk7IC8vIG5vIDAtaW5kZW50IHNjYWxhcnNcbiAgICAvLyBBcyBpbmRlbnRhdGlvbiBnZXRzIGRlZXBlciwgbGV0IHRoZSB3aWR0aCBkZWNyZWFzZSBtb25vdG9uaWNhbGx5XG4gICAgLy8gdG8gdGhlIGxvd2VyIGJvdW5kIG1pbihzdGF0ZS5saW5lV2lkdGgsIDQwKS5cbiAgICAvLyBOb3RlIHRoYXQgdGhpcyBpbXBsaWVzXG4gICAgLy8gIHN0YXRlLmxpbmVXaWR0aCBcdTIyNjQgNDAgKyBzdGF0ZS5pbmRlbnQ6IHdpZHRoIGlzIGZpeGVkIGF0IHRoZSBsb3dlciBib3VuZC5cbiAgICAvLyAgc3RhdGUubGluZVdpZHRoID4gNDAgKyBzdGF0ZS5pbmRlbnQ6IHdpZHRoIGRlY3JlYXNlcyB1bnRpbCB0aGUgbG93ZXIgYm91bmQuXG4gICAgLy8gVGhpcyBiZWhhdmVzIGJldHRlciB0aGFuIGEgY29uc3RhbnQgbWluaW11bSB3aWR0aCB3aGljaCBkaXNhbGxvd3MgbmFycm93ZXIgb3B0aW9ucyxcbiAgICAvLyBvciBhbiBpbmRlbnQgdGhyZXNob2xkIHdoaWNoIGNhdXNlcyB0aGUgd2lkdGggdG8gc3VkZGVubHkgaW5jcmVhc2UuXG4gICAgdmFyIGxpbmVXaWR0aCA9IHN0YXRlLmxpbmVXaWR0aCA9PT0gLTFcbiAgICAgID8gLTEgOiBNYXRoLm1heChNYXRoLm1pbihzdGF0ZS5saW5lV2lkdGgsIDQwKSwgc3RhdGUubGluZVdpZHRoIC0gaW5kZW50KTtcblxuICAgIC8vIFdpdGhvdXQga25vd2luZyBpZiBrZXlzIGFyZSBpbXBsaWNpdC9leHBsaWNpdCwgYXNzdW1lIGltcGxpY2l0IGZvciBzYWZldHkuXG4gICAgdmFyIHNpbmdsZUxpbmVPbmx5ID0gaXNrZXlcbiAgICAgIC8vIE5vIGJsb2NrIHN0eWxlcyBpbiBmbG93IG1vZGUuXG4gICAgICB8fCAoc3RhdGUuZmxvd0xldmVsID4gLTEgJiYgbGV2ZWwgPj0gc3RhdGUuZmxvd0xldmVsKTtcbiAgICBmdW5jdGlvbiB0ZXN0QW1iaWd1aXR5KHN0cmluZykge1xuICAgICAgcmV0dXJuIHRlc3RJbXBsaWNpdFJlc29sdmluZyhzdGF0ZSwgc3RyaW5nKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKGNob29zZVNjYWxhclN0eWxlKHN0cmluZywgc2luZ2xlTGluZU9ubHksIHN0YXRlLmluZGVudCwgbGluZVdpZHRoLFxuICAgICAgdGVzdEFtYmlndWl0eSwgc3RhdGUucXVvdGluZ1R5cGUsIHN0YXRlLmZvcmNlUXVvdGVzICYmICFpc2tleSwgaW5ibG9jaykpIHtcblxuICAgICAgY2FzZSBTVFlMRV9QTEFJTjpcbiAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICAgIGNhc2UgU1RZTEVfU0lOR0xFOlxuICAgICAgICByZXR1cm4gXCInXCIgKyBzdHJpbmcucmVwbGFjZSgvJy9nLCBcIicnXCIpICsgXCInXCI7XG4gICAgICBjYXNlIFNUWUxFX0xJVEVSQUw6XG4gICAgICAgIHJldHVybiAnfCcgKyBibG9ja0hlYWRlcihzdHJpbmcsIHN0YXRlLmluZGVudClcbiAgICAgICAgICArIGRyb3BFbmRpbmdOZXdsaW5lKGluZGVudFN0cmluZyhzdHJpbmcsIGluZGVudCkpO1xuICAgICAgY2FzZSBTVFlMRV9GT0xERUQ6XG4gICAgICAgIHJldHVybiAnPicgKyBibG9ja0hlYWRlcihzdHJpbmcsIHN0YXRlLmluZGVudClcbiAgICAgICAgICArIGRyb3BFbmRpbmdOZXdsaW5lKGluZGVudFN0cmluZyhmb2xkU3RyaW5nKHN0cmluZywgbGluZVdpZHRoKSwgaW5kZW50KSk7XG4gICAgICBjYXNlIFNUWUxFX0RPVUJMRTpcbiAgICAgICAgcmV0dXJuICdcIicgKyBlc2NhcGVTdHJpbmcoc3RyaW5nKSArICdcIic7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgZXhjZXB0aW9uKCdpbXBvc3NpYmxlIGVycm9yOiBpbnZhbGlkIHNjYWxhciBzdHlsZScpO1xuICAgIH1cbiAgfSgpKTtcbn1cblxuLy8gUHJlLWNvbmRpdGlvbnM6IHN0cmluZyBpcyB2YWxpZCBmb3IgYSBibG9jayBzY2FsYXIsIDEgPD0gaW5kZW50UGVyTGV2ZWwgPD0gOS5cbmZ1bmN0aW9uIGJsb2NrSGVhZGVyKHN0cmluZywgaW5kZW50UGVyTGV2ZWwpIHtcbiAgdmFyIGluZGVudEluZGljYXRvciA9IG5lZWRJbmRlbnRJbmRpY2F0b3Ioc3RyaW5nKSA/IFN0cmluZyhpbmRlbnRQZXJMZXZlbCkgOiAnJztcblxuICAvLyBub3RlIHRoZSBzcGVjaWFsIGNhc2U6IHRoZSBzdHJpbmcgJ1xcbicgY291bnRzIGFzIGEgXCJ0cmFpbGluZ1wiIGVtcHR5IGxpbmUuXG4gIHZhciBjbGlwID0gICAgICAgICAgc3RyaW5nW3N0cmluZy5sZW5ndGggLSAxXSA9PT0gJ1xcbic7XG4gIHZhciBrZWVwID0gY2xpcCAmJiAoc3RyaW5nW3N0cmluZy5sZW5ndGggLSAyXSA9PT0gJ1xcbicgfHwgc3RyaW5nID09PSAnXFxuJyk7XG4gIHZhciBjaG9tcCA9IGtlZXAgPyAnKycgOiAoY2xpcCA/ICcnIDogJy0nKTtcblxuICByZXR1cm4gaW5kZW50SW5kaWNhdG9yICsgY2hvbXAgKyAnXFxuJztcbn1cblxuLy8gKFNlZSB0aGUgbm90ZSBmb3Igd3JpdGVTY2FsYXIuKVxuZnVuY3Rpb24gZHJvcEVuZGluZ05ld2xpbmUoc3RyaW5nKSB7XG4gIHJldHVybiBzdHJpbmdbc3RyaW5nLmxlbmd0aCAtIDFdID09PSAnXFxuJyA/IHN0cmluZy5zbGljZSgwLCAtMSkgOiBzdHJpbmc7XG59XG5cbi8vIE5vdGU6IGEgbG9uZyBsaW5lIHdpdGhvdXQgYSBzdWl0YWJsZSBicmVhayBwb2ludCB3aWxsIGV4Y2VlZCB0aGUgd2lkdGggbGltaXQuXG4vLyBQcmUtY29uZGl0aW9uczogZXZlcnkgY2hhciBpbiBzdHIgaXNQcmludGFibGUsIHN0ci5sZW5ndGggPiAwLCB3aWR0aCA+IDAuXG5mdW5jdGlvbiBmb2xkU3RyaW5nKHN0cmluZywgd2lkdGgpIHtcbiAgLy8gSW4gZm9sZGVkIHN0eWxlLCAkayQgY29uc2VjdXRpdmUgbmV3bGluZXMgb3V0cHV0IGFzICRrKzEkIG5ld2xpbmVzXHUyMDE0XG4gIC8vIHVubGVzcyB0aGV5J3JlIGJlZm9yZSBvciBhZnRlciBhIG1vcmUtaW5kZW50ZWQgbGluZSwgb3IgYXQgdGhlIHZlcnlcbiAgLy8gYmVnaW5uaW5nIG9yIGVuZCwgaW4gd2hpY2ggY2FzZSAkayQgbWFwcyB0byAkayQuXG4gIC8vIFRoZXJlZm9yZSwgcGFyc2UgZWFjaCBjaHVuayBhcyBuZXdsaW5lKHMpIGZvbGxvd2VkIGJ5IGEgY29udGVudCBsaW5lLlxuICB2YXIgbGluZVJlID0gLyhcXG4rKShbXlxcbl0qKS9nO1xuXG4gIC8vIGZpcnN0IGxpbmUgKHBvc3NpYmx5IGFuIGVtcHR5IGxpbmUpXG4gIHZhciByZXN1bHQgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBuZXh0TEYgPSBzdHJpbmcuaW5kZXhPZignXFxuJyk7XG4gICAgbmV4dExGID0gbmV4dExGICE9PSAtMSA/IG5leHRMRiA6IHN0cmluZy5sZW5ndGg7XG4gICAgbGluZVJlLmxhc3RJbmRleCA9IG5leHRMRjtcbiAgICByZXR1cm4gZm9sZExpbmUoc3RyaW5nLnNsaWNlKDAsIG5leHRMRiksIHdpZHRoKTtcbiAgfSgpKTtcbiAgLy8gSWYgd2UgaGF2ZW4ndCByZWFjaGVkIHRoZSBmaXJzdCBjb250ZW50IGxpbmUgeWV0LCBkb24ndCBhZGQgYW4gZXh0cmEgXFxuLlxuICB2YXIgcHJldk1vcmVJbmRlbnRlZCA9IHN0cmluZ1swXSA9PT0gJ1xcbicgfHwgc3RyaW5nWzBdID09PSAnICc7XG4gIHZhciBtb3JlSW5kZW50ZWQ7XG5cbiAgLy8gcmVzdCBvZiB0aGUgbGluZXNcbiAgdmFyIG1hdGNoO1xuICB3aGlsZSAoKG1hdGNoID0gbGluZVJlLmV4ZWMoc3RyaW5nKSkpIHtcbiAgICB2YXIgcHJlZml4ID0gbWF0Y2hbMV0sIGxpbmUgPSBtYXRjaFsyXTtcbiAgICBtb3JlSW5kZW50ZWQgPSAobGluZVswXSA9PT0gJyAnKTtcbiAgICByZXN1bHQgKz0gcHJlZml4XG4gICAgICArICghcHJldk1vcmVJbmRlbnRlZCAmJiAhbW9yZUluZGVudGVkICYmIGxpbmUgIT09ICcnXG4gICAgICAgID8gJ1xcbicgOiAnJylcbiAgICAgICsgZm9sZExpbmUobGluZSwgd2lkdGgpO1xuICAgIHByZXZNb3JlSW5kZW50ZWQgPSBtb3JlSW5kZW50ZWQ7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vLyBHcmVlZHkgbGluZSBicmVha2luZy5cbi8vIFBpY2tzIHRoZSBsb25nZXN0IGxpbmUgdW5kZXIgdGhlIGxpbWl0IGVhY2ggdGltZSxcbi8vIG90aGVyd2lzZSBzZXR0bGVzIGZvciB0aGUgc2hvcnRlc3QgbGluZSBvdmVyIHRoZSBsaW1pdC5cbi8vIE5CLiBNb3JlLWluZGVudGVkIGxpbmVzICpjYW5ub3QqIGJlIGZvbGRlZCwgYXMgdGhhdCB3b3VsZCBhZGQgYW4gZXh0cmEgXFxuLlxuZnVuY3Rpb24gZm9sZExpbmUobGluZSwgd2lkdGgpIHtcbiAgaWYgKGxpbmUgPT09ICcnIHx8IGxpbmVbMF0gPT09ICcgJykgcmV0dXJuIGxpbmU7XG5cbiAgLy8gU2luY2UgYSBtb3JlLWluZGVudGVkIGxpbmUgYWRkcyBhIFxcbiwgYnJlYWtzIGNhbid0IGJlIGZvbGxvd2VkIGJ5IGEgc3BhY2UuXG4gIHZhciBicmVha1JlID0gLyBbXiBdL2c7IC8vIG5vdGU6IHRoZSBtYXRjaCBpbmRleCB3aWxsIGFsd2F5cyBiZSA8PSBsZW5ndGgtMi5cbiAgdmFyIG1hdGNoO1xuICAvLyBzdGFydCBpcyBhbiBpbmNsdXNpdmUgaW5kZXguIGVuZCwgY3VyciwgYW5kIG5leHQgYXJlIGV4Y2x1c2l2ZS5cbiAgdmFyIHN0YXJ0ID0gMCwgZW5kLCBjdXJyID0gMCwgbmV4dCA9IDA7XG4gIHZhciByZXN1bHQgPSAnJztcblxuICAvLyBJbnZhcmlhbnRzOiAwIDw9IHN0YXJ0IDw9IGxlbmd0aC0xLlxuICAvLyAgIDAgPD0gY3VyciA8PSBuZXh0IDw9IG1heCgwLCBsZW5ndGgtMikuIGN1cnIgLSBzdGFydCA8PSB3aWR0aC5cbiAgLy8gSW5zaWRlIHRoZSBsb29wOlxuICAvLyAgIEEgbWF0Y2ggaW1wbGllcyBsZW5ndGggPj0gMiwgc28gY3VyciBhbmQgbmV4dCBhcmUgPD0gbGVuZ3RoLTIuXG4gIHdoaWxlICgobWF0Y2ggPSBicmVha1JlLmV4ZWMobGluZSkpKSB7XG4gICAgbmV4dCA9IG1hdGNoLmluZGV4O1xuICAgIC8vIG1haW50YWluIGludmFyaWFudDogY3VyciAtIHN0YXJ0IDw9IHdpZHRoXG4gICAgaWYgKG5leHQgLSBzdGFydCA+IHdpZHRoKSB7XG4gICAgICBlbmQgPSAoY3VyciA+IHN0YXJ0KSA/IGN1cnIgOiBuZXh0OyAvLyBkZXJpdmUgZW5kIDw9IGxlbmd0aC0yXG4gICAgICByZXN1bHQgKz0gJ1xcbicgKyBsaW5lLnNsaWNlKHN0YXJ0LCBlbmQpO1xuICAgICAgLy8gc2tpcCB0aGUgc3BhY2UgdGhhdCB3YXMgb3V0cHV0IGFzIFxcblxuICAgICAgc3RhcnQgPSBlbmQgKyAxOyAgICAgICAgICAgICAgICAgICAgLy8gZGVyaXZlIHN0YXJ0IDw9IGxlbmd0aC0xXG4gICAgfVxuICAgIGN1cnIgPSBuZXh0O1xuICB9XG5cbiAgLy8gQnkgdGhlIGludmFyaWFudHMsIHN0YXJ0IDw9IGxlbmd0aC0xLCBzbyB0aGVyZSBpcyBzb21ldGhpbmcgbGVmdCBvdmVyLlxuICAvLyBJdCBpcyBlaXRoZXIgdGhlIHdob2xlIHN0cmluZyBvciBhIHBhcnQgc3RhcnRpbmcgZnJvbSBub24td2hpdGVzcGFjZS5cbiAgcmVzdWx0ICs9ICdcXG4nO1xuICAvLyBJbnNlcnQgYSBicmVhayBpZiB0aGUgcmVtYWluZGVyIGlzIHRvbyBsb25nIGFuZCB0aGVyZSBpcyBhIGJyZWFrIGF2YWlsYWJsZS5cbiAgaWYgKGxpbmUubGVuZ3RoIC0gc3RhcnQgPiB3aWR0aCAmJiBjdXJyID4gc3RhcnQpIHtcbiAgICByZXN1bHQgKz0gbGluZS5zbGljZShzdGFydCwgY3VycikgKyAnXFxuJyArIGxpbmUuc2xpY2UoY3VyciArIDEpO1xuICB9IGVsc2Uge1xuICAgIHJlc3VsdCArPSBsaW5lLnNsaWNlKHN0YXJ0KTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQuc2xpY2UoMSk7IC8vIGRyb3AgZXh0cmEgXFxuIGpvaW5lclxufVxuXG4vLyBFc2NhcGVzIGEgZG91YmxlLXF1b3RlZCBzdHJpbmcuXG5mdW5jdGlvbiBlc2NhcGVTdHJpbmcoc3RyaW5nKSB7XG4gIHZhciByZXN1bHQgPSAnJztcbiAgdmFyIGNoYXIgPSAwO1xuICB2YXIgZXNjYXBlU2VxO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgY2hhciA+PSAweDEwMDAwID8gaSArPSAyIDogaSsrKSB7XG4gICAgY2hhciA9IGNvZGVQb2ludEF0KHN0cmluZywgaSk7XG4gICAgZXNjYXBlU2VxID0gRVNDQVBFX1NFUVVFTkNFU1tjaGFyXTtcblxuICAgIGlmICghZXNjYXBlU2VxICYmIGlzUHJpbnRhYmxlKGNoYXIpKSB7XG4gICAgICByZXN1bHQgKz0gc3RyaW5nW2ldO1xuICAgICAgaWYgKGNoYXIgPj0gMHgxMDAwMCkgcmVzdWx0ICs9IHN0cmluZ1tpICsgMV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCArPSBlc2NhcGVTZXEgfHwgZW5jb2RlSGV4KGNoYXIpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvd1NlcXVlbmNlKHN0YXRlLCBsZXZlbCwgb2JqZWN0KSB7XG4gIHZhciBfcmVzdWx0ID0gJycsXG4gICAgICBfdGFnICAgID0gc3RhdGUudGFnLFxuICAgICAgaW5kZXgsXG4gICAgICBsZW5ndGgsXG4gICAgICB2YWx1ZTtcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICB2YWx1ZSA9IG9iamVjdFtpbmRleF07XG5cbiAgICBpZiAoc3RhdGUucmVwbGFjZXIpIHtcbiAgICAgIHZhbHVlID0gc3RhdGUucmVwbGFjZXIuY2FsbChvYmplY3QsIFN0cmluZyhpbmRleCksIHZhbHVlKTtcbiAgICB9XG5cbiAgICAvLyBXcml0ZSBvbmx5IHZhbGlkIGVsZW1lbnRzLCBwdXQgbnVsbCBpbnN0ZWFkIG9mIGludmFsaWQgZWxlbWVudHMuXG4gICAgaWYgKHdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwsIHZhbHVlLCBmYWxzZSwgZmFsc2UpIHx8XG4gICAgICAgICh0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgICB3cml0ZU5vZGUoc3RhdGUsIGxldmVsLCBudWxsLCBmYWxzZSwgZmFsc2UpKSkge1xuXG4gICAgICBpZiAoX3Jlc3VsdCAhPT0gJycpIF9yZXN1bHQgKz0gJywnICsgKCFzdGF0ZS5jb25kZW5zZUZsb3cgPyAnICcgOiAnJyk7XG4gICAgICBfcmVzdWx0ICs9IHN0YXRlLmR1bXA7XG4gICAgfVxuICB9XG5cbiAgc3RhdGUudGFnID0gX3RhZztcbiAgc3RhdGUuZHVtcCA9ICdbJyArIF9yZXN1bHQgKyAnXSc7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQmxvY2tTZXF1ZW5jZShzdGF0ZSwgbGV2ZWwsIG9iamVjdCwgY29tcGFjdCkge1xuICB2YXIgX3Jlc3VsdCA9ICcnLFxuICAgICAgX3RhZyAgICA9IHN0YXRlLnRhZyxcbiAgICAgIGluZGV4LFxuICAgICAgbGVuZ3RoLFxuICAgICAgdmFsdWU7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgdmFsdWUgPSBvYmplY3RbaW5kZXhdO1xuXG4gICAgaWYgKHN0YXRlLnJlcGxhY2VyKSB7XG4gICAgICB2YWx1ZSA9IHN0YXRlLnJlcGxhY2VyLmNhbGwob2JqZWN0LCBTdHJpbmcoaW5kZXgpLCB2YWx1ZSk7XG4gICAgfVxuXG4gICAgLy8gV3JpdGUgb25seSB2YWxpZCBlbGVtZW50cywgcHV0IG51bGwgaW5zdGVhZCBvZiBpbnZhbGlkIGVsZW1lbnRzLlxuICAgIGlmICh3cml0ZU5vZGUoc3RhdGUsIGxldmVsICsgMSwgdmFsdWUsIHRydWUsIHRydWUsIGZhbHNlLCB0cnVlKSB8fFxuICAgICAgICAodHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAgd3JpdGVOb2RlKHN0YXRlLCBsZXZlbCArIDEsIG51bGwsIHRydWUsIHRydWUsIGZhbHNlLCB0cnVlKSkpIHtcblxuICAgICAgaWYgKCFjb21wYWN0IHx8IF9yZXN1bHQgIT09ICcnKSB7XG4gICAgICAgIF9yZXN1bHQgKz0gZ2VuZXJhdGVOZXh0TGluZShzdGF0ZSwgbGV2ZWwpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc3RhdGUuZHVtcCAmJiBDSEFSX0xJTkVfRkVFRCA9PT0gc3RhdGUuZHVtcC5jaGFyQ29kZUF0KDApKSB7XG4gICAgICAgIF9yZXN1bHQgKz0gJy0nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgX3Jlc3VsdCArPSAnLSAnO1xuICAgICAgfVxuXG4gICAgICBfcmVzdWx0ICs9IHN0YXRlLmR1bXA7XG4gICAgfVxuICB9XG5cbiAgc3RhdGUudGFnID0gX3RhZztcbiAgc3RhdGUuZHVtcCA9IF9yZXN1bHQgfHwgJ1tdJzsgLy8gRW1wdHkgc2VxdWVuY2UgaWYgbm8gdmFsaWQgdmFsdWVzLlxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb3dNYXBwaW5nKHN0YXRlLCBsZXZlbCwgb2JqZWN0KSB7XG4gIHZhciBfcmVzdWx0ICAgICAgID0gJycsXG4gICAgICBfdGFnICAgICAgICAgID0gc3RhdGUudGFnLFxuICAgICAgb2JqZWN0S2V5TGlzdCA9IE9iamVjdC5rZXlzKG9iamVjdCksXG4gICAgICBpbmRleCxcbiAgICAgIGxlbmd0aCxcbiAgICAgIG9iamVjdEtleSxcbiAgICAgIG9iamVjdFZhbHVlLFxuICAgICAgcGFpckJ1ZmZlcjtcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0S2V5TGlzdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG5cbiAgICBwYWlyQnVmZmVyID0gJyc7XG4gICAgaWYgKF9yZXN1bHQgIT09ICcnKSBwYWlyQnVmZmVyICs9ICcsICc7XG5cbiAgICBpZiAoc3RhdGUuY29uZGVuc2VGbG93KSBwYWlyQnVmZmVyICs9ICdcIic7XG5cbiAgICBvYmplY3RLZXkgPSBvYmplY3RLZXlMaXN0W2luZGV4XTtcbiAgICBvYmplY3RWYWx1ZSA9IG9iamVjdFtvYmplY3RLZXldO1xuXG4gICAgaWYgKHN0YXRlLnJlcGxhY2VyKSB7XG4gICAgICBvYmplY3RWYWx1ZSA9IHN0YXRlLnJlcGxhY2VyLmNhbGwob2JqZWN0LCBvYmplY3RLZXksIG9iamVjdFZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAoIXdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwsIG9iamVjdEtleSwgZmFsc2UsIGZhbHNlKSkge1xuICAgICAgY29udGludWU7IC8vIFNraXAgdGhpcyBwYWlyIGJlY2F1c2Ugb2YgaW52YWxpZCBrZXk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXRlLmR1bXAubGVuZ3RoID4gMTAyNCkgcGFpckJ1ZmZlciArPSAnPyAnO1xuXG4gICAgcGFpckJ1ZmZlciArPSBzdGF0ZS5kdW1wICsgKHN0YXRlLmNvbmRlbnNlRmxvdyA/ICdcIicgOiAnJykgKyAnOicgKyAoc3RhdGUuY29uZGVuc2VGbG93ID8gJycgOiAnICcpO1xuXG4gICAgaWYgKCF3cml0ZU5vZGUoc3RhdGUsIGxldmVsLCBvYmplY3RWYWx1ZSwgZmFsc2UsIGZhbHNlKSkge1xuICAgICAgY29udGludWU7IC8vIFNraXAgdGhpcyBwYWlyIGJlY2F1c2Ugb2YgaW52YWxpZCB2YWx1ZS5cbiAgICB9XG5cbiAgICBwYWlyQnVmZmVyICs9IHN0YXRlLmR1bXA7XG5cbiAgICAvLyBCb3RoIGtleSBhbmQgdmFsdWUgYXJlIHZhbGlkLlxuICAgIF9yZXN1bHQgKz0gcGFpckJ1ZmZlcjtcbiAgfVxuXG4gIHN0YXRlLnRhZyA9IF90YWc7XG4gIHN0YXRlLmR1bXAgPSAneycgKyBfcmVzdWx0ICsgJ30nO1xufVxuXG5mdW5jdGlvbiB3cml0ZUJsb2NrTWFwcGluZyhzdGF0ZSwgbGV2ZWwsIG9iamVjdCwgY29tcGFjdCkge1xuICB2YXIgX3Jlc3VsdCAgICAgICA9ICcnLFxuICAgICAgX3RhZyAgICAgICAgICA9IHN0YXRlLnRhZyxcbiAgICAgIG9iamVjdEtleUxpc3QgPSBPYmplY3Qua2V5cyhvYmplY3QpLFxuICAgICAgaW5kZXgsXG4gICAgICBsZW5ndGgsXG4gICAgICBvYmplY3RLZXksXG4gICAgICBvYmplY3RWYWx1ZSxcbiAgICAgIGV4cGxpY2l0UGFpcixcbiAgICAgIHBhaXJCdWZmZXI7XG5cbiAgLy8gQWxsb3cgc29ydGluZyBrZXlzIHNvIHRoYXQgdGhlIG91dHB1dCBmaWxlIGlzIGRldGVybWluaXN0aWNcbiAgaWYgKHN0YXRlLnNvcnRLZXlzID09PSB0cnVlKSB7XG4gICAgLy8gRGVmYXVsdCBzb3J0aW5nXG4gICAgb2JqZWN0S2V5TGlzdC5zb3J0KCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHN0YXRlLnNvcnRLZXlzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gQ3VzdG9tIHNvcnQgZnVuY3Rpb25cbiAgICBvYmplY3RLZXlMaXN0LnNvcnQoc3RhdGUuc29ydEtleXMpO1xuICB9IGVsc2UgaWYgKHN0YXRlLnNvcnRLZXlzKSB7XG4gICAgLy8gU29tZXRoaW5nIGlzIHdyb25nXG4gICAgdGhyb3cgbmV3IGV4Y2VwdGlvbignc29ydEtleXMgbXVzdCBiZSBhIGJvb2xlYW4gb3IgYSBmdW5jdGlvbicpO1xuICB9XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IG9iamVjdEtleUxpc3QubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHBhaXJCdWZmZXIgPSAnJztcblxuICAgIGlmICghY29tcGFjdCB8fCBfcmVzdWx0ICE9PSAnJykge1xuICAgICAgcGFpckJ1ZmZlciArPSBnZW5lcmF0ZU5leHRMaW5lKHN0YXRlLCBsZXZlbCk7XG4gICAgfVxuXG4gICAgb2JqZWN0S2V5ID0gb2JqZWN0S2V5TGlzdFtpbmRleF07XG4gICAgb2JqZWN0VmFsdWUgPSBvYmplY3Rbb2JqZWN0S2V5XTtcblxuICAgIGlmIChzdGF0ZS5yZXBsYWNlcikge1xuICAgICAgb2JqZWN0VmFsdWUgPSBzdGF0ZS5yZXBsYWNlci5jYWxsKG9iamVjdCwgb2JqZWN0S2V5LCBvYmplY3RWYWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKCF3cml0ZU5vZGUoc3RhdGUsIGxldmVsICsgMSwgb2JqZWN0S2V5LCB0cnVlLCB0cnVlLCB0cnVlKSkge1xuICAgICAgY29udGludWU7IC8vIFNraXAgdGhpcyBwYWlyIGJlY2F1c2Ugb2YgaW52YWxpZCBrZXkuXG4gICAgfVxuXG4gICAgZXhwbGljaXRQYWlyID0gKHN0YXRlLnRhZyAhPT0gbnVsbCAmJiBzdGF0ZS50YWcgIT09ICc/JykgfHxcbiAgICAgICAgICAgICAgICAgICAoc3RhdGUuZHVtcCAmJiBzdGF0ZS5kdW1wLmxlbmd0aCA+IDEwMjQpO1xuXG4gICAgaWYgKGV4cGxpY2l0UGFpcikge1xuICAgICAgaWYgKHN0YXRlLmR1bXAgJiYgQ0hBUl9MSU5FX0ZFRUQgPT09IHN0YXRlLmR1bXAuY2hhckNvZGVBdCgwKSkge1xuICAgICAgICBwYWlyQnVmZmVyICs9ICc/JztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhaXJCdWZmZXIgKz0gJz8gJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBwYWlyQnVmZmVyICs9IHN0YXRlLmR1bXA7XG5cbiAgICBpZiAoZXhwbGljaXRQYWlyKSB7XG4gICAgICBwYWlyQnVmZmVyICs9IGdlbmVyYXRlTmV4dExpbmUoc3RhdGUsIGxldmVsKTtcbiAgICB9XG5cbiAgICBpZiAoIXdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwgKyAxLCBvYmplY3RWYWx1ZSwgdHJ1ZSwgZXhwbGljaXRQYWlyKSkge1xuICAgICAgY29udGludWU7IC8vIFNraXAgdGhpcyBwYWlyIGJlY2F1c2Ugb2YgaW52YWxpZCB2YWx1ZS5cbiAgICB9XG5cbiAgICBpZiAoc3RhdGUuZHVtcCAmJiBDSEFSX0xJTkVfRkVFRCA9PT0gc3RhdGUuZHVtcC5jaGFyQ29kZUF0KDApKSB7XG4gICAgICBwYWlyQnVmZmVyICs9ICc6JztcbiAgICB9IGVsc2Uge1xuICAgICAgcGFpckJ1ZmZlciArPSAnOiAnO1xuICAgIH1cblxuICAgIHBhaXJCdWZmZXIgKz0gc3RhdGUuZHVtcDtcblxuICAgIC8vIEJvdGgga2V5IGFuZCB2YWx1ZSBhcmUgdmFsaWQuXG4gICAgX3Jlc3VsdCArPSBwYWlyQnVmZmVyO1xuICB9XG5cbiAgc3RhdGUudGFnID0gX3RhZztcbiAgc3RhdGUuZHVtcCA9IF9yZXN1bHQgfHwgJ3t9JzsgLy8gRW1wdHkgbWFwcGluZyBpZiBubyB2YWxpZCBwYWlycy5cbn1cblxuZnVuY3Rpb24gZGV0ZWN0VHlwZShzdGF0ZSwgb2JqZWN0LCBleHBsaWNpdCkge1xuICB2YXIgX3Jlc3VsdCwgdHlwZUxpc3QsIGluZGV4LCBsZW5ndGgsIHR5cGUsIHN0eWxlO1xuXG4gIHR5cGVMaXN0ID0gZXhwbGljaXQgPyBzdGF0ZS5leHBsaWNpdFR5cGVzIDogc3RhdGUuaW1wbGljaXRUeXBlcztcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gdHlwZUxpc3QubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHR5cGUgPSB0eXBlTGlzdFtpbmRleF07XG5cbiAgICBpZiAoKHR5cGUuaW5zdGFuY2VPZiAgfHwgdHlwZS5wcmVkaWNhdGUpICYmXG4gICAgICAgICghdHlwZS5pbnN0YW5jZU9mIHx8ICgodHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcpICYmIChvYmplY3QgaW5zdGFuY2VvZiB0eXBlLmluc3RhbmNlT2YpKSkgJiZcbiAgICAgICAgKCF0eXBlLnByZWRpY2F0ZSAgfHwgdHlwZS5wcmVkaWNhdGUob2JqZWN0KSkpIHtcblxuICAgICAgaWYgKGV4cGxpY2l0KSB7XG4gICAgICAgIGlmICh0eXBlLm11bHRpICYmIHR5cGUucmVwcmVzZW50TmFtZSkge1xuICAgICAgICAgIHN0YXRlLnRhZyA9IHR5cGUucmVwcmVzZW50TmFtZShvYmplY3QpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0YXRlLnRhZyA9IHR5cGUudGFnO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS50YWcgPSAnPyc7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlLnJlcHJlc2VudCkge1xuICAgICAgICBzdHlsZSA9IHN0YXRlLnN0eWxlTWFwW3R5cGUudGFnXSB8fCB0eXBlLmRlZmF1bHRTdHlsZTtcblxuICAgICAgICBpZiAoX3RvU3RyaW5nLmNhbGwodHlwZS5yZXByZXNlbnQpID09PSAnW29iamVjdCBGdW5jdGlvbl0nKSB7XG4gICAgICAgICAgX3Jlc3VsdCA9IHR5cGUucmVwcmVzZW50KG9iamVjdCwgc3R5bGUpO1xuICAgICAgICB9IGVsc2UgaWYgKF9oYXNPd25Qcm9wZXJ0eS5jYWxsKHR5cGUucmVwcmVzZW50LCBzdHlsZSkpIHtcbiAgICAgICAgICBfcmVzdWx0ID0gdHlwZS5yZXByZXNlbnRbc3R5bGVdKG9iamVjdCwgc3R5bGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBleGNlcHRpb24oJyE8JyArIHR5cGUudGFnICsgJz4gdGFnIHJlc29sdmVyIGFjY2VwdHMgbm90IFwiJyArIHN0eWxlICsgJ1wiIHN0eWxlJyk7XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5kdW1wID0gX3Jlc3VsdDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBTZXJpYWxpemVzIGBvYmplY3RgIGFuZCB3cml0ZXMgaXQgdG8gZ2xvYmFsIGByZXN1bHRgLlxuLy8gUmV0dXJucyB0cnVlIG9uIHN1Y2Nlc3MsIG9yIGZhbHNlIG9uIGludmFsaWQgb2JqZWN0LlxuLy9cbmZ1bmN0aW9uIHdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwsIG9iamVjdCwgYmxvY2ssIGNvbXBhY3QsIGlza2V5LCBpc2Jsb2Nrc2VxKSB7XG4gIHN0YXRlLnRhZyA9IG51bGw7XG4gIHN0YXRlLmR1bXAgPSBvYmplY3Q7XG5cbiAgaWYgKCFkZXRlY3RUeXBlKHN0YXRlLCBvYmplY3QsIGZhbHNlKSkge1xuICAgIGRldGVjdFR5cGUoc3RhdGUsIG9iamVjdCwgdHJ1ZSk7XG4gIH1cblxuICB2YXIgdHlwZSA9IF90b1N0cmluZy5jYWxsKHN0YXRlLmR1bXApO1xuICB2YXIgaW5ibG9jayA9IGJsb2NrO1xuICB2YXIgdGFnU3RyO1xuXG4gIGlmIChibG9jaykge1xuICAgIGJsb2NrID0gKHN0YXRlLmZsb3dMZXZlbCA8IDAgfHwgc3RhdGUuZmxvd0xldmVsID4gbGV2ZWwpO1xuICB9XG5cbiAgdmFyIG9iamVjdE9yQXJyYXkgPSB0eXBlID09PSAnW29iamVjdCBPYmplY3RdJyB8fCB0eXBlID09PSAnW29iamVjdCBBcnJheV0nLFxuICAgICAgZHVwbGljYXRlSW5kZXgsXG4gICAgICBkdXBsaWNhdGU7XG5cbiAgaWYgKG9iamVjdE9yQXJyYXkpIHtcbiAgICBkdXBsaWNhdGVJbmRleCA9IHN0YXRlLmR1cGxpY2F0ZXMuaW5kZXhPZihvYmplY3QpO1xuICAgIGR1cGxpY2F0ZSA9IGR1cGxpY2F0ZUluZGV4ICE9PSAtMTtcbiAgfVxuXG4gIGlmICgoc3RhdGUudGFnICE9PSBudWxsICYmIHN0YXRlLnRhZyAhPT0gJz8nKSB8fCBkdXBsaWNhdGUgfHwgKHN0YXRlLmluZGVudCAhPT0gMiAmJiBsZXZlbCA+IDApKSB7XG4gICAgY29tcGFjdCA9IGZhbHNlO1xuICB9XG5cbiAgaWYgKGR1cGxpY2F0ZSAmJiBzdGF0ZS51c2VkRHVwbGljYXRlc1tkdXBsaWNhdGVJbmRleF0pIHtcbiAgICBzdGF0ZS5kdW1wID0gJypyZWZfJyArIGR1cGxpY2F0ZUluZGV4O1xuICB9IGVsc2Uge1xuICAgIGlmIChvYmplY3RPckFycmF5ICYmIGR1cGxpY2F0ZSAmJiAhc3RhdGUudXNlZER1cGxpY2F0ZXNbZHVwbGljYXRlSW5kZXhdKSB7XG4gICAgICBzdGF0ZS51c2VkRHVwbGljYXRlc1tkdXBsaWNhdGVJbmRleF0gPSB0cnVlO1xuICAgIH1cbiAgICBpZiAodHlwZSA9PT0gJ1tvYmplY3QgT2JqZWN0XScpIHtcbiAgICAgIGlmIChibG9jayAmJiAoT2JqZWN0LmtleXMoc3RhdGUuZHVtcCkubGVuZ3RoICE9PSAwKSkge1xuICAgICAgICB3cml0ZUJsb2NrTWFwcGluZyhzdGF0ZSwgbGV2ZWwsIHN0YXRlLmR1bXAsIGNvbXBhY3QpO1xuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgc3RhdGUuZHVtcCA9ICcmcmVmXycgKyBkdXBsaWNhdGVJbmRleCArIHN0YXRlLmR1bXA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdyaXRlRmxvd01hcHBpbmcoc3RhdGUsIGxldmVsLCBzdGF0ZS5kdW1wKTtcbiAgICAgICAgaWYgKGR1cGxpY2F0ZSkge1xuICAgICAgICAgIHN0YXRlLmR1bXAgPSAnJnJlZl8nICsgZHVwbGljYXRlSW5kZXggKyAnICcgKyBzdGF0ZS5kdW1wO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICBpZiAoYmxvY2sgJiYgKHN0YXRlLmR1bXAubGVuZ3RoICE9PSAwKSkge1xuICAgICAgICBpZiAoc3RhdGUubm9BcnJheUluZGVudCAmJiAhaXNibG9ja3NlcSAmJiBsZXZlbCA+IDApIHtcbiAgICAgICAgICB3cml0ZUJsb2NrU2VxdWVuY2Uoc3RhdGUsIGxldmVsIC0gMSwgc3RhdGUuZHVtcCwgY29tcGFjdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgd3JpdGVCbG9ja1NlcXVlbmNlKHN0YXRlLCBsZXZlbCwgc3RhdGUuZHVtcCwgY29tcGFjdCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGR1cGxpY2F0ZSkge1xuICAgICAgICAgIHN0YXRlLmR1bXAgPSAnJnJlZl8nICsgZHVwbGljYXRlSW5kZXggKyBzdGF0ZS5kdW1wO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3cml0ZUZsb3dTZXF1ZW5jZShzdGF0ZSwgbGV2ZWwsIHN0YXRlLmR1bXApO1xuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgc3RhdGUuZHVtcCA9ICcmcmVmXycgKyBkdXBsaWNhdGVJbmRleCArICcgJyArIHN0YXRlLmR1bXA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdbb2JqZWN0IFN0cmluZ10nKSB7XG4gICAgICBpZiAoc3RhdGUudGFnICE9PSAnPycpIHtcbiAgICAgICAgd3JpdGVTY2FsYXIoc3RhdGUsIHN0YXRlLmR1bXAsIGxldmVsLCBpc2tleSwgaW5ibG9jayk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnW29iamVjdCBVbmRlZmluZWRdJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoc3RhdGUuc2tpcEludmFsaWQpIHJldHVybiBmYWxzZTtcbiAgICAgIHRocm93IG5ldyBleGNlcHRpb24oJ3VuYWNjZXB0YWJsZSBraW5kIG9mIGFuIG9iamVjdCB0byBkdW1wICcgKyB0eXBlKTtcbiAgICB9XG5cbiAgICBpZiAoc3RhdGUudGFnICE9PSBudWxsICYmIHN0YXRlLnRhZyAhPT0gJz8nKSB7XG4gICAgICAvLyBOZWVkIHRvIGVuY29kZSBhbGwgY2hhcmFjdGVycyBleGNlcHQgdGhvc2UgYWxsb3dlZCBieSB0aGUgc3BlYzpcbiAgICAgIC8vXG4gICAgICAvLyBbMzVdIG5zLWRlYy1kaWdpdCAgICA6Oj0gIFsjeDMwLSN4MzldIC8qIDAtOSAqL1xuICAgICAgLy8gWzM2XSBucy1oZXgtZGlnaXQgICAgOjo9ICBucy1kZWMtZGlnaXRcbiAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgIHwgWyN4NDEtI3g0Nl0gLyogQS1GICovIHwgWyN4NjEtI3g2Nl0gLyogYS1mICovXG4gICAgICAvLyBbMzddIG5zLWFzY2lpLWxldHRlciA6Oj0gIFsjeDQxLSN4NUFdIC8qIEEtWiAqLyB8IFsjeDYxLSN4N0FdIC8qIGEteiAqL1xuICAgICAgLy8gWzM4XSBucy13b3JkLWNoYXIgICAgOjo9ICBucy1kZWMtZGlnaXQgfCBucy1hc2NpaS1sZXR0ZXIgfCBcdTIwMUMtXHUyMDFEXG4gICAgICAvLyBbMzldIG5zLXVyaS1jaGFyICAgICA6Oj0gIFx1MjAxQyVcdTIwMUQgbnMtaGV4LWRpZ2l0IG5zLWhleC1kaWdpdCB8IG5zLXdvcmQtY2hhciB8IFx1MjAxQyNcdTIwMURcbiAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgIHwgXHUyMDFDO1x1MjAxRCB8IFx1MjAxQy9cdTIwMUQgfCBcdTIwMUM/XHUyMDFEIHwgXHUyMDFDOlx1MjAxRCB8IFx1MjAxQ0BcdTIwMUQgfCBcdTIwMUMmXHUyMDFEIHwgXHUyMDFDPVx1MjAxRCB8IFx1MjAxQytcdTIwMUQgfCBcdTIwMUMkXHUyMDFEIHwgXHUyMDFDLFx1MjAxRFxuICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgfCBcdTIwMUNfXHUyMDFEIHwgXHUyMDFDLlx1MjAxRCB8IFx1MjAxQyFcdTIwMUQgfCBcdTIwMUN+XHUyMDFEIHwgXHUyMDFDKlx1MjAxRCB8IFx1MjAxQydcdTIwMUQgfCBcdTIwMUMoXHUyMDFEIHwgXHUyMDFDKVx1MjAxRCB8IFx1MjAxQ1tcdTIwMUQgfCBcdTIwMUNdXHUyMDFEXG4gICAgICAvL1xuICAgICAgLy8gQWxzbyBuZWVkIHRvIGVuY29kZSAnIScgYmVjYXVzZSBpdCBoYXMgc3BlY2lhbCBtZWFuaW5nIChlbmQgb2YgdGFnIHByZWZpeCkuXG4gICAgICAvL1xuICAgICAgdGFnU3RyID0gZW5jb2RlVVJJKFxuICAgICAgICBzdGF0ZS50YWdbMF0gPT09ICchJyA/IHN0YXRlLnRhZy5zbGljZSgxKSA6IHN0YXRlLnRhZ1xuICAgICAgKS5yZXBsYWNlKC8hL2csICclMjEnKTtcblxuICAgICAgaWYgKHN0YXRlLnRhZ1swXSA9PT0gJyEnKSB7XG4gICAgICAgIHRhZ1N0ciA9ICchJyArIHRhZ1N0cjtcbiAgICAgIH0gZWxzZSBpZiAodGFnU3RyLnNsaWNlKDAsIDE4KSA9PT0gJ3RhZzp5YW1sLm9yZywyMDAyOicpIHtcbiAgICAgICAgdGFnU3RyID0gJyEhJyArIHRhZ1N0ci5zbGljZSgxOCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YWdTdHIgPSAnITwnICsgdGFnU3RyICsgJz4nO1xuICAgICAgfVxuXG4gICAgICBzdGF0ZS5kdW1wID0gdGFnU3RyICsgJyAnICsgc3RhdGUuZHVtcDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZ2V0RHVwbGljYXRlUmVmZXJlbmNlcyhvYmplY3QsIHN0YXRlKSB7XG4gIHZhciBvYmplY3RzID0gW10sXG4gICAgICBkdXBsaWNhdGVzSW5kZXhlcyA9IFtdLFxuICAgICAgaW5kZXgsXG4gICAgICBsZW5ndGg7XG5cbiAgaW5zcGVjdE5vZGUob2JqZWN0LCBvYmplY3RzLCBkdXBsaWNhdGVzSW5kZXhlcyk7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IGR1cGxpY2F0ZXNJbmRleGVzLmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICBzdGF0ZS5kdXBsaWNhdGVzLnB1c2gob2JqZWN0c1tkdXBsaWNhdGVzSW5kZXhlc1tpbmRleF1dKTtcbiAgfVxuICBzdGF0ZS51c2VkRHVwbGljYXRlcyA9IG5ldyBBcnJheShsZW5ndGgpO1xufVxuXG5mdW5jdGlvbiBpbnNwZWN0Tm9kZShvYmplY3QsIG9iamVjdHMsIGR1cGxpY2F0ZXNJbmRleGVzKSB7XG4gIHZhciBvYmplY3RLZXlMaXN0LFxuICAgICAgaW5kZXgsXG4gICAgICBsZW5ndGg7XG5cbiAgaWYgKG9iamVjdCAhPT0gbnVsbCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0Jykge1xuICAgIGluZGV4ID0gb2JqZWN0cy5pbmRleE9mKG9iamVjdCk7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgaWYgKGR1cGxpY2F0ZXNJbmRleGVzLmluZGV4T2YoaW5kZXgpID09PSAtMSkge1xuICAgICAgICBkdXBsaWNhdGVzSW5kZXhlcy5wdXNoKGluZGV4KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0cy5wdXNoKG9iamVjdCk7XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdCkpIHtcbiAgICAgICAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgICAgICAgaW5zcGVjdE5vZGUob2JqZWN0W2luZGV4XSwgb2JqZWN0cywgZHVwbGljYXRlc0luZGV4ZXMpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmplY3RLZXlMaXN0ID0gT2JqZWN0LmtleXMob2JqZWN0KTtcblxuICAgICAgICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0S2V5TGlzdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgICAgICAgaW5zcGVjdE5vZGUob2JqZWN0W29iamVjdEtleUxpc3RbaW5kZXhdXSwgb2JqZWN0cywgZHVwbGljYXRlc0luZGV4ZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGR1bXAkMShpbnB1dCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgc3RhdGUgPSBuZXcgU3RhdGUob3B0aW9ucyk7XG5cbiAgaWYgKCFzdGF0ZS5ub1JlZnMpIGdldER1cGxpY2F0ZVJlZmVyZW5jZXMoaW5wdXQsIHN0YXRlKTtcblxuICB2YXIgdmFsdWUgPSBpbnB1dDtcblxuICBpZiAoc3RhdGUucmVwbGFjZXIpIHtcbiAgICB2YWx1ZSA9IHN0YXRlLnJlcGxhY2VyLmNhbGwoeyAnJzogdmFsdWUgfSwgJycsIHZhbHVlKTtcbiAgfVxuXG4gIGlmICh3cml0ZU5vZGUoc3RhdGUsIDAsIHZhbHVlLCB0cnVlLCB0cnVlKSkgcmV0dXJuIHN0YXRlLmR1bXAgKyAnXFxuJztcblxuICByZXR1cm4gJyc7XG59XG5cbnZhciBkdW1wXzEgPSBkdW1wJDE7XG5cbnZhciBkdW1wZXIgPSB7XG5cdGR1bXA6IGR1bXBfMVxufTtcblxuZnVuY3Rpb24gcmVuYW1lZChmcm9tLCB0bykge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignRnVuY3Rpb24geWFtbC4nICsgZnJvbSArICcgaXMgcmVtb3ZlZCBpbiBqcy15YW1sIDQuICcgK1xuICAgICAgJ1VzZSB5YW1sLicgKyB0byArICcgaW5zdGVhZCwgd2hpY2ggaXMgbm93IHNhZmUgYnkgZGVmYXVsdC4nKTtcbiAgfTtcbn1cblxuXG52YXIgVHlwZSAgICAgICAgICAgICAgICA9IHR5cGU7XG52YXIgU2NoZW1hICAgICAgICAgICAgICA9IHNjaGVtYTtcbnZhciBGQUlMU0FGRV9TQ0hFTUEgICAgID0gZmFpbHNhZmU7XG52YXIgSlNPTl9TQ0hFTUEgICAgICAgICA9IGpzb247XG52YXIgQ09SRV9TQ0hFTUEgICAgICAgICA9IGNvcmU7XG52YXIgREVGQVVMVF9TQ0hFTUEgICAgICA9IF9kZWZhdWx0O1xudmFyIGxvYWQgICAgICAgICAgICAgICAgPSBsb2FkZXIubG9hZDtcbnZhciBsb2FkQWxsICAgICAgICAgICAgID0gbG9hZGVyLmxvYWRBbGw7XG52YXIgZHVtcCAgICAgICAgICAgICAgICA9IGR1bXBlci5kdW1wO1xudmFyIFlBTUxFeGNlcHRpb24gICAgICAgPSBleGNlcHRpb247XG5cbi8vIFJlLWV4cG9ydCBhbGwgdHlwZXMgaW4gY2FzZSB1c2VyIHdhbnRzIHRvIGNyZWF0ZSBjdXN0b20gc2NoZW1hXG52YXIgdHlwZXMgPSB7XG4gIGJpbmFyeTogICAgYmluYXJ5LFxuICBmbG9hdDogICAgIGZsb2F0LFxuICBtYXA6ICAgICAgIG1hcCxcbiAgbnVsbDogICAgICBfbnVsbCxcbiAgcGFpcnM6ICAgICBwYWlycyxcbiAgc2V0OiAgICAgICBzZXQsXG4gIHRpbWVzdGFtcDogdGltZXN0YW1wLFxuICBib29sOiAgICAgIGJvb2wsXG4gIGludDogICAgICAgaW50LFxuICBtZXJnZTogICAgIG1lcmdlLFxuICBvbWFwOiAgICAgIG9tYXAsXG4gIHNlcTogICAgICAgc2VxLFxuICBzdHI6ICAgICAgIHN0clxufTtcblxuLy8gUmVtb3ZlZCBmdW5jdGlvbnMgZnJvbSBKUy1ZQU1MIDMuMC54XG52YXIgc2FmZUxvYWQgICAgICAgICAgICA9IHJlbmFtZWQoJ3NhZmVMb2FkJywgJ2xvYWQnKTtcbnZhciBzYWZlTG9hZEFsbCAgICAgICAgID0gcmVuYW1lZCgnc2FmZUxvYWRBbGwnLCAnbG9hZEFsbCcpO1xudmFyIHNhZmVEdW1wICAgICAgICAgICAgPSByZW5hbWVkKCdzYWZlRHVtcCcsICdkdW1wJyk7XG5cbnZhciBqc1lhbWwgPSB7XG5cdFR5cGU6IFR5cGUsXG5cdFNjaGVtYTogU2NoZW1hLFxuXHRGQUlMU0FGRV9TQ0hFTUE6IEZBSUxTQUZFX1NDSEVNQSxcblx0SlNPTl9TQ0hFTUE6IEpTT05fU0NIRU1BLFxuXHRDT1JFX1NDSEVNQTogQ09SRV9TQ0hFTUEsXG5cdERFRkFVTFRfU0NIRU1BOiBERUZBVUxUX1NDSEVNQSxcblx0bG9hZDogbG9hZCxcblx0bG9hZEFsbDogbG9hZEFsbCxcblx0ZHVtcDogZHVtcCxcblx0WUFNTEV4Y2VwdGlvbjogWUFNTEV4Y2VwdGlvbixcblx0dHlwZXM6IHR5cGVzLFxuXHRzYWZlTG9hZDogc2FmZUxvYWQsXG5cdHNhZmVMb2FkQWxsOiBzYWZlTG9hZEFsbCxcblx0c2FmZUR1bXA6IHNhZmVEdW1wXG59O1xuXG5leHBvcnQgeyBDT1JFX1NDSEVNQSwgREVGQVVMVF9TQ0hFTUEsIEZBSUxTQUZFX1NDSEVNQSwgSlNPTl9TQ0hFTUEsIFNjaGVtYSwgVHlwZSwgWUFNTEV4Y2VwdGlvbiwganNZYW1sIGFzIGRlZmF1bHQsIGR1bXAsIGxvYWQsIGxvYWRBbGwsIHNhZmVEdW1wLCBzYWZlTG9hZCwgc2FmZUxvYWRBbGwsIHR5cGVzIH07XG4iLCAiLyoqXG4gKiBOb2RlLmpzLXNwZWNpZmljIHZhbGlkYXRpb24gaGVscGVycy5cbiAqXG4gKiBAbW9kdWxlIG5vZGVcbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzJztcbmltcG9ydCAqIGFzIGZzUHJvbWlzZXMgZnJvbSAnbm9kZTpmcy9wcm9taXNlcyc7XG5pbXBvcnQge1xuICB2YWxpZGF0ZUlzc3VlUmVwb0ludGVncml0eSBhcyBjb3JlVmFsaWRhdGVJc3N1ZVJlcG9JbnRlZ3JpdHksXG4gIHZhbGlkYXRlSXNzdWVSZXBvSW50ZWdyaXR5QXN5bmMgYXMgY29yZVZhbGlkYXRlSXNzdWVSZXBvSW50ZWdyaXR5QXN5bmNcbn0gZnJvbSAnLi9pbnRlZ3JpdHkuanMnO1xuaW1wb3J0IHR5cGUgeyBWYWxpZGF0aW9uUmVzdWx0IH0gZnJvbSAnLi90eXBlcy5qcyc7XG5cbi8qKlxuICogSW50ZXJmYWNlIGZvciBOb2RlLmpzIHZhbGlkYXRpb24gaGVscGVycyB0aGF0IHVzZSByZWFsIGZpbGVzeXN0ZW0gYWNjZXNzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5vZGVWYWxpZGF0b3Ige1xuICAvKipcbiAgICogVmFsaWRhdGVzIHRoZSBpbnRlZ3JpdHkgb2YgYW4gaXNzdWUgcmVwb3NpdG9yeSB1c2luZyByZWFsIGZpbGVzeXN0ZW0gY2hlY2tzLlxuICAgKlxuICAgKiBAcGFyYW0gcmVwb1BhdGggLSBQYXRoIHRvIHRoZSBpc3N1ZSByZXBvc2l0b3J5XG4gICAqIEByZXR1cm5zIFZhbGlkYXRpb25SZXN1bHQgaW5kaWNhdGluZyBzdWNjZXNzIG9yIGZhaWx1cmUgd2l0aCBlcnJvcnNcbiAgICovXG4gIHZhbGlkYXRlSXNzdWVSZXBvSW50ZWdyaXR5KHJlcG9QYXRoOiBzdHJpbmcpOiBWYWxpZGF0aW9uUmVzdWx0O1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBOb2RlVmFsaWRhdG9yIHRoYXQgYmluZHMgZnMuZXhpc3RzU3luYyBhbmQgZnMucmVhZEZpbGVTeW5jIGF1dG9tYXRpY2FsbHkuXG4gKlxuICogVGhpcyBoZWxwZXIgcHJvdmlkZXMgYSBjb252ZW5pZW50IHdyYXBwZXIgZm9yIE5vZGUuanMgZW52aXJvbm1lbnRzXG4gKiB3aGVyZSBmaWxlc3lzdGVtIGFjY2VzcyBpcyBhdmFpbGFibGUuXG4gKlxuICogQHJldHVybnMgQSBOb2RlVmFsaWRhdG9yIGluc3RhbmNlIHdpdGggZmlsZXN5c3RlbSBiaW5kaW5nc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTm9kZVZhbGlkYXRvcigpOiBOb2RlVmFsaWRhdG9yIHtcbiAgcmV0dXJuIHtcbiAgICB2YWxpZGF0ZUlzc3VlUmVwb0ludGVncml0eShyZXBvUGF0aDogc3RyaW5nKTogVmFsaWRhdGlvblJlc3VsdCB7XG4gICAgICByZXR1cm4gY29yZVZhbGlkYXRlSXNzdWVSZXBvSW50ZWdyaXR5KHJlcG9QYXRoLCBmcy5leGlzdHNTeW5jLCAoZmlsZVBhdGg6IHN0cmluZykgPT5cbiAgICAgICAgZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmLTgnKVxuICAgICAgKTtcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogSW50ZXJmYWNlIGZvciBhc3luYyBOb2RlLmpzIHZhbGlkYXRpb24gaGVscGVycy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBc3luY05vZGVWYWxpZGF0b3Ige1xuICAvKipcbiAgICogVmFsaWRhdGVzIHRoZSBpbnRlZ3JpdHkgb2YgYW4gaXNzdWUgcmVwb3NpdG9yeSB1c2luZyBhc3luYyBmaWxlc3lzdGVtIGNoZWNrcy5cbiAgICpcbiAgICogQHBhcmFtIHJlcG9QYXRoIC0gUGF0aCB0byB0aGUgaXNzdWUgcmVwb3NpdG9yeVxuICAgKiBAcmV0dXJucyBQcm9taXNlPFZhbGlkYXRpb25SZXN1bHQ+IGluZGljYXRpbmcgc3VjY2VzcyBvciBmYWlsdXJlIHdpdGggZXJyb3JzXG4gICAqL1xuICB2YWxpZGF0ZUlzc3VlUmVwb0ludGVncml0eUFzeW5jKHJlcG9QYXRoOiBzdHJpbmcpOiBQcm9taXNlPFZhbGlkYXRpb25SZXN1bHQ+O1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gQXN5bmNOb2RlVmFsaWRhdG9yIHRoYXQgYmluZHMgZnMucHJvbWlzZXMgYXV0b21hdGljYWxseS5cbiAqXG4gKiBUaGlzIGhlbHBlciBwcm92aWRlcyBhIGNvbnZlbmllbnQgd3JhcHBlciBmb3IgTm9kZS5qcyBlbnZpcm9ubWVudHNcbiAqIHdoZXJlIGFzeW5jIGZpbGVzeXN0ZW0gYWNjZXNzIGlzIGF2YWlsYWJsZS5cbiAqXG4gKiBAcmV0dXJucyBBbiBBc3luY05vZGVWYWxpZGF0b3IgaW5zdGFuY2Ugd2l0aCBhc3luYyBmaWxlc3lzdGVtIGJpbmRpbmdzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVBc3luY05vZGVWYWxpZGF0b3IoKTogQXN5bmNOb2RlVmFsaWRhdG9yIHtcbiAgcmV0dXJuIHtcbiAgICBhc3luYyB2YWxpZGF0ZUlzc3VlUmVwb0ludGVncml0eUFzeW5jKHJlcG9QYXRoOiBzdHJpbmcpOiBQcm9taXNlPFZhbGlkYXRpb25SZXN1bHQ+IHtcbiAgICAgIHJldHVybiBjb3JlVmFsaWRhdGVJc3N1ZVJlcG9JbnRlZ3JpdHlBc3luYyhcbiAgICAgICAgcmVwb1BhdGgsXG4gICAgICAgIGFzeW5jIChwYXRoKSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IGZzUHJvbWlzZXMuYWNjZXNzKHBhdGgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAocGF0aCkgPT4gZnNQcm9taXNlcy5yZWFkRmlsZShwYXRoLCAndXRmLTgnKVxuICAgICAgKTtcbiAgICB9XG4gIH07XG59XG4iLCAicHJvY2Vzcy5lbnZbJ0NMQVVERV9DT0RFX0hPT0tTX0NMSV9MT0dfRklMRSddID0gXCIvdG1wL2hvb2tzLXYyLmxvZ1wiO1xuXG5pbXBvcnQgaG9vayBmcm9tICcvd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWxpc3Qtd2Vidmlldy9wYWNrYWdlcy9pc3N1ZXMvY2xhdWRlLWNvZGUtY2xpLWhvb2tzL3NyYy9wb3N0LXRvb2wtdXNlLWVkaXQudHMnO1xuaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJy93b3Jrc3BhY2UvLndvcmt0cmVlcy9pc3N1ZXMtdjItbGlzdC13ZWJ2aWV3L25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9ydW50aW1lLmpzJztcblxuZXhlY3V0ZShob29rKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBQSxTQUFTLFlBQUFBLGlCQUFnQjs7O0FDa0N6QixZQUFZLFFBQVE7QUFNYixJQUFNLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLM0IsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1iLFVBQVU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS1YsUUFBUTtBQUNaO0FBa0NPLFNBQVMsaUJBQWlCO0FBQzdCLFNBQU8sUUFBUSxJQUFJLGdCQUFnQixRQUFRO0FBQy9DO0FBOENPLFNBQVMsY0FBYyxNQUFNLE9BQU87QUFDdkMsUUFBTSxVQUFVLGVBQWU7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TSxtQkFBbUIsT0FBTyx3Q0FDMUIsS0FBSyx5Q0FBeUM7QUFBQSxFQUNoRTtBQUNGO0FBU0EsSUFBSSxPQUFzQixPQUFPO0FBQ2pDLElBQUksVUFBc0IsT0FBTztBQUNqQyxJQUFJLE9BQXNCLE9BQU87QUFxQmpDLElBQUksV0FBc0IsUUFBUSxZQUFZLE1BQU07QUFDcEQsSUFBSSxjQUFzQixRQUFRLGVBQWUsU0FBUztBQUMxRCxJQUFJLFdBQXNCLFFBQVEsWUFBWSxNQUFNOzs7QUN0dkhwRCxZQUFZSSxTQUFRO0FBQ3BCLFlBQVksZ0JBQWdCOzs7QVRINUIsSUFBTyw2QkFBUSxnQkFBZ0IsRUFBRSxTQUFTLHVCQUF1QixHQUFHLE9BQU8sT0FBTyxFQUFFLFFBQUFDLFFBQU8sTUFBTTtBQUMvRixRQUFNLFdBQVcsWUFBWSxLQUFLO0FBQ2xDLE1BQUksQ0FBQyxTQUFVLFFBQU8sa0JBQWtCLENBQUMsQ0FBQztBQUcxQyxRQUFNLGFBQWEsU0FBUyxTQUFTLFNBQVMsS0FBSyxTQUFTLFNBQVMsT0FBTztBQUU1RSxNQUFJLENBQUMsWUFBWTtBQUNmLFdBQU8sa0JBQWtCLENBQUMsQ0FBQztBQUFBLEVBQzdCO0FBRUEsTUFBSTtBQUNGLFVBQU0sVUFBVSxNQUFNQyxVQUFTLFVBQVUsT0FBTztBQUVoRCxRQUFJLFlBQVk7QUFDZCxZQUFNLE9BQU8sS0FBSyxNQUFNLE9BQU87QUFDL0IsWUFBTSxTQUFTLGFBQWEsSUFBSTtBQUNoQyxVQUFJLENBQUMsT0FBTyxPQUFPO0FBQ2pCLGVBQU8sa0JBQWtCO0FBQUEsVUFDdkIsZUFBZSwyQkFBMkIsT0FBTyxPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssSUFBSSxDQUFDO0FBQUEsUUFDMUYsQ0FBQztBQUFBLE1BQ0g7QUFBQSxJQUNGO0FBRUEsV0FBTyxrQkFBa0I7QUFBQSxNQUN2QixlQUFlLGNBQWMsUUFBUTtBQUFBLElBQ3ZDLENBQUM7QUFBQSxFQUNILFNBQVMsT0FBTztBQUVkLFFBQUksaUJBQWlCLGFBQWE7QUFDaEMsYUFBTyxrQkFBa0I7QUFBQSxRQUN2QixlQUFlLDhCQUE4QixNQUFNLE9BQU87QUFBQSxNQUM1RCxDQUFDO0FBQUEsSUFDSDtBQUNBLElBQUFELFFBQU8sS0FBSyxvQkFBb0IsRUFBRSxPQUFPLE9BQU8sS0FBSyxFQUFFLENBQUM7QUFDeEQsV0FBTyxrQkFBa0IsQ0FBQyxDQUFDO0FBQUEsRUFDN0I7QUFDRixDQUFDOzs7QVV6Q0QsUUFBUSxJQUFJLGdDQUFnQyxJQUFJO0FBS2hELFFBQVEsMEJBQUk7IiwKICAibmFtZXMiOiBbInJlYWRGaWxlIiwgInNjaGVtYSIsICJpc09iamVjdCIsICJleGNlcHRpb24iLCAibWFwIiwgInNjaGVtYSIsICJ0eXBlIiwgImV4dGVuZCIsICJzdHIiLCAic3RyaW5nIiwgImZzIiwgImxvZ2dlciIsICJyZWFkRmlsZSJdCn0K
