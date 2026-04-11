---
name: remote
description: This skill should be used when the user asks to "send a remote message", "dispatch a remote action", "programmatically trigger a card action", "drive the extension from a test", "observe extension events", "use the remote: API", "inject a remote message", "preload a dialog response", or "use the synthetic event harness". Also load when writing extension-host tests that need to trigger UI actions without a live webview.
---

<instructions>

The Cards remote API lets external callers — agents, tests, and scripts — drive the same UI actions a user performs. The model is strictly asynchronous: callers dispatch `remote:` messages and observe consequences on an event stream. There are no synchronous request-response endpoints; callers own all correlation logic.

## 1. Ontology

Three conceptual layers organize the API:

| Layer | Contents |
|-------|----------|
| **Messages** | Inbound `remote:` actions dispatched into the extension from callers |
| **Events** | Outbound events emitted by the extension and observable via `RemoteEventBus` |
| **Infrastructure** | Buffering, routing, and interception machinery |

### 1.1 Messages

A `RemoteMessage` targets exactly one webview via its `target` field:

- **`target: 'detail'`** — Dispatches into the detail panel for a specific card. All detail messages carry `cardId: string`.
- **`target: 'list'`** — Dispatches into the list sidebar.

Messages travel: caller → provider `enqueueRemoteMessage()` → `RemoteMessageQueue` → webview `postMessage` → React host adapter → React component.

Full type catalog: **[`references/message-types.md`](./references/message-types.md)**

### 1.2 Events

After dispatching a message, observe the consequence on `RemoteEventBus`. Events are emitted synchronously during provider processing — subscribe **before** dispatching.

| Category | Types |
|----------|-------|
| Remote API events | `remote:error`, `remote:capabilities`, `remote:command:result` |
| Observable webview events | `detail:tagAdded`, `detail:tagRemoved`, `detail:relationAdded`, `detail:incomingRelationRemoved`, `detail:environmentChanged`, `state:update` |

Credential-bearing messages (`extension:init`, `server:changed`, `discover:response`) are intentionally excluded from the bus.

Full event reference: **[`references/observable-events.md`](./references/observable-events.md)**

### 1.3 Infrastructure

| Class / Interface | Role |
|-------------------|------|
| `RemoteMessageQueue` | Three-state buffer (Queuing → Ready → Disposed); holds messages until the webview signals readiness |
| `RemoteEventBus` | Typed pub/sub bus; providers emit events here; callers subscribe |
| `KeyedDialogInterceptor` | Preloads values for VS Code `showInputBox` / `showQuickPick` so they resolve without showing real dialogs |

Testing utilities and interceptors: **[`references/testing.md`](./references/testing.md)**

---

## 2. Emit-Expect Pattern

Every interaction follows the same structure:

1. Subscribe to the expected consequence event on `RemoteEventBus`.
2. Dispatch the `remote:` message via the appropriate provider.
3. Await the consequence event, then unsubscribe.

Never invert steps 1 and 2 — subscribe first, then dispatch.

**Example: execute an action, await the side effect**

```typescript
// 1. Subscribe before dispatching
bus.on('detail:tagAdded', (event) => {
  console.log('Tag added:', event.tag);
});

// 2. Dispatch
injectRemoteMessage(providers, {
  type: 'remote:action:requestTagsQuickPick',
  target: 'detail',
  cardId: 'main-42',
  currentTags: [],
});
```

For multi-step flows, await the expected consequence event before dispatching the next action.

---

## 3. Dispatching Messages

Use `injectRemoteMessage()` from [`testHarness.ts`](./packages/extension/src/remote/testHarness.ts) to inject messages directly into providers, bypassing the WebSocket layer (extension-host tests only):

```typescript
import { injectRemoteMessage } from '../../src/remote/testHarness.js';

injectRemoteMessage(providers, {
  type: 'remote:action:executeAction',
  target: 'detail',
  cardId: 'main-42',
  actionName: 'launch',
});
```

The `providers` object requires both a `CardsDetailPanelProvider` (for `target: 'detail'`) and a `CardsViewProvider` (for `target: 'list'`). Routing is automatic based on `message.target`.

---

## 4. Observing Events

Use `createRemoteObserver()` from [`testHarness.ts`](./packages/extension/src/remote/testHarness.ts) to subscribe to all events on the bus:

```typescript
import { createRemoteObserver } from '../../src/remote/testHarness.js';

const observer = createRemoteObserver(bus);
const disposable = observer.on((event) => {
  console.log('Received:', event.type);
});

// Later:
disposable.dispose();
```

For targeted subscriptions, use `bus.on(type, callback)` directly:

```typescript
bus.on('remote:error', (event) => {
  console.error('Remote error:', event.reason);
});
```

---

## 5. Capabilities Query

Each webview responds to `remote:query:capabilities` by reporting which actions are available and which are blocked. Subscribe to `remote:capabilities` before dispatching:

```typescript
bus.on('remote:capabilities', (event) => {
  console.log('Available actions:', event.actions);
});

injectRemoteMessage(providers, {
  type: 'remote:query:capabilities',
  target: 'detail',
  cardId: 'main-42',
});
```

The `actions` map uses action names as keys with values of `{ available: boolean; blockedReason?: string }`.

---

## 6. Error Handling

When a message is dropped (e.g., the panel was disposed before the webview was ready), the bus emits `remote:error`:

```typescript
bus.on('remote:error', (event) => {
  // event.reason: string
  // event.originalMessage?: unknown
  // event.cardId?: string
});
```

Subscribe to `remote:error` to detect dispatch failures.

---

## 7. Message Routing

```
Caller
  │
  ▼
injectRemoteMessage()           ← testHarness.ts (tests only)
  │
  ▼
Provider.enqueueRemoteMessage()
  │
  ▼
RemoteMessageQueue              ← buffers until webview:didConnect
  │ flush()
  ▼
webview.postMessage(msg)        ← extension → webview boundary
  │
  ▼
vscodeDetailHost / vscodeListHost
  │ onRemoteAction callback
  ▼
React component (respects disabled states, validation)
  │ side effect
  ▼
extension event (tag added, etc.)
  │
  ▼
RemoteEventBus.emit()           ← observable by caller
```

---

## 8. Reference Files

| Reference | Contents |
|-----------|----------|
| **[`references/message-types.md`](./references/message-types.md)** | Full type catalog for `RemoteDetailMessage` and `RemoteListMessage` |
| **[`references/observable-events.md`](./references/observable-events.md)** | `RemoteBusEvent` union, allowlist semantics, subscription API |
| **[`references/testing.md`](./references/testing.md)** | `injectRemoteMessage`, `createRemoteObserver`, `KeyedDialogInterceptor` |

</instructions>
