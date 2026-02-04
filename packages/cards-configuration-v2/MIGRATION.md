# Migration Guide: v1 to v2

## Overview

`@cards/configuration-v2` is a complete redesign of the Cards Extension configuration system, prioritizing type safety, compile-time validation, and developer experience. While the handler authoring experience remains familiar, the configuration approach and CLI workflow have been simplified and strengthened with TypeScript's type system.

### Why v2?

**Problems in v1:**
- Legacy hooks (StartCard, EndCard) coexisted with new actions, creating confusion
- AST-based discovery was implicit and difficult to debug
- Action start/end pairing wasn't validated until build time
- No compile-time detection of typos in config objects

**Improvements in v2:**
- Actions-only system (legacy hooks removed)
- Single `settings.config.ts` file with direct imports (no AST scanning)
- Compile-time action pairing validation via TypeScript generics
- `SameShape` utility catches config typos at compile time
- Simpler CLI workflow with better error messages

## Quick Reference

### Package Name
```typescript
// v1
import { actionStart } from '@cards/configuration';

// v2
import { defineActionStart } from '@cards/configuration-v2';
```

### Factory Functions
| v1 Function | v2 Function |
|-------------|-------------|
| `actionStart` | `defineActionStart` |
| `actionEnd` | `defineActionEnd` |
| `typeValidator` | `defineTypeValidator` |
| `typeCreate` | `defineTypeCreate` |
| `typeUpdate` | `defineTypeUpdate` |
| `typeDelete` | `defineTypeDelete` |

### Configuration
| v1 | v2 |
|----|-----|
| Individual handler files discovered via AST | Single `settings.config.ts` with direct imports |
| No config helper | `defineConfig()` for IDE intellisense |
| No start/end pairing validation | `ActionPair<N>` enforces matching action names |
| Manual settings.json generation | `serializeSettings()` extracts metadata |

## Breaking Changes

### 1. Package Rename

**Change:** Package name changed from `@cards/configuration` to `@cards/configuration-v2`.

**Migration:**
```diff
- "dependencies": {
-   "@cards/configuration": "^1.0.0"
- }
+ "dependencies": {
+   "@cards/configuration-v2": "^1.0.0"
+ }
```

### 2. Factory Function Names

**Change:** All factory functions renamed with `define` prefix for clarity.

**Migration:**
```diff
- import { actionStart, actionEnd, typeValidator } from '@cards/configuration';
+ import { defineActionStart, defineActionEnd, defineTypeValidator } from '@cards/configuration-v2';

- export default actionStart({ actionName: 'Launch' }, handler);
+ export default defineActionStart({ actionName: 'Launch' }, handler);
```

### 3. Configuration Approach

**Change:** Single `settings.config.ts` file replaces AST-based handler discovery.

**v1 Approach:**
```typescript
// v1: actions/launch-start.ts
import { actionStart } from '@cards/configuration';

export default actionStart(
  { actionName: 'Launch Claude' },
  async (input, { logger }) => {
    // Handler code
  }
);

// v1: actions/launch-end.ts
import { actionEnd } from '@cards/configuration';

export default actionEnd(
  { actionName: 'Launch Claude' },
  async (input, { logger }) => {
    // Handler code
  }
);

// CLI discovers these via AST scanning
```

**v2 Approach:**
```typescript
// v2: actions/launch-start.ts
import { defineActionStart } from '@cards/configuration-v2';

export default defineActionStart(
  { actionName: 'Launch Claude' },
  async (input, { logger }) => {
    // Handler code (same as v1)
  }
);

// v2: actions/launch-end.ts
import { defineActionEnd } from '@cards/configuration-v2';

export default defineActionEnd(
  { actionName: 'Launch Claude' },
  async (input, { logger }) => {
    // Handler code (same as v1)
  }
);

// v2: settings.config.ts (NEW!)
import { defineConfig } from '@cards/configuration-v2';
import launchStart from './actions/launch-start.js';
import launchEnd from './actions/launch-end.js';

export default defineConfig({
  environments: {
    default: {
      version: 1,
      actions: [
        { start: launchStart, end: launchEnd }
      ]
    }
  }
});
```

### 4. Legacy Hooks Removed

**Change:** Legacy hook support (StartCard, EndCard, StartInterview, EndInterview) removed entirely.

