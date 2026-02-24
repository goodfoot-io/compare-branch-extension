/**
 * Environment variable utilities for Cards Extension actions and type hooks.
 *
 * The execution wrapper injects action and type hook inputs via process.env.
 * This module provides strict getters and typed extractors so handlers do not
 * need to parse environment variables manually.
 *
 * Use the individual getters when you only need one value; use
 * {@link extractActionInput} or {@link extractTypeInput} when you need a full
 * typed payload for an action or type hook.
 *
 *
 * @summary Environment variable utilities for Cards Extension actions and type hooks
 * @module
 */

import { readFileSync } from 'node:fs';
import type { ActionInput, TypeHookInput } from './inputs.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Environment variable names set by the Cards execution wrapper.
 *
 * This is the single source of truth for env var keys used by action and type
 * hook processes. Keep it in sync with the wrapper to avoid subtle "undefined
 * input" bugs.
 */
export const CARDS_ENV_VARS = {
  /**
   * Unique identifier for the current card.
   * Available in all actions and type hooks.
   */
  CARD_ID: 'CARD_ID',

  /**
   * The environment name from settings.json.
   * Available in all actions and type hooks.
   */
  ENVIRONMENT: 'ENVIRONMENT',

  /**
   * Display name of the action button that triggered this handler.
   * Available in actions only (not type hooks).
   */
  ACTION_NAME: 'ACTION_NAME',

  /**
   * Card's execution mode, determining UI interaction model.
   * Available in actions only (not type hooks).
   * Valid values: 'interactive' | 'background'
   */
  EXECUTION_MODE: 'EXECUTION_MODE',

  /**
   * Cards server base URL for API calls.
   * Available in all actions and type hooks.
   */
  API_BASE_URL: 'API_BASE_URL',

  /**
   * Authentication token for API calls.
   * Available in all actions and type hooks.
   */
  API_ACCESS_TOKEN: 'API_ACCESS_TOKEN',

  /**
   * Configured coding agent identifier from cards.codingAgent setting.
   * Available in actions only (not type hooks).
   * Optional.
   */
  CODING_AGENT: 'CODING_AGENT',

  /**
   * The registered type name.
   * Available in type hooks only.
   */
  TYPE_NAME: 'TYPE_NAME',

  /**
   * The type's version string from settings.json configuration.
   * Available in type hooks only.
   */
  TYPE_VERSION: 'TYPE_VERSION',

  /**
   * The file name within the type directory.
   * Available in type hooks only.
   */
  FILE_NAME: 'FILE_NAME',

  /**
   * Full path to the file.
   * Available in type hooks only.
   */
  FILE_PATH: 'FILE_PATH',

  /**
   * File size in bytes.
   * Available in type hooks only.
   */
  FILE_SIZE: 'FILE_SIZE',

  /**
   * SHA256 hash of content.
   * Available in type hooks only.
   */
  SHA256: 'SHA256',

  /**
   * MIME type of the content.
   * Available in type hooks only.
   */
  CONTENT_TYPE: 'CONTENT_TYPE',

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
  VSCODE_NODE: 'VSCODE_NODE',

  /**
   * Path to the Node.js interpreter running the wrapper process.
   *
   * Set by the wrapper from `process.execPath`. Use `$NODE` in embedded
   * bash statements to invoke Node scripts portably.
   *
   * Available in all actions.
   */
  NODE: 'NODE',

  /**
   * Path to the Unix domain socket for runtime-to-dispatcher communication.
   * Available in actions only.
   */
  SOCKET_PATH: 'SOCKET_PATH',

  /**
   * Path to a JSON file containing switchToInteractive data from a previous handler.
   * Available in actions only. Optional.
   */
  SWITCH_TO_INTERACTIVE_DATA_PATH: 'SWITCH_TO_INTERACTIVE_DATA_PATH',

  /**
   * Path to the settings configuration directory.
   * Available in actions only.
   */
  CONFIG_PATH: 'CONFIG_PATH',

  /**
   * Path to the VS Code workspace root directory.
   * Available in actions only.
   */
  WORKSPACE_PATH: 'WORKSPACE_PATH',

  /**
   * Path to the card's repository directory.
   * Available in actions only.
   */
  CARD_REPO_PATH: 'CARD_REPO_PATH',

  /**
   * Resolved shell command for the wrapper to spawn as the action handler.
   * Set by ActionDispatcher; consumed by the wrapper (not by action handlers).
   */
  ACTION_COMMAND: 'ACTION_COMMAND',

  /**
   * Git branch that the card's workspace branch will merge into.
   * Resolved from the workspace HEAD at launch time.
   * Set by the launch action.
   * Available in actions only.
   */
  BASE_BRANCH: 'BASE_BRANCH',

  /**
   * Git branch from which the card's workspace branch was created.
   * May differ from BASE_BRANCH when the worktree was created against
   * a different ref than the current workspace HEAD.
   * Set by the launch action.
   * Available in actions only.
   */
  PARENT_BRANCH: 'PARENT_BRANCH',

  /**
   * Git branch name for the card's workspace implementation.
   * Set by the launch action after resolving or creating the worktree.
   * Available in actions only.
   */
  WORKSPACE_BRANCH: 'WORKSPACE_BRANCH',

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
  CARDS_SESSION_ID: 'CARDS_SESSION_ID'
} as const;

