# Remote Message Types

Full type catalog for all `remote:` messages that callers can dispatch into the Cards extension.

Defined in [`public/packages/sdk/src/protocol/types/remote.ts`](./public/packages/sdk/src/protocol/types/remote.ts).

---

## Type Utility: `DistributedRemote<T>`

`DistributedRemote<T>` derives a `remote:`-prefixed variant of any message type by replacing the `type` field. It is used internally to generate the remote message unions from the extension's inbound message types.

```typescript
type ExecuteActionMessage = { type: 'action:executeAction'; actionName: string };
type RemoteExecute = DistributedRemote<ExecuteActionMessage>;
// => { type: 'remote:action:executeAction'; actionName: string }
```

---

## `RemoteDetailMessage`

Messages dispatched to the detail webview. Handler: [`vscodeDetailHost.ts`](./packages/extension/src/webviews/cards-detail/vscodeDetailHost.ts). Provider entry point: [`CardsDetailPanelProvider.enqueueRemoteMessage(cardId, message)`](./packages/extension/src/providers/CardsDetailPanelProvider.ts).

**All detail messages carry `target: 'detail'` and `cardId: string`** — multiple detail panels can be open simultaneously, so `cardId` is required for routing.

### Action messages

| Type | Extra fields | Description |
|------|-------------|-------------|
| `remote:action:executeAction` | `actionName: string` | Execute a named action in the card's environment. The action must be defined in the environment configuration. Dispatches via `ActionDispatcher`. |
| `remote:action:cancelAction` | `actionName: string` | Cancel a running action. Sends SIGTERM to background processes associated with `actionName`. |
| `remote:action:delete` | _(none)_ | Delete the card. A confirmation dialog is shown before deletion; use a `KeyedDialogInterceptor` to bypass in tests. |

### Query messages

| Type | Extra fields | Description |
|------|-------------|-------------|
| `remote:query:capabilities` | _(none)_ | Query which actions are currently available and which are blocked. The webview inspects its own React state and responds via `remote:capabilities` on the bus. |

### TypeScript union

```typescript
type RemoteDetailMessage =
  | { type: 'remote:action:executeAction'; target: 'detail'; cardId: string; actionName: string }
  | { type: 'remote:action:cancelAction';  target: 'detail'; cardId: string; actionName: string }
  | { type: 'remote:action:delete';        target: 'detail'; cardId: string }
  | { type: 'remote:query:capabilities';   target: 'detail'; cardId: string };
```

### Excluded detail messages

The following inbound detail messages exist in the webview but are **not** exposed via `remote:`:

| Message | Why excluded |
|---------|-------------|
| `action:openWorktree` | Navigation side effect; open via VS Code command instead |
| `action:showChanges` | Navigation side effect |
| `action:filterByTag` | Navigation side effect |
| `action:openCardRepo` | Navigation side effect |
| `action:copyCardRepoPath` | Clipboard utility; no observable consequence on the bus |
| `action:copyWorkspaceRepoPath` | Clipboard utility |
| `action:copyDocumentPath` | Clipboard utility |
| `action:copyId` | Clipboard utility |
| `action:requestTagsQuickPick` | Available on the list target via `remote:action:requestTagsQuickPick`; excluded from the detail target's `remote:` subset |
| `action:requestRelationQuickPick` | Available via detail host adapter in raw form |
| `action:removeIncomingRelation` | Not in the actionable subset |
| `action:requestClipboard` | Internal proxy; not useful for external callers |
| `action:requestIcons` | Internal proxy; not useful for external callers |
| `action:writeClipboard` | Clipboard utility |
| `action:uploadAttachment` | Binary transfer; not in the actionable subset |
| `action:openAttachment` | Navigation side effect |
| `action:openFragmentLink` | Navigation side effect |
| `action:openCommitFileDiff` | Navigation side effect |
| `action:openCommitDiff` | Navigation side effect |
| `action:openEditor` | Navigation side effect |
| `write:*` | Request/response pattern; not in the actionable subset |

---

## `RemoteListMessage`

