import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

import { resolve as __resolve } from 'node:path';
const __DEFAULT_LOG_DEST = ".cards/logs/cards-default-configuration-hooks.log";
const __workspace = process.env['WORKSPACE_PATH'];
if (__workspace && !process.env['CARDS_HOOKS_LOG_FILE']) {
  process.env['CARDS_HOOKS_LOG_FILE'] = __resolve(__workspace, __DEFAULT_LOG_DEST);
}

// src/actions/interview.ts
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

// ../sdk/src/client/types/errors.ts
var ApiError = class extends Error {
  /**
   * Creates a new ApiError instance.
   *
   * @param message - Human-readable error message
   * @param code - Machine-readable error code
   * @param fields - Optional array of field-specific validation errors
   */
  constructor(message, code, fields) {
    super(message);
    this.code = code;
    this.fields = fields;
    this.name = "ApiError";
  }
};
var NetworkError = class extends Error {
  /**
   * Creates a new NetworkError instance.
   *
   * @param message - Human-readable error message
   * @param cause - Optional underlying error that caused this network failure
   */
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "NetworkError";
  }
};

// ../sdk/src/client/cardsClient.ts
var INITIAL_TIMEOUT_MS = 1e3;
var MAX_TIMEOUT_MS = 1e4;
var CardsClient = class {
  /**
   * Creates a new CardsClient instance.
   *
   * @param options - Configuration options including base URL and auth token.
   * @param httpClient - Optional HTTP client for dependency injection.
   */
  constructor(options, httpClient) {
    this.options = options;
    this._httpClient = httpClient;
  }
  _httpClient;
  /** Current timeout in milliseconds, increases with consecutive failures. */
  _currentTimeoutMs = INITIAL_TIMEOUT_MS;
  /**
   * Returns the base URL used to build API requests.
   *
   * @returns The base URL string as provided in {@link CardsClientOptions}.
   */
  getBaseUrl() {
    return this.options.baseUrl;
  }
  /**
   * Returns whether an HTTP client was injected.
   *
   * @returns True if an HTTP client was provided during construction.
   * @internal Used for testing dependency injection.
   */
  hasHttpClient() {
    return this._httpClient !== void 0;
  }
  /**
   * Returns an AbortSignal that fires after the current backoff timeout.
   * Uses caller's signal if provided (for DI/testing), otherwise applies the backoff timeout.
   *
   * @param existingSignal - Optional caller-provided signal to reuse instead of creating a timeout signal.
   * @returns AbortSignal that controls request cancellation for the current operation.
   */
  getTimeoutSignal(existingSignal) {
    if (existingSignal) return existingSignal;
    return AbortSignal.timeout(this._currentTimeoutMs);
  }
  /**
   * Records a successful request and resets the timeout backoff.
   */
  onRequestSuccess() {
    this._currentTimeoutMs = INITIAL_TIMEOUT_MS;
  }
  /**
   * Records a failed request and increases the timeout via exponential backoff.
   */
  onRequestFailure() {
    this._currentTimeoutMs = Math.min(this._currentTimeoutMs * 2, MAX_TIMEOUT_MS);
  }
  /**
   * Default HTTP client implementation using fetch + JSON payloads.
   *
   * Each fetch call includes an AbortSignal.timeout that starts at 1 second
   * and doubles on consecutive failures up to 10 seconds.
   */
  defaultHttpClient = {
    get: async (url, options) => {
      const response = await fetch(url, {
        ...options,
        headers: { ...this.getHeaders(), ...options?.headers },
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
      return response.json();
    },
    post: async (url, body, options) => {
      const response = await fetch(url, {
        ...options,
        method: "POST",
        headers: { ...this.getHeaders(), ...options?.headers },
        body: body ? JSON.stringify(body) : void 0,
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
      return response.json();
    },
    put: async (url, body, options) => {
      const response = await fetch(url, {
        ...options,
        method: "PUT",
        headers: { ...this.getHeaders(), ...options?.headers },
        body: body ? JSON.stringify(body) : void 0,
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
      return response.json();
    },
    patch: async (url, body, options) => {
      const response = await fetch(url, {
        ...options,
        method: "PATCH",
        headers: { ...this.getHeaders(), ...options?.headers },
        body: body ? JSON.stringify(body) : void 0,
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
      return response.json();
    },
    delete: async (url, options) => {
      const response = await fetch(url, {
        ...options,
        method: "DELETE",
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
  getHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (this.options.accessToken) {
      headers["Authorization"] = `Bearer ${this.options.accessToken}`;
    }
    return headers;
  }
  /**
   * Gets the HTTP client to use for requests.
   *
   * @returns Injected HTTP client when provided, otherwise the default fetch-based client.
   */
  getHttpClient() {
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
  buildUrl(path3, params) {
    const url = new URL(path3, this.options.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== void 0 && value !== null) {
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
  async request(fn) {
    try {
      const result = await fn();
      this.onRequestSuccess();
      return result;
    } catch (error) {
      if (error instanceof Response) {
        this.onRequestSuccess();
        let body = {};
        try {
          body = await error.json();
        } catch (parseError) {
          if (!(parseError instanceof SyntaxError)) {
            console.warn("[CardsClient] Unexpected error parsing error response:", parseError);
          }
        }
        const message = body["error"] || body["message"] || error.statusText;
        const code = body["code"] || String(error.status);
        const fields = body["fields"];
        throw new ApiError(message, code, fields);
      }
      this.onRequestFailure();
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new NetworkError("Request timed out", error);
      }
      throw new NetworkError("Request failed", error instanceof Error ? error : void 0);
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
  async listCards(options) {
    const url = this.buildUrl("/cards", {
      workspacePath: this.options.workspacePath,
      status: options?.status,
      tag: options?.tag,
      search: options?.search,
      limit: options?.limit,
      offset: options?.offset
    });
    return this.request(() => this.getHttpClient().get(url));
  }
  /**
   * Gets a single card by id.
   *
   * @param cardId - The id of the card to retrieve.
   * @returns Promise resolving to the card.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getCard(cardId) {
    const url = this.buildUrl(`/cards/${cardId}`);
    return this.request(() => this.getHttpClient().get(url));
  }
  /**
   * Creates a new card.
   *
   * @param data - Card creation payload.
   * @returns Promise resolving to the created card.
   * @throws ApiError when the server rejects the payload.
   * @throws NetworkError when the request fails to reach the server.
   */
  async createCard(data) {
    const url = this.buildUrl("/cards");
    const body = {
      ...data,
      workspacePath: this.options.workspacePath
    };
    return this.request(() => this.getHttpClient().post(url, body));
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
  async updateCard(cardId, data) {
    const url = this.buildUrl(`/cards/${cardId}`);
    return this.request(() => this.getHttpClient().patch(url, data));
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
  async deleteCard(cardId) {
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
  async getComments(cardId) {
    const url = this.buildUrl(`/cards/${cardId}/comments`);
    return this.request(() => this.getHttpClient().get(url));
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
  async getComment(cardId, commentId) {
    const url = this.buildUrl(`/cards/${cardId}/comments/${commentId}`);
    return this.request(() => this.getHttpClient().get(url));
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
  async createComment(cardId, data) {
    const url = this.buildUrl(`/cards/${cardId}/comments`);
    return this.request(() => this.getHttpClient().post(url, data));
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
  async updateComment(cardId, commentId, data) {
    const url = this.buildUrl(`/cards/${cardId}/comments/${commentId}`);
    return this.request(() => this.getHttpClient().patch(url, data));
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
  async deleteComment(cardId, commentId) {
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
  async uploadAttachment(cardId, name, data) {
    const url = this.buildUrl(`/cards/${cardId}/attachments/${encodeURIComponent(name)}`);
    let body;
    if (data instanceof Blob) {
      body = data;
    } else if (data instanceof ArrayBuffer) {
      body = new Blob([data]);
    } else {
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      body = new Blob([bytes]);
    }
    return this.request(async () => {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          ...this.getHeaders(),
          "Content-Type": "application/octet-stream"
        },
        body,
        signal: this.getTimeoutSignal()
      });
      if (!response.ok) throw response;
      return response.json();
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
  async getAttachment(cardId, attachmentId) {
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
  async listAttachments(cardId) {
    const url = this.buildUrl(`/cards/${cardId}/attachments`);
    return this.request(() => this.getHttpClient().get(url));
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
  async getTimeline(cardId, options) {
    const url = this.buildUrl(`/cards/${cardId}/timeline`, {
      before: options?.before,
      limit: options?.limit
    });
    return this.request(() => this.getHttpClient().get(url));
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
  async getPlan(cardId) {
    const url = this.buildUrl(`/cards/${cardId}/plan`);
    const response = await this.request(() => this.getHttpClient().get(url));
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
  async updatePlan(cardId, content) {
    const url = this.buildUrl(`/cards/${cardId}/plan`);
    return this.request(() => this.getHttpClient().put(url, content));
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
  async approveGate(cardId, gateName) {
    const url = this.buildUrl(`/cards/${cardId}/gates/${gateName}/approve`);
    return this.request(() => this.getHttpClient().post(url, void 0));
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
  async getCommits(cardId) {
    const url = this.buildUrl(`/cards/${cardId}/commits`);
    return this.request(() => this.getHttpClient().get(url));
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
  async addCommit(cardId, sha) {
    const url = this.buildUrl(`/cards/${cardId}/commits`);
    return this.request(() => this.getHttpClient().post(url, { sha }));
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
  async removeCommit(cardId, sha) {
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
  async getBranches(cardId, options) {
    const url = this.buildUrl(`/cards/${cardId}/branches`, {
      workspacePath: options?.workspacePath
    });
    return this.request(() => this.getHttpClient().get(url));
  }
  /**
   * Adds a branch to a card.
   *
   * @param cardId - Unique identifier of the card to add the branch to.
   * @param data - Branch data including name and optional worktree path.
   * @returns Promise resolving when the branch is added.
   */
  async addBranch(cardId, data) {
    const url = this.buildUrl(`/cards/${cardId}/branches`);
    await this.request(() => this.getHttpClient().post(url, data));
  }
  /**
   * Removes a branch from a card.
   *
   * @param cardId - Unique identifier of the card to remove the branch from.
   * @param name - Branch name to remove (will be URL-encoded).
   * @returns Promise resolving when the branch is removed.
   */
  async removeBranch(cardId, name) {
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
  async getTags() {
    const url = this.buildUrl("/tags", {
      workspacePath: this.options.workspacePath
    });
    return this.request(() => this.getHttpClient().get(url));
  }
  // --- Environment Operations ---
  /**
   * Fetches available agent environments.
   *
   * @returns Promise resolving to environment metadata.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getEnvironments() {
    const url = this.buildUrl("/environments");
    return this.request(() => this.getHttpClient().get(url));
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
  async submitCardAction(cardId, actionId, data) {
    const fileName = `${actionId}-${Date.now()}.json`;
    const url = this.buildUrl(`/cards/${cardId}/adaptive-card-submission/${encodeURIComponent(fileName)}`);
    const body = { cardId, actionId, data };
    await this.request(() => this.getHttpClient().put(url, body));
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
  async getTypeSchemas(cardId) {
    const url = this.buildUrl(`/cards/${cardId}/schema`);
    return this.request(() => this.getHttpClient().get(url));
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
  async listStreams(cardId) {
    const url = this.buildUrl(`/cards/${cardId}/streams`);
    return this.request(() => this.getHttpClient().get(url));
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
  async getStream(cardId, streamType, filename) {
    const url = this.buildUrl(
      `/cards/${cardId}/streams/${encodeURIComponent(streamType)}/${encodeURIComponent(filename)}`
    );
    return this.request(() => this.getHttpClient().get(url));
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
  openStream(cardId, streamType, filename, options) {
    const encoder = new TextEncoder();
    let controller;
    const body = new ReadableStream({
      start(c) {
        controller = c;
      }
    });
    const url = this.buildUrl(
      `/cards/${cardId}/streams/${encodeURIComponent(streamType)}/${encodeURIComponent(filename)}`
    );
    const headers = {
      "Content-Type": "application/x-ndjson"
    };
    if (this.options.accessToken) {
      headers["Authorization"] = `Bearer ${this.options.accessToken}`;
    }
    if (options?.title) {
      headers["X-Stream-Title"] = options.title;
    }
    if (options?.sessionId) {
      headers["X-Stream-Session-Id"] = options.sessionId;
    }
    const fetchOptions = {
      method: "POST",
      headers,
      body,
      duplex: "half"
    };
    const responsePromise = fetch(url, fetchOptions);
    return {
      write(line) {
        controller.enqueue(encoder.encode(`${line}
`));
      },
      close: async () => {
        controller.close();
        return this.request(async () => {
          const response = await responsePromise;
          if (!response.ok) throw response;
          return response.json();
        });
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
  async setCompare(request) {
    const url = this.buildUrl("/compare");
    return this.request(() => this.getHttpClient().post(url, request));
  }
  /**
   * Returns the current compare state, or null if no comparison is active.
   *
   * The server returns 204 when no comparison is active, which this method
   * maps to null rather than throwing.
   *
   * @returns Promise resolving to the current compare state, or null if none active.
   */
  async getCompare() {
    const url = this.buildUrl("/compare");
    return this.request(async () => {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: this.getTimeoutSignal()
      });
      if (response.status === 204) {
        return null;
      }
      if (!response.ok) throw response;
      return response.json();
    });
  }
  /**
   * Clears the active comparison on the server.
   *
   * @returns Promise resolving when the comparison is cleared.
   */
  async clearCompare() {
    const url = this.buildUrl("/compare");
    return this.request(() => this.getHttpClient().delete(url));
  }
};

// ../sdk/src/config/factories/action.ts
function defineAction(config, handler) {
  const fn = async (input, context) => {
    await handler(input, context);
  };
  fn.factoryType = "action";
  fn.id = config.id;
  fn.actionName = config.actionName;
  fn.description = config.description;
  fn.icon = config.icon;
  fn.supportsBackgroundMode = config.supportsBackgroundMode;
  fn.allowConcurrent = config.allowConcurrent;
  fn.timeout = config.timeout;
  fn.sourcePath = config.sourcePath;
  return fn;
}

// ../sdk/src/config/env.ts
import { readFileSync } from "node:fs";
var CARDS_ENV_VARS = {
  /**
   * Unique identifier for the current card.
   * Available in all actions and type hooks.
   */
  CARD_ID: "CARD_ID",
  /**
   * The environment name from settings.json.
   * Available in all actions and type hooks.
   */
  ENVIRONMENT: "ENVIRONMENT",
  /**
   * Display name of the action button that triggered this handler.
   * Available in actions only (not type hooks).
   */
  ACTION_NAME: "ACTION_NAME",
  /**
   * Card's execution mode, determining UI interaction model.
   * Available in actions only (not type hooks).
   * Valid values: 'interactive' | 'background'
   */
  EXECUTION_MODE: "EXECUTION_MODE",
  /**
   * Cards server base URL for API calls.
   * Available in all actions and type hooks.
   */
  API_BASE_URL: "API_BASE_URL",
  /**
   * Authentication token for API calls.
   * Available in all actions and type hooks.
   */
  API_ACCESS_TOKEN: "API_ACCESS_TOKEN",
  /**
   * Configured coding agent identifier from cards.codingAgent setting.
   * Available in actions only (not type hooks).
   * Optional.
   */
  CODING_AGENT: "CODING_AGENT",
  /**
   * The registered type name.
   * Available in type hooks only.
   */
  TYPE_NAME: "TYPE_NAME",
  /**
   * The type's version string from settings.json configuration.
   * Available in type hooks only.
   */
  TYPE_VERSION: "TYPE_VERSION",
  /**
   * The file name within the type directory.
   * Available in type hooks only.
   */
  FILE_NAME: "FILE_NAME",
  /**
   * Full path to the file.
   * Available in type hooks only.
   */
  FILE_PATH: "FILE_PATH",
  /**
   * File size in bytes.
   * Available in type hooks only.
   */
  FILE_SIZE: "FILE_SIZE",
  /**
   * SHA256 hash of content.
   * Available in type hooks only.
   */
  SHA256: "SHA256",
  /**
   * MIME type of the content.
   * Available in type hooks only.
   */
  CONTENT_TYPE: "CONTENT_TYPE",
  /**
   * Path to the VS Code bundled Node.js interpreter.
   *
   * Set by the extension host from `process.execPath` (with
   * `ELECTRON_RUN_AS_NODE=1`). Commands in settings.json use
   * `$VSCODE_NODE ./bin/...` so they work regardless of
   * whether `node` is on the system PATH.
   *
   * Available in all actions and type hooks.
   */
  VSCODE_NODE: "VSCODE_NODE",
  /**
   * Path to the Node.js interpreter running the wrapper process.
   *
   * Set by the wrapper from `process.execPath`. Use `$NODE` in embedded
   * bash statements to invoke Node scripts portably.
   *
   * Available in all actions.
   */
  NODE: "NODE",
  /**
   * Path to the Unix domain socket for runtime-to-dispatcher communication.
   * Available in actions only.
   */
  SOCKET_PATH: "SOCKET_PATH",
  /**
   * Path to a JSON file containing switchToInteractive data from a previous handler.
   * Available in actions only. Optional.
   */
  SWITCH_TO_INTERACTIVE_DATA_PATH: "SWITCH_TO_INTERACTIVE_DATA_PATH",
  /**
   * Path to the settings configuration directory.
   * Available in actions only.
   */
  CONFIG_PATH: "CONFIG_PATH",
  /**
   * Path to the VS Code workspace root directory.
   * Available in actions only.
   */
  WORKSPACE_PATH: "WORKSPACE_PATH",
  /**
   * Path to the card's repository directory.
   * Available in actions only.
   */
  CARD_REPO_PATH: "CARD_REPO_PATH",
  /**
   * Resolved shell command for the wrapper to spawn as the action handler.
   * Set by ActionDispatcher; consumed by the wrapper (not by action handlers).
   */
  ACTION_COMMAND: "ACTION_COMMAND",
  /**
   * Git branch that the card's workspace branch will merge into.
   * Resolved from the workspace HEAD at launch time.
   * Set by the launch action.
   * Available in actions only.
   */
  BASE_BRANCH: "BASE_BRANCH",
  /**
   * Git branch from which the card's workspace branch was created.
   * May differ from BASE_BRANCH when the worktree was created against
   * a different ref than the current workspace HEAD.
   * Set by the launch action.
   * Available in actions only.
   */
  PARENT_BRANCH: "PARENT_BRANCH",
  /**
   * Git branch name for the card's workspace implementation.
   * Set by the launch action after resolving or creating the worktree.
   * Available in actions only.
   */
  WORKSPACE_BRANCH: "WORKSPACE_BRANCH",
  /**
   * Session ID persisted by the session-start hook via `persistEnvVar`.
   *
   * Available in Bash tool shell descendants (commands, git hooks) after
   * session start. NOT available in hooks spawned directly by Claude Code
   * (stop, session-end, etc.) — those receive the session ID via hook input.
   *
   * The card-repo post-commit hook reads this to record commits directly
   * without needing a process-tree walk or PID registry lookup.
   */
  CARDS_SESSION_ID: "CARDS_SESSION_ID",
  /**
   * Absolute path to the VS Code extension installation directory.
   *
   * Set by the extension host from `context.extensionUri.fsPath` and injected
   * into all spawned action processes. Use this to locate bundled assets such
   * as the runtime plugin directory (`<extensionPath>/dist/plugins/runtime`).
   *
   * Available in actions only (not type hooks).
   */
  EXTENSION_PATH: "EXTENSION_PATH"
};
function getCardId() {
  const value = process.env[CARDS_ENV_VARS.CARD_ID];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CARD_ID}`);
  }
  return value;
}
function getEnvironment() {
  const value = process.env[CARDS_ENV_VARS.ENVIRONMENT];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.ENVIRONMENT}`);
  }
  return value;
}
function getActionName() {
  const value = process.env[CARDS_ENV_VARS.ACTION_NAME];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.ACTION_NAME}`);
  }
  return value;
}
function getExecutionMode() {
  const value = process.env[CARDS_ENV_VARS.EXECUTION_MODE];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.EXECUTION_MODE}`);
  }
  if (value !== "interactive" && value !== "background") {
    throw new Error(`Invalid ${CARDS_ENV_VARS.EXECUTION_MODE}: expected 'interactive' or 'background', got "${value}"`);
  }
  return value;
}
function getApiBaseUrl() {
  const value = process.env[CARDS_ENV_VARS.API_BASE_URL];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.API_BASE_URL}`);
  }
  return value;
}
function getApiAccessToken() {
  const value = process.env[CARDS_ENV_VARS.API_ACCESS_TOKEN];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.API_ACCESS_TOKEN}`);
  }
  return value;
}
function getCodingAgent() {
  const value = process.env[CARDS_ENV_VARS.CODING_AGENT];
  if (value === void 0 || value === "") {
    return void 0;
  }
  return value;
}
function getTypeName() {
  const value = process.env[CARDS_ENV_VARS.TYPE_NAME];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.TYPE_NAME}`);
  }
  return value;
}
function getTypeVersion() {
  const value = process.env[CARDS_ENV_VARS.TYPE_VERSION];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.TYPE_VERSION}`);
  }
  return value;
}
function getFileName() {
  const value = process.env[CARDS_ENV_VARS.FILE_NAME];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.FILE_NAME}`);
  }
  return value;
}
function getFilePath() {
  const value = process.env[CARDS_ENV_VARS.FILE_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.FILE_PATH}`);
  }
  return value;
}
function getFileSize() {
  const value = process.env[CARDS_ENV_VARS.FILE_SIZE];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.FILE_SIZE}`);
  }
  const size = Number.parseInt(value, 10);
  if (Number.isNaN(size)) {
    throw new Error(`Invalid ${CARDS_ENV_VARS.FILE_SIZE}: expected number, got "${value}"`);
  }
  return size;
}
function getSha256() {
  const value = process.env[CARDS_ENV_VARS.SHA256];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.SHA256}`);
  }
  return value;
}
function getContentType() {
  const value = process.env[CARDS_ENV_VARS.CONTENT_TYPE];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CONTENT_TYPE}`);
  }
  return value;
}
function getSwitchToInteractiveDataPath() {
  const value = process.env[CARDS_ENV_VARS.SWITCH_TO_INTERACTIVE_DATA_PATH];
  if (value === void 0 || value === "") {
    return void 0;
  }
  return value;
}
function getConfigPath() {
  const value = process.env[CARDS_ENV_VARS.CONFIG_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CONFIG_PATH}`);
  }
  return value;
}
function getWorkspacePath() {
  const value = process.env[CARDS_ENV_VARS.WORKSPACE_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.WORKSPACE_PATH}`);
  }
  return value;
}
function getCardRepoPath() {
  const value = process.env[CARDS_ENV_VARS.CARD_REPO_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CARD_REPO_PATH}`);
  }
  return value;
}
function getExtensionPath() {
  const value = process.env[CARDS_ENV_VARS.EXTENSION_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.EXTENSION_PATH}`);
  }
  return value;
}
function readSwitchToInteractiveData() {
  const dataPath = getSwitchToInteractiveDataPath();
  if (dataPath === void 0) {
    return void 0;
  }
  const content = readFileSync(dataPath, "utf-8");
  return JSON.parse(content);
}
function extractActionInput() {
  return {
    cardId: getCardId(),
    actionName: getActionName(),
    environment: getEnvironment(),
    executionMode: getExecutionMode(),
    apiBaseUrl: getApiBaseUrl(),
    apiAccessToken: getApiAccessToken(),
    codingAgent: getCodingAgent(),
    switchToInteractiveData: readSwitchToInteractiveData(),
    workspacePath: getWorkspacePath(),
    cardRepoPath: getCardRepoPath(),
    configPath: getConfigPath(),
    extensionPath: getExtensionPath()
  };
}
function extractTypeInput() {
  return {
    cardId: getCardId(),
    environment: getEnvironment(),
    typeName: getTypeName(),
    typeVersion: getTypeVersion(),
    fileName: getFileName(),
    filePath: getFilePath(),
    fileSize: getFileSize(),
    fileSha256: getSha256(),
    contentType: getContentType(),
    apiBaseUrl: getApiBaseUrl(),
    apiAccessToken: getApiAccessToken()
  };
}

// ../sdk/src/config/exit-codes.ts
var EXIT_CODES = {
  /** Handler completed successfully. */
  SUCCESS: 0,
  /** Handler threw an error. */
  ERROR: 1,
  /** Handler processed switchToInteractive and is exiting for relaunch. */
  SWITCH_TO_INTERACTIVE: 42
};
function writeError(message) {
  process.stderr.write(`${message}
`);
}

// ../sdk/src/config/logger.ts
import { closeSync, existsSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";
var LOG_LEVELS = ["debug", "info", "warn", "error"];
var Logger = class {
  /**
   * Registered event handlers by log level.
   */
  handlers = /* @__PURE__ */ new Map();
  /**
   * File descriptor for log file output.
   * Lazily initialized on first write.
   */
  logFileFd = null;
  /**
   * Path to the log file, if configured.
   */
  logFilePath = null;
  /**
   * Whether file initialization has been attempted.
   */
  fileInitialized = false;
  /**
   * Current hook context for enriching log events.
   */
  currentHookType;
  /**
   * Current hook input for enriching log events.
   */
  currentInput;
  /**
   * Creates a new Logger instance.
   *
   * Typically you should use the exported `logger` singleton rather than
   * creating new instances.
   * @param config - Optional configuration
   * @example
   * ```typescript
   * // Use singleton (recommended)
   * import { logger } from '@cards/sdk/config';
   *
   * // Or create custom instance
   * const customLogger = new Logger({ logFilePath: '/var/log/hooks.log' });
   * ```
   */
  constructor(config = {}) {
    for (const level of LOG_LEVELS) {
      this.handlers.set(level, /* @__PURE__ */ new Set());
    }
    this.logFilePath = config.logFilePath ?? process.env["CARDS_HOOKS_LOG_FILE"] ?? null;
  }
  /**
   * Logs a debug message.
   *
   * Use for detailed debugging information that is typically only useful
   * during development or troubleshooting.
   * @param message - Diagnostic text describing low-level execution details.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.debug('Processing hook input', { taskId: 'task-123', inputSize: 256 });
   * ```
   */
  debug(message, context) {
    this.emit("debug", message, context);
  }
  /**
   * Logs an info message.
   *
   * Use for general operational events like hook invocations, successful
   * completions, or state changes.
   * @param message - Operational message describing normal hook progress.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.info('Task started', { taskId: 'task-123', cardId: 'card-456' });
   * ```
   */
  info(message, context) {
    this.emit("info", message, context);
  }
  /**
   * Logs a warning message.
   *
   * Use for conditions that may indicate cards but don't prevent
   * operation, such as deprecated patterns or performance concerns.
   * @param message - Warning text for recoverable or suspicious conditions.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.warn('Deprecated hook pattern detected', { pattern: 'legacyMatcher' });
   * ```
   */
  warn(message, context) {
    this.emit("warn", message, context);
  }
  /**
   * Logs an error message.
   *
   * Use for error conditions that require attention but were handled
   * gracefully. For exceptions, prefer {@link logError}.
   * @param message - Error text describing a handled failure condition.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.error('Failed to validate hook input', { reason: 'empty taskId' });
   * ```
   */
  error(message, context) {
    this.emit("error", message, context);
  }
  /**
   * Logs a structured error with full error details.
   *
   * Use this for caught exceptions. Non-Error values are normalized so handlers
   * always receive a consistent error shape.
   * @param error - The error to log
   * @param message - Human-readable description of what failed
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * try {
   *   await dangerousOperation();
   * } catch (err) {
   *   logger.logError(err, 'Failed to execute dangerous operation', {
   *     operation: 'delete',
   *     target: '/important/file.txt'
   *   });
   * }
   * ```
   */
  logError(error, message, context) {
    const errorInfo = this.extractErrorInfo(error);
    const event = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: "error",
      hookType: this.currentHookType,
      message,
      input: this.currentInput,
      error: errorInfo,
      context
    };
    this.deliverEvent(event);
  }
  /**
   * Subscribes a handler to log events at the specified level.
   *
   * The handler will be called for every log event at the specified level.
   * Returns an unsubscribe function that should be called when the handler
   * is no longer needed. Handler errors are ignored to avoid disrupting hooks.
   * @param level - The log level to subscribe to
   * @param handler - The handler function to call for each event
   * @returns A function to unsubscribe the handler
   * @example
   * ```typescript
   * // Subscribe to error events
   * const unsubscribe = logger.on('error', (event) => {
   *   console.error(`[${event.hookType}] ${event.message}`);
   *   if (event.error) {
   *     console.error(event.error.stack);
   *   }
   * });
   *
   * // Later, clean up
   * unsubscribe();
   * ```
   * @example
   * ```typescript
   * // Forward to external logging library
   * import pino from 'pino';
   * const pinoLogger = pino();
   *
   * logger.on('info', (event) => pinoLogger.info(event, event.message));
   * logger.on('warn', (event) => pinoLogger.warn(event, event.message));
   * logger.on('error', (event) => pinoLogger.error(event, event.message));
   * ```
   */
  on(level, handler) {
    const levelHandlers = this.handlers.get(level);
    if (levelHandlers) {
      levelHandlers.add(handler);
    }
    return () => {
      levelHandlers?.delete(handler);
    };
  }
  /**
   * Sets the current hook context for enriching log events.
   *
   * This is called internally by the runtime before invoking hook handlers.
   * You typically don't need to call this directly.
   * @param hookType - The type of hook being executed
   * @param input - The hook input data
   * @internal
   */
  setContext(hookType, input) {
    this.currentHookType = hookType;
    this.currentInput = input;
  }
  /**
   * Clears the current hook context.
   *
   * Called internally by the runtime after hook execution completes.
   * @internal
   */
  clearContext() {
    this.currentHookType = void 0;
    this.currentInput = void 0;
  }
  /**
   * Sets a default log file path that only takes effect if no other source
   * has configured file logging.
   *
   * This is the lowest-priority file path source. It will be ignored if
   * any of these have already set a path:
   * - `logFilePath` in the constructor config
   * - `CARDS_HOOKS_LOG_FILE` environment variable
   * - {@link setLogFile} called at runtime
   *
   * Intended for use by CLI entry points (e.g., the `--log` flag).
   * @param filePath - Default path to the log file
   * @example
   * ```typescript
   * // Wire --log CLI argument as a fallback
   * if (args.log) {
   *   logger.setDefaultLogFile(args.log);
   * }
   * ```
   */
  setDefaultLogFile(filePath) {
    if (this.logFilePath === null) {
      this.logFilePath = filePath;
      this.fileInitialized = false;
    }
  }
  /**
   * Configures the log file path at runtime.
   *
   * Call this to enable or change file logging. Setting to `null` disables
   * file logging and closes any open file handle. Directories are created
   * on demand when the first write occurs.
   * @param filePath - Path to the log file, or null to disable
   * @example
   * ```typescript
   * // Enable file logging at runtime
   * logger.setLogFile('/var/log/cards-sdk.log');
   *
   * // Disable file logging
   * logger.setLogFile(null);
   * ```
   */
  setLogFile(filePath) {
    if (this.logFileFd !== null) {
      try {
        closeSync(this.logFileFd);
      } catch {
      }
      this.logFileFd = null;
    }
    this.logFilePath = filePath;
    this.fileInitialized = false;
  }
  /**
   * Closes all resources held by the logger.
   *
   * Call this during graceful shutdown to ensure all log data is flushed.
   * Safe to call multiple times.
   * @example
   * ```typescript
   * process.on('exit', () => {
   *   logger.close();
   * });
   * ```
   */
  close() {
    if (this.logFileFd !== null) {
      try {
        closeSync(this.logFileFd);
      } catch {
      }
      this.logFileFd = null;
    }
    this.fileInitialized = false;
  }
  /**
   * Checks if there are any active handlers or destinations.
   *
   * Returns true if any handlers are registered or file logging is enabled.
   * Useful for deciding whether to compute expensive log context.
   * @returns Whether the logger has any active output destinations
   */
  hasDestinations() {
    const hasHandlers = Array.from(this.handlers.values()).some((handlers) => handlers.size > 0);
    return hasHandlers || this.logFilePath !== null;
  }
  // ============================================================================
  // Private Methods
  // ============================================================================
  /**
   * Emits a log event.
   * @param level - The severity level of the event
   * @param message - The log message
   * @param context - Optional additional context data
   */
  emit(level, message, context) {
    const event = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      hookType: this.currentHookType,
      message,
      input: this.currentInput,
      context
    };
    this.deliverEvent(event);
  }
  /**
   * Delivers an event to all registered destinations.
   * @param event - The log event to deliver
   */
  deliverEvent(event) {
    const levelHandlers = this.handlers.get(event.level);
    if (levelHandlers) {
      for (const handler of levelHandlers) {
        try {
          handler(event);
        } catch {
        }
      }
    }
    this.writeToFile(event);
  }
  /**
   * Writes an event to the log file.
   * @param event - The log event to write
   */
  writeToFile(event) {
    if (!this.logFilePath) return;
    if (!this.fileInitialized) {
      this.initializeFile();
    }
    if (this.logFileFd === null) return;
    try {
      const line = `${JSON.stringify(event)}
`;
      writeSync(this.logFileFd, line);
    } catch {
    }
  }
  /**
   * Initializes the log file for writing.
   */
  initializeFile() {
    this.fileInitialized = true;
    if (!this.logFilePath) return;
    try {
      const dir = dirname(this.logFilePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      this.logFileFd = openSync(this.logFilePath, "a");
    } catch {
      this.logFileFd = null;
    }
  }
  /**
   * Extracts structured error information from an unknown error.
   * @param error - The error to extract information from
   * @returns Structured error information
   */
  extractErrorInfo(error) {
    if (error instanceof Error) {
      const info = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
      if (error.cause !== void 0) {
        info.cause = this.extractErrorInfo(error.cause);
      }
      return info;
    }
    return {
      name: "UnknownError",
      message: String(error)
    };
  }
};
var logger = new Logger();

// ../sdk/src/config/socket-client.ts
import * as net from "node:net";
var SocketClient = class _SocketClient {
  socket;
  buffer = "";
  commandHandler;
  constructor(socket) {
    this.socket = socket;
    socket.on("data", (chunk) => {
      this.buffer += chunk.toString();
      const lines = this.buffer.split("\n");
      this.buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim() === "") continue;
        try {
          const parsed = JSON.parse(line);
          this.commandHandler?.(parsed);
        } catch {
        }
      }
    });
  }
  /**
   * Connect to a Unix domain socket at the given path.
   *
   * @param socketPath - Path to the Unix domain socket
   * @returns A connected SocketClient instance
   * @throws Error if the connection fails
   */
  static connect(socketPath) {
    return new Promise((resolve2, reject) => {
      const socket = net.createConnection(socketPath, () => {
        resolve2(new _SocketClient(socket));
      });
      socket.on("error", reject);
    });
  }
  /**
   * Register a handler for incoming socket commands.
   *
   * Only one handler can be registered at a time. Subsequent calls replace
   * the previous handler.
   *
   * @param handler - Function to call when a command is received
   */
  onCommand(handler) {
    this.commandHandler = handler;
  }
  /**
   * Send a response back to the ActionDispatcher.
   *
   * @param response - The response to send as NDJSON
   */
  sendResponse(response) {
    this.socket.write(`${JSON.stringify(response)}
`);
  }
  /**
   * Send a response and call callback when flushed.
   *
   * Used to guarantee flush before process.exit.
   *
   * @param response - The response to send as NDJSON
   * @param callback - Called after the data is flushed to the socket
   */
  sendResponseThen(response, callback) {
    this.socket.write(`${JSON.stringify(response)}
`, callback);
  }
  /**
   * Close the socket connection.
   */
  close() {
    this.socket.destroy();
  }
};

// ../sdk/src/config/runtime.ts
function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function cleanupAndExit(exitCode) {
  logger.clearContext();
  logger.close();
  process.exit(exitCode);
}
function handleEnvExtractionError(error) {
  const message = getErrorMessage(error);
  logger.error(`Failed to extract input from environment: ${message}`);
  writeError(`Handler failed: ${message}`);
  cleanupAndExit(EXIT_CODES.ERROR);
}
function handleHandlerError(error) {
  const errorOutput = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${errorOutput}
`);
  logger.error(`Handler error: ${getErrorMessage(error)}`);
  cleanupAndExit(EXIT_CODES.ERROR);
}
async function executeCommand(command) {
  try {
    let input;
    try {
      if (command.factoryType === "action") {
        input = extractActionInput();
      } else {
        input = extractTypeInput();
      }
    } catch (error) {
      return handleEnvExtractionError(error);
    }
    logger.setContext(command.factoryType, { ...input });
    if (command.factoryType === "action") {
      let socketClient;
      const socketPath = process.env[CARDS_ENV_VARS.SOCKET_PATH];
      if (socketPath) {
        try {
          socketClient = await SocketClient.connect(socketPath);
        } catch (error) {
          logger.warn(`Failed to connect to socket at ${socketPath}: ${getErrorMessage(error)}`);
        }
      }
      let cancelCallback;
      let switchToInteractiveCallback;
      let commandProcessed = false;
      const context = {
        logger,
        cwd: process.cwd(),
        onCancel: (callback) => {
          cancelCallback = callback;
        },
        onSwitchToInteractive: (callback) => {
          switchToInteractiveCallback = callback;
        }
      };
      if (socketClient) {
        socketClient.onCommand((cmd) => {
          if (commandProcessed) return;
          commandProcessed = true;
          if (cmd.type === "cancel") {
            handleCancelCommand(cancelCallback, socketClient);
          } else if (cmd.type === "switchToInteractive") {
            handleSwitchToInteractiveCommand(switchToInteractiveCallback, socketClient);
          }
        });
      }
      try {
        await command(input, context);
      } catch (error) {
        socketClient?.close();
        return handleHandlerError(error);
      }
      socketClient?.close();
      cleanupAndExit(EXIT_CODES.SUCCESS);
    } else {
      const context = {
        logger,
        cwd: process.cwd()
      };
      try {
        await command(input, context);
      } catch (error) {
        return handleHandlerError(error);
      }
      cleanupAndExit(EXIT_CODES.SUCCESS);
    }
  } catch (error) {
    logger.error(`Unexpected runtime error: ${getErrorMessage(error)}`);
    cleanupAndExit(EXIT_CODES.ERROR);
  }
}
function toPromise(result) {
  if (result && typeof result.then === "function") {
    return result;
  }
  return Promise.resolve(result);
}
function handleCancelCommand(callback, socketClient) {
  if (!callback) {
    process.kill(process.pid, "SIGTERM");
    return;
  }
  toPromise(callback()).then(
    () => {
      socketClient?.close();
      cleanupAndExit(EXIT_CODES.ERROR);
    },
    () => {
      socketClient?.close();
      cleanupAndExit(EXIT_CODES.ERROR);
    }
  );
}
function handleSwitchToInteractiveCommand(callback, socketClient) {
  if (!callback) {
    return;
  }
  toPromise(callback()).then(
    (data) => {
      socketClient.sendResponseThen({ type: "switchToInteractiveResponse", data }, () => {
        cleanupAndExit(EXIT_CODES.SWITCH_TO_INTERACTIVE);
      });
    },
    (error) => {
      logger.error(`switchToInteractive callback error: ${getErrorMessage(error)}`);
      socketClient.close();
      cleanupAndExit(EXIT_CODES.ERROR);
    }
  );
}

// src/lib/claude-session.ts
import { execFile as execFile2 } from "node:child_process";
import * as fs2 from "node:fs/promises";
import { homedir } from "node:os";
import * as path2 from "node:path";
import { promisify as promisify2 } from "node:util";

// src/lib/create-worktree.ts
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
function validateBranchName(name) {
  const branchNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/;
  if (!branchNameRegex.test(name)) {
    throw new Error("Error: Invalid branch name format.");
  }
}
function isNestedUnder(dir, parentSet) {
  let current = dir;
  while (current.includes("/")) {
    current = current.substring(0, current.lastIndexOf("/"));
    if (parentSet.has(current)) {
      return true;
    }
  }
  return false;
}
function isInternalSymlink(target) {
  return target.startsWith("../");
}
async function createWorktree(branchName, options) {
  validateBranchName(branchName);
  const { sourceRoot, repoRoot } = await findGitRoots(options?.cwd ?? process.cwd());
  const startPoint = await resolveHead(sourceRoot);
  const worktreeDir = path.join(repoRoot, ".worktrees", branchName);
  const [worktreeExists, branchExists] = await Promise.all([
    checkWorktreeExists(repoRoot, worktreeDir),
    checkBranchExists(repoRoot, branchName)
  ]);
  if (worktreeExists) {
    throw new Error(`Error: Worktree already exists at ${worktreeDir}`);
  }
  await addWorktree({ repoRoot, worktreeDir, branchName, branchExists, startPoint });
  const ignored = await discoverIgnoredPaths(sourceRoot);
  await copyExistingSymlinks(sourceRoot, worktreeDir);
  await symlinkIgnoredPaths({ sourceRoot, worktreeDir, ignored });
  const reroutedCount = await rerouteAllNodeModules({ sourceRoot, worktreeDir, repoRoot });
  const [, baseSha] = await Promise.all([
    updateGitExclude({ worktreeDir, repoRoot, directories: ignored.directories, files: ignored.files }),
    resolveHead(worktreeDir)
  ]);
  const result = {
    branch: branchName,
    worktree: worktreeDir,
    baseSha
  };
  if (reroutedCount > 0) {
    result.reroutedSymlinks = reroutedCount;
  }
  return result;
}
async function findGitRoots(startDir) {
  let currentDir = path.resolve(startDir);
  while (currentDir !== "/") {
    const gitPath = path.join(currentDir, ".git");
    try {
      const stats = await fs.lstat(gitPath);
      if (stats.isDirectory()) {
        return {
          sourceRoot: currentDir,
          repoRoot: currentDir
        };
      }
      if (stats.isFile()) {
        const gitFileContent = await fs.readFile(gitPath, "utf-8");
        const gitdirLine = gitFileContent.trim();
        const gitdirPath = gitdirLine.replace(/^gitdir:\s*/, "");
        const mainGitDir = gitdirPath.replace(/\/worktrees\/[^/]+$/, "");
        const repoRoot = mainGitDir.replace(/\/\.git$/, "");
        return {
          sourceRoot: currentDir,
          repoRoot
        };
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error("Not in a git repository");
}
async function resolveHead(cwd) {
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd, timeout: 5e3 });
  return stdout.trim();
}
async function checkWorktreeExists(repoRoot, worktreeDir) {
  const { stdout } = await execFileAsync("git", ["worktree", "list"], { cwd: repoRoot, timeout: 3e4 });
  return stdout.includes(worktreeDir);
}
async function checkBranchExists(repoRoot, branchName) {
  const { stdout } = await execFileAsync("git", ["branch", "--list", branchName], {
    cwd: repoRoot,
    timeout: 3e4
  });
  return stdout.trim().length > 0;
}
async function addWorktree(opts) {
  const args = opts.branchExists ? ["worktree", "add", opts.worktreeDir, opts.branchName] : ["worktree", "add", "-b", opts.branchName, opts.worktreeDir, opts.startPoint];
  await execFileAsync("git", args, { cwd: opts.repoRoot, timeout: 3e4 });
}
async function discoverIgnoredPaths(sourceRoot) {
  const { stdout } = await execFileAsync(
    "git",
    ["-C", sourceRoot, "ls-files", "--ignored", "--exclude-standard", "--directory", "--others"],
    { cwd: sourceRoot, timeout: 3e4 }
  );
  const lines = stdout.split("\n").filter((line) => line.length > 0 && !line.startsWith(".worktrees"));
  const directories = lines.filter((l) => l.endsWith("/")).map((l) => l.slice(0, -1));
  const files = lines.filter((l) => !l.endsWith("/"));
  return { directories, files };
}
async function symlinkIgnoredPaths(opts) {
  const { sourceRoot, worktreeDir, ignored } = opts;
  const dirSet = new Set(ignored.directories);
  const nonNestedDirs = ignored.directories.filter((dir) => !isNestedUnder(dir, dirSet));
  const createDirSymlink = async (dir) => {
    try {
      const sourcePath = path.join(sourceRoot, dir);
      try {
        await fs.lstat(sourcePath);
      } catch (error) {
        if (error.code === "ENOENT") {
          return false;
        }
        process.stderr.write(
          `create-worktree: unexpected error in lstat: ${error instanceof Error ? error.message : String(error)}
`
        );
        return false;
      }
      const destPath = path.join(worktreeDir, dir);
      const parentDir = path.dirname(dir);
      if (parentDir !== ".") {
        await fs.mkdir(path.join(worktreeDir, parentDir), { recursive: true });
      }
      await fs.symlink(sourcePath, destPath);
      return true;
    } catch (error) {
      const code = error.code;
      if (code === "EEXIST" || code === "ENOENT") {
        return false;
      }
      process.stderr.write(
        `create-worktree: unexpected error in symlink: ${error instanceof Error ? error.message : String(error)}
`
      );
      return false;
    }
  };
  const createFileSymlink = async (file) => {
    try {
      const sourcePath = path.join(sourceRoot, file);
      try {
        await fs.lstat(sourcePath);
      } catch (error) {
        if (error.code === "ENOENT") {
          return false;
        }
        process.stderr.write(
          `create-worktree: unexpected error in lstat: ${error instanceof Error ? error.message : String(error)}
`
        );
        return false;
      }
      const destPath = path.join(worktreeDir, file);
      const parentDir = path.dirname(file);
      if (parentDir !== ".") {
        await fs.mkdir(path.join(worktreeDir, parentDir), { recursive: true });
      }
      await fs.symlink(sourcePath, destPath);
      return true;
    } catch (error) {
      const code = error.code;
      if (code === "EEXIST" || code === "ENOENT") {
        return false;
      }
      process.stderr.write(
        `create-worktree: unexpected error in symlink: ${error instanceof Error ? error.message : String(error)}
`
      );
      return false;
    }
  };
  const dirResults = await Promise.all(nonNestedDirs.map(createDirSymlink));
  const nonNestedFiles = ignored.files.filter((file) => !isNestedUnder(file, dirSet));
  const fileResults = await Promise.all(nonNestedFiles.map(createFileSymlink));
  const dirCount = dirResults.filter((r) => r).length;
  const fileCount = fileResults.filter((r) => r).length;
  return { dirCount, fileCount };
}
async function copyExistingSymlinks(sourceRoot, worktreeDir) {
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
  const symlinks = entries.filter((e) => e.isSymbolicLink() && e.name !== ".git" && e.name !== ".worktrees");
  const copySymlink = async (name) => {
    const destPath = path.join(worktreeDir, name);
    try {
      await fs.lstat(destPath);
      return false;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    const sourceLinkPath = path.join(sourceRoot, name);
    const target = await fs.readlink(sourceLinkPath);
    const resolvedTarget = path.resolve(sourceRoot, target);
    if (resolvedTarget === sourceLinkPath) {
      return false;
    }
    await fs.symlink(sourceLinkPath, destPath);
    return true;
  };
  const results = await Promise.all(symlinks.map((e) => copySymlink(e.name)));
  return results.filter((r) => r).length;
}
async function rerouteNodeModules(opts) {
  const { sourceNodeModules, destNodeModules } = opts;
  try {
    await fs.lstat(sourceNodeModules);
  } catch (error) {
    if (error.code === "ENOENT") {
      return 0;
    }
    throw error;
  }
  try {
    const destStats = await fs.lstat(destNodeModules);
    if (destStats.isSymbolicLink()) {
      await fs.unlink(destNodeModules);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  await fs.mkdir(destNodeModules, { recursive: true });
  const entries = await fs.readdir(sourceNodeModules, { withFileTypes: true });
  const counts = await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(sourceNodeModules, entry.name);
      const destPath = path.join(destNodeModules, entry.name);
      if (entry.isSymbolicLink()) {
        const target = await fs.readlink(sourcePath);
        if (isInternalSymlink(target)) {
          await fs.symlink(target, destPath);
          return 1;
        } else {
          await fs.symlink(sourcePath, destPath);
          return 0;
        }
      } else if (entry.isDirectory() && entry.name.startsWith("@")) {
        await fs.mkdir(destPath, { recursive: true });
        const scopeEntries = await fs.readdir(sourcePath, { withFileTypes: true });
        const scopeCounts = await Promise.all(
          scopeEntries.map(async (scopeEntry) => {
            const scopeSourcePath = path.join(sourcePath, scopeEntry.name);
            const scopeDestPath = path.join(destPath, scopeEntry.name);
            if (scopeEntry.isSymbolicLink()) {
              const target = await fs.readlink(scopeSourcePath);
              if (isInternalSymlink(target)) {
                await fs.symlink(target, scopeDestPath);
                return 1;
              } else {
                await fs.symlink(scopeSourcePath, scopeDestPath);
                return 0;
              }
            } else {
              await fs.symlink(scopeSourcePath, scopeDestPath);
              return 0;
            }
          })
        );
        return scopeCounts.reduce((sum, c) => sum + c, 0);
      } else {
        await fs.symlink(sourcePath, destPath);
        return 0;
      }
    })
  );
  return counts.reduce((sum, c) => sum + c, 0);
}
async function rerouteAllNodeModules(opts) {
  const { sourceRoot, worktreeDir, repoRoot } = opts;
  let packageJson;
  try {
    const packageJsonContent = await fs.readFile(path.join(repoRoot, "package.json"), "utf-8");
    packageJson = JSON.parse(packageJsonContent);
  } catch (error) {
    if (error.code === "ENOENT") {
      return 0;
    }
    throw error;
  }
  if (!packageJson.workspaces) {
    return 0;
  }
  let totalCount = 0;
  totalCount += await rerouteNodeModules({
    sourceNodeModules: path.join(sourceRoot, "node_modules"),
    destNodeModules: path.join(worktreeDir, "node_modules")
  });
  const packagesDir = path.join(sourceRoot, "packages");
  try {
    const packageEntries = await fs.readdir(packagesDir, { withFileTypes: true });
    for (const entry of packageEntries) {
      if (entry.isDirectory()) {
        const pkgNodeModules = path.join(packagesDir, entry.name, "node_modules");
        let nodeModulesExists = false;
        try {
          await fs.lstat(pkgNodeModules);
          nodeModulesExists = true;
        } catch (error) {
          if (error.code !== "ENOENT") {
            throw error;
          }
        }
        if (nodeModulesExists) {
          const destPackageDir = path.join(worktreeDir, "packages", entry.name);
          await fs.mkdir(destPackageDir, { recursive: true });
          totalCount += await rerouteNodeModules({
            sourceNodeModules: pkgNodeModules,
            destNodeModules: path.join(destPackageDir, "node_modules")
          });
        }
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  return totalCount;
}
async function updateGitExclude(opts) {
  const { worktreeDir, repoRoot, directories, files } = opts;
  const { stdout: gitDir } = await execFileAsync("git", ["-C", worktreeDir, "rev-parse", "--git-dir"], {
    timeout: 5e3
  });
  const excludePath = path.join(gitDir.trim(), "info", "exclude");
  await fs.mkdir(path.dirname(excludePath), { recursive: true });
  const lines = ["# Symlinks created by instant-worktree"];
  for (const dir of directories) {
    if (!dir) continue;
    try {
      const stats = await fs.lstat(path.join(worktreeDir, dir));
      if (stats.isSymbolicLink()) lines.push(dir);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  for (const file of files) {
    if (!file) continue;
    try {
      const stats = await fs.lstat(path.join(worktreeDir, file));
      if (stats.isSymbolicLink()) lines.push(file);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  await fs.appendFile(excludePath, `${lines.join("\n")}
`);
  try {
    await execFileAsync("git", ["-C", repoRoot, "config", "extensions.worktreeConfig", "true"], { timeout: 5e3 });
  } catch (error) {
    process.stderr.write(
      `create-worktree: failed to set worktreeConfig extension: ${error instanceof Error ? error.message : String(error)}
`
    );
  }
  try {
    await execFileAsync("git", ["-C", worktreeDir, "config", "--worktree", "core.excludesFile", excludePath], {
      timeout: 5e3
    });
  } catch (error) {
    process.stderr.write(
      `create-worktree: failed to set core.excludesFile: ${error instanceof Error ? error.message : String(error)}
`
    );
  }
}

// src/lib/claude-session.ts
var execFileAsync2 = promisify2(execFile2);
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function resolveMarketplacePath() {
  const extensionPath = process.env[CARDS_ENV_VARS.EXTENSION_PATH];
  if (!extensionPath) {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.EXTENSION_PATH}`);
  }
  return path2.join(extensionPath, "dist", "marketplace");
}
function buildPluginSettings(marketplacePath) {
  return JSON.stringify({
    enabledPlugins: { "runtime@cards.management": true },
    extraKnownMarketplaces: {
      "cards.management": {
        source: { source: "directory", path: marketplacePath }
      }
    }
  });
}
async function resolveClaudeConfigDir() {
  const home = homedir();
  const candidates = [];
  const claudeConfigDir = process.env["CLAUDE_CONFIG_DIR"];
  if (claudeConfigDir) candidates.push(claudeConfigDir);
  const xdgDataHome = process.env["XDG_DATA_HOME"];
  if (xdgDataHome) candidates.push(path2.join(xdgDataHome, "claude"));
  const xdgConfigHome = process.env["XDG_CONFIG_HOME"];
  if (xdgConfigHome) candidates.push(path2.join(xdgConfigHome, "claude"));
  candidates.push(path2.join(home, ".config", "claude"));
  candidates.push(path2.join(home, ".claude"));
  for (const candidate of candidates) {
    try {
      await fs2.access(path2.join(candidate, "plugins"));
      return candidate;
    } catch {
    }
  }
  return null;
}
async function readPluginVersion(pluginJsonPath) {
  try {
    const content = await fs2.readFile(pluginJsonPath, "utf-8");
    const parsed = JSON.parse(content);
    return parsed.version ?? null;
  } catch {
    return null;
  }
}
async function updateMarketplaceRegistration(marketplacePath, logger2) {
  const configDir = await resolveClaudeConfigDir();
  if (!configDir) {
    logger2.debug("Claude config directory not found, skipping marketplace registration update");
    return;
  }
  const knownPath = path2.join(configDir, "plugins", "known_marketplaces.json");
  let raw;
  try {
    raw = await fs2.readFile(knownPath, "utf-8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      logger2.debug("known_marketplaces.json not found, skipping");
      return;
    }
    throw error;
  }
  const data = JSON.parse(raw);
  const entry = data["cards.management"];
  if (!entry?.source || entry.source.source !== "directory") return;
  if (entry.source.path === marketplacePath && entry.installLocation === marketplacePath) {
    logger2.debug("Marketplace registration already points to extension bundle");
    return;
  }
  entry.source.path = marketplacePath;
  entry.installLocation = marketplacePath;
  entry.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  await fs2.writeFile(knownPath, `${JSON.stringify(data, null, 4)}
`);
  logger2.info("Updated marketplace registration to extension bundle", { marketplacePath });
}
async function evictStaleRuntimeCache(marketplacePath, logger2) {
  const bundledVersion = await readPluginVersion(
    path2.join(marketplacePath, "plugins", "runtime", ".claude-plugin", "plugin.json")
  );
  if (!bundledVersion) {
    logger2.warn("Could not read bundled runtime plugin version, skipping cache eviction");
    return;
  }
  const configDir = await resolveClaudeConfigDir();
  if (!configDir) {
    logger2.debug("Claude config directory not found, skipping cache eviction");
    return;
  }
  const cacheDir = path2.join(configDir, "plugins", "cache", "cards-management", "runtime");
  let entries;
  try {
    entries = await fs2.readdir(cacheDir);
  } catch {
    return;
  }
  if (entries.length === 0) return;
  const bundledParts = bundledVersion.split(".").map(Number);
  let hasStale = false;
  for (const entry of entries) {
    const parts = entry.split(".").map(Number);
    if (parts.some(Number.isNaN) || parts.length !== 3) continue;
    for (let i = 0; i < 3; i++) {
      const cached = parts[i] ?? 0;
      const bundled = bundledParts[i] ?? 0;
      if (cached < bundled) {
        hasStale = true;
        break;
      }
      if (cached > bundled) break;
    }
    if (hasStale) break;
  }
  if (!hasStale) {
    logger2.debug("Runtime plugin cache is up to date", { bundledVersion, cachedVersions: entries });
    return;
  }
  logger2.info("Evicting stale runtime plugin cache", { bundledVersion, cachedVersions: entries });
  await fs2.rm(cacheDir, { recursive: true, force: true });
}
function buildArgs(prompt, sessionId, resume, mode, cardRepoPath, marketplacePath) {
  const args = [];
  if (resume) {
    args.push("--resume", sessionId);
  } else {
    args.push(prompt);
    args.push("--session-id", sessionId);
  }
  args.push("--settings", buildPluginSettings(marketplacePath));
  args.push("--add-dir", cardRepoPath);
  if (mode === "background") {
    args.push("--print");
  }
  return args;
}
async function resolveBaseBranch(workspacePath) {
  const { stdout } = await execFileAsync2("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: workspacePath
  });
  return stdout.trim();
}
async function worktreeExistsOnDisk(worktreePath) {
  try {
    await fs2.access(worktreePath);
    return true;
  } catch {
    return false;
  }
}
async function resolveOrCreateWorktree(input, client, baseBranch, logger2) {
  const { branches } = await client.getBranches(input.cardId, { workspacePath: input.workspacePath });
  for (const branch of branches) {
    if (!branch.exists || !branch.worktree) continue;
    if (!await worktreeExistsOnDisk(branch.worktree)) continue;
    const parentBranch = branch.parentBranch ?? baseBranch;
    logger2.info("Reusing existing worktree", { branch: branch.name, worktree: branch.worktree });
    return { worktreePath: branch.worktree, branchName: branch.name, parentBranch };
  }
  const prefix = `cards/${input.cardId}/`;
  const existingNumbers = branches.filter((b) => b.name.startsWith(prefix)).map((b) => parseInt(b.name.slice(prefix.length), 10)).filter((n) => !Number.isNaN(n));
  let nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  const { repoRoot } = await findGitRoots(input.workspacePath);
  while (await checkWorktreeExists(repoRoot, path2.join(repoRoot, ".worktrees", `${prefix}${nextNumber}`))) {
    logger2.warn("Worktree already exists in git but not in API, skipping", {
      branch: `${prefix}${nextNumber}`
    });
    nextNumber++;
  }
  const branchName = `${prefix}${nextNumber}`;
  const result = await createWorktree(branchName, { cwd: input.workspacePath });
  await client.addBranch(input.cardId, { name: branchName, worktree: result.worktree, parentBranch: baseBranch });
  logger2.info("Created new worktree", { branch: branchName, worktree: result.worktree });
  return { worktreePath: result.worktree, branchName, parentBranch: baseBranch };
}
async function tryCleanupStep(step, label, branchName, logger2) {
  try {
    await step();
  } catch (error) {
    logger2.warn(label, { branch: branchName, error: errorMessage(error) });
  }
}
async function cleanupMergedBranches(input, client, baseBranch, logger2) {
  const { branches } = await client.getBranches(input.cardId, { workspacePath: input.workspacePath });
  for (const branch of branches) {
    if (!branch.exists) continue;
    try {
      await execFileAsync2("git", ["merge-base", "--is-ancestor", branch.name, baseBranch], {
        cwd: input.workspacePath
      });
    } catch {
      logger2.debug("Branch not merged, skipping cleanup", { branch: branch.name });
      continue;
    }
    if (branch.worktree) {
      await tryCleanupStep(
        () => execFileAsync2("git", ["worktree", "remove", branch.worktree], { cwd: input.workspacePath }),
        "Failed to remove worktree",
        branch.name,
        logger2
      );
    }
    await tryCleanupStep(
      () => execFileAsync2("git", ["branch", "-d", branch.name], { cwd: input.workspacePath }),
      "Failed to delete branch",
      branch.name,
      logger2
    );
    await tryCleanupStep(
      () => client.removeBranch(input.cardId, branch.name),
      "Failed to remove branch from API",
      branch.name,
      logger2
    );
    logger2.info("Cleaned up merged branch", { branch: branch.name });
  }
}

// src/actions/interview.ts
var interview_default = defineAction(
  {
    actionName: "Interview",
    description: "Start an interview session for the card",
    supportsBackgroundMode: false,
    timeout: 36e5
  },
  async (input, context) => {
    const sessionId = randomUUID();
    const prompt = "Load the `runtime:card-repo` and `runtime:interview-routing` skills then follow the `<instructions>`.";
    context.logger.info("Interview action started", {
      cardId: input.cardId,
      environment: input.environment,
      sessionId
    });
    const client = new CardsClient({
      baseUrl: input.apiBaseUrl,
      accessToken: input.apiAccessToken
    });
    const baseBranch = await resolveBaseBranch(input.workspacePath);
    const worktreeResult = await resolveOrCreateWorktree(input, client, baseBranch, context.logger);
    const { worktreePath: cwd, branchName, parentBranch } = worktreeResult;
    context.logger.info("Using worktree", { cwd, branch: branchName, baseBranch, parentBranch });
    const marketplacePath = resolveMarketplacePath();
    await updateMarketplaceRegistration(marketplacePath, context.logger);
    await evictStaleRuntimeCache(marketplacePath, context.logger);
    const args = buildArgs(prompt, sessionId, false, input.executionMode, input.cardRepoPath, marketplacePath);
    const child = spawn("claude", args, {
      cwd,
      stdio: "inherit",
      env: {
        ...process.env,
        CLAUDE_CODE_TASK_LIST_ID: `cards-extension-${input.cardId}`,
        CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
        BASE_BRANCH: baseBranch,
        PARENT_BRANCH: parentBranch,
        WORKSPACE_BRANCH: branchName
      }
    });
    context.onCancel(() => {
      context.logger.info("Interview action cancelled, terminating claude", { sessionId });
      child.kill("SIGTERM");
    });
    const exitCode = await new Promise((resolve2) => {
      child.on("close", resolve2);
    });
    context.logger.info("Interview action completed", { sessionId, exitCode });
    try {
      await cleanupMergedBranches(input, client, baseBranch, context.logger);
    } catch (error) {
      context.logger.warn("Branch cleanup failed", {
        error: errorMessage(error)
      });
    }
  }
);

// src/actions/hook-wrapper.ts
executeCommand(interview_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2FjdGlvbnMvaW50ZXJ2aWV3LnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY2xpZW50L3R5cGVzL2Vycm9ycy50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NsaWVudC9jYXJkc0NsaWVudC50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9mYWN0b3JpZXMvYWN0aW9uLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2Vudi50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9leGl0LWNvZGVzLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2xvZ2dlci50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9zb2NrZXQtY2xpZW50LnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL3J1bnRpbWUudHMiLCAiLi4vLi4vc3JjL2xpYi9jbGF1ZGUtc2Vzc2lvbi50cyIsICIuLi8uLi9zcmMvbGliL2NyZWF0ZS13b3JrdHJlZS50cyIsICIuLi8uLi9zcmMvYWN0aW9ucy9ob29rLXdyYXBwZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogSW50ZXJ2aWV3IGFjdGlvbiBmb3IgQ2xhdWRlIENvZGUgd29ya2Zsb3dzLlxuICpcbiAqIFNwYXducyB0aGUgYGNsYXVkZWAgQ0xJIHdpdGggdGhlIGBydW50aW1lOmludGVydmlldy1yb3V0aW5nYCBza2lsbCBmb3IgdGhlXG4gKiBjdXJyZW50IGNhcmQuIFRoZSBwcm9jZXNzIGFsd2F5cyBydW5zIGludGVyYWN0aXZlbHkgXHUyMDE0IHN0ZGlvIGlzIGluaGVyaXRlZCBzb1xuICogdGhlIHVzZXIgZ2V0cyBkaXJlY3QgdGVybWluYWwgY29udHJvbC4gQmFja2dyb3VuZCBtb2RlIGlzIG5vdCBzdXBwb3J0ZWRcbiAqIGJlY2F1c2UgaW50ZXJ2aWV3cyByZXF1aXJlIGFjdGl2ZSB1c2VyIHBhcnRpY2lwYXRpb24uXG4gKlxuICogVGhlIGFjdGlvbiBhd2FpdHMgcHJvY2VzcyBleGl0IGJlZm9yZSByZXNvbHZpbmcsIHNvIHRoZSB0ZXJtaW5hbCBjbG9zZXNcbiAqIG9ubHkgYWZ0ZXIgQ2xhdWRlIGZpbmlzaGVzIGFuZCBjbGVhbnVwIGlzIGNvbXBsZXRlLlxuICpcbiAqIEBzdW1tYXJ5IEludGVydmlldyBhY3Rpb24gZm9yIENsYXVkZSBDb2RlIHdvcmtmbG93c1xuICogQG1vZHVsZVxuICogQHNlZSB7QGxpbmsgZGVmaW5lQWN0aW9ufSBmb3IgZmFjdG9yeSBiZWhhdmlvciBhbmQgbWV0YWRhdGEgYXR0YWNobWVudFxuICovXG5cbmltcG9ydCB7IHR5cGUgQ2hpbGRQcm9jZXNzLCBzcGF3biB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyByYW5kb21VVUlEIH0gZnJvbSAnbm9kZTpjcnlwdG8nO1xuaW1wb3J0IHsgQ2FyZHNDbGllbnQgfSBmcm9tICdAY2FyZHMvc2RrL2NsaWVudCc7XG5pbXBvcnQgeyB0eXBlIEFjdGlvbkNvbnRleHQsIHR5cGUgQWN0aW9uSW5wdXQsIGRlZmluZUFjdGlvbiB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7XG4gIGJ1aWxkQXJncyxcbiAgY2xlYW51cE1lcmdlZEJyYW5jaGVzLFxuICBlcnJvck1lc3NhZ2UsXG4gIGV2aWN0U3RhbGVSdW50aW1lQ2FjaGUsXG4gIHJlc29sdmVCYXNlQnJhbmNoLFxuICByZXNvbHZlTWFya2V0cGxhY2VQYXRoLFxuICByZXNvbHZlT3JDcmVhdGVXb3JrdHJlZSxcbiAgdXBkYXRlTWFya2V0cGxhY2VSZWdpc3RyYXRpb25cbn0gZnJvbSAnLi4vbGliL2NsYXVkZS1zZXNzaW9uLmpzJztcblxuLyoqXG4gKiBJbnRlcnZpZXcgYWN0aW9uIGhhbmRsZXIuXG4gKlxuICogU3Bhd25zIHRoZSBgY2xhdWRlYCBDTEkgYXMgYSBjaGlsZCBwcm9jZXNzIHVzaW5nIHRoZSBpbnRlcnZpZXctcm91dGluZyBza2lsbC5cbiAqIFRoZSBwcm9jZXNzIGxpZmVjeWNsZSBpcyB0aWVkIHRvIHRoZSBhY3Rpb246IGNhbmNlbGxhdGlvbiBzZW5kcyBTSUdURVJNLlxuICogU2Vzc2lvbiByZXN1bWUgaXMgbm90IHN1cHBvcnRlZCBcdTIwMTQgZWFjaCBpbnRlcnZpZXcgYWx3YXlzIHN0YXJ0cyBmcmVzaC5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQWN0aW9uKFxuICB7XG4gICAgYWN0aW9uTmFtZTogJ0ludGVydmlldycsXG4gICAgZGVzY3JpcHRpb246ICdTdGFydCBhbiBpbnRlcnZpZXcgc2Vzc2lvbiBmb3IgdGhlIGNhcmQnLFxuICAgIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU6IGZhbHNlLFxuICAgIHRpbWVvdXQ6IDM2MDAwMDBcbiAgfSxcbiAgYXN5bmMgKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHNlc3Npb25JZCA9IHJhbmRvbVVVSUQoKTtcblxuICAgIGNvbnN0IHByb21wdCA9XG4gICAgICAnTG9hZCB0aGUgYHJ1bnRpbWU6Y2FyZC1yZXBvYCBhbmQgYHJ1bnRpbWU6aW50ZXJ2aWV3LXJvdXRpbmdgIHNraWxscyB0aGVuIGZvbGxvdyB0aGUgYDxpbnN0cnVjdGlvbnM+YC4nO1xuXG4gICAgY29udGV4dC5sb2dnZXIuaW5mbygnSW50ZXJ2aWV3IGFjdGlvbiBzdGFydGVkJywge1xuICAgICAgY2FyZElkOiBpbnB1dC5jYXJkSWQsXG4gICAgICBlbnZpcm9ubWVudDogaW5wdXQuZW52aXJvbm1lbnQsXG4gICAgICBzZXNzaW9uSWRcbiAgICB9KTtcblxuICAgIGNvbnN0IGNsaWVudCA9IG5ldyBDYXJkc0NsaWVudCh7XG4gICAgICBiYXNlVXJsOiBpbnB1dC5hcGlCYXNlVXJsLFxuICAgICAgYWNjZXNzVG9rZW46IGlucHV0LmFwaUFjY2Vzc1Rva2VuXG4gICAgfSk7XG5cbiAgICBjb25zdCBiYXNlQnJhbmNoID0gYXdhaXQgcmVzb2x2ZUJhc2VCcmFuY2goaW5wdXQud29ya3NwYWNlUGF0aCk7XG5cbiAgICBjb25zdCB3b3JrdHJlZVJlc3VsdCA9IGF3YWl0IHJlc29sdmVPckNyZWF0ZVdvcmt0cmVlKGlucHV0LCBjbGllbnQsIGJhc2VCcmFuY2gsIGNvbnRleHQubG9nZ2VyKTtcblxuICAgIGNvbnN0IHsgd29ya3RyZWVQYXRoOiBjd2QsIGJyYW5jaE5hbWUsIHBhcmVudEJyYW5jaCB9ID0gd29ya3RyZWVSZXN1bHQ7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbygnVXNpbmcgd29ya3RyZWUnLCB7IGN3ZCwgYnJhbmNoOiBicmFuY2hOYW1lLCBiYXNlQnJhbmNoLCBwYXJlbnRCcmFuY2ggfSk7XG5cbiAgICBjb25zdCBtYXJrZXRwbGFjZVBhdGggPSByZXNvbHZlTWFya2V0cGxhY2VQYXRoKCk7XG4gICAgYXdhaXQgdXBkYXRlTWFya2V0cGxhY2VSZWdpc3RyYXRpb24obWFya2V0cGxhY2VQYXRoLCBjb250ZXh0LmxvZ2dlcik7XG4gICAgYXdhaXQgZXZpY3RTdGFsZVJ1bnRpbWVDYWNoZShtYXJrZXRwbGFjZVBhdGgsIGNvbnRleHQubG9nZ2VyKTtcblxuICAgIGNvbnN0IGFyZ3MgPSBidWlsZEFyZ3MocHJvbXB0LCBzZXNzaW9uSWQsIGZhbHNlLCBpbnB1dC5leGVjdXRpb25Nb2RlLCBpbnB1dC5jYXJkUmVwb1BhdGgsIG1hcmtldHBsYWNlUGF0aCk7XG5cbiAgICBjb25zdCBjaGlsZDogQ2hpbGRQcm9jZXNzID0gc3Bhd24oJ2NsYXVkZScsIGFyZ3MsIHtcbiAgICAgIGN3ZCxcbiAgICAgIHN0ZGlvOiAnaW5oZXJpdCcsXG4gICAgICBlbnY6IHtcbiAgICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAgIENMQVVERV9DT0RFX1RBU0tfTElTVF9JRDogYGNhcmRzLWV4dGVuc2lvbi0ke2lucHV0LmNhcmRJZH1gLFxuICAgICAgICBDTEFVREVfQ09ERV9FWFBFUklNRU5UQUxfQUdFTlRfVEVBTVM6ICcxJyxcbiAgICAgICAgQkFTRV9CUkFOQ0g6IGJhc2VCcmFuY2gsXG4gICAgICAgIFBBUkVOVF9CUkFOQ0g6IHBhcmVudEJyYW5jaCxcbiAgICAgICAgV09SS1NQQUNFX0JSQU5DSDogYnJhbmNoTmFtZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29udGV4dC5vbkNhbmNlbCgoKSA9PiB7XG4gICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdJbnRlcnZpZXcgYWN0aW9uIGNhbmNlbGxlZCwgdGVybWluYXRpbmcgY2xhdWRlJywgeyBzZXNzaW9uSWQgfSk7XG4gICAgICBjaGlsZC5raWxsKCdTSUdURVJNJyk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBleGl0Q29kZSA9IGF3YWl0IG5ldyBQcm9taXNlPG51bWJlciB8IG51bGw+KChyZXNvbHZlKSA9PiB7XG4gICAgICBjaGlsZC5vbignY2xvc2UnLCByZXNvbHZlKTtcbiAgICB9KTtcblxuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oJ0ludGVydmlldyBhY3Rpb24gY29tcGxldGVkJywgeyBzZXNzaW9uSWQsIGV4aXRDb2RlIH0pO1xuXG4gICAgLy8gUG9zdC1leGl0IGNsZWFudXA6IHJlbW92ZSBmdWxseS1tZXJnZWQgYnJhbmNoZXNcbiAgICB0cnkge1xuICAgICAgYXdhaXQgY2xlYW51cE1lcmdlZEJyYW5jaGVzKGlucHV0LCBjbGllbnQsIGJhc2VCcmFuY2gsIGNvbnRleHQubG9nZ2VyKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29udGV4dC5sb2dnZXIud2FybignQnJhbmNoIGNsZWFudXAgZmFpbGVkJywge1xuICAgICAgICBlcnJvcjogZXJyb3JNZXNzYWdlKGVycm9yKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG4pO1xuIiwgIi8qKlxuICogRXJyb3IgY2xhc3NlcyBmb3IgdGhlIENhcmRzIFYyIFNESy5cbiAqXG4gKiBUaGVzZSBlcnJvcnMgbm9ybWFsaXplIHNlcnZlciByZXNwb25zZXMgYW5kIG5ldHdvcmsgZmFpbHVyZXMgc28gY2FsbGVycyBjYW5cbiAqIGRpc3Rpbmd1aXNoIEFQSSB2YWxpZGF0aW9uIHByb2JsZW1zIGZyb20gdHJhbnNwb3J0IGlzc3Vlcy5cbiAqXG4gKlxuICogQHN1bW1hcnkgRXJyb3IgY2xhc3NlcyBmb3IgdGhlIENhcmRzIFYyIFNES1xuICogQG1vZHVsZSB0eXBlcy9lcnJvcnNcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEZpZWxkRXJyb3IgfSBmcm9tICcuLi8uLi9wcm90b2NvbC9pbmRleC5qcyc7XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gYW4gQVBJIHJlcXVlc3QgZmFpbHMgd2l0aCBhbiBlcnJvciByZXNwb25zZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdHJ5IHtcbiAqICAgYXdhaXQgY2xpZW50LmNyZWF0ZUNhcmQoZGF0YSk7XG4gKiB9IGNhdGNoIChlcnJvcikge1xuICogICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcGlFcnJvcikge1xuICogICAgIGNvbnNvbGUuZXJyb3IoYEFQSSBlcnJvciBbJHtlcnJvci5jb2RlfV06ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAqICAgICBpZiAoZXJyb3IuZmllbGRzKSB7XG4gKiAgICAgICBlcnJvci5maWVsZHMuZm9yRWFjaChmID0+IGNvbnNvbGUuZXJyb3IoYCAgJHtmLmZpZWxkfTogJHtmLm1lc3NhZ2V9YCkpO1xuICogICAgIH1cbiAqICAgfVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBBcGlFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgQXBpRXJyb3IgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZXJyb3IgbWVzc2FnZVxuICAgKiBAcGFyYW0gY29kZSAtIE1hY2hpbmUtcmVhZGFibGUgZXJyb3IgY29kZVxuICAgKiBAcGFyYW0gZmllbGRzIC0gT3B0aW9uYWwgYXJyYXkgb2YgZmllbGQtc3BlY2lmaWMgdmFsaWRhdGlvbiBlcnJvcnNcbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgY29kZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBmaWVsZHM/OiBGaWVsZEVycm9yW11cbiAgKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gJ0FwaUVycm9yJztcbiAgfVxufVxuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIGEgbmV0d29yayByZXF1ZXN0IGZhaWxzIGR1ZSB0byBjb25uZWN0aXZpdHkgaXNzdWVzLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB0cnkge1xuICogICBhd2FpdCBjbGllbnQubGlzdENhcmRzKCk7XG4gKiB9IGNhdGNoIChlcnJvcikge1xuICogICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBOZXR3b3JrRXJyb3IpIHtcbiAqICAgICBjb25zb2xlLmVycm9yKGBOZXR3b3JrIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gKiAgICAgaWYgKGVycm9yLmNhdXNlKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKGBDYXVzZWQgYnk6ICR7ZXJyb3IuY2F1c2UubWVzc2FnZX1gKTtcbiAqICAgICB9XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgTmV0d29ya0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBOZXR3b3JrRXJyb3IgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZXJyb3IgbWVzc2FnZVxuICAgKiBAcGFyYW0gY2F1c2UgLSBPcHRpb25hbCB1bmRlcmx5aW5nIGVycm9yIHRoYXQgY2F1c2VkIHRoaXMgbmV0d29yayBmYWlsdXJlXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGNhdXNlPzogRXJyb3JcbiAgKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gJ05ldHdvcmtFcnJvcic7XG4gIH1cbn1cbiIsICIvKipcbiAqIEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUEkuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUElcbiAqIEBtb2R1bGUgc2RrL0NhcmRzQ2xpZW50XG4gKi9cblxuaW1wb3J0IHR5cGUgeyBDYXJkLCBDb21wYXJlUmVxdWVzdCwgQ29tcGFyZVN0YXRlLCBIdHRwQ2xpZW50LCBTdHJlYW1NZXRhLCBUaW1lbGluZUl0ZW0gfSBmcm9tICcuLi9wcm90b2NvbC9pbmRleC5qcyc7XG5pbXBvcnQgdHlwZSB7XG4gIEFkZEJyYW5jaFJlcXVlc3QsXG4gIEF0dGFjaG1lbnRSZXNwb25zZSxcbiAgQnJhbmNoZXNSZXNwb25zZSxcbiAgQ2FyZENyZWF0ZURhdGEsXG4gIENhcmRzQ2xpZW50T3B0aW9ucyxcbiAgQ2FyZFVwZGF0ZURhdGEsXG4gIENvbW1lbnQsXG4gIENvbW1lbnRDcmVhdGVEYXRhLFxuICBDb21tZW50VXBkYXRlRGF0YSxcbiAgQ29tbWl0SW5mbyxcbiAgR2F0ZUFwcHJvdmFsUmVzcG9uc2UsXG4gIExpc3RDYXJkc09wdGlvbnMsXG4gIFN0cmVhbVJlc3VsdCxcbiAgU3RyZWFtV3JpdGVyLFxuICBTdHJlYW1Xcml0ZXJPcHRpb25zLFxuICBUaW1lbGluZU9wdGlvbnMsXG4gIFR5cGVTY2hlbWFzUmVzcG9uc2Vcbn0gZnJvbSAnLi90eXBlcy9jbGllbnQuanMnO1xuaW1wb3J0IHsgQXBpRXJyb3IsIE5ldHdvcmtFcnJvciB9IGZyb20gJy4vdHlwZXMvZXJyb3JzLmpzJztcblxuLyoqIEluaXRpYWwgcmVxdWVzdCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyAoMSBzZWNvbmQgZm9yIGZhc3QgZmFpbHVyZSBkZXRlY3Rpb24pLiAqL1xuY29uc3QgSU5JVElBTF9USU1FT1VUX01TID0gMV8wMDA7XG5cbi8qKiBNYXhpbXVtIHJlcXVlc3QgdGltZW91dCBpbiBtaWxsaXNlY29uZHMgYWZ0ZXIgZXhwb25lbnRpYWwgYmFja29mZi4gKi9cbmNvbnN0IE1BWF9USU1FT1VUX01TID0gMTBfMDAwO1xuXG4vKipcbiAqIFR5cGUtc2FmZSBIVFRQIGNsaWVudCBmb3IgdGhlIENhcmRzIFYyIFJFU1QgQVBJLlxuICpcbiAqIFVzZXMgdGhlIEZldGNoIEFQSSBieSBkZWZhdWx0IGFuZCBzdXBwb3J0cyBkZXBlbmRlbmN5IGluamVjdGlvbiBvZiBhblxuICogYWx0ZXJuYXRlIHtAbGluayBIdHRwQ2xpZW50fSBmb3IgdGVzdHMgb3IgY3VzdG9tIHRyYW5zcG9ydHMuIEFsbCBwdWJsaWNcbiAqIG1ldGhvZHMgc3VyZmFjZSBzZXJ2ZXIgZmFpbHVyZXMgYXMge0BsaW5rIEFwaUVycm9yfSBhbmQgdHJhbnNwb3J0IGZhaWx1cmVzXG4gKiBhcyB7QGxpbmsgTmV0d29ya0Vycm9yfS5cbiAqXG4gKiBUaGUgZGVmYXVsdCBIVFRQIGNsaWVudCBhcHBsaWVzIGFuIGV4cG9uZW50aWFsIGJhY2tvZmYgdGltZW91dCB0byBmZXRjaFxuICogcmVxdWVzdHM6IHN0YXJ0aW5nIGF0IDEgc2Vjb25kLCBkb3VibGluZyBvbiBlYWNoIGNvbnNlY3V0aXZlIGZhaWx1cmUgdXBcbiAqIHRvIGEgMTAtc2Vjb25kIGNhcCwgYW5kIHJlc2V0dGluZyBvbiBhbnkgc3VjY2Vzc2Z1bCByZXNwb25zZS4gVGhpcyBlbnN1cmVzXG4gKiBmYXN0IGZhaWx1cmUgZGV0ZWN0aW9uIHdoZW4gdGhlIHNlcnZlciBpcyBkb3duIHdoaWxlIGFsbG93aW5nIHNsb3dlclxuICogcmVzcG9uc2VzIGR1cmluZyByZWNvdmVyeS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2xpZW50ID0gbmV3IENhcmRzQ2xpZW50KHsgYmFzZVVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsIGFjY2Vzc1Rva2VuOiAndG9rZW4nIH0pO1xuICpcbiAqIGNvbnN0IGNhcmRzID0gYXdhaXQgY2xpZW50Lmxpc3RDYXJkcyh7IHN0YXR1czogJ2luX3Byb2dyZXNzJyB9KTtcbiAqIGF3YWl0IGNsaWVudC51cGRhdGVDYXJkKGNhcmRJZCwgeyBzdGF0dXM6ICdkb25lJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgQ2FyZHNDbGllbnQge1xuICBwcml2YXRlIHJlYWRvbmx5IF9odHRwQ2xpZW50PzogSHR0cENsaWVudDtcblxuICAvKiogQ3VycmVudCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcywgaW5jcmVhc2VzIHdpdGggY29uc2VjdXRpdmUgZmFpbHVyZXMuICovXG4gIHByaXZhdGUgX2N1cnJlbnRUaW1lb3V0TXMgPSBJTklUSUFMX1RJTUVPVVRfTVM7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgQ2FyZHNDbGllbnQgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGluY2x1ZGluZyBiYXNlIFVSTCBhbmQgYXV0aCB0b2tlbi5cbiAgICogQHBhcmFtIGh0dHBDbGllbnQgLSBPcHRpb25hbCBIVFRQIGNsaWVudCBmb3IgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IENhcmRzQ2xpZW50T3B0aW9ucyxcbiAgICBodHRwQ2xpZW50PzogSHR0cENsaWVudFxuICApIHtcbiAgICB0aGlzLl9odHRwQ2xpZW50ID0gaHR0cENsaWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBiYXNlIFVSTCB1c2VkIHRvIGJ1aWxkIEFQSSByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgVGhlIGJhc2UgVVJMIHN0cmluZyBhcyBwcm92aWRlZCBpbiB7QGxpbmsgQ2FyZHNDbGllbnRPcHRpb25zfS5cbiAgICovXG4gIGdldEJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmJhc2VVcmw7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIGFuIEhUVFAgY2xpZW50IHdhcyBpbmplY3RlZC5cbiAgICpcbiAgICogQHJldHVybnMgVHJ1ZSBpZiBhbiBIVFRQIGNsaWVudCB3YXMgcHJvdmlkZWQgZHVyaW5nIGNvbnN0cnVjdGlvbi5cbiAgICogQGludGVybmFsIFVzZWQgZm9yIHRlc3RpbmcgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gICAqL1xuICBoYXNIdHRwQ2xpZW50KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9odHRwQ2xpZW50ICE9PSB1bmRlZmluZWQ7XG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gQWJvcnRTaWduYWwgdGhhdCBmaXJlcyBhZnRlciB0aGUgY3VycmVudCBiYWNrb2ZmIHRpbWVvdXQuXG4gICAqIFVzZXMgY2FsbGVyJ3Mgc2lnbmFsIGlmIHByb3ZpZGVkIChmb3IgREkvdGVzdGluZyksIG90aGVyd2lzZSBhcHBsaWVzIHRoZSBiYWNrb2ZmIHRpbWVvdXQuXG4gICAqXG4gICAqIEBwYXJhbSBleGlzdGluZ1NpZ25hbCAtIE9wdGlvbmFsIGNhbGxlci1wcm92aWRlZCBzaWduYWwgdG8gcmV1c2UgaW5zdGVhZCBvZiBjcmVhdGluZyBhIHRpbWVvdXQgc2lnbmFsLlxuICAgKiBAcmV0dXJucyBBYm9ydFNpZ25hbCB0aGF0IGNvbnRyb2xzIHJlcXVlc3QgY2FuY2VsbGF0aW9uIGZvciB0aGUgY3VycmVudCBvcGVyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGdldFRpbWVvdXRTaWduYWwoZXhpc3RpbmdTaWduYWw/OiBBYm9ydFNpZ25hbCB8IG51bGwpOiBBYm9ydFNpZ25hbCB7XG4gICAgaWYgKGV4aXN0aW5nU2lnbmFsKSByZXR1cm4gZXhpc3RpbmdTaWduYWw7XG4gICAgcmV0dXJuIEFib3J0U2lnbmFsLnRpbWVvdXQodGhpcy5fY3VycmVudFRpbWVvdXRNcyk7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkcyBhIHN1Y2Nlc3NmdWwgcmVxdWVzdCBhbmQgcmVzZXRzIHRoZSB0aW1lb3V0IGJhY2tvZmYuXG4gICAqL1xuICBwcml2YXRlIG9uUmVxdWVzdFN1Y2Nlc3MoKTogdm9pZCB7XG4gICAgdGhpcy5fY3VycmVudFRpbWVvdXRNcyA9IElOSVRJQUxfVElNRU9VVF9NUztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmRzIGEgZmFpbGVkIHJlcXVlc3QgYW5kIGluY3JlYXNlcyB0aGUgdGltZW91dCB2aWEgZXhwb25lbnRpYWwgYmFja29mZi5cbiAgICovXG4gIHByaXZhdGUgb25SZXF1ZXN0RmFpbHVyZSgpOiB2b2lkIHtcbiAgICB0aGlzLl9jdXJyZW50VGltZW91dE1zID0gTWF0aC5taW4odGhpcy5fY3VycmVudFRpbWVvdXRNcyAqIDIsIE1BWF9USU1FT1VUX01TKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWZhdWx0IEhUVFAgY2xpZW50IGltcGxlbWVudGF0aW9uIHVzaW5nIGZldGNoICsgSlNPTiBwYXlsb2Fkcy5cbiAgICpcbiAgICogRWFjaCBmZXRjaCBjYWxsIGluY2x1ZGVzIGFuIEFib3J0U2lnbmFsLnRpbWVvdXQgdGhhdCBzdGFydHMgYXQgMSBzZWNvbmRcbiAgICogYW5kIGRvdWJsZXMgb24gY29uc2VjdXRpdmUgZmFpbHVyZXMgdXAgdG8gMTAgc2Vjb25kcy5cbiAgICovXG4gIHByaXZhdGUgZGVmYXVsdEh0dHBDbGllbnQ6IEh0dHBDbGllbnQgPSB7XG4gICAgZ2V0OiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgcG9zdDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBib2R5OiB1bmtub3duLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHB1dDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBib2R5OiB1bmtub3duLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgYm9keTogYm9keSA/IEpTT04uc3RyaW5naWZ5KGJvZHkpIDogdW5kZWZpbmVkLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgcGF0Y2g6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQQVRDSCcsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgYm9keTogYm9keSA/IEpTT04uc3RyaW5naWZ5KGJvZHkpIDogdW5kZWZpbmVkLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgZGVsZXRlOiBhc3luYyAodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogR2V0cyBIVFRQIGhlYWRlcnMgZm9yIEpTT04gQVBJIHJlcXVlc3RzLlxuICAgKlxuICAgKiBAcmV0dXJucyBIZWFkZXJzIHdpdGggSlNPTiBjb250ZW50IHR5cGUgYW5kIG9wdGlvbmFsIGJlYXJlciB0b2tlbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0SGVhZGVycygpOiBIZWFkZXJzSW5pdCB7XG4gICAgY29uc3QgaGVhZGVyczogSGVhZGVyc0luaXQgPSB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VuKSB7XG4gICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VufWA7XG4gICAgfVxuICAgIHJldHVybiBoZWFkZXJzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIEhUVFAgY2xpZW50IHRvIHVzZSBmb3IgcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIEluamVjdGVkIEhUVFAgY2xpZW50IHdoZW4gcHJvdmlkZWQsIG90aGVyd2lzZSB0aGUgZGVmYXVsdCBmZXRjaC1iYXNlZCBjbGllbnQuXG4gICAqL1xuICBwcml2YXRlIGdldEh0dHBDbGllbnQoKTogSHR0cENsaWVudCB7XG4gICAgcmV0dXJuIHRoaXMuX2h0dHBDbGllbnQgPz8gdGhpcy5kZWZhdWx0SHR0cENsaWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBCdWlsZHMgYSBVUkwgcmVsYXRpdmUgdG8gdGhlIGNvbmZpZ3VyZWQgYmFzZSBVUkwuXG4gICAqXG4gICAqIFVuZGVmaW5lZCBhbmQgbnVsbCBxdWVyeSBwYXJhbXMgYXJlIG9taXR0ZWQuIFZhbHVlcyBhcmUgc3RyaW5naWZpZWQuXG4gICAqXG4gICAqIEBwYXJhbSBwYXRoIC0gUmVsYXRpdmUgQVBJIHBhdGggdG8gYXBwZW5kIHRvIHRoZSBjb25maWd1cmVkIGJhc2UgVVJMLlxuICAgKiBAcGFyYW0gcGFyYW1zIC0gT3B0aW9uYWwgcXVlcnkgcGFyYW1ldGVycyB0byBlbmNvZGUgb250byB0aGUgVVJMLlxuICAgKiBAcmV0dXJucyBGdWxseS1xdWFsaWZpZWQgcmVxdWVzdCBVUkwgc3RyaW5nLlxuICAgKi9cbiAgcHJpdmF0ZSBidWlsZFVybChwYXRoOiBzdHJpbmcsIHBhcmFtcz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogc3RyaW5nIHtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHBhdGgsIHRoaXMub3B0aW9ucy5iYXNlVXJsKTtcbiAgICBpZiAocGFyYW1zKSB7XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhwYXJhbXMpKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoa2V5LCBTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdXJsLnRvU3RyaW5nKCk7XG4gIH1cblxuICAvKipcbiAgICogV3JhcHMgYSByZXF1ZXN0IHdpdGggY29uc2lzdGVudCBlcnJvciBoYW5kbGluZy5cbiAgICpcbiAgICogQHBhcmFtIGZuIC0gQXN5bmMgcmVxdWVzdCBmdW5jdGlvbiB0byBleGVjdXRlLlxuICAgKiBAcmV0dXJucyBUaGUgcmVzb2x2ZWQgdmFsdWUgZnJvbSB0aGUgcmVxdWVzdCBmdW5jdGlvbi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhIG5vbi0yeHggc3RhdHVzLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciBmb3IgbmV0d29yayBmYWlsdXJlcyBvciB1bmV4cGVjdGVkIGV4Y2VwdGlvbnMuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHJlcXVlc3Q8VD4oZm46ICgpID0+IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZm4oKTtcbiAgICAgIHRoaXMub25SZXF1ZXN0U3VjY2VzcygpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgUmVzcG9uc2UpIHtcbiAgICAgICAgLy8gU2VydmVyIHJlc3BvbmRlZCAoZXZlbiB3aXRoIGFuIGVycm9yIHN0YXR1cykgLSBjb25uZWN0aW9uIGlzIGFsaXZlLCByZXNldCBiYWNrb2ZmXG4gICAgICAgIHRoaXMub25SZXF1ZXN0U3VjY2VzcygpO1xuICAgICAgICBsZXQgYm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBib2R5ID0gYXdhaXQgZXJyb3IuanNvbigpO1xuICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yKSB7XG4gICAgICAgICAgLy8gU3ludGF4RXJyb3IgaXMgZXhwZWN0ZWQgd2hlbiBzZXJ2ZXIgcmV0dXJucyBub24tSlNPTiBlcnJvciByZXNwb25zZSAoZS5nLiwgSFRNTCBlcnJvciBwYWdlKVxuICAgICAgICAgIGlmICghKHBhcnNlRXJyb3IgaW5zdGFuY2VvZiBTeW50YXhFcnJvcikpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignW0NhcmRzQ2xpZW50XSBVbmV4cGVjdGVkIGVycm9yIHBhcnNpbmcgZXJyb3IgcmVzcG9uc2U6JywgcGFyc2VFcnJvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPVxuICAgICAgICAgIChib2R5WydlcnJvciddIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgKGJvZHlbJ21lc3NhZ2UnXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IGVycm9yLnN0YXR1c1RleHQ7XG4gICAgICAgIGNvbnN0IGNvZGUgPSAoYm9keVsnY29kZSddIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgU3RyaW5nKGVycm9yLnN0YXR1cyk7XG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IGJvZHlbJ2ZpZWxkcyddIGFzIEFycmF5PHsgZmllbGQ6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH0+IHwgdW5kZWZpbmVkO1xuICAgICAgICB0aHJvdyBuZXcgQXBpRXJyb3IobWVzc2FnZSwgY29kZSwgZmllbGRzKTtcbiAgICAgIH1cbiAgICAgIC8vIE5ldHdvcmsgb3IgdGltZW91dCBmYWlsdXJlIC0gaW5jcmVhc2UgYmFja29mZiBmb3IgbmV4dCBhdHRlbXB0XG4gICAgICB0aGlzLm9uUmVxdWVzdEZhaWx1cmUoKTtcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnJvci5uYW1lID09PSAnVGltZW91dEVycm9yJykge1xuICAgICAgICB0aHJvdyBuZXcgTmV0d29ya0Vycm9yKCdSZXF1ZXN0IHRpbWVkIG91dCcsIGVycm9yKTtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBOZXR3b3JrRXJyb3IoJ1JlcXVlc3QgZmFpbGVkJywgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogdW5kZWZpbmVkKTtcbiAgICB9XG4gIH1cblxuICAvLyAtLS0gQ2FyZCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBMaXN0cyBjYXJkcyB3aXRoIG9wdGlvbmFsIGZpbHRlcmluZy5cbiAgICpcbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBmaWx0ZXIgYW5kIHBhZ2luYXRpb24gb3B0aW9ucy5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gbWF0Y2hpbmcgY2FyZHMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RDYXJkcyhvcHRpb25zPzogTGlzdENhcmRzT3B0aW9ucyk6IFByb21pc2U8Q2FyZFtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NhcmRzJywge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGgsXG4gICAgICBzdGF0dXM6IG9wdGlvbnM/LnN0YXR1cyxcbiAgICAgIHRhZzogb3B0aW9ucz8udGFnLFxuICAgICAgc2VhcmNoOiBvcHRpb25zPy5zZWFyY2gsXG4gICAgICBsaW1pdDogb3B0aW9ucz8ubGltaXQsXG4gICAgICBvZmZzZXQ6IG9wdGlvbnM/Lm9mZnNldFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENhcmRbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhIHNpbmdsZSBjYXJkIGJ5IGlkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGlkIG9mIHRoZSBjYXJkIHRvIHJldHJpZXZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY2FyZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q2FyZChjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8Q2FyZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDYXJkPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIC0gQ2FyZCBjcmVhdGlvbiBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3JlYXRlZCBjYXJkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBwYXlsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBjcmVhdGVDYXJkKGRhdGE6IENhcmRDcmVhdGVEYXRhKTogUHJvbWlzZTxDYXJkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NhcmRzJyk7XG4gICAgY29uc3QgYm9keSA9IHtcbiAgICAgIC4uLmRhdGEsXG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENhcmQ+KHVybCwgYm9keSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgYW4gZXhpc3RpbmcgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byB1cGRhdGUuXG4gICAqIEBwYXJhbSBkYXRhIC0gVGhlIGZpZWxkcyB0byB1cGRhdGUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSB1cGRhdGVkIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ2FyZChjYXJkSWQ6IHN0cmluZywgZGF0YTogQ2FyZFVwZGF0ZURhdGEpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wYXRjaDxDYXJkPih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGVzIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byBkZWxldGUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gZGVsZXRpb24gaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGRlbGV0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgZGVsZXRlQ2FyZChjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21tZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGNvbW1lbnRzIGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSB0YXJnZXQgY2FyZCBmb3IgdGhpcyByZXF1ZXN0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tbWVudCBsaXN0LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21tZW50cyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8Q29tbWVudFtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENvbW1lbnRbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhIHNpbmdsZSBjb21tZW50IGJ5IGlkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIHJlcXVlc3RlZCBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNvbW1lbnQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21tZW50PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50cy8ke2NvbW1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21tZW50Pih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGNvbW1lbnQgb24gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IHdpbGwgcmVjZWl2ZSB0aGUgbmV3IGNvbW1lbnQuXG4gICAqIEBwYXJhbSBkYXRhIC0gQ29tbWVudCBjcmVhdGlvbiBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3JlYXRlZCBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBwYXlsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBjcmVhdGVDb21tZW50KGNhcmRJZDogc3RyaW5nLCBkYXRhOiBDb21tZW50Q3JlYXRlRGF0YSk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tbWVudD4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBhbiBleGlzdGluZyBjb21tZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIGNvbW1lbnQuXG4gICAqIEBwYXJhbSBjb21tZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjb21tZW50IHRvIHVwZGF0ZS5cbiAgICogQHBhcmFtIGRhdGEgLSBDb21tZW50IHVwZGF0ZSBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgdXBkYXRlZCBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZUNvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nLCBkYXRhOiBDb21tZW50VXBkYXRlRGF0YSk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHMvJHtjb21tZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wYXRjaDxDb21tZW50Pih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGVzIGEgY29tbWVudC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byByZW1vdmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gZGVsZXRpb24gaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGRlbGV0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgZGVsZXRlQ29tbWVudChjYXJkSWQ6IHN0cmluZywgY29tbWVudElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEF0dGFjaG1lbnQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogVXBsb2FkcyBhbiBhdHRhY2htZW50IHRvIGEgY2FyZCB1c2luZyBiaW5hcnkgUFVULlxuICAgKlxuICAgKiBUaGlzIGlzIHRoZSBwcmVmZXJyZWQgbWV0aG9kIC0gc2VuZHMgcmF3IGJpbmFyeSBkYXRhIGRpcmVjdGx5IHdpdGhvdXRcbiAgICogYmFzZTY0IGVuY29kaW5nLCByZXN1bHRpbmcgaW4gMzMlIHNtYWxsZXIgcGF5bG9hZHMuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgd2lsbCByZWNlaXZlIHRoZSBhdHRhY2htZW50LlxuICAgKiBAcGFyYW0gbmFtZSAtIEZpbGUgbmFtZSBpbmNsdWRpbmcgZXh0ZW5zaW9uLlxuICAgKiBAcGFyYW0gZGF0YSAtIEJpbmFyeSBkYXRhIGFzIEJsb2IsIEFycmF5QnVmZmVyLCBvciBiYXNlNjQgc3RyaW5nLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhdHRhY2htZW50IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGxvYWQuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIHVwbG9hZEF0dGFjaG1lbnQoY2FyZElkOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZGF0YTogQmxvYiB8IEFycmF5QnVmZmVyIHwgc3RyaW5nKTogUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2F0dGFjaG1lbnRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpfWApO1xuXG4gICAgLy8gQ29udmVydCBkYXRhIHRvIEJsb2IgZm9yIGZldGNoIGJvZHlcbiAgICBsZXQgYm9keTogQmxvYjtcbiAgICBpZiAoZGF0YSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgIGJvZHkgPSBkYXRhO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICBib2R5ID0gbmV3IEJsb2IoW2RhdGFdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYmFzZTY0IHN0cmluZyAtIGRlY29kZSB0byBiaW5hcnlcbiAgICAgIGNvbnN0IGJpbmFyeVN0cmluZyA9IGF0b2IoZGF0YSk7XG4gICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJpbmFyeVN0cmluZy5sZW5ndGgpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBiaW5hcnlTdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYnl0ZXNbaV0gPSBiaW5hcnlTdHJpbmcuY2hhckNvZGVBdChpKTtcbiAgICAgIH1cbiAgICAgIGJvZHkgPSBuZXcgQmxvYihbYnl0ZXNdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAuLi50aGlzLmdldEhlYWRlcnMoKSxcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSdcbiAgICAgICAgfSxcbiAgICAgICAgYm9keSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2U+O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERvd25sb2FkcyBhbiBhdHRhY2htZW50IGFzIGEgQmxvYi5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgdXNlcyBgZmV0Y2hgIGRpcmVjdGx5IHNvIGJpbmFyeSBkYXRhIGlzIHByZXNlcnZlZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBhdHRhY2htZW50LlxuICAgKiBAcGFyYW0gYXR0YWNobWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgYXR0YWNobWVudCBibG9iIHRvIGRvd25sb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhbiBhdHRhY2htZW50IEJsb2IuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldEF0dGFjaG1lbnQoY2FyZElkOiBzdHJpbmcsIGF0dGFjaG1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTxCbG9iPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50cy8ke2F0dGFjaG1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIGhlYWRlcnM6IHRoaXMuZ2V0SGVhZGVycygpLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbCgpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0cyBhdHRhY2htZW50cyBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBhdHRhY2htZW50cyBzaG91bGQgYmUgbGlzdGVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhdHRhY2htZW50IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0QXR0YWNobWVudHMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPEF0dGFjaG1lbnRSZXNwb25zZVtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEF0dGFjaG1lbnRSZXNwb25zZVtdPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBUaW1lbGluZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHRpbWVsaW5lIGVudHJpZXMgZm9yIGEgY2FyZCB3aXRoIG9wdGlvbmFsIHBhZ2luYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHRpbWVsaW5lIGVudHJpZXMgc2hvdWxkIGJlIHJldHVybmVkLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhZ2luYXRpb24gY29udHJvbHMuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRpbWVsaW5lIGVudHJpZXMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFRpbWVsaW5lKGNhcmRJZDogc3RyaW5nLCBvcHRpb25zPzogVGltZWxpbmVPcHRpb25zKTogUHJvbWlzZTxUaW1lbGluZUl0ZW1bXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vdGltZWxpbmVgLCB7XG4gICAgICBiZWZvcmU6IG9wdGlvbnM/LmJlZm9yZSxcbiAgICAgIGxpbWl0OiBvcHRpb25zPy5saW1pdFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFRpbWVsaW5lSXRlbVtdPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBQbGFuIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIHBsYW4gZG9jdW1lbnQgZm9yIGEgY2FyZCBhcyBtYXJrZG93bi5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgcGxhbiBtYXJrZG93biBzaG91bGQgYmUgcmV0dXJuZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHBsYW4gbWFya2Rvd24uXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFBsYW4oY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vcGxhbmApO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDx7IGNvbnRlbnQ6IHN0cmluZyB9Pih1cmwpKTtcbiAgICByZXR1cm4gcmVzcG9uc2UuY29udGVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSBwbGFuIGRvY3VtZW50IGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHBsYW4gbWFya2Rvd24gc2hvdWxkIGJlIHVwZGF0ZWQuXG4gICAqIEBwYXJhbSBjb250ZW50IC0gUGxhbiBtYXJrZG93biBjb250ZW50LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBwbGFuIGlzIHNhdmVkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZVBsYW4oY2FyZElkOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vcGxhbmApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucHV0PHZvaWQ+KHVybCwgY29udGVudCkpO1xuICB9XG5cbiAgLy8gLS0tIEdhdGUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogQXBwcm92ZXMgYSBnYXRlIGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIGdhdGUgc3RhdGUgc2hvdWxkIGJlIHVwZGF0ZWQuXG4gICAqIEBwYXJhbSBnYXRlTmFtZSAtIEdhdGUgbmFtZSB0byBhcHByb3ZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBnYXRlIGFwcHJvdmFsIG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBhcHByb3ZhbC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgYXBwcm92ZUdhdGUoY2FyZElkOiBzdHJpbmcsIGdhdGVOYW1lOiAncGxhbicgfCAncmV2aWV3Jyk6IFByb21pc2U8R2F0ZUFwcHJvdmFsUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2dhdGVzLyR7Z2F0ZU5hbWV9L2FwcHJvdmVgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8R2F0ZUFwcHJvdmFsUmVzcG9uc2U+KHVybCwgdW5kZWZpbmVkKSk7XG4gIH1cblxuICAvLyAtLS0gQ29tbWl0IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGNvbW1pdHMgYXNzb2NpYXRlZCB3aXRoIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgY29tbWl0cyBzaG91bGQgYmUgcmV0dXJuZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGNvbW1pdCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tbWl0cyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8Q29tbWl0SW5mb1tdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21taXRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q29tbWl0SW5mb1tdPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgY29tbWl0IHRvIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gYXNzb2NpYXRlIHdpdGggdGhlIGNvbW1pdCBTSEEuXG4gICAqIEBwYXJhbSBzaGEgLSBHaXQgY29tbWl0IHNoYS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gY29tbWl0IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGFkZENvbW1pdChjYXJkSWQ6IHN0cmluZywgc2hhOiBzdHJpbmcpOiBQcm9taXNlPENvbW1pdEluZm8+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tbWl0SW5mbz4odXJsLCB7IHNoYSB9KSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGNvbW1pdCBmcm9tIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gZGV0YWNoIGZyb20gdGhlIGNvbW1pdCBTSEEuXG4gICAqIEBwYXJhbSBzaGEgLSBHaXQgY29tbWl0IHNoYS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiByZW1vdmFsIGlzIGNvbXBsZXRlLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIHJlbW92ZUNvbW1pdChjYXJkSWQ6IHN0cmluZywgc2hhOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHMvJHtzaGF9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cblxuICAvLyAtLS0gQnJhbmNoIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGJyYW5jaGVzIHRyYWNrZWQgb24gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgYnJhbmNoZXMgdG8gcmV0cmlldmUuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgcXVlcnkgcGFyYW1ldGVycy5cbiAgICogQHBhcmFtIG9wdGlvbnMud29ya3NwYWNlUGF0aCAtIFdvcmtzcGFjZSBwYXRoIGZvciBjb21wdXRpbmcgaXNNZXJnZWQgYW5kIGNvbW1pdCBjb250YWlubWVudC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYnJhbmNoZXMgcmVzcG9uc2UuXG4gICAqL1xuICBhc3luYyBnZXRCcmFuY2hlcyhjYXJkSWQ6IHN0cmluZywgb3B0aW9ucz86IHsgd29ya3NwYWNlUGF0aD86IHN0cmluZyB9KTogUHJvbWlzZTxCcmFuY2hlc1Jlc3BvbnNlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9icmFuY2hlc2AsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IG9wdGlvbnM/LndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxCcmFuY2hlc1Jlc3BvbnNlPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgYnJhbmNoIHRvIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIGFkZCB0aGUgYnJhbmNoIHRvLlxuICAgKiBAcGFyYW0gZGF0YSAtIEJyYW5jaCBkYXRhIGluY2x1ZGluZyBuYW1lIGFuZCBvcHRpb25hbCB3b3JrdHJlZSBwYXRoLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBicmFuY2ggaXMgYWRkZWQuXG4gICAqL1xuICBhc3luYyBhZGRCcmFuY2goY2FyZElkOiBzdHJpbmcsIGRhdGE6IEFkZEJyYW5jaFJlcXVlc3QpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzYCk7XG4gICAgYXdhaXQgdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8dW5rbm93bj4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGJyYW5jaCBmcm9tIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIHJlbW92ZSB0aGUgYnJhbmNoIGZyb20uXG4gICAqIEBwYXJhbSBuYW1lIC0gQnJhbmNoIG5hbWUgdG8gcmVtb3ZlICh3aWxsIGJlIFVSTC1lbmNvZGVkKS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgYnJhbmNoIGlzIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyByZW1vdmVCcmFuY2goY2FyZElkOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYnJhbmNoZXMvJHtlbmNvZGVVUklDb21wb25lbnQobmFtZSl9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cblxuICAvLyAtLS0gVGFnIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGF2YWlsYWJsZSB0YWdzLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0YWcgc3RyaW5ncy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0VGFncygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL3RhZ3MnLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHN0cmluZ1tdPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBFbnZpcm9ubWVudCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBGZXRjaGVzIGF2YWlsYWJsZSBhZ2VudCBlbnZpcm9ubWVudHMuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGVudmlyb25tZW50IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRFbnZpcm9ubWVudHMoKTogUHJvbWlzZTxBcnJheTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmcgfT4+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvZW52aXJvbm1lbnRzJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8QXJyYXk8eyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uPzogc3RyaW5nIH0+Pih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBUeXBlZCBGaWxlIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIFN1Ym1pdHMgYW4gYWRhcHRpdmUgY2FyZCBhY3Rpb24gYnkgd3JpdGluZyBhbiBgYWRhcHRpdmUtY2FyZC1zdWJtaXNzaW9uYCB0eXBlZCBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGNhcmQgY29udGFpbmluZyB0aGUgYWRhcHRpdmUgY2FyZC5cbiAgICogQHBhcmFtIGFjdGlvbklkIC0gVGhlIGFjdGlvbiBJRCBmcm9tIHRoZSBhZGFwdGl2ZSBjYXJkIHN1Ym1pdCBhY3Rpb24uXG4gICAqIEBwYXJhbSBkYXRhIC0gVGhlIGZvcm0gZGF0YSBjb2xsZWN0ZWQgYnkgdGhlIGFkYXB0aXZlIGNhcmQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIHN1Ym1pc3Npb24gaXMgcGVyc2lzdGVkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBzdWJtaXNzaW9uIChlLmcuIHZhbGlkYXRpb24gZmFpbHVyZSkuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIHN1Ym1pdENhcmRBY3Rpb24oY2FyZElkOiBzdHJpbmcsIGFjdGlvbklkOiBzdHJpbmcsIGRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZmlsZU5hbWUgPSBgJHthY3Rpb25JZH0tJHtEYXRlLm5vdygpfS5qc29uYDtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2FkYXB0aXZlLWNhcmQtc3VibWlzc2lvbi8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlTmFtZSl9YCk7XG4gICAgY29uc3QgYm9keSA9IHsgY2FyZElkLCBhY3Rpb25JZCwgZGF0YSB9O1xuICAgIGF3YWl0IHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wdXQ8dW5rbm93bj4odXJsLCBib2R5KSk7XG4gIH1cblxuICAvLyAtLS0gVHlwZSBTY2hlbWEgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyB0eXBlIHNjaGVtYXMgYW5kIGRlc2NyaXB0aW9ucyBmb3IgYSBjYXJkJ3MgZW52aXJvbm1lbnQuXG4gICAqXG4gICAqIFJldHVybnMgbWV0YWRhdGEgYWJvdXQgZWFjaCByZWdpc3RlcmVkIHR5cGUgaW4gdGhlIGNhcmQncyBlbnZpcm9ubWVudCxcbiAgICogaW5jbHVkaW5nIHZlcnNpb24sIHNjaGVtYSwgYW5kIGRlc2NyaXB0aW9uLiBDb21tYW5kIGRldGFpbHMgYXJlIGV4Y2x1ZGVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSB0eXBlIHNjaGVtYSBtZXRhZGF0YSBzaG91bGQgYmUgZmV0Y2hlZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdHlwZSBzY2hlbWEgaW5mb3JtYXRpb24uXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFR5cGVTY2hlbWFzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxUeXBlU2NoZW1hc1Jlc3BvbnNlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9zY2hlbWFgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxUeXBlU2NoZW1hc1Jlc3BvbnNlPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBTdHJlYW0gT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogTGlzdHMgYWxsIHN0cmVhbXMgYXR0YWNoZWQgdG8gYSBjYXJkLCBzb3J0ZWQgYnkgY3JlYXRpb24gdGltZS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIENhcmQgSUQgdG8gcXVlcnkuXG4gICAqIEByZXR1cm5zIFN0cmVhbSBtZXRhZGF0YSBhcnJheSAobWF5IGJlIGVtcHR5KS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvciAoZS5nLiwgNDA0IGZvciB1bmtub3duIGNhcmQpLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0U3RyZWFtcyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8U3RyZWFtTWV0YVtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9zdHJlYW1zYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8U3RyZWFtTWV0YVtdPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgYSBzdHJlYW0ncyBtZXRhZGF0YSBhbmQgYWxsIHJhdyBsaW5lcy5cbiAgICpcbiAgICogVGhlIGBzdHJlYW1UeXBlYCBhbmQgYGZpbGVuYW1lYCBhcmUgVVJJLWVuY29kZWQgYXV0b21hdGljYWxseS4gRm9yIGNvbXBsZXRlZFxuICAgKiBzdHJlYW1zIHRoZSByZXR1cm5lZCBgbGluZXNgIGFycmF5IGlzIHRoZSBmdWxsIGNvbnRlbnQ7IGZvciBhY3RpdmUgc3RyZWFtcyBpdFxuICAgKiBpcyBhIHNuYXBzaG90IHRoYXQgbWF5IGdyb3cgd2hpbGUgdGhlIGNhbGxlciBwcm9jZXNzZXMgaXQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgcmVxdWVzdGVkIHN0cmVhbS5cbiAgICogQHBhcmFtIHN0cmVhbVR5cGUgLSBTdHJlYW0gdHlwZSBrZXkgKGUuZy4sIGBcImNsYXVkZS1jb2RlLXNlc3Npb25cImApLlxuICAgKiBAcGFyYW0gZmlsZW5hbWUgLSBTdHJlYW0gZmlsZW5hbWUgKGUuZy4sIGBcInNlc3Npb24ubG9nXCJgKS5cbiAgICogQHJldHVybnMgTWV0YWRhdGEgYW5kIGNvbnRlbnQgbGluZXMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igb24gNDA0ICh1bmtub3duIGNhcmQgb3Igc3RyZWFtKSBvciBvdGhlciBzZXJ2ZXIgZXJyb3JzLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRTdHJlYW0oXG4gICAgY2FyZElkOiBzdHJpbmcsXG4gICAgc3RyZWFtVHlwZTogc3RyaW5nLFxuICAgIGZpbGVuYW1lOiBzdHJpbmdcbiAgKTogUHJvbWlzZTx7IG1ldGE6IFN0cmVhbU1ldGE7IGxpbmVzOiBzdHJpbmdbXSB9PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChcbiAgICAgIGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXMvJHtlbmNvZGVVUklDb21wb25lbnQoc3RyZWFtVHlwZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVuYW1lKX1gXG4gICAgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDx7IG1ldGE6IFN0cmVhbU1ldGE7IGxpbmVzOiBzdHJpbmdbXSB9Pih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIGNodW5rZWQgSlNPTkwgc3RyZWFtIHRvIHRoZSBzZXJ2ZXIgYW5kIHJldHVybnMgYSB3cml0ZXIuXG4gICAqXG4gICAqIFRoZSB3cml0ZXIgc2VuZHMgZWFjaCBsaW5lIGluIHJlYWwtdGltZSBvdmVyIGEgc2luZ2xlIEhUVFAgUE9TVCB1c2luZyBhXG4gICAqIGBSZWFkYWJsZVN0cmVhbWAgYm9keS4gQ2FsbCB7QGxpbmsgU3RyZWFtV3JpdGVyLmNsb3NlfSB3aGVuIHRoZSBwcm9kdWNlclxuICAgKiBpcyBmaW5pc2hlZCB0byBlbmQgdGhlIHJlcXVlc3QgYW5kIHJldHJpZXZlIHRoZSBzZXJ2ZXIncyBzdW1tYXJ5LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBhdHRhY2ggdGhlIHN0cmVhbSB0by5cbiAgICogQHBhcmFtIHN0cmVhbVR5cGUgLSBTdHJlYW0gdHlwZSBrZXkgZnJvbSBzZXR0aW5ncy5qc29uIChlLmcuLCBgXCJjbGF1ZGUtY29kZS1zZXNzaW9uXCJgKS5cbiAgICogQHBhcmFtIGZpbGVuYW1lIC0gU3RyZWFtIGZpbGVuYW1lIChlLmcuLCBgXCJzZXNzaW9uLWFiYy5qc29ubFwiYCkuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgdGl0bGUgYW5kIHNlc3Npb24gSUQgbWV0YWRhdGEuXG4gICAqIEByZXR1cm5zIEEge0BsaW5rIFN0cmVhbVdyaXRlcn0gZm9yIHB1c2hpbmcgbGluZXMgYW5kIGNsb3NpbmcgdGhlIHN0cmVhbS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBzdHJlYW0gPSBjbGllbnQub3BlblN0cmVhbShjYXJkSWQsICdjbGF1ZGUtY29kZS1zZXNzaW9uJywgJ3J1bi5qc29ubCcpO1xuICAgKiBzdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAnaW5pdCcgfSkpO1xuICAgKiBzdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAncmVzdWx0JyB9KSk7XG4gICAqIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHN0cmVhbS5jbG9zZSgpO1xuICAgKiBgYGBcbiAgICovXG4gIG9wZW5TdHJlYW0oY2FyZElkOiBzdHJpbmcsIHN0cmVhbVR5cGU6IHN0cmluZywgZmlsZW5hbWU6IHN0cmluZywgb3B0aW9ucz86IFN0cmVhbVdyaXRlck9wdGlvbnMpOiBTdHJlYW1Xcml0ZXIge1xuICAgIGNvbnN0IGVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcbiAgICBsZXQgY29udHJvbGxlciE6IFJlYWRhYmxlU3RyZWFtRGVmYXVsdENvbnRyb2xsZXI8VWludDhBcnJheT47XG5cbiAgICBjb25zdCBib2R5ID0gbmV3IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+KHtcbiAgICAgIHN0YXJ0KGMpIHtcbiAgICAgICAgY29udHJvbGxlciA9IGM7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKFxuICAgICAgYC9jYXJkcy8ke2NhcmRJZH0vc3RyZWFtcy8ke2VuY29kZVVSSUNvbXBvbmVudChzdHJlYW1UeXBlKX0vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWBcbiAgICApO1xuXG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC1uZGpzb24nXG4gICAgfTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VuKSB7XG4gICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VufWA7XG4gICAgfVxuICAgIGlmIChvcHRpb25zPy50aXRsZSkge1xuICAgICAgaGVhZGVyc1snWC1TdHJlYW0tVGl0bGUnXSA9IG9wdGlvbnMudGl0bGU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtU3RyZWFtLVNlc3Npb24tSWQnXSA9IG9wdGlvbnMuc2Vzc2lvbklkO1xuICAgIH1cblxuICAgIC8vIGBkdXBsZXg6ICdoYWxmJ2AgaXMgcmVxdWlyZWQgYnkgdW5kaWNpIGZvciBzdHJlYW1pbmcgcmVxdWVzdCBib2RpZXNcbiAgICAvLyBidXQgaXMgbm90IHlldCBpbiB0aGUgc3RhbmRhcmQgbGliLmRvbSBSZXF1ZXN0SW5pdCB0eXBlLlxuICAgIGNvbnN0IGZldGNoT3B0aW9uczogUmVxdWVzdEluaXQgJiB7IGR1cGxleDogc3RyaW5nIH0gPSB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGhlYWRlcnMsXG4gICAgICBib2R5LFxuICAgICAgZHVwbGV4OiAnaGFsZidcbiAgICB9O1xuXG4gICAgY29uc3QgcmVzcG9uc2VQcm9taXNlID0gZmV0Y2godXJsLCBmZXRjaE9wdGlvbnMpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHdyaXRlKGxpbmU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb250cm9sbGVyLmVucXVldWUoZW5jb2Rlci5lbmNvZGUoYCR7bGluZX1cXG5gKSk7XG4gICAgICB9LFxuICAgICAgY2xvc2U6IGFzeW5jICgpOiBQcm9taXNlPFN0cmVhbVJlc3VsdD4gPT4ge1xuICAgICAgICBjb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVzcG9uc2VQcm9taXNlO1xuICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxTdHJlYW1SZXN1bHQ+O1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLy8gLS0tIENvbXBhcmUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogU2V0cyBvciByZXBsYWNlcyB0aGUgYWN0aXZlIGNvbXBhcmlzb24gb24gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIHJlcXVlc3QgLSBDb21wYXJlIHJlcXVlc3Qgc3BlY2lmeWluZyB0aGUgY29tcGFyaXNvbiBtb2RlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgcmVzdWx0aW5nIGNvbXBhcmUgc3RhdGUuXG4gICAqL1xuICBhc3luYyBzZXRDb21wYXJlKHJlcXVlc3Q6IENvbXBhcmVSZXF1ZXN0KTogUHJvbWlzZTxDb21wYXJlU3RhdGU+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY29tcGFyZScpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21wYXJlU3RhdGU+KHVybCwgcmVxdWVzdCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGN1cnJlbnQgY29tcGFyZSBzdGF0ZSwgb3IgbnVsbCBpZiBubyBjb21wYXJpc29uIGlzIGFjdGl2ZS5cbiAgICpcbiAgICogVGhlIHNlcnZlciByZXR1cm5zIDIwNCB3aGVuIG5vIGNvbXBhcmlzb24gaXMgYWN0aXZlLCB3aGljaCB0aGlzIG1ldGhvZFxuICAgKiBtYXBzIHRvIG51bGwgcmF0aGVyIHRoYW4gdGhyb3dpbmcuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjdXJyZW50IGNvbXBhcmUgc3RhdGUsIG9yIG51bGwgaWYgbm9uZSBhY3RpdmUuXG4gICAqL1xuICBhc3luYyBnZXRDb21wYXJlKCk6IFByb21pc2U8Q29tcGFyZVN0YXRlIHwgbnVsbD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jb21wYXJlJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBoZWFkZXJzOiB0aGlzLmdldEhlYWRlcnMoKSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbCgpXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwNCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPENvbXBhcmVTdGF0ZT47XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXJzIHRoZSBhY3RpdmUgY29tcGFyaXNvbiBvbiB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBjb21wYXJpc29uIGlzIGNsZWFyZWQuXG4gICAqL1xuICBhc3luYyBjbGVhckNvbXBhcmUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NvbXBhcmUnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxufVxuIiwgIi8qKlxuICogRmFjdG9yeSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgYWN0aW9uIGhhbmRsZXJzLlxuICpcbiAqIFRoaXMgaXMgdGhlIHByaW1hcnkgYXV0aG9yaW5nIEFQSSBmb3IgYWN0aW9uIGRldmVsb3BlcnMuIEl0IHdyYXBzIGEgaGFuZGxlclxuICogZnVuY3Rpb24gYW5kIGF0dGFjaGVzIG1ldGFkYXRhIGZvciBzZXR0aW5ncy5qc29uIGdlbmVyYXRpb24uIFRoZSBTYW1lU2hhcGVcbiAqIHV0aWxpdHkgcHJvdmlkZXMgY29tcGlsZS10aW1lIHR5cG8gZGV0ZWN0aW9uLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBGYWN0b3J5IGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhY3Rpb24gaGFuZGxlcnNcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbW1hbmQgfSBmcm9tICcuLi9jb21tYW5kLXR5cGVzLmpzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29udGV4dCwgQWN0aW9uSW5wdXQgfSBmcm9tICcuLi9pbnB1dHMuanMnO1xuaW1wb3J0IHR5cGUgeyBTYW1lU2hhcGUgfSBmcm9tICcuLi90eXBlLXV0aWxzLmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uZmlndXJhdGlvbiBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gZm9yIHtAbGluayBkZWZpbmVBY3Rpb259IGZhY3RvcnkuXG4gKlxuICogQWxsIGZpZWxkcyBleGNlcHQgYGFjdGlvbk5hbWVgIGFyZSBvcHRpb25hbCBhbmQgZm9yd2FyZGVkIHRvIHNldHRpbmdzLmpzb24uXG4gKiBUaGUgQ0xJIGV4dHJhY3RzIHRoaXMgbWV0YWRhdGEgdmlhIEFTVCBhbmFseXNpcywgc28gdmFsdWVzIG11c3QgYmUgc3RyaW5nXG4gKiBsaXRlcmFscyBvciBib29sZWFuL251bWJlciBsaXRlcmFscyBpbiB0aGUgc291cmNlIGNvZGUuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvbmZpZzogQWN0aW9uQ29uZmlnID0ge1xuICogICBhY3Rpb25OYW1lOiAnTGF1bmNoIENsYXVkZScsXG4gKiAgIGRlc2NyaXB0aW9uOiAnU3RhcnQgYSBDbGF1ZGUgY29kaW5nIHNlc3Npb24nLFxuICogICBpY29uOiAnLi9pY29ucy9jbGF1ZGUuc3ZnJyxcbiAqICAgc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZTogdHJ1ZSxcbiAqICAgdGltZW91dDogMzAwMDBcbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBY3Rpb25Db25maWcge1xuICAvKipcbiAgICogU3RhYmxlIGlkZW50aWZpZXIgZm9yIHRoZSBhY3Rpb24gdXNlZCBpbiB0ZWxlbWV0cnksIGxvY2FsaXphdGlvbiwgYW5kIEFQSSBsb29rdXBzLlxuICAgKlxuICAgKiBTaG91bGQgYmUgbG93ZXJjYXNlIHdpdGggaHlwaGVucyAoZS5nLiwgJ2xhdW5jaC1jbGF1ZGUnLCAncnVuLXRlc3RzJykuXG4gICAqIElmIG9taXR0ZWQsIHRoZSBDTEkgZ2VuZXJhdGVzIGFuIElEIGJ5IHNsdWdpZnlpbmcgYGFjdGlvbk5hbWVgLlxuICAgKi9cbiAgaWQ/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBhY3Rpb24gbmFtZSB1c2VkIHRvIGlkZW50aWZ5IHRoZSBhY3Rpb24gaW4gc2V0dGluZ3MuanNvbi5cbiAgICpcbiAgICogVGhpcyBuYW1lIGFwcGVhcnMgaW4gdGhlIFVJLiBLZWVwIGl0IGNvbmNpc2UgYnV0IGRlc2NyaXB0aXZlLlxuICAgKi9cbiAgYWN0aW9uTmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBzaG93biBpbiBidXR0b24gdG9vbHRpcC5cbiAgICpcbiAgICogRXhwbGFpbiB3aGF0IHRoZSBhY3Rpb24gZG9lcyBpbiBhIGZldyB3b3Jkcy4gU2hvd24gb24gaG92ZXIgaW4gdGhlIFVJLlxuICAgKi9cbiAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFBhdGggdG8gaWNvbiBmaWxlIGZvciB0aGUgYWN0aW9uIGJ1dHRvbi5cbiAgICpcbiAgICogUGF0aHMgYXJlIHJlbGF0aXZlIHRvIHRoZSBzZXR0aW5ncy5qc29uIGZpbGUgbG9jYXRpb24uXG4gICAqIFNWRyBmb3JtYXQgcmVjb21tZW5kZWQgZm9yIGNyaXNwIHJlbmRlcmluZyBhdCBhbnkgc2l6ZS5cbiAgICovXG4gIGljb24/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gc2hvdyB0aGUgZXhlY3V0aW9uIG1vZGUgdG9nZ2xlIGluIHRoZSBVSS5cbiAgICpcbiAgICogV2hlbiB0cnVlLCB1c2VycyBjYW4gY2hvb3NlIGJldHdlZW4gaW50ZXJhY3RpdmUgYW5kIGJhY2tncm91bmQgbW9kZXMuXG4gICAqIFdoZW4gZmFsc2UgKGRlZmF1bHQpLCB0aGUgYWN0aW9uIGFsd2F5cyBydW5zIGluIGludGVyYWN0aXZlIG1vZGUuXG4gICAqL1xuICBzdXBwb3J0c0JhY2tncm91bmRNb2RlPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciBtdWx0aXBsZSBpbnN0YW5jZXMgY2FuIHJ1biBzaW11bHRhbmVvdXNseSBvbiB0aGUgc2FtZSBjYXJkLlxuICAgKlxuICAgKiBXaGVuIGZhbHNlIChkZWZhdWx0KSwgc3RhcnRpbmcgdGhlIGFjdGlvbiB3aGlsZSBpdCdzIHJ1bm5pbmcgd2lsbCBiZVxuICAgKiBibG9ja2VkLiBTZXQgdG8gdHJ1ZSBmb3IgaWRlbXBvdGVudCBhY3Rpb25zIHRoYXQgY2FuIHNhZmVseSBvdmVybGFwLlxuICAgKi9cbiAgYWxsb3dDb25jdXJyZW50PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogTWF4aW11bSBleGVjdXRpb24gdGltZSBpbiBtaWxsaXNlY29uZHMuXG4gICAqXG4gICAqIElmIHRoZSBhY3Rpb24gZXhjZWVkcyB0aGlzIHRpbWVvdXQsIHRoZSBydW50aW1lIHdpbGwgdGVybWluYXRlIGl0LlxuICAgKiBPbWl0IHRvIHVzZSB0aGUgcGxhdGZvcm0ncyBkZWZhdWx0IHRpbWVvdXQgcG9saWN5LlxuICAgKi9cbiAgdGltZW91dD86IG51bWJlcjtcblxuICAvKipcbiAgICogSGFuZGxlciBzb3VyY2UgZmlsZSBwYXRoLCBpbmplY3RlZCBieSB0aGUgYGluamVjdFNvdXJjZVBhdGhgIGVzYnVpbGRcbiAgICogcGx1Z2luIGR1cmluZyBjb25maWcgbG9hZGluZy4gRG8gbm90IHNldCBtYW51YWxseS5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBzb3VyY2VQYXRoPzogc3RyaW5nO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBIYW5kbGVyIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogSGFuZGxlciBmdW5jdGlvbiBzaWduYXR1cmUgZm9yIGFjdGlvbiBldmVudHMuXG4gKlxuICogVGhyb3dpbmcgYW4gZXJyb3Igc2lnbmFscyBhY3Rpb24gZmFpbHVyZS4gVGhlIGVycm9yIG1lc3NhZ2UgaXMgbG9nZ2VkIGFuZFxuICogc3VyZmFjZWQgdG8gdGhlIHVzZXIuIEZvciBleHBlY3RlZCBlcnJvcnMsIHRocm93IHdpdGggYSBkZXNjcmlwdGl2ZSBtZXNzYWdlLlxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIEFjdGlvbiBpbnB1dCBwYXlsb2FkIGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiBAcGFyYW0gY29udGV4dCAtIFJ1bnRpbWUgY29udGV4dCB3aXRoIGxvZ2dlciwgY3dkLCBhbmQgY2FsbGJhY2sgbWV0aG9kc1xuICogQHJldHVybnMgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIGFjdGlvbiBjb21wbGV0ZXNcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgaGFuZGxlcjogQWN0aW9uSGFuZGxlciA9IGFzeW5jIChpbnB1dCwgeyBsb2dnZXIsIG9uQ2FuY2VsIH0pID0+IHtcbiAqICAgb25DYW5jZWwoKCkgPT4ge1xuICogICAgIGxvZ2dlci5pbmZvKCdDYW5jZWxsaW5nIGFjdGlvbicpO1xuICogICB9KTtcbiAqXG4gKiAgIHRyeSB7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIGFjdGlvbicsIHsgY2FyZElkOiBpbnB1dC5jYXJkSWQgfSk7XG4gKiAgICAgYXdhaXQgcGVyZm9ybUFjdGlvbihpbnB1dCk7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ0FjdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gKiAgIH0gY2F0Y2ggKGVycikge1xuICogICAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdBY3Rpb24gZmFpbGVkJyk7XG4gKiAgICAgdGhyb3cgZXJyOyAvLyBSZS10aHJvdyB0byBzaWduYWwgZmFpbHVyZVxuICogICB9XG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIEFjdGlvbkhhbmRsZXIgPSAoaW5wdXQ6IEFjdGlvbklucHV0LCBjb250ZXh0OiBBY3Rpb25Db250ZXh0KSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRmFjdG9yeSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gYWN0aW9uIGhhbmRsZXIgd2l0aCBtZXRhZGF0YSBmb3Igc2V0dGluZ3MuanNvbiBnZW5lcmF0aW9uLlxuICpcbiAqIFRoaXMgZmFjdG9yeSB3cmFwcyB5b3VyIGhhbmRsZXIgZnVuY3Rpb24gYW5kIGF0dGFjaGVzIG1ldGFkYXRhIHRoYXQgdGhlIENMSVxuICogZXh0cmFjdHMgd2hlbiBidWlsZGluZyBzZXR0aW5ncy5qc29uLiBUaGUgcmV0dXJuZWQgY29tbWFuZCBpcyBib3RoIGNhbGxhYmxlXG4gKiAoZm9yIHRoZSBydW50aW1lKSBhbmQgaW5zcGVjdGFibGUgKGZvciB0aGUgQ0xJKS5cbiAqXG4gKiBUaGUgZ2VuZXJpYyBwYXJhbWV0ZXIgcHJlc2VydmVzIHRoZSBhY3Rpb24gbmFtZSBhcyBhIGxpdGVyYWwgdHlwZS5cbiAqXG4gKiBAdGVtcGxhdGUgVCAtIFRoZSBjb25maWcgdHlwZSBleHRlbmRpbmcgQWN0aW9uQ29uZmlnXG4gKiBAcGFyYW0gY29uZmlnIC0gQWN0aW9uIG1ldGFkYXRhICh1c2VzIFNhbWVTaGFwZSB0byBjYXRjaCB0eXBvcylcbiAqIEBwYXJhbSBoYW5kbGVyIC0gQXN5bmMgZnVuY3Rpb24gdGhhdCBpbXBsZW1lbnRzIHRoZSBhY3Rpb24gbG9naWNcbiAqIEByZXR1cm5zIEEgY2FsbGFibGUgY29tbWFuZCB3aXRoIGF0dGFjaGVkIG1ldGFkYXRhXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEJhc2ljIHVzYWdlXG4gKiBleHBvcnQgZGVmYXVsdCBkZWZpbmVBY3Rpb24oXG4gKiAgIHsgYWN0aW9uTmFtZTogJ0xhdW5jaCBDbGF1ZGUnIH0sXG4gKiAgIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICAgIGxvZ2dlci5pbmZvKCdMYXVuY2hpbmcgQ2xhdWRlJywgeyBjYXJkSWQ6IGlucHV0LmNhcmRJZCB9KTtcbiAqICAgICBhd2FpdCBzcGF3bkNsYXVkZShpbnB1dCk7XG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gV2l0aCBmdWxsIGNvbmZpZ3VyYXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IGRlZmluZUFjdGlvbihcbiAqICAge1xuICogICAgIGFjdGlvbk5hbWU6ICdEZXBsb3kgQXBwbGljYXRpb24nLFxuICogICAgIGRlc2NyaXB0aW9uOiAnRGVwbG95IHRvIHByb2R1Y3Rpb24nLFxuICogICAgIGljb246ICcuL2ljb25zL2RlcGxveS5zdmcnLFxuICogICAgIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU6IHRydWUsXG4gKiAgICAgYWxsb3dDb25jdXJyZW50OiBmYWxzZSxcbiAqICAgICB0aW1lb3V0OiA2MDAwMFxuICogICB9LFxuICogICBhc3luYyAoaW5wdXQsIGNvbnRleHQpID0+IHtcbiAqICAgICBjb250ZXh0Lm9uQ2FuY2VsKCgpID0+IGNsZWFudXAoKSk7XG4gKiAgICAgYXdhaXQgZGVwbG95KGlucHV0LCBjb250ZXh0KTtcbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lQWN0aW9uPFQgZXh0ZW5kcyBBY3Rpb25Db25maWc+KFxuICBjb25maWc6IFNhbWVTaGFwZTxBY3Rpb25Db25maWcsIFQ+LFxuICBoYW5kbGVyOiBBY3Rpb25IYW5kbGVyXG4pOiBBY3Rpb25Db21tYW5kPFRbJ2FjdGlvbk5hbWUnXT4ge1xuICBjb25zdCBmbiA9IGFzeW5jIChpbnB1dDogQWN0aW9uSW5wdXQsIGNvbnRleHQ6IEFjdGlvbkNvbnRleHQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBhd2FpdCBoYW5kbGVyKGlucHV0LCBjb250ZXh0KTtcbiAgfTtcblxuICBmbi5mYWN0b3J5VHlwZSA9ICdhY3Rpb24nIGFzIGNvbnN0O1xuICBmbi5pZCA9IGNvbmZpZy5pZDtcbiAgZm4uYWN0aW9uTmFtZSA9IGNvbmZpZy5hY3Rpb25OYW1lO1xuICBmbi5kZXNjcmlwdGlvbiA9IGNvbmZpZy5kZXNjcmlwdGlvbjtcbiAgZm4uaWNvbiA9IGNvbmZpZy5pY29uO1xuICBmbi5zdXBwb3J0c0JhY2tncm91bmRNb2RlID0gY29uZmlnLnN1cHBvcnRzQmFja2dyb3VuZE1vZGU7XG4gIGZuLmFsbG93Q29uY3VycmVudCA9IGNvbmZpZy5hbGxvd0NvbmN1cnJlbnQ7XG4gIGZuLnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcbiAgZm4uc291cmNlUGF0aCA9IGNvbmZpZy5zb3VyY2VQYXRoO1xuXG4gIHJldHVybiBmbiBhcyBBY3Rpb25Db21tYW5kPFRbJ2FjdGlvbk5hbWUnXT47XG59XG4iLCAiLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENhcmRzIEV4dGVuc2lvbiBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICpcbiAqIFRoZSBleGVjdXRpb24gd3JhcHBlciBpbmplY3RzIGFjdGlvbiBhbmQgdHlwZSBob29rIGlucHV0cyB2aWEgcHJvY2Vzcy5lbnYuXG4gKiBUaGlzIG1vZHVsZSBwcm92aWRlcyBzdHJpY3QgZ2V0dGVycyBhbmQgdHlwZWQgZXh0cmFjdG9ycyBzbyBoYW5kbGVycyBkbyBub3RcbiAqIG5lZWQgdG8gcGFyc2UgZW52aXJvbm1lbnQgdmFyaWFibGVzIG1hbnVhbGx5LlxuICpcbiAqIFVzZSB0aGUgaW5kaXZpZHVhbCBnZXR0ZXJzIHdoZW4geW91IG9ubHkgbmVlZCBvbmUgdmFsdWU7IHVzZVxuICoge0BsaW5rIGV4dHJhY3RBY3Rpb25JbnB1dH0gb3Ige0BsaW5rIGV4dHJhY3RUeXBlSW5wdXR9IHdoZW4geW91IG5lZWQgYSBmdWxsXG4gKiB0eXBlZCBwYXlsb2FkIGZvciBhbiBhY3Rpb24gb3IgdHlwZSBob29rLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENhcmRzIEV4dGVuc2lvbiBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbklucHV0LCBUeXBlSG9va0lucHV0IH0gZnJvbSAnLi9pbnB1dHMuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lcyBzZXQgYnkgdGhlIENhcmRzIGV4ZWN1dGlvbiB3cmFwcGVyLlxuICpcbiAqIFRoaXMgaXMgdGhlIHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggZm9yIGVudiB2YXIga2V5cyB1c2VkIGJ5IGFjdGlvbiBhbmQgdHlwZVxuICogaG9vayBwcm9jZXNzZXMuIEtlZXAgaXQgaW4gc3luYyB3aXRoIHRoZSB3cmFwcGVyIHRvIGF2b2lkIHN1YnRsZSBcInVuZGVmaW5lZFxuICogaW5wdXRcIiBidWdzLlxuICovXG5leHBvcnQgY29uc3QgQ0FSRFNfRU5WX1ZBUlMgPSB7XG4gIC8qKlxuICAgKiBVbmlxdWUgaWRlbnRpZmllciBmb3IgdGhlIGN1cnJlbnQgY2FyZC5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQ0FSRF9JRDogJ0NBUkRfSUQnLFxuXG4gIC8qKlxuICAgKiBUaGUgZW52aXJvbm1lbnQgbmFtZSBmcm9tIHNldHRpbmdzLmpzb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEVOVklST05NRU5UOiAnRU5WSVJPTk1FTlQnLFxuXG4gIC8qKlxuICAgKiBEaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiBidXR0b24gdGhhdCB0cmlnZ2VyZWQgdGhpcyBoYW5kbGVyLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqL1xuICBBQ1RJT05fTkFNRTogJ0FDVElPTl9OQU1FJyxcblxuICAvKipcbiAgICogQ2FyZCdzIGV4ZWN1dGlvbiBtb2RlLCBkZXRlcm1pbmluZyBVSSBpbnRlcmFjdGlvbiBtb2RlbC5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKiBWYWxpZCB2YWx1ZXM6ICdpbnRlcmFjdGl2ZScgfCAnYmFja2dyb3VuZCdcbiAgICovXG4gIEVYRUNVVElPTl9NT0RFOiAnRVhFQ1VUSU9OX01PREUnLFxuXG4gIC8qKlxuICAgKiBDYXJkcyBzZXJ2ZXIgYmFzZSBVUkwgZm9yIEFQSSBjYWxscy5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQVBJX0JBU0VfVVJMOiAnQVBJX0JBU0VfVVJMJyxcblxuICAvKipcbiAgICogQXV0aGVudGljYXRpb24gdG9rZW4gZm9yIEFQSSBjYWxscy5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQVBJX0FDQ0VTU19UT0tFTjogJ0FQSV9BQ0NFU1NfVE9LRU4nLFxuXG4gIC8qKlxuICAgKiBDb25maWd1cmVkIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyIGZyb20gY2FyZHMuY29kaW5nQWdlbnQgc2V0dGluZy5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKiBPcHRpb25hbC5cbiAgICovXG4gIENPRElOR19BR0VOVDogJ0NPRElOR19BR0VOVCcsXG5cbiAgLyoqXG4gICAqIFRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFRZUEVfTkFNRTogJ1RZUEVfTkFNRScsXG5cbiAgLyoqXG4gICAqIFRoZSB0eXBlJ3MgdmVyc2lvbiBzdHJpbmcgZnJvbSBzZXR0aW5ncy5qc29uIGNvbmZpZ3VyYXRpb24uXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX1ZFUlNJT046ICdUWVBFX1ZFUlNJT04nLFxuXG4gIC8qKlxuICAgKiBUaGUgZmlsZSBuYW1lIHdpdGhpbiB0aGUgdHlwZSBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX05BTUU6ICdGSUxFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBGdWxsIHBhdGggdG8gdGhlIGZpbGUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX1BBVEg6ICdGSUxFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBGaWxlIHNpemUgaW4gYnl0ZXMuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX1NJWkU6ICdGSUxFX1NJWkUnLFxuXG4gIC8qKlxuICAgKiBTSEEyNTYgaGFzaCBvZiBjb250ZW50LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgU0hBMjU2OiAnU0hBMjU2JyxcblxuICAvKipcbiAgICogTUlNRSB0eXBlIG9mIHRoZSBjb250ZW50LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgQ09OVEVOVF9UWVBFOiAnQ09OVEVOVF9UWVBFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgcHJvY2Vzcy5leGVjUGF0aGAgKHdpdGhcbiAgICogYEVMRUNUUk9OX1JVTl9BU19OT0RFPTFgKS4gQ29tbWFuZHMgaW4gc2V0dGluZ3MuanNvbiB1c2VcbiAgICogYCRWU0NPREVfTk9ERSAuL2Jpbi8uLi5gIHNvIHRoZXkgd29yayByZWdhcmRsZXNzIG9mXG4gICAqIHdoZXRoZXIgYG5vZGVgIGlzIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgVlNDT0RFX05PREU6ICdWU0NPREVfTk9ERScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXIgcnVubmluZyB0aGUgd3JhcHBlciBwcm9jZXNzLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIHdyYXBwZXIgZnJvbSBgcHJvY2Vzcy5leGVjUGF0aGAuIFVzZSBgJE5PREVgIGluIGVtYmVkZGVkXG4gICAqIGJhc2ggc3RhdGVtZW50cyB0byBpbnZva2UgTm9kZSBzY3JpcHRzIHBvcnRhYmx5LlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMuXG4gICAqL1xuICBOT0RFOiAnTk9ERScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFVuaXggZG9tYWluIHNvY2tldCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBTT0NLRVRfUEFUSDogJ1NPQ0tFVF9QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byBhIEpTT04gZmlsZSBjb250YWluaW5nIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmcm9tIGEgcHJldmlvdXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS4gT3B0aW9uYWwuXG4gICAqL1xuICBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIOiAnU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIHNldHRpbmdzIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQ09ORklHX1BBVEg6ICdDT05GSUdfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgd29ya3NwYWNlIHJvb3QgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgV09SS1NQQUNFX1BBVEg6ICdXT1JLU1BBQ0VfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGNhcmQncyByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENBUkRfUkVQT19QQVRIOiAnQ0FSRF9SRVBPX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlZCBzaGVsbCBjb21tYW5kIGZvciB0aGUgd3JhcHBlciB0byBzcGF3biBhcyB0aGUgYWN0aW9uIGhhbmRsZXIuXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyBjb25zdW1lZCBieSB0aGUgd3JhcHBlciAobm90IGJ5IGFjdGlvbiBoYW5kbGVycykuXG4gICAqL1xuICBBQ1RJT05fQ09NTUFORDogJ0FDVElPTl9DT01NQU5EJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCB0aGF0IHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3aWxsIG1lcmdlIGludG8uXG4gICAqIFJlc29sdmVkIGZyb20gdGhlIHdvcmtzcGFjZSBIRUFEIGF0IGxhdW5jaCB0aW1lLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBCQVNFX0JSQU5DSDogJ0JBU0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBmcm9tIHdoaWNoIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3YXMgY3JlYXRlZC5cbiAgICogTWF5IGRpZmZlciBmcm9tIEJBU0VfQlJBTkNIIHdoZW4gdGhlIHdvcmt0cmVlIHdhcyBjcmVhdGVkIGFnYWluc3RcbiAgICogYSBkaWZmZXJlbnQgcmVmIHRoYW4gdGhlIGN1cnJlbnQgd29ya3NwYWNlIEhFQUQuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFBBUkVOVF9CUkFOQ0g6ICdQQVJFTlRfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBuYW1lIGZvciB0aGUgY2FyZCdzIHdvcmtzcGFjZSBpbXBsZW1lbnRhdGlvbi5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uIGFmdGVyIHJlc29sdmluZyBvciBjcmVhdGluZyB0aGUgd29ya3RyZWUuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBXT1JLU1BBQ0VfQlJBTkNIOiAnV09SS1NQQUNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIFNlc3Npb24gSUQgcGVyc2lzdGVkIGJ5IHRoZSBzZXNzaW9uLXN0YXJ0IGhvb2sgdmlhIGBwZXJzaXN0RW52VmFyYC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIEJhc2ggdG9vbCBzaGVsbCBkZXNjZW5kYW50cyAoY29tbWFuZHMsIGdpdCBob29rcykgYWZ0ZXJcbiAgICogc2Vzc2lvbiBzdGFydC4gTk9UIGF2YWlsYWJsZSBpbiBob29rcyBzcGF3bmVkIGRpcmVjdGx5IGJ5IENsYXVkZSBDb2RlXG4gICAqIChzdG9wLCBzZXNzaW9uLWVuZCwgZXRjLikgXHUyMDE0IHRob3NlIHJlY2VpdmUgdGhlIHNlc3Npb24gSUQgdmlhIGhvb2sgaW5wdXQuXG4gICAqXG4gICAqIFRoZSBjYXJkLXJlcG8gcG9zdC1jb21taXQgaG9vayByZWFkcyB0aGlzIHRvIHJlY29yZCBjb21taXRzIGRpcmVjdGx5XG4gICAqIHdpdGhvdXQgbmVlZGluZyBhIHByb2Nlc3MtdHJlZSB3YWxrIG9yIFBJRCByZWdpc3RyeSBsb29rdXAuXG4gICAqL1xuICBDQVJEU19TRVNTSU9OX0lEOiAnQ0FSRFNfU0VTU0lPTl9JRCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAgICogaW50byBhbGwgc3Bhd25lZCBhY3Rpb24gcHJvY2Vzc2VzLiBVc2UgdGhpcyB0byBsb2NhdGUgYnVuZGxlZCBhc3NldHMgc3VjaFxuICAgKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEVYVEVOU0lPTl9QQVRIOiAnRVhURU5TSU9OX1BBVEgnXG59IGFzIGNvbnN0O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJbmRpdmlkdWFsIEdldHRlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSBleGVjdXRpb24gd3JhcHBlciBhbHdheXMgc2V0cyB0aGlzIGZvciBldmVyeSBhY3Rpb24gYW5kIHR5cGUgaG9vay5cbiAqIEByZXR1cm5zIFRoZSBjdXJyZW50IGNhcmQgSURcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0FSRF9JRCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2FyZElkID0gZ2V0Q2FyZElkKCk7XG4gKiBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyBjYXJkOiAke2NhcmRJZH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FyZElkKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX0lEfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZW52aXJvbm1lbnQgbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZhbHVlIG1hdGNoZXMgdGhlIGVudmlyb25tZW50IGtleSBpbiBzZXR0aW5ncy5qc29uIChlLmcuLCBcImRlZmF1bHRcIiwgXCJzdGFnaW5nXCIpLlxuICogQHJldHVybnMgVGhlIGVudmlyb25tZW50IG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRU5WSVJPTk1FTlQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudmlyb25tZW50ID0gZ2V0RW52aXJvbm1lbnQoKTtcbiAqIGNvbnNvbGUubG9nKGBFbnZpcm9ubWVudDogJHtlbnZpcm9ubWVudH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52aXJvbm1lbnQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFjdGlvbiBidXR0b24gbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHRoZSBkaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgaGFuZGxlciwgbWF0Y2hpbmdcbiAqIHRoZSBgYWN0aW9uTmFtZWAgZmllbGQgZnJvbSBgZGVmaW5lQWN0aW9uYC5cbiAqIEByZXR1cm5zIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBjdXJyZW50IGhhbmRsZXIgcnVuLlxuICogQHRocm93cyBFcnJvciBpZiBBQ1RJT05fTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYWN0aW9uTmFtZSA9IGdldEFjdGlvbk5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBSdW5uaW5nIGFjdGlvbjogJHthY3Rpb25OYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3Rpb25OYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBleGVjdXRpb24gbW9kZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBEZXRlcm1pbmVzIHRoZSBVSSBpbnRlcmFjdGlvbiBtb2RlbCBmb3IgYWN0aW9ucy5cbiAqIEByZXR1cm5zIFRoZSBleGVjdXRpb24gbW9kZSAoJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcpXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYRUNVVElPTl9NT0RFIGlzIG1pc3NpbmcsIGVtcHR5LCBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgbW9kZSA9IGdldEV4ZWN1dGlvbk1vZGUoKTtcbiAqIGlmIChtb2RlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gKiAgIC8vIFNob3cgdXNlciBwcm9tcHRzXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4ZWN1dGlvbk1vZGUoKTogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9YCk7XG4gIH1cbiAgaWYgKHZhbHVlICE9PSAnaW50ZXJhY3RpdmUnICYmIHZhbHVlICE9PSAnYmFja2dyb3VuZCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX06IGV4cGVjdGVkICdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYmFzZSBVUkwgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVXNlIHRoaXMgYXMgdGhlIGJhc2UgZm9yIGNvbnN0cnVjdGluZyBBUEkgZW5kcG9pbnRzLiBUaGUgVVJMIGRvZXMgbm90IGluY2x1ZGVcbiAqIGEgdHJhaWxpbmcgc2xhc2guXG4gKiBAcmV0dXJucyBCYXNlIFVSTCB1c2VkIHRvIGNvbnN0cnVjdCBDYXJkcyBBUEkgZW5kcG9pbnRzIGZvciB0aGlzIGV4ZWN1dGlvbi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0JBU0VfVVJMIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhcGlVcmwgPSBnZXRBcGlCYXNlVXJsKCk7XG4gKiBjb25zdCBlbmRwb2ludCA9IGAke2FwaVVybH0vY2FyZHMvJHtjYXJkSWR9YDtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQmFzZVVybCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkx9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYWNjZXNzIHRva2VuIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIEJlYXJlciB0b2tlbiB2YWxpZCBmb3IgdGhlIGR1cmF0aW9uIG9mIHRoaXMgYWN0aW9uIG9yIHR5cGUgaG9vayBleGVjdXRpb24uXG4gKiBJbmNsdWRlIGluIEF1dGhvcml6YXRpb24gaGVhZGVycyB3aGVuIGNhbGxpbmcgdGhlIENhcmRzIEFQSS5cbiAqIEByZXR1cm5zIEJlYXJlciB0b2tlbiB0aGF0IGF1dGhvcml6ZXMgQVBJIHJlcXVlc3RzIGZvciB0aGlzIGV4ZWN1dGlvbiBjb250ZXh0LlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQUNDRVNTX1RPS0VOIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0b2tlbiA9IGdldEFwaUFjY2Vzc1Rva2VuKCk7XG4gKiBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGFwaVVybCwge1xuICogICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0b2tlbn1gIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlBY2Nlc3NUb2tlbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU5dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGNvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogT3B0aW9uYWwgdmFsdWUgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLiBXaGVuIHNldCwgaW5kaWNhdGVzIHdoaWNoIEFJXG4gKiBjb2RpbmcgYXNzaXN0YW50IHRoZSB1c2VyIHByZWZlcnMuIEFjdGlvbnMgY2FuIHVzZSB0aGlzIHRvIGN1c3RvbWl6ZSBiZWhhdmlvclxuICogb3IgcHJvbXB0cyBmb3IgZGlmZmVyZW50IGFnZW50cy5cbiAqIEByZXR1cm5zIFRoZSBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb2RpbmdBZ2VudCA9IGdldENvZGluZ0FnZW50KCk7XG4gKiBpZiAoY29kaW5nQWdlbnQgPT09ICdjbGF1ZGUnKSB7XG4gKiAgIC8vIEN1c3RvbWl6ZSBmb3IgQ2xhdWRlXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvZGluZ0FnZW50KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ESU5HX0FHRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lIGZvciB0eXBlIGhvb2tzLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgb25seSBwcmVzZW50IGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICogQHJldHVybnMgVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdHlwZU5hbWUgPSBnZXRUeXBlTmFtZSgpO1xuICogY29uc29sZS5sb2coYFR5cGU6ICR7dHlwZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGUgdmVyc2lvbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZlcnNpb24gY29tZXMgZnJvbSB0aGUgdHlwZSBjb25maWd1cmF0aW9uIGluIHNldHRpbmdzLmpzb24uXG4gKiBAcmV0dXJucyBUaGUgdmVyc2lvbiBzdHJpbmcgZnJvbSB0eXBlIGNvbmZpZ1xuICogQHRocm93cyBFcnJvciBpZiBUWVBFX1ZFUlNJT04gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHZlcnNpb24gPSBnZXRUeXBlVmVyc2lvbigpO1xuICogY29uc29sZS5sb2coYFZlcnNpb246ICR7dmVyc2lvbn1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZVZlcnNpb24oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT05dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBuYW1lIGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZpbGUgbmFtZSByZWxhdGl2ZSB0byB0aGUgdHlwZSBkaXJlY3RvcnksIG5vdCBhIGZ1bGwgcGF0aC5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBGaWxlOiAke2ZpbGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSB0eXBlZCBmaWxlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZ1bGx5IHJlc29sdmVkIHBhdGggb24gZGlzayBwcm92aWRlZCBieSB0aGUgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKiBAcmV0dXJucyBUaGUgZnVsbCBwYXRoIHRvIHRoZSBmaWxlXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZVBhdGggPSBnZXRGaWxlUGF0aCgpO1xuICogY29uc29sZS5sb2coYFBhdGg6ICR7ZmlsZVBhdGh9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgc2l6ZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgdmFsdWUgaXMgcGFyc2VkIGFzIGEgYmFzZS0xMCBpbnRlZ2VyLlxuICogQHJldHVybnMgVGhlIGZpbGUgc2l6ZSBpbiBieXRlc1xuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1NJWkUgaXMgbWlzc2luZyBvciBub3QgYSBudW1iZXJcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBzaXplID0gZ2V0RmlsZVNpemUoKTtcbiAqIGNvbnNvbGUubG9nKGBTaXplOiAke3NpemV9IGJ5dGVzYCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVTaXplKCk6IG51bWJlciB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX1gKTtcbiAgfVxuICBjb25zdCBzaXplID0gTnVtYmVyLnBhcnNlSW50KHZhbHVlLCAxMCk7XG4gIGlmIChOdW1iZXIuaXNOYU4oc2l6ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9OiBleHBlY3RlZCBudW1iZXIsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gc2l6ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgU0hBMjU2IGhhc2ggZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogVXNlZnVsIGZvciBkZXRlY3RpbmcgY29udGVudCBjaGFuZ2VzIHdpdGhvdXQgcmVhZGluZyB0aGUgZmlsZSBhZ2Fpbi5cbiAqIEByZXR1cm5zIFRoZSBTSEEyNTYgaGFzaCBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBTSEEyNTYgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGhhc2ggPSBnZXRTaGEyNTYoKTtcbiAqIGNvbnNvbGUubG9nKGBIYXNoOiAke2hhc2h9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNoYTI1NigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNIQTI1Nl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TSEEyNTZ9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBNSU1FIHR5cGUgZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogUHJvdmlkZWQgZm9yIHR5cGUgaG9vayBldmVudHMgc28gdmFsaWRhdG9ycyBjYW4gYnJhbmNoIG9uIGNvbnRlbnQgdHlwZS5cbiAqIEByZXR1cm5zIFRoZSBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09OVEVOVF9UWVBFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb250ZW50VHlwZSA9IGdldENvbnRlbnRUeXBlKCk7XG4gKiBjb25zb2xlLmxvZyhgQ29udGVudCB0eXBlOiAke2NvbnRlbnRUeXBlfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb250ZW50VHlwZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlciBwYXRoIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgc2V0IGJ5IHRoZSBleHRlbnNpb24gZHVyaW5nIGFjdGl2YXRpb24gYW5kIGluamVjdGVkIGludG8gYWxsXG4gKiBzcGF3bmVkIGFjdGlvbi9ob29rIHByb2Nlc3Nlcy4gQ29uZmlndXJhdGlvbiBhdXRob3JzIGNhbiB1c2UgaXQgdG8gaW52b2tlXG4gKiBOb2RlLmpzIHdpdGhvdXQgcmVseWluZyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gKlxuICogQHJldHVybnMgVGhlIHBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXJcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVlNDT0RFX05PREUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG5vZGVQYXRoID0gZ2V0VnNjb2RlTm9kZVBhdGgoKTtcbiAqIGV4ZWNGaWxlU3luYyhub2RlUGF0aCwgWydzY3JpcHQuanMnXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFZzY29kZU5vZGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgcGF0aCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gKlxuICogQHJldHVybnMgVW5peCBzb2NrZXQgcGF0aCB1c2VkIHRvIHNlbmQgcnVudGltZSBjb250cm9sIG1lc3NhZ2VzLlxuICogQHRocm93cyBFcnJvciBpZiBTT0NLRVRfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb2NrZXRQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBwYXRoIHRvIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIG9wdGlvbmFsIFx1MjAxNCByZXR1cm5zIHVuZGVmaW5lZCB3aGVuIG5vdCBzZXQgKGkuZS4sIHRoZSBhY3Rpb25cbiAqIHdhcyBub3QgcmVsYXVuY2hlZCB2aWEgc3dpdGNoVG9JbnRlcmFjdGl2ZSkuXG4gKlxuICogQHJldHVybnMgVGhlIGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBkaXJlY3RvcnkgY29udGFpbmluZyBnZW5lcmF0ZWQgc2V0dGluZ3MgYXJ0aWZhY3RzLlxuICogQHRocm93cyBFcnJvciBpZiBDT05GSUdfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWdQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGFjdGl2ZSBWUyBDb2RlIHdvcmtzcGFjZSByb290LlxuICogQHRocm93cyBFcnJvciBpZiBXT1JLU1BBQ0VfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRXb3Jrc3BhY2VQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZXBvc2l0b3J5IGFzc29jaWF0ZWQgd2l0aCB0aGUgYWN0aXZlIGNhcmQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfUkVQT19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRSZXBvUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhURU5TSU9OX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZW5zaW9uUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcGFyc2VzIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBXaGVuIGBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIYCBpcyBzZXQsIHJlYWRzIHRoZSBmaWxlIGF0IHRoYXQgcGF0aFxuICogYW5kIHBhcnNlcyBpdCBhcyBKU09OLiBSZXR1cm5zIHVuZGVmaW5lZCBpZiB0aGUgZW52IHZhciBpcyBub3Qgc2V0LlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXJzZWQgZGF0YSwgb3IgdW5kZWZpbmVkIGlmIHRoZSBwYXRoIGlzIG5vdCBzZXRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGZpbGUgY2Fubm90IGJlIHJlYWQgb3IgY29udGFpbnMgaW52YWxpZCBKU09OXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKTogdW5rbm93biB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGRhdGFQYXRoID0gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk7XG4gIGlmIChkYXRhUGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGRhdGFQYXRoLCAndXRmLTgnKTtcbiAgcmV0dXJuIEpTT04ucGFyc2UoY29udGVudCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVkIElucHV0IEV4dHJhY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCBhY3Rpb24gaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBBY3Rpb25JbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhbiBhY3Rpb24gaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmNhcmRJZCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5leGVjdXRpb25Nb2RlKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFjdGlvbklucHV0KCk6IEFjdGlvbklucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGFjdGlvbk5hbWU6IGdldEFjdGlvbk5hbWUoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICBleGVjdXRpb25Nb2RlOiBnZXRFeGVjdXRpb25Nb2RlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpLFxuICAgIGNvZGluZ0FnZW50OiBnZXRDb2RpbmdBZ2VudCgpLFxuICAgIHN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhOiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKSxcbiAgICB3b3Jrc3BhY2VQYXRoOiBnZXRXb3Jrc3BhY2VQYXRoKCksXG4gICAgY2FyZFJlcG9QYXRoOiBnZXRDYXJkUmVwb1BhdGgoKSxcbiAgICBjb25maWdQYXRoOiBnZXRDb25maWdQYXRoKCksXG4gICAgZXh0ZW5zaW9uUGF0aDogZ2V0RXh0ZW5zaW9uUGF0aCgpXG4gIH07XG59XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgdHlwZSBob29rIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciB0eXBlIGxpZmVjeWNsZSBob29rcyAodmFsaWRhdG9yLCBjcmVhdGUsXG4gKiB1cGRhdGUsIGRlbGV0ZSkuXG4gKlxuICogQHJldHVybnMgVHlwZWQgVHlwZUhvb2tJbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhIHR5cGUgaG9vayBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RUeXBlSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LnR5cGVOYW1lKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmZpbGVOYW1lKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFR5cGVJbnB1dCgpOiBUeXBlSG9va0lucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIHR5cGVOYW1lOiBnZXRUeXBlTmFtZSgpLFxuICAgIHR5cGVWZXJzaW9uOiBnZXRUeXBlVmVyc2lvbigpLFxuICAgIGZpbGVOYW1lOiBnZXRGaWxlTmFtZSgpLFxuICAgIGZpbGVQYXRoOiBnZXRGaWxlUGF0aCgpLFxuICAgIGZpbGVTaXplOiBnZXRGaWxlU2l6ZSgpLFxuICAgIGZpbGVTaGEyNTY6IGdldFNoYTI1NigpLFxuICAgIGNvbnRlbnRUeXBlOiBnZXRDb250ZW50VHlwZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKVxuICB9O1xufVxuIiwgIi8qKlxuICogRXhpdCBjb2RlIGNvbnN0YW50cyBhbmQgaGVscGVycyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzLlxuICpcbiAqIENhcmRzIGhvb2tzIGNvbW11bmljYXRlIHN1Y2Nlc3MgYW5kIGZhaWx1cmUgdmlhIHByb2Nlc3MgZXhpdCBjb2RlcyBhbmRcbiAqIHN0ZGVyciBvdXRwdXQuIFRoaXMgbW9kdWxlIGNlbnRyYWxpemVzIHRob3NlIGNvbnZlbnRpb25zIHNvIHRoZSBydW50aW1lXG4gKiBhbmQgaG9va3Mgc3BlYWsgdGhlIHNhbWUgcHJvdG9jb2wuXG4gKlxuICogQHN1bW1hcnkgRXhpdCBjb2RlIGNvbnN0YW50cyBhbmQgaGVscGVycyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzXG4gKiBAbW9kdWxlXG4gKi9cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhpdCBDb2RlIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEV4aXQgY29kZXMgdXNlZCBieSBDYXJkcyBob29rcy5cbiAqXG4gKiBUaGUgQ2FyZHMgcnVudGltZSBpbnRlcnByZXRzIGFueSBub24temVybyBleGl0IGNvZGUgYXMgZmFpbHVyZS5cbiAqL1xuZXhwb3J0IGNvbnN0IEVYSVRfQ09ERVMgPSB7XG4gIC8qKiBIYW5kbGVyIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuICovXG4gIFNVQ0NFU1M6IDAsXG4gIC8qKiBIYW5kbGVyIHRocmV3IGFuIGVycm9yLiAqL1xuICBFUlJPUjogMSxcbiAgLyoqIEhhbmRsZXIgcHJvY2Vzc2VkIHN3aXRjaFRvSW50ZXJhY3RpdmUgYW5kIGlzIGV4aXRpbmcgZm9yIHJlbGF1bmNoLiAqL1xuICBTV0lUQ0hfVE9fSU5URVJBQ1RJVkU6IDQyXG59IGFzIGNvbnN0O1xuXG4vKipcbiAqIFVuaW9uIG9mIHZhbGlkIENhcmRzIGhvb2sgZXhpdCBjb2Rlcy5cbiAqL1xuZXhwb3J0IHR5cGUgRXhpdENvZGUgPSAodHlwZW9mIEVYSVRfQ09ERVMpW2tleW9mIHR5cGVvZiBFWElUX0NPREVTXTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXJyb3IgT3V0cHV0IEhlbHBlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBXcml0ZXMgYW4gZXJyb3IgbWVzc2FnZSB0byBzdGRlcnIgd2l0aCBhIHRyYWlsaW5nIG5ld2xpbmUuXG4gKlxuICogVXNlIHRoaXMgd2hlbiBhIGhvb2sgbmVlZHMgdG8gcmVwb3J0IGEgZmFpbHVyZSB3aXRob3V0IHBvbGx1dGluZyBzdGRvdXQuXG4gKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIG1lc3NhZ2UgdG8gd3JpdGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB3cml0ZUVycm9yKCdGYWlsZWQgdG8gY29ubmVjdCB0byBkYXRhYmFzZScpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHttZXNzYWdlfVxcbmApO1xufVxuXG4vKipcbiAqIFdyaXRlcyBhbiBlcnJvciBtZXNzYWdlIHRvIHN0ZGVyciBhbmQgZXhpdHMgd2l0aCBFUlJPUiBjb2RlLlxuICpcbiAqIFRoaXMgdGVybWluYXRlcyB0aGUgcHJvY2VzcyBpbW1lZGlhdGVseSwgc28gYW55IHBlbmRpbmcgYXN5bmMgd29yayB3aWxsXG4gKiBub3QgZmluaXNoIHVubGVzcyBpdCB3YXMgYWxyZWFkeSBhd2FpdGVkLlxuICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciBtZXNzYWdlIHRvIHdyaXRlIGJlZm9yZSBleGl0aW5nXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKCFpc1ZhbGlkKSB7XG4gKiAgIGV4aXRXaXRoRXJyb3IoJ0ludmFsaWQgY29uZmlndXJhdGlvbicpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGl0V2l0aEVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IG5ldmVyIHtcbiAgd3JpdGVFcnJvcihtZXNzYWdlKTtcbiAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuRVJST1IpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJbnRlcm5hbCBSZXN1bHQgVHJhY2tpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBJbnRlcm5hbCBydW50aW1lIGJvb2trZWVwaW5nIGZvciBob29rIGV4ZWN1dGlvbiByZXN1bHRzLlxuICpcbiAqIFRoaXMgc3RydWN0dXJlIGFsbG93cyB0aGUgcnVudGltZSB0byBjYXJyeSBlcnJvciBkZXRhaWxzIHdpdGhvdXQgY2hhbmdpbmdcbiAqIHRoZSBleGl0LWNvZGUgcHJvdG9jb2wuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSG9va0V4ZWN1dGlvblJlc3VsdCB7XG4gIC8qKiBXaGV0aGVyIHRoZSBob29rIGV4ZWN1dGVkIHN1Y2Nlc3NmdWxseS4gKi9cbiAgc3VjY2VzczogYm9vbGVhbjtcbiAgLyoqIFRoZSBleGl0IGNvZGUgdG8gdXNlIHdoZW4gZXhpdGluZy4gKi9cbiAgZXhpdENvZGU6IEV4aXRDb2RlO1xuICAvKiogVGhlIGVycm9yIHRoYXQgb2NjdXJyZWQsIGlmIGFueS4gKi9cbiAgZXJyb3I/OiBFcnJvcjtcbn1cbiIsICIvKipcbiAqIFN0cnVjdHVyZWQgbG9nZ2luZyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzLlxuICpcbiAqIE91dHB1dCBpcyBvcHQtaW46IHRoZSBsb2dnZXIgb25seSBlbWl0cyB0byByZWdpc3RlcmVkIGhhbmRsZXJzIG9yIGFcbiAqIGNvbmZpZ3VyZWQgbG9nIGZpbGUuIElmIHlvdSBjb25maWd1cmUgbm90aGluZywgdGhlIGxvZ2dlciBwb2xpdGVseSBzYXlzXG4gKiBub3RoaW5nIGF0IGFsbC4gSXQgbmV2ZXIgd3JpdGVzIHRvIHN0ZG91dCBhbmQgYXZvaWRzIHN0ZGVyciB0byBrZWVwIGhvb2tcbiAqIHByb3RvY29scyBjbGVhbi5cbiAqXG4gKiBAc3VtbWFyeSBTdHJ1Y3R1cmVkIGxvZ2dpbmcgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rc1xuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gbG9nIGV2ZW50c1xuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gKiAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluICR7ZXZlbnQuaG9va1R5cGV9OiAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAqIHVuc3Vic2NyaWJlKCk7XG4gKiBgYGBcbiAqL1xuXG5pbXBvcnQgeyBjbG9zZVN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgb3BlblN5bmMsIHdyaXRlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZyBMZXZlbCBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEF2YWlsYWJsZSBsb2cgbGV2ZWxzLlxuICpcbiAqIHwgTGV2ZWwgfCBTZXZlcml0eSB8IFVzZSBDYXNlIHxcbiAqIHwtLS0tLS0tfC0tLS0tLS0tLS18LS0tLS0tLS0tLXxcbiAqIHwgYGRlYnVnYCB8IExvd2VzdCB8IERldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB8XG4gKiB8IGBpbmZvYCB8IExvdyB8IEdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIHxcbiAqIHwgYHdhcm5gIHwgTWVkaXVtIHwgV2FybmluZyBjb25kaXRpb25zIHRoYXQgbWF5IGluZGljYXRlIGlzc3VlcyB8XG4gKiB8IGBlcnJvcmAgfCBIaWdoIHwgRXJyb3IgY29uZGl0aW9ucyByZXF1aXJpbmcgYXR0ZW50aW9uIHxcbiAqL1xuZXhwb3J0IHR5cGUgTG9nTGV2ZWwgPSAnZGVidWcnIHwgJ2luZm8nIHwgJ3dhcm4nIHwgJ2Vycm9yJztcblxuLyoqXG4gKiBBbGwgbG9nIGxldmVscyBpbiBvcmRlciBvZiBzZXZlcml0eSAobG93ZXN0IHRvIGhpZ2hlc3QpLlxuICovXG5leHBvcnQgY29uc3QgTE9HX0xFVkVMUyA9IFsnZGVidWcnLCAnaW5mbycsICd3YXJuJywgJ2Vycm9yJ10gYXMgY29uc3Qgc2F0aXNmaWVzIHJlYWRvbmx5IExvZ0xldmVsW107XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZyBFdmVudCBUeXBlXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogU3RydWN0dXJlZCBsb2cgZXZlbnQgZW1pdHRlZCBieSB0aGUgbG9nZ2VyLlxuICpcbiAqIEV2ZW50cyBpbmNsdWRlIGNvbnRleHR1YWwgZGV0YWlscyBhYm91dCBob29rIGV4ZWN1dGlvbiBhbmQgYXJlIHN1aXRhYmxlIGZvclxuICogZGVidWdnaW5nLCBtb25pdG9yaW5nLCBhbmQgYW5hbHl0aWNzIHBpcGVsaW5lcy5cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBFeGFtcGxlIGxvZyBldmVudFxuICogY29uc3QgZXZlbnQ6IExvZ0V2ZW50ID0ge1xuICogICB0aW1lc3RhbXA6ICcyMDI0LTAxLTE1VDEwOjMwOjAwLjAwMFonLFxuICogICBsZXZlbDogJ3dhcm4nLFxuICogICBob29rVHlwZTogJ2FjdGlvbi1zdGFydCcsXG4gKiAgIG1lc3NhZ2U6ICdDYXJkIHN0YXJ0ZWQnLFxuICogICBpbnB1dDogeyBjYXJkSWQ6ICdjYXJkLTEyMycgfVxuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ0V2ZW50IHtcbiAgLyoqXG4gICAqIElTTyA4NjAxIHRpbWVzdGFtcCBvZiB3aGVuIHRoZSBldmVudCBvY2N1cnJlZC5cbiAgICogQGV4YW1wbGUgJzIwMjQtMDEtMTVUMTA6MzA6MDAuMDAwWidcbiAgICovXG4gIHRpbWVzdGFtcDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBTZXZlcml0eSBsZXZlbCBvZiB0aGUgbG9nIGV2ZW50LlxuICAgKi9cbiAgbGV2ZWw6IExvZ0xldmVsO1xuXG4gIC8qKlxuICAgKiBUeXBlIG9mIGhvb2sgdGhhdCBnZW5lcmF0ZWQgdGhpcyBldmVudC5cbiAgICogTWF5IGJlIHVuZGVmaW5lZCBmb3IgZXZlbnRzIG91dHNpZGUgaG9vayBjb250ZXh0LlxuICAgKi9cbiAgaG9va1R5cGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgaGFwcGVuZWQuXG4gICAqL1xuICBtZXNzYWdlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEhvb2sgaW5wdXQgZGF0YSBhdCB0aGUgdGltZSBvZiBsb2dnaW5nLlxuICAgKlxuICAgKiBUaGlzIGlzIHBhcnRpYWwgYnkgZGVzaWduLCBzbyB5b3UgY2FuIGF2b2lkIGxvZ2dpbmcgbGFyZ2Ugb3Igc2Vuc2l0aXZlXG4gICAqIHBheWxvYWRzIHdoaWxlIHN0aWxsIGNhcHR1cmluZyBrZXkgaWRlbnRpZmllcnMuXG4gICAqL1xuICBpbnB1dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBFcnJvciBpbmZvcm1hdGlvbiBpZiB0aGlzIGV2ZW50IHJlcHJlc2VudHMgYW4gZXJyb3IuXG4gICAqIENvbnRhaW5zIHN0cnVjdHVyZWQgZXJyb3IgZGV0YWlscyBmb3IgYW5hbHlzaXMuXG4gICAqL1xuICBlcnJvcj86IExvZ0V2ZW50RXJyb3I7XG5cbiAgLyoqXG4gICAqIEFkZGl0aW9uYWwgY29udGV4dCBkYXRhIHByb3ZpZGVkIGJ5IHRoZSBjYWxsZXIuXG4gICAqXG4gICAqIFVzZSB0aGlzIGZvciBzdHJ1Y3R1cmVkIG1ldGFkYXRhIHRoYXQgeW91IHdhbnQgZG93bnN0cmVhbSBoYW5kbGVyc1xuICAgKiB0byByZWNlaXZlIChlLmcuLCByZXF1ZXN0IElEcywgdGltaW5nIGRhdGEpLlxuICAgKi9cbiAgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xufVxuXG4vKipcbiAqIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb24gd2l0aGluIGEgbG9nIGV2ZW50LlxuICpcbiAqIEVycm9ycyBhcmUgbm9ybWFsaXplZCBzbyBoYW5kbGVycyBjYW4gZGVwZW5kIG9uIGNvbnNpc3RlbnQgc2hhcGUsIGV2ZW4gd2hlblxuICogY2FsbGVycyB0aHJvdyBub24tRXJyb3IgdmFsdWVzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ0V2ZW50RXJyb3Ige1xuICAvKipcbiAgICogRXJyb3IgbmFtZSAoZS5nLiwgJ1R5cGVFcnJvcicsICdWYWxpZGF0aW9uRXJyb3InKS5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogRXJyb3IgbWVzc2FnZSBkZXNjcmliaW5nIHdoYXQgd2VudCB3cm9uZy5cbiAgICovXG4gIG1lc3NhZ2U6IHN0cmluZztcblxuICAvKipcbiAgICogU3RhY2sgdHJhY2UgaWYgYXZhaWxhYmxlLlxuICAgKi9cbiAgc3RhY2s/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEVycm9yIGNhdXNlIGNoYWluIGlmIHRoZSBlcnJvciB3YXMgd3JhcHBlZC5cbiAgICovXG4gIGNhdXNlPzogTG9nRXZlbnRFcnJvcjtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXZlbnQgSGFuZGxlciBUeXBlXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogSGFuZGxlciBpbnZva2VkIHdoZW4gYSBsb2cgZXZlbnQgaXMgZW1pdHRlZC5cbiAqXG4gKiBIYW5kbGVycyBydW4gc3luY2hyb25vdXNseS4gRXJyb3JzIHRocm93biBieSBhIGhhbmRsZXIgYXJlIHN3YWxsb3dlZCBzb1xuICogbG9nZ2luZyBjYW5ub3QgYnJlYWsgaG9vayBleGVjdXRpb24uXG4gKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGhhbmRsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvcndhcmQgdG8gZXh0ZXJuYWwgbG9nZ2luZyBzZXJ2aWNlXG4gKiBjb25zdCBoYW5kbGVyOiBMb2dFdmVudEhhbmRsZXIgPSAoZXZlbnQpID0+IHtcbiAqICAgZXh0ZXJuYWxMb2dnZXIubG9nKHtcbiAqICAgICBsZXZlbDogZXZlbnQubGV2ZWwsXG4gKiAgICAgbWVzc2FnZTogZXZlbnQubWVzc2FnZSxcbiAqICAgICBtZXRhZGF0YTogeyBob29rVHlwZTogZXZlbnQuaG9va1R5cGUgfVxuICogICB9KTtcbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgTG9nRXZlbnRIYW5kbGVyID0gKGV2ZW50OiBMb2dFdmVudCkgPT4gdm9pZDtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byB1bnN1YnNjcmliZSBhIGxvZyBldmVudCBoYW5kbGVyLlxuICpcbiAqIENhbGwgdGhpcyBmdW5jdGlvbiB0byBzdG9wIHJlY2VpdmluZyBsb2cgZXZlbnRzLiBBbHdheXMgY2FsbCB1bnN1YnNjcmliZVxuICogd2hlbiB0aGUgaGFuZGxlciBpcyBubyBsb25nZXIgbmVlZGVkIHRvIHByZXZlbnQgbWVtb3J5IGxlYWtzLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqIC8vIC4uLiBsYXRlclxuICogdW5zdWJzY3JpYmUoKTsgLy8gU3RvcCByZWNlaXZpbmcgZXZlbnRzXG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgVW5zdWJzY3JpYmUgPSAoKSA9PiB2b2lkO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgQ29uZmlndXJhdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIExvZ2dlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dnZXJDb25maWcge1xuICAvKipcbiAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUgZm9yIEpTT04gTGluZXMgb3V0cHV0LlxuICAgKlxuICAgKiBJZiBub3Qgc2V0LCBmaWxlIGxvZ2dpbmcgaXMgZGlzYWJsZWQuIENhbiBhbHNvIGJlIHNldCB2aWEgdGhlXG4gICAqIGBDQVJEU19IT09LU19MT0dfRklMRWAgZW52aXJvbm1lbnQgdmFyaWFibGUuXG4gICAqL1xuICBsb2dGaWxlUGF0aD86IHN0cmluZztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIEludGVyZmFjZSAoZm9yIHRlc3RpbmcgYW5kIHR5cGUgY29tcGF0aWJpbGl0eSlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBMb2dnZXIgaW50ZXJmYWNlIGZvciBzdHJ1Y3R1cmVkLCBjb250ZXh0LWF3YXJlIGxvZ2dpbmcuXG4gKlxuICogVGhpcyBpbnRlcmZhY2UgZGVmaW5lcyB0aGUgcHVibGljIEFQSSBvZiB0aGUgTG9nZ2VyIGNsYXNzLiBJdCBleGlzdHNcbiAqIHByaW1hcmlseSBmb3IgdHlwZSBjb21wYXRpYmlsaXR5IGFuZCB0ZXN0aW5nIHB1cnBvc2VzLCBhbGxvd2luZyB0ZXN0c1xuICogdG8gbW9jayB0aGUgbG9nZ2VyIHdpdGhvdXQgbmVlZGluZyB0byBpbXBsZW1lbnQgYWxsIGludGVybmFsIG1ldGhvZHMuXG4gKlxuICogRm9yIHByb2R1Y3Rpb24gdXNlLCB1c2UgdGhlIHtAbGluayBMb2dnZXJ9IGNsYXNzIG9yIHRoZSB7QGxpbmsgbG9nZ2VyfVxuICogc2luZ2xldG9uIGV4cG9ydC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJTG9nZ2VyIHtcbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIERpYWdub3N0aWMgdGV4dCBkZXNjcmliaW5nIGxvdy1sZXZlbCBleGVjdXRpb24gZGV0YWlscy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgZGVidWcobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGluZm8gbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBPcGVyYXRpb25hbCBtZXNzYWdlIGRlc2NyaWJpbmcgbm9ybWFsIGhvb2sgcHJvZ3Jlc3MuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGluZm8obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFdhcm5pbmcgdGV4dCBmb3IgcmVjb3ZlcmFibGUgb3Igc3VzcGljaW91cyBjb25kaXRpb25zLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICB3YXJuKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIHRleHQgZGVzY3JpYmluZyBhIGhhbmRsZWQgZmFpbHVyZSBjb25kaXRpb24uXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGVycm9yKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBsb2dcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGZhaWxlZFxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBsb2dFcnJvcihlcnJvcjogdW5rbm93biwgbWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBMb2dnZXIgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcyB3aXRoIGV2ZW50IHN1YnNjcmlwdGlvbiBhbmQgZmlsZSBvdXRwdXQuXG4gKlxuICogT3V0cHV0IGlzIG9wdC1pbiBhbmQgYmVzdC1lZmZvcnQ6XG4gKiAtIFdpdGggbm8gaGFuZGxlcnMgYW5kIG5vIGxvZyBmaWxlLCBldmVudHMgYXJlIGRyb3BwZWQuXG4gKiAtIEhhbmRsZXIgZXJyb3JzIGFyZSBzd2FsbG93ZWQgc28gbG9nZ2luZyBjYW5ub3QgYnJlYWsgaG9va3MuXG4gKiAtIEZpbGUgb3V0cHV0IHVzZXMgSlNPTiBMaW5lcyBhbmQgaWdub3JlcyB3cml0ZSBmYWlsdXJlcy5cbiAqXG4gKiBUaGUgbG9nZ2VyIG5ldmVyIHdyaXRlcyB0byBzdGRvdXQgb3Igc3RkZXJyLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gZXZlbnRzIGF0IHNwZWNpZmljIGxldmVsXG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHtcbiAqICAgc2VuZEFsZXJ0KGV2ZW50Lm1lc3NhZ2UpO1xuICogfSk7XG4gKlxuICogLy8gTG9nIHdpdGhpbiBhIGhvb2sgaGFuZGxlclxuICogbG9nZ2VyLndhcm4oJ0Fib3V0IHRvIGV4ZWN1dGUgdGFzaycpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuICAvKipcbiAgICogUmVnaXN0ZXJlZCBldmVudCBoYW5kbGVycyBieSBsb2cgbGV2ZWwuXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZXJzOiBNYXA8TG9nTGV2ZWwsIFNldDxMb2dFdmVudEhhbmRsZXI+PiA9IG5ldyBNYXAoKTtcblxuICAvKipcbiAgICogRmlsZSBkZXNjcmlwdG9yIGZvciBsb2cgZmlsZSBvdXRwdXQuXG4gICAqIExhemlseSBpbml0aWFsaXplZCBvbiBmaXJzdCB3cml0ZS5cbiAgICovXG4gIHByaXZhdGUgbG9nRmlsZUZkOiBudW1iZXIgfCBudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUsIGlmIGNvbmZpZ3VyZWQuXG4gICAqL1xuICBwcml2YXRlIGxvZ0ZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogV2hldGhlciBmaWxlIGluaXRpYWxpemF0aW9uIGhhcyBiZWVuIGF0dGVtcHRlZC5cbiAgICovXG4gIHByaXZhdGUgZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudEhvb2tUeXBlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIEN1cnJlbnQgaG9vayBpbnB1dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqL1xuICBwcml2YXRlIGN1cnJlbnRJbnB1dDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgTG9nZ2VyIGluc3RhbmNlLlxuICAgKlxuICAgKiBUeXBpY2FsbHkgeW91IHNob3VsZCB1c2UgdGhlIGV4cG9ydGVkIGBsb2dnZXJgIHNpbmdsZXRvbiByYXRoZXIgdGhhblxuICAgKiBjcmVhdGluZyBuZXcgaW5zdGFuY2VzLlxuICAgKiBAcGFyYW0gY29uZmlnIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvblxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFVzZSBzaW5nbGV0b24gKHJlY29tbWVuZGVkKVxuICAgKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gICAqXG4gICAqIC8vIE9yIGNyZWF0ZSBjdXN0b20gaW5zdGFuY2VcbiAgICogY29uc3QgY3VzdG9tTG9nZ2VyID0gbmV3IExvZ2dlcih7IGxvZ0ZpbGVQYXRoOiAnL3Zhci9sb2cvaG9va3MubG9nJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihjb25maWc6IExvZ2dlckNvbmZpZyA9IHt9KSB7XG4gICAgLy8gSW5pdGlhbGl6ZSBoYW5kbGVycyBtYXAgZm9yIGVhY2ggbGV2ZWxcbiAgICBmb3IgKGNvbnN0IGxldmVsIG9mIExPR19MRVZFTFMpIHtcbiAgICAgIHRoaXMuaGFuZGxlcnMuc2V0KGxldmVsLCBuZXcgU2V0KCkpO1xuICAgIH1cblxuICAgIC8vIFNldCBsb2cgZmlsZSBwYXRoIGZyb20gY29uZmlnIG9yIGVudmlyb25tZW50XG4gICAgdGhpcy5sb2dGaWxlUGF0aCA9IGNvbmZpZy5sb2dGaWxlUGF0aCA/PyBwcm9jZXNzLmVudlsnQ0FSRFNfSE9PS1NfTE9HX0ZJTEUnXSA/PyBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGRldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB0aGF0IGlzIHR5cGljYWxseSBvbmx5IHVzZWZ1bFxuICAgKiBkdXJpbmcgZGV2ZWxvcG1lbnQgb3IgdHJvdWJsZXNob290aW5nLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIERpYWdub3N0aWMgdGV4dCBkZXNjcmliaW5nIGxvdy1sZXZlbCBleGVjdXRpb24gZGV0YWlscy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci5kZWJ1ZygnUHJvY2Vzc2luZyBob29rIGlucHV0JywgeyB0YXNrSWQ6ICd0YXNrLTEyMycsIGlucHV0U2l6ZTogMjU2IH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGRlYnVnKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCdkZWJ1ZycsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIGxpa2UgaG9vayBpbnZvY2F0aW9ucywgc3VjY2Vzc2Z1bFxuICAgKiBjb21wbGV0aW9ucywgb3Igc3RhdGUgY2hhbmdlcy5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBPcGVyYXRpb25hbCBtZXNzYWdlIGRlc2NyaWJpbmcgbm9ybWFsIGhvb2sgcHJvZ3Jlc3MuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIuaW5mbygnVGFzayBzdGFydGVkJywgeyB0YXNrSWQ6ICd0YXNrLTEyMycsIGNhcmRJZDogJ2NhcmQtNDU2JyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBpbmZvKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCdpbmZvJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIHdhcm5pbmcgbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBjb25kaXRpb25zIHRoYXQgbWF5IGluZGljYXRlIGNhcmRzIGJ1dCBkb24ndCBwcmV2ZW50XG4gICAqIG9wZXJhdGlvbiwgc3VjaCBhcyBkZXByZWNhdGVkIHBhdHRlcm5zIG9yIHBlcmZvcm1hbmNlIGNvbmNlcm5zLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFdhcm5pbmcgdGV4dCBmb3IgcmVjb3ZlcmFibGUgb3Igc3VzcGljaW91cyBjb25kaXRpb25zLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLndhcm4oJ0RlcHJlY2F0ZWQgaG9vayBwYXR0ZXJuIGRldGVjdGVkJywgeyBwYXR0ZXJuOiAnbGVnYWN5TWF0Y2hlcicgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgd2FybihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnd2FybicsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBlcnJvciBjb25kaXRpb25zIHRoYXQgcmVxdWlyZSBhdHRlbnRpb24gYnV0IHdlcmUgaGFuZGxlZFxuICAgKiBncmFjZWZ1bGx5LiBGb3IgZXhjZXB0aW9ucywgcHJlZmVyIHtAbGluayBsb2dFcnJvcn0uXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgdGV4dCBkZXNjcmliaW5nIGEgaGFuZGxlZCBmYWlsdXJlIGNvbmRpdGlvbi5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHZhbGlkYXRlIGhvb2sgaW5wdXQnLCB7IHJlYXNvbjogJ2VtcHR5IHRhc2tJZCcgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZXJyb3IobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAqXG4gICAqIFVzZSB0aGlzIGZvciBjYXVnaHQgZXhjZXB0aW9ucy4gTm9uLUVycm9yIHZhbHVlcyBhcmUgbm9ybWFsaXplZCBzbyBoYW5kbGVyc1xuICAgKiBhbHdheXMgcmVjZWl2ZSBhIGNvbnNpc3RlbnQgZXJyb3Igc2hhcGUuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBsb2dcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGZhaWxlZFxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogdHJ5IHtcbiAgICogICBhd2FpdCBkYW5nZXJvdXNPcGVyYXRpb24oKTtcbiAgICogfSBjYXRjaCAoZXJyKSB7XG4gICAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ0ZhaWxlZCB0byBleGVjdXRlIGRhbmdlcm91cyBvcGVyYXRpb24nLCB7XG4gICAqICAgICBvcGVyYXRpb246ICdkZWxldGUnLFxuICAgKiAgICAgdGFyZ2V0OiAnL2ltcG9ydGFudC9maWxlLnR4dCdcbiAgICogICB9KTtcbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIGxvZ0Vycm9yKGVycm9yOiB1bmtub3duLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIGNvbnN0IGVycm9ySW5mbyA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvcik7XG5cbiAgICBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIGxldmVsOiAnZXJyb3InLFxuICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgIGVycm9yOiBlcnJvckluZm8sXG4gICAgICBjb250ZXh0XG4gICAgfTtcblxuICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmVzIGEgaGFuZGxlciB0byBsb2cgZXZlbnRzIGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAqXG4gICAqIFRoZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBsb2cgZXZlbnQgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICogUmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSBjYWxsZWQgd2hlbiB0aGUgaGFuZGxlclxuICAgKiBpcyBubyBsb25nZXIgbmVlZGVkLiBIYW5kbGVyIGVycm9ycyBhcmUgaWdub3JlZCB0byBhdm9pZCBkaXNydXB0aW5nIGhvb2tzLlxuICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgbG9nIGxldmVsIHRvIHN1YnNjcmliZSB0b1xuICAgKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggZXZlbnRcbiAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byB1bnN1YnNjcmliZSB0aGUgaGFuZGxlclxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFN1YnNjcmliZSB0byBlcnJvciBldmVudHNcbiAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gICAqICAgY29uc29sZS5lcnJvcihgWyR7ZXZlbnQuaG9va1R5cGV9XSAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gICAqICAgaWYgKGV2ZW50LmVycm9yKSB7XG4gICAqICAgICBjb25zb2xlLmVycm9yKGV2ZW50LmVycm9yLnN0YWNrKTtcbiAgICogICB9XG4gICAqIH0pO1xuICAgKlxuICAgKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAgICogdW5zdWJzY3JpYmUoKTtcbiAgICogYGBgXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIGxpYnJhcnlcbiAgICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gICAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKCk7XG4gICAqXG4gICAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogYGBgXG4gICAqL1xuICBvbihsZXZlbDogTG9nTGV2ZWwsIGhhbmRsZXI6IExvZ0V2ZW50SGFuZGxlcik6IFVuc3Vic2NyaWJlIHtcbiAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQobGV2ZWwpO1xuICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICBsZXZlbEhhbmRsZXJzLmFkZChoYW5kbGVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgbGV2ZWxIYW5kbGVycz8uZGVsZXRlKGhhbmRsZXIpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgY3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKlxuICAgKiBUaGlzIGlzIGNhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGJlZm9yZSBpbnZva2luZyBob29rIGhhbmRsZXJzLlxuICAgKiBZb3UgdHlwaWNhbGx5IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIGRpcmVjdGx5LlxuICAgKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgdHlwZSBvZiBob29rIGJlaW5nIGV4ZWN1dGVkXG4gICAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IGRhdGFcbiAgICogQGludGVybmFsXG4gICAqL1xuICBzZXRDb250ZXh0KGhvb2tUeXBlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGlucHV0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZCk6IHZvaWQge1xuICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gaG9va1R5cGU7XG4gICAgdGhpcy5jdXJyZW50SW5wdXQgPSBpbnB1dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhcnMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0LlxuICAgKlxuICAgKiBDYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBhZnRlciBob29rIGV4ZWN1dGlvbiBjb21wbGV0ZXMuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgY2xlYXJDb250ZXh0KCk6IHZvaWQge1xuICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuY3VycmVudElucHV0ID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgYSBkZWZhdWx0IGxvZyBmaWxlIHBhdGggdGhhdCBvbmx5IHRha2VzIGVmZmVjdCBpZiBubyBvdGhlciBzb3VyY2VcbiAgICogaGFzIGNvbmZpZ3VyZWQgZmlsZSBsb2dnaW5nLlxuICAgKlxuICAgKiBUaGlzIGlzIHRoZSBsb3dlc3QtcHJpb3JpdHkgZmlsZSBwYXRoIHNvdXJjZS4gSXQgd2lsbCBiZSBpZ25vcmVkIGlmXG4gICAqIGFueSBvZiB0aGVzZSBoYXZlIGFscmVhZHkgc2V0IGEgcGF0aDpcbiAgICogLSBgbG9nRmlsZVBhdGhgIGluIHRoZSBjb25zdHJ1Y3RvciBjb25maWdcbiAgICogLSBgQ0FSRFNfSE9PS1NfTE9HX0ZJTEVgIGVudmlyb25tZW50IHZhcmlhYmxlXG4gICAqIC0ge0BsaW5rIHNldExvZ0ZpbGV9IGNhbGxlZCBhdCBydW50aW1lXG4gICAqXG4gICAqIEludGVuZGVkIGZvciB1c2UgYnkgQ0xJIGVudHJ5IHBvaW50cyAoZS5nLiwgdGhlIGAtLWxvZ2AgZmxhZykuXG4gICAqIEBwYXJhbSBmaWxlUGF0aCAtIERlZmF1bHQgcGF0aCB0byB0aGUgbG9nIGZpbGVcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBXaXJlIC0tbG9nIENMSSBhcmd1bWVudCBhcyBhIGZhbGxiYWNrXG4gICAqIGlmIChhcmdzLmxvZykge1xuICAgKiAgIGxvZ2dlci5zZXREZWZhdWx0TG9nRmlsZShhcmdzLmxvZyk7XG4gICAqIH1cbiAgICogYGBgXG4gICAqL1xuICBzZXREZWZhdWx0TG9nRmlsZShmaWxlUGF0aDogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9nRmlsZVBhdGggPT09IG51bGwpIHtcbiAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgdGhlIGxvZyBmaWxlIHBhdGggYXQgcnVudGltZS5cbiAgICpcbiAgICogQ2FsbCB0aGlzIHRvIGVuYWJsZSBvciBjaGFuZ2UgZmlsZSBsb2dnaW5nLiBTZXR0aW5nIHRvIGBudWxsYCBkaXNhYmxlc1xuICAgKiBmaWxlIGxvZ2dpbmcgYW5kIGNsb3NlcyBhbnkgb3BlbiBmaWxlIGhhbmRsZS4gRGlyZWN0b3JpZXMgYXJlIGNyZWF0ZWRcbiAgICogb24gZGVtYW5kIHdoZW4gdGhlIGZpcnN0IHdyaXRlIG9jY3Vycy5cbiAgICogQHBhcmFtIGZpbGVQYXRoIC0gUGF0aCB0byB0aGUgbG9nIGZpbGUsIG9yIG51bGwgdG8gZGlzYWJsZVxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIEVuYWJsZSBmaWxlIGxvZ2dpbmcgYXQgcnVudGltZVxuICAgKiBsb2dnZXIuc2V0TG9nRmlsZSgnL3Zhci9sb2cvY2FyZHMtc2RrLmxvZycpO1xuICAgKlxuICAgKiAvLyBEaXNhYmxlIGZpbGUgbG9nZ2luZ1xuICAgKiBsb2dnZXIuc2V0TG9nRmlsZShudWxsKTtcbiAgICogYGBgXG4gICAqL1xuICBzZXRMb2dGaWxlKGZpbGVQYXRoOiBzdHJpbmcgfCBudWxsKTogdm9pZCB7XG4gICAgLy8gQ2xvc2UgZXhpc3RpbmcgZmlsZSBpZiBvcGVuXG4gICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgIH1cbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIHJlc291cmNlcyBoZWxkIGJ5IHRoZSBsb2dnZXIuXG4gICAqXG4gICAqIENhbGwgdGhpcyBkdXJpbmcgZ3JhY2VmdWwgc2h1dGRvd24gdG8gZW5zdXJlIGFsbCBsb2cgZGF0YSBpcyBmbHVzaGVkLlxuICAgKiBTYWZlIHRvIGNhbGwgbXVsdGlwbGUgdGltZXMuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHtcbiAgICogICBsb2dnZXIuY2xvc2UoKTtcbiAgICogfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgIH1cbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlcmUgYXJlIGFueSBhY3RpdmUgaGFuZGxlcnMgb3IgZGVzdGluYXRpb25zLlxuICAgKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgYW55IGhhbmRsZXJzIGFyZSByZWdpc3RlcmVkIG9yIGZpbGUgbG9nZ2luZyBpcyBlbmFibGVkLlxuICAgKiBVc2VmdWwgZm9yIGRlY2lkaW5nIHdoZXRoZXIgdG8gY29tcHV0ZSBleHBlbnNpdmUgbG9nIGNvbnRleHQuXG4gICAqIEByZXR1cm5zIFdoZXRoZXIgdGhlIGxvZ2dlciBoYXMgYW55IGFjdGl2ZSBvdXRwdXQgZGVzdGluYXRpb25zXG4gICAqL1xuICBoYXNEZXN0aW5hdGlvbnMoKTogYm9vbGVhbiB7XG4gICAgY29uc3QgaGFzSGFuZGxlcnMgPSBBcnJheS5mcm9tKHRoaXMuaGFuZGxlcnMudmFsdWVzKCkpLnNvbWUoKGhhbmRsZXJzKSA9PiBoYW5kbGVycy5zaXplID4gMCk7XG4gICAgcmV0dXJuIGhhc0hhbmRsZXJzIHx8IHRoaXMubG9nRmlsZVBhdGggIT09IG51bGw7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgLyoqXG4gICAqIEVtaXRzIGEgbG9nIGV2ZW50LlxuICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgc2V2ZXJpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50XG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGxvZyBtZXNzYWdlXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0IGRhdGFcbiAgICovXG4gIHByaXZhdGUgZW1pdChsZXZlbDogTG9nTGV2ZWwsIG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgY29uc3QgZXZlbnQ6IExvZ0V2ZW50ID0ge1xuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBsZXZlbCxcbiAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICBjb250ZXh0XG4gICAgfTtcblxuICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxpdmVycyBhbiBldmVudCB0byBhbGwgcmVnaXN0ZXJlZCBkZXN0aW5hdGlvbnMuXG4gICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gZGVsaXZlclxuICAgKi9cbiAgcHJpdmF0ZSBkZWxpdmVyRXZlbnQoZXZlbnQ6IExvZ0V2ZW50KTogdm9pZCB7XG4gICAgLy8gRGVsaXZlciB0byBldmVudCBoYW5kbGVyc1xuICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChldmVudC5sZXZlbCk7XG4gICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaGFuZGxlcihldmVudCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBoYW5kbGVyIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gV3JpdGUgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgdGhpcy53cml0ZVRvRmlsZShldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGFuIGV2ZW50IHRvIHRoZSBsb2cgZmlsZS5cbiAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byB3cml0ZVxuICAgKi9cbiAgcHJpdmF0ZSB3cml0ZVRvRmlsZShldmVudDogTG9nRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpIHJldHVybjtcblxuICAgIC8vIExhenkgaW5pdGlhbGl6YXRpb24gb2YgZmlsZSBoYW5kbGVcbiAgICBpZiAoIXRoaXMuZmlsZUluaXRpYWxpemVkKSB7XG4gICAgICB0aGlzLmluaXRpYWxpemVGaWxlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMubG9nRmlsZUZkID09PSBudWxsKSByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgbGluZSA9IGAke0pTT04uc3RyaW5naWZ5KGV2ZW50KX1cXG5gO1xuICAgICAgd3JpdGVTeW5jKHRoaXMubG9nRmlsZUZkLCBsaW5lKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIHdyaXRlIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgLy8gVGhpcyBmb2xsb3dzIHRoZSByaXNrIG1pdGlnYXRpb246IFwiR3JhY2VmdWwgZGVncmFkYXRpb24gLSBsb2cgd3JpdGVcbiAgICAgIC8vIGZhaWx1cmVzIGFyZSBzaWxlbnRseSBpZ25vcmVkIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXCJcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGxvZyBmaWxlIGZvciB3cml0aW5nLlxuICAgKi9cbiAgcHJpdmF0ZSBpbml0aWFsaXplRmlsZSgpOiB2b2lkIHtcbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICAvLyBFbnN1cmUgZGlyZWN0b3J5IGV4aXN0c1xuICAgICAgY29uc3QgZGlyID0gZGlybmFtZSh0aGlzLmxvZ0ZpbGVQYXRoKTtcbiAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBPcGVuIGZpbGUgZm9yIGFwcGVuZGluZ1xuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBvcGVuU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCAnYScpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgaW5pdGlhbGl6YXRpb24gZXJyb3JzXG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIHN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb24gZnJvbSBhbiB1bmtub3duIGVycm9yLlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tXG4gICAqIEByZXR1cm5zIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICovXG4gIHByaXZhdGUgZXh0cmFjdEVycm9ySW5mbyhlcnJvcjogdW5rbm93bik6IExvZ0V2ZW50RXJyb3Ige1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICBjb25zdCBpbmZvOiBMb2dFdmVudEVycm9yID0ge1xuICAgICAgICBuYW1lOiBlcnJvci5uYW1lLFxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2tcbiAgICAgIH07XG5cbiAgICAgIC8vIEV4dHJhY3QgY2F1c2UgY2hhaW4gaWYgcHJlc2VudFxuICAgICAgaWYgKGVycm9yLmNhdXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaW5mby5jYXVzZSA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvci5jYXVzZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpbmZvO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBub24tRXJyb3IgdmFsdWVzXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICdVbmtub3duRXJyb3InLFxuICAgICAgbWVzc2FnZTogU3RyaW5nKGVycm9yKVxuICAgIH07XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2luZ2xldG9uIEV4cG9ydFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEdsb2JhbCBsb2dnZXIgaW5zdGFuY2UgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcy5cbiAqXG4gKiBVc2UgdGhpcyBzaW5nbGV0b24gZm9yIGFsbCBsb2dnaW5nIHdpdGhpbiBob29rcy4gVGhlIGxvZ2dlciBpcyBjb25maWd1cmVkXG4gKiB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCBzdXBwb3J0cyBldmVudCBzdWJzY3JpcHRpb24gZm9yIGN1c3RvbVxuICogZGVzdGluYXRpb25zLlxuICpcbiAqICMjIENvbmZpZ3VyYXRpb25cbiAqXG4gKiB8IEVudmlyb25tZW50IFZhcmlhYmxlIHwgRGVzY3JpcHRpb24gfFxuICogfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfFxuICogfCBgQ0FSRFNfSE9PS1NfTE9HX0ZJTEVgIHwgUGF0aCB0byBsb2cgZmlsZSAoSlNPTiBMaW5lcyBmb3JtYXQpIHxcbiAqXG4gKiAjIyBVc2FnZSBpbiBIb29rc1xuICpcbiAqIFRoZSBsb2dnZXIgY2FuIGJlIHVzZWQgZGlyZWN0bHkgd2l0aGluIGhvb2sgaGFuZGxlcnM6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIEluIGEgaG9vayBoYW5kbGVyXG4gKiBsb2dnZXIud2FybignVGFzayBzdGFydGluZyBpbiBpbnRlcmFjdGl2ZSBtb2RlJyk7XG4gKiBgYGBcbiAqXG4gKiAjIyBFeHRlcm5hbCBJbnRlZ3JhdGlvblxuICpcbiAqIFN1YnNjcmliZSB0byBldmVudHMgdG8gZm9yd2FyZCBsb2dzIHRvIGV4dGVybmFsIHN5c3RlbXM6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gKlxuICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oeyBsZXZlbDogJ2RlYnVnJyB9KTtcbiAqXG4gKiBsb2dnZXIub24oJ2RlYnVnJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmRlYnVnKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIERpcmVjdCB1c2FnZVxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIGxvZ2dlci5pbmZvKCdTdGFydGluZyBvcGVyYXRpb24nKTtcbiAqIGxvZ2dlci53YXJuKCdSZXNvdXJjZSBsaW1pdCBhcHByb2FjaGluZycsIHsgdXNhZ2U6IDAuOSB9KTtcbiAqXG4gKiB0cnkge1xuICogICBhd2FpdCByaXNreU9wZXJhdGlvbigpO1xuICogfSBjYXRjaCAoZXJyKSB7XG4gKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdSaXNreSBvcGVyYXRpb24gZmFpbGVkJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcbiIsICIvKipcbiAqIFNvY2tldCBjbGllbnQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICpcbiAqIENvbm5lY3RzIHRvIGEgVW5peCBkb21haW4gc29ja2V0IGNyZWF0ZWQgYnkgQWN0aW9uRGlzcGF0Y2hlciBhbmQgaGFuZGxlc1xuICogTkRKU09OIChuZXdsaW5lLWRlbGltaXRlZCBKU09OKSBwcm90b2NvbCBmb3IgcmVjZWl2aW5nIGNvbW1hbmRzIGFuZCBzZW5kaW5nXG4gKiByZXNwb25zZXMuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFNvY2tldCBjbGllbnQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0ICogYXMgbmV0IGZyb20gJ25vZGU6bmV0JztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb21tYW5kcyB0aGF0IGNhbiBiZSByZWNlaXZlZCBmcm9tIHRoZSBBY3Rpb25EaXNwYXRjaGVyIHZpYSBzb2NrZXQuXG4gKlxuICogVXNlcyBOREpTT04gKG5ld2xpbmUtZGVsaW1pdGVkIEpTT04pIHByb3RvY29sLlxuICovXG5leHBvcnQgdHlwZSBTb2NrZXRDb21tYW5kID0geyB0eXBlOiAnY2FuY2VsJyB9IHwgeyB0eXBlOiAnc3dpdGNoVG9JbnRlcmFjdGl2ZScgfTtcblxuLyoqXG4gKiBSZXNwb25zZSBzZW50IGJhY2sgdG8gdGhlIEFjdGlvbkRpc3BhdGNoZXIgd2hlbiBzd2l0Y2hUb0ludGVyYWN0aXZlIGlzIGhhbmRsZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlIHtcbiAgdHlwZTogJ3N3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSc7XG4gIGRhdGE6IHVua25vd247XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNvY2tldENsaWVudFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENsaWVudCBmb3IgdGhlIE5ESlNPTiBzb2NrZXQgcHJvdG9jb2wgYmV0d2VlbiB0aGUgYWN0aW9uIHJ1bnRpbWUgYW5kXG4gKiBBY3Rpb25EaXNwYXRjaGVyLlxuICpcbiAqIFJlY2VpdmVzIGNvbW1hbmRzIChjYW5jZWwsIHN3aXRjaFRvSW50ZXJhY3RpdmUpIGFuZCBzZW5kcyByZXNwb25zZXNcbiAqIChzd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UpIG92ZXIgYSBVbml4IGRvbWFpbiBzb2NrZXQuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNsaWVudCA9IGF3YWl0IFNvY2tldENsaWVudC5jb25uZWN0KCcvcGF0aC90by9zb2NrZXQnKTtcbiAqIGNsaWVudC5vbkNvbW1hbmQoKGNvbW1hbmQpID0+IHtcbiAqICAgaWYgKGNvbW1hbmQudHlwZSA9PT0gJ2NhbmNlbCcpIHsgLi4uIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBTb2NrZXRDbGllbnQge1xuICBwcml2YXRlIHNvY2tldDogbmV0LlNvY2tldDtcbiAgcHJpdmF0ZSBidWZmZXIgPSAnJztcbiAgcHJpdmF0ZSBjb21tYW5kSGFuZGxlcj86IChjb21tYW5kOiBTb2NrZXRDb21tYW5kKSA9PiB2b2lkO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3Ioc29ja2V0OiBuZXQuU29ja2V0KSB7XG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XG5cbiAgICBzb2NrZXQub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGNodW5rLnRvU3RyaW5nKCk7XG4gICAgICAvLyBQYXJzZSBOREpTT04gLSBzcGxpdCBieSBuZXdsaW5lc1xuICAgICAgY29uc3QgbGluZXMgPSB0aGlzLmJ1ZmZlci5zcGxpdCgnXFxuJyk7XG4gICAgICB0aGlzLmJ1ZmZlciA9IGxpbmVzLnBvcCgpID8/ICcnOyAvLyBLZWVwIGluY29tcGxldGUgbGluZSBpbiBidWZmZXJcblxuICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICAgIGlmIChsaW5lLnRyaW0oKSA9PT0gJycpIGNvbnRpbnVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UobGluZSkgYXMgU29ja2V0Q29tbWFuZDtcbiAgICAgICAgICB0aGlzLmNvbW1hbmRIYW5kbGVyPy4ocGFyc2VkKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gTWFsZm9ybWVkIEpTT04gb24gc29ja2V0IGlzIGlnbm9yZWQgKHBlciBwbGFuKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ29ubmVjdCB0byBhIFVuaXggZG9tYWluIHNvY2tldCBhdCB0aGUgZ2l2ZW4gcGF0aC5cbiAgICpcbiAgICogQHBhcmFtIHNvY2tldFBhdGggLSBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXRcbiAgICogQHJldHVybnMgQSBjb25uZWN0ZWQgU29ja2V0Q2xpZW50IGluc3RhbmNlXG4gICAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGNvbm5lY3Rpb24gZmFpbHNcbiAgICovXG4gIHN0YXRpYyBjb25uZWN0KHNvY2tldFBhdGg6IHN0cmluZyk6IFByb21pc2U8U29ja2V0Q2xpZW50PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHNvY2tldCA9IG5ldC5jcmVhdGVDb25uZWN0aW9uKHNvY2tldFBhdGgsICgpID0+IHtcbiAgICAgICAgcmVzb2x2ZShuZXcgU29ja2V0Q2xpZW50KHNvY2tldCkpO1xuICAgICAgfSk7XG4gICAgICBzb2NrZXQub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIGhhbmRsZXIgZm9yIGluY29taW5nIHNvY2tldCBjb21tYW5kcy5cbiAgICpcbiAgICogT25seSBvbmUgaGFuZGxlciBjYW4gYmUgcmVnaXN0ZXJlZCBhdCBhIHRpbWUuIFN1YnNlcXVlbnQgY2FsbHMgcmVwbGFjZVxuICAgKiB0aGUgcHJldmlvdXMgaGFuZGxlci5cbiAgICpcbiAgICogQHBhcmFtIGhhbmRsZXIgLSBGdW5jdGlvbiB0byBjYWxsIHdoZW4gYSBjb21tYW5kIGlzIHJlY2VpdmVkXG4gICAqL1xuICBvbkNvbW1hbmQoaGFuZGxlcjogKGNvbW1hbmQ6IFNvY2tldENvbW1hbmQpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLmNvbW1hbmRIYW5kbGVyID0gaGFuZGxlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIGEgcmVzcG9uc2UgYmFjayB0byB0aGUgQWN0aW9uRGlzcGF0Y2hlci5cbiAgICpcbiAgICogQHBhcmFtIHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHRvIHNlbmQgYXMgTkRKU09OXG4gICAqL1xuICBzZW5kUmVzcG9uc2UocmVzcG9uc2U6IFN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSk6IHZvaWQge1xuICAgIHRoaXMuc29ja2V0LndyaXRlKGAke0pTT04uc3RyaW5naWZ5KHJlc3BvbnNlKX1cXG5gKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIGEgcmVzcG9uc2UgYW5kIGNhbGwgY2FsbGJhY2sgd2hlbiBmbHVzaGVkLlxuICAgKlxuICAgKiBVc2VkIHRvIGd1YXJhbnRlZSBmbHVzaCBiZWZvcmUgcHJvY2Vzcy5leGl0LlxuICAgKlxuICAgKiBAcGFyYW0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgdG8gc2VuZCBhcyBOREpTT05cbiAgICogQHBhcmFtIGNhbGxiYWNrIC0gQ2FsbGVkIGFmdGVyIHRoZSBkYXRhIGlzIGZsdXNoZWQgdG8gdGhlIHNvY2tldFxuICAgKi9cbiAgc2VuZFJlc3BvbnNlVGhlbihyZXNwb25zZTogU3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlLCBjYWxsYmFjazogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuc29ja2V0LndyaXRlKGAke0pTT04uc3RyaW5naWZ5KHJlc3BvbnNlKX1cXG5gLCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2UgdGhlIHNvY2tldCBjb25uZWN0aW9uLlxuICAgKi9cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5zb2NrZXQuZGVzdHJveSgpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBSdW50aW1lIG9yY2hlc3RyYXRpb24gZm9yIGNvbXBpbGVkIENhcmRzIGFjdGlvbiBhbmQgdHlwZSBoYW5kbGVycy5cbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBidW5kbGVkIGludG8gY29tcGlsZWQgaGFuZGxlcnMgYnkgdGhlIENMSS4gSXQgcHJvdmlkZXMgdGhlXG4gKiBleGVjdXRpb24gaGFybmVzcyB0aGF0IHJlYWRzIGhhbmRsZXIgaW5wdXQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMsIHNldHNcbiAqIHVwIHRoZSBsb2dnZXIgY29udGV4dCwgaW52b2tlcyB0aGUgdXNlcidzIGhhbmRsZXIsIGFuZCBleGl0cyB0aGUgcHJvY2Vzc1xuICogd2l0aCB0aGUgYXBwcm9wcmlhdGUgY29kZS5cbiAqXG4gKiBUaGUgcnVudGltZSBpcyBkZXNpZ25lZCB0byBuZXZlciByZXR1cm4gaW4gbm9ybWFsIHVzZS4gQWxsIGNvZGUgcGF0aHNcbiAqIHRlcm1pbmF0ZSB3aXRoIGBwcm9jZXNzLmV4aXQoKWAuIFRoZSBvbmx5IGV4Y2VwdGlvbiBpcyB0ZXN0IHNjZW5hcmlvc1xuICogd2hlcmUgYHByb2Nlc3MuZXhpdGAgaXMgbW9ja2VkLlxuICpcbiAqICMjIEV4ZWN1dGlvbiBGbG93XG4gKlxuICogMS4gRXh0cmFjdCBpbnB1dCBwYXlsb2FkIGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzIGJhc2VkIG9uIGNvbW1hbmQgdHlwZVxuICogMi4gU2V0IGxvZ2dlciBjb250ZXh0IHdpdGggY29tbWFuZCB0eXBlIGFuZCBpbnB1dFxuICogMy4gT3B0aW9uYWxseSBjb25uZWN0IHRvIFNPQ0tFVF9QQVRIIGZvciBjb21tYW5kIGRpc3BhdGNoIChmYWlsLW9wZW4pXG4gKiA0LiBCdWlsZCBBY3Rpb25Db250ZXh0IHdpdGggbG9nZ2VyLCBjd2QsIGFuZCBzb2NrZXQtYmFja2VkIGNhbGxiYWNrc1xuICogNS4gSW52b2tlIHRoZSBjb21tYW5kIHdpdGggaW5wdXQgYW5kIGNvbnRleHRcbiAqIDYuIE9uIHN1Y2Nlc3M6IGNsZWFuIHVwIHNvY2tldCBhbmQgZXhpdCB3aXRoIGNvZGUgMFxuICogNy4gT24gZXJyb3I6IGxvZyBlcnJvciwgd3JpdGUgdG8gc3RkZXJyLCBjbGVhbiB1cCBhbmQgZXhpdCB3aXRoIGNvZGUgMVxuICpcbiAqXG4gKiBAc3VtbWFyeSBSdW50aW1lIG9yY2hlc3RyYXRpb24gZm9yIGNvbXBpbGVkIENhcmRzIGFjdGlvbiBhbmQgdHlwZSBoYW5kbGVyc1xuICogQG1vZHVsZVxuICogQHNlZSB7QGxpbmsgZXhlY3V0ZUNvbW1hbmR9IGZvciB0aGUgbWFpbiBlbnRyeSBwb2ludFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBUaGlzIGlzIHdoYXQgY29tcGlsZWQgaGFuZGxlcnMgbG9vayBsaWtlIGludGVybmFsbHlcbiAqIGltcG9ydCB7IGV4ZWN1dGVDb21tYW5kIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcvcnVudGltZSc7XG4gKiBpbXBvcnQgbXlDb21tYW5kIGZyb20gJy4vbXktY29tbWFuZC5qcyc7XG4gKlxuICogZXhlY3V0ZUNvbW1hbmQobXlDb21tYW5kKTtcbiAqIGBgYFxuICovXG5cbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29tbWFuZCwgVHlwZUNyZWF0ZUNvbW1hbmQsIFR5cGVEZWxldGVDb21tYW5kLCBUeXBlVXBkYXRlQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZC10eXBlcy5qcyc7XG5pbXBvcnQgeyBDQVJEU19FTlZfVkFSUywgZXh0cmFjdEFjdGlvbklucHV0LCBleHRyYWN0VHlwZUlucHV0IH0gZnJvbSAnLi9lbnYuanMnO1xuaW1wb3J0IHsgRVhJVF9DT0RFUywgd3JpdGVFcnJvciB9IGZyb20gJy4vZXhpdC1jb2Rlcy5qcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbnRleHQsIEFjdGlvbklucHV0LCBUeXBlSG9va0NvbnRleHQsIFR5cGVIb29rSW5wdXQgfSBmcm9tICcuL2lucHV0cy5qcyc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgdHlwZSB7IFNvY2tldENvbW1hbmQgfSBmcm9tICcuL3NvY2tldC1jbGllbnQuanMnO1xuaW1wb3J0IHsgU29ja2V0Q2xpZW50IH0gZnJvbSAnLi9zb2NrZXQtY2xpZW50LmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29tbWFuZCBUeXBlIFVuaW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogVW5pb24gb2YgYWxsIGNvbW1hbmQgdHlwZXMgc3VwcG9ydGVkIGJ5IHRoZSBydW50aW1lLlxuICpcbiAqIFRoaXMgdHlwZSB1bmlvbiBhbGxvd3Mge0BsaW5rIGV4ZWN1dGVDb21tYW5kfSB0byBhY2NlcHQgYW55IGNvbW1hbmQgcmV0dXJuZWQgYnlcbiAqIHRoZSBmYWN0b3J5IGZ1bmN0aW9ucy4gVGhlIHJ1bnRpbWUgZGlzcGF0Y2hlcyBiYXNlZCBvbiB0aGUgYGZhY3RvcnlUeXBlYFxuICogZGlzY3JpbWluYW50LlxuICpcbiAqIE5vdGU6IFR5cGVWYWxpZGF0b3JDb21tYW5kIGlzIGV4Y2x1ZGVkIGJlY2F1c2UgdmFsaWRhdG9ycyB1c2UgYSBkaWZmZXJlbnRcbiAqIGV4ZWN1dGlvbiBtb2RlbCAoZmlsZS1wYXRoIHByb3RvY29sIHZpYSB7QGxpbmsgZXhlY3V0ZVZhbGlkYXRpb259KS5cbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xudHlwZSBBbnlDb21tYW5kID0gQWN0aW9uQ29tbWFuZCB8IFR5cGVDcmVhdGVDb21tYW5kIHwgVHlwZVVwZGF0ZUNvbW1hbmQgfCBUeXBlRGVsZXRlQ29tbWFuZDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSGVscGVyIEZ1bmN0aW9uc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIE5vcm1hbGl6ZXMgYW4gdW5rbm93biBlcnJvciB2YWx1ZSBpbnRvIGEgaHVtYW4tcmVhZGFibGUgbWVzc2FnZS5cbiAqXG4gKiBFcnJvcnMgaW4gSmF2YVNjcmlwdCBjYW4gYmUgdGhyb3duIHdpdGggYW55IHZhbHVlLiBUaGlzIGZ1bmN0aW9uIGVuc3VyZXNcbiAqIHdlIGFsd2F5cyBnZXQgYSBzdHJpbmcgbWVzc2FnZSByZWdhcmRsZXNzIG9mIHdoYXQgd2FzIHRocm93bi5cbiAqXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgY2F1Z2h0IGVycm9yIHZhbHVlLCB3aGljaCBtYXkgb3IgbWF5IG5vdCBiZSBhbiBFcnJvciBpbnN0YW5jZVxuICogQHJldHVybnMgQSBzdHJpbmcgbWVzc2FnZSBzdWl0YWJsZSBmb3IgbG9nZ2luZyBvciBkaXNwbGF5XG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGdldEVycm9yTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG59XG5cbi8qKlxuICogQ2xlYW5zIHVwIGxvZ2dlciBzdGF0ZSBhbmQgdGVybWluYXRlcyB0aGUgcHJvY2Vzcy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIG5ldmVyIHJldHVybnMuIEl0IGNsZWFycyB0aGUgbG9nZ2VyJ3MgY29udGV4dCwgY2xvc2VzXG4gKiBvcGVuIGZpbGUgaGFuZGxlcyB0byBmbHVzaCBwZW5kaW5nIHdyaXRlcywgYW5kIGV4aXRzIHdpdGggdGhlIHNwZWNpZmllZFxuICogY29kZS5cbiAqXG4gKiBAcGFyYW0gZXhpdENvZGUgLSBUaGUgZXhpdCBjb2RlIHRvIHBhc3MgdG8gYHByb2Nlc3MuZXhpdCgpYFxuICogQHJldHVybnMgTmV2ZXIgcmV0dXJuczsgcHJvY2VzcyB0ZXJtaW5hdGVzXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNsZWFudXBBbmRFeGl0KGV4aXRDb2RlOiBudW1iZXIpOiBuZXZlciB7XG4gIGxvZ2dlci5jbGVhckNvbnRleHQoKTtcbiAgbG9nZ2VyLmNsb3NlKCk7XG4gIHByb2Nlc3MuZXhpdChleGl0Q29kZSk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBlcnJvcnMgZHVyaW5nIGVudmlyb25tZW50IHZhcmlhYmxlIGV4dHJhY3Rpb24uXG4gKlxuICogRW52aXJvbm1lbnQgZXh0cmFjdGlvbiBjYW4gZmFpbCBpZiByZXF1aXJlZCB2YXJpYWJsZXMgYXJlIG1pc3Npbmcgb3JcbiAqIG1hbGZvcm1lZC4gVGhpcyBwcm92aWRlcyB1c2VyLWZyaWVuZGx5IGVycm9yIG91dHB1dCBhbmQgZW5zdXJlcyBwcm9wZXJcbiAqIGNsZWFudXAgYmVmb3JlIGV4aXQuXG4gKlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRocm93biBkdXJpbmcgZXh0cmFjdGlvblxuICogQHJldHVybnMgTmV2ZXIgcmV0dXJuczsgcHJvY2VzcyB0ZXJtaW5hdGVzIHdpdGggZXJyb3IgY29kZVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVFbnZFeHRyYWN0aW9uRXJyb3IoZXJyb3I6IHVua25vd24pOiBuZXZlciB7XG4gIGNvbnN0IG1lc3NhZ2UgPSBnZXRFcnJvck1lc3NhZ2UoZXJyb3IpO1xuICBsb2dnZXIuZXJyb3IoYEZhaWxlZCB0byBleHRyYWN0IGlucHV0IGZyb20gZW52aXJvbm1lbnQ6ICR7bWVzc2FnZX1gKTtcbiAgd3JpdGVFcnJvcihgSGFuZGxlciBmYWlsZWQ6ICR7bWVzc2FnZX1gKTtcbiAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG59XG5cbi8qKlxuICogSGFuZGxlcyBlcnJvcnMgdGhyb3duIGJ5IHRoZSB1c2VyJ3MgY29tbWFuZCBoYW5kbGVyLlxuICpcbiAqIFdoZW4gYSBoYW5kbGVyIHRocm93cyBvciByZWplY3RzLCB3ZSB3YW50IHRvIHByb3ZpZGUgdXNlZnVsIGRlYnVnZ2luZ1xuICogaW5mb3JtYXRpb24uIFRoaXMgd3JpdGVzIHRoZSBmdWxsIHN0YWNrIHRyYWNlIHRvIHN0ZGVyciAod2hpY2ggdGhlXG4gKiBleGVjdXRpb24gd3JhcHBlciBjYXB0dXJlcykgYW5kIGxvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIGV2ZW50LlxuICpcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0aHJvd24gb3IgcmVqZWN0aW9uIHJlYXNvbiBmcm9tIHRoZSBoYW5kbGVyXG4gKiBAcmV0dXJucyBOZXZlciByZXR1cm5zOyBwcm9jZXNzIHRlcm1pbmF0ZXMgd2l0aCBlcnJvciBjb2RlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcjogdW5rbm93bik6IG5ldmVyIHtcbiAgY29uc3QgZXJyb3JPdXRwdXQgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gKGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UpIDogU3RyaW5nKGVycm9yKTtcbiAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyb3JPdXRwdXR9XFxuYCk7XG4gIGxvZ2dlci5lcnJvcihgSGFuZGxlciBlcnJvcjogJHtnZXRFcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhlY3V0ZSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgY29tbWFuZCBoYW5kbGVyIHdpdGggZnVsbCBydW50aW1lIG9yY2hlc3RyYXRpb24uXG4gKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeSBwb2ludCB0aGF0IGNvbXBpbGVkIGhhbmRsZXJzIHVzZS4gVGhlIENMSSBnZW5lcmF0ZXNcbiAqIHdyYXBwZXIgY29kZSB0aGF0IGltcG9ydHMgdGhlIHVzZXIncyBjb21tYW5kIGFuZCBwYXNzZXMgaXQgdG8gdGhpcyBmdW5jdGlvbi5cbiAqIEZyb20gdGhlcmUsIGV4ZWN1dGVDb21tYW5kIGhhbmRsZXMgYWxsIHRoZSBjZXJlbW9ueTogZW52aXJvbm1lbnQgcGFyc2luZywgbG9nZ2luZ1xuICogc2V0dXAsIGhhbmRsZXIgaW52b2NhdGlvbiwgZXJyb3IgaGFuZGxpbmcsIGFuZCBwcm9jZXNzIHRlcm1pbmF0aW9uLlxuICpcbiAqIFRoZSBmdW5jdGlvbiBleGl0cyB0aGUgcHJvY2VzcyBpbiBhbGwgbm9ybWFsIGNvZGUgcGF0aHMuIFRoZSByZXR1cm5lZFxuICogcHJvbWlzZSBvbmx5IHJlc29sdmVzIGlmIGBwcm9jZXNzLmV4aXRgIGlzIG1vY2tlZCwgd2hpY2ggaGFwcGVucyBpbiB0ZXN0XG4gKiBzY2VuYXJpb3MuIFByb2R1Y3Rpb24gY29kZSBzaG91bGQgbm90IGF3YWl0IHRoaXMgZnVuY3Rpb24gb3IgZXhwZWN0IGl0XG4gKiB0byByZXR1cm4uXG4gKlxuICogIyMgU3VwcG9ydGVkIENvbW1hbmQgVHlwZXNcbiAqXG4gKiAtICoqQWN0aW9uKiogKGBhY3Rpb25gKTogSW52b2tlZCB3aGVuIGFuIGFjdGlvbiBpcyB0cmlnZ2VyZWRcbiAqIC0gKipUeXBlIENyZWF0ZSoqIChgdHlwZUNyZWF0ZWApOiBSdW5zIGFmdGVyIG5ldyB0eXBlZCBmaWxlIGNyZWF0aW9uXG4gKiAtICoqVHlwZSBVcGRhdGUqKiAoYHR5cGVVcGRhdGVgKTogUnVucyBhZnRlciB0eXBlZCBmaWxlIG1vZGlmaWNhdGlvblxuICogLSAqKlR5cGUgRGVsZXRlKiogKGB0eXBlRGVsZXRlYCk6IFJ1bnMgd2hlbiB0eXBlZCBmaWxlIGlzIGRlbGV0ZWRcbiAqXG4gKiBOb3RlOiBUeXBlIHZhbGlkYXRvcnMgdXNlIGEgZGlmZmVyZW50IGV4ZWN1dGlvbiBtb2RlbCAoZmlsZS1wYXRoIHByb3RvY29sKVxuICogYW5kIHNob3VsZCBiZSBleGVjdXRlZCB2aWEge0BsaW5rIGV4ZWN1dGVWYWxpZGF0aW9ufSBpbnN0ZWFkLlxuICpcbiAqICMjIEVycm9yIEhhbmRsaW5nXG4gKlxuICogRXJyb3JzIGFyZSBoYW5kbGVkIGF0IHRocmVlIGxldmVsczpcbiAqXG4gKiAxLiAqKkVudmlyb25tZW50IGV4dHJhY3Rpb24gZXJyb3JzKiogKG1pc3NpbmcvaW52YWxpZCB2YXJpYWJsZXMpOiBMb2cgdGhlXG4gKiAgICBlcnJvciBhbmQgZXhpdC4gVGhlc2UgaW5kaWNhdGUgYSBwcm9ibGVtIHdpdGggaG93IHRoZSBoYW5kbGVyIHdhcyBpbnZva2VkLlxuICpcbiAqIDIuICoqSGFuZGxlciBlcnJvcnMqKiAodXNlciBjb2RlIHRocm93cyk6IFdyaXRlIHRoZSBzdGFjayB0cmFjZSB0byBzdGRlcnIsXG4gKiAgICBsb2cgYSBzdHJ1Y3R1cmVkIGVycm9yLCBhbmQgZXhpdC4gVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGNhcHR1cmVzIHN0ZGVyclxuICogICAgZm9yIGRlYnVnZ2luZy5cbiAqXG4gKiAzLiAqKlVuZXhwZWN0ZWQgZXJyb3JzKio6IENhdGNoLWFsbCBmb3IgYW55IG90aGVyIGZhaWx1cmVzIGR1cmluZyBydW50aW1lXG4gKiAgICBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIEBwYXJhbSBjb21tYW5kIC0gVGhlIGNvbW1hbmQgdG8gZXhlY3V0ZSwgcmV0dXJuZWQgZnJvbSBhIGZhY3RvcnkgZnVuY3Rpb25cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIG9ubHkgd2hlbiBgcHJvY2Vzcy5leGl0YCBpcyBtb2NrZWQgKHRlc3RzKVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBHZW5lcmF0ZWQgd3JhcHBlciBjb2RlIChwcm9kdWNlZCBieSBDTEkpXG4gKiBpbXBvcnQgeyBleGVjdXRlQ29tbWFuZCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnL3J1bnRpbWUnO1xuICogaW1wb3J0IGNvbW1hbmQgZnJvbSAnLi91c2VyLWNvbW1hbmQuanMnO1xuICpcbiAqIC8vIFRoaXMgY2FsbCBuZXZlciByZXR1cm5zIGluIHByb2R1Y3Rpb25cbiAqIGV4ZWN1dGVDb21tYW5kKGNvbW1hbmQpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlQ29tbWFuZChjb21tYW5kOiBBbnlDb21tYW5kKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgbGV0IGlucHV0OiBBY3Rpb25JbnB1dCB8IFR5cGVIb29rSW5wdXQ7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKGNvbW1hbmQuZmFjdG9yeVR5cGUgPT09ICdhY3Rpb24nKSB7XG4gICAgICAgIGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnB1dCA9IGV4dHJhY3RUeXBlSW5wdXQoKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIGhhbmRsZUVudkV4dHJhY3Rpb25FcnJvcihlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gU2V0IGxvZ2dlciBjb250ZXh0IHdpdGggY29tbWFuZCB0eXBlXG4gICAgbG9nZ2VyLnNldENvbnRleHQoY29tbWFuZC5mYWN0b3J5VHlwZSwgeyAuLi5pbnB1dCB9KTtcblxuICAgIGlmIChjb21tYW5kLmZhY3RvcnlUeXBlID09PSAnYWN0aW9uJykge1xuICAgICAgLy8gU29ja2V0IGNvbm5lY3Rpb24gYW5kIEFjdGlvbkNvbnRleHQgZm9yIGFjdGlvbiBjb21tYW5kc1xuICAgICAgbGV0IHNvY2tldENsaWVudDogU29ja2V0Q2xpZW50IHwgdW5kZWZpbmVkO1xuICAgICAgY29uc3Qgc29ja2V0UGF0aCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIXTtcbiAgICAgIGlmIChzb2NrZXRQYXRoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc29ja2V0Q2xpZW50ID0gYXdhaXQgU29ja2V0Q2xpZW50LmNvbm5lY3Qoc29ja2V0UGF0aCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oYEZhaWxlZCB0byBjb25uZWN0IHRvIHNvY2tldCBhdCAke3NvY2tldFBhdGh9OiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgICAgICAgLy8gRmFpbC1vcGVuOiBjb250aW51ZSB3aXRob3V0IHNvY2tldFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIENhbGxiYWNrIHJlZ2lzdHJhdGlvbiBzdGF0ZVxuICAgICAgbGV0IGNhbmNlbENhbGxiYWNrOiAoKCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IHN3aXRjaFRvSW50ZXJhY3RpdmVDYWxsYmFjazogKCgpID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+KSB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBjb21tYW5kUHJvY2Vzc2VkID0gZmFsc2U7XG5cbiAgICAgIC8vIEJ1aWxkIEFjdGlvbkNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIHNvY2tldC1iYWNrZWQgY2FsbGJhY2tzXG4gICAgICBjb25zdCBjb250ZXh0OiBBY3Rpb25Db250ZXh0ID0ge1xuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICAgICAgb25DYW5jZWw6IChjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIGNhbmNlbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH0sXG4gICAgICAgIG9uU3dpdGNoVG9JbnRlcmFjdGl2ZTogKGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgc3dpdGNoVG9JbnRlcmFjdGl2ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIC8vIFdpcmUgc29ja2V0IGNvbW1hbmQgZGlzcGF0Y2hcbiAgICAgIGlmIChzb2NrZXRDbGllbnQpIHtcbiAgICAgICAgc29ja2V0Q2xpZW50Lm9uQ29tbWFuZCgoY21kOiBTb2NrZXRDb21tYW5kKSA9PiB7XG4gICAgICAgICAgLy8gRmlyc3Qtd2lucyBzZW1hbnRpY3M6IGlnbm9yZSBzdWJzZXF1ZW50IGNvbW1hbmRzXG4gICAgICAgICAgaWYgKGNvbW1hbmRQcm9jZXNzZWQpIHJldHVybjtcbiAgICAgICAgICBjb21tYW5kUHJvY2Vzc2VkID0gdHJ1ZTtcblxuICAgICAgICAgIGlmIChjbWQudHlwZSA9PT0gJ2NhbmNlbCcpIHtcbiAgICAgICAgICAgIGhhbmRsZUNhbmNlbENvbW1hbmQoY2FuY2VsQ2FsbGJhY2ssIHNvY2tldENsaWVudCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbWQudHlwZSA9PT0gJ3N3aXRjaFRvSW50ZXJhY3RpdmUnKSB7XG4gICAgICAgICAgICBoYW5kbGVTd2l0Y2hUb0ludGVyYWN0aXZlQ29tbWFuZChzd2l0Y2hUb0ludGVyYWN0aXZlQ2FsbGJhY2ssIHNvY2tldENsaWVudCEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIGFjdGlvbiBjb21tYW5kIGhhbmRsZXJcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGNvbW1hbmQoaW5wdXQgYXMgQWN0aW9uSW5wdXQsIGNvbnRleHQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgICByZXR1cm4gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2xlYW4gdXAgc29ja2V0IGFuZCBleGl0IHN1Y2Nlc3NmdWxseVxuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVHlwZUhvb2tDb250ZXh0IGZvciB0eXBlIGxpZmVjeWNsZSBob29rc1xuICAgICAgY29uc3QgY29udGV4dDogVHlwZUhvb2tDb250ZXh0ID0ge1xuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKVxuICAgICAgfTtcblxuICAgICAgLy8gRXhlY3V0ZSB0aGUgdHlwZSBob29rIGNvbW1hbmQgaGFuZGxlclxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgY29tbWFuZChpbnB1dCBhcyBUeXBlSG9va0lucHV0LCBjb250ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpO1xuICAgICAgfVxuXG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNVQ0NFU1MpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBVbmV4cGVjdGVkIGVycm9yIC0gdHJ5IHRvIGNsZWFuIHVwIGFuZCBleGl0XG4gICAgbG9nZ2VyLmVycm9yKGBVbmV4cGVjdGVkIHJ1bnRpbWUgZXJyb3I6ICR7Z2V0RXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTb2NrZXQgQ29tbWFuZCBIYW5kbGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFJlc29sdmVzIGEgY2FsbGJhY2sgcmVzdWx0IHRoYXQgbWF5IGJlIHN5bmMgb3IgYXN5bmMgaW50byBhIFByb21pc2UuXG4gKlxuICogVXNlci1yZWdpc3RlcmVkIGNhbGxiYWNrcyBtYXkgcmV0dXJuIHZvaWQsIGEgdmFsdWUsIG9yIGEgUHJvbWlzZS5cbiAqIFRoaXMgbm9ybWFsaXplcyBhbGwgY2FzZXMgaW50byBhIHNpbmdsZSBQcm9taXNlIGZvciBjb25zaXN0ZW50IGhhbmRsaW5nLlxuICpcbiAqIEBwYXJhbSByZXN1bHQgLSBDYWxsYmFjayByZXR1cm4gdmFsdWUgdGhhdCBtYXkgYWxyZWFkeSBiZSBhIHByb21pc2UuXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY2FsbGJhY2sgcmVzdWx0LlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIHRvUHJvbWlzZTxUPihyZXN1bHQ6IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gIGlmIChyZXN1bHQgJiYgdHlwZW9mIChyZXN1bHQgYXMgUHJvbWlzZTxUPikudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiByZXN1bHQgYXMgUHJvbWlzZTxUPjtcbiAgfVxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBhIGBjYW5jZWxgIGNvbW1hbmQgZnJvbSB0aGUgc29ja2V0LlxuICpcbiAqIElmIGEgY2FuY2VsIGNhbGxiYWNrIHdhcyByZWdpc3RlcmVkLCBpdCBpcyBpbnZva2VkLiBPdGhlcndpc2UsIFNJR1RFUk1cbiAqIGlzIHNlbnQgdG8gdGhlIGN1cnJlbnQgcHJvY2VzcyBhcyBhIGZhbGxiYWNrLiBBZnRlciB0aGUgY2FsbGJhY2sgY29tcGxldGVzXG4gKiAob3IgaW1tZWRpYXRlbHkgaWYgbm8gY2FsbGJhY2spLCB0aGUgcHJvY2VzcyBleGl0cyB3aXRoIGVycm9yIGNvZGUuXG4gKlxuICogQHBhcmFtIGNhbGxiYWNrIC0gVGhlIHJlZ2lzdGVyZWQgY2FuY2VsIGNhbGxiYWNrLCBpZiBhbnlcbiAqIEBwYXJhbSBzb2NrZXRDbGllbnQgLSBUaGUgc29ja2V0IGNsaWVudCB0byBjbG9zZSBiZWZvcmUgZXhpdGluZ1xuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVDYW5jZWxDb21tYW5kKFxuICBjYWxsYmFjazogKCgpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSB8IHVuZGVmaW5lZCxcbiAgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnQgfCB1bmRlZmluZWRcbik6IHZvaWQge1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgcHJvY2Vzcy5raWxsKHByb2Nlc3MucGlkLCAnU0lHVEVSTScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRvUHJvbWlzZShjYWxsYmFjaygpKS50aGVuKFxuICAgICgpID0+IHtcbiAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH0sXG4gICAgKCkgPT4ge1xuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgfVxuICApO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgYSBgc3dpdGNoVG9JbnRlcmFjdGl2ZWAgY29tbWFuZCBmcm9tIHRoZSBzb2NrZXQuXG4gKlxuICogSWYgbm8gY2FsbGJhY2sgd2FzIHJlZ2lzdGVyZWQsIHRoZSBjb21tYW5kIGlzIGlnbm9yZWQgKG5vLW9wKS4gT3RoZXJ3aXNlLFxuICogdGhlIGNhbGxiYWNrIGlzIGludm9rZWQgYW5kIGl0cyByZXR1cm4gdmFsdWUgaXMgc2VudCBhc1xuICogYHN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZWAgb24gdGhlIHNvY2tldC4gYHByb2Nlc3MuZXhpdCg0MilgIGlzIGNhbGxlZFxuICogaW5zaWRlIHRoZSBgd3JpdGUoKWAgY2FsbGJhY2sgdG8gZ3VhcmFudGVlIHRoZSByZXNwb25zZSBpcyBmbHVzaGVkIGJlZm9yZVxuICogdGhlIGV2ZW50IGxvb3AgdGVhcnMgZG93bi5cbiAqXG4gKiBAcGFyYW0gY2FsbGJhY2sgLSBUaGUgcmVnaXN0ZXJlZCBzd2l0Y2hUb0ludGVyYWN0aXZlIGNhbGxiYWNrLCBpZiBhbnlcbiAqIEBwYXJhbSBzb2NrZXRDbGllbnQgLSBUaGUgc29ja2V0IGNsaWVudCB1c2VkIHRvIHNlbmQgdGhlIHJlc3BvbnNlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZVN3aXRjaFRvSW50ZXJhY3RpdmVDb21tYW5kKFxuICBjYWxsYmFjazogKCgpID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+KSB8IHVuZGVmaW5lZCxcbiAgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnRcbik6IHZvaWQge1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdG9Qcm9taXNlKGNhbGxiYWNrKCkpLnRoZW4oXG4gICAgKGRhdGEpID0+IHtcbiAgICAgIHNvY2tldENsaWVudC5zZW5kUmVzcG9uc2VUaGVuKHsgdHlwZTogJ3N3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZScsIGRhdGEgfSwgKCkgPT4ge1xuICAgICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNXSVRDSF9UT19JTlRFUkFDVElWRSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIChlcnJvcikgPT4ge1xuICAgICAgbG9nZ2VyLmVycm9yKGBzd2l0Y2hUb0ludGVyYWN0aXZlIGNhbGxiYWNrIGVycm9yOiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgICBzb2NrZXRDbGllbnQuY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH1cbiAgKTtcbn1cbiIsICIvKipcbiAqIFNoYXJlZCBzZXNzaW9uIHV0aWxpdGllcyBmb3IgQ2xhdWRlIENvZGUgYWN0aW9uIHdvcmtmbG93cy5cbiAqXG4gKiBQcm92aWRlcyByZXVzYWJsZSBidWlsZGluZyBibG9ja3MgZm9yIGFjdGlvbnMgdGhhdCBzcGF3biB0aGUgYGNsYXVkZWAgQ0xJOlxuICogcGx1Z2luIHNldHRpbmdzIGNvbnN0cnVjdGlvbiwgQ0xJIGFyZyBidWlsZGluZywgd29ya3RyZWUgbGlmZWN5Y2xlIG1hbmFnZW1lbnQsXG4gKiBhbmQgYnJhbmNoIGNsZWFudXAuIEJvdGggdGhlIGBsYXVuY2hgIGFuZCBgaW50ZXJ2aWV3YCBhY3Rpb25zIGNvbnN1bWUgdGhlc2VcbiAqIHV0aWxpdGllcy5cbiAqXG4gKiBAc3VtbWFyeSBTaGFyZWQgc2Vzc2lvbiB1dGlsaXRpZXMgZm9yIENsYXVkZSBDb2RlIGFjdGlvbiB3b3JrZmxvd3NcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdub2RlOm9zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ25vZGU6dXRpbCc7XG5pbXBvcnQgdHlwZSB7IENhcmRzQ2xpZW50IH0gZnJvbSAnQGNhcmRzL3Nkay9jbGllbnQnO1xuaW1wb3J0IHsgdHlwZSBBY3Rpb25Db250ZXh0LCB0eXBlIEFjdGlvbklucHV0LCBDQVJEU19FTlZfVkFSUyB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IGNoZWNrV29ya3RyZWVFeGlzdHMsIGNyZWF0ZVdvcmt0cmVlLCBmaW5kR2l0Um9vdHMgfSBmcm9tICcuL2NyZWF0ZS13b3JrdHJlZS5qcyc7XG5cbmNvbnN0IGV4ZWNGaWxlQXN5bmMgPSBwcm9taXNpZnkoZXhlY0ZpbGUpO1xuXG4vKipcbiAqIEV4dHJhY3RzIGEgaHVtYW4tcmVhZGFibGUgbWVzc2FnZSBmcm9tIGFuIHVua25vd24gY2F0Y2ggdmFsdWUuXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgY2F1Z2h0IHZhbHVlIHRvIGV4dHJhY3QgYSBtZXNzYWdlIGZyb20uXG4gKiBAcmV0dXJucyBUaGUgZXJyb3IgbWVzc2FnZSBzdHJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlcnJvck1lc3NhZ2UoZXJyb3I6IHVua25vd24pOiBzdHJpbmcge1xuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBtYXJrZXRwbGFjZSBkaXJlY3RvcnkgYnVuZGxlZCB3aXRoIHRoZSBpbnN0YWxsZWQgZXh0ZW5zaW9uLlxuICogVXNlcyB0aGUgRVhURU5TSU9OX1BBVEggZW52aXJvbm1lbnQgdmFyaWFibGUgaW5qZWN0ZWQgYnkgQWN0aW9uRGlzcGF0Y2hlci5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBidW5kbGVkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhURU5TSU9OX1BBVEggaXMgbm90IHNldC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVNYXJrZXRwbGFjZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgZXh0ZW5zaW9uUGF0aCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIXTtcbiAgaWYgKCFleHRlbnNpb25QYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIfWApO1xuICB9XG4gIHJldHVybiBwYXRoLmpvaW4oZXh0ZW5zaW9uUGF0aCwgJ2Rpc3QnLCAnbWFya2V0cGxhY2UnKTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgdGhlIGAtLXNldHRpbmdzYCBKU09OIHRoYXQgZW5hYmxlcyB0aGUgYHJ1bnRpbWVgIHBsdWdpbiBhbmQgcmVnaXN0ZXJzXG4gKiB0aGUgYGNhcmRzLm1hbmFnZW1lbnRgIG1hcmtldHBsYWNlIHNvdXJjZSBzbyB0aGUgc3Bhd25lZCBgY2xhdWRlYCBwcm9jZXNzXG4gKiBjYW4gcmVzb2x2ZSB0aGUgcGx1Z2luIGZyb20gdGhlIGV4dGVuc2lvbidzIGJ1bmRsZWQgbWFya2V0cGxhY2UuXG4gKlxuICogVXNlcyB0aGUgbWFya2V0cGxhY2UgYnVuZGxlZCBpbnNpZGUgdGhlIGV4dGVuc2lvbiBpbnN0YWxsIGRpcmVjdG9yeVxuICogKGA8RVhURU5TSU9OX1BBVEg+L2Rpc3QvbWFya2V0cGxhY2VgKSBzbyB0aGUgc3Bhd25lZCBzZXNzaW9uIGFsd2F5cyBsb2FkcyB0aGVcbiAqIHBsdWdpbiB2ZXJzaW9uIHRoYXQgc2hpcHBlZCB3aXRoIHRoZSBleHRlbnNpb24sIHJlZ2FyZGxlc3Mgb2Ygd29ya3RyZWUgc3RhdGUuXG4gKlxuICogQHBhcmFtIG1hcmtldHBsYWNlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGJ1bmRsZWQgbWFya2V0cGxhY2UgZGlyZWN0b3J5LlxuICogQHJldHVybnMgU2VyaWFsaXNlZCBzZXR0aW5ncyBKU09OIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkUGx1Z2luU2V0dGluZ3MobWFya2V0cGxhY2VQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoe1xuICAgIGVuYWJsZWRQbHVnaW5zOiB7ICdydW50aW1lQGNhcmRzLm1hbmFnZW1lbnQnOiB0cnVlIH0sXG4gICAgZXh0cmFLbm93bk1hcmtldHBsYWNlczoge1xuICAgICAgJ2NhcmRzLm1hbmFnZW1lbnQnOiB7XG4gICAgICAgIHNvdXJjZTogeyBzb3VyY2U6ICdkaXJlY3RvcnknLCBwYXRoOiBtYXJrZXRwbGFjZVBhdGggfVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIENsYXVkZSBDb2RlIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5IHVzaW5nIHRoZSBzdGFuZGFyZFxuICogZmFsbGJhY2sgY2hhaW46ICRDTEFVREVfQ09ORklHX0RJUiBcdTIxOTIgJFhER19EQVRBX0hPTUUvY2xhdWRlIFx1MjE5MlxuICogJFhER19DT05GSUdfSE9NRS9jbGF1ZGUgXHUyMTkyIH4vLmNvbmZpZy9jbGF1ZGUgXHUyMTkyIH4vLmNsYXVkZS5cbiAqXG4gKiBSZXR1cm5zIHRoZSBmaXJzdCBjYW5kaWRhdGUgdGhhdCBleGlzdHMgb24gZGlzaywgb3IgbnVsbCBpZiBub25lIGlzIGZvdW5kLlxuICpcbiAqIEByZXR1cm5zIFRoZSBmaXJzdCBleGlzdGluZyBDbGF1ZGUgY29uZmlnIGRpcmVjdG9yeSBwYXRoLCBvciBudWxsIGlmIG5vbmUgZm91bmQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlQ2xhdWRlQ29uZmlnRGlyKCk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICBjb25zdCBob21lID0gaG9tZWRpcigpO1xuICBjb25zdCBjYW5kaWRhdGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0IGNsYXVkZUNvbmZpZ0RpciA9IHByb2Nlc3MuZW52WydDTEFVREVfQ09ORklHX0RJUiddO1xuICBpZiAoY2xhdWRlQ29uZmlnRGlyKSBjYW5kaWRhdGVzLnB1c2goY2xhdWRlQ29uZmlnRGlyKTtcblxuICBjb25zdCB4ZGdEYXRhSG9tZSA9IHByb2Nlc3MuZW52WydYREdfREFUQV9IT01FJ107XG4gIGlmICh4ZGdEYXRhSG9tZSkgY2FuZGlkYXRlcy5wdXNoKHBhdGguam9pbih4ZGdEYXRhSG9tZSwgJ2NsYXVkZScpKTtcblxuICBjb25zdCB4ZGdDb25maWdIb21lID0gcHJvY2Vzcy5lbnZbJ1hER19DT05GSUdfSE9NRSddO1xuICBpZiAoeGRnQ29uZmlnSG9tZSkgY2FuZGlkYXRlcy5wdXNoKHBhdGguam9pbih4ZGdDb25maWdIb21lLCAnY2xhdWRlJykpO1xuXG4gIGNhbmRpZGF0ZXMucHVzaChwYXRoLmpvaW4oaG9tZSwgJy5jb25maWcnLCAnY2xhdWRlJykpO1xuICBjYW5kaWRhdGVzLnB1c2gocGF0aC5qb2luKGhvbWUsICcuY2xhdWRlJykpO1xuXG4gIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMuYWNjZXNzKHBhdGguam9pbihjYW5kaWRhdGUsICdwbHVnaW5zJykpO1xuICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIE5vdCBmb3VuZCwgdHJ5IG5leHRcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHZlcnNpb24gZnJvbSBhIHBsdWdpbi5qc29uIGZpbGUuXG4gKiBSZXR1cm5zIG51bGwgaWYgdGhlIGZpbGUgZG9lc24ndCBleGlzdCBvciBjYW4ndCBiZSBwYXJzZWQuXG4gKlxuICogQHBhcmFtIHBsdWdpbkpzb25QYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgcGx1Z2luLmpzb24gZmlsZS5cbiAqIEByZXR1cm5zIFRoZSB2ZXJzaW9uIHN0cmluZyBmcm9tIHRoZSBmaWxlLCBvciBudWxsIGlmIHVuYXZhaWxhYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiByZWFkUGx1Z2luVmVyc2lvbihwbHVnaW5Kc29uUGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgY29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBsdWdpbkpzb25QYXRoLCAndXRmLTgnKTtcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGNvbnRlbnQpIGFzIHsgdmVyc2lvbj86IHN0cmluZyB9O1xuICAgIHJldHVybiBwYXJzZWQudmVyc2lvbiA/PyBudWxsO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIGBjYXJkcy5tYW5hZ2VtZW50YCBlbnRyeSBpbiBDbGF1ZGUgQ29kZSdzIGBrbm93bl9tYXJrZXRwbGFjZXMuanNvbmBcbiAqIHRvIHBvaW50IHRvIHRoZSBleHRlbnNpb24tYnVuZGxlZCBtYXJrZXRwbGFjZSB1c2luZyBhbiBhYnNvbHV0ZSBwYXRoLlxuICpcbiAqIENsYXVkZSBDb2RlIHJlc29sdmVzIGRpcmVjdG9yeSBtYXJrZXRwbGFjZSBzb3VyY2VzIHJlbGF0aXZlIHRvIHRoZSBzcGF3bmVkXG4gKiBzZXNzaW9uJ3MgQ1dELiBXaGVuIHNlc3Npb25zIHJ1biBpbiBhIHdvcmt0cmVlLCBhIHJlbGF0aXZlIHBhdGggbGlrZSBgXCJwdWJsaWNcImBcbiAqIHJlc29sdmVzIHRvIHRoZSB3b3JrdHJlZSdzIGNvcHkgXHUyMDE0IHdoaWNoIG1heSBjb250YWluIGEgc3RhbGUgcGx1Z2luIHZlcnNpb24uXG4gKiBXcml0aW5nIGFuIGFic29sdXRlIHBhdGggZW5zdXJlcyBDbGF1ZGUgQ29kZSBhbHdheXMgcmVhZHMgZnJvbSB0aGUgZXh0ZW5zaW9uJ3NcbiAqIGJ1bmRsZWQgbWFya2V0cGxhY2UsIHJlZ2FyZGxlc3Mgb2YgQ1dELlxuICpcbiAqIEBwYXJhbSBtYXJrZXRwbGFjZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBidW5kbGVkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlTWFya2V0cGxhY2VSZWdpc3RyYXRpb24oXG4gIG1hcmtldHBsYWNlUGF0aDogc3RyaW5nLFxuICBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgY29uZmlnRGlyID0gYXdhaXQgcmVzb2x2ZUNsYXVkZUNvbmZpZ0RpcigpO1xuICBpZiAoIWNvbmZpZ0Rpcikge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2xhdWRlIGNvbmZpZyBkaXJlY3Rvcnkgbm90IGZvdW5kLCBza2lwcGluZyBtYXJrZXRwbGFjZSByZWdpc3RyYXRpb24gdXBkYXRlJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qga25vd25QYXRoID0gcGF0aC5qb2luKGNvbmZpZ0RpciwgJ3BsdWdpbnMnLCAna25vd25fbWFya2V0cGxhY2VzLmpzb24nKTtcbiAgbGV0IHJhdzogc3RyaW5nO1xuICB0cnkge1xuICAgIHJhdyA9IGF3YWl0IGZzLnJlYWRGaWxlKGtub3duUGF0aCwgJ3V0Zi04Jyk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgJ2NvZGUnIGluIGVycm9yICYmIGVycm9yLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICBsb2dnZXIuZGVidWcoJ2tub3duX21hcmtldHBsYWNlcy5qc29uIG5vdCBmb3VuZCwgc2tpcHBpbmcnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyYXcpIGFzIFJlY29yZDxcbiAgICBzdHJpbmcsXG4gICAgeyBzb3VyY2U/OiB7IHNvdXJjZT86IHN0cmluZzsgcGF0aD86IHN0cmluZyB9OyBpbnN0YWxsTG9jYXRpb24/OiBzdHJpbmc7IGxhc3RVcGRhdGVkPzogc3RyaW5nIH1cbiAgPjtcbiAgY29uc3QgZW50cnkgPSBkYXRhWydjYXJkcy5tYW5hZ2VtZW50J107XG4gIGlmICghZW50cnk/LnNvdXJjZSB8fCBlbnRyeS5zb3VyY2Uuc291cmNlICE9PSAnZGlyZWN0b3J5JykgcmV0dXJuO1xuXG4gIGlmIChlbnRyeS5zb3VyY2UucGF0aCA9PT0gbWFya2V0cGxhY2VQYXRoICYmIGVudHJ5Lmluc3RhbGxMb2NhdGlvbiA9PT0gbWFya2V0cGxhY2VQYXRoKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdNYXJrZXRwbGFjZSByZWdpc3RyYXRpb24gYWxyZWFkeSBwb2ludHMgdG8gZXh0ZW5zaW9uIGJ1bmRsZScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGVudHJ5LnNvdXJjZS5wYXRoID0gbWFya2V0cGxhY2VQYXRoO1xuICBlbnRyeS5pbnN0YWxsTG9jYXRpb24gPSBtYXJrZXRwbGFjZVBhdGg7XG4gIGVudHJ5Lmxhc3RVcGRhdGVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICBhd2FpdCBmcy53cml0ZUZpbGUoa25vd25QYXRoLCBgJHtKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCA0KX1cXG5gKTtcbiAgbG9nZ2VyLmluZm8oJ1VwZGF0ZWQgbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uIHRvIGV4dGVuc2lvbiBidW5kbGUnLCB7IG1hcmtldHBsYWNlUGF0aCB9KTtcbn1cblxuLyoqXG4gKiBFdmljdHMgdGhlIENsYXVkZSBDb2RlIHBsdWdpbiBjYWNoZSBmb3IgYHJ1bnRpbWVAY2FyZHMubWFuYWdlbWVudGAgd2hlbiB0aGVcbiAqIGNhY2hlZCB2ZXJzaW9uIGlzIG9sZGVyIHRoYW4gdGhlIHZlcnNpb24gYnVuZGxlZCB3aXRoIHRoZSBleHRlbnNpb24uXG4gKlxuICogUmVhZHMgdGhlIGJ1bmRsZWQgcnVudGltZSBwbHVnaW4uanNvbiB2ZXJzaW9uIGZyb20gdGhlIGV4dGVuc2lvbidzIG1hcmtldHBsYWNlXG4gKiBkaXJlY3RvcnksIHRoZW4gY2hlY2tzIGZvciBjYWNoZWQgdmVyc2lvbnMgdW5kZXJcbiAqIGA8Y29uZmlnRGlyPi9wbHVnaW5zL2NhY2hlL2NhcmRzLW1hbmFnZW1lbnQvcnVudGltZS9gLiBJZiBhbnkgY2FjaGVkIHZlcnNpb25cbiAqIGV4aXN0cyB0aGF0IGlzIGxvd2VyIHRoYW4gdGhlIGJ1bmRsZWQgdmVyc2lvbiwgdGhlIGVudGlyZSBydW50aW1lIGNhY2hlXG4gKiBkaXJlY3RvcnkgaXMgcmVtb3ZlZCBzbyBDbGF1ZGUgQ29kZSByZS1jYWNoZXMgZnJvbSB0aGUgZGlyZWN0b3J5IHNvdXJjZS5cbiAqXG4gKiBAcGFyYW0gbWFya2V0cGxhY2VQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV2aWN0U3RhbGVSdW50aW1lQ2FjaGUobWFya2V0cGxhY2VQYXRoOiBzdHJpbmcsIGxvZ2dlcjogQWN0aW9uQ29udGV4dFsnbG9nZ2VyJ10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgYnVuZGxlZFZlcnNpb24gPSBhd2FpdCByZWFkUGx1Z2luVmVyc2lvbihcbiAgICBwYXRoLmpvaW4obWFya2V0cGxhY2VQYXRoLCAncGx1Z2lucycsICdydW50aW1lJywgJy5jbGF1ZGUtcGx1Z2luJywgJ3BsdWdpbi5qc29uJylcbiAgKTtcbiAgaWYgKCFidW5kbGVkVmVyc2lvbikge1xuICAgIGxvZ2dlci53YXJuKCdDb3VsZCBub3QgcmVhZCBidW5kbGVkIHJ1bnRpbWUgcGx1Z2luIHZlcnNpb24sIHNraXBwaW5nIGNhY2hlIGV2aWN0aW9uJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgY29uZmlnRGlyID0gYXdhaXQgcmVzb2x2ZUNsYXVkZUNvbmZpZ0RpcigpO1xuICBpZiAoIWNvbmZpZ0Rpcikge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2xhdWRlIGNvbmZpZyBkaXJlY3Rvcnkgbm90IGZvdW5kLCBza2lwcGluZyBjYWNoZSBldmljdGlvbicpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGNhY2hlRGlyID0gcGF0aC5qb2luKGNvbmZpZ0RpciwgJ3BsdWdpbnMnLCAnY2FjaGUnLCAnY2FyZHMtbWFuYWdlbWVudCcsICdydW50aW1lJyk7XG4gIGxldCBlbnRyaWVzOiBzdHJpbmdbXTtcbiAgdHJ5IHtcbiAgICBlbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihjYWNoZURpcik7XG4gIH0gY2F0Y2gge1xuICAgIC8vIE5vIGNhY2hlIGRpcmVjdG9yeSBcdTIwMTQgbm90aGluZyB0byBldmljdFxuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChlbnRyaWVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gIC8vIENoZWNrIGlmIGFueSBjYWNoZWQgdmVyc2lvbiBpcyBzdGFsZSAobG93ZXIgdGhhbiBidW5kbGVkKVxuICBjb25zdCBidW5kbGVkUGFydHMgPSBidW5kbGVkVmVyc2lvbi5zcGxpdCgnLicpLm1hcChOdW1iZXIpO1xuICBsZXQgaGFzU3RhbGUgPSBmYWxzZTtcblxuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICBjb25zdCBwYXJ0cyA9IGVudHJ5LnNwbGl0KCcuJykubWFwKE51bWJlcik7XG4gICAgaWYgKHBhcnRzLnNvbWUoTnVtYmVyLmlzTmFOKSB8fCBwYXJ0cy5sZW5ndGggIT09IDMpIGNvbnRpbnVlO1xuXG4gICAgLy8gQ29tcGFyZSBzZW12ZXI6IHN0YWxlIGlmIGNhY2hlZCA8IGJ1bmRsZWRcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgY29uc3QgY2FjaGVkID0gcGFydHNbaV0gPz8gMDtcbiAgICAgIGNvbnN0IGJ1bmRsZWQgPSBidW5kbGVkUGFydHNbaV0gPz8gMDtcbiAgICAgIGlmIChjYWNoZWQgPCBidW5kbGVkKSB7XG4gICAgICAgIGhhc1N0YWxlID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAoY2FjaGVkID4gYnVuZGxlZCkgYnJlYWs7XG4gICAgfVxuICAgIGlmIChoYXNTdGFsZSkgYnJlYWs7XG4gIH1cblxuICBpZiAoIWhhc1N0YWxlKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdSdW50aW1lIHBsdWdpbiBjYWNoZSBpcyB1cCB0byBkYXRlJywgeyBidW5kbGVkVmVyc2lvbiwgY2FjaGVkVmVyc2lvbnM6IGVudHJpZXMgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbG9nZ2VyLmluZm8oJ0V2aWN0aW5nIHN0YWxlIHJ1bnRpbWUgcGx1Z2luIGNhY2hlJywgeyBidW5kbGVkVmVyc2lvbiwgY2FjaGVkVmVyc2lvbnM6IGVudHJpZXMgfSk7XG4gIGF3YWl0IGZzLnJtKGNhY2hlRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG59XG5cbi8qKlxuICogQnVpbGRzIHRoZSBDTEkgYXJndW1lbnQgbGlzdCBmb3IgdGhlIGBjbGF1ZGVgIHByb2Nlc3MuXG4gKlxuICogQHBhcmFtIHByb21wdCAtIFRoZSBwcm9tcHQgc3RyaW5nIGZvciBuZXcgc2Vzc2lvbnMuXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBpZGVudGlmaWVyICh1c2VkIGZvciBgLS1zZXNzaW9uLWlkYCBvciBgLS1yZXN1bWVgKS5cbiAqIEBwYXJhbSByZXN1bWUgLSBXaGVuIHRydWUsIHBhc3NlcyBgLS1yZXN1bWVgIGluc3RlYWQgb2Ygc3RhcnRpbmcgYSBuZXcgc2Vzc2lvbi5cbiAqIEBwYXJhbSBtb2RlIC0gRXhlY3V0aW9uIG1vZGU7IGAnYmFja2dyb3VuZCdgIGFwcGVuZHMgYC0tcHJpbnRgLlxuICogQHBhcmFtIGNhcmRSZXBvUGF0aCAtIEFic29sdXRlIHBhdGggcGFzc2VkIHZpYSBgLS1hZGQtZGlyYC5cbiAqIEBwYXJhbSBtYXJrZXRwbGFjZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBidW5kbGVkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEByZXR1cm5zIEFycmF5IG9mIENMSSBhcmd1bWVudHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFyZ3MoXG4gIHByb21wdDogc3RyaW5nLFxuICBzZXNzaW9uSWQ6IHN0cmluZyxcbiAgcmVzdW1lOiBib29sZWFuLFxuICBtb2RlOiBBY3Rpb25JbnB1dFsnZXhlY3V0aW9uTW9kZSddLFxuICBjYXJkUmVwb1BhdGg6IHN0cmluZyxcbiAgbWFya2V0cGxhY2VQYXRoOiBzdHJpbmdcbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgYXJnczogc3RyaW5nW10gPSBbXTtcblxuICBpZiAocmVzdW1lKSB7XG4gICAgYXJncy5wdXNoKCctLXJlc3VtZScsIHNlc3Npb25JZCk7XG4gIH0gZWxzZSB7XG4gICAgYXJncy5wdXNoKHByb21wdCk7XG4gICAgYXJncy5wdXNoKCctLXNlc3Npb24taWQnLCBzZXNzaW9uSWQpO1xuICB9XG4gIGFyZ3MucHVzaCgnLS1zZXR0aW5ncycsIGJ1aWxkUGx1Z2luU2V0dGluZ3MobWFya2V0cGxhY2VQYXRoKSk7XG4gIGFyZ3MucHVzaCgnLS1hZGQtZGlyJywgY2FyZFJlcG9QYXRoKTtcbiAgaWYgKG1vZGUgPT09ICdiYWNrZ3JvdW5kJykge1xuICAgIGFyZ3MucHVzaCgnLS1wcmludCcpO1xuICB9XG5cbiAgcmV0dXJuIGFyZ3M7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIGN1cnJlbnQgYnJhbmNoIG5hbWUgaW4gdGhlIGdpdmVuIHdvcmtzcGFjZS5cbiAqXG4gKiBAcGFyYW0gd29ya3NwYWNlUGF0aCAtIERpcmVjdG9yeSB3aGVyZSBgZ2l0IHJldi1wYXJzZWAgcnVucy5cbiAqIEByZXR1cm5zIFRoZSBhYmJyZXZpYXRlZCBicmFuY2ggbmFtZSBhdCBIRUFELlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZUJhc2VCcmFuY2god29ya3NwYWNlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsncmV2LXBhcnNlJywgJy0tYWJicmV2LXJlZicsICdIRUFEJ10sIHtcbiAgICBjd2Q6IHdvcmtzcGFjZVBhdGhcbiAgfSk7XG4gIHJldHVybiBzdGRvdXQudHJpbSgpO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgd29ya3RyZWUgcGF0aCBleGlzdHMgb24gZGlzay5cbiAqXG4gKiBAcGFyYW0gd29ya3RyZWVQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0ZXN0LlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIHRoZSBwYXRoIGlzIGFjY2Vzc2libGUuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHdvcmt0cmVlRXhpc3RzT25EaXNrKHdvcmt0cmVlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgYXdhaXQgZnMuYWNjZXNzKHdvcmt0cmVlUGF0aCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIEZpbmRzIG9yIGNyZWF0ZXMgYSB3b3JrdHJlZSBmb3IgdGhlIGNhcmQuXG4gKlxuICogVHJpZXMgdG8gcmV1c2UgYW4gZXhpc3RpbmcgYnJhbmNoIHdob3NlIHdvcmt0cmVlIGlzIHN0aWxsIG9uIGRpc2suIFdoZW4gbm9cbiAqIHZhbGlkIGJyYW5jaCBleGlzdHMsIGNyZWF0ZXMgYSBuZXcgb25lIGFuZCByZWdpc3RlcnMgaXQgd2l0aCB0aGUgQVBJLlxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIEFjdGlvbiBpbnB1dCBjb250YWluaW5nIGNhcmRJZCBhbmQgd29ya3NwYWNlIHBhdGhzLlxuICogQHBhcmFtIGNsaWVudCAtIENhcmRzIEFQSSBjbGllbnQgZm9yIGJyYW5jaCBDUlVELlxuICogQHBhcmFtIGJhc2VCcmFuY2ggLSBDdXJyZW50IGJyYW5jaCBpbiB0aGUgd29ya3NwYWNlICh1c2VkIGFzIHBhcmVudCkuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqIEByZXR1cm5zIFdvcmt0cmVlIHBhdGgsIGJyYW5jaCBuYW1lLCBhbmQgcGFyZW50IGJyYW5jaCBuYW1lLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZU9yQ3JlYXRlV29ya3RyZWUoXG4gIGlucHV0OiBBY3Rpb25JbnB1dCxcbiAgY2xpZW50OiBDYXJkc0NsaWVudCxcbiAgYmFzZUJyYW5jaDogc3RyaW5nLFxuICBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddXG4pOiBQcm9taXNlPHsgd29ya3RyZWVQYXRoOiBzdHJpbmc7IGJyYW5jaE5hbWU6IHN0cmluZzsgcGFyZW50QnJhbmNoOiBzdHJpbmcgfT4ge1xuICBjb25zdCB7IGJyYW5jaGVzIH0gPSBhd2FpdCBjbGllbnQuZ2V0QnJhbmNoZXMoaW5wdXQuY2FyZElkLCB7IHdvcmtzcGFjZVBhdGg6IGlucHV0LndvcmtzcGFjZVBhdGggfSk7XG5cbiAgLy8gVHJ5IHRvIHJldXNlIGFuIGV4aXN0aW5nIGJyYW5jaCB3aXRoIGEgdmFsaWQgd29ya3RyZWUgb24gZGlza1xuICBmb3IgKGNvbnN0IGJyYW5jaCBvZiBicmFuY2hlcykge1xuICAgIGlmICghYnJhbmNoLmV4aXN0cyB8fCAhYnJhbmNoLndvcmt0cmVlKSBjb250aW51ZTtcbiAgICBpZiAoIShhd2FpdCB3b3JrdHJlZUV4aXN0c09uRGlzayhicmFuY2gud29ya3RyZWUpKSkgY29udGludWU7XG5cbiAgICBjb25zdCBwYXJlbnRCcmFuY2ggPSBicmFuY2gucGFyZW50QnJhbmNoID8/IGJhc2VCcmFuY2g7XG5cbiAgICBsb2dnZXIuaW5mbygnUmV1c2luZyBleGlzdGluZyB3b3JrdHJlZScsIHsgYnJhbmNoOiBicmFuY2gubmFtZSwgd29ya3RyZWU6IGJyYW5jaC53b3JrdHJlZSB9KTtcbiAgICByZXR1cm4geyB3b3JrdHJlZVBhdGg6IGJyYW5jaC53b3JrdHJlZSwgYnJhbmNoTmFtZTogYnJhbmNoLm5hbWUsIHBhcmVudEJyYW5jaCB9O1xuICB9XG5cbiAgLy8gTm8gdmFsaWQgZXhpc3RpbmcgYnJhbmNoIFx1MjAxNCBjcmVhdGUgbmV3IG9uZS5cbiAgLy8gVGhlIEFQSSBtYXkgYmUgb3V0IG9mIHN5bmMgd2l0aCBnaXQgKGUuZy4gYSBwcmV2aW91cyB3b3JrdHJlZSB3YXMgY3JlYXRlZFxuICAvLyBidXQgbmV2ZXIgcmVnaXN0ZXJlZCwgb3IgaXRzIEFQSSByZWNvcmQgd2FzIGRlbGV0ZWQpLiBUbyBhdm9pZCBjb2xsaWRpbmdcbiAgLy8gd2l0aCB3b3JrdHJlZXMgZ2l0IGFscmVhZHkga25vd3MgYWJvdXQsIHByb2JlIGdpdCdzIGFjdHVhbCBzdGF0ZSBhbmRcbiAgLy8gaW5jcmVtZW50IHBhc3QgYW55IG9jY3VwaWVkIHNsb3RzLlxuICBjb25zdCBwcmVmaXggPSBgY2FyZHMvJHtpbnB1dC5jYXJkSWR9L2A7XG4gIGNvbnN0IGV4aXN0aW5nTnVtYmVycyA9IGJyYW5jaGVzXG4gICAgLmZpbHRlcigoYikgPT4gYi5uYW1lLnN0YXJ0c1dpdGgocHJlZml4KSlcbiAgICAubWFwKChiKSA9PiBwYXJzZUludChiLm5hbWUuc2xpY2UocHJlZml4Lmxlbmd0aCksIDEwKSlcbiAgICAuZmlsdGVyKChuKSA9PiAhTnVtYmVyLmlzTmFOKG4pKTtcbiAgbGV0IG5leHROdW1iZXIgPSBleGlzdGluZ051bWJlcnMubGVuZ3RoID4gMCA/IE1hdGgubWF4KC4uLmV4aXN0aW5nTnVtYmVycykgKyAxIDogMTtcblxuICBjb25zdCB7IHJlcG9Sb290IH0gPSBhd2FpdCBmaW5kR2l0Um9vdHMoaW5wdXQud29ya3NwYWNlUGF0aCk7XG4gIHdoaWxlIChhd2FpdCBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290LCBwYXRoLmpvaW4ocmVwb1Jvb3QsICcud29ya3RyZWVzJywgYCR7cHJlZml4fSR7bmV4dE51bWJlcn1gKSkpIHtcbiAgICBsb2dnZXIud2FybignV29ya3RyZWUgYWxyZWFkeSBleGlzdHMgaW4gZ2l0IGJ1dCBub3QgaW4gQVBJLCBza2lwcGluZycsIHtcbiAgICAgIGJyYW5jaDogYCR7cHJlZml4fSR7bmV4dE51bWJlcn1gXG4gICAgfSk7XG4gICAgbmV4dE51bWJlcisrO1xuICB9XG5cbiAgY29uc3QgYnJhbmNoTmFtZSA9IGAke3ByZWZpeH0ke25leHROdW1iZXJ9YDtcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlV29ya3RyZWUoYnJhbmNoTmFtZSwgeyBjd2Q6IGlucHV0LndvcmtzcGFjZVBhdGggfSk7XG4gIGF3YWl0IGNsaWVudC5hZGRCcmFuY2goaW5wdXQuY2FyZElkLCB7IG5hbWU6IGJyYW5jaE5hbWUsIHdvcmt0cmVlOiByZXN1bHQud29ya3RyZWUsIHBhcmVudEJyYW5jaDogYmFzZUJyYW5jaCB9KTtcblxuICBsb2dnZXIuaW5mbygnQ3JlYXRlZCBuZXcgd29ya3RyZWUnLCB7IGJyYW5jaDogYnJhbmNoTmFtZSwgd29ya3RyZWU6IHJlc3VsdC53b3JrdHJlZSB9KTtcbiAgcmV0dXJuIHsgd29ya3RyZWVQYXRoOiByZXN1bHQud29ya3RyZWUsIGJyYW5jaE5hbWUsIHBhcmVudEJyYW5jaDogYmFzZUJyYW5jaCB9O1xufVxuXG4vKipcbiAqIFJ1bnMgYSBzaW5nbGUgY2xlYW51cCBzdGVwLCBsb2dnaW5nIGEgd2FybmluZyBvbiBmYWlsdXJlIHJhdGhlciB0aGFuXG4gKiBhYm9ydGluZyB0aGUgc3dlZXAuIEVhY2ggc3RlcCAod29ya3RyZWUgcmVtb3ZhbCwgYnJhbmNoIGRlbGV0aW9uLCBBUElcbiAqIHJlY29yZCByZW1vdmFsKSBpcyBpbmRlcGVuZGVudCBcdTIwMTQgYSBmYWlsdXJlIGluIG9uZSBtdXN0IG5vdCBwcmV2ZW50IHRoZVxuICogb3RoZXJzIGZyb20gcnVubmluZy5cbiAqXG4gKiBAcGFyYW0gc3RlcCAtIEFzeW5jIG9wZXJhdGlvbiB0byBhdHRlbXB0LlxuICogQHBhcmFtIGxhYmVsIC0gSHVtYW4tcmVhZGFibGUgbGFiZWwgbG9nZ2VkIG9uIGZhaWx1cmUuXG4gKiBAcGFyYW0gYnJhbmNoTmFtZSAtIEJyYW5jaCBuYW1lIGluY2x1ZGVkIGluIGRpYWdub3N0aWMgb3V0cHV0LlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHRyeUNsZWFudXBTdGVwKFxuICBzdGVwOiAoKSA9PiBQcm9taXNlPHVua25vd24+LFxuICBsYWJlbDogc3RyaW5nLFxuICBicmFuY2hOYW1lOiBzdHJpbmcsXG4gIGxvZ2dlcjogQWN0aW9uQ29udGV4dFsnbG9nZ2VyJ11cbik6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGF3YWl0IHN0ZXAoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXIud2FybihsYWJlbCwgeyBicmFuY2g6IGJyYW5jaE5hbWUsIGVycm9yOiBlcnJvck1lc3NhZ2UoZXJyb3IpIH0pO1xuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlcyBicmFuY2hlcyB0aGF0IGFyZSBmdWxseSBtZXJnZWQgaW50byB0aGUgYmFzZSBicmFuY2guXG4gKlxuICogRm9yIGVhY2ggbWVyZ2VkIGJyYW5jaCB0aGUgd29ya3RyZWUgZGlyZWN0b3J5IGlzIHJlbW92ZWQsIHRoZSBsb2NhbCBicmFuY2hcbiAqIHJlZiBpcyBkZWxldGVkLCBhbmQgdGhlIGJyYW5jaCByZWNvcmQgaXMgcmVtb3ZlZCBmcm9tIHRoZSBBUEkuIEluZGl2aWR1YWxcbiAqIGZhaWx1cmVzIGFyZSBsb2dnZWQgYW5kIGRvIG5vdCBhYm9ydCB0aGUgc3dlZXAuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gQWN0aW9uIGlucHV0IGNvbnRhaW5pbmcgY2FyZElkIGFuZCB3b3Jrc3BhY2UgcGF0aHMuXG4gKiBAcGFyYW0gY2xpZW50IC0gQ2FyZHMgQVBJIGNsaWVudCBmb3IgYnJhbmNoIHJlbW92YWwuXG4gKiBAcGFyYW0gYmFzZUJyYW5jaCAtIEJyYW5jaCB0byBjaGVjayBtZXJnZSBzdGF0dXMgYWdhaW5zdC5cbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYW51cE1lcmdlZEJyYW5jaGVzKFxuICBpbnB1dDogQWN0aW9uSW5wdXQsXG4gIGNsaWVudDogQ2FyZHNDbGllbnQsXG4gIGJhc2VCcmFuY2g6IHN0cmluZyxcbiAgbG9nZ2VyOiBBY3Rpb25Db250ZXh0Wydsb2dnZXInXVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHsgYnJhbmNoZXMgfSA9IGF3YWl0IGNsaWVudC5nZXRCcmFuY2hlcyhpbnB1dC5jYXJkSWQsIHsgd29ya3NwYWNlUGF0aDogaW5wdXQud29ya3NwYWNlUGF0aCB9KTtcblxuICBmb3IgKGNvbnN0IGJyYW5jaCBvZiBicmFuY2hlcykge1xuICAgIGlmICghYnJhbmNoLmV4aXN0cykgY29udGludWU7XG5cbiAgICB0cnkge1xuICAgICAgLy8gbWVyZ2UtYmFzZSAtLWlzLWFuY2VzdG9yIGV4aXRzIG5vbi16ZXJvIHdoZW4gTk9UIGFuIGFuY2VzdG9yIChub3QgbWVyZ2VkKVxuICAgICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydtZXJnZS1iYXNlJywgJy0taXMtYW5jZXN0b3InLCBicmFuY2gubmFtZSwgYmFzZUJyYW5jaF0sIHtcbiAgICAgICAgY3dkOiBpbnB1dC53b3Jrc3BhY2VQYXRoXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIEV4cGVjdGVkIGZvciB1bm1lcmdlZCBicmFuY2hlcyBcdTIwMTQgc2tpcCBjbGVhbnVwXG4gICAgICBsb2dnZXIuZGVidWcoJ0JyYW5jaCBub3QgbWVyZ2VkLCBza2lwcGluZyBjbGVhbnVwJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gQnJhbmNoIGlzIG1lcmdlZCBcdTIwMTQgY2xlYW4gdXAgd29ya3RyZWUsIGJyYW5jaCByZWYsIGFuZCBBUEkgcmVjb3JkXG4gICAgaWYgKGJyYW5jaC53b3JrdHJlZSkge1xuICAgICAgYXdhaXQgdHJ5Q2xlYW51cFN0ZXAoXG4gICAgICAgICgpID0+IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAncmVtb3ZlJywgYnJhbmNoLndvcmt0cmVlIV0sIHsgY3dkOiBpbnB1dC53b3Jrc3BhY2VQYXRoIH0pLFxuICAgICAgICAnRmFpbGVkIHRvIHJlbW92ZSB3b3JrdHJlZScsXG4gICAgICAgIGJyYW5jaC5uYW1lLFxuICAgICAgICBsb2dnZXJcbiAgICAgICk7XG4gICAgfVxuXG4gICAgYXdhaXQgdHJ5Q2xlYW51cFN0ZXAoXG4gICAgICAoKSA9PiBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ2JyYW5jaCcsICctZCcsIGJyYW5jaC5uYW1lXSwgeyBjd2Q6IGlucHV0LndvcmtzcGFjZVBhdGggfSksXG4gICAgICAnRmFpbGVkIHRvIGRlbGV0ZSBicmFuY2gnLFxuICAgICAgYnJhbmNoLm5hbWUsXG4gICAgICBsb2dnZXJcbiAgICApO1xuXG4gICAgYXdhaXQgdHJ5Q2xlYW51cFN0ZXAoXG4gICAgICAoKSA9PiBjbGllbnQucmVtb3ZlQnJhbmNoKGlucHV0LmNhcmRJZCwgYnJhbmNoLm5hbWUpLFxuICAgICAgJ0ZhaWxlZCB0byByZW1vdmUgYnJhbmNoIGZyb20gQVBJJyxcbiAgICAgIGJyYW5jaC5uYW1lLFxuICAgICAgbG9nZ2VyXG4gICAgKTtcblxuICAgIGxvZ2dlci5pbmZvKCdDbGVhbmVkIHVwIG1lcmdlZCBicmFuY2gnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUgfSk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ25vZGU6dXRpbCc7XG5cbi8qKlxuICogSW1wbGVtZW50cyBjcmVhdGUgd29ya3RyZWUgYmVoYXZpb3IgZm9yIHRoZSBkZWZhdWx0LWNvbmZpZ3VyYXRpb24gcGFja2FnZS5cbiAqIFRoZSBtb2R1bGUgY2FwdHVyZXMgZG9tYWluIHJ1bGVzIGluIG9uZSBwbGFjZSBzbyBjYWxsZXJzIGNhbiBjb21wb3NlIHdvcmtmbG93cyB3aXRob3V0XG4gKiBkdXBsaWNhdGluZyBlZGdlLWNhc2UgaGFuZGxpbmcuXG4gKlxuICogQHN1bW1hcnkgQ3JlYXRlIFdvcmt0cmVlIGxvZ2ljIGZvciBsaWJcbiAqL1xuXG5jb25zdCBleGVjRmlsZUFzeW5jID0gcHJvbWlzaWZ5KGV4ZWNGaWxlKTtcblxuLyoqXG4gKiBWYWxpZGF0ZXMgYSBicmFuY2ggbmFtZSBhZ2FpbnN0IHRoZSBDTEkncyBzYWZlIHN1YnNldC5cbiAqXG4gKiBUaGUgbmFtZSBtdXN0IHN0YXJ0IHdpdGggYW4gYWxwaGFudW1lcmljIGNoYXJhY3RlciBhbmQgbWF5IHRoZW4gaW5jbHVkZVxuICogYWxwaGFudW1lcmljcywgc2xhc2hlcywgdW5kZXJzY29yZXMsIG9yIGRhc2hlcy5cbiAqXG4gKiBAcGFyYW0gbmFtZSAtIENhbmRpZGF0ZSBicmFuY2ggbmFtZSBzdXBwbGllZCBieSB0aGUgY2FsbGVyLlxuICogQHRocm93cyB7RXJyb3J9IFdoZW4gdGhlIGJyYW5jaCBuYW1lIGRvZXMgbm90IG1hdGNoIHRoZSBzdXBwb3J0ZWQgZm9ybWF0LlxuICogQHJldHVybnMgTm8gdmFsdWUuIFRocm93cyBvbiBpbnZhbGlkIGlucHV0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVCcmFuY2hOYW1lKG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBicmFuY2hOYW1lUmVnZXggPSAvXlthLXpBLVowLTldW2EtekEtWjAtOS9fLV0qJC87XG4gIGlmICghYnJhbmNoTmFtZVJlZ2V4LnRlc3QobmFtZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yOiBJbnZhbGlkIGJyYW5jaCBuYW1lIGZvcm1hdC4nKTtcbiAgfVxufVxuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciBhIHJlbGF0aXZlIHBhdGggaXMgbmVzdGVkIHVuZGVyIGFueSBrbm93biBwYXJlbnQgcGF0aC5cbiAqXG4gKiBUaGUgY2hlY2sgd2Fsa3MgYW5jZXN0b3Igc2VnbWVudHMgb2YgYGRpcmAgYW5kIHJldHVybnMgdHJ1ZSBvbiB0aGUgZmlyc3RcbiAqIG1hdGNoIGluIGBwYXJlbnRTZXRgLlxuICpcbiAqIEBwYXJhbSBkaXIgLSBSZWxhdGl2ZSBwYXRoIHRvIHRlc3QuXG4gKiBAcGFyYW0gcGFyZW50U2V0IC0gQ2FuZGlkYXRlIHBhcmVudCBkaXJlY3RvcmllcyByZXByZXNlbnRlZCBhcyByZWxhdGl2ZSBwYXRocy5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiBgZGlyYCBpcyBuZXN0ZWQgdW5kZXIgYSBwYXRoIGluIGBwYXJlbnRTZXRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOZXN0ZWRVbmRlcihkaXI6IHN0cmluZywgcGFyZW50U2V0OiBTZXQ8c3RyaW5nPik6IGJvb2xlYW4ge1xuICBsZXQgY3VycmVudCA9IGRpcjtcbiAgd2hpbGUgKGN1cnJlbnQuaW5jbHVkZXMoJy8nKSkge1xuICAgIGN1cnJlbnQgPSBjdXJyZW50LnN1YnN0cmluZygwLCBjdXJyZW50Lmxhc3RJbmRleE9mKCcvJykpO1xuICAgIGlmIChwYXJlbnRTZXQuaGFzKGN1cnJlbnQpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgc3ltbGluayB0YXJnZXQgcG9pbnRzIHRvIGtub3duIG1vbm9yZXBvLWludGVybmFsIGxvY2F0aW9ucy5cbiAqXG4gKiBJbnRlcm5hbCB0YXJnZXRzIGFyZSBwcmVzZXJ2ZWQgYXMgcmVsYXRpdmUgbGlua3MgZHVyaW5nIG5vZGVfbW9kdWxlcyByZXJvdXRlXG4gKiBzbyB3b3Jrc3BhY2UgbGlua3Mga2VlcCB3b3JraW5nIGluc2lkZSBhIHdvcmt0cmVlLlxuICpcbiAqIEBwYXJhbSB0YXJnZXQgLSBTeW1saW5rIHRhcmdldCByZWFkIGZyb20gdGhlIHNvdXJjZSBub2RlX21vZHVsZXMgZW50cnkuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gdGhlIHRhcmdldCBzdGFydHMgd2l0aCBhbiBpbnRlcm5hbCBwcmVmaXguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0ludGVybmFsU3ltbGluayh0YXJnZXQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gdGFyZ2V0LnN0YXJ0c1dpdGgoJy4uLycpO1xufVxuXG5pbnRlcmZhY2UgQ3JlYXRlV29ya3RyZWVSZXN1bHQge1xuICBicmFuY2g6IHN0cmluZztcbiAgd29ya3RyZWU6IHN0cmluZztcbiAgYmFzZVNoYTogc3RyaW5nO1xuICByZXJvdXRlZFN5bWxpbmtzPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW5kIGNvbmZpZ3VyZXMgYSBuZXcgZ2l0IHdvcmt0cmVlIGZvciBhIGJyYW5jaC5cbiAqXG4gKiBUaGUgd29ya2Zsb3cgdmFsaWRhdGVzIHRoZSBicmFuY2ggbmFtZSwgY3JlYXRlcyB0aGUgd29ya3RyZWUsIG1pcnJvcnNcbiAqIGV4aXN0aW5nIHJvb3Qgc3ltbGlua3MsIHN5bWxpbmtzIGlnbm9yZWQgcGF0aHMsIHJlcm91dGVzIG5vZGVfbW9kdWxlcyBsaW5rcyxcbiAqIGFuZCB1cGRhdGVzIHBlci13b3JrdHJlZSBnaXQgZXhjbHVkZXMuXG4gKlxuICogQHBhcmFtIGJyYW5jaE5hbWUgLSBOYW1lIG9mIHRoZSBicmFuY2ggdG8gY3JlYXRlIG9yIGF0dGFjaC5cbiAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvbi5cbiAqIEBwYXJhbSBvcHRpb25zLmN3ZCAtIFdvcmtpbmcgZGlyZWN0b3J5IHRvIHVzZSB3aGVuIGxvY2F0aW5nIGdpdCByb290cy4gRGVmYXVsdHMgdG8gYHByb2Nlc3MuY3dkKClgLlxuICogQHJldHVybnMgTWV0YWRhdGEgZGVzY3JpYmluZyB0aGUgY3JlYXRlZCB3b3JrdHJlZSBhbmQgYmFzZSBjb21taXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVXb3JrdHJlZShicmFuY2hOYW1lOiBzdHJpbmcsIG9wdGlvbnM/OiB7IGN3ZD86IHN0cmluZyB9KTogUHJvbWlzZTxDcmVhdGVXb3JrdHJlZVJlc3VsdD4ge1xuICB2YWxpZGF0ZUJyYW5jaE5hbWUoYnJhbmNoTmFtZSk7XG5cbiAgY29uc3QgeyBzb3VyY2VSb290LCByZXBvUm9vdCB9ID0gYXdhaXQgZmluZEdpdFJvb3RzKG9wdGlvbnM/LmN3ZCA/PyBwcm9jZXNzLmN3ZCgpKTtcbiAgY29uc3Qgc3RhcnRQb2ludCA9IGF3YWl0IHJlc29sdmVIZWFkKHNvdXJjZVJvb3QpO1xuICBjb25zdCB3b3JrdHJlZURpciA9IHBhdGguam9pbihyZXBvUm9vdCwgJy53b3JrdHJlZXMnLCBicmFuY2hOYW1lKTtcblxuICBjb25zdCBbd29ya3RyZWVFeGlzdHMsIGJyYW5jaEV4aXN0c10gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdCwgd29ya3RyZWVEaXIpLFxuICAgIGNoZWNrQnJhbmNoRXhpc3RzKHJlcG9Sb290LCBicmFuY2hOYW1lKVxuICBdKTtcblxuICBpZiAod29ya3RyZWVFeGlzdHMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yOiBXb3JrdHJlZSBhbHJlYWR5IGV4aXN0cyBhdCAke3dvcmt0cmVlRGlyfWApO1xuICB9XG5cbiAgYXdhaXQgYWRkV29ya3RyZWUoeyByZXBvUm9vdCwgd29ya3RyZWVEaXIsIGJyYW5jaE5hbWUsIGJyYW5jaEV4aXN0cywgc3RhcnRQb2ludCB9KTtcblxuICBjb25zdCBpZ25vcmVkID0gYXdhaXQgZGlzY292ZXJJZ25vcmVkUGF0aHMoc291cmNlUm9vdCk7XG4gIGF3YWl0IGNvcHlFeGlzdGluZ1N5bWxpbmtzKHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyKTtcbiAgYXdhaXQgc3ltbGlua0lnbm9yZWRQYXRocyh7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCBpZ25vcmVkIH0pO1xuXG4gIGNvbnN0IHJlcm91dGVkQ291bnQgPSBhd2FpdCByZXJvdXRlQWxsTm9kZU1vZHVsZXMoeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgcmVwb1Jvb3QgfSk7XG5cbiAgY29uc3QgWywgYmFzZVNoYV0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgdXBkYXRlR2l0RXhjbHVkZSh7IHdvcmt0cmVlRGlyLCByZXBvUm9vdCwgZGlyZWN0b3JpZXM6IGlnbm9yZWQuZGlyZWN0b3JpZXMsIGZpbGVzOiBpZ25vcmVkLmZpbGVzIH0pLFxuICAgIHJlc29sdmVIZWFkKHdvcmt0cmVlRGlyKVxuICBdKTtcblxuICBjb25zdCByZXN1bHQ6IENyZWF0ZVdvcmt0cmVlUmVzdWx0ID0ge1xuICAgIGJyYW5jaDogYnJhbmNoTmFtZSxcbiAgICB3b3JrdHJlZTogd29ya3RyZWVEaXIsXG4gICAgYmFzZVNoYVxuICB9O1xuXG4gIGlmIChyZXJvdXRlZENvdW50ID4gMCkge1xuICAgIHJlc3VsdC5yZXJvdXRlZFN5bWxpbmtzID0gcmVyb3V0ZWRDb3VudDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmludGVyZmFjZSBHaXRSb290cyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbn1cblxuLyoqXG4gKiBMb2NhdGVzIHRoZSBjdXJyZW50IGdpdCBzb3VyY2Ugcm9vdCBhbmQgcHJpbWFyeSByZXBvc2l0b3J5IHJvb3QuXG4gKlxuICogU3VwcG9ydHMgYm90aCBzdGFuZGFyZCBjaGVja291dHMgKGAuZ2l0YCBkaXJlY3RvcnkpIGFuZCB3b3JrdHJlZSBjaGVja291dHNcbiAqIChgLmdpdGAgZmlsZSBwb2ludGluZyBpbnRvIGAuZ2l0L3dvcmt0cmVlcy8uLi5gKS5cbiAqXG4gKiBAcGFyYW0gc3RhcnREaXIgLSBEaXJlY3Rvcnkgd2hlcmUgdXB3YXJkIHNlYXJjaCBiZWdpbnMuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiBubyBnaXQgcmVwb3NpdG9yeSBtYXJrZXIgaXMgZm91bmQuXG4gKiBAcmV0dXJucyBQYXRocyBmb3IgdGhlIGN1cnJlbnQgY2hlY2tvdXQgcm9vdCBhbmQgdGhlIHByaW1hcnkgcmVwbyByb290LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEdpdFJvb3RzKHN0YXJ0RGlyOiBzdHJpbmcpOiBQcm9taXNlPEdpdFJvb3RzPiB7XG4gIGxldCBjdXJyZW50RGlyID0gcGF0aC5yZXNvbHZlKHN0YXJ0RGlyKTtcbiAgd2hpbGUgKGN1cnJlbnREaXIgIT09ICcvJykge1xuICAgIGNvbnN0IGdpdFBhdGggPSBwYXRoLmpvaW4oY3VycmVudERpciwgJy5naXQnKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChnaXRQYXRoKTtcbiAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlUm9vdDogY3VycmVudERpcixcbiAgICAgICAgICByZXBvUm9vdDogY3VycmVudERpclxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgIGNvbnN0IGdpdEZpbGVDb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUoZ2l0UGF0aCwgJ3V0Zi04Jyk7XG4gICAgICAgIGNvbnN0IGdpdGRpckxpbmUgPSBnaXRGaWxlQ29udGVudC50cmltKCk7XG4gICAgICAgIGNvbnN0IGdpdGRpclBhdGggPSBnaXRkaXJMaW5lLnJlcGxhY2UoL15naXRkaXI6XFxzKi8sICcnKTtcbiAgICAgICAgY29uc3QgbWFpbkdpdERpciA9IGdpdGRpclBhdGgucmVwbGFjZSgvXFwvd29ya3RyZWVzXFwvW14vXSskLywgJycpO1xuICAgICAgICBjb25zdCByZXBvUm9vdCA9IG1haW5HaXREaXIucmVwbGFjZSgvXFwvXFwuZ2l0JC8sICcnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzb3VyY2VSb290OiBjdXJyZW50RGlyLFxuICAgICAgICAgIHJlcG9Sb290XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gICAgY3VycmVudERpciA9IHBhdGguZGlybmFtZShjdXJyZW50RGlyKTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbiBhIGdpdCByZXBvc2l0b3J5Jyk7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIEhFQUQgY29tbWl0IFNIQSBmb3IgYSByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAqXG4gKiBAcGFyYW0gY3dkIC0gUmVwb3NpdG9yeSBkaXJlY3RvcnkgcGFzc2VkIHRvIGBnaXQgcmV2LXBhcnNlIEhFQURgLlxuICogQHJldHVybnMgVHJpbW1lZCBjb21taXQgU0hBIHN0cmluZy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVIZWFkKGN3ZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsncmV2LXBhcnNlJywgJ0hFQUQnXSwgeyBjd2QsIHRpbWVvdXQ6IDVfMDAwIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHdvcmt0cmVlIHBhdGggaXMgYWxyZWFkeSByZWdpc3RlcmVkIHdpdGggZ2l0LlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gd29ya3RyZWVEaXIgLSBBYnNvbHV0ZSB3b3JrdHJlZSBwYXRoIGJlaW5nIGNyZWF0ZWQuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYGdpdCB3b3JrdHJlZSBsaXN0YCBhbHJlYWR5IGNvbnRhaW5zIGB3b3JrdHJlZURpcmAuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290OiBzdHJpbmcsIHdvcmt0cmVlRGlyOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAnbGlzdCddLCB7IGN3ZDogcmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbiAgcmV0dXJuIHN0ZG91dC5pbmNsdWRlcyh3b3JrdHJlZURpcik7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBicmFuY2ggYWxyZWFkeSBleGlzdHMgaW4gdGhlIHJlcG9zaXRvcnkuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSBicmFuY2hOYW1lIC0gQnJhbmNoIG5hbWUgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYXQgbGVhc3Qgb25lIG1hdGNoaW5nIGxvY2FsIGJyYW5jaCBpcyBsaXN0ZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja0JyYW5jaEV4aXN0cyhyZXBvUm9vdDogc3RyaW5nLCBicmFuY2hOYW1lOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnYnJhbmNoJywgJy0tbGlzdCcsIGJyYW5jaE5hbWVdLCB7XG4gICAgY3dkOiByZXBvUm9vdCxcbiAgICB0aW1lb3V0OiAzMF8wMDBcbiAgfSk7XG4gIHJldHVybiBzdGRvdXQudHJpbSgpLmxlbmd0aCA+IDA7XG59XG5cbmludGVyZmFjZSBBZGRXb3JrdHJlZU9wdGlvbnMge1xuICByZXBvUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICBicmFuY2hOYW1lOiBzdHJpbmc7XG4gIGJyYW5jaEV4aXN0czogYm9vbGVhbjtcbiAgc3RhcnRQb2ludDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEFkZHMgYSBnaXQgd29ya3RyZWUsIGNyZWF0aW5nIHRoZSBicmFuY2ggd2hlbiBuZWVkZWQuXG4gKlxuICogVXNlcyBgZ2l0IHdvcmt0cmVlIGFkZCAtYmAgZm9yIG5ldyBicmFuY2hlcyBhbmQgcGxhaW4gYGdpdCB3b3JrdHJlZSBhZGRgXG4gKiB3aGVuIGF0dGFjaGluZyB0byBhbiBleGlzdGluZyBicmFuY2guXG4gKlxuICogQHBhcmFtIG9wdHMgLSBXb3JrdHJlZSBjcmVhdGlvbiBvcHRpb25zIGFuZCBicmFuY2ggZXhpc3RlbmNlIHN0YXRlLlxuICogQHJldHVybnMgTm8gdmFsdWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRXb3JrdHJlZShvcHRzOiBBZGRXb3JrdHJlZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgYXJncyA9IG9wdHMuYnJhbmNoRXhpc3RzXG4gICAgPyBbJ3dvcmt0cmVlJywgJ2FkZCcsIG9wdHMud29ya3RyZWVEaXIsIG9wdHMuYnJhbmNoTmFtZV1cbiAgICA6IFsnd29ya3RyZWUnLCAnYWRkJywgJy1iJywgb3B0cy5icmFuY2hOYW1lLCBvcHRzLndvcmt0cmVlRGlyLCBvcHRzLnN0YXJ0UG9pbnRdO1xuICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBhcmdzLCB7IGN3ZDogb3B0cy5yZXBvUm9vdCwgdGltZW91dDogMzBfMDAwIH0pO1xufVxuXG5pbnRlcmZhY2UgSWdub3JlZFBhdGhzIHtcbiAgZGlyZWN0b3JpZXM6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogRGlzY292ZXJzIGlnbm9yZWQgZmlsZXMgYW5kIGRpcmVjdG9yaWVzIHVuZGVyIGEgc291cmNlIHJvb3QuXG4gKlxuICogUGF0aHMgYXJlIHJldHVybmVkIHJlbGF0aXZlIHRvIGBzb3VyY2VSb290YCBhbmQgYC53b3JrdHJlZXNgIGNvbnRlbnQgaXNcbiAqIGZpbHRlcmVkIG91dCB0byBhdm9pZCBzZWxmLXJlZmVyZW50aWFsIHN5bWxpbmtpbmcuXG4gKlxuICogQHBhcmFtIHNvdXJjZVJvb3QgLSBTb3VyY2UgY2hlY2tvdXQgcm9vdCB1c2VkIGZvciBnaXQgZGlzY292ZXJ5LlxuICogQHJldHVybnMgU2VwYXJhdGUgbGlzdHMgb2YgaWdub3JlZCBkaXJlY3RvcmllcyBhbmQgaWdub3JlZCBmaWxlcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRpc2NvdmVySWdub3JlZFBhdGhzKHNvdXJjZVJvb3Q6IHN0cmluZyk6IFByb21pc2U8SWdub3JlZFBhdGhzPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKFxuICAgICdnaXQnLFxuICAgIFsnLUMnLCBzb3VyY2VSb290LCAnbHMtZmlsZXMnLCAnLS1pZ25vcmVkJywgJy0tZXhjbHVkZS1zdGFuZGFyZCcsICctLWRpcmVjdG9yeScsICctLW90aGVycyddLFxuICAgIHsgY3dkOiBzb3VyY2VSb290LCB0aW1lb3V0OiAzMF8wMDAgfVxuICApO1xuXG4gIGNvbnN0IGxpbmVzID0gc3Rkb3V0LnNwbGl0KCdcXG4nKS5maWx0ZXIoKGxpbmUpID0+IGxpbmUubGVuZ3RoID4gMCAmJiAhbGluZS5zdGFydHNXaXRoKCcud29ya3RyZWVzJykpO1xuICBjb25zdCBkaXJlY3RvcmllcyA9IGxpbmVzLmZpbHRlcigobCkgPT4gbC5lbmRzV2l0aCgnLycpKS5tYXAoKGwpID0+IGwuc2xpY2UoMCwgLTEpKTtcbiAgY29uc3QgZmlsZXMgPSBsaW5lcy5maWx0ZXIoKGwpID0+ICFsLmVuZHNXaXRoKCcvJykpO1xuXG4gIHJldHVybiB7IGRpcmVjdG9yaWVzLCBmaWxlcyB9O1xufVxuXG5pbnRlcmZhY2UgU3ltbGlua0lnbm9yZWRQYXRoc09wdGlvbnMge1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIHdvcmt0cmVlRGlyOiBzdHJpbmc7XG4gIGlnbm9yZWQ6IElnbm9yZWRQYXRocztcbn1cblxuaW50ZXJmYWNlIFN5bWxpbmtJZ25vcmVkUGF0aHNSZXN1bHQge1xuICBkaXJDb3VudDogbnVtYmVyO1xuICBmaWxlQ291bnQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBTeW1saW5rcyBpZ25vcmVkIGRpcmVjdG9yaWVzIGFuZCBmaWxlcyBmcm9tIHNvdXJjZSBjaGVja291dCBpbnRvIGEgd29ya3RyZWUuXG4gKlxuICogTmVzdGVkIGlnbm9yZWQgZGlyZWN0b3JpZXMgYXJlIGNvbGxhcHNlZCBzbyBvbmx5IHRvcC1sZXZlbCBpZ25vcmVkIGRpcmVjdG9yeVxuICogbGlua3MgYXJlIGNyZWF0ZWQuXG4gKlxuICogQHBhcmFtIG9wdHMgLSBTb3VyY2Ugcm9vdCwgZGVzdGluYXRpb24gd29ya3RyZWUsIGFuZCBpZ25vcmVkIHBhdGggbGlzdHMuXG4gKiBAcmV0dXJucyBDb3VudHMgb2Ygc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQgZGlyZWN0b3J5IGFuZCBmaWxlIHN5bWxpbmtzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3ltbGlua0lnbm9yZWRQYXRocyhvcHRzOiBTeW1saW5rSWdub3JlZFBhdGhzT3B0aW9ucyk6IFByb21pc2U8U3ltbGlua0lnbm9yZWRQYXRoc1Jlc3VsdD4ge1xuICBjb25zdCB7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCBpZ25vcmVkIH0gPSBvcHRzO1xuICBjb25zdCBkaXJTZXQgPSBuZXcgU2V0KGlnbm9yZWQuZGlyZWN0b3JpZXMpO1xuICBjb25zdCBub25OZXN0ZWREaXJzID0gaWdub3JlZC5kaXJlY3Rvcmllcy5maWx0ZXIoKGRpcikgPT4gIWlzTmVzdGVkVW5kZXIoZGlyLCBkaXJTZXQpKTtcblxuICBjb25zdCBjcmVhdGVEaXJTeW1saW5rID0gYXN5bmMgKGRpcjogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgZGlyKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZzLmxzdGF0KHNvdXJjZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gbHN0YXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVzdFBhdGggPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsIGRpcik7XG4gICAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUoZGlyKTtcbiAgICAgIGlmIChwYXJlbnREaXIgIT09ICcuJykge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmpvaW4od29ya3RyZWVEaXIsIHBhcmVudERpciksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VFWElTVCcgfHwgY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gc3ltbGluazogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgY3JlYXRlRmlsZVN5bWxpbmsgPSBhc3luYyAoZmlsZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgZmlsZSk7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIGxzdGF0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBmaWxlKTtcbiAgICAgIGNvbnN0IHBhcmVudERpciA9IHBhdGguZGlybmFtZShmaWxlKTtcbiAgICAgIGlmIChwYXJlbnREaXIgIT09ICcuJykge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmpvaW4od29ya3RyZWVEaXIsIHBhcmVudERpciksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VFWElTVCcgfHwgY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gc3ltbGluazogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgZGlyUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKG5vbk5lc3RlZERpcnMubWFwKGNyZWF0ZURpclN5bWxpbmspKTtcbiAgY29uc3Qgbm9uTmVzdGVkRmlsZXMgPSBpZ25vcmVkLmZpbGVzLmZpbHRlcigoZmlsZSkgPT4gIWlzTmVzdGVkVW5kZXIoZmlsZSwgZGlyU2V0KSk7XG4gIGNvbnN0IGZpbGVSZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwobm9uTmVzdGVkRmlsZXMubWFwKGNyZWF0ZUZpbGVTeW1saW5rKSk7XG5cbiAgY29uc3QgZGlyQ291bnQgPSBkaXJSZXN1bHRzLmZpbHRlcigocikgPT4gcikubGVuZ3RoO1xuICBjb25zdCBmaWxlQ291bnQgPSBmaWxlUmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcblxuICByZXR1cm4geyBkaXJDb3VudCwgZmlsZUNvdW50IH07XG59XG5cbi8qKlxuICogUmVwbGljYXRlcyByb290LWxldmVsIHN5bWxpbmtzIGZyb20gdGhlIHNvdXJjZSBjaGVja291dCBpbnRvIHRoZSB3b3JrdHJlZS5cbiAqXG4gKiBFeGlzdGluZyBkZXN0aW5hdGlvbiBlbnRyaWVzIGFyZSBsZWZ0IHVudG91Y2hlZC5cbiAqXG4gKiBAcGFyYW0gc291cmNlUm9vdCAtIFNvdXJjZSBjaGVja291dCByb290LlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gRGVzdGluYXRpb24gd29ya3RyZWUgcm9vdC5cbiAqIEByZXR1cm5zIE51bWJlciBvZiBzeW1saW5rcyBjcmVhdGVkIGluIHRoZSBkZXN0aW5hdGlvbiByb290LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29weUV4aXN0aW5nU3ltbGlua3Moc291cmNlUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgZW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIoc291cmNlUm9vdCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBjb25zdCBzeW1saW5rcyA9IGVudHJpZXMuZmlsdGVyKChlKSA9PiBlLmlzU3ltYm9saWNMaW5rKCkgJiYgZS5uYW1lICE9PSAnLmdpdCcgJiYgZS5uYW1lICE9PSAnLndvcmt0cmVlcycpO1xuXG4gIGNvbnN0IGNvcHlTeW1saW5rID0gYXN5bmMgKG5hbWU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBuYW1lKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMubHN0YXQoZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIGZhbHNlOyAvLyBEZXN0aW5hdGlvbiBhbHJlYWR5IGV4aXN0c1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZUxpbmtQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIG5hbWUpO1xuXG4gICAgLy8gU2tpcCBzZWxmLXJlZmVyZW5jaW5nIHN5bWxpbmtzICh0YXJnZXQgcmVzb2x2ZXMgYmFjayB0byB0aGUgc3ltbGluayBpdHNlbGYpXG4gICAgY29uc3QgdGFyZ2V0ID0gYXdhaXQgZnMucmVhZGxpbmsoc291cmNlTGlua1BhdGgpO1xuICAgIGNvbnN0IHJlc29sdmVkVGFyZ2V0ID0gcGF0aC5yZXNvbHZlKHNvdXJjZVJvb3QsIHRhcmdldCk7XG4gICAgaWYgKHJlc29sdmVkVGFyZ2V0ID09PSBzb3VyY2VMaW5rUGF0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlTGlua1BhdGgsIGRlc3RQYXRoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICBjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoc3ltbGlua3MubWFwKChlKSA9PiBjb3B5U3ltbGluayhlLm5hbWUpKSk7XG4gIHJldHVybiByZXN1bHRzLmZpbHRlcigocikgPT4gcikubGVuZ3RoO1xufVxuXG5pbnRlcmZhY2UgUmVyb3V0ZU5vZGVNb2R1bGVzT3B0aW9ucyB7XG4gIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmc7XG4gIGRlc3ROb2RlTW9kdWxlczogc3RyaW5nO1xufVxuXG4vKipcbiAqIE1pcnJvcnMgYSBub2RlX21vZHVsZXMgdHJlZSBpbnRvIHRoZSB3b3JrdHJlZSB1c2luZyBzeW1saW5rcy5cbiAqXG4gKiBJbnRlcm5hbCB3b3Jrc3BhY2UgbGlua3Mga2VlcCB0aGVpciBvcmlnaW5hbCByZWxhdGl2ZSB0YXJnZXRzIHdoaWxlIGV4dGVybmFsXG4gKiBsaW5rcyBhbmQgbm9uLWxpbmsgZW50cmllcyBhcmUgcmVwcmVzZW50ZWQgYXMgc3ltbGlua3MgdG8gc291cmNlIHBhdGhzLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIGFuZCBkZXN0aW5hdGlvbiBub2RlX21vZHVsZXMgZGlyZWN0b3JpZXMuXG4gKiBAcmV0dXJucyBDb3VudCBvZiBpbnRlcm5hbCB3b3Jrc3BhY2Ugc3ltbGlua3MgcmVjcmVhdGVkIGJ5IHRhcmdldCBwYXRoLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVyb3V0ZU5vZGVNb2R1bGVzKG9wdHM6IFJlcm91dGVOb2RlTW9kdWxlc09wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCB7IHNvdXJjZU5vZGVNb2R1bGVzLCBkZXN0Tm9kZU1vZHVsZXMgfSA9IG9wdHM7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VOb2RlTW9kdWxlcyk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IGRlc3RTdGF0cyA9IGF3YWl0IGZzLmxzdGF0KGRlc3ROb2RlTW9kdWxlcyk7XG4gICAgaWYgKGRlc3RTdGF0cy5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICBhd2FpdCBmcy51bmxpbmsoZGVzdE5vZGVNb2R1bGVzKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBmcy5ta2RpcihkZXN0Tm9kZU1vZHVsZXMsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZU5vZGVNb2R1bGVzLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gIGNvbnN0IGNvdW50cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVudHJpZXMubWFwKGFzeW5jIChlbnRyeSk6IFByb21pc2U8bnVtYmVyPiA9PiB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZU5vZGVNb2R1bGVzLCBlbnRyeS5uYW1lKTtcbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKGRlc3ROb2RlTW9kdWxlcywgZW50cnkubmFtZSk7XG5cbiAgICAgIGlmIChlbnRyeS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IGZzLnJlYWRsaW5rKHNvdXJjZVBhdGgpO1xuICAgICAgICBpZiAoaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0KSkge1xuICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsodGFyZ2V0LCBkZXN0UGF0aCk7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSAmJiBlbnRyeS5uYW1lLnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihkZXN0UGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgIGNvbnN0IHNjb3BlRW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIoc291cmNlUGF0aCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBzY29wZUNvdW50cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgIHNjb3BlRW50cmllcy5tYXAoYXN5bmMgKHNjb3BlRW50cnkpOiBQcm9taXNlPG51bWJlcj4gPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2NvcGVTb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVBhdGgsIHNjb3BlRW50cnkubmFtZSk7XG4gICAgICAgICAgICBjb25zdCBzY29wZURlc3RQYXRoID0gcGF0aC5qb2luKGRlc3RQYXRoLCBzY29wZUVudHJ5Lm5hbWUpO1xuXG4gICAgICAgICAgICBpZiAoc2NvcGVFbnRyeS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IGZzLnJlYWRsaW5rKHNjb3BlU291cmNlUGF0aCk7XG4gICAgICAgICAgICAgIGlmIChpc0ludGVybmFsU3ltbGluayh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgZnMuc3ltbGluayh0YXJnZXQsIHNjb3BlRGVzdFBhdGgpO1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc2NvcGVTb3VyY2VQYXRoLCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYXdhaXQgZnMuc3ltbGluayhzY29wZVNvdXJjZVBhdGgsIHNjb3BlRGVzdFBhdGgpO1xuICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gc2NvcGVDb3VudHMucmVkdWNlKChzdW0sIGMpID0+IHN1bSArIGMsIDApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfVxuICAgIH0pXG4gICk7XG5cbiAgcmV0dXJuIGNvdW50cy5yZWR1Y2UoKHN1bSwgYykgPT4gc3VtICsgYywgMCk7XG59XG5cbmludGVyZmFjZSBSZXJvdXRlQWxsTm9kZU1vZHVsZXNPcHRpb25zIHtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICByZXBvUm9vdDogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJlcm91dGVzIHJvb3QgYW5kIHBlci1wYWNrYWdlIG5vZGVfbW9kdWxlcyBkaXJlY3RvcmllcyBpbnRvIHRoZSB3b3JrdHJlZS5cbiAqXG4gKiBUaGUgb3BlcmF0aW9uIGlzIHNraXBwZWQgd2hlbiB0aGUgcmVwb3NpdG9yeSBoYXMgbm8gd29ya3NwYWNlIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogQHBhcmFtIG9wdHMgLSBTb3VyY2Ugcm9vdCwgZGVzdGluYXRpb24gd29ya3RyZWUgcm9vdCwgYW5kIHJlcG8gcm9vdC5cbiAqIEByZXR1cm5zIFRvdGFsIG51bWJlciBvZiByZWNyZWF0ZWQgaW50ZXJuYWwgd29ya3NwYWNlIHN5bWxpbmtzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVyb3V0ZUFsbE5vZGVNb2R1bGVzKG9wdHM6IFJlcm91dGVBbGxOb2RlTW9kdWxlc09wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCB7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCByZXBvUm9vdCB9ID0gb3B0cztcblxuICBsZXQgcGFja2FnZUpzb246IHsgd29ya3NwYWNlcz86IHN0cmluZ1tdIH07XG4gIHRyeSB7XG4gICAgY29uc3QgcGFja2FnZUpzb25Db250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUocGF0aC5qb2luKHJlcG9Sb290LCAncGFja2FnZS5qc29uJyksICd1dGYtOCcpO1xuICAgIHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvbkNvbnRlbnQpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgaWYgKCFwYWNrYWdlSnNvbi53b3Jrc3BhY2VzKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBsZXQgdG90YWxDb3VudCA9IDA7XG5cbiAgdG90YWxDb3VudCArPSBhd2FpdCByZXJvdXRlTm9kZU1vZHVsZXMoe1xuICAgIHNvdXJjZU5vZGVNb2R1bGVzOiBwYXRoLmpvaW4oc291cmNlUm9vdCwgJ25vZGVfbW9kdWxlcycpLFxuICAgIGRlc3ROb2RlTW9kdWxlczogcGF0aC5qb2luKHdvcmt0cmVlRGlyLCAnbm9kZV9tb2R1bGVzJylcbiAgfSk7XG5cbiAgY29uc3QgcGFja2FnZXNEaXIgPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgJ3BhY2thZ2VzJyk7XG4gIHRyeSB7XG4gICAgY29uc3QgcGFja2FnZUVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHBhY2thZ2VzRGlyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBwYWNrYWdlRW50cmllcykge1xuICAgICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgY29uc3QgcGtnTm9kZU1vZHVsZXMgPSBwYXRoLmpvaW4ocGFja2FnZXNEaXIsIGVudHJ5Lm5hbWUsICdub2RlX21vZHVsZXMnKTtcbiAgICAgICAgbGV0IG5vZGVNb2R1bGVzRXhpc3RzID0gZmFsc2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgZnMubHN0YXQocGtnTm9kZU1vZHVsZXMpO1xuICAgICAgICAgIG5vZGVNb2R1bGVzRXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZU1vZHVsZXNFeGlzdHMpIHtcbiAgICAgICAgICBjb25zdCBkZXN0UGFja2FnZURpciA9IHBhdGguam9pbih3b3JrdHJlZURpciwgJ3BhY2thZ2VzJywgZW50cnkubmFtZSk7XG4gICAgICAgICAgYXdhaXQgZnMubWtkaXIoZGVzdFBhY2thZ2VEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgIHRvdGFsQ291bnQgKz0gYXdhaXQgcmVyb3V0ZU5vZGVNb2R1bGVzKHtcbiAgICAgICAgICAgIHNvdXJjZU5vZGVNb2R1bGVzOiBwa2dOb2RlTW9kdWxlcyxcbiAgICAgICAgICAgIGRlc3ROb2RlTW9kdWxlczogcGF0aC5qb2luKGRlc3RQYWNrYWdlRGlyLCAnbm9kZV9tb2R1bGVzJylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0b3RhbENvdW50O1xufVxuXG5pbnRlcmZhY2UgVXBkYXRlR2l0RXhjbHVkZU9wdGlvbnMge1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICByZXBvUm9vdDogc3RyaW5nO1xuICBkaXJlY3Rvcmllczogc3RyaW5nW107XG4gIGZpbGVzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBBcHBlbmRzIHN5bWxpbmtlZCBpZ25vcmVkIHBhdGhzIHRvIHRoZSB3b3JrdHJlZS1zcGVjaWZpYyBnaXQgZXhjbHVkZSBmaWxlLlxuICpcbiAqIEFsc28gZW5hYmxlcyBgZXh0ZW5zaW9ucy53b3JrdHJlZUNvbmZpZ2AgYW5kIHNldHMgd29ya3RyZWUtbG9jYWxcbiAqIGBjb3JlLmV4Y2x1ZGVzRmlsZWAgc28gZ2l0IHN0YXR1cyBpbiB0aGUgd29ya3RyZWUgaWdub3JlcyBpbmplY3RlZCBsaW5rcy5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFdvcmt0cmVlIHBhdGgsIHJlcG8gcm9vdCwgYW5kIGlnbm9yZWQgcGF0aCBjYW5kaWRhdGVzLlxuICogQHJldHVybnMgTm8gdmFsdWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVHaXRFeGNsdWRlKG9wdHM6IFVwZGF0ZUdpdEV4Y2x1ZGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHsgd29ya3RyZWVEaXIsIHJlcG9Sb290LCBkaXJlY3RvcmllcywgZmlsZXMgfSA9IG9wdHM7XG5cbiAgY29uc3QgeyBzdGRvdXQ6IGdpdERpciB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyctQycsIHdvcmt0cmVlRGlyLCAncmV2LXBhcnNlJywgJy0tZ2l0LWRpciddLCB7XG4gICAgdGltZW91dDogNV8wMDBcbiAgfSk7XG4gIGNvbnN0IGV4Y2x1ZGVQYXRoID0gcGF0aC5qb2luKGdpdERpci50cmltKCksICdpbmZvJywgJ2V4Y2x1ZGUnKTtcbiAgYXdhaXQgZnMubWtkaXIocGF0aC5kaXJuYW1lKGV4Y2x1ZGVQYXRoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cbiAgY29uc3QgbGluZXMgPSBbJyMgU3ltbGlua3MgY3JlYXRlZCBieSBpbnN0YW50LXdvcmt0cmVlJ107XG5cbiAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0b3JpZXMpIHtcbiAgICBpZiAoIWRpcikgY29udGludWU7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMubHN0YXQocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBkaXIpKTtcbiAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSBsaW5lcy5wdXNoKGRpcik7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICBpZiAoIWZpbGUpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLmxzdGF0KHBhdGguam9pbih3b3JrdHJlZURpciwgZmlsZSkpO1xuICAgICAgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIGxpbmVzLnB1c2goZmlsZSk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhd2FpdCBmcy5hcHBlbmRGaWxlKGV4Y2x1ZGVQYXRoLCBgJHtsaW5lcy5qb2luKCdcXG4nKX1cXG5gKTtcblxuICB0cnkge1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCByZXBvUm9vdCwgJ2NvbmZpZycsICdleHRlbnNpb25zLndvcmt0cmVlQ29uZmlnJywgJ3RydWUnXSwgeyB0aW1lb3V0OiA1XzAwMCB9KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgIGBjcmVhdGUtd29ya3RyZWU6IGZhaWxlZCB0byBzZXQgd29ya3RyZWVDb25maWcgZXh0ZW5zaW9uOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyctQycsIHdvcmt0cmVlRGlyLCAnY29uZmlnJywgJy0td29ya3RyZWUnLCAnY29yZS5leGNsdWRlc0ZpbGUnLCBleGNsdWRlUGF0aF0sIHtcbiAgICAgIHRpbWVvdXQ6IDVfMDAwXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICBgY3JlYXRlLXdvcmt0cmVlOiBmYWlsZWQgdG8gc2V0IGNvcmUuZXhjbHVkZXNGaWxlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgKTtcbiAgfVxufVxuIiwgIlxuaW1wb3J0IGhhbmRsZXIgZnJvbSAnLi9pbnRlcnZpZXcudHMnO1xuaW1wb3J0IHsgZXhlY3V0ZUNvbW1hbmQgfSBmcm9tICcuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9ydW50aW1lLnRzJztcblxuZXhlY3V0ZUNvbW1hbmQoaGFuZGxlcik7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQWdCQSxTQUE0QixhQUFhO0FBQ3pDLFNBQVMsa0JBQWtCOzs7QUNhcEIsSUFBTSxXQUFOLGNBQXVCLE1BQU07QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBUWxDLFlBQ0UsU0FDZ0IsTUFDQSxRQUNoQjtBQUNBLFVBQU0sT0FBTztBQUhHO0FBQ0E7QUFHaEIsU0FBSyxPQUFPO0FBQUEsRUFDZDtBQUNGO0FBbUJPLElBQU0sZUFBTixjQUEyQixNQUFNO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPdEMsWUFDRSxTQUNnQixPQUNoQjtBQUNBLFVBQU0sT0FBTztBQUZHO0FBR2hCLFNBQUssT0FBTztBQUFBLEVBQ2Q7QUFDRjs7O0FDaERBLElBQU0scUJBQXFCO0FBRzNCLElBQU0saUJBQWlCO0FBd0JoQixJQUFNLGNBQU4sTUFBa0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVl2QixZQUNtQixTQUNqQixZQUNBO0FBRmlCO0FBR2pCLFNBQUssY0FBYztBQUFBLEVBQ3JCO0FBQUEsRUFoQmlCO0FBQUE7QUFBQSxFQUdULG9CQUFvQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQW9CNUIsYUFBcUI7QUFDbkIsV0FBTyxLQUFLLFFBQVE7QUFBQSxFQUN0QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBUUEsZ0JBQXlCO0FBQ3ZCLFdBQU8sS0FBSyxnQkFBZ0I7QUFBQSxFQUM5QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFRUSxpQkFBaUIsZ0JBQWtEO0FBQ3pFLFFBQUksZUFBZ0IsUUFBTztBQUMzQixXQUFPLFlBQVksUUFBUSxLQUFLLGlCQUFpQjtBQUFBLEVBQ25EO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLUSxtQkFBeUI7QUFDL0IsU0FBSyxvQkFBb0I7QUFBQSxFQUMzQjtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS1EsbUJBQXlCO0FBQy9CLFNBQUssb0JBQW9CLEtBQUssSUFBSSxLQUFLLG9CQUFvQixHQUFHLGNBQWM7QUFBQSxFQUM5RTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBUVEsb0JBQWdDO0FBQUEsSUFDdEMsS0FBSyxPQUFVLEtBQWEsWUFBc0M7QUFDaEUsWUFBTSxXQUFXLE1BQU0sTUFBTSxLQUFLO0FBQUEsUUFDaEMsR0FBRztBQUFBLFFBQ0gsU0FBUyxFQUFFLEdBQUcsS0FBSyxXQUFXLEdBQUcsR0FBRyxTQUFTLFFBQVE7QUFBQSxRQUNyRCxRQUFRLEtBQUssaUJBQWlCLFNBQVMsTUFBTTtBQUFBLE1BQy9DLENBQUM7QUFDRCxVQUFJLENBQUMsU0FBUyxHQUFJLE9BQU07QUFDeEIsYUFBTyxTQUFTLEtBQUs7QUFBQSxJQUN2QjtBQUFBLElBQ0EsTUFBTSxPQUFVLEtBQWEsTUFBZSxZQUFzQztBQUNoRixZQUFNLFdBQVcsTUFBTSxNQUFNLEtBQUs7QUFBQSxRQUNoQyxHQUFHO0FBQUEsUUFDSCxRQUFRO0FBQUEsUUFDUixTQUFTLEVBQUUsR0FBRyxLQUFLLFdBQVcsR0FBRyxHQUFHLFNBQVMsUUFBUTtBQUFBLFFBQ3JELE1BQU0sT0FBTyxLQUFLLFVBQVUsSUFBSSxJQUFJO0FBQUEsUUFDcEMsUUFBUSxLQUFLLGlCQUFpQixTQUFTLE1BQU07QUFBQSxNQUMvQyxDQUFDO0FBQ0QsVUFBSSxDQUFDLFNBQVMsR0FBSSxPQUFNO0FBQ3hCLGFBQU8sU0FBUyxLQUFLO0FBQUEsSUFDdkI7QUFBQSxJQUNBLEtBQUssT0FBVSxLQUFhLE1BQWUsWUFBc0M7QUFDL0UsWUFBTSxXQUFXLE1BQU0sTUFBTSxLQUFLO0FBQUEsUUFDaEMsR0FBRztBQUFBLFFBQ0gsUUFBUTtBQUFBLFFBQ1IsU0FBUyxFQUFFLEdBQUcsS0FBSyxXQUFXLEdBQUcsR0FBRyxTQUFTLFFBQVE7QUFBQSxRQUNyRCxNQUFNLE9BQU8sS0FBSyxVQUFVLElBQUksSUFBSTtBQUFBLFFBQ3BDLFFBQVEsS0FBSyxpQkFBaUIsU0FBUyxNQUFNO0FBQUEsTUFDL0MsQ0FBQztBQUNELFVBQUksQ0FBQyxTQUFTLEdBQUksT0FBTTtBQUN4QixhQUFPLFNBQVMsS0FBSztBQUFBLElBQ3ZCO0FBQUEsSUFDQSxPQUFPLE9BQVUsS0FBYSxNQUFlLFlBQXNDO0FBQ2pGLFlBQU0sV0FBVyxNQUFNLE1BQU0sS0FBSztBQUFBLFFBQ2hDLEdBQUc7QUFBQSxRQUNILFFBQVE7QUFBQSxRQUNSLFNBQVMsRUFBRSxHQUFHLEtBQUssV0FBVyxHQUFHLEdBQUcsU0FBUyxRQUFRO0FBQUEsUUFDckQsTUFBTSxPQUFPLEtBQUssVUFBVSxJQUFJLElBQUk7QUFBQSxRQUNwQyxRQUFRLEtBQUssaUJBQWlCLFNBQVMsTUFBTTtBQUFBLE1BQy9DLENBQUM7QUFDRCxVQUFJLENBQUMsU0FBUyxHQUFJLE9BQU07QUFDeEIsYUFBTyxTQUFTLEtBQUs7QUFBQSxJQUN2QjtBQUFBLElBQ0EsUUFBUSxPQUFPLEtBQWEsWUFBeUM7QUFDbkUsWUFBTSxXQUFXLE1BQU0sTUFBTSxLQUFLO0FBQUEsUUFDaEMsR0FBRztBQUFBLFFBQ0gsUUFBUTtBQUFBLFFBQ1IsU0FBUyxFQUFFLEdBQUcsS0FBSyxXQUFXLEdBQUcsR0FBRyxTQUFTLFFBQVE7QUFBQSxRQUNyRCxRQUFRLEtBQUssaUJBQWlCLFNBQVMsTUFBTTtBQUFBLE1BQy9DLENBQUM7QUFDRCxVQUFJLENBQUMsU0FBUyxHQUFJLE9BQU07QUFBQSxJQUMxQjtBQUFBLEVBQ0Y7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPUSxhQUEwQjtBQUNoQyxVQUFNLFVBQXVCLEVBQUUsZ0JBQWdCLG1CQUFtQjtBQUNsRSxRQUFJLEtBQUssUUFBUSxhQUFhO0FBQzVCLGNBQVEsZUFBZSxJQUFJLFVBQVUsS0FBSyxRQUFRLFdBQVc7QUFBQSxJQUMvRDtBQUNBLFdBQU87QUFBQSxFQUNUO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT1EsZ0JBQTRCO0FBQ2xDLFdBQU8sS0FBSyxlQUFlLEtBQUs7QUFBQSxFQUNsQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBV1EsU0FBU0EsT0FBYyxRQUEwQztBQUN2RSxVQUFNLE1BQU0sSUFBSSxJQUFJQSxPQUFNLEtBQUssUUFBUSxPQUFPO0FBQzlDLFFBQUksUUFBUTtBQUNWLGlCQUFXLENBQUMsS0FBSyxLQUFLLEtBQUssT0FBTyxRQUFRLE1BQU0sR0FBRztBQUNqRCxZQUFJLFVBQVUsVUFBYSxVQUFVLE1BQU07QUFDekMsY0FBSSxhQUFhLElBQUksS0FBSyxPQUFPLEtBQUssQ0FBQztBQUFBLFFBQ3pDO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFDQSxXQUFPLElBQUksU0FBUztBQUFBLEVBQ3RCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVUEsTUFBYyxRQUFXLElBQWtDO0FBQ3pELFFBQUk7QUFDRixZQUFNLFNBQVMsTUFBTSxHQUFHO0FBQ3hCLFdBQUssaUJBQWlCO0FBQ3RCLGFBQU87QUFBQSxJQUNULFNBQVMsT0FBTztBQUNkLFVBQUksaUJBQWlCLFVBQVU7QUFFN0IsYUFBSyxpQkFBaUI7QUFDdEIsWUFBSSxPQUFnQyxDQUFDO0FBQ3JDLFlBQUk7QUFDRixpQkFBTyxNQUFNLE1BQU0sS0FBSztBQUFBLFFBQzFCLFNBQVMsWUFBWTtBQUVuQixjQUFJLEVBQUUsc0JBQXNCLGNBQWM7QUFDeEMsb0JBQVEsS0FBSywwREFBMEQsVUFBVTtBQUFBLFVBQ25GO0FBQUEsUUFDRjtBQUNBLGNBQU0sVUFDSCxLQUFLLE9BQU8sS0FBNkIsS0FBSyxTQUFTLEtBQTRCLE1BQU07QUFDNUYsY0FBTSxPQUFRLEtBQUssTUFBTSxLQUE0QixPQUFPLE1BQU0sTUFBTTtBQUN4RSxjQUFNLFNBQVMsS0FBSyxRQUFRO0FBQzVCLGNBQU0sSUFBSSxTQUFTLFNBQVMsTUFBTSxNQUFNO0FBQUEsTUFDMUM7QUFFQSxXQUFLLGlCQUFpQjtBQUN0QixVQUFJLGlCQUFpQixnQkFBZ0IsTUFBTSxTQUFTLGdCQUFnQjtBQUNsRSxjQUFNLElBQUksYUFBYSxxQkFBcUIsS0FBSztBQUFBLE1BQ25EO0FBQ0EsWUFBTSxJQUFJLGFBQWEsa0JBQWtCLGlCQUFpQixRQUFRLFFBQVEsTUFBUztBQUFBLElBQ3JGO0FBQUEsRUFDRjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWUEsTUFBTSxVQUFVLFNBQTZDO0FBQzNELFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVTtBQUFBLE1BQ2xDLGVBQWUsS0FBSyxRQUFRO0FBQUEsTUFDNUIsUUFBUSxTQUFTO0FBQUEsTUFDakIsS0FBSyxTQUFTO0FBQUEsTUFDZCxRQUFRLFNBQVM7QUFBQSxNQUNqQixPQUFPLFNBQVM7QUFBQSxNQUNoQixRQUFRLFNBQVM7QUFBQSxJQUNuQixDQUFDO0FBQ0QsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxJQUFZLEdBQUcsQ0FBQztBQUFBLEVBQ2pFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVUEsTUFBTSxRQUFRLFFBQStCO0FBQzNDLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLEVBQUU7QUFDNUMsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxJQUFVLEdBQUcsQ0FBQztBQUFBLEVBQy9EO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVUEsTUFBTSxXQUFXLE1BQXFDO0FBQ3BELFVBQU0sTUFBTSxLQUFLLFNBQVMsUUFBUTtBQUNsQyxVQUFNLE9BQU87QUFBQSxNQUNYLEdBQUc7QUFBQSxNQUNILGVBQWUsS0FBSyxRQUFRO0FBQUEsSUFDOUI7QUFDQSxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLEtBQVcsS0FBSyxJQUFJLENBQUM7QUFBQSxFQUN0RTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZQSxNQUFNLFdBQVcsUUFBZ0IsTUFBcUM7QUFDcEUsVUFBTSxNQUFNLEtBQUssU0FBUyxVQUFVLE1BQU0sRUFBRTtBQUM1QyxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLE1BQVksS0FBSyxJQUFJLENBQUM7QUFBQSxFQUN2RTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBV0EsTUFBTSxXQUFXLFFBQStCO0FBQzlDLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLEVBQUU7QUFDNUMsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxPQUFPLEdBQUcsQ0FBQztBQUFBLEVBQzVEO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZQSxNQUFNLFlBQVksUUFBb0M7QUFDcEQsVUFBTSxNQUFNLEtBQUssU0FBUyxVQUFVLE1BQU0sV0FBVztBQUNyRCxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLElBQWUsR0FBRyxDQUFDO0FBQUEsRUFDcEU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVdBLE1BQU0sV0FBVyxRQUFnQixXQUFxQztBQUNwRSxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxhQUFhLFNBQVMsRUFBRTtBQUNsRSxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLElBQWEsR0FBRyxDQUFDO0FBQUEsRUFDbEU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWUEsTUFBTSxjQUFjLFFBQWdCLE1BQTJDO0FBQzdFLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLFdBQVc7QUFDckQsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxLQUFjLEtBQUssSUFBSSxDQUFDO0FBQUEsRUFDekU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFhQSxNQUFNLGNBQWMsUUFBZ0IsV0FBbUIsTUFBMkM7QUFDaEcsVUFBTSxNQUFNLEtBQUssU0FBUyxVQUFVLE1BQU0sYUFBYSxTQUFTLEVBQUU7QUFDbEUsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxNQUFlLEtBQUssSUFBSSxDQUFDO0FBQUEsRUFDMUU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWUEsTUFBTSxjQUFjLFFBQWdCLFdBQWtDO0FBQ3BFLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLGFBQWEsU0FBUyxFQUFFO0FBQ2xFLFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsT0FBTyxHQUFHLENBQUM7QUFBQSxFQUM1RDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWlCQSxNQUFNLGlCQUFpQixRQUFnQixNQUFjLE1BQWdFO0FBQ25ILFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLGdCQUFnQixtQkFBbUIsSUFBSSxDQUFDLEVBQUU7QUFHcEYsUUFBSTtBQUNKLFFBQUksZ0JBQWdCLE1BQU07QUFDeEIsYUFBTztBQUFBLElBQ1QsV0FBVyxnQkFBZ0IsYUFBYTtBQUN0QyxhQUFPLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQztBQUFBLElBQ3hCLE9BQU87QUFFTCxZQUFNLGVBQWUsS0FBSyxJQUFJO0FBQzlCLFlBQU0sUUFBUSxJQUFJLFdBQVcsYUFBYSxNQUFNO0FBQ2hELGVBQVMsSUFBSSxHQUFHLElBQUksYUFBYSxRQUFRLEtBQUs7QUFDNUMsY0FBTSxDQUFDLElBQUksYUFBYSxXQUFXLENBQUM7QUFBQSxNQUN0QztBQUNBLGFBQU8sSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDO0FBQUEsSUFDekI7QUFFQSxXQUFPLEtBQUssUUFBUSxZQUFZO0FBQzlCLFlBQU0sV0FBVyxNQUFNLE1BQU0sS0FBSztBQUFBLFFBQ2hDLFFBQVE7QUFBQSxRQUNSLFNBQVM7QUFBQSxVQUNQLEdBQUcsS0FBSyxXQUFXO0FBQUEsVUFDbkIsZ0JBQWdCO0FBQUEsUUFDbEI7QUFBQSxRQUNBO0FBQUEsUUFDQSxRQUFRLEtBQUssaUJBQWlCO0FBQUEsTUFDaEMsQ0FBQztBQUNELFVBQUksQ0FBQyxTQUFTLEdBQUksT0FBTTtBQUN4QixhQUFPLFNBQVMsS0FBSztBQUFBLElBQ3ZCLENBQUM7QUFBQSxFQUNIO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBYUEsTUFBTSxjQUFjLFFBQWdCLGNBQXFDO0FBQ3ZFLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLGdCQUFnQixZQUFZLEVBQUU7QUFDeEUsV0FBTyxLQUFLLFFBQVEsWUFBWTtBQUM5QixZQUFNLFdBQVcsTUFBTSxNQUFNLEtBQUs7QUFBQSxRQUNoQyxTQUFTLEtBQUssV0FBVztBQUFBLFFBQ3pCLFFBQVEsS0FBSyxpQkFBaUI7QUFBQSxNQUNoQyxDQUFDO0FBQ0QsVUFBSSxDQUFDLFNBQVMsR0FBSSxPQUFNO0FBQ3hCLGFBQU8sU0FBUyxLQUFLO0FBQUEsSUFDdkIsQ0FBQztBQUFBLEVBQ0g7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFVQSxNQUFNLGdCQUFnQixRQUErQztBQUNuRSxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxjQUFjO0FBQ3hELFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsSUFBMEIsR0FBRyxDQUFDO0FBQUEsRUFDL0U7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBYUEsTUFBTSxZQUFZLFFBQWdCLFNBQW9EO0FBQ3BGLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLGFBQWE7QUFBQSxNQUNyRCxRQUFRLFNBQVM7QUFBQSxNQUNqQixPQUFPLFNBQVM7QUFBQSxJQUNsQixDQUFDO0FBQ0QsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxJQUFvQixHQUFHLENBQUM7QUFBQSxFQUN6RTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWUEsTUFBTSxRQUFRLFFBQWlDO0FBQzdDLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLE9BQU87QUFDakQsVUFBTSxXQUFXLE1BQU0sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsSUFBeUIsR0FBRyxDQUFDO0FBQzVGLFdBQU8sU0FBUztBQUFBLEVBQ2xCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVlBLE1BQU0sV0FBVyxRQUFnQixTQUFnQztBQUMvRCxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxPQUFPO0FBQ2pELFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsSUFBVSxLQUFLLE9BQU8sQ0FBQztBQUFBLEVBQ3hFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBY0EsTUFBTSxZQUFZLFFBQWdCLFVBQTREO0FBQzVGLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLFVBQVUsUUFBUSxVQUFVO0FBQ3RFLFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsS0FBMkIsS0FBSyxNQUFTLENBQUM7QUFBQSxFQUMzRjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWUEsTUFBTSxXQUFXLFFBQXVDO0FBQ3RELFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLFVBQVU7QUFDcEQsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxJQUFrQixHQUFHLENBQUM7QUFBQSxFQUN2RTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBV0EsTUFBTSxVQUFVLFFBQWdCLEtBQWtDO0FBQ2hFLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLFVBQVU7QUFDcEQsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxLQUFpQixLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFBQSxFQUMvRTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBV0EsTUFBTSxhQUFhLFFBQWdCLEtBQTRCO0FBQzdELFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLFlBQVksR0FBRyxFQUFFO0FBQzNELFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsT0FBTyxHQUFHLENBQUM7QUFBQSxFQUM1RDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWUEsTUFBTSxZQUFZLFFBQWdCLFNBQWlFO0FBQ2pHLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLGFBQWE7QUFBQSxNQUNyRCxlQUFlLFNBQVM7QUFBQSxJQUMxQixDQUFDO0FBQ0QsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxJQUFzQixHQUFHLENBQUM7QUFBQSxFQUMzRTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFTQSxNQUFNLFVBQVUsUUFBZ0IsTUFBdUM7QUFDckUsVUFBTSxNQUFNLEtBQUssU0FBUyxVQUFVLE1BQU0sV0FBVztBQUNyRCxVQUFNLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLEtBQWMsS0FBSyxJQUFJLENBQUM7QUFBQSxFQUN4RTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFTQSxNQUFNLGFBQWEsUUFBZ0IsTUFBNkI7QUFDOUQsVUFBTSxNQUFNLEtBQUssU0FBUyxVQUFVLE1BQU0sYUFBYSxtQkFBbUIsSUFBSSxDQUFDLEVBQUU7QUFDakYsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxPQUFPLEdBQUcsQ0FBQztBQUFBLEVBQzVEO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBV0EsTUFBTSxVQUE2QjtBQUNqQyxVQUFNLE1BQU0sS0FBSyxTQUFTLFNBQVM7QUFBQSxNQUNqQyxlQUFlLEtBQUssUUFBUTtBQUFBLElBQzlCLENBQUM7QUFDRCxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLElBQWMsR0FBRyxDQUFDO0FBQUEsRUFDbkU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFXQSxNQUFNLGtCQUEwRTtBQUM5RSxVQUFNLE1BQU0sS0FBSyxTQUFTLGVBQWU7QUFDekMsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxJQUFtRCxHQUFHLENBQUM7QUFBQSxFQUN4RztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWNBLE1BQU0saUJBQWlCLFFBQWdCLFVBQWtCLE1BQThDO0FBQ3JHLFVBQU0sV0FBVyxHQUFHLFFBQVEsSUFBSSxLQUFLLElBQUksQ0FBQztBQUMxQyxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSw2QkFBNkIsbUJBQW1CLFFBQVEsQ0FBQyxFQUFFO0FBQ3JHLFVBQU0sT0FBTyxFQUFFLFFBQVEsVUFBVSxLQUFLO0FBQ3RDLFVBQU0sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsSUFBYSxLQUFLLElBQUksQ0FBQztBQUFBLEVBQ3ZFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFlQSxNQUFNLGVBQWUsUUFBOEM7QUFDakUsVUFBTSxNQUFNLEtBQUssU0FBUyxVQUFVLE1BQU0sU0FBUztBQUNuRCxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLElBQXlCLEdBQUcsQ0FBQztBQUFBLEVBQzlFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZQSxNQUFNLFlBQVksUUFBdUM7QUFDdkQsVUFBTSxNQUFNLEtBQUssU0FBUyxVQUFVLE1BQU0sVUFBVTtBQUNwRCxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLElBQWtCLEdBQUcsQ0FBQztBQUFBLEVBQ3ZFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBZ0JBLE1BQU0sVUFDSixRQUNBLFlBQ0EsVUFDZ0Q7QUFDaEQsVUFBTSxNQUFNLEtBQUs7QUFBQSxNQUNmLFVBQVUsTUFBTSxZQUFZLG1CQUFtQixVQUFVLENBQUMsSUFBSSxtQkFBbUIsUUFBUSxDQUFDO0FBQUEsSUFDNUY7QUFDQSxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLElBQTJDLEdBQUcsQ0FBQztBQUFBLEVBQ2hHO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUF1QkEsV0FBVyxRQUFnQixZQUFvQixVQUFrQixTQUE2QztBQUM1RyxVQUFNLFVBQVUsSUFBSSxZQUFZO0FBQ2hDLFFBQUk7QUFFSixVQUFNLE9BQU8sSUFBSSxlQUEyQjtBQUFBLE1BQzFDLE1BQU0sR0FBRztBQUNQLHFCQUFhO0FBQUEsTUFDZjtBQUFBLElBQ0YsQ0FBQztBQUVELFVBQU0sTUFBTSxLQUFLO0FBQUEsTUFDZixVQUFVLE1BQU0sWUFBWSxtQkFBbUIsVUFBVSxDQUFDLElBQUksbUJBQW1CLFFBQVEsQ0FBQztBQUFBLElBQzVGO0FBRUEsVUFBTSxVQUFrQztBQUFBLE1BQ3RDLGdCQUFnQjtBQUFBLElBQ2xCO0FBQ0EsUUFBSSxLQUFLLFFBQVEsYUFBYTtBQUM1QixjQUFRLGVBQWUsSUFBSSxVQUFVLEtBQUssUUFBUSxXQUFXO0FBQUEsSUFDL0Q7QUFDQSxRQUFJLFNBQVMsT0FBTztBQUNsQixjQUFRLGdCQUFnQixJQUFJLFFBQVE7QUFBQSxJQUN0QztBQUNBLFFBQUksU0FBUyxXQUFXO0FBQ3RCLGNBQVEscUJBQXFCLElBQUksUUFBUTtBQUFBLElBQzNDO0FBSUEsVUFBTSxlQUFpRDtBQUFBLE1BQ3JELFFBQVE7QUFBQSxNQUNSO0FBQUEsTUFDQTtBQUFBLE1BQ0EsUUFBUTtBQUFBLElBQ1Y7QUFFQSxVQUFNLGtCQUFrQixNQUFNLEtBQUssWUFBWTtBQUUvQyxXQUFPO0FBQUEsTUFDTCxNQUFNLE1BQW9CO0FBQ3hCLG1CQUFXLFFBQVEsUUFBUSxPQUFPLEdBQUcsSUFBSTtBQUFBLENBQUksQ0FBQztBQUFBLE1BQ2hEO0FBQUEsTUFDQSxPQUFPLFlBQW1DO0FBQ3hDLG1CQUFXLE1BQU07QUFDakIsZUFBTyxLQUFLLFFBQVEsWUFBWTtBQUM5QixnQkFBTSxXQUFXLE1BQU07QUFDdkIsY0FBSSxDQUFDLFNBQVMsR0FBSSxPQUFNO0FBQ3hCLGlCQUFPLFNBQVMsS0FBSztBQUFBLFFBQ3ZCLENBQUM7QUFBQSxNQUNIO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVUEsTUFBTSxXQUFXLFNBQWdEO0FBQy9ELFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVTtBQUNwQyxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLEtBQW1CLEtBQUssT0FBTyxDQUFDO0FBQUEsRUFDakY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFVQSxNQUFNLGFBQTJDO0FBQy9DLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVTtBQUNwQyxXQUFPLEtBQUssUUFBUSxZQUFZO0FBQzlCLFlBQU0sV0FBVyxNQUFNLE1BQU0sS0FBSztBQUFBLFFBQ2hDLFNBQVMsS0FBSyxXQUFXO0FBQUEsUUFDekIsUUFBUSxLQUFLLGlCQUFpQjtBQUFBLE1BQ2hDLENBQUM7QUFDRCxVQUFJLFNBQVMsV0FBVyxLQUFLO0FBQzNCLGVBQU87QUFBQSxNQUNUO0FBQ0EsVUFBSSxDQUFDLFNBQVMsR0FBSSxPQUFNO0FBQ3hCLGFBQU8sU0FBUyxLQUFLO0FBQUEsSUFDdkIsQ0FBQztBQUFBLEVBQ0g7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPQSxNQUFNLGVBQThCO0FBQ2xDLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVTtBQUNwQyxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLE9BQU8sR0FBRyxDQUFDO0FBQUEsRUFDNUQ7QUFDRjs7O0FDMXJCTyxTQUFTLGFBQ2QsUUFDQSxTQUNnQztBQUNoQyxRQUFNLEtBQUssT0FBTyxPQUFvQixZQUEwQztBQUM5RSxVQUFNLFFBQVEsT0FBTyxPQUFPO0FBQUEsRUFDOUI7QUFFQSxLQUFHLGNBQWM7QUFDakIsS0FBRyxLQUFLLE9BQU87QUFDZixLQUFHLGFBQWEsT0FBTztBQUN2QixLQUFHLGNBQWMsT0FBTztBQUN4QixLQUFHLE9BQU8sT0FBTztBQUNqQixLQUFHLHlCQUF5QixPQUFPO0FBQ25DLEtBQUcsa0JBQWtCLE9BQU87QUFDNUIsS0FBRyxVQUFVLE9BQU87QUFDcEIsS0FBRyxhQUFhLE9BQU87QUFFdkIsU0FBTztBQUNUOzs7QUM1TEEsU0FBUyxvQkFBb0I7QUFjdEIsSUFBTSxpQkFBaUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSzVCLFNBQVM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVQsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNYixhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT2IsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1oQixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1kLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9sQixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1kLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNZCxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxRQUFRO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1SLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWWQsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVViLE1BQU07QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTU4sYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNYixpQ0FBaUM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWpDLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWIsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1oQixnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWhCLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBUWhCLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBU2IsZUFBZTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9mLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZbEIsa0JBQWtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFXbEIsZ0JBQWdCO0FBQ2xCO0FBa0JPLFNBQVMsWUFBb0I7QUFDbEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLE9BQU87QUFDaEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLE9BQU8sRUFBRTtBQUFBLEVBQ3BGO0FBQ0EsU0FBTztBQUNUO0FBY08sU0FBUyxpQkFBeUI7QUFDdkMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFdBQVc7QUFDcEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFdBQVcsRUFBRTtBQUFBLEVBQ3hGO0FBQ0EsU0FBTztBQUNUO0FBZU8sU0FBUyxnQkFBd0I7QUFDdEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFdBQVc7QUFDcEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFdBQVcsRUFBRTtBQUFBLEVBQ3hGO0FBQ0EsU0FBTztBQUNUO0FBZ0JPLFNBQVMsbUJBQWlEO0FBQy9ELFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxjQUFjO0FBQ3ZELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxjQUFjLEVBQUU7QUFBQSxFQUMzRjtBQUNBLE1BQUksVUFBVSxpQkFBaUIsVUFBVSxjQUFjO0FBQ3JELFVBQU0sSUFBSSxNQUFNLFdBQVcsZUFBZSxjQUFjLGtEQUFrRCxLQUFLLEdBQUc7QUFBQSxFQUNwSDtBQUNBLFNBQU87QUFDVDtBQWVPLFNBQVMsZ0JBQXdCO0FBQ3RDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxZQUFZO0FBQ3JELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxZQUFZLEVBQUU7QUFBQSxFQUN6RjtBQUNBLFNBQU87QUFDVDtBQWlCTyxTQUFTLG9CQUE0QjtBQUMxQyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsZ0JBQWdCO0FBQ3pELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxnQkFBZ0IsRUFBRTtBQUFBLEVBQzdGO0FBQ0EsU0FBTztBQUNUO0FBaUJPLFNBQVMsaUJBQXFDO0FBQ25ELFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxZQUFZO0FBQ3JELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQWNPLFNBQVMsY0FBc0I7QUFDcEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFNBQVM7QUFDbEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFNBQVMsRUFBRTtBQUFBLEVBQ3RGO0FBQ0EsU0FBTztBQUNUO0FBY08sU0FBUyxpQkFBeUI7QUFDdkMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFlBQVk7QUFDckQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFlBQVksRUFBRTtBQUFBLEVBQ3pGO0FBQ0EsU0FBTztBQUNUO0FBY08sU0FBUyxjQUFzQjtBQUNwQyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsU0FBUztBQUNsRCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsU0FBUyxFQUFFO0FBQUEsRUFDdEY7QUFDQSxTQUFPO0FBQ1Q7QUFjTyxTQUFTLGNBQXNCO0FBQ3BDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxTQUFTO0FBQ2xELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxTQUFTLEVBQUU7QUFBQSxFQUN0RjtBQUNBLFNBQU87QUFDVDtBQWNPLFNBQVMsY0FBc0I7QUFDcEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFNBQVM7QUFDbEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFNBQVMsRUFBRTtBQUFBLEVBQ3RGO0FBQ0EsUUFBTSxPQUFPLE9BQU8sU0FBUyxPQUFPLEVBQUU7QUFDdEMsTUFBSSxPQUFPLE1BQU0sSUFBSSxHQUFHO0FBQ3RCLFVBQU0sSUFBSSxNQUFNLFdBQVcsZUFBZSxTQUFTLDJCQUEyQixLQUFLLEdBQUc7QUFBQSxFQUN4RjtBQUNBLFNBQU87QUFDVDtBQWNPLFNBQVMsWUFBb0I7QUFDbEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLE1BQU07QUFDL0MsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLE1BQU0sRUFBRTtBQUFBLEVBQ25GO0FBQ0EsU0FBTztBQUNUO0FBY08sU0FBUyxpQkFBeUI7QUFDdkMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFlBQVk7QUFDckQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFlBQVksRUFBRTtBQUFBLEVBQ3pGO0FBQ0EsU0FBTztBQUNUO0FBK0NPLFNBQVMsaUNBQXFEO0FBQ25FLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSwrQkFBK0I7QUFDeEUsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFdBQU87QUFBQSxFQUNUO0FBQ0EsU0FBTztBQUNUO0FBUU8sU0FBUyxnQkFBd0I7QUFDdEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFdBQVc7QUFDcEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFdBQVcsRUFBRTtBQUFBLEVBQ3hGO0FBQ0EsU0FBTztBQUNUO0FBUU8sU0FBUyxtQkFBMkI7QUFDekMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLGNBQWM7QUFDdkQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLGNBQWMsRUFBRTtBQUFBLEVBQzNGO0FBQ0EsU0FBTztBQUNUO0FBUU8sU0FBUyxrQkFBMEI7QUFDeEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLGNBQWM7QUFDdkQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLGNBQWMsRUFBRTtBQUFBLEVBQzNGO0FBQ0EsU0FBTztBQUNUO0FBWU8sU0FBUyxtQkFBMkI7QUFDekMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLGNBQWM7QUFDdkQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLGNBQWMsRUFBRTtBQUFBLEVBQzNGO0FBQ0EsU0FBTztBQUNUO0FBV08sU0FBUyw4QkFBbUQ7QUFDakUsUUFBTSxXQUFXLCtCQUErQjtBQUNoRCxNQUFJLGFBQWEsUUFBVztBQUMxQixXQUFPO0FBQUEsRUFDVDtBQUNBLFFBQU0sVUFBVSxhQUFhLFVBQVUsT0FBTztBQUM5QyxTQUFPLEtBQUssTUFBTSxPQUFPO0FBQzNCO0FBcUJPLFNBQVMscUJBQWtDO0FBQ2hELFNBQU87QUFBQSxJQUNMLFFBQVEsVUFBVTtBQUFBLElBQ2xCLFlBQVksY0FBYztBQUFBLElBQzFCLGFBQWEsZUFBZTtBQUFBLElBQzVCLGVBQWUsaUJBQWlCO0FBQUEsSUFDaEMsWUFBWSxjQUFjO0FBQUEsSUFDMUIsZ0JBQWdCLGtCQUFrQjtBQUFBLElBQ2xDLGFBQWEsZUFBZTtBQUFBLElBQzVCLHlCQUF5Qiw0QkFBNEI7QUFBQSxJQUNyRCxlQUFlLGlCQUFpQjtBQUFBLElBQ2hDLGNBQWMsZ0JBQWdCO0FBQUEsSUFDOUIsWUFBWSxjQUFjO0FBQUEsSUFDMUIsZUFBZSxpQkFBaUI7QUFBQSxFQUNsQztBQUNGO0FBa0JPLFNBQVMsbUJBQWtDO0FBQ2hELFNBQU87QUFBQSxJQUNMLFFBQVEsVUFBVTtBQUFBLElBQ2xCLGFBQWEsZUFBZTtBQUFBLElBQzVCLFVBQVUsWUFBWTtBQUFBLElBQ3RCLGFBQWEsZUFBZTtBQUFBLElBQzVCLFVBQVUsWUFBWTtBQUFBLElBQ3RCLFVBQVUsWUFBWTtBQUFBLElBQ3RCLFVBQVUsWUFBWTtBQUFBLElBQ3RCLFlBQVksVUFBVTtBQUFBLElBQ3RCLGFBQWEsZUFBZTtBQUFBLElBQzVCLFlBQVksY0FBYztBQUFBLElBQzFCLGdCQUFnQixrQkFBa0I7QUFBQSxFQUNwQztBQUNGOzs7QUM3ckJPLElBQU0sYUFBYTtBQUFBO0FBQUEsRUFFeEIsU0FBUztBQUFBO0FBQUEsRUFFVCxPQUFPO0FBQUE7QUFBQSxFQUVQLHVCQUF1QjtBQUN6QjtBQXFCTyxTQUFTLFdBQVcsU0FBdUI7QUFDaEQsVUFBUSxPQUFPLE1BQU0sR0FBRyxPQUFPO0FBQUEsQ0FBSTtBQUNyQzs7O0FDMUJBLFNBQVMsV0FBVyxZQUFZLFdBQVcsVUFBVSxpQkFBaUI7QUFDdEUsU0FBUyxlQUFlO0FBcUJqQixJQUFNLGFBQWEsQ0FBQyxTQUFTLFFBQVEsUUFBUSxPQUFPO0FBc09wRCxJQUFNLFNBQU4sTUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSVYsV0FBZ0Qsb0JBQUksSUFBSTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNeEQsWUFBMkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUszQixjQUE2QjtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSzdCLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS2xCO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBaUJSLFlBQVksU0FBdUIsQ0FBQyxHQUFHO0FBRXJDLGVBQVcsU0FBUyxZQUFZO0FBQzlCLFdBQUssU0FBUyxJQUFJLE9BQU8sb0JBQUksSUFBSSxDQUFDO0FBQUEsSUFDcEM7QUFHQSxTQUFLLGNBQWMsT0FBTyxlQUFlLFFBQVEsSUFBSSxzQkFBc0IsS0FBSztBQUFBLEVBQ2xGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFjQSxNQUFNLFNBQWlCLFNBQXlDO0FBQzlELFNBQUssS0FBSyxTQUFTLFNBQVMsT0FBTztBQUFBLEVBQ3JDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFjQSxLQUFLLFNBQWlCLFNBQXlDO0FBQzdELFNBQUssS0FBSyxRQUFRLFNBQVMsT0FBTztBQUFBLEVBQ3BDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFjQSxLQUFLLFNBQWlCLFNBQXlDO0FBQzdELFNBQUssS0FBSyxRQUFRLFNBQVMsT0FBTztBQUFBLEVBQ3BDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFjQSxNQUFNLFNBQWlCLFNBQXlDO0FBQzlELFNBQUssS0FBSyxTQUFTLFNBQVMsT0FBTztBQUFBLEVBQ3JDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBc0JBLFNBQVMsT0FBZ0IsU0FBaUIsU0FBeUM7QUFDakYsVUFBTSxZQUFZLEtBQUssaUJBQWlCLEtBQUs7QUFFN0MsVUFBTSxRQUFrQjtBQUFBLE1BQ3RCLFlBQVcsb0JBQUksS0FBSyxHQUFFLFlBQVk7QUFBQSxNQUNsQyxPQUFPO0FBQUEsTUFDUCxVQUFVLEtBQUs7QUFBQSxNQUNmO0FBQUEsTUFDQSxPQUFPLEtBQUs7QUFBQSxNQUNaLE9BQU87QUFBQSxNQUNQO0FBQUEsSUFDRjtBQUVBLFNBQUssYUFBYSxLQUFLO0FBQUEsRUFDekI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQW1DQSxHQUFHLE9BQWlCLFNBQXVDO0FBQ3pELFVBQU0sZ0JBQWdCLEtBQUssU0FBUyxJQUFJLEtBQUs7QUFDN0MsUUFBSSxlQUFlO0FBQ2pCLG9CQUFjLElBQUksT0FBTztBQUFBLElBQzNCO0FBRUEsV0FBTyxNQUFNO0FBQ1gscUJBQWUsT0FBTyxPQUFPO0FBQUEsSUFDL0I7QUFBQSxFQUNGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFXQSxXQUFXLFVBQThCLE9BQWtEO0FBQ3pGLFNBQUssa0JBQWtCO0FBQ3ZCLFNBQUssZUFBZTtBQUFBLEVBQ3RCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFRQSxlQUFxQjtBQUNuQixTQUFLLGtCQUFrQjtBQUN2QixTQUFLLGVBQWU7QUFBQSxFQUN0QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQXNCQSxrQkFBa0IsVUFBd0I7QUFDeEMsUUFBSSxLQUFLLGdCQUFnQixNQUFNO0FBQzdCLFdBQUssY0FBYztBQUNuQixXQUFLLGtCQUFrQjtBQUFBLElBQ3pCO0FBQUEsRUFDRjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFrQkEsV0FBVyxVQUErQjtBQUV4QyxRQUFJLEtBQUssY0FBYyxNQUFNO0FBQzNCLFVBQUk7QUFDRixrQkFBVSxLQUFLLFNBQVM7QUFBQSxNQUMxQixRQUFRO0FBQUEsTUFFUjtBQUNBLFdBQUssWUFBWTtBQUFBLElBQ25CO0FBRUEsU0FBSyxjQUFjO0FBQ25CLFNBQUssa0JBQWtCO0FBQUEsRUFDekI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWNBLFFBQWM7QUFDWixRQUFJLEtBQUssY0FBYyxNQUFNO0FBQzNCLFVBQUk7QUFDRixrQkFBVSxLQUFLLFNBQVM7QUFBQSxNQUMxQixRQUFRO0FBQUEsTUFFUjtBQUNBLFdBQUssWUFBWTtBQUFBLElBQ25CO0FBQ0EsU0FBSyxrQkFBa0I7QUFBQSxFQUN6QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFTQSxrQkFBMkI7QUFDekIsVUFBTSxjQUFjLE1BQU0sS0FBSyxLQUFLLFNBQVMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLGFBQWEsU0FBUyxPQUFPLENBQUM7QUFDM0YsV0FBTyxlQUFlLEtBQUssZ0JBQWdCO0FBQUEsRUFDN0M7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVlRLEtBQUssT0FBaUIsU0FBaUIsU0FBeUM7QUFDdEYsVUFBTSxRQUFrQjtBQUFBLE1BQ3RCLFlBQVcsb0JBQUksS0FBSyxHQUFFLFlBQVk7QUFBQSxNQUNsQztBQUFBLE1BQ0EsVUFBVSxLQUFLO0FBQUEsTUFDZjtBQUFBLE1BQ0EsT0FBTyxLQUFLO0FBQUEsTUFDWjtBQUFBLElBQ0Y7QUFFQSxTQUFLLGFBQWEsS0FBSztBQUFBLEVBQ3pCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1RLGFBQWEsT0FBdUI7QUFFMUMsVUFBTSxnQkFBZ0IsS0FBSyxTQUFTLElBQUksTUFBTSxLQUFLO0FBQ25ELFFBQUksZUFBZTtBQUNqQixpQkFBVyxXQUFXLGVBQWU7QUFDbkMsWUFBSTtBQUNGLGtCQUFRLEtBQUs7QUFBQSxRQUNmLFFBQVE7QUFBQSxRQUVSO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFHQSxTQUFLLFlBQVksS0FBSztBQUFBLEVBQ3hCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1RLFlBQVksT0FBdUI7QUFDekMsUUFBSSxDQUFDLEtBQUssWUFBYTtBQUd2QixRQUFJLENBQUMsS0FBSyxpQkFBaUI7QUFDekIsV0FBSyxlQUFlO0FBQUEsSUFDdEI7QUFFQSxRQUFJLEtBQUssY0FBYyxLQUFNO0FBRTdCLFFBQUk7QUFDRixZQUFNLE9BQU8sR0FBRyxLQUFLLFVBQVUsS0FBSyxDQUFDO0FBQUE7QUFDckMsZ0JBQVUsS0FBSyxXQUFXLElBQUk7QUFBQSxJQUNoQyxRQUFRO0FBQUEsSUFJUjtBQUFBLEVBQ0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtRLGlCQUF1QjtBQUM3QixTQUFLLGtCQUFrQjtBQUV2QixRQUFJLENBQUMsS0FBSyxZQUFhO0FBRXZCLFFBQUk7QUFFRixZQUFNLE1BQU0sUUFBUSxLQUFLLFdBQVc7QUFDcEMsVUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHO0FBQ3BCLGtCQUFVLEtBQUssRUFBRSxXQUFXLEtBQUssQ0FBQztBQUFBLE1BQ3BDO0FBR0EsV0FBSyxZQUFZLFNBQVMsS0FBSyxhQUFhLEdBQUc7QUFBQSxJQUNqRCxRQUFRO0FBRU4sV0FBSyxZQUFZO0FBQUEsSUFDbkI7QUFBQSxFQUNGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT1EsaUJBQWlCLE9BQStCO0FBQ3RELFFBQUksaUJBQWlCLE9BQU87QUFDMUIsWUFBTSxPQUFzQjtBQUFBLFFBQzFCLE1BQU0sTUFBTTtBQUFBLFFBQ1osU0FBUyxNQUFNO0FBQUEsUUFDZixPQUFPLE1BQU07QUFBQSxNQUNmO0FBR0EsVUFBSSxNQUFNLFVBQVUsUUFBVztBQUM3QixhQUFLLFFBQVEsS0FBSyxpQkFBaUIsTUFBTSxLQUFLO0FBQUEsTUFDaEQ7QUFFQSxhQUFPO0FBQUEsSUFDVDtBQUdBLFdBQU87QUFBQSxNQUNMLE1BQU07QUFBQSxNQUNOLFNBQVMsT0FBTyxLQUFLO0FBQUEsSUFDdkI7QUFBQSxFQUNGO0FBQ0Y7QUE0RE8sSUFBTSxTQUFTLElBQUksT0FBTzs7O0FDMXZCakMsWUFBWSxTQUFTO0FBd0NkLElBQU0sZUFBTixNQUFNLGNBQWE7QUFBQSxFQUNoQjtBQUFBLEVBQ0EsU0FBUztBQUFBLEVBQ1Q7QUFBQSxFQUVBLFlBQVksUUFBb0I7QUFDdEMsU0FBSyxTQUFTO0FBRWQsV0FBTyxHQUFHLFFBQVEsQ0FBQyxVQUFVO0FBQzNCLFdBQUssVUFBVSxNQUFNLFNBQVM7QUFFOUIsWUFBTSxRQUFRLEtBQUssT0FBTyxNQUFNLElBQUk7QUFDcEMsV0FBSyxTQUFTLE1BQU0sSUFBSSxLQUFLO0FBRTdCLGlCQUFXLFFBQVEsT0FBTztBQUN4QixZQUFJLEtBQUssS0FBSyxNQUFNLEdBQUk7QUFDeEIsWUFBSTtBQUNGLGdCQUFNLFNBQVMsS0FBSyxNQUFNLElBQUk7QUFDOUIsZUFBSyxpQkFBaUIsTUFBTTtBQUFBLFFBQzlCLFFBQVE7QUFBQSxRQUVSO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBU0EsT0FBTyxRQUFRLFlBQTJDO0FBQ3hELFdBQU8sSUFBSSxRQUFRLENBQUNDLFVBQVMsV0FBVztBQUN0QyxZQUFNLFNBQWEscUJBQWlCLFlBQVksTUFBTTtBQUNwRCxRQUFBQSxTQUFRLElBQUksY0FBYSxNQUFNLENBQUM7QUFBQSxNQUNsQyxDQUFDO0FBQ0QsYUFBTyxHQUFHLFNBQVMsTUFBTTtBQUFBLElBQzNCLENBQUM7QUFBQSxFQUNIO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVUEsVUFBVSxTQUFpRDtBQUN6RCxTQUFLLGlCQUFpQjtBQUFBLEVBQ3hCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT0EsYUFBYSxVQUE2QztBQUN4RCxTQUFLLE9BQU8sTUFBTSxHQUFHLEtBQUssVUFBVSxRQUFRLENBQUM7QUFBQSxDQUFJO0FBQUEsRUFDbkQ7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFVQSxpQkFBaUIsVUFBdUMsVUFBNEI7QUFDbEYsU0FBSyxPQUFPLE1BQU0sR0FBRyxLQUFLLFVBQVUsUUFBUSxDQUFDO0FBQUEsR0FBTSxRQUFRO0FBQUEsRUFDN0Q7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtBLFFBQWM7QUFDWixTQUFLLE9BQU8sUUFBUTtBQUFBLEVBQ3RCO0FBQ0Y7OztBQ3ZEQSxTQUFTLGdCQUFnQixPQUF3QjtBQUMvQyxTQUFPLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDOUQ7QUFjQSxTQUFTLGVBQWUsVUFBeUI7QUFDL0MsU0FBTyxhQUFhO0FBQ3BCLFNBQU8sTUFBTTtBQUNiLFVBQVEsS0FBSyxRQUFRO0FBQ3ZCO0FBY0EsU0FBUyx5QkFBeUIsT0FBdUI7QUFDdkQsUUFBTSxVQUFVLGdCQUFnQixLQUFLO0FBQ3JDLFNBQU8sTUFBTSw2Q0FBNkMsT0FBTyxFQUFFO0FBQ25FLGFBQVcsbUJBQW1CLE9BQU8sRUFBRTtBQUN2QyxpQkFBZSxXQUFXLEtBQUs7QUFDakM7QUFjQSxTQUFTLG1CQUFtQixPQUF1QjtBQUNqRCxRQUFNLGNBQWMsaUJBQWlCLFFBQVMsTUFBTSxTQUFTLE1BQU0sVUFBVyxPQUFPLEtBQUs7QUFDMUYsVUFBUSxPQUFPLE1BQU0sR0FBRyxXQUFXO0FBQUEsQ0FBSTtBQUN2QyxTQUFPLE1BQU0sa0JBQWtCLGdCQUFnQixLQUFLLENBQUMsRUFBRTtBQUN2RCxpQkFBZSxXQUFXLEtBQUs7QUFDakM7QUF3REEsZUFBc0IsZUFBZSxTQUFvQztBQUN2RSxNQUFJO0FBQ0YsUUFBSTtBQUVKLFFBQUk7QUFDRixVQUFJLFFBQVEsZ0JBQWdCLFVBQVU7QUFDcEMsZ0JBQVEsbUJBQW1CO0FBQUEsTUFDN0IsT0FBTztBQUNMLGdCQUFRLGlCQUFpQjtBQUFBLE1BQzNCO0FBQUEsSUFDRixTQUFTLE9BQU87QUFDZCxhQUFPLHlCQUF5QixLQUFLO0FBQUEsSUFDdkM7QUFHQSxXQUFPLFdBQVcsUUFBUSxhQUFhLEVBQUUsR0FBRyxNQUFNLENBQUM7QUFFbkQsUUFBSSxRQUFRLGdCQUFnQixVQUFVO0FBRXBDLFVBQUk7QUFDSixZQUFNLGFBQWEsUUFBUSxJQUFJLGVBQWUsV0FBVztBQUN6RCxVQUFJLFlBQVk7QUFDZCxZQUFJO0FBQ0YseUJBQWUsTUFBTSxhQUFhLFFBQVEsVUFBVTtBQUFBLFFBQ3RELFNBQVMsT0FBTztBQUNkLGlCQUFPLEtBQUssa0NBQWtDLFVBQVUsS0FBSyxnQkFBZ0IsS0FBSyxDQUFDLEVBQUU7QUFBQSxRQUV2RjtBQUFBLE1BQ0Y7QUFHQSxVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUksbUJBQW1CO0FBR3ZCLFlBQU0sVUFBeUI7QUFBQSxRQUM3QjtBQUFBLFFBQ0EsS0FBSyxRQUFRLElBQUk7QUFBQSxRQUNqQixVQUFVLENBQUMsYUFBYTtBQUN0QiwyQkFBaUI7QUFBQSxRQUNuQjtBQUFBLFFBQ0EsdUJBQXVCLENBQUMsYUFBYTtBQUNuQyx3Q0FBOEI7QUFBQSxRQUNoQztBQUFBLE1BQ0Y7QUFHQSxVQUFJLGNBQWM7QUFDaEIscUJBQWEsVUFBVSxDQUFDLFFBQXVCO0FBRTdDLGNBQUksaUJBQWtCO0FBQ3RCLDZCQUFtQjtBQUVuQixjQUFJLElBQUksU0FBUyxVQUFVO0FBQ3pCLGdDQUFvQixnQkFBZ0IsWUFBWTtBQUFBLFVBQ2xELFdBQVcsSUFBSSxTQUFTLHVCQUF1QjtBQUM3Qyw2Q0FBaUMsNkJBQTZCLFlBQWE7QUFBQSxVQUM3RTtBQUFBLFFBQ0YsQ0FBQztBQUFBLE1BQ0g7QUFHQSxVQUFJO0FBQ0YsY0FBTSxRQUFRLE9BQXNCLE9BQU87QUFBQSxNQUM3QyxTQUFTLE9BQU87QUFDZCxzQkFBYyxNQUFNO0FBQ3BCLGVBQU8sbUJBQW1CLEtBQUs7QUFBQSxNQUNqQztBQUdBLG9CQUFjLE1BQU07QUFDcEIscUJBQWUsV0FBVyxPQUFPO0FBQUEsSUFDbkMsT0FBTztBQUVMLFlBQU0sVUFBMkI7QUFBQSxRQUMvQjtBQUFBLFFBQ0EsS0FBSyxRQUFRLElBQUk7QUFBQSxNQUNuQjtBQUdBLFVBQUk7QUFDRixjQUFNLFFBQVEsT0FBd0IsT0FBTztBQUFBLE1BQy9DLFNBQVMsT0FBTztBQUNkLGVBQU8sbUJBQW1CLEtBQUs7QUFBQSxNQUNqQztBQUVBLHFCQUFlLFdBQVcsT0FBTztBQUFBLElBQ25DO0FBQUEsRUFDRixTQUFTLE9BQU87QUFFZCxXQUFPLE1BQU0sNkJBQTZCLGdCQUFnQixLQUFLLENBQUMsRUFBRTtBQUNsRSxtQkFBZSxXQUFXLEtBQUs7QUFBQSxFQUNqQztBQUNGO0FBZ0JBLFNBQVMsVUFBYSxRQUFvQztBQUN4RCxNQUFJLFVBQVUsT0FBUSxPQUFzQixTQUFTLFlBQVk7QUFDL0QsV0FBTztBQUFBLEVBQ1Q7QUFDQSxTQUFPLFFBQVEsUUFBUSxNQUFNO0FBQy9CO0FBY0EsU0FBUyxvQkFDUCxVQUNBLGNBQ007QUFDTixNQUFJLENBQUMsVUFBVTtBQUNiLFlBQVEsS0FBSyxRQUFRLEtBQUssU0FBUztBQUNuQztBQUFBLEVBQ0Y7QUFFQSxZQUFVLFNBQVMsQ0FBQyxFQUFFO0FBQUEsSUFDcEIsTUFBTTtBQUNKLG9CQUFjLE1BQU07QUFDcEIscUJBQWUsV0FBVyxLQUFLO0FBQUEsSUFDakM7QUFBQSxJQUNBLE1BQU07QUFDSixvQkFBYyxNQUFNO0FBQ3BCLHFCQUFlLFdBQVcsS0FBSztBQUFBLElBQ2pDO0FBQUEsRUFDRjtBQUNGO0FBZ0JBLFNBQVMsaUNBQ1AsVUFDQSxjQUNNO0FBQ04sTUFBSSxDQUFDLFVBQVU7QUFDYjtBQUFBLEVBQ0Y7QUFFQSxZQUFVLFNBQVMsQ0FBQyxFQUFFO0FBQUEsSUFDcEIsQ0FBQyxTQUFTO0FBQ1IsbUJBQWEsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsS0FBSyxHQUFHLE1BQU07QUFDakYsdUJBQWUsV0FBVyxxQkFBcUI7QUFBQSxNQUNqRCxDQUFDO0FBQUEsSUFDSDtBQUFBLElBQ0EsQ0FBQyxVQUFVO0FBQ1QsYUFBTyxNQUFNLHVDQUF1QyxnQkFBZ0IsS0FBSyxDQUFDLEVBQUU7QUFDNUUsbUJBQWEsTUFBTTtBQUNuQixxQkFBZSxXQUFXLEtBQUs7QUFBQSxJQUNqQztBQUFBLEVBQ0Y7QUFDRjs7O0FDNVdBLFNBQVMsWUFBQUMsaUJBQWdCO0FBQ3pCLFlBQVlDLFNBQVE7QUFDcEIsU0FBUyxlQUFlO0FBQ3hCLFlBQVlDLFdBQVU7QUFDdEIsU0FBUyxhQUFBQyxrQkFBaUI7OztBQ2hCMUIsU0FBUyxnQkFBZ0I7QUFDekIsWUFBWSxRQUFRO0FBQ3BCLFlBQVksVUFBVTtBQUN0QixTQUFTLGlCQUFpQjtBQVUxQixJQUFNLGdCQUFnQixVQUFVLFFBQVE7QUFZakMsU0FBUyxtQkFBbUIsTUFBb0I7QUFDckQsUUFBTSxrQkFBa0I7QUFDeEIsTUFBSSxDQUFDLGdCQUFnQixLQUFLLElBQUksR0FBRztBQUMvQixVQUFNLElBQUksTUFBTSxvQ0FBb0M7QUFBQSxFQUN0RDtBQUNGO0FBWU8sU0FBUyxjQUFjLEtBQWEsV0FBaUM7QUFDMUUsTUFBSSxVQUFVO0FBQ2QsU0FBTyxRQUFRLFNBQVMsR0FBRyxHQUFHO0FBQzVCLGNBQVUsUUFBUSxVQUFVLEdBQUcsUUFBUSxZQUFZLEdBQUcsQ0FBQztBQUN2RCxRQUFJLFVBQVUsSUFBSSxPQUFPLEdBQUc7QUFDMUIsYUFBTztBQUFBLElBQ1Q7QUFBQSxFQUNGO0FBQ0EsU0FBTztBQUNUO0FBV08sU0FBUyxrQkFBa0IsUUFBeUI7QUFDekQsU0FBTyxPQUFPLFdBQVcsS0FBSztBQUNoQztBQXFCQSxlQUFzQixlQUFlLFlBQW9CLFNBQTJEO0FBQ2xILHFCQUFtQixVQUFVO0FBRTdCLFFBQU0sRUFBRSxZQUFZLFNBQVMsSUFBSSxNQUFNLGFBQWEsU0FBUyxPQUFPLFFBQVEsSUFBSSxDQUFDO0FBQ2pGLFFBQU0sYUFBYSxNQUFNLFlBQVksVUFBVTtBQUMvQyxRQUFNLGNBQW1CLFVBQUssVUFBVSxjQUFjLFVBQVU7QUFFaEUsUUFBTSxDQUFDLGdCQUFnQixZQUFZLElBQUksTUFBTSxRQUFRLElBQUk7QUFBQSxJQUN2RCxvQkFBb0IsVUFBVSxXQUFXO0FBQUEsSUFDekMsa0JBQWtCLFVBQVUsVUFBVTtBQUFBLEVBQ3hDLENBQUM7QUFFRCxNQUFJLGdCQUFnQjtBQUNsQixVQUFNLElBQUksTUFBTSxxQ0FBcUMsV0FBVyxFQUFFO0FBQUEsRUFDcEU7QUFFQSxRQUFNLFlBQVksRUFBRSxVQUFVLGFBQWEsWUFBWSxjQUFjLFdBQVcsQ0FBQztBQUVqRixRQUFNLFVBQVUsTUFBTSxxQkFBcUIsVUFBVTtBQUNyRCxRQUFNLHFCQUFxQixZQUFZLFdBQVc7QUFDbEQsUUFBTSxvQkFBb0IsRUFBRSxZQUFZLGFBQWEsUUFBUSxDQUFDO0FBRTlELFFBQU0sZ0JBQWdCLE1BQU0sc0JBQXNCLEVBQUUsWUFBWSxhQUFhLFNBQVMsQ0FBQztBQUV2RixRQUFNLENBQUMsRUFBRSxPQUFPLElBQUksTUFBTSxRQUFRLElBQUk7QUFBQSxJQUNwQyxpQkFBaUIsRUFBRSxhQUFhLFVBQVUsYUFBYSxRQUFRLGFBQWEsT0FBTyxRQUFRLE1BQU0sQ0FBQztBQUFBLElBQ2xHLFlBQVksV0FBVztBQUFBLEVBQ3pCLENBQUM7QUFFRCxRQUFNLFNBQStCO0FBQUEsSUFDbkMsUUFBUTtBQUFBLElBQ1IsVUFBVTtBQUFBLElBQ1Y7QUFBQSxFQUNGO0FBRUEsTUFBSSxnQkFBZ0IsR0FBRztBQUNyQixXQUFPLG1CQUFtQjtBQUFBLEVBQzVCO0FBRUEsU0FBTztBQUNUO0FBaUJBLGVBQXNCLGFBQWEsVUFBcUM7QUFDdEUsTUFBSSxhQUFrQixhQUFRLFFBQVE7QUFDdEMsU0FBTyxlQUFlLEtBQUs7QUFDekIsVUFBTSxVQUFlLFVBQUssWUFBWSxNQUFNO0FBQzVDLFFBQUk7QUFDRixZQUFNLFFBQVEsTUFBUyxTQUFNLE9BQU87QUFDcEMsVUFBSSxNQUFNLFlBQVksR0FBRztBQUN2QixlQUFPO0FBQUEsVUFDTCxZQUFZO0FBQUEsVUFDWixVQUFVO0FBQUEsUUFDWjtBQUFBLE1BQ0Y7QUFDQSxVQUFJLE1BQU0sT0FBTyxHQUFHO0FBQ2xCLGNBQU0saUJBQWlCLE1BQVMsWUFBUyxTQUFTLE9BQU87QUFDekQsY0FBTSxhQUFhLGVBQWUsS0FBSztBQUN2QyxjQUFNLGFBQWEsV0FBVyxRQUFRLGVBQWUsRUFBRTtBQUN2RCxjQUFNLGFBQWEsV0FBVyxRQUFRLHVCQUF1QixFQUFFO0FBQy9ELGNBQU0sV0FBVyxXQUFXLFFBQVEsWUFBWSxFQUFFO0FBQ2xELGVBQU87QUFBQSxVQUNMLFlBQVk7QUFBQSxVQUNaO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLFNBQVMsT0FBZ0I7QUFDdkIsVUFBSyxNQUFnQyxTQUFTLFVBQVU7QUFDdEQsY0FBTTtBQUFBLE1BQ1I7QUFBQSxJQUNGO0FBQ0EsaUJBQWtCLGFBQVEsVUFBVTtBQUFBLEVBQ3RDO0FBQ0EsUUFBTSxJQUFJLE1BQU0seUJBQXlCO0FBQzNDO0FBUUEsZUFBc0IsWUFBWSxLQUE4QjtBQUM5RCxRQUFNLEVBQUUsT0FBTyxJQUFJLE1BQU0sY0FBYyxPQUFPLENBQUMsYUFBYSxNQUFNLEdBQUcsRUFBRSxLQUFLLFNBQVMsSUFBTSxDQUFDO0FBQzVGLFNBQU8sT0FBTyxLQUFLO0FBQ3JCO0FBU0EsZUFBc0Isb0JBQW9CLFVBQWtCLGFBQXVDO0FBQ2pHLFFBQU0sRUFBRSxPQUFPLElBQUksTUFBTSxjQUFjLE9BQU8sQ0FBQyxZQUFZLE1BQU0sR0FBRyxFQUFFLEtBQUssVUFBVSxTQUFTLElBQU8sQ0FBQztBQUN0RyxTQUFPLE9BQU8sU0FBUyxXQUFXO0FBQ3BDO0FBU0EsZUFBc0Isa0JBQWtCLFVBQWtCLFlBQXNDO0FBQzlGLFFBQU0sRUFBRSxPQUFPLElBQUksTUFBTSxjQUFjLE9BQU8sQ0FBQyxVQUFVLFVBQVUsVUFBVSxHQUFHO0FBQUEsSUFDOUUsS0FBSztBQUFBLElBQ0wsU0FBUztBQUFBLEVBQ1gsQ0FBQztBQUNELFNBQU8sT0FBTyxLQUFLLEVBQUUsU0FBUztBQUNoQztBQW1CQSxlQUFzQixZQUFZLE1BQXlDO0FBQ3pFLFFBQU0sT0FBTyxLQUFLLGVBQ2QsQ0FBQyxZQUFZLE9BQU8sS0FBSyxhQUFhLEtBQUssVUFBVSxJQUNyRCxDQUFDLFlBQVksT0FBTyxNQUFNLEtBQUssWUFBWSxLQUFLLGFBQWEsS0FBSyxVQUFVO0FBQ2hGLFFBQU0sY0FBYyxPQUFPLE1BQU0sRUFBRSxLQUFLLEtBQUssVUFBVSxTQUFTLElBQU8sQ0FBQztBQUMxRTtBQWdCQSxlQUFzQixxQkFBcUIsWUFBMkM7QUFDcEYsUUFBTSxFQUFFLE9BQU8sSUFBSSxNQUFNO0FBQUEsSUFDdkI7QUFBQSxJQUNBLENBQUMsTUFBTSxZQUFZLFlBQVksYUFBYSxzQkFBc0IsZUFBZSxVQUFVO0FBQUEsSUFDM0YsRUFBRSxLQUFLLFlBQVksU0FBUyxJQUFPO0FBQUEsRUFDckM7QUFFQSxRQUFNLFFBQVEsT0FBTyxNQUFNLElBQUksRUFBRSxPQUFPLENBQUMsU0FBUyxLQUFLLFNBQVMsS0FBSyxDQUFDLEtBQUssV0FBVyxZQUFZLENBQUM7QUFDbkcsUUFBTSxjQUFjLE1BQU0sT0FBTyxDQUFDLE1BQU0sRUFBRSxTQUFTLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLEVBQUUsQ0FBQztBQUNsRixRQUFNLFFBQVEsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxHQUFHLENBQUM7QUFFbEQsU0FBTyxFQUFFLGFBQWEsTUFBTTtBQUM5QjtBQXNCQSxlQUFzQixvQkFBb0IsTUFBc0U7QUFDOUcsUUFBTSxFQUFFLFlBQVksYUFBYSxRQUFRLElBQUk7QUFDN0MsUUFBTSxTQUFTLElBQUksSUFBSSxRQUFRLFdBQVc7QUFDMUMsUUFBTSxnQkFBZ0IsUUFBUSxZQUFZLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxLQUFLLE1BQU0sQ0FBQztBQUVyRixRQUFNLG1CQUFtQixPQUFPLFFBQWtDO0FBQ2hFLFFBQUk7QUFDRixZQUFNLGFBQWtCLFVBQUssWUFBWSxHQUFHO0FBQzVDLFVBQUk7QUFDRixjQUFTLFNBQU0sVUFBVTtBQUFBLE1BQzNCLFNBQVMsT0FBZ0I7QUFDdkIsWUFBSyxNQUFnQyxTQUFTLFVBQVU7QUFDdEQsaUJBQU87QUFBQSxRQUNUO0FBQ0EsZ0JBQVEsT0FBTztBQUFBLFVBQ2IsK0NBQStDLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUssQ0FBQztBQUFBO0FBQUEsUUFDdkc7QUFDQSxlQUFPO0FBQUEsTUFDVDtBQUNBLFlBQU0sV0FBZ0IsVUFBSyxhQUFhLEdBQUc7QUFDM0MsWUFBTSxZQUFpQixhQUFRLEdBQUc7QUFDbEMsVUFBSSxjQUFjLEtBQUs7QUFDckIsY0FBUyxTQUFXLFVBQUssYUFBYSxTQUFTLEdBQUcsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUFBLE1BQ3ZFO0FBQ0EsWUFBUyxXQUFRLFlBQVksUUFBUTtBQUNyQyxhQUFPO0FBQUEsSUFDVCxTQUFTLE9BQWdCO0FBQ3ZCLFlBQU0sT0FBUSxNQUFnQztBQUM5QyxVQUFJLFNBQVMsWUFBWSxTQUFTLFVBQVU7QUFDMUMsZUFBTztBQUFBLE1BQ1Q7QUFDQSxjQUFRLE9BQU87QUFBQSxRQUNiLGlEQUFpRCxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLLENBQUM7QUFBQTtBQUFBLE1BQ3pHO0FBQ0EsYUFBTztBQUFBLElBQ1Q7QUFBQSxFQUNGO0FBRUEsUUFBTSxvQkFBb0IsT0FBTyxTQUFtQztBQUNsRSxRQUFJO0FBQ0YsWUFBTSxhQUFrQixVQUFLLFlBQVksSUFBSTtBQUM3QyxVQUFJO0FBQ0YsY0FBUyxTQUFNLFVBQVU7QUFBQSxNQUMzQixTQUFTLE9BQWdCO0FBQ3ZCLFlBQUssTUFBZ0MsU0FBUyxVQUFVO0FBQ3RELGlCQUFPO0FBQUEsUUFDVDtBQUNBLGdCQUFRLE9BQU87QUFBQSxVQUNiLCtDQUErQyxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLLENBQUM7QUFBQTtBQUFBLFFBQ3ZHO0FBQ0EsZUFBTztBQUFBLE1BQ1Q7QUFDQSxZQUFNLFdBQWdCLFVBQUssYUFBYSxJQUFJO0FBQzVDLFlBQU0sWUFBaUIsYUFBUSxJQUFJO0FBQ25DLFVBQUksY0FBYyxLQUFLO0FBQ3JCLGNBQVMsU0FBVyxVQUFLLGFBQWEsU0FBUyxHQUFHLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFBQSxNQUN2RTtBQUNBLFlBQVMsV0FBUSxZQUFZLFFBQVE7QUFDckMsYUFBTztBQUFBLElBQ1QsU0FBUyxPQUFnQjtBQUN2QixZQUFNLE9BQVEsTUFBZ0M7QUFDOUMsVUFBSSxTQUFTLFlBQVksU0FBUyxVQUFVO0FBQzFDLGVBQU87QUFBQSxNQUNUO0FBQ0EsY0FBUSxPQUFPO0FBQUEsUUFDYixpREFBaUQsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSyxDQUFDO0FBQUE7QUFBQSxNQUN6RztBQUNBLGFBQU87QUFBQSxJQUNUO0FBQUEsRUFDRjtBQUVBLFFBQU0sYUFBYSxNQUFNLFFBQVEsSUFBSSxjQUFjLElBQUksZ0JBQWdCLENBQUM7QUFDeEUsUUFBTSxpQkFBaUIsUUFBUSxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsY0FBYyxNQUFNLE1BQU0sQ0FBQztBQUNsRixRQUFNLGNBQWMsTUFBTSxRQUFRLElBQUksZUFBZSxJQUFJLGlCQUFpQixDQUFDO0FBRTNFLFFBQU0sV0FBVyxXQUFXLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUM3QyxRQUFNLFlBQVksWUFBWSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFFL0MsU0FBTyxFQUFFLFVBQVUsVUFBVTtBQUMvQjtBQVdBLGVBQXNCLHFCQUFxQixZQUFvQixhQUFzQztBQUNuRyxRQUFNLFVBQVUsTUFBUyxXQUFRLFlBQVksRUFBRSxlQUFlLEtBQUssQ0FBQztBQUNwRSxRQUFNLFdBQVcsUUFBUSxPQUFPLENBQUMsTUFBTSxFQUFFLGVBQWUsS0FBSyxFQUFFLFNBQVMsVUFBVSxFQUFFLFNBQVMsWUFBWTtBQUV6RyxRQUFNLGNBQWMsT0FBTyxTQUFtQztBQUM1RCxVQUFNLFdBQWdCLFVBQUssYUFBYSxJQUFJO0FBQzVDLFFBQUk7QUFDRixZQUFTLFNBQU0sUUFBUTtBQUN2QixhQUFPO0FBQUEsSUFDVCxTQUFTLE9BQWdCO0FBQ3ZCLFVBQUssTUFBZ0MsU0FBUyxVQUFVO0FBQ3RELGNBQU07QUFBQSxNQUNSO0FBQUEsSUFDRjtBQUNBLFVBQU0saUJBQXNCLFVBQUssWUFBWSxJQUFJO0FBR2pELFVBQU0sU0FBUyxNQUFTLFlBQVMsY0FBYztBQUMvQyxVQUFNLGlCQUFzQixhQUFRLFlBQVksTUFBTTtBQUN0RCxRQUFJLG1CQUFtQixnQkFBZ0I7QUFDckMsYUFBTztBQUFBLElBQ1Q7QUFFQSxVQUFTLFdBQVEsZ0JBQWdCLFFBQVE7QUFDekMsV0FBTztBQUFBLEVBQ1Q7QUFFQSxRQUFNLFVBQVUsTUFBTSxRQUFRLElBQUksU0FBUyxJQUFJLENBQUMsTUFBTSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDMUUsU0FBTyxRQUFRLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUNsQztBQWdCQSxlQUFzQixtQkFBbUIsTUFBa0Q7QUFDekYsUUFBTSxFQUFFLG1CQUFtQixnQkFBZ0IsSUFBSTtBQUUvQyxNQUFJO0FBQ0YsVUFBUyxTQUFNLGlCQUFpQjtBQUFBLEVBQ2xDLFNBQVMsT0FBZ0I7QUFDdkIsUUFBSyxNQUFnQyxTQUFTLFVBQVU7QUFDdEQsYUFBTztBQUFBLElBQ1Q7QUFDQSxVQUFNO0FBQUEsRUFDUjtBQUVBLE1BQUk7QUFDRixVQUFNLFlBQVksTUFBUyxTQUFNLGVBQWU7QUFDaEQsUUFBSSxVQUFVLGVBQWUsR0FBRztBQUM5QixZQUFTLFVBQU8sZUFBZTtBQUFBLElBQ2pDO0FBQUEsRUFDRixTQUFTLE9BQWdCO0FBQ3ZCLFFBQUssTUFBZ0MsU0FBUyxVQUFVO0FBQ3RELFlBQU07QUFBQSxJQUNSO0FBQUEsRUFDRjtBQUVBLFFBQVMsU0FBTSxpQkFBaUIsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUVuRCxRQUFNLFVBQVUsTUFBUyxXQUFRLG1CQUFtQixFQUFFLGVBQWUsS0FBSyxDQUFDO0FBQzNFLFFBQU0sU0FBUyxNQUFNLFFBQVE7QUFBQSxJQUMzQixRQUFRLElBQUksT0FBTyxVQUEyQjtBQUM1QyxZQUFNLGFBQWtCLFVBQUssbUJBQW1CLE1BQU0sSUFBSTtBQUMxRCxZQUFNLFdBQWdCLFVBQUssaUJBQWlCLE1BQU0sSUFBSTtBQUV0RCxVQUFJLE1BQU0sZUFBZSxHQUFHO0FBQzFCLGNBQU0sU0FBUyxNQUFTLFlBQVMsVUFBVTtBQUMzQyxZQUFJLGtCQUFrQixNQUFNLEdBQUc7QUFDN0IsZ0JBQVMsV0FBUSxRQUFRLFFBQVE7QUFDakMsaUJBQU87QUFBQSxRQUNULE9BQU87QUFDTCxnQkFBUyxXQUFRLFlBQVksUUFBUTtBQUNyQyxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGLFdBQVcsTUFBTSxZQUFZLEtBQUssTUFBTSxLQUFLLFdBQVcsR0FBRyxHQUFHO0FBQzVELGNBQVMsU0FBTSxVQUFVLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFDNUMsY0FBTSxlQUFlLE1BQVMsV0FBUSxZQUFZLEVBQUUsZUFBZSxLQUFLLENBQUM7QUFDekUsY0FBTSxjQUFjLE1BQU0sUUFBUTtBQUFBLFVBQ2hDLGFBQWEsSUFBSSxPQUFPLGVBQWdDO0FBQ3RELGtCQUFNLGtCQUF1QixVQUFLLFlBQVksV0FBVyxJQUFJO0FBQzdELGtCQUFNLGdCQUFxQixVQUFLLFVBQVUsV0FBVyxJQUFJO0FBRXpELGdCQUFJLFdBQVcsZUFBZSxHQUFHO0FBQy9CLG9CQUFNLFNBQVMsTUFBUyxZQUFTLGVBQWU7QUFDaEQsa0JBQUksa0JBQWtCLE1BQU0sR0FBRztBQUM3QixzQkFBUyxXQUFRLFFBQVEsYUFBYTtBQUN0Qyx1QkFBTztBQUFBLGNBQ1QsT0FBTztBQUNMLHNCQUFTLFdBQVEsaUJBQWlCLGFBQWE7QUFDL0MsdUJBQU87QUFBQSxjQUNUO0FBQUEsWUFDRixPQUFPO0FBQ0wsb0JBQVMsV0FBUSxpQkFBaUIsYUFBYTtBQUMvQyxxQkFBTztBQUFBLFlBQ1Q7QUFBQSxVQUNGLENBQUM7QUFBQSxRQUNIO0FBQ0EsZUFBTyxZQUFZLE9BQU8sQ0FBQyxLQUFLLE1BQU0sTUFBTSxHQUFHLENBQUM7QUFBQSxNQUNsRCxPQUFPO0FBQ0wsY0FBUyxXQUFRLFlBQVksUUFBUTtBQUNyQyxlQUFPO0FBQUEsTUFDVDtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFFQSxTQUFPLE9BQU8sT0FBTyxDQUFDLEtBQUssTUFBTSxNQUFNLEdBQUcsQ0FBQztBQUM3QztBQWdCQSxlQUFzQixzQkFBc0IsTUFBcUQ7QUFDL0YsUUFBTSxFQUFFLFlBQVksYUFBYSxTQUFTLElBQUk7QUFFOUMsTUFBSTtBQUNKLE1BQUk7QUFDRixVQUFNLHFCQUFxQixNQUFTLFlBQWMsVUFBSyxVQUFVLGNBQWMsR0FBRyxPQUFPO0FBQ3pGLGtCQUFjLEtBQUssTUFBTSxrQkFBa0I7QUFBQSxFQUM3QyxTQUFTLE9BQWdCO0FBQ3ZCLFFBQUssTUFBZ0MsU0FBUyxVQUFVO0FBQ3RELGFBQU87QUFBQSxJQUNUO0FBQ0EsVUFBTTtBQUFBLEVBQ1I7QUFFQSxNQUFJLENBQUMsWUFBWSxZQUFZO0FBQzNCLFdBQU87QUFBQSxFQUNUO0FBRUEsTUFBSSxhQUFhO0FBRWpCLGdCQUFjLE1BQU0sbUJBQW1CO0FBQUEsSUFDckMsbUJBQXdCLFVBQUssWUFBWSxjQUFjO0FBQUEsSUFDdkQsaUJBQXNCLFVBQUssYUFBYSxjQUFjO0FBQUEsRUFDeEQsQ0FBQztBQUVELFFBQU0sY0FBbUIsVUFBSyxZQUFZLFVBQVU7QUFDcEQsTUFBSTtBQUNGLFVBQU0saUJBQWlCLE1BQVMsV0FBUSxhQUFhLEVBQUUsZUFBZSxLQUFLLENBQUM7QUFDNUUsZUFBVyxTQUFTLGdCQUFnQjtBQUNsQyxVQUFJLE1BQU0sWUFBWSxHQUFHO0FBQ3ZCLGNBQU0saUJBQXNCLFVBQUssYUFBYSxNQUFNLE1BQU0sY0FBYztBQUN4RSxZQUFJLG9CQUFvQjtBQUN4QixZQUFJO0FBQ0YsZ0JBQVMsU0FBTSxjQUFjO0FBQzdCLDhCQUFvQjtBQUFBLFFBQ3RCLFNBQVMsT0FBZ0I7QUFDdkIsY0FBSyxNQUFnQyxTQUFTLFVBQVU7QUFDdEQsa0JBQU07QUFBQSxVQUNSO0FBQUEsUUFDRjtBQUNBLFlBQUksbUJBQW1CO0FBQ3JCLGdCQUFNLGlCQUFzQixVQUFLLGFBQWEsWUFBWSxNQUFNLElBQUk7QUFDcEUsZ0JBQVMsU0FBTSxnQkFBZ0IsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUNsRCx3QkFBYyxNQUFNLG1CQUFtQjtBQUFBLFlBQ3JDLG1CQUFtQjtBQUFBLFlBQ25CLGlCQUFzQixVQUFLLGdCQUFnQixjQUFjO0FBQUEsVUFDM0QsQ0FBQztBQUFBLFFBQ0g7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0YsU0FBUyxPQUFnQjtBQUN2QixRQUFLLE1BQWdDLFNBQVMsVUFBVTtBQUN0RCxZQUFNO0FBQUEsSUFDUjtBQUFBLEVBQ0Y7QUFFQSxTQUFPO0FBQ1Q7QUFrQkEsZUFBc0IsaUJBQWlCLE1BQThDO0FBQ25GLFFBQU0sRUFBRSxhQUFhLFVBQVUsYUFBYSxNQUFNLElBQUk7QUFFdEQsUUFBTSxFQUFFLFFBQVEsT0FBTyxJQUFJLE1BQU0sY0FBYyxPQUFPLENBQUMsTUFBTSxhQUFhLGFBQWEsV0FBVyxHQUFHO0FBQUEsSUFDbkcsU0FBUztBQUFBLEVBQ1gsQ0FBQztBQUNELFFBQU0sY0FBbUIsVUFBSyxPQUFPLEtBQUssR0FBRyxRQUFRLFNBQVM7QUFDOUQsUUFBUyxTQUFXLGFBQVEsV0FBVyxHQUFHLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFFN0QsUUFBTSxRQUFRLENBQUMsd0NBQXdDO0FBRXZELGFBQVcsT0FBTyxhQUFhO0FBQzdCLFFBQUksQ0FBQyxJQUFLO0FBQ1YsUUFBSTtBQUNGLFlBQU0sUUFBUSxNQUFTLFNBQVcsVUFBSyxhQUFhLEdBQUcsQ0FBQztBQUN4RCxVQUFJLE1BQU0sZUFBZSxFQUFHLE9BQU0sS0FBSyxHQUFHO0FBQUEsSUFDNUMsU0FBUyxPQUFnQjtBQUN2QixVQUFLLE1BQWdDLFNBQVMsVUFBVTtBQUN0RCxjQUFNO0FBQUEsTUFDUjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBRUEsYUFBVyxRQUFRLE9BQU87QUFDeEIsUUFBSSxDQUFDLEtBQU07QUFDWCxRQUFJO0FBQ0YsWUFBTSxRQUFRLE1BQVMsU0FBVyxVQUFLLGFBQWEsSUFBSSxDQUFDO0FBQ3pELFVBQUksTUFBTSxlQUFlLEVBQUcsT0FBTSxLQUFLLElBQUk7QUFBQSxJQUM3QyxTQUFTLE9BQWdCO0FBQ3ZCLFVBQUssTUFBZ0MsU0FBUyxVQUFVO0FBQ3RELGNBQU07QUFBQSxNQUNSO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFQSxRQUFTLGNBQVcsYUFBYSxHQUFHLE1BQU0sS0FBSyxJQUFJLENBQUM7QUFBQSxDQUFJO0FBRXhELE1BQUk7QUFDRixVQUFNLGNBQWMsT0FBTyxDQUFDLE1BQU0sVUFBVSxVQUFVLDZCQUE2QixNQUFNLEdBQUcsRUFBRSxTQUFTLElBQU0sQ0FBQztBQUFBLEVBQ2hILFNBQVMsT0FBZ0I7QUFDdkIsWUFBUSxPQUFPO0FBQUEsTUFDYiw0REFBNEQsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSyxDQUFDO0FBQUE7QUFBQSxJQUNwSDtBQUFBLEVBQ0Y7QUFFQSxNQUFJO0FBQ0YsVUFBTSxjQUFjLE9BQU8sQ0FBQyxNQUFNLGFBQWEsVUFBVSxjQUFjLHFCQUFxQixXQUFXLEdBQUc7QUFBQSxNQUN4RyxTQUFTO0FBQUEsSUFDWCxDQUFDO0FBQUEsRUFDSCxTQUFTLE9BQWdCO0FBQ3ZCLFlBQVEsT0FBTztBQUFBLE1BQ2IscURBQXFELGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUssQ0FBQztBQUFBO0FBQUEsSUFDN0c7QUFBQSxFQUNGO0FBQ0Y7OztBRHhtQkEsSUFBTUMsaUJBQWdCQyxXQUFVQyxTQUFRO0FBT2pDLFNBQVMsYUFBYSxPQUF3QjtBQUNuRCxTQUFPLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDOUQ7QUFTTyxTQUFTLHlCQUFpQztBQUMvQyxRQUFNLGdCQUFnQixRQUFRLElBQUksZUFBZSxjQUFjO0FBQy9ELE1BQUksQ0FBQyxlQUFlO0FBQ2xCLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLGNBQWMsRUFBRTtBQUFBLEVBQzNGO0FBQ0EsU0FBWSxXQUFLLGVBQWUsUUFBUSxhQUFhO0FBQ3ZEO0FBY08sU0FBUyxvQkFBb0IsaUJBQWlDO0FBQ25FLFNBQU8sS0FBSyxVQUFVO0FBQUEsSUFDcEIsZ0JBQWdCLEVBQUUsNEJBQTRCLEtBQUs7QUFBQSxJQUNuRCx3QkFBd0I7QUFBQSxNQUN0QixvQkFBb0I7QUFBQSxRQUNsQixRQUFRLEVBQUUsUUFBUSxhQUFhLE1BQU0sZ0JBQWdCO0FBQUEsTUFDdkQ7QUFBQSxJQUNGO0FBQUEsRUFDRixDQUFDO0FBQ0g7QUFXQSxlQUFzQix5QkFBaUQ7QUFDckUsUUFBTSxPQUFPLFFBQVE7QUFDckIsUUFBTSxhQUF1QixDQUFDO0FBRTlCLFFBQU0sa0JBQWtCLFFBQVEsSUFBSSxtQkFBbUI7QUFDdkQsTUFBSSxnQkFBaUIsWUFBVyxLQUFLLGVBQWU7QUFFcEQsUUFBTSxjQUFjLFFBQVEsSUFBSSxlQUFlO0FBQy9DLE1BQUksWUFBYSxZQUFXLEtBQVUsV0FBSyxhQUFhLFFBQVEsQ0FBQztBQUVqRSxRQUFNLGdCQUFnQixRQUFRLElBQUksaUJBQWlCO0FBQ25ELE1BQUksY0FBZSxZQUFXLEtBQVUsV0FBSyxlQUFlLFFBQVEsQ0FBQztBQUVyRSxhQUFXLEtBQVUsV0FBSyxNQUFNLFdBQVcsUUFBUSxDQUFDO0FBQ3BELGFBQVcsS0FBVSxXQUFLLE1BQU0sU0FBUyxDQUFDO0FBRTFDLGFBQVcsYUFBYSxZQUFZO0FBQ2xDLFFBQUk7QUFDRixZQUFTLFdBQVksV0FBSyxXQUFXLFNBQVMsQ0FBQztBQUMvQyxhQUFPO0FBQUEsSUFDVCxRQUFRO0FBQUEsSUFFUjtBQUFBLEVBQ0Y7QUFDQSxTQUFPO0FBQ1Q7QUFTQSxlQUFlLGtCQUFrQixnQkFBZ0Q7QUFDL0UsTUFBSTtBQUNGLFVBQU0sVUFBVSxNQUFTLGFBQVMsZ0JBQWdCLE9BQU87QUFDekQsVUFBTSxTQUFTLEtBQUssTUFBTSxPQUFPO0FBQ2pDLFdBQU8sT0FBTyxXQUFXO0FBQUEsRUFDM0IsUUFBUTtBQUNOLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFlQSxlQUFzQiw4QkFDcEIsaUJBQ0FDLFNBQ2U7QUFDZixRQUFNLFlBQVksTUFBTSx1QkFBdUI7QUFDL0MsTUFBSSxDQUFDLFdBQVc7QUFDZCxJQUFBQSxRQUFPLE1BQU0sNkVBQTZFO0FBQzFGO0FBQUEsRUFDRjtBQUVBLFFBQU0sWUFBaUIsV0FBSyxXQUFXLFdBQVcseUJBQXlCO0FBQzNFLE1BQUk7QUFDSixNQUFJO0FBQ0YsVUFBTSxNQUFTLGFBQVMsV0FBVyxPQUFPO0FBQUEsRUFDNUMsU0FBUyxPQUFnQjtBQUN2QixRQUFJLGlCQUFpQixTQUFTLFVBQVUsU0FBUyxNQUFNLFNBQVMsVUFBVTtBQUN4RSxNQUFBQSxRQUFPLE1BQU0sNkNBQTZDO0FBQzFEO0FBQUEsSUFDRjtBQUNBLFVBQU07QUFBQSxFQUNSO0FBRUEsUUFBTSxPQUFPLEtBQUssTUFBTSxHQUFHO0FBSTNCLFFBQU0sUUFBUSxLQUFLLGtCQUFrQjtBQUNyQyxNQUFJLENBQUMsT0FBTyxVQUFVLE1BQU0sT0FBTyxXQUFXLFlBQWE7QUFFM0QsTUFBSSxNQUFNLE9BQU8sU0FBUyxtQkFBbUIsTUFBTSxvQkFBb0IsaUJBQWlCO0FBQ3RGLElBQUFBLFFBQU8sTUFBTSw2REFBNkQ7QUFDMUU7QUFBQSxFQUNGO0FBRUEsUUFBTSxPQUFPLE9BQU87QUFDcEIsUUFBTSxrQkFBa0I7QUFDeEIsUUFBTSxlQUFjLG9CQUFJLEtBQUssR0FBRSxZQUFZO0FBQzNDLFFBQVMsY0FBVSxXQUFXLEdBQUcsS0FBSyxVQUFVLE1BQU0sTUFBTSxDQUFDLENBQUM7QUFBQSxDQUFJO0FBQ2xFLEVBQUFBLFFBQU8sS0FBSyx3REFBd0QsRUFBRSxnQkFBZ0IsQ0FBQztBQUN6RjtBQWVBLGVBQXNCLHVCQUF1QixpQkFBeUJBLFNBQWdEO0FBQ3BILFFBQU0saUJBQWlCLE1BQU07QUFBQSxJQUN0QixXQUFLLGlCQUFpQixXQUFXLFdBQVcsa0JBQWtCLGFBQWE7QUFBQSxFQUNsRjtBQUNBLE1BQUksQ0FBQyxnQkFBZ0I7QUFDbkIsSUFBQUEsUUFBTyxLQUFLLHdFQUF3RTtBQUNwRjtBQUFBLEVBQ0Y7QUFFQSxRQUFNLFlBQVksTUFBTSx1QkFBdUI7QUFDL0MsTUFBSSxDQUFDLFdBQVc7QUFDZCxJQUFBQSxRQUFPLE1BQU0sNERBQTREO0FBQ3pFO0FBQUEsRUFDRjtBQUVBLFFBQU0sV0FBZ0IsV0FBSyxXQUFXLFdBQVcsU0FBUyxvQkFBb0IsU0FBUztBQUN2RixNQUFJO0FBQ0osTUFBSTtBQUNGLGNBQVUsTUFBUyxZQUFRLFFBQVE7QUFBQSxFQUNyQyxRQUFRO0FBRU47QUFBQSxFQUNGO0FBRUEsTUFBSSxRQUFRLFdBQVcsRUFBRztBQUcxQixRQUFNLGVBQWUsZUFBZSxNQUFNLEdBQUcsRUFBRSxJQUFJLE1BQU07QUFDekQsTUFBSSxXQUFXO0FBRWYsYUFBVyxTQUFTLFNBQVM7QUFDM0IsVUFBTSxRQUFRLE1BQU0sTUFBTSxHQUFHLEVBQUUsSUFBSSxNQUFNO0FBQ3pDLFFBQUksTUFBTSxLQUFLLE9BQU8sS0FBSyxLQUFLLE1BQU0sV0FBVyxFQUFHO0FBR3BELGFBQVMsSUFBSSxHQUFHLElBQUksR0FBRyxLQUFLO0FBQzFCLFlBQU0sU0FBUyxNQUFNLENBQUMsS0FBSztBQUMzQixZQUFNLFVBQVUsYUFBYSxDQUFDLEtBQUs7QUFDbkMsVUFBSSxTQUFTLFNBQVM7QUFDcEIsbUJBQVc7QUFDWDtBQUFBLE1BQ0Y7QUFDQSxVQUFJLFNBQVMsUUFBUztBQUFBLElBQ3hCO0FBQ0EsUUFBSSxTQUFVO0FBQUEsRUFDaEI7QUFFQSxNQUFJLENBQUMsVUFBVTtBQUNiLElBQUFBLFFBQU8sTUFBTSxzQ0FBc0MsRUFBRSxnQkFBZ0IsZ0JBQWdCLFFBQVEsQ0FBQztBQUM5RjtBQUFBLEVBQ0Y7QUFFQSxFQUFBQSxRQUFPLEtBQUssdUNBQXVDLEVBQUUsZ0JBQWdCLGdCQUFnQixRQUFRLENBQUM7QUFDOUYsUUFBUyxPQUFHLFVBQVUsRUFBRSxXQUFXLE1BQU0sT0FBTyxLQUFLLENBQUM7QUFDeEQ7QUFhTyxTQUFTLFVBQ2QsUUFDQSxXQUNBLFFBQ0EsTUFDQSxjQUNBLGlCQUNVO0FBQ1YsUUFBTSxPQUFpQixDQUFDO0FBRXhCLE1BQUksUUFBUTtBQUNWLFNBQUssS0FBSyxZQUFZLFNBQVM7QUFBQSxFQUNqQyxPQUFPO0FBQ0wsU0FBSyxLQUFLLE1BQU07QUFDaEIsU0FBSyxLQUFLLGdCQUFnQixTQUFTO0FBQUEsRUFDckM7QUFDQSxPQUFLLEtBQUssY0FBYyxvQkFBb0IsZUFBZSxDQUFDO0FBQzVELE9BQUssS0FBSyxhQUFhLFlBQVk7QUFDbkMsTUFBSSxTQUFTLGNBQWM7QUFDekIsU0FBSyxLQUFLLFNBQVM7QUFBQSxFQUNyQjtBQUVBLFNBQU87QUFDVDtBQVFBLGVBQXNCLGtCQUFrQixlQUF3QztBQUM5RSxRQUFNLEVBQUUsT0FBTyxJQUFJLE1BQU1ILGVBQWMsT0FBTyxDQUFDLGFBQWEsZ0JBQWdCLE1BQU0sR0FBRztBQUFBLElBQ25GLEtBQUs7QUFBQSxFQUNQLENBQUM7QUFDRCxTQUFPLE9BQU8sS0FBSztBQUNyQjtBQVFBLGVBQWUscUJBQXFCLGNBQXdDO0FBQzFFLE1BQUk7QUFDRixVQUFTLFdBQU8sWUFBWTtBQUM1QixXQUFPO0FBQUEsRUFDVCxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQWNBLGVBQXNCLHdCQUNwQixPQUNBLFFBQ0EsWUFDQUcsU0FDNkU7QUFDN0UsUUFBTSxFQUFFLFNBQVMsSUFBSSxNQUFNLE9BQU8sWUFBWSxNQUFNLFFBQVEsRUFBRSxlQUFlLE1BQU0sY0FBYyxDQUFDO0FBR2xHLGFBQVcsVUFBVSxVQUFVO0FBQzdCLFFBQUksQ0FBQyxPQUFPLFVBQVUsQ0FBQyxPQUFPLFNBQVU7QUFDeEMsUUFBSSxDQUFFLE1BQU0scUJBQXFCLE9BQU8sUUFBUSxFQUFJO0FBRXBELFVBQU0sZUFBZSxPQUFPLGdCQUFnQjtBQUU1QyxJQUFBQSxRQUFPLEtBQUssNkJBQTZCLEVBQUUsUUFBUSxPQUFPLE1BQU0sVUFBVSxPQUFPLFNBQVMsQ0FBQztBQUMzRixXQUFPLEVBQUUsY0FBYyxPQUFPLFVBQVUsWUFBWSxPQUFPLE1BQU0sYUFBYTtBQUFBLEVBQ2hGO0FBT0EsUUFBTSxTQUFTLFNBQVMsTUFBTSxNQUFNO0FBQ3BDLFFBQU0sa0JBQWtCLFNBQ3JCLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxXQUFXLE1BQU0sQ0FBQyxFQUN2QyxJQUFJLENBQUMsTUFBTSxTQUFTLEVBQUUsS0FBSyxNQUFNLE9BQU8sTUFBTSxHQUFHLEVBQUUsQ0FBQyxFQUNwRCxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUM7QUFDakMsTUFBSSxhQUFhLGdCQUFnQixTQUFTLElBQUksS0FBSyxJQUFJLEdBQUcsZUFBZSxJQUFJLElBQUk7QUFFakYsUUFBTSxFQUFFLFNBQVMsSUFBSSxNQUFNLGFBQWEsTUFBTSxhQUFhO0FBQzNELFNBQU8sTUFBTSxvQkFBb0IsVUFBZSxXQUFLLFVBQVUsY0FBYyxHQUFHLE1BQU0sR0FBRyxVQUFVLEVBQUUsQ0FBQyxHQUFHO0FBQ3ZHLElBQUFBLFFBQU8sS0FBSywyREFBMkQ7QUFBQSxNQUNyRSxRQUFRLEdBQUcsTUFBTSxHQUFHLFVBQVU7QUFBQSxJQUNoQyxDQUFDO0FBQ0Q7QUFBQSxFQUNGO0FBRUEsUUFBTSxhQUFhLEdBQUcsTUFBTSxHQUFHLFVBQVU7QUFDekMsUUFBTSxTQUFTLE1BQU0sZUFBZSxZQUFZLEVBQUUsS0FBSyxNQUFNLGNBQWMsQ0FBQztBQUM1RSxRQUFNLE9BQU8sVUFBVSxNQUFNLFFBQVEsRUFBRSxNQUFNLFlBQVksVUFBVSxPQUFPLFVBQVUsY0FBYyxXQUFXLENBQUM7QUFFOUcsRUFBQUEsUUFBTyxLQUFLLHdCQUF3QixFQUFFLFFBQVEsWUFBWSxVQUFVLE9BQU8sU0FBUyxDQUFDO0FBQ3JGLFNBQU8sRUFBRSxjQUFjLE9BQU8sVUFBVSxZQUFZLGNBQWMsV0FBVztBQUMvRTtBQWFBLGVBQWUsZUFDYixNQUNBLE9BQ0EsWUFDQUEsU0FDZTtBQUNmLE1BQUk7QUFDRixVQUFNLEtBQUs7QUFBQSxFQUNiLFNBQVMsT0FBTztBQUNkLElBQUFBLFFBQU8sS0FBSyxPQUFPLEVBQUUsUUFBUSxZQUFZLE9BQU8sYUFBYSxLQUFLLEVBQUUsQ0FBQztBQUFBLEVBQ3ZFO0FBQ0Y7QUFjQSxlQUFzQixzQkFDcEIsT0FDQSxRQUNBLFlBQ0FBLFNBQ2U7QUFDZixRQUFNLEVBQUUsU0FBUyxJQUFJLE1BQU0sT0FBTyxZQUFZLE1BQU0sUUFBUSxFQUFFLGVBQWUsTUFBTSxjQUFjLENBQUM7QUFFbEcsYUFBVyxVQUFVLFVBQVU7QUFDN0IsUUFBSSxDQUFDLE9BQU8sT0FBUTtBQUVwQixRQUFJO0FBRUYsWUFBTUgsZUFBYyxPQUFPLENBQUMsY0FBYyxpQkFBaUIsT0FBTyxNQUFNLFVBQVUsR0FBRztBQUFBLFFBQ25GLEtBQUssTUFBTTtBQUFBLE1BQ2IsQ0FBQztBQUFBLElBQ0gsUUFBUTtBQUVOLE1BQUFHLFFBQU8sTUFBTSx1Q0FBdUMsRUFBRSxRQUFRLE9BQU8sS0FBSyxDQUFDO0FBQzNFO0FBQUEsSUFDRjtBQUdBLFFBQUksT0FBTyxVQUFVO0FBQ25CLFlBQU07QUFBQSxRQUNKLE1BQU1ILGVBQWMsT0FBTyxDQUFDLFlBQVksVUFBVSxPQUFPLFFBQVMsR0FBRyxFQUFFLEtBQUssTUFBTSxjQUFjLENBQUM7QUFBQSxRQUNqRztBQUFBLFFBQ0EsT0FBTztBQUFBLFFBQ1BHO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFFQSxVQUFNO0FBQUEsTUFDSixNQUFNSCxlQUFjLE9BQU8sQ0FBQyxVQUFVLE1BQU0sT0FBTyxJQUFJLEdBQUcsRUFBRSxLQUFLLE1BQU0sY0FBYyxDQUFDO0FBQUEsTUFDdEY7QUFBQSxNQUNBLE9BQU87QUFBQSxNQUNQRztBQUFBLElBQ0Y7QUFFQSxVQUFNO0FBQUEsTUFDSixNQUFNLE9BQU8sYUFBYSxNQUFNLFFBQVEsT0FBTyxJQUFJO0FBQUEsTUFDbkQ7QUFBQSxNQUNBLE9BQU87QUFBQSxNQUNQQTtBQUFBLElBQ0Y7QUFFQSxJQUFBQSxRQUFPLEtBQUssNEJBQTRCLEVBQUUsUUFBUSxPQUFPLEtBQUssQ0FBQztBQUFBLEVBQ2pFO0FBQ0Y7OztBVC9aQSxJQUFPLG9CQUFRO0FBQUEsRUFDYjtBQUFBLElBQ0UsWUFBWTtBQUFBLElBQ1osYUFBYTtBQUFBLElBQ2Isd0JBQXdCO0FBQUEsSUFDeEIsU0FBUztBQUFBLEVBQ1g7QUFBQSxFQUNBLE9BQU8sT0FBb0IsWUFBMkI7QUFDcEQsVUFBTSxZQUFZLFdBQVc7QUFFN0IsVUFBTSxTQUNKO0FBRUYsWUFBUSxPQUFPLEtBQUssNEJBQTRCO0FBQUEsTUFDOUMsUUFBUSxNQUFNO0FBQUEsTUFDZCxhQUFhLE1BQU07QUFBQSxNQUNuQjtBQUFBLElBQ0YsQ0FBQztBQUVELFVBQU0sU0FBUyxJQUFJLFlBQVk7QUFBQSxNQUM3QixTQUFTLE1BQU07QUFBQSxNQUNmLGFBQWEsTUFBTTtBQUFBLElBQ3JCLENBQUM7QUFFRCxVQUFNLGFBQWEsTUFBTSxrQkFBa0IsTUFBTSxhQUFhO0FBRTlELFVBQU0saUJBQWlCLE1BQU0sd0JBQXdCLE9BQU8sUUFBUSxZQUFZLFFBQVEsTUFBTTtBQUU5RixVQUFNLEVBQUUsY0FBYyxLQUFLLFlBQVksYUFBYSxJQUFJO0FBQ3hELFlBQVEsT0FBTyxLQUFLLGtCQUFrQixFQUFFLEtBQUssUUFBUSxZQUFZLFlBQVksYUFBYSxDQUFDO0FBRTNGLFVBQU0sa0JBQWtCLHVCQUF1QjtBQUMvQyxVQUFNLDhCQUE4QixpQkFBaUIsUUFBUSxNQUFNO0FBQ25FLFVBQU0sdUJBQXVCLGlCQUFpQixRQUFRLE1BQU07QUFFNUQsVUFBTSxPQUFPLFVBQVUsUUFBUSxXQUFXLE9BQU8sTUFBTSxlQUFlLE1BQU0sY0FBYyxlQUFlO0FBRXpHLFVBQU0sUUFBc0IsTUFBTSxVQUFVLE1BQU07QUFBQSxNQUNoRDtBQUFBLE1BQ0EsT0FBTztBQUFBLE1BQ1AsS0FBSztBQUFBLFFBQ0gsR0FBRyxRQUFRO0FBQUEsUUFDWCwwQkFBMEIsbUJBQW1CLE1BQU0sTUFBTTtBQUFBLFFBQ3pELHNDQUFzQztBQUFBLFFBQ3RDLGFBQWE7QUFBQSxRQUNiLGVBQWU7QUFBQSxRQUNmLGtCQUFrQjtBQUFBLE1BQ3BCO0FBQUEsSUFDRixDQUFDO0FBRUQsWUFBUSxTQUFTLE1BQU07QUFDckIsY0FBUSxPQUFPLEtBQUssa0RBQWtELEVBQUUsVUFBVSxDQUFDO0FBQ25GLFlBQU0sS0FBSyxTQUFTO0FBQUEsSUFDdEIsQ0FBQztBQUVELFVBQU0sV0FBVyxNQUFNLElBQUksUUFBdUIsQ0FBQ0MsYUFBWTtBQUM3RCxZQUFNLEdBQUcsU0FBU0EsUUFBTztBQUFBLElBQzNCLENBQUM7QUFFRCxZQUFRLE9BQU8sS0FBSyw4QkFBOEIsRUFBRSxXQUFXLFNBQVMsQ0FBQztBQUd6RSxRQUFJO0FBQ0YsWUFBTSxzQkFBc0IsT0FBTyxRQUFRLFlBQVksUUFBUSxNQUFNO0FBQUEsSUFDdkUsU0FBUyxPQUFPO0FBQ2QsY0FBUSxPQUFPLEtBQUsseUJBQXlCO0FBQUEsUUFDM0MsT0FBTyxhQUFhLEtBQUs7QUFBQSxNQUMzQixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDRjs7O0FXeEdBLGVBQWUsaUJBQU87IiwKICAibmFtZXMiOiBbInBhdGgiLCAicmVzb2x2ZSIsICJleGVjRmlsZSIsICJmcyIsICJwYXRoIiwgInByb21pc2lmeSIsICJleGVjRmlsZUFzeW5jIiwgInByb21pc2lmeSIsICJleGVjRmlsZSIsICJsb2dnZXIiLCAicmVzb2x2ZSJdCn0K
