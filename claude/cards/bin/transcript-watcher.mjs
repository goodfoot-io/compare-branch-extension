// src/bin/transcript-watcher.ts
import { execFile, execFileSync } from "node:child_process";
import { watch } from "node:fs";
import { access, appendFile, copyFile, mkdir, readdir, readFile as readFile2, stat, unlink, writeFile } from "node:fs/promises";
import { dirname as dirname2, join as join2 } from "node:path";
import { promisify } from "node:util";

// src/config/watcher/createWatcher.ts
import * as net from "node:net";

// src/client/api-discovery.ts
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
async function discoverApiInfo(logger2) {
  if (process.env["API_TEST_MODE"] === "1") {
    logger2?.debug("API_TEST_MODE: Using mock API info");
    return {
      host: "localhost",
      port: 9999,
      pid: 99999,
      accessToken: "test-token",
      startedAt: "2024-01-01T00:00:00Z"
    };
  }
  const configPath = process.env["CARDS_DISCOVERY_PATH"] ?? join(homedir(), ".cards", "cards-api.json");
  try {
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content);
    if (typeof config["host"] !== "string" || typeof config["port"] !== "number" || typeof config["accessToken"] !== "string" || typeof config["pid"] !== "number" || typeof config["startedAt"] !== "string") {
      logger2?.debug("API info discovery failed", { error: "Config missing required fields" });
      return null;
    }
    return {
      host: config["host"],
      port: config["port"],
      accessToken: config["accessToken"],
      pid: config["pid"],
      startedAt: config["startedAt"],
      sessionBaseline: config["sessionBaseline"]
    };
  } catch (error) {
    logger2?.debug("API info discovery failed", { error: String(error) });
    return null;
  }
}

