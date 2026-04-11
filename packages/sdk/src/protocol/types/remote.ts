/**
 * Remote programmatic API type infrastructure for the Cards extension.
 *
 * Defines the type utility and message unions used to dispatch actions
 * into webviews from external callers (agents, tests, scripts).
 *
 * `DistributedRemote<T>` derives a `remote:`-prefixed variant of any
 * message type by replacing the original `type` field. This is placed
 * in the SDK (rather than the extension) so that both `@cards/web` and
 * the extension package can import from the same source without creating
 * a circular dependency.
 *
 * @summary Remote programmatic API type infrastructure
 * @module protocol/types/remote
 */

/**
 * Derives a `remote:`-prefixed variant of a message type union.
 *
 * Uses `Omit<T, 'type'>` before adding the prefixed type to avoid the
 * `never` result that `T & { type: \`remote:${U}\` }` produces when the
 * two distinct string literals conflict in an intersection.
 *
 * @example
 * ```typescript
 * type ExecuteActionMessage = { type: 'action:executeAction'; actionName: string };
 * type RemoteExecute = DistributedRemote<ExecuteActionMessage>;
 * // => { type: 'remote:action:executeAction'; actionName: string }
 * ```
 */
export type DistributedRemote<T extends { type: string }> = T extends { type: infer U extends string }
  ? Omit<T, 'type'> & { type: `remote:${U}` }
  : never;

/**
 * Manually-defined union of remote messages dispatched to the detail webview.
 *
 * Every member carries `target: 'detail'` for routing (Phase 5b) and
 * `cardId: string` because multiple detail panels can be open simultaneously.
 *
 * The actionable subset mirrors the extension's `DetailWebviewToExtensionMessage`
 * action types. `write:*` messages are excluded (request-response pattern).
 * `action:openStreamPanel` is excluded (navigation side effect).
 * `remote:query:capabilities` is a pure query type with no extension union
 * counterpart — it is handled by React components that have access to live state.
 *
 * Drift detection for the action types lives in
 * `packages/extension/src/remote/types.ts`.
 */
export type RemoteDetailMessage =
  | { type: 'remote:action:executeAction'; target: 'detail'; cardId: string; actionName: string }
  | { type: 'remote:action:cancelAction'; target: 'detail'; cardId: string; actionName: string }
  | { type: 'remote:action:delete'; target: 'detail'; cardId: string }
  | { type: 'remote:query:capabilities'; target: 'detail'; cardId: string };

/**
 * Manually-defined union of remote messages dispatched to the list webview.
 *
 * Every member carries `target: 'list'` for routing.
 *
 * The actionable subset mirrors the extension's `CardsListWebviewToExtensionMessage`
 * action types. System messages (`discover:request`, `workspace:filterSync`,
 * `workspace:hasOtherCards`) and `webview:didConnect` are excluded.
 *
 * Drift detection lives in `packages/extension/src/remote/types.ts`.
 */
export type RemoteListMessage =
  | { type: 'remote:write:updateCard'; target: 'list'; cardId: string; data: Record<string, unknown> }
  | { type: 'remote:write:approveGate'; target: 'list'; cardId: string; gate: 'plan' | 'mergeRequest' }
  | { type: 'remote:action:requestTagsQuickPick'; target: 'list'; cardId: string; currentTags: string[] }
  | { type: 'remote:action:requestRelationQuickPick'; target: 'list'; cardId: string }
  | { type: 'remote:navigate'; target: 'list'; route: string }
  | { type: 'remote:query:capabilities'; target: 'list' };

/**
 * Union of all remote programmatic API messages.
 *
 * Use `RemoteDetailMessage` or `RemoteListMessage` when routing to a
 * specific webview; use `RemoteMessage` for the shared transport layer.
 */
export type RemoteMessage = RemoteDetailMessage | RemoteListMessage;
