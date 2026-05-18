/**
 * Cross-platform socket endpoint resolution.
 *
 * The watcher control channel is a Unix domain socket on POSIX. Windows does
 * not support binding `AF_UNIX` sockets at arbitrary filesystem paths (Node
 * raises `EACCES`/`ENOENT`), so on Windows the logical socket path is mapped
 * deterministically to a named pipe (`\\.\pipe\...`). Because the mapping is a
 * pure function of the logical path, the listening side and the connecting
 * side independently derive the identical endpoint and rendezvous without
 * exchanging the translated value.
 *
 * This is the single portability layer for the control channel — callers pass
 * the logical socket path through {@link socketEndpoint} for both `listen` and
 * `createConnection`.
 *
 * @summary Maps a logical control-socket path to a platform endpoint
 * @module
 */

import { createHash } from 'node:crypto';

/**
 * Resolves a logical socket path to the platform-appropriate `net` endpoint.
 *
 * On POSIX the path is returned unchanged. On Windows it is mapped to a stable
 * named-pipe name derived from a hash of the logical path so that independent
 * processes (listener and dialer) compute the same pipe.
 *
 * @param logicalPath - The logical Unix-socket path agreed by both sides.
 * @returns A string suitable for `server.listen` / `net.createConnection`.
 */
export function socketEndpoint(logicalPath: string): string {
  if (process.platform !== 'win32') {
    return logicalPath;
  }
  // Normalize separators/casing so listener and dialer hash identically even
  // if one side received the path with mixed separators.
  const normalized = logicalPath.replace(/\\/g, '/').toLowerCase();
  const digest = createHash('sha1').update(normalized).digest('hex').slice(0, 32);
  return `\\\\.\\pipe\\cards-watcher-${digest}`;
}
