/**
 * Session attribution filter for card repository commits.
 *
 * Determines whether a given commit SHA was authored by the current
 * agent session so the MCP server can suppress self-notifications.
 *
 * @summary Session attribution filter for card repository commits
 * @module cards-mcp-server/filter
 */

import { getSessionCommits } from '@cards/sessions/card-repo';

/**
 * Returns true when the given commit SHA was made by the specified session.
 *
 * @param sessionId - agent session identifier.
 * @param commitSha - Full commit SHA to test.
 * @returns `true` if the commit belongs to the session; `false` otherwise.
 */
export function isSessionCommit(sessionId: string, commitSha: string): boolean {
  const commits = getSessionCommits(sessionId);
  return commits.includes(commitSha);
}
