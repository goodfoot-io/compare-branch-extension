<instructions>

Reference for all events emitted on `RemoteEventBus` and the subscription API.

Defined in [`packages/extension/src/remote/RemoteEventBus.ts`](./packages/extension/src/remote/RemoteEventBus.ts).

## 1. `RemoteBusEvent` Union

```typescript
type RemoteBusEvent =
  | { type: 'remote:error';                    reason: string; originalMessage?: unknown; cardId?: string; detail?: string; panelId?: string }
  | { type: 'remote:capabilities';             target: 'detail' | 'list' | 'create' | 'editor' | 'wizard' | 'stream'; cardId?: string; panelId?: string; actions: Record<string, { available: boolean; blockedReason?: string }> }
  | { type: 'remote:panel:created';            target: string; panelId: string; cardId?: string }
  | { type: 'remote:panel:disposed';           target: string; panelId?: string; cardId?: string }
  | { type: 'remote:command:result';           commandId: string; result: unknown }
  | { type: 'remote:command:error';            commandId: string; error: string }
  | { type: 'editor:saveResult';               panelId: string; success: boolean; message?: string }
  | { type: 'editor:error';                    panelId: string; message: string }
  | { type: 'wizard:installSuccess';           settingsFile: string; agent: string; pluginId: string }
  | { type: 'wizard:installError';             error: string; file?: string }
  | { type: 'wizard:existingConfig';           [key: string]: unknown }
  | { type: 'stream:started';                  panelId: string; filename: string; meta: StreamMeta }
  | { type: 'stream:ended';                    panelId: string; filename: string; status: string; lineCount: number }
  | { type: 'subscribe:response';              panelId: string; filename: string; lines: string[]; meta: unknown }
  | { type: 'createCard:tagAdded';             panelId: string; tag: string }
  | { type: 'createCard:attachmentAdded';      panelId: string; attachment: PendingAttachment }
  | { type: 'createCard:relationAdded';        panelId: string; relation: CardRelation }
  | { type: 'createCard:error';                panelId: string; message: string; code?: string; retryable?: boolean }
  | { type: 'createCard:environmentsLoaded';   panelId: string; environments: unknown[] }
  | { type: 'detail:tagAdded';                 cardId: string; tag: string }
  | { type: 'detail:tagRemoved';               cardId: string; tag: string }
  | { type: 'detail:relationAdded';            cardId: string; [key: string]: unknown }
  | { type: 'detail:incomingRelationRemoved';  cardId: string; [key: string]: unknown }
  | { type: 'detail:environmentChanged';       cardId: string; [key: string]: unknown }
  | { type: 'state:update';                    [key: string]: unknown };
```

---

## 2. Remote API Events

These events are emitted by the extension in response to `remote:` actions or infrastructure conditions.

### 2.1 `remote:error`

Emitted when a queued message cannot be delivered.

| Field | Type | Description |
|-------|------|-------------|
| `reason` | `string` | Human-readable description of why the message was dropped |
| `originalMessage` | `unknown?` | The message that was dropped, if available |
| `cardId` | `string?` | The card ID from the dropped message, if applicable |
| `detail` | `string?` | Additional error context, if available |
| `panelId` | `string?` | The panel ID from the dropped message, if applicable |

Common causes:
- The detail panel was disposed before the webview signaled readiness (`RemoteMessageQueue` drops from Queuing state).
- No panel exists for the given `cardId` when a detail message arrives.
- An unknown `remote:` type was sent (the host adapter rejects it explicitly).

### 2.2 `remote:capabilities`

Emitted by the webview in response to `remote:query:capabilities`. The webview inspects its own React state and reports which actions are currently available.

| Field | Type | Description |
|-------|------|-------------|
| `target` | `'detail' \| 'list' \| 'create' \| 'editor' \| 'wizard' \| 'stream'` | Which webview responded |
| `cardId` | `string?` | Present for detail responses |
| `panelId` | `string?` | Present for non-detail responses |
| `actions` | `Record<string, { available: boolean; blockedReason?: string }>` | Map of action names to availability |

