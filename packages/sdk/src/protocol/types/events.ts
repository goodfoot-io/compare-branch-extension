/**
 * Domain event payloads emitted by the Cards V2 backend.
 *
 * These shapes are shared between servers and clients to ensure consistent
 * event handling over WebSocket transports.
 *
 *
 * @summary Domain event payloads emitted by the Cards V2 backend
 * @module types/events
 */

import type { StreamMeta, StreamStatus } from './stream.js';
import type { CommentTimelineItem, CommitTimelineItem, TypedFileTimelineItem } from './timeline.js';

// --- Card Events ---

/**
 * Metadata field names that can appear in {@link CardMetadataChangedEvent.changes}.
 *
 * Must stay in sync with `CardUpdateData` in `packages/cards/hybrid-store/src/store/HybridStore.ts`.
 */
export type CardUpdateDataField =
  | 'status'
  | 'title'
  | 'description'
  | 'tags'
  | 'gates'
  | 'isPinned'
  | 'order'
  | 'created'
  | 'updated';

/**
 * Event payload when card metadata (not content) changes.
 */
export interface CardMetadataChangedEvent {
  /** Event type discriminator. */
  type: 'card:metadataChanged';
  /** ID of the card that changed. */
  cardId: string;
  /** List of metadata fields that changed, for targeted UI updates. */
  changes: CardUpdateDataField[];
}

/**
 * Event payload when a card is deleted.
 */
export interface CardDeletedEvent {
  /** Event type discriminator. */
  type: 'card:deleted';
  /** ID of the deleted card. */
  cardId: string;
}

/**
 * Event payload when the card body content changes.
 */
export interface CardContentChangedEvent {
  /** Event type discriminator. */
  type: 'card:contentChanged';
  /** ID of the card that changed. */
  cardId: string;
}

// --- Comment Events ---

/**
 * Event payload when a comment is created.
 */
export interface CommentCreatedEvent {
  /** Event type discriminator. */
  type: 'comment:created';
  /** ID of the parent card. */
  cardId: string;
  /** ID of the newly created comment. */
  commentId: string;
}

// --- Timeline Events ---

/**
 * Event payload when a comment is added to the timeline.
 */
export interface TimelineCommentAddedEvent {
  /** Event type discriminator. */
  type: 'timeline:comment:added';
  /** ID of the parent card. */
  cardId: string;
  /** Full comment timeline item. */
  item: CommentTimelineItem;
}

/**
 * Event payload when a comment on the timeline is updated.
 */
export interface TimelineCommentUpdatedEvent {
  /** Event type discriminator. */
  type: 'timeline:comment:updated';
  /** ID of the parent card. */
  cardId: string;
  /** Updated comment timeline item. */
  item: CommentTimelineItem;
}

/**
 * Event payload when a comment is removed from the timeline.
 */
export interface TimelineCommentRemovedEvent {
  /** Event type discriminator. */
  type: 'timeline:comment:removed';
  /** ID of the parent card. */
  cardId: string;
  /** ID of the removed comment. */
  commentId: string;
}

/**
 * Event payload when a commit is added to the timeline.
 */
export interface TimelineCommitAddedEvent {
  /** Event type discriminator. */
  type: 'timeline:commit:added';
  /** ID of the parent card. */
  cardId: string;
  /** Full commit timeline item. */
  item: CommitTimelineItem;
}

/**
 * Event payload when a commit is removed from the timeline.
 */
export interface TimelineCommitRemovedEvent {
  /** Event type discriminator. */
  type: 'timeline:commit:removed';
  /** ID of the parent card. */
  cardId: string;
  /** SHA of the removed commit. */
  sha: string;
}

// --- Generic Typed File Events ---

/**
 * Event payload when a typed file is added to the timeline.
 */
export interface TimelineTypedFileAddedEvent {
  /** Event type discriminator. */
  type: 'timeline:typedFile:added';
  /** ID of the parent card. */
  cardId: string;
  /** Typed file type name (e.g. 'note', 'adaptive-card'). */
  typeName: string;
  /** Full typed file timeline item. */
  item: TypedFileTimelineItem;
}

/**
 * Event payload when a typed file on the timeline is updated.
 */
export interface TimelineTypedFileUpdatedEvent {
  /** Event type discriminator. */
  type: 'timeline:typedFile:updated';
  /** ID of the parent card. */
  cardId: string;
  /** Typed file type name (e.g. 'note', 'adaptive-card'). */
  typeName: string;
  /** Updated typed file timeline item. */
  item: TypedFileTimelineItem;
}

/**
 * Event payload when a typed file is removed from the timeline.
 */
