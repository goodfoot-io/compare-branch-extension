/**
 * Execute-command subcommand of the `cards-extension` CLI.
 *
 * Executes a VS Code command and returns its result as JSON.
 *
 * @summary Execute-command subcommand handler for cards-extension
 */

import { discoverApiInfo } from '@cards/sdk/client/discovery';
import { buildFetchOptions, handleErrorResponse, resolveWorkspacePath } from './utils.js';

/**
 * Reads args from stdin and executes the specified VS Code command via the Cards API.
 *
 * @param args - Arguments following the `execute-command` token.
 * @returns The intended process exit code. Never calls process.exit.
 */
export async function runExecuteCommand(args: string[]): Promise<number> {
  const [command, ...rest] = args;

  if (!command) {
    console.error('cards-extension execute-command: command is required');
    return 1;
  }

  const saveAll = rest.includes('--save');

  // Read JSON args from stdin
  let stdinArgs: unknown[] = [];
  const stdinData = await readStdin();
  if (stdinData.trim() !== '') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdinData);
    } catch (error) {
      console.error(
        `cards-extension execute-command: failed to parse JSON from stdin: ${error instanceof Error ? error.message : String(error)}`
      );
      return 1;
    }
    if (!Array.isArray(parsed)) {
      console.error('cards-extension execute-command: stdin must be a JSON array of arguments');
      return 1;
    }
    stdinArgs = parsed;
  }

  let workspacePath: string;
  try {
    workspacePath = await resolveWorkspacePath(rest);
  } catch (error) {
    console.error(`cards-extension execute-command: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const info = await discoverApiInfo();
  if (!info) {
    console.error('API discovery failed — is the Cards extension running in VS Code?');
    return 1;
  }

  const url = `http://${info.host}:${info.port}/execute-command?workspacePath=${encodeURIComponent(workspacePath)}`;
  const body: Record<string, unknown> = { command, args: stdinArgs };
  if (saveAll) body['saveAll'] = true;

  const res = await fetch(url, buildFetchOptions(info.accessToken, 'POST', body));

  const errMsg = await handleErrorResponse(res);
  if (errMsg) {
    console.error(`cards-extension execute-command: ${errMsg}`);
    return 1;
  }

  const result = (await res.json()) as { result: unknown; lossyCoercion?: boolean };
  if (result.lossyCoercion) {
    console.error('Warning: lossyCoercion — result contains values that could not be serialized exactly');
  }
  console.log(JSON.stringify(result));
  return 0;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);
  });
}
