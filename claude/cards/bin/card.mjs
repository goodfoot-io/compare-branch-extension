// src/bin/card.ts
import { execFileSync as execFileSync3, spawnSync as spawnSync2 } from "node:child_process";
import { realpathSync } from "node:fs";

// src/cardRepo.ts
import { execFileSync } from "node:child_process";

// src/protocol/types/branch.ts
var BRANCHES_FILE = "branches.json";
var COMMITS_FILE = "commits.csv";

// src/protocol/types/card.ts
var DEFAULT_CARD_GATES = {
  planRequired: false,
  planApproved: false,
  mergeRequestRequired: false,
  mergeApproved: false
};

// src/client/cardRepoFilters.ts
var SESSION_STREAM_PREFIX = "streams/claude-code-session/";
var BOOKKEEPING_PATHSPEC_EXCLUSIONS = [
  ":!streams/claude-code-session/",
  `:!${COMMITS_FILE}`,
  `:!${BRANCHES_FILE}`
];
var CARD_REPO_LOG_PATHSPEC_EXCLUSIONS = [":!streams/", `:!${COMMITS_FILE}`, `:!${BRANCHES_FILE}`];
function isBookkeepingCommit(commit) {
  return commit.diff.files.every(
    (f) => f.file === COMMITS_FILE || f.file === BRANCHES_FILE || f.file.startsWith(SESSION_STREAM_PREFIX)
  );
}
function getUnattributedCommits(allCommits, sessionCommits) {
  const sessionSet = new Set(sessionCommits);
  return allCommits.filter((sha) => !sessionSet.has(sha));
}
function formatCommit(commit) {
  const shortSha = commit.hash.slice(0, 7);
  const header = `${shortSha} - ${commit.author_name}: ${commit.message}`;
  const fileLines = commit.diff.files.map((f) => {
    if (f.status.startsWith("R") && f.from !== void 0) {
      return ` ${f.status} ${f.from} -> ${f.file}`;
    }
    return ` ${f.status} ${f.file}`;
  });
  return [header, ...fileLines].join("\n");
}

// src/cardRepo.ts
var SHA_PATTERN = /^[0-9a-f]{40}$/i;
function assertValidSha(sha, label) {
  if (!SHA_PATTERN.test(sha)) {
    throw new Error(`Invalid ${label}: ${sha}`);
  }
}
function getCommitsSince(repoPath, sinceSha) {
  assertValidSha(sinceSha, "since SHA");
  const output = execFileSync(
    "git",
    ["log", "--format=%H", `${sinceSha}..HEAD`, "--", ".", ...BOOKKEEPING_PATHSPEC_EXCLUSIONS],
    {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 1e4,
      stdio: ["pipe", "pipe", "pipe"]
    }
  ).trim();
  if (!output) return [];
  const shas = output.split("\n");
  for (const sha of shas) {
    assertValidSha(sha, "commit SHA");
  }
  return shas;
}

// src/cardSummary.ts
function toCardListSummary(card) {
  if (!card.gates) {
    console.error("[toCardListSummary] card.gates is undefined for card:", JSON.stringify(card, null, 2));
  }
  const gates = card.gates ?? DEFAULT_CARD_GATES;
  return {
    id: card.id,
    repositoryId: card.repositoryId,
    title: card.title,
    status: card.status,
    tags: card.tags,
    isPinned: card.isPinned,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    order: card.order,
    // Flatten gate fields
    planRequired: gates.planRequired,
    planApproved: gates.planApproved,
    mergeRequestRequired: gates.mergeRequestRequired,
    mergeApproved: gates.mergeApproved,
    // Derived fields
    isMerged: card.isMerged,
    hasStaleMerge: card.hasStaleMerge,
    hasUnread: card.hasUnread,
    relations: card.relations ?? [],
    incomingRelations: card.incomingRelations ?? [],
    parentBranch: card.parentBranch
  };
}
function toCardListSummaries(cards) {
  return cards.map(toCardListSummary);
}

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
  buildUrl(path2, params) {
    const url = new URL(path2, this.options.baseUrl);
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

// src/client/eventSubscriber.ts
function calculateBackoffMs(attempt, maxMs = 3e4) {
  return Math.min(1e3 * 2 ** attempt, maxMs);
}
var EventSubscriber = class {
  /**
   * Creates a new EventSubscriber instance.
   *
   * @param options - WebSocket URL, auth token, discover function, and reconnect limits.
   */
  constructor(options) {
    this.options = options;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? Infinity;
  }
  ws = null;
  connected = false;
  reconnectAttempts = 0;
  reconnectTimeout = null;
  callbacks = /* @__PURE__ */ new Map();
  shouldReconnect = false;
  connectionChangeCallbacks = /* @__PURE__ */ new Set();
  hasConnected = false;
  maxReconnectAttempts;
  rawHandlers = [];
  /**
   * Gets the WebSocket URL.
   *
   * Returns the construction-time URL from options. Discovered URLs are transient
   * and are not reflected here.
   *
   * @returns The configured WebSocket endpoint URL.
   */
  getWsUrl() {
    return this.options.wsUrl;
  }
  /**
   * Returns whether the subscriber is currently connected.
   *
   * @returns True when the active socket connection is open.
   */
  isConnected() {
    return this.connected;
  }
  /**
   * Subscribes to an event type.
   *
   * @param event - Event key from {@link EventMap}.
   * @param callback - Handler invoked for matching events.
   */
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, /* @__PURE__ */ new Set());
    }
    this.callbacks.get(event).add(callback);
  }
  /**
   * Unsubscribes from an event type.
   *
   * @param event - Event key from {@link EventMap}.
   * @param callback - Previously registered handler.
   */
  off(event, callback) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }
  /**
   * Registers a callback invoked when the connection state changes.
   *
   * Callbacks are only invoked after the first successful connection. This
   * prevents a spurious `false` during the initial connection attempt.
   *
   * @param callback - Function called with `true` on connect, `false` on disconnect.
   * @returns Unsubscribe function to remove this callback.
   */
  onConnectionChange(callback) {
    this.connectionChangeCallbacks.add(callback);
    return () => {
      this.connectionChangeCallbacks.delete(callback);
    };
  }
  /**
   * Connects to the WebSocket server and starts listening for events.
   *
   * When `overrides` are provided (e.g. from a discovery result), those values
   * are used for this connection instead of the construction-time options.
   * The access token is always appended as a `?token=` query parameter.
   * Connection failures reject the returned promise.
   *
   * @param overrides - Optional URL and token to use instead of construction-time options.
   * @param overrides.wsUrl - WebSocket URL to connect to.
   * @param overrides.accessToken - Bearer token for authentication.
   * @returns Promise that resolves when the socket opens.
   */
  async connect(overrides) {
    const wsUrl = overrides?.wsUrl ?? this.options.wsUrl;
    const accessToken = overrides?.accessToken ?? this.options.accessToken;
    const url = `${wsUrl}?token=${encodeURIComponent(accessToken)}`;
    this.ws = new globalThis.WebSocket(url);
    this.shouldReconnect = true;
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error("Failed to create WebSocket"));
        return;
      }
      const ws = this.ws;
      const cleanup = () => {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("error", onError);
      };
      const onOpen = () => {
        this.connected = true;
        this.hasConnected = true;
        this.reconnectAttempts = 0;
        cleanup();
        for (const cb of this.connectionChangeCallbacks) {
          cb(true);
        }
        resolve();
      };
      const onError = (event) => {
        cleanup();
        reject(new Error(`WebSocket connection failed: ${event.type}`));
      };
      ws.addEventListener("open", onOpen);
      ws.addEventListener("error", onError);
      ws.addEventListener("close", () => {
        this.connected = false;
        if (this.hasConnected) {
          for (const cb of this.connectionChangeCallbacks) {
            cb(false);
          }
        }
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      });
      ws.addEventListener("message", (event) => {
        this.handleMessage(event);
      });
    });
  }
  /**
   * Disconnects from the WebSocket server and disables auto-reconnect.
   *
   * Registered callbacks are preserved, so calling {@link connect} again will
   * resume dispatching without re-registering listeners.
   */
  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
  /**
   * Sends a JSON-serialized message on the active WebSocket connection.
   *
   * Throws if the subscriber is not currently connected (fail closed).
   *
   * @param data - Arbitrary key-value payload to JSON-serialize and send.
   * @throws Error when the subscriber is not connected.
   */
  send(data) {
    if (!this.isConnected()) {
      throw new Error("Cannot send: EventSubscriber is not connected");
    }
    this.ws.send(JSON.stringify(data));
  }
  /**
   * Schedules a reconnection attempt with exponential backoff.
   *
   * Before connecting, calls `discover()` to resolve the current server URL and
   * access token. If discovery returns an error or throws, the attempt is counted
   * toward `maxReconnectAttempts` and the next attempt is scheduled.
   */
  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.shouldReconnect = false;
      return;
    }
    const backoffMs = calculateBackoffMs(this.reconnectAttempts);
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (!this.shouldReconnect) {
        return;
      }
      this.options.discover().then((result) => {
        if (!this.shouldReconnect) {
          return;
        }
        if ("error" in result) {
          console.warn(
            `[EventSubscriber] Discovery failed before reconnect attempt ${this.reconnectAttempts}:`,
            result.error
          );
          this.scheduleReconnect();
          return;
        }
        this.connect({ wsUrl: result.wsUrl, accessToken: result.accessToken }).catch((err) => {
          console.warn(
            `[EventSubscriber] Reconnection attempt ${this.reconnectAttempts} failed:`,
            err instanceof Error ? err.message : String(err)
          );
        });
      }).catch((err) => {
        if (!this.shouldReconnect) {
          return;
        }
        console.warn(
          `[EventSubscriber] Discovery threw before reconnect attempt ${this.reconnectAttempts}:`,
          err instanceof Error ? err.message : String(err)
        );
        this.scheduleReconnect();
      });
    }, backoffMs);
  }
  /**
   * Registers a handler invoked for every successfully parsed incoming message,
   * regardless of type. Fires after typed callbacks, and is not suppressed by
   * errors thrown inside typed callbacks.
   *
   * @param handler - Function called with the raw parsed message object.
   * @returns Unsubscribe function to remove this handler.
   */
  onRawMessage(handler) {
    this.rawHandlers.push(handler);
    return () => {
      const i = this.rawHandlers.indexOf(handler);
      if (i !== -1) this.rawHandlers.splice(i, 1);
    };
  }
  /**
   * Handles incoming WebSocket messages and dispatches to registered callbacks.
   *
   * Messages are expected to be JSON with a `type` field matching {@link EventMap}.
   *
   * @param event - Browser WebSocket message event containing the serialized payload.
   */
  handleMessage(event) {
    let message;
    try {
      message = JSON.parse(event.data);
      const callbacks = this.callbacks.get(message.type);
      if (callbacks) {
        for (const callback of callbacks) {
          callback(message);
        }
      }
    } catch (error) {
      console.warn("Failed to parse WebSocket message:", error);
    }
    if (message !== void 0) {
      for (const handler of this.rawHandlers) {
        handler(message);
      }
    }
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

// src/searchUtils.ts
var DERIVED_TAGS = ["planning", "merge-requested", "merged", "unmerged"];
function getDerivedTags(card) {
  const tags = [];
  if (card.planRequired && !card.planApproved) {
    tags.push("planning");
  }
  if (card.status !== "active") {
    if (card.mergeRequestRequired && card.isMerged === false && !card.mergeApproved) {
      tags.push("merge-requested");
    }
    if (card.isMerged === true && !card.hasStaleMerge) {
      tags.push("merged");
    }
    if (card.isMerged === false && (!card.mergeRequestRequired || card.mergeApproved)) {
      tags.push("unmerged");
    }
  }
  return tags;
}
function parseSearchQuery(query) {
  const tagPattern = /#([\w-]+)/g;
  const relationPattern = /@([\w-]+)/g;
  const tags = [];
  const relatedTo = [];
  let match2 = tagPattern.exec(query);
  while (match2 !== null) {
    const tagName = match2[1];
    if (tagName) {
      tags.push(tagName.toLowerCase());
    }
    match2 = tagPattern.exec(query);
  }
  match2 = relationPattern.exec(query);
  while (match2 !== null) {
    const cardId = match2[1];
    if (cardId) {
      relatedTo.push(cardId);
    }
    match2 = relationPattern.exec(query);
  }
  const text = query.replace(tagPattern, "").replace(relationPattern, "").trim();
  return { text, tags, relatedTo };
}
function filterCardsByTags(cards, filterTags, relatedTo = []) {
  if (filterTags.length === 0 && relatedTo.length === 0) return cards;
  return cards.filter((card) => {
    let matchesTags = false;
    if (filterTags.length > 0) {
      const hasStoredTag = card.tags?.some((tag) => filterTags.includes(tag.toLowerCase()));
      if (hasStoredTag) {
        matchesTags = true;
      } else {
        const derivedTags = getDerivedTags(card);
        matchesTags = derivedTags.some((tag) => filterTags.includes(tag));
      }
    }
    let matchesRelation = false;
    if (relatedTo.length > 0) {
      matchesRelation = relatedTo.includes(card.id) || (card.relations ?? []).some((r) => relatedTo.includes(r.cardId)) || card.incomingRelations.some((r) => relatedTo.includes(r.cardId));
    }
    if (filterTags.length > 0 && relatedTo.length > 0) return matchesTags && matchesRelation;
    return matchesTags || matchesRelation;
  });
}

// ../claude-code-sessions/src/index.ts
import { readFile as readFile2 } from "node:fs/promises";
import { homedir as homedir2 } from "node:os";
import { join as join2 } from "node:path";

// ../claude-code-sessions/src/internal.ts
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// ../claude-code-sessions/src/ipc.ts
import { execFileSync as execFileSync2 } from "node:child_process";
function isProcessAlive(pid) {
  if (process.platform === "win32") {
    try {
      const output = execFileSync2("tasklist", ["/FI", `PID eq ${pid}`, "/NH"], {
        encoding: "utf-8"
      });
      return output.includes(String(pid));
    } catch {
      return false;
    }
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const code = error.code;
      if (code === "ESRCH") return false;
      if (code === "EPERM") return true;
    }
    throw error;
  }
}

