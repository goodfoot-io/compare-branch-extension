/**
 * Notify subcommand of the `cards-extension` CLI.
 *
 * Sends a notification to the Cards VSCode extension via POST /api/notifications.
 *
 * @summary Notify subcommand handler for cards-extension
 */

import { discoverApiInfo } from '@cards/sdk/client/discovery';
import type { NotificationSeverity } from '@cards/sdk/protocol';

const VALID_TYPES: readonly NotificationSeverity[] = ['error', 'warning', 'info'];

export const NOTIFY_HELP = `Usage: cards-extension notify --type <type> --title <title> --message <message> --source <source>

Send a notification to the Cards VSCode extension.

Required:
  --type <type>        Severity: error, warning, or info
  --title <title>      Short title shown in the notification
  --message <message>  Detailed notification body
  --source <source>    Identifier for grouping/filtering (e.g. agent name)`;

/**
 * Parses `--key value` pairs from a string array into a record.
 *
 * @param args - CLI argument array to parse.
 * @returns Parsed key-value pairs with the leading `--` stripped from keys.
 * @throws Error when a flag is missing its value.
 */
function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = args[++i];
    if (value === undefined) {
      throw new Error(`flag ${arg} requires a value`);
    }
    flags[key] = value;
  }
  return flags;
}

async function sendNotification(args: string[]): Promise<number> {
  const flags = parseFlags(args);

  const type = flags['type'];
  const title = flags['title'];
  const message = flags['message'];
  const source = flags['source'];

  if (!type) throw new Error('missing required flag --type');
  if (!title) throw new Error('missing required flag --title');
  if (!message) throw new Error('missing required flag --message');
  if (!source) throw new Error('missing required flag --source');

  if (!VALID_TYPES.includes(type as NotificationSeverity)) {
    throw new Error(`invalid --type "${type}" — must be one of: ${VALID_TYPES.join(', ')}`);
  }

  const info = await discoverApiInfo();
  if (!info) {
    throw new Error('API discovery failed — is the cards server running?');
  }

  const url = `http://${info.host}:${info.port}/api/notifications`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${info.accessToken}`
    },
    body: JSON.stringify({ type, title, message, source })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`server responded with ${response.status}: ${body}`);
  }

  const result = await response.json();
  console.log(JSON.stringify(result));
  return 0;
}

/**
 * Parses notify flags and POSTs the notification payload to the Cards API.
 *
 * @param args - Arguments following the `notify` token.
 * @returns The intended process exit code. Never calls process.exit.
 */
export async function runNotify(args: string[]): Promise<number> {
  if (args.includes('-h') || args.includes('--help')) {
    console.log(NOTIFY_HELP);
    return 0;
  }

  try {
    return await sendNotification(args);
  } catch (error) {
    console.error('cards-extension notify:', error instanceof Error ? error.message : String(error));
    return 1;
  }
}