// ============================================================================
// Individual Getters
// ============================================================================

/**
 * Reads the card identifier from the environment.
 *
 * The execution wrapper always sets this for every action and type hook.
 * @returns The current card ID
 * @throws Error if CARD_ID is missing or empty
 * @example
 * ```typescript
 * const cardId = getCardId();
 * console.log(`Processing card: ${cardId}`);
 * ```
 */
export function getCardId(): string {
  const value = process.env[CARDS_ENV_VARS.CARD_ID];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CARD_ID}`);
  }
  return value;
}

/**
 * Reads the environment name from the environment.
 *
 * This value matches the environment key in settings.json (e.g., "default", "staging").
 * @returns The environment name
 * @throws Error if ENVIRONMENT is missing or empty
 * @example
 * ```typescript
 * const environment = getEnvironment();
 * console.log(`Environment: ${environment}`);
 * ```
 */
export function getEnvironment(): string {
  const value = process.env[CARDS_ENV_VARS.ENVIRONMENT];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.ENVIRONMENT}`);
  }
  return value;
}

/**
 * Reads the action button name from the environment.
 *
 * This is the display name of the action that triggered the handler, matching
 * the `actionName` field from `defineAction`.
 * @returns Display name of the action that triggered the current handler run.
 * @throws Error if ACTION_NAME is missing or empty
 * @example
 * ```typescript
 * const actionName = getActionName();
 * console.log(`Running action: ${actionName}`);
 * ```
 */
export function getActionName(): string {
  const value = process.env[CARDS_ENV_VARS.ACTION_NAME];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.ACTION_NAME}`);
  }
  return value;
}

/**
 * Reads the execution mode from the environment.
 *
 * Determines the UI interaction model for actions.
 * @returns The execution mode ('interactive' or 'background')
 * @throws Error if EXECUTION_MODE is missing, empty, or invalid
 * @example
 * ```typescript
 * const mode = getExecutionMode();
 * if (mode === 'interactive') {
 *   // Show user prompts
 * }
 * ```
 */
export function getExecutionMode(): 'interactive' | 'background' {
  const value = process.env[CARDS_ENV_VARS.EXECUTION_MODE];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.EXECUTION_MODE}`);
  }
  if (value !== 'interactive' && value !== 'background') {
    throw new Error(`Invalid ${CARDS_ENV_VARS.EXECUTION_MODE}: expected 'interactive' or 'background', got "${value}"`);
  }
  return value;
}

/**
 * Reads the API base URL from the environment.
 *
 * Use this as the base for constructing API endpoints. The URL does not include
 * a trailing slash.
 * @returns Base URL used to construct Cards API endpoints for this execution.
 * @throws Error if API_BASE_URL is missing or empty
 * @example
 * ```typescript
 * const apiUrl = getApiBaseUrl();
 * const endpoint = `${apiUrl}/cards/${cardId}`;
 * ```
 */
export function getApiBaseUrl(): string {
  const value = process.env[CARDS_ENV_VARS.API_BASE_URL];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.API_BASE_URL}`);
  }
  return value;
}

/**
 * Reads the API access token from the environment.
 *
 * Bearer token valid for the duration of this action or type hook execution.
 * Include in Authorization headers when calling the Cards API.
 * @returns Bearer token that authorizes API requests for this execution context.
 * @throws Error if API_ACCESS_TOKEN is missing or empty
 * @example
 * ```typescript
 * const token = getApiAccessToken();
 * const response = await fetch(apiUrl, {
 *   headers: { Authorization: `Bearer ${token}` }
 * });
 * ```
 */
export function getApiAccessToken(): string {
  const value = process.env[CARDS_ENV_VARS.API_ACCESS_TOKEN];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.API_ACCESS_TOKEN}`);
  }
  return value;
}

