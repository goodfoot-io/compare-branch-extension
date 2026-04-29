#!/usr/bin/env -S node --enable-source-maps
import { createRequire as __createRequire } from "node:module";
import { fileURLToPath as __fileURLToPath } from "node:url";
import { dirname as __pathDirname } from "node:path";
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
process.env['CLAUDE_CODE_HOOKS_LOG_ENV_VAR'] = "CLAUDE_CODE_RUNTIME_HOOKS_LOG_FILE";

// src/subagent-stop.ts
import { readFile as readFile2 } from "node:fs/promises";

// ../sdk/src/client/api-discovery.ts
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

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

// ../sdk/src/client/api-discovery.ts
async function discoverApiInfo(logger2) {
  if (process.env["API_TEST_MODE"] === "1") {
    logger2?.debug("API_TEST_MODE: Using mock API info");
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
      logger2?.debug("API info discovery failed", { error: "Config missing required fields" });
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
    logger2?.debug("API info discovery failed", { error: String(error) });
    return null;
  }
}
async function createCardsClient(logger2) {
  const info = await discoverApiInfo(logger2);
  if (!info) return null;
  return new CardsClient({
    baseUrl: `http://${info.host}:${info.port}`,
    accessToken: info.accessToken
  });
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
   * Configured coding agent identifier from cards.codingAgent setting.
   * Available in actions only (not type hooks).
   * Optional.
   */
  CODING_AGENT: "CODING_AGENT",
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
   * Set by the action handler (e.g., launch.ts) to the worktree path.
   * Available in hooks running inside the claude CLI.
   */
  WORKSPACE_PATH: "WORKSPACE_PATH",
  /**
   * Absolute path to the main git repository root (NOT a worktree).
   * Set by ActionDispatcher; consumed by the wrapper and watcher for
   * git operations (worktree removal, branch deletion) that must run
   * against the main repository.
   */
  REPO_ROOT: "REPO_ROOT",
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
   * Absolute path to the Claude Code transcript JSONL file for the current
   * session. Persisted by the session-start hook via `persistEnvVar`.
   *
   * Available in Bash tool shell descendants after session start. Read by
   * attach-mode watcher spawn to target the correct transcript file.
   */
  CARDS_TRANSCRIPT_PATH: "CARDS_TRANSCRIPT_PATH",
  /**
   * Absolute path to the VS Code extension installation directory.
   *
   * Set by the extension host from `context.extensionUri.fsPath` and injected
   * into all spawned action processes. Use this to locate bundled assets such
   * as the runtime plugin directory (`<extensionPath>/dist/claude/runtime`).
   *
   * Available in actions only (not type hooks).
   */
  EXTENSION_PATH: "EXTENSION_PATH",
  /**
   * Stable symlink path to the marketplace directory inside global storage.
   *
   * Set by ActionDispatcher at runtime from the symlink created during extension
   * activation. This path does not change across extension upgrades, unlike the
   * versioned extension installation path.
   *
   * Available in actions only (not type hooks).
   */
  MARKETPLACE_PATH: "MARKETPLACE_PATH",
  /**
   * Absolute path to the Cards hooks log file.
   *
   * Set by ActionDispatcher at runtime. Read by the Logger singleton
   * at construction time to determine where hook execution logs are written.
   *
   * Available in all actions and type hooks.
   */
  HOOKS_LOG_FILE: "CARDS_HOOKS_LOG_FILE"
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
function getCodingAgent() {
  const value = process.env[CARDS_ENV_VARS.CODING_AGENT];
  if (value === void 0 || value === "") {
    return void 0;
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
function getRepoRoot() {
  const value = process.env[CARDS_ENV_VARS.REPO_ROOT];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.REPO_ROOT}`);
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
function getMarketplacePath() {
  const value = process.env[CARDS_ENV_VARS.MARKETPLACE_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.MARKETPLACE_PATH}`);
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
    codingAgent: getCodingAgent(),
    switchToInteractiveData: readSwitchToInteractiveData(),
    repoRoot: getRepoRoot(),
    cardRepoPath: getCardRepoPath(),
    configPath: getConfigPath(),
    extensionPath: getExtensionPath(),
    marketplacePath: getMarketplacePath()
  };
}

// ../../../../../../../../../../../workspace/node_modules/@goodfoot/claude-code-hooks/dist/env.js
import * as fs from "node:fs";
var CLAUDE_ENV_VARS = {
  /**
   * Absolute path to the project root directory where Claude Code was started.
   * Available in all hooks.
   */
  PROJECT_DIR: "CLAUDE_PROJECT_DIR",
  /**
   * Path to a file where SessionStart hooks can persist environment variables.
   * Variables written to this file will be available in all subsequent bash commands.
   * Only available in SessionStart hooks.
   */
  ENV_FILE: "CLAUDE_ENV_FILE",
  /**
   * Set to "true" when running in a remote (web) environment.
   * Not set or empty when running in local CLI environment.
   */
  REMOTE: "CLAUDE_CODE_REMOTE"
};
function getEnvFilePath() {
  return process.env[CLAUDE_ENV_VARS.ENV_FILE];
}
function persistEnvVar(name, value) {
  const envFile = getEnvFilePath();
  if (envFile === void 0) {
    throw new Error("persistEnvVar can only be used in SessionStart hooks. CLAUDE_ENV_FILE environment variable is not set.");
  }
  const escapedValue = escapeShellValue(value);
  const exportStatement = `export ${name}=${escapedValue}
`;
  fs.appendFileSync(envFile, exportStatement, "utf-8");
}
function persistEnvVars(vars) {
  for (const [name, value] of Object.entries(vars)) {
    persistEnvVar(name, value);
  }
}
function escapeShellValue(value) {
  const escaped = value.replace(/'/g, "'\\''");
  return `'${escaped}'`;
}

// ../../../../../../../../../../../workspace/node_modules/@goodfoot/claude-code-hooks/dist/hooks.js
function createHookFunction(hookEventName, config, handler) {
  const hookFn = async (input, context) => {
    return await handler(input, context);
  };
  hookFn.hookEventName = hookEventName;
  hookFn.matcher = config.matcher;
  hookFn.timeout = config.timeout;
  return hookFn;
}
function subagentStopHook(config, handler) {
  return createHookFunction("SubagentStop", config, handler);
}

// ../../../../../../../../../../../workspace/node_modules/@goodfoot/claude-code-hooks/dist/logger.js
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
   * import { logger } from '@goodfoot/claude-code-hooks';
   *
   * // Or create custom instance
   * const customLogger = new Logger({ logFilePath: '/var/log/hooks.log' });
   * ```
   */
  constructor(config = {}) {
    for (const level of LOG_LEVELS) {
      this.handlers.set(level, /* @__PURE__ */ new Set());
    }
    this.logFilePath = config.logFilePath ?? (config.logEnvVar ? process.env[config.logEnvVar] : void 0) ?? null;
  }
  /**
   * Logs a debug message.
   *
   * Use for detailed debugging information that is typically only useful
   * during development or troubleshooting.
   * @param message - The debug message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.debug('Processing tool input', { toolName: 'Bash', inputSize: 256 });
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
   * @param message - The info message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.info('Session started', { source: 'startup', sessionId: 'abc123' });
   * ```
   */
  info(message, context) {
    this.emit("info", message, context);
  }
  /**
   * Logs a warning message.
   *
   * Use for conditions that may indicate issues but don't prevent
   * operation, such as deprecated patterns or performance concerns.
   * @param message - The warning message
   * @param context - Optional additional context
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
   * @param message - The error message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.error('Failed to validate tool input', { toolName: 'Bash', reason: 'empty command' });
   * ```
   */
  error(message, context) {
    this.emit("error", message, context);
  }
  /**
   * Logs a structured error with full error details.
   *
   * Use this method when logging caught exceptions to capture the full
   * error context including name, message, stack trace, and cause chain.
   * @param error - The error to log
   * @param message - Human-readable description of what failed
   * @param context - Optional additional context
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
   * is no longer needed.
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
   * Configures the log file path at runtime.
   *
   * Call this to enable or change file logging. Setting to `null` disables
   * file logging (but doesn't close existing file handle immediately).
   * @param filePath - Path to the log file, or null to disable
   * @example
   * ```typescript
   * // Enable file logging at runtime
   * logger.setLogFile('/var/log/claude-hooks.log');
   *
   * // Disable file logging
   * logger.setLogFile(null);
   * ```
   */
  setLogFile(filePath) {
    if (this.logFileFd !== null) {
      try {
        closeSync(this.logFileFd);
      } catch (closeError) {
        process.stderr.write(`[claude-code-hooks] Failed to close log file: ${String(closeError)}
`);
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
      } catch (closeError) {
        process.stderr.write(`[claude-code-hooks] Failed to close log file: ${String(closeError)}
`);
      }
      this.logFileFd = null;
    }
    this.fileInitialized = false;
  }
  /**
   * Checks if there are any active handlers or destinations.
   *
   * Returns true if any handlers are registered or file logging is enabled.
   * @returns Whether the logger has any active output destinations
   */
  hasDestinations() {
    for (const handlers of this.handlers.values()) {
      if (handlers.size > 0)
        return true;
    }
    return this.logFilePath !== null;
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
        } catch (handlerError) {
          process.stderr.write(`[claude-code-hooks] Log handler error: ${String(handlerError)}
`);
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
    if (!this.logFilePath)
      return;
    if (!this.fileInitialized) {
      this.initializeFile();
    }
    if (this.logFileFd === null)
      return;
    try {
      const line = `${JSON.stringify(event)}
`;
      writeSync(this.logFileFd, line);
    } catch (writeError) {
      this.logFileFd = null;
      this.fileInitialized = false;
      process.stderr.write(`[claude-code-hooks] Log file write failed: ${String(writeError)}
`);
    }
  }
  /**
   * Initializes the log file for writing.
   */
  initializeFile() {
    this.fileInitialized = true;
    if (!this.logFilePath)
      return;
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
var logger = new Logger({
  logEnvVar: process.env.CLAUDE_CODE_HOOKS_LOG_ENV_VAR ?? "CLAUDE_CODE_HOOKS_LOG_FILE"
});

// ../../../../../../../../../../../workspace/node_modules/@goodfoot/claude-code-hooks/dist/outputs.js
var EXIT_CODES = {
  /** Handler completed successfully. Claude Code parses stdout as JSON. */
  SUCCESS: 0,
  /** Non-blocking error occurred (e.g., invalid input). stderr shown to user only. */
  ERROR: 1,
  /** Handler threw exception OR blocking action requested. stderr shown to Claude. */
  BLOCK: 2
};

// ../../../../../../../../../../../workspace/node_modules/@goodfoot/claude-code-hooks/dist/runtime.js
async function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      chunks.push(chunk);
    });
    process.stdin.on("end", () => {
      resolve(chunks.join(""));
    });
    process.stdin.on("error", (error) => {
      reject(error);
    });
  });
}
function parseStdinInput(stdinContent) {
  const rawInput = JSON.parse(stdinContent);
  return rawInput;
}
function writeStdout(output) {
  process.stdout.write(JSON.stringify(output));
}
function createMalformedInputOutput(error) {
  logger.error(`Invalid JSON input: ${error instanceof Error ? error.message : String(error)}`);
  return { stdout: {} };
}
function handleHandlerError(error) {
  if (error instanceof Error) {
    process.stderr.write(`${error.stack ?? error.message}
`);
  } else {
    process.stderr.write(`${String(error)}
`);
  }
  logger.error(`Hook handler error: ${error instanceof Error ? error.message : String(error)}`);
  logger.clearContext();
  logger.close();
  process.exit(EXIT_CODES.BLOCK);
}
function convertToHookOutput(specificOutput) {
  const { stdout, stderr } = specificOutput;
  return stderr !== void 0 ? { stdout, stderr } : { stdout };
}
async function execute(hookFn) {
  let output;
  try {
    let stdinContent;
    try {
      stdinContent = await readStdin();
    } catch (error) {
      logger.logError(error, "Failed to read stdin");
      output = createMalformedInputOutput(error);
      return;
    }
    let input;
    try {
      input = parseStdinInput(stdinContent);
    } catch (error) {
      logger.logError(error, "Failed to parse stdin JSON");
      output = createMalformedInputOutput(error);
      return;
    }
    const hookEventName = hookFn.hookEventName;
    logger.setContext(hookEventName, input);
    const context = hookEventName === "SessionStart" ? { logger, persistEnvVar, persistEnvVars } : { logger };
    try {
      const specificOutput = await hookFn(input, context);
      if (specificOutput !== null) {
        output = convertToHookOutput(specificOutput);
      }
    } catch (error) {
      handleHandlerError(error);
    }
  } finally {
    if (output !== void 0) {
      writeStdout(output.stdout);
    }
    logger.clearContext();
    logger.close();
    if (output?.stderr !== void 0) {
      process.stderr.write(output.stderr);
      process.exit(EXIT_CODES.BLOCK);
    }
    process.exit(EXIT_CODES.SUCCESS);
  }
}

