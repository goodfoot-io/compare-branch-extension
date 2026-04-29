// src/client/types/errors.ts
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

// src/client/cardsClient.ts
var INITIAL_TIMEOUT_MS = 3e3;
var MAX_TIMEOUT_MS = 1e4;
var MAX_TIMEOUT_RETRIES = 2;
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
   * Replaces the access token used for subsequent API requests.
   *
   * @param token - The new access token to use for authentication.
   */
  updateAccessToken(token) {
    this.options = { ...this.options, accessToken: token };
  }
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
   * Each fetch call includes an AbortSignal.timeout that starts at 3 seconds
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
  buildUrl(path, params) {
    const url = new URL(path, this.options.baseUrl);
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
    let lastTimeoutError;
    for (let attempt = 0; attempt <= MAX_TIMEOUT_RETRIES; attempt++) {
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
          lastTimeoutError = new NetworkError("Request timed out", error);
          continue;
        }
        throw new NetworkError("Request failed", error instanceof Error ? error : void 0);
      }
    }
    throw lastTimeoutError;
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
    const urlStr = this.buildUrl("/cards", {
      workspacePath: this.options.workspacePath,
      status: options?.status,
      search: options?.search,
      limit: options?.limit,
      offset: options?.offset
    });
    const url = new URL(urlStr);
    for (const t of options?.tags ?? []) {
      url.searchParams.append("tag", t);
    }
    return this.request(() => this.getHttpClient().get(url.toString()));
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
  async listCardSummaries() {
    const url = this.buildUrl("/cards/list", {
      workspacePath: this.options.workspacePath
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
    const url = this.buildUrl(`/cards/${cardId}`, {
      workspacePath: this.options.workspacePath
    });
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
  async putFile(cardId, filePath, content) {
    const url = this.buildUrl(`/cards/${cardId}/fs/${filePath}`);
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
   * @param options - Optional parameters.
   * @param options.sessionId - Claude Code session ID forwarded as `X-Cards-Session-Id` header so the card repo post-commit hook can attribute the commit.
   * @returns Promise resolving when removal is complete.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   */
  async removeCommit(cardId, sha, options) {
    const url = this.buildUrl(`/cards/${cardId}/commits/${sha}`);
    const headers = {};
    if (options?.sessionId) {
      headers["X-Cards-Session-Id"] = options.sessionId;
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
   * @param options - Optional parameters.
   * @param options.sessionId - Claude Code session ID forwarded as `X-Cards-Session-Id` header so the card repo post-commit hook can attribute the commit.
   * @returns Promise resolving when the branch is added.
   */
  async addBranch(cardId, data, options) {
    const url = this.buildUrl(`/cards/${cardId}/branches`);
    const headers = {};
    if (options?.sessionId) {
      headers["X-Cards-Session-Id"] = options.sessionId;
    }
    await this.request(() => this.getHttpClient().post(url, data, { headers }));
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
  async removeBranch(cardId, name, options) {
    const url = this.buildUrl(`/cards/${cardId}/branches/${encodeURIComponent(name)}`);
    const headers = {};
    if (options?.sessionId) {
      headers["X-Cards-Session-Id"] = options.sessionId;
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
    let earlyError = null;
    responsePromise.then((response) => {
      if (!response.ok) {
        earlyError = new ApiError(response.statusText, String(response.status));
      }
    }).catch((err) => {
      earlyError = err instanceof Error ? err : new Error(String(err));
    });
    return {
      write(line) {
        if (earlyError) throw earlyError;
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
  async executeAction(cardId, actionName) {
    const url = this.buildUrl(`/cards/${cardId}/actions/${encodeURIComponent(actionName)}`);
    return this.request(() => this.getHttpClient().post(url, void 0));
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

// src/client/api-discovery.ts
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
async function discoverApiInfo(logger) {
  if (process.env["API_TEST_MODE"] === "1") {
    logger?.debug("API_TEST_MODE: Using mock API info");
    return {
      host: "localhost",
      port: 9999,
      pid: 99999,
      accessToken: "test-token",
      startedAt: "2024-01-01T00:00:00Z"
    };
  }
  const configPath = process.env["CARDS_DISCOVERY_PATH"] ?? join(homedir(), ".cards", "cards-api.json");
  try {
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content);
    if (typeof config["host"] !== "string" || typeof config["port"] !== "number" || typeof config["accessToken"] !== "string" || typeof config["pid"] !== "number" || typeof config["startedAt"] !== "string") {
      logger?.debug("API info discovery failed", { error: "Config missing required fields" });
      return null;
    }
    return {
      host: config["host"],
      port: config["port"],
      accessToken: config["accessToken"],
      pid: config["pid"],
      startedAt: config["startedAt"],
      sessionBaseline: config["sessionBaseline"]
    };
  } catch (error) {
    logger?.debug("API info discovery failed", { error: String(error) });
    return null;
  }
}

// src/bin/cards-extension/attribution.ts
var ATTRIBUTION_HELP = `Usage: cards-extension attribution <command>

Manage the Cards API attribution/comparison state.

Commands:
  set              Set comparison from JSON on stdin
  get              Get current comparison state
  clear            Clear the active comparison

Set:
  Pipe a JSON object to stdin. Three request shapes are supported:
    Branch range:       { "baseRef": "main", "compareRef": "feature/x" }
    Dynamic worktree:   { "baseRef": "main", "repositoryPath": "/path/to/repo" }
    Fixed attribution:  { "compareRef": "feature/x", "attributionShas": ["abc..."] }

Get:
  Prints the current compare state as JSON, or "No active comparison" if none.

Clear:
  Removes the active comparison.`;
async function connectClient() {
  const info = await discoverApiInfo();
  if (!info) {
    throw new Error("API discovery failed \u2014 is the cards server running?");
  }
  return new CardsClient({
    baseUrl: `http://${info.host}:${info.port}`,
    accessToken: info.accessToken
  });
}
function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
  });
}
function parseCompareInput(raw) {
  if (!raw.trim()) {
    throw new Error("expected JSON on stdin");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("invalid JSON on stdin");
  }
}
async function setAttribution() {
  const raw = await readStdin();
  const request = parseCompareInput(raw);
  const client = await connectClient();
  const state = await client.setCompare(request);
  console.log(JSON.stringify(state, null, 2));
  return 0;
}
async function getAttribution() {
  const client = await connectClient();
  const state = await client.getCompare();
  if (!state) {
    console.log("No active comparison");
    return 0;
  }
  console.log(JSON.stringify(state, null, 2));
  return 0;
}
async function clearAttribution() {
  const client = await connectClient();
  await client.clearCompare();
  console.log(JSON.stringify({ success: true }));
  return 0;
}
async function runAttribution(args) {
  if (args.includes("-h") || args.includes("--help")) {
    console.log(ATTRIBUTION_HELP);
    return 0;
  }
  const [command] = args;
  if (!command) {
    console.error(ATTRIBUTION_HELP);
    return 1;
  }
  try {
    switch (command) {
      case "set":
        return await setAttribution();
      case "get":
        return await getAttribution();
      case "clear":
        return await clearAttribution();
      default:
        console.error(`cards-extension attribution: unknown command "${command}"`);
        console.error(ATTRIBUTION_HELP);
        return 1;
    }
  } catch (error) {
    console.error("cards-extension attribution:", error instanceof Error ? error.message : String(error));
    return 1;
  }
}

// src/bin/cards-extension/utils.ts
import { execFile as execFileCb } from "node:child_process";
import * as util from "node:util";
var execFile = util.promisify(execFileCb);
function getFlagValue(args, flag) {
  const eqPrefix = `${flag}=`;
  const eqArg = args.find((a) => a.startsWith(eqPrefix));
  if (eqArg !== void 0) {
    return eqArg.slice(eqPrefix.length);
  }
  const idx = args.indexOf(flag);
  if (idx === -1) return void 0;
  const next = args[idx + 1];
  if (next === void 0 || next.startsWith("--")) {
    throw new Error(`flag ${flag} requires a value`);
  }
  return next;
}
function hasBooleanFlag(args, flag) {
  return args.includes(flag);
}
function getBooleanFlagValue(args, flag) {
  const eqPrefix = `${flag}=`;
  const eq = args.find((a) => a.startsWith(eqPrefix));
  if (eq !== void 0) {
    const v = eq.slice(eqPrefix.length).toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
    throw new Error(`flag ${flag} requires true|false (got ${v})`);
  }
  const idx = args.indexOf(flag);
  if (idx === -1) return void 0;
  const next = args[idx + 1];
  if (next === "true") return true;
  if (next === "false") return false;
  return true;
}
async function resolveWorkspacePath(args) {
  const explicit = getFlagValue(args, "--workspace");
  if (explicit !== void 0) return explicit;
  try {
    const { stdout } = await execFile("git", ["rev-parse", "--show-toplevel"]);
    return stdout.trim();
  } catch (error) {
    throw new Error(
      `Could not determine workspace path from git. Use --workspace <path> to specify it explicitly. (${error instanceof Error ? error.message : String(error)})`
    );
  }
}
function buildFetchOptions(accessToken, method, body) {
  const headers = {
    Authorization: `Bearer ${accessToken}`
  };
  if (body !== void 0) {
    headers["Content-Type"] = "application/json";
  }
  return {
    method,
    headers,
    ...body !== void 0 ? { body: JSON.stringify(body) } : {}
  };
}
async function handleErrorResponse(res, workspacePath) {
  if (res.ok) return null;
  if (res.status === 404) {
    const which = workspacePath ? ` "${workspacePath}"` : "";
    return `workspace not registered${which} with the active VS Code window. Run "cards-extension workspace list" to see registered paths exactly, then start VS Code with the Cards extension and open the workspace if needed.`;
  }
  let detail = "";
  try {
    const body = await res.json();
    detail = body.error ?? "";
  } catch {
    detail = await res.text().catch(() => "");
  }
  if (res.status === 422 && detail) {
    return detail;
  }
  return `server responded with ${res.status}${detail ? `: ${detail}` : ""}`;
}

// src/bin/cards-extension/debug.ts
async function runDebug(args) {
  const [subcommand, ...rest] = args;
  if (subcommand === "start") return runDebugStart(rest);
  if (subcommand === "stop") return runDebugStop(rest);
  if (subcommand === "state") return runDebugState(rest);
  console.error(`cards-extension debug: unknown subcommand "${subcommand ?? ""}". Use: start, stop, state`);
  return 1;
}
async function runDebugStart(args) {
  let configName;
  let workspacePath;
  try {
    configName = getFlagValue(args, "--config");
    workspacePath = await resolveWorkspacePath(args);
  } catch (error) {
    console.error(`cards-extension debug start: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const info = await discoverApiInfo();
  if (!info) {
    console.error("API discovery failed \u2014 is the Cards extension running in VS Code?");
    return 1;
  }
  const url = `http://${info.host}:${info.port}/debug/start?workspacePath=${encodeURIComponent(workspacePath)}`;
  const body = {};
  if (configName !== void 0) body["configName"] = configName;
  const res = await fetch(url, buildFetchOptions(info.accessToken, "POST", body));
  const errMsg = await handleErrorResponse(res, workspacePath);
  if (errMsg) {
    console.error(`cards-extension debug start: ${errMsg}`);
    return 1;
  }
  return 0;
}
async function runDebugStop(args) {
  let workspacePath;
  try {
    workspacePath = await resolveWorkspacePath(args);
  } catch (error) {
    console.error(`cards-extension debug stop: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const info = await discoverApiInfo();
  if (!info) {
    console.error("API discovery failed \u2014 is the Cards extension running in VS Code?");
    return 1;
  }
  const url = `http://${info.host}:${info.port}/debug/stop?workspacePath=${encodeURIComponent(workspacePath)}`;
  const res = await fetch(url, buildFetchOptions(info.accessToken, "POST", {}));
  const errMsg = await handleErrorResponse(res, workspacePath);
  if (errMsg) {
    console.error(`cards-extension debug stop: ${errMsg}`);
    return 1;
  }
  const body = await res.json();
  console.log(JSON.stringify(body));
  return 0;
}
async function runDebugState(args) {
  let workspacePath;
  try {
    workspacePath = await resolveWorkspacePath(args);
  } catch (error) {
    console.error(`cards-extension debug state: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const info = await discoverApiInfo();
  if (!info) {
    console.error("API discovery failed \u2014 is the Cards extension running in VS Code?");
    return 1;
  }
  const url = `http://${info.host}:${info.port}/debug/state?workspacePath=${encodeURIComponent(workspacePath)}`;
  const res = await fetch(url, buildFetchOptions(info.accessToken, "GET"));
  const errMsg = await handleErrorResponse(res, workspacePath);
  if (errMsg) {
    console.error(`cards-extension debug state: ${errMsg}`);
    return 1;
  }
  const body = await res.json();
  console.log(JSON.stringify(body));
  return 0;
}

// src/bin/cards-extension/editor.ts
async function runEditor(args) {
  const [subcommand, ...rest] = args;
  if (subcommand === "info") {
    return runEditorInfo(rest);
  }
  if (subcommand === "open") {
    return runEditorOpen(rest);
  }
  if (subcommand === "select") {
    return runEditorSelect(rest);
  }
  console.error(`cards-extension editor: unknown subcommand "${subcommand ?? ""}". Use: info, open, select`);
  return 1;
}
async function runEditorInfo(args) {
  let workspacePath;
  try {
    workspacePath = await resolveWorkspacePath(args);
  } catch (error) {
    console.error(`cards-extension editor info: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const info = await discoverApiInfo();
  if (!info) {
    console.error("API discovery failed \u2014 is the Cards extension running in VS Code?");
    return 1;
  }
  const url = `http://${info.host}:${info.port}/editor?workspacePath=${encodeURIComponent(workspacePath)}`;
  const res = await fetch(url, buildFetchOptions(info.accessToken, "GET"));
  const errMsg = await handleErrorResponse(res, workspacePath);
  if (errMsg) {
    console.error(`cards-extension editor info: ${errMsg}`);
    return 1;
  }
  const body = await res.json();
  console.log(JSON.stringify(body));
  return 0;
}
async function runEditorOpen(args) {
  const [filePath, ...rest] = args;
  if (!filePath) {
    console.error("cards-extension editor open: filePath is required");
    return 1;
  }
  let workspacePath;
  let lineStr;
  let charStr;
  let preview;
  let focus;
  try {
    workspacePath = await resolveWorkspacePath(rest);
    lineStr = getFlagValue(rest, "--line");
    charStr = getFlagValue(rest, "--character");
    preview = hasBooleanFlag(rest, "--preview") ? true : void 0;
    focus = getBooleanFlagValue(rest, "--focus");
  } catch (error) {
    console.error(`cards-extension editor open: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const line = lineStr !== void 0 ? parseInt(lineStr, 10) : void 0;
  const character = charStr !== void 0 ? parseInt(charStr, 10) : void 0;
  if (line !== void 0 && Number.isNaN(line)) {
    console.error("cards-extension editor open: --line must be a number");
    return 1;
  }
  if (character !== void 0 && Number.isNaN(character)) {
    console.error("cards-extension editor open: --character must be a number");
    return 1;
  }
  const info = await discoverApiInfo();
  if (!info) {
    console.error("API discovery failed \u2014 is the Cards extension running in VS Code?");
    return 1;
  }
  const url = `http://${info.host}:${info.port}/editor/open?workspacePath=${encodeURIComponent(workspacePath)}`;
  const body = { filePath };
  if (line !== void 0) body["line"] = line;
  if (character !== void 0) body["character"] = character;
  if (preview !== void 0) body["preview"] = preview;
  if (focus !== void 0) body["focus"] = focus;
  const res = await fetch(url, buildFetchOptions(info.accessToken, "POST", body));
  const errMsg = await handleErrorResponse(res, workspacePath);
  if (errMsg) {
    console.error(`cards-extension editor open: ${errMsg}`);
    return 1;
  }
  return 0;
}
async function runEditorSelect(args) {
  const [filePath, ...rest] = args;
  if (!filePath) {
    console.error("cards-extension editor select: filePath is required");
    return 1;
  }
  let workspacePath;
  let startStr;
  let endStr;
  try {
    workspacePath = await resolveWorkspacePath(rest);
    startStr = getFlagValue(rest, "--start");
    endStr = getFlagValue(rest, "--end");
  } catch (error) {
    console.error(`cards-extension editor select: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const parseLC = (val) => {
    if (!val) return null;
    const [l, c] = val.split(":");
    const line = parseInt(l ?? "", 10);
    const column = parseInt(c ?? "", 10);
    if (Number.isNaN(line) || Number.isNaN(column)) return null;
    return { line, column };
  };
  const start = parseLC(startStr);
  const end = parseLC(endStr);
  if (!start || !end) {
    console.error("cards-extension editor select: --start L:C and --end L:C are required");
    return 1;
  }
  const info = await discoverApiInfo();
  if (!info) {
    console.error("API discovery failed \u2014 is the Cards extension running in VS Code?");
    return 1;
  }
  const url = `http://${info.host}:${info.port}/editor/select?workspacePath=${encodeURIComponent(workspacePath)}`;
  const body = {
    filePath,
    startLine: start.line,
    startColumn: start.column,
    endLine: end.line,
    endColumn: end.column
  };
  const res = await fetch(url, buildFetchOptions(info.accessToken, "POST", body));
  const errMsg = await handleErrorResponse(res, workspacePath);
  if (errMsg) {
    console.error(`cards-extension editor select: ${errMsg}`);
    return 1;
  }
  return 0;
}

// src/bin/cards-extension/execute-command.ts
async function runExecuteCommand(args) {
  const [command, ...rest] = args;
  if (!command) {
    console.error("cards-extension execute-command: command is required");
    return 1;
  }
  const saveAll = hasBooleanFlag(rest, "--save");
  let stdinArgs = [];
  if (!process.stdin.isTTY) {
    const stdinData = await readStdin2();
    if (stdinData.trim() !== "") {
      let parsed;
      try {
        parsed = JSON.parse(stdinData);
      } catch (error) {
        console.error(
          `cards-extension execute-command: failed to parse JSON from stdin: ${error instanceof Error ? error.message : String(error)}`
        );
        return 1;
      }
      if (!Array.isArray(parsed)) {
        console.error("cards-extension execute-command: stdin must be a JSON array of arguments");
        return 1;
      }
      stdinArgs = parsed;
    }
  }
  let workspacePath;
  try {
    workspacePath = await resolveWorkspacePath(rest);
  } catch (error) {
    console.error(`cards-extension execute-command: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const info = await discoverApiInfo();
  if (!info) {
    console.error("API discovery failed \u2014 is the Cards extension running in VS Code?");
    return 1;
  }
  const url = `http://${info.host}:${info.port}/execute-command?workspacePath=${encodeURIComponent(workspacePath)}`;
  const body = { command, args: stdinArgs };
  if (saveAll) body["saveAll"] = true;
  const res = await fetch(url, buildFetchOptions(info.accessToken, "POST", body));
  const errMsg = await handleErrorResponse(res, workspacePath);
  if (errMsg) {
    console.error(`cards-extension execute-command: ${errMsg}`);
    return 1;
  }
  const envelope = await res.json();
  if (envelope.lossyCoercion) {
    console.error("Warning: lossyCoercion \u2014 result contains values that could not be serialized exactly");
  }
  console.log(JSON.stringify(envelope.result));
  return 0;
}
function readStdin2() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
  });
}

// src/bin/cards-extension/notify.ts
var VALID_TYPES = ["error", "warning", "info"];
var NOTIFY_HELP = `Usage: cards-extension notify --type <type> --title <title> --message <message> --source <source>

Send a notification to the Cards VSCode extension.

Required:
  --type <type>        Severity: error, warning, or info
  --title <title>      Short title shown in the notification
  --message <message>  Detailed notification body
  --source <source>    Identifier for grouping/filtering (e.g. agent name)`;
function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = args[++i];
    if (value === void 0) {
      throw new Error(`flag ${arg} requires a value`);
    }
    flags[key] = value;
  }
  return flags;
}
async function sendNotification(args) {
  const flags = parseFlags(args);
  const type = flags["type"];
  const title = flags["title"];
  const message = flags["message"];
  const source = flags["source"];
  if (!type) throw new Error("missing required flag --type");
  if (!title) throw new Error("missing required flag --title");
  if (!message) throw new Error("missing required flag --message");
  if (!source) throw new Error("missing required flag --source");
  if (!VALID_TYPES.includes(type)) {
    throw new Error(`invalid --type "${type}" \u2014 must be one of: ${VALID_TYPES.join(", ")}`);
  }
  const info = await discoverApiInfo();
  if (!info) {
    throw new Error("API discovery failed \u2014 is the cards server running?");
  }
  const url = `http://${info.host}:${info.port}/api/notifications`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${info.accessToken}`
    },
    body: JSON.stringify({ type, title, message, source })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`server responded with ${response.status}: ${body}`);
  }
  const result = await response.json();
  console.log(JSON.stringify(result));
  return 0;
}
async function runNotify(args) {
  if (args.includes("-h") || args.includes("--help")) {
    console.log(NOTIFY_HELP);
    return 0;
  }
  try {
    return await sendNotification(args);
  } catch (error) {
    console.error("cards-extension notify:", error instanceof Error ? error.message : String(error));
    return 1;
  }
}

// src/bin/cards-extension/panel.ts
var VALID_PANELS = /* @__PURE__ */ new Set(["problems", "terminal", "debug", "output"]);
async function runPanel(args) {
  const [subcommand, panelName, ...rest] = args;
  if (subcommand === "show") {
    return runPanelShow(panelName, rest);
  }
  console.error(`cards-extension panel: unknown subcommand "${subcommand ?? ""}". Use: show`);
  return 1;
}
async function runPanelShow(panel, args) {
  if (!panel || !VALID_PANELS.has(panel)) {
    console.error(
      `cards-extension panel show: unknown or missing panel name "${panel ?? ""}". Valid panels: ${[...VALID_PANELS].join(", ")}`
    );
    return 1;
  }
  let workspacePath;
  try {
    workspacePath = await resolveWorkspacePath(args);
  } catch (error) {
    console.error(`cards-extension panel show: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const info = await discoverApiInfo();
  if (!info) {
    console.error("API discovery failed \u2014 is the Cards extension running in VS Code?");
    return 1;
  }
  const url = `http://${info.host}:${info.port}/panel/show?workspacePath=${encodeURIComponent(workspacePath)}`;
  const res = await fetch(url, buildFetchOptions(info.accessToken, "POST", { panel }));
  const errMsg = await handleErrorResponse(res, workspacePath);
  if (errMsg) {
    console.error(`cards-extension panel show: ${errMsg}`);
    return 1;
  }
  return 0;
}

// src/bin/cards-extension/workspace.ts
async function runWorkspace(args) {
  const [subcommand] = args;
  if (subcommand === "list") {
    return runWorkspaceList();
  }
  console.error(`cards-extension workspace: unknown subcommand "${subcommand ?? ""}". Use: list`);
  return 1;
}
async function runWorkspaceList() {
  const info = await discoverApiInfo();
  if (!info) {
    console.error("API discovery failed \u2014 is the Cards extension running in VS Code?");
    return 1;
  }
  const url = `http://${info.host}:${info.port}/workspaces`;
  const res = await fetch(url, buildFetchOptions(info.accessToken, "GET"));
  const errMsg = await handleErrorResponse(res);
  if (errMsg) {
    console.error(`cards-extension workspace list: ${errMsg}`);
    return 1;
  }
  const body = await res.json();
  console.log(JSON.stringify(body.workspaces));
  return 0;
}

// src/bin/cards-extension.ts
var HELP = `Usage: cards-extension <subcommand> [options]

Cards VSCode extension CLI.

Subcommands:
  attribution <set|get|clear>    Manage the attribution/comparison state
  notify --type ... --title ... --message ... --source ...
                                 Send a notification to the VSCode UI
  workspace <list>               List workspaces registered with VS Code
  editor <info|open|select>      Inspect or control the active editor
  execute-command <commandId>    Execute a VS Code command
  panel <show>                   Show a VS Code panel
  debug <start|stop|state>       Control the VS Code debugger

Options:
  -h, --help                     Show this help text

Examples:
  cards-extension attribution set <<'EOF'
  { "baseRef": "main", "compareRef": "feature/x" }
  EOF
  cards-extension attribution get
  cards-extension attribution clear
  cards-extension notify --type info --title "Built" --message "All tests pass" --source agent
  cards-extension workspace list
  cards-extension editor info --workspace /path/to/workspace
  cards-extension editor open src/auth.ts --line 42
  cards-extension editor select src/index.ts --start 10:0 --end 15:20
  cards-extension execute-command editor.action.formatDocument
  cards-extension panel show problems
  cards-extension debug start --config "My Config"
  cards-extension debug stop
  cards-extension debug state

Run 'cards-extension <subcommand> --help' for subcommand help.`;
async function main(argv) {
  const [sub, ...rest] = argv;
  if (!sub) {
    console.error(HELP);
    return 1;
  }
  if (sub === "-h" || sub === "--help") {
    console.log(HELP);
    return 0;
  }
  try {
    if (sub === "attribution") return await runAttribution(rest);
    if (sub === "notify") return await runNotify(rest);
    if (sub === "workspace") return await runWorkspace(rest);
    if (sub === "editor") return await runEditor(rest);
    if (sub === "execute-command") return await runExecuteCommand(rest);
    if (sub === "panel") return await runPanel(rest);
    if (sub === "debug") return await runDebug(rest);
    console.error(`cards-extension: unknown command "${sub}"`);
    console.error(HELP);
    return 1;
  } catch (error) {
    console.error("cards-extension:", error instanceof Error ? error.message : String(error));
    return 1;
  }
}
if (process.argv[1]?.endsWith("cards-extension.mjs")) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
export {
  main
};
