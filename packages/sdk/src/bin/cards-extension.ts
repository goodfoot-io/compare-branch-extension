/**
 * `cards-extension` CLI dispatcher.
 *
 * Routes argv into subcommand handlers for attribution, notify, workspace,
 * editor, execute-command, panel, and debug.
 * The dispatcher never calls `process.exit` — only the module-bottom
 * executable guard does, exactly once, so the exported `main` function
 * is safe to invoke from vitest workers.
 *
 * @summary cards-extension CLI dispatcher
 */

import { runAttribution } from './cards-extension/attribution.js';
import { runDebug } from './cards-extension/debug.js';
import { runEditor } from './cards-extension/editor.js';
import { runExecuteCommand } from './cards-extension/execute-command.js';
import { runNotify } from './cards-extension/notify.js';
import { runPanel } from './cards-extension/panel.js';
import { runWorkspace } from './cards-extension/workspace.js';

const HELP = `Usage: cards-extension <subcommand> [options]

Cards VSCode extension CLI.

Subcommands:
  attribution <set|get|clear>    Manage the attribution/comparison state
  notify --type ... --title ... --message ... --source ...
                                 Send a notification to the VSCode UI
  workspace <list>               List workspaces registered with VS Code
  editor <info|open|select>      Inspect or control the active editor
  execute-command <commandId>    Execute a VS Code command
  panel <show>                   Show a VS Code panel
  debug <start|stop|state>       Control the VS Code debugger

Options:
  -h, --help                     Show this help text

Examples:
  cards-extension attribution set <<'EOF'
  { "baseRef": "main", "compareRef": "feature/x" }
  EOF
  cards-extension attribution get
  cards-extension attribution clear
  cards-extension notify --type info --title "Built" --message "All tests pass" --source agent
  cards-extension workspace list
  cards-extension editor info --workspace /path/to/workspace
  cards-extension editor open src/auth.ts --line 42
  cards-extension editor select src/index.ts --start 10:0 --end 15:20
  cards-extension execute-command editor.action.formatDocument
  cards-extension panel show problems
  cards-extension debug start --config "My Config"
  cards-extension debug stop
  cards-extension debug state

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
    if (sub === 'workspace') return await runWorkspace(rest);
    if (sub === 'editor') return await runEditor(rest);
    if (sub === 'execute-command') return await runExecuteCommand(rest);
    if (sub === 'panel') return await runPanel(rest);
    if (sub === 'debug') return await runDebug(rest);

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
