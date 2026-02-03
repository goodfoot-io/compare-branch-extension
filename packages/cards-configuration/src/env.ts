/**
 * Environment variable utilities for Cards Extension hooks.
 *
 * The execution wrapper injects hook inputs via process.env. This module
 * provides strict getters and a typed extractor so hook handlers do not need
 * to parse environment variables manually.
 *
 * Use the individual getters when you only need one value; use
 * {@link extractInput} when you need a full typed payload for a hook event.
 * @module
 */

import type { HookEventName, HookInputForEvent } from './types.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Environment variable names set by the Cards execution wrapper.
 *
 * This is the single source of truth for env var keys used by hook processes.
 * Keep it in sync with the wrapper to avoid subtle "undefined input" bugs.
 */
export const CARDS_ENV_VARS = {
  /**
   * Unique identifier for the current card.
   * Available in all hooks.
   */
  CARD_ID: 'CARD_ID',

  /**
   * Process ID of the execution wrapper.
   * Available in all hooks.
   */
  EXECUTION_WRAPPER_PID: 'EXECUTION_WRAPPER_PID',

  /**
   * Path to the IPC socket for hook-to-wrapper communication.
   * Available in all hooks.
   */
  HOOK_IPC_SOCKET: 'HOOK_IPC_SOCKET',

  /**
   * The registered type name.
   * Available in typed file hooks (TypedFileCreated, TypedFileUpdated, TypedFileDeleted).
   */
  TYPE_NAME: 'TYPE_NAME',

  /**
   * The file name within the type directory.
   * Available in typed file hooks.
   */
  FILE_NAME: 'FILE_NAME',

  /**
   * Full path to the file.
   * Available in typed file hooks.
   */
  FILE_PATH: 'FILE_PATH',

  /**
   * MIME type of the content.
   * Available in typed file hooks.
   */
  CONTENT_TYPE: 'CONTENT_TYPE',

  /**
   * File size in bytes.
   * Available in typed file hooks.
   */
  FILE_SIZE: 'FILE_SIZE',

  /**
   * SHA256 hash of content.
   * Available in typed file hooks.
   */
  SHA256: 'SHA256',

  /**
   * Version from type config.
   * Available in typed file hooks.
   */
  TYPE_VERSION: 'TYPE_VERSION',

  /**
   * Optional metadata from validator (JSON string).
   * Available in typed file hooks.
   */
  METADATA: 'METADATA'
} as const;

// ============================================================================
// Individual Getters
// ============================================================================

/**
 * Reads the card identifier from the hook environment.
 *
 * The execution wrapper always sets this for every hook invocation.
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
 * Reads the execution-wrapper PID from the hook environment.
 *
 * This can be useful for correlating logs or diagnostics with the wrapper
 * process that launched the hook.
 * @returns The execution wrapper process ID
 * @throws Error if EXECUTION_WRAPPER_PID is missing or not a number
 * @example
 * ```typescript
 * const pid = getExecutionWrapperPid();
 * console.log(`Wrapper PID: ${pid}`);
 * ```
 */
export function getExecutionWrapperPid(): number {
  const value = process.env[CARDS_ENV_VARS.EXECUTION_WRAPPER_PID];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.EXECUTION_WRAPPER_PID}`);
  }
  const pid = Number.parseInt(value, 10);
  if (Number.isNaN(pid)) {
    throw new Error(`Invalid ${CARDS_ENV_VARS.EXECUTION_WRAPPER_PID}: expected number, got "${value}"`);
  }
  return pid;
}

/**
 * Reads the IPC socket path from the hook environment.
 *
 * This socket can be used for hook-to-wrapper communication when supported
 * by the Cards runtime.
 * @returns The IPC socket path
 * @throws Error if HOOK_IPC_SOCKET is missing or empty
 * @example
 * ```typescript
 * const socketPath = getHookIpcSocket();
 * console.log(`IPC socket: ${socketPath}`);
 * ```
 */
export function getHookIpcSocket(): string {
  const value = process.env[CARDS_ENV_VARS.HOOK_IPC_SOCKET];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.HOOK_IPC_SOCKET}`);
  }
  return value;
}

/**
 * Reads the registered type name for typed file hooks.
 *
 * This value is only present for TypedFile* events.
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
 * Reads the typed file name for TypedFile* events.
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
 * Reads the MIME type for the typed file content.
 *
 * Provided for TypedFile* events so validators can branch on content type.
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
 * Reads the declared type version for TypedFile* events.
 *
 * This version comes from the type configuration that registered the file.
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
 * Reads optional validator metadata from the environment.
 *
 * When present, METADATA is expected to be a JSON string produced by a type
 * validator. Missing or empty values return undefined.
 * @returns Parsed metadata object, or undefined when not provided
 * @throws Error if METADATA is present but not valid JSON
 * @example
 * ```typescript
 * const metadata = getMetadata();
 * if (metadata) {
 *   console.log('Metadata:', metadata);
 * }
 * ```
 */
export function getMetadata(): Record<string, unknown> | undefined {
  const value = process.env[CARDS_ENV_VARS.METADATA];
  if (value === undefined || value === '') {
    return undefined;
  }
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch (_error) {
    throw new Error(`Invalid ${CARDS_ENV_VARS.METADATA}: expected valid JSON, got "${value}"`);
  }
}

// ============================================================================
// Typed Input Extraction
// ============================================================================

/**
 * Builds a typed hook input object from environment variables.
 *
 * Base fields (cardId, executionWrapperPid, hookIpcSocket) are always required.
 * TypedFile* events also read file metadata and optional validator metadata.
 *
 * @template T - The hook event name
 * @param hookEventName - The event type being executed
 * @returns Typed input object for the event
 * @throws Error if required env vars are missing or metadata JSON is invalid
 * @example
 * ```typescript
 * // For a StartCard hook
 * const cardInput = extractInput('StartCard');
 * console.log(cardInput.cardId);
 * ```
 */
export function extractInput<T extends HookEventName>(hookEventName: T): HookInputForEvent<T> {
  // Base fields required by all hooks
  const baseInput = {
    cardId: getCardId(),
    executionWrapperPid: getExecutionWrapperPid(),
    hookIpcSocket: getHookIpcSocket()
  };

  switch (hookEventName) {
    case 'StartCard':
    case 'EndCard':
    case 'StartInterview':
    case 'EndInterview':
      return {
        hookEventName,
        ...baseInput
      } as HookInputForEvent<T>;

    case 'TypedFileCreated':
    case 'TypedFileUpdated':
    case 'TypedFileDeleted':
      return {
        hookEventName,
        ...baseInput,
        typeName: getTypeName(),
        fileName: getFileName(),
        filePath: getFilePath(),
        contentType: getContentType(),
        size: getFileSize(),
        sha256: getSha256(),
        typeVersion: getTypeVersion(),
        metadata: getMetadata()
      } as HookInputForEvent<T>;

    default: {
      // Exhaustiveness check
      const _exhaustive: never = hookEventName;
      throw new Error(`Unknown hook event name: ${_exhaustive}`);
    }
  }
}
