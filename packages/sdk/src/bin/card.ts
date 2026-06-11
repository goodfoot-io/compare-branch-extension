/**
 * Read, create, list, search, and act on cards via the Cards API.
 *
 * Locates the running Cards server through `~/.cards/cards-api.json`, then
 * dispatches to the requested subcommand. All output is JSON to stdout;
 * all errors go to stderr.
 *
 * @summary Card CLI for get, create, list, search, watch, and action operations
 */

import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import { promisify } from 'node:util';
import { resolveExtensionPath } from '@cards/sdk';
import { requestProcessExit } from '@cards/sdk/bin/process-utils';
import { getCommitsSince } from '@cards/sdk/card-repo';
import { toCardListSummaries } from '@cards/sdk/card-summary';
import { resolveCardsParentBranch } from '@cards/sdk/cards-parent-branch';
import type { CardCreateData, ListCardsOptions } from '@cards/sdk/client';
import {
  CardsClient,
  calculateBackoffMs,
  EventSubscriber,
  formatCommit,
  getUnattributedCommits,
  isBookkeepingCommit
} from '@cards/sdk/client';
import { discoverApiInfo } from '@cards/sdk/client/discovery';
import type { ActionResult, CardCommit, CardCommitEvent, ExecutionMode } from '@cards/sdk/protocol';
import { DERIVED_TAGS, filterCardsByTags, parseSearchQuery } from '@cards/sdk/search-utils';
import { resolveSessionId } from '@cards/sdk/session-resolver';
import { readUnboundCandidates, removeUnboundCandidate } from '@cards/sdk/unbound-worktree-candidates';
import { outfitWorktreeForCard } from '@cards/sdk/worktree-for-card';
import { appendCommitToSession, getSessionCommits, readSessionHeadSha } from '@cards/sessions/card-repo';
import { JSONPath } from 'jsonpath-plus';
import { minimatch } from 'minimatch';

const execFileAsync = promisify(execFile);

/**
 * Resolves the toplevel directory of the linked git worktree `card create` is
 * running inside, or `null` when cwd is the main worktree or not a git repo.
 *
 * A linked worktree has a git-dir distinct from its common dir
 * (`git rev-parse --git-dir` ≠ `--git-common-dir`); the main worktree has them
 * equal and is never a bind target. This is the cwd-primary leg of
 * {@link resolveBindTarget}.
 *
 * @returns Absolute toplevel path of the linked worktree, or null.
 */
async function resolveLinkedWorktreeDir(): Promise<string | null> {
  try {
    const [gitDir, gitCommonDir, toplevel] = await Promise.all([
      execFileAsync('git', ['rev-parse', '--path-format=absolute', '--git-dir']).then((r) => r.stdout.trim()),
      execFileAsync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir']).then((r) => r.stdout.trim()),
      execFileAsync('git', ['rev-parse', '--show-toplevel']).then((r) => r.stdout.trim())
    ]);
    if (gitDir === gitCommonDir) return null;
    return toplevel;
  } catch {
    // Not a git repository, or git unavailable — no linked worktree to bind.
    return null;
  }
}

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

