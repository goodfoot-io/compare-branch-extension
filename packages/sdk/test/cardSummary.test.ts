import type { Card } from '@cards/sdk/protocol';
import { describe, expect, it } from 'vitest';
import { toCardListSummaries, toCardListSummary } from '../src/cardSummary.js';

/**
 * Helper to create a mock Card object for testing.
 *
 * @summary Tests card summary behavior in types
 * @param overrides - Partial values that override the default fixture.
 * @returns Constructed helper value for the test case.
 */
function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-123',
    title: 'Test Card',
    status: 'todo',
    tags: ['bug', 'frontend'],
    isPinned: false,
    repositoryId: 'main',
    environment: 'default',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T12:45:00Z',
    order: 100,
    isMerged: null,
    hasStaleMerge: false,
    hasUnread: false,
    gates: {
      planRequired: false,
      planApproved: false,
      mergeRequestRequired: false,
      mergeApproved: false
    },
    repositoryPath: '/tmp/cards/card-123',
    parentBranch: 'main',
    ...overrides
  };
}

describe('cardSummary', () => {
  describe('toCardListSummary', () => {
    it('should preserve all top-level fields from Card', () => {
      const card = createMockCard({
        id: 'abc-456',
        title: 'Feature Request',
        status: 'active',
        tags: ['enhancement', 'backend'],
        isPinned: true,
        createdAt: '2024-02-01T08:00:00Z',
        updatedAt: '2024-02-02T10:15:00Z',
        order: 250
      });

      const summary = toCardListSummary(card);

      expect(summary.id).toBe('abc-456');
      expect(summary.title).toBe('Feature Request');
      expect(summary.status).toBe('active');
      expect(summary.tags).toEqual(['enhancement', 'backend']);
      expect(summary.isPinned).toBe(true);
      expect(summary.createdAt).toBe('2024-02-01T08:00:00Z');
      expect(summary.updatedAt).toBe('2024-02-02T10:15:00Z');
      expect(summary.order).toBe(250);
    });

    it('should flatten gate fields from nested gates object', () => {
      const card = createMockCard({
        gates: {
          planRequired: true,
          planApproved: true,
          mergeRequestRequired: true,
          mergeApproved: false
        }
      });

      const summary = toCardListSummary(card);

      expect(summary.planRequired).toBe(true);
      expect(summary.planApproved).toBe(true);
      expect(summary.mergeRequestRequired).toBe(true);
      expect(summary.mergeApproved).toBe(false);
    });

    it('should handle all gate fields set to false', () => {
      const card = createMockCard({
        gates: {
          planRequired: false,
          planApproved: false,
          mergeRequestRequired: false,
          mergeApproved: false
        }
      });

      const summary = toCardListSummary(card);

      expect(summary.planRequired).toBe(false);
      expect(summary.planApproved).toBe(false);
      expect(summary.mergeRequestRequired).toBe(false);
      expect(summary.mergeApproved).toBe(false);
    });

    it('should handle empty tags array', () => {
      const card = createMockCard({
        tags: []
      });

      const summary = toCardListSummary(card);

      expect(summary.tags).toEqual([]);
      expect(Array.isArray(summary.tags)).toBe(true);
    });

    it('should preserve tag order', () => {
      const card = createMockCard({
        tags: ['zulu', 'alpha', 'bravo']
      });

      const summary = toCardListSummary(card);

      expect(summary.tags).toEqual(['zulu', 'alpha', 'bravo']);
    });

    it('should handle different status values', () => {
      const statuses: Array<Card['status']> = ['todo', 'active', 'needs_review', 'done', 'archived'];

      for (const status of statuses) {
        const card = createMockCard({ status });
        const summary = toCardListSummary(card);
        expect(summary.status).toBe(status);
      }
    });
  });

  describe('toCardListSummaries', () => {
    it('should convert empty array to empty array', () => {
      const summaries = toCardListSummaries([]);

      expect(summaries).toEqual([]);
      expect(Array.isArray(summaries)).toBe(true);
    });

    it('should convert single card to array with one summary', () => {
      const cards = [createMockCard({ id: 'single-123' })];

      const summaries = toCardListSummaries(cards);

      expect(summaries).toHaveLength(1);
      expect(summaries[0]?.id).toBe('single-123');
    });

    it('should convert multiple cards preserving order', () => {
      const cards = [
        createMockCard({ id: 'first', title: 'First Card', order: 1 }),
        createMockCard({ id: 'second', title: 'Second Card', order: 2 }),
        createMockCard({ id: 'third', title: 'Third Card', order: 3 })
      ];

      const summaries = toCardListSummaries(cards);

      expect(summaries).toHaveLength(3);
      expect(summaries[0]?.id).toBe('first');
      expect(summaries[0]?.title).toBe('First Card');
      expect(summaries[0]?.order).toBe(1);
      expect(summaries[1]?.id).toBe('second');
      expect(summaries[1]?.title).toBe('Second Card');
      expect(summaries[1]?.order).toBe(2);
      expect(summaries[2]?.id).toBe('third');
      expect(summaries[2]?.title).toBe('Third Card');
      expect(summaries[2]?.order).toBe(3);
    });

    it('should flatten gates for all cards in array', () => {
      const cards = [
        createMockCard({
          id: 'card-1',
          gates: {
            planRequired: true,
            planApproved: false,
            mergeRequestRequired: false,
            mergeApproved: false
          }
        }),
        createMockCard({
          id: 'card-2',
          gates: {
            planRequired: false,
            planApproved: false,
            mergeRequestRequired: true,
            mergeApproved: true
          }
        })
      ];

      const summaries = toCardListSummaries(cards);

      expect(summaries[0]?.planRequired).toBe(true);
      expect(summaries[0]?.planApproved).toBe(false);
      expect(summaries[1]?.mergeRequestRequired).toBe(true);
      expect(summaries[1]?.mergeApproved).toBe(true);
    });
  });
});