// ../claude-code-sessions/src/internal.ts
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function hasErrnoCode(error, code) {
  return error instanceof Error && "code" in error && error.code === code;
}
function tryRemoveStaleLock(lockPath) {
  try {
    const lockContent = readFileSync(lockPath, "utf-8");
    const holderPid = Number.parseInt(lockContent.trim(), 10);
    if (!Number.isNaN(holderPid) && !isProcessAlive(holderPid)) {
      if (readFileSync(lockPath, "utf-8") === lockContent) {
        unlinkSync(lockPath);
        return true;
      }
    }
  } catch {
    try {
      unlinkSync(lockPath);
      return true;
    } catch {
    }
  }
  return false;
}
function writeLockHolderPid(lockPath) {
  const fd = openSync(lockPath, "wx", 384);
  try {
    writeFileSync(fd, String(process.pid));
  } finally {
    closeSync(fd);
  }
}
async function acquireLock(lockPath, timeoutMs) {
  const startTime = Date.now();
  const dir = dirname(lockPath);
  while (Date.now() - startTime < timeoutMs) {
    try {
      mkdirSync(dir, { recursive: true, mode: 448 });
      writeLockHolderPid(lockPath);
      return;
    } catch (error) {
      if (!hasErrnoCode(error, "EEXIST")) throw error;
      if (tryRemoveStaleLock(lockPath)) continue;
      const remaining = timeoutMs - (Date.now() - startTime);
      if (remaining > 0) {
        await sleep(Math.min(50, remaining));
      }
    }
  }
  throw new Error("Lock acquisition timeout");
}
function releaseLock(lockPath) {
  try {
    unlinkSync(lockPath);
  } catch (error) {
    if (!hasErrnoCode(error, "ENOENT")) throw error;
  }
}
function pruneStaleEntries(registry, isAlive, maxAgeMs) {
  const now = Date.now();
  for (const [pidStr, entry] of Object.entries(registry)) {
    const pid = Number.parseInt(pidStr, 10);
    if (Number.isNaN(pid)) {
      delete registry[pidStr];
      continue;
    }
    try {
      const updatedAt = new Date(entry.updatedAt).getTime();
      if (now - updatedAt > maxAgeMs) {
        delete registry[pidStr];
        continue;
      }
    } catch {
      delete registry[pidStr];
      continue;
    }
    try {
      if (!isAlive(pid)) {
        delete registry[pidStr];
      }
    } catch {
    }
  }
}
function readRegistry(path2, defaultValue) {
  try {
    const content = readFileSync(path2, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (hasErrnoCode(error, "ENOENT")) return defaultValue;
    throw error;
  }
}
function writeRegistryLocked(registry, registryPath) {
  const dir = dirname(registryPath);
  mkdirSync(dir, { recursive: true, mode: 448 });
  const tempPath = `${registryPath}.tmp`;
  try {
    writeFileSync(tempPath, JSON.stringify(registry, null, 2), { mode: 384 });
    renameSync(tempPath, registryPath);
  } catch (error) {
    try {
      unlinkSync(tempPath);
    } catch {
    }
    throw error;
  }
}
async function executeTransaction(registryPath, lockPath, operation, pruner, defaultRegistry, lockTimeoutMs) {
  await acquireLock(lockPath, lockTimeoutMs ?? 2e3);
  try {
    const registry = readRegistry(registryPath, defaultRegistry);
    if (pruner) pruner(registry);
    const result = operation(registry);
    writeRegistryLocked(registry, registryPath);
    return result;
  } finally {
    releaseLock(lockPath);
  }
}

// ../claude-code-sessions/src/process-tree.ts
import { execSync } from "node:child_process";
var PROCESS_TREE_MAX_DEPTH = 10;
var AGENT_ARGS_PATTERNS = [/((^|\s|\/)claude(\/|\s|$))/i, /((^|\s|\/)codex(\/|\s|$))/i];
function isSupportedAgent(pid) {
  try {
    const args = execSync(`ps -p ${pid} -o args=`, { encoding: "utf8" }).trim();
    return AGENT_ARGS_PATTERNS.some((pattern) => pattern.test(args));
  } catch {
    return false;
  }
}
function getParentPid(pid) {
  try {
    const ppidStr = execSync(`ps -p ${pid} -o ppid=`, { encoding: "utf8" }).trim();
    const parentPid = Number.parseInt(ppidStr, 10);
    if (Number.isNaN(parentPid) || parentPid === pid) return null;
    return parentPid;
  } catch {
    return null;
  }
}
function findAgentPid(startPid) {
  const pids = findAllAgentPids(startPid);
  return pids[0] ?? null;
}
function findAllAgentPids(startPid) {
  const results = [];
  let pid = startPid ?? process.ppid;
  for (let depth = 0; depth < PROCESS_TREE_MAX_DEPTH; depth++) {
    if (pid <= 1) break;
    if (isSupportedAgent(pid)) {
      results.push(pid);
    }
    const parentPid = getParentPid(pid);
    if (parentPid === null) break;
    pid = parentPid;
  }
  return results;
}

// ../claude-code-sessions/src/index.ts
function getCardsDir() {
  return join2(homedir2(), ".cards");
}
function getRegistryPath() {
  return join2(getCardsDir(), "sessions.json");
}
function getLockPath() {
  return join2(getCardsDir(), "sessions.lock");
}
var LOCK_TIMEOUT_MS = 2e3;
var MAX_ENTRY_AGE_MS = 24 * 60 * 60 * 1e3;
async function associatePidWithCard(pid, cardId, options) {
  return executeTransaction(
    getRegistryPath(),
    getLockPath(),
    (registry) => {
      const pidStr = String(pid);
      const entry = registry.sessions[pidStr];
      if (entry?.cardId) return [];
      const pendingCommits = entry?.pendingCommits ?? [];
      registry.sessions[pidStr] = {
        cardId,
        ...options?.mode !== void 0 ? { mode: options.mode } : {},
        ...options?.workspacePath !== void 0 ? { workspacePath: options.workspacePath } : {},
        pendingCommits: [],
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      return pendingCommits;
    },
    (registry) => pruneStaleEntries(registry.sessions, isProcessAlive, MAX_ENTRY_AGE_MS),
    { sessions: {} },
    LOCK_TIMEOUT_MS
  );
}
async function removePidEntry(pid) {
  return executeTransaction(
    getRegistryPath(),
    getLockPath(),
    (registry) => {
      const pidStr = String(pid);
      const entry = registry.sessions[pidStr];
      if (entry) {
        delete registry.sessions[pidStr];
        return entry;
      }
      return null;
    },
    (registry) => pruneStaleEntries(registry.sessions, isProcessAlive, MAX_ENTRY_AGE_MS),
    { sessions: {} },
    LOCK_TIMEOUT_MS
  );
}
function getCardRepoPidsRegistryPath() {
  return join2(getCardsDir(), "card-repo-commits", "pids.json");
}
async function getSessionIdForPid(pid) {
  const registryPath = getCardRepoPidsRegistryPath();
  try {
    const content = await readFile2(registryPath, "utf-8");
    const registry = JSON.parse(content);
    return registry.sessions[String(pid)]?.sessionId ?? null;
  } catch (error) {
    if (hasErrnoCode(error, "ENOENT")) return null;
    throw error;
  }
}

// ../claude-code-sessions/src/card-repo.ts
import { appendFileSync, mkdirSync as mkdirSync2, readFileSync as readFileSync2, unlinkSync as unlinkSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { homedir as homedir3 } from "node:os";
import { join as join3 } from "node:path";
var LOCK_TIMEOUT_MS2 = 2e3;
function getCardRepoCommitsDir() {
  return join3(homedir3(), ".cards", "card-repo-commits");
}
function getSessionCsvPath(sessionId) {
  return join3(getCardRepoCommitsDir(), `${sessionId}.csv`);
}
function getSessionCsvLockPath(sessionId) {
  return join3(getCardRepoCommitsDir(), `${sessionId}.csv.lock`);
}
function getSessionHeadShaPath(sessionId) {
  return join3(getCardRepoCommitsDir(), `${sessionId}.head`);
}
async function appendCommitToSession(sessionId, sha) {
  mkdirSync2(getCardRepoCommitsDir(), { recursive: true, mode: 448 });
  const csvLockPath = getSessionCsvLockPath(sessionId);
  await acquireLock(csvLockPath, LOCK_TIMEOUT_MS2);
  try {
    const csvPath = getSessionCsvPath(sessionId);
    const existingCommits = getSessionCommits(sessionId);
    if (!existingCommits.includes(sha)) {
      appendFileSync(csvPath, `${sha}
`, { mode: 384 });
    }
  } finally {
    releaseLock(csvLockPath);
  }
}
function getSessionCommits(sessionId) {
  try {
    const csvPath = getSessionCsvPath(sessionId);
    const content = readFileSync2(csvPath, "utf-8");
    return content.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  } catch (error) {
    if (hasErrnoCode(error, "ENOENT")) return [];
    throw error;
  }
}
function readSessionHeadSha(sessionId) {
  try {
    return readFileSync2(getSessionHeadShaPath(sessionId), "utf-8").trim();
  } catch (error) {
    if (hasErrnoCode(error, "ENOENT")) return null;
    throw error;
  }
}

// ../../../../../../../../../../../workspace/node_modules/jsonpath-plus/dist/index-node-esm.js
import vm from "vm";
var Hooks = class {
  /**
   * @callback HookCallback
   * @this {*|Jsep} this
   * @param {Jsep} env
   * @returns: void
   */
  /**
   * Adds the given callback to the list of callbacks for the given hook.
   *
   * The callback will be invoked when the hook it is registered for is run.
   *
   * One callback function can be registered to multiple hooks and the same hook multiple times.
   *
   * @param {string|object} name The name of the hook, or an object of callbacks keyed by name
   * @param {HookCallback|boolean} callback The callback function which is given environment variables.
   * @param {?boolean} [first=false] Will add the hook to the top of the list (defaults to the bottom)
   * @public
   */
  add(name, callback, first) {
    if (typeof arguments[0] != "string") {
      for (let name2 in arguments[0]) {
        this.add(name2, arguments[0][name2], arguments[1]);
      }
    } else {
      (Array.isArray(name) ? name : [name]).forEach(function(name2) {
        this[name2] = this[name2] || [];
        if (callback) {
          this[name2][first ? "unshift" : "push"](callback);
        }
      }, this);
    }
  }
  /**
   * Runs a hook invoking all registered callbacks with the given environment variables.
   *
   * Callbacks will be invoked synchronously and in the order in which they were registered.
   *
   * @param {string} name The name of the hook.
   * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
   * @public
   */
  run(name, env) {
    this[name] = this[name] || [];
    this[name].forEach(function(callback) {
      callback.call(env && env.context ? env.context : env, env);
    });
  }
};
var Plugins = class {
  constructor(jsep2) {
    this.jsep = jsep2;
    this.registered = {};
  }
  /**
   * @callback PluginSetup
   * @this {Jsep} jsep
   * @returns: void
   */
  /**
   * Adds the given plugin(s) to the registry
   *
   * @param {object} plugins
   * @param {string} plugins.name The name of the plugin
   * @param {PluginSetup} plugins.init The init function
   * @public
   */
  register(...plugins) {
    plugins.forEach((plugin2) => {
      if (typeof plugin2 !== "object" || !plugin2.name || !plugin2.init) {
        throw new Error("Invalid JSEP plugin format");
      }
      if (this.registered[plugin2.name]) {
        return;
      }
      plugin2.init(this.jsep);
      this.registered[plugin2.name] = plugin2;
    });
  }
};
var Jsep = class _Jsep {
  /**
   * @returns {string}
   */
  static get version() {
    return "1.4.0";
  }
  /**
   * @returns {string}
   */
  static toString() {
    return "JavaScript Expression Parser (JSEP) v" + _Jsep.version;
  }
  // ==================== CONFIG ================================
  /**
   * @method addUnaryOp
   * @param {string} op_name The name of the unary op to add
   * @returns {Jsep}
   */
  static addUnaryOp(op_name) {
    _Jsep.max_unop_len = Math.max(op_name.length, _Jsep.max_unop_len);
    _Jsep.unary_ops[op_name] = 1;
    return _Jsep;
  }
  /**
   * @method jsep.addBinaryOp
   * @param {string} op_name The name of the binary op to add
   * @param {number} precedence The precedence of the binary op (can be a float). Higher number = higher precedence
   * @param {boolean} [isRightAssociative=false] whether operator is right-associative
   * @returns {Jsep}
   */
  static addBinaryOp(op_name, precedence, isRightAssociative) {
    _Jsep.max_binop_len = Math.max(op_name.length, _Jsep.max_binop_len);
    _Jsep.binary_ops[op_name] = precedence;
    if (isRightAssociative) {
      _Jsep.right_associative.add(op_name);
    } else {
      _Jsep.right_associative.delete(op_name);
    }
    return _Jsep;
  }
  /**
   * @method addIdentifierChar
   * @param {string} char The additional character to treat as a valid part of an identifier
   * @returns {Jsep}
   */
  static addIdentifierChar(char) {
    _Jsep.additional_identifier_chars.add(char);
    return _Jsep;
  }
  /**
   * @method addLiteral
   * @param {string} literal_name The name of the literal to add
   * @param {*} literal_value The value of the literal
   * @returns {Jsep}
   */
  static addLiteral(literal_name, literal_value) {
    _Jsep.literals[literal_name] = literal_value;
    return _Jsep;
  }
  /**
   * @method removeUnaryOp
   * @param {string} op_name The name of the unary op to remove
   * @returns {Jsep}
   */
  static removeUnaryOp(op_name) {
    delete _Jsep.unary_ops[op_name];
    if (op_name.length === _Jsep.max_unop_len) {
      _Jsep.max_unop_len = _Jsep.getMaxKeyLen(_Jsep.unary_ops);
    }
    return _Jsep;
  }
  /**
   * @method removeAllUnaryOps
   * @returns {Jsep}
   */
  static removeAllUnaryOps() {
    _Jsep.unary_ops = {};
    _Jsep.max_unop_len = 0;
    return _Jsep;
  }
  /**
   * @method removeIdentifierChar
   * @param {string} char The additional character to stop treating as a valid part of an identifier
   * @returns {Jsep}
   */
  static removeIdentifierChar(char) {
    _Jsep.additional_identifier_chars.delete(char);
    return _Jsep;
  }
  /**
   * @method removeBinaryOp
   * @param {string} op_name The name of the binary op to remove
   * @returns {Jsep}
   */
  static removeBinaryOp(op_name) {
    delete _Jsep.binary_ops[op_name];
    if (op_name.length === _Jsep.max_binop_len) {
      _Jsep.max_binop_len = _Jsep.getMaxKeyLen(_Jsep.binary_ops);
    }
    _Jsep.right_associative.delete(op_name);
    return _Jsep;
  }
  /**
   * @method removeAllBinaryOps
   * @returns {Jsep}
   */
  static removeAllBinaryOps() {
    _Jsep.binary_ops = {};
    _Jsep.max_binop_len = 0;
    return _Jsep;
  }
  /**
   * @method removeLiteral
   * @param {string} literal_name The name of the literal to remove
   * @returns {Jsep}
   */
  static removeLiteral(literal_name) {
    delete _Jsep.literals[literal_name];
    return _Jsep;
  }
  /**
   * @method removeAllLiterals
   * @returns {Jsep}
   */
  static removeAllLiterals() {
    _Jsep.literals = {};
    return _Jsep;
  }
  // ==================== END CONFIG ============================
  /**
   * @returns {string}
   */
  get char() {
    return this.expr.charAt(this.index);
  }
  /**
   * @returns {number}
   */
  get code() {
    return this.expr.charCodeAt(this.index);
  }
  /**
   * @param {string} expr a string with the passed in express
   * @returns Jsep
   */
  constructor(expr) {
    this.expr = expr;
    this.index = 0;
  }
  /**
   * static top-level parser
   * @returns {jsep.Expression}
   */
  static parse(expr) {
    return new _Jsep(expr).parse();
  }
  /**
   * Get the longest key length of any object
   * @param {object} obj
   * @returns {number}
   */
  static getMaxKeyLen(obj) {
    return Math.max(0, ...Object.keys(obj).map((k) => k.length));
  }
  /**
   * `ch` is a character code in the next three functions
   * @param {number} ch
   * @returns {boolean}
   */
  static isDecimalDigit(ch) {
    return ch >= 48 && ch <= 57;
  }
  /**
   * Returns the precedence of a binary operator or `0` if it isn't a binary operator. Can be float.
   * @param {string} op_val
   * @returns {number}
   */
  static binaryPrecedence(op_val) {
    return _Jsep.binary_ops[op_val] || 0;
  }
  /**
   * Looks for start of identifier
   * @param {number} ch
   * @returns {boolean}
   */
  static isIdentifierStart(ch) {
    return ch >= 65 && ch <= 90 || // A...Z
    ch >= 97 && ch <= 122 || // a...z
    ch >= 128 && !_Jsep.binary_ops[String.fromCharCode(ch)] || // any non-ASCII that is not an operator
    _Jsep.additional_identifier_chars.has(String.fromCharCode(ch));
  }
  /**
   * @param {number} ch
   * @returns {boolean}
   */
  static isIdentifierPart(ch) {
    return _Jsep.isIdentifierStart(ch) || _Jsep.isDecimalDigit(ch);
  }
  /**
   * throw error at index of the expression
   * @param {string} message
   * @throws
   */
  throwError(message) {
    const error = new Error(message + " at character " + this.index);
    error.index = this.index;
    error.description = message;
    throw error;
  }
  /**
   * Run a given hook
   * @param {string} name
   * @param {jsep.Expression|false} [node]
   * @returns {?jsep.Expression}
   */
  runHook(name, node) {
    if (_Jsep.hooks[name]) {
      const env = {
        context: this,
        node
      };
      _Jsep.hooks.run(name, env);
      return env.node;
    }
    return node;
  }
  /**
   * Runs a given hook until one returns a node
   * @param {string} name
   * @returns {?jsep.Expression}
   */
  searchHook(name) {
    if (_Jsep.hooks[name]) {
      const env = {
        context: this
      };
      _Jsep.hooks[name].find(function(callback) {
        callback.call(env.context, env);
        return env.node;
      });
      return env.node;
    }
  }
  /**
   * Push `index` up to the next non-space character
   */
  gobbleSpaces() {
    let ch = this.code;
    while (ch === _Jsep.SPACE_CODE || ch === _Jsep.TAB_CODE || ch === _Jsep.LF_CODE || ch === _Jsep.CR_CODE) {
      ch = this.expr.charCodeAt(++this.index);
    }
    this.runHook("gobble-spaces");
  }
  /**
   * Top-level method to parse all expressions and returns compound or single node
   * @returns {jsep.Expression}
   */
  parse() {
    this.runHook("before-all");
    const nodes = this.gobbleExpressions();
    const node = nodes.length === 1 ? nodes[0] : {
      type: _Jsep.COMPOUND,
      body: nodes
    };
    return this.runHook("after-all", node);
  }
  /**
   * top-level parser (but can be reused within as well)
   * @param {number} [untilICode]
   * @returns {jsep.Expression[]}
   */
  gobbleExpressions(untilICode) {
    let nodes = [], ch_i, node;
    while (this.index < this.expr.length) {
      ch_i = this.code;
      if (ch_i === _Jsep.SEMCOL_CODE || ch_i === _Jsep.COMMA_CODE) {
        this.index++;
      } else {
        if (node = this.gobbleExpression()) {
          nodes.push(node);
        } else if (this.index < this.expr.length) {
          if (ch_i === untilICode) {
            break;
          }
          this.throwError('Unexpected "' + this.char + '"');
        }
      }
    }
    return nodes;
  }
  /**
   * The main parsing function.
   * @returns {?jsep.Expression}
   */
  gobbleExpression() {
    const node = this.searchHook("gobble-expression") || this.gobbleBinaryExpression();
    this.gobbleSpaces();
    return this.runHook("after-expression", node);
  }
  /**
   * Search for the operation portion of the string (e.g. `+`, `===`)
   * Start by taking the longest possible binary operations (3 characters: `===`, `!==`, `>>>`)
   * and move down from 3 to 2 to 1 character until a matching binary operation is found
   * then, return that binary operation
   * @returns {string|boolean}
   */
  gobbleBinaryOp() {
    this.gobbleSpaces();
    let to_check = this.expr.substr(this.index, _Jsep.max_binop_len);
    let tc_len = to_check.length;
    while (tc_len > 0) {
      if (_Jsep.binary_ops.hasOwnProperty(to_check) && (!_Jsep.isIdentifierStart(this.code) || this.index + to_check.length < this.expr.length && !_Jsep.isIdentifierPart(this.expr.charCodeAt(this.index + to_check.length)))) {
        this.index += tc_len;
        return to_check;
      }
      to_check = to_check.substr(0, --tc_len);
    }
    return false;
  }
  /**
   * This function is responsible for gobbling an individual expression,
   * e.g. `1`, `1+2`, `a+(b*2)-Math.sqrt(2)`
   * @returns {?jsep.BinaryExpression}
   */
  gobbleBinaryExpression() {
    let node, biop, prec, stack, biop_info, left, right, i, cur_biop;
    left = this.gobbleToken();
    if (!left) {
      return left;
    }
    biop = this.gobbleBinaryOp();
    if (!biop) {
      return left;
    }
    biop_info = {
      value: biop,
      prec: _Jsep.binaryPrecedence(biop),
      right_a: _Jsep.right_associative.has(biop)
    };
    right = this.gobbleToken();
    if (!right) {
      this.throwError("Expected expression after " + biop);
    }
    stack = [left, biop_info, right];
    while (biop = this.gobbleBinaryOp()) {
      prec = _Jsep.binaryPrecedence(biop);
      if (prec === 0) {
        this.index -= biop.length;
        break;
      }
      biop_info = {
        value: biop,
        prec,
        right_a: _Jsep.right_associative.has(biop)
      };
      cur_biop = biop;
      const comparePrev = (prev) => biop_info.right_a && prev.right_a ? prec > prev.prec : prec <= prev.prec;
      while (stack.length > 2 && comparePrev(stack[stack.length - 2])) {
        right = stack.pop();
        biop = stack.pop().value;
        left = stack.pop();
        node = {
          type: _Jsep.BINARY_EXP,
          operator: biop,
          left,
          right
        };
        stack.push(node);
      }
      node = this.gobbleToken();
      if (!node) {
        this.throwError("Expected expression after " + cur_biop);
      }
      stack.push(biop_info, node);
    }
    i = stack.length - 1;
    node = stack[i];
    while (i > 1) {
      node = {
        type: _Jsep.BINARY_EXP,
        operator: stack[i - 1].value,
        left: stack[i - 2],
        right: node
      };
      i -= 2;
    }
    return node;
  }
  /**
   * An individual part of a binary expression:
   * e.g. `foo.bar(baz)`, `1`, `"abc"`, `(a % 2)` (because it's in parenthesis)
   * @returns {boolean|jsep.Expression}
   */
  gobbleToken() {
    let ch, to_check, tc_len, node;
    this.gobbleSpaces();
    node = this.searchHook("gobble-token");
    if (node) {
      return this.runHook("after-token", node);
    }
    ch = this.code;
    if (_Jsep.isDecimalDigit(ch) || ch === _Jsep.PERIOD_CODE) {
      return this.gobbleNumericLiteral();
    }
    if (ch === _Jsep.SQUOTE_CODE || ch === _Jsep.DQUOTE_CODE) {
      node = this.gobbleStringLiteral();
    } else if (ch === _Jsep.OBRACK_CODE) {
      node = this.gobbleArray();
    } else {
      to_check = this.expr.substr(this.index, _Jsep.max_unop_len);
      tc_len = to_check.length;
      while (tc_len > 0) {
        if (_Jsep.unary_ops.hasOwnProperty(to_check) && (!_Jsep.isIdentifierStart(this.code) || this.index + to_check.length < this.expr.length && !_Jsep.isIdentifierPart(this.expr.charCodeAt(this.index + to_check.length)))) {
          this.index += tc_len;
          const argument = this.gobbleToken();
          if (!argument) {
            this.throwError("missing unaryOp argument");
          }
          return this.runHook("after-token", {
            type: _Jsep.UNARY_EXP,
            operator: to_check,
            argument,
            prefix: true
          });
        }
        to_check = to_check.substr(0, --tc_len);
      }
      if (_Jsep.isIdentifierStart(ch)) {
        node = this.gobbleIdentifier();
        if (_Jsep.literals.hasOwnProperty(node.name)) {
          node = {
            type: _Jsep.LITERAL,
            value: _Jsep.literals[node.name],
            raw: node.name
          };
        } else if (node.name === _Jsep.this_str) {
          node = {
            type: _Jsep.THIS_EXP
          };
        }
      } else if (ch === _Jsep.OPAREN_CODE) {
        node = this.gobbleGroup();
      }
    }
    if (!node) {
      return this.runHook("after-token", false);
    }
    node = this.gobbleTokenProperty(node);
    return this.runHook("after-token", node);
  }
  /**
   * Gobble properties of of identifiers/strings/arrays/groups.
   * e.g. `foo`, `bar.baz`, `foo['bar'].baz`
   * It also gobbles function calls:
   * e.g. `Math.acos(obj.angle)`
   * @param {jsep.Expression} node
   * @returns {jsep.Expression}
   */
  gobbleTokenProperty(node) {
    this.gobbleSpaces();
    let ch = this.code;
    while (ch === _Jsep.PERIOD_CODE || ch === _Jsep.OBRACK_CODE || ch === _Jsep.OPAREN_CODE || ch === _Jsep.QUMARK_CODE) {
      let optional;
      if (ch === _Jsep.QUMARK_CODE) {
        if (this.expr.charCodeAt(this.index + 1) !== _Jsep.PERIOD_CODE) {
          break;
        }
        optional = true;
        this.index += 2;
        this.gobbleSpaces();
        ch = this.code;
      }
      this.index++;
      if (ch === _Jsep.OBRACK_CODE) {
        node = {
          type: _Jsep.MEMBER_EXP,
          computed: true,
          object: node,
          property: this.gobbleExpression()
        };
        if (!node.property) {
          this.throwError('Unexpected "' + this.char + '"');
        }
        this.gobbleSpaces();
        ch = this.code;
        if (ch !== _Jsep.CBRACK_CODE) {
          this.throwError("Unclosed [");
        }
        this.index++;
      } else if (ch === _Jsep.OPAREN_CODE) {
        node = {
          type: _Jsep.CALL_EXP,
          "arguments": this.gobbleArguments(_Jsep.CPAREN_CODE),
          callee: node
        };
      } else if (ch === _Jsep.PERIOD_CODE || optional) {
        if (optional) {
          this.index--;
        }
        this.gobbleSpaces();
        node = {
          type: _Jsep.MEMBER_EXP,
          computed: false,
          object: node,
          property: this.gobbleIdentifier()
        };
      }
      if (optional) {
        node.optional = true;
      }
      this.gobbleSpaces();
      ch = this.code;
    }
    return node;
  }
  /**
   * Parse simple numeric literals: `12`, `3.4`, `.5`. Do this by using a string to
   * keep track of everything in the numeric literal and then calling `parseFloat` on that string
   * @returns {jsep.Literal}
   */
  gobbleNumericLiteral() {
    let number = "", ch, chCode;
    while (_Jsep.isDecimalDigit(this.code)) {
      number += this.expr.charAt(this.index++);
    }
    if (this.code === _Jsep.PERIOD_CODE) {
      number += this.expr.charAt(this.index++);
      while (_Jsep.isDecimalDigit(this.code)) {
        number += this.expr.charAt(this.index++);
      }
    }
    ch = this.char;
    if (ch === "e" || ch === "E") {
      number += this.expr.charAt(this.index++);
      ch = this.char;
      if (ch === "+" || ch === "-") {
        number += this.expr.charAt(this.index++);
      }
      while (_Jsep.isDecimalDigit(this.code)) {
        number += this.expr.charAt(this.index++);
      }
      if (!_Jsep.isDecimalDigit(this.expr.charCodeAt(this.index - 1))) {
        this.throwError("Expected exponent (" + number + this.char + ")");
      }
    }
    chCode = this.code;
    if (_Jsep.isIdentifierStart(chCode)) {
      this.throwError("Variable names cannot start with a number (" + number + this.char + ")");
    } else if (chCode === _Jsep.PERIOD_CODE || number.length === 1 && number.charCodeAt(0) === _Jsep.PERIOD_CODE) {
      this.throwError("Unexpected period");
    }
    return {
      type: _Jsep.LITERAL,
      value: parseFloat(number),
      raw: number
    };
  }
  /**
   * Parses a string literal, staring with single or double quotes with basic support for escape codes
   * e.g. `"hello world"`, `'this is\nJSEP'`
   * @returns {jsep.Literal}
   */
  gobbleStringLiteral() {
    let str = "";
    const startIndex = this.index;
    const quote = this.expr.charAt(this.index++);
    let closed = false;
    while (this.index < this.expr.length) {
      let ch = this.expr.charAt(this.index++);
      if (ch === quote) {
        closed = true;
        break;
      } else if (ch === "\\") {
        ch = this.expr.charAt(this.index++);
        switch (ch) {
          case "n":
            str += "\n";
            break;
          case "r":
            str += "\r";
            break;
          case "t":
            str += "	";
            break;
          case "b":
            str += "\b";
            break;
          case "f":
            str += "\f";
            break;
          case "v":
            str += "\v";
            break;
          default:
            str += ch;
        }
      } else {
        str += ch;
      }
    }
    if (!closed) {
      this.throwError('Unclosed quote after "' + str + '"');
    }
    return {
      type: _Jsep.LITERAL,
      value: str,
      raw: this.expr.substring(startIndex, this.index)
    };
  }
  /**
   * Gobbles only identifiers
   * e.g.: `foo`, `_value`, `$x1`
   * Also, this function checks if that identifier is a literal:
   * (e.g. `true`, `false`, `null`) or `this`
   * @returns {jsep.Identifier}
   */
  gobbleIdentifier() {
    let ch = this.code, start = this.index;
    if (_Jsep.isIdentifierStart(ch)) {
      this.index++;
    } else {
      this.throwError("Unexpected " + this.char);
    }
    while (this.index < this.expr.length) {
      ch = this.code;
      if (_Jsep.isIdentifierPart(ch)) {
        this.index++;
      } else {
        break;
      }
    }
    return {
      type: _Jsep.IDENTIFIER,
      name: this.expr.slice(start, this.index)
    };
  }
  /**
   * Gobbles a list of arguments within the context of a function call
   * or array literal. This function also assumes that the opening character
   * `(` or `[` has already been gobbled, and gobbles expressions and commas
   * until the terminator character `)` or `]` is encountered.
   * e.g. `foo(bar, baz)`, `my_func()`, or `[bar, baz]`
   * @param {number} termination
   * @returns {jsep.Expression[]}
   */
  gobbleArguments(termination) {
    const args = [];
    let closed = false;
    let separator_count = 0;
    while (this.index < this.expr.length) {
      this.gobbleSpaces();
      let ch_i = this.code;
      if (ch_i === termination) {
        closed = true;
        this.index++;
        if (termination === _Jsep.CPAREN_CODE && separator_count && separator_count >= args.length) {
          this.throwError("Unexpected token " + String.fromCharCode(termination));
        }
        break;
      } else if (ch_i === _Jsep.COMMA_CODE) {
        this.index++;
        separator_count++;
        if (separator_count !== args.length) {
          if (termination === _Jsep.CPAREN_CODE) {
            this.throwError("Unexpected token ,");
          } else if (termination === _Jsep.CBRACK_CODE) {
            for (let arg = args.length; arg < separator_count; arg++) {
              args.push(null);
            }
          }
        }
      } else if (args.length !== separator_count && separator_count !== 0) {
        this.throwError("Expected comma");
      } else {
        const node = this.gobbleExpression();
        if (!node || node.type === _Jsep.COMPOUND) {
          this.throwError("Expected comma");
        }
        args.push(node);
      }
    }
    if (!closed) {
      this.throwError("Expected " + String.fromCharCode(termination));
    }
    return args;
  }
  /**
   * Responsible for parsing a group of things within parentheses `()`
   * that have no identifier in front (so not a function call)
   * This function assumes that it needs to gobble the opening parenthesis
   * and then tries to gobble everything within that parenthesis, assuming
   * that the next thing it should see is the close parenthesis. If not,
   * then the expression probably doesn't have a `)`
   * @returns {boolean|jsep.Expression}
   */
  gobbleGroup() {
    this.index++;
    let nodes = this.gobbleExpressions(_Jsep.CPAREN_CODE);
    if (this.code === _Jsep.CPAREN_CODE) {
      this.index++;
      if (nodes.length === 1) {
        return nodes[0];
      } else if (!nodes.length) {
        return false;
      } else {
        return {
          type: _Jsep.SEQUENCE_EXP,
          expressions: nodes
        };
      }
    } else {
      this.throwError("Unclosed (");
    }
  }
  /**
   * Responsible for parsing Array literals `[1, 2, 3]`
   * This function assumes that it needs to gobble the opening bracket
   * and then tries to gobble the expressions as arguments.
   * @returns {jsep.ArrayExpression}
   */
  gobbleArray() {
    this.index++;
    return {
      type: _Jsep.ARRAY_EXP,
      elements: this.gobbleArguments(_Jsep.CBRACK_CODE)
    };
  }
};
var hooks = new Hooks();
Object.assign(Jsep, {
  hooks,
  plugins: new Plugins(Jsep),
  // Node Types
  // ----------
  // This is the full set of types that any JSEP node can be.
  // Store them here to save space when minified
  COMPOUND: "Compound",
  SEQUENCE_EXP: "SequenceExpression",
  IDENTIFIER: "Identifier",
  MEMBER_EXP: "MemberExpression",
  LITERAL: "Literal",
  THIS_EXP: "ThisExpression",
  CALL_EXP: "CallExpression",
  UNARY_EXP: "UnaryExpression",
  BINARY_EXP: "BinaryExpression",
  ARRAY_EXP: "ArrayExpression",
  TAB_CODE: 9,
  LF_CODE: 10,
  CR_CODE: 13,
  SPACE_CODE: 32,
  PERIOD_CODE: 46,
  // '.'
  COMMA_CODE: 44,
  // ','
  SQUOTE_CODE: 39,
  // single quote
  DQUOTE_CODE: 34,
  // double quotes
  OPAREN_CODE: 40,
  // (
  CPAREN_CODE: 41,
  // )
  OBRACK_CODE: 91,
  // [
  CBRACK_CODE: 93,
  // ]
  QUMARK_CODE: 63,
  // ?
  SEMCOL_CODE: 59,
  // ;
  COLON_CODE: 58,
  // :
  // Operations
  // ----------
  // Use a quickly-accessible map to store all of the unary operators
  // Values are set to `1` (it really doesn't matter)
  unary_ops: {
    "-": 1,
    "!": 1,
    "~": 1,
    "+": 1
  },
  // Also use a map for the binary operations but set their values to their
  // binary precedence for quick reference (higher number = higher precedence)
  // see [Order of operations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence)
  binary_ops: {
    "||": 1,
    "??": 1,
    "&&": 2,
    "|": 3,
    "^": 4,
    "&": 5,
    "==": 6,
    "!=": 6,
    "===": 6,
    "!==": 6,
    "<": 7,
    ">": 7,
    "<=": 7,
    ">=": 7,
    "<<": 8,
    ">>": 8,
    ">>>": 8,
    "+": 9,
    "-": 9,
    "*": 10,
    "/": 10,
    "%": 10,
    "**": 11
  },
  // sets specific binary_ops as right-associative
  right_associative: /* @__PURE__ */ new Set(["**"]),
  // Additional valid identifier chars, apart from a-z, A-Z and 0-9 (except on the starting char)
  additional_identifier_chars: /* @__PURE__ */ new Set(["$", "_"]),
  // Literals
  // ----------
  // Store the values to return for the various literals we may encounter
  literals: {
    "true": true,
    "false": false,
    "null": null
  },
  // Except for `this`, which is special. This could be changed to something like `'self'` as well
  this_str: "this"
});
Jsep.max_unop_len = Jsep.getMaxKeyLen(Jsep.unary_ops);
Jsep.max_binop_len = Jsep.getMaxKeyLen(Jsep.binary_ops);
var jsep = (expr) => new Jsep(expr).parse();
var stdClassProps = Object.getOwnPropertyNames(class Test {
});
Object.getOwnPropertyNames(Jsep).filter((prop) => !stdClassProps.includes(prop) && jsep[prop] === void 0).forEach((m) => {
  jsep[m] = Jsep[m];
});
jsep.Jsep = Jsep;
var CONDITIONAL_EXP = "ConditionalExpression";
var ternary = {
  name: "ternary",
  init(jsep2) {
    jsep2.hooks.add("after-expression", function gobbleTernary(env) {
      if (env.node && this.code === jsep2.QUMARK_CODE) {
        this.index++;
        const test = env.node;
        const consequent = this.gobbleExpression();
        if (!consequent) {
          this.throwError("Expected expression");
        }
        this.gobbleSpaces();
        if (this.code === jsep2.COLON_CODE) {
          this.index++;
          const alternate = this.gobbleExpression();
          if (!alternate) {
            this.throwError("Expected expression");
          }
          env.node = {
            type: CONDITIONAL_EXP,
            test,
            consequent,
            alternate
          };
          if (test.operator && jsep2.binary_ops[test.operator] <= 0.9) {
            let newTest = test;
            while (newTest.right.operator && jsep2.binary_ops[newTest.right.operator] <= 0.9) {
              newTest = newTest.right;
            }
            env.node.test = newTest.right;
            newTest.right = env.node;
            env.node = test;
          }
        } else {
          this.throwError("Expected :");
        }
      }
    });
  }
};
jsep.plugins.register(ternary);
var FSLASH_CODE = 47;
var BSLASH_CODE = 92;
var index = {
  name: "regex",
  init(jsep2) {
    jsep2.hooks.add("gobble-token", function gobbleRegexLiteral(env) {
      if (this.code === FSLASH_CODE) {
        const patternIndex = ++this.index;
        let inCharSet = false;
        while (this.index < this.expr.length) {
          if (this.code === FSLASH_CODE && !inCharSet) {
            const pattern = this.expr.slice(patternIndex, this.index);
            let flags = "";
            while (++this.index < this.expr.length) {
              const code = this.code;
              if (code >= 97 && code <= 122 || code >= 65 && code <= 90 || code >= 48 && code <= 57) {
                flags += this.char;
              } else {
                break;
              }
            }
            let value;
            try {
              value = new RegExp(pattern, flags);
            } catch (e) {
              this.throwError(e.message);
            }
            env.node = {
              type: jsep2.LITERAL,
              value,
              raw: this.expr.slice(patternIndex - 1, this.index)
            };
            env.node = this.gobbleTokenProperty(env.node);
            return env.node;
          }
          if (this.code === jsep2.OBRACK_CODE) {
            inCharSet = true;
          } else if (inCharSet && this.code === jsep2.CBRACK_CODE) {
            inCharSet = false;
          }
          this.index += this.code === BSLASH_CODE ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
};
var PLUS_CODE = 43;
var MINUS_CODE = 45;
var plugin = {
  name: "assignment",
  assignmentOperators: /* @__PURE__ */ new Set(["=", "*=", "**=", "/=", "%=", "+=", "-=", "<<=", ">>=", ">>>=", "&=", "^=", "|=", "||=", "&&=", "??="]),
  updateOperators: [PLUS_CODE, MINUS_CODE],
  assignmentPrecedence: 0.9,
  init(jsep2) {
    const updateNodeTypes = [jsep2.IDENTIFIER, jsep2.MEMBER_EXP];
    plugin.assignmentOperators.forEach((op) => jsep2.addBinaryOp(op, plugin.assignmentPrecedence, true));
    jsep2.hooks.add("gobble-token", function gobbleUpdatePrefix(env) {
      const code = this.code;
      if (plugin.updateOperators.some((c) => c === code && c === this.expr.charCodeAt(this.index + 1))) {
        this.index += 2;
        env.node = {
          type: "UpdateExpression",
          operator: code === PLUS_CODE ? "++" : "--",
          argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
          prefix: true
        };
        if (!env.node.argument || !updateNodeTypes.includes(env.node.argument.type)) {
          this.throwError(`Unexpected ${env.node.operator}`);
        }
      }
    });
    jsep2.hooks.add("after-token", function gobbleUpdatePostfix(env) {
      if (env.node) {
        const code = this.code;
        if (plugin.updateOperators.some((c) => c === code && c === this.expr.charCodeAt(this.index + 1))) {
          if (!updateNodeTypes.includes(env.node.type)) {
            this.throwError(`Unexpected ${env.node.operator}`);
          }
          this.index += 2;
          env.node = {
            type: "UpdateExpression",
            operator: code === PLUS_CODE ? "++" : "--",
            argument: env.node,
            prefix: false
          };
        }
      }
    });
    jsep2.hooks.add("after-expression", function gobbleAssignment(env) {
      if (env.node) {
        updateBinariesToAssignments(env.node);
      }
    });
    function updateBinariesToAssignments(node) {
      if (plugin.assignmentOperators.has(node.operator)) {
        node.type = "AssignmentExpression";
        updateBinariesToAssignments(node.left);
        updateBinariesToAssignments(node.right);
      } else if (!node.operator) {
        Object.values(node).forEach((val) => {
          if (val && typeof val === "object") {
            updateBinariesToAssignments(val);
          }
        });
      }
    }
  }
};
jsep.plugins.register(index, plugin);
jsep.addUnaryOp("typeof");
jsep.addUnaryOp("void");
jsep.addLiteral("null", null);
jsep.addLiteral("undefined", void 0);
var BLOCKED_PROTO_PROPERTIES = /* @__PURE__ */ new Set(["constructor", "__proto__", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__"]);
var SafeEval = {
  /**
   * @param {jsep.Expression} ast
   * @param {Record<string, any>} subs
   */
  evalAst(ast, subs) {
    switch (ast.type) {
      case "BinaryExpression":
      case "LogicalExpression":
        return SafeEval.evalBinaryExpression(ast, subs);
      case "Compound":
        return SafeEval.evalCompound(ast, subs);
      case "ConditionalExpression":
        return SafeEval.evalConditionalExpression(ast, subs);
      case "Identifier":
        return SafeEval.evalIdentifier(ast, subs);
      case "Literal":
        return SafeEval.evalLiteral(ast, subs);
      case "MemberExpression":
        return SafeEval.evalMemberExpression(ast, subs);
      case "UnaryExpression":
        return SafeEval.evalUnaryExpression(ast, subs);
      case "ArrayExpression":
        return SafeEval.evalArrayExpression(ast, subs);
      case "CallExpression":
        return SafeEval.evalCallExpression(ast, subs);
      case "AssignmentExpression":
        return SafeEval.evalAssignmentExpression(ast, subs);
      default:
        throw SyntaxError("Unexpected expression", ast);
    }
  },
  evalBinaryExpression(ast, subs) {
    const result = {
      "||": (a, b) => a || b(),
      "&&": (a, b) => a && b(),
      "|": (a, b) => a | b(),
      "^": (a, b) => a ^ b(),
      "&": (a, b) => a & b(),
      // eslint-disable-next-line eqeqeq -- API
      "==": (a, b) => a == b(),
      // eslint-disable-next-line eqeqeq -- API
      "!=": (a, b) => a != b(),
      "===": (a, b) => a === b(),
      "!==": (a, b) => a !== b(),
      "<": (a, b) => a < b(),
      ">": (a, b) => a > b(),
      "<=": (a, b) => a <= b(),
      ">=": (a, b) => a >= b(),
      "<<": (a, b) => a << b(),
      ">>": (a, b) => a >> b(),
      ">>>": (a, b) => a >>> b(),
      "+": (a, b) => a + b(),
      "-": (a, b) => a - b(),
      "*": (a, b) => a * b(),
      "/": (a, b) => a / b(),
      "%": (a, b) => a % b()
    }[ast.operator](SafeEval.evalAst(ast.left, subs), () => SafeEval.evalAst(ast.right, subs));
    return result;
  },
  evalCompound(ast, subs) {
    let last;
    for (let i = 0; i < ast.body.length; i++) {
      if (ast.body[i].type === "Identifier" && ["var", "let", "const"].includes(ast.body[i].name) && ast.body[i + 1] && ast.body[i + 1].type === "AssignmentExpression") {
        i += 1;
      }
      const expr = ast.body[i];
      last = SafeEval.evalAst(expr, subs);
    }
    return last;
  },
  evalConditionalExpression(ast, subs) {
    if (SafeEval.evalAst(ast.test, subs)) {
      return SafeEval.evalAst(ast.consequent, subs);
    }
    return SafeEval.evalAst(ast.alternate, subs);
  },
  evalIdentifier(ast, subs) {
    if (Object.hasOwn(subs, ast.name)) {
      return subs[ast.name];
    }
    throw ReferenceError(`${ast.name} is not defined`);
  },
  evalLiteral(ast) {
    return ast.value;
  },
  evalMemberExpression(ast, subs) {
    const prop = String(
      // NOTE: `String(value)` throws error when
      // value has overwritten the toString method to return non-string
      // i.e. `value = {toString: () => []}`
      ast.computed ? SafeEval.evalAst(ast.property) : ast.property.name
      // `object.property` property is Identifier
    );
    const obj = SafeEval.evalAst(ast.object, subs);
    if (obj === void 0 || obj === null) {
      throw TypeError(`Cannot read properties of ${obj} (reading '${prop}')`);
    }
    if (!Object.hasOwn(obj, prop) && BLOCKED_PROTO_PROPERTIES.has(prop)) {
      throw TypeError(`Cannot read properties of ${obj} (reading '${prop}')`);
    }
    const result = obj[prop];
    if (typeof result === "function") {
      return result.bind(obj);
    }
    return result;
  },
  evalUnaryExpression(ast, subs) {
    const result = {
      "-": (a) => -SafeEval.evalAst(a, subs),
      "!": (a) => !SafeEval.evalAst(a, subs),
      "~": (a) => ~SafeEval.evalAst(a, subs),
      // eslint-disable-next-line no-implicit-coercion -- API
      "+": (a) => +SafeEval.evalAst(a, subs),
      typeof: (a) => typeof SafeEval.evalAst(a, subs),
      // eslint-disable-next-line no-void, sonarjs/void-use -- feature
      void: (a) => void SafeEval.evalAst(a, subs)
    }[ast.operator](ast.argument);
    return result;
  },
  evalArrayExpression(ast, subs) {
    return ast.elements.map((el) => SafeEval.evalAst(el, subs));
  },
  evalCallExpression(ast, subs) {
    const args = ast.arguments.map((arg) => SafeEval.evalAst(arg, subs));
    const func = SafeEval.evalAst(ast.callee, subs);
    if (func === Function) {
      throw new Error("Function constructor is disabled");
    }
    return func(...args);
  },
  evalAssignmentExpression(ast, subs) {
    if (ast.left.type !== "Identifier") {
      throw SyntaxError("Invalid left-hand side in assignment");
    }
    const id = ast.left.name;
    const value = SafeEval.evalAst(ast.right, subs);
    subs[id] = value;
    return subs[id];
  }
};
var SafeScript = class {
  /**
   * @param {string} expr Expression to evaluate
   */
  constructor(expr) {
    this.code = expr;
    this.ast = jsep(this.code);
  }
  /**
   * @param {object} context Object whose items will be added
   *   to evaluation
   * @returns {EvaluatedResult} Result of evaluated code
   */
  runInNewContext(context) {
    const keyMap = Object.assign(/* @__PURE__ */ Object.create(null), context);
    return SafeEval.evalAst(this.ast, keyMap);
  }
};
function push(arr, item) {
  arr = arr.slice();
  arr.push(item);
  return arr;
}
function unshift(item, arr) {
  arr = arr.slice();
  arr.unshift(item);
  return arr;
}
var NewError = class extends Error {
  /**
   * @param {AnyResult} value The evaluated scalar value
   */
  constructor(value) {
    super('JSONPath should not be called with "new" (it prevents return of (unwrapped) scalar values)');
    this.avoidNew = true;
    this.value = value;
    this.name = "NewError";
  }
};
function JSONPath(opts, expr, obj, callback, otherTypeCallback) {
  if (!(this instanceof JSONPath)) {
    try {
      return new JSONPath(opts, expr, obj, callback, otherTypeCallback);
    } catch (e) {
      if (!e.avoidNew) {
        throw e;
      }
      return e.value;
    }
  }
  if (typeof opts === "string") {
    otherTypeCallback = callback;
    callback = obj;
    obj = expr;
    expr = opts;
    opts = null;
  }
  const optObj = opts && typeof opts === "object";
  opts = opts || {};
  this.json = opts.json || obj;
  this.path = opts.path || expr;
  this.resultType = opts.resultType || "value";
  this.flatten = opts.flatten || false;
  this.wrap = Object.hasOwn(opts, "wrap") ? opts.wrap : true;
  this.sandbox = opts.sandbox || {};
  this.eval = opts.eval === void 0 ? "safe" : opts.eval;
  this.ignoreEvalErrors = typeof opts.ignoreEvalErrors === "undefined" ? false : opts.ignoreEvalErrors;
  this.parent = opts.parent || null;
  this.parentProperty = opts.parentProperty || null;
  this.callback = opts.callback || callback || null;
  this.otherTypeCallback = opts.otherTypeCallback || otherTypeCallback || function() {
    throw new TypeError("You must supply an otherTypeCallback callback option with the @other() operator.");
  };
  if (opts.autostart !== false) {
    const args = {
      path: optObj ? opts.path : expr
    };
    if (!optObj) {
      args.json = obj;
    } else if ("json" in opts) {
      args.json = opts.json;
    }
    const ret = this.evaluate(args);
    if (!ret || typeof ret !== "object") {
      throw new NewError(ret);
    }
    return ret;
  }
}
JSONPath.prototype.evaluate = function(expr, json, callback, otherTypeCallback) {
  let currParent = this.parent, currParentProperty = this.parentProperty;
  let {
    flatten,
    wrap
  } = this;
  this.currResultType = this.resultType;
  this.currEval = this.eval;
  this.currSandbox = this.sandbox;
  callback = callback || this.callback;
  this.currOtherTypeCallback = otherTypeCallback || this.otherTypeCallback;
  json = json || this.json;
  expr = expr || this.path;
  if (expr && typeof expr === "object" && !Array.isArray(expr)) {
    if (!expr.path && expr.path !== "") {
      throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
    }
    if (!Object.hasOwn(expr, "json")) {
      throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
    }
    ({
      json
    } = expr);
    flatten = Object.hasOwn(expr, "flatten") ? expr.flatten : flatten;
    this.currResultType = Object.hasOwn(expr, "resultType") ? expr.resultType : this.currResultType;
    this.currSandbox = Object.hasOwn(expr, "sandbox") ? expr.sandbox : this.currSandbox;
    wrap = Object.hasOwn(expr, "wrap") ? expr.wrap : wrap;
    this.currEval = Object.hasOwn(expr, "eval") ? expr.eval : this.currEval;
    callback = Object.hasOwn(expr, "callback") ? expr.callback : callback;
    this.currOtherTypeCallback = Object.hasOwn(expr, "otherTypeCallback") ? expr.otherTypeCallback : this.currOtherTypeCallback;
    currParent = Object.hasOwn(expr, "parent") ? expr.parent : currParent;
    currParentProperty = Object.hasOwn(expr, "parentProperty") ? expr.parentProperty : currParentProperty;
    expr = expr.path;
  }
  currParent = currParent || null;
  currParentProperty = currParentProperty || null;
  if (Array.isArray(expr)) {
    expr = JSONPath.toPathString(expr);
  }
  if (!expr && expr !== "" || !json) {
    return void 0;
  }
  const exprList = JSONPath.toPathArray(expr);
  if (exprList[0] === "$" && exprList.length > 1) {
    exprList.shift();
  }
  this._hasParentSelector = null;
  const result = this._trace(exprList, json, ["$"], currParent, currParentProperty, callback).filter(function(ea) {
    return ea && !ea.isParentSelector;
  });
  if (!result.length) {
    return wrap ? [] : void 0;
  }
  if (!wrap && result.length === 1 && !result[0].hasArrExpr) {
    return this._getPreferredOutput(result[0]);
  }
  return result.reduce((rslt, ea) => {
    const valOrPath = this._getPreferredOutput(ea);
    if (flatten && Array.isArray(valOrPath)) {
      rslt = rslt.concat(valOrPath);
    } else {
      rslt.push(valOrPath);
    }
    return rslt;
  }, []);
};
JSONPath.prototype._getPreferredOutput = function(ea) {
  const resultType = this.currResultType;
  switch (resultType) {
    case "all": {
      const path2 = Array.isArray(ea.path) ? ea.path : JSONPath.toPathArray(ea.path);
      ea.pointer = JSONPath.toPointer(path2);
      ea.path = typeof ea.path === "string" ? ea.path : JSONPath.toPathString(ea.path);
      return ea;
    }
    case "value":
    case "parent":
    case "parentProperty":
      return ea[resultType];
    case "path":
      return JSONPath.toPathString(ea[resultType]);
    case "pointer":
      return JSONPath.toPointer(ea.path);
    default:
      throw new TypeError("Unknown result type");
  }
};
JSONPath.prototype._handleCallback = function(fullRetObj, callback, type) {
  if (callback) {
    const preferredOutput = this._getPreferredOutput(fullRetObj);
    fullRetObj.path = typeof fullRetObj.path === "string" ? fullRetObj.path : JSONPath.toPathString(fullRetObj.path);
    callback(preferredOutput, type, fullRetObj);
  }
};
JSONPath.prototype._trace = function(expr, val, path2, parent, parentPropName, callback, hasArrExpr, literalPriority) {
  let retObj;
  if (!expr.length) {
    retObj = {
      path: path2,
      value: val,
      parent,
      parentProperty: parentPropName,
      hasArrExpr
    };
    this._handleCallback(retObj, callback, "value");
    return retObj;
  }
  const loc = expr[0], x = expr.slice(1);
  const ret = [];
  function addRet(elems) {
    if (Array.isArray(elems)) {
      elems.forEach((t) => {
        ret.push(t);
      });
    } else {
      ret.push(elems);
    }
  }
  if ((typeof loc !== "string" || literalPriority) && val && Object.hasOwn(val, loc)) {
    addRet(this._trace(x, val[loc], push(path2, loc), val, loc, callback, hasArrExpr));
  } else if (loc === "*") {
    this._walk(val, (m) => {
      addRet(this._trace(x, val[m], push(path2, m), val, m, callback, true, true));
    });
  } else if (loc === "..") {
    addRet(this._trace(x, val, path2, parent, parentPropName, callback, hasArrExpr));
    this._walk(val, (m) => {
      if (typeof val[m] === "object") {
        addRet(this._trace(expr.slice(), val[m], push(path2, m), val, m, callback, true));
      }
    });
  } else if (loc === "^") {
    this._hasParentSelector = true;
    return {
      path: path2.slice(0, -1),
      expr: x,
      isParentSelector: true
    };
  } else if (loc === "~") {
    retObj = {
      path: push(path2, loc),
      value: parentPropName,
      parent,
      parentProperty: null
    };
    this._handleCallback(retObj, callback, "property");
    return retObj;
  } else if (loc === "$") {
    addRet(this._trace(x, val, path2, null, null, callback, hasArrExpr));
  } else if (/^(-?\d*):(-?\d*):?(\d*)$/u.test(loc)) {
    addRet(this._slice(loc, x, val, path2, parent, parentPropName, callback));
  } else if (loc.indexOf("?(") === 0) {
    if (this.currEval === false) {
      throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
    }
    const safeLoc = loc.replace(/^\?\((.*?)\)$/u, "$1");
    const nested = /@.?([^?]*)[['](\??\(.*?\))(?!.\)\])[\]']/gu.exec(safeLoc);
    if (nested) {
      this._walk(val, (m) => {
        const npath = [nested[2]];
        const nvalue = nested[1] ? val[m][nested[1]] : val[m];
        const filterResults = this._trace(npath, nvalue, path2, parent, parentPropName, callback, true);
        if (filterResults.length > 0) {
          addRet(this._trace(x, val[m], push(path2, m), val, m, callback, true));
        }
      });
    } else {
      this._walk(val, (m) => {
        if (this._eval(safeLoc, val[m], m, path2, parent, parentPropName)) {
          addRet(this._trace(x, val[m], push(path2, m), val, m, callback, true));
        }
      });
    }
  } else if (loc[0] === "(") {
    if (this.currEval === false) {
      throw new Error("Eval [(expr)] prevented in JSONPath expression.");
    }
    addRet(this._trace(unshift(this._eval(loc, val, path2.at(-1), path2.slice(0, -1), parent, parentPropName), x), val, path2, parent, parentPropName, callback, hasArrExpr));
  } else if (loc[0] === "@") {
    let addType = false;
    const valueType = loc.slice(1, -2);
    switch (valueType) {
      case "scalar":
        if (!val || !["object", "function"].includes(typeof val)) {
          addType = true;
        }
        break;
      case "boolean":
      case "string":
      case "undefined":
      case "function":
        if (typeof val === valueType) {
          addType = true;
        }
        break;
      case "integer":
        if (Number.isFinite(val) && !(val % 1)) {
          addType = true;
        }
        break;
      case "number":
        if (Number.isFinite(val)) {
          addType = true;
        }
        break;
      case "nonFinite":
        if (typeof val === "number" && !Number.isFinite(val)) {
          addType = true;
        }
        break;
      case "object":
        if (val && typeof val === valueType) {
          addType = true;
        }
        break;
      case "array":
        if (Array.isArray(val)) {
          addType = true;
        }
        break;
      case "other":
        addType = this.currOtherTypeCallback(val, path2, parent, parentPropName);
        break;
      case "null":
        if (val === null) {
          addType = true;
        }
        break;
      /* c8 ignore next 2 */
      default:
        throw new TypeError("Unknown value type " + valueType);
    }
    if (addType) {
      retObj = {
        path: path2,
        value: val,
        parent,
        parentProperty: parentPropName
      };
      this._handleCallback(retObj, callback, "value");
      return retObj;
    }
  } else if (loc[0] === "`" && val && Object.hasOwn(val, loc.slice(1))) {
    const locProp = loc.slice(1);
    addRet(this._trace(x, val[locProp], push(path2, locProp), val, locProp, callback, hasArrExpr, true));
  } else if (loc.includes(",")) {
    const parts = loc.split(",");
    for (const part of parts) {
      addRet(this._trace(unshift(part, x), val, path2, parent, parentPropName, callback, true));
    }
  } else if (!literalPriority && val && Object.hasOwn(val, loc)) {
    addRet(this._trace(x, val[loc], push(path2, loc), val, loc, callback, hasArrExpr, true));
  }
  if (this._hasParentSelector) {
    for (let t = 0; t < ret.length; t++) {
      const rett = ret[t];
      if (rett && rett.isParentSelector) {
        const tmp = this._trace(rett.expr, val, rett.path, parent, parentPropName, callback, hasArrExpr);
        if (Array.isArray(tmp)) {
          ret[t] = tmp[0];
          const tl = tmp.length;
          for (let tt = 1; tt < tl; tt++) {
            t++;
            ret.splice(t, 0, tmp[tt]);
          }
        } else {
          ret[t] = tmp;
        }
      }
    }
  }
  return ret;
};
JSONPath.prototype._walk = function(val, f) {
  if (Array.isArray(val)) {
    const n = val.length;
    for (let i = 0; i < n; i++) {
      f(i);
    }
  } else if (val && typeof val === "object") {
    Object.keys(val).forEach((m) => {
      f(m);
    });
  }
};
JSONPath.prototype._slice = function(loc, expr, val, path2, parent, parentPropName, callback) {
  if (!Array.isArray(val)) {
    return void 0;
  }
  const len = val.length, parts = loc.split(":"), step = parts[2] && Number.parseInt(parts[2]) || 1;
  let start = parts[0] && Number.parseInt(parts[0]) || 0, end = parts[1] && Number.parseInt(parts[1]) || len;
  start = start < 0 ? Math.max(0, start + len) : Math.min(len, start);
  end = end < 0 ? Math.max(0, end + len) : Math.min(len, end);
  const ret = [];
  for (let i = start; i < end; i += step) {
    const tmp = this._trace(unshift(i, expr), val, path2, parent, parentPropName, callback, true);
    tmp.forEach((t) => {
      ret.push(t);
    });
  }
  return ret;
};
JSONPath.prototype._eval = function(code, _v, _vname, path2, parent, parentPropName) {
  this.currSandbox._$_parentProperty = parentPropName;
  this.currSandbox._$_parent = parent;
  this.currSandbox._$_property = _vname;
  this.currSandbox._$_root = this.json;
  this.currSandbox._$_v = _v;
  const containsPath = code.includes("@path");
  if (containsPath) {
    this.currSandbox._$_path = JSONPath.toPathString(path2.concat([_vname]));
  }
  const scriptCacheKey = this.currEval + "Script:" + code;
  if (!JSONPath.cache[scriptCacheKey]) {
    let script = code.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(/@([.\s)[])/gu, "_$_v$1");
    if (containsPath) {
      script = script.replaceAll("@path", "_$_path");
    }
    if (this.currEval === "safe" || this.currEval === true || this.currEval === void 0) {
      JSONPath.cache[scriptCacheKey] = new this.safeVm.Script(script);
    } else if (this.currEval === "native") {
      JSONPath.cache[scriptCacheKey] = new this.vm.Script(script);
    } else if (typeof this.currEval === "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
      const CurrEval = this.currEval;
      JSONPath.cache[scriptCacheKey] = new CurrEval(script);
    } else if (typeof this.currEval === "function") {
      JSONPath.cache[scriptCacheKey] = {
        runInNewContext: (context) => this.currEval(script, context)
      };
    } else {
      throw new TypeError(`Unknown "eval" property "${this.currEval}"`);
    }
  }
  try {
    return JSONPath.cache[scriptCacheKey].runInNewContext(this.currSandbox);
  } catch (e) {
    if (this.ignoreEvalErrors) {
      return false;
    }
    throw new Error("jsonPath: " + e.message + ": " + code);
  }
};
JSONPath.cache = {};
JSONPath.toPathString = function(pathArr) {
  const x = pathArr, n = x.length;
  let p = "$";
  for (let i = 1; i < n; i++) {
    if (!/^(~|\^|@.*?\(\))$/u.test(x[i])) {
      p += /^[0-9*]+$/u.test(x[i]) ? "[" + x[i] + "]" : "['" + x[i] + "']";
    }
  }
  return p;
};
JSONPath.toPointer = function(pointer) {
  const x = pointer, n = x.length;
  let p = "";
  for (let i = 1; i < n; i++) {
    if (!/^(~|\^|@.*?\(\))$/u.test(x[i])) {
      p += "/" + x[i].toString().replaceAll("~", "~0").replaceAll("/", "~1");
    }
  }
  return p;
};
JSONPath.toPathArray = function(expr) {
  const {
    cache
  } = JSONPath;
  if (cache[expr]) {
    return cache[expr].concat();
  }
  const subx = [];
  const normalized = expr.replaceAll(/@(?:null|boolean|number|string|integer|undefined|nonFinite|scalar|array|object|function|other)\(\)/gu, ";$&;").replaceAll(/[['](\??\(.*?\))[\]'](?!.\])/gu, function($0, $1) {
    return "[#" + (subx.push($1) - 1) + "]";
  }).replaceAll(/\[['"]([^'\]]*)['"]\]/gu, function($0, prop) {
    return "['" + prop.replaceAll(".", "%@%").replaceAll("~", "%%@@%%") + "']";
  }).replaceAll("~", ";~;").replaceAll(/['"]?\.['"]?(?![^[]*\])|\[['"]?/gu, ";").replaceAll("%@%", ".").replaceAll("%%@@%%", "~").replaceAll(/(?:;)?(\^+)(?:;)?/gu, function($0, ups) {
    return ";" + ups.split("").join(";") + ";";
  }).replaceAll(/;;;|;;/gu, ";..;").replaceAll(/;$|'?\]|'$/gu, "");
  const exprList = normalized.split(";").map(function(exp) {
    const match2 = exp.match(/#(\d+)/u);
    return !match2 || !match2[1] ? exp : subx[match2[1]];
  });
  cache[expr] = exprList;
  return cache[expr].concat();
};
JSONPath.prototype.safeVm = {
  Script: SafeScript
};
JSONPath.prototype.vm = vm;

// ../../../../../../../../../../../workspace/node_modules/brace-expansion/node_modules/balanced-match/dist/esm/index.js
var balanced = (a, b, str) => {
  const ma = a instanceof RegExp ? maybeMatch(a, str) : a;
  const mb = b instanceof RegExp ? maybeMatch(b, str) : b;
  const r = ma !== null && mb != null && range(ma, mb, str);
  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + ma.length, r[1]),
    post: str.slice(r[1] + mb.length)
  };
};
var maybeMatch = (reg, str) => {
  const m = str.match(reg);
  return m ? m[0] : null;
};
var range = (a, b, str) => {
  let begs, beg, left, right = void 0, result;
  let ai = str.indexOf(a);
  let bi = str.indexOf(b, ai + 1);
  let i = ai;
  if (ai >= 0 && bi > 0) {
    if (a === b) {
      return [ai, bi];
    }
    begs = [];
    left = str.length;
    while (i >= 0 && !result) {
      if (i === ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length === 1) {
        const r = begs.pop();
        if (r !== void 0)
          result = [r, bi];
      } else {
        beg = begs.pop();
        if (beg !== void 0 && beg < left) {
          left = beg;
          right = bi;
        }
        bi = str.indexOf(b, i + 1);
      }
      i = ai < bi && ai >= 0 ? ai : bi;
    }
    if (begs.length && right !== void 0) {
      result = [left, right];
    }
  }
  return result;
};

// ../../../../../../../../../../../workspace/node_modules/brace-expansion/dist/esm/index.js
var escSlash = "\0SLASH" + Math.random() + "\0";
var escOpen = "\0OPEN" + Math.random() + "\0";
var escClose = "\0CLOSE" + Math.random() + "\0";
var escComma = "\0COMMA" + Math.random() + "\0";
var escPeriod = "\0PERIOD" + Math.random() + "\0";
var escSlashPattern = new RegExp(escSlash, "g");
var escOpenPattern = new RegExp(escOpen, "g");
var escClosePattern = new RegExp(escClose, "g");
var escCommaPattern = new RegExp(escComma, "g");
var escPeriodPattern = new RegExp(escPeriod, "g");
var slashPattern = /\\\\/g;
var openPattern = /\\{/g;
var closePattern = /\\}/g;
var commaPattern = /\\,/g;
var periodPattern = /\\\./g;
var EXPANSION_MAX = 1e5;
function numeric(str) {
  return !isNaN(str) ? parseInt(str, 10) : str.charCodeAt(0);
}
function escapeBraces(str) {
  return str.replace(slashPattern, escSlash).replace(openPattern, escOpen).replace(closePattern, escClose).replace(commaPattern, escComma).replace(periodPattern, escPeriod);
}
function unescapeBraces(str) {
  return str.replace(escSlashPattern, "\\").replace(escOpenPattern, "{").replace(escClosePattern, "}").replace(escCommaPattern, ",").replace(escPeriodPattern, ".");
}
function parseCommaParts(str) {
  if (!str) {
    return [""];
  }
  const parts = [];
  const m = balanced("{", "}", str);
  if (!m) {
    return str.split(",");
  }
  const { pre, body, post } = m;
  const p = pre.split(",");
  p[p.length - 1] += "{" + body + "}";
  const postParts = parseCommaParts(post);
  if (post.length) {
    ;
    p[p.length - 1] += postParts.shift();
    p.push.apply(p, postParts);
  }
  parts.push.apply(parts, p);
  return parts;
}
function expand(str, options = {}) {
  if (!str) {
    return [];
  }
  const { max = EXPANSION_MAX } = options;
  if (str.slice(0, 2) === "{}") {
    str = "\\{\\}" + str.slice(2);
  }
  return expand_(escapeBraces(str), max, true).map(unescapeBraces);
}
function embrace(str) {
  return "{" + str + "}";
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}
function lte(i, y) {
  return i <= y;
}
function gte(i, y) {
  return i >= y;
}
function expand_(str, max, isTop) {
  const expansions = [];
  const m = balanced("{", "}", str);
  if (!m)
    return [str];
  const pre = m.pre;
  const post = m.post.length ? expand_(m.post, max, false) : [""];
  if (/\$$/.test(m.pre)) {
    for (let k = 0; k < post.length && k < max; k++) {
      const expansion = pre + "{" + m.body + "}" + post[k];
      expansions.push(expansion);
    }
  } else {
    const isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
    const isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
    const isSequence = isNumericSequence || isAlphaSequence;
    const isOptions = m.body.indexOf(",") >= 0;
    if (!isSequence && !isOptions) {
      if (m.post.match(/,(?!,).*\}/)) {
        str = m.pre + "{" + m.body + escClose + m.post;
        return expand_(str, max, true);
      }
      return [str];
    }
    let n;
    if (isSequence) {
      n = m.body.split(/\.\./);
    } else {
      n = parseCommaParts(m.body);
      if (n.length === 1 && n[0] !== void 0) {
        n = expand_(n[0], max, false).map(embrace);
        if (n.length === 1) {
          return post.map((p) => m.pre + n[0] + p);
        }
      }
    }
    let N;
    if (isSequence && n[0] !== void 0 && n[1] !== void 0) {
      const x = numeric(n[0]);
      const y = numeric(n[1]);
      const width = Math.max(n[0].length, n[1].length);
      let incr = n.length === 3 && n[2] !== void 0 ? Math.abs(numeric(n[2])) : 1;
      let test = lte;
      const reverse = y < x;
      if (reverse) {
        incr *= -1;
        test = gte;
      }
      const pad = n.some(isPadded);
      N = [];
      for (let i = x; test(i, y); i += incr) {
        let c;
        if (isAlphaSequence) {
          c = String.fromCharCode(i);
          if (c === "\\") {
            c = "";
          }
        } else {
          c = String(i);
          if (pad) {
            const need = width - c.length;
            if (need > 0) {
              const z = new Array(need + 1).join("0");
              if (i < 0) {
                c = "-" + z + c.slice(1);
              } else {
                c = z + c;
              }
            }
          }
        }
        N.push(c);
      }
    } else {
      N = [];
      for (let j = 0; j < n.length; j++) {
        N.push.apply(N, expand_(n[j], max, false));
      }
    }
    for (let j = 0; j < N.length; j++) {
      for (let k = 0; k < post.length && expansions.length < max; k++) {
        const expansion = pre + N[j] + post[k];
        if (!isTop || isSequence || expansion) {
          expansions.push(expansion);
        }
      }
    }
  }
  return expansions;
}

// ../../../../../../../../../../../workspace/node_modules/minimatch/dist/esm/assert-valid-pattern.js
var MAX_PATTERN_LENGTH = 1024 * 64;
var assertValidPattern = (pattern) => {
  if (typeof pattern !== "string") {
    throw new TypeError("invalid pattern");
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new TypeError("pattern is too long");
  }
};

// ../../../../../../../../../../../workspace/node_modules/minimatch/dist/esm/brace-expressions.js
var posixClasses = {
  "[:alnum:]": ["\\p{L}\\p{Nl}\\p{Nd}", true],
  "[:alpha:]": ["\\p{L}\\p{Nl}", true],
  "[:ascii:]": ["\\x00-\\x7f", false],
  "[:blank:]": ["\\p{Zs}\\t", true],
  "[:cntrl:]": ["\\p{Cc}", true],
  "[:digit:]": ["\\p{Nd}", true],
  "[:graph:]": ["\\p{Z}\\p{C}", true, true],
  "[:lower:]": ["\\p{Ll}", true],
  "[:print:]": ["\\p{C}", true],
  "[:punct:]": ["\\p{P}", true],
  "[:space:]": ["\\p{Z}\\t\\r\\n\\v\\f", true],
  "[:upper:]": ["\\p{Lu}", true],
  "[:word:]": ["\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}", true],
  "[:xdigit:]": ["A-Fa-f0-9", false]
};
var braceEscape = (s) => s.replace(/[[\]\\-]/g, "\\$&");
var regexpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var rangesToString = (ranges) => ranges.join("");
var parseClass = (glob, position) => {
  const pos = position;
  if (glob.charAt(pos) !== "[") {
    throw new Error("not in a brace expression");
  }
  const ranges = [];
  const negs = [];
  let i = pos + 1;
  let sawStart = false;
  let uflag = false;
  let escaping = false;
  let negate = false;
  let endPos = pos;
  let rangeStart = "";
  WHILE: while (i < glob.length) {
    const c = glob.charAt(i);
    if ((c === "!" || c === "^") && i === pos + 1) {
      negate = true;
      i++;
      continue;
    }
    if (c === "]" && sawStart && !escaping) {
      endPos = i + 1;
      break;
    }
    sawStart = true;
    if (c === "\\") {
      if (!escaping) {
        escaping = true;
        i++;
        continue;
      }
    }
    if (c === "[" && !escaping) {
      for (const [cls, [unip, u, neg]] of Object.entries(posixClasses)) {
        if (glob.startsWith(cls, i)) {
          if (rangeStart) {
            return ["$.", false, glob.length - pos, true];
          }
          i += cls.length;
          if (neg)
            negs.push(unip);
          else
            ranges.push(unip);
          uflag = uflag || u;
          continue WHILE;
        }
      }
    }
    escaping = false;
    if (rangeStart) {
      if (c > rangeStart) {
        ranges.push(braceEscape(rangeStart) + "-" + braceEscape(c));
      } else if (c === rangeStart) {
        ranges.push(braceEscape(c));
      }
      rangeStart = "";
      i++;
      continue;
    }
    if (glob.startsWith("-]", i + 1)) {
      ranges.push(braceEscape(c + "-"));
      i += 2;
      continue;
    }
    if (glob.startsWith("-", i + 1)) {
      rangeStart = c;
      i += 2;
      continue;
    }
    ranges.push(braceEscape(c));
    i++;
  }
  if (endPos < i) {
    return ["", false, 0, false];
  }
  if (!ranges.length && !negs.length) {
    return ["$.", false, glob.length - pos, true];
  }
  if (negs.length === 0 && ranges.length === 1 && /^\\?.$/.test(ranges[0]) && !negate) {
    const r = ranges[0].length === 2 ? ranges[0].slice(-1) : ranges[0];
    return [regexpEscape(r), false, endPos - pos, false];
  }
  const sranges = "[" + (negate ? "^" : "") + rangesToString(ranges) + "]";
  const snegs = "[" + (negate ? "" : "^") + rangesToString(negs) + "]";
  const comb = ranges.length && negs.length ? "(" + sranges + "|" + snegs + ")" : ranges.length ? sranges : snegs;
  return [comb, uflag, endPos - pos, true];
};

// ../../../../../../../../../../../workspace/node_modules/minimatch/dist/esm/unescape.js
var unescape = (s, { windowsPathsNoEscape = false, magicalBraces = true } = {}) => {
  if (magicalBraces) {
    return windowsPathsNoEscape ? s.replace(/\[([^\/\\])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^\/\\])\]/g, "$1$2").replace(/\\([^\/])/g, "$1");
  }
  return windowsPathsNoEscape ? s.replace(/\[([^\/\\{}])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^\/\\{}])\]/g, "$1$2").replace(/\\([^\/{}])/g, "$1");
};

// ../../../../../../../../../../../workspace/node_modules/minimatch/dist/esm/ast.js
var _a;
var types = /* @__PURE__ */ new Set(["!", "?", "+", "*", "@"]);
var isExtglobType = (c) => types.has(c);
var isExtglobAST = (c) => isExtglobType(c.type);
var adoptionMap = /* @__PURE__ */ new Map([
  ["!", ["@"]],
  ["?", ["?", "@"]],
  ["@", ["@"]],
  ["*", ["*", "+", "?", "@"]],
  ["+", ["+", "@"]]
]);
var adoptionWithSpaceMap = /* @__PURE__ */ new Map([
  ["!", ["?"]],
  ["@", ["?"]],
  ["+", ["?", "*"]]
]);
var adoptionAnyMap = /* @__PURE__ */ new Map([
  ["!", ["?", "@"]],
  ["?", ["?", "@"]],
  ["@", ["?", "@"]],
  ["*", ["*", "+", "?", "@"]],
  ["+", ["+", "@", "?", "*"]]
]);
var usurpMap = /* @__PURE__ */ new Map([
  ["!", /* @__PURE__ */ new Map([["!", "@"]])],
  [
    "?",
    /* @__PURE__ */ new Map([
      ["*", "*"],
      ["+", "*"]
    ])
  ],
  [
    "@",
    /* @__PURE__ */ new Map([
      ["!", "!"],
      ["?", "?"],
      ["@", "@"],
      ["*", "*"],
      ["+", "+"]
    ])
  ],
  [
    "+",
    /* @__PURE__ */ new Map([
      ["?", "*"],
      ["*", "*"]
    ])
  ]
]);
var startNoTraversal = "(?!(?:^|/)\\.\\.?(?:$|/))";
var startNoDot = "(?!\\.)";
var addPatternStart = /* @__PURE__ */ new Set(["[", "."]);
var justDots = /* @__PURE__ */ new Set(["..", "."]);
var reSpecials = new Set("().*{}+?[]^$\\!");
var regExpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var qmark = "[^/]";
var star = qmark + "*?";
var starNoEmpty = qmark + "+?";
var ID = 0;
var AST = class {
  type;
  #root;
  #hasMagic;
  #uflag = false;
  #parts = [];
  #parent;
  #parentIndex;
  #negs;
  #filledNegs = false;
  #options;
  #toString;
  // set to true if it's an extglob with no children
  // (which really means one child of '')
  #emptyExt = false;
  id = ++ID;
  get depth() {
    return (this.#parent?.depth ?? -1) + 1;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return {
      "@@type": "AST",
      id: this.id,
      type: this.type,
      root: this.#root.id,
      parent: this.#parent?.id,
      depth: this.depth,
      partsLength: this.#parts.length,
      parts: this.#parts
    };
  }
  constructor(type, parent, options = {}) {
    this.type = type;
    if (type)
      this.#hasMagic = true;
    this.#parent = parent;
    this.#root = this.#parent ? this.#parent.#root : this;
    this.#options = this.#root === this ? options : this.#root.#options;
    this.#negs = this.#root === this ? [] : this.#root.#negs;
    if (type === "!" && !this.#root.#filledNegs)
      this.#negs.push(this);
    this.#parentIndex = this.#parent ? this.#parent.#parts.length : 0;
  }
  get hasMagic() {
    if (this.#hasMagic !== void 0)
      return this.#hasMagic;
    for (const p of this.#parts) {
      if (typeof p === "string")
        continue;
      if (p.type || p.hasMagic)
        return this.#hasMagic = true;
    }
    return this.#hasMagic;
  }
  // reconstructs the pattern
  toString() {
    if (this.#toString !== void 0)
      return this.#toString;
    if (!this.type) {
      return this.#toString = this.#parts.map((p) => String(p)).join("");
    } else {
      return this.#toString = this.type + "(" + this.#parts.map((p) => String(p)).join("|") + ")";
    }
  }
  #fillNegs() {
    if (this !== this.#root)
      throw new Error("should only call on root");
    if (this.#filledNegs)
      return this;
    this.toString();
    this.#filledNegs = true;
    let n;
    while (n = this.#negs.pop()) {
      if (n.type !== "!")
        continue;
      let p = n;
      let pp = p.#parent;
      while (pp) {
        for (let i = p.#parentIndex + 1; !pp.type && i < pp.#parts.length; i++) {
          for (const part of n.#parts) {
            if (typeof part === "string") {
              throw new Error("string part in extglob AST??");
            }
            part.copyIn(pp.#parts[i]);
          }
        }
        p = pp;
        pp = p.#parent;
      }
    }
    return this;
  }
  push(...parts) {
    for (const p of parts) {
      if (p === "")
        continue;
      if (typeof p !== "string" && !(p instanceof _a && p.#parent === this)) {
        throw new Error("invalid part: " + p);
      }
      this.#parts.push(p);
    }
  }
  toJSON() {
    const ret = this.type === null ? this.#parts.slice().map((p) => typeof p === "string" ? p : p.toJSON()) : [this.type, ...this.#parts.map((p) => p.toJSON())];
    if (this.isStart() && !this.type)
      ret.unshift([]);
    if (this.isEnd() && (this === this.#root || this.#root.#filledNegs && this.#parent?.type === "!")) {
      ret.push({});
    }
    return ret;
  }
  isStart() {
    if (this.#root === this)
      return true;
    if (!this.#parent?.isStart())
      return false;
    if (this.#parentIndex === 0)
      return true;
    const p = this.#parent;
    for (let i = 0; i < this.#parentIndex; i++) {
      const pp = p.#parts[i];
      if (!(pp instanceof _a && pp.type === "!")) {
        return false;
      }
    }
    return true;
  }
  isEnd() {
    if (this.#root === this)
      return true;
    if (this.#parent?.type === "!")
      return true;
    if (!this.#parent?.isEnd())
      return false;
    if (!this.type)
      return this.#parent?.isEnd();
    const pl = this.#parent ? this.#parent.#parts.length : 0;
    return this.#parentIndex === pl - 1;
  }
  copyIn(part) {
    if (typeof part === "string")
      this.push(part);
    else
      this.push(part.clone(this));
  }
  clone(parent) {
    const c = new _a(this.type, parent);
    for (const p of this.#parts) {
      c.copyIn(p);
    }
    return c;
  }
  static #parseAST(str, ast, pos, opt, extDepth) {
    const maxDepth = opt.maxExtglobRecursion ?? 2;
    let escaping = false;
    let inBrace = false;
    let braceStart = -1;
    let braceNeg = false;
    if (ast.type === null) {
      let i2 = pos;
      let acc2 = "";
      while (i2 < str.length) {
        const c = str.charAt(i2++);
        if (escaping || c === "\\") {
          escaping = !escaping;
          acc2 += c;
          continue;
        }
        if (inBrace) {
          if (i2 === braceStart + 1) {
            if (c === "^" || c === "!") {
              braceNeg = true;
            }
          } else if (c === "]" && !(i2 === braceStart + 2 && braceNeg)) {
            inBrace = false;
          }
          acc2 += c;
          continue;
        } else if (c === "[") {
          inBrace = true;
          braceStart = i2;
          braceNeg = false;
          acc2 += c;
          continue;
        }
        const doRecurse = !opt.noext && isExtglobType(c) && str.charAt(i2) === "(" && extDepth <= maxDepth;
        if (doRecurse) {
          ast.push(acc2);
          acc2 = "";
          const ext2 = new _a(c, ast);
          i2 = _a.#parseAST(str, ext2, i2, opt, extDepth + 1);
          ast.push(ext2);
          continue;
        }
        acc2 += c;
      }
      ast.push(acc2);
      return i2;
    }
    let i = pos + 1;
    let part = new _a(null, ast);
    const parts = [];
    let acc = "";
    while (i < str.length) {
      const c = str.charAt(i++);
      if (escaping || c === "\\") {
        escaping = !escaping;
        acc += c;
        continue;
      }
      if (inBrace) {
        if (i === braceStart + 1) {
          if (c === "^" || c === "!") {
            braceNeg = true;
          }
        } else if (c === "]" && !(i === braceStart + 2 && braceNeg)) {
          inBrace = false;
        }
        acc += c;
        continue;
      } else if (c === "[") {
        inBrace = true;
        braceStart = i;
        braceNeg = false;
        acc += c;
        continue;
      }
      const doRecurse = !opt.noext && isExtglobType(c) && str.charAt(i) === "(" && /* c8 ignore start - the maxDepth is sufficient here */
      (extDepth <= maxDepth || ast && ast.#canAdoptType(c));
      if (doRecurse) {
        const depthAdd = ast && ast.#canAdoptType(c) ? 0 : 1;
        part.push(acc);
        acc = "";
        const ext2 = new _a(c, part);
        part.push(ext2);
        i = _a.#parseAST(str, ext2, i, opt, extDepth + depthAdd);
        continue;
      }
      if (c === "|") {
        part.push(acc);
        acc = "";
        parts.push(part);
        part = new _a(null, ast);
        continue;
      }
      if (c === ")") {
        if (acc === "" && ast.#parts.length === 0) {
          ast.#emptyExt = true;
        }
        part.push(acc);
        acc = "";
        ast.push(...parts, part);
        return i;
      }
      acc += c;
    }
    ast.type = null;
    ast.#hasMagic = void 0;
    ast.#parts = [str.substring(pos - 1)];
    return i;
  }
  #canAdoptWithSpace(child) {
    return this.#canAdopt(child, adoptionWithSpaceMap);
  }
  #canAdopt(child, map = adoptionMap) {
    if (!child || typeof child !== "object" || child.type !== null || child.#parts.length !== 1 || this.type === null) {
      return false;
    }
    const gc = child.#parts[0];
    if (!gc || typeof gc !== "object" || gc.type === null) {
      return false;
    }
    return this.#canAdoptType(gc.type, map);
  }
  #canAdoptType(c, map = adoptionAnyMap) {
    return !!map.get(this.type)?.includes(c);
  }
  #adoptWithSpace(child, index2) {
    const gc = child.#parts[0];
    const blank = new _a(null, gc, this.options);
    blank.#parts.push("");
    gc.push(blank);
    this.#adopt(child, index2);
  }
  #adopt(child, index2) {
    const gc = child.#parts[0];
    this.#parts.splice(index2, 1, ...gc.#parts);
    for (const p of gc.#parts) {
      if (typeof p === "object")
        p.#parent = this;
    }
    this.#toString = void 0;
  }
  #canUsurpType(c) {
    const m = usurpMap.get(this.type);
    return !!m?.has(c);
  }
  #canUsurp(child) {
    if (!child || typeof child !== "object" || child.type !== null || child.#parts.length !== 1 || this.type === null || this.#parts.length !== 1) {
      return false;
    }
    const gc = child.#parts[0];
    if (!gc || typeof gc !== "object" || gc.type === null) {
      return false;
    }
    return this.#canUsurpType(gc.type);
  }
  #usurp(child) {
    const m = usurpMap.get(this.type);
    const gc = child.#parts[0];
    const nt = m?.get(gc.type);
    if (!nt)
      return false;
    this.#parts = gc.#parts;
    for (const p of this.#parts) {
      if (typeof p === "object") {
        p.#parent = this;
      }
    }
    this.type = nt;
    this.#toString = void 0;
    this.#emptyExt = false;
  }
  static fromGlob(pattern, options = {}) {
    const ast = new _a(null, void 0, options);
    _a.#parseAST(pattern, ast, 0, options, 0);
    return ast;
  }
  // returns the regular expression if there's magic, or the unescaped
  // string if not.
  toMMPattern() {
    if (this !== this.#root)
      return this.#root.toMMPattern();
    const glob = this.toString();
    const [re, body, hasMagic, uflag] = this.toRegExpSource();
    const anyMagic = hasMagic || this.#hasMagic || this.#options.nocase && !this.#options.nocaseMagicOnly && glob.toUpperCase() !== glob.toLowerCase();
    if (!anyMagic) {
      return body;
    }
    const flags = (this.#options.nocase ? "i" : "") + (uflag ? "u" : "");
    return Object.assign(new RegExp(`^${re}$`, flags), {
      _src: re,
      _glob: glob
    });
  }
  get options() {
    return this.#options;
  }
  // returns the string match, the regexp source, whether there's magic
  // in the regexp (so a regular expression is required) and whether or
  // not the uflag is needed for the regular expression (for posix classes)
  // TODO: instead of injecting the start/end at this point, just return
  // the BODY of the regexp, along with the start/end portions suitable
  // for binding the start/end in either a joined full-path makeRe context
  // (where we bind to (^|/), or a standalone matchPart context (where
  // we bind to ^, and not /).  Otherwise slashes get duped!
  //
  // In part-matching mode, the start is:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: ^(?!\.\.?$)
  // - if dots allowed or not possible: ^
  // - if dots possible and not allowed: ^(?!\.)
  // end is:
  // - if not isEnd(): nothing
  // - else: $
  //
  // In full-path matching mode, we put the slash at the START of the
  // pattern, so start is:
  // - if first pattern: same as part-matching mode
  // - if not isStart(): nothing
  // - if traversal possible, but not allowed: /(?!\.\.?(?:$|/))
  // - if dots allowed or not possible: /
  // - if dots possible and not allowed: /(?!\.)
  // end is:
  // - if last pattern, same as part-matching mode
  // - else nothing
  //
  // Always put the (?:$|/) on negated tails, though, because that has to be
  // there to bind the end of the negated pattern portion, and it's easier to
  // just stick it in now rather than try to inject it later in the middle of
  // the pattern.
  //
  // We can just always return the same end, and leave it up to the caller
  // to know whether it's going to be used joined or in parts.
  // And, if the start is adjusted slightly, can do the same there:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: (?:/|^)(?!\.\.?$)
  // - if dots allowed or not possible: (?:/|^)
  // - if dots possible and not allowed: (?:/|^)(?!\.)
  //
  // But it's better to have a simpler binding without a conditional, for
  // performance, so probably better to return both start options.
  //
  // Then the caller just ignores the end if it's not the first pattern,
  // and the start always gets applied.
  //
  // But that's always going to be $ if it's the ending pattern, or nothing,
  // so the caller can just attach $ at the end of the pattern when building.
  //
  // So the todo is:
  // - better detect what kind of start is needed
  // - return both flavors of starting pattern
  // - attach $ at the end of the pattern when creating the actual RegExp
  //
  // Ah, but wait, no, that all only applies to the root when the first pattern
  // is not an extglob. If the first pattern IS an extglob, then we need all
  // that dot prevention biz to live in the extglob portions, because eg
  // +(*|.x*) can match .xy but not .yx.
  //
  // So, return the two flavors if it's #root and the first child is not an
  // AST, otherwise leave it to the child AST to handle it, and there,
  // use the (?:^|/) style of start binding.
  //
  // Even simplified further:
  // - Since the start for a join is eg /(?!\.) and the start for a part
  // is ^(?!\.), we can just prepend (?!\.) to the pattern (either root
  // or start or whatever) and prepend ^ or / at the Regexp construction.
  toRegExpSource(allowDot) {
    const dot = allowDot ?? !!this.#options.dot;
    if (this.#root === this) {
      this.#flatten();
      this.#fillNegs();
    }
    if (!isExtglobAST(this)) {
      const noEmpty = this.isStart() && this.isEnd() && !this.#parts.some((s) => typeof s !== "string");
      const src = this.#parts.map((p) => {
        const [re, _, hasMagic, uflag] = typeof p === "string" ? _a.#parseGlob(p, this.#hasMagic, noEmpty) : p.toRegExpSource(allowDot);
        this.#hasMagic = this.#hasMagic || hasMagic;
        this.#uflag = this.#uflag || uflag;
        return re;
      }).join("");
      let start2 = "";
      if (this.isStart()) {
        if (typeof this.#parts[0] === "string") {
          const dotTravAllowed = this.#parts.length === 1 && justDots.has(this.#parts[0]);
          if (!dotTravAllowed) {
            const aps = addPatternStart;
            const needNoTrav = (
              // dots are allowed, and the pattern starts with [ or .
              dot && aps.has(src.charAt(0)) || // the pattern starts with \., and then [ or .
              src.startsWith("\\.") && aps.has(src.charAt(2)) || // the pattern starts with \.\., and then [ or .
              src.startsWith("\\.\\.") && aps.has(src.charAt(4))
            );
            const needNoDot = !dot && !allowDot && aps.has(src.charAt(0));
            start2 = needNoTrav ? startNoTraversal : needNoDot ? startNoDot : "";
          }
        }
      }
      let end = "";
      if (this.isEnd() && this.#root.#filledNegs && this.#parent?.type === "!") {
        end = "(?:$|\\/)";
      }
      const final2 = start2 + src + end;
      return [
        final2,
        unescape(src),
        this.#hasMagic = !!this.#hasMagic,
        this.#uflag
      ];
    }
    const repeated = this.type === "*" || this.type === "+";
    const start = this.type === "!" ? "(?:(?!(?:" : "(?:";
    let body = this.#partsToRegExp(dot);
    if (this.isStart() && this.isEnd() && !body && this.type !== "!") {
      const s = this.toString();
      const me = this;
      me.#parts = [s];
      me.type = null;
      me.#hasMagic = void 0;
      return [s, unescape(this.toString()), false, false];
    }
    let bodyDotAllowed = !repeated || allowDot || dot || !startNoDot ? "" : this.#partsToRegExp(true);
    if (bodyDotAllowed === body) {
      bodyDotAllowed = "";
    }
    if (bodyDotAllowed) {
      body = `(?:${body})(?:${bodyDotAllowed})*?`;
    }
    let final = "";
    if (this.type === "!" && this.#emptyExt) {
      final = (this.isStart() && !dot ? startNoDot : "") + starNoEmpty;
    } else {
      const close = this.type === "!" ? (
        // !() must match something,but !(x) can match ''
        "))" + (this.isStart() && !dot && !allowDot ? startNoDot : "") + star + ")"
      ) : this.type === "@" ? ")" : this.type === "?" ? ")?" : this.type === "+" && bodyDotAllowed ? ")" : this.type === "*" && bodyDotAllowed ? `)?` : `)${this.type}`;
      final = start + body + close;
    }
    return [
      final,
      unescape(body),
      this.#hasMagic = !!this.#hasMagic,
      this.#uflag
    ];
  }
  #flatten() {
    if (!isExtglobAST(this)) {
      for (const p of this.#parts) {
        if (typeof p === "object") {
          p.#flatten();
        }
      }
    } else {
      let iterations = 0;
      let done = false;
      do {
        done = true;
        for (let i = 0; i < this.#parts.length; i++) {
          const c = this.#parts[i];
          if (typeof c === "object") {
            c.#flatten();
            if (this.#canAdopt(c)) {
              done = false;
              this.#adopt(c, i);
            } else if (this.#canAdoptWithSpace(c)) {
              done = false;
              this.#adoptWithSpace(c, i);
            } else if (this.#canUsurp(c)) {
              done = false;
              this.#usurp(c);
            }
          }
        }
      } while (!done && ++iterations < 10);
    }
    this.#toString = void 0;
  }
  #partsToRegExp(dot) {
    return this.#parts.map((p) => {
      if (typeof p === "string") {
        throw new Error("string type in extglob ast??");
      }
      const [re, _, _hasMagic, uflag] = p.toRegExpSource(dot);
      this.#uflag = this.#uflag || uflag;
      return re;
    }).filter((p) => !(this.isStart() && this.isEnd()) || !!p).join("|");
  }
  static #parseGlob(glob, hasMagic, noEmpty = false) {
    let escaping = false;
    let re = "";
    let uflag = false;
    let inStar = false;
    for (let i = 0; i < glob.length; i++) {
      const c = glob.charAt(i);
      if (escaping) {
        escaping = false;
        re += (reSpecials.has(c) ? "\\" : "") + c;
        continue;
      }
      if (c === "*") {
        if (inStar)
          continue;
        inStar = true;
        re += noEmpty && /^[*]+$/.test(glob) ? starNoEmpty : star;
        hasMagic = true;
        continue;
      } else {
        inStar = false;
      }
      if (c === "\\") {
        if (i === glob.length - 1) {
          re += "\\\\";
        } else {
          escaping = true;
        }
        continue;
      }
      if (c === "[") {
        const [src, needUflag, consumed, magic] = parseClass(glob, i);
        if (consumed) {
          re += src;
          uflag = uflag || needUflag;
          i += consumed - 1;
          hasMagic = hasMagic || magic;
          continue;
        }
      }
      if (c === "?") {
        re += qmark;
        hasMagic = true;
        continue;
      }
      re += regExpEscape(c);
    }
    return [re, unescape(glob), !!hasMagic, uflag];
  }
};
_a = AST;

// ../../../../../../../../../../../workspace/node_modules/minimatch/dist/esm/escape.js
var escape = (s, { windowsPathsNoEscape = false, magicalBraces = false } = {}) => {
  if (magicalBraces) {
    return windowsPathsNoEscape ? s.replace(/[?*()[\]{}]/g, "[$&]") : s.replace(/[?*()[\]\\{}]/g, "\\$&");
  }
  return windowsPathsNoEscape ? s.replace(/[?*()[\]]/g, "[$&]") : s.replace(/[?*()[\]\\]/g, "\\$&");
};

// ../../../../../../../../../../../workspace/node_modules/minimatch/dist/esm/index.js
var minimatch = (p, pattern, options = {}) => {
  assertValidPattern(pattern);
  if (!options.nocomment && pattern.charAt(0) === "#") {
    return false;
  }
  return new Minimatch(pattern, options).match(p);
};
var starDotExtRE = /^\*+([^+@!?\*\[\(]*)$/;
var starDotExtTest = (ext2) => (f) => !f.startsWith(".") && f.endsWith(ext2);
var starDotExtTestDot = (ext2) => (f) => f.endsWith(ext2);
var starDotExtTestNocase = (ext2) => {
  ext2 = ext2.toLowerCase();
  return (f) => !f.startsWith(".") && f.toLowerCase().endsWith(ext2);
};
var starDotExtTestNocaseDot = (ext2) => {
  ext2 = ext2.toLowerCase();
  return (f) => f.toLowerCase().endsWith(ext2);
};
var starDotStarRE = /^\*+\.\*+$/;
var starDotStarTest = (f) => !f.startsWith(".") && f.includes(".");
var starDotStarTestDot = (f) => f !== "." && f !== ".." && f.includes(".");
var dotStarRE = /^\.\*+$/;
var dotStarTest = (f) => f !== "." && f !== ".." && f.startsWith(".");
var starRE = /^\*+$/;
var starTest = (f) => f.length !== 0 && !f.startsWith(".");
var starTestDot = (f) => f.length !== 0 && f !== "." && f !== "..";
var qmarksRE = /^\?+([^+@!?\*\[\(]*)?$/;
var qmarksTestNocase = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExt([$0]);
  if (!ext2)
    return noext;
  ext2 = ext2.toLowerCase();
  return (f) => noext(f) && f.toLowerCase().endsWith(ext2);
};
var qmarksTestNocaseDot = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExtDot([$0]);
  if (!ext2)
    return noext;
  ext2 = ext2.toLowerCase();
  return (f) => noext(f) && f.toLowerCase().endsWith(ext2);
};
var qmarksTestDot = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExtDot([$0]);
  return !ext2 ? noext : (f) => noext(f) && f.endsWith(ext2);
};
var qmarksTest = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExt([$0]);
  return !ext2 ? noext : (f) => noext(f) && f.endsWith(ext2);
};
var qmarksTestNoExt = ([$0]) => {
  const len = $0.length;
  return (f) => f.length === len && !f.startsWith(".");
};
var qmarksTestNoExtDot = ([$0]) => {
  const len = $0.length;
  return (f) => f.length === len && f !== "." && f !== "..";
};
var defaultPlatform = typeof process === "object" && process ? typeof process.env === "object" && process.env && process.env.__MINIMATCH_TESTING_PLATFORM__ || process.platform : "posix";
var path = {
  win32: { sep: "\\" },
  posix: { sep: "/" }
};
var sep = defaultPlatform === "win32" ? path.win32.sep : path.posix.sep;
minimatch.sep = sep;
var GLOBSTAR = Symbol("globstar **");
minimatch.GLOBSTAR = GLOBSTAR;
var qmark2 = "[^/]";
var star2 = qmark2 + "*?";
var twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
var twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?";
var filter = (pattern, options = {}) => (p) => minimatch(p, pattern, options);
minimatch.filter = filter;
var ext = (a, b = {}) => Object.assign({}, a, b);
var defaults = (def) => {
  if (!def || typeof def !== "object" || !Object.keys(def).length) {
    return minimatch;
  }
  const orig = minimatch;
  const m = (p, pattern, options = {}) => orig(p, pattern, ext(def, options));
  return Object.assign(m, {
    Minimatch: class Minimatch extends orig.Minimatch {
      constructor(pattern, options = {}) {
        super(pattern, ext(def, options));
      }
      static defaults(options) {
        return orig.defaults(ext(def, options)).Minimatch;
      }
    },
    AST: class AST extends orig.AST {
      /* c8 ignore start */
      constructor(type, parent, options = {}) {
        super(type, parent, ext(def, options));
      }
      /* c8 ignore stop */
      static fromGlob(pattern, options = {}) {
        return orig.AST.fromGlob(pattern, ext(def, options));
      }
    },
    unescape: (s, options = {}) => orig.unescape(s, ext(def, options)),
    escape: (s, options = {}) => orig.escape(s, ext(def, options)),
    filter: (pattern, options = {}) => orig.filter(pattern, ext(def, options)),
    defaults: (options) => orig.defaults(ext(def, options)),
    makeRe: (pattern, options = {}) => orig.makeRe(pattern, ext(def, options)),
    braceExpand: (pattern, options = {}) => orig.braceExpand(pattern, ext(def, options)),
    match: (list, pattern, options = {}) => orig.match(list, pattern, ext(def, options)),
    sep: orig.sep,
    GLOBSTAR
  });
};
minimatch.defaults = defaults;
var braceExpand = (pattern, options = {}) => {
  assertValidPattern(pattern);
  if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
    return [pattern];
  }
  return expand(pattern, { max: options.braceExpandMax });
};
minimatch.braceExpand = braceExpand;
var makeRe = (pattern, options = {}) => new Minimatch(pattern, options).makeRe();
minimatch.makeRe = makeRe;
var match = (list, pattern, options = {}) => {
  const mm = new Minimatch(pattern, options);
  list = list.filter((f) => mm.match(f));
  if (mm.options.nonull && !list.length) {
    list.push(pattern);
  }
  return list;
};
minimatch.match = match;
var globMagic = /[?*]|[+@!]\(.*?\)|\[|\]/;
var regExpEscape2 = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var Minimatch = class {
  options;
  set;
  pattern;
  windowsPathsNoEscape;
  nonegate;
  negate;
  comment;
  empty;
  preserveMultipleSlashes;
  partial;
  globSet;
  globParts;
  nocase;
  isWindows;
  platform;
  windowsNoMagicRoot;
  maxGlobstarRecursion;
  regexp;
  constructor(pattern, options = {}) {
    assertValidPattern(pattern);
    options = options || {};
    this.options = options;
    this.maxGlobstarRecursion = options.maxGlobstarRecursion ?? 200;
    this.pattern = pattern;
    this.platform = options.platform || defaultPlatform;
    this.isWindows = this.platform === "win32";
    const awe = "allowWindowsEscape";
    this.windowsPathsNoEscape = !!options.windowsPathsNoEscape || options[awe] === false;
    if (this.windowsPathsNoEscape) {
      this.pattern = this.pattern.replace(/\\/g, "/");
    }
    this.preserveMultipleSlashes = !!options.preserveMultipleSlashes;
    this.regexp = null;
    this.negate = false;
    this.nonegate = !!options.nonegate;
    this.comment = false;
    this.empty = false;
    this.partial = !!options.partial;
    this.nocase = !!this.options.nocase;
    this.windowsNoMagicRoot = options.windowsNoMagicRoot !== void 0 ? options.windowsNoMagicRoot : !!(this.isWindows && this.nocase);
    this.globSet = [];
    this.globParts = [];
    this.set = [];
    this.make();
  }
  hasMagic() {
    if (this.options.magicalBraces && this.set.length > 1) {
      return true;
    }
    for (const pattern of this.set) {
      for (const part of pattern) {
        if (typeof part !== "string")
          return true;
      }
    }
    return false;
  }
  debug(..._) {
  }
  make() {
    const pattern = this.pattern;
    const options = this.options;
    if (!options.nocomment && pattern.charAt(0) === "#") {
      this.comment = true;
      return;
    }
    if (!pattern) {
      this.empty = true;
      return;
    }
    this.parseNegate();
    this.globSet = [...new Set(this.braceExpand())];
    if (options.debug) {
      this.debug = (...args) => console.error(...args);
    }
    this.debug(this.pattern, this.globSet);
    const rawGlobParts = this.globSet.map((s) => this.slashSplit(s));
    this.globParts = this.preprocess(rawGlobParts);
    this.debug(this.pattern, this.globParts);
    let set = this.globParts.map((s, _, __) => {
      if (this.isWindows && this.windowsNoMagicRoot) {
        const isUNC = s[0] === "" && s[1] === "" && (s[2] === "?" || !globMagic.test(s[2])) && !globMagic.test(s[3]);
        const isDrive = /^[a-z]:/i.test(s[0]);
        if (isUNC) {
          return [
            ...s.slice(0, 4),
            ...s.slice(4).map((ss) => this.parse(ss))
          ];
        } else if (isDrive) {
          return [s[0], ...s.slice(1).map((ss) => this.parse(ss))];
        }
      }
      return s.map((ss) => this.parse(ss));
    });
    this.debug(this.pattern, set);
    this.set = set.filter((s) => s.indexOf(false) === -1);
    if (this.isWindows) {
      for (let i = 0; i < this.set.length; i++) {
        const p = this.set[i];
        if (p[0] === "" && p[1] === "" && this.globParts[i][2] === "?" && typeof p[3] === "string" && /^[a-z]:$/i.test(p[3])) {
          p[2] = "?";
        }
      }
    }
    this.debug(this.pattern, this.set);
  }
  // various transforms to equivalent pattern sets that are
  // faster to process in a filesystem walk.  The goal is to
  // eliminate what we can, and push all ** patterns as far
  // to the right as possible, even if it increases the number
  // of patterns that we have to process.
  preprocess(globParts) {
    if (this.options.noglobstar) {
      for (let i = 0; i < globParts.length; i++) {
        for (let j = 0; j < globParts[i].length; j++) {
          if (globParts[i][j] === "**") {
            globParts[i][j] = "*";
          }
        }
      }
    }
    const { optimizationLevel = 1 } = this.options;
    if (optimizationLevel >= 2) {
      globParts = this.firstPhasePreProcess(globParts);
      globParts = this.secondPhasePreProcess(globParts);
    } else if (optimizationLevel >= 1) {
      globParts = this.levelOneOptimize(globParts);
    } else {
      globParts = this.adjascentGlobstarOptimize(globParts);
    }
    return globParts;
  }
  // just get rid of adjascent ** portions
  adjascentGlobstarOptimize(globParts) {
    return globParts.map((parts) => {
      let gs = -1;
      while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
        let i = gs;
        while (parts[i + 1] === "**") {
          i++;
        }
        if (i !== gs) {
          parts.splice(gs, i - gs);
        }
      }
      return parts;
    });
  }
  // get rid of adjascent ** and resolve .. portions
  levelOneOptimize(globParts) {
    return globParts.map((parts) => {
      parts = parts.reduce((set, part) => {
        const prev = set[set.length - 1];
        if (part === "**" && prev === "**") {
          return set;
        }
        if (part === "..") {
          if (prev && prev !== ".." && prev !== "." && prev !== "**") {
            set.pop();
            return set;
          }
        }
        set.push(part);
        return set;
      }, []);
      return parts.length === 0 ? [""] : parts;
    });
  }
  levelTwoFileOptimize(parts) {
    if (!Array.isArray(parts)) {
      parts = this.slashSplit(parts);
    }
    let didSomething = false;
    do {
      didSomething = false;
      if (!this.preserveMultipleSlashes) {
        for (let i = 1; i < parts.length - 1; i++) {
          const p = parts[i];
          if (i === 1 && p === "" && parts[0] === "")
            continue;
          if (p === "." || p === "") {
            didSomething = true;
            parts.splice(i, 1);
            i--;
          }
        }
        if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
          didSomething = true;
          parts.pop();
        }
      }
      let dd = 0;
      while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
        const p = parts[dd - 1];
        if (p && p !== "." && p !== ".." && p !== "**") {
          didSomething = true;
          parts.splice(dd - 1, 2);
          dd -= 2;
        }
      }
    } while (didSomething);
    return parts.length === 0 ? [""] : parts;
  }
  // First phase: single-pattern processing
  // <pre> is 1 or more portions
  // <rest> is 1 or more portions
  // <p> is any portion other than ., .., '', or **
  // <e> is . or ''
  //
  // **/.. is *brutal* for filesystem walking performance, because
  // it effectively resets the recursive walk each time it occurs,
  // and ** cannot be reduced out by a .. pattern part like a regexp
  // or most strings (other than .., ., and '') can be.
  //
  // <pre>/**/../<p>/<p>/<rest> -> {<pre>/../<p>/<p>/<rest>,<pre>/**/<p>/<p>/<rest>}
  // <pre>/<e>/<rest> -> <pre>/<rest>
  // <pre>/<p>/../<rest> -> <pre>/<rest>
  // **/**/<rest> -> **/<rest>
  //
  // **/*/<rest> -> */**/<rest> <== not valid because ** doesn't follow
  // this WOULD be allowed if ** did follow symlinks, or * didn't
  firstPhasePreProcess(globParts) {
    let didSomething = false;
    do {
      didSomething = false;
      for (let parts of globParts) {
        let gs = -1;
        while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
          let gss = gs;
          while (parts[gss + 1] === "**") {
            gss++;
          }
          if (gss > gs) {
            parts.splice(gs + 1, gss - gs);
          }
          let next = parts[gs + 1];
          const p = parts[gs + 2];
          const p2 = parts[gs + 3];
          if (next !== "..")
            continue;
          if (!p || p === "." || p === ".." || !p2 || p2 === "." || p2 === "..") {
            continue;
          }
          didSomething = true;
          parts.splice(gs, 1);
          const other = parts.slice(0);
          other[gs] = "**";
          globParts.push(other);
          gs--;
        }
        if (!this.preserveMultipleSlashes) {
          for (let i = 1; i < parts.length - 1; i++) {
            const p = parts[i];
            if (i === 1 && p === "" && parts[0] === "")
              continue;
            if (p === "." || p === "") {
              didSomething = true;
              parts.splice(i, 1);
              i--;
            }
          }
          if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
            didSomething = true;
            parts.pop();
          }
        }
        let dd = 0;
        while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
          const p = parts[dd - 1];
          if (p && p !== "." && p !== ".." && p !== "**") {
            didSomething = true;
            const needDot = dd === 1 && parts[dd + 1] === "**";
            const splin = needDot ? ["."] : [];
            parts.splice(dd - 1, 2, ...splin);
            if (parts.length === 0)
              parts.push("");
            dd -= 2;
          }
        }
      }
    } while (didSomething);
    return globParts;
  }
  // second phase: multi-pattern dedupes
  // {<pre>/*/<rest>,<pre>/<p>/<rest>} -> <pre>/*/<rest>
  // {<pre>/<rest>,<pre>/<rest>} -> <pre>/<rest>
  // {<pre>/**/<rest>,<pre>/<rest>} -> <pre>/**/<rest>
  //
  // {<pre>/**/<rest>,<pre>/**/<p>/<rest>} -> <pre>/**/<rest>
  // ^-- not valid because ** doens't follow symlinks
  secondPhasePreProcess(globParts) {
    for (let i = 0; i < globParts.length - 1; i++) {
      for (let j = i + 1; j < globParts.length; j++) {
        const matched = this.partsMatch(globParts[i], globParts[j], !this.preserveMultipleSlashes);
        if (matched) {
          globParts[i] = [];
          globParts[j] = matched;
          break;
        }
      }
    }
    return globParts.filter((gs) => gs.length);
  }
  partsMatch(a, b, emptyGSMatch = false) {
    let ai = 0;
    let bi = 0;
    let result = [];
    let which = "";
    while (ai < a.length && bi < b.length) {
      if (a[ai] === b[bi]) {
        result.push(which === "b" ? b[bi] : a[ai]);
        ai++;
        bi++;
      } else if (emptyGSMatch && a[ai] === "**" && b[bi] === a[ai + 1]) {
        result.push(a[ai]);
        ai++;
      } else if (emptyGSMatch && b[bi] === "**" && a[ai] === b[bi + 1]) {
        result.push(b[bi]);
        bi++;
      } else if (a[ai] === "*" && b[bi] && (this.options.dot || !b[bi].startsWith(".")) && b[bi] !== "**") {
        if (which === "b")
          return false;
        which = "a";
        result.push(a[ai]);
        ai++;
        bi++;
      } else if (b[bi] === "*" && a[ai] && (this.options.dot || !a[ai].startsWith(".")) && a[ai] !== "**") {
        if (which === "a")
          return false;
        which = "b";
        result.push(b[bi]);
        ai++;
        bi++;
      } else {
        return false;
      }
    }
    return a.length === b.length && result;
  }
  parseNegate() {
    if (this.nonegate)
      return;
    const pattern = this.pattern;
    let negate = false;
    let negateOffset = 0;
    for (let i = 0; i < pattern.length && pattern.charAt(i) === "!"; i++) {
      negate = !negate;
      negateOffset++;
    }
    if (negateOffset)
      this.pattern = pattern.slice(negateOffset);
    this.negate = negate;
  }
  // set partial to true to test if, for example,
  // "/a/b" matches the start of "/*/b/*/d"
  // Partial means, if you run out of file before you run
  // out of pattern, then that's fine, as long as all
  // the parts match.
  matchOne(file, pattern, partial = false) {
    let fileStartIndex = 0;
    let patternStartIndex = 0;
    if (this.isWindows) {
      const fileDrive = typeof file[0] === "string" && /^[a-z]:$/i.test(file[0]);
      const fileUNC = !fileDrive && file[0] === "" && file[1] === "" && file[2] === "?" && /^[a-z]:$/i.test(file[3]);
      const patternDrive = typeof pattern[0] === "string" && /^[a-z]:$/i.test(pattern[0]);
      const patternUNC = !patternDrive && pattern[0] === "" && pattern[1] === "" && pattern[2] === "?" && typeof pattern[3] === "string" && /^[a-z]:$/i.test(pattern[3]);
      const fdi = fileUNC ? 3 : fileDrive ? 0 : void 0;
      const pdi = patternUNC ? 3 : patternDrive ? 0 : void 0;
      if (typeof fdi === "number" && typeof pdi === "number") {
        const [fd, pd] = [
          file[fdi],
          pattern[pdi]
        ];
        if (fd.toLowerCase() === pd.toLowerCase()) {
          pattern[pdi] = fd;
          patternStartIndex = pdi;
          fileStartIndex = fdi;
        }
      }
    }
    const { optimizationLevel = 1 } = this.options;
    if (optimizationLevel >= 2) {
      file = this.levelTwoFileOptimize(file);
    }
    if (pattern.includes(GLOBSTAR)) {
      return this.#matchGlobstar(file, pattern, partial, fileStartIndex, patternStartIndex);
    }
    return this.#matchOne(file, pattern, partial, fileStartIndex, patternStartIndex);
  }
  #matchGlobstar(file, pattern, partial, fileIndex, patternIndex) {
    const firstgs = pattern.indexOf(GLOBSTAR, patternIndex);
    const lastgs = pattern.lastIndexOf(GLOBSTAR);
    const [head, body, tail] = partial ? [
      pattern.slice(patternIndex, firstgs),
      pattern.slice(firstgs + 1),
      []
    ] : [
      pattern.slice(patternIndex, firstgs),
      pattern.slice(firstgs + 1, lastgs),
      pattern.slice(lastgs + 1)
    ];
    if (head.length) {
      const fileHead = file.slice(fileIndex, fileIndex + head.length);
      if (!this.#matchOne(fileHead, head, partial, 0, 0)) {
        return false;
      }
      fileIndex += head.length;
      patternIndex += head.length;
    }
    let fileTailMatch = 0;
    if (tail.length) {
      if (tail.length + fileIndex > file.length)
        return false;
      let tailStart = file.length - tail.length;
      if (this.#matchOne(file, tail, partial, tailStart, 0)) {
        fileTailMatch = tail.length;
      } else {
        if (file[file.length - 1] !== "" || fileIndex + tail.length === file.length) {
          return false;
        }
        tailStart--;
        if (!this.#matchOne(file, tail, partial, tailStart, 0)) {
          return false;
        }
        fileTailMatch = tail.length + 1;
      }
    }
    if (!body.length) {
      let sawSome = !!fileTailMatch;
      for (let i2 = fileIndex; i2 < file.length - fileTailMatch; i2++) {
        const f = String(file[i2]);
        sawSome = true;
        if (f === "." || f === ".." || !this.options.dot && f.startsWith(".")) {
          return false;
        }
      }
      return partial || sawSome;
    }
    const bodySegments = [[[], 0]];
    let currentBody = bodySegments[0];
    let nonGsParts = 0;
    const nonGsPartsSums = [0];
    for (const b of body) {
      if (b === GLOBSTAR) {
        nonGsPartsSums.push(nonGsParts);
        currentBody = [[], 0];
        bodySegments.push(currentBody);
      } else {
        currentBody[0].push(b);
        nonGsParts++;
      }
    }
    let i = bodySegments.length - 1;
    const fileLength = file.length - fileTailMatch;
    for (const b of bodySegments) {
      b[1] = fileLength - (nonGsPartsSums[i--] + b[0].length);
    }
    return !!this.#matchGlobStarBodySections(file, bodySegments, fileIndex, 0, partial, 0, !!fileTailMatch);
  }
  // return false for "nope, not matching"
  // return null for "not matching, cannot keep trying"
  #matchGlobStarBodySections(file, bodySegments, fileIndex, bodyIndex, partial, globStarDepth, sawTail) {
    const bs = bodySegments[bodyIndex];
    if (!bs) {
      for (let i = fileIndex; i < file.length; i++) {
        sawTail = true;
        const f = file[i];
        if (f === "." || f === ".." || !this.options.dot && f.startsWith(".")) {
          return false;
        }
      }
      return sawTail;
    }
    const [body, after] = bs;
    while (fileIndex <= after) {
      const m = this.#matchOne(file.slice(0, fileIndex + body.length), body, partial, fileIndex, 0);
      if (m && globStarDepth < this.maxGlobstarRecursion) {
        const sub = this.#matchGlobStarBodySections(file, bodySegments, fileIndex + body.length, bodyIndex + 1, partial, globStarDepth + 1, sawTail);
        if (sub !== false) {
          return sub;
        }
      }
      const f = file[fileIndex];
      if (f === "." || f === ".." || !this.options.dot && f.startsWith(".")) {
        return false;
      }
      fileIndex++;
    }
    return partial || null;
  }
  #matchOne(file, pattern, partial, fileIndex, patternIndex) {
    let fi;
    let pi;
    let pl;
    let fl;
    for (fi = fileIndex, pi = patternIndex, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
      this.debug("matchOne loop");
      let p = pattern[pi];
      let f = file[fi];
      this.debug(pattern, p, f);
      if (p === false || p === GLOBSTAR) {
        return false;
      }
      let hit;
      if (typeof p === "string") {
        hit = f === p;
        this.debug("string match", p, f, hit);
      } else {
        hit = p.test(f);
        this.debug("pattern match", p, f, hit);
      }
      if (!hit)
        return false;
    }
    if (fi === fl && pi === pl) {
      return true;
    } else if (fi === fl) {
      return partial;
    } else if (pi === pl) {
      return fi === fl - 1 && file[fi] === "";
    } else {
      throw new Error("wtf?");
    }
  }
  braceExpand() {
    return braceExpand(this.pattern, this.options);
  }
  parse(pattern) {
    assertValidPattern(pattern);
    const options = this.options;
    if (pattern === "**")
      return GLOBSTAR;
    if (pattern === "")
      return "";
    let m;
    let fastTest = null;
    if (m = pattern.match(starRE)) {
      fastTest = options.dot ? starTestDot : starTest;
    } else if (m = pattern.match(starDotExtRE)) {
      fastTest = (options.nocase ? options.dot ? starDotExtTestNocaseDot : starDotExtTestNocase : options.dot ? starDotExtTestDot : starDotExtTest)(m[1]);
    } else if (m = pattern.match(qmarksRE)) {
      fastTest = (options.nocase ? options.dot ? qmarksTestNocaseDot : qmarksTestNocase : options.dot ? qmarksTestDot : qmarksTest)(m);
    } else if (m = pattern.match(starDotStarRE)) {
      fastTest = options.dot ? starDotStarTestDot : starDotStarTest;
    } else if (m = pattern.match(dotStarRE)) {
      fastTest = dotStarTest;
    }
    const re = AST.fromGlob(pattern, this.options).toMMPattern();
    if (fastTest && typeof re === "object") {
      Reflect.defineProperty(re, "test", { value: fastTest });
    }
    return re;
  }
  makeRe() {
    if (this.regexp || this.regexp === false)
      return this.regexp;
    const set = this.set;
    if (!set.length) {
      this.regexp = false;
      return this.regexp;
    }
    const options = this.options;
    const twoStar = options.noglobstar ? star2 : options.dot ? twoStarDot : twoStarNoDot;
    const flags = new Set(options.nocase ? ["i"] : []);
    let re = set.map((pattern) => {
      const pp = pattern.map((p) => {
        if (p instanceof RegExp) {
          for (const f of p.flags.split(""))
            flags.add(f);
        }
        return typeof p === "string" ? regExpEscape2(p) : p === GLOBSTAR ? GLOBSTAR : p._src;
      });
      pp.forEach((p, i) => {
        const next = pp[i + 1];
        const prev = pp[i - 1];
        if (p !== GLOBSTAR || prev === GLOBSTAR) {
          return;
        }
        if (prev === void 0) {
          if (next !== void 0 && next !== GLOBSTAR) {
            pp[i + 1] = "(?:\\/|" + twoStar + "\\/)?" + next;
          } else {
            pp[i] = twoStar;
          }
        } else if (next === void 0) {
          pp[i - 1] = prev + "(?:\\/|\\/" + twoStar + ")?";
        } else if (next !== GLOBSTAR) {
          pp[i - 1] = prev + "(?:\\/|\\/" + twoStar + "\\/)" + next;
          pp[i + 1] = GLOBSTAR;
        }
      });
      const filtered = pp.filter((p) => p !== GLOBSTAR);
      if (this.partial && filtered.length >= 1) {
        const prefixes = [];
        for (let i = 1; i <= filtered.length; i++) {
          prefixes.push(filtered.slice(0, i).join("/"));
        }
        return "(?:" + prefixes.join("|") + ")";
      }
      return filtered.join("/");
    }).join("|");
    const [open, close] = set.length > 1 ? ["(?:", ")"] : ["", ""];
    re = "^" + open + re + close + "$";
    if (this.partial) {
      re = "^(?:\\/|" + open + re.slice(1, -1) + close + ")$";
    }
    if (this.negate)
      re = "^(?!" + re + ").+$";
    try {
      this.regexp = new RegExp(re, [...flags].join(""));
    } catch (ex) {
      this.regexp = false;
    }
    return this.regexp;
  }
  slashSplit(p) {
    if (this.preserveMultipleSlashes) {
      return p.split("/");
    } else if (this.isWindows && /^\/\/[^\/]+/.test(p)) {
      return ["", ...p.split(/\/+/)];
    } else {
      return p.split(/\/+/);
    }
  }
  match(f, partial = this.partial) {
    this.debug("match", f, this.pattern);
    if (this.comment) {
      return false;
    }
    if (this.empty) {
      return f === "";
    }
    if (f === "/" && partial) {
      return true;
    }
    const options = this.options;
    if (this.isWindows) {
      f = f.split("\\").join("/");
    }
    const ff = this.slashSplit(f);
    this.debug(this.pattern, "split", ff);
    const set = this.set;
    this.debug(this.pattern, "set", set);
    let filename = ff[ff.length - 1];
    if (!filename) {
      for (let i = ff.length - 2; !filename && i >= 0; i--) {
        filename = ff[i];
      }
    }
    for (let i = 0; i < set.length; i++) {
      const pattern = set[i];
      let file = ff;
      if (options.matchBase && pattern.length === 1) {
        file = [filename];
      }
      const hit = this.matchOne(file, pattern, partial);
      if (hit) {
        if (options.flipNegate) {
          return true;
        }
        return !this.negate;
      }
    }
    if (options.flipNegate) {
      return false;
    }
    return this.negate;
  }
  static defaults(def) {
    return minimatch.defaults(def).Minimatch;
  }
};
minimatch.AST = AST;
minimatch.Minimatch = Minimatch;
minimatch.escape = escape;
minimatch.unescape = unescape;

