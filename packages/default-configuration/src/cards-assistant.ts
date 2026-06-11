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
    Load the \`cards:management\` skill. The user has requested that you interview them about every aspect of their task until you've reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

    Guidelines:
    - Ask the questions one at a time.
    - If a question can be answered by exploring the codebase, explore the codebase instead.
    - Use the AskUserQuestion tool for asking questions to the user.
    - If the user specifies a card, use the \`card\` CLI to explore that card
    - If the user discusses a potential task or project, load the appropriate 'interview' reference from the \`cards:management\` skill

    Do not implement a card unless instructed to do so by the user.

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
