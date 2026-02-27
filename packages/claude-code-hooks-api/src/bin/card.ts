/**
 * Read, create, start, and stop card sessions via the Cards API.
 *
 * Locates the running Cards server through `~/.cards/cards-api.json`, then
 * dispatches to the requested subcommand. All output is JSON to stdout;
 * all errors go to stderr.
 *
 * @summary Card CLI for get, create, start, and stop operations
 */

import { spawnSync } from 'node:child_process';
import { associatePidWithCard, findClaudePid, removePidEntry } from '@cards/claude-code-sessions';
import type { AddBranchRequest, CardCreateData } from '@cards/sdk/client';
import { CardsClient } from '@cards/sdk/client';
import { discoverApiInfo } from '@cards/sdk/client/discovery';

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

const HELP = `Usage: card.mjs [options] <command>

Read, create, start, and stop card sessions via the Cards API.
Locates the server through ~/.cards/cards-api.json, executes the command,
and prints the resulting Card JSON to stdout.

Options:
  -h, --help       Show this help text

Commands:
  <card-id>        Fetch a card by its identifier
  create           Create a card from JSON on stdin
  start <card-id>  Associate this Claude session with a card
  stop             Disassociate this Claude session from its card

Get:
  Pass a card identifier as the sole argument. The full Card object is
  returned, including repositoryPath for filesystem access.

  Examples:
    card.mjs feat-42
    card.mjs main-0001

Create:
  Pipe a JSON object to stdin. Required fields: title (non-empty string),
  description (string). Optional fields: tags (string[]), environment
  (string), gates ({ planRequired?: boolean, reviewRequired?: boolean }).

  Examples:
    card.mjs create <<'EOF'
    { "title": "Fix auth", "description": "Token refresh fails" }
    EOF

Start:
  Associates the current Claude process with a card in the session registry.
  Optionally registers the workspace branch and flushes any pending commits.

  Examples:
    card.mjs start main-0001

Stop:
  Removes the current Claude process from the session registry.

  Examples:
    card.mjs stop

Exit codes:
  0  Success
  1  Error (missing arguments, invalid input, discovery failure, API error)`;

/**
 * Connects to the Cards API via discovery and returns a configured client.
 *
 * @returns A connected CardsClient instance.
 * @throws When API discovery fails.
 */
export async function connectClient(): Promise<CardsClient> {
  const info = await discoverApiInfo();
  if (!info) {
    throw new Error('API discovery failed — is the cards server running?');
  }
  return new CardsClient({
    baseUrl: `http://${info.host}:${info.port}`,
    accessToken: info.accessToken
  });
}

/**
 * Fetches a card by ID and prints its metadata as JSON to stdout.
 *
 * @param cardId - The card identifier to look up.
 */
export async function getCard(cardId: string): Promise<void> {
  const client = await connectClient();
  const card = await client.getCard(cardId);
  console.log(JSON.stringify(card, null, 2));
}

/**
 * Reads all data from stdin as a UTF-8 string.
 *
 * @returns The complete stdin content.
 */
function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString()));
    process.stdin.on('error', reject);
  });
}

/**
 * Parses and validates card creation input from a raw JSON string.
 *
 * @param raw - Raw JSON string to parse.
 * @returns Validated CardCreateData.
 * @throws On invalid or missing fields.
 */
export function parseCardCreateInput(raw: string): CardCreateData {
  if (!raw.trim()) {
    throw new Error('expected JSON on stdin');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error('invalid JSON on stdin');
  }

  if (typeof parsed['title'] !== 'string' || !parsed['title'].trim()) {
    throw new Error('missing required field "title"');
  }
  if (typeof parsed['description'] !== 'string') {
    throw new Error('missing required field "description"');
  }

  const data: CardCreateData = {
    title: parsed['title'],
    description: parsed['description']
  };
  if (Array.isArray(parsed['tags'])) {
    data.tags = parsed['tags'] as string[];
  }
  if (typeof parsed['environment'] === 'string') {
    data.environment = parsed['environment'];
  }
  if (parsed['gates'] != null && typeof parsed['gates'] === 'object') {
    const g = parsed['gates'] as Record<string, unknown>;
    data.gates = {
      ...(typeof g['planRequired'] === 'boolean' ? { planRequired: g['planRequired'] } : {}),
      ...(typeof g['reviewRequired'] === 'boolean' ? { reviewRequired: g['reviewRequired'] } : {})
    };
  }

  return data;
}

