/**
 * PostToolUse hook that watches for Cards API write operations via curl.
 *
 * When a curl write to a `/cards/:id` endpoint is detected, this hook
 * associates the Claude PID with the card and retroactively flushes any
 * pending commits that were recorded before the association was established.
 *
 *
 * @summary PostToolUse hook that watches for Cards API write operations via curl
 * @module post-tool-use-card-association
 */

import { spawnSync } from 'node:child_process';
import { associatePidWithCard, findClaudePid, getPidCardId } from '@cards/claude-code-sessions';
import { postToolUseHook, postToolUseOutput } from '@goodfoot/claude-code-hooks';
import { createCardsClient, discoverApiInfo } from './lib/api-discovery.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CARD_URL_PATTERN = /\/cards\/([a-zA-Z0-9][a-zA-Z0-9_-]*\d)/;
const EXPLICIT_METHOD_PATTERN = /-X\s+(\w+)|--request\s+(\w+)/;
const IMPLICIT_POST_PATTERN = /(?:^|\s)(?:-d|--data|--data-raw|--data-binary)(?:\s|=)/;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

function isValidSha(sha: string): boolean {
  return SHA_PATTERN.test(sha);
}

function isAncestorOfHead(sha: string): boolean {
  if (!isValidSha(sha)) return false;

  const result = spawnSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], {
    stdio: 'ignore',
    timeout: 3000
  });

  return !result.error && result.status === 0;
}

/**
 * Detects whether a curl command performs a write operation and extracts the
 * card ID. Returns null if the command is not a curl write to a Cards API
 * endpoint.
 *
 * @param command - Raw shell command captured by the PostToolUse hook.
 * @returns Target card ID for write operations, or `null` when the command
 *   is read-only or unrelated to Cards endpoints.
 */
export function parseCurlWriteCardId(command: string): string | null {
  if (!command.includes('curl')) return null;

  const explicitMatch = command.match(EXPLICIT_METHOD_PATTERN);
  if (explicitMatch) {
    const method = (explicitMatch[1] ?? explicitMatch[2])?.toUpperCase() ?? '';
    if (!WRITE_METHODS.has(method)) return null;
  } else if (!IMPLICIT_POST_PATTERN.test(command)) {
    return null;
  }

  return command.match(CARD_URL_PATTERN)?.[1] ?? null;
}

export default postToolUseHook({ matcher: 'Bash' }, async (input, { logger }) => {
  // Skip entirely when CARD_ID is set (execution wrapper handles attribution)
  if (process.env.CARD_ID) {
    return postToolUseOutput({});
  }

  try {
    const cardId = parseCurlWriteCardId(input.tool_input.command);
    if (!cardId) return postToolUseOutput({});

    const pid = findClaudePid();
    if (!pid) return postToolUseOutput({});

    const existingCardId = await getPidCardId(pid, logger);
    if (existingCardId) return postToolUseOutput({});

    // Associate PID with card and retrieve pending commits
    const apiInfo = await discoverApiInfo(logger);
    const pendingCommits = await associatePidWithCard(pid, cardId, logger);
    if (pendingCommits.length === 0) {
      return postToolUseOutput({});
    }

    // Create a CardsClient for flushing commits
    const client = apiInfo ? await createCardsClient(logger) : null;

    if (!client) {
      return postToolUseOutput({
        systemMessage: `PID ${pid} associated with card ${cardId}. 0 pending commit(s) attributed (no API connection).`
      });
    }

    // Flush pending commits: verify reachability, then add via CardsClient
    let flushedCount = 0;
    for (const sha of pendingCommits) {
      if (!isAncestorOfHead(sha)) {
        continue; // SHA is unreachable (rebased/amended), skip it
      }

      try {
        await client.addCommit(cardId, sha);
        flushedCount++;
      } catch {
        // Fail open per commit
      }
    }

    return postToolUseOutput({
      systemMessage: `PID ${pid} associated with card ${cardId}. ${flushedCount} pending commit(s) attributed.`
    });
  } catch {
    return postToolUseOutput({});
  }
});
