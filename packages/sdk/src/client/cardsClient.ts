/**
 * HTTP client for the Cards V2 REST API.
 *
 *
 * @summary HTTP client for the Cards V2 REST API
 * @module sdk/CardsClient
 */

import type {
  ActionResult,
  Card,
  CompareRequest,
  CompareState,
  HttpClient,
  StreamMeta,
  TimelineItem
} from '../protocol/index.js';
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
  ListCardsOptions,
  StreamResult,
  StreamWriter,
  StreamWriterOptions,
  TimelineOptions,
  TypeSchemasResponse
} from './types/client.js';
import { ApiError, NetworkError } from './types/errors.js';

/** Fetch timeout in milliseconds for each individual request attempt. */
const REQUEST_TIMEOUT_MS = 3_000;

/** Initial delay before retrying a failed network request (3 seconds). */
const INITIAL_RETRY_DELAY_MS = 3_000;

/** Maximum delay between retries (30 seconds). Once reached, retries continue at this interval. */
const MAX_RETRY_DELAY_MS = 30_000;

/**
 * Type-safe HTTP client for the Cards V2 REST API.
 *
 * Uses the Fetch API by default and supports dependency injection of an
 * alternate {@link HttpClient} for tests or custom transports. All public
 * methods surface server failures as {@link ApiError} and transport failures
 * as {@link NetworkError}.
 *
 * All network errors (timeouts, connection refused, DNS failures) are retried
 * with exponential backoff: 3s → 6s → 12s → 24s → 30s cap, then every 30s
 * indefinitely until the server responds. HTTP error responses (4xx, 5xx) are
 * not retried — they surface immediately as {@link ApiError}.
 *
 * @example
 * ```typescript
 * const client = new CardsClient({ baseUrl: 'http://localhost:3000', accessToken: 'token' });
 *
 * const cards = await client.listCards({ status: 'active' });
 * await client.updateCard(cardId, { status: 'done' });
 * ```
 */
export class CardsClient {
  private readonly _httpClient?: HttpClient;

  /** Current fetch timeout in milliseconds. Reset to {@link REQUEST_TIMEOUT_MS} on each successful response. */
  private _currentTimeoutMs = REQUEST_TIMEOUT_MS;

  /**
   * Creates a new CardsClient instance.
   *
   * @param options - Configuration options including base URL and auth token.
   * @param httpClient - Optional HTTP client for dependency injection.
   */
  constructor(
    private options: CardsClientOptions,
    httpClient?: HttpClient
  ) {
    this._httpClient = httpClient;
  }

