<instructions>

Reference for all events emitted on `RemoteEventBus` and the subscription API.

Defined in [`packages/extension/src/remote/RemoteEventBus.ts`](./packages/extension/src/remote/RemoteEventBus.ts).

## 1. `RemoteBusEvent` Union

```typescript
type RemoteBusEvent =
  | { type: 'remote:error';                    reason: string; originalMessage?: unknown; cardId?: string }
  | { type: 'remote:capabilities';             target: 'detail' | 'list'; cardId?: string; actions: Record<string, { available: boolean; blockedReason?: string }> }
  | { type: 'remote:command:result';           commandId: string; result: unknown }
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

Common causes:
- The detail panel was disposed before the webview signaled readiness (`RemoteMessageQueue` drops from Queuing state).
- No panel exists for the given `cardId` when a detail message arrives.
- An unknown `remote:` type was sent (the host adapter rejects it explicitly).

### 2.2 `remote:capabilities`

Emitted by the webview in response to `remote:query:capabilities`. The webview inspects its own React state and reports which actions are currently available.

| Field | Type | Description |
|-------|------|-------------|
| `target` | `'detail' \| 'list'` | Which webview responded |
| `cardId` | `string?` | Present for detail responses |
| `actions` | `Record<string, { available: boolean; blockedReason?: string }>` | Map of action names to availability |

### 2.3 `remote:command:result`

Emitted when a VS Code command invoked via `vscode.commands.executeCommand` returns a meaningful result.

| Field | Type | Description |
|-------|------|-------------|
| `commandId` | `string` | The command that was executed |
| `result` | `unknown` | The value returned by the command |

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

---

## 4. Allowlist Semantics

Only the types in `OBSERVABLE_MESSAGE_TYPES` are forwarded from providers to the bus:

```typescript
const OBSERVABLE_MESSAGE_TYPES: ReadonlySet<string> = new Set([
  'detail:tagAdded',
  'detail:tagRemoved',
  'detail:relationAdded',
  'detail:incomingRelationRemoved',
  'detail:environmentChanged',
  'state:update'
]);
```

Excluded to prevent credential leakage:

| Message | Why excluded |
|---------|-------------|
| `extension:init` | Contains `accessToken` |
| `server:changed` | Contains `accessToken` |
| `discover:response` | Contains `accessToken` |

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