// src/config/logger.ts
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
   * import { logger } from '@cards/sdk/config';
   *
   * // Or create custom instance
   * const customLogger = new Logger({ logFilePath: '/var/log/hooks.log' });
   * ```
   */
  constructor(config = {}) {
    for (const level of LOG_LEVELS) {
      this.handlers.set(level, /* @__PURE__ */ new Set());
    }
    this.logFilePath = config.logFilePath ?? process.env["CARDS_HOOKS_LOG_FILE"] ?? null;
  }
  /**
   * Logs a debug message.
   *
   * Use for detailed debugging information that is typically only useful
   * during development or troubleshooting.
   * @param message - Diagnostic text describing low-level execution details.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.debug('Processing hook input', { taskId: 'task-123', inputSize: 256 });
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
   * @param message - Operational message describing normal hook progress.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.info('Task started', { taskId: 'task-123', cardId: 'card-456' });
   * ```
   */
  info(message, context) {
    this.emit("info", message, context);
  }
  /**
   * Logs a warning message.
   *
   * Use for conditions that may indicate cards but don't prevent
   * operation, such as deprecated patterns or performance concerns.
   * @param message - Warning text for recoverable or suspicious conditions.
   * @param context - Optional structured metadata merged into the emitted event.
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
   * @param message - Error text describing a handled failure condition.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.error('Failed to validate hook input', { reason: 'empty taskId' });
   * ```
   */
  error(message, context) {
    this.emit("error", message, context);
  }
  /**
   * Logs a structured error with full error details.
   *
   * Use this for caught exceptions. Non-Error values are normalized so handlers
   * always receive a consistent error shape.
   * @param error - The error to log
   * @param message - Human-readable description of what failed
   * @param context - Optional structured metadata merged into the emitted event.
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
   * is no longer needed. Handler errors are ignored to avoid disrupting hooks.
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
   * Sets a default log file path that only takes effect if no other source
   * has configured file logging.
   *
   * This is the lowest-priority file path source. It will be ignored if
   * any of these have already set a path:
   * - `logFilePath` in the constructor config
   * - `CARDS_HOOKS_LOG_FILE` environment variable
   * - {@link setLogFile} called at runtime
   *
   * Intended for use by CLI entry points (e.g., the `--log` flag).
   * @param filePath - Default path to the log file
   * @example
   * ```typescript
   * // Wire --log CLI argument as a fallback
   * if (args.log) {
   *   logger.setDefaultLogFile(args.log);
   * }
   * ```
   */
  setDefaultLogFile(filePath) {
    if (this.logFilePath === null) {
      this.logFilePath = filePath;
      this.fileInitialized = false;
    }
  }
  /**
   * Configures the log file path at runtime.
   *
   * Call this to enable or change file logging. Setting to `null` disables
   * file logging and closes any open file handle. Directories are created
   * on demand when the first write occurs.
   * @param filePath - Path to the log file, or null to disable
   * @example
   * ```typescript
   * // Enable file logging at runtime
   * logger.setLogFile('/var/log/cards-sdk.log');
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
   * Safe to call multiple times.
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
   * Useful for deciding whether to compute expensive log context.
   * @returns Whether the logger has any active output destinations
   */
  hasDestinations() {
    const hasHandlers = Array.from(this.handlers.values()).some((handlers) => handlers.size > 0);
    return hasHandlers || this.logFilePath !== null;
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

// src/config/watcher/errors.ts
var WatcherRegistrationError = class extends Error {
  name = "WatcherRegistrationError";
};
var WatcherHandshakeError = class extends Error {
  name = "WatcherHandshakeError";
};

// src/config/watcher/createWatcher.ts
function writeMessage(socket, msg) {
  socket.write(`${JSON.stringify(msg)}
`);
}
async function createWatcher(registration, handler) {
  const { watcherId, cardId, metadata } = registration;
  const info = await discoverApiInfo();
  if (!info) {
    throw new WatcherRegistrationError("Cards server is not running or not discoverable");
  }
  const baseUrl = `http://${info.host}:${info.port}`;
  let socketPath;
  try {
    const response = await fetch(`${baseUrl}/internal/watchers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${info.accessToken}`
      },
      body: JSON.stringify({ watcherId, cardId, metadata })
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new WatcherRegistrationError(`POST /internal/watchers failed with status ${response.status}: ${body}`);
    }
    const json = await response.json();
    socketPath = json.socketPath;
  } catch (error) {
    if (error instanceof WatcherRegistrationError) throw error;
    throw new WatcherRegistrationError(`Failed to register watcher: ${String(error)}`);
  }
  const socket = net.createConnection(socketPath);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new WatcherHandshakeError("Handshake timeout: no hello-ack received within 2s"));
    }, 2e3);
    socket.once("connect", () => {
      writeMessage(socket, { type: "hello", watcherId });
    });
    let lineBuffer = "";
    const onData = (chunk) => {
      lineBuffer += chunk.toString();
      const newlineIdx = lineBuffer.indexOf("\n");
      if (newlineIdx === -1) return;
      const line = lineBuffer.slice(0, newlineIdx);
      lineBuffer = lineBuffer.slice(newlineIdx + 1);
      socket.removeListener("data", onData);
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        clearTimeout(timeout);
        socket.destroy();
        reject(new WatcherHandshakeError(`Handshake failed: invalid JSON in first message`));
        return;
      }
      if (msg.type !== "hello-ack") {
        clearTimeout(timeout);
        socket.destroy();
        reject(new WatcherHandshakeError(`Handshake failed: expected hello-ack, got ${msg.type}`));
        return;
      }
      clearTimeout(timeout);
      resolve();
    };
    socket.on("data", onData);
    socket.once("error", (err) => {
      clearTimeout(timeout);
      reject(new WatcherRegistrationError(`Socket connection failed: ${String(err)}`));
    });
  });
  let handshakeComplete = false;
  let stopAckSent = false;
  const preHandshakeQueue = [];
  let stopControlHandler;
  const watcherLogger = new Logger();
  const levels = ["debug", "info", "warn", "error"];
  for (const level of levels) {
    watcherLogger.on(level, (event) => {
      const msg = { type: "log", level: event.level, message: event.message };
      writeMessage(socket, msg);
    });
  }
  const context = {
    logger: watcherLogger,
    cwd: process.cwd(),
    emit(event) {
      if (stopAckSent) return;
      const msg = { type: "event", event };
      if (!handshakeComplete) {
        preHandshakeQueue.push(msg);
        return;
      }
      writeMessage(socket, msg);
    },
    onControl(_commandType, cb) {
      stopControlHandler = cb;
    }
  };
  handshakeComplete = true;
  for (const msg of preHandshakeQueue) {
    writeMessage(socket, msg);
  }
  preHandshakeQueue.length = 0;
  return {
    run() {
      return new Promise((resolve, reject) => {
        let runComplete = false;
        let socketClosed = false;
        let stopInProgress = false;
        const cleanup = () => {
          if (!socket.destroyed) {
            socket.destroy();
          }
        };
        let lineBuffer = "";
        socket.on("data", (chunk) => {
          lineBuffer += chunk.toString();
          for (; ; ) {
            const newlineIdx = lineBuffer.indexOf("\n");
            if (newlineIdx === -1) break;
            const line = lineBuffer.slice(0, newlineIdx);
            lineBuffer = lineBuffer.slice(newlineIdx + 1);
            if (!line.trim()) continue;
            let msg;
            try {
              msg = JSON.parse(line);
            } catch {
              continue;
            }
            if (msg.type === "control") {
              const command = msg.command;
              if (command.type === "stop") {
                stopInProgress = true;
                const cb = stopControlHandler;
                const doStop = async () => {
                  if (cb) {
                    try {
                      await cb();
                    } catch (err) {
                      reject(err);
                      cleanup();
                      return;
                    }
                  }
                  if (!stopAckSent) {
                    stopAckSent = true;
                    writeMessage(socket, { type: "stop-ack" });
                  }
                  socket.end(() => {
                    if (!runComplete) {
                      runComplete = true;
                      resolve();
                    }
                  });
                };
                void doStop();
              } else {
                watcherLogger.warn(`Unregistered control command type: ${command.type}`);
              }
            }
          }
        });
        socket.on("close", () => {
          socketClosed = true;
          if (!runComplete && !stopAckSent) {
            runComplete = true;
            reject(new Error("Watcher socket closed unexpectedly by server"));
          }
        });
        socket.on("error", (err) => {
          if (!runComplete) {
            runComplete = true;
            reject(err);
          }
        });
        const handlerResult = (() => {
          try {
            return Promise.resolve(handler(context));
          } catch (err) {
            return Promise.reject(err);
          }
        })();
        handlerResult.then(
          () => {
            if (!runComplete && !stopInProgress) {
              if (!socketClosed) {
                socket.end(() => {
                  if (!runComplete) {
                    runComplete = true;
                    resolve();
                  }
                });
              } else {
                runComplete = true;
                resolve();
              }
            }
          },
          (err) => {
            if (!runComplete) {
              runComplete = true;
              cleanup();
              reject(err);
            }
          }
        );
      });
    }
  };
}

