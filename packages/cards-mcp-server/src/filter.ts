import { getSessionCommits } from '@cards/claude-code-sessions/card-repo';

export function isSessionCommit(sessionId: string, commitSha: string): boolean {
  const commits = getSessionCommits(sessionId);
  return commits.includes(commitSha);
}
