<instructions>

This document describes the typed input structures available in `@cards/configuration`.

## Action Input Types

### ActionStartInput

Input payload for action start handlers. Extracted from environment variables by the runtime.

```typescript
interface ActionStartInput {
  cardId: string;                         // Unique card identifier
  environment: string;                    // Environment name (e.g., "default")
  executionMode: 'interactive' | 'background';  // UI interaction model
  apiBaseUrl: string;                     // Cards server base URL
  apiAccessToken: string;                 // Bearer token for API calls
  codingAgent?: string;                   // Configured AI coding assistant
}
```

**Usage Example:**

```typescript
async (input: ActionStartInput, { logger }) => {
  // Access card context
  logger.info(`Processing card ${input.cardId}`);
  logger.info(`Environment: ${input.environment}`);

  // Make authenticated API calls
  const response = await fetch(`${input.apiBaseUrl}/cards/${input.cardId}`, {
    headers: { Authorization: `Bearer ${input.apiAccessToken}` }
  });

  // Check execution mode for UI decisions
  if (input.executionMode === 'interactive') {
    // Show progress indicators
  }
}
```

### ActionEndInput

Input payload for action end handlers. Identical structure to `ActionStartInput`.

```typescript
type ActionEndInput = ActionStartInput;
```

**Note:** The end handler only runs when the start handler exits successfully (code 0).

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

Runtime context injected for all action and type handlers.

```typescript
interface ActionContext {
  logger: ILogger;  // Logger for structured, context-aware logging
  cwd: string;      // Current working directory for the action
}
```

**Usage Example:**

```typescript
async (input, context: ActionContext) => {
  context.logger.info('Action started', { cwd: context.cwd });

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
// Returns ActionStartInput with all fields

// For type hooks
const typeInput = extractTypeInput();
// Returns TypeHookInput with all fields
```

</instructions>
