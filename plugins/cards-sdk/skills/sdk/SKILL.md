---
name: Cards Configuration SDK
description: This skill should be used when the user asks about "@cards/sdk/config", "cards extension settings", "defineAction", "type lifecycle hooks", "settings.config.ts", "stream renderers", "wwwRoot", "iframe renderer", "JSONL streaming", or mentions building settings.json for Cards Extension.
version: 1.0.0
---

## Purpose

SDK documentation for the `@cards/sdk/config` library: type-safe action handlers and lifecycle hooks for the Cards Extension.

## Build Process

Actions and stream renderer www-root directories are processed at build time. Rebuild after every code change.

```bash
npx @cards/sdk/config build -c settings.config.ts -o dist
```

**Parameters:**
- `-c settings.config.ts`: Configuration file (TypeScript)
- `-o dist`: Output directory containing `settings.json` and `bin/` folder

## Action Handler Example

Create action handlers with `defineAction`:

```typescript
// src/actions/launch-claude.ts
import { defineAction } from '@cards/sdk/config';

export default defineAction(
  {
    actionName: 'Launch Claude',
    description: 'Start a Claude coding session',
    icon: './icons/claude.svg',
    supportsBackgroundMode: true
  },
  async (input, context) => {
    const { logger, onCancel, onSwitchToInteractive } = context;

    logger.info('Launching Claude', { action: input.actionName, cardId: input.cardId });

    // Handle cancellation
    onCancel(() => {
      logger.info('Action cancelled by user');
    });

    // Handle switch to interactive mode
    onSwitchToInteractive(() => {
      logger.info('Switching to interactive mode');
      return { cardId: input.cardId };
    });

    logger.info('Claude session completed', { cardId: input.cardId });
  }
);
```

## Configuration File Structure

Define environments, actions, types, and streams in `settings.config.ts`:

```typescript
import { defineConfig } from '@cards/sdk/config';
import launchClaude from './src/actions/launch-claude.js';

export default defineConfig({
  environments: {
    default: {
      version: 1,
      description: 'Default environment',
      actions: [launchClaude],
      types: {
        'adaptive-card': {
          version: '1.0.0'
        }
      },
      streams: {
        'chat-log': {
          version: 1,
          wwwRoot: './src/streams/chat-log/www',
          maxLineLength: 1_048_576
        }
      }
    }
  }
});
```

## Type Lifecycle Hooks

Define hooks for create, update, and delete events:

```typescript
import { defineTypeCreate, defineTypeUpdate, defineTypeDelete } from '@cards/sdk/config';

// Create hook
export const create = defineTypeCreate(
  { typeName: 'adaptive-card' },
  async (input, { logger }) => {
    logger.info('Card created', { file: input.fileName, hash: input.fileSha256.slice(0, 8) });
  }
);

// Update hook
export const update = defineTypeUpdate(
  { typeName: 'adaptive-card' },
  async (input, { logger }) => {
    logger.info('Card updated', { file: input.fileName });
  }
);

// Delete hook
export const del = defineTypeDelete(
  { typeName: 'adaptive-card' },
  async (input, { logger }) => {
    logger.info('Card deleted', { file: input.fileName });
  }
);
```

## Stream Renderer Example

Stream renderers are static HTML files served in an iframe. The host extension injects `window.__STREAM_INIT__` before loading the iframe and communicates via `postMessage`. Use `@cards/sdk/stream-store` for the data layer.

Place renderer files in a `www/` directory alongside other handler sources:

```
my-config/
├── settings.config.ts
└── src/
    ├── actions/
    └── streams/
        └── my-stream/
            └── www/
                └── index.html   # Renderer entry point
```

Register the renderer in `settings.config.ts` using `wwwRoot`:

```typescript
streams: {
  'my-stream': {
    version: 1,
    wwwRoot: './src/streams/my-stream/www',  // Directory copied to dist at build time
    maxLineLength: 1_048_576
  }
}
```

Minimal renderer template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: monospace; padding: 8px; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    import { streamStore, subscribe, setHeight } from '@cards/sdk/stream-store';

    const root = document.getElementById('root');

    function render(lines) {
      root.textContent = lines.join('\n');
      setHeight(document.body.scrollHeight);
    }

    const state = streamStore.getState();
    const primary = state.files.get(state.primary);

    if (primary) {
      render(primary.lines);
    } else {
      subscribe(state.primary);
    }

    streamStore.subscribe((newState) => {
      const file = newState.files.get(newState.primary);
      if (file) render(file.lines);
    });
  </script>
</body>
</html>
```

## Factory Functions Reference

| Factory | Purpose | Config Fields |
|---------|---------|---------------|
| `defineAction` | Action handler | `actionName`, `id?`, `description?`, `icon?`, `supportsBackgroundMode?`, `allowConcurrent?`, `timeout?` |
| `defineTypeCreate` | New file hook | `typeName`, `timeout?` |
| `defineTypeUpdate` | Modified file hook | `typeName`, `timeout?` |
| `defineTypeDelete` | Deleted file hook | `typeName`, `timeout?` |

## Stream Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `number` | Yes | Schema version (currently `1`) |
| `wwwRoot` | `string` | Yes | Path to the renderer directory, relative to `settings.config.ts` |
| `entrypoint` | `string?` | No | HTML file within `wwwRoot` to load (default: `index.html`) |
| `maxLineLength` | `number?` | No | Max bytes per line before truncation (default: 1 MB) |
| `maxStreamSize` | `number?` | No | Max cumulative bytes before auto-close (default: 100 MB) |

## Development Checklist

Before debugging issues, verify:

- [ ] `@cards/sdk/config` is in `package.json` dependencies
- [ ] Build script exists: `"build": "cards-sdk build -c settings.config.ts -o dist"`
- [ ] Handlers rebuilt after last code change (`yarn build`)
- [ ] Handler files use `export default factoryFunction(...)` pattern
- [ ] Stream renderer `wwwRoot` path exists and contains `index.html`
- [ ] Stream renderer imports `@cards/sdk/stream-store` for data access

## Additional Resources

Consult these reference files for detailed information:

- **[reference/input-types.md](reference/input-types.md)**: ActionInput, TypeHookInput
- **[reference/environment.md](reference/environment.md)**: CARDS_ENV_VARS and extraction utilities
- **[reference/logging.md](reference/logging.md)**: Logger API and configuration
- **[reference/streams.md](reference/streams.md)**: Stream renderer configuration and the stream-store SDK
