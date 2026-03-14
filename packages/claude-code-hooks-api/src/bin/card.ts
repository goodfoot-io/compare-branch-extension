/**
 * Read, create, attach, and detach card sessions via the Cards API.
 *
 * Locates the running Cards server through `~/.cards/cards-api.json`, then
 * dispatches to the requested subcommand. All output is JSON to stdout;
 * all errors go to stderr.
 *
 * @summary Card CLI for get, create, list, attach, detach, and action operations
 */

import { spawnSync } from 'node:child_process';
import { associatePidWithCard, findClaudePid, removePidEntry } from '@cards/claude-code-sessions';
import type { AddBranchRequest, CardCreateData, ListCardsOptions } from '@cards/sdk/client';
import { CardsClient } from '@cards/sdk/client';
import { discoverApiInfo } from '@cards/sdk/client/discovery';
import type { ActionResult } from '@cards/sdk/protocol';

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

const HELP = `Usage: card.mjs [options] <command>

Read, create, list, attach, and detach card sessions via the Cards API.
Locates the server through ~/.cards/cards-api.json, executes the command,
and prints the resulting Card JSON to stdout.

Options:
  -h, --help        Show this help text

Commands:
  <card-id>                      Fetch a card by its identifier
  create                         Create a card from JSON on stdin
  list [options]                 List cards with optional filters
  attach <card-id>               Associate this Claude session with a card
  detach                         Disassociate this Claude session from its card
  <card-id> action <action-id>  Execute an action on a card

Get:
  Pass a card identifier as the sole argument. The full Card object is
  returned, including repositoryPath for filesystem access.

  Examples:
    card.mjs feat-42
    card.mjs main-0001

Create:
  Pipe a JSON object to stdin. Required fields: title (non-empty string),
  description (string). Optional fields: tags (string[]), environment
  (string), gates ({ planRequired?: boolean, reviewRequired?: boolean }),
  relations ({ type: "blocks"|"duplicate"|"related", cardId: string }[]),
  plan (string, markdown content written to the card's PLAN.md).

  The response contains only server-generated fields not present in the
  input (e.g. id, status, timestamps), plus repositoryPath. Fields the
  caller already provided are omitted.

  Examples:
    card.mjs create <<'EOF'
    { "title": "Fix auth", "description": "Token refresh fails" }
    EOF

List:
  Lists cards for the current workspace. Detects workspacePath from git
  automatically, or pass --workspace-path explicitly.

  Options:
    --workspace-path <path>  Workspace root (default: git rev-parse --show-toplevel)
    --status <status>        Filter by status (todo, in_progress, needs_review, done, backlog, archived)
    --tag <tag>              Filter by tag (repeatable: --tag bug --tag feature)
    --search <query>         Full-text search in title and description
    --limit <n>              Maximum number of results
    --offset <n>             Pagination offset

  Examples:
    card.mjs list
    card.mjs list --status in_progress
    card.mjs list --tag bug --limit 10
    card.mjs list --tag bug --tag feature

Attach:
  Associates the current Claude process with a card in the session registry.
  Optionally registers the workspace branch and flushes any pending commits.

  Examples:
    card.mjs attach main-0001

Detach:
  Removes the current Claude process from the session registry.

  Examples:
    card.mjs detach

Action:
  Executes an action on a card via the server relay. The action ID is
  the lowercase identifier from the action definition (e.g., "launch").

  Examples:
    card.mjs <card-id> action launch

Exit codes:
  0  Success
  1  Error (missing arguments, invalid input, discovery failure, API error)`;

/**
 * Connects to the Cards API via discovery and returns a configured client.
 *
 * @param workspacePath - Explicit workspace path override. Falls back to git root auto-detection.
 * @returns A connected CardsClient instance.
 * @throws When API discovery fails.
 */
