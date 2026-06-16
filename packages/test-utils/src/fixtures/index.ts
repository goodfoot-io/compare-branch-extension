/**
 * Factory functions for building cards, adaptive cards, comments, notes, and
 * composite domain entities with sensible defaults. Also provides deterministic
 * time helpers for past, present, and future dates in test scenarios.
 *
 * @summary Generate domain entity fixtures and deterministic timestamps for tests
 */

// --- Entity Types ---
export type { Comment, CompleteCard, CreateCompleteCardOptions, Note } from './entities.js';
// --- Entity Factories ---
export {
  // Card factories
  createCard,
  createCardMetadata,
  // Comment factories
  createComment,
  // Composite builders
  createCompleteCard,
  // Multiple entity helpers
  createMultipleCards,
  createMultipleComments,
  createMultipleNotes,
  // Note factories
  createNote
} from './entities.js';