// src/subagent-stop.ts
async function uploadSubagentTranscript(cardId, sessionId, agentId, transcriptPath) {
  const client = await createCardsClient();
  if (!client) return;
  const content = await readFile2(transcriptPath, "utf-8");
  const stream = client.openStream(cardId, "claude-code-session", `${sessionId}-${agentId}.jsonl`, {
    title: `Subagent transcript for ${cardId}`,
    sessionId
  });
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.trim() !== "") {
      stream.write(line);
    }
  }
  await stream.close();
}
var subagent_stop_default = subagentStopHook({}, async (input, { logger: logger2 }) => {
  let actionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger2.error("Not running inside an action subprocess", { error: message });
    return null;
  }
  try {
    await uploadSubagentTranscript(actionInput.cardId, input.session_id, input.agent_id, input.agent_transcript_path);
    logger2.info("Transcript upload complete", {
      sessionId: input.session_id,
      agentId: input.agent_id,
      cardId: actionInput.cardId
    });
  } catch (error) {
    logger2.warn("Failed to upload transcript", {
      sessionId: input.session_id,
      agentId: input.agent_id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
  return null;
});

// src/subagent-stop-entry.ts
execute(subagent_stop_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3N1YmFnZW50LXN0b3AudHMiLCAiLi4vc2RrL3NyYy9jbGllbnQvYXBpLWRpc2NvdmVyeS50cyIsICIuLi9zZGsvc3JjL2NsaWVudC90eXBlcy9lcnJvcnMudHMiLCAiLi4vc2RrL3NyYy9jbGllbnQvY2FyZHNDbGllbnQudHMiLCAiLi4vc2RrL3NyYy9jb25maWcvZW52LnRzIiwgIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3dvcmtzcGFjZS9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvZW52LmpzIiwgIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3dvcmtzcGFjZS9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvaG9va3MuanMiLCAiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vd29ya3NwYWNlL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9sb2dnZXIuanMiLCAiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vd29ya3NwYWNlL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9vdXRwdXRzLmpzIiwgIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3dvcmtzcGFjZS9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvcnVudGltZS5qcyIsICJzcmMvc3ViYWdlbnQtc3RvcC1lbnRyeS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBTdWJhZ2VudFN0b3AgaG9vayBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBVcGxvYWRzIHRoZSBjb21wbGV0ZWQgc3ViYWdlbnQgdHJhbnNjcmlwdCB0byB0aGUgQ2FyZHMgQVBJIHZpYSBzdHJlYW1pbmcuXG4gKiBVc2VzIGBvcGVuU3RyZWFtYCB3aXRoIHN0cmVhbSB0eXBlIGBjbGF1ZGUtY29kZS1zZXNzaW9uYCBhbmQgZmlsZW5hbWVcbiAqIGB7c2Vzc2lvbklkfS17YWdlbnRJZH0uanNvbmxgLlxuICpcbiAqIEFwcHJvdmVzIHVuY29uZGl0aW9uYWxseSBcdTIwMTQgdXBsb2FkIGZhaWx1cmUgaXMgbm9uLWZhdGFsIHNpbmNlIHRyYW5zY3JpcHRcbiAqIGRhdGEgbWF5IGJlIHBhcnRpYWxseSBhdmFpbGFibGUgdmlhIG90aGVyIG1lYW5zLlxuICpcbiAqIEBzdW1tYXJ5IFN1YmFnZW50U3RvcCBob29rIFx1MjAxNCB1cGxvYWRzIHN1YmFnZW50IHRyYW5zY3JpcHQgdG8gQ2FyZHMgQVBJXG4gKi9cblxuaW1wb3J0IHsgcmVhZEZpbGUgfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7IGNyZWF0ZUNhcmRzQ2xpZW50IH0gZnJvbSAnQGNhcmRzL3Nkay9jbGllbnQvZGlzY292ZXJ5JztcbmltcG9ydCB7IGV4dHJhY3RBY3Rpb25JbnB1dCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IHN1YmFnZW50U3RvcEhvb2sgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuXG4vKipcbiAqIFVwbG9hZHMgdGhlIGNvbXBsZXRlZCBzdWJhZ2VudCB0cmFuc2NyaXB0IHRvIHRoZSBDYXJkcyBBUEkgdmlhIHN0cmVhbWluZy5cbiAqXG4gKiBSZWFkcyB0aGUgdHJhbnNjcmlwdCBmaWxlIGFuZCBzdHJlYW1zIGVhY2ggbm9uLWVtcHR5IGxpbmUgdXNpbmcgYG9wZW5TdHJlYW1gLlxuICogRmFpbHMgb3BlbiBcdTIwMTQgY2FsbGVyIGxvZ3Mgd2FybmluZyBvbiBmYWlsdXJlLlxuICpcbiAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIGlkZW50aWZpZXIgZm9yIHRoZSB1cGxvYWQgdGFyZ2V0XG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gQ2xhdWRlIHNlc3Npb24gaWRlbnRpZmllclxuICogQHBhcmFtIGFnZW50SWQgLSBTdWJhZ2VudCBpZGVudGlmaWVyXG4gKiBAcGFyYW0gdHJhbnNjcmlwdFBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBjb21wbGV0ZWQgdHJhbnNjcmlwdCBmaWxlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHVwbG9hZFN1YmFnZW50VHJhbnNjcmlwdChcbiAgY2FyZElkOiBzdHJpbmcsXG4gIHNlc3Npb25JZDogc3RyaW5nLFxuICBhZ2VudElkOiBzdHJpbmcsXG4gIHRyYW5zY3JpcHRQYXRoOiBzdHJpbmdcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjbGllbnQgPSBhd2FpdCBjcmVhdGVDYXJkc0NsaWVudCgpO1xuICBpZiAoIWNsaWVudCkgcmV0dXJuO1xuXG4gIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZWFkRmlsZSh0cmFuc2NyaXB0UGF0aCwgJ3V0Zi04Jyk7XG4gIGNvbnN0IHN0cmVhbSA9IGNsaWVudC5vcGVuU3RyZWFtKGNhcmRJZCwgJ2NsYXVkZS1jb2RlLXNlc3Npb24nLCBgJHtzZXNzaW9uSWR9LSR7YWdlbnRJZH0uanNvbmxgLCB7XG4gICAgdGl0bGU6IGBTdWJhZ2VudCB0cmFuc2NyaXB0IGZvciAke2NhcmRJZH1gLFxuICAgIHNlc3Npb25JZFxuICB9KTtcblxuICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpO1xuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICBpZiAobGluZS50cmltKCkgIT09ICcnKSB7XG4gICAgICBzdHJlYW0ud3JpdGUobGluZSk7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgc3RyZWFtLmNsb3NlKCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHN1YmFnZW50U3RvcEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICBsZXQgYWN0aW9uSW5wdXQ6IFJldHVyblR5cGU8dHlwZW9mIGV4dHJhY3RBY3Rpb25JbnB1dD47XG4gIHRyeSB7XG4gICAgYWN0aW9uSW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgIGxvZ2dlci5lcnJvcignTm90IHJ1bm5pbmcgaW5zaWRlIGFuIGFjdGlvbiBzdWJwcm9jZXNzJywgeyBlcnJvcjogbWVzc2FnZSB9KTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHRyeSB7XG4gICAgYXdhaXQgdXBsb2FkU3ViYWdlbnRUcmFuc2NyaXB0KGFjdGlvbklucHV0LmNhcmRJZCwgaW5wdXQuc2Vzc2lvbl9pZCwgaW5wdXQuYWdlbnRfaWQsIGlucHV0LmFnZW50X3RyYW5zY3JpcHRfcGF0aCk7XG4gICAgbG9nZ2VyLmluZm8oJ1RyYW5zY3JpcHQgdXBsb2FkIGNvbXBsZXRlJywge1xuICAgICAgc2Vzc2lvbklkOiBpbnB1dC5zZXNzaW9uX2lkLFxuICAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gICAgICBjYXJkSWQ6IGFjdGlvbklucHV0LmNhcmRJZFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gdXBsb2FkIHRyYW5zY3JpcHQnLCB7XG4gICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gICAgICBhZ2VudElkOiBpbnB1dC5hZ2VudF9pZCxcbiAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufSk7XG4iLCAiLyoqXG4gKiBDYXJkcyBBUEkgZGlzY292ZXJ5IHV0aWxpdGllcy5cbiAqXG4gKiBSZWFkcyBgfi8uY2FyZHMvY2FyZHMtYXBpLmpzb25gIHRvIGxvY2F0ZSB0aGUgQ2FyZHMgQVBJIHNlcnZlciBhbmRcbiAqIGNvbnN0cnVjdHMgYSB7QGxpbmsgQ2FyZHNDbGllbnR9IGZvciB1c2UgYnkgQ0xJIHRvb2xzIGFuZCBob29rIGVudHJ5cG9pbnRzLlxuICpcbiAqIEFsbCBmdW5jdGlvbnMgcmV0dXJuIGBudWxsYCBvbiBmYWlsdXJlIHNvIGNhbGxlcnMgY2FuIGRlZ3JhZGUgZ3JhY2VmdWxseS5cbiAqIFNldCBgQVBJX1RFU1RfTU9ERT0xYCB0byBmb3JjZSBkZXRlcm1pbmlzdGljLCBsb2NhbCB2YWx1ZXMgaW4gdGVzdHMuXG4gKlxuICogQHN1bW1hcnkgQ2FyZHMgQVBJIGRpc2NvdmVyeSB1dGlsaXRpZXNcbiAqIEBtb2R1bGUgY2xpZW50L2FwaS1kaXNjb3ZlcnlcbiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZSB9IGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsgaG9tZWRpciB9IGZyb20gJ25vZGU6b3MnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgdHlwZSB7IENhcmRzQXBpSW5mbywgU2Vzc2lvbkJhc2VsaW5lIH0gZnJvbSAnLi4vcHJvdG9jb2wvaW5kZXguanMnO1xuaW1wb3J0IHsgQ2FyZHNDbGllbnQgfSBmcm9tICcuL2NhcmRzQ2xpZW50LmpzJztcblxuLyoqXG4gKiBNaW5pbWFsIGxvZ2dlciBhY2NlcHRlZCBieSBkaXNjb3ZlcnkgZnVuY3Rpb25zLlxuICpcbiAqIE1hdGNoZXMgdGhlIGBkZWJ1Z2AgbWV0aG9kIG9mIHtAbGluayBJTG9nZ2VyfSBzbyBjYWxsZXJzIGNhbiBwYXNzIGFueVxuICogU0RLIGxvZ2dlciBvciBhIHBsYWluIG9iamVjdCB3aXRoIGEgYGRlYnVnYCBtZXRob2QuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGlzY292ZXJ5TG9nZ2VyIHtcbiAgZGVidWcobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBDYXJkcyBBUEkgZGlzY292ZXJ5IGZpbGUgYW5kIHJldHVybnMgdGhlIGZ1bGwgdHlwZWQgcGF5bG9hZC5cbiAqXG4gKiBSZXR1cm5zIGBudWxsYCB3aGVuIGRpc2NvdmVyeSBmYWlscyAobWlzc2luZyBmaWxlLCBpbnZhbGlkIEpTT04sIG9yXG4gKiByZXF1aXJlZCBmaWVsZHMgYWJzZW50KS5cbiAqXG4gKiBAcGFyYW0gbG9nZ2VyIC0gT3B0aW9uYWwgbG9nZ2VyIGZvciBkZWJ1ZyBvdXRwdXQuXG4gKiBAcmV0dXJucyBUaGUgQ2FyZHNBcGlJbmZvIHBheWxvYWQsIG9yIG51bGwgaWYgZGlzY292ZXJ5IGZhaWxzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGlzY292ZXJBcGlJbmZvKGxvZ2dlcj86IERpc2NvdmVyeUxvZ2dlcik6IFByb21pc2U8Q2FyZHNBcGlJbmZvIHwgbnVsbD4ge1xuICBpZiAocHJvY2Vzcy5lbnZbJ0FQSV9URVNUX01PREUnXSA9PT0gJzEnKSB7XG4gICAgbG9nZ2VyPy5kZWJ1ZygnQVBJX1RFU1RfTU9ERTogVXNpbmcgbW9jayBBUEkgaW5mbycpO1xuICAgIHJldHVybiB7XG4gICAgICBob3N0OiAnbG9jYWxob3N0JyxcbiAgICAgIHBvcnQ6IDk5OTksXG4gICAgICBwaWQ6IDk5OTk5LFxuICAgICAgYWNjZXNzVG9rZW46ICd0ZXN0LXRva2VuJyxcbiAgICAgIHN0YXJ0ZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDBaJ1xuICAgIH07XG4gIH1cblxuICBjb25zdCBjb25maWdQYXRoID0gcHJvY2Vzcy5lbnZbJ0NBUkRTX0RJU0NPVkVSWV9QQVRIJ10gPz8gam9pbihob21lZGlyKCksICcuY2FyZHMnLCAnY2FyZHMtYXBpLmpzb24nKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgcmVhZEZpbGUoY29uZmlnUGF0aCwgJ3V0Zi04Jyk7XG4gICAgY29uc3QgY29uZmlnID0gSlNPTi5wYXJzZShjb250ZW50KSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuICAgIGlmIChcbiAgICAgIHR5cGVvZiBjb25maWdbJ2hvc3QnXSAhPT0gJ3N0cmluZycgfHxcbiAgICAgIHR5cGVvZiBjb25maWdbJ3BvcnQnXSAhPT0gJ251bWJlcicgfHxcbiAgICAgIHR5cGVvZiBjb25maWdbJ2FjY2Vzc1Rva2VuJ10gIT09ICdzdHJpbmcnIHx8XG4gICAgICB0eXBlb2YgY29uZmlnWydwaWQnXSAhPT0gJ251bWJlcicgfHxcbiAgICAgIHR5cGVvZiBjb25maWdbJ3N0YXJ0ZWRBdCddICE9PSAnc3RyaW5nJ1xuICAgICkge1xuICAgICAgbG9nZ2VyPy5kZWJ1ZygnQVBJIGluZm8gZGlzY292ZXJ5IGZhaWxlZCcsIHsgZXJyb3I6ICdDb25maWcgbWlzc2luZyByZXF1aXJlZCBmaWVsZHMnIH0pO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGhvc3Q6IGNvbmZpZ1snaG9zdCddLFxuICAgICAgcG9ydDogY29uZmlnWydwb3J0J10sXG4gICAgICBhY2Nlc3NUb2tlbjogY29uZmlnWydhY2Nlc3NUb2tlbiddLFxuICAgICAgcGlkOiBjb25maWdbJ3BpZCddLFxuICAgICAgc3RhcnRlZEF0OiBjb25maWdbJ3N0YXJ0ZWRBdCddLFxuICAgICAgc2Vzc2lvbkJhc2VsaW5lOiBjb25maWdbJ3Nlc3Npb25CYXNlbGluZSddIGFzIFNlc3Npb25CYXNlbGluZSB8IHVuZGVmaW5lZFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyPy5kZWJ1ZygnQVBJIGluZm8gZGlzY292ZXJ5IGZhaWxlZCcsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEge0BsaW5rIENhcmRzQ2xpZW50fSBmcm9tIHRoZSBBUEkgZGlzY292ZXJ5IGZpbGUuXG4gKlxuICogUmVhZHMgYH4vLmNhcmRzL2NhcmRzLWFwaS5qc29uYCwgZXh0cmFjdHMgaG9zdC9wb3J0L2FjY2Vzc1Rva2VuLCBhbmRcbiAqIHJldHVybnMgYSBjb25maWd1cmVkIGNsaWVudCBpbnN0YW5jZS4gUmV0dXJucyBgbnVsbGAgd2hlbiBkaXNjb3ZlcnkgZmFpbHMuXG4gKlxuICogQHBhcmFtIGxvZ2dlciAtIE9wdGlvbmFsIGxvZ2dlciBmb3IgZGVidWcgb3V0cHV0LlxuICogQHJldHVybnMgQSBjb25maWd1cmVkIENhcmRzQ2xpZW50LCBvciBudWxsIGlmIGRpc2NvdmVyeSBmYWlscy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUNhcmRzQ2xpZW50KGxvZ2dlcj86IERpc2NvdmVyeUxvZ2dlcik6IFByb21pc2U8Q2FyZHNDbGllbnQgfCBudWxsPiB7XG4gIGNvbnN0IGluZm8gPSBhd2FpdCBkaXNjb3ZlckFwaUluZm8obG9nZ2VyKTtcbiAgaWYgKCFpbmZvKSByZXR1cm4gbnVsbDtcblxuICByZXR1cm4gbmV3IENhcmRzQ2xpZW50KHtcbiAgICBiYXNlVXJsOiBgaHR0cDovLyR7aW5mby5ob3N0fToke2luZm8ucG9ydH1gLFxuICAgIGFjY2Vzc1Rva2VuOiBpbmZvLmFjY2Vzc1Rva2VuXG4gIH0pO1xufVxuIiwgIi8qKlxuICogRXJyb3IgY2xhc3NlcyBmb3IgdGhlIENhcmRzIFYyIFNESy5cbiAqXG4gKiBUaGVzZSBlcnJvcnMgbm9ybWFsaXplIHNlcnZlciByZXNwb25zZXMgYW5kIG5ldHdvcmsgZmFpbHVyZXMgc28gY2FsbGVycyBjYW5cbiAqIGRpc3Rpbmd1aXNoIEFQSSB2YWxpZGF0aW9uIHByb2JsZW1zIGZyb20gdHJhbnNwb3J0IGlzc3Vlcy5cbiAqXG4gKlxuICogQHN1bW1hcnkgRXJyb3IgY2xhc3NlcyBmb3IgdGhlIENhcmRzIFYyIFNES1xuICogQG1vZHVsZSB0eXBlcy9lcnJvcnNcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEZpZWxkRXJyb3IgfSBmcm9tICcuLi8uLi9wcm90b2NvbC9pbmRleC5qcyc7XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gYW4gQVBJIHJlcXVlc3QgZmFpbHMgd2l0aCBhbiBlcnJvciByZXNwb25zZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdHJ5IHtcbiAqICAgYXdhaXQgY2xpZW50LmNyZWF0ZUNhcmQoZGF0YSk7XG4gKiB9IGNhdGNoIChlcnJvcikge1xuICogICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcGlFcnJvcikge1xuICogICAgIGNvbnNvbGUuZXJyb3IoYEFQSSBlcnJvciBbJHtlcnJvci5jb2RlfV06ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAqICAgICBpZiAoZXJyb3IuZmllbGRzKSB7XG4gKiAgICAgICBlcnJvci5maWVsZHMuZm9yRWFjaChmID0+IGNvbnNvbGUuZXJyb3IoYCAgJHtmLmZpZWxkfTogJHtmLm1lc3NhZ2V9YCkpO1xuICogICAgIH1cbiAqICAgfVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBBcGlFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgQXBpRXJyb3IgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZXJyb3IgbWVzc2FnZVxuICAgKiBAcGFyYW0gY29kZSAtIE1hY2hpbmUtcmVhZGFibGUgZXJyb3IgY29kZVxuICAgKiBAcGFyYW0gZmllbGRzIC0gT3B0aW9uYWwgYXJyYXkgb2YgZmllbGQtc3BlY2lmaWMgdmFsaWRhdGlvbiBlcnJvcnNcbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgY29kZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBmaWVsZHM/OiBGaWVsZEVycm9yW11cbiAgKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gJ0FwaUVycm9yJztcbiAgfVxufVxuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIGEgbmV0d29yayByZXF1ZXN0IGZhaWxzIGR1ZSB0byBjb25uZWN0aXZpdHkgaXNzdWVzLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB0cnkge1xuICogICBhd2FpdCBjbGllbnQubGlzdENhcmRzKCk7XG4gKiB9IGNhdGNoIChlcnJvcikge1xuICogICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBOZXR3b3JrRXJyb3IpIHtcbiAqICAgICBjb25zb2xlLmVycm9yKGBOZXR3b3JrIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gKiAgICAgaWYgKGVycm9yLmNhdXNlKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKGBDYXVzZWQgYnk6ICR7ZXJyb3IuY2F1c2UubWVzc2FnZX1gKTtcbiAqICAgICB9XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgTmV0d29ya0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBOZXR3b3JrRXJyb3IgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZXJyb3IgbWVzc2FnZVxuICAgKiBAcGFyYW0gY2F1c2UgLSBPcHRpb25hbCB1bmRlcmx5aW5nIGVycm9yIHRoYXQgY2F1c2VkIHRoaXMgbmV0d29yayBmYWlsdXJlXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGNhdXNlPzogRXJyb3JcbiAgKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gJ05ldHdvcmtFcnJvcic7XG4gIH1cbn1cbiIsICIvKipcbiAqIEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUEkuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUElcbiAqIEBtb2R1bGUgc2RrL0NhcmRzQ2xpZW50XG4gKi9cblxuaW1wb3J0IHR5cGUge1xuICBBY3Rpb25SZXN1bHQsXG4gIENhcmQsXG4gIENvbXBhcmVSZXF1ZXN0LFxuICBDb21wYXJlU3RhdGUsXG4gIEh0dHBDbGllbnQsXG4gIFN0cmVhbU1ldGEsXG4gIFRpbWVsaW5lSXRlbVxufSBmcm9tICcuLi9wcm90b2NvbC9pbmRleC5qcyc7XG5pbXBvcnQgdHlwZSB7XG4gIEFkZEJyYW5jaFJlcXVlc3QsXG4gIEF0dGFjaG1lbnRSZXNwb25zZSxcbiAgQnJhbmNoZXNSZXNwb25zZSxcbiAgQ2FyZENyZWF0ZURhdGEsXG4gIENhcmRzQ2xpZW50T3B0aW9ucyxcbiAgQ2FyZFVwZGF0ZURhdGEsXG4gIENvbW1lbnQsXG4gIENvbW1lbnRDcmVhdGVEYXRhLFxuICBDb21tZW50VXBkYXRlRGF0YSxcbiAgQ29tbWl0SW5mbyxcbiAgR2F0ZUFwcHJvdmFsUmVzcG9uc2UsXG4gIExpc3RDYXJkc09wdGlvbnMsXG4gIFN0cmVhbVJlc3VsdCxcbiAgU3RyZWFtV3JpdGVyLFxuICBTdHJlYW1Xcml0ZXJPcHRpb25zLFxuICBUaW1lbGluZU9wdGlvbnMsXG4gIFR5cGVTY2hlbWFzUmVzcG9uc2Vcbn0gZnJvbSAnLi90eXBlcy9jbGllbnQuanMnO1xuaW1wb3J0IHsgQXBpRXJyb3IsIE5ldHdvcmtFcnJvciB9IGZyb20gJy4vdHlwZXMvZXJyb3JzLmpzJztcblxuLyoqIEluaXRpYWwgcmVxdWVzdCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyAoMyBzZWNvbmRzIHRvIGFjY29tbW9kYXRlIGdpdC1iYWNrZWQgZW5kcG9pbnRzKS4gKi9cbmNvbnN0IElOSVRJQUxfVElNRU9VVF9NUyA9IDNfMDAwO1xuXG4vKiogTWF4aW11bSByZXF1ZXN0IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzIGFmdGVyIGV4cG9uZW50aWFsIGJhY2tvZmYuICovXG5jb25zdCBNQVhfVElNRU9VVF9NUyA9IDEwXzAwMDtcblxuLyoqIE1heGltdW0gbnVtYmVyIG9mIGF1dG9tYXRpYyByZXRyaWVzIGZvciB0aW1lb3V0IGVycm9ycyBiZWZvcmUgZ2l2aW5nIHVwLiAqL1xuY29uc3QgTUFYX1RJTUVPVVRfUkVUUklFUyA9IDI7XG5cbi8qKlxuICogVHlwZS1zYWZlIEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUEkuXG4gKlxuICogVXNlcyB0aGUgRmV0Y2ggQVBJIGJ5IGRlZmF1bHQgYW5kIHN1cHBvcnRzIGRlcGVuZGVuY3kgaW5qZWN0aW9uIG9mIGFuXG4gKiBhbHRlcm5hdGUge0BsaW5rIEh0dHBDbGllbnR9IGZvciB0ZXN0cyBvciBjdXN0b20gdHJhbnNwb3J0cy4gQWxsIHB1YmxpY1xuICogbWV0aG9kcyBzdXJmYWNlIHNlcnZlciBmYWlsdXJlcyBhcyB7QGxpbmsgQXBpRXJyb3J9IGFuZCB0cmFuc3BvcnQgZmFpbHVyZXNcbiAqIGFzIHtAbGluayBOZXR3b3JrRXJyb3J9LlxuICpcbiAqIFRoZSBkZWZhdWx0IEhUVFAgY2xpZW50IGFwcGxpZXMgYW4gZXhwb25lbnRpYWwgYmFja29mZiB0aW1lb3V0IHRvIGZldGNoXG4gKiByZXF1ZXN0czogc3RhcnRpbmcgYXQgMyBzZWNvbmRzLCBkb3VibGluZyBvbiBlYWNoIGNvbnNlY3V0aXZlIGZhaWx1cmUgdXBcbiAqIHRvIGEgMTAtc2Vjb25kIGNhcCwgYW5kIHJlc2V0dGluZyBvbiBhbnkgc3VjY2Vzc2Z1bCByZXNwb25zZS4gVGhpcyBlbnN1cmVzXG4gKiBmYXN0IGZhaWx1cmUgZGV0ZWN0aW9uIHdoZW4gdGhlIHNlcnZlciBpcyBkb3duIHdoaWxlIGFsbG93aW5nIHNsb3dlclxuICogcmVzcG9uc2VzIGR1cmluZyByZWNvdmVyeS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2xpZW50ID0gbmV3IENhcmRzQ2xpZW50KHsgYmFzZVVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsIGFjY2Vzc1Rva2VuOiAndG9rZW4nIH0pO1xuICpcbiAqIGNvbnN0IGNhcmRzID0gYXdhaXQgY2xpZW50Lmxpc3RDYXJkcyh7IHN0YXR1czogJ2FjdGl2ZScgfSk7XG4gKiBhd2FpdCBjbGllbnQudXBkYXRlQ2FyZChjYXJkSWQsIHsgc3RhdHVzOiAnZG9uZScgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIENhcmRzQ2xpZW50IHtcbiAgcHJpdmF0ZSByZWFkb25seSBfaHR0cENsaWVudD86IEh0dHBDbGllbnQ7XG5cbiAgLyoqIEN1cnJlbnQgdGltZW91dCBpbiBtaWxsaXNlY29uZHMsIGluY3JlYXNlcyB3aXRoIGNvbnNlY3V0aXZlIGZhaWx1cmVzLiAqL1xuICBwcml2YXRlIF9jdXJyZW50VGltZW91dE1zID0gSU5JVElBTF9USU1FT1VUX01TO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IENhcmRzQ2xpZW50IGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBpbmNsdWRpbmcgYmFzZSBVUkwgYW5kIGF1dGggdG9rZW4uXG4gICAqIEBwYXJhbSBodHRwQ2xpZW50IC0gT3B0aW9uYWwgSFRUUCBjbGllbnQgZm9yIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBvcHRpb25zOiBDYXJkc0NsaWVudE9wdGlvbnMsXG4gICAgaHR0cENsaWVudD86IEh0dHBDbGllbnRcbiAgKSB7XG4gICAgdGhpcy5faHR0cENsaWVudCA9IGh0dHBDbGllbnQ7XG4gIH1cblxuICAvKipcbiAgICogUmVwbGFjZXMgdGhlIGFjY2VzcyB0b2tlbiB1c2VkIGZvciBzdWJzZXF1ZW50IEFQSSByZXF1ZXN0cy5cbiAgICpcbiAgICogQHBhcmFtIHRva2VuIC0gVGhlIG5ldyBhY2Nlc3MgdG9rZW4gdG8gdXNlIGZvciBhdXRoZW50aWNhdGlvbi5cbiAgICovXG4gIHVwZGF0ZUFjY2Vzc1Rva2VuKHRva2VuOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLm9wdGlvbnMgPSB7IC4uLnRoaXMub3B0aW9ucywgYWNjZXNzVG9rZW46IHRva2VuIH07XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgYmFzZSBVUkwgdXNlZCB0byBidWlsZCBBUEkgcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBiYXNlIFVSTCBzdHJpbmcgYXMgcHJvdmlkZWQgaW4ge0BsaW5rIENhcmRzQ2xpZW50T3B0aW9uc30uXG4gICAqL1xuICBnZXRCYXNlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5iYXNlVXJsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciBhbiBIVFRQIGNsaWVudCB3YXMgaW5qZWN0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIFRydWUgaWYgYW4gSFRUUCBjbGllbnQgd2FzIHByb3ZpZGVkIGR1cmluZyBjb25zdHJ1Y3Rpb24uXG4gICAqIEBpbnRlcm5hbCBVc2VkIGZvciB0ZXN0aW5nIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICAgKi9cbiAgaGFzSHR0cENsaWVudCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5faHR0cENsaWVudCAhPT0gdW5kZWZpbmVkO1xuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIEFib3J0U2lnbmFsIHRoYXQgZmlyZXMgYWZ0ZXIgdGhlIGN1cnJlbnQgYmFja29mZiB0aW1lb3V0LlxuICAgKiBVc2VzIGNhbGxlcidzIHNpZ25hbCBpZiBwcm92aWRlZCAoZm9yIERJL3Rlc3RpbmcpLCBvdGhlcndpc2UgYXBwbGllcyB0aGUgYmFja29mZiB0aW1lb3V0LlxuICAgKlxuICAgKiBAcGFyYW0gZXhpc3RpbmdTaWduYWwgLSBPcHRpb25hbCBjYWxsZXItcHJvdmlkZWQgc2lnbmFsIHRvIHJldXNlIGluc3RlYWQgb2YgY3JlYXRpbmcgYSB0aW1lb3V0IHNpZ25hbC5cbiAgICogQHJldHVybnMgQWJvcnRTaWduYWwgdGhhdCBjb250cm9scyByZXF1ZXN0IGNhbmNlbGxhdGlvbiBmb3IgdGhlIGN1cnJlbnQgb3BlcmF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRUaW1lb3V0U2lnbmFsKGV4aXN0aW5nU2lnbmFsPzogQWJvcnRTaWduYWwgfCBudWxsKTogQWJvcnRTaWduYWwge1xuICAgIGlmIChleGlzdGluZ1NpZ25hbCkgcmV0dXJuIGV4aXN0aW5nU2lnbmFsO1xuICAgIHJldHVybiBBYm9ydFNpZ25hbC50aW1lb3V0KHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY29yZHMgYSBzdWNjZXNzZnVsIHJlcXVlc3QgYW5kIHJlc2V0cyB0aGUgdGltZW91dCBiYWNrb2ZmLlxuICAgKi9cbiAgcHJpdmF0ZSBvblJlcXVlc3RTdWNjZXNzKCk6IHZvaWQge1xuICAgIHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMgPSBJTklUSUFMX1RJTUVPVVRfTVM7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkcyBhIGZhaWxlZCByZXF1ZXN0IGFuZCBpbmNyZWFzZXMgdGhlIHRpbWVvdXQgdmlhIGV4cG9uZW50aWFsIGJhY2tvZmYuXG4gICAqL1xuICBwcml2YXRlIG9uUmVxdWVzdEZhaWx1cmUoKTogdm9pZCB7XG4gICAgdGhpcy5fY3VycmVudFRpbWVvdXRNcyA9IE1hdGgubWluKHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMgKiAyLCBNQVhfVElNRU9VVF9NUyk7XG4gIH1cblxuICAvKipcbiAgICogRGVmYXVsdCBIVFRQIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB1c2luZyBmZXRjaCArIEpTT04gcGF5bG9hZHMuXG4gICAqXG4gICAqIEVhY2ggZmV0Y2ggY2FsbCBpbmNsdWRlcyBhbiBBYm9ydFNpZ25hbC50aW1lb3V0IHRoYXQgc3RhcnRzIGF0IDMgc2Vjb25kc1xuICAgKiBhbmQgZG91YmxlcyBvbiBjb25zZWN1dGl2ZSBmYWlsdXJlcyB1cCB0byAxMCBzZWNvbmRzLlxuICAgKi9cbiAgcHJpdmF0ZSBkZWZhdWx0SHR0cENsaWVudDogSHR0cENsaWVudCA9IHtcbiAgICBnZXQ6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBwb3N0OiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIGJvZHk6IHVua25vd24sIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgYm9keTogYm9keSA/IEpTT04uc3RyaW5naWZ5KGJvZHkpIDogdW5kZWZpbmVkLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgcHV0OiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIGJvZHk6IHVua25vd24sIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiB1bmRlZmluZWQsXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBwYXRjaDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBib2R5OiB1bmtub3duLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiB1bmRlZmluZWQsXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBkZWxldGU6IGFzeW5jICh1cmw6IHN0cmluZywgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBHZXRzIEhUVFAgaGVhZGVycyBmb3IgSlNPTiBBUEkgcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIEhlYWRlcnMgd2l0aCBKU09OIGNvbnRlbnQgdHlwZSBhbmQgb3B0aW9uYWwgYmVhcmVyIHRva2VuLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRIZWFkZXJzKCk6IEhlYWRlcnNJbml0IHtcbiAgICBjb25zdCBoZWFkZXJzOiBIZWFkZXJzSW5pdCA9IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG4gICAgcmV0dXJuIGhlYWRlcnM7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgSFRUUCBjbGllbnQgdG8gdXNlIGZvciByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgSW5qZWN0ZWQgSFRUUCBjbGllbnQgd2hlbiBwcm92aWRlZCwgb3RoZXJ3aXNlIHRoZSBkZWZhdWx0IGZldGNoLWJhc2VkIGNsaWVudC5cbiAgICovXG4gIHByaXZhdGUgZ2V0SHR0cENsaWVudCgpOiBIdHRwQ2xpZW50IHtcbiAgICByZXR1cm4gdGhpcy5faHR0cENsaWVudCA/PyB0aGlzLmRlZmF1bHRIdHRwQ2xpZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBhIFVSTCByZWxhdGl2ZSB0byB0aGUgY29uZmlndXJlZCBiYXNlIFVSTC5cbiAgICpcbiAgICogVW5kZWZpbmVkIGFuZCBudWxsIHF1ZXJ5IHBhcmFtcyBhcmUgb21pdHRlZC4gVmFsdWVzIGFyZSBzdHJpbmdpZmllZC5cbiAgICpcbiAgICogQHBhcmFtIHBhdGggLSBSZWxhdGl2ZSBBUEkgcGF0aCB0byBhcHBlbmQgdG8gdGhlIGNvbmZpZ3VyZWQgYmFzZSBVUkwuXG4gICAqIEBwYXJhbSBwYXJhbXMgLSBPcHRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzIHRvIGVuY29kZSBvbnRvIHRoZSBVUkwuXG4gICAqIEByZXR1cm5zIEZ1bGx5LXF1YWxpZmllZCByZXF1ZXN0IFVSTCBzdHJpbmcuXG4gICAqL1xuICBwcml2YXRlIGJ1aWxkVXJsKHBhdGg6IHN0cmluZywgcGFyYW1zPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBzdHJpbmcge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocGF0aCwgdGhpcy5vcHRpb25zLmJhc2VVcmwpO1xuICAgIGlmIChwYXJhbXMpIHtcbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHBhcmFtcykpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICB1cmwuc2VhcmNoUGFyYW1zLnNldChrZXksIFN0cmluZyh2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1cmwudG9TdHJpbmcoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXcmFwcyBhIHJlcXVlc3Qgd2l0aCBjb25zaXN0ZW50IGVycm9yIGhhbmRsaW5nLlxuICAgKlxuICAgKiBAcGFyYW0gZm4gLSBBc3luYyByZXF1ZXN0IGZ1bmN0aW9uIHRvIGV4ZWN1dGUuXG4gICAqIEByZXR1cm5zIFRoZSByZXNvbHZlZCB2YWx1ZSBmcm9tIHRoZSByZXF1ZXN0IGZ1bmN0aW9uLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGEgbm9uLTJ4eCBzdGF0dXMuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIGZvciBuZXR3b3JrIGZhaWx1cmVzIG9yIHVuZXhwZWN0ZWQgZXhjZXB0aW9ucy5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcmVxdWVzdDxUPihmbjogKCkgPT4gUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgIGxldCBsYXN0VGltZW91dEVycm9yOiBOZXR3b3JrRXJyb3IgfCB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8PSBNQVhfVElNRU9VVF9SRVRSSUVTOyBhdHRlbXB0KyspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZuKCk7XG4gICAgICAgIHRoaXMub25SZXF1ZXN0U3VjY2VzcygpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgUmVzcG9uc2UpIHtcbiAgICAgICAgICAvLyBTZXJ2ZXIgcmVzcG9uZGVkIChldmVuIHdpdGggYW4gZXJyb3Igc3RhdHVzKSAtIGNvbm5lY3Rpb24gaXMgYWxpdmUsIHJlc2V0IGJhY2tvZmZcbiAgICAgICAgICB0aGlzLm9uUmVxdWVzdFN1Y2Nlc3MoKTtcbiAgICAgICAgICBsZXQgYm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgYm9keSA9IGF3YWl0IGVycm9yLmpzb24oKTtcbiAgICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yKSB7XG4gICAgICAgICAgICAvLyBTeW50YXhFcnJvciBpcyBleHBlY3RlZCB3aGVuIHNlcnZlciByZXR1cm5zIG5vbi1KU09OIGVycm9yIHJlc3BvbnNlIChlLmcuLCBIVE1MIGVycm9yIHBhZ2UpXG4gICAgICAgICAgICBpZiAoIShwYXJzZUVycm9yIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUud2FybignW0NhcmRzQ2xpZW50XSBVbmV4cGVjdGVkIGVycm9yIHBhcnNpbmcgZXJyb3IgcmVzcG9uc2U6JywgcGFyc2VFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPVxuICAgICAgICAgICAgKGJvZHlbJ2Vycm9yJ10gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCAoYm9keVsnbWVzc2FnZSddIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgZXJyb3Iuc3RhdHVzVGV4dDtcbiAgICAgICAgICBjb25zdCBjb2RlID0gKGJvZHlbJ2NvZGUnXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IFN0cmluZyhlcnJvci5zdGF0dXMpO1xuICAgICAgICAgIGNvbnN0IGZpZWxkcyA9IGJvZHlbJ2ZpZWxkcyddIGFzIEFycmF5PHsgZmllbGQ6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH0+IHwgdW5kZWZpbmVkO1xuICAgICAgICAgIHRocm93IG5ldyBBcGlFcnJvcihtZXNzYWdlLCBjb2RlLCBmaWVsZHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTmV0d29yayBvciB0aW1lb3V0IGZhaWx1cmUgLSBpbmNyZWFzZSBiYWNrb2ZmIGZvciBuZXh0IGF0dGVtcHRcbiAgICAgICAgdGhpcy5vblJlcXVlc3RGYWlsdXJlKCk7XG5cbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRE9NRXhjZXB0aW9uICYmIGVycm9yLm5hbWUgPT09ICdUaW1lb3V0RXJyb3InKSB7XG4gICAgICAgICAgbGFzdFRpbWVvdXRFcnJvciA9IG5ldyBOZXR3b3JrRXJyb3IoJ1JlcXVlc3QgdGltZWQgb3V0JywgZXJyb3IpO1xuICAgICAgICAgIC8vIFJldHJ5IG9uIHRpbWVvdXQgLSBvblJlcXVlc3RGYWlsdXJlKCkgYWxyZWFkeSBpbmNyZWFzZWQgX2N1cnJlbnRUaW1lb3V0TXNcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vbi10aW1lb3V0IG5ldHdvcmsgZXJyb3JzIChETlMgZmFpbHVyZSwgY29ubmVjdGlvbiByZWZ1c2VkKSBhcmUgbm90IHJldHJpZWRcbiAgICAgICAgdGhyb3cgbmV3IE5ldHdvcmtFcnJvcignUmVxdWVzdCBmYWlsZWQnLCBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFsbCByZXRyeSBhdHRlbXB0cyBleGhhdXN0ZWRcbiAgICB0aHJvdyBsYXN0VGltZW91dEVycm9yITtcbiAgfVxuXG4gIC8vIC0tLSBDYXJkIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIExpc3RzIGNhcmRzIHdpdGggb3B0aW9uYWwgZmlsdGVyaW5nLlxuICAgKlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIGZpbHRlciBhbmQgcGFnaW5hdGlvbiBvcHRpb25zLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBtYXRjaGluZyBjYXJkcy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdENhcmRzKG9wdGlvbnM/OiBMaXN0Q2FyZHNPcHRpb25zKTogUHJvbWlzZTxDYXJkW10+IHtcbiAgICBjb25zdCB1cmxTdHIgPSB0aGlzLmJ1aWxkVXJsKCcvY2FyZHMnLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aCxcbiAgICAgIHN0YXR1czogb3B0aW9ucz8uc3RhdHVzLFxuICAgICAgc2VhcmNoOiBvcHRpb25zPy5zZWFyY2gsXG4gICAgICBsaW1pdDogb3B0aW9ucz8ubGltaXQsXG4gICAgICBvZmZzZXQ6IG9wdGlvbnM/Lm9mZnNldFxuICAgIH0pO1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwodXJsU3RyKTtcbiAgICBmb3IgKGNvbnN0IHQgb2Ygb3B0aW9ucz8udGFncyA/PyBbXSkge1xuICAgICAgdXJsLnNlYXJjaFBhcmFtcy5hcHBlbmQoJ3RhZycsIHQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDYXJkW10+KHVybC50b1N0cmluZygpKSk7XG4gIH1cblxuICAvKipcbiAgICogTGlzdHMgY2FyZHMgYXMgbGlnaHR3ZWlnaHQgc3VtbWFyaWVzIGZvciBsaXN0IHZpZXdzLlxuICAgKlxuICAgKiBSZXR1cm5zIHByZS1mbGF0dGVuZWQgZmllbGRzIHN1aXRhYmxlIGZvciBkaXJlY3QgdXNlIGluIGxpc3QgcmVuZGVyaW5nLFxuICAgKiBvbWl0dGluZyBoZWF2eXdlaWdodCBmaWVsZHMgbGlrZSBgcGxhbkNvbnRlbnRgIGFuZCBgcmVwb3NpdG9yeVBhdGhgLlxuICAgKlxuICAgKiBAdGVtcGxhdGUgVCAtIFRoZSBleHBlY3RlZCBzdW1tYXJ5IHNoYXBlIChkZWZhdWx0IGBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPmApLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjYXJkIHN1bW1hcmllcy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdENhcmRTdW1tYXJpZXM8VCA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpOiBQcm9taXNlPFRbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcy9saXN0Jywge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxUW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYSBzaW5nbGUgY2FyZCBieSBpZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENhcmQoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCwge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDYXJkPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIC0gQ2FyZCBjcmVhdGlvbiBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3JlYXRlZCBjYXJkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBwYXlsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBjcmVhdGVDYXJkKGRhdGE6IENhcmRDcmVhdGVEYXRhKTogUHJvbWlzZTxDYXJkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NhcmRzJyk7XG4gICAgY29uc3QgYm9keSA9IHtcbiAgICAgIC4uLmRhdGEsXG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENhcmQ+KHVybCwgYm9keSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgYW4gZXhpc3RpbmcgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byB1cGRhdGUuXG4gICAqIEBwYXJhbSBkYXRhIC0gVGhlIGZpZWxkcyB0byB1cGRhdGUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSB1cGRhdGVkIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ2FyZChjYXJkSWQ6IHN0cmluZywgZGF0YTogQ2FyZFVwZGF0ZURhdGEpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wYXRjaDxDYXJkPih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGVzIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byBkZWxldGUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gZGVsZXRpb24gaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGRlbGV0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgZGVsZXRlQ2FyZChjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21tZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGNvbW1lbnRzIGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSB0YXJnZXQgY2FyZCBmb3IgdGhpcyByZXF1ZXN0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tbWVudCBsaXN0LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21tZW50cyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8Q29tbWVudFtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENvbW1lbnRbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhIHNpbmdsZSBjb21tZW50IGJ5IGlkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIHJlcXVlc3RlZCBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNvbW1lbnQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21tZW50PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50cy8ke2NvbW1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21tZW50Pih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGNvbW1lbnQgb24gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IHdpbGwgcmVjZWl2ZSB0aGUgbmV3IGNvbW1lbnQuXG4gICAqIEBwYXJhbSBkYXRhIC0gQ29tbWVudCBjcmVhdGlvbiBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3JlYXRlZCBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBwYXlsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBjcmVhdGVDb21tZW50KGNhcmRJZDogc3RyaW5nLCBkYXRhOiBDb21tZW50Q3JlYXRlRGF0YSk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tbWVudD4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBhbiBleGlzdGluZyBjb21tZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIGNvbW1lbnQuXG4gICAqIEBwYXJhbSBjb21tZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjb21tZW50IHRvIHVwZGF0ZS5cbiAgICogQHBhcmFtIGRhdGEgLSBDb21tZW50IHVwZGF0ZSBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgdXBkYXRlZCBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZUNvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nLCBkYXRhOiBDb21tZW50VXBkYXRlRGF0YSk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHMvJHtjb21tZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wYXRjaDxDb21tZW50Pih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGVzIGEgY29tbWVudC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byByZW1vdmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gZGVsZXRpb24gaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGRlbGV0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgZGVsZXRlQ29tbWVudChjYXJkSWQ6IHN0cmluZywgY29tbWVudElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEF0dGFjaG1lbnQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogVXBsb2FkcyBhbiBhdHRhY2htZW50IHRvIGEgY2FyZCB1c2luZyBiaW5hcnkgUFVULlxuICAgKlxuICAgKiBUaGlzIGlzIHRoZSBwcmVmZXJyZWQgbWV0aG9kIC0gc2VuZHMgcmF3IGJpbmFyeSBkYXRhIGRpcmVjdGx5IHdpdGhvdXRcbiAgICogYmFzZTY0IGVuY29kaW5nLCByZXN1bHRpbmcgaW4gMzMlIHNtYWxsZXIgcGF5bG9hZHMuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgd2lsbCByZWNlaXZlIHRoZSBhdHRhY2htZW50LlxuICAgKiBAcGFyYW0gbmFtZSAtIEZpbGUgbmFtZSBpbmNsdWRpbmcgZXh0ZW5zaW9uLlxuICAgKiBAcGFyYW0gZGF0YSAtIEJpbmFyeSBkYXRhIGFzIEJsb2IsIEFycmF5QnVmZmVyLCBvciBiYXNlNjQgc3RyaW5nLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhdHRhY2htZW50IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGxvYWQuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIHVwbG9hZEF0dGFjaG1lbnQoY2FyZElkOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZGF0YTogQmxvYiB8IEFycmF5QnVmZmVyIHwgc3RyaW5nKTogUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2F0dGFjaG1lbnRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpfWApO1xuXG4gICAgLy8gQ29udmVydCBkYXRhIHRvIEJsb2IgZm9yIGZldGNoIGJvZHlcbiAgICBsZXQgYm9keTogQmxvYjtcbiAgICBpZiAoZGF0YSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgIGJvZHkgPSBkYXRhO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICBib2R5ID0gbmV3IEJsb2IoW2RhdGFdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYmFzZTY0IHN0cmluZyAtIGRlY29kZSB0byBiaW5hcnlcbiAgICAgIGNvbnN0IGJpbmFyeVN0cmluZyA9IGF0b2IoZGF0YSk7XG4gICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJpbmFyeVN0cmluZy5sZW5ndGgpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBiaW5hcnlTdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYnl0ZXNbaV0gPSBiaW5hcnlTdHJpbmcuY2hhckNvZGVBdChpKTtcbiAgICAgIH1cbiAgICAgIGJvZHkgPSBuZXcgQmxvYihbYnl0ZXNdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAuLi50aGlzLmdldEhlYWRlcnMoKSxcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSdcbiAgICAgICAgfSxcbiAgICAgICAgYm9keSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2U+O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERvd25sb2FkcyBhbiBhdHRhY2htZW50IGFzIGEgQmxvYi5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgdXNlcyBgZmV0Y2hgIGRpcmVjdGx5IHNvIGJpbmFyeSBkYXRhIGlzIHByZXNlcnZlZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBhdHRhY2htZW50LlxuICAgKiBAcGFyYW0gYXR0YWNobWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgYXR0YWNobWVudCBibG9iIHRvIGRvd25sb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhbiBhdHRhY2htZW50IEJsb2IuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldEF0dGFjaG1lbnQoY2FyZElkOiBzdHJpbmcsIGF0dGFjaG1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTxCbG9iPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50cy8ke2F0dGFjaG1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIGhlYWRlcnM6IHRoaXMuZ2V0SGVhZGVycygpLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbCgpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0cyBhdHRhY2htZW50cyBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBhdHRhY2htZW50cyBzaG91bGQgYmUgbGlzdGVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhdHRhY2htZW50IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0QXR0YWNobWVudHMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPEF0dGFjaG1lbnRSZXNwb25zZVtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEF0dGFjaG1lbnRSZXNwb25zZVtdPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBUaW1lbGluZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHRpbWVsaW5lIGVudHJpZXMgZm9yIGEgY2FyZCB3aXRoIG9wdGlvbmFsIHBhZ2luYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHRpbWVsaW5lIGVudHJpZXMgc2hvdWxkIGJlIHJldHVybmVkLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhZ2luYXRpb24gY29udHJvbHMuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRpbWVsaW5lIGVudHJpZXMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFRpbWVsaW5lKGNhcmRJZDogc3RyaW5nLCBvcHRpb25zPzogVGltZWxpbmVPcHRpb25zKTogUHJvbWlzZTxUaW1lbGluZUl0ZW1bXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vdGltZWxpbmVgLCB7XG4gICAgICBiZWZvcmU6IG9wdGlvbnM/LmJlZm9yZSxcbiAgICAgIGxpbWl0OiBvcHRpb25zPy5saW1pdFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFRpbWVsaW5lSXRlbVtdPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBQbGFuIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIHBsYW4gZG9jdW1lbnQgZm9yIGEgY2FyZCBhcyBtYXJrZG93bi5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgcGxhbiBtYXJrZG93biBzaG91bGQgYmUgcmV0dXJuZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHBsYW4gbWFya2Rvd24uXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIC8qKlxuICAgKiBXcml0ZXMgYSBmaWxlIHRvIGEgY2FyZCByZXBvc2l0b3J5LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSByZXBvc2l0b3J5IHNob3VsZCByZWNlaXZlIHRoZSBmaWxlLlxuICAgKiBAcGFyYW0gZmlsZVBhdGggLSBSZWxhdGl2ZSBwYXRoIHdpdGhpbiB0aGUgY2FyZCByZXBvIChlLmcuIGBQTEFOLm1kYCwgYGZvby9CQVIubWRgKS5cbiAgICogQHBhcmFtIGNvbnRlbnQgLSBGaWxlIGNvbnRlbnQgdG8gd3JpdGUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGZpbGUgaXMgc2F2ZWQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHdyaXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBwdXRGaWxlKGNhcmRJZDogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2ZzLyR7ZmlsZVBhdGh9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wdXQ8dm9pZD4odXJsLCBjb250ZW50KSk7XG4gIH1cblxuICAvLyAtLS0gR2F0ZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBBcHByb3ZlcyBhIGdhdGUgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgZ2F0ZSBzdGF0ZSBzaG91bGQgYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIGdhdGVOYW1lIC0gR2F0ZSBuYW1lIHRvIGFwcHJvdmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGdhdGUgYXBwcm92YWwgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGFwcHJvdmFsLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBhcHByb3ZlR2F0ZShjYXJkSWQ6IHN0cmluZywgZ2F0ZU5hbWU6ICdwbGFuJyB8ICdtZXJnZVJlcXVlc3QnKTogUHJvbWlzZTxHYXRlQXBwcm92YWxSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vZ2F0ZXMvJHtnYXRlTmFtZX0vYXBwcm92ZWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxHYXRlQXBwcm92YWxSZXNwb25zZT4odXJsLCB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21taXQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgY29tbWl0cyBhc3NvY2lhdGVkIHdpdGggYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBjb21taXRzIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gY29tbWl0IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21taXRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21taXRJbmZvW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21taXRJbmZvW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBjb21taXQgdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBhc3NvY2lhdGUgd2l0aCB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjb21taXQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgYWRkQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZyk6IFByb21pc2U8Q29tbWl0SW5mbz4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21taXRJbmZvPih1cmwsIHsgc2hhIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY29tbWl0IGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBkZXRhY2ggZnJvbSB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSBvcHRpb25zLnNlc3Npb25JZCAtIENsYXVkZSBDb2RlIHNlc3Npb24gSUQgZm9yd2FyZGVkIGFzIGBYLUNhcmRzLVNlc3Npb24tSWRgIGhlYWRlciBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHJlbW92YWwgaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgcmVtb3ZlQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZywgb3B0aW9ucz86IHsgc2Vzc2lvbklkPzogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHMvJHtzaGF9YCk7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtQ2FyZHMtU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCwgeyBoZWFkZXJzIH0pKTtcbiAgfVxuXG4gIC8vIC0tLSBCcmFuY2ggT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYnJhbmNoZXMgdHJhY2tlZCBvbiBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBVbmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBicmFuY2hlcyB0byByZXRyaWV2ZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gb3B0aW9ucy53b3Jrc3BhY2VQYXRoIC0gV29ya3NwYWNlIHBhdGggZm9yIGNvbXB1dGluZyBpc01lcmdlZCBhbmQgY29tbWl0IGNvbnRhaW5tZW50LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBicmFuY2hlcyByZXNwb25zZS5cbiAgICovXG4gIGFzeW5jIGdldEJyYW5jaGVzKGNhcmRJZDogc3RyaW5nLCBvcHRpb25zPzogeyB3b3Jrc3BhY2VQYXRoPzogc3RyaW5nIH0pOiBQcm9taXNlPEJyYW5jaGVzUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzYCwge1xuICAgICAgd29ya3NwYWNlUGF0aDogb3B0aW9ucz8ud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEJyYW5jaGVzUmVzcG9uc2U+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBicmFuY2ggdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gYWRkIHRoZSBicmFuY2ggdG8uXG4gICAqIEBwYXJhbSBkYXRhIC0gQnJhbmNoIGRhdGEgaW5jbHVkaW5nIG5hbWUgYW5kIG9wdGlvbmFsIHdvcmt0cmVlIHBhdGguXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgcGFyYW1ldGVycy5cbiAgICogQHBhcmFtIG9wdGlvbnMuc2Vzc2lvbklkIC0gQ2xhdWRlIENvZGUgc2Vzc2lvbiBJRCBmb3J3YXJkZWQgYXMgYFgtQ2FyZHMtU2Vzc2lvbi1JZGAgaGVhZGVyIHNvIHRoZSBjYXJkIHJlcG8gcG9zdC1jb21taXQgaG9vayBjYW4gYXR0cmlidXRlIHRoZSBjb21taXQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGJyYW5jaCBpcyBhZGRlZC5cbiAgICovXG4gIGFzeW5jIGFkZEJyYW5jaChjYXJkSWQ6IHN0cmluZywgZGF0YTogQWRkQnJhbmNoUmVxdWVzdCwgb3B0aW9ucz86IHsgc2Vzc2lvbklkPzogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzYCk7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtQ2FyZHMtU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PHVua25vd24+KHVybCwgZGF0YSwgeyBoZWFkZXJzIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgYnJhbmNoIGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gcmVtb3ZlIHRoZSBicmFuY2ggZnJvbS5cbiAgICogQHBhcmFtIG5hbWUgLSBCcmFuY2ggbmFtZSB0byByZW1vdmUgKHdpbGwgYmUgVVJMLWVuY29kZWQpLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSBvcHRpb25zLnNlc3Npb25JZCAtIENsYXVkZSBDb2RlIHNlc3Npb24gSUQgZm9yd2FyZGVkIGFzIGBYLUNhcmRzLVNlc3Npb24tSWRgIGhlYWRlciBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBicmFuY2ggaXMgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHJlbW92ZUJyYW5jaChjYXJkSWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBvcHRpb25zPzogeyBzZXNzaW9uSWQ/OiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYnJhbmNoZXMvJHtlbmNvZGVVUklDb21wb25lbnQobmFtZSl9YCk7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtQ2FyZHMtU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCwgeyBoZWFkZXJzIH0pKTtcbiAgfVxuXG4gIC8vIC0tLSBUYWcgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYXZhaWxhYmxlIHRhZ3MuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRhZyBzdHJpbmdzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUYWdzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvdGFncycsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8c3RyaW5nW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEVudmlyb25tZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEZldGNoZXMgYXZhaWxhYmxlIGFnZW50IGVudmlyb25tZW50cy5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gZW52aXJvbm1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldEVudmlyb25tZW50cygpOiBQcm9taXNlPEFycmF5PHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbj86IHN0cmluZyB9Pj4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9lbnZpcm9ubWVudHMnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxBcnJheTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmcgfT4+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFR5cGUgU2NoZW1hIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgdHlwZSBzY2hlbWFzIGFuZCBkZXNjcmlwdGlvbnMgZm9yIGEgY2FyZCdzIGVudmlyb25tZW50LlxuICAgKlxuICAgKiBSZXR1cm5zIG1ldGFkYXRhIGFib3V0IGVhY2ggcmVnaXN0ZXJlZCB0eXBlIGluIHRoZSBjYXJkJ3MgZW52aXJvbm1lbnQsXG4gICAqIGluY2x1ZGluZyB2ZXJzaW9uLCBzY2hlbWEsIGFuZCBkZXNjcmlwdGlvbi4gQ29tbWFuZCBkZXRhaWxzIGFyZSBleGNsdWRlZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgdHlwZSBzY2hlbWEgbWV0YWRhdGEgc2hvdWxkIGJlIGZldGNoZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHR5cGUgc2NoZW1hIGluZm9ybWF0aW9uLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUeXBlU2NoZW1hcyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8VHlwZVNjaGVtYXNSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vc2NoZW1hYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8VHlwZVNjaGVtYXNSZXNwb25zZT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gU3RyZWFtIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIExpc3RzIGFsbCBzdHJlYW1zIGF0dGFjaGVkIHRvIGEgY2FyZCwgc29ydGVkIGJ5IGNyZWF0aW9uIHRpbWUuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIElEIHRvIHF1ZXJ5LlxuICAgKiBAcmV0dXJucyBTdHJlYW0gbWV0YWRhdGEgYXJyYXkgKG1heSBiZSBlbXB0eSkuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IgKGUuZy4sIDQwNCBmb3IgdW5rbm93biBjYXJkKS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdFN0cmVhbXMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPFN0cmVhbU1ldGFbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vc3RyZWFtc2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFN0cmVhbU1ldGFbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIGEgc3RyZWFtJ3MgbWV0YWRhdGEgYW5kIGFsbCByYXcgbGluZXMuXG4gICAqXG4gICAqIFRoZSBgc3RyZWFtVHlwZWAgYW5kIGBmaWxlbmFtZWAgYXJlIFVSSS1lbmNvZGVkIGF1dG9tYXRpY2FsbHkuIEZvciBjb21wbGV0ZWRcbiAgICogc3RyZWFtcyB0aGUgcmV0dXJuZWQgYGxpbmVzYCBhcnJheSBpcyB0aGUgZnVsbCBjb250ZW50OyBmb3IgYWN0aXZlIHN0cmVhbXMgaXRcbiAgICogaXMgYSBzbmFwc2hvdCB0aGF0IG1heSBncm93IHdoaWxlIHRoZSBjYWxsZXIgcHJvY2Vzc2VzIGl0LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIHJlcXVlc3RlZCBzdHJlYW0uXG4gICAqIEBwYXJhbSBzdHJlYW1UeXBlIC0gU3RyZWFtIHR5cGUga2V5IChlLmcuLCBgXCJjbGF1ZGUtY29kZS1zZXNzaW9uXCJgKS5cbiAgICogQHBhcmFtIGZpbGVuYW1lIC0gU3RyZWFtIGZpbGVuYW1lIChlLmcuLCBgXCJzZXNzaW9uLmxvZ1wiYCkuXG4gICAqIEByZXR1cm5zIE1ldGFkYXRhIGFuZCBjb250ZW50IGxpbmVzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIG9uIDQwNCAodW5rbm93biBjYXJkIG9yIHN0cmVhbSkgb3Igb3RoZXIgc2VydmVyIGVycm9ycy5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0U3RyZWFtKFxuICAgIGNhcmRJZDogc3RyaW5nLFxuICAgIHN0cmVhbVR5cGU6IHN0cmluZyxcbiAgICBmaWxlbmFtZTogc3RyaW5nXG4gICk6IFByb21pc2U8eyBtZXRhOiBTdHJlYW1NZXRhOyBsaW5lczogc3RyaW5nW10gfT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoXG4gICAgICBgL2NhcmRzLyR7Y2FyZElkfS9zdHJlYW1zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHN0cmVhbVR5cGUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlbmFtZSl9YFxuICAgICk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8eyBtZXRhOiBTdHJlYW1NZXRhOyBsaW5lczogc3RyaW5nW10gfT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgYSBjaHVua2VkIEpTT05MIHN0cmVhbSB0byB0aGUgc2VydmVyIGFuZCByZXR1cm5zIGEgd3JpdGVyLlxuICAgKlxuICAgKiBUaGUgd3JpdGVyIHNlbmRzIGVhY2ggbGluZSBpbiByZWFsLXRpbWUgb3ZlciBhIHNpbmdsZSBIVFRQIFBPU1QgdXNpbmcgYVxuICAgKiBgUmVhZGFibGVTdHJlYW1gIGJvZHkuIENhbGwge0BsaW5rIFN0cmVhbVdyaXRlci5jbG9zZX0gd2hlbiB0aGUgcHJvZHVjZXJcbiAgICogaXMgZmluaXNoZWQgdG8gZW5kIHRoZSByZXF1ZXN0IGFuZCByZXRyaWV2ZSB0aGUgc2VydmVyJ3Mgc3VtbWFyeS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIENhcmQgSUQgdG8gYXR0YWNoIHRoZSBzdHJlYW0gdG8uXG4gICAqIEBwYXJhbSBzdHJlYW1UeXBlIC0gU3RyZWFtIHR5cGUga2V5IGZyb20gc2V0dGluZ3MuanNvbiAoZS5nLiwgYFwiY2xhdWRlLWNvZGUtc2Vzc2lvblwiYCkuXG4gICAqIEBwYXJhbSBmaWxlbmFtZSAtIFN0cmVhbSBmaWxlbmFtZSAoZS5nLiwgYFwic2Vzc2lvbi1hYmMuanNvbmxcImApLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHRpdGxlIGFuZCBzZXNzaW9uIElEIG1ldGFkYXRhLlxuICAgKiBAcmV0dXJucyBBIHtAbGluayBTdHJlYW1Xcml0ZXJ9IGZvciBwdXNoaW5nIGxpbmVzIGFuZCBjbG9zaW5nIHRoZSBzdHJlYW0uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3Qgc3RyZWFtID0gY2xpZW50Lm9wZW5TdHJlYW0oY2FyZElkLCAnY2xhdWRlLWNvZGUtc2Vzc2lvbicsICdydW4uanNvbmwnKTtcbiAgICogc3RyZWFtLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2luaXQnIH0pKTtcbiAgICogc3RyZWFtLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ3Jlc3VsdCcgfSkpO1xuICAgKiBjb25zdCByZXN1bHQgPSBhd2FpdCBzdHJlYW0uY2xvc2UoKTtcbiAgICogYGBgXG4gICAqL1xuICBvcGVuU3RyZWFtKGNhcmRJZDogc3RyaW5nLCBzdHJlYW1UeXBlOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcsIG9wdGlvbnM/OiBTdHJlYW1Xcml0ZXJPcHRpb25zKTogU3RyZWFtV3JpdGVyIHtcbiAgICBjb25zdCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XG4gICAgbGV0IGNvbnRyb2xsZXIhOiBSZWFkYWJsZVN0cmVhbURlZmF1bHRDb250cm9sbGVyPFVpbnQ4QXJyYXk+O1xuXG4gICAgY29uc3QgYm9keSA9IG5ldyBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5Pih7XG4gICAgICBzdGFydChjKSB7XG4gICAgICAgIGNvbnRyb2xsZXIgPSBjO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChcbiAgICAgIGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXMvJHtlbmNvZGVVUklDb21wb25lbnQoc3RyZWFtVHlwZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVuYW1lKX1gXG4gICAgKTtcblxuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtbmRqc29uJ1xuICAgIH07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbikge1xuICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke3RoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbn1gO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucz8udGl0bGUpIHtcbiAgICAgIGhlYWRlcnNbJ1gtU3RyZWFtLVRpdGxlJ10gPSBvcHRpb25zLnRpdGxlO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucz8uc2Vzc2lvbklkKSB7XG4gICAgICBoZWFkZXJzWydYLVN0cmVhbS1TZXNzaW9uLUlkJ10gPSBvcHRpb25zLnNlc3Npb25JZDtcbiAgICB9XG5cbiAgICAvLyBgZHVwbGV4OiAnaGFsZidgIGlzIHJlcXVpcmVkIGJ5IHVuZGljaSBmb3Igc3RyZWFtaW5nIHJlcXVlc3QgYm9kaWVzXG4gICAgLy8gYnV0IGlzIG5vdCB5ZXQgaW4gdGhlIHN0YW5kYXJkIGxpYi5kb20gUmVxdWVzdEluaXQgdHlwZS5cbiAgICBjb25zdCBmZXRjaE9wdGlvbnM6IFJlcXVlc3RJbml0ICYgeyBkdXBsZXg6IHN0cmluZyB9ID0ge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzLFxuICAgICAgYm9keSxcbiAgICAgIGR1cGxleDogJ2hhbGYnXG4gICAgfTtcblxuICAgIGNvbnN0IHJlc3BvbnNlUHJvbWlzZSA9IGZldGNoKHVybCwgZmV0Y2hPcHRpb25zKTtcblxuICAgIC8vIFRyYWNrIGVhcmx5IHJlamVjdGlvbiBmcm9tIHRoZSBzZXJ2ZXIgKGUuZy4gNDA5IFwiU3RyZWFtIGFscmVhZHlcbiAgICAvLyBleGlzdHMgYW5kIGlzIGFjdGl2ZVwiKS4gIEZvciBhIHN1Y2Nlc3NmdWwgc3RyZWFtIHRoZSByZXNwb25zZSBzdGF5c1xuICAgIC8vIHBlbmRpbmcgdW50aWwgY2xvc2UoKSBlbmRzIHRoZSBib2R5IFx1MjAxNCBidXQgZXJyb3IgcmVzcG9uc2VzIGFycml2ZVxuICAgIC8vIGltbWVkaWF0ZWx5IGFuZCBtdXN0IGJlIHN1cmZhY2VkIHdpdGhvdXQgd2FpdGluZyBmb3IgY2xvc2UoKS5cbiAgICAvLyBOb3RlOiBvbmx5IHJlYWRzIHJlc3BvbnNlLm9rL3N0YXR1c1RleHQgKG5vdCB0aGUgYm9keSkgc28gY2xvc2UoKVxuICAgIC8vIGNhbiBzdGlsbCBwYXJzZSB0aGUgZnVsbCBlcnJvciByZXNwb25zZS5cbiAgICBsZXQgZWFybHlFcnJvcjogRXJyb3IgfCBudWxsID0gbnVsbDtcbiAgICByZXNwb25zZVByb21pc2VcbiAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgZWFybHlFcnJvciA9IG5ldyBBcGlFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0LCBTdHJpbmcocmVzcG9uc2Uuc3RhdHVzKSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycjogdW5rbm93bikgPT4ge1xuICAgICAgICBlYXJseUVycm9yID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIgOiBuZXcgRXJyb3IoU3RyaW5nKGVycikpO1xuICAgICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgd3JpdGUobGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGlmIChlYXJseUVycm9yKSB0aHJvdyBlYXJseUVycm9yO1xuICAgICAgICBjb250cm9sbGVyLmVucXVldWUoZW5jb2Rlci5lbmNvZGUoYCR7bGluZX1cXG5gKSk7XG4gICAgICB9LFxuICAgICAgY2xvc2U6IGFzeW5jICgpOiBQcm9taXNlPFN0cmVhbVJlc3VsdD4gPT4ge1xuICAgICAgICBjb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVzcG9uc2VQcm9taXNlO1xuICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxTdHJlYW1SZXN1bHQ+O1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLy8gLS0tIEFjdGlvbiBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlcyBhbiBhY3Rpb24gb24gYSBjYXJkIHZpYSB0aGUgc2VydmVyIHJlbGF5LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBleGVjdXRlIHRoZSBhY3Rpb24gb24uXG4gICAqIEBwYXJhbSBhY3Rpb25OYW1lIC0gQWN0aW9uIGlkZW50aWZpZXIgKGUuZy4sICdsYXVuY2gnKS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGFjdGlvbiBleGVjdXRpb24gcmVzdWx0LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSByZXF1ZXN0LlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBleGVjdXRlQWN0aW9uKGNhcmRJZDogc3RyaW5nLCBhY3Rpb25OYW1lOiBzdHJpbmcpOiBQcm9taXNlPEFjdGlvblJlc3VsdD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYWN0aW9ucy8ke2VuY29kZVVSSUNvbXBvbmVudChhY3Rpb25OYW1lKX1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8QWN0aW9uUmVzdWx0Pih1cmwsIHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgLy8gLS0tIENvbXBhcmUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogU2V0cyBvciByZXBsYWNlcyB0aGUgYWN0aXZlIGNvbXBhcmlzb24gb24gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIHJlcXVlc3QgLSBDb21wYXJlIHJlcXVlc3Qgc3BlY2lmeWluZyB0aGUgY29tcGFyaXNvbiBtb2RlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgcmVzdWx0aW5nIGNvbXBhcmUgc3RhdGUuXG4gICAqL1xuICBhc3luYyBzZXRDb21wYXJlKHJlcXVlc3Q6IENvbXBhcmVSZXF1ZXN0KTogUHJvbWlzZTxDb21wYXJlU3RhdGU+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY29tcGFyZScpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21wYXJlU3RhdGU+KHVybCwgcmVxdWVzdCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGN1cnJlbnQgY29tcGFyZSBzdGF0ZSwgb3IgbnVsbCBpZiBubyBjb21wYXJpc29uIGlzIGFjdGl2ZS5cbiAgICpcbiAgICogVGhlIHNlcnZlciByZXR1cm5zIDIwNCB3aGVuIG5vIGNvbXBhcmlzb24gaXMgYWN0aXZlLCB3aGljaCB0aGlzIG1ldGhvZFxuICAgKiBtYXBzIHRvIG51bGwgcmF0aGVyIHRoYW4gdGhyb3dpbmcuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjdXJyZW50IGNvbXBhcmUgc3RhdGUsIG9yIG51bGwgaWYgbm9uZSBhY3RpdmUuXG4gICAqL1xuICBhc3luYyBnZXRDb21wYXJlKCk6IFByb21pc2U8Q29tcGFyZVN0YXRlIHwgbnVsbD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jb21wYXJlJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBoZWFkZXJzOiB0aGlzLmdldEhlYWRlcnMoKSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbCgpXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwNCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPENvbXBhcmVTdGF0ZT47XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXJzIHRoZSBhY3RpdmUgY29tcGFyaXNvbiBvbiB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBjb21wYXJpc29uIGlzIGNsZWFyZWQuXG4gICAqL1xuICBhc3luYyBjbGVhckNvbXBhcmUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NvbXBhcmUnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxufVxuIiwgIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucy5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgaW5qZWN0cyBhY3Rpb24gaW5wdXRzIHZpYSBwcm9jZXNzLmVudi5cbiAqIFRoaXMgbW9kdWxlIHByb3ZpZGVzIHN0cmljdCBnZXR0ZXJzIGFuZCB0eXBlZCBleHRyYWN0b3JzIHNvIGhhbmRsZXJzIGRvIG5vdFxuICogbmVlZCB0byBwYXJzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgbWFudWFsbHkuXG4gKlxuICogVXNlIHRoZSBpbmRpdmlkdWFsIGdldHRlcnMgd2hlbiB5b3Ugb25seSBuZWVkIG9uZSB2YWx1ZTsgdXNlXG4gKiB7QGxpbmsgZXh0cmFjdEFjdGlvbklucHV0fSB3aGVuIHlvdSBuZWVkIGEgZnVsbCB0eXBlZCBwYXlsb2FkIGZvciBhbiBhY3Rpb24uXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnNcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uSW5wdXQsIENhcmRzQXNzaXN0YW50SW5wdXQgfSBmcm9tICcuL2lucHV0cy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVzIHNldCBieSB0aGUgQ2FyZHMgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKlxuICogVGhpcyBpcyB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCBmb3IgZW52IHZhciBrZXlzIHVzZWQgYnkgYWN0aW9uIGFuZCB0eXBlXG4gKiBob29rIHByb2Nlc3Nlcy4gS2VlcCBpdCBpbiBzeW5jIHdpdGggdGhlIHdyYXBwZXIgdG8gYXZvaWQgc3VidGxlIFwidW5kZWZpbmVkXG4gKiBpbnB1dFwiIGJ1Z3MuXG4gKi9cbmV4cG9ydCBjb25zdCBDQVJEU19FTlZfVkFSUyA9IHtcbiAgLyoqXG4gICAqIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgY3VycmVudCBjYXJkLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBDQVJEX0lEOiAnQ0FSRF9JRCcsXG5cbiAgLyoqXG4gICAqIFRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gc2V0dGluZ3MuanNvbi5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgRU5WSVJPTk1FTlQ6ICdFTlZJUk9OTUVOVCcsXG5cbiAgLyoqXG4gICAqIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIGJ1dHRvbiB0aGF0IHRyaWdnZXJlZCB0aGlzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEFDVElPTl9OQU1FOiAnQUNUSU9OX05BTUUnLFxuXG4gIC8qKlxuICAgKiBDYXJkJ3MgZXhlY3V0aW9uIG1vZGUsIGRldGVybWluaW5nIFVJIGludGVyYWN0aW9uIG1vZGVsLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIFZhbGlkIHZhbHVlczogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJ1xuICAgKi9cbiAgRVhFQ1VUSU9OX01PREU6ICdFWEVDVVRJT05fTU9ERScsXG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIE9wdGlvbmFsLlxuICAgKi9cbiAgQ09ESU5HX0FHRU5UOiAnQ09ESU5HX0FHRU5UJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgcHJvY2Vzcy5leGVjUGF0aGAgKHdpdGhcbiAgICogYEVMRUNUUk9OX1JVTl9BU19OT0RFPTFgKS4gQ29tbWFuZHMgaW4gc2V0dGluZ3MuanNvbiB1c2VcbiAgICogYCRWU0NPREVfTk9ERSAuL2Jpbi8uLi5gIHNvIHRoZXkgd29yayByZWdhcmRsZXNzIG9mXG4gICAqIHdoZXRoZXIgYG5vZGVgIGlzIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgVlNDT0RFX05PREU6ICdWU0NPREVfTk9ERScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXIgcnVubmluZyB0aGUgd3JhcHBlciBwcm9jZXNzLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIHdyYXBwZXIgZnJvbSBgcHJvY2Vzcy5leGVjUGF0aGAuIFVzZSBgJE5PREVgIGluIGVtYmVkZGVkXG4gICAqIGJhc2ggc3RhdGVtZW50cyB0byBpbnZva2UgTm9kZSBzY3JpcHRzIHBvcnRhYmx5LlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMuXG4gICAqL1xuICBOT0RFOiAnTk9ERScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFVuaXggZG9tYWluIHNvY2tldCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBTT0NLRVRfUEFUSDogJ1NPQ0tFVF9QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byBhIEpTT04gZmlsZSBjb250YWluaW5nIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmcm9tIGEgcHJldmlvdXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS4gT3B0aW9uYWwuXG4gICAqL1xuICBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIOiAnU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIHNldHRpbmdzIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQ09ORklHX1BBVEg6ICdDT05GSUdfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgd29ya3NwYWNlIHJvb3QgZGlyZWN0b3J5LlxuICAgKiBTZXQgYnkgdGhlIGFjdGlvbiBoYW5kbGVyIChlLmcuLCBsYXVuY2gudHMpIHRvIHRoZSB3b3JrdHJlZSBwYXRoLlxuICAgKiBBdmFpbGFibGUgaW4gaG9va3MgcnVubmluZyBpbnNpZGUgdGhlIGNsYXVkZSBDTEkuXG4gICAqL1xuICBXT1JLU1BBQ0VfUEFUSDogJ1dPUktTUEFDRV9QQVRIJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IChOT1QgYSB3b3JrdHJlZSkuXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyBjb25zdW1lZCBieSB0aGUgd3JhcHBlciBhbmQgd2F0Y2hlciBmb3JcbiAgICogZ2l0IG9wZXJhdGlvbnMgKHdvcmt0cmVlIHJlbW92YWwsIGJyYW5jaCBkZWxldGlvbikgdGhhdCBtdXN0IHJ1blxuICAgKiBhZ2FpbnN0IHRoZSBtYWluIHJlcG9zaXRvcnkuXG4gICAqL1xuICBSRVBPX1JPT1Q6ICdSRVBPX1JPT1QnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDQVJEX1JFUE9fUEFUSDogJ0NBUkRfUkVQT19QQVRIJyxcblxuICAvKipcbiAgICogUmVzb2x2ZWQgc2hlbGwgY29tbWFuZCBmb3IgdGhlIHdyYXBwZXIgdG8gc3Bhd24gYXMgdGhlIGFjdGlvbiBoYW5kbGVyLlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgY29uc3VtZWQgYnkgdGhlIHdyYXBwZXIgKG5vdCBieSBhY3Rpb24gaGFuZGxlcnMpLlxuICAgKi9cbiAgQUNUSU9OX0NPTU1BTkQ6ICdBQ1RJT05fQ09NTUFORCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggdGhhdCB0aGUgY2FyZCdzIHdvcmtzcGFjZSBicmFuY2ggd2lsbCBtZXJnZSBpbnRvLlxuICAgKiBSZXNvbHZlZCBmcm9tIHRoZSB3b3Jrc3BhY2UgSEVBRCBhdCBsYXVuY2ggdGltZS5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQkFTRV9CUkFOQ0g6ICdCQVNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggZnJvbSB3aGljaCB0aGUgY2FyZCdzIHdvcmtzcGFjZSBicmFuY2ggd2FzIGNyZWF0ZWQuXG4gICAqIE1heSBkaWZmZXIgZnJvbSBCQVNFX0JSQU5DSCB3aGVuIHRoZSB3b3JrdHJlZSB3YXMgY3JlYXRlZCBhZ2FpbnN0XG4gICAqIGEgZGlmZmVyZW50IHJlZiB0aGFuIHRoZSBjdXJyZW50IHdvcmtzcGFjZSBIRUFELlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBQQVJFTlRfQlJBTkNIOiAnUEFSRU5UX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggbmFtZSBmb3IgdGhlIGNhcmQncyB3b3Jrc3BhY2UgaW1wbGVtZW50YXRpb24uXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbiBhZnRlciByZXNvbHZpbmcgb3IgY3JlYXRpbmcgdGhlIHdvcmt0cmVlLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgV09SS1NQQUNFX0JSQU5DSDogJ1dPUktTUEFDRV9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBTZXNzaW9uIElEIHBlcnNpc3RlZCBieSB0aGUgc2Vzc2lvbi1zdGFydCBob29rIHZpYSBgcGVyc2lzdEVudlZhcmAuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBCYXNoIHRvb2wgc2hlbGwgZGVzY2VuZGFudHMgKGNvbW1hbmRzLCBnaXQgaG9va3MpIGFmdGVyXG4gICAqIHNlc3Npb24gc3RhcnQuIE5PVCBhdmFpbGFibGUgaW4gaG9va3Mgc3Bhd25lZCBkaXJlY3RseSBieSBDbGF1ZGUgQ29kZVxuICAgKiAoc3RvcCwgc2Vzc2lvbi1lbmQsIGV0Yy4pIFx1MjAxNCB0aG9zZSByZWNlaXZlIHRoZSBzZXNzaW9uIElEIHZpYSBob29rIGlucHV0LlxuICAgKlxuICAgKiBUaGUgY2FyZC1yZXBvIHBvc3QtY29tbWl0IGhvb2sgcmVhZHMgdGhpcyB0byByZWNvcmQgY29tbWl0cyBkaXJlY3RseVxuICAgKiB3aXRob3V0IG5lZWRpbmcgYSBwcm9jZXNzLXRyZWUgd2FsayBvciBQSUQgcmVnaXN0cnkgbG9va3VwLlxuICAgKi9cbiAgQ0FSRFNfU0VTU0lPTl9JRDogJ0NBUkRTX1NFU1NJT05fSUQnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBDbGF1ZGUgQ29kZSB0cmFuc2NyaXB0IEpTT05MIGZpbGUgZm9yIHRoZSBjdXJyZW50XG4gICAqIHNlc3Npb24uIFBlcnNpc3RlZCBieSB0aGUgc2Vzc2lvbi1zdGFydCBob29rIHZpYSBgcGVyc2lzdEVudlZhcmAuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBCYXNoIHRvb2wgc2hlbGwgZGVzY2VuZGFudHMgYWZ0ZXIgc2Vzc2lvbiBzdGFydC4gUmVhZCBieVxuICAgKiBhdHRhY2gtbW9kZSB3YXRjaGVyIHNwYXduIHRvIHRhcmdldCB0aGUgY29ycmVjdCB0cmFuc2NyaXB0IGZpbGUuXG4gICAqL1xuICBDQVJEU19UUkFOU0NSSVBUX1BBVEg6ICdDQVJEU19UUkFOU0NSSVBUX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBWUyBDb2RlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5LlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gICAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAgICogYXMgdGhlIHJ1bnRpbWUgcGx1Z2luIGRpcmVjdG9yeSAoYDxleHRlbnNpb25QYXRoPi9kaXN0L2NsYXVkZS9ydW50aW1lYCkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEVYVEVOU0lPTl9QQVRIOiAnRVhURU5TSU9OX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBTdGFibGUgc3ltbGluayBwYXRoIHRvIHRoZSBtYXJrZXRwbGFjZSBkaXJlY3RvcnkgaW5zaWRlIGdsb2JhbCBzdG9yYWdlLlxuICAgKlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlciBhdCBydW50aW1lIGZyb20gdGhlIHN5bWxpbmsgY3JlYXRlZCBkdXJpbmcgZXh0ZW5zaW9uXG4gICAqIGFjdGl2YXRpb24uIFRoaXMgcGF0aCBkb2VzIG5vdCBjaGFuZ2UgYWNyb3NzIGV4dGVuc2lvbiB1cGdyYWRlcywgdW5saWtlIHRoZVxuICAgKiB2ZXJzaW9uZWQgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBwYXRoLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqL1xuICBNQVJLRVRQTEFDRV9QQVRIOiAnTUFSS0VUUExBQ0VfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIENhcmRzIGhvb2tzIGxvZyBmaWxlLlxuICAgKlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlciBhdCBydW50aW1lLiBSZWFkIGJ5IHRoZSBMb2dnZXIgc2luZ2xldG9uXG4gICAqIGF0IGNvbnN0cnVjdGlvbiB0aW1lIHRvIGRldGVybWluZSB3aGVyZSBob29rIGV4ZWN1dGlvbiBsb2dzIGFyZSB3cml0dGVuLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBIT09LU19MT0dfRklMRTogJ0NBUkRTX0hPT0tTX0xPR19GSUxFJ1xufSBhcyBjb25zdDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW5kaXZpZHVhbCBHZXR0ZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogUmVhZHMgdGhlIGNhcmQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgYWx3YXlzIHNldHMgdGhpcyBmb3IgZXZlcnkgYWN0aW9uIGFuZCB0eXBlIGhvb2suXG4gKiBAcmV0dXJucyBUaGUgY3VycmVudCBjYXJkIElEXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfSUQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNhcmRJZCA9IGdldENhcmRJZCgpO1xuICogY29uc29sZS5sb2coYFByb2Nlc3NpbmcgY2FyZDogJHtjYXJkSWR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRJZCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfSURdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2YWx1ZSBtYXRjaGVzIHRoZSBlbnZpcm9ubWVudCBrZXkgaW4gc2V0dGluZ3MuanNvbiAoZS5nLiwgXCJkZWZhdWx0XCIsIFwic3RhZ2luZ1wiKS5cbiAqIEByZXR1cm5zIFRoZSBlbnZpcm9ubWVudCBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVOVklST05NRU5UIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZpcm9ubWVudCA9IGdldEVudmlyb25tZW50KCk7XG4gKiBjb25zb2xlLmxvZyhgRW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudmlyb25tZW50KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhY3Rpb24gYnV0dG9uIG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyB0aGUgZGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGhhbmRsZXIsIG1hdGNoaW5nXG4gKiB0aGUgYGFjdGlvbk5hbWVgIGZpZWxkIGZyb20gYGRlZmluZUFjdGlvbmAuXG4gKiBAcmV0dXJucyBEaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgY3VycmVudCBoYW5kbGVyIHJ1bi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQUNUSU9OX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFjdGlvbk5hbWUgPSBnZXRBY3Rpb25OYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgUnVubmluZyBhY3Rpb246ICR7YWN0aW9uTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aW9uTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZXhlY3V0aW9uIG1vZGUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogRGV0ZXJtaW5lcyB0aGUgVUkgaW50ZXJhY3Rpb24gbW9kZWwgZm9yIGFjdGlvbnMuXG4gKiBAcmV0dXJucyBUaGUgZXhlY3V0aW9uIG1vZGUgKCdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnKVxuICogQHRocm93cyBFcnJvciBpZiBFWEVDVVRJT05fTU9ERSBpcyBtaXNzaW5nLCBlbXB0eSwgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG1vZGUgPSBnZXRFeGVjdXRpb25Nb2RlKCk7XG4gKiBpZiAobW9kZSA9PT0gJ2ludGVyYWN0aXZlJykge1xuICogICAvLyBTaG93IHVzZXIgcHJvbXB0c1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeGVjdXRpb25Nb2RlKCk6ICdpbnRlcmFjdGl2ZScgfCAnYmFja2dyb3VuZCcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfWApO1xuICB9XG4gIGlmICh2YWx1ZSAhPT0gJ2ludGVyYWN0aXZlJyAmJiB2YWx1ZSAhPT0gJ2JhY2tncm91bmQnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9OiBleHBlY3RlZCAnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJywgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBPcHRpb25hbCB2YWx1ZSBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuIFdoZW4gc2V0LCBpbmRpY2F0ZXMgd2hpY2ggQUlcbiAqIGNvZGluZyBhc3Npc3RhbnQgdGhlIHVzZXIgcHJlZmVycy4gQWN0aW9ucyBjYW4gdXNlIHRoaXMgdG8gY3VzdG9taXplIGJlaGF2aW9yXG4gKiBvciBwcm9tcHRzIGZvciBkaWZmZXJlbnQgYWdlbnRzLlxuICogQHJldHVybnMgVGhlIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvZGluZ0FnZW50ID0gZ2V0Q29kaW5nQWdlbnQoKTtcbiAqIGlmIChjb2RpbmdBZ2VudCA9PT0gJ2NsYXVkZScpIHtcbiAqICAgLy8gQ3VzdG9taXplIGZvciBDbGF1ZGVcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29kaW5nQWdlbnQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT0RJTkdfQUdFTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIgcGF0aCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHNldCBieSB0aGUgZXh0ZW5zaW9uIGR1cmluZyBhY3RpdmF0aW9uIGFuZCBpbmplY3RlZCBpbnRvIGFsbFxuICogc3Bhd25lZCBhY3Rpb24vaG9vayBwcm9jZXNzZXMuIENvbmZpZ3VyYXRpb24gYXV0aG9ycyBjYW4gdXNlIGl0IHRvIGludm9rZVxuICogTm9kZS5qcyB3aXRob3V0IHJlbHlpbmcgb24gdGhlIHN5c3RlbSBQQVRILlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyXG4gKiBAdGhyb3dzIEVycm9yIGlmIFZTQ09ERV9OT0RFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBub2RlUGF0aCA9IGdldFZzY29kZU5vZGVQYXRoKCk7XG4gKiBleGVjRmlsZVN5bmMobm9kZVBhdGgsIFsnc2NyaXB0LmpzJ10pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRWc2NvZGVOb2RlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlZTQ09ERV9OT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlZTQ09ERV9OT0RFfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVW5peCBkb21haW4gc29ja2V0IHBhdGggZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICpcbiAqIEByZXR1cm5zIFVuaXggc29ja2V0IHBhdGggdXNlZCB0byBzZW5kIHJ1bnRpbWUgY29udHJvbCBtZXNzYWdlcy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgU09DS0VUX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U29ja2V0UGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcGF0aCB0byB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogVGhpcyBpcyBvcHRpb25hbCBcdTIwMTQgcmV0dXJucyB1bmRlZmluZWQgd2hlbiBub3Qgc2V0IChpLmUuLCB0aGUgYWN0aW9uXG4gKiB3YXMgbm90IHJlbGF1bmNoZWQgdmlhIHN3aXRjaFRvSW50ZXJhY3RpdmUpLlxuICpcbiAqIEByZXR1cm5zIFRoZSBmaWxlIHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YVBhdGgoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHNldHRpbmdzIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5IGNvbnRhaW5pbmcgZ2VuZXJhdGVkIHNldHRpbmdzIGFydGlmYWN0cy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09ORklHX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgd29ya3NwYWNlIHBhdGggc2V0IGJ5IHRoZSBhY3Rpb24gaGFuZGxlciAoZS5nLiwgdGhlIHdvcmt0cmVlIHBhdGgpLlxuICpcbiAqIFRoaXMgaXMgZm9yIGhvb2tzIHJ1bm5pbmcgaW5zaWRlIHRoZSBDbGF1ZGUgQ0xJLCAqKm5vdCoqIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKiBBY3Rpb24gaGFuZGxlcnMgc2hvdWxkIHVzZSB7QGxpbmsgZ2V0UmVwb1Jvb3R9IGluc3RlYWQuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgYWN0aXZlIHdvcmtzcGFjZSAvIHdvcmt0cmVlLlxuICogQHRocm93cyBFcnJvciBpZiBXT1JLU1BBQ0VfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRXb3Jrc3BhY2VQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBiYXNlIGJyYW5jaCB0aGF0IHRoZSB3b3Jrc3BhY2UgYnJhbmNoIHdpbGwgbWVyZ2UgaW50by5cbiAqXG4gKiBAcmV0dXJucyBCcmFuY2ggbmFtZSBzdHJpbmcuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEJBU0VfQlJBTkNIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEJhc2VCcmFuY2goKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5CQVNFX0JSQU5DSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5CQVNFX0JSQU5DSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHdvcmtzcGFjZSBicmFuY2ggbmFtZSBmb3IgdGhlIGNhcmQncyBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAcmV0dXJucyBCcmFuY2ggbmFtZSBzdHJpbmcuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFdPUktTUEFDRV9CUkFOQ0ggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29ya3NwYWNlQnJhbmNoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX0JSQU5DSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfQlJBTkNIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IHBhdGguXG4gKlxuICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IHVzZWQgYnkgYWN0aW9uIGhhbmRsZXJzIHRvIHJlc29sdmUgd29ya3RyZWVzXG4gKiBhbmQgcGVyZm9ybSBnaXQgb3BlcmF0aW9ucyBhZ2FpbnN0IHRoZSBtYWluIHJlcG9zaXRvcnkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IChOT1QgYSB3b3JrdHJlZSkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFJFUE9fUk9PVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXBvUm9vdCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlJFUE9fUk9PVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1R9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZXBvc2l0b3J5IGFzc29jaWF0ZWQgd2l0aCB0aGUgYWN0aXZlIGNhcmQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfUkVQT19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRSZXBvUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9jbGF1ZGUvcnVudGltZWApLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5LlxuICogQHRocm93cyBFcnJvciBpZiBFWFRFTlNJT05fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHRlbnNpb25QYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBzdGFibGUgbWFya2V0cGxhY2Ugc3ltbGluayBwYXRoIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyIGZyb20gdGhlIHN5bWxpbmsgY3JlYXRlZCBkdXJpbmcgZXh0ZW5zaW9uIGFjdGl2YXRpb24uXG4gKiBUaGlzIHBhdGggaXMgc3RhYmxlIGFjcm9zcyBleHRlbnNpb24gdXBncmFkZXMuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgbWFya2V0cGxhY2Ugc3ltbGluay5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgTUFSS0VUUExBQ0VfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRNYXJrZXRwbGFjZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5NQVJLRVRQTEFDRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLk1BUktFVFBMQUNFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIGFuZCBwYXJzZXMgdGhlIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmaWxlLlxuICpcbiAqIFdoZW4gYFNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhgIGlzIHNldCwgcmVhZHMgdGhlIGZpbGUgYXQgdGhhdCBwYXRoXG4gKiBhbmQgcGFyc2VzIGl0IGFzIEpTT04uIFJldHVybnMgdW5kZWZpbmVkIGlmIHRoZSBlbnYgdmFyIGlzIG5vdCBzZXQuXG4gKlxuICogQHJldHVybnMgVGhlIHBhcnNlZCBkYXRhLCBvciB1bmRlZmluZWQgaWYgdGhlIHBhdGggaXMgbm90IHNldFxuICogQHRocm93cyBFcnJvciBpZiB0aGUgZmlsZSBjYW5ub3QgYmUgcmVhZCBvciBjb250YWlucyBpbnZhbGlkIEpTT05cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSgpOiB1bmtub3duIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgZGF0YVBhdGggPSBnZXRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YVBhdGgoKTtcbiAgaWYgKGRhdGFQYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoZGF0YVBhdGgsICd1dGYtOCcpO1xuICByZXR1cm4gSlNPTi5wYXJzZShjb250ZW50KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVHlwZWQgSW5wdXQgRXh0cmFjdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEJ1aWxkcyBhIHR5cGVkIGFjdGlvbiBpbnB1dCBvYmplY3QgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogRXh0cmFjdHMgYWxsIGZpZWxkcyByZXF1aXJlZCBmb3IgYWN0aW9uIGhhbmRsZXJzLlxuICpcbiAqIEByZXR1cm5zIFR5cGVkIEFjdGlvbklucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGFuIGFjdGlvbiBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RBY3Rpb25JbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQuY2FyZElkKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmV4ZWN1dGlvbk1vZGUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QWN0aW9uSW5wdXQoKTogQWN0aW9uSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgYWN0aW9uTmFtZTogZ2V0QWN0aW9uTmFtZSgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIGV4ZWN1dGlvbk1vZGU6IGdldEV4ZWN1dGlvbk1vZGUoKSxcbiAgICBjb2RpbmdBZ2VudDogZ2V0Q29kaW5nQWdlbnQoKSxcbiAgICBzd2l0Y2hUb0ludGVyYWN0aXZlRGF0YTogcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCksXG4gICAgcmVwb1Jvb3Q6IGdldFJlcG9Sb290KCksXG4gICAgY2FyZFJlcG9QYXRoOiBnZXRDYXJkUmVwb1BhdGgoKSxcbiAgICBjb25maWdQYXRoOiBnZXRDb25maWdQYXRoKCksXG4gICAgZXh0ZW5zaW9uUGF0aDogZ2V0RXh0ZW5zaW9uUGF0aCgpLFxuICAgIG1hcmtldHBsYWNlUGF0aDogZ2V0TWFya2V0cGxhY2VQYXRoKClcbiAgfTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCBjYXJkcy1hc3Npc3RhbnQgaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIHRoZSBmaWVsZHMgcmVxdWlyZWQgZm9yIGNhcmRzLWFzc2lzdGFudCBoYW5kbGVycy4gVW5saWtlXG4gKiB7QGxpbmsgZXh0cmFjdEFjdGlvbklucHV0fSwgdGhpcyBkb2VzIG5vdCByZXF1aXJlIGNhcmQtc3BlY2lmaWMgZW52IHZhcnNcbiAqIChDQVJEX0lELCBBQ1RJT05fTkFNRSwgZXRjLikgc2luY2UgdGhlIGNhcmRzIGFzc2lzdGFudCBvcGVyYXRlcyBhdFxuICogd29ya3NwYWNlIHNjb3BlLlxuICpcbiAqIEByZXR1cm5zIFR5cGVkIENhcmRzQXNzaXN0YW50SW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RDYXJkc0Fzc2lzdGFudElucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5tYXJrZXRwbGFjZVBhdGgpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0Q2FyZHNBc3Npc3RhbnRJbnB1dCgpOiBDYXJkc0Fzc2lzdGFudElucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBtYXJrZXRwbGFjZVBhdGg6IGdldE1hcmtldHBsYWNlUGF0aCgpLFxuICAgIGV4dGVuc2lvblBhdGg6IGdldEV4dGVuc2lvblBhdGgoKSxcbiAgICBjb2RpbmdBZ2VudDogZ2V0Q29kaW5nQWdlbnQoKSxcbiAgICByZXBvUm9vdDogZ2V0UmVwb1Jvb3QoKVxuICB9O1xufVxuIiwgIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBhY2Nlc3MgdG8gQ2xhdWRlIENvZGUncyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHV0aWxpdGllc1xuICogZm9yIHBlcnNpc3RpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzIGluIFNlc3Npb25TdGFydCBob29rcy5cbiAqXG4gKiAjIyBFbnZpcm9ubWVudCBWYXJpYWJsZXNcbiAqXG4gKiBDbGF1ZGUgQ29kZSBzZXRzIHRoZXNlIGVudmlyb25tZW50IHZhcmlhYmxlcyB3aGVuIHJ1bm5pbmcgaG9va3M6XG4gKlxuICogfCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHwgQXZhaWxhYmxlIEluIHxcbiAqIHwtLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS18XG4gKiB8IGBDTEFVREVfUFJPSkVDVF9ESVJgIHwgQWJzb2x1dGUgcGF0aCB0byBwcm9qZWN0IHJvb3QgfCBBbGwgaG9va3MgfFxuICogfCBgQ0xBVURFX0VOVl9GSUxFYCB8IFBhdGggdG8gZmlsZSBmb3IgcGVyc2lzdGluZyBlbnYgdmFycyB8IFNlc3Npb25TdGFydCBvbmx5IHxcbiAqIHwgYENMQVVERV9DT0RFX1JFTU9URWAgfCBgXCJ0cnVlXCJgIGlmIHJ1bm5pbmcgcmVtb3RlbHkgfCBBbGwgaG9va3MgfFxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGdldFByb2plY3REaXIsIHBlcnNpc3RFbnZWYXIsIGlzUmVtb3RlRW52aXJvbm1lbnQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEdldCBwcm9qZWN0IGRpcmVjdG9yeVxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqXG4gKiAvLyBDaGVjayBpZiBydW5uaW5nIHJlbW90ZWx5XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIEhhbmRsZSByZW1vdGUtc3BlY2lmaWMgbG9naWNcbiAqIH1cbiAqXG4gKiAvLyBJbiBTZXNzaW9uU3RhcnQgaG9vazogcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ3Byb2R1Y3Rpb24nKTtcbiAqIHBlcnNpc3RFbnZWYXIoJ0FQSV9LRVknLCAnc2VjcmV0LWtleScpO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1leGVjdXRpb24tZGV0YWlsc1xuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwibm9kZTpmc1wiO1xuLyoqXG4gKiBDbGF1ZGUgQ29kZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lcy5cbiAqXG4gKiBUaGVzZSBhcmUgdGhlIGVudmlyb25tZW50IHZhcmlhYmxlcyB0aGF0IENsYXVkZSBDb2RlIHNldHMgd2hlbiBydW5uaW5nIGhvb2tzLlxuICovXG5leHBvcnQgY29uc3QgQ0xBVURFX0VOVl9WQVJTID0ge1xuICAgIC8qKlxuICAgICAqIEFic29sdXRlIHBhdGggdG8gdGhlIHByb2plY3Qgcm9vdCBkaXJlY3Rvcnkgd2hlcmUgQ2xhdWRlIENvZGUgd2FzIHN0YXJ0ZWQuXG4gICAgICogQXZhaWxhYmxlIGluIGFsbCBob29rcy5cbiAgICAgKi9cbiAgICBQUk9KRUNUX0RJUjogXCJDTEFVREVfUFJPSkVDVF9ESVJcIixcbiAgICAvKipcbiAgICAgKiBQYXRoIHRvIGEgZmlsZSB3aGVyZSBTZXNzaW9uU3RhcnQgaG9va3MgY2FuIHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICAgICAqIFZhcmlhYmxlcyB3cml0dGVuIHRvIHRoaXMgZmlsZSB3aWxsIGJlIGF2YWlsYWJsZSBpbiBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzLlxuICAgICAqIE9ubHkgYXZhaWxhYmxlIGluIFNlc3Npb25TdGFydCBob29rcy5cbiAgICAgKi9cbiAgICBFTlZfRklMRTogXCJDTEFVREVfRU5WX0ZJTEVcIixcbiAgICAvKipcbiAgICAgKiBTZXQgdG8gXCJ0cnVlXCIgd2hlbiBydW5uaW5nIGluIGEgcmVtb3RlICh3ZWIpIGVudmlyb25tZW50LlxuICAgICAqIE5vdCBzZXQgb3IgZW1wdHkgd2hlbiBydW5uaW5nIGluIGxvY2FsIENMSSBlbnZpcm9ubWVudC5cbiAgICAgKi9cbiAgICBSRU1PVEU6IFwiQ0xBVURFX0NPREVfUkVNT1RFXCIsXG59O1xuLyoqXG4gKiBHZXRzIHRoZSBDbGF1ZGUgQ29kZSBwcm9qZWN0IGRpcmVjdG9yeS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwcm9qZWN0IHJvb3Qgd2hlcmUgQ2xhdWRlIENvZGUgd2FzIHN0YXJ0ZWQuXG4gKiBUaGUgdmFsdWUgY29tZXMgZnJvbSB0aGUgYENMQVVERV9QUk9KRUNUX0RJUmAgZW52aXJvbm1lbnQgdmFyaWFibGUuXG4gKiBAcmV0dXJucyBUaGUgcHJvamVjdCBkaXJlY3RvcnkgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBwcm9qZWN0RGlyID0gZ2V0UHJvamVjdERpcigpO1xuICogaWYgKHByb2plY3REaXIpIHtcbiAqICAgY29uc3QgY29uZmlnUGF0aCA9IGAke3Byb2plY3REaXJ9Ly5jbGF1ZGUvY29uZmlnLmpzb25gO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0RGlyKCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuUFJPSkVDVF9ESVJdO1xufVxuLyoqXG4gKiBHZXRzIHRoZSBDbGF1ZGUgQ29kZSBlbnYgZmlsZSBwYXRoIGZvciBwZXJzaXN0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBUaGlzIGlzIG9ubHkgYXZhaWxhYmxlIGluIFNlc3Npb25TdGFydCBob29rcy4gVGhlIHBhdGggcG9pbnRzIHRvIGEgZmlsZVxuICogd2hlcmUgeW91IGNhbiB3cml0ZSBzaGVsbCBleHBvcnQgc3RhdGVtZW50cyB0byBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogZm9yIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMgaW4gdGhlIHNlc3Npb24uXG4gKiBAcmV0dXJucyBUaGUgZW52IGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXQgKG5vdCBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudkZpbGUgPSBnZXRFbnZGaWxlUGF0aCgpO1xuICogaWYgKGVudkZpbGUpIHtcbiAqICAgLy8gV2UncmUgaW4gYSBTZXNzaW9uU3RhcnQgaG9vayBhbmQgY2FuIHBlcnNpc3QgZW52IHZhcnNcbiAqICAgcGVyc2lzdEVudlZhcignTVlfVkFSJywgJ215LXZhbHVlJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudkZpbGVQYXRoKCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuRU5WX0ZJTEVdO1xufVxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGhvb2sgaXMgcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAqXG4gKiBSZW1vdGUgZW52aXJvbm1lbnRzIG1heSBoYXZlIGRpZmZlcmVudCBjYXBhYmlsaXRpZXMgb3IgcmVzdHJpY3Rpb25zXG4gKiBjb21wYXJlZCB0byBsb2NhbCBDTEkgZW52aXJvbm1lbnRzLlxuICogQHJldHVybnMgdHJ1ZSBpZiBydW5uaW5nIHJlbW90ZWx5LCBmYWxzZSBpZiBydW5uaW5nIGxvY2FsbHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIFVzZSB3ZWItY29tcGF0aWJsZSBhcHByb2FjaGVzXG4gKiB9IGVsc2Uge1xuICogICAvLyBDYW4gdXNlIGxvY2FsIENMSSBmZWF0dXJlc1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1JlbW90ZUVudmlyb25tZW50KCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuUkVNT1RFXSA9PT0gXCJ0cnVlXCI7XG59XG4vKipcbiAqIFBlcnNpc3RzIGFuIGVudmlyb25tZW50IHZhcmlhYmxlIGZvciB1c2UgaW4gc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gd3JpdGVzIGEgc2hlbGwgZXhwb3J0IHN0YXRlbWVudCB0byB0aGUgYENMQVVERV9FTlZfRklMRWAsXG4gKiB3aGljaCBDbGF1ZGUgQ29kZSBzb3VyY2VzIGJlZm9yZSBydW5uaW5nIGJhc2ggY29tbWFuZHMuIFRoaXMgYWxsb3dzXG4gKiBTZXNzaW9uU3RhcnQgaG9va3MgdG8gY29uZmlndXJlIHRoZSBlbnZpcm9ubWVudCBmb3IgdGhlIGVudGlyZSBzZXNzaW9uLlxuICpcbiAqICoqSW1wb3J0YW50Kio6IFRoaXMgZnVuY3Rpb24gb25seSB3b3JrcyBpbiBTZXNzaW9uU3RhcnQgaG9va3Mgd2hlcmVcbiAqIGBDTEFVREVfRU5WX0ZJTEVgIGlzIHNldC4gSW4gb3RoZXIgaG9va3MsIGl0IHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gKiBAcGFyYW0gbmFtZSAtIFRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGUgdmFsdWUgKHdpbGwgYmUgc2hlbGwtZXNjYXBlZClcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0xBVURFX0VOVl9GSUxFIGlzIG5vdCBzZXQgKG5vdCBpbiBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25TdGFydEhvb2ssIHNlc3Npb25TdGFydE91dHB1dCwgcGVyc2lzdEVudlZhciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7fSwgYXN5bmMgKGlucHV0KSA9PiB7XG4gKiAgIC8vIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0aGUgc2Vzc2lvblxuICogICBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdwcm9kdWN0aW9uJyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ0FQSV9LRVknLCBwcm9jZXNzLmVudi5NWV9BUElfS0VZID8/ICdkZWZhdWx0Jyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ1BBVEgnLCBgJHtwcm9jZXNzLmVudi5QQVRIfTouL25vZGVfbW9kdWxlcy8uYmluYCk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcGVyc2lzdGluZy1lbnZpcm9ubWVudC12YXJpYWJsZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcnNpc3RFbnZWYXIobmFtZSwgdmFsdWUpIHtcbiAgICBjb25zdCBlbnZGaWxlID0gZ2V0RW52RmlsZVBhdGgoKTtcbiAgICBpZiAoZW52RmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInBlcnNpc3RFbnZWYXIgY2FuIG9ubHkgYmUgdXNlZCBpbiBTZXNzaW9uU3RhcnQgaG9va3MuIFwiICsgXCJDTEFVREVfRU5WX0ZJTEUgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgbm90IHNldC5cIik7XG4gICAgfVxuICAgIC8vIFNoZWxsLWVzY2FwZSB0aGUgdmFsdWUgdG8gaGFuZGxlIHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgIGNvbnN0IGVzY2FwZWRWYWx1ZSA9IGVzY2FwZVNoZWxsVmFsdWUodmFsdWUpO1xuICAgIC8vIFdyaXRlIHRoZSBleHBvcnQgc3RhdGVtZW50XG4gICAgY29uc3QgZXhwb3J0U3RhdGVtZW50ID0gYGV4cG9ydCAke25hbWV9PSR7ZXNjYXBlZFZhbHVlfVxcbmA7XG4gICAgZnMuYXBwZW5kRmlsZVN5bmMoZW52RmlsZSwgZXhwb3J0U3RhdGVtZW50LCBcInV0Zi04XCIpO1xufVxuLyoqXG4gKiBQZXJzaXN0cyBtdWx0aXBsZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYXQgb25jZS5cbiAqXG4gKiBUaGlzIGlzIGEgY29udmVuaWVuY2Ugd3JhcHBlciBhcm91bmQgYHBlcnNpc3RFbnZWYXJgIGZvciBzZXR0aW5nXG4gKiBtdWx0aXBsZSB2YXJpYWJsZXMgaW4gYSBzaW5nbGUgY2FsbC5cbiAqIEBwYXJhbSB2YXJzIC0gT2JqZWN0IG1hcHBpbmcgdmFyaWFibGUgbmFtZXMgdG8gdmFsdWVzXG4gKiBAdGhyb3dzIEVycm9yIGlmIENMQVVERV9FTlZfRklMRSBpcyBub3Qgc2V0IChub3QgaW4gYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwZXJzaXN0RW52VmFycyh7XG4gKiAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gKiAgIEFQSV9LRVk6ICdzZWNyZXQnLFxuICogICBERUJVRzogJ2ZhbHNlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcnNpc3RFbnZWYXJzKHZhcnMpIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXModmFycykpIHtcbiAgICAgICAgcGVyc2lzdEVudlZhcihuYW1lLCB2YWx1ZSk7XG4gICAgfVxufVxuLyoqXG4gKiBFc2NhcGVzIGEgdmFsdWUgZm9yIHNhZmUgdXNlIGluIGEgc2hlbGwgZXhwb3J0IHN0YXRlbWVudC5cbiAqXG4gKiBVc2VzIHNpbmdsZSBxdW90ZXMgYW5kIGVzY2FwZXMgYW55IGVtYmVkZGVkIHNpbmdsZSBxdW90ZXMuXG4gKiBUaGlzIHByZXZlbnRzIHNoZWxsIGluamVjdGlvbiBhbmQgaGFuZGxlcyBzcGVjaWFsIGNoYXJhY3RlcnMuXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gZXNjYXBlXG4gKiBAcmV0dXJucyBUaGUgc2hlbGwtZXNjYXBlZCB2YWx1ZSAod2l0aCBxdW90ZXMpXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZXNjYXBlU2hlbGxWYWx1ZSh2YWx1ZSkge1xuICAgIC8vIFVzZSBzaW5nbGUgcXVvdGVzIGFuZCBlc2NhcGUgYW55IGVtYmVkZGVkIHNpbmdsZSBxdW90ZXNcbiAgICAvLyAndmFsdWUnIC0+ICd2YWwnXFwnJ3VlJyBmb3IgdmFsdWVzIGNvbnRhaW5pbmcgc2luZ2xlIHF1b3Rlc1xuICAgIGNvbnN0IGVzY2FwZWQgPSB2YWx1ZS5yZXBsYWNlKC8nL2csIFwiJ1xcXFwnJ1wiKTtcbiAgICByZXR1cm4gYCcke2VzY2FwZWR9J2A7XG59XG4iLCAiLyoqXG4gKiBIb29rIGZhY3RvcnkgZnVuY3Rpb25zIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBmYWN0b3J5IGZ1bmN0aW9ucyBmb3IgYWxsIDEyIGhvb2sgdHlwZXMgdGhhdCBoYW5kbGU6XG4gKiAtIElucHV0IHR5cGUgbmFycm93aW5nIGJhc2VkIG9uIGhvb2sgZXZlbnQgdHlwZVxuICogLSBPdXRwdXQgdHlwZSBlbmZvcmNlbWVudCB2aWEgcmV0dXJuIHR5cGVzXG4gKiAtIEVycm9yIHdyYXBwaW5nIHdpdGggYXV0b21hdGljIGxvZ2dpbmdcbiAqIC0gTG9nZ2VyIGNvbnRleHQgaW5qZWN0aW9uXG4gKlxuICogRWFjaCBmYWN0b3J5IGFjY2VwdHMgYSBIb29rQ29uZmlnIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dCBzZXR0aW5ncyxcbiAqIGFuZCByZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB0aGUgcnVudGltZSBpbnZva2VzIHdoZW4gdGhlIGhvb2sgZmlsZSBleGVjdXRlcy5cbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBHZW5lcmljIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIGhvb2sgZmFjdG9yeSBmdW5jdGlvbiBmb3IgYSBzcGVjaWZpYyBob29rIHR5cGUuXG4gKlxuICogVGhpcyBpcyB0aGUgaW50ZXJuYWwgaW1wbGVtZW50YXRpb24gdXNlZCBieSBhbGwgdHlwZWQgZmFjdG9yaWVzLlxuICogSXQgd3JhcHMgdGhlIGhhbmRsZXIgd2l0aCBlcnJvciBjYXRjaGluZyBhbmQgbG9nZ2luZy5cbiAqIEBwYXJhbSBob29rRXZlbnROYW1lIC0gVGhlIGhvb2sgZXZlbnQgbmFtZVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvblxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byB3cmFwXG4gKiBAcmV0dXJucyBBIHdyYXBwZWQgaG9vayBmdW5jdGlvblxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tGdW5jdGlvbihob29rRXZlbnROYW1lLCBjb25maWcsIGhhbmRsZXIpIHtcbiAgICBjb25zdCBob29rRm4gPSBhc3luYyAoaW5wdXQsIGNvbnRleHQpID0+IHtcbiAgICAgICAgLy8gRGVsZWdhdGUgZXJyb3IgaGFuZGxpbmcgdG8gdGhlIHJ1bnRpbWUgLSBqdXN0IGV4ZWN1dGUgdGhlIGhhbmRsZXJcbiAgICAgICAgLy8gVGhlIHJ1bnRpbWUgd2lsbCBjYXRjaCBlcnJvcnMsIGxvZyB0aGVtLCBhbmQgcmV0dXJuIGFwcHJvcHJpYXRlIG91dHB1dFxuICAgICAgICByZXR1cm4gYXdhaXQgaGFuZGxlcihpbnB1dCwgY29udGV4dCk7XG4gICAgfTtcbiAgICAvLyBBdHRhY2ggbWV0YWRhdGEgZm9yIHJ1bnRpbWUgaW5zcGVjdGlvblxuICAgIGhvb2tGbi5ob29rRXZlbnROYW1lID0gaG9va0V2ZW50TmFtZTtcbiAgICBob29rRm4ubWF0Y2hlciA9IGNvbmZpZy5tYXRjaGVyO1xuICAgIGhvb2tGbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gICAgcmV0dXJuIGhvb2tGbjtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZVRvb2xVc2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQcmVUb29sVXNlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0VG9vbFVzZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBvc3RUb29sVXNlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0VG9vbFVzZUZhaWx1cmVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQb3N0VG9vbFVzZUZhaWx1cmVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE5vdGlmaWNhdGlvbiBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIE5vdGlmaWNhdGlvbiBob29rIGhhbmRsZXIuXG4gKlxuICogTm90aWZpY2F0aW9uIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBzZW5kcyBhIG5vdGlmaWNhdGlvbiwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBGb3J3YXJkIG5vdGlmaWNhdGlvbnMgdG8gZXh0ZXJuYWwgc3lzdGVtc1xuICogLSBMb2cgaW1wb3J0YW50IGV2ZW50c1xuICogLSBUcmlnZ2VyIGN1c3RvbSBhbGVydGluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYG5vdGlmaWNhdGlvbl90eXBlYFxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IG5vdGlmaWNhdGlvbkhvb2ssIG5vdGlmaWNhdGlvbk91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gRm9yd2FyZCBub3RpZmljYXRpb25zIHRvIFNsYWNrXG4gKiBleHBvcnQgZGVmYXVsdCBub3RpZmljYXRpb25Ib29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ05vdGlmaWNhdGlvbiByZWNlaXZlZCcsIHtcbiAqICAgICB0eXBlOiBpbnB1dC5ub3RpZmljYXRpb25fdHlwZSxcbiAqICAgICB0aXRsZTogaW5wdXQudGl0bGVcbiAqICAgfSk7XG4gKlxuICogICBhd2FpdCBzZW5kU2xhY2tNZXNzYWdlKGlucHV0LnRpdGxlID8/ICdOb3RpZmljYXRpb24nLCBpbnB1dC5tZXNzYWdlKTtcbiAqXG4gKiAgIHJldHVybiBub3RpZmljYXRpb25PdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNub3RpZmljYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdGlmaWNhdGlvbkhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIk5vdGlmaWNhdGlvblwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVXNlclByb21wdFN1Ym1pdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFVzZXJQcm9tcHRTdWJtaXQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFVzZXJQcm9tcHRTdWJtaXQgaG9va3MgZmlyZSB3aGVuIGEgdXNlciBzdWJtaXRzIGEgcHJvbXB0LCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFkZCBhZGRpdGlvbmFsIGNvbnRleHQgb3IgaW5zdHJ1Y3Rpb25zXG4gKiAtIExvZyB1c2VyIGludGVyYWN0aW9uc1xuICogLSBWYWxpZGF0ZSBvciB0cmFuc2Zvcm0gcHJvbXB0c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgcHJvbXB0IHN1Ym1pc3Npb25zXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdXNlclByb21wdFN1Ym1pdEhvb2ssIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEFkZCBwcm9qZWN0IGNvbnRleHQgdG8gZXZlcnkgcHJvbXB0XG4gKiBleHBvcnQgZGVmYXVsdCB1c2VyUHJvbXB0U3VibWl0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5kZWJ1ZygnVXNlciBwcm9tcHQgc3VibWl0dGVkJywgeyBwcm9tcHRMZW5ndGg6IGlucHV0LnByb21wdC5sZW5ndGggfSk7XG4gKlxuICogICBjb25zdCBwcm9qZWN0Q29udGV4dCA9IGF3YWl0IGdldFByb2plY3RDb250ZXh0KCk7XG4gKlxuICogICByZXR1cm4gdXNlclByb21wdFN1Ym1pdE91dHB1dCh7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IHByb2plY3RDb250ZXh0XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN1c2VycHJvbXB0c3VibWl0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VyUHJvbXB0U3VibWl0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVXNlclByb21wdFN1Ym1pdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2Vzc2lvblN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2Vzc2lvblN0YXJ0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTZXNzaW9uU3RhcnQgaG9va3MgZmlyZSB3aGVuIGEgQ2xhdWRlIENvZGUgc2Vzc2lvbiBzdGFydHMgb3IgcmVzdGFydHMsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEluaXRpYWxpemUgc2Vzc2lvbiBzdGF0ZVxuICogLSBJbmplY3QgY29udGV4dCBvciBpbnN0cnVjdGlvbnNcbiAqIC0gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kc1xuICogLSBTZXQgdXAgbG9nZ2luZyBvciBtb25pdG9yaW5nXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgc291cmNlYCAoJ3N0YXJ0dXAnLCAncmVzdW1lJywgJ2NsZWFyJywgJ2NvbXBhY3QnKVxuICpcbiAqICoqQ29udGV4dCoqOiBTZXNzaW9uU3RhcnQgaG9va3MgcmVjZWl2ZSBhbiBleHRlbmRlZCBjb250ZXh0IHdpdGggYHBlcnNpc3RFbnZWYXJgXG4gKiBhbmQgYHBlcnNpc3RFbnZWYXJzYCBmdW5jdGlvbnMgZm9yIHNldHRpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25TdGFydEhvb2ssIHNlc3Npb25TdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHRoZSBzZXNzaW9uXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHsgbWF0Y2hlcjogJ3N0YXJ0dXAnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTmV3IHNlc3Npb24gc3RhcnRlZCcsIHtcbiAqICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gKiAgICAgY3dkOiBpbnB1dC5jd2RcbiAqICAgfSk7XG4gKlxuICogICAvLyBTZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ2RldmVsb3BtZW50Jyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ0RFQlVHJywgJ3RydWUnKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBTZXQgbXVsdGlwbGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIGF0IG9uY2VcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBwZXJzaXN0RW52VmFycyB9KSA9PiB7XG4gKiAgIHBlcnNpc3RFbnZWYXJzKHtcbiAqICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICogICAgIEFQSV9LRVk6ICdzZWNyZXQnLFxuICogICAgIERFQlVHOiAnZmFsc2UnXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Nlc3Npb25zdGFydFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvblN0YXJ0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2Vzc2lvblN0YXJ0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXNzaW9uRW5kIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2Vzc2lvbkVuZCBob29rIGhhbmRsZXIuXG4gKlxuICogU2Vzc2lvbkVuZCBob29rcyBmaXJlIHdoZW4gYSBDbGF1ZGUgQ29kZSBzZXNzaW9uIGVuZHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ2xlYW4gdXAgc2Vzc2lvbiByZXNvdXJjZXNcbiAqIC0gTG9nIHNlc3Npb24gbWV0cmljc1xuICogLSBQZXJzaXN0IHNlc3Npb24gc3RhdGVcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGByZWFzb25gICh0aGUgZXhpdCByZWFzb24gc3RyaW5nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25FbmRIb29rLCBzZXNzaW9uRW5kT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgc2Vzc2lvbiBlbmQgYW5kIGNsZWFuIHVwXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uRW5kSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTZXNzaW9uIGVuZGVkJywge1xuICogICAgIHNlc3Npb25JZDogaW5wdXQuc2Vzc2lvbl9pZCxcbiAqICAgICByZWFzb246IGlucHV0LnJlYXNvblxuICogICB9KTtcbiAqXG4gKiAgIGF3YWl0IGNsZWFudXBTZXNzaW9uUmVzb3VyY2VzKGlucHV0LnNlc3Npb25faWQpO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25FbmRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXNzaW9uZW5kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXNzaW9uRW5kSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2Vzc2lvbkVuZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RvcCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN0b3AgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN0b3AgaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIGlzIGFib3V0IHRvIHN0b3AsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQmxvY2sgdGhlIHN0b3AgYW5kIHJlcXVpcmUgYWRkaXRpb25hbCBhY3Rpb25cbiAqIC0gQ29uZmlybSB0aGUgdXNlciB3YW50cyB0byBzdG9wXG4gKiAtIENsZWFuIHVwIHJlc291cmNlcyBiZWZvcmUgc3RvcHBpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHN0b3AgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3RvcEhvb2ssIHN0b3BPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEJsb2NrIHN0b3AgaWYgdGhlcmUgYXJlIHBlbmRpbmcgY2hhbmdlc1xuICogZXhwb3J0IGRlZmF1bHQgc3RvcEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBjb25zdCBwZW5kaW5nQ2hhbmdlcyA9IGF3YWl0IGNoZWNrUGVuZGluZ0NoYW5nZXMoKTtcbiAqXG4gKiAgIGlmIChwZW5kaW5nQ2hhbmdlcy5sZW5ndGggPiAwKSB7XG4gKiAgICAgbG9nZ2VyLndhcm4oJ0Jsb2NraW5nIHN0b3AgZHVlIHRvIHBlbmRpbmcgY2hhbmdlcycsIHtcbiAqICAgICAgIGNvdW50OiBwZW5kaW5nQ2hhbmdlcy5sZW5ndGhcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICogICAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgICByZWFzb246IGBUaGVyZSBhcmUgJHtwZW5kaW5nQ2hhbmdlcy5sZW5ndGh9IHVuY29tbWl0dGVkIGNoYW5nZXNgLFxuICogICAgICAgc3lzdGVtTWVzc2FnZTogJ1BsZWFzZSBjb21taXQgb3IgZGlzY2FyZCBjaGFuZ2VzIGJlZm9yZSBzdG9wcGluZydcbiAqICAgICB9KTtcbiAqICAgfVxuICpcbiAqICAgbG9nZ2VyLmluZm8oJ0FwcHJvdmluZyBzdG9wJyk7XG4gKiAgIHJldHVybiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN0b3BcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN0b3BGYWlsdXJlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3RvcEZhaWx1cmUgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN0b3BGYWlsdXJlIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBlbmNvdW50ZXJzIGFuIGVycm9yIHdoaWxlIHN0b3BwaW5nXG4gKiAoZS5nLiwgQVBJIGVycm9ycywgYXV0aGVudGljYXRpb24gZmFpbHVyZXMsIHJhdGUgbGltaXRzKSwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBMb2cgc3RvcCBmYWlsdXJlIGV2ZW50cyBhbmQgZXJyb3IgZGV0YWlsc1xuICogLSBBbGVydCBvbiB1bmV4cGVjdGVkIHNlc3Npb24gdGVybWluYXRpb24gZXJyb3JzXG4gKiAtIE9ic2VydmUgd2hhdCBlcnJvciBjYXVzZWQgdGhlIGZhaWx1cmVcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHN0b3AgZmFpbHVyZSBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdG9wRmFpbHVyZUhvb2ssIHN0b3BGYWlsdXJlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBzdG9wRmFpbHVyZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuZXJyb3IoJ1Nlc3Npb24gc3RvcHBlZCBkdWUgdG8gZXJyb3InLCB7XG4gKiAgICAgZXJyb3I6IGlucHV0LmVycm9yLFxuICogICAgIGRldGFpbHM6IGlucHV0LmVycm9yX2RldGFpbHNcbiAqICAgfSk7XG4gKiAgIHJldHVybiBzdG9wRmFpbHVyZU91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N0b3BmYWlsdXJlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wRmFpbHVyZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN0b3BGYWlsdXJlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdWJhZ2VudFN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU3ViYWdlbnRTdGFydCBob29rcyBmaXJlIHdoZW4gYSBzdWJhZ2VudCAoQWdlbnQgdG9vbCkgc3RhcnRzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEluamVjdCBjb250ZXh0IGZvciB0aGUgc3ViYWdlbnRcbiAqIC0gTG9nIHN1YmFnZW50IGludm9jYXRpb25zXG4gKiAtIENvbmZpZ3VyZSBzdWJhZ2VudCBiZWhhdmlvclxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYGFnZW50X3R5cGVgIChlLmcuLCAnZXhwbG9yZScsICdjb2RlYmFzZS1hbmFseXNpcycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3ViYWdlbnRTdGFydEhvb2ssIHN1YmFnZW50U3RhcnRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEFkZCBjb250ZXh0IGZvciBleHBsb3JlIHN1YmFnZW50c1xuICogZXhwb3J0IGRlZmF1bHQgc3ViYWdlbnRTdGFydEhvb2soeyBtYXRjaGVyOiAnZXhwbG9yZScgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdFeHBsb3JlIHN1YmFnZW50IHN0YXJ0aW5nJywge1xuICogICAgIGFnZW50SWQ6IGlucHV0LmFnZW50X2lkLFxuICogICAgIGFnZW50VHlwZTogaW5wdXQuYWdlbnRfdHlwZVxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZvY3VzIG9uIGZpbmRpbmcgcGF0dGVybnMgYW5kIGNvbnZlbnRpb25zJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3ViYWdlbnRzdGFydFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdGFydEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN1YmFnZW50U3RhcnRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN1YmFnZW50U3RvcCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN1YmFnZW50U3RvcCBob29rIGhhbmRsZXIuXG4gKlxuICogU3ViYWdlbnRTdG9wIGhvb2tzIGZpcmUgd2hlbiBhIHN1YmFnZW50IGNvbXBsZXRlcyBvciBzdG9wcywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBCbG9jayB0aGUgc3ViYWdlbnQgZnJvbSBzdG9wcGluZ1xuICogLSBQcm9jZXNzIHN1YmFnZW50IHJlc3VsdHNcbiAqIC0gQ2xlYW4gdXAgc3ViYWdlbnQgcmVzb3VyY2VzXG4gKiAtIExvZyBzdWJhZ2VudCBjb21wbGV0aW9uXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgYWdlbnRfdHlwZWAgKGUuZy4sICdleHBsb3JlJywgJ2NvZGViYXNlLWFuYWx5c2lzJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdWJhZ2VudFN0b3BIb29rLCBzdWJhZ2VudFN0b3BPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEJsb2NrIGV4cGxvcmUgc3ViYWdlbnRzIGlmIHRhc2sgaW5jb21wbGV0ZVxuICogZXhwb3J0IGRlZmF1bHQgc3ViYWdlbnRTdG9wSG9vayh7IG1hdGNoZXI6ICdleHBsb3JlJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1N1YmFnZW50IHN0b3BwaW5nJywge1xuICogICAgIGFnZW50SWQ6IGlucHV0LmFnZW50X2lkLFxuICogICAgIGFnZW50VHlwZTogaW5wdXQuYWdlbnRfdHlwZVxuICogICB9KTtcbiAqXG4gKiAgIC8vIEJsb2NrIGlmIHRyYW5zY3JpcHQgc2hvd3MgaW5jb21wbGV0ZSB3b3JrXG4gKiAgIHJldHVybiBzdWJhZ2VudFN0b3BPdXRwdXQoe1xuICogICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICAgIHJlYXNvbjogJ1BsZWFzZSB2ZXJpZnkgZXhwbG9yYXRpb24gaXMgY29tcGxldGUnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdWJhZ2VudHN0b3BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN1YmFnZW50U3RvcEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN1YmFnZW50U3RvcFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUHJlQ29tcGFjdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFByZUNvbXBhY3QgaG9vayBoYW5kbGVyLlxuICpcbiAqIFByZUNvbXBhY3QgaG9va3MgZmlyZSBiZWZvcmUgY29udGV4dCBjb21wYWN0aW9uIG9jY3VycywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBQcmVzZXJ2ZSBpbXBvcnRhbnQgaW5mb3JtYXRpb24gYmVmb3JlIGNvbXBhY3Rpb25cbiAqIC0gTG9nIGNvbXBhY3Rpb24gZXZlbnRzXG4gKiAtIE1vZGlmeSBjdXN0b20gaW5zdHJ1Y3Rpb25zIGZvciB0aGUgY29tcGFjdGVkIGNvbnRleHRcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGB0cmlnZ2VyYCAoJ21hbnVhbCcsICdhdXRvJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwcmVDb21wYWN0SG9vaywgcHJlQ29tcGFjdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIGNvbXBhY3Rpb24gZXZlbnRzIGFuZCBwcmVzZXJ2ZSBjb250ZXh0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVDb21wYWN0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdDb250ZXh0IGNvbXBhY3Rpb24gdHJpZ2dlcmVkJywge1xuICogICAgIHRyaWdnZXI6IGlucHV0LnRyaWdnZXIsXG4gKiAgICAgaGFzQ3VzdG9tSW5zdHJ1Y3Rpb25zOiBpbnB1dC5jdXN0b21faW5zdHJ1Y3Rpb25zICE9PSBudWxsXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHByZUNvbXBhY3RPdXRwdXQoe1xuICogICAgIHN5c3RlbU1lc3NhZ2U6ICdSZW1lbWJlcjogc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCdcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIE9ubHkgaGFuZGxlIG1hbnVhbCBjb21wYWN0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVDb21wYWN0SG9vayh7IG1hdGNoZXI6ICdtYW51YWwnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTWFudWFsIGNvbXBhY3Rpb24gcmVxdWVzdGVkJyk7XG4gKiAgIHJldHVybiBwcmVDb21wYWN0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcHJlY29tcGFjdFxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJlQ29tcGFjdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlByZUNvbXBhY3RcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFBvc3RDb21wYWN0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgUG9zdENvbXBhY3QgaG9vayBoYW5kbGVyLlxuICpcbiAqIFBvc3RDb21wYWN0IGhvb2tzIGZpcmUgYWZ0ZXIgY29udGV4dCBjb21wYWN0aW9uIGNvbXBsZXRlcywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBPYnNlcnZlIHRoZSBjb21wYWN0aW9uIHN1bW1hcnkgYW5kIGRldGFpbHNcbiAqIC0gTG9nIGNvbXBhY3Rpb24gZXZlbnRzXG4gKiAtIFJlYWN0IHRvIHRoZSBuZXcgY29tcGFjdGVkIHN0YXRlXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdtYW51YWwnLCAnYXV0bycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcG9zdENvbXBhY3RIb29rLCBwb3N0Q29tcGFjdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgcG9zdENvbXBhY3RIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbnRleHQgY29tcGFjdGlvbiBjb21wbGV0ZWQnLCB7XG4gKiAgICAgdHJpZ2dlcjogaW5wdXQudHJpZ2dlcixcbiAqICAgICBzdW1tYXJ5OiBpbnB1dC5jb21wYWN0X3N1bW1hcnlcbiAqICAgfSk7XG4gKiAgIHJldHVybiBwb3N0Q29tcGFjdE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Bvc3Rjb21wYWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0Q29tcGFjdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBvc3RDb21wYWN0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJtaXNzaW9uUmVxdWVzdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBlcm1pc3Npb25SZXF1ZXN0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBQZXJtaXNzaW9uRGVuaWVkIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgUGVybWlzc2lvbkRlbmllZCBob29rIGhhbmRsZXIuXG4gKlxuICogUGVybWlzc2lvbkRlbmllZCBob29rcyBmaXJlIHdoZW4gYSBwZXJtaXNzaW9uIHJlcXVlc3QgaXMgZGVuaWVkIChlaXRoZXIgYnkgdGhlXG4gKiB1c2VyIG9yIGJ5IGEgUGVybWlzc2lvblJlcXVlc3QgaG9vayksIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gTG9nIHBlcm1pc3Npb24gZGVuaWFscyBmb3IgYXVkaXRpbmdcbiAqIC0gUmVhY3QgdG8gZGVuaWVkIHRvb2wgZXhlY3V0aW9uc1xuICogLSBPcHRpb25hbGx5IHJlcXVlc3QgYSByZXRyeSB2aWEgdGhlIG91dHB1dFxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHRvb2xfbmFtZWBcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwZXJtaXNzaW9uRGVuaWVkSG9vaywgcGVybWlzc2lvbkRlbmllZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIGFsbCBwZXJtaXNzaW9uIGRlbmlhbHNcbiAqIGV4cG9ydCBkZWZhdWx0IHBlcm1pc3Npb25EZW5pZWRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ1Blcm1pc3Npb24gZGVuaWVkJywge1xuICogICAgIHRvb2xOYW1lOiBpbnB1dC50b29sX25hbWUsXG4gKiAgICAgcmVhc29uOiBpbnB1dC5yZWFzb25cbiAqICAgfSk7XG4gKiAgIHJldHVybiBwZXJtaXNzaW9uRGVuaWVkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcGVybWlzc2lvbmRlbmllZFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGVybWlzc2lvbkRlbmllZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBlcm1pc3Npb25EZW5pZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNldHVwIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2V0dXAgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNldHVwIGhvb2tzIGZpcmUgZHVyaW5nIGluaXRpYWxpemF0aW9uIG9yIG1haW50ZW5hbmNlLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENvbmZpZ3VyZSBpbml0aWFsIHNlc3Npb24gc3RhdGVcbiAqIC0gUGVyZm9ybSBzZXR1cCB0YXNrcyBiZWZvcmUgdGhlIHNlc3Npb24gc3RhcnRzXG4gKiAtIEFkZCBjb250ZXh0IGZvciBtYWludGVuYW5jZSBvcGVyYXRpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdpbml0JyBvciAnbWFpbnRlbmFuY2UnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNldHVwSG9vaywgc2V0dXBPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEhhbmRsZSBhbGwgc2V0dXAgZXZlbnRzXG4gKiBleHBvcnQgZGVmYXVsdCBzZXR1cEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU2V0dXAgdHJpZ2dlcmVkJywgeyB0cmlnZ2VyOiBpbnB1dC50cmlnZ2VyIH0pO1xuICogICByZXR1cm4gc2V0dXBPdXRwdXQoe30pO1xuICogfSk7XG4gKlxuICogLy8gT25seSBoYW5kbGUgaW5pdGlhbGl6YXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHNldHVwSG9vayh7IG1hdGNoZXI6ICdpbml0JyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0luaXRpYWxpemluZyBzZXNzaW9uJyk7XG4gKiAgIHJldHVybiBzZXR1cE91dHB1dCh7XG4gKiAgICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1Nlc3Npb24gaW5pdGlhbGl6ZWQgd2l0aCBjdXN0b20gY29uZmlndXJhdGlvbidcbiAqICAgICB9XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXR1cFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXR1cFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGVhbW1hdGVJZGxlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVGVhbW1hdGVJZGxlIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBUZWFtbWF0ZUlkbGUgaG9va3MgZmlyZSB3aGVuIGEgdGVhbW1hdGUgaW4gYSB0ZWFtIGlzIGFib3V0IHRvIGdvIGlkbGUsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFzc2lnbiB3b3JrIHRvIGlkbGUgdGVhbW1hdGVzXG4gKiAtIExvZyB0ZWFtIGFjdGl2aXR5XG4gKiAtIENvb3JkaW5hdGUgbXVsdGktYWdlbnQgd29ya2Zsb3dzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCB0ZWFtbWF0ZSBpZGxlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHRlYW1tYXRlSWRsZUhvb2ssIHRlYW1tYXRlSWRsZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHdoZW4gdGVhbW1hdGVzIGdvIGlkbGVcbiAqIGV4cG9ydCBkZWZhdWx0IHRlYW1tYXRlSWRsZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnVGVhbW1hdGUgZ29pbmcgaWRsZScsIHtcbiAqICAgICB0ZWFtbWF0ZU5hbWU6IGlucHV0LnRlYW1tYXRlX25hbWUsXG4gKiAgICAgdGVhbU5hbWU6IGlucHV0LnRlYW1fbmFtZVxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiB0ZWFtbWF0ZUlkbGVPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN0ZWFtbWF0ZWlkbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRlYW1tYXRlSWRsZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlRlYW1tYXRlSWRsZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGFza0NyZWF0ZWQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBUYXNrQ3JlYXRlZCBob29rIGhhbmRsZXIuXG4gKlxuICogVGFza0NyZWF0ZWQgaG9va3MgZmlyZSB3aGVuIGEgbmV3IHRhc2sgaXMgY3JlYXRlZCBhbmQgYXNzaWduZWQgdG8gYSB0ZWFtbWF0ZSxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gT2JzZXJ2ZSB0YXNrIGNyZWF0aW9uIGV2ZW50c1xuICogLSBMb2cgdGFzayBhc3NpZ25tZW50cyBmb3IgYXVkaXRpbmdcbiAqIC0gUmVhY3QgdG8gbmV3IHdvcmsgYmVpbmcgYXNzaWduZWRcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHRhc2sgY3JlYXRpb24gZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdGFza0NyZWF0ZWRIb29rLCB0YXNrQ3JlYXRlZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHRhc2sgY3JlYXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHRhc2tDcmVhdGVkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdUYXNrIGNyZWF0ZWQnLCB7XG4gKiAgICAgdGFza0lkOiBpbnB1dC50YXNrX2lkLFxuICogICAgIHRhc2tTdWJqZWN0OiBpbnB1dC50YXNrX3N1YmplY3RcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gdGFza0NyZWF0ZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN0YXNrY3JlYXRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdGFza0NyZWF0ZWRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJUYXNrQ3JlYXRlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGFza0NvbXBsZXRlZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFRhc2tDb21wbGV0ZWQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFRhc2tDb21wbGV0ZWQgaG9va3MgZmlyZSB3aGVuIGEgdGFzayBpcyBiZWluZyBtYXJrZWQgYXMgY29tcGxldGVkLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBWZXJpZnkgdGFzayBjb21wbGV0aW9uXG4gKiAtIExvZyB0YXNrIG1ldHJpY3NcbiAqIC0gVHJpZ2dlciBmb2xsb3ctdXAgYWN0aW9uc1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgdGFzayBjb21wbGV0aW9uIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHRhc2tDb21wbGV0ZWRIb29rLCB0YXNrQ29tcGxldGVkT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgdGFzayBjb21wbGV0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCB0YXNrQ29tcGxldGVkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdUYXNrIGNvbXBsZXRlZCcsIHtcbiAqICAgICB0YXNrSWQ6IGlucHV0LnRhc2tfaWQsXG4gKiAgICAgdGFza1N1YmplY3Q6IGlucHV0LnRhc2tfc3ViamVjdFxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiB0YXNrQ29tcGxldGVkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdGFza2NvbXBsZXRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdGFza0NvbXBsZXRlZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlRhc2tDb21wbGV0ZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVsaWNpdGF0aW9uIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIEVsaWNpdGF0aW9uIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBFbGljaXRhdGlvbiBob29rcyBmaXJlIHdoZW4gYW4gTUNQIHNlcnZlciByZXF1ZXN0cyB1c2VyIGlucHV0LCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFjY2VwdCwgZGVjbGluZSwgb3IgY2FuY2VsIGVsaWNpdGF0aW9uIHJlcXVlc3RzIHByb2dyYW1tYXRpY2FsbHlcbiAqIC0gUHJvdmlkZSBzdHJ1Y3R1cmVkIGZvcm0gaW5wdXQgb3IgVVJMLWJhc2VkIGF1dGggcmVzcG9uc2VzXG4gKiAtIExvZyBvciBhdWRpdCBlbGljaXRhdGlvbiByZXF1ZXN0c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgZWxpY2l0YXRpb24gZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgZWxpY2l0YXRpb25Ib29rLCBlbGljaXRhdGlvbk91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgZWxpY2l0YXRpb25Ib29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0VsaWNpdGF0aW9uIHJlcXVlc3QnLCB7IHNlcnZlcjogaW5wdXQubWNwX3NlcnZlcl9uYW1lIH0pO1xuICogICByZXR1cm4gZWxpY2l0YXRpb25PdXRwdXQoe1xuICogICAgIGhvb2tTcGVjaWZpY091dHB1dDogeyBhY3Rpb246ICdhY2NlcHQnLCBjb250ZW50OiB7IGFwcHJvdmVkOiB0cnVlIH0gfVxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjZWxpY2l0YXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVsaWNpdGF0aW9uSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiRWxpY2l0YXRpb25cIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVsaWNpdGF0aW9uUmVzdWx0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIEVsaWNpdGF0aW9uUmVzdWx0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBFbGljaXRhdGlvblJlc3VsdCBob29rcyBmaXJlIHdpdGggdGhlIHJlc3VsdCBvZiBhbiBNQ1AgZWxpY2l0YXRpb24gcmVxdWVzdCxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gT2JzZXJ2ZSBlbGljaXRhdGlvbiBvdXRjb21lc1xuICogLSBNb2RpZnkgdGhlIHJlc3VsdCBiZWZvcmUgaXQgaXMgcmV0dXJuZWQgdG8gdGhlIE1DUCBzZXJ2ZXJcbiAqIC0gTG9nIGVsaWNpdGF0aW9uIGNvbXBsZXRpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBlbGljaXRhdGlvbiByZXN1bHQgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgZWxpY2l0YXRpb25SZXN1bHRIb29rLCBlbGljaXRhdGlvblJlc3VsdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgZWxpY2l0YXRpb25SZXN1bHRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0VsaWNpdGF0aW9uIHJlc3VsdCcsIHsgYWN0aW9uOiBpbnB1dC5hY3Rpb24gfSk7XG4gKiAgIHJldHVybiBlbGljaXRhdGlvblJlc3VsdE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2VsaWNpdGF0aW9ucmVzdWx0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbGljaXRhdGlvblJlc3VsdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIkVsaWNpdGF0aW9uUmVzdWx0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25maWdDaGFuZ2UgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBDb25maWdDaGFuZ2UgaG9vayBoYW5kbGVyLlxuICpcbiAqIENvbmZpZ0NoYW5nZSBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgY29uZmlndXJhdGlvbiBjaGFuZ2VzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFJlYWN0IHRvIHNldHRpbmdzIGZpbGUgY2hhbmdlc1xuICogLSBMb2cgb3IgYXVkaXQgY29uZmlndXJhdGlvbiBjaGFuZ2VzXG4gKiAtIEFwcGx5IGN1c3RvbSBsb2dpYyB3aGVuIHNldHRpbmdzIGFyZSB1cGRhdGVkXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgc291cmNlYCAoJ3VzZXJfc2V0dGluZ3MnLCAncHJvamVjdF9zZXR0aW5ncycsIGV0Yy4pXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgY29uZmlnQ2hhbmdlSG9vaywgY29uZmlnQ2hhbmdlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBjb25maWdDaGFuZ2VIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbmZpZyBjaGFuZ2VkJywgeyBzb3VyY2U6IGlucHV0LnNvdXJjZSwgZmlsZTogaW5wdXQuZmlsZV9wYXRoIH0pO1xuICogICByZXR1cm4gY29uZmlnQ2hhbmdlT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjY29uZmlnY2hhbmdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb25maWdDaGFuZ2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJDb25maWdDaGFuZ2VcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEluc3RydWN0aW9uc0xvYWRlZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBJbnN0cnVjdGlvbnNMb2FkZWQgaG9vayBoYW5kbGVyLlxuICpcbiAqIEluc3RydWN0aW9uc0xvYWRlZCBob29rcyBmaXJlIHdoZW4gYSBDTEFVREUubWQgb3Igc2ltaWxhciBpbnN0cnVjdGlvbnMgZmlsZVxuICogaXMgbG9hZGVkLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFJlYWN0IHRvIGluc3RydWN0aW9ucyBiZWluZyBhcHBsaWVkXG4gKiAtIExvZyB3aGljaCBpbnN0cnVjdGlvbiBmaWxlcyBhcmUgYWN0aXZlXG4gKiAtIE9ic2VydmUgdGhlIGluc3RydWN0aW9uIGxvYWRpbmcgaGllcmFyY2h5XG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBpbnN0cnVjdGlvbiBsb2FkIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGluc3RydWN0aW9uc0xvYWRlZEhvb2ssIGluc3RydWN0aW9uc0xvYWRlZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgaW5zdHJ1Y3Rpb25zTG9hZGVkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdJbnN0cnVjdGlvbnMgbG9hZGVkJywgeyBmaWxlOiBpbnB1dC5maWxlX3BhdGgsIHR5cGU6IGlucHV0Lm1lbW9yeV90eXBlIH0pO1xuICogICByZXR1cm4gaW5zdHJ1Y3Rpb25zTG9hZGVkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaW5zdHJ1Y3Rpb25zbG9hZGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnN0cnVjdGlvbnNMb2FkZWRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJJbnN0cnVjdGlvbnNMb2FkZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFdvcmt0cmVlQ3JlYXRlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgV29ya3RyZWVDcmVhdGUgaG9vayBoYW5kbGVyLlxuICpcbiAqIFdvcmt0cmVlQ3JlYXRlIGhvb2tzIGZpcmUgd2hlbiBhIGdpdCB3b3JrdHJlZSBpcyBjcmVhdGVkLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFNldCB1cCB3b3JrdHJlZS1zcGVjaWZpYyBjb25maWd1cmF0aW9uXG4gKiAtIExvZyB3b3JrdHJlZSBjcmVhdGlvbiBldmVudHNcbiAqIC0gSW5pdGlhbGl6ZSB3b3JrdHJlZSByZXNvdXJjZXNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHdvcmt0cmVlIGNyZWF0aW9uIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHdvcmt0cmVlQ3JlYXRlSG9vaywgd29ya3RyZWVDcmVhdGVPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHdvcmt0cmVlQ3JlYXRlSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdXb3JrdHJlZSBjcmVhdGVkJywgeyBuYW1lOiBpbnB1dC5uYW1lIH0pO1xuICogICByZXR1cm4gd29ya3RyZWVDcmVhdGVPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN3b3JrdHJlZWNyZWF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gd29ya3RyZWVDcmVhdGVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJXb3JrdHJlZUNyZWF0ZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gV29ya3RyZWVSZW1vdmUgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBXb3JrdHJlZVJlbW92ZSBob29rIGhhbmRsZXIuXG4gKlxuICogV29ya3RyZWVSZW1vdmUgaG9va3MgZmlyZSB3aGVuIGEgZ2l0IHdvcmt0cmVlIGlzIHJlbW92ZWQsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ2xlYW4gdXAgd29ya3RyZWUtc3BlY2lmaWMgcmVzb3VyY2VzXG4gKiAtIExvZyB3b3JrdHJlZSByZW1vdmFsIGV2ZW50c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgd29ya3RyZWUgcmVtb3ZhbCBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyB3b3JrdHJlZVJlbW92ZUhvb2ssIHdvcmt0cmVlUmVtb3ZlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCB3b3JrdHJlZVJlbW92ZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnV29ya3RyZWUgcmVtb3ZlZCcsIHsgcGF0aDogaW5wdXQud29ya3RyZWVfcGF0aCB9KTtcbiAqICAgcmV0dXJuIHdvcmt0cmVlUmVtb3ZlT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjd29ya3RyZWVyZW1vdmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdvcmt0cmVlUmVtb3ZlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiV29ya3RyZWVSZW1vdmVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEN3ZENoYW5nZWQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBDd2RDaGFuZ2VkIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBDd2RDaGFuZ2VkIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSdzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkgY2hhbmdlcyxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gUmVhY3QgdG8gZGlyZWN0b3J5IGNoYW5nZXMgd2l0aGluIGEgc2Vzc2lvblxuICogLSBVcGRhdGUgZmlsZSB3YXRjaGVycyBvciBlbnZpcm9ubWVudCBzdGF0ZVxuICogLSBSZXR1cm4gYHdhdGNoUGF0aHNgIHZpYSBgaG9va1NwZWNpZmljT3V0cHV0YCB0byByZWdpc3RlciBwYXRocyBmb3IgRmlsZUNoYW5nZWQgZXZlbnRzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBjd2QgY2hhbmdlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGN3ZENoYW5nZWRIb29rLCBjd2RDaGFuZ2VkT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBjd2RDaGFuZ2VkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdXb3JraW5nIGRpcmVjdG9yeSBjaGFuZ2VkJywgeyBmcm9tOiBpbnB1dC5vbGRfY3dkLCB0bzogaW5wdXQubmV3X2N3ZCB9KTtcbiAqICAgcmV0dXJuIGN3ZENoYW5nZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNjd2RjaGFuZ2VkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjd2RDaGFuZ2VkSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiQ3dkQ2hhbmdlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRmlsZUNoYW5nZWQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBGaWxlQ2hhbmdlZCBob29rIGhhbmRsZXIuXG4gKlxuICogRmlsZUNoYW5nZWQgaG9va3MgZmlyZSB3aGVuIGEgd2F0Y2hlZCBmaWxlIGNoYW5nZXMgb24gZGlzaywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBSZWFjdCB0byBmaWxlIHN5c3RlbSBjaGFuZ2VzIGR1cmluZyBhIHNlc3Npb25cbiAqIC0gSW52YWxpZGF0ZSBjYWNoZXMgb3IgcmVsb2FkIGNvbmZpZ3VyYXRpb25cbiAqIC0gUmV0dXJuIGB3YXRjaFBhdGhzYCB2aWEgYGhvb2tTcGVjaWZpY091dHB1dGAgdG8gdXBkYXRlIHRoZSBzZXQgb2Ygd2F0Y2hlZCBwYXRoc1xuICpcbiAqIFRoZSBpbnB1dCBgZXZlbnRgIGZpZWxkIGluZGljYXRlcyB0aGUgdHlwZSBvZiBjaGFuZ2U6XG4gKiAtIGAnY2hhbmdlJ2AgLSBGaWxlIGNvbnRlbnRzIGNoYW5nZWRcbiAqIC0gYCdhZGQnYCAtIEZpbGUgd2FzIGNyZWF0ZWRcbiAqIC0gYCd1bmxpbmsnYCAtIEZpbGUgd2FzIGRlbGV0ZWRcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIGZpbGUgY2hhbmdlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGZpbGVDaGFuZ2VkSG9vaywgZmlsZUNoYW5nZWRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IGZpbGVDaGFuZ2VkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdGaWxlIGNoYW5nZWQnLCB7IHBhdGg6IGlucHV0LmZpbGVfcGF0aCwgZXZlbnQ6IGlucHV0LmV2ZW50IH0pO1xuICogICByZXR1cm4gZmlsZUNoYW5nZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNmaWxlY2hhbmdlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZmlsZUNoYW5nZWRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJGaWxlQ2hhbmdlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuIiwgIi8qKlxuICogTG9nZ2VyIHN5c3RlbSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgc3RydWN0dXJlZCBsb2dnaW5nIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBvcHRpb25hbCBmaWxlIG91dHB1dC5cbiAqIFRoZSBsb2dnZXIgaXMgKipzaWxlbnQgYnkgZGVmYXVsdCoqIHRvIGF2b2lkIGludGVyZmVyaW5nIHdpdGggaG9vayBwcm90b2NvbFxuICogKHN0ZG91dCBpcyByZXNlcnZlZCBmb3IgSlNPTiByZXNwb25zZXMsIHN0ZGVyciBtYXkgY29uZmxpY3Qgd2l0aCBDbGF1ZGUgQ29kZSkuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gbG9nIGV2ZW50c1xuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gKiAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluICR7ZXZlbnQuaG9va1R5cGV9OiAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAqIHVuc3Vic2NyaWJlKCk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBjbG9zZVN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgb3BlblN5bmMsIHdyaXRlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuLyoqXG4gKiBBbGwgbG9nIGxldmVscyBpbiBvcmRlciBvZiBzZXZlcml0eSAobG93ZXN0IHRvIGhpZ2hlc3QpLlxuICovXG5leHBvcnQgY29uc3QgTE9HX0xFVkVMUyA9IFtcImRlYnVnXCIsIFwiaW5mb1wiLCBcIndhcm5cIiwgXCJlcnJvclwiXTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBMb2dnZXIgZm9yIENsYXVkZSBDb2RlIGhvb2tzIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBmaWxlIG91dHB1dC5cbiAqXG4gKiAjIyBLZXkgQmVoYXZpb3JzXG4gKlxuICogfCBDb25maWd1cmF0aW9uIHwgQmVoYXZpb3IgfFxuICogfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS18XG4gKiB8IE5vIGNvbmZpZyAoZGVmYXVsdCkgfCAqKlNpbGVudCoqIC0gbm8gb3V0cHV0IGFueXdoZXJlIHxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCBlbnYgdmFyIHwgQXBwZW5kIEpTT04gbGluZXMgdG8gZmlsZSB8XG4gKiB8IGAub24obGV2ZWwsIGhhbmRsZXIpYCByZWdpc3RlcmVkIHwgRXZlbnRzIGRlbGl2ZXJlZCB0byBoYW5kbGVycyBvbmx5IHxcbiAqIHwgTXVsdGlwbGUgZGVzdGluYXRpb25zIHwgQWxsIGRlc3RpbmF0aW9ucyByZWNlaXZlIGV2ZW50cyB8XG4gKlxuICogIyMgSW1wb3J0YW50IE5vdGVzXG4gKlxuICogLSAqKk5ldmVyIG91dHB1dHMgdG8gc3Rkb3V0KiogKHJlc2VydmVkIGZvciBKU09OIGhvb2sgcmVzcG9uc2UpXG4gKiAtICoqTmV2ZXIgb3V0cHV0cyB0byBzdGRlcnIqKiAobWF5IGludGVyZmVyZSB3aXRoIENsYXVkZSBDb2RlIGVycm9yIGhhbmRsaW5nKVxuICogLSBGaWxlIG91dHB1dCB1c2VzIEpTT04gTGluZXMgZm9ybWF0IGZvciBlYXN5IHBhcnNpbmdcbiAqIC0gYC5vbihsZXZlbCwgaGFuZGxlcilgIHJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb25cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBldmVudHMgYXQgc3BlY2lmaWMgbGV2ZWxcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4ge1xuICogICBzZW5kQWxlcnQoZXZlbnQubWVzc2FnZSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMb2cgd2l0aGluIGEgaG9vayBoYW5kbGVyXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ0Fib3V0IHRvIHZhbGlkYXRlIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJlZCBldmVudCBoYW5kbGVycyBieSBsb2cgbGV2ZWwuXG4gICAgICovXG4gICAgaGFuZGxlcnMgPSBuZXcgTWFwKCk7XG4gICAgLyoqXG4gICAgICogRmlsZSBkZXNjcmlwdG9yIGZvciBsb2cgZmlsZSBvdXRwdXQuXG4gICAgICogTGF6aWx5IGluaXRpYWxpemVkIG9uIGZpcnN0IHdyaXRlLlxuICAgICAqL1xuICAgIGxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgLyoqXG4gICAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUsIGlmIGNvbmZpZ3VyZWQuXG4gICAgICovXG4gICAgbG9nRmlsZVBhdGggPSBudWxsO1xuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgZmlsZSBpbml0aWFsaXphdGlvbiBoYXMgYmVlbiBhdHRlbXB0ZWQuXG4gICAgICovXG4gICAgZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgLyoqXG4gICAgICogQ3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRIb29rVHlwZTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGhvb2sgaW5wdXQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRJbnB1dDtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IExvZ2dlciBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAgICogY3JlYXRpbmcgbmV3IGluc3RhbmNlcy5cbiAgICAgKiBAcGFyYW0gY29uZmlnIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvblxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIFVzZSBzaW5nbGV0b24gKHJlY29tbWVuZGVkKVxuICAgICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gICAgICpcbiAgICAgKiAvLyBPciBjcmVhdGUgY3VzdG9tIGluc3RhbmNlXG4gICAgICogY29uc3QgY3VzdG9tTG9nZ2VyID0gbmV3IExvZ2dlcih7IGxvZ0ZpbGVQYXRoOiAnL3Zhci9sb2cvaG9va3MubG9nJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzIG1hcCBmb3IgZWFjaCBsZXZlbFxuICAgICAgICBmb3IgKGNvbnN0IGxldmVsIG9mIExPR19MRVZFTFMpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlcnMuc2V0KGxldmVsLCBuZXcgU2V0KCkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNldCBsb2cgZmlsZSBwYXRoIGZyb20gZXhwbGljaXQgY29uZmlnLCBvciBieSByZWFkaW5nIHRoZSBjb25maWd1cmVkIGVudiB2YXJcbiAgICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGNvbmZpZy5sb2dGaWxlUGF0aCA/PyAoY29uZmlnLmxvZ0VudlZhciA/IHByb2Nlc3MuZW52W2NvbmZpZy5sb2dFbnZWYXJdIDogdW5kZWZpbmVkKSA/PyBudWxsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRoYXQgaXMgdHlwaWNhbGx5IG9ubHkgdXNlZnVsXG4gICAgICogZHVyaW5nIGRldmVsb3BtZW50IG9yIHRyb3VibGVzaG9vdGluZy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBkZWJ1ZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgaW5wdXRTaXplOiAyNTYgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZGVidWcobWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJkZWJ1Z1wiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIGxpa2UgaG9vayBpbnZvY2F0aW9ucywgc3VjY2Vzc2Z1bFxuICAgICAqIGNvbXBsZXRpb25zLCBvciBzdGF0ZSBjaGFuZ2VzLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGluZm8gbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmluZm8oJ1Nlc3Npb24gc3RhcnRlZCcsIHsgc291cmNlOiAnc3RhcnR1cCcsIHNlc3Npb25JZDogJ2FiYzEyMycgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgaW5mbyhtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImluZm9cIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgaXNzdWVzIGJ1dCBkb24ndCBwcmV2ZW50XG4gICAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgd2FybmluZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIud2FybignRGVwcmVjYXRlZCBob29rIHBhdHRlcm4gZGV0ZWN0ZWQnLCB7IHBhdHRlcm46ICdsZWdhY3lNYXRjaGVyJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICB3YXJuKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwid2FyblwiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBlcnJvciBjb25kaXRpb25zIHRoYXQgcmVxdWlyZSBhdHRlbnRpb24gYnV0IHdlcmUgaGFuZGxlZFxuICAgICAqIGdyYWNlZnVsbHkuIEZvciBleGNlcHRpb25zLCBwcmVmZXIge0BsaW5rIGxvZ0Vycm9yfS5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBlcnJvciBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byB2YWxpZGF0ZSB0b29sIGlucHV0JywgeyB0b29sTmFtZTogJ0Jhc2gnLCByZWFzb246ICdlbXB0eSBjb21tYW5kJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBlcnJvcihtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImVycm9yXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICAgKlxuICAgICAqIFVzZSB0aGlzIG1ldGhvZCB3aGVuIGxvZ2dpbmcgY2F1Z2h0IGV4Y2VwdGlvbnMgdG8gY2FwdHVyZSB0aGUgZnVsbFxuICAgICAqIGVycm9yIGNvbnRleHQgaW5jbHVkaW5nIG5hbWUsIG1lc3NhZ2UsIHN0YWNrIHRyYWNlLCBhbmQgY2F1c2UgY2hhaW4uXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHRyeSB7XG4gICAgICogICBhd2FpdCBkYW5nZXJvdXNPcGVyYXRpb24oKTtcbiAgICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICAgKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdGYWlsZWQgdG8gZXhlY3V0ZSBkYW5nZXJvdXMgb3BlcmF0aW9uJywge1xuICAgICAqICAgICBvcGVyYXRpb246ICdkZWxldGUnLFxuICAgICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgICAqICAgfSk7XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGxvZ0Vycm9yKGVycm9yLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGVycm9ySW5mbyA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvcik7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbDogXCJlcnJvclwiLFxuICAgICAgICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgICAgICAgIGVycm9yOiBlcnJvckluZm8sXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZXMgYSBoYW5kbGVyIHRvIGxvZyBldmVudHMgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKlxuICAgICAqIFRoZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBsb2cgZXZlbnQgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBoYW5kbGVyXG4gICAgICogaXMgbm8gbG9uZ2VyIG5lZWRlZC5cbiAgICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgbG9nIGxldmVsIHRvIHN1YnNjcmliZSB0b1xuICAgICAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBldmVudFxuICAgICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgdGhlIGhhbmRsZXJcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBTdWJzY3JpYmUgdG8gZXJyb3IgZXZlbnRzXG4gICAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gICAgICogICBjb25zb2xlLmVycm9yKGBbJHtldmVudC5ob29rVHlwZX1dICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAgICAgKiAgIGlmIChldmVudC5lcnJvcikge1xuICAgICAqICAgICBjb25zb2xlLmVycm9yKGV2ZW50LmVycm9yLnN0YWNrKTtcbiAgICAgKiAgIH1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICAgICAqIHVuc3Vic2NyaWJlKCk7XG4gICAgICogYGBgXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIGxpYnJhcnlcbiAgICAgKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAgICAgKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubygpO1xuICAgICAqXG4gICAgICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBvbihsZXZlbCwgaGFuZGxlcikge1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQobGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgbGV2ZWxIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGxldmVsSGFuZGxlcnM/LmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqXG4gICAgICogVGhpcyBpcyBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBiZWZvcmUgaW52b2tpbmcgaG9vayBoYW5kbGVycy5cbiAgICAgKiBZb3UgdHlwaWNhbGx5IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIGRpcmVjdGx5LlxuICAgICAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSB0eXBlIG9mIGhvb2sgYmVpbmcgZXhlY3V0ZWRcbiAgICAgKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCBkYXRhXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgc2V0Q29udGV4dChob29rVHlwZSwgaW5wdXQpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSBob29rVHlwZTtcbiAgICAgICAgdGhpcy5jdXJyZW50SW5wdXQgPSBpbnB1dDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dC5cbiAgICAgKlxuICAgICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBjbGVhckNvbnRleHQoKSB7XG4gICAgICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29uZmlndXJlcyB0aGUgbG9nIGZpbGUgcGF0aCBhdCBydW50aW1lLlxuICAgICAqXG4gICAgICogQ2FsbCB0aGlzIHRvIGVuYWJsZSBvciBjaGFuZ2UgZmlsZSBsb2dnaW5nLiBTZXR0aW5nIHRvIGBudWxsYCBkaXNhYmxlc1xuICAgICAqIGZpbGUgbG9nZ2luZyAoYnV0IGRvZXNuJ3QgY2xvc2UgZXhpc3RpbmcgZmlsZSBoYW5kbGUgaW1tZWRpYXRlbHkpLlxuICAgICAqIEBwYXJhbSBmaWxlUGF0aCAtIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBvciBudWxsIHRvIGRpc2FibGVcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBFbmFibGUgZmlsZSBsb2dnaW5nIGF0IHJ1bnRpbWVcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZSgnL3Zhci9sb2cvY2xhdWRlLWhvb2tzLmxvZycpO1xuICAgICAqXG4gICAgICogLy8gRGlzYWJsZSBmaWxlIGxvZ2dpbmdcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZShudWxsKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBzZXRMb2dGaWxlKGZpbGVQYXRoKSB7XG4gICAgICAgIC8vIENsb3NlIGV4aXN0aW5nIGZpbGUgaWYgb3BlblxuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChjbG9zZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYFtjbGF1ZGUtY29kZS1ob29rc10gRmFpbGVkIHRvIGNsb3NlIGxvZyBmaWxlOiAke1N0cmluZyhjbG9zZUVycm9yKX1cXG5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlcyBhbGwgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIGxvZ2dlci5cbiAgICAgKlxuICAgICAqIENhbGwgdGhpcyBkdXJpbmcgZ3JhY2VmdWwgc2h1dGRvd24gdG8gZW5zdXJlIGFsbCBsb2cgZGF0YSBpcyBmbHVzaGVkLlxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gICAgICogICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgKiB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoY2xvc2VFcnJvcikge1xuICAgICAgICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBbY2xhdWRlLWNvZGUtaG9va3NdIEZhaWxlZCB0byBjbG9zZSBsb2cgZmlsZTogJHtTdHJpbmcoY2xvc2VFcnJvcil9XFxuYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZXJlIGFyZSBhbnkgYWN0aXZlIGhhbmRsZXJzIG9yIGRlc3RpbmF0aW9ucy5cbiAgICAgKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgaGFuZGxlcnMgYXJlIHJlZ2lzdGVyZWQgb3IgZmlsZSBsb2dnaW5nIGlzIGVuYWJsZWQuXG4gICAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICAgKi9cbiAgICBoYXNEZXN0aW5hdGlvbnMoKSB7XG4gICAgICAgIGZvciAoY29uc3QgaGFuZGxlcnMgb2YgdGhpcy5oYW5kbGVycy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKGhhbmRsZXJzLnNpemUgPiAwKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmxvZ0ZpbGVQYXRoICE9PSBudWxsO1xuICAgIH1cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8qKlxuICAgICAqIEVtaXRzIGEgbG9nIGV2ZW50LlxuICAgICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBzZXZlcml0eSBsZXZlbCBvZiB0aGUgZXZlbnRcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBsb2cgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0IGRhdGFcbiAgICAgKi9cbiAgICBlbWl0KGxldmVsLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbCxcbiAgICAgICAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERlbGl2ZXJzIGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGRlc3RpbmF0aW9ucy5cbiAgICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGRlbGl2ZXJcbiAgICAgKi9cbiAgICBkZWxpdmVyRXZlbnQoZXZlbnQpIHtcbiAgICAgICAgLy8gRGVsaXZlciB0byBldmVudCBoYW5kbGVyc1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnQubGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGhhbmRsZXJFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgW2NsYXVkZS1jb2RlLWhvb2tzXSBMb2cgaGFuZGxlciBlcnJvcjogJHtTdHJpbmcoaGFuZGxlckVycm9yKX1cXG5gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gV3JpdGUgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgICAgIHRoaXMud3JpdGVUb0ZpbGUoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gd3JpdGVcbiAgICAgKi9cbiAgICB3cml0ZVRvRmlsZShldmVudCkge1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIC8vIExhenkgaW5pdGlhbGl6YXRpb24gb2YgZmlsZSBoYW5kbGVcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmlsZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCA9PT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBgJHtKU09OLnN0cmluZ2lmeShldmVudCl9XFxuYDtcbiAgICAgICAgICAgIHdyaXRlU3luYyh0aGlzLmxvZ0ZpbGVGZCwgbGluZSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKHdyaXRlRXJyb3IpIHtcbiAgICAgICAgICAgIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nIGFmdGVyIGEgd3JpdGUgZmFpbHVyZSB0byBhdm9pZCByZXBlYXRlZCBlcnJvcnNcbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgW2NsYXVkZS1jb2RlLWhvb2tzXSBMb2cgZmlsZSB3cml0ZSBmYWlsZWQ6ICR7U3RyaW5nKHdyaXRlRXJyb3IpfVxcbmApO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBsb2cgZmlsZSBmb3Igd3JpdGluZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmlsZSgpIHtcbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFbnN1cmUgZGlyZWN0b3J5IGV4aXN0c1xuICAgICAgICAgICAgY29uc3QgZGlyID0gZGlybmFtZSh0aGlzLmxvZ0ZpbGVQYXRoKTtcbiAgICAgICAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgICAgICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBPcGVuIGZpbGUgZm9yIGFwcGVuZGluZ1xuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBvcGVuU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCBcImFcIik7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgaW5pdGlhbGl6YXRpb24gZXJyb3JzXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbVxuICAgICAqIEByZXR1cm5zIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBleHRyYWN0RXJyb3JJbmZvKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBjYXVzZSBjaGFpbiBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAoZXJyb3IuY2F1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGluZm8uY2F1c2UgPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IuY2F1c2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH1cbiAgICAgICAgLy8gSGFuZGxlIG5vbi1FcnJvciB2YWx1ZXNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IFwiVW5rbm93bkVycm9yXCIsXG4gICAgICAgICAgICBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgICB9O1xuICAgIH1cbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNpbmdsZXRvbiBFeHBvcnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogVXNlIHRoaXMgc2luZ2xldG9uIGZvciBhbGwgbG9nZ2luZyB3aXRoaW4gaG9va3MuIFRoZSBsb2dnZXIgaXMgY29uZmlndXJlZFxuICogdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgc3VwcG9ydHMgZXZlbnQgc3Vic2NyaXB0aW9uIGZvciBjdXN0b21cbiAqIGRlc3RpbmF0aW9ucy5cbiAqXG4gKiAjIyBDb25maWd1cmF0aW9uXG4gKlxuICogfCBFbnZpcm9ubWVudCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHxcbiAqIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCB8IFBhdGggdG8gbG9nIGZpbGUgKEpTT04gTGluZXMgZm9ybWF0KSB8XG4gKlxuICogIyMgVXNhZ2UgaW4gSG9va3NcbiAqXG4gKiBUaGUgbG9nZ2VyIGlzIHBhc3NlZCB0byBob29rIGhhbmRsZXJzIHZpYSBjb250ZXh0IGZvciBjb252ZW5pZW5jZTpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ1ZhbGlkYXRpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gKlxuICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oeyBsZXZlbDogJ2RlYnVnJyB9KTtcbiAqXG4gKiBsb2dnZXIub24oJ2RlYnVnJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmRlYnVnKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIERpcmVjdCB1c2FnZVxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBsb2dnZXIuaW5mbygnU3RhcnRpbmcgb3BlcmF0aW9uJyk7XG4gKiBsb2dnZXIud2FybignUmVzb3VyY2UgbGltaXQgYXBwcm9hY2hpbmcnLCB7IHVzYWdlOiAwLjkgfSk7XG4gKlxuICogdHJ5IHtcbiAqICAgYXdhaXQgcmlza3lPcGVyYXRpb24oKTtcbiAqIH0gY2F0Y2ggKGVycikge1xuICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnUmlza3kgb3BlcmF0aW9uIGZhaWxlZCcpO1xuICogfVxuICogYGBgXG4gKi9cbi8vIENMQVVERV9DT0RFX0hPT0tTX0xPR19FTlZfVkFSIGlzIHNldCB1bmNvbmRpdGlvbmFsbHkgYnkgdGhlIC0tbG9nLWVudi12YXIgYmFubmVyXG4vLyBiZWZvcmUgdGhpcyBtb2R1bGUgaW5pdGlhbGlzZXMuIElmIGFic2VudCwgZmFsbCBiYWNrIHRvIHRoZSBkZWZhdWx0IGVudiB2YXIgbmFtZS5cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKHtcbiAgICBsb2dFbnZWYXI6IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0xPR19FTlZfVkFSID8/IFwiQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVcIixcbn0pO1xuIiwgIi8qKlxuICogT3V0cHV0IHR5cGVzIGFuZCBidWlsZGVycyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZS1zYWZlIG91dHB1dCBidWlsZGVyIGZ1bmN0aW9ucyBmb3IgYWxsIDEyIGhvb2sgdHlwZXMuIEVhY2ggYnVpbGRlclxuICogYWNjZXB0cyBvcHRpb25zIHRoYXQgbWF0Y2ggdGhlIHdpcmUgZm9ybWF0IGV4cGVjdGVkIGJ5IENsYXVkZSBDb2RlLCB3aXRoIHR5cGVzXG4gKiBkZXJpdmVkIGZyb20gdGhlIENsYXVkZSBBZ2VudCBTREsncyBgU3luY0hvb2tKU09OT3V0cHV0YCB0eXBlLlxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKiBAbW9kdWxlXG4gKi9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4aXQgQ29kZSBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRXhpdCBjb2RlcyB1c2VkIGJ5IENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIHwgRXhpdCBDb2RlIHwgTmFtZSB8IFdoZW4gVXNlZCB8IENsYXVkZSBDb2RlIEJlaGF2aW9yIHxcbiAqIHwtLS0tLS0tLS0tLXwtLS0tLS18LS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS0tLS0tLS0tfFxuICogfCAwIHwgU3VjY2VzcyB8IEhhbmRsZXIgcmV0dXJucyBub3JtYWxseSB8IENvbnRpbnVlLCBwYXJzZSBzdGRvdXQgYXMgSlNPTiB8XG4gKiB8IDEgfCBFcnJvciB8IEludmFsaWQgaW5wdXQsIG5vbi1ibG9ja2luZyBlcnJvciB8IE5vbi1ibG9ja2luZywgc3RkZXJyIHRvIHVzZXIgb25seSB8XG4gKiB8IDIgfCBCbG9jayB8IEhhbmRsZXIgdGhyb3dzIE9SIGBzdG9wUmVhc29uYCBzZXQgfCBCbG9ja2luZywgc3RkZXJyIHNob3duIHRvIENsYXVkZSB8XG4gKi9cbmV4cG9ydCBjb25zdCBFWElUX0NPREVTID0ge1xuICAgIC8qKiBIYW5kbGVyIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuIENsYXVkZSBDb2RlIHBhcnNlcyBzdGRvdXQgYXMgSlNPTi4gKi9cbiAgICBTVUNDRVNTOiAwLFxuICAgIC8qKiBOb24tYmxvY2tpbmcgZXJyb3Igb2NjdXJyZWQgKGUuZy4sIGludmFsaWQgaW5wdXQpLiBzdGRlcnIgc2hvd24gdG8gdXNlciBvbmx5LiAqL1xuICAgIEVSUk9SOiAxLFxuICAgIC8qKiBIYW5kbGVyIHRocmV3IGV4Y2VwdGlvbiBPUiBibG9ja2luZyBhY3Rpb24gcmVxdWVzdGVkLiBzdGRlcnIgc2hvd24gdG8gQ2xhdWRlLiAqL1xuICAgIEJMT0NLOiAyLFxufTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE91dHB1dCBCdWlsZGVyIEZhY3Rvcmllc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IGhhdmUgaG9va1NwZWNpZmljT3V0cHV0IHdpdGggYSBob29rRXZlbnROYW1lIGRpc2NyaW1pbmF0b3IuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgICAgICBjb25zdCB7IGhvb2tTcGVjaWZpY091dHB1dCwgLi4ucmVzdCB9ID0gb3B0aW9ucztcbiAgICAgICAgY29uc3Qgc3Rkb3V0ID0gaG9va1NwZWNpZmljT3V0cHV0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8geyAuLi5yZXN0LCBob29rU3BlY2lmaWNPdXRwdXQ6IHsgaG9va0V2ZW50TmFtZTogaG9va1R5cGUsIC4uLmhvb2tTcGVjaWZpY091dHB1dCB9IH1cbiAgICAgICAgICAgIDogcmVzdDtcbiAgICAgICAgcmV0dXJuIHsgX3R5cGU6IGhvb2tUeXBlLCBzdGRvdXQgfTtcbiAgICB9O1xufVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IG9ubHkgdXNlIENvbW1vbk9wdGlvbnMgKHNpbXBsZSBwYXNzdGhyb3VnaCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4gKHtcbiAgICAgICAgX3R5cGU6IGhvb2tUeXBlLFxuICAgICAgICBzdGRvdXQ6IG9wdGlvbnMsXG4gICAgfSk7XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgdXNlIGRlY2lzaW9uLWJhc2VkIG9wdGlvbnMgKFN0b3AsIFN1YmFnZW50U3RvcCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiAoe1xuICAgICAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgICAgIHN0ZG91dDogb3B0aW9ucyxcbiAgICB9KTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgZXhpdC1jb2RlLWJhc2VkIGhvb2tzIChUZWFtbWF0ZUlkbGUsIFRhc2tDb21wbGV0ZWQpLlxuICpcbiAqIFRoZXNlIGhvb2tzIGRvbid0IHVzZSBKU09OIGRlY2lzaW9uIGNvbnRyb2wgKG5vIENvbW1vbk9wdGlvbnMpLlxuICogVGhlIG9ubHkgb3B0aW9uIGlzIGBzdGRlcnJgIFx1MjAxNCB3aGVuIHByZXNlbnQsIGl0IHRyaWdnZXJzIGV4aXQgY29kZSAyIChCTE9DSykuXG4gKiBTdGRvdXQgYWx3YXlzIHJlY2VpdmVzIGB7fWAgKGVtcHR5IEpTT04gb2JqZWN0KS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlRXhpdENvZGVPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuICh7IHN0ZGVyciB9ID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiB7fSxcbiAgICAgICAgLi4uKHN0ZGVyciAhPT0gdW5kZWZpbmVkID8geyBzdGRlcnIgfSA6IHt9KSxcbiAgICB9KTtcbn1cbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFByZVRvb2xVc2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFByZVRvb2xVc2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRvb2wgZXhlY3V0aW9uXG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7IHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyB9XG4gKiB9KTtcbiAqXG4gKiAvLyBEZW55IHdpdGggcmVhc29uXG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uOiAnZGVueScsXG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uUmVhc29uOiAnRGFuZ2Vyb3VzIGNvbW1hbmQgZGV0ZWN0ZWQnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEFsbG93IHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycsXG4gKiAgICAgdXBkYXRlZElucHV0OiB7IGNvbW1hbmQ6ICdscyAtbGEnIH1cbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHByZVRvb2xVc2VPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlByZVRvb2xVc2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0VG9vbFVzZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdFRvb2xVc2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGFmdGVyIGEgZmlsZSByZWFkXG4gKiBwb3N0VG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRmlsZSBjb250YWlucyBzZW5zaXRpdmUgZGF0YSdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RUb29sVXNlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQb3N0VG9vbFVzZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBvc3RUb29sVXNlRmFpbHVyZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1RyeSB1c2luZyBhIGRpZmZlcmVudCBhcHByb2FjaCdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUG9zdFRvb2xVc2VGYWlsdXJlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgVXNlclByb21wdFN1Ym1pdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVXNlclByb21wdFN1Ym1pdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdXNlclByb21wdFN1Ym1pdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnVGhpcyBwcm9qZWN0IHVzZXMgVHlwZVNjcmlwdCBzdHJpY3QgbW9kZSdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlVzZXJQcm9tcHRTdWJtaXRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXNzaW9uU3RhcnQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNlc3Npb25TdGFydE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc2Vzc2lvblN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IEpTT04uc3RyaW5naWZ5KHsgcHJvamVjdDogJ215LXByb2plY3QnIH0pXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXNzaW9uU3RhcnRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlNlc3Npb25TdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNlc3Npb25FbmQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNlc3Npb25FbmRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHNlc3Npb25FbmRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXNzaW9uRW5kT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJTZXNzaW9uRW5kXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3RvcE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGhlIHN0b3BcbiAqIHN0b3BPdXRwdXQoeyBkZWNpc2lvbjogJ2FwcHJvdmUnIH0pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggcmVhc29uXG4gKiBzdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1RoZXJlIGFyZSB1bmNvbW1pdHRlZCBjaGFuZ2VzJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN0b3BPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKFwiU3RvcFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN0b3BGYWlsdXJlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdG9wRmFpbHVyZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc3RvcEZhaWx1cmVPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdG9wRmFpbHVyZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiU3RvcEZhaWx1cmVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdWJhZ2VudFN0YXJ0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdWJhZ2VudFN0YXJ0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGb2N1cyBvbiBmaW5kaW5nIHBhdHRlcm5zJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3ViYWdlbnRTdGFydE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU3ViYWdlbnRTdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN1YmFnZW50U3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3ViYWdlbnRTdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1Rhc2sgbm90IGNvbXBsZXRlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoXCJTdWJhZ2VudFN0b3BcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBOb3RpZmljYXRpb24gaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIE5vdGlmaWNhdGlvbk91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgYWJvdXQgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdOb3RpZmljYXRpb24gZm9yd2FyZGVkIHRvIFNsYWNrICNhbGVydHMgY2hhbm5lbCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU3VwcHJlc3MgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHsgc3VwcHJlc3NPdXRwdXQ6IHRydWUgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IG5vdGlmaWNhdGlvbk91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiTm90aWZpY2F0aW9uXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlQ29tcGFjdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlQ29tcGFjdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgIHN5c3RlbU1lc3NhZ2U6ICdSZW1lbWJlcjogc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwcmVDb21wYWN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJQcmVDb21wYWN0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdENvbXBhY3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RDb21wYWN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwb3N0Q29tcGFjdE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RDb21wYWN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJQb3N0Q29tcGFjdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBlcm1pc3Npb25SZXF1ZXN0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQZXJtaXNzaW9uUmVxdWVzdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQXV0by1hcHByb3ZlXG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7IGJlaGF2aW9yOiAnYWxsb3cnIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1hcHByb3ZlIHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHtcbiAqICAgICAgIGJlaGF2aW9yOiAnYWxsb3cnLFxuICogICAgICAgdXBkYXRlZElucHV0OiB7IGZpbGVfcGF0aDogJy9zYWZlL3BhdGgnIH1cbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEF1dG8tZGVueVxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdkZW55JyxcbiAqICAgICAgIG1lc3NhZ2U6ICdOb3QgYWxsb3dlZCcsXG4gKiAgICAgICBpbnRlcnJ1cHQ6IHRydWVcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEZhbGwgdGhyb3VnaCB0byBub3JtYWwgcHJvbXB0XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQZXJtaXNzaW9uUmVxdWVzdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBlcm1pc3Npb25EZW5pZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBlcm1pc3Npb25EZW5pZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIExvZyBhbmQgYWxsb3cgcmV0cnlcbiAqIHBlcm1pc3Npb25EZW5pZWRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgcmV0cnk6IHRydWUgfVxuICogfSk7XG4gKlxuICogLy8gTG9nIHdpdGhvdXQgcmV0cnlcbiAqIHBlcm1pc3Npb25EZW5pZWRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwZXJtaXNzaW9uRGVuaWVkT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQZXJtaXNzaW9uRGVuaWVkXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2V0dXAgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNldHVwT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBZGQgY29udGV4dCBkdXJpbmcgc2V0dXBcbiAqIHNldHVwT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdQcm9qZWN0IGluaXRpYWxpemVkIHdpdGggY3VzdG9tIHNldHRpbmdzJ1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBTaW1wbGUgcGFzc3Rocm91Z2hcbiAqIHNldHVwT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2V0dXBPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlNldHVwXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgVGVhbW1hdGVJZGxlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBUZWFtbWF0ZUlkbGVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRlYW1tYXRlIHRvIGdvIGlkbGVcbiAqIHRlYW1tYXRlSWRsZU91dHB1dCh7fSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCBmZWVkYmFja1xuICogdGVhbW1hdGVJZGxlT3V0cHV0KHsgc3RkZXJyOiAnQ29udGludWUgd29ya2luZzogdW5maW5pc2hlZCB0YXNrcyByZW1haW4uJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdGVhbW1hdGVJZGxlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUV4aXRDb2RlT3V0cHV0QnVpbGRlcihcIlRlYW1tYXRlSWRsZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFRhc2tDcmVhdGVkIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBUYXNrQ3JlYXRlZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGFzayBjcmVhdGlvblxuICogdGFza0NyZWF0ZWRPdXRwdXQoe30pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggZmVlZGJhY2tcbiAqIHRhc2tDcmVhdGVkT3V0cHV0KHsgc3RkZXJyOiAnQ2Fubm90IGNyZWF0ZSB0YXNrOiBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkcy4nIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB0YXNrQ3JlYXRlZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVFeGl0Q29kZU91dHB1dEJ1aWxkZXIoXCJUYXNrQ3JlYXRlZFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFRhc2tDb21wbGV0ZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFRhc2tDb21wbGV0ZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRhc2sgY29tcGxldGlvblxuICogdGFza0NvbXBsZXRlZE91dHB1dCh7fSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCBmZWVkYmFja1xuICogdGFza0NvbXBsZXRlZE91dHB1dCh7IHN0ZGVycjogJ0Nhbm5vdCBjb21wbGV0ZTogdGVzdHMgYXJlIGZhaWxpbmcuJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdGFza0NvbXBsZXRlZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVFeGl0Q29kZU91dHB1dEJ1aWxkZXIoXCJUYXNrQ29tcGxldGVkXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgRWxpY2l0YXRpb24gaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBbiBFbGljaXRhdGlvbk91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWNjZXB0IHRoZSBlbGljaXRhdGlvblxuICogZWxpY2l0YXRpb25PdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgYWN0aW9uOiAnYWNjZXB0JywgY29udGVudDogeyB1c2VybmFtZTogJ2FsaWNlJyB9IH1cbiAqIH0pO1xuICpcbiAqIC8vIERlY2xpbmUgdGhlIGVsaWNpdGF0aW9uXG4gKiBlbGljaXRhdGlvbk91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDogeyBhY3Rpb246ICdkZWNsaW5lJyB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgZWxpY2l0YXRpb25PdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIkVsaWNpdGF0aW9uXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgRWxpY2l0YXRpb25SZXN1bHQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBbiBFbGljaXRhdGlvblJlc3VsdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogZWxpY2l0YXRpb25SZXN1bHRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBlbGljaXRhdGlvblJlc3VsdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiRWxpY2l0YXRpb25SZXN1bHRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBDb25maWdDaGFuZ2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIENvbmZpZ0NoYW5nZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uZmlnQ2hhbmdlT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgY29uZmlnQ2hhbmdlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJDb25maWdDaGFuZ2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBJbnN0cnVjdGlvbnNMb2FkZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBbiBJbnN0cnVjdGlvbnNMb2FkZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGluc3RydWN0aW9uc0xvYWRlZE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGluc3RydWN0aW9uc0xvYWRlZE91dHB1dCA9IFxuLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJJbnN0cnVjdGlvbnNMb2FkZWRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBXb3JrdHJlZUNyZWF0ZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgV29ya3RyZWVDcmVhdGVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHdvcmt0cmVlQ3JlYXRlT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgd29ya3RyZWVDcmVhdGVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIldvcmt0cmVlQ3JlYXRlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgV29ya3RyZWVSZW1vdmUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFdvcmt0cmVlUmVtb3ZlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB3b3JrdHJlZVJlbW92ZU91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHdvcmt0cmVlUmVtb3ZlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJXb3JrdHJlZVJlbW92ZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIEN3ZENoYW5nZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIEN3ZENoYW5nZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFJldHVybiBhZGRpdGlvbmFsIHBhdGhzIHRvIHdhdGNoIGFmdGVyIHRoZSBjd2QgY2hhbmdlXG4gKiBjd2RDaGFuZ2VkT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgd2F0Y2hQYXRoczogWycvbmV3L3BhdGgvdG8vd2F0Y2gnXVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBTaW1wbGUgcGFzc3Rocm91Z2hcbiAqIGN3ZENoYW5nZWRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBjd2RDaGFuZ2VkT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJDd2RDaGFuZ2VkXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgRmlsZUNoYW5nZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIEZpbGVDaGFuZ2VkT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBVcGRhdGUgdGhlIHNldCBvZiB3YXRjaGVkIHBhdGhzXG4gKiBmaWxlQ2hhbmdlZE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHdhdGNoUGF0aHM6IFsnL3BhdGgvdG8vd2F0Y2gnLCAnL2Fub3RoZXIvcGF0aCddXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFNpbXBsZSBwYXNzdGhyb3VnaFxuICogZmlsZUNoYW5nZWRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBmaWxlQ2hhbmdlZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiRmlsZUNoYW5nZWRcIik7XG4iLCAiLyoqXG4gKiBSdW50aW1lIG1vZHVsZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogSGFuZGxlcyBzdGRpbi9zdGRvdXQvZXhpdCBjb2RlIHNlbWFudGljcyBmb3IgY29tcGlsZWQgaG9vayBleGVjdXRpb24uXG4gKiBUaGlzIG1vZHVsZSBpcyB0aGUgY29yZSBvcmNoZXN0cmF0b3IgdGhhdDpcbiAqIC0gUmVhZHMgSlNPTiBmcm9tIHN0ZGluICh3aXJlIGZvcm1hdCB3aXRoIHNuYWtlX2Nhc2UgcHJvcGVydGllcylcbiAqIC0gSW52b2tlcyB0aGUgaG9vayBoYW5kbGVyXG4gKiAtIFdyaXRlcyBvdXRwdXQgdG8gc3Rkb3V0XG4gKiAtIE1hbmFnZXMgZXhpdCBjb2Rlc1xuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEluIGEgY29tcGlsZWQgaG9vayBmaWxlXG4gKiBpbXBvcnQgeyBleGVjdXRlIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL3J1bnRpbWUnO1xuICogaW1wb3J0IG15SG9vayBmcm9tICcuL215LWhvb2suanMnO1xuICpcbiAqIGV4ZWN1dGUobXlIb29rKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmltcG9ydCB7IHBlcnNpc3RFbnZWYXIsIHBlcnNpc3RFbnZWYXJzIH0gZnJvbSBcIi4vZW52LmpzXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi9sb2dnZXIuanNcIjtcbmltcG9ydCB7IEVYSVRfQ09ERVMgfSBmcm9tIFwiLi9vdXRwdXRzLmpzXCI7XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdGRpbi9TdGRvdXQgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogUmVhZHMgYWxsIGRhdGEgZnJvbSBzdGRpbi5cbiAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjb21wbGV0ZSBzdGRpbiBjb250ZW50XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlYWRTdGRpbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCBjaHVua3MgPSBbXTtcbiAgICAgICAgLy8gU2V0IGVuY29kaW5nIGZpcnN0IHRvIGVuc3VyZSBkYXRhIGV2ZW50cyByZWNlaXZlIHN0cmluZ3NcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5zZXRFbmNvZGluZyhcInV0Zi04XCIpO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHtcbiAgICAgICAgICAgIGNodW5rcy5wdXNoKGNodW5rKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2Nlc3Muc3RkaW4ub24oXCJlbmRcIiwgKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShjaHVua3Muam9pbihcIlwiKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZXJyb3JcIiwgKGVycm9yKSA9PiB7XG4gICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cbi8qKlxuICogUGFyc2VzIHN0ZGluIEpTT04gaW5wdXQuXG4gKiBAcGFyYW0gc3RkaW5Db250ZW50IC0gUmF3IHN0ZGluIGNvbnRlbnRcbiAqIEByZXR1cm5zIFBhcnNlZCBpbnB1dCAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiBAdGhyb3dzIEVycm9yIGlmIEpTT04gaXMgbWFsZm9ybWVkXG4gKi9cbmZ1bmN0aW9uIHBhcnNlU3RkaW5JbnB1dChzdGRpbkNvbnRlbnQpIHtcbiAgICAvLyBQYXJzZSBKU09OIC0gaW5wdXQgdXNlcyB3aXJlIGZvcm1hdCAoc25ha2VfY2FzZSkgZGlyZWN0bHlcbiAgICBjb25zdCByYXdJbnB1dCA9IEpTT04ucGFyc2Uoc3RkaW5Db250ZW50KTtcbiAgICByZXR1cm4gcmF3SW5wdXQ7XG59XG4vKipcbiAqIFdyaXRlcyBob29rIG91dHB1dCB0byBzdGRvdXQuXG4gKlxuICogT3V0cHV0IHVzZXMgY2FtZWxDYXNlIGtleXMgcGVyIENsYXVkZSBDb2RlIGhvb2sgc3BlY2lmaWNhdGlvbi5cbiAqIEBwYXJhbSBvdXRwdXQgLSBUaGUgaG9vayBvdXRwdXQgdG8gd3JpdGVcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNob29rLW91dHB1dC1zdHJ1Y3R1cmVcbiAqL1xuZnVuY3Rpb24gd3JpdGVTdGRvdXQob3V0cHV0KSB7XG4gICAgLy8gT3V0cHV0IHVzZXMgY2FtZWxDYXNlIC0gbm8gdHJhbnNmb3JtYXRpb24gbmVlZGVkXG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoSlNPTi5zdHJpbmdpZnkob3V0cHV0KSk7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFcnJvciBIYW5kbGluZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIGVycm9yIG91dHB1dCBmb3IgbWFsZm9ybWVkIHN0ZGluIEpTT04uXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgcGFyc2UgZXJyb3JcbiAqIEByZXR1cm5zIEhvb2tPdXRwdXQgd2l0aCBlbXB0eSBzdGRvdXRcbiAqL1xuZnVuY3Rpb24gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpIHtcbiAgICBsb2dnZXIuZXJyb3IoYEludmFsaWQgSlNPTiBpbnB1dDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgcmV0dXJuIHsgc3Rkb3V0OiB7fSB9O1xufVxuLyoqXG4gKiBXcml0ZXMgaGFuZGxlciBlcnJvciBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdHMgd2l0aCBjb2RlIDIuXG4gKlxuICogV2hlbiBhIGhvb2sgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uOlxuICogLSBTdGFja3RyYWNlICh3aXRoIHNvdXJjZW1hcHMgaWYgYXZhaWxhYmxlKSBpcyBvdXRwdXQgdG8gc3RkZXJyXG4gKiAtIFByb2Nlc3MgZXhpdHMgd2l0aCBjb2RlIDIgKEJMT0NLKVxuICogLSBObyBKU09OIGlzIG91dHB1dCB0byBzdGRvdXRcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0aHJvd24gYnkgdGhlIGhhbmRsZXJcbiAqL1xuZnVuY3Rpb24gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKSB7XG4gICAgLy8gV3JpdGUgc3RhY2sgdHJhY2UgdG8gc3RkZXJyIChzb3VyY2VtYXBzIGFyZSBhcHBsaWVkIGF1dG9tYXRpY2FsbHkgYnkgTm9kZS5qcylcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlfVxcbmApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7U3RyaW5nKGVycm9yKX1cXG5gKTtcbiAgICB9XG4gICAgLy8gTG9nIHRvIGZpbGUgaWYgY29uZmlndXJlZFxuICAgIGxvZ2dlci5lcnJvcihgSG9vayBoYW5kbGVyIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAvLyBDbGVhciBsb2dnZXIgY29udGV4dCBhbmQgY2xvc2VcbiAgICBsb2dnZXIuY2xlYXJDb250ZXh0KCk7XG4gICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgLy8gRXhpdCB3aXRoIGNvZGUgMiAoQkxPQ0spIC0gbm8gSlNPTiBvdXRwdXRcbiAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5CTE9DSyk7XG59XG4vKipcbiAqIENvbnZlcnRzIGEgU3BlY2lmaWNIb29rT3V0cHV0IHRvIEhvb2tPdXRwdXQgZm9yIHdpcmUgZm9ybWF0LlxuICpcbiAqIFNwZWNpZmljSG9va091dHB1dCB0eXBlcyBoYXZlOiB7IF90eXBlLCBzdGRvdXQsIHN0ZGVycj8gfVxuICogSG9va091dHB1dCBoYXM6IHsgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqXG4gKiBTaW5jZSBvdXRwdXQgYnVpbGRlcnMgbm93IHByb2R1Y2Ugd2lyZS1mb3JtYXQgZGlyZWN0bHksIHRoaXMgZnVuY3Rpb25cbiAqIHNpbXBseSBzdHJpcHMgdGhlIGBfdHlwZWAgZGlzY3JpbWluYXRvciBmaWVsZC5cbiAqIEBwYXJhbSBzcGVjaWZpY091dHB1dCAtIFRoZSBzcGVjaWZpYyBvdXRwdXQgZnJvbSBhIGhvb2sgaGFuZGxlclxuICogQHJldHVybnMgSG9va091dHB1dCByZWFkeSBmb3Igc2VyaWFsaXphdGlvblxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gcHJlVG9vbFVzZU91dHB1dCh7IGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfSB9KTtcbiAqIGNvbnN0IGhvb2tPdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAqIC8vIGhvb2tPdXRwdXQ6IHsgc3Rkb3V0OiB7IGhvb2tTcGVjaWZpY091dHB1dDogeyAuLi4gfSB9IH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFRvSG9va091dHB1dChzcGVjaWZpY091dHB1dCkge1xuICAgIGNvbnN0IHsgc3Rkb3V0LCBzdGRlcnIgfSA9IHNwZWNpZmljT3V0cHV0O1xuICAgIHJldHVybiBzdGRlcnIgIT09IHVuZGVmaW5lZCA/IHsgc3Rkb3V0LCBzdGRlcnIgfSA6IHsgc3Rkb3V0IH07XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGVjdXRlIEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEV4ZWN1dGVzIGEgaG9vayBoYW5kbGVyIHdpdGggZnVsbCBydW50aW1lIG9yY2hlc3RyYXRpb24uXG4gKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeSBwb2ludCB0aGF0IGNvbXBpbGVkIGhvb2tzIHVzZS4gV2hlbiBhIGNvbXBpbGVkIGhvb2tcbiAqIHJ1bnMgYXMgYSBDTEk6XG4gKlxuICogMS4gUmVhZHMgYWxsIHN0ZGluXG4gKiAyLiBQYXJzZXMgSlNPTiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAzLiBTZXRzIHVwIGxvZ2dlciBjb250ZXh0IChob29rVHlwZSwgaW5wdXQpXG4gKiA0LiBDYWxscyBoYW5kbGVyIHdpdGggaW5wdXQgYW5kIGNvbnRleHQgKGxvZ2dlcilcbiAqIDUuIEhhbmRsZXMgYW55IGVycm9ycywgbG9ncyB0aGVtXG4gKiA2LiBXcml0ZXMgSlNPTiB0byBzdGRvdXRcbiAqIDcuIENsb3NlcyBsb2dnZXJcbiAqIDguIEV4aXRzIHdpdGggYXBwcm9wcmlhdGUgY29kZVxuICogQHBhcmFtIGhvb2tGbiAtIFRoZSBob29rIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgKGZyb20gaG9vayBmYWN0b3J5KVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEluIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCB7IHByZVRvb2xVc2VIb29rLCBwcmVUb29sVXNlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBjb25zdCBteUhvb2sgPSBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShob29rRm4pIHtcbiAgICBsZXQgb3V0cHV0O1xuICAgIHRyeSB7XG4gICAgICAgIC8vIFJlYWQgYW5kIHBhcnNlIHN0ZGluXG4gICAgICAgIGxldCBzdGRpbkNvbnRlbnQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzdGRpbkNvbnRlbnQgPSBhd2FpdCByZWFkU3RkaW4oKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2dFcnJvcihlcnJvciwgXCJGYWlsZWQgdG8gcmVhZCBzdGRpblwiKTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBQYXJzZSBhbmQgdHJhbnNmb3JtIGlucHV0XG4gICAgICAgIGxldCBpbnB1dDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlucHV0ID0gcGFyc2VTdGRpbklucHV0KHN0ZGluQ29udGVudCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIubG9nRXJyb3IoZXJyb3IsIFwiRmFpbGVkIHRvIHBhcnNlIHN0ZGluIEpTT05cIik7XG4gICAgICAgICAgICBvdXRwdXQgPSBjcmVhdGVNYWxmb3JtZWRJbnB1dE91dHB1dChlcnJvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IGxvZ2dlciBjb250ZXh0XG4gICAgICAgIGNvbnN0IGhvb2tFdmVudE5hbWUgPSBob29rRm4uaG9va0V2ZW50TmFtZTtcbiAgICAgICAgbG9nZ2VyLnNldENvbnRleHQoaG9va0V2ZW50TmFtZSwgaW5wdXQpO1xuICAgICAgICAvLyBCdWlsZCBjb250ZXh0IC0gU2Vzc2lvblN0YXJ0IGhvb2tzIGdldCBleHRlbmRlZCBjb250ZXh0IHdpdGggcGVyc2lzdEVudlZhclxuICAgICAgICBjb25zdCBjb250ZXh0ID0gaG9va0V2ZW50TmFtZSA9PT0gXCJTZXNzaW9uU3RhcnRcIiA/IHsgbG9nZ2VyLCBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IDogeyBsb2dnZXIgfTtcbiAgICAgICAgLy8gRXhlY3V0ZSBoYW5kbGVyXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzcGVjaWZpY091dHB1dCA9IGF3YWl0IGhvb2tGbihpbnB1dCwgY29udGV4dCk7XG4gICAgICAgICAgICBpZiAoc3BlY2lmaWNPdXRwdXQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZXIgdGhyZXcgLSBvdXRwdXQgc3RhY2t0cmFjZSB0byBzdGRlcnIgYW5kIGV4aXQgd2l0aCBjb2RlIDJcbiAgICAgICAgICAgIC8vIFRoaXMgY2FsbCBuZXZlciByZXR1cm5zIChwcm9jZXNzLmV4aXQpXG4gICAgICAgICAgICBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZpbmFsbHkge1xuICAgICAgICAvLyBXcml0ZSBvdXRwdXQgaWYgd2UgaGF2ZSBpdFxuICAgICAgICBpZiAob3V0cHV0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHdyaXRlU3Rkb3V0KG91dHB1dC5zdGRvdXQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIENsZWFuIHVwIGxvZ2dlciAoc2luZ2xlIGNsZWFudXAgcGF0aClcbiAgICAgICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgICAgICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgICAgLy8gRXhpdC1jb2RlIEJMT0NLOiB1bmxpa2UgaGFuZGxlciB0aHJvdyAobm8gc3Rkb3V0KSwgdGhpcyBwYXRoIHN0aWxsIHdyaXRlc1xuICAgICAgICAvLyBzdHJ1Y3R1cmVkIEpTT04gdG8gc3Rkb3V0IChhcyBlbXB0eSB7fSkgYWxvbmdzaWRlIHRoZSBzdGRlcnIgbWVzc2FnZS5cbiAgICAgICAgLy8gVGhlIGNhbGxlciBjb250cm9scyBzdGRlcnIgZm9ybWF0dGluZyAobm8gYXBwZW5kZWQgbmV3bGluZSkuXG4gICAgICAgIGlmIChvdXRwdXQ/LnN0ZGVyciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShvdXRwdXQuc3RkZXJyKTtcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLkJMT0NLKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBFeGl0IHdpdGggc3VjY2VzcyAoaGFuZGxlciBlcnJvcnMgZXhpdCB2aWEgaGFuZGxlSGFuZGxlckVycm9yIHdpdGggY29kZSAyKVxuICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgICB9XG59XG4iLCAiaW1wb3J0IGhvb2sgZnJvbSAnLi9zdWJhZ2VudC1zdG9wLnRzJztcbmltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICcuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi93b3Jrc3BhY2Uvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L3J1bnRpbWUuanMnO1xuXG5leGVjdXRlKGhvb2spO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7O0FBYUEsU0FBUyxZQUFBQSxpQkFBZ0I7OztBQ0F6QixTQUFTLGdCQUFnQjtBQUN6QixTQUFTLGVBQWU7QUFDeEIsU0FBUyxZQUFZOzs7QUNlZCxJQUFNLFdBQU4sY0FBdUIsTUFBTTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFRbEMsWUFDRSxTQUNnQixNQUNBLFFBQ2hCO0FBQ0EsVUFBTSxPQUFPO0FBSEc7QUFDQTtBQUdoQixTQUFLLE9BQU87QUFBQSxFQUNkO0FBQ0Y7QUFtQk8sSUFBTSxlQUFOLGNBQTJCLE1BQU07QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU90QyxZQUNFLFNBQ2dCLE9BQ2hCO0FBQ0EsVUFBTSxPQUFPO0FBRkc7QUFHaEIsU0FBSyxPQUFPO0FBQUEsRUFDZDtBQUNGOzs7QUN4Q0EsSUFBTSxxQkFBcUI7QUFHM0IsSUFBTSxpQkFBaUI7QUFHdkIsSUFBTSxzQkFBc0I7QUF3QnJCLElBQU0sY0FBTixNQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWXZCLFlB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QVMsT0FBTztBQUNkLFVBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3JFLElBQUFBLFFBQU8sTUFBTSwyQ0FBMkMsRUFBRSxPQUFPLFFBQVEsQ0FBQztBQUMxRSxXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUk7QUFDRixVQUFNLHlCQUF5QixZQUFZLFFBQVEsTUFBTSxZQUFZLE1BQU0sVUFBVSxNQUFNLHFCQUFxQjtBQUNoSCxJQUFBQSxRQUFPLEtBQUssOEJBQThCO0FBQUEsTUFDeEMsV0FBVyxNQUFNO0FBQUEsTUFDakIsU0FBUyxNQUFNO0FBQUEsTUFDZixRQUFRLFlBQVk7QUFBQSxJQUN0QixDQUFDO0FBQUEsRUFDSCxTQUFTLE9BQU87QUFDZCxJQUFBQSxRQUFPLEtBQUssK0JBQStCO0FBQUEsTUFDekMsV0FBVyxNQUFNO0FBQUEsTUFDakIsU0FBUyxNQUFNO0FBQUEsTUFDZixPQUFPLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFBQSxJQUM5RCxDQUFDO0FBQUEsRUFDSDtBQUVBLFNBQU87QUFDVCxDQUFDOzs7QVU3RUQsUUFBUSxxQkFBSTsiLAogICJuYW1lcyI6IFsicmVhZEZpbGUiLCAibG9nZ2VyIiwgInJlYWRGaWxlIiwgImxvZ2dlciJdCn0K
