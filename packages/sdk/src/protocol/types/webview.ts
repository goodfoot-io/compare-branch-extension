/**
 * Webview messaging contracts for the VS Code extension UI.
 *
 * These types define the bidirectional protocol between the extension host and
 * the embedded webview. Messages are discriminated by a `type` field so the UI
 * can handle them safely and evolve without breaking older clients.
 *
 *
 * @summary Webview messaging contracts for the VS Code extension UI
 * @module types/webview
 */

import type { Card } from './card.js';

// --- Timeline Entry ---

/**
 * Timeline entry shape used by the webview.
 *
 * This is a simplified, UI-focused payload rather than the full timeline types
 * used elsewhere.
 */
export interface WebviewTimelineEntry {
  /** Entry type discriminator used for rendering. */
  type: string;
  /** Entry identifier for list diffing. */
  id: string;
  /** Creation timestamp in ISO 8601 format. */
  createdAt: string;
  /** Entry-specific content payload. */
  content: unknown;
}

// --- Connection Messages ---

/**
 * Initial handshake sent by the webview after it loads.
 */
export interface WebviewDidConnectMessage {
  /** Message type discriminator. */
  type: 'webview:didConnect';
  /** Protocol version for compatibility checks. */
  protocolVersion: string;
}

// --- API Proxy Messages ---

/**
 * API proxy request from the webview to the extension.
 */
export interface ApiRequestMessage {
  /** Message type discriminator. */
  type: 'api:request';
  /** Correlation ID for matching responses. */
  requestId: string;
  /** HTTP method for the proxy request. */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** API endpoint path (e.g., '/cards/123'). */
  path: string;
  /** Optional request body to forward. */
  body?: unknown;
}

/**
 * API proxy response from the extension to the webview.
 */
export interface ApiResponseMessage {
  /** Message type discriminator. */
  type: 'api:response';
  /** Correlation ID matching the request. */
  requestId: string;
  /** HTTP status code from the server. */
  status: number;
  /** Response payload when the request succeeds. */
  data?: unknown;
  /** Error message when the request fails. */
  error?: string;
}

// --- Navigation Messages ---

/**
 * Navigation request initiated by the webview.
 */
export interface NavigateMessage {
  /** Message type discriminator. */
  type: 'navigate';
  /** Target route path understood by the extension router. */
  route: string;
  /** Optional route parameters to interpolate. */
  params?: Record<string, string>;
}

// --- Action Messages ---

/**
 * Action types that the webview can request from the extension.
 */
export type WebviewAction = 'launchClaude' | 'openExternal' | 'copyToClipboard';

/**
 * Generic action request from the webview.
 */
export interface ActionMessage {
  /** Message type discriminator. */
  type: 'action';
  /** Action to perform. */
  action: WebviewAction;
  /** Action-specific payload interpreted by the extension. */
  payload: Record<string, unknown>;
}

/**
 * Message to launch a Claude agent for a specific card.
 */
export interface LaunchClaudeAction {
  /** Message type discriminator. */
  type: 'action:launchClaude';
  /** Card identifier to open in the agent. */
  cardId: string;
}

// --- State Messages ---

/**
 * State patch pushed from the extension to the webview.
 */
export interface StateUpdateMessage {
  /** Message type discriminator. */
  type: 'state:update';
  /** Partial state to merge into the current webview state. */
  state: Partial<WebviewState>;
}

/**
 * Domain event forwarded from the extension to the webview.
 */
export interface EventMessage {
  /** Message type discriminator. */
  type: 'event';
  /** Event name (e.g., 'cards:metadata'). */
  eventName: string;
  /** Event payload forwarded from the backend. */
  payload: unknown;
}

/**
 * Current webview state shared between extension and UI.
 */
export interface WebviewState {
  /** Currently selected card ID, or null when nothing is selected. */
  currentCardId: string | null;
  /** Current route/view path understood by the router. */
  currentRoute: string;
  /** Whether the webview is connected to the server. */
  isConnected: boolean;
  /** VS Code theme kind: 1 = Light, 2 = Dark, 3 = High Contrast. */
  themeKind: 1 | 2 | 3;
  /** Whether the UI is in a loading state. */
  isLoading: boolean;
}

// --- Extension -> Webview Messages ---

/**
 * Message containing full card details for display.
 */
export interface CardDetailMessage {
  /** Message type discriminator. */
  type: 'card:detail';
  /** Full card data to render. */
  card: Card;
  /** Timeline entries to display alongside the card. */
  timeline: WebviewTimelineEntry[];
}

/**
 * Message indicating a validation error on a form field.
 */
export interface ValidationErrorMessage {
  /** Message type discriminator. */
  type: 'validation:error';
  /** Field name that failed validation. */
  field: string;
  /** Error message to display in the UI. */
  message: string;
}

/**
 * Message indicating a theme change in VS Code.
 */
export interface ThemeUpdateMessage {
  /** Message type discriminator. */
  type: 'theme:update';
  /** VS Code theme kind: 1 = Light, 2 = Dark, 3 = High Contrast. */
  themeKind: 1 | 2 | 3;
}

/**
 * Message indicating the server has changed after recovery.
 */
export interface ServerChangedMessage {
  /** Message type discriminator. */
  type: 'server:changed';
  /** New server base URL (e.g., 'http://localhost:3001'). */
  baseUrl: string;
  /** New WebSocket URL (e.g., 'ws://localhost:3001/events'). */
  wsUrl: string;
  /** New access token for API calls. */
  accessToken: string;
}

// --- Connection Failure Messages ---

/**
 * Message indicating the webview's connection to the server failed.
 */
export interface ConnectionFailedMessage {
  /** Message type discriminator. */
  type: 'connection:failed';
  /** Optional error message for debugging. */
  error?: string;
}

// --- Union Types ---

/**
 * All possible messages sent from the webview to the extension.
 */
export type WebviewToExtensionMessage =
  | WebviewDidConnectMessage
  | ApiRequestMessage
  | NavigateMessage
  | ActionMessage
  | LaunchClaudeAction
  | ConnectionFailedMessage;

/**
 * All possible messages sent from the extension to the webview.
 */
export type ExtensionToWebviewMessage =
  | ApiResponseMessage
  | StateUpdateMessage
  | EventMessage
  | CardDetailMessage
  | ValidationErrorMessage
  | ThemeUpdateMessage
  | ServerChangedMessage;
