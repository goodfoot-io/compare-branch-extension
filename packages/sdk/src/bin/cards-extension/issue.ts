/**
 * Issue subcommand of the `cards-extension` CLI.
 *
 * Reads `{title, body}` JSON from stdin and opens a pre-filled GitHub issue
 * via the Cards VS Code extension's `/execute-command` endpoint.
 *
 * @summary Issue subcommand handler for cards-extension
 */

import { discoverApiInfo } from '@cards.management/sdk/client/discovery';
import { buildFetchOptions, handleErrorResponse, resolveWorkspacePath } from './utils.js';

const ISSUE_HELP = `Usage: cards-extension issue [--workspace <path>]

Open a pre-filled GitHub issue via the Cards VS Code extension.

Reads JSON from stdin:
  {"title": "Issue title", "body": "Detailed description of the issue"}

Options:
  -h, --help         Show this help text
  --workspace <path> Use a specific workspace path for Cards API routing`;

/**
 * Reads `{title, body}` JSON from stdin and POSTs it to the Cards API
 * `/execute-command` endpoint as `cards.reportIssue` arguments.
 *
 * When stdin is a TTY (interactive shell), returns 1 immediately with
 * a message to stderr rather than hanging indefinitely waiting for EOF.
 *
 * @param args - Arguments following the `issue` token.
 * @returns The intended process exit code. Never calls process.exit.
 */
export async function runIssue(args: string[]): Promise<number> {
  if (args.includes('-h') || args.includes('--help')) {
    console.log(ISSUE_HELP);
    return 0;
  }

  try {
    return await sendIssue(args);
  } catch (error) {
    console.error(`cards-extension issue: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

async function sendIssue(args: string[]): Promise<number> {
  if (process.stdin.isTTY) {
    throw new Error('expected JSON on stdin');
  }

  const stdinData = await readStdin();

  if (stdinData.trim() === '') {
    throw new Error('expected JSON on stdin');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdinData);
  } catch (error) {
    throw new Error(`failed to parse JSON from stdin: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected a JSON object on stdin');
  }

  const obj = parsed as Record<string, unknown>;
  const validFields = new Set(['title', 'body']);
  const unknownFields = Object.keys(obj).filter((k) => !validFields.has(k));
  if (unknownFields.length > 0) {
    const listed = unknownFields.map((f) => `"${f}"`).join(', ');
    throw new Error(`unknown fields: ${listed}. valid fields: ${[...validFields].join(', ')}`);
  }

  if (!('title' in obj)) {
    throw new Error('missing required field "title"');
  }

  const title = String(obj['title']).trim();
  if (title === '') {
    throw new Error('field "title" must be a non-empty string');
  }

  if (!('body' in obj)) {
    throw new Error('missing required field "body"');
  }

  const body = String(obj['body']).trim();
  if (body === '') {
    throw new Error('field "body" must be a non-empty string');
  }

  const workspacePath = await resolveWorkspacePath(args);

  const info = await discoverApiInfo();
  if (!info) {
    throw new Error('API discovery failed — is the Cards extension running in VS Code?');
  }

  const url = `http://${info.host}:${info.port}/execute-command?workspacePath=${encodeURIComponent(workspacePath)}`;
  const reqBody = { command: 'cards.reportIssue', args: [title, body] };

  const res = await fetch(url, buildFetchOptions(info.accessToken, 'POST', reqBody));

  const errMsg = await handleErrorResponse(res, workspacePath);
  if (errMsg) {
    throw new Error(errMsg);
  }

  const envelope = (await res.json()) as { result: unknown; lossyCoercion?: boolean };
  if (envelope.lossyCoercion) {
    console.error('Warning: lossyCoercion — result contains values that could not be serialized exactly');
  }
  console.log(JSON.stringify(envelope.result));
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