/**
 * Reads the configured coding agent identifier from the environment.
 *
 * Optional value from cards.codingAgent setting. When set, indicates which AI
 * coding assistant the user prefers. Actions can use this to customize behavior
 * or prompts for different agents.
 * @returns The coding agent identifier, or undefined if not set
 * @example
 * ```typescript
 * const codingAgent = getCodingAgent();
 * if (codingAgent === 'claude') {
 *   // Customize for Claude
 * }
 * ```
 */
export function getCodingAgent(): string | undefined {
  const value = process.env[CARDS_ENV_VARS.CODING_AGENT];
  if (value === undefined || value === '') {
    return undefined;
  }
  return value;
}

/**
 * Reads the registered type name for type hooks.
 *
 * This value is only present for type hook events.
 * @returns The registered type name
 * @throws Error if TYPE_NAME is missing or empty
 * @example
 * ```typescript
 * const typeName = getTypeName();
 * console.log(`Type: ${typeName}`);
 * ```
 */
export function getTypeName(): string {
  const value = process.env[CARDS_ENV_VARS.TYPE_NAME];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.TYPE_NAME}`);
  }
  return value;
}

/**
 * Reads the type version from the environment.
 *
 * This version comes from the type configuration in settings.json.
 * @returns The version string from type config
 * @throws Error if TYPE_VERSION is missing or empty
 * @example
 * ```typescript
 * const version = getTypeVersion();
 * console.log(`Version: ${version}`);
 * ```
 */
export function getTypeVersion(): string {
  const value = process.env[CARDS_ENV_VARS.TYPE_VERSION];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.TYPE_VERSION}`);
  }
  return value;
}

/**
 * Reads the typed file name for type hook events.
 *
 * This is the file name relative to the type directory, not a full path.
 * @returns The file name within the type directory
 * @throws Error if FILE_NAME is missing or empty
 * @example
 * ```typescript
 * const fileName = getFileName();
 * console.log(`File: ${fileName}`);
 * ```
 */
export function getFileName(): string {
  const value = process.env[CARDS_ENV_VARS.FILE_NAME];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.FILE_NAME}`);
  }
  return value;
}

/**
 * Reads the absolute path to the typed file.
 *
 * This is the fully resolved path on disk provided by the execution wrapper.
 * @returns The full path to the file
 * @throws Error if FILE_PATH is missing or empty
 * @example
 * ```typescript
 * const filePath = getFilePath();
 * console.log(`Path: ${filePath}`);
 * ```
 */
export function getFilePath(): string {
  const value = process.env[CARDS_ENV_VARS.FILE_PATH];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.FILE_PATH}`);
  }
  return value;
}

/**
 * Reads the typed file size from the environment.
 *
 * The value is parsed as a base-10 integer.
 * @returns The file size in bytes
 * @throws Error if FILE_SIZE is missing or not a number
 * @example
 * ```typescript
 * const size = getFileSize();
 * console.log(`Size: ${size} bytes`);
 * ```
 */
export function getFileSize(): number {
  const value = process.env[CARDS_ENV_VARS.FILE_SIZE];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.FILE_SIZE}`);
  }
  const size = Number.parseInt(value, 10);
  if (Number.isNaN(size)) {
    throw new Error(`Invalid ${CARDS_ENV_VARS.FILE_SIZE}: expected number, got "${value}"`);
  }
  return size;
}

/**
 * Reads the SHA256 hash for the typed file content.
 *
 * Useful for detecting content changes without reading the file again.
 * @returns The SHA256 hash of the content
 * @throws Error if SHA256 is missing or empty
 * @example
 * ```typescript
 * const hash = getSha256();
 * console.log(`Hash: ${hash}`);
 * ```
 */
export function getSha256(): string {
  const value = process.env[CARDS_ENV_VARS.SHA256];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.SHA256}`);
  }
  return value;
}

/**
 * Reads the MIME type for the typed file content.
 *
 * Provided for type hook events so validators can branch on content type.
 * @returns The MIME type of the content
 * @throws Error if CONTENT_TYPE is missing or empty
 * @example
 * ```typescript
 * const contentType = getContentType();
 * console.log(`Content type: ${contentType}`);
 * ```
 */
