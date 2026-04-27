/**
 * Debug subcommand of the `cards-extension` CLI.
 *
 * Controls the VS Code debugger (start, stop, state).
 *
 * @summary Debug subcommand handler for cards-extension
 */

/**
 * Routes `debug` subcommand arguments and dispatches to the appropriate handler.
 *
 * @param _args - Arguments following the `debug` token.
 * @throws Error Always — not yet implemented.
 * @returns The intended process exit code. Never calls process.exit.
 */
export async function runDebug(_args: string[]): Promise<number> {
  throw new Error('not implemented');
}
