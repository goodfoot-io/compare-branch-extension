/**
 * Wrapper socket command protocol for Cards V2 execution control.
 *
 * These payloads are exchanged over a Unix domain socket with a wrapper process
 * that manages Claude Code sessions. The wrapper handles process lifecycle,
 * terminal allocation, and graceful shutdown signals.
 *
 * The protocol uses JSON-encoded messages with a `type` discriminator field.
 * Commands flow from the extension to the wrapper; responses flow back.
 *
 *
 * @summary Wrapper socket command protocol for Cards V2 execution control
 * @example
 * ```typescript
 * // Extension sending a cancel request
 * const command: CancelCommand = { type: 'cancel' };
 * socket.write(JSON.stringify(command) + '\n');
 *
 * // Wrapper responding with acknowledgment
 * const response: CancelAcknowledgment = {
 *   type: 'cancel_ack',
 *   status: 'terminating'
 * };
 * ```
 *
 * @module types/wrapper-commands
 */

/**
 * Command to switch execution from background to interactive mode.
 *
 * When a background action needs user interaction (e.g., for approval or
 * input), this command requests the wrapper to allocate a terminal and
 * bring the session to the foreground.
 *
 * @example
 * ```typescript
 * const command: SwitchToInteractiveCommand = { type: 'switchToInteractive' };
 * ```
 */
export interface SwitchToInteractiveCommand {
  /**
   * Message type discriminator.
   * Used for union narrowing when parsing incoming messages.
   */
  type: 'switchToInteractive';
}

/**
 * Command requesting cancellation or termination of the running process.
 *
 * The wrapper will attempt graceful shutdown first (SIGTERM), then force
 * kill (SIGKILL) if the process does not exit within a grace period.
 *
 * @example
 * ```typescript
 * const command: CancelCommand = { type: 'cancel' };
 * ```
 */
export interface CancelCommand {
  /**
   * Message type discriminator.
   * Used for union narrowing when parsing incoming messages.
   */
  type: 'cancel';
}

/**
 * Union of all wrapper socket commands.
 *
 * Use the `type` field to narrow the union:
 *
 * @example
 * ```typescript
 * function handleCommand(cmd: WrapperCommand) {
 *   switch (cmd.type) {
 *     case 'switchToInteractive':
 *       allocateTerminal();
 *       break;
 *     case 'cancel':
 *       terminateProcess();
 *       break;
 *   }
 * }
 * ```
 */
export type WrapperCommand = SwitchToInteractiveCommand | CancelCommand;

/**
 * Response acknowledging a cancel request.
 *
 * Reports the current state of the cancellation attempt. The wrapper
 * sends this immediately upon receiving the cancel command.
 *
 * @example
 * ```typescript
 * const ack: CancelAcknowledgment = {
 *   type: 'cancel_ack',
 *   status: 'terminating'  // Process is shutting down
 * };
 * ```
 */
export interface CancelAcknowledgment {
  /**
   * Message type discriminator.
   * Used for union narrowing when parsing incoming messages.
   */
  type: 'cancel_ack';

  /**
   * Cancellation status reported by the wrapper.
   *
   * - `'terminating'`: Process received SIGTERM and is shutting down
   * - `'already_terminated'`: Process had already exited before cancel
   * - `'no_hook_running'`: No action was running to cancel
   */
  status: 'terminating' | 'already_terminated' | 'no_hook_running';
}

/**
 * Generic error response from the wrapper.
 *
 * Sent when the wrapper encounters an error processing a command.
 * The extension should log the error and may display it to the user.
 *
 * @example
 * ```typescript
 * const error: WrapperErrorResponse = {
 *   type: 'error',
 *   message: 'Failed to allocate PTY: permission denied',
 *   code: 'PTY_ALLOC_FAILED'
 * };
 * ```
 */
export interface WrapperErrorResponse {
  /**
   * Message type discriminator.
   * Used for union narrowing when parsing incoming messages.
   */
  type: 'error';

  /**
   * Human-readable error message.
   * Suitable for logging or display to developers.
   */
  message: string;

  /**
   * Optional error code for programmatic handling.
   * Allows extensions to detect specific error conditions and
   * implement recovery strategies.
   */
  code?: string;
}

/**
 * Union of all wrapper responses.
 *
 * Use the `type` field to narrow the union:
 *
 * @example
 * ```typescript
 * function handleResponse(resp: WrapperResponse) {
 *   switch (resp.type) {
 *     case 'cancel_ack':
 *       console.log(`Cancel status: ${resp.status}`);
 *       break;
 *     case 'error':
 *       console.error(`Wrapper error: ${resp.message}`);
 *       break;
 *   }
 * }
 * ```
 */
export type WrapperResponse = CancelAcknowledgment | WrapperErrorResponse;