**Migration:** Convert legacy hooks to actions. See "Converting Legacy Hooks" section below.

### 5. hooks.json No Longer Supported

**Change:** `hooks.json` discovery removed. Only `settings.config.ts` is supported.

**Migration:** Create a `settings.config.ts` file as shown above.

### 6. Environment Variable Changes

**Change:** Some environment variable helpers were removed or renamed.

**Removed:**
- `getHookIpcSocket()` - IPC socket no longer used
- `getExecutionWrapperPid()` - Execution wrapper PID no longer exposed

**Renamed:**
- `extractInput()` → `extractActionInput()` and `extractTypeInput()`

**Migration:**
```diff
- import { extractInput } from '@cards/configuration';
+ import { extractActionInput, extractTypeInput } from '@cards/configuration-v2';

// For action handlers
- const input = extractInput(process.env);
+ const input = extractActionInput(process.env);

// For type validators
+ const input = extractTypeInput(process.env);
```

### 7. CLI Command Changes

**Change:** CLI command simplified with cleaner arguments.

**v1 CLI:**
```bash
cards-configuration build --discover-hooks
```

**v2 CLI:**
```bash
cards-configuration-v2 build -c settings.config.ts -o dist/
cards-configuration-v2 build --config settings.config.ts --outdir dist/
```

**Migration:** Update your build scripts:
```diff
{
  "scripts": {
-   "build": "cards-configuration build --discover-hooks"
+   "build": "cards-configuration-v2 build -c settings.config.ts -o dist/"
  }
}
```

## New Features

### 1. defineConfig() Helper

Provides IDE intellisense and type checking without explicit type annotations.

```typescript
import { defineConfig } from '@cards/configuration-v2';

export default defineConfig({
  environments: {
    default: {
      version: 1,
      actions: [/* ... */]
    }
  }
});
```

### 2. Compile-Time Action Pairing

TypeScript validates that start and end actions have matching names.

```typescript
const launchStart = defineActionStart({ actionName: 'Launch' }, handler);
const launchEnd = defineActionEnd({ actionName: 'Launch' }, handler);

// Valid: names match
{ start: launchStart, end: launchEnd }

// TypeScript error: names don't match
const deployEnd = defineActionEnd({ actionName: 'Deploy' }, handler);
{ start: launchStart, end: deployEnd } // ❌ Type error!
```

### 3. SameShape Utility

Catches typos in config objects at compile time.

```typescript
// v1: No error, silently ignored
actionStart({ actionNme: 'Launch' }, handler); // Typo in 'actionNme'

// v2: TypeScript error
defineActionStart({ actionNme: 'Launch' }, handler);
// ❌ Error: Object literal may only specify known properties,
//    and 'actionNme' does not exist in type 'ActionStartConfig'
```

### 4. ActionPair<N> Type

Generic type for enforcing action name consistency.

```typescript
import type { ActionPair } from '@cards/configuration-v2';

// Type parameter N ensures start/end match
const pair: ActionPair<'Launch'> = {
  start: launchStart, // Must have actionName: 'Launch'
  end: launchEnd      // Must have actionName: 'Launch'
};
```

### 5. serializeSettings()

Programmatically extract settings.json from config objects.

```typescript
import { defineConfig, serializeSettings } from '@cards/configuration-v2';

const config = defineConfig({ /* ... */ });
const settings = serializeSettings(config);
// Returns settings.json-compatible object
```

### 6. Enhanced Type Safety

Literal types preserved throughout the system for better type inference.

```typescript
// Action name preserved as literal type
const cmd: ActionStartCommand<'Launch'> = defineActionStart(
  { actionName: 'Launch' },
  handler
);

// Type narrowing works correctly
if (cmd.__factoryType === 'ActionStart') {
  console.log(cmd.actionName); // Type: 'Launch' (not string)
}
```

## Migration Steps

### Step 1: Update Dependencies

```bash
# Remove v1
yarn remove @cards/configuration

# Add v2
yarn add @cards/configuration-v2
```

### Step 2: Rename Factory Imports

Update all handler files to use the new factory names:

```diff
- import { actionStart, actionEnd } from '@cards/configuration';
+ import { defineActionStart, defineActionEnd } from '@cards/configuration-v2';
```