// src/bin/spawn-transcript-watcher.ts
import { spawn, spawnSync } from "node:child_process";
function spawnTranscriptWatcher(pid, sessionId, transcriptPath, cardId, cardRepoPath, logger) {
  const readiness = spawnSync("sh", ["-c", "command -v transcript-watcher"], { stdio: "ignore" });
  if (readiness.error || readiness.status !== 0) {
    logger.error("transcript-watcher not resolvable on PATH \u2014 skipping spawn", {
      status: readiness.status ?? void 0,
      error: readiness.error instanceof Error ? readiness.error.message : void 0,
      pid,
      sessionId
    });
    return;
  }
  const spawnArgs = [String(pid), sessionId, transcriptPath, cardId, cardRepoPath];
  const child = spawn("transcript-watcher", spawnArgs, {
    detached: true,
    stdio: "ignore",
    env: { ...process.env }
  });
  child.on("error", (err) => {
    logger.error("transcript-watcher spawn failed", {
      error: err instanceof Error ? err.message : String(err),
      spawnArgs: spawnArgs.join(" ")
    });
  });
  child.unref();
}

// src/bin/card.ts
var SHA_PATTERN2 = /^[0-9a-f]{40}$/i;
var HELP = `Usage: card [options] <command>

Read, create, list, search, attach, and detach card sessions via the Cards API.
Locates the server through ~/.cards/cards-api.json, executes the command,
and prints the resulting Card JSON to stdout.

Options:
  -h, --help              Show this help text
  --jsonpath <expr>       Filter JSON output with a JSONPath expression.
                          Single primitive results are printed raw (no quotes);
                          object/array results and multi-match results are
                          printed as JSON. Supported on get, create, list,
                          search, and action subcommands.
                          Example: --jsonpath '$.repositoryPath'

Commands:
  <card-id>                      Fetch a card by its identifier
  create                         Create a card from JSON on stdin
  list [options]                 List cards with optional filters
  search [query] [options]       Search cards using #tag @relation text syntax
  attach <card-id>               Associate this Claude session with a card
  detach                         Disassociate this Claude session from its card
  <card-id> action <action-id>  Execute an action on a card
  <card-id> watch [glob...]     Wait for next unattributed commit

Get:
  Pass a card identifier as the sole argument. The full Card object is
  returned, including repositoryPath for filesystem access.

  Examples:
    card feat-42
    card main-0001

Create:
  Pipe a JSON object to stdin. Required fields: title (non-empty string).
  Optional fields: tags (string[]), environment (string),
  gates ({ planRequired?: boolean, mergeRequestRequired?: boolean }),
  relations ({ type: "related", cardId: string }[]).

  The response contains only server-generated fields not present in the
  input (e.g. id, status, timestamps), plus repositoryPath. Fields the
  caller already provided are omitted.

  Examples:
    card create <<'EOF'
    { "title": "Fix auth", "tags": ["bug"] }
    EOF

List:
  Lists cards for the current workspace. Detects workspacePath from git
  automatically, or pass --workspace-path explicitly.

  Options:
    --workspace-path <path>  Workspace root (default: git rev-parse --show-toplevel)
    --status <status>        Filter by status (todo, active, needs_review, done, archived)
    --limit <n>              Maximum number of results
    --offset <n>             Pagination offset

  Examples:
    card list
    card list --status active
    card list --limit 10

Search:
  Searches cards using a unified query syntax. Supports free text, #tag filters,
  and @relation filters. Derived tags (planning, merge-requested, merged, unmerged)
  are computed client-side.

  Options:
    --workspace-path <path>  Workspace root (default: git rev-parse --show-toplevel)
    --status <status>        Filter by status
    --limit <n>              Maximum number of results
    --offset <n>             Pagination offset

  Examples:
    card search "login bug"
    card search "#auth @main-5 login" --status active
    card search "#planning" --limit 20
    card search "@main-42"

Attach:
  Associates the current agent process with a card in the session registry.
  Optionally registers the workspace branch and flushes any pending commits.

  Examples:
    card attach main-0001

Detach:
  Removes the current agent process from the session registry.

  Examples:
    card detach

Action:
  Executes an action on a card via the server relay. The action ID is
  the lowercase identifier from the action definition (e.g., "launch").

  Examples:
    card <card-id> action launch

Watch:
  Waits for the next unattributed commit on a card's repository. If
  unattributed commits already exist they are output immediately. Otherwise
  the command subscribes to WebSocket events and blocks until a qualifying
  commit arrives. Requires an active card session (run 'card attach' first).

  Optional glob patterns restrict output to commits that touch at least one
  matching file. Multiple globs are OR-combined.

  The commit is attributed to the current session and printed to stdout,
  then the command exits 0. Exits non-zero on connection failure or when
  the session precondition is not met.

  Examples:
    card <card-id> watch
    card <card-id> watch "src/auth/**"
    card <card-id> watch "src/**" "tests/**"

Exit codes:
  0  Success
  1  Error (missing arguments, invalid input, discovery failure, API error)
  130  Interrupted (SIGINT)
  143  Terminated (SIGTERM)`;
