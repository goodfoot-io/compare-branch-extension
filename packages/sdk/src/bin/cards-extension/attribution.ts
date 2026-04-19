/**
 * Attribution subcommand of the `cards-extension` CLI.
 *
 * Routes `set` / `get` / `clear` through the Cards API. All output is JSON to
 * stdout; all errors go to stderr via the parent dispatcher.
 *
 * @summary Attribution subcommand handlers for cards-extension
 */

import { CardsClient } from '@cards/sdk/client';
import { discoverApiInfo } from '@cards/sdk/client/discovery';
import type { CompareRequest, CompareState } from '@cards/sdk/protocol';

export const ATTRIBUTION_HELP = `Usage: cards-extension attribution <command>

Manage the Cards API attribution/comparison state.

Commands:
  set              Set comparison from JSON on stdin
  get              Get current comparison state
  clear            Clear the active comparison

Set:
  Pipe a JSON object to stdin. Three request shapes are supported:
    Branch range:       { "baseRef": "main", "compareRef": "feature/x" }
    Dynamic worktree:   { "baseRef": "main", "repositoryPath": "/path/to/repo" }
    Fixed attribution:  { "compareRef": "feature/x", "attributionShas": ["abc..."] }

Get:
  Prints the current compare state as JSON, or "No active comparison" if none.

Clear:
  Removes the active comparison.`;

/**
 * Connects to the Cards API via discovery and returns a configured client.
 *
 * @returns A connected CardsClient instance.
 * @throws When API discovery fails.
 */
async function connectClient(): Promise<CardsClient> {
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

async function setAttribution(): Promise<number> {
  const raw = await readStdin();
  const request = parseCompareInput(raw);
  const client = await connectClient();
  const state = await client.setCompare(request);
  console.log(JSON.stringify(state, null, 2));
  return 0;
}

async function getAttribution(): Promise<number> {
  const client = await connectClient();
  const state: CompareState | null = await client.getCompare();
  if (!state) {
    console.log('No active comparison');
    return 0;
  }
  console.log(JSON.stringify(state, null, 2));
  return 0;
}

async function clearAttribution(): Promise<number> {
  const client = await connectClient();
  await client.clearCompare();
  console.log(JSON.stringify({ success: true }));
  return 0;
}

/**
 * Dispatches an `attribution` subcommand (set/get/clear) and returns an exit code.
 *
 * @param args - Arguments following the `attribution` token.
 * @returns The intended process exit code. Never calls process.exit.
 */
export async function runAttribution(args: string[]): Promise<number> {
  if (args.includes('-h') || args.includes('--help')) {
    console.log(ATTRIBUTION_HELP);
    return 0;
  }

  const [command] = args;

  if (!command) {
    console.error(ATTRIBUTION_HELP);
    return 1;
  }

  try {
    switch (command) {
      case 'set':
        return await setAttribution();
      case 'get':
        return await getAttribution();
      case 'clear':
        return await clearAttribution();
      default:
        console.error(`cards-extension attribution: unknown command "${command}"`);
        console.error(ATTRIBUTION_HELP);
        return 1;
    }
  } catch (error) {
    console.error('cards-extension attribution:', error instanceof Error ? error.message : String(error));
    return 1;
  }
}
