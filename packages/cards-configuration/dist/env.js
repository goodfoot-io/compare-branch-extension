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
 * @module
 */
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
  CONTENT_TYPE: 'CONTENT_TYPE'
};
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
export function getCardId() {
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
export function getEnvironment() {
  const value = process.env[CARDS_ENV_VARS.ENVIRONMENT];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.ENVIRONMENT}`);
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
export function getExecutionMode() {
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
 * @returns The API base URL
 * @throws Error if API_BASE_URL is missing or empty
 * @example
 * ```typescript
 * const apiUrl = getApiBaseUrl();
 * const endpoint = `${apiUrl}/cards/${cardId}`;
 * ```
 */
export function getApiBaseUrl() {
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
 * @returns The API access token
 * @throws Error if API_ACCESS_TOKEN is missing or empty
 * @example
 * ```typescript
 * const token = getApiAccessToken();
 * const response = await fetch(apiUrl, {
 *   headers: { Authorization: `Bearer ${token}` }
 * });
 * ```
 */
export function getApiAccessToken() {
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
export function getCodingAgent() {
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
export function getTypeName() {
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
export function getTypeVersion() {
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
export function getFileName() {
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
export function getFilePath() {
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
export function getFileSize() {
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
export function getSha256() {
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
export function getContentType() {
  const value = process.env[CARDS_ENV_VARS.CONTENT_TYPE];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CONTENT_TYPE}`);
  }
  return value;
}
// ============================================================================
// Typed Input Extraction
// ============================================================================
/**
 * Builds a typed action input object from environment variables.
 *
 * Extracts all fields required for action start and end handlers.
 *
 * @returns Typed ActionStartInput object
 * @throws Error if required env vars are missing or invalid
 * @example
 * ```typescript
 * // For an action handler
 * const input = extractActionInput();
 * console.log(input.cardId);
 * console.log(input.executionMode);
 * ```
 */
export function extractActionInput() {
  return {
    cardId: getCardId(),
    environment: getEnvironment(),
    executionMode: getExecutionMode(),
    apiBaseUrl: getApiBaseUrl(),
    apiAccessToken: getApiAccessToken(),
    codingAgent: getCodingAgent()
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
export function extractTypeInput() {
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
