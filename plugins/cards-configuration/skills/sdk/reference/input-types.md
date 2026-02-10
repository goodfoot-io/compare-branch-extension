<instructions>

This document describes the typed input structures available in `@cards/sdk/config`.

## Action Input Types

### ActionInput

Input payload for action handlers. Extracted from environment variables by the runtime.

```typescript
interface ActionInput {
  cardId: string;                         // Unique card identifier
  actionName: string;                     // Action button display name (e.g., "Launch Claude")
  environment: string;                    // Environment name (e.g., "default")
  executionMode: 'interactive' | 'background';  // UI interaction model
  apiBaseUrl: string;                     // Cards server base URL
  apiAccessToken: string;                 // Bearer token for API calls
  codingAgent?: string;                   // Configured AI coding assistant
  switchToInteractiveData?: unknown;      // Data from user switching to interactive mode
  workspacePath: string;                  // Root workspace path
  cardRepoPath: string;                   // Card repository path
}
```

**Usage Example:**

```typescript
async (input: ActionInput, context) => {
  const { logger, onCancel, onSwitchToInteractive } = context;

  // Access card context
  logger.info(`Processing card ${input.cardId}`);
  logger.info(`Action: ${input.actionName}`);
  logger.info(`Environment: ${input.environment}`);

  // Handle cancellation
  onCancel(() => {
    logger.info('Action cancelled');
  });

  // Handle switch to interactive mode
  if (input.switchToInteractiveData) {
    logger.info('User switched to interactive', { data: input.switchToInteractiveData });
  }

  // Make authenticated API calls
  const response = await fetch(`${input.apiBaseUrl}/cards/${input.cardId}`, {
    headers: { Authorization: `Bearer ${input.apiAccessToken}` }
  });

  // Check execution mode for UI decisions
  if (input.executionMode === 'interactive') {
    // Show progress indicators
  }

  // Use workspace paths
  const configFile = path.join(input.workspacePath, 'config.json');
}
```

## Type Hook Input Types

### TypeHookInput

Input payload for type lifecycle hooks (create, update, delete).

```typescript
interface TypeHookInput {
  cardId: string;          // Unique card identifier
  environment: string;     // Environment name
  typeName: string;        // Registered type name (e.g., 'adaptive-card')
  typeVersion: string;     // Type version from settings.json
  fileName: string;        // File name within type directory
  filePath: string;        // Full absolute path to the file
  fileSize: number;        // File size in bytes
  fileSha256: string;      // SHA-256 hash of file content (hex string)
  contentType: string;     // MIME type (e.g., 'application/json')
  apiBaseUrl: string;      // Cards server base URL
  apiAccessToken: string;  // Bearer token for API calls
}
```

**Usage Example:**

```typescript
async (input: TypeHookInput, { logger }) => {
  logger.info('Processing typed file', {
    type: input.typeName,
    file: input.fileName,
    size: input.fileSize,
    hash: input.fileSha256.slice(0, 8)
  });

  // Read and process the file
  const content = await fs.readFile(input.filePath, 'utf-8');

  // Use hash for caching
  const cacheKey = `${input.typeName}:${input.fileSha256}`;
}
```

### ValidatorFileRequest

File-oriented request for type validators. The validator reads the file from disk using the provided path. If a `.meta.json` sidecar exists alongside the file, its parsed contents are provided as `metadata`.

```typescript
interface ValidatorFileRequest {
  filePath: string;                        // Absolute path to the file being validated
  metadata?: Record<string, unknown>;      // Parsed .meta.json sidecar content (if exists)
}
```

**Usage Example:**

```typescript
import { readFileSync } from 'node:fs';

async (request: ValidatorFileRequest, context) => {
  // Read the file from disk
  const content = readFileSync(request.filePath, 'utf-8');

  // Parse content
  const data = JSON.parse(content) as MyType;

  // Check existing sidecar metadata
  if (request.metadata) {
    const previousVersion = request.metadata['version'] as number;
    // Use previous metadata for comparison
  }

  // Validate and return result
  if (!data.id) {
    return validationError(['`id` field is required']);
  }
  return validationSuccess({ version: data.version });
}
```

### TypeValidatorContext

Context provided to type validators.

```typescript
interface TypeValidatorContext {
  logger: ILogger;        // Logger for structured logging
  cwd: string;            // Current working directory
  typeName: string;       // Registered type name
  typeVersion: string;    // Type version from settings.json
  fileName: string;       // File being validated
  cardId: string;         // Card identifier
  environment: string;    // Environment name
  apiBaseUrl: string;     // Cards server base URL
  apiAccessToken: string; // Bearer token for API calls
}
```

