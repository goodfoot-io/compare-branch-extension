import { describe, expect, it } from 'vitest';
import type { DomainEvent, IpcMessage, ValidationErrorCode } from '../../src/protocol/index.js';
import { ATTACHMENT_ID_PATTERN, TAG_PATTERN } from '../../src/protocol/index.js';

/**
 * Exercises protocol behavior in the protocol area through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve expected state
 * transitions and output.
 *
 * @summary Tests protocol behavior in protocol
 */

describe('Input Constraints', () => {
  it('TAG_PATTERN matches lowercase alphanumeric with hyphens', () => {
    expect(TAG_PATTERN.test('valid-tag')).toBe(true);
    expect(TAG_PATTERN.test('tag123')).toBe(true);
    expect(TAG_PATTERN.test('a')).toBe(true);
    expect(TAG_PATTERN.test('Invalid')).toBe(false);
    expect(TAG_PATTERN.test('has_underscore')).toBe(false);
    expect(TAG_PATTERN.test('has space')).toBe(false);
    expect(TAG_PATTERN.test('')).toBe(false);
  });

  it('ATTACHMENT_ID_PATTERN matches valid attachment IDs', () => {
    const validAttachments = [
      'att-550e8400-e29b-41d4-a716-446655440000_document.pdf',
      'att-123e4567-e89b-12d3-a456-426614174000_image.png',
      'att-00000000-0000-0000-0000-000000000000_file.txt',
      'att-ffffffff-ffff-ffff-ffff-ffffffffffff_archive.zip'
    ];
    validAttachments.forEach((id) => {
      expect(ATTACHMENT_ID_PATTERN.test(id)).toBe(true);
    });
  });

  it('ATTACHMENT_ID_PATTERN matches attachment IDs within text', () => {
    const text = 'Check the att-550e8400-e29b-41d4-a716-446655440000_document.pdf file for details';
    expect(ATTACHMENT_ID_PATTERN.test(text)).toBe(true);
  });

  it('ATTACHMENT_ID_PATTERN rejects invalid attachment IDs', () => {
    const invalidAttachments = [
      'att-550e8400-e29b-41d4-a716_document.pdf', // UUID too short
      'att-550e8400-e29b-41d4-a716-446655440000', // no filename
      '550e8400-e29b-41d4-a716-446655440000_document.pdf', // missing att- prefix
      'att-ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ_file.txt', // invalid hex characters
      'att-550e8400e29b41d4a716446655440000_file.txt' // UUID without hyphens
    ];
    invalidAttachments.forEach((id) => {
      expect(ATTACHMENT_ID_PATTERN.test(id)).toBe(false);
    });
  });
});

describe('DomainEvent discriminated union', () => {
  it('should narrow types correctly in switch/case for CardsMetadataEvent', () => {
    const event: DomainEvent = {
      type: 'cards:metadata',
      cardId: 'card-1',
      repositoryId: 'main',
      title: 'Test',
      status: 'todo',
      tags: [],
      isPinned: false,
      order: 0,
      gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      isMerged: null,
      hasStaleMerge: true,
      hasUnread: false,
      relations: [],
      incomingRelations: []
    };

    switch (event.type) {
      case 'cards:metadata':
        expect(event.title).toBe('Test');
        expect(event.cardId).toBe('card-1');
        break;
      default:
        throw new Error('Unexpected event type');
    }
  });

  it('should narrow types correctly in switch/case for CommentCreatedEvent', () => {
    const event: DomainEvent = {
      type: 'comment:created',
      cardId: 'card-5',
      commentId: 'comment-1'
    };

    switch (event.type) {
      case 'comment:created':
        expect(event.commentId).toBe('comment-1');
        break;
      default:
        throw new Error('Unexpected event type');
    }
  });

  it('accepts representative event types in the union', () => {
    // Compile-time check: selected event types are assignable to DomainEvent
    const events: DomainEvent[] = [
      {
        type: 'cards:metadata',
        cardId: 'id',
        repositoryId: 'main',
        title: 'T',
        status: 'todo',
        tags: [],
        isPinned: false,
        order: 0,
        gates: { planRequired: false, planApproved: false, mergeRequestRequired: false, mergeApproved: false },
        createdAt: '',
        updatedAt: '',
        isMerged: null,
        hasStaleMerge: true,
        hasUnread: false,
        relations: [],
        incomingRelations: []
      },
      { type: 'comment:created', cardId: 'id', commentId: 'cid' },
      {
        type: 'stream:resumed',
        cardId: 'id',
        meta: { filename: 'f', streamType: 'jsonl', status: 'active', lineCount: 0, createdAt: '2024-01-01' },
        previousStatus: 'completed',
        previousLineCount: 5
      }
    ];
    expect(events).toHaveLength(3);
  });
});

