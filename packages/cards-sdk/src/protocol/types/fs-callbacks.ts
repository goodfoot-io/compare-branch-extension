/**
 * Filesystem callback contracts for dependency injection.
 *
 * These signatures allow core logic to run in different environments (Node,
 * tests, or sandboxes) by providing filesystem access as arguments rather than
 * hard-coding `fs` usage.
 *
 * @module types/fs-callbacks
 */

// --- Synchronous Callbacks ---

/**
 * Synchronous existence check for a filesystem path.
 */
export type FileExistsCallback = (path: string) => boolean;

/**
 * Synchronous file read returning UTF-8 content.
 */
export type ReadFileCallback = (path: string) => string;

// --- Asynchronous Callbacks ---

/**
 * Async existence check for a filesystem path.
 */
export type AsyncFileExistsCallback = (path: string) => Promise<boolean>;

/**
 * Async file read returning UTF-8 content.
 */
export type AsyncReadFileCallback = (path: string) => Promise<string>;

/**
 * Async file write that replaces the file contents.
 */
export type AsyncWriteFileCallback = (path: string, content: string) => Promise<void>;
