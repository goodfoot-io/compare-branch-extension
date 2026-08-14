/**
 * Settings configuration for default Claude Code workflows.
 *
 * This configuration defines the standard environment with actions and types
 * for Claude Code card-based workflows. The configuration is transformed to
 * settings.json at build time via the build-settings script.
 *
 *
 * @summary Settings configuration for default Claude Code workflows
 * @module
 */

import { defineConfig } from '@cards.management/sdk/config';
// Action handlers
import admiral from './src/actions/admiral.js';
import captain from './src/actions/captain.js';
import chat from './src/actions/chat.js';
import interview from './src/actions/interview.js';
import launch from './src/actions/launch.js';
// Cards assistant handler
import cardsAssistant from './src/cards-assistant.js';

export default defineConfig({
  cardsAssistant,
  environments: {
    default: {
      version: 1,
      description: 'Standard Claude Code workflows',
      actions: [launch, interview, chat, captain, admiral],
      streams: {
        'claude-code-session': {
          version: 1,
          wwwRoot: './src/streams/claude-code-session/www',
          maxLineLength: 1_048_576
        },
        'codex-session': {
          version: 1,
          wwwRoot: './src/streams/codex-session/www',
          // Codex rollout lines can carry full function-call payloads, so the
          // per-line limit is larger (4 MiB) than the Claude renderer's.
          maxLineLength: 4_194_304
        }
      }
    }
  }
});