  /**
   * Replaces the access token used for subsequent API requests.
   *
   * @param token - The new access token to use for authentication.
   */
  updateAccessToken(token: string): void {
    this.options = { ...this.options, accessToken: token };
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
    this._currentTimeoutMs = REQUEST_TIMEOUT_MS;
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
   * Wraps a request with consistent error handling and automatic retry.
   *
   * HTTP error responses (4xx, 5xx) surface immediately as {@link ApiError}
   * since the server is reachable and the request was rejected on its merits.
   *
   * All network errors — timeouts, connection refused, DNS failures — are
   * retried with exponential backoff: starting at 3s, doubling each attempt
   * up to a 30s cap, then retrying every 30s indefinitely until the server
   * responds.
   *
   * @param fn - Async request function to execute.
   * @returns The resolved value from the request function.
   * @throws ApiError when the server responds with a non-2xx status.
   */
  private async request<T>(fn: () => Promise<T>): Promise<T> {
    let retryDelayMs = INITIAL_RETRY_DELAY_MS;

    while (true) {
      try {
        const result = await fn();
        this.onRequestSuccess();
        return result;
      } catch (error) {
        if (error instanceof Response) {
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

        // Network error — retry with exponential backoff delay
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_DELAY_MS);
        this.onRequestSuccess();
      }
    }
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
   * Lists cards as lightweight summaries for list views.
   *
   * Returns pre-flattened fields suitable for direct use in list rendering,
   * omitting heavyweight fields like `planContent` and `repositoryPath`.
   *
   * @template T - The expected summary shape (default `Record<string, unknown>`).
   * @returns Promise resolving to card summaries.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async listCardSummaries<T = Record<string, unknown>>(): Promise<T[]> {
    const url = this.buildUrl('/cards/list', {
      workspacePath: this.options.workspacePath
    });
    return this.request(() => this.getHttpClient().get<T[]>(url));
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
  /**
   * Writes a file to a card repository.
   *
   * @param cardId - Identifier of the card whose repository should receive the file.
   * @param filePath - Relative path within the card repo (e.g. `PLAN.md`, `foo/BAR.md`).
   * @param content - File content to write.
   * @returns Promise resolving when the file is saved.
   * @throws ApiError when the server rejects the write.
   * @throws NetworkError when the request fails to reach the server.
   */
  async putFile(cardId: string, filePath: string, content: string): Promise<void> {
    const url = this.buildUrl(`/cards/${cardId}/fs/${filePath}`);
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
  async approveGate(cardId: string, gateName: 'plan' | 'mergeRequest'): Promise<GateApprovalResponse> {
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
   * @param options - Optional parameters.
   * @param options.sessionId - Claude Code session ID forwarded as `X-Cards-Session-Id` header so the card repo post-commit hook can attribute the commit.
   * @returns Promise resolving when removal is complete.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   */
  async removeCommit(cardId: string, sha: string, options?: { sessionId?: string }): Promise<void> {
    const url = this.buildUrl(`/cards/${cardId}/commits/${sha}`);
    const headers: Record<string, string> = {};
    if (options?.sessionId) {
      headers['X-Cards-Session-Id'] = options.sessionId;
    }
    return this.request(() => this.getHttpClient().delete(url, { headers }));
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
   * @param options - Optional parameters.
   * @param options.sessionId - Claude Code session ID forwarded as `X-Cards-Session-Id` header so the card repo post-commit hook can attribute the commit.
   * @returns Promise resolving when the branch is added.
   */
  async addBranch(cardId: string, data: AddBranchRequest, options?: { sessionId?: string }): Promise<void> {
    const url = this.buildUrl(`/cards/${cardId}/branches`);
    const headers: Record<string, string> = {};
    if (options?.sessionId) {
      headers['X-Cards-Session-Id'] = options.sessionId;
    }
    await this.request(() => this.getHttpClient().post<unknown>(url, data, { headers }));
  }

  /**
   * Removes a branch from a card.
   *
   * @param cardId - Unique identifier of the card to remove the branch from.
   * @param name - Branch name to remove (will be URL-encoded).
   * @param options - Optional parameters.
   * @param options.sessionId - Claude Code session ID forwarded as `X-Cards-Session-Id` header so the card repo post-commit hook can attribute the commit.
   * @returns Promise resolving when the branch is removed.
   */
  async removeBranch(cardId: string, name: string, options?: { sessionId?: string }): Promise<void> {
    const url = this.buildUrl(`/cards/${cardId}/branches/${encodeURIComponent(name)}`);
    const headers: Record<string, string> = {};
    if (options?.sessionId) {
      headers['X-Cards-Session-Id'] = options.sessionId;
    }
    return this.request(() => this.getHttpClient().delete(url, { headers }));
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

  // --- Action Operations ---

  /**
   * Executes an action on a card via the server relay.
   *
   * @param cardId - Identifier of the card to execute the action on.
   * @param actionName - Action identifier (e.g., 'launch').
   * @returns Promise resolving to the action execution result.
   * @throws ApiError when the server rejects the request.
   * @throws NetworkError when the request fails to reach the server.
   */
  async executeAction(cardId: string, actionName: string): Promise<ActionResult> {
    const url = this.buildUrl(`/cards/${cardId}/actions/${encodeURIComponent(actionName)}`);
    return this.request(() => this.getHttpClient().post<ActionResult>(url, undefined));
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
