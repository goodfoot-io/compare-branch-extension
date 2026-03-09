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
    it('should have card:metadataChanged event type', () => {
      const event: EventMap['card:metadataChanged'] = {
        type: 'card:metadataChanged',
        cardId: 'card-123',
        changes: ['status', 'title']
      };
      expect(event.cardId).toBe('card-123');
      expect(event.changes).toEqual(['status', 'title']);
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
  });

  describe('EventCallback', () => {
    it('should type callback for card:metadataChanged', () => {
      let receivedEvent: EventMap['card:metadataChanged'] | undefined;
      const callback: EventCallback<'card:metadataChanged'> = (event) => {
        receivedEvent = event;
      };

      callback({
        type: 'card:metadataChanged',
        cardId: 'card-123',
        changes: ['status']
      });

      expect(receivedEvent).toBeDefined();
      expect(receivedEvent?.cardId).toBe('card-123');
      expect(receivedEvent?.changes).toEqual(['status']);
    });
  });
});