/**
 * Creates a card from JSON read on stdin and prints the result to stdout.
 */
export async function createCard(): Promise<void> {
  const raw = await readStdin();
  const data = parseCardCreateInput(raw);
  const client = await connectClient();
  const card = await client.createCard(data);
  console.log(JSON.stringify(card, null, 2));
}

/**
 * Detects the current git branch name.
 *
 * @returns The branch name, or null if on detached HEAD or git unavailable.
 */
export function getCurrentBranch(): string | null {
  const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf-8',
    timeout: 3000
  });
  if (result.error || result.status !== 0) return null;
  const branch = result.stdout.trim();
  return branch && branch !== 'HEAD' ? branch : null;
}

/**
 * Checks whether a commit SHA is an ancestor of HEAD.
 *
 * @param sha - Full 40-character commit hash to check.
 * @returns True if the SHA is reachable from HEAD.
 */
export function isAncestorOfHead(sha: string): boolean {
  if (!SHA_PATTERN.test(sha)) return false;
  const result = spawnSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], {
    stdio: 'ignore',
    timeout: 3000
  });
  return !result.error && result.status === 0;
}

/**
 * Associates the current Claude session with a card.
 *
 * Finds the Claude ancestor PID, associates it with the card in the session
 * registry, optionally registers the workspace branch, and flushes any
 * pending commits that were buffered before association.
 *
 * @param cardId - The card identifier to associate with.
 * @returns Result object with association details.
 * @throws When Claude PID cannot be found.
 */
export async function startCard(
  cardId: string
): Promise<{ pid: number; cardId: string; branch: string | null; flushedCommits: number }> {
  const pid = findClaudePid();
  if (!pid) {
    throw new Error('could not find Claude ancestor PID');
  }

  const pendingCommits = await associatePidWithCard(pid, cardId);
  console.error(`card start: PID ${pid} associated with card ${cardId}`);

  const client = await connectClient();

  // Register workspace branch if on a named branch
  const branch = getCurrentBranch();
  if (branch) {
    const branchData: AddBranchRequest = { name: branch };
    try {
      await client.addBranch(cardId, branchData);
      console.error(`card start: registered branch ${branch}`);
    } catch (error) {
      console.error(
        `card start: branch registration failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Flush pending commits
  let flushedCount = 0;
  for (const sha of pendingCommits) {
    if (!isAncestorOfHead(sha)) continue;
    try {
      await client.addCommit(cardId, sha);
      flushedCount++;
    } catch (error) {
      console.error(
        `card start: failed to flush commit ${sha}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (pendingCommits.length > 0) {
    console.error(`card start: flushed ${flushedCount}/${pendingCommits.length} pending commit(s)`);
  }

  return { pid, cardId, branch, flushedCommits: flushedCount };
}

/**
 * Disassociates the current Claude session from its card.
 *
 * Finds the Claude ancestor PID and removes its entry from the session registry.
 *
 * @returns Result object with disassociation details.
 * @throws When Claude PID cannot be found.
 */
export async function stopCard(): Promise<{ pid: number }> {
  const pid = findClaudePid();
  if (!pid) {
    throw new Error('could not find Claude ancestor PID');
  }

  const entry = await removePidEntry(pid);
  if (entry) {
    console.error(`card stop: PID ${pid} disassociated from card ${entry.cardId ?? '(none)'}`);
  } else {
    console.error(`card stop: PID ${pid} had no active association`);
  }

  return { pid };
}

if (process.argv[1]?.endsWith('card.mjs')) {
  const command = process.argv[2];

  if (!command || command === '-h' || command === '--help') {
    console.log(HELP);
    process.exit(command ? 0 : 1);
  }

  let run: Promise<void>;
  switch (command) {
    case 'create':
      run = createCard();
      break;
    case 'start': {
      const cardId = process.argv[3];
      if (!cardId) {
        console.error('card start: missing card ID argument');
        process.exit(1);
      }
      run = startCard(cardId).then((result) => {
        console.log(JSON.stringify({ success: true, ...result }));
      });
      break;
    }
    case 'stop':
      run = stopCard().then((result) => {
        console.log(JSON.stringify({ success: true, ...result }));
      });
      break;
    default:
      run = getCard(command);
      break;
  }

  run.catch((error: unknown) => {
    console.error('card:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