### Step 3: Update Factory Calls

Replace factory function calls with the new names:

```diff
- export default actionStart({ actionName: 'Launch' }, handler);
+ export default defineActionStart({ actionName: 'Launch' }, handler);
```

### Step 4: Create settings.config.ts

Create a new `settings.config.ts` file in your project root:

```typescript
import { defineConfig } from '@cards/configuration-v2';

// Import all handlers
import launchStart from './actions/launch-start.js';
import launchEnd from './actions/launch-end.js';
import noteValidator from './types/note-validator.js';

export default defineConfig({
  environments: {
    default: {
      version: 1,
      actions: [
        { start: launchStart, end: launchEnd }
      ],
      types: {
        note: {
          version: '1.0.0',
          validator: noteValidator
        }
      }
    }
  }
});
```

### Step 5: Update Build Scripts

Update your package.json build command:

```diff
{
  "scripts": {
-   "build": "cards-configuration build"
+   "build": "cards-configuration-v2 build -c settings.config.ts -o dist/"
  }
}
```

### Step 6: Update Environment Variable Usage

If you use `extractInput()`, update to the new functions:

```diff
- import { extractInput } from '@cards/configuration';
+ import { extractActionInput } from '@cards/configuration-v2';

- const input = extractInput(process.env);
+ const input = extractActionInput(process.env);
```

### Step 7: Test Your Migration

Run your tests and build to verify everything works:

```bash
yarn build
yarn test
```

## Converting Legacy Hooks

If you're using legacy hooks (StartCard, EndCard, etc.), convert them to actions:

### Legacy StartCard → Action Start

**Before (v1):**
```typescript
import { hookStart } from '@cards/configuration';

export default hookStart(
  { event: 'StartCard' },
  async (input, { logger }) => {
    logger.info('Card started', { cardId: input.cardId });
  }
);
```

**After (v2):**
```typescript
import { defineActionStart } from '@cards/configuration-v2';

export default defineActionStart(
  { actionName: 'Default Action' },
  async (input, { logger }) => {
    logger.info('Action started', { cardId: input.cardId });
  }
);
```

### Legacy EndCard → Action End

**Before (v1):**
```typescript
import { hookEnd } from '@cards/configuration';

export default hookEnd(
  { event: 'EndCard' },
  async (input, { logger }) => {
    logger.info('Card ended', { cardId: input.cardId });
  }
);
```

**After (v2):**
```typescript
import { defineActionEnd } from '@cards/configuration-v2';

export default defineActionEnd(
  { actionName: 'Default Action' },
  async (input, { logger }) => {
    logger.info('Action ended', { cardId: input.cardId });
  }
);
```

## Examples

### Complete Action Migration

**v1 Project Structure:**
```
my-extension/
├── actions/
│   ├── launch-start.ts
│   └── launch-end.ts
└── package.json
```

**v1 launch-start.ts:**
```typescript
import { actionStart } from '@cards/configuration';

export default actionStart(
  {
    actionName: 'Launch Claude',
    description: 'Start Claude coding session',
    icon: '$CARDS_PLUGIN_ROOT/icons/claude.svg'
  },
  async (input, { logger }) => {
    logger.info('Launching Claude', { cardId: input.cardId });
    // Implementation
  }
);
```

**v2 Project Structure:**
```
my-extension/
├── actions/
│   ├── launch-start.ts
│   └── launch-end.ts
├── settings.config.ts  ← NEW!
└── package.json
```

**v2 launch-start.ts:**
```typescript
import { defineActionStart } from '@cards/configuration-v2';

export default defineActionStart(
  {
    actionName: 'Launch Claude',
    description: 'Start Claude coding session',
    icon: '$CARDS_PLUGIN_ROOT/icons/claude.svg'
  },
  async (input, { logger }) => {
    logger.info('Launching Claude', { cardId: input.cardId });
    // Implementation (same as v1)
  }
);
```

**v2 settings.config.ts:**
```typescript
import { defineConfig } from '@cards/configuration-v2';
import launchStart from './actions/launch-start.js';
import launchEnd from './actions/launch-end.js';

export default defineConfig({
  environments: {
    default: {
      version: 1,
      actions: [
        { start: launchStart, end: launchEnd }
      ]
    }
  }
});
```

