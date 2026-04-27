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
  const wsIdx = args.indexOf('--workspace');
  if (wsIdx !== -1 && args[wsIdx + 1] !== undefined) {
    return args[wsIdx + 1]!;
  }

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
 * @returns Error message string, or null if the response was ok.
 */
export async function handleErrorResponse(res: Response): Promise<string | null> {
  if (res.ok) return null;

  if (res.status === 404) {
    return 'workspace not registered with the active VS Code window. Start VS Code with the Cards extension and open the workspace first.';
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
