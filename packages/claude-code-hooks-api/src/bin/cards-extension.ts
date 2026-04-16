/**
 * `cards-extension` CLI dispatcher.
 *
 * Routes argv into the `attribution` and `notify` subcommand handlers.
 * The dispatcher never calls `process.exit` — only the module-bottom
 * executable guard does, exactly once, so the exported `main` function
 * is safe to invoke from vitest workers.
 *
 * @summary cards-extension CLI dispatcher (attribution + notify)
 */

import { runAttribution } from './cards-extension/attribution.js';
import { runNotify } from './cards-extension/notify.js';

const HELP = `Usage: cards-extension <subcommand> [options]

Cards VSCode extension CLI.

Subcommands:
  attribution <set|get|clear>    Manage the attribution/comparison state
  notify --type ... --title ... --message ... --source ...
                                 Send a notification to the VSCode UI

Options:
  -h, --help                     Show this help text

Examples:
  cards-extension attribution set <<'EOF'
  { "baseRef": "main", "compareRef": "feature/x" }
  EOF
  cards-extension attribution get
  cards-extension attribution clear
  cards-extension notify --type info --title "Built" --message "All tests pass" --source agent

Run 'cards-extension <subcommand> --help' for subcommand help.`;

/**
 * Parse argv tail and dispatch to the appropriate subcommand handler.
 *
 * @param argv - The argv tail (everything after the executable path).
 * @returns The intended process exit code. Never calls process.exit itself.
 */
export async function main(argv: string[]): Promise<number> {
  const [sub, ...rest] = argv;

  if (!sub) {
    console.error(HELP);
    return 1;
  }
  if (sub === '-h' || sub === '--help') {
    console.log(HELP);
    return 0;
  }

  try {
    if (sub === 'attribution') return await runAttribution(rest);
    if (sub === 'notify') return await runNotify(rest);

    console.error(`cards-extension: unknown command "${sub}"`);
    console.error(HELP);
    return 1;
  } catch (error) {
    console.error('cards-extension:', error instanceof Error ? error.message : String(error));
    return 1;
  }
}

// Executable guard — the only place `process.exit` is called in this module.
if (process.argv[1]?.endsWith('cards-extension.mjs')) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
