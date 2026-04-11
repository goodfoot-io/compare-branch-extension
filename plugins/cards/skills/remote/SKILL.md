---
name: remote
description: This skill should be used when the user asks to "send a remote message", "dispatch a remote action", "programmatically trigger a card action", "drive the extension from a test", "observe extension events", "use the remote: API", "inject a remote message", "preload a dialog response", or "use the synthetic event harness". Also load when writing extension-host tests that need to trigger UI actions without a live webview.
---

# Cards Remote API

The remote API provides programmatic control over Cards extension UI through a strictly asynchronous **emit-expect** model. External callers — agents, tests, and scripts — dispatch `remote:` messages and observe the consequences on an event stream. There are no synchronous request-response endpoints; callers own all correlation logic.

## Concepts and Ontology

The API divides into three conceptual layers:

| Layer | What it contains |
|-------|-----------------|
| **Messages** | Inbound `remote:` actions dispatched into the extension from callers |
| **Events** | Outbound events emitted by the extension and observable via `RemoteEventBus` |
| **Infrastructure** | Buffering, routing, and interception machinery |

### Messages

A `RemoteMessage` targets exactly one webview via its `target` field. Two targets exist:

- **`target: 'detail'`** — Dispatches into the detail panel for a specific card. All detail messages carry `cardId: string`.
- **`target: 'list'`** — Dispatches into the list sidebar.

Messages travel: caller → provider `enqueueRemoteMessage()` → `RemoteMessageQueue` → webview `postMessage` → React host adapter → React component.

Full type catalog: **[`references/message-types.md`](./references/message-types.md)**

### Events

After dispatching a message, observe the consequence on the `RemoteEventBus`. Events are emitted synchronously during provider processing; subscribe before dispatching to avoid races.

Three categories of observable event:

| Category | Types |
|----------|-------|
| Remote API events | `remote:error`, `remote:capabilities`, `remote:command:result` |
| Observable webview events | `detail:tagAdded`, `detail:tagRemoved`, `detail:relationAdded`, `detail:incomingRelationRemoved`, `detail:environmentChanged`, `state:update` |

Credential-bearing messages (`extension:init`, `server:changed`, `discover:response`) are intentionally **excluded** from the bus.

Full event reference: **[`references/observable-events.md`](./references/observable-events.md)**

### Infrastructure

| Class / Interface | Role |
|-------------------|------|
| `RemoteMessageQueue` | Three-state buffer (Queuing → Ready → Disposed); holds messages until the webview signals readiness |
| `RemoteEventBus` | Typed pub/sub bus; providers emit events here; callers subscribe |
| `KeyedDialogInterceptor` | Preloads values for VS Code `showInputBox` / `showQuickPick` so they resolve without showing real dialogs |

Testing utilities and interceptors: **[`references/testing.md`](./references/testing.md)**

---

## Emit-Expect Pattern

Every interaction follows the same structure:

1. Subscribe to the expected consequence event on `RemoteEventBus`.
2. Dispatch the `remote:` message via the appropriate provider.
3. Await the consequence event, then unsubscribe.

Never invert steps 1 and 2 — subscribe first, then dispatch.

**Example: execute an action, await the side effect**

```typescript
// 1. Subscribe before dispatching
const disposable = bus.on('detail:tagAdded', (event) => {
  console.log('Tag added:', event.tag);
  disposable.dispose();
});

// 2. Dispatch
injectRemoteMessage(providers, {
  type: 'remote:action:requestTagsQuickPick',
  target: 'detail',
  cardId: 'main-42',
  currentTags: [],
});
```

For multi-step flows, always await the expected consequence event before dispatching the next action. This is caller discipline, not API enforcement.

---

## Dispatching Messages (Extension-Host Tests)

Use `injectRemoteMessage()` from [testHarness.ts](./packages/extension/src/remote/testHarness.ts) to inject messages directly into providers, bypassing the WebSocket layer:

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

## Observing Events (Extension-Host Tests)

Use `createRemoteObserver()` from [testHarness.ts](./packages/extension/src/remote/testHarness.ts) to subscribe to all events on the bus:

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

## Capabilities Query

Each webview responds to `remote:query:capabilities` by returning which actions are currently available and which are blocked (with a reason). Subscribe to `remote:capabilities` before dispatching:

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

The `actions` map has keys of action names and values of `{ available: boolean; blockedReason?: string }`.

---

## Error Handling

When a message is dropped (e.g., the panel was disposed before the webview was ready), the bus emits `remote:error`:

```typescript
bus.on('remote:error', (event) => {
  // event.reason: string
  // event.originalMessage?: unknown
  // event.cardId?: string
});
```

The `remote:error` event is always emitted for undeliverable messages. Subscribe to `remote:error` to detect dispatch failures.

---

## Message Routing at a Glance

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

## Additional Resources

| Reference | Contents |
|-----------|----------|
| **[`references/message-types.md`](./references/message-types.md)** | Full type catalog for `RemoteDetailMessage` and `RemoteListMessage` |
| **[`references/observable-events.md`](./references/observable-events.md)** | `RemoteBusEvent` union, allowlist semantics, subscription API |
| **[`references/testing.md`](./references/testing.md)** | `injectRemoteMessage`, `createRemoteObserver`, `KeyedDialogInterceptor` |
