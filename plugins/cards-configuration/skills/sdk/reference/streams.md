<instructions>

This document describes stream transform configuration in `@cards/configuration`.

## Stream Transforms vs SDK Handlers

**Important difference**: Stream transforms use the `defineStreamTransform` factory function and run in isolated workers. Unlike actions and validators:

- Uses `defineStreamTransform` wrapper for full feature support
- Supports optional `init()` function for stream initialization
- Shares state between `init()` and `transform()` via `Map<string, unknown>`
- Runs in isolated worker thread with VM sandbox
- No rebuild step required
- Cached after first load (restart server to reload)

## Stream Definition Schema

Configure streams in environment settings:

```typescript
interface StreamDefinition {
  /** Schema version (always 1). */
  version: number;

  /** Transform configuration. */
  transform: {
    /** Path to ESM module (relative to .cards/transforms/ or absolute). */
    path: string;
    /** Timeout in ms for transform execution (default 5000). */
    timeout?: number;
  };

  /** Maximum bytes per line before truncation (default 1MB). */
  maxLineLength?: number;

  /** Maximum bytes per stream file before auto-close (default 100MB). */
  maxStreamSize?: number;
}
```

Example configuration:

```typescript
streams: {
  'chat-log': {
    version: 1,
    transform: {
      path: 'chat-formatter.mjs',
      timeout: 5000
    },
    maxLineLength: 1048576,
    maxStreamSize: 104857600
  }
}
```

## Transform Factory Function

Transform modules must export a default created via `defineStreamTransform`:

```typescript
import { defineStreamTransform } from '@cards/configuration';

export default defineStreamTransform(
  config: StreamTransformConfig,
  handler: StreamTransformHandler,
  init?: StreamInitHandler
);
```

**Parameters:**
- `config`: Configuration object with `streamType: string`
- `handler`: Transform function called for each line
- `init`: Optional initialization function called once when stream starts

## StreamInitContext Interface

The optional `init()` function receives context with stream initialization data:

```typescript
interface StreamInitContext {
  /** Stream type key from configuration. */
  streamType: string;

  /** Stream filename (relative path within card). */
  filename: string;

  /** HTTP request headers from the client initiating the stream. */
  headers: Record<string, string>;

  /** Card metadata. */
  card: {
    id: string;
    title?: string;
    metadata: Record<string, unknown>;
  };

  /** Mutable state Map shared with transform function (live in worker). */
  state: Map<string, unknown>;
}
```

## TransformContext Interface

The `transform()` function receives context with per-line data:

```typescript
interface TransformContext {
  /** 1-based line number in the stream. */
  lineNumber: number;

  /** Stream type key from configuration. */
  streamType: string;

  /** Same state Map instance from init() (undefined if init not provided). */
  state?: Map<string, unknown>;
}
```

## Security Model: Worker Isolation

Stream transforms run in **isolated worker threads** with a VM sandbox for security:

### Worker Isolation Benefits
- Each stream gets its own dedicated worker
- Workers cannot access the main application context
- State Maps are confined to the worker lifecycle
- No access to filesystem or network (except via explicit APIs)
- Worker terminates when stream closes

### Sandbox Restrictions
The VM sandbox restricts access to global objects:

- **Intentionally Excluded:** `setTimeout`, `setInterval` (prevent blocking)
- **Available:** `console`, `Map`, `JSON`, `Array`, `Object`, `String` utilities
- **Fetch:** Available for HTTP requests if needed
- **Import:** Limited to safe modules within the transform module

### State Map Lifecycle
- **Created:** When stream starts, before `init()` is called
- **Initialization:** `init()` can populate state with default values
- **Shared:** Same Map instance passed to `transform()` for each line
- **Lives In:** Worker memory (isolated from other streams)
- **Cleanup:** Automatically cleaned up when stream closes or worker terminates

**Important:** State is isolated per stream. Different stream instances do not share state Maps.

## Transform Examples

### Simple Markdown Wrapper

