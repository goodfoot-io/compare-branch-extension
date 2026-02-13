/**
 * Curated export surface for Cards V2 protocol types and constants.
 *
 * Consumers should import from this module to avoid deep, brittle paths and to
 * keep the public protocol surface explicit. This file contains no behavior;
 * it only re-exports shapes defined in sibling modules.
 *
 * The exports are organized by domain:
 *
 * - **Card types**: Core card representation and metadata
 * - **Status types**: Lifecycle and state enumerations
 * - **API types**: Request/response shapes for REST endpoints
 * - **Event types**: WebSocket domain events for real-time updates
 * - **Settings types**: Configuration for actions and environments
 * - **Messaging types**: IPC and webview communication protocols
 * - **Constraint constants**: Validation boundaries for input fields
 *
 *
 * @summary Curated export surface for Cards V2 protocol types and constants
 * @example
 * ```typescript
 * import type { Card, CardStatus, CreateCardRequest } from '@cards/protocol/types';
 * import { MAX_TITLE_LENGTH, DEFAULT_CARD_GATES } from '@cards/protocol/types';
 * ```
 *
 * @module types
 */

// --- API Discovery Types ---
export type { CardsApiInfo, SessionBaseline } from './api.js';
// --- API Request/Response Types ---
export type {
  ActionSummaryResponse,
  ActivityStateResponse,
  AddCommitRequest,
  AttachmentResponse,
  CardCreateGates,
  CardResponse,
  CommentResponse,
  CommitAttributionResponse,
  ConnectionsResponse,
  CreateAttachmentRequest,
  CreateCardRequest,
  CreateCommentRequest,
  EnvironmentInfo,
  EnvironmentsResponse,
  GateApprovalResponse,
  GateName,
  HasUpdatesResponse,
  HealthResponse,
  ListCardsRequest,
  ListTagsRequest,
  PlanResponse,
  ReindexRequest,
  ReindexResponse,
  TagsResponse,
  TimelineRequest,
  TimelineResponse,
  TypedFileListResponse,
  TypedFileResponse,
  UpdateCardRequest,
  UpdateCommentRequest,
  UpdatePlanRequest
} from './api-requests.js';
// --- Callback Types ---
export type { IpcMessageCallback } from './callbacks.js';
// --- Card Types ---
export type { Card, CardGates, CardMetadata } from './card.js';
export { DEFAULT_CARD_GATES } from './card.js';
// --- Input Constraints ---
export {
  ATTACHMENT_ID_PATTERN,
  MAX_CARD_ID_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_ID_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TITLE_LENGTH,
  TAG_PATTERN
} from './constraints.js';
// --- Custom Types ---
export type {
  TypeConfig,
  TypedFileHookInput,
  TypedFileMetadata,
  TypesConfig,
  ValidationFailure,
  ValidationResult,
  ValidationSuccess
} from './custom-types.js';
// --- WebSocket Event Types ---
export type {
  CardContentChangedEvent,
  CardMetadataChangedEvent,
  CommentCreatedEvent,
  DomainEvent,
  StreamEndedEvent,
  StreamErrorEvent,
  StreamLineEvent,
  StreamStartedEvent,
  TimelineCommentAddedEvent,
  TimelineCommentRemovedEvent,
  TimelineCommentUpdatedEvent,
  TimelineCommitAddedEvent,
  TimelineCommitRemovedEvent,
  TimelineTypedFileAddedEvent,
  TimelineTypedFileRemovedEvent,
  TimelineTypedFileUpdatedEvent
} from './events.js';
// --- Filesystem Callback Types ---
export type {
  AsyncFileExistsCallback,
  AsyncReadFileCallback,
  AsyncWriteFileCallback,
  FileExistsCallback,
  ReadFileCallback
} from './fs-callbacks.js';
// --- Hook Configuration Types ---
export type { HookConfig, HookEvent, HookScript } from './hooks.js';
// --- HTTP Client Types ---
export type { HttpClient } from './http.js';
// --- Import Types ---
export type { SerializedCard } from './import.js';
// --- IPC Message Types ---
export type {
  IpcMessage,
  IpcMessageBase,
  SessionStartedMessage
} from './ipc.js';
// --- Notification Types ---
export type { NotificationCreateRequest, NotificationSeverity } from './notifications.js';
// --- Response Envelope Types ---
export type { ApiError, ApiSuccess, FieldError } from './response.js';
// --- Settings Types ---
export type {
  Action,
  ActionResult,
  ActionState,
  Command,
  Environment,
  ExecutionMode,
  Settings,
  TypeDefinition
} from './settings.js';
// --- Status Types ---
export type {
  CardStatus,
  ProcessState,
  SessionType
} from './status.js';
// --- Stream Types ---
export type {
  AttachmentInfoFile,
  StreamDefinition,
  StreamInitContext,
  StreamMeta,
  StreamMetaFile,
  StreamStatus,
  TransformContext
} from './stream.js';
// --- Timeline Types ---
export type {
  Comment,
  CommentTimelineItem,
  CommitAuthor,
  CommitDetails,
  CommitStats,
  CommitTimelineItem,
  FileChange,
  TimelineItem,
  TypedFileTimelineItem
} from './timeline.js';
// --- Validation Types ---
export type { ValidationErrorCode } from './validation.js';
// --- Webview Messaging Types ---
export type {
  ActionMessage,
  ApiRequestMessage,
  ApiResponseMessage,
  CardDetailMessage,
  ConnectionFailedMessage,
  EventMessage,
  ExtensionToWebviewMessage,
  LaunchClaudeAction,
  NavigateMessage,
  ServerChangedMessage,
  StateUpdateMessage,
  ThemeUpdateMessage,
  ValidationErrorMessage,
  WebviewAction,
  WebviewDidConnectMessage,
  WebviewState,
  WebviewTimelineEntry,
  WebviewToExtensionMessage
} from './webview.js';
// --- Wrapper Command Types ---
export type {
  CancelAcknowledgment,
  CancelCommand,
  SwitchToInteractiveCommand,
  WrapperCommand,
  WrapperErrorResponse,
  WrapperResponse
} from './wrapper-commands.js';
