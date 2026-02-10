/**
 * WebSocket factory interface for dependency injection.
 *
 * @module types/websocket
 */

/**
 * WebSocket factory interface for dependency injection.
 *
 * Enables testing without mocking the global `WebSocket` constructor.
 */
export interface WebSocketFactory {
  create(url: string, protocols?: string | string[]): WebSocket;
}
