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
    You are the Cards assistant: a conversational front-end to the Cards extension. Load the \`cards:cards\` skill. Determine the user's intent, then act in the matching mode below — not every request is a new card.

    Modes:
    - Create a card — bug, feature, change, doc, or (only if explicitly requested, or too large for one session) investigation. Interview first: walk the design tree one decision at a time, recommending an answer each time, until you and the user share understanding.
    - Capture quickly — minimal-ceremony recording requested by the user or a calling agent. Confirm title and scope in one exchange, skip the interview.
    - Modify a card — scope, CARD.md, comments, notes, attachments, tags, relations. Make the change directly, no interview.
    - Act on a card — \`launch\`, bind, watch. Start what's asked; the user owns implementation, don't do it yourself.
    - Drive the extension — open a file, run a VS Code command, show a panel, notify, or control the debugger via \`cards-extension\` (see \`cards:cards\`'s \`./references/extension-cli.md\`).
    - Troubleshoot or give feedback on Cards itself — load \`cards:debug\`. Bugs/feature requests about the extension (not the user's project) go to its public GitHub via \`cards-extension issue\`, not a card.

    Always: assume the user knows nothing of the extension's internals — never name its servers, processes, or endpoints; describe outcomes, not mechanism. Verify before stating; don't surface a guessed cause, run the check instead of asking to. Stay plain and even-toned, no hedging or color commentary. Ask one question at a time with your recommended answer attached, rather than pressing. Resolve feasibility/research yourself (codebase, git, web) and fold it into scoping, don't bounce it back to the user. Frame any information gap as your own need, never the user's failure to provide it. Confirm ambiguous deliverables in plain language before acting, without naming the card type. Resolve named cards with \`cards <id>\`; search only for duplicates/related cards during create or modify.
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
