/**
 * API discovery payloads published by the Cards V2 server.
 *
 * Clients read the discovery file to locate the server and bootstrap
 * authentication. These values are sensitive and should be treated as secrets
 * when written to disk or logged.
 *
 *
 * @summary API discovery payloads published by the Cards V2 server
 * @module types/api
 */

// --- API Discovery ---

/**
 * Minimal card state captured when a session begins.
 *
 * Used by clients to detect whether a card has changed since the session
 * started without fetching the full card payload.
 */
export interface SessionBaseline {
  /** Card identifier being tracked for freshness. */
  cardId: string;
  /** ISO 8601 timestamp of the card's `updatedAt` at session start. */
  updatedAt: string;
}

/**
 * Schema for the API discovery file written at server startup.
 *
 * Clients read this file to learn how to reach the server and which access
 * token to use. Fields are intentionally explicit to avoid guessing defaults.
 */
export interface CardsApiInfo {
  /** Port number the server is listening on. */
  port: number;
  /** Host address the server is bound to. */
  host: string;
  /** Process ID of the server instance that wrote the file. */
  pid: number;
  /** Access token for authenticating client requests. */
  accessToken: string;
  /** ISO 8601 timestamp of when the server started. */
  startedAt: string;
  /** Optional session baseline snapshot for update detection. */
  sessionBaseline?: SessionBaseline;
}
