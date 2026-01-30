/**
 * Unit tests for environment variable extraction utilities.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  COMPARE_BRANCH_ENV_VARS,
  extractInput,
  getCardId,
  getContentType,
  getExecutionWrapperPid,
  getFileName,
  getFilePath,
  getFileSize,
  getHookIpcSocket,
  getMetadata,
  getSha256,
  getTypeName,
  getTypeVersion
} from '../src/env.js';

describe('env', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all relevant env vars before each test
    delete process.env[COMPARE_BRANCH_ENV_VARS.CARD_ID];
    delete process.env[COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID];
    delete process.env[COMPARE_BRANCH_ENV_VARS.HOOK_IPC_SOCKET];
  });

  afterEach(() => {
    // Restore original env vars after each test
    process.env = { ...originalEnv };
  });

  describe('COMPARE_BRANCH_ENV_VARS', () => {
    it('should define all environment variable names', () => {
      expect(COMPARE_BRANCH_ENV_VARS).toEqual({
        CARD_ID: 'CARD_ID',
        EXECUTION_WRAPPER_PID: 'EXECUTION_WRAPPER_PID',
        HOOK_IPC_SOCKET: 'HOOK_IPC_SOCKET',
        TYPE_NAME: 'TYPE_NAME',
        FILE_NAME: 'FILE_NAME',
        FILE_PATH: 'FILE_PATH',
        CONTENT_TYPE: 'CONTENT_TYPE',
        FILE_SIZE: 'FILE_SIZE',
        SHA256: 'SHA256',
        TYPE_VERSION: 'TYPE_VERSION',
        METADATA: 'METADATA'
      });
    });
  });

  describe('getCardId', () => {
    it('should return card ID when set', () => {
      process.env[COMPARE_BRANCH_ENV_VARS.CARD_ID] = 'card-123';
      expect(getCardId()).toBe('card-123');
    });

    it('should throw when CARD_ID is undefined', () => {
      expect(() => getCardId()).toThrow('Missing required environment variable: CARD_ID');
    });

    it('should throw when CARD_ID is empty string', () => {
      process.env[COMPARE_BRANCH_ENV_VARS.CARD_ID] = '';
      expect(() => getCardId()).toThrow('Missing required environment variable: CARD_ID');
    });
  });

  describe('getExecutionWrapperPid', () => {
    it('should return PID as number when set to valid integer', () => {
      process.env[COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID] = '12345';
      expect(getExecutionWrapperPid()).toBe(12345);
    });

    it('should throw when EXECUTION_WRAPPER_PID is undefined', () => {
      expect(() => getExecutionWrapperPid()).toThrow('Missing required environment variable: EXECUTION_WRAPPER_PID');
    });

    it('should throw when EXECUTION_WRAPPER_PID is empty string', () => {
      process.env[COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID] = '';
      expect(() => getExecutionWrapperPid()).toThrow('Missing required environment variable: EXECUTION_WRAPPER_PID');
    });

    it('should throw when EXECUTION_WRAPPER_PID is not a number', () => {
      process.env[COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID] = 'not-a-number';
      expect(() => getExecutionWrapperPid()).toThrow(
        'Invalid EXECUTION_WRAPPER_PID: expected number, got "not-a-number"'
      );
    });

    it('should parse float strings by truncating to integer', () => {
      // Note: parseInt truncates floats - this is standard JavaScript behavior
      process.env[COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID] = '123.45';
      expect(getExecutionWrapperPid()).toBe(123);
    });

    it('should handle zero as valid PID', () => {
      process.env[COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID] = '0';
      expect(getExecutionWrapperPid()).toBe(0);
    });
  });

  describe('getHookIpcSocket', () => {
    it('should return socket path when set', () => {
      process.env[COMPARE_BRANCH_ENV_VARS.HOOK_IPC_SOCKET] = '/tmp/socket.sock';
      expect(getHookIpcSocket()).toBe('/tmp/socket.sock');
    });

    it('should throw when HOOK_IPC_SOCKET is undefined', () => {
      expect(() => getHookIpcSocket()).toThrow('Missing required environment variable: HOOK_IPC_SOCKET');
    });

    it('should throw when HOOK_IPC_SOCKET is empty string', () => {
      process.env[COMPARE_BRANCH_ENV_VARS.HOOK_IPC_SOCKET] = '';
      expect(() => getHookIpcSocket()).toThrow('Missing required environment variable: HOOK_IPC_SOCKET');
    });
  });

  describe('extractInput', () => {
    // Helper to set up base environment variables required by all hooks
    function setupBaseEnv() {
      process.env[COMPARE_BRANCH_ENV_VARS.CARD_ID] = 'card-123';
      process.env[COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID] = '12345';
      process.env[COMPARE_BRANCH_ENV_VARS.HOOK_IPC_SOCKET] = '/tmp/socket.sock';
    }

    describe('StartCard', () => {
      it('should extract base fields for StartCard hook', () => {
        setupBaseEnv();
        const input = extractInput('StartCard');

        expect(input).toEqual({
          hookEventName: 'StartCard',
          cardId: 'card-123',
          executionWrapperPid: 12345,
          hookIpcSocket: '/tmp/socket.sock'
        });
      });

      it('should throw when required CARD_ID is missing', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID] = '12345';
        process.env[COMPARE_BRANCH_ENV_VARS.HOOK_IPC_SOCKET] = '/tmp/socket.sock';

        expect(() => extractInput('StartCard')).toThrow('Missing required environment variable: CARD_ID');
      });

      it('should throw when required EXECUTION_WRAPPER_PID is missing', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.CARD_ID] = 'card-123';
        process.env[COMPARE_BRANCH_ENV_VARS.HOOK_IPC_SOCKET] = '/tmp/socket.sock';

        expect(() => extractInput('StartCard')).toThrow('Missing required environment variable: EXECUTION_WRAPPER_PID');
      });

      it('should throw when required HOOK_IPC_SOCKET is missing', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.CARD_ID] = 'card-123';
        process.env[COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID] = '12345';

        expect(() => extractInput('StartCard')).toThrow('Missing required environment variable: HOOK_IPC_SOCKET');
      });
    });

    describe('EndCard', () => {
      it('should extract base fields for EndCard hook', () => {
        setupBaseEnv();
        const input = extractInput('EndCard');

        expect(input).toEqual({
          hookEventName: 'EndCard',
          cardId: 'card-123',
          executionWrapperPid: 12345,
          hookIpcSocket: '/tmp/socket.sock'
        });
      });
    });

    describe('StartInterview', () => {
      it('should extract base fields for StartInterview hook', () => {
        setupBaseEnv();
        const input = extractInput('StartInterview');

        expect(input).toEqual({
          hookEventName: 'StartInterview',
          cardId: 'card-123',
          executionWrapperPid: 12345,
          hookIpcSocket: '/tmp/socket.sock'
        });
      });
    });

    describe('EndInterview', () => {
      it('should extract base fields for EndInterview hook', () => {
        setupBaseEnv();
        const input = extractInput('EndInterview');

        expect(input).toEqual({
          hookEventName: 'EndInterview',
          cardId: 'card-123',
          executionWrapperPid: 12345,
          hookIpcSocket: '/tmp/socket.sock'
        });
      });
    });

    describe('TypedFileCreated', () => {
      it('should extract all fields for TypedFileCreated hook', () => {
        setupBaseEnv();
        process.env[COMPARE_BRANCH_ENV_VARS.TYPE_NAME] = 'my-type';
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_NAME] = 'document.pdf';
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_PATH] = '/path/to/document.pdf';
        process.env[COMPARE_BRANCH_ENV_VARS.CONTENT_TYPE] = 'application/pdf';
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_SIZE] = '1024';
        process.env[COMPARE_BRANCH_ENV_VARS.SHA256] = 'abc123def456';
        process.env[COMPARE_BRANCH_ENV_VARS.TYPE_VERSION] = '1.0.0';
        process.env[COMPARE_BRANCH_ENV_VARS.METADATA] = '{"key":"value"}';

        const input = extractInput('TypedFileCreated');

        expect(input).toEqual({
          hookEventName: 'TypedFileCreated',
          cardId: 'card-123',
          executionWrapperPid: 12345,
          hookIpcSocket: '/tmp/socket.sock',
          typeName: 'my-type',
          fileName: 'document.pdf',
          filePath: '/path/to/document.pdf',
          contentType: 'application/pdf',
          size: 1024,
          sha256: 'abc123def456',
          typeVersion: '1.0.0',
          metadata: { key: 'value' }
        });
      });

      it('should extract fields without optional metadata', () => {
        setupBaseEnv();
        process.env[COMPARE_BRANCH_ENV_VARS.TYPE_NAME] = 'my-type';
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_NAME] = 'document.pdf';
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_PATH] = '/path/to/document.pdf';
        process.env[COMPARE_BRANCH_ENV_VARS.CONTENT_TYPE] = 'application/pdf';
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_SIZE] = '1024';
        process.env[COMPARE_BRANCH_ENV_VARS.SHA256] = 'abc123def456';
        process.env[COMPARE_BRANCH_ENV_VARS.TYPE_VERSION] = '1.0.0';

        const input = extractInput('TypedFileCreated');

        expect(input.typeName).toBe('my-type');
        expect(input.fileName).toBe('document.pdf');
        expect(input.metadata).toBeUndefined();
      });
    });

    describe('TypedFileUpdated', () => {
      it('should extract all fields for TypedFileUpdated hook', () => {
        setupBaseEnv();
        process.env[COMPARE_BRANCH_ENV_VARS.TYPE_NAME] = 'my-type';
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_NAME] = 'document.pdf';
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_PATH] = '/path/to/document.pdf';
        process.env[COMPARE_BRANCH_ENV_VARS.CONTENT_TYPE] = 'application/pdf';
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_SIZE] = '2048';
        process.env[COMPARE_BRANCH_ENV_VARS.SHA256] = 'xyz789uvw012';
        process.env[COMPARE_BRANCH_ENV_VARS.TYPE_VERSION] = '1.1.0';

        const input = extractInput('TypedFileUpdated');

        expect(input.hookEventName).toBe('TypedFileUpdated');
        expect(input.typeName).toBe('my-type');
        expect(input.size).toBe(2048);
      });
    });

    describe('TypedFileDeleted', () => {
      it('should extract all fields for TypedFileDeleted hook', () => {
        setupBaseEnv();
        process.env[COMPARE_BRANCH_ENV_VARS.TYPE_NAME] = 'my-type';
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_NAME] = 'document.pdf';
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_PATH] = '/path/to/document.pdf';
        process.env[COMPARE_BRANCH_ENV_VARS.CONTENT_TYPE] = 'application/pdf';
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_SIZE] = '1024';
        process.env[COMPARE_BRANCH_ENV_VARS.SHA256] = 'abc123def456';
        process.env[COMPARE_BRANCH_ENV_VARS.TYPE_VERSION] = '1.0.0';

        const input = extractInput('TypedFileDeleted');

        expect(input.hookEventName).toBe('TypedFileDeleted');
        expect(input.typeName).toBe('my-type');
      });
    });

    describe('Type safety', () => {
      it('should maintain correct types for each hook event', () => {
        setupBaseEnv();

        // Verify that StartCard input has cardId
        const startCard = extractInput('StartCard');
        expect(startCard.cardId).toBe('card-123');

        // Verify that EndCard input has cardId
        const endCard = extractInput('EndCard');
        expect(endCard.cardId).toBe('card-123');
      });
    });
  });

  describe('Typed file getters', () => {
    beforeEach(() => {
      // Clear all typed file env vars before each test
      delete process.env[COMPARE_BRANCH_ENV_VARS.TYPE_NAME];
      delete process.env[COMPARE_BRANCH_ENV_VARS.FILE_NAME];
      delete process.env[COMPARE_BRANCH_ENV_VARS.FILE_PATH];
      delete process.env[COMPARE_BRANCH_ENV_VARS.CONTENT_TYPE];
      delete process.env[COMPARE_BRANCH_ENV_VARS.FILE_SIZE];
      delete process.env[COMPARE_BRANCH_ENV_VARS.SHA256];
      delete process.env[COMPARE_BRANCH_ENV_VARS.TYPE_VERSION];
      delete process.env[COMPARE_BRANCH_ENV_VARS.METADATA];
    });

    describe('getTypeName', () => {
      it('should return type name when set', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.TYPE_NAME] = 'my-type';
        expect(getTypeName()).toBe('my-type');
      });

      it('should throw when TYPE_NAME is undefined', () => {
        expect(() => getTypeName()).toThrow('Missing required environment variable: TYPE_NAME');
      });
    });

    describe('getFileName', () => {
      it('should return file name when set', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_NAME] = 'document.pdf';
        expect(getFileName()).toBe('document.pdf');
      });

      it('should throw when FILE_NAME is undefined', () => {
        expect(() => getFileName()).toThrow('Missing required environment variable: FILE_NAME');
      });
    });

    describe('getFilePath', () => {
      it('should return file path when set', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_PATH] = '/path/to/file';
        expect(getFilePath()).toBe('/path/to/file');
      });

      it('should throw when FILE_PATH is undefined', () => {
        expect(() => getFilePath()).toThrow('Missing required environment variable: FILE_PATH');
      });
    });

    describe('getContentType', () => {
      it('should return content type when set', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.CONTENT_TYPE] = 'application/pdf';
        expect(getContentType()).toBe('application/pdf');
      });

      it('should throw when CONTENT_TYPE is undefined', () => {
        expect(() => getContentType()).toThrow('Missing required environment variable: CONTENT_TYPE');
      });
    });

    describe('getFileSize', () => {
      it('should return file size as number when set to valid integer', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_SIZE] = '1024';
        expect(getFileSize()).toBe(1024);
      });

      it('should throw when FILE_SIZE is undefined', () => {
        expect(() => getFileSize()).toThrow('Missing required environment variable: FILE_SIZE');
      });

      it('should throw when FILE_SIZE is not a number', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.FILE_SIZE] = 'not-a-number';
        expect(() => getFileSize()).toThrow('Invalid FILE_SIZE: expected number, got "not-a-number"');
      });
    });

    describe('getSha256', () => {
      it('should return sha256 when set', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.SHA256] = 'abc123def456';
        expect(getSha256()).toBe('abc123def456');
      });

      it('should throw when SHA256 is undefined', () => {
        expect(() => getSha256()).toThrow('Missing required environment variable: SHA256');
      });
    });

    describe('getTypeVersion', () => {
      it('should return type version when set', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.TYPE_VERSION] = '1.0.0';
        expect(getTypeVersion()).toBe('1.0.0');
      });

      it('should throw when TYPE_VERSION is undefined', () => {
        expect(() => getTypeVersion()).toThrow('Missing required environment variable: TYPE_VERSION');
      });
    });

    describe('getMetadata', () => {
      it('should return parsed metadata when set to valid JSON', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.METADATA] = '{"key":"value","count":42}';
        expect(getMetadata()).toEqual({ key: 'value', count: 42 });
      });

      it('should return undefined when METADATA is not set', () => {
        expect(getMetadata()).toBeUndefined();
      });

      it('should return undefined when METADATA is empty string', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.METADATA] = '';
        expect(getMetadata()).toBeUndefined();
      });

      it('should throw when METADATA is set to invalid JSON', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.METADATA] = 'not-valid-json';
        expect(() => getMetadata()).toThrow('Invalid METADATA: expected valid JSON');
      });
    });
  });
});
