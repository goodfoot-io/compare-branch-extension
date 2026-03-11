/**
 * Individual protocol type definitions organized by domain: card structures,
 * lifecycle statuses, REST request/response shapes, WebSocket events, settings
 * schemas, IPC and webview messaging contracts, and input constraint constants.
 *
 * @summary Domain-organized protocol types, events, and constraint constants
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
  CardPostCommitRequest,
  CardPostCommitResponse,
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
  TagsResponse,
  TimelineRequest,
  TimelineResponse,
  TypedFileListResponse,
  TypedFileResponse,
  UpdateCardRequest,
  UpdateCommentRequest,
  UpdatePlanRequest,
  WorkspacePostCommitRequest,
  WorkspacePostCommitResponse
} from './api-requests.js';
// --- Branch Types ---
export type {
  AddBranchRequest,
  BranchesResponse,
  BranchInfo,
  WorkspaceBranch
} from './branch.js';
export {
  EMPTY_TREE_SHA,
  WORKSPACE_BRANCHES_FILE,
  WORKSPACE_COMMITS_FILE
} from './branch.js';
// --- Callback Types ---
export type { IpcMessageCallback } from './callbacks.js';
// --- Card Types ---
export type { Card, CardGates, CardMetadata, CardRelation, CardRelationType } from './card.js';
export { CARD_RELATION_TYPES, DEFAULT_CARD_GATES } from './card.js';
// --- Card Scaffold ---
export { CARD_GITIGNORE } from './card-scaffold.js';
// --- Compare Types ---
export type {
  CompareBranchRangeRequest,
  CompareDynamicRequest,
  CompareFixedAttributionRequest,
  CompareMode,
  CompareRequest,
  CompareState
} from './compare.js';
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
  AttachmentAddedEvent,
  AttachmentRemovedEvent,
  CardCommitEvent,
  CardCreatedEvent,
  CardDeletedEvent,
  CardIncomingRelationsChangedEvent,
  CardsMetadataEvent,
  CommentCreatedEvent,
  CompareChangedEvent,
  CompareClearedEvent,
  DomainEvent,
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
  TimelineTypedFileUpdatedEvent,
  WorkspaceCommitEvent
} from './events.js';
// --- Filesystem Types ---
export type { CardCommit, CardCommitFile, CardSnapshot } from './fs.js';
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
