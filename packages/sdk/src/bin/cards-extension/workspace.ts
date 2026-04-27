/**
 * Workspace subcommand of the `cards-extension` CLI.
 *
 * Lists workspaces registered with the active VS Code window.
 *
 * @summary Workspace subcommand handler for cards-extension
 */

import { discoverApiInfo } from '@cards/sdk/client/discovery';
import { buildFetchOptions, handleErrorResponse } from './utils.js';

/**
 * Routes `workspace` subcommand arguments and dispatches to the appropriate handler.
 *
 * @param args - Arguments following the `workspace` token.
 * @returns The intended process exit code. Never calls process.exit.
 */
export async function runWorkspace(args: string[]): Promise<number> {
  const [subcommand] = args;

  if (subcommand === 'list') {
    return runWorkspaceList();
  }

  console.error(`cards-extension workspace: unknown subcommand "${subcommand ?? ''}". Use: list`);
  return 1;
}

async function runWorkspaceList(): Promise<number> {
  const info = await discoverApiInfo();
  if (!info) {
    console.error('API discovery failed — is the Cards extension running in VS Code?');
    return 1;
  }

  const url = `http://${info.host}:${info.port}/workspaces`;
  const res = await fetch(url, buildFetchOptions(info.accessToken, 'GET'));

  const errMsg = await handleErrorResponse(res);
  if (errMsg) {
    console.error(`cards-extension workspace list: ${errMsg}`);
    return 1;
  }

  const body = (await res.json()) as { workspaces: unknown[] };
  console.log(JSON.stringify(body.workspaces));
  return 0;
}