export interface TimelineTypedFileRemovedEvent {
  /** Event type discriminator. */
  type: 'timeline:typedFile:removed';
  /** ID of the parent card. */
  cardId: string;
  /** Typed file type name (e.g. 'note', 'adaptive-card'). */
  typeName: string;
  /** File name of the removed typed file. */
  fileName: string;
  /** Logical ID for client-side list diffing. */
  itemId: string;
}

// --- Stream Events ---

/**
 * Broadcast when a new stream is created and ready to receive lines.
 *
 * Fired immediately after the `.meta.json` file is committed with
 * `status: 'active'`. Subscribers can use this to render a new stream
 * viewer widget in the UI.
 */
export interface StreamStartedEvent {
  /** Event type discriminator. */
  type: 'stream:started';
  /** ID of the parent card. */
  cardId: string;
  /** Full stream metadata snapshot at creation time. */
  meta: StreamMeta;
}

/**
 * Broadcast when a terminated stream is reopened and ready to receive new lines.
 *
 * Fired immediately after the stream transitions from a terminal status back to
 * `'active'`. Subscribers can use this to re-enable stream viewer widgets and
 * reattach listeners that were released when the stream ended.
 */
export interface StreamResumedEvent {
  /** Event type discriminator. */
  type: 'stream:resumed';
  /** ID of the parent card. */
  cardId: string;
  /** Full stream metadata snapshot after resume (status will be 'active'). */
  meta: StreamMeta;
  /** Status the stream had before resume. */
  previousStatus: StreamStatus;
  /** Number of lines the stream had before resume. */
  previousLineCount: number;
}

/**
 * Broadcast for each line appended to a stream.
 *
 * Contains the *transformed* output (not the raw line stored on disk).
 * If the transform failed for this line, the raw content is used instead
 * and a companion {@link StreamErrorEvent} is also broadcast.
 */
export interface StreamLineEvent {
  /** Event type discriminator. */
  type: 'stream:line';
  /** ID of the parent card. */
  cardId: string;
  /** Stream filename within the card's `streams/` directory. */
  filename: string;
  /** 1-based line number in the stream. */
  lineNumber: number;
  /** Transformed content (raw line if transform failed). */
  transformed: string;
}

/**
 * Broadcast when a stream reaches a terminal status.
 *
 * After this event, no further `stream:line` events will be emitted for this
 * stream. The `status` field indicates the reason for closure.
 *
 * @see StreamStatus for possible terminal values.
 */
export interface StreamEndedEvent {
  /** Event type discriminator. */
  type: 'stream:ended';
  /** ID of the parent card. */
  cardId: string;
  /** Stream filename within the card's `streams/` directory. */
  filename: string;
  /** Terminal status describing how the stream ended. */
  status: StreamStatus;
  /** Total number of lines received before closure. */
  lineCount: number;
}

/**
 * Broadcast when a transform throws or times out on a single line.
 *
 * The stream continues processing; this is a per-line warning, not a
 * terminal event. The corresponding `stream:line` event for the same
 * `lineNumber` will carry the raw (untransformed) content as a fallback.
 */
export interface StreamErrorEvent {
  /** Event type discriminator. */
  type: 'stream:error';
  /** ID of the parent card. */
  cardId: string;
  /** Stream filename within the card's `streams/` directory. */
  filename: string;
  /** 1-based line number where the transform failed. */
  lineNumber: number;
  /** Human-readable error message from the transform. */
  error: string;
}

// --- Domain Event Union ---

/**
 * Discriminated union of all domain events.
 *
 * The `type` field enables safe narrowing in switch statements so callers can
 * respond to specific event payloads without unsafe casts.
 *
 * @example
 * ```typescript
 * function handleEvent(event: DomainEvent): void {
 *   switch (event.type) {
 *     case 'card:metadataChanged':
 *       console.log(event.changes);
 *       break;
 *     case 'comment:created':
 *       console.log(event.commentId);
 *       break;
 *     default:
 *       break;
 *   }
 * }
 * ```
 */
export type DomainEvent =
  | CardMetadataChangedEvent
  | CardContentChangedEvent
  | CardDeletedEvent
  | CommentCreatedEvent
  | TimelineCommentAddedEvent
  | TimelineCommentUpdatedEvent
  | TimelineCommentRemovedEvent
  | TimelineCommitAddedEvent
  | TimelineCommitRemovedEvent
  | TimelineTypedFileAddedEvent
  | TimelineTypedFileUpdatedEvent
  | TimelineTypedFileRemovedEvent
  | StreamStartedEvent
  | StreamResumedEvent
  | StreamLineEvent
  | StreamEndedEvent
  | StreamErrorEvent;
