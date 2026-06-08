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
CARDS_ENV_VARS.VSCODE_NODE                   // 'VSCODE_NODE'
CARDS_ENV_VARS.NODE                          // 'NODE'
CARDS_ENV_VARS.SOCKET_PATH                   // 'SOCKET_PATH'
CARDS_ENV_VARS.SWITCH_TO_INTERACTIVE_DATA_PATH // 'SWITCH_TO_INTERACTIVE_DATA_PATH'
CARDS_ENV_VARS.CONFIG_PATH                   // 'CONFIG_PATH'
CARDS_ENV_VARS.WORKSPACE_PATH                // 'WORKSPACE_PATH'
CARDS_ENV_VARS.REPO_ROOT                     // 'REPO_ROOT'
CARDS_ENV_VARS.CARD_REPO_PATH                // 'CARD_REPO_PATH'
CARDS_ENV_VARS.BASE_BRANCH                   // 'BASE_BRANCH'
CARDS_ENV_VARS.PARENT_BRANCH                 // 'PARENT_BRANCH'
CARDS_ENV_VARS.WORKSPACE_BRANCH              // 'WORKSPACE_BRANCH'
CARDS_ENV_VARS.EXTENSION_PATH                // 'EXTENSION_PATH'
CARDS_ENV_VARS.MARKETPLACE_PATH              // 'MARKETPLACE_PATH'
CARDS_ENV_VARS.HOOKS_LOG_FILE                // 'CARDS_HOOKS_LOG_FILE'
```

> `CARDS_ENV_VARS` also defines wrapper-internal keys consumed by the runtime rather than handlers (`ACTION_COMMAND`, `CARDS_SESSION_ID`, `CARDS_TRANSCRIPT_PATH`). Note that `HOOKS_LOG_FILE` maps to the env var name `'CARDS_HOOKS_LOG_FILE'`.

## Variable Availability

| Variable | Actions |
|----------|---------|
| `CARD_ID` | Yes |
| `ACTION_NAME` | Yes |
| `ENVIRONMENT` | Yes |
| `EXECUTION_MODE` | Yes |
| `CODING_AGENT` | Yes (optional) |
| `VSCODE_NODE` | Yes |
| `NODE` | Yes |
| `SOCKET_PATH` | Yes |
| `SWITCH_TO_INTERACTIVE_DATA_PATH` | Yes (optional) |
| `CONFIG_PATH` | Yes |
| `WORKSPACE_PATH` | Yes |
| `REPO_ROOT` | Yes |
| `CARD_REPO_PATH` | Yes |
| `BASE_BRANCH` | Yes |
| `PARENT_BRANCH` | Yes |
| `WORKSPACE_BRANCH` | Yes |
| `EXTENSION_PATH` | Yes |
| `MARKETPLACE_PATH` | Yes |

## Individual Getters

Each environment variable has a dedicated getter function with validation. The
individual getters live in the `@cards/sdk/config/env` subpath. The package root
(`@cards/sdk/config`) re-exports only the commonly used ones (`CARDS_ENV_VARS`,
`extractActionInput`, `extractCardsAssistantInput`, `getBaseBranch`,
`getCardRepoPath`, `getExecutionMode`, `getWorkspaceBranch`, `getWorkspacePath`,
`readSwitchToInteractiveData`), so import the full getter set from
`@cards/sdk/config/env`.

### Common Variables (All Handlers)

```typescript
import {
  getCardId,
  getEnvironment
} from '@cards/sdk/config/env';

// All throw Error if missing or empty
const cardId = getCardId();
const environment = getEnvironment();
```

### Common Variables (All Handlers) — continued

```typescript
import { getVscodeNodePath } from '@cards/sdk/config/env';

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
  readSwitchToInteractiveData,
  getConfigPath,
  getRepoRoot,
  getCardRepoPath,
  getWorkspacePath,
  getBaseBranch,
  getWorkspaceBranch,
  getExtensionPath,
  getMarketplacePath
} from '@cards/sdk/config/env';

// Throws if missing, returns the action button display name
const actionName = getActionName();          // e.g., 'Launch Claude'

// Throws if missing, returns 'interactive' | 'background'
const mode = getExecutionMode();

// Returns string | undefined (does not throw)
const codingAgent = getCodingAgent();

// Additional action-specific variables (throw Error if missing)
const socketPath = getSocketPath();                        // e.g., '/tmp/socket-123'
const configPath = getConfigPath();                        // Settings configuration directory
const repoRoot = getRepoRoot();                            // Main git repository root
const cardRepoPath = getCardRepoPath();                    // Card repository path
const extensionPath = getExtensionPath();                  // VS Code extension install dir
const marketplacePath = getMarketplacePath();              // Stable marketplace symlink

// Branch context set by the launch action (throw Error if missing)
const baseBranch = getBaseBranch();                        // Branch the workspace merges into
const workspaceBranch = getWorkspaceBranch();              // Card's implementation branch
// getWorkspacePath is for hooks running inside the Claude CLI, not action handlers
const workspacePath = getWorkspacePath();                  // Active workspace / worktree path

// getSwitchToInteractiveDataPath returns string | undefined (does not throw)
const switchToInteractiveDataPath = getSwitchToInteractiveDataPath(); // Path to switch data
// readSwitchToInteractiveData reads + JSON-parses that file (undefined when unset)
const switchData = readSwitchToInteractiveData();
```

> For CLI contexts where `EXTENSION_PATH` is not injected (e.g. terminal tools),
> use the async `resolveExtensionPath()` (also from `@cards/sdk/config/env`),
> which falls back to the `~/.cards/EXTENSION_PATH` file written by the extension
> on activation.

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
//   cardRepoPath: string,
//   configPath: string,
//   extensionPath: string,
//   marketplacePath: string
// }
```

### Cards Assistant Input

```typescript
import { extractCardsAssistantInput } from '@cards/sdk/config';

// Returns CardsAssistantInput — workspace-scoped, no card context
const input = extractCardsAssistantInput();
// {
//   marketplacePath: string,
//   extensionPath: string,
//   codingAgent?: string,
//   repoRoot: string
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