export async function connectClient(workspacePath?: string): Promise<CardsClient> {
  const resolved = workspacePath ?? getGitRoot() ?? undefined;
  if (!resolved) {
    throw new Error('could not detect workspace path — pass --workspace-path or run from inside a git repository');
  }
  const info = await discoverApiInfo();
  if (!info) {
    throw new Error('API discovery failed — is the cards server running?');
  }
  return new CardsClient({
    baseUrl: `http://${info.host}:${info.port}`,
    accessToken: info.accessToken,
    workspacePath: resolved
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
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);
  });
}

/**
 * Parsed result from card creation input, separating SDK-level card data
 * from CLI-only fields like `plan`.
 */
export interface ParsedCardInput {
  data: CardCreateData;
  plan?: string;
  /** Keys the caller explicitly provided — used to filter the create response. */
  inputKeys: Set<string>;
}

/**
 * Parses and validates card creation input from a raw JSON string.
 *
 * @param raw - Raw JSON string to parse.
 * @returns Validated card data, optional plan content, and the set of caller-provided keys.
 * @throws On invalid or missing fields.
 */
export function parseCardCreateInput(raw: string): ParsedCardInput {
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

  const inputKeys = new Set(Object.keys(parsed));

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
  if (Array.isArray(parsed['relations'])) {
    data.relations = parsed['relations'] as CardCreateData['relations'];
  }

  let plan: string | undefined;
  if (typeof parsed['plan'] === 'string') {
    plan = parsed['plan'];
  }

  return { data, plan, inputKeys };
}

/** Keys always included in the create response regardless of caller input. */
const CREATE_ALWAYS_INCLUDE = new Set(['id', 'repositoryPath']);

/**
 * Creates a card from JSON read on stdin and prints the result to stdout.
 *
 * The response contains only server-generated fields that the caller did not
 * provide, plus any keys in {@link CREATE_ALWAYS_INCLUDE}. This lets agents
 * learn the assigned id and repositoryPath without re-reading fields they
 * already know.
 *
 * When the input includes a `plan` string, it is written to the card via the
 * plan endpoint after creation.
 *
 * @param args - CLI arguments after the `create` subcommand. Supports `--workspace-path`.
 */
export async function createCard(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const raw = await readStdin();
  const { data, plan, inputKeys } = parseCardCreateInput(raw);
  const client = await connectClient(flags['workspace-path']?.[0]);
  const card = await client.createCard(data);

  if (plan !== undefined) {
    await client.updatePlan(card.id, plan);
  }

  const full = card as unknown as Record<string, unknown>;
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(full)) {
    if (CREATE_ALWAYS_INCLUDE.has(key) || !inputKeys.has(key)) {
      filtered[key] = value;
    }
  }
  console.log(JSON.stringify(filtered, null, 2));
}

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
 * Parses `--key value` pairs from a string array into a record.
 *
 * Accumulates multiple values for the same key (e.g. `--tag bug --tag feature`
 * produces `{ tag: ['bug', 'feature'] }`). Stops at the first positional
 * argument (one that doesn't start with `--`).
 *
 * @param args - CLI argument array to parse.
 * @returns Parsed key-to-values pairs with the leading `--` stripped from keys.
 * @throws Error when a flag is missing its value.
 */
function parseFlags(args: string[]): Record<string, string[]> {
  const flags: Record<string, string[]> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (!arg.startsWith('--')) break;
    const key = arg.slice(2);
    const value = args[++i];
    if (value === undefined) {
      throw new Error(`flag ${arg} requires a value`);
    }
    const existing = flags[key];
    if (existing) {
      existing.push(value);
    } else {
      flags[key] = [value];
    }
  }
  return flags;
}

/**
 * Lists cards for a workspace and prints the result as JSON to stdout.
 *
 * Detects `workspacePath` from the current git repository root unless
 * overridden via the `--workspace-path` flag.
 *
 * @param args - CLI arguments after the `list` subcommand.
 */
