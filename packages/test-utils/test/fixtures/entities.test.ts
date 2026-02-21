/**
 * Unit tests for fixture entity factories.
 *
 * Why: ensure fixture helpers produce valid defaults and honor overrides, so
 * downstream tests can rely on predictable shapes.
 *
 *
 * @summary Unit tests for fixture entity factories
 * @module test-utils/test/fixtures/entities.test
 */
import { describe, expect, it } from 'vitest';
import {
  createAdaptiveCard,
  createAdaptiveCardFrontmatter,
  createCard,
  createCardMetadata,
  createComment,
  createCompleteCard,
  createMultipleAdaptiveCards,
  createMultipleCards,
  createMultipleComments,
  createMultipleNotes,
  createNote
} from '../../src/fixtures/entities.js';

describe('Entity Fixtures', () => {
  describe('createCardMetadata()', () => {
    it('creates metadata with default values', () => {
      const metadata = createCardMetadata();

      expect(metadata.id).toBeTruthy();
      expect(metadata.title).toContain('Test Card');
      expect(metadata.status).toBe('todo');
      expect(metadata.tags).toEqual([]);
      expect(metadata.gates).toBeDefined();
      expect(metadata.isPinned).toBe(false);
      expect(metadata.order).toBe(0);
      expect(metadata.repositoryId).toBe('main');
    });

    it('applies overrides', () => {
      const metadata = createCardMetadata({
        id: 'custom-id',
        title: 'Custom Title',
        status: 'in_progress',
        tags: ['bug'],
        isPinned: true,
        order: 5,
        repositoryId: 'test-repo'
      });

      expect(metadata.id).toBe('custom-id');
      expect(metadata.title).toBe('Custom Title');
      expect(metadata.status).toBe('in_progress');
      expect(metadata.tags).toEqual(['bug']);
      expect(metadata.isPinned).toBe(true);
      expect(metadata.order).toBe(5);
      expect(metadata.repositoryId).toBe('test-repo');
    });

    it('does not include createdAt or updatedAt', () => {
      const metadata = createCardMetadata();
      expect('createdAt' in metadata).toBe(false);
      expect('updatedAt' in metadata).toBe(false);
    });
  });

  describe('createCard()', () => {
    it('creates card with default values', () => {
      const card = createCard();

      expect(card.id).toBeTruthy();
      expect(card.title).toContain('Test Card');
      expect(card.description).toBe('');
    });

    it('applies overrides', () => {
      const card = createCard({
        title: 'My Card',
        description: 'Card description'
      });

      expect(card.title).toBe('My Card');
      expect(card.description).toBe('Card description');
    });
  });

  describe('createAdaptiveCardFrontmatter()', () => {
    it('creates frontmatter with default values', () => {
      const frontmatter = createAdaptiveCardFrontmatter();

      expect(frontmatter.id).toBeTruthy();
      expect(frontmatter.summary).toContain('Test Adaptive Card');
      expect(frontmatter.author).toBe('test-author');
      expect(frontmatter.status).toBe('active');
    });

    it('applies overrides', () => {
      const frontmatter = createAdaptiveCardFrontmatter({
        summary: 'Custom Card',
        author: 'custom-author',
        status: 'completed'
      });

      expect(frontmatter.summary).toBe('Custom Card');
      expect(frontmatter.author).toBe('custom-author');
      expect(frontmatter.status).toBe('completed');
    });
  });

  describe('createAdaptiveCard()', () => {
    it('creates adaptive card with default values', () => {
      const card = createAdaptiveCard();

      expect(card.id).toBeTruthy();
      expect(card.summary).toContain('Test Adaptive Card');
      expect(card.payload).toEqual({});
      expect(card.output).toBeUndefined();
    });

    it('applies overrides', () => {
      const card = createAdaptiveCard({
        payload: { type: 'test' },
        output: { result: 'success' }
      });

      expect(card.payload).toEqual({ type: 'test' });
      expect(card.output).toEqual({ result: 'success' });
    });
  });

  describe('createComment()', () => {
    it('creates comment with default values', () => {
      const comment = createComment();

      expect(comment.id).toBeTruthy();
      expect(comment.content).toBe('Test comment content');
      expect(comment.createdAt).toBeTruthy();
    });

    it('applies overrides', () => {
      const comment = createComment({
        content: 'Custom content'
      });

      expect(comment.content).toBe('Custom content');
    });
  });

  describe('createNote()', () => {
    it('creates note with default values', () => {
      const note = createNote();

      expect(note.id).toBeTruthy();
      expect(note.title).toContain('Test Note');
      expect(note.content).toBe('Test note content');
      expect(note.createdAt).toBeTruthy();
    });

    it('applies overrides', () => {
      const note = createNote({
        title: 'Custom Title',
        content: 'Custom content'
      });

      expect(note.title).toBe('Custom Title');
      expect(note.content).toBe('Custom content');
    });
  });

  describe('createCompleteCard()', () => {
    it('creates card with empty related entities', () => {
      const result = createCompleteCard();

      expect(result.card).toBeDefined();
      expect(result.adaptiveCards).toEqual([]);
      expect(result.comments).toEqual([]);
    });

    it('creates card with adaptive cards and comments', () => {
      const result = createCompleteCard({
        adaptiveCards: [{ summary: 'Card 1' }],
        comments: [{ content: 'Comment 1' }]
      });

      expect(result.adaptiveCards.length).toBe(1);
      expect(result.comments.length).toBe(1);
    });
  });

  describe('createMultiple helpers', () => {
    it('createMultipleCards creates specified count', () => {
      const cards = createMultipleCards(5);
      expect(cards.length).toBe(5);
      expect(cards.every((i) => i.id)).toBe(true);
    });

    it('createMultipleAdaptiveCards creates specified count', () => {
      const cards = createMultipleAdaptiveCards(2);
      expect(cards.length).toBe(2);
    });

    it('createMultipleComments creates specified count', () => {
      const comments = createMultipleComments(4);
      expect(comments.length).toBe(4);
    });

    it('createMultipleNotes creates specified count', () => {
      const notes = createMultipleNotes(3);
      expect(notes.length).toBe(3);
    });

    it('applies overrides to all entities', () => {
      const cards = createMultipleCards(3, { status: 'done' });
      expect(cards.every((i) => i.status === 'done')).toBe(true);
    });
  });

  describe('uniqueness', () => {
    it('generates unique IDs for each entity', () => {
      const cards = createMultipleCards(10);
      const ids = cards.map((i) => i.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });
});
