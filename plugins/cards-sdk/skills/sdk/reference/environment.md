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
CARDS_ENV_VARS.VSCODE_NODE               // 'VSCODE_NODE'
CARDS_ENV_VARS.SOCKET_PATH                   // 'SOCKET_PATH'
CARDS_ENV_VARS.SWITCH_TO_INTERACTIVE_DATA_PATH // 'SWITCH_TO_INTERACTIVE_DATA_PATH'
CARDS_ENV_VARS.CONFIG_PATH                   // 'CONFIG_PATH'
CARDS_ENV_VARS.WORKSPACE_PATH                // 'WORKSPACE_PATH'
CARDS_ENV_VARS.CARD_REPO_PATH                // 'CARD_REPO_PATH'
```

## Variable Availability

| Variable | Actions |
|----------|---------|
| `CARD_ID` | Yes |
| `ACTION_NAME` | Yes |
| `ENVIRONMENT` | Yes |
| `EXECUTION_MODE` | Yes |
| `CODING_AGENT` | Yes (optional) |
| `VSCODE_NODE` | Yes |
| `SOCKET_PATH` | Yes |
| `SWITCH_TO_INTERACTIVE_DATA_PATH` | Yes |
| `CONFIG_PATH` | Yes |
| `WORKSPACE_PATH` | Yes |
| `CARD_REPO_PATH` | Yes |

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
