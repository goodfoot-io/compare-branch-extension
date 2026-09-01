/**
 * Tests for the Antigravity input parsing and validation contract.
 *
 * @summary Tests for the Antigravity hook input contract
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  canonicalConversationDbPath,
  InputValidationError,
  isCardsActionSession,
  parseCommonInput,
  parseInvocationInput,
  resolveCardsSessionId
} from '../../../src/antigravity/internal/inputs.js';
import { withoutEnv } from '../helpers.js';

const validCommon = {
  conversationId: 'conv-453',
  workspacePaths: ['/workspace'],
  transcriptPath: '/transcripts/conv-453.jsonl',
  artifactDirectoryPath: '/artifacts/conv-453',
  modelName: 'gemini-3-pro'
};

const validInvocation = {
  ...validCommon,
  invocationNum: 1,
  initialNumSteps: 3
};

afterEach(() => {
  delete process.env['CARD_ID'];
  delete process.env['ANTIGRAVITY_SESSION_ID'];
});

describe('parseCommonInput', () => {
  it('accepts the pinned common fields and tolerates unknown extras', () => {
    const parsed = parseCommonInput({ ...validCommon, hostExtra: { nested: true } });
    expect(parsed).toEqual(validCommon);
  });

  it('rejects non-object documents', () => {
    for (const raw of [null, undefined, 'text', 42, [], true]) {
      expect(() => parseCommonInput(raw)).toThrow(InputValidationError);
      try {
        parseCommonInput(raw);
      } catch (error) {
        expect((error as InputValidationError).field).toBe('input');
      }
    }
  });

  const invalidCommonCases: Array<[string, unknown]> = [
    ['conversationId missing', { ...validCommon, conversationId: undefined }],
    ['conversationId empty', { ...validCommon, conversationId: '' }],
    ['conversationId mistyped', { ...validCommon, conversationId: 7 }],
    ['workspacePaths missing', { ...validCommon, workspacePaths: undefined }],
    ['workspacePaths empty array', { ...validCommon, workspacePaths: [] }],
    ['workspacePaths has empty entry', { ...validCommon, workspacePaths: ['/a', ''] }],
    ['workspacePaths mistyped entry', { ...validCommon, workspacePaths: [7] }],
    ['workspacePaths not an array', { ...validCommon, workspacePaths: '/a' }],
    ['transcriptPath missing', { ...validCommon, transcriptPath: undefined }],
    ['transcriptPath empty', { ...validCommon, transcriptPath: '' }],
    ['artifactDirectoryPath missing', { ...validCommon, artifactDirectoryPath: undefined }],
    ['artifactDirectoryPath empty', { ...validCommon, artifactDirectoryPath: '' }],
    ['modelName missing', { ...validCommon, modelName: undefined }],
    ['modelName empty', { ...validCommon, modelName: '' }]
  ];

  for (const [label, raw] of invalidCommonCases) {
    it(`fails closed on ${label}`, () => {
      expect(() => parseCommonInput(raw)).toThrow(InputValidationError);
    });
  }

  it('names the offending field on the error', () => {
    try {
      parseCommonInput({ ...validCommon, modelName: '' });
      expect.unreachable();
    } catch (error) {
      expect((error as InputValidationError).field).toBe('modelName');
    }
  });
});

describe('parseInvocationInput', () => {
  it('accepts the common fields plus the invocation fields', () => {
    expect(parseInvocationInput(validInvocation)).toEqual(validInvocation);
  });

  const invalidInvocationCases: Array<[string, unknown, string]> = [
    ['invocationNum zero', { ...validInvocation, invocationNum: 0 }, 'invocationNum'],
    ['invocationNum negative', { ...validInvocation, invocationNum: -1 }, 'invocationNum'],
    ['invocationNum fractional', { ...validInvocation, invocationNum: 1.5 }, 'invocationNum'],
    ['invocationNum mistyped', { ...validInvocation, invocationNum: '1' }, 'invocationNum'],
    ['initialNumSteps negative', { ...validInvocation, initialNumSteps: -1 }, 'initialNumSteps'],
    ['initialNumSteps fractional', { ...validInvocation, initialNumSteps: 0.5 }, 'initialNumSteps'],
    ['initialNumSteps missing', { ...validInvocation, initialNumSteps: undefined }, 'initialNumSteps']
  ];

  for (const [label, raw, field] of invalidInvocationCases) {
    it(`fails closed on ${label}`, () => {
      try {
        parseInvocationInput(raw);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(InputValidationError);
        expect((error as InputValidationError).field).toBe(field);
      }
    });
  }

  it('accepts initialNumSteps zero', () => {
    expect(parseInvocationInput({ ...validInvocation, initialNumSteps: 0 })).toEqual({
      ...validInvocation,
      initialNumSteps: 0
    });
  });
});

describe('canonicalConversationDbPath', () => {
  it('computes the exact pinned DB path shape for a sample conversation id', () => {
    expect(canonicalConversationDbPath('conv-453', '/home/tester')).toBe(
      '/home/tester/.gemini/antigravity-cli/conversations/conv-453.db'
    );
  });

  it('derives the conversation id from the DB basename round-trip', () => {
    const path = canonicalConversationDbPath('cascade-abc123', '/home/tester');
    expect(path.split('/').pop()).toBe('cascade-abc123.db');
  });

  it('defaults the home to the real user home', () => {
    expect(canonicalConversationDbPath('conv-453')).toBe(
      join(homedir(), '.gemini', 'antigravity-cli', 'conversations', 'conv-453.db')
    );
  });
});

describe('session identity environment', () => {
  it('detects a Cards action session by CARD_ID', () => {
    const restore = withoutEnv('CARD_ID');
    try {
      process.env['CARD_ID'] = 'main-453';
      expect(isCardsActionSession()).toBe(true);
    } finally {
      restore();
    }
  });

  it('treats a session without CARD_ID as non-action', () => {
    const restore = withoutEnv('CARD_ID');
    try {
      expect(isCardsActionSession()).toBe(false);
    } finally {
      restore();
    }
  });

  it('resolves the launcher-exported session id', () => {
    const restore = withoutEnv('ANTIGRAVITY_SESSION_ID');
    try {
      process.env['ANTIGRAVITY_SESSION_ID'] = 'session-453';
      expect(resolveCardsSessionId()).toBe('session-453');
    } finally {
      restore();
    }
  });

  it('treats a blank session id as absent', () => {
    const restore = withoutEnv('ANTIGRAVITY_SESSION_ID');
    try {
      process.env['ANTIGRAVITY_SESSION_ID'] = '   ';
      expect(resolveCardsSessionId()).toBeNull();
    } finally {
      restore();
    }
  });
});
