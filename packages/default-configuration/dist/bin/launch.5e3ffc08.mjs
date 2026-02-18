import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

// src/actions/hook-wrapper.ts
import { resolve as __resolve } from "node:path";

// src/actions/launch.ts
import { execFile as execFile2, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as fs2 from "node:fs/promises";
import * as path2 from "node:path";
import { promisify as promisify2 } from "node:util";

// ../claude-code-sessions/src/index.ts
import { existsSync, mkdirSync as mkdirSync2, readFileSync as readFileSync2, watch, writeFileSync as writeFileSync2 } from "node:fs";
import { homedir } from "node:os";
import { dirname as dirname2, join } from "node:path";

// ../claude-code-sessions/src/internal.ts
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// ../claude-code-sessions/src/process-tree.ts
import { execSync } from "node:child_process";
import { basename } from "node:path";

// ../claude-code-sessions/src/index.ts
function getCardsDir() {
  return join(homedir(), ".cards");
}
var MAX_ENTRY_AGE_MS = 24 * 60 * 60 * 1e3;
function getCardRepoPidsRegistryPath() {
  return join(getCardsDir(), "card-repo-commits", "pids.json");
}
function readRegistryEntry(registryPath, pid) {
  try {
    const content = readFileSync2(registryPath, "utf-8");
    const registry = JSON.parse(content);
    return registry.sessions[String(pid)] ?? null;
  } catch {
    return null;
  }
}
async function waitForPidEntry(pid, timeout, extract) {
  const registryPath = getCardRepoPidsRegistryPath();
  const immediate = readRegistryEntry(registryPath, pid);
  if (immediate) return extract(immediate);
  if (timeout === void 0 || timeout <= 0) return null;
  const dir = dirname2(registryPath);
  mkdirSync2(dir, { recursive: true });
  if (!existsSync(registryPath)) {
    writeFileSync2(registryPath, JSON.stringify({ sessions: {} }, null, 2), { mode: 384 });
  }
  return new Promise((resolve2) => {
    let resolved = false;
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        watcher.close();
        clearTimeout(timer);
      }
    };
    const watcher = watch(registryPath, () => {
      const entry = readRegistryEntry(registryPath, pid);
      if (entry) {
        cleanup();
        resolve2(extract(entry));
      }
    });
    const timer = setTimeout(() => {
      cleanup();
      resolve2(null);
    }, timeout);
    watcher.on("error", () => {
      cleanup();
      resolve2(null);
    });
  });
}
async function getTranscriptPathForPid(pid, timeout) {
  return waitForPidEntry(pid, timeout, (e) => e.transcriptPath);
}

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
    return this.request(() => this.getHttpClient().get(url));
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
   * The `filename` is URI-encoded automatically. For completed streams the
   * returned `lines` array is the full content; for active streams it is a
   * snapshot that may grow while the caller processes it.
   *
   * @param cardId - Identifier of the card that owns the requested stream.
   * @param filename - Stream filename (e.g., `"session.log"`).
   * @returns Metadata and content lines.
   * @throws ApiError on 404 (unknown card or stream) or other server errors.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getStream(cardId, filename) {
    const url = this.buildUrl(`/cards/${cardId}/streams/${encodeURIComponent(filename)}`);
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
import { readFileSync as readFileSync3 } from "node:fs";
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
   * `$VSCODE_NODE_PATH ./bin/...` so they work regardless of
   * whether `node` is on the system PATH.
   *
   * Available in all actions and type hooks.
   */
  VSCODE_NODE_PATH: "VSCODE_NODE_PATH",
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
  CARD_REPO_PATH: "CARD_REPO_PATH"
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
function readSwitchToInteractiveData() {
  const dataPath = getSwitchToInteractiveDataPath();
  if (dataPath === void 0) {
    return void 0;
  }
  const content = readFileSync3(dataPath, "utf-8");
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
    cardRepoPath: getCardRepoPath()
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
import { closeSync as closeSync2, existsSync as existsSync2, mkdirSync as mkdirSync3, openSync as openSync2, writeSync } from "node:fs";
import { dirname as dirname3 } from "node:path";
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
        closeSync2(this.logFileFd);
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
        closeSync2(this.logFileFd);
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
      const dir = dirname3(this.logFilePath);
      if (!existsSync2(dir)) {
        mkdirSync3(dir, { recursive: true });
      }
      this.logFileFd = openSync2(this.logFilePath, "a");
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
    logger.setContext(command.factoryType, input);
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
  const fileResults = await Promise.all(ignored.files.map(createFileSymlink));
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

// src/actions/launch.ts
var execFileAsync2 = promisify2(execFile2);
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function buildPluginSettings(worktreePath) {
  return JSON.stringify({
    enabledPlugins: { "runtime@cards.management": true },
    extraKnownMarketplaces: {
      "cards.management": {
        source: { source: "directory", path: path2.join(worktreePath, "public") }
      }
    }
  });
}
function buildArgs(prompt, sessionId, resume, mode, cardRepoPath, worktreePath) {
  const args = [];
  if (resume) {
    args.push("--resume", sessionId);
  } else {
    args.push(prompt);
    args.push("--session-id", sessionId);
  }
  args.push("--settings", buildPluginSettings(worktreePath));
  args.push("--add-dir", cardRepoPath);
  if (mode === "background") {
    args.push("--print", "--output-format", "stream-json");
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
async function cleanupMergedBranches(input, client, baseBranch, logger2) {
  const { branches } = await client.getBranches(input.cardId, { workspacePath: input.workspacePath });
  for (const branch of branches) {
    if (!branch.exists) continue;
    try {
      await execFileAsync2("git", ["merge-base", "--is-ancestor", branch.name, baseBranch], {
        cwd: input.workspacePath
      });
      if (branch.worktree) {
        try {
          await execFileAsync2("git", ["worktree", "remove", branch.worktree], {
            cwd: input.workspacePath
          });
        } catch (wtError) {
          logger2.warn("Failed to remove worktree", {
            branch: branch.name,
            error: errorMessage(wtError)
          });
        }
      }
      try {
        await execFileAsync2("git", ["branch", "-d", branch.name], {
          cwd: input.workspacePath
        });
      } catch (brError) {
        logger2.warn("Failed to delete branch", {
          branch: branch.name,
          error: errorMessage(brError)
        });
      }
      try {
        await client.removeBranch(input.cardId, branch.name);
      } catch (apiError) {
        logger2.warn("Failed to remove branch from API", {
          branch: branch.name,
          error: errorMessage(apiError)
        });
      }
      logger2.info("Cleaned up merged branch", { branch: branch.name });
    } catch {
      logger2.debug("Branch not merged, skipping cleanup", { branch: branch.name });
    }
  }
}
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
    const prompt = [
      "Create a team for this card and spawn the routing agent:",
      "",
      '<invoke name="TeamCreate">',
      `<parameter name="team_name">card-${input.cardId}</parameter>`,
      `<parameter name="description">${input.cardId}: Card processing</parameter>`,
      "</invoke>",
      "",
      '<invoke name="Task">',
      '<parameter name="description">card-router</parameter>',
      '<parameter name="subagent_type">card</parameter>',
      `<parameter name="team_name">card-${input.cardId}</parameter>`,
      '<parameter name="name">card-router</parameter>',
      '<parameter name="prompt">Review the card state and recommend the appropriate skill.</parameter>',
      "</invoke>",
      "",
      "Halt, then load the skill the `card-router` recommends. Follow the `<instructions>` contained in the skill."
    ].join("\n");
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
    const args = buildArgs(prompt, sessionId, resume, input.executionMode, input.cardRepoPath, cwd);
    const isInteractive = input.executionMode === "interactive";
    const child = spawn("claude", args, {
      cwd,
      stdio: isInteractive ? "inherit" : ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        CLAUDE_CODE_TASK_LIST_ID: `cards-extension-${input.cardId}`,
        CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
        BASE_BRANCH: baseBranch,
        PARENT_BRANCH: parentBranch
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
      const stream = client.openStream(input.cardId, "claude-code-session", `${sessionId}.jsonl`, {
        title: `Claude session for ${input.cardId}`,
        sessionId
      });
      child.stdout?.on("data", (chunk) => {
        for (const line of chunk.toString().split("\n")) {
          if (line.trim()) {
            stream.write(line);
          }
        }
      });
      child.stderr?.on("data", (chunk) => {
        const text = chunk.toString().trim();
        if (text) {
          context.logger.warn(text);
        }
      });
      const exitCode = await new Promise((resolve2) => {
        child.on("close", resolve2);
      });
      const result = await stream.close();
      context.logger.info("Launch action completed", { sessionId, exitCode, ...result });
    } else {
      const transcriptPathPromise = getTranscriptPathForPid(child.pid, 3e4);
      const exitCode = await new Promise((resolve2) => {
        child.on("close", resolve2);
      });
      const transcriptPath = await transcriptPathPromise;
      if (!transcriptPath) {
        throw new Error(`Failed to resolve transcript path for PID ${child.pid}`);
      }
      const transcript = await fs2.readFile(transcriptPath, "utf-8");
      const stream = client.openStream(input.cardId, "claude-code-session", `${sessionId}.jsonl`, {
        title: `Claude session for ${input.cardId}`,
        sessionId
      });
      for (const line of transcript.split("\n")) {
        if (line.trim()) {
          stream.write(line);
        }
      }
      const result = await stream.close();
      context.logger.info("Launch action completed", { sessionId, exitCode, ...result });
    }
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
var __DEFAULT_LOG_DEST = ".cards/logs/hooks.log";
var __cardRepo = process.env["CARD_REPO_PATH"];
if (__cardRepo && !process.env["CARDS_HOOKS_LOG_FILE"]) {
  process.env["CARDS_HOOKS_LOG_FILE"] = __resolve(__cardRepo, __DEFAULT_LOG_DEST);
}
executeCommand(launch_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2FjdGlvbnMvaG9vay13cmFwcGVyLnRzIiwgIi4uLy4uL3NyYy9hY3Rpb25zL2xhdW5jaC50cyIsICIuLi8uLi8uLi9jbGF1ZGUtY29kZS1zZXNzaW9ucy9zcmMvaW5kZXgudHMiLCAiLi4vLi4vLi4vY2xhdWRlLWNvZGUtc2Vzc2lvbnMvc3JjL2ludGVybmFsLnRzIiwgIi4uLy4uLy4uL2NsYXVkZS1jb2RlLXNlc3Npb25zL3NyYy9wcm9jZXNzLXRyZWUudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jbGllbnQvdHlwZXMvZXJyb3JzLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY2xpZW50L2NhcmRzQ2xpZW50LnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2ZhY3Rvcmllcy9hY3Rpb24udHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvZW52LnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2V4aXQtY29kZXMudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvbG9nZ2VyLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL3NvY2tldC1jbGllbnQudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvcnVudGltZS50cyIsICIuLi8uLi9zcmMvbGliL2NyZWF0ZS13b3JrdHJlZS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiXG5pbXBvcnQgeyByZXNvbHZlIGFzIF9fcmVzb2x2ZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5jb25zdCBfX0RFRkFVTFRfTE9HX0RFU1QgPSBcIi5jYXJkcy9sb2dzL2hvb2tzLmxvZ1wiO1xuY29uc3QgX19jYXJkUmVwbyA9IHByb2Nlc3MuZW52WydDQVJEX1JFUE9fUEFUSCddO1xuaWYgKF9fY2FyZFJlcG8gJiYgIXByb2Nlc3MuZW52WydDQVJEU19IT09LU19MT0dfRklMRSddKSB7XG4gIHByb2Nlc3MuZW52WydDQVJEU19IT09LU19MT0dfRklMRSddID0gX19yZXNvbHZlKF9fY2FyZFJlcG8sIF9fREVGQVVMVF9MT0dfREVTVCk7XG59XG5cbmltcG9ydCBoYW5kbGVyIGZyb20gJy4vbGF1bmNoLnRzJztcbmltcG9ydCB7IGV4ZWN1dGVDb21tYW5kIH0gZnJvbSAnLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvcnVudGltZS50cyc7XG5cbmV4ZWN1dGVDb21tYW5kKGhhbmRsZXIpO1xuIiwgIi8qKlxuICogTGF1bmNoIGFjdGlvbiBmb3IgQ2xhdWRlIENvZGUgd29ya2Zsb3dzLlxuICpcbiAqIFNwYXducyB0aGUgYGNsYXVkZWAgQ0xJIGZvciB0aGUgY3VycmVudCBjYXJkLiBJbiBpbnRlcmFjdGl2ZSBtb2RlLCB0aGVcbiAqIHByb2Nlc3MgaW5oZXJpdHMgc3RkaW8gc28gdGhlIHVzZXIgZ2V0cyBkaXJlY3QgdGVybWluYWwgY29udHJvbC4gSW5cbiAqIGJhY2tncm91bmQgbW9kZSwgQ2xhdWRlIHJ1bnMgd2l0aCBgLS1wcmludCAtLW91dHB1dC1mb3JtYXQgc3RyZWFtLWpzb25gXG4gKiBhbmQgZWFjaCBzdGRvdXQgbGluZSBpcyBzdHJlYW1lZCB0byB0aGUgc2VydmVyJ3MgYGNsYXVkZS1jb2RlLXNlc3Npb25gXG4gKiBzdHJlYW0gZW5kcG9pbnQgdmlhIHtAbGluayBDYXJkc0NsaWVudC5vcGVuU3RyZWFtfS5cbiAqXG4gKiBUaGUgYWN0aW9uIGF3YWl0cyBwcm9jZXNzIGV4aXQgYmVmb3JlIHJlc29sdmluZywgc28gdGhlIHRlcm1pbmFsIGNsb3Nlc1xuICogb25seSBhZnRlciBDbGF1ZGUgZmluaXNoZXMgYW5kIGNsZWFudXAgaXMgY29tcGxldGUuXG4gKlxuICogQHN1bW1hcnkgTGF1bmNoIGFjdGlvbiBmb3IgQ2xhdWRlIENvZGUgd29ya2Zsb3dzXG4gKiBAbW9kdWxlXG4gKiBAc2VlIHtAbGluayBkZWZpbmVBY3Rpb259IGZvciBmYWN0b3J5IGJlaGF2aW9yIGFuZCBtZXRhZGF0YSBhdHRhY2htZW50XG4gKi9cblxuaW1wb3J0IHsgdHlwZSBDaGlsZFByb2Nlc3MsIGV4ZWNGaWxlLCBzcGF3biB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyByYW5kb21VVUlEIH0gZnJvbSAnbm9kZTpjcnlwdG8nO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcy9wcm9taXNlcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBwcm9taXNpZnkgfSBmcm9tICdub2RlOnV0aWwnO1xuaW1wb3J0IHsgZ2V0VHJhbnNjcmlwdFBhdGhGb3JQaWQgfSBmcm9tICdAY2FyZHMvY2xhdWRlLWNvZGUtc2Vzc2lvbnMnO1xuaW1wb3J0IHsgQ2FyZHNDbGllbnQgfSBmcm9tICdAY2FyZHMvc2RrL2NsaWVudCc7XG5pbXBvcnQgeyB0eXBlIEFjdGlvbkNvbnRleHQsIHR5cGUgQWN0aW9uSW5wdXQsIGRlZmluZUFjdGlvbiB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IGNoZWNrV29ya3RyZWVFeGlzdHMsIGNyZWF0ZVdvcmt0cmVlLCBmaW5kR2l0Um9vdHMgfSBmcm9tICcuLi9saWIvY3JlYXRlLXdvcmt0cmVlLmpzJztcblxuY29uc3QgZXhlY0ZpbGVBc3luYyA9IHByb21pc2lmeShleGVjRmlsZSk7XG5cbi8qKlxuICogRXh0cmFjdHMgYSBodW1hbi1yZWFkYWJsZSBtZXNzYWdlIGZyb20gYW4gdW5rbm93biBjYXRjaCB2YWx1ZS5cbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBjYXVnaHQgdmFsdWUgdG8gZXh0cmFjdCBhIG1lc3NhZ2UgZnJvbS5cbiAqIEByZXR1cm5zIFRoZSBlcnJvciBtZXNzYWdlIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gZXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgdGhlIGAtLXNldHRpbmdzYCBKU09OIHRoYXQgZW5hYmxlcyB0aGUgYHJ1bnRpbWVgIHBsdWdpbiBhbmQgcmVnaXN0ZXJzXG4gKiB0aGUgYGNhcmRzLm1hbmFnZW1lbnRgIG1hcmtldHBsYWNlIHNvdXJjZSBzbyB0aGUgc3Bhd25lZCBgY2xhdWRlYCBwcm9jZXNzXG4gKiBjYW4gcmVzb2x2ZSB0aGUgcGx1Z2luIGluZGVwZW5kZW50bHkgb2YgdGhlIHBhcmVudCBzZXNzaW9uJ3Mgc2V0dGluZ3MuXG4gKlxuICogVGhlIG1hcmtldHBsYWNlIGBkaXJlY3RvcnlgIHNvdXJjZSBwYXRoIG11c3QgYmUgYWJzb2x1dGUgYmVjYXVzZSBpbmxpbmUgSlNPTlxuICogcGFzc2VkIHZpYSBgLS1zZXR0aW5nc2AgaGFzIG5vIGZpbGUtc3lzdGVtIGFuY2hvciBmb3IgcmVsYXRpdmUtcGF0aCByZXNvbHV0aW9uXG4gKiAoc2FtZSBjbGFzcyBvZiBidWcgYXMgQ2FyZCAjMTEyNzgpLlxuICpcbiAqIEBwYXJhbSB3b3JrdHJlZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSB3b3JrdHJlZSB3aGVyZSBgY2xhdWRlYCBydW5zLlxuICogQHJldHVybnMgU2VyaWFsaXNlZCBzZXR0aW5ncyBKU09OIHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gYnVpbGRQbHVnaW5TZXR0aW5ncyh3b3JrdHJlZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgZW5hYmxlZFBsdWdpbnM6IHsgJ3J1bnRpbWVAY2FyZHMubWFuYWdlbWVudCc6IHRydWUgfSxcbiAgICBleHRyYUtub3duTWFya2V0cGxhY2VzOiB7XG4gICAgICAnY2FyZHMubWFuYWdlbWVudCc6IHtcbiAgICAgICAgc291cmNlOiB7IHNvdXJjZTogJ2RpcmVjdG9yeScsIHBhdGg6IHBhdGguam9pbih3b3JrdHJlZVBhdGgsICdwdWJsaWMnKSB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gYnVpbGRBcmdzKFxuICBwcm9tcHQ6IHN0cmluZyxcbiAgc2Vzc2lvbklkOiBzdHJpbmcsXG4gIHJlc3VtZTogYm9vbGVhbixcbiAgbW9kZTogQWN0aW9uSW5wdXRbJ2V4ZWN1dGlvbk1vZGUnXSxcbiAgY2FyZFJlcG9QYXRoOiBzdHJpbmcsXG4gIHdvcmt0cmVlUGF0aDogc3RyaW5nXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGFyZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKHJlc3VtZSkge1xuICAgIGFyZ3MucHVzaCgnLS1yZXN1bWUnLCBzZXNzaW9uSWQpO1xuICB9IGVsc2Uge1xuICAgIGFyZ3MucHVzaChwcm9tcHQpO1xuICAgIGFyZ3MucHVzaCgnLS1zZXNzaW9uLWlkJywgc2Vzc2lvbklkKTtcbiAgfVxuICBhcmdzLnB1c2goJy0tc2V0dGluZ3MnLCBidWlsZFBsdWdpblNldHRpbmdzKHdvcmt0cmVlUGF0aCkpO1xuICBhcmdzLnB1c2goJy0tYWRkLWRpcicsIGNhcmRSZXBvUGF0aCk7XG4gIGlmIChtb2RlID09PSAnYmFja2dyb3VuZCcpIHtcbiAgICBhcmdzLnB1c2goJy0tcHJpbnQnLCAnLS1vdXRwdXQtZm9ybWF0JywgJ3N0cmVhbS1qc29uJyk7XG4gIH1cblxuICByZXR1cm4gYXJncztcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgY3VycmVudCBicmFuY2ggbmFtZSBpbiB0aGUgZ2l2ZW4gd29ya3NwYWNlLlxuICpcbiAqIEBwYXJhbSB3b3Jrc3BhY2VQYXRoIC0gRGlyZWN0b3J5IHdoZXJlIGBnaXQgcmV2LXBhcnNlYCBydW5zLlxuICogQHJldHVybnMgVGhlIGFiYnJldmlhdGVkIGJyYW5jaCBuYW1lIGF0IEhFQUQuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlc29sdmVCYXNlQnJhbmNoKHdvcmtzcGFjZVBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICctLWFiYnJldi1yZWYnLCAnSEVBRCddLCB7XG4gICAgY3dkOiB3b3Jrc3BhY2VQYXRoXG4gIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHdvcmt0cmVlIHBhdGggZXhpc3RzIG9uIGRpc2suXG4gKlxuICogQHBhcmFtIHdvcmt0cmVlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGVzdC5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiB0aGUgcGF0aCBpcyBhY2Nlc3NpYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiB3b3JrdHJlZUV4aXN0c09uRGlzayh3b3JrdHJlZVBhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGF3YWl0IGZzLmFjY2Vzcyh3b3JrdHJlZVBhdGgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBGaW5kcyBvciBjcmVhdGVzIGEgd29ya3RyZWUgZm9yIHRoZSBjYXJkLlxuICpcbiAqIFRyaWVzIHRvIHJldXNlIGFuIGV4aXN0aW5nIGJyYW5jaCB3aG9zZSB3b3JrdHJlZSBpcyBzdGlsbCBvbiBkaXNrLiBXaGVuIG5vXG4gKiB2YWxpZCBicmFuY2ggZXhpc3RzLCBjcmVhdGVzIGEgbmV3IG9uZSBhbmQgcmVnaXN0ZXJzIGl0IHdpdGggdGhlIEFQSS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgY29udGFpbmluZyBjYXJkSWQgYW5kIHdvcmtzcGFjZSBwYXRocy5cbiAqIEBwYXJhbSBjbGllbnQgLSBDYXJkcyBBUEkgY2xpZW50IGZvciBicmFuY2ggQ1JVRC5cbiAqIEBwYXJhbSBiYXNlQnJhbmNoIC0gQ3VycmVudCBicmFuY2ggaW4gdGhlIHdvcmtzcGFjZSAodXNlZCBhcyBwYXJlbnQpLlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKiBAcmV0dXJucyBXb3JrdHJlZSBwYXRoLCBicmFuY2ggbmFtZSwgYW5kIHBhcmVudCBicmFuY2ggbmFtZS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZU9yQ3JlYXRlV29ya3RyZWUoXG4gIGlucHV0OiBBY3Rpb25JbnB1dCxcbiAgY2xpZW50OiBDYXJkc0NsaWVudCxcbiAgYmFzZUJyYW5jaDogc3RyaW5nLFxuICBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddXG4pOiBQcm9taXNlPHsgd29ya3RyZWVQYXRoOiBzdHJpbmc7IGJyYW5jaE5hbWU6IHN0cmluZzsgcGFyZW50QnJhbmNoOiBzdHJpbmcgfT4ge1xuICBjb25zdCB7IGJyYW5jaGVzIH0gPSBhd2FpdCBjbGllbnQuZ2V0QnJhbmNoZXMoaW5wdXQuY2FyZElkLCB7IHdvcmtzcGFjZVBhdGg6IGlucHV0LndvcmtzcGFjZVBhdGggfSk7XG5cbiAgLy8gVHJ5IHRvIHJldXNlIGFuIGV4aXN0aW5nIGJyYW5jaCB3aXRoIGEgdmFsaWQgd29ya3RyZWUgb24gZGlza1xuICBmb3IgKGNvbnN0IGJyYW5jaCBvZiBicmFuY2hlcykge1xuICAgIGlmICghYnJhbmNoLmV4aXN0cyB8fCAhYnJhbmNoLndvcmt0cmVlKSBjb250aW51ZTtcbiAgICBpZiAoIShhd2FpdCB3b3JrdHJlZUV4aXN0c09uRGlzayhicmFuY2gud29ya3RyZWUpKSkgY29udGludWU7XG5cbiAgICBjb25zdCBwYXJlbnRCcmFuY2ggPSBicmFuY2gucGFyZW50QnJhbmNoID8/IGJhc2VCcmFuY2g7XG5cbiAgICBsb2dnZXIuaW5mbygnUmV1c2luZyBleGlzdGluZyB3b3JrdHJlZScsIHsgYnJhbmNoOiBicmFuY2gubmFtZSwgd29ya3RyZWU6IGJyYW5jaC53b3JrdHJlZSB9KTtcbiAgICByZXR1cm4geyB3b3JrdHJlZVBhdGg6IGJyYW5jaC53b3JrdHJlZSwgYnJhbmNoTmFtZTogYnJhbmNoLm5hbWUsIHBhcmVudEJyYW5jaCB9O1xuICB9XG5cbiAgLy8gTm8gdmFsaWQgZXhpc3RpbmcgYnJhbmNoIFx1MjAxNCBjcmVhdGUgbmV3IG9uZS5cbiAgLy8gVGhlIEFQSSBtYXkgYmUgb3V0IG9mIHN5bmMgd2l0aCBnaXQgKGUuZy4gYSBwcmV2aW91cyB3b3JrdHJlZSB3YXMgY3JlYXRlZFxuICAvLyBidXQgbmV2ZXIgcmVnaXN0ZXJlZCwgb3IgaXRzIEFQSSByZWNvcmQgd2FzIGRlbGV0ZWQpLiBUbyBhdm9pZCBjb2xsaWRpbmdcbiAgLy8gd2l0aCB3b3JrdHJlZXMgZ2l0IGFscmVhZHkga25vd3MgYWJvdXQsIHByb2JlIGdpdCdzIGFjdHVhbCBzdGF0ZSBhbmRcbiAgLy8gaW5jcmVtZW50IHBhc3QgYW55IG9jY3VwaWVkIHNsb3RzLlxuICBjb25zdCBwcmVmaXggPSBgY2FyZHMvJHtpbnB1dC5jYXJkSWR9L2A7XG4gIGNvbnN0IGV4aXN0aW5nTnVtYmVycyA9IGJyYW5jaGVzXG4gICAgLmZpbHRlcigoYikgPT4gYi5uYW1lLnN0YXJ0c1dpdGgocHJlZml4KSlcbiAgICAubWFwKChiKSA9PiBwYXJzZUludChiLm5hbWUuc2xpY2UocHJlZml4Lmxlbmd0aCksIDEwKSlcbiAgICAuZmlsdGVyKChuKSA9PiAhTnVtYmVyLmlzTmFOKG4pKTtcbiAgbGV0IG5leHROdW1iZXIgPSBleGlzdGluZ051bWJlcnMubGVuZ3RoID4gMCA/IE1hdGgubWF4KC4uLmV4aXN0aW5nTnVtYmVycykgKyAxIDogMTtcblxuICBjb25zdCB7IHJlcG9Sb290IH0gPSBhd2FpdCBmaW5kR2l0Um9vdHMoaW5wdXQud29ya3NwYWNlUGF0aCk7XG4gIHdoaWxlIChhd2FpdCBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290LCBwYXRoLmpvaW4ocmVwb1Jvb3QsICcud29ya3RyZWVzJywgYCR7cHJlZml4fSR7bmV4dE51bWJlcn1gKSkpIHtcbiAgICBsb2dnZXIud2FybignV29ya3RyZWUgYWxyZWFkeSBleGlzdHMgaW4gZ2l0IGJ1dCBub3QgaW4gQVBJLCBza2lwcGluZycsIHtcbiAgICAgIGJyYW5jaDogYCR7cHJlZml4fSR7bmV4dE51bWJlcn1gXG4gICAgfSk7XG4gICAgbmV4dE51bWJlcisrO1xuICB9XG5cbiAgY29uc3QgYnJhbmNoTmFtZSA9IGAke3ByZWZpeH0ke25leHROdW1iZXJ9YDtcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlV29ya3RyZWUoYnJhbmNoTmFtZSwgeyBjd2Q6IGlucHV0LndvcmtzcGFjZVBhdGggfSk7XG4gIGF3YWl0IGNsaWVudC5hZGRCcmFuY2goaW5wdXQuY2FyZElkLCB7IG5hbWU6IGJyYW5jaE5hbWUsIHdvcmt0cmVlOiByZXN1bHQud29ya3RyZWUsIHBhcmVudEJyYW5jaDogYmFzZUJyYW5jaCB9KTtcblxuICBsb2dnZXIuaW5mbygnQ3JlYXRlZCBuZXcgd29ya3RyZWUnLCB7IGJyYW5jaDogYnJhbmNoTmFtZSwgd29ya3RyZWU6IHJlc3VsdC53b3JrdHJlZSB9KTtcbiAgcmV0dXJuIHsgd29ya3RyZWVQYXRoOiByZXN1bHQud29ya3RyZWUsIGJyYW5jaE5hbWUsIHBhcmVudEJyYW5jaDogYmFzZUJyYW5jaCB9O1xufVxuXG4vKipcbiAqIFJlbW92ZXMgYnJhbmNoZXMgdGhhdCBhcmUgZnVsbHkgbWVyZ2VkIGludG8gdGhlIGJhc2UgYnJhbmNoLlxuICpcbiAqIEZvciBlYWNoIG1lcmdlZCBicmFuY2ggdGhlIHdvcmt0cmVlIGRpcmVjdG9yeSBpcyByZW1vdmVkLCB0aGUgbG9jYWwgYnJhbmNoXG4gKiByZWYgaXMgZGVsZXRlZCwgYW5kIHRoZSBicmFuY2ggcmVjb3JkIGlzIHJlbW92ZWQgZnJvbSB0aGUgQVBJLiAgSW5kaXZpZHVhbFxuICogZmFpbHVyZXMgYXJlIGxvZ2dlZCBhbmQgZG8gbm90IGFib3J0IHRoZSBzd2VlcC5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgY29udGFpbmluZyBjYXJkSWQgYW5kIHdvcmtzcGFjZSBwYXRocy5cbiAqIEBwYXJhbSBjbGllbnQgLSBDYXJkcyBBUEkgY2xpZW50IGZvciBicmFuY2ggcmVtb3ZhbC5cbiAqIEBwYXJhbSBiYXNlQnJhbmNoIC0gQnJhbmNoIHRvIGNoZWNrIG1lcmdlIHN0YXR1cyBhZ2FpbnN0LlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNsZWFudXBNZXJnZWRCcmFuY2hlcyhcbiAgaW5wdXQ6IEFjdGlvbklucHV0LFxuICBjbGllbnQ6IENhcmRzQ2xpZW50LFxuICBiYXNlQnJhbmNoOiBzdHJpbmcsXG4gIGxvZ2dlcjogQWN0aW9uQ29udGV4dFsnbG9nZ2VyJ11cbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IGJyYW5jaGVzIH0gPSBhd2FpdCBjbGllbnQuZ2V0QnJhbmNoZXMoaW5wdXQuY2FyZElkLCB7IHdvcmtzcGFjZVBhdGg6IGlucHV0LndvcmtzcGFjZVBhdGggfSk7XG5cbiAgZm9yIChjb25zdCBicmFuY2ggb2YgYnJhbmNoZXMpIHtcbiAgICBpZiAoIWJyYW5jaC5leGlzdHMpIGNvbnRpbnVlO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIENoZWNrIGlmIGJyYW5jaCBpcyBtZXJnZWQgaW50byBiYXNlQnJhbmNoIChleGl0cyBub24temVybyB3aGVuIE5PVCBtZXJnZWQpXG4gICAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ21lcmdlLWJhc2UnLCAnLS1pcy1hbmNlc3RvcicsIGJyYW5jaC5uYW1lLCBiYXNlQnJhbmNoXSwge1xuICAgICAgICBjd2Q6IGlucHV0LndvcmtzcGFjZVBhdGhcbiAgICAgIH0pO1xuXG4gICAgICAvLyBCcmFuY2ggaXMgbWVyZ2VkIFx1MjAxNCBjbGVhbiB1cCB3b3JrdHJlZSwgYnJhbmNoIHJlZiwgYW5kIEFQSSByZWNvcmRcbiAgICAgIGlmIChicmFuY2gud29ya3RyZWUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ3JlbW92ZScsIGJyYW5jaC53b3JrdHJlZV0sIHtcbiAgICAgICAgICAgIGN3ZDogaW5wdXQud29ya3NwYWNlUGF0aFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoICh3dEVycm9yKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byByZW1vdmUgd29ya3RyZWUnLCB7XG4gICAgICAgICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgICAgICAgZXJyb3I6IGVycm9yTWVzc2FnZSh3dEVycm9yKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnYnJhbmNoJywgJy1kJywgYnJhbmNoLm5hbWVdLCB7XG4gICAgICAgICAgY3dkOiBpbnB1dC53b3Jrc3BhY2VQYXRoXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoYnJFcnJvcikge1xuICAgICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIGRlbGV0ZSBicmFuY2gnLCB7XG4gICAgICAgICAgYnJhbmNoOiBicmFuY2gubmFtZSxcbiAgICAgICAgICBlcnJvcjogZXJyb3JNZXNzYWdlKGJyRXJyb3IpXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBjbGllbnQucmVtb3ZlQnJhbmNoKGlucHV0LmNhcmRJZCwgYnJhbmNoLm5hbWUpO1xuICAgICAgfSBjYXRjaCAoYXBpRXJyb3IpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byByZW1vdmUgYnJhbmNoIGZyb20gQVBJJywge1xuICAgICAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUsXG4gICAgICAgICAgZXJyb3I6IGVycm9yTWVzc2FnZShhcGlFcnJvcilcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGxvZ2dlci5pbmZvKCdDbGVhbmVkIHVwIG1lcmdlZCBicmFuY2gnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUgfSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBtZXJnZS1iYXNlIC0taXMtYW5jZXN0b3IgZXhpdHMgbm9uLXplcm8gd2hlbiBOT1QgYW4gYW5jZXN0b3IgKG5vdCBtZXJnZWQpLlxuICAgICAgLy8gVGhpcyBpcyBleHBlY3RlZCBmb3IgdW5tZXJnZWQgYnJhbmNoZXMgXHUyMDE0IG5vIGFjdGlvbiBuZWVkZWQuXG4gICAgICBsb2dnZXIuZGVidWcoJ0JyYW5jaCBub3QgbWVyZ2VkLCBza2lwcGluZyBjbGVhbnVwJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lIH0pO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIExhdW5jaCBhY3Rpb24gaGFuZGxlci5cbiAqXG4gKiBTcGF3bnMgdGhlIGBjbGF1ZGVgIENMSSBhcyBhIGNoaWxkIHByb2Nlc3MsIHByb3ZpZGluZyB0aGUgY2FyZCBJRCBhbmRcbiAqIHJlcG9zaXRvcnkgcGF0aCBhcyBwcm9tcHQgY29udGV4dC4gVGhlIHByb2Nlc3MgbGlmZWN5Y2xlIGlzIHRpZWQgdG8gdGhlXG4gKiBhY3Rpb246IGNhbmNlbGxhdGlvbiBzZW5kcyBTSUdURVJNLCBhbmQgc3dpdGNoaW5nIHRvIGludGVyYWN0aXZlIG1vZGVcbiAqIHByZXNlcnZlcyB0aGUgc2Vzc2lvbiBJRCBmb3IgcmVzdW1wdGlvbi5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQWN0aW9uKFxuICB7XG4gICAgYWN0aW9uTmFtZTogJ0xhdW5jaCcsXG4gICAgZGVzY3JpcHRpb246ICdTdGFydCBhIENsYXVkZSBzZXNzaW9uIGZvciB0aGUgY2FyZCcsXG4gICAgc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZTogdHJ1ZSxcbiAgICB0aW1lb3V0OiAzNjAwMDAwXG4gIH0sXG4gIGFzeW5jIChpbnB1dDogQWN0aW9uSW5wdXQsIGNvbnRleHQ6IEFjdGlvbkNvbnRleHQpID0+IHtcbiAgICBjb25zdCBzd2l0Y2hEYXRhID0gaW5wdXQuc3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEgYXMgeyBzZXNzaW9uSWQ/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZDtcbiAgICBjb25zdCBbc2Vzc2lvbklkLCByZXN1bWVdID0gW3N3aXRjaERhdGE/LnNlc3Npb25JZCA/PyByYW5kb21VVUlEKCksICEhc3dpdGNoRGF0YT8uc2Vzc2lvbklkXTtcblxuICAgIGNvbnN0IHByb21wdCA9IFtcbiAgICAgICdDcmVhdGUgYSB0ZWFtIGZvciB0aGlzIGNhcmQgYW5kIHNwYXduIHRoZSByb3V0aW5nIGFnZW50OicsXG4gICAgICAnJyxcbiAgICAgICc8aW52b2tlIG5hbWU9XCJUZWFtQ3JlYXRlXCI+JyxcbiAgICAgIGA8cGFyYW1ldGVyIG5hbWU9XCJ0ZWFtX25hbWVcIj5jYXJkLSR7aW5wdXQuY2FyZElkfTwvcGFyYW1ldGVyPmAsXG4gICAgICBgPHBhcmFtZXRlciBuYW1lPVwiZGVzY3JpcHRpb25cIj4ke2lucHV0LmNhcmRJZH06IENhcmQgcHJvY2Vzc2luZzwvcGFyYW1ldGVyPmAsXG4gICAgICAnPC9pbnZva2U+JyxcbiAgICAgICcnLFxuICAgICAgJzxpbnZva2UgbmFtZT1cIlRhc2tcIj4nLFxuICAgICAgJzxwYXJhbWV0ZXIgbmFtZT1cImRlc2NyaXB0aW9uXCI+Y2FyZC1yb3V0ZXI8L3BhcmFtZXRlcj4nLFxuICAgICAgJzxwYXJhbWV0ZXIgbmFtZT1cInN1YmFnZW50X3R5cGVcIj5jYXJkPC9wYXJhbWV0ZXI+JyxcbiAgICAgIGA8cGFyYW1ldGVyIG5hbWU9XCJ0ZWFtX25hbWVcIj5jYXJkLSR7aW5wdXQuY2FyZElkfTwvcGFyYW1ldGVyPmAsXG4gICAgICAnPHBhcmFtZXRlciBuYW1lPVwibmFtZVwiPmNhcmQtcm91dGVyPC9wYXJhbWV0ZXI+JyxcbiAgICAgICc8cGFyYW1ldGVyIG5hbWU9XCJwcm9tcHRcIj5SZXZpZXcgdGhlIGNhcmQgc3RhdGUgYW5kIHJlY29tbWVuZCB0aGUgYXBwcm9wcmlhdGUgc2tpbGwuPC9wYXJhbWV0ZXI+JyxcbiAgICAgICc8L2ludm9rZT4nLFxuICAgICAgJycsXG4gICAgICAnSGFsdCwgdGhlbiBsb2FkIHRoZSBza2lsbCB0aGUgYGNhcmQtcm91dGVyYCByZWNvbW1lbmRzLiBGb2xsb3cgdGhlIGA8aW5zdHJ1Y3Rpb25zPmAgY29udGFpbmVkIGluIHRoZSBza2lsbC4nXG4gICAgXS5qb2luKCdcXG4nKTtcblxuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oJ0xhdW5jaCBhY3Rpb24gc3RhcnRlZCcsIHtcbiAgICAgIGNhcmRJZDogaW5wdXQuY2FyZElkLFxuICAgICAgZW52aXJvbm1lbnQ6IGlucHV0LmVudmlyb25tZW50LFxuICAgICAgZXhlY3V0aW9uTW9kZTogaW5wdXQuZXhlY3V0aW9uTW9kZSxcbiAgICAgIHNlc3Npb25JZFxuICAgIH0pO1xuXG4gICAgY29uc3QgY2xpZW50ID0gbmV3IENhcmRzQ2xpZW50KHtcbiAgICAgIGJhc2VVcmw6IGlucHV0LmFwaUJhc2VVcmwsXG4gICAgICBhY2Nlc3NUb2tlbjogaW5wdXQuYXBpQWNjZXNzVG9rZW5cbiAgICB9KTtcblxuICAgIGNvbnN0IGJhc2VCcmFuY2ggPSBhd2FpdCByZXNvbHZlQmFzZUJyYW5jaChpbnB1dC53b3Jrc3BhY2VQYXRoKTtcblxuICAgIGNvbnN0IHdvcmt0cmVlUmVzdWx0ID0gYXdhaXQgcmVzb2x2ZU9yQ3JlYXRlV29ya3RyZWUoaW5wdXQsIGNsaWVudCwgYmFzZUJyYW5jaCwgY29udGV4dC5sb2dnZXIpO1xuXG4gICAgY29uc3QgeyB3b3JrdHJlZVBhdGg6IGN3ZCwgYnJhbmNoTmFtZSwgcGFyZW50QnJhbmNoIH0gPSB3b3JrdHJlZVJlc3VsdDtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdVc2luZyB3b3JrdHJlZScsIHsgY3dkLCBicmFuY2g6IGJyYW5jaE5hbWUsIGJhc2VCcmFuY2gsIHBhcmVudEJyYW5jaCB9KTtcblxuICAgIGNvbnN0IGFyZ3MgPSBidWlsZEFyZ3MocHJvbXB0LCBzZXNzaW9uSWQsIHJlc3VtZSwgaW5wdXQuZXhlY3V0aW9uTW9kZSwgaW5wdXQuY2FyZFJlcG9QYXRoLCBjd2QpO1xuICAgIGNvbnN0IGlzSW50ZXJhY3RpdmUgPSBpbnB1dC5leGVjdXRpb25Nb2RlID09PSAnaW50ZXJhY3RpdmUnO1xuXG4gICAgY29uc3QgY2hpbGQ6IENoaWxkUHJvY2VzcyA9IHNwYXduKCdjbGF1ZGUnLCBhcmdzLCB7XG4gICAgICBjd2QsXG4gICAgICBzdGRpbzogaXNJbnRlcmFjdGl2ZSA/ICdpbmhlcml0JyA6IFsnaWdub3JlJywgJ3BpcGUnLCAncGlwZSddLFxuICAgICAgZW52OiB7XG4gICAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgICBDTEFVREVfQ09ERV9UQVNLX0xJU1RfSUQ6IGBjYXJkcy1leHRlbnNpb24tJHtpbnB1dC5jYXJkSWR9YCxcbiAgICAgICAgQ0xBVURFX0NPREVfRVhQRVJJTUVOVEFMX0FHRU5UX1RFQU1TOiAnMScsXG4gICAgICAgIEJBU0VfQlJBTkNIOiBiYXNlQnJhbmNoLFxuICAgICAgICBQQVJFTlRfQlJBTkNIOiBwYXJlbnRCcmFuY2hcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnRleHQub25DYW5jZWwoKCkgPT4ge1xuICAgICAgY29udGV4dC5sb2dnZXIuaW5mbygnTGF1bmNoIGFjdGlvbiBjYW5jZWxsZWQsIHRlcm1pbmF0aW5nIGNsYXVkZScsIHsgc2Vzc2lvbklkIH0pO1xuICAgICAgY2hpbGQua2lsbCgnU0lHVEVSTScpO1xuICAgIH0pO1xuXG4gICAgY29udGV4dC5vblN3aXRjaFRvSW50ZXJhY3RpdmUoKCkgPT4ge1xuICAgICAgY29udGV4dC5sb2dnZXIuaW5mbygnU3dpdGNoaW5nIHRvIGludGVyYWN0aXZlIG1vZGUnLCB7IHNlc3Npb25JZCB9KTtcbiAgICAgIGNoaWxkLmtpbGwoJ1NJR1RFUk0nKTtcbiAgICAgIHJldHVybiB7IHNlc3Npb25JZCB9O1xuICAgIH0pO1xuXG4gICAgaWYgKCFpc0ludGVyYWN0aXZlKSB7XG4gICAgICBjb25zdCBzdHJlYW0gPSBjbGllbnQub3BlblN0cmVhbShpbnB1dC5jYXJkSWQsICdjbGF1ZGUtY29kZS1zZXNzaW9uJywgYCR7c2Vzc2lvbklkfS5qc29ubGAsIHtcbiAgICAgICAgdGl0bGU6IGBDbGF1ZGUgc2Vzc2lvbiBmb3IgJHtpbnB1dC5jYXJkSWR9YCxcbiAgICAgICAgc2Vzc2lvbklkXG4gICAgICB9KTtcblxuICAgICAgY2hpbGQuc3Rkb3V0Py5vbignZGF0YScsIChjaHVuazogQnVmZmVyKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgbGluZSBvZiBjaHVuay50b1N0cmluZygpLnNwbGl0KCdcXG4nKSkge1xuICAgICAgICAgIGlmIChsaW5lLnRyaW0oKSkge1xuICAgICAgICAgICAgc3RyZWFtLndyaXRlKGxpbmUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGNoaWxkLnN0ZGVycj8ub24oJ2RhdGEnLCAoY2h1bms6IEJ1ZmZlcikgPT4ge1xuICAgICAgICBjb25zdCB0ZXh0ID0gY2h1bmsudG9TdHJpbmcoKS50cmltKCk7XG4gICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgY29udGV4dC5sb2dnZXIud2Fybih0ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGV4aXRDb2RlID0gYXdhaXQgbmV3IFByb21pc2U8bnVtYmVyIHwgbnVsbD4oKHJlc29sdmUpID0+IHtcbiAgICAgICAgY2hpbGQub24oJ2Nsb3NlJywgcmVzb2x2ZSk7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc3RyZWFtLmNsb3NlKCk7XG4gICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdMYXVuY2ggYWN0aW9uIGNvbXBsZXRlZCcsIHsgc2Vzc2lvbklkLCBleGl0Q29kZSwgLi4ucmVzdWx0IH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0cmFuc2NyaXB0UGF0aFByb21pc2UgPSBnZXRUcmFuc2NyaXB0UGF0aEZvclBpZChjaGlsZC5waWQhLCAzMF8wMDApO1xuXG4gICAgICBjb25zdCBleGl0Q29kZSA9IGF3YWl0IG5ldyBQcm9taXNlPG51bWJlciB8IG51bGw+KChyZXNvbHZlKSA9PiB7XG4gICAgICAgIGNoaWxkLm9uKCdjbG9zZScsIHJlc29sdmUpO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHRyYW5zY3JpcHRQYXRoID0gYXdhaXQgdHJhbnNjcmlwdFBhdGhQcm9taXNlO1xuICAgICAgaWYgKCF0cmFuc2NyaXB0UGF0aCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byByZXNvbHZlIHRyYW5zY3JpcHQgcGF0aCBmb3IgUElEICR7Y2hpbGQucGlkfWApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0cmFuc2NyaXB0ID0gYXdhaXQgZnMucmVhZEZpbGUodHJhbnNjcmlwdFBhdGgsICd1dGYtOCcpO1xuICAgICAgY29uc3Qgc3RyZWFtID0gY2xpZW50Lm9wZW5TdHJlYW0oaW5wdXQuY2FyZElkLCAnY2xhdWRlLWNvZGUtc2Vzc2lvbicsIGAke3Nlc3Npb25JZH0uanNvbmxgLCB7XG4gICAgICAgIHRpdGxlOiBgQ2xhdWRlIHNlc3Npb24gZm9yICR7aW5wdXQuY2FyZElkfWAsXG4gICAgICAgIHNlc3Npb25JZFxuICAgICAgfSk7XG5cbiAgICAgIGZvciAoY29uc3QgbGluZSBvZiB0cmFuc2NyaXB0LnNwbGl0KCdcXG4nKSkge1xuICAgICAgICBpZiAobGluZS50cmltKCkpIHtcbiAgICAgICAgICBzdHJlYW0ud3JpdGUobGluZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc3RyZWFtLmNsb3NlKCk7XG4gICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdMYXVuY2ggYWN0aW9uIGNvbXBsZXRlZCcsIHsgc2Vzc2lvbklkLCBleGl0Q29kZSwgLi4ucmVzdWx0IH0pO1xuICAgIH1cblxuICAgIC8vIFBvc3QtZXhpdCBjbGVhbnVwOiByZW1vdmUgZnVsbHktbWVyZ2VkIGJyYW5jaGVzXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGNsZWFudXBNZXJnZWRCcmFuY2hlcyhpbnB1dCwgY2xpZW50LCBiYXNlQnJhbmNoLCBjb250ZXh0LmxvZ2dlcik7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4oJ0JyYW5jaCBjbGVhbnVwIGZhaWxlZCcsIHtcbiAgICAgICAgZXJyb3I6IGVycm9yTWVzc2FnZShlcnJvcilcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuKTtcbiIsICIvKipcbiAqIFRyYWNrcyBhc3NvY2lhdGlvbnMgYmV0d2VlbiBDbGF1ZGUgcHJvY2VzcyBJRHMgYW5kIGNhcmRzIG9uIGRpc2ssIGJ1ZmZlcmluZ1xuICogcGVuZGluZyBjb21taXQgU0hBcyB1bnRpbCBhbiBhc3NvY2lhdGlvbiBpcyBlc3RhYmxpc2hlZC4gVGhlIHJlZ2lzdHJ5IHVzZXNcbiAqIGF0b21pYyBmaWxlIHdyaXRlcywgYWR2aXNvcnkgZmlsZSBsb2NraW5nLCBhbmQgYXV0b21hdGljIHN0YWxlLWVudHJ5IHBydW5pbmdcbiAqIHRvIHJlbWFpbiBjb3JyZWN0IHVuZGVyIGNvbmN1cnJlbnQgYWNjZXNzLlxuICpcbiAqIEBzdW1tYXJ5IFBJRC10by1jYXJkIHNlc3Npb24gcmVnaXN0cnkgd2l0aCBjb21taXQgYnVmZmVyaW5nXG4gKiBAbW9kdWxlIGNsYXVkZS1jb2RlLXNlc3Npb25zXG4gKi9cblxuaW1wb3J0IHsgZXhpc3RzU3luYywgbWtkaXJTeW5jLCByZWFkRmlsZVN5bmMsIHdhdGNoLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBob21lZGlyIH0gZnJvbSAnbm9kZTpvcyc7XG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IGV4ZWN1dGVUcmFuc2FjdGlvbiwgaXNQcm9jZXNzQWxpdmUsIHBydW5lU3RhbGVFbnRyaWVzIH0gZnJvbSAnLi9pbnRlcm5hbC5qcyc7XG5cbmV4cG9ydCB7IGZpbmRBbGxDbGF1ZGVQaWRzLCBmaW5kQ2xhdWRlUGlkLCBQUk9DRVNTX1RSRUVfTUFYX0RFUFRIIH0gZnJvbSAnLi9wcm9jZXNzLXRyZWUuanMnO1xuXG5mdW5jdGlvbiBnZXRDYXJkc0RpcigpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihob21lZGlyKCksICcuY2FyZHMnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjYW5vbmljYWwgb24tZGlzayBsb2NhdGlvbiBmb3IgdGhlIHNlc3Npb24gcmVnaXN0cnkgSlNPTiBmaWxlLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gYH4vLmNhcmRzL2NsYXVkZS1zZXNzaW9ucy5qc29uYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFJlZ2lzdHJ5UGF0aCgpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihnZXRDYXJkc0RpcigpLCAnY2xhdWRlLXNlc3Npb25zLmpzb24nKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjYW5vbmljYWwgb24tZGlzayBsb2NhdGlvbiBmb3IgdGhlIHNlc3Npb24gbG9jayBmaWxlLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gYH4vLmNhcmRzL2NsYXVkZS1zZXNzaW9ucy5sb2NrYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldExvY2tQYXRoKCk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGdldENhcmRzRGlyKCksICdjbGF1ZGUtc2Vzc2lvbnMubG9jaycpO1xufVxuXG5leHBvcnQgY29uc3QgTE9DS19USU1FT1VUX01TID0gMjAwMDtcbmV4cG9ydCBjb25zdCBNQVhfRU5UUllfQUdFX01TID0gMjQgKiA2MCAqIDYwICogMTAwMDsgLy8gMjQgaG91cnNcblxuLyoqIFNlc3Npb24gZGF0YSBzdG9yZWQgcGVyIFBJRCBpbiB0aGUgcmVnaXN0cnkgZmlsZS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2xhdWRlU2Vzc2lvbkVudHJ5IHtcbiAgY2FyZElkPzogc3RyaW5nO1xuICBwZW5kaW5nQ29tbWl0czogc3RyaW5nW107XG4gIHVwZGF0ZWRBdDogc3RyaW5nO1xufVxuXG4vKiogSlNPTiBwYXlsb2FkIHN0b3JlZCBhdCBgfi8uY2FyZHMvY2xhdWRlLXNlc3Npb25zLmpzb25gLiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGF1ZGVTZXNzaW9uUmVnaXN0cnkge1xuICBzZXNzaW9uczogUmVjb3JkPHN0cmluZywgQ2xhdWRlU2Vzc2lvbkVudHJ5Pjtcbn1cblxuLyoqIEV4dGVuZGVkIHNlc3Npb24gZW50cnkgdGhhdCBpbmNsdWRlcyBzZXNzaW9uIElEIGFuZCB0cmFuc2NyaXB0IHBhdGguICovXG5leHBvcnQgaW50ZXJmYWNlIFBpZFNlc3Npb25FbnRyeSB7XG4gIHNlc3Npb25JZDogc3RyaW5nO1xuICB0cmFuc2NyaXB0UGF0aDogc3RyaW5nO1xuICB1cGRhdGVkQXQ6IHN0cmluZztcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQdWJsaWMgQVBJXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiBBc3NvY2lhdGVzIFBJRCB3aXRoIGNhcmQuIElmIHRoZSBlbnRyeSBhbHJlYWR5IGhhcyBhIGBjYXJkSWRgLCByZXR1cm5zIGBbXWBcbiAqIChmaXJzdC13cml0ZS13aW5zKS4gT3RoZXJ3aXNlIHNldHMgYGNhcmRJZGAsIGV4dHJhY3RzIGFuZCBjbGVhcnNcbiAqIGBwZW5kaW5nQ29tbWl0c2AsIGFuZCByZXR1cm5zIHRoZSBleHRyYWN0ZWQgY29tbWl0cy5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gYXNzb2NpYXRlLlxuICogQHBhcmFtIGNhcmRJZCAtIENhcmQgaWRlbnRpZmllciB0byBiaW5kIHRvIHRoZSBQSUQuXG4gKiBAcmV0dXJucyBQZW5kaW5nIFNIQXMgY2FwdHVyZWQgYmVmb3JlIGFzc29jaWF0aW9uLCBvciBgW11gIG9uIGZpcnN0LXdyaXRlIGNvbmZsaWN0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXNzb2NpYXRlUGlkV2l0aENhcmQocGlkOiBudW1iZXIsIGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICByZXR1cm4gZXhlY3V0ZVRyYW5zYWN0aW9uPENsYXVkZVNlc3Npb25SZWdpc3RyeSwgc3RyaW5nW10+KFxuICAgIGdldFJlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldExvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICBjb25zdCBwaWRTdHIgPSBTdHJpbmcocGlkKTtcbiAgICAgIGNvbnN0IGVudHJ5ID0gcmVnaXN0cnkuc2Vzc2lvbnNbcGlkU3RyXTtcblxuICAgICAgaWYgKGVudHJ5Py5jYXJkSWQpIHJldHVybiBbXTtcblxuICAgICAgY29uc3QgcGVuZGluZ0NvbW1pdHMgPSBlbnRyeT8ucGVuZGluZ0NvbW1pdHMgPz8gW107XG5cbiAgICAgIHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl0gPSB7XG4gICAgICAgIGNhcmRJZCxcbiAgICAgICAgcGVuZGluZ0NvbW1pdHM6IFtdLFxuICAgICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgfTtcblxuICAgICAgcmV0dXJuIHBlbmRpbmdDb21taXRzO1xuICAgIH0sXG4gICAgKHJlZ2lzdHJ5KSA9PiBwcnVuZVN0YWxlRW50cmllcyhyZWdpc3RyeS5zZXNzaW9ucywgaXNQcm9jZXNzQWxpdmUsIE1BWF9FTlRSWV9BR0VfTVMpLFxuICAgIHsgc2Vzc2lvbnM6IHt9IH0gYXMgQ2xhdWRlU2Vzc2lvblJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vKipcbiAqIEFwcGVuZHMgU0hBIHRvIGBwZW5kaW5nQ29tbWl0c2AgZm9yIFBJRCAoZGVkdXBsaWNhdGluZykuIENyZWF0ZXMgdGhlIGVudHJ5XG4gKiBpZiBpdCBkb2VzIG5vdCBleGlzdC5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdGhhdCBwcm9kdWNlZCB0aGUgY29tbWl0LlxuICogQHBhcmFtIHNoYSAtIENvbW1pdCBTSEEgdG8gcmVjb3JkIGZvciBsYXRlciBhdHRyaWJ1dGlvbi5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlY29yZFBlbmRpbmdDb21taXQocGlkOiBudW1iZXIsIHNoYTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGV4ZWN1dGVUcmFuc2FjdGlvbjxDbGF1ZGVTZXNzaW9uUmVnaXN0cnksIHZvaWQ+KFxuICAgIGdldFJlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldExvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICBjb25zdCBwaWRTdHIgPSBTdHJpbmcocGlkKTtcbiAgICAgIGNvbnN0IGVudHJ5ID0gcmVnaXN0cnkuc2Vzc2lvbnNbcGlkU3RyXSA/PyB7XG4gICAgICAgIHBlbmRpbmdDb21taXRzOiBbXSxcbiAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgIH07XG5cbiAgICAgIGlmICghZW50cnkucGVuZGluZ0NvbW1pdHMuaW5jbHVkZXMoc2hhKSkge1xuICAgICAgICBlbnRyeS5wZW5kaW5nQ29tbWl0cy5wdXNoKHNoYSk7XG4gICAgICB9XG5cbiAgICAgIGVudHJ5LnVwZGF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgIHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl0gPSBlbnRyeTtcbiAgICB9LFxuICAgIChyZWdpc3RyeSkgPT4gcHJ1bmVTdGFsZUVudHJpZXMocmVnaXN0cnkuc2Vzc2lvbnMsIGlzUHJvY2Vzc0FsaXZlLCBNQVhfRU5UUllfQUdFX01TKSxcbiAgICB7IHNlc3Npb25zOiB7fSB9IGFzIENsYXVkZVNlc3Npb25SZWdpc3RyeSxcbiAgICBMT0NLX1RJTUVPVVRfTVNcbiAgKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGBjYXJkSWRgIGZvciBQSUQgaWYgaXQgZXhpc3RzLCBudWxsIG90aGVyd2lzZS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gcmVzb2x2ZS5cbiAqIEByZXR1cm5zIEFzc29jaWF0ZWQgY2FyZCBJRCwgb3IgYG51bGxgIHdoZW4gdW5rbm93bi5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFBpZENhcmRJZChwaWQ6IG51bWJlcik6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICByZXR1cm4gZXhlY3V0ZVRyYW5zYWN0aW9uPENsYXVkZVNlc3Npb25SZWdpc3RyeSwgc3RyaW5nIHwgbnVsbD4oXG4gICAgZ2V0UmVnaXN0cnlQYXRoKCksXG4gICAgZ2V0TG9ja1BhdGgoKSxcbiAgICAocmVnaXN0cnkpID0+IHtcbiAgICAgIGNvbnN0IHBpZFN0ciA9IFN0cmluZyhwaWQpO1xuICAgICAgcmV0dXJuIHJlZ2lzdHJ5LnNlc3Npb25zW3BpZFN0cl0/LmNhcmRJZCA/PyBudWxsO1xuICAgIH0sXG4gICAgKHJlZ2lzdHJ5KSA9PiBwcnVuZVN0YWxlRW50cmllcyhyZWdpc3RyeS5zZXNzaW9ucywgaXNQcm9jZXNzQWxpdmUsIE1BWF9FTlRSWV9BR0VfTVMpLFxuICAgIHsgc2Vzc2lvbnM6IHt9IH0gYXMgQ2xhdWRlU2Vzc2lvblJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vKipcbiAqIFJlbW92ZXMgYW5kIHJldHVybnMgdGhlIFBJRCdzIGVudHJ5LiBSZXR1cm5zIG51bGwgaWYgbm90IGZvdW5kLlxuICpcbiAqIEBwYXJhbSBwaWQgLSBDbGF1ZGUgcHJvY2VzcyBJRCB0byByZW1vdmUuXG4gKiBAcmV0dXJucyBSZW1vdmVkIHJlZ2lzdHJ5IGVudHJ5LCBvciBgbnVsbGAgd2hlbiBubyBlbnRyeSBleGlzdGVkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlUGlkRW50cnkocGlkOiBudW1iZXIpOiBQcm9taXNlPENsYXVkZVNlc3Npb25FbnRyeSB8IG51bGw+IHtcbiAgcmV0dXJuIGV4ZWN1dGVUcmFuc2FjdGlvbjxDbGF1ZGVTZXNzaW9uUmVnaXN0cnksIENsYXVkZVNlc3Npb25FbnRyeSB8IG51bGw+KFxuICAgIGdldFJlZ2lzdHJ5UGF0aCgpLFxuICAgIGdldExvY2tQYXRoKCksXG4gICAgKHJlZ2lzdHJ5KSA9PiB7XG4gICAgICBjb25zdCBwaWRTdHIgPSBTdHJpbmcocGlkKTtcbiAgICAgIGNvbnN0IGVudHJ5ID0gcmVnaXN0cnkuc2Vzc2lvbnNbcGlkU3RyXTtcblxuICAgICAgaWYgKGVudHJ5KSB7XG4gICAgICAgIGRlbGV0ZSByZWdpc3RyeS5zZXNzaW9uc1twaWRTdHJdO1xuICAgICAgICByZXR1cm4gZW50cnk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgKHJlZ2lzdHJ5KSA9PiBwcnVuZVN0YWxlRW50cmllcyhyZWdpc3RyeS5zZXNzaW9ucywgaXNQcm9jZXNzQWxpdmUsIE1BWF9FTlRSWV9BR0VfTVMpLFxuICAgIHsgc2Vzc2lvbnM6IHt9IH0gYXMgQ2xhdWRlU2Vzc2lvblJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENhcmQtcmVwbyBQSUQgcmVnaXN0cnkgKHBpZHMuanNvbilcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogSlNPTiBwYXlsb2FkIHN0b3JlZCBhdCBgfi8uY2FyZHMvY2FyZC1yZXBvLWNvbW1pdHMvcGlkcy5qc29uYC4gKi9cbmludGVyZmFjZSBDYXJkUmVwb1BpZFJlZ2lzdHJ5IHtcbiAgc2Vzc2lvbnM6IFJlY29yZDxzdHJpbmcsIFBpZFNlc3Npb25FbnRyeT47XG59XG5cbmZ1bmN0aW9uIGdldENhcmRSZXBvUGlkc1JlZ2lzdHJ5UGF0aCgpOiBzdHJpbmcge1xuICByZXR1cm4gam9pbihnZXRDYXJkc0RpcigpLCAnY2FyZC1yZXBvLWNvbW1pdHMnLCAncGlkcy5qc29uJyk7XG59XG5cbmZ1bmN0aW9uIGdldENhcmRSZXBvUGlkc0xvY2tQYXRoKCk6IHN0cmluZyB7XG4gIHJldHVybiBqb2luKGdldENhcmRzRGlyKCksICdjYXJkLXJlcG8tY29tbWl0cycsICdwaWRzLmxvY2snKTtcbn1cblxuLyoqXG4gKiBSZWdpc3RlcnMgYSBzZXNzaW9uIGZvciBhIENsYXVkZSBwcm9jZXNzIElEIGluIHRoZSBjYXJkLXJlcG8gUElEIHJlZ2lzdHJ5LlxuICpcbiAqIEBwYXJhbSBwaWQgLSBDbGF1ZGUgcHJvY2VzcyBJRCB0byByZWdpc3Rlci5cbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIGlkZW50aWZpZXIgdG8gYXNzb2NpYXRlIHdpdGggdGhlIFBJRC5cbiAqIEBwYXJhbSB0cmFuc2NyaXB0UGF0aCAtIFBhdGggdG8gdGhlIHRyYW5zY3JpcHQgZmlsZSBmb3IgdGhpcyBzZXNzaW9uLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVnaXN0ZXJTZXNzaW9uKHBpZDogbnVtYmVyLCBzZXNzaW9uSWQ6IHN0cmluZywgdHJhbnNjcmlwdFBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBleGVjdXRlVHJhbnNhY3Rpb248Q2FyZFJlcG9QaWRSZWdpc3RyeSwgdm9pZD4oXG4gICAgZ2V0Q2FyZFJlcG9QaWRzUmVnaXN0cnlQYXRoKCksXG4gICAgZ2V0Q2FyZFJlcG9QaWRzTG9ja1BhdGgoKSxcbiAgICAocmVnaXN0cnkpID0+IHtcbiAgICAgIHJlZ2lzdHJ5LnNlc3Npb25zW1N0cmluZyhwaWQpXSA9IHtcbiAgICAgICAgc2Vzc2lvbklkLFxuICAgICAgICB0cmFuc2NyaXB0UGF0aCxcbiAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgIH07XG4gICAgfSxcbiAgICB1bmRlZmluZWQsXG4gICAgeyBzZXNzaW9uczoge30gfSBhcyBDYXJkUmVwb1BpZFJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG4vKipcbiAqIFJlbW92ZXMgYSBQSUQgZW50cnkgZnJvbSB0aGUgY2FyZC1yZXBvIFBJRCByZWdpc3RyeS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gQ2xhdWRlIHByb2Nlc3MgSUQgdG8gcmVtb3ZlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlU2Vzc2lvblBpZChwaWQ6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBleGVjdXRlVHJhbnNhY3Rpb248Q2FyZFJlcG9QaWRSZWdpc3RyeSwgdm9pZD4oXG4gICAgZ2V0Q2FyZFJlcG9QaWRzUmVnaXN0cnlQYXRoKCksXG4gICAgZ2V0Q2FyZFJlcG9QaWRzTG9ja1BhdGgoKSxcbiAgICAocmVnaXN0cnkpID0+IHtcbiAgICAgIGRlbGV0ZSByZWdpc3RyeS5zZXNzaW9uc1tTdHJpbmcocGlkKV07XG4gICAgfSxcbiAgICB1bmRlZmluZWQsXG4gICAgeyBzZXNzaW9uczoge30gfSBhcyBDYXJkUmVwb1BpZFJlZ2lzdHJ5LFxuICAgIExPQ0tfVElNRU9VVF9NU1xuICApO1xufVxuXG5mdW5jdGlvbiByZWFkUmVnaXN0cnlFbnRyeShyZWdpc3RyeVBhdGg6IHN0cmluZywgcGlkOiBudW1iZXIpOiBQaWRTZXNzaW9uRW50cnkgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKHJlZ2lzdHJ5UGF0aCwgJ3V0Zi04Jyk7XG4gICAgY29uc3QgcmVnaXN0cnkgPSBKU09OLnBhcnNlKGNvbnRlbnQpIGFzIENhcmRSZXBvUGlkUmVnaXN0cnk7XG4gICAgcmV0dXJuIHJlZ2lzdHJ5LnNlc3Npb25zW1N0cmluZyhwaWQpXSA/PyBudWxsO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiB3YWl0Rm9yUGlkRW50cnk8VD4oXG4gIHBpZDogbnVtYmVyLFxuICB0aW1lb3V0OiBudW1iZXIgfCB1bmRlZmluZWQsXG4gIGV4dHJhY3Q6IChlbnRyeTogUGlkU2Vzc2lvbkVudHJ5KSA9PiBUXG4pOiBQcm9taXNlPFQgfCBudWxsPiB7XG4gIGNvbnN0IHJlZ2lzdHJ5UGF0aCA9IGdldENhcmRSZXBvUGlkc1JlZ2lzdHJ5UGF0aCgpO1xuXG4gIC8vIDEuIEltbWVkaWF0ZSByZWFkXG4gIGNvbnN0IGltbWVkaWF0ZSA9IHJlYWRSZWdpc3RyeUVudHJ5KHJlZ2lzdHJ5UGF0aCwgcGlkKTtcbiAgaWYgKGltbWVkaWF0ZSkgcmV0dXJuIGV4dHJhY3QoaW1tZWRpYXRlKTtcblxuICAvLyAyLiBObyB0aW1lb3V0IFx1MjE5MiByZXR1cm4gbnVsbFxuICBpZiAodGltZW91dCA9PT0gdW5kZWZpbmVkIHx8IHRpbWVvdXQgPD0gMCkgcmV0dXJuIG51bGw7XG5cbiAgLy8gMy4gV2F0Y2ggZm9yIGNoYW5nZXNcbiAgY29uc3QgZGlyID0gZGlybmFtZShyZWdpc3RyeVBhdGgpO1xuICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgLy8gVG91Y2ggZmlsZSBpZiBhYnNlbnQgc28gZnMud2F0Y2ggaGFzIHNvbWV0aGluZyB0byB3YXRjaFxuICBpZiAoIWV4aXN0c1N5bmMocmVnaXN0cnlQYXRoKSkge1xuICAgIHdyaXRlRmlsZVN5bmMocmVnaXN0cnlQYXRoLCBKU09OLnN0cmluZ2lmeSh7IHNlc3Npb25zOiB7fSB9LCBudWxsLCAyKSwgeyBtb2RlOiAwbzYwMCB9KTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUHJvbWlzZTxUIHwgbnVsbD4oKHJlc29sdmUpID0+IHtcbiAgICBsZXQgcmVzb2x2ZWQgPSBmYWxzZTtcbiAgICBjb25zdCBjbGVhbnVwID0gKCkgPT4ge1xuICAgICAgaWYgKCFyZXNvbHZlZCkge1xuICAgICAgICByZXNvbHZlZCA9IHRydWU7XG4gICAgICAgIHdhdGNoZXIuY2xvc2UoKTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgd2F0Y2hlciA9IHdhdGNoKHJlZ2lzdHJ5UGF0aCwgKCkgPT4ge1xuICAgICAgY29uc3QgZW50cnkgPSByZWFkUmVnaXN0cnlFbnRyeShyZWdpc3RyeVBhdGgsIHBpZCk7XG4gICAgICBpZiAoZW50cnkpIHtcbiAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICByZXNvbHZlKGV4dHJhY3QoZW50cnkpKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBjbGVhbnVwKCk7XG4gICAgICByZXNvbHZlKG51bGwpO1xuICAgIH0sIHRpbWVvdXQpO1xuXG4gICAgLy8gSGFuZGxlIHdhdGNoZXIgZXJyb3JzIGdyYWNlZnVsbHlcbiAgICB3YXRjaGVyLm9uKCdlcnJvcicsICgpID0+IHtcbiAgICAgIGNsZWFudXAoKTtcbiAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHNlc3Npb24gSUQgZm9yIGEgQ2xhdWRlIHByb2Nlc3MgSUQsIG9wdGlvbmFsbHkgd2FpdGluZyBmb3IgaXRcbiAqIHRvIGFwcGVhciBpbiB0aGUgcmVnaXN0cnkuXG4gKlxuICogQHBhcmFtIHBpZCAtIENsYXVkZSBwcm9jZXNzIElEIHRvIGxvb2sgdXAuXG4gKiBAcGFyYW0gdGltZW91dCAtIE1heGltdW0gdGltZSB0byB3YWl0IGluIG1pbGxpc2Vjb25kcy4gSWYgb21pdHRlZCwgcmV0dXJucyBpbW1lZGlhdGVseS5cbiAqIEByZXR1cm5zIFNlc3Npb24gSUQsIG9yIGBudWxsYCB3aGVuIHRoZSBlbnRyeSBpcyBhYnNlbnQgKG9yIHRpbWVvdXQgZXhwaXJlcykuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRTZXNzaW9uSWRGb3JQaWQocGlkOiBudW1iZXIsIHRpbWVvdXQ/OiBudW1iZXIpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgcmV0dXJuIHdhaXRGb3JQaWRFbnRyeShwaWQsIHRpbWVvdXQsIChlKSA9PiBlLnNlc3Npb25JZCk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdHJhbnNjcmlwdCBwYXRoIGZvciBhIENsYXVkZSBwcm9jZXNzIElELCBvcHRpb25hbGx5IHdhaXRpbmcgZm9yIGl0XG4gKiB0byBhcHBlYXIgaW4gdGhlIHJlZ2lzdHJ5LlxuICpcbiAqIEBwYXJhbSBwaWQgLSBDbGF1ZGUgcHJvY2VzcyBJRCB0byBsb29rIHVwLlxuICogQHBhcmFtIHRpbWVvdXQgLSBNYXhpbXVtIHRpbWUgdG8gd2FpdCBpbiBtaWxsaXNlY29uZHMuIElmIG9taXR0ZWQsIHJldHVybnMgaW1tZWRpYXRlbHkuXG4gKiBAcmV0dXJucyBUcmFuc2NyaXB0IHBhdGgsIG9yIGBudWxsYCB3aGVuIHRoZSBlbnRyeSBpcyBhYnNlbnQgKG9yIHRpbWVvdXQgZXhwaXJlcykuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRUcmFuc2NyaXB0UGF0aEZvclBpZChwaWQ6IG51bWJlciwgdGltZW91dD86IG51bWJlcik6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICByZXR1cm4gd2FpdEZvclBpZEVudHJ5KHBpZCwgdGltZW91dCwgKGUpID0+IGUudHJhbnNjcmlwdFBhdGgpO1xufVxuIiwgIi8qKlxuICogR2VuZXJpYyBzaGFyZWQgaGVscGVycyBmb3IgcmVnaXN0cnkgZmlsZSBvcGVyYXRpb25zLlxuICpcbiAqIEV4dHJhY3RlZCBmcm9tIGluZGV4LnRzIHNvIHRoYXQgbXVsdGlwbGUgcmVnaXN0cnkgbW9kdWxlcyBjYW4gcmV1c2UgdGhlXG4gKiBzYW1lIGxvY2tpbmcsIHJlYWQvd3JpdGUsIGFuZCBwcnVuaW5nIHByaW1pdGl2ZXMgd2l0aG91dCBkdXBsaWNhdGlvbi5cbiAqXG4gKiBBbGwgaGVscGVycyBmb2xsb3cgZmFpbC1jbG9zZWQgc2VtYW50aWNzOiB1bmV4cGVjdGVkIGVycm9ycyBwcm9wYWdhdGVcbiAqIHJhdGhlciB0aGFuIGJlaW5nIHNpbGVudGx5IHN3YWxsb3dlZC5cbiAqXG4gKiBAc3VtbWFyeSBHZW5lcmljIGxvY2tpbmcsIHJlYWQvd3JpdGUsIGFuZCBwcnVuaW5nIGhlbHBlcnNcbiAqIEBtb2R1bGUgaW50ZXJuYWxcbiAqL1xuXG5pbXBvcnQgeyBjbG9zZVN5bmMsIG1rZGlyU3luYywgb3BlblN5bmMsIHJlYWRGaWxlU3luYywgcmVuYW1lU3luYywgdW5saW5rU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBpc1Byb2Nlc3NBbGl2ZSB9IGZyb20gJy4vaXBjLmpzJztcblxuZXhwb3J0IHsgaXNQcm9jZXNzQWxpdmUgfSBmcm9tICcuL2lwYy5qcyc7XG5cbi8qKlxuICogUmV0dXJucyBhIHByb21pc2UgdGhhdCByZXNvbHZlcyBhZnRlciBgbXNgIG1pbGxpc2Vjb25kcy5cbiAqXG4gKiBAcGFyYW0gbXMgLSBEdXJhdGlvbiB0byBzbGVlcCBpbiBtaWxsaXNlY29uZHMuXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyBhZnRlciB0aGUgc3BlY2lmaWVkIGRlbGF5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2xlZXAobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhbiB1bmtub3duIHRocm93biB2YWx1ZSBpcyBhIE5vZGUuanMgc3lzdGVtIGVycm9yIHdpdGggdGhlXG4gKiBzcGVjaWZpZWQgYGNvZGVgIHByb3BlcnR5IChlLmcuIGAnRU5PRU5UJ2AsIGAnRUVYSVNUJ2ApLlxuICpcbiAqIEBwYXJhbSBlcnJvciAtIFZhbHVlIGNhdWdodCBpbiBhIGBjYXRjaGAgYmxvY2suXG4gKiBAcGFyYW0gY29kZSAtIEV4cGVjdGVkIGBFcnJub0V4Y2VwdGlvbi5jb2RlYCBzdHJpbmcuXG4gKiBAcmV0dXJucyBgdHJ1ZWAgd2hlbiB0aGUgZXJyb3IgbWF0Y2hlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc0Vycm5vQ29kZShlcnJvcjogdW5rbm93biwgY29kZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmICdjb2RlJyBpbiBlcnJvciAmJiAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSBjb2RlO1xufVxuXG4vKipcbiAqIEF0dGVtcHRzIHRvIHJlbW92ZSBhIHN0YWxlIGxvY2sgZmlsZSBsZWZ0IGJ5IGEgZGVhZCBwcm9jZXNzLlxuICpcbiAqIFJlYWRzIHRoZSBQSUQgZnJvbSB0aGUgbG9jayBmaWxlLCBjaGVja3MgbGl2ZW5lc3MsIGFuZCB1bmxpbmtzIHdoZW4gdGhlXG4gKiBob2xkZXIgaXMgbm8gbG9uZ2VyIHJ1bm5pbmcuIEEgc2Vjb25kIHJlYWQgZ3VhcmRzIGFnYWluc3QgVE9DVE9VIHJhY2VzLlxuICpcbiAqIEBwYXJhbSBsb2NrUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGxvY2sgZmlsZS5cbiAqIEByZXR1cm5zIGB0cnVlYCB3aGVuIHRoZSBzdGFsZSBsb2NrIHdhcyBzdWNjZXNzZnVsbHkgcmVtb3ZlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyeVJlbW92ZVN0YWxlTG9jayhsb2NrUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHRyeSB7XG4gICAgY29uc3QgbG9ja0NvbnRlbnQgPSByZWFkRmlsZVN5bmMobG9ja1BhdGgsICd1dGYtOCcpO1xuICAgIGNvbnN0IGhvbGRlclBpZCA9IE51bWJlci5wYXJzZUludChsb2NrQ29udGVudC50cmltKCksIDEwKTtcblxuICAgIGlmICghTnVtYmVyLmlzTmFOKGhvbGRlclBpZCkgJiYgIWlzUHJvY2Vzc0FsaXZlKGhvbGRlclBpZCkpIHtcbiAgICAgIC8vIFJlLXJlYWQgbG9jayBmaWxlIHRvIHJlZHVjZSBUT0NUT1UgcmFjZSB3aW5kb3cgYmVmb3JlIHVubGlua2luZy5cbiAgICAgIGlmIChyZWFkRmlsZVN5bmMobG9ja1BhdGgsICd1dGYtOCcpID09PSBsb2NrQ29udGVudCkge1xuICAgICAgICB1bmxpbmtTeW5jKGxvY2tQYXRoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICB0cnkge1xuICAgICAgdW5saW5rU3luYyhsb2NrUGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIEVOT0VOVDogbG9jayBhbHJlYWR5IHJlbW92ZWQ7IG90aGVyIGVycm9yczogYmVzdC1lZmZvcnQgY2xlYW51cFxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbG9jayBmaWxlIGV4Y2x1c2l2ZWx5IGFuZCB3cml0ZXMgdGhlIGN1cnJlbnQgUElEIGludG8gaXQuXG4gKlxuICogVXNlcyBgT19XUk9OTFkgfCBPX0NSRUFUIHwgT19FWENMYCAoYCd3eCdgKSBzbyB0aGUgY2FsbCBmYWlscyB3aXRoXG4gKiBgRUVYSVNUYCB3aGVuIGFub3RoZXIgcHJvY2VzcyBhbHJlYWR5IGhvbGRzIHRoZSBsb2NrLlxuICpcbiAqIEBwYXJhbSBsb2NrUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGxvY2sgZmlsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlTG9ja0hvbGRlclBpZChsb2NrUGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGZkID0gb3BlblN5bmMobG9ja1BhdGgsICd3eCcsIDBvNjAwKTtcbiAgdHJ5IHtcbiAgICB3cml0ZUZpbGVTeW5jKGZkLCBTdHJpbmcocHJvY2Vzcy5waWQpKTtcbiAgfSBmaW5hbGx5IHtcbiAgICBjbG9zZVN5bmMoZmQpO1xuICB9XG59XG5cbi8qKlxuICogQWNxdWlyZXMgYW4gYWR2aXNvcnkgZmlsZSBsb2NrLCByZXRyeWluZyB1bnRpbCBzdWNjZXNzIG9yIHRpbWVvdXQuXG4gKlxuICogKipGYWlsLWNsb3NlZCoqOiB0aHJvd3Mgb24gdGltZW91dCBpbnN0ZWFkIG9mIHJldHVybmluZyBhIGJvb2xlYW4uXG4gKlxuICogQHBhcmFtIGxvY2tQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgbG9jayBmaWxlLlxuICogQHBhcmFtIHRpbWVvdXRNcyAtIE1heGltdW0gd2FpdCB0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAqIEB0aHJvd3Mge0Vycm9yfSBgJ0xvY2sgYWNxdWlzaXRpb24gdGltZW91dCdgIHdoZW4gdGhlIGxvY2sgY2Fubm90IGJlXG4gKiAgIGFjcXVpcmVkIHdpdGhpbiBgdGltZW91dE1zYC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFjcXVpcmVMb2NrKGxvY2tQYXRoOiBzdHJpbmcsIHRpbWVvdXRNczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gIGNvbnN0IGRpciA9IGRpcm5hbWUobG9ja1BhdGgpO1xuXG4gIHdoaWxlIChEYXRlLm5vdygpIC0gc3RhcnRUaW1lIDwgdGltZW91dE1zKSB7XG4gICAgdHJ5IHtcbiAgICAgIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlLCBtb2RlOiAwbzcwMCB9KTtcbiAgICAgIHdyaXRlTG9ja0hvbGRlclBpZChsb2NrUGF0aCk7XG4gICAgICByZXR1cm47IC8vIHN1Y2Nlc3NcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKCFoYXNFcnJub0NvZGUoZXJyb3IsICdFRVhJU1QnKSkgdGhyb3cgZXJyb3I7XG4gICAgICBpZiAodHJ5UmVtb3ZlU3RhbGVMb2NrKGxvY2tQYXRoKSkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IHJlbWFpbmluZyA9IHRpbWVvdXRNcyAtIChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKTtcbiAgICAgIGlmIChyZW1haW5pbmcgPiAwKSB7XG4gICAgICAgIGF3YWl0IHNsZWVwKE1hdGgubWluKDUwLCByZW1haW5pbmcpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoJ0xvY2sgYWNxdWlzaXRpb24gdGltZW91dCcpO1xufVxuXG4vKipcbiAqIFJlbGVhc2VzIGFuIGFkdmlzb3J5IGZpbGUgbG9jayBieSB1bmxpbmtpbmcgdGhlIGxvY2sgZmlsZS5cbiAqXG4gKiBgRU5PRU5UYCBpcyBzaWxlbnRseSBpZ25vcmVkICh0aGUgbG9jayB3YXMgYWxyZWFkeSByZWxlYXNlZCk7IGFsbCBvdGhlclxuICogZXJyb3JzIHByb3BhZ2F0ZS5cbiAqXG4gKiBAcGFyYW0gbG9ja1BhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBsb2NrIGZpbGUuXG4gKiBAdGhyb3dzIHtOb2RlSlMuRXJybm9FeGNlcHRpb259IFdoZW4gdGhlIHVubGluayBmYWlscyBmb3IgcmVhc29ucyBvdGhlciB0aGFuIGBFTk9FTlRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVsZWFzZUxvY2sobG9ja1BhdGg6IHN0cmluZyk6IHZvaWQge1xuICB0cnkge1xuICAgIHVubGlua1N5bmMobG9ja1BhdGgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmICghaGFzRXJybm9Db2RlKGVycm9yLCAnRU5PRU5UJykpIHRocm93IGVycm9yO1xuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlcyBzdGFsZSBlbnRyaWVzIGZyb20gYSBQSUQta2V5ZWQgcmVnaXN0cnkgb2JqZWN0LlxuICpcbiAqIEFuIGVudHJ5IGlzIGNvbnNpZGVyZWQgc3RhbGUgd2hlbjpcbiAqIDEuIEl0cyBrZXkgaXMgbm90IGEgdmFsaWQgaW50ZWdlciBQSUQuXG4gKiAyLiBJdHMgYHVwZGF0ZWRBdGAgdGltZXN0YW1wIGlzIG9sZGVyIHRoYW4gYG1heEFnZU1zYC5cbiAqIDMuIFRoZSBwcm9jZXNzIGlkZW50aWZpZWQgYnkgaXRzIGtleSBpcyBubyBsb25nZXIgYWxpdmUuXG4gKlxuICogQHBhcmFtIHJlZ2lzdHJ5IC0gTXV0YWJsZSBQSUQta2V5ZWQgcmVjb3JkIHRvIHBydW5lIGluIHBsYWNlLlxuICogQHBhcmFtIGlzQWxpdmUgLSBMaXZlbmVzcyBjaGVjayBmdW5jdGlvbiAodHlwaWNhbGx5IHtAbGluayBpc1Byb2Nlc3NBbGl2ZX0pLlxuICogQHBhcmFtIG1heEFnZU1zIC0gTWF4aW11bSBlbnRyeSBhZ2UgaW4gbWlsbGlzZWNvbmRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJ1bmVTdGFsZUVudHJpZXM8VCBleHRlbmRzIHsgdXBkYXRlZEF0OiBzdHJpbmcgfT4oXG4gIHJlZ2lzdHJ5OiBSZWNvcmQ8c3RyaW5nLCBUPixcbiAgaXNBbGl2ZTogKHBpZDogbnVtYmVyKSA9PiBib29sZWFuLFxuICBtYXhBZ2VNczogbnVtYmVyXG4pOiB2b2lkIHtcbiAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcblxuICBmb3IgKGNvbnN0IFtwaWRTdHIsIGVudHJ5XSBvZiBPYmplY3QuZW50cmllcyhyZWdpc3RyeSkpIHtcbiAgICBjb25zdCBwaWQgPSBOdW1iZXIucGFyc2VJbnQocGlkU3RyLCAxMCk7XG5cbiAgICBpZiAoTnVtYmVyLmlzTmFOKHBpZCkpIHtcbiAgICAgIGRlbGV0ZSByZWdpc3RyeVtwaWRTdHJdO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVwZGF0ZWRBdCA9IG5ldyBEYXRlKGVudHJ5LnVwZGF0ZWRBdCkuZ2V0VGltZSgpO1xuICAgICAgaWYgKG5vdyAtIHVwZGF0ZWRBdCA+IG1heEFnZU1zKSB7XG4gICAgICAgIGRlbGV0ZSByZWdpc3RyeVtwaWRTdHJdO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIGRlbGV0ZSByZWdpc3RyeVtwaWRTdHJdO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghaXNBbGl2ZShwaWQpKSB7XG4gICAgICAgIGRlbGV0ZSByZWdpc3RyeVtwaWRTdHJdO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gaXNQcm9jZXNzQWxpdmUgdGhyb3dzIG9uIHVuZXhwZWN0ZWQgZXJyb3JzIC0ga2VlcCBlbnRyeVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJlYWRzIGFuZCBwYXJzZXMgYSBKU09OIHJlZ2lzdHJ5IGZpbGUuXG4gKlxuICogKipGYWlsLWNsb3NlZCoqOiByZXR1cm5zIGBkZWZhdWx0VmFsdWVgIG9ubHkgd2hlbiB0aGUgZmlsZSBkb2VzIG5vdCBleGlzdFxuICogKGBFTk9FTlRgKS4gUGFyc2UgZXJyb3JzIGFuZCBvdGhlciBJL08gZmFpbHVyZXMgcHJvcGFnYXRlIGFzIGV4Y2VwdGlvbnMuXG4gKlxuICogQHBhcmFtIHBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZWdpc3RyeSBKU09OIGZpbGUuXG4gKiBAcGFyYW0gZGVmYXVsdFZhbHVlIC0gVmFsdWUgcmV0dXJuZWQgd2hlbiB0aGUgZmlsZSBkb2VzIG5vdCBleGlzdC5cbiAqIEByZXR1cm5zIFBhcnNlZCByZWdpc3RyeSBjb250ZW50cywgb3IgYGRlZmF1bHRWYWx1ZWAgb24gYEVOT0VOVGAuXG4gKiBAdGhyb3dzIHtTeW50YXhFcnJvcn0gV2hlbiB0aGUgZmlsZSBjb250YWlucyBpbnZhbGlkIEpTT04uXG4gKiBAdGhyb3dzIHtOb2RlSlMuRXJybm9FeGNlcHRpb259IE9uIEkvTyBlcnJvcnMgb3RoZXIgdGhhbiBgRU5PRU5UYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRSZWdpc3RyeTxUPihwYXRoOiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogVCk6IFQge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMocGF0aCwgJ3V0Zi04Jyk7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoY29udGVudCkgYXMgVDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoaGFzRXJybm9Db2RlKGVycm9yLCAnRU5PRU5UJykpIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgdGhyb3cgZXJyb3I7IC8vIEZBSUwtQ0xPU0VEOiB0aHJvdyBvbiBwYXJzZSBlcnJvcnNcbiAgfVxufVxuXG4vKipcbiAqIEF0b21pY2FsbHkgd3JpdGVzIGEgcmVnaXN0cnkgb2JqZWN0IGFzIHByZXR0eS1wcmludGVkIEpTT04uXG4gKlxuICogV3JpdGVzIHRvIGEgdGVtcG9yYXJ5IGAudG1wYCBzaWJsaW5nIGZpcnN0LCB0aGVuIHJlbmFtZXMgaW50byBwbGFjZSBzb1xuICogcmVhZGVycyBuZXZlciBvYnNlcnZlIGEgcGFydGlhbGx5LXdyaXR0ZW4gZmlsZS5cbiAqXG4gKiBAcGFyYW0gcmVnaXN0cnkgLSBPYmplY3QgdG8gc2VyaWFsaXplLlxuICogQHBhcmFtIHJlZ2lzdHJ5UGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIHRhcmdldCByZWdpc3RyeSBmaWxlLlxuICogQHRocm93cyB7Tm9kZUpTLkVycm5vRXhjZXB0aW9ufSBPbiBmaWxlc3lzdGVtIHdyaXRlIG9yIHJlbmFtZSBmYWlsdXJlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlUmVnaXN0cnlMb2NrZWQ8VD4ocmVnaXN0cnk6IFQsIHJlZ2lzdHJ5UGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGRpciA9IGRpcm5hbWUocmVnaXN0cnlQYXRoKTtcbiAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUsIG1vZGU6IDBvNzAwIH0pO1xuICBjb25zdCB0ZW1wUGF0aCA9IGAke3JlZ2lzdHJ5UGF0aH0udG1wYDtcbiAgdHJ5IHtcbiAgICB3cml0ZUZpbGVTeW5jKHRlbXBQYXRoLCBKU09OLnN0cmluZ2lmeShyZWdpc3RyeSwgbnVsbCwgMiksIHsgbW9kZTogMG82MDAgfSk7XG4gICAgcmVuYW1lU3luYyh0ZW1wUGF0aCwgcmVnaXN0cnlQYXRoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB0cnkge1xuICAgICAgdW5saW5rU3luYyh0ZW1wUGF0aCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBjbGVhbnVwIGJlc3QtZWZmb3J0ICovXG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbi8qKlxuICogRXhlY3V0ZXMgYSByZWFkLW1vZGlmeS13cml0ZSB0cmFuc2FjdGlvbiB1bmRlciBhbiBhZHZpc29yeSBmaWxlIGxvY2suXG4gKlxuICogMS4gQWNxdWlyZXMgbG9jay5cbiAqIDIuIFJlYWRzIHJlZ2lzdHJ5IChvciB1c2VzIGBkZWZhdWx0UmVnaXN0cnlgIGlmIGZpbGUgYWJzZW50KS5cbiAqIDMuIE9wdGlvbmFsbHkgcHJ1bmVzIHN0YWxlIGVudHJpZXMuXG4gKiA0LiBDYWxscyBgb3BlcmF0aW9uYCB3aXRoIHRoZSBtdXRhYmxlIHJlZ2lzdHJ5LlxuICogNS4gV3JpdGVzIHRoZSByZWdpc3RyeSBiYWNrLlxuICogNi4gUmVsZWFzZXMgbG9jayAoZ3VhcmFudGVlZCB2aWEgYGZpbmFsbHlgKS5cbiAqXG4gKiBAcGFyYW0gcmVnaXN0cnlQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgcmVnaXN0cnkgSlNPTiBmaWxlLlxuICogQHBhcmFtIGxvY2tQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgbG9jayBmaWxlLlxuICogQHBhcmFtIG9wZXJhdGlvbiAtIENhbGxiYWNrIHRoYXQgbXV0YXRlcyB0aGUgcmVnaXN0cnkgYW5kIHJldHVybnMgYSByZXN1bHQuXG4gKiBAcGFyYW0gcHJ1bmVyIC0gT3B0aW9uYWwgY2FsbGJhY2sgdG8gcHJ1bmUgc3RhbGUgZW50cmllcyBiZWZvcmUgdGhlIG9wZXJhdGlvbi5cbiAqIEBwYXJhbSBkZWZhdWx0UmVnaXN0cnkgLSBEZWZhdWx0IHZhbHVlIHdoZW4gdGhlIHJlZ2lzdHJ5IGZpbGUgZG9lcyBub3QgZXhpc3QuXG4gKiBAcGFyYW0gbG9ja1RpbWVvdXRNcyAtIExvY2sgYWNxdWlzaXRpb24gdGltZW91dCAoZGVmYXVsdCAyMDAwIG1zKS5cbiAqIEByZXR1cm5zIFRoZSB2YWx1ZSByZXR1cm5lZCBieSBgb3BlcmF0aW9uYC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVUcmFuc2FjdGlvbjxUUmVnaXN0cnksIFRSZXN1bHQ+KFxuICByZWdpc3RyeVBhdGg6IHN0cmluZyxcbiAgbG9ja1BhdGg6IHN0cmluZyxcbiAgb3BlcmF0aW9uOiAocmVnaXN0cnk6IFRSZWdpc3RyeSkgPT4gVFJlc3VsdCxcbiAgcHJ1bmVyPzogKHJlZ2lzdHJ5OiBUUmVnaXN0cnkpID0+IHZvaWQsXG4gIGRlZmF1bHRSZWdpc3RyeT86IFRSZWdpc3RyeSxcbiAgbG9ja1RpbWVvdXRNcz86IG51bWJlclxuKTogUHJvbWlzZTxUUmVzdWx0PiB7XG4gIGF3YWl0IGFjcXVpcmVMb2NrKGxvY2tQYXRoLCBsb2NrVGltZW91dE1zID8/IDIwMDApO1xuICB0cnkge1xuICAgIGNvbnN0IHJlZ2lzdHJ5ID0gcmVhZFJlZ2lzdHJ5PFRSZWdpc3RyeT4ocmVnaXN0cnlQYXRoLCBkZWZhdWx0UmVnaXN0cnkgYXMgVFJlZ2lzdHJ5KTtcbiAgICBpZiAocHJ1bmVyKSBwcnVuZXIocmVnaXN0cnkpO1xuICAgIGNvbnN0IHJlc3VsdCA9IG9wZXJhdGlvbihyZWdpc3RyeSk7XG4gICAgd3JpdGVSZWdpc3RyeUxvY2tlZChyZWdpc3RyeSwgcmVnaXN0cnlQYXRoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9IGZpbmFsbHkge1xuICAgIHJlbGVhc2VMb2NrKGxvY2tQYXRoKTtcbiAgfVxufVxuIiwgIi8qKlxuICogUHJvY2VzcyB0cmVlIHV0aWxpdGllcyBmb3IgbG9jYXRpbmcgQ2xhdWRlIENvZGUgYW5jZXN0b3IgcHJvY2Vzc2VzLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBQcm9jZXNzIHRyZWUgdXRpbGl0aWVzIGZvciBsb2NhdGluZyBDbGF1ZGUgQ29kZSBhbmNlc3RvciBwcm9jZXNzZXNcbiAqIEBtb2R1bGUgbGliL3Byb2Nlc3MtdHJlZVxuICovXG5cbmltcG9ydCB7IGV4ZWNTeW5jIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGJhc2VuYW1lIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuLyoqIE1heGltdW0gZGVwdGggdG8gd2FsayB1cCB0aGUgcHJvY2VzcyB0cmVlLiAqL1xuZXhwb3J0IGNvbnN0IFBST0NFU1NfVFJFRV9NQVhfREVQVEggPSAxMDtcblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIGdpdmVuIFBJRCBiZWxvbmdzIHRvIGEgcHJvY2VzcyBuYW1lZCBcImNsYXVkZVwiLlxuICpcbiAqIFR3by1zdGVwIG1hdGNoaW5nOlxuICogMS4gUHJpbWFyeTogYHBzIC1wIFBJRCAtbyBjb21tPWAgLT4gYmFzZW5hbWUgLT4gY29tcGFyZSBcImNsYXVkZVwiIChjYXNlLWluc2Vuc2l0aXZlKVxuICogMi4gRmFsbGJhY2s6IGBwcyAtcCBQSUQgLW8gYXJncz1gIC0+IHRlc3QgL1xcYmNsYXVkZVxcYi9pXG4gKlxuICogQHBhcmFtIHBpZCAtIFByb2Nlc3MgSUQgdG8gaW5zcGVjdC5cbiAqIEByZXR1cm5zIGB0cnVlYCB3aGVuIHRoZSBwcm9jZXNzIGNvbW1hbmQgbWF0Y2hlcyBDbGF1ZGU7IG90aGVyd2lzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0NsYXVkZShwaWQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbW0gPSBleGVjU3luYyhgcHMgLXAgJHtwaWR9IC1vIGNvbW09YCwgeyBlbmNvZGluZzogJ3V0ZjgnIH0pLnRyaW0oKTtcbiAgICBpZiAoYmFzZW5hbWUoY29tbSkudG9Mb3dlckNhc2UoKSA9PT0gJ2NsYXVkZScpIHJldHVybiB0cnVlO1xuXG4gICAgY29uc3QgYXJncyA9IGV4ZWNTeW5jKGBwcyAtcCAke3BpZH0gLW8gYXJncz1gLCB7IGVuY29kaW5nOiAndXRmOCcgfSkudHJpbSgpO1xuICAgIHJldHVybiAvXFxiY2xhdWRlXFxiL2kudGVzdChhcmdzKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgcGFyZW50IFBJRCBmb3IgYSBwcm9jZXNzLCBvciBgbnVsbGAgd2hlbiB0cmF2ZXJzYWwgc2hvdWxkIHN0b3AuXG4gKlxuICogYG51bGxgIGlzIHJldHVybmVkIGZvciBtaXNzaW5nIHByb2Nlc3NlcywgbWFsZm9ybWVkIGBwc2Agb3V0cHV0LCBhbmRcbiAqIHNlbGYtcGFyZW50aW5nIHZhbHVlcyB0aGF0IHdvdWxkIG90aGVyd2lzZSBjcmVhdGUgYSBsb29wLlxuICpcbiAqIEBwYXJhbSBwaWQgLSBQcm9jZXNzIElEIHdob3NlIHBhcmVudCBzaG91bGQgYmUgcXVlcmllZC5cbiAqIEByZXR1cm5zIFBhcmVudCBQSUQgd2hlbiBhdmFpbGFibGUsIG90aGVyd2lzZSBgbnVsbGAuXG4gKi9cbmZ1bmN0aW9uIGdldFBhcmVudFBpZChwaWQ6IG51bWJlcik6IG51bWJlciB8IG51bGwge1xuICB0cnkge1xuICAgIGNvbnN0IHBwaWRTdHIgPSBleGVjU3luYyhgcHMgLXAgJHtwaWR9IC1vIHBwaWQ9YCwgeyBlbmNvZGluZzogJ3V0ZjgnIH0pLnRyaW0oKTtcbiAgICBjb25zdCBwYXJlbnRQaWQgPSBOdW1iZXIucGFyc2VJbnQocHBpZFN0ciwgMTApO1xuICAgIGlmIChOdW1iZXIuaXNOYU4ocGFyZW50UGlkKSB8fCBwYXJlbnRQaWQgPT09IHBpZCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHBhcmVudFBpZDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBXYWxrcyB0aGUgcHJvY2VzcyB0cmVlIHVwd2FyZCBmcm9tIGBzdGFydFBpZGAgKGRlZmF1bHQ6IGBwcm9jZXNzLnBwaWRgKVxuICogbG9va2luZyBmb3IgdGhlIG5lYXJlc3QgYW5jZXN0b3IgbmFtZWQgXCJjbGF1ZGVcIi5cbiAqXG4gKiBAcGFyYW0gc3RhcnRQaWQgLSBPcHRpb25hbCByb290IFBJRCBmb3IgdHJhdmVyc2FsLiBXaGVuIG9taXR0ZWQsIHRyYXZlcnNhbFxuICogICBzdGFydHMgYXQgdGhlIHBhcmVudCBvZiB0aGUgY3VycmVudCBob29rIHByb2Nlc3MuXG4gKiBAcmV0dXJucyBUaGUgbmVhcmVzdCBtYXRjaGluZyBDbGF1ZGUgYW5jZXN0b3IgUElELCBvciBgbnVsbGAgd2hlbiBubyBtYXRjaFxuICogICBpcyBmb3VuZCB3aXRoaW4ge0BsaW5rIFBST0NFU1NfVFJFRV9NQVhfREVQVEh9LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZENsYXVkZVBpZChzdGFydFBpZD86IG51bWJlcik6IG51bWJlciB8IG51bGwge1xuICBjb25zdCBwaWRzID0gZmluZEFsbENsYXVkZVBpZHMoc3RhcnRQaWQpO1xuICByZXR1cm4gcGlkc1swXSA/PyBudWxsO1xufVxuXG4vKipcbiAqIFdhbGtzIHRoZSBwcm9jZXNzIHRyZWUgdXB3YXJkIGZyb20gYHN0YXJ0UGlkYCAoZGVmYXVsdDogYHByb2Nlc3MucHBpZGApIGFuZFxuICogcmV0dXJucyAqKmFsbCoqIFBJRHMgbmFtZWQgXCJjbGF1ZGVcIiwgb3JkZXJlZCBuZWFyZXN0LWZpcnN0LlxuICpcbiAqIFVzZWZ1bCB3aGVuIG11bHRpcGxlIENsYXVkZSBzZXNzaW9ucyBhcmUgbmVzdGVkIChlLmcuIGEgVGFzayBzdWJhZ2VudFxuICogc3Bhd25lZCBieSBhbiBvdXRlciBDbGF1ZGUpIGFuZCB0aGUgY29ycmVjdCBjYXJkIGFzc29jaWF0aW9uIG1heSBiZWxvbmdcbiAqIHRvIGFuIGFuY2VzdG9yIGZ1cnRoZXIgdXAgdGhlIHRyZWUuXG4gKiBJZiBDbGF1ZGUgbGF1bmNoZWQgQ2xhdWRlIHdoaWNoIGxhdW5jaGVkIENsYXVkZSwgdGhpcyByZXR1cm5zIHRoYXQgYnJlYWRjcnVtYlxuICogdHJhaWwgbmVhcmVzdC1maXJzdC5cbiAqXG4gKiBAcGFyYW0gc3RhcnRQaWQgLSBPcHRpb25hbCByb290IFBJRCBmb3IgdHJhdmVyc2FsLiBXaGVuIG9taXR0ZWQsIHRyYXZlcnNhbFxuICogICBzdGFydHMgYXQgdGhlIHBhcmVudCBvZiB0aGUgY3VycmVudCBob29rIHByb2Nlc3MuXG4gKiBAcmV0dXJucyBBbGwgbWF0Y2hpbmcgQ2xhdWRlIGFuY2VzdG9yIFBJRHMgZGlzY292ZXJlZCBiZWZvcmUgdHJhdmVyc2FsIHN0b3BzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZEFsbENsYXVkZVBpZHMoc3RhcnRQaWQ/OiBudW1iZXIpOiBudW1iZXJbXSB7XG4gIGNvbnN0IHJlc3VsdHM6IG51bWJlcltdID0gW107XG4gIGxldCBwaWQgPSBzdGFydFBpZCA/PyBwcm9jZXNzLnBwaWQ7XG5cbiAgZm9yIChsZXQgZGVwdGggPSAwOyBkZXB0aCA8IFBST0NFU1NfVFJFRV9NQVhfREVQVEg7IGRlcHRoKyspIHtcbiAgICBpZiAocGlkIDw9IDEpIGJyZWFrO1xuXG4gICAgaWYgKGlzQ2xhdWRlKHBpZCkpIHtcbiAgICAgIHJlc3VsdHMucHVzaChwaWQpO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcmVudFBpZCA9IGdldFBhcmVudFBpZChwaWQpO1xuICAgIGlmIChwYXJlbnRQaWQgPT09IG51bGwpIGJyZWFrO1xuICAgIHBpZCA9IHBhcmVudFBpZDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuIiwgIi8qKlxuICogRXJyb3IgY2xhc3NlcyBmb3IgdGhlIENhcmRzIFYyIFNESy5cbiAqXG4gKiBUaGVzZSBlcnJvcnMgbm9ybWFsaXplIHNlcnZlciByZXNwb25zZXMgYW5kIG5ldHdvcmsgZmFpbHVyZXMgc28gY2FsbGVycyBjYW5cbiAqIGRpc3Rpbmd1aXNoIEFQSSB2YWxpZGF0aW9uIHByb2JsZW1zIGZyb20gdHJhbnNwb3J0IGlzc3Vlcy5cbiAqXG4gKlxuICogQHN1bW1hcnkgRXJyb3IgY2xhc3NlcyBmb3IgdGhlIENhcmRzIFYyIFNES1xuICogQG1vZHVsZSB0eXBlcy9lcnJvcnNcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEZpZWxkRXJyb3IgfSBmcm9tICcuLi8uLi9wcm90b2NvbC9pbmRleC5qcyc7XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gYW4gQVBJIHJlcXVlc3QgZmFpbHMgd2l0aCBhbiBlcnJvciByZXNwb25zZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdHJ5IHtcbiAqICAgYXdhaXQgY2xpZW50LmNyZWF0ZUNhcmQoZGF0YSk7XG4gKiB9IGNhdGNoIChlcnJvcikge1xuICogICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcGlFcnJvcikge1xuICogICAgIGNvbnNvbGUuZXJyb3IoYEFQSSBlcnJvciBbJHtlcnJvci5jb2RlfV06ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAqICAgICBpZiAoZXJyb3IuZmllbGRzKSB7XG4gKiAgICAgICBlcnJvci5maWVsZHMuZm9yRWFjaChmID0+IGNvbnNvbGUuZXJyb3IoYCAgJHtmLmZpZWxkfTogJHtmLm1lc3NhZ2V9YCkpO1xuICogICAgIH1cbiAqICAgfVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBBcGlFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgQXBpRXJyb3IgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZXJyb3IgbWVzc2FnZVxuICAgKiBAcGFyYW0gY29kZSAtIE1hY2hpbmUtcmVhZGFibGUgZXJyb3IgY29kZVxuICAgKiBAcGFyYW0gZmllbGRzIC0gT3B0aW9uYWwgYXJyYXkgb2YgZmllbGQtc3BlY2lmaWMgdmFsaWRhdGlvbiBlcnJvcnNcbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgY29kZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBmaWVsZHM/OiBGaWVsZEVycm9yW11cbiAgKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gJ0FwaUVycm9yJztcbiAgfVxufVxuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIGEgbmV0d29yayByZXF1ZXN0IGZhaWxzIGR1ZSB0byBjb25uZWN0aXZpdHkgaXNzdWVzLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB0cnkge1xuICogICBhd2FpdCBjbGllbnQubGlzdENhcmRzKCk7XG4gKiB9IGNhdGNoIChlcnJvcikge1xuICogICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBOZXR3b3JrRXJyb3IpIHtcbiAqICAgICBjb25zb2xlLmVycm9yKGBOZXR3b3JrIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gKiAgICAgaWYgKGVycm9yLmNhdXNlKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKGBDYXVzZWQgYnk6ICR7ZXJyb3IuY2F1c2UubWVzc2FnZX1gKTtcbiAqICAgICB9XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgTmV0d29ya0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBOZXR3b3JrRXJyb3IgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZXJyb3IgbWVzc2FnZVxuICAgKiBAcGFyYW0gY2F1c2UgLSBPcHRpb25hbCB1bmRlcmx5aW5nIGVycm9yIHRoYXQgY2F1c2VkIHRoaXMgbmV0d29yayBmYWlsdXJlXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGNhdXNlPzogRXJyb3JcbiAgKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gJ05ldHdvcmtFcnJvcic7XG4gIH1cbn1cbiIsICIvKipcbiAqIEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUEkuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUElcbiAqIEBtb2R1bGUgc2RrL0NhcmRzQ2xpZW50XG4gKi9cblxuaW1wb3J0IHR5cGUgeyBDYXJkLCBIdHRwQ2xpZW50LCBTdHJlYW1NZXRhLCBUaW1lbGluZUl0ZW0gfSBmcm9tICcuLi9wcm90b2NvbC9pbmRleC5qcyc7XG5pbXBvcnQgdHlwZSB7XG4gIEFkZEJyYW5jaFJlcXVlc3QsXG4gIEF0dGFjaG1lbnRSZXNwb25zZSxcbiAgQnJhbmNoZXNSZXNwb25zZSxcbiAgQ2FyZENyZWF0ZURhdGEsXG4gIENhcmRzQ2xpZW50T3B0aW9ucyxcbiAgQ2FyZFVwZGF0ZURhdGEsXG4gIENvbW1lbnQsXG4gIENvbW1lbnRDcmVhdGVEYXRhLFxuICBDb21tZW50VXBkYXRlRGF0YSxcbiAgQ29tbWl0SW5mbyxcbiAgR2F0ZUFwcHJvdmFsUmVzcG9uc2UsXG4gIExpc3RDYXJkc09wdGlvbnMsXG4gIFN0cmVhbVJlc3VsdCxcbiAgU3RyZWFtV3JpdGVyLFxuICBTdHJlYW1Xcml0ZXJPcHRpb25zLFxuICBUaW1lbGluZU9wdGlvbnMsXG4gIFR5cGVTY2hlbWFzUmVzcG9uc2Vcbn0gZnJvbSAnLi90eXBlcy9jbGllbnQuanMnO1xuaW1wb3J0IHsgQXBpRXJyb3IsIE5ldHdvcmtFcnJvciB9IGZyb20gJy4vdHlwZXMvZXJyb3JzLmpzJztcblxuLyoqIEluaXRpYWwgcmVxdWVzdCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyAoMSBzZWNvbmQgZm9yIGZhc3QgZmFpbHVyZSBkZXRlY3Rpb24pLiAqL1xuY29uc3QgSU5JVElBTF9USU1FT1VUX01TID0gMV8wMDA7XG5cbi8qKiBNYXhpbXVtIHJlcXVlc3QgdGltZW91dCBpbiBtaWxsaXNlY29uZHMgYWZ0ZXIgZXhwb25lbnRpYWwgYmFja29mZi4gKi9cbmNvbnN0IE1BWF9USU1FT1VUX01TID0gMTBfMDAwO1xuXG4vKipcbiAqIFR5cGUtc2FmZSBIVFRQIGNsaWVudCBmb3IgdGhlIENhcmRzIFYyIFJFU1QgQVBJLlxuICpcbiAqIFVzZXMgdGhlIEZldGNoIEFQSSBieSBkZWZhdWx0IGFuZCBzdXBwb3J0cyBkZXBlbmRlbmN5IGluamVjdGlvbiBvZiBhblxuICogYWx0ZXJuYXRlIHtAbGluayBIdHRwQ2xpZW50fSBmb3IgdGVzdHMgb3IgY3VzdG9tIHRyYW5zcG9ydHMuIEFsbCBwdWJsaWNcbiAqIG1ldGhvZHMgc3VyZmFjZSBzZXJ2ZXIgZmFpbHVyZXMgYXMge0BsaW5rIEFwaUVycm9yfSBhbmQgdHJhbnNwb3J0IGZhaWx1cmVzXG4gKiBhcyB7QGxpbmsgTmV0d29ya0Vycm9yfS5cbiAqXG4gKiBUaGUgZGVmYXVsdCBIVFRQIGNsaWVudCBhcHBsaWVzIGFuIGV4cG9uZW50aWFsIGJhY2tvZmYgdGltZW91dCB0byBmZXRjaFxuICogcmVxdWVzdHM6IHN0YXJ0aW5nIGF0IDEgc2Vjb25kLCBkb3VibGluZyBvbiBlYWNoIGNvbnNlY3V0aXZlIGZhaWx1cmUgdXBcbiAqIHRvIGEgMTAtc2Vjb25kIGNhcCwgYW5kIHJlc2V0dGluZyBvbiBhbnkgc3VjY2Vzc2Z1bCByZXNwb25zZS4gVGhpcyBlbnN1cmVzXG4gKiBmYXN0IGZhaWx1cmUgZGV0ZWN0aW9uIHdoZW4gdGhlIHNlcnZlciBpcyBkb3duIHdoaWxlIGFsbG93aW5nIHNsb3dlclxuICogcmVzcG9uc2VzIGR1cmluZyByZWNvdmVyeS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2xpZW50ID0gbmV3IENhcmRzQ2xpZW50KHsgYmFzZVVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsIGFjY2Vzc1Rva2VuOiAndG9rZW4nIH0pO1xuICpcbiAqIGNvbnN0IGNhcmRzID0gYXdhaXQgY2xpZW50Lmxpc3RDYXJkcyh7IHN0YXR1czogJ2luX3Byb2dyZXNzJyB9KTtcbiAqIGF3YWl0IGNsaWVudC51cGRhdGVDYXJkKGNhcmRJZCwgeyBzdGF0dXM6ICdkb25lJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgQ2FyZHNDbGllbnQge1xuICBwcml2YXRlIHJlYWRvbmx5IF9odHRwQ2xpZW50PzogSHR0cENsaWVudDtcblxuICAvKiogQ3VycmVudCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcywgaW5jcmVhc2VzIHdpdGggY29uc2VjdXRpdmUgZmFpbHVyZXMuICovXG4gIHByaXZhdGUgX2N1cnJlbnRUaW1lb3V0TXMgPSBJTklUSUFMX1RJTUVPVVRfTVM7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgQ2FyZHNDbGllbnQgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGluY2x1ZGluZyBiYXNlIFVSTCBhbmQgYXV0aCB0b2tlbi5cbiAgICogQHBhcmFtIGh0dHBDbGllbnQgLSBPcHRpb25hbCBIVFRQIGNsaWVudCBmb3IgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IENhcmRzQ2xpZW50T3B0aW9ucyxcbiAgICBodHRwQ2xpZW50PzogSHR0cENsaWVudFxuICApIHtcbiAgICB0aGlzLl9odHRwQ2xpZW50ID0gaHR0cENsaWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBiYXNlIFVSTCB1c2VkIHRvIGJ1aWxkIEFQSSByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgVGhlIGJhc2UgVVJMIHN0cmluZyBhcyBwcm92aWRlZCBpbiB7QGxpbmsgQ2FyZHNDbGllbnRPcHRpb25zfS5cbiAgICovXG4gIGdldEJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmJhc2VVcmw7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIGFuIEhUVFAgY2xpZW50IHdhcyBpbmplY3RlZC5cbiAgICpcbiAgICogQHJldHVybnMgVHJ1ZSBpZiBhbiBIVFRQIGNsaWVudCB3YXMgcHJvdmlkZWQgZHVyaW5nIGNvbnN0cnVjdGlvbi5cbiAgICogQGludGVybmFsIFVzZWQgZm9yIHRlc3RpbmcgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gICAqL1xuICBoYXNIdHRwQ2xpZW50KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9odHRwQ2xpZW50ICE9PSB1bmRlZmluZWQ7XG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gQWJvcnRTaWduYWwgdGhhdCBmaXJlcyBhZnRlciB0aGUgY3VycmVudCBiYWNrb2ZmIHRpbWVvdXQuXG4gICAqIFVzZXMgY2FsbGVyJ3Mgc2lnbmFsIGlmIHByb3ZpZGVkIChmb3IgREkvdGVzdGluZyksIG90aGVyd2lzZSBhcHBsaWVzIHRoZSBiYWNrb2ZmIHRpbWVvdXQuXG4gICAqXG4gICAqIEBwYXJhbSBleGlzdGluZ1NpZ25hbCAtIE9wdGlvbmFsIGNhbGxlci1wcm92aWRlZCBzaWduYWwgdG8gcmV1c2UgaW5zdGVhZCBvZiBjcmVhdGluZyBhIHRpbWVvdXQgc2lnbmFsLlxuICAgKiBAcmV0dXJucyBBYm9ydFNpZ25hbCB0aGF0IGNvbnRyb2xzIHJlcXVlc3QgY2FuY2VsbGF0aW9uIGZvciB0aGUgY3VycmVudCBvcGVyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGdldFRpbWVvdXRTaWduYWwoZXhpc3RpbmdTaWduYWw/OiBBYm9ydFNpZ25hbCB8IG51bGwpOiBBYm9ydFNpZ25hbCB7XG4gICAgaWYgKGV4aXN0aW5nU2lnbmFsKSByZXR1cm4gZXhpc3RpbmdTaWduYWw7XG4gICAgcmV0dXJuIEFib3J0U2lnbmFsLnRpbWVvdXQodGhpcy5fY3VycmVudFRpbWVvdXRNcyk7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkcyBhIHN1Y2Nlc3NmdWwgcmVxdWVzdCBhbmQgcmVzZXRzIHRoZSB0aW1lb3V0IGJhY2tvZmYuXG4gICAqL1xuICBwcml2YXRlIG9uUmVxdWVzdFN1Y2Nlc3MoKTogdm9pZCB7XG4gICAgdGhpcy5fY3VycmVudFRpbWVvdXRNcyA9IElOSVRJQUxfVElNRU9VVF9NUztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmRzIGEgZmFpbGVkIHJlcXVlc3QgYW5kIGluY3JlYXNlcyB0aGUgdGltZW91dCB2aWEgZXhwb25lbnRpYWwgYmFja29mZi5cbiAgICovXG4gIHByaXZhdGUgb25SZXF1ZXN0RmFpbHVyZSgpOiB2b2lkIHtcbiAgICB0aGlzLl9jdXJyZW50VGltZW91dE1zID0gTWF0aC5taW4odGhpcy5fY3VycmVudFRpbWVvdXRNcyAqIDIsIE1BWF9USU1FT1VUX01TKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWZhdWx0IEhUVFAgY2xpZW50IGltcGxlbWVudGF0aW9uIHVzaW5nIGZldGNoICsgSlNPTiBwYXlsb2Fkcy5cbiAgICpcbiAgICogRWFjaCBmZXRjaCBjYWxsIGluY2x1ZGVzIGFuIEFib3J0U2lnbmFsLnRpbWVvdXQgdGhhdCBzdGFydHMgYXQgMSBzZWNvbmRcbiAgICogYW5kIGRvdWJsZXMgb24gY29uc2VjdXRpdmUgZmFpbHVyZXMgdXAgdG8gMTAgc2Vjb25kcy5cbiAgICovXG4gIHByaXZhdGUgZGVmYXVsdEh0dHBDbGllbnQ6IEh0dHBDbGllbnQgPSB7XG4gICAgZ2V0OiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgcG9zdDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBib2R5OiB1bmtub3duLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHB1dDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBib2R5OiB1bmtub3duLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgYm9keTogYm9keSA/IEpTT04uc3RyaW5naWZ5KGJvZHkpIDogdW5kZWZpbmVkLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgcGF0Y2g6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQQVRDSCcsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgYm9keTogYm9keSA/IEpTT04uc3RyaW5naWZ5KGJvZHkpIDogdW5kZWZpbmVkLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgZGVsZXRlOiBhc3luYyAodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogR2V0cyBIVFRQIGhlYWRlcnMgZm9yIEpTT04gQVBJIHJlcXVlc3RzLlxuICAgKlxuICAgKiBAcmV0dXJucyBIZWFkZXJzIHdpdGggSlNPTiBjb250ZW50IHR5cGUgYW5kIG9wdGlvbmFsIGJlYXJlciB0b2tlbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0SGVhZGVycygpOiBIZWFkZXJzSW5pdCB7XG4gICAgY29uc3QgaGVhZGVyczogSGVhZGVyc0luaXQgPSB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VuKSB7XG4gICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VufWA7XG4gICAgfVxuICAgIHJldHVybiBoZWFkZXJzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIEhUVFAgY2xpZW50IHRvIHVzZSBmb3IgcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIEluamVjdGVkIEhUVFAgY2xpZW50IHdoZW4gcHJvdmlkZWQsIG90aGVyd2lzZSB0aGUgZGVmYXVsdCBmZXRjaC1iYXNlZCBjbGllbnQuXG4gICAqL1xuICBwcml2YXRlIGdldEh0dHBDbGllbnQoKTogSHR0cENsaWVudCB7XG4gICAgcmV0dXJuIHRoaXMuX2h0dHBDbGllbnQgPz8gdGhpcy5kZWZhdWx0SHR0cENsaWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBCdWlsZHMgYSBVUkwgcmVsYXRpdmUgdG8gdGhlIGNvbmZpZ3VyZWQgYmFzZSBVUkwuXG4gICAqXG4gICAqIFVuZGVmaW5lZCBhbmQgbnVsbCBxdWVyeSBwYXJhbXMgYXJlIG9taXR0ZWQuIFZhbHVlcyBhcmUgc3RyaW5naWZpZWQuXG4gICAqXG4gICAqIEBwYXJhbSBwYXRoIC0gUmVsYXRpdmUgQVBJIHBhdGggdG8gYXBwZW5kIHRvIHRoZSBjb25maWd1cmVkIGJhc2UgVVJMLlxuICAgKiBAcGFyYW0gcGFyYW1zIC0gT3B0aW9uYWwgcXVlcnkgcGFyYW1ldGVycyB0byBlbmNvZGUgb250byB0aGUgVVJMLlxuICAgKiBAcmV0dXJucyBGdWxseS1xdWFsaWZpZWQgcmVxdWVzdCBVUkwgc3RyaW5nLlxuICAgKi9cbiAgcHJpdmF0ZSBidWlsZFVybChwYXRoOiBzdHJpbmcsIHBhcmFtcz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogc3RyaW5nIHtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHBhdGgsIHRoaXMub3B0aW9ucy5iYXNlVXJsKTtcbiAgICBpZiAocGFyYW1zKSB7XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhwYXJhbXMpKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoa2V5LCBTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdXJsLnRvU3RyaW5nKCk7XG4gIH1cblxuICAvKipcbiAgICogV3JhcHMgYSByZXF1ZXN0IHdpdGggY29uc2lzdGVudCBlcnJvciBoYW5kbGluZy5cbiAgICpcbiAgICogQHBhcmFtIGZuIC0gQXN5bmMgcmVxdWVzdCBmdW5jdGlvbiB0byBleGVjdXRlLlxuICAgKiBAcmV0dXJucyBUaGUgcmVzb2x2ZWQgdmFsdWUgZnJvbSB0aGUgcmVxdWVzdCBmdW5jdGlvbi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhIG5vbi0yeHggc3RhdHVzLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciBmb3IgbmV0d29yayBmYWlsdXJlcyBvciB1bmV4cGVjdGVkIGV4Y2VwdGlvbnMuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHJlcXVlc3Q8VD4oZm46ICgpID0+IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZm4oKTtcbiAgICAgIHRoaXMub25SZXF1ZXN0U3VjY2VzcygpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgUmVzcG9uc2UpIHtcbiAgICAgICAgLy8gU2VydmVyIHJlc3BvbmRlZCAoZXZlbiB3aXRoIGFuIGVycm9yIHN0YXR1cykgLSBjb25uZWN0aW9uIGlzIGFsaXZlLCByZXNldCBiYWNrb2ZmXG4gICAgICAgIHRoaXMub25SZXF1ZXN0U3VjY2VzcygpO1xuICAgICAgICBsZXQgYm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBib2R5ID0gYXdhaXQgZXJyb3IuanNvbigpO1xuICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yKSB7XG4gICAgICAgICAgLy8gU3ludGF4RXJyb3IgaXMgZXhwZWN0ZWQgd2hlbiBzZXJ2ZXIgcmV0dXJucyBub24tSlNPTiBlcnJvciByZXNwb25zZSAoZS5nLiwgSFRNTCBlcnJvciBwYWdlKVxuICAgICAgICAgIGlmICghKHBhcnNlRXJyb3IgaW5zdGFuY2VvZiBTeW50YXhFcnJvcikpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignW0NhcmRzQ2xpZW50XSBVbmV4cGVjdGVkIGVycm9yIHBhcnNpbmcgZXJyb3IgcmVzcG9uc2U6JywgcGFyc2VFcnJvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSAoYm9keVsnZXJyb3InXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IChib2R5WydtZXNzYWdlJ10gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCBlcnJvci5zdGF0dXNUZXh0O1xuICAgICAgICBjb25zdCBjb2RlID0gKGJvZHlbJ2NvZGUnXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IFN0cmluZyhlcnJvci5zdGF0dXMpO1xuICAgICAgICBjb25zdCBmaWVsZHMgPSBib2R5WydmaWVsZHMnXSBhcyBBcnJheTx7IGZpZWxkOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZyB9PiB8IHVuZGVmaW5lZDtcbiAgICAgICAgdGhyb3cgbmV3IEFwaUVycm9yKG1lc3NhZ2UsIGNvZGUsIGZpZWxkcyk7XG4gICAgICB9XG4gICAgICAvLyBOZXR3b3JrIG9yIHRpbWVvdXQgZmFpbHVyZSAtIGluY3JlYXNlIGJhY2tvZmYgZm9yIG5leHQgYXR0ZW1wdFxuICAgICAgdGhpcy5vblJlcXVlc3RGYWlsdXJlKCk7XG4gICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyb3IubmFtZSA9PT0gJ1RpbWVvdXRFcnJvcicpIHtcbiAgICAgICAgdGhyb3cgbmV3IE5ldHdvcmtFcnJvcignUmVxdWVzdCB0aW1lZCBvdXQnLCBlcnJvcik7XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgTmV0d29ya0Vycm9yKCdSZXF1ZXN0IGZhaWxlZCcsIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IHVuZGVmaW5lZCk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tIENhcmQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogTGlzdHMgY2FyZHMgd2l0aCBvcHRpb25hbCBmaWx0ZXJpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgZmlsdGVyIGFuZCBwYWdpbmF0aW9uIG9wdGlvbnMuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIG1hdGNoaW5nIGNhcmRzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0Q2FyZHMob3B0aW9ucz86IExpc3RDYXJkc09wdGlvbnMpOiBQcm9taXNlPENhcmRbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcycsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoLFxuICAgICAgc3RhdHVzOiBvcHRpb25zPy5zdGF0dXMsXG4gICAgICB0YWc6IG9wdGlvbnM/LnRhZyxcbiAgICAgIHNlYXJjaDogb3B0aW9ucz8uc2VhcmNoLFxuICAgICAgbGltaXQ6IG9wdGlvbnM/LmxpbWl0LFxuICAgICAgb2Zmc2V0OiBvcHRpb25zPy5vZmZzZXRcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDYXJkW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYSBzaW5nbGUgY2FyZCBieSBpZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENhcmQoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q2FyZD4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gZGF0YSAtIENhcmQgY3JlYXRpb24gcGF5bG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNyZWF0ZWQgY2FyZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgcGF5bG9hZC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgY3JlYXRlQ2FyZChkYXRhOiBDYXJkQ3JlYXRlRGF0YSk6IFByb21pc2U8Q2FyZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcycpO1xuICAgIGNvbnN0IGJvZHkgPSB7XG4gICAgICAuLi5kYXRhLFxuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDYXJkPih1cmwsIGJvZHkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIGFuIGV4aXN0aW5nIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgaWQgb2YgdGhlIGNhcmQgdG8gdXBkYXRlLlxuICAgKiBAcGFyYW0gZGF0YSAtIFRoZSBmaWVsZHMgdG8gdXBkYXRlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgdXBkYXRlZCBjYXJkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZUNhcmQoY2FyZElkOiBzdHJpbmcsIGRhdGE6IENhcmRVcGRhdGVEYXRhKTogUHJvbWlzZTxDYXJkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucGF0Y2g8Q2FyZD4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlcyBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgaWQgb2YgdGhlIGNhcmQgdG8gZGVsZXRlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIGRlbGV0aW9uIGlzIGNvbXBsZXRlLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBkZWxldGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGRlbGV0ZUNhcmQoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cblxuICAvLyAtLS0gQ29tbWVudCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBjb21tZW50cyBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgdGFyZ2V0IGNhcmQgZm9yIHRoaXMgcmVxdWVzdC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNvbW1lbnQgbGlzdC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tbWVudHMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPENvbW1lbnRbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21tZW50W10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYSBzaW5nbGUgY29tbWVudCBieSBpZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSByZXF1ZXN0ZWQgY29tbWVudC5cbiAgICogQHBhcmFtIGNvbW1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNvbW1lbnQgdG8gcmV0cmlldmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21tZW50KGNhcmRJZDogc3RyaW5nLCBjb21tZW50SWQ6IHN0cmluZyk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHMvJHtjb21tZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q29tbWVudD4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBjb21tZW50IG9uIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCB3aWxsIHJlY2VpdmUgdGhlIG5ldyBjb21tZW50LlxuICAgKiBAcGFyYW0gZGF0YSAtIENvbW1lbnQgY3JlYXRpb24gcGF5bG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNyZWF0ZWQgY29tbWVudC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgcGF5bG9hZC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgY3JlYXRlQ29tbWVudChjYXJkSWQ6IHN0cmluZywgZGF0YTogQ29tbWVudENyZWF0ZURhdGEpOiBQcm9taXNlPENvbW1lbnQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENvbW1lbnQ+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgYW4gZXhpc3RpbmcgY29tbWVudC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byB1cGRhdGUuXG4gICAqIEBwYXJhbSBkYXRhIC0gQ29tbWVudCB1cGRhdGUgcGF5bG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHVwZGF0ZWQgY29tbWVudC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyB1cGRhdGVDb21tZW50KGNhcmRJZDogc3RyaW5nLCBjb21tZW50SWQ6IHN0cmluZywgZGF0YTogQ29tbWVudFVwZGF0ZURhdGEpOiBQcm9taXNlPENvbW1lbnQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucGF0Y2g8Q29tbWVudD4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlcyBhIGNvbW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgY29tbWVudC5cbiAgICogQHBhcmFtIGNvbW1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNvbW1lbnQgdG8gcmVtb3ZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIGRlbGV0aW9uIGlzIGNvbXBsZXRlLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBkZWxldGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGRlbGV0ZUNvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50cy8ke2NvbW1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBBdHRhY2htZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIFVwbG9hZHMgYW4gYXR0YWNobWVudCB0byBhIGNhcmQgdXNpbmcgYmluYXJ5IFBVVC5cbiAgICpcbiAgICogVGhpcyBpcyB0aGUgcHJlZmVycmVkIG1ldGhvZCAtIHNlbmRzIHJhdyBiaW5hcnkgZGF0YSBkaXJlY3RseSB3aXRob3V0XG4gICAqIGJhc2U2NCBlbmNvZGluZywgcmVzdWx0aW5nIGluIDMzJSBzbWFsbGVyIHBheWxvYWRzLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IHdpbGwgcmVjZWl2ZSB0aGUgYXR0YWNobWVudC5cbiAgICogQHBhcmFtIG5hbWUgLSBGaWxlIG5hbWUgaW5jbHVkaW5nIGV4dGVuc2lvbi5cbiAgICogQHBhcmFtIGRhdGEgLSBCaW5hcnkgZGF0YSBhcyBCbG9iLCBBcnJheUJ1ZmZlciwgb3IgYmFzZTY0IHN0cmluZy5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYXR0YWNobWVudCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyB1cGxvYWRBdHRhY2htZW50KGNhcmRJZDogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIGRhdGE6IEJsb2IgfCBBcnJheUJ1ZmZlciB8IHN0cmluZyk6IFByb21pc2U8QXR0YWNobWVudFJlc3BvbnNlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50cy8ke2VuY29kZVVSSUNvbXBvbmVudChuYW1lKX1gKTtcblxuICAgIC8vIENvbnZlcnQgZGF0YSB0byBCbG9iIGZvciBmZXRjaCBib2R5XG4gICAgbGV0IGJvZHk6IEJsb2I7XG4gICAgaWYgKGRhdGEgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICBib2R5ID0gZGF0YTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgYm9keSA9IG5ldyBCbG9iKFtkYXRhXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGJhc2U2NCBzdHJpbmcgLSBkZWNvZGUgdG8gYmluYXJ5XG4gICAgICBjb25zdCBiaW5hcnlTdHJpbmcgPSBhdG9iKGRhdGEpO1xuICAgICAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShiaW5hcnlTdHJpbmcubGVuZ3RoKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYmluYXJ5U3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJ5dGVzW2ldID0gYmluYXJ5U3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgICB9XG4gICAgICBib2R5ID0gbmV3IEJsb2IoW2J5dGVzXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4udGhpcy5nZXRIZWFkZXJzKCksXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHksXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8QXR0YWNobWVudFJlc3BvbnNlPjtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEb3dubG9hZHMgYW4gYXR0YWNobWVudCBhcyBhIEJsb2IuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHVzZXMgYGZldGNoYCBkaXJlY3RseSBzbyBiaW5hcnkgZGF0YSBpcyBwcmVzZXJ2ZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgYXR0YWNobWVudC5cbiAgICogQHBhcmFtIGF0dGFjaG1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGF0dGFjaG1lbnQgYmxvYiB0byBkb3dubG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYW4gYXR0YWNobWVudCBCbG9iLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRBdHRhY2htZW50KGNhcmRJZDogc3RyaW5nLCBhdHRhY2htZW50SWQ6IHN0cmluZyk6IFByb21pc2U8QmxvYj4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYXR0YWNobWVudHMvJHthdHRhY2htZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBoZWFkZXJzOiB0aGlzLmdldEhlYWRlcnMoKSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5ibG9iKCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTGlzdHMgYXR0YWNobWVudHMgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgYXR0YWNobWVudHMgc2hvdWxkIGJlIGxpc3RlZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYXR0YWNobWVudCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdEF0dGFjaG1lbnRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2VbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYXR0YWNobWVudHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxBdHRhY2htZW50UmVzcG9uc2VbXT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gVGltZWxpbmUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyB0aW1lbGluZSBlbnRyaWVzIGZvciBhIGNhcmQgd2l0aCBvcHRpb25hbCBwYWdpbmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSB0aW1lbGluZSBlbnRyaWVzIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBwYWdpbmF0aW9uIGNvbnRyb2xzLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aW1lbGluZSBlbnRyaWVzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUaW1lbGluZShjYXJkSWQ6IHN0cmluZywgb3B0aW9ucz86IFRpbWVsaW5lT3B0aW9ucyk6IFByb21pc2U8VGltZWxpbmVJdGVtW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3RpbWVsaW5lYCwge1xuICAgICAgYmVmb3JlOiBvcHRpb25zPy5iZWZvcmUsXG4gICAgICBsaW1pdDogb3B0aW9ucz8ubGltaXRcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxUaW1lbGluZUl0ZW1bXT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gUGxhbiBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBwbGFuIGRvY3VtZW50IGZvciBhIGNhcmQgYXMgbWFya2Rvd24uXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHBsYW4gbWFya2Rvd24gc2hvdWxkIGJlIHJldHVybmVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBwbGFuIG1hcmtkb3duLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRQbGFuKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3BsYW5gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxzdHJpbmc+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHBsYW4gZG9jdW1lbnQgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgcGxhbiBtYXJrZG93biBzaG91bGQgYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIGNvbnRlbnQgLSBQbGFuIG1hcmtkb3duIGNvbnRlbnQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIHBsYW4gaXMgc2F2ZWQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlUGxhbihjYXJkSWQ6IHN0cmluZywgY29udGVudDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9wbGFuYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wdXQ8dm9pZD4odXJsLCBjb250ZW50KSk7XG4gIH1cblxuICAvLyAtLS0gR2F0ZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBBcHByb3ZlcyBhIGdhdGUgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgZ2F0ZSBzdGF0ZSBzaG91bGQgYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIGdhdGVOYW1lIC0gR2F0ZSBuYW1lIHRvIGFwcHJvdmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGdhdGUgYXBwcm92YWwgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGFwcHJvdmFsLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBhcHByb3ZlR2F0ZShjYXJkSWQ6IHN0cmluZywgZ2F0ZU5hbWU6ICdwbGFuJyB8ICdyZXZpZXcnKTogUHJvbWlzZTxHYXRlQXBwcm92YWxSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vZ2F0ZXMvJHtnYXRlTmFtZX0vYXBwcm92ZWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxHYXRlQXBwcm92YWxSZXNwb25zZT4odXJsLCB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21taXQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgY29tbWl0cyBhc3NvY2lhdGVkIHdpdGggYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBjb21taXRzIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gY29tbWl0IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21taXRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21taXRJbmZvW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21taXRJbmZvW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBjb21taXQgdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBhc3NvY2lhdGUgd2l0aCB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjb21taXQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgYWRkQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZyk6IFByb21pc2U8Q29tbWl0SW5mbz4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21taXRJbmZvPih1cmwsIHsgc2hhIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY29tbWl0IGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBkZXRhY2ggZnJvbSB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHJlbW92YWwgaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgcmVtb3ZlQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0cy8ke3NoYX1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBCcmFuY2ggT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYnJhbmNoZXMgdHJhY2tlZCBvbiBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBVbmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBicmFuY2hlcyB0byByZXRyaWV2ZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gb3B0aW9ucy53b3Jrc3BhY2VQYXRoIC0gV29ya3NwYWNlIHBhdGggZm9yIGNvbXB1dGluZyBpc01lcmdlZCBhbmQgY29tbWl0IGNvbnRhaW5tZW50LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBicmFuY2hlcyByZXNwb25zZS5cbiAgICovXG4gIGFzeW5jIGdldEJyYW5jaGVzKGNhcmRJZDogc3RyaW5nLCBvcHRpb25zPzogeyB3b3Jrc3BhY2VQYXRoPzogc3RyaW5nIH0pOiBQcm9taXNlPEJyYW5jaGVzUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzYCwge1xuICAgICAgd29ya3NwYWNlUGF0aDogb3B0aW9ucz8ud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEJyYW5jaGVzUmVzcG9uc2U+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBicmFuY2ggdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gYWRkIHRoZSBicmFuY2ggdG8uXG4gICAqIEBwYXJhbSBkYXRhIC0gQnJhbmNoIGRhdGEgaW5jbHVkaW5nIG5hbWUgYW5kIG9wdGlvbmFsIHdvcmt0cmVlIHBhdGguXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGJyYW5jaCBpcyBhZGRlZC5cbiAgICovXG4gIGFzeW5jIGFkZEJyYW5jaChjYXJkSWQ6IHN0cmluZywgZGF0YTogQWRkQnJhbmNoUmVxdWVzdCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYnJhbmNoZXNgKTtcbiAgICBhd2FpdCB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDx1bmtub3duPih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgYnJhbmNoIGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gcmVtb3ZlIHRoZSBicmFuY2ggZnJvbS5cbiAgICogQHBhcmFtIG5hbWUgLSBCcmFuY2ggbmFtZSB0byByZW1vdmUgKHdpbGwgYmUgVVJMLWVuY29kZWQpLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBicmFuY2ggaXMgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHJlbW92ZUJyYW5jaChjYXJkSWQ6IHN0cmluZywgbmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9icmFuY2hlcy8ke2VuY29kZVVSSUNvbXBvbmVudChuYW1lKX1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBUYWcgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYXZhaWxhYmxlIHRhZ3MuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRhZyBzdHJpbmdzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUYWdzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvdGFncycsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8c3RyaW5nW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEVudmlyb25tZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEZldGNoZXMgYXZhaWxhYmxlIGFnZW50IGVudmlyb25tZW50cy5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gZW52aXJvbm1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldEVudmlyb25tZW50cygpOiBQcm9taXNlPEFycmF5PHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbj86IHN0cmluZyB9Pj4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9lbnZpcm9ubWVudHMnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxBcnJheTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmcgfT4+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFR5cGVkIEZpbGUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogU3VibWl0cyBhbiBhZGFwdGl2ZSBjYXJkIGFjdGlvbiBieSB3cml0aW5nIGFuIGBhZGFwdGl2ZS1jYXJkLXN1Ym1pc3Npb25gIHR5cGVkIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgY2FyZCBjb250YWluaW5nIHRoZSBhZGFwdGl2ZSBjYXJkLlxuICAgKiBAcGFyYW0gYWN0aW9uSWQgLSBUaGUgYWN0aW9uIElEIGZyb20gdGhlIGFkYXB0aXZlIGNhcmQgc3VibWl0IGFjdGlvbi5cbiAgICogQHBhcmFtIGRhdGEgLSBUaGUgZm9ybSBkYXRhIGNvbGxlY3RlZCBieSB0aGUgYWRhcHRpdmUgY2FyZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgc3VibWlzc2lvbiBpcyBwZXJzaXN0ZWQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHN1Ym1pc3Npb24gKGUuZy4gdmFsaWRhdGlvbiBmYWlsdXJlKS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgc3VibWl0Q2FyZEFjdGlvbihjYXJkSWQ6IHN0cmluZywgYWN0aW9uSWQ6IHN0cmluZywgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmaWxlTmFtZSA9IGAke2FjdGlvbklkfS0ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYWRhcHRpdmUtY2FyZC1zdWJtaXNzaW9uLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVOYW1lKX1gKTtcbiAgICBjb25zdCBib2R5ID0geyBjYXJkSWQsIGFjdGlvbklkLCBkYXRhIH07XG4gICAgYXdhaXQgdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnB1dDx1bmtub3duPih1cmwsIGJvZHkpKTtcbiAgfVxuXG4gIC8vIC0tLSBUeXBlIFNjaGVtYSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHR5cGUgc2NoZW1hcyBhbmQgZGVzY3JpcHRpb25zIGZvciBhIGNhcmQncyBlbnZpcm9ubWVudC5cbiAgICpcbiAgICogUmV0dXJucyBtZXRhZGF0YSBhYm91dCBlYWNoIHJlZ2lzdGVyZWQgdHlwZSBpbiB0aGUgY2FyZCdzIGVudmlyb25tZW50LFxuICAgKiBpbmNsdWRpbmcgdmVyc2lvbiwgc2NoZW1hLCBhbmQgZGVzY3JpcHRpb24uIENvbW1hbmQgZGV0YWlscyBhcmUgZXhjbHVkZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHR5cGUgc2NoZW1hIG1ldGFkYXRhIHNob3VsZCBiZSBmZXRjaGVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0eXBlIHNjaGVtYSBpbmZvcm1hdGlvbi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0VHlwZVNjaGVtYXMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPFR5cGVTY2hlbWFzUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3NjaGVtYWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFR5cGVTY2hlbWFzUmVzcG9uc2U+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFN0cmVhbSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBMaXN0cyBhbGwgc3RyZWFtcyBhdHRhY2hlZCB0byBhIGNhcmQsIHNvcnRlZCBieSBjcmVhdGlvbiB0aW1lLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBxdWVyeS5cbiAgICogQHJldHVybnMgU3RyZWFtIG1ldGFkYXRhIGFycmF5IChtYXkgYmUgZW1wdHkpLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yIChlLmcuLCA0MDQgZm9yIHVua25vd24gY2FyZCkuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RTdHJlYW1zKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxTdHJlYW1NZXRhW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxTdHJlYW1NZXRhW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBhIHN0cmVhbSdzIG1ldGFkYXRhIGFuZCBhbGwgcmF3IGxpbmVzLlxuICAgKlxuICAgKiBUaGUgYGZpbGVuYW1lYCBpcyBVUkktZW5jb2RlZCBhdXRvbWF0aWNhbGx5LiBGb3IgY29tcGxldGVkIHN0cmVhbXMgdGhlXG4gICAqIHJldHVybmVkIGBsaW5lc2AgYXJyYXkgaXMgdGhlIGZ1bGwgY29udGVudDsgZm9yIGFjdGl2ZSBzdHJlYW1zIGl0IGlzIGFcbiAgICogc25hcHNob3QgdGhhdCBtYXkgZ3JvdyB3aGlsZSB0aGUgY2FsbGVyIHByb2Nlc3NlcyBpdC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSByZXF1ZXN0ZWQgc3RyZWFtLlxuICAgKiBAcGFyYW0gZmlsZW5hbWUgLSBTdHJlYW0gZmlsZW5hbWUgKGUuZy4sIGBcInNlc3Npb24ubG9nXCJgKS5cbiAgICogQHJldHVybnMgTWV0YWRhdGEgYW5kIGNvbnRlbnQgbGluZXMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igb24gNDA0ICh1bmtub3duIGNhcmQgb3Igc3RyZWFtKSBvciBvdGhlciBzZXJ2ZXIgZXJyb3JzLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRTdHJlYW0oY2FyZElkOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcpOiBQcm9taXNlPHsgbWV0YTogU3RyZWFtTWV0YTsgbGluZXM6IHN0cmluZ1tdIH0+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXMvJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHsgbWV0YTogU3RyZWFtTWV0YTsgbGluZXM6IHN0cmluZ1tdIH0+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgY2h1bmtlZCBKU09OTCBzdHJlYW0gdG8gdGhlIHNlcnZlciBhbmQgcmV0dXJucyBhIHdyaXRlci5cbiAgICpcbiAgICogVGhlIHdyaXRlciBzZW5kcyBlYWNoIGxpbmUgaW4gcmVhbC10aW1lIG92ZXIgYSBzaW5nbGUgSFRUUCBQT1NUIHVzaW5nIGFcbiAgICogYFJlYWRhYmxlU3RyZWFtYCBib2R5LiBDYWxsIHtAbGluayBTdHJlYW1Xcml0ZXIuY2xvc2V9IHdoZW4gdGhlIHByb2R1Y2VyXG4gICAqIGlzIGZpbmlzaGVkIHRvIGVuZCB0aGUgcmVxdWVzdCBhbmQgcmV0cmlldmUgdGhlIHNlcnZlcidzIHN1bW1hcnkuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIElEIHRvIGF0dGFjaCB0aGUgc3RyZWFtIHRvLlxuICAgKiBAcGFyYW0gc3RyZWFtVHlwZSAtIFN0cmVhbSB0eXBlIGtleSBmcm9tIHNldHRpbmdzLmpzb24gKGUuZy4sIGBcImNsYXVkZS1jb2RlLXNlc3Npb25cImApLlxuICAgKiBAcGFyYW0gZmlsZW5hbWUgLSBTdHJlYW0gZmlsZW5hbWUgKGUuZy4sIGBcInNlc3Npb24tYWJjLmpzb25sXCJgKS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCB0aXRsZSBhbmQgc2Vzc2lvbiBJRCBtZXRhZGF0YS5cbiAgICogQHJldHVybnMgQSB7QGxpbmsgU3RyZWFtV3JpdGVyfSBmb3IgcHVzaGluZyBsaW5lcyBhbmQgY2xvc2luZyB0aGUgc3RyZWFtLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IHN0cmVhbSA9IGNsaWVudC5vcGVuU3RyZWFtKGNhcmRJZCwgJ2NsYXVkZS1jb2RlLXNlc3Npb24nLCAncnVuLmpzb25sJyk7XG4gICAqIHN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdpbml0JyB9KSk7XG4gICAqIHN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdyZXN1bHQnIH0pKTtcbiAgICogY29uc3QgcmVzdWx0ID0gYXdhaXQgc3RyZWFtLmNsb3NlKCk7XG4gICAqIGBgYFxuICAgKi9cbiAgb3BlblN0cmVhbShjYXJkSWQ6IHN0cmluZywgc3RyZWFtVHlwZTogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nLCBvcHRpb25zPzogU3RyZWFtV3JpdGVyT3B0aW9ucyk6IFN0cmVhbVdyaXRlciB7XG4gICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICAgIGxldCBjb250cm9sbGVyITogUmVhZGFibGVTdHJlYW1EZWZhdWx0Q29udHJvbGxlcjxVaW50OEFycmF5PjtcblxuICAgIGNvbnN0IGJvZHkgPSBuZXcgUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4oe1xuICAgICAgc3RhcnQoYykge1xuICAgICAgICBjb250cm9sbGVyID0gYztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoXG4gICAgICBgL2NhcmRzLyR7Y2FyZElkfS9zdHJlYW1zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHN0cmVhbVR5cGUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlbmFtZSl9YFxuICAgICk7XG5cbiAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LW5kanNvbidcbiAgICB9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnM/LnRpdGxlKSB7XG4gICAgICBoZWFkZXJzWydYLVN0cmVhbS1UaXRsZSddID0gb3B0aW9ucy50aXRsZTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkge1xuICAgICAgaGVhZGVyc1snWC1TdHJlYW0tU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuXG4gICAgLy8gYGR1cGxleDogJ2hhbGYnYCBpcyByZXF1aXJlZCBieSB1bmRpY2kgZm9yIHN0cmVhbWluZyByZXF1ZXN0IGJvZGllc1xuICAgIC8vIGJ1dCBpcyBub3QgeWV0IGluIHRoZSBzdGFuZGFyZCBsaWIuZG9tIFJlcXVlc3RJbml0IHR5cGUuXG4gICAgY29uc3QgZmV0Y2hPcHRpb25zOiBSZXF1ZXN0SW5pdCAmIHsgZHVwbGV4OiBzdHJpbmcgfSA9IHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHksXG4gICAgICBkdXBsZXg6ICdoYWxmJ1xuICAgIH07XG5cbiAgICBjb25zdCByZXNwb25zZVByb21pc2UgPSBmZXRjaCh1cmwsIGZldGNoT3B0aW9ucyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgd3JpdGUobGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShlbmNvZGVyLmVuY29kZShgJHtsaW5lfVxcbmApKTtcbiAgICAgIH0sXG4gICAgICBjbG9zZTogYXN5bmMgKCk6IFByb21pc2U8U3RyZWFtUmVzdWx0PiA9PiB7XG4gICAgICAgIGNvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXNwb25zZVByb21pc2U7XG4gICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFN0cmVhbVJlc3VsdD47XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn1cbiIsICIvKipcbiAqIEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGFjdGlvbiBoYW5kbGVycy5cbiAqXG4gKiBUaGlzIGlzIHRoZSBwcmltYXJ5IGF1dGhvcmluZyBBUEkgZm9yIGFjdGlvbiBkZXZlbG9wZXJzLiBJdCB3cmFwcyBhIGhhbmRsZXJcbiAqIGZ1bmN0aW9uIGFuZCBhdHRhY2hlcyBtZXRhZGF0YSBmb3Igc2V0dGluZ3MuanNvbiBnZW5lcmF0aW9uLiBUaGUgU2FtZVNoYXBlXG4gKiB1dGlsaXR5IHByb3ZpZGVzIGNvbXBpbGUtdGltZSB0eXBvIGRldGVjdGlvbi5cbiAqXG4gKlxuICogQHN1bW1hcnkgRmFjdG9yeSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgYWN0aW9uIGhhbmRsZXJzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db21tYW5kIH0gZnJvbSAnLi4vY29tbWFuZC10eXBlcy5qcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbnRleHQsIEFjdGlvbklucHV0IH0gZnJvbSAnLi4vaW5wdXRzLmpzJztcbmltcG9ydCB0eXBlIHsgU2FtZVNoYXBlIH0gZnJvbSAnLi4vdHlwZS11dGlscy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbmZpZ3VyYXRpb24gVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIGZvciB7QGxpbmsgZGVmaW5lQWN0aW9ufSBmYWN0b3J5LlxuICpcbiAqIEFsbCBmaWVsZHMgZXhjZXB0IGBhY3Rpb25OYW1lYCBhcmUgb3B0aW9uYWwgYW5kIGZvcndhcmRlZCB0byBzZXR0aW5ncy5qc29uLlxuICogVGhlIENMSSBleHRyYWN0cyB0aGlzIG1ldGFkYXRhIHZpYSBBU1QgYW5hbHlzaXMsIHNvIHZhbHVlcyBtdXN0IGJlIHN0cmluZ1xuICogbGl0ZXJhbHMgb3IgYm9vbGVhbi9udW1iZXIgbGl0ZXJhbHMgaW4gdGhlIHNvdXJjZSBjb2RlLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb25maWc6IEFjdGlvbkNvbmZpZyA9IHtcbiAqICAgYWN0aW9uTmFtZTogJ0xhdW5jaCBDbGF1ZGUnLFxuICogICBkZXNjcmlwdGlvbjogJ1N0YXJ0IGEgQ2xhdWRlIGNvZGluZyBzZXNzaW9uJyxcbiAqICAgaWNvbjogJy4vaWNvbnMvY2xhdWRlLnN2ZycsXG4gKiAgIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU6IHRydWUsXG4gKiAgIHRpbWVvdXQ6IDMwMDAwXG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aW9uQ29uZmlnIHtcbiAgLyoqXG4gICAqIFN0YWJsZSBpZGVudGlmaWVyIGZvciB0aGUgYWN0aW9uIHVzZWQgaW4gdGVsZW1ldHJ5LCBsb2NhbGl6YXRpb24sIGFuZCBBUEkgbG9va3Vwcy5cbiAgICpcbiAgICogU2hvdWxkIGJlIGxvd2VyY2FzZSB3aXRoIGh5cGhlbnMgKGUuZy4sICdsYXVuY2gtY2xhdWRlJywgJ3J1bi10ZXN0cycpLlxuICAgKiBJZiBvbWl0dGVkLCB0aGUgQ0xJIGdlbmVyYXRlcyBhbiBJRCBieSBzbHVnaWZ5aW5nIGBhY3Rpb25OYW1lYC5cbiAgICovXG4gIGlkPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgYWN0aW9uIG5hbWUgdXNlZCB0byBpZGVudGlmeSB0aGUgYWN0aW9uIGluIHNldHRpbmdzLmpzb24uXG4gICAqXG4gICAqIFRoaXMgbmFtZSBhcHBlYXJzIGluIHRoZSBVSS4gS2VlcCBpdCBjb25jaXNlIGJ1dCBkZXNjcmlwdGl2ZS5cbiAgICovXG4gIGFjdGlvbk5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gc2hvd24gaW4gYnV0dG9uIHRvb2x0aXAuXG4gICAqXG4gICAqIEV4cGxhaW4gd2hhdCB0aGUgYWN0aW9uIGRvZXMgaW4gYSBmZXcgd29yZHMuIFNob3duIG9uIGhvdmVyIGluIHRoZSBVSS5cbiAgICovXG4gIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGljb24gZmlsZSBmb3IgdGhlIGFjdGlvbiBidXR0b24uXG4gICAqXG4gICAqIFBhdGhzIGFyZSByZWxhdGl2ZSB0byB0aGUgc2V0dGluZ3MuanNvbiBmaWxlIGxvY2F0aW9uLlxuICAgKiBTVkcgZm9ybWF0IHJlY29tbWVuZGVkIGZvciBjcmlzcCByZW5kZXJpbmcgYXQgYW55IHNpemUuXG4gICAqL1xuICBpY29uPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHNob3cgdGhlIGV4ZWN1dGlvbiBtb2RlIHRvZ2dsZSBpbiB0aGUgVUkuXG4gICAqXG4gICAqIFdoZW4gdHJ1ZSwgdXNlcnMgY2FuIGNob29zZSBiZXR3ZWVuIGludGVyYWN0aXZlIGFuZCBiYWNrZ3JvdW5kIG1vZGVzLlxuICAgKiBXaGVuIGZhbHNlIChkZWZhdWx0KSwgdGhlIGFjdGlvbiBhbHdheXMgcnVucyBpbiBpbnRlcmFjdGl2ZSBtb2RlLlxuICAgKi9cbiAgc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgbXVsdGlwbGUgaW5zdGFuY2VzIGNhbiBydW4gc2ltdWx0YW5lb3VzbHkgb24gdGhlIHNhbWUgY2FyZC5cbiAgICpcbiAgICogV2hlbiBmYWxzZSAoZGVmYXVsdCksIHN0YXJ0aW5nIHRoZSBhY3Rpb24gd2hpbGUgaXQncyBydW5uaW5nIHdpbGwgYmVcbiAgICogYmxvY2tlZC4gU2V0IHRvIHRydWUgZm9yIGlkZW1wb3RlbnQgYWN0aW9ucyB0aGF0IGNhbiBzYWZlbHkgb3ZlcmxhcC5cbiAgICovXG4gIGFsbG93Q29uY3VycmVudD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIE1heGltdW0gZXhlY3V0aW9uIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICAgKlxuICAgKiBJZiB0aGUgYWN0aW9uIGV4Y2VlZHMgdGhpcyB0aW1lb3V0LCB0aGUgcnVudGltZSB3aWxsIHRlcm1pbmF0ZSBpdC5cbiAgICogT21pdCB0byB1c2UgdGhlIHBsYXRmb3JtJ3MgZGVmYXVsdCB0aW1lb3V0IHBvbGljeS5cbiAgICovXG4gIHRpbWVvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEhhbmRsZXIgc291cmNlIGZpbGUgcGF0aCwgaW5qZWN0ZWQgYnkgdGhlIGBpbmplY3RTb3VyY2VQYXRoYCBlc2J1aWxkXG4gICAqIHBsdWdpbiBkdXJpbmcgY29uZmlnIGxvYWRpbmcuIERvIG5vdCBzZXQgbWFudWFsbHkuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc291cmNlUGF0aD86IHN0cmluZztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSGFuZGxlciBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEhhbmRsZXIgZnVuY3Rpb24gc2lnbmF0dXJlIGZvciBhY3Rpb24gZXZlbnRzLlxuICpcbiAqIFRocm93aW5nIGFuIGVycm9yIHNpZ25hbHMgYWN0aW9uIGZhaWx1cmUuIFRoZSBlcnJvciBtZXNzYWdlIGlzIGxvZ2dlZCBhbmRcbiAqIHN1cmZhY2VkIHRvIHRoZSB1c2VyLiBGb3IgZXhwZWN0ZWQgZXJyb3JzLCB0aHJvdyB3aXRoIGEgZGVzY3JpcHRpdmUgbWVzc2FnZS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgcGF5bG9hZCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogQHBhcmFtIGNvbnRleHQgLSBSdW50aW1lIGNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIGNhbGxiYWNrIG1ldGhvZHNcbiAqIEByZXR1cm5zIFByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBhY3Rpb24gY29tcGxldGVzXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGhhbmRsZXI6IEFjdGlvbkhhbmRsZXIgPSBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyLCBvbkNhbmNlbCB9KSA9PiB7XG4gKiAgIG9uQ2FuY2VsKCgpID0+IHtcbiAqICAgICBsb2dnZXIuaW5mbygnQ2FuY2VsbGluZyBhY3Rpb24nKTtcbiAqICAgfSk7XG4gKlxuICogICB0cnkge1xuICogICAgIGxvZ2dlci5pbmZvKCdTdGFydGluZyBhY3Rpb24nLCB7IGNhcmRJZDogaW5wdXQuY2FyZElkIH0pO1xuICogICAgIGF3YWl0IHBlcmZvcm1BY3Rpb24oaW5wdXQpO1xuICogICAgIGxvZ2dlci5pbmZvKCdBY3Rpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseScpO1xuICogICB9IGNhdGNoIChlcnIpIHtcbiAqICAgICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnQWN0aW9uIGZhaWxlZCcpO1xuICogICAgIHRocm93IGVycjsgLy8gUmUtdGhyb3cgdG8gc2lnbmFsIGZhaWx1cmVcbiAqICAgfVxuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBBY3Rpb25IYW5kbGVyID0gKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD47XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZhY3RvcnkgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGFjdGlvbiBoYW5kbGVyIHdpdGggbWV0YWRhdGEgZm9yIHNldHRpbmdzLmpzb24gZ2VuZXJhdGlvbi5cbiAqXG4gKiBUaGlzIGZhY3Rvcnkgd3JhcHMgeW91ciBoYW5kbGVyIGZ1bmN0aW9uIGFuZCBhdHRhY2hlcyBtZXRhZGF0YSB0aGF0IHRoZSBDTElcbiAqIGV4dHJhY3RzIHdoZW4gYnVpbGRpbmcgc2V0dGluZ3MuanNvbi4gVGhlIHJldHVybmVkIGNvbW1hbmQgaXMgYm90aCBjYWxsYWJsZVxuICogKGZvciB0aGUgcnVudGltZSkgYW5kIGluc3BlY3RhYmxlIChmb3IgdGhlIENMSSkuXG4gKlxuICogVGhlIGdlbmVyaWMgcGFyYW1ldGVyIHByZXNlcnZlcyB0aGUgYWN0aW9uIG5hbWUgYXMgYSBsaXRlcmFsIHR5cGUuXG4gKlxuICogQHRlbXBsYXRlIFQgLSBUaGUgY29uZmlnIHR5cGUgZXh0ZW5kaW5nIEFjdGlvbkNvbmZpZ1xuICogQHBhcmFtIGNvbmZpZyAtIEFjdGlvbiBtZXRhZGF0YSAodXNlcyBTYW1lU2hhcGUgdG8gY2F0Y2ggdHlwb3MpXG4gKiBAcGFyYW0gaGFuZGxlciAtIEFzeW5jIGZ1bmN0aW9uIHRoYXQgaW1wbGVtZW50cyB0aGUgYWN0aW9uIGxvZ2ljXG4gKiBAcmV0dXJucyBBIGNhbGxhYmxlIGNvbW1hbmQgd2l0aCBhdHRhY2hlZCBtZXRhZGF0YVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCYXNpYyB1c2FnZVxuICogZXhwb3J0IGRlZmF1bHQgZGVmaW5lQWN0aW9uKFxuICogICB7IGFjdGlvbk5hbWU6ICdMYXVuY2ggQ2xhdWRlJyB9LFxuICogICBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgICBsb2dnZXIuaW5mbygnTGF1bmNoaW5nIENsYXVkZScsIHsgY2FyZElkOiBpbnB1dC5jYXJkSWQgfSk7XG4gKiAgICAgYXdhaXQgc3Bhd25DbGF1ZGUoaW5wdXQpO1xuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFdpdGggZnVsbCBjb25maWd1cmF0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCBkZWZpbmVBY3Rpb24oXG4gKiAgIHtcbiAqICAgICBhY3Rpb25OYW1lOiAnRGVwbG95IEFwcGxpY2F0aW9uJyxcbiAqICAgICBkZXNjcmlwdGlvbjogJ0RlcGxveSB0byBwcm9kdWN0aW9uJyxcbiAqICAgICBpY29uOiAnLi9pY29ucy9kZXBsb3kuc3ZnJyxcbiAqICAgICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiB0cnVlLFxuICogICAgIGFsbG93Q29uY3VycmVudDogZmFsc2UsXG4gKiAgICAgdGltZW91dDogNjAwMDBcbiAqICAgfSxcbiAqICAgYXN5bmMgKGlucHV0LCBjb250ZXh0KSA9PiB7XG4gKiAgICAgY29udGV4dC5vbkNhbmNlbCgoKSA9PiBjbGVhbnVwKCkpO1xuICogICAgIGF3YWl0IGRlcGxveShpbnB1dCwgY29udGV4dCk7XG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUFjdGlvbjxUIGV4dGVuZHMgQWN0aW9uQ29uZmlnPihcbiAgY29uZmlnOiBTYW1lU2hhcGU8QWN0aW9uQ29uZmlnLCBUPixcbiAgaGFuZGxlcjogQWN0aW9uSGFuZGxlclxuKTogQWN0aW9uQ29tbWFuZDxUWydhY3Rpb25OYW1lJ10+IHtcbiAgY29uc3QgZm4gPSBhc3luYyAoaW5wdXQ6IEFjdGlvbklucHV0LCBjb250ZXh0OiBBY3Rpb25Db250ZXh0KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgYXdhaXQgaGFuZGxlcihpbnB1dCwgY29udGV4dCk7XG4gIH07XG5cbiAgZm4uZmFjdG9yeVR5cGUgPSAnYWN0aW9uJyBhcyBjb25zdDtcbiAgZm4uaWQgPSBjb25maWcuaWQ7XG4gIGZuLmFjdGlvbk5hbWUgPSBjb25maWcuYWN0aW9uTmFtZTtcbiAgZm4uZGVzY3JpcHRpb24gPSBjb25maWcuZGVzY3JpcHRpb247XG4gIGZuLmljb24gPSBjb25maWcuaWNvbjtcbiAgZm4uc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZSA9IGNvbmZpZy5zdXBwb3J0c0JhY2tncm91bmRNb2RlO1xuICBmbi5hbGxvd0NvbmN1cnJlbnQgPSBjb25maWcuYWxsb3dDb25jdXJyZW50O1xuICBmbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gIGZuLnNvdXJjZVBhdGggPSBjb25maWcuc291cmNlUGF0aDtcblxuICByZXR1cm4gZm4gYXMgQWN0aW9uQ29tbWFuZDxUWydhY3Rpb25OYW1lJ10+O1xufVxuIiwgIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgaW5qZWN0cyBhY3Rpb24gYW5kIHR5cGUgaG9vayBpbnB1dHMgdmlhIHByb2Nlc3MuZW52LlxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgc3RyaWN0IGdldHRlcnMgYW5kIHR5cGVkIGV4dHJhY3RvcnMgc28gaGFuZGxlcnMgZG8gbm90XG4gKiBuZWVkIHRvIHBhcnNlIGVudmlyb25tZW50IHZhcmlhYmxlcyBtYW51YWxseS5cbiAqXG4gKiBVc2UgdGhlIGluZGl2aWR1YWwgZ2V0dGVycyB3aGVuIHlvdSBvbmx5IG5lZWQgb25lIHZhbHVlOyB1c2VcbiAqIHtAbGluayBleHRyYWN0QWN0aW9uSW5wdXR9IG9yIHtAbGluayBleHRyYWN0VHlwZUlucHV0fSB3aGVuIHlvdSBuZWVkIGEgZnVsbFxuICogdHlwZWQgcGF5bG9hZCBmb3IgYW4gYWN0aW9uIG9yIHR5cGUgaG9vay5cbiAqXG4gKlxuICogQHN1bW1hcnkgRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25JbnB1dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMgc2V0IGJ5IHRoZSBDYXJkcyBleGVjdXRpb24gd3JhcHBlci5cbiAqXG4gKiBUaGlzIGlzIHRoZSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciBlbnYgdmFyIGtleXMgdXNlZCBieSBhY3Rpb24gYW5kIHR5cGVcbiAqIGhvb2sgcHJvY2Vzc2VzLiBLZWVwIGl0IGluIHN5bmMgd2l0aCB0aGUgd3JhcHBlciB0byBhdm9pZCBzdWJ0bGUgXCJ1bmRlZmluZWRcbiAqIGlucHV0XCIgYnVncy5cbiAqL1xuZXhwb3J0IGNvbnN0IENBUkRTX0VOVl9WQVJTID0ge1xuICAvKipcbiAgICogVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBjdXJyZW50IGNhcmQuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIENBUkRfSUQ6ICdDQVJEX0lEJyxcblxuICAvKipcbiAgICogVGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSBzZXR0aW5ncy5qc29uLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBFTlZJUk9OTUVOVDogJ0VOVklST05NRU5UJyxcblxuICAvKipcbiAgICogRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gYnV0dG9uIHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgQUNUSU9OX05BTUU6ICdBQ1RJT05fTkFNRScsXG5cbiAgLyoqXG4gICAqIENhcmQncyBleGVjdXRpb24gbW9kZSwgZGV0ZXJtaW5pbmcgVUkgaW50ZXJhY3Rpb24gbW9kZWwuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogVmFsaWQgdmFsdWVzOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnXG4gICAqL1xuICBFWEVDVVRJT05fTU9ERTogJ0VYRUNVVElPTl9NT0RFJyxcblxuICAvKipcbiAgICogQ2FyZHMgc2VydmVyIGJhc2UgVVJMIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9CQVNFX1VSTDogJ0FQSV9CQVNFX1VSTCcsXG5cbiAgLyoqXG4gICAqIEF1dGhlbnRpY2F0aW9uIHRva2VuIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9BQ0NFU1NfVE9LRU46ICdBUElfQUNDRVNTX1RPS0VOJyxcblxuICAvKipcbiAgICogQ29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogT3B0aW9uYWwuXG4gICAqL1xuICBDT0RJTkdfQUdFTlQ6ICdDT0RJTkdfQUdFTlQnLFxuXG4gIC8qKlxuICAgKiBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX05BTUU6ICdUWVBFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSdzIHZlcnNpb24gc3RyaW5nIGZyb20gc2V0dGluZ3MuanNvbiBjb25maWd1cmF0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9WRVJTSU9OOiAnVFlQRV9WRVJTSU9OJyxcblxuICAvKipcbiAgICogVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9OQU1FOiAnRklMRV9OQU1FJyxcblxuICAvKipcbiAgICogRnVsbCBwYXRoIHRvIHRoZSBmaWxlLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9QQVRIOiAnRklMRV9QQVRIJyxcblxuICAvKipcbiAgICogRmlsZSBzaXplIGluIGJ5dGVzLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9TSVpFOiAnRklMRV9TSVpFJyxcblxuICAvKipcbiAgICogU0hBMjU2IGhhc2ggb2YgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFNIQTI1NjogJ1NIQTI1NicsXG5cbiAgLyoqXG4gICAqIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIENPTlRFTlRfVFlQRTogJ0NPTlRFTlRfVFlQRScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgICh3aXRoXG4gICAqIGBFTEVDVFJPTl9SVU5fQVNfTk9ERT0xYCkuIENvbW1hbmRzIGluIHNldHRpbmdzLmpzb24gdXNlXG4gICAqIGAkVlNDT0RFX05PREVfUEFUSCAuL2Jpbi8uLi5gIHNvIHRoZXkgd29yayByZWdhcmRsZXNzIG9mXG4gICAqIHdoZXRoZXIgYG5vZGVgIGlzIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgVlNDT0RFX05PREVfUEFUSDogJ1ZTQ09ERV9OT0RFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgU09DS0VUX1BBVEg6ICdTT0NLRVRfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gYSBKU09OIGZpbGUgY29udGFpbmluZyBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZnJvbSBhIHByZXZpb3VzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuIE9wdGlvbmFsLlxuICAgKi9cbiAgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSDogJ1NXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENPTkZJR19QQVRIOiAnQ09ORklHX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFdPUktTUEFDRV9QQVRIOiAnV09SS1NQQUNFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDQVJEX1JFUE9fUEFUSDogJ0NBUkRfUkVQT19QQVRIJ1xufSBhcyBjb25zdDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW5kaXZpZHVhbCBHZXR0ZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogUmVhZHMgdGhlIGNhcmQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgYWx3YXlzIHNldHMgdGhpcyBmb3IgZXZlcnkgYWN0aW9uIGFuZCB0eXBlIGhvb2suXG4gKiBAcmV0dXJucyBUaGUgY3VycmVudCBjYXJkIElEXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfSUQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNhcmRJZCA9IGdldENhcmRJZCgpO1xuICogY29uc29sZS5sb2coYFByb2Nlc3NpbmcgY2FyZDogJHtjYXJkSWR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRJZCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfSURdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2YWx1ZSBtYXRjaGVzIHRoZSBlbnZpcm9ubWVudCBrZXkgaW4gc2V0dGluZ3MuanNvbiAoZS5nLiwgXCJkZWZhdWx0XCIsIFwic3RhZ2luZ1wiKS5cbiAqIEByZXR1cm5zIFRoZSBlbnZpcm9ubWVudCBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVOVklST05NRU5UIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZpcm9ubWVudCA9IGdldEVudmlyb25tZW50KCk7XG4gKiBjb25zb2xlLmxvZyhgRW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudmlyb25tZW50KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhY3Rpb24gYnV0dG9uIG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyB0aGUgZGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGhhbmRsZXIsIG1hdGNoaW5nXG4gKiB0aGUgYGFjdGlvbk5hbWVgIGZpZWxkIGZyb20gYGRlZmluZUFjdGlvbmAuXG4gKiBAcmV0dXJucyBEaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgY3VycmVudCBoYW5kbGVyIHJ1bi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQUNUSU9OX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFjdGlvbk5hbWUgPSBnZXRBY3Rpb25OYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgUnVubmluZyBhY3Rpb246ICR7YWN0aW9uTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aW9uTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZXhlY3V0aW9uIG1vZGUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogRGV0ZXJtaW5lcyB0aGUgVUkgaW50ZXJhY3Rpb24gbW9kZWwgZm9yIGFjdGlvbnMuXG4gKiBAcmV0dXJucyBUaGUgZXhlY3V0aW9uIG1vZGUgKCdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnKVxuICogQHRocm93cyBFcnJvciBpZiBFWEVDVVRJT05fTU9ERSBpcyBtaXNzaW5nLCBlbXB0eSwgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG1vZGUgPSBnZXRFeGVjdXRpb25Nb2RlKCk7XG4gKiBpZiAobW9kZSA9PT0gJ2ludGVyYWN0aXZlJykge1xuICogICAvLyBTaG93IHVzZXIgcHJvbXB0c1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeGVjdXRpb25Nb2RlKCk6ICdpbnRlcmFjdGl2ZScgfCAnYmFja2dyb3VuZCcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfWApO1xuICB9XG4gIGlmICh2YWx1ZSAhPT0gJ2ludGVyYWN0aXZlJyAmJiB2YWx1ZSAhPT0gJ2JhY2tncm91bmQnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9OiBleHBlY3RlZCAnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJywgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQVBJIGJhc2UgVVJMIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFVzZSB0aGlzIGFzIHRoZSBiYXNlIGZvciBjb25zdHJ1Y3RpbmcgQVBJIGVuZHBvaW50cy4gVGhlIFVSTCBkb2VzIG5vdCBpbmNsdWRlXG4gKiBhIHRyYWlsaW5nIHNsYXNoLlxuICogQHJldHVybnMgQmFzZSBVUkwgdXNlZCB0byBjb25zdHJ1Y3QgQ2FyZHMgQVBJIGVuZHBvaW50cyBmb3IgdGhpcyBleGVjdXRpb24uXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFQSV9CQVNFX1VSTCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYXBpVXJsID0gZ2V0QXBpQmFzZVVybCgpO1xuICogY29uc3QgZW5kcG9pbnQgPSBgJHthcGlVcmx9L2NhcmRzLyR7Y2FyZElkfWA7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUJhc2VVcmwoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkxdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQVBJIGFjY2VzcyB0b2tlbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBCZWFyZXIgdG9rZW4gdmFsaWQgZm9yIHRoZSBkdXJhdGlvbiBvZiB0aGlzIGFjdGlvbiBvciB0eXBlIGhvb2sgZXhlY3V0aW9uLlxuICogSW5jbHVkZSBpbiBBdXRob3JpemF0aW9uIGhlYWRlcnMgd2hlbiBjYWxsaW5nIHRoZSBDYXJkcyBBUEkuXG4gKiBAcmV0dXJucyBCZWFyZXIgdG9rZW4gdGhhdCBhdXRob3JpemVzIEFQSSByZXF1ZXN0cyBmb3IgdGhpcyBleGVjdXRpb24gY29udGV4dC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0FDQ0VTU19UT0tFTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdG9rZW4gPSBnZXRBcGlBY2Nlc3NUb2tlbigpO1xuICogY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChhcGlVcmwsIHtcbiAqICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dG9rZW59YCB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQWNjZXNzVG9rZW4oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU59YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjb25maWd1cmVkIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIE9wdGlvbmFsIHZhbHVlIGZyb20gY2FyZHMuY29kaW5nQWdlbnQgc2V0dGluZy4gV2hlbiBzZXQsIGluZGljYXRlcyB3aGljaCBBSVxuICogY29kaW5nIGFzc2lzdGFudCB0aGUgdXNlciBwcmVmZXJzLiBBY3Rpb25zIGNhbiB1c2UgdGhpcyB0byBjdXN0b21pemUgYmVoYXZpb3JcbiAqIG9yIHByb21wdHMgZm9yIGRpZmZlcmVudCBhZ2VudHMuXG4gKiBAcmV0dXJucyBUaGUgY29kaW5nIGFnZW50IGlkZW50aWZpZXIsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29kaW5nQWdlbnQgPSBnZXRDb2RpbmdBZ2VudCgpO1xuICogaWYgKGNvZGluZ0FnZW50ID09PSAnY2xhdWRlJykge1xuICogICAvLyBDdXN0b21pemUgZm9yIENsYXVkZVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb2RpbmdBZ2VudCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPRElOR19BR0VOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZSBmb3IgdHlwZSBob29rcy5cbiAqXG4gKiBUaGlzIHZhbHVlIGlzIG9ubHkgcHJlc2VudCBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqIEByZXR1cm5zIFRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBUWVBFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHR5cGVOYW1lID0gZ2V0VHlwZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBUeXBlOiAke3R5cGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlIHZlcnNpb24gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2ZXJzaW9uIGNvbWVzIGZyb20gdGhlIHR5cGUgY29uZmlndXJhdGlvbiBpbiBzZXR0aW5ncy5qc29uLlxuICogQHJldHVybnMgVGhlIHZlcnNpb24gc3RyaW5nIGZyb20gdHlwZSBjb25maWdcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9WRVJTSU9OIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB2ZXJzaW9uID0gZ2V0VHlwZVZlcnNpb24oKTtcbiAqIGNvbnNvbGUubG9nKGBWZXJzaW9uOiAke3ZlcnNpb259YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVWZXJzaW9uKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgbmFtZSBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmaWxlIG5hbWUgcmVsYXRpdmUgdG8gdGhlIHR5cGUgZGlyZWN0b3J5LCBub3QgYSBmdWxsIHBhdGguXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBuYW1lIHdpdGhpbiB0aGUgdHlwZSBkaXJlY3RvcnlcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlTmFtZSA9IGdldEZpbGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgRmlsZTogJHtmaWxlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgdHlwZWQgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmdWxseSByZXNvbHZlZCBwYXRoIG9uIGRpc2sgcHJvdmlkZWQgYnkgdGhlIGV4ZWN1dGlvbiB3cmFwcGVyLlxuICogQHJldHVybnMgVGhlIGZ1bGwgcGF0aCB0byB0aGUgZmlsZVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVQYXRoID0gZ2V0RmlsZVBhdGgoKTtcbiAqIGNvbnNvbGUubG9nKGBQYXRoOiAke2ZpbGVQYXRofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIHNpemUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIHZhbHVlIGlzIHBhcnNlZCBhcyBhIGJhc2UtMTAgaW50ZWdlci5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIHNpemUgaW4gYnl0ZXNcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9TSVpFIGlzIG1pc3Npbmcgb3Igbm90IGEgbnVtYmVyXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgc2l6ZSA9IGdldEZpbGVTaXplKCk7XG4gKiBjb25zb2xlLmxvZyhgU2l6ZTogJHtzaXplfSBieXRlc2ApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlU2l6ZSgpOiBudW1iZXIge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9YCk7XG4gIH1cbiAgY29uc3Qgc2l6ZSA9IE51bWJlci5wYXJzZUludCh2YWx1ZSwgMTApO1xuICBpZiAoTnVtYmVyLmlzTmFOKHNpemUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfTogZXhwZWN0ZWQgbnVtYmVyLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHNpemU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFNIQTI1NiBoYXNoIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFVzZWZ1bCBmb3IgZGV0ZWN0aW5nIGNvbnRlbnQgY2hhbmdlcyB3aXRob3V0IHJlYWRpbmcgdGhlIGZpbGUgYWdhaW4uXG4gKiBAcmV0dXJucyBUaGUgU0hBMjU2IGhhc2ggb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgU0hBMjU2IGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBoYXNoID0gZ2V0U2hhMjU2KCk7XG4gKiBjb25zb2xlLmxvZyhgSGFzaDogJHtoYXNofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTaGEyNTYoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TSEEyNTZdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU0hBMjU2fWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgTUlNRSB0eXBlIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFByb3ZpZGVkIGZvciB0eXBlIGhvb2sgZXZlbnRzIHNvIHZhbGlkYXRvcnMgY2FuIGJyYW5jaCBvbiBjb250ZW50IHR5cGUuXG4gKiBAcmV0dXJucyBUaGUgTUlNRSB0eXBlIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTlRFTlRfVFlQRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29udGVudFR5cGUgPSBnZXRDb250ZW50VHlwZSgpO1xuICogY29uc29sZS5sb2coYENvbnRlbnQgdHlwZTogJHtjb250ZW50VHlwZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29udGVudFR5cGUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIgcGF0aCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHNldCBieSB0aGUgZXh0ZW5zaW9uIGR1cmluZyBhY3RpdmF0aW9uIGFuZCBpbmplY3RlZCBpbnRvIGFsbFxuICogc3Bhd25lZCBhY3Rpb24vaG9vayBwcm9jZXNzZXMuIENvbmZpZ3VyYXRpb24gYXV0aG9ycyBjYW4gdXNlIGl0IHRvIGludm9rZVxuICogTm9kZS5qcyB3aXRob3V0IHJlbHlpbmcgb24gdGhlIHN5c3RlbSBQQVRILlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyXG4gKiBAdGhyb3dzIEVycm9yIGlmIFZTQ09ERV9OT0RFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG5vZGVQYXRoID0gZ2V0VnNjb2RlTm9kZVBhdGgoKTtcbiAqIGV4ZWNGaWxlU3luYyhub2RlUGF0aCwgWydzY3JpcHQuanMnXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFZzY29kZU5vZGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREVfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVW5peCBkb21haW4gc29ja2V0IHBhdGggZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICpcbiAqIEByZXR1cm5zIFVuaXggc29ja2V0IHBhdGggdXNlZCB0byBzZW5kIHJ1bnRpbWUgY29udHJvbCBtZXNzYWdlcy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgU09DS0VUX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U29ja2V0UGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcGF0aCB0byB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogVGhpcyBpcyBvcHRpb25hbCBcdTIwMTQgcmV0dXJucyB1bmRlZmluZWQgd2hlbiBub3Qgc2V0IChpLmUuLCB0aGUgYWN0aW9uXG4gKiB3YXMgbm90IHJlbGF1bmNoZWQgdmlhIHN3aXRjaFRvSW50ZXJhY3RpdmUpLlxuICpcbiAqIEByZXR1cm5zIFRoZSBmaWxlIHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YVBhdGgoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHNldHRpbmdzIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5IGNvbnRhaW5pbmcgZ2VuZXJhdGVkIHNldHRpbmdzIGFydGlmYWN0cy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09ORklHX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBhY3RpdmUgVlMgQ29kZSB3b3Jrc3BhY2Ugcm9vdC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgV09SS1NQQUNFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29ya3NwYWNlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgcmVwb3NpdG9yeSBhc3NvY2lhdGVkIHdpdGggdGhlIGFjdGl2ZSBjYXJkLlxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX1JFUE9fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkUmVwb1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHBhcnNlcyB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogV2hlbiBgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSGAgaXMgc2V0LCByZWFkcyB0aGUgZmlsZSBhdCB0aGF0IHBhdGhcbiAqIGFuZCBwYXJzZXMgaXQgYXMgSlNPTi4gUmV0dXJucyB1bmRlZmluZWQgaWYgdGhlIGVudiB2YXIgaXMgbm90IHNldC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGFyc2VkIGRhdGEsIG9yIHVuZGVmaW5lZCBpZiB0aGUgcGF0aCBpcyBub3Qgc2V0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBmaWxlIGNhbm5vdCBiZSByZWFkIG9yIGNvbnRhaW5zIGludmFsaWQgSlNPTlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCk6IHVua25vd24gfCB1bmRlZmluZWQge1xuICBjb25zdCBkYXRhUGF0aCA9IGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpO1xuICBpZiAoZGF0YVBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhkYXRhUGF0aCwgJ3V0Zi04Jyk7XG4gIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlZCBJbnB1dCBFeHRyYWN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgYWN0aW9uIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKlxuICogQHJldHVybnMgVHlwZWQgQWN0aW9uSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYW4gYWN0aW9uIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5jYXJkSWQpO1xuICogY29uc29sZS5sb2coaW5wdXQuZXhlY3V0aW9uTW9kZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBY3Rpb25JbnB1dCgpOiBBY3Rpb25JbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBhY3Rpb25OYW1lOiBnZXRBY3Rpb25OYW1lKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgZXhlY3V0aW9uTW9kZTogZ2V0RXhlY3V0aW9uTW9kZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKSxcbiAgICBjb2RpbmdBZ2VudDogZ2V0Q29kaW5nQWdlbnQoKSxcbiAgICBzd2l0Y2hUb0ludGVyYWN0aXZlRGF0YTogcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCksXG4gICAgd29ya3NwYWNlUGF0aDogZ2V0V29ya3NwYWNlUGF0aCgpLFxuICAgIGNhcmRSZXBvUGF0aDogZ2V0Q2FyZFJlcG9QYXRoKClcbiAgfTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCB0eXBlIGhvb2sgaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIHR5cGUgbGlmZWN5Y2xlIGhvb2tzICh2YWxpZGF0b3IsIGNyZWF0ZSxcbiAqIHVwZGF0ZSwgZGVsZXRlKS5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBUeXBlSG9va0lucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGEgdHlwZSBob29rIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdFR5cGVJbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQudHlwZU5hbWUpO1xuICogY29uc29sZS5sb2coaW5wdXQuZmlsZU5hbWUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VHlwZUlucHV0KCk6IFR5cGVIb29rSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgdHlwZU5hbWU6IGdldFR5cGVOYW1lKCksXG4gICAgdHlwZVZlcnNpb246IGdldFR5cGVWZXJzaW9uKCksXG4gICAgZmlsZU5hbWU6IGdldEZpbGVOYW1lKCksXG4gICAgZmlsZVBhdGg6IGdldEZpbGVQYXRoKCksXG4gICAgZmlsZVNpemU6IGdldEZpbGVTaXplKCksXG4gICAgZmlsZVNoYTI1NjogZ2V0U2hhMjU2KCksXG4gICAgY29udGVudFR5cGU6IGdldENvbnRlbnRUeXBlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpXG4gIH07XG59XG4iLCAiLyoqXG4gKiBFeGl0IGNvZGUgY29uc3RhbnRzIGFuZCBoZWxwZXJzIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3MuXG4gKlxuICogQ2FyZHMgaG9va3MgY29tbXVuaWNhdGUgc3VjY2VzcyBhbmQgZmFpbHVyZSB2aWEgcHJvY2VzcyBleGl0IGNvZGVzIGFuZFxuICogc3RkZXJyIG91dHB1dC4gVGhpcyBtb2R1bGUgY2VudHJhbGl6ZXMgdGhvc2UgY29udmVudGlvbnMgc28gdGhlIHJ1bnRpbWVcbiAqIGFuZCBob29rcyBzcGVhayB0aGUgc2FtZSBwcm90b2NvbC5cbiAqXG4gKiBAc3VtbWFyeSBFeGl0IGNvZGUgY29uc3RhbnRzIGFuZCBoZWxwZXJzIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGl0IENvZGUgQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRXhpdCBjb2RlcyB1c2VkIGJ5IENhcmRzIGhvb2tzLlxuICpcbiAqIFRoZSBDYXJkcyBydW50aW1lIGludGVycHJldHMgYW55IG5vbi16ZXJvIGV4aXQgY29kZSBhcyBmYWlsdXJlLlxuICovXG5leHBvcnQgY29uc3QgRVhJVF9DT0RFUyA9IHtcbiAgLyoqIEhhbmRsZXIgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gKi9cbiAgU1VDQ0VTUzogMCxcbiAgLyoqIEhhbmRsZXIgdGhyZXcgYW4gZXJyb3IuICovXG4gIEVSUk9SOiAxLFxuICAvKiogSGFuZGxlciBwcm9jZXNzZWQgc3dpdGNoVG9JbnRlcmFjdGl2ZSBhbmQgaXMgZXhpdGluZyBmb3IgcmVsYXVuY2guICovXG4gIFNXSVRDSF9UT19JTlRFUkFDVElWRTogNDJcbn0gYXMgY29uc3Q7XG5cbi8qKlxuICogVW5pb24gb2YgdmFsaWQgQ2FyZHMgaG9vayBleGl0IGNvZGVzLlxuICovXG5leHBvcnQgdHlwZSBFeGl0Q29kZSA9ICh0eXBlb2YgRVhJVF9DT0RFUylba2V5b2YgdHlwZW9mIEVYSVRfQ09ERVNdO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFcnJvciBPdXRwdXQgSGVscGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFdyaXRlcyBhbiBlcnJvciBtZXNzYWdlIHRvIHN0ZGVyciB3aXRoIGEgdHJhaWxpbmcgbmV3bGluZS5cbiAqXG4gKiBVc2UgdGhpcyB3aGVuIGEgaG9vayBuZWVkcyB0byByZXBvcnQgYSBmYWlsdXJlIHdpdGhvdXQgcG9sbHV0aW5nIHN0ZG91dC5cbiAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgbWVzc2FnZSB0byB3cml0ZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHdyaXRlRXJyb3IoJ0ZhaWxlZCB0byBjb25uZWN0IHRvIGRhdGFiYXNlJyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlRXJyb3IobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke21lc3NhZ2V9XFxuYCk7XG59XG5cbi8qKlxuICogV3JpdGVzIGFuIGVycm9yIG1lc3NhZ2UgdG8gc3RkZXJyIGFuZCBleGl0cyB3aXRoIEVSUk9SIGNvZGUuXG4gKlxuICogVGhpcyB0ZXJtaW5hdGVzIHRoZSBwcm9jZXNzIGltbWVkaWF0ZWx5LCBzbyBhbnkgcGVuZGluZyBhc3luYyB3b3JrIHdpbGxcbiAqIG5vdCBmaW5pc2ggdW5sZXNzIGl0IHdhcyBhbHJlYWR5IGF3YWl0ZWQuXG4gKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIG1lc3NhZ2UgdG8gd3JpdGUgYmVmb3JlIGV4aXRpbmdcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoIWlzVmFsaWQpIHtcbiAqICAgZXhpdFdpdGhFcnJvcignSW52YWxpZCBjb25maWd1cmF0aW9uJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXRXaXRoRXJyb3IobWVzc2FnZTogc3RyaW5nKTogbmV2ZXIge1xuICB3cml0ZUVycm9yKG1lc3NhZ2UpO1xuICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEludGVybmFsIFJlc3VsdCBUcmFja2luZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEludGVybmFsIHJ1bnRpbWUgYm9va2tlZXBpbmcgZm9yIGhvb2sgZXhlY3V0aW9uIHJlc3VsdHMuXG4gKlxuICogVGhpcyBzdHJ1Y3R1cmUgYWxsb3dzIHRoZSBydW50aW1lIHRvIGNhcnJ5IGVycm9yIGRldGFpbHMgd2l0aG91dCBjaGFuZ2luZ1xuICogdGhlIGV4aXQtY29kZSBwcm90b2NvbC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIb29rRXhlY3V0aW9uUmVzdWx0IHtcbiAgLyoqIFdoZXRoZXIgdGhlIGhvb2sgZXhlY3V0ZWQgc3VjY2Vzc2Z1bGx5LiAqL1xuICBzdWNjZXNzOiBib29sZWFuO1xuICAvKiogVGhlIGV4aXQgY29kZSB0byB1c2Ugd2hlbiBleGl0aW5nLiAqL1xuICBleGl0Q29kZTogRXhpdENvZGU7XG4gIC8qKiBUaGUgZXJyb3IgdGhhdCBvY2N1cnJlZCwgaWYgYW55LiAqL1xuICBlcnJvcj86IEVycm9yO1xufVxuIiwgIi8qKlxuICogU3RydWN0dXJlZCBsb2dnaW5nIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3MuXG4gKlxuICogT3V0cHV0IGlzIG9wdC1pbjogdGhlIGxvZ2dlciBvbmx5IGVtaXRzIHRvIHJlZ2lzdGVyZWQgaGFuZGxlcnMgb3IgYVxuICogY29uZmlndXJlZCBsb2cgZmlsZS4gSWYgeW91IGNvbmZpZ3VyZSBub3RoaW5nLCB0aGUgbG9nZ2VyIHBvbGl0ZWx5IHNheXNcbiAqIG5vdGhpbmcgYXQgYWxsLiBJdCBuZXZlciB3cml0ZXMgdG8gc3Rkb3V0IGFuZCBhdm9pZHMgc3RkZXJyIHRvIGtlZXAgaG9va1xuICogcHJvdG9jb2xzIGNsZWFuLlxuICpcbiAqIEBzdW1tYXJ5IFN0cnVjdHVyZWQgbG9nZ2luZyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBsb2cgZXZlbnRzXG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAqICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gJHtldmVudC5ob29rVHlwZX06ICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAqIH0pO1xuICpcbiAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICogdW5zdWJzY3JpYmUoKTtcbiAqIGBgYFxuICovXG5cbmltcG9ydCB7IGNsb3NlU3luYywgZXhpc3RzU3luYywgbWtkaXJTeW5jLCBvcGVuU3luYywgd3JpdGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nIExldmVsIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQXZhaWxhYmxlIGxvZyBsZXZlbHMuXG4gKlxuICogfCBMZXZlbCB8IFNldmVyaXR5IHwgVXNlIENhc2UgfFxuICogfC0tLS0tLS18LS0tLS0tLS0tLXwtLS0tLS0tLS0tfFxuICogfCBgZGVidWdgIHwgTG93ZXN0IHwgRGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHxcbiAqIHwgYGluZm9gIHwgTG93IHwgR2VuZXJhbCBvcGVyYXRpb25hbCBldmVudHMgfFxuICogfCBgd2FybmAgfCBNZWRpdW0gfCBXYXJuaW5nIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgaXNzdWVzIHxcbiAqIHwgYGVycm9yYCB8IEhpZ2ggfCBFcnJvciBjb25kaXRpb25zIHJlcXVpcmluZyBhdHRlbnRpb24gfFxuICovXG5leHBvcnQgdHlwZSBMb2dMZXZlbCA9ICdkZWJ1ZycgfCAnaW5mbycgfCAnd2FybicgfCAnZXJyb3InO1xuXG4vKipcbiAqIEFsbCBsb2cgbGV2ZWxzIGluIG9yZGVyIG9mIHNldmVyaXR5IChsb3dlc3QgdG8gaGlnaGVzdCkuXG4gKi9cbmV4cG9ydCBjb25zdCBMT0dfTEVWRUxTID0gWydkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXSBhcyBjb25zdCBzYXRpc2ZpZXMgcmVhZG9ubHkgTG9nTGV2ZWxbXTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nIEV2ZW50IFR5cGVcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBTdHJ1Y3R1cmVkIGxvZyBldmVudCBlbWl0dGVkIGJ5IHRoZSBsb2dnZXIuXG4gKlxuICogRXZlbnRzIGluY2x1ZGUgY29udGV4dHVhbCBkZXRhaWxzIGFib3V0IGhvb2sgZXhlY3V0aW9uIGFuZCBhcmUgc3VpdGFibGUgZm9yXG4gKiBkZWJ1Z2dpbmcsIG1vbml0b3JpbmcsIGFuZCBhbmFseXRpY3MgcGlwZWxpbmVzLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEV4YW1wbGUgbG9nIGV2ZW50XG4gKiBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gKiAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMTVUMTA6MzA6MDAuMDAwWicsXG4gKiAgIGxldmVsOiAnd2FybicsXG4gKiAgIGhvb2tUeXBlOiAnYWN0aW9uLXN0YXJ0JyxcbiAqICAgbWVzc2FnZTogJ0NhcmQgc3RhcnRlZCcsXG4gKiAgIGlucHV0OiB7IGNhcmRJZDogJ2NhcmQtMTIzJyB9XG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nRXZlbnQge1xuICAvKipcbiAgICogSVNPIDg2MDEgdGltZXN0YW1wIG9mIHdoZW4gdGhlIGV2ZW50IG9jY3VycmVkLlxuICAgKiBAZXhhbXBsZSAnMjAyNC0wMS0xNVQxMDozMDowMC4wMDBaJ1xuICAgKi9cbiAgdGltZXN0YW1wOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFNldmVyaXR5IGxldmVsIG9mIHRoZSBsb2cgZXZlbnQuXG4gICAqL1xuICBsZXZlbDogTG9nTGV2ZWw7XG5cbiAgLyoqXG4gICAqIFR5cGUgb2YgaG9vayB0aGF0IGdlbmVyYXRlZCB0aGlzIGV2ZW50LlxuICAgKiBNYXkgYmUgdW5kZWZpbmVkIGZvciBldmVudHMgb3V0c2lkZSBob29rIGNvbnRleHQuXG4gICAqL1xuICBob29rVHlwZT86IHN0cmluZztcblxuICAvKipcbiAgICogSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBoYXBwZW5lZC5cbiAgICovXG4gIG1lc3NhZ2U6IHN0cmluZztcblxuICAvKipcbiAgICogSG9vayBpbnB1dCBkYXRhIGF0IHRoZSB0aW1lIG9mIGxvZ2dpbmcuXG4gICAqXG4gICAqIFRoaXMgaXMgcGFydGlhbCBieSBkZXNpZ24sIHNvIHlvdSBjYW4gYXZvaWQgbG9nZ2luZyBsYXJnZSBvciBzZW5zaXRpdmVcbiAgICogcGF5bG9hZHMgd2hpbGUgc3RpbGwgY2FwdHVyaW5nIGtleSBpZGVudGlmaWVycy5cbiAgICovXG4gIGlucHV0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG5cbiAgLyoqXG4gICAqIEVycm9yIGluZm9ybWF0aW9uIGlmIHRoaXMgZXZlbnQgcmVwcmVzZW50cyBhbiBlcnJvci5cbiAgICogQ29udGFpbnMgc3RydWN0dXJlZCBlcnJvciBkZXRhaWxzIGZvciBhbmFseXNpcy5cbiAgICovXG4gIGVycm9yPzogTG9nRXZlbnRFcnJvcjtcblxuICAvKipcbiAgICogQWRkaXRpb25hbCBjb250ZXh0IGRhdGEgcHJvdmlkZWQgYnkgdGhlIGNhbGxlci5cbiAgICpcbiAgICogVXNlIHRoaXMgZm9yIHN0cnVjdHVyZWQgbWV0YWRhdGEgdGhhdCB5b3Ugd2FudCBkb3duc3RyZWFtIGhhbmRsZXJzXG4gICAqIHRvIHJlY2VpdmUgKGUuZy4sIHJlcXVlc3QgSURzLCB0aW1pbmcgZGF0YSkuXG4gICAqL1xuICBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbi8qKlxuICogU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiB3aXRoaW4gYSBsb2cgZXZlbnQuXG4gKlxuICogRXJyb3JzIGFyZSBub3JtYWxpemVkIHNvIGhhbmRsZXJzIGNhbiBkZXBlbmQgb24gY29uc2lzdGVudCBzaGFwZSwgZXZlbiB3aGVuXG4gKiBjYWxsZXJzIHRocm93IG5vbi1FcnJvciB2YWx1ZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nRXZlbnRFcnJvciB7XG4gIC8qKlxuICAgKiBFcnJvciBuYW1lIChlLmcuLCAnVHlwZUVycm9yJywgJ1ZhbGlkYXRpb25FcnJvcicpLlxuICAgKi9cbiAgbmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBFcnJvciBtZXNzYWdlIGRlc2NyaWJpbmcgd2hhdCB3ZW50IHdyb25nLlxuICAgKi9cbiAgbWVzc2FnZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBTdGFjayB0cmFjZSBpZiBhdmFpbGFibGUuXG4gICAqL1xuICBzdGFjaz86IHN0cmluZztcblxuICAvKipcbiAgICogRXJyb3IgY2F1c2UgY2hhaW4gaWYgdGhlIGVycm9yIHdhcyB3cmFwcGVkLlxuICAgKi9cbiAgY2F1c2U/OiBMb2dFdmVudEVycm9yO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFdmVudCBIYW5kbGVyIFR5cGVcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBIYW5kbGVyIGludm9rZWQgd2hlbiBhIGxvZyBldmVudCBpcyBlbWl0dGVkLlxuICpcbiAqIEhhbmRsZXJzIHJ1biBzeW5jaHJvbm91c2x5LiBFcnJvcnMgdGhyb3duIGJ5IGEgaGFuZGxlciBhcmUgc3dhbGxvd2VkIHNvXG4gKiBsb2dnaW5nIGNhbm5vdCBicmVhayBob29rIGV4ZWN1dGlvbi5cbiAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gaGFuZGxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIHNlcnZpY2VcbiAqIGNvbnN0IGhhbmRsZXI6IExvZ0V2ZW50SGFuZGxlciA9IChldmVudCkgPT4ge1xuICogICBleHRlcm5hbExvZ2dlci5sb2coe1xuICogICAgIGxldmVsOiBldmVudC5sZXZlbCxcbiAqICAgICBtZXNzYWdlOiBldmVudC5tZXNzYWdlLFxuICogICAgIG1ldGFkYXRhOiB7IGhvb2tUeXBlOiBldmVudC5ob29rVHlwZSB9XG4gKiAgIH0pO1xuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBMb2dFdmVudEhhbmRsZXIgPSAoZXZlbnQ6IExvZ0V2ZW50KSA9PiB2b2lkO1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIGEgbG9nIGV2ZW50IGhhbmRsZXIuXG4gKlxuICogQ2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHN0b3AgcmVjZWl2aW5nIGxvZyBldmVudHMuIEFsd2F5cyBjYWxsIHVuc3Vic2NyaWJlXG4gKiB3aGVuIHRoZSBoYW5kbGVyIGlzIG5vIGxvbmdlciBuZWVkZWQgdG8gcHJldmVudCBtZW1vcnkgbGVha3MuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICogLy8gLi4uIGxhdGVyXG4gKiB1bnN1YnNjcmliZSgpOyAvLyBTdG9wIHJlY2VpdmluZyBldmVudHNcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBVbnN1YnNjcmliZSA9ICgpID0+IHZvaWQ7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDb25maWd1cmF0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgTG9nZ2VyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ2dlckNvbmZpZyB7XG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSBmb3IgSlNPTiBMaW5lcyBvdXRwdXQuXG4gICAqXG4gICAqIElmIG5vdCBzZXQsIGZpbGUgbG9nZ2luZyBpcyBkaXNhYmxlZC4gQ2FuIGFsc28gYmUgc2V0IHZpYSB0aGVcbiAgICogYENBUkRTX0hPT0tTX0xPR19GSUxFYCBlbnZpcm9ubWVudCB2YXJpYWJsZS5cbiAgICovXG4gIGxvZ0ZpbGVQYXRoPzogc3RyaW5nO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgSW50ZXJmYWNlIChmb3IgdGVzdGluZyBhbmQgdHlwZSBjb21wYXRpYmlsaXR5KVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIExvZ2dlciBpbnRlcmZhY2UgZm9yIHN0cnVjdHVyZWQsIGNvbnRleHQtYXdhcmUgbG9nZ2luZy5cbiAqXG4gKiBUaGlzIGludGVyZmFjZSBkZWZpbmVzIHRoZSBwdWJsaWMgQVBJIG9mIHRoZSBMb2dnZXIgY2xhc3MuIEl0IGV4aXN0c1xuICogcHJpbWFyaWx5IGZvciB0eXBlIGNvbXBhdGliaWxpdHkgYW5kIHRlc3RpbmcgcHVycG9zZXMsIGFsbG93aW5nIHRlc3RzXG4gKiB0byBtb2NrIHRoZSBsb2dnZXIgd2l0aG91dCBuZWVkaW5nIHRvIGltcGxlbWVudCBhbGwgaW50ZXJuYWwgbWV0aG9kcy5cbiAqXG4gKiBGb3IgcHJvZHVjdGlvbiB1c2UsIHVzZSB0aGUge0BsaW5rIExvZ2dlcn0gY2xhc3Mgb3IgdGhlIHtAbGluayBsb2dnZXJ9XG4gKiBzaW5nbGV0b24gZXhwb3J0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElMb2dnZXIge1xuICAvKipcbiAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRGlhZ25vc3RpYyB0ZXh0IGRlc2NyaWJpbmcgbG93LWxldmVsIGV4ZWN1dGlvbiBkZXRhaWxzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBkZWJ1ZyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIE9wZXJhdGlvbmFsIG1lc3NhZ2UgZGVzY3JpYmluZyBub3JtYWwgaG9vayBwcm9ncmVzcy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgaW5mbyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gV2FybmluZyB0ZXh0IGZvciByZWNvdmVyYWJsZSBvciBzdXNwaWNpb3VzIGNvbmRpdGlvbnMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIHdhcm4obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgdGV4dCBkZXNjcmliaW5nIGEgaGFuZGxlZCBmYWlsdXJlIGNvbmRpdGlvbi5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgZXJyb3IobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGxvZ0Vycm9yKGVycm9yOiB1bmtub3duLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIExvZ2dlciBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBmaWxlIG91dHB1dC5cbiAqXG4gKiBPdXRwdXQgaXMgb3B0LWluIGFuZCBiZXN0LWVmZm9ydDpcbiAqIC0gV2l0aCBubyBoYW5kbGVycyBhbmQgbm8gbG9nIGZpbGUsIGV2ZW50cyBhcmUgZHJvcHBlZC5cbiAqIC0gSGFuZGxlciBlcnJvcnMgYXJlIHN3YWxsb3dlZCBzbyBsb2dnaW5nIGNhbm5vdCBicmVhayBob29rcy5cbiAqIC0gRmlsZSBvdXRwdXQgdXNlcyBKU09OIExpbmVzIGFuZCBpZ25vcmVzIHdyaXRlIGZhaWx1cmVzLlxuICpcbiAqIFRoZSBsb2dnZXIgbmV2ZXIgd3JpdGVzIHRvIHN0ZG91dCBvciBzdGRlcnIuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBldmVudHMgYXQgc3BlY2lmaWMgbGV2ZWxcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4ge1xuICogICBzZW5kQWxlcnQoZXZlbnQubWVzc2FnZSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMb2cgd2l0aGluIGEgaG9vayBoYW5kbGVyXG4gKiBsb2dnZXIud2FybignQWJvdXQgdG8gZXhlY3V0ZSB0YXNrJyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gIC8qKlxuICAgKiBSZWdpc3RlcmVkIGV2ZW50IGhhbmRsZXJzIGJ5IGxvZyBsZXZlbC5cbiAgICovXG4gIHByaXZhdGUgaGFuZGxlcnM6IE1hcDxMb2dMZXZlbCwgU2V0PExvZ0V2ZW50SGFuZGxlcj4+ID0gbmV3IE1hcCgpO1xuXG4gIC8qKlxuICAgKiBGaWxlIGRlc2NyaXB0b3IgZm9yIGxvZyBmaWxlIG91dHB1dC5cbiAgICogTGF6aWx5IGluaXRpYWxpemVkIG9uIGZpcnN0IHdyaXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBsb2dGaWxlRmQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgaWYgY29uZmlndXJlZC5cbiAgICovXG4gIHByaXZhdGUgbG9nRmlsZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGZpbGUgaW5pdGlhbGl6YXRpb24gaGFzIGJlZW4gYXR0ZW1wdGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBmaWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuICAvKipcbiAgICogQ3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50SG9va1R5cGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQ3VycmVudCBob29rIGlucHV0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudElucHV0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBMb2dnZXIgaW5zdGFuY2UuXG4gICAqXG4gICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAqIGNyZWF0aW5nIG5ldyBpbnN0YW5jZXMuXG4gICAqIEBwYXJhbSBjb25maWcgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gVXNlIHNpbmdsZXRvbiAocmVjb21tZW5kZWQpXG4gICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAgICpcbiAgICogLy8gT3IgY3JlYXRlIGN1c3RvbSBpbnN0YW5jZVxuICAgKiBjb25zdCBjdXN0b21Mb2dnZXIgPSBuZXcgTG9nZ2VyKHsgbG9nRmlsZVBhdGg6ICcvdmFyL2xvZy9ob29rcy5sb2cnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogTG9nZ2VyQ29uZmlnID0ge30pIHtcbiAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzIG1hcCBmb3IgZWFjaCBsZXZlbFxuICAgIGZvciAoY29uc3QgbGV2ZWwgb2YgTE9HX0xFVkVMUykge1xuICAgICAgdGhpcy5oYW5kbGVycy5zZXQobGV2ZWwsIG5ldyBTZXQoKSk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGxvZyBmaWxlIHBhdGggZnJvbSBjb25maWcgb3IgZW52aXJvbm1lbnRcbiAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gY29uZmlnLmxvZ0ZpbGVQYXRoID8/IHByb2Nlc3MuZW52WydDQVJEU19IT09LU19MT0dfRklMRSddID8/IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRoYXQgaXMgdHlwaWNhbGx5IG9ubHkgdXNlZnVsXG4gICAqIGR1cmluZyBkZXZlbG9wbWVudCBvciB0cm91Ymxlc2hvb3RpbmcuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRGlhZ25vc3RpYyB0ZXh0IGRlc2NyaWJpbmcgbG93LWxldmVsIGV4ZWN1dGlvbiBkZXRhaWxzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmRlYnVnKCdQcm9jZXNzaW5nIGhvb2sgaW5wdXQnLCB7IHRhc2tJZDogJ3Rhc2stMTIzJywgaW5wdXRTaXplOiAyNTYgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZGVidWcobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2RlYnVnJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZ2VuZXJhbCBvcGVyYXRpb25hbCBldmVudHMgbGlrZSBob29rIGludm9jYXRpb25zLCBzdWNjZXNzZnVsXG4gICAqIGNvbXBsZXRpb25zLCBvciBzdGF0ZSBjaGFuZ2VzLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIE9wZXJhdGlvbmFsIG1lc3NhZ2UgZGVzY3JpYmluZyBub3JtYWwgaG9vayBwcm9ncmVzcy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci5pbmZvKCdUYXNrIHN0YXJ0ZWQnLCB7IHRhc2tJZDogJ3Rhc2stMTIzJywgY2FyZElkOiAnY2FyZC00NTYnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGluZm8obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2luZm8nLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgY2FyZHMgYnV0IGRvbid0IHByZXZlbnRcbiAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gV2FybmluZyB0ZXh0IGZvciByZWNvdmVyYWJsZSBvciBzdXNwaWNpb3VzIGNvbmRpdGlvbnMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIud2FybignRGVwcmVjYXRlZCBob29rIHBhdHRlcm4gZGV0ZWN0ZWQnLCB7IHBhdHRlcm46ICdsZWdhY3lNYXRjaGVyJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICB3YXJuKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCd3YXJuJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGVycm9yIGNvbmRpdGlvbnMgdGhhdCByZXF1aXJlIGF0dGVudGlvbiBidXQgd2VyZSBoYW5kbGVkXG4gICAqIGdyYWNlZnVsbHkuIEZvciBleGNlcHRpb25zLCBwcmVmZXIge0BsaW5rIGxvZ0Vycm9yfS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciB0ZXh0IGRlc2NyaWJpbmcgYSBoYW5kbGVkIGZhaWx1cmUgY29uZGl0aW9uLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gdmFsaWRhdGUgaG9vayBpbnB1dCcsIHsgcmVhc29uOiAnZW1wdHkgdGFza0lkJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBlcnJvcihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnZXJyb3InLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICpcbiAgICogVXNlIHRoaXMgZm9yIGNhdWdodCBleGNlcHRpb25zLiBOb24tRXJyb3IgdmFsdWVzIGFyZSBub3JtYWxpemVkIHNvIGhhbmRsZXJzXG4gICAqIGFsd2F5cyByZWNlaXZlIGEgY29uc2lzdGVudCBlcnJvciBzaGFwZS5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiB0cnkge1xuICAgKiAgIGF3YWl0IGRhbmdlcm91c09wZXJhdGlvbigpO1xuICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnRmFpbGVkIHRvIGV4ZWN1dGUgZGFuZ2Vyb3VzIG9wZXJhdGlvbicsIHtcbiAgICogICAgIG9wZXJhdGlvbjogJ2RlbGV0ZScsXG4gICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgKiAgIH0pO1xuICAgKiB9XG4gICAqIGBgYFxuICAgKi9cbiAgbG9nRXJyb3IoZXJyb3I6IHVua25vd24sIG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgY29uc3QgZXJyb3JJbmZvID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yKTtcblxuICAgIGNvbnN0IGV2ZW50OiBMb2dFdmVudCA9IHtcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgbGV2ZWw6ICdlcnJvcicsXG4gICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgZXJyb3I6IGVycm9ySW5mbyxcbiAgICAgIGNvbnRleHRcbiAgICB9O1xuXG4gICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZXMgYSBoYW5kbGVyIHRvIGxvZyBldmVudHMgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICpcbiAgICogVGhlIGhhbmRsZXIgd2lsbCBiZSBjYWxsZWQgZm9yIGV2ZXJ5IGxvZyBldmVudCBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBoYW5kbGVyXG4gICAqIGlzIG5vIGxvbmdlciBuZWVkZWQuIEhhbmRsZXIgZXJyb3JzIGFyZSBpZ25vcmVkIHRvIGF2b2lkIGRpc3J1cHRpbmcgaG9va3MuXG4gICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBsb2cgbGV2ZWwgdG8gc3Vic2NyaWJlIHRvXG4gICAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBldmVudFxuICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIHRoZSBoYW5kbGVyXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gU3Vic2NyaWJlIHRvIGVycm9yIGV2ZW50c1xuICAgKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAgICogICBjb25zb2xlLmVycm9yKGBbJHtldmVudC5ob29rVHlwZX1dICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAgICogICBpZiAoZXZlbnQuZXJyb3IpIHtcbiAgICogICAgIGNvbnNvbGUuZXJyb3IoZXZlbnQuZXJyb3Iuc3RhY2spO1xuICAgKiAgIH1cbiAgICogfSk7XG4gICAqXG4gICAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICAgKiB1bnN1YnNjcmliZSgpO1xuICAgKiBgYGBcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBGb3J3YXJkIHRvIGV4dGVybmFsIGxvZ2dpbmcgbGlicmFyeVxuICAgKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAgICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oKTtcbiAgICpcbiAgICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgKiBgYGBcbiAgICovXG4gIG9uKGxldmVsOiBMb2dMZXZlbCwgaGFuZGxlcjogTG9nRXZlbnRIYW5kbGVyKTogVW5zdWJzY3JpYmUge1xuICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChsZXZlbCk7XG4gICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgIGxldmVsSGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICAgIH1cblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBsZXZlbEhhbmRsZXJzPy5kZWxldGUoaGFuZGxlcik7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqXG4gICAqIFRoaXMgaXMgY2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYmVmb3JlIGludm9raW5nIGhvb2sgaGFuZGxlcnMuXG4gICAqIFlvdSB0eXBpY2FsbHkgZG9uJ3QgbmVlZCB0byBjYWxsIHRoaXMgZGlyZWN0bHkuXG4gICAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSB0eXBlIG9mIGhvb2sgYmVpbmcgZXhlY3V0ZWRcbiAgICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgZGF0YVxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNldENvbnRleHQoaG9va1R5cGU6IHN0cmluZyB8IHVuZGVmaW5lZCwgaW5wdXQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSBob29rVHlwZTtcbiAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IGlucHV0O1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFycyB0aGUgY3VycmVudCBob29rIGNvbnRleHQuXG4gICAqXG4gICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBjbGVhckNvbnRleHQoKTogdm9pZCB7XG4gICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5jdXJyZW50SW5wdXQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyBhIGRlZmF1bHQgbG9nIGZpbGUgcGF0aCB0aGF0IG9ubHkgdGFrZXMgZWZmZWN0IGlmIG5vIG90aGVyIHNvdXJjZVxuICAgKiBoYXMgY29uZmlndXJlZCBmaWxlIGxvZ2dpbmcuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIGxvd2VzdC1wcmlvcml0eSBmaWxlIHBhdGggc291cmNlLiBJdCB3aWxsIGJlIGlnbm9yZWQgaWZcbiAgICogYW55IG9mIHRoZXNlIGhhdmUgYWxyZWFkeSBzZXQgYSBwYXRoOlxuICAgKiAtIGBsb2dGaWxlUGF0aGAgaW4gdGhlIGNvbnN0cnVjdG9yIGNvbmZpZ1xuICAgKiAtIGBDQVJEU19IT09LU19MT0dfRklMRWAgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAgICogLSB7QGxpbmsgc2V0TG9nRmlsZX0gY2FsbGVkIGF0IHJ1bnRpbWVcbiAgICpcbiAgICogSW50ZW5kZWQgZm9yIHVzZSBieSBDTEkgZW50cnkgcG9pbnRzIChlLmcuLCB0aGUgYC0tbG9nYCBmbGFnKS5cbiAgICogQHBhcmFtIGZpbGVQYXRoIC0gRGVmYXVsdCBwYXRoIHRvIHRoZSBsb2cgZmlsZVxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFdpcmUgLS1sb2cgQ0xJIGFyZ3VtZW50IGFzIGEgZmFsbGJhY2tcbiAgICogaWYgKGFyZ3MubG9nKSB7XG4gICAqICAgbG9nZ2VyLnNldERlZmF1bHRMb2dGaWxlKGFyZ3MubG9nKTtcbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIHNldERlZmF1bHRMb2dGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2dGaWxlUGF0aCA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29uZmlndXJlcyB0aGUgbG9nIGZpbGUgcGF0aCBhdCBydW50aW1lLlxuICAgKlxuICAgKiBDYWxsIHRoaXMgdG8gZW5hYmxlIG9yIGNoYW5nZSBmaWxlIGxvZ2dpbmcuIFNldHRpbmcgdG8gYG51bGxgIGRpc2FibGVzXG4gICAqIGZpbGUgbG9nZ2luZyBhbmQgY2xvc2VzIGFueSBvcGVuIGZpbGUgaGFuZGxlLiBEaXJlY3RvcmllcyBhcmUgY3JlYXRlZFxuICAgKiBvbiBkZW1hbmQgd2hlbiB0aGUgZmlyc3Qgd3JpdGUgb2NjdXJzLlxuICAgKiBAcGFyYW0gZmlsZVBhdGggLSBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgb3IgbnVsbCB0byBkaXNhYmxlXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gRW5hYmxlIGZpbGUgbG9nZ2luZyBhdCBydW50aW1lXG4gICAqIGxvZ2dlci5zZXRMb2dGaWxlKCcvdmFyL2xvZy9jYXJkcy1zZGsubG9nJyk7XG4gICAqXG4gICAqIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nXG4gICAqIGxvZ2dlci5zZXRMb2dGaWxlKG51bGwpO1xuICAgKiBgYGBcbiAgICovXG4gIHNldExvZ0ZpbGUoZmlsZVBhdGg6IHN0cmluZyB8IG51bGwpOiB2b2lkIHtcbiAgICAvLyBDbG9zZSBleGlzdGluZyBmaWxlIGlmIG9wZW5cbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgfVxuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyBhbGwgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIGxvZ2dlci5cbiAgICpcbiAgICogQ2FsbCB0aGlzIGR1cmluZyBncmFjZWZ1bCBzaHV0ZG93biB0byBlbnN1cmUgYWxsIGxvZyBkYXRhIGlzIGZsdXNoZWQuXG4gICAqIFNhZmUgdG8gY2FsbCBtdWx0aXBsZSB0aW1lcy5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgKiAgIGxvZ2dlci5jbG9zZSgpO1xuICAgKiB9KTtcbiAgICogYGBgXG4gICAqL1xuICBjbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgfVxuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGVyZSBhcmUgYW55IGFjdGl2ZSBoYW5kbGVycyBvciBkZXN0aW5hdGlvbnMuXG4gICAqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgaGFuZGxlcnMgYXJlIHJlZ2lzdGVyZWQgb3IgZmlsZSBsb2dnaW5nIGlzIGVuYWJsZWQuXG4gICAqIFVzZWZ1bCBmb3IgZGVjaWRpbmcgd2hldGhlciB0byBjb21wdXRlIGV4cGVuc2l2ZSBsb2cgY29udGV4dC5cbiAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICovXG4gIGhhc0Rlc3RpbmF0aW9ucygpOiBib29sZWFuIHtcbiAgICBjb25zdCBoYXNIYW5kbGVycyA9IEFycmF5LmZyb20odGhpcy5oYW5kbGVycy52YWx1ZXMoKSkuc29tZSgoaGFuZGxlcnMpID0+IGhhbmRsZXJzLnNpemUgPiAwKTtcbiAgICByZXR1cm4gaGFzSGFuZGxlcnMgfHwgdGhpcy5sb2dGaWxlUGF0aCAhPT0gbnVsbDtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvKipcbiAgICogRW1pdHMgYSBsb2cgZXZlbnQuXG4gICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBzZXZlcml0eSBsZXZlbCBvZiB0aGUgZXZlbnRcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgbG9nIG1lc3NhZ2VcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHQgZGF0YVxuICAgKi9cbiAgcHJpdmF0ZSBlbWl0KGxldmVsOiBMb2dMZXZlbCwgbWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIGxldmVsLFxuICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgIGNvbnRleHRcbiAgICB9O1xuXG4gICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGl2ZXJzIGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGRlc3RpbmF0aW9ucy5cbiAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byBkZWxpdmVyXG4gICAqL1xuICBwcml2YXRlIGRlbGl2ZXJFdmVudChldmVudDogTG9nRXZlbnQpOiB2b2lkIHtcbiAgICAvLyBEZWxpdmVyIHRvIGV2ZW50IGhhbmRsZXJzXG4gICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGV2ZW50LmxldmVsKTtcbiAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGhhbmRsZXIgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXcml0ZSB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICB0aGlzLndyaXRlVG9GaWxlKGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIHdyaXRlXG4gICAqL1xuICBwcml2YXRlIHdyaXRlVG9GaWxlKGV2ZW50OiBMb2dFdmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgLy8gTGF6eSBpbml0aWFsaXphdGlvbiBvZiBmaWxlIGhhbmRsZVxuICAgIGlmICghdGhpcy5maWxlSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpbGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgPT09IG51bGwpIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBsaW5lID0gYCR7SlNPTi5zdHJpbmdpZnkoZXZlbnQpfVxcbmA7XG4gICAgICB3cml0ZVN5bmModGhpcy5sb2dGaWxlRmQsIGxpbmUpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgd3JpdGUgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAvLyBUaGlzIGZvbGxvd3MgdGhlIHJpc2sgbWl0aWdhdGlvbjogXCJHcmFjZWZ1bCBkZWdyYWRhdGlvbiAtIGxvZyB3cml0ZVxuICAgICAgLy8gZmFpbHVyZXMgYXJlIHNpbGVudGx5IGlnbm9yZWQgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cIlxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgbG9nIGZpbGUgZm9yIHdyaXRpbmcuXG4gICAqL1xuICBwcml2YXRlIGluaXRpYWxpemVGaWxlKCk6IHZvaWQge1xuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIEVuc3VyZSBkaXJlY3RvcnkgZXhpc3RzXG4gICAgICBjb25zdCBkaXIgPSBkaXJuYW1lKHRoaXMubG9nRmlsZVBhdGgpO1xuICAgICAgaWYgKCFleGlzdHNTeW5jKGRpcikpIHtcbiAgICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIE9wZW4gZmlsZSBmb3IgYXBwZW5kaW5nXG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG9wZW5TeW5jKHRoaXMubG9nRmlsZVBhdGgsICdhJyk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSBpbml0aWFsaXphdGlvbiBlcnJvcnNcbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBleHRyYWN0IGluZm9ybWF0aW9uIGZyb21cbiAgICogQHJldHVybnMgU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvblxuICAgKi9cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3JJbmZvKGVycm9yOiB1bmtub3duKTogTG9nRXZlbnRFcnJvciB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIGNvbnN0IGluZm86IExvZ0V2ZW50RXJyb3IgPSB7XG4gICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xuICAgICAgfTtcblxuICAgICAgLy8gRXh0cmFjdCBjYXVzZSBjaGFpbiBpZiBwcmVzZW50XG4gICAgICBpZiAoZXJyb3IuY2F1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpbmZvLmNhdXNlID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yLmNhdXNlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGluZm87XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIG5vbi1FcnJvciB2YWx1ZXNcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ1Vua25vd25FcnJvcicsXG4gICAgICBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpXG4gICAgfTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTaW5nbGV0b24gRXhwb3J0XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzLlxuICpcbiAqIFVzZSB0aGlzIHNpbmdsZXRvbiBmb3IgYWxsIGxvZ2dpbmcgd2l0aGluIGhvb2tzLiBUaGUgbG9nZ2VyIGlzIGNvbmZpZ3VyZWRcbiAqIHZpYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHN1cHBvcnRzIGV2ZW50IHN1YnNjcmlwdGlvbiBmb3IgY3VzdG9tXG4gKiBkZXN0aW5hdGlvbnMuXG4gKlxuICogIyMgQ29uZmlndXJhdGlvblxuICpcbiAqIHwgRW52aXJvbm1lbnQgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8XG4gKiB8LS0tLS0tLS0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18XG4gKiB8IGBDQVJEU19IT09LU19MT0dfRklMRWAgfCBQYXRoIHRvIGxvZyBmaWxlIChKU09OIExpbmVzIGZvcm1hdCkgfFxuICpcbiAqICMjIFVzYWdlIGluIEhvb2tzXG4gKlxuICogVGhlIGxvZ2dlciBjYW4gYmUgdXNlZCBkaXJlY3RseSB3aXRoaW4gaG9vayBoYW5kbGVyczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogLy8gSW4gYSBob29rIGhhbmRsZXJcbiAqIGxvZ2dlci53YXJuKCdUYXNrIHN0YXJ0aW5nIGluIGludGVyYWN0aXZlIG1vZGUnKTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAqXG4gKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubyh7IGxldmVsOiAnZGVidWcnIH0pO1xuICpcbiAqIGxvZ2dlci5vbignZGVidWcnLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZGVidWcoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRGlyZWN0IHVzYWdlXG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIG9wZXJhdGlvbicpO1xuICogbG9nZ2VyLndhcm4oJ1Jlc291cmNlIGxpbWl0IGFwcHJvYWNoaW5nJywgeyB1c2FnZTogMC45IH0pO1xuICpcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IHJpc2t5T3BlcmF0aW9uKCk7XG4gKiB9IGNhdGNoIChlcnIpIHtcbiAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ1Jpc2t5IG9wZXJhdGlvbiBmYWlsZWQnKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuIiwgIi8qKlxuICogU29ja2V0IGNsaWVudCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gKlxuICogQ29ubmVjdHMgdG8gYSBVbml4IGRvbWFpbiBzb2NrZXQgY3JlYXRlZCBieSBBY3Rpb25EaXNwYXRjaGVyIGFuZCBoYW5kbGVzXG4gKiBOREpTT04gKG5ld2xpbmUtZGVsaW1pdGVkIEpTT04pIHByb3RvY29sIGZvciByZWNlaXZpbmcgY29tbWFuZHMgYW5kIHNlbmRpbmdcbiAqIHJlc3BvbnNlcy5cbiAqXG4gKlxuICogQHN1bW1hcnkgU29ja2V0IGNsaWVudCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb25cbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgKiBhcyBuZXQgZnJvbSAnbm9kZTpuZXQnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENvbW1hbmRzIHRoYXQgY2FuIGJlIHJlY2VpdmVkIGZyb20gdGhlIEFjdGlvbkRpc3BhdGNoZXIgdmlhIHNvY2tldC5cbiAqXG4gKiBVc2VzIE5ESlNPTiAobmV3bGluZS1kZWxpbWl0ZWQgSlNPTikgcHJvdG9jb2wuXG4gKi9cbmV4cG9ydCB0eXBlIFNvY2tldENvbW1hbmQgPSB7IHR5cGU6ICdjYW5jZWwnIH0gfCB7IHR5cGU6ICdzd2l0Y2hUb0ludGVyYWN0aXZlJyB9O1xuXG4vKipcbiAqIFJlc3BvbnNlIHNlbnQgYmFjayB0byB0aGUgQWN0aW9uRGlzcGF0Y2hlciB3aGVuIHN3aXRjaFRvSW50ZXJhY3RpdmUgaXMgaGFuZGxlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2Uge1xuICB0eXBlOiAnc3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlJztcbiAgZGF0YTogdW5rbm93bjtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU29ja2V0Q2xpZW50XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ2xpZW50IGZvciB0aGUgTkRKU09OIHNvY2tldCBwcm90b2NvbCBiZXR3ZWVuIHRoZSBhY3Rpb24gcnVudGltZSBhbmRcbiAqIEFjdGlvbkRpc3BhdGNoZXIuXG4gKlxuICogUmVjZWl2ZXMgY29tbWFuZHMgKGNhbmNlbCwgc3dpdGNoVG9JbnRlcmFjdGl2ZSkgYW5kIHNlbmRzIHJlc3BvbnNlc1xuICogKHN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSkgb3ZlciBhIFVuaXggZG9tYWluIHNvY2tldC5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2xpZW50ID0gYXdhaXQgU29ja2V0Q2xpZW50LmNvbm5lY3QoJy9wYXRoL3RvL3NvY2tldCcpO1xuICogY2xpZW50Lm9uQ29tbWFuZCgoY29tbWFuZCkgPT4ge1xuICogICBpZiAoY29tbWFuZC50eXBlID09PSAnY2FuY2VsJykgeyAuLi4gfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIFNvY2tldENsaWVudCB7XG4gIHByaXZhdGUgc29ja2V0OiBuZXQuU29ja2V0O1xuICBwcml2YXRlIGJ1ZmZlciA9ICcnO1xuICBwcml2YXRlIGNvbW1hbmRIYW5kbGVyPzogKGNvbW1hbmQ6IFNvY2tldENvbW1hbmQpID0+IHZvaWQ7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3Rvcihzb2NrZXQ6IG5ldC5Tb2NrZXQpIHtcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcblxuICAgIHNvY2tldC5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgdGhpcy5idWZmZXIgKz0gY2h1bmsudG9TdHJpbmcoKTtcbiAgICAgIC8vIFBhcnNlIE5ESlNPTiAtIHNwbGl0IGJ5IG5ld2xpbmVzXG4gICAgICBjb25zdCBsaW5lcyA9IHRoaXMuYnVmZmVyLnNwbGl0KCdcXG4nKTtcbiAgICAgIHRoaXMuYnVmZmVyID0gbGluZXMucG9wKCkgPz8gJyc7IC8vIEtlZXAgaW5jb21wbGV0ZSBsaW5lIGluIGJ1ZmZlclxuXG4gICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgICAgaWYgKGxpbmUudHJpbSgpID09PSAnJykgY29udGludWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShsaW5lKSBhcyBTb2NrZXRDb21tYW5kO1xuICAgICAgICAgIHRoaXMuY29tbWFuZEhhbmRsZXI/LihwYXJzZWQpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBNYWxmb3JtZWQgSlNPTiBvbiBzb2NrZXQgaXMgaWdub3JlZCAocGVyIHBsYW4pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25uZWN0IHRvIGEgVW5peCBkb21haW4gc29ja2V0IGF0IHRoZSBnaXZlbiBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gc29ja2V0UGF0aCAtIFBhdGggdG8gdGhlIFVuaXggZG9tYWluIHNvY2tldFxuICAgKiBAcmV0dXJucyBBIGNvbm5lY3RlZCBTb2NrZXRDbGllbnQgaW5zdGFuY2VcbiAgICogQHRocm93cyBFcnJvciBpZiB0aGUgY29ubmVjdGlvbiBmYWlsc1xuICAgKi9cbiAgc3RhdGljIGNvbm5lY3Qoc29ja2V0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxTb2NrZXRDbGllbnQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgc29ja2V0ID0gbmV0LmNyZWF0ZUNvbm5lY3Rpb24oc29ja2V0UGF0aCwgKCkgPT4ge1xuICAgICAgICByZXNvbHZlKG5ldyBTb2NrZXRDbGllbnQoc29ja2V0KSk7XG4gICAgICB9KTtcbiAgICAgIHNvY2tldC5vbignZXJyb3InLCByZWplY3QpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgaGFuZGxlciBmb3IgaW5jb21pbmcgc29ja2V0IGNvbW1hbmRzLlxuICAgKlxuICAgKiBPbmx5IG9uZSBoYW5kbGVyIGNhbiBiZSByZWdpc3RlcmVkIGF0IGEgdGltZS4gU3Vic2VxdWVudCBjYWxscyByZXBsYWNlXG4gICAqIHRoZSBwcmV2aW91cyBoYW5kbGVyLlxuICAgKlxuICAgKiBAcGFyYW0gaGFuZGxlciAtIEZ1bmN0aW9uIHRvIGNhbGwgd2hlbiBhIGNvbW1hbmQgaXMgcmVjZWl2ZWRcbiAgICovXG4gIG9uQ29tbWFuZChoYW5kbGVyOiAoY29tbWFuZDogU29ja2V0Q29tbWFuZCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuY29tbWFuZEhhbmRsZXIgPSBoYW5kbGVyO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgYSByZXNwb25zZSBiYWNrIHRvIHRoZSBBY3Rpb25EaXNwYXRjaGVyLlxuICAgKlxuICAgKiBAcGFyYW0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgdG8gc2VuZCBhcyBOREpTT05cbiAgICovXG4gIHNlbmRSZXNwb25zZShyZXNwb25zZTogU3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlKTogdm9pZCB7XG4gICAgdGhpcy5zb2NrZXQud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpfVxcbmApO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgYSByZXNwb25zZSBhbmQgY2FsbCBjYWxsYmFjayB3aGVuIGZsdXNoZWQuXG4gICAqXG4gICAqIFVzZWQgdG8gZ3VhcmFudGVlIGZsdXNoIGJlZm9yZSBwcm9jZXNzLmV4aXQuXG4gICAqXG4gICAqIEBwYXJhbSByZXNwb25zZSAtIFRoZSByZXNwb25zZSB0byBzZW5kIGFzIE5ESlNPTlxuICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBDYWxsZWQgYWZ0ZXIgdGhlIGRhdGEgaXMgZmx1c2hlZCB0byB0aGUgc29ja2V0XG4gICAqL1xuICBzZW5kUmVzcG9uc2VUaGVuKHJlc3BvbnNlOiBTd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UsIGNhbGxiYWNrOiAoKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5zb2NrZXQud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpfVxcbmAsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZSB0aGUgc29ja2V0IGNvbm5lY3Rpb24uXG4gICAqL1xuICBjbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLnNvY2tldC5kZXN0cm95KCk7XG4gIH1cbn1cbiIsICIvKipcbiAqIFJ1bnRpbWUgb3JjaGVzdHJhdGlvbiBmb3IgY29tcGlsZWQgQ2FyZHMgYWN0aW9uIGFuZCB0eXBlIGhhbmRsZXJzLlxuICpcbiAqIFRoaXMgbW9kdWxlIGlzIGJ1bmRsZWQgaW50byBjb21waWxlZCBoYW5kbGVycyBieSB0aGUgQ0xJLiBJdCBwcm92aWRlcyB0aGVcbiAqIGV4ZWN1dGlvbiBoYXJuZXNzIHRoYXQgcmVhZHMgaGFuZGxlciBpbnB1dCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcywgc2V0c1xuICogdXAgdGhlIGxvZ2dlciBjb250ZXh0LCBpbnZva2VzIHRoZSB1c2VyJ3MgaGFuZGxlciwgYW5kIGV4aXRzIHRoZSBwcm9jZXNzXG4gKiB3aXRoIHRoZSBhcHByb3ByaWF0ZSBjb2RlLlxuICpcbiAqIFRoZSBydW50aW1lIGlzIGRlc2lnbmVkIHRvIG5ldmVyIHJldHVybiBpbiBub3JtYWwgdXNlLiBBbGwgY29kZSBwYXRoc1xuICogdGVybWluYXRlIHdpdGggYHByb2Nlc3MuZXhpdCgpYC4gVGhlIG9ubHkgZXhjZXB0aW9uIGlzIHRlc3Qgc2NlbmFyaW9zXG4gKiB3aGVyZSBgcHJvY2Vzcy5leGl0YCBpcyBtb2NrZWQuXG4gKlxuICogIyMgRXhlY3V0aW9uIEZsb3dcbiAqXG4gKiAxLiBFeHRyYWN0IGlucHV0IHBheWxvYWQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYmFzZWQgb24gY29tbWFuZCB0eXBlXG4gKiAyLiBTZXQgbG9nZ2VyIGNvbnRleHQgd2l0aCBjb21tYW5kIHR5cGUgYW5kIGlucHV0XG4gKiAzLiBPcHRpb25hbGx5IGNvbm5lY3QgdG8gU09DS0VUX1BBVEggZm9yIGNvbW1hbmQgZGlzcGF0Y2ggKGZhaWwtb3BlbilcbiAqIDQuIEJ1aWxkIEFjdGlvbkNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIHNvY2tldC1iYWNrZWQgY2FsbGJhY2tzXG4gKiA1LiBJbnZva2UgdGhlIGNvbW1hbmQgd2l0aCBpbnB1dCBhbmQgY29udGV4dFxuICogNi4gT24gc3VjY2VzczogY2xlYW4gdXAgc29ja2V0IGFuZCBleGl0IHdpdGggY29kZSAwXG4gKiA3LiBPbiBlcnJvcjogbG9nIGVycm9yLCB3cml0ZSB0byBzdGRlcnIsIGNsZWFuIHVwIGFuZCBleGl0IHdpdGggY29kZSAxXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFJ1bnRpbWUgb3JjaGVzdHJhdGlvbiBmb3IgY29tcGlsZWQgQ2FyZHMgYWN0aW9uIGFuZCB0eXBlIGhhbmRsZXJzXG4gKiBAbW9kdWxlXG4gKiBAc2VlIHtAbGluayBleGVjdXRlQ29tbWFuZH0gZm9yIHRoZSBtYWluIGVudHJ5IHBvaW50XG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFRoaXMgaXMgd2hhdCBjb21waWxlZCBoYW5kbGVycyBsb29rIGxpa2UgaW50ZXJuYWxseVxuICogaW1wb3J0IHsgZXhlY3V0ZUNvbW1hbmQgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZy9ydW50aW1lJztcbiAqIGltcG9ydCBteUNvbW1hbmQgZnJvbSAnLi9teS1jb21tYW5kLmpzJztcbiAqXG4gKiBleGVjdXRlQ29tbWFuZChteUNvbW1hbmQpO1xuICogYGBgXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db21tYW5kLCBUeXBlQ3JlYXRlQ29tbWFuZCwgVHlwZURlbGV0ZUNvbW1hbmQsIFR5cGVVcGRhdGVDb21tYW5kIH0gZnJvbSAnLi9jb21tYW5kLXR5cGVzLmpzJztcbmltcG9ydCB7IENBUkRTX0VOVl9WQVJTLCBleHRyYWN0QWN0aW9uSW5wdXQsIGV4dHJhY3RUeXBlSW5wdXQgfSBmcm9tICcuL2Vudi5qcyc7XG5pbXBvcnQgeyBFWElUX0NPREVTLCB3cml0ZUVycm9yIH0gZnJvbSAnLi9leGl0LWNvZGVzLmpzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29udGV4dCwgQWN0aW9uSW5wdXQsIFR5cGVIb29rQ29udGV4dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB0eXBlIHsgU29ja2V0Q29tbWFuZCB9IGZyb20gJy4vc29ja2V0LWNsaWVudC5qcyc7XG5pbXBvcnQgeyBTb2NrZXRDbGllbnQgfSBmcm9tICcuL3NvY2tldC1jbGllbnQuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb21tYW5kIFR5cGUgVW5pb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBVbmlvbiBvZiBhbGwgY29tbWFuZCB0eXBlcyBzdXBwb3J0ZWQgYnkgdGhlIHJ1bnRpbWUuXG4gKlxuICogVGhpcyB0eXBlIHVuaW9uIGFsbG93cyB7QGxpbmsgZXhlY3V0ZUNvbW1hbmR9IHRvIGFjY2VwdCBhbnkgY29tbWFuZCByZXR1cm5lZCBieVxuICogdGhlIGZhY3RvcnkgZnVuY3Rpb25zLiBUaGUgcnVudGltZSBkaXNwYXRjaGVzIGJhc2VkIG9uIHRoZSBgZmFjdG9yeVR5cGVgXG4gKiBkaXNjcmltaW5hbnQuXG4gKlxuICogTm90ZTogVHlwZVZhbGlkYXRvckNvbW1hbmQgaXMgZXhjbHVkZWQgYmVjYXVzZSB2YWxpZGF0b3JzIHVzZSBhIGRpZmZlcmVudFxuICogZXhlY3V0aW9uIG1vZGVsIChmaWxlLXBhdGggcHJvdG9jb2wgdmlhIHtAbGluayBleGVjdXRlVmFsaWRhdGlvbn0pLlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG50eXBlIEFueUNvbW1hbmQgPSBBY3Rpb25Db21tYW5kIHwgVHlwZUNyZWF0ZUNvbW1hbmQgfCBUeXBlVXBkYXRlQ29tbWFuZCB8IFR5cGVEZWxldGVDb21tYW5kO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBIZWxwZXIgRnVuY3Rpb25zXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogTm9ybWFsaXplcyBhbiB1bmtub3duIGVycm9yIHZhbHVlIGludG8gYSBodW1hbi1yZWFkYWJsZSBtZXNzYWdlLlxuICpcbiAqIEVycm9ycyBpbiBKYXZhU2NyaXB0IGNhbiBiZSB0aHJvd24gd2l0aCBhbnkgdmFsdWUuIFRoaXMgZnVuY3Rpb24gZW5zdXJlc1xuICogd2UgYWx3YXlzIGdldCBhIHN0cmluZyBtZXNzYWdlIHJlZ2FyZGxlc3Mgb2Ygd2hhdCB3YXMgdGhyb3duLlxuICpcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBjYXVnaHQgZXJyb3IgdmFsdWUsIHdoaWNoIG1heSBvciBtYXkgbm90IGJlIGFuIEVycm9yIGluc3RhbmNlXG4gKiBAcmV0dXJucyBBIHN0cmluZyBtZXNzYWdlIHN1aXRhYmxlIGZvciBsb2dnaW5nIG9yIGRpc3BsYXlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZ2V0RXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuLyoqXG4gKiBDbGVhbnMgdXAgbG9nZ2VyIHN0YXRlIGFuZCB0ZXJtaW5hdGVzIHRoZSBwcm9jZXNzLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gbmV2ZXIgcmV0dXJucy4gSXQgY2xlYXJzIHRoZSBsb2dnZXIncyBjb250ZXh0LCBjbG9zZXNcbiAqIG9wZW4gZmlsZSBoYW5kbGVzIHRvIGZsdXNoIHBlbmRpbmcgd3JpdGVzLCBhbmQgZXhpdHMgd2l0aCB0aGUgc3BlY2lmaWVkXG4gKiBjb2RlLlxuICpcbiAqIEBwYXJhbSBleGl0Q29kZSAtIFRoZSBleGl0IGNvZGUgdG8gcGFzcyB0byBgcHJvY2Vzcy5leGl0KClgXG4gKiBAcmV0dXJucyBOZXZlciByZXR1cm5zOyBwcm9jZXNzIHRlcm1pbmF0ZXNcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY2xlYW51cEFuZEV4aXQoZXhpdENvZGU6IG51bWJlcik6IG5ldmVyIHtcbiAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICBsb2dnZXIuY2xvc2UoKTtcbiAgcHJvY2Vzcy5leGl0KGV4aXRDb2RlKTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGVycm9ycyBkdXJpbmcgZW52aXJvbm1lbnQgdmFyaWFibGUgZXh0cmFjdGlvbi5cbiAqXG4gKiBFbnZpcm9ubWVudCBleHRyYWN0aW9uIGNhbiBmYWlsIGlmIHJlcXVpcmVkIHZhcmlhYmxlcyBhcmUgbWlzc2luZyBvclxuICogbWFsZm9ybWVkLiBUaGlzIHByb3ZpZGVzIHVzZXItZnJpZW5kbHkgZXJyb3Igb3V0cHV0IGFuZCBlbnN1cmVzIHByb3BlclxuICogY2xlYW51cCBiZWZvcmUgZXhpdC5cbiAqXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIGR1cmluZyBleHRyYWN0aW9uXG4gKiBAcmV0dXJucyBOZXZlciByZXR1cm5zOyBwcm9jZXNzIHRlcm1pbmF0ZXMgd2l0aCBlcnJvciBjb2RlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUVudkV4dHJhY3Rpb25FcnJvcihlcnJvcjogdW5rbm93bik6IG5ldmVyIHtcbiAgY29uc3QgbWVzc2FnZSA9IGdldEVycm9yTWVzc2FnZShlcnJvcik7XG4gIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGV4dHJhY3QgaW5wdXQgZnJvbSBlbnZpcm9ubWVudDogJHttZXNzYWdlfWApO1xuICB3cml0ZUVycm9yKGBIYW5kbGVyIGZhaWxlZDogJHttZXNzYWdlfWApO1xuICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGVycm9ycyB0aHJvd24gYnkgdGhlIHVzZXIncyBjb21tYW5kIGhhbmRsZXIuXG4gKlxuICogV2hlbiBhIGhhbmRsZXIgdGhyb3dzIG9yIHJlamVjdHMsIHdlIHdhbnQgdG8gcHJvdmlkZSB1c2VmdWwgZGVidWdnaW5nXG4gKiBpbmZvcm1hdGlvbi4gVGhpcyB3cml0ZXMgdGhlIGZ1bGwgc3RhY2sgdHJhY2UgdG8gc3RkZXJyICh3aGljaCB0aGVcbiAqIGV4ZWN1dGlvbiB3cmFwcGVyIGNhcHR1cmVzKSBhbmQgbG9ncyBhIHN0cnVjdHVyZWQgZXJyb3IgZXZlbnQuXG4gKlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRocm93biBvciByZWplY3Rpb24gcmVhc29uIGZyb20gdGhlIGhhbmRsZXJcbiAqIEByZXR1cm5zIE5ldmVyIHJldHVybnM7IHByb2Nlc3MgdGVybWluYXRlcyB3aXRoIGVycm9yIGNvZGVcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yOiB1bmtub3duKTogbmV2ZXIge1xuICBjb25zdCBlcnJvck91dHB1dCA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyAoZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZSkgOiBTdHJpbmcoZXJyb3IpO1xuICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtlcnJvck91dHB1dH1cXG5gKTtcbiAgbG9nZ2VyLmVycm9yKGBIYW5kbGVyIGVycm9yOiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGVjdXRlIEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRXhlY3V0ZXMgYSBjb21tYW5kIGhhbmRsZXIgd2l0aCBmdWxsIHJ1bnRpbWUgb3JjaGVzdHJhdGlvbi5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5IHBvaW50IHRoYXQgY29tcGlsZWQgaGFuZGxlcnMgdXNlLiBUaGUgQ0xJIGdlbmVyYXRlc1xuICogd3JhcHBlciBjb2RlIHRoYXQgaW1wb3J0cyB0aGUgdXNlcidzIGNvbW1hbmQgYW5kIHBhc3NlcyBpdCB0byB0aGlzIGZ1bmN0aW9uLlxuICogRnJvbSB0aGVyZSwgZXhlY3V0ZUNvbW1hbmQgaGFuZGxlcyBhbGwgdGhlIGNlcmVtb255OiBlbnZpcm9ubWVudCBwYXJzaW5nLCBsb2dnaW5nXG4gKiBzZXR1cCwgaGFuZGxlciBpbnZvY2F0aW9uLCBlcnJvciBoYW5kbGluZywgYW5kIHByb2Nlc3MgdGVybWluYXRpb24uXG4gKlxuICogVGhlIGZ1bmN0aW9uIGV4aXRzIHRoZSBwcm9jZXNzIGluIGFsbCBub3JtYWwgY29kZSBwYXRocy4gVGhlIHJldHVybmVkXG4gKiBwcm9taXNlIG9ubHkgcmVzb2x2ZXMgaWYgYHByb2Nlc3MuZXhpdGAgaXMgbW9ja2VkLCB3aGljaCBoYXBwZW5zIGluIHRlc3RcbiAqIHNjZW5hcmlvcy4gUHJvZHVjdGlvbiBjb2RlIHNob3VsZCBub3QgYXdhaXQgdGhpcyBmdW5jdGlvbiBvciBleHBlY3QgaXRcbiAqIHRvIHJldHVybi5cbiAqXG4gKiAjIyBTdXBwb3J0ZWQgQ29tbWFuZCBUeXBlc1xuICpcbiAqIC0gKipBY3Rpb24qKiAoYGFjdGlvbmApOiBJbnZva2VkIHdoZW4gYW4gYWN0aW9uIGlzIHRyaWdnZXJlZFxuICogLSAqKlR5cGUgQ3JlYXRlKiogKGB0eXBlQ3JlYXRlYCk6IFJ1bnMgYWZ0ZXIgbmV3IHR5cGVkIGZpbGUgY3JlYXRpb25cbiAqIC0gKipUeXBlIFVwZGF0ZSoqIChgdHlwZVVwZGF0ZWApOiBSdW5zIGFmdGVyIHR5cGVkIGZpbGUgbW9kaWZpY2F0aW9uXG4gKiAtICoqVHlwZSBEZWxldGUqKiAoYHR5cGVEZWxldGVgKTogUnVucyB3aGVuIHR5cGVkIGZpbGUgaXMgZGVsZXRlZFxuICpcbiAqIE5vdGU6IFR5cGUgdmFsaWRhdG9ycyB1c2UgYSBkaWZmZXJlbnQgZXhlY3V0aW9uIG1vZGVsIChmaWxlLXBhdGggcHJvdG9jb2wpXG4gKiBhbmQgc2hvdWxkIGJlIGV4ZWN1dGVkIHZpYSB7QGxpbmsgZXhlY3V0ZVZhbGlkYXRpb259IGluc3RlYWQuXG4gKlxuICogIyMgRXJyb3IgSGFuZGxpbmdcbiAqXG4gKiBFcnJvcnMgYXJlIGhhbmRsZWQgYXQgdGhyZWUgbGV2ZWxzOlxuICpcbiAqIDEuICoqRW52aXJvbm1lbnQgZXh0cmFjdGlvbiBlcnJvcnMqKiAobWlzc2luZy9pbnZhbGlkIHZhcmlhYmxlcyk6IExvZyB0aGVcbiAqICAgIGVycm9yIGFuZCBleGl0LiBUaGVzZSBpbmRpY2F0ZSBhIHByb2JsZW0gd2l0aCBob3cgdGhlIGhhbmRsZXIgd2FzIGludm9rZWQuXG4gKlxuICogMi4gKipIYW5kbGVyIGVycm9ycyoqICh1c2VyIGNvZGUgdGhyb3dzKTogV3JpdGUgdGhlIHN0YWNrIHRyYWNlIHRvIHN0ZGVycixcbiAqICAgIGxvZyBhIHN0cnVjdHVyZWQgZXJyb3IsIGFuZCBleGl0LiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgY2FwdHVyZXMgc3RkZXJyXG4gKiAgICBmb3IgZGVidWdnaW5nLlxuICpcbiAqIDMuICoqVW5leHBlY3RlZCBlcnJvcnMqKjogQ2F0Y2gtYWxsIGZvciBhbnkgb3RoZXIgZmFpbHVyZXMgZHVyaW5nIHJ1bnRpbWVcbiAqICAgIG9yY2hlc3RyYXRpb24uXG4gKlxuICogQHBhcmFtIGNvbW1hbmQgLSBUaGUgY29tbWFuZCB0byBleGVjdXRlLCByZXR1cm5lZCBmcm9tIGEgZmFjdG9yeSBmdW5jdGlvblxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgb25seSB3aGVuIGBwcm9jZXNzLmV4aXRgIGlzIG1vY2tlZCAodGVzdHMpXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEdlbmVyYXRlZCB3cmFwcGVyIGNvZGUgKHByb2R1Y2VkIGJ5IENMSSlcbiAqIGltcG9ydCB7IGV4ZWN1dGVDb21tYW5kIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcvcnVudGltZSc7XG4gKiBpbXBvcnQgY29tbWFuZCBmcm9tICcuL3VzZXItY29tbWFuZC5qcyc7XG4gKlxuICogLy8gVGhpcyBjYWxsIG5ldmVyIHJldHVybnMgaW4gcHJvZHVjdGlvblxuICogZXhlY3V0ZUNvbW1hbmQoY29tbWFuZCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVDb21tYW5kKGNvbW1hbmQ6IEFueUNvbW1hbmQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBsZXQgaW5wdXQ6IEFjdGlvbklucHV0IHwgVHlwZUhvb2tJbnB1dDtcblxuICAgIHRyeSB7XG4gICAgICBpZiAoY29tbWFuZC5mYWN0b3J5VHlwZSA9PT0gJ2FjdGlvbicpIHtcbiAgICAgICAgaW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlucHV0ID0gZXh0cmFjdFR5cGVJbnB1dCgpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gaGFuZGxlRW52RXh0cmFjdGlvbkVycm9yKGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgbG9nZ2VyIGNvbnRleHQgd2l0aCBjb21tYW5kIHR5cGVcbiAgICBsb2dnZXIuc2V0Q29udGV4dChjb21tYW5kLmZhY3RvcnlUeXBlLCBpbnB1dCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KTtcblxuICAgIGlmIChjb21tYW5kLmZhY3RvcnlUeXBlID09PSAnYWN0aW9uJykge1xuICAgICAgLy8gU29ja2V0IGNvbm5lY3Rpb24gYW5kIEFjdGlvbkNvbnRleHQgZm9yIGFjdGlvbiBjb21tYW5kc1xuICAgICAgbGV0IHNvY2tldENsaWVudDogU29ja2V0Q2xpZW50IHwgdW5kZWZpbmVkO1xuICAgICAgY29uc3Qgc29ja2V0UGF0aCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIXTtcbiAgICAgIGlmIChzb2NrZXRQYXRoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc29ja2V0Q2xpZW50ID0gYXdhaXQgU29ja2V0Q2xpZW50LmNvbm5lY3Qoc29ja2V0UGF0aCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oYEZhaWxlZCB0byBjb25uZWN0IHRvIHNvY2tldCBhdCAke3NvY2tldFBhdGh9OiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgICAgICAgLy8gRmFpbC1vcGVuOiBjb250aW51ZSB3aXRob3V0IHNvY2tldFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIENhbGxiYWNrIHJlZ2lzdHJhdGlvbiBzdGF0ZVxuICAgICAgbGV0IGNhbmNlbENhbGxiYWNrOiAoKCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IHN3aXRjaFRvSW50ZXJhY3RpdmVDYWxsYmFjazogKCgpID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+KSB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBjb21tYW5kUHJvY2Vzc2VkID0gZmFsc2U7XG5cbiAgICAgIC8vIEJ1aWxkIEFjdGlvbkNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIHNvY2tldC1iYWNrZWQgY2FsbGJhY2tzXG4gICAgICBjb25zdCBjb250ZXh0OiBBY3Rpb25Db250ZXh0ID0ge1xuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICAgICAgb25DYW5jZWw6IChjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIGNhbmNlbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH0sXG4gICAgICAgIG9uU3dpdGNoVG9JbnRlcmFjdGl2ZTogKGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgc3dpdGNoVG9JbnRlcmFjdGl2ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIC8vIFdpcmUgc29ja2V0IGNvbW1hbmQgZGlzcGF0Y2hcbiAgICAgIGlmIChzb2NrZXRDbGllbnQpIHtcbiAgICAgICAgc29ja2V0Q2xpZW50Lm9uQ29tbWFuZCgoY21kOiBTb2NrZXRDb21tYW5kKSA9PiB7XG4gICAgICAgICAgLy8gRmlyc3Qtd2lucyBzZW1hbnRpY3M6IGlnbm9yZSBzdWJzZXF1ZW50IGNvbW1hbmRzXG4gICAgICAgICAgaWYgKGNvbW1hbmRQcm9jZXNzZWQpIHJldHVybjtcbiAgICAgICAgICBjb21tYW5kUHJvY2Vzc2VkID0gdHJ1ZTtcblxuICAgICAgICAgIGlmIChjbWQudHlwZSA9PT0gJ2NhbmNlbCcpIHtcbiAgICAgICAgICAgIGhhbmRsZUNhbmNlbENvbW1hbmQoY2FuY2VsQ2FsbGJhY2ssIHNvY2tldENsaWVudCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbWQudHlwZSA9PT0gJ3N3aXRjaFRvSW50ZXJhY3RpdmUnKSB7XG4gICAgICAgICAgICBoYW5kbGVTd2l0Y2hUb0ludGVyYWN0aXZlQ29tbWFuZChzd2l0Y2hUb0ludGVyYWN0aXZlQ2FsbGJhY2ssIHNvY2tldENsaWVudCEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIGFjdGlvbiBjb21tYW5kIGhhbmRsZXJcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGNvbW1hbmQoaW5wdXQgYXMgQWN0aW9uSW5wdXQsIGNvbnRleHQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgICByZXR1cm4gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2xlYW4gdXAgc29ja2V0IGFuZCBleGl0IHN1Y2Nlc3NmdWxseVxuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVHlwZUhvb2tDb250ZXh0IGZvciB0eXBlIGxpZmVjeWNsZSBob29rc1xuICAgICAgY29uc3QgY29udGV4dDogVHlwZUhvb2tDb250ZXh0ID0ge1xuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKVxuICAgICAgfTtcblxuICAgICAgLy8gRXhlY3V0ZSB0aGUgdHlwZSBob29rIGNvbW1hbmQgaGFuZGxlclxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgY29tbWFuZChpbnB1dCBhcyBUeXBlSG9va0lucHV0LCBjb250ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpO1xuICAgICAgfVxuXG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNVQ0NFU1MpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBVbmV4cGVjdGVkIGVycm9yIC0gdHJ5IHRvIGNsZWFuIHVwIGFuZCBleGl0XG4gICAgbG9nZ2VyLmVycm9yKGBVbmV4cGVjdGVkIHJ1bnRpbWUgZXJyb3I6ICR7Z2V0RXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTb2NrZXQgQ29tbWFuZCBIYW5kbGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFJlc29sdmVzIGEgY2FsbGJhY2sgcmVzdWx0IHRoYXQgbWF5IGJlIHN5bmMgb3IgYXN5bmMgaW50byBhIFByb21pc2UuXG4gKlxuICogVXNlci1yZWdpc3RlcmVkIGNhbGxiYWNrcyBtYXkgcmV0dXJuIHZvaWQsIGEgdmFsdWUsIG9yIGEgUHJvbWlzZS5cbiAqIFRoaXMgbm9ybWFsaXplcyBhbGwgY2FzZXMgaW50byBhIHNpbmdsZSBQcm9taXNlIGZvciBjb25zaXN0ZW50IGhhbmRsaW5nLlxuICpcbiAqIEBwYXJhbSByZXN1bHQgLSBDYWxsYmFjayByZXR1cm4gdmFsdWUgdGhhdCBtYXkgYWxyZWFkeSBiZSBhIHByb21pc2UuXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY2FsbGJhY2sgcmVzdWx0LlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIHRvUHJvbWlzZTxUPihyZXN1bHQ6IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gIGlmIChyZXN1bHQgJiYgdHlwZW9mIChyZXN1bHQgYXMgUHJvbWlzZTxUPikudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiByZXN1bHQgYXMgUHJvbWlzZTxUPjtcbiAgfVxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBhIGBjYW5jZWxgIGNvbW1hbmQgZnJvbSB0aGUgc29ja2V0LlxuICpcbiAqIElmIGEgY2FuY2VsIGNhbGxiYWNrIHdhcyByZWdpc3RlcmVkLCBpdCBpcyBpbnZva2VkLiBPdGhlcndpc2UsIFNJR1RFUk1cbiAqIGlzIHNlbnQgdG8gdGhlIGN1cnJlbnQgcHJvY2VzcyBhcyBhIGZhbGxiYWNrLiBBZnRlciB0aGUgY2FsbGJhY2sgY29tcGxldGVzXG4gKiAob3IgaW1tZWRpYXRlbHkgaWYgbm8gY2FsbGJhY2spLCB0aGUgcHJvY2VzcyBleGl0cyB3aXRoIGVycm9yIGNvZGUuXG4gKlxuICogQHBhcmFtIGNhbGxiYWNrIC0gVGhlIHJlZ2lzdGVyZWQgY2FuY2VsIGNhbGxiYWNrLCBpZiBhbnlcbiAqIEBwYXJhbSBzb2NrZXRDbGllbnQgLSBUaGUgc29ja2V0IGNsaWVudCB0byBjbG9zZSBiZWZvcmUgZXhpdGluZ1xuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVDYW5jZWxDb21tYW5kKFxuICBjYWxsYmFjazogKCgpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSB8IHVuZGVmaW5lZCxcbiAgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnQgfCB1bmRlZmluZWRcbik6IHZvaWQge1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgcHJvY2Vzcy5raWxsKHByb2Nlc3MucGlkLCAnU0lHVEVSTScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRvUHJvbWlzZShjYWxsYmFjaygpKS50aGVuKFxuICAgICgpID0+IHtcbiAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH0sXG4gICAgKCkgPT4ge1xuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgfVxuICApO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgYSBgc3dpdGNoVG9JbnRlcmFjdGl2ZWAgY29tbWFuZCBmcm9tIHRoZSBzb2NrZXQuXG4gKlxuICogSWYgbm8gY2FsbGJhY2sgd2FzIHJlZ2lzdGVyZWQsIHRoZSBjb21tYW5kIGlzIGlnbm9yZWQgKG5vLW9wKS4gT3RoZXJ3aXNlLFxuICogdGhlIGNhbGxiYWNrIGlzIGludm9rZWQgYW5kIGl0cyByZXR1cm4gdmFsdWUgaXMgc2VudCBhc1xuICogYHN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZWAgb24gdGhlIHNvY2tldC4gYHByb2Nlc3MuZXhpdCg0MilgIGlzIGNhbGxlZFxuICogaW5zaWRlIHRoZSBgd3JpdGUoKWAgY2FsbGJhY2sgdG8gZ3VhcmFudGVlIHRoZSByZXNwb25zZSBpcyBmbHVzaGVkIGJlZm9yZVxuICogdGhlIGV2ZW50IGxvb3AgdGVhcnMgZG93bi5cbiAqXG4gKiBAcGFyYW0gY2FsbGJhY2sgLSBUaGUgcmVnaXN0ZXJlZCBzd2l0Y2hUb0ludGVyYWN0aXZlIGNhbGxiYWNrLCBpZiBhbnlcbiAqIEBwYXJhbSBzb2NrZXRDbGllbnQgLSBUaGUgc29ja2V0IGNsaWVudCB1c2VkIHRvIHNlbmQgdGhlIHJlc3BvbnNlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZVN3aXRjaFRvSW50ZXJhY3RpdmVDb21tYW5kKFxuICBjYWxsYmFjazogKCgpID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+KSB8IHVuZGVmaW5lZCxcbiAgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnRcbik6IHZvaWQge1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdG9Qcm9taXNlKGNhbGxiYWNrKCkpLnRoZW4oXG4gICAgKGRhdGEpID0+IHtcbiAgICAgIHNvY2tldENsaWVudC5zZW5kUmVzcG9uc2VUaGVuKHsgdHlwZTogJ3N3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZScsIGRhdGEgfSwgKCkgPT4ge1xuICAgICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNXSVRDSF9UT19JTlRFUkFDVElWRSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIChlcnJvcikgPT4ge1xuICAgICAgbG9nZ2VyLmVycm9yKGBzd2l0Y2hUb0ludGVyYWN0aXZlIGNhbGxiYWNrIGVycm9yOiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgICBzb2NrZXRDbGllbnQuY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH1cbiAgKTtcbn1cbiIsICJpbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ25vZGU6dXRpbCc7XG5cbi8qKlxuICogSW1wbGVtZW50cyBjcmVhdGUgd29ya3RyZWUgYmVoYXZpb3IgZm9yIHRoZSBkZWZhdWx0LWNvbmZpZ3VyYXRpb24gcGFja2FnZS5cbiAqIFRoZSBtb2R1bGUgY2FwdHVyZXMgZG9tYWluIHJ1bGVzIGluIG9uZSBwbGFjZSBzbyBjYWxsZXJzIGNhbiBjb21wb3NlIHdvcmtmbG93cyB3aXRob3V0XG4gKiBkdXBsaWNhdGluZyBlZGdlLWNhc2UgaGFuZGxpbmcuXG4gKlxuICogQHN1bW1hcnkgQ3JlYXRlIFdvcmt0cmVlIGxvZ2ljIGZvciBsaWJcbiAqL1xuXG5jb25zdCBleGVjRmlsZUFzeW5jID0gcHJvbWlzaWZ5KGV4ZWNGaWxlKTtcblxuLyoqXG4gKiBWYWxpZGF0ZXMgYSBicmFuY2ggbmFtZSBhZ2FpbnN0IHRoZSBDTEkncyBzYWZlIHN1YnNldC5cbiAqXG4gKiBUaGUgbmFtZSBtdXN0IHN0YXJ0IHdpdGggYW4gYWxwaGFudW1lcmljIGNoYXJhY3RlciBhbmQgbWF5IHRoZW4gaW5jbHVkZVxuICogYWxwaGFudW1lcmljcywgc2xhc2hlcywgdW5kZXJzY29yZXMsIG9yIGRhc2hlcy5cbiAqXG4gKiBAcGFyYW0gbmFtZSAtIENhbmRpZGF0ZSBicmFuY2ggbmFtZSBzdXBwbGllZCBieSB0aGUgY2FsbGVyLlxuICogQHRocm93cyB7RXJyb3J9IFdoZW4gdGhlIGJyYW5jaCBuYW1lIGRvZXMgbm90IG1hdGNoIHRoZSBzdXBwb3J0ZWQgZm9ybWF0LlxuICogQHJldHVybnMgTm8gdmFsdWUuIFRocm93cyBvbiBpbnZhbGlkIGlucHV0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVCcmFuY2hOYW1lKG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBicmFuY2hOYW1lUmVnZXggPSAvXlthLXpBLVowLTldW2EtekEtWjAtOS9fLV0qJC87XG4gIGlmICghYnJhbmNoTmFtZVJlZ2V4LnRlc3QobmFtZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yOiBJbnZhbGlkIGJyYW5jaCBuYW1lIGZvcm1hdC4nKTtcbiAgfVxufVxuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciBhIHJlbGF0aXZlIHBhdGggaXMgbmVzdGVkIHVuZGVyIGFueSBrbm93biBwYXJlbnQgcGF0aC5cbiAqXG4gKiBUaGUgY2hlY2sgd2Fsa3MgYW5jZXN0b3Igc2VnbWVudHMgb2YgYGRpcmAgYW5kIHJldHVybnMgdHJ1ZSBvbiB0aGUgZmlyc3RcbiAqIG1hdGNoIGluIGBwYXJlbnRTZXRgLlxuICpcbiAqIEBwYXJhbSBkaXIgLSBSZWxhdGl2ZSBwYXRoIHRvIHRlc3QuXG4gKiBAcGFyYW0gcGFyZW50U2V0IC0gQ2FuZGlkYXRlIHBhcmVudCBkaXJlY3RvcmllcyByZXByZXNlbnRlZCBhcyByZWxhdGl2ZSBwYXRocy5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiBgZGlyYCBpcyBuZXN0ZWQgdW5kZXIgYSBwYXRoIGluIGBwYXJlbnRTZXRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOZXN0ZWRVbmRlcihkaXI6IHN0cmluZywgcGFyZW50U2V0OiBTZXQ8c3RyaW5nPik6IGJvb2xlYW4ge1xuICBsZXQgY3VycmVudCA9IGRpcjtcbiAgd2hpbGUgKGN1cnJlbnQuaW5jbHVkZXMoJy8nKSkge1xuICAgIGN1cnJlbnQgPSBjdXJyZW50LnN1YnN0cmluZygwLCBjdXJyZW50Lmxhc3RJbmRleE9mKCcvJykpO1xuICAgIGlmIChwYXJlbnRTZXQuaGFzKGN1cnJlbnQpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgc3ltbGluayB0YXJnZXQgcG9pbnRzIHRvIGtub3duIG1vbm9yZXBvLWludGVybmFsIGxvY2F0aW9ucy5cbiAqXG4gKiBJbnRlcm5hbCB0YXJnZXRzIGFyZSBwcmVzZXJ2ZWQgYXMgcmVsYXRpdmUgbGlua3MgZHVyaW5nIG5vZGVfbW9kdWxlcyByZXJvdXRlXG4gKiBzbyB3b3Jrc3BhY2UgbGlua3Mga2VlcCB3b3JraW5nIGluc2lkZSBhIHdvcmt0cmVlLlxuICpcbiAqIEBwYXJhbSB0YXJnZXQgLSBTeW1saW5rIHRhcmdldCByZWFkIGZyb20gdGhlIHNvdXJjZSBub2RlX21vZHVsZXMgZW50cnkuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gdGhlIHRhcmdldCBzdGFydHMgd2l0aCBhbiBpbnRlcm5hbCBwcmVmaXguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0ludGVybmFsU3ltbGluayh0YXJnZXQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gdGFyZ2V0LnN0YXJ0c1dpdGgoJy4uLycpO1xufVxuXG5pbnRlcmZhY2UgQ3JlYXRlV29ya3RyZWVSZXN1bHQge1xuICBicmFuY2g6IHN0cmluZztcbiAgd29ya3RyZWU6IHN0cmluZztcbiAgYmFzZVNoYTogc3RyaW5nO1xuICByZXJvdXRlZFN5bWxpbmtzPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW5kIGNvbmZpZ3VyZXMgYSBuZXcgZ2l0IHdvcmt0cmVlIGZvciBhIGJyYW5jaC5cbiAqXG4gKiBUaGUgd29ya2Zsb3cgdmFsaWRhdGVzIHRoZSBicmFuY2ggbmFtZSwgY3JlYXRlcyB0aGUgd29ya3RyZWUsIG1pcnJvcnNcbiAqIGV4aXN0aW5nIHJvb3Qgc3ltbGlua3MsIHN5bWxpbmtzIGlnbm9yZWQgcGF0aHMsIHJlcm91dGVzIG5vZGVfbW9kdWxlcyBsaW5rcyxcbiAqIGFuZCB1cGRhdGVzIHBlci13b3JrdHJlZSBnaXQgZXhjbHVkZXMuXG4gKlxuICogQHBhcmFtIGJyYW5jaE5hbWUgLSBOYW1lIG9mIHRoZSBicmFuY2ggdG8gY3JlYXRlIG9yIGF0dGFjaC5cbiAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvbi5cbiAqIEBwYXJhbSBvcHRpb25zLmN3ZCAtIFdvcmtpbmcgZGlyZWN0b3J5IHRvIHVzZSB3aGVuIGxvY2F0aW5nIGdpdCByb290cy4gRGVmYXVsdHMgdG8gYHByb2Nlc3MuY3dkKClgLlxuICogQHJldHVybnMgTWV0YWRhdGEgZGVzY3JpYmluZyB0aGUgY3JlYXRlZCB3b3JrdHJlZSBhbmQgYmFzZSBjb21taXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVXb3JrdHJlZShicmFuY2hOYW1lOiBzdHJpbmcsIG9wdGlvbnM/OiB7IGN3ZD86IHN0cmluZyB9KTogUHJvbWlzZTxDcmVhdGVXb3JrdHJlZVJlc3VsdD4ge1xuICB2YWxpZGF0ZUJyYW5jaE5hbWUoYnJhbmNoTmFtZSk7XG5cbiAgY29uc3QgeyBzb3VyY2VSb290LCByZXBvUm9vdCB9ID0gYXdhaXQgZmluZEdpdFJvb3RzKG9wdGlvbnM/LmN3ZCA/PyBwcm9jZXNzLmN3ZCgpKTtcbiAgY29uc3Qgc3RhcnRQb2ludCA9IGF3YWl0IHJlc29sdmVIZWFkKHNvdXJjZVJvb3QpO1xuICBjb25zdCB3b3JrdHJlZURpciA9IHBhdGguam9pbihyZXBvUm9vdCwgJy53b3JrdHJlZXMnLCBicmFuY2hOYW1lKTtcblxuICBjb25zdCBbd29ya3RyZWVFeGlzdHMsIGJyYW5jaEV4aXN0c10gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdCwgd29ya3RyZWVEaXIpLFxuICAgIGNoZWNrQnJhbmNoRXhpc3RzKHJlcG9Sb290LCBicmFuY2hOYW1lKVxuICBdKTtcblxuICBpZiAod29ya3RyZWVFeGlzdHMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yOiBXb3JrdHJlZSBhbHJlYWR5IGV4aXN0cyBhdCAke3dvcmt0cmVlRGlyfWApO1xuICB9XG5cbiAgYXdhaXQgYWRkV29ya3RyZWUoeyByZXBvUm9vdCwgd29ya3RyZWVEaXIsIGJyYW5jaE5hbWUsIGJyYW5jaEV4aXN0cywgc3RhcnRQb2ludCB9KTtcblxuICBjb25zdCBpZ25vcmVkID0gYXdhaXQgZGlzY292ZXJJZ25vcmVkUGF0aHMoc291cmNlUm9vdCk7XG4gIGF3YWl0IGNvcHlFeGlzdGluZ1N5bWxpbmtzKHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyKTtcbiAgYXdhaXQgc3ltbGlua0lnbm9yZWRQYXRocyh7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCBpZ25vcmVkIH0pO1xuXG4gIGNvbnN0IHJlcm91dGVkQ291bnQgPSBhd2FpdCByZXJvdXRlQWxsTm9kZU1vZHVsZXMoeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgcmVwb1Jvb3QgfSk7XG5cbiAgY29uc3QgWywgYmFzZVNoYV0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgdXBkYXRlR2l0RXhjbHVkZSh7IHdvcmt0cmVlRGlyLCByZXBvUm9vdCwgZGlyZWN0b3JpZXM6IGlnbm9yZWQuZGlyZWN0b3JpZXMsIGZpbGVzOiBpZ25vcmVkLmZpbGVzIH0pLFxuICAgIHJlc29sdmVIZWFkKHdvcmt0cmVlRGlyKVxuICBdKTtcblxuICBjb25zdCByZXN1bHQ6IENyZWF0ZVdvcmt0cmVlUmVzdWx0ID0ge1xuICAgIGJyYW5jaDogYnJhbmNoTmFtZSxcbiAgICB3b3JrdHJlZTogd29ya3RyZWVEaXIsXG4gICAgYmFzZVNoYVxuICB9O1xuXG4gIGlmIChyZXJvdXRlZENvdW50ID4gMCkge1xuICAgIHJlc3VsdC5yZXJvdXRlZFN5bWxpbmtzID0gcmVyb3V0ZWRDb3VudDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmludGVyZmFjZSBHaXRSb290cyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbn1cblxuLyoqXG4gKiBMb2NhdGVzIHRoZSBjdXJyZW50IGdpdCBzb3VyY2Ugcm9vdCBhbmQgcHJpbWFyeSByZXBvc2l0b3J5IHJvb3QuXG4gKlxuICogU3VwcG9ydHMgYm90aCBzdGFuZGFyZCBjaGVja291dHMgKGAuZ2l0YCBkaXJlY3RvcnkpIGFuZCB3b3JrdHJlZSBjaGVja291dHNcbiAqIChgLmdpdGAgZmlsZSBwb2ludGluZyBpbnRvIGAuZ2l0L3dvcmt0cmVlcy8uLi5gKS5cbiAqXG4gKiBAcGFyYW0gc3RhcnREaXIgLSBEaXJlY3Rvcnkgd2hlcmUgdXB3YXJkIHNlYXJjaCBiZWdpbnMuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiBubyBnaXQgcmVwb3NpdG9yeSBtYXJrZXIgaXMgZm91bmQuXG4gKiBAcmV0dXJucyBQYXRocyBmb3IgdGhlIGN1cnJlbnQgY2hlY2tvdXQgcm9vdCBhbmQgdGhlIHByaW1hcnkgcmVwbyByb290LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEdpdFJvb3RzKHN0YXJ0RGlyOiBzdHJpbmcpOiBQcm9taXNlPEdpdFJvb3RzPiB7XG4gIGxldCBjdXJyZW50RGlyID0gcGF0aC5yZXNvbHZlKHN0YXJ0RGlyKTtcbiAgd2hpbGUgKGN1cnJlbnREaXIgIT09ICcvJykge1xuICAgIGNvbnN0IGdpdFBhdGggPSBwYXRoLmpvaW4oY3VycmVudERpciwgJy5naXQnKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChnaXRQYXRoKTtcbiAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlUm9vdDogY3VycmVudERpcixcbiAgICAgICAgICByZXBvUm9vdDogY3VycmVudERpclxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgIGNvbnN0IGdpdEZpbGVDb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUoZ2l0UGF0aCwgJ3V0Zi04Jyk7XG4gICAgICAgIGNvbnN0IGdpdGRpckxpbmUgPSBnaXRGaWxlQ29udGVudC50cmltKCk7XG4gICAgICAgIGNvbnN0IGdpdGRpclBhdGggPSBnaXRkaXJMaW5lLnJlcGxhY2UoL15naXRkaXI6XFxzKi8sICcnKTtcbiAgICAgICAgY29uc3QgbWFpbkdpdERpciA9IGdpdGRpclBhdGgucmVwbGFjZSgvXFwvd29ya3RyZWVzXFwvW14vXSskLywgJycpO1xuICAgICAgICBjb25zdCByZXBvUm9vdCA9IG1haW5HaXREaXIucmVwbGFjZSgvXFwvXFwuZ2l0JC8sICcnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzb3VyY2VSb290OiBjdXJyZW50RGlyLFxuICAgICAgICAgIHJlcG9Sb290XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gICAgY3VycmVudERpciA9IHBhdGguZGlybmFtZShjdXJyZW50RGlyKTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbiBhIGdpdCByZXBvc2l0b3J5Jyk7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIEhFQUQgY29tbWl0IFNIQSBmb3IgYSByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAqXG4gKiBAcGFyYW0gY3dkIC0gUmVwb3NpdG9yeSBkaXJlY3RvcnkgcGFzc2VkIHRvIGBnaXQgcmV2LXBhcnNlIEhFQURgLlxuICogQHJldHVybnMgVHJpbW1lZCBjb21taXQgU0hBIHN0cmluZy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVIZWFkKGN3ZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsncmV2LXBhcnNlJywgJ0hFQUQnXSwgeyBjd2QsIHRpbWVvdXQ6IDVfMDAwIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHdvcmt0cmVlIHBhdGggaXMgYWxyZWFkeSByZWdpc3RlcmVkIHdpdGggZ2l0LlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gd29ya3RyZWVEaXIgLSBBYnNvbHV0ZSB3b3JrdHJlZSBwYXRoIGJlaW5nIGNyZWF0ZWQuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYGdpdCB3b3JrdHJlZSBsaXN0YCBhbHJlYWR5IGNvbnRhaW5zIGB3b3JrdHJlZURpcmAuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290OiBzdHJpbmcsIHdvcmt0cmVlRGlyOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAnbGlzdCddLCB7IGN3ZDogcmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbiAgcmV0dXJuIHN0ZG91dC5pbmNsdWRlcyh3b3JrdHJlZURpcik7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBicmFuY2ggYWxyZWFkeSBleGlzdHMgaW4gdGhlIHJlcG9zaXRvcnkuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSBicmFuY2hOYW1lIC0gQnJhbmNoIG5hbWUgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYXQgbGVhc3Qgb25lIG1hdGNoaW5nIGxvY2FsIGJyYW5jaCBpcyBsaXN0ZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja0JyYW5jaEV4aXN0cyhyZXBvUm9vdDogc3RyaW5nLCBicmFuY2hOYW1lOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnYnJhbmNoJywgJy0tbGlzdCcsIGJyYW5jaE5hbWVdLCB7XG4gICAgY3dkOiByZXBvUm9vdCxcbiAgICB0aW1lb3V0OiAzMF8wMDBcbiAgfSk7XG4gIHJldHVybiBzdGRvdXQudHJpbSgpLmxlbmd0aCA+IDA7XG59XG5cbmludGVyZmFjZSBBZGRXb3JrdHJlZU9wdGlvbnMge1xuICByZXBvUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICBicmFuY2hOYW1lOiBzdHJpbmc7XG4gIGJyYW5jaEV4aXN0czogYm9vbGVhbjtcbiAgc3RhcnRQb2ludDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEFkZHMgYSBnaXQgd29ya3RyZWUsIGNyZWF0aW5nIHRoZSBicmFuY2ggd2hlbiBuZWVkZWQuXG4gKlxuICogVXNlcyBgZ2l0IHdvcmt0cmVlIGFkZCAtYmAgZm9yIG5ldyBicmFuY2hlcyBhbmQgcGxhaW4gYGdpdCB3b3JrdHJlZSBhZGRgXG4gKiB3aGVuIGF0dGFjaGluZyB0byBhbiBleGlzdGluZyBicmFuY2guXG4gKlxuICogQHBhcmFtIG9wdHMgLSBXb3JrdHJlZSBjcmVhdGlvbiBvcHRpb25zIGFuZCBicmFuY2ggZXhpc3RlbmNlIHN0YXRlLlxuICogQHJldHVybnMgTm8gdmFsdWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRXb3JrdHJlZShvcHRzOiBBZGRXb3JrdHJlZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgYXJncyA9IG9wdHMuYnJhbmNoRXhpc3RzXG4gICAgPyBbJ3dvcmt0cmVlJywgJ2FkZCcsIG9wdHMud29ya3RyZWVEaXIsIG9wdHMuYnJhbmNoTmFtZV1cbiAgICA6IFsnd29ya3RyZWUnLCAnYWRkJywgJy1iJywgb3B0cy5icmFuY2hOYW1lLCBvcHRzLndvcmt0cmVlRGlyLCBvcHRzLnN0YXJ0UG9pbnRdO1xuICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBhcmdzLCB7IGN3ZDogb3B0cy5yZXBvUm9vdCwgdGltZW91dDogMzBfMDAwIH0pO1xufVxuXG5pbnRlcmZhY2UgSWdub3JlZFBhdGhzIHtcbiAgZGlyZWN0b3JpZXM6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogRGlzY292ZXJzIGlnbm9yZWQgZmlsZXMgYW5kIGRpcmVjdG9yaWVzIHVuZGVyIGEgc291cmNlIHJvb3QuXG4gKlxuICogUGF0aHMgYXJlIHJldHVybmVkIHJlbGF0aXZlIHRvIGBzb3VyY2VSb290YCBhbmQgYC53b3JrdHJlZXNgIGNvbnRlbnQgaXNcbiAqIGZpbHRlcmVkIG91dCB0byBhdm9pZCBzZWxmLXJlZmVyZW50aWFsIHN5bWxpbmtpbmcuXG4gKlxuICogQHBhcmFtIHNvdXJjZVJvb3QgLSBTb3VyY2UgY2hlY2tvdXQgcm9vdCB1c2VkIGZvciBnaXQgZGlzY292ZXJ5LlxuICogQHJldHVybnMgU2VwYXJhdGUgbGlzdHMgb2YgaWdub3JlZCBkaXJlY3RvcmllcyBhbmQgaWdub3JlZCBmaWxlcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRpc2NvdmVySWdub3JlZFBhdGhzKHNvdXJjZVJvb3Q6IHN0cmluZyk6IFByb21pc2U8SWdub3JlZFBhdGhzPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKFxuICAgICdnaXQnLFxuICAgIFsnLUMnLCBzb3VyY2VSb290LCAnbHMtZmlsZXMnLCAnLS1pZ25vcmVkJywgJy0tZXhjbHVkZS1zdGFuZGFyZCcsICctLWRpcmVjdG9yeScsICctLW90aGVycyddLFxuICAgIHsgY3dkOiBzb3VyY2VSb290LCB0aW1lb3V0OiAzMF8wMDAgfVxuICApO1xuXG4gIGNvbnN0IGxpbmVzID0gc3Rkb3V0LnNwbGl0KCdcXG4nKS5maWx0ZXIoKGxpbmUpID0+IGxpbmUubGVuZ3RoID4gMCAmJiAhbGluZS5zdGFydHNXaXRoKCcud29ya3RyZWVzJykpO1xuICBjb25zdCBkaXJlY3RvcmllcyA9IGxpbmVzLmZpbHRlcigobCkgPT4gbC5lbmRzV2l0aCgnLycpKS5tYXAoKGwpID0+IGwuc2xpY2UoMCwgLTEpKTtcbiAgY29uc3QgZmlsZXMgPSBsaW5lcy5maWx0ZXIoKGwpID0+ICFsLmVuZHNXaXRoKCcvJykpO1xuXG4gIHJldHVybiB7IGRpcmVjdG9yaWVzLCBmaWxlcyB9O1xufVxuXG5pbnRlcmZhY2UgU3ltbGlua0lnbm9yZWRQYXRoc09wdGlvbnMge1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIHdvcmt0cmVlRGlyOiBzdHJpbmc7XG4gIGlnbm9yZWQ6IElnbm9yZWRQYXRocztcbn1cblxuaW50ZXJmYWNlIFN5bWxpbmtJZ25vcmVkUGF0aHNSZXN1bHQge1xuICBkaXJDb3VudDogbnVtYmVyO1xuICBmaWxlQ291bnQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBTeW1saW5rcyBpZ25vcmVkIGRpcmVjdG9yaWVzIGFuZCBmaWxlcyBmcm9tIHNvdXJjZSBjaGVja291dCBpbnRvIGEgd29ya3RyZWUuXG4gKlxuICogTmVzdGVkIGlnbm9yZWQgZGlyZWN0b3JpZXMgYXJlIGNvbGxhcHNlZCBzbyBvbmx5IHRvcC1sZXZlbCBpZ25vcmVkIGRpcmVjdG9yeVxuICogbGlua3MgYXJlIGNyZWF0ZWQuXG4gKlxuICogQHBhcmFtIG9wdHMgLSBTb3VyY2Ugcm9vdCwgZGVzdGluYXRpb24gd29ya3RyZWUsIGFuZCBpZ25vcmVkIHBhdGggbGlzdHMuXG4gKiBAcmV0dXJucyBDb3VudHMgb2Ygc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQgZGlyZWN0b3J5IGFuZCBmaWxlIHN5bWxpbmtzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3ltbGlua0lnbm9yZWRQYXRocyhvcHRzOiBTeW1saW5rSWdub3JlZFBhdGhzT3B0aW9ucyk6IFByb21pc2U8U3ltbGlua0lnbm9yZWRQYXRoc1Jlc3VsdD4ge1xuICBjb25zdCB7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCBpZ25vcmVkIH0gPSBvcHRzO1xuICBjb25zdCBkaXJTZXQgPSBuZXcgU2V0KGlnbm9yZWQuZGlyZWN0b3JpZXMpO1xuICBjb25zdCBub25OZXN0ZWREaXJzID0gaWdub3JlZC5kaXJlY3Rvcmllcy5maWx0ZXIoKGRpcikgPT4gIWlzTmVzdGVkVW5kZXIoZGlyLCBkaXJTZXQpKTtcblxuICBjb25zdCBjcmVhdGVEaXJTeW1saW5rID0gYXN5bmMgKGRpcjogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgZGlyKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZzLmxzdGF0KHNvdXJjZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gbHN0YXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVzdFBhdGggPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsIGRpcik7XG4gICAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUoZGlyKTtcbiAgICAgIGlmIChwYXJlbnREaXIgIT09ICcuJykge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmpvaW4od29ya3RyZWVEaXIsIHBhcmVudERpciksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VFWElTVCcgfHwgY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gc3ltbGluazogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgY3JlYXRlRmlsZVN5bWxpbmsgPSBhc3luYyAoZmlsZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgZmlsZSk7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIGxzdGF0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBmaWxlKTtcbiAgICAgIGNvbnN0IHBhcmVudERpciA9IHBhdGguZGlybmFtZShmaWxlKTtcbiAgICAgIGlmIChwYXJlbnREaXIgIT09ICcuJykge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmpvaW4od29ya3RyZWVEaXIsIHBhcmVudERpciksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VFWElTVCcgfHwgY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gc3ltbGluazogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgZGlyUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKG5vbk5lc3RlZERpcnMubWFwKGNyZWF0ZURpclN5bWxpbmspKTtcbiAgY29uc3QgZmlsZVJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChpZ25vcmVkLmZpbGVzLm1hcChjcmVhdGVGaWxlU3ltbGluaykpO1xuXG4gIGNvbnN0IGRpckNvdW50ID0gZGlyUmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcbiAgY29uc3QgZmlsZUNvdW50ID0gZmlsZVJlc3VsdHMuZmlsdGVyKChyKSA9PiByKS5sZW5ndGg7XG5cbiAgcmV0dXJuIHsgZGlyQ291bnQsIGZpbGVDb3VudCB9O1xufVxuXG4vKipcbiAqIFJlcGxpY2F0ZXMgcm9vdC1sZXZlbCBzeW1saW5rcyBmcm9tIHRoZSBzb3VyY2UgY2hlY2tvdXQgaW50byB0aGUgd29ya3RyZWUuXG4gKlxuICogRXhpc3RpbmcgZGVzdGluYXRpb24gZW50cmllcyBhcmUgbGVmdCB1bnRvdWNoZWQuXG4gKlxuICogQHBhcmFtIHNvdXJjZVJvb3QgLSBTb3VyY2UgY2hlY2tvdXQgcm9vdC5cbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIERlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QuXG4gKiBAcmV0dXJucyBOdW1iZXIgb2Ygc3ltbGlua3MgY3JlYXRlZCBpbiB0aGUgZGVzdGluYXRpb24gcm9vdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvcHlFeGlzdGluZ1N5bWxpbmtzKHNvdXJjZVJvb3Q6IHN0cmluZywgd29ya3RyZWVEaXI6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZVJvb3QsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgY29uc3Qgc3ltbGlua3MgPSBlbnRyaWVzLmZpbHRlcigoZSkgPT4gZS5pc1N5bWJvbGljTGluaygpICYmIGUubmFtZSAhPT0gJy5naXQnICYmIGUubmFtZSAhPT0gJy53b3JrdHJlZXMnKTtcblxuICBjb25zdCBjb3B5U3ltbGluayA9IGFzeW5jIChuYW1lOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih3b3JrdHJlZURpciwgbmFtZSk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZzLmxzdGF0KGRlc3RQYXRoKTtcbiAgICAgIHJldHVybiBmYWxzZTsgLy8gRGVzdGluYXRpb24gYWxyZWFkeSBleGlzdHNcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBzb3VyY2VMaW5rUGF0aCA9IHBhdGguam9pbihzb3VyY2VSb290LCBuYW1lKTtcbiAgICBhd2FpdCBmcy5zeW1saW5rKHNvdXJjZUxpbmtQYXRoLCBkZXN0UGF0aCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKHN5bWxpbmtzLm1hcCgoZSkgPT4gY29weVN5bWxpbmsoZS5uYW1lKSkpO1xuICByZXR1cm4gcmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcbn1cblxuaW50ZXJmYWNlIFJlcm91dGVOb2RlTW9kdWxlc09wdGlvbnMge1xuICBzb3VyY2VOb2RlTW9kdWxlczogc3RyaW5nO1xuICBkZXN0Tm9kZU1vZHVsZXM6IHN0cmluZztcbn1cblxuLyoqXG4gKiBNaXJyb3JzIGEgbm9kZV9tb2R1bGVzIHRyZWUgaW50byB0aGUgd29ya3RyZWUgdXNpbmcgc3ltbGlua3MuXG4gKlxuICogSW50ZXJuYWwgd29ya3NwYWNlIGxpbmtzIGtlZXAgdGhlaXIgb3JpZ2luYWwgcmVsYXRpdmUgdGFyZ2V0cyB3aGlsZSBleHRlcm5hbFxuICogbGlua3MgYW5kIG5vbi1saW5rIGVudHJpZXMgYXJlIHJlcHJlc2VudGVkIGFzIHN5bWxpbmtzIHRvIHNvdXJjZSBwYXRocy5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFNvdXJjZSBhbmQgZGVzdGluYXRpb24gbm9kZV9tb2R1bGVzIGRpcmVjdG9yaWVzLlxuICogQHJldHVybnMgQ291bnQgb2YgaW50ZXJuYWwgd29ya3NwYWNlIHN5bWxpbmtzIHJlY3JlYXRlZCBieSB0YXJnZXQgcGF0aC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VOb2RlTW9kdWxlcywgZGVzdE5vZGVNb2R1bGVzIH0gPSBvcHRzO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZnMubHN0YXQoc291cmNlTm9kZU1vZHVsZXMpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkZXN0U3RhdHMgPSBhd2FpdCBmcy5sc3RhdChkZXN0Tm9kZU1vZHVsZXMpO1xuICAgIGlmIChkZXN0U3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgYXdhaXQgZnMudW5saW5rKGRlc3ROb2RlTW9kdWxlcyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgZnMubWtkaXIoZGVzdE5vZGVNb2R1bGVzLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihzb3VyY2VOb2RlTW9kdWxlcywgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBjb25zdCBjb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbnRyaWVzLm1hcChhc3luYyAoZW50cnkpOiBQcm9taXNlPG51bWJlcj4gPT4ge1xuICAgICAgY29uc3Qgc291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VOb2RlTW9kdWxlcywgZW50cnkubmFtZSk7XG4gICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbihkZXN0Tm9kZU1vZHVsZXMsIGVudHJ5Lm5hbWUpO1xuXG4gICAgICBpZiAoZW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzb3VyY2VQYXRoKTtcbiAgICAgICAgaWYgKGlzSW50ZXJuYWxTeW1saW5rKHRhcmdldCkpIHtcbiAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHRhcmdldCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkgJiYgZW50cnkubmFtZS5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIoZGVzdFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBzY29wZUVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZVBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICAgICAgY29uc3Qgc2NvcGVDb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICBzY29wZUVudHJpZXMubWFwKGFzeW5jIChzY29wZUVudHJ5KTogUHJvbWlzZTxudW1iZXI+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNjb3BlU291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VQYXRoLCBzY29wZUVudHJ5Lm5hbWUpO1xuICAgICAgICAgICAgY29uc3Qgc2NvcGVEZXN0UGF0aCA9IHBhdGguam9pbihkZXN0UGF0aCwgc2NvcGVFbnRyeS5uYW1lKTtcblxuICAgICAgICAgICAgaWYgKHNjb3BlRW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzY29wZVNvdXJjZVBhdGgpO1xuICAgICAgICAgICAgICBpZiAoaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsodGFyZ2V0LCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHNjb3BlU291cmNlUGF0aCwgc2NvcGVEZXN0UGF0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc2NvcGVTb3VyY2VQYXRoLCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIHNjb3BlQ291bnRzLnJlZHVjZSgoc3VtLCBjKSA9PiBzdW0gKyBjLCAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICB9KVxuICApO1xuXG4gIHJldHVybiBjb3VudHMucmVkdWNlKChzdW0sIGMpID0+IHN1bSArIGMsIDApO1xufVxuXG5pbnRlcmZhY2UgUmVyb3V0ZUFsbE5vZGVNb2R1bGVzT3B0aW9ucyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbn1cblxuLyoqXG4gKiBSZXJvdXRlcyByb290IGFuZCBwZXItcGFja2FnZSBub2RlX21vZHVsZXMgZGlyZWN0b3JpZXMgaW50byB0aGUgd29ya3RyZWUuXG4gKlxuICogVGhlIG9wZXJhdGlvbiBpcyBza2lwcGVkIHdoZW4gdGhlIHJlcG9zaXRvcnkgaGFzIG5vIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIHJvb3QsIGRlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QsIGFuZCByZXBvIHJvb3QuXG4gKiBAcmV0dXJucyBUb3RhbCBudW1iZXIgb2YgcmVjcmVhdGVkIGludGVybmFsIHdvcmtzcGFjZSBzeW1saW5rcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVBbGxOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlQWxsTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgcmVwb1Jvb3QgfSA9IG9wdHM7XG5cbiAgbGV0IHBhY2thZ2VKc29uOiB7IHdvcmtzcGFjZXM/OiBzdHJpbmdbXSB9O1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VKc29uQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhdGguam9pbihyZXBvUm9vdCwgJ3BhY2thZ2UuanNvbicpLCAndXRmLTgnKTtcbiAgICBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25Db250ZW50KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIGlmICghcGFja2FnZUpzb24ud29ya3NwYWNlcykge1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgbGV0IHRvdGFsQ291bnQgPSAwO1xuXG4gIHRvdGFsQ291bnQgKz0gYXdhaXQgcmVyb3V0ZU5vZGVNb2R1bGVzKHtcbiAgICBzb3VyY2VOb2RlTW9kdWxlczogcGF0aC5qb2luKHNvdXJjZVJvb3QsICdub2RlX21vZHVsZXMnKSxcbiAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbih3b3JrdHJlZURpciwgJ25vZGVfbW9kdWxlcycpXG4gIH0pO1xuXG4gIGNvbnN0IHBhY2thZ2VzRGlyID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsICdwYWNrYWdlcycpO1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VFbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihwYWNrYWdlc0RpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcGFja2FnZUVudHJpZXMpIHtcbiAgICAgIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIGNvbnN0IHBrZ05vZGVNb2R1bGVzID0gcGF0aC5qb2luKHBhY2thZ2VzRGlyLCBlbnRyeS5uYW1lLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICAgIGxldCBub2RlTW9kdWxlc0V4aXN0cyA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IGZzLmxzdGF0KHBrZ05vZGVNb2R1bGVzKTtcbiAgICAgICAgICBub2RlTW9kdWxlc0V4aXN0cyA9IHRydWU7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGVNb2R1bGVzRXhpc3RzKSB7XG4gICAgICAgICAgY29uc3QgZGVzdFBhY2thZ2VEaXIgPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsICdwYWNrYWdlcycsIGVudHJ5Lm5hbWUpO1xuICAgICAgICAgIGF3YWl0IGZzLm1rZGlyKGRlc3RQYWNrYWdlRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICB0b3RhbENvdW50ICs9IGF3YWl0IHJlcm91dGVOb2RlTW9kdWxlcyh7XG4gICAgICAgICAgICBzb3VyY2VOb2RlTW9kdWxlczogcGtnTm9kZU1vZHVsZXMsXG4gICAgICAgICAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbihkZXN0UGFja2FnZURpciwgJ25vZGVfbW9kdWxlcycpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdG90YWxDb3VudDtcbn1cblxuaW50ZXJmYWNlIFVwZGF0ZUdpdEV4Y2x1ZGVPcHRpb25zIHtcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbiAgZGlyZWN0b3JpZXM6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogQXBwZW5kcyBzeW1saW5rZWQgaWdub3JlZCBwYXRocyB0byB0aGUgd29ya3RyZWUtc3BlY2lmaWMgZ2l0IGV4Y2x1ZGUgZmlsZS5cbiAqXG4gKiBBbHNvIGVuYWJsZXMgYGV4dGVuc2lvbnMud29ya3RyZWVDb25maWdgIGFuZCBzZXRzIHdvcmt0cmVlLWxvY2FsXG4gKiBgY29yZS5leGNsdWRlc0ZpbGVgIHNvIGdpdCBzdGF0dXMgaW4gdGhlIHdvcmt0cmVlIGlnbm9yZXMgaW5qZWN0ZWQgbGlua3MuXG4gKlxuICogQHBhcmFtIG9wdHMgLSBXb3JrdHJlZSBwYXRoLCByZXBvIHJvb3QsIGFuZCBpZ25vcmVkIHBhdGggY2FuZGlkYXRlcy5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlR2l0RXhjbHVkZShvcHRzOiBVcGRhdGVHaXRFeGNsdWRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IHdvcmt0cmVlRGlyLCByZXBvUm9vdCwgZGlyZWN0b3JpZXMsIGZpbGVzIH0gPSBvcHRzO1xuXG4gIGNvbnN0IHsgc3Rkb3V0OiBnaXREaXIgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCB3b3JrdHJlZURpciwgJ3Jldi1wYXJzZScsICctLWdpdC1kaXInXSwge1xuICAgIHRpbWVvdXQ6IDVfMDAwXG4gIH0pO1xuICBjb25zdCBleGNsdWRlUGF0aCA9IHBhdGguam9pbihnaXREaXIudHJpbSgpLCAnaW5mbycsICdleGNsdWRlJyk7XG4gIGF3YWl0IGZzLm1rZGlyKHBhdGguZGlybmFtZShleGNsdWRlUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gIGNvbnN0IGxpbmVzID0gWycjIFN5bWxpbmtzIGNyZWF0ZWQgYnkgaW5zdGFudC13b3JrdHJlZSddO1xuXG4gIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdG9yaWVzKSB7XG4gICAgaWYgKCFkaXIpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLmxzdGF0KHBhdGguam9pbih3b3JrdHJlZURpciwgZGlyKSk7XG4gICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkgbGluZXMucHVzaChkaXIpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgaWYgKCFmaWxlKSBjb250aW51ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChwYXRoLmpvaW4od29ya3RyZWVEaXIsIGZpbGUpKTtcbiAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSBsaW5lcy5wdXNoKGZpbGUpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgZnMuYXBwZW5kRmlsZShleGNsdWRlUGF0aCwgYCR7bGluZXMuam9pbignXFxuJyl9XFxuYCk7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJy1DJywgcmVwb1Jvb3QsICdjb25maWcnLCAnZXh0ZW5zaW9ucy53b3JrdHJlZUNvbmZpZycsICd0cnVlJ10sIHsgdGltZW91dDogNV8wMDAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICBgY3JlYXRlLXdvcmt0cmVlOiBmYWlsZWQgdG8gc2V0IHdvcmt0cmVlQ29uZmlnIGV4dGVuc2lvbjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICk7XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCB3b3JrdHJlZURpciwgJ2NvbmZpZycsICctLXdvcmt0cmVlJywgJ2NvcmUuZXhjbHVkZXNGaWxlJywgZXhjbHVkZVBhdGhdLCB7XG4gICAgICB0aW1lb3V0OiA1XzAwMFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgYGNyZWF0ZS13b3JrdHJlZTogZmFpbGVkIHRvIHNldCBjb3JlLmV4Y2x1ZGVzRmlsZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICk7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7QUFDQSxTQUFTLFdBQVcsaUJBQWlCOzs7QUNnQnJDLFNBQTRCLFlBQUFBLFdBQVUsYUFBYTtBQUNuRCxTQUFTLGtCQUFrQjtBQUMzQixZQUFZQyxTQUFRO0FBQ3BCLFlBQVlDLFdBQVU7QUFDdEIsU0FBUyxhQUFBQyxrQkFBaUI7OztBQ1gxQixTQUFTLFlBQVksYUFBQUMsWUFBVyxnQkFBQUMsZUFBYyxPQUFPLGlCQUFBQyxzQkFBcUI7QUFDMUUsU0FBUyxlQUFlO0FBQ3hCLFNBQVMsV0FBQUMsVUFBUyxZQUFZOzs7QUNDOUIsU0FBUyxXQUFXLFdBQVcsVUFBVSxjQUFjLFlBQVksWUFBWSxxQkFBcUI7QUFDcEcsU0FBUyxlQUFlOzs7QUNOeEIsU0FBUyxnQkFBZ0I7QUFDekIsU0FBUyxnQkFBZ0I7OztBRlF6QixTQUFTLGNBQXNCO0FBQzdCLFNBQU8sS0FBSyxRQUFRLEdBQUcsUUFBUTtBQUNqQztBQXFCTyxJQUFNLG1CQUFtQixLQUFLLEtBQUssS0FBSztBQW1KL0MsU0FBUyw4QkFBc0M7QUFDN0MsU0FBTyxLQUFLLFlBQVksR0FBRyxxQkFBcUIsV0FBVztBQUM3RDtBQWdEQSxTQUFTLGtCQUFrQixjQUFzQixLQUFxQztBQUNwRixNQUFJO0FBQ0YsVUFBTSxVQUFVQyxjQUFhLGNB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QUFNLE1BQU07QUFBQSxRQUN6QztBQUFBLE1BQ0YsQ0FBQztBQUVELGlCQUFXLFFBQVEsV0FBVyxNQUFNLElBQUksR0FBRztBQUN6QyxZQUFJLEtBQUssS0FBSyxHQUFHO0FBQ2YsaUJBQU8sTUFBTSxJQUFJO0FBQUEsUUFDbkI7QUFBQSxNQUNGO0FBRUEsWUFBTSxTQUFTLE1BQU0sT0FBTyxNQUFNO0FBQ2xDLGNBQVEsT0FBTyxLQUFLLDJCQUEyQixFQUFFLFdBQVcsVUFBVSxHQUFHLE9BQU8sQ0FBQztBQUFBLElBQ25GO0FBR0EsUUFBSTtBQUNGLFlBQU0sc0JBQXNCLE9BQU8sUUFBUSxZQUFZLFFBQVEsTUFBTTtBQUFBLElBQ3ZFLFNBQVMsT0FBTztBQUNkLGNBQVEsT0FBTyxLQUFLLHlCQUF5QjtBQUFBLFFBQzNDLE9BQU8sYUFBYSxLQUFLO0FBQUEsTUFDM0IsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGO0FBQ0Y7OztBRHRZQSxJQUFNLHFCQUFxQjtBQUMzQixJQUFNLGFBQWEsUUFBUSxJQUFJLGdCQUFnQjtBQUMvQyxJQUFJLGNBQWMsQ0FBQyxRQUFRLElBQUksc0JBQXNCLEdBQUc7QUFDdEQsVUFBUSxJQUFJLHNCQUFzQixJQUFJLFVBQVUsWUFBWSxrQkFBa0I7QUFDaEY7QUFLQSxlQUFlLGNBQU87IiwKICAibmFtZXMiOiBbImV4ZWNGaWxlIiwgImZzIiwgInBhdGgiLCAicHJvbWlzaWZ5IiwgIm1rZGlyU3luYyIsICJyZWFkRmlsZVN5bmMiLCAid3JpdGVGaWxlU3luYyIsICJkaXJuYW1lIiwgInJlYWRGaWxlU3luYyIsICJkaXJuYW1lIiwgIm1rZGlyU3luYyIsICJ3cml0ZUZpbGVTeW5jIiwgInJlc29sdmUiLCAicGF0aCIsICJyZWFkRmlsZVN5bmMiLCAicmVhZEZpbGVTeW5jIiwgImNsb3NlU3luYyIsICJleGlzdHNTeW5jIiwgIm1rZGlyU3luYyIsICJvcGVuU3luYyIsICJkaXJuYW1lIiwgInJlc29sdmUiLCAiZXhlY0ZpbGVBc3luYyIsICJwcm9taXNpZnkiLCAiZXhlY0ZpbGUiLCAibG9nZ2VyIiwgInJlc29sdmUiXQp9Cg==