### Type Validator Migration

**v1 note-validator.ts:**
```typescript
import { typeValidator, validationCreated } from '@cards/configuration';

export default typeValidator(
  { typeName: 'note' },
  async (request, context) => {
    const content = request.body.toString('utf-8');
    if (content.length === 0) {
      return context.validationError('Note cannot be empty');
    }
    return validationCreated();
  }
);
```

**v2 note-validator.ts:**
```typescript
import { defineTypeValidator, validationCreated } from '@cards/configuration-v2';

export default defineTypeValidator(
  { typeName: 'note' },
  async (request, context) => {
    const content = request.body.toString('utf-8');
    if (content.length === 0) {
      return context.validationError('Note cannot be empty');
    }
    return validationCreated();
  }
);
```

**v2 settings.config.ts:**
```typescript
import { defineConfig } from '@cards/configuration-v2';
import noteValidator from './types/note-validator.js';

export default defineConfig({
  environments: {
    default: {
      version: 1,
      types: {
        note: {
          version: '1.0.0',
          validator: noteValidator
        }
      }
    }
  }
});
```

## FAQ

### Q: Can I use both v1 and v2 in the same project?

**A:** No. v1 and v2 are not compatible and cannot coexist. You must fully migrate to v2.

### Q: Will my existing handlers work in v2?

**A:** Yes, with minimal changes. The handler function signature is unchanged - you only need to:
1. Update import statements
2. Rename factory function calls
3. Create a `settings.config.ts` file

### Q: What happened to hooks.json?

**A:** Removed entirely in v2. Use `settings.config.ts` with direct imports instead.

### Q: How do I handle multiple environments?

**A:** Define multiple environment keys in your config:

```typescript
export default defineConfig({
  environments: {
    default: {
      version: 1,
      actions: [/* ... */]
    },
    staging: {
      version: 1,
      actions: [/* ... */]
    },
    production: {
      version: 1,
      actions: [/* ... */]
    }
  }
});
```

### Q: Can I share handlers between environments?

**A:** Yes! Import and reuse the same handler in multiple environments:

```typescript
import launchStart from './actions/launch-start.js';

export default defineConfig({
  environments: {
    default: {
      version: 1,
      actions: [{ start: launchStart }]
    },
    staging: {
      version: 1,
      actions: [{ start: launchStart }] // Same handler
    }
  }
});
```

### Q: What if my start and end actions have different names?

**A:** TypeScript will catch this at compile time and show an error. Fix it by ensuring the `actionName` field matches exactly:

```typescript
// ❌ This will error
const start = defineActionStart({ actionName: 'Launch' }, handler);
const end = defineActionEnd({ actionName: 'Launch Claude' }, handler);
{ start, end } // Type error!

// ✅ This works
const start = defineActionStart({ actionName: 'Launch Claude' }, handler);
const end = defineActionEnd({ actionName: 'Launch Claude' }, handler);
{ start, end } // OK!
```

### Q: Do I need to update my TypeScript version?

**A:** v2 requires TypeScript 5.0+ for optimal type inference. Update if you're on an older version:

```bash
yarn add -D typescript@^5.9.0
```

### Q: How do I debug issues with settings.config.ts?

**A:** Use the `--log` flag to capture detailed build output:

```bash
cards-configuration-v2 build -c settings.config.ts -o dist/ --log build.log
```

### Q: Can I use TypeScript path aliases in settings.config.ts?

**A:** Yes! The CLI uses `jiti` for TypeScript execution, which respects your `tsconfig.json` paths.

### Q: What's the benefit of SameShape over regular TypeScript?

**A:** `SameShape` provides **excess property detection** even when you don't explicitly type your config object:

```typescript
// Without SameShape - no error
const config = { actionNme: 'Launch' };
actionStart(config, handler); // Silently ignores 'actionNme'

// With SameShape - immediate error
defineActionStart({ actionNme: 'Launch' }, handler);
// ❌ Error: 'actionNme' does not exist
```

## Need Help?

- **Documentation:** Check the v2 README for detailed API documentation
- **Examples:** See the `examples/` directory in the repository
- **Type Definitions:** Use your IDE's "Go to Definition" on any v2 type for inline documentation
- **Issues:** Report problems at https://github.com/goodfoot-io/marketplace/issues
