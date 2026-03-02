/**
 * Event subscription type definitions for the Cards V2 WebSocket API.
 *
 * These types describe the payloads delivered over the real-time event stream.
 *
 *
 * @summary Event subscription type definitions for the Cards V2 WebSocket API
 * @module types/events
 */

import type {
  CardContentChangedEvent,
  CardDeletedEvent,
  CardMetadataChangedEvent,
  CommentCreatedEvent,
  CompareChangedEvent,
  CompareClearedEvent,
  StreamEndedEvent,
  StreamErrorEvent,
  StreamLineEvent,
  StreamResumedEvent,
  StreamStartedEvent,
  TimelineCommentAddedEvent,
  TimelineCommentRemovedEvent,
  TimelineCommentUpdatedEvent,
  TimelineCommitAddedEvent,
  TimelineCommitRemovedEvent,
  TimelineTypedFileAddedEvent,
  TimelineTypedFileRemovedEvent,
  TimelineTypedFileUpdatedEvent
} from '../../protocol/index.js';

// --- EventSubscriber Configuration ---

/**
 * Configuration options for the EventSubscriber.
 */
export interface EventSubscriberOptions {
  /** WebSocket URL for the Cards V2 server. */
  wsUrl: string;
  /** Access token for authentication. */
  accessToken?: string;
  /** Maximum number of reconnection attempts before giving up. Defaults to 10. */
  maxReconnectAttempts?: number;
}

// --- Event Map ---

/**
 * Map of event names to their payload types.
 */
export interface EventMap {
  /** Fired when card metadata (status, title, tags) changes. */
  'card:metadataChanged': CardMetadataChangedEvent;
  /** Fired when card content changes. */
  'card:contentChanged': CardContentChangedEvent;
  /** Fired when a card is deleted. */
  'card:deleted': CardDeletedEvent;
  /** Fired when a new comment is created. */
  'comment:created': CommentCreatedEvent;
  /** Fired when a comment is added to the timeline. */
  'timeline:comment:added': TimelineCommentAddedEvent;
  /** Fired when a comment on the timeline is updated. */
  'timeline:comment:updated': TimelineCommentUpdatedEvent;
  /** Fired when a comment is removed from the timeline. */
  'timeline:comment:removed': TimelineCommentRemovedEvent;
  /** Fired when a typed file is added to the timeline. */
  'timeline:typedFile:added': TimelineTypedFileAddedEvent;
  /** Fired when a typed file on the timeline is updated. */
  'timeline:typedFile:updated': TimelineTypedFileUpdatedEvent;
  /** Fired when a typed file is removed from the timeline. */
  'timeline:typedFile:removed': TimelineTypedFileRemovedEvent;
  /** Fired when a commit is added to the timeline. */
  'timeline:commit:added': TimelineCommitAddedEvent;
  /** Fired when a commit is removed from the timeline. */
  'timeline:commit:removed': TimelineCommitRemovedEvent;
  /** Fired when a new stream is created and ready to receive lines. */
  'stream:started': StreamStartedEvent;
  /** Fired when a terminated stream is reopened and ready to receive new lines. */
  'stream:resumed': StreamResumedEvent;
  /** Fired for each line received. Carries the transformed (not raw) content. */
  'stream:line': StreamLineEvent;
  /** Fired when a stream reaches a terminal status. No further `stream:line` events follow. */
  'stream:ended': StreamEndedEvent;
  /** Fired when a per-line transform fails. The stream continues; the companion `stream:line` carries raw content. */
  'stream:error': StreamErrorEvent;
  /** Fired when the active compare session changes. */
  'compare:changed': CompareChangedEvent;
  /** Fired when the active compare session is cleared. */
  'compare:cleared': CompareClearedEvent;
}

// --- Callback Types ---

/**
 * Callback function type for event subscriptions.
 *
 * @template K - Event key from {@link EventMap} used to type the callback payload.
 */
export type EventCallback<K extends keyof EventMap> = (event: EventMap[K]) => void;
