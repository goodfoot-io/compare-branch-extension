#!/usr/bin/env -S node --enable-source-maps
// src/claude-code-cli/post-tool-use-edit.ts
import { readFile as readFile2 } from "node:fs/promises";

// ../validator/src/adaptive-card.ts
var ADAPTIVE_CARD_STATUSES = ["active", "completed"];
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
    errors.push({ field: "payload.type", message: "payload.type is required", code: "missing_field" });
  } else if (adaptiveCard["type"] !== "AdaptiveCard") {
    errors.push({ field: "payload.type", message: "payload.type must be 'AdaptiveCard'", code: "invalid_type" });
  }
  validateOptionalString(adaptiveCard, "version", "payload", errors);
  const body = validateOptionalArray(adaptiveCard, "body", "payload", errors);
  body?.forEach((element, i) => {
    validateBodyElement(element, `payload.body[${i}]`, errors);
  });
  const actions = validateOptionalArray(adaptiveCard, "actions", "payload", errors);
  actions?.forEach((action, i) => {
    validateAction(action, `payload.actions[${i}]`, errors);
  });
  const schema = adaptiveCard["$schema"];
  if (schema !== void 0 && schema !== null) {
    if (typeof schema !== "string") {
      errors.push({ field: "payload.$schema", message: "payload.$schema must be a string", code: "invalid_type" });
    } else {
      try {
        new URL(schema);
      } catch (error) {
        if (error instanceof TypeError) {
          errors.push({
            field: "payload.$schema",
            message: "payload.$schema must be a valid URL",
            code: "invalid_format"
          });
        } else {
          throw error;
        }
      }
    }
  }
  const minVersion = adaptiveCard["minVersion"];
  if (minVersion !== void 0 && minVersion !== null) {
    if (typeof minVersion !== "string") {
      errors.push({
        field: "payload.minVersion",
        message: "payload.minVersion must be a string",
        code: "invalid_type"
      });
    } else if (!SEMVER_PATTERN.test(minVersion)) {
      errors.push({
        field: "payload.minVersion",
        message: "payload.minVersion must be in semver format (e.g., 1.5 or 1.5.0)",
        code: "invalid_format"
      });
    }
  }
  if (cardStatus === "active" && Array.isArray(actions) && actions.length === 0) {
    errors.push({
      field: "payload.actions",
      message: 'Card with "active" status should have at least one action',
      code: "warning_active_without_actions"
    });
  }
}
function validateAdaptiveCard(card) {
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
  } else if (!ADAPTIVE_CARD_STATUSES.includes(card.status)) {
    errors.push({
      field: "status",
      message: `status must be one of: ${ADAPTIVE_CARD_STATUSES.join(", ")}`,
      code: "invalid_status",
      availableValues: ADAPTIVE_CARD_STATUSES
    });
  }
  if (card.payload === void 0 || card.payload === null) {
    errors.push({ field: "payload", message: "payload is required", code: "missing_field" });
  } else if (!isObject(card.payload)) {
    errors.push({ field: "payload", message: "payload must be an object", code: "invalid_type" });
  } else {
    validateAdaptiveCardSchema(card.payload, card.status, errors);
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

// ../validator/src/node.ts
import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/env.js
import * as fs2 from "node:fs";
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
  fs2.appendFileSync(envFile, exportStatement, "utf-8");
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
import { closeSync, existsSync as existsSync2, mkdirSync, openSync, writeSync } from "node:fs";
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
      if (!existsSync2(dir)) {
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

// src/claude-code-cli/post-tool-use-edit.ts
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
      const result = validateAdaptiveCard(card);
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

// src/claude-code-cli/post-tool-use-edit-entry.ts
process.env["CLAUDE_CODE_HOOKS_CLI_LOG_FILE"] = "/tmp/hooks-cli.log";
execute(post_tool_use_edit_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL2NsYXVkZS1jb2RlLWNsaS9wb3N0LXRvb2wtdXNlLWVkaXQudHMiLCAiLi4vdmFsaWRhdG9yL3NyYy9hZGFwdGl2ZS1jYXJkLnRzIiwgIi4uL3ZhbGlkYXRvci9zcmMvbm9kZS50cyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvZW52LmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9ob29rcy5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvbG9nZ2VyLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9vdXRwdXRzLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9ydW50aW1lLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC90b29sLWhlbHBlcnMuanMiLCAic3JjL2NsYXVkZS1jb2RlLWNsaS9wb3N0LXRvb2wtdXNlLWVkaXQtZW50cnkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogQG1vZHVsZSBAY2FyZHMvY2xhdWRlLWNvZGUtaG9va3MvY2xhdWRlLWNvZGUtY2xpL3Bvc3QtdG9vbC11c2UtZWRpdFxuICpcbiAqIFBvc3RUb29sVXNlIGhvb2sgdGhhdCB2YWxpZGF0ZXMgQWRhcHRpdmUgQ2FyZCBKU09OIGFmdGVyIGVkaXQgdG9vbHMgcnVuLlxuICogSXQgb25seSBpbnNwZWN0cyBwYXRocyB0aGF0IGxvb2sgbGlrZSBjYXJkcyAoY29udGFpbiBgL2NhcmRzL2AgYW5kIGVuZCBpbiBgLmpzb25gKS5cbiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZSB9IGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsgdmFsaWRhdGVBZGFwdGl2ZUNhcmQgfSBmcm9tICdAY2FyZHMvdmFsaWRhdG9yJztcbmltcG9ydCB7IGdldEZpbGVQYXRoLCBwb3N0VG9vbFVzZUhvb2ssIHBvc3RUb29sVXNlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcblxuLyoqXG4gKiBQb3N0VG9vbFVzZSBob29rIGltcGxlbWVudGF0aW9uIHRoYXQgdmFsaWRhdGVzIGNhcmQgSlNPTiBhZnRlciBlZGl0cy5cbiAqXG4gKiBCZWhhdmlvcjpcbiAqIC0gSWYgbm8gZmlsZSBwYXRoIGlzIGF2YWlsYWJsZSwgcmV0dXJucyBlbXB0eSBvdXRwdXQuXG4gKiAtIE5vbi1jYXJkIGZpbGVzIGFyZSBpZ25vcmVkLlxuICogLSBWYWxpZCBjYXJkIEpTT04gcmV0dXJucyBhIFwiVmFsaWRhdGVkXCIgc3lzdGVtTWVzc2FnZS5cbiAqIC0gSW52YWxpZCBKU09OIG9yIHNjaGVtYSBlcnJvcnMgcmV0dXJuIGEgc3lzdGVtTWVzc2FnZSBmb3IgQ2xhdWRlLlxuICogLSBVbmV4cGVjdGVkIGVycm9ycyBhcmUgbG9nZ2VkIGFuZCByZXR1cm4gZW1wdHkgb3V0cHV0LlxuICpcbiAqIFJ1bnRpbWUgZWZmZWN0czogcmVhZHMgdGhlIGVkaXRlZCBmaWxlIGZyb20gZGlzay5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBQb3N0VG9vbFVzZSBob29rIGlucHV0LCB1c2VkIHRvIHJlc29sdmUgdGhlIGVkaXRlZCBmaWxlIHBhdGguXG4gKiBAcGFyYW0gY29udGV4dCAtIEhvb2sgY29udGV4dCBjb250YWluaW5nIGEgbG9nZ2VyLlxuICogQHJldHVybnMgT3V0cHV0IHBheWxvYWQgZm9yIHRoZSBQb3N0VG9vbFVzZSBob29rLlxuICogQHNlZSB2YWxpZGF0ZUFkYXB0aXZlQ2FyZFxuICogQHNlZSBnZXRGaWxlUGF0aFxuICovXG5leHBvcnQgZGVmYXVsdCBwb3N0VG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnV3JpdGV8RWRpdHxNdWx0aUVkaXQnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICBjb25zdCBmaWxlUGF0aCA9IGdldEZpbGVQYXRoKGlucHV0KTtcbiAgaWYgKCFmaWxlUGF0aCkgcmV0dXJuIHBvc3RUb29sVXNlT3V0cHV0KHt9KTtcblxuICAvLyBPbmx5IHZhbGlkYXRlIGNhcmQtcmVsYXRlZCBmaWxlc1xuICBjb25zdCBpc0NhcmRGaWxlID0gZmlsZVBhdGguaW5jbHVkZXMoJy9jYXJkcy8nKSAmJiBmaWxlUGF0aC5lbmRzV2l0aCgnLmpzb24nKTtcblxuICBpZiAoIWlzQ2FyZEZpbGUpIHtcbiAgICByZXR1cm4gcG9zdFRvb2xVc2VPdXRwdXQoe30pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgcmVhZEZpbGUoZmlsZVBhdGgsICd1dGYtOCcpO1xuXG4gICAgaWYgKGlzQ2FyZEZpbGUpIHtcbiAgICAgIGNvbnN0IGNhcmQgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVBZGFwdGl2ZUNhcmQoY2FyZCk7XG4gICAgICBpZiAoIXJlc3VsdC52YWxpZCkge1xuICAgICAgICByZXR1cm4gcG9zdFRvb2xVc2VPdXRwdXQoe1xuICAgICAgICAgIHN5c3RlbU1lc3NhZ2U6IGBDYXJkIHZhbGlkYXRpb24gZmFpbGVkOiAke3Jlc3VsdC5lcnJvcnMubWFwKChlKSA9PiBlLm1lc3NhZ2UpLmpvaW4oJywgJyl9YFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcG9zdFRvb2xVc2VPdXRwdXQoe1xuICAgICAgc3lzdGVtTWVzc2FnZTogYFZhbGlkYXRlZDogJHtmaWxlUGF0aH1gXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gSGFuZGxlIEpTT04gcGFyc2UgZXJyb3JzIGV4cGxpY2l0bHkgZm9yIGNhcmQgZmlsZXNcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBTeW50YXhFcnJvcikge1xuICAgICAgcmV0dXJuIHBvc3RUb29sVXNlT3V0cHV0KHtcbiAgICAgICAgc3lzdGVtTWVzc2FnZTogYEludmFsaWQgSlNPTiBpbiBjYXJkIGZpbGU6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICB9KTtcbiAgICB9XG4gICAgbG9nZ2VyLndhcm4oJ1ZhbGlkYXRpb24gZXJyb3InLCB7IGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgIHJldHVybiBwb3N0VG9vbFVzZU91dHB1dCh7fSk7XG4gIH1cbn0pO1xuIiwgIi8qKlxuICogQWRhcHRpdmUgQ2FyZCBzdHJ1Y3R1cmFsIHZhbGlkYXRpb24gZm9yIENhcmRzIHBheWxvYWRzLlxuICpcbiAqIFRoZSB2YWxpZGF0b3IgZW5mb3JjZXMgcmVxdWlyZWQgZmllbGRzIGFuZCBiYXNpYyBzaGFwZSBjb25zdHJhaW50cyB1c2VkIGJ5XG4gKiB0aGUgQ2FyZHMgVUkuIFVua25vd24gZWxlbWVudCBhbmQgYWN0aW9uIHR5cGVzIGFyZSBhbGxvd2VkIHRvIHByZXNlcnZlXG4gKiBmb3J3YXJkIGNvbXBhdGliaWxpdHkgd2l0aCBuZXdlciBBZGFwdGl2ZSBDYXJkIGZlYXR1cmVzLlxuICpcbiAqIEBtb2R1bGUgYWRhcHRpdmUtY2FyZFxuICovXG5cbmltcG9ydCB0eXBlIHsgRmllbGRWYWxpZGF0aW9uRXJyb3IsIFZhbGlkYXRpb25SZXN1bHQgfSBmcm9tICcuL3R5cGVzLmpzJztcblxuLyoqIExpZmVjeWNsZSBzdGFnZXMgZm9yIGFkYXB0aXZlIGNhcmRzLiBEZWZpbmVkIGxvY2FsbHkgdG8gYXZvaWQgY291cGxpbmcgdG8gQGNhcmRzL3Byb3RvY29sLiAqL1xudHlwZSBBZGFwdGl2ZUNhcmRTdGF0dXMgPSAnYWN0aXZlJyB8ICdjb21wbGV0ZWQnO1xuXG4vKiogRnJvbnRtYXR0ZXIgbWV0YWRhdGEgZm9yIGFuIGFkYXB0aXZlIGNhcmQuIERlZmluZWQgbG9jYWxseSB0byBhdm9pZCBjb3VwbGluZyB0byBAY2FyZHMvcHJvdG9jb2wuICovXG5pbnRlcmZhY2UgQWRhcHRpdmVDYXJkRnJvbnRtYXR0ZXIge1xuICBpZDogc3RyaW5nO1xuICBzdW1tYXJ5OiBzdHJpbmc7XG4gIGF1dGhvcjogc3RyaW5nO1xuICBzdGF0dXM6IEFkYXB0aXZlQ2FyZFN0YXR1cztcbn1cblxuLyoqIEZ1bGwgYWRhcHRpdmUgY2FyZCByZXByZXNlbnRhdGlvbi4gRGVmaW5lZCBsb2NhbGx5IHRvIGF2b2lkIGNvdXBsaW5nIHRvIEBjYXJkcy9wcm90b2NvbC4gKi9cbmludGVyZmFjZSBBZGFwdGl2ZUNhcmQgZXh0ZW5kcyBBZGFwdGl2ZUNhcmRGcm9udG1hdHRlciB7XG4gIHBheWxvYWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBvdXRwdXQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuY29uc3QgQURBUFRJVkVfQ0FSRF9TVEFUVVNFUyA9IFsnYWN0aXZlJywgJ2NvbXBsZXRlZCddIGFzIGNvbnN0IHNhdGlzZmllcyByZWFkb25seSBBZGFwdGl2ZUNhcmRTdGF0dXNbXTtcbmNvbnN0IE1BWF9TVU1NQVJZX0xFTkdUSCA9IDIwMDtcblxuLyoqXG4gKiBOYXJyb3dzIHVua25vd24gdmFsdWVzIHRvIHJlY29yZC1saWtlIG9iamVjdHMgdXNlZCBieSB0aGVzZSB2YWxpZGF0b3JzLlxuICpcbiAqIEFycmF5cyBhbmQgbnVsbCBhcmUgZXhjbHVkZWQgc28gdGhlIHJldHVybmVkIHZhbHVlIGNhbiBiZSBzYWZlbHkgaW5kZXhlZCBieVxuICogc3RyaW5nIGtleXMgd2hlbiBidWlsZGluZyBlcnJvciBwYXRocy5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgLSBWYWx1ZSB0byBwcm9iZS5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiB0aGUgdmFsdWUgY2FuIGJlIHRyZWF0ZWQgYXMgYSBwbGFpbiBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSk7XG59XG5cbi8qKlxuICogUmVjb3JkcyBhIG1pc3Npbmcgb3IgbWlzdHlwZWQgcmVxdWlyZWQgc3RyaW5nIGZpZWxkLlxuICpcbiAqIFRoaXMgaGVscGVyIG9ubHkgYXBwZW5kcyB0byB7QGxpbmsgRmllbGRWYWxpZGF0aW9uRXJyb3J9IGFuZCBuZXZlciB0aHJvd3MuXG4gKiBUaGUgYGNvbnRleHRgIGxhYmVsIGtlZXBzIGVycm9yIG1lc3NhZ2VzIHJlYWRhYmxlIGluc2lkZSBuZXN0ZWQgZWxlbWVudHMuXG4gKlxuICogQHBhcmFtIG9iaiAtIFBhcmVudCBvYmplY3QgdGhhdCBzaG91bGQgY29udGFpbiB0aGUgZmllbGQuXG4gKiBAcGFyYW0gZmllbGQgLSBGaWVsZCBuYW1lIHRvIHZhbGlkYXRlLlxuICogQHBhcmFtIHBhdGggLSBQYXRoIHByZWZpeCB1c2VkIGluIGVycm9yIHJlcG9ydGluZy5cbiAqIEBwYXJhbSBjb250ZXh0IC0gSHVtYW4tZnJpZW5kbHkgZWxlbWVudCB0eXBlIGZvciBlcnJvciBtZXNzYWdlcy5cbiAqIEBwYXJhbSBlcnJvcnMgLSBDb2xsZWN0b3IgZm9yIHZhbGlkYXRpb24gZmFpbHVyZXMuXG4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlUmVxdWlyZWRTdHJpbmcoXG4gIG9iajogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGZpZWxkOiBzdHJpbmcsXG4gIHBhdGg6IHN0cmluZyxcbiAgY29udGV4dDogc3RyaW5nLFxuICBlcnJvcnM6IEZpZWxkVmFsaWRhdGlvbkVycm9yW11cbik6IHZvaWQge1xuICBjb25zdCB2YWx1ZSA9IG9ialtmaWVsZF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7cGF0aH0uJHtmaWVsZH1gLCBtZXNzYWdlOiBgJHtmaWVsZH0gaXMgcmVxdWlyZWQgZm9yICR7Y29udGV4dH1gLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LiR7ZmllbGR9YCwgbWVzc2FnZTogYCR7ZmllbGR9IG11c3QgYmUgYSBzdHJpbmdgLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJlY29yZHMgZXJyb3JzIGZvciBhIHJlcXVpcmVkIGFycmF5IGZpZWxkIGFuZCByZXR1cm5zIHRoZSBhcnJheSB3aGVuIHZhbGlkLlxuICpcbiAqIFJldHVybmluZyBgdW5kZWZpbmVkYCBhbGxvd3MgY2FsbGVycyB0byBzaG9ydC1jaXJjdWl0IG5lc3RlZCB2YWxpZGF0aW9uXG4gKiB3aXRob3V0IGFkZGl0aW9uYWwgYnJhbmNoaW5nLlxuICpcbiAqIEBwYXJhbSBvYmogLSBQYXJlbnQgb2JqZWN0IHRoYXQgc2hvdWxkIGNvbnRhaW4gdGhlIGZpZWxkLlxuICogQHBhcmFtIGZpZWxkIC0gRmllbGQgbmFtZSB0byB2YWxpZGF0ZS5cbiAqIEBwYXJhbSBwYXRoIC0gUGF0aCBwcmVmaXggdXNlZCBpbiBlcnJvciByZXBvcnRpbmcuXG4gKiBAcGFyYW0gY29udGV4dCAtIEh1bWFuLWZyaWVuZGx5IGVsZW1lbnQgdHlwZSBmb3IgZXJyb3IgbWVzc2FnZXMuXG4gKiBAcGFyYW0gZXJyb3JzIC0gQ29sbGVjdG9yIGZvciB2YWxpZGF0aW9uIGZhaWx1cmVzLlxuICogQHJldHVybnMgVGhlIGFycmF5IHdoZW4gdmFsaWQsIG90aGVyd2lzZSBgdW5kZWZpbmVkYC5cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVSZXF1aXJlZEFycmF5KFxuICBvYmo6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBmaWVsZDogc3RyaW5nLFxuICBwYXRoOiBzdHJpbmcsXG4gIGNvbnRleHQ6IHN0cmluZyxcbiAgZXJyb3JzOiBGaWVsZFZhbGlkYXRpb25FcnJvcltdXG4pOiB1bmtub3duW10gfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IG9ialtmaWVsZF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7cGF0aH0uJHtmaWVsZH1gLCBtZXNzYWdlOiBgJHtmaWVsZH0gaXMgcmVxdWlyZWQgZm9yICR7Y29udGV4dH1gLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7cGF0aH0uJHtmaWVsZH1gLCBtZXNzYWdlOiBgJHtmaWVsZH0gbXVzdCBiZSBhbiBhcnJheWAsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlcyBhIHNpbmdsZSBBZGFwdGl2ZSBDYXJkIGJvZHkgZWxlbWVudCBhbmQgYW55IG5lc3RlZCBjaGlsZHJlbi5cbiAqXG4gKiBUaGUgdmFsaWRhdG9yIHJlY29nbml6ZXMgYSBmb2N1c2VkIHN1YnNldCBvZiBlbGVtZW50IHR5cGVzIHVzZWQgYnkgQ2FyZHM6XG4gKiBgVGV4dEJsb2NrYCwgYEltYWdlYCwgYENvbnRhaW5lcmAsIGBDb2x1bW5TZXRgLCBgQWN0aW9uU2V0YCwgYEZhY3RTZXRgLCBhbmRcbiAqIGBJbnB1dC4qYCBlbGVtZW50cy4gVW5rbm93biB0eXBlcyBhcmUgYWNjZXB0ZWQgd2l0aG91dCBlcnJvcnMgc28gbmV3ZXJcbiAqIEFkYXB0aXZlIENhcmQgZmVhdHVyZXMgZG8gbm90IGJyZWFrIGV4aXN0aW5nIGNhcmRzLlxuICpcbiAqIEBwYXJhbSBlbGVtZW50IC0gVGhlIGVsZW1lbnQgcGF5bG9hZCB0byB2YWxpZGF0ZS5cbiAqIEBwYXJhbSBwYXRoIC0gSlNPTi1zdHlsZSBwYXRoIHVzZWQgaW4gZXJyb3IgbWVzc2FnZXMgKGUuZy4gYHBheWxvYWQuYm9keVswXWApLlxuICogQHBhcmFtIGVycm9ycyAtIENvbGxlY3RvciBmb3IgdmFsaWRhdGlvbiBmYWlsdXJlcy5cbiAqIEBzZWUgdmFsaWRhdGVBY3Rpb25cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVCb2R5RWxlbWVudChlbGVtZW50OiB1bmtub3duLCBwYXRoOiBzdHJpbmcsIGVycm9yczogRmllbGRWYWxpZGF0aW9uRXJyb3JbXSk6IHZvaWQge1xuICBpZiAoIWlzT2JqZWN0KGVsZW1lbnQpKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogcGF0aCwgbWVzc2FnZTogJ2JvZHkgZWxlbWVudCBtdXN0IGJlIGFuIG9iamVjdCcsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGVsID0gZWxlbWVudDtcbiAgY29uc3QgZWxUeXBlID0gZWxbJ3R5cGUnXTtcblxuICBpZiAoZWxUeXBlID09PSB1bmRlZmluZWQgfHwgZWxUeXBlID09PSBudWxsKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7cGF0aH0udHlwZWAsIG1lc3NhZ2U6ICd0eXBlIGlzIHJlcXVpcmVkIGZvciBib2R5IGVsZW1lbnQnLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh0eXBlb2YgZWxUeXBlICE9PSAnc3RyaW5nJykge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LnR5cGVgLCBtZXNzYWdlOiAndHlwZSBtdXN0IGJlIGEgc3RyaW5nJywgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgc3dpdGNoIChlbFR5cGUpIHtcbiAgICBjYXNlICdUZXh0QmxvY2snOlxuICAgICAgdmFsaWRhdGVSZXF1aXJlZFN0cmluZyhlbCwgJ3RleHQnLCBwYXRoLCAnVGV4dEJsb2NrJywgZXJyb3JzKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnSW1hZ2UnOlxuICAgICAgdmFsaWRhdGVSZXF1aXJlZFN0cmluZyhlbCwgJ3VybCcsIHBhdGgsICdJbWFnZScsIGVycm9ycyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ0NvbnRhaW5lcic6IHtcbiAgICAgIGNvbnN0IGl0ZW1zID0gdmFsaWRhdGVSZXF1aXJlZEFycmF5KGVsLCAnaXRlbXMnLCBwYXRoLCAnQ29udGFpbmVyJywgZXJyb3JzKTtcbiAgICAgIGl0ZW1zPy5mb3JFYWNoKChpdGVtLCBpKSA9PiB7XG4gICAgICAgIHZhbGlkYXRlQm9keUVsZW1lbnQoaXRlbSwgYCR7cGF0aH0uaXRlbXNbJHtpfV1gLCBlcnJvcnMpO1xuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjYXNlICdDb2x1bW5TZXQnOiB7XG4gICAgICBjb25zdCBjb2x1bW5zID0gdmFsaWRhdGVSZXF1aXJlZEFycmF5KGVsLCAnY29sdW1ucycsIHBhdGgsICdDb2x1bW5TZXQnLCBlcnJvcnMpO1xuICAgICAgY29sdW1ucz8uZm9yRWFjaCgoY29sdW1uLCBpKSA9PiB7XG4gICAgICAgIGNvbnN0IGNvbFBhdGggPSBgJHtwYXRofS5jb2x1bW5zWyR7aX1dYDtcbiAgICAgICAgaWYgKCFpc09iamVjdChjb2x1bW4pKSB7XG4gICAgICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogY29sUGF0aCwgbWVzc2FnZTogJ2NvbHVtbiBtdXN0IGJlIGFuIG9iamVjdCcsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sdW1uWyd0eXBlJ10gIT09ICdDb2x1bW4nKSB7XG4gICAgICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7Y29sUGF0aH0udHlwZWAsIG1lc3NhZ2U6IFwiY29sdW1uIHR5cGUgbXVzdCBiZSAnQ29sdW1uJ1wiLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sdW1uWydpdGVtcyddICE9PSB1bmRlZmluZWQgJiYgY29sdW1uWydpdGVtcyddICE9PSBudWxsKSB7XG4gICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGNvbHVtblsnaXRlbXMnXSkpIHtcbiAgICAgICAgICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke2NvbFBhdGh9Lml0ZW1zYCwgbWVzc2FnZTogJ2l0ZW1zIG11c3QgYmUgYW4gYXJyYXknLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgKGNvbHVtblsnaXRlbXMnXSBhcyB1bmtub3duW10pLmZvckVhY2goKGl0ZW0sIGopID0+IHtcbiAgICAgICAgICAgICAgdmFsaWRhdGVCb2R5RWxlbWVudChpdGVtLCBgJHtjb2xQYXRofS5pdGVtc1ske2p9XWAsIGVycm9ycyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY2FzZSAnQWN0aW9uU2V0Jzoge1xuICAgICAgY29uc3QgYWN0aW9ucyA9IHZhbGlkYXRlUmVxdWlyZWRBcnJheShlbCwgJ2FjdGlvbnMnLCBwYXRoLCAnQWN0aW9uU2V0JywgZXJyb3JzKTtcbiAgICAgIGFjdGlvbnM/LmZvckVhY2goKGFjdGlvbiwgaSkgPT4ge1xuICAgICAgICB2YWxpZGF0ZUFjdGlvbihhY3Rpb24sIGAke3BhdGh9LmFjdGlvbnNbJHtpfV1gLCBlcnJvcnMpO1xuICAgICAgfSk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjYXNlICdGYWN0U2V0Jzoge1xuICAgICAgY29uc3QgZmFjdHMgPSB2YWxpZGF0ZVJlcXVpcmVkQXJyYXkoZWwsICdmYWN0cycsIHBhdGgsICdGYWN0U2V0JywgZXJyb3JzKTtcbiAgICAgIGZhY3RzPy5mb3JFYWNoKChmYWN0LCBpKSA9PiB7XG4gICAgICAgIGNvbnN0IGZhY3RQYXRoID0gYCR7cGF0aH0uZmFjdHNbJHtpfV1gO1xuICAgICAgICBpZiAoIWlzT2JqZWN0KGZhY3QpKSB7XG4gICAgICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogZmFjdFBhdGgsIG1lc3NhZ2U6ICdmYWN0IG11c3QgYmUgYW4gb2JqZWN0JywgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmYWN0Wyd0aXRsZSddID09PSB1bmRlZmluZWQgfHwgZmFjdFsndGl0bGUnXSA9PT0gbnVsbCkge1xuICAgICAgICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke2ZhY3RQYXRofS50aXRsZWAsIG1lc3NhZ2U6ICd0aXRsZSBpcyByZXF1aXJlZCBmb3IgZmFjdCcsIGNvZGU6ICdtaXNzaW5nX2ZpZWxkJyB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmFjdFsndmFsdWUnXSA9PT0gdW5kZWZpbmVkIHx8IGZhY3RbJ3ZhbHVlJ10gPT09IG51bGwpIHtcbiAgICAgICAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtmYWN0UGF0aH0udmFsdWVgLCBtZXNzYWdlOiAndmFsdWUgaXMgcmVxdWlyZWQgZm9yIGZhY3QnLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY2FzZSAnSW5wdXQuVGV4dCc6XG4gICAgY2FzZSAnSW5wdXQuTnVtYmVyJzpcbiAgICBjYXNlICdJbnB1dC5EYXRlJzpcbiAgICBjYXNlICdJbnB1dC5UaW1lJzpcbiAgICBjYXNlICdJbnB1dC5Ub2dnbGUnOlxuICAgIGNhc2UgJ0lucHV0LkNob2ljZVNldCc6XG4gICAgICB2YWxpZGF0ZVJlcXVpcmVkU3RyaW5nKGVsLCAnaWQnLCBwYXRoLCBlbFR5cGUsIGVycm9ycyk7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBVbmtub3duIGVsZW1lbnQgdHlwZSAtIGFsbG93IGZvciBmb3J3YXJkIGNvbXBhdGliaWxpdHlcbiAgICAgIGJyZWFrO1xuICB9XG59XG5cbi8qKlxuICogVmFsaWRhdGVzIGFuIEFkYXB0aXZlIENhcmQgYWN0aW9uIGFuZCBhbnkgbmVzdGVkIGNhcmQgcGF5bG9hZHMuXG4gKlxuICogU3VwcG9ydGVkIGFjdGlvbiB0eXBlcyBhcmUgYEFjdGlvbi5TdWJtaXRgLCBgQWN0aW9uLk9wZW5VcmxgLFxuICogYEFjdGlvbi5TaG93Q2FyZGAsIGFuZCBgQWN0aW9uLlRvZ2dsZVZpc2liaWxpdHlgLiBVbmtub3duIGFjdGlvbiB0eXBlcyBhcmVcbiAqIGFsbG93ZWQgZm9yIGZvcndhcmQgY29tcGF0aWJpbGl0eS5cbiAqXG4gKiBAcGFyYW0gYWN0aW9uIC0gVGhlIGFjdGlvbiBwYXlsb2FkIHRvIHZhbGlkYXRlLlxuICogQHBhcmFtIHBhdGggLSBKU09OLXN0eWxlIHBhdGggdXNlZCBpbiBlcnJvciBtZXNzYWdlcy5cbiAqIEBwYXJhbSBlcnJvcnMgLSBDb2xsZWN0b3IgZm9yIHZhbGlkYXRpb24gZmFpbHVyZXMuXG4gKiBAc2VlIHZhbGlkYXRlQm9keUVsZW1lbnRcbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVBY3Rpb24oYWN0aW9uOiB1bmtub3duLCBwYXRoOiBzdHJpbmcsIGVycm9yczogRmllbGRWYWxpZGF0aW9uRXJyb3JbXSk6IHZvaWQge1xuICBpZiAoIWlzT2JqZWN0KGFjdGlvbikpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBwYXRoLCBtZXNzYWdlOiAnYWN0aW9uIG11c3QgYmUgYW4gb2JqZWN0JywgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgYWN0ID0gYWN0aW9uO1xuICBjb25zdCBhY3RUeXBlID0gYWN0Wyd0eXBlJ107XG5cbiAgaWYgKGFjdFR5cGUgPT09IHVuZGVmaW5lZCB8fCBhY3RUeXBlID09PSBudWxsKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7cGF0aH0udHlwZWAsIG1lc3NhZ2U6ICd0eXBlIGlzIHJlcXVpcmVkIGZvciBhY3Rpb24nLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh0eXBlb2YgYWN0VHlwZSAhPT0gJ3N0cmluZycpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS50eXBlYCwgbWVzc2FnZTogJ3R5cGUgbXVzdCBiZSBhIHN0cmluZycsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHN3aXRjaCAoYWN0VHlwZSkge1xuICAgIGNhc2UgJ0FjdGlvbi5TdWJtaXQnOlxuICAgICAgLy8gTm8gcmVxdWlyZWQgZmllbGRzIGJleW9uZCB0eXBlXG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ0FjdGlvbi5PcGVuVXJsJzpcbiAgICAgIHZhbGlkYXRlUmVxdWlyZWRTdHJpbmcoYWN0LCAndXJsJywgcGF0aCwgJ0FjdGlvbi5PcGVuVXJsJywgZXJyb3JzKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnQWN0aW9uLlNob3dDYXJkJzoge1xuICAgICAgY29uc3QgbmVzdGVkQ2FyZCA9IGFjdFsnY2FyZCddO1xuICAgICAgaWYgKG5lc3RlZENhcmQgPT09IHVuZGVmaW5lZCB8fCBuZXN0ZWRDYXJkID09PSBudWxsKSB7XG4gICAgICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LmNhcmRgLCBtZXNzYWdlOiAnY2FyZCBpcyByZXF1aXJlZCBmb3IgQWN0aW9uLlNob3dDYXJkJywgY29kZTogJ21pc3NpbmdfZmllbGQnIH0pO1xuICAgICAgfSBlbHNlIGlmICghaXNPYmplY3QobmVzdGVkQ2FyZCkpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogYCR7cGF0aH0uY2FyZGAsIG1lc3NhZ2U6ICdjYXJkIG11c3QgYmUgYW4gb2JqZWN0JywgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBWYWxpZGF0ZSBuZXN0ZWQgY2FyZCB0eXBlXG4gICAgICAgIGlmIChuZXN0ZWRDYXJkWyd0eXBlJ10gPT09IHVuZGVmaW5lZCB8fCBuZXN0ZWRDYXJkWyd0eXBlJ10gPT09IG51bGwpIHtcbiAgICAgICAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS5jYXJkLnR5cGVgLCBtZXNzYWdlOiAnY2FyZC50eXBlIGlzIHJlcXVpcmVkJywgY29kZTogJ21pc3NpbmdfZmllbGQnIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKG5lc3RlZENhcmRbJ3R5cGUnXSAhPT0gJ0FkYXB0aXZlQ2FyZCcpIHtcbiAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICBmaWVsZDogYCR7cGF0aH0uY2FyZC50eXBlYCxcbiAgICAgICAgICAgIG1lc3NhZ2U6IFwiY2FyZC50eXBlIG11c3QgYmUgJ0FkYXB0aXZlQ2FyZCdcIixcbiAgICAgICAgICAgIGNvZGU6ICdpbnZhbGlkX3R5cGUnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBWYWxpZGF0ZSBuZXN0ZWQgY2FyZCBib2R5IGlmIHByZXNlbnRcbiAgICAgICAgaWYgKG5lc3RlZENhcmRbJ2JvZHknXSAhPT0gdW5kZWZpbmVkICYmIG5lc3RlZENhcmRbJ2JvZHknXSAhPT0gbnVsbCkge1xuICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShuZXN0ZWRDYXJkWydib2R5J10pKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiBgJHtwYXRofS5jYXJkLmJvZHlgLCBtZXNzYWdlOiAnY2FyZC5ib2R5IG11c3QgYmUgYW4gYXJyYXknLCBjb2RlOiAnaW52YWxpZF90eXBlJyB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgKG5lc3RlZENhcmRbJ2JvZHknXSBhcyB1bmtub3duW10pLmZvckVhY2goKGVsZW1lbnQsIGkpID0+IHtcbiAgICAgICAgICAgICAgdmFsaWRhdGVCb2R5RWxlbWVudChlbGVtZW50LCBgJHtwYXRofS5jYXJkLmJvZHlbJHtpfV1gLCBlcnJvcnMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVmFsaWRhdGUgbmVzdGVkIGNhcmQgYWN0aW9ucyBpZiBwcmVzZW50XG4gICAgICAgIGlmIChuZXN0ZWRDYXJkWydhY3Rpb25zJ10gIT09IHVuZGVmaW5lZCAmJiBuZXN0ZWRDYXJkWydhY3Rpb25zJ10gIT09IG51bGwpIHtcbiAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobmVzdGVkQ2FyZFsnYWN0aW9ucyddKSkge1xuICAgICAgICAgICAgZXJyb3JzLnB1c2goe1xuICAgICAgICAgICAgICBmaWVsZDogYCR7cGF0aH0uY2FyZC5hY3Rpb25zYCxcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ2NhcmQuYWN0aW9ucyBtdXN0IGJlIGFuIGFycmF5JyxcbiAgICAgICAgICAgICAgY29kZTogJ2ludmFsaWRfdHlwZSdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAobmVzdGVkQ2FyZFsnYWN0aW9ucyddIGFzIHVua25vd25bXSkuZm9yRWFjaCgobmVzdGVkQWN0aW9uLCBpKSA9PiB7XG4gICAgICAgICAgICAgIHZhbGlkYXRlQWN0aW9uKG5lc3RlZEFjdGlvbiwgYCR7cGF0aH0uY2FyZC5hY3Rpb25zWyR7aX1dYCwgZXJyb3JzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY2FzZSAnQWN0aW9uLlRvZ2dsZVZpc2liaWxpdHknOiB7XG4gICAgICBjb25zdCB0YXJnZXRzID0gdmFsaWRhdGVSZXF1aXJlZEFycmF5KGFjdCwgJ3RhcmdldEVsZW1lbnRzJywgcGF0aCwgJ0FjdGlvbi5Ub2dnbGVWaXNpYmlsaXR5JywgZXJyb3JzKTtcbiAgICAgIHRhcmdldHM/LmZvckVhY2goKHRhcmdldCwgaSkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHRhcmdldCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICBmaWVsZDogYCR7cGF0aH0udGFyZ2V0RWxlbWVudHNbJHtpfV1gLFxuICAgICAgICAgICAgbWVzc2FnZTogJ3RhcmdldEVsZW1lbnQgbXVzdCBiZSBhIHN0cmluZycsXG4gICAgICAgICAgICBjb2RlOiAnaW52YWxpZF90eXBlJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBVbmtub3duIGFjdGlvbiB0eXBlIC0gYWxsb3cgZm9yIGZvcndhcmQgY29tcGF0aWJpbGl0eVxuICAgICAgYnJlYWs7XG4gIH1cbn1cblxuLyoqXG4gKiBSZWNvcmRzIGEgdHlwZSBlcnJvciB3aGVuIGFuIG9wdGlvbmFsIHN0cmluZyBmaWVsZCBpcyBwcmVzZW50IGJ1dCBpbnZhbGlkLlxuICpcbiAqIEBwYXJhbSBvYmogLSBQYXJlbnQgb2JqZWN0IHRoYXQgbWF5IGNvbnRhaW4gdGhlIGZpZWxkLlxuICogQHBhcmFtIGZpZWxkIC0gRmllbGQgbmFtZSB0byB2YWxpZGF0ZS5cbiAqIEBwYXJhbSBwYXRoIC0gUGF0aCBwcmVmaXggdXNlZCBpbiBlcnJvciByZXBvcnRpbmcuXG4gKiBAcGFyYW0gZXJyb3JzIC0gQ29sbGVjdG9yIGZvciB2YWxpZGF0aW9uIGZhaWx1cmVzLlxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZU9wdGlvbmFsU3RyaW5nKFxuICBvYmo6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBmaWVsZDogc3RyaW5nLFxuICBwYXRoOiBzdHJpbmcsXG4gIGVycm9yczogRmllbGRWYWxpZGF0aW9uRXJyb3JbXVxuKTogdm9pZCB7XG4gIGNvbnN0IHZhbHVlID0gb2JqW2ZpZWxkXTtcbiAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LiR7ZmllbGR9YCwgbWVzc2FnZTogYCR7cGF0aH0uJHtmaWVsZH0gbXVzdCBiZSBhIHN0cmluZ2AsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICB9XG59XG5cbi8qKlxuICogUmVjb3JkcyBhIHR5cGUgZXJyb3Igd2hlbiBhbiBvcHRpb25hbCBhcnJheSBmaWVsZCBpcyBwcmVzZW50IGJ1dCBpbnZhbGlkLlxuICpcbiAqIEBwYXJhbSBvYmogLSBQYXJlbnQgb2JqZWN0IHRoYXQgbWF5IGNvbnRhaW4gdGhlIGZpZWxkLlxuICogQHBhcmFtIGZpZWxkIC0gRmllbGQgbmFtZSB0byB2YWxpZGF0ZS5cbiAqIEBwYXJhbSBwYXRoIC0gUGF0aCBwcmVmaXggdXNlZCBpbiBlcnJvciByZXBvcnRpbmcuXG4gKiBAcGFyYW0gZXJyb3JzIC0gQ29sbGVjdG9yIGZvciB2YWxpZGF0aW9uIGZhaWx1cmVzLlxuICogQHJldHVybnMgVGhlIGFycmF5IHdoZW4gdmFsaWQsIG90aGVyd2lzZSBgdW5kZWZpbmVkYC5cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVPcHRpb25hbEFycmF5KFxuICBvYmo6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBmaWVsZDogc3RyaW5nLFxuICBwYXRoOiBzdHJpbmcsXG4gIGVycm9yczogRmllbGRWYWxpZGF0aW9uRXJyb3JbXVxuKTogdW5rbm93bltdIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBvYmpbZmllbGRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIGVycm9ycy5wdXNoKHsgZmllbGQ6IGAke3BhdGh9LiR7ZmllbGR9YCwgbWVzc2FnZTogYCR7cGF0aH0uJHtmaWVsZH0gbXVzdCBiZSBhbiBhcnJheWAsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5jb25zdCBTRU1WRVJfUEFUVEVSTiA9IC9eXFxkK1xcLlxcZCsoXFwuXFxkKyk/JC87XG5cbi8qKlxuICogVmFsaWRhdGVzIHRoZSBpbm5lciBBZGFwdGl2ZSBDYXJkIHBheWxvYWQgc2NoZW1hLlxuICpcbiAqIFRoZSBwYXlsb2FkIGlzIHRyZWF0ZWQgYXMgYSBsb29zZSBzY2hlbWE6IHJlcXVpcmVkIGtleXMgYXJlIGNoZWNrZWQsIG9wdGlvbmFsXG4gKiBhcnJheXMgYXJlIHZhbGlkYXRlZCBlbGVtZW50LWJ5LWVsZW1lbnQsIGFuZCBhIGZldyBjcm9zcy1maWVsZCB3YXJuaW5ncyBhcmVcbiAqIGFkZGVkIGJhc2VkIG9uIGNhcmQgc3RhdHVzLlxuICpcbiAqIEBwYXJhbSBhZGFwdGl2ZUNhcmQgLSBQYXJzZWQgcGF5bG9hZCBvYmplY3QgZnJvbSBgY2FyZC5wYXlsb2FkYC5cbiAqIEBwYXJhbSBjYXJkU3RhdHVzIC0gUGFyZW50IGNhcmQgc3RhdHVzLCB1c2VkIGZvciBjcm9zcy1maWVsZCB3YXJuaW5ncy5cbiAqIEBwYXJhbSBlcnJvcnMgLSBDb2xsZWN0b3IgZm9yIHZhbGlkYXRpb24gZmFpbHVyZXMgYW5kIHdhcm5pbmdzLlxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZUFkYXB0aXZlQ2FyZFNjaGVtYShcbiAgYWRhcHRpdmVDYXJkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgY2FyZFN0YXR1czogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICBlcnJvcnM6IEZpZWxkVmFsaWRhdGlvbkVycm9yW11cbik6IHZvaWQge1xuICAvLyB0eXBlIGlzIHJlcXVpcmVkIGFuZCBtdXN0IGJlICdBZGFwdGl2ZUNhcmQnXG4gIGlmIChhZGFwdGl2ZUNhcmRbJ3R5cGUnXSA9PT0gdW5kZWZpbmVkIHx8IGFkYXB0aXZlQ2FyZFsndHlwZSddID09PSBudWxsKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogJ3BheWxvYWQudHlwZScsIG1lc3NhZ2U6ICdwYXlsb2FkLnR5cGUgaXMgcmVxdWlyZWQnLCBjb2RlOiAnbWlzc2luZ19maWVsZCcgfSk7XG4gIH0gZWxzZSBpZiAoYWRhcHRpdmVDYXJkWyd0eXBlJ10gIT09ICdBZGFwdGl2ZUNhcmQnKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogJ3BheWxvYWQudHlwZScsIG1lc3NhZ2U6IFwicGF5bG9hZC50eXBlIG11c3QgYmUgJ0FkYXB0aXZlQ2FyZCdcIiwgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gIH1cblxuICB2YWxpZGF0ZU9wdGlvbmFsU3RyaW5nKGFkYXB0aXZlQ2FyZCwgJ3ZlcnNpb24nLCAncGF5bG9hZCcsIGVycm9ycyk7XG5cbiAgY29uc3QgYm9keSA9IHZhbGlkYXRlT3B0aW9uYWxBcnJheShhZGFwdGl2ZUNhcmQsICdib2R5JywgJ3BheWxvYWQnLCBlcnJvcnMpO1xuICBib2R5Py5mb3JFYWNoKChlbGVtZW50LCBpKSA9PiB7XG4gICAgdmFsaWRhdGVCb2R5RWxlbWVudChlbGVtZW50LCBgcGF5bG9hZC5ib2R5WyR7aX1dYCwgZXJyb3JzKTtcbiAgfSk7XG5cbiAgY29uc3QgYWN0aW9ucyA9IHZhbGlkYXRlT3B0aW9uYWxBcnJheShhZGFwdGl2ZUNhcmQsICdhY3Rpb25zJywgJ3BheWxvYWQnLCBlcnJvcnMpO1xuICBhY3Rpb25zPy5mb3JFYWNoKChhY3Rpb24sIGkpID0+IHtcbiAgICB2YWxpZGF0ZUFjdGlvbihhY3Rpb24sIGBwYXlsb2FkLmFjdGlvbnNbJHtpfV1gLCBlcnJvcnMpO1xuICB9KTtcblxuICAvLyAkc2NoZW1hIGlzIG9wdGlvbmFsIGJ1dCBtdXN0IGJlIHZhbGlkIFVSTCBpZiBwcmVzZW50XG4gIGNvbnN0IHNjaGVtYSA9IGFkYXB0aXZlQ2FyZFsnJHNjaGVtYSddO1xuICBpZiAoc2NoZW1hICE9PSB1bmRlZmluZWQgJiYgc2NoZW1hICE9PSBudWxsKSB7XG4gICAgaWYgKHR5cGVvZiBzY2hlbWEgIT09ICdzdHJpbmcnKSB7XG4gICAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiAncGF5bG9hZC4kc2NoZW1hJywgbWVzc2FnZTogJ3BheWxvYWQuJHNjaGVtYSBtdXN0IGJlIGEgc3RyaW5nJywgY29kZTogJ2ludmFsaWRfdHlwZScgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBVUkwoc2NoZW1hKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIC8vIFR5cGVFcnJvciBpcyB0aHJvd24gZm9yIGludmFsaWQgVVJMcyAtIHRoaXMgaXMgdGhlIGV4cGVjdGVkIHZhbGlkYXRpb24gZmFpbHVyZVxuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBUeXBlRXJyb3IpIHtcbiAgICAgICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgICAgICBmaWVsZDogJ3BheWxvYWQuJHNjaGVtYScsXG4gICAgICAgICAgICBtZXNzYWdlOiAncGF5bG9hZC4kc2NoZW1hIG11c3QgYmUgYSB2YWxpZCBVUkwnLFxuICAgICAgICAgICAgY29kZTogJ2ludmFsaWRfZm9ybWF0J1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gbWluVmVyc2lvbiBpcyBvcHRpb25hbCBidXQgbXVzdCBiZSBzZW12ZXIgZm9ybWF0IGlmIHByZXNlbnRcbiAgY29uc3QgbWluVmVyc2lvbiA9IGFkYXB0aXZlQ2FyZFsnbWluVmVyc2lvbiddO1xuICBpZiAobWluVmVyc2lvbiAhPT0gdW5kZWZpbmVkICYmIG1pblZlcnNpb24gIT09IG51bGwpIHtcbiAgICBpZiAodHlwZW9mIG1pblZlcnNpb24gIT09ICdzdHJpbmcnKSB7XG4gICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgIGZpZWxkOiAncGF5bG9hZC5taW5WZXJzaW9uJyxcbiAgICAgICAgbWVzc2FnZTogJ3BheWxvYWQubWluVmVyc2lvbiBtdXN0IGJlIGEgc3RyaW5nJyxcbiAgICAgICAgY29kZTogJ2ludmFsaWRfdHlwZSdcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoIVNFTVZFUl9QQVRURVJOLnRlc3QobWluVmVyc2lvbikpIHtcbiAgICAgIGVycm9ycy5wdXNoKHtcbiAgICAgICAgZmllbGQ6ICdwYXlsb2FkLm1pblZlcnNpb24nLFxuICAgICAgICBtZXNzYWdlOiAncGF5bG9hZC5taW5WZXJzaW9uIG11c3QgYmUgaW4gc2VtdmVyIGZvcm1hdCAoZS5nLiwgMS41IG9yIDEuNS4wKScsXG4gICAgICAgIGNvZGU6ICdpbnZhbGlkX2Zvcm1hdCdcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIENyb3NzLWZpZWxkOiB3YXJuIHdoZW4gc3RhdHVzIGlzIGFjdGl2ZSBidXQgbm8gYWN0aW9uc1xuICBpZiAoY2FyZFN0YXR1cyA9PT0gJ2FjdGl2ZScgJiYgQXJyYXkuaXNBcnJheShhY3Rpb25zKSAmJiBhY3Rpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAncGF5bG9hZC5hY3Rpb25zJyxcbiAgICAgIG1lc3NhZ2U6ICdDYXJkIHdpdGggXCJhY3RpdmVcIiBzdGF0dXMgc2hvdWxkIGhhdmUgYXQgbGVhc3Qgb25lIGFjdGlvbicsXG4gICAgICBjb2RlOiAnd2FybmluZ19hY3RpdmVfd2l0aG91dF9hY3Rpb25zJ1xuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogVmFsaWRhdGVzIGEgQ2FyZHMgVjIge0BsaW5rIEFkYXB0aXZlQ2FyZH0gb2JqZWN0LlxuICpcbiAqIFRoaXMgaXMgYSBzdHJ1Y3R1cmFsIHZhbGlkYXRvciByYXRoZXIgdGhhbiBhIGZ1bGwgQWRhcHRpdmUgQ2FyZCBzY2hlbWFcbiAqIGNoZWNrZXIuIEl0IGVuc3VyZXMgcmVxdWlyZWQgZmllbGRzIGFyZSBwcmVzZW50LCBhcHBsaWVzIGxlbmd0aCBsaW1pdHMsIGFuZFxuICogYWRkcyBjcm9zcy1maWVsZCB3YXJuaW5ncyB3aGVuIGEgc3RhdHVzIGRvZXMgbm90IG1hdGNoIHRoZSBwYXlsb2FkLlxuICpcbiAqIEBwYXJhbSBjYXJkIC0gVGhlIGNhcmQgb2JqZWN0IHRvIHZhbGlkYXRlLlxuICogQHJldHVybnMgVmFsaWRhdGlvbiByZXN1bHQgY29udGFpbmluZyBhbnkgZXJyb3JzIG9yIHdhcm5pbmdzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVBZGFwdGl2ZUNhcmQoY2FyZDogQWRhcHRpdmVDYXJkKTogVmFsaWRhdGlvblJlc3VsdCB7XG4gIGNvbnN0IGVycm9yczogRmllbGRWYWxpZGF0aW9uRXJyb3JbXSA9IFtdO1xuXG4gIC8vIFZhbGlkYXRlIGlkIGZpZWxkXG4gIGlmIChjYXJkLmlkID09PSB1bmRlZmluZWQgfHwgY2FyZC5pZCA9PT0gbnVsbCkge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAnaWQnLFxuICAgICAgbWVzc2FnZTogJ2lkIGlzIHJlcXVpcmVkJyxcbiAgICAgIGNvZGU6ICdtaXNzaW5nX2ZpZWxkJ1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBjYXJkLmlkICE9PSAnc3RyaW5nJykge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAnaWQnLFxuICAgICAgbWVzc2FnZTogJ2lkIG11c3QgYmUgYSBzdHJpbmcnLFxuICAgICAgY29kZTogJ2ludmFsaWRfdHlwZScsXG4gICAgICBleHBlY3RlZFR5cGU6ICdzdHJpbmcnXG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoY2FyZC5pZC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgZXJyb3JzLnB1c2goe1xuICAgICAgZmllbGQ6ICdpZCcsXG4gICAgICBtZXNzYWdlOiAnaWQgbXVzdCBub3QgYmUgZW1wdHknLFxuICAgICAgY29kZTogJ2ludmFsaWRfZm9ybWF0JyxcbiAgICAgIHN1Z2dlc3Rpb246ICdQcm92aWRlIGEgbm9uLWVtcHR5IHZhbHVlJ1xuICAgIH0pO1xuICB9XG5cbiAgLy8gVmFsaWRhdGUgc3VtbWFyeSB3aXRoIGxlbmd0aCBjb25zdHJhaW50XG4gIGlmIChjYXJkLnN1bW1hcnkgPT09IHVuZGVmaW5lZCB8fCBjYXJkLnN1bW1hcnkgPT09IG51bGwpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiAnc3VtbWFyeScsIG1lc3NhZ2U6ICdzdW1tYXJ5IGlzIHJlcXVpcmVkJywgY29kZTogJ21pc3NpbmdfZmllbGQnIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBjYXJkLnN1bW1hcnkgIT09ICdzdHJpbmcnKSB7XG4gICAgZXJyb3JzLnB1c2goe1xuICAgICAgZmllbGQ6ICdzdW1tYXJ5JyxcbiAgICAgIG1lc3NhZ2U6ICdzdW1tYXJ5IG11c3QgYmUgYSBzdHJpbmcnLFxuICAgICAgY29kZTogJ2ludmFsaWRfdHlwZScsXG4gICAgICBleHBlY3RlZFR5cGU6ICdzdHJpbmcnXG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoY2FyZC5zdW1tYXJ5LnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICBlcnJvcnMucHVzaCh7XG4gICAgICBmaWVsZDogJ3N1bW1hcnknLFxuICAgICAgbWVzc2FnZTogJ3N1bW1hcnkgbXVzdCBub3QgYmUgZW1wdHknLFxuICAgICAgY29kZTogJ2ludmFsaWRfZm9ybWF0JyxcbiAgICAgIHN1Z2dlc3Rpb246ICdQcm92aWRlIGEgbm9uLWVtcHR5IHZhbHVlJ1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKGNhcmQuc3VtbWFyeS5sZW5ndGggPiBNQVhfU1VNTUFSWV9MRU5HVEgpIHtcbiAgICBlcnJvcnMucHVzaCh7XG4gICAgICBmaWVsZDogJ3N1bW1hcnknLFxuICAgICAgbWVzc2FnZTogYHN1bW1hcnkgbXVzdCBub3QgZXhjZWVkICR7TUFYX1NVTU1BUllfTEVOR1RIfSBjaGFyYWN0ZXJzYCxcbiAgICAgIGNvZGU6ICdsZW5ndGhfZXhjZWVkZWQnLFxuICAgICAgc3VnZ2VzdGlvbjogYFNob3J0ZW4gdG8gJHtNQVhfU1VNTUFSWV9MRU5HVEh9IGNoYXJhY3RlcnMgb3IgbGVzc2BcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFZhbGlkYXRlIGF1dGhvciBmaWVsZFxuICBpZiAoY2FyZC5hdXRob3IgPT09IHVuZGVmaW5lZCB8fCBjYXJkLmF1dGhvciA9PT0gbnVsbCkge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAnYXV0aG9yJyxcbiAgICAgIG1lc3NhZ2U6ICdhdXRob3IgaXMgcmVxdWlyZWQnLFxuICAgICAgY29kZTogJ21pc3NpbmdfZmllbGQnXG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNhcmQuYXV0aG9yICE9PSAnc3RyaW5nJykge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAnYXV0aG9yJyxcbiAgICAgIG1lc3NhZ2U6ICdhdXRob3IgbXVzdCBiZSBhIHN0cmluZycsXG4gICAgICBjb2RlOiAnaW52YWxpZF90eXBlJyxcbiAgICAgIGV4cGVjdGVkVHlwZTogJ3N0cmluZydcbiAgICB9KTtcbiAgfSBlbHNlIGlmIChjYXJkLmF1dGhvci50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgZXJyb3JzLnB1c2goe1xuICAgICAgZmllbGQ6ICdhdXRob3InLFxuICAgICAgbWVzc2FnZTogJ2F1dGhvciBtdXN0IG5vdCBiZSBlbXB0eScsXG4gICAgICBjb2RlOiAnaW52YWxpZF9mb3JtYXQnLFxuICAgICAgc3VnZ2VzdGlvbjogJ1Byb3ZpZGUgYSBub24tZW1wdHkgdmFsdWUnXG4gICAgfSk7XG4gIH1cblxuICAvLyBWYWxpZGF0ZSBzdGF0dXMgZmllbGRcbiAgaWYgKGNhcmQuc3RhdHVzID09PSB1bmRlZmluZWQgfHwgY2FyZC5zdGF0dXMgPT09IG51bGwpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiAnc3RhdHVzJywgbWVzc2FnZTogJ3N0YXR1cyBpcyByZXF1aXJlZCcsIGNvZGU6ICdtaXNzaW5nX2ZpZWxkJyB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgY2FyZC5zdGF0dXMgIT09ICdzdHJpbmcnKSB7XG4gICAgZXJyb3JzLnB1c2goe1xuICAgICAgZmllbGQ6ICdzdGF0dXMnLFxuICAgICAgbWVzc2FnZTogJ3N0YXR1cyBtdXN0IGJlIGEgc3RyaW5nJyxcbiAgICAgIGNvZGU6ICdpbnZhbGlkX3R5cGUnXG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoIUFEQVBUSVZFX0NBUkRfU1RBVFVTRVMuaW5jbHVkZXMoY2FyZC5zdGF0dXMgYXMgKHR5cGVvZiBBREFQVElWRV9DQVJEX1NUQVRVU0VTKVtudW1iZXJdKSkge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAnc3RhdHVzJyxcbiAgICAgIG1lc3NhZ2U6IGBzdGF0dXMgbXVzdCBiZSBvbmUgb2Y6ICR7QURBUFRJVkVfQ0FSRF9TVEFUVVNFUy5qb2luKCcsICcpfWAsXG4gICAgICBjb2RlOiAnaW52YWxpZF9zdGF0dXMnLFxuICAgICAgYXZhaWxhYmxlVmFsdWVzOiBBREFQVElWRV9DQVJEX1NUQVRVU0VTXG4gICAgfSk7XG4gIH1cblxuICAvLyBWYWxpZGF0ZSBwYXlsb2FkIGZpZWxkXG4gIGlmIChjYXJkLnBheWxvYWQgPT09IHVuZGVmaW5lZCB8fCBjYXJkLnBheWxvYWQgPT09IG51bGwpIHtcbiAgICBlcnJvcnMucHVzaCh7IGZpZWxkOiAncGF5bG9hZCcsIG1lc3NhZ2U6ICdwYXlsb2FkIGlzIHJlcXVpcmVkJywgY29kZTogJ21pc3NpbmdfZmllbGQnIH0pO1xuICB9IGVsc2UgaWYgKCFpc09iamVjdChjYXJkLnBheWxvYWQpKSB7XG4gICAgZXJyb3JzLnB1c2goeyBmaWVsZDogJ3BheWxvYWQnLCBtZXNzYWdlOiAncGF5bG9hZCBtdXN0IGJlIGFuIG9iamVjdCcsIGNvZGU6ICdpbnZhbGlkX3R5cGUnIH0pO1xuICB9IGVsc2Uge1xuICAgIHZhbGlkYXRlQWRhcHRpdmVDYXJkU2NoZW1hKGNhcmQucGF5bG9hZCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiwgY2FyZC5zdGF0dXMsIGVycm9ycyk7XG4gIH1cblxuICAvLyBDcm9zcy1maWVsZDogd2FybiB3aGVuIHN0YXR1cyBpcyBjb21wbGV0ZWQgYnV0IG5vIG91dHB1dFxuICBpZiAoY2FyZC5zdGF0dXMgPT09ICdjb21wbGV0ZWQnICYmIChjYXJkLm91dHB1dCA9PT0gdW5kZWZpbmVkIHx8IGNhcmQub3V0cHV0ID09PSBudWxsKSkge1xuICAgIGVycm9ycy5wdXNoKHtcbiAgICAgIGZpZWxkOiAnb3V0cHV0JyxcbiAgICAgIG1lc3NhZ2U6ICdDYXJkIHdpdGggXCJjb21wbGV0ZWRcIiBzdGF0dXMgc2hvdWxkIGhhdmUgb3V0cHV0IGRlZmluZWQnLFxuICAgICAgY29kZTogJ3dhcm5pbmdfY29tcGxldGVkX3dpdGhvdXRfb3V0cHV0J1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHsgdmFsaWQ6IGVycm9ycy5sZW5ndGggPT09IDAsIGVycm9ycyB9O1xufVxuIiwgIi8qKlxuICogTm9kZS5qcy1zcGVjaWZpYyB2YWxpZGF0aW9uIGhlbHBlcnMgdGhhdCBiaW5kIGZpbGVzeXN0ZW0gYWNjZXNzLlxuICpcbiAqIFRoZXNlIHdyYXBwZXJzIGFkYXB0IHRoZSBwdXJlIHZhbGlkYXRvcnMgdG8gcmVhbCBkaXNrIEkvTyBieSB3aXJpbmcgaW5cbiAqIGBmc2AgYW5kIGBmcy9wcm9taXNlc2AsIG1ha2luZyB0aGVtIGNvbnZlbmllbnQgZm9yIENMSSBhbmQgc2VydmVyIHVzYWdlLlxuICpcbiAqIEBtb2R1bGUgbm9kZVxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0ICogYXMgZnNQcm9taXNlcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7XG4gIHZhbGlkYXRlQ2FyZFJlcG9JbnRlZ3JpdHkgYXMgY29yZVZhbGlkYXRlQ2FyZFJlcG9JbnRlZ3JpdHksXG4gIHZhbGlkYXRlQ2FyZFJlcG9JbnRlZ3JpdHlBc3luYyBhcyBjb3JlVmFsaWRhdGVDYXJkUmVwb0ludGVncml0eUFzeW5jXG59IGZyb20gJy4vaW50ZWdyaXR5LmpzJztcbmltcG9ydCB0eXBlIHsgVmFsaWRhdGlvblJlc3VsdCB9IGZyb20gJy4vdHlwZXMuanMnO1xuXG4vKipcbiAqIEludGVyZmFjZSBmb3IgTm9kZS5qcyB2YWxpZGF0aW9uIGhlbHBlcnMgdGhhdCB1c2UgcmVhbCBmaWxlc3lzdGVtIGFjY2Vzcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOb2RlVmFsaWRhdG9yIHtcbiAgLyoqXG4gICAqIFZhbGlkYXRlcyBhIGNhcmQgcmVwb3NpdG9yeSB1c2luZyBzeW5jaHJvbm91cyBmaWxlc3lzdGVtIGNoZWNrcy5cbiAgICpcbiAgICogQHBhcmFtIHJlcG9QYXRoIC0gUGF0aCB0byB0aGUgY2FyZCByZXBvc2l0b3J5LlxuICAgKiBAcmV0dXJucyBWYWxpZGF0aW9uIHJlc3VsdCBjb250YWluaW5nIGFueSBlcnJvcnMgb3Igd2FybmluZ3MuXG4gICAqL1xuICB2YWxpZGF0ZUNhcmRSZXBvSW50ZWdyaXR5KHJlcG9QYXRoOiBzdHJpbmcpOiBWYWxpZGF0aW9uUmVzdWx0O1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSB7QGxpbmsgTm9kZVZhbGlkYXRvcn0gdGhhdCBiaW5kcyBgZnMuZXhpc3RzU3luY2AgYW5kIGBmcy5yZWFkRmlsZVN5bmNgLlxuICpcbiAqIFRoaXMgaGVscGVyIGZhdm9ycyBzaW1wbGljaXR5IG92ZXIgbm9uLWJsb2NraW5nIGJlaGF2aW9yLCBzbyBpdCBpcyBiZXN0XG4gKiBzdWl0ZWQgZm9yIHNjcmlwdHMgb3IgQ0xJIGNvbW1hbmRzIHJhdGhlciB0aGFuIGxhdGVuY3ktc2Vuc2l0aXZlIHNlcnZlcnMuXG4gKlxuICogQHJldHVybnMgQSBOb2RlVmFsaWRhdG9yIGluc3RhbmNlIHdpdGggZmlsZXN5c3RlbSBiaW5kaW5ncy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU5vZGVWYWxpZGF0b3IoKTogTm9kZVZhbGlkYXRvciB7XG4gIHJldHVybiB7XG4gICAgdmFsaWRhdGVDYXJkUmVwb0ludGVncml0eShyZXBvUGF0aDogc3RyaW5nKTogVmFsaWRhdGlvblJlc3VsdCB7XG4gICAgICByZXR1cm4gY29yZVZhbGlkYXRlQ2FyZFJlcG9JbnRlZ3JpdHkocmVwb1BhdGgsIGZzLmV4aXN0c1N5bmMsIChmaWxlUGF0aDogc3RyaW5nKSA9PlxuICAgICAgICBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGYtOCcpXG4gICAgICApO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBJbnRlcmZhY2UgZm9yIGFzeW5jIE5vZGUuanMgdmFsaWRhdGlvbiBoZWxwZXJzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFzeW5jTm9kZVZhbGlkYXRvciB7XG4gIC8qKlxuICAgKiBWYWxpZGF0ZXMgYSBjYXJkIHJlcG9zaXRvcnkgdXNpbmcgYXN5bmMgZmlsZXN5c3RlbSBjaGVja3MuXG4gICAqXG4gICAqIEBwYXJhbSByZXBvUGF0aCAtIFBhdGggdG8gdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAgICogQHJldHVybnMgVmFsaWRhdGlvbiByZXN1bHQgY29udGFpbmluZyBhbnkgZXJyb3JzIG9yIHdhcm5pbmdzLlxuICAgKi9cbiAgdmFsaWRhdGVDYXJkUmVwb0ludGVncml0eUFzeW5jKHJlcG9QYXRoOiBzdHJpbmcpOiBQcm9taXNlPFZhbGlkYXRpb25SZXN1bHQ+O1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW4ge0BsaW5rIEFzeW5jTm9kZVZhbGlkYXRvcn0gdGhhdCBiaW5kcyBgZnMucHJvbWlzZXNgLlxuICpcbiAqIFRoaXMgdXNlcyBgZnMucHJvbWlzZXMuYWNjZXNzYCBmb3IgZXhpc3RlbmNlIGNoZWNrcyBiZWZvcmUgcmVhZGluZyBmaWxlcy5cbiAqIElmIHRoZSBmaWxlc3lzdGVtIGNoYW5nZXMgYmV0d2VlbiB0aGUgY2hlY2sgYW5kIHRoZSByZWFkLCB0aGUgdmFsaWRhdG9yIHdpbGxcbiAqIHJlcG9ydCB0aGUgcmVhZCBlcnJvciBqdXN0IGFzIHRoZSBjb3JlIHZhbGlkYXRvciB3b3VsZC5cbiAqXG4gKiBAcmV0dXJucyBBbiBBc3luY05vZGVWYWxpZGF0b3IgaW5zdGFuY2Ugd2l0aCBhc3luYyBmaWxlc3lzdGVtIGJpbmRpbmdzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQXN5bmNOb2RlVmFsaWRhdG9yKCk6IEFzeW5jTm9kZVZhbGlkYXRvciB7XG4gIHJldHVybiB7XG4gICAgYXN5bmMgdmFsaWRhdGVDYXJkUmVwb0ludGVncml0eUFzeW5jKHJlcG9QYXRoOiBzdHJpbmcpOiBQcm9taXNlPFZhbGlkYXRpb25SZXN1bHQ+IHtcbiAgICAgIHJldHVybiBjb3JlVmFsaWRhdGVDYXJkUmVwb0ludGVncml0eUFzeW5jKFxuICAgICAgICByZXBvUGF0aCxcbiAgICAgICAgYXN5bmMgKHBhdGgpID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgZnNQcm9taXNlcy5hY2Nlc3MocGF0aCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIChwYXRoKSA9PiBmc1Byb21pc2VzLnJlYWRGaWxlKHBhdGgsICd1dGYtOCcpXG4gICAgICApO1xuICAgIH1cbiAgfTtcbn1cbiIsICIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZWQgYWNjZXNzIHRvIENsYXVkZSBDb2RlJ3MgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCB1dGlsaXRpZXNcbiAqIGZvciBwZXJzaXN0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcyBpbiBTZXNzaW9uU3RhcnQgaG9va3MuXG4gKlxuICogIyMgRW52aXJvbm1lbnQgVmFyaWFibGVzXG4gKlxuICogQ2xhdWRlIENvZGUgc2V0cyB0aGVzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgd2hlbiBydW5uaW5nIGhvb2tzOlxuICpcbiAqIHwgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8IEF2YWlsYWJsZSBJbiB8XG4gKiB8LS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tfFxuICogfCBgQ0xBVURFX1BST0pFQ1RfRElSYCB8IEFic29sdXRlIHBhdGggdG8gcHJvamVjdCByb290IHwgQWxsIGhvb2tzIHxcbiAqIHwgYENMQVVERV9FTlZfRklMRWAgfCBQYXRoIHRvIGZpbGUgZm9yIHBlcnNpc3RpbmcgZW52IHZhcnMgfCBTZXNzaW9uU3RhcnQgb25seSB8XG4gKiB8IGBDTEFVREVfQ09ERV9SRU1PVEVgIHwgYFwidHJ1ZVwiYCBpZiBydW5uaW5nIHJlbW90ZWx5IHwgQWxsIGhvb2tzIHxcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBnZXRQcm9qZWN0RGlyLCBwZXJzaXN0RW52VmFyLCBpc1JlbW90ZUVudmlyb25tZW50IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBHZXQgcHJvamVjdCBkaXJlY3RvcnlcbiAqIGNvbnN0IHByb2plY3REaXIgPSBnZXRQcm9qZWN0RGlyKCk7XG4gKlxuICogLy8gQ2hlY2sgaWYgcnVubmluZyByZW1vdGVseVxuICogaWYgKGlzUmVtb3RlRW52aXJvbm1lbnQoKSkge1xuICogICAvLyBIYW5kbGUgcmVtb3RlLXNwZWNpZmljIGxvZ2ljXG4gKiB9XG4gKlxuICogLy8gSW4gU2Vzc2lvblN0YXJ0IGhvb2s6IHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdwcm9kdWN0aW9uJyk7XG4gKiBwZXJzaXN0RW52VmFyKCdBUElfS0VZJywgJ3NlY3JldC1rZXknKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stZXhlY3V0aW9uLWRldGFpbHNcbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcIm5vZGU6ZnNcIjtcbi8qKlxuICogQ2xhdWRlIENvZGUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMuXG4gKlxuICogVGhlc2UgYXJlIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgdGhhdCBDbGF1ZGUgQ29kZSBzZXRzIHdoZW4gcnVubmluZyBob29rcy5cbiAqL1xuZXhwb3J0IGNvbnN0IENMQVVERV9FTlZfVkFSUyA9IHtcbiAgICAvKipcbiAgICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBwcm9qZWN0IHJvb3QgZGlyZWN0b3J5IHdoZXJlIENsYXVkZSBDb2RlIHdhcyBzdGFydGVkLlxuICAgICAqIEF2YWlsYWJsZSBpbiBhbGwgaG9va3MuXG4gICAgICovXG4gICAgUFJPSkVDVF9ESVI6IFwiQ0xBVURFX1BST0pFQ1RfRElSXCIsXG4gICAgLyoqXG4gICAgICogUGF0aCB0byBhIGZpbGUgd2hlcmUgU2Vzc2lvblN0YXJ0IGhvb2tzIGNhbiBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAgICAgKiBWYXJpYWJsZXMgd3JpdHRlbiB0byB0aGlzIGZpbGUgd2lsbCBiZSBhdmFpbGFibGUgaW4gYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcy5cbiAgICAgKiBPbmx5IGF2YWlsYWJsZSBpbiBTZXNzaW9uU3RhcnQgaG9va3MuXG4gICAgICovXG4gICAgRU5WX0ZJTEU6IFwiQ0xBVURFX0VOVl9GSUxFXCIsXG4gICAgLyoqXG4gICAgICogU2V0IHRvIFwidHJ1ZVwiIHdoZW4gcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAgICAgKiBOb3Qgc2V0IG9yIGVtcHR5IHdoZW4gcnVubmluZyBpbiBsb2NhbCBDTEkgZW52aXJvbm1lbnQuXG4gICAgICovXG4gICAgUkVNT1RFOiBcIkNMQVVERV9DT0RFX1JFTU9URVwiLFxufTtcbi8qKlxuICogR2V0cyB0aGUgQ2xhdWRlIENvZGUgcHJvamVjdCBkaXJlY3RvcnkuXG4gKlxuICogVGhpcyBpcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcHJvamVjdCByb290IHdoZXJlIENsYXVkZSBDb2RlIHdhcyBzdGFydGVkLlxuICogVGhlIHZhbHVlIGNvbWVzIGZyb20gdGhlIGBDTEFVREVfUFJPSkVDVF9ESVJgIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICogQHJldHVybnMgVGhlIHByb2plY3QgZGlyZWN0b3J5IHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqIGlmIChwcm9qZWN0RGlyKSB7XG4gKiAgIGNvbnN0IGNvbmZpZ1BhdGggPSBgJHtwcm9qZWN0RGlyfS8uY2xhdWRlL2NvbmZpZy5qc29uYDtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdERpcigpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLlBST0pFQ1RfRElSXTtcbn1cbi8qKlxuICogR2V0cyB0aGUgQ2xhdWRlIENvZGUgZW52IGZpbGUgcGF0aCBmb3IgcGVyc2lzdGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogVGhpcyBpcyBvbmx5IGF2YWlsYWJsZSBpbiBTZXNzaW9uU3RhcnQgaG9va3MuIFRoZSBwYXRoIHBvaW50cyB0byBhIGZpbGVcbiAqIHdoZXJlIHlvdSBjYW4gd3JpdGUgc2hlbGwgZXhwb3J0IHN0YXRlbWVudHMgdG8gcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIGZvciBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzIGluIHRoZSBzZXNzaW9uLlxuICogQHJldHVybnMgVGhlIGVudiBmaWxlIHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0IChub3QgYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZGaWxlID0gZ2V0RW52RmlsZVBhdGgoKTtcbiAqIGlmIChlbnZGaWxlKSB7XG4gKiAgIC8vIFdlJ3JlIGluIGEgU2Vzc2lvblN0YXJ0IGhvb2sgYW5kIGNhbiBwZXJzaXN0IGVudiB2YXJzXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ01ZX1ZBUicsICdteS12YWx1ZScpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZGaWxlUGF0aCgpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLkVOVl9GSUxFXTtcbn1cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBob29rIGlzIHJ1bm5pbmcgaW4gYSByZW1vdGUgKHdlYikgZW52aXJvbm1lbnQuXG4gKlxuICogUmVtb3RlIGVudmlyb25tZW50cyBtYXkgaGF2ZSBkaWZmZXJlbnQgY2FwYWJpbGl0aWVzIG9yIHJlc3RyaWN0aW9uc1xuICogY29tcGFyZWQgdG8gbG9jYWwgQ0xJIGVudmlyb25tZW50cy5cbiAqIEByZXR1cm5zIHRydWUgaWYgcnVubmluZyByZW1vdGVseSwgZmFsc2UgaWYgcnVubmluZyBsb2NhbGx5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzUmVtb3RlRW52aXJvbm1lbnQoKSkge1xuICogICAvLyBVc2Ugd2ViLWNvbXBhdGlibGUgYXBwcm9hY2hlc1xuICogfSBlbHNlIHtcbiAqICAgLy8gQ2FuIHVzZSBsb2NhbCBDTEkgZmVhdHVyZXNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNSZW1vdGVFbnZpcm9ubWVudCgpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLlJFTU9URV0gPT09IFwidHJ1ZVwiO1xufVxuLyoqXG4gKiBQZXJzaXN0cyBhbiBlbnZpcm9ubWVudCB2YXJpYWJsZSBmb3IgdXNlIGluIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdyaXRlcyBhIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnQgdG8gdGhlIGBDTEFVREVfRU5WX0ZJTEVgLFxuICogd2hpY2ggQ2xhdWRlIENvZGUgc291cmNlcyBiZWZvcmUgcnVubmluZyBiYXNoIGNvbW1hbmRzLiBUaGlzIGFsbG93c1xuICogU2Vzc2lvblN0YXJ0IGhvb2tzIHRvIGNvbmZpZ3VyZSB0aGUgZW52aXJvbm1lbnQgZm9yIHRoZSBlbnRpcmUgc2Vzc2lvbi5cbiAqXG4gKiAqKkltcG9ydGFudCoqOiBUaGlzIGZ1bmN0aW9uIG9ubHkgd29ya3MgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzIHdoZXJlXG4gKiBgQ0xBVURFX0VOVl9GSUxFYCBpcyBzZXQuIEluIG90aGVyIGhvb2tzLCBpdCB3aWxsIHRocm93IGFuIGVycm9yLlxuICogQHBhcmFtIG5hbWUgLSBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZVxuICogQHBhcmFtIHZhbHVlIC0gVGhlIGVudmlyb25tZW50IHZhcmlhYmxlIHZhbHVlICh3aWxsIGJlIHNoZWxsLWVzY2FwZWQpXG4gKiBAdGhyb3dzIEVycm9yIGlmIENMQVVERV9FTlZfRklMRSBpcyBub3Qgc2V0IChub3QgaW4gYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uU3RhcnRIb29rLCBzZXNzaW9uU3RhcnRPdXRwdXQsIHBlcnNpc3RFbnZWYXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCkgPT4ge1xuICogICAvLyBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgdGhlIHNlc3Npb25cbiAqICAgcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAncHJvZHVjdGlvbicpO1xuICogICBwZXJzaXN0RW52VmFyKCdBUElfS0VZJywgcHJvY2Vzcy5lbnYuTVlfQVBJX0tFWSA/PyAnZGVmYXVsdCcpO1xuICogICBwZXJzaXN0RW52VmFyKCdQQVRIJywgYCR7cHJvY2Vzcy5lbnYuUEFUSH06Li9ub2RlX21vZHVsZXMvLmJpbmApO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3BlcnNpc3RpbmctZW52aXJvbm1lbnQtdmFyaWFibGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJzaXN0RW52VmFyKG5hbWUsIHZhbHVlKSB7XG4gICAgY29uc3QgZW52RmlsZSA9IGdldEVudkZpbGVQYXRoKCk7XG4gICAgaWYgKGVudkZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZXJzaXN0RW52VmFyIGNhbiBvbmx5IGJlIHVzZWQgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLiBcIiArIFwiQ0xBVURFX0VOVl9GSUxFIGVudmlyb25tZW50IHZhcmlhYmxlIGlzIG5vdCBzZXQuXCIpO1xuICAgIH1cbiAgICAvLyBTaGVsbC1lc2NhcGUgdGhlIHZhbHVlIHRvIGhhbmRsZSBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICBjb25zdCBlc2NhcGVkVmFsdWUgPSBlc2NhcGVTaGVsbFZhbHVlKHZhbHVlKTtcbiAgICAvLyBXcml0ZSB0aGUgZXhwb3J0IHN0YXRlbWVudFxuICAgIGNvbnN0IGV4cG9ydFN0YXRlbWVudCA9IGBleHBvcnQgJHtuYW1lfT0ke2VzY2FwZWRWYWx1ZX1cXG5gO1xuICAgIGZzLmFwcGVuZEZpbGVTeW5jKGVudkZpbGUsIGV4cG9ydFN0YXRlbWVudCwgXCJ1dGYtOFwiKTtcbn1cbi8qKlxuICogUGVyc2lzdHMgbXVsdGlwbGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIGF0IG9uY2UuXG4gKlxuICogVGhpcyBpcyBhIGNvbnZlbmllbmNlIHdyYXBwZXIgYXJvdW5kIGBwZXJzaXN0RW52VmFyYCBmb3Igc2V0dGluZ1xuICogbXVsdGlwbGUgdmFyaWFibGVzIGluIGEgc2luZ2xlIGNhbGwuXG4gKiBAcGFyYW0gdmFycyAtIE9iamVjdCBtYXBwaW5nIHZhcmlhYmxlIG5hbWVzIHRvIHZhbHVlc1xuICogQHRocm93cyBFcnJvciBpZiBDTEFVREVfRU5WX0ZJTEUgaXMgbm90IHNldCAobm90IGluIGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcGVyc2lzdEVudlZhcnMoe1xuICogICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICogICBBUElfS0VZOiAnc2VjcmV0JyxcbiAqICAgREVCVUc6ICdmYWxzZSdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJzaXN0RW52VmFycyh2YXJzKSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHZhcnMpKSB7XG4gICAgICAgIHBlcnNpc3RFbnZWYXIobmFtZSwgdmFsdWUpO1xuICAgIH1cbn1cbi8qKlxuICogRXNjYXBlcyBhIHZhbHVlIGZvciBzYWZlIHVzZSBpbiBhIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnQuXG4gKlxuICogVXNlcyBzaW5nbGUgcXVvdGVzIGFuZCBlc2NhcGVzIGFueSBlbWJlZGRlZCBzaW5nbGUgcXVvdGVzLlxuICogVGhpcyBwcmV2ZW50cyBzaGVsbCBpbmplY3Rpb24gYW5kIGhhbmRsZXMgc3BlY2lhbCBjaGFyYWN0ZXJzLlxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGVzY2FwZVxuICogQHJldHVybnMgVGhlIHNoZWxsLWVzY2FwZWQgdmFsdWUgKHdpdGggcXVvdGVzKVxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZVNoZWxsVmFsdWUodmFsdWUpIHtcbiAgICAvLyBVc2Ugc2luZ2xlIHF1b3RlcyBhbmQgZXNjYXBlIGFueSBlbWJlZGRlZCBzaW5nbGUgcXVvdGVzXG4gICAgLy8gJ3ZhbHVlJyAtPiAndmFsJ1xcJyd1ZScgZm9yIHZhbHVlcyBjb250YWluaW5nIHNpbmdsZSBxdW90ZXNcbiAgICBjb25zdCBlc2NhcGVkID0gdmFsdWUucmVwbGFjZSgvJy9nLCBcIidcXFxcJydcIik7XG4gICAgcmV0dXJuIGAnJHtlc2NhcGVkfSdgO1xufVxuIiwgIi8qKlxuICogSG9vayBmYWN0b3J5IGZ1bmN0aW9ucyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZWQgZmFjdG9yeSBmdW5jdGlvbnMgZm9yIGFsbCAxMiBob29rIHR5cGVzIHRoYXQgaGFuZGxlOlxuICogLSBJbnB1dCB0eXBlIG5hcnJvd2luZyBiYXNlZCBvbiBob29rIGV2ZW50IHR5cGVcbiAqIC0gT3V0cHV0IHR5cGUgZW5mb3JjZW1lbnQgdmlhIHJldHVybiB0eXBlc1xuICogLSBFcnJvciB3cmFwcGluZyB3aXRoIGF1dG9tYXRpYyBsb2dnaW5nXG4gKiAtIExvZ2dlciBjb250ZXh0IGluamVjdGlvblxuICpcbiAqIEVhY2ggZmFjdG9yeSBhY2NlcHRzIGEgSG9va0NvbmZpZyB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXQgc2V0dGluZ3MsXG4gKiBhbmQgcmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgdGhlIHJ1bnRpbWUgaW52b2tlcyB3aGVuIHRoZSBob29rIGZpbGUgZXhlY3V0ZXMuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcHJlVG9vbFVzZUhvb2ssIHByZVRvb2xVc2VPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnUHJvY2Vzc2luZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gR2VuZXJpYyBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBob29rIGZhY3RvcnkgZnVuY3Rpb24gZm9yIGEgc3BlY2lmaWMgaG9vayB0eXBlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGludGVybmFsIGltcGxlbWVudGF0aW9uIHVzZWQgYnkgYWxsIHR5cGVkIGZhY3Rvcmllcy5cbiAqIEl0IHdyYXBzIHRoZSBoYW5kbGVyIHdpdGggZXJyb3IgY2F0Y2hpbmcgYW5kIGxvZ2dpbmcuXG4gKiBAcGFyYW0gaG9va0V2ZW50TmFtZSAtIFRoZSBob29rIGV2ZW50IG5hbWVcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb25cbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gd3JhcFxuICogQHJldHVybnMgQSB3cmFwcGVkIGhvb2sgZnVuY3Rpb25cbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVIb29rRnVuY3Rpb24oaG9va0V2ZW50TmFtZSwgY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgY29uc3QgaG9va0ZuID0gYXN5bmMgKGlucHV0LCBjb250ZXh0KSA9PiB7XG4gICAgICAgIC8vIERlbGVnYXRlIGVycm9yIGhhbmRsaW5nIHRvIHRoZSBydW50aW1lIC0ganVzdCBleGVjdXRlIHRoZSBoYW5kbGVyXG4gICAgICAgIC8vIFRoZSBydW50aW1lIHdpbGwgY2F0Y2ggZXJyb3JzLCBsb2cgdGhlbSwgYW5kIHJldHVybiBhcHByb3ByaWF0ZSBvdXRwdXRcbiAgICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZXIoaW5wdXQsIGNvbnRleHQpO1xuICAgIH07XG4gICAgLy8gQXR0YWNoIG1ldGFkYXRhIGZvciBydW50aW1lIGluc3BlY3Rpb25cbiAgICBob29rRm4uaG9va0V2ZW50TmFtZSA9IGhvb2tFdmVudE5hbWU7XG4gICAgaG9va0ZuLm1hdGNoZXIgPSBjb25maWcubWF0Y2hlcjtcbiAgICBob29rRm4udGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuICAgIHJldHVybiBob29rRm47XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVUb29sVXNlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUHJlVG9vbFVzZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdFRvb2xVc2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQb3N0VG9vbFVzZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdFRvb2xVc2VGYWlsdXJlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUG9zdFRvb2xVc2VGYWlsdXJlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBOb3RpZmljYXRpb24gSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBOb3RpZmljYXRpb24gaG9vayBoYW5kbGVyLlxuICpcbiAqIE5vdGlmaWNhdGlvbiBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgc2VuZHMgYSBub3RpZmljYXRpb24sIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gRm9yd2FyZCBub3RpZmljYXRpb25zIHRvIGV4dGVybmFsIHN5c3RlbXNcbiAqIC0gTG9nIGltcG9ydGFudCBldmVudHNcbiAqIC0gVHJpZ2dlciBjdXN0b20gYWxlcnRpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBub3RpZmljYXRpb25fdHlwZWBcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBub3RpZmljYXRpb25Ib29rLCBub3RpZmljYXRpb25PdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEZvcndhcmQgbm90aWZpY2F0aW9ucyB0byBTbGFja1xuICogZXhwb3J0IGRlZmF1bHQgbm90aWZpY2F0aW9uSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdOb3RpZmljYXRpb24gcmVjZWl2ZWQnLCB7XG4gKiAgICAgdHlwZTogaW5wdXQubm90aWZpY2F0aW9uX3R5cGUsXG4gKiAgICAgdGl0bGU6IGlucHV0LnRpdGxlXG4gKiAgIH0pO1xuICpcbiAqICAgYXdhaXQgc2VuZFNsYWNrTWVzc2FnZShpbnB1dC50aXRsZSA/PyAnTm90aWZpY2F0aW9uJywgaW5wdXQubWVzc2FnZSk7XG4gKlxuICogICByZXR1cm4gbm90aWZpY2F0aW9uT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjbm90aWZpY2F0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RpZmljYXRpb25Ib29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJOb3RpZmljYXRpb25cIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFVzZXJQcm9tcHRTdWJtaXQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBVc2VyUHJvbXB0U3VibWl0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBVc2VyUHJvbXB0U3VibWl0IGhvb2tzIGZpcmUgd2hlbiBhIHVzZXIgc3VibWl0cyBhIHByb21wdCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBBZGQgYWRkaXRpb25hbCBjb250ZXh0IG9yIGluc3RydWN0aW9uc1xuICogLSBMb2cgdXNlciBpbnRlcmFjdGlvbnNcbiAqIC0gVmFsaWRhdGUgb3IgdHJhbnNmb3JtIHByb21wdHNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHByb21wdCBzdWJtaXNzaW9uc1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHVzZXJQcm9tcHRTdWJtaXRIb29rLCB1c2VyUHJvbXB0U3VibWl0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBBZGQgcHJvamVjdCBjb250ZXh0IHRvIGV2ZXJ5IHByb21wdFxuICogZXhwb3J0IGRlZmF1bHQgdXNlclByb21wdFN1Ym1pdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuZGVidWcoJ1VzZXIgcHJvbXB0IHN1Ym1pdHRlZCcsIHsgcHJvbXB0TGVuZ3RoOiBpbnB1dC5wcm9tcHQubGVuZ3RoIH0pO1xuICpcbiAqICAgY29uc3QgcHJvamVjdENvbnRleHQgPSBhd2FpdCBnZXRQcm9qZWN0Q29udGV4dCgpO1xuICpcbiAqICAgcmV0dXJuIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQoe1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiBwcm9qZWN0Q29udGV4dFxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdXNlcnByb21wdHN1Ym1pdFxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlclByb21wdFN1Ym1pdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlVzZXJQcm9tcHRTdWJtaXRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNlc3Npb25TdGFydCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNlc3Npb25TdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU2Vzc2lvblN0YXJ0IGhvb2tzIGZpcmUgd2hlbiBhIENsYXVkZSBDb2RlIHNlc3Npb24gc3RhcnRzIG9yIHJlc3RhcnRzLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBJbml0aWFsaXplIHNlc3Npb24gc3RhdGVcbiAqIC0gSW5qZWN0IGNvbnRleHQgb3IgaW5zdHJ1Y3Rpb25zXG4gKiAtIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHNcbiAqIC0gU2V0IHVwIGxvZ2dpbmcgb3IgbW9uaXRvcmluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHNvdXJjZWAgKCdzdGFydHVwJywgJ3Jlc3VtZScsICdjbGVhcicsICdjb21wYWN0JylcbiAqXG4gKiAqKkNvbnRleHQqKjogU2Vzc2lvblN0YXJ0IGhvb2tzIHJlY2VpdmUgYW4gZXh0ZW5kZWQgY29udGV4dCB3aXRoIGBwZXJzaXN0RW52VmFyYFxuICogYW5kIGBwZXJzaXN0RW52VmFyc2AgZnVuY3Rpb25zIGZvciBzZXR0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uU3RhcnRIb29rLCBzZXNzaW9uU3RhcnRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0aGUgc2Vzc2lvblxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7IG1hdGNoZXI6ICdzdGFydHVwJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyLCBwZXJzaXN0RW52VmFyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ05ldyBzZXNzaW9uIHN0YXJ0ZWQnLCB7XG4gKiAgICAgc2Vzc2lvbklkOiBpbnB1dC5zZXNzaW9uX2lkLFxuICogICAgIGN3ZDogaW5wdXQuY3dkXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gU2V0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kc1xuICogICBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdkZXZlbG9wbWVudCcpO1xuICogICBwZXJzaXN0RW52VmFyKCdERUJVRycsICd0cnVlJyk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gU2V0IG11bHRpcGxlIGVudmlyb25tZW50IHZhcmlhYmxlcyBhdCBvbmNlXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgcGVyc2lzdEVudlZhcnMgfSkgPT4ge1xuICogICBwZXJzaXN0RW52VmFycyh7XG4gKiAgICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAqICAgICBBUElfS0VZOiAnc2VjcmV0JyxcbiAqICAgICBERUJVRzogJ2ZhbHNlJ1xuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXNzaW9uc3RhcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlc3Npb25TdGFydEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNlc3Npb25TdGFydFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2Vzc2lvbkVuZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNlc3Npb25FbmQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNlc3Npb25FbmQgaG9va3MgZmlyZSB3aGVuIGEgQ2xhdWRlIENvZGUgc2Vzc2lvbiBlbmRzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENsZWFuIHVwIHNlc3Npb24gcmVzb3VyY2VzXG4gKiAtIExvZyBzZXNzaW9uIG1ldHJpY3NcbiAqIC0gUGVyc2lzdCBzZXNzaW9uIHN0YXRlXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgcmVhc29uYCAodGhlIGV4aXQgcmVhc29uIHN0cmluZylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uRW5kSG9vaywgc2Vzc2lvbkVuZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHNlc3Npb24gZW5kIGFuZCBjbGVhbiB1cFxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvbkVuZEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU2Vzc2lvbiBlbmRlZCcsIHtcbiAqICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gKiAgICAgcmVhc29uOiBpbnB1dC5yZWFzb25cbiAqICAgfSk7XG4gKlxuICogICBhd2FpdCBjbGVhbnVwU2Vzc2lvblJlc291cmNlcyhpbnB1dC5zZXNzaW9uX2lkKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uRW5kT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbmVuZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvbkVuZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNlc3Npb25FbmRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN0b3AgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdG9wIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBpcyBhYm91dCB0byBzdG9wLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdG9wIGFuZCByZXF1aXJlIGFkZGl0aW9uYWwgYWN0aW9uXG4gKiAtIENvbmZpcm0gdGhlIHVzZXIgd2FudHMgdG8gc3RvcFxuICogLSBDbGVhbiB1cCByZXNvdXJjZXMgYmVmb3JlIHN0b3BwaW5nXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBzdG9wIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN0b3BIb29rLCBzdG9wT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBCbG9jayBzdG9wIGlmIHRoZXJlIGFyZSBwZW5kaW5nIGNoYW5nZXNcbiAqIGV4cG9ydCBkZWZhdWx0IHN0b3BIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgY29uc3QgcGVuZGluZ0NoYW5nZXMgPSBhd2FpdCBjaGVja1BlbmRpbmdDaGFuZ2VzKCk7XG4gKlxuICogICBpZiAocGVuZGluZ0NoYW5nZXMubGVuZ3RoID4gMCkge1xuICogICAgIGxvZ2dlci53YXJuKCdCbG9ja2luZyBzdG9wIGR1ZSB0byBwZW5kaW5nIGNoYW5nZXMnLCB7XG4gKiAgICAgICBjb3VudDogcGVuZGluZ0NoYW5nZXMubGVuZ3RoXG4gKiAgICAgfSk7XG4gKlxuICogICAgIHJldHVybiBzdG9wT3V0cHV0KHtcbiAqICAgICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICAgICAgcmVhc29uOiBgVGhlcmUgYXJlICR7cGVuZGluZ0NoYW5nZXMubGVuZ3RofSB1bmNvbW1pdHRlZCBjaGFuZ2VzYCxcbiAqICAgICAgIHN5c3RlbU1lc3NhZ2U6ICdQbGVhc2UgY29tbWl0IG9yIGRpc2NhcmQgY2hhbmdlcyBiZWZvcmUgc3RvcHBpbmcnXG4gKiAgICAgfSk7XG4gKiAgIH1cbiAqXG4gKiAgIGxvZ2dlci5pbmZvKCdBcHByb3Zpbmcgc3RvcCcpO1xuICogICByZXR1cm4gc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N0b3BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3BIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdG9wXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdWJhZ2VudFN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU3ViYWdlbnRTdGFydCBob29rcyBmaXJlIHdoZW4gYSBzdWJhZ2VudCAoVGFzayB0b29sKSBzdGFydHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gSW5qZWN0IGNvbnRleHQgZm9yIHRoZSBzdWJhZ2VudFxuICogLSBMb2cgc3ViYWdlbnQgaW52b2NhdGlvbnNcbiAqIC0gQ29uZmlndXJlIHN1YmFnZW50IGJlaGF2aW9yXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgYWdlbnRfdHlwZWAgKGUuZy4sICdleHBsb3JlJywgJ2NvZGViYXNlLWFuYWx5c2lzJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdWJhZ2VudFN0YXJ0SG9vaywgc3ViYWdlbnRTdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQWRkIGNvbnRleHQgZm9yIGV4cGxvcmUgc3ViYWdlbnRzXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0YXJ0SG9vayh7IG1hdGNoZXI6ICdleHBsb3JlJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0V4cGxvcmUgc3ViYWdlbnQgc3RhcnRpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRm9jdXMgb24gZmluZGluZyBwYXR0ZXJucyBhbmQgY29udmVudGlvbnMnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdWJhZ2VudHN0YXJ0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdWJhZ2VudFN0YXJ0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdGFydFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3ViYWdlbnRTdG9wIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdWJhZ2VudFN0b3AgaG9va3MgZmlyZSB3aGVuIGEgc3ViYWdlbnQgY29tcGxldGVzIG9yIHN0b3BzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdWJhZ2VudCBmcm9tIHN0b3BwaW5nXG4gKiAtIFByb2Nlc3Mgc3ViYWdlbnQgcmVzdWx0c1xuICogLSBDbGVhbiB1cCBzdWJhZ2VudCByZXNvdXJjZXNcbiAqIC0gTG9nIHN1YmFnZW50IGNvbXBsZXRpb25cbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBhZ2VudF90eXBlYCAoZS5nLiwgJ2V4cGxvcmUnLCAnY29kZWJhc2UtYW5hbHlzaXMnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN1YmFnZW50U3RvcEhvb2ssIHN1YmFnZW50U3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQmxvY2sgZXhwbG9yZSBzdWJhZ2VudHMgaWYgdGFzayBpbmNvbXBsZXRlXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0b3BIb29rKHsgbWF0Y2hlcjogJ2V4cGxvcmUnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU3ViYWdlbnQgc3RvcHBpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gQmxvY2sgaWYgdHJhbnNjcmlwdCBzaG93cyBpbmNvbXBsZXRlIHdvcmtcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RvcE91dHB1dCh7XG4gKiAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgcmVhc29uOiAnUGxlYXNlIHZlcmlmeSBleHBsb3JhdGlvbiBpcyBjb21wbGV0ZSdcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N1YmFnZW50c3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdG9wSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdG9wXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBQcmVDb21wYWN0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgUHJlQ29tcGFjdCBob29rIGhhbmRsZXIuXG4gKlxuICogUHJlQ29tcGFjdCBob29rcyBmaXJlIGJlZm9yZSBjb250ZXh0IGNvbXBhY3Rpb24gb2NjdXJzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFByZXNlcnZlIGltcG9ydGFudCBpbmZvcm1hdGlvbiBiZWZvcmUgY29tcGFjdGlvblxuICogLSBMb2cgY29tcGFjdGlvbiBldmVudHNcbiAqIC0gTW9kaWZ5IGN1c3RvbSBpbnN0cnVjdGlvbnMgZm9yIHRoZSBjb21wYWN0ZWQgY29udGV4dFxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHRyaWdnZXJgICgnbWFudWFsJywgJ2F1dG8nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHByZUNvbXBhY3RIb29rLCBwcmVDb21wYWN0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgY29tcGFjdGlvbiBldmVudHMgYW5kIHByZXNlcnZlIGNvbnRleHRcbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbnRleHQgY29tcGFjdGlvbiB0cmlnZ2VyZWQnLCB7XG4gKiAgICAgdHJpZ2dlcjogaW5wdXQudHJpZ2dlcixcbiAqICAgICBoYXNDdXN0b21JbnN0cnVjdGlvbnM6IGlucHV0LmN1c3RvbV9pbnN0cnVjdGlvbnMgIT09IG51bGxcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgICAgc3lzdGVtTWVzc2FnZTogJ1JlbWVtYmVyOiBzdHJpY3QgbW9kZSBpcyBlbmFibGVkJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gT25seSBoYW5kbGUgbWFudWFsIGNvbXBhY3Rpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHsgbWF0Y2hlcjogJ21hbnVhbCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdNYW51YWwgY29tcGFjdGlvbiByZXF1ZXN0ZWQnKTtcbiAqICAgcmV0dXJuIHByZUNvbXBhY3RPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNwcmVjb21wYWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVDb21wYWN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUHJlQ29tcGFjdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcGVybWlzc2lvblJlcXVlc3RIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQZXJtaXNzaW9uUmVxdWVzdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2V0dXAgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXR1cCBob29rIGhhbmRsZXIuXG4gKlxuICogU2V0dXAgaG9va3MgZmlyZSBkdXJpbmcgaW5pdGlhbGl6YXRpb24gb3IgbWFpbnRlbmFuY2UsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ29uZmlndXJlIGluaXRpYWwgc2Vzc2lvbiBzdGF0ZVxuICogLSBQZXJmb3JtIHNldHVwIHRhc2tzIGJlZm9yZSB0aGUgc2Vzc2lvbiBzdGFydHNcbiAqIC0gQWRkIGNvbnRleHQgZm9yIG1haW50ZW5hbmNlIG9wZXJhdGlvbnNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGB0cmlnZ2VyYCAoJ2luaXQnIG9yICdtYWludGVuYW5jZScpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2V0dXBIb29rLCBzZXR1cE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gSGFuZGxlIGFsbCBzZXR1cCBldmVudHNcbiAqIGV4cG9ydCBkZWZhdWx0IHNldHVwSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTZXR1cCB0cmlnZ2VyZWQnLCB7IHRyaWdnZXI6IGlucHV0LnRyaWdnZXIgfSk7XG4gKiAgIHJldHVybiBzZXR1cE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBPbmx5IGhhbmRsZSBpbml0aWFsaXphdGlvblxuICogZXhwb3J0IGRlZmF1bHQgc2V0dXBIb29rKHsgbWF0Y2hlcjogJ2luaXQnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnSW5pdGlhbGl6aW5nIHNlc3Npb24nKTtcbiAqICAgcmV0dXJuIHNldHVwT3V0cHV0KHtcbiAqICAgICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnU2Vzc2lvbiBpbml0aWFsaXplZCB3aXRoIGN1c3RvbSBjb25maWd1cmF0aW9uJ1xuICogICAgIH1cbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3NldHVwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNldHVwXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4iLCAiLyoqXG4gKiBMb2dnZXIgc3lzdGVtIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyBzdHJ1Y3R1cmVkIGxvZ2dpbmcgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIG9wdGlvbmFsIGZpbGUgb3V0cHV0LlxuICogVGhlIGxvZ2dlciBpcyAqKnNpbGVudCBieSBkZWZhdWx0KiogdG8gYXZvaWQgaW50ZXJmZXJpbmcgd2l0aCBob29rIHByb3RvY29sXG4gKiAoc3Rkb3V0IGlzIHJlc2VydmVkIGZvciBKU09OIHJlc3BvbnNlcywgc3RkZXJyIG1heSBjb25mbGljdCB3aXRoIENsYXVkZSBDb2RlKS5cbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBsb2cgZXZlbnRzXG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAqICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gJHtldmVudC5ob29rVHlwZX06ICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAqIH0pO1xuICpcbiAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICogdW5zdWJzY3JpYmUoKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmltcG9ydCB7IGNsb3NlU3luYywgZXhpc3RzU3luYywgbWtkaXJTeW5jLCBvcGVuU3luYywgd3JpdGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG4vKipcbiAqIEFsbCBsb2cgbGV2ZWxzIGluIG9yZGVyIG9mIHNldmVyaXR5IChsb3dlc3QgdG8gaGlnaGVzdCkuXG4gKi9cbmV4cG9ydCBjb25zdCBMT0dfTEVWRUxTID0gW1wiZGVidWdcIiwgXCJpbmZvXCIsIFwid2FyblwiLCBcImVycm9yXCJdO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIENsYXNzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIExvZ2dlciBmb3IgQ2xhdWRlIENvZGUgaG9va3Mgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIGZpbGUgb3V0cHV0LlxuICpcbiAqICMjIEtleSBCZWhhdmlvcnNcbiAqXG4gKiB8IENvbmZpZ3VyYXRpb24gfCBCZWhhdmlvciB8XG4gKiB8LS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLXxcbiAqIHwgTm8gY29uZmlnIChkZWZhdWx0KSB8ICoqU2lsZW50KiogLSBubyBvdXRwdXQgYW55d2hlcmUgfFxuICogfCBgQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVgIGVudiB2YXIgfCBBcHBlbmQgSlNPTiBsaW5lcyB0byBmaWxlIHxcbiAqIHwgYC5vbihsZXZlbCwgaGFuZGxlcilgIHJlZ2lzdGVyZWQgfCBFdmVudHMgZGVsaXZlcmVkIHRvIGhhbmRsZXJzIG9ubHkgfFxuICogfCBNdWx0aXBsZSBkZXN0aW5hdGlvbnMgfCBBbGwgZGVzdGluYXRpb25zIHJlY2VpdmUgZXZlbnRzIHxcbiAqXG4gKiAjIyBJbXBvcnRhbnQgTm90ZXNcbiAqXG4gKiAtICoqTmV2ZXIgb3V0cHV0cyB0byBzdGRvdXQqKiAocmVzZXJ2ZWQgZm9yIEpTT04gaG9vayByZXNwb25zZSlcbiAqIC0gKipOZXZlciBvdXRwdXRzIHRvIHN0ZGVycioqIChtYXkgaW50ZXJmZXJlIHdpdGggQ2xhdWRlIENvZGUgZXJyb3IgaGFuZGxpbmcpXG4gKiAtIEZpbGUgb3V0cHV0IHVzZXMgSlNPTiBMaW5lcyBmb3JtYXQgZm9yIGVhc3kgcGFyc2luZ1xuICogLSBgLm9uKGxldmVsLCBoYW5kbGVyKWAgcmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvblxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGV2ZW50cyBhdCBzcGVjaWZpYyBsZXZlbFxuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiB7XG4gKiAgIHNlbmRBbGVydChldmVudC5tZXNzYWdlKTtcbiAqIH0pO1xuICpcbiAqIC8vIExvZyB3aXRoaW4gYSBob29rIGhhbmRsZXJcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIud2FybignQWJvdXQgdG8gdmFsaWRhdGUgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmVkIGV2ZW50IGhhbmRsZXJzIGJ5IGxvZyBsZXZlbC5cbiAgICAgKi9cbiAgICBoYW5kbGVycyA9IG5ldyBNYXAoKTtcbiAgICAvKipcbiAgICAgKiBGaWxlIGRlc2NyaXB0b3IgZm9yIGxvZyBmaWxlIG91dHB1dC5cbiAgICAgKiBMYXppbHkgaW5pdGlhbGl6ZWQgb24gZmlyc3Qgd3JpdGUuXG4gICAgICovXG4gICAgbG9nRmlsZUZkID0gbnVsbDtcbiAgICAvKipcbiAgICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgaWYgY29uZmlndXJlZC5cbiAgICAgKi9cbiAgICBsb2dGaWxlUGF0aCA9IG51bGw7XG4gICAgLyoqXG4gICAgICogV2hldGhlciBmaWxlIGluaXRpYWxpemF0aW9uIGhhcyBiZWVuIGF0dGVtcHRlZC5cbiAgICAgKi9cbiAgICBmaWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAgICovXG4gICAgY3VycmVudEhvb2tUeXBlO1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgaG9vayBpbnB1dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAgICovXG4gICAgY3VycmVudElucHV0O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgTG9nZ2VyIGluc3RhbmNlLlxuICAgICAqXG4gICAgICogVHlwaWNhbGx5IHlvdSBzaG91bGQgdXNlIHRoZSBleHBvcnRlZCBgbG9nZ2VyYCBzaW5nbGV0b24gcmF0aGVyIHRoYW5cbiAgICAgKiBjcmVhdGluZyBuZXcgaW5zdGFuY2VzLlxuICAgICAqIEBwYXJhbSBjb25maWcgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gVXNlIHNpbmdsZXRvbiAocmVjb21tZW5kZWQpXG4gICAgICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAgICAgKlxuICAgICAqIC8vIE9yIGNyZWF0ZSBjdXN0b20gaW5zdGFuY2VcbiAgICAgKiBjb25zdCBjdXN0b21Mb2dnZXIgPSBuZXcgTG9nZ2VyKHsgbG9nRmlsZVBhdGg6ICcvdmFyL2xvZy9ob29rcy5sb2cnIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbmZpZyA9IHt9KSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnMgbWFwIGZvciBlYWNoIGxldmVsXG4gICAgICAgIGZvciAoY29uc3QgbGV2ZWwgb2YgTE9HX0xFVkVMUykge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVycy5zZXQobGV2ZWwsIG5ldyBTZXQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IGxvZyBmaWxlIHBhdGggZnJvbSBjb25maWcgb3IgZW52aXJvbm1lbnRcbiAgICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGNvbmZpZy5sb2dGaWxlUGF0aCA/PyBwcm9jZXNzLmVudi5DTEFVREVfQ09ERV9IT09LU19MT0dfRklMRSA/PyBudWxsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRoYXQgaXMgdHlwaWNhbGx5IG9ubHkgdXNlZnVsXG4gICAgICogZHVyaW5nIGRldmVsb3BtZW50IG9yIHRyb3VibGVzaG9vdGluZy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBkZWJ1ZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgaW5wdXRTaXplOiAyNTYgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZGVidWcobWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJkZWJ1Z1wiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIGxpa2UgaG9vayBpbnZvY2F0aW9ucywgc3VjY2Vzc2Z1bFxuICAgICAqIGNvbXBsZXRpb25zLCBvciBzdGF0ZSBjaGFuZ2VzLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGluZm8gbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmluZm8oJ1Nlc3Npb24gc3RhcnRlZCcsIHsgc291cmNlOiAnc3RhcnR1cCcsIHNlc3Npb25JZDogJ2FiYzEyMycgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgaW5mbyhtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImluZm9cIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgaXNzdWVzIGJ1dCBkb24ndCBwcmV2ZW50XG4gICAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgd2FybmluZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIud2FybignRGVwcmVjYXRlZCBob29rIHBhdHRlcm4gZGV0ZWN0ZWQnLCB7IHBhdHRlcm46ICdsZWdhY3lNYXRjaGVyJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICB3YXJuKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwid2FyblwiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBlcnJvciBjb25kaXRpb25zIHRoYXQgcmVxdWlyZSBhdHRlbnRpb24gYnV0IHdlcmUgaGFuZGxlZFxuICAgICAqIGdyYWNlZnVsbHkuIEZvciBleGNlcHRpb25zLCBwcmVmZXIge0BsaW5rIGxvZ0Vycm9yfS5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBlcnJvciBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byB2YWxpZGF0ZSB0b29sIGlucHV0JywgeyB0b29sTmFtZTogJ0Jhc2gnLCByZWFzb246ICdlbXB0eSBjb21tYW5kJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBlcnJvcihtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImVycm9yXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICAgKlxuICAgICAqIFVzZSB0aGlzIG1ldGhvZCB3aGVuIGxvZ2dpbmcgY2F1Z2h0IGV4Y2VwdGlvbnMgdG8gY2FwdHVyZSB0aGUgZnVsbFxuICAgICAqIGVycm9yIGNvbnRleHQgaW5jbHVkaW5nIG5hbWUsIG1lc3NhZ2UsIHN0YWNrIHRyYWNlLCBhbmQgY2F1c2UgY2hhaW4uXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHRyeSB7XG4gICAgICogICBhd2FpdCBkYW5nZXJvdXNPcGVyYXRpb24oKTtcbiAgICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICAgKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdGYWlsZWQgdG8gZXhlY3V0ZSBkYW5nZXJvdXMgb3BlcmF0aW9uJywge1xuICAgICAqICAgICBvcGVyYXRpb246ICdkZWxldGUnLFxuICAgICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgICAqICAgfSk7XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGxvZ0Vycm9yKGVycm9yLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGVycm9ySW5mbyA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvcik7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbDogXCJlcnJvclwiLFxuICAgICAgICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgICAgICAgIGVycm9yOiBlcnJvckluZm8sXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZXMgYSBoYW5kbGVyIHRvIGxvZyBldmVudHMgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKlxuICAgICAqIFRoZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBsb2cgZXZlbnQgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBoYW5kbGVyXG4gICAgICogaXMgbm8gbG9uZ2VyIG5lZWRlZC5cbiAgICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgbG9nIGxldmVsIHRvIHN1YnNjcmliZSB0b1xuICAgICAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBldmVudFxuICAgICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgdGhlIGhhbmRsZXJcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBTdWJzY3JpYmUgdG8gZXJyb3IgZXZlbnRzXG4gICAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gICAgICogICBjb25zb2xlLmVycm9yKGBbJHtldmVudC5ob29rVHlwZX1dICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAgICAgKiAgIGlmIChldmVudC5lcnJvcikge1xuICAgICAqICAgICBjb25zb2xlLmVycm9yKGV2ZW50LmVycm9yLnN0YWNrKTtcbiAgICAgKiAgIH1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICAgICAqIHVuc3Vic2NyaWJlKCk7XG4gICAgICogYGBgXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIGxpYnJhcnlcbiAgICAgKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAgICAgKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubygpO1xuICAgICAqXG4gICAgICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBvbihsZXZlbCwgaGFuZGxlcikge1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQobGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgbGV2ZWxIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGxldmVsSGFuZGxlcnM/LmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqXG4gICAgICogVGhpcyBpcyBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBiZWZvcmUgaW52b2tpbmcgaG9vayBoYW5kbGVycy5cbiAgICAgKiBZb3UgdHlwaWNhbGx5IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIGRpcmVjdGx5LlxuICAgICAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSB0eXBlIG9mIGhvb2sgYmVpbmcgZXhlY3V0ZWRcbiAgICAgKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCBkYXRhXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgc2V0Q29udGV4dChob29rVHlwZSwgaW5wdXQpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSBob29rVHlwZTtcbiAgICAgICAgdGhpcy5jdXJyZW50SW5wdXQgPSBpbnB1dDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dC5cbiAgICAgKlxuICAgICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBjbGVhckNvbnRleHQoKSB7XG4gICAgICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29uZmlndXJlcyB0aGUgbG9nIGZpbGUgcGF0aCBhdCBydW50aW1lLlxuICAgICAqXG4gICAgICogQ2FsbCB0aGlzIHRvIGVuYWJsZSBvciBjaGFuZ2UgZmlsZSBsb2dnaW5nLiBTZXR0aW5nIHRvIGBudWxsYCBkaXNhYmxlc1xuICAgICAqIGZpbGUgbG9nZ2luZyAoYnV0IGRvZXNuJ3QgY2xvc2UgZXhpc3RpbmcgZmlsZSBoYW5kbGUgaW1tZWRpYXRlbHkpLlxuICAgICAqIEBwYXJhbSBmaWxlUGF0aCAtIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBvciBudWxsIHRvIGRpc2FibGVcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBFbmFibGUgZmlsZSBsb2dnaW5nIGF0IHJ1bnRpbWVcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZSgnL3Zhci9sb2cvY2xhdWRlLWhvb2tzLmxvZycpO1xuICAgICAqXG4gICAgICogLy8gRGlzYWJsZSBmaWxlIGxvZ2dpbmdcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZShudWxsKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBzZXRMb2dGaWxlKGZpbGVQYXRoKSB7XG4gICAgICAgIC8vIENsb3NlIGV4aXN0aW5nIGZpbGUgaWYgb3BlblxuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZXMgYWxsIHJlc291cmNlcyBoZWxkIGJ5IHRoZSBsb2dnZXIuXG4gICAgICpcbiAgICAgKiBDYWxsIHRoaXMgZHVyaW5nIGdyYWNlZnVsIHNodXRkb3duIHRvIGVuc3VyZSBhbGwgbG9nIGRhdGEgaXMgZmx1c2hlZC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgICAqICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgICogfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlcmUgYXJlIGFueSBhY3RpdmUgaGFuZGxlcnMgb3IgZGVzdGluYXRpb25zLlxuICAgICAqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIGFueSBoYW5kbGVycyBhcmUgcmVnaXN0ZXJlZCBvciBmaWxlIGxvZ2dpbmcgaXMgZW5hYmxlZC5cbiAgICAgKiBAcmV0dXJucyBXaGV0aGVyIHRoZSBsb2dnZXIgaGFzIGFueSBhY3RpdmUgb3V0cHV0IGRlc3RpbmF0aW9uc1xuICAgICAqL1xuICAgIGhhc0Rlc3RpbmF0aW9ucygpIHtcbiAgICAgICAgZm9yIChjb25zdCBoYW5kbGVycyBvZiB0aGlzLmhhbmRsZXJzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoaGFuZGxlcnMuc2l6ZSA+IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMubG9nRmlsZVBhdGggIT09IG51bGw7XG4gICAgfVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBQcml2YXRlIE1ldGhvZHNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLyoqXG4gICAgICogRW1pdHMgYSBsb2cgZXZlbnQuXG4gICAgICogQHBhcmFtIGxldmVsIC0gVGhlIHNldmVyaXR5IGxldmVsIG9mIHRoZSBldmVudFxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGxvZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHQgZGF0YVxuICAgICAqL1xuICAgIGVtaXQobGV2ZWwsIG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGxldmVsLFxuICAgICAgICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgICAgICAgIGNvbnRleHQsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRGVsaXZlcnMgYW4gZXZlbnQgdG8gYWxsIHJlZ2lzdGVyZWQgZGVzdGluYXRpb25zLlxuICAgICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gZGVsaXZlclxuICAgICAqL1xuICAgIGRlbGl2ZXJFdmVudChldmVudCkge1xuICAgICAgICAvLyBEZWxpdmVyIHRvIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChldmVudC5sZXZlbCk7XG4gICAgICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgbGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXIoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBoYW5kbGVyIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBXcml0ZSB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICAgICAgdGhpcy53cml0ZVRvRmlsZShldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdyaXRlcyBhbiBldmVudCB0byB0aGUgbG9nIGZpbGUuXG4gICAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byB3cml0ZVxuICAgICAqL1xuICAgIHdyaXRlVG9GaWxlKGV2ZW50KSB7XG4gICAgICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gTGF6eSBpbml0aWFsaXphdGlvbiBvZiBmaWxlIGhhbmRsZVxuICAgICAgICBpZiAoIXRoaXMuZmlsZUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGaWxlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkID09PSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbGluZSA9IGAke0pTT04uc3RyaW5naWZ5KGV2ZW50KX1cXG5gO1xuICAgICAgICAgICAgd3JpdGVTeW5jKHRoaXMubG9nRmlsZUZkLCBsaW5lKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSB3cml0ZSBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgICAgICAgIC8vIFRoaXMgZm9sbG93cyB0aGUgcmlzayBtaXRpZ2F0aW9uOiBcIkdyYWNlZnVsIGRlZ3JhZGF0aW9uIC0gbG9nIHdyaXRlXG4gICAgICAgICAgICAvLyBmYWlsdXJlcyBhcmUgc2lsZW50bHkgaWdub3JlZCB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblwiXG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGxvZyBmaWxlIGZvciB3cml0aW5nLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWxlKCkge1xuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEVuc3VyZSBkaXJlY3RvcnkgZXhpc3RzXG4gICAgICAgICAgICBjb25zdCBkaXIgPSBkaXJuYW1lKHRoaXMubG9nRmlsZVBhdGgpO1xuICAgICAgICAgICAgaWYgKCFleGlzdHNTeW5jKGRpcikpIHtcbiAgICAgICAgICAgICAgICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE9wZW4gZmlsZSBmb3IgYXBwZW5kaW5nXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG9wZW5TeW5jKHRoaXMubG9nRmlsZVBhdGgsIFwiYVwiKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSBpbml0aWFsaXphdGlvbiBlcnJvcnNcbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyBzdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uIGZyb20gYW4gdW5rbm93biBlcnJvci5cbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tXG4gICAgICogQHJldHVybnMgU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGV4dHJhY3RFcnJvckluZm8oZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogZXJyb3IubmFtZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgICAgIHN0YWNrOiBlcnJvci5zdGFjayxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBFeHRyYWN0IGNhdXNlIGNoYWluIGlmIHByZXNlbnRcbiAgICAgICAgICAgIGlmIChlcnJvci5jYXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgaW5mby5jYXVzZSA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvci5jYXVzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaW5mbztcbiAgICAgICAgfVxuICAgICAgICAvLyBIYW5kbGUgbm9uLUVycm9yIHZhbHVlc1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogXCJVbmtub3duRXJyb3JcIixcbiAgICAgICAgICAgIG1lc3NhZ2U6IFN0cmluZyhlcnJvciksXG4gICAgICAgIH07XG4gICAgfVxufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2luZ2xldG9uIEV4cG9ydFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBHbG9iYWwgbG9nZ2VyIGluc3RhbmNlIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBVc2UgdGhpcyBzaW5nbGV0b24gZm9yIGFsbCBsb2dnaW5nIHdpdGhpbiBob29rcy4gVGhlIGxvZ2dlciBpcyBjb25maWd1cmVkXG4gKiB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCBzdXBwb3J0cyBldmVudCBzdWJzY3JpcHRpb24gZm9yIGN1c3RvbVxuICogZGVzdGluYXRpb25zLlxuICpcbiAqICMjIENvbmZpZ3VyYXRpb25cbiAqXG4gKiB8IEVudmlyb25tZW50IFZhcmlhYmxlIHwgRGVzY3JpcHRpb24gfFxuICogfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfFxuICogfCBgQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVgIHwgUGF0aCB0byBsb2cgZmlsZSAoSlNPTiBMaW5lcyBmb3JtYXQpIHxcbiAqXG4gKiAjIyBVc2FnZSBpbiBIb29rc1xuICpcbiAqIFRoZSBsb2dnZXIgaXMgcGFzc2VkIHRvIGhvb2sgaGFuZGxlcnMgdmlhIGNvbnRleHQgZm9yIGNvbnZlbmllbmNlOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIud2FybignVmFsaWRhdGluZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogIyMgRXh0ZXJuYWwgSW50ZWdyYXRpb25cbiAqXG4gKiBTdWJzY3JpYmUgdG8gZXZlbnRzIHRvIGZvcndhcmQgbG9ncyB0byBleHRlcm5hbCBzeXN0ZW1zOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAqXG4gKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubyh7IGxldmVsOiAnZGVidWcnIH0pO1xuICpcbiAqIGxvZ2dlci5vbignZGVidWcnLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZGVidWcoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRGlyZWN0IHVzYWdlXG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGxvZ2dlci5pbmZvKCdTdGFydGluZyBvcGVyYXRpb24nKTtcbiAqIGxvZ2dlci53YXJuKCdSZXNvdXJjZSBsaW1pdCBhcHByb2FjaGluZycsIHsgdXNhZ2U6IDAuOSB9KTtcbiAqXG4gKiB0cnkge1xuICogICBhd2FpdCByaXNreU9wZXJhdGlvbigpO1xuICogfSBjYXRjaCAoZXJyKSB7XG4gKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdSaXNreSBvcGVyYXRpb24gZmFpbGVkJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcbiIsICIvKipcbiAqIE91dHB1dCB0eXBlcyBhbmQgYnVpbGRlcnMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGUtc2FmZSBvdXRwdXQgYnVpbGRlciBmdW5jdGlvbnMgZm9yIGFsbCAxMiBob29rIHR5cGVzLiBFYWNoIGJ1aWxkZXJcbiAqIGFjY2VwdHMgb3B0aW9ucyB0aGF0IG1hdGNoIHRoZSB3aXJlIGZvcm1hdCBleHBlY3RlZCBieSBDbGF1ZGUgQ29kZSwgd2l0aCB0eXBlc1xuICogZGVyaXZlZCBmcm9tIHRoZSBDbGF1ZGUgQWdlbnQgU0RLJ3MgYFN5bmNIb29rSlNPTk91dHB1dGAgdHlwZS5cbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICogQG1vZHVsZVxuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGl0IENvZGUgQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEV4aXQgY29kZXMgdXNlZCBieSBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiB8IEV4aXQgQ29kZSB8IE5hbWUgfCBXaGVuIFVzZWQgfCBDbGF1ZGUgQ29kZSBCZWhhdmlvciB8XG4gKiB8LS0tLS0tLS0tLS18LS0tLS0tfC0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXxcbiAqIHwgMCB8IFN1Y2Nlc3MgfCBIYW5kbGVyIHJldHVybnMgbm9ybWFsbHkgfCBDb250aW51ZSwgcGFyc2Ugc3Rkb3V0IGFzIEpTT04gfFxuICogfCAxIHwgRXJyb3IgfCBJbnZhbGlkIGlucHV0LCBub24tYmxvY2tpbmcgZXJyb3IgfCBOb24tYmxvY2tpbmcsIHN0ZGVyciB0byB1c2VyIG9ubHkgfFxuICogfCAyIHwgQmxvY2sgfCBIYW5kbGVyIHRocm93cyBPUiBgc3RvcFJlYXNvbmAgc2V0IHwgQmxvY2tpbmcsIHN0ZGVyciBzaG93biB0byBDbGF1ZGUgfFxuICovXG5leHBvcnQgY29uc3QgRVhJVF9DT0RFUyA9IHtcbiAgICAvKiogSGFuZGxlciBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LiBDbGF1ZGUgQ29kZSBwYXJzZXMgc3Rkb3V0IGFzIEpTT04uICovXG4gICAgU1VDQ0VTUzogMCxcbiAgICAvKiogTm9uLWJsb2NraW5nIGVycm9yIG9jY3VycmVkIChlLmcuLCBpbnZhbGlkIGlucHV0KS4gc3RkZXJyIHNob3duIHRvIHVzZXIgb25seS4gKi9cbiAgICBFUlJPUjogMSxcbiAgICAvKiogSGFuZGxlciB0aHJldyBleGNlcHRpb24gT1IgYmxvY2tpbmcgYWN0aW9uIHJlcXVlc3RlZC4gc3RkZXJyIHNob3duIHRvIENsYXVkZS4gKi9cbiAgICBCTE9DSzogMixcbn07XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBPdXRwdXQgQnVpbGRlciBGYWN0b3JpZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCBoYXZlIGhvb2tTcGVjaWZpY091dHB1dCB3aXRoIGEgaG9va0V2ZW50TmFtZSBkaXNjcmltaW5hdG9yLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+IHtcbiAgICAgICAgY29uc3QgeyBob29rU3BlY2lmaWNPdXRwdXQsIC4uLnJlc3QgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHN0ZG91dCA9IGhvb2tTcGVjaWZpY091dHB1dCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IHsgLi4ucmVzdCwgaG9va1NwZWNpZmljT3V0cHV0OiB7IGhvb2tFdmVudE5hbWU6IGhvb2tUeXBlLCAuLi5ob29rU3BlY2lmaWNPdXRwdXQgfSB9XG4gICAgICAgICAgICA6IHJlc3Q7XG4gICAgICAgIHJldHVybiB7IF90eXBlOiBob29rVHlwZSwgc3Rkb3V0IH07XG4gICAgfTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCBvbmx5IHVzZSBDb21tb25PcHRpb25zIChzaW1wbGUgcGFzc3Rocm91Z2gpLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiBvcHRpb25zLFxuICAgIH0pO1xufVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IHVzZSBkZWNpc2lvbi1iYXNlZCBvcHRpb25zIChTdG9wLCBTdWJhZ2VudFN0b3ApLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4gKHtcbiAgICAgICAgX3R5cGU6IGhvb2tUeXBlLFxuICAgICAgICBzdGRvdXQ6IG9wdGlvbnMsXG4gICAgfSk7XG59XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQcmVUb29sVXNlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQcmVUb29sVXNlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0b29sIGV4ZWN1dGlvblxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfVxuICogfSk7XG4gKlxuICogLy8gRGVueSB3aXRoIHJlYXNvblxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2RlbnknLFxuICogICAgIHBlcm1pc3Npb25EZWNpc2lvblJlYXNvbjogJ0Rhbmdlcm91cyBjb21tYW5kIGRldGVjdGVkJ1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBbGxvdyB3aXRoIG1vZGlmaWVkIGlucHV0XG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnLFxuICogICAgIHVwZGF0ZWRJbnB1dDogeyBjb21tYW5kOiAnbHMgLWxhJyB9XG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwcmVUb29sVXNlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQcmVUb29sVXNlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdFRvb2xVc2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RUb29sVXNlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBZGQgY29udGV4dCBhZnRlciBhIGZpbGUgcmVhZFxuICogcG9zdFRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZpbGUgY29udGFpbnMgc2Vuc2l0aXZlIGRhdGEnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwb3N0VG9vbFVzZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUG9zdFRvb2xVc2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0VG9vbFVzZUZhaWx1cmUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdUcnkgdXNpbmcgYSBkaWZmZXJlbnQgYXBwcm9hY2gnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBvc3RUb29sVXNlRmFpbHVyZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFVzZXJQcm9tcHRTdWJtaXQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1RoaXMgcHJvamVjdCB1c2VzIFR5cGVTY3JpcHQgc3RyaWN0IG1vZGUnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB1c2VyUHJvbXB0U3VibWl0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJVc2VyUHJvbXB0U3VibWl0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXNzaW9uU3RhcnRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHNlc3Npb25TdGFydE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiBKU09OLnN0cmluZ2lmeSh7IHByb2plY3Q6ICdteS1wcm9qZWN0JyB9KVxuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2Vzc2lvblN0YXJ0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJTZXNzaW9uU3RhcnRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXNzaW9uRW5kIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXNzaW9uRW5kT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzZXNzaW9uRW5kT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2Vzc2lvbkVuZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiU2Vzc2lvbkVuZFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN0b3AgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN0b3BPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRoZSBzdG9wXG4gKiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAqXG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3RvcE91dHB1dCh7XG4gKiAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICByZWFzb246ICdUaGVyZSBhcmUgdW5jb21taXR0ZWQgY2hhbmdlcydcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdG9wT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihcIlN0b3BcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdWJhZ2VudFN0YXJ0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdWJhZ2VudFN0YXJ0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGb2N1cyBvbiBmaW5kaW5nIHBhdHRlcm5zJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3ViYWdlbnRTdGFydE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU3ViYWdlbnRTdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN1YmFnZW50U3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3ViYWdlbnRTdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1Rhc2sgbm90IGNvbXBsZXRlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoXCJTdWJhZ2VudFN0b3BcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBOb3RpZmljYXRpb24gaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIE5vdGlmaWNhdGlvbk91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgYWJvdXQgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdOb3RpZmljYXRpb24gZm9yd2FyZGVkIHRvIFNsYWNrICNhbGVydHMgY2hhbm5lbCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU3VwcHJlc3MgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHsgc3VwcHJlc3NPdXRwdXQ6IHRydWUgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IG5vdGlmaWNhdGlvbk91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiTm90aWZpY2F0aW9uXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlQ29tcGFjdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlQ29tcGFjdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgIHN5c3RlbU1lc3NhZ2U6ICdSZW1lbWJlcjogc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwcmVDb21wYWN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJQcmVDb21wYWN0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUGVybWlzc2lvblJlcXVlc3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBdXRvLWFwcHJvdmVcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHsgYmVoYXZpb3I6ICdhbGxvdycgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBdXRvLWFwcHJvdmUgd2l0aCBtb2RpZmllZCBpbnB1dFxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdhbGxvdycsXG4gKiAgICAgICB1cGRhdGVkSW5wdXQ6IHsgZmlsZV9wYXRoOiAnL3NhZmUvcGF0aCcgfVxuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1kZW55XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7XG4gKiAgICAgICBiZWhhdmlvcjogJ2RlbnknLFxuICogICAgICAgbWVzc2FnZTogJ05vdCBhbGxvd2VkJyxcbiAqICAgICAgIGludGVycnVwdDogdHJ1ZVxuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gRmFsbCB0aHJvdWdoIHRvIG5vcm1hbCBwcm9tcHRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcGVybWlzc2lvblJlcXVlc3RPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBlcm1pc3Npb25SZXF1ZXN0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2V0dXAgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNldHVwT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBZGQgY29udGV4dCBkdXJpbmcgc2V0dXBcbiAqIHNldHVwT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdQcm9qZWN0IGluaXRpYWxpemVkIHdpdGggY3VzdG9tIHNldHRpbmdzJ1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBTaW1wbGUgcGFzc3Rocm91Z2hcbiAqIHNldHVwT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2V0dXBPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlNldHVwXCIpO1xuIiwgIi8qKlxuICogUnVudGltZSBtb2R1bGUgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIEhhbmRsZXMgc3RkaW4vc3Rkb3V0L2V4aXQgY29kZSBzZW1hbnRpY3MgZm9yIGNvbXBpbGVkIGhvb2sgZXhlY3V0aW9uLlxuICogVGhpcyBtb2R1bGUgaXMgdGhlIGNvcmUgb3JjaGVzdHJhdG9yIHRoYXQ6XG4gKiAtIFJlYWRzIEpTT04gZnJvbSBzdGRpbiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAtIEludm9rZXMgdGhlIGhvb2sgaGFuZGxlclxuICogLSBXcml0ZXMgb3V0cHV0IHRvIHN0ZG91dFxuICogLSBNYW5hZ2VzIGV4aXQgY29kZXNcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBhIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCBteUhvb2sgZnJvbSAnLi9teS1ob29rLmpzJztcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IGZyb20gXCIuL2Vudi5qc1wiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vbG9nZ2VyLmpzXCI7XG5pbXBvcnQgeyBFWElUX0NPREVTIH0gZnJvbSBcIi4vb3V0cHV0cy5qc1wiO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RkaW4vU3Rkb3V0IEhhbmRsaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIFJlYWRzIGFsbCBkYXRhIGZyb20gc3RkaW4uXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tcGxldGUgc3RkaW4gY29udGVudFxuICovXG5hc3luYyBmdW5jdGlvbiByZWFkU3RkaW4oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgICAgIC8vIFNldCBlbmNvZGluZyBmaXJzdCB0byBlbnN1cmUgZGF0YSBldmVudHMgcmVjZWl2ZSBzdHJpbmdzXG4gICAgICAgIHByb2Nlc3Muc3RkaW4uc2V0RW5jb2RpbmcoXCJ1dGYtOFwiKTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoY2h1bmtzLmpvaW4oXCJcIikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG4vKipcbiAqIFBhcnNlcyBzdGRpbiBKU09OIGlucHV0LlxuICogQHBhcmFtIHN0ZGluQ29udGVudCAtIFJhdyBzdGRpbiBjb250ZW50XG4gKiBAcmV0dXJucyBQYXJzZWQgaW5wdXQgKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogQHRocm93cyBFcnJvciBpZiBKU09OIGlzIG1hbGZvcm1lZFxuICovXG5mdW5jdGlvbiBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KSB7XG4gICAgLy8gUGFyc2UgSlNPTiAtIGlucHV0IHVzZXMgd2lyZSBmb3JtYXQgKHNuYWtlX2Nhc2UpIGRpcmVjdGx5XG4gICAgY29uc3QgcmF3SW5wdXQgPSBKU09OLnBhcnNlKHN0ZGluQ29udGVudCk7XG4gICAgcmV0dXJuIHJhd0lucHV0O1xufVxuLyoqXG4gKiBXcml0ZXMgaG9vayBvdXRwdXQgdG8gc3Rkb3V0LlxuICpcbiAqIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSBrZXlzIHBlciBDbGF1ZGUgQ29kZSBob29rIHNwZWNpZmljYXRpb24uXG4gKiBAcGFyYW0gb3V0cHV0IC0gVGhlIGhvb2sgb3V0cHV0IHRvIHdyaXRlXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1vdXRwdXQtc3RydWN0dXJlXG4gKi9cbmZ1bmN0aW9uIHdyaXRlU3Rkb3V0KG91dHB1dCkge1xuICAgIC8vIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSAtIG5vIHRyYW5zZm9ybWF0aW9uIG5lZWRlZFxuICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEpTT04uc3RyaW5naWZ5KG91dHB1dCkpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXJyb3IgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBlcnJvciBvdXRwdXQgZm9yIG1hbGZvcm1lZCBzdGRpbiBKU09OLlxuICogQHBhcmFtIGVycm9yIC0gVGhlIHBhcnNlIGVycm9yXG4gKiBAcmV0dXJucyBIb29rT3V0cHV0IHdpdGggZW1wdHkgc3Rkb3V0XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKSB7XG4gICAgbG9nZ2VyLmVycm9yKGBJbnZhbGlkIEpTT04gaW5wdXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIHJldHVybiB7IHN0ZG91dDoge30gfTtcbn1cbi8qKlxuICogV3JpdGVzIGhhbmRsZXIgZXJyb3Igc3RhY2t0cmFjZSB0byBzdGRlcnIgYW5kIGV4aXRzIHdpdGggY29kZSAyLlxuICpcbiAqIFdoZW4gYSBob29rIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbjpcbiAqIC0gU3RhY2t0cmFjZSAod2l0aCBzb3VyY2VtYXBzIGlmIGF2YWlsYWJsZSkgaXMgb3V0cHV0IHRvIHN0ZGVyclxuICogLSBQcm9jZXNzIGV4aXRzIHdpdGggY29kZSAyIChCTE9DSylcbiAqIC0gTm8gSlNPTiBpcyBvdXRwdXQgdG8gc3Rkb3V0XG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIGJ5IHRoZSBoYW5kbGVyXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcikge1xuICAgIC8vIFdyaXRlIHN0YWNrIHRyYWNlIHRvIHN0ZGVyciAoc291cmNlbWFwcyBhcmUgYXBwbGllZCBhdXRvbWF0aWNhbGx5IGJ5IE5vZGUuanMpXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZX1cXG5gKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke1N0cmluZyhlcnJvcil9XFxuYCk7XG4gICAgfVxuICAgIC8vIExvZyB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICBsb2dnZXIuZXJyb3IoYEhvb2sgaGFuZGxlciBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHQgYW5kIGNsb3NlXG4gICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgIGxvZ2dlci5jbG9zZSgpO1xuICAgIC8vIEV4aXQgd2l0aCBjb2RlIDIgKEJMT0NLKSAtIG5vIEpTT04gb3V0cHV0XG4gICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuQkxPQ0spO1xufVxuLyoqXG4gKiBDb252ZXJ0cyBhIFNwZWNpZmljSG9va091dHB1dCB0byBIb29rT3V0cHV0IGZvciB3aXJlIGZvcm1hdC5cbiAqXG4gKiBTcGVjaWZpY0hvb2tPdXRwdXQgdHlwZXMgaGF2ZTogeyBfdHlwZSwgZXhpdENvZGUsIHN0ZG91dCwgc3RkZXJyPyB9XG4gKiBIb29rT3V0cHV0IGhhczogeyBleGl0Q29kZSwgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqXG4gKiBTaW5jZSBvdXRwdXQgYnVpbGRlcnMgbm93IHByb2R1Y2Ugd2lyZS1mb3JtYXQgZGlyZWN0bHksIHRoaXMgZnVuY3Rpb25cbiAqIHNpbXBseSBzdHJpcHMgdGhlIGBfdHlwZWAgZGlzY3JpbWluYXRvciBmaWVsZC5cbiAqIEBwYXJhbSBzcGVjaWZpY091dHB1dCAtIFRoZSBzcGVjaWZpYyBvdXRwdXQgZnJvbSBhIGhvb2sgaGFuZGxlclxuICogQHJldHVybnMgSG9va091dHB1dCByZWFkeSBmb3Igc2VyaWFsaXphdGlvblxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gcHJlVG9vbFVzZU91dHB1dCh7IGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfSB9KTtcbiAqIGNvbnN0IGhvb2tPdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAqIC8vIGhvb2tPdXRwdXQ6IHsgZXhpdENvZGU6IDAsIHN0ZG91dDogeyBob29rU3BlY2lmaWNPdXRwdXQ6IHsgLi4uIH0gfSB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpIHtcbiAgICByZXR1cm4geyBzdGRvdXQ6IHNwZWNpZmljT3V0cHV0LnN0ZG91dCB9O1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhlY3V0ZSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeGVjdXRlcyBhIGhvb2sgaGFuZGxlciB3aXRoIGZ1bGwgcnVudGltZSBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgdGhhdCBjb21waWxlZCBob29rcyB1c2UuIFdoZW4gYSBjb21waWxlZCBob29rXG4gKiBydW5zIGFzIGEgQ0xJOlxuICpcbiAqIDEuIFJlYWRzIGFsbCBzdGRpblxuICogMi4gUGFyc2VzIEpTT04gKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogMy4gU2V0cyB1cCBsb2dnZXIgY29udGV4dCAoaG9va1R5cGUsIGlucHV0KVxuICogNC4gQ2FsbHMgaGFuZGxlciB3aXRoIGlucHV0IGFuZCBjb250ZXh0IChsb2dnZXIpXG4gKiA1LiBIYW5kbGVzIGFueSBlcnJvcnMsIGxvZ3MgdGhlbVxuICogNi4gV3JpdGVzIEpTT04gdG8gc3Rkb3V0XG4gKiA3LiBDbG9zZXMgbG9nZ2VyXG4gKiA4LiBFeGl0cyB3aXRoIGFwcHJvcHJpYXRlIGNvZGVcbiAqIEBwYXJhbSBob29rRm4gLSBUaGUgaG9vayBmdW5jdGlvbiB0byBleGVjdXRlIChmcm9tIGhvb2sgZmFjdG9yeSlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBjb21waWxlZCBob29rIGZpbGVcbiAqIGltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvcnVudGltZSc7XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogY29uc3QgbXlIb29rID0gcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKlxuICogZXhlY3V0ZShteUhvb2spO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUoaG9va0ZuKSB7XG4gICAgbGV0IG91dHB1dDtcbiAgICB0cnkge1xuICAgICAgICAvLyBDaGVjayBmb3IgbG9nIGZpbGUgY29uZmlndXJhdGlvbiBjb25mbGljdHNcbiAgICAgICAgLy8gQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFIGlzIGluamVjdGVkIGJ5IHRoZSBDTEkgLS1sb2cgcGFyYW1ldGVyXG4gICAgICAgIC8vIENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFIGlzIHRoZSB1c2VyJ3MgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAgICAgICAgY29uc3QgY2xpTG9nRmlsZSA9IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0NMSV9MT0dfRklMRTtcbiAgICAgICAgY29uc3QgZW52TG9nRmlsZSA9IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFO1xuICAgICAgICBpZiAoY2xpTG9nRmlsZSAhPT0gdW5kZWZpbmVkICYmIGVudkxvZ0ZpbGUgIT09IHVuZGVmaW5lZCAmJiBjbGlMb2dGaWxlICE9PSBlbnZMb2dGaWxlKSB7XG4gICAgICAgICAgICAvLyBXcml0ZSBlcnJvciB0byBzdGRlcnIgYW5kIGV4aXQgd2l0aCBlcnJvciBjb2RlXG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgTG9nIGZpbGUgY29uZmlndXJhdGlvbiBjb25mbGljdDogQ0xJIC0tbG9nPVwiJHtjbGlMb2dGaWxlfVwiIHZzIENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFPVwiJHtlbnZMb2dGaWxlfVwiLiBgICtcbiAgICAgICAgICAgICAgICBcIlVzZSBvbmx5IG9uZSBtZXRob2QgdG8gY29uZmlndXJlIGhvb2sgbG9nZ2luZy5cXG5cIik7XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgQ0xJIGxvZyBmaWxlIGlzIHNldCwgY29uZmlndXJlIHRoZSBsb2dnZXJcbiAgICAgICAgaWYgKGNsaUxvZ0ZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbG9nZ2VyLnNldExvZ0ZpbGUoY2xpTG9nRmlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVhZCBhbmQgcGFyc2Ugc3RkaW5cbiAgICAgICAgbGV0IHN0ZGluQ29udGVudDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHN0ZGluQ29udGVudCA9IGF3YWl0IHJlYWRTdGRpbigpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVycm9yLCBcIkZhaWxlZCB0byByZWFkIHN0ZGluXCIpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFBhcnNlIGFuZCB0cmFuc2Zvcm0gaW5wdXRcbiAgICAgICAgbGV0IGlucHV0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaW5wdXQgPSBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2dFcnJvcihlcnJvciwgXCJGYWlsZWQgdG8gcGFyc2Ugc3RkaW4gSlNPTlwiKTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgbG9nZ2VyIGNvbnRleHRcbiAgICAgICAgY29uc3QgaG9va0V2ZW50TmFtZSA9IGhvb2tGbi5ob29rRXZlbnROYW1lO1xuICAgICAgICBsb2dnZXIuc2V0Q29udGV4dChob29rRXZlbnROYW1lLCBpbnB1dCk7XG4gICAgICAgIC8vIEJ1aWxkIGNvbnRleHQgLSBTZXNzaW9uU3RhcnQgaG9va3MgZ2V0IGV4dGVuZGVkIGNvbnRleHQgd2l0aCBwZXJzaXN0RW52VmFyXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBob29rRXZlbnROYW1lID09PSBcIlNlc3Npb25TdGFydFwiID8geyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIsIHBlcnNpc3RFbnZWYXJzIH0gOiB7IGxvZ2dlciB9O1xuICAgICAgICAvLyBFeGVjdXRlIGhhbmRsZXJcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gYXdhaXQgaG9va0ZuKGlucHV0LCBjb250ZXh0KTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gSGFuZGxlciB0aHJldyAtIG91dHB1dCBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdCB3aXRoIGNvZGUgMlxuICAgICAgICAgICAgLy8gVGhpcyBjYWxsIG5ldmVyIHJldHVybnMgKHByb2Nlc3MuZXhpdClcbiAgICAgICAgICAgIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZmluYWxseSB7XG4gICAgICAgIC8vIFdyaXRlIG91dHB1dCBpZiB3ZSBoYXZlIGl0XG4gICAgICAgIGlmIChvdXRwdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgd3JpdGVTdGRvdXQob3V0cHV0LnN0ZG91dCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHRcbiAgICAgICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgICAgICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgICAgLy8gRXhpdCB3aXRoIHN1Y2Nlc3MgKGhhbmRsZXIgZXJyb3JzIGV4aXQgdmlhIGhhbmRsZUhhbmRsZXJFcnJvciB3aXRoIGNvZGUgMilcbiAgICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfVxufVxuIiwgIi8qKlxuICogVHlwZSBndWFyZHMgYW5kIGhlbHBlciBmdW5jdGlvbnMgZm9yIENsYXVkZSBDb2RlIHRvb2wgaW5wdXRzLlxuICpcbiAqIFByb3ZpZGVzIHNhZmUgdHlwZSBuYXJyb3dpbmcgZm9yIHRvb2wgaW5wdXRzIGFuZCB1dGlsaXR5IGZ1bmN0aW9uc1xuICogZm9yIGNvbW1vbiBwYXR0ZXJucyBsaWtlIGZpbGUgcGF0aCBleHRyYWN0aW9uIGFuZCBjb250ZW50IGluc3BlY3Rpb24uXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHtcbiAqICAgcHJlVG9vbFVzZUhvb2ssXG4gKiAgIHByZVRvb2xVc2VPdXRwdXQsXG4gKiAgIGlzV3JpdGVUb29sLFxuICogICBnZXRGaWxlUGF0aCxcbiAqICAgaXNUc0ZpbGUsXG4gKiAgIGNoZWNrQ29udGVudEZvclBhdHRlcm5cbiAqIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdXcml0ZXxFZGl0fE11bHRpRWRpdCcgfSwgKGlucHV0KSA9PiB7XG4gKiAgIGNvbnN0IGZpbGVQYXRoID0gZ2V0RmlsZVBhdGgoaW5wdXQpO1xuICogICBpZiAoIWZpbGVQYXRoIHx8ICFpc1RzRmlsZShmaWxlUGF0aCkpIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHt9KTtcbiAqXG4gKiAgIGNvbnN0IHJlc3VsdCA9IGNoZWNrQ29udGVudEZvclBhdHRlcm4oaW5wdXQsIC9AdHMtZXhwZWN0LWVycm9yL2cpO1xuICogICBpZiAocmVzdWx0Py5pc0FkZGl0aW9uKSB7XG4gKiAgICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICAgICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2RlbnknLFxuICogICAgICAgICBwZXJtaXNzaW9uRGVjaXNpb25SZWFzb246IGBDYW5ub3QgYWRkOiAke3Jlc3VsdC5tYXRjaGVzLmpvaW4oJywgJyl9YFxuICogICAgICAgfVxuICogICAgIH0pO1xuICogICB9XG4gKlxuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKiBAbW9kdWxlXG4gKi9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGUgR3VhcmRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIFdyaXRlIHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIFdyaXRlVG9vbElucHV0LlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gY2hlY2tcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGlucHV0IGlzIGZvciBhIFdyaXRlIHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNXcml0ZVRvb2woaW5wdXQpKSB7XG4gKiAgIC8vIGlucHV0LnRvb2xfaW5wdXQgaXMgbm93IHR5cGVkIGFzIFdyaXRlVG9vbElucHV0XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQuZmlsZV9wYXRoKTtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5jb250ZW50KTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXcml0ZVRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIldyaXRlXCI7XG59XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIEVkaXQgdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgRWRpdFRvb2xJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYW4gRWRpdCB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzRWRpdFRvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQub2xkX3N0cmluZyk7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQubmV3X3N0cmluZyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRWRpdFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIkVkaXRcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgTXVsdGlFZGl0IHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIE11bHRpRWRpdFRvb2xJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBNdWx0aUVkaXQgdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc011bHRpRWRpdFRvb2woaW5wdXQpKSB7XG4gKiAgIGZvciAoY29uc3QgZWRpdCBvZiBpbnB1dC50b29sX2lucHV0LmVkaXRzKSB7XG4gKiAgICAgY29uc29sZS5sb2coYCR7ZWRpdC5vbGRfc3RyaW5nfSAtPiAke2VkaXQubmV3X3N0cmluZ31gKTtcbiAqICAgfVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc011bHRpRWRpdFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIk11bHRpRWRpdFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBhbnkgZmlsZS1tb2RpZnlpbmcgdG9vbCAoV3JpdGUsIEVkaXQsIG9yIE11bHRpRWRpdCkuXG4gKlxuICogVXNlIHRoaXMgd2hlbiB5b3UgbmVlZCB0byBoYW5kbGUgYWxsIGZpbGUgbW9kaWZpY2F0aW9ucyBnZW5lcmljYWxseS5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBXcml0ZSwgRWRpdCwgb3IgTXVsdGlFZGl0IHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNGaWxlTW9kaWZ5aW5nVG9vbChpbnB1dCkpIHtcbiAqICAgY29uc3QgZmlsZVBhdGggPSBnZXRGaWxlUGF0aChpbnB1dCk7IC8vIFdvcmtzIGZvciBhbGwgdGhyZWUgdHlwZXNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGaWxlTW9kaWZ5aW5nVG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiV3JpdGVcIiB8fCBpbnB1dC50b29sX25hbWUgPT09IFwiRWRpdFwiIHx8IGlucHV0LnRvb2xfbmFtZSA9PT0gXCJNdWx0aUVkaXRcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgUmVhZCB0b29sIGlucHV0cy5cbiAqXG4gKiBOYXJyb3dzIHRoZSBpbnB1dCB0eXBlIHRvIGluY2x1ZGUgYSB0eXBlZCBSZWFkVG9vbElucHV0LlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gY2hlY2tcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGlucHV0IGlzIGZvciBhIFJlYWQgdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc1JlYWRUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LmZpbGVfcGF0aCk7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQub2Zmc2V0KTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNSZWFkVG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiUmVhZFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBCYXNoIHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIEJhc2hUb29sSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgQmFzaCB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzQmFzaFRvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQuY29tbWFuZCk7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQudGltZW91dCk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQmFzaFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIkJhc2hcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgR2xvYiB0b29sIGlucHV0cy5cbiAqXG4gKiBOYXJyb3dzIHRoZSBpbnB1dCB0eXBlIHRvIGluY2x1ZGUgYSB0eXBlZCBHbG9iVG9vbElucHV0LlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gY2hlY2tcbiAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGlucHV0IGlzIGZvciBhIEdsb2IgdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc0dsb2JUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LnBhdHRlcm4pO1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LnBhdGgpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0dsb2JUb29sKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0LnRvb2xfbmFtZSA9PT0gXCJHbG9iXCI7XG59XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIEdyZXAgdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgR3JlcFRvb2xJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBHcmVwIHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNHcmVwVG9vbChpbnB1dCkpIHtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5wYXR0ZXJuKTtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5nbG9iKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNHcmVwVG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiR3JlcFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBUYXNrIHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIEFnZW50SW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgVGFzayB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzVGFza1Rvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQucHJvbXB0KTtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5zdWJhZ2VudF90eXBlKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUYXNrVG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiVGFza1wiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBUYXNrT3V0cHV0IHRvb2wgaW5wdXRzLlxuICpcbiAqIE5hcnJvd3MgdGhlIGlucHV0IHR5cGUgdG8gaW5jbHVkZSBhIHR5cGVkIFRhc2tPdXRwdXRJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBUYXNrT3V0cHV0IHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNUYXNrT3V0cHV0VG9vbChpbnB1dCkpIHtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC50YXNrX2lkKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUYXNrT3V0cHV0VG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiVGFza091dHB1dFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBFeGl0UGxhbk1vZGUgdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgRXhpdFBsYW5Nb2RlSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGFuIEV4aXRQbGFuTW9kZSB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzRXhpdFBsYW5Nb2RlVG9vbChpbnB1dCkpIHtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5hbGxvd2VkUHJvbXB0cyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRXhpdFBsYW5Nb2RlVG9vbChpbnB1dCkge1xuICAgIHJldHVybiBpbnB1dC50b29sX25hbWUgPT09IFwiRXhpdFBsYW5Nb2RlXCI7XG59XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIEtpbGxTaGVsbCB0b29sIGlucHV0cy5cbiAqXG4gKiBOYXJyb3dzIHRoZSBpbnB1dCB0eXBlIHRvIGluY2x1ZGUgYSB0eXBlZCBLaWxsU2hlbGxJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBLaWxsU2hlbGwgdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc0tpbGxTaGVsbFRvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQuc2hlbGxfaWQpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0tpbGxTaGVsbFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIktpbGxTaGVsbFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBOb3RlYm9va0VkaXQgdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgTm90ZWJvb2tFZGl0SW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgTm90ZWJvb2tFZGl0IHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNOb3RlYm9va0VkaXRUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0Lm5vdGVib29rX3BhdGgpO1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0Lm5ld19zb3VyY2UpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05vdGVib29rRWRpdFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIk5vdGVib29rRWRpdFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBUb2RvV3JpdGUgdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgVG9kb1dyaXRlSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGEgVG9kb1dyaXRlIHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNUb2RvV3JpdGVUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LnRvZG9zKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNUb2RvV3JpdGVUb29sKGlucHV0KSB7XG4gICAgcmV0dXJuIGlucHV0LnRvb2xfbmFtZSA9PT0gXCJUb2RvV3JpdGVcIjtcbn1cbi8qKlxuICogVHlwZSBndWFyZCBmb3IgV2ViRmV0Y2ggdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgV2ViRmV0Y2hJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBXZWJGZXRjaCB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzV2ViRmV0Y2hUb29sKGlucHV0KSkge1xuICogICBjb25zb2xlLmxvZyhpbnB1dC50b29sX2lucHV0LnVybCk7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQucHJvbXB0KTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNXZWJGZXRjaFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIldlYkZldGNoXCI7XG59XG4vKipcbiAqIFR5cGUgZ3VhcmQgZm9yIFdlYlNlYXJjaCB0b29sIGlucHV0cy5cbiAqXG4gKiBOYXJyb3dzIHRoZSBpbnB1dCB0eXBlIHRvIGluY2x1ZGUgYSB0eXBlZCBXZWJTZWFyY2hJbnB1dC5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBpbnB1dCBpcyBmb3IgYSBXZWJTZWFyY2ggdG9vbFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc1dlYlNlYXJjaFRvb2woaW5wdXQpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGlucHV0LnRvb2xfaW5wdXQucXVlcnkpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1dlYlNlYXJjaFRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIldlYlNlYXJjaFwiO1xufVxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBBc2tVc2VyUXVlc3Rpb24gdG9vbCBpbnB1dHMuXG4gKlxuICogTmFycm93cyB0aGUgaW5wdXQgdHlwZSB0byBpbmNsdWRlIGEgdHlwZWQgQXNrVXNlclF1ZXN0aW9uSW5wdXQuXG4gKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCB0byBjaGVja1xuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgaW5wdXQgaXMgZm9yIGFuIEFza1VzZXJRdWVzdGlvbiB0b29sXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzQXNrVXNlclF1ZXN0aW9uVG9vbChpbnB1dCkpIHtcbiAqICAgY29uc29sZS5sb2coaW5wdXQudG9vbF9pbnB1dC5xdWVzdGlvbnMpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Fza1VzZXJRdWVzdGlvblRvb2woaW5wdXQpIHtcbiAgICByZXR1cm4gaW5wdXQudG9vbF9uYW1lID09PSBcIkFza1VzZXJRdWVzdGlvblwiO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRmlsZSBQYXRoIFV0aWxpdGllc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeHRyYWN0cyB0aGUgZmlsZSBwYXRoIGZyb20gYSB0b29sIGlucHV0LlxuICpcbiAqIFdvcmtzIHdpdGggV3JpdGUsIEVkaXQsIE11bHRpRWRpdCwgYW5kIFJlYWQgdG9vbHMuXG4gKiBSZXR1cm5zIG51bGwgZm9yIG90aGVyIHRvb2xzIG9yIGlmIGZpbGVfcGF0aCBpcyBtaXNzaW5nLlxuICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgdG8gZXh0cmFjdCBmcm9tXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBwYXRoLCBvciBudWxsIGlmIG5vdCBhcHBsaWNhYmxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZVBhdGggPSBnZXRGaWxlUGF0aChpbnB1dCk7XG4gKiBpZiAoZmlsZVBhdGggJiYgaXNUc0ZpbGUoZmlsZVBhdGgpKSB7XG4gKiAgIC8vIEhhbmRsZSBUeXBlU2NyaXB0IGZpbGVcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVBhdGgoaW5wdXQpIHtcbiAgICBjb25zdCB0b29sSW5wdXQgPSBpbnB1dC50b29sX2lucHV0O1xuICAgIGlmICh0b29sSW5wdXQgJiYgdHlwZW9mIHRvb2xJbnB1dCA9PT0gXCJvYmplY3RcIiAmJiBcImZpbGVfcGF0aFwiIGluIHRvb2xJbnB1dCkge1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHRvb2xJbnB1dC5maWxlX3BhdGg7XG4gICAgICAgIHJldHVybiB0eXBlb2YgZmlsZVBhdGggPT09IFwic3RyaW5nXCIgPyBmaWxlUGF0aCA6IG51bGw7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuLyoqXG4gKiBDaGVja3MgaWYgYSBmaWxlIHBhdGggaXMgYSBKYXZhU2NyaXB0IG9yIFR5cGVTY3JpcHQgZmlsZS5cbiAqXG4gKiBNYXRjaGVzIC5qcywgLmpzeCwgLnRzLCAudHN4LCAubWpzLCAubXRzLCAuY2pzLCAuY3RzIGV4dGVuc2lvbnMuXG4gKiBAcGFyYW0gZmlsZVBhdGggLSBUaGUgZmlsZSBwYXRoIHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBmaWxlIGlzIEphdmFTY3JpcHQgb3IgVHlwZVNjcmlwdFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc0pzVHNGaWxlKGZpbGVQYXRoKSkge1xuICogICAvLyBDaGVjayBmb3IgVHlwZVNjcmlwdC1zcGVjaWZpYyBwYXR0ZXJuc1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0pzVHNGaWxlKGZpbGVQYXRoKSB7XG4gICAgcmV0dXJuIC9cXC5bY21dP1tqdF1zeD8kLy50ZXN0KGZpbGVQYXRoKTtcbn1cbi8qKlxuICogQ2hlY2tzIGlmIGEgZmlsZSBwYXRoIGlzIGEgVHlwZVNjcmlwdCBmaWxlLlxuICpcbiAqIE1hdGNoZXMgLnRzLCAudHN4LCAubXRzLCAuY3RzIGV4dGVuc2lvbnMuXG4gKiBAcGFyYW0gZmlsZVBhdGggLSBUaGUgZmlsZSBwYXRoIHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBmaWxlIGlzIFR5cGVTY3JpcHRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNUc0ZpbGUoZmlsZVBhdGgpKSB7XG4gKiAgIC8vIEVuZm9yY2UgVHlwZVNjcmlwdC1zcGVjaWZpYyBydWxlc1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1RzRmlsZShmaWxlUGF0aCkge1xuICAgIHJldHVybiAvXFwuW2NtXT90c3g/JC8udGVzdChmaWxlUGF0aCk7XG59XG4vKipcbiAqIENoZWNrcyBpZiBhIHBhdHRlcm4gZXhpc3RzIGluIHRoZSBjb250ZW50IGJlaW5nIHdyaXR0ZW4gb3IgZWRpdGVkLlxuICpcbiAqIEZvciBXcml0ZTogY2hlY2tzIHRoZSBjb250ZW50IGJlaW5nIHdyaXR0ZW5cbiAqIEZvciBFZGl0OiBjaGVja3MgbmV3X3N0cmluZyAoYW5kIG9sZF9zdHJpbmcgdG8gZGV0ZWN0IGFkZGl0aW9ucylcbiAqIEZvciBNdWx0aUVkaXQ6IGNoZWNrcyBhbGwgZWRpdHMgYW5kIGFnZ3JlZ2F0ZXMgcmVzdWx0c1xuICogQHBhcmFtIGlucHV0IC0gVGhlIFByZVRvb2xVc2UgaG9vayBpbnB1dFxuICogQHBhcmFtIHBhdHRlcm4gLSBUaGUgcmVnZXggcGF0dGVybiB0byBzZWFyY2ggZm9yIChnbG9iYWwgZmxhZyB3aWxsIGJlIHVzZWQpXG4gKiBAcmV0dXJucyBSZXN1bHQgb2JqZWN0LCBvciBudWxsIGlmIG5vdCBhIGZpbGUtbW9kaWZ5aW5nIHRvb2xcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCbG9jayBAdHMtZXhwZWN0LWVycm9yIGJlaW5nIGFkZGVkXG4gKiBjb25zdCByZXN1bHQgPSBjaGVja0NvbnRlbnRGb3JQYXR0ZXJuKGlucHV0LCAvQHRzLWV4cGVjdC1lcnJvci9nKTtcbiAqIGlmIChyZXN1bHQ/LmlzQWRkaXRpb24pIHtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgICAgcGVybWlzc2lvbkRlY2lzaW9uOiAnZGVueScsXG4gKiAgICAgICBwZXJtaXNzaW9uRGVjaXNpb25SZWFzb246IGBDYW5ub3QgYWRkOiAke3Jlc3VsdC5tYXRjaGVzLmpvaW4oJywgJyl9YFxuICogICAgIH1cbiAqICAgfSk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrQ29udGVudEZvclBhdHRlcm4oaW5wdXQsIHBhdHRlcm4pIHtcbiAgICAvLyBFbnN1cmUgcGF0dGVybiBoYXMgZ2xvYmFsIGZsYWcgZm9yIG1hdGNoQWxsXG4gICAgY29uc3QgZ2xvYmFsUGF0dGVybiA9IHBhdHRlcm4uZ2xvYmFsID8gcGF0dGVybiA6IG5ldyBSZWdFeHAocGF0dGVybi5zb3VyY2UsIGAke3BhdHRlcm4uZmxhZ3N9Z2ApO1xuICAgIGlmIChpc1dyaXRlVG9vbChpbnB1dCkpIHtcbiAgICAgICAgY29uc3QgbWF0Y2hlcyA9IFsuLi5pbnB1dC50b29sX2lucHV0LmNvbnRlbnQubWF0Y2hBbGwoZ2xvYmFsUGF0dGVybildLm1hcCgobSkgPT4gbVswXSk7XG4gICAgICAgIGNvbnN0IHVuaXF1ZU1hdGNoZXMgPSBbLi4ubmV3IFNldChtYXRjaGVzKV07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBmb3VuZDogdW5pcXVlTWF0Y2hlcy5sZW5ndGggPiAwLFxuICAgICAgICAgICAgaXNBZGRpdGlvbjogdW5pcXVlTWF0Y2hlcy5sZW5ndGggPiAwLCAvLyBGb3IgV3JpdGUsIGFueSBtYXRjaCBpcyBhbiBhZGRpdGlvblxuICAgICAgICAgICAgbWF0Y2hlczogdW5pcXVlTWF0Y2hlcyxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKGlzRWRpdFRvb2woaW5wdXQpKSB7XG4gICAgICAgIGNvbnN0IG5ld01hdGNoZXMgPSBbLi4uaW5wdXQudG9vbF9pbnB1dC5uZXdfc3RyaW5nLm1hdGNoQWxsKGdsb2JhbFBhdHRlcm4pXS5tYXAoKG0pID0+IG1bMF0pO1xuICAgICAgICBjb25zdCBvbGRNYXRjaGVzID0gWy4uLmlucHV0LnRvb2xfaW5wdXQub2xkX3N0cmluZy5tYXRjaEFsbChnbG9iYWxQYXR0ZXJuKV0ubWFwKChtKSA9PiBtWzBdKTtcbiAgICAgICAgY29uc3QgdW5pcXVlTmV3TWF0Y2hlcyA9IFsuLi5uZXcgU2V0KG5ld01hdGNoZXMpXTtcbiAgICAgICAgY29uc3QgdW5pcXVlT2xkTWF0Y2hlcyA9IG5ldyBTZXQob2xkTWF0Y2hlcyk7XG4gICAgICAgIC8vIEFkZGl0aW9uID0gZm91bmQgaW4gbmV3IGJ1dCBub3QgaW4gb2xkXG4gICAgICAgIGNvbnN0IGFkZGl0aW9ucyA9IHVuaXF1ZU5ld01hdGNoZXMuZmlsdGVyKChtKSA9PiAhdW5pcXVlT2xkTWF0Y2hlcy5oYXMobSkpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZm91bmQ6IHVuaXF1ZU5ld01hdGNoZXMubGVuZ3RoID4gMCxcbiAgICAgICAgICAgIGlzQWRkaXRpb246IGFkZGl0aW9ucy5sZW5ndGggPiAwLFxuICAgICAgICAgICAgbWF0Y2hlczogdW5pcXVlTmV3TWF0Y2hlcyxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKGlzTXVsdGlFZGl0VG9vbChpbnB1dCkpIHtcbiAgICAgICAgY29uc3QgZGV0YWlscyA9IFtdO1xuICAgICAgICBjb25zdCBhbGxNYXRjaGVzID0gbmV3IFNldCgpO1xuICAgICAgICBsZXQgYW55Rm91bmQgPSBmYWxzZTtcbiAgICAgICAgbGV0IGFueUFkZGl0aW9uID0gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQudG9vbF9pbnB1dC5lZGl0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgZWRpdCA9IGlucHV0LnRvb2xfaW5wdXQuZWRpdHNbaV07XG4gICAgICAgICAgICBjb25zdCBuZXdNYXRjaGVzID0gWy4uLmVkaXQubmV3X3N0cmluZy5tYXRjaEFsbChnbG9iYWxQYXR0ZXJuKV0ubWFwKChtKSA9PiBtWzBdKTtcbiAgICAgICAgICAgIGNvbnN0IG9sZE1hdGNoZXMgPSBbLi4uZWRpdC5vbGRfc3RyaW5nLm1hdGNoQWxsKGdsb2JhbFBhdHRlcm4pXS5tYXAoKG0pID0+IG1bMF0pO1xuICAgICAgICAgICAgY29uc3QgdW5pcXVlTmV3TWF0Y2hlcyA9IFsuLi5uZXcgU2V0KG5ld01hdGNoZXMpXTtcbiAgICAgICAgICAgIGNvbnN0IHVuaXF1ZU9sZE1hdGNoZXMgPSBuZXcgU2V0KG9sZE1hdGNoZXMpO1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25zID0gdW5pcXVlTmV3TWF0Y2hlcy5maWx0ZXIoKG0pID0+ICF1bmlxdWVPbGRNYXRjaGVzLmhhcyhtKSk7XG4gICAgICAgICAgICBjb25zdCBmb3VuZCA9IHVuaXF1ZU5ld01hdGNoZXMubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGlzQWRkaXRpb24gPSBhZGRpdGlvbnMubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIGlmIChmb3VuZClcbiAgICAgICAgICAgICAgICBhbnlGb3VuZCA9IHRydWU7XG4gICAgICAgICAgICBpZiAoaXNBZGRpdGlvbilcbiAgICAgICAgICAgICAgICBhbnlBZGRpdGlvbiA9IHRydWU7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG0gb2YgdW5pcXVlTmV3TWF0Y2hlcykge1xuICAgICAgICAgICAgICAgIGFsbE1hdGNoZXMuYWRkKG0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGV0YWlscy5wdXNoKHtcbiAgICAgICAgICAgICAgICBpbmRleDogaSxcbiAgICAgICAgICAgICAgICBmb3VuZCxcbiAgICAgICAgICAgICAgICBpc0FkZGl0aW9uLFxuICAgICAgICAgICAgICAgIG1hdGNoZXM6IHVuaXF1ZU5ld01hdGNoZXMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZm91bmQ6IGFueUZvdW5kLFxuICAgICAgICAgICAgaXNBZGRpdGlvbjogYW55QWRkaXRpb24sXG4gICAgICAgICAgICBtYXRjaGVzOiBbLi4uYWxsTWF0Y2hlc10sXG4gICAgICAgICAgICBkZXRhaWxzLFxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8qKlxuICogSXRlcmF0ZXMgb3ZlciBjb250ZW50IGluIFdyaXRlL0VkaXQvTXVsdGlFZGl0IG9wZXJhdGlvbnMuXG4gKlxuICogUHJvdmlkZXMgYSB1bmlmaWVkIHdheSB0byBpbnNwZWN0IGNvbnRlbnQgcmVnYXJkbGVzcyBvZiBvcGVyYXRpb24gdHlwZS5cbiAqIFJldHVybiBmYWxzZSBmcm9tIHRoZSBjYWxsYmFjayB0byBzdG9wIGl0ZXJhdGlvbiBlYXJseS5cbiAqIEBwYXJhbSBpbnB1dCAtIFRoZSBQcmVUb29sVXNlIGhvb2sgaW5wdXRcbiAqIEBwYXJhbSBjYWxsYmFjayAtIEZ1bmN0aW9uIGNhbGxlZCBmb3IgZWFjaCBjb250ZW50IHBpZWNlLCByZXR1cm4gZmFsc2UgdG8gc3RvcFxuICogQHJldHVybnMgVHJ1ZSBpZiBhbGwgY2FsbGJhY2tzIHJldHVybmVkIHRydWUsIGZhbHNlIGlmIHN0b3BwZWQgZWFybHkgb3Igbm90IGFwcGxpY2FibGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBDaGVjayBhbGwgY29udGVudCBmb3Igc2Vuc2l0aXZlIGRhdGFcbiAqIGNvbnN0IGhhc1NlbnNpdGl2ZSA9ICFmb3JFYWNoQ29udGVudChpbnB1dCwgKHsgbmV3Q29udGVudCB9KSA9PiB7XG4gKiAgIGlmICgvcGFzc3dvcmR8c2VjcmV0fGFwaS4/a2V5L2kudGVzdChuZXdDb250ZW50KSkge1xuICogICAgIHJldHVybiBmYWxzZTsgLy8gU3RvcCAtIGZvdW5kIHNlbnNpdGl2ZSBkYXRhXG4gKiAgIH1cbiAqICAgcmV0dXJuIHRydWU7IC8vIENvbnRpbnVlXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9yRWFjaENvbnRlbnQoaW5wdXQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKGlzV3JpdGVUb29sKGlucHV0KSkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soe1xuICAgICAgICAgICAgbmV3Q29udGVudDogaW5wdXQudG9vbF9pbnB1dC5jb250ZW50LFxuICAgICAgICAgICAgb2xkQ29udGVudDogbnVsbCxcbiAgICAgICAgICAgIGluZGV4OiAwLFxuICAgICAgICAgICAgaXNXcml0ZTogdHJ1ZSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChpc0VkaXRUb29sKGlucHV0KSkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soe1xuICAgICAgICAgICAgbmV3Q29udGVudDogaW5wdXQudG9vbF9pbnB1dC5uZXdfc3RyaW5nLFxuICAgICAgICAgICAgb2xkQ29udGVudDogaW5wdXQudG9vbF9pbnB1dC5vbGRfc3RyaW5nLFxuICAgICAgICAgICAgaW5kZXg6IDAsXG4gICAgICAgICAgICBpc1dyaXRlOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChpc011bHRpRWRpdFRvb2woaW5wdXQpKSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXQudG9vbF9pbnB1dC5lZGl0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgZWRpdCA9IGlucHV0LnRvb2xfaW5wdXQuZWRpdHNbaV07XG4gICAgICAgICAgICBjb25zdCBzaG91bGRDb250aW51ZSA9IGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICBuZXdDb250ZW50OiBlZGl0Lm5ld19zdHJpbmcsXG4gICAgICAgICAgICAgICAgb2xkQ29udGVudDogZWRpdC5vbGRfc3RyaW5nLFxuICAgICAgICAgICAgICAgIGluZGV4OiBpLFxuICAgICAgICAgICAgICAgIGlzV3JpdGU6IGZhbHNlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIXNob3VsZENvbnRpbnVlKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuIiwgInByb2Nlc3MuZW52WydDTEFVREVfQ09ERV9IT09LU19DTElfTE9HX0ZJTEUnXSA9IFwiL3RtcC9ob29rcy1jbGkubG9nXCI7XG5cbmltcG9ydCBob29rIGZyb20gJy93b3Jrc3BhY2UvLndvcmt0cmVlcy9jYXJkLXJlcG8tbWV0YWRhdGEtdG8tanNvbi1zaWRlY2Fycy9wYWNrYWdlcy9jYXJkcy9jbGF1ZGUtY29kZS1ob29rcy9zcmMvY2xhdWRlLWNvZGUtY2xpL3Bvc3QtdG9vbC11c2UtZWRpdC50cyc7XG5pbXBvcnQgeyBleGVjdXRlIH0gZnJvbSAnL3dvcmtzcGFjZS8ud29ya3RyZWVzL2NhcmQtcmVwby1tZXRhZGF0YS10by1qc29uLXNpZGVjYXJzL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9ydW50aW1lLmpzJztcblxuZXhlY3V0ZShob29rKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFPQSxTQUFTLFlBQUFBLGlCQUFnQjs7O0FDc0J6QixJQUFNLHlCQUF5QixDQUFDLFVBQVUsV0FBVztBQUNyRCxJQUFNLHFCQUFxQjtBQVczQixTQUFTLFNBQVMsT0FBa0Q7QUFDbEUs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TTtBQUN4QixNQUFJLGFBQWEsT0FBTyxjQUFjLFlBQVksZUFBZSxXQUFXO0FBQ3hFLFVBQU0sV0FBVyxVQUFVO0FBQzNCLFdBQU8sT0FBTyxhQUFhLFdBQVcsV0FBVztBQUFBLEVBQ3JEO0FBQ0EsU0FBTztBQUNYOzs7QVIvVEEsSUFBTyw2QkFBUSxnQkFBZ0IsRUFBRSxTQUFTLHVCQUF1QixHQUFHLE9BQU8sT0FBTyxFQUFFLFFBQUFDLFFBQU8sTUFBTTtBQUMvRixRQUFNLFdBQVcsWUFBWSxLQUFLO0FBQ2xDLE1BQUksQ0FBQyxTQUFVLFFBQU8sa0JBQWtCLENBQUMsQ0FBQztBQUcxQyxRQUFNLGFBQWEsU0FBUyxTQUFTLFNBQVMsS0FBSyxTQUFTLFNBQVMsT0FBTztBQUU1RSxNQUFJLENBQUMsWUFBWTtBQUNmLFdBQU8sa0JBQWtCLENBQUMsQ0FBQztBQUFBLEVBQzdCO0FBRUEsTUFBSTtBQUNGLFVBQU0sVUFBVSxNQUFNQyxVQUFTLFVBQVUsT0FBTztBQUVoRCxRQUFJLFlBQVk7QUFDZCxZQUFNLE9BQU8sS0FBSyxNQUFNLE9BQU87QUFDL0IsWUFBTSxTQUFTLHFCQUFxQixJQUFJO0FBQ3hDLFVBQUksQ0FBQyxPQUFPLE9BQU87QUFDakIsZUFBTyxrQkFBa0I7QUFBQSxVQUN2QixlQUFlLDJCQUEyQixPQUFPLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxJQUFJLENBQUM7QUFBQSxRQUMxRixDQUFDO0FBQUEsTUFDSDtBQUFBLElBQ0Y7QUFFQSxXQUFPLGtCQUFrQjtBQUFBLE1BQ3ZCLGVBQWUsY0FBYyxRQUFRO0FBQUEsSUFDdkMsQ0FBQztBQUFBLEVBQ0gsU0FBUyxPQUFPO0FBRWQsUUFBSSxpQkFBaUIsYUFBYTtBQUNoQyxhQUFPLGtCQUFrQjtBQUFBLFFBQ3ZCLGVBQWUsOEJBQThCLE1BQU0sT0FBTztBQUFBLE1BQzVELENBQUM7QUFBQSxJQUNIO0FBQ0EsSUFBQUQsUUFBTyxLQUFLLG9CQUFvQixFQUFFLE9BQU8sT0FBTyxLQUFLLEVBQUUsQ0FBQztBQUN4RCxXQUFPLGtCQUFrQixDQUFDLENBQUM7QUFBQSxFQUM3QjtBQUNGLENBQUM7OztBU2xFRCxRQUFRLElBQUksZ0NBQWdDLElBQUk7QUFLaEQsUUFBUSwwQkFBSTsiLAogICJuYW1lcyI6IFsicmVhZEZpbGUiLCAiZnMiLCAiZXhpc3RzU3luYyIsICJsb2dnZXIiLCAicmVhZEZpbGUiXQp9Cg==