export function getContentType(): string {
  const value = process.env[CARDS_ENV_VARS.CONTENT_TYPE];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CONTENT_TYPE}`);
  }
  return value;
}

/**
 * Reads the VS Code bundled Node.js interpreter path from the environment.
 *
 * This is set by the extension during activation and injected into all
 * spawned action/hook processes. Configuration authors can use it to invoke
 * Node.js without relying on the system PATH.
 *
 * @returns The path to the Node.js interpreter
 * @throws Error if VSCODE_NODE is missing or empty
 * @example
 * ```typescript
 * const nodePath = getVscodeNodePath();
 * execFileSync(nodePath, ['script.js']);
 * ```
 */
export function getVscodeNodePath(): string {
  const value = process.env[CARDS_ENV_VARS.VSCODE_NODE];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.VSCODE_NODE}`);
  }
  return value;
}

/**
 * Reads the Unix domain socket path for runtime-to-dispatcher communication.
 *
 * @returns Unix socket path used to send runtime control messages.
 * @throws Error if SOCKET_PATH is missing or empty
 */
export function getSocketPath(): string {
  const value = process.env[CARDS_ENV_VARS.SOCKET_PATH];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.SOCKET_PATH}`);
  }
  return value;
}

/**
 * Reads the path to the switchToInteractive data file.
 *
 * This is optional — returns undefined when not set (i.e., the action
 * was not relaunched via switchToInteractive).
 *
 * @returns The file path, or undefined if not set
 */
export function getSwitchToInteractiveDataPath(): string | undefined {
  const value = process.env[CARDS_ENV_VARS.SWITCH_TO_INTERACTIVE_DATA_PATH];
  if (value === undefined || value === '') {
    return undefined;
  }
  return value;
}

/**
 * Reads the settings configuration directory path.
 *
 * @returns Absolute path to the directory containing generated settings artifacts.
 * @throws Error if CONFIG_PATH is missing or empty
 */
export function getConfigPath(): string {
  const value = process.env[CARDS_ENV_VARS.CONFIG_PATH];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CONFIG_PATH}`);
  }
  return value;
}

/**
 * Reads the VS Code workspace root directory path.
 *
 * @returns Absolute path to the active VS Code workspace root.
 * @throws Error if WORKSPACE_PATH is missing or empty
 */
export function getWorkspacePath(): string {
  const value = process.env[CARDS_ENV_VARS.WORKSPACE_PATH];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.WORKSPACE_PATH}`);
  }
  return value;
}

/**
 * Reads the card's repository directory path.
 *
 * @returns Absolute path to the repository associated with the active card.
 * @throws Error if CARD_REPO_PATH is missing or empty
 */
export function getCardRepoPath(): string {
  const value = process.env[CARDS_ENV_VARS.CARD_REPO_PATH];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CARD_REPO_PATH}`);
  }
  return value;
}

/**
 * Reads and parses the switchToInteractive data file.
 *
 * When `SWITCH_TO_INTERACTIVE_DATA_PATH` is set, reads the file at that path
 * and parses it as JSON. Returns undefined if the env var is not set.
 *
 * @returns The parsed data, or undefined if the path is not set
 * @throws Error if the file cannot be read or contains invalid JSON
 */
export function readSwitchToInteractiveData(): unknown | undefined {
  const dataPath = getSwitchToInteractiveDataPath();
  if (dataPath === undefined) {
    return undefined;
  }
  const content = readFileSync(dataPath, 'utf-8');
  return JSON.parse(content);
}

// ============================================================================
// Typed Input Extraction
// ============================================================================

/**
 * Builds a typed action input object from environment variables.
 *
 * Extracts all fields required for action handlers.
 *
 * @returns Typed ActionInput object
 * @throws Error if required env vars are missing or invalid
 * @example
 * ```typescript
 * // For an action handler
 * const input = extractActionInput();
 * console.log(input.cardId);
 * console.log(input.executionMode);
 * ```
 */
export function extractActionInput(): ActionInput {
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

/**
 * Builds a typed type hook input object from environment variables.
 *
 * Extracts all fields required for type lifecycle hooks (validator, create,
 * update, delete).
 *
 * @returns Typed TypeHookInput object
 * @throws Error if required env vars are missing or invalid
 * @example
 * ```typescript
 * // For a type hook handler
 * const input = extractTypeInput();
 * console.log(input.typeName);
 * console.log(input.fileName);
 * ```
 */
export function extractTypeInput(): TypeHookInput {
  return {
    cardId: getCardId(),
    environment: getEnvironment(),
    typeName: getTypeName(),
    typeVersion: getTypeVersion(),
    fileName: getFileName(),
    filePath: getFilePath(),
    fileSize: getFileSize(),
    fileSha256: getSha256(),
    contentType: getContentType(),
    apiBaseUrl: getApiBaseUrl(),
    apiAccessToken: getApiAccessToken()
  };
}
