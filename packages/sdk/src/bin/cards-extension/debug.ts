/**
 * Debug subcommand of the `cards-extension` CLI.
 *
 * Controls the VS Code debugger (start, stop, state).
 *
 * @summary Debug subcommand handler for cards-extension
 */

import { discoverApiInfo } from '@cards/sdk/client/discovery';
import { buildFetchOptions, getFlagValue, handleErrorResponse, resolveWorkspacePath } from './utils.js';

/**
 * Routes `debug` subcommand arguments and dispatches to the appropriate handler.
 *
 * @param args - Arguments following the `debug` token.
 * @returns The intended process exit code. Never calls process.exit.
 */
export async function runDebug(args: string[]): Promise<number> {
  const [subcommand, ...rest] = args;

  if (subcommand === 'start') return runDebugStart(rest);
  if (subcommand === 'stop') return runDebugStop(rest);
  if (subcommand === 'state') return runDebugState(rest);

  console.error(`cards-extension debug: unknown subcommand "${subcommand ?? ''}". Use: start, stop, state`);
  return 1;
}

async function runDebugStart(args: string[]): Promise<number> {
  let configName: string | undefined;
  let workspacePath: string;
  try {
    configName = getFlagValue(args, '--config');
    workspacePath = await resolveWorkspacePath(args);
  } catch (error) {
    console.error(`cards-extension debug start: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const info = await discoverApiInfo();
  if (!info) {
    console.error('API discovery failed — is the Cards extension running in VS Code?');
    return 1;
  }

  const url = `http://${info.host}:${info.port}/debug/start?workspacePath=${encodeURIComponent(workspacePath)}`;
  const body: Record<string, unknown> = {};
  if (configName !== undefined) body['configName'] = configName;

  const res = await fetch(url, buildFetchOptions(info.accessToken, 'POST', body));

  const errMsg = await handleErrorResponse(res, workspacePath);
  if (errMsg) {
    console.error(`cards-extension debug start: ${errMsg}`);
    return 1;
  }

  return 0;
}

async function runDebugStop(args: string[]): Promise<number> {
  let workspacePath: string;
  try {
    workspacePath = await resolveWorkspacePath(args);
  } catch (error) {
    console.error(`cards-extension debug stop: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const info = await discoverApiInfo();
  if (!info) {
    console.error('API discovery failed — is the Cards extension running in VS Code?');
    return 1;
  }

  const url = `http://${info.host}:${info.port}/debug/stop?workspacePath=${encodeURIComponent(workspacePath)}`;
  const res = await fetch(url, buildFetchOptions(info.accessToken, 'POST', {}));

  const errMsg = await handleErrorResponse(res, workspacePath);
  if (errMsg) {
    console.error(`cards-extension debug stop: ${errMsg}`);
    return 1;
  }

  const body = await res.json();
  console.log(JSON.stringify(body));
  return 0;
}

async function runDebugState(args: string[]): Promise<number> {
  let workspacePath: string;
  try {
    workspacePath = await resolveWorkspacePath(args);
  } catch (error) {
    console.error(`cards-extension debug state: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const info = await discoverApiInfo();
  if (!info) {
    console.error('API discovery failed — is the Cards extension running in VS Code?');
    return 1;
  }

  const url = `http://${info.host}:${info.port}/debug/state?workspacePath=${encodeURIComponent(workspacePath)}`;
  const res = await fetch(url, buildFetchOptions(info.accessToken, 'GET'));

  const errMsg = await handleErrorResponse(res, workspacePath);
  if (errMsg) {
    console.error(`cards-extension debug state: ${errMsg}`);
    return 1;
  }

  const body = await res.json();
  console.log(JSON.stringify(body));
  return 0;
}
