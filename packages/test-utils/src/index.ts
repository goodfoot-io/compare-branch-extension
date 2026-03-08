/**
 * Shared test infrastructure for Cards packages including real Git repositories,
 * WebSocket and IPC servers, HTTP clients, stream transform harnesses, and
 * deterministic fixture factories. Helpers here interact with filesystems,
 * sockets, and timers, making them best suited to integration-style tests.
 *
 * @summary Provide reusable test harnesses, fixture factories, and constants for Cards integration tests
 */

// --- Constants ---
export { ADAPTIVE_CARD_STATUSES, CARD_STATUSES, TEST_CONSTANTS } from './constants/index.js';
// --- Fixture Factories ---
export {
  // Types
  type AdaptiveCardStatus,
  type Comment,
  type CompleteCard,
  type CreateCompleteCardOptions,
  // Adaptive Card factories
  createAdaptiveCard,
  createAdaptiveCardFrontmatter,
  // Card factories
  createCard,
  createCardMetadata,
  // Comment factories
  createComment,
  // Composite builders
  createCompleteCard,
  // Multiple entity helpers
  createMultipleAdaptiveCards,
  createMultipleCards,
  createMultipleComments,
  createMultipleNotes,
  // Note factories
  createNote,
  type Note
} from './fixtures/index.js';
// --- Time Utilities ---
export { futureDate, now, pastDate } from './fixtures/time.js';
// --- Git Test Utilities ---
export {
  type CreateCardOptions,
  TestCardRepository,
  type UpdateCardOptions
} from './git/TestCardRepository.js';
export { TestGitWorkspace } from './git/TestGitWorkspace.js';
// --- HTTP Test Utilities ---
export { type RecordedRequest, TestHttpClient } from './http/TestHttpClient.js';
// --- IPC Test Utilities ---
export { TestIpcServer } from './ipc/TestIpcServer.js';
// --- Stream Test Utilities ---
export { TestStreamTransformHarness } from './stream/index.js';
// --- WebSocket Test Utilities ---
export {
  getRandomPort,
  type StartOptions,
  TestWebSocketServer,
  type WsWebSocket
} from './ws/TestWebSocketServer.js';