const HELP = `Usage: card [options] <command>

Read, create, list, search, and act on cards via the Cards API.
Locates the server through ~/.cards/cards-api.json, executes the command,
and prints the resulting Card JSON to stdout.

Options:
  -h, --help              Show this help text
  --jsonpath <expr>       Filter JSON output with a JSONPath expression.
                          Single primitive results are printed raw (no quotes);
                          object/array results and multi-match results are
                          printed as JSON. Supported on get, create, list,
                          search, and action subcommands.
                          Example: --jsonpath '$.repositoryPath'

Commands:
  <card-id>                      Fetch a card by its identifier
  create                         Create a card from JSON on stdin
  list [options]                 List cards with optional filters
  search [query] [options]       Search cards using #tag @relation text syntax
  <card-id> action <action-id> [options]  Execute an action on a card
  <card-id> watch [glob...]     Wait for next unattributed commit

Get:
  Pass a card identifier as the sole argument. The full Card object is
  returned, including repositoryPath for filesystem access.

  Examples:
    card feat-42
    card main-0001

Create:
  Pipe a JSON object to stdin. Required fields: title (non-empty string).
  Optional fields: tags (string[]), environment (string),
  gates ({ planRequired?: boolean, mergeRequestRequired?: boolean }),
  relations ({ type: "related", cardId: string }[]).

  The response contains only server-generated fields not present in the
  input (e.g. id, status, timestamps), plus repositoryPath. Fields the
  caller already provided are omitted.

  Examples:
    card create <<'EOF'
    { "title": "Fix auth", "tags": ["bug"] }
    EOF

List:
  Lists cards for the current workspace. Detects workspacePath from git
  automatically, or pass --workspace-path explicitly.

  Options:
    --workspace-path <path>  Workspace root (default: git rev-parse --show-toplevel)
    --status <status>        Filter by status (todo, active, needs_review, done, archived)
    --limit <n>              Maximum number of results
    --offset <n>             Pagination offset

  Examples:
    card list
    card list --status active
    card list --limit 10

Search:
  Searches cards using a unified query syntax. Supports free text, #tag filters,
  and @relation filters. Derived tags (planning, merge-requested, merged, unmerged)
  are computed client-side.

  Options:
    --workspace-path <path>  Workspace root (default: git rev-parse --show-toplevel)
    --status <status>        Filter by status
    --limit <n>              Maximum number of results
    --offset <n>             Pagination offset

  Examples:
    card search "login bug"
    card search "#auth @main-5 login" --status active
    card search "#planning" --limit 20
    card search "@main-42"

Action:
  Executes an action on a card via the server relay. The action ID is
  the lowercase identifier from the action definition (e.g., "launch").

  Options:
    --execution-mode <mode>  Execution mode: "interactive" or "background".
                             When omitted, the server derives the mode from
                             the action's supportsBackgroundMode flag
                             (background when true, interactive otherwise).
                             An explicit "background" request is rejected
                             when the action does not support background mode.

  Examples:
    card <card-id> action launch
    card <card-id> action chat --execution-mode interactive

Watch:
  Waits for the next unattributed commit on a card's repository. If
  unattributed commits already exist they are output immediately. Otherwise
  the command subscribes to WebSocket events and blocks until a qualifying
  commit arrives. Requires an active Cards session (CARDS_SESSION_ID set).

  Optional glob patterns restrict output to commits that touch at least one
  matching file. Multiple globs are OR-combined.

  The commit is attributed to the current session and printed to stdout,
  then the command exits 0. Exits non-zero on connection failure or when
  the session precondition is not met.

  Examples:
    card <card-id> watch
    card <card-id> watch "src/auth/**"
    card <card-id> watch "src/**" "tests/**"

Exit codes:
  0  Success
  1  Error (missing arguments, invalid input, discovery failure, API error)
  130  Interrupted (SIGINT)
  143  Terminated (SIGTERM)`;

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
 * Evaluates a JSONPath expression against a value and returns the formatted
 * output string.
 *
 * A single primitive result (string, number, boolean) is printed raw without
 * quoting — mirroring the behavior of `jq -r`. A single object or array
 * result is pretty-printed as JSON. When the expression matches multiple
 * values, all results are pretty-printed as a JSON array.
 *
 * @param value - The JSON-compatible value to query.
 * @param expression - A JSONPath expression (e.g. `$.repositoryPath`).
 * @returns The formatted string to print to stdout.
 */
export function applyJsonPath(value: unknown, expression: string): string {
  const results = JSONPath({ path: expression, json: value as object, wrap: true }) as unknown[];
  if (results.length === 1) {
    const only = results[0];
    if (typeof only === 'string') return only;
    if (typeof only === 'number' || typeof only === 'boolean' || only === null) return String(only);
    return JSON.stringify(only, null, 2);
  }
  return JSON.stringify(results, null, 2);
}

/**
 * Formats a value for stdout, applying a JSONPath filter when provided.
 *
 * @param value - The value to print.
 * @param jsonPath - Optional JSONPath expression to filter with.
 * @returns The formatted string.
 */
export function formatOutput(value: unknown, jsonPath?: string): string {
  if (jsonPath) return applyJsonPath(value, jsonPath);
  return JSON.stringify(value, null, 2);
}