### 2.3 `remote:panel:created`

Emitted when any tracked panel is registered. Covers all six panel targets: `detail`, `list`, `create`, `editor`, `wizard`, and `stream`.

| Field | Type | Description |
|-------|------|-------------|
| `target` | `string` | The panel target (e.g. `'detail'`, `'create'`) |
| `panelId` | `string` | Unique identifier for the panel instance |
| `cardId` | `string?` | Present for card-scoped panels such as `detail` |

### 2.4 `remote:panel:disposed`

Emitted when any tracked panel is disposed, whether cleanly (user closes the tab) or abnormally (extension deactivation, crash).

| Field | Type | Description |
|-------|------|-------------|
| `target` | `string` | The panel target |
| `panelId` | `string?` | Unique identifier for the disposed panel, if known |
| `cardId` | `string?` | Present for card-scoped panels |

### 2.5 `remote:command:result`

Emitted when a VS Code command invoked via `vscode.commands.executeCommand` returns a meaningful result.

| Field | Type | Description |
|-------|------|-------------|
| `commandId` | `string` | The command that was executed |
| `result` | `unknown` | The value returned by the command |

### 2.6 `remote:command:error`

Emitted when a command dispatched via `remote:command` throws.

| Field | Type | Description |
|-------|------|-------------|
| `commandId` | `string` | The command that threw |
| `error` | `string` | String representation of the thrown error |

---

## 3. Observable Webview Events

These events mirror outbound extension-to-webview messages forwarded to the bus via the `OBSERVABLE_MESSAGE_TYPES` allowlist. Subscribe to them to observe the consequence of a dispatched action.

### 3.1 `detail:tagAdded`

Emitted after a tag has been added to a card via `action:requestTagsQuickPick`.

| Field | Type | Description |
|-------|------|-------------|
| `cardId` | `string` | The card that received the tag |
| `tag` | `string` | The tag that was added |

**Trigger:** `remote:action:requestTagsQuickPick` (on either detail or list target).

### 3.2 `detail:tagRemoved`

Emitted after a tag has been removed from a card.

| Field | Type | Description |
|-------|------|-------------|
| `cardId` | `string` | The card the tag was removed from |
| `tag` | `string` | The tag that was removed |

### 3.3 `detail:relationAdded`

Emitted after a relation has been added to a card via `action:requestRelationQuickPick`.

| Field | Type | Description |
|-------|------|-------------|
| `cardId` | `string` | The source card |
| _(other fields)_ | `unknown` | Additional relation data (open-ended) |

**Trigger:** `remote:action:requestRelationQuickPick` (on either detail or list target).

### 3.4 `detail:incomingRelationRemoved`

Emitted after an incoming relation has been removed from a card.

| Field | Type | Description |
|-------|------|-------------|
| `cardId` | `string` | The card whose incoming relation was removed |
| _(other fields)_ | `unknown` | Additional relation data |

### 3.5 `detail:environmentChanged`

Emitted when the environment associated with a card changes.

| Field | Type | Description |
|-------|------|-------------|
| `cardId` | `string` | The card whose environment changed |
| _(other fields)_ | `unknown` | Environment update data |

### 3.6 `state:update`

Emitted for incremental state updates (theme changes, card ID updates). Fields are open-ended.

### 3.7 `editor:saveResult`

Emitted by [`CardsEditorPanelProvider`](./packages/extension/src/providers/CardsEditorPanelProvider.ts) after a save attempt completes.

| Field | Type | Description |
|-------|------|-------------|
| `panelId` | `string` | The editor panel instance |
| `success` | `boolean` | Whether the save succeeded |
| `message` | `string?` | Human-readable result or error description |

### 3.8 `editor:error`

Emitted by [`CardsEditorPanelProvider`](./packages/extension/src/providers/CardsEditorPanelProvider.ts) when an unrecoverable editor error occurs.

