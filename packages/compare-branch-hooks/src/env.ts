/**
 * Environment variable utilities for Compare Branch Extension hooks.
 *
 * Provides typed access to Compare Branch Extension's environment variables
 * and utilities for extracting hook input from the environment.
 *
 * ## Environment Variables
 *
 * The execution-wrapper sets these environment variables when running hooks:
 *
 * | Variable | Description | Available In |
 * |----------|-------------|--------------|
 * | `ISSUE_ID` | Unique issue identifier | All hooks |
 * | `EXECUTION_WRAPPER_PID` | Wrapper process ID | All hooks |
 * | `HOOK_IPC_SOCKET` | IPC socket path | All hooks |
 * @module
 */

import type { HookEventName, HookInputForEvent } from './types.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Compare Branch Extension environment variable names.
 *
 * These are the environment variables that execution-wrapper.mjs sets when running hooks.
 */
export const COMPARE_BRANCH_ENV_VARS = {
  /**
   * Unique identifier for the current issue.
   * Available in all hooks.
   */
  ISSUE_ID: 'ISSUE_ID',

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
 * Gets the issue ID from environment.
 *
 * @returns The issue ID
 * @throws Error if ISSUE_ID is not set
 * @example
 * ```typescript
 * const issueId = getIssueId();
 * console.log(`Processing issue: ${issueId}`);
 * ```
 */
export function getIssueId(): string {
  const value = process.env[COMPARE_BRANCH_ENV_VARS.ISSUE_ID];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${COMPARE_BRANCH_ENV_VARS.ISSUE_ID}`);
  }
  return value;
}

/**
 * Gets the execution wrapper PID from environment.
 *
 * @returns The execution wrapper process ID
 * @throws Error if EXECUTION_WRAPPER_PID is not set or invalid
 * @example
 * ```typescript
 * const pid = getExecutionWrapperPid();
 * console.log(`Wrapper PID: ${pid}`);
 * ```
 */
export function getExecutionWrapperPid(): number {
  const value = process.env[COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID}`);
  }
  const pid = Number.parseInt(value, 10);
  if (Number.isNaN(pid)) {
    throw new Error(`Invalid ${COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID}: expected number, got "${value}"`);
  }
  return pid;
}

/**
 * Gets the IPC socket path from environment.
 *
 * @returns The IPC socket path
 * @throws Error if HOOK_IPC_SOCKET is not set
 * @example
 * ```typescript
 * const socketPath = getHookIpcSocket();
 * console.log(`IPC socket: ${socketPath}`);
 * ```
 */
export function getHookIpcSocket(): string {
  const value = process.env[COMPARE_BRANCH_ENV_VARS.HOOK_IPC_SOCKET];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${COMPARE_BRANCH_ENV_VARS.HOOK_IPC_SOCKET}`);
  }
  return value;
}

/**
 * Gets the type name from environment.
 *
 * @returns The registered type name
 * @throws Error if TYPE_NAME is not set
 * @example
 * ```typescript
 * const typeName = getTypeName();
 * console.log(`Type: ${typeName}`);
 * ```
 */
export function getTypeName(): string {
  const value = process.env[COMPARE_BRANCH_ENV_VARS.TYPE_NAME];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${COMPARE_BRANCH_ENV_VARS.TYPE_NAME}`);
  }
  return value;
}

/**
 * Gets the file name from environment.
 *
 * @returns The file name within the type directory
 * @throws Error if FILE_NAME is not set
 * @example
 * ```typescript
 * const fileName = getFileName();
 * console.log(`File: ${fileName}`);
 * ```
 */
export function getFileName(): string {
  const value = process.env[COMPARE_BRANCH_ENV_VARS.FILE_NAME];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${COMPARE_BRANCH_ENV_VARS.FILE_NAME}`);
  }
  return value;
}

/**
 * Gets the file path from environment.
 *
 * @returns The full path to the file
 * @throws Error if FILE_PATH is not set
 * @example
 * ```typescript
 * const filePath = getFilePath();
 * console.log(`Path: ${filePath}`);
 * ```
 */
export function getFilePath(): string {
  const value = process.env[COMPARE_BRANCH_ENV_VARS.FILE_PATH];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${COMPARE_BRANCH_ENV_VARS.FILE_PATH}`);
  }
  return value;
}

