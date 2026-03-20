/**
 * Commit formatter for MCP channel notifications.
 *
 * Converts a CardCommit into a compact, human-readable string suitable for
 * delivery as a channel notification payload.
 *
 * @summary Commit formatter for MCP channel notifications
 * @module cards-mcp-server/format
 */

import type { CardCommit } from '@cards/sdk/protocol';

/**
 * Formats a card repository commit as a compact diffstat string.
 *
 * @param commit - Commit metadata including per-file diff.
 * @returns Multi-line string with header and one file-status line per changed file.
 */
export function formatCommit(commit: CardCommit): string {
  const shortSha = commit.hash.slice(0, 7);
  const header = `${shortSha} - ${commit.author_name}: ${commit.message}`;

  const fileLines = commit.diff.files.map((f) => {
    if (f.status.startsWith('R') && f.from !== undefined) {
      return ` ${f.status} ${f.from} -> ${f.file}`;
    }
    return ` ${f.status} ${f.file}`;
  });

  return [header, ...fileLines].join('\n');
}
