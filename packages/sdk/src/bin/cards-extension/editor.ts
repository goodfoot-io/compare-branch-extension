/**
 * Editor subcommand of the `cards-extension` CLI.
 *
 * Inspects and controls the active editor in the VS Code window.
 *
 * @summary Editor subcommand handler for cards-extension
 */

import { discoverApiInfo } from '@cards/sdk/client/discovery';
import { buildFetchOptions, handleErrorResponse, resolveWorkspacePath } from './utils.js';

/**
 * Routes `editor` subcommand arguments and dispatches to the appropriate handler.
 *
 * @param args - Arguments following the `editor` token.
 * @returns The intended process exit code. Never calls process.exit.
 */
export async function runEditor(args: string[]): Promise<number> {
  const [subcommand, ...rest] = args;

  if (subcommand === 'info') {
    return runEditorInfo(rest);
  }
  if (subcommand === 'open') {
    return runEditorOpen(rest);
  }
  if (subcommand === 'select') {
    return runEditorSelect(rest);
  }

  console.error(`cards-extension editor: unknown subcommand "${subcommand ?? ''}". Use: info, open, select`);
  return 1;
}

async function runEditorInfo(args: string[]): Promise<number> {
  let workspacePath: string;
  try {
    workspacePath = await resolveWorkspacePath(args);
  } catch (error) {
    console.error(`cards-extension editor info: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const info = await discoverApiInfo();
  if (!info) {
    console.error('API discovery failed — is the Cards extension running in VS Code?');
    return 1;
  }

  const url = `http://${info.host}:${info.port}/editor?workspacePath=${encodeURIComponent(workspacePath)}`;
  const res = await fetch(url, buildFetchOptions(info.accessToken, 'GET'));

  const errMsg = await handleErrorResponse(res);
  if (errMsg) {
    console.error(`cards-extension editor info: ${errMsg}`);
    return 1;
  }

  const body = await res.json();
  console.log(JSON.stringify(body));
  return 0;
}

async function runEditorOpen(args: string[]): Promise<number> {
  const [filePath, ...rest] = args;
  if (!filePath) {
    console.error('cards-extension editor open: filePath is required');
    return 1;
  }

  let workspacePath: string;
  try {
    workspacePath = await resolveWorkspacePath(rest);
  } catch (error) {
    console.error(`cards-extension editor open: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  // Parse optional flags
  const lineIdx = rest.indexOf('--line');
  const charIdx = rest.indexOf('--character');
  const line = lineIdx !== -1 ? parseInt(rest[lineIdx + 1] ?? '', 10) : undefined;
  const character = charIdx !== -1 ? parseInt(rest[charIdx + 1] ?? '', 10) : undefined;

  const info = await discoverApiInfo();
  if (!info) {
    console.error('API discovery failed — is the Cards extension running in VS Code?');
    return 1;
  }

  const url = `http://${info.host}:${info.port}/editor/open?workspacePath=${encodeURIComponent(workspacePath)}`;
  const body: Record<string, unknown> = { filePath };
  if (line !== undefined && !Number.isNaN(line)) body['line'] = line;
  if (character !== undefined && !Number.isNaN(character)) body['character'] = character;

  const res = await fetch(url, buildFetchOptions(info.accessToken, 'POST', body));

  const errMsg = await handleErrorResponse(res);
  if (errMsg) {
    console.error(`cards-extension editor open: ${errMsg}`);
    return 1;
  }

  return 0;
}

async function runEditorSelect(args: string[]): Promise<number> {
  const [filePath, ...rest] = args;
  if (!filePath) {
    console.error('cards-extension editor select: filePath is required');
    return 1;
  }

  let workspacePath: string;
  try {
    workspacePath = await resolveWorkspacePath(rest);
  } catch (error) {
    console.error(`cards-extension editor select: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  // Parse --start L:C and --end L:C
  const startIdx = rest.indexOf('--start');
  const endIdx = rest.indexOf('--end');

  const parseLC = (val: string | undefined): { line: number; column: number } | null => {
    if (!val) return null;
    const [l, c] = val.split(':');
    const line = parseInt(l ?? '', 10);
    const column = parseInt(c ?? '', 10);
    if (Number.isNaN(line) || Number.isNaN(column)) return null;
    return { line, column };
  };

  const start = parseLC(rest[startIdx + 1]);
  const end = parseLC(rest[endIdx + 1]);

  if (!start || !end) {
    console.error('cards-extension editor select: --start L:C and --end L:C are required');
    return 1;
  }

  const info = await discoverApiInfo();
  if (!info) {
    console.error('API discovery failed — is the Cards extension running in VS Code?');
    return 1;
  }

  const url = `http://${info.host}:${info.port}/editor/select?workspacePath=${encodeURIComponent(workspacePath)}`;
  const body = {
    filePath,
    startLine: start.line,
    startColumn: start.column,
    endLine: end.line,
    endColumn: end.column
  };

  const res = await fetch(url, buildFetchOptions(info.accessToken, 'POST', body));

  const errMsg = await handleErrorResponse(res);
  if (errMsg) {
    console.error(`cards-extension editor select: ${errMsg}`);
    return 1;
  }

  return 0;
}
