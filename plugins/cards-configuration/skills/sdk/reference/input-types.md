<instructions>

This document describes the typed input structures available in `@cards/configuration`.

## Action Input Types

### ActionInput

Input payload for action handlers. Extracted from environment variables by the runtime.

```typescript
interface ActionInput {
  cardId: string;                         // Unique card identifier
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

### TypeValidatorRequest

HTTP request for type validators. The file is NOT saved to disk until validation passes.

```typescript
interface TypeValidatorRequest {
  method: string;                      // HTTP method (e.g., 'PUT')
  path: string;                        // Request path (e.g., '/note/my-note.md')
  httpVersion: string;                 // HTTP version (e.g., 'HTTP/1.1')
  headers: Record<string, string>;     // HTTP headers (lowercase keys)
  body: Buffer;                        // Raw body content
  bodyText: string;                    // Body as UTF-8 string (getter)
  bodyJson: <T = unknown>() => T;      // Parse body as JSON
}
```

**Usage Example:**

```typescript
async (request: TypeValidatorRequest, context) => {
  // Access HTTP headers
  const contentType = request.headers['content-type'];

  // Get raw body
  const rawContent = request.body;

  // Get body as string
  const textContent = request.bodyText;

  // Parse body as JSON (throws on invalid JSON)
  const jsonData = request.bodyJson<MyType>();
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

Runtime context injected for action handlers.

```typescript
interface ActionContext {
  logger: ILogger;  // Logger for structured, context-aware logging
  cwd: string;      // Current working directory for the action
  onCancel(callback: () => void): void;  // Register cancellation handler
  onSwitchToInteractive(callback: (data: unknown) => void): void;  // Register switch handler
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
  onSwitchToInteractive((data) => {
    logger.info('User switched to interactive mode', { data });
    // Adjust behavior here if needed
  });

  // Use cwd for file operations
  const configPath = path.join(context.cwd, 'config.json');
  if (await fs.exists(configPath)) {
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
  }
}
```

### Typed Input Extraction

Extract complete typed input objects:

```typescript
import { extractActionInput, extractTypeInput } from '@cards/configuration';

// For action handlers
const actionInput = extractActionInput();
// Returns ActionInput with all fields

// For type hooks
const typeInput = extractTypeInput();
// Returns TypeHookInput with all fields
```

## Switch to Interactive Flow

Actions can signal a need to switch from background to interactive mode. This allows long-running background tasks to transition to interactive user control when needed.

### Initiating a Switch

From an action running in background mode, signal a switch to interactive:

```typescript
import { EXIT_CODES } from '@cards/configuration';

export default defineAction(
  { actionName: 'Long Task', sourcePath: fileURLToPath(import.meta.url) },
  async (input, context) => {
    const { logger, onSwitchToInteractive } = context;

    // Perform initial background work
    logger.info('Starting background phase');

    // When user requests interactive mode, prepare data and exit with special code
    onSwitchToInteractive((data) => {
      logger.info('User initiated switch to interactive', { data });

      // Save state to file for next run
      const stateData = {
        phase: 'interactive',
        previousProgress: { completed: 100 }
      };

      const switchDataPath = getenv('SWITCH_TO_INTERACTIVE_DATA_PATH');
      fs.writeFileSync(switchDataPath, JSON.stringify(stateData));

      // Exit with SWITCH_TO_INTERACTIVE code
      process.exit(EXIT_CODES.SWITCH_TO_INTERACTIVE);
    });

    // Continue background work...
  }
);
```

### Resuming with Interactive Data

When the action is rerun in interactive mode, the saved data is available:

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
| Data persistence | Via `SWITCH_TO_INTERACTIVE_DATA_PATH` | Via input.switchToInteractiveData |

</instructions>
