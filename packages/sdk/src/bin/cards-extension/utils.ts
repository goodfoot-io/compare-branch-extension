/**
 * Shared utilities for the `cards-extension` CLI subcommands.
 *
 * @summary Shared CLI utilities for cards-extension subcommands
 * @module bin/cards-extension/utils
 */

import { execFile as execFileCb } from 'node:child_process';
import * as util from 'node:util';

const execFile = util.promisify(execFileCb);

/**
 * Reads the value following `flag` from `args`. Returns undefined when the
 * flag is absent. Throws when the flag is present but the next token is
 * missing or itself looks like another flag — this avoids the silent
 * acceptance of `--config --workspace foo` as `configName === '--workspace'`.
 *
 * @param args - CLI argument array.
 * @param flag - Flag name including the leading `--`.
 * @returns The flag value, or undefined when the flag is not present.
 * @throws Error when the flag is present without a usable value.
 */
export function getFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  const next = args[idx + 1];
  if (next === undefined || next.startsWith('--')) {
    throw new Error(`flag ${flag} requires a value`);
  }
  return next;
}

/**
 * Returns true when `flag` is present in `args` as a bare boolean flag
 * (i.e. `--preview`). Does not consume a value.
 *
 * @param args - CLI argument array.
 * @param flag - Flag name including the leading `--`.
 * @returns True when the flag is present, false otherwise.
 */
export function hasBooleanFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

/**
 * Reads a tri-state boolean flag of the form `--focus`, `--focus=true`,
 * `--focus=false`, or `--focus false`. Returns undefined when absent so
 * callers can let the server-side default apply.
 *
 * @param args - CLI argument array.
 * @param flag - Flag name including leading `--`.
 * @returns true | false | undefined.
 * @throws Error when the value is not parseable as a boolean.
 */
export function getBooleanFlagValue(args: string[], flag: string): boolean | undefined {
  // `--flag=value` form
  const eqPrefix = `${flag}=`;
  const eq = args.find((a) => a.startsWith(eqPrefix));
  if (eq !== undefined) {
    const v = eq.slice(eqPrefix.length).toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
    throw new Error(`flag ${flag} requires true|false (got ${v})`);
  }
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  const next = args[idx + 1];
  if (next === 'true') return true;
  if (next === 'false') return false;
  // Bare presence means true.
  return true;
}

/**
 * Resolves the workspace path to use for a Cards API request.
 *
 * When `--workspace <path>` is provided in args, returns that value directly
 * without running git. Otherwise runs `git rev-parse --show-toplevel` in the
 * current directory and returns its trimmed output.
 *
 * @param args - CLI argument array (may contain `--workspace <path>`).
 * @returns Resolved workspace path.
 * @throws Error when `--workspace` is absent and git fails.
 */
export async function resolveWorkspacePath(args: string[]): Promise<string> {
  const explicit = getFlagValue(args, '--workspace');
  if (explicit !== undefined) return explicit;

  try {
    const { stdout } = await execFile('git', ['rev-parse', '--show-toplevel']);
    return stdout.trim();
  } catch (error) {
    throw new Error(
      `Could not determine workspace path from git. Use --workspace <path> to specify it explicitly. (${error instanceof Error ? error.message : String(error)})`
    );
  }
}

/**
 * Builds base fetch options with Bearer auth header.
 *
 * @param accessToken - Bearer token.
 * @param method - HTTP method.
 * @param body - Optional JSON body (will be serialized).
 * @returns RequestInit object.
 */
export function buildFetchOptions(accessToken: string, method: string, body?: unknown): RequestInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  return {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  };
}

/**
 * Handles common HTTP error responses from the Cards API.
 *
 * Returns a user-friendly error message for known status codes (404, 422).
 * For other non-ok responses, returns a generic message with the status.
 *
 * @param res - Fetch Response object.
 * @param workspacePath - Optional path the caller resolved, included in the
 *   404 message so the user can see exactly what was sent.
 * @returns Error message string, or null if the response was ok.
 */
export async function handleErrorResponse(res: Response, workspacePath?: string): Promise<string | null> {
  if (res.ok) return null;

  if (res.status === 404) {
    const which = workspacePath ? ` "${workspacePath}"` : '';
    return `workspace not registered${which} with the active VS Code window. Run "cards-extension workspace list" to see registered paths exactly, then start VS Code with the Cards extension and open the workspace if needed.`;
  }

  let detail = '';
  try {
    const body = (await res.json()) as { error?: string };
    detail = body.error ?? '';
  } catch {
    detail = await res.text().catch(() => '');
  }

  if (res.status === 422 && detail) {
    return detail;
  }

  return `server responded with ${res.status}${detail ? `: ${detail}` : ''}`;
}
