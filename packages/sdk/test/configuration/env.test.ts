/**
 * Unit tests for environment variable extraction utilities.
 *
 * @summary Unit tests for environment variable extraction utilities
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CARDS_ENV_VARS,
  extractActionInput,
  extractTypeInput,
  getActionName,
  getCardId,
  getCodingAgent,
  getContentType,
  getEnvironment,
  getExecutionMode,
  getFileName,
  getFilePath,
  getFileSize,
  getSha256,
  getTypeName,
  getTypeVersion,
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
    delete process.env[CARDS_ENV_VARS.TYPE_NAME];
    delete process.env[CARDS_ENV_VARS.TYPE_VERSION];
    delete process.env[CARDS_ENV_VARS.FILE_NAME];
    delete process.env[CARDS_ENV_VARS.FILE_PATH];
    delete process.env[CARDS_ENV_VARS.FILE_SIZE];
    delete process.env[CARDS_ENV_VARS.SHA256];
    delete process.env[CARDS_ENV_VARS.CONTENT_TYPE];
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
        TYPE_NAME: 'TYPE_NAME',
        TYPE_VERSION: 'TYPE_VERSION',
        FILE_NAME: 'FILE_NAME',
        FILE_PATH: 'FILE_PATH',
        FILE_SIZE: 'FILE_SIZE',
        SHA256: 'SHA256',
        CONTENT_TYPE: 'CONTENT_TYPE',
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
        PARENT_BRANCH: 'PARENT_BRANCH',
        WORKSPACE_BRANCH: 'WORKSPACE_BRANCH',
        EXTENSION_PATH: 'EXTENSION_PATH',
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

  describe('getTypeName', () => {
    it('should return type name when set', () => {
      process.env[CARDS_ENV_VARS.TYPE_NAME] = 'my-type';
      expect(getTypeName()).toBe('my-type');
    });

    it('should throw when TYPE_NAME is undefined', () => {
      expect(() => getTypeName()).toThrow('Missing required environment variable: TYPE_NAME');
    });

    it('should throw when TYPE_NAME is empty string', () => {
      process.env[CARDS_ENV_VARS.TYPE_NAME] = '';
      expect(() => getTypeName()).toThrow('Missing required environment variable: TYPE_NAME');
    });
  });

  describe('getTypeVersion', () => {
    it('should return type version when set', () => {
      process.env[CARDS_ENV_VARS.TYPE_VERSION] = '1.0.0';
      expect(getTypeVersion()).toBe('1.0.0');
    });

    it('should throw when TYPE_VERSION is undefined', () => {
      expect(() => getTypeVersion()).toThrow('Missing required environment variable: TYPE_VERSION');
    });

    it('should throw when TYPE_VERSION is empty string', () => {
      process.env[CARDS_ENV_VARS.TYPE_VERSION] = '';
      expect(() => getTypeVersion()).toThrow('Missing required environment variable: TYPE_VERSION');
    });
  });

  describe('getFileName', () => {
    it('should return file name when set', () => {
      process.env[CARDS_ENV_VARS.FILE_NAME] = 'document.pdf';
      expect(getFileName()).toBe('document.pdf');
    });

    it('should throw when FILE_NAME is undefined', () => {
      expect(() => getFileName()).toThrow('Missing required environment variable: FILE_NAME');
    });

    it('should throw when FILE_NAME is empty string', () => {
      process.env[CARDS_ENV_VARS.FILE_NAME] = '';
      expect(() => getFileName()).toThrow('Missing required environment variable: FILE_NAME');
    });
  });

  describe('getFilePath', () => {
    it('should return file path when set', () => {
      process.env[CARDS_ENV_VARS.FILE_PATH] = '/path/to/file';
      expect(getFilePath()).toBe('/path/to/file');
    });

    it('should throw when FILE_PATH is undefined', () => {
      expect(() => getFilePath()).toThrow('Missing required environment variable: FILE_PATH');
    });

    it('should throw when FILE_PATH is empty string', () => {
      process.env[CARDS_ENV_VARS.FILE_PATH] = '';
      expect(() => getFilePath()).toThrow('Missing required environment variable: FILE_PATH');
    });
  });

  describe('getFileSize', () => {
    it('should return file size as number when set to valid integer', () => {
      process.env[CARDS_ENV_VARS.FILE_SIZE] = '1024';
      expect(getFileSize()).toBe(1024);
    });

    it('should throw when FILE_SIZE is undefined', () => {
      expect(() => getFileSize()).toThrow('Missing required environment variable: FILE_SIZE');
    });

    it('should throw when FILE_SIZE is empty string', () => {
      process.env[CARDS_ENV_VARS.FILE_SIZE] = '';
      expect(() => getFileSize()).toThrow('Missing required environment variable: FILE_SIZE');
    });

    it('should throw when FILE_SIZE is not a number', () => {
      process.env[CARDS_ENV_VARS.FILE_SIZE] = 'not-a-number';
      expect(() => getFileSize()).toThrow('Invalid FILE_SIZE: expected number, got "not-a-number"');
    });

    it('should parse float strings by truncating to integer', () => {
      // Note: parseInt truncates floats - this is standard JavaScript behavior
      process.env[CARDS_ENV_VARS.FILE_SIZE] = '123.45';
      expect(getFileSize()).toBe(123);
    });

    it('should handle zero as valid file size', () => {
      process.env[CARDS_ENV_VARS.FILE_SIZE] = '0';
      expect(getFileSize()).toBe(0);
    });
  });

  describe('getSha256', () => {
    it('should return sha256 when set', () => {
      process.env[CARDS_ENV_VARS.SHA256] = 'abc123def456';
      expect(getSha256()).toBe('abc123def456');
    });

    it('should throw when SHA256 is undefined', () => {
      expect(() => getSha256()).toThrow('Missing required environment variable: SHA256');
    });

    it('should throw when SHA256 is empty string', () => {
      process.env[CARDS_ENV_VARS.SHA256] = '';
      expect(() => getSha256()).toThrow('Missing required environment variable: SHA256');
    });
  });

  describe('getContentType', () => {
    it('should return content type when set', () => {
      process.env[CARDS_ENV_VARS.CONTENT_TYPE] = 'application/pdf';
      expect(getContentType()).toBe('application/pdf');
    });

    it('should throw when CONTENT_TYPE is undefined', () => {
      expect(() => getContentType()).toThrow('Missing required environment variable: CONTENT_TYPE');
    });

    it('should throw when CONTENT_TYPE is empty string', () => {
      process.env[CARDS_ENV_VARS.CONTENT_TYPE] = '';
      expect(() => getContentType()).toThrow('Missing required environment variable: CONTENT_TYPE');
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
        extensionPath: '/extension/path'
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
        extensionPath: '/extension/path'
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

  describe('extractTypeInput', () => {
    // Helper to set up type hook environment variables
    function setupTypeEnv() {
      process.env[CARDS_ENV_VARS.CARD_ID] = 'card-456';
      process.env[CARDS_ENV_VARS.ENVIRONMENT] = 'staging';
      process.env[CARDS_ENV_VARS.TYPE_NAME] = 'adaptive-card';
      process.env[CARDS_ENV_VARS.TYPE_VERSION] = '2.0.0';
      process.env[CARDS_ENV_VARS.FILE_NAME] = 'card.json';
      process.env[CARDS_ENV_VARS.FILE_PATH] = '/cards/card-456/adaptive-card/card.json';
      process.env[CARDS_ENV_VARS.FILE_SIZE] = '2048';
      process.env[CARDS_ENV_VARS.SHA256] = 'def789ghi012';
      process.env[CARDS_ENV_VARS.CONTENT_TYPE] = 'application/json';
    }

    it('should extract all type input fields when all are set', () => {
      setupTypeEnv();

      const input = extractTypeInput();

      expect(input).toEqual({
        cardId: 'card-456',
        environment: 'staging',
        typeName: 'adaptive-card',
        typeVersion: '2.0.0',
        fileName: 'card.json',
        filePath: '/cards/card-456/adaptive-card/card.json',
        fileSize: 2048,
        fileSha256: 'def789ghi012',
        contentType: 'application/json'
      });
    });

    it('should throw when required CARD_ID is missing', () => {
      setupTypeEnv();
      delete process.env[CARDS_ENV_VARS.CARD_ID];

      expect(() => extractTypeInput()).toThrow('Missing required environment variable: CARD_ID');
    });

    it('should throw when required ENVIRONMENT is missing', () => {
      setupTypeEnv();
      delete process.env[CARDS_ENV_VARS.ENVIRONMENT];

      expect(() => extractTypeInput()).toThrow('Missing required environment variable: ENVIRONMENT');
    });

    it('should throw when required TYPE_NAME is missing', () => {
      setupTypeEnv();
      delete process.env[CARDS_ENV_VARS.TYPE_NAME];

      expect(() => extractTypeInput()).toThrow('Missing required environment variable: TYPE_NAME');
    });

    it('should throw when required TYPE_VERSION is missing', () => {
      setupTypeEnv();
      delete process.env[CARDS_ENV_VARS.TYPE_VERSION];

      expect(() => extractTypeInput()).toThrow('Missing required environment variable: TYPE_VERSION');
    });

    it('should throw when required FILE_NAME is missing', () => {
      setupTypeEnv();
      delete process.env[CARDS_ENV_VARS.FILE_NAME];

      expect(() => extractTypeInput()).toThrow('Missing required environment variable: FILE_NAME');
    });

    it('should throw when required FILE_PATH is missing', () => {
      setupTypeEnv();
      delete process.env[CARDS_ENV_VARS.FILE_PATH];

      expect(() => extractTypeInput()).toThrow('Missing required environment variable: FILE_PATH');
    });

    it('should throw when required FILE_SIZE is missing', () => {
      setupTypeEnv();
      delete process.env[CARDS_ENV_VARS.FILE_SIZE];

      expect(() => extractTypeInput()).toThrow('Missing required environment variable: FILE_SIZE');
    });

    it('should throw when required SHA256 is missing', () => {
      setupTypeEnv();
      delete process.env[CARDS_ENV_VARS.SHA256];

      expect(() => extractTypeInput()).toThrow('Missing required environment variable: SHA256');
    });

    it('should throw when required CONTENT_TYPE is missing', () => {
      setupTypeEnv();
      delete process.env[CARDS_ENV_VARS.CONTENT_TYPE];

      expect(() => extractTypeInput()).toThrow('Missing required environment variable: CONTENT_TYPE');
    });

    it('should throw when FILE_SIZE is not a valid number', () => {
      setupTypeEnv();
      process.env[CARDS_ENV_VARS.FILE_SIZE] = 'invalid-size';

      expect(() => extractTypeInput()).toThrow('Invalid FILE_SIZE: expected number, got "invalid-size"');
    });
  });
});
