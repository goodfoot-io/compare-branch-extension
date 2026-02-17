import { describe, expect, it } from 'vitest';
import type {
  DomainEvent,
  TimelineCommentAddedEvent,
  TimelineCommentRemovedEvent,
  TimelineCommentUpdatedEvent,
  TimelineCommitAddedEvent,
  TimelineCommitRemovedEvent,
  TimelineTypedFileAddedEvent,
  TimelineTypedFileRemovedEvent,
  TimelineTypedFileUpdatedEvent
} from '../../../src/protocol/types/events.js';

/**
 * Exercises timeline events behavior in the types area through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve expected state
 * transitions and output.
 *
 * @summary Tests timeline events behavior in types
 */

describe('timeline event types', () => {
  describe('TimelineCommentAddedEvent', () => {
    it('should have correct properties', () => {
      const event: TimelineCommentAddedEvent = {
        type: 'timeline:comment:added',
        cardId: 'card-1',
        item: {
          type: 'comment',
          id: 'comment-1',
          author: 'user@example.com',
          content: 'Test comment',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      };

      expect(event.type).toBe('timeline:comment:added');
      expect(event.cardId).toBe('card-1');
      expect(event.item.type).toBe('comment');
      expect(event.item.id).toBe('comment-1');
    });
  });

  describe('TimelineCommentUpdatedEvent', () => {
    it('should have correct properties', () => {
      const event: TimelineCommentUpdatedEvent = {
        type: 'timeline:comment:updated',
        cardId: 'card-1',
        item: {
          type: 'comment',
          id: 'comment-1',
          author: 'user@example.com',
          content: 'Updated comment',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z'
        }
      };

      expect(event.type).toBe('timeline:comment:updated');
      expect(event.cardId).toBe('card-1');
      expect(event.item.content).toBe('Updated comment');
    });
  });

  describe('TimelineCommentRemovedEvent', () => {
    it('should have correct properties', () => {
      const event: TimelineCommentRemovedEvent = {
        type: 'timeline:comment:removed',
        cardId: 'card-1',
        commentId: 'comment-1'
      };

      expect(event.type).toBe('timeline:comment:removed');
      expect(event.cardId).toBe('card-1');
      expect(event.commentId).toBe('comment-1');
    });
  });

  describe('TimelineTypedFileAddedEvent', () => {
    it('should have correct properties', () => {
      const event: TimelineTypedFileAddedEvent = {
        type: 'timeline:typedFile:added',
        cardId: 'card-1',
        typeName: 'note',
        item: {
          type: 'note',
          id: 'note-1',
          fileName: 'note-1.md',
          content: 'Note content',
          createdAt: '2024-01-01T00:00:00Z'
        }
      };

      expect(event.type).toBe('timeline:typedFile:added');
      expect(event.cardId).toBe('card-1');
      expect(event.typeName).toBe('note');
      expect(event.item.type).toBe('note');
      expect(event.item.id).toBe('note-1');
    });
  });

  describe('TimelineTypedFileUpdatedEvent', () => {
    it('should have correct properties', () => {
      const event: TimelineTypedFileUpdatedEvent = {
        type: 'timeline:typedFile:updated',
        cardId: 'card-1',
        typeName: 'adaptive-card',
        item: {
          type: 'adaptive-card',
          id: 'ac-1',
          fileName: 'ac-1.json',
          content: { summary: 'Updated card' },
          createdAt: '2024-01-01T00:00:00Z'
        }
      };

      expect(event.type).toBe('timeline:typedFile:updated');
      expect(event.cardId).toBe('card-1');
      expect(event.typeName).toBe('adaptive-card');
    });
  });

  describe('TimelineTypedFileRemovedEvent', () => {
    it('should have correct properties', () => {
      const event: TimelineTypedFileRemovedEvent = {
        type: 'timeline:typedFile:removed',
        cardId: 'card-1',
        typeName: 'note',
        fileName: 'note-1.md',
        itemId: 'note-1'
      };

      expect(event.type).toBe('timeline:typedFile:removed');
      expect(event.cardId).toBe('card-1');
      expect(event.typeName).toBe('note');
      expect(event.fileName).toBe('note-1.md');
      expect(event.itemId).toBe('note-1');
    });
  });

  describe('TimelineCommitAddedEvent', () => {
    it('should have correct properties', () => {
      const event: TimelineCommitAddedEvent = {
        type: 'timeline:commit:added',
        cardId: 'card-1',
        item: {
          type: 'commit',
          sha: 'abc123',
          createdAt: '2024-01-01T00:00:00Z',
          message: 'fix: bug fix',
          author: {
            name: 'Test User',
            email: 'user@example.com',
            date: '2024-01-01T00:00:00Z'
          },
          stats: {
            additions: 10,
            deletions: 5,
            filesChanged: [
              {
                path: 'src/file.ts',
                additions: 10,
                deletions: 5
              }
            ]
          }
        }
      };

      expect(event.type).toBe('timeline:commit:added');
      expect(event.cardId).toBe('card-1');
      expect(event.item.type).toBe('commit');
      expect(event.item.sha).toBe('abc123');
      expect(event.item.message).toBe('fix: bug fix');
    });

    it('should allow minimal commit item', () => {
      const event: TimelineCommitAddedEvent = {
        type: 'timeline:commit:added',
        cardId: 'card-1',
        item: {
          type: 'commit',
          sha: 'abc123',
          createdAt: '2024-01-01T00:00:00Z'
        }
      };

      expect(event.item.message).toBeUndefined();
      expect(event.item.author).toBeUndefined();
      expect(event.item.stats).toBeUndefined();
    });
  });

  describe('TimelineCommitRemovedEvent', () => {
    it('should have correct properties', () => {
      const event: TimelineCommitRemovedEvent = {
        type: 'timeline:commit:removed',
        cardId: 'card-1',
        sha: 'abc123'
      };

      expect(event.type).toBe('timeline:commit:removed');
      expect(event.cardId).toBe('card-1');
      expect(event.sha).toBe('abc123');
    });
  });

  describe('DomainEvent discriminated union', () => {
    it('should narrow types correctly for timeline:comment:added', () => {
      const event: DomainEvent = {
        type: 'timeline:comment:added',
        cardId: 'card-1',
        item: {
          type: 'comment',
          id: 'comment-1',
          author: 'user@example.com',
          content: 'Test',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01'
        }
      };

      switch (event.type) {
        case 'timeline:comment:added':
          expect(event.item.type).toBe('comment');
          expect(event.item.id).toBe('comment-1');
          break;
        default:
          throw new Error('Unexpected event type');
      }
    });

    it('should narrow types correctly for timeline:comment:removed', () => {
      const event: DomainEvent = {
        type: 'timeline:comment:removed',
        cardId: 'card-1',
        commentId: 'comment-1'
      };

      switch (event.type) {
        case 'timeline:comment:removed':
          expect(event.commentId).toBe('comment-1');
          break;
        default:
          throw new Error('Unexpected event type');
      }
    });

    it('should narrow types correctly for timeline:typedFile:added', () => {
      const event: DomainEvent = {
        type: 'timeline:typedFile:added',
        cardId: 'card-1',
        typeName: 'note',
        item: {
          type: 'note',
          id: 'note-1',
          fileName: 'note-1.md',
          content: 'Content',
          createdAt: '2024-01-01'
        }
      };

      switch (event.type) {
        case 'timeline:typedFile:added':
          expect(event.typeName).toBe('note');
          expect(event.item.id).toBe('note-1');
          break;
        default:
          throw new Error('Unexpected event type');
      }
    });

    it('should narrow types correctly for timeline:commit:added', () => {
      const event: DomainEvent = {
        type: 'timeline:commit:added',
        cardId: 'card-1',
        item: {
          type: 'commit',
          sha: 'abc123',
          createdAt: '2024-01-01'
        }
      };

      switch (event.type) {
        case 'timeline:commit:added':
          expect(event.item.type).toBe('commit');
          expect(event.item.sha).toBe('abc123');
          break;
        default:
          throw new Error('Unexpected event type');
      }
    });

    it('should handle all timeline event types exhaustively', () => {
      const handleEvent = (event: DomainEvent): string => {
        switch (event.type) {
          case 'card:metadataChanged':
            return 'card-metadata';
          case 'card:contentChanged':
            return 'card-content';
          case 'comment:created':
            return 'comment-created';
          case 'timeline:comment:added':
            return 'timeline-comment-added';
          case 'timeline:comment:updated':
            return 'timeline-comment-updated';
          case 'timeline:comment:removed':
            return 'timeline-comment-removed';
          case 'timeline:commit:added':
            return 'timeline-commit-added';
          case 'timeline:commit:removed':
            return 'timeline-commit-removed';
          case 'timeline:typedFile:added':
            return 'timeline-typedFile-added';
          case 'timeline:typedFile:updated':
            return 'timeline-typedFile-updated';
          case 'timeline:typedFile:removed':
            return 'timeline-typedFile-removed';
          case 'stream:started':
            return 'stream-started';
          case 'stream:resumed':
            return 'stream-resumed';
          case 'stream:line':
            return 'stream-line';
          case 'stream:ended':
            return 'stream-ended';
          case 'stream:error':
            return 'stream-error';
          default: {
            // Exhaustive check - this should never be reached
            const _exhaustive: never = event;
            return _exhaustive;
          }
        }
      };

      expect(
        handleEvent({
          type: 'timeline:comment:added',
          cardId: 'c1',
          item: {
            type: 'comment',
            id: 'cm1',
            author: 'a',
            content: 'c',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01'
          }
        })
      ).toBe('timeline-comment-added');

      expect(
        handleEvent({
          type: 'timeline:commit:added',
          cardId: 'c1',
          item: {
            type: 'commit',
            sha: 'abc123',
            createdAt: '2024-01-01'
          }
        })
      ).toBe('timeline-commit-added');

      expect(
        handleEvent({
          type: 'timeline:typedFile:added',
          cardId: 'c1',
          typeName: 'note',
          item: {
            type: 'note',
            id: 'n1',
            fileName: 'n1.md',
            content: 'content',
            createdAt: '2024-01-01'
          }
        })
      ).toBe('timeline-typedFile-added');

      expect(
        handleEvent({
          type: 'timeline:typedFile:removed',
          cardId: 'c1',
          typeName: 'note',
          fileName: 'n1.md',
          itemId: 'n1'
        })
      ).toBe('timeline-typedFile-removed');

      expect(
        handleEvent({
          type: 'timeline:commit:removed',
          cardId: 'c1',
          sha: 'abc123'
        })
      ).toBe('timeline-commit-removed');
    });
  });
});