/**
 * Fetches a card by ID and prints its metadata as JSON to stdout.
 *
 * @param cardId - The card identifier to look up.
 * @param jsonPath - Optional JSONPath expression to filter the output.
 */
export async function getCard(cardId: string, jsonPath?: string): Promise<void> {
  const client = await connectClient();
  const card = await client.getCard(cardId);
  console.log(formatOutput(card, jsonPath));
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
 * Parsed result from card creation input.
 */
export interface ParsedCardInput {
  data: CardCreateData;
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

  const validFields = new Set(['title', 'tags', 'environment', 'gates', 'relations']);
  const unknownFields = Object.keys(parsed).filter((k) => !validFields.has(k));
  if (unknownFields.length > 0) {
    const listed = unknownFields.map((f) => `"${f}"`).join(', ');
    throw new Error(`unknown fields: ${listed}. valid fields: ${[...validFields].join(', ')}`);
  }

  const inputKeys = new Set(Object.keys(parsed));

  const data: CardCreateData = {
    title: parsed['title']
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
      ...(typeof g['mergeRequestRequired'] === 'boolean' ? { mergeRequestRequired: g['mergeRequestRequired'] } : {})
    };
  }
  if (Array.isArray(parsed['relations'])) {
    data.relations = parsed['relations'] as CardCreateData['relations'];
  }

  return { data, inputKeys };
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
 * @param args - CLI arguments after the `create` subcommand. Supports `--workspace-path`.
 */
export async function createCard(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const raw = await readStdin();
  const { data, inputKeys } = parseCardCreateInput(raw);
  const client = await connectClient(flags['workspace-path']?.[0]);

  // Resolve the bind target BEFORE creating the card. Creating a card is the
  // moment an unbound worktree becomes bound to it — but binding is fail-closed:
  // a target whose parent branch cannot be determined refuses rather than
  // guessing. If the gate would refuse, we must NOT mint a card, or the printed
  // recovery would orphan the first card and bind to a second on retry. So the
  // gate runs first.
  const bindTarget = await resolveBindTarget(flags['parent-branch']?.[0]);
  if (bindTarget.kind === 'refuse') {
    // Fail-closed: no card is created on a refusal, so a retry creates+binds
    // atomically with no duplicate. Diagnostic only; stdout stays empty.
    console.error(bindTarget.reason);
    process.exitCode = 1;
    return;
  }

  const card = await client.createCard(data);
  const full = card as unknown as Record<string, unknown>;

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(full)) {
    if (CREATE_ALWAYS_INCLUDE.has(key) || !inputKeys.has(key)) {
      filtered[key] = value;
    }
  }
  console.log(formatOutput(filtered, flags['jsonpath']?.[0]));

  // The gate already passed; outfit + spawn does not re-run it. An outfit
  // failure surfaces on stderr but never corrupts the create-result JSON above.
  if (bindTarget.kind === 'bind') {
    const createdId = full['id'];
    if (typeof createdId === 'string' && createdId.length > 0) {
      await outfitCreatedWorktree(client, createdId, bindTarget);
    }
  }
}

/**
 * Outcome of resolving the bind target for the current `card create`.
 *
 * - `none` — not inside or pointed at an eligible unbound worktree (cwd is the
 *   main worktree, an already-bound worktree, or no unbound candidate matched
 *   the binder's session). The card is created untracked.
 * - `refuse` — a worktree was identified but the fail-closed gate denied it (no
 *   parent branch could be determined, or 2+ ambiguous candidates). The card
 *   must NOT be created; `reason` is the actionable stderr message.
 * - `bind` — the gate passed; the resolved worktree, parent branch, transcript,
 *   and the binder's own session are carried forward so
 *   {@link outfitCreatedWorktree} can outfit and spawn.
 */
type BindTarget =
  | { kind: 'none' }
  | { kind: 'refuse'; reason: string }
  | { kind: 'bind'; worktreeDir: string; parentBranch: string; transcriptPath: string; sessionId: string };

