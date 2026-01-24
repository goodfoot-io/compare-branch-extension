/**
 * Tests for hook factory functions.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  endInterviewHook,
  endIssueHook,
  type HookContext,
  type HookFunction,
  startInterviewHook,
  startIssueHook,
  typedFileCreatedHook,
  typedFileDeletedHook,
  typedFileUpdatedHook
} from '../src/hooks.js';
import { Logger } from '../src/logger.js';
import type { StartIssueInput, TypedFileCreatedInput } from '../src/types.js';

// Create a mock context
const createMockContext = (): HookContext => ({
  logger: new Logger()
});

describe('Hook Factories', () => {
  describe('startIssueHook', () => {
    it('creates a hook function with correct hookEventName', () => {
      const hook = startIssueHook({}, () => {});
      expect(hook.hookEventName).toBe('StartIssue');
    });

    it('attaches timeout from config', () => {
      const hook = startIssueHook({ timeout: 5000 }, () => {});
      expect(hook.timeout).toBe(5000);
    });

    it('has undefined timeout when not configured', () => {
      const hook = startIssueHook({}, () => {});
      expect(hook.timeout).toBeUndefined();
    });

    it('calls handler with input and context', async () => {
      const handler = vi.fn();
      const hook = startIssueHook({}, handler);
      const input: StartIssueInput = {
        issueId: 'issue-1',
        executionWrapperPid: 123,
        hookIpcSocket: '/tmp/socket'
      };
      const context = createMockContext();

      await hook(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
    });

    it('awaits async handlers', async () => {
      let completed = false;
      const hook = startIssueHook({}, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        completed = true;
      });

      const input: StartIssueInput = {
        issueId: 'issue-1',
        executionWrapperPid: 123,
        hookIpcSocket: '/tmp/socket'
      };

      await hook(input, createMockContext());
      expect(completed).toBe(true);
    });
  });

  describe('endIssueHook', () => {
    it('creates a hook function with correct hookEventName', () => {
      const hook = endIssueHook({}, () => {});
      expect(hook.hookEventName).toBe('EndIssue');
    });
  });

  describe('startInterviewHook', () => {
    it('creates a hook function with correct hookEventName', () => {
      const hook = startInterviewHook({}, () => {});
      expect(hook.hookEventName).toBe('StartInterview');
    });
  });

  describe('endInterviewHook', () => {
    it('creates a hook function with correct hookEventName', () => {
      const hook = endInterviewHook({}, () => {});
      expect(hook.hookEventName).toBe('EndInterview');
    });
  });

  describe('typedFileCreatedHook', () => {
    it('creates a hook function with correct hookEventName', () => {
      const hook = typedFileCreatedHook({}, () => {});
      expect(hook.hookEventName).toBe('TypedFileCreated');
    });

    it('attaches timeout from config', () => {
      const hook = typedFileCreatedHook({ timeout: 5000 }, () => {});
      expect(hook.timeout).toBe(5000);
    });

    it('has undefined timeout when not configured', () => {
      const hook = typedFileCreatedHook({}, () => {});
      expect(hook.timeout).toBeUndefined();
    });

    it('calls handler with input and context', async () => {
      const handler = vi.fn();
      const hook = typedFileCreatedHook({}, handler);
      const input: TypedFileCreatedInput = {
        issueId: 'issue-1',
        executionWrapperPid: 123,
        hookIpcSocket: '/tmp/socket',
        typeName: 'schema',
        fileName: 'user.json',
        filePath: '/path/to/user.json',
        contentType: 'application/json',
        size: 1024,
        sha256: 'abc123',
        typeVersion: '1.0.0'
      };
      const context = createMockContext();

      await hook(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
    });
  });

  describe('typedFileUpdatedHook', () => {
    it('creates a hook function with correct hookEventName', () => {
      const hook = typedFileUpdatedHook({}, () => {});
      expect(hook.hookEventName).toBe('TypedFileUpdated');
    });

    it('attaches timeout from config', () => {
      const hook = typedFileUpdatedHook({ timeout: 5000 }, () => {});
      expect(hook.timeout).toBe(5000);
    });

    it('has undefined timeout when not configured', () => {
      const hook = typedFileUpdatedHook({}, () => {});
      expect(hook.timeout).toBeUndefined();
    });

    it('calls handler with input and context', async () => {
      const handler = vi.fn();
      const hook = typedFileUpdatedHook({}, handler);
      const input: TypedFileCreatedInput = {
        issueId: 'issue-1',
        executionWrapperPid: 123,
        hookIpcSocket: '/tmp/socket',
        typeName: 'schema',
        fileName: 'user.json',
        filePath: '/path/to/user.json',
        contentType: 'application/json',
        size: 1024,
        sha256: 'abc123',
        typeVersion: '1.0.0'
      };
      const context = createMockContext();

      await hook(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
    });
  });

  describe('typedFileDeletedHook', () => {
    it('creates a hook function with correct hookEventName', () => {
      const hook = typedFileDeletedHook({}, () => {});
      expect(hook.hookEventName).toBe('TypedFileDeleted');
    });

    it('attaches timeout from config', () => {
      const hook = typedFileDeletedHook({ timeout: 5000 }, () => {});
      expect(hook.timeout).toBe(5000);
    });

    it('has undefined timeout when not configured', () => {
      const hook = typedFileDeletedHook({}, () => {});
      expect(hook.timeout).toBeUndefined();
    });

    it('calls handler with input and context', async () => {
      const handler = vi.fn();
      const hook = typedFileDeletedHook({}, handler);
      const input: TypedFileCreatedInput = {
        issueId: 'issue-1',
        executionWrapperPid: 123,
        hookIpcSocket: '/tmp/socket',
        typeName: 'schema',
        fileName: 'user.json',
        filePath: '/path/to/user.json',
        contentType: 'application/json',
        size: 1024,
        sha256: 'abc123',
        typeVersion: '1.0.0'
      };
      const context = createMockContext();

      await hook(input, context);

      expect(handler).toHaveBeenCalledWith(input, context);
    });
  });

  describe('HookFunction type', () => {
    it('is callable', async () => {
      const hook: HookFunction<StartIssueInput> = startIssueHook({}, () => {});
      expect(typeof hook).toBe('function');
    });

    it('has required metadata properties', () => {
      const hook = startIssueHook({ timeout: 10000 }, () => {});
      expect(hook).toHaveProperty('hookEventName');
      expect(hook).toHaveProperty('timeout');
    });
  });
});
