/**
 * Environment variable utilities for Cards Extension hooks.
 *
 * Provides typed access to Cards Extension's environment variables
 * and utilities for extracting hook input from the environment.
 *
 * ## Environment Variables
 *
 * The execution-wrapper sets these environment variables when running hooks:
 *
 * | Variable | Description | Available In |
 * |----------|-------------|--------------|
 * | `CARD_ID` | Unique card identifier | All hooks |
 * | `EXECUTION_WRAPPER_PID` | Wrapper process ID | All hooks |
 * | `HOOK_IPC_SOCKET` | IPC socket path | All hooks |
 * @module
 */
import type { HookEventName, HookInputForEvent } from './types.js';
/**
 * Cards Extension environment variable names.
 *
 * These are the environment variables that execution-wrapper.mjs sets when running hooks.
 */
export declare const COMPARE_BRANCH_ENV_VARS: {
    /**
     * Unique identifier for the current card.
     * Available in all hooks.
     */
    readonly CARD_ID: "CARD_ID";
    /**
     * Process ID of the execution wrapper.
     * Available in all hooks.
     */
    readonly EXECUTION_WRAPPER_PID: "EXECUTION_WRAPPER_PID";
    /**
     * Path to the IPC socket for hook-to-wrapper communication.
     * Available in all hooks.
     */
    readonly HOOK_IPC_SOCKET: "HOOK_IPC_SOCKET";
    /**
     * The registered type name.
     * Available in typed file hooks (TypedFileCreated, TypedFileUpdated, TypedFileDeleted).
     */
    readonly TYPE_NAME: "TYPE_NAME";
    /**
     * The file name within the type directory.
     * Available in typed file hooks.
     */
    readonly FILE_NAME: "FILE_NAME";
    /**
     * Full path to the file.
     * Available in typed file hooks.
     */
    readonly FILE_PATH: "FILE_PATH";
    /**
     * MIME type of the content.
     * Available in typed file hooks.
     */
    readonly CONTENT_TYPE: "CONTENT_TYPE";
    /**
     * File size in bytes.
     * Available in typed file hooks.
     */
    readonly FILE_SIZE: "FILE_SIZE";
    /**
     * SHA256 hash of content.
     * Available in typed file hooks.
     */
    readonly SHA256: "SHA256";
    /**
     * Version from type config.
     * Available in typed file hooks.
     */
    readonly TYPE_VERSION: "TYPE_VERSION";
    /**
     * Optional metadata from validator (JSON string).
     * Available in typed file hooks.
     */
    readonly METADATA: "METADATA";
};
/**
 * Gets the card ID from environment.
 *
 * @returns The card ID
 * @throws Error if CARD_ID is not set
 * @example
 * ```typescript
 * const cardId = getCardId();
 * console.log(`Processing card: ${cardId}`);
 * ```
 */
export declare function getCardId(): string;
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
export declare function getExecutionWrapperPid(): number;
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
export declare function getHookIpcSocket(): string;
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
export declare function getTypeName(): string;
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
export declare function getFileName(): string;
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
export declare function getFilePath(): string;
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
export declare function getContentType(): string;
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
export declare function getFileSize(): number;
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
export declare function getSha256(): string;
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
export declare function getTypeVersion(): string;
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
export declare function getMetadata(): Record<string, unknown> | undefined;
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
 * // For a StartCard hook
 * const cardInput = extractInput('StartCard');
 * console.log(cardInput.cardId);  // TypeScript knows this exists
 * ```
 */
export declare function extractInput<T extends HookEventName>(hookEventName: T): HookInputForEvent<T>;
//# sourceMappingURL=env.d.ts.map