**Usage Example:**

```typescript
async (request, context: TypeValidatorContext) => {
  context.logger.info('Validating file', {
    type: context.typeName,
    version: context.typeVersion,
    file: context.fileName,
    card: context.cardId
  });
}
```

## Context Types

### ActionContext

Runtime context injected for **action** handlers. Not used for type lifecycle hooks — see `TypeHookContext`.

```typescript
interface ActionContext {
  logger: ILogger;  // Logger for structured, context-aware logging
  cwd: string;      // Current working directory for the action
  onCancel(callback: () => void | Promise<void>): void;  // Register cancellation handler
  onSwitchToInteractive(callback: () => unknown | Promise<unknown>): void;  // Register switch handler
}
```

**Usage Example:**

```typescript
async (input: ActionInput, context: ActionContext) => {
  const { logger, onCancel, onSwitchToInteractive } = context;

  logger.info('Action started', { cwd: context.cwd });

  // Register cancellation handler
  onCancel(() => {
    logger.info('User cancelled the action');
    // Cleanup code here
  });

  // Register handler for user switching to interactive mode
  onSwitchToInteractive(() => {
    logger.info('Switching to interactive mode');
    return { sessionId: 'abc123' };  // Data passed to relaunched handler
  });

  // Use cwd for file operations
  const configPath = path.join(context.cwd, 'config.json');
  if (await fs.exists(configPath)) {
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
  }
}
```

### TypeHookContext

Runtime context injected for type lifecycle hooks (create, update, delete). Unlike `ActionContext`, type hooks do not have `onCancel` or `onSwitchToInteractive` callbacks.

```typescript
interface TypeHookContext {
  logger: ILogger;  // Logger for structured logging
  cwd: string;      // Current working directory
}
```

**Usage Example:**

```typescript
async (input: TypeHookInput, context: TypeHookContext) => {
  context.logger.info('Processing type event', {
    type: input.typeName,
    file: input.fileName,
    cwd: context.cwd
  });
}
```

### Typed Input Extraction

Extract complete typed input objects:

```typescript
import { extractActionInput, extractTypeInput } from '@cards/sdk/config';

// For action handlers
const actionInput = extractActionInput();
// Returns ActionInput with all fields

// For type hooks
const typeInput = extractTypeInput();
// Returns TypeHookInput with all fields
```

## Switch to Interactive Flow

Actions can signal a need to switch from background to interactive mode. This allows long-running background tasks to transition to interactive user control when needed.

### Registering the Switch Callback

Register a callback with `onSwitchToInteractive()`. The callback takes **no arguments** and returns serializable data. The runtime handles everything else automatically: it sends the data via socket, then exits with code 42.

```typescript
export default defineAction(
  { actionName: 'Long Task', sourcePath: fileURLToPath(import.meta.url) },
  async (input, context) => {
    const { logger, onSwitchToInteractive } = context;

    // Perform initial background work
    logger.info('Starting background phase');

    // Register callback — runtime calls this when user requests interactive mode
    onSwitchToInteractive(() => {
      logger.info('Switching to interactive mode');

      // Return data to pass to the relaunched handler
      // The runtime sends this via socket and exits with code 42 automatically
      return {
        phase: 'interactive',
        previousProgress: { completed: 100 }
      };
    });

    // Continue background work...
  }
);
```

### Resuming with Interactive Data

When the action is rerun in interactive mode, the data returned by the callback is available via `input.switchToInteractiveData`:

```typescript
export default defineAction(
  { actionName: 'Long Task', sourcePath: fileURLToPath(import.meta.url) },
  async (input: ActionInput, context) => {
    const { logger } = context;

    // Check if we're resuming from a background phase
    if (input.switchToInteractiveData) {
      logger.info('Resuming in interactive mode', {
        previousData: input.switchToInteractiveData
      });

      // Resume from saved state
      const state = input.switchToInteractiveData as { phase: string; previousProgress: unknown };
      logger.info(`Continuing from phase: ${state.phase}`);
    } else {
      logger.info('Starting fresh in interactive mode');
    }
  }
);
```

### Key Differences in Interactive Mode

| Aspect | Background Mode | Interactive Mode |
|--------|-----------------|------------------|
| User can see output | No | Yes |
| Can wait for user input | No | Yes |
| Timeout | Shorter (background ops) | Longer (user interactions) |
| Cancellation | Silent | Visible in UI |
| Data persistence | Callback return value sent via socket | Via `input.switchToInteractiveData` |

</instructions>
