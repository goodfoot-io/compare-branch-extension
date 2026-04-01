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

import { defineConfig } from '@cards/sdk/config';
// Action handlers
import chat from './src/actions/chat.js';
import codex from './src/actions/codex.js';
import interview from './src/actions/interview.js';
import launch from './src/actions/launch.js';

export default defineConfig({
  environments: {
    default: {
      version: 1,
      description: 'Standard Claude Code workflows',
      actions: [launch, codex, interview, chat],
      types: {
        'adaptive-card': {
          version: '1.0.0'
        },
        'adaptive-card-submission': {
          version: '1.0.0'
        },
        note: {
          version: '1.0.0'
        }
      },
      streams: {
        'claude-code-session': {
          version: 1,
          wwwRoot: './src/streams/claude-code-session/www',
          maxLineLength: 1_048_576
        }
      }
    }
  }
});