// src/bin/transcript-watcher.ts
var execFileAsync = promisify(execFile);
var MAX_LIFETIME_MS = 24 * 60 * 60 * 1e3;
var PERIODIC_CHECK_INTERVAL_MS = 5e3;
function parseArgs(argv) {
  return {
    pid: Number(argv[2]),
    sessionId: argv[3],
    transcriptPath: argv[4],
    cardId: argv[5],
    cardRepoPath: argv[6]
  };
}
function isProcessAlive(pid) {
  if (process.platform === "win32") {
    try {
      const output = execFileSync("tasklist", ["/FI", `PID eq ${pid}`, "/NH"], {
        encoding: "utf-8"
      });
      return output.includes(String(pid));
    } catch {
      return false;
    }
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") {
      return false;
    }
    return true;
  }
}
async function sentinelFileExists(cardRepoPath, sessionId) {
  try {
    await access(join2(cardRepoPath, "streams", "claude-code-session", `${sessionId}.flush`));
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
async function removeSentinelFile(cardRepoPath, sessionId) {
  try {
    await unlink(join2(cardRepoPath, "streams", "claude-code-session", `${sessionId}.flush`));
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}
function translatePath(relPath, sessionId) {
  const normalized = relPath.replace(/\\/g, "/");
  if (normalized === `${sessionId}.jsonl`) {
    return `${sessionId}.jsonl`;
  }
  const subagentsPrefix = `${sessionId}/subagents/`;
  if (normalized.startsWith(subagentsPrefix)) {
    const name = normalized.slice(subagentsPrefix.length);
    if (name.includes("/")) {
      return null;
    }
    return `${sessionId}-${name}`;
  }
  return null;
}
function buildSidecarMeta(destFilename, sessionId, cardId) {
  const isSubagent = destFilename.startsWith(`${sessionId}-`);
  if (isSubagent) {
    const withoutUuidPrefix = destFilename.slice(sessionId.length + 1);
    const dotIdx = withoutUuidPrefix.lastIndexOf(".");
    const agentId = dotIdx >= 0 ? withoutUuidPrefix.slice(0, dotIdx) : withoutUuidPrefix;
    return {
      filename: destFilename,
      streamType: "claude-code-session",
      title: `Subagent transcript for ${cardId}`,
      sessionId,
      agentId
    };
  }
  return {
    filename: destFilename,
    streamType: "claude-code-session",
    title: `Claude session for ${cardId}`,
    sessionId
  };
}
async function writeSidecarIfAbsent(destDir, destFilename, sessionId, cardId) {
  const sidecarPath = join2(destDir, `${destFilename}.meta.json`);
  try {
    await access(sidecarPath);
    return;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  const meta = buildSidecarMeta(destFilename, sessionId, cardId);
  await writeFile(sidecarPath, JSON.stringify(meta, null, 2));
}
async function appendSyncJsonl(srcPath, destPath, state) {
  let srcContent;
  try {
    srcContent = await readFile2(srcPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }
  const totalSrcBytes = srcContent.length;
  if (totalSrcBytes <= state.bytesWritten) {
    return;
  }
  const newBytes = srcContent.subarray(state.bytesWritten);
  const text = state.pendingFragment + newBytes.toString("utf-8");
  const lastNl = text.lastIndexOf("\n");
  if (lastNl < 0) {
    state.pendingFragment = text;
    return;
  }
  const completeLines = text.slice(0, lastNl + 1);
  const newFragment = text.slice(lastNl + 1);
  await appendFile(destPath, completeLines, { flag: "a" });
  const consumed = Buffer.byteLength(completeLines, "utf-8") - Buffer.byteLength(state.pendingFragment, "utf-8");
  state.bytesWritten = state.bytesWritten + consumed;
  state.pendingFragment = newFragment;
}
async function ensureGitignoreEntry(cardRepoPath) {
  const gitignorePath = join2(cardRepoPath, ".gitignore");
  const entry = "streams/**/*.flush";
  let existing = "";
  try {
    existing = await readFile2(gitignorePath, "utf-8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  const lines = existing.split("\n");
  if (lines.some((line) => line.trim() === entry)) {
    return;
  }
  const newContent = existing.endsWith("\n") || existing === "" ? `${existing}${entry}
` : `${existing}
${entry}
`;
  await writeFile(gitignorePath, newContent);
}
async function enumerateSessionFiles(sourceDir, sessionId) {
  const result = [];
  const rootFile = `${sessionId}.jsonl`;
  try {
    await access(join2(sourceDir, rootFile));
    result.push(rootFile);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  const sessionDir = join2(sourceDir, sessionId);
  try {
    await walkDir(sessionDir, sessionId, result);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  return result;
}
async function walkDir(dir, relPrefix, result) {
  let entries;
  try {
    entries = await readdir(dir);
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }
  for (const entry of entries) {
    const absPath = join2(dir, entry);
    const relPath = `${relPrefix}/${entry}`;
    let isDir;
    try {
      const s = await stat(absPath);
      isDir = s.isDirectory();
    } catch {
      continue;
    }
    if (isDir) {
      await walkDir(absPath, relPath, result);
    } else {
      result.push(relPath);
    }
  }
}
async function syncFile(relPath, sourceDir, destDir, sessionId, cardId, fileStates) {
  const destFilename = translatePath(relPath, sessionId);
  if (destFilename === null) {
    return;
  }
  const srcPath = join2(sourceDir, relPath.replace(/\//g, "/"));
  const destPath = join2(destDir, destFilename);
  if (destFilename.endsWith(".jsonl")) {
    let state = fileStates.get(relPath);
    if (!state) {
      state = { bytesWritten: 0, pendingFragment: "" };
      fileStates.set(relPath, state);
    }
    await appendSyncJsonl(srcPath, destPath, state);
    await writeSidecarIfAbsent(destDir, destFilename, sessionId, cardId);
  } else {
    try {
      await copyFile(srcPath, destPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        return;
      }
      throw error;
    }
  }
}
async function fullCopyPass(sourceDir, destDir, sessionId, cardId, fileStates, warnFn) {
  const relPaths = await enumerateSessionFiles(sourceDir, sessionId);
  for (const relPath of relPaths) {
    try {
      await syncFile(relPath, sourceDir, destDir, sessionId, cardId, fileStates);
    } catch (error) {
      warnFn(`fullCopyPass: error syncing ${relPath}: ${String(error)}`);
    }
  }
}
async function commitSessionClose(cardRepoPath, sessionId, warnFn, errorFn) {
  try {
    await removeSentinelFile(cardRepoPath, sessionId);
  } catch (error) {
    warnFn(`removeSentinelFile failed: ${String(error)}`);
  }
  try {
    await execFileAsync("git", ["add", "streams/claude-code-session/"], { cwd: cardRepoPath });
    await execFileAsync("git", ["commit", "--no-gpg-sign", "-m", `Close session ${sessionId}.`], {
      cwd: cardRepoPath
    });
  } catch (error) {
    errorFn(`git commit failed for session ${sessionId}: ${String(error)}`);
  }
}
async function main() {
  const args = parseArgs(process.argv);
  const { pid, sessionId, transcriptPath, cardId, cardRepoPath } = args;
  const sourceDir = dirname2(transcriptPath);
  const destDir = join2(cardRepoPath, "streams", "claude-code-session");
  await createWatcher({ watcherId: sessionId, cardId, metadata: { pid, sessionId, transcriptPath } }, async (ctx) => {
    const warnFn = (msg) => ctx.logger.warn(msg);
    const errorFn = (msg) => ctx.logger.error(msg);
    await mkdir(destDir, { recursive: true });
    await ensureGitignoreEntry(cardRepoPath);
    const fileStates = /* @__PURE__ */ new Map();
    const syncOnce = async () => {
      await fullCopyPass(sourceDir, destDir, sessionId, cardId, fileStates, warnFn);
      await commitSessionClose(cardRepoPath, sessionId, warnFn, errorFn);
    };
    await fullCopyPass(sourceDir, destDir, sessionId, cardId, fileStates, warnFn);
    let fsWatcher = null;
    let exitSignaled = false;
    let syncChain = Promise.resolve();
    const scheduleSync = (relPath) => {
      syncChain = syncChain.then(async () => {
        try {
          await syncFile(relPath, sourceDir, destDir, sessionId, cardId, fileStates);
        } catch (error) {
          warnFn(`syncFile error for ${relPath}: ${String(error)}`);
        }
      });
    };
    const tryInstallWatcher = async () => {
      try {
        await access(sourceDir);
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
      await fullCopyPass(sourceDir, destDir, sessionId, cardId, fileStates, warnFn);
      try {
        const w = watch(sourceDir, { recursive: true }, (_eventType, filename) => {
          if (exitSignaled || !filename) return;
          const relPath = filename.replace(/\\/g, "/");
          if (!relPath.startsWith(sessionId)) return;
          scheduleSync(relPath);
        });
        w.on("error", (error) => {
          if (!exitSignaled) {
            warnFn(`fs.watch error: ${String(error)}`);
          }
        });
        return w;
      } catch (error) {
        warnFn(`Failed to start fs.watch: ${String(error)}`);
        return null;
      }
    };
    fsWatcher = await tryInstallWatcher();
    ctx.logger.info(
      `Watcher started: pid=${String(pid)} session=${sessionId} node=${process.version} watcherPid=${String(process.pid)} transcriptPath=${transcriptPath} cardId=${cardId}`
    );
    let stopRequested = false;
    ctx.onControl("stop", async () => {
      stopRequested = true;
      exitSignaled = true;
      if (fsWatcher) {
        try {
          fsWatcher.close();
        } catch (error) {
          warnFn(`fsWatcher.close() error: ${String(error)}`);
        }
      }
      await syncChain;
      await syncOnce();
    });
    const started = Date.now();
    while (!stopRequested) {
      if (await sentinelFileExists(cardRepoPath, sessionId)) break;
      if (!isProcessAlive(pid)) break;
      if (Date.now() - started > MAX_LIFETIME_MS) {
        warnFn(`Watcher exceeded maximum lifetime (${MAX_LIFETIME_MS}ms), exiting`);
        break;
      }
      if (!fsWatcher && !exitSignaled) {
        fsWatcher = await tryInstallWatcher();
      }
      await new Promise((resolve) => setTimeout(resolve, PERIODIC_CHECK_INTERVAL_MS));
    }
    if (!stopRequested) {
      exitSignaled = true;
      if (fsWatcher) {
        try {
          fsWatcher.close();
        } catch (error) {
          warnFn(`fsWatcher.close() error: ${String(error)}`);
        }
      }
      await syncChain;
      await syncOnce();
    }
    ctx.logger.info(`Watcher completed for session ${sessionId}`);
  }).then((w) => w.run());
}
if (process.argv[1]?.endsWith("transcript-watcher.mjs") || process.argv[1]?.endsWith("transcript-watcher.ts")) {
  main().catch((error) => {
    process.stderr.write(`transcript-watcher: fatal error: ${String(error)}
`);
    process.exitCode = 1;
  });
}
export {
  MAX_LIFETIME_MS,
  PERIODIC_CHECK_INTERVAL_MS,
  buildSidecarMeta,
  ensureGitignoreEntry,
  isProcessAlive,
  main,
  parseArgs,
  removeSentinelFile,
  sentinelFileExists,
  translatePath
};
