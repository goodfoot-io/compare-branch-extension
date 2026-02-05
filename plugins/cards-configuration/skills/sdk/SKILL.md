---
name: Cards Configuration SDK
description: This skill should be used when the user asks about "@cards/configuration", "cards extension settings", "defineActionStart", "defineActionEnd", "defineTypeValidator", "type lifecycle hooks", "settings.config.ts", "validationCreated", "validationError", "stream transforms", "TransformContext", "JSONL streaming", or mentions building settings.json for Cards Extension.
version: 1.0.0
---

## Purpose

This skill provides SDK documentation and development guidance for the `@cards/configuration` library. Use it to create type-safe action handlers, type validators, and lifecycle hooks for the Cards Extension.

## Build Process

Actions and validators are compiled executables. Rebuild them after every code change.

```bash
npx @cards/configuration build -c settings.config.ts -o dist
```

**Parameters:**
- `-c settings.config.ts`: Configuration file (TypeScript)
- `-o dist`: Output directory containing `settings.json` and `bin/` folder

## Action Handler Example

Create action start handlers with `defineActionStart`:

```typescript
// src/actions/launch-claude-start.ts
import { defineActionStart } from '@cards/configuration';
import { fileURLToPath } from 'node:url';

export default defineActionStart(
  {
    actionName: 'Launch Claude',
    description: 'Start a Claude coding session',
    icon: './icons/claude.svg',
    supportsBackgroundMode: true,
    sourcePath: fileURLToPath(import.meta.url)
  },
  async (input, { logger }) => {
    logger.info('Launching Claude', { cardId: input.cardId });

    const response = await fetch(`${input.apiBaseUrl}/cards/${input.cardId}`, {
      headers: { Authorization: `Bearer ${input.apiAccessToken}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch card: ${response.status}`);
    }
  }
);
```

Create paired end handlers with `defineActionEnd`:

```typescript
// src/actions/launch-claude-end.ts
import { defineActionEnd } from '@cards/configuration';
import { fileURLToPath } from 'node:url';

export default defineActionEnd(
  {
    actionName: 'Launch Claude',  // Must match start handler
    sourcePath: fileURLToPath(import.meta.url)
  },
  async (input, { logger }) => {
    logger.info('Claude session ended', { cardId: input.cardId });
  }
);
```

## Type Validator Example

Validators run before files are saved using HTTP stdin/stdout protocol:

```typescript
// src/validators/adaptive-card-validator.ts
import {
  defineTypeValidator,
  validationCreated,
  validationError,
  type ValidationError
} from '@cards/configuration';
import { fileURLToPath } from 'node:url';

export default defineTypeValidator(
  {
    typeName: 'adaptive-card',
    sourcePath: fileURLToPath(import.meta.url)
  },
  async (request, context) => {
    let card: { type: string; version: string };
    try {
      card = request.bodyJson();
    } catch {
      return validationError(400, [
        { code: 'PARSE_ERROR', message: 'Invalid JSON' }
      ]);
    }

    const errors: ValidationError[] = [];
    if (card.type !== 'AdaptiveCard') {
      errors.push({ code: 'INVALID_TYPE', message: 'type must be "AdaptiveCard"', field: 'type' });
    }

    if (errors.length > 0) {
      return validationError(422, errors, 'Validation failed');
    }

    context.logger.info('Validation passed', { file: context.fileName });
    return validationCreated({ cardId: card.type });
  }
);
```

## Configuration File Structure

Define environments, actions, and types in `settings.config.ts`:

```typescript
import { defineConfig } from '@cards/configuration';
import launchClaudeStart from './src/actions/launch-claude-start.js';
import launchClaudeEnd from './src/actions/launch-claude-end.js';
import adaptiveCardValidator from './src/validators/adaptive-card-validator.js';

export default defineConfig({
  environments: {
    default: {
      version: 1,
      description: 'Default environment',
      actions: [
        { start: launchClaudeStart, end: launchClaudeEnd }
      ],
      types: {
        'adaptive-card': {
          version: '1.0.0',
          validator: adaptiveCardValidator
        }
      },
      streams: {
        'chat-log': {
          version: 1,
          transform: { path: 'chat-formatter.mjs' }
        }
      }
    }
  }
});
```

## Type Lifecycle Hooks

Define hooks for create, update, and delete events:

```typescript
import { defineTypeCreate, defineTypeUpdate, defineTypeDelete } from '@cards/configuration';
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

## Stream Configuration Example

Stream transforms process JSONL lines as they arrive. Unlike actions and validators, transforms are plain ESM modules (not SDK factory functions) and don't require a rebuild step.

Create transform modules in `.cards/transforms/`:

```javascript
// .cards/transforms/chat-formatter.mjs
export default function transform(line, context) {
  try {
    const msg = JSON.parse(line);
    return `**${msg.role}** (line ${context.lineNumber}):\n${msg.content}`;
  } catch {
    return line; // Return original line on parse error
  }
}
```

Configure stream types in your environment:

```typescript
streams: {
  'chat-log': {
    version: 1,
    transform: {
      path: 'chat-formatter.mjs',  // Relative to .cards/transforms/
      timeout: 5000                 // Optional, default 5000ms
    },
    maxLineLength: 1048576,         // Optional, default 1MB
    maxStreamSize: 104857600        // Optional, default 100MB
  }
}
```

Transforms are cached after first load. Restart the server to reload updated transforms.

## Factory Functions Reference

| Factory | Purpose | Config Fields |
|---------|---------|---------------|
| `defineActionStart` | Action entry point | `actionName`, `description?`, `icon?`, `supportsBackgroundMode?`, `allowConcurrent?`, `timeout?`, `sourcePath?` |
| `defineActionEnd` | Post-action cleanup | `actionName`, `timeout?`, `sourcePath?` |
| `defineTypeValidator` | Pre-save validation | `typeName`, `timeout?`, `sourcePath?` |
| `defineTypeCreate` | New file hook | `typeName`, `timeout?`, `sourcePath?` |
| `defineTypeUpdate` | Modified file hook | `typeName`, `timeout?`, `sourcePath?` |
| `defineTypeDelete` | Deleted file hook | `typeName`, `timeout?`, `sourcePath?` |

## Validation Response Builders

| Builder | Status | Use Case |
|---------|--------|----------|
| `validationCreated(metadata?)` | 201 | New resource validated successfully |
| `validationUpdated(metadata?)` | 200 | Existing resource updated successfully |
| `validationError(status, errors, message?)` | 4xx/5xx | Validation failed |
| `validationResponse(response)` | Custom | Full control over response |

## Development Checklist

Before debugging issues, verify:

- [ ] `@cards/configuration` is in `package.json` dependencies
- [ ] Build script exists: `"build": "cards-configuration build -c settings.config.ts -o dist"`
- [ ] Handlers rebuilt after last code change
- [ ] No `console.log` or `console.error` in handler code (use `logger`)
- [ ] Handler files use `export default factoryFunction(...)` pattern
- [ ] Handlers include `sourcePath: fileURLToPath(import.meta.url)`

## Additional Resources

Consult these reference files for detailed information:

- **[reference/input-types.md](reference/input-types.md)**: ActionStartInput, TypeHookInput, TypeValidatorRequest
- **[reference/output-builders.md](reference/output-builders.md)**: Validation responses and error handling patterns
- **[reference/environment.md](reference/environment.md)**: CARDS_ENV_VARS and extraction utilities
- **[reference/logging.md](reference/logging.md)**: Logger API and configuration
- **[reference/testing.md](reference/testing.md)**: Testing utilities for validators
- **[reference/streams.md](reference/streams.md)**: Stream transforms and JSONL processing
