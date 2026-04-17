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
 * Every member carries `target: 'detail'` for routing and `cardId: string`
 * because multiple detail panels can be open simultaneously.
 *
 * The actionable subset mirrors the extension's `DetailWebviewToExtensionMessage`
 * action types. `action:openStreamPanel` is excluded (navigation side effect).
 * `remote:query:capabilities` is a pure query type with no extension union
 * counterpart — it is handled by React components that have access to live state.
 *
 * Drift detection for the action types lives in
 * `packages/extension/src/remote/types.ts`.
 */
export type RemoteDetailMessage =
  | {
      type: 'remote:action:executeAction';
      target: 'detail';
      cardId: string;
      actionName: string;
      mode: 'interactive' | 'background';
    }
  | { type: 'remote:action:cancelAction'; target: 'detail'; cardId: string; actionName: string }
  | { type: 'remote:action:delete'; target: 'detail'; cardId: string }
  | { type: 'remote:action:copyId'; target: 'detail'; cardId: string }
  | { type: 'remote:action:requestTagsQuickPick'; target: 'detail'; cardId: string; currentTags: string[] }
  | { type: 'remote:action:requestRelationQuickPick'; target: 'detail'; cardId: string; currentCardId: string }
  | { type: 'remote:action:removeIncomingRelation'; target: 'detail'; cardId: string; sourceCardId: string }
  | { type: 'remote:action:openWorktree'; target: 'detail'; cardId: string }
  | { type: 'remote:action:showChanges'; target: 'detail'; cardId: string }
  | { type: 'remote:action:filterByTag'; target: 'detail'; cardId: string; token: string }
  | { type: 'remote:action:openCardRepo'; target: 'detail'; cardId: string }
  | { type: 'remote:action:copyCardRepoPath'; target: 'detail'; cardId: string }
  | { type: 'remote:action:copyWorkspaceRepoPath'; target: 'detail'; cardId: string }
  | { type: 'remote:action:copyDocumentPath'; target: 'detail'; cardId: string; filename: string }
  | { type: 'remote:action:openEditor'; target: 'detail'; cardId: string; config: unknown }
  | { type: 'remote:action:writeClipboard'; target: 'detail'; cardId: string; text: string }
  | { type: 'remote:action:requestClipboard'; target: 'detail'; cardId: string }
  | { type: 'remote:action:uploadAttachment'; target: 'detail'; cardId: string; files: unknown[] }
  | { type: 'remote:action:openAttachment'; target: 'detail'; cardId: string; attachmentName: string }
  | {
      type: 'remote:action:deleteAttachment';
      target: 'detail';
      cardId: string;
      attachmentId: string;
      attachmentName: string;
    }
  | {
      type: 'remote:action:openFragmentLink';
      target: 'detail';
      cardId: string;
      path: string;
      startLine?: number;
      endLine?: number;
      sha?: string;
    }
  | {
      type: 'remote:action:openCommitFileDiff';
      target: 'detail';
      cardId: string;
      sha: string;
      filePath: string;
      repository: string;
    }
  | { type: 'remote:action:openCommitDiff'; target: 'detail'; cardId: string; sha: string; repository: string }
  | { type: 'remote:action:requestIcons'; target: 'detail'; cardId: string; paths: string[]; requestId: string }
  | { type: 'remote:navigate'; target: 'detail'; cardId: string; route: string }
  | { type: 'remote:write:updateCard'; target: 'detail'; cardId: string; data: Record<string, unknown> }
  | { type: 'remote:write:approveGate'; target: 'detail'; cardId: string; gate: 'plan' | 'mergeRequest' }
  | { type: 'remote:query:capabilities'; target: 'detail'; cardId: string };

/**
 * Manually-defined union of remote messages dispatched to the list webview.
 *
 * Every member carries `target: 'list'` for routing.
 *
 * The actionable subset mirrors the extension's `CardsListWebviewToExtensionMessage`
 * action types. System messages (`discover:request`, `workspace:filterSync`,
 * `workspace:hasOtherCards`, `webview:didConnect`) and `view:navigated` are excluded.
 * `remote:action:createCard` has no `DistributedRemote`-compatible counterpart
 * in the extension (the extension uses `{ type: 'action'; action: 'createCard' }`)
 * and is excluded from drift assertions.
 *
 * Drift detection lives in `packages/extension/src/remote/types.ts`.
 */
export type RemoteListMessage =
  | { type: 'remote:write:updateCard'; target: 'list'; cardId: string; data: Record<string, unknown> }
  | { type: 'remote:write:approveGate'; target: 'list'; cardId: string; gate: 'plan' | 'mergeRequest' }
  | { type: 'remote:action:requestTagsQuickPick'; target: 'list'; cardId: string; currentTags: string[] }
  | { type: 'remote:action:requestRelationQuickPick'; target: 'list'; cardId: string }
  | { type: 'remote:navigate'; target: 'list'; route: string }
  | { type: 'remote:worktrees:request'; target: 'list' }
  | { type: 'remote:worktree:openFolder'; target: 'list'; path: string }
  | { type: 'remote:worktree:repair'; target: 'list'; path: string }
  | { type: 'remote:worktree:remove'; target: 'list'; path: string }
  | { type: 'remote:worktrees:prune'; target: 'list' }
  | { type: 'remote:action:openWorktree'; target: 'list'; cardId: string }
  | { type: 'remote:action:createCard'; target: 'list' }
  | { type: 'remote:query:capabilities'; target: 'list' };

