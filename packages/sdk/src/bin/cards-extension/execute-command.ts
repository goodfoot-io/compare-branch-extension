/**
 * Execute-command subcommand of the `cards-extension` CLI.
 *
 * Executes a VS Code command and returns its result as JSON.
 *
 * @summary Execute-command subcommand handler for cards-extension
 */

/**
 * Reads args from stdin and executes the specified VS Code command via the Cards API.
 *
 * @param _args - Arguments following the `execute-command` token.
 * @throws Error Always — not yet implemented.
 * @returns The intended process exit code. Never calls process.exit.
 */
export async function runExecuteCommand(_args: string[]): Promise<number> {
  throw new Error('not implemented');
}
