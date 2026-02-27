import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

import { resolve as __resolve } from 'node:path';
const __DEFAULT_LOG_DEST = ".cards/logs/cards-default-configuration-hooks.log";
const __workspace = process.env['WORKSPACE_PATH'];
if (__workspace && !process.env['CARDS_HOOKS_LOG_FILE']) {
  process.env['CARDS_HOOKS_LOG_FILE'] = __resolve(__workspace, __DEFAULT_LOG_DEST);
}

// src/actions/launch.ts
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

// src/actions/launch.ts
var launch_default = defineAction(
  {
    actionName: "Launch",
    description: "Start a Claude session for the card",
    supportsBackgroundMode: true,
    timeout: 36e5
  },
  async (input, context) => {
    const switchData = input.switchToInteractiveData;
    const [sessionId, resume] = [switchData?.sessionId ?? randomUUID(), !!switchData?.sessionId];
    const prompt = "Load the `runtime:card-repo` and `runtime:card-routing` skills then follow the `<instructions>`.";
    context.logger.info("Launch action started", {
      cardId: input.cardId,
      environment: input.environment,
      executionMode: input.executionMode,
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
    const args = buildArgs(prompt, sessionId, resume, input.executionMode, input.cardRepoPath, marketplacePath);
    const isInteractive = input.executionMode === "interactive";
    const child = spawn("claude", args, {
      cwd,
      stdio: isInteractive ? "inherit" : ["ignore", "ignore", "pipe"],
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
      context.logger.info("Launch action cancelled, terminating claude", { sessionId });
      child.kill("SIGTERM");
    });
    context.onSwitchToInteractive(() => {
      context.logger.info("Switching to interactive mode", { sessionId });
      child.kill("SIGTERM");
      return { sessionId };
    });
    if (!isInteractive) {
      child.stderr?.on("data", (chunk) => {
        const text = chunk.toString().trim();
        if (text) {
          context.logger.warn(text);
        }
      });
    }
    const exitCode = await new Promise((resolve2) => {
      child.on("close", resolve2);
    });
    context.logger.info("Launch action completed", { sessionId, exitCode });
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
executeCommand(launch_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2FjdGlvbnMvbGF1bmNoLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY2xpZW50L3R5cGVzL2Vycm9ycy50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NsaWVudC9jYXJkc0NsaWVudC50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9mYWN0b3JpZXMvYWN0aW9uLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2Vudi50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9leGl0LWNvZGVzLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2xvZ2dlci50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9zb2NrZXQtY2xpZW50LnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL3J1bnRpbWUudHMiLCAiLi4vLi4vc3JjL2xpYi9jbGF1ZGUtc2Vzc2lvbi50cyIsICIuLi8uLi9zcmMvbGliL2NyZWF0ZS13b3JrdHJlZS50cyIsICIuLi8uLi9zcmMvYWN0aW9ucy9ob29rLXdyYXBwZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogTGF1bmNoIGFjdGlvbiBmb3IgQ2xhdWRlIENvZGUgd29ya2Zsb3dzLlxuICpcbiAqIFNwYXducyB0aGUgYGNsYXVkZWAgQ0xJIGZvciB0aGUgY3VycmVudCBjYXJkLiBJbiBpbnRlcmFjdGl2ZSBtb2RlLCB0aGVcbiAqIHByb2Nlc3MgaW5oZXJpdHMgc3RkaW8gc28gdGhlIHVzZXIgZ2V0cyBkaXJlY3QgdGVybWluYWwgY29udHJvbC4gSW5cbiAqIGJhY2tncm91bmQgbW9kZSwgQ2xhdWRlIHJ1bnMgd2l0aCBgLS1wcmludGAgc28gaXQgZXhlY3V0ZXMgbm9uLWludGVyYWN0aXZlbHlcbiAqICh0YWtlcyBhIHByb21wdCwgcnVucywgYW5kIGV4aXRzKS4gVGhlIHdhdGNoZXIgaGFuZGxlcyBhbGwgdHJhbnNjcmlwdFxuICogc3RyZWFtaW5nOyBsYXVuY2gudHMgZG9lcyBub3Qgb3BlbiBhbnkgc3RyZWFtIGVuZHBvaW50LlxuICpcbiAqIFRoZSBhY3Rpb24gYXdhaXRzIHByb2Nlc3MgZXhpdCBiZWZvcmUgcmVzb2x2aW5nLCBzbyB0aGUgdGVybWluYWwgY2xvc2VzXG4gKiBvbmx5IGFmdGVyIENsYXVkZSBmaW5pc2hlcyBhbmQgY2xlYW51cCBpcyBjb21wbGV0ZS5cbiAqXG4gKiBAc3VtbWFyeSBMYXVuY2ggYWN0aW9uIGZvciBDbGF1ZGUgQ29kZSB3b3JrZmxvd3NcbiAqIEBtb2R1bGVcbiAqIEBzZWUge0BsaW5rIGRlZmluZUFjdGlvbn0gZm9yIGZhY3RvcnkgYmVoYXZpb3IgYW5kIG1ldGFkYXRhIGF0dGFjaG1lbnRcbiAqL1xuXG5pbXBvcnQgeyB0eXBlIENoaWxkUHJvY2Vzcywgc3Bhd24gfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gJ25vZGU6Y3J5cHRvJztcbmltcG9ydCB7IENhcmRzQ2xpZW50IH0gZnJvbSAnQGNhcmRzL3Nkay9jbGllbnQnO1xuaW1wb3J0IHsgdHlwZSBBY3Rpb25Db250ZXh0LCB0eXBlIEFjdGlvbklucHV0LCBkZWZpbmVBY3Rpb24gfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG5pbXBvcnQge1xuICBidWlsZEFyZ3MsXG4gIGNsZWFudXBNZXJnZWRCcmFuY2hlcyxcbiAgZXJyb3JNZXNzYWdlLFxuICBldmljdFN0YWxlUnVudGltZUNhY2hlLFxuICByZXNvbHZlQmFzZUJyYW5jaCxcbiAgcmVzb2x2ZU1hcmtldHBsYWNlUGF0aCxcbiAgcmVzb2x2ZU9yQ3JlYXRlV29ya3RyZWUsXG4gIHVwZGF0ZU1hcmtldHBsYWNlUmVnaXN0cmF0aW9uXG59IGZyb20gJy4uL2xpYi9jbGF1ZGUtc2Vzc2lvbi5qcyc7XG5cbi8qKlxuICogTGF1bmNoIGFjdGlvbiBoYW5kbGVyLlxuICpcbiAqIFNwYXducyB0aGUgYGNsYXVkZWAgQ0xJIGFzIGEgY2hpbGQgcHJvY2VzcywgcHJvdmlkaW5nIHRoZSBjYXJkIElEIGFuZFxuICogcmVwb3NpdG9yeSBwYXRoIGFzIHByb21wdCBjb250ZXh0LiBUaGUgcHJvY2VzcyBsaWZlY3ljbGUgaXMgdGllZCB0byB0aGVcbiAqIGFjdGlvbjogY2FuY2VsbGF0aW9uIHNlbmRzIFNJR1RFUk0sIGFuZCBzd2l0Y2hpbmcgdG8gaW50ZXJhY3RpdmUgbW9kZVxuICogcHJlc2VydmVzIHRoZSBzZXNzaW9uIElEIGZvciByZXN1bXB0aW9uLlxuICovXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVBY3Rpb24oXG4gIHtcbiAgICBhY3Rpb25OYW1lOiAnTGF1bmNoJyxcbiAgICBkZXNjcmlwdGlvbjogJ1N0YXJ0IGEgQ2xhdWRlIHNlc3Npb24gZm9yIHRoZSBjYXJkJyxcbiAgICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiB0cnVlLFxuICAgIHRpbWVvdXQ6IDM2MDAwMDBcbiAgfSxcbiAgYXN5bmMgKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHN3aXRjaERhdGEgPSBpbnB1dC5zd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSBhcyB7IHNlc3Npb25JZD86IHN0cmluZyB9IHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IFtzZXNzaW9uSWQsIHJlc3VtZV0gPSBbc3dpdGNoRGF0YT8uc2Vzc2lvbklkID8/IHJhbmRvbVVVSUQoKSwgISFzd2l0Y2hEYXRhPy5zZXNzaW9uSWRdO1xuXG4gICAgY29uc3QgcHJvbXB0ID0gJ0xvYWQgdGhlIGBydW50aW1lOmNhcmQtcmVwb2AgYW5kIGBydW50aW1lOmNhcmQtcm91dGluZ2Agc2tpbGxzIHRoZW4gZm9sbG93IHRoZSBgPGluc3RydWN0aW9ucz5gLic7XG5cbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdMYXVuY2ggYWN0aW9uIHN0YXJ0ZWQnLCB7XG4gICAgICBjYXJkSWQ6IGlucHV0LmNhcmRJZCxcbiAgICAgIGVudmlyb25tZW50OiBpbnB1dC5lbnZpcm9ubWVudCxcbiAgICAgIGV4ZWN1dGlvbk1vZGU6IGlucHV0LmV4ZWN1dGlvbk1vZGUsXG4gICAgICBzZXNzaW9uSWRcbiAgICB9KTtcblxuICAgIGNvbnN0IGNsaWVudCA9IG5ldyBDYXJkc0NsaWVudCh7XG4gICAgICBiYXNlVXJsOiBpbnB1dC5hcGlCYXNlVXJsLFxuICAgICAgYWNjZXNzVG9rZW46IGlucHV0LmFwaUFjY2Vzc1Rva2VuXG4gICAgfSk7XG5cbiAgICBjb25zdCBiYXNlQnJhbmNoID0gYXdhaXQgcmVzb2x2ZUJhc2VCcmFuY2goaW5wdXQud29ya3NwYWNlUGF0aCk7XG5cbiAgICBjb25zdCB3b3JrdHJlZVJlc3VsdCA9IGF3YWl0IHJlc29sdmVPckNyZWF0ZVdvcmt0cmVlKGlucHV0LCBjbGllbnQsIGJhc2VCcmFuY2gsIGNvbnRleHQubG9nZ2VyKTtcblxuICAgIGNvbnN0IHsgd29ya3RyZWVQYXRoOiBjd2QsIGJyYW5jaE5hbWUsIHBhcmVudEJyYW5jaCB9ID0gd29ya3RyZWVSZXN1bHQ7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbygnVXNpbmcgd29ya3RyZWUnLCB7IGN3ZCwgYnJhbmNoOiBicmFuY2hOYW1lLCBiYXNlQnJhbmNoLCBwYXJlbnRCcmFuY2ggfSk7XG5cbiAgICBjb25zdCBtYXJrZXRwbGFjZVBhdGggPSByZXNvbHZlTWFya2V0cGxhY2VQYXRoKCk7XG4gICAgYXdhaXQgdXBkYXRlTWFya2V0cGxhY2VSZWdpc3RyYXRpb24obWFya2V0cGxhY2VQYXRoLCBjb250ZXh0LmxvZ2dlcik7XG4gICAgYXdhaXQgZXZpY3RTdGFsZVJ1bnRpbWVDYWNoZShtYXJrZXRwbGFjZVBhdGgsIGNvbnRleHQubG9nZ2VyKTtcblxuICAgIGNvbnN0IGFyZ3MgPSBidWlsZEFyZ3MocHJvbXB0LCBzZXNzaW9uSWQsIHJlc3VtZSwgaW5wdXQuZXhlY3V0aW9uTW9kZSwgaW5wdXQuY2FyZFJlcG9QYXRoLCBtYXJrZXRwbGFjZVBhdGgpO1xuICAgIGNvbnN0IGlzSW50ZXJhY3RpdmUgPSBpbnB1dC5leGVjdXRpb25Nb2RlID09PSAnaW50ZXJhY3RpdmUnO1xuXG4gICAgY29uc3QgY2hpbGQ6IENoaWxkUHJvY2VzcyA9IHNwYXduKCdjbGF1ZGUnLCBhcmdzLCB7XG4gICAgICBjd2QsXG4gICAgICBzdGRpbzogaXNJbnRlcmFjdGl2ZSA/ICdpbmhlcml0JyA6IFsnaWdub3JlJywgJ2lnbm9yZScsICdwaXBlJ10sXG4gICAgICBlbnY6IHtcbiAgICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAgIENMQVVERV9DT0RFX1RBU0tfTElTVF9JRDogYGNhcmRzLWV4dGVuc2lvbi0ke2lucHV0LmNhcmRJZH1gLFxuICAgICAgICBDTEFVREVfQ09ERV9FWFBFUklNRU5UQUxfQUdFTlRfVEVBTVM6ICcxJyxcbiAgICAgICAgQkFTRV9CUkFOQ0g6IGJhc2VCcmFuY2gsXG4gICAgICAgIFBBUkVOVF9CUkFOQ0g6IHBhcmVudEJyYW5jaCxcbiAgICAgICAgV09SS1NQQUNFX0JSQU5DSDogYnJhbmNoTmFtZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29udGV4dC5vbkNhbmNlbCgoKSA9PiB7XG4gICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdMYXVuY2ggYWN0aW9uIGNhbmNlbGxlZCwgdGVybWluYXRpbmcgY2xhdWRlJywgeyBzZXNzaW9uSWQgfSk7XG4gICAgICBjaGlsZC5raWxsKCdTSUdURVJNJyk7XG4gICAgfSk7XG5cbiAgICBjb250ZXh0Lm9uU3dpdGNoVG9JbnRlcmFjdGl2ZSgoKSA9PiB7XG4gICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdTd2l0Y2hpbmcgdG8gaW50ZXJhY3RpdmUgbW9kZScsIHsgc2Vzc2lvbklkIH0pO1xuICAgICAgY2hpbGQua2lsbCgnU0lHVEVSTScpO1xuICAgICAgcmV0dXJuIHsgc2Vzc2lvbklkIH07XG4gICAgfSk7XG5cbiAgICAvLyBCYWNrZ3JvdW5kIG1vZGU6IGNhcHR1cmUgc3RkZXJyIGZvciBkaWFnbm9zdGljIGxvZ2dpbmdcbiAgICBpZiAoIWlzSW50ZXJhY3RpdmUpIHtcbiAgICAgIGNoaWxkLnN0ZGVycj8ub24oJ2RhdGEnLCAoY2h1bms6IEJ1ZmZlcikgPT4ge1xuICAgICAgICBjb25zdCB0ZXh0ID0gY2h1bmsudG9TdHJpbmcoKS50cmltKCk7XG4gICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgY29udGV4dC5sb2dnZXIud2Fybih0ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgZXhpdENvZGUgPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXIgfCBudWxsPigocmVzb2x2ZSkgPT4ge1xuICAgICAgY2hpbGQub24oJ2Nsb3NlJywgcmVzb2x2ZSk7XG4gICAgfSk7XG5cbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdMYXVuY2ggYWN0aW9uIGNvbXBsZXRlZCcsIHsgc2Vzc2lvbklkLCBleGl0Q29kZSB9KTtcblxuICAgIC8vIFBvc3QtZXhpdCBjbGVhbnVwOiByZW1vdmUgZnVsbHktbWVyZ2VkIGJyYW5jaGVzXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGNsZWFudXBNZXJnZWRCcmFuY2hlcyhpbnB1dCwgY2xpZW50LCBiYXNlQnJhbmNoLCBjb250ZXh0LmxvZ2dlcik7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4oJ0JyYW5jaCBjbGVhbnVwIGZhaWxlZCcsIHtcbiAgICAgICAgZXJyb3I6IGVycm9yTWVzc2FnZShlcnJvcilcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuKTtcbiIsICIvKipcbiAqIEVycm9yIGNsYXNzZXMgZm9yIHRoZSBDYXJkcyBWMiBTREsuXG4gKlxuICogVGhlc2UgZXJyb3JzIG5vcm1hbGl6ZSBzZXJ2ZXIgcmVzcG9uc2VzIGFuZCBuZXR3b3JrIGZhaWx1cmVzIHNvIGNhbGxlcnMgY2FuXG4gKiBkaXN0aW5ndWlzaCBBUEkgdmFsaWRhdGlvbiBwcm9ibGVtcyBmcm9tIHRyYW5zcG9ydCBpc3N1ZXMuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEVycm9yIGNsYXNzZXMgZm9yIHRoZSBDYXJkcyBWMiBTREtcbiAqIEBtb2R1bGUgdHlwZXMvZXJyb3JzXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBGaWVsZEVycm9yIH0gZnJvbSAnLi4vLi4vcHJvdG9jb2wvaW5kZXguanMnO1xuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIGFuIEFQSSByZXF1ZXN0IGZhaWxzIHdpdGggYW4gZXJyb3IgcmVzcG9uc2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IGNsaWVudC5jcmVhdGVDYXJkKGRhdGEpO1xuICogfSBjYXRjaCAoZXJyb3IpIHtcbiAqICAgaWYgKGVycm9yIGluc3RhbmNlb2YgQXBpRXJyb3IpIHtcbiAqICAgICBjb25zb2xlLmVycm9yKGBBUEkgZXJyb3IgWyR7ZXJyb3IuY29kZX1dOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gKiAgICAgaWYgKGVycm9yLmZpZWxkcykge1xuICogICAgICAgZXJyb3IuZmllbGRzLmZvckVhY2goZiA9PiBjb25zb2xlLmVycm9yKGAgICR7Zi5maWVsZH06ICR7Zi5tZXNzYWdlfWApKTtcbiAqICAgICB9XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgQXBpRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IEFwaUVycm9yIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGVycm9yIG1lc3NhZ2VcbiAgICogQHBhcmFtIGNvZGUgLSBNYWNoaW5lLXJlYWRhYmxlIGVycm9yIGNvZGVcbiAgICogQHBhcmFtIGZpZWxkcyAtIE9wdGlvbmFsIGFycmF5IG9mIGZpZWxkLXNwZWNpZmljIHZhbGlkYXRpb24gZXJyb3JzXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGNvZGU6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgZmllbGRzPzogRmllbGRFcnJvcltdXG4gICkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdBcGlFcnJvcic7XG4gIH1cbn1cblxuLyoqXG4gKiBFcnJvciB0aHJvd24gd2hlbiBhIG5ldHdvcmsgcmVxdWVzdCBmYWlscyBkdWUgdG8gY29ubmVjdGl2aXR5IGlzc3Vlcy5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdHJ5IHtcbiAqICAgYXdhaXQgY2xpZW50Lmxpc3RDYXJkcygpO1xuICogfSBjYXRjaCAoZXJyb3IpIHtcbiAqICAgaWYgKGVycm9yIGluc3RhbmNlb2YgTmV0d29ya0Vycm9yKSB7XG4gKiAgICAgY29uc29sZS5lcnJvcihgTmV0d29yayBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWApO1xuICogICAgIGlmIChlcnJvci5jYXVzZSkge1xuICogICAgICAgY29uc29sZS5lcnJvcihgQ2F1c2VkIGJ5OiAke2Vycm9yLmNhdXNlLm1lc3NhZ2V9YCk7XG4gKiAgICAgfVxuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIE5ldHdvcmtFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgTmV0d29ya0Vycm9yIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGVycm9yIG1lc3NhZ2VcbiAgICogQHBhcmFtIGNhdXNlIC0gT3B0aW9uYWwgdW5kZXJseWluZyBlcnJvciB0aGF0IGNhdXNlZCB0aGlzIG5ldHdvcmsgZmFpbHVyZVxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBjYXVzZT86IEVycm9yXG4gICkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdOZXR3b3JrRXJyb3InO1xuICB9XG59XG4iLCAiLyoqXG4gKiBIVFRQIGNsaWVudCBmb3IgdGhlIENhcmRzIFYyIFJFU1QgQVBJLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBIVFRQIGNsaWVudCBmb3IgdGhlIENhcmRzIFYyIFJFU1QgQVBJXG4gKiBAbW9kdWxlIHNkay9DYXJkc0NsaWVudFxuICovXG5cbmltcG9ydCB0eXBlIHsgQ2FyZCwgQ29tcGFyZVJlcXVlc3QsIENvbXBhcmVTdGF0ZSwgSHR0cENsaWVudCwgU3RyZWFtTWV0YSwgVGltZWxpbmVJdGVtIH0gZnJvbSAnLi4vcHJvdG9jb2wvaW5kZXguanMnO1xuaW1wb3J0IHR5cGUge1xuICBBZGRCcmFuY2hSZXF1ZXN0LFxuICBBdHRhY2htZW50UmVzcG9uc2UsXG4gIEJyYW5jaGVzUmVzcG9uc2UsXG4gIENhcmRDcmVhdGVEYXRhLFxuICBDYXJkc0NsaWVudE9wdGlvbnMsXG4gIENhcmRVcGRhdGVEYXRhLFxuICBDb21tZW50LFxuICBDb21tZW50Q3JlYXRlRGF0YSxcbiAgQ29tbWVudFVwZGF0ZURhdGEsXG4gIENvbW1pdEluZm8sXG4gIEdhdGVBcHByb3ZhbFJlc3BvbnNlLFxuICBMaXN0Q2FyZHNPcHRpb25zLFxuICBTdHJlYW1SZXN1bHQsXG4gIFN0cmVhbVdyaXRlcixcbiAgU3RyZWFtV3JpdGVyT3B0aW9ucyxcbiAgVGltZWxpbmVPcHRpb25zLFxuICBUeXBlU2NoZW1hc1Jlc3BvbnNlXG59IGZyb20gJy4vdHlwZXMvY2xpZW50LmpzJztcbmltcG9ydCB7IEFwaUVycm9yLCBOZXR3b3JrRXJyb3IgfSBmcm9tICcuL3R5cGVzL2Vycm9ycy5qcyc7XG5cbi8qKiBJbml0aWFsIHJlcXVlc3QgdGltZW91dCBpbiBtaWxsaXNlY29uZHMgKDEgc2Vjb25kIGZvciBmYXN0IGZhaWx1cmUgZGV0ZWN0aW9uKS4gKi9cbmNvbnN0IElOSVRJQUxfVElNRU9VVF9NUyA9IDFfMDAwO1xuXG4vKiogTWF4aW11bSByZXF1ZXN0IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzIGFmdGVyIGV4cG9uZW50aWFsIGJhY2tvZmYuICovXG5jb25zdCBNQVhfVElNRU9VVF9NUyA9IDEwXzAwMDtcblxuLyoqXG4gKiBUeXBlLXNhZmUgSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSS5cbiAqXG4gKiBVc2VzIHRoZSBGZXRjaCBBUEkgYnkgZGVmYXVsdCBhbmQgc3VwcG9ydHMgZGVwZW5kZW5jeSBpbmplY3Rpb24gb2YgYW5cbiAqIGFsdGVybmF0ZSB7QGxpbmsgSHR0cENsaWVudH0gZm9yIHRlc3RzIG9yIGN1c3RvbSB0cmFuc3BvcnRzLiBBbGwgcHVibGljXG4gKiBtZXRob2RzIHN1cmZhY2Ugc2VydmVyIGZhaWx1cmVzIGFzIHtAbGluayBBcGlFcnJvcn0gYW5kIHRyYW5zcG9ydCBmYWlsdXJlc1xuICogYXMge0BsaW5rIE5ldHdvcmtFcnJvcn0uXG4gKlxuICogVGhlIGRlZmF1bHQgSFRUUCBjbGllbnQgYXBwbGllcyBhbiBleHBvbmVudGlhbCBiYWNrb2ZmIHRpbWVvdXQgdG8gZmV0Y2hcbiAqIHJlcXVlc3RzOiBzdGFydGluZyBhdCAxIHNlY29uZCwgZG91Ymxpbmcgb24gZWFjaCBjb25zZWN1dGl2ZSBmYWlsdXJlIHVwXG4gKiB0byBhIDEwLXNlY29uZCBjYXAsIGFuZCByZXNldHRpbmcgb24gYW55IHN1Y2Nlc3NmdWwgcmVzcG9uc2UuIFRoaXMgZW5zdXJlc1xuICogZmFzdCBmYWlsdXJlIGRldGVjdGlvbiB3aGVuIHRoZSBzZXJ2ZXIgaXMgZG93biB3aGlsZSBhbGxvd2luZyBzbG93ZXJcbiAqIHJlc3BvbnNlcyBkdXJpbmcgcmVjb3ZlcnkuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNsaWVudCA9IG5ldyBDYXJkc0NsaWVudCh7IGJhc2VVcmw6ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLCBhY2Nlc3NUb2tlbjogJ3Rva2VuJyB9KTtcbiAqXG4gKiBjb25zdCBjYXJkcyA9IGF3YWl0IGNsaWVudC5saXN0Q2FyZHMoeyBzdGF0dXM6ICdpbl9wcm9ncmVzcycgfSk7XG4gKiBhd2FpdCBjbGllbnQudXBkYXRlQ2FyZChjYXJkSWQsIHsgc3RhdHVzOiAnZG9uZScgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIENhcmRzQ2xpZW50IHtcbiAgcHJpdmF0ZSByZWFkb25seSBfaHR0cENsaWVudD86IEh0dHBDbGllbnQ7XG5cbiAgLyoqIEN1cnJlbnQgdGltZW91dCBpbiBtaWxsaXNlY29uZHMsIGluY3JlYXNlcyB3aXRoIGNvbnNlY3V0aXZlIGZhaWx1cmVzLiAqL1xuICBwcml2YXRlIF9jdXJyZW50VGltZW91dE1zID0gSU5JVElBTF9USU1FT1VUX01TO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IENhcmRzQ2xpZW50IGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBpbmNsdWRpbmcgYmFzZSBVUkwgYW5kIGF1dGggdG9rZW4uXG4gICAqIEBwYXJhbSBodHRwQ2xpZW50IC0gT3B0aW9uYWwgSFRUUCBjbGllbnQgZm9yIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zOiBDYXJkc0NsaWVudE9wdGlvbnMsXG4gICAgaHR0cENsaWVudD86IEh0dHBDbGllbnRcbiAgKSB7XG4gICAgdGhpcy5faHR0cENsaWVudCA9IGh0dHBDbGllbnQ7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgYmFzZSBVUkwgdXNlZCB0byBidWlsZCBBUEkgcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBiYXNlIFVSTCBzdHJpbmcgYXMgcHJvdmlkZWQgaW4ge0BsaW5rIENhcmRzQ2xpZW50T3B0aW9uc30uXG4gICAqL1xuICBnZXRCYXNlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5iYXNlVXJsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciBhbiBIVFRQIGNsaWVudCB3YXMgaW5qZWN0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIFRydWUgaWYgYW4gSFRUUCBjbGllbnQgd2FzIHByb3ZpZGVkIGR1cmluZyBjb25zdHJ1Y3Rpb24uXG4gICAqIEBpbnRlcm5hbCBVc2VkIGZvciB0ZXN0aW5nIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICAgKi9cbiAgaGFzSHR0cENsaWVudCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5faHR0cENsaWVudCAhPT0gdW5kZWZpbmVkO1xuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIEFib3J0U2lnbmFsIHRoYXQgZmlyZXMgYWZ0ZXIgdGhlIGN1cnJlbnQgYmFja29mZiB0aW1lb3V0LlxuICAgKiBVc2VzIGNhbGxlcidzIHNpZ25hbCBpZiBwcm92aWRlZCAoZm9yIERJL3Rlc3RpbmcpLCBvdGhlcndpc2UgYXBwbGllcyB0aGUgYmFja29mZiB0aW1lb3V0LlxuICAgKlxuICAgKiBAcGFyYW0gZXhpc3RpbmdTaWduYWwgLSBPcHRpb25hbCBjYWxsZXItcHJvdmlkZWQgc2lnbmFsIHRvIHJldXNlIGluc3RlYWQgb2YgY3JlYXRpbmcgYSB0aW1lb3V0IHNpZ25hbC5cbiAgICogQHJldHVybnMgQWJvcnRTaWduYWwgdGhhdCBjb250cm9scyByZXF1ZXN0IGNhbmNlbGxhdGlvbiBmb3IgdGhlIGN1cnJlbnQgb3BlcmF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRUaW1lb3V0U2lnbmFsKGV4aXN0aW5nU2lnbmFsPzogQWJvcnRTaWduYWwgfCBudWxsKTogQWJvcnRTaWduYWwge1xuICAgIGlmIChleGlzdGluZ1NpZ25hbCkgcmV0dXJuIGV4aXN0aW5nU2lnbmFsO1xuICAgIHJldHVybiBBYm9ydFNpZ25hbC50aW1lb3V0KHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY29yZHMgYSBzdWNjZXNzZnVsIHJlcXVlc3QgYW5kIHJlc2V0cyB0aGUgdGltZW91dCBiYWNrb2ZmLlxuICAgKi9cbiAgcHJpdmF0ZSBvblJlcXVlc3RTdWNjZXNzKCk6IHZvaWQge1xuICAgIHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMgPSBJTklUSUFMX1RJTUVPVVRfTVM7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkcyBhIGZhaWxlZCByZXF1ZXN0IGFuZCBpbmNyZWFzZXMgdGhlIHRpbWVvdXQgdmlhIGV4cG9uZW50aWFsIGJhY2tvZmYuXG4gICAqL1xuICBwcml2YXRlIG9uUmVxdWVzdEZhaWx1cmUoKTogdm9pZCB7XG4gICAgdGhpcy5fY3VycmVudFRpbWVvdXRNcyA9IE1hdGgubWluKHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMgKiAyLCBNQVhfVElNRU9VVF9NUyk7XG4gIH1cblxuICAvKipcbiAgICogRGVmYXVsdCBIVFRQIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB1c2luZyBmZXRjaCArIEpTT04gcGF5bG9hZHMuXG4gICAqXG4gICAqIEVhY2ggZmV0Y2ggY2FsbCBpbmNsdWRlcyBhbiBBYm9ydFNpZ25hbC50aW1lb3V0IHRoYXQgc3RhcnRzIGF0IDEgc2Vjb25kXG4gICAqIGFuZCBkb3VibGVzIG9uIGNvbnNlY3V0aXZlIGZhaWx1cmVzIHVwIHRvIDEwIHNlY29uZHMuXG4gICAqL1xuICBwcml2YXRlIGRlZmF1bHRIdHRwQ2xpZW50OiBIdHRwQ2xpZW50ID0ge1xuICAgIGdldDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHBvc3Q6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiB1bmRlZmluZWQsXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBwdXQ6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHBhdGNoOiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIGJvZHk6IHVua25vd24sIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIGRlbGV0ZTogYXN5bmMgKHVybDogc3RyaW5nLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldHMgSFRUUCBoZWFkZXJzIGZvciBKU09OIEFQSSByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgSGVhZGVycyB3aXRoIEpTT04gY29udGVudCB0eXBlIGFuZCBvcHRpb25hbCBiZWFyZXIgdG9rZW4uXG4gICAqL1xuICBwcml2YXRlIGdldEhlYWRlcnMoKTogSGVhZGVyc0luaXQge1xuICAgIGNvbnN0IGhlYWRlcnM6IEhlYWRlcnNJbml0ID0geyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbikge1xuICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke3RoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbn1gO1xuICAgIH1cbiAgICByZXR1cm4gaGVhZGVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBIVFRQIGNsaWVudCB0byB1c2UgZm9yIHJlcXVlc3RzLlxuICAgKlxuICAgKiBAcmV0dXJucyBJbmplY3RlZCBIVFRQIGNsaWVudCB3aGVuIHByb3ZpZGVkLCBvdGhlcndpc2UgdGhlIGRlZmF1bHQgZmV0Y2gtYmFzZWQgY2xpZW50LlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRIdHRwQ2xpZW50KCk6IEh0dHBDbGllbnQge1xuICAgIHJldHVybiB0aGlzLl9odHRwQ2xpZW50ID8/IHRoaXMuZGVmYXVsdEh0dHBDbGllbnQ7XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIGEgVVJMIHJlbGF0aXZlIHRvIHRoZSBjb25maWd1cmVkIGJhc2UgVVJMLlxuICAgKlxuICAgKiBVbmRlZmluZWQgYW5kIG51bGwgcXVlcnkgcGFyYW1zIGFyZSBvbWl0dGVkLiBWYWx1ZXMgYXJlIHN0cmluZ2lmaWVkLlxuICAgKlxuICAgKiBAcGFyYW0gcGF0aCAtIFJlbGF0aXZlIEFQSSBwYXRoIHRvIGFwcGVuZCB0byB0aGUgY29uZmlndXJlZCBiYXNlIFVSTC5cbiAgICogQHBhcmFtIHBhcmFtcyAtIE9wdGlvbmFsIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gZW5jb2RlIG9udG8gdGhlIFVSTC5cbiAgICogQHJldHVybnMgRnVsbHktcXVhbGlmaWVkIHJlcXVlc3QgVVJMIHN0cmluZy5cbiAgICovXG4gIHByaXZhdGUgYnVpbGRVcmwocGF0aDogc3RyaW5nLCBwYXJhbXM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHN0cmluZyB7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTChwYXRoLCB0aGlzLm9wdGlvbnMuYmFzZVVybCk7XG4gICAgaWYgKHBhcmFtcykge1xuICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMocGFyYW1zKSkge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgIHVybC5zZWFyY2hQYXJhbXMuc2V0KGtleSwgU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVybC50b1N0cmluZygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyYXBzIGEgcmVxdWVzdCB3aXRoIGNvbnNpc3RlbnQgZXJyb3IgaGFuZGxpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBmbiAtIEFzeW5jIHJlcXVlc3QgZnVuY3Rpb24gdG8gZXhlY3V0ZS5cbiAgICogQHJldHVybnMgVGhlIHJlc29sdmVkIHZhbHVlIGZyb20gdGhlIHJlcXVlc3QgZnVuY3Rpb24uXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYSBub24tMnh4IHN0YXR1cy5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3IgZm9yIG5ldHdvcmsgZmFpbHVyZXMgb3IgdW5leHBlY3RlZCBleGNlcHRpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyByZXF1ZXN0PFQ+KGZuOiAoKSA9PiBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZuKCk7XG4gICAgICB0aGlzLm9uUmVxdWVzdFN1Y2Nlc3MoKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFNlcnZlciByZXNwb25kZWQgKGV2ZW4gd2l0aCBhbiBlcnJvciBzdGF0dXMpIC0gY29ubmVjdGlvbiBpcyBhbGl2ZSwgcmVzZXQgYmFja29mZlxuICAgICAgICB0aGlzLm9uUmVxdWVzdFN1Y2Nlc3MoKTtcbiAgICAgICAgbGV0IGJvZHk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYm9keSA9IGF3YWl0IGVycm9yLmpzb24oKTtcbiAgICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcikge1xuICAgICAgICAgIC8vIFN5bnRheEVycm9yIGlzIGV4cGVjdGVkIHdoZW4gc2VydmVyIHJldHVybnMgbm9uLUpTT04gZXJyb3IgcmVzcG9uc2UgKGUuZy4sIEhUTUwgZXJyb3IgcGFnZSlcbiAgICAgICAgICBpZiAoIShwYXJzZUVycm9yIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tDYXJkc0NsaWVudF0gVW5leHBlY3RlZCBlcnJvciBwYXJzaW5nIGVycm9yIHJlc3BvbnNlOicsIHBhcnNlRXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtZXNzYWdlID1cbiAgICAgICAgICAoYm9keVsnZXJyb3InXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IChib2R5WydtZXNzYWdlJ10gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCBlcnJvci5zdGF0dXNUZXh0O1xuICAgICAgICBjb25zdCBjb2RlID0gKGJvZHlbJ2NvZGUnXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IFN0cmluZyhlcnJvci5zdGF0dXMpO1xuICAgICAgICBjb25zdCBmaWVsZHMgPSBib2R5WydmaWVsZHMnXSBhcyBBcnJheTx7IGZpZWxkOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZyB9PiB8IHVuZGVmaW5lZDtcbiAgICAgICAgdGhyb3cgbmV3IEFwaUVycm9yKG1lc3NhZ2UsIGNvZGUsIGZpZWxkcyk7XG4gICAgICB9XG4gICAgICAvLyBOZXR3b3JrIG9yIHRpbWVvdXQgZmFpbHVyZSAtIGluY3JlYXNlIGJhY2tvZmYgZm9yIG5leHQgYXR0ZW1wdFxuICAgICAgdGhpcy5vblJlcXVlc3RGYWlsdXJlKCk7XG4gICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyb3IubmFtZSA9PT0gJ1RpbWVvdXRFcnJvcicpIHtcbiAgICAgICAgdGhyb3cgbmV3IE5ldHdvcmtFcnJvcignUmVxdWVzdCB0aW1lZCBvdXQnLCBlcnJvcik7XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgTmV0d29ya0Vycm9yKCdSZXF1ZXN0IGZhaWxlZCcsIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IHVuZGVmaW5lZCk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tIENhcmQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogTGlzdHMgY2FyZHMgd2l0aCBvcHRpb25hbCBmaWx0ZXJpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgZmlsdGVyIGFuZCBwYWdpbmF0aW9uIG9wdGlvbnMuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIG1hdGNoaW5nIGNhcmRzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0Q2FyZHMob3B0aW9ucz86IExpc3RDYXJkc09wdGlvbnMpOiBQcm9taXNlPENhcmRbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcycsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoLFxuICAgICAgc3RhdHVzOiBvcHRpb25zPy5zdGF0dXMsXG4gICAgICB0YWc6IG9wdGlvbnM/LnRhZyxcbiAgICAgIHNlYXJjaDogb3B0aW9ucz8uc2VhcmNoLFxuICAgICAgbGltaXQ6IG9wdGlvbnM/LmxpbWl0LFxuICAgICAgb2Zmc2V0OiBvcHRpb25zPy5vZmZzZXRcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDYXJkW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYSBzaW5nbGUgY2FyZCBieSBpZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENhcmQoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q2FyZD4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gZGF0YSAtIENhcmQgY3JlYXRpb24gcGF5bG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNyZWF0ZWQgY2FyZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgcGF5bG9hZC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgY3JlYXRlQ2FyZChkYXRhOiBDYXJkQ3JlYXRlRGF0YSk6IFByb21pc2U8Q2FyZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcycpO1xuICAgIGNvbnN0IGJvZHkgPSB7XG4gICAgICAuLi5kYXRhLFxuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDYXJkPih1cmwsIGJvZHkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIGFuIGV4aXN0aW5nIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgaWQgb2YgdGhlIGNhcmQgdG8gdXBkYXRlLlxuICAgKiBAcGFyYW0gZGF0YSAtIFRoZSBmaWVsZHMgdG8gdXBkYXRlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgdXBkYXRlZCBjYXJkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZUNhcmQoY2FyZElkOiBzdHJpbmcsIGRhdGE6IENhcmRVcGRhdGVEYXRhKTogUHJvbWlzZTxDYXJkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucGF0Y2g8Q2FyZD4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlcyBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgaWQgb2YgdGhlIGNhcmQgdG8gZGVsZXRlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIGRlbGV0aW9uIGlzIGNvbXBsZXRlLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBkZWxldGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGRlbGV0ZUNhcmQoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cblxuICAvLyAtLS0gQ29tbWVudCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBjb21tZW50cyBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgdGFyZ2V0IGNhcmQgZm9yIHRoaXMgcmVxdWVzdC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNvbW1lbnQgbGlzdC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tbWVudHMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPENvbW1lbnRbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21tZW50W10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYSBzaW5nbGUgY29tbWVudCBieSBpZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSByZXF1ZXN0ZWQgY29tbWVudC5cbiAgICogQHBhcmFtIGNvbW1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNvbW1lbnQgdG8gcmV0cmlldmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21tZW50KGNhcmRJZDogc3RyaW5nLCBjb21tZW50SWQ6IHN0cmluZyk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHMvJHtjb21tZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q29tbWVudD4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBjb21tZW50IG9uIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCB3aWxsIHJlY2VpdmUgdGhlIG5ldyBjb21tZW50LlxuICAgKiBAcGFyYW0gZGF0YSAtIENvbW1lbnQgY3JlYXRpb24gcGF5bG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNyZWF0ZWQgY29tbWVudC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgcGF5bG9hZC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgY3JlYXRlQ29tbWVudChjYXJkSWQ6IHN0cmluZywgZGF0YTogQ29tbWVudENyZWF0ZURhdGEpOiBQcm9taXNlPENvbW1lbnQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENvbW1lbnQ+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgYW4gZXhpc3RpbmcgY29tbWVudC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byB1cGRhdGUuXG4gICAqIEBwYXJhbSBkYXRhIC0gQ29tbWVudCB1cGRhdGUgcGF5bG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHVwZGF0ZWQgY29tbWVudC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyB1cGRhdGVDb21tZW50KGNhcmRJZDogc3RyaW5nLCBjb21tZW50SWQ6IHN0cmluZywgZGF0YTogQ29tbWVudFVwZGF0ZURhdGEpOiBQcm9taXNlPENvbW1lbnQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucGF0Y2g8Q29tbWVudD4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlcyBhIGNvbW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgY29tbWVudC5cbiAgICogQHBhcmFtIGNvbW1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNvbW1lbnQgdG8gcmVtb3ZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIGRlbGV0aW9uIGlzIGNvbXBsZXRlLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBkZWxldGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGRlbGV0ZUNvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50cy8ke2NvbW1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBBdHRhY2htZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIFVwbG9hZHMgYW4gYXR0YWNobWVudCB0byBhIGNhcmQgdXNpbmcgYmluYXJ5IFBVVC5cbiAgICpcbiAgICogVGhpcyBpcyB0aGUgcHJlZmVycmVkIG1ldGhvZCAtIHNlbmRzIHJhdyBiaW5hcnkgZGF0YSBkaXJlY3RseSB3aXRob3V0XG4gICAqIGJhc2U2NCBlbmNvZGluZywgcmVzdWx0aW5nIGluIDMzJSBzbWFsbGVyIHBheWxvYWRzLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IHdpbGwgcmVjZWl2ZSB0aGUgYXR0YWNobWVudC5cbiAgICogQHBhcmFtIG5hbWUgLSBGaWxlIG5hbWUgaW5jbHVkaW5nIGV4dGVuc2lvbi5cbiAgICogQHBhcmFtIGRhdGEgLSBCaW5hcnkgZGF0YSBhcyBCbG9iLCBBcnJheUJ1ZmZlciwgb3IgYmFzZTY0IHN0cmluZy5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYXR0YWNobWVudCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyB1cGxvYWRBdHRhY2htZW50KGNhcmRJZDogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIGRhdGE6IEJsb2IgfCBBcnJheUJ1ZmZlciB8IHN0cmluZyk6IFByb21pc2U8QXR0YWNobWVudFJlc3BvbnNlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50cy8ke2VuY29kZVVSSUNvbXBvbmVudChuYW1lKX1gKTtcblxuICAgIC8vIENvbnZlcnQgZGF0YSB0byBCbG9iIGZvciBmZXRjaCBib2R5XG4gICAgbGV0IGJvZHk6IEJsb2I7XG4gICAgaWYgKGRhdGEgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICBib2R5ID0gZGF0YTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgYm9keSA9IG5ldyBCbG9iKFtkYXRhXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGJhc2U2NCBzdHJpbmcgLSBkZWNvZGUgdG8gYmluYXJ5XG4gICAgICBjb25zdCBiaW5hcnlTdHJpbmcgPSBhdG9iKGRhdGEpO1xuICAgICAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShiaW5hcnlTdHJpbmcubGVuZ3RoKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYmluYXJ5U3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJ5dGVzW2ldID0gYmluYXJ5U3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgICB9XG4gICAgICBib2R5ID0gbmV3IEJsb2IoW2J5dGVzXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4udGhpcy5nZXRIZWFkZXJzKCksXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHksXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8QXR0YWNobWVudFJlc3BvbnNlPjtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEb3dubG9hZHMgYW4gYXR0YWNobWVudCBhcyBhIEJsb2IuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHVzZXMgYGZldGNoYCBkaXJlY3RseSBzbyBiaW5hcnkgZGF0YSBpcyBwcmVzZXJ2ZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgYXR0YWNobWVudC5cbiAgICogQHBhcmFtIGF0dGFjaG1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGF0dGFjaG1lbnQgYmxvYiB0byBkb3dubG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYW4gYXR0YWNobWVudCBCbG9iLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRBdHRhY2htZW50KGNhcmRJZDogc3RyaW5nLCBhdHRhY2htZW50SWQ6IHN0cmluZyk6IFByb21pc2U8QmxvYj4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYXR0YWNobWVudHMvJHthdHRhY2htZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBoZWFkZXJzOiB0aGlzLmdldEhlYWRlcnMoKSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5ibG9iKCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTGlzdHMgYXR0YWNobWVudHMgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgYXR0YWNobWVudHMgc2hvdWxkIGJlIGxpc3RlZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYXR0YWNobWVudCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdEF0dGFjaG1lbnRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2VbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYXR0YWNobWVudHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxBdHRhY2htZW50UmVzcG9uc2VbXT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gVGltZWxpbmUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyB0aW1lbGluZSBlbnRyaWVzIGZvciBhIGNhcmQgd2l0aCBvcHRpb25hbCBwYWdpbmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSB0aW1lbGluZSBlbnRyaWVzIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBwYWdpbmF0aW9uIGNvbnRyb2xzLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aW1lbGluZSBlbnRyaWVzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUaW1lbGluZShjYXJkSWQ6IHN0cmluZywgb3B0aW9ucz86IFRpbWVsaW5lT3B0aW9ucyk6IFByb21pc2U8VGltZWxpbmVJdGVtW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3RpbWVsaW5lYCwge1xuICAgICAgYmVmb3JlOiBvcHRpb25zPy5iZWZvcmUsXG4gICAgICBsaW1pdDogb3B0aW9ucz8ubGltaXRcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxUaW1lbGluZUl0ZW1bXT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gUGxhbiBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBwbGFuIGRvY3VtZW50IGZvciBhIGNhcmQgYXMgbWFya2Rvd24uXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHBsYW4gbWFya2Rvd24gc2hvdWxkIGJlIHJldHVybmVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBwbGFuIG1hcmtkb3duLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRQbGFuKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3BsYW5gKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8eyBjb250ZW50OiBzdHJpbmcgfT4odXJsKSk7XG4gICAgcmV0dXJuIHJlc3BvbnNlLmNvbnRlbnQ7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyB0aGUgcGxhbiBkb2N1bWVudCBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBwbGFuIG1hcmtkb3duIHNob3VsZCBiZSB1cGRhdGVkLlxuICAgKiBAcGFyYW0gY29udGVudCAtIFBsYW4gbWFya2Rvd24gY29udGVudC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgcGxhbiBpcyBzYXZlZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyB1cGRhdGVQbGFuKGNhcmRJZDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3BsYW5gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnB1dDx2b2lkPih1cmwsIGNvbnRlbnQpKTtcbiAgfVxuXG4gIC8vIC0tLSBHYXRlIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEFwcHJvdmVzIGEgZ2F0ZSBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBnYXRlIHN0YXRlIHNob3VsZCBiZSB1cGRhdGVkLlxuICAgKiBAcGFyYW0gZ2F0ZU5hbWUgLSBHYXRlIG5hbWUgdG8gYXBwcm92ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gZ2F0ZSBhcHByb3ZhbCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgYXBwcm92YWwuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGFwcHJvdmVHYXRlKGNhcmRJZDogc3RyaW5nLCBnYXRlTmFtZTogJ3BsYW4nIHwgJ3JldmlldycpOiBQcm9taXNlPEdhdGVBcHByb3ZhbFJlc3BvbnNlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9nYXRlcy8ke2dhdGVOYW1lfS9hcHByb3ZlYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PEdhdGVBcHByb3ZhbFJlc3BvbnNlPih1cmwsIHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgLy8gLS0tIENvbW1pdCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBjb21taXRzIGFzc29jaWF0ZWQgd2l0aCBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIGNvbW1pdHMgc2hvdWxkIGJlIHJldHVybmVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjb21taXQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENvbW1pdHMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPENvbW1pdEluZm9bXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENvbW1pdEluZm9bXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIGNvbW1pdCB0byBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIGFzc29jaWF0ZSB3aXRoIHRoZSBjb21taXQgU0hBLlxuICAgKiBAcGFyYW0gc2hhIC0gR2l0IGNvbW1pdCBzaGEuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGNvbW1pdCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBhZGRDb21taXQoY2FyZElkOiBzdHJpbmcsIHNoYTogc3RyaW5nKTogUHJvbWlzZTxDb21taXRJbmZvPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21taXRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENvbW1pdEluZm8+KHVybCwgeyBzaGEgfSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBjb21taXQgZnJvbSBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIGRldGFjaCBmcm9tIHRoZSBjb21taXQgU0hBLlxuICAgKiBAcGFyYW0gc2hhIC0gR2l0IGNvbW1pdCBzaGEuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gcmVtb3ZhbCBpcyBjb21wbGV0ZS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyByZW1vdmVDb21taXQoY2FyZElkOiBzdHJpbmcsIHNoYTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21taXRzLyR7c2hhfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEJyYW5jaCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBicmFuY2hlcyB0cmFja2VkIG9uIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIGJyYW5jaGVzIHRvIHJldHJpZXZlLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHF1ZXJ5IHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSBvcHRpb25zLndvcmtzcGFjZVBhdGggLSBXb3Jrc3BhY2UgcGF0aCBmb3IgY29tcHV0aW5nIGlzTWVyZ2VkIGFuZCBjb21taXQgY29udGFpbm1lbnQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGJyYW5jaGVzIHJlc3BvbnNlLlxuICAgKi9cbiAgYXN5bmMgZ2V0QnJhbmNoZXMoY2FyZElkOiBzdHJpbmcsIG9wdGlvbnM/OiB7IHdvcmtzcGFjZVBhdGg/OiBzdHJpbmcgfSk6IFByb21pc2U8QnJhbmNoZXNSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYnJhbmNoZXNgLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiBvcHRpb25zPy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8QnJhbmNoZXNSZXNwb25zZT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIGJyYW5jaCB0byBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBVbmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBhZGQgdGhlIGJyYW5jaCB0by5cbiAgICogQHBhcmFtIGRhdGEgLSBCcmFuY2ggZGF0YSBpbmNsdWRpbmcgbmFtZSBhbmQgb3B0aW9uYWwgd29ya3RyZWUgcGF0aC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgYnJhbmNoIGlzIGFkZGVkLlxuICAgKi9cbiAgYXN5bmMgYWRkQnJhbmNoKGNhcmRJZDogc3RyaW5nLCBkYXRhOiBBZGRCcmFuY2hSZXF1ZXN0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9icmFuY2hlc2ApO1xuICAgIGF3YWl0IHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PHVua25vd24+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBicmFuY2ggZnJvbSBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBVbmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byByZW1vdmUgdGhlIGJyYW5jaCBmcm9tLlxuICAgKiBAcGFyYW0gbmFtZSAtIEJyYW5jaCBuYW1lIHRvIHJlbW92ZSAod2lsbCBiZSBVUkwtZW5jb2RlZCkuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGJyYW5jaCBpcyByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgcmVtb3ZlQnJhbmNoKGNhcmRJZDogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFRhZyBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBhdmFpbGFibGUgdGFncy5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGFnIHN0cmluZ3MuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFRhZ3MoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy90YWdzJywge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxzdHJpbmdbXT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gRW52aXJvbm1lbnQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogRmV0Y2hlcyBhdmFpbGFibGUgYWdlbnQgZW52aXJvbm1lbnRzLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBlbnZpcm9ubWVudCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0RW52aXJvbm1lbnRzKCk6IFByb21pc2U8QXJyYXk8eyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uPzogc3RyaW5nIH0+PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2Vudmlyb25tZW50cycpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEFycmF5PHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbj86IHN0cmluZyB9Pj4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gVHlwZWQgRmlsZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBTdWJtaXRzIGFuIGFkYXB0aXZlIGNhcmQgYWN0aW9uIGJ5IHdyaXRpbmcgYW4gYGFkYXB0aXZlLWNhcmQtc3VibWlzc2lvbmAgdHlwZWQgZmlsZS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBjYXJkIGNvbnRhaW5pbmcgdGhlIGFkYXB0aXZlIGNhcmQuXG4gICAqIEBwYXJhbSBhY3Rpb25JZCAtIFRoZSBhY3Rpb24gSUQgZnJvbSB0aGUgYWRhcHRpdmUgY2FyZCBzdWJtaXQgYWN0aW9uLlxuICAgKiBAcGFyYW0gZGF0YSAtIFRoZSBmb3JtIGRhdGEgY29sbGVjdGVkIGJ5IHRoZSBhZGFwdGl2ZSBjYXJkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBzdWJtaXNzaW9uIGlzIHBlcnNpc3RlZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgc3VibWlzc2lvbiAoZS5nLiB2YWxpZGF0aW9uIGZhaWx1cmUpLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBzdWJtaXRDYXJkQWN0aW9uKGNhcmRJZDogc3RyaW5nLCBhY3Rpb25JZDogc3RyaW5nLCBkYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGZpbGVOYW1lID0gYCR7YWN0aW9uSWR9LSR7RGF0ZS5ub3coKX0uanNvbmA7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hZGFwdGl2ZS1jYXJkLXN1Ym1pc3Npb24vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZU5hbWUpfWApO1xuICAgIGNvbnN0IGJvZHkgPSB7IGNhcmRJZCwgYWN0aW9uSWQsIGRhdGEgfTtcbiAgICBhd2FpdCB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucHV0PHVua25vd24+KHVybCwgYm9keSkpO1xuICB9XG5cbiAgLy8gLS0tIFR5cGUgU2NoZW1hIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgdHlwZSBzY2hlbWFzIGFuZCBkZXNjcmlwdGlvbnMgZm9yIGEgY2FyZCdzIGVudmlyb25tZW50LlxuICAgKlxuICAgKiBSZXR1cm5zIG1ldGFkYXRhIGFib3V0IGVhY2ggcmVnaXN0ZXJlZCB0eXBlIGluIHRoZSBjYXJkJ3MgZW52aXJvbm1lbnQsXG4gICAqIGluY2x1ZGluZyB2ZXJzaW9uLCBzY2hlbWEsIGFuZCBkZXNjcmlwdGlvbi4gQ29tbWFuZCBkZXRhaWxzIGFyZSBleGNsdWRlZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgdHlwZSBzY2hlbWEgbWV0YWRhdGEgc2hvdWxkIGJlIGZldGNoZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHR5cGUgc2NoZW1hIGluZm9ybWF0aW9uLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUeXBlU2NoZW1hcyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8VHlwZVNjaGVtYXNSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vc2NoZW1hYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8VHlwZVNjaGVtYXNSZXNwb25zZT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gU3RyZWFtIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIExpc3RzIGFsbCBzdHJlYW1zIGF0dGFjaGVkIHRvIGEgY2FyZCwgc29ydGVkIGJ5IGNyZWF0aW9uIHRpbWUuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIElEIHRvIHF1ZXJ5LlxuICAgKiBAcmV0dXJucyBTdHJlYW0gbWV0YWRhdGEgYXJyYXkgKG1heSBiZSBlbXB0eSkuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IgKGUuZy4sIDQwNCBmb3IgdW5rbm93biBjYXJkKS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdFN0cmVhbXMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPFN0cmVhbU1ldGFbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vc3RyZWFtc2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFN0cmVhbU1ldGFbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIGEgc3RyZWFtJ3MgbWV0YWRhdGEgYW5kIGFsbCByYXcgbGluZXMuXG4gICAqXG4gICAqIFRoZSBgc3RyZWFtVHlwZWAgYW5kIGBmaWxlbmFtZWAgYXJlIFVSSS1lbmNvZGVkIGF1dG9tYXRpY2FsbHkuIEZvciBjb21wbGV0ZWRcbiAgICogc3RyZWFtcyB0aGUgcmV0dXJuZWQgYGxpbmVzYCBhcnJheSBpcyB0aGUgZnVsbCBjb250ZW50OyBmb3IgYWN0aXZlIHN0cmVhbXMgaXRcbiAgICogaXMgYSBzbmFwc2hvdCB0aGF0IG1heSBncm93IHdoaWxlIHRoZSBjYWxsZXIgcHJvY2Vzc2VzIGl0LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIHJlcXVlc3RlZCBzdHJlYW0uXG4gICAqIEBwYXJhbSBzdHJlYW1UeXBlIC0gU3RyZWFtIHR5cGUga2V5IChlLmcuLCBgXCJjbGF1ZGUtY29kZS1zZXNzaW9uXCJgKS5cbiAgICogQHBhcmFtIGZpbGVuYW1lIC0gU3RyZWFtIGZpbGVuYW1lIChlLmcuLCBgXCJzZXNzaW9uLmxvZ1wiYCkuXG4gICAqIEByZXR1cm5zIE1ldGFkYXRhIGFuZCBjb250ZW50IGxpbmVzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIG9uIDQwNCAodW5rbm93biBjYXJkIG9yIHN0cmVhbSkgb3Igb3RoZXIgc2VydmVyIGVycm9ycy5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0U3RyZWFtKFxuICAgIGNhcmRJZDogc3RyaW5nLFxuICAgIHN0cmVhbVR5cGU6IHN0cmluZyxcbiAgICBmaWxlbmFtZTogc3RyaW5nXG4gICk6IFByb21pc2U8eyBtZXRhOiBTdHJlYW1NZXRhOyBsaW5lczogc3RyaW5nW10gfT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoXG4gICAgICBgL2NhcmRzLyR7Y2FyZElkfS9zdHJlYW1zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHN0cmVhbVR5cGUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlbmFtZSl9YFxuICAgICk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8eyBtZXRhOiBTdHJlYW1NZXRhOyBsaW5lczogc3RyaW5nW10gfT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgYSBjaHVua2VkIEpTT05MIHN0cmVhbSB0byB0aGUgc2VydmVyIGFuZCByZXR1cm5zIGEgd3JpdGVyLlxuICAgKlxuICAgKiBUaGUgd3JpdGVyIHNlbmRzIGVhY2ggbGluZSBpbiByZWFsLXRpbWUgb3ZlciBhIHNpbmdsZSBIVFRQIFBPU1QgdXNpbmcgYVxuICAgKiBgUmVhZGFibGVTdHJlYW1gIGJvZHkuIENhbGwge0BsaW5rIFN0cmVhbVdyaXRlci5jbG9zZX0gd2hlbiB0aGUgcHJvZHVjZXJcbiAgICogaXMgZmluaXNoZWQgdG8gZW5kIHRoZSByZXF1ZXN0IGFuZCByZXRyaWV2ZSB0aGUgc2VydmVyJ3Mgc3VtbWFyeS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIENhcmQgSUQgdG8gYXR0YWNoIHRoZSBzdHJlYW0gdG8uXG4gICAqIEBwYXJhbSBzdHJlYW1UeXBlIC0gU3RyZWFtIHR5cGUga2V5IGZyb20gc2V0dGluZ3MuanNvbiAoZS5nLiwgYFwiY2xhdWRlLWNvZGUtc2Vzc2lvblwiYCkuXG4gICAqIEBwYXJhbSBmaWxlbmFtZSAtIFN0cmVhbSBmaWxlbmFtZSAoZS5nLiwgYFwic2Vzc2lvbi1hYmMuanNvbmxcImApLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHRpdGxlIGFuZCBzZXNzaW9uIElEIG1ldGFkYXRhLlxuICAgKiBAcmV0dXJucyBBIHtAbGluayBTdHJlYW1Xcml0ZXJ9IGZvciBwdXNoaW5nIGxpbmVzIGFuZCBjbG9zaW5nIHRoZSBzdHJlYW0uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3Qgc3RyZWFtID0gY2xpZW50Lm9wZW5TdHJlYW0oY2FyZElkLCAnY2xhdWRlLWNvZGUtc2Vzc2lvbicsICdydW4uanNvbmwnKTtcbiAgICogc3RyZWFtLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2luaXQnIH0pKTtcbiAgICogc3RyZWFtLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ3Jlc3VsdCcgfSkpO1xuICAgKiBjb25zdCByZXN1bHQgPSBhd2FpdCBzdHJlYW0uY2xvc2UoKTtcbiAgICogYGBgXG4gICAqL1xuICBvcGVuU3RyZWFtKGNhcmRJZDogc3RyaW5nLCBzdHJlYW1UeXBlOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcsIG9wdGlvbnM/OiBTdHJlYW1Xcml0ZXJPcHRpb25zKTogU3RyZWFtV3JpdGVyIHtcbiAgICBjb25zdCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XG4gICAgbGV0IGNvbnRyb2xsZXIhOiBSZWFkYWJsZVN0cmVhbURlZmF1bHRDb250cm9sbGVyPFVpbnQ4QXJyYXk+O1xuXG4gICAgY29uc3QgYm9keSA9IG5ldyBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5Pih7XG4gICAgICBzdGFydChjKSB7XG4gICAgICAgIGNvbnRyb2xsZXIgPSBjO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChcbiAgICAgIGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXMvJHtlbmNvZGVVUklDb21wb25lbnQoc3RyZWFtVHlwZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVuYW1lKX1gXG4gICAgKTtcblxuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtbmRqc29uJ1xuICAgIH07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbikge1xuICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke3RoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbn1gO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucz8udGl0bGUpIHtcbiAgICAgIGhlYWRlcnNbJ1gtU3RyZWFtLVRpdGxlJ10gPSBvcHRpb25zLnRpdGxlO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucz8uc2Vzc2lvbklkKSB7XG4gICAgICBoZWFkZXJzWydYLVN0cmVhbS1TZXNzaW9uLUlkJ10gPSBvcHRpb25zLnNlc3Npb25JZDtcbiAgICB9XG5cbiAgICAvLyBgZHVwbGV4OiAnaGFsZidgIGlzIHJlcXVpcmVkIGJ5IHVuZGljaSBmb3Igc3RyZWFtaW5nIHJlcXVlc3QgYm9kaWVzXG4gICAgLy8gYnV0IGlzIG5vdCB5ZXQgaW4gdGhlIHN0YW5kYXJkIGxpYi5kb20gUmVxdWVzdEluaXQgdHlwZS5cbiAgICBjb25zdCBmZXRjaE9wdGlvbnM6IFJlcXVlc3RJbml0ICYgeyBkdXBsZXg6IHN0cmluZyB9ID0ge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzLFxuICAgICAgYm9keSxcbiAgICAgIGR1cGxleDogJ2hhbGYnXG4gICAgfTtcblxuICAgIGNvbnN0IHJlc3BvbnNlUHJvbWlzZSA9IGZldGNoKHVybCwgZmV0Y2hPcHRpb25zKTtcblxuICAgIHJldHVybiB7XG4gICAgICB3cml0ZShsaW5lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKGVuY29kZXIuZW5jb2RlKGAke2xpbmV9XFxuYCkpO1xuICAgICAgfSxcbiAgICAgIGNsb3NlOiBhc3luYyAoKTogUHJvbWlzZTxTdHJlYW1SZXN1bHQ+ID0+IHtcbiAgICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlc3BvbnNlUHJvbWlzZTtcbiAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8U3RyZWFtUmVzdWx0PjtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8vIC0tLSBDb21wYXJlIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIFNldHMgb3IgcmVwbGFjZXMgdGhlIGFjdGl2ZSBjb21wYXJpc29uIG9uIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IC0gQ29tcGFyZSByZXF1ZXN0IHNwZWNpZnlpbmcgdGhlIGNvbXBhcmlzb24gbW9kZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHJlc3VsdGluZyBjb21wYXJlIHN0YXRlLlxuICAgKi9cbiAgYXN5bmMgc2V0Q29tcGFyZShyZXF1ZXN0OiBDb21wYXJlUmVxdWVzdCk6IFByb21pc2U8Q29tcGFyZVN0YXRlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NvbXBhcmUnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tcGFyZVN0YXRlPih1cmwsIHJlcXVlc3QpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGNvbXBhcmUgc3RhdGUsIG9yIG51bGwgaWYgbm8gY29tcGFyaXNvbiBpcyBhY3RpdmUuXG4gICAqXG4gICAqIFRoZSBzZXJ2ZXIgcmV0dXJucyAyMDQgd2hlbiBubyBjb21wYXJpc29uIGlzIGFjdGl2ZSwgd2hpY2ggdGhpcyBtZXRob2RcbiAgICogbWFwcyB0byBudWxsIHJhdGhlciB0aGFuIHRocm93aW5nLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3VycmVudCBjb21wYXJlIHN0YXRlLCBvciBudWxsIGlmIG5vbmUgYWN0aXZlLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tcGFyZSgpOiBQcm9taXNlPENvbXBhcmVTdGF0ZSB8IG51bGw+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY29tcGFyZScpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKCkgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxDb21wYXJlU3RhdGU+O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFycyB0aGUgYWN0aXZlIGNvbXBhcmlzb24gb24gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgY29tcGFyaXNvbiBpcyBjbGVhcmVkLlxuICAgKi9cbiAgYXN5bmMgY2xlYXJDb21wYXJlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jb21wYXJlJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cbn1cbiIsICIvKipcbiAqIEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGFjdGlvbiBoYW5kbGVycy5cbiAqXG4gKiBUaGlzIGlzIHRoZSBwcmltYXJ5IGF1dGhvcmluZyBBUEkgZm9yIGFjdGlvbiBkZXZlbG9wZXJzLiBJdCB3cmFwcyBhIGhhbmRsZXJcbiAqIGZ1bmN0aW9uIGFuZCBhdHRhY2hlcyBtZXRhZGF0YSBmb3Igc2V0dGluZ3MuanNvbiBnZW5lcmF0aW9uLiBUaGUgU2FtZVNoYXBlXG4gKiB1dGlsaXR5IHByb3ZpZGVzIGNvbXBpbGUtdGltZSB0eXBvIGRldGVjdGlvbi5cbiAqXG4gKlxuICogQHN1bW1hcnkgRmFjdG9yeSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgYWN0aW9uIGhhbmRsZXJzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db21tYW5kIH0gZnJvbSAnLi4vY29tbWFuZC10eXBlcy5qcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbnRleHQsIEFjdGlvbklucHV0IH0gZnJvbSAnLi4vaW5wdXRzLmpzJztcbmltcG9ydCB0eXBlIHsgU2FtZVNoYXBlIH0gZnJvbSAnLi4vdHlwZS11dGlscy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbmZpZ3VyYXRpb24gVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIGZvciB7QGxpbmsgZGVmaW5lQWN0aW9ufSBmYWN0b3J5LlxuICpcbiAqIEFsbCBmaWVsZHMgZXhjZXB0IGBhY3Rpb25OYW1lYCBhcmUgb3B0aW9uYWwgYW5kIGZvcndhcmRlZCB0byBzZXR0aW5ncy5qc29uLlxuICogVGhlIENMSSBleHRyYWN0cyB0aGlzIG1ldGFkYXRhIHZpYSBBU1QgYW5hbHlzaXMsIHNvIHZhbHVlcyBtdXN0IGJlIHN0cmluZ1xuICogbGl0ZXJhbHMgb3IgYm9vbGVhbi9udW1iZXIgbGl0ZXJhbHMgaW4gdGhlIHNvdXJjZSBjb2RlLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb25maWc6IEFjdGlvbkNvbmZpZyA9IHtcbiAqICAgYWN0aW9uTmFtZTogJ0xhdW5jaCBDbGF1ZGUnLFxuICogICBkZXNjcmlwdGlvbjogJ1N0YXJ0IGEgQ2xhdWRlIGNvZGluZyBzZXNzaW9uJyxcbiAqICAgaWNvbjogJy4vaWNvbnMvY2xhdWRlLnN2ZycsXG4gKiAgIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU6IHRydWUsXG4gKiAgIHRpbWVvdXQ6IDMwMDAwXG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aW9uQ29uZmlnIHtcbiAgLyoqXG4gICAqIFN0YWJsZSBpZGVudGlmaWVyIGZvciB0aGUgYWN0aW9uIHVzZWQgaW4gdGVsZW1ldHJ5LCBsb2NhbGl6YXRpb24sIGFuZCBBUEkgbG9va3Vwcy5cbiAgICpcbiAgICogU2hvdWxkIGJlIGxvd2VyY2FzZSB3aXRoIGh5cGhlbnMgKGUuZy4sICdsYXVuY2gtY2xhdWRlJywgJ3J1bi10ZXN0cycpLlxuICAgKiBJZiBvbWl0dGVkLCB0aGUgQ0xJIGdlbmVyYXRlcyBhbiBJRCBieSBzbHVnaWZ5aW5nIGBhY3Rpb25OYW1lYC5cbiAgICovXG4gIGlkPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgYWN0aW9uIG5hbWUgdXNlZCB0byBpZGVudGlmeSB0aGUgYWN0aW9uIGluIHNldHRpbmdzLmpzb24uXG4gICAqXG4gICAqIFRoaXMgbmFtZSBhcHBlYXJzIGluIHRoZSBVSS4gS2VlcCBpdCBjb25jaXNlIGJ1dCBkZXNjcmlwdGl2ZS5cbiAgICovXG4gIGFjdGlvbk5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gc2hvd24gaW4gYnV0dG9uIHRvb2x0aXAuXG4gICAqXG4gICAqIEV4cGxhaW4gd2hhdCB0aGUgYWN0aW9uIGRvZXMgaW4gYSBmZXcgd29yZHMuIFNob3duIG9uIGhvdmVyIGluIHRoZSBVSS5cbiAgICovXG4gIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGljb24gZmlsZSBmb3IgdGhlIGFjdGlvbiBidXR0b24uXG4gICAqXG4gICAqIFBhdGhzIGFyZSByZWxhdGl2ZSB0byB0aGUgc2V0dGluZ3MuanNvbiBmaWxlIGxvY2F0aW9uLlxuICAgKiBTVkcgZm9ybWF0IHJlY29tbWVuZGVkIGZvciBjcmlzcCByZW5kZXJpbmcgYXQgYW55IHNpemUuXG4gICAqL1xuICBpY29uPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHNob3cgdGhlIGV4ZWN1dGlvbiBtb2RlIHRvZ2dsZSBpbiB0aGUgVUkuXG4gICAqXG4gICAqIFdoZW4gdHJ1ZSwgdXNlcnMgY2FuIGNob29zZSBiZXR3ZWVuIGludGVyYWN0aXZlIGFuZCBiYWNrZ3JvdW5kIG1vZGVzLlxuICAgKiBXaGVuIGZhbHNlIChkZWZhdWx0KSwgdGhlIGFjdGlvbiBhbHdheXMgcnVucyBpbiBpbnRlcmFjdGl2ZSBtb2RlLlxuICAgKi9cbiAgc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgbXVsdGlwbGUgaW5zdGFuY2VzIGNhbiBydW4gc2ltdWx0YW5lb3VzbHkgb24gdGhlIHNhbWUgY2FyZC5cbiAgICpcbiAgICogV2hlbiBmYWxzZSAoZGVmYXVsdCksIHN0YXJ0aW5nIHRoZSBhY3Rpb24gd2hpbGUgaXQncyBydW5uaW5nIHdpbGwgYmVcbiAgICogYmxvY2tlZC4gU2V0IHRvIHRydWUgZm9yIGlkZW1wb3RlbnQgYWN0aW9ucyB0aGF0IGNhbiBzYWZlbHkgb3ZlcmxhcC5cbiAgICovXG4gIGFsbG93Q29uY3VycmVudD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIE1heGltdW0gZXhlY3V0aW9uIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICAgKlxuICAgKiBJZiB0aGUgYWN0aW9uIGV4Y2VlZHMgdGhpcyB0aW1lb3V0LCB0aGUgcnVudGltZSB3aWxsIHRlcm1pbmF0ZSBpdC5cbiAgICogT21pdCB0byB1c2UgdGhlIHBsYXRmb3JtJ3MgZGVmYXVsdCB0aW1lb3V0IHBvbGljeS5cbiAgICovXG4gIHRpbWVvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEhhbmRsZXIgc291cmNlIGZpbGUgcGF0aCwgaW5qZWN0ZWQgYnkgdGhlIGBpbmplY3RTb3VyY2VQYXRoYCBlc2J1aWxkXG4gICAqIHBsdWdpbiBkdXJpbmcgY29uZmlnIGxvYWRpbmcuIERvIG5vdCBzZXQgbWFudWFsbHkuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc291cmNlUGF0aD86IHN0cmluZztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSGFuZGxlciBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEhhbmRsZXIgZnVuY3Rpb24gc2lnbmF0dXJlIGZvciBhY3Rpb24gZXZlbnRzLlxuICpcbiAqIFRocm93aW5nIGFuIGVycm9yIHNpZ25hbHMgYWN0aW9uIGZhaWx1cmUuIFRoZSBlcnJvciBtZXNzYWdlIGlzIGxvZ2dlZCBhbmRcbiAqIHN1cmZhY2VkIHRvIHRoZSB1c2VyLiBGb3IgZXhwZWN0ZWQgZXJyb3JzLCB0aHJvdyB3aXRoIGEgZGVzY3JpcHRpdmUgbWVzc2FnZS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgcGF5bG9hZCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogQHBhcmFtIGNvbnRleHQgLSBSdW50aW1lIGNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIGNhbGxiYWNrIG1ldGhvZHNcbiAqIEByZXR1cm5zIFByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBhY3Rpb24gY29tcGxldGVzXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGhhbmRsZXI6IEFjdGlvbkhhbmRsZXIgPSBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyLCBvbkNhbmNlbCB9KSA9PiB7XG4gKiAgIG9uQ2FuY2VsKCgpID0+IHtcbiAqICAgICBsb2dnZXIuaW5mbygnQ2FuY2VsbGluZyBhY3Rpb24nKTtcbiAqICAgfSk7XG4gKlxuICogICB0cnkge1xuICogICAgIGxvZ2dlci5pbmZvKCdTdGFydGluZyBhY3Rpb24nLCB7IGNhcmRJZDogaW5wdXQuY2FyZElkIH0pO1xuICogICAgIGF3YWl0IHBlcmZvcm1BY3Rpb24oaW5wdXQpO1xuICogICAgIGxvZ2dlci5pbmZvKCdBY3Rpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseScpO1xuICogICB9IGNhdGNoIChlcnIpIHtcbiAqICAgICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnQWN0aW9uIGZhaWxlZCcpO1xuICogICAgIHRocm93IGVycjsgLy8gUmUtdGhyb3cgdG8gc2lnbmFsIGZhaWx1cmVcbiAqICAgfVxuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBBY3Rpb25IYW5kbGVyID0gKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD47XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZhY3RvcnkgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGFjdGlvbiBoYW5kbGVyIHdpdGggbWV0YWRhdGEgZm9yIHNldHRpbmdzLmpzb24gZ2VuZXJhdGlvbi5cbiAqXG4gKiBUaGlzIGZhY3Rvcnkgd3JhcHMgeW91ciBoYW5kbGVyIGZ1bmN0aW9uIGFuZCBhdHRhY2hlcyBtZXRhZGF0YSB0aGF0IHRoZSBDTElcbiAqIGV4dHJhY3RzIHdoZW4gYnVpbGRpbmcgc2V0dGluZ3MuanNvbi4gVGhlIHJldHVybmVkIGNvbW1hbmQgaXMgYm90aCBjYWxsYWJsZVxuICogKGZvciB0aGUgcnVudGltZSkgYW5kIGluc3BlY3RhYmxlIChmb3IgdGhlIENMSSkuXG4gKlxuICogVGhlIGdlbmVyaWMgcGFyYW1ldGVyIHByZXNlcnZlcyB0aGUgYWN0aW9uIG5hbWUgYXMgYSBsaXRlcmFsIHR5cGUuXG4gKlxuICogQHRlbXBsYXRlIFQgLSBUaGUgY29uZmlnIHR5cGUgZXh0ZW5kaW5nIEFjdGlvbkNvbmZpZ1xuICogQHBhcmFtIGNvbmZpZyAtIEFjdGlvbiBtZXRhZGF0YSAodXNlcyBTYW1lU2hhcGUgdG8gY2F0Y2ggdHlwb3MpXG4gKiBAcGFyYW0gaGFuZGxlciAtIEFzeW5jIGZ1bmN0aW9uIHRoYXQgaW1wbGVtZW50cyB0aGUgYWN0aW9uIGxvZ2ljXG4gKiBAcmV0dXJucyBBIGNhbGxhYmxlIGNvbW1hbmQgd2l0aCBhdHRhY2hlZCBtZXRhZGF0YVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCYXNpYyB1c2FnZVxuICogZXhwb3J0IGRlZmF1bHQgZGVmaW5lQWN0aW9uKFxuICogICB7IGFjdGlvbk5hbWU6ICdMYXVuY2ggQ2xhdWRlJyB9LFxuICogICBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgICBsb2dnZXIuaW5mbygnTGF1bmNoaW5nIENsYXVkZScsIHsgY2FyZElkOiBpbnB1dC5jYXJkSWQgfSk7XG4gKiAgICAgYXdhaXQgc3Bhd25DbGF1ZGUoaW5wdXQpO1xuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFdpdGggZnVsbCBjb25maWd1cmF0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCBkZWZpbmVBY3Rpb24oXG4gKiAgIHtcbiAqICAgICBhY3Rpb25OYW1lOiAnRGVwbG95IEFwcGxpY2F0aW9uJyxcbiAqICAgICBkZXNjcmlwdGlvbjogJ0RlcGxveSB0byBwcm9kdWN0aW9uJyxcbiAqICAgICBpY29uOiAnLi9pY29ucy9kZXBsb3kuc3ZnJyxcbiAqICAgICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiB0cnVlLFxuICogICAgIGFsbG93Q29uY3VycmVudDogZmFsc2UsXG4gKiAgICAgdGltZW91dDogNjAwMDBcbiAqICAgfSxcbiAqICAgYXN5bmMgKGlucHV0LCBjb250ZXh0KSA9PiB7XG4gKiAgICAgY29udGV4dC5vbkNhbmNlbCgoKSA9PiBjbGVhbnVwKCkpO1xuICogICAgIGF3YWl0IGRlcGxveShpbnB1dCwgY29udGV4dCk7XG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUFjdGlvbjxUIGV4dGVuZHMgQWN0aW9uQ29uZmlnPihcbiAgY29uZmlnOiBTYW1lU2hhcGU8QWN0aW9uQ29uZmlnLCBUPixcbiAgaGFuZGxlcjogQWN0aW9uSGFuZGxlclxuKTogQWN0aW9uQ29tbWFuZDxUWydhY3Rpb25OYW1lJ10+IHtcbiAgY29uc3QgZm4gPSBhc3luYyAoaW5wdXQ6IEFjdGlvbklucHV0LCBjb250ZXh0OiBBY3Rpb25Db250ZXh0KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgYXdhaXQgaGFuZGxlcihpbnB1dCwgY29udGV4dCk7XG4gIH07XG5cbiAgZm4uZmFjdG9yeVR5cGUgPSAnYWN0aW9uJyBhcyBjb25zdDtcbiAgZm4uaWQgPSBjb25maWcuaWQ7XG4gIGZuLmFjdGlvbk5hbWUgPSBjb25maWcuYWN0aW9uTmFtZTtcbiAgZm4uZGVzY3JpcHRpb24gPSBjb25maWcuZGVzY3JpcHRpb247XG4gIGZuLmljb24gPSBjb25maWcuaWNvbjtcbiAgZm4uc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZSA9IGNvbmZpZy5zdXBwb3J0c0JhY2tncm91bmRNb2RlO1xuICBmbi5hbGxvd0NvbmN1cnJlbnQgPSBjb25maWcuYWxsb3dDb25jdXJyZW50O1xuICBmbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gIGZuLnNvdXJjZVBhdGggPSBjb25maWcuc291cmNlUGF0aDtcblxuICByZXR1cm4gZm4gYXMgQWN0aW9uQ29tbWFuZDxUWydhY3Rpb25OYW1lJ10+O1xufVxuIiwgIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgaW5qZWN0cyBhY3Rpb24gYW5kIHR5cGUgaG9vayBpbnB1dHMgdmlhIHByb2Nlc3MuZW52LlxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgc3RyaWN0IGdldHRlcnMgYW5kIHR5cGVkIGV4dHJhY3RvcnMgc28gaGFuZGxlcnMgZG8gbm90XG4gKiBuZWVkIHRvIHBhcnNlIGVudmlyb25tZW50IHZhcmlhYmxlcyBtYW51YWxseS5cbiAqXG4gKiBVc2UgdGhlIGluZGl2aWR1YWwgZ2V0dGVycyB3aGVuIHlvdSBvbmx5IG5lZWQgb25lIHZhbHVlOyB1c2VcbiAqIHtAbGluayBleHRyYWN0QWN0aW9uSW5wdXR9IG9yIHtAbGluayBleHRyYWN0VHlwZUlucHV0fSB3aGVuIHlvdSBuZWVkIGEgZnVsbFxuICogdHlwZWQgcGF5bG9hZCBmb3IgYW4gYWN0aW9uIG9yIHR5cGUgaG9vay5cbiAqXG4gKlxuICogQHN1bW1hcnkgRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25JbnB1dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMgc2V0IGJ5IHRoZSBDYXJkcyBleGVjdXRpb24gd3JhcHBlci5cbiAqXG4gKiBUaGlzIGlzIHRoZSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciBlbnYgdmFyIGtleXMgdXNlZCBieSBhY3Rpb24gYW5kIHR5cGVcbiAqIGhvb2sgcHJvY2Vzc2VzLiBLZWVwIGl0IGluIHN5bmMgd2l0aCB0aGUgd3JhcHBlciB0byBhdm9pZCBzdWJ0bGUgXCJ1bmRlZmluZWRcbiAqIGlucHV0XCIgYnVncy5cbiAqL1xuZXhwb3J0IGNvbnN0IENBUkRTX0VOVl9WQVJTID0ge1xuICAvKipcbiAgICogVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBjdXJyZW50IGNhcmQuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIENBUkRfSUQ6ICdDQVJEX0lEJyxcblxuICAvKipcbiAgICogVGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSBzZXR0aW5ncy5qc29uLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBFTlZJUk9OTUVOVDogJ0VOVklST05NRU5UJyxcblxuICAvKipcbiAgICogRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gYnV0dG9uIHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgQUNUSU9OX05BTUU6ICdBQ1RJT05fTkFNRScsXG5cbiAgLyoqXG4gICAqIENhcmQncyBleGVjdXRpb24gbW9kZSwgZGV0ZXJtaW5pbmcgVUkgaW50ZXJhY3Rpb24gbW9kZWwuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogVmFsaWQgdmFsdWVzOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnXG4gICAqL1xuICBFWEVDVVRJT05fTU9ERTogJ0VYRUNVVElPTl9NT0RFJyxcblxuICAvKipcbiAgICogQ2FyZHMgc2VydmVyIGJhc2UgVVJMIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9CQVNFX1VSTDogJ0FQSV9CQVNFX1VSTCcsXG5cbiAgLyoqXG4gICAqIEF1dGhlbnRpY2F0aW9uIHRva2VuIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9BQ0NFU1NfVE9LRU46ICdBUElfQUNDRVNTX1RPS0VOJyxcblxuICAvKipcbiAgICogQ29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogT3B0aW9uYWwuXG4gICAqL1xuICBDT0RJTkdfQUdFTlQ6ICdDT0RJTkdfQUdFTlQnLFxuXG4gIC8qKlxuICAgKiBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX05BTUU6ICdUWVBFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSdzIHZlcnNpb24gc3RyaW5nIGZyb20gc2V0dGluZ3MuanNvbiBjb25maWd1cmF0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9WRVJTSU9OOiAnVFlQRV9WRVJTSU9OJyxcblxuICAvKipcbiAgICogVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9OQU1FOiAnRklMRV9OQU1FJyxcblxuICAvKipcbiAgICogRnVsbCBwYXRoIHRvIHRoZSBmaWxlLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9QQVRIOiAnRklMRV9QQVRIJyxcblxuICAvKipcbiAgICogRmlsZSBzaXplIGluIGJ5dGVzLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9TSVpFOiAnRklMRV9TSVpFJyxcblxuICAvKipcbiAgICogU0hBMjU2IGhhc2ggb2YgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFNIQTI1NjogJ1NIQTI1NicsXG5cbiAgLyoqXG4gICAqIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIENPTlRFTlRfVFlQRTogJ0NPTlRFTlRfVFlQRScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgICh3aXRoXG4gICAqIGBFTEVDVFJPTl9SVU5fQVNfTk9ERT0xYCkuIENvbW1hbmRzIGluIHNldHRpbmdzLmpzb24gdXNlXG4gICAqIGAkVlNDT0RFX05PREUgLi9iaW4vLi4uYCBzbyB0aGV5IHdvcmsgcmVnYXJkbGVzcyBvZlxuICAgKiB3aGV0aGVyIGBub2RlYCBpcyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIFZTQ09ERV9OT0RFOiAnVlNDT0RFX05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyIHJ1bm5pbmcgdGhlIHdyYXBwZXIgcHJvY2Vzcy5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSB3cmFwcGVyIGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgLiBVc2UgYCROT0RFYCBpbiBlbWJlZGRlZFxuICAgKiBiYXNoIHN0YXRlbWVudHMgdG8gaW52b2tlIE5vZGUgc2NyaXB0cyBwb3J0YWJseS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zLlxuICAgKi9cbiAgTk9ERTogJ05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgU09DS0VUX1BBVEg6ICdTT0NLRVRfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gYSBKU09OIGZpbGUgY29udGFpbmluZyBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZnJvbSBhIHByZXZpb3VzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuIE9wdGlvbmFsLlxuICAgKi9cbiAgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSDogJ1NXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENPTkZJR19QQVRIOiAnQ09ORklHX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFdPUktTUEFDRV9QQVRIOiAnV09SS1NQQUNFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDQVJEX1JFUE9fUEFUSDogJ0NBUkRfUkVQT19QQVRIJyxcblxuICAvKipcbiAgICogUmVzb2x2ZWQgc2hlbGwgY29tbWFuZCBmb3IgdGhlIHdyYXBwZXIgdG8gc3Bhd24gYXMgdGhlIGFjdGlvbiBoYW5kbGVyLlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgY29uc3VtZWQgYnkgdGhlIHdyYXBwZXIgKG5vdCBieSBhY3Rpb24gaGFuZGxlcnMpLlxuICAgKi9cbiAgQUNUSU9OX0NPTU1BTkQ6ICdBQ1RJT05fQ09NTUFORCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggdGhhdCB0aGUgY2FyZCdzIHdvcmtzcGFjZSBicmFuY2ggd2lsbCBtZXJnZSBpbnRvLlxuICAgKiBSZXNvbHZlZCBmcm9tIHRoZSB3b3Jrc3BhY2UgSEVBRCBhdCBsYXVuY2ggdGltZS5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQkFTRV9CUkFOQ0g6ICdCQVNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggZnJvbSB3aGljaCB0aGUgY2FyZCdzIHdvcmtzcGFjZSBicmFuY2ggd2FzIGNyZWF0ZWQuXG4gICAqIE1heSBkaWZmZXIgZnJvbSBCQVNFX0JSQU5DSCB3aGVuIHRoZSB3b3JrdHJlZSB3YXMgY3JlYXRlZCBhZ2FpbnN0XG4gICAqIGEgZGlmZmVyZW50IHJlZiB0aGFuIHRoZSBjdXJyZW50IHdvcmtzcGFjZSBIRUFELlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBQQVJFTlRfQlJBTkNIOiAnUEFSRU5UX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggbmFtZSBmb3IgdGhlIGNhcmQncyB3b3Jrc3BhY2UgaW1wbGVtZW50YXRpb24uXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbiBhZnRlciByZXNvbHZpbmcgb3IgY3JlYXRpbmcgdGhlIHdvcmt0cmVlLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgV09SS1NQQUNFX0JSQU5DSDogJ1dPUktTUEFDRV9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBTZXNzaW9uIElEIHBlcnNpc3RlZCBieSB0aGUgc2Vzc2lvbi1zdGFydCBob29rIHZpYSBgcGVyc2lzdEVudlZhcmAuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBCYXNoIHRvb2wgc2hlbGwgZGVzY2VuZGFudHMgKGNvbW1hbmRzLCBnaXQgaG9va3MpIGFmdGVyXG4gICAqIHNlc3Npb24gc3RhcnQuIE5PVCBhdmFpbGFibGUgaW4gaG9va3Mgc3Bhd25lZCBkaXJlY3RseSBieSBDbGF1ZGUgQ29kZVxuICAgKiAoc3RvcCwgc2Vzc2lvbi1lbmQsIGV0Yy4pIFx1MjAxNCB0aG9zZSByZWNlaXZlIHRoZSBzZXNzaW9uIElEIHZpYSBob29rIGlucHV0LlxuICAgKlxuICAgKiBUaGUgY2FyZC1yZXBvIHBvc3QtY29tbWl0IGhvb2sgcmVhZHMgdGhpcyB0byByZWNvcmQgY29tbWl0cyBkaXJlY3RseVxuICAgKiB3aXRob3V0IG5lZWRpbmcgYSBwcm9jZXNzLXRyZWUgd2FsayBvciBQSUQgcmVnaXN0cnkgbG9va3VwLlxuICAgKi9cbiAgQ0FSRFNfU0VTU0lPTl9JRDogJ0NBUkRTX1NFU1NJT05fSUQnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBWUyBDb2RlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5LlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gICAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAgICogYXMgdGhlIHJ1bnRpbWUgcGx1Z2luIGRpcmVjdG9yeSAoYDxleHRlbnNpb25QYXRoPi9kaXN0L3BsdWdpbnMvcnVudGltZWApLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqL1xuICBFWFRFTlNJT05fUEFUSDogJ0VYVEVOU0lPTl9QQVRIJ1xufSBhcyBjb25zdDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW5kaXZpZHVhbCBHZXR0ZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogUmVhZHMgdGhlIGNhcmQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgYWx3YXlzIHNldHMgdGhpcyBmb3IgZXZlcnkgYWN0aW9uIGFuZCB0eXBlIGhvb2suXG4gKiBAcmV0dXJucyBUaGUgY3VycmVudCBjYXJkIElEXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfSUQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNhcmRJZCA9IGdldENhcmRJZCgpO1xuICogY29uc29sZS5sb2coYFByb2Nlc3NpbmcgY2FyZDogJHtjYXJkSWR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRJZCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfSURdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2YWx1ZSBtYXRjaGVzIHRoZSBlbnZpcm9ubWVudCBrZXkgaW4gc2V0dGluZ3MuanNvbiAoZS5nLiwgXCJkZWZhdWx0XCIsIFwic3RhZ2luZ1wiKS5cbiAqIEByZXR1cm5zIFRoZSBlbnZpcm9ubWVudCBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVOVklST05NRU5UIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZpcm9ubWVudCA9IGdldEVudmlyb25tZW50KCk7XG4gKiBjb25zb2xlLmxvZyhgRW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudmlyb25tZW50KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhY3Rpb24gYnV0dG9uIG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyB0aGUgZGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGhhbmRsZXIsIG1hdGNoaW5nXG4gKiB0aGUgYGFjdGlvbk5hbWVgIGZpZWxkIGZyb20gYGRlZmluZUFjdGlvbmAuXG4gKiBAcmV0dXJucyBEaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgY3VycmVudCBoYW5kbGVyIHJ1bi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQUNUSU9OX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFjdGlvbk5hbWUgPSBnZXRBY3Rpb25OYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgUnVubmluZyBhY3Rpb246ICR7YWN0aW9uTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aW9uTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZXhlY3V0aW9uIG1vZGUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogRGV0ZXJtaW5lcyB0aGUgVUkgaW50ZXJhY3Rpb24gbW9kZWwgZm9yIGFjdGlvbnMuXG4gKiBAcmV0dXJucyBUaGUgZXhlY3V0aW9uIG1vZGUgKCdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnKVxuICogQHRocm93cyBFcnJvciBpZiBFWEVDVVRJT05fTU9ERSBpcyBtaXNzaW5nLCBlbXB0eSwgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG1vZGUgPSBnZXRFeGVjdXRpb25Nb2RlKCk7XG4gKiBpZiAobW9kZSA9PT0gJ2ludGVyYWN0aXZlJykge1xuICogICAvLyBTaG93IHVzZXIgcHJvbXB0c1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeGVjdXRpb25Nb2RlKCk6ICdpbnRlcmFjdGl2ZScgfCAnYmFja2dyb3VuZCcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfWApO1xuICB9XG4gIGlmICh2YWx1ZSAhPT0gJ2ludGVyYWN0aXZlJyAmJiB2YWx1ZSAhPT0gJ2JhY2tncm91bmQnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9OiBleHBlY3RlZCAnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJywgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQVBJIGJhc2UgVVJMIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFVzZSB0aGlzIGFzIHRoZSBiYXNlIGZvciBjb25zdHJ1Y3RpbmcgQVBJIGVuZHBvaW50cy4gVGhlIFVSTCBkb2VzIG5vdCBpbmNsdWRlXG4gKiBhIHRyYWlsaW5nIHNsYXNoLlxuICogQHJldHVybnMgQmFzZSBVUkwgdXNlZCB0byBjb25zdHJ1Y3QgQ2FyZHMgQVBJIGVuZHBvaW50cyBmb3IgdGhpcyBleGVjdXRpb24uXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFQSV9CQVNFX1VSTCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYXBpVXJsID0gZ2V0QXBpQmFzZVVybCgpO1xuICogY29uc3QgZW5kcG9pbnQgPSBgJHthcGlVcmx9L2NhcmRzLyR7Y2FyZElkfWA7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUJhc2VVcmwoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkxdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQVBJIGFjY2VzcyB0b2tlbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBCZWFyZXIgdG9rZW4gdmFsaWQgZm9yIHRoZSBkdXJhdGlvbiBvZiB0aGlzIGFjdGlvbiBvciB0eXBlIGhvb2sgZXhlY3V0aW9uLlxuICogSW5jbHVkZSBpbiBBdXRob3JpemF0aW9uIGhlYWRlcnMgd2hlbiBjYWxsaW5nIHRoZSBDYXJkcyBBUEkuXG4gKiBAcmV0dXJucyBCZWFyZXIgdG9rZW4gdGhhdCBhdXRob3JpemVzIEFQSSByZXF1ZXN0cyBmb3IgdGhpcyBleGVjdXRpb24gY29udGV4dC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0FDQ0VTU19UT0tFTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdG9rZW4gPSBnZXRBcGlBY2Nlc3NUb2tlbigpO1xuICogY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChhcGlVcmwsIHtcbiAqICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dG9rZW59YCB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQWNjZXNzVG9rZW4oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU59YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjb25maWd1cmVkIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIE9wdGlvbmFsIHZhbHVlIGZyb20gY2FyZHMuY29kaW5nQWdlbnQgc2V0dGluZy4gV2hlbiBzZXQsIGluZGljYXRlcyB3aGljaCBBSVxuICogY29kaW5nIGFzc2lzdGFudCB0aGUgdXNlciBwcmVmZXJzLiBBY3Rpb25zIGNhbiB1c2UgdGhpcyB0byBjdXN0b21pemUgYmVoYXZpb3JcbiAqIG9yIHByb21wdHMgZm9yIGRpZmZlcmVudCBhZ2VudHMuXG4gKiBAcmV0dXJucyBUaGUgY29kaW5nIGFnZW50IGlkZW50aWZpZXIsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29kaW5nQWdlbnQgPSBnZXRDb2RpbmdBZ2VudCgpO1xuICogaWYgKGNvZGluZ0FnZW50ID09PSAnY2xhdWRlJykge1xuICogICAvLyBDdXN0b21pemUgZm9yIENsYXVkZVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb2RpbmdBZ2VudCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPRElOR19BR0VOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZSBmb3IgdHlwZSBob29rcy5cbiAqXG4gKiBUaGlzIHZhbHVlIGlzIG9ubHkgcHJlc2VudCBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqIEByZXR1cm5zIFRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBUWVBFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHR5cGVOYW1lID0gZ2V0VHlwZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBUeXBlOiAke3R5cGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlIHZlcnNpb24gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2ZXJzaW9uIGNvbWVzIGZyb20gdGhlIHR5cGUgY29uZmlndXJhdGlvbiBpbiBzZXR0aW5ncy5qc29uLlxuICogQHJldHVybnMgVGhlIHZlcnNpb24gc3RyaW5nIGZyb20gdHlwZSBjb25maWdcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9WRVJTSU9OIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB2ZXJzaW9uID0gZ2V0VHlwZVZlcnNpb24oKTtcbiAqIGNvbnNvbGUubG9nKGBWZXJzaW9uOiAke3ZlcnNpb259YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVWZXJzaW9uKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgbmFtZSBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmaWxlIG5hbWUgcmVsYXRpdmUgdG8gdGhlIHR5cGUgZGlyZWN0b3J5LCBub3QgYSBmdWxsIHBhdGguXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBuYW1lIHdpdGhpbiB0aGUgdHlwZSBkaXJlY3RvcnlcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlTmFtZSA9IGdldEZpbGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgRmlsZTogJHtmaWxlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgdHlwZWQgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmdWxseSByZXNvbHZlZCBwYXRoIG9uIGRpc2sgcHJvdmlkZWQgYnkgdGhlIGV4ZWN1dGlvbiB3cmFwcGVyLlxuICogQHJldHVybnMgVGhlIGZ1bGwgcGF0aCB0byB0aGUgZmlsZVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVQYXRoID0gZ2V0RmlsZVBhdGgoKTtcbiAqIGNvbnNvbGUubG9nKGBQYXRoOiAke2ZpbGVQYXRofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIHNpemUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIHZhbHVlIGlzIHBhcnNlZCBhcyBhIGJhc2UtMTAgaW50ZWdlci5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIHNpemUgaW4gYnl0ZXNcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9TSVpFIGlzIG1pc3Npbmcgb3Igbm90IGEgbnVtYmVyXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgc2l6ZSA9IGdldEZpbGVTaXplKCk7XG4gKiBjb25zb2xlLmxvZyhgU2l6ZTogJHtzaXplfSBieXRlc2ApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlU2l6ZSgpOiBudW1iZXIge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9YCk7XG4gIH1cbiAgY29uc3Qgc2l6ZSA9IE51bWJlci5wYXJzZUludCh2YWx1ZSwgMTApO1xuICBpZiAoTnVtYmVyLmlzTmFOKHNpemUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfTogZXhwZWN0ZWQgbnVtYmVyLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHNpemU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFNIQTI1NiBoYXNoIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFVzZWZ1bCBmb3IgZGV0ZWN0aW5nIGNvbnRlbnQgY2hhbmdlcyB3aXRob3V0IHJlYWRpbmcgdGhlIGZpbGUgYWdhaW4uXG4gKiBAcmV0dXJucyBUaGUgU0hBMjU2IGhhc2ggb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgU0hBMjU2IGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBoYXNoID0gZ2V0U2hhMjU2KCk7XG4gKiBjb25zb2xlLmxvZyhgSGFzaDogJHtoYXNofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTaGEyNTYoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TSEEyNTZdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU0hBMjU2fWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgTUlNRSB0eXBlIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFByb3ZpZGVkIGZvciB0eXBlIGhvb2sgZXZlbnRzIHNvIHZhbGlkYXRvcnMgY2FuIGJyYW5jaCBvbiBjb250ZW50IHR5cGUuXG4gKiBAcmV0dXJucyBUaGUgTUlNRSB0eXBlIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTlRFTlRfVFlQRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29udGVudFR5cGUgPSBnZXRDb250ZW50VHlwZSgpO1xuICogY29uc29sZS5sb2coYENvbnRlbnQgdHlwZTogJHtjb250ZW50VHlwZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29udGVudFR5cGUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIgcGF0aCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHNldCBieSB0aGUgZXh0ZW5zaW9uIGR1cmluZyBhY3RpdmF0aW9uIGFuZCBpbmplY3RlZCBpbnRvIGFsbFxuICogc3Bhd25lZCBhY3Rpb24vaG9vayBwcm9jZXNzZXMuIENvbmZpZ3VyYXRpb24gYXV0aG9ycyBjYW4gdXNlIGl0IHRvIGludm9rZVxuICogTm9kZS5qcyB3aXRob3V0IHJlbHlpbmcgb24gdGhlIHN5c3RlbSBQQVRILlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyXG4gKiBAdGhyb3dzIEVycm9yIGlmIFZTQ09ERV9OT0RFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBub2RlUGF0aCA9IGdldFZzY29kZU5vZGVQYXRoKCk7XG4gKiBleGVjRmlsZVN5bmMobm9kZVBhdGgsIFsnc2NyaXB0LmpzJ10pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRWc2NvZGVOb2RlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlZTQ09ERV9OT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlZTQ09ERV9OT0RFfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVW5peCBkb21haW4gc29ja2V0IHBhdGggZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICpcbiAqIEByZXR1cm5zIFVuaXggc29ja2V0IHBhdGggdXNlZCB0byBzZW5kIHJ1bnRpbWUgY29udHJvbCBtZXNzYWdlcy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgU09DS0VUX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U29ja2V0UGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcGF0aCB0byB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogVGhpcyBpcyBvcHRpb25hbCBcdTIwMTQgcmV0dXJucyB1bmRlZmluZWQgd2hlbiBub3Qgc2V0IChpLmUuLCB0aGUgYWN0aW9uXG4gKiB3YXMgbm90IHJlbGF1bmNoZWQgdmlhIHN3aXRjaFRvSW50ZXJhY3RpdmUpLlxuICpcbiAqIEByZXR1cm5zIFRoZSBmaWxlIHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YVBhdGgoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHNldHRpbmdzIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5IGNvbnRhaW5pbmcgZ2VuZXJhdGVkIHNldHRpbmdzIGFydGlmYWN0cy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09ORklHX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBhY3RpdmUgVlMgQ29kZSB3b3Jrc3BhY2Ugcm9vdC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgV09SS1NQQUNFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29ya3NwYWNlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgcmVwb3NpdG9yeSBhc3NvY2lhdGVkIHdpdGggdGhlIGFjdGl2ZSBjYXJkLlxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX1JFUE9fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkUmVwb1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYVEVOU0lPTl9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVuc2lvblBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHBhcnNlcyB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogV2hlbiBgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSGAgaXMgc2V0LCByZWFkcyB0aGUgZmlsZSBhdCB0aGF0IHBhdGhcbiAqIGFuZCBwYXJzZXMgaXQgYXMgSlNPTi4gUmV0dXJucyB1bmRlZmluZWQgaWYgdGhlIGVudiB2YXIgaXMgbm90IHNldC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGFyc2VkIGRhdGEsIG9yIHVuZGVmaW5lZCBpZiB0aGUgcGF0aCBpcyBub3Qgc2V0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBmaWxlIGNhbm5vdCBiZSByZWFkIG9yIGNvbnRhaW5zIGludmFsaWQgSlNPTlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCk6IHVua25vd24gfCB1bmRlZmluZWQge1xuICBjb25zdCBkYXRhUGF0aCA9IGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpO1xuICBpZiAoZGF0YVBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhkYXRhUGF0aCwgJ3V0Zi04Jyk7XG4gIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlZCBJbnB1dCBFeHRyYWN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgYWN0aW9uIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKlxuICogQHJldHVybnMgVHlwZWQgQWN0aW9uSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYW4gYWN0aW9uIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5jYXJkSWQpO1xuICogY29uc29sZS5sb2coaW5wdXQuZXhlY3V0aW9uTW9kZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBY3Rpb25JbnB1dCgpOiBBY3Rpb25JbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBhY3Rpb25OYW1lOiBnZXRBY3Rpb25OYW1lKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgZXhlY3V0aW9uTW9kZTogZ2V0RXhlY3V0aW9uTW9kZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKSxcbiAgICBjb2RpbmdBZ2VudDogZ2V0Q29kaW5nQWdlbnQoKSxcbiAgICBzd2l0Y2hUb0ludGVyYWN0aXZlRGF0YTogcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCksXG4gICAgd29ya3NwYWNlUGF0aDogZ2V0V29ya3NwYWNlUGF0aCgpLFxuICAgIGNhcmRSZXBvUGF0aDogZ2V0Q2FyZFJlcG9QYXRoKCksXG4gICAgY29uZmlnUGF0aDogZ2V0Q29uZmlnUGF0aCgpLFxuICAgIGV4dGVuc2lvblBhdGg6IGdldEV4dGVuc2lvblBhdGgoKVxuICB9O1xufVxuXG4vKipcbiAqIEJ1aWxkcyBhIHR5cGVkIHR5cGUgaG9vayBpbnB1dCBvYmplY3QgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogRXh0cmFjdHMgYWxsIGZpZWxkcyByZXF1aXJlZCBmb3IgdHlwZSBsaWZlY3ljbGUgaG9va3MgKHZhbGlkYXRvciwgY3JlYXRlLFxuICogdXBkYXRlLCBkZWxldGUpLlxuICpcbiAqIEByZXR1cm5zIFR5cGVkIFR5cGVIb29rSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYSB0eXBlIGhvb2sgaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0VHlwZUlucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC50eXBlTmFtZSk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5maWxlTmFtZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RUeXBlSW5wdXQoKTogVHlwZUhvb2tJbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICB0eXBlTmFtZTogZ2V0VHlwZU5hbWUoKSxcbiAgICB0eXBlVmVyc2lvbjogZ2V0VHlwZVZlcnNpb24oKSxcbiAgICBmaWxlTmFtZTogZ2V0RmlsZU5hbWUoKSxcbiAgICBmaWxlUGF0aDogZ2V0RmlsZVBhdGgoKSxcbiAgICBmaWxlU2l6ZTogZ2V0RmlsZVNpemUoKSxcbiAgICBmaWxlU2hhMjU2OiBnZXRTaGEyNTYoKSxcbiAgICBjb250ZW50VHlwZTogZ2V0Q29udGVudFR5cGUoKSxcbiAgICBhcGlCYXNlVXJsOiBnZXRBcGlCYXNlVXJsKCksXG4gICAgYXBpQWNjZXNzVG9rZW46IGdldEFwaUFjY2Vzc1Rva2VuKClcbiAgfTtcbn1cbiIsICIvKipcbiAqIEV4aXQgY29kZSBjb25zdGFudHMgYW5kIGhlbHBlcnMgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcy5cbiAqXG4gKiBDYXJkcyBob29rcyBjb21tdW5pY2F0ZSBzdWNjZXNzIGFuZCBmYWlsdXJlIHZpYSBwcm9jZXNzIGV4aXQgY29kZXMgYW5kXG4gKiBzdGRlcnIgb3V0cHV0LiBUaGlzIG1vZHVsZSBjZW50cmFsaXplcyB0aG9zZSBjb252ZW50aW9ucyBzbyB0aGUgcnVudGltZVxuICogYW5kIGhvb2tzIHNwZWFrIHRoZSBzYW1lIHByb3RvY29sLlxuICpcbiAqIEBzdW1tYXJ5IEV4aXQgY29kZSBjb25zdGFudHMgYW5kIGhlbHBlcnMgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rc1xuICogQG1vZHVsZVxuICovXG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4aXQgQ29kZSBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFeGl0IGNvZGVzIHVzZWQgYnkgQ2FyZHMgaG9va3MuXG4gKlxuICogVGhlIENhcmRzIHJ1bnRpbWUgaW50ZXJwcmV0cyBhbnkgbm9uLXplcm8gZXhpdCBjb2RlIGFzIGZhaWx1cmUuXG4gKi9cbmV4cG9ydCBjb25zdCBFWElUX0NPREVTID0ge1xuICAvKiogSGFuZGxlciBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LiAqL1xuICBTVUNDRVNTOiAwLFxuICAvKiogSGFuZGxlciB0aHJldyBhbiBlcnJvci4gKi9cbiAgRVJST1I6IDEsXG4gIC8qKiBIYW5kbGVyIHByb2Nlc3NlZCBzd2l0Y2hUb0ludGVyYWN0aXZlIGFuZCBpcyBleGl0aW5nIGZvciByZWxhdW5jaC4gKi9cbiAgU1dJVENIX1RPX0lOVEVSQUNUSVZFOiA0MlxufSBhcyBjb25zdDtcblxuLyoqXG4gKiBVbmlvbiBvZiB2YWxpZCBDYXJkcyBob29rIGV4aXQgY29kZXMuXG4gKi9cbmV4cG9ydCB0eXBlIEV4aXRDb2RlID0gKHR5cGVvZiBFWElUX0NPREVTKVtrZXlvZiB0eXBlb2YgRVhJVF9DT0RFU107XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVycm9yIE91dHB1dCBIZWxwZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogV3JpdGVzIGFuIGVycm9yIG1lc3NhZ2UgdG8gc3RkZXJyIHdpdGggYSB0cmFpbGluZyBuZXdsaW5lLlxuICpcbiAqIFVzZSB0aGlzIHdoZW4gYSBob29rIG5lZWRzIHRvIHJlcG9ydCBhIGZhaWx1cmUgd2l0aG91dCBwb2xsdXRpbmcgc3Rkb3V0LlxuICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciBtZXNzYWdlIHRvIHdyaXRlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogd3JpdGVFcnJvcignRmFpbGVkIHRvIGNvbm5lY3QgdG8gZGF0YWJhc2UnKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVFcnJvcihtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7bWVzc2FnZX1cXG5gKTtcbn1cblxuLyoqXG4gKiBXcml0ZXMgYW4gZXJyb3IgbWVzc2FnZSB0byBzdGRlcnIgYW5kIGV4aXRzIHdpdGggRVJST1IgY29kZS5cbiAqXG4gKiBUaGlzIHRlcm1pbmF0ZXMgdGhlIHByb2Nlc3MgaW1tZWRpYXRlbHksIHNvIGFueSBwZW5kaW5nIGFzeW5jIHdvcmsgd2lsbFxuICogbm90IGZpbmlzaCB1bmxlc3MgaXQgd2FzIGFscmVhZHkgYXdhaXRlZC5cbiAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgbWVzc2FnZSB0byB3cml0ZSBiZWZvcmUgZXhpdGluZ1xuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmICghaXNWYWxpZCkge1xuICogICBleGl0V2l0aEVycm9yKCdJbnZhbGlkIGNvbmZpZ3VyYXRpb24nKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhpdFdpdGhFcnJvcihtZXNzYWdlOiBzdHJpbmcpOiBuZXZlciB7XG4gIHdyaXRlRXJyb3IobWVzc2FnZSk7XG4gIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLkVSUk9SKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW50ZXJuYWwgUmVzdWx0IFRyYWNraW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogSW50ZXJuYWwgcnVudGltZSBib29ra2VlcGluZyBmb3IgaG9vayBleGVjdXRpb24gcmVzdWx0cy5cbiAqXG4gKiBUaGlzIHN0cnVjdHVyZSBhbGxvd3MgdGhlIHJ1bnRpbWUgdG8gY2FycnkgZXJyb3IgZGV0YWlscyB3aXRob3V0IGNoYW5naW5nXG4gKiB0aGUgZXhpdC1jb2RlIHByb3RvY29sLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEhvb2tFeGVjdXRpb25SZXN1bHQge1xuICAvKiogV2hldGhlciB0aGUgaG9vayBleGVjdXRlZCBzdWNjZXNzZnVsbHkuICovXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XG4gIC8qKiBUaGUgZXhpdCBjb2RlIHRvIHVzZSB3aGVuIGV4aXRpbmcuICovXG4gIGV4aXRDb2RlOiBFeGl0Q29kZTtcbiAgLyoqIFRoZSBlcnJvciB0aGF0IG9jY3VycmVkLCBpZiBhbnkuICovXG4gIGVycm9yPzogRXJyb3I7XG59XG4iLCAiLyoqXG4gKiBTdHJ1Y3R1cmVkIGxvZ2dpbmcgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcy5cbiAqXG4gKiBPdXRwdXQgaXMgb3B0LWluOiB0aGUgbG9nZ2VyIG9ubHkgZW1pdHMgdG8gcmVnaXN0ZXJlZCBoYW5kbGVycyBvciBhXG4gKiBjb25maWd1cmVkIGxvZyBmaWxlLiBJZiB5b3UgY29uZmlndXJlIG5vdGhpbmcsIHRoZSBsb2dnZXIgcG9saXRlbHkgc2F5c1xuICogbm90aGluZyBhdCBhbGwuIEl0IG5ldmVyIHdyaXRlcyB0byBzdGRvdXQgYW5kIGF2b2lkcyBzdGRlcnIgdG8ga2VlcCBob29rXG4gKiBwcm90b2NvbHMgY2xlYW4uXG4gKlxuICogQHN1bW1hcnkgU3RydWN0dXJlZCBsb2dnaW5nIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3NcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGxvZyBldmVudHNcbiAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICogICBjb25zb2xlLmVycm9yKGBFcnJvciBpbiAke2V2ZW50Lmhvb2tUeXBlfTogJHtldmVudC5tZXNzYWdlfWApO1xuICogfSk7XG4gKlxuICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gKiB1bnN1YnNjcmliZSgpO1xuICogYGBgXG4gKi9cblxuaW1wb3J0IHsgY2xvc2VTeW5jLCBleGlzdHNTeW5jLCBta2RpclN5bmMsIG9wZW5TeW5jLCB3cml0ZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tICdub2RlOnBhdGgnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2cgTGV2ZWwgVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBBdmFpbGFibGUgbG9nIGxldmVscy5cbiAqXG4gKiB8IExldmVsIHwgU2V2ZXJpdHkgfCBVc2UgQ2FzZSB8XG4gKiB8LS0tLS0tLXwtLS0tLS0tLS0tfC0tLS0tLS0tLS18XG4gKiB8IGBkZWJ1Z2AgfCBMb3dlc3QgfCBEZXRhaWxlZCBkZWJ1Z2dpbmcgaW5mb3JtYXRpb24gfFxuICogfCBgaW5mb2AgfCBMb3cgfCBHZW5lcmFsIG9wZXJhdGlvbmFsIGV2ZW50cyB8XG4gKiB8IGB3YXJuYCB8IE1lZGl1bSB8IFdhcm5pbmcgY29uZGl0aW9ucyB0aGF0IG1heSBpbmRpY2F0ZSBpc3N1ZXMgfFxuICogfCBgZXJyb3JgIHwgSGlnaCB8IEVycm9yIGNvbmRpdGlvbnMgcmVxdWlyaW5nIGF0dGVudGlvbiB8XG4gKi9cbmV4cG9ydCB0eXBlIExvZ0xldmVsID0gJ2RlYnVnJyB8ICdpbmZvJyB8ICd3YXJuJyB8ICdlcnJvcic7XG5cbi8qKlxuICogQWxsIGxvZyBsZXZlbHMgaW4gb3JkZXIgb2Ygc2V2ZXJpdHkgKGxvd2VzdCB0byBoaWdoZXN0KS5cbiAqL1xuZXhwb3J0IGNvbnN0IExPR19MRVZFTFMgPSBbJ2RlYnVnJywgJ2luZm8nLCAnd2FybicsICdlcnJvciddIGFzIGNvbnN0IHNhdGlzZmllcyByZWFkb25seSBMb2dMZXZlbFtdO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2cgRXZlbnQgVHlwZVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFN0cnVjdHVyZWQgbG9nIGV2ZW50IGVtaXR0ZWQgYnkgdGhlIGxvZ2dlci5cbiAqXG4gKiBFdmVudHMgaW5jbHVkZSBjb250ZXh0dWFsIGRldGFpbHMgYWJvdXQgaG9vayBleGVjdXRpb24gYW5kIGFyZSBzdWl0YWJsZSBmb3JcbiAqIGRlYnVnZ2luZywgbW9uaXRvcmluZywgYW5kIGFuYWx5dGljcyBwaXBlbGluZXMuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRXhhbXBsZSBsb2cgZXZlbnRcbiAqIGNvbnN0IGV2ZW50OiBMb2dFdmVudCA9IHtcbiAqICAgdGltZXN0YW1wOiAnMjAyNC0wMS0xNVQxMDozMDowMC4wMDBaJyxcbiAqICAgbGV2ZWw6ICd3YXJuJyxcbiAqICAgaG9va1R5cGU6ICdhY3Rpb24tc3RhcnQnLFxuICogICBtZXNzYWdlOiAnQ2FyZCBzdGFydGVkJyxcbiAqICAgaW5wdXQ6IHsgY2FyZElkOiAnY2FyZC0xMjMnIH1cbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dFdmVudCB7XG4gIC8qKlxuICAgKiBJU08gODYwMSB0aW1lc3RhbXAgb2Ygd2hlbiB0aGUgZXZlbnQgb2NjdXJyZWQuXG4gICAqIEBleGFtcGxlICcyMDI0LTAxLTE1VDEwOjMwOjAwLjAwMFonXG4gICAqL1xuICB0aW1lc3RhbXA6IHN0cmluZztcblxuICAvKipcbiAgICogU2V2ZXJpdHkgbGV2ZWwgb2YgdGhlIGxvZyBldmVudC5cbiAgICovXG4gIGxldmVsOiBMb2dMZXZlbDtcblxuICAvKipcbiAgICogVHlwZSBvZiBob29rIHRoYXQgZ2VuZXJhdGVkIHRoaXMgZXZlbnQuXG4gICAqIE1heSBiZSB1bmRlZmluZWQgZm9yIGV2ZW50cyBvdXRzaWRlIGhvb2sgY29udGV4dC5cbiAgICovXG4gIGhvb2tUeXBlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGhhcHBlbmVkLlxuICAgKi9cbiAgbWVzc2FnZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIb29rIGlucHV0IGRhdGEgYXQgdGhlIHRpbWUgb2YgbG9nZ2luZy5cbiAgICpcbiAgICogVGhpcyBpcyBwYXJ0aWFsIGJ5IGRlc2lnbiwgc28geW91IGNhbiBhdm9pZCBsb2dnaW5nIGxhcmdlIG9yIHNlbnNpdGl2ZVxuICAgKiBwYXlsb2FkcyB3aGlsZSBzdGlsbCBjYXB0dXJpbmcga2V5IGlkZW50aWZpZXJzLlxuICAgKi9cbiAgaW5wdXQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuICAvKipcbiAgICogRXJyb3IgaW5mb3JtYXRpb24gaWYgdGhpcyBldmVudCByZXByZXNlbnRzIGFuIGVycm9yLlxuICAgKiBDb250YWlucyBzdHJ1Y3R1cmVkIGVycm9yIGRldGFpbHMgZm9yIGFuYWx5c2lzLlxuICAgKi9cbiAgZXJyb3I/OiBMb2dFdmVudEVycm9yO1xuXG4gIC8qKlxuICAgKiBBZGRpdGlvbmFsIGNvbnRleHQgZGF0YSBwcm92aWRlZCBieSB0aGUgY2FsbGVyLlxuICAgKlxuICAgKiBVc2UgdGhpcyBmb3Igc3RydWN0dXJlZCBtZXRhZGF0YSB0aGF0IHlvdSB3YW50IGRvd25zdHJlYW0gaGFuZGxlcnNcbiAgICogdG8gcmVjZWl2ZSAoZS5nLiwgcmVxdWVzdCBJRHMsIHRpbWluZyBkYXRhKS5cbiAgICovXG4gIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuLyoqXG4gKiBTdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uIHdpdGhpbiBhIGxvZyBldmVudC5cbiAqXG4gKiBFcnJvcnMgYXJlIG5vcm1hbGl6ZWQgc28gaGFuZGxlcnMgY2FuIGRlcGVuZCBvbiBjb25zaXN0ZW50IHNoYXBlLCBldmVuIHdoZW5cbiAqIGNhbGxlcnMgdGhyb3cgbm9uLUVycm9yIHZhbHVlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dFdmVudEVycm9yIHtcbiAgLyoqXG4gICAqIEVycm9yIG5hbWUgKGUuZy4sICdUeXBlRXJyb3InLCAnVmFsaWRhdGlvbkVycm9yJykuXG4gICAqL1xuICBuYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEVycm9yIG1lc3NhZ2UgZGVzY3JpYmluZyB3aGF0IHdlbnQgd3JvbmcuXG4gICAqL1xuICBtZXNzYWdlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFN0YWNrIHRyYWNlIGlmIGF2YWlsYWJsZS5cbiAgICovXG4gIHN0YWNrPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBFcnJvciBjYXVzZSBjaGFpbiBpZiB0aGUgZXJyb3Igd2FzIHdyYXBwZWQuXG4gICAqL1xuICBjYXVzZT86IExvZ0V2ZW50RXJyb3I7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV2ZW50IEhhbmRsZXIgVHlwZVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEhhbmRsZXIgaW52b2tlZCB3aGVuIGEgbG9nIGV2ZW50IGlzIGVtaXR0ZWQuXG4gKlxuICogSGFuZGxlcnMgcnVuIHN5bmNocm9ub3VzbHkuIEVycm9ycyB0aHJvd24gYnkgYSBoYW5kbGVyIGFyZSBzd2FsbG93ZWQgc29cbiAqIGxvZ2dpbmcgY2Fubm90IGJyZWFrIGhvb2sgZXhlY3V0aW9uLlxuICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byBoYW5kbGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3J3YXJkIHRvIGV4dGVybmFsIGxvZ2dpbmcgc2VydmljZVxuICogY29uc3QgaGFuZGxlcjogTG9nRXZlbnRIYW5kbGVyID0gKGV2ZW50KSA9PiB7XG4gKiAgIGV4dGVybmFsTG9nZ2VyLmxvZyh7XG4gKiAgICAgbGV2ZWw6IGV2ZW50LmxldmVsLFxuICogICAgIG1lc3NhZ2U6IGV2ZW50Lm1lc3NhZ2UsXG4gKiAgICAgbWV0YWRhdGE6IHsgaG9va1R5cGU6IGV2ZW50Lmhvb2tUeXBlIH1cbiAqICAgfSk7XG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIExvZ0V2ZW50SGFuZGxlciA9IChldmVudDogTG9nRXZlbnQpID0+IHZvaWQ7XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgYSBsb2cgZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBDYWxsIHRoaXMgZnVuY3Rpb24gdG8gc3RvcCByZWNlaXZpbmcgbG9nIGV2ZW50cy4gQWx3YXlzIGNhbGwgdW5zdWJzY3JpYmVcbiAqIHdoZW4gdGhlIGhhbmRsZXIgaXMgbm8gbG9uZ2VyIG5lZWRlZCB0byBwcmV2ZW50IG1lbW9yeSBsZWFrcy5cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKiAvLyAuLi4gbGF0ZXJcbiAqIHVuc3Vic2NyaWJlKCk7IC8vIFN0b3AgcmVjZWl2aW5nIGV2ZW50c1xuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIFVuc3Vic2NyaWJlID0gKCkgPT4gdm9pZDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIENvbmZpZ3VyYXRpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBMb2dnZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nZ2VyQ29uZmlnIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGxvZyBmaWxlIGZvciBKU09OIExpbmVzIG91dHB1dC5cbiAgICpcbiAgICogSWYgbm90IHNldCwgZmlsZSBsb2dnaW5nIGlzIGRpc2FibGVkLiBDYW4gYWxzbyBiZSBzZXQgdmlhIHRoZVxuICAgKiBgQ0FSRFNfSE9PS1NfTE9HX0ZJTEVgIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICAgKi9cbiAgbG9nRmlsZVBhdGg/OiBzdHJpbmc7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBJbnRlcmZhY2UgKGZvciB0ZXN0aW5nIGFuZCB0eXBlIGNvbXBhdGliaWxpdHkpXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogTG9nZ2VyIGludGVyZmFjZSBmb3Igc3RydWN0dXJlZCwgY29udGV4dC1hd2FyZSBsb2dnaW5nLlxuICpcbiAqIFRoaXMgaW50ZXJmYWNlIGRlZmluZXMgdGhlIHB1YmxpYyBBUEkgb2YgdGhlIExvZ2dlciBjbGFzcy4gSXQgZXhpc3RzXG4gKiBwcmltYXJpbHkgZm9yIHR5cGUgY29tcGF0aWJpbGl0eSBhbmQgdGVzdGluZyBwdXJwb3NlcywgYWxsb3dpbmcgdGVzdHNcbiAqIHRvIG1vY2sgdGhlIGxvZ2dlciB3aXRob3V0IG5lZWRpbmcgdG8gaW1wbGVtZW50IGFsbCBpbnRlcm5hbCBtZXRob2RzLlxuICpcbiAqIEZvciBwcm9kdWN0aW9uIHVzZSwgdXNlIHRoZSB7QGxpbmsgTG9nZ2VyfSBjbGFzcyBvciB0aGUge0BsaW5rIGxvZ2dlcn1cbiAqIHNpbmdsZXRvbiBleHBvcnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSUxvZ2dlciB7XG4gIC8qKlxuICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBEaWFnbm9zdGljIHRleHQgZGVzY3JpYmluZyBsb3ctbGV2ZWwgZXhlY3V0aW9uIGRldGFpbHMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGRlYnVnKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gT3BlcmF0aW9uYWwgbWVzc2FnZSBkZXNjcmliaW5nIG5vcm1hbCBob29rIHByb2dyZXNzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBpbmZvKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhIHdhcm5pbmcgbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBXYXJuaW5nIHRleHQgZm9yIHJlY292ZXJhYmxlIG9yIHN1c3BpY2lvdXMgY29uZGl0aW9ucy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgd2FybihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciB0ZXh0IGRlc2NyaWJpbmcgYSBoYW5kbGVkIGZhaWx1cmUgY29uZGl0aW9uLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBlcnJvcihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIHdpdGggZnVsbCBlcnJvciBkZXRhaWxzLlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gbG9nXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgbG9nRXJyb3IoZXJyb3I6IHVua25vd24sIG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIENsYXNzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogTG9nZ2VyIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3Mgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIGZpbGUgb3V0cHV0LlxuICpcbiAqIE91dHB1dCBpcyBvcHQtaW4gYW5kIGJlc3QtZWZmb3J0OlxuICogLSBXaXRoIG5vIGhhbmRsZXJzIGFuZCBubyBsb2cgZmlsZSwgZXZlbnRzIGFyZSBkcm9wcGVkLlxuICogLSBIYW5kbGVyIGVycm9ycyBhcmUgc3dhbGxvd2VkIHNvIGxvZ2dpbmcgY2Fubm90IGJyZWFrIGhvb2tzLlxuICogLSBGaWxlIG91dHB1dCB1c2VzIEpTT04gTGluZXMgYW5kIGlnbm9yZXMgd3JpdGUgZmFpbHVyZXMuXG4gKlxuICogVGhlIGxvZ2dlciBuZXZlciB3cml0ZXMgdG8gc3Rkb3V0IG9yIHN0ZGVyci5cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGV2ZW50cyBhdCBzcGVjaWZpYyBsZXZlbFxuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiB7XG4gKiAgIHNlbmRBbGVydChldmVudC5tZXNzYWdlKTtcbiAqIH0pO1xuICpcbiAqIC8vIExvZyB3aXRoaW4gYSBob29rIGhhbmRsZXJcbiAqIGxvZ2dlci53YXJuKCdBYm91dCB0byBleGVjdXRlIHRhc2snKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcbiAgLyoqXG4gICAqIFJlZ2lzdGVyZWQgZXZlbnQgaGFuZGxlcnMgYnkgbG9nIGxldmVsLlxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVyczogTWFwPExvZ0xldmVsLCBTZXQ8TG9nRXZlbnRIYW5kbGVyPj4gPSBuZXcgTWFwKCk7XG5cbiAgLyoqXG4gICAqIEZpbGUgZGVzY3JpcHRvciBmb3IgbG9nIGZpbGUgb3V0cHV0LlxuICAgKiBMYXppbHkgaW5pdGlhbGl6ZWQgb24gZmlyc3Qgd3JpdGUuXG4gICAqL1xuICBwcml2YXRlIGxvZ0ZpbGVGZDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBpZiBjb25maWd1cmVkLlxuICAgKi9cbiAgcHJpdmF0ZSBsb2dGaWxlUGF0aDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgZmlsZSBpbml0aWFsaXphdGlvbiBoYXMgYmVlbiBhdHRlbXB0ZWQuXG4gICAqL1xuICBwcml2YXRlIGZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBDdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqL1xuICBwcml2YXRlIGN1cnJlbnRIb29rVHlwZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBDdXJyZW50IGhvb2sgaW5wdXQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50SW5wdXQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IExvZ2dlciBpbnN0YW5jZS5cbiAgICpcbiAgICogVHlwaWNhbGx5IHlvdSBzaG91bGQgdXNlIHRoZSBleHBvcnRlZCBgbG9nZ2VyYCBzaW5nbGV0b24gcmF0aGVyIHRoYW5cbiAgICogY3JlYXRpbmcgbmV3IGluc3RhbmNlcy5cbiAgICogQHBhcmFtIGNvbmZpZyAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb25cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBVc2Ugc2luZ2xldG9uIChyZWNvbW1lbmRlZClcbiAgICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICAgKlxuICAgKiAvLyBPciBjcmVhdGUgY3VzdG9tIGluc3RhbmNlXG4gICAqIGNvbnN0IGN1c3RvbUxvZ2dlciA9IG5ldyBMb2dnZXIoeyBsb2dGaWxlUGF0aDogJy92YXIvbG9nL2hvb2tzLmxvZycgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY29uc3RydWN0b3IoY29uZmlnOiBMb2dnZXJDb25maWcgPSB7fSkge1xuICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnMgbWFwIGZvciBlYWNoIGxldmVsXG4gICAgZm9yIChjb25zdCBsZXZlbCBvZiBMT0dfTEVWRUxTKSB7XG4gICAgICB0aGlzLmhhbmRsZXJzLnNldChsZXZlbCwgbmV3IFNldCgpKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgbG9nIGZpbGUgcGF0aCBmcm9tIGNvbmZpZyBvciBlbnZpcm9ubWVudFxuICAgIHRoaXMubG9nRmlsZVBhdGggPSBjb25maWcubG9nRmlsZVBhdGggPz8gcHJvY2Vzcy5lbnZbJ0NBUkRTX0hPT0tTX0xPR19GSUxFJ10gPz8gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBkZXRhaWxlZCBkZWJ1Z2dpbmcgaW5mb3JtYXRpb24gdGhhdCBpcyB0eXBpY2FsbHkgb25seSB1c2VmdWxcbiAgICogZHVyaW5nIGRldmVsb3BtZW50IG9yIHRyb3VibGVzaG9vdGluZy5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBEaWFnbm9zdGljIHRleHQgZGVzY3JpYmluZyBsb3ctbGV2ZWwgZXhlY3V0aW9uIGRldGFpbHMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgaG9vayBpbnB1dCcsIHsgdGFza0lkOiAndGFzay0xMjMnLCBpbnB1dFNpemU6IDI1NiB9KTtcbiAgICogYGBgXG4gICAqL1xuICBkZWJ1ZyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnZGVidWcnLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGluZm8gbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBnZW5lcmFsIG9wZXJhdGlvbmFsIGV2ZW50cyBsaWtlIGhvb2sgaW52b2NhdGlvbnMsIHN1Y2Nlc3NmdWxcbiAgICogY29tcGxldGlvbnMsIG9yIHN0YXRlIGNoYW5nZXMuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gT3BlcmF0aW9uYWwgbWVzc2FnZSBkZXNjcmliaW5nIG5vcm1hbCBob29rIHByb2dyZXNzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmluZm8oJ1Rhc2sgc3RhcnRlZCcsIHsgdGFza0lkOiAndGFzay0xMjMnLCBjYXJkSWQ6ICdjYXJkLTQ1NicgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgaW5mbyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnaW5mbycsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgY29uZGl0aW9ucyB0aGF0IG1heSBpbmRpY2F0ZSBjYXJkcyBidXQgZG9uJ3QgcHJldmVudFxuICAgKiBvcGVyYXRpb24sIHN1Y2ggYXMgZGVwcmVjYXRlZCBwYXR0ZXJucyBvciBwZXJmb3JtYW5jZSBjb25jZXJucy5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBXYXJuaW5nIHRleHQgZm9yIHJlY292ZXJhYmxlIG9yIHN1c3BpY2lvdXMgY29uZGl0aW9ucy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci53YXJuKCdEZXByZWNhdGVkIGhvb2sgcGF0dGVybiBkZXRlY3RlZCcsIHsgcGF0dGVybjogJ2xlZ2FjeU1hdGNoZXInIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHdhcm4obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ3dhcm4nLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZXJyb3IgY29uZGl0aW9ucyB0aGF0IHJlcXVpcmUgYXR0ZW50aW9uIGJ1dCB3ZXJlIGhhbmRsZWRcbiAgICogZ3JhY2VmdWxseS4gRm9yIGV4Y2VwdGlvbnMsIHByZWZlciB7QGxpbmsgbG9nRXJyb3J9LlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIHRleHQgZGVzY3JpYmluZyBhIGhhbmRsZWQgZmFpbHVyZSBjb25kaXRpb24uXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byB2YWxpZGF0ZSBob29rIGlucHV0JywgeyByZWFzb246ICdlbXB0eSB0YXNrSWQnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGVycm9yKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIHdpdGggZnVsbCBlcnJvciBkZXRhaWxzLlxuICAgKlxuICAgKiBVc2UgdGhpcyBmb3IgY2F1Z2h0IGV4Y2VwdGlvbnMuIE5vbi1FcnJvciB2YWx1ZXMgYXJlIG5vcm1hbGl6ZWQgc28gaGFuZGxlcnNcbiAgICogYWx3YXlzIHJlY2VpdmUgYSBjb25zaXN0ZW50IGVycm9yIHNoYXBlLlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gbG9nXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIHRyeSB7XG4gICAqICAgYXdhaXQgZGFuZ2Vyb3VzT3BlcmF0aW9uKCk7XG4gICAqIH0gY2F0Y2ggKGVycikge1xuICAgKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdGYWlsZWQgdG8gZXhlY3V0ZSBkYW5nZXJvdXMgb3BlcmF0aW9uJywge1xuICAgKiAgICAgb3BlcmF0aW9uOiAnZGVsZXRlJyxcbiAgICogICAgIHRhcmdldDogJy9pbXBvcnRhbnQvZmlsZS50eHQnXG4gICAqICAgfSk7XG4gICAqIH1cbiAgICogYGBgXG4gICAqL1xuICBsb2dFcnJvcihlcnJvcjogdW5rbm93biwgbWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICBjb25zdCBlcnJvckluZm8gPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IpO1xuXG4gICAgY29uc3QgZXZlbnQ6IExvZ0V2ZW50ID0ge1xuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBsZXZlbDogJ2Vycm9yJyxcbiAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICBlcnJvcjogZXJyb3JJbmZvLFxuICAgICAgY29udGV4dFxuICAgIH07XG5cbiAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlcyBhIGhhbmRsZXIgdG8gbG9nIGV2ZW50cyBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgKlxuICAgKiBUaGUgaGFuZGxlciB3aWxsIGJlIGNhbGxlZCBmb3IgZXZlcnkgbG9nIGV2ZW50IGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAqIFJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgY2FsbGVkIHdoZW4gdGhlIGhhbmRsZXJcbiAgICogaXMgbm8gbG9uZ2VyIG5lZWRlZC4gSGFuZGxlciBlcnJvcnMgYXJlIGlnbm9yZWQgdG8gYXZvaWQgZGlzcnVwdGluZyBob29rcy5cbiAgICogQHBhcmFtIGxldmVsIC0gVGhlIGxvZyBsZXZlbCB0byBzdWJzY3JpYmUgdG9cbiAgICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGV2ZW50XG4gICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgdGhlIGhhbmRsZXJcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBTdWJzY3JpYmUgdG8gZXJyb3IgZXZlbnRzXG4gICAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICAgKiAgIGNvbnNvbGUuZXJyb3IoYFske2V2ZW50Lmhvb2tUeXBlfV0gJHtldmVudC5tZXNzYWdlfWApO1xuICAgKiAgIGlmIChldmVudC5lcnJvcikge1xuICAgKiAgICAgY29uc29sZS5lcnJvcihldmVudC5lcnJvci5zdGFjayk7XG4gICAqICAgfVxuICAgKiB9KTtcbiAgICpcbiAgICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gICAqIHVuc3Vic2NyaWJlKCk7XG4gICAqIGBgYFxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIEZvcndhcmQgdG8gZXh0ZXJuYWwgbG9nZ2luZyBsaWJyYXJ5XG4gICAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICAgKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubygpO1xuICAgKlxuICAgKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGBgYFxuICAgKi9cbiAgb24obGV2ZWw6IExvZ0xldmVsLCBoYW5kbGVyOiBMb2dFdmVudEhhbmRsZXIpOiBVbnN1YnNjcmliZSB7XG4gICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGxldmVsKTtcbiAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgbGV2ZWxIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGxldmVsSGFuZGxlcnM/LmRlbGV0ZShoYW5kbGVyKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICpcbiAgICogVGhpcyBpcyBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBiZWZvcmUgaW52b2tpbmcgaG9vayBoYW5kbGVycy5cbiAgICogWW91IHR5cGljYWxseSBkb24ndCBuZWVkIHRvIGNhbGwgdGhpcyBkaXJlY3RseS5cbiAgICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIHR5cGUgb2YgaG9vayBiZWluZyBleGVjdXRlZFxuICAgKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCBkYXRhXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc2V0Q29udGV4dChob29rVHlwZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBpbnB1dDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQpOiB2b2lkIHtcbiAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IGhvb2tUeXBlO1xuICAgIHRoaXMuY3VycmVudElucHV0ID0gaW5wdXQ7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXJzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dC5cbiAgICpcbiAgICogQ2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYWZ0ZXIgaG9vayBleGVjdXRpb24gY29tcGxldGVzLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGNsZWFyQ29udGV4dCgpOiB2b2lkIHtcbiAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIGEgZGVmYXVsdCBsb2cgZmlsZSBwYXRoIHRoYXQgb25seSB0YWtlcyBlZmZlY3QgaWYgbm8gb3RoZXIgc291cmNlXG4gICAqIGhhcyBjb25maWd1cmVkIGZpbGUgbG9nZ2luZy5cbiAgICpcbiAgICogVGhpcyBpcyB0aGUgbG93ZXN0LXByaW9yaXR5IGZpbGUgcGF0aCBzb3VyY2UuIEl0IHdpbGwgYmUgaWdub3JlZCBpZlxuICAgKiBhbnkgb2YgdGhlc2UgaGF2ZSBhbHJlYWR5IHNldCBhIHBhdGg6XG4gICAqIC0gYGxvZ0ZpbGVQYXRoYCBpbiB0aGUgY29uc3RydWN0b3IgY29uZmlnXG4gICAqIC0gYENBUkRTX0hPT0tTX0xPR19GSUxFYCBlbnZpcm9ubWVudCB2YXJpYWJsZVxuICAgKiAtIHtAbGluayBzZXRMb2dGaWxlfSBjYWxsZWQgYXQgcnVudGltZVxuICAgKlxuICAgKiBJbnRlbmRlZCBmb3IgdXNlIGJ5IENMSSBlbnRyeSBwb2ludHMgKGUuZy4sIHRoZSBgLS1sb2dgIGZsYWcpLlxuICAgKiBAcGFyYW0gZmlsZVBhdGggLSBEZWZhdWx0IHBhdGggdG8gdGhlIGxvZyBmaWxlXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gV2lyZSAtLWxvZyBDTEkgYXJndW1lbnQgYXMgYSBmYWxsYmFja1xuICAgKiBpZiAoYXJncy5sb2cpIHtcbiAgICogICBsb2dnZXIuc2V0RGVmYXVsdExvZ0ZpbGUoYXJncy5sb2cpO1xuICAgKiB9XG4gICAqIGBgYFxuICAgKi9cbiAgc2V0RGVmYXVsdExvZ0ZpbGUoZmlsZVBhdGg6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0aGlzLmxvZ0ZpbGVQYXRoID09PSBudWxsKSB7XG4gICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb25maWd1cmVzIHRoZSBsb2cgZmlsZSBwYXRoIGF0IHJ1bnRpbWUuXG4gICAqXG4gICAqIENhbGwgdGhpcyB0byBlbmFibGUgb3IgY2hhbmdlIGZpbGUgbG9nZ2luZy4gU2V0dGluZyB0byBgbnVsbGAgZGlzYWJsZXNcbiAgICogZmlsZSBsb2dnaW5nIGFuZCBjbG9zZXMgYW55IG9wZW4gZmlsZSBoYW5kbGUuIERpcmVjdG9yaWVzIGFyZSBjcmVhdGVkXG4gICAqIG9uIGRlbWFuZCB3aGVuIHRoZSBmaXJzdCB3cml0ZSBvY2N1cnMuXG4gICAqIEBwYXJhbSBmaWxlUGF0aCAtIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBvciBudWxsIHRvIGRpc2FibGVcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBFbmFibGUgZmlsZSBsb2dnaW5nIGF0IHJ1bnRpbWVcbiAgICogbG9nZ2VyLnNldExvZ0ZpbGUoJy92YXIvbG9nL2NhcmRzLXNkay5sb2cnKTtcbiAgICpcbiAgICogLy8gRGlzYWJsZSBmaWxlIGxvZ2dpbmdcbiAgICogbG9nZ2VyLnNldExvZ0ZpbGUobnVsbCk7XG4gICAqIGBgYFxuICAgKi9cbiAgc2V0TG9nRmlsZShmaWxlUGF0aDogc3RyaW5nIHwgbnVsbCk6IHZvaWQge1xuICAgIC8vIENsb3NlIGV4aXN0aW5nIGZpbGUgaWYgb3BlblxuICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICB9XG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIGFsbCByZXNvdXJjZXMgaGVsZCBieSB0aGUgbG9nZ2VyLlxuICAgKlxuICAgKiBDYWxsIHRoaXMgZHVyaW5nIGdyYWNlZnVsIHNodXRkb3duIHRvIGVuc3VyZSBhbGwgbG9nIGRhdGEgaXMgZmx1c2hlZC5cbiAgICogU2FmZSB0byBjYWxsIG11bHRpcGxlIHRpbWVzLlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gICAqICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGNsb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICB9XG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZXJlIGFyZSBhbnkgYWN0aXZlIGhhbmRsZXJzIG9yIGRlc3RpbmF0aW9ucy5cbiAgICpcbiAgICogUmV0dXJucyB0cnVlIGlmIGFueSBoYW5kbGVycyBhcmUgcmVnaXN0ZXJlZCBvciBmaWxlIGxvZ2dpbmcgaXMgZW5hYmxlZC5cbiAgICogVXNlZnVsIGZvciBkZWNpZGluZyB3aGV0aGVyIHRvIGNvbXB1dGUgZXhwZW5zaXZlIGxvZyBjb250ZXh0LlxuICAgKiBAcmV0dXJucyBXaGV0aGVyIHRoZSBsb2dnZXIgaGFzIGFueSBhY3RpdmUgb3V0cHV0IGRlc3RpbmF0aW9uc1xuICAgKi9cbiAgaGFzRGVzdGluYXRpb25zKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGhhc0hhbmRsZXJzID0gQXJyYXkuZnJvbSh0aGlzLmhhbmRsZXJzLnZhbHVlcygpKS5zb21lKChoYW5kbGVycykgPT4gaGFuZGxlcnMuc2l6ZSA+IDApO1xuICAgIHJldHVybiBoYXNIYW5kbGVycyB8fCB0aGlzLmxvZ0ZpbGVQYXRoICE9PSBudWxsO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQcml2YXRlIE1ldGhvZHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIC8qKlxuICAgKiBFbWl0cyBhIGxvZyBldmVudC5cbiAgICogQHBhcmFtIGxldmVsIC0gVGhlIHNldmVyaXR5IGxldmVsIG9mIHRoZSBldmVudFxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBsb2cgbWVzc2FnZVxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dCBkYXRhXG4gICAqL1xuICBwcml2YXRlIGVtaXQobGV2ZWw6IExvZ0xldmVsLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIGNvbnN0IGV2ZW50OiBMb2dFdmVudCA9IHtcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgbGV2ZWwsXG4gICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgY29udGV4dFxuICAgIH07XG5cbiAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogRGVsaXZlcnMgYW4gZXZlbnQgdG8gYWxsIHJlZ2lzdGVyZWQgZGVzdGluYXRpb25zLlxuICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGRlbGl2ZXJcbiAgICovXG4gIHByaXZhdGUgZGVsaXZlckV2ZW50KGV2ZW50OiBMb2dFdmVudCk6IHZvaWQge1xuICAgIC8vIERlbGl2ZXIgdG8gZXZlbnQgaGFuZGxlcnNcbiAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnQubGV2ZWwpO1xuICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgbGV2ZWxIYW5kbGVycykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGhhbmRsZXIoZXZlbnQpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgaGFuZGxlciBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFdyaXRlIHRvIGZpbGUgaWYgY29uZmlndXJlZFxuICAgIHRoaXMud3JpdGVUb0ZpbGUoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyBhbiBldmVudCB0byB0aGUgbG9nIGZpbGUuXG4gICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gd3JpdGVcbiAgICovXG4gIHByaXZhdGUgd3JpdGVUb0ZpbGUoZXZlbnQ6IExvZ0V2ZW50KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKSByZXR1cm47XG5cbiAgICAvLyBMYXp5IGluaXRpYWxpemF0aW9uIG9mIGZpbGUgaGFuZGxlXG4gICAgaWYgKCF0aGlzLmZpbGVJbml0aWFsaXplZCkge1xuICAgICAgdGhpcy5pbml0aWFsaXplRmlsZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCA9PT0gbnVsbCkgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGxpbmUgPSBgJHtKU09OLnN0cmluZ2lmeShldmVudCl9XFxuYDtcbiAgICAgIHdyaXRlU3luYyh0aGlzLmxvZ0ZpbGVGZCwgbGluZSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSB3cml0ZSBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgIC8vIFRoaXMgZm9sbG93cyB0aGUgcmlzayBtaXRpZ2F0aW9uOiBcIkdyYWNlZnVsIGRlZ3JhZGF0aW9uIC0gbG9nIHdyaXRlXG4gICAgICAvLyBmYWlsdXJlcyBhcmUgc2lsZW50bHkgaWdub3JlZCB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblwiXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBsb2cgZmlsZSBmb3Igd3JpdGluZy5cbiAgICovXG4gIHByaXZhdGUgaW5pdGlhbGl6ZUZpbGUoKTogdm9pZCB7XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKSByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgLy8gRW5zdXJlIGRpcmVjdG9yeSBleGlzdHNcbiAgICAgIGNvbnN0IGRpciA9IGRpcm5hbWUodGhpcy5sb2dGaWxlUGF0aCk7XG4gICAgICBpZiAoIWV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gT3BlbiBmaWxlIGZvciBhcHBlbmRpbmdcbiAgICAgIHRoaXMubG9nRmlsZUZkID0gb3BlblN5bmModGhpcy5sb2dGaWxlUGF0aCwgJ2EnKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIGluaXRpYWxpemF0aW9uIGVycm9yc1xuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0cyBzdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uIGZyb20gYW4gdW5rbm93biBlcnJvci5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbVxuICAgKiBAcmV0dXJucyBTdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uXG4gICAqL1xuICBwcml2YXRlIGV4dHJhY3RFcnJvckluZm8oZXJyb3I6IHVua25vd24pOiBMb2dFdmVudEVycm9yIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgY29uc3QgaW5mbzogTG9nRXZlbnRFcnJvciA9IHtcbiAgICAgICAgbmFtZTogZXJyb3IubmFtZSxcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgc3RhY2s6IGVycm9yLnN0YWNrXG4gICAgICB9O1xuXG4gICAgICAvLyBFeHRyYWN0IGNhdXNlIGNoYWluIGlmIHByZXNlbnRcbiAgICAgIGlmIChlcnJvci5jYXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGluZm8uY2F1c2UgPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IuY2F1c2UpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaW5mbztcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgbm9uLUVycm9yIHZhbHVlc1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiAnVW5rbm93bkVycm9yJyxcbiAgICAgIG1lc3NhZ2U6IFN0cmluZyhlcnJvcilcbiAgICB9O1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNpbmdsZXRvbiBFeHBvcnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBHbG9iYWwgbG9nZ2VyIGluc3RhbmNlIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3MuXG4gKlxuICogVXNlIHRoaXMgc2luZ2xldG9uIGZvciBhbGwgbG9nZ2luZyB3aXRoaW4gaG9va3MuIFRoZSBsb2dnZXIgaXMgY29uZmlndXJlZFxuICogdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgc3VwcG9ydHMgZXZlbnQgc3Vic2NyaXB0aW9uIGZvciBjdXN0b21cbiAqIGRlc3RpbmF0aW9ucy5cbiAqXG4gKiAjIyBDb25maWd1cmF0aW9uXG4gKlxuICogfCBFbnZpcm9ubWVudCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHxcbiAqIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXxcbiAqIHwgYENBUkRTX0hPT0tTX0xPR19GSUxFYCB8IFBhdGggdG8gbG9nIGZpbGUgKEpTT04gTGluZXMgZm9ybWF0KSB8XG4gKlxuICogIyMgVXNhZ2UgaW4gSG9va3NcbiAqXG4gKiBUaGUgbG9nZ2VyIGNhbiBiZSB1c2VkIGRpcmVjdGx5IHdpdGhpbiBob29rIGhhbmRsZXJzOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiAvLyBJbiBhIGhvb2sgaGFuZGxlclxuICogbG9nZ2VyLndhcm4oJ1Rhc2sgc3RhcnRpbmcgaW4gaW50ZXJhY3RpdmUgbW9kZScpO1xuICogYGBgXG4gKlxuICogIyMgRXh0ZXJuYWwgSW50ZWdyYXRpb25cbiAqXG4gKiBTdWJzY3JpYmUgdG8gZXZlbnRzIHRvIGZvcndhcmQgbG9ncyB0byBleHRlcm5hbCBzeXN0ZW1zOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICpcbiAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKHsgbGV2ZWw6ICdkZWJ1ZycgfSk7XG4gKlxuICogbG9nZ2VyLm9uKCdkZWJ1ZycsIChldmVudCkgPT4gcGlub0xvZ2dlci5kZWJ1ZyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBEaXJlY3QgdXNhZ2VcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiBsb2dnZXIuaW5mbygnU3RhcnRpbmcgb3BlcmF0aW9uJyk7XG4gKiBsb2dnZXIud2FybignUmVzb3VyY2UgbGltaXQgYXBwcm9hY2hpbmcnLCB7IHVzYWdlOiAwLjkgfSk7XG4gKlxuICogdHJ5IHtcbiAqICAgYXdhaXQgcmlza3lPcGVyYXRpb24oKTtcbiAqIH0gY2F0Y2ggKGVycikge1xuICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnUmlza3kgb3BlcmF0aW9uIGZhaWxlZCcpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG4iLCAiLyoqXG4gKiBTb2NrZXQgY2xpZW50IGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAqXG4gKiBDb25uZWN0cyB0byBhIFVuaXggZG9tYWluIHNvY2tldCBjcmVhdGVkIGJ5IEFjdGlvbkRpc3BhdGNoZXIgYW5kIGhhbmRsZXNcbiAqIE5ESlNPTiAobmV3bGluZS1kZWxpbWl0ZWQgSlNPTikgcHJvdG9jb2wgZm9yIHJlY2VpdmluZyBjb21tYW5kcyBhbmQgc2VuZGluZ1xuICogcmVzcG9uc2VzLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBTb2NrZXQgY2xpZW50IGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvblxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCAqIGFzIG5ldCBmcm9tICdub2RlOm5ldCc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ29tbWFuZHMgdGhhdCBjYW4gYmUgcmVjZWl2ZWQgZnJvbSB0aGUgQWN0aW9uRGlzcGF0Y2hlciB2aWEgc29ja2V0LlxuICpcbiAqIFVzZXMgTkRKU09OIChuZXdsaW5lLWRlbGltaXRlZCBKU09OKSBwcm90b2NvbC5cbiAqL1xuZXhwb3J0IHR5cGUgU29ja2V0Q29tbWFuZCA9IHsgdHlwZTogJ2NhbmNlbCcgfSB8IHsgdHlwZTogJ3N3aXRjaFRvSW50ZXJhY3RpdmUnIH07XG5cbi8qKlxuICogUmVzcG9uc2Ugc2VudCBiYWNrIHRvIHRoZSBBY3Rpb25EaXNwYXRjaGVyIHdoZW4gc3dpdGNoVG9JbnRlcmFjdGl2ZSBpcyBoYW5kbGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSB7XG4gIHR5cGU6ICdzd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UnO1xuICBkYXRhOiB1bmtub3duO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTb2NrZXRDbGllbnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDbGllbnQgZm9yIHRoZSBOREpTT04gc29ja2V0IHByb3RvY29sIGJldHdlZW4gdGhlIGFjdGlvbiBydW50aW1lIGFuZFxuICogQWN0aW9uRGlzcGF0Y2hlci5cbiAqXG4gKiBSZWNlaXZlcyBjb21tYW5kcyAoY2FuY2VsLCBzd2l0Y2hUb0ludGVyYWN0aXZlKSBhbmQgc2VuZHMgcmVzcG9uc2VzXG4gKiAoc3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlKSBvdmVyIGEgVW5peCBkb21haW4gc29ja2V0LlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjbGllbnQgPSBhd2FpdCBTb2NrZXRDbGllbnQuY29ubmVjdCgnL3BhdGgvdG8vc29ja2V0Jyk7XG4gKiBjbGllbnQub25Db21tYW5kKChjb21tYW5kKSA9PiB7XG4gKiAgIGlmIChjb21tYW5kLnR5cGUgPT09ICdjYW5jZWwnKSB7IC4uLiB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgU29ja2V0Q2xpZW50IHtcbiAgcHJpdmF0ZSBzb2NrZXQ6IG5ldC5Tb2NrZXQ7XG4gIHByaXZhdGUgYnVmZmVyID0gJyc7XG4gIHByaXZhdGUgY29tbWFuZEhhbmRsZXI/OiAoY29tbWFuZDogU29ja2V0Q29tbWFuZCkgPT4gdm9pZDtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHNvY2tldDogbmV0LlNvY2tldCkge1xuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xuXG4gICAgc29ja2V0Lm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBjaHVuay50b1N0cmluZygpO1xuICAgICAgLy8gUGFyc2UgTkRKU09OIC0gc3BsaXQgYnkgbmV3bGluZXNcbiAgICAgIGNvbnN0IGxpbmVzID0gdGhpcy5idWZmZXIuc3BsaXQoJ1xcbicpO1xuICAgICAgdGhpcy5idWZmZXIgPSBsaW5lcy5wb3AoKSA/PyAnJzsgLy8gS2VlcCBpbmNvbXBsZXRlIGxpbmUgaW4gYnVmZmVyXG5cbiAgICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgICBpZiAobGluZS50cmltKCkgPT09ICcnKSBjb250aW51ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGxpbmUpIGFzIFNvY2tldENvbW1hbmQ7XG4gICAgICAgICAgdGhpcy5jb21tYW5kSGFuZGxlcj8uKHBhcnNlZCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIE1hbGZvcm1lZCBKU09OIG9uIHNvY2tldCBpcyBpZ25vcmVkIChwZXIgcGxhbilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbm5lY3QgdG8gYSBVbml4IGRvbWFpbiBzb2NrZXQgYXQgdGhlIGdpdmVuIHBhdGguXG4gICAqXG4gICAqIEBwYXJhbSBzb2NrZXRQYXRoIC0gUGF0aCB0byB0aGUgVW5peCBkb21haW4gc29ja2V0XG4gICAqIEByZXR1cm5zIEEgY29ubmVjdGVkIFNvY2tldENsaWVudCBpbnN0YW5jZVxuICAgKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBjb25uZWN0aW9uIGZhaWxzXG4gICAqL1xuICBzdGF0aWMgY29ubmVjdChzb2NrZXRQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFNvY2tldENsaWVudD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBzb2NrZXQgPSBuZXQuY3JlYXRlQ29ubmVjdGlvbihzb2NrZXRQYXRoLCAoKSA9PiB7XG4gICAgICAgIHJlc29sdmUobmV3IFNvY2tldENsaWVudChzb2NrZXQpKTtcbiAgICAgIH0pO1xuICAgICAgc29ja2V0Lm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBoYW5kbGVyIGZvciBpbmNvbWluZyBzb2NrZXQgY29tbWFuZHMuXG4gICAqXG4gICAqIE9ubHkgb25lIGhhbmRsZXIgY2FuIGJlIHJlZ2lzdGVyZWQgYXQgYSB0aW1lLiBTdWJzZXF1ZW50IGNhbGxzIHJlcGxhY2VcbiAgICogdGhlIHByZXZpb3VzIGhhbmRsZXIuXG4gICAqXG4gICAqIEBwYXJhbSBoYW5kbGVyIC0gRnVuY3Rpb24gdG8gY2FsbCB3aGVuIGEgY29tbWFuZCBpcyByZWNlaXZlZFxuICAgKi9cbiAgb25Db21tYW5kKGhhbmRsZXI6IChjb21tYW5kOiBTb2NrZXRDb21tYW5kKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5jb21tYW5kSGFuZGxlciA9IGhhbmRsZXI7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBhIHJlc3BvbnNlIGJhY2sgdG8gdGhlIEFjdGlvbkRpc3BhdGNoZXIuXG4gICAqXG4gICAqIEBwYXJhbSByZXNwb25zZSAtIFRoZSByZXNwb25zZSB0byBzZW5kIGFzIE5ESlNPTlxuICAgKi9cbiAgc2VuZFJlc3BvbnNlKHJlc3BvbnNlOiBTd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UpOiB2b2lkIHtcbiAgICB0aGlzLnNvY2tldC53cml0ZShgJHtKU09OLnN0cmluZ2lmeShyZXNwb25zZSl9XFxuYCk7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBhIHJlc3BvbnNlIGFuZCBjYWxsIGNhbGxiYWNrIHdoZW4gZmx1c2hlZC5cbiAgICpcbiAgICogVXNlZCB0byBndWFyYW50ZWUgZmx1c2ggYmVmb3JlIHByb2Nlc3MuZXhpdC5cbiAgICpcbiAgICogQHBhcmFtIHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHRvIHNlbmQgYXMgTkRKU09OXG4gICAqIEBwYXJhbSBjYWxsYmFjayAtIENhbGxlZCBhZnRlciB0aGUgZGF0YSBpcyBmbHVzaGVkIHRvIHRoZSBzb2NrZXRcbiAgICovXG4gIHNlbmRSZXNwb25zZVRoZW4ocmVzcG9uc2U6IFN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSwgY2FsbGJhY2s6ICgpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLnNvY2tldC53cml0ZShgJHtKU09OLnN0cmluZ2lmeShyZXNwb25zZSl9XFxuYCwgY2FsbGJhY2spO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlIHRoZSBzb2NrZXQgY29ubmVjdGlvbi5cbiAgICovXG4gIGNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuc29ja2V0LmRlc3Ryb3koKTtcbiAgfVxufVxuIiwgIi8qKlxuICogUnVudGltZSBvcmNoZXN0cmF0aW9uIGZvciBjb21waWxlZCBDYXJkcyBhY3Rpb24gYW5kIHR5cGUgaGFuZGxlcnMuXG4gKlxuICogVGhpcyBtb2R1bGUgaXMgYnVuZGxlZCBpbnRvIGNvbXBpbGVkIGhhbmRsZXJzIGJ5IHRoZSBDTEkuIEl0IHByb3ZpZGVzIHRoZVxuICogZXhlY3V0aW9uIGhhcm5lc3MgdGhhdCByZWFkcyBoYW5kbGVyIGlucHV0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLCBzZXRzXG4gKiB1cCB0aGUgbG9nZ2VyIGNvbnRleHQsIGludm9rZXMgdGhlIHVzZXIncyBoYW5kbGVyLCBhbmQgZXhpdHMgdGhlIHByb2Nlc3NcbiAqIHdpdGggdGhlIGFwcHJvcHJpYXRlIGNvZGUuXG4gKlxuICogVGhlIHJ1bnRpbWUgaXMgZGVzaWduZWQgdG8gbmV2ZXIgcmV0dXJuIGluIG5vcm1hbCB1c2UuIEFsbCBjb2RlIHBhdGhzXG4gKiB0ZXJtaW5hdGUgd2l0aCBgcHJvY2Vzcy5leGl0KClgLiBUaGUgb25seSBleGNlcHRpb24gaXMgdGVzdCBzY2VuYXJpb3NcbiAqIHdoZXJlIGBwcm9jZXNzLmV4aXRgIGlzIG1vY2tlZC5cbiAqXG4gKiAjIyBFeGVjdXRpb24gRmxvd1xuICpcbiAqIDEuIEV4dHJhY3QgaW5wdXQgcGF5bG9hZCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcyBiYXNlZCBvbiBjb21tYW5kIHR5cGVcbiAqIDIuIFNldCBsb2dnZXIgY29udGV4dCB3aXRoIGNvbW1hbmQgdHlwZSBhbmQgaW5wdXRcbiAqIDMuIE9wdGlvbmFsbHkgY29ubmVjdCB0byBTT0NLRVRfUEFUSCBmb3IgY29tbWFuZCBkaXNwYXRjaCAoZmFpbC1vcGVuKVxuICogNC4gQnVpbGQgQWN0aW9uQ29udGV4dCB3aXRoIGxvZ2dlciwgY3dkLCBhbmQgc29ja2V0LWJhY2tlZCBjYWxsYmFja3NcbiAqIDUuIEludm9rZSB0aGUgY29tbWFuZCB3aXRoIGlucHV0IGFuZCBjb250ZXh0XG4gKiA2LiBPbiBzdWNjZXNzOiBjbGVhbiB1cCBzb2NrZXQgYW5kIGV4aXQgd2l0aCBjb2RlIDBcbiAqIDcuIE9uIGVycm9yOiBsb2cgZXJyb3IsIHdyaXRlIHRvIHN0ZGVyciwgY2xlYW4gdXAgYW5kIGV4aXQgd2l0aCBjb2RlIDFcbiAqXG4gKlxuICogQHN1bW1hcnkgUnVudGltZSBvcmNoZXN0cmF0aW9uIGZvciBjb21waWxlZCBDYXJkcyBhY3Rpb24gYW5kIHR5cGUgaGFuZGxlcnNcbiAqIEBtb2R1bGVcbiAqIEBzZWUge0BsaW5rIGV4ZWN1dGVDb21tYW5kfSBmb3IgdGhlIG1haW4gZW50cnkgcG9pbnRcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gVGhpcyBpcyB3aGF0IGNvbXBpbGVkIGhhbmRsZXJzIGxvb2sgbGlrZSBpbnRlcm5hbGx5XG4gKiBpbXBvcnQgeyBleGVjdXRlQ29tbWFuZCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnL3J1bnRpbWUnO1xuICogaW1wb3J0IG15Q29tbWFuZCBmcm9tICcuL215LWNvbW1hbmQuanMnO1xuICpcbiAqIGV4ZWN1dGVDb21tYW5kKG15Q29tbWFuZCk7XG4gKiBgYGBcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbW1hbmQsIFR5cGVDcmVhdGVDb21tYW5kLCBUeXBlRGVsZXRlQ29tbWFuZCwgVHlwZVVwZGF0ZUNvbW1hbmQgfSBmcm9tICcuL2NvbW1hbmQtdHlwZXMuanMnO1xuaW1wb3J0IHsgQ0FSRFNfRU5WX1ZBUlMsIGV4dHJhY3RBY3Rpb25JbnB1dCwgZXh0cmFjdFR5cGVJbnB1dCB9IGZyb20gJy4vZW52LmpzJztcbmltcG9ydCB7IEVYSVRfQ09ERVMsIHdyaXRlRXJyb3IgfSBmcm9tICcuL2V4aXQtY29kZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db250ZXh0LCBBY3Rpb25JbnB1dCwgVHlwZUhvb2tDb250ZXh0LCBUeXBlSG9va0lucHV0IH0gZnJvbSAnLi9pbnB1dHMuanMnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IHR5cGUgeyBTb2NrZXRDb21tYW5kIH0gZnJvbSAnLi9zb2NrZXQtY2xpZW50LmpzJztcbmltcG9ydCB7IFNvY2tldENsaWVudCB9IGZyb20gJy4vc29ja2V0LWNsaWVudC5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbW1hbmQgVHlwZSBVbmlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFVuaW9uIG9mIGFsbCBjb21tYW5kIHR5cGVzIHN1cHBvcnRlZCBieSB0aGUgcnVudGltZS5cbiAqXG4gKiBUaGlzIHR5cGUgdW5pb24gYWxsb3dzIHtAbGluayBleGVjdXRlQ29tbWFuZH0gdG8gYWNjZXB0IGFueSBjb21tYW5kIHJldHVybmVkIGJ5XG4gKiB0aGUgZmFjdG9yeSBmdW5jdGlvbnMuIFRoZSBydW50aW1lIGRpc3BhdGNoZXMgYmFzZWQgb24gdGhlIGBmYWN0b3J5VHlwZWBcbiAqIGRpc2NyaW1pbmFudC5cbiAqXG4gKiBOb3RlOiBUeXBlVmFsaWRhdG9yQ29tbWFuZCBpcyBleGNsdWRlZCBiZWNhdXNlIHZhbGlkYXRvcnMgdXNlIGEgZGlmZmVyZW50XG4gKiBleGVjdXRpb24gbW9kZWwgKGZpbGUtcGF0aCBwcm90b2NvbCB2aWEge0BsaW5rIGV4ZWN1dGVWYWxpZGF0aW9ufSkuXG4gKlxuICogQGludGVybmFsXG4gKi9cbnR5cGUgQW55Q29tbWFuZCA9IEFjdGlvbkNvbW1hbmQgfCBUeXBlQ3JlYXRlQ29tbWFuZCB8IFR5cGVVcGRhdGVDb21tYW5kIHwgVHlwZURlbGV0ZUNvbW1hbmQ7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEhlbHBlciBGdW5jdGlvbnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBOb3JtYWxpemVzIGFuIHVua25vd24gZXJyb3IgdmFsdWUgaW50byBhIGh1bWFuLXJlYWRhYmxlIG1lc3NhZ2UuXG4gKlxuICogRXJyb3JzIGluIEphdmFTY3JpcHQgY2FuIGJlIHRocm93biB3aXRoIGFueSB2YWx1ZS4gVGhpcyBmdW5jdGlvbiBlbnN1cmVzXG4gKiB3ZSBhbHdheXMgZ2V0IGEgc3RyaW5nIG1lc3NhZ2UgcmVnYXJkbGVzcyBvZiB3aGF0IHdhcyB0aHJvd24uXG4gKlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGNhdWdodCBlcnJvciB2YWx1ZSwgd2hpY2ggbWF5IG9yIG1heSBub3QgYmUgYW4gRXJyb3IgaW5zdGFuY2VcbiAqIEByZXR1cm5zIEEgc3RyaW5nIG1lc3NhZ2Ugc3VpdGFibGUgZm9yIGxvZ2dpbmcgb3IgZGlzcGxheVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBnZXRFcnJvck1lc3NhZ2UoZXJyb3I6IHVua25vd24pOiBzdHJpbmcge1xuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xufVxuXG4vKipcbiAqIENsZWFucyB1cCBsb2dnZXIgc3RhdGUgYW5kIHRlcm1pbmF0ZXMgdGhlIHByb2Nlc3MuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBuZXZlciByZXR1cm5zLiBJdCBjbGVhcnMgdGhlIGxvZ2dlcidzIGNvbnRleHQsIGNsb3Nlc1xuICogb3BlbiBmaWxlIGhhbmRsZXMgdG8gZmx1c2ggcGVuZGluZyB3cml0ZXMsIGFuZCBleGl0cyB3aXRoIHRoZSBzcGVjaWZpZWRcbiAqIGNvZGUuXG4gKlxuICogQHBhcmFtIGV4aXRDb2RlIC0gVGhlIGV4aXQgY29kZSB0byBwYXNzIHRvIGBwcm9jZXNzLmV4aXQoKWBcbiAqIEByZXR1cm5zIE5ldmVyIHJldHVybnM7IHByb2Nlc3MgdGVybWluYXRlc1xuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjbGVhbnVwQW5kRXhpdChleGl0Q29kZTogbnVtYmVyKTogbmV2ZXIge1xuICBsb2dnZXIuY2xlYXJDb250ZXh0KCk7XG4gIGxvZ2dlci5jbG9zZSgpO1xuICBwcm9jZXNzLmV4aXQoZXhpdENvZGUpO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgZXJyb3JzIGR1cmluZyBlbnZpcm9ubWVudCB2YXJpYWJsZSBleHRyYWN0aW9uLlxuICpcbiAqIEVudmlyb25tZW50IGV4dHJhY3Rpb24gY2FuIGZhaWwgaWYgcmVxdWlyZWQgdmFyaWFibGVzIGFyZSBtaXNzaW5nIG9yXG4gKiBtYWxmb3JtZWQuIFRoaXMgcHJvdmlkZXMgdXNlci1mcmllbmRseSBlcnJvciBvdXRwdXQgYW5kIGVuc3VyZXMgcHJvcGVyXG4gKiBjbGVhbnVwIGJlZm9yZSBleGl0LlxuICpcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0aHJvd24gZHVyaW5nIGV4dHJhY3Rpb25cbiAqIEByZXR1cm5zIE5ldmVyIHJldHVybnM7IHByb2Nlc3MgdGVybWluYXRlcyB3aXRoIGVycm9yIGNvZGVcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gaGFuZGxlRW52RXh0cmFjdGlvbkVycm9yKGVycm9yOiB1bmtub3duKTogbmV2ZXIge1xuICBjb25zdCBtZXNzYWdlID0gZ2V0RXJyb3JNZXNzYWdlKGVycm9yKTtcbiAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gZXh0cmFjdCBpbnB1dCBmcm9tIGVudmlyb25tZW50OiAke21lc3NhZ2V9YCk7XG4gIHdyaXRlRXJyb3IoYEhhbmRsZXIgZmFpbGVkOiAke21lc3NhZ2V9YCk7XG4gIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgZXJyb3JzIHRocm93biBieSB0aGUgdXNlcidzIGNvbW1hbmQgaGFuZGxlci5cbiAqXG4gKiBXaGVuIGEgaGFuZGxlciB0aHJvd3Mgb3IgcmVqZWN0cywgd2Ugd2FudCB0byBwcm92aWRlIHVzZWZ1bCBkZWJ1Z2dpbmdcbiAqIGluZm9ybWF0aW9uLiBUaGlzIHdyaXRlcyB0aGUgZnVsbCBzdGFjayB0cmFjZSB0byBzdGRlcnIgKHdoaWNoIHRoZVxuICogZXhlY3V0aW9uIHdyYXBwZXIgY2FwdHVyZXMpIGFuZCBsb2dzIGEgc3RydWN0dXJlZCBlcnJvciBldmVudC5cbiAqXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIG9yIHJlamVjdGlvbiByZWFzb24gZnJvbSB0aGUgaGFuZGxlclxuICogQHJldHVybnMgTmV2ZXIgcmV0dXJuczsgcHJvY2VzcyB0ZXJtaW5hdGVzIHdpdGggZXJyb3IgY29kZVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3I6IHVua25vd24pOiBuZXZlciB7XG4gIGNvbnN0IGVycm9yT3V0cHV0ID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IChlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlKSA6IFN0cmluZyhlcnJvcik7XG4gIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke2Vycm9yT3V0cHV0fVxcbmApO1xuICBsb2dnZXIuZXJyb3IoYEhhbmRsZXIgZXJyb3I6ICR7Z2V0RXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4ZWN1dGUgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFeGVjdXRlcyBhIGNvbW1hbmQgaGFuZGxlciB3aXRoIGZ1bGwgcnVudGltZSBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgdGhhdCBjb21waWxlZCBoYW5kbGVycyB1c2UuIFRoZSBDTEkgZ2VuZXJhdGVzXG4gKiB3cmFwcGVyIGNvZGUgdGhhdCBpbXBvcnRzIHRoZSB1c2VyJ3MgY29tbWFuZCBhbmQgcGFzc2VzIGl0IHRvIHRoaXMgZnVuY3Rpb24uXG4gKiBGcm9tIHRoZXJlLCBleGVjdXRlQ29tbWFuZCBoYW5kbGVzIGFsbCB0aGUgY2VyZW1vbnk6IGVudmlyb25tZW50IHBhcnNpbmcsIGxvZ2dpbmdcbiAqIHNldHVwLCBoYW5kbGVyIGludm9jYXRpb24sIGVycm9yIGhhbmRsaW5nLCBhbmQgcHJvY2VzcyB0ZXJtaW5hdGlvbi5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gZXhpdHMgdGhlIHByb2Nlc3MgaW4gYWxsIG5vcm1hbCBjb2RlIHBhdGhzLiBUaGUgcmV0dXJuZWRcbiAqIHByb21pc2Ugb25seSByZXNvbHZlcyBpZiBgcHJvY2Vzcy5leGl0YCBpcyBtb2NrZWQsIHdoaWNoIGhhcHBlbnMgaW4gdGVzdFxuICogc2NlbmFyaW9zLiBQcm9kdWN0aW9uIGNvZGUgc2hvdWxkIG5vdCBhd2FpdCB0aGlzIGZ1bmN0aW9uIG9yIGV4cGVjdCBpdFxuICogdG8gcmV0dXJuLlxuICpcbiAqICMjIFN1cHBvcnRlZCBDb21tYW5kIFR5cGVzXG4gKlxuICogLSAqKkFjdGlvbioqIChgYWN0aW9uYCk6IEludm9rZWQgd2hlbiBhbiBhY3Rpb24gaXMgdHJpZ2dlcmVkXG4gKiAtICoqVHlwZSBDcmVhdGUqKiAoYHR5cGVDcmVhdGVgKTogUnVucyBhZnRlciBuZXcgdHlwZWQgZmlsZSBjcmVhdGlvblxuICogLSAqKlR5cGUgVXBkYXRlKiogKGB0eXBlVXBkYXRlYCk6IFJ1bnMgYWZ0ZXIgdHlwZWQgZmlsZSBtb2RpZmljYXRpb25cbiAqIC0gKipUeXBlIERlbGV0ZSoqIChgdHlwZURlbGV0ZWApOiBSdW5zIHdoZW4gdHlwZWQgZmlsZSBpcyBkZWxldGVkXG4gKlxuICogTm90ZTogVHlwZSB2YWxpZGF0b3JzIHVzZSBhIGRpZmZlcmVudCBleGVjdXRpb24gbW9kZWwgKGZpbGUtcGF0aCBwcm90b2NvbClcbiAqIGFuZCBzaG91bGQgYmUgZXhlY3V0ZWQgdmlhIHtAbGluayBleGVjdXRlVmFsaWRhdGlvbn0gaW5zdGVhZC5cbiAqXG4gKiAjIyBFcnJvciBIYW5kbGluZ1xuICpcbiAqIEVycm9ycyBhcmUgaGFuZGxlZCBhdCB0aHJlZSBsZXZlbHM6XG4gKlxuICogMS4gKipFbnZpcm9ubWVudCBleHRyYWN0aW9uIGVycm9ycyoqIChtaXNzaW5nL2ludmFsaWQgdmFyaWFibGVzKTogTG9nIHRoZVxuICogICAgZXJyb3IgYW5kIGV4aXQuIFRoZXNlIGluZGljYXRlIGEgcHJvYmxlbSB3aXRoIGhvdyB0aGUgaGFuZGxlciB3YXMgaW52b2tlZC5cbiAqXG4gKiAyLiAqKkhhbmRsZXIgZXJyb3JzKiogKHVzZXIgY29kZSB0aHJvd3MpOiBXcml0ZSB0aGUgc3RhY2sgdHJhY2UgdG8gc3RkZXJyLFxuICogICAgbG9nIGEgc3RydWN0dXJlZCBlcnJvciwgYW5kIGV4aXQuIFRoZSBleGVjdXRpb24gd3JhcHBlciBjYXB0dXJlcyBzdGRlcnJcbiAqICAgIGZvciBkZWJ1Z2dpbmcuXG4gKlxuICogMy4gKipVbmV4cGVjdGVkIGVycm9ycyoqOiBDYXRjaC1hbGwgZm9yIGFueSBvdGhlciBmYWlsdXJlcyBkdXJpbmcgcnVudGltZVxuICogICAgb3JjaGVzdHJhdGlvbi5cbiAqXG4gKiBAcGFyYW0gY29tbWFuZCAtIFRoZSBjb21tYW5kIHRvIGV4ZWN1dGUsIHJldHVybmVkIGZyb20gYSBmYWN0b3J5IGZ1bmN0aW9uXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyBvbmx5IHdoZW4gYHByb2Nlc3MuZXhpdGAgaXMgbW9ja2VkICh0ZXN0cylcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gR2VuZXJhdGVkIHdyYXBwZXIgY29kZSAocHJvZHVjZWQgYnkgQ0xJKVxuICogaW1wb3J0IHsgZXhlY3V0ZUNvbW1hbmQgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZy9ydW50aW1lJztcbiAqIGltcG9ydCBjb21tYW5kIGZyb20gJy4vdXNlci1jb21tYW5kLmpzJztcbiAqXG4gKiAvLyBUaGlzIGNhbGwgbmV2ZXIgcmV0dXJucyBpbiBwcm9kdWN0aW9uXG4gKiBleGVjdXRlQ29tbWFuZChjb21tYW5kKTtcbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZUNvbW1hbmQoY29tbWFuZDogQW55Q29tbWFuZCk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGxldCBpbnB1dDogQWN0aW9uSW5wdXQgfCBUeXBlSG9va0lucHV0O1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmIChjb21tYW5kLmZhY3RvcnlUeXBlID09PSAnYWN0aW9uJykge1xuICAgICAgICBpbnB1dCA9IGV4dHJhY3RBY3Rpb25JbnB1dCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5wdXQgPSBleHRyYWN0VHlwZUlucHV0KCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiBoYW5kbGVFbnZFeHRyYWN0aW9uRXJyb3IoZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIFNldCBsb2dnZXIgY29udGV4dCB3aXRoIGNvbW1hbmQgdHlwZVxuICAgIGxvZ2dlci5zZXRDb250ZXh0KGNvbW1hbmQuZmFjdG9yeVR5cGUsIHsgLi4uaW5wdXQgfSk7XG5cbiAgICBpZiAoY29tbWFuZC5mYWN0b3J5VHlwZSA9PT0gJ2FjdGlvbicpIHtcbiAgICAgIC8vIFNvY2tldCBjb25uZWN0aW9uIGFuZCBBY3Rpb25Db250ZXh0IGZvciBhY3Rpb24gY29tbWFuZHNcbiAgICAgIGxldCBzb2NrZXRDbGllbnQ6IFNvY2tldENsaWVudCB8IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IHNvY2tldFBhdGggPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSF07XG4gICAgICBpZiAoc29ja2V0UGF0aCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHNvY2tldENsaWVudCA9IGF3YWl0IFNvY2tldENsaWVudC5jb25uZWN0KHNvY2tldFBhdGgpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGxvZ2dlci53YXJuKGBGYWlsZWQgdG8gY29ubmVjdCB0byBzb2NrZXQgYXQgJHtzb2NrZXRQYXRofTogJHtnZXRFcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICAgICAgICAgIC8vIEZhaWwtb3BlbjogY29udGludWUgd2l0aG91dCBzb2NrZXRcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBDYWxsYmFjayByZWdpc3RyYXRpb24gc3RhdGVcbiAgICAgIGxldCBjYW5jZWxDYWxsYmFjazogKCgpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBzd2l0Y2hUb0ludGVyYWN0aXZlQ2FsbGJhY2s6ICgoKSA9PiB1bmtub3duIHwgUHJvbWlzZTx1bmtub3duPikgfCB1bmRlZmluZWQ7XG4gICAgICBsZXQgY29tbWFuZFByb2Nlc3NlZCA9IGZhbHNlO1xuXG4gICAgICAvLyBCdWlsZCBBY3Rpb25Db250ZXh0IHdpdGggbG9nZ2VyLCBjd2QsIGFuZCBzb2NrZXQtYmFja2VkIGNhbGxiYWNrc1xuICAgICAgY29uc3QgY29udGV4dDogQWN0aW9uQ29udGV4dCA9IHtcbiAgICAgICAgbG9nZ2VyLFxuICAgICAgICBjd2Q6IHByb2Nlc3MuY3dkKCksXG4gICAgICAgIG9uQ2FuY2VsOiAoY2FsbGJhY2spID0+IHtcbiAgICAgICAgICBjYW5jZWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9LFxuICAgICAgICBvblN3aXRjaFRvSW50ZXJhY3RpdmU6IChjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIHN3aXRjaFRvSW50ZXJhY3RpdmVDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAvLyBXaXJlIHNvY2tldCBjb21tYW5kIGRpc3BhdGNoXG4gICAgICBpZiAoc29ja2V0Q2xpZW50KSB7XG4gICAgICAgIHNvY2tldENsaWVudC5vbkNvbW1hbmQoKGNtZDogU29ja2V0Q29tbWFuZCkgPT4ge1xuICAgICAgICAgIC8vIEZpcnN0LXdpbnMgc2VtYW50aWNzOiBpZ25vcmUgc3Vic2VxdWVudCBjb21tYW5kc1xuICAgICAgICAgIGlmIChjb21tYW5kUHJvY2Vzc2VkKSByZXR1cm47XG4gICAgICAgICAgY29tbWFuZFByb2Nlc3NlZCA9IHRydWU7XG5cbiAgICAgICAgICBpZiAoY21kLnR5cGUgPT09ICdjYW5jZWwnKSB7XG4gICAgICAgICAgICBoYW5kbGVDYW5jZWxDb21tYW5kKGNhbmNlbENhbGxiYWNrLCBzb2NrZXRDbGllbnQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY21kLnR5cGUgPT09ICdzd2l0Y2hUb0ludGVyYWN0aXZlJykge1xuICAgICAgICAgICAgaGFuZGxlU3dpdGNoVG9JbnRlcmFjdGl2ZUNvbW1hbmQoc3dpdGNoVG9JbnRlcmFjdGl2ZUNhbGxiYWNrLCBzb2NrZXRDbGllbnQhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBFeGVjdXRlIHRoZSBhY3Rpb24gY29tbWFuZCBoYW5kbGVyXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBjb21tYW5kKGlucHV0IGFzIEFjdGlvbklucHV0LCBjb250ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgICAgcmV0dXJuIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIENsZWFuIHVwIHNvY2tldCBhbmQgZXhpdCBzdWNjZXNzZnVsbHlcbiAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFR5cGVIb29rQ29udGV4dCBmb3IgdHlwZSBsaWZlY3ljbGUgaG9va3NcbiAgICAgIGNvbnN0IGNvbnRleHQ6IFR5cGVIb29rQ29udGV4dCA9IHtcbiAgICAgICAgbG9nZ2VyLFxuICAgICAgICBjd2Q6IHByb2Nlc3MuY3dkKClcbiAgICAgIH07XG5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIHR5cGUgaG9vayBjb21tYW5kIGhhbmRsZXJcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGNvbW1hbmQoaW5wdXQgYXMgVHlwZUhvb2tJbnB1dCwgY29udGV4dCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICByZXR1cm4gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gVW5leHBlY3RlZCBlcnJvciAtIHRyeSB0byBjbGVhbiB1cCBhbmQgZXhpdFxuICAgIGxvZ2dlci5lcnJvcihgVW5leHBlY3RlZCBydW50aW1lIGVycm9yOiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU29ja2V0IENvbW1hbmQgSGFuZGxlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBSZXNvbHZlcyBhIGNhbGxiYWNrIHJlc3VsdCB0aGF0IG1heSBiZSBzeW5jIG9yIGFzeW5jIGludG8gYSBQcm9taXNlLlxuICpcbiAqIFVzZXItcmVnaXN0ZXJlZCBjYWxsYmFja3MgbWF5IHJldHVybiB2b2lkLCBhIHZhbHVlLCBvciBhIFByb21pc2UuXG4gKiBUaGlzIG5vcm1hbGl6ZXMgYWxsIGNhc2VzIGludG8gYSBzaW5nbGUgUHJvbWlzZSBmb3IgY29uc2lzdGVudCBoYW5kbGluZy5cbiAqXG4gKiBAcGFyYW0gcmVzdWx0IC0gQ2FsbGJhY2sgcmV0dXJuIHZhbHVlIHRoYXQgbWF5IGFscmVhZHkgYmUgYSBwcm9taXNlLlxuICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNhbGxiYWNrIHJlc3VsdC5cbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiB0b1Byb21pc2U8VD4ocmVzdWx0OiBUIHwgUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICBpZiAocmVzdWx0ICYmIHR5cGVvZiAocmVzdWx0IGFzIFByb21pc2U8VD4pLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gcmVzdWx0IGFzIFByb21pc2U8VD47XG4gIH1cbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXN1bHQpO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgYSBgY2FuY2VsYCBjb21tYW5kIGZyb20gdGhlIHNvY2tldC5cbiAqXG4gKiBJZiBhIGNhbmNlbCBjYWxsYmFjayB3YXMgcmVnaXN0ZXJlZCwgaXQgaXMgaW52b2tlZC4gT3RoZXJ3aXNlLCBTSUdURVJNXG4gKiBpcyBzZW50IHRvIHRoZSBjdXJyZW50IHByb2Nlc3MgYXMgYSBmYWxsYmFjay4gQWZ0ZXIgdGhlIGNhbGxiYWNrIGNvbXBsZXRlc1xuICogKG9yIGltbWVkaWF0ZWx5IGlmIG5vIGNhbGxiYWNrKSwgdGhlIHByb2Nlc3MgZXhpdHMgd2l0aCBlcnJvciBjb2RlLlxuICpcbiAqIEBwYXJhbSBjYWxsYmFjayAtIFRoZSByZWdpc3RlcmVkIGNhbmNlbCBjYWxsYmFjaywgaWYgYW55XG4gKiBAcGFyYW0gc29ja2V0Q2xpZW50IC0gVGhlIHNvY2tldCBjbGllbnQgdG8gY2xvc2UgYmVmb3JlIGV4aXRpbmdcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gaGFuZGxlQ2FuY2VsQ29tbWFuZChcbiAgY2FsbGJhY2s6ICgoKSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPikgfCB1bmRlZmluZWQsXG4gIHNvY2tldENsaWVudDogU29ja2V0Q2xpZW50IHwgdW5kZWZpbmVkXG4pOiB2b2lkIHtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHByb2Nlc3Mua2lsbChwcm9jZXNzLnBpZCwgJ1NJR1RFUk0nKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB0b1Byb21pc2UoY2FsbGJhY2soKSkudGhlbihcbiAgICAoKSA9PiB7XG4gICAgICBzb2NrZXRDbGllbnQ/LmNsb3NlKCk7XG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgICB9LFxuICAgICgpID0+IHtcbiAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH1cbiAgKTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGEgYHN3aXRjaFRvSW50ZXJhY3RpdmVgIGNvbW1hbmQgZnJvbSB0aGUgc29ja2V0LlxuICpcbiAqIElmIG5vIGNhbGxiYWNrIHdhcyByZWdpc3RlcmVkLCB0aGUgY29tbWFuZCBpcyBpZ25vcmVkIChuby1vcCkuIE90aGVyd2lzZSxcbiAqIHRoZSBjYWxsYmFjayBpcyBpbnZva2VkIGFuZCBpdHMgcmV0dXJuIHZhbHVlIGlzIHNlbnQgYXNcbiAqIGBzd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2VgIG9uIHRoZSBzb2NrZXQuIGBwcm9jZXNzLmV4aXQoNDIpYCBpcyBjYWxsZWRcbiAqIGluc2lkZSB0aGUgYHdyaXRlKClgIGNhbGxiYWNrIHRvIGd1YXJhbnRlZSB0aGUgcmVzcG9uc2UgaXMgZmx1c2hlZCBiZWZvcmVcbiAqIHRoZSBldmVudCBsb29wIHRlYXJzIGRvd24uXG4gKlxuICogQHBhcmFtIGNhbGxiYWNrIC0gVGhlIHJlZ2lzdGVyZWQgc3dpdGNoVG9JbnRlcmFjdGl2ZSBjYWxsYmFjaywgaWYgYW55XG4gKiBAcGFyYW0gc29ja2V0Q2xpZW50IC0gVGhlIHNvY2tldCBjbGllbnQgdXNlZCB0byBzZW5kIHRoZSByZXNwb25zZVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVTd2l0Y2hUb0ludGVyYWN0aXZlQ29tbWFuZChcbiAgY2FsbGJhY2s6ICgoKSA9PiB1bmtub3duIHwgUHJvbWlzZTx1bmtub3duPikgfCB1bmRlZmluZWQsXG4gIHNvY2tldENsaWVudDogU29ja2V0Q2xpZW50XG4pOiB2b2lkIHtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRvUHJvbWlzZShjYWxsYmFjaygpKS50aGVuKFxuICAgIChkYXRhKSA9PiB7XG4gICAgICBzb2NrZXRDbGllbnQuc2VuZFJlc3BvbnNlVGhlbih7IHR5cGU6ICdzd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UnLCBkYXRhIH0sICgpID0+IHtcbiAgICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5TV0lUQ0hfVE9fSU5URVJBQ1RJVkUpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICAoZXJyb3IpID0+IHtcbiAgICAgIGxvZ2dlci5lcnJvcihgc3dpdGNoVG9JbnRlcmFjdGl2ZSBjYWxsYmFjayBlcnJvcjogJHtnZXRFcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICAgICAgc29ja2V0Q2xpZW50LmNsb3NlKCk7XG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgICB9XG4gICk7XG59XG4iLCAiLyoqXG4gKiBTaGFyZWQgc2Vzc2lvbiB1dGlsaXRpZXMgZm9yIENsYXVkZSBDb2RlIGFjdGlvbiB3b3JrZmxvd3MuXG4gKlxuICogUHJvdmlkZXMgcmV1c2FibGUgYnVpbGRpbmcgYmxvY2tzIGZvciBhY3Rpb25zIHRoYXQgc3Bhd24gdGhlIGBjbGF1ZGVgIENMSTpcbiAqIHBsdWdpbiBzZXR0aW5ncyBjb25zdHJ1Y3Rpb24sIENMSSBhcmcgYnVpbGRpbmcsIHdvcmt0cmVlIGxpZmVjeWNsZSBtYW5hZ2VtZW50LFxuICogYW5kIGJyYW5jaCBjbGVhbnVwLiBCb3RoIHRoZSBgbGF1bmNoYCBhbmQgYGludGVydmlld2AgYWN0aW9ucyBjb25zdW1lIHRoZXNlXG4gKiB1dGlsaXRpZXMuXG4gKlxuICogQHN1bW1hcnkgU2hhcmVkIHNlc3Npb24gdXRpbGl0aWVzIGZvciBDbGF1ZGUgQ29kZSBhY3Rpb24gd29ya2Zsb3dzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgZXhlY0ZpbGUgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcy9wcm9taXNlcyc7XG5pbXBvcnQgeyBob21lZGlyIH0gZnJvbSAnbm9kZTpvcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBwcm9taXNpZnkgfSBmcm9tICdub2RlOnV0aWwnO1xuaW1wb3J0IHR5cGUgeyBDYXJkc0NsaWVudCB9IGZyb20gJ0BjYXJkcy9zZGsvY2xpZW50JztcbmltcG9ydCB7IHR5cGUgQWN0aW9uQ29udGV4dCwgdHlwZSBBY3Rpb25JbnB1dCwgQ0FSRFNfRU5WX1ZBUlMgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG5pbXBvcnQgeyBjaGVja1dvcmt0cmVlRXhpc3RzLCBjcmVhdGVXb3JrdHJlZSwgZmluZEdpdFJvb3RzIH0gZnJvbSAnLi9jcmVhdGUtd29ya3RyZWUuanMnO1xuXG5jb25zdCBleGVjRmlsZUFzeW5jID0gcHJvbWlzaWZ5KGV4ZWNGaWxlKTtcblxuLyoqXG4gKiBFeHRyYWN0cyBhIGh1bWFuLXJlYWRhYmxlIG1lc3NhZ2UgZnJvbSBhbiB1bmtub3duIGNhdGNoIHZhbHVlLlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGNhdWdodCB2YWx1ZSB0byBleHRyYWN0IGEgbWVzc2FnZSBmcm9tLlxuICogQHJldHVybnMgVGhlIGVycm9yIG1lc3NhZ2Ugc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgbWFya2V0cGxhY2UgZGlyZWN0b3J5IGJ1bmRsZWQgd2l0aCB0aGUgaW5zdGFsbGVkIGV4dGVuc2lvbi5cbiAqIFVzZXMgdGhlIEVYVEVOU0lPTl9QQVRIIGVudmlyb25tZW50IHZhcmlhYmxlIGluamVjdGVkIGJ5IEFjdGlvbkRpc3BhdGNoZXIuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYVEVOU0lPTl9QQVRIIGlzIG5vdCBzZXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTWFya2V0cGxhY2VQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IGV4dGVuc2lvblBhdGggPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSF07XG4gIGlmICghZXh0ZW5zaW9uUGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gcGF0aC5qb2luKGV4dGVuc2lvblBhdGgsICdkaXN0JywgJ21hcmtldHBsYWNlJyk7XG59XG5cbi8qKlxuICogQnVpbGRzIHRoZSBgLS1zZXR0aW5nc2AgSlNPTiB0aGF0IGVuYWJsZXMgdGhlIGBydW50aW1lYCBwbHVnaW4gYW5kIHJlZ2lzdGVyc1xuICogdGhlIGBjYXJkcy5tYW5hZ2VtZW50YCBtYXJrZXRwbGFjZSBzb3VyY2Ugc28gdGhlIHNwYXduZWQgYGNsYXVkZWAgcHJvY2Vzc1xuICogY2FuIHJlc29sdmUgdGhlIHBsdWdpbiBmcm9tIHRoZSBleHRlbnNpb24ncyBidW5kbGVkIG1hcmtldHBsYWNlLlxuICpcbiAqIFVzZXMgdGhlIG1hcmtldHBsYWNlIGJ1bmRsZWQgaW5zaWRlIHRoZSBleHRlbnNpb24gaW5zdGFsbCBkaXJlY3RvcnlcbiAqIChgPEVYVEVOU0lPTl9QQVRIPi9kaXN0L21hcmtldHBsYWNlYCkgc28gdGhlIHNwYXduZWQgc2Vzc2lvbiBhbHdheXMgbG9hZHMgdGhlXG4gKiBwbHVnaW4gdmVyc2lvbiB0aGF0IHNoaXBwZWQgd2l0aCB0aGUgZXh0ZW5zaW9uLCByZWdhcmRsZXNzIG9mIHdvcmt0cmVlIHN0YXRlLlxuICpcbiAqIEBwYXJhbSBtYXJrZXRwbGFjZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBidW5kbGVkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEByZXR1cm5zIFNlcmlhbGlzZWQgc2V0dGluZ3MgSlNPTiBzdHJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFBsdWdpblNldHRpbmdzKG1hcmtldHBsYWNlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHtcbiAgICBlbmFibGVkUGx1Z2luczogeyAncnVudGltZUBjYXJkcy5tYW5hZ2VtZW50JzogdHJ1ZSB9LFxuICAgIGV4dHJhS25vd25NYXJrZXRwbGFjZXM6IHtcbiAgICAgICdjYXJkcy5tYW5hZ2VtZW50Jzoge1xuICAgICAgICBzb3VyY2U6IHsgc291cmNlOiAnZGlyZWN0b3J5JywgcGF0aDogbWFya2V0cGxhY2VQYXRoIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBDbGF1ZGUgQ29kZSBjb25maWd1cmF0aW9uIGRpcmVjdG9yeSB1c2luZyB0aGUgc3RhbmRhcmRcbiAqIGZhbGxiYWNrIGNoYWluOiAkQ0xBVURFX0NPTkZJR19ESVIgXHUyMTkyICRYREdfREFUQV9IT01FL2NsYXVkZSBcdTIxOTJcbiAqICRYREdfQ09ORklHX0hPTUUvY2xhdWRlIFx1MjE5MiB+Ly5jb25maWcvY2xhdWRlIFx1MjE5MiB+Ly5jbGF1ZGUuXG4gKlxuICogUmV0dXJucyB0aGUgZmlyc3QgY2FuZGlkYXRlIHRoYXQgZXhpc3RzIG9uIGRpc2ssIG9yIG51bGwgaWYgbm9uZSBpcyBmb3VuZC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgZmlyc3QgZXhpc3RpbmcgQ2xhdWRlIGNvbmZpZyBkaXJlY3RvcnkgcGF0aCwgb3IgbnVsbCBpZiBub25lIGZvdW5kLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZUNsYXVkZUNvbmZpZ0RpcigpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgY29uc3QgaG9tZSA9IGhvbWVkaXIoKTtcbiAgY29uc3QgY2FuZGlkYXRlczogc3RyaW5nW10gPSBbXTtcblxuICBjb25zdCBjbGF1ZGVDb25maWdEaXIgPSBwcm9jZXNzLmVudlsnQ0xBVURFX0NPTkZJR19ESVInXTtcbiAgaWYgKGNsYXVkZUNvbmZpZ0RpcikgY2FuZGlkYXRlcy5wdXNoKGNsYXVkZUNvbmZpZ0Rpcik7XG5cbiAgY29uc3QgeGRnRGF0YUhvbWUgPSBwcm9jZXNzLmVudlsnWERHX0RBVEFfSE9NRSddO1xuICBpZiAoeGRnRGF0YUhvbWUpIGNhbmRpZGF0ZXMucHVzaChwYXRoLmpvaW4oeGRnRGF0YUhvbWUsICdjbGF1ZGUnKSk7XG5cbiAgY29uc3QgeGRnQ29uZmlnSG9tZSA9IHByb2Nlc3MuZW52WydYREdfQ09ORklHX0hPTUUnXTtcbiAgaWYgKHhkZ0NvbmZpZ0hvbWUpIGNhbmRpZGF0ZXMucHVzaChwYXRoLmpvaW4oeGRnQ29uZmlnSG9tZSwgJ2NsYXVkZScpKTtcblxuICBjYW5kaWRhdGVzLnB1c2gocGF0aC5qb2luKGhvbWUsICcuY29uZmlnJywgJ2NsYXVkZScpKTtcbiAgY2FuZGlkYXRlcy5wdXNoKHBhdGguam9pbihob21lLCAnLmNsYXVkZScpKTtcblxuICBmb3IgKGNvbnN0IGNhbmRpZGF0ZSBvZiBjYW5kaWRhdGVzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZzLmFjY2VzcyhwYXRoLmpvaW4oY2FuZGlkYXRlLCAncGx1Z2lucycpKTtcbiAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBOb3QgZm91bmQsIHRyeSBuZXh0XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB2ZXJzaW9uIGZyb20gYSBwbHVnaW4uanNvbiBmaWxlLlxuICogUmV0dXJucyBudWxsIGlmIHRoZSBmaWxlIGRvZXNuJ3QgZXhpc3Qgb3IgY2FuJ3QgYmUgcGFyc2VkLlxuICpcbiAqIEBwYXJhbSBwbHVnaW5Kc29uUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIHBsdWdpbi5qc29uIGZpbGUuXG4gKiBAcmV0dXJucyBUaGUgdmVyc2lvbiBzdHJpbmcgZnJvbSB0aGUgZmlsZSwgb3IgbnVsbCBpZiB1bmF2YWlsYWJsZS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmVhZFBsdWdpblZlcnNpb24ocGx1Z2luSnNvblBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCBmcy5yZWFkRmlsZShwbHVnaW5Kc29uUGF0aCwgJ3V0Zi04Jyk7XG4gICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShjb250ZW50KSBhcyB7IHZlcnNpb24/OiBzdHJpbmcgfTtcbiAgICByZXR1cm4gcGFyc2VkLnZlcnNpb24gPz8gbnVsbDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSBgY2FyZHMubWFuYWdlbWVudGAgZW50cnkgaW4gQ2xhdWRlIENvZGUncyBga25vd25fbWFya2V0cGxhY2VzLmpzb25gXG4gKiB0byBwb2ludCB0byB0aGUgZXh0ZW5zaW9uLWJ1bmRsZWQgbWFya2V0cGxhY2UgdXNpbmcgYW4gYWJzb2x1dGUgcGF0aC5cbiAqXG4gKiBDbGF1ZGUgQ29kZSByZXNvbHZlcyBkaXJlY3RvcnkgbWFya2V0cGxhY2Ugc291cmNlcyByZWxhdGl2ZSB0byB0aGUgc3Bhd25lZFxuICogc2Vzc2lvbidzIENXRC4gV2hlbiBzZXNzaW9ucyBydW4gaW4gYSB3b3JrdHJlZSwgYSByZWxhdGl2ZSBwYXRoIGxpa2UgYFwicHVibGljXCJgXG4gKiByZXNvbHZlcyB0byB0aGUgd29ya3RyZWUncyBjb3B5IFx1MjAxNCB3aGljaCBtYXkgY29udGFpbiBhIHN0YWxlIHBsdWdpbiB2ZXJzaW9uLlxuICogV3JpdGluZyBhbiBhYnNvbHV0ZSBwYXRoIGVuc3VyZXMgQ2xhdWRlIENvZGUgYWx3YXlzIHJlYWRzIGZyb20gdGhlIGV4dGVuc2lvbidzXG4gKiBidW5kbGVkIG1hcmtldHBsYWNlLCByZWdhcmRsZXNzIG9mIENXRC5cbiAqXG4gKiBAcGFyYW0gbWFya2V0cGxhY2VQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZU1hcmtldHBsYWNlUmVnaXN0cmF0aW9uKFxuICBtYXJrZXRwbGFjZVBhdGg6IHN0cmluZyxcbiAgbG9nZ2VyOiBBY3Rpb25Db250ZXh0Wydsb2dnZXInXVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGNvbmZpZ0RpciA9IGF3YWl0IHJlc29sdmVDbGF1ZGVDb25maWdEaXIoKTtcbiAgaWYgKCFjb25maWdEaXIpIHtcbiAgICBsb2dnZXIuZGVidWcoJ0NsYXVkZSBjb25maWcgZGlyZWN0b3J5IG5vdCBmb3VuZCwgc2tpcHBpbmcgbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uIHVwZGF0ZScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGtub3duUGF0aCA9IHBhdGguam9pbihjb25maWdEaXIsICdwbHVnaW5zJywgJ2tub3duX21hcmtldHBsYWNlcy5qc29uJyk7XG4gIGxldCByYXc6IHN0cmluZztcbiAgdHJ5IHtcbiAgICByYXcgPSBhd2FpdCBmcy5yZWFkRmlsZShrbm93blBhdGgsICd1dGYtOCcpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmICdjb2RlJyBpbiBlcnJvciAmJiBlcnJvci5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgbG9nZ2VyLmRlYnVnKCdrbm93bl9tYXJrZXRwbGFjZXMuanNvbiBub3QgZm91bmQsIHNraXBwaW5nJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UocmF3KSBhcyBSZWNvcmQ8XG4gICAgc3RyaW5nLFxuICAgIHsgc291cmNlPzogeyBzb3VyY2U/OiBzdHJpbmc7IHBhdGg/OiBzdHJpbmcgfTsgaW5zdGFsbExvY2F0aW9uPzogc3RyaW5nOyBsYXN0VXBkYXRlZD86IHN0cmluZyB9XG4gID47XG4gIGNvbnN0IGVudHJ5ID0gZGF0YVsnY2FyZHMubWFuYWdlbWVudCddO1xuICBpZiAoIWVudHJ5Py5zb3VyY2UgfHwgZW50cnkuc291cmNlLnNvdXJjZSAhPT0gJ2RpcmVjdG9yeScpIHJldHVybjtcblxuICBpZiAoZW50cnkuc291cmNlLnBhdGggPT09IG1hcmtldHBsYWNlUGF0aCAmJiBlbnRyeS5pbnN0YWxsTG9jYXRpb24gPT09IG1hcmtldHBsYWNlUGF0aCkge1xuICAgIGxvZ2dlci5kZWJ1ZygnTWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uIGFscmVhZHkgcG9pbnRzIHRvIGV4dGVuc2lvbiBidW5kbGUnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBlbnRyeS5zb3VyY2UucGF0aCA9IG1hcmtldHBsYWNlUGF0aDtcbiAgZW50cnkuaW5zdGFsbExvY2F0aW9uID0gbWFya2V0cGxhY2VQYXRoO1xuICBlbnRyeS5sYXN0VXBkYXRlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgYXdhaXQgZnMud3JpdGVGaWxlKGtub3duUGF0aCwgYCR7SlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgNCl9XFxuYCk7XG4gIGxvZ2dlci5pbmZvKCdVcGRhdGVkIG1hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiB0byBleHRlbnNpb24gYnVuZGxlJywgeyBtYXJrZXRwbGFjZVBhdGggfSk7XG59XG5cbi8qKlxuICogRXZpY3RzIHRoZSBDbGF1ZGUgQ29kZSBwbHVnaW4gY2FjaGUgZm9yIGBydW50aW1lQGNhcmRzLm1hbmFnZW1lbnRgIHdoZW4gdGhlXG4gKiBjYWNoZWQgdmVyc2lvbiBpcyBvbGRlciB0aGFuIHRoZSB2ZXJzaW9uIGJ1bmRsZWQgd2l0aCB0aGUgZXh0ZW5zaW9uLlxuICpcbiAqIFJlYWRzIHRoZSBidW5kbGVkIHJ1bnRpbWUgcGx1Z2luLmpzb24gdmVyc2lvbiBmcm9tIHRoZSBleHRlbnNpb24ncyBtYXJrZXRwbGFjZVxuICogZGlyZWN0b3J5LCB0aGVuIGNoZWNrcyBmb3IgY2FjaGVkIHZlcnNpb25zIHVuZGVyXG4gKiBgPGNvbmZpZ0Rpcj4vcGx1Z2lucy9jYWNoZS9jYXJkcy1tYW5hZ2VtZW50L3J1bnRpbWUvYC4gSWYgYW55IGNhY2hlZCB2ZXJzaW9uXG4gKiBleGlzdHMgdGhhdCBpcyBsb3dlciB0aGFuIHRoZSBidW5kbGVkIHZlcnNpb24sIHRoZSBlbnRpcmUgcnVudGltZSBjYWNoZVxuICogZGlyZWN0b3J5IGlzIHJlbW92ZWQgc28gQ2xhdWRlIENvZGUgcmUtY2FjaGVzIGZyb20gdGhlIGRpcmVjdG9yeSBzb3VyY2UuXG4gKlxuICogQHBhcmFtIG1hcmtldHBsYWNlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGJ1bmRsZWQgbWFya2V0cGxhY2UgZGlyZWN0b3J5LlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBldmljdFN0YWxlUnVudGltZUNhY2hlKG1hcmtldHBsYWNlUGF0aDogc3RyaW5nLCBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGJ1bmRsZWRWZXJzaW9uID0gYXdhaXQgcmVhZFBsdWdpblZlcnNpb24oXG4gICAgcGF0aC5qb2luKG1hcmtldHBsYWNlUGF0aCwgJ3BsdWdpbnMnLCAncnVudGltZScsICcuY2xhdWRlLXBsdWdpbicsICdwbHVnaW4uanNvbicpXG4gICk7XG4gIGlmICghYnVuZGxlZFZlcnNpb24pIHtcbiAgICBsb2dnZXIud2FybignQ291bGQgbm90IHJlYWQgYnVuZGxlZCBydW50aW1lIHBsdWdpbiB2ZXJzaW9uLCBza2lwcGluZyBjYWNoZSBldmljdGlvbicpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGNvbmZpZ0RpciA9IGF3YWl0IHJlc29sdmVDbGF1ZGVDb25maWdEaXIoKTtcbiAgaWYgKCFjb25maWdEaXIpIHtcbiAgICBsb2dnZXIuZGVidWcoJ0NsYXVkZSBjb25maWcgZGlyZWN0b3J5IG5vdCBmb3VuZCwgc2tpcHBpbmcgY2FjaGUgZXZpY3Rpb24nKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBjYWNoZURpciA9IHBhdGguam9pbihjb25maWdEaXIsICdwbHVnaW5zJywgJ2NhY2hlJywgJ2NhcmRzLW1hbmFnZW1lbnQnLCAncnVudGltZScpO1xuICBsZXQgZW50cmllczogc3RyaW5nW107XG4gIHRyeSB7XG4gICAgZW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIoY2FjaGVEaXIpO1xuICB9IGNhdGNoIHtcbiAgICAvLyBObyBjYWNoZSBkaXJlY3RvcnkgXHUyMDE0IG5vdGhpbmcgdG8gZXZpY3RcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoZW50cmllcy5sZW5ndGggPT09IDApIHJldHVybjtcblxuICAvLyBDaGVjayBpZiBhbnkgY2FjaGVkIHZlcnNpb24gaXMgc3RhbGUgKGxvd2VyIHRoYW4gYnVuZGxlZClcbiAgY29uc3QgYnVuZGxlZFBhcnRzID0gYnVuZGxlZFZlcnNpb24uc3BsaXQoJy4nKS5tYXAoTnVtYmVyKTtcbiAgbGV0IGhhc1N0YWxlID0gZmFsc2U7XG5cbiAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgY29uc3QgcGFydHMgPSBlbnRyeS5zcGxpdCgnLicpLm1hcChOdW1iZXIpO1xuICAgIGlmIChwYXJ0cy5zb21lKE51bWJlci5pc05hTikgfHwgcGFydHMubGVuZ3RoICE9PSAzKSBjb250aW51ZTtcblxuICAgIC8vIENvbXBhcmUgc2VtdmVyOiBzdGFsZSBpZiBjYWNoZWQgPCBidW5kbGVkXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgIGNvbnN0IGNhY2hlZCA9IHBhcnRzW2ldID8/IDA7XG4gICAgICBjb25zdCBidW5kbGVkID0gYnVuZGxlZFBhcnRzW2ldID8/IDA7XG4gICAgICBpZiAoY2FjaGVkIDwgYnVuZGxlZCkge1xuICAgICAgICBoYXNTdGFsZSA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKGNhY2hlZCA+IGJ1bmRsZWQpIGJyZWFrO1xuICAgIH1cbiAgICBpZiAoaGFzU3RhbGUpIGJyZWFrO1xuICB9XG5cbiAgaWYgKCFoYXNTdGFsZSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnUnVudGltZSBwbHVnaW4gY2FjaGUgaXMgdXAgdG8gZGF0ZScsIHsgYnVuZGxlZFZlcnNpb24sIGNhY2hlZFZlcnNpb25zOiBlbnRyaWVzIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxvZ2dlci5pbmZvKCdFdmljdGluZyBzdGFsZSBydW50aW1lIHBsdWdpbiBjYWNoZScsIHsgYnVuZGxlZFZlcnNpb24sIGNhY2hlZFZlcnNpb25zOiBlbnRyaWVzIH0pO1xuICBhd2FpdCBmcy5ybShjYWNoZURpciwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xufVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgQ0xJIGFyZ3VtZW50IGxpc3QgZm9yIHRoZSBgY2xhdWRlYCBwcm9jZXNzLlxuICpcbiAqIEBwYXJhbSBwcm9tcHQgLSBUaGUgcHJvbXB0IHN0cmluZyBmb3IgbmV3IHNlc3Npb25zLlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gaWRlbnRpZmllciAodXNlZCBmb3IgYC0tc2Vzc2lvbi1pZGAgb3IgYC0tcmVzdW1lYCkuXG4gKiBAcGFyYW0gcmVzdW1lIC0gV2hlbiB0cnVlLCBwYXNzZXMgYC0tcmVzdW1lYCBpbnN0ZWFkIG9mIHN0YXJ0aW5nIGEgbmV3IHNlc3Npb24uXG4gKiBAcGFyYW0gbW9kZSAtIEV4ZWN1dGlvbiBtb2RlOyBgJ2JhY2tncm91bmQnYCBhcHBlbmRzIGAtLXByaW50YC5cbiAqIEBwYXJhbSBjYXJkUmVwb1BhdGggLSBBYnNvbHV0ZSBwYXRoIHBhc3NlZCB2aWEgYC0tYWRkLWRpcmAuXG4gKiBAcGFyYW0gbWFya2V0cGxhY2VQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcmV0dXJucyBBcnJheSBvZiBDTEkgYXJndW1lbnRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBcmdzKFxuICBwcm9tcHQ6IHN0cmluZyxcbiAgc2Vzc2lvbklkOiBzdHJpbmcsXG4gIHJlc3VtZTogYm9vbGVhbixcbiAgbW9kZTogQWN0aW9uSW5wdXRbJ2V4ZWN1dGlvbk1vZGUnXSxcbiAgY2FyZFJlcG9QYXRoOiBzdHJpbmcsXG4gIG1hcmtldHBsYWNlUGF0aDogc3RyaW5nXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGFyZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKHJlc3VtZSkge1xuICAgIGFyZ3MucHVzaCgnLS1yZXN1bWUnLCBzZXNzaW9uSWQpO1xuICB9IGVsc2Uge1xuICAgIGFyZ3MucHVzaChwcm9tcHQpO1xuICAgIGFyZ3MucHVzaCgnLS1zZXNzaW9uLWlkJywgc2Vzc2lvbklkKTtcbiAgfVxuICBhcmdzLnB1c2goJy0tc2V0dGluZ3MnLCBidWlsZFBsdWdpblNldHRpbmdzKG1hcmtldHBsYWNlUGF0aCkpO1xuICBhcmdzLnB1c2goJy0tYWRkLWRpcicsIGNhcmRSZXBvUGF0aCk7XG4gIGlmIChtb2RlID09PSAnYmFja2dyb3VuZCcpIHtcbiAgICBhcmdzLnB1c2goJy0tcHJpbnQnKTtcbiAgfVxuXG4gIHJldHVybiBhcmdzO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBjdXJyZW50IGJyYW5jaCBuYW1lIGluIHRoZSBnaXZlbiB3b3Jrc3BhY2UuXG4gKlxuICogQHBhcmFtIHdvcmtzcGFjZVBhdGggLSBEaXJlY3Rvcnkgd2hlcmUgYGdpdCByZXYtcGFyc2VgIHJ1bnMuXG4gKiBAcmV0dXJucyBUaGUgYWJicmV2aWF0ZWQgYnJhbmNoIG5hbWUgYXQgSEVBRC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVCYXNlQnJhbmNoKHdvcmtzcGFjZVBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICctLWFiYnJldi1yZWYnLCAnSEVBRCddLCB7XG4gICAgY3dkOiB3b3Jrc3BhY2VQYXRoXG4gIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHdvcmt0cmVlIHBhdGggZXhpc3RzIG9uIGRpc2suXG4gKlxuICogQHBhcmFtIHdvcmt0cmVlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGVzdC5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiB0aGUgcGF0aCBpcyBhY2Nlc3NpYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiB3b3JrdHJlZUV4aXN0c09uRGlzayh3b3JrdHJlZVBhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGF3YWl0IGZzLmFjY2Vzcyh3b3JrdHJlZVBhdGgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBGaW5kcyBvciBjcmVhdGVzIGEgd29ya3RyZWUgZm9yIHRoZSBjYXJkLlxuICpcbiAqIFRyaWVzIHRvIHJldXNlIGFuIGV4aXN0aW5nIGJyYW5jaCB3aG9zZSB3b3JrdHJlZSBpcyBzdGlsbCBvbiBkaXNrLiBXaGVuIG5vXG4gKiB2YWxpZCBicmFuY2ggZXhpc3RzLCBjcmVhdGVzIGEgbmV3IG9uZSBhbmQgcmVnaXN0ZXJzIGl0IHdpdGggdGhlIEFQSS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgY29udGFpbmluZyBjYXJkSWQgYW5kIHdvcmtzcGFjZSBwYXRocy5cbiAqIEBwYXJhbSBjbGllbnQgLSBDYXJkcyBBUEkgY2xpZW50IGZvciBicmFuY2ggQ1JVRC5cbiAqIEBwYXJhbSBiYXNlQnJhbmNoIC0gQ3VycmVudCBicmFuY2ggaW4gdGhlIHdvcmtzcGFjZSAodXNlZCBhcyBwYXJlbnQpLlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKiBAcmV0dXJucyBXb3JrdHJlZSBwYXRoLCBicmFuY2ggbmFtZSwgYW5kIHBhcmVudCBicmFuY2ggbmFtZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVPckNyZWF0ZVdvcmt0cmVlKFxuICBpbnB1dDogQWN0aW9uSW5wdXQsXG4gIGNsaWVudDogQ2FyZHNDbGllbnQsXG4gIGJhc2VCcmFuY2g6IHN0cmluZyxcbiAgbG9nZ2VyOiBBY3Rpb25Db250ZXh0Wydsb2dnZXInXVxuKTogUHJvbWlzZTx7IHdvcmt0cmVlUGF0aDogc3RyaW5nOyBicmFuY2hOYW1lOiBzdHJpbmc7IHBhcmVudEJyYW5jaDogc3RyaW5nIH0+IHtcbiAgY29uc3QgeyBicmFuY2hlcyB9ID0gYXdhaXQgY2xpZW50LmdldEJyYW5jaGVzKGlucHV0LmNhcmRJZCwgeyB3b3Jrc3BhY2VQYXRoOiBpbnB1dC53b3Jrc3BhY2VQYXRoIH0pO1xuXG4gIC8vIFRyeSB0byByZXVzZSBhbiBleGlzdGluZyBicmFuY2ggd2l0aCBhIHZhbGlkIHdvcmt0cmVlIG9uIGRpc2tcbiAgZm9yIChjb25zdCBicmFuY2ggb2YgYnJhbmNoZXMpIHtcbiAgICBpZiAoIWJyYW5jaC5leGlzdHMgfHwgIWJyYW5jaC53b3JrdHJlZSkgY29udGludWU7XG4gICAgaWYgKCEoYXdhaXQgd29ya3RyZWVFeGlzdHNPbkRpc2soYnJhbmNoLndvcmt0cmVlKSkpIGNvbnRpbnVlO1xuXG4gICAgY29uc3QgcGFyZW50QnJhbmNoID0gYnJhbmNoLnBhcmVudEJyYW5jaCA/PyBiYXNlQnJhbmNoO1xuXG4gICAgbG9nZ2VyLmluZm8oJ1JldXNpbmcgZXhpc3Rpbmcgd29ya3RyZWUnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUsIHdvcmt0cmVlOiBicmFuY2gud29ya3RyZWUgfSk7XG4gICAgcmV0dXJuIHsgd29ya3RyZWVQYXRoOiBicmFuY2gud29ya3RyZWUsIGJyYW5jaE5hbWU6IGJyYW5jaC5uYW1lLCBwYXJlbnRCcmFuY2ggfTtcbiAgfVxuXG4gIC8vIE5vIHZhbGlkIGV4aXN0aW5nIGJyYW5jaCBcdTIwMTQgY3JlYXRlIG5ldyBvbmUuXG4gIC8vIFRoZSBBUEkgbWF5IGJlIG91dCBvZiBzeW5jIHdpdGggZ2l0IChlLmcuIGEgcHJldmlvdXMgd29ya3RyZWUgd2FzIGNyZWF0ZWRcbiAgLy8gYnV0IG5ldmVyIHJlZ2lzdGVyZWQsIG9yIGl0cyBBUEkgcmVjb3JkIHdhcyBkZWxldGVkKS4gVG8gYXZvaWQgY29sbGlkaW5nXG4gIC8vIHdpdGggd29ya3RyZWVzIGdpdCBhbHJlYWR5IGtub3dzIGFib3V0LCBwcm9iZSBnaXQncyBhY3R1YWwgc3RhdGUgYW5kXG4gIC8vIGluY3JlbWVudCBwYXN0IGFueSBvY2N1cGllZCBzbG90cy5cbiAgY29uc3QgcHJlZml4ID0gYGNhcmRzLyR7aW5wdXQuY2FyZElkfS9gO1xuICBjb25zdCBleGlzdGluZ051bWJlcnMgPSBicmFuY2hlc1xuICAgIC5maWx0ZXIoKGIpID0+IGIubmFtZS5zdGFydHNXaXRoKHByZWZpeCkpXG4gICAgLm1hcCgoYikgPT4gcGFyc2VJbnQoYi5uYW1lLnNsaWNlKHByZWZpeC5sZW5ndGgpLCAxMCkpXG4gICAgLmZpbHRlcigobikgPT4gIU51bWJlci5pc05hTihuKSk7XG4gIGxldCBuZXh0TnVtYmVyID0gZXhpc3RpbmdOdW1iZXJzLmxlbmd0aCA+IDAgPyBNYXRoLm1heCguLi5leGlzdGluZ051bWJlcnMpICsgMSA6IDE7XG5cbiAgY29uc3QgeyByZXBvUm9vdCB9ID0gYXdhaXQgZmluZEdpdFJvb3RzKGlucHV0LndvcmtzcGFjZVBhdGgpO1xuICB3aGlsZSAoYXdhaXQgY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdCwgcGF0aC5qb2luKHJlcG9Sb290LCAnLndvcmt0cmVlcycsIGAke3ByZWZpeH0ke25leHROdW1iZXJ9YCkpKSB7XG4gICAgbG9nZ2VyLndhcm4oJ1dvcmt0cmVlIGFscmVhZHkgZXhpc3RzIGluIGdpdCBidXQgbm90IGluIEFQSSwgc2tpcHBpbmcnLCB7XG4gICAgICBicmFuY2g6IGAke3ByZWZpeH0ke25leHROdW1iZXJ9YFxuICAgIH0pO1xuICAgIG5leHROdW1iZXIrKztcbiAgfVxuXG4gIGNvbnN0IGJyYW5jaE5hbWUgPSBgJHtwcmVmaXh9JHtuZXh0TnVtYmVyfWA7XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZVdvcmt0cmVlKGJyYW5jaE5hbWUsIHsgY3dkOiBpbnB1dC53b3Jrc3BhY2VQYXRoIH0pO1xuICBhd2FpdCBjbGllbnQuYWRkQnJhbmNoKGlucHV0LmNhcmRJZCwgeyBuYW1lOiBicmFuY2hOYW1lLCB3b3JrdHJlZTogcmVzdWx0Lndvcmt0cmVlLCBwYXJlbnRCcmFuY2g6IGJhc2VCcmFuY2ggfSk7XG5cbiAgbG9nZ2VyLmluZm8oJ0NyZWF0ZWQgbmV3IHdvcmt0cmVlJywgeyBicmFuY2g6IGJyYW5jaE5hbWUsIHdvcmt0cmVlOiByZXN1bHQud29ya3RyZWUgfSk7XG4gIHJldHVybiB7IHdvcmt0cmVlUGF0aDogcmVzdWx0Lndvcmt0cmVlLCBicmFuY2hOYW1lLCBwYXJlbnRCcmFuY2g6IGJhc2VCcmFuY2ggfTtcbn1cblxuLyoqXG4gKiBSdW5zIGEgc2luZ2xlIGNsZWFudXAgc3RlcCwgbG9nZ2luZyBhIHdhcm5pbmcgb24gZmFpbHVyZSByYXRoZXIgdGhhblxuICogYWJvcnRpbmcgdGhlIHN3ZWVwLiBFYWNoIHN0ZXAgKHdvcmt0cmVlIHJlbW92YWwsIGJyYW5jaCBkZWxldGlvbiwgQVBJXG4gKiByZWNvcmQgcmVtb3ZhbCkgaXMgaW5kZXBlbmRlbnQgXHUyMDE0IGEgZmFpbHVyZSBpbiBvbmUgbXVzdCBub3QgcHJldmVudCB0aGVcbiAqIG90aGVycyBmcm9tIHJ1bm5pbmcuXG4gKlxuICogQHBhcmFtIHN0ZXAgLSBBc3luYyBvcGVyYXRpb24gdG8gYXR0ZW1wdC5cbiAqIEBwYXJhbSBsYWJlbCAtIEh1bWFuLXJlYWRhYmxlIGxhYmVsIGxvZ2dlZCBvbiBmYWlsdXJlLlxuICogQHBhcmFtIGJyYW5jaE5hbWUgLSBCcmFuY2ggbmFtZSBpbmNsdWRlZCBpbiBkaWFnbm9zdGljIG91dHB1dC5cbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICovXG5hc3luYyBmdW5jdGlvbiB0cnlDbGVhbnVwU3RlcChcbiAgc3RlcDogKCkgPT4gUHJvbWlzZTx1bmtub3duPixcbiAgbGFiZWw6IHN0cmluZyxcbiAgYnJhbmNoTmFtZTogc3RyaW5nLFxuICBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBzdGVwKCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyLndhcm4obGFiZWwsIHsgYnJhbmNoOiBicmFuY2hOYW1lLCBlcnJvcjogZXJyb3JNZXNzYWdlKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgYnJhbmNoZXMgdGhhdCBhcmUgZnVsbHkgbWVyZ2VkIGludG8gdGhlIGJhc2UgYnJhbmNoLlxuICpcbiAqIEZvciBlYWNoIG1lcmdlZCBicmFuY2ggdGhlIHdvcmt0cmVlIGRpcmVjdG9yeSBpcyByZW1vdmVkLCB0aGUgbG9jYWwgYnJhbmNoXG4gKiByZWYgaXMgZGVsZXRlZCwgYW5kIHRoZSBicmFuY2ggcmVjb3JkIGlzIHJlbW92ZWQgZnJvbSB0aGUgQVBJLiBJbmRpdmlkdWFsXG4gKiBmYWlsdXJlcyBhcmUgbG9nZ2VkIGFuZCBkbyBub3QgYWJvcnQgdGhlIHN3ZWVwLlxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIEFjdGlvbiBpbnB1dCBjb250YWluaW5nIGNhcmRJZCBhbmQgd29ya3NwYWNlIHBhdGhzLlxuICogQHBhcmFtIGNsaWVudCAtIENhcmRzIEFQSSBjbGllbnQgZm9yIGJyYW5jaCByZW1vdmFsLlxuICogQHBhcmFtIGJhc2VCcmFuY2ggLSBCcmFuY2ggdG8gY2hlY2sgbWVyZ2Ugc3RhdHVzIGFnYWluc3QuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFudXBNZXJnZWRCcmFuY2hlcyhcbiAgaW5wdXQ6IEFjdGlvbklucHV0LFxuICBjbGllbnQ6IENhcmRzQ2xpZW50LFxuICBiYXNlQnJhbmNoOiBzdHJpbmcsXG4gIGxvZ2dlcjogQWN0aW9uQ29udGV4dFsnbG9nZ2VyJ11cbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IGJyYW5jaGVzIH0gPSBhd2FpdCBjbGllbnQuZ2V0QnJhbmNoZXMoaW5wdXQuY2FyZElkLCB7IHdvcmtzcGFjZVBhdGg6IGlucHV0LndvcmtzcGFjZVBhdGggfSk7XG5cbiAgZm9yIChjb25zdCBicmFuY2ggb2YgYnJhbmNoZXMpIHtcbiAgICBpZiAoIWJyYW5jaC5leGlzdHMpIGNvbnRpbnVlO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIG1lcmdlLWJhc2UgLS1pcy1hbmNlc3RvciBleGl0cyBub24temVybyB3aGVuIE5PVCBhbiBhbmNlc3RvciAobm90IG1lcmdlZClcbiAgICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnbWVyZ2UtYmFzZScsICctLWlzLWFuY2VzdG9yJywgYnJhbmNoLm5hbWUsIGJhc2VCcmFuY2hdLCB7XG4gICAgICAgIGN3ZDogaW5wdXQud29ya3NwYWNlUGF0aFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBFeHBlY3RlZCBmb3IgdW5tZXJnZWQgYnJhbmNoZXMgXHUyMDE0IHNraXAgY2xlYW51cFxuICAgICAgbG9nZ2VyLmRlYnVnKCdCcmFuY2ggbm90IG1lcmdlZCwgc2tpcHBpbmcgY2xlYW51cCcsIHsgYnJhbmNoOiBicmFuY2gubmFtZSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIEJyYW5jaCBpcyBtZXJnZWQgXHUyMDE0IGNsZWFuIHVwIHdvcmt0cmVlLCBicmFuY2ggcmVmLCBhbmQgQVBJIHJlY29yZFxuICAgIGlmIChicmFuY2gud29ya3RyZWUpIHtcbiAgICAgIGF3YWl0IHRyeUNsZWFudXBTdGVwKFxuICAgICAgICAoKSA9PiBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ3JlbW92ZScsIGJyYW5jaC53b3JrdHJlZSFdLCB7IGN3ZDogaW5wdXQud29ya3NwYWNlUGF0aCB9KSxcbiAgICAgICAgJ0ZhaWxlZCB0byByZW1vdmUgd29ya3RyZWUnLFxuICAgICAgICBicmFuY2gubmFtZSxcbiAgICAgICAgbG9nZ2VyXG4gICAgICApO1xuICAgIH1cblxuICAgIGF3YWl0IHRyeUNsZWFudXBTdGVwKFxuICAgICAgKCkgPT4gZXhlY0ZpbGVBc3luYygnZ2l0JywgWydicmFuY2gnLCAnLWQnLCBicmFuY2gubmFtZV0sIHsgY3dkOiBpbnB1dC53b3Jrc3BhY2VQYXRoIH0pLFxuICAgICAgJ0ZhaWxlZCB0byBkZWxldGUgYnJhbmNoJyxcbiAgICAgIGJyYW5jaC5uYW1lLFxuICAgICAgbG9nZ2VyXG4gICAgKTtcblxuICAgIGF3YWl0IHRyeUNsZWFudXBTdGVwKFxuICAgICAgKCkgPT4gY2xpZW50LnJlbW92ZUJyYW5jaChpbnB1dC5jYXJkSWQsIGJyYW5jaC5uYW1lKSxcbiAgICAgICdGYWlsZWQgdG8gcmVtb3ZlIGJyYW5jaCBmcm9tIEFQSScsXG4gICAgICBicmFuY2gubmFtZSxcbiAgICAgIGxvZ2dlclxuICAgICk7XG5cbiAgICBsb2dnZXIuaW5mbygnQ2xlYW5lZCB1cCBtZXJnZWQgYnJhbmNoJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lIH0pO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgZXhlY0ZpbGUgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcy9wcm9taXNlcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBwcm9taXNpZnkgfSBmcm9tICdub2RlOnV0aWwnO1xuXG4vKipcbiAqIEltcGxlbWVudHMgY3JlYXRlIHdvcmt0cmVlIGJlaGF2aW9yIGZvciB0aGUgZGVmYXVsdC1jb25maWd1cmF0aW9uIHBhY2thZ2UuXG4gKiBUaGUgbW9kdWxlIGNhcHR1cmVzIGRvbWFpbiBydWxlcyBpbiBvbmUgcGxhY2Ugc28gY2FsbGVycyBjYW4gY29tcG9zZSB3b3JrZmxvd3Mgd2l0aG91dFxuICogZHVwbGljYXRpbmcgZWRnZS1jYXNlIGhhbmRsaW5nLlxuICpcbiAqIEBzdW1tYXJ5IENyZWF0ZSBXb3JrdHJlZSBsb2dpYyBmb3IgbGliXG4gKi9cblxuY29uc3QgZXhlY0ZpbGVBc3luYyA9IHByb21pc2lmeShleGVjRmlsZSk7XG5cbi8qKlxuICogVmFsaWRhdGVzIGEgYnJhbmNoIG5hbWUgYWdhaW5zdCB0aGUgQ0xJJ3Mgc2FmZSBzdWJzZXQuXG4gKlxuICogVGhlIG5hbWUgbXVzdCBzdGFydCB3aXRoIGFuIGFscGhhbnVtZXJpYyBjaGFyYWN0ZXIgYW5kIG1heSB0aGVuIGluY2x1ZGVcbiAqIGFscGhhbnVtZXJpY3MsIHNsYXNoZXMsIHVuZGVyc2NvcmVzLCBvciBkYXNoZXMuXG4gKlxuICogQHBhcmFtIG5hbWUgLSBDYW5kaWRhdGUgYnJhbmNoIG5hbWUgc3VwcGxpZWQgYnkgdGhlIGNhbGxlci5cbiAqIEB0aHJvd3Mge0Vycm9yfSBXaGVuIHRoZSBicmFuY2ggbmFtZSBkb2VzIG5vdCBtYXRjaCB0aGUgc3VwcG9ydGVkIGZvcm1hdC5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLiBUaHJvd3Mgb24gaW52YWxpZCBpbnB1dC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQnJhbmNoTmFtZShuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgYnJhbmNoTmFtZVJlZ2V4ID0gL15bYS16QS1aMC05XVthLXpBLVowLTkvXy1dKiQvO1xuICBpZiAoIWJyYW5jaE5hbWVSZWdleC50ZXN0KG5hbWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvcjogSW52YWxpZCBicmFuY2ggbmFtZSBmb3JtYXQuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSByZWxhdGl2ZSBwYXRoIGlzIG5lc3RlZCB1bmRlciBhbnkga25vd24gcGFyZW50IHBhdGguXG4gKlxuICogVGhlIGNoZWNrIHdhbGtzIGFuY2VzdG9yIHNlZ21lbnRzIG9mIGBkaXJgIGFuZCByZXR1cm5zIHRydWUgb24gdGhlIGZpcnN0XG4gKiBtYXRjaCBpbiBgcGFyZW50U2V0YC5cbiAqXG4gKiBAcGFyYW0gZGlyIC0gUmVsYXRpdmUgcGF0aCB0byB0ZXN0LlxuICogQHBhcmFtIHBhcmVudFNldCAtIENhbmRpZGF0ZSBwYXJlbnQgZGlyZWN0b3JpZXMgcmVwcmVzZW50ZWQgYXMgcmVsYXRpdmUgcGF0aHMuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYGRpcmAgaXMgbmVzdGVkIHVuZGVyIGEgcGF0aCBpbiBgcGFyZW50U2V0YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTmVzdGVkVW5kZXIoZGlyOiBzdHJpbmcsIHBhcmVudFNldDogU2V0PHN0cmluZz4pOiBib29sZWFuIHtcbiAgbGV0IGN1cnJlbnQgPSBkaXI7XG4gIHdoaWxlIChjdXJyZW50LmluY2x1ZGVzKCcvJykpIHtcbiAgICBjdXJyZW50ID0gY3VycmVudC5zdWJzdHJpbmcoMCwgY3VycmVudC5sYXN0SW5kZXhPZignLycpKTtcbiAgICBpZiAocGFyZW50U2V0LmhhcyhjdXJyZW50KSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHN5bWxpbmsgdGFyZ2V0IHBvaW50cyB0byBrbm93biBtb25vcmVwby1pbnRlcm5hbCBsb2NhdGlvbnMuXG4gKlxuICogSW50ZXJuYWwgdGFyZ2V0cyBhcmUgcHJlc2VydmVkIGFzIHJlbGF0aXZlIGxpbmtzIGR1cmluZyBub2RlX21vZHVsZXMgcmVyb3V0ZVxuICogc28gd29ya3NwYWNlIGxpbmtzIGtlZXAgd29ya2luZyBpbnNpZGUgYSB3b3JrdHJlZS5cbiAqXG4gKiBAcGFyYW0gdGFyZ2V0IC0gU3ltbGluayB0YXJnZXQgcmVhZCBmcm9tIHRoZSBzb3VyY2Ugbm9kZV9tb2R1bGVzIGVudHJ5LlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIHRoZSB0YXJnZXQgc3RhcnRzIHdpdGggYW4gaW50ZXJuYWwgcHJlZml4LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIHRhcmdldC5zdGFydHNXaXRoKCcuLi8nKTtcbn1cblxuaW50ZXJmYWNlIENyZWF0ZVdvcmt0cmVlUmVzdWx0IHtcbiAgYnJhbmNoOiBzdHJpbmc7XG4gIHdvcmt0cmVlOiBzdHJpbmc7XG4gIGJhc2VTaGE6IHN0cmluZztcbiAgcmVyb3V0ZWRTeW1saW5rcz86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuZCBjb25maWd1cmVzIGEgbmV3IGdpdCB3b3JrdHJlZSBmb3IgYSBicmFuY2guXG4gKlxuICogVGhlIHdvcmtmbG93IHZhbGlkYXRlcyB0aGUgYnJhbmNoIG5hbWUsIGNyZWF0ZXMgdGhlIHdvcmt0cmVlLCBtaXJyb3JzXG4gKiBleGlzdGluZyByb290IHN5bWxpbmtzLCBzeW1saW5rcyBpZ25vcmVkIHBhdGhzLCByZXJvdXRlcyBub2RlX21vZHVsZXMgbGlua3MsXG4gKiBhbmQgdXBkYXRlcyBwZXItd29ya3RyZWUgZ2l0IGV4Y2x1ZGVzLlxuICpcbiAqIEBwYXJhbSBicmFuY2hOYW1lIC0gTmFtZSBvZiB0aGUgYnJhbmNoIHRvIGNyZWF0ZSBvciBhdHRhY2guXG4gKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24uXG4gKiBAcGFyYW0gb3B0aW9ucy5jd2QgLSBXb3JraW5nIGRpcmVjdG9yeSB0byB1c2Ugd2hlbiBsb2NhdGluZyBnaXQgcm9vdHMuIERlZmF1bHRzIHRvIGBwcm9jZXNzLmN3ZCgpYC5cbiAqIEByZXR1cm5zIE1ldGFkYXRhIGRlc2NyaWJpbmcgdGhlIGNyZWF0ZWQgd29ya3RyZWUgYW5kIGJhc2UgY29tbWl0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlV29ya3RyZWUoYnJhbmNoTmFtZTogc3RyaW5nLCBvcHRpb25zPzogeyBjd2Q/OiBzdHJpbmcgfSk6IFByb21pc2U8Q3JlYXRlV29ya3RyZWVSZXN1bHQ+IHtcbiAgdmFsaWRhdGVCcmFuY2hOYW1lKGJyYW5jaE5hbWUpO1xuXG4gIGNvbnN0IHsgc291cmNlUm9vdCwgcmVwb1Jvb3QgfSA9IGF3YWl0IGZpbmRHaXRSb290cyhvcHRpb25zPy5jd2QgPz8gcHJvY2Vzcy5jd2QoKSk7XG4gIGNvbnN0IHN0YXJ0UG9pbnQgPSBhd2FpdCByZXNvbHZlSGVhZChzb3VyY2VSb290KTtcbiAgY29uc3Qgd29ya3RyZWVEaXIgPSBwYXRoLmpvaW4ocmVwb1Jvb3QsICcud29ya3RyZWVzJywgYnJhbmNoTmFtZSk7XG5cbiAgY29uc3QgW3dvcmt0cmVlRXhpc3RzLCBicmFuY2hFeGlzdHNdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgIGNoZWNrV29ya3RyZWVFeGlzdHMocmVwb1Jvb3QsIHdvcmt0cmVlRGlyKSxcbiAgICBjaGVja0JyYW5jaEV4aXN0cyhyZXBvUm9vdCwgYnJhbmNoTmFtZSlcbiAgXSk7XG5cbiAgaWYgKHdvcmt0cmVlRXhpc3RzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvcjogV29ya3RyZWUgYWxyZWFkeSBleGlzdHMgYXQgJHt3b3JrdHJlZURpcn1gKTtcbiAgfVxuXG4gIGF3YWl0IGFkZFdvcmt0cmVlKHsgcmVwb1Jvb3QsIHdvcmt0cmVlRGlyLCBicmFuY2hOYW1lLCBicmFuY2hFeGlzdHMsIHN0YXJ0UG9pbnQgfSk7XG5cbiAgY29uc3QgaWdub3JlZCA9IGF3YWl0IGRpc2NvdmVySWdub3JlZFBhdGhzKHNvdXJjZVJvb3QpO1xuICBhd2FpdCBjb3B5RXhpc3RpbmdTeW1saW5rcyhzb3VyY2VSb290LCB3b3JrdHJlZURpcik7XG4gIGF3YWl0IHN5bWxpbmtJZ25vcmVkUGF0aHMoeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgaWdub3JlZCB9KTtcblxuICBjb25zdCByZXJvdXRlZENvdW50ID0gYXdhaXQgcmVyb3V0ZUFsbE5vZGVNb2R1bGVzKHsgc291cmNlUm9vdCwgd29ya3RyZWVEaXIsIHJlcG9Sb290IH0pO1xuXG4gIGNvbnN0IFssIGJhc2VTaGFdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgIHVwZGF0ZUdpdEV4Y2x1ZGUoeyB3b3JrdHJlZURpciwgcmVwb1Jvb3QsIGRpcmVjdG9yaWVzOiBpZ25vcmVkLmRpcmVjdG9yaWVzLCBmaWxlczogaWdub3JlZC5maWxlcyB9KSxcbiAgICByZXNvbHZlSGVhZCh3b3JrdHJlZURpcilcbiAgXSk7XG5cbiAgY29uc3QgcmVzdWx0OiBDcmVhdGVXb3JrdHJlZVJlc3VsdCA9IHtcbiAgICBicmFuY2g6IGJyYW5jaE5hbWUsXG4gICAgd29ya3RyZWU6IHdvcmt0cmVlRGlyLFxuICAgIGJhc2VTaGFcbiAgfTtcblxuICBpZiAocmVyb3V0ZWRDb3VudCA+IDApIHtcbiAgICByZXN1bHQucmVyb3V0ZWRTeW1saW5rcyA9IHJlcm91dGVkQ291bnQ7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5pbnRlcmZhY2UgR2l0Um9vdHMge1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIHJlcG9Sb290OiBzdHJpbmc7XG59XG5cbi8qKlxuICogTG9jYXRlcyB0aGUgY3VycmVudCBnaXQgc291cmNlIHJvb3QgYW5kIHByaW1hcnkgcmVwb3NpdG9yeSByb290LlxuICpcbiAqIFN1cHBvcnRzIGJvdGggc3RhbmRhcmQgY2hlY2tvdXRzIChgLmdpdGAgZGlyZWN0b3J5KSBhbmQgd29ya3RyZWUgY2hlY2tvdXRzXG4gKiAoYC5naXRgIGZpbGUgcG9pbnRpbmcgaW50byBgLmdpdC93b3JrdHJlZXMvLi4uYCkuXG4gKlxuICogQHBhcmFtIHN0YXJ0RGlyIC0gRGlyZWN0b3J5IHdoZXJlIHVwd2FyZCBzZWFyY2ggYmVnaW5zLlxuICogQHRocm93cyB7RXJyb3J9IFdoZW4gbm8gZ2l0IHJlcG9zaXRvcnkgbWFya2VyIGlzIGZvdW5kLlxuICogQHJldHVybnMgUGF0aHMgZm9yIHRoZSBjdXJyZW50IGNoZWNrb3V0IHJvb3QgYW5kIHRoZSBwcmltYXJ5IHJlcG8gcm9vdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmRHaXRSb290cyhzdGFydERpcjogc3RyaW5nKTogUHJvbWlzZTxHaXRSb290cz4ge1xuICBsZXQgY3VycmVudERpciA9IHBhdGgucmVzb2x2ZShzdGFydERpcik7XG4gIHdoaWxlIChjdXJyZW50RGlyICE9PSAnLycpIHtcbiAgICBjb25zdCBnaXRQYXRoID0gcGF0aC5qb2luKGN1cnJlbnREaXIsICcuZ2l0Jyk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMubHN0YXQoZ2l0UGF0aCk7XG4gICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNvdXJjZVJvb3Q6IGN1cnJlbnREaXIsXG4gICAgICAgICAgcmVwb1Jvb3Q6IGN1cnJlbnREaXJcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBjb25zdCBnaXRGaWxlQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKGdpdFBhdGgsICd1dGYtOCcpO1xuICAgICAgICBjb25zdCBnaXRkaXJMaW5lID0gZ2l0RmlsZUNvbnRlbnQudHJpbSgpO1xuICAgICAgICBjb25zdCBnaXRkaXJQYXRoID0gZ2l0ZGlyTGluZS5yZXBsYWNlKC9eZ2l0ZGlyOlxccyovLCAnJyk7XG4gICAgICAgIGNvbnN0IG1haW5HaXREaXIgPSBnaXRkaXJQYXRoLnJlcGxhY2UoL1xcL3dvcmt0cmVlc1xcL1teL10rJC8sICcnKTtcbiAgICAgICAgY29uc3QgcmVwb1Jvb3QgPSBtYWluR2l0RGlyLnJlcGxhY2UoL1xcL1xcLmdpdCQvLCAnJyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlUm9vdDogY3VycmVudERpcixcbiAgICAgICAgICByZXBvUm9vdFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICAgIGN1cnJlbnREaXIgPSBwYXRoLmRpcm5hbWUoY3VycmVudERpcik7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW4gYSBnaXQgcmVwb3NpdG9yeScpO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBIRUFEIGNvbW1pdCBTSEEgZm9yIGEgcmVwb3NpdG9yeSBkaXJlY3RvcnkuXG4gKlxuICogQHBhcmFtIGN3ZCAtIFJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhc3NlZCB0byBgZ2l0IHJldi1wYXJzZSBIRUFEYC5cbiAqIEByZXR1cm5zIFRyaW1tZWQgY29tbWl0IFNIQSBzdHJpbmcuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlSGVhZChjd2Q6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICdIRUFEJ10sIHsgY3dkLCB0aW1lb3V0OiA1XzAwMCB9KTtcbiAgcmV0dXJuIHN0ZG91dC50cmltKCk7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSB3b3JrdHJlZSBwYXRoIGlzIGFscmVhZHkgcmVnaXN0ZXJlZCB3aXRoIGdpdC5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBQcmltYXJ5IHJlcG9zaXRvcnkgcm9vdCB3aGVyZSBnaXQgY29tbWFuZHMgcnVuLlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gQWJzb2x1dGUgd29ya3RyZWUgcGF0aCBiZWluZyBjcmVhdGVkLlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGBnaXQgd29ya3RyZWUgbGlzdGAgYWxyZWFkeSBjb250YWlucyBgd29ya3RyZWVEaXJgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ2xpc3QnXSwgeyBjd2Q6IHJlcG9Sb290LCB0aW1lb3V0OiAzMF8wMDAgfSk7XG4gIHJldHVybiBzdGRvdXQuaW5jbHVkZXMod29ya3RyZWVEaXIpO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgYnJhbmNoIGFscmVhZHkgZXhpc3RzIGluIHRoZSByZXBvc2l0b3J5LlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gYnJhbmNoTmFtZSAtIEJyYW5jaCBuYW1lIHRvIHF1ZXJ5LlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGF0IGxlYXN0IG9uZSBtYXRjaGluZyBsb2NhbCBicmFuY2ggaXMgbGlzdGVkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tCcmFuY2hFeGlzdHMocmVwb1Jvb3Q6IHN0cmluZywgYnJhbmNoTmFtZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ2JyYW5jaCcsICctLWxpc3QnLCBicmFuY2hOYW1lXSwge1xuICAgIGN3ZDogcmVwb1Jvb3QsXG4gICAgdGltZW91dDogMzBfMDAwXG4gIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKS5sZW5ndGggPiAwO1xufVxuXG5pbnRlcmZhY2UgQWRkV29ya3RyZWVPcHRpb25zIHtcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgYnJhbmNoTmFtZTogc3RyaW5nO1xuICBicmFuY2hFeGlzdHM6IGJvb2xlYW47XG4gIHN0YXJ0UG9pbnQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBZGRzIGEgZ2l0IHdvcmt0cmVlLCBjcmVhdGluZyB0aGUgYnJhbmNoIHdoZW4gbmVlZGVkLlxuICpcbiAqIFVzZXMgYGdpdCB3b3JrdHJlZSBhZGQgLWJgIGZvciBuZXcgYnJhbmNoZXMgYW5kIHBsYWluIGBnaXQgd29ya3RyZWUgYWRkYFxuICogd2hlbiBhdHRhY2hpbmcgdG8gYW4gZXhpc3RpbmcgYnJhbmNoLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gV29ya3RyZWUgY3JlYXRpb24gb3B0aW9ucyBhbmQgYnJhbmNoIGV4aXN0ZW5jZSBzdGF0ZS5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkV29ya3RyZWUob3B0czogQWRkV29ya3RyZWVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGFyZ3MgPSBvcHRzLmJyYW5jaEV4aXN0c1xuICAgID8gWyd3b3JrdHJlZScsICdhZGQnLCBvcHRzLndvcmt0cmVlRGlyLCBvcHRzLmJyYW5jaE5hbWVdXG4gICAgOiBbJ3dvcmt0cmVlJywgJ2FkZCcsICctYicsIG9wdHMuYnJhbmNoTmFtZSwgb3B0cy53b3JrdHJlZURpciwgb3B0cy5zdGFydFBvaW50XTtcbiAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgYXJncywgeyBjd2Q6IG9wdHMucmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbn1cblxuaW50ZXJmYWNlIElnbm9yZWRQYXRocyB7XG4gIGRpcmVjdG9yaWVzOiBzdHJpbmdbXTtcbiAgZmlsZXM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIERpc2NvdmVycyBpZ25vcmVkIGZpbGVzIGFuZCBkaXJlY3RvcmllcyB1bmRlciBhIHNvdXJjZSByb290LlxuICpcbiAqIFBhdGhzIGFyZSByZXR1cm5lZCByZWxhdGl2ZSB0byBgc291cmNlUm9vdGAgYW5kIGAud29ya3RyZWVzYCBjb250ZW50IGlzXG4gKiBmaWx0ZXJlZCBvdXQgdG8gYXZvaWQgc2VsZi1yZWZlcmVudGlhbCBzeW1saW5raW5nLlxuICpcbiAqIEBwYXJhbSBzb3VyY2VSb290IC0gU291cmNlIGNoZWNrb3V0IHJvb3QgdXNlZCBmb3IgZ2l0IGRpc2NvdmVyeS5cbiAqIEByZXR1cm5zIFNlcGFyYXRlIGxpc3RzIG9mIGlnbm9yZWQgZGlyZWN0b3JpZXMgYW5kIGlnbm9yZWQgZmlsZXMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkaXNjb3Zlcklnbm9yZWRQYXRocyhzb3VyY2VSb290OiBzdHJpbmcpOiBQcm9taXNlPElnbm9yZWRQYXRocz4ge1xuICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYyhcbiAgICAnZ2l0JyxcbiAgICBbJy1DJywgc291cmNlUm9vdCwgJ2xzLWZpbGVzJywgJy0taWdub3JlZCcsICctLWV4Y2x1ZGUtc3RhbmRhcmQnLCAnLS1kaXJlY3RvcnknLCAnLS1vdGhlcnMnXSxcbiAgICB7IGN3ZDogc291cmNlUm9vdCwgdGltZW91dDogMzBfMDAwIH1cbiAgKTtcblxuICBjb25zdCBsaW5lcyA9IHN0ZG91dC5zcGxpdCgnXFxuJykuZmlsdGVyKChsaW5lKSA9PiBsaW5lLmxlbmd0aCA+IDAgJiYgIWxpbmUuc3RhcnRzV2l0aCgnLndvcmt0cmVlcycpKTtcbiAgY29uc3QgZGlyZWN0b3JpZXMgPSBsaW5lcy5maWx0ZXIoKGwpID0+IGwuZW5kc1dpdGgoJy8nKSkubWFwKChsKSA9PiBsLnNsaWNlKDAsIC0xKSk7XG4gIGNvbnN0IGZpbGVzID0gbGluZXMuZmlsdGVyKChsKSA9PiAhbC5lbmRzV2l0aCgnLycpKTtcblxuICByZXR1cm4geyBkaXJlY3RvcmllcywgZmlsZXMgfTtcbn1cblxuaW50ZXJmYWNlIFN5bWxpbmtJZ25vcmVkUGF0aHNPcHRpb25zIHtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICBpZ25vcmVkOiBJZ25vcmVkUGF0aHM7XG59XG5cbmludGVyZmFjZSBTeW1saW5rSWdub3JlZFBhdGhzUmVzdWx0IHtcbiAgZGlyQ291bnQ6IG51bWJlcjtcbiAgZmlsZUNvdW50OiBudW1iZXI7XG59XG5cbi8qKlxuICogU3ltbGlua3MgaWdub3JlZCBkaXJlY3RvcmllcyBhbmQgZmlsZXMgZnJvbSBzb3VyY2UgY2hlY2tvdXQgaW50byBhIHdvcmt0cmVlLlxuICpcbiAqIE5lc3RlZCBpZ25vcmVkIGRpcmVjdG9yaWVzIGFyZSBjb2xsYXBzZWQgc28gb25seSB0b3AtbGV2ZWwgaWdub3JlZCBkaXJlY3RvcnlcbiAqIGxpbmtzIGFyZSBjcmVhdGVkLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIHJvb3QsIGRlc3RpbmF0aW9uIHdvcmt0cmVlLCBhbmQgaWdub3JlZCBwYXRoIGxpc3RzLlxuICogQHJldHVybnMgQ291bnRzIG9mIHN1Y2Nlc3NmdWxseSBjcmVhdGVkIGRpcmVjdG9yeSBhbmQgZmlsZSBzeW1saW5rcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN5bWxpbmtJZ25vcmVkUGF0aHMob3B0czogU3ltbGlua0lnbm9yZWRQYXRoc09wdGlvbnMpOiBQcm9taXNlPFN5bWxpbmtJZ25vcmVkUGF0aHNSZXN1bHQ+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgaWdub3JlZCB9ID0gb3B0cztcbiAgY29uc3QgZGlyU2V0ID0gbmV3IFNldChpZ25vcmVkLmRpcmVjdG9yaWVzKTtcbiAgY29uc3Qgbm9uTmVzdGVkRGlycyA9IGlnbm9yZWQuZGlyZWN0b3JpZXMuZmlsdGVyKChkaXIpID0+ICFpc05lc3RlZFVuZGVyKGRpciwgZGlyU2V0KSk7XG5cbiAgY29uc3QgY3JlYXRlRGlyU3ltbGluayA9IGFzeW5jIChkaXI6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIGRpcik7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIGxzdGF0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBkaXIpO1xuICAgICAgY29uc3QgcGFyZW50RGlyID0gcGF0aC5kaXJuYW1lKGRpcik7XG4gICAgICBpZiAocGFyZW50RGlyICE9PSAnLicpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBwYXJlbnREaXIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGNvbnN0IGNvZGUgPSAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlO1xuICAgICAgaWYgKGNvZGUgPT09ICdFRVhJU1QnIHx8IGNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIHN5bWxpbms6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGNyZWF0ZUZpbGVTeW1saW5rID0gYXN5bmMgKGZpbGU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIGZpbGUpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMubHN0YXQoc291cmNlUGF0aCk7XG4gICAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgICAgYGNyZWF0ZS13b3JrdHJlZTogdW5leHBlY3RlZCBlcnJvciBpbiBsc3RhdDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih3b3JrdHJlZURpciwgZmlsZSk7XG4gICAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUoZmlsZSk7XG4gICAgICBpZiAocGFyZW50RGlyICE9PSAnLicpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBwYXJlbnREaXIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGNvbnN0IGNvZGUgPSAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlO1xuICAgICAgaWYgKGNvZGUgPT09ICdFRVhJU1QnIHx8IGNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIHN5bWxpbms6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGRpclJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChub25OZXN0ZWREaXJzLm1hcChjcmVhdGVEaXJTeW1saW5rKSk7XG4gIGNvbnN0IG5vbk5lc3RlZEZpbGVzID0gaWdub3JlZC5maWxlcy5maWx0ZXIoKGZpbGUpID0+ICFpc05lc3RlZFVuZGVyKGZpbGUsIGRpclNldCkpO1xuICBjb25zdCBmaWxlUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKG5vbk5lc3RlZEZpbGVzLm1hcChjcmVhdGVGaWxlU3ltbGluaykpO1xuXG4gIGNvbnN0IGRpckNvdW50ID0gZGlyUmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcbiAgY29uc3QgZmlsZUNvdW50ID0gZmlsZVJlc3VsdHMuZmlsdGVyKChyKSA9PiByKS5sZW5ndGg7XG5cbiAgcmV0dXJuIHsgZGlyQ291bnQsIGZpbGVDb3VudCB9O1xufVxuXG4vKipcbiAqIFJlcGxpY2F0ZXMgcm9vdC1sZXZlbCBzeW1saW5rcyBmcm9tIHRoZSBzb3VyY2UgY2hlY2tvdXQgaW50byB0aGUgd29ya3RyZWUuXG4gKlxuICogRXhpc3RpbmcgZGVzdGluYXRpb24gZW50cmllcyBhcmUgbGVmdCB1bnRvdWNoZWQuXG4gKlxuICogQHBhcmFtIHNvdXJjZVJvb3QgLSBTb3VyY2UgY2hlY2tvdXQgcm9vdC5cbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIERlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QuXG4gKiBAcmV0dXJucyBOdW1iZXIgb2Ygc3ltbGlua3MgY3JlYXRlZCBpbiB0aGUgZGVzdGluYXRpb24gcm9vdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvcHlFeGlzdGluZ1N5bWxpbmtzKHNvdXJjZVJvb3Q6IHN0cmluZywgd29ya3RyZWVEaXI6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZVJvb3QsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgY29uc3Qgc3ltbGlua3MgPSBlbnRyaWVzLmZpbHRlcigoZSkgPT4gZS5pc1N5bWJvbGljTGluaygpICYmIGUubmFtZSAhPT0gJy5naXQnICYmIGUubmFtZSAhPT0gJy53b3JrdHJlZXMnKTtcblxuICBjb25zdCBjb3B5U3ltbGluayA9IGFzeW5jIChuYW1lOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih3b3JrdHJlZURpciwgbmFtZSk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZzLmxzdGF0KGRlc3RQYXRoKTtcbiAgICAgIHJldHVybiBmYWxzZTsgLy8gRGVzdGluYXRpb24gYWxyZWFkeSBleGlzdHNcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBzb3VyY2VMaW5rUGF0aCA9IHBhdGguam9pbihzb3VyY2VSb290LCBuYW1lKTtcblxuICAgIC8vIFNraXAgc2VsZi1yZWZlcmVuY2luZyBzeW1saW5rcyAodGFyZ2V0IHJlc29sdmVzIGJhY2sgdG8gdGhlIHN5bWxpbmsgaXRzZWxmKVxuICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IGZzLnJlYWRsaW5rKHNvdXJjZUxpbmtQYXRoKTtcbiAgICBjb25zdCByZXNvbHZlZFRhcmdldCA9IHBhdGgucmVzb2x2ZShzb3VyY2VSb290LCB0YXJnZXQpO1xuICAgIGlmIChyZXNvbHZlZFRhcmdldCA9PT0gc291cmNlTGlua1BhdGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBhd2FpdCBmcy5zeW1saW5rKHNvdXJjZUxpbmtQYXRoLCBkZXN0UGF0aCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKHN5bWxpbmtzLm1hcCgoZSkgPT4gY29weVN5bWxpbmsoZS5uYW1lKSkpO1xuICByZXR1cm4gcmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcbn1cblxuaW50ZXJmYWNlIFJlcm91dGVOb2RlTW9kdWxlc09wdGlvbnMge1xuICBzb3VyY2VOb2RlTW9kdWxlczogc3RyaW5nO1xuICBkZXN0Tm9kZU1vZHVsZXM6IHN0cmluZztcbn1cblxuLyoqXG4gKiBNaXJyb3JzIGEgbm9kZV9tb2R1bGVzIHRyZWUgaW50byB0aGUgd29ya3RyZWUgdXNpbmcgc3ltbGlua3MuXG4gKlxuICogSW50ZXJuYWwgd29ya3NwYWNlIGxpbmtzIGtlZXAgdGhlaXIgb3JpZ2luYWwgcmVsYXRpdmUgdGFyZ2V0cyB3aGlsZSBleHRlcm5hbFxuICogbGlua3MgYW5kIG5vbi1saW5rIGVudHJpZXMgYXJlIHJlcHJlc2VudGVkIGFzIHN5bWxpbmtzIHRvIHNvdXJjZSBwYXRocy5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFNvdXJjZSBhbmQgZGVzdGluYXRpb24gbm9kZV9tb2R1bGVzIGRpcmVjdG9yaWVzLlxuICogQHJldHVybnMgQ291bnQgb2YgaW50ZXJuYWwgd29ya3NwYWNlIHN5bWxpbmtzIHJlY3JlYXRlZCBieSB0YXJnZXQgcGF0aC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VOb2RlTW9kdWxlcywgZGVzdE5vZGVNb2R1bGVzIH0gPSBvcHRzO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZnMubHN0YXQoc291cmNlTm9kZU1vZHVsZXMpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkZXN0U3RhdHMgPSBhd2FpdCBmcy5sc3RhdChkZXN0Tm9kZU1vZHVsZXMpO1xuICAgIGlmIChkZXN0U3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgYXdhaXQgZnMudW5saW5rKGRlc3ROb2RlTW9kdWxlcyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgZnMubWtkaXIoZGVzdE5vZGVNb2R1bGVzLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihzb3VyY2VOb2RlTW9kdWxlcywgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBjb25zdCBjb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbnRyaWVzLm1hcChhc3luYyAoZW50cnkpOiBQcm9taXNlPG51bWJlcj4gPT4ge1xuICAgICAgY29uc3Qgc291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VOb2RlTW9kdWxlcywgZW50cnkubmFtZSk7XG4gICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbihkZXN0Tm9kZU1vZHVsZXMsIGVudHJ5Lm5hbWUpO1xuXG4gICAgICBpZiAoZW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzb3VyY2VQYXRoKTtcbiAgICAgICAgaWYgKGlzSW50ZXJuYWxTeW1saW5rKHRhcmdldCkpIHtcbiAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHRhcmdldCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkgJiYgZW50cnkubmFtZS5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIoZGVzdFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBzY29wZUVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZVBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICAgICAgY29uc3Qgc2NvcGVDb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICBzY29wZUVudHJpZXMubWFwKGFzeW5jIChzY29wZUVudHJ5KTogUHJvbWlzZTxudW1iZXI+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNjb3BlU291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VQYXRoLCBzY29wZUVudHJ5Lm5hbWUpO1xuICAgICAgICAgICAgY29uc3Qgc2NvcGVEZXN0UGF0aCA9IHBhdGguam9pbihkZXN0UGF0aCwgc2NvcGVFbnRyeS5uYW1lKTtcblxuICAgICAgICAgICAgaWYgKHNjb3BlRW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzY29wZVNvdXJjZVBhdGgpO1xuICAgICAgICAgICAgICBpZiAoaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsodGFyZ2V0LCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHNjb3BlU291cmNlUGF0aCwgc2NvcGVEZXN0UGF0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc2NvcGVTb3VyY2VQYXRoLCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIHNjb3BlQ291bnRzLnJlZHVjZSgoc3VtLCBjKSA9PiBzdW0gKyBjLCAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICB9KVxuICApO1xuXG4gIHJldHVybiBjb3VudHMucmVkdWNlKChzdW0sIGMpID0+IHN1bSArIGMsIDApO1xufVxuXG5pbnRlcmZhY2UgUmVyb3V0ZUFsbE5vZGVNb2R1bGVzT3B0aW9ucyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbn1cblxuLyoqXG4gKiBSZXJvdXRlcyByb290IGFuZCBwZXItcGFja2FnZSBub2RlX21vZHVsZXMgZGlyZWN0b3JpZXMgaW50byB0aGUgd29ya3RyZWUuXG4gKlxuICogVGhlIG9wZXJhdGlvbiBpcyBza2lwcGVkIHdoZW4gdGhlIHJlcG9zaXRvcnkgaGFzIG5vIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIHJvb3QsIGRlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QsIGFuZCByZXBvIHJvb3QuXG4gKiBAcmV0dXJucyBUb3RhbCBudW1iZXIgb2YgcmVjcmVhdGVkIGludGVybmFsIHdvcmtzcGFjZSBzeW1saW5rcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVBbGxOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlQWxsTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgcmVwb1Jvb3QgfSA9IG9wdHM7XG5cbiAgbGV0IHBhY2thZ2VKc29uOiB7IHdvcmtzcGFjZXM/OiBzdHJpbmdbXSB9O1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VKc29uQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhdGguam9pbihyZXBvUm9vdCwgJ3BhY2thZ2UuanNvbicpLCAndXRmLTgnKTtcbiAgICBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25Db250ZW50KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIGlmICghcGFja2FnZUpzb24ud29ya3NwYWNlcykge1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgbGV0IHRvdGFsQ291bnQgPSAwO1xuXG4gIHRvdGFsQ291bnQgKz0gYXdhaXQgcmVyb3V0ZU5vZGVNb2R1bGVzKHtcbiAgICBzb3VyY2VOb2RlTW9kdWxlczogcGF0aC5qb2luKHNvdXJjZVJvb3QsICdub2RlX21vZHVsZXMnKSxcbiAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbih3b3JrdHJlZURpciwgJ25vZGVfbW9kdWxlcycpXG4gIH0pO1xuXG4gIGNvbnN0IHBhY2thZ2VzRGlyID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsICdwYWNrYWdlcycpO1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VFbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihwYWNrYWdlc0RpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcGFja2FnZUVudHJpZXMpIHtcbiAgICAgIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIGNvbnN0IHBrZ05vZGVNb2R1bGVzID0gcGF0aC5qb2luKHBhY2thZ2VzRGlyLCBlbnRyeS5uYW1lLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICAgIGxldCBub2RlTW9kdWxlc0V4aXN0cyA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IGZzLmxzdGF0KHBrZ05vZGVNb2R1bGVzKTtcbiAgICAgICAgICBub2RlTW9kdWxlc0V4aXN0cyA9IHRydWU7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGVNb2R1bGVzRXhpc3RzKSB7XG4gICAgICAgICAgY29uc3QgZGVzdFBhY2thZ2VEaXIgPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsICdwYWNrYWdlcycsIGVudHJ5Lm5hbWUpO1xuICAgICAgICAgIGF3YWl0IGZzLm1rZGlyKGRlc3RQYWNrYWdlRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICB0b3RhbENvdW50ICs9IGF3YWl0IHJlcm91dGVOb2RlTW9kdWxlcyh7XG4gICAgICAgICAgICBzb3VyY2VOb2RlTW9kdWxlczogcGtnTm9kZU1vZHVsZXMsXG4gICAgICAgICAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbihkZXN0UGFja2FnZURpciwgJ25vZGVfbW9kdWxlcycpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdG90YWxDb3VudDtcbn1cblxuaW50ZXJmYWNlIFVwZGF0ZUdpdEV4Y2x1ZGVPcHRpb25zIHtcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbiAgZGlyZWN0b3JpZXM6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogQXBwZW5kcyBzeW1saW5rZWQgaWdub3JlZCBwYXRocyB0byB0aGUgd29ya3RyZWUtc3BlY2lmaWMgZ2l0IGV4Y2x1ZGUgZmlsZS5cbiAqXG4gKiBBbHNvIGVuYWJsZXMgYGV4dGVuc2lvbnMud29ya3RyZWVDb25maWdgIGFuZCBzZXRzIHdvcmt0cmVlLWxvY2FsXG4gKiBgY29yZS5leGNsdWRlc0ZpbGVgIHNvIGdpdCBzdGF0dXMgaW4gdGhlIHdvcmt0cmVlIGlnbm9yZXMgaW5qZWN0ZWQgbGlua3MuXG4gKlxuICogQHBhcmFtIG9wdHMgLSBXb3JrdHJlZSBwYXRoLCByZXBvIHJvb3QsIGFuZCBpZ25vcmVkIHBhdGggY2FuZGlkYXRlcy5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlR2l0RXhjbHVkZShvcHRzOiBVcGRhdGVHaXRFeGNsdWRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IHdvcmt0cmVlRGlyLCByZXBvUm9vdCwgZGlyZWN0b3JpZXMsIGZpbGVzIH0gPSBvcHRzO1xuXG4gIGNvbnN0IHsgc3Rkb3V0OiBnaXREaXIgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCB3b3JrdHJlZURpciwgJ3Jldi1wYXJzZScsICctLWdpdC1kaXInXSwge1xuICAgIHRpbWVvdXQ6IDVfMDAwXG4gIH0pO1xuICBjb25zdCBleGNsdWRlUGF0aCA9IHBhdGguam9pbihnaXREaXIudHJpbSgpLCAnaW5mbycsICdleGNsdWRlJyk7XG4gIGF3YWl0IGZzLm1rZGlyKHBhdGguZGlybmFtZShleGNsdWRlUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gIGNvbnN0IGxpbmVzID0gWycjIFN5bWxpbmtzIGNyZWF0ZWQgYnkgaW5zdGFudC13b3JrdHJlZSddO1xuXG4gIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdG9yaWVzKSB7XG4gICAgaWYgKCFkaXIpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLmxzdGF0KHBhdGguam9pbih3b3JrdHJlZURpciwgZGlyKSk7XG4gICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkgbGluZXMucHVzaChkaXIpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgaWYgKCFmaWxlKSBjb250aW51ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChwYXRoLmpvaW4od29ya3RyZWVEaXIsIGZpbGUpKTtcbiAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSBsaW5lcy5wdXNoKGZpbGUpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgZnMuYXBwZW5kRmlsZShleGNsdWRlUGF0aCwgYCR7bGluZXMuam9pbignXFxuJyl9XFxuYCk7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJy1DJywgcmVwb1Jvb3QsICdjb25maWcnLCAnZXh0ZW5zaW9ucy53b3JrdHJlZUNvbmZpZycsICd0cnVlJ10sIHsgdGltZW91dDogNV8wMDAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICBgY3JlYXRlLXdvcmt0cmVlOiBmYWlsZWQgdG8gc2V0IHdvcmt0cmVlQ29uZmlnIGV4dGVuc2lvbjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICk7XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCB3b3JrdHJlZURpciwgJ2NvbmZpZycsICctLXdvcmt0cmVlJywgJ2NvcmUuZXhjbHVkZXNGaWxlJywgZXhjbHVkZVBhdGhdLCB7XG4gICAgICB0aW1lb3V0OiA1XzAwMFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgYGNyZWF0ZS13b3JrdHJlZTogZmFpbGVkIHRvIHNldCBjb3JlLmV4Y2x1ZGVzRmlsZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICk7XG4gIH1cbn1cbiIsICJcbmltcG9ydCBoYW5kbGVyIGZyb20gJy4vbGF1bmNoLnRzJztcbmltcG9ydCB7IGV4ZWN1dGVDb21tYW5kIH0gZnJvbSAnLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvcnVudGltZS50cyc7XG5cbmV4ZWN1dGVDb21tYW5kKGhhbmRsZXIpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUFpQkEsU0FBNEIsYUFBYTtBQUN6QyxTQUFTLGtCQUFrQjs7O0FDWXBCLElBQU0sV0FBTixjQUF1QixNQUFNO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVFs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LFNBQVM7QUFBQSxJQUN0QixDQUFDO0FBRUQsWUFBUSxzQkFBc0IsTUFBTTtBQUNsQyxjQUFRLE9BQU8sS0FBSyxpQ0FBaUMsRUFBRSxVQUFVLENBQUM7QUFDbEUsWUFBTSxLQUFLLFNBQVM7QUFDcEIsYUFBTyxFQUFFLFVBQVU7QUFBQSxJQUNyQixDQUFDO0FBR0QsUUFBSSxDQUFDLGVBQWU7QUFDbEIsWUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFVBQWtCO0FBQzFDLGNBQU0sT0FBTyxNQUFNLFNBQVMsRUFBRSxLQUFLO0FBQ25DLFlBQUksTUFBTTtBQUNSLGtCQUFRLE9BQU8sS0FBSyxJQUFJO0FBQUEsUUFDMUI7QUFBQSxNQUNGLENBQUM7QUFBQSxJQUNIO0FBRUEsVUFBTSxXQUFXLE1BQU0sSUFBSSxRQUF1QixDQUFDQyxhQUFZO0FBQzdELFlBQU0sR0FBRyxTQUFTQSxRQUFPO0FBQUEsSUFDM0IsQ0FBQztBQUVELFlBQVEsT0FBTyxLQUFLLDJCQUEyQixFQUFFLFdBQVcsU0FBUyxDQUFDO0FBR3RFLFFBQUk7QUFDRixZQUFNLHNCQUFzQixPQUFPLFFBQVEsWUFBWSxRQUFRLE1BQU07QUFBQSxJQUN2RSxTQUFTLE9BQU87QUFDZCxjQUFRLE9BQU8sS0FBSyx5QkFBeUI7QUFBQSxRQUMzQyxPQUFPLGFBQWEsS0FBSztBQUFBLE1BQzNCLENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDRjtBQUNGOzs7QVc1SEEsZUFBZSxjQUFPOyIsCiAgIm5hbWVzIjogWyJwYXRoIiwgInJlc29sdmUiLCAiZXhlY0ZpbGUiLCAiZnMiLCAicGF0aCIsICJwcm9taXNpZnkiLCAiZXhlY0ZpbGVBc3luYyIsICJwcm9taXNpZnkiLCAiZXhlY0ZpbGUiLCAibG9nZ2VyIiwgInJlc29sdmUiXQp9Cg==
