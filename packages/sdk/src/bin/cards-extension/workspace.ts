/**
 * Workspace subcommand of the `cards-extension` CLI.
 *
 * Lists workspaces registered with the active VS Code window.
 *
 * @summary Workspace subcommand handler for cards-extension
 */

/**
 * Routes `workspace` subcommand arguments and dispatches to the appropriate handler.
 *
 * @param _args - Arguments following the `workspace` token.
 * @throws Error Always — not yet implemented.
 * @returns The intended process exit code. Never calls process.exit.
 */
export async function runWorkspace(_args: string[]): Promise<number> {
  throw new Error('not implemented');
}
