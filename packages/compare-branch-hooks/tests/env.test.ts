/**
 * Unit tests for environment variable extraction utilities.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  COMPARE_BRANCH_ENV_VARS,
  extractInput,
  getExecutionWrapperPid,
  getHookIpcSocket,
  getIssueId
} from '../src/env.js';

describe('env', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all relevant env vars before each test
    delete process.env[COMPARE_BRANCH_ENV_VARS.ISSUE_ID];
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
        ISSUE_ID: 'ISSUE_ID',
        EXECUTION_WRAPPER_PID: 'EXECUTION_WRAPPER_PID',
        HOOK_IPC_SOCKET: 'HOOK_IPC_SOCKET'
      });
    });
  });

  describe('getIssueId', () => {
    it('should return issue ID when set', () => {
      process.env[COMPARE_BRANCH_ENV_VARS.ISSUE_ID] = 'issue-123';
      expect(getIssueId()).toBe('issue-123');
    });

    it('should throw when ISSUE_ID is undefined', () => {
      expect(() => getIssueId()).toThrow('Missing required environment variable: ISSUE_ID');
    });

    it('should throw when ISSUE_ID is empty string', () => {
      process.env[COMPARE_BRANCH_ENV_VARS.ISSUE_ID] = '';
      expect(() => getIssueId()).toThrow('Missing required environment variable: ISSUE_ID');
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
      process.env[COMPARE_BRANCH_ENV_VARS.ISSUE_ID] = 'issue-123';
      process.env[COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID] = '12345';
      process.env[COMPARE_BRANCH_ENV_VARS.HOOK_IPC_SOCKET] = '/tmp/socket.sock';
    }

    describe('StartIssue', () => {
      it('should extract base fields for StartIssue hook', () => {
        setupBaseEnv();
        const input = extractInput('StartIssue');

        expect(input).toEqual({
          hookEventName: 'StartIssue',
          issueId: 'issue-123',
          executionWrapperPid: 12345,
          hookIpcSocket: '/tmp/socket.sock'
        });
      });

      it('should throw when required ISSUE_ID is missing', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID] = '12345';
        process.env[COMPARE_BRANCH_ENV_VARS.HOOK_IPC_SOCKET] = '/tmp/socket.sock';

        expect(() => extractInput('StartIssue')).toThrow('Missing required environment variable: ISSUE_ID');
      });

      it('should throw when required EXECUTION_WRAPPER_PID is missing', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.ISSUE_ID] = 'issue-123';
        process.env[COMPARE_BRANCH_ENV_VARS.HOOK_IPC_SOCKET] = '/tmp/socket.sock';

        expect(() => extractInput('StartIssue')).toThrow(
          'Missing required environment variable: EXECUTION_WRAPPER_PID'
        );
      });

      it('should throw when required HOOK_IPC_SOCKET is missing', () => {
        process.env[COMPARE_BRANCH_ENV_VARS.ISSUE_ID] = 'issue-123';
        process.env[COMPARE_BRANCH_ENV_VARS.EXECUTION_WRAPPER_PID] = '12345';

        expect(() => extractInput('StartIssue')).toThrow('Missing required environment variable: HOOK_IPC_SOCKET');
      });
    });

    describe('EndIssue', () => {
      it('should extract base fields for EndIssue hook', () => {
        setupBaseEnv();
        const input = extractInput('EndIssue');

        expect(input).toEqual({
          hookEventName: 'EndIssue',
          issueId: 'issue-123',
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
          issueId: 'issue-123',
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
          issueId: 'issue-123',
          executionWrapperPid: 12345,
          hookIpcSocket: '/tmp/socket.sock'
        });
      });
    });

    describe('Type safety', () => {
      it('should maintain correct types for each hook event', () => {
        setupBaseEnv();

        // Verify that StartIssue input has issueId
        const startIssue = extractInput('StartIssue');
        expect(startIssue.issueId).toBe('issue-123');

        // Verify that EndIssue input has issueId
        const endIssue = extractInput('EndIssue');
        expect(endIssue.issueId).toBe('issue-123');
      });
    });
  });
});
