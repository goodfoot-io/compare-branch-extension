<instructions>

This document describes the environment variable system in `@cards/sdk/config`.

## Environment Variable Constants

The `CARDS_ENV_VARS` object provides the canonical names for all environment variables.

```typescript
import { CARDS_ENV_VARS } from '@cards/sdk/config';

// All environment variable names
CARDS_ENV_VARS.CARD_ID                       // 'CARD_ID'
CARDS_ENV_VARS.ACTION_NAME                   // 'ACTION_NAME'
CARDS_ENV_VARS.ENVIRONMENT                   // 'ENVIRONMENT'
CARDS_ENV_VARS.EXECUTION_MODE                // 'EXECUTION_MODE'
CARDS_ENV_VARS.CODING_AGENT                  // 'CODING_AGENT'
CARDS_ENV_VARS.TYPE_NAME                     // 'TYPE_NAME'
CARDS_ENV_VARS.TYPE_VERSION                  // 'TYPE_VERSION'
CARDS_ENV_VARS.FILE_NAME                     // 'FILE_NAME'
CARDS_ENV_VARS.FILE_PATH                     // 'FILE_PATH'
CARDS_ENV_VARS.FILE_SIZE                     // 'FILE_SIZE'
CARDS_ENV_VARS.SHA256                        // 'SHA256'
CARDS_ENV_VARS.CONTENT_TYPE                  // 'CONTENT_TYPE'
CARDS_ENV_VARS.VSCODE_NODE               // 'VSCODE_NODE'
CARDS_ENV_VARS.SOCKET_PATH                   // 'SOCKET_PATH'
CARDS_ENV_VARS.SWITCH_TO_INTERACTIVE_DATA_PATH // 'SWITCH_TO_INTERACTIVE_DATA_PATH'
CARDS_ENV_VARS.CONFIG_PATH                   // 'CONFIG_PATH'
CARDS_ENV_VARS.WORKSPACE_PATH                // 'WORKSPACE_PATH'
CARDS_ENV_VARS.CARD_REPO_PATH                // 'CARD_REPO_PATH'
```

## Variable Availability

| Variable | Actions | Type Lifecycle |
|----------|---------|----------------|
| `CARD_ID` | Yes | Yes |
| `ACTION_NAME` | Yes | No |
| `ENVIRONMENT` | Yes | Yes |
| `EXECUTION_MODE` | Yes | No |
| `CODING_AGENT` | Yes (optional) | No |
| `TYPE_NAME` | No | Yes |
| `TYPE_VERSION` | No | Yes |
| `FILE_NAME` | No | Yes |
| `FILE_PATH` | No | Yes |
| `FILE_SIZE` | No | Yes |
| `SHA256` | No | Yes |
| `CONTENT_TYPE` | No | Yes |
| `VSCODE_NODE` | Yes | Yes |
| `SOCKET_PATH` | Yes | No |
| `SWITCH_TO_INTERACTIVE_DATA_PATH` | Yes | No |
| `CONFIG_PATH` | Yes | No |
| `WORKSPACE_PATH` | Yes | No |
| `CARD_REPO_PATH` | Yes | No |

## Individual Getters

Each environment variable has a dedicated getter function with validation.

### Common Variables (All Handlers)

```typescript
import {
  getCardId,
  getEnvironment
} from '@cards/sdk/config';

// All throw Error if missing or empty
const cardId = getCardId();
const environment = getEnvironment();
```

### Common Variables (All Handlers) — continued

```typescript
import { getVscodeNodePath } from '@cards/sdk/config';

// Path to VS Code's bundled Node.js interpreter
// Used in settings.json command paths ($VSCODE_NODE ./bin/handler.mjs)
const nodePath = getVscodeNodePath();       // e.g., '/usr/share/code/node'
```

### Action-Specific Variables

