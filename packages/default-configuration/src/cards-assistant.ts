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

import { spawn } from 'node:child_process';
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

    const child = spawn('codex', args, {
      cwd: input.repoRoot,
      stdio: 'inherit',
      env: { ...process.env, CODEX_HOME: codexHome }
    });

    const exitCode = await new Promise<number | null>((resolve) => {
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

  // Collapse the system prompt onto a single physical line. On Windows the
  // spawn below routes through `cmd.exe` (`shell: true`) to resolve the
  // `claude.cmd`/`claude.ps1` PATH shim, and cmd.exe cannot safely represent a
  // single argument that contains embedded newlines. The newlines in
  // INTERVIEW_INSTRUCTIONS are purely cosmetic, so collapsing them keeps the
  // argument cmd-quotable while remaining identical in meaning on POSIX.
  const appendSystemPrompt = INTERVIEW_INSTRUCTIONS.replace(/\s*\n\s*/g, ' ');

  const shellArgs = ['--append-system-prompt', appendSystemPrompt, '--settings', settingsJson];

  logger.info('Starting cards assistant', {
    cwd: input.repoRoot,
    marketplacePath: input.marketplacePath
  });

  // On Windows the `claude` CLI is an npm-installed `claude.cmd`/`claude.ps1`
  // PATH shim, and Node refuses to spawn a `.cmd` without a shell (EINVAL), so
  // route through the shell there. POSIX execs the binary directly, preserving
  // the existing exec-direct behavior and quoting. Matches the documented
  // pattern in `@cards/sdk/bin/spawn-adhoc-cleanup`.
  const child = spawn('claude', shellArgs, {
    cwd: input.repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32'
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