| Field | Type | Description |
|-------|------|-------------|
| `panelId` | `string` | The editor panel instance |
| `message` | `string` | Error description |

### 3.9 `wizard:installSuccess`

Emitted by [`SetupWizardViewProvider`](./packages/extension/src/providers/SetupWizardViewProvider.ts) when a plugin installation completes successfully.

| Field | Type | Description |
|-------|------|-------------|
| `settingsFile` | `string` | Path to the settings file that was written |
| `agent` | `string` | The agent identifier that was installed |
| `pluginId` | `string` | The plugin that was installed |

### 3.10 `wizard:installError`

Emitted by [`SetupWizardViewProvider`](./packages/extension/src/providers/SetupWizardViewProvider.ts) when a plugin installation fails.

| Field | Type | Description |
|-------|------|-------------|
| `error` | `string` | Error description |
| `file` | `string?` | Path to the file that caused the error, if applicable |

### 3.11 `wizard:existingConfig`

Emitted by [`SetupWizardViewProvider`](./packages/extension/src/providers/SetupWizardViewProvider.ts) when an existing configuration is detected. Fields are open-ended.

### 3.12 `stream:started`

Emitted by [`StreamPanelProvider`](./packages/extension/src/providers/StreamPanelProvider.ts) when a stream begins.

| Field | Type | Description |
|-------|------|-------------|
| `panelId` | `string` | The stream panel instance |
| `filename` | `string` | The stream file being followed |
| `meta` | `StreamMeta` | Stream metadata |

### 3.13 `stream:ended`

Emitted by [`StreamPanelProvider`](./packages/extension/src/providers/StreamPanelProvider.ts) when a stream ends.

| Field | Type | Description |
|-------|------|-------------|
| `panelId` | `string` | The stream panel instance |
| `filename` | `string` | The stream file that ended |
| `status` | `string` | Terminal status of the stream |
| `lineCount` | `number` | Total number of lines in the stream |

### 3.14 `subscribe:response`

Emitted by [`StreamPanelProvider`](./packages/extension/src/providers/StreamPanelProvider.ts) in response to a subscription request, delivering initial stream contents.

| Field | Type | Description |
|-------|------|-------------|
| `panelId` | `string` | The stream panel instance |
| `filename` | `string` | The subscribed stream file |
| `lines` | `string[]` | Initial lines from the stream |
| `meta` | `unknown` | Stream metadata |

### 3.15 `createCard:tagAdded`

Emitted by [`CardsCreateCardPanelProvider`](./packages/extension/src/providers/CardsCreateCardPanelProvider.ts) when a tag is staged on the new-card form.

| Field | Type | Description |
|-------|------|-------------|
| `panelId` | `string` | The create panel instance |
| `tag` | `string` | The tag that was added |

### 3.16 `createCard:attachmentAdded`

Emitted by [`CardsCreateCardPanelProvider`](./packages/extension/src/providers/CardsCreateCardPanelProvider.ts) when an attachment is staged on the new-card form.

| Field | Type | Description |
|-------|------|-------------|
| `panelId` | `string` | The create panel instance |
| `attachment` | `PendingAttachment` | The staged attachment |

### 3.17 `createCard:relationAdded`

Emitted by [`CardsCreateCardPanelProvider`](./packages/extension/src/providers/CardsCreateCardPanelProvider.ts) when a relation is staged on the new-card form.

| Field | Type | Description |
|-------|------|-------------|
| `panelId` | `string` | The create panel instance |
| `relation` | `CardRelation` | The staged relation |

### 3.18 `createCard:error`

Emitted by [`CardsCreateCardPanelProvider`](./packages/extension/src/providers/CardsCreateCardPanelProvider.ts) when the create-card flow encounters an error.

| Field | Type | Description |
|-------|------|-------------|
| `panelId` | `string` | The create panel instance |
| `message` | `string` | Error description |
| `code` | `string?` | Machine-readable error code |
| `retryable` | `boolean?` | Whether the operation can be retried |

### 3.19 `createCard:environmentsLoaded`