/**
 * Resolves the worktree `card create` should bind, applying the fail-closed
 * gate WITHOUT creating a card. Two legs, cwd-primary then candidate-set
 * fallback:
 *
 * 1. **cwd-derivation (primary)** — if `process.cwd()` is a linked worktree
 *    (`git rev-parse --git-dir` ≠ `--git-common-dir`):
 *    - already bound (`.cards/CARD_ID` present) → `none`. Mints an untracked
 *      card, preserving nested-worktree binding inheritance (main-126).
 *    - otherwise → resolve the parent branch via {@link resolveCardsParentBranch}
 *      (git config → reflog → `--parent-branch` flag → refuse). The transcript
 *      and session come from the binder's own `CARDS_TRANSCRIPT_PATH` /
 *      `CARDS_SESSION_ID` env (env inheritance guarantees they are this agent's).
 *
 * 2. **candidate-set fallback** (run from outside the worktree) — read the
 *    per-session unbound-candidate set and keep only entries whose `sessionId`
 *    matches the binder's resolved session (main-115 SET semantics):
 *    - 0 → `none` (untracked card).
 *    - 1 → `bind`, with a LOUD stderr notice naming the worktree.
 *    - 2+ → `refuse`, listing every candidate; never silently pick most-recent.
 *
 * @param parentBranchFlag - Optional `--parent-branch` CLI flag value.
 * @returns The resolved bind target.
 */
async function resolveBindTarget(parentBranchFlag?: string): Promise<BindTarget> {
  // --- Leg 1: cwd-derivation primary ---
  const cwdWorktree = await resolveLinkedWorktreeDir();
  if (cwdWorktree) {
    // CARD_ID precedence: an already-bound worktree mints an untracked card
    // (nested-worktree inheritance, main-126). No bind.
    if (existsSync(join(cwdWorktree, '.cards', 'CARD_ID'))) {
      return { kind: 'none' };
    }

    const parent = await resolveCardsParentBranch(cwdWorktree, parentBranchFlag);
    if (parent.kind === 'refuse') {
      return { kind: 'refuse', reason: `card create: ${parent.reason}` };
    }

    // The binder's own session/transcript: env inheritance guarantees the
    // transcript belongs to this agent (the structural-redundancy case noted in
    // the plan's session-gate). Both must be present for streaming attribution.
    const sessionId = process.env['CARDS_SESSION_ID']?.trim() ?? '';
    const transcriptPath = process.env['CARDS_TRANSCRIPT_PATH']?.trim() ?? '';
    if (!sessionId || !transcriptPath) {
      return {
        kind: 'refuse',
        reason:
          'card create: refusing to bind worktree — CARDS_SESSION_ID / CARDS_TRANSCRIPT_PATH are not set, so the ' +
          'agent transcript cannot be streamed. Re-enter the worktree via the EnterWorktree tool, then run `card create` again.'
      };
    }

    return { kind: 'bind', worktreeDir: cwdWorktree, parentBranch: parent.parentBranch, transcriptPath, sessionId };
  }

  // --- Leg 2: candidate-set fallback ---
  const sessionId = await resolveSessionId();
  if (sessionId === null) {
    // No session — nothing to bind from the candidate set. Untracked card.
    return { kind: 'none' };
  }

  const candidates = (await readUnboundCandidates(sessionId)).filter((entry) => entry.sessionId === sessionId);

  if (candidates.length === 0) {
    return { kind: 'none' };
  }

  if (candidates.length > 1) {
    const list = candidates.map((c) => `  - ${c.worktreeDir}`).join('\n');
    return {
      kind: 'refuse',
      reason:
        `card create: refusing to bind — ${candidates.length} unbound worktrees are registered for this session:\n` +
        `${list}\n` +
        'Run `card create` from inside the specific worktree you want to bind so the target is unambiguous.'
    };
  }

  const candidate = candidates[0]!;
  const parent = await resolveCardsParentBranch(candidate.worktreeDir, parentBranchFlag);
  if (parent.kind === 'refuse') {
    return { kind: 'refuse', reason: `card create: ${parent.reason}` };
  }

  // Loud stderr notice: the binder is not inside the worktree it is binding, so
  // make the target explicit rather than binding silently.
  console.error(`card create: binding the single unbound worktree for this session: ${candidate.worktreeDir}`);

  return {
    kind: 'bind',
    worktreeDir: candidate.worktreeDir,
    parentBranch: parent.parentBranch,
    transcriptPath: candidate.transcriptPath,
    sessionId
  };
}

