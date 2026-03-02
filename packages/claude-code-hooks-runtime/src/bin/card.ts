/**
 * Read and create cards via the Cards API.
 *
 * Locates the running Cards server through `~/.cards/cards-api.json`, then
 * dispatches to a get or create subcommand. All output is JSON to stdout;
 * all errors go to stderr.
 *
 * @summary Card CLI for get and create operations
 */

import { spawnSync } from 'node:child_process';
import type { CardCreateData } from '@cards/sdk/client';
import { CardsClient } from '@cards/sdk/client';
import { discoverApiInfo } from '@cards/sdk/client/discovery';

const HELP = `Usage: card.mjs [options] <command>

Read and create cards via the Cards API.
Locates the server through ~/.cards/cards-api.json, executes the command,
and prints the resulting Card JSON to stdout.

Options:
  -h, --help       Show this help text

Commands:
  <card-id>        Fetch a card by its identifier
  create           Create a card from JSON on stdin

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

  Before creating a card, load the skill that matches the request type:
    Bug report       /runtime:card:bug-report
    Documentation    /runtime:card:documentation
    Enhancement      /runtime:card:enhancement
    Investigation    /runtime:card:investigation
    Maintenance      /runtime:card:maintenance
    Operations       /runtime:card:operations

  Examples:
    card.mjs create <<'EOF'
    { "title": "Fix auth", "description": "Token refresh fails" }
    EOF

    echo '{"title":"Spike","description":"Research caching"}' | card.mjs create

Output:
  Both commands print the full Card JSON to stdout with 2-space indent.
  The object includes id, title, status, tags, gates, repositoryPath,
  createdAt, updatedAt, description, and other metadata fields.

Exit codes:
  0  Success
  1  Error (missing arguments, invalid input, discovery failure, API error)`;

/**
 * Detects the git repository root directory.
 *
 * @returns Absolute path to the repo root, or null if not in a git repo.
 */
function getGitRoot(): string | null {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf-8',
    timeout: 3000
  });
  if (result.error || result.status !== 0) return null;
  return result.stdout.trim() || null;
}

/**
 * Connects to the Cards API via discovery and returns a configured client.
 *
 * @param workspacePath - Explicit workspace path override. Falls back to git root auto-detection.
 * @returns A connected CardsClient instance.
 * @throws When API discovery fails.
 */
async function connectClient(workspacePath?: string): Promise<CardsClient> {
  const info = await discoverApiInfo();
  if (!info) {
    console.error('card: API discovery failed — is the cards server running?');
    process.exit(1);
  }
  return new CardsClient({
    baseUrl: `http://${info.host}:${info.port}`,
    accessToken: info.accessToken,
    workspacePath: workspacePath ?? getGitRoot() ?? undefined
  });
}

/**
 * Fetches a card by ID and prints its metadata as JSON to stdout.
 *
 * @param cardId - The card identifier to look up.
 */
async function getCard(cardId: string): Promise<void> {
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
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);
  });
}

/**
 * Parses `--key value` pairs from a string array into a record.
 *
 * Stops at the first positional argument (one that doesn't start with `--`).
 *
 * @param args - CLI argument array to parse.
 * @returns Parsed key-value pairs with the leading `--` stripped from keys.
 * @throws Error when a flag is missing its value.
 */
function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith('--')) break;
    const key = arg.slice(2);
    const value = args[++i];
    if (value === undefined) {
      throw new Error(`flag ${arg} requires a value`);
    }
    flags[key] = value;
  }
  return flags;
}

/**
 * Creates a card from JSON read on stdin and prints the result to stdout.
 *
 * Validates that the required `title` and `description` fields are present,
 * then passes through all valid {@link CardCreateData} fields to the API.
 *
 * @param args - CLI arguments after the `create` subcommand. Supports `--workspace-path`.
 */
async function createCard(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const raw = await readStdin();
  if (!raw.trim()) {
    console.error('card create: expected JSON on stdin');
    process.exit(1);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    console.error('card create: invalid JSON on stdin');
    process.exit(1);
  }

  if (typeof parsed['title'] !== 'string' || !parsed['title'].trim()) {
    console.error('card create: missing required field "title"');
    process.exit(1);
  }
  if (typeof parsed['description'] !== 'string') {
    console.error('card create: missing required field "description"');
    process.exit(1);
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

  const client = await connectClient(flags['workspace-path']);
  const card = await client.createCard(data);
  console.log(JSON.stringify(card, null, 2));
}

if (process.argv[1]?.endsWith('card.mjs')) {
  const command = process.argv[2];

  if (!command || command === '-h' || command === '--help') {
    console.log(HELP);
    process.exit(command ? 0 : 1);
  }

  const run = command === 'create' ? createCard(process.argv.slice(3)) : getCard(command);
  run.catch((error: unknown) => {
    console.error('card:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