```typescript
import {
  getActionName,
  getExecutionMode,
  getCodingAgent,
  getSocketPath,
  getSwitchToInteractiveDataPath,
  getConfigPath,
  getRepoRoot,
  getCardRepoPath
} from '@cards/sdk/config';

// Throws if missing, returns the action button display name
const actionName = getActionName();          // e.g., 'Launch Claude'

// Throws if missing, returns 'interactive' | 'background'
const mode = getExecutionMode();

// Returns string | undefined (does not throw)
const codingAgent = getCodingAgent();

// Additional action-specific variables
// socketPath, configPath, repoRoot, cardRepoPath throw Error if missing
const socketPath = getSocketPath();                        // e.g., '/tmp/socket-123'
// getSwitchToInteractiveDataPath returns string | undefined (does not throw)
const switchToInteractiveDataPath = getSwitchToInteractiveDataPath(); // Path to switch data
const configPath = getConfigPath();                        // Path to action config
const repoRoot = getRepoRoot();                            // Main git repository root
const cardRepoPath = getCardRepoPath();                    // Card repository path
```

### Type Hook Variables

```typescript
import {
  getTypeName,
  getTypeVersion,
  getFileName,
  getFilePath,
  getFileSize,
  getSha256,
  getContentType
} from '@cards/sdk/config';

// All throw Error if missing or empty
const typeName = getTypeName();      // e.g., 'adaptive-card'
const typeVersion = getTypeVersion(); // e.g., '1.0.0'
const fileName = getFileName();       // e.g., 'card.json'
const filePath = getFilePath();       // e.g., '/path/to/card.json'
const contentType = getContentType(); // e.g., 'application/json'

// getFileSize parses and validates as number
const fileSize = getFileSize();       // e.g., 1234

// getSha256 returns hex string
const sha256 = getSha256();           // e.g., 'abc123...'
```

## Typed Input Extraction

For convenience, extract complete typed input objects.

### Action Input

```typescript
import { extractActionInput } from '@cards/sdk/config';

// Returns ActionInput with all action variables
const input = extractActionInput();
// {
//   cardId: string,
//   actionName: string,
//   environment: string,
//   executionMode: 'interactive' | 'background',
//   codingAgent?: string,
//   switchToInteractiveData?: unknown,
//   repoRoot: string,
//   cardRepoPath: string
// }
```

### Type Hook Input

```typescript
import { extractTypeInput } from '@cards/sdk/config';

// Returns TypeHookInput with all type hook variables
const input = extractTypeInput();
// {
//   cardId: string,
//   environment: string,
//   typeName: string,
//   typeVersion: string,
//   fileName: string,
//   filePath: string,
//   fileSize: number,
//   fileSha256: string,
//   contentType: string
// }
```

## Error Handling

Getters throw descriptive errors when variables are missing:

```typescript
try {
  const cardId = getCardId();
} catch (error) {
  // Error: "Missing required environment variable: CARD_ID"
}

try {
  const mode = getExecutionMode();
} catch (error) {
  // Error: "Invalid EXECUTION_MODE: expected 'interactive' or 'background', got 'foo'"
}

try {
  const size = getFileSize();
} catch (error) {
  // Error: "Invalid FILE_SIZE: expected number, got 'not-a-number'"
}
```

## API Access

To make API calls, use the Cards client discovery function:

```typescript
import { createCardsClient } from '@cards/sdk/client/discovery';

async (input, { logger }) => {
  // Create a Cards API client via discovery
  const client = await createCardsClient();

  if (!client) {
    logger.warn('Cards API not available');
    return;
  }

  // Use the client to make authenticated API calls
  const card = await client.getCard(input.cardId);
  logger.info('Fetched card data', { cardId: input.cardId });
}
```

## Action Exit Codes

Actions can exit with specific codes to signal different outcomes:

```typescript
import { EXIT_CODES } from '@cards/sdk/config';

export default defineAction(
  { actionName: 'My Action' },
  async (input, context) => {
    // Normal completion (default exit code 0)

    // Signal switch to interactive mode
    process.exit(EXIT_CODES.SWITCH_TO_INTERACTIVE);  // exit code 42
  }
);
```

| Exit Code | Name | Meaning |
|-----------|------|---------|
| 0 | (normal) | Action completed successfully |
| 42 | `SWITCH_TO_INTERACTIVE` | User switched from background to interactive mode; action will be rerun with interactive context |
| Non-zero | (error) | Action failed with error |

When an action exits with `SWITCH_TO_INTERACTIVE` (42), the runtime will:
1. Store any pending data in the path specified by `SWITCH_TO_INTERACTIVE_DATA_PATH`
2. Rerun the action in interactive mode with `switchToInteractiveData` populated in `ActionInput`

</instructions>