/**
 * Outfits the resolved worktree as card-bound and spawns transcript
 * attribution. Called only after {@link resolveBindTarget} has passed the
 * fail-closed gate, so it does NOT re-run the gate.
 *
 * Delegates the full disk → API → attribution lifecycle to
 * {@link outfitWorktreeForCard}, the single orchestrator both creation-time and
 * bind-time paths funnel through (so they cannot drift). On success the worktree
 * is removed from the per-session unbound-candidate set so a later `card create`
 * in the same session does not see it again.
 *
 * An outfit failure is reported to stderr but never propagates: the create
 * result must remain the sole stdout payload regardless of bind outcome.
 *
 * @param client - Connected CardsClient used to register the branch record.
 * @param cardId - The newly-created card's identifier.
 * @param target - The gate-passed bind target.
 */
async function outfitCreatedWorktree(
  client: CardsClient,
  cardId: string,
  target: Extract<BindTarget, { kind: 'bind' }>
): Promise<void> {
  const { worktreeDir, parentBranch, transcriptPath, sessionId } = target;
  try {
    const extensionPath = await resolveExtensionPath();
    const gitHooksDir = join(extensionPath, 'dist', 'git-hooks');
    const compiledScriptPaths = {
      'pre-commit': join(gitHooksDir, 'pre-commit.mjs'),
      'post-commit': join(gitHooksDir, 'post-commit.mjs'),
      'post-rewrite': join(gitHooksDir, 'post-rewrite.mjs')
    };

    await outfitWorktreeForCard(client, worktreeDir, {
      cardId,
      parentBranch,
      sessionId,
      transcriptPath,
      compiledScriptPaths
    });

    // Bind succeeded — drop the candidate so it is not re-offered this session.
    await removeUnboundCandidate(sessionId, worktreeDir);
  } catch (error) {
    console.error('card create: failed to bind worktree to card:', error instanceof Error ? error.message : error);
  }
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
 * overridden via the `--workspace-path` flag. For tag filtering and full-text
 * search use the `search` subcommand instead.
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
  console.log(formatOutput(cards, flags['jsonpath']?.[0]));
}

/**
 * Searches cards using a unified query syntax supporting free text, #tag filters,
 * and @relation filters. Mirrors the web UI's useServerSearch pattern:
 *
 * 1. Parse query with `parseSearchQuery` to extract text, tags, and relations.
 * 2. Split tags into stored (sent to server) and derived (filtered client-side).
 * 3. Call `client.listCards` with text (≥3 chars), stored tags, and structural filters.
 * 4. Convert results to `CardListSummary[]` via `toCardListSummaries`.
 * 5. Apply `filterCardsByTags` client-side for derived tags and relation filters.
 * 6. Print final results as JSON to stdout.
 *
 * @param args - CLI arguments after the `search` subcommand. First positional
 *   argument (if not starting with `--`) is the query string; remaining
 *   arguments are flags.
 */