export async function listCards(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const client = await connectClient(flags['workspace-path']?.[0]);

  const options: ListCardsOptions = {};
  if (flags['status']) {
    options.status = flags['status'][0] as ListCardsOptions['status'];
  }
  if (flags['tag']) {
    options.tags = flags['tag'];
  }
  if (flags['search']) {
    options.search = flags['search'][0];
  }
  if (flags['limit']) {
    const n = parseInt(flags['limit'][0]!, 10);
    if (Number.isNaN(n) || n <= 0) throw new Error('--limit must be a positive integer');
    options.limit = n;
  }
  if (flags['offset']) {
    const n = parseInt(flags['offset'][0]!, 10);
    if (Number.isNaN(n) || n < 0) throw new Error('--offset must be a non-negative integer');
    options.offset = n;
  }

  const cards = await client.listCards(options);
  console.log(JSON.stringify(cards, null, 2));
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
export async function attachCard(
  cardId: string
): Promise<{ pid: number; cardId: string; branch: string | null; flushedCommits: number }> {
  const pid = findClaudePid();
  if (!pid) {
    throw new Error('could not find Claude ancestor PID');
  }

  const pendingCommits = await associatePidWithCard(pid, cardId);
  console.error(`card attach: PID ${pid} associated with card ${cardId}`);

  const client = await connectClient();

  // Register workspace branch if on a named branch.
  // parentBranch is set to the current branch itself — when working directly
  // on the base branch (not a worktree), the branch IS the comparison base.
  const branch = getCurrentBranch();
  if (branch) {
    const branchData: AddBranchRequest = { name: branch, parentBranch: branch };
    try {
      await client.addBranch(cardId, branchData);
      console.error(`card attach: registered branch ${branch}`);
    } catch (error) {
      console.error(
        `card attach: branch registration failed: ${error instanceof Error ? error.message : String(error)}`
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
        `card attach: failed to flush commit ${sha}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (pendingCommits.length > 0) {
    console.error(`card attach: flushed ${flushedCount}/${pendingCommits.length} pending commit(s)`);
  }

  return { pid, cardId, branch, flushedCommits: flushedCount };
}

/**
 * Executes an action on a card and prints the result to stdout.
 *
 * @param cardId - The card identifier.
 * @param actionName - The action identifier to execute.
 */
export async function executeAction(cardId: string, actionName: string): Promise<void> {
  const client = await connectClient();
  const result: ActionResult = await client.executeAction(cardId, actionName);
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Disassociates the current Claude session from its card.
 *
 * Finds the Claude ancestor PID and removes its entry from the session registry.
 *
 * @returns Result object with disassociation details.
 * @throws When Claude PID cannot be found.
 */
export async function detachCard(): Promise<{ pid: number }> {
  const pid = findClaudePid();
  if (!pid) {
    throw new Error('could not find Claude ancestor PID');
  }

  const entry = await removePidEntry(pid);
  if (entry) {
    console.error(`card detach: PID ${pid} disassociated from card ${entry.cardId ?? '(none)'}`);
  } else {
    console.error(`card detach: PID ${pid} had no active association`);
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
      run = createCard(process.argv.slice(3));
      break;
    case 'list':
      run = listCards(process.argv.slice(3));
      break;
    case 'attach': {
      const cardId = process.argv[3];
      if (!cardId) {
        console.error('card attach: missing card ID argument');
        process.exit(1);
      }
      run = attachCard(cardId).then((result) => {
        console.log(JSON.stringify({ success: true, ...result }));
      });
      break;
    }
    case 'detach':
      run = detachCard().then((result) => {
        console.log(JSON.stringify({ success: true, ...result }));
      });
      break;
    default: {
      // Resource-first: <card-id> [verb]
      const verb = process.argv[3];
      if (verb === 'action') {
        const actionId = process.argv[4];
        if (!actionId) {
          console.error('card action: missing action ID argument');
          process.exit(1);
        }
        run = executeAction(command, actionId);
      } else if (verb) {
        console.error(`card: unknown verb "${verb}"`);
        process.exit(1);
      } else {
        run = getCard(command);
      }
      break;
    }
  }

  run.catch((error: unknown) => {
    console.error('card:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
