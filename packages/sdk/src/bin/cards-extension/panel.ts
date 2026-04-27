/**
 * Panel subcommand of the `cards-extension` CLI.
 *
 * Shows and focuses a specific VS Code panel.
 *
 * @summary Panel subcommand handler for cards-extension
 */

import { discoverApiInfo } from '@cards/sdk/client/discovery';
import { buildFetchOptions, handleErrorResponse, resolveWorkspacePath } from './utils.js';

const VALID_PANELS = new Set(['problems', 'terminal', 'debug', 'output']);

/**
 * Routes `panel` subcommand arguments and dispatches to the appropriate handler.
 *
 * @param args - Arguments following the `panel` token.
 * @returns The intended process exit code. Never calls process.exit.
 */
export async function runPanel(args: string[]): Promise<number> {
  const [subcommand, panelName, ...rest] = args;

  if (subcommand === 'show') {
    return runPanelShow(panelName, rest);
  }

  console.error(`cards-extension panel: unknown subcommand "${subcommand ?? ''}". Use: show`);
  return 1;
}

async function runPanelShow(panel: string | undefined, args: string[]): Promise<number> {
  if (!panel || !VALID_PANELS.has(panel)) {
    console.error(
      `cards-extension panel show: unknown or missing panel name "${panel ?? ''}". Valid panels: ${[...VALID_PANELS].join(', ')}`
    );
    return 1;
  }

  let workspacePath: string;
  try {
    workspacePath = await resolveWorkspacePath(args);
  } catch (error) {
    console.error(`cards-extension panel show: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const info = await discoverApiInfo();
  if (!info) {
    console.error('API discovery failed — is the Cards extension running in VS Code?');
    return 1;
  }

  const url = `http://${info.host}:${info.port}/panel/show?workspacePath=${encodeURIComponent(workspacePath)}`;
  const res = await fetch(url, buildFetchOptions(info.accessToken, 'POST', { panel }));

  const errMsg = await handleErrorResponse(res, workspacePath);
  if (errMsg) {
    console.error(`cards-extension panel show: ${errMsg}`);
    return 1;
  }

  return 0;
}