export async function searchCards(args: string[]): Promise<void> {
  // Extract the query as the first positional arg (if present), then parse flags from the rest.
  let query = '';
  let flagArgs = args;
  if (args.length > 0 && !args[0]!.startsWith('--')) {
    query = args[0]!;
    flagArgs = args.slice(1);
  }

  const flags = parseFlags(flagArgs);
  const client = await connectClient(flags['workspace-path']?.[0]);

  const { text, tags, relatedTo } = parseSearchQuery(query);

  // Split tags into stored (in card.tags) vs derived (computed from card properties).
  const derivedTagSet = new Set<string>(DERIVED_TAGS);
  const storedTags = tags.filter((t) => !derivedTagSet.has(t));
  const derivedTags = tags.filter((t) => derivedTagSet.has(t));

  const options: ListCardsOptions = {};
  if (text.length >= 3) {
    options.search = text;
  }
  if (storedTags.length > 0) {
    options.tags = storedTags;
  }
  if (flags['status']) {
    options.status = flags['status'][0] as ListCardsOptions['status'];
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

  const raw = await client.listCards(options);
  const summaries = toCardListSummaries(raw);
  const results = filterCardsByTags(summaries, derivedTags, relatedTo);
  console.log(formatOutput(results, flags['jsonpath']?.[0]));
}

/**
 * Finds the worktree path where a given branch is checked out.
 *
 * Parses `git worktree list --porcelain` output to locate the worktree
 * that has the specified branch checked out. Each worktree entry in the
 * porcelain output consists of a `worktree <path>` line followed by
 * metadata lines including `branch refs/heads/<name>`.
 *
 * @param branchName - The branch name to search for (without refs/heads/ prefix).
 * @returns The worktree path where the branch is checked out, or null if not found.
 */
export function getWorktreeForBranch(branchName: string): string | null {
  const result = spawnSync('git', ['worktree', 'list', '--porcelain'], {
    encoding: 'utf-8',
    timeout: 3000
  });
  if (result.error || result.status !== 0) return null;

  const branchRef = `branch refs/heads/${branchName}`;
  let currentWorktree: string | null = null;

  for (const line of result.stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      // git emits forward-slash paths even on Windows; normalize to a native
      // filesystem path so callers can compare against fs paths directly.
      currentWorktree = resolvePath(line.slice('worktree '.length));
    } else if (line === branchRef && currentWorktree !== null) {
      return currentWorktree;
    }
  }

  return null;
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
 * Builds a {@link CardCommit} from a commit SHA by querying git for metadata and file changes.
 *
 * @param sha - Full commit hash to resolve.
 * @param repositoryPath - Card repository path where git commands execute.
 * @returns Complete commit metadata with per-file diff.
 * @throws {Error} When the git log output is malformed.
 */
function buildCardCommit(sha: string, repositoryPath: string): CardCommit {
  // Get commit metadata
  const metaOutput = execFileSync(
    'git',
    ['log', '--no-walk', '--format=%H%x00%an%x00%ae%x00%s%x00%b%x00%aI%x00%D', sha],
    { cwd: repositoryPath, encoding: 'utf-8', timeout: 10000 }
  );

  const nulIdx = metaOutput.indexOf('\0');
  if (nulIdx === -1) {
    throw new Error(`Unexpected git log output for ${sha}`);
  }

  const parts = metaOutput.split('\0');
  const hash = (parts[0] ?? '').trim();
  const author_name = parts[1] ?? '';
  const author_email = parts[2] ?? '';
  const message = parts[3] ?? '';
  const body = parts[4] ?? '';
  const date = (parts[5] ?? '').trim();
  const refs = (parts[6] ?? '').trim();

  // Get file list with status
  const diffOutput = execFileSync('git', ['diff-tree', '--no-commit-id', '-r', '--name-status', '-M', sha], {
    cwd: repositoryPath,
    encoding: 'utf-8',
    timeout: 10000
  });

  const files: CardCommit['diff']['files'] = [];
  for (const line of diffOutput.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const tabParts = trimmed.split('\t');
    const status = tabParts[0] ?? '';
    if (status.startsWith('R') && tabParts.length >= 3) {
      files.push({ file: tabParts[2]!, status, from: tabParts[1]!, binary: false });
    } else if (tabParts[1]) {
      files.push({ file: tabParts[1], status, binary: false });
    }
  }

  return { hash, date, message, refs, body, author_name, author_email, diff: { changed: files.length, files } };
}

/**
 * Returns true when at least one file in the commit matches any of the provided globs.
 *
 * @param files - Changed file paths.
 * @param globs - Glob patterns to test against.
 * @returns `true` when at least one file matches at least one glob; `true` when globs is empty.
 */
function matchesGlobs(files: string[], globs: string[]): boolean {
  if (globs.length === 0) return true;
  return files.some((f) => globs.some((g) => minimatch(f, g)));
}

/**
 * Returns the changed file paths for a commit SHA.
 *
 * @param sha - Commit hash.
 * @param repositoryPath - Card repository path.
 * @returns Array of changed file paths relative to the repository root.
 */
function getCommitFiles(sha: string, repositoryPath: string): string[] {
  const output = execFileSync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', sha], {
    cwd: repositoryPath,
    encoding: 'utf-8',
    timeout: 10000
  });
  return output
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Waits for the next unattributed commit on a card's repository.
 *
 * Checks for existing unattributed commits first. If any exist, outputs them
 * and exits. Otherwise subscribes to WebSocket events and blocks until the
 * first qualifying commit arrives.
 *
 * Requires an active Cards session (`CARDS_SESSION_ID` set in the environment).
 *
 * @param cardId - The card identifier to watch.
 * @param globs - Optional glob patterns to filter qualifying commits by changed files.
 */