async function connectClient(workspacePath) {
  const resolved = workspacePath ?? getGitRoot() ?? void 0;
  if (!resolved) {
    throw new Error("could not detect workspace path \u2014 pass --workspace-path or run from inside a git repository");
  }
  const info = await discoverApiInfo();
  if (!info) {
    throw new Error("API discovery failed \u2014 is the cards server running?");
  }
  return new CardsClient({
    baseUrl: `http://${info.host}:${info.port}`,
    accessToken: info.accessToken,
    workspacePath: resolved
  });
}
function applyJsonPath(value, expression) {
  const results = JSONPath({ path: expression, json: value, wrap: true });
  if (results.length === 1) {
    const only = results[0];
    if (typeof only === "string") return only;
    if (typeof only === "number" || typeof only === "boolean" || only === null) return String(only);
    return JSON.stringify(only, null, 2);
  }
  return JSON.stringify(results, null, 2);
}
function formatOutput(value, jsonPath) {
  if (jsonPath) return applyJsonPath(value, jsonPath);
  return JSON.stringify(value, null, 2);
}
async function getCard(cardId, jsonPath) {
  const client = await connectClient();
  const card = await client.getCard(cardId);
  console.log(formatOutput(card, jsonPath));
}
function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
  });
}
function parseCardCreateInput(raw) {
  if (!raw.trim()) {
    throw new Error("expected JSON on stdin");
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("invalid JSON on stdin");
  }
  if (typeof parsed["title"] !== "string" || !parsed["title"].trim()) {
    throw new Error('missing required field "title"');
  }
  const validFields = /* @__PURE__ */ new Set(["title", "tags", "environment", "gates", "relations"]);
  const unknownFields = Object.keys(parsed).filter((k) => !validFields.has(k));
  if (unknownFields.length > 0) {
    const listed = unknownFields.map((f) => `"${f}"`).join(", ");
    throw new Error(`unknown fields: ${listed}. valid fields: ${[...validFields].join(", ")}`);
  }
  const inputKeys = new Set(Object.keys(parsed));
  const data = {
    title: parsed["title"]
  };
  if (Array.isArray(parsed["tags"])) {
    data.tags = parsed["tags"];
  }
  if (typeof parsed["environment"] === "string") {
    data.environment = parsed["environment"];
  }
  if (parsed["gates"] != null && typeof parsed["gates"] === "object") {
    const g = parsed["gates"];
    data.gates = {
      ...typeof g["planRequired"] === "boolean" ? { planRequired: g["planRequired"] } : {},
      ...typeof g["mergeRequestRequired"] === "boolean" ? { mergeRequestRequired: g["mergeRequestRequired"] } : {}
    };
  }
  if (Array.isArray(parsed["relations"])) {
    data.relations = parsed["relations"];
  }
  return { data, inputKeys };
}
var CREATE_ALWAYS_INCLUDE = /* @__PURE__ */ new Set(["id", "repositoryPath"]);
async function createCard(args) {
  const flags = parseFlags(args);
  const raw = await readStdin();
  const { data, inputKeys } = parseCardCreateInput(raw);
  const client = await connectClient(flags["workspace-path"]?.[0]);
  const card = await client.createCard(data);
  const full = card;
  const filtered = {};
  for (const [key, value] of Object.entries(full)) {
    if (CREATE_ALWAYS_INCLUDE.has(key) || !inputKeys.has(key)) {
      filtered[key] = value;
    }
  }
  console.log(formatOutput(filtered, flags["jsonpath"]?.[0]));
}
function getGitRoot() {
  const result = spawnSync2("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf-8",
    timeout: 3e3
  });
  if (result.error || result.status !== 0) return null;
  return result.stdout.trim() || null;
}
function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) break;
    const key = arg.slice(2);
    const value = args[++i];
    if (value === void 0) {
      throw new Error(`flag ${arg} requires a value`);
    }
    const existing = flags[key];
    if (existing) {
      existing.push(value);
    } else {
      flags[key] = [value];
    }
  }
  return flags;
}
async function listCards(args) {
  const flags = parseFlags(args);
  const client = await connectClient(flags["workspace-path"]?.[0]);
  const options = {};
  if (flags["status"]) {
    options.status = flags["status"][0];
  }
  if (flags["limit"]) {
    const n = parseInt(flags["limit"][0], 10);
    if (Number.isNaN(n) || n <= 0) throw new Error("--limit must be a positive integer");
    options.limit = n;
  }
  if (flags["offset"]) {
    const n = parseInt(flags["offset"][0], 10);
    if (Number.isNaN(n) || n < 0) throw new Error("--offset must be a non-negative integer");
    options.offset = n;
  }
  const cards = await client.listCards(options);
  console.log(formatOutput(cards, flags["jsonpath"]?.[0]));
}
async function searchCards(args) {
  let query = "";
  let flagArgs = args;
  if (args.length > 0 && !args[0].startsWith("--")) {
    query = args[0];
    flagArgs = args.slice(1);
  }
  const flags = parseFlags(flagArgs);
  const client = await connectClient(flags["workspace-path"]?.[0]);
  const { text, tags, relatedTo } = parseSearchQuery(query);
  const derivedTagSet = new Set(DERIVED_TAGS);
  const storedTags = tags.filter((t) => !derivedTagSet.has(t));
  const derivedTags = tags.filter((t) => derivedTagSet.has(t));
  const options = {};
  if (text.length >= 3) {
    options.search = text;
  }
  if (storedTags.length > 0) {
    options.tags = storedTags;
  }
  if (flags["status"]) {
    options.status = flags["status"][0];
  }
  if (flags["limit"]) {
    const n = parseInt(flags["limit"][0], 10);
    if (Number.isNaN(n) || n <= 0) throw new Error("--limit must be a positive integer");
    options.limit = n;
  }
  if (flags["offset"]) {
    const n = parseInt(flags["offset"][0], 10);
    if (Number.isNaN(n) || n < 0) throw new Error("--offset must be a non-negative integer");
    options.offset = n;
  }
  const raw = await client.listCards(options);
  const summaries = toCardListSummaries(raw);
  const results = filterCardsByTags(summaries, derivedTags, relatedTo);
  console.log(formatOutput(results, flags["jsonpath"]?.[0]));
}
function getWorktreeForBranch(branchName) {
  const result = spawnSync2("git", ["worktree", "list", "--porcelain"], {
    encoding: "utf-8",
    timeout: 3e3
  });
  if (result.error || result.status !== 0) return null;
  const branchRef = `branch refs/heads/${branchName}`;
  let currentWorktree = null;
  for (const line of result.stdout.split("\n")) {
    if (line.startsWith("worktree ")) {
      currentWorktree = line.slice("worktree ".length);
    } else if (line === branchRef && currentWorktree !== null) {
      return currentWorktree;
    }
  }
  return null;
}
function getCurrentBranch() {
  const result = spawnSync2("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf-8",
    timeout: 3e3
  });
  if (result.error || result.status !== 0) return null;
  const branch = result.stdout.trim();
  return branch && branch !== "HEAD" ? branch : null;
}
function isAncestorOfHead(sha) {
  if (!SHA_PATTERN2.test(sha)) return false;
  const result = spawnSync2("git", ["merge-base", "--is-ancestor", sha, "HEAD"], {
    stdio: "ignore",
    timeout: 3e3
  });
  return !result.error && result.status === 0;
}
function resolveAttachGitContext() {
  const gitRoot = getGitRoot();
  const branch = getCurrentBranch();
  const worktreePath = branch ? getWorktreeForBranch(branch) : null;
  return { gitRoot, branch, worktreePath };
}
async function attachCard(cardId) {
  const gitContext = resolveAttachGitContext();
  if (!gitContext.gitRoot) {
    throw new Error("card attach: cwd is not inside a git working tree");
  }
  const sessionId = process.env["CARDS_SESSION_ID"];
  if (!sessionId) {
    throw new Error("card attach: CARDS_SESSION_ID is not set \u2014 run inside a Cards session");
  }
  const transcriptPath = process.env["CARDS_TRANSCRIPT_PATH"];
  if (!transcriptPath) {
    throw new Error("card attach: CARDS_TRANSCRIPT_PATH is not set \u2014 run inside a Cards session");
  }
  const pid = findAgentPid();
  if (!pid) {
    throw new Error("could not find agent ancestor PID");
  }
  const workspacePath = realpathSync(gitContext.gitRoot);
  const client = await connectClient();
  const card = await client.getCard(cardId);
  const cardRepoPath = card.repositoryPath;
  const attachApiInfo = await discoverApiInfo();
  if (attachApiInfo) {
    const { host, port, accessToken } = attachApiInfo;
    const watcherUrl = `http://${host}:${port}/internal/watchers/${encodeURIComponent(sessionId)}`;
    let watcherRes;
    try {
      watcherRes = await fetch(watcherUrl, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        signal: AbortSignal.timeout(4e3)
      });
    } catch (error) {
      console.error(
        `card attach: watcher collision check skipped (${error instanceof Error ? error.message : String(error)})`
      );
    }
    if (watcherRes?.ok) {
      throw new Error(
        `card attach: session ${sessionId} already has an active watcher (started via launch?); launch+attach is not supported`
      );
    }
  }
  await associatePidWithCard(pid, cardId, { mode: "attach", workspacePath });
  console.error(`card attach: PID ${pid} associated with card ${cardId} (workspacePath=${workspacePath})`);
  let watcherSpawned = false;
  try {
    spawnTranscriptWatcher(pid, sessionId, transcriptPath, cardId, cardRepoPath, {
      error: (msg, data) => console.error(`card attach: ${msg}`, data),
      warn: (msg, data) => console.error(`card attach: warn: ${msg}`, data)
    });
    watcherSpawned = true;
    console.error(`card attach: transcript watcher spawned`);
  } catch (error) {
    console.error(
      `card attach: transcript watcher spawn failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  return { pid, cardId, workspacePath, watcherSpawned };
}
function buildCardCommit(sha, repositoryPath) {
  const metaOutput = execFileSync3(
    "git",
    ["log", "--no-walk", "--format=%H%x00%an%x00%ae%x00%s%x00%b%x00%aI%x00%D", sha],
    { cwd: repositoryPath, encoding: "utf-8", timeout: 1e4 }
  );
  const nulIdx = metaOutput.indexOf("\0");
  if (nulIdx === -1) {
    throw new Error(`Unexpected git log output for ${sha}`);
  }
  const parts = metaOutput.split("\0");
  const hash = (parts[0] ?? "").trim();
  const author_name = parts[1] ?? "";
  const author_email = parts[2] ?? "";
  const message = parts[3] ?? "";
  const body = parts[4] ?? "";
  const date = (parts[5] ?? "").trim();
  const refs = (parts[6] ?? "").trim();
  const diffOutput = execFileSync3("git", ["diff-tree", "--no-commit-id", "-r", "--name-status", "-M", sha], {
    cwd: repositoryPath,
    encoding: "utf-8",
    timeout: 1e4
  });
  const files = [];
  for (const line of diffOutput.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const tabParts = trimmed.split("	");
    const status = tabParts[0] ?? "";
    if (status.startsWith("R") && tabParts.length >= 3) {
      files.push({ file: tabParts[2], status, from: tabParts[1], binary: false });
    } else if (tabParts[1]) {
      files.push({ file: tabParts[1], status, binary: false });
    }
  }
  return { hash, date, message, refs, body, author_name, author_email, diff: { changed: files.length, files } };
}
function matchesGlobs(files, globs) {
  if (globs.length === 0) return true;
  return files.some((f) => globs.some((g) => minimatch(f, g)));
}
function getCommitFiles(sha, repositoryPath) {
  const output = execFileSync3("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", sha], {
    cwd: repositoryPath,
    encoding: "utf-8",
    timeout: 1e4
  });
  return output.split("\n").map((l) => l.trim()).filter(Boolean);
}
async function watchCard(cardId, globs) {
  const client = await connectClient();
  const card = await client.getCard(cardId);
  const repositoryPath = card.repositoryPath;
  const pid = findAgentPid();
  let sessionId = null;
  if (!pid) {
    console.error("card watch: warning: Could not find agent ancestor PID. Watching for any commit.");
  } else {
    sessionId = await getSessionIdForPid(pid);
    if (!sessionId) {
      console.error(`card watch: warning: No active card session for PID ${pid}. Watching for any commit.`);
    }
  }
  if (sessionId) {
    const headSha = readSessionHeadSha(sessionId);
    if (headSha) {
      const allCommits = getCommitsSince(repositoryPath, headSha);
      const sessionCommits = getSessionCommits(sessionId);
      const unattributed = getUnattributedCommits(allCommits, sessionCommits);
      const qualifying = globs.length > 0 ? unattributed.filter((sha) => matchesGlobs(getCommitFiles(sha, repositoryPath), globs)) : unattributed;
      if (qualifying.length > 0) {
        for (const sha of qualifying) {
          const commit = buildCardCommit(sha, repositoryPath);
          await appendCommitToSession(sessionId, sha);
          console.log(formatCommit(commit));
        }
        return;
      }
    }
  }
  const apiInfo = await discoverApiInfo();
  if (!apiInfo) {
    throw new Error("API discovery failed \u2014 is the cards server running?");
  }
  const wsUrl = `ws://${apiInfo.host}:${apiInfo.port}/events`;
  const accessToken = apiInfo.accessToken;
  const discover = async () => {
    const info = await discoverApiInfo();
    if (!info) return { error: "cards-api.json not found or invalid" };
    return { wsUrl: `ws://${info.host}:${info.port}/events`, accessToken: info.accessToken };
  };
  const subscriber = new EventSubscriber({ wsUrl, accessToken, discover, maxReconnectAttempts: 10 });
  let disconnectedAt = null;
  let exhaustionTimer = null;
  const unsubConnectionChange = subscriber.onConnectionChange((connected) => {
    if (connected) {
      disconnectedAt = null;
      if (exhaustionTimer) {
        clearTimeout(exhaustionTimer);
        exhaustionTimer = null;
      }
    } else {
      if (exhaustionTimer) {
        clearTimeout(exhaustionTimer);
        exhaustionTimer = null;
      }
      disconnectedAt = Date.now();
      const maxBackoffMs = calculateBackoffMs(10);
      exhaustionTimer = setTimeout(() => {
        exhaustionTimer = null;
        if (disconnectedAt !== null) {
          subscriber.disconnect();
          console.error("Lost connection to Cards server after maximum reconnection attempts.");
          process.exit(1);
        }
      }, maxBackoffMs + 1e3);
    }
  });
  process.on("SIGINT", () => {
    unsubConnectionChange();
    subscriber.disconnect();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    unsubConnectionChange();
    subscriber.disconnect();
    process.exit(143);
  });
  const onCommit = async (event) => {
    if (event.cardId !== cardId) return;
    if (isBookkeepingCommit(event.commit)) return;
    if (sessionId) {
      const currentSessionCommits = getSessionCommits(sessionId);
      if (currentSessionCommits.includes(event.commit.hash)) return;
    }
    if (globs.length > 0) {
      const files = event.commit.diff.files.map((f) => f.file);
      if (!matchesGlobs(files, globs)) return;
    }
    if (sessionId) {
      try {
        await appendCommitToSession(sessionId, event.commit.hash);
      } catch (error) {
        console.error(
          `card watch: failed to record commit ${event.commit.hash}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    console.log(formatCommit(event.commit));
    unsubConnectionChange();
    subscriber.disconnect();
    process.exit(0);
  };
  subscriber.on("card:commit", (event) => {
    onCommit(event).catch((err) => {
      console.error("card watch: error handling commit event:", err instanceof Error ? err.message : String(err));
      subscriber.disconnect();
      process.exit(1);
    });
  });
  await subscriber.connect();
}
async function executeAction(cardId, actionName, jsonPath) {
  const client = await connectClient();
  const result = await client.executeAction(cardId, actionName);
  console.log(formatOutput(result, jsonPath));
}
async function detachCard() {
  const pid = findAgentPid();
  if (!pid) {
    throw new Error("could not find agent ancestor PID");
  }
  const entry = await removePidEntry(pid);
  if (entry) {
    console.error(`card detach: PID ${pid} disassociated from card ${entry.cardId ?? "(none)"}`);
  } else {
    console.error(`card detach: PID ${pid} had no active association`);
  }
  if (entry?.cardId) {
    const apiInfo = await discoverApiInfo();
    if (!apiInfo) {
      console.error(
        `card detach: watcher teardown skipped (extension API not reachable; sidecar will remain isActive until PID exit)`
      );
    } else {
      const { host, port, accessToken } = apiInfo;
      try {
        const res = await fetch(`http://${host}:${port}/internal/cards/${entry.cardId}/watchers`, {
          method: "DELETE",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          signal: AbortSignal.timeout(4e3)
        });
        if (res.ok) {
          const body = await res.json();
          if (body.timedOut.length > 0) {
            console.error(
              `card detach: watcher teardown TIMED OUT for ids=${JSON.stringify(body.timedOut)}; stopped=${JSON.stringify(body.stopped)}`
            );
          } else {
            console.error(
              `card detach: watcher teardown stopped=${JSON.stringify(body.stopped)} timedOut=${JSON.stringify(body.timedOut)}`
            );
          }
        } else {
          const text = await res.text().catch(() => "");
          console.error(`card detach: watcher teardown returned status ${res.status} (${text})`);
        }
      } catch (error) {
        console.error(
          `card detach: watcher teardown skipped (${error instanceof Error ? error.message : String(error)})`
        );
      }
    }
  }
  return { pid };
}
if (process.argv[1]?.match(/card\.(mjs|ts)$/)) {
  const command = process.argv[2];
  if (!command || command === "-h" || command === "--help" || command === "help") {
    console.log(HELP);
    process.exit(command ? 0 : 1);
  }
  const subArgs = process.argv.slice(3);
  if (subArgs.includes("--help") || subArgs.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }
  let run;
  switch (command) {
    case "create":
      run = createCard(process.argv.slice(3));
      break;
    case "list":
      run = listCards(process.argv.slice(3));
      break;
    case "search":
      run = searchCards(process.argv.slice(3));
      break;
    case "attach": {
      const cardId = process.argv[3];
      if (!cardId) {
        console.error("card attach: missing card ID argument");
        process.exit(1);
      }
      run = attachCard(cardId).then((result) => {
        console.log(JSON.stringify({ success: true, ...result }));
      });
      break;
    }
    case "detach":
      run = detachCard().then((result) => {
        console.log(JSON.stringify({ success: true, ...result }));
      });
      break;
    default: {
      const verb = process.argv[3];
      if (verb === "action") {
        const actionId = process.argv[4];
        if (!actionId) {
          console.error("card action: missing action ID argument");
          process.exit(1);
        }
        const actionFlags = parseFlags(process.argv.slice(5));
        run = executeAction(command, actionId, actionFlags["jsonpath"]?.[0]);
      } else if (verb === "watch") {
        const watchGlobs = process.argv.slice(4);
        run = watchCard(command, watchGlobs);
      } else if (verb?.startsWith("--")) {
        const getFlags = parseFlags(process.argv.slice(3));
        run = getCard(command, getFlags["jsonpath"]?.[0]);
      } else if (verb) {
        console.error(`card: unknown verb "${verb}"`);
        process.exit(1);
      } else {
        run = getCard(command);
      }
      break;
    }
  }
  run.catch((error) => {
    console.error("card:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
export {
  applyJsonPath,
  attachCard,
  connectClient,
  createCard,
  detachCard,
  executeAction,
  formatOutput,
  getCard,
  getCurrentBranch,
  getWorktreeForBranch,
  isAncestorOfHead,
  listCards,
  parseCardCreateInput,
  searchCards,
  watchCard
};
