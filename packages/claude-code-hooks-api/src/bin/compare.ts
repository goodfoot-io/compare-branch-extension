/**
 * Manage the Cards API compare state via CLI.
 *
 * Locates the running Cards server through `~/.cards/cards-api.json`, then
 * dispatches to set, get, or clear. All output is JSON to stdout;
 * all errors go to stderr.
 *
 * @summary Compare CLI for set, get, and clear operations
 */

import { CardsClient } from '@cards/sdk/client';
import { discoverApiInfo } from '@cards/sdk/client/discovery';
import type { CompareRequest, CompareState } from '@cards/sdk/protocol';

const HELP = `Usage: compare.mjs [options] <command>

Manage the Cards API compare state.
Locates the server through ~/.cards/cards-api.json, executes the command,
and prints the resulting state to stdout.

Options:
  -h, --help       Show this help text

Commands:
  set              Set comparison from JSON on stdin
  get              Get current comparison state
  clear            Clear the active comparison

Set:
  Pipe a JSON object to stdin. Three request shapes are supported:
    Branch range:       { "baseRef": "main", "compareRef": "feature/x" }
    Dynamic worktree:   { "baseRef": "main", "repositoryPath": "/path/to/repo" }
    Fixed attribution:  { "compareRef": "feature/x", "attributionShas": ["abc..."] }

  Examples:
    compare.mjs set <<'EOF'
    { "baseRef": "main", "compareRef": "cards/main-1/1" }
    EOF

Get:
  Prints the current compare state as JSON, or a message if none is active.

  Examples:
    compare.mjs get

Clear:
  Removes the active comparison.

  Examples:
    compare.mjs clear

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
 * Parses compare request JSON from a raw string.
 *
 * @param raw - Raw JSON string to parse.
 * @returns Parsed CompareRequest.
 * @throws On empty or invalid input.
 */
export function parseCompareInput(raw: string): CompareRequest {
  if (!raw.trim()) {
    throw new Error('expected JSON on stdin');
  }
  try {
    return JSON.parse(raw) as CompareRequest;
  } catch {
    throw new Error('invalid JSON on stdin');
  }
}

/**
 * Sets the compare state from JSON on stdin and prints the result.
 */
export async function setCompare(): Promise<void> {
  const raw = await readStdin();
  const request = parseCompareInput(raw);
  const client = await connectClient();
  const state = await client.setCompare(request);
  console.log(JSON.stringify(state, null, 2));
}

/**
 * Gets the current compare state and prints it to stdout.
 *
 * @returns The current compare state, or null if no comparison is active.
 */
export async function getCompare(): Promise<CompareState | null> {
  const client = await connectClient();
  const state = await client.getCompare();
  if (!state) {
    console.log('No active comparison');
    return null;
  }
  console.log(JSON.stringify(state, null, 2));
  return state;
}

/**
 * Clears the active compare state.
 */
export async function clearCompare(): Promise<void> {
  const client = await connectClient();
  await client.clearCompare();
  console.log(JSON.stringify({ success: true }));
}

if (process.argv[1]?.endsWith('compare.mjs')) {
  const command = process.argv[2];

  if (!command || command === '-h' || command === '--help') {
    console.log(HELP);
    process.exit(command ? 0 : 1);
  }

  let run: Promise<void>;
  switch (command) {
    case 'set':
      run = setCompare();
      break;
    case 'get':
      run = getCompare().then(() => {});
      break;
    case 'clear':
      run = clearCompare();
      break;
    default:
      console.error(`compare: unknown command "${command}"`);
      process.exit(1);
  }

  run.catch((error: unknown) => {
    console.error('compare:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