/**
 * Manually-defined union of remote messages dispatched to the create-card webview.
 *
 * Every member carries `target: 'create'` for routing and `panelId: string`
 * because multiple create panels can be open simultaneously.
 *
 * `remote:query:capabilities` is a pure query type with no extension union
 * counterpart and is excluded from drift assertions.
 *
 * Drift detection lives in `packages/extension/src/remote/types.ts`.
 */
export type RemoteCreateMessage =
  | { type: 'remote:createCard:cancel'; target: 'create'; panelId: string; isDirty: boolean }
  | { type: 'remote:createCard:requestClipboard'; target: 'create'; panelId: string }
  | {
      type: 'remote:createCard:requestIcons';
      target: 'create';
      panelId: string;
      paths: string[];
      requestId: string;
    }
  | { type: 'remote:createCard:writeClipboard'; target: 'create'; panelId: string; text: string }
  | { type: 'remote:createCard:requestTagsQuickPick'; target: 'create'; panelId: string; currentTags: string[] }
  | { type: 'remote:createCard:requestAttachmentUpload'; target: 'create'; panelId: string; files: unknown[] }
  | { type: 'remote:createCard:removeAttachment'; target: 'create'; panelId: string; id: string }
  | { type: 'remote:createCard:requestRelationQuickPick'; target: 'create'; panelId: string }
  | { type: 'remote:query:capabilities'; target: 'create'; panelId?: string };

/**
 * Manually-defined union of remote messages dispatched to the editor webview.
 *
 * Every member carries `target: 'editor'` for routing and `panelId: string`
 * because multiple editor panels can be open simultaneously.
 *
 * `remote:query:capabilities` is a pure query type with no extension union
 * counterpart and is excluded from drift assertions.
 *
 * Drift detection lives in `packages/extension/src/remote/types.ts`.
 */
export type RemoteEditorMessage =
  | {
      type: 'remote:editor:save';
      target: 'editor';
      panelId: string;
      fields: Array<{ key: string; value: string }>;
    }
  | { type: 'remote:editor:cancel'; target: 'editor'; panelId: string; isDirty: boolean }
  | { type: 'remote:editor:requestClipboard'; target: 'editor'; panelId: string }
  | { type: 'remote:editor:writeClipboard'; target: 'editor'; panelId: string; text: string }
  | { type: 'remote:query:capabilities'; target: 'editor'; panelId?: string };

/**
 * Manually-defined union of remote messages dispatched to the setup wizard webview.
 *
 * Every member carries `target: 'wizard'` for routing. The wizard is a singleton
 * (no `panelId` required).
 *
 * `remote:query:capabilities` is a pure query type with no extension union
 * counterpart and is excluded from drift assertions.
 *
 * Drift detection lives in `packages/extension/src/remote/types.ts`.
 */
export type RemoteWizardMessage =
  | { type: 'remote:wizard:skip'; target: 'wizard' }
  | { type: 'remote:wizard:selectLocation'; target: 'wizard'; path: string }
  | { type: 'remote:wizard:selectAgent'; target: 'wizard'; agent: string }
  | { type: 'remote:wizard:install'; target: 'wizard' }
  | { type: 'remote:wizard:retry'; target: 'wizard' }
  | { type: 'remote:wizard:redetect'; target: 'wizard' }
  | { type: 'remote:wizard:close'; target: 'wizard' }
  | { type: 'remote:wizard:keepConfig'; target: 'wizard' }
  | { type: 'remote:wizard:removeConfig'; target: 'wizard' }
  | { type: 'remote:wizard:removeAndExit'; target: 'wizard' }
  | { type: 'remote:query:capabilities'; target: 'wizard' };

/**
 * Manually-defined union of remote messages dispatched to the stream panel webview.
 *
 * Every member carries `target: 'stream'` for routing and `panelId: string`
 * because multiple stream panels can be open simultaneously.
 *
 * `remote:query:capabilities` is a pure query type with no extension union
 * counterpart and is excluded from drift assertions.
 *
 * Drift detection lives in `packages/extension/src/remote/types.ts`.
 */
export type RemoteStreamMessage =
  | { type: 'remote:openFile'; target: 'stream'; panelId: string; path: string; line?: number }
  | { type: 'remote:showDiff'; target: 'stream'; panelId: string; sha: string; filePath?: string }
  | { type: 'remote:close'; target: 'stream'; panelId: string }
  | { type: 'remote:subscribe'; target: 'stream'; panelId: string; filename: string }
  | { type: 'remote:query:capabilities'; target: 'stream'; panelId?: string };

/**
 * Direct VS Code command dispatch message.
 *
 * Routes through `_applyRemoteRouting` to `vscode.commands.executeCommand`.
 * Results are emitted as `remote:command:result` on the bus; errors as
 * `remote:command:error`.
 */
export type RemoteCommandMessage = {
  type: 'remote:command';
  target: 'command';
  commandId: string;
  args?: unknown[];
};

/**
 * Union of all remote programmatic API messages.
 *
 * Use the target-specific types (`RemoteDetailMessage`, `RemoteListMessage`, etc.)
 * when routing to a specific webview; use `RemoteMessage` for the shared transport
 * layer.
 */
export type RemoteMessage =
  | RemoteDetailMessage
  | RemoteListMessage
  | RemoteCreateMessage
  | RemoteEditorMessage
  | RemoteWizardMessage
  | RemoteStreamMessage
  | RemoteCommandMessage;
