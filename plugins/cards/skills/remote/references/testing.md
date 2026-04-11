# Testing Reference

Utilities for writing extension-host tests that drive the remote API without a live webview or WebSocket connection.

---

## Test Harness (`testHarness.ts`)

Defined in [`packages/extension/src/remote/testHarness.ts`](./packages/extension/src/remote/testHarness.ts).

### `injectRemoteMessage(providers, message)`

Injects a `RemoteMessage` directly into the appropriate provider, bypassing the WebSocket layer. For use in extension-host tests only.

```typescript
import { injectRemoteMessage } from '../../src/remote/testHarness.js';

injectRemoteMessage(providers, {
  type: 'remote:action:executeAction',
  target: 'detail',
  cardId: 'main-42',
  actionName: 'launch',
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `providers.detail` | `CardsDetailPanelProvider` | Routes `target: 'detail'` messages |
| `providers.list` | `CardsViewProvider` | Routes `target: 'list'` messages |
| `message` | `RemoteMessage` | The message to inject |

**Routing:** `message.target === 'detail'` → `providers.detail.enqueueRemoteMessage(message.cardId, message)`. `message.target === 'list'` → `providers.list.enqueueRemoteMessage(message)`.

---

### `createRemoteObserver(bus)`

Creates an observer that subscribes to all events on a `RemoteEventBus`.

```typescript
import { createRemoteObserver } from '../../src/remote/testHarness.js';

const observer = createRemoteObserver(bus);
const disposable = observer.on((event) => {
  console.log('Received:', event.type, event);
});

// Later:
disposable.dispose();
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `bus` | `RemoteEventBus` | The bus to observe |

**Returns:** `{ on(callback): vscode.Disposable }` — call `disposable.dispose()` to unsubscribe.

---

## `RemoteMessageQueue`

Defined in [`packages/extension/src/remote/RemoteMessageQueue.ts`](./packages/extension/src/remote/RemoteMessageQueue.ts).

Each provider maintains one `RemoteMessageQueue` per managed webview. Messages sent before the webview signals readiness are buffered; the queue drains when the webview connects.

### State machine

```
Queuing → Ready → Disposed
       ↘         ↗
         Disposed
```

| State | `enqueue()` behavior |
|-------|---------------------|
| `Queuing` | Message is buffered |
| `Ready` | Message is dispatched immediately via the registered callback |
| `Disposed` | Message is passed to the stored `onDrop` callback |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `enqueue` | `(message: RemoteMessage) => void` | Buffer or dispatch based on current state |
| `flush` | `(dispatch: (msg: RemoteMessage) => void) => void` | Transition to Ready; drain buffer; register dispatch callback |
| `dispose` | `(onDrop: (msg: RemoteMessage) => void) => void` | Transition to Disposed; call `onDrop` for each undelivered buffered message |
| `isReady` | `() => boolean` | Returns `true` when in Ready state |

### Usage in tests

Tests rarely interact with `RemoteMessageQueue` directly. The typical pattern is:

1. Create a provider (which creates its own queue internally).
2. Inject a message via `injectRemoteMessage()`.
3. If the test needs the webview to be "ready", call `queue.flush()` on the provider's internal queue before injecting.

---

## `KeyedDialogInterceptor`

Defined in [`packages/extension/src/remote/interceptors.ts`](./packages/extension/src/remote/interceptors.ts).

Preloads values for VS Code dialogs (`showInputBox`, `showQuickPick`) so they resolve immediately without showing real UI. Used for Tier 2 interactions where `remote:` actions trigger dialogs.

### Interface

```typescript
interface DialogInterceptor {
  preload(key: string, value: unknown): void;
  clear(key: string): void;
  intercept<T>(key: string, fallback: () => Promise<T | undefined>): Promise<T | undefined>;
}
```

### Methods

| Method | Description |
|--------|-------------|
| `preload(key, value)` | Store a pending value for `key`. Throws if a pending value already exists — fail-closed to prevent concurrent callers from corrupting each other. Call `clear()` first if needed. |
| `clear(key)` | Remove the pending value for `key`. Cancels a preloaded intercept. |
| `intercept(key, fallback)` | If a pending value exists for `key`, consume it atomically and return it. Otherwise call `fallback()` (which shows the real dialog). |

### Common dialog keys

Dialog keys are defined by the handler calling `intercept()`. Look for `interceptor.intercept('some-key', ...)` calls in:

- [`cardActionHandlers.ts`](./packages/extension/src/shared/cardActionHandlers.ts) — tag InputBox, relation QuickPick, gate approval QuickPick

### Usage pattern

```typescript
const interceptor = new KeyedDialogInterceptor();

// Preload before dispatching the action that triggers the dialog
interceptor.preload('tags:add', 'my-new-tag');

// Dispatch the action
injectRemoteMessage(providers, {
  type: 'remote:action:requestTagsQuickPick',
  target: 'detail',
  cardId: 'main-42',
  currentTags: [],
});

// The dialog resolves immediately with 'my-new-tag' without showing UI
// Observe the consequence on the bus:
bus.on('detail:tagAdded', (event) => {
  assert.strictEqual(event.tag, 'my-new-tag');
});
```

### Fail-closed behavior

```typescript
interceptor.preload('tags:add', 'first-value');

// This throws — a pending value already exists:
interceptor.preload('tags:add', 'second-value');
// Error: KeyedDialogInterceptor: a pending value already exists for key "tags:add". Call clear() first.

// Cancel the pending intercept:
interceptor.clear('tags:add');
interceptor.preload('tags:add', 'replacement');
```

---

## Test Setup Pattern

A typical extension-host test that uses the remote API:

```typescript
import { suite, test } from 'mocha';
import * as assert from 'assert';
import { RemoteEventBus } from '../../src/remote/RemoteEventBus.js';
import { KeyedDialogInterceptor } from '../../src/remote/interceptors.js';
import { injectRemoteMessage, createRemoteObserver } from '../../src/remote/testHarness.js';

suite('Remote API', () => {
  let bus: RemoteEventBus;
  let interceptor: KeyedDialogInterceptor;

  setup(() => {
    bus = new RemoteEventBus();
    interceptor = new KeyedDialogInterceptor();
    // Pass bus and interceptor to providers during setup...
  });

  test('adds a tag via remote message', async () => {
    // 1. Subscribe before dispatching
    const tagAdded = new Promise<string>((resolve) => {
      bus.on('detail:tagAdded', (event) => resolve(event.tag));
    });

    // 2. Preload the dialog response
    interceptor.preload('tags:add', 'test-tag');

    // 3. Dispatch the action
    injectRemoteMessage(providers, {
      type: 'remote:action:requestTagsQuickPick',
      target: 'detail',
      cardId: 'main-42',
      currentTags: [],
    });

    // 4. Await the consequence
    const tag = await tagAdded;
    assert.strictEqual(tag, 'test-tag');
  });
});
```

### Key rules

- **Subscribe before dispatching.** The bus emits synchronously during provider processing. Subscribing after dispatching may miss the event.
- **One `preload()` per action.** Each preloaded value is consumed atomically on first use. For multi-step flows, preload each step before dispatching.
- **Always await consequences before dispatching the next action.** The API is strictly asynchronous with no built-in sequencing.
- **Unsubscribe after each test.** Use `bus.off()` or `disposable.dispose()` to prevent leaked listeners from affecting subsequent tests.
