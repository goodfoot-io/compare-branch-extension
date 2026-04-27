/**
 * Panel subcommand of the `cards-extension` CLI.
 *
 * Shows and focuses a specific VS Code panel.
 *
 * @summary Panel subcommand handler for cards-extension
 */

/**
 * Routes `panel` subcommand arguments and dispatches to the appropriate handler.
 *
 * @param _args - Arguments following the `panel` token.
 * @throws Error Always — not yet implemented.
 * @returns The intended process exit code. Never calls process.exit.
 */
export async function runPanel(_args: string[]): Promise<number> {
  throw new Error('not implemented');
}
