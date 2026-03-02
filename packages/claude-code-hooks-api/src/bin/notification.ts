/**
 * Send notifications to the Cards VSCode extension UI.
 *
 * Locates the running Cards server through `~/.cards/cards-api.json`, then
 * sends a notification via `POST /api/notifications`. The notification
 * surfaces as a VSCode information/warning/error message.
 *
 * @summary Notification CLI for the Cards API
 */

import { discoverApiInfo } from '@cards/sdk/client/discovery';
import type { NotificationSeverity } from '@cards/sdk/protocol';

const VALID_TYPES: readonly NotificationSeverity[] = ['error', 'warning', 'info'];

const HELP = `Usage: notification.mjs [options] --type <type> --title <title> --message <message> --source <source>

Send a notification to the Cards VSCode extension.
Locates the server through ~/.cards/cards-api.json and sends a notification
that surfaces as a VSCode message.

Options:
  -h, --help           Show this help text

Required:
  --type <type>        Severity: error, warning, or info
  --title <title>      Short title shown in the notification
  --message <message>  Detailed notification body
  --source <source>    Identifier for grouping/filtering (e.g. agent name)

Examples:
  notification.mjs --type info --title "Build complete" --message "All tests pass" --source my-agent
  notification.mjs --type warning --title "Slow query" --message "Query took 5s" --source db-monitor
  notification.mjs --type error --title "Deploy failed" --message "Exit code 1" --source ci

Exit codes:
  0  Success
  1  Error (missing arguments, discovery failure, API error)`;

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

/**
 * Sends a notification to the Cards API server.
 *
 * @param args - CLI arguments containing --type, --title, --message, and --source flags.
 */
export async function sendNotification(args: string[]): Promise<void> {
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
}

if (process.argv[1]?.endsWith('notification.mjs')) {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help')) {
    console.log(HELP);
    process.exit(0);
  }

  sendNotification(args).catch((error: unknown) => {
    console.error('notification:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