Messages dispatched to the list sidebar webview. Handler: [`vscodeListHost.ts`](./packages/extension/src/webviews/cards-list/vscodeListHost.ts). Provider entry point: [`CardsViewProvider.enqueueRemoteMessage(message)`](./packages/extension/src/providers/CardsViewProvider.ts).

**All list messages carry `target: 'list'`.**

### Write messages

Write messages use request/response correlation via `requestId`. The extension posts a `write:response` back to the webview; that response is not forwarded to the bus (it is an internal webview message). Observe side effects via state changes instead.

| Type | Extra fields | Description |
|------|-------------|-------------|
| `remote:write:updateCard` | `cardId: string`, `data: Record<string, unknown>` | Update card metadata fields. The `data` object contains the fields to set (e.g., `{ title: 'New title', status: 'done' }`). |
| `remote:write:approveGate` | `cardId: string`, `gate: 'plan' \| 'mergeRequest'` | Approve a gate on a card. Valid values: `'plan'` (sets `planApproved: true`) or `'mergeRequest'` (sets `mergeApproved: true`). |

### Action messages

| Type | Extra fields | Description |
|------|-------------|-------------|
| `remote:action:requestTagsQuickPick` | `cardId: string`, `currentTags: string[]` | Show an InputBox for tag entry. Pass current tags to exclude them from suggestions. The response arrives as `detail:tagAdded` on the bus. Use `KeyedDialogInterceptor` to preload the input value in tests. |
| `remote:action:requestRelationQuickPick` | `cardId: string` | Show a QuickPick to select a card for a relation. The response arrives as `detail:relationAdded` on the bus. Use `KeyedDialogInterceptor` to preload the selection in tests. |

### Navigation messages

| Type | Extra fields | Description |
|------|-------------|-------------|
| `remote:navigate` | `route: string` | Navigate the list webview to a route. Common values: `/cards` (returns to list), `/cards/{cardId}` (opens detail panel). |

### Query messages

| Type | Extra fields | Description |
|------|-------------|-------------|
| `remote:query:capabilities` | _(none)_ | Query which list actions are currently available. Responds via `remote:capabilities` on the bus with `target: 'list'`. |

### TypeScript union

```typescript
type RemoteListMessage =
  | { type: 'remote:write:updateCard';              target: 'list'; cardId: string; data: Record<string, unknown> }
  | { type: 'remote:write:approveGate';             target: 'list'; cardId: string; gate: 'plan' | 'mergeRequest' }
  | { type: 'remote:action:requestTagsQuickPick';   target: 'list'; cardId: string; currentTags: string[] }
  | { type: 'remote:action:requestRelationQuickPick'; target: 'list'; cardId: string }
  | { type: 'remote:navigate';                      target: 'list'; route: string }
  | { type: 'remote:query:capabilities';            target: 'list' };
```

---

## `RemoteMessage` (shared transport union)

```typescript
type RemoteMessage = RemoteDetailMessage | RemoteListMessage;
```

Use `RemoteDetailMessage` or `RemoteListMessage` when routing to a specific webview. Use `RemoteMessage` only for the shared transport layer (e.g., `RemoteMessageQueue`).

---

## Drift Detection

The extension maintains compile-time assertions in [`packages/extension/src/remote/types.ts`](./packages/extension/src/remote/types.ts) to ensure the SDK's `RemoteDetailMessage` and `RemoteListMessage` unions stay synchronized with the extension's inbound message types. Four `AssertExtends` checks run at compile time:

1. Forward check (detail): every actionable detail extension type must be in the SDK union.
2. Reverse check (detail): every SDK detail type must have an extension source.
3. Forward check (list): every actionable list extension type must be in the SDK union.
4. Reverse check (list): every SDK list type must have an extension source.

`remote:query:capabilities` is excluded from drift checks because it has no extension union counterpart — it is handled by React components that have access to live state.

Adding a new remote message type requires updating both the SDK union and the extension's `KNOWN_*_REMOTE_TYPES_ARRAY` in the host adapter, or the build will fail.