describe('IpcMessage discriminated union', () => {
  it('should narrow types correctly in switch/case for SessionStartedMessage', () => {
    const message: IpcMessage = {
      type: 'session_started',
      nonce: 'nonce-1',
      sessionId: 'session-123'
    };

    switch (message.type) {
      case 'session_started':
        expect(message.sessionId).toBe('session-123');
        expect(message.nonce).toBe('nonce-1');
        break;
      default:
        throw new Error('Unexpected message type');
    }
  });

  it('should have only 1 message type in the union', () => {
    const messages: IpcMessage[] = [{ type: 'session_started', nonce: 'n1', sessionId: 'sid' }];
    expect(messages).toHaveLength(1);
  });
});

describe('ValidationErrorCode', () => {
  it('should accept all defined error codes', () => {
    const codes: ValidationErrorCode[] = [
      'missing_field',
      'invalid_type',
      'invalid_status',
      'invalid_format',
      'length_exceeded',
      'pattern_mismatch',
      'cyclic_dependency',
      'missing_reference',
      'duplicate_id',
      'invalid_gate',
      'invalid_gate_logic',
      'malformed_json',
      'metadata_missing',
      'encoding_error',
      'file_not_found',
      'attachment_not_found',
      'invalid_attachment_id',
      'blocked_without_dependencies',
      'warning_completed_without_output',
      'warning_active_without_actions',
      'unknown'
    ];
    expect(codes).toHaveLength(21);
  });

  it('unknown fallback can be used for gradual migration', () => {
    // Simulates a scenario where a legacy error code needs to be mapped
    function mapLegacyCode(legacyCode: string): ValidationErrorCode {
      switch (legacyCode) {
        case 'MISSING':
          return 'missing_field';
        case 'BAD_TYPE':
          return 'invalid_type';
        default:
          return 'unknown';
      }
    }

    expect(mapLegacyCode('MISSING')).toBe('missing_field');
    expect(mapLegacyCode('BAD_TYPE')).toBe('invalid_type');
    expect(mapLegacyCode('LEGACY_UNKNOWN_CODE')).toBe('unknown');
  });

  it('can be used in exhaustive switch statements', () => {
    function getErrorMessage(code: ValidationErrorCode): string {
      switch (code) {
        case 'missing_field':
          return 'A required field is missing';
        case 'invalid_type':
          return 'The field has an invalid type';
        case 'invalid_status':
          return 'The status value is not valid';
        case 'invalid_format':
          return 'The format is invalid';
        case 'length_exceeded':
          return 'The value exceeds maximum length';
        case 'pattern_mismatch':
          return 'The value does not match the expected pattern';
        case 'cyclic_dependency':
          return 'A cyclic dependency was detected';
        case 'missing_reference':
          return 'A referenced entity does not exist';
        case 'duplicate_id':
          return 'The ID is already in use';
        case 'invalid_gate':
          return 'The gate configuration is invalid';
        case 'invalid_gate_logic':
          return 'The gate logic is invalid';
        case 'malformed_json':
          return 'The JSON is malformed';
        case 'metadata_missing':
          return 'The metadata is missing';
        case 'encoding_error':
          return 'An encoding error occurred';
        case 'file_not_found':
          return 'The file was not found';
        case 'attachment_not_found':
          return 'The referenced attachment file does not exist';
        case 'invalid_attachment_id':
          return 'The attachment ID does not match the expected pattern';
        case 'blocked_without_dependencies':
          return 'A blocked task has no dependencies';
        case 'warning_completed_without_output':
          return 'A completed task has no output';
        case 'warning_active_without_actions':
          return 'An active task has no actions';
        case 'invalid_embedded_syntax':
          return 'The embedded content has invalid syntax';
        case 'unknown':
          return 'An unknown error occurred';
      }
    }

    expect(getErrorMessage('missing_field')).toBe('A required field is missing');
    expect(getErrorMessage('cyclic_dependency')).toBe('A cyclic dependency was detected');
    expect(getErrorMessage('attachment_not_found')).toBe('The referenced attachment file does not exist');
    expect(getErrorMessage('invalid_attachment_id')).toBe('The attachment ID does not match the expected pattern');
    expect(getErrorMessage('unknown')).toBe('An unknown error occurred');
  });
});
