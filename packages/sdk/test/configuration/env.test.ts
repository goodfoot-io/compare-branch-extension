/**
 * Unit tests for environment variable extraction utilities.
 *
 * @summary Unit tests for environment variable extraction utilities
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CARDS_ENV_VARS,
  extractActionInput,
  extractCardsAssistantInput,
  getActionName,
  getCardId,
  getCodingAgent,
  getEnvironment,
  getExecutionMode,
  getVscodeNodePath
} from '../../src/config/env.js';

describe('env', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all relevant env vars before each test
    delete process.env[CARDS_ENV_VARS.CARD_ID];
    delete process.env[CARDS_ENV_VARS.ACTION_NAME];
    delete process.env[CARDS_ENV_VARS.ENVIRONMENT];
    delete process.env[CARDS_ENV_VARS.EXECUTION_MODE];
    delete process.env[CARDS_ENV_VARS.CODING_AGENT];
    delete process.env[CARDS_ENV_VARS.VSCODE_NODE];
  });

  afterEach(() => {
    // Restore original env vars after each test
    process.env = { ...originalEnv };
  });

  describe('CARDS_ENV_VARS', () => {
    it('should define all environment variable names', () => {
      expect(CARDS_ENV_VARS).toEqual({
        CARD_ID: 'CARD_ID',
        ACTION_NAME: 'ACTION_NAME',
        ENVIRONMENT: 'ENVIRONMENT',
        EXECUTION_MODE: 'EXECUTION_MODE',
        CODING_AGENT: 'CODING_AGENT',
        VSCODE_NODE: 'VSCODE_NODE',
        NODE: 'NODE',
        SOCKET_PATH: 'SOCKET_PATH',
        SWITCH_TO_INTERACTIVE_DATA_PATH: 'SWITCH_TO_INTERACTIVE_DATA_PATH',
        CONFIG_PATH: 'CONFIG_PATH',
        WORKSPACE_PATH: 'WORKSPACE_PATH',
        REPO_ROOT: 'REPO_ROOT',
        CARD_REPO_PATH: 'CARD_REPO_PATH',
        ACTION_COMMAND: 'ACTION_COMMAND',
        BASE_BRANCH: 'BASE_BRANCH',
        CARDS_SESSION_ID: 'CARDS_SESSION_ID',
        CARDS_TRANSCRIPT_PATH: 'CARDS_TRANSCRIPT_PATH',
        PARENT_BRANCH: 'PARENT_BRANCH',
        WORKSPACE_BRANCH: 'WORKSPACE_BRANCH',
        EXTENSION_PATH: 'EXTENSION_PATH',
        MARKETPLACE_PATH: 'MARKETPLACE_PATH',
        HOOKS_LOG_FILE: 'CARDS_HOOKS_LOG_FILE'
      });
    });
  });

  describe('getCardId', () => {
    it('should return card ID when set', () => {
      process.env[CARDS_ENV_VARS.CARD_ID] = 'card-123';
      expect(getCardId()).toBe('card-123');
    });

    it('should throw when CARD_ID is undefined', () => {
      expect(() => getCardId()).toThrow('Missing required environment variable: CARD_ID');
    });

    it('should throw when CARD_ID is empty string', () => {
      process.env[CARDS_ENV_VARS.CARD_ID] = '';
      expect(() => getCardId()).toThrow('Missing required environment variable: CARD_ID');
    });
  });

  describe('getActionName', () => {
    it('should return action name when set', () => {
      process.env[CARDS_ENV_VARS.ACTION_NAME] = 'Launch Claude';
      expect(getActionName()).toBe('Launch Claude');
    });

    it('should throw when ACTION_NAME is undefined', () => {
      expect(() => getActionName()).toThrow('Missing required environment variable: ACTION_NAME');
    });

    it('should throw when ACTION_NAME is empty string', () => {
      process.env[CARDS_ENV_VARS.ACTION_NAME] = '';
      expect(() => getActionName()).toThrow('Missing required environment variable: ACTION_NAME');
    });
  });

  describe('getEnvironment', () => {
    it('should return environment when set', () => {
      process.env[CARDS_ENV_VARS.ENVIRONMENT] = 'production';
      expect(getEnvironment()).toBe('production');
    });

    it('should throw when ENVIRONMENT is undefined', () => {
      expect(() => getEnvironment()).toThrow('Missing required environment variable: ENVIRONMENT');
    });

    it('should throw when ENVIRONMENT is empty string', () => {
      process.env[CARDS_ENV_VARS.ENVIRONMENT] = '';
      expect(() => getEnvironment()).toThrow('Missing required environment variable: ENVIRONMENT');
    });
  });

  describe('getExecutionMode', () => {
    it('should return "interactive" when set', () => {
      process.env[CARDS_ENV_VARS.EXECUTION_MODE] = 'interactive';
      expect(getExecutionMode()).toBe('interactive');
    });

    it('should return "background" when set', () => {
      process.env[CARDS_ENV_VARS.EXECUTION_MODE] = 'background';
      expect(getExecutionMode()).toBe('background');
    });

    it('should throw when EXECUTION_MODE is undefined', () => {
      expect(() => getExecutionMode()).toThrow('Missing required environment variable: EXECUTION_MODE');
    });

    it('should throw when EXECUTION_MODE is empty string', () => {
      process.env[CARDS_ENV_VARS.EXECUTION_MODE] = '';
      expect(() => getExecutionMode()).toThrow('Missing required environment variable: EXECUTION_MODE');
    });

    it('should throw when EXECUTION_MODE is invalid value', () => {
      process.env[CARDS_ENV_VARS.EXECUTION_MODE] = 'invalid';
      expect(() => getExecutionMode()).toThrow(
        "Invalid EXECUTION_MODE: expected 'interactive' or 'background', got \"invalid\""
      );
    });
  });

  describe('getCodingAgent', () => {
    it('should return coding agent when set', () => {
      process.env[CARDS_ENV_VARS.CODING_AGENT] = 'claude';
      expect(getCodingAgent()).toBe('claude');
    });

    it('should return undefined when CODING_AGENT is not set', () => {
      expect(getCodingAgent()).toBeUndefined();
    });

    it('should return undefined when CODING_AGENT is empty string', () => {
      process.env[CARDS_ENV_VARS.CODING_AGENT] = '';
      expect(getCodingAgent()).toBeUndefined();
    });
  });

  describe('getVscodeNodePath', () => {
    it('should return node path when set', () => {
      process.env[CARDS_ENV_VARS.VSCODE_NODE] = '/usr/bin/node';
      expect(getVscodeNodePath()).toBe('/usr/bin/node');
    });

    it('should throw when VSCODE_NODE is undefined', () => {
      expect(() => getVscodeNodePath()).toThrow('Missing required environment variable: VSCODE_NODE');
    });

    it('should throw when VSCODE_NODE is empty string', () => {
      process.env[CARDS_ENV_VARS.VSCODE_NODE] = '';
      expect(() => getVscodeNodePath()).toThrow('Missing required environment variable: VSCODE_NODE');
    });
  });

  describe('extractActionInput', () => {
    // Helper to set up action environment variables
    function setupActionEnv() {
      process.env[CARDS_ENV_VARS.CARD_ID] = 'card-123';
      process.env[CARDS_ENV_VARS.ACTION_NAME] = 'Launch Claude';
      process.env[CARDS_ENV_VARS.ENVIRONMENT] = 'production';
      process.env[CARDS_ENV_VARS.EXECUTION_MODE] = 'interactive';
      process.env[CARDS_ENV_VARS.REPO_ROOT] = '/workspace/project';
      process.env[CARDS_ENV_VARS.CARD_REPO_PATH] = '/workspace/project/.cards/repo';
      process.env[CARDS_ENV_VARS.CONFIG_PATH] = '/workspace/project/.cards/config';
      process.env[CARDS_ENV_VARS.EXTENSION_PATH] = '/extension/path';
      process.env[CARDS_ENV_VARS.MARKETPLACE_PATH] = '/test/marketplace';
    }

    it('should extract all action input fields when all are set', () => {
      setupActionEnv();
      process.env[CARDS_ENV_VARS.CODING_AGENT] = 'claude';

      const input = extractActionInput();

      expect(input).toEqual({
        cardId: 'card-123',
        actionName: 'Launch Claude',
        environment: 'production',
        executionMode: 'interactive',
        codingAgent: 'claude',
        switchToInteractiveData: undefined,
        repoRoot: '/workspace/project',
        cardRepoPath: '/workspace/project/.cards/repo',
        configPath: '/workspace/project/.cards/config',
        extensionPath: '/extension/path',
        marketplacePath: '/test/marketplace'
      });
    });

    it('should extract action input without optional codingAgent', () => {
      setupActionEnv();

      const input = extractActionInput();

      expect(input).toEqual({
        cardId: 'card-123',
        actionName: 'Launch Claude',
        environment: 'production',
        executionMode: 'interactive',
        codingAgent: undefined,
        switchToInteractiveData: undefined,
        repoRoot: '/workspace/project',
        cardRepoPath: '/workspace/project/.cards/repo',
        configPath: '/workspace/project/.cards/config',
        extensionPath: '/extension/path',
        marketplacePath: '/test/marketplace'
      });
    });

    it('should extract action input with background execution mode', () => {
      setupActionEnv();
      process.env[CARDS_ENV_VARS.EXECUTION_MODE] = 'background';

      const input = extractActionInput();

      expect(input.executionMode).toBe('background');
    });

    it('should throw when required CARD_ID is missing', () => {
      process.env[CARDS_ENV_VARS.ACTION_NAME] = 'Launch Claude';
      process.env[CARDS_ENV_VARS.ENVIRONMENT] = 'production';
      process.env[CARDS_ENV_VARS.EXECUTION_MODE] = 'interactive';

      expect(() => extractActionInput()).toThrow('Missing required environment variable: CARD_ID');
    });

    it('should throw when required ACTION_NAME is missing', () => {
      process.env[CARDS_ENV_VARS.CARD_ID] = 'card-123';
      process.env[CARDS_ENV_VARS.ENVIRONMENT] = 'production';
      process.env[CARDS_ENV_VARS.EXECUTION_MODE] = 'interactive';

      expect(() => extractActionInput()).toThrow('Missing required environment variable: ACTION_NAME');
    });

    it('should throw when required ENVIRONMENT is missing', () => {
      process.env[CARDS_ENV_VARS.CARD_ID] = 'card-123';
      process.env[CARDS_ENV_VARS.ACTION_NAME] = 'Launch Claude';
      process.env[CARDS_ENV_VARS.EXECUTION_MODE] = 'interactive';

      expect(() => extractActionInput()).toThrow('Missing required environment variable: ENVIRONMENT');
    });

    it('should throw when required EXECUTION_MODE is missing', () => {
      process.env[CARDS_ENV_VARS.CARD_ID] = 'card-123';
      process.env[CARDS_ENV_VARS.ACTION_NAME] = 'Launch Claude';
      process.env[CARDS_ENV_VARS.ENVIRONMENT] = 'production';

      expect(() => extractActionInput()).toThrow('Missing required environment variable: EXECUTION_MODE');
    });

    it('should throw when EXECUTION_MODE has invalid value', () => {
      setupActionEnv();
      process.env[CARDS_ENV_VARS.EXECUTION_MODE] = 'invalid-mode';

      expect(() => extractActionInput()).toThrow(
        "Invalid EXECUTION_MODE: expected 'interactive' or 'background', got \"invalid-mode\""
      );
    });
  });

  describe('extractCardsAssistantInput', () => {
    function setupCardsAssistantEnv() {
      process.env[CARDS_ENV_VARS.MARKETPLACE_PATH] = '/test/marketplace';
      process.env[CARDS_ENV_VARS.EXTENSION_PATH] = '/extension/path';
      process.env[CARDS_ENV_VARS.REPO_ROOT] = '/workspace/project';
    }

    it('should extract all required fields', () => {
      setupCardsAssistantEnv();

      const input = extractCardsAssistantInput();

      expect(input).toEqual({
        marketplacePath: '/test/marketplace',
        extensionPath: '/extension/path',
        codingAgent: undefined,
        repoRoot: '/workspace/project'
      });
    });

    it('should include codingAgent when set', () => {
      setupCardsAssistantEnv();
      process.env[CARDS_ENV_VARS.CODING_AGENT] = 'claude-code-cli';

      const input = extractCardsAssistantInput();

      expect(input.codingAgent).toBe('claude-code-cli');
    });

    it('should not require CARD_ID or ACTION_NAME', () => {
      setupCardsAssistantEnv();
      // Deliberately not setting CARD_ID, ACTION_NAME, ENVIRONMENT, EXECUTION_MODE

      expect(() => extractCardsAssistantInput()).not.toThrow();
    });

    it('should throw when MARKETPLACE_PATH is missing', () => {
      delete process.env[CARDS_ENV_VARS.MARKETPLACE_PATH];
      process.env[CARDS_ENV_VARS.EXTENSION_PATH] = '/extension/path';
      process.env[CARDS_ENV_VARS.REPO_ROOT] = '/workspace/project';

      expect(() => extractCardsAssistantInput()).toThrow('Missing required environment variable: MARKETPLACE_PATH');
    });

    it('should throw when EXTENSION_PATH is missing', () => {
      process.env[CARDS_ENV_VARS.MARKETPLACE_PATH] = '/test/marketplace';
      delete process.env[CARDS_ENV_VARS.EXTENSION_PATH];
      process.env[CARDS_ENV_VARS.REPO_ROOT] = '/workspace/project';

      expect(() => extractCardsAssistantInput()).toThrow('Missing required environment variable: EXTENSION_PATH');
    });

    it('should throw when REPO_ROOT is missing', () => {
      process.env[CARDS_ENV_VARS.MARKETPLACE_PATH] = '/test/marketplace';
      process.env[CARDS_ENV_VARS.EXTENSION_PATH] = '/extension/path';
      delete process.env[CARDS_ENV_VARS.REPO_ROOT];

      expect(() => extractCardsAssistantInput()).toThrow('Missing required environment variable: REPO_ROOT');
    });
  });
});
