/**
 * Default cards assistant handler for the Cards extension.
 *
 * Branches on `input.codingAgent` via {@link resolveCodingAgent}:
 * - Claude: calls `updateMarketplaceRegistration`, then spawns the `claude` CLI
 *   with both the `cards@cards.management` and `cards-assistant@cards.management`
 *   plugins enabled, passing the interview instructions via `--append-system-prompt`.
 * - Codex: stages the `cards` and `cards-assistant` plugins into a managed
 *   `CODEX_HOME`, writes a `cards-assistant` profile, and spawns `codex` with
 *   `--profile cards-assistant` and the interview instructions as a
 *   `developer_instructions` override via `-c`.
 *
 * Unlike action handlers, this handler has no card context, no worktree, and no
 * socket. It runs in `input.repoRoot` under either coding agent.
 *
 * @summary Default cards assistant handler
 * @module
 */

import { defineCardsAssistant } from '@cards/sdk/config';
import { updateMarketplaceRegistration } from './lib/claude-session.js';
import {
  CODEX_ASSISTANT_PLUGIN_NAMES,
  formatDeveloperInstructionsOverride,
  populateCodexPluginCache,
  resolveDefaultCodexHome,
  writeCodexProfileConfig
} from './lib/codex-session.js';
import { resolveCodingAgent } from './lib/coding-agent.js';
import { spawnAgentCli } from './lib/spawn-cli.js';

const INTERVIEW_INSTRUCTIONS = `<instructions>
    You are the Cards assistant: a conversational front-end to the Cards extension. Load the \`cards:cards\` skill. First determine what the user wants, then act in the matching mode — do not assume every request is a new card.

    Modes:
    - Create a card — a new bug, feature, change, doc, or (only when the user explicitly asks, or the research is too large for one session) investigation. Interview the user to reach a shared understanding before creating it: walk each branch of the design tree one decision at a time, resolving dependencies, recommending an answer for each question. The full interview is the bar only for creation.
    - Capture quickly — the user, or a calling agent, wants something recorded with minimal ceremony. Confirm the title and scope in one exchange and create the card; skip the full interview.
    - Modify a card — refine scope + CARD.md, add a comment, note, or attachment, fix tags or relations. Make the change directly; no interview.
    - Act on a card — start an action (e.g. \`launch\`), bind, or watch. The user owns implementation: start the action they ask for; do not implement the card yourself.
    - Drive the extension — open a file, run a VS Code command, show a panel, notify, or control the debugger via \`cards-extension\` (see the \`cards:cards\` skill's \`./references/extension-cli.md\`).
    - Troubleshoot or give feedback on Cards itself — for how the extension works or why it failed, load the \`cards:debug\` skill. To report a bug or request a feature in the extension (not the user's own project), file it on the extension's public GitHub via \`cards-extension issue\` — not as a card.

    Guidelines:
    - Ask questions, one at a time, each with a recommended answer you offer rather than press.
    - Resolve feasibility and research questions yourself (codebase, git, and web); fold the answer into scoping rather than handing the question back to the user or making it the card's purpose.
    - When the deliverable is ambiguous, confirm in plain language what you will do before doing it. Describe what a card will do; never name its card type to the user.
    - When you need more signal, ask for it plainly; never frame a gap as something the user failed to provide.
    - When the user names a card, resolve it with \`cards <id>\`; search only to find related or duplicate cards while creating or modifying one.

    </instructions>`;

export default defineCardsAssistant({}, async (input, { logger }) => {
  const agent = resolveCodingAgent(input);

  if (agent === 'codex-cli') {
    const codexHome = resolveDefaultCodexHome();
    const { pluginCachePaths } = await populateCodexPluginCache(
      codexHome,
      input.marketplacePath,
      CODEX_ASSISTANT_PLUGIN_NAMES
    );
    const profilePath = await writeCodexProfileConfig(codexHome, {
      profileName: 'cards-assistant',
      pluginNames: CODEX_ASSISTANT_PLUGIN_NAMES,
      pluginCachePaths
    });

    const args = [
      '--dangerously-bypass-approvals-and-sandbox',
      '--profile',
      'cards-assistant',
      '--cd',
      input.repoRoot,
      '-c',
      formatDeveloperInstructionsOverride(INTERVIEW_INSTRUCTIONS)
    ];

    logger.info('Starting cards assistant (codex)', {
      cwd: input.repoRoot,
      codexHome,
      profilePath
    });

    // Route through cross-spawn so the win32 PATHEXT shim (`codex.cmd`) resolves
    // and its arguments are escaped for cmd.exe; on POSIX it spawns `codex`
    // directly. A bare `spawn('codex', …)` ENOENTs on the `.cmd` shim on win32.
    const child = spawnAgentCli('codex', args, {
      cwd: input.repoRoot,
      stdio: 'inherit',
      env: { ...process.env, CODEX_HOME: codexHome }
    });

    const exitCode = await new Promise<number | null>((resolve) => {
      // Fail closed: a spawn failure (e.g. ENOENT when the `codex` shim is
      // missing) emits `error` but never `close`, which would leave this promise
      // hung forever. Mirrors the `claude` launch guard below.
      child.on('error', (error) => {
        logger.error('Failed to spawn codex', {
          error: error instanceof Error ? error.message : String(error)
        });
        resolve(null);
      });
      child.on('close', resolve);
    });

    logger.info('Cards assistant exited', { exitCode });
    return;
  }

  await updateMarketplaceRegistration(input.marketplacePath, logger);

  const settingsJson = JSON.stringify({
    enabledPlugins: {
      'cards@cards.management': true,
      'cards-assistant@cards.management': true
    },
    extraKnownMarketplaces: {
      'cards.management': {
        source: { source: 'directory', path: input.marketplacePath }
      }
    }
  });

  const cliArgs = ['--append-system-prompt', INTERVIEW_INSTRUCTIONS, '--settings', settingsJson];

  logger.info('Starting cards assistant', {
    cwd: input.repoRoot,
    marketplacePath: input.marketplacePath
  });

  // Route through cross-spawn rather than `spawn('claude', …, { shell: win32 })`.
  // On win32 the `claude` CLI is a PATHEXT `.cmd` shim: a bare spawn ENOENTs, and
  // a `shell: true` spawn resolves the shim but concatenates argv into the cmd.exe
  // command line UNQUOTED — so the `"`/`{`/`}` in `--settings '{…JSON…}'` and the
  // multi-line `--append-system-prompt` get mangled and claude exits before its
  // session starts ("The system cannot find the file specified"). cross-spawn
  // resolves the shim AND escapes each argument for cmd.exe, so complex args
  // survive intact and the multi-line prompt no longer needs collapsing; on POSIX
  // it spawns the binary directly. Mirrors the action-path launch in
  // `claude-session.ts`.
  const child = spawnAgentCli('claude', cliArgs, {
    cwd: input.repoRoot,
    stdio: 'inherit'
  });

  const exitCode = await new Promise<number | null>((resolve) => {
    // Fail closed: a spawn failure (e.g. ENOENT when the shim is missing) emits
    // `error` but never `close`, which would leave this promise hung forever.
    child.on('error', (error) => {
      logger.error('Failed to spawn claude', {
        error: error instanceof Error ? error.message : String(error)
      });
      resolve(null);
    });
    child.on('close', resolve);
  });

  logger.info('Cards assistant exited', { exitCode });
});
