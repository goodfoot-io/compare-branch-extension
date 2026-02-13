/**
 *
 * Re-exports the public surface for the protocol module.
 * Centralizing exports here keeps import paths stable and makes module boundaries explicit to
 * maintainers.
 *
 * @summary Public exports for the protocol module
 * @cards/protocol
 *
 * Canonical wire-level contracts for the Cards V2 ecosystem.
 *
 * This package serves as the shared vocabulary for cards, webview messaging, IPC,
 * WebSocket events, and validation boundaries. Downstream services and clients
 * compile against these shapes, so changes here should be treated as
 * compatibility decisions rather than refactors.
 *
 * The module only re-exports types and constants; it intentionally contains no
 * runtime behavior. All shapes are designed for JSON serialization over HTTP,
 * WebSocket, or IPC channels.
 *
 * @example
 * ```typescript
 * import type { Card, CardStatus, CreateCardRequest } from '@cards/protocol';
 * import { MAX_TITLE_LENGTH, DEFAULT_CARD_GATES } from '@cards/protocol';
 *
 * const request: CreateCardRequest = {
 *   title: title.slice(0, MAX_TITLE_LENGTH),
 *   description: 'Implement feature X',
 *   workspacePath: '/home/user/project',
 *   gates: DEFAULT_CARD_GATES
 * };
 * ```
 *
 * @see {@link Card} for the core card representation
 * @see {@link Settings} for the actions-based execution configuration
 * @see {@link WrapperCommand} for process control messages
 *
 * @packageDocumentation
 */

// --- Status Types ---
// --- Card Types ---
// --- API Discovery Types ---
// --- Response Envelope Types ---
// --- WebSocket Event Types ---
// --- IPC Message Types ---
// --- Webview Messaging Types ---
// --- Custom Types ---
// --- API Request/Response Types ---
export type {
  Action,
  ActionMessage,
  ActionResult,
  ActionState,
  ActionSummaryResponse,
  ActivityStateResponse,
  AddBranchRequest,
  AddCommitRequest,
  ApiError,
  ApiRequestMessage,
  ApiResponseMessage,
  ApiSuccess,
  AsyncFileExistsCallback,
  AsyncReadFileCallback,
  AsyncWriteFileCallback,
  AttachmentInfoFile,
  AttachmentResponse,
  BranchesResponse,
  BranchInfo,
  CancelAcknowledgment,
  CancelCommand,
  Card,
  CardContentChangedEvent,
  CardCreateGates,
  CardDetailMessage,
  CardGates,
  CardMetadata,
  CardMetadataChangedEvent,
  CardResponse,
  CardStatus,
  CardsApiInfo,
  Command,
  Comment,
  CommentCreatedEvent,
  CommentResponse,
  CommentTimelineItem,
  CommitAttributionResponse,
  CommitAuthor,
  CommitDetails,
  CommitStats,
  CommitTimelineItem,
  ConnectionFailedMessage,
  ConnectionsResponse,
  CreateAttachmentRequest,
  CreateCardRequest,
  CreateCommentRequest,
  DomainEvent,
  Environment,
  EnvironmentInfo,
  EnvironmentsResponse,
  EventMessage,
  ExecutionMode,
  ExtensionToWebviewMessage,
  FieldError,
  FileChange,
  FileExistsCallback,
  GateApprovalResponse,
  GateName,
  HasUpdatesResponse,
  HealthResponse,
  HookConfig,
  HookEvent,
  HookScript,
  HttpClient,
  IpcMessage,
  IpcMessageBase,
  IpcMessageCallback,
  LaunchClaudeAction,
  ListCardsRequest,
  ListTagsRequest,
  NavigateMessage,
  NotificationCreateRequest,
  NotificationSeverity,
  PlanResponse,
  ProcessState,
  ReadFileCallback,
  ReindexRequest,
  ReindexResponse,
  SerializedCard,
  ServerChangedMessage,
  SessionBaseline,
  SessionStartedMessage,
  SessionType,
  Settings,
  StateUpdateMessage,
  StreamDefinition,
  StreamEndedEvent,
  StreamErrorEvent,
  StreamLineEvent,
  StreamMeta,
  StreamMetaFile,
  StreamStartedEvent,
  StreamStatus,
  SwitchToInteractiveCommand,
  TagsResponse,
  ThemeUpdateMessage,
  TimelineCommentAddedEvent,
  TimelineCommentRemovedEvent,
  TimelineCommentUpdatedEvent,
  TimelineCommitAddedEvent,
  TimelineCommitRemovedEvent,
  TimelineItem,
  TimelineRequest,
  TimelineResponse,
  TimelineTypedFileAddedEvent,
  TimelineTypedFileRemovedEvent,
  TimelineTypedFileUpdatedEvent,
  TransformContext,
  TypeConfig,
  TypeDefinition,
  TypedFileHookInput,
  TypedFileListResponse,
  TypedFileMetadata,
  TypedFileResponse,
  TypedFileTimelineItem,
  TypesConfig,
  UpdateCardRequest,
  UpdateCommentRequest,
  UpdatePlanRequest,
  ValidationErrorCode,
  ValidationErrorMessage,
  ValidationFailure,
  ValidationResult,
  ValidationSuccess,
  WebviewAction,
  WebviewDidConnectMessage,
  WebviewState,
  WebviewTimelineEntry,
  WebviewToExtensionMessage,
  WorkspaceBlock,
  WorkspaceBranch,
  WrapperCommand,
  WrapperErrorResponse,
  WrapperResponse
} from './types/index.js';
// --- Input Constraints ---
// --- Card Gates ---
export {
  ATTACHMENT_ID_PATTERN,
  DEFAULT_CARD_GATES,
  MAX_CARD_ID_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_ID_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TITLE_LENGTH,
  TAG_PATTERN
} from './types/index.js';
