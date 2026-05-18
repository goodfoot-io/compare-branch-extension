/**
 * Cross-platform IPC endpoint addressing.
 *
 * The runtime/dispatcher channel is a local stream socket. On POSIX systems
 * this is a Unix domain socket bound to a filesystem path. Windows does not
 * support Unix domain sockets for `net.Server`/`net.createConnection` in the
 * same way; the equivalent local IPC primitive is a named pipe addressed as
 * `\\.\pipe\<name>`.
 *
 * Node's `net` module accepts a named-pipe string anywhere it accepts a Unix
 * socket path, so the only platform-specific concern is *constructing* the
 * endpoint address. This module is the single portability layer for that: all
 * code that needs to create or address the IPC endpoint must route through
 * {@link createIpcEndpoint}, rather than scattering `os.tmpdir()` / `.sock` /
 * `\\.\pipe\` branches across the codebase.
 *
 * @summary Cross-platform IPC endpoint addressing
 * @module
 */

import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Builds a platform-correct local IPC endpoint address.
 *
 * On POSIX, returns a Unix domain socket path under the OS temp directory.
 * On Windows, returns a named-pipe address (`\\.\pipe\<name>`); named pipes
 * are not filesystem entries and require no cleanup.
 *
 * The returned string is suitable for both `net.Server.listen()` and
 * `net.createConnection()`.
 *
 * @param name - Caller-unique base name (e.g. including pid + timestamp) used
 *   to disambiguate concurrent endpoints. Path/pipe-unsafe characters are not
 *   sanitized; callers should pass simple identifiers.
 * @returns The platform-appropriate endpoint address.
 */
export function createIpcEndpoint(name: string): string {
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\${name}`;
  }
  return path.join(os.tmpdir(), `${name}.sock`);
}

/**
 * Builds a deterministically non-existent IPC endpoint address for the current
 * platform.
 *
 * Used by tests and fail-open paths that need an address guaranteed to fail
 * connection (no server is or will be bound to it).
 *
 * @param name - Base name for the (non-existent) endpoint.
 * @returns A platform-appropriate address that nothing is listening on.
 */
export function createNonexistentIpcEndpoint(name: string): string {
  return createIpcEndpoint(name);
}