```javascript
// .cards/transforms/code-block.mjs
import { defineStreamTransform } from '@cards/configuration';

export default defineStreamTransform(
  { streamType: 'text' },
  function transform(line) {
    return `\`\`\`\n${line}\n\`\`\``;
  }
);
```

### JSON Parser with Line Numbers

```javascript
// .cards/transforms/json-pretty.mjs
import { defineStreamTransform } from '@cards/configuration';

export default defineStreamTransform(
  { streamType: 'json-log' },
  function transform(line, context) {
    try {
      const obj = JSON.parse(line);
      return `**Line ${context.lineNumber}:**\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\``;
    } catch {
      return line; // Return original on parse error
    }
  }
);
```

### Async Transform with State

```javascript
// .cards/transforms/enrich.mjs
import { defineStreamTransform } from '@cards/configuration';

function init(ctx) {
  ctx.state.set('cache', new Map());
  console.log(`Initializing enrichment for card ${ctx.card.id}`);
}

async function transform(line, context) {
  const cache = context.state.get('cache');
  const event = JSON.parse(line);

  if (!cache.has(event.userId)) {
    const res = await fetch(`https://api.example.com/users/${event.userId}`);
    cache.set(event.userId, await res.json());
  }

  const user = cache.get(event.userId);
  return `**${user.name}**: ${event.message}`;
}

export default defineStreamTransform(
  { streamType: 'event-stream' },
  transform,
  init
);
```

### Session Tracking with Init

```javascript
// .cards/transforms/session-counter.mjs
import { defineStreamTransform } from '@cards/configuration';

function init(ctx) {
  ctx.state.set('count', 0);
  ctx.state.set('sessionId', ctx.headers['x-session-id'] ?? 'unknown');
  ctx.state.set('startTime', Date.now());
}

function transform(line, context) {
  const count = (context.state.get('count') ?? 0) + 1;
  context.state.set('count', count);

  return `[Session: ${context.state.get('sessionId')}] [#${count}] ${line}`;
}

export default defineStreamTransform(
  { streamType: 'logs' },
  transform,
  init
);
```

## Backward Compatibility

**Transform modules without `defineStreamTransform`** continue to work for simple use cases:

```javascript
// Legacy pattern - still supported
export default function transform(line, context) {
  return line.toUpperCase();
}
```

This works for transforms that don't need:
- Initialization logic
- State management across lines
- Request headers or card metadata

For new transforms, **always use `defineStreamTransform`** to:
- Ensure proper worker isolation and security
- Enable state management via `init()`
- Receive full context including headers and card metadata

## Transform Path Resolution

| Path Type | Resolution |
|-----------|------------|
| Relative (e.g., `chat-formatter.mjs`) | `{workspace}/.cards/transforms/{path}` |
| Absolute (e.g., `/opt/transforms/fmt.mjs`) | Used as-is (warning logged) |

**Security:** Paths containing `..` are rejected to prevent directory traversal.

## Error Handling

When a transform throws an error or times out:

1. The **original line** is returned unchanged
2. A warning is logged to the server console
3. A `stream:error` event is broadcast to connected clients

Transforms should handle parse errors gracefully:

```javascript
import { defineStreamTransform } from '@cards/configuration';

export default defineStreamTransform(
  { streamType: 'json-log' },
  function transform(line) {
    try {
      const data = JSON.parse(line);
      return formatData(data);
    } catch {
      return line; // Fallback to original
    }
  }
);
```

## Development Checklist

- [ ] Transform file is in `.cards/transforms/` directory
- [ ] Transform uses `defineStreamTransform(config, handler, init?)` pattern
- [ ] Transform imports `defineStreamTransform` from `@cards/configuration`
- [ ] Optional `init()` function initializes state in `ctx.state`
- [ ] Transform `handler` accepts `(line: string, context: TransformContext)`
- [ ] Transform returns `string` (sync) or `Promise<string>` (async)
- [ ] Transform handles parse errors gracefully with try/catch
- [ ] State operations use `context.state.get()` and `context.state.set()`
- [ ] Stream type configured in environment's `streams` object
- [ ] Server restarted after transform code changes (transforms are cached)

</instructions>
