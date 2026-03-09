import { describe, expect, it } from 'vitest';
import type { EventCallback, EventMap, EventSubscriberOptions } from '../../../src/client/types/events.js';

/**
 * Exercises events behavior in the types area through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve expected state
 * transitions and output.
 *
 * @summary Tests events behavior in types
 */

describe('Event Types', () => {
  describe('EventSubscriberOptions', () => {
    it('should accept required wsUrl', () => {
      const options: EventSubscriberOptions = {
        wsUrl: 'ws://localhost:3000/events'
      };
      expect(options.wsUrl).toBe('ws://localhost:3000/events');
    });

    it('should accept optional accessToken', () => {
      const options: EventSubscriberOptions = {
        wsUrl: 'ws://localhost:3000/events',
        accessToken: 'test-token'
      };
      expect(options.accessToken).toBe('test-token');
    });
  });

  describe('EventMap', () => {
    it('should have cards:metadata event type', () => {
      const event: EventMap['cards:metadata'] = {
        type: 'cards:metadata',
        cardId: 'card-123',
        title: 'Test',
        status: 'todo',
        tags: [],
        isPinned: false,
        order: 0,
        gates: { planRequired: false, planApproved: false, reviewRequired: false, reviewApproved: false },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        hasPlanContent: false,
        isMerged: null,
        incomingRelations: [],
        commentCount: 0,
        attachmentCount: 0,
        description: ''
      };
      expect(event.cardId).toBe('card-123');
      expect(event.title).toBe('Test');
    });

    it('should have card:contentChanged event type', () => {
      const event: EventMap['card:contentChanged'] = {
        type: 'card:contentChanged',
        cardId: 'card-456'
      };
      expect(event.cardId).toBe('card-456');
    });

    it('should have comment:created event type', () => {
      const event: EventMap['comment:created'] = {
        type: 'comment:created',
        cardId: 'card-123',
        commentId: 'comment-789'
      };
      expect(event.cardId).toBe('card-123');
      expect(event.commentId).toBe('comment-789');
    });

    it('should have cards:metadata in event map', () => {
      const eventKeys: Array<keyof EventMap> = [
        'cards:metadata',
        'card:contentChanged',
        'card:deleted',
        'comment:created',
        'timeline:comment:added',
        'timeline:comment:updated',
        'timeline:comment:removed',
        'timeline:typedFile:added',
        'timeline:typedFile:updated',
        'timeline:typedFile:removed',
        'timeline:commit:added',
        'timeline:commit:removed'
      ];
      expect(eventKeys).toHaveLength(12);
    });

    it('should have timeline:comment:added event type', () => {
      const event: EventMap['timeline:comment:added'] = {
        type: 'timeline:comment:added',
        cardId: 'card-123',
        item: {
          type: 'comment',
          id: 'comment-456',
          author: 'user@example.com',
          content: 'Test comment',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z'
        }
      };
      expect(event.cardId).toBe('card-123');
      expect(event.item.type).toBe('comment');
      expect(event.item.id).toBe('comment-456');
    });

    it('should have timeline:comment:updated event type', () => {
      const event: EventMap['timeline:comment:updated'] = {
        type: 'timeline:comment:updated',
        cardId: 'card-123',
        item: {
          type: 'comment',
          id: 'comment-456',
          author: 'user@example.com',
          content: 'Updated comment',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z'
        }
      };
      expect(event.cardId).toBe('card-123');
      expect(event.item.content).toBe('Updated comment');
    });

    it('should have timeline:comment:removed event type', () => {
      const event: EventMap['timeline:comment:removed'] = {
        type: 'timeline:comment:removed',
        cardId: 'card-123',
        commentId: 'comment-456'
      };
      expect(event.cardId).toBe('card-123');
      expect(event.commentId).toBe('comment-456');
    });

    it('should have timeline:typedFile:added event type', () => {
      const event: EventMap['timeline:typedFile:added'] = {
        type: 'timeline:typedFile:added',
        cardId: 'card-123',
        typeName: 'note',
        item: {
          type: 'note',
          id: 'note-789',
          fileName: 'note-789.md',
          content: 'Note content',
          createdAt: '2026-01-01T00:00:00Z'
        }
      };
      expect(event.cardId).toBe('card-123');
      expect(event.typeName).toBe('note');
      expect(event.item.type).toBe('note');
      expect(event.item.id).toBe('note-789');
    });

    it('should have timeline:typedFile:updated event type', () => {
      const event: EventMap['timeline:typedFile:updated'] = {
        type: 'timeline:typedFile:updated',
        cardId: 'card-123',
        typeName: 'adaptive-card',
        item: {
          type: 'adaptive-card',
          id: 'ac-111',
          fileName: 'ac-111.json',
          content: { summary: 'Updated adaptive card' },
          createdAt: '2026-01-01T00:00:00Z'
        }
      };
      expect(event.cardId).toBe('card-123');
      expect(event.typeName).toBe('adaptive-card');
      expect(event.item.type).toBe('adaptive-card');
    });

    it('should have timeline:typedFile:removed event type', () => {
      const event: EventMap['timeline:typedFile:removed'] = {
        type: 'timeline:typedFile:removed',
        cardId: 'card-123',
        typeName: 'note',
        fileName: 'note-789.md',
        itemId: 'note-789'
      };
      expect(event.cardId).toBe('card-123');
      expect(event.typeName).toBe('note');
      expect(event.fileName).toBe('note-789.md');
      expect(event.itemId).toBe('note-789');
    });

    it('should have timeline:commit:added event type', () => {
      const event: EventMap['timeline:commit:added'] = {
        type: 'timeline:commit:added',
        cardId: 'card-123',
        item: {
          type: 'commit',
          sha: 'abc123def456',
          createdAt: '2026-01-01T00:00:00Z',
          message: 'Initial commit',
          author: {
            name: 'Test User',
            email: 'test@example.com',
            date: '2026-01-01T00:00:00Z'
          },
          stats: {
            additions: 10,
            deletions: 5,
            filesChanged: [{ path: 'file.ts', additions: 10, deletions: 5 }]
          }
        }
      };
      expect(event.cardId).toBe('card-123');
      expect(event.item.type).toBe('commit');
      expect(event.item.sha).toBe('abc123def456');
    });

    it('should have timeline:commit:removed event type', () => {
      const event: EventMap['timeline:commit:removed'] = {
        type: 'timeline:commit:removed',
        cardId: 'card-123',
        sha: 'abc123def456'
      };
      expect(event.cardId).toBe('card-123');
      expect(event.sha).toBe('abc123def456');
    });
  });

  describe('EventCallback', () => {
    it('should type callback for cards:metadata', () => {
      let receivedEvent: EventMap['cards:metadata'] | undefined;
      const callback: EventCallback<'cards:metadata'> = (event) => {
        receivedEvent = event;
      };

      callback({
        type: 'cards:metadata',
        cardId: 'card-123',
        title: 'Test',
        status: 'todo',
        tags: [],
        isPinned: false,
        order: 0,
        gates: { planRequired: false, planApproved: false, reviewRequired: false, reviewApproved: false },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        hasPlanContent: false,
        isMerged: null,
        incomingRelations: [],
        commentCount: 0,
        attachmentCount: 0,
        description: ''
      });

      expect(receivedEvent).toBeDefined();
      expect(receivedEvent?.cardId).toBe('card-123');
    });
  });
});