/**
 * Gets the content type from environment.
 *
 * @returns The MIME type of the content
 * @throws Error if CONTENT_TYPE is not set
 * @example
 * ```typescript
 * const contentType = getContentType();
 * console.log(`Content type: ${contentType}`);
 * ```
 */
export function getContentType(): string {
  const value = process.env[COMPARE_BRANCH_ENV_VARS.CONTENT_TYPE];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${COMPARE_BRANCH_ENV_VARS.CONTENT_TYPE}`);
  }
  return value;
}

/**
 * Gets the file size from environment.
 *
 * @returns The file size in bytes
 * @throws Error if FILE_SIZE is not set or invalid
 * @example
 * ```typescript
 * const size = getFileSize();
 * console.log(`Size: ${size} bytes`);
 * ```
 */
export function getFileSize(): number {
  const value = process.env[COMPARE_BRANCH_ENV_VARS.FILE_SIZE];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${COMPARE_BRANCH_ENV_VARS.FILE_SIZE}`);
  }
  const size = Number.parseInt(value, 10);
  if (Number.isNaN(size)) {
    throw new Error(`Invalid ${COMPARE_BRANCH_ENV_VARS.FILE_SIZE}: expected number, got "${value}"`);
  }
  return size;
}

/**
 * Gets the SHA256 hash from environment.
 *
 * @returns The SHA256 hash of the content
 * @throws Error if SHA256 is not set
 * @example
 * ```typescript
 * const hash = getSha256();
 * console.log(`Hash: ${hash}`);
 * ```
 */
export function getSha256(): string {
  const value = process.env[COMPARE_BRANCH_ENV_VARS.SHA256];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${COMPARE_BRANCH_ENV_VARS.SHA256}`);
  }
  return value;
}

/**
 * Gets the type version from environment.
 *
 * @returns The version from type config
 * @throws Error if TYPE_VERSION is not set
 * @example
 * ```typescript
 * const version = getTypeVersion();
 * console.log(`Version: ${version}`);
 * ```
 */
export function getTypeVersion(): string {
  const value = process.env[COMPARE_BRANCH_ENV_VARS.TYPE_VERSION];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${COMPARE_BRANCH_ENV_VARS.TYPE_VERSION}`);
  }
  return value;
}

/**
 * Gets the metadata from environment.
 *
 * Parses optional metadata JSON string from the METADATA environment variable.
 *
 * @returns The parsed metadata object or undefined if not set
 * @throws Error if METADATA is set but not valid JSON
 * @example
 * ```typescript
 * const metadata = getMetadata();
 * if (metadata) {
 *   console.log(`Metadata:`, metadata);
 * }
 * ```
 */
export function getMetadata(): Record<string, unknown> | undefined {
  const value = process.env[COMPARE_BRANCH_ENV_VARS.METADATA];
  if (value === undefined || value === '') {
    return undefined;
  }
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch (_error) {
    throw new Error(`Invalid ${COMPARE_BRANCH_ENV_VARS.METADATA}: expected valid JSON, got "${value}"`);
  }
}

// ============================================================================
// Typed Input Extraction
// ============================================================================

/**
 * Extracts all environment variables into a typed input object based on hook type.
 *
 * This function reads environment variables and constructs the appropriate
 * typed input object for the specified hook event type.
 *
 * @template T - The hook event name
 * @param hookEventName - The type of hook being executed
 * @returns Typed input object with all relevant environment variables
 * @throws Error if required environment variables are missing
 * @example
 * ```typescript
 * // For a StartIssue hook
 * const issueInput = extractInput('StartIssue');
 * console.log(issueInput.issueId);  // TypeScript knows this exists
 * ```
 */
export function extractInput<T extends HookEventName>(hookEventName: T): HookInputForEvent<T> {
  // Base fields required by all hooks
  const baseInput = {
    issueId: getIssueId(),
    executionWrapperPid: getExecutionWrapperPid(),
    hookIpcSocket: getHookIpcSocket()
  };

  switch (hookEventName) {
    case 'StartIssue':
    case 'EndIssue':
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
