<instructions>

This document describes stream transform configuration in `@cards/configuration`.

## Stream Transforms vs SDK Handlers

**Important difference**: Stream transforms are plain ESM functions, not SDK factory functions. Unlike actions and validators:

- No `define*` wrapper required
- No `sourcePath` field needed
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

## Transform Function Signature

Transform modules must export a default function:

```typescript
// Sync signature
export default function transform(line: string, context?: TransformContext): string;

// Async signature
export default async function transform(line: string, context?: TransformContext): Promise<string>;
```

## TransformContext Interface

The optional second parameter provides stream context:

```typescript
interface TransformContext {
  /** 1-based line number in the stream. */
  lineNumber: number;
  /** Stream type key from configuration. */
  streamType: string;
}
```

## Transform Examples

### Simple Markdown Wrapper

```javascript
// .cards/transforms/code-block.mjs
export default function transform(line) {
  return `\`\`\`\n${line}\n\`\`\``;
}
```

### JSON Parser with Line Numbers

```javascript
// .cards/transforms/json-pretty.mjs
export default function transform(line, context) {
  try {
    const obj = JSON.parse(line);
    return `**Line ${context.lineNumber}:**\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\``;
  } catch {
    return line; // Return original on parse error
  }
}
```

### Async Transform

```javascript
// .cards/transforms/enrich.mjs
const cache = new Map();

export default async function transform(line, context) {
  const event = JSON.parse(line);

  if (!cache.has(event.userId)) {
    const res = await fetch(`https://api.example.com/users/${event.userId}`);
    cache.set(event.userId, await res.json());
  }

  const user = cache.get(event.userId);
  return `**${user.name}**: ${event.message}`;
}
```

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
export default function transform(line) {
  try {
    const data = JSON.parse(line);
    return formatData(data);
  } catch {
    return line; // Fallback to original
  }
}
```

## Development Checklist

- [ ] Transform file is in `.cards/transforms/` directory
- [ ] Transform uses `export default function` syntax
- [ ] Transform accepts `(line: string, context?: TransformContext)`
- [ ] Transform returns `string` (sync) or `Promise<string>` (async)
- [ ] Transform handles parse errors gracefully
- [ ] Stream type configured in environment's `streams` object
- [ ] Server restarted after transform code changes

</instructions>