Emitted by [`CardsCreateCardPanelProvider`](./packages/extension/src/providers/CardsCreateCardPanelProvider.ts) when available environments have been loaded into the form.

| Field | Type | Description |
|-------|------|-------------|
| `panelId` | `string` | The create panel instance |
| `environments` | `unknown[]` | List of available environments |

---

## 4. Allowlist Semantics

Only the types in [`OBSERVABLE_MESSAGE_TYPES`](./packages/extension/src/remote/RemoteEventBus.ts) are forwarded from providers to the bus:

```typescript
const OBSERVABLE_MESSAGE_TYPES: ReadonlySet<string> = new Set([
  // Detail provider
  'detail:tagAdded',
  'detail:tagRemoved',
  'detail:relationAdded',
  'detail:incomingRelationRemoved',
  'detail:environmentChanged',
  // List provider
  'state:update',
  // Editor provider (CardsEditorPanelProvider)
  'editor:saveResult',
  'editor:error',
  // Wizard provider (SetupWizardViewProvider)
  'wizard:installSuccess',
  'wizard:installError',
  'wizard:existingConfig',
  // Stream panel provider (StreamPanelProvider)
  'stream:started',
  'stream:ended',
  'subscribe:response',
  // Create card provider (CardsCreateCardPanelProvider)
  'createCard:tagAdded',
  'createCard:attachmentAdded',
  'createCard:relationAdded',
  'createCard:error',
  'createCard:environmentsLoaded'
]);
```

Excluded to prevent credential leakage:

| Message | Why excluded |
|---------|-------------|
| `extension:init` | Contains `accessToken` |
| `server:changed` | Contains `accessToken` |
| `discover:response` | Contains `accessToken` |
| `createCard:credentialsUpdated` | Contains `accessToken`, `baseUrl`, and `wsUrl` |

---

## 5. Subscription API

`RemoteEventBus` provides three subscription methods.

### 5.1 `bus.on(type, callback)`

Subscribe to a specific event type. Idempotent — registering the same callback twice for the same type has no effect.

```typescript
bus.on('detail:tagAdded', (event) => {
  console.log(event.cardId, event.tag);
});
```

### 5.2 `bus.off(type, callback)`

Unsubscribe a callback from a specific event type. No-op if the callback was not registered.

```typescript
bus.off('detail:tagAdded', myCallback);
```

### 5.3 `bus.onAny(callback)`

Subscribe to all events, regardless of type. Returns an unsubscribe function.

```typescript
const unsubscribe = bus.onAny((event) => {
  console.log('Event:', event.type);
});

// Later:
unsubscribe();
```

Emission order: type-specific callbacks fire first (in registration order), then `onAny` callbacks (in registration order). All callbacks are invoked synchronously.

---

## 6. Emit-Expect Correlation Patterns

### 6.1 Single Action, Single Consequence

```typescript
const received = new Promise<string>((resolve) => {
  bus.on('detail:tagAdded', (event) => resolve(event.tag));
});

injectRemoteMessage(providers, {
  type: 'remote:action:requestTagsQuickPick',
  target: 'detail',
  cardId: 'main-42',
  currentTags: [],
});

const tag = await received;
```

### 6.2 Error Guard

```typescript
const errorReceived = new Promise<string>((resolve) => {
  bus.on('remote:error', (event) => resolve(event.reason));
});

injectRemoteMessage(providers, {
  type: 'remote:action:executeAction',
  target: 'detail',
  cardId: 'nonexistent-99',
  actionName: 'build',
});

const reason = await errorReceived;
```

### 6.3 Capabilities Query

```typescript
const capabilities = new Promise<Record<string, { available: boolean; blockedReason?: string }>>((resolve) => {
  bus.on('remote:capabilities', (event) => {
    if (event.cardId === 'main-42') resolve(event.actions);
  });
});

injectRemoteMessage(providers, {
  type: 'remote:query:capabilities',
  target: 'detail',
  cardId: 'main-42',
});

const actions = await capabilities;
```

</instructions>
