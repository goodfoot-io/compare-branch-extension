/**
 * HTTP client for the Cards V2 REST API.
 *
 *
 * @summary HTTP client for the Cards V2 REST API
 * @module sdk/CardsClient
 */

import type { Card, CompareRequest, CompareState, HttpClient, StreamMeta, TimelineItem } from '../protocol/index.js';
import type {
  AddBranchRequest,
  AttachmentResponse,
  BranchesResponse,
  CardCreateData,
  CardsClientOptions,
  CardUpdateData,
  Comment,
  CommentCreateData,
  CommentUpdateData,
  CommitInfo,
  GateApprovalResponse,
  IngestWsFactory,
  ListCardsOptions,
  StreamResult,
  StreamWriter,
  StreamWriterOptions,
  TimelineOptions,
  TypeSchemasResponse,
  WsStreamSession
} from './types/client.js';
import { ApiError, NetworkError } from './types/errors.js';

/** Initial request timeout in milliseconds (3 seconds to accommodate git-backed endpoints). */
const INITIAL_TIMEOUT_MS = 3_000;

/** Maximum request timeout in milliseconds after exponential backoff. */
const MAX_TIMEOUT_MS = 10_000;

/** Maximum number of automatic retries for timeout errors before giving up. */
const MAX_TIMEOUT_RETRIES = 2;

/**
 * Type-safe HTTP client for the Cards V2 REST API.
 *
 * Uses the Fetch API by default and supports dependency injection of an
 * alternate {@link HttpClient} for tests or custom transports. All public
 * methods surface server failures as {@link ApiError} and transport failures
 * as {@link NetworkError}.
 *
 * The default HTTP client applies an exponential backoff timeout to fetch
 * requests: starting at 3 seconds, doubling on each consecutive failure up
 * to a 10-second cap, and resetting on any successful response. This ensures
 * fast failure detection when the server is down while allowing slower
 * responses during recovery.
 *
 * @example
 * ```typescript
 * const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'token' });
 *
 * const cards = await client.listCards({ status: 'in_progress' });
 * await client.updateCard(cardId, { status: 'done' });
 * ```
 */
export class CardsClient {
  private readonly _httpClient?: HttpClient;

  /** Current timeout in milliseconds, increases with consecutive failures. */
  private _currentTimeoutMs = INITIAL_TIMEOUT_MS;

  /**
   * Creates a new CardsClient instance.
   *
   * @param options - Configuration options including base URL and auth token.
   * @param httpClient - Optional HTTP client for dependency injection.
   */
  constructor(
    private readonly options: CardsClientOptions,
    httpClient?: HttpClient
  ) {
    this._httpClient = httpClient;
  }

  /**
   * Returns the base URL used to build API requests.
   *
   * @returns The base URL string as provided in {@link CardsClientOptions}.
   */
  getBaseUrl(): string {
    return this.options.baseUrl;
  }

  /**
   * Returns whether an HTTP client was injected.
   *
   * @returns True if an HTTP client was provided during construction.
   * @internal Used for testing dependency injection.
   */
  hasHttpClient(): boolean {
    return this._httpClient !== undefined;
  }
  /**
   * Returns an AbortSignal that fires after the current backoff timeout.
   * Uses caller's signal if provided (for DI/testing), otherwise applies the backoff timeout.
   *
   * @param existingSignal - Optional caller-provided signal to reuse instead of creating a timeout signal.
   * @returns AbortSignal that controls request cancellation for the current operation.
   */
  private getTimeoutSignal(existingSignal?: AbortSignal | null): AbortSignal {
    if (existingSignal) return existingSignal;
    return AbortSignal.timeout(this._currentTimeoutMs);
  }

  /**
   * Records a successful request and resets the timeout backoff.
   */
  private onRequestSuccess(): void {
    this._currentTimeoutMs = INITIAL_TIMEOUT_MS;
  }

  /**
   * Records a failed request and increases the timeout via exponential backoff.
   */
  private onRequestFailure(): void {
    this._currentTimeoutMs = Math.min(this._currentTimeoutMs * 2, MAX_TIMEOUT_MS);
  }

