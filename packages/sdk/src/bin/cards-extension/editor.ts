/**
 * Editor subcommand of the `cards-extension` CLI.
 *
 * Inspects and controls the active editor in the VS Code window.
 *
 * @summary Editor subcommand handler for cards-extension
 */

/**
 * Routes `editor` subcommand arguments and dispatches to the appropriate handler.
 *
 * @param _args - Arguments following the `editor` token.
 * @throws Error Always — not yet implemented.
 * @returns The intended process exit code. Never calls process.exit.
 */
export async function runEditor(_args: string[]): Promise<number> {
  throw new Error('not implemented');
}
