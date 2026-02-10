---
name: Cards Configuration SDK
description: This skill should be used when the user asks about "@cards/sdk/config", "cards extension settings", "defineAction", "defineTypeValidator", "type lifecycle hooks", "settings.config.ts", "validationSuccess", "validationError", "stream transforms", "TransformContext", "JSONL streaming", or mentions building settings.json for Cards Extension.
version: 1.0.0
---

## Purpose

This skill provides SDK documentation and development guidance for the `@cards/sdk/config` library. Use it to create type-safe action handlers, type validators, and lifecycle hooks for the Cards Extension.

## Build Process

Actions, validators, and stream transforms are compiled executables. Rebuild them after every code change.

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
import { fileURLToPath } from 'node:url';

export default defineAction(
  {
    actionName: 'Launch Claude',
    description: 'Start a Claude coding session',
    icon: './icons/claude.svg',
    supportsBackgroundMode: true,
    sourcePath: fileURLToPath(import.meta.url)
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

    const response = await fetch(`${input.apiBaseUrl}/cards/${input.cardId}`, {
      headers: { Authorization: `Bearer ${input.apiAccessToken}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch card: ${response.status}`);
    }

    logger.info('Claude session completed', { cardId: input.cardId });
  }
);
```

## Type Validator Example

Validators receive the file path via `ValidatorFileRequest` and read the file from disk themselves. Return a `ValidationResult` using `validationSuccess()` or `validationError()`:

```typescript
// src/validators/adaptive-card-validator.ts
import { readFileSync } from 'node:fs';
import {
  defineTypeValidator,
  validationSuccess,
  validationError
} from '@cards/sdk/config';
import { fileURLToPath } from 'node:url';

export default defineTypeValidator(
  {
    typeName: 'adaptive-card',
    sourcePath: fileURLToPath(import.meta.url)
  },
  async (request, context) => {
    let card: { type: string; version: string };
    try {
      const content = readFileSync(request.filePath, 'utf-8');
      card = JSON.parse(content) as { type: string; version: string };
    } catch {
      return validationError(['File must contain valid JSON']);
    }

    const errors: string[] = [];
    if (card.type !== 'AdaptiveCard') {
      errors.push('**type**: Must be `AdaptiveCard`');
    }

    if (errors.length > 0) {
      return validationError(errors);
    }

    context.logger.info('Validation passed', { file: context.fileName });
    return validationSuccess({ cardId: card.type });
  }
);
```

## Configuration File Structure

Define environments, actions, and types in `settings.config.ts`:

```typescript
import { defineConfig } from '@cards/sdk/config';
import launchClaude from './src/actions/launch-claude.js';
import adaptiveCardValidator from './src/validators/adaptive-card-validator.js';
import chatTransform from './src/transforms/chat-formatter.js';

export default defineConfig({
  environments: {
    default: {
      version: 1,
      description: 'Default environment',
      actions: [launchClaude],
      types: {
        'adaptive-card': {
          version: '1.0.0',
          validator: adaptiveCardValidator
        }
      },
      streams: {
        'chat-log': {
          version: 1,
          transform: chatTransform
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
import { fileURLToPath } from 'node:url';

// Create hook
export const create = defineTypeCreate(
  { typeName: 'adaptive-card', sourcePath: fileURLToPath(import.meta.url) },
  async (input, { logger }) => {
    logger.info('Card created', { file: input.fileName, hash: input.fileSha256.slice(0, 8) });
  }
);

// Update hook
export const update = defineTypeUpdate(
  { typeName: 'adaptive-card', sourcePath: fileURLToPath(import.meta.url) },
  async (input, { logger }) => {
    logger.info('Card updated', { file: input.fileName });
  }
);

// Delete hook
export const del = defineTypeDelete(
  { typeName: 'adaptive-card', sourcePath: fileURLToPath(import.meta.url) },
  async (input, { logger }) => {
    logger.info('Card deleted', { file: input.fileName });
  }
);
```

## Stream Transform Example

Stream transforms process JSONL lines in isolated `worker_threads` + `vm.SourceTextModule` sandboxes. Each stream gets its own worker with a `state` Map shared between the optional `init()` and the `transform()` function.

Create transform source files alongside other handlers:

```typescript
// src/transforms/session-counter.ts
import type { StreamInitContext, TransformContext } from '@cards/sdk/config';
import { defineStreamTransform } from '@cards/sdk/config/factories/stream-transform';

function handleInit(ctx: StreamInitContext): void {
  ctx.state.set('counter', 0);
  ctx.state.set('sessionId', ctx.headers['x-session-id'] ?? 'unknown');
}

function handleTransform(line: string, ctx: TransformContext): string {
  const count = ((ctx.state.get('counter') as number) ?? 0) + 1;
  ctx.state.set('counter', count);
  return `[${count}] ${line}`;
}

export default defineStreamTransform(
  {
    streamType: 'session-log',
    sourcePath: typeof URL !== 'undefined' ? new URL(import.meta.url).pathname : undefined,
    maxLineLength: 1_048_576
  },
  handleTransform,
  handleInit
);
```

Register stream transforms in `settings.config.ts` by passing the imported command object:

```typescript
import sessionLogTransform from './src/transforms/session-counter.js';

export default defineConfig({
  environments: {
    default: {
      // ...actions, types...
      streams: {
        'session-log': {         // Key must match streamType in factory config
          version: 1,
          transform: sessionLogTransform  // The imported command object
        }
      }
    }
  }
});
```

After `yarn build`, the CLI compiles stream transforms into self-contained `.mjs` bundles (platform: neutral, no externals) and writes `settings.json` with the compiled path.

## Factory Functions Reference

| Factory | Purpose | Config Fields |
|---------|---------|---------------|
| `defineAction` | Action handler | `actionName`, `id?`, `description?`, `icon?`, `supportsBackgroundMode?`, `allowConcurrent?`, `timeout?`, `sourcePath?` |
| `defineTypeValidator` | Pre-save validation | `typeName`, `timeout?`, `sourcePath?` |
| `defineTypeCreate` | New file hook | `typeName`, `timeout?`, `sourcePath?` |
| `defineTypeUpdate` | Modified file hook | `typeName`, `timeout?`, `sourcePath?` |
| `defineTypeDelete` | Deleted file hook | `typeName`, `timeout?`, `sourcePath?` |
| `defineStreamTransform` | Stream line transform | `streamType`, `timeout?`, `maxLineLength?`, `maxStreamSize?`, `sourcePath?` |

## Validation Response Builders

| Builder | Result | Use Case |
|---------|--------|----------|
| `validationSuccess(metadata?)` | `{ valid: true, metadata? }` | Validation passed; optional metadata stored in `.meta.json` sidecar |
| `validationError(errors)` | `{ valid: false, errors }` | Validation failed; `errors` is `string[]` of markdown-formatted messages |

## Development Checklist

Before debugging issues, verify:

- [ ] `@cards/sdk/config` is in `package.json` dependencies
- [ ] Build script exists: `"build": "cards-configuration build -c settings.config.ts -o dist"`
- [ ] Handlers rebuilt after last code change (`yarn build`)
- [ ] Handler files use `export default factoryFunction(...)` pattern
- [ ] Handlers include `sourcePath` (e.g. `new URL(import.meta.url).pathname`)
- [ ] Stream transforms do not use `require`, `fetch`, `setTimeout`, `fs`, or dynamic `import()` (sandbox forbids them)
- [ ] Stream transform tests run against the compiled `.mjs` bundle from `dist/bin/`

## Additional Resources

Consult these reference files for detailed information:

- **[reference/input-types.md](reference/input-types.md)**: ActionInput, TypeHookInput, ValidatorFileRequest
- **[reference/output-builders.md](reference/output-builders.md)**: Validation responses and error handling patterns
- **[reference/environment.md](reference/environment.md)**: CARDS_ENV_VARS and extraction utilities
- **[reference/logging.md](reference/logging.md)**: Logger API and configuration
- **[reference/testing.md](reference/testing.md)**: Testing utilities for validators
- **[reference/streams.md](reference/streams.md)**: Stream transforms and JSONL processing