  /**
   * Default HTTP client implementation using fetch + JSON payloads.
   *
   * Each fetch call includes an AbortSignal.timeout that starts at 3 seconds
   * and doubles on consecutive failures up to 10 seconds.
   */
  private defaultHttpClient: HttpClient = {
    get: async <T>(url: string, options?: RequestInit): Promise<T> => {
      const response = await fetch(url, {
        ...options,
        headers: { ...this.getHeaders(), ...options?.headers },
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
      return response.json() as Promise<T>;
    },
    post: async <T>(url: string, body: unknown, options?: RequestInit): Promise<T> => {
      const response = await fetch(url, {
        ...options,
        method: 'POST',
        headers: { ...this.getHeaders(), ...options?.headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
      return response.json() as Promise<T>;
    },
    put: async <T>(url: string, body: unknown, options?: RequestInit): Promise<T> => {
      const response = await fetch(url, {
        ...options,
        method: 'PUT',
        headers: { ...this.getHeaders(), ...options?.headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
      return response.json() as Promise<T>;
    },
    patch: async <T>(url: string, body: unknown, options?: RequestInit): Promise<T> => {
      const response = await fetch(url, {
        ...options,
        method: 'PATCH',
        headers: { ...this.getHeaders(), ...options?.headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
      return response.json() as Promise<T>;
    },
    delete: async (url: string, options?: RequestInit): Promise<void> => {
      const response = await fetch(url, {
        ...options,
        method: 'DELETE',
        headers: { ...this.getHeaders(), ...options?.headers },
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
    }
  };

  /**
   * Gets HTTP headers for JSON API requests.
   *
   * @returns Headers with JSON content type and optional bearer token.
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.options.accessToken) {
      headers['Authorization'] = `Bearer ${this.options.accessToken}`;
    }
    return headers;
  }

  /**
   * Gets the HTTP client to use for requests.
   *
   * @returns Injected HTTP client when provided, otherwise the default fetch-based client.
   */
  private getHttpClient(): HttpClient {
    return this._httpClient ?? this.defaultHttpClient;
  }

  /**
   * Builds a URL relative to the configured base URL.
   *
   * Undefined and null query params are omitted. Values are stringified.
   *
   * @param path - Relative API path to append to the configured base URL.
   * @param params - Optional query parameters to encode onto the URL.
   * @returns Fully-qualified request URL string.
   */
  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const url = new URL(path, this.options.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  /**
   * Wraps a request with consistent error handling.
   *
   * @param fn - Async request function to execute.
   * @returns The resolved value from the request function.
   * @throws ApiError when the server responds with a non-2xx status.
   * @throws NetworkError for network failures or unexpected exceptions.
   */
  private async request<T>(fn: () => Promise<T>): Promise<T> {
    let lastTimeoutError: NetworkError | undefined;

    for (let attempt = 0; attempt <= MAX_TIMEOUT_RETRIES; attempt++) {
      try {
        const result = await fn();
        this.onRequestSuccess();
        return result;
      } catch (error) {
        if (error instanceof Response) {
          // Server responded (even with an error status) - connection is alive, reset backoff
          this.onRequestSuccess();
          let body: Record<string, unknown> = {};
          try {
            body = await error.json();
          } catch (parseError) {
            // SyntaxError is expected when server returns non-JSON error response (e.g., HTML error page)
            if (!(parseError instanceof SyntaxError)) {
              console.warn('[CardsClient] Unexpected error parsing error response:', parseError);
            }
          }
          const message =
            (body['error'] as string | undefined) || (body['message'] as string | undefined) || error.statusText;
          const code = (body['code'] as string | undefined) || String(error.status);
          const fields = body['fields'] as Array<{ field: string; message: string }> | undefined;
          throw new ApiError(message, code, fields);
        }

        // Network or timeout failure - increase backoff for next attempt
        this.onRequestFailure();

        if (error instanceof DOMException && error.name === 'TimeoutError') {
          lastTimeoutError = new NetworkError('Request timed out', error);
          // Retry on timeout - onRequestFailure() already increased _currentTimeoutMs
          continue;
        }

        // Non-timeout network errors (DNS failure, connection refused) are not retried
        throw new NetworkError('Request failed', error instanceof Error ? error : undefined);
      }
    }

    // All retry attempts exhausted
    throw lastTimeoutError!;
  }

  // --- Card Operations ---

  /**
   * Lists cards with optional filtering.
   *
   * @param options - Optional filter and pagination options.
   * @returns Promise resolving to matching cards.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async listCards(options?: ListCardsOptions): Promise<Card[]> {
    const urlStr = this.buildUrl('/cards', {
      workspacePath: this.options.workspacePath,
      status: options?.status,
      search: options?.search,
      limit: options?.limit,
      offset: options?.offset
    });
    const url = new URL(urlStr);
    for (const t of options?.tags ?? []) {
      url.searchParams.append('tag', t);
    }
    return this.request(() => this.getHttpClient().get<Card[]>(url.toString()));
  }

  /**
   * Gets a single card by id.
   *
   * @param cardId - The id of the card to retrieve.
   * @returns Promise resolving to the card.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getCard(cardId: string): Promise<Card> {
    const url = this.buildUrl(`/cards/${cardId}`, {
      workspacePath: this.options.workspacePath
    });
    return this.request(() => this.getHttpClient().get<Card>(url));
  }

  /**
   * Creates a new card.
   *
   * @param data - Card creation payload.
   * @returns Promise resolving to the created card.
   * @throws ApiError when the server rejects the payload.
   * @throws NetworkError when the request fails to reach the server.
   */
  async createCard(data: CardCreateData): Promise<Card> {
    const url = this.buildUrl('/cards');
    const body = {
      ...data,
      workspacePath: this.options.workspacePath
    };
    return this.request(() => this.getHttpClient().post<Card>(url, body));
  }

  /**
   * Updates an existing card.
   *
   * @param cardId - The id of the card to update.
   * @param data - The fields to update.
   * @returns Promise resolving to the updated card.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async updateCard(cardId: string, data: CardUpdateData): Promise<Card> {
    const url = this.buildUrl(`/cards/${cardId}`);
    return this.request(() => this.getHttpClient().patch<Card>(url, data));
  }

  /**
   * Deletes a card.
   *
   * @param cardId - The id of the card to delete.
   * @returns Promise resolving when deletion is complete.
   * @throws ApiError when the server rejects the delete.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async deleteCard(cardId: string): Promise<void> {
    const url = this.buildUrl(`/cards/${cardId}`);
    return this.request(() => this.getHttpClient().delete(url));
  }

  // --- Comment Operations ---

  /**
   * Gets all comments for a card.
   *
   * @param cardId - Identifier of the target card for this request.
   * @returns Promise resolving to the comment list.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getComments(cardId: string): Promise<Comment[]> {
    const url = this.buildUrl(`/cards/${cardId}/comments`);
    return this.request(() => this.getHttpClient().get<Comment[]>(url));
  }

  /**
   * Gets a single comment by id.
   *
   * @param cardId - Identifier of the card that owns the requested comment.
   * @param commentId - Identifier of the comment to retrieve.
   * @returns Promise resolving to the comment.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getComment(cardId: string, commentId: string): Promise<Comment> {
    const url = this.buildUrl(`/cards/${cardId}/comments/${commentId}`);
    return this.request(() => this.getHttpClient().get<Comment>(url));
  }

  /**
   * Creates a new comment on a card.
   *
   * @param cardId - Identifier of the card that will receive the new comment.
   * @param data - Comment creation payload.
   * @returns Promise resolving to the created comment.
   * @throws ApiError when the server rejects the payload.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async createComment(cardId: string, data: CommentCreateData): Promise<Comment> {
    const url = this.buildUrl(`/cards/${cardId}/comments`);
    return this.request(() => this.getHttpClient().post<Comment>(url, data));
  }

  /**
   * Updates an existing comment.
   *
   * @param cardId - Identifier of the card that owns the comment.
   * @param commentId - Identifier of the comment to update.
   * @param data - Comment update payload.
   * @returns Promise resolving to the updated comment.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async updateComment(cardId: string, commentId: string, data: CommentUpdateData): Promise<Comment> {
    const url = this.buildUrl(`/cards/${cardId}/comments/${commentId}`);
    return this.request(() => this.getHttpClient().patch<Comment>(url, data));
  }

  /**
   * Deletes a comment.
   *
   * @param cardId - Identifier of the card that owns the comment.
   * @param commentId - Identifier of the comment to remove.
   * @returns Promise resolving when deletion is complete.
   * @throws ApiError when the server rejects the delete.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async deleteComment(cardId: string, commentId: string): Promise<void> {
    const url = this.buildUrl(`/cards/${cardId}/comments/${commentId}`);
    return this.request(() => this.getHttpClient().delete(url));
  }

  // --- Attachment Operations ---

  /**
   * Uploads an attachment to a card using binary PUT.
   *
   * This is the preferred method - sends raw binary data directly without
   * base64 encoding, resulting in 33% smaller payloads.
   *
   * @param cardId - Identifier of the card that will receive the attachment.
   * @param name - File name including extension.
   * @param data - Binary data as Blob, ArrayBuffer, or base64 string.
   * @returns Promise resolving to attachment metadata.
   * @throws ApiError when the server rejects the upload.
   * @throws NetworkError when the request fails to reach the server.
   */
  async uploadAttachment(cardId: string, name: string, data: Blob | ArrayBuffer | string): Promise<AttachmentResponse> {
    const url = this.buildUrl(`/cards/${cardId}/attachments/${encodeURIComponent(name)}`);

    // Convert data to Blob for fetch body
    let body: Blob;
    if (data instanceof Blob) {
      body = data;
    } else if (data instanceof ArrayBuffer) {
      body = new Blob([data]);
    } else {
      // base64 string - decode to binary
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      body = new Blob([bytes]);
    }

    return this.request(async () => {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/octet-stream'
        },
        body,
        signal: this.getTimeoutSignal()
      });
      if (!response.ok) throw response;
      return response.json() as Promise<AttachmentResponse>;
    });
  }

  /**
   * Downloads an attachment as a Blob.
   *
   * This method uses `fetch` directly so binary data is preserved.
   *
   * @param cardId - Identifier of the card that owns the attachment.
   * @param attachmentId - Identifier of the attachment blob to download.
   * @returns Promise resolving to an attachment Blob.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getAttachment(cardId: string, attachmentId: string): Promise<Blob> {
    const url = this.buildUrl(`/cards/${cardId}/attachments/${attachmentId}`);
    return this.request(async () => {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: this.getTimeoutSignal()
      });
      if (!response.ok) throw response;
      return response.blob();
    });
  }

  /**
   * Lists attachments for a card.
   *
   * @param cardId - Identifier of the card whose attachments should be listed.
   * @returns Promise resolving to attachment metadata.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async listAttachments(cardId: string): Promise<AttachmentResponse[]> {
    const url = this.buildUrl(`/cards/${cardId}/attachments`);
    return this.request(() => this.getHttpClient().get<AttachmentResponse[]>(url));
  }

  // --- Timeline Operations ---

  /**
   * Gets timeline entries for a card with optional pagination.
   *
   * @param cardId - Identifier of the card whose timeline entries should be returned.
   * @param options - Optional pagination controls.
   * @returns Promise resolving to timeline entries.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getTimeline(cardId: string, options?: TimelineOptions): Promise<TimelineItem[]> {
    const url = this.buildUrl(`/cards/${cardId}/timeline`, {
      before: options?.before,
      limit: options?.limit
    });
    return this.request(() => this.getHttpClient().get<TimelineItem[]>(url));
  }

  // --- Plan Operations ---

  /**
   * Gets the plan document for a card as markdown.
   *
   * @param cardId - Identifier of the card whose plan markdown should be returned.
   * @returns Promise resolving to plan markdown.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getPlan(cardId: string): Promise<string> {
    const url = this.buildUrl(`/cards/${cardId}/plan`);
    const response = await this.request(() => this.getHttpClient().get<{ content: string }>(url));
    return response.content;
  }

  /**
   * Updates the plan document for a card.
   *
   * @param cardId - Identifier of the card whose plan markdown should be updated.
   * @param content - Plan markdown content.
   * @returns Promise resolving when the plan is saved.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async updatePlan(cardId: string, content: string): Promise<void> {
    const url = this.buildUrl(`/cards/${cardId}/plan`);
    return this.request(() => this.getHttpClient().put<void>(url, content));
  }

  // --- Gate Operations ---

  /**
   * Approves a gate for a card.
   *
   * @param cardId - Identifier of the card whose gate state should be updated.
   * @param gateName - Gate name to approve.
   * @returns Promise resolving to gate approval metadata.
   * @throws ApiError when the server rejects the approval.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async approveGate(cardId: string, gateName: 'plan' | 'review'): Promise<GateApprovalResponse> {
    const url = this.buildUrl(`/cards/${cardId}/gates/${gateName}/approve`);
    return this.request(() => this.getHttpClient().post<GateApprovalResponse>(url, undefined));
  }

  // --- Commit Operations ---

  /**
   * Gets all commits associated with a card.
   *
   * @param cardId - Identifier of the card whose commits should be returned.
   * @returns Promise resolving to commit metadata.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getCommits(cardId: string): Promise<CommitInfo[]> {
    const url = this.buildUrl(`/cards/${cardId}/commits`);
    return this.request(() => this.getHttpClient().get<CommitInfo[]>(url));
  }

  /**
   * Adds a commit to a card.
   *
   * @param cardId - Identifier of the card to associate with the commit SHA.
   * @param sha - Git commit sha.
   * @returns Promise resolving to commit metadata.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   */
  async addCommit(cardId: string, sha: string): Promise<CommitInfo> {
    const url = this.buildUrl(`/cards/${cardId}/commits`);
    return this.request(() => this.getHttpClient().post<CommitInfo>(url, { sha }));
  }

  /**
   * Removes a commit from a card.
   *
   * @param cardId - Identifier of the card to detach from the commit SHA.
   * @param sha - Git commit sha.
   * @returns Promise resolving when removal is complete.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   */
  async removeCommit(cardId: string, sha: string): Promise<void> {
    const url = this.buildUrl(`/cards/${cardId}/commits/${sha}`);
    return this.request(() => this.getHttpClient().delete(url));
  }

  // --- Branch Operations ---

  /**
   * Gets all branches tracked on a card.
   *
   * @param cardId - Unique identifier of the card whose branches to retrieve.
   * @param options - Optional query parameters.
   * @param options.workspacePath - Workspace path for computing isMerged and commit containment.
   * @returns Promise resolving to branches response.
   */
  async getBranches(cardId: string, options?: { workspacePath?: string }): Promise<BranchesResponse> {
    const url = this.buildUrl(`/cards/${cardId}/branches`, {
      workspacePath: options?.workspacePath
    });
    return this.request(() => this.getHttpClient().get<BranchesResponse>(url));
  }

  /**
   * Adds a branch to a card.
   *
   * @param cardId - Unique identifier of the card to add the branch to.
   * @param data - Branch data including name and optional worktree path.
   * @returns Promise resolving when the branch is added.
   */
  async addBranch(cardId: string, data: AddBranchRequest): Promise<void> {
    const url = this.buildUrl(`/cards/${cardId}/branches`);
    await this.request(() => this.getHttpClient().post<unknown>(url, data));
  }

  /**
   * Removes a branch from a card.
   *
   * @param cardId - Unique identifier of the card to remove the branch from.
   * @param name - Branch name to remove (will be URL-encoded).
   * @returns Promise resolving when the branch is removed.
   */
  async removeBranch(cardId: string, name: string): Promise<void> {
    const url = this.buildUrl(`/cards/${cardId}/branches/${encodeURIComponent(name)}`);
    return this.request(() => this.getHttpClient().delete(url));
  }

  // --- Tag Operations ---

  /**
   * Gets all available tags.
   *
   * @returns Promise resolving to tag strings.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getTags(): Promise<string[]> {
    const url = this.buildUrl('/tags', {
      workspacePath: this.options.workspacePath
    });
    return this.request(() => this.getHttpClient().get<string[]>(url));
  }

  // --- Environment Operations ---

  /**
   * Fetches available agent environments.
   *
   * @returns Promise resolving to environment metadata.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getEnvironments(): Promise<Array<{ name: string; description?: string }>> {
    const url = this.buildUrl('/environments');
    return this.request(() => this.getHttpClient().get<Array<{ name: string; description?: string }>>(url));
  }

  // --- Typed File Operations ---

  /**
   * Submits an adaptive card action by writing an `adaptive-card-submission` typed file.
   *
   * @param cardId - The card containing the adaptive card.
   * @param actionId - The action ID from the adaptive card submit action.
   * @param data - The form data collected by the adaptive card.
   * @returns Promise resolving when the submission is persisted.
   * @throws ApiError when the server rejects the submission (e.g. validation failure).
   * @throws NetworkError when the request fails to reach the server.
   */
  async submitCardAction(cardId: string, actionId: string, data: Record<string, unknown>): Promise<void> {
    const fileName = `${actionId}-${Date.now()}.json`;
    const url = this.buildUrl(`/cards/${cardId}/adaptive-card-submission/${encodeURIComponent(fileName)}`);
    const body = { cardId, actionId, data };
    await this.request(() => this.getHttpClient().put<unknown>(url, body));
  }

  // --- Type Schema Operations ---

  /**
   * Gets type schemas and descriptions for a card's environment.
   *
   * Returns metadata about each registered type in the card's environment,
   * including version, schema, and description. Command details are excluded.
   *
   * @param cardId - Identifier of the card whose type schema metadata should be fetched.
   * @returns Promise resolving to type schema information.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getTypeSchemas(cardId: string): Promise<TypeSchemasResponse> {
    const url = this.buildUrl(`/cards/${cardId}/schema`);
    return this.request(() => this.getHttpClient().get<TypeSchemasResponse>(url));
  }

  // --- Stream Operations ---

  /**
   * Lists all streams attached to a card, sorted by creation time.
   *
   * @param cardId - Card ID to query.
   * @returns Stream metadata array (may be empty).
   * @throws ApiError when the server responds with an error (e.g., 404 for unknown card).
   * @throws NetworkError when the request fails to reach the server.
   */
  async listStreams(cardId: string): Promise<StreamMeta[]> {
    const url = this.buildUrl(`/cards/${cardId}/streams`);
    return this.request(() => this.getHttpClient().get<StreamMeta[]>(url));
  }

  /**
   * Retrieves a stream's metadata and all raw lines.
   *
   * The `streamType` and `filename` are URI-encoded automatically. For completed
   * streams the returned `lines` array is the full content; for active streams it
   * is a snapshot that may grow while the caller processes it.
   *
   * @param cardId - Identifier of the card that owns the requested stream.
   * @param streamType - Stream type key (e.g., `"claude-code-session"`).
   * @param filename - Stream filename (e.g., `"session.log"`).
   * @returns Metadata and content lines.
   * @throws ApiError on 404 (unknown card or stream) or other server errors.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getStream(
    cardId: string,
    streamType: string,
    filename: string
  ): Promise<{ meta: StreamMeta; lines: string[] }> {
    const url = this.buildUrl(
      `/cards/${cardId}/streams/${encodeURIComponent(streamType)}/${encodeURIComponent(filename)}`
    );
    return this.request(() => this.getHttpClient().get<{ meta: StreamMeta; lines: string[] }>(url));
  }

  /**
   * Opens a chunked JSONL stream to the server and returns a writer.
   *
   * The writer sends each line in real-time over a single HTTP POST using a
   * `ReadableStream` body. Call {@link StreamWriter.close} when the producer
   * is finished to end the request and retrieve the server's summary.
   *
   * @param cardId - Card ID to attach the stream to.
   * @param streamType - Stream type key from settings.json (e.g., `"claude-code-session"`).
   * @param filename - Stream filename (e.g., `"session-abc.jsonl"`).
   * @param options - Optional title and session ID metadata.
   * @returns A {@link StreamWriter} for pushing lines and closing the stream.
   *
   * @example
   * ```typescript
   * const stream = client.openStream(cardId, 'claude-code-session', 'run.jsonl');
   * stream.write(JSON.stringify({ type: 'init' }));
   * stream.write(JSON.stringify({ type: 'result' }));
   * const result = await stream.close();
   * ```
   */
  openStream(cardId: string, streamType: string, filename: string, options?: StreamWriterOptions): StreamWriter {
    const encoder = new TextEncoder();
    let controller!: ReadableStreamDefaultController<Uint8Array>;

    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      }
    });

    const url = this.buildUrl(
      `/cards/${cardId}/streams/${encodeURIComponent(streamType)}/${encodeURIComponent(filename)}`
    );

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-ndjson'
    };
    if (this.options.accessToken) {
      headers['Authorization'] = `Bearer ${this.options.accessToken}`;
    }
    if (options?.title) {
      headers['X-Stream-Title'] = options.title;
    }
    if (options?.sessionId) {
      headers['X-Stream-Session-Id'] = options.sessionId;
    }

    // `duplex: 'half'` is required by undici for streaming request bodies
    // but is not yet in the standard lib.dom RequestInit type.
    const fetchOptions: RequestInit & { duplex: string } = {
      method: 'POST',
      headers,
      body,
      duplex: 'half'
    };

    const responsePromise = fetch(url, fetchOptions);

    // Track early rejection from the server (e.g. 409 "Stream already
    // exists and is active").  For a successful stream the response stays
    // pending until close() ends the body — but error responses arrive
    // immediately and must be surfaced without waiting for close().
    // Note: only reads response.ok/statusText (not the body) so close()
    // can still parse the full error response.
    let earlyError: Error | null = null;
    responsePromise
      .then((response) => {
        if (!response.ok) {
          earlyError = new ApiError(response.statusText, String(response.status));
        }
      })
      .catch((err: unknown) => {
        earlyError = err instanceof Error ? err : new Error(String(err));
      });

    return {
      write(line: string): void {
        if (earlyError) throw earlyError;
        controller.enqueue(encoder.encode(`${line}\n`));
      },
      close: async (): Promise<StreamResult> => {
        controller.close();
        return this.request(async () => {
          const response = await responsePromise;
          if (!response.ok) throw response;
          return response.json() as Promise<StreamResult>;
        });
      }
    };
  }

  /**
   * Opens a WebSocket-backed JSONL stream to the server and returns a session.
   *
   * The session keeps a persistent WebSocket connection for the entire session
   * lifetime. The server sends a `ready` message with `resumeFrom` before the
   * caller writes any lines, so the watcher can skip lines the server already has.
   *
   * Call {@link WsStreamSession.close} when the producer is finished to send a
   * graceful close message and await the server's acknowledgement.
   *
   * @param cardId - Card ID to attach the stream to.
   * @param streamType - Stream type key from settings.json (e.g., `"claude-code-session"`).
   * @param filename - Stream filename (e.g., `"session-abc.jsonl"`).
   * @param options - Title and session ID metadata forwarded to the server as URL query parameters.
   * @param wsFactory - WebSocket factory for creating the connection. Use the `ws` package in Node.js environments.
   * @returns A {@link WsStreamSession} with `resumeFrom` set to the server's current line count.
   * @throws Error when the WebSocket fails to connect or the server sends an error before `ready`.
   */
  async openStreamWebSocket(
    cardId: string,
    streamType: string,
    filename: string,
    options: StreamWriterOptions,
    wsFactory: IngestWsFactory
  ): Promise<WsStreamSession> {
    const factory = wsFactory;

    // Convert http/https to ws/wss
    const baseUrl = this.options.baseUrl.replace(/^http/, 'ws');
    const basePath = `${baseUrl}/cards/${encodeURIComponent(cardId)}/streams/${encodeURIComponent(streamType)}/${encodeURIComponent(filename)}`;
    const queryParams = new URLSearchParams();
    if (options?.title) queryParams.set('title', options.title);
    if (options?.sessionId) queryParams.set('sessionId', options.sessionId);
    const queryString = queryParams.toString();
    const url = queryString ? `${basePath}?${queryString}` : basePath;

    const headers: Record<string, string> = {};
    if (this.options.accessToken) {
      headers['Authorization'] = `Bearer ${this.options.accessToken}`;
    }

    const ws = factory(url, { headers });

    // Await the 'ready' message from the server before returning to the caller.
    // Any error or premature close before 'ready' rejects the promise.
    const resumeFrom = await new Promise<number>((resolve, reject) => {
      const onReady = (event: MessageEvent<unknown>) => {
        try {
          const msg = JSON.parse(String(event.data)) as { type: string; resumeFrom?: number; message?: string };
          if (msg.type === 'ready') {
            ws.removeEventListener('message', onReady);
            ws.removeEventListener('error', onError);
            ws.removeEventListener('close', onClose);
            resolve(msg.resumeFrom ?? 0);
          } else if (msg.type === 'error') {
            ws.removeEventListener('message', onReady);
            ws.removeEventListener('error', onError);
            ws.removeEventListener('close', onClose);
            reject(new Error(msg.message ?? 'Server error'));
          }
          // Other message types before 'ready' are silently ignored
        } catch {
          reject(new Error('Failed to parse server ready message'));
        }
      };
      const onError = (event: Event) => {
        ws.removeEventListener('message', onReady);
        ws.removeEventListener('error', onError);
        ws.removeEventListener('close', onClose);
        reject(new Error(`WebSocket error: ${String(event)}`));
      };
      const onClose = (event: CloseEvent) => {
        ws.removeEventListener('message', onReady);
        ws.removeEventListener('error', onError);
        ws.removeEventListener('close', onClose);
        reject(new Error(`WebSocket closed before ready: code=${String(event.code)}`));
      };
      ws.addEventListener('message', onReady);
      ws.addEventListener('error', onError);
      ws.addEventListener('close', onClose);
    });

    let linesSent = resumeFrom;

    return {
      get resumeFrom(): number {
        return resumeFrom;
      },
      get linesSent(): number {
        return linesSent;
      },
      write(line: string): void {
        linesSent++;
        ws.send(JSON.stringify({ type: 'line', lineNumber: linesSent, content: line }));
      },
      async close(): Promise<StreamResult> {
        ws.send(JSON.stringify({ type: 'close' }));
        await new Promise<void>((resolve) => {
          const onClose = () => {
            ws.removeEventListener('close', onClose);
            resolve();
          };
          ws.addEventListener('close', onClose);
          // If already closed, resolve immediately
          if (ws.readyState === ws.CLOSED) {
            ws.removeEventListener('close', onClose);
            resolve();
          }
        });
        return {
          filename,
          streamType,
          lineCount: linesSent,
          status: 'completed'
        };
      }
    };
  }

  // --- Compare Operations ---

  /**
   * Sets or replaces the active comparison on the server.
   *
   * @param request - Compare request specifying the comparison mode.
   * @returns Promise resolving to the resulting compare state.
   */
  async setCompare(request: CompareRequest): Promise<CompareState> {
    const url = this.buildUrl('/compare');
    return this.request(() => this.getHttpClient().post<CompareState>(url, request));
  }

  /**
   * Returns the current compare state, or null if no comparison is active.
   *
   * The server returns 204 when no comparison is active, which this method
   * maps to null rather than throwing.
   *
   * @returns Promise resolving to the current compare state, or null if none active.
   */
  async getCompare(): Promise<CompareState | null> {
    const url = this.buildUrl('/compare');
    return this.request(async () => {
      const response = await fetch(url, {
        headers: this.getHeaders() as Record<string, string>,
        signal: this.getTimeoutSignal()
      });
      if (response.status === 204) {
        return null;
      }
      if (!response.ok) throw response;
      return response.json() as Promise<CompareState>;
    });
  }

  /**
   * Clears the active comparison on the server.
   *
   * @returns Promise resolving when the comparison is cleared.
   */
  async clearCompare(): Promise<void> {
    const url = this.buildUrl('/compare');
    return this.request(() => this.getHttpClient().delete(url));
  }
}
