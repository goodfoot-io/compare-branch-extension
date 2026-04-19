/**
 * Tests for getDerivedTags utility.
 *
 * @summary Verifies derived tag computation from card properties
 */

import { describe, expect, it } from 'vitest';
import type { CardListSummary } from '../src/cardSummary.js';
import { getDerivedTags } from '../src/searchUtils.js';

function makeCard(overrides: Partial<CardListSummary> = {}): CardListSummary {
  return {
    id: 'main-1',
    repositoryId: 'main',
    title: 'Test Card',
    status: 'todo',
    tags: [],
    isPinned: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    order: 0,
    planRequired: false,
    planApproved: false,
    mergeRequestRequired: false,
    mergeApproved: false,
    isMerged: null,
    hasStaleMerge: false,
    hasUnread: false,
    relations: [],
    incomingRelations: [],
    ...overrides
  };
}

describe('getDerivedTags', () => {
  describe('planning tag', () => {
    it('returns planning when planRequired, no commits, and not approved', () => {
      const card = makeCard({ planRequired: true, isMerged: null, planApproved: false });
      expect(getDerivedTags(card)).toContain('planning');
    });

    it('returns planning when planRequired and not approved even with merged commits', () => {
      const card = makeCard({ planRequired: true, isMerged: true, planApproved: false });
      expect(getDerivedTags(card)).toContain('planning');
    });

    it('returns planning when planRequired and not approved with unmerged commits', () => {
      const card = makeCard({ planRequired: true, isMerged: false, planApproved: false });
      expect(getDerivedTags(card)).toContain('planning');
    });

    it('does not return planning when plan is approved', () => {
      const card = makeCard({ planRequired: true, isMerged: null, planApproved: true });
      expect(getDerivedTags(card)).not.toContain('planning');
    });
  });

  describe('merge-requested tag', () => {
    it('returns merge-requested when mergeRequestRequired, unmerged, and not approved', () => {
      const card = makeCard({ mergeRequestRequired: true, isMerged: false, mergeApproved: false });
      expect(getDerivedTags(card)).toContain('merge-requested');
    });

    it('does not return merge-requested for active cards', () => {
      const card = makeCard({ status: 'active', mergeRequestRequired: true, isMerged: false, mergeApproved: false });
      expect(getDerivedTags(card)).not.toContain('merge-requested');
    });
  });

  describe('merged tag', () => {
    it('returns merged when isMerged is true', () => {
      const card = makeCard({ isMerged: true });
      expect(getDerivedTags(card)).toContain('merged');
    });

    it('does not return merged for active cards even when isMerged is true', () => {
      const card = makeCard({ status: 'active', isMerged: true });
      expect(getDerivedTags(card)).not.toContain('merged');
    });

    it('does not return merged when hasStaleMerge is true', () => {
      const card = makeCard({ isMerged: true, hasStaleMerge: true });
      expect(getDerivedTags(card)).not.toContain('merged');
    });

    it('returns merged when hasStaleMerge is false and isMerged is true', () => {
      const card = makeCard({ isMerged: true, hasStaleMerge: false });
      expect(getDerivedTags(card)).toContain('merged');
    });

    it('does not return merged when hasStaleMerge is true regardless of planApproved state', () => {
      const card = makeCard({ isMerged: true, hasStaleMerge: true, planRequired: true, planApproved: true });
      expect(getDerivedTags(card)).not.toContain('merged');
    });
  });

  describe('unmerged tag', () => {
    it('returns unmerged when isMerged is false and no merge request gate', () => {
      const card = makeCard({ isMerged: false, mergeRequestRequired: false });
      expect(getDerivedTags(card)).toContain('unmerged');
    });

    it('does not return unmerged for active cards', () => {
      const card = makeCard({ status: 'active', isMerged: false, mergeRequestRequired: false });
      expect(getDerivedTags(card)).not.toContain('unmerged');
    });
  });

  describe('active status suppresses only merge-related tags', () => {
    it('still returns planning for active cards with no commits', () => {
      const card = makeCard({ status: 'active', planRequired: true, isMerged: null, planApproved: false });
      expect(getDerivedTags(card)).toContain('planning');
    });

    it('still returns planning for active cards with merged commits', () => {
      const card = makeCard({ status: 'active', planRequired: true, isMerged: true, planApproved: false });
      expect(getDerivedTags(card)).toContain('planning');
    });

    it('returns no merge-related tags for active cards with unmerged commits', () => {
      const card = makeCard({ status: 'active', isMerged: false, mergeRequestRequired: true, mergeApproved: false });
      const tags = getDerivedTags(card);
      expect(tags).not.toContain('merged');
      expect(tags).not.toContain('unmerged');
      expect(tags).not.toContain('merge-requested');
    });
  });
});