export async function watchCard(cardId: string, globs: string[]): Promise<void> {
  // 1. Resolve card
  const client = await connectClient();
  const card = await client.getCard(cardId);
  const repositoryPath = card.repositoryPath;

  // 2. Resolve session (optional — watch works without a session, just without attribution)
  const sessionId = (process.env['CARDS_SESSION_ID'] ?? '').trim() || null;
  if (!sessionId) {
    console.error('card watch: warning: CARDS_SESSION_ID not set. Watching for any commit.');
  }

  // 3. Check for existing unattributed commits (only when session is available)
  if (sessionId) {
    const headSha = readSessionHeadSha(sessionId);
    if (headSha) {
      const allCommits = getCommitsSince(repositoryPath, headSha);
      const sessionCommits = getSessionCommits(sessionId);
      const unattributed = getUnattributedCommits(allCommits, sessionCommits);

      const qualifying =
        globs.length > 0
          ? unattributed.filter((sha) => matchesGlobs(getCommitFiles(sha, repositoryPath), globs))
          : unattributed;

      if (qualifying.length > 0) {
        // 4. Output existing unattributed commits and exit
        for (const sha of qualifying) {
          const commit = buildCardCommit(sha, repositoryPath);
          await appendCommitToSession(sessionId, sha);
          console.log(formatCommit(commit));
        }
        return;
      }
    }
  }

  // 5. Subscribe to WebSocket events and wait for a qualifying commit
  const apiInfo = await discoverApiInfo();
  if (!apiInfo) {
    throw new Error('API discovery failed — is the cards server running?');
  }

  const wsUrl = `ws://${apiInfo.host}:${apiInfo.port}/events`;
  const accessToken = apiInfo.accessToken;

  const discover = async () => {
    const info = await discoverApiInfo();
    if (!info) return { error: 'cards-api.json not found or invalid' };
    return { wsUrl: `ws://${info.host}:${info.port}/events`, accessToken: info.accessToken };
  };

  const subscriber = new EventSubscriber({ wsUrl, accessToken, discover, maxReconnectAttempts: 10 });

  // Track disconnection for exhaustion detection
  let disconnectedAt: number | null = null;
  let exhaustionTimer: ReturnType<typeof setTimeout> | null = null;

  const unsubConnectionChange = subscriber.onConnectionChange((connected) => {
    if (connected) {
      disconnectedAt = null;
      if (exhaustionTimer) {
        clearTimeout(exhaustionTimer);
        exhaustionTimer = null;
      }
    } else {
      if (exhaustionTimer) {
        clearTimeout(exhaustionTimer);
        exhaustionTimer = null;
      }
      disconnectedAt = Date.now();
      // Schedule exhaustion check after max backoff + margin
      const maxBackoffMs = calculateBackoffMs(10);
      exhaustionTimer = setTimeout(() => {
        exhaustionTimer = null;
        if (disconnectedAt !== null) {
          subscriber.disconnect();
          console.error('Lost connection to Cards server after maximum reconnection attempts.');
          requestProcessExit(1);
        }
      }, maxBackoffMs + 1000);
    }
  });

  process.on('SIGINT', () => {
    unsubConnectionChange();
    subscriber.disconnect();
    requestProcessExit(130);
  });

  process.on('SIGTERM', () => {
    unsubConnectionChange();
    subscriber.disconnect();
    requestProcessExit(143);
  });

  const onCommit = async (event: CardCommitEvent): Promise<void> => {
    if (event.cardId !== cardId) return;
    if (isBookkeepingCommit(event.commit)) return;

    if (sessionId) {
      const currentSessionCommits = getSessionCommits(sessionId);
      if (currentSessionCommits.includes(event.commit.hash)) return;
    }

    if (globs.length > 0) {
      const files = event.commit.diff.files.map((f) => f.file);
      if (!matchesGlobs(files, globs)) return;
    }

    // Qualifying commit — record, format, output, exit
    if (sessionId) {
      try {
        await appendCommitToSession(sessionId, event.commit.hash);
      } catch (error) {
        console.error(
          `card watch: failed to record commit ${event.commit.hash}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    console.log(formatCommit(event.commit));
    unsubConnectionChange();
    subscriber.disconnect();
    requestProcessExit(0);
  };

  subscriber.on('card:commit', (event) => {
    onCommit(event).catch((err: unknown) => {
      console.error('card watch: error handling commit event:', err instanceof Error ? err.message : String(err));
      subscriber.disconnect();
      requestProcessExit(1);
    });
  });

  await subscriber.connect();
}

/**
 * Executes an action on a card and prints the result to stdout.
 *
 * @param cardId - The card identifier.
 * @param actionName - The action identifier to execute.
 * @param jsonPath - Optional JSONPath expression to filter the output.
 * @param executionMode - Optional execution mode from `--execution-mode`.
 *   Must be `"interactive"` or `"background"` when provided; when omitted,
 *   the server derives the mode from the action's `supportsBackgroundMode` flag.
 * @throws Error when `executionMode` is not a valid execution mode.
 */
export async function executeAction(
  cardId: string,
  actionName: string,
  jsonPath?: string,
  executionMode?: string
): Promise<void> {
  let mode: ExecutionMode | undefined;
  if (executionMode !== undefined) {
    if (executionMode !== 'interactive' && executionMode !== 'background') {
      throw new Error(`invalid --execution-mode "${executionMode}": expected "interactive" or "background"`);
    }
    mode = executionMode;
  }
  const client = await connectClient();
  const result: ActionResult = await client.executeAction(cardId, actionName, mode);
  console.log(formatOutput(result, jsonPath));
}

if (process.argv[1]?.match(/card\.(mjs|ts)$/)) {
  const command = process.argv[2];

  if (!command || command === '-h' || command === '--help' || command === 'help') {
    console.log(HELP);
    process.exit(command ? 0 : 1);
  }

  const subArgs = process.argv.slice(3);
  if (subArgs.includes('--help') || subArgs.includes('-h')) {
    console.log(HELP);
    process.exit(0);
  }

  let run: Promise<void>;
  // `watch` is intentionally long-running: it blocks on the WebSocket and drives
  // its own exit from its commit/connection/signal handlers. Every other command
  // is one-shot and must exit once its work settles (see the run handler below).
  let isWatch = false;
  switch (command) {
    case 'create':
      run = createCard(process.argv.slice(3));
      break;
    case 'list':
      run = listCards(process.argv.slice(3));
      break;
    case 'search':
      run = searchCards(process.argv.slice(3));
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
        const actionFlags = parseFlags(process.argv.slice(5));
        run = executeAction(command, actionId, actionFlags['jsonpath']?.[0], actionFlags['execution-mode']?.[0]);
      } else if (verb === 'watch') {
        const watchGlobs = process.argv.slice(4);
        run = watchCard(command, watchGlobs);
        isWatch = true;
      } else if (verb?.startsWith('--')) {
        const getFlags = parseFlags(process.argv.slice(3));
        run = getCard(command, getFlags['jsonpath']?.[0]);
      } else if (verb) {
        console.error(`card: unknown verb "${verb}"`);
        process.exit(1);
      } else {
        run = getCard(command);
      }
      break;
    }
  }

  run
    .then(() => {
      // One-shot commands must not rely on the event loop draining naturally:
      // the `CardsClient`'s HTTP (fetch/undici) keep-alive socket can keep the
      // loop alive on Windows long after the result printed — `card list` was
      // observed hanging for tens of minutes. `requestProcessExit` sets the exit
      // code and lets the loop drain, with an unref'd backstop that force-exits
      // if a handle lingers — bounding teardown without the synchronous
      // `process.exit` that races libuv (0xC0000409). `watch` self-manages, so
      // its `connect()` resolving here must NOT trigger an exit.
      if (!isWatch) {
        requestProcessExit(typeof process.exitCode === 'number' ? process.exitCode : 0);
      }
    })
    .catch((error: unknown) => {
      console.error('card:', error instanceof Error ? error.message : String(error));
      requestProcessExit(1);
    });
}
